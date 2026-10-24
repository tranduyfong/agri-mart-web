# Agri-Mart · Không gian nhân viên

Project độc lập với `client-front-end`, dùng React, TypeScript, Vite, Ant Design, Tailwind CSS, Axios, React Router, AOS và font Be Vietnam Pro như phía khách hàng. Trạng thái đăng nhập dùng Context và hooks, **không dùng Redux**. Hệ thống dùng một kho chung; DB cũ cần chuyển theo [hướng dẫn chuyển dữ liệu](../back-end/SINGLE-STORE.md).

## Chạy project

Cần Node.js 22 trở lên. Trong thư mục `staff-front-end`:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Mở **http://localhost:5175**. `VITE_API_URL` mặc định là `http://localhost:8000/api`. Chạy backend riêng bằng `npm run dev` trong `back-end`; cập nhật `MONGODB_URL` trong `.env` backend. Các thao tác nhập kho, đặt hàng và hội thoại dùng transaction nên MongoDB cần replica set; MongoDB Atlas đã hỗ trợ.

Để có dữ liệu mẫu, chạy `npm run seed` trong `back-end`. Tài khoản mẫu:

| Vai trò | Email | Mật khẩu ban đầu |
| --- | --- | --- |
| Nhân viên | staff.demo@agrimart.local | Demo@123 |
| Quản trị viên | admin.demo@agrimart.local | Demo@123 |

Chạy lại seed bổ sung các quyền mới cho riêng nhân viên demo, thêm một bản tin nháp và một hội thoại mẫu. Seed không đặt lại mật khẩu và không tự đăng ký nhận bản tin cho người dùng.

## Cấu trúc

```text
src/
  app/          router, cấu hình giao diện Ant Design
  components/   Panel, PageHeader, bảng đơn, trạng thái, trình soạn nội dung...
  containers/   phần giao diện/nghiệp vụ của từng màn hình
  context/      đăng nhập, quyền và mã kho nội bộ
  hooks/        useAuth, useData
  pages/        các trang ghép container
  services/     gọi API theo từng chức năng
  types/        kiểu dữ liệu API
  utils/        định dạng, đọc file nhập hàng, phân trang, đường dẫn ảnh...
```

Các màn hình S01–S18 được ghép theo luồng: nhập file/kiểm tra/thành công nằm trong cùng trang `/imports`; thêm và sửa dùng chung form sản phẩm, banner, khuyến mãi.

## Chức năng

- Công việc hôm nay: số liệu thật theo quyền, các đơn gần nhất.
- Đơn chờ duyệt: huy hiệu đỏ ở menu và góc phải header, bấm để mở danh sách chờ xác nhận. Socket.IO cập nhật danh sách/chi tiết khi khách đặt hoặc nhân viên xử lý đơn; tự kết nối lại và kiểm tra số lượng mỗi 5 giây. Tài khoản cần quyền `ORDER_MANAGE`. Hủy đơn hoàn đúng lô hàng đã xuất.
- Duyệt đơn: nhân viên có quyền Đơn hàng bấm **Duyệt đơn** ngay trong bảng danh sách/công việc hôm nay hoặc đầu trang chi tiết. Gọi điện xác nhận với khách rồi xác nhận duyệt; đơn chuyển sang chuẩn bị, khách mới được tiếp tục thanh toán VNPay.
- Sản phẩm: tìm tên/mã/SKU, lọc, phân trang; thêm/sửa nhiều quy cách, giá, ảnh tải lên hoặc URL; cần ảnh và quy cách trước khi đăng bán.
- Danh mục: tên, đường dẫn, ảnh tải từ máy/URL, số sản phẩm đang bán.
- Nhập hàng: tải mẫu CSV, đọc `.xlsx`/`.csv`, xem lỗi từng dòng, xác nhận ghi phiếu nhập và cập nhật đúng lô. Gửi lại cùng khóa nhập không cộng kho lần nữa. Sản phẩm mới được tạo nháp.
- Tồn kho: tồn thực, lượng phân bổ cho đơn chờ/đang chuẩn bị, lượng còn có thể bán và hạn dùng; hàng hết hạn khóa bán. Đơn đã bàn giao vận chuyển không còn tính vào tồn thực tại cửa hàng.
- Đơn hàng: tìm/lọc, chi tiết người nhận, sản phẩm, ưu đãi, lịch sử xử lý. Chuẩn bị → đang giao → hoàn tất; COD chỉ ghi đã thanh toán khi xác nhận giao và thu đủ tiền. Hủy hoàn đúng lô, không hoàn lặp. Đơn online chưa trả tiền không được giao; đơn đã trả tiền bị hủy cần cửa hàng đối soát/hoàn tiền riêng.
- Khuyến mãi: thời gian, giảm phần trăm tự động hoặc mã giảm tiền; dán mã sản phẩm/SKU, bỏ mã trùng, báo mã không tồn tại, xem giá minh họa.
- Mã giảm phí giao: thêm/sửa/kết thúc, điều kiện tiền hàng tối thiểu, ngày áp dụng.
- Banner: ảnh, vị trí carousel/popup, liên kết, lịch hiển thị, xem trước. Khách hàng nhận banner đã bật và còn trong thời gian áp dụng; popup có nút đóng.
- Bản tin: khách đăng ký ở footer; nhân viên lưu nháp, định dạng nội dung đơn giản, xem trước, xác nhận gửi và theo dõi kết quả. Người nhận có liên kết hủy đăng ký. `EMAIL_USER`, `EMAIL_PASS` và `PUBLIC_API_URL` đặt ở backend; `PUBLIC_API_URL` phải là URL API mà khách truy cập được. Gửi chạy trong tiến trình backend; nếu server dừng giữa chừng, bản tin chuyển thành “Cần kiểm tra”, không tự gửi lại để tránh trùng.
- Chăm sóc khách hàng: đọc hội thoại đã lưu, tiếp nhận, trả lời kèm tối đa 3 ảnh và kết thúc; chỉ nhân viên đã tiếp nhận được trả lời. Tự cập nhật bằng polling. Đây là màn hình xử lý `ChatRoom`/`ChatMessage`; chưa bổ sung chatbot AI hoặc giao diện chat phía khách hàng.

## Quyền và phạm vi dữ liệu

Admin/Staff dùng chung một kho, không còn chọn hay phân công cơ sở. Backend kiểm tra quyền chức năng ở mỗi API, không lấy quyền từ trình duyệt.

| Quyền | Chức năng |
| --- | --- |
| PRODUCT_MANAGE | Sản phẩm, danh mục |
| INVENTORY_MANAGE | Nhập hàng, tồn kho |
| ORDER_MANAGE | Đơn hàng |
| PROMOTION_MANAGE | Khuyến mãi, mã giảm phí giao |
| BANNER_MANAGE | Banner |
| NEWSLETTER_MANAGE | Bản tin email |
| SUPPORT_MANAGE | Chăm sóc khách hàng |

Giữ model hiện có: tồn nằm trong Product.variants.stocks, giá nhập nằm trong phiếu nhập và được lưu lại khi xuất lô. Form tạo sản phẩm có tồn ban đầu/giá nhập/hạn dùng; cần quyền quản lý kho để nhập. Sửa sản phẩm hiển thị các lô/giá nhập, nhập thêm qua màn hình Nhập hàng. SKU trong form khuyến mãi chọn cả sản phẩm và các quy cách. Khuyến mãi hỗ trợ ảnh tải lên/URL; popup chỉ có ảnh liên kết và nút X góc trên trái.

COD/VNPay đều chờ nhân viên gọi điện xác nhận. Xác nhận trước, VNPay mới mở cho khách trong 15 phút; đơn chưa trả tiền không được giao. Callback không thay thế bước duyệt của nhân viên. Chi tiết tại [luồng mới](../back-end/SINGLE-STORE.md).

Backend chỉ thêm hai model cho bản tin: `Subscriber` (đăng ký/hủy đăng ký) và `Newsletter` (nội dung/lịch sử gửi). Phiếu nhập thêm khóa chống trùng/file nguồn; đơn hàng thêm lịch sử trạng thái.

## Kiểm tra

```powershell
# Trong staff-front-end
npm run lint
npm run build

# Trong back-end
npm test
npm run test:staff
```

`test:staff` tự tạo MongoDB replica set tạm và giả lập gửi email, không dùng Atlas hoặc gửi email thật. Lần đầu có thể cần tải binary MongoDB. Kiểm tra các luồng phân quyền, sản phẩm, nhập kho, trạng thái đơn, callback VNPay sau hủy một phần, khuyến mãi, banner, bản tin và hội thoại.
