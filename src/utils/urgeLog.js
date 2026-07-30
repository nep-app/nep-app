/**
 * Registo simples dos momentos de impulso (quando o exercício "surfar o impulso"
 * aparece) e do que a pessoa fez. Guardado LOCALMENTE (localStorage) — é dado de
 * comportamento, fica só neste dispositivo por agora.
 *
 * Evento: { ts: ISO, exercises: string[], outcome: 'delayed' | 'proceeded' }
 *  - 'delayed'   → fechou o aviso sem carregar em "consumir na mesma" (adiou).
 *  - 'proceeded' → carregou em "consumir na mesma".
 * O "adiou quantos minutos" NÃO se guarda aqui — calcula-se depois, comparando
 * com o próximo consumo registado.
 */
import { safeLocalStorage } from './storage';

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
