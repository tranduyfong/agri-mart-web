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
