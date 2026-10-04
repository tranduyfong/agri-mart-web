const {
    test
} = require('node:test');

const assert = require('node:assert/strict');

const request = require('../src/middlewares/request.middleware');

const {
    successResponse,
    errorResponse
} = require('../src/utils/response.util');

function response() {
    return {
        locals: {
        },
        headers: {
        },
        setHeader(k, v) {
            this.headers[k] = v;
        },
        status(n) {
            this.statusCode = n;

            return this;
        },
        json(data) {
            this.body = data;

            return this;
        }
    };
}

test('valid caller request ID is shared by header and body', () => {
    const id = 'ad836de1-d1e2-47a8-a454-8fb64f371d08',
    res = response();

    request({
        get: k => k === 'X-Request-Id' ? id : undefined
    }, res, () => {
    });

    successResponse(res, {
        status: 'ok'
    });

    assert.equal(res.body.requestId, id);

    assert.equal(res.headers['X-Request-Id'], id);

    assert.deepEqual(Object.keys(res.body), ['code', 'message', 'requestId', 'serverTime', 'data']);

    assert.ok(res.body.serverTime.endsWith('Z'));
});

test('invalid caller ID is replaced and pagination stays top level', () => {
    const res = response();

    request({
        get: k => k === 'X-Request-Id' ? 'bad' : undefined
    }, res, () => {
    });

    successResponse(res, [], {
        pageNumber: 0,
        pageSize: 10,
        totalElements: 0,
        totalPages: 0
    });

    assert.notEqual(res.body.requestId, 'bad');

    assert.equal(res.body.pageNumber, 0);

    assert.deepEqual(res.body.data, []);
});

test('field errors and HTTP status are preserved', () => {
    const res = response();

    errorResponse(res, 'VALIDATION_FAILED', 'Invalid', 400, [{
        field: 'email',
        message: 'Required'
    }]);

    assert.equal(res.statusCode, 400);

    assert.equal(res.body.data[0].field, 'email');

    assert.equal(res.headers['X-Request-Id'], res.body.requestId);
});
