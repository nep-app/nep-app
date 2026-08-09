/**
 * Estatísticas do "Surfar o Impulso".
 *
 * Honesto e simples:
 *   - impulsos surfados = usou MESMO uma estratégia (respiração, timer, ancorar…).
 *   - consumos adiados  = dos surfados, NÃO carregou "consumir na mesma".
 *   - tempo aguentado   = das vezes que surfou e adiou, tempo médio até ao
 *                         próximo consumo (só conta impulsos reais — os surfados).
 *
 * O "abriste sem usar" (abrir sem usar estratégia) já não é mostrado — era quase
 * só registo retroativo antigo, que agora tem caminho próprio na Home.
 */
import { safeToISODate } from './helpers';

// Janela para "o próximo consumo veio a seguir" ao impulso adiado.
const FOLLOW_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * @param {Array} events        eventos do registo do impulso
 * @param {Array} consumptions  consumos (para medir o tempo aguentado)
 * @param {{start:string,end:string}|null} dateRange  intervalo 'YYYY-MM-DD' ou null = desde sempre
 * @returns {{ total, surfed, delayed, openedNoUse, avgHeldMin, hasData }}
 */
export function computeUrgeStats(events = [], consumptions = [], dateRange = null) {
  const tsOf = (e) => (e && (e.ts || e.timestamp)) || null;
  const inRange = (isoTs) => {
    if (!dateRange || !dateRange.start || !dateRange.end) return true;
    const day = safeToISODate(isoTs);
    return day >= dateRange.start && day <= dateRange.end;
  };

  const evts = (Array.isArray(events) ? events : []).filter(e => tsOf(e) && inRange(tsOf(e)));

  const consTimes = (Array.isArray(consumptions) ? consumptions : [])
    .map(c => new Date(c.timestamp || c.createdAt).getTime())
    .filter(t => Number.isFinite(t))
    .sort((a, b) => a - b);
  const nextConsumptionAfter = (ms) => {
    for (let i = 0; i < consTimes.length; i++) if (consTimes[i] > ms) return consTimes[i];
    return null;
  };

  let surfed = 0;
  let delayed = 0;
  let openedNoUse = 0;
  const heldMinutes = [];
  for (const e of evts) {
    const usedStrategy = Array.isArray(e.exercises) && e.exercises.length > 0;
    if (usedStrategy) {
      surfed++;
      if (e.outcome !== 'proceeded') {
        delayed++;
        const evMs = new Date(tsOf(e)).getTime();
        const nx = Number.isFinite(evMs) ? nextConsumptionAfter(evMs) : null;
        if (nx && (nx - evMs) <= FOLLOW_WINDOW_MS) heldMinutes.push((nx - evMs) / 60000);
      }
    } else {
      openedNoUse++;
    }
  }

  const avgHeldMin = heldMinutes.length
    ? Math.round(heldMinutes.reduce((s, m) => s + m, 0) / heldMinutes.length)
    : null;

  return {
    total: evts.length,
    surfed,
    delayed,
    openedNoUse,
    avgHeldMin,
    hasData: evts.length > 0,
  };
}

/** Formata minutos de forma humana: 45 → "45m", 95 → "1h35". */
export function formatDelay(min) {
  if (min == null) return '—';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
