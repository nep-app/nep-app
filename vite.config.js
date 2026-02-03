import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/nep-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false // Desativa SW em dev (evita conflitos com HMR)
      },
      workbox: {
        // 🎯 ESTRATÉGIA ENXUTA: Só cachear assets estáticos críticos
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // Cache runtime otimizado
        runtimeCaching: [
          {
            // ❌ NUNCA cachear Firebase APIs (deixar SDK gerir)
            urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // ⚡ JS chunks: NetworkFirst (rede primeiro, cache se offline)
            urlPattern: /\.js$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-cache',
              expiration: {
                maxEntries: 30, // Limite baixo (enxuto)
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],

        // Sem cache agressivo de navegação
        navigateFallback: null,
      },

      manifest: {
        name: 'NEP - Redução de Danos',
        short_name: 'NEP',
        description: 'Tracking e harm reduction',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone', // Fullscreen (sem barra URL)
        orientation: 'portrait',
        scope: '/nep-app/',
        start_url: '/nep-app/',
        icons: [
          // Desktop (Chrome precisa de 'any' sem maskable)
          {
            src: '/nep-app/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/nep-app/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          // Mobile (Android adaptive icons)
          {
            src: '/nep-app/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/nep-app/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'docs',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,  // DESATIVADO para debug de sync
        drop_debugger: true,
        // pure_funcs removido para permitir logs
        passes: 2
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: 'app-[hash].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-charts': ['d3-scale', 'd3-shape', 'd3-array']
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
})
