const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { errorResponse } = require('../utils/response.util');

// Cấu hình nơi lưu trữ và tên file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'uploads/'; // Thư mục gốc

        // Phân loại thư mục lưu trữ dựa trên endpoint gọi API (route sản phẩm là /api/product)
        if (req.baseUrl.includes('product')) {
            folder += 'products/';
        } else if (req.baseUrl.includes('banners')) {
            folder += 'banners/';
        } else if (req.baseUrl.includes('users') || req.baseUrl.includes('auth')) {
            folder += 'avatars/';
        } else {
            folder += 'others/';
        }

        // Tự động tạo thư mục nếu trên máy chưa có (tránh lỗi sập server)
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        cb(null, folder);
    },
    filename: (req, file, cb) => {
        // Đổi tên file: timestamp_random_tên-gốc.đuôi-file
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Bộ lọc chỉ cho phép tải lên hình ảnh (dùng cho ảnh sản phẩm)
const imageFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép tải lên hình ảnh (JPG, PNG, GIF, WEBP)'), false);
    }
};

const limits = { fileSize: 10 * 1024 * 1024 }; // Giới hạn mỗi file tối đa 10MB

// Bọc middleware của multer để trả lỗi theo đúng chuẩn Response
const handleUpload = (multerMiddleware) => {
    return (req, res, next) => {
        multerMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return errorResponse(res, 'UPLOAD_FAILED', `Lỗi tải file: ${err.message}`, 400);
            } else if (err) {
                return errorResponse(res, 'UPLOAD_FAILED', err.message, 400);
            }
            next();
        });
    };
};

// Ảnh sản phẩm: gửi lên ở field "images", tối đa 10 ảnh -> req.files
const uploadImages = handleUpload(multer({ storage, fileFilter: imageFilter, limits }).array('images', 10));

module.exports = {
    uploadImages
};
