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

// Constrói a lista de ciclos entre refills consecutivos (interno, reutilizado).
function buildCycles(ws) {
  const cycles = [];
  for (let i = 1; i < ws.length; i++) {
    const prev = ws[i - 1];
    const curr = ws[i];
    const start = toMs(prev.timestamp);
    const end = toMs(curr.timestamp);
    let consumed = null;
    // "não pesei" ou refill esquecido confirmado → intervalo sem peso fiável.
    const forgotten = prev.notWeighed || curr.notWeighed || curr.forgottenRefill;

    if (forgotten) {
      consumed = null;
    } else if (curr.isNewBag) {
      if (curr.leftoverPrev != null && !isNaN(curr.leftoverPrev) && prev.full != null) {
        consumed = prev.full - curr.leftoverPrev;
      }
    } else if (prev.full != null && curr.before != null) {
      consumed = prev.full - curr.before;
    }
    if (consumed != null && consumed < 0) consumed = null;

    cycles.push({ start, end, consumed, measured: consumed != null, forgotten, closing: curr });
  }
  return cycles;
}

/**
 * Último período FECHADO e MEDIDO (entre duas pesagens consecutivas com peso
 * fiável). Devolve o consumo apurado nesse intervalo e as suas datas (ms).
 * @returns {null | { start:number, end:number, consumed:number }}
 */
export function lastMeasuredPeriod(weighings = []) {
  const ws = [...weighings]
    .filter(w => w && w.timestamp && toMs(w.timestamp) != null)
    .sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
  const cycles = buildCycles(ws);
  for (let i = cycles.length - 1; i >= 0; i--) {
    const cy = cycles[i];
    if (cy.measured && cy.consumed != null && cy.consumed >= 0) {
      return { start: cy.start, end: cy.end, consumed: Math.round(cy.consumed) };
    }
  }
  return null;
}

/**
 * @param {Array} weighings   pesagens desencriptadas
 * @param {Array} consumptions doses desencriptadas
 * @param {Object} [opts] { typical } mg/dose típico para ESTIMAR dias sem peso.
 * @returns {Object} { [date]: { mg, state, doseCount, measuredDoses, estimatedDoses, unknownDoses, estimated } }
 */
export function deriveDailyMg(weighings = [], consumptions = [], opts = {}) {
  const typical = (opts.typical != null && !isNaN(opts.typical) && opts.typical > 0) ? opts.typical : null;

  const ws = [...weighings]
    .filter(w => w && w.timestamp && toMs(w.timestamp) != null)
    .sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));

  const cons = [...consumptions]
    .filter(c => c && c.timestamp && toMs(c.timestamp) != null);

  const cycles = buildCycles(ws);

  const cycleForDose = (ms) => {
    for (const cy of cycles) if (ms > cy.start && ms <= cy.end) return cy;
    return null;
  };

  const perDay = {};
  const ensure = (d) => (perDay[d] = perDay[d] || { mg: 0, doseCount: 0, measuredDoses: 0, estimatedDoses: 0, unknownDoses: 0, measuredShare: false });

  // 1) Classificar as DOSES por dia — só para o "estado" do dia (tem doses num
  //    ciclo pesado? fora de ciclo pesado?). NÃO usamos a contagem de doses para
  //    repartir mg (era isso que criava falsos picos quando não se registava tudo).
  for (const c of cons) {
    const d = dayKey(c);
    if (!d) continue;
    const day = ensure(d);
    day.doseCount++;
    const cy = cycleForDose(toMs(c.timestamp));
    if (cy && cy.measured) day.measuredDoses++;
    else day.unknownDoses++; // período sem peso fiável — nunca se inventam mg aqui
  }

  // 2) Repartir o consumo MEDIDO de cada ciclo IGUALMENTE pelos dias do período
  //    (média medida). Dias = do dia A SEGUIR à pesagem anterior até ao dia da
  //    pesagem de fecho (cada dia de pesagem pertence ao ciclo que fecha — sem
  //    duplicar). Isto substitui a divisão por doses e elimina os picos falsos.
  const localKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  for (const cy of cycles) {
    if (!cy.measured || cy.consumed == null || cy.consumed < 0) continue;
    const days = [];
    const d = new Date(cy.start); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
    const endD = new Date(cy.end); endD.setHours(0, 0, 0, 0);
    while (d <= endD) { days.push(localKey(d)); d.setDate(d.getDate() + 1); }
    if (days.length === 0) continue;
    const share = cy.consumed / days.length;
    for (const dk of days) {
      const day = ensure(dk);
      day.mg += share;
      day.measuredShare = true;
    }
  }

  // 3) Estado e mg final por dia.
  for (const d in perDay) {
    const day = perDay[d];
    if (day.doseCount === 0 && !day.measuredShare) { day.state = 'none'; day.mg = null; day.estimated = false; continue; }
    if (day.measuredShare && day.unknownDoses === 0) day.state = 'measured';
    else if (day.measuredShare && day.unknownDoses > 0) day.state = 'mixed';
    else day.state = 'unknown'; // tem doses mas nenhuma num ciclo pesado (ou fora do range)
    day.estimated = false; // nunca estimamos: só há "medido" (quota do período) ou "desconhecido"
    day.mg = day.measuredShare ? Math.round(day.mg) : null;
  }

  return perDay;
}

/**
 * Deteção de APOIO de refills esquecidos: ciclos PESADOS cujo mg/dose está muito
 * abaixo do típico da própria utilizadora (na análise real da Dory, 2–7 vs ~25).
 * SÓ SUGERE — nunca decide. Ignora ciclos já confirmados (forgottenRefill /
 * confirmedLow) e precisa de histórico suficiente para o típico ser fiável.
 *
 * @returns {Array} suspeitas: { closingId, startTs, endTs, mgPerDose, typical, dates:[], doseCount }
 */
export function detectForgottenRefills(weighings = [], consumptions = [], typical = null) {
  if (typical == null || isNaN(typical) || typical <= 0) return [];

  const ws = [...weighings]
    .filter(w => w && w.timestamp && toMs(w.timestamp) != null)
    .sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
  const cons = [...consumptions].filter(c => c && c.timestamp && toMs(c.timestamp) != null);

  // Precisa de pelo menos 3 ciclos bem pesados para o típico assentar.
  const cycles = buildCycles(ws);
  const measuredCount = cycles.filter(c => c.measured).length;
  if (measuredCount < 3) return [];

  const RATIO = 0.4; // < 40% do típico → suspeito
  const out = [];
  for (const cy of cycles) {
    if (!cy.measured) continue;
    if (cy.closing?.confirmedLow || cy.closing?.forgottenRefill) continue;
    const doses = cons.filter(c => { const t = toMs(c.timestamp); return t > cy.start && t <= cy.end; });
    if (doses.length < 2) continue; // pouca informação
    const mgPerDose = cy.consumed / doses.length;
    if (mgPerDose < typical * RATIO) {
      const dates = [...new Set(doses.map(dayKey).filter(Boolean))];
      out.push({
        closingId: cy.closing?.id || null,
        startTs: cy.start, endTs: cy.end,
        mgPerDose: Math.round(mgPerDose), typical: Math.round(typical),
        dates, doseCount: doses.length,
      });
    }
  }
  return out;
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
