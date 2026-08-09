/**
 * Registo dos momentos de impulso (quando o exercício "surfar o impulso" aparece)
 * e do que a pessoa fez.
 *
 * NOTA: os eventos NOVOS são gravados na base cifrada/sincronizada (coleção
 * `urgeEvents`, via DataContext.addUrgeEvent) — já NÃO ficam só no telemóvel.
 * Este ficheiro mantém-se só para (a) ler eventos antigos ainda em localStorage
 * e (b) migrá-los para a base (migrateUrgeEventsToDexie).
 *
 * Evento: { ts/timestamp: ISO, exercises: string[], outcome: 'delayed' | 'proceeded' }
 *  - usou estratégia = exercises.length > 0 (conta como "impulso surfado").
 *  - 'delayed'   → fechou o aviso sem carregar em "consumir na mesma" (adiou).
 *  - 'proceeded' → carregou em "consumir na mesma".
 */
import { safeLocalStorage } from './storage';
import { genId } from './helpers';

const KEY = 'nep_urge_events';

export function logUrgeEvent({ exercises = [], outcome = 'delayed' } = {}) {
  try {
    const cur = safeLocalStorage.get(KEY, []);
    const list = Array.isArray(cur) ? cur : [];
    list.push({ ts: new Date().toISOString(), exercises, outcome });
    while (list.length > 500) list.shift(); // não crescer sem fim
    safeLocalStorage.set(KEY, list);
  } catch {
    // best-effort; nunca deve partir a app
  }
}

export function getUrgeEvents() {
  const cur = safeLocalStorage.get(KEY, []);
  return Array.isArray(cur) ? cur : [];
}

/**
 * Migração única: passar os eventos antigos guardados em localStorage para a
 * base cifrada e sincronizada (via addUrgeEvent). Depois de migrados, limpa o
 * registo local antigo para não haver duplicados.
 *
 * Idempotente: se o localStorage já estiver vazio, não faz nada.
 *
 * @param {(item:object)=>Promise<any>} addUrgeEvent  do DataContext
 */
export async function migrateUrgeEventsToDexie(addUrgeEvent) {
  const events = getUrgeEvents();
  if (!events.length) return 0;
  let migrated = 0;
  for (const e of events) {
    await addUrgeEvent({
      id: genId(),
      timestamp: e.ts || e.timestamp || new Date().toISOString(),
      exercises: Array.isArray(e.exercises) ? e.exercises : [],
      outcome: e.outcome === 'proceeded' ? 'proceeded' : 'delayed',
    });
    migrated++;
  }
  // Limpar o registo local antigo — a partir daqui a fonte é a base cifrada.
  safeLocalStorage.set(KEY, []);
  return migrated;
}
