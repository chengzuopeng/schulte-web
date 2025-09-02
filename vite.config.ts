import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { cloudflare } from "@cloudflare/vite-plugin"

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve'
  
  return {
    plugins: [
      vue(),
      vueDevTools(),
      cloudflare()
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    // 开发环境优化
    server: {
      port: 5173,
      host: true,
      // 开发时禁用Service Worker更新检查
      headers: {
        'Service-Worker-Allowed': '/'
      }
    },
    // 构建优化
    build: {
      // 开发时不生成Service Worker
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router'],
            utils: ['@/utils/app-bridge', '@/utils/audio-cache', '@/utils/mobile-optimization']
          }
        }
      }
    },
    // 环境变量
    define: {
      __DEV__: isDev,
      __PROD__: !isDev
    }
  }
})
