# Hệ thống một cửa hàng

Đã xóa `models/branch.js`. Tồn kho chỉ gồm các lô hàng của từng SKU. Giỏ hàng, phiếu nhập, đơn hàng, bản tin, hội thoại và phân quyền không còn tham chiếu cơ sở. Một lần đặt hàng mới tạo một Order, tính phí giao một lần và chờ nhân viên duyệt trước khi khách thanh toán VNPay.

## Chuyển database cũ

Database đã từng chạy bản có Branch cần chuyển **một lần**, kể cả trước đây chỉ có một cơ sở. Database mới có thể chạy seed ngay.

1. Dừng backend và các tiến trình đang ghi database.
2. Trong thư mục `back-end`, xem trước:

```powershell
npm run migrate:single-store
```

3. Áp dụng:

```powershell
npm run migrate:single-store -- --apply
```

4. Khởi động lại backend và các frontend. Tải lại giỏ hàng trước khi tiếp tục đặt hàng.

Script dùng `MONGODB_URL` trong `.env`, cần MongoDB replica set. Mặc định chỉ đọc. Với `--apply`, script tạo bản sao dữ liệu gốc ở `back-end/backups/single-store-*.json` bằng MongoDB Extended JSON trước khi ghi; không ghi được bản sao thì không chuyển dữ liệu. Thư mục sao lưu được bỏ qua trong Git.

Quá trình chuyển giữ nguyên số lượng tồn, tiền đơn, trạng thái, lịch sử, thời điểm và mã giao dịch. Mã lô cũ được thêm ID nguồn để phân biệt các lô trùng tên; phiếu nhập và phân bổ trong đơn đổi cùng mã, giữ đúng giá vốn và lô hoàn hàng. Các dòng giỏ cùng SKU được gộp số lượng. Những phiếu cũ trùng khóa gửi lại giữ khóa ở phiếu đầu tiên, các phiếu còn lại đặt khóa thành null; bản sao giữ toàn bộ khóa gốc.

Thay đổi dữ liệu nghiệp vụ nằm trong một transaction. Sau khi commit, script thay index cũ bằng index chống trùng không phụ thuộc cơ sở và xóa collection `branches` đã được sao lưu. Nếu bước cập nhật index bị gián đoạn, chạy lại cùng lệnh để hoàn tất; script không cộng tồn hoặc thêm tiền đơn lần nữa. Backend phát hiện dữ liệu/index cũ và yêu cầu chuyển trước khi phục vụ API.

Đơn lịch sử đã tách nhiều phiếu vẫn giữ mã và tiến độ từng phiếu, không gộp mất lịch sử giao hàng/thanh toán. Đơn mới luôn có một phiếu. Giá vốn thiếu chứng từ vẫn báo thiếu dữ liệu.

Ngày 24/10/2026 đã áp dụng chuyển dữ liệu trên Atlas cấu hình trong `.env` để backend khởi động được. Bản sao dữ liệu trước chuyển nằm ở `backups/single-store-1792777852703.json` (không đưa vào Git). Database khác vẫn cần chạy lệnh chuyển nếu còn dữ liệu cũ.

## Kiểm tra

```powershell
npm test
npm run test:staff
npm run test:admin
npm run test:store
```

Các kiểm thử dùng database tạm và email giả. Luồng duyệt đơn, Socket.IO, giá nhập, hạn sử dụng, upload ảnh và báo cáo tiếp tục hoạt động với kho chung.
