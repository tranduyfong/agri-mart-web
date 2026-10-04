const AppError = require('../utils/app-error.util');

const security = require('../utils/auth-security.util');

const createError = (code, status, vi, en) => new AppError(code, status, vi, en);

const badCode = () => createError(
    'INVALID_OR_EXPIRED_CODE',
    400,
    'Mã không hợp lệ, hết hạn hoặc đã sử dụng.',
    'Code is invalid, expired or already used.'
);

const badToken = () => createError(
    'INVALID_OR_EXPIRED_RESET_TOKEN',
    400,
    'Quyền đặt mật khẩu đã hết hạn hoặc không hợp lệ.',
    'Invalid or expired reset token.'
);

const unauthorized = () => createError('UNAUTHORIZED', 401, 'Phiên đăng nhập không hợp lệ.', 'Invalid session.');

const safeUser = user => ({
    id: String(user.id),
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    role: user.role_code,
    status: user.status,
    avatarFileId: user.avatar_file_id == null ? null : String(user.avatar_file_id)
});

// Injection enables meaningful transaction tests without real email or production DB.
function createService({
    db,
    bcrypt,
    jwt,
    mail,
    config
}) {
    const getConfig = () => config();

    async function runTransaction(work) {
        const connection = await db.getConnection();

        let committed = false;

        try {
            await connection.beginTransaction();

            const result = await work(connection);

            await connection.commit();

            committed = true;

            if (result instanceof AppError) {
                throw result;
            }

            return result;
        } catch (error) {
            if (!committed) {
                await connection.rollback();
            }

            throw error;
        } finally {
            connection.release();
        }
    }

    async function byEmail(connection, email) {
        const [rows] = await connection.execute('SELECT * FROM users WHERE email=? FOR UPDATE', [email]);

        return rows[0];
    }

    async function invalidate(connection, id) {
        await connection.execute(
            'UPDATE auth_challenges SET consumed_at=UTC_TIMESTAMP(3) WHERE user_id=? AND consumed_at IS NULL',
            [id]
        );
    }

    async function issue(connection, user, purpose) {
        const [recent] = await connection.execute(
            'SELECT id FROM auth_challenges WHERE user_id=? AND purpose=? AND created_at>DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 60 SECOND) ORDER BY id DESC LIMIT 1',
            [user.id, purpose]
        );

        if (recent.length) {
            return null;
        }

        await connection.execute(
            'UPDATE auth_challenges SET consumed_at=UTC_TIMESTAMP(3) WHERE user_id=? AND purpose=? AND consumed_at IS NULL',
            [user.id, purpose]
        );

        const code = security.newCode();

        const [result] = await connection.execute(
            'INSERT INTO auth_challenges (user_id,purpose,code_hash,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 10 MINUTE))',
            [user.id, purpose, security.hashCode(getConfig().otpSecret, user.id, purpose, code)]
        );

        return {
            challengeId: String(result.insertId),
            userId: String(user.id),
            email: user.email,
            purpose,
            code
        };
    }

    async function deliver(pending, concealFailure = false) {
        if (!pending) {
            return;
        }

        try {
            await mail.sendAuthCode(pending.email, pending.code, pending.purpose);
        } catch (error) {
            // Invalidate only this challenge; never consume a newer resend/reset session.
            await runTransaction(async connection => {
                await connection.execute('SELECT id FROM users WHERE id=? FOR UPDATE', [pending.userId]);

                await connection.execute(
                    'UPDATE auth_challenges SET consumed_at=UTC_TIMESTAMP(3) WHERE id=? AND consumed_at IS NULL',
                    [pending.challengeId]
                );
            });

            console.createError(JSON.stringify({
                event: 'auth_email_failed'
            }));

            if (!concealFailure) {
                throw createError(
                    'EMAIL_SEND_FAILED',
                    503,
                    'Chưa gửi được email. Chờ 60 giây rồi gửi lại mã.',
                    'Email could not be sent. Wait 60 seconds and request another code.'
                );
            }
        }
    }

    async function register(input) {
        const passwordHash = await bcrypt.hash(input.password, getConfig().bcryptRounds);

        let pending;

        try {
            pending = await runTransaction(async connection => {
                let user = await byEmail(connection, input.email);

                if (user && (user.status !== 'PENDING' || user.deleted_at)) {
                    throw createError(
                        'EMAIL_ALREADY_REGISTERED',
                        409,
                        'Email đã được đăng ký.',
                        'Email is already registered.'
                    );
                }

                if (!user) {
                    const [roles] = await connection.execute("SELECT id FROM roles WHERE code='customer' LIMIT 1");

                    if (!roles.length) {
                        throw createError(
                            'AUTH_NOT_CONFIGURED',
                            503,
                            'Chưa có vai trò customer. Chạy file khởi tạo vai trò.',
                            'Run the roles seed first.'
                        );
                    }

                    const [result] = await connection.execute(
                        "INSERT INTO users (role_id,email,password_hash,full_name,phone,status) VALUES (?,?,?,?,?,'PENDING')",
                        [roles[0].id, input.email, passwordHash, input.fullName, input.phone]
                    );

                    user = {
                        id: String(result.insertId),
                        email: input.email
                    };
                }

                const challenge = await issue(connection, user, 'REGISTER');

                if (!challenge) {
                    throw createError(
                        'OTP_COOLDOWN',
                        429,
                        'Chờ 60 giây trước khi yêu cầu mã mới.',
                        'Wait 60 seconds before requesting another code.'
                    );
                }

                // Pending re-registration updates credentials only together with a NEW code.
                await connection.execute(
                    'UPDATE users SET password_hash=?,full_name=?,phone=? WHERE id=?',
                    [passwordHash, input.fullName, input.phone, user.id]
                );

                return challenge;
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw createError(
                    'REGISTRATION_CONFLICT',
                    409,
                    'Yêu cầu đăng ký trùng. Vui lòng thử lại.',
                    'Concurrent registration; please retry.'
                );
            }

            throw error;
        }

        await deliver(pending);

        return {
            email: input.email,
            requiresEmailVerification: true
        };
    }

    async function requestCode(email, purpose) {
        const pending = await runTransaction(async connection => {
            const user = await byEmail(connection, email);

            if (!user || user.deleted_at || user.status !== (purpose === 'REGISTER' ? 'PENDING' : 'ACTIVE')) {
                return null;
            }

            return issue(connection, user, purpose);
        });

        // Generic success for unknown email, cooldown, locked account and SMTP failure.
        await deliver(pending, true);

        return null;
    }

    async function verify(email, code, purpose) {
        return runTransaction(async connection => {
            const user = await byEmail(connection, email);

            if (!user || user.deleted_at || user.status !== (purpose === 'REGISTER' ? 'PENDING' : 'ACTIVE')) {
                return badCode();
            }

            const [rows] = await connection.execute(
                'SELECT *,expires_at>UTC_TIMESTAMP(3) AS is_live FROM auth_challenges WHERE user_id=? AND purpose=? ORDER BY id DESC LIMIT 1 FOR UPDATE',
                [user.id, purpose]
            );

            const challenge = rows[0];

            if (!challenge || challenge.consumed_at || challenge.verified_at || !Number(challenge.is_live) || challenge.attempts >= challenge.max_attempts) {
                return badCode();
            }

            if (!security.matches(
                challenge.code_hash,
                security.hashCode(getConfig().otpSecret, user.id, purpose, code)
            )) {
                await connection.execute('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=?', [challenge.id]);

                return badCode();

                // Commit attempts even though HTTP outcome is 400.
            }

            if (purpose === 'REGISTER') {
                await connection.execute(
                    "UPDATE users SET status='ACTIVE',email_verified_at=UTC_TIMESTAMP(3) WHERE id=?",
                    [user.id]
                );

                await connection.execute(
                    'UPDATE auth_challenges SET verified_at=UTC_TIMESTAMP(3),consumed_at=UTC_TIMESTAMP(3) WHERE id=?',
                    [challenge.id]
                );

                return {
                    email: user.email,
                    verified: true
                };
            }

            const token = security.newToken();

            await connection.execute(
                'UPDATE auth_challenges SET verified_at=UTC_TIMESTAMP(3),reset_token_hash=?,reset_expires_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 10 MINUTE) WHERE id=?',
                [security.hashToken(token), challenge.id]
            );

            return {
                resetToken: token,
                expiresInSeconds: 600
            };
        });
    }

    async function reset(resetToken, newPassword) {
        const hashed = security.hashToken(resetToken);

        const [lookup] = await db.execute(
            'SELECT user_id FROM auth_challenges WHERE reset_token_hash=? LIMIT 1',
            [hashed]
        );

        if (!lookup.length) {
            throw badToken();
        }

        const newHash = await bcrypt.hash(newPassword, getConfig().bcryptRounds);

        return runTransaction(async connection => {
            const [users] = await connection.execute('SELECT * FROM users WHERE id=? FOR UPDATE', [lookup[0].user_id]);

            const user = users[0];

            if (!user || user.status !== 'ACTIVE' || user.deleted_at) {
                return badToken();
            }

            const [rows] = await connection.execute(
                "SELECT *,reset_expires_at>UTC_TIMESTAMP(3) AS is_live FROM auth_challenges WHERE user_id=? AND reset_token_hash=? AND purpose='RESET_PASSWORD' FOR UPDATE",
                [user.id, hashed]
            );

            const challenge = rows[0];

            if (!challenge || !challenge.verified_at || challenge.consumed_at || !Number(challenge.is_live)) {
                return badToken();
            }

            await connection.execute(
                'UPDATE users SET password_hash=?,token_version=token_version+1 WHERE id=?',
                [newHash, user.id]
            );

            await invalidate(connection, user.id);

            return null;
        });
    }

    async function login(email, password) {
        // Expensive bcrypt runs outside a row lock. Row is rechecked before issuing token.
        const [rows] = await db.execute('SELECT * FROM users WHERE email=?', [email]);

        const candidate = rows[0];

        const hash = candidate ? candidate.password_hash : await bcrypt.hash(
            'dummy-login-value',
            getConfig().bcryptRounds
        );

        if (!await bcrypt.compare(password, hash) || !candidate) {
            throw createError(
                'INVALID_CREDENTIALS',
                401,
                'Email hoặc mật khẩu không đúng.',
                'Incorrect email or password.'
            );
        }

        return runTransaction(async connection => {
            const user = await byEmail(connection, email);

            if (!user || user.password_hash !== hash || user.deleted_at || user.status === 'LOCKED' || user.status === 'DELETED') {
                return unauthorized();
            }

            if (user.status === 'PENDING') {
                return createError(
                    'EMAIL_NOT_VERIFIED',
                    403,
                    'Bạn cần xác minh email trước khi đăng nhập.',
                    'Verify your email before signing in.'
                );
            }

            if (user.status !== 'ACTIVE') {
                return unauthorized();
            }

            const [roles] = await connection.execute('SELECT code FROM roles WHERE id=?', [user.role_id]);

            user.role_code = roles[0]?.code;

            const settings = getConfig();

            const token = jwt.sign({
                ver: Number(user.token_version)
            }, settings.secret, {
                algorithm: 'HS256',
                subject: String(user.id),
                issuer: settings.issuer,
                audience: settings.audience,
                expiresIn: settings.expiresIn
            });

            await connection.execute('UPDATE users SET last_login_at=UTC_TIMESTAMP(3) WHERE id=?', [user.id]);

            return {
                accessToken: token,
                tokenType: 'Bearer',
                expiresIn: settings.expiresIn,
                user: safeUser(user)
            };
        });
    }

    async function authenticate(token) {
        let payload;

        const settings = getConfig();

        try {
            payload = jwt.verify(token, settings.secret, {
                algorithms: ['HS256'],
                issuer: settings.issuer,
                audience: settings.audience
            });
        } catch {
            throw unauthorized();
        }

        if (!payload || typeof payload.sub !== 'string' || !/^\d+$/.test(payload.sub) || !Number.isInteger(
            payload.ver
        )) {
            throw unauthorized();
        }

        const [rows] = await db.execute(
            'SELECT u.*,r.code AS role_code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?',
            [payload.sub]
        );

        const user = rows[0];

        if (!user || user.status !== 'ACTIVE' || user.deleted_at || Number(user.token_version) !== payload.ver) {
            throw unauthorized();
        }

        return {
            user: safeUser(user),
            id: String(user.id),
            version: payload.ver
        };
    }

    async function changePassword(auth, currentPassword, newPassword) {
        const nextHash = await bcrypt.hash(newPassword, getConfig().bcryptRounds);

        return runTransaction(async connection => {
            const [rows] = await connection.execute('SELECT * FROM users WHERE id=? FOR UPDATE', [auth.id]);

            const user = rows[0];

            if (!user || user.status !== 'ACTIVE' || user.deleted_at || Number(user.token_version) !== auth.version) {
                return unauthorized();
            }

            if (!await bcrypt.compare(currentPassword, user.password_hash)) {
                return createError(
                    'INVALID_CURRENT_PASSWORD',
                    400,
                    'Mật khẩu hiện tại không đúng.',
                    'Current password is incorrect.'
                );
            }

            await connection.execute(
                'UPDATE users SET password_hash=?,token_version=token_version+1 WHERE id=?',
                [nextHash, user.id]
            );

            await invalidate(connection, user.id);

            return null;
        });
    }

    async function logout(auth) {
        return runTransaction(async connection => {
            const [rows] = await connection.execute('SELECT * FROM users WHERE id=? FOR UPDATE', [auth.id]);

            const user = rows[0];

            if (!user || user.status !== 'ACTIVE' || user.deleted_at || Number(user.token_version) !== auth.version) {
                return unauthorized();
            }

            await connection.execute('UPDATE users SET token_version=token_version+1 WHERE id=?', [auth.id]);

            return null;
        });
    }

    return {
        register,
        requestCode,
        verify,
        reset,
        login,
        authenticate,
        changePassword,
        logout
    };
}

let instance;

function getService() {
    if (!instance) {
        instance = createService({
            db: require('../configs/database.config'),
            bcrypt: require('bcryptjs'),
            jwt: require('jsonwebtoken'),
            mail: require('../utils/mail.util'),
            config: require('../configs/auth.config')
        });
    }

    return instance;
}

module.exports = {
    createService,
    getService
};
