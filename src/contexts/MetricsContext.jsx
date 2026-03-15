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
  const { consumptions, wellbeingLogs, reflections, cycles, goals, dailyLogs } = useData();

  // Use analysis hook for core analytics
  const analysis = useAnalysis(consumptions, wellbeingLogs, reflections, cycles, goals);

  // OTIMIZAÇÃO: Criar índices por data para acesso O(1) em vez de O(n)
  const cyclesByDate = useMemo(() => {
    const index = {};
    cycles.forEach(c => {
      const dateKey = getDateKeyFromItem(c);
      if (!index[dateKey]) {
        index[dateKey] = c;
      }
    });
    return index;
  }, [cycles]);

  const dailyLogsByDate = useMemo(() => {
    const index = {};
    dailyLogs.forEach(log => {
      const dateKey = log.date || getDateKeyFromItem(log);
      if (!index[dateKey]) {
        index[dateKey] = log;
      }
    });
    return index;
  }, [dailyLogs]);

  const wellbeingByDate = useMemo(() => {
    const index = {};
    wellbeingLogs.forEach(w => {
      const dateKey = getDateKeyFromItem(w);
      if (!index[dateKey]) {
        index[dateKey] = w;
      }
    });
    return index;
  }, [wellbeingLogs]);

  // ===== CONSUMPTION METRICS =====

  // Time since last consumption
  const timeSinceLastConsumption = useMemo(() => {
    return analyticsService.calculateTimeSinceLastConsumption(consumptions);
  }, [consumptions]);

  // Last 7 days with averages (times and mg)
  const last7Days = useMemo(() => {
    // Calculate avgTimes from actual consumptions in last 7 complete days
    const last7Dates = [...Array(7)].map((_, i) => {
      const d = getDateDaysAgo(i + 1); // Start from yesterday (exclude today)
      return safeToISODate(d);
    });

    const totalConsumptions = last7Dates.reduce((sum, date) => {
      return sum + consumptions.filter(c => getDateKeyFromItem(c) === date).length;
    }, 0);

    const avgTimes = (totalConsumptions / 7).toFixed(1);

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
        if (!isNaN(mgValue) && mgValue > 0) {
          mgValues.push(mgValue);
        }
      }
    });

    const avgMg = mgValues.length > 0 ? (mgValues.reduce((sum, mg) => sum + mg, 0) / mgValues.length).toFixed(0) : 0;

    return { avgTimes, avgMg };
  }, [consumptions, cyclesByDate, dailyLogsByDate]);

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
      const dayConsumptions = consumptions.filter(c => getDateKeyFromItem(c) === date);
      if (dayConsumptions.length === 0) return;

      // Check interval rule if more than 1 consumption
      if (dayConsumptions.length === 1) {
        validDaysCount++;
        totalConsumptions += 1;
        return;
      }

      const sorted = dayConsumptions.sort((a, b) => a.timestamp - b.timestamp);
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
  }, [consumptions]);

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
        const recentCycles = cycles.slice(0, 15);
        if (recentCycles.length === 0) return 0;
        const successCycles = recentCycles.filter(c => c.lastBefore00 === true).length;
        return Math.min(100, (successCycles / recentCycles.length) * 100);
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
        const recentCycles = cycles.slice(0, 7);
        if (recentCycles.length === 0) return 0;
        const cyclesWithBedtime = recentCycles.filter(c => c.bedtime);
        if (cyclesWithBedtime.length === 0) return 0;

        const targetStr = typeof goal.target === 'string' ? goal.target : String(goal.target).padStart(2, '0') + ':00';
        const targetParts = targetStr.split(':');
        const targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

        let successCount = 0;
        cyclesWithBedtime.forEach(cycle => {
          const bedtimeParts = cycle.bedtime.split(':');
          const bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
          if (bedtimeMinutes <= targetMinutes) successCount++;
        });

        return Math.min(100, (successCount / cyclesWithBedtime.length) * 100);
      }

      return 0;
    };
  }, [avgFrequencyLast7Days, last7Days, analysis.intervalStats, cycles, cyclesByDate, wellbeingByDate]);

  const value = {
    // From useAnalysis hook
    intervalStats: analysis.intervalStats,
    lastInterval: analysis.lastInterval,
    todayConsumptions: analysis.todayConsumptions,
    temporalCorrelations: analysis.temporalCorrelations,
    bidirectionalAnalysis: analysis.bidirectionalAnalysis,
    streaks: analysis.streaks,

    // Additional metrics
    timeSinceLastConsumption,
    last7Days,
    avgFrequencyLast7Days,
    getGoalProgress,
  };

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
};
