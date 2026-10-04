const AppError = require('../utils/app-error.util');

const definitions = {
    register: ['email', 'password', 'confirmPassword', 'fullName', 'phone'],
    resend: ['email'],
    forgot: ['email'],
    verify: ['email', 'code'],
    login: ['email', 'password'],
    reset: ['resetToken', 'newPassword', 'confirmPassword'],
    change: ['currentPassword', 'newPassword', 'confirmPassword']
};

function validate(kind, body) {
    const data = {
    },
    errors = [];

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new AppError('VALIDATION_FAILED', 400, 'Dữ liệu không hợp lệ.', 'Invalid request body.');
    }

    const add = (field, message) => errors.push({
        field,
        message
    });

    for (const key of definitions[kind]) {
        const v = body[key];

        if (key === 'phone' && (v === undefined || v === null || v === '')) {
            data.phone = null;

            continue;
        }

        if (typeof v !== 'string') {
            add(key, 'Trường này phải là chuỗi / Must be a string.');

            continue;
        }

        data[key] = ['email', 'fullName', 'phone'].includes(key) ? v.trim() : v;
    }

    if (data.email !== undefined) {
        data.email = data.email.toLowerCase();

        if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            add('email', 'Email không hợp lệ / Invalid email.');
        }
    }

    if (data.fullName !== undefined && (data.fullName.length < 2 || data.fullName.length > 150)) {
        add('fullName', 'Họ tên cần 2–150 ký tự / 2–150 characters required.');
    }

    if (data.phone !== undefined && data.phone !== null && !/^\+?[0-9 ()-]{8,30}$/.test(data.phone)) {
        add('phone', 'Số điện thoại không hợp lệ / Invalid phone.');
    }

    for (const key of['password', 'newPassword', 'currentPassword']) {
        if (data[key] !== undefined) {
            const min = (key === 'currentPassword' || kind === 'login') ? 1 : 8;

            if (data[key].length < min || Buffer.byteLength(data[key], 'utf8') > 72) {
                add(key, `Mật khẩu cần ít nhất ${min} ký tự, tối đa 72 byte UTF-8 / Invalid password length.`);
            }
        }

        if (data.confirmPassword !== undefined && data.confirmPassword !== (data.newPassword ?? data.password)) {
            add('confirmPassword', 'Mật khẩu nhập lại không khớp / Passwords do not match.');
        }

        if (data.code !== undefined && !/^\d{6}$/.test(data.code)) {
            add('code', 'Mã phải gồm 6 chữ số / Code must contain 6 digits.');
        }

        if (data.resetToken !== undefined && !/^[a-f0-9]{64}$/.test(data.resetToken)) {
            add('resetToken', 'Token không hợp lệ / Invalid token.');
        }

        if (errors.length) {
            throw new AppError(
                'VALIDATION_FAILED',
                400,
                'Kiểm tra lại các trường dữ liệu.',
                'Please check the input fields.',
                errors
            );
        }

        return data;
    }
}

module.exports = kind => (req, res, next) => {
    try {
        req.input = validate(kind, req.body);

        next();
    } catch (e) {
        next(e);
    }
};

module.exports.validate = validate;
