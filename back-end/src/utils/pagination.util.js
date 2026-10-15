const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100; // Giới hạn để tránh client gọi pageSize quá lớn làm nặng server

/**
 * Đọc pageNumber, pageSize từ query (?pageNumber=0&pageSize=20)
 * pageNumber bắt đầu từ 0. Không truyền hoặc truyền sai thì lấy mặc định: trang 0, 20 bản ghi
 */
const getPagination = (query) => {
    let pageNumber = parseInt(query.pageNumber);
    let pageSize = parseInt(query.pageSize);

    if (isNaN(pageNumber) || pageNumber < 0) pageNumber = 0;
    if (isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

    return {
        pageNumber,
        pageSize,
        offset: pageNumber * pageSize // Số bản ghi cần bỏ qua
    };
};

/**
 * Tạo thông tin phân trang để truyền vào successResponse
 */
const buildPagination = (pageNumber, pageSize, totalElements) => {
    return {
        pageNumber,
        pageSize,
        totalElements,
        totalPages: Math.ceil(totalElements / pageSize)
    };
};

module.exports = {
    getPagination,
    buildPagination
};
