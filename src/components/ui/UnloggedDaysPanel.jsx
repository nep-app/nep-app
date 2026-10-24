import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/DataContext';
import { genId, getTodayKey, safeToISODate, datesInRange } from '../../utils/helpers';

const OPEN_KEYS = { unlogged: 'nep-unlogged-open', unsureRefill: 'nep-unsure-refill-open', atypical: 'nep-atypical-open' };
const MAX_RANGE_DAYS = 120;

// Lista de datas 'YYYY-MM-DD' entre duas datas (inclusive).
// NÃO corta no limite: se cortasse, a pré-visualização mostrava um número de
// dias e uma data de fim que a pessoa não escolheu. Quem decide o que fazer com
// um intervalo grande demais é quem chama (avisa em vez de mentir).

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
// kind: 'unlogged' → "Não registei os consumos" (marca em dailyLogs, notLogged):
//        só os consumos e os mg desse dia ficam de fora; sono, humor, etc. contam.
//       'atypical' → "Dia atípico" (isAtypical no bem-estar desse dia): o dia
//        TODO fica de fora. Se não houver bem-estar nesse dia, cria-se um só com
//        a marca (atypicalOnly), que se apaga ao desmarcar.
//       'unsureRefill' → "Não sei se enchi o saco" (marca em dailyLogs,
//        unsureRefill): os consumos contam; o período pesado que passa por esse
//        dia só diz "pelo menos X mg" (não se reparte por dia, fica fora da média).
export const UnloggedDaysPanel = React.memo(({ kind = 'unlogged' }) => {
  const { i18n } = useTranslation();
  const isEN = i18n.language === 'en';
  const { dailyLogs, consumptions, wellbeingLogs, weighings, addDailyLog, addItem, updateItem, deleteItem } = useData();
  const atypical = kind === 'atypical';
  const unsure = kind === 'unsureRefill';
  const markField = unsure ? 'unsureRefill' : 'notLogged';
  const OPEN_KEY = OPEN_KEYS[kind] || OPEN_KEYS.unlogged;

  const [isOpen, setIsOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, String(isOpen)); } catch { /* best-effort */ }
  }, [isOpen, OPEN_KEY]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Marcas já existentes (guardadas em dailyLogs → sincronizam com a nuvem).
  // Guarda-se a LISTA por data, não só a primeira: dois telemóveis a sincronizar
  // podem criar duas marcas para o mesmo dia, e aí "Desmarcar" apagava uma e
  // dizia "desmarcado" com o dia a continuar marcado.
  const marks = useMemo(() => {
    const byDate = new Map();
    (atypical ? wellbeingLogs : dailyLogs || []).forEach(l => {
      if (!l || !(atypical ? l.isAtypical : l[markField])) return;
      const d = l.date || (l.timestamp ? safeToISODate(l.timestamp) : null);
      if (!d) return;
      const list = byDate.get(d);
      if (list) list.push(l); else byDate.set(d, [l]);
    });
    return byDate;
  }, [dailyLogs, wellbeingLogs, atypical, markField]);

  const groups = useMemo(
    () => groupConsecutive([...marks.keys()].sort()),
    [marks]
  );

  // Dias marcados "não registei os consumos" que afinal TÊM consumos, mg ou
  // pesagens — avisar, porque a marca põe esses dados de fora das contas. (O
  // sono e o humor desses dias contam na mesma.) No atípico não se avisa: tirar
  // o dia todo é o que se quer.
  const datesWithRecords = useMemo(() => {
    const s = new Set();
    if (atypical || unsure) return s;
    const scan = (arr) => (arr || []).forEach(item => {
      if (!item || item.notLogged) return;
      const d = item.date || (item.timestamp ? safeToISODate(item.timestamp) : null);
      if (d && marks.has(d)) s.add(d);
    });
    scan(consumptions);
    scan((dailyLogs || []).filter(l => l && l.mg != null && l.mg !== ''));
    scan(weighings);
    return s;
  }, [consumptions, dailyLogs, weighings, marks, atypical, unsure]);

  const fmt = useCallback((date) => (
    new Date(`${date}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })
  ), [i18n.language]);

  // Dias que a escolha actual vai marcar (para mostrar o número antes de gravar).
  const pending = useMemo(() => {
    const start = from || to;
    const end = to || from;
    if (!start || !end) return [];
    const [a, b] = start <= end ? [start, end] : [end, start];
    return datesInRange(a, b);
  }, [from, to]);

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
    // Um dia que falhe NÃO pode levar os outros atrás nem passar despercebido:
    // antes, um erro a meio parava o resto em silêncio e ficavam dias por marcar
    // sem a app dizer nada. Agora tenta todos e diz exactamente o que ficou.
    const added = [];
    const already = [];
    const failed = [];
    for (const date of dates) {
      if (marks.has(date)) { already.push(date); continue; }
      try {
        if (atypical) {
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
            [markField]: true,
            mg: null,
          });
        }
        added.push(date);
      } catch (e) {
        failed.push(date);
      }
    }
    setBusy(false);

    const shortFmt = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
    if (failed.length > 0) {
      setFeedback({
        type: 'error',
        text: isEN
          ? `Could not save ${failed.length} of the ${dates.length} day(s): ${failed.map(shortFmt).join(', ')}. Try again — the rest were saved.`
          : `Não deu para guardar ${failed.length} dos ${dates.length} dia(s): ${failed.map(shortFmt).join(', ')}. Tenta outra vez — os outros ficaram guardados.`,
      });
      return;
    }
    setFrom(''); setTo('');
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

  const handleUnmark = async (dates) => {
    setBusy(true);
    const failed = [];
    for (const date of dates) {
      // TODAS as marcas do dia, não só a primeira: com duas marcas (dois
      // telemóveis a sincronizar) a app dizia "desmarcado" e o dia continuava
      // marcado — a pior combinação possível.
      for (const log of (marks.get(date) || [])) {
        if (!log?.id) continue;
        try {
          if (!atypical) await deleteItem('dailyLogs', log.id);
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
          {atypical
            ? `📌 ${isEN ? 'Atypical days' : 'Dias atípicos'}`
            : unsure
              ? `❔ ${isEN ? 'Days I am not sure if I refilled the bag' : 'Dias em que não sei se enchi o saco'}`
              : `🕳️ ${isEN ? 'Days I did not log my uses' : 'Dias em que não registei os consumos'}`}
          {marks.size > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">({marks.size})</span>
          )}
        </span>
        <span className="text-gray-400 text-sm">{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            {atypical
              ? (isEN
                ? 'A day out of the ordinary that you do not want counted (a party, being ill, a trip). The WHOLE day is left out of the analyses and goals.'
                : 'Um dia fora do normal que não queres que conte (uma festa, uma doença, uma viagem). Fica o dia TODO de fora das análises e das metas.')
              : unsure
                ? (isEN
                  ? 'You logged your uses, but you do not know if you put more in the bag. Your uses count as usual. The weighed period that covers this day only says "at least X mg" (if you refilled, more left): it is not split per day and stays out of the average. Different from "Refilled without weighing", which says you DID refill.'
                  : 'Registaste os consumos, mas não sabes se puseste mais no saco. Os consumos contam normalmente. O período pesado que apanha este dia só diz "pelo menos X mg" (se encheste, saiu mais): não se reparte por dia e fica fora da média. Diferente de "Enchi sem pesar", que diz que encheste MESMO.')
              : (isEN
                ? 'You know other things about the day, but not your uses. Your uses and mg that day are left out (not counted as zero). Sleep, bedtime, mood and exercise that day still count.'
                : 'Sabes outras coisas do dia, mas não os consumos. Os consumos e os mg desse dia ficam de fora (não contam como zero). O sono, a hora de deitar, o humor e o exercício desse dia contam na mesma.')}
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
          {/* Dizer ANTES de carregar quantos dias vão ser marcados. Num telemóvel
              é fácil um dos campos não ficar preenchido e só se perceber depois;
              assim vê-se o número antes, e ou bate certo ou não. */}
          {pending.length > MAX_RANGE_DAYS ? (
            <p className="text-[11px] text-amber-400 mt-1">
              {isEN
                ? `That is ${pending.length} days — too many at once (max ${MAX_RANGE_DAYS}). Split it into shorter stretches.`
                : `São ${pending.length} dias — demasiados de uma vez (máx. ${MAX_RANGE_DAYS}). Faz em bocados mais pequenos.`}
            </p>
          ) : pending.length > 0 ? (
            <p className="text-[11px] text-indigo-300 mt-1">
              {isEN
                ? `Will mark ${pending.length} day(s): ${pending.length === 1 ? fmt(pending[0]) : `${fmt(pending[0])} → ${fmt(pending[pending.length - 1])}`}`
                : `Vai marcar ${pending.length} dia(s): ${pending.length === 1 ? fmt(pending[0]) : `${fmt(pending[0])} → ${fmt(pending[pending.length - 1])}`}`}
            </p>
          ) : (
            <p className="text-[11px] text-gray-500 mt-1">
              {isEN ? 'One day: fill in just one of the fields.' : 'Só um dia: preenche só um dos campos.'}
            </p>
          )}

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
                          ? `${withRecords} of these day(s) do have uses, mg or weighings logged — they still show in the history, but stay out of the counts while marked.`
                          : `${withRecords} desses dias até têm consumos, mg ou pesagens registados — continuam no histórico, mas ficam fora das contas enquanto a marca estiver posta.`}
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
