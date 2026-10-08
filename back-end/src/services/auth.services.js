const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../configs/database.config');
const transporter = require('../configs/mailer.config');
const { getOtpEmailTemplate, getVerifyEmailTemplate } = require('../utils/mail.util');

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
    const verifyToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert user với trạng thái PENDING, lưu mã OTP và set hạn 10 phút bằng hàm của MySQL
    const [result] = await db.execute(
        `INSERT INTO users 
        (role_id, full_name, email, password_hash, phone, status, email_verify_token, email_verify_expires) 
        VALUES (?, ?, ?, ?, ?, 'PENDING', ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
        [roleId, full_name, email, hashedPassword, phone, verifyToken]
    );

    // Gửi email xác minh ngay sau khi lưu DB
    const mailOptions = {
        from: `"AgriFood Smart" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Xác minh tài khoản - AgriFood Smart',
        html: getVerifyEmailTemplate(verifyToken)
    };
    await transporter.sendMail(mailOptions);

    const [newUsers] = await db.execute(
        `SELECT u.id, u.full_name, u.email, u.phone, r.code AS role_code, u.status, u.created_at 
         FROM users u JOIN roles r ON u.role_id = r.id 
         WHERE u.id = ?`,
        [result.insertId]
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
    if (!user.email_verify_token || user.email_verify_token !== otp) throw new Error('INVALID_OTP');

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

    return true;
};

const loginUser = async (email, password) => {
    // 1. Tìm user theo email (Phải JOIN bảng roles để lấy mã quyền)
    const [users] = await db.execute(
        `SELECT u.*, r.code AS role_code 
         FROM users u JOIN roles r ON u.role_id = r.id 
         WHERE u.email = ?`,
        [email]
    );

    if (users.length === 0) throw new Error('INVALID_CREDENTIALS');

    const user = users[0];

    // Kiểm tra tài khoản có bị khóa hay chưa active không
    if (user.status === 'LOCKED') throw new Error('ACCOUNT_LOCKED');
    if (user.status === 'PENDING') throw new Error('ACCOUNT_UNVERIFIED');

    // 2. So sánh mật khẩu (Đổi thành password_hash)
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Error('INVALID_CREDENTIALS');
    }

    // 3. Tạo payload và ký JWT
    const payload = {
        userId: user.id.toString(),
        role: user.role_code
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });

    // 4. Xóa thuộc tính password_hash trước khi trả data ra ngoài
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

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await db.execute(
        'UPDATE users SET password_reset_token = ?, password_reset_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE email = ?',
        [otpCode, email]
    );

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

    if (!user.password_reset_token || user.password_reset_token !== otp) {
        throw new Error('INVALID_OTP');
    }

    const now = new Date();
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
};

module.exports = {
    registerUser,
    loginUser,
    requestPasswordReset,
    verifyResetOtp,
    resetPassword,
    verifyEmailAccount
};