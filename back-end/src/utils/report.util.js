const { parseDate, getToday } = require('./date.util');

const getReportRange = (query) => {
    const to = query.to || getToday();
    const from = query.from || to.slice(0, 8) + '01';
    const start = parseDate(from),
        last = parseDate(to);
    if (!start || !last || start > last || last - start > 366 * 86400000) throw new Error('INVALID_REPORT_RANGE');
    // Mốc lọc theo ngày Việt Nam, khoảng nửa mở [đầu ngày, đầu ngày kế tiếp).
    return { from, to, start: new Date(start.getTime() - 7 * 3600000), end: new Date(last.getTime() + 17 * 3600000) };
};

const completedAt = (order) => {
    const event = (order.status_history || []).filter((item) => item.status === 'COMPLETED').at(-1);
    return event?.changed_at || order.created_at;
};

// Bình quân gia quyền trong đúng lô, chỉ lấy các phiếu nhập đã tồn tại khi xuất hàng.
const getAllocationCost = (allocation, item, receipts, asOf) => {
    if (Number.isFinite(allocation.unit_cost) && allocation.unit_cost >= 0) return allocation.unit_cost;
    let quantity = 0,
        amount = 0;
    for (const receipt of receipts) {
        if (receipt.created_at > asOf) continue;
        for (const row of receipt.items) {
            if (
                String(row.product_id) !== String(item.product_id) ||
                row.variant_sku !== item.variant_sku ||
                row.batch_code !== allocation.batch_code
            )
                continue;
            if (new Date(row.expiry_date).getTime() !== new Date(allocation.expiry_date).getTime()) continue;
            if (
                (row.manufactured_date ? new Date(row.manufactured_date).getTime() : null) !==
                (allocation.manufactured_date ? new Date(allocation.manufactured_date).getTime() : null)
            )
                continue;
            quantity += row.quantity;
            amount += row.quantity * row.unit_cost;
        }
    }
    return quantity ? amount / quantity : null;
};

const getOrderCost = (order, receipts) => {
    let amount = 0,
        missing = 0;
    for (const item of order.items) {
        const allocations = item.stock_allocations || [];
        const allocated = allocations.reduce((sum, row) => sum + row.quantity, 0);
        if (!allocations.length || Math.abs(allocated - item.quantity) > 0.00001) {
            missing++;
            continue;
        }
        let lineCost = 0,
            complete = true;
        for (const allocation of allocations) {
            const cost = getAllocationCost(allocation, item, receipts, order.created_at);
            if (cost === null) {
                complete = false;
                break;
            }
            lineCost += cost * allocation.quantity;
        }
        if (complete) amount += lineCost;
        else missing++;
    }
    return { amount: Math.round(amount), missing };
};

module.exports = { getReportRange, completedAt, getAllocationCost, getOrderCost };
