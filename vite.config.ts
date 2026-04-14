import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves from /PDF-ido/ — must match the repo name exactly
  base: process.env.GITHUB_ACTIONS ? '/PDF-ido/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
          pdflib: ['pdf-lib'],
          vendor: ['react', 'react-dom', 'zustand', 'framer-motion'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  server: {
    port: 5173,
  },
})
