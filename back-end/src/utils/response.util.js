const {
    randomUUID
} = require('node:crypto');

function envelope(res, code, message, data) {
    const requestId = res.locals.requestId || randomUUID();

    res.locals.requestId = requestId;

    res.setHeader('X-Request-Id', requestId);

    return {
        code,
        message,
        requestId,
        serverTime: new Date().toISOString(),
        data
    };
}

// Same call signature as the supplied backend.
function successResponse(res, data, pagination = null, message = 'Success', statusCode = 200) {
    const response = envelope(res, 'SUCCESS', message, data === undefined ? null : data);

    if (pagination) {
        for (const key of['pageNumber', 'pageSize', 'totalElements', 'totalPages']) {
            response[key] = pagination[key];
        }
    }

    return res.status(statusCode).json(response);
}

function errorResponse(res, code, message, statusCode = 400, data = null) {
    return res.status(statusCode).json(envelope(res, code, message, data));
}

module.exports = {
    successResponse,
    errorResponse
};
