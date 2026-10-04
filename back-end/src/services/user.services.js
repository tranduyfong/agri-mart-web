const { unauthorized, lockCurrentUser, withTransaction, toUtcIso } = require('../utils/account.util');

const profileQuery = `
    SELECT u.id, u.email, u.full_name, u.phone, u.birthday,
           u.status, u.avatar_file_id, u.preferred_payment_method,
           u.email_verified_at, u.created_at, u.updated_at,
           r.code AS role_code
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ?
      AND u.status = 'ACTIVE'
      AND u.deleted_at IS NULL
      AND u.token_version = ?
`;

const mapProfile = (user) => ({
    id: String(user.id),
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    birthday: user.birthday,
    role: user.role_code,
    status: user.status,
    avatarFileId: user.avatar_file_id == null ? null : String(user.avatar_file_id),
    preferredPaymentMethod: user.preferred_payment_method,
    emailVerifiedAt: toUtcIso(user.email_verified_at),
    createdAt: toUtcIso(user.created_at),
    updatedAt: toUtcIso(user.updated_at)
});

const createUserService = (database) => {
    const getProfile = async (auth) => {
        const [users] = await database.execute(profileQuery, [auth.id, auth.version]);

        if (!users[0]) {
            throw unauthorized();
        }

        return mapProfile(users[0]);
    };

    const updateProfile = async (auth, input) => {
        // Tên cột luôn lấy từ whitelist, không nhận từ nội dung SQL do client gửi.
        const columns = {
            fullName: 'full_name',
            phone: 'phone',
            birthday: 'birthday',
            preferredPaymentMethod: 'preferred_payment_method'
        };

        return withTransaction(database, async (connection) => {
            await lockCurrentUser(connection, auth);

            const fields = Object.keys(input);
            const assignments = fields.map((field) => `\`${columns[field]}\` = ?`);
            const values = fields.map((field) => input[field]);

            await connection.execute(
                `UPDATE users SET ${assignments.join(', ')} WHERE id = ?`,
                [...values, auth.id]
            );

            const [users] = await connection.execute(profileQuery, [auth.id, auth.version]);

            return mapProfile(users[0]);
        });
    };

    return {
        getProfile,
        updateProfile
    };
};

let service;

const getUserService = () => {
    if (!service) {
        service = createUserService(require('../configs/database.config'));
    }

    return service;
};

module.exports = {
    createUserService,
    getUserService
};
