const {
    randomUUID
} = require('node:crypto');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = (req, res, next) => {
    const incoming = req.get('X-Request-Id');

    res.locals.requestId = typeof incoming === 'string' && uuidPattern.test(incoming) ? incoming : randomUUID();

    req.requestId = res.locals.requestId;

    const language = req.get('Locale') || req.get('Accept-Language') || 'vi';

    req.locale = /^en(?:[-,;]|$)/i.test(language) ? 'en' : 'vi';

    res.locals.locale = req.locale;

    res.setHeader('X-Request-Id', req.requestId);

    next();
};
