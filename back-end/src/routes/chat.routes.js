// Đường dẫn cho chat của khách hàng; nối URL tới controller.
// Những middleware được khai báo trên route sẽ chạy trước handler theo thứ tự từ trái sang phải.
const express = require('express');
const controller = require('../controllers/chat.controllers');
const { verifyToken } = require('../middlewares/auth.middleware');
const { uploadChatImages } = require('../middlewares/upload.middleware');
const { errorResponse } = require('../utils/response.util');
const router = express.Router();
router.use(verifyToken, (req, res, next) => req.user.role === 'CUSTOMER' ? next() : errorResponse(res, 'FORBIDDEN', 'Chức năng dành cho khách hàng', 403));
router.get('/', controller.getRoom);
router.get('/summary', controller.getSummary(true));
router.post('/messages', uploadChatImages, controller.sendMessage);
router.post('/:id/read', controller.markRead(true));
router.post('/:id/resume-ai', controller.resumeAi);
module.exports = router;
