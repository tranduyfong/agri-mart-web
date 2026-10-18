Giỏ hàng dùng các bảng `carts`, `cart_items`, `branch_stock` hiện có. Yêu thích dùng bảng mới `wishlist_items`.

Với database đã tạo trước đây, chạy trong thư mục `back-end`:

```sh
node migrations/apply-shopping.js
```

Database tạo mới bằng `database.sql` đã bao gồm bảng này. Các API `/api/cart` và `/api/wishlist` yêu cầu Bearer token của tài khoản đang đăng nhập.
