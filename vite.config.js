import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // 1. Add this import

export default defineConfig({
  plugins: [react()],
  base: '/FBLA-LOSTANDFOUND/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // 2. Add this alias
    },
  },
})