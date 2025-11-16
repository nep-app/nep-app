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
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
