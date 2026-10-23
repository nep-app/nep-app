import { getTodayKey, safeToISODate, formatDateShort, subtractDays, getDateDaysAgo, getDateKeyFromItem, bedtimeMeetsTarget, limitLastDeadline, meetsGoal, datesInRange } from '../utils/helpers';
import i18n from '../i18n';
import { isUnknownLongCycle } from '../utils/mgDerivation';

// ===== HELPER FUNCTIONS =====

// ===== ANALYTICS LOGIC =====

export const analyzeSentiment = (note) => {
    // Placeholder for sentiment analysis logic
    return { score: 0, label: 'Neutral' };
};

export const analyzeMultipleNotes = (notes) => {
    // Placeholder
    return { score: 0, label: 'Neutral' };
};

export const identifyThemes = (notes) => {
    return [];
};

export const calculateCorrelations = (data) => {
    return [];
};

export const predictNextEpisode = (history) => {
    return null;
};

// ===== CORRELATION & STATISTICS =====

/**
 * Calculate Pearson correlation coefficient between two variables
 */
/**
 * Nº MÍNIMO de pontos para uma correlação poder ir para o ecrã.
 *
 * Era 3. Com 3 pontos sai sempre um número — e ficava ao lado de uma correlação
 * feita com trezentos dias, sem nada que as distinguisse. Um r de três pontos
 * não precisa de p-value para ser lixo: precisa de não aparecer.
 *
 * 20 é o piso em que o intervalo de confiança deixa de ser absurdo. Abaixo
 * disso não dá sequer para distinguir +0,2 de −0,2, e mostrar o número dá-lhe
 * uma autoridade que ele não tem.
 *
 * Ver PLANO-ESTATISTICA.md e a regra testável do "não sei" em CLAUDE.md.
 */
export const MIN_CORRELATION_N = 20;

export const calculatePearsonCorrelation = (data, xKey, yKey) => {
    const clean = data.filter(d => d[xKey] != null && d[yKey] != null && !isNaN(d[xKey]) && !isNaN(d[yKey]));
    if (clean.length < MIN_CORRELATION_N) return null;
    const n = clean.length;
    const sumX = clean.reduce((sum, d) => sum + d[xKey], 0);
    const sumY = clean.reduce((sum, d) => sum + d[yKey], 0);
    const sumXY = clean.reduce((sum, d) => sum + d[xKey] * d[yKey], 0);
    const sumX2 = clean.reduce((sum, d) => sum + d[xKey] * d[xKey], 0);
    const sumY2 = clean.reduce((sum, d) => sum + d[yKey] * d[yKey], 0);
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return denominator === 0 ? null : numerator / denominator;
};

// ===== DATE RANGE & FILTERING =====

/**
 * Get start and end dates for a given period and offset
 */
export const getDateRangeForPeriod = (period, offset = 0) => {
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    let start, end;

    if (period === 'hoje') {
        // Today
        end = subtractDays(now, offset);
        start = new Date(end);
        start.setHours(0, 0, 0, 0);
    } else if (period === 'semana') {
        // Week (last 7 days)
        end = subtractDays(now, offset * 7);
        start = subtractDays(end, 6);
        start.setHours(0, 0, 0, 0);
    } else if (period === 'mes') {
        // Month (last 30 days)
        end = subtractDays(now, offset * 30);
        start = subtractDays(end, 29);
        start.setHours(0, 0, 0, 0);
    } else {
        // tudo: retornar TODOS os dados (sem filtro de data)
        return { start: null, end: null };
    }

    return { start, end };
};

/**
 * Filter items by date range
 */
export const filterByDateRange = (items, dateRange, dateField = 'timestamp') => {
    if (!dateRange.start || !dateRange.end) {
        return items;
    }

    const filtered = items.filter(item => {
        const itemDate = new Date(item[dateField]);
        const isInRange = itemDate >= dateRange.start && itemDate <= dateRange.end;
        return isInRange;
    });

       
    return filtered;
};

/**
 * Get label for a period and offset
 */
export const getPeriodLabel = (period, offset) => {
    if (offset === 0) {
        if (period === 'hoje') return i18n.t('period.today');
        if (period === 'semana') return i18n.t('period.last7');
        if (period === 'mes') return i18n.t('period.last30');
        return i18n.t('period.allTime');
    }

    if (period === 'hoje') {
        const date = getDateDaysAgo(offset);
        return formatDateShort(date);
    }
    if (period === 'semana') return i18n.t('period.weeksAgo', { count: offset });
    if (period === 'mes') return i18n.t('period.monthsAgo', { count: offset });
    return i18n.t('period.allTime');
};

/**
 * Exclude today from analyses (since day is not complete)
 */
export const excludeToday = (items, dateField = 'date') => {
    const today = getTodayKey();
    return items.filter(item => item[dateField] !== today);
};

// ===== CONSUMPTION INTERVALS =====

/**
 * Calculate interval statistics from consumptions
 */
export const calculateIntervalStats = (consumptions) => {
    if (consumptions.length < 2) return null;
    const sorted = [...consumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    const last20 = sorted.slice(-20);
    const intervals = [];
    for (let i = 1; i < last20.length; i++) {
        const diff = (new Date(last20[i].timestamp) - new Date(last20[i-1].timestamp)) / (1000 * 60 * 60);
        intervals.push({ hours: diff, date: last20[i].date, timestamp: last20[i].timestamp });
    }
    const avgHours = intervals.reduce((sum, i) => sum + i.hours, 0) / intervals.length;
    const shortIntervals = intervals.filter(i => i.hours < 2);
    const shortByDay = {};
    shortIntervals.forEach(i => { shortByDay[i.date] = (shortByDay[i.date] || 0) + 1; });
    return { avgHours: avgHours.toFixed(1), intervals: intervals.slice(-10).reverse(), shortIntervals: shortIntervals.length, shortByDay };
};

/**
 * Calculate last interval between consumptions
 */
export const calculateLastInterval = (consumptions) => {
    if (consumptions.length < 2) return null;
    const sorted = [...consumptions].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    const last = new Date(sorted[0].timestamp);
    const secondLast = new Date(sorted[1].timestamp);
    const diffMs = last - secondLast;
    const hours = diffMs / (1000 * 60 * 60);
    return { hours: hours.toFixed(1), isShort: hours < 2 };
};

/**
 * Calculate time since last consumption
 */
export const calculateTimeSinceLastConsumption = (consumptions) => {
    if (consumptions.length === 0) return null;
    const sorted = [...consumptions].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    const last = new Date(sorted[0].timestamp);
    const now = new Date();
    const diffMs = now - last;
    const hours = diffMs / (1000 * 60 * 60);

    if (hours < 1) {
        const minutes = Math.floor((diffMs / (1000 * 60)));
        return { value: minutes, unit: 'min', hours: hours };
    } else if (hours < 24) {
        return { value: hours.toFixed(1), unit: 'h', hours: hours };
    } else {
        const days = Math.floor(hours / 24);
        const remainingHours = Math.floor(hours % 24);
        return { value: days, unit: days === 1 ? 'dia' : 'dias', subValue: remainingHours, subUnit: 'h', hours: hours };
    }
};

/**
 * Get today's consumptions
 */
export const getTodayConsumptions = (consumptions) => {
    return consumptions.filter(c => c.date === getTodayKey());
};

/**
 * Get last 7 days with consumption counts
 */
export const getLast7Days = (consumptions) => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const date = getDateDaysAgo(i);
        const dateKey = safeToISODate(date);
        const count = consumptions.filter(c => getDateKeyFromItem(c) === dateKey).length;
        days.push({
            date: dateKey,
            label: i === 0 ? 'Hoje' : date.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' }),
            count
        });
    }
    return days;
};

/**
 * Calculate average frequency in last 7 days
 */
export const calculateAvgFrequencyLast7Days = (consumptions) => {
    const last7Days = getLast7Days(consumptions);
    const totalConsumptions = last7Days.reduce((sum, day) => sum + day.count, 0);
    return (totalConsumptions / 7).toFixed(1);
};

// ===== GOAL ACHIEVEMENT TRACKING =====

// Lista ORDENADA de ms de uma coleção inteira, guardada por coleção: a mesma
// lista serve a todas as metas e a todas as renderizações até os dados mudarem
// (os arrays do contexto são novos a cada mudança).
const sortedMsCache = new WeakMap();
const sortedMs = (arr, toMs) => {
    if (!arr) return [];
    let v = sortedMsCache.get(arr);
    if (!v) {
        v = arr.map(x => ({ ms: toMs(x), d: getDateKeyFromItem(x) })).filter(x => !isNaN(x.ms)).sort((a, b) => a.ms - b.ms);
        sortedMsCache.set(arr, v);
    }
    return v;
};
const itemMs = (x) => new Date(x.timestamp || x.createdAt || x.date).getTime();

/**
 * Cumprimento de uma meta: { achieved, possible } — os dias (ou ciclos) em que
 * se cumpriu e os que CONTAM, calculados no MESMO ciclo, pela MESMA regra
 * ("cumprido" = helpers.meetsGoal; igual à meta conta).
 *
 * Regras comuns: hoje não conta (o dia ainda não acabou); os dias em
 * opts.excludedDates (atípicos, "não registei") ficam de fora; um dia sem
 * dados para a meta não conta nem como cumprido nem como falhado ("não sei").
 * Meta sem alvo legível → { 0, 0 } (não se avalia; não se inventa um alvo).
 *
 * @param {Array} consumptions/dailyLogs/cycles/wellbeingLogs — os registos do
 *        período (podem vir com mais; só contam os dias de fromDate..toDate).
 * @param {Object} opts
 *   fromDate, toDate   'YYYY-MM-DD' — o período avaliado (inclusive). Sem
 *                      fromDate começa no 1.º registo de qualquer tipo.
 *   excludedDates      Set de dias a deixar de fora (atípicos, "não registei").
 *   nightExcludedDates Set de dias a deixar de fora nas metas de sono e de
 *                      deitar (só os atípicos: "não registei os consumos" não
 *                      apaga o sono desse dia).
 *   measuredMgByDate   { dia: mg } medidos pelas pesagens (todo o histórico;
 *                      aqui é cortado ao período).
 *   mgCycles           [{ day, mg }] mg por ciclo de sono — se vier, a meta de
 *                      mg conta por ciclo (acordar → acordar) e não por dia.
 *   allCycles, allConsumptions — TODOS os ciclos/consumos (sem cortes), para as
 *                      metas por ciclo de sono: os limites de cada ciclo e o
 *                      que lhe pertence não podem depender do que se excluiu.
 */
export const getGoalAchievement = (goal, consumptions = [], dailyLogs = [], cycles = [], wellbeingLogs = [], opts = {}) => {
    const today = getTodayKey();
    const day = getDateKeyFromItem;
    const excluded = opts.excludedDates || new Set();
    const inRange = (d) => !!d && d < today && !excluded.has(d)
        && (!opts.fromDate || d >= opts.fromDate) && (!opts.toDate || d <= opts.toDate);

    // O alvo de CADA dia: o que estava em vigor nesse dia (opts.targetForDay,
    // ver goalTargetForDay); sem isso, o alvo actual. Alvo ilegível → o dia
    // não se avalia (não se inventa um alvo).
    const timeTarget = goal.type === 'limit_last' || goal.type === 'bedtime_before';
    const readTarget = (v) => (timeTarget ? (v || null) : (Number.isFinite(parseFloat(v)) ? parseFloat(v) : null));
    const tgt = (d) => readTarget(opts.targetForDay ? opts.targetForDay(d) : goal.target);
    if (!opts.targetForDay && tgt(null) == null) return { achieved: 0, possible: 0, days: [] };
    const meetsOn = (d, v) => { const t = tgt(d); return t == null ? null : meetsGoal(goal.type, v, t); };

    let achieved = 0, possible = 0;
    // days: cada dia (ou ciclo) que contou, com o valor e se cumpriu — para a
    // pessoa poder ver dia a dia de onde vem a percentagem.
    const days = [];
    const count = (ok, d, value) => { possible++; if (ok) achieved++; days.push({ d, ok: !!ok, value }); };
    const hhmm = (msVal) => { const x = new Date(msVal); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };

    if (goal.type === 'reduce_frequency') {
        // Todos os dias do período (até ontem). Um dia sem consumos só conta se
        // houver OUTRO registo nesse dia — aí sabe-se que foi um dia a zero;
        // sem registo nenhum, não se sabe e fica de fora.
        const counts = {};
        consumptions.forEach(c => { const d = day(c); if (inRange(d)) counts[d] = (counts[d] || 0) + 1; });
        const otherRecordDays = new Set([...cycles, ...dailyLogs, ...wellbeingLogs].map(day).filter(inRange));
        const from = opts.fromDate || [...Object.keys(counts), ...otherRecordDays].sort()[0];
        if (from) {
            datesInRange(from, opts.toDate && opts.toDate < today ? opts.toDate : today).filter(inRange).forEach(d => {
                const n = counts[d] || 0;
                if (n === 0 && !otherRecordDays.has(d)) return;
                const ok = meetsOn(d, n);
                if (ok != null) count(ok, d, n);
            });
        }
    }

    if (goal.type === 'reduce_quantity' && Array.isArray(opts.mgCycles)) {
        // POR CICLO DE SONO (acordar → acordar), já calculado em
        // mgDerivation.mgBySleepCycle: só ciclos fechados, ≤36h, com todos os
        // toques pesados (ou mg escrito à mão). Conta pelo dia em que se acordou.
        opts.mgCycles.forEach(c => { if (!inRange(c.day)) return; const ok = meetsOn(c.day, c.mg); if (ok != null) count(ok, c.day, c.mg); });
    } else if (goal.type === 'reduce_quantity') {
        // POR DIA (quem não regista ciclos): "Registar mg" à mão manda; senão,
        // mg MEDIDOS pelas pesagens (só dias 100% medidos — nunca estimativas);
        // e o campo antigo dos ciclos.
        const mgByDate = {};
        const add = (d, v) => { const n = typeof v === 'number' ? v : parseFloat(v); if (inRange(d) && !isNaN(n)) mgByDate[d] = (mgByDate[d] || 0) + n; };
        dailyLogs.forEach(l => { if (l.mg != null && l.mg !== '') add(day(l), l.mg); });
        cycles.forEach(c => { if (c.mg) add(day(c), c.mg); });
        Object.entries(opts.measuredMgByDate || {}).forEach(([d, mg]) => { if (!(d in mgByDate)) add(d, mg); });
        Object.entries(mgByDate).forEach(([d, mg]) => { const ok = meetsOn(d, mg); if (ok != null) count(ok, d, Math.round(mg)); });
    }

    if (goal.type === 'limit_last' || goal.type === 'first_not_before') {
        // Ciclos de sono: janelas de acordar → acordar seguinte, feitas com
        // TODOS os ciclos; só se avaliam as que começam num dia do período.
        // Consumos e ciclos ordenados → um só ponteiro a andar para a frente.
        const wakes = sortedMs(opts.allCycles || cycles, itemMs);
        const cons = sortedMs(opts.allConsumptions || consumptions, c => new Date(c.timestamp).getTime());
        let j = 0;
        for (let i = 0; i < wakes.length; i++) {
            const startMs = wakes[i].ms;
            const endMs = i + 1 < wakes.length ? wakes[i + 1].ms : Date.now();
            while (j < cons.length && cons[j].ms < startMs) j++;
            if (!inRange(wakes[i].d)) continue;
            if (goal.type === 'limit_last') {
                // Ciclo FECHADO com consumos: algum depois da hora da meta → falhou.
                // Mais de 36h entre dois acordares, depois de existir o botão
                // "Não dormi", quer dizer que falta registar um ciclo — não se
                // sabe, não se avalia. Antes do botão, era uma noite sem dormir
                // (não havia outra forma de o dizer): conta como um ciclo só.
                if (i + 1 >= wakes.length || isUnknownLongCycle(startMs, endMs)) continue;
                const dayTarget = tgt(wakes[i].d);
                if (dayTarget == null) continue;
                let k = j, lastMs = null, firstLateMs = null;
                const deadlineMs = limitLastDeadline(startMs, dayTarget);
                for (; k < cons.length && cons[k].ms <= endMs; k++) {
                    if (cons[k].ms <= startMs) continue;
                    lastMs = cons[k].ms;
                    if (firstLateMs == null && deadlineMs != null && cons[k].ms > deadlineMs) firstLateMs = cons[k].ms;
                }
                if (lastMs == null || deadlineMs == null || deadlineMs >= endMs) continue;
                count(firstLateMs == null, wakes[i].d, firstLateMs == null ? { last: hhmm(lastMs) } : { late: hhmm(firstLateMs) });
            } else {
                // 1.º consumo DESTE ciclo (antes do acordar seguinte); sem
                // consumo nesse ciclo, fica de fora.
                if (j >= cons.length || cons[j].ms >= endMs) continue;
                const after = (cons[j].ms - startMs) / 3600000;
                const ok = meetsOn(wakes[i].d, after);
                if (ok != null) count(ok, wakes[i].d, { time: hhmm(cons[j].ms), after: Math.round(after * 10) / 10 });
            }
        }
    }

    if (goal.type === 'increase_interval') {
        // Dias com ≥2 consumos: cumprido se pelo menos metade dos intervalos
        // chega à meta.
        const byDate = {};
        consumptions.forEach(c => { const d = day(c); if (inRange(d)) (byDate[d] = byDate[d] || []).push(new Date(c.timestamp).getTime()); });
        Object.entries(byDate).forEach(([d, list]) => {
            if (list.length < 2 || tgt(d) == null) return;
            list.sort((x, y) => x - y);
            let long = 0;
            for (let i = 1; i < list.length; i++) if (meetsOn(d, (list[i] - list[i - 1]) / 3600000)) long++;
            count(long >= (list.length - 1) / 2, d, { long, total: list.length - 1 });
        });
    }

    // Um ciclo por dia (o dia em que se acordou). Se houver mais do que um no
    // mesmo dia, conta o registado MAIS TARDE — o mesmo para sono e deitar
    // (antes o sono ficava com o mais antigo e o deitar com o mais recente).
    // A NOITE fica completa quando se regista o acordar: o ciclo de hoje (a
    // noite de ontem para hoje) já conta — não é preciso esperar por amanhã.
    // ("Hoje não conta" é para as metas do dia, que ainda não acabou.)
    // Os dias "não registei os consumos" CONTAM aqui (o sono é conhecido): só
    // ficam de fora os de opts.nightExcludedDates (os atípicos), se vier.
    const nightExcluded = opts.nightExcludedDates || excluded;
    const inRangeNight = (d) => !!d && d <= today && !nightExcluded.has(d)
        && (!opts.fromDate || d >= opts.fromDate) && (!opts.toDate || d <= opts.toDate);
    const latestCycleByDay = (pick) => {
        const byDate = {};
        cycles.forEach(c => {
            const d = day(c);
            if (!inRangeNight(d) || !pick(c)) return;
            if (!byDate[d] || itemMs(c) > itemMs(byDate[d])) byDate[d] = c;
        });
        return byDate;
    };

    if (goal.type === 'sleep_hours') {
        // Horas da NOITE (ciclo; as sestas não entram); bem-estar antigo só se
        // não houver ciclo nesse dia.
        const hasSleep = (x) => x.sleep != null && x.sleep !== '' && !isNaN(parseFloat(x.sleep));
        const byDate = {};
        wellbeingLogs.forEach(w => { const d = day(w); if (inRangeNight(d) && hasSleep(w)) byDate[d] = parseFloat(w.sleep); });
        Object.entries(latestCycleByDay(hasSleep)).forEach(([d, c]) => { byDate[d] = parseFloat(c.sleep); });
        Object.entries(byDate).forEach(([d, h]) => { const ok = meetsOn(d, h); if (ok != null) count(ok, d, h); });
    }

    if (goal.type === 'bedtime_before') {
        // Hora de deitar legível; o resto não se avalia.
        Object.entries(latestCycleByDay(c => !!c.bedtime)).forEach(([d, c]) => {
            const t = tgt(d);
            const ok = t == null ? null : bedtimeMeetsTarget(c.bedtime, t);
            if (ok == null) return;
            count(ok, d, c.bedtime);
        });
    }

    days.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)); // mais recente primeiro
    return { achieved, possible, days };
};
