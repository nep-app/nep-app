import { getTodayKey } from './helpers';
import * as analyticsService from '../services/analyticsService';

// Helper: Calculate average frequency with new rules (2h+ intervals)
const getAvgFrequencyLast7Days = (consumptions) => {
    // Exclude today (day 0) and get last 7 completed days (days 1-7)
    const last7Dates = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (i + 1)); // Start from yesterday
        return d.toISOString().split('T')[0];
    });

    let validDaysCount = 0;
    let totalConsumptions = 0;

    last7Dates.forEach(date => {
        const dayConsumptions = consumptions.filter(c => c.date === date);
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
};

// Helper: Calculate stats for last 7 days (avgTimes, avgMg)
const getLast7DaysStats = (consumptions, cycles, dailyLogs) => {
    // Calculate avgTimes from actual consumptions in last 7 complete days
    const last7Dates = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (i + 1)); // Start from yesterday (exclude today)
        return d.toISOString().split('T')[0];
    });

    const totalConsumptions = last7Dates.reduce((sum, date) => {
        return sum + consumptions.filter(c => c.date === date).length;
    }, 0);

    const avgTimes = (totalConsumptions / 7).toFixed(1);

    // Calculate avgMg from cycles (novo) ou dailyLogs (compatibilidade)
    const mgValues = [];

    last7Dates.forEach(date => {
        // Buscar primeiro nos cycles (novo método)
        const cycle = cycles.find(c => {
            const cycleDate = c.date || new Date(c.timestamp).toISOString().split('T')[0];
            return cycleDate === date && c.mg !== undefined && c.mg !== '';
        });
        if (cycle) {
            const mgValue = typeof cycle.mg === 'number' ? cycle.mg : parseFloat(cycle.mg);
            if (!isNaN(mgValue) && mgValue > 0) {
                mgValues.push(mgValue);
                return;
            }
        }

        // Fallback: buscar nos dailyLogs (compatibilidade)
        const dailyLog = dailyLogs.find(l => l.date === date && l.mg !== undefined && !isNaN(parseFloat(l.mg)));
        if (dailyLog) {
            const mgValue = typeof dailyLog.mg === 'number' ? dailyLog.mg : parseFloat(dailyLog.mg);
            if (!isNaN(mgValue) && mgValue > 0) {
                mgValues.push(mgValue);
            }
        }
    });

    const avgMg = mgValues.length > 0 ? (mgValues.reduce((sum, mg) => sum + mg, 0) / mgValues.length).toFixed(0) : 0;

    return { avgTimes, avgMg };
};

export const getGoalProgress = (goal, consumptions, cycles, dailyLogs, wellbeingLogs) => {
    if (goal.type === 'reduce_frequency') {
        const avgLast7 = getAvgFrequencyLast7Days(consumptions);
        if (avgLast7 === 0) return 100; // No consumptions = goal achieved
        if (avgLast7 <= goal.target) return 100;
        const baseline = Math.max(avgLast7, goal.target * 2);
        const progress = ((baseline - avgLast7) / (baseline - goal.target)) * 100;
        return Math.max(0, Math.min(100, progress));
    }

    if (goal.type === 'reduce_quantity') {
        const avgLast7Mg = parseFloat(getLast7DaysStats(consumptions, cycles, dailyLogs).avgMg);
        if (avgLast7Mg === 0) return 0;
        if (avgLast7Mg < goal.target) return 100;
        const baseline = Math.max(avgLast7Mg, goal.target * 2);
        const progress = ((baseline - avgLast7Mg) / (baseline - goal.target)) * 100;
        return Math.max(0, Math.min(100, progress));
    }

    if (goal.type === 'increase_interval') {
        const intervalStats = analyticsService.calculateIntervalStats(consumptions);
        if (!intervalStats) return 0;
        const avg = parseFloat(intervalStats.avgHours);
        if (avg >= goal.target) return 100;
        const progress = (avg / goal.target) * 100;
        return Math.max(0, Math.min(100, progress));
    }

    if (goal.type === 'limit_last') {
        const recentCycles = cycles.slice(0, 15);
        if (recentCycles.length === 0) return 0;
        const successCycles = recentCycles.filter(c => c.lastBefore00 === true).length;
        return Math.min(100, (successCycles / recentCycles.length) * 100);
    }

    if (goal.type === 'sleep_hours') {
        // Buscar sono dos últimos 7 dias de cycles e wellbeingLogs
        const last7Dates = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        });

        const sleepValues = [];
        last7Dates.forEach(date => {
            // Primeiro tenta buscar em cycles
            const cycle = cycles.find(c => {
                const cycleDate = c.date || new Date(c.timestamp).toISOString().split('T')[0];
                return cycleDate === date && c.sleep !== undefined && c.sleep !== '';
            });
            if (cycle) {
                const sleepValue = typeof cycle.sleep === 'number' ? cycle.sleep : parseFloat(cycle.sleep);
                if (!isNaN(sleepValue) && sleepValue > 0) {
                    sleepValues.push(sleepValue);
                    return;
                }
            }

            // Fallback: buscar em wellbeingLogs
            const wellbeing = wellbeingLogs.find(w => {
                const wDate = w.date || new Date(w.timestamp).toISOString().split('T')[0];
                return wDate === date && w.sleep !== undefined && !isNaN(parseFloat(w.sleep));
            });
            if (wellbeing) {
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
            let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
            const bedtimeOriginalMinutes = bedtimeMinutes;

            // Meta SÓ é cumprida se hora for entre 21:00-02:00
            const isHealthyBedtime = bedtimeOriginalMinutes >= 1260 || bedtimeOriginalMinutes <= 120;

            // Ajustar madrugada
            if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) {
                bedtimeMinutes += 1440;
            }

            let targetAdjusted = targetMinutes;
            if (targetMinutes >= 0 && targetMinutes < 360) {
                targetAdjusted += 1440;
            }

            if (bedtimeMinutes <= targetAdjusted && isHealthyBedtime) successCount++;
        });

        return Math.min(100, (successCount / cyclesWithBedtime.length) * 100);
    }

    return 0;
};

export const getGoalAchievementCount = (goal, consumptions, dailyLogs, cycles, wellbeingLogs) => {
    // Dados são obrigatórios
    const dataConsumptions = consumptions;
    const dataDailyLogs = dailyLogs;
    const dataCycles = cycles;
    const dataWellbeing = wellbeingLogs;

    let achievedCount = 0;

    if (goal.type === 'reduce_frequency') {
        const today = new Date().toLocaleDateString('pt-PT');
        const consumptionsByDate = {};

        dataConsumptions.forEach(c => {
            const dateKey = new Date(c.timestamp).toLocaleDateString('pt-PT');
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
        dataCycles.forEach(cycle => {
            // Tentar buscar mg do cycle primeiro (novo lugar)
            let mgValue = typeof cycle.mg === 'number' ? cycle.mg : parseFloat(cycle.mg);

            // Se não tiver no cycle, buscar do dailyLog (compatibilidade)
            if (isNaN(mgValue) || mgValue <= 0) {
                // Tentar buscar pelo cycleId primeiro (dados recentes)
                let dailyLog = dataDailyLogs.find(log => log.cycleId === cycle.id);

                // Se não encontrou pelo cycleId, tentar por data (dados antigos sem cycleId)
                if (!dailyLog || !dailyLog.mg) {
                    const cycleDay = new Date(cycle.timestamp).toISOString().split('T')[0];
                    dailyLog = dataDailyLogs.find(log => log.date === cycleDay && log.mg);
                }

                if (dailyLog && dailyLog.mg) {
                    mgValue = typeof dailyLog.mg === 'number' ? dailyLog.mg : parseFloat(dailyLog.mg);
                }
            }

            if (!isNaN(mgValue) && mgValue > 0) {
                const isAchieved = mgValue < parseFloat(goal.target);
                if (isAchieved) achievedCount++;
            }
        });
    }

    if (goal.type === 'limit_last') {
        dataCycles.forEach(cycle => {
            const isAchieved = cycle.lastBefore00 === true;
            if (isAchieved) achievedCount++;
        });
    }

    if (goal.type === 'increase_interval') {
        const today = new Date().toLocaleDateString('pt-PT');
        const consumptionsByDate = {};

        dataConsumptions.forEach(c => {
            const dateKey = new Date(c.timestamp).toLocaleDateString('pt-PT');
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
        const today = new Date().toLocaleDateString('pt-PT');

        // Coletar datas únicas de cycles e wellbeingLogs
        const allDates = new Set([
            ...dataCycles.map(c => c.date || new Date(c.timestamp).toISOString().split('T')[0]),
            ...dataWellbeing.map(w => w.date || new Date(w.timestamp).toISOString().split('T')[0])
        ]);

        allDates.forEach(date => {
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('pt-PT');
            if (dateStr === today) return; // Skip today

            // Primeiro tenta buscar em cycles
            const cycle = dataCycles.find(c => {
                const cycleDate = c.date || new Date(c.timestamp).toISOString().split('T')[0];
                return cycleDate === date && c.sleep != null;
            });
            if (cycle) {
                const isAchieved = parseFloat(cycle.sleep) >= parseFloat(goal.target);
                if (isAchieved) achievedCount++;
                return;
            }

            // Fallback: buscar em wellbeingLogs
            const wellbeing = dataWellbeing.find(w => {
                const wDate = w.date || new Date(w.timestamp).toISOString().split('T')[0];
                return wDate === date && w.sleep != null;
            });
            if (wellbeing) {
                const isAchieved = parseFloat(wellbeing.sleep) >= parseFloat(goal.target);
                if (isAchieved) achievedCount++;
            }
        });
    }

    if (goal.type === 'bedtime_before') {
        const targetStr = typeof goal.target === 'string' ? goal.target : String(goal.target).padStart(2, '0') + ':00';
        const targetParts = targetStr.split(':');
        const targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

        dataCycles.forEach(cycle => {
            if (!cycle.bedtime) return;
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

    return achievedCount;
};

export const getGoalProgressStats = (goal, consumptions, dailyLogs, cycles, wellbeingLogs) => {
    const dataConsumptions = consumptions;
    const dataDailyLogs = dailyLogs;
    const dataCycles = cycles;
    const dataWellbeing = wellbeingLogs;

    let achieved = 0;
    let total = 0;

    const today = new Date().toLocaleDateString('pt-PT');

    if (goal.type === 'increase_interval') {
        const consumptionsByCycle = {};
        dataConsumptions.forEach(c => {
            if (!c.cycleId) return;
            if (!consumptionsByCycle[c.cycleId]) consumptionsByCycle[c.cycleId] = [];
            consumptionsByCycle[c.cycleId].push(c);
        });

        Object.values(consumptionsByCycle).forEach(cycleConsumptions => {
            if (cycleConsumptions.length < 2) return; // Skip cycles with <2 consumptions
            total++;

            const sorted = cycleConsumptions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            let longIntervals = 0;
            let totalIntervals = 0;

            for (let i = 1; i < sorted.length; i++) {
                const intervalHours = (new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp)) / (1000 * 60 * 60);
                totalIntervals++;
                if (intervalHours > 2) longIntervals++;
            }

            if (longIntervals >= totalIntervals / 2) achieved++;
        });
    }

    if (goal.type === 'reduce_frequency') {
        const consumptionsByDate = {};
        dataConsumptions.forEach(c => {
            const dateKey = new Date(c.timestamp).toLocaleDateString('pt-PT');
            if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = 0;
            consumptionsByDate[dateKey]++;
        });

        Object.entries(consumptionsByDate).forEach(([date, count]) => {
            if (date === today) return; // Skip today
            total++;
            if (count < goal.target) achieved++;
        });
    }

    if (goal.type === 'reduce_quantity') {
        dataCycles.forEach(cycle => {
            // Tentar buscar mg do cycle primeiro (novo lugar)
            let mgValue = typeof cycle.mg === 'number' ? cycle.mg : parseFloat(cycle.mg);

            // Se não tiver no cycle, buscar do dailyLog (compatibilidade)
            if (isNaN(mgValue) || mgValue <= 0) {
                // Tentar buscar pelo cycleId primeiro (dados recentes)
                let dailyLog = dataDailyLogs.find(log => log.cycleId === cycle.id);

                // Se não encontrou pelo cycleId, tentar por data (dados antigos sem cycleId)
                if (!dailyLog || !dailyLog.mg) {
                    const cycleDay = new Date(cycle.timestamp).toISOString().split('T')[0];
                    dailyLog = dataDailyLogs.find(log => log.date === cycleDay && log.mg);
                }

                if (dailyLog && dailyLog.mg) {
                    mgValue = typeof dailyLog.mg === 'number' ? dailyLog.mg : parseFloat(dailyLog.mg);
                }
            }

            if (!isNaN(mgValue) && mgValue > 0) {
                total++;
                const isAchieved = mgValue < parseFloat(goal.target);
                if (isAchieved) achieved++;
            }
        });
    }

    if (goal.type === 'limit_last') {
        total = dataCycles.length;
        dataCycles.forEach(cycle => {
            const isAchieved = cycle.lastBefore00 === true;
            if (isAchieved) achieved++;
        });
    }

    if (goal.type === 'sleep_hours') {
        // Coletar datas únicas de cycles e wellbeingLogs
        const allDates = new Set([
            ...dataCycles.map(c => c.date || new Date(c.timestamp).toISOString().split('T')[0]),
            ...dataWellbeing.map(w => w.date || new Date(w.timestamp).toISOString().split('T')[0])
        ]);

        allDates.forEach(date => {
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('pt-PT');
            if (dateStr === today) return; // Skip today

            // Primeiro tenta buscar em cycles
            const cycle = dataCycles.find(c => {
                const cycleDate = c.date || new Date(c.timestamp).toISOString().split('T')[0];
                return cycleDate === date && c.sleep != null;
            });
            if (cycle) {
                total++;
                if (parseFloat(cycle.sleep) >= parseFloat(goal.target)) achieved++;
                return;
            }

            // Fallback: buscar em wellbeingLogs
            const wellbeing = dataWellbeing.find(w => {
                const wDate = w.date || new Date(w.timestamp).toISOString().split('T')[0];
                return wDate === date && w.sleep != null;
            });
            if (wellbeing) {
                total++;
                if (parseFloat(wellbeing.sleep) >= parseFloat(goal.target)) achieved++;
            }
        });
    }

    if (goal.type === 'bedtime_before') {
        const targetStr = typeof goal.target === 'string' ? goal.target : String(goal.target).padStart(2, '0') + ':00';
        const targetParts = targetStr.split(':');
        const targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

        dataCycles.forEach(cycle => {
            if (!cycle.bedtime) {
                return;
            }
            const bedtimeParts = cycle.bedtime.split(':');
            let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
            const bedtimeOriginalMinutes = bedtimeMinutes;

            // Meta SÓ é cumprida se hora for entre 21:00-02:00
            const isHealthyBedtime = bedtimeOriginalMinutes >= 1260 || bedtimeOriginalMinutes <= 120;

            total++;

            // Adjust for early morning (00:00-05:59 → 24:00-29:59)
            if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) {
                bedtimeMinutes += 1440;
            }

            let targetAdjusted = targetMinutes;
            if (targetMinutes >= 0 && targetMinutes < 360) {
                targetAdjusted += 1440;
            }

            const isAchieved = bedtimeMinutes <= targetAdjusted && isHealthyBedtime;
            if (isAchieved) achieved++;
        });
    }

    const percentage = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0;

    return { achieved, total, percentage };
};
