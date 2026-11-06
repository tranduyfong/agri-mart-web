// Các kiểm tra nhỏ dùng lại ở controller/service; frontend hỗ trợ nhập liệu, backend bảo vệ dữ liệu khi gọi API trực tiếp.
const PHONE_PATTERN = /^(0|\+84)[35789]\d{8}$/;

const isText = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
const isAddressCode = (value) =>
    ['string', 'number'].includes(typeof value) &&
    /^\d+$/.test(String(value)) &&
    Number.isSafeInteger(Number(value)) && Number(value) > 0;

// Giữ các giới hạn địa chỉ ở một chỗ để controller chỉ cần gọi một hàm.
const isValidAddress = ({ recipient_name, phone, province_code, ward_code, street_address = '', hamlet = '', is_default = false } = {}) =>
    isText(recipient_name, 1, 150) &&
    typeof phone === 'string' && PHONE_PATTERN.test(phone.trim()) &&
    isAddressCode(province_code) &&
    isAddressCode(ward_code) &&
    isText(street_address, 0, 300) &&
    isText(hamlet, 0, 150) &&
    !!(street_address.trim() || hamlet.trim()) &&
    typeof is_default === 'boolean';

// Chỉ kiểm tra cú pháp URL; không tải ảnh về backend khi nhập file.
const isImageUrl = (value) => {
    if (typeof value !== 'string' || value.length > 2000) return false;
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
    } catch {
        return false;
    }
};

module.exports = { PHONE_PATTERN, isValidAddress, isImageUrl };
