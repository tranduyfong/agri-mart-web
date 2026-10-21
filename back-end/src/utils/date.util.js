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

module.exports = { getToday, parseDate };
