const { getToday, parseDate } = require('./date.util');

const availableStock = (variant, branchId) => {
    const today = parseDate(getToday());
    let quantity = 0;

    for (const stock of variant.stocks) {
        if (stock.expiry_date < today) continue;
        if (branchId && stock.branch_id.toString() !== branchId.toString()) continue;

        quantity += stock.quantity;
    }

    return Math.round(quantity * 1000) / 1000;
};

module.exports = { availableStock };
