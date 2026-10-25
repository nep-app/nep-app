import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/DataContext';
import { genId, getTodayKey, safeToISODate, datesInRange } from '../../utils/helpers';

const OPEN_KEY = 'nep-day-marks-open';
const MAX_RANGE_DAYS = 120;

// Junta dias seguidos num intervalo só, para a lista não ficar quilométrica.
const groupConsecutive = (sortedDates) => {
  const groups = [];
  for (const date of sortedDates) {
    const last = groups[groups.length - 1];
    if (last) {
      const next = new Date(`${last.to}T12:00:00`);
      next.setDate(next.getDate() + 1);
      const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
      if (nextKey === date) { last.to = date; last.dates.push(date); continue; }
    }
    groups.push({ from: date, to: date, dates: [date] });
  }
  return groups.reverse(); // mais recente primeiro
};

// As três marcas, descritas pela SITUAÇÃO (o que aconteceu) e não pelo nome
// técnico: a pessoa escolhe o que se passou e a app decide o que fica de fora.
//   'unlogged'     → dailyLogs.notLogged: só os consumos e os mg desse dia
//                    ficam de fora; sono, humor, etc. contam.
//   'unsureRefill' → dailyLogs.unsureRefill: os consumos contam; o período
//                    pesado que passa por esse dia só diz "pelo menos X mg"
//                    (não se reparte por dia, fica fora da média).
//   'atypical'     → isAtypical no bem-estar desse dia: o dia TODO fica de
//                    fora. Sem bem-estar nesse dia, cria-se um só com a marca
//                    (atypicalOnly), que se apaga ao desmarcar.
const KINDS = [
  {
    kind: 'unlogged',
    icon: '🕳️',
    pt: { situation: 'Não registei os consumos', example: 'Sei como dormi e como me senti, mas os consumos não estão na app.', effect: 'Os consumos e os mg desse dia ficam de fora (não contam como zero). O sono, o humor e o resto contam.', short: 'não registei os consumos' },
    en: { situation: 'I did not log my uses', example: 'I know how I slept and felt, but my uses are not in the app.', effect: 'Uses and mg that day are left out (not counted as zero). Sleep, mood and the rest still count.', short: 'did not log my uses' },
  },
  {
    kind: 'unsureRefill',
    icon: '❔',
    pt: { situation: 'Registei os consumos, mas não sei se pus mais no saco', example: 'Os consumos estão na app; só não sei se enchi o saco.', effect: 'Os consumos contam. O saco desse período só diz "pelo menos X mg": não se reparte por dia e fica fora da média.', short: 'não sei se enchi o saco' },
    en: { situation: 'I logged my uses, but I do not know if I put more in the bag', example: 'My uses are in the app; I just do not know if I refilled.', effect: 'Uses count. The bag for that period only says "at least X mg": not split per day and left out of the average.', short: 'not sure if I refilled' },
  },
  {
    kind: 'atypical',
    icon: '📌',
    pt: { situation: 'O dia foi fora do normal e não quero que conte', example: 'Uma festa, uma doença, uma viagem.', effect: 'O dia TODO fica de fora das análises e das metas.', short: 'dia atípico' },
    en: { situation: 'The day was out of the ordinary and I do not want it counted', example: 'A party, being ill, a trip.', effect: 'The WHOLE day is left out of the analyses and goals.', short: 'atypical day' },
  },
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.kind, k]));

/**
 * "Dias com registos em falta ou fora do normal" — dizer à app o que FALTA saber de um dia, em vez de ela
 * inventar. Um dia sem registos não é um dia a zero; um saco que talvez tenha
 * sido enchido não é um saco medido; um dia fora do normal não serve para
 * comparar. Uma pergunta só ("o que aconteceu?") em vez de três painéis com
 * nomes parecidos: a pessoa escolhe a situação, a app trata do resto.
 */
export const DayMarksPanel = React.memo(() => {
  const { i18n } = useTranslation();
  const isEN = i18n.language === 'en';
  const L = (k) => (isEN ? k.en : k.pt);
  const { dailyLogs, consumptions, wellbeingLogs, weighings, addDailyLog, addItem, updateItem, deleteItem } = useData();

  const [isOpen, setIsOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, String(isOpen)); } catch { /* best-effort */ }
  }, [isOpen]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Marcas já existentes, por tipo (guardadas → sincronizam com a nuvem).
  // Guarda-se a LISTA por data, não só a primeira: dois telemóveis a sincronizar
  // podem criar duas marcas para o mesmo dia, e aí "Desmarcar" apagava uma e
  // dizia "desmarcado" com o dia a continuar marcado.
  const marks = useMemo(() => {
    const out = { unlogged: new Map(), unsureRefill: new Map(), atypical: new Map() };
    const put = (map, l) => {
      const d = l.date || (l.timestamp ? safeToISODate(l.timestamp) : null);
      if (!d) return;
      const list = map.get(d);
      if (list) list.push(l); else map.set(d, [l]);
    };
    (dailyLogs || []).forEach(l => {
      if (!l) return;
      if (l.notLogged) put(out.unlogged, l);
      if (l.unsureRefill) put(out.unsureRefill, l);
    });
    (wellbeingLogs || []).forEach(w => { if (w && w.isAtypical) put(out.atypical, w); });
    return out;
  }, [dailyLogs, wellbeingLogs]);

  const total = marks.unlogged.size + marks.unsureRefill.size + marks.atypical.size;

  // Todas as marcas numa lista só (mais recente primeiro), cada grupo com o seu tipo.
  const groups = useMemo(() => {
    const all = [];
    for (const k of KINDS) {
      for (const g of groupConsecutive([...marks[k.kind].keys()].sort())) all.push({ ...g, kind: k.kind });
    }
    return all.sort((a, b) => (a.to < b.to ? 1 : a.to > b.to ? -1 : 0));
  }, [marks]);

  // Dias marcados "não registei os consumos" que afinal TÊM consumos, mg ou
  // pesagens — avisar, porque a marca põe esses dados de fora das contas.
  const unloggedWithRecords = useMemo(() => {
    const s = new Set();
    const m = marks.unlogged;
    const scan = (arr) => (arr || []).forEach(item => {
      if (!item || item.notLogged) return;
      const d = item.date || (item.timestamp ? safeToISODate(item.timestamp) : null);
      if (d && m.has(d)) s.add(d);
    });
    scan(consumptions);
    scan((dailyLogs || []).filter(l => l && l.mg != null && l.mg !== ''));
    scan(weighings);
    return s;
  }, [consumptions, dailyLogs, weighings, marks]);

  const fmt = useCallback((date) => (
    new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })
  ), [i18n.language]);
  const shortFmt = useCallback((date) => (
    new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
  ), [i18n.language]);

  // Dias que a escolha actual vai marcar (para mostrar o número antes de gravar).
  // NÃO corta no limite: se cortasse, mostrava uma data de fim que a pessoa não
  // escolheu. Grande demais → avisa em vez de mentir.
  const pending = useMemo(() => {
    const start = from || to;
    const end = to || from;
    if (!start || !end) return [];
    const [a, b] = start <= end ? [start, end] : [end, start];
    return datesInRange(a, b);
  }, [from, to]);

  const markOne = async (k, date) => {
    if (k === 'atypical') {
      // Bem-estar desse dia (o mais recente) leva a marca; sem nenhum, cria-se um só com ela.
      const existing = (wellbeingLogs || [])
        .filter(w => w && (w.date || safeToISODate(w.timestamp)) === date)
        .sort((x, y) => String(y.timestamp || '').localeCompare(String(x.timestamp || '')))[0];
      if (existing) await updateItem('wellbeingLogs', existing.id, { isAtypical: true });
      else await addItem('wellbeingLogs', { id: genId(), date, timestamp: new Date(`${date}T12:00:00`).toISOString(), isAtypical: true, atypicalOnly: true });
    } else {
      await addDailyLog({
        id: genId(),
        date,
        timestamp: new Date(`${date}T12:00:00`).toISOString(),
        [k === 'unsureRefill' ? 'unsureRefill' : 'notLogged']: true,
        mg: null,
      });
    }
  };

  const handleMark = async () => {
    if (pending.length === 0) {
      setFeedback({ type: 'error', text: isEN ? 'Pick at least one date.' : 'Escolhe pelo menos uma data.' });
      return;
    }
    if (!kind) {
      setFeedback({ type: 'error', text: isEN ? 'Choose what happened.' : 'Escolhe o que aconteceu.' });
      return;
    }
    if (pending.length > MAX_RANGE_DAYS) {
      setFeedback({ type: 'error', text: isEN ? `Too many days at once (max ${MAX_RANGE_DAYS}).` : `São dias a mais de uma vez (máx. ${MAX_RANGE_DAYS}).` });
      return;
    }
    setBusy(true);
    // Um dia que falhe NÃO pode levar os outros atrás nem passar despercebido:
    // tenta todos e diz exactamente o que ficou.
    const dates = pending;
    const added = [];
    const already = [];
    const failed = [];
    for (const date of dates) {
      if (marks[kind].has(date)) { already.push(date); continue; }
      try { await markOne(kind, date); added.push(date); } catch (e) { failed.push(date); }
    }
    setBusy(false);

    if (failed.length > 0) {
      setFeedback({
        type: 'error',
        text: isEN
          ? `Could not save ${failed.length} of the ${dates.length} day(s): ${failed.map(shortFmt).join(', ')}. Try again — the rest were saved.`
          : `Não deu para guardar ${failed.length} dos ${dates.length} dia(s): ${failed.map(shortFmt).join(', ')}. Tenta outra vez — os outros ficaram guardados.`,
      });
      return;
    }
    setFrom(''); setTo(''); setKind(null);
    // Dizer sempre o número pedido E o número marcado. Se um dia não entrar,
    // as duas contas deixam de bater e vê-se logo.
    setFeedback({
      type: 'ok',
      text: added.length === 0
        ? (isEN ? `Those ${dates.length} day(s) were already marked.` : `Esses ${dates.length} dia(s) já estavam marcados.`)
        : (isEN
          ? `${dates.length} day(s) selected · ${added.length} newly marked${already.length ? ` · ${already.length} already were` : ''}.`
          : `${dates.length} dia(s) escolhido(s) · ${added.length} marcado(s) agora${already.length ? ` · ${already.length} já estava(m)` : ''}.`),
    });
  };

  const handleUnmark = async (k, dates) => {
    setBusy(true);
    const failed = [];
    for (const date of dates) {
      // TODAS as marcas do dia, não só a primeira (dois telemóveis a sincronizar).
      for (const log of (marks[k].get(date) || [])) {
        if (!log?.id) continue;
        try {
          if (k !== 'atypical') await deleteItem('dailyLogs', log.id);
          else if (log.atypicalOnly) await deleteItem('wellbeingLogs', log.id);
          else await updateItem('wellbeingLogs', log.id, { isAtypical: false, atypicalReason: '' });
        } catch (e) { failed.push(date); }
      }
    }
    setBusy(false);
    setFeedback(failed.length > 0
      ? { type: 'error', text: isEN ? 'Could not remove all of them. Try again.' : 'Não deu para remover todas. Tenta outra vez.' }
      : { type: 'ok', text: isEN ? 'Unmarked.' : 'Desmarcado.' });
  };

  const today = getTodayKey();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
      <button
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-semibold text-white text-sm">
          📅 {isEN ? 'Days with missing logs or out of the ordinary' : 'Dias com registos em falta ou fora do normal'}
          {total > 0 && <span className="ml-2 text-xs font-normal text-gray-400">({total})</span>}
        </span>
        <span className="text-gray-400 text-sm">{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            {isEN
              ? 'For days the app should not take at face value. Most days need none of this.'
              : 'Para dias que a app não deve levar à letra. Na maior parte dos dias não precisas disto.'}
          </p>

          <p className="mt-3 text-xs font-semibold text-gray-200">{isEN ? '1. Which day?' : '1. Que dia?'}</p>
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-[11px] text-gray-400">
              {isEN ? 'From' : 'De'}
              <input
                type="date"
                value={from}
                max={today}
                onChange={e => { setFrom(e.target.value); setFeedback(null); }}
                className="mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="flex flex-col text-[11px] text-gray-400">
              {isEN ? 'To (optional)' : 'Até (opcional)'}
              <input
                type="date"
                value={to}
                max={today}
                onChange={e => { setTo(e.target.value); setFeedback(null); }}
                className="mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>
          {/* Dizer ANTES de carregar quantos dias vão ser marcados. */}
          {pending.length > MAX_RANGE_DAYS ? (
            <p className="text-[11px] text-amber-400 mt-1">
              {isEN
                ? `That is ${pending.length} days — too many at once (max ${MAX_RANGE_DAYS}). Split it into shorter stretches.`
                : `São ${pending.length} dias — demasiados de uma vez (máx. ${MAX_RANGE_DAYS}). Faz em bocados mais pequenos.`}
            </p>
          ) : pending.length > 0 ? (
            <p className="text-[11px] text-indigo-300 mt-1">
              {pending.length === 1 ? fmt(pending[0]) : `${fmt(pending[0])} → ${fmt(pending[pending.length - 1])} (${pending.length} ${isEN ? 'days' : 'dias'})`}
            </p>
          ) : (
            <p className="text-[11px] text-gray-500 mt-1">
              {isEN ? 'Just one day: fill in only the first field.' : 'Só um dia: preenche só o primeiro.'}
            </p>
          )}

          <p className="mt-3 text-xs font-semibold text-gray-200">{isEN ? '2. What happened that day?' : '2. O que aconteceu neste dia?'}</p>
          <div className="mt-1 space-y-1.5" role="radiogroup">
            {KINDS.map(k => {
              const on = kind === k.kind;
              return (
                <button
                  key={k.kind}
                  role="radio"
                  aria-checked={on}
                  onClick={() => { setKind(k.kind); setFeedback(null); }}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15' : 'border-gray-700 bg-gray-900/40 hover:border-gray-500'}`}
                >
                  <span className="block text-sm text-white">{k.icon} {L(k).situation}</span>
                  <span className="block font-sans text-[11px] text-gray-400 mt-0.5">{L(k).example}</span>
                  {on && <span className="block font-sans text-[11px] text-indigo-200 mt-1">→ {L(k).effect}</span>}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleMark}
            disabled={busy}
            className="mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded px-4 py-1.5"
          >
            {isEN ? 'Mark' : 'Marcar'}
          </button>

          {feedback && (
            <p className={`text-xs mt-2 ${feedback.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
              {feedback.text}
            </p>
          )}

          {groups.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700/60">
              <p className="text-xs font-semibold text-gray-200 mb-1">{isEN ? 'Marked days' : 'Dias marcados'}</p>
              <div className="space-y-1">
                {groups.map(g => {
                  const k = KIND_BY_ID[g.kind];
                  const withRecords = g.kind === 'unlogged' ? g.dates.filter(d => unloggedWithRecords.has(d)).length : 0;
                  return (
                    <div key={`${g.kind}-${g.from}-${g.to}`} className="bg-gray-900/40 rounded px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-300">
                          {g.from === g.to ? shortFmt(g.from) : `${shortFmt(g.from)} → ${shortFmt(g.to)}`}
                          <span className="block text-[11px] text-gray-500">{k.icon} {L(k).short}</span>
                        </span>
                        <button
                          onClick={() => handleUnmark(g.kind, g.dates)}
                          disabled={busy}
                          className="text-[11px] text-gray-400 hover:text-gray-200 underline disabled:opacity-50 shrink-0"
                        >
                          {isEN ? 'Undo' : 'Desmarcar'}
                        </button>
                      </div>
                      {withRecords > 0 && (
                        <p className="text-[11px] text-amber-400/80 mt-1 leading-snug">
                          {isEN
                            ? `${withRecords} of these day(s) do have uses, mg or weighings logged — they still show in the history, but stay out of the counts while marked.`
                            : `${withRecords} desses dias até têm consumos, mg ou pesagens registados — continuam no histórico, mas ficam fora das contas enquanto a marca estiver posta.`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

DayMarksPanel.displayName = 'DayMarksPanel';
