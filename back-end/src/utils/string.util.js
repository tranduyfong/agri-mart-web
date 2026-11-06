// Chuẩn hóa tiếng Việt để tìm kiếm và xử lý ký tự đặc biệt khi tạo biểu thức tìm kiếm.
const normalizeSearch = (value = '') => {
    return String(value)
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
};

// Biến ký tự regex trong từ khóa thành ký tự thường để truy vấn đúng nội dung người dùng nhập.
const escapeRegex = (value) => {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = { normalizeSearch, escapeRegex };
