const AppError = require('../utils/app-error.util');

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const invalid = (errors) => {
    return new AppError(
        'VALIDATION_FAILED',
        400,
        'Vui lòng kiểm tra lại dữ liệu gửi lên.',
        'Please check the submitted fields.',
        errors
    );
};

const assertBody = (body, fields) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw invalid([{ field: 'body', message: 'Body phải là một object JSON.' }]);
    }

    const unknown = Object.keys(body).filter((field) => !fields.includes(field));

    if (unknown.length > 0) {
        throw invalid(unknown.map((field) => ({
            field,
            message: 'Trường không được phép cập nhật qua API này / Field is not allowed.'
        })));
    }
};

const readText = (body, result, errors, field, maxLength, nullable = false) => {
    if (!hasOwn(body, field)) {
        return;
    }

    const value = body[field];

    if (value === null && nullable) {
        result[field] = null;
        return;
    }

    if (typeof value !== 'string') {
        errors.push({ field, message: 'Giá trị phải là chuỗi / Must be a string.' });
        return;
    }

    const text = value.trim();

    if (text.length === 0 && nullable) {
        result[field] = null;
        return;
    }

    if (text.length === 0 || text.length > maxLength || /[\u0000-\u001F\u007F]/.test(text)) {
        errors.push({ field, message: `Nội dung cần 1–${maxLength} ký tự hợp lệ / Invalid text.` });
        return;
    }

    result[field] = text;
};

const checkPhone = (value, field, errors) => {
    if (value != null && !/^\+?[0-9 ()-]{8,30}$/.test(value)) {
        errors.push({ field, message: 'Số điện thoại không hợp lệ / Invalid phone number.' });
    }
};

const isValidBirthday = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const today = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Ho_Chi_Minh'
    }).format(new Date());

    return year >= 1000 &&
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day &&
        value <= today;
};

const validateProfile = (body) => {
    const fields = ['fullName', 'phone', 'birthday', 'preferredPaymentMethod'];

    assertBody(body, fields);

    const result = {};
    const errors = [];

    readText(body, result, errors, 'fullName', 150);
    readText(body, result, errors, 'phone', 30, true);
    checkPhone(result.phone, 'phone', errors);

    if (hasOwn(body, 'birthday')) {
        if (body.birthday !== null && !isValidBirthday(body.birthday)) {
            errors.push(
                { field: 'birthday', message: 'Ngày sinh phải có thật, dạng YYYY-MM-DD và không ở tương lai.' }
            );
        } else {
            result.birthday = body.birthday;
        }
    }

    if (hasOwn(body, 'preferredPaymentMethod')) {
        const allowedMethods = [null, 'COD', 'VNPAY', 'MOMO'];

        if (!allowedMethods.includes(body.preferredPaymentMethod)) {
            errors.push({ field: 'preferredPaymentMethod', message: 'Phương thức không hợp lệ / Invalid method.' });
        } else {
            result.preferredPaymentMethod = body.preferredPaymentMethod;
        }
    }

    if (Object.keys(body).length === 0) {
        errors.push({ field: 'body', message: 'Cần ít nhất một trường để cập nhật / At least one field is required.' });
    }

    if (errors.length > 0) {
        throw invalid(errors);
    }

    return result;
};

const validateAddress = (body, creating) => {
    const requiredFields = ['recipientName', 'recipientPhone', 'provinceName', 'wardName', 'addressLine'];
    const optionalFields = ['label', 'provinceCode', 'wardCode', 'districtName', 'latitude', 'longitude'];
    const fields = [...requiredFields, ...optionalFields];

    if (creating) {
        fields.push('isDefault');
    }

    assertBody(body, fields);

    const result = {};
    const errors = [];

    if (creating) {
        for (const field of requiredFields) {
            if (!hasOwn(body, field)) {
                errors.push({ field, message: 'Trường bắt buộc / Required field.' });
            }
        }
    }

    readText(body, result, errors, 'recipientName', 150);
    readText(body, result, errors, 'recipientPhone', 30);
    readText(body, result, errors, 'provinceName', 150);
    readText(body, result, errors, 'wardName', 150);
    readText(body, result, errors, 'addressLine', 500);
    readText(body, result, errors, 'label', 80, true);
    readText(body, result, errors, 'provinceCode', 30, true);
    readText(body, result, errors, 'wardCode', 30, true);
    readText(body, result, errors, 'districtName', 150, true);

    checkPhone(result.recipientPhone, 'recipientPhone', errors);

    // Tọa độ phải đi theo cặp; không để vĩ độ mới đi với kinh độ cũ.
    const hasLatitude = hasOwn(body, 'latitude');
    const hasLongitude = hasOwn(body, 'longitude');

    if (hasLatitude !== hasLongitude) {
        errors.push({ field: 'latitude', message: 'Cần gửi latitude và longitude cùng nhau.' });
    } else if (hasLatitude) {
        if (body.latitude === null && body.longitude === null) {
            result.latitude = null;
            result.longitude = null;
        } else {
            for (const [field, maximum] of [['latitude', 90], ['longitude', 180]]) {
                const value = body[field];
                const text = typeof value === 'number' ? value.toFixed(7) : value;

                if (
                    (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) > maximum)) ||
                    typeof text !== 'string' ||
                    !/^-?\d{1,3}(\.\d{1,7})?$/.test(text) ||
                    !Number.isFinite(Number(text)) ||
                    Math.abs(Number(text)) > maximum
                ) {
                    errors.push({ field, message: 'Tọa độ không hợp lệ / Invalid coordinate.' });
                } else {
                    result[field] = Number(text).toFixed(7);
                }
            }
        }
    }

    if (creating && hasOwn(body, 'isDefault')) {
        if (typeof body.isDefault !== 'boolean') {
            errors.push({ field: 'isDefault', message: 'Phải là true hoặc false / Must be boolean.' });
        } else {
            result.isDefault = body.isDefault;
        }
    }

    if (!creating && Object.keys(body).length === 0) {
        errors.push({ field: 'body', message: 'Cần ít nhất một trường để cập nhật.' });
    }

    if (errors.length > 0) {
        throw invalid(errors);
    }

    return result;
};

const validateId = (value) => {
    if (
        typeof value !== 'string' ||
        !/^[1-9]\d{0,19}$/.test(value) ||
        BigInt(value) > 18446744073709551615n
    ) {
        throw invalid([{ field: 'id', message: 'ID địa chỉ không hợp lệ / Invalid address ID.' }]);
    }

    return value;
};

const profileBody = (req, res, next) => {
    try {
        req.input = validateProfile(req.body);
        next();
    } catch (error) {
        next(error);
    }
};

const addressBody = (creating) => (req, res, next) => {
    try {
        req.input = validateAddress(req.body, creating);
        next();
    } catch (error) {
        next(error);
    }
};

const addressId = (req, res, next) => {
    try {
        req.addressId = validateId(req.params.id);
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    profileBody,
    addressBody,
    addressId,
    validateProfile,
    validateAddress,
    validateId
};
