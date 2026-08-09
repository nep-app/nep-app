/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Fonte de destaque arredondada e quente — usa a do sistema (SF Pro
        // Rounded no iOS/macOS, fallback gracioso no resto). Sem webfonts (a CSP
        // bloqueia fontes externas) e sem custo de carregamento.
        display: ['ui-rounded', '"SF Pro Rounded"', '"Hiragino Maru Gothic ProN"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(4deg)' },
        },
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
        fadeInUp: 'fadeInUp 0.35s ease-out both',
        scaleIn: 'scaleIn 0.2s ease-out both',
        sway: 'sway 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
