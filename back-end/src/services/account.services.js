const bcrypt = require('bcryptjs');
const User = require('../models/user');
const addressService = require('./address.services');

const getProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    return {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        role: user.role,
        role_code: user.role,
        permissions: user.permissions,
        status: user.status,
        created_at: user.created_at
    };
};

const updateProfile = async (userId, { full_name, phone }) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    if (phone && (await User.exists({ phone, _id: { $ne: userId } }))) {
        throw new Error('PHONE_ALREADY_EXISTS');
    }

    user.full_name = full_name;
    user.phone = phone || null;
    await user.save();

    return getProfile(userId);
};

const getAddresses = async (userId) => {
    const user = await User.findById(userId).select('addresses');
    if (!user) throw new Error('USER_NOT_FOUND');

    return user.addresses
        .map((address) => ({
            id: address._id.toString(),
            recipient_name: address.recipient_name,
            phone: address.phone,
            province_code: address.province_code,
            province_name: address.province_name,
            ward_code: address.ward_code,
            ward_name: address.ward_name,
            hamlet: address.hamlet,
            street_address: address.street_address,
            address_line: address.address_line,
            is_default: address.is_default ? 1 : 0
        }))
        .sort((a, b) => b.is_default - a.is_default);
};

const getDefaultAddress = async (userId) => {
    const addresses = await getAddresses(userId);
    return addresses.find((address) => address.is_default) || null;
};

const saveAddress = async (userId, addressId, data) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    let address = addressId ? user.addresses.id(addressId) : null;
    if (addressId && !address) throw new Error('ADDRESS_NOT_FOUND');

    const location = await addressService.resolveAddress(data);

    if (!address) {
        user.addresses.push({ recipient_name: data.recipient_name, phone: data.phone, ...location });
        address = user.addresses[user.addresses.length - 1];
    } else {
        Object.assign(address, { recipient_name: data.recipient_name, phone: data.phone, ...location });
    }

    if (data.is_default || !user.addresses.some((item) => item.is_default)) {
        for (const item of user.addresses) {
            item.is_default = item._id.equals(address._id);
        }
    }

    await user.save();
    return getAddresses(userId);
};

const setDefaultAddress = async (userId, addressId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    if (!user.addresses.id(addressId)) throw new Error('ADDRESS_NOT_FOUND');

    for (const address of user.addresses) {
        address.is_default = address._id.toString() === addressId;
    }

    await user.save();
    return getAddresses(userId);
};

const removeAddress = async (userId, addressId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const address = user.addresses.id(addressId);
    if (!address) throw new Error('ADDRESS_NOT_FOUND');
    address.deleteOne();

    if (user.addresses.length && !user.addresses.some((item) => item.is_default)) {
        user.addresses[0].is_default = true;
    }

    await user.save();
    return getAddresses(userId);
};

const changePassword = async (userId, tokenVersion, currentPassword, newPassword) => {
    const user = await User.findById(userId).select('+password_hash +token_version');
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.token_version !== tokenVersion) throw new Error('SESSION_REVOKED');
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) throw new Error('WRONG_CURRENT_PASSWORD');
    if (await bcrypt.compare(newPassword, user.password_hash)) throw new Error('PASSWORD_UNCHANGED');

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.token_version += 1;
    user.password_reset_token = null;
    user.password_reset_expires = null;
    user.password_reset_attempts = 0;
    await user.save();
};

module.exports = {
    getProfile,
    updateProfile,
    getAddresses,
    getDefaultAddress,
    saveAddress,
    setDefaultAddress,
    removeAddress,
    changePassword
};
