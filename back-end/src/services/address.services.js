const AppError = require('../utils/app-error.util');
const { lockCurrentUser, withTransaction, toUtcIso } = require('../utils/account.util');

const MAX_ADDRESSES = 20;

const addressColumns = {
    label: 'label',
    recipientName: 'recipient_name',
    recipientPhone: 'recipient_phone',
    provinceCode: 'province_code',
    provinceName: 'province_name',
    wardCode: 'ward_code',
    wardName: 'ward_name',
    districtName: 'district_name',
    addressLine: 'address_line',
    latitude: 'latitude',
    longitude: 'longitude'
};

const notFound = () => new AppError(
    'RESOURCE_NOT_FOUND',
    404,
    'Không tìm thấy địa chỉ.',
    'Address not found.'
);

const mapAddress = (address) => ({
    id: String(address.id),
    label: address.label,
    recipientName: address.recipient_name,
    recipientPhone: address.recipient_phone,
    provinceCode: address.province_code,
    provinceName: address.province_name,
    wardCode: address.ward_code,
    wardName: address.ward_name,
    districtName: address.district_name,
    addressLine: address.address_line,
    latitude: address.latitude == null ? null : String(address.latitude),
    longitude: address.longitude == null ? null : String(address.longitude),
    isDefault: Number(address.is_default) === 1,
    createdAt: toUtcIso(address.created_at),
    updatedAt: toUtcIso(address.updated_at)
});

const findOwnedAddress = async (connection, userId, addressId) => {
    const [addresses] = await connection.execute(
        `SELECT * FROM user_addresses
         WHERE id = ? AND user_id = ? AND deleted_at IS NULL
         FOR UPDATE`,
        [addressId, userId]
    );

    if (!addresses[0]) {
        throw notFound();
    }

    return addresses[0];
};

const clearDefaultAddress = async (connection, userId) => {
    await connection.execute(
        `UPDATE user_addresses
         SET is_default = 0
         WHERE user_id = ? AND deleted_at IS NULL AND is_default = 1`,
        [userId]
    );
};

const createAddressService = (database) => {
    const getAddresses = async (auth) => {
        // Cùng khóa user với các thao tác ghi để danh sách là một trạng thái nhất quán.
        return withTransaction(database, async (connection) => {
            await lockCurrentUser(connection, auth);

            const [addresses] = await connection.execute(
                `SELECT * FROM user_addresses
                 WHERE user_id = ? AND deleted_at IS NULL
                 ORDER BY is_default DESC, id ASC`,
                [auth.id]
            );

            return addresses.map(mapAddress);
        });
    };

    const getAddress = async (auth, addressId) => {
        return withTransaction(database, async (connection) => {
            await lockCurrentUser(connection, auth);

            const address = await findOwnedAddress(connection, auth.id, addressId);

            return mapAddress(address);
        });
    };

    const createAddress = async (auth, input) => {
        return withTransaction(database, async (connection) => {
            // Luôn khóa user trước. Hai yêu cầu thêm/đổi mặc định không chạy chồng nhau.
            await lockCurrentUser(connection, auth);

            const [currentAddresses] = await connection.execute(
                `SELECT id, is_default FROM user_addresses
                 WHERE user_id = ? AND deleted_at IS NULL
                 ORDER BY id ASC FOR UPDATE`,
                [auth.id]
            );

            if (currentAddresses.length >= MAX_ADDRESSES) {
                throw new AppError(
                    'ADDRESS_LIMIT_REACHED',
                    409,
                    `Mỗi tài khoản được lưu tối đa ${MAX_ADDRESSES} địa chỉ.`,
                    `An account can store at most ${MAX_ADDRESSES} addresses.`
                );
            }

            const hasDefault = currentAddresses.some((address) => Number(address.is_default) === 1);
            const isDefault = input.isDefault === true || !hasDefault;

            if (isDefault) {
                await clearDefaultAddress(connection, auth.id);
            }

            const fields = Object.keys(addressColumns);
            const values = fields.map((field) => input[field] ?? null);
            const names = fields.map((field) => `\`${addressColumns[field]}\``);
            const placeholders = fields.map(() => '?').join(', ');

            const [result] = await connection.execute(
                `INSERT INTO user_addresses (user_id, ${names.join(', ')}, is_default)
                 VALUES (?, ${placeholders}, ?)`,
                [auth.id, ...values, isDefault ? 1 : 0]
            );

            const address = await findOwnedAddress(connection, auth.id, String(result.insertId));

            return mapAddress(address);
        });
    };

    const updateAddress = async (auth, addressId, input) => {
        return withTransaction(database, async (connection) => {
            await lockCurrentUser(connection, auth);
            await findOwnedAddress(connection, auth.id, addressId);

            const fields = Object.keys(input);
            const assignments = fields.map((field) => `\`${addressColumns[field]}\` = ?`);
            const values = fields.map((field) => input[field]);

            await connection.execute(
                `UPDATE user_addresses SET ${assignments.join(', ')}
                 WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
                [...values, addressId, auth.id]
            );

            const address = await findOwnedAddress(connection, auth.id, addressId);

            return mapAddress(address);
        });
    };

    const setDefaultAddress = async (auth, addressId) => {
        return withTransaction(database, async (connection) => {
            await lockCurrentUser(connection, auth);

            const address = await findOwnedAddress(connection, auth.id, addressId);

            if (Number(address.is_default) !== 1) {
                await clearDefaultAddress(connection, auth.id);

                await connection.execute(
                    `UPDATE user_addresses SET is_default = 1
                     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
                    [addressId, auth.id]
                );
            }

            const updatedAddress = await findOwnedAddress(connection, auth.id, addressId);

            return mapAddress(updatedAddress);
        });
    };

    const deleteAddress = async (auth, addressId) => {
        return withTransaction(database, async (connection) => {
            await lockCurrentUser(connection, auth);

            const address = await findOwnedAddress(connection, auth.id, addressId);

            // Xóa mềm giữ FK và không thay đổi địa chỉ snapshot của đơn hàng cũ.
            await connection.execute(
                `UPDATE user_addresses
                 SET deleted_at = UTC_TIMESTAMP(3), is_default = 0
                 WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
                [addressId, auth.id]
            );

            let defaultAddressId = null;

            if (Number(address.is_default) === 1) {
                const [remainingAddresses] = await connection.execute(
                    `SELECT id FROM user_addresses
                     WHERE user_id = ? AND deleted_at IS NULL
                     ORDER BY id ASC LIMIT 1 FOR UPDATE`,
                    [auth.id]
                );

                if (remainingAddresses[0]) {
                    defaultAddressId = String(remainingAddresses[0].id);

                    await connection.execute(
                        `UPDATE user_addresses SET is_default = 1
                         WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
                        [defaultAddressId, auth.id]
                    );
                }
            } else {
                const [defaults] = await connection.execute(
                    `SELECT id FROM user_addresses
                     WHERE user_id = ? AND is_default = 1 AND deleted_at IS NULL`,
                    [auth.id]
                );

                defaultAddressId = defaults[0] ? String(defaults[0].id) : null;
            }

            return {
                deletedId: addressId,
                defaultAddressId
            };
        });
    };

    return {
        getAddresses,
        getAddress,
        createAddress,
        updateAddress,
        setDefaultAddress,
        deleteAddress
    };
};

let service;

const getAddressService = () => {
    if (!service) {
        service = createAddressService(require('../configs/database.config'));
    }

    return service;
};

module.exports = {
    createAddressService,
    getAddressService
};
