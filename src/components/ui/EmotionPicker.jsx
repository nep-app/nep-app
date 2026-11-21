import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EMOTION_FAMILIES, FAMILY_OF, EMOTION_EN, applyWordForm } from '../../constants/emotions';
import { useWordForm } from '../../hooks/useWordForm';

// Seletor de emoções (v8.8.0): 9 famílias em grelha 3×3 + por cima "As tuas"
// (as 4 mais escolhidas nos registos de bem-estar da pessoa; sem dados, não
// aparece). Tocar numa família já conta; por baixo aparecem as palavras finas
// dessa família, para escolher se quiser.
// Dados: grava as MESMAS strings de sempre (ver EMOTION_FAMILIES). Família +
// palavra fina da mesma família → grava só a palavra fina.
// Cores neutras: roxo só para o que está escolhido; nenhuma família é "boa"
// ou "má".
// Usado no Bem-estar (WellbeingModal) e no registo só de emoções (EmotionsModal).

const strip = (s) => String(s || '').replace(/^[^\p{L}\p{N}]+/u, '');
const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export const EmotionPicker = ({ value = [], onChange, logs = [], title }) => {
  const { t, i18n } = useTranslation();
  const en = i18n.language === 'en';
  const form = useWordForm();
  // Famílias tocadas NESTA vez (na caixa ou em "As tuas"). Só nestas a palavra
  // fina substitui o valor da família — um registo antigo que já tinha, p. ex.,
  // "Cansado/a" + "Apático/a" não perde nada ao ser editado.
  const picked = useRef(new Set());
  const chosen = Array.isArray(value) ? value : [];

  const wordLabel = (e) => lowerFirst(strip(en ? (EMOTION_EN[e] || e) : applyWordForm(e, form)));
  const famLabel = (f) => (en ? f.en : applyWordForm(f.pt, form));
  const labelOf = (e) => {
    const f = FAMILY_OF[e];
    return f && f.value === e ? famLabel(f) : wordLabel(e);
  };

  const famOn = (f) => chosen.includes(f.value) || f.words.some(w => chosen.includes(w));

  const tapFamily = (f) => {
    if (famOn(f)) {
      picked.current.delete(f.id);
      onChange(chosen.filter(e => e !== f.value && !f.words.includes(e)));
    } else {
      picked.current.add(f.id);
      onChange([...chosen, f.value]);
    }
  };

  const tapWord = (w) => {
    const f = FAMILY_OF[w];
    if (chosen.includes(w)) {
      let next = chosen.filter(e => e !== w);
      // Tirou a última palavra fina: a família continua escolhida se foi tocada.
      if (f && picked.current.has(f.id) && !f.words.some(x => next.includes(x)) && !next.includes(f.value)) {
        next = [...next, f.value];
      }
      onChange(next);
    } else {
      let next = [...chosen, w];
      if (f && picked.current.has(f.id)) next = next.filter(e => e !== f.value);
      onChange(next);
    }
  };

  const tap = (e) => {
    const f = FAMILY_OF[e];
    if (f && f.value === e) tapFamily(f); else tapWord(e);
  };

  // "As tuas": as 4 mais escolhidas nos registos de bem-estar (palavras finas
  // ou famílias, como foram gravadas). Só strings que o seletor conhece.
  const top = useMemo(() => {
    const c = {};
    (logs || []).forEach(l => (l?.emotions || []).forEach(e => { if (FAMILY_OF[e]) c[e] = (c[e] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([e]) => e);
  }, [logs]);

  const isOn = (e) => {
    const f = FAMILY_OF[e];
    return f && f.value === e ? famOn(f) : chosen.includes(e);
  };

  const openFams = EMOTION_FAMILIES.filter(f => famOn(f) && f.words.length > 0);
  // Strings antigas que nenhuma família conhece (formatos muito antigos):
  // mostram-se escolhidas, para se poderem tirar; nunca se apagam sozinhas.
  const others = chosen.filter(e => !FAMILY_OF[e]);

  const chip = (e, key) => {
    const on = isOn(e);
    return (
      <button key={key || e} type="button" aria-pressed={on} onClick={() => tap(e)}
        className={'px-3 py-1.5 rounded-full text-xs border transition-colors ' + (on ? 'bg-purple-600 border-purple-300 text-white font-semibold' : 'bg-gray-700 border-gray-600 text-gray-200 hover:border-gray-400')}>
        {labelOf(e)}
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-300">{title || t('emotionPicker.title')}</div>
      {top.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">{t('emotionPicker.yours')}</div>
          <div className="flex flex-wrap gap-1.5">{top.map(e => chip(e, 'top-' + e))}</div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        {EMOTION_FAMILIES.map(f => {
          const on = famOn(f);
          return (
            <button key={f.id} type="button" aria-pressed={on} onClick={() => tapFamily(f)}
              // Roxo escolhido fixo (não muda com o tema; no Riso o "purple" do
              // Tailwind é cor-de-rosa) — o mesmo #7c4ddb dos botões cheios.
              style={on ? { backgroundColor: 'rgb(124 77 219 / 0.38)', borderColor: '#9b7be8' } : undefined}
              className={'rounded-2xl border py-2.5 px-1 flex flex-col items-center gap-0.5 transition-colors ' + (on ? 'text-white' : 'bg-gray-700/40 border-gray-600 text-gray-200 hover:border-gray-400')}>
              <span className="text-xl leading-none" aria-hidden="true">{f.emoji}</span>
              <span className="text-xs leading-tight text-center">{famLabel(f)}</span>
            </button>
          );
        })}
      </div>
      {openFams.length > 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-2 space-y-2">
          <div className="text-[11px] text-gray-400">{t('emotionPicker.fineHint')}</div>
          {openFams.map(f => (
            <div key={f.id}>
              {openFams.length > 1 && <div className="text-[10px] text-gray-500 mb-1">{f.emoji} {famLabel(f)}</div>}
              <div className="flex flex-wrap gap-1.5">{f.words.map(w => chip(w, f.id + '-' + w))}</div>
            </div>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {others.map(e => (
            <button key={'o-' + e} type="button" aria-pressed="true" onClick={() => onChange(chosen.filter(x => x !== e))}
              className="px-3 py-1.5 rounded-full text-xs border bg-purple-600 border-purple-300 text-white font-semibold">
              {en ? (EMOTION_EN[e] || e) : applyWordForm(e, form)} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmotionPicker;
