class AppError extends Error {
    constructor(code, status, vi, en, data = null) {
        super(vi);

        Object.assign(this, {
            code,
            status,
            vi,
            en,
            data
        });
    }
}

module.exports = AppError;
