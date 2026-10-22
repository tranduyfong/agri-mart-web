const { VNPay, ignoreLogger } = require('vnpay');
require('dotenv').config();

// Chỉ khởi tạo khi đã có cấu hình, để COD vẫn hoạt động khi chưa cấu hình VNPay.
const vnpayInstance =
    process.env.VNP_TMN_CODE && process.env.VNP_HASH_SECRET
        ? new VNPay({
            tmnCode: process.env.VNP_TMN_CODE,
            secureSecret: process.env.VNP_HASH_SECRET,
            vnpayHost: 'https://sandbox.vnpayment.vn',
            testMode: true,
            hashAlgorithm: 'SHA512',
            loggerFn: ignoreLogger,
        })
        : null;

module.exports = vnpayInstance;
