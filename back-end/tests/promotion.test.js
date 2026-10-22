const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCouponDiscount, getEligibleAmount, allocateDiscount } = require('../src/utils/promotion.util');

const now = new Date('2026-10-22T10:00:00Z');
const items = [
    { product_id: 'a', price: 80000, quantity: 2 },
    { product_id: 'b', price: 30001, quantity: 1.5 },
    { product_id: 'c', price: 10000, quantity: 1 }
];
const coupon = {
    _id: 'coupon-id',
    code: 'GIAM10',
    name: 'Giảm 10%',
    requires_code: true,
    promotion_scope: 'PRODUCT',
    discount_type: 'PERCENT',
    discount_value: 10,
    product_ids: [],
    min_order_value: 100000,
    valid_from: new Date('2026-10-01T00:00:00Z'),
    valid_to: new Date('2026-11-01T00:00:00Z')
};

test('Mã phần trăm tính trên giá thực trả, làm tròn tiền cho lượng thập phân', () => {
    assert.equal(getEligibleAmount(items, []), 215002);
    const result = calculateCouponDiscount(coupon, items, 15000, now);
    assert.equal(result.discount_amount, 21500);
    assert.equal(result.code, 'GIAM10');
    assert.equal(calculateCouponDiscount({ ...coupon, product_ids: ['b'] }, items, 15000, now).discount_amount, 4500);
});

test('Giảm số tiền không vượt quá tiền sản phẩm hợp lệ hoặc phí giao hàng', () => {
    const fixed = { ...coupon, discount_type: 'AMOUNT', discount_value: 999999 };
    assert.equal(calculateCouponDiscount(fixed, items, 12000, now).discount_amount, 215002);
    assert.equal(calculateCouponDiscount({ ...fixed, product_ids: ['c'] }, items, 12000, now).discount_amount, 10000);
    assert.equal(calculateCouponDiscount({ ...fixed, promotion_scope: 'SHIPPING' }, items, 12000, now).discount_amount, 12000);
    assert.equal(
        calculateCouponDiscount({ ...coupon, promotion_scope: 'SHIPPING', discount_value: 25 }, items, 12000, now).discount_amount,
        3000
    );
});

test('Từ chối mã hết hạn, chưa bắt đầu, chưa đạt tiền tối thiểu và sai sản phẩm', () => {
    assert.throws(() => calculateCouponDiscount({ ...coupon, valid_to: new Date('2026-10-21') }, items, 15000, now), /COUPON_EXPIRED/);
    assert.throws(() => calculateCouponDiscount({ ...coupon, valid_from: new Date('2026-10-23') }, items, 15000, now), /COUPON_EXPIRED/);
    assert.throws(() => calculateCouponDiscount({ ...coupon, min_order_value: 220000 }, items, 15000, now), /COUPON_MIN_ORDER/);
    assert.throws(() => calculateCouponDiscount({ ...coupon, product_ids: ['missing'] }, items, 15000, now), /COUPON_NOT_APPLICABLE/);
    assert.throws(() => calculateCouponDiscount({ ...coupon, promotion_scope: 'SHIPPING' }, items, 0, now), /COUPON_NOT_APPLICABLE/);
    assert.throws(() => calculateCouponDiscount({ ...coupon, discount_value: 0 }, items, 15000, now), /COUPON_NOT_APPLICABLE/);
});

test('Không giảm lại mã phần trăm đã tự động áp dụng', () => {
    assert.throws(() => calculateCouponDiscount({ ...coupon, requires_code: false }, items, 15000, now), /COUPON_ALREADY_APPLIED/);
    assert.equal(
        calculateCouponDiscount({ ...coupon, requires_code: false, promotion_scope: 'SHIPPING' }, items, 15000, now).discount_amount,
        1500
    );
});

test('Phân bổ mã theo cơ sở giữ tổng đúng, không âm và không vượt phần tiền hợp lệ', () => {
    assert.deepEqual(allocateDiscount(7, [0, 5, 10]), [0, 2, 5]);
    assert.deepEqual(allocateDiscount(2, [1, 1, 1]), [1, 1, 0]);
    for (let index = 1; index <= 100; index++) {
        const amounts = [index * 13, index % 3 ? 0 : index * 7, index * 17 + 1];
        const total = amounts.reduce((sum, amount) => sum + amount, 0);
        const discount = Math.min(total, index * 11);
        const allocated = allocateDiscount(discount, amounts);
        assert.equal(
            allocated.reduce((sum, value) => sum + value, 0),
            discount
        );
        assert.ok(allocated.every((value, position) => Number.isInteger(value) && value >= 0 && value <= amounts[position]));
    }
});
