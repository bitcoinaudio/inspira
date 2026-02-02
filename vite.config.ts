import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const gatewayTarget = (env.VITE_GATEWAY_SERVER_URL || 'https://samplepacker.bitcoinaudio.co').trim()
  const beatfeedTarget = (env.VITE_BEATFEED_URL || 'https://api.beatfeed.xyz').trim()

  return {
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['tone']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Note: COOP/COEP headers disabled for development compatibility
    // Enable these in production if SharedArrayBuffer is needed for Tone.js AudioWorklet
    // headers: {
    //   'Cross-Origin-Opener-Policy': 'same-origin',
    //   'Cross-Origin-Embedder-Policy': 'require-corp'
    // },
    proxy: {
      "/api": {
        target: gatewayTarget,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      "/beatfeed-api": {
        target: beatfeedTarget,
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
  }
})
