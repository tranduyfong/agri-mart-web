const Promotion = require('../models/promotion');
const Product = require('../models/product');
const mongoose = require('mongoose');
const { escapeRegex } = require('../utils/string.util');
const { getImageUrl } = require('../utils/file.util');

const getCoupon = async (code, session = null) => {
    const promotion = await Promotion.findOne({ code: { $regex: '^' + escapeRegex(code.trim()) + '$', $options: 'i' } }).session(session);
    if (!promotion) throw new Error('COUPON_NOT_FOUND');
    return promotion;
};

const getActivePromotions = async ({ keyword, is_flash_sale }, pagination) => {
    const now = new Date();
    const query = {
        valid_from: { $lte: now },
        valid_to: { $gte: now }
    };

    if (keyword) {
        query.$or = [{ name: { $regex: escapeRegex(keyword), $options: 'i' } }, { code: { $regex: escapeRegex(keyword), $options: 'i' } }];
    }

    if (is_flash_sale != null) {
        query.is_flash_sale = is_flash_sale;
    }

    const [items, totalElements] = await Promise.all([
        Promotion.find(query).sort({ valid_to: 1, _id: 1 }).skip(pagination.offset).limit(pagination.pageSize).lean(),
        Promotion.countDocuments(query)
    ]);

    return {
        promotions: items.map((promotion) => ({
            id: String(promotion._id),
            code: promotion.code,
            name: promotion.name,
            image_url: promotion.image_url || null,
            discount_value: promotion.discount_value,
            discount_type: promotion.discount_type,
            promotion_scope: promotion.promotion_scope,
            is_flash_sale: promotion.is_flash_sale ? 1 : 0,
            requires_code: promotion.requires_code ? 1 : 0,
            min_order_value: promotion.min_order_value,
            valid_from: promotion.valid_from,
            valid_to: promotion.valid_to,
            product_count: promotion.product_ids.length
        })),
        totalElements
    };
};

const getManagePromotions = async (filters, pagination) => {
    const query = { promotion_scope: filters.scope === 'SHIPPING' ? 'SHIPPING' : 'PRODUCT' };
    const now = new Date();
    if (filters.keyword)
        query.$or = [
            { name: { $regex: escapeRegex(filters.keyword), $options: 'i' } },
            { code: { $regex: escapeRegex(filters.keyword), $options: 'i' } }
        ];
    if (filters.status === 'ACTIVE') Object.assign(query, { valid_from: { $lte: now }, valid_to: { $gte: now } });
    if (filters.status === 'UPCOMING') query.valid_from = { $gt: now };
    if (filters.status === 'ENDED') query.valid_to = { $lt: now };
    const [items, totalElements] = await Promise.all([
        Promotion.find(query).sort({ created_at: -1 }).skip(pagination.offset).limit(pagination.pageSize).lean(),
        Promotion.countDocuments(query)
    ]);
    return {
        items: items.map((item) => ({
            ...item,
            id: item._id.toString(),
            status: item.valid_from > now ? 'UPCOMING' : item.valid_to < now ? 'ENDED' : 'ACTIVE'
        })),
        totalElements
    };
};

const getPromotion = async (id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const promotion = await Promotion.findById(id).lean();
    if (!promotion) throw new Error('RESOURCE_NOT_FOUND');
    return { ...promotion, id: promotion._id.toString() };
};

const savePromotion = async (id, data, files = []) => {
    const old = id ? await getPromotion(id) : null;
    if (
        typeof data.code !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(data.code.trim()) ||
        typeof data.name !== 'string' ||
        !data.name.trim() ||
        data.name.length > 200
    )
        throw new Error('INVALID_DATA');
    if (!['PRODUCT', 'SHIPPING'].includes(data.promotion_scope) || !['PERCENT', 'AMOUNT'].includes(data.discount_type))
        throw new Error('INVALID_DATA');
    if (
        !Number.isSafeInteger(data.discount_value) ||
        data.discount_value <= 0 ||
        (data.discount_type === 'PERCENT' && data.discount_value > 100)
    )
        throw new Error('INVALID_DATA');
    if (!Number.isSafeInteger(data.min_order_value) || data.min_order_value < 0) throw new Error('INVALID_DATA');
    const from = new Date(data.valid_from),
        to = new Date(data.valid_to);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) throw new Error('INVALID_DATA');
    const ids = data.product_ids || [];
    if (
        !Array.isArray(ids) ||
        ids.length > 1000 ||
        ids.some((value) => !mongoose.isObjectIdOrHexString(value)) ||
        new Set(ids).size !== ids.length
    )
        throw new Error('INVALID_DATA');
    if ((await Product.countDocuments({ _id: { $in: ids } })) !== ids.length) throw new Error('INVALID_DATA');
    const requiresCode = data.promotion_scope === 'SHIPPING' || data.discount_type === 'AMOUNT' || data.requires_code === true;
    if (!requiresCode && !ids.length) throw new Error('INVALID_DATA');
    const values = {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        image_url: getImageUrl(data, files, old?.image_url),
        promotion_scope: data.promotion_scope,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_value: data.min_order_value,
        valid_from: from,
        valid_to: to,
        requires_code: requiresCode,
        is_flash_sale: !requiresCode && data.is_flash_sale === true,
        product_ids: ids
    };
    if (id) {
        if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
        const result = await Promotion.findByIdAndUpdate(id, { $set: values }, { new: true, runValidators: true });
        if (!result) throw new Error('RESOURCE_NOT_FOUND');
        return { id: result._id.toString() };
    }
    return { id: (await Promotion.create(values))._id.toString() };
};

const endPromotion = async (id) => {
    const item = await getPromotion(id);
    const now = new Date();
    await Promotion.updateOne(
        { _id: id },
        { $set: { valid_to: now, valid_from: item.valid_from > now ? new Date(now.getTime() - 1) : item.valid_from } }
    );
};

module.exports = { getActivePromotions, getCoupon, getManagePromotions, getPromotion, savePromotion, endPromotion };
