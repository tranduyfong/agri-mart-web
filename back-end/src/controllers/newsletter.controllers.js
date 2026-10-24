const newsletterService = require('../services/newsletter.services');
const { successResponse } = require('../utils/response.util');
const { staffErrorResponse } = require('../utils/staffError.util');

const subscribe = async (req, res) => {
    try {
        await newsletterService.subscribe(req.body.email);
        return successResponse(res, null, null, 'Đã đăng ký nhận bản tin');
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};

// GET chỉ hiển thị xác nhận, tránh bot quét email tự hủy đăng ký.
const confirmUnsubscribe = (req, res) =>
    res
        .type('html')
        .send(
            '<!doctype html><html lang="vi"><meta charset="utf-8"><title>Hủy đăng ký</title><body style="font-family:sans-serif;padding:40px"><h1>Hủy đăng ký nhận bản tin Agri-Mart</h1><form method="post"><button type="submit">Xác nhận hủy đăng ký</button></form></body></html>'
        );

const unsubscribe = async (req, res) => {
    try {
        await newsletterService.unsubscribe(req.params.token);
        return res.type('html').send('<meta charset="utf-8"><p>Bạn đã hủy đăng ký nhận bản tin Agri-Mart.</p>');
    } catch (error) {
        return staffErrorResponse(res, error);
    }
};

module.exports = { subscribe, confirmUnsubscribe, unsubscribe };
