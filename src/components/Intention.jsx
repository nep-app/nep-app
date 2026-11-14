import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sanitizeText } from '../utils/validation';
import { safeToISODate, getTodayKey } from '../utils/helpers';

// ===== INTENÇÃO E "CORREU COMO QUERIAS?" =====
// Campos novos NO PRÓPRIO consumo (cifrados com o resto — não são índices em
// dexieEncryption.js, e o modo investigação não os envia):
//   intentions: string[]  — chaves da lista abaixo ou texto curto ("＋ outra")
//   how:        string[]  — chaves da lista "Como?"
//   evaluation: { outcome: 'yes'|'partly'|'no'|'dismissed', note?, at }
// Regras (decididas pela Teresa):
// - Registar continua a ser UM toque. Nada disto fica à frente do registo.
// - Tudo opcional. Ignorar = nunca mais se pergunta sobre esse consumo.
// - Nenhuma intenção é melhor do que outra: o mesmo peso visual para todas.
// - "não" é cinzento como as outras respostas (nunca vermelho).

// Ordem FIXA (é a ordem em que aparecem e em que se contam nas Análises).
export const INTENTION_KEYS = ['work', 'party', 'people', 'getThrough', 'notFeel', 'habit', 'dontKnow'];
export const HOW_KEYS = ['ateBefore', 'water', 'mixed', 'tested', 'accompanied', 'alone'];
export const OUTCOME_KEYS = ['yes', 'partly', 'no'];
const MAX_CUSTOM = 40;

const INTENTION_PT = {
  work: 'trabalhar', party: 'festa', people: 'estar com pessoas', getThrough: 'aguentar o dia',
  notFeel: 'não sentir', habit: 'hábito', dontKnow: 'não sei',
};
const HOW_PT = {
  ateBefore: 'comi antes', water: 'bebi água', mixed: 'misturei', tested: 'testei',
  accompanied: 'acompanhada/o', alone: 'sozinha/o',
};
const OUTCOME_PT = { yes: 'sim', partly: 'mais ou menos', no: 'não' };

export const intentionLabel = (t, key) => INTENTION_PT[key]
  ? t(`intention.opt.${key}`, INTENTION_PT[key])
  : String(key); // texto escrito pela pessoa ("＋ outra")
export const howLabel = (t, key) => HOW_PT[key] ? t(`intention.how.${key}`, HOW_PT[key]) : String(key);
export const outcomeLabel = (t, key) => t(`intention.outcome.${key}`, OUTCOME_PT[key] || key);

// Interruptor das Definições — DESLIGADO por defeito.
export const OUTCOME_SETTING_KEY = 'nep_ask_outcome';
export const isOutcomeAskOn = () => {
  try { return localStorage.getItem(OUTCOME_SETTING_KEY) === 'true'; } catch { return false; }
};

export const hasIntentionData = (c) => !!c && (
  (Array.isArray(c.intentions) && c.intentions.length > 0) ||
  (Array.isArray(c.how) && c.how.length > 0) ||
  (c.evaluation && OUTCOME_KEYS.includes(c.evaluation.outcome))
);

// Intenções escritas à mão ("＋ outra") já usadas, para voltarem a aparecer
// como botão. Ordem alfabética (fixa), no máximo 6.
export const customIntentionsFrom = (consumptions) => {
  const set = new Set();
  (consumptions || []).forEach(c => (Array.isArray(c?.intentions) ? c.intentions : [])
    .forEach(k => { if (typeof k === 'string' && k && !INTENTION_PT[k]) set.add(k); }));
  return [...set].sort((a, b) => a.localeCompare(b)).slice(0, 6);
};

const chipCls = (on) => 'text-[13px] px-3 py-1.5 rounded-full border transition-colors ' + (on
  ? 'bg-purple-600 border-purple-400 text-white font-semibold'
  : 'bg-gray-700/60 border-gray-600 text-gray-200 hover:bg-gray-700');

const toggle = (list, key) => (list.includes(key) ? list.filter(k => k !== key) : [...list, key]);

// As duas filas de botões ("O que querias?" e "Como?"). Várias escolhas.
export function IntentionPicker({ intentions = [], how = [], onChange, customOptions = [] }) {
  const { t } = useTranslation();
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');
  const ints = Array.isArray(intentions) ? intentions : [];
  const hows = Array.isArray(how) ? how : [];
  // Escritas à mão: as já usadas + as deste consumo (sem repetir).
  const customs = [...new Set([...customOptions, ...ints.filter(k => !INTENTION_PT[k])])];

  const addCustom = () => {
    const v = sanitizeText(draft).slice(0, MAX_CUSTOM);
    if (v && !ints.includes(v)) onChange({ intentions: [...ints, v], how: hows });
    setDraft(''); setWriting(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-200 mb-2">
          {t('intention.whatTitle', 'O que querias?')}
          <span className="text-xs font-normal text-gray-500 ml-2">{t('intention.optionalMany', 'opcional · podes escolher várias')}</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INTENTION_KEYS.map(k => (
            <button key={k} type="button" aria-pressed={ints.includes(k)} onClick={() => onChange({ intentions: toggle(ints, k), how: hows })} className={chipCls(ints.includes(k))}>
              {intentionLabel(t, k)}
            </button>
          ))}
          {customs.map(k => (
            <button key={'c-' + k} type="button" aria-pressed={ints.includes(k)} onClick={() => onChange({ intentions: toggle(ints, k), how: hows })} className={chipCls(ints.includes(k))}>
              {k}
            </button>
          ))}
          {!writing && (
            <button type="button" onClick={() => setWriting(true)} className="text-[13px] px-3 py-1.5 rounded-full border border-dashed border-gray-500 text-gray-400 hover:text-gray-200">
              ＋ {t('intention.other', 'outra')}
            </button>
          )}
        </div>
        {writing && (
          <div className="flex gap-2 mt-2">
            <input
              autoFocus
              value={draft}
              maxLength={MAX_CUSTOM}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              placeholder={t('intention.otherPlaceholder', 'escreve em poucas palavras')}
              className="flex-1 bg-gray-700 border border-gray-600 text-white text-sm px-3 py-2 rounded-lg focus:ring-2 focus:ring-purple-400"
            />
            <button type="button" onClick={addCustom} className="px-3 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700">
              {t('intention.add', 'juntar')}
            </button>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-200 mb-2">
          {t('intention.howTitle', 'Como?')}
          <span className="text-xs font-normal text-gray-500 ml-2">{t('intention.optional', 'opcional')}</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {HOW_KEYS.map(k => (
            <button key={k} type="button" aria-pressed={hows.includes(k)} onClick={() => onChange({ intentions: ints, how: toggle(hows, k) })} className={chipCls(hows.includes(k))}>
              {howLabel(t, k)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Barra pequena, NÃO bloqueante, depois do registo: "✓ Consumo registado · ＋ intenção".
// Some sozinha em ~5 s. Ignorar = não se pergunta mais sobre esse consumo.
export function RegisteredBar({ onAdd, onDone, ms = 5000 }) {
  const { t } = useTranslation();
  useEffect(() => {
    const id = setTimeout(onDone, ms);
    return () => clearTimeout(id);
  }, [onDone, ms]);
  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center px-4 pointer-events-none z-[80]">
      <div role="status" className="pointer-events-auto flex items-center gap-1 pl-4 pr-1.5 py-1.5 rounded-full bg-gray-800 border border-gray-600 shadow-lg text-sm text-gray-100 motion-safe:animate-fadeInUp">
        <span>✓ {t('intention.registered', 'Consumo registado')}</span>
        <span className="text-gray-500 mx-1">·</span>
        <button type="button" onClick={onAdd} className="px-3 py-1.5 rounded-full font-semibold text-purple-200 hover:bg-purple-500/20">
          ＋ {t('intention.addIntention', 'intenção')}
        </button>
      </div>
    </div>
  );
}

// Folha curta com as duas filas. Fechar sem guardar = não fica nada.
export function IntentionSheet({ open, onClose, onSave, customOptions = [] }) {
  const { t } = useTranslation();
  const [val, setVal] = useState({ intentions: [], how: [] });
  useEffect(() => { if (open) setVal({ intentions: [], how: [] }); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const empty = val.intentions.length === 0 && val.how.length === 0;
  return (
    <div className="fixed inset-0 z-[85] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={t('intention.sheetTitle', 'Intenção')}
        className="w-full max-w-md bg-gray-900 border-t border-gray-700 rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <IntentionPicker intentions={val.intentions} how={val.how} onChange={setVal} customOptions={customOptions} />
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600">
            {t('intention.notNow', 'Agora não')}
          </button>
          <button type="button" disabled={empty} onClick={() => onSave(val)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40">
            {t('common.save', 'Guardar')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hora do consumo como se diz no cartão: "das 14:05", "de ontem às 23:10".
const whenText = (t, lang, ts) => {
  const d = new Date(ts);
  const time = d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  const key = safeToISODate(d);
  const today = getTodayKey();
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (key === today) return t('intention.whenToday', { time, defaultValue: 'O consumo das {{time}}' });
  if (key === safeToISODate(y)) return t('intention.whenYesterday', { time, defaultValue: 'O consumo de ontem às {{time}}' });
  const date = d.toLocaleDateString(lang, { day: 'numeric', month: 'short' });
  return t('intention.whenDate', { time, date, defaultValue: 'O consumo de {{date}} às {{time}}' });
};

const MIN_H = 3, MAX_H = 36;
// Uma pergunta por abertura da app, no máximo: depois de responder ou dispensar,
// não aparece logo outra (nada de fila "por responder"). Volta a zero quando a
// app é aberta de novo (recarregar).
let sessionCardId = null;
let sessionCardDone = false;

// Escolhe o consumo a perguntar: o mais recente com 3 h a 36 h e sem avaliação
// (um consumo com `evaluation`, mesmo dispensado, nunca mais é perguntado).
export const pickOutcomeCandidate = (consumptions, now = Date.now()) => {
  let best = null, bestT = -Infinity;
  (consumptions || []).forEach(c => {
    if (!c || c.deleted || c.evaluation !== undefined) return;
    const ts = new Date(c.timestamp || c.createdAt).getTime();
    if (!Number.isFinite(ts)) return;
    const h = (now - ts) / 3600000;
    if (h >= MIN_H && h <= MAX_H && ts > bestT) { best = c; bestT = ts; }
  });
  return best;
};

// Cartão discreto no topo do Início. Só com o interruptor ligado.
export function OutcomeCard({ consumptions, onSave }) {
  const { t, i18n } = useTranslation();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [, force] = useState(0);
  const enabled = isOutcomeAskOn();

  const candidate = useMemo(() => {
    if (!enabled || sessionCardDone) return null;
    if (sessionCardId) {
      const same = (consumptions || []).find(c => c.id === sessionCardId);
      if (same && same.evaluation === undefined) return same;
    }
    return pickOutcomeCandidate(consumptions);
  }, [consumptions, enabled]);

  useEffect(() => { if (candidate) sessionCardId = candidate.id; }, [candidate]);
  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => { setSaved(false); force(n => n + 1); }, 1800);
    return () => clearTimeout(id);
  }, [saved]);

  if (saved) {
    return <p role="status" className="text-xs text-gray-400 text-center">{t('intention.savedThanks', 'Guardado.')}</p>;
  }
  if (!candidate || sessionCardDone) return null;

  const finish = (outcome) => {
    const evaluation = { outcome, at: new Date().toISOString() };
    const clean = sanitizeText(note).slice(0, 280);
    if (clean && outcome !== 'dismissed') evaluation.note = clean;
    sessionCardDone = true;
    onSave(candidate.id, evaluation);
    if (outcome === 'dismissed') force(n => n + 1); else setSaved(true);
  };

  const ints = (Array.isArray(candidate.intentions) ? candidate.intentions : []).map(k => intentionLabel(t, k));
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4">
      <p className="text-xs text-gray-400">
        {whenText(t, i18n.language, candidate.timestamp || candidate.createdAt)}
        {ints.length > 0 && <span className="text-gray-300"> · {ints.join(' · ')}</span>}
      </p>
      <p className="text-sm font-semibold text-white mt-1">{t('intention.askTitle', 'Correu como querias?')}</p>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {OUTCOME_KEYS.map(k => (
          <button key={k} type="button" onClick={() => finish(k)} className="py-2 rounded-xl text-sm font-semibold bg-gray-700/70 border border-gray-600 text-gray-100 hover:bg-gray-700">
            {outcomeLabel(t, k)}
          </button>
        ))}
      </div>
      {noteOpen && (
        <textarea
          autoFocus
          value={note}
          maxLength={280}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={t('intention.notePlaceholder', 'o que foi diferente? (opcional)')}
          className="mt-3 bg-gray-700 border border-gray-600 text-white text-sm w-full p-2.5 rounded-lg focus:ring-2 focus:ring-purple-400 resize-none"
        />
      )}
      <div className="flex justify-between items-center mt-3">
        {!noteOpen ? (
          <button type="button" onClick={() => setNoteOpen(true)} className="text-xs text-gray-400 hover:text-gray-200">
            ＋ {t('intention.whatDifferent', 'o que foi diferente?')}
          </button>
        ) : <span className="text-[11px] text-gray-500">{t('intention.noteHint', 'Escreve e depois escolhe a resposta.')}</span>}
        <button type="button" onClick={() => finish('dismissed')} className="text-xs text-gray-500 hover:text-gray-300">
          {t('intention.dismiss', 'dispensar')} ✕
        </button>
      </div>
    </div>
  );
}

// Para o modal de editar consumo: a resposta "correu como querias?", editável.
export function OutcomeEditor({ evaluation, onChange }) {
  const { t } = useTranslation();
  const cur = evaluation && OUTCOME_KEYS.includes(evaluation.outcome) ? evaluation.outcome : null;
  return (
    <div>
      <p className="text-sm font-semibold text-gray-200 mb-2">{t('intention.askTitle', 'Correu como querias?')}
        <span className="text-xs font-normal text-gray-500 ml-2">{t('intention.optional', 'opcional')}</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {OUTCOME_KEYS.map(k => (
          <button key={k} type="button" aria-pressed={cur === k}
            onClick={() => onChange(cur === k ? null : { ...(evaluation || {}), outcome: k, at: new Date().toISOString() })}
            className={'py-2 rounded-xl text-sm font-semibold border ' + (cur === k ? 'bg-purple-600 border-purple-400 text-white' : 'bg-gray-700/70 border-gray-600 text-gray-100')}>
            {outcomeLabel(t, k)}
          </button>
        ))}
      </div>
      {cur && (
        <textarea
          value={evaluation?.note || ''}
          maxLength={280}
          onChange={(e) => onChange({ ...evaluation, note: e.target.value })}
          rows={2}
          placeholder={t('intention.notePlaceholder', 'o que foi diferente? (opcional)')}
          className="mt-2 bg-gray-700 border border-gray-600 text-white text-sm w-full p-2.5 rounded-lg focus:ring-2 focus:ring-purple-400 resize-none"
        />
      )}
    </div>
  );
}
