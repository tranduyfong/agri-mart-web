# Agri-Mart · Quản trị hệ thống

Project độc lập, cùng công nghệ/cấu trúc với nhân viên: React, TypeScript, Vite, Ant Design, Tailwind CSS, Axios, React Router, AOS, Be Vietnam Pro. Đăng nhập dùng Context/hooks, **không dùng Redux**.

## Chạy

Cần Node.js 22+. Trong `admin-front-end`:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Mở **http://localhost:5177**. Backend chạy cổng 8000, `VITE_API_URL` đặt trong `.env`. Tài khoản sau seed: **admin.demo@agrimart.local / Demo@123** nếu chưa đổi. Token quản trị có khóa riêng `admin.accessToken`; STAFF/CUSTOMER không truy cập được API quản trị.

## Màn hình

| Đường dẫn | Chức năng |
| --- | --- |
| `/` | Tổng quan doanh thu, giá vốn, lợi nhuận và biểu đồ theo ngày |
| `/accounts` | Tra cứu/lọc tài khoản, thêm nhân viên, sửa thông tin/email mọi vai trò, khóa/mở khóa |
| `/permissions?id=...` | Chọn nhân viên và các nhóm quyền chức năng |
| `/reports/revenue` | Doanh thu, giá vốn, lợi nhuận, đối chiếu thanh toán, CSV tổng hợp/theo ngày |
| `/reports/inventory` | Nhập/bán trong kỳ, tồn hiện tại theo SKU/đơn vị, giá trị phiếu nhập và CSV |

Cấu trúc `src`: `app`, `pages`, `containers`, `components`, `context`, `hooks`, `services`, `types`, `utils`. Trang ghép container; bộ lọc, biểu đồ, thẻ số liệu, bảng và chọn quyền được tái sử dụng.

Đã bỏ chức năng quản lý/chọn/phân công cơ sở. Hệ thống dùng kho chung. **DB cũ có Branch cần chuyển dữ liệu một lần theo [hướng dẫn chuyển dữ liệu](../back-end/SINGLE-STORE.md)** trước khi dùng mô hình mới. Seed không dùng để gộp dữ liệu.

## Tài khoản và quyền

- Tạo mới chỉ tạo STAFF, băm mật khẩu, chưa có quyền mặc định. Cấp nhóm quyền tại màn hình Phân quyền.
- Admin sửa họ tên, điện thoại và email của CUSTOMER/STAFF/ADMIN. Email trùng bị chặn. Đổi email thu hồi phiên cũ, xóa token xác minh/đặt lại mật khẩu cũ. Tài khoản chưa xác minh vẫn cần xác minh; đổi email của chính mình cần đăng nhập lại.
- Không đổi role/mật khẩu từ form thông tin; không khóa ADMIN để tránh mất truy cập quản trị.
- Bảy nhóm quyền giữ trong User.permissions, áp dụng cho cửa hàng. Backend đọc lại quyền ở mỗi request. Lưu quyền kiểm tra phiên bản để tránh ghi đè đồng thời.

## Báo cáo

Khoảng ngày tính theo Việt Nam, tối đa 367 ngày. Doanh thu lấy tiền cuối cùng của đơn hoàn tất PAID/REFUNDED, gồm phí giao sau ưu đãi; phần hoàn tiền trình bày riêng. Lợi nhuận gộp = doanh thu − hoàn tiền − giá vốn, chưa trừ vận hành/giao hàng.

Ngày hoàn tất lấy từ lịch sử, đơn cũ thiếu lịch sử dùng ngày tạo và báo rõ. Giá vốn theo đúng lô và các phiếu nhập đã có lúc xuất. Đơn mới lưu unit_cost trong stock_allocations; nhập thêm hàng không đổi giá vốn đã ghi. Dữ liệu thiếu không được suy đoán, hiển thị **Chưa đủ dữ liệu**.

Nhập/bán lọc theo kỳ; tồn sổ và lượng phân bổ là số hiện tại. Chưa có sổ điều chỉnh đầy đủ nên không dựng tồn đầu/cuối quá khứ. Số lượng tách theo SKU/đơn vị, không cộng kg với gói/bó/chai. CSV UTF-8 có BOM, xuất toàn bộ trang của bộ lọc và tránh công thức trong ô.

## Kiểm tra

```powershell
npm run lint
npm run build
# Trong back-end
npm test
npm run test:staff
npm run test:admin
```

Kiểm thử tích hợp dùng MongoDB tạm, SMTP giả, không kết nối Atlas/email thật. Xem [luồng duyệt đơn, ảnh và tồn ban đầu](../back-end/SINGLE-STORE.md).
