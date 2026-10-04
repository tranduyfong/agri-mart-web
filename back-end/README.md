# Backend bước 2 — xác thực tài khoản

## Cập nhật từ bước 1

1. Dừng server bằng Ctrl+C và sao lưu thư mục hiện tại.
2. Chép nội dung thư mục back-end trong ZIP vào back-end của bạn. Giữ nguyên .env trên máy bạn. ZIP không chứa .env bí mật, không sửa dữ liệu database và không kèm node_modules.
3. Không có thư viện mới: dùng các dependencies/package-lock cũ. Nếu đã npm ci ở bước 1 thì không cần cài lại. Nếu tạo thư mục mới, chạy npm ci.
4. Trong MySQL Workbench chọn đúng database đã tạo v2/v2.1, chạy sql/01_seed_roles.sql. Chỉ thêm admin/staff/customer còn thiếu, không tạo tài khoản admin. Không chạy lại CREATE DATABASE hay migration.
5. Kiểm tra DB_* như lúc health/db đã kết nối. EMAIL_USER và EMAIL_PASS giữ từ .env cũ; cấu hình dùng Gmail như backend mẫu. EMAIL_PASS cần thông tin đăng nhập SMTP hợp lệ (Gmail thường dùng App Password), không mặc định mật khẩu đăng nhập Gmail thông thường.
6. JWT_SECRET ít nhất 32 byte. Nếu khóa cũ ngắn, tạo khóa trên máy bằng lệnh: node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))". Chép kết quả vào .env, không gửi bí mật lên chat. JWT_EXPIRES_IN=1d. OTP_SECRET tùy chọn, tối thiểu 32 byte nếu đặt; nếu trống dùng JWT_SECRET với HMAC có phân biệt mục đích.
7. npm run dev. Nếu thiếu/khóa JWT ngắn server báo rõ cấu hình cần sửa. npm test chạy 23 test unit (20 auth, 3 response) không gửi email và không cần MySQL.
8. Import docs/Auth_Step2.postman_collection.json vào Postman. Đổi collection variable email thành email bạn có thể nhận thư; các mật khẩu mẫu chỉ dùng thử, không dùng cho tài khoản thật.

## Luồng thử theo thứ tự

A. Gọi 01 Đăng ký -> nhận email mã 6 chữ số, HTTP 201; điền variable registerCode -> gọi 02 Xác minh -> gọi 03 Đăng nhập. Postman tự lưu accessToken khi đăng nhập thành công. Gọi 04 /me phải HTTP 200.

B. Nếu chưa nhận mã đăng ký, chờ ít nhất 60 giây và gọi 05 Gửi lại mã. Mã mới làm mã cũ vô hiệu. Endpoint trả chung để không tiết lộ email đã tồn tại; kiểm tra spam và terminal nếu không nhận được. Không gọi 05 như bước bắt buộc sau khi đã xác minh.

C. Gọi 06 Quên mật khẩu -> nhận email -> điền resetCode -> gọi 07 Xác minh mã khôi phục. Postman tự lưu resetToken. Gọi 08 Đặt mật khẩu mới. Gọi /me bằng accessToken cũ phải bị 401. Gọi 09 Đăng nhập mật khẩu mới -> /me lại thành công. Gọi lại 08 với resetToken cũ phải bị từ chối.

D. Gọi 10 Đăng xuất -> /me với token đó bị 401. Logout trong bản này thu hồi mọi thiết bị vì dùng token_version. Nếu muốn thử 11 Đổi mật khẩu, đăng nhập lại bằng 09 trước, rồi gọi 11. Sau đổi mật khẩu, đăng nhập lại với nextPassword (sửa body login); token cũ mất hiệu lực.

Không dùng Collection Runner chạy toàn bộ một lượt: phải dừng để nhập OTP từ email và xử lý các nhánh tùy chọn. Không gửi quá nhiều yêu cầu liên tục vì có rate limit.

## API

| Method | Path dưới /api/auth | Dữ liệu chính | Token |
|---|---|---|---|
| POST | /register | email,password,confirmPassword,fullName,phone tùy chọn | Không |
| POST | /verify-email | email,code (chuỗi 6 số) | Không |
| POST | /resend-verification | email | Không |
| POST | /login | email,password | Không |
| POST | /forgot-password | email | Không |
| POST | /verify-reset-code | email,code | Không |
| POST | /reset-password | resetToken,newPassword,confirmPassword | Quyền reset riêng |
| GET | /me | Không | Bearer |
| POST | /change-password | currentPassword,newPassword,confirmPassword | Bearer |
| POST | /logout | Không | Bearer |

Health và health/db từ bước 1 giữ nguyên. Response: code,message,requestId,serverTime,data. Locale=vi để nhận thông báo tiếng Việt, Locale=en tiếng Anh. X-Request-Id hợp lệ được giữ ở header/body. Không trả password_hash, code_hash hay reset_token_hash qua API.

## Cách hoạt động

- Mật khẩu bcrypt 12 rounds, tối thiểu 8 ký tự và tối đa 72 byte UTF-8 để tránh cắt ngầm. Không trim mật khẩu. Confirm không lưu database.
- Đăng ký chỉ gán role customer, bỏ qua role/status do client gửi. User PENDING chưa đăng nhập được. Đăng ký lại PENDING sau cooldown cập nhật dữ liệu cùng một mã mới trong transaction; mã cũ hết hiệu lực. Không sửa tài khoản ACTIVE/LOCKED/DELETED qua đăng ký.
- OTP random 6 số, HMAC gắn user+purpose, hạn 10 phút, tối đa 5 lần sai, gửi lại sau 60 giây. Lần sai được commit ngay cả khi API trả 400. OTP REGISTER không dùng để reset và ngược lại.
- Verify reset cấp token ngẫu nhiên 32 byte; DB lưu SHA-256. Token sống 10 phút, dùng một lần. Đổi/reset mật khẩu tăng token_version và hủy challenge còn hoạt động. Không đăng nhập tự động sau verify hoặc reset.
- JWT HS256, issuer/audience cố định, mỗi protected request kiểm tra user ACTIVE/deleted_at/token_version trong DB. Chưa có refresh token; hết JWT đăng nhập lại. Role hiện tại lấy từ DB, không tin role client.
- User row được lock trước challenge. Email gửi sau commit, không giữ transaction trong lúc chờ SMTP. Nếu SMTP lỗi, challenge vừa gửi bị vô hiệu; đăng ký trả EMAIL_SEND_FAILED nhưng tài khoản vẫn PENDING. Resend/forgot trả thông báo chung cả khi không có tài khoản/cooldown/gửi lỗi, log event auth_email_failed không chứa email, OTP hay mật khẩu. Thông báo chung không bảo đảm che mọi chênh lệch thời gian.
- Sau đăng ký EMAIL_SEND_FAILED: chờ 60 giây rồi gửi lại mã; không cần xóa user PENDING.
- Tất cả /auth: 120 yêu cầu/15 phút/IP. Đăng ký/gửi lại/quên: chung 10/10 phút/IP. Đăng nhập/thử mã/reset/đổi: chung 30/15 phút/IP. Rate limit memory dành cho một tiến trình, reset khi restart; cần shared store khi chạy nhiều instance. Không bật trust proxy tùy tiện.
- Không có Google/Apple, 2FA, tài khoản admin mặc định, API tạo role hay seed mật khẩu. Việc Gmail dùng App Password là cấu hình hộp thư gửi, không phải thêm 2FA cho người dùng website.

## Cấu trúc và những file thêm

configs/auth.config.js, mailer.config.js; controllers/auth.controllers.js; services/auth.services.js; routes/auth.routes.js; middlewares/auth.middleware.js, auth-validation.middleware.js, rate-limit.middleware.js; utils/app-error.util.js, auth-security.util.js, mail.util.js. Các file index/routes index/error middleware và package script được cập nhật. Vẫn JS CommonJS, mysql2 raw SQL, chưa thay cấu trúc dự án.

## Kiểm chứng và giới hạn

22 file JS qua node --check. 23 unit tests đạt: token/hash/validation, transaction commit lần OTP sai, rollback lỗi DB, mã hết hạn/hết lượt/đã dùng, kích hoạt đăng ký, reset token, thu hồi session, không nhận role từ client, JWT options, rate limit. Test service dùng DB/JWT/bcrypt/SMTP doubles; không chứng minh MySQL concurrency hay JWT library integration.

Chưa chạy Express/MySQL/SMTP end-to-end tại môi trường tạo gói. npm ci offline không thực hiện được vì cache thiếu dependencies; không gửi email thật hoặc truy cập database của bạn. Không có migration schema mới; chỉ seed roles. Các kiểm tra thực tế cần thực hiện trên máy bạn theo các luồng A–D.

Tài liệu thư viện: https://nodemailer.com/guides/using-gmail ; https://github.com/auth0/node-jsonwebtoken ; https://github.com/dcodeIO/bcrypt.js .
