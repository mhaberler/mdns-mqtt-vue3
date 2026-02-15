import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  define: {
    global: 'globalThis',
    process: {
      env: {}
    }
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
      stream: 'stream-browserify',
      crypto: 'crypto-browserify'
    }
  },
  optimizeDeps: {
    include: ['buffer', 'process']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('mqtt')) {
              return 'vendor-mqtt'
            }
            if (id.includes('vue')) {
              return 'vendor-vue'
            }
            return 'vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
