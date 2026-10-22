const { VNPay, ignoreLogger } = require('vnpay');
require('dotenv').config();

const paymentUrl = new URL(process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');

// Chỉ khởi tạo khi đã có cấu hình, để COD vẫn hoạt động khi chưa cấu hình VNPay.
const vnpayInstance =
    process.env.VNP_TMN_CODE && process.env.VNP_HASH_SECRET
        ? new VNPay({
            tmnCode: process.env.VNP_TMN_CODE,
            secureSecret: process.env.VNP_HASH_SECRET,
            vnpayHost: paymentUrl.origin,
            testMode: process.env.VNP_TEST_MODE !== 'false',
            hashAlgorithm: 'SHA512',
            loggerFn: ignoreLogger,
            endpoints: { paymentEndpoint: paymentUrl.pathname.replace(/^\//, '') }
        })
        : null;

module.exports = vnpayInstance;
