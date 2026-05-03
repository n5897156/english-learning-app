import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/english-learning-app/',
  build: {
    // 添加哈希后缀，解决缓存问题
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // 为文件名添加哈希
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
  },
})
