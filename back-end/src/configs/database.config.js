const mysql = require('mysql2/promise');
require('dotenv').config();

// Khởi tạo Pool kết nối tới MySQL
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true, // Hàng đợi nếu các kết nối đang bận
    connectionLimit: 10,      // Giới hạn số lượng kết nối đồng thời (tùy chỉnh theo server)
    queueLimit: 0             // Không giới hạn hàng đợi
});

// Kiểm tra kết nối khi server khởi động
dbPool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL Database successfully!');
        connection.release(); // Trả kết nối lại cho pool
    })
    .catch(err => {
        console.error('Failed to connect to MySQL:', err.message);
    });

module.exports = dbPool;
