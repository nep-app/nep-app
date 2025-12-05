import { useMemo } from 'react';
import * as analyticsService from '../services/analyticsService';
import { analyzeMultipleNotes, identifyThemes } from '../utils/sentimentAnalysis';
import { safeToISODate, timestampToPT, getTodayPT } from '../utils/helpers';

const { calculatePearsonCorrelation, getGoalAchievementCount } = analyticsService;

export function useAnalysisCalculations(data, goals) {
  return useMemo(() => {
    const {
      filteredConsumptions: analysisConsumptions,
      filteredWellbeingLogs: analysisWellbeing,
      filteredCycles: analysisCycles,
      filteredDailyLogs: analysisDailyLogs,
      filteredReflections: analysisReflections,
      filteredThoughts: analysisThoughts
    } = data;

    // 1. Consumption Stats
    const totalConsumptions = analysisConsumptions.length;

    // Group consumptions by date
    const byDate = {};
    analysisConsumptions.forEach(c => { byDate[c.date] = (byDate[c.date] || 0) + 1; });
    const uniqueDays = Object.keys(byDate).length;
    const avgPerDay = uniqueDays > 0 ? (totalConsumptions / uniqueDays).toFixed(1) : 0;

    // 2. Wellbeing Averages
    const validSleep = analysisWellbeing.filter(w => w.sleep && !isNaN(parseFloat(w.sleep)));
    const avgSleep = validSleep.length > 0 ? (validSleep.reduce((sum, w) => sum + parseFloat(w.sleep), 0) / validSleep.length).toFixed(1) : null;

    const validMood = analysisWellbeing.filter(w => w.mood && !isNaN(parseInt(w.mood)));
    const avgMood = validMood.length > 0 ? (validMood.reduce((sum, w) => sum + parseInt(w.mood), 0) / validMood.length).toFixed(1) : null;

    const validEnergy = analysisWellbeing.filter(w => w.energy && !isNaN(parseInt(w.energy)));
    const avgEnergy = validEnergy.length > 0 ? (validEnergy.reduce((sum, w) => sum + parseInt(w.energy), 0) / validEnergy.length).toFixed(1) : null;

    // 3. Intervals
    const sorted = [...analysisConsumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
      intervals.push({ hours: diff, date: sorted[i].date });
    }

    const intervalValues = intervals.map(i => i.hours);
    const avgInterval = intervalValues.length > 0 ? (intervalValues.reduce((sum, i) => sum + i, 0) / intervalValues.length).toFixed(1) : 0;
    const goodIntervals = intervalValues.filter(i => i >= 2).length;
    const goodPercent = intervalValues.length > 0 ? Math.round((goodIntervals / intervalValues.length) * 100) : 0;
    const maxInterval = intervalValues.length > 0 ? Math.max(...intervalValues) : 0;

    // 4. Time Patterns
    const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
    const byHour = {};
    const byWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    analysisConsumptions.forEach(c => {
      const date = new Date(c.timestamp);
      const hour = date.getHours();
      const day = date.getDay();

      byHour[hour] = (byHour[hour] || 0) + 1;
      byWeekday[day]++;

      if (hour >= 6 && hour < 12) byPartOfDay.manha++;
      else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
      else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
      else byPartOfDay.madrugada++;
    });

    const maxPartOfDay = Object.entries(byPartOfDay).reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);

    // 5. Sentiment Analysis
    const allNotes = [
      ...analysisConsumptions.map(c => c.notes || ''),
      ...analysisWellbeing.map(w => w.notes || ''),
      ...analysisCycles.map(c => c.notes || ''),
      ...analysisReflections.map(r => r.answer || ''),
      ...analysisDailyLogs.map(d => d.notes || ''),
      ...analysisThoughts.map(t => t.content || '')
    ].filter(n => n.length > 0);

    const sentimentAnalysis = analyzeMultipleNotes(allNotes);
    const sentimentThemes = identifyThemes(allNotes);

    // 6. Correlations
    const calculateCorrelations = () => {
        const dailyData = {};

        analysisConsumptions.forEach(c => {
            if (!dailyData[c.date]) dailyData[c.date] = { consumptions: 0, sleep: null, mood: null, energy: null };
            dailyData[c.date].consumptions++;
        });

        analysisWellbeing.forEach(w => {
            const wDate = w.date || safeToISODate(w.timestamp);
            if (!wDate) return;
            if (!dailyData[wDate]) dailyData[wDate] = { consumptions: 0, sleep: null, mood: null, energy: null };
            if (w.sleep) dailyData[wDate].sleep = parseFloat(w.sleep);
            if (w.mood) dailyData[wDate].mood = parseInt(w.mood);
            if (w.energy) dailyData[wDate].energy = parseInt(w.energy);
        });

        const sortedDates = Object.keys(dailyData).sort();
        const nextDayData = [];

        for (let i = 0; i < sortedDates.length - 1; i++) {
            const today = dailyData[sortedDates[i]];
            const tomorrow = dailyData[sortedDates[i+1]];

            if (today.consumptions > 0 && (tomorrow.mood !== null || tomorrow.energy !== null || tomorrow.sleep !== null)) {
                nextDayData.push({
                    consumptions: today.consumptions,
                    sleep: tomorrow.sleep,
                    mood: tomorrow.mood,
                    energy: tomorrow.energy
                });
            }
        }

        const validMoodData = nextDayData.filter(d => d.mood !== null);
        const validEnergyData = nextDayData.filter(d => d.energy !== null);
        const validSleepData = nextDayData.filter(d => d.sleep !== null);

        return {
            mood: validMoodData.length >= 2 ? calculatePearsonCorrelation(validMoodData, 'consumptions', 'mood') : null,
            energy: validEnergyData.length >= 2 ? calculatePearsonCorrelation(validEnergyData, 'consumptions', 'energy') : null,
            sleep: validSleepData.length >= 2 ? calculatePearsonCorrelation(validSleepData, 'consumptions', 'sleep') : null,
            sleepToMood: (() => {
                const sleepMoodData = [];
                for (let i = 0; i < sortedDates.length - 1; i++) {
                    const today = dailyData[sortedDates[i]];
                    const tomorrow = dailyData[sortedDates[i+1]];
                    if (today.sleep !== null && tomorrow.mood !== null) {
                        sleepMoodData.push({ sleep: today.sleep, mood: tomorrow.mood });
                    }
                }
                return sleepMoodData.length >= 2 ? calculatePearsonCorrelation(sleepMoodData, 'sleep', 'mood') : null;
            })()
        };
    };

    const correlations = calculateCorrelations();

    // 7. Goals Achievement
    const calculateGoals = () => {
        if (!goals || goals.length === 0) return null;

        const goalsByType = {};
        goals.forEach(g => {
            if (!goalsByType[g.type] || new Date(g.createdAt) > new Date(goalsByType[g.type].createdAt)) {
                goalsByType[g.type] = g;
            }
        });
        const uniqueGoals = Object.values(goalsByType);

        const goalDetails = uniqueGoals.map(g => {
            const achievements = getGoalAchievementCount(g, analysisConsumptions, analysisDailyLogs, analysisCycles, analysisWellbeing);

            let totalPossible = 0;
            const today = getTodayPT();

            if (g.type === 'reduce_frequency') {
                const allDates = new Set();
                analysisConsumptions.forEach(c => {
                    const dateKey = timestampToPT(c.timestamp);
                    if (dateKey !== today) allDates.add(dateKey);
                });
                totalPossible = allDates.size;
            } else if (g.type === 'increase_interval') {
                const consumptionsByDate = {};
                analysisConsumptions.forEach(c => {
                    const dateKey = timestampToPT(c.timestamp);
                    if (dateKey === today) return;
                    if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = [];
                    consumptionsByDate[dateKey].push(c);
                });
                totalPossible = Object.values(consumptionsByDate).filter(arr => arr.length >= 2).length;
            } else if (g.type === 'sleep_hours') {
                const allDates = new Set();
                analysisWellbeing.forEach(w => {
                    const dateKey = w.date || (w.timestamp ? new Date(w.timestamp).toLocaleDateString('pt-PT') : null);
                    if (dateKey && dateKey !== today) allDates.add(dateKey);
                });
                totalPossible = allDates.size;
            } else {
                totalPossible = analysisCycles.length;
            }

            const percentage = totalPossible > 0 ? Math.min(100, ((achievements / totalPossible) * 100)).toFixed(0) : 0;

            return {
                goal: g,
                achievements,
                totalPossible,
                percentage: parseInt(percentage)
            };
        });

        const totalAchievements = goalDetails.reduce((sum, gd) => sum + gd.achievements, 0);
        const goalsWithAchievements = goalDetails.filter(gd => gd.achievements > 0);
        const bestGoal = goalDetails.length > 0 ? goalDetails.reduce((max, gd) => gd.percentage > max.percentage ? gd : max) : null;

        return {
            details: goalDetails,
            totalAchievements,
            goalsWithAchievements,
            bestGoal,
            uniqueGoals
        };
    };

    const goalsStats = calculateGoals();

    // 8. Self Care
    const calculateSelfCare = () => {
        if (analysisWellbeing.length < 1) return null;

        const wellbeingDates = new Set(analysisWellbeing.map(w => w.date));
        const totalDays = wellbeingDates.size;

        const areas = { water: 0, food: 0, rest: 0, social: 0 };
        Object.keys(areas).forEach(area => {
            const daysWithArea = Array.from(wellbeingDates).filter(date => {
                return analysisWellbeing.some(w => w.date === date && w[area] === true);
            }).length;
            areas[area] = daysWithArea;
        });

        const percentages = {
            water: totalDays > 0 ? (areas.water / totalDays) * 100 : 0,
            food: totalDays > 0 ? (areas.food / totalDays) * 100 : 0,
            rest: totalDays > 0 ? (areas.rest / totalDays) * 100 : 0,
            social: totalDays > 0 ? (areas.social / totalDays) * 100 : 0
        };

        const overall = (percentages.water + percentages.food + percentages.rest + percentages.social) / 4;
        const lowAreas = Object.entries(percentages)
            .filter(([_, pct]) => pct < 70)
            .sort((a, b) => a[1] - b[1]);

        return { overall, percentages, lowAreas };
    };

    const selfCare = calculateSelfCare();

    // 9. Risk Profile (Mood before high consumption days)
    const calculateRiskProfile = () => {
        if (analysisConsumptions.length < 1 || analysisWellbeing.length < 1) return null;

        const dailyProfile = {};
        analysisConsumptions.forEach(c => {
            if (!dailyProfile[c.date]) dailyProfile[c.date] = { consumptions: 0, prevMood: null };
            dailyProfile[c.date].consumptions++;
        });

        analysisWellbeing.forEach(w => {
            const wDate = w.date || safeToISODate(w.timestamp);
            if (!wDate) return;
            if (!dailyProfile[wDate]) dailyProfile[wDate] = { consumptions: 0, prevMood: null };
        });

        const sortedDates = Object.keys(dailyProfile).sort();
        for (let i = 1; i < sortedDates.length; i++) {
            const yesterday = sortedDates[i - 1];
            const yesterdayWellbeing = analysisWellbeing.find(w => {
                const wDate = w.date || safeToISODate(w.timestamp);
                return wDate === yesterday;
            });

            if (yesterdayWellbeing && yesterdayWellbeing.mood) {
                dailyProfile[sortedDates[i]].prevMood = parseInt(yesterdayWellbeing.mood);
            }
        }

        const daysWithData = Object.values(dailyProfile).filter(d => d.consumptions > 0);
        if (daysWithData.length < 1) return null;

        daysWithData.sort((a, b) => b.consumptions - a.consumptions);
        const highRiskDays = daysWithData.slice(0, Math.ceil(daysWithData.length / 3));

        const highRiskPrevMood = highRiskDays.filter(d => d.prevMood !== null).map(d => d.prevMood);
        const lowRiskDays = daysWithData.slice(Math.ceil(daysWithData.length / 3));
        const lowRiskPrevMood = lowRiskDays.filter(d => d.prevMood !== null).map(d => d.prevMood);

        if (highRiskPrevMood.length < 2 || lowRiskPrevMood.length < 2) return null;

        const avgHighRiskPrevMood = highRiskPrevMood.reduce((a, b) => a + b, 0) / highRiskPrevMood.length;
        const avgLowRiskPrevMood = lowRiskPrevMood.reduce((a, b) => a + b, 0) / lowRiskPrevMood.length;

        return {
            moodDiff: avgLowRiskPrevMood - avgHighRiskPrevMood,
            avgHighRiskPrevMood,
            avgLowRiskPrevMood
        };
    };

    const riskProfile = calculateRiskProfile();

    // 10. Cycle Analysis
    const calculateCycleStats = () => {
        if (analysisCycles.length === 0) return null;

        // Mg Analysis
        let totalMg = 0;
        let cyclesWithMg = 0;

        analysisCycles.forEach(cycle => {
            const cycleMg = parseFloat(cycle.mg) || 0;
            if (cycleMg > 0) {
                totalMg += cycleMg;
                cyclesWithMg++;
            }
        });

        const avgMgPerCycle = cyclesWithMg > 0 ? totalMg / cyclesWithMg : 0;

        // Late Consumption
        const cyclesWithNoLateConsumption = analysisCycles.filter(cycle => {
            const cycleConsumptions = analysisConsumptions.filter(c => c.cycleId === cycle.id);
            const hasLateConsumption = cycleConsumptions.some(c => {
                const hour = new Date(c.timestamp).getHours();
                return hour >= 0 && hour < 6;
            });
            return !hasLateConsumption;
        }).length;

        const pctNoLate = ((cyclesWithNoLateConsumption / analysisCycles.length) * 100).toFixed(0);

        // Bedtime Analysis
        const cyclesWithValidBedtime = analysisCycles.filter(c => c.bedtime);
        let avgBedtimeStr = null;
        let avgBedtimeHours = null;

        if (cyclesWithValidBedtime.length > 0) {
            const getBedtimeMinutes = (bedtime) => {
                const [hours, minutes] = bedtime.split(':').map(Number);
                if (hours >= 0 && hours < 18) return (hours + 24) * 60 + minutes;
                return hours * 60 + minutes;
            };

            const avgBedtimeMinutes = cyclesWithValidBedtime.reduce((sum, c) => sum + getBedtimeMinutes(c.bedtime), 0) / cyclesWithValidBedtime.length;
            const adjustedMinutes = avgBedtimeMinutes >= 1440 ? avgBedtimeMinutes - 1440 : avgBedtimeMinutes;
            avgBedtimeHours = Math.floor(adjustedMinutes / 60);
            const avgBedtimeMins = Math.round(adjustedMinutes % 60);
            avgBedtimeStr = `${String(avgBedtimeHours).padStart(2, '0')}:${String(avgBedtimeMins).padStart(2, '0')}`;
        }

        return {
            avgMgPerCycle,
            cyclesWithMg,
            pctNoLate,
            avgBedtimeStr,
            avgBedtimeHours
        };
    };

    const cycleStats = calculateCycleStats();

    // 11. Energy before consumption
    const calculateEnergyImpact = () => {
        if (analysisConsumptions.length < 5) return null;

        const sortedConsumptions = [...analysisConsumptions].sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        const last10Consumptions = sortedConsumptions.slice(0, 10);

        let countWithLowEnergy = 0;
        let countWithData = 0;

        last10Consumptions.forEach(cons => {
            const consDate = cons.date;
            const consTime = new Date(cons.timestamp);

            const sameDayWellbeing = analysisWellbeing.filter(w => {
                const wDate = w.date || safeToISODate(w.timestamp);
                return wDate === consDate && w.energy != null;
            });

            if (sameDayWellbeing.length === 0) return;

            const closestWellbeing = sameDayWellbeing.reduce((closest, current) => {
                const currentTime = new Date(current.timestamp);
                const closestTime = new Date(closest.timestamp);
                return Math.abs(currentTime - consTime) < Math.abs(closestTime - consTime) ? current : closest;
            });

            countWithData++;
            if (parseInt(closestWellbeing.energy) < 4) {
                countWithLowEnergy++;
            }
        });

        if (countWithData < 5) return null;

        return {
            percentage: Math.round((countWithLowEnergy / countWithData) * 100),
            countWithLowEnergy,
            countWithData
        };
    };

    const energyImpact = calculateEnergyImpact();

    return {
      stats: {
        totalConsumptions,
        uniqueDays,
        avgPerDay,
        avgSleep,
        avgMood,
        avgEnergy,
        avgInterval,
        maxInterval,
        goodPercent,
        intervals
      },
      patterns: {
        byPartOfDay,
        maxPartOfDay,
        byHour,
        byWeekday,
        bestDate: Object.keys(byDate).sort((a,b) => byDate[a] - byDate[b])[0] || null,
        worstDate: Object.keys(byDate).sort((a,b) => byDate[b] - byDate[a])[0] || null,
        bestCount: Object.values(byDate).sort((a,b) => a - b)[0] || 0,
        worstCount: Object.values(byDate).sort((a,b) => b - a)[0] || 0
      },
      sentiment: {
        analysis: sentimentAnalysis,
        themes: sentimentThemes,
        allNotes
      },
      correlations,
      goalsStats,
      selfCare,
      riskProfile,
      cycleStats,
      energyImpact
    };
  }, [data, goals]);
}
