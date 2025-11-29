import { getTodayKey } from '../utils/helpers';

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
        end = new Date(now);
        end.setDate(end.getDate() - offset);
        start = new Date(end);
        start.setHours(0, 0, 0, 0);
    } else if (period === 'semana') {
        // Week (last 7 days)
        end = new Date(now);
        end.setDate(end.getDate() - (offset * 7));
        start = new Date(end);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
    } else if (period === 'mes') {
        // Month (last 30 days)
        end = new Date(now);
        end.setDate(end.getDate() - (offset * 30));
        start = new Date(end);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
    } else {
        // tudo (últimos 30 dias - mesma lógica que Progresso)
        const periodDays = 30;
        end = new Date(now);
        end.setDate(end.getDate() - (offset * periodDays));
        start = new Date(end);
        start.setDate(start.getDate() - (periodDays - 1));
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
        const date = new Date();
        date.setDate(date.getDate() - offset);
        return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
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
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
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
