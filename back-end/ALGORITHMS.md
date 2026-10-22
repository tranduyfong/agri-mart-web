# Tìm kiếm và gợi ý sản phẩm

## Levenshtein — `src/utils/levenshtein.util.js`

`levenshteinDistance(a, b)` dùng quy hoạch động, tính số phép thêm, xóa hoặc thay ký tự ít nhất để đổi `a` thành `b`. Mỗi phép có chi phí 1. Thời gian O(m × n), bộ nhớ O(min(m, n)) nhờ chỉ giữ hai hàng.

`getSearchScore(keyword, product)` bỏ dấu tiếng Việt, đổi `đ` thành `d`, chuyển chữ thường và tách từ. Tên hoặc mã khớp được ưu tiên. Với kết quả gần đúng, mỗi từ 1–2 ký tự phải khớp, từ 3–5 ký tự cho sai tối đa 1 ký tự, từ dài hơn cho sai tối đa 2. Tất cả từ trong truy vấn phải tìm được từ phù hợp. Từ khóa tối đa 120 ký tự.

API `GET /api/product?keyword=ca%20chuaa` áp dụng thuật toán trước phân trang, giữ nguyên các điều kiện danh mục, giá, khuyến mãi và trạng thái. Điểm khớp đứng trước, cách sắp xếp người dùng chọn dùng khi các điểm bằng nhau.

Khi có sửa lỗi gõ, response thêm `meta.search_suggestion`, ví dụ `"Cà chua"` cho truy vấn `"ca chuaa"`. Gợi ý lấy từ kết quả đã qua bộ lọc, trước phân trang nên không thay đổi giữa các trang. Từ đúng, từ viết không dấu hoặc truy vấn không có kết quả sẽ không nhận gợi ý sửa. Người dùng có thể bấm gợi ý để tìm lại, các bộ lọc khác vẫn được giữ.

## Content-based filtering + cosine — `src/utils/recommendation.util.js`

Mỗi sản phẩm có vector nội dung lấy từ tên (trọng số 4), tên danh mục (2), mã danh mục (5), 100 từ đầu mô tả (0,25) và đơn vị bán (0,5). Tiếng Việt được chuẩn hóa; bỏ HTML và một số từ phổ biến. Giá, tồn kho và lịch sử mua không được dùng làm nội dung tương đồng.

Trọng số từng đặc trưng được nhân với `IDF(t) = log((N + 1) / (df(t) + 1)) + 1`. Vector lưu dưới dạng object. Hàm `cosineSimilarity(a, b)` tính tích vô hướng chia cho tích độ dài hai vector; vector rỗng cho điểm 0.

API `GET /api/product/:id/related` chỉ xét sản phẩm PUBLISHED, loại sản phẩm đang xem, giữ điểm > 0,05, lấy tối đa 6 sản phẩm theo điểm giảm dần. Giao diện chi tiết dùng kết quả này ở phần **Sản phẩm tương tự**. Có thể gợi ý khác danh mục nếu nội dung đủ gần.

Chạy kiểm thử độc lập, không cần kết nối MongoDB: `npm test`.

Tham khảo: [Stanford — Edit distance](https://nlp.stanford.edu/IR-book/html/htmledition/edit-distance-1.html), [Stanford — Queries as vectors](https://nlp.stanford.edu/IR-book/html/htmledition/queries-as-vectors-1.html).

## Theo dõi đơn hàng

`GET /api/order` yêu cầu đăng nhập, tự giới hạn theo tài khoản trong token. Hỗ trợ `keyword`, `status`, `pageNumber` (từ 0), `pageSize`. Một checkout nhiều cơ sở được gộp thành một kết quả, kèm `branch_orders` để xem từng kiện. Tiến độ chung lấy bước thấp nhất của các kiện chưa hủy; chỉ hiển thị hoàn thành khi tất cả kiện còn lại hoàn thành. Đơn cũ không có checkout_code được tra bằng code.

Trang `/orders` tự tải lại mỗi 30 giây khi đang hiển thị và có đơn chưa kết thúc; nút **Cập nhật** tải lại ngay. Trạng thái đọc từ Order trong MongoDB, không tự tăng theo thời gian.
