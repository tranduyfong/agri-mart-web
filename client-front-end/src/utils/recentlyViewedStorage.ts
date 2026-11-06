// Chỉ lưu slug, giá và tồn kho của sản phẩm đã xem luôn được tải lại từ API
const RECENTLY_VIEWED_KEY = 'recentlyViewedProducts';
const HISTORY_LIMIT = 7;

// Đọc lịch sử đã xem và bỏ dữ liệu trình duyệt không đúng cấu trúc.
export const getRecentlyViewedSlugs = (): string[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((slug): slug is string => typeof slug === 'string' && slug.length > 0))].slice(0, HISTORY_LIMIT);
  } catch {
    return []; // Trình duyệt chặn localStorage hoặc dữ liệu đã lưu bị lỗi
  }
};

// Đưa slug vừa xem lên đầu, loại trùng và cắt danh sách về giới hạn.
export const saveViewedProduct = (slug: string) => {
  const slugs = [slug, ...getRecentlyViewedSlugs().filter((item) => item !== slug)].slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(slugs));
  } catch {
    // Không lưu được lịch sử thì vẫn cho người dùng xem sản phẩm bình thường
  }
};
