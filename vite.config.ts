import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['tone']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    proxy: {
      "/api": {
        target: process.env.VITE_GATEWAY_SERVER_URL || "http://localhost:3003",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      "/beatfeed-api": {
        target: process.env.VITE_BEATFEED_URL || "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/beatfeed-api/, '/api'),
      },
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'tone': ['tone'],
          'ui': ['@headlessui/react', 'framer-motion'],
          'vendor': ['react', 'react-dom']
        }
      }
    }
  }
})
