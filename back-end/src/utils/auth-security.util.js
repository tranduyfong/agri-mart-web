const crypto = require('node:crypto');

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

const hashCode = (secret, userId, purpose, code) => crypto.createHmac('sha256', secret).update(`${userId}:${purpose}:${code}`).digest(
    'hex'
);

function matches(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = {
    hashToken,
    hashCode,
    matches,
    newCode: () => String(crypto.randomInt(0, 1000000)).padStart(6, '0'),
    newToken: () => crypto.randomBytes(32).toString('hex')
};
