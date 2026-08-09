/**
 * Estatísticas do "Surfar o Impulso".
 *
 * Junta o registo de momentos de impulso (utils/urgeLog.js) com os consumos
 * reais para tornar VISÍVEL o esforço da pessoa: quantos impulsos surfou,
 * quantos consumos adiou, e quanto tempo em média adiou.
 *
 * Não inventa nada — só lê o que já foi registado. Se não houver eventos,
 * devolve tudo a zero (o componente decide não mostrar nada).
 */
import { safeToISODate } from './helpers';

// Janela máxima para considerar que um consumo "veio a seguir" a um impulso
// adiado. Passado isto, contamos como consumo evitado (não como adiamento).
const FOLLOW_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * @param {Array} events        eventos de urgeLog: { ts, exercises, outcome }
 * @param {Array} consumptions  consumos: { timestamp|createdAt, date }
 * @param {{start:string,end:string}|null} dateRange  intervalo 'YYYY-MM-DD' (inclusive) ou null = desde sempre
 * @returns {{ total, delayed, proceeded, avoided, avgDelayMin, delayedPct, hasData }}
 */
export function computeUrgeStats(events = [], consumptions = [], dateRange = null) {
  const inRange = (isoTs) => {
    if (!dateRange || !dateRange.start || !dateRange.end) return true;
    const day = safeToISODate(isoTs);
    return day >= dateRange.start && day <= dateRange.end;
  };

  const evts = (Array.isArray(events) ? events : []).filter(e => e && e.ts && inRange(e.ts));

  // Instantes de consumo ordenados (para procurar "o próximo consumo").
  const consTimes = (Array.isArray(consumptions) ? consumptions : [])
    .map(c => new Date(c.timestamp || c.createdAt).getTime())
    .filter(t => Number.isFinite(t))
    .sort((a, b) => a - b);

  const nextConsumptionAfter = (ms) => {
    // primeira marca de consumo estritamente depois de `ms`
    for (let i = 0; i < consTimes.length; i++) {
      if (consTimes[i] > ms) return consTimes[i];
    }
    return null;
  };

  let delayed = 0;
  let proceeded = 0;
  let avoided = 0;
  const delayMinutes = [];

  for (const e of evts) {
    if (e.outcome === 'proceeded') {
      proceeded++;
      continue;
    }
    // outcome 'delayed' (ou qualquer coisa que não seja 'proceeded') = adiou
    delayed++;
    const evtMs = new Date(e.ts).getTime();
    if (!Number.isFinite(evtMs)) continue;
    const nextMs = nextConsumptionAfter(evtMs);
    if (nextMs && (nextMs - evtMs) <= FOLLOW_WINDOW_MS) {
      delayMinutes.push((nextMs - evtMs) / 60000);
    } else {
      // não houve consumo nas horas seguintes → impulso surfado sem consumo
      avoided++;
    }
  }

  const total = evts.length;
  const avgDelayMin = delayMinutes.length
    ? Math.round(delayMinutes.reduce((s, m) => s + m, 0) / delayMinutes.length)
    : null;
  const delayedPct = total > 0 ? Math.round((delayed / total) * 100) : 0;

  return {
    total,
    delayed,
    proceeded,
    avoided,
    avgDelayMin,
    delayedPct,
    hasData: total > 0,
  };
}

/**
 * Formata minutos de forma humana: 45 → "45m", 95 → "1h35".
 */
export function formatDelay(min) {
  if (min == null) return '—';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
