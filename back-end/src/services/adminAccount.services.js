const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { STAFF_PERMISSIONS } = require('../utils/permissions.util');
const { normalizeSearch } = require('../utils/string.util');

const userDto = (user) => ({
    id: user._id.toString(),
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    permissions: user.permissions,
    updated_at: user.updated_at
});

const getAccounts = async (filters, pagination) => {
    const query = {};
    if (filters.role) {
        if (!['ADMIN', 'STAFF', 'CUSTOMER'].includes(filters.role)) throw new Error('INVALID_DATA');
        query.role = filters.role;
    }
    if (filters.status) {
        if (!['ACTIVE', 'PENDING', 'LOCKED'].includes(filters.status)) throw new Error('INVALID_DATA');
        query.status = filters.status;
    }
    const users = await User.find(query).select('full_name email phone role status permissions updated_at').sort({ created_at: -1 }).lean();
    const keyword = normalizeSearch(filters.keyword || '');
    const matched = users.filter(
        (user) => !keyword || normalizeSearch(user.full_name + ' ' + user.email + ' ' + (user.phone || '')).includes(keyword)
    );
    return { items: matched.slice(pagination.offset, pagination.offset + pagination.pageSize).map(userDto), totalElements: matched.length };
};

const getAccount = async (id) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const user = await User.findById(id).select('full_name email phone role status permissions updated_at').lean();
    if (!user) throw new Error('RESOURCE_NOT_FOUND');
    return userDto(user);
};

const validateAssignments = async (data) => {
    if (
        !Array.isArray(data.permissions) ||
        data.permissions.some((value) => !STAFF_PERMISSIONS.some((permission) => permission.code === value)) ||
        new Set(data.permissions).size !== data.permissions.length
    )
        throw new Error('INVALID_DATA');
};

const createStaff = async (data) => {
    if (
        typeof data.full_name !== 'string' ||
        !data.full_name.trim() ||
        data.full_name.length > 150 ||
        typeof data.email !== 'string' ||
        data.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
    )
        throw new Error('INVALID_DATA');
    if (
        typeof data.password !== 'string' ||
        data.password.trim().length < 8 ||
        Buffer.byteLength(data.password, 'utf8') > 72 ||
        (data.phone && (typeof data.phone !== 'string' || !/^(0|\+84)[35789]\d{8}$/.test(data.phone)))
    )
        throw new Error('INVALID_DATA');
    const assignments = { permissions: data.permissions || [] };
    await validateAssignments(assignments);
    const user = await User.create({
        email: data.email.trim().toLowerCase(),
        full_name: data.full_name.trim(),
        phone: data.phone || null,
        password_hash: await bcrypt.hash(data.password, 10),
        role: 'STAFF',
        status: 'ACTIVE',
        email_verified_at: new Date(),
        ...assignments
    });
    return getAccount(user._id.toString());
};

const updateAccount = async (id, data) => {
    if (!mongoose.isObjectIdOrHexString(id)) throw new Error('RESOURCE_NOT_FOUND');
    const user = await User.findById(id).select('+token_version');
    if (!user) throw new Error('RESOURCE_NOT_FOUND');
    if (data.expected_updated_at && new Date(data.expected_updated_at).getTime() !== user.updated_at.getTime())
        throw new Error('VERSION_CONFLICT');
    if (
        typeof data.full_name !== 'string' ||
        !data.full_name.trim() ||
        data.full_name.length > 150 ||
        typeof data.email !== 'string' ||
        data.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) ||
        (data.phone && (typeof data.phone !== 'string' || !/^(0|\+84)[35789]\d{8}$/.test(data.phone)))
    )
        throw new Error('INVALID_DATA');
    const email = data.email.trim().toLowerCase();
    if (email !== user.email) {
        user.email = email;
        user.token_version += 1;
        user.email_verify_token = null;
        user.email_verify_expires = null;
        user.password_reset_token = null;
        user.password_reset_expires = null;
        // Đổi email bởi quản trị viên; tài khoản chưa xác minh vẫn phải xác minh email mới.
        if (user.email_verified_at) user.email_verified_at = new Date();
    }
    user.full_name = data.full_name.trim();
    user.phone = data.phone || null;
    await user.save();
    return getAccount(id);
};

const setAccountLock = async (id, data) => {
    if (!['LOCK', 'UNLOCK'].includes(data.action)) throw new Error('INVALID_DATA');
    const account = await getAccount(id);
    if (account.role === 'ADMIN') throw new Error('ADMIN_PROTECTED');
    const user = await User.findById(id).select('+token_version');
    if (data.expected_status !== user.status) throw new Error('VERSION_CONFLICT');
    if ((data.action === 'LOCK' && user.status === 'LOCKED') || (data.action === 'UNLOCK' && user.status !== 'LOCKED'))
        throw new Error('VERSION_CONFLICT');
    user.status = data.action === 'LOCK' ? 'LOCKED' : user.email_verified_at ? 'ACTIVE' : 'PENDING';
    user.token_version += 1;
    await user.save();
    return getAccount(id);
};

const savePermissions = async (id, data) => {
    await validateAssignments(data);
    const account = await getAccount(id);
    if (account.role !== 'STAFF') throw new Error('ADMIN_PROTECTED');
    if (typeof data.expected_updated_at !== 'string') throw new Error('INVALID_DATA');
    const user = await User.findOneAndUpdate(
        { _id: id, role: 'STAFF', updated_at: new Date(data.expected_updated_at) },
        {
            $set: { permissions: data.permissions },
            $inc: { __v: 1 }
        },
        { new: true, runValidators: true }
    );
    if (!user) throw new Error('VERSION_CONFLICT');
    return getAccount(id);
};

module.exports = { getAccounts, getAccount, createStaff, updateAccount, setAccountLock, savePermissions };
