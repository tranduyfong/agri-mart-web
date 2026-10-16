// Địa chỉ server back-end, VD: VITE_API_URL = "http://localhost:8000/api" -> "http://localhost:8000"
const SERVER_URL = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

// Back-end trả về đường dẫn ảnh dạng "uploads/products/abc.png"
// -> ghép với địa chỉ server để hiển thị: "http://localhost:8000/uploads/products/abc.png"
export const getFileUrl = (path: string | null) => {
  if (!path) return null;
  return `${SERVER_URL}/${path}`;
};
