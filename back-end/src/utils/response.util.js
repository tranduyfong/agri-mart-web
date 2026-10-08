const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

/**
 * Lấy thời gian server hiện tại theo chuẩn UTC (ISO-8601)
 */
const getServerTime = () => dayjs.utc().format('YYYY-MM-DDTHH:mm:ss[Z]');

/**
 * Trả về response thành công (có hoặc không có phân trang)
 */
const successResponse = (res, data, pagination = null, message = "Success", statusCode = 200) => {
    const response = {
        code: "SUCCESS",
        message: message,
        requestId: uuidv4(),
        serverTime: getServerTime(),
        data: data
    };

    // Nếu có thông tin phân trang thì thêm vào response
    if (pagination) {
        response.pageNumber = pagination.pageNumber; // Bắt đầu từ 0
        response.pageSize = pagination.pageSize;
        response.totalElements = pagination.totalElements;
        response.totalPages = pagination.totalPages;
    }

    return res.status(statusCode).json(response);
};

/**
 * Trả về response lỗi (Business Error, Validation, v.v.)
 */
const errorResponse = (res, code, message, statusCode = 400, data = null, debug = null) => {
    const response = {
        code: code,
        message: message,
        requestId: uuidv4(),
        serverTime: getServerTime(),
        data: data
    };

    // Chỉ đính kèm debug detail nếu môi trường không phải production
    if (debug && process.env.NODE_ENV !== 'production') {
        response.debug = debug;
    }

    return res.status(statusCode).json(response);
};

module.exports = {
    successResponse,
    errorResponse,
};