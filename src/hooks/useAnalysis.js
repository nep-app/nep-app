import { useMemo, useState, useEffect } from 'react';
import { getTodayKey as getTodayKeyHelper, safeToISODate, getDateDaysAgo, getDateKeyFromItem } from '../utils/helpers';
import { getUserStats } from '../utils/userStats';

export const useAnalysis = (consumptions, wellbeingLogs, reflections, cycles, goals, thoughts = [], dailyLogs = []) => {
  // Carregar stats pré-calculadas (para mostrar streak LOGO no boot)
  const [cachedStats, setCachedStats] = useState(null);

  useEffect(() => {
    // Carregar stats ao montar
    getUserStats().then(stats => {
      console.log('[useAnalysis] 📊 Stats carregadas do cache:', stats);
      setCachedStats(stats);
    });
  }, []);
  // Helper: Get last 7 days dates
  const getLast7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = getDateDaysAgo(i);
      days.push(safeToISODate(d));
    }
    return days;
  }, []);

  // Helper: Get today's key
  const getTodayKey = useMemo(() => {
    return getTodayKeyHelper();
  }, []);

  // Memoized interval statistics
  const intervalStats = useMemo(() => {
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
  }, [consumptions]);

  // Memoized last interval
  const lastInterval = useMemo(() => {
    if (consumptions.length < 2) return null;
    const sorted = [...consumptions].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    const last = new Date(sorted[0].timestamp);
    const secondLast = new Date(sorted[1].timestamp);
    const diffMs = last - secondLast;
    const hours = diffMs / (1000 * 60 * 60);
    return { hours: hours.toFixed(1), isShort: hours < 2 };
  }, [consumptions]);

  // Memoized today's consumptions
  const todayConsumptions = useMemo(() => {
    const today = getTodayKeyHelper();
    return consumptions.filter(c => getDateKeyFromItem(c) === today);
  }, [consumptions]);

  // Memoized temporal correlations (ALREADY OPTIMIZED)
  const temporalCorrelations = useMemo(() => {
    if (!wellbeingLogs || !consumptions || wellbeingLogs.length === 0 || consumptions.length === 0) return null;

    const getCorrelation = (x, y) => {
      const n = x.length;
      if (n === 0) return 0;
      const meanX = x.reduce((a, b) => a + b, 0) / n;
      const meanY = y.reduce((a, b) => a + b, 0) / n;
      let num = 0, denX = 0, denY = 0;
      for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      const denominator = Math.sqrt(denX * denY);
      return denominator === 0 ? 0 : num / denominator;
    };

    const consumptionsByDate = {};
    consumptions.forEach(c => {
      consumptionsByDate[c.date] = (consumptionsByDate[c.date] || 0) + 1;
    });

    const moodData = [], energyData = [], consData = [];
    wellbeingLogs.forEach(log => {
      if (consumptionsByDate[log.date]) {
        moodData.push(log.mood);
        energyData.push(log.energy);
        consData.push(consumptionsByDate[log.date]);
      }
    });

    if (moodData.length < 3) return null;

    return {
      moodConsumption: getCorrelation(moodData, consData),
      energyConsumption: getCorrelation(energyData, consData)
    };
  }, [wellbeingLogs, consumptions]);

  // Memoized bidirectional analysis (ALREADY OPTIMIZED)
  const bidirectionalAnalysis = useMemo(() => {
    if (!wellbeingLogs || !consumptions || wellbeingLogs.length === 0 || consumptions.length === 0) return null;

    const getCorrelation = (x, y) => {
      const n = x.length;
      if (n === 0) return 0;
      const meanX = x.reduce((a, b) => a + b, 0) / n;
      const meanY = y.reduce((a, b) => a + b, 0) / n;
      let num = 0, denX = 0, denY = 0;
      for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      const denominator = Math.sqrt(denX * denY);
      return denominator === 0 ? 0 : num / denominator;
    };

    const wellbeingByDate = {};
    wellbeingLogs.forEach(log => {
      if (!wellbeingByDate[log.date]) wellbeingByDate[log.date] = [];
      wellbeingByDate[log.date].push({ mood: log.mood, energy: log.energy, timestamp: log.timestamp });
    });

    const consumptionsByDate = {};
    consumptions.forEach(c => {
      if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = [];
      consumptionsByDate[c.date].push(c.timestamp);
    });

    const moodBefore = [], energyBefore = [], moodAfter = [], energyAfter = [];
    const consCount = [];

    Object.keys(wellbeingByDate).forEach(date => {
      const dayWellbeing = wellbeingByDate[date];
      const dayCons = consumptionsByDate[date] || [];

      if (dayCons.length === 0) return;

      const before = dayWellbeing.filter(w => dayCons.some(c => new Date(w.timestamp) < new Date(c)));
      const after = dayWellbeing.filter(w => dayCons.some(c => new Date(w.timestamp) > new Date(c)));

      if (before.length > 0 && after.length > 0) {
        const avgMoodBefore = before.reduce((sum, w) => sum + w.mood, 0) / before.length;
        const avgEnergyBefore = before.reduce((sum, w) => sum + w.energy, 0) / before.length;
        const avgMoodAfter = after.reduce((sum, w) => sum + w.mood, 0) / after.length;
        const avgEnergyAfter = after.reduce((sum, w) => sum + w.energy, 0) / after.length;

        moodBefore.push(avgMoodBefore);
        energyBefore.push(avgEnergyBefore);
        moodAfter.push(avgMoodAfter);
        energyAfter.push(avgEnergyAfter);
        consCount.push(dayCons.length);
      }
    });

    if (moodBefore.length < 3) return null;

    const wellbeingImpactsConsumption = {
      moodLeadsToConsumption: getCorrelation(moodBefore, consCount),
      energyLeadsToConsumption: getCorrelation(energyBefore, consCount)
    };

    const consumptionImpactsWellbeing = {
      moodAfterConsumption: getCorrelation(consCount, moodAfter),
      energyAfterConsumption: getCorrelation(consCount, energyAfter)
    };

    const avgMoodChange = moodAfter.reduce((sum, val, i) => sum + (val - moodBefore[i]), 0) / moodAfter.length;
    const avgEnergyChange = energyAfter.reduce((sum, val, i) => sum + (val - energyBefore[i]), 0) / energyAfter.length;

    return {
      wellbeingImpactsConsumption,
      consumptionImpactsWellbeing,
      avgMoodChange,
      avgEnergyChange
    };
  }, [wellbeingLogs, consumptions]);

  // Streak calculation (usa cachedStats durante FASE 1 - boot rápido!)
  const streaks = useMemo(() => {
    // PRIORIDADE 1: Se temos cachedStats, usar SEMPRE (são calculados com TODOS os dados)
    // Isto garante streak correto mesmo durante FASE 1 (7 dias incompletos)
    if (cachedStats?.streak !== undefined && cachedStats.streak > 0) {
      console.log('[useAnalysis] ⚡ Usando streak do cache (completo):', cachedStats.streak);
      return { current: cachedStats.streak, max: cachedStats.streak };
    }

    // PRIORIDADE 2: Calcular dos dados desencriptados (FASE 2 ou se cache vazio)
    const hasAnyData = consumptions.length > 0 || wellbeingLogs.length > 0 || thoughts.length > 0 || reflections.length > 0 || dailyLogs.length > 0;
    if (!hasAnyData) {
      console.log('[useAnalysis] ℹ️ Sem dados para calcular streak');
      return { current: 0, max: 0 };
    }

    console.log('[useAnalysis] 🔢 Calculando streak dos dados desencriptados...');
    const allDates = [...new Set([
      ...consumptions.map(c => c.date),
      ...wellbeingLogs.map(w => w.date),
      ...thoughts.map(t => t.date),
      ...reflections.map(r => r.date),
      ...dailyLogs.map(l => l.date),
    ].filter(Boolean))].sort();
    let streak = 1;
    let maxStreak = 1;

    for (let i = 1; i < allDates.length; i++) {
      const prev = new Date(allDates[i-1]);
      const curr = new Date(allDates[i]);
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }

    return { current: streak, max: maxStreak };
  }, [consumptions, wellbeingLogs, thoughts, reflections, dailyLogs, cachedStats]);

  // Goal progress calculation
  const getGoalProgress = (goal) => {
    if (!goal) return 0;

    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);
    const today = new Date();

    const relevantConsumptions = consumptions.filter(c => {
      const cDate = new Date(c.date);
      return cDate >= startDate && cDate <= endDate;
    });

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const targetTotal = goal.targetCount * totalDays;
    const actualTotal = relevantConsumptions.length;

    return Math.min(100, ((targetTotal - actualTotal) / targetTotal) * 100);
  };

  return {
    getLast7Days,
    getTodayKey,
    intervalStats,
    lastInterval,
    todayConsumptions,
    temporalCorrelations,
    bidirectionalAnalysis,
    streaks,
    getGoalProgress,
  };
};
