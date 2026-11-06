const { test } = require('node:test');
const assert = require('node:assert/strict');
const { availableStock, getVariantPrice, getSaleQuote } = require('../src/utils/productStock.util');
const { calculateCouponDiscount } = require('../src/utils/promotion.util');
const variant = {
    list_price: 70000,
    stocks: [
        { batch_code: 'LATER', quantity: 3, expiry_date: new Date('2099-12-03'), list_price: 60000 },
        { batch_code: 'EARLY', quantity: 2, expiry_date: new Date('2099-11-30'), list_price: 50000 },
        { batch_code: 'EXPIRED', quantity: 20, expiry_date: new Date('2000-01-01'), list_price: 1000 },
        { batch_code: 'EMPTY', quantity: 0, expiry_date: new Date('2099-01-01'), list_price: 2000 }
    ]
};

test('Một SKU ưu tiên hạn sớm, bỏ lô hết hạn/hết hàng và tính đúng khi mua qua hai mức giá', () => {
    assert.equal(availableStock(variant), 5);
    assert.equal(getVariantPrice(variant), 50000);
    const before = JSON.stringify(variant);
    const quote = getSaleQuote(variant, 3);
    assert.equal(quote.line_total, 160000);
    assert.equal(quote.line_subtotal, 160000);
    assert.deepEqual(quote.price_breakdown.map((lot) => [lot.batch_code, lot.quantity, lot.price]), [['EARLY', 2, 50000], ['LATER', 1, 60000]]);
    assert.equal(JSON.stringify(variant), before, 'Xem giá không được trừ kho');
    assert.throws(() => getSaleQuote(variant, 6), /INSUFFICIENT_STOCK/);
    assert.throws(() => getSaleQuote(variant, NaN), /INVALID_QUANTITY/);
});

test('Ưu tiên hạn dùng dù lô sau rẻ hơn; lô cũ chưa có giá dùng giá mặc định; giá 0 vẫn hợp lệ', () => {
    const cheaperLater = structuredClone(variant);
    cheaperLater.stocks[0].list_price = 30000;
    assert.equal(getVariantPrice(cheaperLater), 50000);
    cheaperLater.stocks[1].quantity = 0;
    assert.equal(getVariantPrice(cheaperLater), 30000);
    const legacy = { list_price: 40000, stocks: [{ batch_code: 'OLD', quantity: 5, expiry_date: new Date('2099-01-01') }] };
    assert.equal(getSaleQuote(legacy, 1.5).line_total, 60000);
    legacy.stocks[0].list_price = 0;
    assert.equal(getSaleQuote(legacy, 1).line_total, 0);
});

test('Ưu đãi và mã giảm tính trên tổng các lô, giữ đúng tiền với số lượng thập phân', () => {
    const quote = getSaleQuote(variant, 3, 20);
    assert.equal(quote.line_total, 128000);
    const items = [{ ...getSaleQuote(variant, 3), product_id: 'PEAR', quantity: 3 }];
    const coupon = { _id: 'coupon', code: 'LOT10', name: 'Giảm 10%', valid_from: new Date('2000-01-01'),
        valid_to: new Date('2099-12-31'), min_order_value: 155000, discount_type: 'PERCENT', discount_value: 10,
        promotion_scope: 'PRODUCT', requires_code: true, product_ids: ['PEAR'] };
    assert.equal(calculateCouponDiscount(coupon, items, 15000).discount_amount, 16000);
    const decimal = structuredClone(variant);
    decimal.stocks[1].quantity = 0.5;
    assert.equal(getSaleQuote(decimal, 1.5).line_total, 85000);
});
