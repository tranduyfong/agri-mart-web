// Vite dùng plugin React để chạy TSX và plugin Tailwind để tạo CSS từ các class trong source.
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
