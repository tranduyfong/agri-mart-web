const Promotion = require('../models/promotion');
const { escapeRegex } = require('../utils/string.util');

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

module.exports = { getActivePromotions, getCoupon };
