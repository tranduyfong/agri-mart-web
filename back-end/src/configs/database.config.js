// Kết nối Mongoose bằng URI trong .env; kiểm tra cấu trúc kho và tạo các index trước khi nhận request.
const mongoose = require('mongoose');
const dns = require('node:dns');

require('dotenv').config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Chỉ nhận request sau khi kết nối DB, kiểm tra dữ liệu kho cũ và tạo index thành công.
const connection = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL, {
            autoIndex: false,
            serverSelectionTimeoutMS: 10000
        });

        await require('../services/storeMigration.services').assertMigrated();
        await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).createIndexes()));

        console.log('MongoDB connected successfully');
    } catch (error) {
        await mongoose.disconnect();
        throw error;
    }
};

module.exports = connection;
