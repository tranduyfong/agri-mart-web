File `thu-nghiem-mot-sku-nhieu-lo.xlsx` dùng để thử giá bán theo lô và thống kê nhà cung cấp:

- 12 dòng, 6 sản phẩm/SKU; mỗi SKU có hai lô cùng quy cách **Túi 500g**.
- Lô A: 2 túi, giá bán 50.000đ, hạn 30/11/2026; lô B: 5 túi, giá 60.000đ, hạn 03/12/2026.
- Chọn nhà cung cấp khi nhập file, kiểm tra dữ liệu rồi gửi admin duyệt. Sản phẩm mới vẫn ở bản nháp; thêm ảnh và đăng bán để thử phía khách.
- Mua 3 túi của một SKU phải ra **160.000đ tiền hàng**, chưa ưu đãi/phí giao. Cả file nhập **42 túi**, giá trị nhập **1.410.000đ**; thống kê nhà cung cấp chỉ tăng sau duyệt.
- Cột ảnh để trống và vẫn hợp lệ. Nếu danh mục `demo-trai-cay` không có, thay bằng slug danh mục của bạn.
- Tránh nhập lại cùng file nếu không muốn cộng thêm tồn.

Tạo lại file với mã mới và ngày tương đối theo ngày chạy (backend mở sẽ lấy slug danh mục thực tế):

```powershell
python test-data/tao_excel_nhieu_lo.py
```

Kiểm tra bằng parser FE và quy tắc preview backend, không ghi database:

```powershell
node test-data/kiem-tra-file-nhieu-lo.cjs
```
