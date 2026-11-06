// Plugin React/Tailwind dựng giao diện; server.port tách cổng chạy ứng dụng nhân viên khỏi trang khách/admin.
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [react(), tailwindcss()], server: { port: 5175 } });
