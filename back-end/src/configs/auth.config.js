module.exports = () => {
    const secret = process.env.JWT_SECRET || '';
    if (Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
    if (!/^[1-9]\d*(s|m|h|d)$/.test(expiresIn)) throw new Error('JWT_EXPIRES_IN must include a unit, e.g. 1d');
    const otpSecret = process.env.OTP_SECRET || secret;
    if (Buffer.byteLength(otpSecret) < 32) throw new Error('OTP_SECRET must contain at least 32 bytes');
    return { secret, otpSecret, expiresIn, issuer: 'grocery-backend', audience: 'grocery-web', otpMinutes: 10, resetMinutes: 10, cooldownSeconds: 60, bcryptRounds: 12 };
};
