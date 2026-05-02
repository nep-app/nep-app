import { getTodayKey, safeToISODate, formatDateShort, subtractDays, getDateDaysAgo, getTodayPT, timestampToPT, getDateKeyFromItem } from '../utils/helpers';

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
        days.push(current.toISOString().split('T')[0]);
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
export const calculatePearsonCorrelation = (data, xKey, yKey) => {
    if (data.length < 2) return null;
    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d[xKey], 0);
    const sumY = data.reduce((sum, d) => sum + d[yKey], 0);
    const sumXY = data.reduce((sum, d) => sum + d[xKey] * d[yKey], 0);
    const sumX2 = data.reduce((sum, d) => sum + d[xKey] * d[xKey], 0);
    const sumY2 = data.reduce((sum, d) => sum + d[yKey] * d[yKey], 0);
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
        if (period === 'hoje') return 'Hoje';
        if (period === 'semana') return 'Últimos 7 dias';
        if (period === 'mes') return 'Últimos 30 dias';
        return 'Todo o período';
    }

    if (period === 'hoje') {
        const date = getDateDaysAgo(offset);
        return formatDateShort(date);
    }
    if (period === 'semana') return `${offset} ${offset === 1 ? 'semana' : 'semanas'} atrás`;
    if (period === 'mes') return `${offset} ${offset === 1 ? 'mês' : 'meses'} atrás`;
    return 'Todo o período';
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
export const getGoalAchievementCount = (goal, consumptions, dailyLogs, cycles, wellbeingLogs) => {
    let achievedCount = 0;

    if (goal.type === 'reduce_frequency') {
        // REGRA: Conta TODOS OS DIAS desde primeiro registo com consumos <target
        // Dias sem consumptions (0 consumos) contam como alcançados (se target > 0)
        const allDays = getAllDaysSinceFirstRecord(consumptions);

        // Contar consumptions por dia (usar ISO format para consistência)
        const consumptionsByDate = {};
        consumptions.forEach(c => {
            const dateKey = new Date(c.timestamp).toISOString().split('T')[0];
            if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = 0;
            consumptionsByDate[dateKey]++;
        });

        // Verificar cada dia
        allDays.forEach(date => {
            const count = consumptionsByDate[date] || 0; // Dias sem consumptions = 0
            const isAchieved = count < goal.target;
            if (isAchieved) achievedCount++;
        });
    }

    if (goal.type === 'reduce_quantity') {
        // REGRA: Conta DIAS com mg ABAIXO do target (excluindo o target)
        // Ex: target=200 → conta dias com <200mg
        // IMPORTANTE: Exclui dia atual (que ainda não acabou)
        const today = getTodayKey();

        // Agrupar mg por data (dailyLogs + cycles antigos)
        const mgByDate = {};

        // Ler mg de dailyLogs (novo sistema)
        dailyLogs.forEach(log => {
            if (!log.date || log.mg == null) return;
            if (!mgByDate[log.date]) mgByDate[log.date] = 0;
            const mgValue = typeof log.mg === 'number' ? log.mg : parseFloat(log.mg);
            if (!isNaN(mgValue)) mgByDate[log.date] += mgValue;
        });

        // Ler mg de cycles (dados antigos - antes de removermos o campo)
        cycles.forEach(cycle => {
            if (!cycle.mg) return;
            const dateKey = getDateKeyFromItem(cycle);
            if (!dateKey) return;
            if (!mgByDate[dateKey]) mgByDate[dateKey] = 0;
            const mgValue = typeof cycle.mg === 'number' ? cycle.mg : parseFloat(cycle.mg);
            if (!isNaN(mgValue)) mgByDate[dateKey] += mgValue;
        });

        // Contar dias abaixo do target (excluindo hoje)
        Object.entries(mgByDate).forEach(([date, totalMg]) => {
            if (date === today) return; // Excluir dia atual
            const isAchieved = totalMg < parseFloat(goal.target);
            if (isAchieved) achievedCount++;
        });
    }

    if (goal.type === 'limit_last') {
        const today = getTodayPT();
        const targetStr = typeof goal.target === 'string' ? goal.target : '00:00';
        const [th, tm] = targetStr.split(':').map(Number);
        const targetMinutes = th * 60 + (tm || 0);

        const consumptionsByDate = {};
        consumptions.forEach(c => {
            const dateKey = timestampToPT(c.timestamp);
            if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = [];
            consumptionsByDate[dateKey].push(c);
        });
        delete consumptionsByDate[today];

        Object.values(consumptionsByDate).forEach(dayConsumptions => {
            if (dayConsumptions.length === 0) return;
            const last = dayConsumptions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            const d = new Date(last.timestamp);
            const lastMinutes = d.getHours() * 60 + d.getMinutes();
            if (lastMinutes < targetMinutes) achievedCount++;
        });
    }

    if (goal.type === 'increase_interval') {
        // REGRA: Conta DIAS onde ≥50% dos intervalos são >target
        // IMPORTANTE: Exclui dia atual (que ainda não acabou)
        const today = getTodayPT();
        const consumptionsByDate = {};

        consumptions.forEach(c => {
            const dateKey = timestampToPT(c.timestamp);
            if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = [];
            consumptionsByDate[dateKey].push(c);
        });

        // Remove dia atual da contagem
        delete consumptionsByDate[today];

        Object.entries(consumptionsByDate).forEach(([date, dayConsumptions]) => {
            if (dayConsumptions.length < 2) {
                return;
            }

            const sorted = dayConsumptions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            let longIntervals = 0;
            let totalIntervals = 0;

            for (let i = 1; i < sorted.length; i++) {
                const intervalHours = (new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp)) / (1000 * 60 * 60);
                totalIntervals++;
                const isLong = intervalHours > goal.target;
                if (isLong) longIntervals++;
            }

            const isAchieved = longIntervals >= totalIntervals / 2;

            if (isAchieved) achievedCount++;
        });
    }

    if (goal.type === 'sleep_hours') {
        // REGRA: Conta TODOS OS DIAS com dados de sono (cycles ou wellbeing)
        // Não importa se teve ou não consumptions
        // Buscar todas as datas únicas com dados de sono
        const today = getTodayKey();
        const datesWithSleep = new Set();

        cycles.forEach(c => {
            const dateKey = getDateKeyFromItem(c);
            if (dateKey && dateKey !== today && c.sleep != null && c.sleep !== '') {
                datesWithSleep.add(dateKey);
            }
        });

        wellbeingLogs.forEach(w => {
            const dateKey = getDateKeyFromItem(w);
            if (dateKey && dateKey !== today && w.sleep != null && w.sleep !== '') {
                datesWithSleep.add(dateKey);
            }
        });

        // Para cada dia com dados de sono, verificar se atingiu a meta
        datesWithSleep.forEach(date => {
            // Buscar dados de sono para este dia (priorizar cycle)
            const cycle = cycles.find(c => getDateKeyFromItem(c) === date && c.sleep != null);
            const wellbeing = wellbeingLogs.find(w => getDateKeyFromItem(w) === date && w.sleep != null);

            const sleep = cycle ? parseFloat(cycle.sleep) : (wellbeing ? parseFloat(wellbeing.sleep) : 0);
            const isAchieved = sleep >= parseFloat(goal.target);
            if (isAchieved) achievedCount++;
        });
    }

    if (goal.type === 'bedtime_before') {
        // REGRA: Conta TODOS OS DIAS com consumptions
        // Dias COM consumptions mas SEM bedtime = falha
        // Dias SEM consumptions = não relevantes (não contam)
        const allDays = getAllDaysSinceFirstRecord(consumptions);
        const targetStr = typeof goal.target === 'string' ? goal.target : String(goal.target).padStart(2, '0') + ':00';
        const targetParts = targetStr.split(':');
        const targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

        // Mapear consumptions por dia (usar ISO format)
        const consumptionsByDate = {};
        consumptions.forEach(c => {
            const dateKey = new Date(c.timestamp).toISOString().split('T')[0];
            consumptionsByDate[dateKey] = true;
        });

        // Verificar cada dia
        allDays.forEach(date => {
            // Só conta dias com consumptions
            if (!consumptionsByDate[date]) return;

            // Buscar cycle para este dia
            const cycle = cycles.find(c => getDateKeyFromItem(c) === date && c.bedtime);

            if (!cycle || !cycle.bedtime) {
                // Sem dados de bedtime = falha
                return;
            }

            const bedtimeParts = cycle.bedtime.split(':');
            let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
            const bedtimeOriginalMinutes = bedtimeMinutes;

            // Meta SÓ é cumprida se hora for entre 21:00-02:00
            const isHealthyBedtime = bedtimeOriginalMinutes >= 1260 || bedtimeOriginalMinutes <= 120;

            // Ajustar madrugada (00:00-05:59 → 24:00-29:59)
            if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) {
                bedtimeMinutes += 1440;
            }

            // Ajustar target se for madrugada
            let targetAdjusted = targetMinutes;
            if (targetMinutes >= 0 && targetMinutes < 360) {
                targetAdjusted += 1440;
            }

            const isAchieved = bedtimeMinutes <= targetAdjusted && isHealthyBedtime;
            if (isAchieved) achievedCount++;
        });
    }

    if (goal.type === 'first_not_before') {
        const today = getTodayPT();
        const targetHours = parseFloat(goal.target) || 1;

        const consumptionsByDate = {};
        consumptions.forEach(c => {
            const dateKey = timestampToPT(c.timestamp);
            if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = [];
            consumptionsByDate[dateKey].push(c);
        });
        delete consumptionsByDate[today];

        Object.entries(consumptionsByDate).forEach(([date, dayConsumptions]) => {
            if (dayConsumptions.length === 0) return;

            // Calcular hora de acordar: bedtime + sleep do ciclo desse dia
            const cycle = cycles.find(c => getDateKeyFromItem(c) === date && c.bedtime && c.sleep);
            if (!cycle) return; // sem dados de sono = não avaliável

            const [bh, bm] = cycle.bedtime.split(':').map(Number);
            let wakeupMinutes = bh * 60 + bm + parseFloat(cycle.sleep) * 60;
            if (wakeupMinutes >= 1440) wakeupMinutes -= 1440; // normalizar para 0-1439

            const targetMinutes = wakeupMinutes + targetHours * 60;
            const first = dayConsumptions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
            const d = new Date(first.timestamp);
            const firstMinutes = d.getHours() * 60 + d.getMinutes();
            if (firstMinutes >= targetMinutes % 1440) achievedCount++;
        });
    }

    return achievedCount;
};
