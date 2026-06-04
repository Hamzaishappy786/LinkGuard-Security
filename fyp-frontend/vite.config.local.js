// vite.config.local.js
// FULLY-LOCAL config: /api proxies to the local Flask backend (no ngrok needed).
// Your original vite.config.js (ngrok) is left untouched. This file is used only
// by "Start LinkGuard (Local).bat", via:
//     npm run dev -- --config vite.config.local.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // local Flask backend
        changeOrigin: true,
        secure: false,
      }
    }
  },
  optimizeDeps: {
    include: ['tesseract.js'],
    exclude: ['ws']
  },
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
