import React, { createContext, useContext, useMemo } from 'react';
import { useData } from './DataContext';
import { useAnalysis } from '../hooks/useAnalysis';
import * as analyticsService from '../services/analyticsService';
import { getTodayKey, safeToISODate, getDateDaysAgo, getDateKeyFromItem } from '../utils/helpers';

const MetricsContext = createContext();

export const useMetrics = () => {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within MetricsProvider');
  }
  return context;
};

export const MetricsProvider = ({ children }) => {
  const { consumptions, wellbeingLogs, reflections, cycles, goals, dailyLogs, thoughts } = useData();

  const atypicalDates = useMemo(() => {
    const s = new Set();
    wellbeingLogs.forEach(w => {
      if (w.isAtypical) {
        const d = w.date || getDateKeyFromItem(w);
        if (d) s.add(d);
      }
    });
    return s;
  }, [wellbeingLogs]);

  const filteredConsumptions = useMemo(() =>
    consumptions.filter(c => !atypicalDates.has(c.date || getDateKeyFromItem(c))),
  [consumptions, atypicalDates]);

  const filteredCycles = useMemo(() =>
    cycles.filter(c => !atypicalDates.has(c.date || getDateKeyFromItem(c))),
  [cycles, atypicalDates]);

  const filteredDailyLogs = useMemo(() =>
    dailyLogs.filter(l => !atypicalDates.has(l.date || getDateKeyFromItem(l))),
  [dailyLogs, atypicalDates]);

  const filteredWellbeingLogs = useMemo(() =>
    wellbeingLogs.filter(w => !w.isAtypical),
  [wellbeingLogs]);

  // Use analysis hook for core analytics
  const analysis = useAnalysis(filteredConsumptions, filteredWellbeingLogs, reflections, filteredCycles, goals, thoughts, filteredDailyLogs);

  // todayConsumptions from raw data (factual — not excluded on atypical days)
  const todayConsumptions = useMemo(() => {
    const today = getTodayKey();
    return consumptions.filter(c => getDateKeyFromItem(c) === today);
  }, [consumptions]);

  // OTIMIZAÇÃO: Criar índices por data para acesso O(1) em vez de O(n)
  const cyclesByDate = useMemo(() => {
    const index = {};
    filteredCycles.forEach(c => {
      const dateKey = getDateKeyFromItem(c);
      if (!index[dateKey]) {
        index[dateKey] = c;
      }
    });
    return index;
  }, [filteredCycles]);

  const dailyLogsByDate = useMemo(() => {
    // Accumulate total mg per date (multiple entries per day are summed)
    const mgByDate = {};
    filteredDailyLogs.forEach(log => {
      const dateKey = log.date || getDateKeyFromItem(log);
      if (log.mg == null) return;
      const mgValue = typeof log.mg === 'number' ? log.mg : parseFloat(log.mg);
      if (isNaN(mgValue)) return;
      mgByDate[dateKey] = (mgByDate[dateKey] || 0) + mgValue;
    });
    // Return objects with mg field for compatibility with consumers
    const index = {};
    Object.entries(mgByDate).forEach(([date, mg]) => {
      index[date] = { mg };
    });
    return index;
  }, [filteredDailyLogs]);

  const wellbeingByDate = useMemo(() => {
    const index = {};
    filteredWellbeingLogs.forEach(w => {
      const dateKey = getDateKeyFromItem(w);
      if (!index[dateKey]) {
        index[dateKey] = w;
      }
    });
    return index;
  }, [filteredWellbeingLogs]);

  // ===== CONSUMPTION METRICS =====

  const consumptionsByDate = useMemo(() => {
    const index = {};
    filteredConsumptions.forEach(c => {
      const dateKey = getDateKeyFromItem(c);
      index[dateKey] = (index[dateKey] || 0) + 1;
    });
    return index;
  }, [filteredConsumptions]);

  // RESUMO-POR-DIA (rollup): calculado UMA vez sobre todos os consumos.
  // As páginas pesadas leem isto (≈240 dias) em vez de percorrer milhares de
  // registos a cada visita. { [data]: { count, manha, tarde, noite, madrugada } }
  const consumptionDailyRollup = useMemo(() => {
    const r = {};
    filteredConsumptions.forEach(c => {
      const dk = c.date || getDateKeyFromItem(c);
      if (!dk) return;
      let day = r[dk];
      if (!day) day = r[dk] = { count: 0, manha: 0, tarde: 0, noite: 0, madrugada: 0 };
      day.count++;
      const hour = new Date(c.timestamp).getHours();
      if (hour >= 6 && hour < 12) day.manha++;
      else if (hour >= 12 && hour < 18) day.tarde++;
      else if (hour >= 18 && hour < 24) day.noite++;
      else day.madrugada++;
    });
    return r;
  }, [filteredConsumptions]);

  // Time since last consumption
  const timeSinceLastConsumption = useMemo(() => {
    return analyticsService.calculateTimeSinceLastConsumption(consumptions);
  }, [consumptions]);

  // Last 7 days with averages (times and mg)
  const last7Days = useMemo(() => {
    const last7Dates = [...Array(7)].map((_, i) => {
      const d = getDateDaysAgo(i + 1); // Start from yesterday (exclude today)
      return safeToISODate(d);
    });

    let totalConsumptions = 0;
    let nonAtypicalDayCount = 0;
    last7Dates.forEach(date => {
      if (atypicalDates.has(date)) return;
      nonAtypicalDayCount++;
      totalConsumptions += consumptionsByDate[date] || 0;
    });

    const avgTimes = nonAtypicalDayCount > 0 ? (totalConsumptions / nonAtypicalDayCount).toFixed(1) : '0.0';

    // Calculate avgMg from cycles (novo) ou dailyLogs (compatibilidade)
    const mgValues = [];

    last7Dates.forEach(date => {
      // Buscar primeiro nos cycles (novo método) - OTIMIZADO com índice
      const cycle = cyclesByDate[date];
      if (cycle && cycle.mg !== undefined && cycle.mg !== '') {
        const mgValue = typeof cycle.mg === 'number' ? cycle.mg : parseFloat(cycle.mg);
        if (!isNaN(mgValue) && mgValue > 0) {
          mgValues.push(mgValue);
          return;
        }
      }

      // Fallback: buscar nos dailyLogs (compatibilidade) - OTIMIZADO com índice
      const dailyLog = dailyLogsByDate[date];
      if (dailyLog && dailyLog.mg !== undefined && !isNaN(parseFloat(dailyLog.mg))) {
        const mgValue = typeof dailyLog.mg === 'number' ? dailyLog.mg : parseFloat(dailyLog.mg);
        if (!isNaN(mgValue)) {
          mgValues.push(mgValue);
        }
      }
    });

    const avgMg = mgValues.length > 0 ? (mgValues.reduce((sum, mg) => sum + mg, 0) / mgValues.length).toFixed(0) : 0;

    return { avgTimes, avgMg };
  }, [consumptionsByDate, cyclesByDate, dailyLogsByDate, atypicalDates]);

  // Average frequency with 2h+ interval rule
  const avgFrequencyLast7Days = useMemo(() => {
    // Exclude today (day 0) and get last 7 completed days (days 1-7)
    const last7Dates = [...Array(7)].map((_, i) => {
      const d = getDateDaysAgo(i + 1); // Start from yesterday
      return safeToISODate(d);
    });

    let validDaysCount = 0;
    let totalConsumptions = 0;

    last7Dates.forEach(date => {
      const dayConsumptions = filteredConsumptions.filter(c => getDateKeyFromItem(c) === date);
      if (dayConsumptions.length === 0) return;

      // Check interval rule if more than 1 consumption
      if (dayConsumptions.length === 1) {
        validDaysCount++;
        totalConsumptions += 1;
        return;
      }

      const sorted = dayConsumptions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      let longIntervals = 0;
      for (let i = 1; i < sorted.length; i++) {
        const intervalHours = (sorted[i].timestamp - sorted[i - 1].timestamp) / (1000 * 60 * 60);
        if (intervalHours >= 2) longIntervals++;
      }

      const totalIntervals = sorted.length - 1;
      if (longIntervals >= totalIntervals / 2) {
        validDaysCount++;
        totalConsumptions += dayConsumptions.length;
      }
    });

    return validDaysCount > 0 ? (totalConsumptions / validDaysCount) : 0;
  }, [filteredConsumptions]);

  // ===== GOAL PROGRESS =====

  const getGoalProgress = useMemo(() => {
    return (goal) => {
      if (goal.type === 'reduce_frequency') {
        const avgLast7 = avgFrequencyLast7Days;
        if (avgLast7 === 0) return 100; // No consumptions = goal achieved
        if (avgLast7 <= goal.target) return 100;
        const baseline = Math.max(avgLast7, goal.target * 2);
        const progress = ((baseline - avgLast7) / (baseline - goal.target)) * 100;
        return Math.max(0, Math.min(100, progress));
      }

      if (goal.type === 'reduce_quantity') {
        const avgLast7Mg = parseFloat(last7Days.avgMg);
        if (avgLast7Mg === 0) return 0;
        if (avgLast7Mg < goal.target) return 100;
        const baseline = Math.max(avgLast7Mg, goal.target * 2);
        const progress = ((baseline - avgLast7Mg) / (baseline - goal.target)) * 100;
        return Math.max(0, Math.min(100, progress));
      }

      if (goal.type === 'increase_interval') {
        if (!analysis.intervalStats) return 0;
        const avg = parseFloat(analysis.intervalStats.avgHours);
        if (avg >= goal.target) return 100;
        const progress = (avg / goal.target) * 100;
        return Math.max(0, Math.min(100, progress));
      }

      // ALTERAÇÃO 7: Nova meta "Hora do último consumo diário"
      if (goal.type === 'limit_last') {
        const targetStr = typeof goal.target === 'string' ? goal.target : '00:00';
        const [th, tm] = targetStr.split(':').map(Number);
        const targetMinutes = (th === 0 && (tm || 0) === 0) ? 1440 : th * 60 + (tm || 0);

        const localDateKey = (ts) => {
          const d = new Date(ts);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        };

        const byDay = {};
        filteredConsumptions.forEach(c => {
          const key = localDateKey(c.timestamp || c.createdAt);
          if (!byDay[key]) byDay[key] = [];
          byDay[key].push(c);
        });

        const sortedDays = Object.keys(byDay).sort().reverse().slice(0, 15);
        if (sortedDays.length === 0) return 0;

        const successDays = sortedDays.filter(day => {
          const last = byDay[day].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
          const ld = new Date(last.timestamp);
          let lastMinutes = ld.getHours() * 60 + ld.getMinutes();
          // consumo antes das 6h da manhã conta como "após meia-noite" para esta meta
          if (lastMinutes < 360) lastMinutes += 1440;
          return lastMinutes < targetMinutes;
        }).length;

        return Math.min(100, (successDays / sortedDays.length) * 100);
      }

      if (goal.type === 'sleep_hours') {
        // Buscar sono dos últimos 7 dias de cycles e wellbeingLogs
        const last7Dates = [...Array(7)].map((_, i) => {
          const d = getDateDaysAgo(i);
          return safeToISODate(d);
        });

        const sleepValues = [];
        last7Dates.forEach(date => {
          // Primeiro tenta buscar em cycles - OTIMIZADO com índice
          const cycle = cyclesByDate[date];
          if (cycle && cycle.sleep !== undefined && cycle.sleep !== '') {
            const sleepValue = typeof cycle.sleep === 'number' ? cycle.sleep : parseFloat(cycle.sleep);
            if (!isNaN(sleepValue) && sleepValue > 0) {
              sleepValues.push(sleepValue);
              return;
            }
          }

          // Fallback: buscar em wellbeingLogs - OTIMIZADO com índice
          const wellbeing = wellbeingByDate[date];
          if (wellbeing && wellbeing.sleep !== undefined && !isNaN(parseFloat(wellbeing.sleep))) {
            const sleepValue = typeof wellbeing.sleep === 'number' ? wellbeing.sleep : parseFloat(wellbeing.sleep);
            if (!isNaN(sleepValue) && sleepValue > 0) {
              sleepValues.push(sleepValue);
            }
          }
        });

        if (sleepValues.length === 0) return 0;
        const avgSleep = sleepValues.reduce((sum, val) => sum + val, 0) / sleepValues.length;
        if (avgSleep >= goal.target) return 100;
        const progress = (avgSleep / goal.target) * 100;
        return Math.max(0, Math.min(100, progress));
      }

      if (goal.type === 'bedtime_before') {
        const recentCycles = filteredCycles.slice(0, 7);
        if (recentCycles.length === 0) return 0;
        const cyclesWithBedtime = recentCycles.filter(c => c.bedtime);
        if (cyclesWithBedtime.length === 0) return 0;

        const targetStr = typeof goal.target === 'string' ? goal.target : String(goal.target).padStart(2, '0') + ':00';
        const targetParts = targetStr.split(':');
        let targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);
        // Normalize early-morning targets (00:00-05:59) to after-midnight
        if (targetMinutes >= 0 && targetMinutes < 360) targetMinutes += 1440;

        let successCount = 0;
        cyclesWithBedtime.forEach(cycle => {
          const bedtimeParts = cycle.bedtime.split(':');
          let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
          // Normalize early-morning bedtimes (00:00-05:59) to after-midnight
          if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) bedtimeMinutes += 1440;
          if (bedtimeMinutes <= targetMinutes) successCount++;
        });

        return Math.min(100, (successCount / cyclesWithBedtime.length) * 100);
      }

      return 0;
    };
  }, [avgFrequencyLast7Days, last7Days, analysis.intervalStats, filteredCycles, cyclesByDate, wellbeingByDate, filteredConsumptions]);

  const value = {
    // From useAnalysis hook
    intervalStats: analysis.intervalStats,
    lastInterval: analysis.lastInterval,
    todayConsumptions, // raw consumptions — factual, not excluded on atypical days
    temporalCorrelations: analysis.temporalCorrelations,
    bidirectionalAnalysis: analysis.bidirectionalAnalysis,
    streaks: analysis.streaks,

    // Additional metrics
    timeSinceLastConsumption,
    last7Days,
    avgFrequencyLast7Days,
    getGoalProgress,
    consumptionsByDate, // memoized, atypical days filtered
    consumptionDailyRollup, // resumo-por-dia (count + parte-do-dia) para páginas pesadas
  };

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
};
