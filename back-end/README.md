# Backend AgriFood Smart

Node.js 22, Express và Mongoose.

## Chạy dự án

Trong thư mục `back-end`:

```sh
npm install
npm run dev
```

Copy `.env.example` thành `.env` nếu chưa có. Điền `MONGODB_URL` theo cấu hình kết nối hiện tại; tên database nằm trong URI. Cấu hình `JWT_SECRET`, `EMAIL_USER` và `EMAIL_PASS` cho đăng nhập và gửi OTP.

Server chạy tại `http://localhost:8000`, API bắt đầu bằng `/api`. Phiếu nhập kho dùng transaction nên MongoDB cần replica set; MongoDB Atlas hỗ trợ sẵn.

## Dữ liệu mẫu

Trong thư mục `back-end`, chạy:

```sh
npm run seed
```

File `seed.js` dùng lại kết nối MongoDB trong `.env`, không gửi email. Dữ liệu gồm 12 danh mục, 26 sản phẩm (24 đang bán, 1 nháp, 1 ngừng bán), tồn kho chung theo lô, 1 nhà cung cấp, 1 phiếu nhập, 6 khuyến mãi và 3 đơn đã hoàn tất.

| Vai trò | Email | Mật khẩu ban đầu |
| --- | --- | --- |
| Khách hàng | customer.demo@agrimart.local | Demo@123 |
| Nhân viên | staff.demo@agrimart.local | Demo@123 |
| Quản trị viên | admin.demo@agrimart.local | Demo@123 |

Các tài khoản đã kích hoạt. Tài khoản khách hàng có sẵn 2 địa chỉ (1 mặc định), 2 sản phẩm trong giỏ và 2 sản phẩm yêu thích. Nhân viên có quyền quản lý sản phẩm, kho và đơn hàng.

Có sản phẩm hết hàng, sản phẩm nhiều quy cách, lô hàng hết hạn, khuyến mãi đang chạy và đã kết thúc để thử các trạng thái trên giao diện. Ngày của dữ liệu mẫu được tính theo thời điểm tạo.

Chạy lại chỉ thêm bản ghi còn thiếu, không xóa dữ liệu hoặc đặt lại thông tin và mật khẩu đã sửa. Bản ghi mẫu dùng tiền tố `DEMO-`, slug danh mục `demo-` và các email ở bảng trên.

Ảnh nằm trong `seed-images/` và được copy sang `uploads/products/demo/` khi chạy. Ảnh dùng giấy phép MIT, xem `seed-images/LICENSE-fluentui-emoji.txt`. Tên người, địa chỉ giao hàng và số điện thoại là dữ liệu thử.

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

## Thanh toán và VNPay

Chọn các sản phẩm trong giỏ và bấm **Thanh toán**. Màn hình tự chọn địa chỉ mặc định, cho phép đổi địa chỉ đã lưu, thêm địa chỉ và sửa thông tin người nhận cho riêng đơn này. Hỗ trợ COD và VNPay.

Các biến backend cần cấu hình trong `.env`:

```dotenv
VNP_TMN_CODE=<mã merchant Sandbox>
VNP_HASH_SECRET=<khóa merchant Sandbox>
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5173/vnpay-return
VNP_TEST_MODE=true
SHIPPING_FEE=15000
```

Thông tin merchant chỉ nằm trong backend. Restart backend sau khi chỉnh `.env`. Địa chỉ Return URL phải trỏ đúng frontend đang chạy; nếu đổi cổng frontend thì sửa `VNP_RETURN_URL` tương ứng.

Nếu Sandbox trả mã `71` / “The terminal (website) not approved”, cần merchant đã được VNPay duyệt. Cập nhật `VNP_TMN_CODE` và `VNP_HASH_SECRET` rồi restart backend. Cấu hình merchant cũ trong hai dự án tham khảo hiện gặp trạng thái này; COD vẫn dùng được.

Đăng ký **IPN URL** với VNPay: `https://<địa-chỉ-backend>/api/order/vnpay-ipn`. IPN cần địa chỉ công khai để VNPay gọi được. Khi chạy localhost, trang `/vnpay-return` vẫn gửi kết quả về backend để xác minh. Xem [tài liệu tích hợp VNPay](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).

- `POST /api/order/preview`: nhận `cart_item_ids`, `checkout_key`, `coupon_code` (không bắt buộc), trả giá hiện tại, mã áp dụng và tổng tiền.
- `POST /api/order/checkout`: thêm `address_id`, `recipient_name`, `phone`, `email`, `note`, `payment_method` (`COD`/`VNPAY`), `expected_total` từ preview và cùng `coupon_code`. Trả `checkout_code`, `redirectUrl: null`; chờ nhân viên gọi điện xác nhận.
- `GET /api/order/:code`: xem đơn của chính tài khoản đã đặt.
- `POST /api/order/:code/payment-url`: mở VNPay còn hạn sau khi nhân viên duyệt; chặn đơn chưa duyệt.
- `POST /api/order/:code/check-payment`: đối soát kết quả giao dịch qua QueryDR.
- `GET /api/order/vnpay-return` và `/api/order/vnpay-ipn`: xác minh callback từ VNPay.

Backend tính tiền từ sản phẩm và khuyến mãi hiện tại, kiểm tra lại tồn kho, địa chỉ và tổng tiền trước khi lưu. Thông tin sản phẩm/người nhận được lưu thành bản chụp trong đơn. Cùng `checkout_key` gửi lại sẽ trả đơn đã tạo, tránh đặt trùng.

### Mã giảm giá

Mỗi đơn dùng một mã, không phân biệt chữ hoa/thường. Mã có thể giảm theo phần trăm hoặc số tiền, cho sản phẩm hoặc phí giao hàng. `min_order_value` tính trên tiền hàng sau ưu đãi tự động, chưa tính vận chuyển. Với mã sản phẩm, `product_ids` rỗng nghĩa là toàn bộ sản phẩm; nếu có ID thì chỉ giảm các sản phẩm đó. Tiền giảm không vượt quá phần tiền hợp lệ.

Đặt `requires_code: true` cho khuyến mãi phần trăm sản phẩm cần khách nhập mã. Khuyến mãi phần trăm sản phẩm cũ (`requires_code: false`) vẫn tự động giảm trên giá; nhập lại mã này không giảm thêm lần nữa. Mã giảm số tiền và phí vận chuyển được áp dụng khi nhập mã. Mã được kiểm tra lại trong transaction lúc đặt hàng, lưu mã/tên/số tiền giảm trong Order. VNPay nhận số tiền cuối cùng sau giảm. Đơn 0đ xác nhận bằng COD.

Chạy lại `npm run seed` để bổ sung mã thử (không ghi đè dữ liệu đã có):

- `DEMO-GIAM10`: giảm thêm 10% tiền hàng, đơn từ 100.000đ.
- `DEMO-GIAM30`: giảm 30.000đ tiền hàng, đơn từ 300.000đ.
- `DEMO-SHIP15`: giảm tối đa 15.000đ phí giao hàng, đơn từ 200.000đ.

Hệ thống dùng một cửa hàng, không có model Branch hoặc trường tham chiếu cơ sở. Một lần mua mới tạo một đơn. Lần mua cũ có nhiều phiếu vẫn giữ cùng `checkout_code` và lịch sử. Phí giao hàng tính một lần. Lô còn hạn xuất theo hạn gần nhất. Đặt hàng và trừ kho dùng transaction.

Kết quả VNPay phải có chữ ký đúng, mã merchant đúng và số tiền khớp đơn. Callback lặp không trừ hoặc hoàn kho lần nữa. Giao dịch thất bại/hủy sẽ hoàn đúng lô và trả sản phẩm về giỏ. COD ghi nhận đã đặt hàng, trạng thái tiền vẫn là chưa thanh toán.

COD/VNPay đều chờ nhân viên duyệt. Phiên VNPay có hạn 15 phút từ lúc duyệt xong. Sau hạn thêm 5 phút, backend đối soát qua QueryDR. Chỉ hoàn kho khi xác minh giao dịch không thành công; lỗi kết nối/chữ ký giữ trạng thái để kiểm tra lại. Thu tiền sau khi hủy cần cửa hàng kiểm tra, hỗ trợ hoàn tiền.

### Không gian nhân viên

Project mới nằm tại `../staff-front-end`, chạy cổng 5175. Xem [hướng dẫn nhân viên](../staff-front-end/README.md) để biết tài khoản demo, cấu trúc, quyền và các trường được điều chỉnh theo model.

Nhóm API `/api/staff` yêu cầu ADMIN/STAFF và quyền tương ứng: `session`, `lookups`, `dashboard`, `products`, `categories`, `inventory`, `imports`, `orders`, `promotions`, `banners`, `newsletters`, `support`. Tồn kho dùng chung, không cần mã cơ sở. Endpoint cũ `/api/product/import` cũng yêu cầu `INVENTORY_MANAGE`.

- Nhập kho: `POST /staff/imports/preview` nhận `{ rows }`; `POST /staff/imports` nhận thêm `import_key`, `source_file`, `supplier_id`, `note`. Backend kiểm tra lại toàn bộ dòng trong lúc xác nhận; unique index và transaction chống nhập trùng.
- Đơn hàng: `PATCH /staff/orders/:id/status` nhận `{ status, expected_status, note }`. Backend kiểm tra bước chuyển trạng thái, tình trạng thanh toán, hoàn kho khi hủy và ghi lịch sử. Callback VNPay giữ nguyên đơn đã hủy, không tự duyệt hoặc đưa đơn đang giao về chuẩn bị.
- Thông báo đơn: `GET /staff/orders/summary` trả `pending_count`, yêu cầu `ORDER_MANAGE`. Socket.IO chạy cùng cổng HTTP, nhận JWT qua `auth.token`; sự kiện `orders:changed` báo giao dịch đã được lưu để frontend tải lại danh sách/bộ đếm. Kiểm tra lại quyền trước mỗi thông báo. Danh sách và bộ đếm lấy toàn bộ đơn của cửa hàng. Nếu dùng reverse proxy, chuyển tiếp cả đường dẫn `/socket.io/` đến backend.
- Cấu hình Socket ở `src/configs/socket.config.js`: `init(httpServer)` khởi tạo tại `index.js`, `getIO()` lấy kết nối dùng chung. `utils/orderEvents.util.js` chỉ phát thông báo sau khi giao dịch đơn đã lưu. Nhân viên có quyền `ORDER_MANAGE` được duyệt `PENDING → CONFIRMED`; khách chỉ lấy được URL VNPay sau bước này.
- Bản tin: `EMAIL_USER`/`EMAIL_PASS` cấu hình SMTP Gmail hiện có; `PUBLIC_API_URL` là URL công khai kết thúc bằng `/api`. Chỉ gửi cho `Subscriber.is_active`; kết quả từng email lưu trong `Newsletter.recipients`. Server dừng giữa chừng sẽ chuyển bản tin SENDING thành PARTIAL khi khởi động lại.
- API công khai: `GET /api/banners`, `POST /api/newsletter/subscribe`. Liên kết hủy đăng ký dùng GET để hiện xác nhận và POST để hủy, tránh bot quét email tự hủy.

Chạy `npm run test:staff` để kiểm tra trên MongoDB tạm và SMTP giả. Không sử dụng cấu hình Atlas/email thật khi kiểm thử.

### Quản trị hệ thống

Project `../admin-front-end` chạy cổng 5177, dùng API `/api/admin` chỉ dành cho ADMIN. Xem [README quản trị](../admin-front-end/README.md) để biết màn hình, quyền và định nghĩa chỉ số báo cáo.

- `GET /admin/session`, `/admin/lookups`: tài khoản và quyền. Đã bỏ API quản lý cơ sở.
- `GET/POST /admin/accounts`, `GET/PUT /admin/accounts/:id`: tra cứu, sửa thông tin/email mọi vai trò; POST luôn tạo STAFF.
- `PATCH /admin/accounts/:id/lock`: `{ action: 'LOCK' | 'UNLOCK', expected_status }`; không áp dụng ADMIN, không bỏ qua xác minh email.
- `PUT /admin/accounts/:id/permissions`: `{ permissions, expected_updated_at }` để cấp nhóm quyền cho STAFF tại kho chung.
- `GET /admin/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD`: doanh thu, giá vốn, biểu đồ, theo ngày và phương thức.
- `GET /admin/reports/inventory`: thêm `category_id`, `keyword`, phân trang; nhập/bán trong kỳ và tồn hiện tại, không suy đoán tồn quá khứ.

Đã xóa model Branch và các tham chiếu cơ sở; Order lưu giá vốn trong phân bổ lô; GoodsReceipt lưu thêm tên/đơn vị từng dòng. Chạy `npm run test:admin` để kiểm tra với DB và địa chỉ giả, không dùng dữ liệu thật.

### Chuyển sang một cửa hàng

Xem [hướng dẫn chuyển dữ liệu sang một cửa hàng](SINGLE-STORE.md). Database cũ có Branch cần chuyển một lần trong lúc dừng backend, kể cả chỉ từng có một cơ sở. Script tự sao lưu dữ liệu trước khi áp dụng. Không dùng seed để gộp dữ liệu.
