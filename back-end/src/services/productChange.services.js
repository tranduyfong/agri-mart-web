const mongoose = require('mongoose');
const Product = require('../models/product');
const ProductChange = require('../models/productChange');
const User = require('../models/user');
const Supplier = require('../models/supplier');
const productService = require('./product.services');

// Không so sánh số lượng tồn: khách đặt hàng trong lúc chờ duyệt vẫn được phép mua.
const productContent = (product) => ({
    code: product.code,
    name: product.name,
    slug: product.slug,
    category_id: String(product.category_id),
    description: product.description,
    status: product.status,
    images: [...product.images],
    variants: product.variants.map((variant) => ({
        id: String(variant._id),
        sku: variant.sku,
        name: variant.name,
        unit: variant.unit,
        step_quantity: variant.step_quantity,
        list_price: variant.list_price
    }))
});

const submitProduct = async (userId, type, data) => {
    const current = type === 'UPDATE' ? await Product.findById(data.id) : null;
    if (type === 'UPDATE' && !current) throw new Error('PRODUCT_NOT_FOUND');
    if (current && (await ProductChange.exists({ product_id: current._id, status: 'PENDING', type: 'UPDATE' }))) {
        throw new Error('PRODUCT_CHANGE_PENDING');
    }
    const candidate =
        type === 'CREATE' ? await productService.createProduct(data, null, true) : await productService.updateProduct(data, null, true);
    const conflict = await Product.exists({
        _id: { $ne: current?._id || candidate._id },
        $or: [{ code: candidate.code }, { 'variants.sku': { $in: candidate.variants.map((variant) => variant.sku) } }]
    });
    if (conflict) throw new Error('PRODUCT_CODE_EXISTS');
    const change = await ProductChange.create({
        type,
        product_id: current?._id || null,
        requested_by: userId,
        title: candidate.name,
        data,
        before: current ? productContent(current) : null,
        after: {
            ...productContent(candidate),
            initial_stock: type === 'CREATE' ? (data.variants || []).map((variant) => variant.initial_stock || null) : []
        }
    });
    return { request_id: change.id, status: change.status };
};

const submitImport = async (userId, data) => {
    if (data.import_key) {
        const existing = await ProductChange.findOne({ requested_by: userId, request_key: data.import_key });
        if (existing) return { request_id: existing.id, status: existing.status };
    }
    const preview = await require('./inventory.services').previewImport(data.items);
    if (preview.error_rows) {
        const error = new Error('IMPORT_INVALID_ROWS');
        error.rows = preview.rows.filter((row) => row.errors.length);
        throw error;
    }
    if (data.supplier_id && (!mongoose.isObjectIdOrHexString(data.supplier_id) || !(await Supplier.exists({ _id: data.supplier_id })))) {
        throw new Error('SUPPLIER_NOT_FOUND');
    }
    const payload = { ...data, user_id: userId, items: preview.rows.map((row) => ({ ...row.data, name: row.name, unit: row.unit })) };
    try {
        const change = await ProductChange.create({
            type: 'IMPORT',
            title: data.source_file || 'Nhập hàng (' + preview.total_rows + ' dòng)',
            requested_by: userId,
            request_key: data.import_key || null,
            data: payload
        });
        return { request_id: change.id, status: change.status };
    } catch (error) {
        // Hai lần bấm gửi cùng file chỉ tạo một yêu cầu.
        if (error.code !== 11000 || !data.import_key) throw error;
        const existing = await ProductChange.findOne({ requested_by: userId, request_key: data.import_key });
        if (!existing) throw error;
        return { request_id: existing.id, status: existing.status };
    }
};

const getChanges = async (user, filters, pagination) => {
    const query = user.role === 'ADMIN' ? {} : { requested_by: user.userId };
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    const [items, totalElements] = await Promise.all([
        ProductChange.find(query)
            .select('-data -before -after -result')
            .populate('requested_by', 'full_name')
            .populate('reviewed_by', 'full_name')
            .sort({ created_at: -1 })
            .skip(pagination.offset)
            .limit(pagination.pageSize)
            .lean(),
        ProductChange.countDocuments(query)
    ]);
    return { items, totalElements };
};

const getChange = async (user, id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const query = { _id: id };
    if (user.role !== 'ADMIN') query.requested_by = user.userId;
    const change = await ProductChange.findOne(query).populate('requested_by', 'full_name').populate('reviewed_by', 'full_name').lean();
    if (!change) throw new Error('RESOURCE_NOT_FOUND');
    for (const snapshot of [change.before, change.after]) {
        if (snapshot) {
            const category = await require('../models/category').findById(snapshot.category_id).select('name').lean();
            snapshot.category_name = category?.name || 'Danh mục không còn tồn tại';
        }
    }
    // Không gửi các đường dẫn file tạm hay thông tin quyền nội bộ cho giao diện.
    if (change.type === 'IMPORT') {
        change.rows = change.data.items.map((item, index) => ({ ...item, row_number: index + 1 }));
        change.source_file = change.data.source_file || '';
        change.note = change.data.note || '';
        const supplier = change.data.supplier_id ? await Supplier.findById(change.data.supplier_id).select('name').lean() : null;
        change.supplier_name = supplier?.name || 'Không chọn nhà cung cấp';
    }
    delete change.data;
    return change;
};

const reviewChange = async (adminId, id, data) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    if (
        !['APPROVED', 'REJECTED'].includes(data.status) ||
        typeof data.note !== 'string' ||
        data.note.length > 1000 ||
        (data.status === 'REJECTED' && !data.note.trim())
    )
        throw new Error('INVALID_DATA');
    await mongoose.connection.transaction(async (session) => {
        const change = await ProductChange.findById(id).session(session);
        if (!change) throw new Error('RESOURCE_NOT_FOUND');
        if (change.status !== 'PENDING') throw new Error('PRODUCT_CHANGE_REVIEWED');
        if (data.status === 'APPROVED') {
            const requester = await User.findById(change.requested_by).session(session);
            const permission = change.type === 'IMPORT' ? 'INVENTORY_MANAGE' : 'PRODUCT_MANAGE';
            if (
                !requester ||
                requester.status !== 'ACTIVE' ||
                !['ADMIN', 'STAFF'].includes(requester.role) ||
                (requester.role !== 'ADMIN' && !requester.permissions.includes(permission))
            )
                throw new Error('REQUESTER_UNAVAILABLE');
            const payload = {
                ...change.data,
                user_id: requester.id,
                can_import: requester.role === 'ADMIN' || requester.permissions.includes('INVENTORY_MANAGE')
            };
            if (change.type === 'UPDATE') {
                const current = await Product.findById(change.product_id).session(session);
                if (!current || JSON.stringify(productContent(current)) !== JSON.stringify(change.before))
                    throw new Error('PRODUCT_CHANGE_STALE');
                change.result = await productService.updateProduct(payload, session);
            } else if (change.type === 'CREATE') change.result = await productService.createProduct(payload, session);
            else change.result = await productService.importGoods(payload, session);
        }
        change.status = data.status;
        change.review_note = data.note.trim();
        change.reviewed_by = adminId;
        change.reviewed_at = new Date();
        await change.save({ session });
    });
    return getChange({ role: 'ADMIN' }, id);
};

module.exports = { submitProduct, submitImport, getChanges, getChange, reviewChange };
