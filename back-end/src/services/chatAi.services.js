// Xử lý hàng đợi AI: lấy catalog thật, gọi Gemini, kiểm tra gợi ý và nhường hội thoại khi nhân viên tiếp nhận.
const mongoose = require('mongoose');
const Product = require('../models/product');
const ChatRoom = require('../models/chatRoom');
const ChatMessage = require('../models/chatMessage');
const gemini = require('../configs/gemini.config');
const { availableStock, getVariantPrice, getSaleLots, getLotPrice, getSaleQuote } = require('../utils/productStock.util');
const { normalizeSearch } = require('../utils/string.util');
const { notifyChatChanged } = require('../utils/chatEvents.util');
const { getProductDiscounts } = require('./product.services');
const { getShoppingRequest, getMissingGroups, isShoppingQuestion, wantsStaff, needsOrderSupport } = require('../utils/chatShopping.util');
const { getFoodGuidance } = require('../utils/foodGuidance.util');

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
            thumbnail_url: product.images[0] || null, list_price: getVariantPrice(variant),
            price: Math.round(getVariantPrice(variant) * (1 - discount / 100)),
            discount_percent: discount,
            sale_lots: getSaleLots(variant).map((lot) => ({ quantity: lot.quantity, expiry_date: lot.expiry_date,
                price: Math.round(getLotPrice(variant, lot) * (1 - discount / 100)) })),
            step_quantity: step, available_quantity: quantity
        };
    }));
};

// Chỉ đưa hàng đang bán, còn đủ bước bán vào ngữ cảnh AI và ưu tiên nội dung khớp câu hỏi.
const getCatalog = async (keyword, allows = () => true) => {
    const products = await Product.find({ status: 'PUBLISHED' }).select('name slug description images category_id variants').populate('category_id', 'name').lean();
    const choices = (await productChoices(products)).filter((item) => item.available_quantity >= item.step_quantity && item.step_quantity > 0 && allows(item));
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
    const variants = new Map(products.flatMap((product) => product.variants.map((variant) => [String(variant._id), variant])));
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
            line_total: available ? getSaleQuote(variants.get(String(reference.variant_id)), quantity,
                item.discount_percent).line_total : null,
            stock_quantity: item?.available_quantity || 0, available
        };
    });
};

// Ảnh/yêu cầu gặp người thật chuyển nhân viên; các câu hỏi chữ còn lại gửi ngữ cảnh cửa hàng cho Gemini.
const buildAnswer = async (history, catalog, request, guidance, feedback = '') => {
    const last = history.at(-1);
    const text = normalizeSearch(last.content);
    if (wantsStaff(text) || last.attachments?.length) {
        return { scope: 'HANDOFF', answer: handoffText, recommendations: [] };
    }
    return gemini.generateReply({
        store: {
            name: 'Agri-Mart', shipping_fee: Number(process.env.SHIPPING_FEE || 15000),
            checkout: 'Khách xác nhận địa chỉ đã lưu và đặt hàng. Nhân viên gọi điện duyệt đơn trước khi khách được thanh toán VNPay. Có hỗ trợ COD.',
            other_policies: 'Chưa có thông tin chính thức khác. Chuyển nhân viên nếu khách hỏi chính sách không có trong dữ liệu.'
        },
        catalog,
        shopping_request: request,
        food_guidance: guidance,
        feedback,
        history: history.filter((message) => ['CUSTOMER', 'AI'].includes(message.sender_type))
            .map((message) => ({ role: message.sender_type, text: message.content.slice(0, 1500) }))
    });
};

// Giành khóa hội thoại, tạo phản hồi rồi kiểm tra lại câu hỏi mới nhất và người đang phụ trách trước khi lưu.
const processRoom = async (id) => {
    // Khóa có thời hạn để một phòng không gọi AI song song và có thể được xử lý lại nếu tiến trình bị dừng.
    const lockUntil = new Date(Date.now() + 120000);
    const room = await ChatRoom.findOneAndUpdate({ _id: id, status: 'AI_ACTIVE', waiting_for_staff: { $ne: true }, ai_pending: true,
        $or: [{ ai_locked_until: null }, { ai_locked_until: { $lte: new Date() } }] },
    { $set: { ai_locked_until: lockUntil } }, { returnDocument: 'after' });
    if (!room) return;
    try {
        const history = (await ChatMessage.find({ room_id: id }).sort({ _id: -1 }).limit(24).lean()).reverse();
        const latest = [...history].reverse().find((message) => message.sender_type === 'CUSTOMER');
        if (!latest) {
            await ChatRoom.updateOne({ _id: id, ai_locked_until: lockUntil }, { $set: { ai_pending: false } });
            return;
        }
        const request = getShoppingRequest(history);
        const guidance = getFoodGuidance(history);
        let answer, catalog = [];
        try {
            catalog = await getCatalog(history.filter((message) => message.sender_type === 'CUSTOMER').slice(-3).map((message) => message.content).join(' '), guidance.allows);
            answer = await buildAnswer(history, catalog, request, guidance.notes);
        } catch (error) {
            // Không log payload hoặc key, vẫn giữ tin của khách khi Google lỗi/quá hạn mức.
            console.warn('Trợ lý AI chưa thể phản hồi:', /^GEMINI_[A-Z_0-9]+$/.test(error.message) ? error.message : 'SERVICE_UNAVAILABLE');
            answer = { scope: 'STORE', answer: 'Mình tạm chưa tra được dữ liệu để tư vấn chính xác. Bạn thử nhắn lại giúp mình nhé; nếu cần người hỗ trợ ngay, bạn có thể chọn “Gặp nhân viên”.', recommendations: [] };
        }
        // Câu hỏi chọn món/ngân sách đơn giản không khóa cuộc trò chuyện vào chờ người thật.
        if (answer.scope === 'HANDOFF' && isShoppingQuestion(latest.content) && !wantsStaff(latest.content) && !needsOrderSupport(latest.content)) {
            answer = { scope: 'STORE', answer: 'Mình vẫn có thể giúp bạn chọn thực phẩm. Bạn muốn ưu tiên món nào và có nguyên liệu nào sẵn ở nhà để mình cân đối bữa ăn hơn?', recommendations: [] };
        }
        // Chỉ chấp nhận ID có trong catalog đã gửi; mỗi sản phẩm giữ một quy cách để nhóm đặt không bị lặp.
        const allowed = new Map(catalog.map((item) => [item.variant_id, item.product_id]));
        const selected = [], selectedProducts = new Set();
        for (const item of answer.scope === 'STORE' ? answer.recommendations : []) {
            const productId = allowed.get(item.variant_id);
            if (!productId || selectedProducts.has(productId)) continue;
            selected.push(item);
            selectedProducts.add(productId);
        }
        // Đọc lại kho sau khi Gemini trả lời vì lượng hàng có thể đã đổi trong thời gian chờ.
        let recommendations = (await getRecommendations(selected)).filter((item) => item.available);
        const total = (items) => items.reduce((sum, item) => sum + (item.line_total || 0), 0);
        // Nếu đề xuất vượt ngân sách, cho AI sửa một lần với giá thật đã kiểm tra.
        if (request.budget && total(recommendations) > request.budget) {
            try {
                const retry = await buildAnswer(history, catalog, request, guidance.notes,
                    'Gợi ý trước vượt ngân sách. Hãy tính lại theo giá từng lô; nếu không đủ ngân sách, giải thích và hỏi điều chỉnh, không tự chuyển nhân viên.');
                if (retry.scope === 'STORE') {
                    const references = retry.recommendations.filter((item, index, all) => allowed.has(item.variant_id) &&
                        all.findIndex((other) => allowed.get(other.variant_id) === allowed.get(item.variant_id)) === index);
                    recommendations = (await getRecommendations(references)).filter((item) => item.available);
                    answer = retry;
                }
            } catch { /* Vẫn trả lời được bằng thông báo ngân sách bên dưới, không khóa chat. */ }
        }
        const overBudget = request.budget && total(recommendations) > request.budget;
        if (overBudget) recommendations = [];
        const missing = getMissingGroups(recommendations.map((item) => ({ ...item,
            category_name: catalog.find((entry) => entry.variant_id === item.variant_id)?.category_name || '' })), request);
        let content = answer.scope === 'OFF_TOPIC' ? offTopicText : answer.scope === 'HANDOFF' ? handoffText
            : overBudget ? `Với ngân sách ${request.budget.toLocaleString('vi-VN')}đ, mình chưa cân đối được nhóm thực phẩm bạn cần theo quy cách đang bán. Bạn có sẵn nguyên liệu nào ở nhà hoặc có thể điều chỉnh ngân sách một chút không?`
                : answer.recommendations.length && !recommendations.length
                    ? 'Các lựa chọn vừa tìm chưa đáp ứng đủ tồn kho hoặc quy cách bán. Mình sẽ không gợi ý món chưa mua được. Bạn muốn thử nguyên liệu thay thế nào?'
                    : answer.answer.trim();
        if (recommendations.length && missing.length) {
            content += '\n\nNhóm gợi ý hiện còn thiếu ' + missing.map((group) => group === 'MEAT' ? 'thịt' : 'rau').join(' và ') +
                '; mình chưa coi đây là bữa ăn đầy đủ cho số người bạn yêu cầu. Bạn có sẵn nguyên liệu nào để kết hợp không?';
        }

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
            current.handoff_reason = answer.scope === 'HANDOFF'
                ? wantsStaff(latest.content) ? 'CUSTOMER_REQUEST' : latest.attachments?.length ? 'IMAGE' : 'ORDER_SUPPORT'
                : null;
            await current.save({ session });
        });
        notifyChatChanged(room);
    } finally {
        await ChatRoom.updateOne({ _id: id, ai_locked_until: lockUntil }, { $set: { ai_locked_until: null } });
    }
};

// Giới hạn số yêu cầu Google đồng thời và không xử lý trùng một hội thoại trong cùng tiến trình.
const queueReply = (id) => {
    const key = String(id);
    if (!gemini.isEnabled() || activeRooms.has(key) || activeRooms.size >= 2) return;
    activeRooms.add(key);
    void processRoom(id).catch(() => console.warn('Chưa xử lý được phản hồi AI, sẽ kiểm tra lại.'))
        .finally(() => activeRooms.delete(key));
};

// Kiểm tra định kỳ các hội thoại đang chờ để tiếp tục xử lý sau khi bận hoặc khởi động lại.
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
