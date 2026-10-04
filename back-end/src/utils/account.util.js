const AppError = require('./app-error.util');

const unauthorized = () => {
    return new AppError(
        'UNAUTHORIZED',
        401,
        'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.',
        'Your session is no longer valid. Please sign in again.'
    );
};

// Kiểm tra lại phiên đăng nhập khi bắt đầu giao dịch ghi dữ liệu.
const lockCurrentUser = async (connection, auth) => {
    const [users] = await connection.execute(
        `SELECT id, status, deleted_at, token_version
         FROM users
         WHERE id = ?
         FOR UPDATE`,
        [auth.id]
    );

    const user = users[0];

    if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.deleted_at ||
        Number(user.token_version) !== auth.version
    ) {
        throw unauthorized();
    }

    return user;
};

const withTransaction = async (database, work) => {
    const connection = await database.getConnection();

    try {
        await connection.beginTransaction();

        const result = await work(connection);

        await connection.commit();

        return result;
    } catch (error) {
        await connection.rollback();

        throw error;
    } finally {
        connection.release();
    }
};

// mysql2 đang trả DATETIME dưới dạng chuỗi; các giá trị trong DB được lưu UTC.
const toUtcIso = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    const normalized = String(value).replace(' ', 'T');

    return normalized.endsWith('Z') ? normalized : `${normalized}Z`;
};

module.exports = {
    unauthorized,
    lockCurrentUser,
    withTransaction,
    toUtcIso
};
