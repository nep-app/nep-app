// ===== TEMAS DE CORES =====
// Nasceram no demo, para a Teresa ver as direcções visuais com os ecrãs todos.
// Os escolhidos (Riso e Bauhaus) passaram também para a app a sério, como
// opção nas Definições (só deste dispositivo; Riso por defeito, 'atual' =
// as cores de sempre).
// Só se aplicam com a app destrancada: no PIN e na calculadora do disfarce a
// app continua com o aspeto de sempre.
//
// Como funciona: o tailwind.config.js põe cada cor do Tailwind a ler uma
// variável CSS (--c-gray-800, --c-purple-600, …). Aqui calcula-se, para cada
// tema, o valor de todas essas variáveis a partir de meia dúzia de cores-base.
//
//  - Cinzentos: vão do texto (50) ao fundo (950). Num tema claro isto inverte
//    sozinho a app, que foi escrita para fundo escuro.
//  - Famílias de destaque (roxo, azul, rosa, verde-azulado…): cada grupo
//    recebe uma cor do tema. Tons baixos puxam para o texto, altos para o fundo.
//  - Famílias com SIGNIFICADO (verde, vermelho, amarelo, laranja…): mantêm a
//    cor original — avisos e metas continuam a ler-se como antes —, só se
//    ajusta a claridade ao fundo do tema para não perder contraste.

// Letras dos temas, servidas pela própria app (a CSP não deixa ir buscar
// letras a fora, e assim também não se avisa a Google de nada). O CSS é
// pequeno; os ficheiros das letras só descarregam se um tema as usar.
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/unbounded/800.css';

// Tom 500 do Tailwind de cada família com significado (copiado para não
// carregar a biblioteca de cores inteira na app).
const MEANING_500 = { red: '#ef4444', orange: '#f97316', amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16', green: '#22c55e', emerald: '#10b981' };

const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const NEUTRALS = ['gray', 'slate', 'zinc', 'neutral', 'stone'];
const GROUPS = {
  a: ['purple', 'violet', 'indigo', 'fuchsia'], // botões principais
  b: ['blue', 'sky', 'cyan'],
  c: ['pink', 'rose'],
  d: ['teal'],
};

// Quanto cada tom se afasta do texto (0) para o fundo (1), nos cinzentos.
const NEUTRAL_T = { 50: 0, 100: 0.05, 200: 0.12, 300: 0.22, 400: 0.38, 500: 0.52, 600: 0.66, 700: 0.78, 800: 0.87, 900: 0.95, 950: 1 };
// Nos destaques: abaixo de 500 mistura com o texto, acima mistura com o fundo.
const ACCENT_MIX = { 50: ['ink', 0.85], 100: ['ink', 0.7], 200: ['ink', 0.5], 300: ['ink', 0.3], 400: ['ink', 0.15], 500: [null, 0], 600: ['bg', 0.2], 700: ['bg', 0.4], 800: ['bg', 0.6], 900: ['bg', 0.75], 950: ['bg', 0.85] };

const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const triplet = (c) => c.join(' ');
const luminance = (c) => {
  const [r, g, b] = c.map(v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// `app: true` = também aparece nas Definições da app a sério. Os outros só
// existem no demo, para comparar.
export const DEMO_THEMES = [
  { id: 'riso', name: 'Multicor · Riso', bg: '#111111', ink: '#F4F1EA', a: '#FF48B0', b: '#6EC1FF', c: '#9F86D9', d: '#00A99D', font: 'vv', app: true },
  { id: 'bauhaus', name: 'Multicor · Bauhaus (claro)', bg: '#F1ECE2', ink: '#141414', a: '#C4421C', b: '#2F56C2', c: '#BC3A72', d: '#17785C', font: 'vv', light: true, app: true },
  { id: 'pastel', name: 'Multicor · Pastel', bg: '#15131A', ink: '#F2EEF5', a: '#C3B1E1', b: '#9CC7E8', c: '#E8A0C4', d: '#9ED9B9', font: 'vv' },
  { id: 'ameixa', name: 'Ameixa e lilás', bg: '#1A1220', ink: '#F1EAF5', a: '#C9B2EC', b: '#9CC7E8', c: '#E8A0C4', d: '#9ED9B9', font: 'vv' },
  { id: 'petroleo', name: 'Petróleo e laranja', bg: '#0B1A1A', ink: '#E9F0EE', a: '#FF8A3D', b: '#6EC1FF', c: '#FFB38A', d: '#4FD1C5', font: 'vv' },
  { id: 'void', name: 'Void terminal', bg: '#05060A', ink: '#F2F2F0', a: '#9DFF3C', b: '#FF10D0', c: '#FF10D0', d: '#4FE8DE', font: 'vv' },
  { id: 'amarelo', name: 'Amarelo rizoma (claro)', bg: '#F5CC00', ink: '#05060A', a: '#FF6FDF', b: '#B49BFF', c: '#FF6FDF', d: '#FFFFFF', font: 'vv', light: true },
  { id: 'osso', name: 'Preto e osso', bg: '#0B0B0B', ink: '#EDEAE3', a: '#D8D4CB', b: '#B5B2AA', c: '#D8D4CB', d: '#B5B2AA', font: 'vv' },
];
export const APP_THEMES = DEMO_THEMES.filter(t => t.app);

export const DEMO_THEME_KEY = 'nep_demo_theme';

// Na app a sério (fora do demo) a escolha é só deste dispositivo e só muda o
// aspeto: 'atual' (ou nada) = as cores de sempre.
export const APP_THEME_KEY = 'nep_theme';
// Por defeito (desde a v6.67.0) é o Riso para toda a gente; 'atual' (as
// cores de sempre) só se a pessoa o escolher.
export const DEFAULT_APP_THEME = 'riso';
export const readAppTheme = () => {
  try {
    const v = localStorage.getItem(APP_THEME_KEY);
    if (v === 'atual') return 'atual';
    return APP_THEMES.some(t => t.id === v) ? v : DEFAULT_APP_THEME;
  } catch { return DEFAULT_APP_THEME; }
};
const themeListeners = new Set();
export const saveAppTheme = (id) => {
  try {
    localStorage.setItem(APP_THEME_KEY, APP_THEMES.some(t => t.id === id) ? id : 'atual');
  } catch { /* fica só nesta sessão */ }
  themeListeners.forEach(fn => fn());
};
// Para o React saber quando a escolha muda (ex.: o cabeçalho compacto).
export const subscribeAppTheme = (fn) => { themeListeners.add(fn); return () => themeListeners.delete(fn); };

const varsFor = (theme) => {
  const bg = rgb(theme.bg);
  const ink = rgb(theme.ink);
  const out = {};
  const ends = { ink, bg };

  for (const fam of NEUTRALS) {
    for (const s of SHADES) {
      let c = mix(ink, bg, NEUTRAL_T[s]);
      // Cinzentos 400–500 são o texto secundário: têm de se ler no fundo.
      if (s === '400' || s === '500') {
        let k = 0;
        while (contrast(c, bg) < 4.5 && k < 20) { c = mix(c, ink, 0.08); k++; }
      }
      out[`--c-${fam}-${s}`] = triplet(c);
    }
  }
  // Os tons 500–700 são os dos botões e etiquetas cheias, quase sempre com
  // texto "branco" por cima (que aqui é o texto do tema). Um destaque claro
  // num tema escuro (ou escuro num claro) deixava o texto ilegível: estes tons
  // são empurrados para o fundo até o texto ter contraste de leitura (4,5:1).
  const FILL_SHADES = new Set(['500', '600', '700']);
  const TEXT_SHADES = new Set(['200', '300', '400']);
  const accentScale = (base, prefix) => {
    for (const s of SHADES) {
      const [toward, t] = ACCENT_MIX[s];
      let c = toward ? mix(base, ends[toward], t) : base;
      if (FILL_SHADES.has(s)) {
        let k = 0;
        while (contrast(c, ink) < 4.5 && k < 20) { c = mix(c, bg, 0.08); k++; }
      }
      // Os tons 200–400 são quase sempre TEXTO de cor por cima do fundo. Num
      // tema claro (creme), um pastel ficava ilegível: puxam-se para o texto
      // até se lerem bem contra o fundo (4,5:1).
      if (TEXT_SHADES.has(s)) {
        let k = 0;
        while (contrast(c, bg) < 4.5 && k < 20) { c = mix(c, ink, 0.08); k++; }
      }
      out[`--c-${prefix}-${s}`] = triplet(c);
    }
  };
  for (const [g, fams] of Object.entries(GROUPS)) {
    for (const fam of fams) accentScale(rgb(theme[g]), fam);
  }
  for (const [fam, hex] of Object.entries(MEANING_500)) accentScale(rgb(hex), fam);

  // Texto "branco" passa a ser o texto do tema (num tema claro, escuro).
  out['--c-white'] = triplet(ink);
  return out;
};

let applied = [];

export function applyDemoTheme(id) {
  const root = document.documentElement;
  for (const k of applied) root.style.removeProperty(k);
  applied = [];
  root.removeAttribute('data-demo-font');

  const theme = DEMO_THEMES.find(t => t.id === id);
  if (!theme || !theme.bg) return; // "Atual": sem variáveis, cores originais

  const vars = varsFor(theme);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  applied = Object.keys(vars);
  if (theme.font) root.setAttribute('data-demo-font', theme.font);
  root.style.colorScheme = theme.light ? 'light' : 'dark';
  applied.push('color-scheme');
}
