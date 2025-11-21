import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/nep-app/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        format: 'es',
        // Removed inlineDynamicImports to enable code-splitting
        entryFileNames: 'app.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
