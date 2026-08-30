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
    // Motivo pelo qual o período não deu para medir (para a app poder EXPLICAR
    // à utilizadora porque é que um dia fica sem mg, em vez de o omitir em
    // silêncio). Fica null quando o período é medido com sucesso.
    let reason = null;
    let reasonDetail = null; // qual pesagem e que peso falta (para a app poder dizer)
    // "não pesei" ou refill esquecido confirmado → intervalo sem peso fiável.
    const forgotten = prev.notWeighed || curr.notWeighed || curr.forgottenRefill;

    if (forgotten) {
      consumed = null;
      reason = curr.forgottenRefill ? 'forgottenRefill' : 'notWeighed';
    } else if (curr.isNewBag) {
      // Troca de saco: o consumo apurado é o do SACO ANTIGO. O peso do saco vazio
      // (tara) NUNCA conta como consumo. A tara do saco antigo = 'empty' da pesagem
      // anterior (o mesmo saco).
      const oldTare = (prev.empty != null && !isNaN(prev.empty)) ? prev.empty
        : (curr.empty != null && !isNaN(curr.empty)) ? curr.empty : null;
      if (prev.full != null && oldTare != null) {
        const lp = curr.leftoverPrev;
        if (lp != null && !isNaN(lp) && lp > oldTare) {
          // Ainda tinha resto: leftoverPrev = peso BRUTO do saco antigo (com o
          // resto). A tara cancela-se (mesmo saco): consumido = cheio − bruto.
          consumed = prev.full - lp;
        } else {
          // Ficou vazio (botão), ou 0/branco/≤tara em dados antigos: consumiu-se
          // tudo o que lá estava menos a tara. consumido = cheio − tara.
          consumed = prev.full - oldTare;
        }
      } else {
        // Troca de saco sem os pesos necessários (falta o peso do saco cheio
        // anterior ou o peso do saco vazio/tara).
        reason = 'newBagMissingWeights';
        reasonDetail = prev.full == null
          ? { missingTs: prev.timestamp, missingField: 'full' }
          : { missingTs: prev.timestamp, missingField: 'tare' };
      }
    } else if (prev.full != null && curr.before != null) {
      consumed = prev.full - curr.before;
    } else {
      reason = 'missingWeights';
      reasonDetail = prev.full == null
        ? { missingTs: prev.timestamp, missingField: 'full' }
        : { missingTs: curr.timestamp, missingField: 'before' };
    }
    if (consumed != null && consumed < 0) { consumed = null; reason = 'negative'; reasonDetail = null; }

    cycles.push({ start, end, consumed, measured: consumed != null, forgotten, reason, reasonDetail, closing: curr });
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

  // Nº de doses (toques) de cada ciclo — o consumo do ciclo reparte-se por elas.
  const doseCountByCycle = new Map();
  for (const c of cons) {
    const cy = cycleForDose(toMs(c.timestamp));
    if (cy) doseCountByCycle.set(cy, (doseCountByCycle.get(cy) || 0) + 1);
  }

  // ⚠️ FALTAM TOQUES: o modelo por-toque assume que TODOS os toques foram
  // registados. Quando faltam (esquecimento, dia mau, adormecer), a mesma
  // quantidade é dividida por menos toques e os dias que restam ficam
  // inflacionados — ex.: 350 mg repartidos por 4 toques = 88 mg/toque quando o
  // normal da pessoa são ~25. Nesse caso o valor NÃO é fiável e não deve ser
  // apresentado como facto. É a pergunta simétrica à do "refill esquecido"
  // (mg/toque muito ABAIXO do normal).
  const HIGH_RATIO = 2.5; // acima de 2,5× o típico → há toques em falta
  const measuredCycles = cycles.filter(cy => cy.measured);
  const typicalRef = (typical != null && typical > 0)
    ? typical
    : typicalMgPerDose(ws, cons);
  const unreliableByTouches = new Map(); // cycle -> { consumed, doseCount, mgPerDose }
  if (typicalRef != null && typicalRef > 0 && measuredCycles.length >= 3) {
    for (const cy of measuredCycles) {
      const n = doseCountByCycle.get(cy) || 0;
      if (n <= 0) continue;
      const mgPerDose = cy.consumed / n;
      if (mgPerDose > typicalRef * HIGH_RATIO) {
        unreliableByTouches.set(cy, {
          consumed: Math.round(cy.consumed),
          doseCount: n,
          mgPerDose: Math.round(mgPerDose),
          typical: Math.round(typicalRef),
        });
      }
    }
  }

  const perDay = {};
  const ensure = (d) => (perDay[d] = perDay[d] || { mg: 0, doseCount: 0, measuredDoses: 0, estimatedDoses: 0, unknownDoses: 0, reasons: new Set() });

  // Modelo POR-TOQUE: cada toque de um ciclo pesado vale (peso do saco ÷ nº de
  // toques desse saco). O mg do dia = soma das fatias dos seus toques. Um dia que
  // apanha dois sacos soma as fatias de cada (ex.: fim de um saco + início de outro).
  // NUNCA se inventam mg: toques fora de um ciclo pesado (saco atual em aberto,
  // "não pesei", refill esquecido) contam como toque mas SEM mg.
  for (const c of cons) {
    const d = dayKey(c);
    if (!d) continue;
    const day = ensure(d);
    day.doseCount++;
    const cy = cycleForDose(toMs(c.timestamp));
    const suspect = cy ? unreliableByTouches.get(cy) : null;
    if (cy && cy.measured && !suspect) {
      const n = doseCountByCycle.get(cy) || 1;
      day.mg += cy.consumed / n;
      day.measuredDoses++;
    } else if (suspect) {
      // Período com toques a menos: conta o toque, mas SEM mg (não inventar).
      day.unknownDoses++;
      day.reasons.add('missingTouches');
      if (!day.gapDetail) day.gapDetail = suspect;
    } else {
      day.unknownDoses++;
      // Guardar o PORQUÊ. Sem ciclo, distinguir os dois casos MUITO diferentes:
      // toques anteriores à 1.ª pesagem de sempre vs. toques do saco atual, que
      // ainda não foi fechado por uma pesagem seguinte.
      if (cy) {
        day.reasons.add(cy.reason || 'unmeasuredPeriod');
        if (!day.gapDetail && cy.reasonDetail) day.gapDetail = cy.reasonDetail;
      } else {
        const ms = toMs(c.timestamp);
        const firstWs = ws.length ? toMs(ws[0].timestamp) : null;
        day.reasons.add(firstWs != null && ms != null && ms <= firstWs
          ? 'beforeFirstWeighing'
          : 'afterLastWeighing');
      }
    }
  }

  for (const d in perDay) {
    const day = perDay[d];
    const known = day.measuredDoses + day.estimatedDoses;
    if (day.doseCount === 0) day.state = 'none';
    else if (day.measuredDoses > 0 && day.estimatedDoses === 0 && day.unknownDoses === 0) day.state = 'measured';
    else if (day.estimatedDoses > 0 && day.measuredDoses === 0 && day.unknownDoses === 0) day.state = 'estimated';
    else if (known === 0) day.state = 'unknown';
    else day.state = 'mixed';
    day.estimated = day.estimatedDoses > 0;
    day.mg = known > 0 ? Math.round(day.mg) : null;
    day.reasons = Array.from(day.reasons); // Set → array (serializável)
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
 * Lista dos PERÍODOS PESADOS (entre duas pesagens) com o que saiu do saco em
 * cada um. Este total vem só da balança — não depende de haver toques
 * registados — por isso continua fiável mesmo quando não dá para repartir por
 * dia. É a forma honesta de ver o consumo quando faltam toques.
 * @returns {Array<{start:number,end:number,consumed:number,doseCount:number,mgPerDose:number|null,days:number}>}
 */
export function measuredPeriods(weighings = [], consumptions = []) {
  const ws = [...weighings]
    .filter(w => w && w.timestamp && toMs(w.timestamp) != null)
    .sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
  const cons = [...consumptions].filter(c => c && c.timestamp && toMs(c.timestamp) != null);

  const out = [];
  for (const cy of buildCycles(ws)) {
    if (!cy.measured || cy.consumed == null) continue;
    const doseCount = cons.filter(c => {
      const t = toMs(c.timestamp);
      return t > cy.start && t <= cy.end;
    }).length;
    // Nº de dias de calendário que o período toca (início e fim inclusive).
    const dayStart = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const days = Math.max(1, Math.round((dayStart(cy.end) - dayStart(cy.start)) / 86400000) + 1);
    out.push({
      start: cy.start,
      end: cy.end,
      consumed: Math.round(cy.consumed),
      doseCount,
      mgPerDose: doseCount > 0 ? Math.round(cy.consumed / doseCount) : null,
      days,
    });
  }
  return out.sort((a, b) => b.end - a.end); // mais recente primeiro
}

/**
 * Detalhe do período fechado por uma pesagem — para a app poder MOSTRAR os
 * números em vez de pedir à pessoa que confie de olhos fechados (ex.: ao
 * decidir se desmarca um "enchimento esquecido"). Calcula o consumo COMO SE o
 * período fosse fiável, ignorando de propósito a marca de esquecido.
 * @returns {null | { start:number, end:number, doseCount:number, consumed:number|null, mgPerDose:number|null }}
 */
export function periodInfoForClosing(weighings = [], consumptions = [], closingId = null) {
  if (!closingId) return null;
  const ws = [...weighings]
    .filter(w => w && w.timestamp && toMs(w.timestamp) != null)
    .sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
  const i = ws.findIndex(w => w.id === closingId);
  if (i <= 0) return null;
  const prev = ws[i - 1];
  const curr = ws[i];
  const start = toMs(prev.timestamp);
  const end = toMs(curr.timestamp);

  let consumed = null;
  if (curr.isNewBag) {
    const oldTare = (prev.empty != null && !isNaN(prev.empty)) ? prev.empty
      : (curr.empty != null && !isNaN(curr.empty)) ? curr.empty : null;
    if (prev.full != null && oldTare != null) {
      const lp = curr.leftoverPrev;
      consumed = (lp != null && !isNaN(lp) && lp > oldTare) ? prev.full - lp : prev.full - oldTare;
    }
  } else if (prev.full != null && curr.before != null) {
    consumed = prev.full - curr.before;
  }
  if (consumed != null && consumed < 0) consumed = null;

  const doses = consumptions.filter(c => {
    const t = toMs(c && c.timestamp);
    return t != null && t > start && t <= end;
  });
  const mgPerDose = (consumed != null && doses.length > 0) ? consumed / doses.length : null;

  return {
    start, end,
    doseCount: doses.length,
    consumed: consumed != null ? Math.round(consumed) : null,
    mgPerDose: mgPerDose != null ? Math.round(mgPerDose) : null,
  };
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

  // Usa TODOS os ciclos medidos, incluindo os fechados por troca de saco (desde
  // que a tara é descontada, esses também são fiáveis). Antes eram ignorados, o
  // que deixava o "típico" apoiado em pouquíssimos ciclos para quem troca de
  // saco com frequência. Ciclos "não pesei"/refill esquecido ficam de fora
  // (buildCycles já os marca como não medidos).
  const perDoseValues = [];
  for (const cy of buildCycles(ws)) {
    if (!cy.measured || cy.consumed == null || cy.consumed < 0) continue;
    const n = cons.filter(c => { const t = toMs(c.timestamp); return t > cy.start && t <= cy.end; }).length;
    if (n > 0) perDoseValues.push(cy.consumed / n);
  }
  if (perDoseValues.length === 0) return null;
  perDoseValues.sort((a, b) => a - b);
  const mid = Math.floor(perDoseValues.length / 2);
  return perDoseValues.length % 2
    ? perDoseValues[mid]
    : (perDoseValues[mid - 1] + perDoseValues[mid]) / 2;
}
