const {
    getService
} = require('../services/auth.services');

const AppError = require('../utils/app-error.util');

module.exports = async(req, res, next) => {
    try {
        const header = req.get('Authorization') || '';

        const match = /^Bearer ([^\s]+)$/i.exec(header);

        if (!match) {
            throw new AppError('UNAUTHORIZED', 401, 'Bạn cần đăng nhập.', 'Authentication required.');
        }

        req.auth = await getService().authenticate(match[1]);

        next();
    } catch (e) {
        next(e);
    }
};
