// Che bớt email khi hiển thị, VD: nguyenvana@gmail.com -> ngu*****@gmail.com
// Giữ lại 3 ký tự đầu, phần còn lại thay bằng dấu * (tối đa 5 dấu cho gọn)
export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (!domain) return email;

  const visiblePart = name.slice(0, 3);
  const hiddenLength = Math.min(Math.max(name.length - 3, 1), 5);
  return `${visiblePart}${'*'.repeat(hiddenLength)}@${domain}`;
};
