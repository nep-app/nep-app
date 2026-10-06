import defaultColors from 'tailwindcss/colors';

// ===== CORES COMO VARIÁVEIS (para os temas de experiência do modo demo) =====
// Cada cor do Tailwind passa a ler uma variável CSS, e a variável tem como
// valor por defeito EXACTAMENTE a cor original. Sem tema aplicado, a app fica
// pixel a pixel igual. O modo demo pode trocar as variáveis (src/demo/themes.js)
// e a app inteira muda de paleta sem mexer nos ecrãs um a um.
const FAMILIES = [
  'gray', 'slate', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];
const hexToTriplet = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(' ');
};
const asVar = (name, hex) => `rgb(var(--c-${name}, ${hexToTriplet(hex)}) / <alpha-value>)`;
const themedColors = { white: asVar('white', '#ffffff'), black: asVar('black', '#000000') };
for (const fam of FAMILIES) {
  themedColors[fam] = {};
  for (const [shade, hex] of Object.entries(defaultColors[fam])) {
    themedColors[fam][shade] = asVar(`${fam}-${shade}`, hex);
  }
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: themedColors,
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
