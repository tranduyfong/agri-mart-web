export const tablePagination = (pageNumber: number, total: number, onChange: (page: number) => void) => ({
  current: pageNumber + 1,
  pageSize: 10,
  total,
  showSizeChanger: false,
  showTotal: (count: number) => `${count.toLocaleString('vi-VN')} kết quả`,
  onChange: (page: number) => onChange(page - 1),
});
