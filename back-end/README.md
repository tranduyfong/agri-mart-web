# Backend AgriFood Smart

Node.js 22, Express và Mongoose.

## Chạy dự án

Trong thư mục `back-end`:

```sh
npm install
npm run dev
```

Copy `.env.example` thành `.env` nếu chưa có. Điền `MONGODB_URI` khi có link Atlas; `MONGODB_DB_NAME` có thể để trống để dùng tên database trong URI. Cấu hình `JWT_SECRET`, `EMAIL_USER` và `EMAIL_PASS` cho đăng nhập và gửi OTP.

Server chạy tại `http://localhost:8000`, API bắt đầu bằng `/api`. Phiếu nhập kho dùng transaction nên MongoDB cần replica set; MongoDB Atlas hỗ trợ sẵn.

## Cấu trúc

```text
src/
  configs/       Kết nối MongoDB và email
  controllers/   Nhận request, kiểm tra dữ liệu, trả response
  middlewares/   Xác thực, phân quyền, upload ảnh
  models/        Mỗi file khai báo trực tiếp một model Mongoose
  routes/        Khai báo đường dẫn API
  services/      Xử lý nghiệp vụ, gọi model
  utils/         Response, phân trang và các hàm nhỏ dùng chung
  index.js       Khởi động Express
```

Cách tổ chức controller/service/route và response theo bản DoAnTTDN; cách gọi model Mongoose trực tiếp theo bản BaiTapLon25K2A.

- Model dùng ObjectId và các schema đã thống nhất. Địa chỉ, giỏ hàng, yêu thích nằm trong User. Các lô tồn kho nằm trong từng variant của Product.
- Ảnh lưu trực tiếp dưới dạng URL; không có model File hoặc bảng tồn kho riêng.
- Thành công trả `code, message, requestId, serverTime, data`. Danh sách phân trang thêm `pageNumber, pageSize, totalElements, totalPages` ở ngoài `data`.
- Lỗi dùng `errorResponse` của DoAnTTDN; `debug` chỉ xuất hiện ngoài môi trường production.

## Địa chỉ

Danh mục lấy từ [Provinces Open API v2](https://provinces.open-api.vn/), dùng tỉnh/thành phố và phường/xã theo địa giới mới.

- `GET /api/address/provinces`
- `GET /api/address/provinces/:code/wards`
- `POST /api/account/addresses`, `PUT /api/account/addresses/:id`: gửi `recipient_name, phone, province_code, ward_code, street_address, hamlet, is_default`.
- `GET /api/account/addresses/default`: lấy địa chỉ mặc định cho thanh toán.

Thôn/ấp/tổ dân phố nhập tại `hamlet`. Phải có thôn/ấp hoặc số nhà/tên đường. Backend xác thực mã tỉnh/xã và lưu tên từ API cùng địa chỉ đầy đủ.
