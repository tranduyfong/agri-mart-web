const {
    errorResponse
} = require('../utils/response.util');

module.exports = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const vi = req.locale !== 'en';

    const AppError = require('../utils/app-error.util');

    if (error instanceof AppError) {
        if (error.status === 429) {
            res.setHeader('Retry-After', '60');
        }

        return errorResponse(res, error.code, vi ? error.vi : error.en, error.status, error.data);
    }

    if (error.type === 'entity.parse.failed') {
        return errorResponse(res, 'INVALID_JSON', vi ? 'Nội dung JSON không hợp lệ.' : 'Invalid JSON body.', 400);
    }

    if (error.type === 'entity.too.large') {
        return errorResponse(res, 'PAYLOAD_TOO_LARGE', vi ? 'Dữ liệu gửi lên quá lớn.' : 'Payload too large.', 413);
    }

    if (error.code === 'CORS_DENIED') {
        return errorResponse(
            res,
            'FORBIDDEN',
            vi ? 'Nguồn truy cập chưa được cho phép.' : 'Origin is not allowed.',
            403
        );
    }

    // Do not log SQL, request bodies, passwords or tokens.
    console.error(JSON.stringify({
        requestId: req.requestId,
        event: 'request_failed',
        type: error.name || 'Error'
    }));

    return errorResponse(
        res,
        'INTERNAL_SERVER_ERROR',
        vi ? 'Có lỗi hệ thống. Vui lòng thử lại.' : 'Internal server error.',
        500
    );
};
