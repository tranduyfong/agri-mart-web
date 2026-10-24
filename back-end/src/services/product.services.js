const mongoose = require('mongoose');
const slugify = require('slugify');
const Product = require('../models/product');
const Category = require('../models/category');
const Supplier = require('../models/supplier');
const Promotion = require('../models/promotion');
const Order = require('../models/order');
const GoodsReceipt = require('../models/goodsReceipt');
const { getSearchScore, getSearchSuggestion } = require('../utils/levenshtein.util');
const { recommendProducts } = require('../utils/recommendation.util');
const { getToday, parseDate } = require('../utils/date.util');
const { availableStock } = require('../utils/productStock.util');
const { deleteUploadedFiles } = require('../utils/file.util');
const { getAllocationCost } = require('../utils/report.util');

const createSlug = (name, code) => {
    return slugify(name + ' ' + code, { lower: true, strict: true, locale: 'vi' });
};

const getProductDiscounts = async (productIds) => {
    const now = new Date();
    const promotions = await Promotion.find({
        valid_from: { $lte: now },
        valid_to: { $gte: now },
        discount_type: 'PERCENT',
        promotion_scope: 'PRODUCT',
        requires_code: { $ne: true },
        product_ids: { $in: productIds }
    });

    const discounts = {};
    for (const promotion of promotions) {
        for (const productId of promotion.product_ids) {
            const id = productId.toString();
            discounts[id] = Math.max(discounts[id] || 0, promotion.discount_value);
        }
    }

    return discounts;
};

const getProducts = async (filters, pagination) => {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.category_id) {
        if (!mongoose.isObjectIdOrHexString(filters.category_id)) return { products: [], totalElements: 0 };
        query.category_id = filters.category_id;
    }
    if (filters.product_ids) query._id = { $in: filters.product_ids };

    // Khoảng giá phải khớp trong cùng một quy cách bán.
    if (filters.min_price != null || filters.max_price != null) {
        const price = {};
        if (filters.min_price != null) price.$gte = filters.min_price;
        if (filters.max_price != null) price.$lte = filters.max_price;
        query.variants = { $elemMatch: { list_price: price } };
    }

    let products = await Product.find(query).populate('category_id', 'name').lean();
    const searchScores = {};
    if (filters.keyword) {
        products = products.filter((product) => {
            const score = getSearchScore(filters.keyword, {
                ...product,
                code: product.code + ' ' + product.variants.map((variant) => variant.sku).join(' ')
            });
            searchScores[product._id.toString()] = score;
            return score !== null;
        });
    }

    const productIds = products.map((product) => product._id);
    const now = new Date();
    const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [promotions, orders] = await Promise.all([
        Promotion.find({ valid_from: { $lte: now }, valid_to: { $gte: now }, product_ids: { $in: productIds } }).lean(),
        Order.find({ status: 'COMPLETED', 'items.product_id': { $in: productIds } })
            .select('items created_at')
            .lean()
    ]);

    const sales = {};
    for (const order of orders) {
        for (const item of order.items) {
            const id = item.product_id.toString();
            if (!sales[id]) sales[id] = { total: 0, recent: 0 };
            sales[id].total += item.quantity;
            if (order.created_at >= recentDate) sales[id].recent += item.quantity;
        }
    }

    const result = [];
    for (const product of products) {
        const id = product._id.toString();
        const offers = promotions.filter((promotion) => promotion.product_ids.some((value) => value.toString() === id));
        if (filters.on_sale && !offers.length) continue;

        const variants = [...product.variants].sort((a, b) => a.list_price - b.list_price);
        const percentOffers = offers.filter(
            (promotion) => promotion.discount_type === 'PERCENT' && promotion.promotion_scope === 'PRODUCT' && !promotion.requires_code
        );
        const stock = variants.reduce((total, variant) => total + availableStock(variant), 0);

        result.push({
            id,
            code: product.code,
            skus: variants.map((variant) => variant.sku),
            name: product.name,
            slug: product.slug,
            status: product.status,
            created_at: product.created_at,
            category_id: product.category_id?._id.toString() || null,
            category_name: product.category_id?.name || null,
            min_price: variants[0]?.list_price ?? null,
            max_price: variants[variants.length - 1]?.list_price ?? null,
            unit: variants[0]?.unit || null,
            total_stock: Math.round(stock * 1000) / 1000,
            thumbnail_url: product.images[0] || null,
            sold_quantity: sales[id]?.total || 0,
            sold_last_30_days: sales[id]?.recent || 0,
            discount_percent: percentOffers.length ? Math.max(...percentOffers.map((offer) => offer.discount_value)) : null
        });
    }

    result.sort((a, b) => {
        if (filters.keyword && searchScores[a.id] !== searchScores[b.id]) return searchScores[a.id] - searchScores[b.id];
        if (filters.sort === 'price_asc') return a.min_price - b.min_price || b.id.localeCompare(a.id);
        if (filters.sort === 'price_desc') return b.min_price - a.min_price || b.id.localeCompare(a.id);
        if (filters.sort === 'name_asc') return a.name.localeCompare(b.name, 'vi') || b.id.localeCompare(a.id);
        if (filters.sort === 'best_selling') return b.sold_quantity - a.sold_quantity || b.id.localeCompare(a.id);
        if (filters.sort === 'trending')
            return b.sold_last_30_days - a.sold_last_30_days || b.sold_quantity - a.sold_quantity || b.id.localeCompare(a.id);
        return b.created_at - a.created_at || b.id.localeCompare(a.id);
    });

    return {
        products: result.slice(pagination.offset, pagination.offset + pagination.pageSize),
        totalElements: result.length,
        searchSuggestion: getSearchSuggestion(filters.keyword, result)
    };
};

const getRelatedProducts = async (productId) => {
    if (!mongoose.isObjectIdOrHexString(productId)) throw new Error('PRODUCT_NOT_FOUND');
    productId = new mongoose.Types.ObjectId(productId).toString();
    const products = await Product.find({ status: 'PUBLISHED' })
        .select('name description category_id variants.unit')
        .populate('category_id', 'name')
        .lean();
    if (!products.some((product) => product._id.toString() === productId)) throw new Error('PRODUCT_NOT_FOUND');

    const recommendations = recommendProducts(productId, products);
    if (!recommendations.length) return [];
    const result = await getProducts(
        {
            status: 'PUBLISHED',
            product_ids: recommendations.map((product) => product.id)
        },
        { offset: 0, pageSize: 6 }
    );
    const byId = new Map(result.products.map((product) => [product.id, product]));
    return recommendations.map((product) => byId.get(product.id)).filter(Boolean);
};

const getProductDetail = async ({ id, slug, onlyPublished }) => {
    if (id !== undefined && !mongoose.isObjectIdOrHexString(id)) throw new Error('PRODUCT_NOT_FOUND');

    const query = id !== undefined ? { _id: id } : { slug };
    if (onlyPublished) query.status = 'PUBLISHED';

    const product = await Product.findOne(query).populate('category_id', 'name');
    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    const discounts = await getProductDiscounts([product._id]);
    const receipts = onlyPublished ? [] : await GoodsReceipt.find({ 'items.product_id': product._id }).lean();

    return {
        id: product._id.toString(),
        code: product.code,
        name: product.name,
        slug: product.slug,
        description: product.description,
        status: product.status,
        created_at: product.created_at,
        category_id: product.category_id?._id.toString() || null,
        category_name: product.category_id?.name || null,
        discount_percent: discounts[product._id.toString()] ?? null,
        variants: product.variants.map((variant) => ({
            id: variant._id.toString(),
            sku: variant.sku,
            name: variant.name,
            unit: variant.unit,
            step_quantity: variant.step_quantity,
            list_price: variant.list_price,
            stock_quantity: availableStock(variant),
            ...(!onlyPublished
                ? {
                      stock_lots: variant.stocks.map((stock) => ({
                          batch_code: stock.batch_code,
                          quantity: stock.quantity,
                          expiry_date: stock.expiry_date,
                          unit_cost: getAllocationCost(stock, { product_id: product._id, variant_sku: variant.sku }, receipts, new Date())
                      }))
                  }
                : {})
        })),
        images: product.images.map((url, index) => ({ id: url, url, is_thumbnail: index === 0 ? 1 : 0 }))
    };
};

const getVariantData = (variant) => {
    return {
        sku: variant.sku,
        name: variant.variant_name,
        unit: variant.unit || 'kg',
        step_quantity: variant.step_quantity ?? 1,
        list_price: variant.list_price
    };
};

const checkVariants = (product) => {
    if (product.status === 'PUBLISHED' && !product.variants.length) throw new Error('PRODUCT_HAS_NO_VARIANT');
    if (product.status === 'PUBLISHED' && !product.images.length) throw new Error('PRODUCT_HAS_NO_IMAGE');

    const skus = product.variants.map((variant) => variant.sku);
    if (new Set(skus).size !== skus.length) {
        const error = new Error('DUPLICATE_SKU');
        error.code = 11000;
        throw error;
    }
};

const addImages = (product, data) => {
    const urls = data.image_urls || [];
    if (!Array.isArray(urls) || urls.some((url) => typeof url !== 'string' || !/^https?:\/\//.test(url))) {
        throw new Error('INVALID_PRODUCT_DATA');
    }

    const uploads = (data.uploaded_files || []).map((file) => file.path.replace(/\\/g, '/'));
    product.images = [...new Set([...product.images, ...uploads, ...urls])];
};

const createProduct = async (data) => {
    if (!mongoose.isObjectIdOrHexString(data.category_id) || !(await Category.exists({ _id: data.category_id }))) {
        throw new Error('CATEGORY_NOT_FOUND');
    }
    if (data.variants !== undefined && !Array.isArray(data.variants)) throw new Error('INVALID_PRODUCT_DATA');

    // Lưu sản phẩm, tồn ban đầu và phiếu nhập trong cùng một transaction.
    return mongoose.connection.transaction(async (session) => {
        const product = new Product({
            category_id: data.category_id,
            code: data.code,
            name: data.name,
            slug: createSlug(data.name, data.code),
            description: data.description || '',
            status: data.status || 'DRAFT',
            variants: (data.variants || []).map(getVariantData)
        });

        addImages(product, data);
        checkVariants(product);
        const receipt = new GoodsReceipt({
            created_by: data.user_id,
            note: 'Nhập tồn ban đầu khi tạo sản phẩm',
            items: []
        });
        for (let index = 0; index < product.variants.length; index++) {
            const stock = data.variants[index].initial_stock;
            if (!stock) continue;
            if (!Number.isFinite(stock.quantity) || stock.quantity < 0) throw new Error('INVALID_PRODUCT_DATA');
            if (stock.quantity === 0) continue;
            if (!data.can_import) throw new Error('INVENTORY_PERMISSION_REQUIRED');
            if (!data.user_id) throw new Error('INVALID_PRODUCT_DATA');
            const variant = product.variants[index];
            await validateImportRows(
                [
                    {
                        ...stock,
                        sku: variant.sku,
                        code: product.code,
                        name: product.name,
                        variant_name: variant.name,
                        category_id: product.category_id,
                        list_price: variant.list_price,
                        step_quantity: variant.step_quantity
                    }
                ],
                session
            );
            const batchCode = typeof stock.batch_code === 'string' ? stock.batch_code.trim() : '';
            if (!batchCode || batchCode.length > 100) throw new Error('INVALID_PRODUCT_DATA');
            variant.stocks.push({
                batch_code: batchCode,
                quantity: stock.quantity,
                manufactured_date: parseDate(stock.manufactured_date),
                expiry_date: parseDate(stock.expiry_date)
            });
            receipt.items.push({
                product_id: product._id,
                name: product.name,
                unit: variant.unit,
                variant_sku: variant.sku,
                batch_code: batchCode,
                quantity: stock.quantity,
                unit_cost: stock.unit_cost,
                manufactured_date: parseDate(stock.manufactured_date),
                expiry_date: parseDate(stock.expiry_date)
            });
            receipt.total_amount += stock.quantity * stock.unit_cost;
        }
        await product.save({ session });
        if (receipt.items.length) {
            receipt.total_amount = Math.round(receipt.total_amount);
            await receipt.save({ session });
        }

        return { productId: product._id.toString(), slug: product.slug };
    });
};

const updateProduct = async (data) => {
    if (!mongoose.isObjectIdOrHexString(data.id)) throw new Error('PRODUCT_NOT_FOUND');
    const product = await Product.findById(data.id);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');

    if (
        data.category_id !== undefined &&
        (!mongoose.isObjectIdOrHexString(data.category_id) || !(await Category.exists({ _id: data.category_id })))
    ) {
        throw new Error('CATEGORY_NOT_FOUND');
    }

    for (const field of ['code', 'name', 'description', 'category_id', 'status']) {
        if (data[field] !== undefined) product[field] = data[field];
    }
    if (data.code !== undefined || data.name !== undefined) product.slug = createSlug(product.name, product.code);

    if (data.variants !== undefined && !Array.isArray(data.variants)) throw new Error('INVALID_PRODUCT_DATA');
    for (const variant of data.variants || []) {
        if (variant.id) {
            const current = product.variants.id(variant.id);
            if (!current) throw new Error('VARIANT_NOT_FOUND');
            Object.assign(current, getVariantData(variant));
        } else {
            product.variants.push(getVariantData(variant));
        }
    }

    const removedImages = data.delete_image_urls ?? data.delete_image_ids ?? [];
    if (!Array.isArray(removedImages)) throw new Error('INVALID_PRODUCT_DATA');
    if (removedImages.some((url) => !product.images.includes(url))) throw new Error('IMAGE_NOT_FOUND');

    product.images = product.images.filter((url) => !removedImages.includes(url));
    addImages(product, data);
    checkVariants(product);
    await product.save();

    // Chỉ xóa ảnh nội bộ sau khi cập nhật thành công và ảnh không còn được dùng.
    for (const url of removedImages) {
        if (/^uploads\/(?!.*\.\.)/.test(url) && !(await Product.exists({ images: url }))) {
            deleteUploadedFiles([{ path: url }]);
        }
    }

    return getProductDetail({ id: data.id });
};

const validateImportRows = async (items, session) => {
    const errors = [];
    const newSkus = new Set();

    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const row = index + 1;
        if (
            !item ||
            typeof item.sku !== 'string' ||
            !item.sku.trim() ||
            !Number.isFinite(item.quantity) ||
            item.quantity <= 0 ||
            !Number.isFinite(item.unit_cost) ||
            item.unit_cost < 0 ||
            !Number.isSafeInteger(item.unit_cost) ||
            Math.abs(item.quantity * 1000 - Math.round(item.quantity * 1000)) > 0.00001 ||
            !parseDate(item.expiry_date) ||
            item.expiry_date < getToday() ||
            (item.manufactured_date && !parseDate(item.manufactured_date)) ||
            (item.manufactured_date && item.manufactured_date > getToday()) ||
            (item.manufactured_date && item.manufactured_date > item.expiry_date)
        ) {
            errors.push({ row, message: 'SKU, số lượng, đơn giá hoặc ngày sản xuất/hạn sử dụng không hợp lệ' });
            continue;
        }

        if (newSkus.has(item.sku) || (await Product.exists({ 'variants.sku': item.sku }).session(session))) continue;

        if (
            !item.code ||
            !item.name ||
            !item.variant_name ||
            !mongoose.isObjectIdOrHexString(item.category_id) ||
            !Number.isFinite(item.list_price) ||
            item.list_price < 0 ||
            (item.step_quantity != null && (!Number.isFinite(item.step_quantity) || item.step_quantity < 0.001))
        ) {
            errors.push({ row, message: 'SKU mới cần Mã SP, Tên SP, Danh mục, Quy cách, Giá niêm yết và bước bán hợp lệ' });
        } else if (!(await Category.exists({ _id: item.category_id }).session(session))) {
            errors.push({ row, message: 'Danh mục không tồn tại' });
        } else {
            newSkus.add(item.sku);
        }
    }

    if (errors.length) {
        const error = new Error('INVALID_ROWS');
        error.rows = errors;
        throw error;
    }
};

const importGoods = async (data) => {
    const { items, supplier_id, note, user_id } = data;
    if (supplier_id && (!mongoose.isObjectIdOrHexString(supplier_id) || !(await Supplier.exists({ _id: supplier_id }))))
        throw new Error('SUPPLIER_NOT_FOUND');
    if (!Array.isArray(items) || !items.length) throw new Error('INVALID_PRODUCT_DATA');
    if (items.length > 1000) throw new Error('INVALID_PRODUCT_DATA');

    // Phiếu nhập và các lô hàng phải được lưu cùng nhau: có lỗi thì hủy toàn bộ.
    return mongoose.connection.transaction(async (session) => {
        if (data.import_key) {
            const existing = await GoodsReceipt.findOne({ created_by: user_id, import_key: data.import_key }).session(session);
            if (existing)
                return {
                    receipt_id: existing._id.toString(),
                    already_imported: true,
                    created_products: 0,
                    created_variants: 0,
                    total_amount: existing.total_amount
                };
        }
        await validateImportRows(items, session);
        const receipt = new GoodsReceipt({
            supplier_id: supplier_id || null,
            created_by: user_id,
            import_key: data.import_key || null,
            source_file: data.source_file || '',
            note: note || ''
        });
        let createdProducts = 0;
        let createdVariants = 0;

        for (const item of items) {
            let product = await Product.findOne({ 'variants.sku': item.sku }).session(session);
            let variant = product?.variants.find((entry) => entry.sku === item.sku);

            if (!variant) {
                product = await Product.findOne({ code: item.code }).session(session);
                if (!product) {
                    product = new Product({
                        category_id: item.category_id,
                        code: item.code,
                        name: item.name,
                        slug: createSlug(item.name, item.code),
                        description: item.description || '',
                        status: 'DRAFT'
                    });
                    createdProducts++;
                }

                product.variants.push(getVariantData(item));
                variant = product.variants[product.variants.length - 1];
                createdVariants++;
            }

            const batchCode = item.batch_code || 'LO-' + getToday().replace(/-/g, '');
            let stock = variant.stocks.find((lot) => lot.batch_code === batchCode);

            if (stock) {
                if (
                    stock.expiry_date.getTime() !== parseDate(item.expiry_date).getTime() ||
                    (stock.manufactured_date?.getTime() || null) !== (parseDate(item.manufactured_date)?.getTime() || null)
                ) {
                    const error = new Error('INVALID_ROWS');
                    error.rows = [{ row: items.indexOf(item) + 1, message: 'Mã lô đã tồn tại với ngày sản xuất hoặc hạn sử dụng khác' }];
                    throw error;
                }
                stock.quantity = Math.round((stock.quantity + item.quantity) * 1000) / 1000;
            } else {
                variant.stocks.push({
                    batch_code: batchCode,
                    quantity: item.quantity,
                    manufactured_date: parseDate(item.manufactured_date),
                    expiry_date: parseDate(item.expiry_date)
                });
            }

            checkVariants(product);
            await product.save({ session });
            receipt.items.push({
                product_id: product._id,
                name: product.name,
                unit: variant.unit,
                variant_sku: variant.sku,
                batch_code: batchCode,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                manufactured_date: parseDate(item.manufactured_date),
                expiry_date: parseDate(item.expiry_date)
            });
            receipt.total_amount += item.quantity * item.unit_cost;
        }

        receipt.total_amount = Math.round(receipt.total_amount * 100) / 100;
        await receipt.save({ session });

        return {
            receipt_id: receipt._id.toString(),
            total_rows: items.length,
            created_products: createdProducts,
            created_variants: createdVariants,
            total_amount: receipt.total_amount
        };
    });
};

module.exports = { getProducts, getProductDetail, getRelatedProducts, createProduct, updateProduct, importGoods, getProductDiscounts };
