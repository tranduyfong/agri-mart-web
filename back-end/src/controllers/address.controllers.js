const { getAddressService } = require('../services/address.services');
const { successResponse } = require('../utils/response.util');

const getAddresses = async (req, res, next) => {
    try {
        const result = await getAddressService().getAddresses(req.auth);
        const message = req.locale === 'en' ? 'Addresses retrieved.' : 'Lấy danh sách địa chỉ thành công.';

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const getAddress = async (req, res, next) => {
    try {
        const result = await getAddressService().getAddress(req.auth, req.addressId);
        const message = req.locale === 'en' ? 'Address details.' : 'Thông tin địa chỉ.';

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const createAddress = async (req, res, next) => {
    try {
        const result = await getAddressService().createAddress(req.auth, req.input);
        const message = req.locale === 'en' ? 'Address created.' : 'Đã thêm địa chỉ.';

        return successResponse(res, result, null, message, 201);
    } catch (error) {
        next(error);
    }
};

const updateAddress = async (req, res, next) => {
    try {
        const result = await getAddressService().updateAddress(req.auth, req.addressId, req.input);
        const message = req.locale === 'en' ? 'Address updated.' : 'Đã cập nhật địa chỉ.';

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const setDefaultAddress = async (req, res, next) => {
    try {
        const result = await getAddressService().setDefaultAddress(req.auth, req.addressId);
        const message = req.locale === 'en' ? 'Default address updated.' : 'Đã chọn địa chỉ mặc định.';

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

const deleteAddress = async (req, res, next) => {
    try {
        const result = await getAddressService().deleteAddress(req.auth, req.addressId);
        const message = req.locale === 'en' ? 'Address deleted.' : 'Đã xóa địa chỉ.';

        return successResponse(res, result, null, message, 200);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAddresses,
    getAddress,
    createAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress
};
