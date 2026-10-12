import { getTodayKey, safeToISODate, formatDateShort, subtractDays, getDateDaysAgo, getTodayPT, timestampToPT, getDateKeyFromItem, bedtimeMeetsTarget, limitLastDeadline } from '../utils/helpers';
import i18n from '../i18n';

// ===== HELPER FUNCTIONS =====

/**
 * Gera array de todos os dias desde o primeiro consumption até ontem
 * @param {Array} consumptions - Array de consumptions
 * @returns {Array} Array de datas em formato ISO (YYYY-MM-DD)
 */
export const getAllDaysSinceFirstRecord = (consumptions) => {
    if (!consumptions || consumptions.length === 0) return [];

    // Encontrar primeiro consumption
    const timestamps = consumptions.map(c => new Date(c.timestamp).getTime()).filter(t => !isNaN(t));
    if (timestamps.length === 0) return [];

    const firstTimestamp = Math.min(...timestamps);
    const firstDate = new Date(firstTimestamp);
    const today = new Date();

    // Gerar todos os dias desde firstDate até ontem
    const days = [];
    const current = new Date(firstDate);
    current.setHours(0, 0, 0, 0);

    while (current < today) {
        days.push(safeToISODate(current));
        current.setDate(current.getDate() + 1);
    }

    return days;
};

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

/**
 * Calculate achievement count for a specific goal
 * @param {Object} goal - The goal object with type and target
 * @param {Array} consumptions - Array of consumption records (optional, defaults to all)
 * @param {Array} dailyLogs - Array of daily logs (optional, defaults to all)
 * @param {Array} cycles - Array of cycles (optional, defaults to all)
 * @param {Array} wellbeingLogs - Array of wellbeing logs (optional, defaults to all)
 * @returns {number} Number of times the goal was achieved
 */
export const getGoalAchievementCount = (goal, consumptions, dailyLogs, cycles, wellbeingLogs, opts) =>
    getGoalAchievement(goal, consumptions, dailyLogs, cycles, wellbeingLogs, opts).achieved;

/**
 * Cumprimento de uma meta: { achieved, possible } — os dias (ou ciclos) em que
 * se cumpriu e os que CONTAM, calculados no MESMO ciclo, pela MESMA regra.
 *
 * Antes o "cumpridos" vinha daqui e o "possíveis" era contado à parte nos
 * Padrões, com regras diferentes — dava percentagens erradas:
 *  - frequência: dias sem consumos entravam no total mas nunca nos cumpridos;
 *  - quantidade: os mg das pesagens não entravam (só "Registar mg" à mão);
 *  - 1.º consumo depois de acordar: sem ciclo, inventava acordar às 08:00;
 *  - último consumo: o total contava ciclos pela meia-noite, não pela meta.
 *
 * Regras comuns: hoje não conta (o dia ainda não acabou); dias atípicos e
 * "não registei" (opts.excludedDates) ficam de fora; um dia sem dados para a
 * meta não conta nem como cumprido nem como falhado ("não sei").
 * "Igual à meta" conta como cumprido em todas.
 *
 * @param {Object} opts { excludedDates?: Set<string>, measuredMgByDate?: {date: mg} }
 */
export const getGoalAchievement = (goal, consumptions = [], dailyLogs = [], cycles = [], wellbeingLogs = [], opts = {}) => {
    const today = getTodayKey();
    const atypicalDates = new Set(
        (wellbeingLogs || []).filter(w => w.isAtypical).map(w => w.date || getDateKeyFromItem(w)).filter(Boolean)
    );
    const excludedExtra = opts.excludedDates || new Set();
    const isOut = (date) => !date || date === today || atypicalDates.has(date) || excludedExtra.has(date);
    const dayOf = (x) => x.date || getDateKeyFromItem(x) || safeToISODate(x.timestamp);

    consumptions = (consumptions || []).filter(c => !isOut(dayOf(c)) || dayOf(c) === today);
    dailyLogs = (dailyLogs || []).filter(l => !l?.notLogged && !isOut(dayOf(l)));
    cycles = (cycles || []).filter(c => !isOut(dayOf(c)) || dayOf(c) === today);
    const target = goal.type === 'limit_last' || goal.type === 'bedtime_before' ? goal.target : parseFloat(goal.target);

    let achieved = 0, possible = 0;

    if (goal.type === 'reduce_frequency') {
        // Dias desde o 1.º consumo até ontem. Um dia sem consumos só conta se
        // houver OUTRO registo nesse dia (ciclo, bem-estar, mg) — aí sabe-se
        // que foi um dia a zero; sem nenhum registo, não se sabe e fica de fora.
        const counts = {};
        consumptions.forEach(c => { const d = dayOf(c); if (!isOut(d)) counts[d] = (counts[d] || 0) + 1; });
        const otherRecordDays = new Set([
            ...cycles.map(dayOf), ...dailyLogs.map(dayOf),
            ...(wellbeingLogs || []).map(dayOf),
        ].filter(d => !isOut(d)));
        getAllDaysSinceFirstRecord(consumptions).forEach(d => {
            if (isOut(d)) return;
            const n = counts[d] || 0;
            if (n === 0 && !otherRecordDays.has(d)) return;
            possible++;
            if (n <= target) achieved++;
        });
    }

    if (goal.type === 'reduce_quantity') {
        // mg por dia: "Registar mg" à mão manda; senão, mg MEDIDOS pelas
        // pesagens (só dias 100% medidos — nunca estimativas); e o campo
        // antigo dos ciclos.
        const mgByDate = {};
        const add = (d, v) => { const n = typeof v === 'number' ? v : parseFloat(v); if (d && !isOut(d) && !isNaN(n)) mgByDate[d] = (mgByDate[d] || 0) + n; };
        dailyLogs.forEach(l => { if (l.mg != null && l.mg !== '') add(l.date || dayOf(l), l.mg); });
        cycles.forEach(c => { if (c.mg) add(dayOf(c), c.mg); });
        Object.entries(opts.measuredMgByDate || {}).forEach(([d, mg]) => { if (!(d in mgByDate)) add(d, mg); });
        Object.values(mgByDate).forEach(mg => { possible++; if (mg <= target) achieved++; });
    }

    if (goal.type === 'limit_last') {
        // Por ciclo de sono FECHADO: algum consumo depois da hora da meta → falhou.
        const starts = cycles.map(c => new Date(c.timestamp || c.date).getTime()).filter(ms => !isNaN(ms)).sort((a, b) => a - b);
        const consMs = consumptions.map(c => new Date(c.timestamp).getTime()).filter(ms => !isNaN(ms));
        for (let i = 0; i < starts.length - 1; i++) {
            const startMs = starts[i], endMs = starts[i + 1];
            const cycleCons = consMs.filter(ms => ms > startMs && ms <= endMs);
            if (cycleCons.length === 0) continue;
            const deadlineMs = limitLastDeadline(startMs, target);
            if (deadlineMs == null || deadlineMs >= endMs) continue;
            possible++;
            if (!cycleCons.some(ms => ms > deadlineMs)) achieved++;
        }
    }

    if (goal.type === 'increase_interval') {
        // Dias com ≥2 consumos: cumprido se pelo menos metade dos intervalos
        // chega à meta (igual à meta conta).
        const byDate = {};
        consumptions.forEach(c => { const d = dayOf(c); if (!isOut(d)) (byDate[d] = byDate[d] || []).push(new Date(c.timestamp).getTime()); });
        Object.values(byDate).forEach(list => {
            if (list.length < 2) return;
            list.sort((x, y) => x - y);
            let long = 0;
            for (let i = 1; i < list.length; i++) if ((list[i] - list[i - 1]) / 3600000 >= target) long++;
            possible++;
            if (long >= (list.length - 1) / 2) achieved++;
        });
    }

    if (goal.type === 'sleep_hours') {
        // Horas da NOITE (ciclo); bem-estar antigo só se não houver ciclo.
        const byDate = {};
        (wellbeingLogs || []).forEach(w => { const d = dayOf(w); if (!isOut(d) && w.sleep != null && w.sleep !== '' && !isNaN(parseFloat(w.sleep))) byDate[d] = parseFloat(w.sleep); });
        cycles.forEach(c => { const d = dayOf(c); if (!isOut(d) && c.sleep != null && c.sleep !== '' && !isNaN(parseFloat(c.sleep))) byDate[d] = parseFloat(c.sleep); });
        Object.values(byDate).forEach(h => { possible++; if (h >= target) achieved++; });
    }

    if (goal.type === 'bedtime_before') {
        // Um ciclo por dia com hora de deitar legível.
        const seen = new Set();
        cycles.forEach(c => {
            const d = dayOf(c);
            if (isOut(d) || !c.bedtime || seen.has(d)) return;
            const ok = bedtimeMeetsTarget(c.bedtime, target);
            if (ok == null) return;
            seen.add(d);
            possible++;
            if (ok) achieved++;
        });
    }

    if (goal.type === 'first_not_before') {
        // Só dias em que se sabe a hora de acordar (há ciclo com hora). Sem
        // ciclo NÃO se inventa uma hora de acordar — o dia fica de fora.
        const cycleByDate = {};
        cycles.forEach(c => { const d = dayOf(c); const ts = new Date(c.timestamp || c.createdAt).getTime(); if (!isOut(d) && !isNaN(ts) && !(d in cycleByDate)) cycleByDate[d] = ts; });
        const consMs = consumptions.map(c => new Date(c.timestamp).getTime()).filter(ms => !isNaN(ms)).sort((x, y) => x - y);
        Object.values(cycleByDate).forEach(wakeMs => {
            const first = consMs.find(ms => ms >= wakeMs && ms < wakeMs + 24 * 3600000);
            if (first == null) return; // nenhum consumo depois de acordar
            possible++;
            if (first - wakeMs >= target * 3600000) achieved++;
        });
    }

    return { achieved, possible };
};
