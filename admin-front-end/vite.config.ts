// Plugin React/Tailwind dựng giao diện; server.port dành cổng phát triển riêng cho ứng dụng quản trị.
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
export default defineConfig({ plugins: [react(), tailwindcss()], server: { port: 5177 } });
