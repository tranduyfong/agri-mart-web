# agri-mart-web
This is my graduation thesis, wish me luck!

Backend dùng MongoDB/Mongoose. Xem [cách chạy backend](back-end/README.md) và [các model](back-end/src/models).

## Chạy dự án

Dùng Node.js 22 trở lên. Cài thư viện cho từng project một lần:

```powershell
npm --prefix back-end install
npm --prefix client-front-end install
npm --prefix staff-front-end install
npm --prefix admin-front-end install
```

Cấu hình `back-end/.env`, sau đó tại thư mục `agri-mart-web` chạy:

```powershell
npm run dev
```

Lệnh này chạy backend tại http://localhost:8000. Nhấn Ctrl+C để dừng. Không cần cài thêm thư viện tại thư mục gốc.

Chạy từng giao diện trong terminal riêng:

```powershell
npm run dev:client
npm run dev:staff
npm run dev:admin
```

Khách hàng dùng http://localhost:5173, nhân viên dùng http://localhost:5175 và quản trị dùng http://localhost:5177. Nếu đã mở giao diện thì không cần chạy lại. Vẫn có thể vào từng thư mục rồi chạy `npm run dev` như trước.

Nếu dùng database từ bản còn cơ sở, xem [chuyển dữ liệu một lần](back-end/SINGLE-STORE.md).

## Mã ưu đãi và nhập hàng

Trang chủ hiển thị khuyến mãi tự động thành từng hàng ảnh lớn; mã giảm giá và mã giao hàng nằm ở hàng thẻ có nền ảnh riêng, có nút sao chép. Khi chưa có ảnh, thẻ dùng nền chuyển sắc xanh.

Khi nhập Excel/CSV, chọn nhà cung cấp trước khi kiểm tra. Ở bước kiểm tra, bấm **Chỉnh sửa** tại từng dòng để sửa số lượng, giá vốn, giá niêm yết, lô, hạn dùng và link ảnh. **Lưu và kiểm tra lại** kiểm tra toàn bộ file; chỉ gửi duyệt khi tất cả dòng hợp lệ. Việc sửa bản nháp chưa cập nhật tồn kho.

## Logo

Logo giỏ lá Agri-Mart nền trong suốt được lưu tại `src/assets/images/agri-mart-logo.png` của cả ba giao diện. Các component `Logo` dùng ảnh này; favicon dùng biểu tượng giỏ lá rút gọn.

Ảnh được chỉnh bằng công cụ `imagegen` tích hợp, chế độ chỉnh sửa ảnh tham chiếu. Prompt: giữ giỏ lá và chữ “Agri-Mart”, chuyển xanh đậm sang xanh lá nhạt dịu (khoảng #4f8a50), giảm độ dày nét giỏ/chữ khoảng 25–30%, giữ nền trong suốt, không thêm chữ, bóng hoặc khung nền.
