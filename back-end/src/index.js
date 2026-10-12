require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rootRoutes = require('./routes/index');
const { errorResponse } = require('./utils/response.util');
const app = express();
const PORT = process.env.PORT || 8000;

// Middlewares cơ bản
app.use(cors());
app.use(express.json()); // Để parse body dạng JSON
app.use(express.urlencoded({ extended: true }));

// Cho phép truy cập ảnh đã upload qua đường dẫn /uploads/...
app.use('/uploads', express.static('uploads'));

// Kết nối các Routes
app.use('/api', rootRoutes);

// Xử lý Route Not Found (404) theo đúng chuẩn Response
app.use((req, res, next) => {
    return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Endpoint not found', 404);
});

// Xử lý lỗi chung (VD: body JSON sai định dạng), trả về đúng chuẩn Response thay vì trang HTML của Express
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return errorResponse(res, 'VALIDATION_FAILED', 'Dữ liệu JSON gửi lên không hợp lệ', 400);
    }
    return errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Lỗi hệ thống', 500, null, err.message);
});

app.listen(PORT, () => {
    console.log(`Server app listening on port ${PORT}`);
});
