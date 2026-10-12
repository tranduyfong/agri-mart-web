const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../configs/database.config');
const transporter = require('../configs/mailer.config');
const { getOtpEmailTemplate, getVerifyEmailTemplate } = require('../utils/mail.util');

// Số lần được phép nhập sai OTP, quá số lần này thì OTP bị hủy, người dùng phải yêu cầu mã mới
const MAX_OTP_ATTEMPTS = 5;

// Đếm số lần nhập sai OTP theo từng email (lưu tạm trên RAM)
// VD: { 'verify:a@gmail.com': 2, 'reset:b@gmail.com': 1 }
const otpFailedAttempts = {};

// Sinh mã OTP 6 số (dùng crypto để mã khó đoán hơn Math.random)
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

// Ghi nhận 1 lần nhập sai OTP, nếu sai quá số lần cho phép thì xóa luôn OTP trong DB
const handleWrongOtp = async (key, clearOtpQuery, email) => {
    otpFailedAttempts[key] = (otpFailedAttempts[key] || 0) + 1;

    if (otpFailedAttempts[key] >= MAX_OTP_ATTEMPTS) {
        delete otpFailedAttempts[key];
        await db.execute(clearOtpQuery, [email]);
        throw new Error('OTP_TOO_MANY_ATTEMPTS');
    }

    throw new Error('INVALID_OTP');
};

const sendVerifyEmail = async (email, otpCode) => {
    const mailOptions = {
        from: `"AgriFood Smart" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Xác minh tài khoản - AgriFood Smart',
        html: getVerifyEmailTemplate(otpCode)
    };
    await transporter.sendMail(mailOptions);
};

const registerUser = async (data) => {
    const { full_name, email, password, phone } = data;

    const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE email = ? OR phone = ?',
        [email, phone]
    );

    if (existingUsers.length > 0) {
        throw new Error('USER_ALREADY_EXISTS');
    }

    const [roles] = await db.execute('SELECT id FROM roles WHERE code = ?', ['CUSTOMER']);
    if (roles.length === 0) throw new Error('ROLE_NOT_FOUND');
    const roleId = roles[0].id;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Sinh mã OTP xác minh email 6 số
    const verifyToken = generateOtp();

    // Dùng transaction: nếu gửi email bị lỗi thì hủy luôn việc tạo tài khoản,
    // tránh trường hợp user bị lưu vào DB nhưng không nhận được mã và không thể đăng ký lại
    const connection = await db.getConnection();
    await connection.beginTransaction();

    let userId;
    try {
        // Insert user với trạng thái PENDING, lưu mã OTP và set hạn 10 phút bằng hàm của MySQL
        const [result] = await connection.execute(
            `INSERT INTO users
            (role_id, full_name, email, password_hash, phone, status, email_verify_token, email_verify_expires)
            VALUES (?, ?, ?, ?, ?, 'PENDING', ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
            [roleId, full_name, email, hashedPassword, phone, verifyToken]
        );
        userId = result.insertId;

        // Gửi email xác minh, gửi thành công mới commit
        await sendVerifyEmail(email, verifyToken);

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    const [newUsers] = await db.execute(
        `SELECT u.id, u.full_name, u.email, u.phone, r.code AS role_code, u.status, u.created_at
         FROM users u JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [userId]
    );

    return newUsers[0];
};

const verifyEmailAccount = async (email, otp) => {
    const [users] = await db.execute(
        'SELECT id, status, email_verify_token, email_verify_expires, NOW() as current_db_time FROM users WHERE email = ?',
        [email]
    );

    if (users.length === 0) throw new Error('USER_NOT_FOUND');

    const user = users[0];

    if (user.status === 'ACTIVE') throw new Error('ALREADY_VERIFIED');
    if (!user.email_verify_token) throw new Error('INVALID_OTP');

    // Ép otp về chuỗi để so sánh (phòng trường hợp client gửi lên dạng số)
    if (user.email_verify_token !== String(otp)) {
        await handleWrongOtp(
            'verify:' + email,
            'UPDATE users SET email_verify_token = NULL, email_verify_expires = NULL WHERE email = ?',
            email
        );
    }

    const now = new Date(user.current_db_time);
    const expiresAt = new Date(user.email_verify_expires);

    if (now > expiresAt) throw new Error('OTP_EXPIRED');

    // Cập nhật trạng thái thành ACTIVE, ghi nhận thời gian xác minh và xóa token
    await db.execute(
        `UPDATE users
         SET status = 'ACTIVE', email_verified_at = NOW(), email_verify_token = NULL, email_verify_expires = NULL
         WHERE email = ?`,
        [email]
    );
    delete otpFailedAttempts['verify:' + email];

    return true;
};

const resendVerifyEmail = async (email) => {
    const [users] = await db.execute('SELECT id, status FROM users WHERE email = ?', [email]);

    if (users.length === 0) throw new Error('USER_NOT_FOUND');
    if (users[0].status !== 'PENDING') throw new Error('ALREADY_VERIFIED');

    // Sinh mã mới, mã cũ sẽ bị ghi đè nên không dùng được nữa
    const verifyToken = generateOtp();
    await db.execute(
        'UPDATE users SET email_verify_token = ?, email_verify_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE email = ?',
        [verifyToken, email]
    );
    delete otpFailedAttempts['verify:' + email];

    await sendVerifyEmail(email, verifyToken);
};

const loginUser = async (email, password) => {
    // 1. Tìm user theo email (Phải JOIN bảng roles để lấy mã quyền)
    // Chỉ SELECT các cột cần thiết, không lấy các cột OTP/token để tránh lộ ra ngoài
    const [users] = await db.execute(
        `SELECT u.id, u.full_name, u.email, u.phone, u.status, u.avatar_file_id, u.created_at,
                u.password_hash, r.code AS role_code
         FROM users u JOIN roles r ON u.role_id = r.id
         WHERE u.email = ?`,
        [email]
    );

    if (users.length === 0) throw new Error('INVALID_CREDENTIALS');

    const user = users[0];

    // 2. So sánh mật khẩu trước, để người không biết mật khẩu không biết được trạng thái tài khoản
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Error('INVALID_CREDENTIALS');
    }

    // 3. Kiểm tra tài khoản có bị khóa hay chưa active không
    if (user.status === 'LOCKED') throw new Error('ACCOUNT_LOCKED');
    if (user.status === 'PENDING') throw new Error('ACCOUNT_UNVERIFIED');

    // 4. Tạo payload và ký JWT
    const payload = {
        userId: user.id.toString(),
        role: user.role_code
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });

    // 5. Xóa thuộc tính password_hash trước khi trả data ra ngoài
    delete user.password_hash;

    return {
        user,
        accessToken: token
    };
};

const requestPasswordReset = async (email) => {
    const [users] = await db.execute('SELECT id, full_name FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
        throw new Error('USER_NOT_FOUND');
    }

    const otpCode = generateOtp();
    await db.execute(
        'UPDATE users SET password_reset_token = ?, password_reset_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE email = ?',
        [otpCode, email]
    );
    delete otpFailedAttempts['reset:' + email];

    const mailOptions = {
        from: `"AgriFood Smart" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Mã OTP khôi phục mật khẩu - AgriFood Smart',
        html: getOtpEmailTemplate(otpCode)
    };

    await transporter.sendMail(mailOptions);
};

const verifyResetOtp = async (email, otp) => {
    const [users] = await db.execute(
        'SELECT id, password_reset_token, password_reset_expires, NOW() as current_db_time FROM users WHERE email = ?',
        [email]
    );

    if (users.length === 0) throw new Error('USER_NOT_FOUND');

    const user = users[0];

    if (!user.password_reset_token) throw new Error('INVALID_OTP');

    if (user.password_reset_token !== String(otp)) {
        await handleWrongOtp(
            'reset:' + email,
            'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE email = ?',
            email
        );
    }

    // Dùng giờ của DB để so sánh (giống verifyEmailAccount), tránh lệch múi giờ giữa server Node và MySQL
    const now = new Date(user.current_db_time);
    const expiresAt = new Date(user.password_reset_expires);

    if (now > expiresAt) {
        throw new Error('OTP_EXPIRED');
    }

    return true;
};

const resetPassword = async (email, otp, newPassword) => {
    await verifyResetOtp(email, otp);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.execute(
        'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE email = ?',
        [hashedPassword, email]
    );
    delete otpFailedAttempts['reset:' + email];
};

module.exports = {
    registerUser,
    loginUser,
    requestPasswordReset,
    verifyResetOtp,
    resetPassword,
    verifyEmailAccount,
    resendVerifyEmail
};
