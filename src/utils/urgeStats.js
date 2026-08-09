/**
 * Estatísticas do "Surfar o Impulso".
 *
 * Torna VISÍVEL o esforço da pessoa, de forma honesta e simples:
 *   - impulsos surfados = vezes que usou MESMO uma estratégia (respiração,
 *     timer, ancorar, mexer o corpo, escrever, refletir…).
 *   - consumos adiados = vezes que NÃO carregou "consumir na mesma".
 *   - abriste sem usar = abriu o ecrã mas não usou nenhuma estratégia
 *     (pode ter sido só ver o aviso, ou engano — por isso conta à parte).
 *
 * Não inventa nada — só lê o registo. Cada evento tem { timestamp|ts, exercises[],
 * outcome }.
 */
import { safeToISODate } from './helpers';

/**
 * @param {Array} events  eventos do registo do impulso
 * @param {{start:string,end:string}|null} dateRange  intervalo 'YYYY-MM-DD' ou null = desde sempre
 * @returns {{ total, surfed, delayed, openedNoUse, hasData }}
 */
export function computeUrgeStats(events = [], dateRange = null) {
  const tsOf = (e) => (e && (e.ts || e.timestamp)) || null;
  const inRange = (isoTs) => {
    if (!dateRange || !dateRange.start || !dateRange.end) return true;
    const day = safeToISODate(isoTs);
    return day >= dateRange.start && day <= dateRange.end;
  };

  const evts = (Array.isArray(events) ? events : []).filter(e => tsOf(e) && inRange(tsOf(e)));

  let surfed = 0;
  let delayed = 0;
  let openedNoUse = 0;
  for (const e of evts) {
    const usedStrategy = Array.isArray(e.exercises) && e.exercises.length > 0;
    if (usedStrategy) surfed++;
    else openedNoUse++;
    if (e.outcome !== 'proceeded') delayed++; // não carregou "consumir na mesma"
  }

  return {
    total: evts.length,
    surfed,
    delayed,
    openedNoUse,
    hasData: evts.length > 0,
  };
}
