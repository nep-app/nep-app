import React from 'react';
import { useTranslation } from 'react-i18next';

// Escala de 1 a 10 (humor ou energia), um toque por linha.
// Todos os números à vista; palavras só nas pontas; ao lado do título, quando
// há número escolhido, aparece a palavra desse número ("6 · assim-assim").
// Tocar outra vez no mesmo número desmarca: fica em branco — nunca se inventa
// um valor por defeito. Nenhum número tem cor própria (roxo = escolhido).
// Usada no bem-estar rápido (WellbeingModal) e no "Como acordaste?" (CycleModal).

const WORDS = {
  pt: {
    mood: ['muito em baixo', 'em baixo', 'assim-assim', 'bem', 'muito bem'],
    energy: ['nenhuma', 'pouca', 'média', 'alguma', 'muita'],
  },
  en: {
    mood: ['very low', 'low', 'so-so', 'good', 'very good'],
    energy: ['none', 'little', 'medium', 'some', 'lots'],
  },
};

// 1–2 → 0, 3–4 → 1, 5–6 → 2, 7–8 → 3, 9–10 → 4
export const scaleWord = (kind, n, lang = 'pt') => {
  if (!Number.isFinite(n) || n < 1 || n > 10) return '';
  const w = (WORDS[lang === 'en' ? 'en' : 'pt'] || WORDS.pt)[kind] || [];
  return w[Math.min(4, Math.floor((Math.round(n) - 1) / 2))] || '';
};

export const Scale10 = ({ kind = 'mood', value, onChange, title }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'pt';
  const n = value === '' || value == null ? null : parseInt(value, 10);
  const cur = Number.isFinite(n) ? n : null;
  const words = WORDS[lang][kind] || WORDS[lang].mood;
  const label = title || (kind === 'energy' ? (lang === 'en' ? 'Energy' : 'Energia') : (lang === 'en' ? 'Mood' : 'Humor'));
  return (
    <div role="group" aria-label={label}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        {cur != null && (
          <span className="text-xs text-gray-300"><span className="font-mono-theme font-bold text-white">{cur}</span> · {scaleWord(kind, cur, lang)}</span>
        )}
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(v => {
          const on = cur === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              aria-label={`${label} ${v} · ${scaleWord(kind, v, lang)}`}
              onClick={() => onChange(on ? null : v)}
              className={'h-9 min-h-[32px] rounded-lg border font-mono-theme text-sm transition-colors ' + (on ? 'bg-purple-600 border-purple-300 text-white font-bold' : 'bg-gray-700/50 border-gray-600 text-gray-200 hover:border-gray-400')}
            >
              {v}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-gray-500 mt-0.5">
        <span>{words[0]}</span>
        <span>{words[4]}</span>
      </div>
    </div>
  );
};

export default Scale10;
