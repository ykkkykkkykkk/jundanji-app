import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 빌드 시 sw.js의 캐시 버전을 자동으로 타임스탬프로 교체
function swCacheVersionPlugin() {
  return {
    name: 'sw-cache-version',
    writeBundle() {
      const swPath = resolve(__dirname, 'dist', 'sw.js')
      try {
        let content = readFileSync(swPath, 'utf-8')
        content = content.replace('__BUILD_TIMESTAMP__', Date.now().toString())
        writeFileSync(swPath, content, 'utf-8')
      } catch (e) {
        console.warn('[sw-cache-version] sw.js not found in dist, skipping')
      }
    },
  }
}

// /admin 요청을 admin.html로 리다이렉트하는 플러그인
function adminRedirectPlugin() {
  return {
    name: 'admin-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/admin' || req.url === '/admin/') {
          req.url = '/admin.html'
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/admin' || req.url === '/admin/') {
          req.url = '/admin.html'
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    adminRedirectPlugin(),
    react(),
    swCacheVersionPlugin(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/qrcode')) {
            return 'vendor-qrcode'
          }
        },
      },
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
