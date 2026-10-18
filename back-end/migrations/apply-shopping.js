const fs = require('fs');
const path = require('path');
const db = require('../src/configs/database.config');

// Chỉ tạo bảng yêu thích nếu chưa có, có thể chạy lại an toàn
const migrate = async () => {
    try {
        await db.query(fs.readFileSync(path.join(__dirname, '20261017-shopping.sql'), 'utf8'));
        console.log('Đã cập nhật bảng sản phẩm yêu thích');
    } finally {
        await db.end();
    }
};

migrate().catch((error) => { console.error(error.message); process.exitCode = 1; });
