import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 本地开发代理：web 请求 /api 开头 → 转发到 collector(4000)，避免跨域
    // 生产部署时 web/collector 同域，天然免 CORS，不需要这个
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // 转发时把 /api 前缀去掉：/api/failures → http://localhost:4000/failures
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
