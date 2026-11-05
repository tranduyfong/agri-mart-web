const mongoose = require('mongoose');
const Product = require('../models/product');
const ChatRoom = require('../models/chatRoom');
const ChatMessage = require('../models/chatMessage');
const gemini = require('../configs/gemini.config');
const { availableStock } = require('../utils/productStock.util');
const { normalizeSearch } = require('../utils/string.util');
const { notifyChatChanged } = require('../utils/chatEvents.util');
const { getProductDiscounts } = require('./product.services');

const activeRooms = new Set();
const handoffText = 'Mình đã chuyển yêu cầu đến nhân viên cửa hàng. Bạn có thể nhắn thêm thông tin trong lúc chờ hỗ trợ nhé.';
const offTopicText = 'Mình chỉ hỗ trợ các câu hỏi về cửa hàng, sản phẩm và cách mua hàng tại Agri-Mart. Bạn đang cần tìm sản phẩm nào?';

// Dùng cùng tồn còn hạn và ưu đãi như màn hình thanh toán, không đưa giá vốn cho AI.
const productChoices = async (products) => {
    const discounts = products.length ? await getProductDiscounts(products.map((product) => product._id)) : {};
    return products.flatMap((product) => product.variants.map((variant) => {
        const step = variant.step_quantity;
        const stock = availableStock(variant);
        const quantity = step > 0 ? Math.round(Math.floor((stock + 0.0000001) / step) * step * 1000) / 1000 : 0;
        const discount = Math.min(100, Math.max(0, discounts[String(product._id)] || 0));
        return {
            product_id: String(product._id), variant_id: String(variant._id), name: product.name,
            variant_name: variant.name, slug: product.slug, category_name: product.category_id?.name || '',
            description: product.description?.slice(0, 300) || '', unit: variant.unit,
            thumbnail_url: product.images[0] || null, list_price: variant.list_price,
            price: Math.round(variant.list_price * (1 - discount / 100)),
            step_quantity: step, available_quantity: quantity
        };
    }));
};

const getCatalog = async (keyword) => {
    const products = await Product.find({ status: 'PUBLISHED' }).select('name slug description images category_id variants').populate('category_id', 'name').lean();
    const choices = (await productChoices(products)).filter((item) => item.available_quantity >= item.step_quantity && item.step_quantity > 0);
    const words = [...new Set(normalizeSearch(keyword).split(/\s+/).filter((word) => word.length > 1))];
    const score = (item) => words.reduce((total, word) => total + (normalizeSearch(item.name + ' ' + item.category_name + ' ' + item.description).includes(word) ? 1 : 0), 0);
    return choices.sort((first, second) => score(second) - score(first)).slice(0, 60);
};

// Gợi ý lưu ID/số lượng cùng tên và ảnh dự phòng. Mỗi lần đọc lại đều kiểm tra kho/giá mới.
const getRecommendations = async (references) => {
    const ids = references.map((item) => String(item.variant_id)).filter((id) => mongoose.isObjectIdOrHexString(id));
    if (!ids.length) return [];
    const products = await Product.find({ status: 'PUBLISHED', 'variants._id': { $in: ids } })
        .select('name slug images category_id variants').populate('category_id', 'name').lean();
    const choices = new Map((await productChoices(products)).map((item) => [item.variant_id, item]));
    return references.map((reference) => {
        const item = choices.get(String(reference.variant_id));
        const quantity = reference.quantity;
        const units = Math.round(quantity * 1000), step = Math.round((item?.step_quantity || 0) * 1000);
        const available = !!item && Number.isFinite(quantity) && quantity > 0 && step > 0 &&
            Math.abs(quantity * 1000 - units) < 0.00001 && units % step === 0 && quantity <= item.available_quantity;
        return {
            product_id: String(reference.product_id || item?.product_id || ''), variant_id: String(reference.variant_id),
            name: item?.name || reference.name || 'Sản phẩm đã ngừng bán', variant_name: item?.variant_name || reference.variant_name || '',
            unit: item?.unit || reference.unit || '', thumbnail_url: item?.thumbnail_url || reference.thumbnail_url || null,
            quantity, price: item?.price ?? null, list_price: item?.list_price ?? null,
            stock_quantity: item?.available_quantity || 0, available
        };
    });
};

const buildAnswer = async (history, catalog) => {
    const last = history.at(-1);
    const text = normalizeSearch(last.content);
    if (/\b(nhan vien|nguoi that|tu van vien|gap shop|gap nguoi)\b/.test(text) || last.attachments?.length) {
        return { scope: 'HANDOFF', answer: handoffText, recommendations: [] };
    }
    return gemini.generateReply({
        store: {
            name: 'Agri-Mart', shipping_fee: Number(process.env.SHIPPING_FEE || 15000),
            checkout: 'Khách xác nhận địa chỉ đã lưu và đặt hàng. Nhân viên gọi điện duyệt đơn trước khi khách được thanh toán VNPay. Có hỗ trợ COD.',
            other_policies: 'Chưa có thông tin chính thức khác. Chuyển nhân viên nếu khách hỏi chính sách không có trong dữ liệu.'
        },
        catalog,
        history: history.map((message) => ({ role: message.sender_type, text: message.content.slice(0, 1500) }))
    });
};

const processRoom = async (id) => {
    const lockUntil = new Date(Date.now() + 90000);
    const room = await ChatRoom.findOneAndUpdate({ _id: id, status: 'AI_ACTIVE', waiting_for_staff: { $ne: true }, ai_pending: true,
        $or: [{ ai_locked_until: null }, { ai_locked_until: { $lte: new Date() } }] },
    { $set: { ai_locked_until: lockUntil } }, { returnDocument: 'after' });
    if (!room) return;
    try {
        const history = (await ChatMessage.find({ room_id: id }).sort({ _id: -1 }).limit(10).lean()).reverse();
        const latest = [...history].reverse().find((message) => message.sender_type === 'CUSTOMER');
        if (!latest) {
            await ChatRoom.updateOne({ _id: id, ai_locked_until: lockUntil }, { $set: { ai_pending: false } });
            return;
        }
        let answer, catalog = [];
        try {
            catalog = await getCatalog(history.filter((message) => message.sender_type === 'CUSTOMER').slice(-2).map((message) => message.content).join(' '));
            answer = await buildAnswer(history, catalog);
        } catch (error) {
            // Không log payload hoặc key, vẫn giữ tin của khách khi Google lỗi/quá hạn mức.
            console.warn('Trợ lý AI chưa thể phản hồi:', /^GEMINI_[A-Z_0-9]+$/.test(error.message) ? error.message : 'SERVICE_UNAVAILABLE');
            answer = { scope: 'HANDOFF', answer: handoffText, recommendations: [] };
        }
        const allowed = new Map(catalog.map((item) => [item.variant_id, item.product_id]));
        const selected = [], selectedProducts = new Set();
        for (const item of answer.scope === 'STORE' ? answer.recommendations : []) {
            const productId = allowed.get(item.variant_id);
            if (!productId || selectedProducts.has(productId)) continue;
            selected.push(item);
            selectedProducts.add(productId);
        }
        const recommendations = (await getRecommendations(selected)).filter((item) => item.available);
        const content = answer.scope === 'OFF_TOPIC' ? offTopicText : answer.scope === 'HANDOFF' ? handoffText
            : recommendations.length ? 'Mình gợi ý các sản phẩm còn hàng dưới đây. Bạn có thể đặt từng món hoặc đặt cả nhóm; giá và tồn kho sẽ được kiểm tra lại ở bước thanh toán.'
                : answer.recommendations.length ? 'Những sản phẩm vừa tìm hiện chưa đủ hàng để gợi ý. Bạn có muốn mình tìm lựa chọn khác hoặc gặp nhân viên không?'
                    : answer.answer.trim();

        await mongoose.connection.transaction(async (session) => {
            const current = await ChatRoom.findOne({ _id: id, status: 'AI_ACTIVE', waiting_for_staff: { $ne: true }, ai_locked_until: lockUntil }).session(session);
            if (!current) return;
            const newest = await ChatMessage.findOne({ room_id: id, sender_type: 'CUSTOMER' }).sort({ _id: -1 }).session(session);
            // Tin mới đến hoặc nhân viên tiếp nhận trong lúc AI đang nghĩ: bỏ câu trả lời cũ.
            if (!newest?._id.equals(latest._id)) return;
            if (!(await ChatMessage.exists({ reply_to: latest._id, sender_type: 'AI' }).session(session))) {
                await ChatMessage.create([{ room_id: id, sender_type: 'AI', reply_to: latest._id, content, recommendations }], { session });
            }
            current.ai_pending = false;
            current.waiting_for_staff = answer.scope === 'HANDOFF';
            await current.save({ session });
        });
        notifyChatChanged(room);
    } finally {
        await ChatRoom.updateOne({ _id: id, ai_locked_until: lockUntil }, { $set: { ai_locked_until: null } });
    }
};

const queueReply = (id) => {
    const key = String(id);
    if (!gemini.isEnabled() || activeRooms.has(key) || activeRooms.size >= 2) return;
    activeRooms.add(key);
    void processRoom(id).catch(() => console.warn('Chưa xử lý được phản hồi AI, sẽ kiểm tra lại.'))
        .finally(() => activeRooms.delete(key));
};

const startWorker = () => {
    if (!gemini.isEnabled()) return;
    const recover = async () => {
        try {
            const rooms = await ChatRoom.find({ ai_pending: true, status: 'AI_ACTIVE', waiting_for_staff: { $ne: true },
                $or: [{ ai_locked_until: null }, { ai_locked_until: { $lte: new Date() } }] }).select('_id').sort({ updated_at: 1 }).limit(10).lean();
            rooms.forEach((room) => queueReply(room._id));
        } catch { console.warn('Chưa kiểm tra được hàng đợi trợ lý AI.'); }
    };
    void recover();
    const timer = setInterval(recover, 3000);
    timer.unref();
};

module.exports = { getCatalog, getRecommendations, queueReply, startWorker };
