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

File `seed.js` dùng lại kết nối MongoDB trong `.env`, không gửi email. Dữ liệu gồm 12 danh mục, 26 sản phẩm (24 đang bán, 1 nháp, 1 ngừng bán), tồn kho ở 2 cơ sở, 1 nhà cung cấp, 2 phiếu nhập, 6 khuyến mãi và 3 đơn đã hoàn tất.

| Vai trò | Email | Mật khẩu ban đầu |
| --- | --- | --- |
| Khách hàng | customer.demo@agrimart.local | Demo@123 |
| Nhân viên | staff.demo@agrimart.local | Demo@123 |
| Quản trị viên | admin.demo@agrimart.local | Demo@123 |

Các tài khoản đã kích hoạt. Tài khoản khách hàng có sẵn 2 địa chỉ (1 mặc định), 2 sản phẩm trong giỏ và 2 sản phẩm yêu thích. Nhân viên được gán cơ sở và quyền quản lý sản phẩm, kho, đơn hàng.

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
- `POST /api/order/checkout`: thêm `address_id`, `recipient_name`, `phone`, `email`, `note`, `payment_method` (`COD`/`VNPAY`), `expected_total` từ preview và cùng `coupon_code`. Trả `checkout_code` và `redirectUrl` khi cần đến VNPay.
- `GET /api/order/:code`: xem đơn của chính tài khoản đã đặt.
- `POST /api/order/:code/payment-url`: tiếp tục phiên VNPay còn hạn.
- `POST /api/order/:code/check-payment`: đối soát kết quả giao dịch qua QueryDR.
- `GET /api/order/vnpay-return` và `/api/order/vnpay-ipn`: xác minh callback từ VNPay.

Backend tính tiền từ sản phẩm và khuyến mãi hiện tại, kiểm tra lại tồn kho, địa chỉ và tổng tiền trước khi lưu. Thông tin sản phẩm/người nhận được lưu thành bản chụp trong đơn. Cùng `checkout_key` gửi lại sẽ trả đơn đã tạo, tránh đặt trùng.

### Mã giảm giá

Mỗi đơn dùng một mã, không phân biệt chữ hoa/thường. Mã có thể giảm theo phần trăm hoặc số tiền, cho sản phẩm hoặc phí giao hàng. `min_order_value` tính trên tiền hàng sau ưu đãi tự động, chưa tính vận chuyển. Với mã sản phẩm, `product_ids` rỗng nghĩa là toàn bộ sản phẩm; nếu có ID thì chỉ giảm các sản phẩm đó. Tiền giảm không vượt quá phần tiền hợp lệ.

Đặt `requires_code: true` cho khuyến mãi phần trăm sản phẩm cần khách nhập mã. Khuyến mãi phần trăm sản phẩm cũ (`requires_code: false`) vẫn tự động giảm trên giá; nhập lại mã này không giảm thêm lần nữa. Mã giảm số tiền và phí vận chuyển được áp dụng khi nhập mã. Mã được kiểm tra lại trong transaction lúc đặt hàng, lưu mã/tên/số tiền giảm trong Order; đơn nhiều cơ sở phân bổ tiền giảm đúng từng đồng. VNPay nhận số tiền cuối cùng sau giảm. Đơn 0đ xác nhận bằng COD.

Chạy lại `npm run seed` để bổ sung mã thử (không ghi đè dữ liệu đã có):

- `DEMO-GIAM10`: giảm thêm 10% tiền hàng, đơn từ 100.000đ.
- `DEMO-GIAM30`: giảm 30.000đ tiền hàng, đơn từ 300.000đ.
- `DEMO-SHIP15`: giảm tối đa 15.000đ phí giao hàng, đơn từ 200.000đ.

Một lần thanh toán có thể gồm nhiều đơn theo cơ sở, dùng chung `checkout_code`. Phí giao hàng chỉ tính một lần. Lô còn hạn được xuất theo hạn sử dụng gần nhất. Đặt hàng và trừ kho dùng transaction MongoDB.

Kết quả VNPay phải có chữ ký đúng, mã merchant đúng và số tiền khớp đơn. Callback lặp không trừ hoặc hoàn kho lần nữa. Giao dịch thất bại/hủy sẽ hoàn đúng lô và trả sản phẩm về giỏ. COD ghi nhận đã đặt hàng, trạng thái tiền vẫn là chưa thanh toán.

Phiên VNPay có hạn 15 phút. Sau khi hết hạn thêm 5 phút, backend định kỳ đối soát các đơn đang chờ qua QueryDR. Chỉ hoàn kho khi xác minh được giao dịch không thành công; lỗi kết nối/chữ ký giữ trạng thái chờ để kiểm tra lại. Giao dịch thu tiền đến sau khi đơn đã hủy được hiển thị là cần cửa hàng kiểm tra, hỗ trợ hoàn tiền.
