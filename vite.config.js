import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/yujing/', // 替换为你的 GitHub 仓库名
  plugins: [vue()],
  resolve: {
    alias: {
      // 在 ESM 模式下，使用这种方式定义 @ 别名更稳定
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})