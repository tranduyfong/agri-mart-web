const mongoose = require('mongoose');
const Supplier = require('../models/supplier');
const GoodsReceipt = require('../models/goodsReceipt');
const { escapeRegex } = require('../utils/string.util');

// Chỉ tính phiếu nhập đã ghi nhận; phiếu STAFF đang chờ duyệt chưa phải khoản nhập hàng thực tế.
const receiptTotals = (ids) => GoodsReceipt.aggregate([
    { $match: { supplier_id: { $in: ids } } },
    { $group: { _id: '$supplier_id', receipt_count: { $sum: 1 }, total_amount: { $sum: '$total_amount' } } }
]);

const getSuppliers = async (keyword, page) => {
    const query = keyword ? { $or: ['code', 'name', 'phone'].map((field) => ({ [field]: { $regex: escapeRegex(keyword), $options: 'i' } })) } : {};
    const [suppliers, totalElements] = await Promise.all([
        Supplier.find(query).sort({ name: 1, _id: 1 }).skip(page.offset).limit(page.pageSize).lean(), Supplier.countDocuments(query)
    ]);
    const totals = await receiptTotals(suppliers.map((supplier) => supplier._id));
    return { items: suppliers.map((supplier) => ({ ...supplier, id: String(supplier._id),
        receipt_count: totals.find((row) => row._id.equals(supplier._id))?.receipt_count || 0,
        total_amount: totals.find((row) => row._id.equals(supplier._id))?.total_amount || 0 })), totalElements };
};

const findSupplier = async (id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const supplier = await Supplier.findById(id).lean();
    if (!supplier) throw new Error('RESOURCE_NOT_FOUND');
    return supplier;
};

const getSupplier = async (id) => {
    const supplier = await findSupplier(id);
    const [totals, units] = await Promise.all([
        receiptTotals([supplier._id]),
        GoodsReceipt.aggregate([
            { $match: { supplier_id: supplier._id } }, { $unwind: '$items' },
            { $group: { _id: '$items.unit', quantity: { $sum: '$items.quantity' } } }, { $sort: { _id: 1 } }
        ])
    ]);
    return { ...supplier, id: String(supplier._id), receipt_count: totals[0]?.receipt_count || 0,
        total_amount: totals[0]?.total_amount || 0, units: units.map((row) => ({ unit: row._id || 'Chưa rõ đơn vị', quantity: row.quantity })) };
};

// Giữ số lượng theo SKU/đơn vị, không cộng kg với túi hay bó.
const getSupplierItems = async (id, page) => {
    const supplier = await findSupplier(id);
    const result = await GoodsReceipt.aggregate([
        { $match: { supplier_id: supplier._id } }, { $unwind: '$items' },
        { $group: { _id: { product_id: '$items.product_id', sku: '$items.variant_sku', unit: '$items.unit' },
            name: { $last: '$items.name' }, quantity: { $sum: '$items.quantity' },
            total_amount: { $sum: { $multiply: ['$items.quantity', '$items.unit_cost'] } } } },
        { $sort: { '_id.sku': 1 } },
        { $facet: { items: [{ $skip: page.offset }, { $limit: page.pageSize }], count: [{ $count: 'value' }] } }
    ]);
    return { items: result[0].items.map((row) => ({ id: String(row._id.product_id) + '|' + row._id.sku,
        sku: row._id.sku, name: row.name || row._id.sku, unit: row._id.unit || '', quantity: row.quantity,
        total_amount: Math.round(row.total_amount) })), totalElements: result[0].count[0]?.value || 0 };
};

const saveSupplier = async (id, data) => {
    if (typeof data.code !== 'string' || !/^[a-zA-Z0-9_-]{1,50}$/.test(data.code.trim()) ||
        typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 200 ||
        (data.phone != null && (typeof data.phone !== 'string' || !/^[+\d ()-]{0,25}$/.test(data.phone.trim())))) throw new Error('INVALID_DATA');
    if (id) await findSupplier(id);
    const values = { code: data.code.trim().toUpperCase(), name: data.name.trim(), phone: data.phone?.trim() || null };
    if (await Supplier.exists({ code: values.code, ...(id ? { _id: { $ne: id } } : {}) })) throw new Error('SUPPLIER_CODE_EXISTS');
    try {
        const supplier = id ? await Supplier.findByIdAndUpdate(id, { $set: values }, { new: true, runValidators: true }) : await Supplier.create(values);
        return getSupplier(supplier.id);
    } catch (error) {
        if (error.code === 11000) throw new Error('SUPPLIER_CODE_EXISTS');
        throw error;
    }
};

module.exports = { getSuppliers, getSupplier, getSupplierItems, saveSupplier };
