// Che bớt email khi hiển thị, VD: nguyenvana@gmail.com -> ngu*****@gmail.com
// Giữ lại 3 ký tự đầu, phần còn lại thay bằng dấu * (tối đa 5 dấu cho gọn)
export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (!domain) return email;

  const visiblePart = name.slice(0, 3);
  const hiddenLength = Math.min(Math.max(name.length - 3, 1), 5);
  return `${visiblePart}${'*'.repeat(hiddenLength)}@${domain}`;
};

// Định dạng giá tiền, VD: 25000 -> "25.000đ"
export const formatPrice = (price: number) => {
  return `${Math.round(price).toLocaleString('vi-VN')}đ`;
};

// Định dạng ngày, VD: "2026-10-20T10:00:00.000Z" -> "20/10/2026"
export const formatDate = (dateText: string) => {
  const date = new Date(dateText);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

// Hiển thị tồn kho dạng gọn giống thiết kế, VD: 65 -> "60+ còn hàng", 5 -> "Chỉ còn 5", 0 -> "Hết hàng"
export const formatStock = (stock: number) => {
  if (stock <= 0) return 'Hết hàng';
  if (stock < 10) return `Chỉ còn ${stock}`;
  return `${Math.floor(stock / 10) * 10}+ còn hàng`;
};
