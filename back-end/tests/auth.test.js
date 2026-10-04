const {
    test
} = require('node:test');

const assert = require('node:assert/strict');

const {
    createService
} = require('../src/services/auth.services');

const {
    validate
} = require('../src/middlewares/auth-validation.middleware');

const security = require('../src/utils/auth-security.util');

const rateLimit = require('../src/middlewares/rate-limit.middleware');

const settings = {
    secret: 'test-secret-only-'.repeat(4),
    otpSecret: 'test-otp-only-'.repeat(4),
    bcryptRounds: 4,
    expiresIn: '1d',
    issuer: 'grocery-backend',
    audience: 'grocery-web'
};

function harness(steps) {
    const calls = [],
    queue = [...steps];

    const execute = async(sql, params = []) => {
        calls.push({
            sql,
            params
        });

        const step = queue.shift();

        assert.ok(step, 'Unexpected query ' + sql);

        assert.match(sql, step.match);

        if (step.params) {
            step.params(params);
        }

        if (step.error) {
            throw step.error;
        }

        return [step.result ?? {
            affectedRows: 1
        }, []];
    };

    const c = {
        execute,
        beginTransaction: async() => calls.push('begin'),
        commit: async() => calls.push('commit'),
        rollback: async() => calls.push('rollback'),
        release: () => calls.push('release')
    };

    const mail = {
        sent: [],
        sendAuthCode: async(...a) => mail.sent.push(a)
    };

    const jwt = {
        sign: () => 'signed-test-token',
        verify: () => ({
            sub: '1',
            ver: 3
        })
    };

    const bcrypt = {
        hash: async() => 'new-hash',
        compare: async() => true
    };

    const service = createService({
        db: {
            execute,
            getConnection: async() => c
        },
        bcrypt,
        jwt,
        mail,
        config: () => settings
    });

    return {
        service,
        calls,
        mail,
        jwt,
        bcrypt,
        done: () => assert.equal(queue.length, 0)
    };
}

const user = {
    id: '1',
    email: 'a@example.com',
    password_hash: 'old-hash',
    status: 'ACTIVE',
    token_version: 3,
    role_id: '1',
    full_name: 'A',
    deleted_at: null
};

function challenge(purpose = 'RESET_PASSWORD') {
    return {
        id: '10',
        user_id: '1',
        purpose,
        code_hash: security.hashCode(settings.otpSecret, '1', purpose, '123456'),
        is_live: 1,
        attempts: 0,
        max_attempts: 5,
        verified_at: null,
        consumed_at: null
    };
}

test('validation normalizes email, discards supplied admin role', () => {
    const v = validate('register', {
        email: ' A@Example.COM ',
        password: 'abcdefgh',
        confirmPassword: 'abcdefgh',
        fullName: ' Demo ',
        role: 'admin'
    });

    assert.equal(v.email, 'a@example.com');

    assert.equal(v.fullName, 'Demo');

    assert.equal(v.role, undefined);

    assert.equal(v.phone, null);
});

test('reject malformed code, mismatched passwords, UTF8 bcrypt truncation', () => {
    assert.throws(() => validate('verify', {
        email: 'a@b.com',
        code: '12345'
    }));

    assert.throws(() => validate('reset', {
        resetToken: 'a'.repeat(64),
        newPassword: 'abcdefgh',
        confirmPassword: 'different'
    }));

    assert.throws(() => validate('register', {
        email: 'a@b.com',
        password: '🙂'.repeat(19),
        confirmPassword: '🙂'.repeat(19),
        fullName: 'Demo'
    }));
});

test('OTP HMAC bound to account and purpose', () => {
    const a = security.hashCode(settings.otpSecret, '1', 'REGISTER', '123456');

    assert.equal(security.matches(a, security.hashCode(settings.otpSecret, '2', 'REGISTER', '123456')), false);

    assert.equal(security.matches(a, security.hashCode(settings.otpSecret, '1', 'RESET_PASSWORD', '123456')), false);

    assert.equal(security.matches(a, a), true);
});

test('wrong OTP increments attempts AND commits on rejected request', async() => {
    const h = harness([{
        match: /SELECT \* FROM users/,
        result: [user]
    }, {
        match: /FROM auth_challenges/,
        params: p => assert.equal(p[1], 'RESET_PASSWORD'),
        result: [challenge()]
    }, {
        match: /SET attempts=attempts\+1/
    }]);

    await assert.rejects(h.service.verify(user.email, '999999', 'RESET_PASSWORD'), {
        code: 'INVALID_OR_EXPIRED_CODE'
    });

    assert.ok(h.calls.includes('commit'));

    assert.ok(!h.calls.includes('rollback'));

    h.done();
});

test('expired OTP is rejected without granting reset token', async() => {
    const h = harness([{
        match: /FROM users/,
        result: [user]
    }, {
        match: /FROM auth_challenges/,
        result: [{
            ...challenge(),
            is_live: 0
        }]
    }]);

    await assert.rejects(h.service.verify(user.email, '123456', 'RESET_PASSWORD'), {
        code: 'INVALID_OR_EXPIRED_CODE'
    });

    h.done();
});

test('exhausted and consumed OTP cannot be reused', async() => {
    for (const patch of[{
        attempts: 5
    }, {
        consumed_at: '2026-10-03'
    }, {
        verified_at: '2026-10-03'
    }]) {
        const h = harness([{
            match: /FROM users/,
            result: [user]
        }, {
            match: /FROM auth_challenges/,
            result: [{
                ...challenge(),
                ...patch
            }]
        }]);

        await assert.rejects(h.service.verify(user.email, '123456', 'RESET_PASSWORD'), {
            code: 'INVALID_OR_EXPIRED_CODE'
        });

        h.done();
    }
});

test('verify reset emits opaque token, stores only hash', async() => {
    let stored;

    const h = harness([{
        match: /FROM users/,
        result: [user]
    }, {
        match: /FROM auth_challenges/,
        result: [challenge()]
    }, {
        match: /SET verified_at/,
        params: p => {
            stored = p[0];
        }
    }]);

    const r = await h.service.verify(user.email, '123456', 'RESET_PASSWORD');

    assert.match(r.resetToken, /^[a-f0-9]{64}$/);

    assert.notEqual(stored, r.resetToken);

    assert.equal(stored, security.hashToken(r.resetToken));

    h.done();
});

test('verify registration activates only pending account and consumes code', async() => {
    const h = harness([{
        match: /FROM users/,
        result: [{
            ...user,
            status: 'PENDING'
        }]
    }, {
        match: /FROM auth_challenges/,
        result: [challenge('REGISTER')]
    }, {
        match: /SET status='ACTIVE'/
    }, {
        match: /verified_at=.*consumed_at/
    }]);

    assert.equal((await h.service.verify(user.email, '123456', 'REGISTER')).verified, true);

    assert.ok(h.calls.includes('commit'));

    h.done();
});

test('reset token consumed cannot reset password', async() => {
    const h = harness([{
        match: /SELECT user_id/,
        result: [{
            user_id: '1'
        }]
    }, {
        match: /FROM users/,
        result: [user]
    }, {
        match: /reset_token_hash/,
        result: [{
            ...challenge(),
            verified_at: 'yes',
            consumed_at: 'yes'
        }]
    }]);

    await assert.rejects(h.service.reset('a'.repeat(64), 'newPassword123'), {
        code: 'INVALID_OR_EXPIRED_RESET_TOKEN'
    });

    h.done();
});

test('valid reset increments token version and consumes all old challenges atomically', async() => {
    const h = harness([{
        match: /SELECT user_id/,
        result: [{
            user_id: '1'
        }]
    }, {
        match: /FROM users/,
        result: [user]
    }, {
        match: /reset_token_hash/,
        result: [{
            ...challenge(),
            verified_at: 'yes'
        }]
    }, {
        match: /token_version=token_version\+1/
    }, {
        match: /SET consumed_at/
    }]);

    await h.service.reset('a'.repeat(64), 'newPassword123');

    assert.ok(h.calls.includes('commit'));

    assert.equal(h.calls.at(- 1), 'release');

    h.done();
});

test('SQL failure rolls back and releases connection', async() => {
    const h = harness([{
        match: /FROM users/,
        error: new Error('simulated database failure')
    }]);

    await assert.rejects(h.service.verify(user.email, '123456', 'REGISTER'), /simulated/);

    assert.ok(h.calls.includes('rollback'));

    assert.ok(!h.calls.includes('commit'));

    assert.equal(h.calls.at(- 1), 'release');

    h.done();
});

test('unknown forgot-password account returns generic success and sends nothing', async() => {
    const h = harness([{
        match: /FROM users/,
        result: []
    }]);

    assert.equal(await h.service.requestCode('unknown@example.com', 'RESET_PASSWORD'), null);

    assert.equal(h.mail.sent.length, 0);

    h.done();
});

test('resend cooldown does not generate a new challenge or mail', async() => {
    const h = harness([{
        match: /FROM users/,
        result: [user]
    }, {
        match: /DATE_SUB/,
        result: [{
            id: '10'
        }]
    }]);

    await h.service.requestCode(user.email, 'RESET_PASSWORD');

    assert.equal(h.mail.sent.length, 0);

    h.done();
});

test('middleware authentication constrains JWT algorithm and rejects old version', async() => {
    const h = harness([{
        match: /JOIN roles/,
        result: [{
            ...user,
            token_version: 4
        }]
    }]);

    h.jwt.verify = (token, secret, options) => {
        assert.deepEqual(options.algorithms, ['HS256']);

        assert.equal(options.issuer, settings.issuer);

        return {
            sub: '1',
            ver: 3
        };
    };

    await assert.rejects(h.service.authenticate('test'), {
        code: 'UNAUTHORIZED'
    });

    h.done();
});

test('locked account rejected even with a signed JWT', async() => {
    const h = harness([{
        match: /JOIN roles/,
        result: [{
            ...user,
            status: 'LOCKED'
        }]
    }]);

    await assert.rejects(h.service.authenticate('test'), {
        code: 'UNAUTHORIZED'
    });

    h.done();
});

test('logout revokes all login sessions', async() => {
    const h = harness([{
        match: /FROM users/,
        result: [user]
    }, {
        match: /token_version=token_version\+1/
    }]);

    await h.service.logout({
        id: '1',
        version: 3
    });

    assert.ok(h.calls.includes('commit'));

    h.done();
});

test('rate limiter refuses request above limit with Retry-After', () => {
    const limiter = rateLimit({
        limit: 1,
        windowMs: 60000
    });

    let nextCount = 0;

    const res = {
        locals: {
        },
        headers: {
        },
        setHeader(k, v) {
            this.headers[k] = v;
        },
        status(s) {
            this.statusCode = s;

            return this;
        },
        json(body) {
            this.body = body;

            return this;
        }
    };

    const req = {
        ip: '127.0.0.1'
    };

    limiter(req, res, () => nextCount++);

    limiter(req, res, () => nextCount++);

    assert.equal(nextCount, 1);

    assert.equal(res.statusCode, 429);

    assert.ok(res.headers['Retry-After']);
});

test('new registration uses customer role, saves hash and sends code only after commit', async() => {
    const h = harness([{
        match: /FROM users/,
        result: []
    }, {
        match: /code='customer'/,
        result: [{
            id: '3'
        }]
    }, {
        match: /INSERT INTO users/,
        params: p => {
            assert.equal(p[0], '3');

            assert.equal(p[2], 'new-hash');
        },
        result: {
            insertId: '1'
        }
    }, {
        match: /DATE_SUB/,
        result: []
    }, {
        match: /UPDATE auth_challenges/
    }, {
        match: /INSERT INTO auth_challenges/,
        params: p => assert.match(p[2], /^[a-f0-9]{64}$/),
        result: {
            insertId: '10'
        }
    }, {
        match: /UPDATE users SET password_hash/
    }]);

    h.mail.sendAuthCode = async(email, code, purpose) => {
        assert.ok(h.calls.includes('commit'));

        assert.equal(email, user.email);

        assert.match(code, /^\d{6}$/);

        assert.equal(purpose, 'REGISTER');
    };

    const result = await h.service.register({
        email: user.email,
        password: 'newPassword123',
        fullName: 'Demo',
        phone: null
    });

    assert.equal(result.requiresEmailVerification, true);

    h.done();
});

test('pending login does not sign token', async() => {
    const pending = {
        ...user,
        status: 'PENDING'
    };

    const h = harness([{
        match: /FROM users/,
        result: [pending]
    }, {
        match: /FROM users/,
        result: [pending]
    }]);

    h.jwt.sign = () => {
        throw new Error('Must not issue token');
    };

    await assert.rejects(h.service.login(user.email, 'password'), {
        code: 'EMAIL_NOT_VERIFIED'
    });

    h.done();
});

test('login signs expected subject/version and returns no password hash', async() => {
    const h = harness([{
        match: /FROM users/,
        result: [{
            ...user
        }]
    }, {
        match: /FROM users/,
        result: [{
            ...user
        }]
    }, {
        match: /FROM roles/,
        result: [{
            code: 'customer'
        }]
    }, {
        match: /last_login_at/
    }]);

    h.jwt.sign = (payload, secret, options) => {
        assert.equal(payload.ver, 3);

        assert.equal(options.subject, '1');

        assert.equal(options.algorithm, 'HS256');

        return 'token';
    };

    const result = await h.service.login(user.email, 'password');

    assert.equal(result.accessToken, 'token');

    assert.equal(result.user.password_hash, undefined);

    assert.equal(result.user.role, 'customer');

    h.done();
});
