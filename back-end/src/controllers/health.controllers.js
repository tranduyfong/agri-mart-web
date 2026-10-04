const service = require('../services/health.services');

const {
    successResponse,
    errorResponse
} = require('../utils/response.util');

exports.checkServer = (req, res) => successResponse(res, {
    status: 'ok'
}, null, req.locale === 'en' ? 'Server is running.' : 'Backend đang hoạt động.');

exports.checkDatabase = async(req, res) => {
    try {
        return successResponse(
            res,
            await service.checkDatabase(),
            null,
            req.locale === 'en' ? 'MySQL connected.' : 'Kết nối MySQL thành công.'
        );
    } catch (error) {
        console.error(JSON.stringify({
            requestId: req.requestId,
            event: 'database_unavailable',
            code: error.code || 'DB_ERROR'
        }));

        return errorResponse(
            res,
            'DATABASE_UNAVAILABLE',
            req.locale === 'en' ? 'Database is unavailable.' : 'Chưa kết nối được MySQL. Kiểm tra cấu hình trên máy chủ.',
            503
        );
    }
};
