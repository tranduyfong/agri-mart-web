# Agri-Mart — sửa 10 màn hình máy tính, bản 2

File đích vẫn là [Agri-Mart](https://www.figma.com/design/AVHxdgKfgepM7o7kBjah5d). Plugin dùng đúng ID của các frame trong file cũ.

## Cách áp dụng

1. Giải nén `agri-mart-desktop-fix-v2.zip`.
2. Mở file Agri-Mart cũ trong Figma Desktop với quyền chỉnh sửa.
3. Vào **Plugins → Development → Import plugin from manifest**, chọn `manifest.json` trong thư mục vừa giải nén. Đây là plugin mới, khác plugin sắp xếp bản 1.1.
4. Chạy **Agri-Mart · Sửa 10 màn hình máy tính** và bấm **Cập nhật 10 màn hình máy tính**.
5. Đợi thông báo hoàn tất. Có thể mở “Kết quả kiểm tra” để xem ID và kích thước của 10 desktop đã cập nhật.

Plugin chạy offline, không cần npm hay website đang mở. Font dùng là **Be Vietnam Pro**; nếu Figma không có một độ đậm cần thiết, plugin báo tên font và dừng trước khi thay nội dung cũ.

## Nội dung thay đổi

| Mã | Màn hình | Bố cục từ website ở viewport 1440px |
| --- | --- | --- |
| C03 | Đăng ký | Ảnh bên trái, biểu mẫu bên phải |
| C04 | Xác minh email | Ảnh bên trái, nội dung xác minh bên phải |
| C05 | Quên mật khẩu | Ảnh bên trái, biểu mẫu bên phải |
| C06 | Cửa hàng | Lưới 5 sản phẩm mỗi hàng, bộ lọc trên cùng |
| C07 | Chi tiết sản phẩm | Ảnh và thông tin mua hàng cạnh nhau |
| C08 | Giỏ hàng của bạn | Bảng sản phẩm với các cột giá, số lượng, thành tiền |
| C09 | Thanh toán | Thông tin nhận hàng bên trái, tóm tắt đơn bên phải |
| C10 | Theo dõi đơn hàng | Danh sách đơn và các bộ lọc trên màn hình rộng |
| C13 | Thông tin cá nhân | Menu tài khoản bên trái, biểu mẫu bên phải |
| C14 | Sổ địa chỉ | Menu tài khoản bên trái, địa chỉ đã lưu bên phải |

Plugin dựng các layer chữ, ảnh nội dung và vector từ vị trí/kiểu hiển thị được đo trên website, rồi thay nội dung trong **đúng frame desktop cũ**, giữ ID của frame. Không dùng ảnh chụp toàn trang làm layer thiết kế. Đây là các layer cố định theo desktop; chưa phải thư viện component hoặc layout tự co giãn trong Figma.

Các bản điện thoại giữ nguyên nội dung và kích thước. Plugin căn lại 16 cặp trong section Khách hàng để desktop ở hàng trên và điện thoại tương ứng ở hàng dưới, cùng cột. Các giao diện nhân viên/quản trị không được thay nội dung.

Nội dung desktop cũ được chuyển vào section ẩn tên **Agri-Mart / Sao lưu trước khi sửa desktop / ...**. Có thể bật hiển thị section này trong Layers để xem lại. Figma Undo ngay sau khi chạy cũng có thể hoàn tác thao tác.

## Kiểm tra đã thực hiện

- Nguồn của đủ 10 trang có viewport và chiều rộng tài liệu **1440px**, media query desktop hoạt động, không ghi nhận lỗi JavaScript.
- Đã xem ảnh nguồn của đăng ký, cửa hàng, thanh toán và thông tin cá nhân; bản thanh toán có đủ địa chỉ, phương thức và tóm tắt đơn, không phải trạng thái lỗi.
- 10 bài kiểm tra mô phỏng Plugin API đạt: giữ ID desktop và nội dung điện thoại, lưu nội dung cũ, căn hàng/cột, dừng khi thiếu frame/font/ảnh hoặc sai file/nguồn; lỗi dựng SVG không làm mất nội dung cũ.
- Kiểm tra cú pháp JavaScript và gói dữ liệu UI.

**Chưa áp dụng hay xác nhận ảnh render trực tiếp trong Figma.** Hạn mức Figma MCP Starter vẫn chặn công cụ đọc và chỉnh sửa file. Chạy plugin là bước áp dụng vào cùng đường link cũ; các ảnh PNG trong `previews/` là ảnh website nguồn, không phải ảnh chụp Figma sau khi sửa.

`desktop-checks.json` lưu thông số đo từ web và các ID cần cập nhật. Các giá trị trong file này không phải kết quả đọc lại node trong Figma.

## Phát triển gói

`node build.cjs` tạo `ui.html` và `desktop-checks.json` từ `layouts.json`. Chạy kiểm tra bằng `node --test code.test.cjs`.
