import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        liff: path.resolve(__dirname, 'liff.html'),
      },
      output: {
        manualChunks: {
          // React関連を分離（変更頻度が低いためキャッシュ効率向上）
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // date-fnsを分離（サイズが大きいため）
          'vendor-date': ['date-fns'],
          // Supabaseを分離（認証ライブラリ）
          'vendor-supabase': ['@supabase/supabase-js'],
          // 状態管理を分離
          'vendor-state': ['zustand', 'axios'],
          // LIFF SDKを分離
          'vendor-liff': ['@line/liff'],
          // SWRを分離
          'vendor-swr': ['swr'],
        },
      },
    },
  },
})
