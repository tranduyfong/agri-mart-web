const {
    errorResponse
} = require('../utils/response.util');

// Single-process limit for local thesis deployment; use a shared store when scaling.
module.exports = ({
    limit,
    windowMs,
    maxKeys = 10000
}) => {
    const entries = new Map();

    let nextSweep = 0;

    return(req, res, next) => {
        const now = Date.now();

        if (now >= nextSweep) {
            for (const [k, v] of entries) {
                if (v.until <= now) {
                    entries.delete(k);
                }

                nextSweep = now + 60000;
            }
        }

        const key = req.ip || req.socket.remoteAddress || 'unknown';

        let entry = entries.get(key);

        if (!entry || entry.until <= now) {
            if (!entry && entries.size >= maxKeys) {
                res.setHeader('Retry-After', '60');

                return errorResponse(res, 'RATE_LIMITED', 'Vui lòng thử lại sau / Please try again later.', 429);
            }

            entry = {
                count: 0,
                until: now + windowMs
            };

            entries.set(key, entry);
        }

        entry.count++;

        if (entry.count > limit) {
            res.setHeader('Retry-After', String(Math.ceil((entry.until - now) / 1000)));

            return errorResponse(
                res,
                'RATE_LIMITED',
                'Quá nhiều yêu cầu. Vui lòng thử lại sau / Too many requests.',
                429
            );
        }

        next();
    };
};
