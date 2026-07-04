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
            // match the package path, not the absolute path — the project
            // directory name contains 'mqtt' and 'vue'
            const pkg = id.split('node_modules/').pop()
            if (pkg.startsWith('mqtt')) {
              return 'vendor-mqtt'
            }
            if (pkg.startsWith('gridstack')) {
              return 'vendor-gridstack'
            }
            if (pkg.startsWith('jsonata')) {
              return 'vendor-jsonata'
            }
            if (pkg.startsWith('uplot')) {
              return 'vendor-uplot'
            }
            if (pkg.startsWith('vue') || pkg.startsWith('@vue')) {
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
