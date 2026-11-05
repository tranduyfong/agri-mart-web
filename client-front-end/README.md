# React + TypeScript + Vite

## Nhắn tin hỗ trợ

Bong bóng chat nằm ở góc dưới bên phải, giữ nguyên khi chuyển trang. Khách hàng đăng nhập có thể gửi chữ và tối đa 3 ảnh mỗi tin (JPG/PNG/WEBP/GIF, 5 MB/ảnh), bấm ảnh để xem lớn. Enter gửi tin, Shift + Enter xuống dòng.

Socket nhận thông báo trực tiếp; số đỏ là số tin chưa đọc và vẫn được giữ sau khi tải lại trang. Chỉ đánh dấu đọc khi khung chat đang mở, tab đang được xem và lịch sử ở gần cuối. Lịch sử cũ có nút tải thêm. Khi mất kết nối, ứng dụng thử kết nối lại và kiểm tra tin mới mỗi 10 giây.

Chạy backend cùng `npm run dev` trong project này. Địa chỉ API lấy từ `VITE_API_URL`; Socket dùng cùng địa chỉ máy chủ đó.

Khi backend bật Gemini, AI tự phản hồi và có thẻ sản phẩm kèm **Đặt sản phẩm này** hoặc **Đặt cả nhóm**. Nút đưa tới checkout, tự lấy địa chỉ mặc định và kiểm tra lại giá/kho, không thêm sản phẩm vào giỏ. Có nút **Gặp nhân viên**; AI dừng sau khi chuyển tiếp hoặc nhân viên tiếp nhận. Cấu hình API key chỉ nằm ở backend.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
