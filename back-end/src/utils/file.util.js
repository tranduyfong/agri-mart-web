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

module.exports = {
    deleteUploadedFiles
};
