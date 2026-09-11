import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/DataContext';
import { genId, getTodayKey, safeToISODate } from '../../utils/helpers';

const OPEN_KEY = 'nep-unlogged-open';
const MAX_RANGE_DAYS = 120;

// Lista de datas 'YYYY-MM-DD' entre duas datas (inclusive).
const datesInRange = (from, to) => {
  const out = [];
  const d = new Date(`${from}T12:00:00`);
  const last = new Date(`${to}T12:00:00`);
  if (isNaN(d.getTime()) || isNaN(last.getTime()) || last < d) return out;
  let guard = 0;
  while (d.getTime() <= last.getTime() && guard++ <= MAX_RANGE_DAYS) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
};

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

/**
 * "Dias sem registo" — marcar dias em que simplesmente não se registou nada.
 *
 * PORQUÊ: um dia sem registos não é um dia a zero. Sem esta marca a app não
 * consegue distinguir "não consumi" de "não registei", e um dia em branco ou
 * baixava as médias (como se fosse zero) ou desaparecia em silêncio. Marcar
 * diz à app: isto é informação em FALTA — deixa estes dias de fora das contas
 * em vez de inventar um valor.
 *
 * Diferente de "dia atípico": atípico é um dia que ACONTECEU de forma diferente
 * (e que foi registado); aqui o dia pode ter sido perfeitamente normal — só não
 * ficou registado.
 */
export const UnloggedDaysPanel = React.memo(() => {
  const { i18n } = useTranslation();
  const isEN = i18n.language === 'en';
  const { dailyLogs, consumptions, addDailyLog, deleteItem } = useData();

  const [isOpen, setIsOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, String(isOpen)); } catch { /* best-effort */ }
  }, [isOpen]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Marcas já existentes (guardadas em dailyLogs → sincronizam com a nuvem).
  const marks = useMemo(() => {
    const byDate = new Map();
    (dailyLogs || []).forEach(l => {
      if (!l || !l.notLogged) return;
      const d = l.date || (l.timestamp ? safeToISODate(l.timestamp) : null);
      if (d && !byDate.has(d)) byDate.set(d, l);
    });
    return byDate;
  }, [dailyLogs]);

  const groups = useMemo(
    () => groupConsecutive([...marks.keys()].sort()),
    [marks]
  );

  // Dias marcados que afinal TÊM registos — vale a pena avisar, porque nesses
  // dias a marca esconde dados reais.
  const datesWithRecords = useMemo(() => {
    const s = new Set();
    (consumptions || []).forEach(c => {
      const d = c.date || (c.timestamp ? safeToISODate(c.timestamp) : null);
      if (d && marks.has(d)) s.add(d);
    });
    return s;
  }, [consumptions, marks]);

  const fmt = useCallback((date) => (
    new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })
  ), [i18n.language]);

  const handleMark = async () => {
    const start = from || to;
    const end = to || from;
    if (!start || !end) {
      setFeedback({ type: 'error', text: isEN ? 'Pick at least one date.' : 'Escolhe pelo menos uma data.' });
      return;
    }
    const [a, b] = start <= end ? [start, end] : [end, start];
    const dates = datesInRange(a, b);
    if (dates.length === 0) {
      setFeedback({ type: 'error', text: isEN ? 'Invalid dates.' : 'Datas inválidas.' });
      return;
    }
    if (dates.length > MAX_RANGE_DAYS) {
      setFeedback({ type: 'error', text: isEN ? `Too many days at once (max ${MAX_RANGE_DAYS}).` : `São dias a mais de uma vez (máx. ${MAX_RANGE_DAYS}).` });
      return;
    }
    setBusy(true);
    try {
      let added = 0;
      for (const date of dates) {
        if (marks.has(date)) continue;
        await addDailyLog({
          id: genId(),
          date,
          timestamp: new Date(`${date}T12:00:00`).toISOString(),
          notLogged: true,
          mg: null,
        });
        added++;
      }
      setFrom(''); setTo('');
      setFeedback({
        type: 'ok',
        text: added === 0
          ? (isEN ? 'Those days were already marked.' : 'Esses dias já estavam marcados.')
          : (isEN ? `${added} day(s) marked as not logged.` : `${added} dia(s) marcado(s) como sem registo.`),
      });
    } catch (e) {
      setFeedback({ type: 'error', text: isEN ? 'Could not save. Try again.' : 'Não deu para guardar. Tenta outra vez.' });
    } finally {
      setBusy(false);
    }
  };

  const handleUnmark = async (dates) => {
    setBusy(true);
    try {
      for (const date of dates) {
        const log = marks.get(date);
        if (log?.id) await deleteItem('dailyLogs', log.id);
      }
      setFeedback({ type: 'ok', text: isEN ? 'Unmarked.' : 'Desmarcado.' });
    } catch (e) {
      setFeedback({ type: 'error', text: isEN ? 'Could not remove. Try again.' : 'Não deu para remover. Tenta outra vez.' });
    } finally {
      setBusy(false);
    }
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
          🕳️ {isEN ? 'Days I did not log' : 'Dias que não registei'}
          {marks.size > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">({marks.size})</span>
          )}
        </span>
        <span className="text-gray-400 text-sm">{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            {isEN
              ? 'A day with nothing logged is not the same as a day with zero uses. Marking it here tells the app the information is missing: those days are left out of the averages instead of being counted as zero, and the app stops treating them as if nothing happened.'
              : 'Um dia sem registos não é o mesmo que um dia a zero. Marcar aqui diz à app que a informação está em falta: esses dias ficam de fora das médias em vez de contarem como zero, e a app deixa de fazer contas como se nada tivesse acontecido.'}
          </p>
          <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
            {isEN
              ? 'Different from an "atypical day": that one happened differently and was logged. Here the day may have been perfectly normal — it just never got written down.'
              : 'Diferente de "dia atípico": esse aconteceu de forma diferente e foi registado. Aqui o dia até pode ter sido normal — só não ficou escrito.'}
          </p>

          <div className="mt-3 flex flex-wrap items-end gap-2">
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
              {isEN ? 'To' : 'Até'}
              <input
                type="date"
                value={to}
                max={today}
                onChange={e => { setTo(e.target.value); setFeedback(null); }}
                className="mt-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
              />
            </label>
            <button
              onClick={handleMark}
              disabled={busy}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded px-3 py-1.5"
            >
              {isEN ? 'Mark' : 'Marcar'}
            </button>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {isEN ? 'One day: fill in just one of the fields.' : 'Só um dia: preenche só um dos campos.'}
          </p>

          {feedback && (
            <p className={`text-xs mt-2 ${feedback.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
              {feedback.text}
            </p>
          )}

          {groups.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700/60 space-y-1">
              {groups.map(g => {
                const withRecords = g.dates.filter(d => datesWithRecords.has(d)).length;
                return (
                  <div key={`${g.from}-${g.to}`} className="bg-gray-900/40 rounded px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-300">
                        {g.from === g.to ? fmt(g.from) : `${fmt(g.from)} → ${fmt(g.to)}`}
                        <span className="ml-2 text-[11px] text-gray-500">
                          {g.dates.length} {isEN ? (g.dates.length === 1 ? 'day' : 'days') : (g.dates.length === 1 ? 'dia' : 'dias')}
                        </span>
                      </span>
                      <button
                        onClick={() => handleUnmark(g.dates)}
                        disabled={busy}
                        className="text-[11px] text-gray-400 hover:text-gray-200 underline disabled:opacity-50 shrink-0"
                      >
                        {isEN ? 'Undo' : 'Desmarcar'}
                      </button>
                    </div>
                    {withRecords > 0 && (
                      <p className="text-[11px] text-amber-400/80 mt-1 leading-snug">
                        {isEN
                          ? `${withRecords} of these day(s) do have uses logged — those records still show in the history, but the days stay out of the averages while marked.`
                          : `${withRecords} desses dias até têm consumos registados — esses registos continuam no histórico, mas os dias ficam fora das médias enquanto a marca estiver posta.`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

UnloggedDaysPanel.displayName = 'UnloggedDaysPanel';
