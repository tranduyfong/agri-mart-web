const { normalizeSearch } = require('./string.util');

const isShoppingQuestion = (text) => /\b(thit|rau|ca|trung|dau phu|san pham|nguyen lieu|bua|mon an|khau phan|ngan sach|nguoi an|tieu duong|huyet ap|benh than|gout|gut)\b/.test(normalizeSearch(text));
const wantsStaff = (text) => /\b(nhan vien|nguoi that|tu van vien|gap shop|gap nguoi)\b/.test(normalizeSearch(text));
const needsOrderSupport = (text) => /\b(khieu nai|hoan tien)\b|\b(huy|doi|sua|kiem tra|tra cuu|thay doi)\b.*\b(don|thanh toan|dia chi giao)\b/.test(normalizeSearch(text));

// Đọc yêu cầu từ tin KHÁCH, không lấy ngân sách/lời xúc phạm trong tin của nhân viên làm yêu cầu mua.
const getShoppingRequest = (history) => {
    const result = { budget: null, people: null, groups: [] };
    for (const message of history.filter((item) => item.sender_type === 'CUSTOMER')) {
        const text = normalizeSearch(message.content);
        const people = /\b(\d{1,3})\s*nguoi\b/.exec(text);
        const amounts = [...text.matchAll(/(\d[\d.,]*)\s*(trieu|tr|nghin|ngan|k|dong|d|vnd)\b/g)];
        const money = amounts.at(-1) || /(?:duoi|toi da|khong qua|ngan sach|tam|khoang)\s*(\d[\d.,]*)/i.exec(text);
        if (money) {
            const unit = money[2] || '';
            const amount = /trieu|^tr$|nghin|ngan|^k$/.test(unit) ? Number(money[1].replace(',', '.')) : Number(money[1].replace(/[.,]/g, ''));
            const budget = Math.round(amount * (/trieu|^tr$/.test(unit) ? 1000000 : /nghin|ngan|^k$/.test(unit) ? 1000 : 1));
            if (Number.isSafeInteger(budget) && budget > 0) result.budget = budget;
        }
        if (people) result.people = Number(people[1]);
        const groups = [];
        if (/\b(thit|ga|heo|lon)\b/.test(text) || /(^|\s)bò(\s|$)/i.test(message.content)) groups.push('MEAT');
        if (/\b(rau|cu qua)\b/.test(text)) groups.push('VEGETABLE');
        // Một yêu cầu đầy đủ mới thay nhóm cũ; câu "có cả thịt nữa" bổ sung nhóm trước đó.
        if (groups.length && (people || money) && !/\b(them|nua|ca thit|ca rau)\b/.test(text)) result.groups = groups;
        else result.groups = [...new Set([...result.groups, ...groups])];
    }
    return result;
};

const getMissingGroups = (items, request) => request.groups.filter((group) => !items.some((item) => {
    const text = normalizeSearch(item.name + ' ' + item.category_name);
    return group === 'MEAT' ? /\b(thit|heo|lon|ga)\b/.test(text) || /(^|\s)bò(\s|$)/i.test(item.name)
        : /\b(rau|cai|bong cai|suplo|bi|bau|muop|cu)\b/.test(text);
}));

module.exports = { isShoppingQuestion, wantsStaff, needsOrderSupport, getShoppingRequest, getMissingGroups };
