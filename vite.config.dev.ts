import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'

// 开发环境专用配置
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    host: true,
    // 开发环境优化
    hmr: {
      overlay: false // 禁用错误覆盖层
    },
    // 开发时模拟API
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  // 开发环境不启用Service Worker
  define: {
    __DEV__: true,
    __PROD__: false,
    // 开发时禁用Service Worker
    'process.env.NODE_ENV': '"development"'
  }
})
