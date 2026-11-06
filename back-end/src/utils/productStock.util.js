// Tính lượng có thể bán bằng tổng các lô còn hạn; được dùng chung ở giỏ, checkout và gợi ý AI.
const { getToday, parseDate } = require('./date.util');

const availableStock = (variant) => {
    const today = parseDate(getToday());
    let quantity = 0;

    for (const stock of variant.stocks) {
        // Chỉ bỏ lô đã qua ngày hết hạn; lô hết hạn trong chính ngày hôm nay vẫn nằm trong quy ước bán.
        if (stock.expiry_date < today) continue;

        quantity += stock.quantity;
    }

    return Math.round(quantity * 1000) / 1000;
};

// FEFO: lô còn hàng gần hết hạn được bán trước, không phụ thuộc lô nào rẻ hơn.
const getSaleLots = (variant) => {
    const today = parseDate(getToday());
    return variant.stocks.filter((lot) => lot.quantity > 0 && new Date(lot.expiry_date) >= today)
        .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date) || a.batch_code.localeCompare(b.batch_code));
};

const getLotPrice = (variant, lot) => lot?.list_price ?? variant.list_price;
const getVariantPrice = (variant) => getLotPrice(variant, getSaleLots(variant)[0]);

// Chỉ tính giá, chưa trừ kho. Một SKU vẫn là một dòng, kèm chi tiết giá/lượng từng lô.
const getSaleQuote = (variant, quantity, discount = 0) => {
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('INVALID_QUANTITY');
    let remaining = quantity;
    const price_breakdown = [];
    const percent = Math.min(100, Math.max(0, discount || 0));
    for (const lot of getSaleLots(variant)) {
        if (remaining <= 0) break;
        const taken = Math.min(lot.quantity, remaining);
        const listPrice = getLotPrice(variant, lot);
        const price = Math.round(listPrice * (1 - percent / 100));
        price_breakdown.push({ batch_code: lot.batch_code, expiry_date: lot.expiry_date,
            quantity: taken, list_price: listPrice, price,
            line_subtotal: Math.round(listPrice * taken), line_total: Math.round(price * taken) });
        remaining = Math.round((remaining - taken) * 1000) / 1000;
    }
    if (remaining > 0) throw new Error('INSUFFICIENT_STOCK');
    const listPrice = price_breakdown[0]?.list_price ?? getVariantPrice(variant);
    return {
        list_price: listPrice,
        price: Math.round(listPrice * (1 - percent / 100)),
        line_subtotal: price_breakdown.reduce((sum, lot) => sum + lot.line_subtotal, 0),
        line_total: price_breakdown.reduce((sum, lot) => sum + lot.line_total, 0),
        price_breakdown
    };
};

module.exports = { availableStock, getSaleLots, getLotPrice, getVariantPrice, getSaleQuote };
