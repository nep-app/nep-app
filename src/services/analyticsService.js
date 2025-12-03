import { getTodayKey, safeToISODate, formatDateShort, subtractDays, getDateDaysAgo, getTodayPT, timestampToPT, getDateKeyFromItem } from '../utils/helpers';

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
        // tudo (últimos 30 dias - mesma lógica que Progresso)
        const periodDays = 30;
        end = subtractDays(now, offset * periodDays);
        start = subtractDays(end, periodDays - 1);
        start.setHours(0, 0, 0, 0);
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
        const count = consumptions.filter(c => c.date === dateKey).length;
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
        // REGRA: Conta dias com consumos ABAIXO do target (excluindo o target)
        // Ex: target=10 → conta dias com <10 consumos (0-9)
        // IMPORTANTE: Exclui dia atual (que ainda não acabou)
        const today = getTodayPT();
        const consumptionsByDate = {};

        consumptions.forEach(c => {
            // Derivar data do timestamp para garantir consistência
            const dateKey = timestampToPT(c.timestamp);
            if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = 0;
            consumptionsByDate[dateKey]++;
        });

        // Remove dia atual da contagem
        const completedDays = { ...consumptionsByDate };
        delete completedDays[today];

        Object.entries(completedDays).forEach(([date, count]) => {
            const isAchieved = count < goal.target;
            if (isAchieved) achievedCount++;
        });
    }

    if (goal.type === 'reduce_quantity') {
        // REGRA: Conta ciclos com mg ABAIXO do target (excluindo o target)
        // Ex: target=200 → conta ciclos com <200mg
        // IMPORTANTE: Exclui ciclo atual (que ainda não acabou)
        // COMPATIBILIDADE: Busca mg de cycles.mg (novo) ou soma dailyLogs.mg pelo cycleId (antigo)
        const today = getTodayPT();

        cycles.forEach(cycle => {
            const cycleDate = timestampToPT(cycle.timestamp);

            // Tentar buscar mg do cycle primeiro (novo lugar)
            let mgValue = typeof cycle.mg === 'number' ? cycle.mg : parseFloat(cycle.mg);
            let source = 'cycle';

            // Se não tiver no cycle, buscar do dailyLog (compatibilidade)
            if (isNaN(mgValue) || mgValue <= 0) {
                // Tentar buscar pelo cycleId primeiro (dados recentes)
                let dailyLog = dailyLogs.find(log => log.cycleId === cycle.id);

                // Se não encontrou pelo cycleId, tentar por data (dados antigos sem cycleId)
                if (!dailyLog || !dailyLog.mg) {
                    const cycleDay = safeToISODate(cycle.timestamp);
                    dailyLog = dailyLogs.find(log => log.date === cycleDay && log.mg);
                }

                if (dailyLog && dailyLog.mg) {
                    mgValue = typeof dailyLog.mg === 'number' ? dailyLog.mg : parseFloat(dailyLog.mg);
                    source = 'dailyLog';
                }
            }

            if (!isNaN(mgValue) && mgValue > 0) {
                // NÃO ignorar baseado em data, porque mg é sempre do dia anterior
                const isAchieved = mgValue < parseFloat(goal.target);
                if (isAchieved) achievedCount++;
            }
        });
    }

    if (goal.type === 'limit_last') {
        // REGRA: Conta CICLOS onde user marcou lastBefore00=true
        cycles.forEach(cycle => {
            const isAchieved = cycle.lastBefore00 === true;
            if (isAchieved) achievedCount++;
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
        // REGRA: Conta dias com sono ≥ target (7h ou mais)
        // IMPORTANTE: Exclui dia atual (que ainda não acabou)
        // COMPATIBILIDADE: Busca sono de cycles.sleep (novo) ou wellbeingLogs.sleep (antigo)
        const today = getTodayPT();

        // Coletar datas únicas de cycles e wellbeingLogs
        const allDates = new Set([
            ...cycles.map(c => getDateKeyFromItem(c)),
            ...wellbeingLogs.map(w => getDateKeyFromItem(w))
        ]);

        allDates.forEach(date => {
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('pt-PT');
            if (dateStr === today) return; // Skip today

            // Primeiro tenta buscar em cycles
            const cycle = cycles.find(c => {
                const cycleDate = getDateKeyFromItem(c);
                return cycleDate === date && c.sleep != null;
            });
            if (cycle) {
                const isAchieved = parseFloat(cycle.sleep) >= parseFloat(goal.target);
                if (isAchieved) achievedCount++;
                return;
            }

            // Fallback: buscar em wellbeingLogs
            const wellbeing = wellbeingLogs.find(w => {
                const wDate = getDateKeyFromItem(w);
                return wDate === date && w.sleep != null;
            });
            if (wellbeing) {
                const isAchieved = parseFloat(wellbeing.sleep) >= parseFloat(goal.target);
                if (isAchieved) achievedCount++;
            }
        });
    }

    if (goal.type === 'bedtime_before') {
        // REGRA: Conta ciclos onde hora de deitar foi ATÉ o target (incluindo a hora exata)
        // E hora entre 21:00-02:00
        const targetStr = typeof goal.target === 'string' ? goal.target : String(goal.target).padStart(2, '0') + ':00';
        const targetParts = targetStr.split(':');
        const targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

        cycles.forEach(cycle => {
            if (!cycle.bedtime) return;
            const bedtimeParts = cycle.bedtime.split(':');
            let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
            const bedtimeOriginalMinutes = bedtimeMinutes;

            // Meta SÓ é cumprida se hora for entre 21:00-02:00
            const isHealthyBedtime = bedtimeOriginalMinutes >= 1260 || bedtimeOriginalMinutes <= 120;

            // Ajustar madrugada (00:00-05:59 → 24:00-29:59)
            if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) { // 0-5:59
                bedtimeMinutes += 1440; // +24h
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

    return achievedCount;
};
