require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketConfig = require('./configs/socket.config');
const connection = require('./configs/database.config');
const rootRoutes = require('./routes');
const { errorResponse } = require('./utils/response.util');

const app = express();
const server = http.createServer(app);
socketConfig.init(server);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api', rootRoutes);

app.use((req, res) => {
    return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Endpoint not found', 404);
});

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') {
        return errorResponse(res, 'VALIDATION_FAILED', 'Dữ liệu JSON không hợp lệ', 400);
    }
    if (error.type === 'entity.too.large') {
        return errorResponse(res, 'VALIDATION_FAILED', 'Dữ liệu gửi lên quá lớn', 413);
    }
    return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, error.message);
});

const PORT = process.env.PORT || 8000;

connection()
    .then(async () => {
        await require('./services/newsletter.services').recoverSending();
        server.listen(PORT, () => console.log('Server is running on port ' + PORT));
        let checkingPayments = false;
        const timer = setInterval(async () => {
            if (checkingPayments) return;
            checkingPayments = true;
            try {
                await require('./services/order.services').checkExpiredPayments();
            } catch {
                console.error('Chưa kiểm tra được các giao dịch VNPay đang chờ');
            } finally {
                checkingPayments = false;
            }
        }, 60000);
        timer.unref();
    })
    .catch((error) => {
        console.error('Không thể khởi động backend:', error.message);
        process.exitCode = 1;
    });
