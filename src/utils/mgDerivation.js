/**
 * Motor de derivação de mg/dia a partir de PESAGENS do saco + DOSES (consumos).
 *
 * Princípio (ver especificação): trabalhamos só com DIFERENÇAS de peso. Cada
 * pesagem é um "refill" com dois pesos:
 *   - before: peso do saco IMEDIATAMENTE ANTES de encher
 *             (caso normal = saco vazio; "sobrou" = peso atual com resto)
 *   - full:   peso do saco IMEDIATAMENTE DEPOIS de encher
 *
 * Entre dois refills consecutivos há um CICLO. O que se consumiu nesse ciclo é
 *   consumido = full(refill anterior) − before(refill seguinte)
 * O peso do saco vazio cancela-se (é o mesmo saco), por isso não é preciso saber
 * a tara. Esse consumo é repartido pelas DOSES do ciclo (Modelo A): cada dose
 * leva uma fatia igual → mg/dia = soma das fatias das doses desse dia.
 *
 * NUNCA inventamos mg: doses fora de um ciclo pesado (antes da 1ª pesagem, no
 * ciclo aberto atual, ou num intervalo "não pesei") contam como dose mas sem mg.
 *
 * Estados do dia (decididos DOSE A DOSE):
 *   - 'measured': todas as doses do dia vêm de ciclos pesados.
 *   - 'mixed':    parte pesada, parte sem peso.
 *   - 'unknown':  há doses mas nenhuma tem peso (sem registo de peso).
 *   - 'none':     sem doses (não aparece; usado internamente).
 */

const toMs = (t) => {
  const d = new Date(t);
  const n = d.getTime();
  return isNaN(n) ? null : n;
};

const dayKey = (item) => item.date || (typeof item.timestamp === 'string' ? item.timestamp.split('T')[0] : null);

/**
 * @param {Array} weighings   pesagens desencriptadas
 * @param {Array} consumptions doses desencriptadas
 * @returns {Object} { [date]: { mg, state, doseCount, measuredDoses, unknownDoses } }
 */
export function deriveDailyMg(weighings = [], consumptions = []) {
  const ws = [...weighings]
    .filter(w => w && w.timestamp && toMs(w.timestamp) != null)
    .sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));

  const cons = [...consumptions]
    .filter(c => c && c.timestamp && toMs(c.timestamp) != null);

  // Construir ciclos entre refills consecutivos.
  const cycles = [];
  for (let i = 1; i < ws.length; i++) {
    const prev = ws[i - 1];
    const curr = ws[i];
    const start = toMs(prev.timestamp);
    const end = toMs(curr.timestamp);
    let consumed = null; // desconhecido por defeito

    if (prev.notWeighed || curr.notWeighed) {
      consumed = null; // "não pesei" → intervalo sem peso
    } else if (curr.isNewBag) {
      // Saco novo: só sabemos o consumido se soubermos quanto sobrou no antigo.
      if (curr.leftoverPrev != null && !isNaN(curr.leftoverPrev) && prev.full != null) {
        consumed = prev.full - curr.leftoverPrev;
      }
    } else if (prev.full != null && curr.before != null) {
      consumed = prev.full - curr.before;
    }

    // Guarda: consumo negativo (pesos trocados/erro) → tratar como desconhecido.
    if (consumed != null && consumed < 0) consumed = null;

    cycles.push({ start, end, consumed, measured: consumed != null });
  }

  const cycleForDose = (ms) => {
    for (const cy of cycles) if (ms > cy.start && ms <= cy.end) return cy;
    return null; // fora de qualquer ciclo (antes da 1ª pesagem ou no ciclo aberto)
  };

  // Nº de doses por ciclo (para repartir o consumo).
  const doseCountByCycle = new Map();
  for (const c of cons) {
    const cy = cycleForDose(toMs(c.timestamp));
    if (cy) doseCountByCycle.set(cy, (doseCountByCycle.get(cy) || 0) + 1);
  }

  const perDay = {};
  const ensure = (d) => (perDay[d] = perDay[d] || { mg: 0, doseCount: 0, measuredDoses: 0, unknownDoses: 0 });

  for (const c of cons) {
    const d = dayKey(c);
    if (!d) continue;
    const day = ensure(d);
    day.doseCount++;
    const cy = cycleForDose(toMs(c.timestamp));
    if (cy && cy.measured) {
      const n = doseCountByCycle.get(cy) || 1;
      day.mg += cy.consumed / n;
      day.measuredDoses++;
    } else {
      day.unknownDoses++;
    }
  }

  // Estado por dia + arredondar mg (só se houver pelo menos uma dose pesada).
  for (const d in perDay) {
    const day = perDay[d];
    if (day.doseCount === 0) day.state = 'none';
    else if (day.unknownDoses === 0) day.state = 'measured';
    else if (day.measuredDoses === 0) day.state = 'unknown';
    else day.state = 'mixed';
    day.mg = day.measuredDoses > 0 ? Math.round(day.mg) : null;
  }

  return perDay;
}

/**
 * mg/dose típico da utilizadora (mediana das doses de ciclos pesados). Serve de
 * base para o design anti-culpa (mostrar padrões) e, mais tarde, para estimativas
 * e para detetar refills esquecidos (mg/dose muito abaixo do típico).
 */
export function typicalMgPerDose(weighings = [], consumptions = []) {
  const ws = [...weighings]
    .filter(w => w && w.timestamp && toMs(w.timestamp) != null)
    .sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
  const cons = [...consumptions].filter(c => c && c.timestamp && toMs(c.timestamp) != null);

  const perDoseValues = [];
  for (let i = 1; i < ws.length; i++) {
    const prev = ws[i - 1];
    const curr = ws[i];
    if (prev.notWeighed || curr.notWeighed || curr.isNewBag) continue;
    if (prev.full == null || curr.before == null) continue;
    const consumed = prev.full - curr.before;
    if (consumed < 0) continue;
    const start = toMs(prev.timestamp);
    const end = toMs(curr.timestamp);
    const n = cons.filter(c => { const t = toMs(c.timestamp); return t > start && t <= end; }).length;
    if (n > 0) perDoseValues.push(consumed / n);
  }
  if (perDoseValues.length === 0) return null;
  perDoseValues.sort((a, b) => a - b);
  const mid = Math.floor(perDoseValues.length / 2);
  return perDoseValues.length % 2
    ? perDoseValues[mid]
    : (perDoseValues[mid - 1] + perDoseValues[mid]) / 2;
}
