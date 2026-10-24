const mongoose = require('mongoose');
const Product = require('../models/product');
const Order = require('../models/order');
const Category = require('../models/category');
const GoodsReceipt = require('../models/goodsReceipt');
const productService = require('./product.services');
const { normalizeSearch } = require('../utils/string.util');
const { getToday, parseDate } = require('../utils/date.util');

const getInventory = async (filters, pagination) => {
    const [products, orders] = await Promise.all([
        Product.find().lean(),
        Order.find({ status: { $in: ['PENDING', 'CONFIRMED'] } })
            .select('items')
            .lean()
    ]);
    const reserved = new Map();
    for (const order of orders)
        for (const item of order.items)
            for (const allocation of item.stock_allocations || []) {
                const key = item.variant_id + '|' + allocation.batch_code + '|' + new Date(allocation.expiry_date).getTime();
                reserved.set(key, (reserved.get(key) || 0) + allocation.quantity);
            }
    const today = parseDate(getToday());
    const soon = new Date(today.getTime() + 3 * 86400000);
    const keyword = normalizeSearch(filters.keyword || '');
    const rows = [];
    for (const product of products)
        for (const variant of product.variants)
            for (const stock of variant.stocks) {
                const status = stock.expiry_date < today ? 'EXPIRED' : stock.expiry_date <= soon ? 'EXPIRING' : 'VALID';
                if (filters.status && status !== filters.status) continue;
                if (keyword && !normalizeSearch(product.name + ' ' + variant.sku + ' ' + stock.batch_code).includes(keyword)) continue;
                const key = variant._id + '|' + stock.batch_code + '|' + new Date(stock.expiry_date).getTime();
                const held = reserved.get(key) || 0;
                rows.push({
                    id: key,
                    product_id: product._id.toString(),
                    name: product.name,
                    sku: variant.sku,
                    unit: variant.unit,
                    batch_code: stock.batch_code,
                    manufactured_date: stock.manufactured_date,
                    expiry_date: stock.expiry_date,
                    physical_quantity: Math.round((stock.quantity + held) * 1000) / 1000,
                    reserved_quantity: Math.round(held * 1000) / 1000,
                    available_quantity: status === 'EXPIRED' ? 0 : stock.quantity,
                    status
                });
            }
    rows.sort((a, b) => a.expiry_date - b.expiry_date || a.sku.localeCompare(b.sku));
    return { items: rows.slice(pagination.offset, pagination.offset + pagination.pageSize), totalElements: rows.length };
};

const numberValue = (value) => (value === '' || value == null ? NaN : Number(value));

const previewImport = async (rows) => {
    if (!Array.isArray(rows) || !rows.length || rows.length > 1000) throw new Error('INVALID_DATA');
    const skus = rows.map((row) => String(row?.sku || '').trim());
    const codes = rows.map((row) => String(row?.code || '').trim());
    const [products, categories] = await Promise.all([
        Product.find({ $or: [{ 'variants.sku': { $in: skus } }, { code: { $in: codes } }] }),
        Category.find()
    ]);
    const today = getToday();
    const batches = new Map();
    const newSkus = new Map();
    const checked = rows.map((row, index) => {
        const errors = [];
        const sku = String(row?.sku || '').trim();
        const product = products.find((entry) => entry.variants.some((variant) => variant.sku === sku));
        const variant = product?.variants.find((entry) => entry.sku === sku);
        const byCode = products.find((entry) => entry.code === String(row?.code || '').trim());
        const category = categories.find((entry) => entry._id.toString() === row?.category_id || entry.slug === row?.category_slug);
        const data = {
            sku,
            code: String(row?.code || '').trim(),
            name: String(row?.name || '').trim(),
            variant_name: String(row?.variant_name || '').trim(),
            unit: String(row?.unit || 'kg').trim(),
            category_id: category?._id.toString() || byCode?.category_id.toString(),
            step_quantity: row?.step_quantity === '' || row?.step_quantity == null ? 1 : numberValue(row.step_quantity),
            list_price: numberValue(row?.list_price),
            quantity: numberValue(row?.quantity),
            unit_cost: numberValue(row?.unit_cost),
            batch_code: String(row?.batch_code || '').trim(),
            manufactured_date: row?.manufactured_date || null,
            expiry_date: row?.expiry_date || ''
        };
        if (!sku || sku.length > 100) errors.push('Thiếu SKU hoặc SKU quá dài');
        if (
            !Number.isFinite(data.quantity) ||
            data.quantity <= 0 ||
            Math.abs(data.quantity * 1000 - Math.round(data.quantity * 1000)) > 0.00001
        )
            errors.push('Số lượng phải dương, tối đa 3 chữ số thập phân');
        if (!Number.isSafeInteger(data.unit_cost) || data.unit_cost < 0) errors.push('Giá nhập phải là số nguyên không âm');
        if (!data.batch_code || data.batch_code.length > 100) errors.push('Thiếu mã lô hoặc mã lô quá dài');
        if (!parseDate(data.expiry_date) || data.expiry_date < today) errors.push('Hạn sử dụng không hợp lệ hoặc đã hết hạn');
        if (
            data.manufactured_date &&
            (!parseDate(data.manufactured_date) || data.manufactured_date > today || data.manufactured_date > data.expiry_date)
        )
            errors.push('Ngày sản xuất không hợp lệ');
        if (!variant) {
            if (!data.code || !data.name || !data.variant_name || !data.category_id || data.code.length > 100 || data.name.length > 200)
                errors.push('SKU mới cần mã, tên sản phẩm, quy cách và danh mục hợp lệ');
            if (
                !Number.isSafeInteger(data.list_price) ||
                data.list_price < 0 ||
                !Number.isFinite(data.step_quantity) ||
                data.step_quantity < 0.001
            )
                errors.push('Giá bán hoặc bước bán của SKU mới không hợp lệ');
            const signature = JSON.stringify([
                data.code,
                data.name,
                data.category_id,
                data.variant_name,
                data.unit,
                data.list_price,
                data.step_quantity
            ]);
            if (newSkus.has(sku) && newSkus.get(sku) !== signature) errors.push('Thông tin SKU mới không thống nhất giữa các dòng');
            newSkus.set(sku, signature);
        }
        const batchKey = sku + '|' + data.batch_code;
        const dates = JSON.stringify([data.manufactured_date, data.expiry_date]);
        if (batches.has(batchKey) && batches.get(batchKey) !== dates)
            errors.push('Cùng mã lô nhưng ngày sản xuất hoặc hạn sử dụng khác nhau');
        batches.set(batchKey, dates);
        const existingStock = variant?.stocks.find((stock) => stock.batch_code === data.batch_code);
        if (
            existingStock &&
            (existingStock.expiry_date.getTime() !== parseDate(data.expiry_date)?.getTime() ||
                (existingStock.manufactured_date?.getTime() || null) !== (parseDate(data.manufactured_date)?.getTime() || null))
        )
            errors.push('Ngày của lô không khớp với dữ liệu đã nhập trước đây');
        return {
            row_number: index + 2,
            sku,
            name: product?.name || data.name,
            unit: variant?.unit || data.unit,
            quantity: data.quantity,
            unit_cost: data.unit_cost,
            is_new: !variant,
            errors,
            data
        };
    });
    return {
        rows: checked,
        total_rows: rows.length,
        valid_rows: checked.filter((row) => !row.errors.length).length,
        error_rows: checked.filter((row) => row.errors.length).length,
        new_skus: newSkus.size
    };
};

const getReceipt = async (receiptId) => {
    if (!mongoose.isObjectIdOrHexString(receiptId)) throw new Error('RESOURCE_NOT_FOUND');
    const receipt = await GoodsReceipt.findById(receiptId).populate('created_by', 'full_name').populate('supplier_id', 'name').lean();
    if (!receipt) throw new Error('RESOURCE_NOT_FOUND');
    const drafts = await Product.find({ _id: { $in: receipt.items.map((item) => item.product_id) }, status: 'DRAFT' })
        .select('name code')
        .lean();
    return {
        id: receipt._id.toString(),
        total_amount: receipt.total_amount,
        items_count: receipt.items.length,
        source_file: receipt.source_file,
        created_at: receipt.created_at,
        supplier_name: receipt.supplier_id?.name || 'Không chọn nhà cung cấp',
        created_by_name: receipt.created_by?.full_name,
        draft_products: drafts.map((product) => ({ id: product._id.toString(), name: product.name, code: product.code }))
    };
};

const confirmImport = async (userId, data) => {
    if (
        typeof data.import_key !== 'string' ||
        !/^[a-zA-Z0-9-]{16,80}$/.test(data.import_key) ||
        typeof data.source_file !== 'string' ||
        data.source_file.length > 200
    )
        throw new Error('INVALID_DATA');
    const existing = await GoodsReceipt.findOne({ created_by: userId, import_key: data.import_key });
    if (existing) return getReceipt(existing._id.toString());
    const preview = await previewImport(data.rows);
    if (preview.error_rows) {
        const error = new Error('IMPORT_INVALID_ROWS');
        error.rows = preview.rows.filter((row) => row.errors.length);
        throw error;
    }
    const result = await productService.importGoods({
        items: preview.rows.map((row) => row.data),
        supplier_id: data.supplier_id || null,
        note: String(data.note || '').slice(0, 1000),
        user_id: userId,
        import_key: data.import_key,
        source_file: data.source_file
    });
    return getReceipt(result.receipt_id);
};

module.exports = { getInventory, previewImport, confirmImport, getReceipt };
