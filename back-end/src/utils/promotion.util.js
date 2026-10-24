const getEligibleAmount = (items, productIds) => {
    return items.reduce((total, item) => {
        if (productIds.length && !productIds.includes(item.product_id.toString())) return total;
        return total + Math.round(item.price * item.quantity);
    }, 0);
};

// Tính trên giá đã giảm tự động, không tính phí giao hàng vào đơn tối thiểu.
const calculateCouponDiscount = (promotion, items, shippingFee, now = new Date()) => {
    if (promotion.valid_from > now || promotion.valid_to < now) throw new Error('COUPON_EXPIRED');
    const productsTotal = items.reduce((total, item) => total + Math.round(item.price * item.quantity), 0);
    if (productsTotal < promotion.min_order_value) throw new Error('COUPON_MIN_ORDER');
    if (promotion.promotion_scope === 'PRODUCT' && promotion.discount_type === 'PERCENT' && !promotion.requires_code) {
        throw new Error('COUPON_ALREADY_APPLIED');
    }

    const productIds = promotion.product_ids.map((id) => id.toString());
    const baseAmount = promotion.promotion_scope === 'SHIPPING' ? shippingFee : getEligibleAmount(items, productIds);
    const value = promotion.discount_value;
    if (!Number.isFinite(value) || value <= 0) throw new Error('COUPON_NOT_APPLICABLE');
    const discount = promotion.discount_type === 'PERCENT' ? (baseAmount * Math.min(value, 100)) / 100 : value;
    const discountAmount = Math.min(baseAmount, Math.round(discount));
    if (discountAmount <= 0) throw new Error('COUPON_NOT_APPLICABLE');

    return {
        promotion_id: promotion._id,
        code: promotion.code,
        name: promotion.name,
        promotion_scope: promotion.promotion_scope,
        product_ids: productIds,
        discount_amount: discountAmount
    };
};

// Chia số tiền giảm theo các phần tiền hợp lệ, giữ tổng chính xác đến từng đồng.
const allocateDiscount = (discount, amounts) => {
    let remainingDiscount = discount;
    let remainingAmount = amounts.reduce((total, amount) => total + amount, 0);
    return amounts.map((amount) => {
        const allocated = remainingAmount > 0 ? Math.min(amount, Math.round(remainingDiscount * (amount / remainingAmount))) : 0;
        remainingDiscount -= allocated;
        remainingAmount -= amount;
        return allocated;
    });
};

module.exports = { calculateCouponDiscount, getEligibleAmount, allocateDiscount };
