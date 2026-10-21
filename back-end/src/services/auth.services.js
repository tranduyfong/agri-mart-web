const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const transporter = require('../configs/mailer.config');
const { getOtpEmailTemplate, getVerifyEmailTemplate } = require('../utils/mail.util');
const { getProfile } = require('./account.services');

const sendOtp = async (email, otp, isVerifyEmail) => {
    await transporter.sendMail({
        from: '"AgriFood Smart" <' + process.env.EMAIL_USER + '>',
        to: email,
        subject: isVerifyEmail ? 'Xác minh tài khoản - AgriFood Smart' : 'Mã OTP khôi phục mật khẩu - AgriFood Smart',
        html: isVerifyEmail ? getVerifyEmailTemplate(otp) : getOtpEmailTemplate(otp)
    });
};

const registerUser = async ({ full_name, email, password, phone }) => {
    email = email.trim().toLowerCase();
    const conditions = [{ email }];
    if (phone) conditions.push({ phone });

    if (await User.exists({ $or: conditions })) throw new Error('USER_ALREADY_EXISTS');

    const otp = crypto.randomInt(100000, 1000000).toString();
    const user = await User.create({
        full_name,
        email,
        password_hash: await bcrypt.hash(password, 10),
        phone: phone || null,
        email_verify_token: otp,
        email_verify_expires: new Date(Date.now() + 10 * 60 * 1000)
    });

    try {
        await sendOtp(email, otp, true);
    } catch (error) {
        await User.deleteOne({ _id: user._id, status: 'PENDING', email_verify_token: otp });
        throw error;
    }

    return getProfile(user._id);
};

const loginUser = async (email, password) => {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password_hash +token_version');

    if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new Error('INVALID_CREDENTIALS');
    if (user.status === 'LOCKED') throw new Error('ACCOUNT_LOCKED');
    if (user.status === 'PENDING') throw new Error('ACCOUNT_UNVERIFIED');

    const accessToken = jwt.sign(
        { userId: user._id.toString(), role: user.role, tokenVersion: user.token_version },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return { user: await getProfile(user._id), accessToken };
};

const verifyEmailAccount = async (email, otp) => {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
        '+email_verify_token +email_verify_expires +email_verify_attempts'
    );

    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.status === 'ACTIVE') throw new Error('ALREADY_VERIFIED');
    if (user.status === 'LOCKED') throw new Error('ACCOUNT_LOCKED');
    if (!user.email_verify_token) throw new Error('INVALID_OTP');
    if (!user.email_verify_expires || user.email_verify_expires < new Date()) throw new Error('OTP_EXPIRED');

    if (user.email_verify_token !== String(otp)) {
        user.email_verify_attempts += 1;
        if (user.email_verify_attempts >= 5) {
            user.email_verify_token = null;
            user.email_verify_expires = null;
        }
        await user.save();
        throw new Error(user.email_verify_attempts >= 5 ? 'OTP_TOO_MANY_ATTEMPTS' : 'INVALID_OTP');
    }

    user.status = 'ACTIVE';
    user.email_verified_at = new Date();
    user.email_verify_token = null;
    user.email_verify_expires = null;
    user.email_verify_attempts = 0;
    await user.save();
};

const resendVerifyEmail = async (email) => {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.status === 'ACTIVE') throw new Error('ALREADY_VERIFIED');
    if (user.status === 'LOCKED') throw new Error('ACCOUNT_LOCKED');

    const otp = crypto.randomInt(100000, 1000000).toString();
    await sendOtp(user.email, otp, true);

    user.email_verify_token = otp;
    user.email_verify_expires = new Date(Date.now() + 10 * 60 * 1000);
    user.email_verify_attempts = 0;
    await user.save();
};

const requestPasswordReset = async (email) => {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.status === 'LOCKED') throw new Error('ACCOUNT_LOCKED');

    const otp = crypto.randomInt(100000, 1000000).toString();
    await sendOtp(user.email, otp, false);

    user.password_reset_token = otp;
    user.password_reset_expires = new Date(Date.now() + 10 * 60 * 1000);
    user.password_reset_attempts = 0;
    await user.save();
};

const verifyResetOtp = async (email, otp) => {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
        '+password_reset_token +password_reset_expires +password_reset_attempts +token_version'
    );

    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.status === 'LOCKED') throw new Error('ACCOUNT_LOCKED');
    if (!user.password_reset_token) throw new Error('INVALID_OTP');
    if (!user.password_reset_expires || user.password_reset_expires < new Date()) throw new Error('OTP_EXPIRED');

    if (user.password_reset_token !== String(otp)) {
        user.password_reset_attempts += 1;
        if (user.password_reset_attempts >= 5) {
            user.password_reset_token = null;
            user.password_reset_expires = null;
        }
        await user.save();
        throw new Error(user.password_reset_attempts >= 5 ? 'OTP_TOO_MANY_ATTEMPTS' : 'INVALID_OTP');
    }

    return user;
};

const resetPassword = async (email, otp, newPassword) => {
    const user = await verifyResetOtp(email, otp);
    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.token_version += 1;
    user.password_reset_token = null;
    user.password_reset_expires = null;
    user.password_reset_attempts = 0;
    await user.save();
};

module.exports = {
    registerUser,
    loginUser,
    verifyEmailAccount,
    resendVerifyEmail,
    requestPasswordReset,
    verifyResetOtp,
    resetPassword
};
