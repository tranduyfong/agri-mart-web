const fs = require('fs');

/**
 * Xóa các file đã upload xuống ổ cứng (dùng khi dữ liệu không hợp lệ hoặc lưu DB bị lỗi)
 */
const deleteUploadedFiles = (files) => {
    if (!files) return;

    for (const file of files) {
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    }
};

// Một ảnh tải lên hoặc link https; không nhận đường dẫn file tùy ý từ trình duyệt.
const getImageUrl = (data, files = [], oldUrl = null) => {
    if (files.length > 1) throw new Error('INVALID_DATA');
    if (files[0]) return files[0].path.replace(/\\/g, '/');
    if (data.remove_image === true || data.remove_image === 'true') return null;
    if (data.image_url === undefined || data.image_url === oldUrl) return oldUrl;
    if (typeof data.image_url !== 'string') throw new Error('INVALID_DATA');
    const url = data.image_url.trim();
    if (!url) return null;
    if (!/^https?:\/\//.test(url) || url.length > 2000) throw new Error('INVALID_DATA');
    return url;
};

module.exports = { deleteUploadedFiles, getImageUrl };
