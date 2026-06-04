// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['tonie-untimid-avah.ngrok-free.dev'], // 👈 Important line
    proxy: {
      '/api': {
        target: 'https://tonie-untimid-avah.ngrok-free.dev', // Backend ka URL
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Only log for non-health endpoints to reduce noise
            if (!req.url.includes('/health') && !req.url.includes('/api/auth/url-checks')) {
              console.log('Sending Request to Target:', req.method, req.url);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // Only log for non-health endpoints to reduce noise
            if (!req.url.includes('/health') && !req.url.includes('/api/auth/url-checks')) {
              console.log('Received Response from Target:', proxyRes.statusCode, req.url);
            }
          });
        },
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