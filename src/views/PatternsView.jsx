import React, { useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import { safeToISODate, formatDateShort, formatDateWithWeekday, formatDateWithWeekdayFull, formatDateTime, getDateDaysAgo, getTodayPT, getTodayKey, timestampToPT, subtractDays, getDateKeyFromItem } from '../utils/helpers';
import { getEmotionCategory, EMOTION_CATEGORIES } from '../constants/emotions';
import HeatmapChart from '../components/HeatmapChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const { getDateRangeForPeriod, filterByDateRange, getPeriodLabel, getGoalAchievementCount, getAllDaysSinceFirstRecord } = analyticsService;

export function PatternsView({
    patternsPeriod,
    setPatternsPeriod,
    patternsPeriodOffset,
    setPatternsPeriodOffset,
    patternView,
    setPatternView
}) {
    const { consumptions, wellbeingLogs, cycles, dailyLogs, goals } = useData();
    const metrics = useMetrics();
    const { t, i18n } = useTranslation();

    // ===== MEMOIZED DATA COMPUTATION =====
    const patternsData = useMemo(() => {
        const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
        const allFilteredConsumptions = filterByDateRange(consumptions, dateRange);
        const allFilteredWellbeingLogs = filterByDateRange(wellbeingLogs, dateRange);
        const allFilteredCycles = filterByDateRange(cycles, dateRange);
        const allFilteredDailyLogs = filterByDateRange(dailyLogs, dateRange);

        const atypicalDates = new Set(
            allFilteredWellbeingLogs
                .filter(w => w.isAtypical)
                .map(w => w.date || safeToISODate(w.timestamp))
                .filter(Boolean)
        );
        const atypicalCount = atypicalDates.size;

        const filteredConsumptions = allFilteredConsumptions.filter(c => !atypicalDates.has(c.date || safeToISODate(c.timestamp)));
        const filteredWellbeingLogs = allFilteredWellbeingLogs.filter(w => !atypicalDates.has(w.date || safeToISODate(w.timestamp)));
        const filteredCycles = allFilteredCycles.filter(c => !atypicalDates.has(c.date || safeToISODate(c.timestamp)));
        const filteredDailyLogs = allFilteredDailyLogs.filter(l => !atypicalDates.has(l.date || safeToISODate(l.timestamp)));

        return { dateRange, atypicalDates, atypicalCount, filteredConsumptions, filteredWellbeingLogs, filteredCycles, filteredDailyLogs };
    }, [consumptions, wellbeingLogs, cycles, dailyLogs, patternsPeriod, patternsPeriodOffset]);

    return (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-white">{t('patterns.title')}</h2>

                                    {/* Temporal Filters */}
                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-4 border overflow-hidden">
                                        <div className="flex flex-col gap-2 mb-1">
                                            <div className="flex gap-2 flex-wrap">
                                                {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                                                    <button key={period} onClick={() => { setPatternsPeriod(period); setPatternsPeriodOffset(0); }} className={'px-4 py-2 rounded-lg font-medium transition-colors text-sm ' + (patternsPeriod === period ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                                        {t('patterns.periods.' + period)}
                                                    </button>
                                                ))}
                                            </div>
                                            {patternsPeriod !== 'tudo' && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => setPatternsPeriodOffset(patternsPeriodOffset + 1)} className="text-purple-600 p-2 rounded-lg transition-colors hover:bg-gray-700">
                                                        <Icons.ChevronLeft className="w-5 h-5" />
                                                    </button>
                                                    <span className="text-sm font-medium text-center text-gray-300">{getPeriodLabel(patternsPeriod, patternsPeriodOffset)}</span>
                                                    <button onClick={() => setPatternsPeriodOffset(Math.max(0, patternsPeriodOffset - 1))} disabled={patternsPeriodOffset === 0} className={'p-2 rounded-lg transition-colors ' + (patternsPeriodOffset === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-purple-600 hover:bg-gray-700')}>
                                                        <Icons.ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>


                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {['dashboard', 'progress', 'temporal', 'estrutural'].map(view => (
                                            <button key={view} onClick={() => setPatternView(view)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ' + (patternView === view ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                                {t('patterns.views.' + view)}
                                            </button>
                                        ))}
                                    </div>

                                    {(() => {
                                        // Usar dados pré-computados do useMemo (evita recomputação em cada render)
                                        const { dateRange, atypicalDates, atypicalCount, filteredConsumptions, filteredWellbeingLogs, filteredCycles, filteredDailyLogs } = patternsData;

                                        // Nota dias atípicos (mostrar em qualquer view)
                                        const atypicalBanner = atypicalCount > 0 ? (
                                            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2 text-xs text-yellow-400 flex items-center gap-2 mb-2">
                                                <span>📌</span>
                                                <span>{t('wellbeing.atypicalBanner', { count: atypicalCount })}</span>
                                            </div>
                                        ) : null;

                                        // DASHBOARD (COMPACTO)
                                        if (patternView === 'dashboard') {
                                            if (filteredConsumptions.length === 0 && filteredWellbeingLogs.length === 0) return (<div className={'bg-gray-800 border-gray-700 text-gray-400' + ' rounded-xl p-6 border text-center'}>{t('patterns.noData')}</div>);

                                            // Calculate metrics
                                            const totalConsumptions = filteredConsumptions.length;
                                            const byDate = {};
                                            filteredConsumptions.forEach(c => { const dk = c.date || safeToISODate(c.timestamp); if (dk) byDate[dk] = (byDate[dk] || 0) + 1; });
                                            const uniqueDays = Object.keys(byDate).length;
                                            const avgPerDay = uniqueDays > 0 ? (totalConsumptions / uniqueDays).toFixed(1) : 0;

                                            // Calculate average interval
                                            const sorted = [...filteredConsumptions].sort((a,b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
                                            const intervals = [];
                                            for (let i = 1; i < sorted.length; i++) {
                                                const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
                                                intervals.push(diff);
                                            }
                                            const avgInterval = intervals.length > 0 ? (intervals.reduce((sum, i) => sum + i, 0) / intervals.length).toFixed(1) : 0;

                                            // Get dates for calendar
                                            const dates = Object.keys(byDate).sort();

                                            // By part of day
                                            const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
                                            filteredConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                if (hour >= 6 && hour < 12) byPartOfDay.manha++;
                                                else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
                                                else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
                                                else byPartOfDay.madrugada++;
                                            });

                                            // Calculate consumption trend (last 30 days)
                                            const calculateTrend = () => {
                                                const today = new Date();
                                                const thirtyDaysAgo = new Date(today);
                                                thirtyDaysAgo.setDate(today.getDate() - 30);

                                                const last30Days = consumptions.filter(c => {
                                                    const cDate = new Date(c.timestamp || c.createdAt);
                                                    return cDate >= thirtyDaysAgo && cDate <= today;
                                                });

                                                if (last30Days.length < 7) return null; // Precisa pelo menos 7 dias de dados

                                                // Agrupar por dia
                                                const dailyCounts = {};
                                                for (let i = 0; i <= 30; i++) {
                                                    const d = new Date(thirtyDaysAgo);
                                                    d.setDate(d.getDate() + i);
                                                    const key = d.toISOString().split('T')[0];
                                                    dailyCounts[key] = 0;
                                                }

                                                last30Days.forEach(c => {
                                                    const key = (c.date || safeToISODate(c.timestamp));
                                                    if (dailyCounts[key] !== undefined) dailyCounts[key]++;
                                                });

                                                // Regressão linear simples: y = mx + b
                                                const points = Object.entries(dailyCounts).map(([date, count], idx) => ({ x: idx, y: count }));
                                                const n = points.length;
                                                const sumX = points.reduce((s, p) => s + p.x, 0);
                                                const sumY = points.reduce((s, p) => s + p.y, 0);
                                                const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
                                                const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

                                                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                                                const intercept = (sumY - slope * sumX) / n;

                                                // Projeção para 10 dias à frente
                                                const currentAvg = sumY / n;
                                                const projection10Days = slope * (n + 10) + intercept;

                                                return {
                                                    slope: slope,
                                                    direction: Math.abs(slope) < 0.02 ? 'stable' : slope > 0 ? 'increasing' : 'decreasing',
                                                    slopePerDay: slope.toFixed(2),
                                                    currentAvg: currentAvg.toFixed(1),
                                                    projection: projection10Days > 0 ? projection10Days.toFixed(1) : 0
                                                };
                                            };

                                            const trend = calculateTrend();

                                            // Generate insights
                                            const insights = [];

                                            // Best day insight (excluir o dia de hoje exceto quando filtrado por "dia")
                                            if (dates.length > 0) {
                                                const today = new Date().toISOString().split('T')[0];
                                                const completedDates = patternsPeriod === 'hoje' ? dates : dates.filter(d => d !== today);
                                                if (completedDates.length > 0) {
                                                    const sortedDates = completedDates.sort((a, b) => byDate[a] - byDate[b]);
                                                    const bestDate = sortedDates[0];
                                                    const bestCount = byDate[bestDate];
                                                    const bestDayName = new Date(bestDate + 'T12:00:00').toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'pt-PT', { weekday: 'long', day: 'numeric', month: 'short' });
                                                    const countStr = bestCount === 1 ? t('patterns.bestDay.oneUse') : t('patterns.bestDay.multiUse', { count: bestCount });
                                                    const suffixStr = bestCount <= 2 ? t('patterns.bestDay.identifyGood') : t('patterns.bestDay.keepImproving');
                                                    const prefix = completedDates.length === 1 ? t('patterns.bestDay.single', { date: bestDayName, count: countStr }) : t('patterns.bestDay.multi', { date: bestDayName, count: countStr });
                                                    insights.push({
                                                        text: `${prefix} ${suffixStr}`,
                                                        type: 'positive'
                                                    });
                                                }
                                            }

                                            // Time pattern insight
                                            const maxPartOfDay = Object.entries(byPartOfDay).reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
                                            if (maxPartOfDay[1] > 0) {
                                                const percentage = ((maxPartOfDay[1] / filteredConsumptions.length) * 100).toFixed(0);
                                                insights.push({
                                                    text: t('patterns.patternInsight', { percent: percentage, part: t('patterns.partOfDay.' + maxPartOfDay[0]) }),
                                                    type: 'info'
                                                });
                                            }

                                            // Calculate goals analysis for dashboard
                                            let goalsAnalysis = null;
                                            if (goals.length > 0) {
                                                // Filter to get only the most recent goal of each type
                                                const uniqueGoals = [];
                                                const goalsByType = {};

                                                goals.forEach(g => {
                                                    if (!goalsByType[g.type] || new Date(g.createdAt) > new Date(goalsByType[g.type].createdAt)) {
                                                        goalsByType[g.type] = g;
                                                    }
                                                });

                                                uniqueGoals.push(...Object.values(goalsByType));

                                                const periodDays = patternsPeriod === 'hoje' ? 1 :
                                                                 patternsPeriod === 'semana' ? 7 :
                                                                 patternsPeriod === 'mes' ? 30 :
                                                                 uniqueDays || 1;

                                                const totalAchievements = uniqueGoals.reduce((sum, g) => sum + getGoalAchievementCount(g, filteredConsumptions, filteredDailyLogs, filteredCycles, filteredWellbeingLogs), 0);

                                                // Calcular dias únicos com consumos (base para TODAS as metas exceto sleep_hours/bedtime_before)
                                                const today = getTodayKey(); // ISO format for consistent date comparisons
                                                const daysWithConsumptions = new Set();
                                                filteredConsumptions.forEach(c => {
                                                    const dateKey = c.date || safeToISODate(c.timestamp);
                                                    if (dateKey && dateKey !== today) daysWithConsumptions.add(dateKey);
                                                });
                                                const totalDaysWithConsumptions = daysWithConsumptions.size;

                                                // Calcular dias únicos com sono (para sleep_hours)
                                                const daysWithSleep = new Set();
                                                filteredCycles.forEach(c => {
                                                    const dateKey = c.date || safeToISODate(c.timestamp);
                                                    if (dateKey && dateKey !== today && c.sleep != null && c.sleep !== '') {
                                                        daysWithSleep.add(dateKey);
                                                    }
                                                });
                                                filteredWellbeingLogs.forEach(w => {
                                                    const dateKey = w.date || safeToISODate(w.timestamp);
                                                    if (dateKey && dateKey !== today && w.sleep != null && w.sleep !== '') {
                                                        daysWithSleep.add(dateKey);
                                                    }
                                                });
                                                const totalDaysWithSleep = daysWithSleep.size;

                                                // Dias com hora de deitar registada (para bedtime_before)
                                                const daysWithBedtime = new Set();
                                                filteredCycles.forEach(c => {
                                                    const dateKey = c.date || safeToISODate(c.timestamp);
                                                    if (dateKey && dateKey !== today && c.bedtime) {
                                                        daysWithBedtime.add(dateKey);
                                                    }
                                                });
                                                const totalDaysWithBedtime = daysWithBedtime.size;

                                                // Dias com ≥2 consumos (para increase_interval — precisas de pelo menos 2 para calcular intervalo)
                                                const countByDatePT = {};
                                                filteredConsumptions.forEach(c => {
                                                    const dateKey = timestampToPT(c.timestamp);
                                                    if (dateKey && dateKey !== today) countByDatePT[dateKey] = (countByDatePT[dateKey] || 0) + 1;
                                                });
                                                const totalDaysWithMultipleConsumptions = Object.values(countByDatePT).filter(n => n >= 2).length;

                                                // Dias com dados de mg (para reduce_quantity)
                                                const daysWithMg = new Set();
                                                filteredDailyLogs.forEach(log => {
                                                    if (log.date && log.mg != null) daysWithMg.add(log.date);
                                                });
                                                filteredCycles.forEach(c => {
                                                    if (c.mg) { const dk = getDateKeyFromItem(c); if (dk && dk !== today) daysWithMg.add(dk); }
                                                });
                                                daysWithMg.delete(today);
                                                const totalDaysWithMg = daysWithMg.size;

                                                // Dias com consumos E dados de ciclo (bedtime+sleep) para first_not_before
                                                const datesWithCycleData = new Set();
                                                filteredCycles.forEach(c => {
                                                    if (c.bedtime && c.sleep) { const dk = getDateKeyFromItem(c); if (dk) datesWithCycleData.add(dk); }
                                                });
                                                const daysWithConsumptionsAndCycle = new Set();
                                                filteredConsumptions.forEach(c => {
                                                    const dateKey = c.date || safeToISODate(c.timestamp); // ISO format to match datesWithCycleData
                                                    if (dateKey && dateKey !== today && datesWithCycleData.has(dateKey)) daysWithConsumptionsAndCycle.add(dateKey);
                                                });
                                                const totalDaysWithConsumptionsAndCycle = daysWithConsumptionsAndCycle.size;

                                                // Para reduce_frequency, o denominador é TODOS os dias desde o primeiro registo
                                                // (dias sem consumos também contam como sucesso na meta de frequência)
                                                const allDaysCount = getAllDaysSinceFirstRecord(filteredConsumptions).length;

                                                const goalBreakdown = uniqueGoals.map(g => {
                                                    // Filter data by goal.createdAt to avoid inflating denominators
                                                    // with history that predates the goal being set
                                                    const goalCreatedAt = g.createdAt ? g.createdAt.split('T')[0] : null;
                                                    const gCons = goalCreatedAt
                                                        ? filteredConsumptions.filter(c => { const d = c.date || safeToISODate(c.timestamp); return !d || d >= goalCreatedAt; })
                                                        : filteredConsumptions;
                                                    const gLogs = goalCreatedAt
                                                        ? filteredDailyLogs.filter(l => !l.date || l.date >= goalCreatedAt)
                                                        : filteredDailyLogs;
                                                    const gCycles = goalCreatedAt
                                                        ? filteredCycles.filter(c => { const d = c.date || safeToISODate(c.timestamp); return !d || d >= goalCreatedAt; })
                                                        : filteredCycles;
                                                    const gWellbeing = goalCreatedAt
                                                        ? filteredWellbeingLogs.filter(w => { const d = w.date || safeToISODate(w.timestamp); return !d || d >= goalCreatedAt; })
                                                        : filteredWellbeingLogs;

                                                    const achievementCount = getGoalAchievementCount(g, gCons, gLogs, gCycles, gWellbeing);

                                                    let totalPossible = 0;

                                                    if (g.type === 'sleep_hours') {
                                                        const s = new Set();
                                                        gCycles.forEach(c => { const d = c.date || safeToISODate(c.timestamp); if (d && d !== today && c.sleep != null && c.sleep !== '') s.add(d); });
                                                        gWellbeing.forEach(w => { const d = w.date || safeToISODate(w.timestamp); if (d && d !== today && w.sleep != null && w.sleep !== '') s.add(d); });
                                                        totalPossible = s.size;
                                                    } else if (g.type === 'bedtime_before') {
                                                        const s = new Set();
                                                        gCycles.forEach(c => { const d = c.date || safeToISODate(c.timestamp); if (d && d !== today && c.bedtime) s.add(d); });
                                                        totalPossible = s.size;
                                                    } else if (g.type === 'reduce_frequency') {
                                                        totalPossible = getAllDaysSinceFirstRecord(gCons).length;
                                                    } else if (g.type === 'increase_interval') {
                                                        const cnt = {};
                                                        gCons.forEach(c => { const d = safeToISODate(c.timestamp); if (d && d !== today) cnt[d] = (cnt[d] || 0) + 1; });
                                                        totalPossible = Object.values(cnt).filter(n => n >= 2).length;
                                                    } else if (g.type === 'reduce_quantity') {
                                                        const s = new Set();
                                                        gLogs.forEach(l => { if (l.date && l.mg != null && l.date !== today) s.add(l.date); });
                                                        gCycles.forEach(c => { if (c.mg) { const d = getDateKeyFromItem(c); if (d && d !== today) s.add(d); } });
                                                        totalPossible = s.size;
                                                    } else if (g.type === 'limit_last') {
                                                        // Denominador = ciclos fechados onde a meia-noite ocorreu
                                                        const sortedC = [...gCycles]
                                                            .filter(c => c.timestamp || c.date)
                                                            .map(c => new Date(c.timestamp || c.date))
                                                            .sort((a, b) => a - b);
                                                        const now = new Date();
                                                        const bounds = [...sortedC, now];
                                                        let cyclesTotalPossible = 0;
                                                        for (let i = 0; i < bounds.length - 1; i++) {
                                                            const cStart = bounds[i];
                                                            const cEnd = bounds[i + 1];
                                                            const midnight = new Date(cStart);
                                                            midnight.setDate(midnight.getDate() + 1);
                                                            midnight.setHours(0, 0, 0, 0);
                                                            if (midnight >= cEnd) continue;
                                                            const hasCons = gCons.some(c => { const t = new Date(c.timestamp); return t > cStart && t <= cEnd; });
                                                            if (hasCons) cyclesTotalPossible++;
                                                        }
                                                        totalPossible = cyclesTotalPossible;
                                                    } else {
                                                        // first_not_before, default: days with consumptions
                                                        const s = new Set();
                                                        gCons.forEach(c => { const d = c.date || safeToISODate(c.timestamp); if (d && d !== today) s.add(d); });
                                                        totalPossible = s.size;
                                                    }

                                                    const successRate = totalPossible > 0 ? (achievementCount / totalPossible) * 100 : 0;

                                                    return {
                                                        ...g,
                                                        achievementCount,
                                                        totalPossible,
                                                        successRate
                                                    };
                                                });

                                                const avgAchievementsPerDay = periodDays > 0 ? totalAchievements / periodDays : 0;
                                                const goalsWithAchievements = goalBreakdown.filter(g => g.achievementCount > 0).length;

                                                goalsAnalysis = {
                                                    totalAchievements,
                                                    totalGoals: uniqueGoals.length,
                                                    avgAchievementsPerDay: avgAchievementsPerDay.toFixed(1),
                                                    goalsWithAchievements,
                                                    goalBreakdown,
                                                    activeGoals: uniqueGoals.filter(g => !g.completed).length,
                                                    periodDays
                                                };
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {atypicalBanner}
                                                    {/* Mini-resumo contextual */}
                                                    <div className={'bg-indigo-900/30 border-indigo-700/50' + ' rounded-lg p-4 border'}>
                                                        <p className={'text-sm leading-relaxed ' + 'text-gray-200'}>
                                                            {(() => {
                                                                const unit = totalConsumptions === 1 ? (i18n.language === 'en' ? 'use' : 'consumo') : (i18n.language === 'en' ? 'uses' : 'consumos');
                                                                const intervalPart = avgInterval > 0 ? t('patterns.dashboard.summaryInterval', { avg: avgInterval }) : '';
                                                                return t('patterns.dashboard.summary', { count: totalConsumptions, unit, avg: avgPerDay, interval: intervalPart });
                                                            })()}
                                                        </p>
                                                    </div>

                                                    {/* Métricas essenciais */}
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className={'bg-purple-900/30 border border-purple-700/50' + ' rounded-lg p-4 text-center border'}>
                                                            <div className={'text-xs mb-1 ' + 'text-gray-300'}>{t('patterns.dashboard.metricTotal')}</div>
                                                            <div className={'text-purple-400' + ' text-2xl font-bold'}>{totalConsumptions}x</div>
                                                        </div>
                                                        <div className={'bg-blue-900/30 border border-blue-700/50' + ' rounded-lg p-4 text-center border'}>
                                                            <div className={'text-xs mb-1 ' + 'text-gray-300'}>{t('patterns.dashboard.metricAvgDay')}</div>
                                                            <div className={'text-blue-400' + ' text-2xl font-bold'}>{avgPerDay}</div>
                                                        </div>
                                                        <div className={'bg-green-900/30 border border-green-700/50' + ' rounded-lg p-4 text-center border'}>
                                                            <div className={'text-xs mb-1 ' + 'text-gray-300'}>{t('patterns.dashboard.metricAvgInterval')}</div>
                                                            <div className={'text-green-400' + ' text-2xl font-bold'}>{avgInterval}h</div>
                                                        </div>
                                                    </div>

                                                    {/* Tendência (30 dias) */}
                                                    {trend && (
                                                        <div className={
                                                            (trend.direction === 'increasing'
                                                                ? 'bg-red-900/30 border-red-700/50'
                                                                : trend.direction === 'decreasing'
                                                                    ? ('bg-green-900/30 border-green-700/50')
                                                                    : 'bg-gray-700/30 border-gray-600'
                                                            ) + ' rounded-lg p-4 border'
                                                        }>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className={'text-xs font-semibold uppercase tracking-wide ' + (
                                                                    trend.direction === 'increasing'
                                                                        ? 'text-red-400'
                                                                        : trend.direction === 'decreasing'
                                                                            ? 'text-green-400'
                                                                            : 'text-gray-400'
                                                                )}>
                                                                    {t('patterns.trend.title')}
                                                                </div>
                                                                <span className={'text-2xl ' + (
                                                                    trend.direction === 'increasing' ? '⚠️' :
                                                                    trend.direction === 'decreasing' ? '✅' : '➖'
                                                                )}></span>
                                                            </div>
                                                            <div className={'text-sm leading-relaxed ' + 'text-gray-200'}>
                                                                {trend.direction === 'increasing' && (
                                                                    <>
                                                                        <strong className={'text-red-400'}>{t('patterns.trend.increasing')}</strong> +{trend.slopePerDay} {i18n.language === 'en' ? 'uses/day avg.' : 'consumos/dia em média.'}
                                                                        <br />
                                                                        <span className={'text-xs mt-1 block ' + 'text-gray-400'}>
                                                                            {t('patterns.trend.increasingDetail', { slope: trend.slopePerDay, projection: trend.projection })}
                                                                        </span>
                                                                    </>
                                                                )}
                                                                {trend.direction === 'decreasing' && (
                                                                    <>
                                                                        <strong className={'text-green-400'}>{t('patterns.trend.decreasing')}</strong> {trend.slopePerDay} {i18n.language === 'en' ? 'uses/day avg.' : 'consumos/dia em média.'}
                                                                        <br />
                                                                        <span className={'text-xs mt-1 block ' + 'text-gray-400'}>
                                                                            {t('patterns.trend.decreasingDetail', { slope: Math.abs(parseFloat(trend.slopePerDay)), projection: trend.projection })}
                                                                        </span>
                                                                    </>
                                                                )}
                                                                {trend.direction === 'stable' && (
                                                                    <>
                                                                        <strong className={'text-gray-400'}>{t('patterns.trend.stable')}</strong> ~{trend.currentAvg} {i18n.language === 'en' ? 'uses/day (minimal variation)' : 'consumos/dia (variação mínima)'}
                                                                        <br />
                                                                        <span className={'text-xs mt-1 block ' + 'text-gray-400'}>
                                                                            {t('patterns.trend.stableDetail')}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Alertas Preditivos */}
                                                    {(() => {
                                                        // Agregar dados por dia
                                                        const parseSafe = (val) => { const n = parseFloat(val); return isNaN(n) ? null : n; };
                                                        const dailyData = {};
                                                        // Track mood/energy sums and counts for averaging
                                                        const moodCounts = {}, energyCounts = {};
                                                        const ensureDay = (date) => {
                                                            if (!dailyData[date]) dailyData[date] = { sleep: null, mood: null, energy: null, water: false, rest: false, food: false, social: false, consumptions: 0, mg: null };
                                                        };

                                                        wellbeingLogs.forEach(w => {
                                                            const date = w.date || safeToISODate(w.timestamp);
                                                            if (!date) return;
                                                            ensureDay(date);
                                                            if (w.mood != null) {
                                                                const v = parseSafe(w.mood);
                                                                if (v !== null) {
                                                                    moodCounts[date] = moodCounts[date] || { sum: 0, n: 0 };
                                                                    moodCounts[date].sum += v; moodCounts[date].n++;
                                                                    dailyData[date].mood = moodCounts[date].sum / moodCounts[date].n;
                                                                }
                                                            }
                                                            if (w.energy != null) {
                                                                const v = parseSafe(w.energy);
                                                                if (v !== null) {
                                                                    energyCounts[date] = energyCounts[date] || { sum: 0, n: 0 };
                                                                    energyCounts[date].sum += v; energyCounts[date].n++;
                                                                    dailyData[date].energy = energyCounts[date].sum / energyCounts[date].n;
                                                                }
                                                            }
                                                            if (w.water || (w.waterGlasses > 0)) dailyData[date].water = true;
                                                            if (w.rest || (w.exercise && w.exercise.trim()) || w.exerciseType || (w.exerciseDuration > 0)) dailyData[date].rest = true;
                                                            if (w.food) dailyData[date].food = true;
                                                            if (w.social) dailyData[date].social = true;
                                                        });
                                                        cycles.forEach(c => {
                                                            const date = c.date || safeToISODate(c.timestamp);
                                                            if (!date || c.sleep == null) return;
                                                            ensureDay(date);
                                                            const napMins = wellbeingLogs
                                                                .filter(w => (w.date || safeToISODate(w.timestamp)) === date && w.napDuration > 0)
                                                                .reduce((sum, w) => sum + (w.napDuration || 0), 0);
                                                            dailyData[date].sleep = parseFloat(c.sleep) + napMins / 60;
                                                        });
                                                        dailyLogs.forEach(l => {
                                                            if (l.mg == null) return;
                                                            const date = l.date || safeToISODate(l.timestamp);
                                                            if (!date) return;
                                                            ensureDay(date);
                                                            dailyData[date].mg = (dailyData[date].mg || 0) + l.mg;
                                                        });
                                                        consumptions.forEach(c => {
                                                            const date = c.date || safeToISODate(c.timestamp);
                                                            if (!date) return;
                                                            ensureDay(date);
                                                            dailyData[date].consumptions++;
                                                        });

                                                        // Use local date to avoid UTC midnight edge case
                                                        const today = new Date();
                                                        const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                                        const getDS = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return localDateStr(d); };
                                                        const d1 = getDS(1), d2 = getDS(2), d3 = getDS(3);

                                                        if (![d1, d2, d3].some(d => dailyData[d])) {
                                                            return (
                                                                <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4 mt-4">
                                                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{t('patterns.todayForecast')}</div>
                                                                    <div className="text-sm text-gray-400">
                                                                        {i18n.language === 'en'
                                                                            ? 'Not enough data yet. Register wellbeing, sleep cycles or daily dose for the last 3 days to see a prediction.'
                                                                            : 'Dados insuficientes. Regista bem-estar, ciclos de sono ou dose diária nos últimos 3 dias para ver uma previsão.'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        // Média ponderada 3 dias: ontem ×3, anteontem ×2, há 3 dias ×1
                                                        const wavg = (field) => {
                                                            const pts = [{ d: d1, w: 3 }, { d: d2, w: 2 }, { d: d3, w: 1 }].filter(p => dailyData[p.d]?.[field] != null);
                                                            if (!pts.length) return null;
                                                            const tw = pts.reduce((s, p) => s + p.w, 0);
                                                            return pts.reduce((s, p) => s + dailyData[p.d][field] * p.w, 0) / tw;
                                                        };
                                                        const sleep = wavg('sleep'), mood = wavg('mood'), energy = wavg('energy');
                                                        const fmt = (v) => v != null ? v.toFixed(1) : '?';

                                                        // Autocuidado médio (ontem + anteontem)
                                                        const yd = dailyData[d1] || {};
                                                        const hasYesterdayWellbeing = !!(dailyData[d1]);
                                                        const scDays = [d1, d2].filter(d => dailyData[d]);
                                                        let selfCareAvg = null;
                                                        if (scDays.length > 0) {
                                                            const scores = scDays.map(d => {
                                                                const day = dailyData[d];
                                                                return (day.water ? 1 : 0) + (day.rest ? 1 : 0) + (day.food ? 1 : 0) + (day.social ? 1 : 0);
                                                            });
                                                            selfCareAvg = scores.reduce((s, v) => s + v, 0) / scores.length;
                                                        }
                                                        // Detalhes de ontem para display
                                                        const selfCareDetails = [];
                                                        if (yd.water) selfCareDetails.push(i18n.language === 'en' ? 'Water' : 'Água');
                                                        if (yd.rest) selfCareDetails.push(i18n.language === 'en' ? 'Rest' : 'Descanso');
                                                        if (yd.food) selfCareDetails.push(i18n.language === 'en' ? 'Food' : 'Alimentação');
                                                        if (yd.social) selfCareDetails.push('Social');

                                                        // Emoções (d1, d2, d3) — valência e instabilidade
                                                        const getEmotionsForDay = (date) =>
                                                            wellbeingLogs.filter(w => (w.date || safeToISODate(w.timestamp)) === date).flatMap(w => w.emotions || []);
                                                        const emotionsD1 = getEmotionsForDay(d1);
                                                        const emotionsD2 = getEmotionsForDay(d2);
                                                        const emotionsD3 = getEmotionsForDay(d3);
                                                        const allRecentEmotions = [...emotionsD1, ...emotionsD2, ...emotionsD3];
                                                        const negEmotions = allRecentEmotions.filter(e => EMOTION_CATEGORIES.negative.includes(e));
                                                        const posEmotions = allRecentEmotions.filter(e => EMOTION_CATEGORIES.positive.includes(e));
                                                        const totalEmotions = allRecentEmotions.length;
                                                        const negRatio = totalEmotions >= 2 ? negEmotions.length / totalEmotions : null;
                                                        const hasCravingYesterday = emotionsD1.includes('🔥 Com craving');
                                                        const uniqueD1 = new Set(emotionsD1).size;
                                                        const emotionFlux = emotionsD1.length > 0 && emotionsD2.length > 0
                                                            ? emotionsD1.filter(e => !emotionsD2.includes(e)).length
                                                            : 0;
                                                        const emotionallyUnstable = uniqueD1 >= 5 || emotionFlux >= 4;

                                                        // Tendência humor/energia últimos 7 dias (oldest→newest)
                                                        const calcTrend = (field) => {
                                                            const vals = Array.from({ length: 7 }, (_, i) => dailyData[getDS(7 - i)]?.[field] ?? null).filter(v => v != null);
                                                            if (vals.length < 3) return 0;
                                                            const h = Math.floor(vals.length / 2);
                                                            return (vals.slice(-h).reduce((s, v) => s + v, 0) / h) - (vals.slice(0, h).reduce((s, v) => s + v, 0) / h);
                                                        };
                                                        const moodTrend = calcTrend('mood'), energyTrend = calcTrend('energy');

                                                        // mg ontem vs. média dos 30 dias anteriores
                                                        const mgYesterday = yd.mg ?? null;
                                                        const mgHistory = Array.from({ length: 30 }, (_, i) => dailyData[getDS(i + 2)]?.mg).filter(v => v != null && v > 0);
                                                        const mgAvg = mgHistory.length >= 7 ? mgHistory.reduce((s, v) => s + v, 0) / mgHistory.length : null;

                                                        // Dia da semana
                                                        const allDays = Object.keys(dailyData);
                                                        const weeksOfData = allDays.length / 7;
                                                        const todayDOW = today.getDay();
                                                        const wkCons = {};
                                                        allDays.forEach(date => {
                                                            const dow = new Date(date).getDay();
                                                            if (!wkCons[dow]) wkCons[dow] = [];
                                                            wkCons[dow].push(dailyData[date].consumptions);
                                                        });
                                                        const todayAvg = wkCons[todayDOW] ? wkCons[todayDOW].reduce((s, c) => s + c, 0) / wkCons[todayDOW].length : null;
                                                        const overallAvg = allDays.reduce((s, d) => s + dailyData[d].consumptions, 0) / allDays.length;

                                                        // Tendência consumo últimos 7 dias
                                                        const last7S = Object.keys(dailyData).sort().slice(-7);
                                                        const l7c = last7S.map(d => dailyData[d].consumptions);
                                                        const trendRecent = l7c.length >= 6
                                                            ? (l7c.slice(-3).reduce((s, c) => s + c, 0) / 3) - (l7c.slice(0, 3).reduce((s, c) => s + c, 0) / 3)
                                                            : 0;

                                                        // ── CALCULAR SCORE ──────────────────────────────────
                                                        let riskScore = 30;
                                                        const riskFactors = [];
                                                        const lbl = i18n.language === 'en' ? '(avg 3d)' : '(média 3 dias)';

                                                        // 1. Sono — horas dormidas (média pond. 3 dias)
                                                        if (sleep !== null) {
                                                            if (sleep < 4) { riskScore += 20; riskFactors.push({ emoji: '😴', positive: false, text: t('patterns.riskLevel.sleepVeryLow', { lbl, value: fmt(sleep) }) }); }
                                                            else if (sleep < 6) { riskScore += 10; riskFactors.push({ emoji: '😴', positive: false, text: t('patterns.riskLevel.sleepLow', { lbl, value: fmt(sleep) }) }); }
                                                            else if (sleep >= 7) { riskScore -= 10; riskFactors.push({ emoji: '😴', positive: true, text: t('patterns.riskLevel.sleepGood', { lbl, value: fmt(sleep) }) }); }
                                                        }

                                                        // 2. Humor (média pond. 3 dias) — pesos reduzidos pois tendência já captura a variação
                                                        if (mood !== null) {
                                                            if (mood < 4) { riskScore += 10; riskFactors.push({ emoji: '😔', positive: false, text: t('patterns.riskLevel.moodVeryLow', { lbl, value: fmt(mood) }) }); }
                                                            else if (mood < 6) { riskScore += 5; riskFactors.push({ emoji: '😐', positive: false, text: t('patterns.riskLevel.moodModerate', { lbl, value: fmt(mood) }) }); }
                                                            else if (mood >= 7) { riskScore -= 8; riskFactors.push({ emoji: '😊', positive: true, text: t('patterns.riskLevel.moodGood', { lbl, value: fmt(mood) }) }); }
                                                        }

                                                        // 3. Energia (média pond. 3 dias) — pesos reduzidos
                                                        if (energy !== null) {
                                                            if (energy < 4) { riskScore += 10; riskFactors.push({ emoji: '🔋', positive: false, text: t('patterns.riskLevel.energyVeryLow', { lbl, value: fmt(energy) }) }); }
                                                            else if (energy < 6) { riskScore += 5; riskFactors.push({ emoji: '🪫', positive: false, text: t('patterns.riskLevel.energyModerate', { lbl, value: fmt(energy) }) }); }
                                                            else if (energy >= 7) { riskScore -= 8; riskFactors.push({ emoji: '⚡', positive: true, text: t('patterns.riskLevel.energyGood', { lbl, value: fmt(energy) }) }); }
                                                        }

                                                        // 4. Autocuidado (média 2 dias)
                                                        if (selfCareAvg !== null) {
                                                            const scLbl = t(scDays.length > 1 ? 'patterns.riskLevel.selfCareAvg2d' : 'patterns.riskLevel.selfCareYesterday');
                                                            if (selfCareAvg < 1) { riskScore += 15; riskFactors.push({ emoji: '⚠️', positive: false, text: t('patterns.riskLevel.noSelfCare') }); }
                                                            else if (selfCareAvg < 2) { riskScore += 8; riskFactors.push({ emoji: '⚠️', positive: false, text: t('patterns.riskLevel.minSelfCare', { items: selfCareDetails.join(', ') }) }); }
                                                            else if (selfCareAvg < 3) { riskFactors.push({ emoji: '🟡', positive: null, text: t('patterns.riskLevel.selfCarePartial', { lbl: scLbl, value: selfCareAvg.toFixed(1) }) }); }
                                                            else { riskScore -= 12; riskFactors.push({ emoji: '✅', positive: true, text: t('patterns.riskLevel.goodSelfCare', { score: selfCareAvg.toFixed(1), items: selfCareDetails.join(', ') }) }); }
                                                        }

                                                        // 5. Tendência humor/energia (últimos 7 dias)
                                                        if (moodTrend < -1.5 || energyTrend < -1.5) {
                                                            riskScore += 12;
                                                            const which = moodTrend < -1.5 && energyTrend < -1.5
                                                                ? t('patterns.riskLevel.moodEnergyDeclining')
                                                                : moodTrend < -1.5 ? t('patterns.riskLevel.moodDeclining') : t('patterns.riskLevel.energyDeclining');
                                                            riskFactors.push({ emoji: '📉', positive: false, text: t('patterns.riskLevel.trendDeclining', { which }) });
                                                        } else if (moodTrend > 1.5 && energyTrend > 1.5) {
                                                            riskScore -= 8;
                                                            riskFactors.push({ emoji: '📈', positive: true, text: t('patterns.riskLevel.trendImproving') });
                                                        }

                                                        // 6. mg ontem vs. média histórica
                                                        if (mgYesterday !== null && mgAvg !== null) {
                                                            if (mgYesterday > mgAvg * 1.4) { riskScore += 12; riskFactors.push({ emoji: '💊', positive: false, text: t('patterns.riskLevel.mgWayAbove', { yesterday: mgYesterday, avg: Math.round(mgAvg) }) }); }
                                                            else if (mgYesterday > mgAvg * 1.2) { riskScore += 6; riskFactors.push({ emoji: '💊', positive: false, text: t('patterns.riskLevel.mgAbove', { yesterday: mgYesterday, avg: Math.round(mgAvg) }) }); }
                                                            else if (mgYesterday < mgAvg * 0.8) { riskScore -= 6; riskFactors.push({ emoji: '💊', positive: true, text: t('patterns.riskLevel.mgBelow', { yesterday: mgYesterday, avg: Math.round(mgAvg) }) }); }
                                                        }

                                                        // 7. Dia da semana — só ativo com ≥ 4 semanas de dados
                                                        if (weeksOfData >= 4 && todayAvg !== null && todayAvg > overallAvg * 1.3) {
                                                            riskScore += 12;
                                                            const dayNames = t('analyses.dayNames', { returnObjects: true });
                                                            riskFactors.push({ emoji: '📅', positive: false, text: t('patterns.riskLevel.highDayOfWeek', { day: dayNames[todayDOW] }) });
                                                        }

                                                        // 8. Tendência consumo últimos 7 dias
                                                        if (trendRecent > 0.5) { riskScore += 10; riskFactors.push({ emoji: '📈', positive: false, text: t('patterns.riskLevel.trendIncreasing') }); }
                                                        else if (trendRecent < -0.5) { riskScore -= 10; riskFactors.push({ emoji: '📉', positive: true, text: t('patterns.riskLevel.trendDecreasing') }); }

                                                        // 9. Emoções — craving, valência e instabilidade
                                                        if (hasCravingYesterday) { riskScore += 15; riskFactors.push({ emoji: '🔥', positive: false, text: t('patterns.riskLevel.cravingYesterday') }); }
                                                        if (negRatio !== null) {
                                                            if (negRatio > 0.6 && totalEmotions >= 3) { riskScore += 12; riskFactors.push({ emoji: '😰', positive: false, text: t('patterns.riskLevel.emotionsMajorityNeg', { pct: Math.round(negRatio * 100) }) }); }
                                                            else if (negRatio > 0.4 && totalEmotions >= 2) { riskScore += 6; riskFactors.push({ emoji: '😐', positive: false, text: t('patterns.riskLevel.emotionsHalfNeg', { pct: Math.round(negRatio * 100) }) }); }
                                                            else if (negRatio < 0.25 && posEmotions.length >= 3) { riskScore -= 8; riskFactors.push({ emoji: '💚', positive: true, text: t('patterns.riskLevel.emotionsMostlyPos') }); }
                                                        }
                                                        if (emotionallyUnstable) { riskScore += 8; riskFactors.push({ emoji: '🌊', positive: false, text: t('patterns.riskLevel.emotionsUnstable') }); }

                                                        riskScore = Math.max(0, Math.min(100, riskScore));

                                                        // Classificar risco
                                                        let riskLevel, riskColor, riskBg, riskBorder, riskEmoji;
                                                        if (riskScore >= 70) {
                                                            riskLevel = t('patterns.riskLevel.high');
                                                            riskColor = 'text-red-400';
                                                            riskBg = 'bg-red-900/30';
                                                            riskBorder = 'border-red-700/50';
                                                            riskEmoji = '🚨';
                                                        } else if (riskScore >= 55) {
                                                            riskLevel = t('patterns.riskLevel.moderate');
                                                            riskColor = 'text-yellow-400';
                                                            riskBg = 'bg-yellow-900/30';
                                                            riskBorder = 'border-yellow-700/50';
                                                            riskEmoji = '⚠️';
                                                        } else {
                                                            riskLevel = t('patterns.riskLevel.low');
                                                            riskColor = 'text-green-400';
                                                            riskBg = 'bg-green-900/30';
                                                            riskBorder = 'border-green-700/50';
                                                            riskEmoji = '✅';
                                                        }

                                                        return (
                                                            <div className={`${riskBg} border ${riskBorder} rounded-lg p-4 mt-4`}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className={'text-xs font-semibold uppercase tracking-wide ' + riskColor}>
                                                                        {t('patterns.todayForecast')}
                                                                    </div>
                                                                    <span className="text-2xl">{riskEmoji}</span>
                                                                </div>
                                                                <div className={'text-sm leading-relaxed ' + 'text-gray-200'}>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <strong className={riskColor}>{t('patterns.riskLevel.label', { level: riskLevel })}</strong>
                                                                        <div className={'text-xs px-2 py-0.5 rounded-full font-semibold ' + riskColor}>
                                                                            {riskScore}%
                                                                        </div>
                                                                    </div>
                                                                    {riskFactors.length > 0 && (
                                                                        <div className="mt-2 space-y-1">
                                                                            <div className={'text-xs font-semibold ' + 'text-gray-400'}>{t('patterns.riskLevel.factors')}</div>
                                                                            {riskFactors.map((rf, idx) => (
                                                                                <div key={idx} className={'text-xs ' + (rf.positive === true ? 'text-green-400' : rf.positive === false ? 'text-red-300' : 'text-yellow-400')}>
                                                                                    {rf.emoji} {rf.text}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className={'text-xs mt-3 pt-2 border-t ' + 'border-gray-600 text-gray-400'}>
                                                                        {riskScore >= 70 ? t('patterns.riskLevel.msgHigh') : riskScore >= 55 ? t('patterns.moderateRisk') : t('patterns.riskLevel.msgLow')}
                                                                    </div>
                                                                    {weeksOfData < 4 && (
                                                                        <div className="text-xs mt-2 text-yellow-600/70">
                                                                            ⚠️ {i18n.language === 'en' ? 'The day-of-week factor needs at least 4–6 weeks of data to be reliable.' : 'O fator dia da semana precisa de pelo menos 4–6 semanas de dados para ser fiável.'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Heatmap */}
                                                    <HeatmapChart
                                                        consumptions={consumptions}
                                                        wellbeingLogs={wellbeingLogs}
                                                                        days={90}
                                                    />

                                                    {/* Evolução da Frequência */}
                                                    {Object.keys(byDate).length > 0 && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <div className="mb-4">
                                                                <h3 className={'font-semibold ' + ('text-white')}>
                                                                    {t('patterns.freq.title')}
                                                                </h3>
                                                                <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                                                    {t('patterns.freq.desc')}
                                                                </p>
                                                            </div>
                                                            {(() => {
                                                                // Preparar dados ordenados por data
                                                                const sortedDates = Object.keys(byDate).sort();
                                                                const maxCount = Math.max(...Object.values(byDate));

                                                                // Determinar quantos dias mostrar baseado no período
                                                                let daysToShow = sortedDates.length;
                                                                if (patternsPeriod === 'hoje') daysToShow = Math.min(7, sortedDates.length);
                                                                else if (patternsPeriod === 'semana') daysToShow = Math.min(14, sortedDates.length);
                                                                else if (patternsPeriod === 'mes') daysToShow = Math.min(30, sortedDates.length);
                                                                else daysToShow = Math.min(60, sortedDates.length);

                                                                const recentDates = sortedDates.slice(-daysToShow);

                                                                return (
                                                                    <div className="space-y-4">
                                                                        {/* Gráfico de barras */}
                                                                        <div className="flex items-end justify-between gap-1 h-48 relative overflow-hidden">
                                                                            {recentDates.map((date, idx) => {
                                                                                const count = byDate[date];
                                                                                const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                                                                const heightPx = Math.max((heightPercent / 100) * 192, 8); // 192px = h-48, min 8px
                                                                                const isToday = date === new Date().toISOString().split('T')[0];

                                                                                return (
                                                                                    <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative" style={{ minWidth: '2px' }}>
                                                                                        {/* Tooltip */}
                                                                                        <div className={'absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap px-2 py-1 rounded text-xs ' + 'bg-gray-700 text-gray-200'}>
                                                                                            {new Date(date + 'T12:00:00').toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}: {count}x
                                                                                        </div>

                                                                                        {/* Barra */}
                                                                                        <div
                                                                                            className={'w-full rounded-t transition-all duration-300 ' + (
                                                                                                isToday
                                                                                                    ? 'bg-gradient-to-t from-yellow-500 to-orange-500'
                                                                                                    : count >= 10
                                                                                                        ? 'bg-gradient-to-t from-red-500 to-red-400'
                                                                                                        : count > 6
                                                                                                            ? 'bg-gradient-to-t from-orange-500 to-orange-400'
                                                                                                            : count > 3
                                                                                                                ? 'bg-gradient-to-t from-blue-500 to-blue-400'
                                                                                                                : 'bg-gradient-to-t from-green-500 to-green-400'
                                                                                            )}
                                                                                            style={{ height: `${heightPx}px`, minHeight: '8px' }}
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        {/* Eixo X - Datas */}
                                                                        <div className="flex items-center justify-between gap-1 w-full">
                                                                            {recentDates.filter((_, idx) => {
                                                                                // Mostrar apenas algumas labels para não ficar congestionado
                                                                                if (recentDates.length <= 7) return true;
                                                                                if (recentDates.length <= 14) return idx % 2 === 0;
                                                                                if (recentDates.length <= 30) return idx % 4 === 0 || idx === recentDates.length - 1;
                                                                                return idx % 7 === 0 || idx === recentDates.length - 1;
                                                                            }).map(date => (
                                                                                <div key={date} className={'text-xs flex-1 text-center ' + ('text-gray-400')}>
                                                                                    {new Date(date + 'T12:00:00').toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        {/* Legenda */}
                                                                        <div className={'text-xs mt-2 pt-3 border-t flex items-center justify-center gap-4 flex-wrap ' + 'text-gray-400 border-gray-700'}>
                                                                            <div className="flex items-center gap-1">
                                                                                <div className="w-3 h-3 rounded bg-gradient-to-t from-green-500 to-green-400"></div>
                                                                                <span>1-3</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <div className="w-3 h-3 rounded bg-gradient-to-t from-blue-500 to-blue-400"></div>
                                                                                <span>4-6</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <div className="w-3 h-3 rounded bg-gradient-to-t from-orange-500 to-orange-400"></div>
                                                                                <span>7-9</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <div className="w-3 h-3 rounded bg-gradient-to-t from-red-500 to-red-400"></div>
                                                                                <span>10+</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <div className="w-3 h-3 rounded bg-gradient-to-t from-yellow-500 to-orange-500"></div>
                                                                                <span>{t('patterns.freq.today')}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {/* Insights Summary */}
                                                    {insights.length > 0 && (
                                                        <div className={'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'font-semibold ' + ('text-white') + ' mb-4 flex items-center gap-2'}>
                                                                <span className="text-xl">💡</span>
                                                                {t('patterns.identified')}
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {insights.map((insight, i) => (
                                                                    <div key={i} className={'flex items-start gap-3 p-3 rounded-lg ' + 'bg-gray-700/50 border-gray-600'}>
                                                                        <div className={'flex-1 text-sm leading-relaxed ' + 'text-gray-200'}>
                                                                            {insight.text}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Análise de Metas */}
                                                    {goalsAnalysis && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                {t('patterns.goals.title')}
                                                            </h3>

                                                            {/* Main stats */}
                                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                                <div className={'bg-gradient-to-br from-pink-900/30 to-purple-900/30 border-pink-700/50' + ' rounded-lg p-4 border'}>
                                                                    <div className={'text-xs font-semibold mb-1 uppercase tracking-wide ' + 'text-pink-400'}>
                                                                        {t('patterns.goals.totalCompliances')}
                                                                    </div>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className={'text-3xl font-black ' + 'text-pink-400'}>
                                                                            {goalsAnalysis.totalAchievements}
                                                                        </span>
                                                                        <span className={'text-sm ' + ('text-gray-400')}>
                                                                            {t('patterns.goals.times')}
                                                                        </span>
                                                                    </div>
                                                                    <div className={'text-xs mt-1 ' + ('text-gray-400')}>
                                                                        {t('patterns.goals.metAchieved', { achieved: goalsAnalysis.goalsWithAchievements, total: goalsAnalysis.totalGoals })}
                                                                    </div>
                                                                </div>

                                                                <div className={'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-700/50' + ' rounded-lg p-4 border'}>
                                                                    <div className={'text-xs font-semibold mb-1 uppercase tracking-wide ' + 'text-blue-400'}>
                                                                        {t('patterns.goals.avgPerDay')}
                                                                    </div>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className={'text-3xl font-black ' + 'text-blue-400'}>
                                                                            {goalsAnalysis.avgAchievementsPerDay}
                                                                        </span>
                                                                        <span className={'text-sm ' + ('text-gray-400')}>
                                                                            {t('patterns.goals.times')}
                                                                        </span>
                                                                    </div>
                                                                    <div className={'text-xs mt-1 ' + ('text-gray-400')}>
                                                                        {t('patterns.goals.avgPerDayLast', { days: goalsAnalysis.periodDays })}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Per-goal breakdown */}
                                                            <div className={'bg-gray-700/30' + ' rounded-lg p-4'}>
                                                                <div className={'text-xs font-semibold mb-3 uppercase tracking-wide ' + ('text-gray-400')}>
                                                                    {t('patterns.goals.breakdown')}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {goalsAnalysis.goalBreakdown.map(goal => {
                                                                        const goalTypeLabels = {
                                                                            'reduce_frequency': t('patterns.goals.types.reduce_frequency'),
                                                                            'reduce_quantity': t('patterns.goals.types.reduce_quantity'),
                                                                            'limit_last': t('patterns.goals.types.limit_last'),
                                                                            'increase_interval': t('patterns.goals.types.increase_interval'),
                                                                            'sleep_hours': t('patterns.goals.types.sleep_hours'),
                                                                            'bedtime_before': t('patterns.goals.types.bedtime_before'),
                                                                            'first_not_before': t('patterns.goals.types.first_not_before')
                                                                        };
                                                                        const explanations = {
                                                                            'reduce_frequency': t('patterns.goals.explain.reduce_frequency', { target: goal.target }),
                                                                            'reduce_quantity': t('patterns.goals.explain.reduce_quantity', { target: goal.target }),
                                                                            'limit_last': t('patterns.goals.explain.limit_last', { target: goal.target }),
                                                                            'increase_interval': t('patterns.goals.explain.increase_interval', { target: goal.target }),
                                                                            'sleep_hours': t('patterns.goals.explain.sleep_hours', { target: goal.target }),
                                                                            'bedtime_before': t('patterns.goals.explain.bedtime_before', { target: goal.target }),
                                                                            'first_not_before': t('patterns.goals.explain.first_not_before', { target: goal.target })
                                                                        };
                                                                        return (
                                                                            <div key={goal.id} className={'bg-gray-700/50 border-gray-600' + ' rounded-lg p-3 border'}>
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <div className="flex-1">
                                                                                        <div className={'text-sm font-medium mb-1 ' + ('text-white')}>
                                                                                            {goalTypeLabels[goal.type] || goal.type}
                                                                                        </div>
                                                                                        <div className={'text-xs italic ' + ('text-gray-400')}>
                                                                                            {t('patterns.goals.target')} {goal.type === 'increase_interval' ? '50%' : goal.target + (goal.type === 'reduce_frequency' ? (i18n.language === 'en' ? 'x/day' : 'x/dia') : goal.type === 'reduce_quantity' ? 'mg' : goal.type === 'sleep_hours' ? 'h' : '')}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <div className={'text-2xl font-black ' + (goal.achievementCount > 0 ? 'text-green-400' : 'text-gray-500')}>
                                                                                            {goal.achievementCount}
                                                                                        </div>
                                                                                        <div className={'text-xs ' + 'text-gray-500'}>
                                                                                            {t('patterns.goals.times')}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                {/* Progress Bar */}
                                                                                <div>
                                                                                    <div className="flex items-center justify-between mb-1">
                                                                                        <span className={'text-xs font-medium ' + ('text-gray-400')}>
                                                                                            {goal.achievementCount} / {goal.totalPossible}
                                                                                        </span>
                                                                                        <span className={'text-xs font-bold ' + (goal.successRate >= 70 ? 'text-green-400' : goal.successRate >= 40 ? 'text-yellow-400' : 'text-orange-400')}>
                                                                                            {goal.successRate.toFixed(0)}%
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className={'bg-gray-600' + ' rounded-full h-2 overflow-hidden'}>
                                                                                        <div
                                                                                            className={'h-full transition-all duration-500 ' + (goal.successRate >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : goal.successRate >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-orange-500 to-red-500')}
                                                                                            style={{width: `${Math.min(100, goal.successRate)}%`}}
                                                                                        ></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        // ANÁLISE DE PROGRESSO TEMPORAL
                                        if (patternView === 'progress') {
                                            // Define two periods to compare: recent vs previous
                                            const now = new Date();
                                            let recentStart, recentEnd, previousStart, previousEnd, periodDays;

                                            if (patternsPeriod === 'hoje') {
                                                // HOJE: Comparar dia atual (até agora) vs dia anterior (completo)
                                                // Dia atual: 00:00:00 de hoje → agora
                                                recentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                                                recentEnd = now;

                                                // Dia anterior: 00:00:00 ontem → 23:59:59 ontem
                                                previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
                                                previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
                                                periodDays = 1;
                                            } else if (patternsPeriod === 'semana') {
                                                // SEMANA: Esta semana vs semana anterior
                                                periodDays = 7;
                                                recentStart = subtractDays(now, periodDays);
                                                recentEnd = now;

                                                previousStart = subtractDays(now, periodDays * 2);
                                                previousEnd = recentStart;
                                            } else if (patternsPeriod === 'mes') {
                                                // MÊS: Este mês vs mês anterior
                                                periodDays = 30;
                                                recentStart = subtractDays(now, periodDays);
                                                recentEnd = now;

                                                previousStart = subtractDays(now, periodDays * 2);
                                                previousEnd = recentStart;
                                            } else {
                                                // TUDO: Últimos 30 dias vs 30 dias anteriores
                                                periodDays = 30;
                                                recentStart = subtractDays(now, periodDays);
                                                recentEnd = now;

                                                previousStart = subtractDays(now, periodDays * 2);
                                                previousEnd = recentStart;
                                            }

                                            // Filter data for both periods
                                            const recentConsumptions = consumptions.filter(c => {
                                                const d = new Date(c.timestamp);
                                                return d >= recentStart && d <= recentEnd;
                                            });
                                            const previousConsumptions = consumptions.filter(c => {
                                                const d = new Date(c.timestamp);
                                                return d >= previousStart && d <= previousEnd;
                                            });

                                            const recentWellbeing = wellbeingLogs.filter(w => {
                                                const d = new Date(w.timestamp);
                                                return d >= recentStart && d <= recentEnd;
                                            });
                                            const previousWellbeing = wellbeingLogs.filter(w => {
                                                const d = new Date(w.timestamp);
                                                return d >= previousStart && d <= previousEnd;
                                            });

                                            const recentCycles = cycles.filter(c => {
                                                const d = new Date(c.timestamp);
                                                return d >= recentStart && d <= recentEnd;
                                            });
                                            const previousCycles = cycles.filter(c => {
                                                const d = new Date(c.timestamp);
                                                return d >= previousStart && d <= previousEnd;
                                            });

                                            // Helper to calculate change percentage and direction
                                            const calculateChange = (recent, previous, lowerIsBetter = true) => {
                                                // Se ambos são 0, não há mudança
                                                if (previous === 0 && recent === 0) return { percent: 0, direction: 'stable', isImprovement: false };

                                                // Se previous é 0 mas há dados recentes, tratar como dados novos
                                                if (previous === 0 && recent > 0) {
                                                    // Não podemos calcular % de mudança, mas consideramos como "up" (começou a registar)
                                                    return { percent: 100, direction: 'up', isImprovement: false, rawChange: recent, isNew: true };
                                                }

                                                // Se previous > 0 mas recent é 0, tudo parou
                                                if (previous > 0 && recent === 0) {
                                                    return { percent: 100, direction: 'down', isImprovement: lowerIsBetter, rawChange: -previous };
                                                }

                                                // Caso normal: ambos têm valores
                                                const change = ((recent - previous) / previous) * 100;
                                                const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
                                                const isImprovement = lowerIsBetter ? change < 0 : change > 0;
                                                return { percent: Math.abs(change), direction, isImprovement, rawChange: change };
                                            };

                                            const progressData = {};

                                            // 1. CONSUMO - Frequência
                                            if (recentConsumptions.length > 0 || previousConsumptions.length > 0) {
                                                // Group by date to get daily frequency
                                                const recentByDate = {};
                                                recentConsumptions.forEach(c => { recentByDate[c.date] = (recentByDate[c.date] || 0) + 1; });
                                                const previousByDate = {};
                                                previousConsumptions.forEach(c => { previousByDate[c.date] = (previousByDate[c.date] || 0) + 1; });

                                                const recentAvgFreq = Object.keys(recentByDate).length > 0 ? recentConsumptions.length / Object.keys(recentByDate).length : 0;
                                                const previousAvgFreq = Object.keys(previousByDate).length > 0 ? previousConsumptions.length / Object.keys(previousByDate).length : 0;

                                                progressData.frequency = {
                                                    recent: recentAvgFreq,
                                                    previous: previousAvgFreq,
                                                    change: calculateChange(recentAvgFreq, previousAvgFreq, true),
                                                    label: t('patterns.progress.freqLabel')
                                                };
                                            }

                                            // 2. CONSUMO - Dosagem (from cycles and dailyLogs)
                                            // Helper para extrair dosagem de cycles + dailyLogs por data
                                            const getMgForDate = (date, cyclesData, dailyLogsData) => {
                                                // Primeiro tenta buscar nos cycles
                                                const cycle = cyclesData.find(c => {
                                                    const cycleDate = getDateKeyFromItem(c);
                                                    return cycleDate === date && c.mg !== undefined && c.mg !== '';
                                                });
                                                if (cycle) {
                                                    const mgValue = typeof cycle.mg === 'number' ? cycle.mg : parseFloat(cycle.mg);
                                                    if (!isNaN(mgValue) && mgValue > 0) {
                                                        return mgValue;
                                                    }
                                                }

                                                // Fallback: somar todos os dailyLogs desse dia
                                                const logsForDate = dailyLogsData.filter(l => l.date === date && l.mg != null);
                                                if (logsForDate.length > 0) {
                                                    const total = logsForDate.reduce((sum, l) => {
                                                        const v = typeof l.mg === 'number' ? l.mg : parseFloat(l.mg);
                                                        return sum + (isNaN(v) ? 0 : v);
                                                    }, 0);
                                                    return total;
                                                }

                                                return null;
                                            };

                                            // Filtrar cycles por período
                                            const recentCyclesForDosage = cycles.filter(c => {
                                                const d = new Date(c.timestamp);
                                                return d >= recentStart && d <= recentEnd;
                                            });
                                            const previousCyclesForDosage = cycles.filter(c => {
                                                const d = new Date(c.timestamp);
                                                return d >= previousStart && d < previousEnd;
                                            });

                                            // Filtrar dailyLogs por período
                                            const recentDailyLogs = dailyLogs.filter(d => {
                                                const date = new Date(d.date);
                                                return date >= recentStart && date <= recentEnd;
                                            });
                                            const previousDailyLogs = dailyLogs.filter(d => {
                                                const date = new Date(d.date);
                                                return date >= previousStart && date <= previousEnd;
                                            });

                                            // Obter todas as datas únicas dos períodos
                                            const recentDates = new Set([
                                                ...recentCyclesForDosage.map(c => getDateKeyFromItem(c)),
                                                ...recentDailyLogs.map(d => d.date)
                                            ]);
                                            const previousDates = new Set([
                                                ...previousCyclesForDosage.map(c => getDateKeyFromItem(c)),
                                                ...previousDailyLogs.map(d => d.date)
                                            ]);

                                            // Coletar valores de dosagem
                                            const recentMgValues = [];
                                            recentDates.forEach(date => {
                                                const mg = getMgForDate(date, recentCyclesForDosage, recentDailyLogs);
                                                if (mg !== null) recentMgValues.push(mg);
                                            });

                                            const previousMgValues = [];
                                            previousDates.forEach(date => {
                                                const mg = getMgForDate(date, previousCyclesForDosage, previousDailyLogs);
                                                if (mg !== null) previousMgValues.push(mg);
                                            });

                                            if (recentMgValues.length > 0 || previousMgValues.length > 0) {
                                                const recentAvgDosage = recentMgValues.length > 0
                                                    ? recentMgValues.reduce((sum, mg) => sum + mg, 0) / recentMgValues.length
                                                    : 0;
                                                const previousAvgDosage = previousMgValues.length > 0
                                                    ? previousMgValues.reduce((sum, mg) => sum + mg, 0) / previousMgValues.length
                                                    : 0;

                                                progressData.dosage = {
                                                    recent: recentAvgDosage,
                                                    previous: previousAvgDosage,
                                                    change: calculateChange(recentAvgDosage, previousAvgDosage, true),
                                                    label: t('patterns.progress.dosageLabel')
                                                };
                                            }

                                            // 3. BEM-ESTAR - Sono (from cycles and wellbeingLogs)
                                            // Helper para extrair sono de cycles + wellbeingLogs por data
                                            const getSleepForDate = (date, cyclesData, wellbeingData) => {
                                                let nightSleep = null;
                                                // Primeiro tenta buscar nos cycles
                                                const cycle = cyclesData.find(c => {
                                                    const cycleDate = getDateKeyFromItem(c);
                                                    return cycleDate === date && c.sleep !== undefined && c.sleep !== '';
                                                });
                                                if (cycle) {
                                                    const sleepValue = typeof cycle.sleep === 'number' ? cycle.sleep : parseFloat(cycle.sleep);
                                                    if (!isNaN(sleepValue) && sleepValue > 0) nightSleep = sleepValue;
                                                }

                                                // Fallback: buscar nos wellbeingLogs (campo legado)
                                                if (nightSleep === null) {
                                                    const wellbeing = wellbeingData.find(w => {
                                                        const wDate = getDateKeyFromItem(w);
                                                        return wDate === date && w.sleep !== undefined && !isNaN(parseFloat(w.sleep));
                                                    });
                                                    if (wellbeing) {
                                                        const sleepValue = typeof wellbeing.sleep === 'number' ? wellbeing.sleep : parseFloat(wellbeing.sleep);
                                                        if (!isNaN(sleepValue) && sleepValue > 0) nightSleep = sleepValue;
                                                    }
                                                }

                                                // Adicionar horas de sesta deste dia
                                                const napMins = wellbeingData
                                                    .filter(w => getDateKeyFromItem(w) === date && w.napDuration > 0)
                                                    .reduce((sum, w) => sum + (w.napDuration || 0), 0);
                                                const napHours = napMins / 60;

                                                if (nightSleep !== null) return nightSleep + napHours;
                                                if (napHours > 0) return napHours;
                                                return null;
                                            };

                                            // Obter todas as datas únicas dos períodos para sono
                                            const recentSleepDates = new Set([
                                                ...recentCyclesForDosage.map(c => getDateKeyFromItem(c)),
                                                ...recentWellbeing.map(w => getDateKeyFromItem(w))
                                            ]);
                                            const previousSleepDates = new Set([
                                                ...previousCyclesForDosage.map(c => getDateKeyFromItem(c)),
                                                ...previousWellbeing.map(w => getDateKeyFromItem(w))
                                            ]);

                                            // Coletar valores de sono
                                            const recentSleepValues = [];
                                            recentSleepDates.forEach(date => {
                                                const sleep = getSleepForDate(date, recentCyclesForDosage, recentWellbeing);
                                                if (sleep !== null) recentSleepValues.push(sleep);
                                            });

                                            const previousSleepValues = [];
                                            previousSleepDates.forEach(date => {
                                                const sleep = getSleepForDate(date, previousCyclesForDosage, previousWellbeing);
                                                if (sleep !== null) previousSleepValues.push(sleep);
                                            });

                                            if (recentSleepValues.length > 0 || previousSleepValues.length > 0) {
                                                const recentAvgSleep = recentSleepValues.length > 0
                                                    ? recentSleepValues.reduce((sum, sleep) => sum + sleep, 0) / recentSleepValues.length
                                                    : 0;
                                                const previousAvgSleep = previousSleepValues.length > 0
                                                    ? previousSleepValues.reduce((sum, sleep) => sum + sleep, 0) / previousSleepValues.length
                                                    : 0;

                                                progressData.sleep = {
                                                    recent: recentAvgSleep,
                                                    previous: previousAvgSleep,
                                                    change: calculateChange(recentAvgSleep, previousAvgSleep, false), // Higher sleep is better
                                                    label: t('patterns.progress.sleepLabel')
                                                };
                                            }

                                            // 4. BEM-ESTAR - Humor
                                            const recentMoodLogs = recentWellbeing.filter(w => w.mood !== undefined && w.mood !== null && w.mood !== '' && !isNaN(parseInt(w.mood)));
                                            const previousMoodLogs = previousWellbeing.filter(w => w.mood !== undefined && w.mood !== null && w.mood !== '' && !isNaN(parseInt(w.mood)));

                                            if (recentMoodLogs.length > 0 || previousMoodLogs.length > 0) {
                                                const recentAvgMood = recentMoodLogs.length > 0
                                                    ? recentMoodLogs.reduce((sum, w) => sum + parseInt(w.mood), 0) / recentMoodLogs.length
                                                    : 0;
                                                const previousAvgMood = previousMoodLogs.length > 0
                                                    ? previousMoodLogs.reduce((sum, w) => sum + parseInt(w.mood), 0) / previousMoodLogs.length
                                                    : 0;

                                                progressData.mood = {
                                                    recent: recentAvgMood,
                                                    previous: previousAvgMood,
                                                    change: calculateChange(recentAvgMood, previousAvgMood, false), // Higher mood is better
                                                    label: t('patterns.progress.moodLabel')
                                                };
                                            }

                                            // 5. BEM-ESTAR - Energia
                                            const recentEnergyLogs = recentWellbeing.filter(w => w.energy !== undefined && w.energy !== null && w.energy !== '' && !isNaN(parseInt(w.energy)));
                                            const previousEnergyLogs = previousWellbeing.filter(w => w.energy !== undefined && w.energy !== null && w.energy !== '' && !isNaN(parseInt(w.energy)));

                                            if (recentEnergyLogs.length > 0 || previousEnergyLogs.length > 0) {
                                                const recentAvgEnergy = recentEnergyLogs.length > 0
                                                    ? recentEnergyLogs.reduce((sum, w) => sum + parseInt(w.energy), 0) / recentEnergyLogs.length
                                                    : 0;
                                                const previousAvgEnergy = previousEnergyLogs.length > 0
                                                    ? previousEnergyLogs.reduce((sum, w) => sum + parseInt(w.energy), 0) / previousEnergyLogs.length
                                                    : 0;

                                                progressData.energy = {
                                                    recent: recentAvgEnergy,
                                                    previous: previousAvgEnergy,
                                                    change: calculateChange(recentAvgEnergy, previousAvgEnergy, false), // Higher energy is better
                                                    label: t('patterns.progress.energyLabel')
                                                };
                                            }

                                            // 6. CICLOS - Consistência da hora de deitar + Média
                                            if (recentCycles.length > 0 || previousCycles.length > 0) {
                                                const getBedtimeMinutes = (bedtime) => {
                                                    const [hours, minutes] = bedtime.split(':').map(Number);
                                                    // Ajustar madrugada/tarde (00:00-17:59) para 24:00-41:59
                                                    // Cobre casos de sono irregular (deitar de madrugada ou durante o dia)
                                                    if (hours >= 0 && hours < 18) {
                                                        return (hours + 24) * 60 + minutes;
                                                    }
                                                    return hours * 60 + minutes;
                                                };

                                                const minutesToTime = (mins) => {
                                                    const adjustedMins = mins >= 1440 ? mins - 1440 : mins; // Convert back from 24h+ to 0-23h
                                                    const h = Math.floor(adjustedMins / 60);
                                                    const m = Math.round(adjustedMins % 60);
                                                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                                };

                                                const recentBedtimes = recentCycles.filter(c => c.bedtime).map(c => getBedtimeMinutes(c.bedtime));
                                                const previousBedtimes = previousCycles.filter(c => c.bedtime).map(c => getBedtimeMinutes(c.bedtime));

                                                if (recentBedtimes.length > 0 || previousBedtimes.length > 0) {
                                                    // Calculate standard deviation (lower is better = more consistent)
                                                    const getStdDev = (arr) => {
                                                        if (arr.length === 0) return 0;
                                                        const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
                                                        const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
                                                        return Math.sqrt(variance);
                                                    };

                                                    const recentStdDev = getStdDev(recentBedtimes);
                                                    const previousStdDev = getStdDev(previousBedtimes);

                                                    progressData.bedtimeConsistency = {
                                                        recent: recentStdDev,
                                                        previous: previousStdDev,
                                                        change: calculateChange(recentStdDev, previousStdDev, true), // Lower std dev is better
                                                        label: t('patterns.progress.bedtimeConsistLabel')
                                                    };

                                                    // Calculate average bedtime
                                                    const recentAvgBedtime = recentBedtimes.length > 0
                                                        ? recentBedtimes.reduce((sum, v) => sum + v, 0) / recentBedtimes.length
                                                        : 0;
                                                    const previousAvgBedtime = previousBedtimes.length > 0
                                                        ? previousBedtimes.reduce((sum, v) => sum + v, 0) / previousBedtimes.length
                                                        : 0;

                                                    progressData.avgBedtime = {
                                                        recent: recentAvgBedtime,
                                                        previous: previousAvgBedtime,
                                                        recentTime: minutesToTime(recentAvgBedtime),
                                                        previousTime: minutesToTime(previousAvgBedtime),
                                                        // Earlier bedtime is generally better (but depends on sleep quality)
                                                        change: calculateChange(recentAvgBedtime, previousAvgBedtime, true),
                                                        label: t('patterns.progress.avgBedtimeLabel')
                                                    };
                                                }
                                            }

                                            // 7. AUTOCUIDADO - Análise detalhada por área
                                            const recentSelfCareActivities = recentCycles.flatMap(c => c.selfCareActivities || []);
                                            const previousSelfCareActivities = previousCycles.flatMap(c => c.selfCareActivities || []);

                                            if (recentSelfCareActivities.length > 0 || previousSelfCareActivities.length > 0) {
                                                const recentAvgSelfCare = recentCycles.length > 0 ? recentSelfCareActivities.length / recentCycles.length : 0;
                                                const previousAvgSelfCare = previousCycles.length > 0 ? previousSelfCareActivities.length / previousCycles.length : 0;

                                                progressData.selfCare = {
                                                    recent: recentAvgSelfCare,
                                                    previous: previousAvgSelfCare,
                                                    change: calculateChange(recentAvgSelfCare, previousAvgSelfCare, false), // More is better
                                                    label: t('patterns.progress.selfCareLabel')
                                                };
                                            }

                                            // AUTOCUIDADO - Análise por área (water, rest, social, food)
                                            if (recentWellbeing.length > 0) {
                                                const areas = {
                                                    water: { name: t('patterns.areas.water'), emoji: '💧' },
                                                    food: { name: t('patterns.areas.food'), emoji: '🍎' },
                                                    rest: { name: t('patterns.areas.rest'), emoji: '🏃' },
                                                    social: { name: t('patterns.areas.social'), emoji: '👥' }
                                                };

                                                const recentAreaStats = {};
                                                const previousAreaStats = {};

                                                // Agrupar wellbeing por data (1 data = 1 ciclo aprox)
                                                const recentDates = new Set(recentWellbeing.map(w => w.date));
                                                const previousDates = new Set(previousWellbeing.map(w => w.date));

                                                const isAreaActive = (w, area) => {
                                                    if (area === 'water') return w.water === true || (w.waterGlasses > 0);
                                                    if (area === 'rest') return w.rest === true || (w.exercise && w.exercise.trim() !== '') || !!w.exerciseType || (w.exerciseDuration > 0);
                                                    return w[area] === true;
                                                };
                                                Object.keys(areas).forEach(area => {
                                                    // Para cada ciclo (data), verificar se ALGUM registo tem area activa
                                                    const recentCyclesWithArea = Array.from(recentDates).filter(date => {
                                                        return recentWellbeing.some(w => w.date === date && isAreaActive(w, area));
                                                    }).length;

                                                    const previousCyclesWithArea = Array.from(previousDates).filter(date => {
                                                        return previousWellbeing.some(w => w.date === date && isAreaActive(w, area));
                                                    }).length;

                                                    const recentPercent = recentDates.size > 0 ? (recentCyclesWithArea / recentDates.size) * 100 : 0;
                                                    const previousPercent = previousDates.size > 0 ? (previousCyclesWithArea / previousDates.size) * 100 : 0;

                                                    recentAreaStats[area] = recentPercent;
                                                    previousAreaStats[area] = previousPercent;
                                                });

                                                // Calculate overall completion rate (média dos indicadores)
                                                const recentOverall = Object.values(recentAreaStats).reduce((sum, v) => sum + v, 0) / 4;
                                                const previousOverall = Object.values(previousAreaStats).reduce((sum, v) => sum + v, 0) / 4;

                                                // Calculate complete cycles (ciclos onde completaste os 4 indicadores)
                                                const recentCompleteCycles = Array.from(recentDates).filter(date => {
                                                    return Object.keys(areas).every(area => {
                                                        return recentWellbeing.some(w => w.date === date && isAreaActive(w, area));
                                                    });
                                                }).length;

                                                const previousCompleteCycles = Array.from(previousDates).filter(date => {
                                                    return Object.keys(areas).every(area => {
                                                        return previousWellbeing.some(w => w.date === date && isAreaActive(w, area));
                                                    });
                                                }).length;

                                                const recentCompleteCyclesPercent = recentDates.size > 0 ? (recentCompleteCycles / recentDates.size) * 100 : 0;
                                                const previousCompleteCyclesPercent = previousDates.size > 0 ? (previousCompleteCycles / previousDates.size) * 100 : 0;

                                                // Identify low areas (< 50%)
                                                const lowAreas = Object.entries(recentAreaStats)
                                                    .filter(([_, percent]) => percent < 50)
                                                    .map(([area, percent]) => ({ area, percent, ...areas[area] }))
                                                    .sort((a, b) => a.percent - b.percent);

                                                // Generate suggestions
                                                let suggestion = '';
                                                if (lowAreas.length >= 3) {
                                                    // Mencionar as 2 áreas MAIS BAIXAS
                                                    suggestion = i18n.language === 'en' ? `Below 50% in several areas. Small daily habits make a difference - start with ${lowAreas[0].name.toLowerCase()} and ${lowAreas[1].name.toLowerCase()}.` : `Abaixo de 50% em várias áreas. Pequenos hábitos diários fazem diferença - começa por ${lowAreas[0].name.toLowerCase()} e ${lowAreas[1].name.toLowerCase()}.`;
                                                } else if (lowAreas.length === 2) {
                                                    suggestion = i18n.language === 'en' ? `Focus on ${lowAreas[0].name.toLowerCase()} and ${lowAreas[1].name.toLowerCase()}. Simple routines can help!` : `Atenção a ${lowAreas[0].name.toLowerCase()} e ${lowAreas[1].name.toLowerCase()}. Criar rotinas simples pode ajudar!`;
                                                } else if (lowAreas.length === 1) {
                                                    suggestion = i18n.language === 'en' ? `Focus on improving ${lowAreas[0].name.toLowerCase()} - small steps count!` : `Foca em melhorar ${lowAreas[0].name.toLowerCase()} - pequenos passos contam!`;
                                                } else {
                                                    suggestion = i18n.language === 'en' ? `Excellent! You're maintaining good self-care habits in all areas (≥50%).` : `Excelente! Estás a manter bons hábitos de autocuidado em todas as áreas (≥50%).`;
                                                }

                                                progressData.selfCareDetailed = {
                                                    recentOverall,
                                                    previousOverall,
                                                    areas: recentAreaStats,
                                                    previousAreas: previousAreaStats,
                                                    lowAreas,
                                                    suggestion,
                                                    change: calculateChange(recentOverall, previousOverall, false),
                                                    label: t('patterns.progress.selfCareOverallLabel'),
                                                    // Ciclos completos (onde completaste os 4 indicadores)
                                                    completeCycles: {
                                                        recent: recentCompleteCyclesPercent,
                                                        previous: previousCompleteCyclesPercent,
                                                        recentCount: recentCompleteCycles,
                                                        recentTotal: recentDates.size,
                                                        previousCount: previousCompleteCycles,
                                                        previousTotal: previousDates.size,
                                                        change: calculateChange(recentCompleteCyclesPercent, previousCompleteCyclesPercent, false)
                                                    }
                                                };
                                            }

                                            // 8. EMOÇÕES E TRIGGERS
                                            const recentEmotions = recentWellbeing.flatMap(w => w.emotions || []);
                                            const previousEmotions = previousWellbeing.flatMap(w => w.emotions || []);
                                            const recentTriggers = recentCycles.flatMap(c => c.triggers || []);
                                            const previousTriggers = previousCycles.flatMap(c => c.triggers || []);

                                            // Count emotions by category (usando getEmotionCategory)
                                            const recentNegativeCount = recentEmotions.filter(e => getEmotionCategory(e) === 'negative').length;
                                            const previousNegativeCount = previousEmotions.filter(e => getEmotionCategory(e) === 'negative').length;
                                            const recentPositiveCount = recentEmotions.filter(e => getEmotionCategory(e) === 'positive').length;
                                            const previousPositiveCount = previousEmotions.filter(e => getEmotionCategory(e) === 'positive').length;

                                            // Top 3 emoções mais frequentes (período recente)
                                            const emotionFreq = {};
                                            recentEmotions.forEach(e => {
                                                emotionFreq[e] = (emotionFreq[e] || 0) + 1;
                                            });
                                            const topEmotions = Object.entries(emotionFreq)
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 3)
                                                .map(([emotion, count]) => ({
                                                    emotion,
                                                    count,
                                                    category: getEmotionCategory(emotion)
                                                }));

                                            // Só mostrar emoções negativas se houver pelo menos uma emoção negativa registada
                                            if (recentNegativeCount > 0 || previousNegativeCount > 0) {
                                                const recentNegativePercent = recentEmotions.length > 0 ? (recentNegativeCount / recentEmotions.length) * 100 : 0;
                                                const previousNegativePercent = previousEmotions.length > 0 ? (previousNegativeCount / previousEmotions.length) * 100 : 0;

                                                progressData.negativeEmotions = {
                                                    recent: recentNegativePercent,
                                                    previous: previousNegativePercent,
                                                    change: calculateChange(recentNegativePercent, previousNegativePercent, true), // Lower is better
                                                    label: t('patterns.progress.negEmotionsLabel'),
                                                    recentCount: recentNegativeCount,
                                                    recentTotal: recentEmotions.length,
                                                    previousCount: previousNegativeCount,
                                                    previousTotal: previousEmotions.length
                                                };
                                            }

                                            // Emoções positivas
                                            if (recentPositiveCount > 0 || previousPositiveCount > 0) {
                                                const recentPositivePercent = recentEmotions.length > 0 ? (recentPositiveCount / recentEmotions.length) * 100 : 0;
                                                const previousPositivePercent = previousEmotions.length > 0 ? (previousPositiveCount / previousEmotions.length) * 100 : 0;

                                                progressData.positiveEmotions = {
                                                    recent: recentPositivePercent,
                                                    previous: previousPositivePercent,
                                                    change: calculateChange(recentPositivePercent, previousPositivePercent, false), // Higher is better
                                                    label: t('patterns.progress.posEmotionsLabel'),
                                                    recentCount: recentPositiveCount,
                                                    recentTotal: recentEmotions.length,
                                                    previousCount: previousPositiveCount,
                                                    previousTotal: previousEmotions.length
                                                };
                                            }

                                            // Top emoções
                                            if (topEmotions.length > 0) {
                                                progressData.topEmotions = topEmotions;
                                            }

                                            // Calculate overall progress score (0-100)
                                            // Excluir métricas com isNew (dados novos sem comparação válida)
                                            const scorableMetrics = Object.values(progressData).filter(m => m.change && m.change.direction !== 'stable' && !m.change.isNew);
                                            const improvements = scorableMetrics.filter(m => m.change.isImprovement).length;
                                            const total = scorableMetrics.length;
                                            const progressScore = total > 0 ? Math.round((improvements / total) * 100) : 50;

                                            return (
                                                <div className="space-y-4">
                                                    {atypicalBanner}
                                                    {/* Period comparison header */}
                                                    <div className={'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700/50' + ' rounded-xl p-6 border'}>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className={'text-xl font-bold ' + ('text-white')}>
                                                                {t('patterns.progress.title')}
                                                            </h3>
                                                            <div className={'text-4xl font-black ' + (progressScore >= 70 ? 'text-green-400' : progressScore >= 40 ? 'text-yellow-400' : 'text-orange-400')}>
                                                                {progressScore}%
                                                            </div>
                                                        </div>
                                                        <p className={'text-sm mb-3 ' + ('text-gray-300')}>
                                                            {patternsPeriod === 'hoje' ? t('patterns.progress.comparisons.hoje') :
                                                             patternsPeriod === 'semana' ? t('patterns.progress.comparisons.semana') :
                                                             patternsPeriod === 'mes' ? t('patterns.progress.comparisons.mes') :
                                                             t('patterns.progress.comparisons.tudo', { days: periodDays })}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <div className={'flex-1 h-3 rounded-full overflow-hidden ' + ('bg-gray-700')}>
                                                                <div className={'h-full transition-all duration-500 ' + (progressScore >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : progressScore >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-orange-500 to-red-500')} style={{width: progressScore + '%'}}></div>
                                                            </div>
                                                            <span className={'text-xs font-medium ' + ('text-gray-400')}>
                                                                {t('patterns.progress.metricsImproving', { count: improvements, total: total })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Consumption metrics */}
                                                    {(progressData.frequency || progressData.dosage) && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                {t('patterns.progress.consumption')}
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.frequency && (
                                                                    <div className={('bg-gray-700/30 border-gray-600') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + ('text-gray-300')}>
                                                                                {progressData.frequency.label}
                                                                            </span>
                                                                            {progressData.frequency.recent !== progressData.frequency.previous && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (
                                                                                    progressData.frequency.change.direction !== 'stable'
                                                                                        ? (progressData.frequency.change.isImprovement ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')
                                                                                        : 'bg-gray-700/30 text-gray-400'
                                                                                )}>
                                                                                    {progressData.frequency.recent > progressData.frequency.previous ? '↑' : '↓'} {progressData.frequency.change.percent.toFixed(1)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + 'text-white'}>
                                                                                {progressData.frequency.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + ('text-gray-400')}>
                                                                                {t('patterns.progress.usesPerDay')}
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + 'text-gray-500'}>
                                                                                {t('patterns.progress.before')} {progressData.frequency.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.dosage && (
                                                                    <div className={('bg-gray-700/30 border-gray-600') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + ('text-gray-300')}>
                                                                                {progressData.dosage.label}
                                                                            </span>
                                                                            {progressData.dosage.recent !== progressData.dosage.previous && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (
                                                                                    progressData.dosage.change.direction !== 'stable'
                                                                                        ? (progressData.dosage.change.isImprovement ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')
                                                                                        : 'bg-gray-700/30 text-gray-400'
                                                                                )}>
                                                                                    {progressData.dosage.recent > progressData.dosage.previous ? '↑' : '↓'} {progressData.dosage.change.percent.toFixed(1)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + 'text-white'}>
                                                                                {progressData.dosage.recent.toFixed(0)}
                                                                            </span>
                                                                            <span className={'text-sm ' + ('text-gray-400')}>
                                                                                mg/dia
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + 'text-gray-500'}>
                                                                                {t('patterns.progress.before')} {progressData.dosage.previous.toFixed(0)} mg
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Wellbeing metrics */}
                                                    {(progressData.sleep || progressData.mood || progressData.energy) && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                {t('patterns.progress.wellbeing')}
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.sleep && (
                                                                    <div className={('bg-gray-700/30 border-gray-600') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + ('text-gray-300')}>
                                                                                {progressData.sleep.label}
                                                                            </span>
                                                                            {progressData.sleep.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.sleep.change.isImprovement ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}>
                                                                                    {progressData.sleep.change.direction === 'up' ? '↑' : '↓'} {progressData.sleep.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + 'text-white'}>
                                                                                {progressData.sleep.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + ('text-gray-400')}>
                                                                                {t('patterns.progress.hours')}
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + 'text-gray-500'}>
                                                                                {t('patterns.progress.before')} {progressData.sleep.previous.toFixed(1)}h
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.mood && (
                                                                    <div className={('bg-gray-700/30 border-gray-600') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + ('text-gray-300')}>
                                                                                {progressData.mood.label}
                                                                            </span>
                                                                            {progressData.mood.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.mood.change.isImprovement ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}>
                                                                                    {progressData.mood.change.direction === 'up' ? '↑' : '↓'} {progressData.mood.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + 'text-white'}>
                                                                                {progressData.mood.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + ('text-gray-400')}>
                                                                                /10
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + 'text-gray-500'}>
                                                                                {t('patterns.progress.before')} {progressData.mood.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.energy && (
                                                                    <div className={('bg-gray-700/30 border-gray-600') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + ('text-gray-300')}>
                                                                                {progressData.energy.label}
                                                                            </span>
                                                                            {progressData.energy.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.energy.change.isImprovement ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}>
                                                                                    {progressData.energy.change.direction === 'up' ? '↑' : '↓'} {progressData.energy.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + 'text-white'}>
                                                                                {progressData.energy.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + ('text-gray-400')}>
                                                                                /10
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + 'text-gray-500'}>
                                                                                {t('patterns.progress.before')} {progressData.energy.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Lifestyle metrics */}
                                                    {(progressData.bedtimeConsistency || progressData.selfCare) && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                {t('patterns.progress.routines')}
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.bedtimeConsistency && (
                                                                    <div className={('bg-gray-700/30 border-gray-600') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + ('text-gray-300')}>
                                                                                {progressData.bedtimeConsistency.label}
                                                                            </span>
                                                                            {progressData.bedtimeConsistency.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.bedtimeConsistency.change.isImprovement ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}>
                                                                                    {progressData.bedtimeConsistency.change.isImprovement ? '↓' : '↑'} {progressData.bedtimeConsistency.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2 mb-2">
                                                                            <span className={'text-2xl font-bold ' + 'text-white'}>
                                                                                {progressData.bedtimeConsistency.recent < 30 ? t('patterns.progress.bedtimeConsist.veryConsistent') : progressData.bedtimeConsistency.recent < 60 ? t('patterns.progress.bedtimeConsist.consistent') : t('patterns.progress.bedtimeConsist.variable')}
                                                                            </span>
                                                                            <span className={'text-xs ml-auto ' + 'text-gray-500'}>
                                                                                {t('patterns.progress.bedtimeConsist.variation', { val: (progressData.bedtimeConsistency.recent / 60).toFixed(0) })}
                                                                            </span>
                                                                        </div>
                                                                        <div className={'bg-gray-800/50' + ' rounded px-3 py-2'}>
                                                                            <p className={'text-xs italic ' + ('text-gray-400')}>
                                                                                {progressData.bedtimeConsistency.recent < 30
                                                                                    ? t('patterns.progress.bedtimeConsist.msgVeryConsistent')
                                                                                    : progressData.bedtimeConsistency.recent < 60
                                                                                    ? t('patterns.progress.bedtimeConsist.msgConsistent', { val: (progressData.bedtimeConsistency.recent / 60).toFixed(1) })
                                                                                    : t('patterns.progress.bedtimeConsist.msgVariable', { val: (progressData.bedtimeConsistency.recent / 60).toFixed(1) })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.avgBedtime && (
                                                                    <div className={('bg-gray-700/30 border-gray-600') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + ('text-gray-300')}>
                                                                                {progressData.avgBedtime.label}
                                                                            </span>
                                                                            {progressData.avgBedtime.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.avgBedtime.change.isImprovement ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}>
                                                                                    {progressData.avgBedtime.change.direction === 'up' ? t('patterns.progress.avgBedtime.later') : t('patterns.progress.avgBedtime.earlier')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + 'text-white'}>
                                                                                {progressData.avgBedtime.recentTime}
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + 'text-gray-500'}>
                                                                                {t('patterns.progress.avgBedtime.wasBefore', { time: progressData.avgBedtime.previousTime })}
                                                                            </span>
                                                                        </div>
                                                                        {(() => {
                                                                            const hour = parseInt(progressData.avgBedtime.recentTime.split(':')[0]);
                                                                            let feedback = '';
                                                                            if (hour >= 0 && hour < 6) {
                                                                                feedback = t('patterns.progress.avgBedtime.lateNight');
                                                                            } else if (hour >= 22 && hour < 24) {
                                                                                feedback = t('patterns.progress.avgBedtime.goodWindow');
                                                                            } else if (hour >= 6 && hour < 12) {
                                                                                feedback = t('patterns.progress.avgBedtime.morning');
                                                                            }
                                                                            return feedback ? (
                                                                                <div className={'text-xs mt-2 ' + ('text-gray-400')}>
                                                                                    {feedback}
                                                                                </div>
                                                                            ) : null;
                                                                        })()}
                                                                    </div>
                                                                )}
                                                                {progressData.selfCare && (
                                                                    <div className={('bg-gray-700/30 border-gray-600') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + ('text-gray-300')}>
                                                                                {progressData.selfCare.label}
                                                                            </span>
                                                                            {progressData.selfCare.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.selfCare.change.isImprovement ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')}>
                                                                                    {progressData.selfCare.change.direction === 'up' ? '↑' : '↓'} {progressData.selfCare.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + 'text-white'}>
                                                                                {progressData.selfCare.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + ('text-gray-400')}>
                                                                                {t('patterns.progress.activitiesPerCycle')}
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + 'text-gray-500'}>
                                                                                {t('patterns.progress.before')} {progressData.selfCare.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Emotional metrics */}
                                                    {(progressData.negativeEmotions || progressData.positiveEmotions || progressData.topEmotions) && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                {t('patterns.progress.emotional')}
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.negativeEmotions && (
                                                                    <div className={'bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-700/50' + ' rounded-lg p-3 border'}>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-lg">😔</span>
                                                                            <span className={'text-xs font-semibold uppercase tracking-wide ' + 'text-purple-400'}>
                                                                                {t('patterns.progress.negEmotions')}
                                                                            </span>
                                                                            {progressData.negativeEmotions.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-0.5 rounded-full font-bold ml-auto ' + (progressData.negativeEmotions.change.isImprovement ? ('bg-green-900/50 text-green-300 border border-green-700') : ('bg-red-900/50 text-red-300 border border-red-700'))}>
                                                                                    {progressData.negativeEmotions.change.direction === 'up' ? '↑' : '↓'}{progressData.negativeEmotions.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <div className="flex items-baseline gap-1">
                                                                                    <span className={'text-3xl font-black ' + 'text-purple-400'}>
                                                                                        {progressData.negativeEmotions.recent.toFixed(0)}%
                                                                                    </span>
                                                                                    <span className={'text-xs font-medium ' + 'text-purple-300/70'}>
                                                                                        {t('patterns.progress.ofTotal')}
                                                                                    </span>
                                                                                </div>
                                                                                <div className={'text-xs mt-1 ' + 'text-purple-400/60'}>
                                                                                    {t('patterns.progress.ofEmotions', { count: progressData.negativeEmotions.recentCount, total: progressData.negativeEmotions.recentTotal })}
                                                                                </div>
                                                                            </div>
                                                                            <div className={'text-xs px-2 py-1 rounded ' + 'bg-gray-800/50 text-gray-400'}>
                                                                                {t('patterns.progress.wasPercent', { val: progressData.negativeEmotions.previous.toFixed(0) })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.positiveEmotions && (
                                                                    <div className={'bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-700/50' + ' rounded-lg p-3 border'}>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-lg">😊</span>
                                                                            <span className={'text-xs font-semibold uppercase tracking-wide ' + 'text-green-400'}>
                                                                                {t('patterns.progress.posEmotions')}
                                                                            </span>
                                                                            {progressData.positiveEmotions.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-0.5 rounded-full font-bold ml-auto ' + (progressData.positiveEmotions.change.isImprovement ? ('bg-green-900/50 text-green-300 border border-green-700') : ('bg-red-900/50 text-red-300 border border-red-700'))}>
                                                                                    {progressData.positiveEmotions.change.direction === 'up' ? '↑' : '↓'}{progressData.positiveEmotions.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <div className="flex items-baseline gap-1">
                                                                                    <span className={'text-3xl font-black ' + 'text-green-400'}>
                                                                                        {progressData.positiveEmotions.recent.toFixed(0)}%
                                                                                    </span>
                                                                                    <span className={'text-xs font-medium ' + 'text-green-300/70'}>
                                                                                        {t('patterns.progress.ofTotal')}
                                                                                    </span>
                                                                                </div>
                                                                                <div className={'text-xs mt-1 ' + 'text-green-400/60'}>
                                                                                    {t('patterns.progress.ofEmotions', { count: progressData.positiveEmotions.recentCount, total: progressData.positiveEmotions.recentTotal })}
                                                                                </div>
                                                                            </div>
                                                                            <div className={'text-xs px-2 py-1 rounded ' + 'bg-gray-800/50 text-gray-400'}>
                                                                                {t('patterns.progress.wasPercent', { val: progressData.positiveEmotions.previous.toFixed(0) })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.topEmotions && (
                                                                    <div className={'bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-700/50' + ' rounded-lg p-3 border'}>
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <span className="text-lg">🌟</span>
                                                                            <span className={'text-xs font-semibold uppercase tracking-wide ' + 'text-blue-400'}>
                                                                                {t('patterns.progress.top3Emotions')}
                                                                            </span>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            {progressData.topEmotions.map((item, idx) => (
                                                                                <div key={idx} className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={'text-xs font-bold ' + 'text-blue-400/50'}>#{idx + 1}</span>
                                                                                        <span className={'text-sm ' + 'text-blue-300'}>{item.emotion}</span>
                                                                                    </div>
                                                                                    <span className={'text-xs px-2 py-0.5 rounded ' + 'bg-gray-800/50 text-gray-400'}>
                                                                                        {item.count}×
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Autocuidado Detalhado */}
                                                    {progressData.selfCareDetailed && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                {t('patterns.progress.selfCare')}
                                                            </h3>

                                                            {/* Overall score */}
                                                            <div className={'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700/50' + ' rounded-lg p-4 border mb-4'}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={'text-sm font-semibold ' + ('text-gray-300')}>
                                                                        {t('patterns.progress.overallRate')}
                                                                    </span>
                                                                    <span className={'text-2xl font-black ' + (progressData.selfCareDetailed.recentOverall >= 70 ? 'text-green-400' : 'text-orange-400')}>
                                                                        {progressData.selfCareDetailed.recentOverall.toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                                <div className={('bg-gray-700') + ' rounded-full h-3 overflow-hidden'}>
                                                                    <div
                                                                        className={'h-full transition-all duration-500 ' + (progressData.selfCareDetailed.recentOverall >= 70 ? 'bg-green-500' : 'bg-orange-500')}
                                                                        style={{width: `${progressData.selfCareDetailed.recentOverall}%`}}
                                                                    ></div>
                                                                </div>
                                                                <div className={'text-xs mt-2 italic ' + ('text-gray-400')}>
                                                                    {progressData.selfCareDetailed.suggestion}
                                                                </div>
                                                            </div>

                                                            {/* Complete cycles */}
                                                            <div className={'bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-700/50' + ' rounded-lg p-4 border mb-4'}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={'text-sm font-semibold ' + ('text-gray-300')}>
                                                                        {t('patterns.progress.completeCycles')}
                                                                    </span>
                                                                    <span className={'text-2xl font-black ' + (progressData.selfCareDetailed.completeCycles.recent >= 50 ? 'text-blue-400' : 'text-orange-400')}>
                                                                        {progressData.selfCareDetailed.completeCycles.recent.toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                                <div className={('bg-gray-700') + ' rounded-full h-3 overflow-hidden'}>
                                                                    <div
                                                                        className={'h-full transition-all duration-500 ' + (progressData.selfCareDetailed.completeCycles.recent >= 50 ? 'bg-blue-500' : 'bg-orange-500')}
                                                                        style={{width: `${progressData.selfCareDetailed.completeCycles.recent}%`}}
                                                                    ></div>
                                                                </div>
                                                                <div className={'text-xs mt-2 ' + ('text-gray-400')}>
                                                                    {t('patterns.progress.completeCyclesDetail', { count: progressData.selfCareDetailed.completeCycles.recentCount, total: progressData.selfCareDetailed.completeCycles.recentTotal })}
                                                                </div>
                                                            </div>

                                                            {/* Per-area breakdown */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {Object.entries(progressData.selfCareDetailed.areas).map(([areaKey, percent]) => {
                                                                    const areaNames = {
                                                                        water: { name: t('patterns.areas.water'), emoji: '💧' },
                                                                        food: { name: t('patterns.areas.food'), emoji: '🍎' },
                                                                        rest: { name: t('patterns.areas.rest'), emoji: '🏃' },
                                                                        social: { name: t('patterns.areas.social'), emoji: '👥' }
                                                                    };
                                                                    const area = areaNames[areaKey];
                                                                    return (
                                                                        <div key={areaKey} className={('bg-gray-700/30 border-gray-600') + ' rounded-lg p-3 border'}>
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="text-lg">{area.emoji}</span>
                                                                                <span className={'text-xs font-medium ' + ('text-gray-300')}>
                                                                                    {area.name}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-baseline gap-1">
                                                                                <span className={'text-2xl font-bold ' + (percent >= 70 ? 'text-green-400' : 'text-orange-400')}>
                                                                                    {percent.toFixed(0)}%
                                                                                </span>
                                                                            </div>
                                                                            <div className={'bg-gray-600' + ' rounded-full h-1.5 overflow-hidden mt-2'}>
                                                                                <div
                                                                                    className={'h-full ' + (percent >= 70 ? 'bg-green-500' : 'bg-orange-500')}
                                                                                    style={{width: `${percent}%`}}
                                                                                ></div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Summary insights */}
                                                    <div className={('bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-700/50') + ' rounded-xl p-6 border'}>
                                                        <h3 className={'text-lg font-semibold mb-3 ' + ('text-white')}>
                                                            {t('patterns.progress.summaryTitle')}
                                                        </h3>
                                                        <div className={'text-sm leading-relaxed space-y-2 ' + ('text-gray-300')}>
                                                            {progressScore >= 70 && (
                                                                <p dangerouslySetInnerHTML={{ __html: t('patterns.progress.excellent') }} />
                                                            )}
                                                            {progressScore >= 40 && progressScore < 70 && (
                                                                <p dangerouslySetInnerHTML={{ __html: t('patterns.progress.moderate') }} />
                                                            )}
                                                            {progressScore < 40 && (
                                                                <p dangerouslySetInnerHTML={{ __html: t('patterns.progress.challenging') }} />
                                                            )}
                                                            <div className={'mt-3 pt-3 border-t ' + ('border-gray-700')}>
                                                                <p className="text-xs font-medium mb-1">{t('patterns.progress.improvingAreas')}</p>
                                                                <ul className="text-xs space-y-1">
                                                                    {Object.entries(progressData)
                                                                        .filter(([_, data]) => data.change && data.change.isImprovement && data.change.direction !== 'stable')
                                                                        .sort((a, b) => b[1].change.percent - a[1].change.percent)
                                                                        .slice(0, 3)
                                                                        .map(([key, data], i) => (
                                                                            <li key={i}>✅ {data.label} ({data.change.direction === 'up' ? '↑' : '↓'}{data.change.percent.toFixed(0)}%)</li>
                                                                        ))}
                                                                    {Object.entries(progressData).filter(([_, data]) => data.change && data.change.isImprovement && data.change.direction !== 'stable').length === 0 && (
                                                                        <li className="text-gray-500 italic">{t('patterns.progress.noImprovement')}</li>
                                                                    )}
                                                                </ul>
                                                            </div>
                                                            {Object.entries(progressData).filter(([_, data]) => data.change && !data.change.isImprovement && data.change.direction !== 'stable' && !data.change.isNew).length > 0 && (
                                                                <div className={'mt-3 pt-3 border-t ' + ('border-gray-700')}>
                                                                    <p className="text-xs font-medium mb-1">{t('patterns.progress.attentionAreas')}</p>
                                                                    <ul className="text-xs space-y-1">
                                                                        {Object.entries(progressData)
                                                                            .filter(([_, data]) => data.change && !data.change.isImprovement && data.change.direction !== 'stable' && !data.change.isNew)
                                                                            .sort((a, b) => b[1].change.percent - a[1].change.percent)
                                                                            .slice(0, 3)
                                                                            .map(([key, data], i) => (
                                                                                <li key={i}>⚠️ {data.label} ({data.change.direction === 'up' ? '↑' : '↓'}{data.change.percent.toFixed(0)}%)</li>
                                                                            ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // TEMPORAL
                                        if (patternView === 'temporal') {
                                            // Calculate byDate for temporal analyses
                                            const byDate = {};
                                            filteredConsumptions.forEach(c => { const dk = c.date || safeToISODate(c.timestamp); if (dk) byDate[dk] = (byDate[dk] || 0) + 1; });

                                            // Calculate byHour
                                            const byHour = {};
                                            filteredConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                byHour[hour] = (byHour[hour] || 0) + 1;
                                            });

                                            // Calculate byPartOfDay
                                            const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
                                            filteredConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                if (hour >= 6 && hour < 12) byPartOfDay.manha++;
                                                else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
                                                else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
                                                else byPartOfDay.madrugada++;
                                            });

                                            // Calculate byWeekday
                                            const byWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                                            const weekdayNames = t('analyses.dayNames', { returnObjects: true });
                                            filteredConsumptions.forEach(c => {
                                                const day = new Date(c.timestamp).getDay();
                                                byWeekday[day]++;
                                            });

                                            return (
                                        <div className="space-y-4">
                                            {atypicalBanner}
                                            {/* Por horário */}
                                            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.temporal.byHour')}</h3>
                                                {Object.keys(byHour).length === 0 ? (
                                                    <div className={'text-center py-4 text-sm ' + ('text-gray-400')}>{t('patterns.temporal.noData')}</div>
                                                ) : (() => {
                                                    const totalHour = Object.values(byHour).reduce((a, b) => a + b, 0);

                                                    // Agrupar horas em blocos de 3h para melhor visualização
                                                    const hourBlocks = [
                                                        { range: '00-02', hours: [0,1,2], icon: '🌙', label: t('patterns.timePeriods.dawn'), period: 'dawn' },
                                                        { range: '03-05', hours: [3,4,5], icon: '🌙', label: t('patterns.timePeriods.dawn'), period: 'dawn' },
                                                        { range: '06-08', hours: [6,7,8], icon: '🌅', label: t('patterns.timePeriods.morning'), period: 'morning' },
                                                        { range: '09-11', hours: [9,10,11], icon: '☀️', label: t('patterns.timePeriods.morning'), period: 'morning' },
                                                        { range: '12-14', hours: [12,13,14], icon: '🌤️', label: t('patterns.timePeriods.afternoon'), period: 'afternoon' },
                                                        { range: '15-17', hours: [15,16,17], icon: '🌤️', label: t('patterns.timePeriods.afternoon'), period: 'afternoon' },
                                                        { range: '18-20', hours: [18,19,20], icon: '🌆', label: t('patterns.timePeriods.night'), period: 'night' },
                                                        { range: '21-23', hours: [21,22,23], icon: '🌃', label: t('patterns.timePeriods.night'), period: 'night' }
                                                    ];

                                                    // Calcular máximo dos BLOCOS (não das horas individuais)
                                                    const blockCounts = hourBlocks.map(block =>
                                                        block.hours.reduce((sum, h) => sum + (byHour[h] || 0), 0)
                                                    );
                                                    const maxBlockCount = Math.max(...blockCounts);

                                                    return (
                                                        <div className="space-y-2">
                                                            {hourBlocks.map(block => {
                                                                const blockCount = block.hours.reduce((sum, h) => sum + (byHour[h] || 0), 0);
                                                                const blockPercent = totalHour > 0 ? Math.round((blockCount / totalHour) * 100) : 0;
                                                                const intensity = maxBlockCount > 0 ? (blockCount / maxBlockCount) : 0;

                                                                // Cores por período
                                                                let colorClass = '';
                                                                if (block.period === 'dawn') {
                                                                    colorClass = intensity > 0.7 ? 'bg-purple-600' : intensity > 0.4 ? 'bg-purple-500' : intensity > 0.1 ? 'bg-purple-400' : ('bg-gray-700');
                                                                } else if (block.period === 'morning') {
                                                                    colorClass = intensity > 0.7 ? 'bg-orange-600' : intensity > 0.4 ? 'bg-orange-500' : intensity > 0.1 ? 'bg-orange-400' : ('bg-gray-700');
                                                                } else if (block.period === 'afternoon') {
                                                                    colorClass = intensity > 0.7 ? 'bg-yellow-600' : intensity > 0.4 ? 'bg-yellow-500' : intensity > 0.1 ? 'bg-yellow-400' : ('bg-gray-700');
                                                                } else {
                                                                    colorClass = intensity > 0.7 ? 'bg-blue-600' : intensity > 0.4 ? 'bg-blue-500' : intensity > 0.1 ? 'bg-blue-400' : ('bg-gray-700');
                                                                }

                                                                return (
                                                                    <div key={block.range} className="flex items-center gap-3">
                                                                        <div className={'text-xl w-8 text-center'}>
                                                                            {block.icon}
                                                                        </div>
                                                                        <div className={'text-sm font-medium w-16 ' + ('text-gray-300')}>
                                                                            {block.range}h
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className={('bg-gray-700') + ' rounded-full h-8 overflow-hidden relative'}>
                                                                                <div className={colorClass + ' h-full flex items-center px-4 text-white text-sm font-bold transition-all duration-300'} style={{width: Math.max(intensity * 100, blockCount > 0 ? 8 : 0) + '%'}}>
                                                                                    {blockCount > 0 && (
                                                                                        <span className="whitespace-nowrap">
                                                                                            {blockCount}x {blockPercent > 0 && `· ${blockPercent}%`}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Legenda */}
                                                            <div className={'text-xs mt-4 pt-3 border-t flex items-center justify-center gap-4 ' + 'text-gray-400 border-gray-700'}>
                                                                <span>{t('patterns.freq.intensityLegend')}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Por período do dia */}
                                            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.temporal.byPeriod')}</h3>
                                                {(() => {
                                                    const total = byPartOfDay.manha + byPartOfDay.tarde + byPartOfDay.noite + byPartOfDay.madrugada;
                                                    if (total === 0) return <div className={'text-center py-4 text-sm ' + ('text-gray-400')}>{t('patterns.temporal.noData')}</div>;

                                                    const manhaPercent = Math.round((byPartOfDay.manha / total) * 100);
                                                    const tardePercent = Math.round((byPartOfDay.tarde / total) * 100);
                                                    const noitePercent = Math.round((byPartOfDay.noite / total) * 100);
                                                    const madrugadaPercent = Math.round((byPartOfDay.madrugada / total) * 100);

                                                    return (
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            <div className={('bg-yellow-900/30 border-yellow-700/50') + ' rounded-lg p-4 text-center border'}>
                                                                <div className="text-2xl mb-2">🌅</div>
                                                                <div className={'text-xs mb-1 ' + ('text-gray-300')}>{t('patterns.temporal.manha')}</div>
                                                                <div className={'text-xs mb-2 ' + 'text-gray-500'}>6h-12h</div>
                                                                <div className={'text-xl font-bold ' + 'text-yellow-400'}>{manhaPercent}%</div>
                                                                <div className={'text-xs mt-1 ' + ('text-gray-400')}>{byPartOfDay.manha}x</div>
                                                            </div>
                                                            <div className={('bg-orange-900/30 border-orange-700/50') + ' rounded-lg p-4 text-center border'}>
                                                                <div className="text-2xl mb-2">☀️</div>
                                                                <div className={'text-xs mb-1 ' + ('text-gray-300')}>{t('patterns.temporal.tarde')}</div>
                                                                <div className={'text-xs mb-2 ' + 'text-gray-500'}>12h-18h</div>
                                                                <div className={'text-xl font-bold ' + 'text-orange-400'}>{tardePercent}%</div>
                                                                <div className={'text-xs mt-1 ' + ('text-gray-400')}>{byPartOfDay.tarde}x</div>
                                                            </div>
                                                            <div className={'bg-indigo-900/30 border-indigo-700/50' + ' rounded-lg p-4 text-center border'}>
                                                                <div className="text-2xl mb-2">🌙</div>
                                                                <div className={'text-xs mb-1 ' + ('text-gray-300')}>{t('patterns.temporal.noite')}</div>
                                                                <div className={'text-xs mb-2 ' + 'text-gray-500'}>18h-24h</div>
                                                                <div className={'text-xl font-bold ' + ('text-indigo-400')}>{noitePercent}%</div>
                                                                <div className={'text-xs mt-1 ' + ('text-gray-400')}>{byPartOfDay.noite}x</div>
                                                            </div>
                                                            <div className={('bg-purple-900/30 border-purple-700/50') + ' rounded-lg p-4 text-center border'}>
                                                                <div className="text-2xl mb-2">⭐</div>
                                                                <div className={'text-xs mb-1 ' + ('text-gray-300')}>{t('patterns.temporal.madrugada')}</div>
                                                                <div className={'text-xs mb-2 ' + 'text-gray-500'}>0h-6h</div>
                                                                <div className={'text-xl font-bold ' + 'text-purple-400'}>{madrugadaPercent}%</div>
                                                                <div className={'text-xs mt-1 ' + ('text-gray-400')}>{byPartOfDay.madrugada}x</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Por dia da semana */}
                                            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.temporal.byWeekday')}</h3>
                                                <div className="space-y-3">
                                                    {Object.values(byWeekday).every(v => v === 0) ? (
                                                        <div className={'text-center py-4 text-sm ' + ('text-gray-400')}>{t('patterns.temporal.noData')}</div>
                                                    ) : (() => {
                                                        const totalWeekday = Object.values(byWeekday).reduce((a, b) => a + b, 0);
                                                        const weekdayEntries = Object.entries(byWeekday).filter(([_, count]) => count > 0);
                                                        const maxEntry = weekdayEntries.reduce((max, [day, count]) => count > max[1] ? [day, count] : max, ['0', 0]);
                                                        const minEntry = weekdayEntries.reduce((min, [day, count]) => count < min[1] ? [day, count] : min, [maxEntry[0], maxEntry[1]]);

                                                        return (
                                                            <>
                                                                {Object.entries(byWeekday).map(([day, count]) => {
                                                                    const percent = totalWeekday > 0 ? Math.round((count / totalWeekday) * 100) : 0;
                                                                    const isMax = day === maxEntry[0] && count > 0;
                                                                    const isMin = day === minEntry[0] && weekdayEntries.length > 1 && count > 0;

                                                                    return (
                                                                        <div key={day} className="flex items-center gap-2">
                                                                            <div className={'text-xs w-10 font-medium flex items-center gap-1 ' + 'text-gray-300'}>
                                                                                {weekdayNames[parseInt(day)]}
                                                                                {isMax && <span title="Dia com mais consumo">🔴</span>}
                                                                                {isMin && <span title="Dia com menos consumo">🟢</span>}
                                                                            </div>
                                                                            <div className={'flex-1 rounded-full h-7 overflow-hidden ' + ('bg-gray-700')}>
                                                                                <div
                                                                                    className={`h-full flex items-center justify-between px-3 text-white text-xs font-medium transition-all ${
                                                                                        isMax ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                                                                                        isMin ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                                                                        'bg-gradient-to-r from-purple-500 to-pink-500'
                                                                                    }`}
                                                                                    style={{width: Math.min(100, (count / Math.max(...Object.values(byWeekday))) * 100) + '%'}}
                                                                                >
                                                                                    <span>{count}x</span>
                                                                                    <span>{percent}%</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}

                                                                {/* Padrão Semanal */}
                                                                {weekdayEntries.length > 1 && (
                                                                    <div className={'mt-4 pt-3 border-t text-xs ' + ('border-gray-700 text-gray-400')}>
                                                                        <span className={'font-semibold ' + 'text-red-400'}>🔴 {weekdayNames[parseInt(maxEntry[0])]}</span>: {i18n.language === 'en' ? `highest-use day (${maxEntry[1]}x, ${Math.round((maxEntry[1] / totalWeekday) * 100)}%)` : `dia com mais consumo (${maxEntry[1]}x, ${Math.round((maxEntry[1] / totalWeekday) * 100)}%)`}
                                                                        {' • '}
                                                                        <span className={'font-semibold ' + 'text-green-400'}>🟢 {weekdayNames[parseInt(minEntry[0])]}</span>: {i18n.language === 'en' ? `lowest-use day (${minEntry[1]}x, ${Math.round((minEntry[1] / totalWeekday) * 100)}%)` : `dia com menos consumo (${minEntry[1]}x, ${Math.round((minEntry[1] / totalWeekday) * 100)}%)`}
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* 📆 CICLO MENSUAL */}
                                            {Object.keys(byDate).length >= 15 && (() => {
                                                const dayOfMonthData = {};
                                                for (let i = 1; i <= 31; i++) dayOfMonthData[i] = [];
                                                Object.entries(byDate).forEach(([date, count]) => {
                                                    dayOfMonthData[new Date(date).getDate()].push(count);
                                                });
                                                const dayOfMonthAverages = {};
                                                Object.entries(dayOfMonthData).forEach(([day, counts]) => {
                                                    if (counts.length > 0) dayOfMonthAverages[day] = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                                                });
                                                const sortedDays = Object.entries(dayOfMonthAverages).filter(([_, avg]) => avg > 0).sort(([,a], [,b]) => b - a);
                                                if (sortedDays.length < 5) return null;

                                                const days2025 = sortedDays.filter(([day]) => parseInt(day) >= 20 && parseInt(day) <= 25);
                                                const avgDays2025 = days2025.length > 0 ? days2025.reduce((sum, [_, avg]) => sum + avg, 0) / days2025.length : 0;
                                                const overallAvg = sortedDays.reduce((sum, [_, avg]) => sum + avg, 0) / sortedDays.length;
                                                const hasPeak2025 = avgDays2025 > overallAvg * 1.2;
                                                const maxDay = sortedDays[0];
                                                const minDay = sortedDays[sortedDays.length - 1];

                                                return (
                                                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-4 border mt-4'}>
                                                        <h3 className={'font-semibold mb-3 ' + ('text-white')}>{t('patterns.structural.monthlyCycle')}</h3>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                            {/* Top 5 dias com MAIS consumo */}
                                                            <div className="space-y-2">
                                                                <div className={'text-xs font-semibold mb-2 ' + 'text-red-400'}>🔴 {t('patterns.structural.moreConsumption')}</div>
                                                                {sortedDays.slice(0, 5).map(([day, avg]) => {
                                                                    const dayNum = parseInt(day);
                                                                    const maxAvg = parseFloat(sortedDays[0][1]);
                                                                    const widthPercent = (avg / maxAvg) * 100;
                                                                    const isPeak = dayNum >= 20 && dayNum <= 25 && hasPeak2025;
                                                                    return (
                                                                        <div key={day} className="flex items-center gap-2">
                                                                            <div className={'text-xs w-12 font-medium text-right ' + 'text-gray-300'}>{t('patterns.structural.day', { n: day })}</div>
                                                                            <div className={'flex-1 rounded-full h-6 overflow-hidden ' + ('bg-gray-700')}>
                                                                                <div
                                                                                    className={'h-full flex items-center justify-between px-2 text-white text-xs font-medium transition-all ' + (isPeak ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-red-500 to-pink-500')}
                                                                                    style={{width: `${widthPercent}%`}}
                                                                                >
                                                                                    <span>{avg.toFixed(1)}</span>
                                                                                    {isPeak && <span>🔥</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Top 5 dias com MENOS consumo */}
                                                            <div className="space-y-2">
                                                                <div className={'text-xs font-semibold mb-2 ' + 'text-green-400'}>🟢 {t('patterns.structural.lessConsumption')}</div>
                                                                {sortedDays.slice(-5).reverse().map(([day, avg]) => {
                                                                    const minAvg = parseFloat(sortedDays[sortedDays.length - 1][1]);
                                                                    const maxAvg = parseFloat(sortedDays[0][1]);
                                                                    const widthPercent = (avg / maxAvg) * 100;
                                                                    return (
                                                                        <div key={day} className="flex items-center gap-2">
                                                                            <div className={'text-xs w-12 font-medium text-right ' + 'text-gray-300'}>{t('patterns.structural.day', { n: day })}</div>
                                                                            <div className={'flex-1 rounded-full h-6 overflow-hidden ' + ('bg-gray-700')}>
                                                                                <div
                                                                                    className="h-full flex items-center justify-between px-2 text-white text-xs font-medium transition-all bg-gradient-to-r from-green-500 to-emerald-500"
                                                                                    style={{width: `${widthPercent}%`}}
                                                                                >
                                                                                    <span>{avg.toFixed(1)}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Resumo interpretativo */}
                                                        {hasPeak2025 && (
                                                            <div className={'pt-3 border-t text-sm ' + ('border-gray-700 text-gray-300')}>
                                                                🔍 <span className={'font-semibold ' + 'text-orange-400'}>Padrão detectado:</span> Pico entre dias <strong>20-25</strong> ({avgDays2025.toFixed(1)}/dia vs {overallAvg.toFixed(1)}/dia média)
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                            );
                                        }

                                        // ESTRUTURAL
                                        if (patternView === 'estrutural') {
                                            // Calculate byDate for components that need it
                                            const byDate = {};
                                            filteredConsumptions.forEach(c => { const dk = c.date || safeToISODate(c.timestamp); if (dk) byDate[dk] = (byDate[dk] || 0) + 1; });

                                            // Calcular intervalos entre consumos
                                            const sorted = [...filteredConsumptions].sort((a,b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
                                            const intervals = [];
                                            for (let i = 1; i < sorted.length; i++) {
                                                const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
                                                intervals.push({ hours: diff, date: sorted[i].date });
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {/* 📊 DOSAGEM SEMANAL */}
                                                    {(() => {
                                                        if (filteredDailyLogs.length < 7) return null;
                                                        const getISOWeek = (date) => {
                                                            const d = new Date(date);
                                                            d.setHours(0, 0, 0, 0);
                                                            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                                                            const yearStart = new Date(d.getFullYear(), 0, 1);
                                                            const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                                                            return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
                                                        };
                                                        const weeklyData = {};
                                                        filteredDailyLogs.forEach(log => {
                                                            const mg = parseFloat(log.mg);
                                                            if (!mg || mg <= 0) return;
                                                            const logDate = log.date || safeToISODate(log.timestamp);
                                                            const week = getISOWeek(logDate);
                                                            if (!weeklyData[week]) weeklyData[week] = { week, totalMg: 0, days: 0 };
                                                            weeklyData[week].totalMg += mg;
                                                            weeklyData[week].days++;
                                                        });
                                                        const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week));
                                                        if (sortedWeeks.length < 2) return null;
                                                        const recentWeeks = sortedWeeks.slice(-4);
                                                        const oldWeeks = sortedWeeks.slice(0, Math.min(4, sortedWeeks.length - 4));
                                                        const avgRecent = recentWeeks.reduce((s, w) => s + w.totalMg, 0) / recentWeeks.length;
                                                        const avgOld = oldWeeks.length > 0 ? oldWeeks.reduce((s, w) => s + w.totalMg, 0) / oldWeeks.length : avgRecent;
                                                        const trendPct = oldWeeks.length > 0 ? ((avgRecent - avgOld) / avgOld * 100) : 0;
                                                        let trendKey = 'stable', trendIcon = '➡️';
                                                        if (trendPct > 15) { trendKey = 'increasing'; trendIcon = '📈'; }
                                                        else if (trendPct < -15) { trendKey = 'decreasing'; trendIcon = '📉'; }
                                                        const trendLabel = t('patterns.structural.' + (trendKey === 'increasing' ? 'increasingTrend' : trendKey === 'decreasing' ? 'decreasingTrend' : 'stableTrend'));
                                                        const weekPrefix = i18n.language === 'pt' ? 'S' : 'W';
                                                        const chartData = sortedWeeks.slice(-12).map(w => ({ week: w.week.replace(/^\d{4}-W/, weekPrefix), dosagem: w.totalMg, days: w.days }));
                                                        const avgWeekly = (sortedWeeks.reduce((s, w) => s + w.totalMg, 0) / sortedWeeks.length).toFixed(0);
                                                        return (
                                                            <div className={('bg-gray-800 border-gray-700') + ' rounded-xl p-4 border'}>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h3 className={'font-semibold ' + ('text-purple-300')}>{t('patterns.structural.weeklyDosage')}</h3>
                                                                    <div className={'text-xs px-2 py-1 rounded-full ' + ('bg-purple-900/50 text-purple-300')}>{sortedWeeks.length} {sortedWeeks.length === 1 ? t('patterns.structural.week') : t('patterns.structural.weeks')}</div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                                    <div className={'text-center p-3 rounded-lg ' + ('bg-gray-700/50')}>
                                                                        <div className={'text-xs opacity-75 mb-1 ' + ('text-gray-400')}>{t('patterns.structural.weeklyAvg')}</div>
                                                                        <div className={'text-2xl font-bold ' + 'text-purple-400'}>{avgWeekly}mg</div>
                                                                    </div>
                                                                    <div className={'text-center p-3 rounded-lg ' + (trendKey === 'decreasing' ? ('bg-green-900/30 border border-green-700') : trendKey === 'increasing' ? ('bg-red-900/30 border border-red-700') : ('bg-gray-700/50'))}>
                                                                        <div className={'text-xs opacity-75 mb-1 ' + ('text-gray-400')}>{t('patterns.structural.trend4weeks')}</div>
                                                                        <div className={'text-xl font-bold flex items-center justify-center gap-1 ' + (trendKey === 'decreasing' ? 'text-green-400' : trendKey === 'increasing' ? 'text-red-400' : 'text-gray-400')}>
                                                                            <span>{trendIcon}</span><span className="text-sm">{trendPct.toFixed(0)}%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ width: '100%', height: 200 }}>
                                                                    <ResponsiveContainer>
                                                                        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" stroke={'#374151'} />
                                                                            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                                                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} label={{ value: 'mg', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#9ca3af' }} />
                                                                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: `1px solid ${'#374151'}`, borderRadius: '6px', fontSize: '12px' }} formatter={(value, name, props) => [`${value}mg (${props.payload.days} ${props.payload.days === 1 ? t('coach.day_singular') : t('coach.day_plural')})`, t('patterns.structural.dosageTotalTooltip')]} />
                                                                            <Bar dataKey="dosagem" fill={'#a78bfa'} radius={[4, 4, 0, 0]} />
                                                                        </BarChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                                <p className={'text-xs italic mt-2 text-center ' + ('text-gray-400')}>{t('patterns.structural.lastNWeeks', { n: Math.min(12, sortedWeeks.length) })}</p>
                                                                {sortedWeeks.length >= 2 && (() => {
                                                                    const firstWeek = sortedWeeks[0];
                                                                    const lastWeek = sortedWeeks[sortedWeeks.length - 1];
                                                                    const change = lastWeek.totalMg - firstWeek.totalMg;
                                                                    const changePct = (change / firstWeek.totalMg * 100);
                                                                    if (Math.abs(changePct) < 5) return null;
                                                                    return (
                                                                        <div className={'mt-3 pt-3 border-t text-sm ' + ('border-gray-700')}>
                                                                            <p className={'text-gray-300'}>
                                                                                {change > 0 ? (
                                                                                <>{t('patterns.structural.dosageRose', { first: firstWeek.totalMg.toFixed(0), last: lastWeek.totalMg.toFixed(0), pct: Math.abs(changePct).toFixed(0) })}{changePct > 30 && <span className={'ml-1 font-semibold ' + 'text-yellow-400'}>{t('patterns.structural.possibleTolerance')}</span>}</>
                                                                            ) : (
                                                                                <>{t('patterns.structural.dosageDropped', { first: firstWeek.totalMg.toFixed(0), last: lastWeek.totalMg.toFixed(0), pct: Math.abs(changePct).toFixed(0) })}</>
                                                                            )}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Análise de Intervalos */}
                                                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.structural.intervals')}</h3>
                                                        {intervals.length === 0 ? (
                                                            <div className={'text-center py-4 text-sm ' + ('text-gray-400')}>
                                                                {i18n.language === 'en' ? 'No intervals (requires ≥2 uses)' : 'Sem intervalos (necessário ≥2 consumos)'}
                                                            </div>
                                                        ) : (() => {
                                                            const goodIntervals = intervals.filter(i => i.hours >= 2);
                                                            const shortIntervals = intervals.filter(i => i.hours < 2);
                                                            const avgInterval = intervals.reduce((sum, i) => sum + i.hours, 0) / intervals.length;
                                                            const maxInterval = Math.max(...intervals.map(i => i.hours));
                                                            const goodPercent = ((goodIntervals.length / intervals.length) * 100).toFixed(0);
                                                            const shortPercent = ((shortIntervals.length / intervals.length) * 100).toFixed(0);

                                                            return (
                                                                <>
                                                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                                                        <div className={`${'bg-purple-900/30 border border-purple-700/50'} rounded-lg p-3 text-center border`}>
                                                                            <div className={`text-2xl font-bold ${'text-purple-400'}`}>{intervals.length}</div>
                                                                            <div className={`text-xs ${'text-gray-300'}`}>Total</div>
                                                                        </div>
                                                                        <div className={`${'bg-blue-900/30 border border-blue-700/50'} rounded-lg p-3 text-center border`}>
                                                                            <div className={`text-2xl font-bold ${'text-blue-400'}`}>{avgInterval.toFixed(1)}h</div>
                                                                            <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.average')}</div>
                                                                        </div>
                                                                        <div className={`${'bg-green-900/30 border border-green-700/50'} rounded-lg p-3 text-center border`}>
                                                                            <div className={`text-2xl font-bold ${'text-green-400'}`}>{maxInterval.toFixed(1)}h</div>
                                                                            <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.maximum')}</div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-3">
                                                                        {/* Bons intervalos (≥2h) */}
                                                                        <div className={`${'bg-green-900/20 border border-green-700/50'} rounded-lg p-4`}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium flex items-center gap-2 ${'text-green-400'}`}>
                                                                                    <span>✅</span>
                                                                                    <span>{t('patterns.structural.goodIntervals')}</span>
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${'text-green-400'}`}>
                                                                                    {goodIntervals.length} ({goodPercent}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${'bg-gray-700'} rounded-full h-3 overflow-hidden`}>
                                                                                <div className="bg-green-500 h-full transition-all duration-500" style={{width: goodPercent + '%'}}></div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Intervalos curtos (<2h) */}
                                                                        <div className={`${'bg-orange-900/20 border border-orange-700/50'} rounded-lg p-4`}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium flex items-center gap-2 ${'text-orange-400'}`}>
                                                                                    <span>⚠️</span>
                                                                                    <span>{t('patterns.structural.shortIntervals')}</span>
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${'text-orange-400'}`}>
                                                                                    {shortIntervals.length} ({shortPercent}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${'bg-gray-700'} rounded-full h-3 overflow-hidden`}>
                                                                                <div className="bg-orange-500 h-full transition-all duration-500" style={{width: shortPercent + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className={`${'bg-indigo-900/20 border-indigo-700/50'} rounded-lg p-3 mt-4 border`}>
                                                                        <p className={`text-xs leading-relaxed ${'text-gray-300'}`}>
                                                                            {goodPercent >= 50
                                                                                ? t('patterns.structural.intervalTipGood')
                                                                                : t('patterns.structural.intervalTipBad')}
                                                                        </p>
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Análise de Dosagens */}
                                                    {(() => {
                                                        // Usar APENAS dailyLogs.mg (dosagens diárias precisas)
                                                        // NÃO usar cycles.mg porque representa dosagem total do ciclo (pode ser vários dias)
                                                        const dailyDosageRecords = filteredDailyLogs.filter(log => log.mg != null);

                                                        if (dailyDosageRecords.length === 0) {
                                                            return (
                                                                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.structural.dosageAnalysis')}</h3>
                                                                    <div className={'text-center py-4 text-sm ' + ('text-gray-400')}>
                                                                        {t('patterns.structural.noDosageData')}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        // Calcular estatísticas
                                                        const dosages = dailyDosageRecords.map(r => r.mg);
                                                        const totalDosage = dosages.reduce((sum, d) => sum + d, 0);
                                                        const avgDosage = totalDosage / dosages.length;
                                                        const maxDosage = Math.max(...dosages);
                                                        const minDosage = Math.min(...dosages);

                                                        // Calcular tendência (primeira metade vs segunda metade do período)
                                                        const sortedByDate = [...dailyDosageRecords].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
                                                        const midpoint = Math.floor(sortedByDate.length / 2);
                                                        const firstHalf = sortedByDate.slice(0, midpoint);
                                                        const secondHalf = sortedByDate.slice(midpoint);

                                                        let trendIcon = '➡️';
                                                        let trendText = t('patterns.structural.trendStable');
                                                        let trendPercent = 0;
                                                        let trendColor = 'text-blue-400';
                                                        let trendBg = 'bg-blue-900/20 border-blue-700/50';

                                                        if (firstHalf.length > 0 && secondHalf.length > 0) {
                                                            const avgFirst = firstHalf.reduce((sum, log) => sum + log.mg, 0) / firstHalf.length;
                                                            const avgSecond = secondHalf.reduce((sum, log) => sum + log.mg, 0) / secondHalf.length;
                                                            const change = ((avgSecond - avgFirst) / avgFirst) * 100;
                                                            trendPercent = Math.abs(change);

                                                            if (change > 5) {
                                                                trendIcon = '📈';
                                                                trendText = t('patterns.structural.increasedByPct', { pct: trendPercent.toFixed(0) });
                                                                trendColor = 'text-red-400';
                                                                trendBg = 'bg-red-900/20 border-red-700/50';
                                                            } else if (change < -5) {
                                                                trendIcon = '📉';
                                                                trendText = t('patterns.structural.decreasedByPct', { pct: Math.abs(trendPercent).toFixed(0) });
                                                                trendColor = 'text-green-400';
                                                                trendBg = 'bg-green-900/20 border-green-700/50';
                                                            }
                                                        }

                                                        // Distribuição por faixas de dosagem (dinâmica)
                                                        // Tentar usar meta de reduce_quantity, senão usar percentis dos dados
                                                        let lowThreshold, highThreshold;
                                                        let rangeMethod = 'percentis';

                                                        // Procurar meta ativa de reduce_quantity
                                                        const reduceQuantityGoal = goals
                                                            .filter(g => g.type === 'reduce_quantity' && !g.completed)
                                                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

                                                        if (reduceQuantityGoal && reduceQuantityGoal.target) {
                                                            // Usar meta como referência: 75% e 125% da meta
                                                            const target = parseFloat(reduceQuantityGoal.target);
                                                            lowThreshold = target * 0.75;
                                                            highThreshold = target * 1.25;
                                                            rangeMethod = 'meta';
                                                        } else {
                                                            // Usar percentis 33 e 66 dos dados
                                                            const sorted = [...dosages].sort((a, b) => a - b);
                                                            const p33 = sorted[Math.floor(sorted.length * 0.33)];
                                                            const p66 = sorted[Math.floor(sorted.length * 0.66)];
                                                            lowThreshold = p33;
                                                            highThreshold = p66;
                                                        }

                                                        const ranges = {
                                                            baixa: dosages.filter(d => d < lowThreshold).length,
                                                            media: dosages.filter(d => d >= lowThreshold && d < highThreshold).length,
                                                            alta: dosages.filter(d => d >= highThreshold).length
                                                        };

                                                        return (
                                                            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                                <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.structural.dosageAnalysis')}</h3>

                                                                {/* Estatísticas Gerais */}
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                                                    <div className={`${'bg-purple-900/30 border border-purple-700/50'} rounded-lg p-3 text-center border`}>
                                                                        <div className={`text-2xl font-bold ${'text-purple-400'}`}>{dailyDosageRecords.length}</div>
                                                                        <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.records')}</div>
                                                                    </div>
                                                                    <div className={`${'bg-blue-900/30 border border-blue-700/50'} rounded-lg p-3 text-center border`}>
                                                                        <div className={`text-2xl font-bold ${'text-blue-400'}`}>{avgDosage.toFixed(1)}mg</div>
                                                                        <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.average')}</div>
                                                                    </div>
                                                                    <div className={`${'bg-orange-900/30 border border-orange-700/50'} rounded-lg p-3 text-center border`}>
                                                                        <div className={`text-2xl font-bold ${'text-orange-400'}`}>{maxDosage}mg</div>
                                                                        <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.maximum')}</div>
                                                                    </div>
                                                                    <div className={`${'bg-green-900/30 border border-green-700/50'} rounded-lg p-3 text-center border`}>
                                                                        <div className={`text-2xl font-bold ${'text-green-400'}`}>{minDosage}mg</div>
                                                                        <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.minimum')}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Tendência */}
                                                                <div className={`${trendBg} rounded-lg p-4 border mb-4`}>
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <div className={`text-sm font-medium mb-1 ${'text-gray-300'}`}>{t('patterns.structural.periodTrend')}</div>
                                                                            <div className={`text-2xl font-bold ${trendColor}`}>
                                                                                {trendIcon} {trendText}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <p className={`text-xs mt-2 ${'text-gray-400'}`}>
                                                                        {t('patterns.structural.firstVsSecondHalf')}
                                                                    </p>
                                                                </div>

                                                                {/* Distribuição */}
                                                                <div className="space-y-3">
                                                                    <div className={'text-sm font-medium mb-2 ' + 'text-gray-300'}>
                                                                        {t('patterns.doseDistribution')}
                                                                        {rangeMethod === 'meta' && (
                                                                            <span className={`text-xs ml-2 ${'text-gray-400'}`}>
                                                                                {t('patterns.structural.basedOnGoal', { mg: reduceQuantityGoal.target })}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {ranges.baixa > 0 && (
                                                                        <div className={`${'bg-green-900/20 border border-green-700/50'} rounded-lg p-3`}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium ${'text-green-400'}`}>
                                                                                    🟢 {t('patterns.structural.dosageLow', { threshold: Math.round(lowThreshold) })}
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${'text-green-400'}`}>
                                                                                    {ranges.baixa} ({((ranges.baixa / dosages.length) * 100).toFixed(0)}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${'bg-gray-700'} rounded-full h-2 overflow-hidden`}>
                                                                                <div className="bg-green-500 h-full transition-all duration-500" style={{width: ((ranges.baixa / dosages.length) * 100) + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {ranges.media > 0 && (
                                                                        <div className={`${'bg-yellow-900/20 border border-yellow-700/50'} rounded-lg p-3`}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium ${'text-yellow-400'}`}>
                                                                                    🟡 {t('patterns.structural.dosageMed', { low: Math.round(lowThreshold), high: Math.round(highThreshold) })}
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${'text-yellow-400'}`}>
                                                                                    {ranges.media} ({((ranges.media / dosages.length) * 100).toFixed(0)}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${'bg-gray-700'} rounded-full h-2 overflow-hidden`}>
                                                                                <div className="bg-yellow-500 h-full transition-all duration-500" style={{width: ((ranges.media / dosages.length) * 100) + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {ranges.alta > 0 && (
                                                                        <div className={`${'bg-red-900/20 border border-red-700/50'} rounded-lg p-3`}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium ${'text-red-400'}`}>
                                                                                    🔴 {t('patterns.structural.dosageHigh', { threshold: Math.round(highThreshold) })}
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${'text-red-400'}`}>
                                                                                    {ranges.alta} ({((ranges.alta / dosages.length) * 100).toFixed(0)}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${'bg-gray-700'} rounded-full h-2 overflow-hidden`}>
                                                                                <div className="bg-red-500 h-full transition-all duration-500" style={{width: ((ranges.alta / dosages.length) * 100) + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
    );
}
