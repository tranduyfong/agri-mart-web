const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getReportRange, getAllocationCost, getOrderCost, completedAt } = require('../src/utils/report.util');

test('Báo cáo lấy đủ một ngày Việt Nam, không lẫn mốc nửa đêm ngày kế tiếp', () => {
    const range = getReportRange({ from: '2026-10-23', to: '2026-10-23' });
    assert.equal(range.start.toISOString(), '2026-10-22T17:00:00.000Z');
    assert.equal(range.end.toISOString(), '2026-10-23T17:00:00.000Z');
    assert.throws(() => getReportRange({ from: '2026-02-30', to: '2026-03-01' }));
    assert.throws(() => getReportRange({ from: '2026-10-24', to: '2026-10-23' }));
});

test('Giá vốn bình quân chỉ dùng đúng lô và phiếu đã có lúc xuất', () => {
    const allocation = { batch_code: 'LO-1', expiry_date: new Date('2027-01-01'), manufactured_date: null };
    const item = { product_id: 'product', variant_sku: 'SKU' };
    const row = { ...allocation, ...item, quantity: 10, unit_cost: 20000 };
    const receipts = [
        { created_at: new Date('2026-01-01'), items: [row] },
        { created_at: new Date('2026-02-01'), items: [{ ...row, quantity: 30, unit_cost: 40000 }] },
        { created_at: new Date('2026-12-01'), items: [{ ...row, unit_cost: 999999 }] }
    ];
    assert.equal(getAllocationCost(allocation, item, receipts, new Date('2026-10-23')), 35000);
    assert.equal(getAllocationCost({ ...allocation, unit_cost: 0 }, item, receipts, new Date('2026-10-23')), 0);
    assert.equal(getAllocationCost({ ...allocation, batch_code: 'UNKNOWN' }, item, receipts, new Date('2026-10-23')), null);
});

test('Không suy đoán giá vốn dòng thiếu phân bổ; ngày hoàn tất ưu tiên lịch sử', () => {
    const order = {
        created_at: new Date('2026-01-01'),
        status_history: [{ status: 'COMPLETED', changed_at: new Date('2026-01-03') }],
        items: [{ quantity: 2, stock_allocations: [{ quantity: 1, unit_cost: 10000 }] }]
    };
    assert.equal(getOrderCost(order, []).missing, 1);
    assert.equal(completedAt(order).toISOString(), '2026-01-03T00:00:00.000Z');
    order.items[0].stock_allocations[0].quantity = 2;
    assert.deepEqual(getOrderCost(order, []), { amount: 20000, missing: 0 });
});
