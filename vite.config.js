import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // This is a more robust way to do the alias without needing 'path'
      '@': '/src',
    },
  },
  base: '/FBLA-LOSTANDFOUND/',
})