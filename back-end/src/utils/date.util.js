// Hạn sử dụng tính theo ngày ở Việt Nam, bao gồm cả ngày hết hạn.
const getToday = () => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
};

const parseDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

    const date = new Date(value + 'T00:00:00.000Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;

    return date;
};

// VNPay dùng giờ Việt Nam (UTC+7), không phụ thuộc múi giờ của máy chủ.
const formatVnpayDate = (value = new Date()) => {
    const date = new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000);
    return Number(date.toISOString().slice(0, 19).replace(/\D/g, ''));
};

const parseVnpayDate = (value) => {
    const text = String(value);
    if (!/^\d{14}$/.test(text)) throw new Error('INVALID_PAYMENT_DATE');
    const date = new Date(text.slice(0, 4) + '-' + text.slice(4, 6) + '-' + text.slice(6, 8) +
        'T' + text.slice(8, 10) + ':' + text.slice(10, 12) + ':' + text.slice(12, 14) + '+07:00');
    if (Number.isNaN(date.getTime())) throw new Error('INVALID_PAYMENT_DATE');
    return date;
};

module.exports = { getToday, parseDate, formatVnpayDate, parseVnpayDate };
