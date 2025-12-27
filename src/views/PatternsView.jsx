import React, { useMemo, lazy, Suspense } from 'react';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import { safeToISODate, formatDateShort, formatDateWithWeekday, formatDateWithWeekdayFull, formatDateTime, getDateDaysAgo, getTodayPT, getTodayKey, timestampToPT, subtractDays, getDateKeyFromItem } from '../utils/helpers';
import { getEmotionCategory } from '../constants/emotions';
import HeatmapChart from '../components/HeatmapChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const { getDateRangeForPeriod, filterByDateRange, getPeriodLabel, getGoalAchievementCount } = analyticsService;

export function PatternsView({
    patternsPeriod,
    setPatternsPeriod,
    patternsPeriodOffset,
    setPatternsPeriodOffset,
    patternView,
    setPatternView
}) {
    const { consumptions, wellbeingLogs, cycles, dailyLogs, goals } = useData();
    const { darkMode } = useUI();
    const metrics = useMetrics();

    return (
                                <div className="space-y-6">
                                    <h2 className={'text-2xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>Padrões</h2>

                                    {/* Temporal Filters */}
                                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-4 border'}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex gap-2 flex-wrap">
                                                {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                                                    <button key={period} onClick={() => { setPatternsPeriod(period); setPatternsPeriodOffset(0); }} className={'px-4 py-2 rounded-lg font-medium transition-colors text-sm ' + (patternsPeriod === period ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                                        {period === 'hoje' && '📅 Hoje'}
                                                        {period === 'semana' && '📊 Semana'}
                                                        {period === 'mes' && '📈 Mês'}
                                                        {period === 'tudo' && '🌐 Tudo'}
                                                    </button>
                                                ))}
                                            </div>
                                            {patternsPeriod !== 'tudo' && (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setPatternsPeriodOffset(patternsPeriodOffset + 1)} className={'text-purple-600 p-2 rounded-lg transition-colors ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50')}>
                                                        <Icons.ChevronLeft className="w-5 h-5" />
                                                    </button>
                                                    <span className={'text-sm font-medium min-w-[120px] text-center ' + (themeClasses.textSecondary(darkMode))}>{getPeriodLabel(patternsPeriod, patternsPeriodOffset)}</span>
                                                    <button onClick={() => setPatternsPeriodOffset(Math.max(0, patternsPeriodOffset - 1))} disabled={patternsPeriodOffset === 0} className={'p-2 rounded-lg transition-colors ' + (patternsPeriodOffset === 0 ? (darkMode ? 'text-gray-600' : 'text-gray-300') + ' cursor-not-allowed' : 'text-purple-600 ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50'))}>
                                                        <Icons.ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>


                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {['dashboard', 'progress', 'temporal', 'estrutural'].map(view => (
                                            <button key={view} onClick={() => setPatternView(view)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ' + (patternView === view ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                                {view === 'dashboard' && '📊 Dashboard'}
                                                {view === 'progress' && '📈 Progresso'}
                                                {view === 'temporal' && '⏰ Temporal'}
                                                {view === 'estrutural' && '📐 Estrutural'}
                                            </button>
                                        ))}
                                    </div>

                                    {(() => {
                                        // Apply temporal filter to all data
                                        const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);

                                        const filteredConsumptions = filterByDateRange(consumptions, dateRange);
                                        const filteredWellbeingLogs = filterByDateRange(wellbeingLogs, dateRange);
                                        const filteredCycles = filterByDateRange(cycles, dateRange);
                                        const filteredDailyLogs = filterByDateRange(dailyLogs, dateRange);

                                        // DASHBOARD (COMPACTO)
                                        if (patternView === 'dashboard') {
                                            if (filteredConsumptions.length === 0 && filteredWellbeingLogs.length === 0) return (<div className={(darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500') + ' rounded-xl p-6 border text-center'}>Sem dados para este período</div>);

                                            // Calculate metrics
                                            const totalConsumptions = filteredConsumptions.length;
                                            const byDate = {};
                                            filteredConsumptions.forEach(c => { byDate[c.date] = (byDate[c.date] || 0) + 1; });
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
                                                    const bestDayName = new Date(bestDate).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' });
                                                    const prefix = completedDates.length === 1 ? 'Neste dia registaste' : 'Teu melhor dia foi';
                                                    insights.push({
                                                        text: `${prefix} ${bestDayName} com ${bestCount === 1 ? 'apenas 1 consumo' : `${bestCount} consumos`}. ${bestCount <= 2 ? 'Identifica o que funcionou! ⭐' : 'Continua a melhorar! 💪'}`,
                                                        type: 'positive'
                                                    });
                                                }
                                            }

                                            // Time pattern insight
                                            const maxPartOfDay = Object.entries(byPartOfDay).reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
                                            if (maxPartOfDay[1] > 0) {
                                                const partNames = { manha: 'manhã', tarde: 'tarde', noite: 'noite', madrugada: 'madrugada' };
                                                const percentage = ((maxPartOfDay[1] / filteredConsumptions.length) * 100).toFixed(0);
                                                insights.push({
                                                    text: `Padrão identificado: ${percentage}% dos consumos ocorrem à ${partNames[maxPartOfDay[0]]}. Prepara estratégias para esse período. 🎯`,
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
                                                const today = getTodayPT();
                                                const daysWithConsumptions = new Set();
                                                filteredConsumptions.forEach(c => {
                                                    const dateKey = c.date || safeToISODate(c.timestamp);
                                                    if (dateKey && dateKey !== today) daysWithConsumptions.add(dateKey);
                                                });
                                                const totalDaysWithConsumptions = daysWithConsumptions.size;

                                                // Calcular dias únicos com sono (para sleep_hours e bedtime_before)
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

                                                const goalBreakdown = uniqueGoals.map(g => {
                                                    const achievementCount = getGoalAchievementCount(g, filteredConsumptions, filteredDailyLogs, filteredCycles, filteredWellbeingLogs);

                                                    // TODAS as metas usam o mesmo total baseado no tipo
                                                    let totalPossible = 0;

                                                    if (g.type === 'sleep_hours' || g.type === 'bedtime_before') {
                                                        // Metas de sono: usar dias com sono no período
                                                        totalPossible = totalDaysWithSleep;
                                                    } else {
                                                        // Todas as outras: usar dias com consumos no período
                                                        totalPossible = totalDaysWithConsumptions;
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
                                                    {/* Mini-resumo contextual */}
                                                    <div className={(darkMode ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' rounded-lg p-4 border'}>
                                                        <p className={'text-sm leading-relaxed ' + (darkMode ? 'text-gray-200' : 'text-gray-700')}>
                                                            {`Tiveste ${totalConsumptions} ${totalConsumptions === 1 ? 'consumo' : 'consumos'} (média ${avgPerDay}/dia).${avgInterval > 0 ? ` Intervalo médio: ${avgInterval}h.` : ''}`}
                                                        </p>
                                                    </div>

                                                    {/* Métricas essenciais */}
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className={(darkMode ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border-purple-200') + ' rounded-lg p-4 text-center border'}>
                                                            <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Total</div>
                                                            <div className={(darkMode ? 'text-purple-400' : 'text-purple-600') + ' text-2xl font-bold'}>{totalConsumptions}x</div>
                                                        </div>
                                                        <div className={(darkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-50 border-blue-200') + ' rounded-lg p-4 text-center border'}>
                                                            <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Média/dia</div>
                                                            <div className={(darkMode ? 'text-blue-400' : 'text-blue-600') + ' text-2xl font-bold'}>{avgPerDay}</div>
                                                        </div>
                                                        <div className={(darkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-50 border-green-200') + ' rounded-lg p-4 text-center border'}>
                                                            <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Intervalo médio</div>
                                                            <div className={(darkMode ? 'text-green-400' : 'text-green-600') + ' text-2xl font-bold'}>{avgInterval}h</div>
                                                        </div>
                                                    </div>

                                                    {/* Tendência (30 dias) */}
                                                    {trend && (
                                                        <div className={
                                                            (trend.direction === 'increasing'
                                                                ? (darkMode ? 'bg-red-900/30 border-red-700/50' : 'bg-red-50 border-red-200')
                                                                : trend.direction === 'decreasing'
                                                                    ? (darkMode ? 'bg-green-900/30 border-green-700/50' : 'bg-green-50 border-green-200')
                                                                    : (darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-100 border-gray-300')
                                                            ) + ' rounded-lg p-4 border'
                                                        }>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className={'text-xs font-semibold uppercase tracking-wide ' + (
                                                                    trend.direction === 'increasing'
                                                                        ? (darkMode ? 'text-red-400' : 'text-red-700')
                                                                        : trend.direction === 'decreasing'
                                                                            ? (darkMode ? 'text-green-400' : 'text-green-700')
                                                                            : (darkMode ? 'text-gray-400' : 'text-gray-600')
                                                                )}>
                                                                    📈 Tendência (30 dias)
                                                                </div>
                                                                <span className={'text-2xl ' + (
                                                                    trend.direction === 'increasing' ? '⚠️' :
                                                                    trend.direction === 'decreasing' ? '✅' : '➖'
                                                                )}></span>
                                                            </div>
                                                            <div className={'text-sm leading-relaxed ' + (darkMode ? 'text-gray-200' : 'text-gray-700')}>
                                                                {trend.direction === 'increasing' && (
                                                                    <>
                                                                        <strong className={(darkMode ? 'text-red-400' : 'text-red-600')}>Escalada detectada:</strong> +{trend.slopePerDay} consumos/dia em média.
                                                                        <br />
                                                                        <span className={'text-xs mt-1 block ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                            Projeção 10 dias: ~{trend.projection} consumos/dia
                                                                        </span>
                                                                    </>
                                                                )}
                                                                {trend.direction === 'decreasing' && (
                                                                    <>
                                                                        <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>Redução em progresso:</strong> {trend.slopePerDay} consumos/dia em média.
                                                                        <br />
                                                                        <span className={'text-xs mt-1 block ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                            Continua assim! Projeção 10 dias: ~{trend.projection} consumos/dia
                                                                        </span>
                                                                    </>
                                                                )}
                                                                {trend.direction === 'stable' && (
                                                                    <>
                                                                        <strong className={(darkMode ? 'text-gray-400' : 'text-gray-600')}>Padrão estável:</strong> ~{trend.currentAvg} consumos/dia (variação mínima)
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Heatmap */}
                                                    <HeatmapChart
                                                        consumptions={consumptions}
                                                        wellbeingLogs={wellbeingLogs}
                                                        darkMode={darkMode}
                                                        days={90}
                                                    />

                                                    {/* Evolução da Frequência */}
                                                    {Object.keys(byDate).length > 0 && (
                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                            <h3 className={'font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                📈 Evolução da Frequência
                                                            </h3>
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
                                                                        <div className="flex items-end justify-between gap-1 h-48 relative">
                                                                            {recentDates.map((date, idx) => {
                                                                                const count = byDate[date];
                                                                                const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                                                                const heightPx = Math.max((heightPercent / 100) * 192, 8); // 192px = h-48, min 8px
                                                                                const isToday = date === new Date().toISOString().split('T')[0];

                                                                                return (
                                                                                    <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative" style={{ minWidth: '2px' }}>
                                                                                        {/* Tooltip */}
                                                                                        <div className={'absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap px-2 py-1 rounded text-xs ' + (darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-800 text-white')}>
                                                                                            {new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}: {count}x
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
                                                                                <div key={date} className={'text-xs flex-1 text-center ' + (themeClasses.textTertiary(darkMode))}>
                                                                                    {new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        {/* Legenda */}
                                                                        <div className={'text-xs mt-2 pt-3 border-t flex items-center justify-center gap-4 flex-wrap ' + (darkMode ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200')}>
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
                                                                                <span>Hoje</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {/* 📅 PADRÃO SEMANAL */}
                                                    {Object.keys(byDate).length >= 7 && (() => {
                                                        // Agrupar consumos por dia da semana
                                                        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                                                        const dayData = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }; // 0=Dom, 1=Seg, ..., 6=Sáb

                                                        Object.entries(byDate).forEach(([date, count]) => {
                                                            const dayOfWeek = new Date(date).getDay();
                                                            dayData[dayOfWeek].push(count);
                                                        });

                                                        // Calcular média por dia da semana
                                                        const dayAverages = {};
                                                        Object.entries(dayData).forEach(([day, counts]) => {
                                                            if (counts.length > 0) {
                                                                dayAverages[day] = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                                                            }
                                                        });

                                                        // Se não há dados suficientes, não mostrar
                                                        if (Object.keys(dayAverages).length < 3) return null;

                                                        const maxAvg = Math.max(...Object.values(dayAverages));
                                                        const minAvg = Math.min(...Object.values(dayAverages));

                                                        // Encontrar melhor e pior dia
                                                        const bestDay = Object.entries(dayAverages).reduce((best, [day, avg]) =>
                                                            avg < best.avg ? { day: parseInt(day), avg } : best
                                                        , { day: 0, avg: Infinity });

                                                        const worstDay = Object.entries(dayAverages).reduce((worst, [day, avg]) =>
                                                            avg > worst.avg ? { day: parseInt(day), avg } : worst
                                                        , { day: 0, avg: -Infinity });

                                                        return (
                                                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border mt-4'}>
                                                                <h3 className={'font-semibold mb-4 ' + (darkMode ? 'text-purple-300' : 'text-gray-800')}>
                                                                    📅 Padrão Semanal
                                                                </h3>

                                                                {/* Gráfico de barras por dia da semana */}
                                                                <div className="space-y-3">
                                                                    {[1, 2, 3, 4, 5, 6, 0].map(day => { // Ordem: Seg-Dom
                                                                        const avg = dayAverages[day];
                                                                        if (!avg) return null;

                                                                        const widthPercent = maxAvg > 0 ? (avg / maxAvg) * 100 : 0;
                                                                        const isBest = day === bestDay.day;
                                                                        const isWorst = day === worstDay.day;

                                                                        return (
                                                                            <div key={day} className="space-y-1">
                                                                                <div className="flex items-center justify-between text-sm">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={'font-medium w-8 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                            {dayNames[day]}
                                                                                        </span>
                                                                                        {isBest && <span className={'text-xs px-2 py-0.5 rounded-full ' + (darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700')}>✓ Melhor</span>}
                                                                                        {isWorst && <span className={'text-xs px-2 py-0.5 rounded-full ' + (darkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700')}>⚠ Desafiante</span>}
                                                                                    </div>
                                                                                    <span className={'font-semibold ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>
                                                                                        {avg.toFixed(1)}/dia
                                                                                    </span>
                                                                                </div>
                                                                                <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-2 overflow-hidden'}>
                                                                                    <div
                                                                                        className={'h-full rounded-full transition-all duration-500 ' + (
                                                                                            isBest
                                                                                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                                                                                : isWorst
                                                                                                    ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                                                                                    : avg > 8
                                                                                                        ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                                                                                                        : avg > 5
                                                                                                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                                                                                                            : 'bg-gradient-to-r from-purple-500 to-blue-500'
                                                                                        )}
                                                                                        style={{ width: `${widthPercent}%` }}
                                                                                    ></div>
                                                                                </div>
                                                                                <div className={'text-xs ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                    {dayData[day].length} {dayData[day].length === 1 ? 'dia' : 'dias'} registados
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Resumo */}
                                                                <div className={'mt-4 pt-4 border-t text-sm ' + (darkMode ? 'border-gray-700' : 'border-gray-200')}>
                                                                    <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                                                                        <span className={'font-semibold ' + (darkMode ? 'text-green-400' : 'text-green-600')}>
                                                                            {dayNames[bestDay.day]}s
                                                                        </span>
                                                                        {' '}são teu ponto forte ({bestDay.avg.toFixed(1)}/dia).
                                                                        <span className={'font-semibold ml-1 ' + (darkMode ? 'text-red-400' : 'text-red-600')}>
                                                                            {dayNames[worstDay.day]}s
                                                                        </span>
                                                                        {' '}são mais desafiantes ({worstDay.avg.toFixed(1)}/dia).
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* 📊 GRÁFICO DE DOSAGEM SEMANAL */}
                                                    {(() => {
                                                        if (dailyLogs.length < 7) return null;

                                                        // Helper: obter ISO week number
                                                        const getISOWeek = (date) => {
                                                            const d = new Date(date);
                                                            d.setHours(0, 0, 0, 0);
                                                            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                                                            const yearStart = new Date(d.getFullYear(), 0, 1);
                                                            const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                                                            return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
                                                        };

                                                        // Agrupar dosagem por semana
                                                        const weeklyData = {};
                                                        dailyLogs.forEach(log => {
                                                            const mg = parseFloat(log.mg);
                                                            if (!mg || mg <= 0) return;

                                                            const week = getISOWeek(log.timestamp);
                                                            if (!weeklyData[week]) {
                                                                weeklyData[week] = { week, totalMg: 0, days: 0 };
                                                            }
                                                            weeklyData[week].totalMg += mg;
                                                            weeklyData[week].days++;
                                                        });

                                                        const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week));
                                                        if (sortedWeeks.length < 2) return null;

                                                        // Calcular tendência
                                                        const recentWeeks = sortedWeeks.slice(-4);
                                                        const oldWeeks = sortedWeeks.slice(0, Math.min(4, sortedWeeks.length - 4));
                                                        const avgRecent = recentWeeks.reduce((s, w) => s + w.totalMg, 0) / recentWeeks.length;
                                                        const avgOld = oldWeeks.length > 0 ? oldWeeks.reduce((s, w) => s + w.totalMg, 0) / oldWeeks.length : avgRecent;
                                                        const trendPct = oldWeeks.length > 0 ? ((avgRecent - avgOld) / avgOld * 100) : 0;

                                                        let trendLabel = 'Estável';
                                                        let trendIcon = '➡️';
                                                        if (trendPct > 15) {
                                                            trendLabel = 'A Aumentar';
                                                            trendIcon = '📈';
                                                        } else if (trendPct < -15) {
                                                            trendLabel = 'A Reduzir';
                                                            trendIcon = '📉';
                                                        }

                                                        const chartData = sortedWeeks.slice(-12).map(w => ({
                                                            week: w.week.replace(/^\d{4}-W/, 'S'),
                                                            dosagem: w.totalMg,
                                                            days: w.days
                                                        }));

                                                        const avgWeekly = (sortedWeeks.reduce((s, w) => s + w.totalMg, 0) / sortedWeeks.length).toFixed(0);

                                                        return (
                                                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border'}>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h3 className={'font-semibold ' + (darkMode ? 'text-purple-300' : 'text-gray-800')}>📊 Dosagem Semanal</h3>
                                                                    <div className={'text-xs px-2 py-1 rounded-full ' + (darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700')}>
                                                                        {sortedWeeks.length} {sortedWeeks.length === 1 ? 'semana' : 'semanas'}
                                                                    </div>
                                                                </div>

                                                                {/* Métricas */}
                                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                                    <div className={'text-center p-3 rounded-lg ' + (darkMode ? 'bg-gray-700/50' : 'bg-gray-50')}>
                                                                        <div className={'text-xs opacity-75 mb-1 ' + (themeClasses.textTertiary(darkMode))}>Média Semanal</div>
                                                                        <div className={'text-2xl font-bold ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>
                                                                            {avgWeekly}mg
                                                                        </div>
                                                                    </div>
                                                                    <div className={'text-center p-3 rounded-lg ' + (
                                                                        trendLabel === 'A Reduzir'
                                                                            ? (darkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-100 border border-green-300')
                                                                            : trendLabel === 'A Aumentar'
                                                                                ? (darkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-100 border border-red-300')
                                                                                : (darkMode ? 'bg-gray-700/50' : 'bg-gray-50')
                                                                    )}>
                                                                        <div className={'text-xs opacity-75 mb-1 ' + (themeClasses.textTertiary(darkMode))}>Tendência (4 sem)</div>
                                                                        <div className={'text-xl font-bold flex items-center justify-center gap-1 ' + (
                                                                            trendLabel === 'A Reduzir'
                                                                                ? (darkMode ? 'text-green-400' : 'text-green-600')
                                                                                : trendLabel === 'A Aumentar'
                                                                                    ? (darkMode ? 'text-red-400' : 'text-red-600')
                                                                                    : (darkMode ? 'text-gray-400' : 'text-gray-600')
                                                                        )}>
                                                                            <span>{trendIcon}</span>
                                                                            <span className="text-sm">{trendPct.toFixed(0)}%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Gráfico */}
                                                                <div style={{ width: '100%', height: 200 }}>
                                                                    <ResponsiveContainer>
                                                                        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                                                                            <XAxis
                                                                                dataKey="week"
                                                                                tick={{ fontSize: 11, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                                                                            />
                                                                            <YAxis
                                                                                tick={{ fontSize: 11, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                                                                                label={{ value: 'mg', angle: -90, position: 'insideLeft', fontSize: 11, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                                                                            />
                                                                            <Tooltip
                                                                                contentStyle={{
                                                                                    backgroundColor: darkMode ? '#1f2937' : '#fff',
                                                                                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '12px'
                                                                                }}
                                                                                formatter={(value, name, props) => [
                                                                                    `${value}mg (${props.payload.days} ${props.payload.days === 1 ? 'dia' : 'dias'})`,
                                                                                    'Dosagem Total'
                                                                                ]}
                                                                            />
                                                                            <Bar
                                                                                dataKey="dosagem"
                                                                                fill={darkMode ? '#a78bfa' : '#8b5cf6'}
                                                                                radius={[4, 4, 0, 0]}
                                                                            />
                                                                        </BarChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                                <p className={'text-xs italic mt-2 text-center ' + (themeClasses.textTertiary(darkMode))}>
                                                                    Últimas {Math.min(12, sortedWeeks.length)} semanas
                                                                </p>

                                                                {/* Contexto de evolução */}
                                                                {sortedWeeks.length >= 2 && (() => {
                                                                    const firstWeek = sortedWeeks[0];
                                                                    const lastWeek = sortedWeeks[sortedWeeks.length - 1];
                                                                    const change = lastWeek.totalMg - firstWeek.totalMg;
                                                                    const changePct = (change / firstWeek.totalMg * 100);

                                                                    if (Math.abs(changePct) < 5) return null; // Mudança insignificante

                                                                    return (
                                                                        <div className={'mt-3 pt-3 border-t text-sm ' + (darkMode ? 'border-gray-700' : 'border-gray-200')}>
                                                                            <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                                                                                {change > 0 ? (
                                                                                    <>
                                                                                        Dosagem média <span className={'font-semibold ' + (darkMode ? 'text-red-400' : 'text-red-600')}>subiu</span> de {firstWeek.totalMg.toFixed(0)}mg (1ª semana) para {lastWeek.totalMg.toFixed(0)}mg (última semana) - {Math.abs(changePct).toFixed(0)}% aumento.
                                                                                        {changePct > 30 && <span className={'ml-1 font-semibold ' + (darkMode ? 'text-yellow-400' : 'text-yellow-600')}>Possível tolerância?</span>}
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        Dosagem média <span className={'font-semibold ' + (darkMode ? 'text-green-400' : 'text-green-600')}>reduziu</span> de {firstWeek.totalMg.toFixed(0)}mg (1ª semana) para {lastWeek.totalMg.toFixed(0)}mg (última semana) - {Math.abs(changePct).toFixed(0)}% redução. Bom progresso!
                                                                                    </>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Insights Summary */}
                                                    {insights.length > 0 && (
                                                        <div className={(darkMode ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200') + ' rounded-xl p-6 border'}>
                                                            <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}>
                                                                <span className="text-xl">💡</span>
                                                                Padrões Identificados
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {insights.map((insight, i) => (
                                                                    <div key={i} className={'flex items-start gap-3 p-3 rounded-lg ' + (darkMode ? 'bg-gray-700/50 border-gray-600' : insight.type === 'positive' ? 'bg-green-50 border border-green-200' : insight.type === 'neutral' ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200')}>
                                                                        <div className={'flex-1 text-sm leading-relaxed ' + (darkMode ? 'text-gray-200' : insight.type === 'positive' ? 'text-green-800' : insight.type === 'neutral' ? 'text-orange-800' : 'text-blue-800')}>
                                                                            {insight.text}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Análise de Metas */}
                                                    {goalsAnalysis && (
                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                🎯 Metas
                                                            </h3>

                                                            {/* Main stats */}
                                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                                <div className={(darkMode ? 'bg-gradient-to-br from-pink-900/30 to-purple-900/30 border-pink-700/50' : 'bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200') + ' rounded-lg p-4 border'}>
                                                                    <div className={'text-xs font-semibold mb-1 uppercase tracking-wide ' + (darkMode ? 'text-pink-400' : 'text-pink-700')}>
                                                                        Total de Cumprimentos
                                                                    </div>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className={'text-3xl font-black ' + (darkMode ? 'text-pink-400' : 'text-pink-600')}>
                                                                            {goalsAnalysis.totalAchievements}
                                                                        </span>
                                                                        <span className={'text-sm ' + (themeClasses.textTertiary(darkMode))}>
                                                                            vezes
                                                                        </span>
                                                                    </div>
                                                                    <div className={'text-xs mt-1 ' + (themeClasses.textTertiary(darkMode))}>
                                                                        {goalsAnalysis.goalsWithAchievements}/{goalsAnalysis.totalGoals} metas cumpridas
                                                                    </div>
                                                                </div>

                                                                <div className={(darkMode ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200') + ' rounded-lg p-4 border'}>
                                                                    <div className={'text-xs font-semibold mb-1 uppercase tracking-wide ' + (darkMode ? 'text-blue-400' : 'text-blue-700')}>
                                                                        Média por Dia
                                                                    </div>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className={'text-3xl font-black ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>
                                                                            {goalsAnalysis.avgAchievementsPerDay}
                                                                        </span>
                                                                        <span className={'text-sm ' + (themeClasses.textTertiary(darkMode))}>
                                                                            cumprimentos
                                                                        </span>
                                                                    </div>
                                                                    <div className={'text-xs mt-1 ' + (themeClasses.textTertiary(darkMode))}>
                                                                        nos últimos {goalsAnalysis.periodDays} dias
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Per-goal breakdown */}
                                                            <div className={(darkMode ? 'bg-gray-700/30' : 'bg-gray-50') + ' rounded-lg p-4'}>
                                                                <div className={'text-xs font-semibold mb-3 uppercase tracking-wide ' + (themeClasses.textTertiary(darkMode))}>
                                                                    Detalhes por Meta
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {goalsAnalysis.goalBreakdown.map(goal => {
                                                                        const goalTypeLabels = {
                                                                            'reduce_frequency': '🔢 Reduzir frequência',
                                                                            'reduce_quantity': '⚖️ Reduzir quantidade',
                                                                            'limit_last': '🌙 Limitar último consumo',
                                                                            'increase_interval': '⏳ Aumentar intervalo',
                                                                            'sleep_hours': '😴 Horas de sono',
                                                                            'bedtime_before': '🛏️ Deitar antes de'
                                                                        };
                                                                        const explanations = {
                                                                            'reduce_frequency': `Dias com <${goal.target} consumos`,
                                                                            'reduce_quantity': `Dias com <${goal.target}mg`,
                                                                            'limit_last': `Dias com último antes da meia-noite`,
                                                                            'increase_interval': `Dias com ≥50% intervalos >${goal.target}h`,
                                                                            'sleep_hours': `Noites com ≥${goal.target}h de sono`,
                                                                            'bedtime_before': `Noites a dormir antes de ${goal.target}`
                                                                        };
                                                                        return (
                                                                            <div key={goal.id} className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white border-gray-200') + ' rounded-lg p-3 border'}>
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <div className="flex-1">
                                                                                        <div className={'text-sm font-medium mb-1 ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                                            {goalTypeLabels[goal.type] || goal.type}
                                                                                        </div>
                                                                                        <div className={'text-xs italic ' + (themeClasses.textTertiary(darkMode))}>
                                                                                            Meta: {goal.type === 'increase_interval' ? '50%' : goal.target + (goal.type === 'reduce_frequency' ? 'x/dia' : goal.type === 'reduce_quantity' ? 'mg' : goal.type === 'sleep_hours' ? 'h' : '')}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <div className={'text-2xl font-black ' + (goal.achievementCount > 0 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-gray-500' : 'text-gray-400'))}>
                                                                                            {goal.achievementCount}
                                                                                        </div>
                                                                                        <div className={'text-xs ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                            vezes
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                {/* Progress Bar */}
                                                                                <div>
                                                                                    <div className="flex items-center justify-between mb-1">
                                                                                        <span className={'text-xs font-medium ' + (themeClasses.textTertiary(darkMode))}>
                                                                                            {goal.achievementCount} / {goal.totalPossible}
                                                                                        </span>
                                                                                        <span className={'text-xs font-bold ' + (goal.successRate >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : goal.successRate >= 40 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>
                                                                                            {goal.successRate.toFixed(0)}%
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className={(darkMode ? 'bg-gray-600' : 'bg-gray-200') + ' rounded-full h-2 overflow-hidden'}>
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
                                                    label: 'Frequência média diária'
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

                                                // Fallback: buscar nos dailyLogs
                                                const dailyLog = dailyLogsData.find(l => l.date === date && l.mg !== undefined && !isNaN(parseFloat(l.mg)));
                                                if (dailyLog) {
                                                    const mgValue = typeof dailyLog.mg === 'number' ? dailyLog.mg : parseFloat(dailyLog.mg);
                                                    if (!isNaN(mgValue) && mgValue > 0) {
                                                        return mgValue;
                                                    }
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
                                                    label: 'Dosagem média diária'
                                                };
                                            }

                                            // 3. BEM-ESTAR - Sono (from cycles and wellbeingLogs)
                                            // Helper para extrair sono de cycles + wellbeingLogs por data
                                            const getSleepForDate = (date, cyclesData, wellbeingData) => {
                                                // Primeiro tenta buscar nos cycles
                                                const cycle = cyclesData.find(c => {
                                                    const cycleDate = getDateKeyFromItem(c);
                                                    return cycleDate === date && c.sleep !== undefined && c.sleep !== '';
                                                });
                                                if (cycle) {
                                                    const sleepValue = typeof cycle.sleep === 'number' ? cycle.sleep : parseFloat(cycle.sleep);
                                                    if (!isNaN(sleepValue) && sleepValue > 0) {
                                                        return sleepValue;
                                                    }
                                                }

                                                // Fallback: buscar nos wellbeingLogs
                                                const wellbeing = wellbeingData.find(w => {
                                                    const wDate = getDateKeyFromItem(w);
                                                    return wDate === date && w.sleep !== undefined && !isNaN(parseFloat(w.sleep));
                                                });
                                                if (wellbeing) {
                                                    const sleepValue = typeof wellbeing.sleep === 'number' ? wellbeing.sleep : parseFloat(wellbeing.sleep);
                                                    if (!isNaN(sleepValue) && sleepValue > 0) {
                                                        return sleepValue;
                                                    }
                                                }

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
                                                    label: 'Horas de sono médias'
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
                                                    label: 'Humor médio'
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
                                                    label: 'Energia média'
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
                                                        label: 'Consistência da hora de deitar'
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
                                                        label: 'Hora média de deitar'
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
                                                    label: 'Atividades de autocuidado por dia'
                                                };
                                            }

                                            // AUTOCUIDADO - Análise por área (water, rest, social, food)
                                            if (recentWellbeing.length > 0) {
                                                const areas = {
                                                    water: { name: 'Hidratação', emoji: '💧' },
                                                    food: { name: 'Alimentação', emoji: '🍎' },
                                                    rest: { name: 'Descanso', emoji: '😴' },
                                                    social: { name: 'Socialização', emoji: '👥' }
                                                };

                                                const recentAreaStats = {};
                                                const previousAreaStats = {};

                                                // Agrupar wellbeing por data (1 data = 1 ciclo aprox)
                                                const recentDates = new Set(recentWellbeing.map(w => w.date));
                                                const previousDates = new Set(previousWellbeing.map(w => w.date));

                                                Object.keys(areas).forEach(area => {
                                                    // Para cada ciclo (data), verificar se ALGUM registo tem area:true
                                                    const recentCyclesWithArea = Array.from(recentDates).filter(date => {
                                                        return recentWellbeing.some(w => w.date === date && w[area] === true);
                                                    }).length;

                                                    const previousCyclesWithArea = Array.from(previousDates).filter(date => {
                                                        return previousWellbeing.some(w => w.date === date && w[area] === true);
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
                                                        return recentWellbeing.some(w => w.date === date && w[area] === true);
                                                    });
                                                }).length;

                                                const previousCompleteCycles = Array.from(previousDates).filter(date => {
                                                    return Object.keys(areas).every(area => {
                                                        return previousWellbeing.some(w => w.date === date && w[area] === true);
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
                                                    suggestion = `Abaixo de 50% em várias áreas. Pequenos hábitos diários fazem diferença - começa por ${lowAreas[0].name.toLowerCase()} e ${lowAreas[1].name.toLowerCase()}.`;
                                                } else if (lowAreas.length === 2) {
                                                    suggestion = `Atenção a ${lowAreas[0].name.toLowerCase()} e ${lowAreas[1].name.toLowerCase()}. Criar rotinas simples pode ajudar!`;
                                                } else if (lowAreas.length === 1) {
                                                    suggestion = `Foca em melhorar ${lowAreas[0].name.toLowerCase()} - pequenos passos contam!`;
                                                } else {
                                                    suggestion = `Excelente! Estás a manter bons hábitos de autocuidado em todas as áreas (≥50%).`;
                                                }

                                                progressData.selfCareDetailed = {
                                                    recentOverall,
                                                    previousOverall,
                                                    areas: recentAreaStats,
                                                    previousAreas: previousAreaStats,
                                                    lowAreas,
                                                    suggestion,
                                                    change: calculateChange(recentOverall, previousOverall, false),
                                                    label: 'Taxa geral de autocuidado',
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
                                                    label: 'Emoções negativas (% do total)',
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
                                                    label: 'Emoções positivas (% do total)',
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
                                                    {/* Period comparison header */}
                                                    <div className={(darkMode ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700/50' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200') + ' rounded-xl p-6 border'}>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className={'text-xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                📈 Análise de Progresso Temporal
                                                            </h3>
                                                            <div className={'text-4xl font-black ' + (progressScore >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : progressScore >= 40 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>
                                                                {progressScore}%
                                                            </div>
                                                        </div>
                                                        <p className={'text-sm mb-3 ' + (themeClasses.textSecondary(darkMode))}>
                                                            {patternsPeriod === 'hoje' ? 'Comparação entre hoje (até agora) vs ontem (dia completo)' :
                                                             patternsPeriod === 'semana' ? 'Comparação entre esta semana vs semana anterior' :
                                                             patternsPeriod === 'mes' ? 'Comparação entre este mês vs mês anterior' :
                                                             `Comparação entre os últimos ${periodDays} dias vs os ${periodDays} dias anteriores`}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <div className={'flex-1 h-3 rounded-full overflow-hidden ' + (themeClasses.bgTertiaryAlt(darkMode))}>
                                                                <div className={'h-full transition-all duration-500 ' + (progressScore >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : progressScore >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-orange-500 to-red-500')} style={{width: progressScore + '%'}}></div>
                                                            </div>
                                                            <span className={'text-xs font-medium ' + (themeClasses.textTertiary(darkMode))}>
                                                                {improvements} de {total} métricas em melhoria
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Consumption metrics */}
                                                    {(progressData.frequency || progressData.dosage) && (
                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                💊 Consumo
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.frequency && (
                                                                    <div className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (themeClasses.textSecondary(darkMode))}>
                                                                                {progressData.frequency.label}
                                                                            </span>
                                                                            {progressData.frequency.recent !== progressData.frequency.previous && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (
                                                                                    progressData.frequency.change.direction !== 'stable'
                                                                                        ? (progressData.frequency.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))
                                                                                        : (darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-100 text-gray-600')
                                                                                )}>
                                                                                    {progressData.frequency.recent > progressData.frequency.previous ? '↑' : '↓'} {progressData.frequency.change.percent.toFixed(1)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.frequency.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                                consumos/dia
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.frequency.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.dosage && (
                                                                    <div className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (themeClasses.textSecondary(darkMode))}>
                                                                                {progressData.dosage.label}
                                                                            </span>
                                                                            {progressData.dosage.recent !== progressData.dosage.previous && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (
                                                                                    progressData.dosage.change.direction !== 'stable'
                                                                                        ? (progressData.dosage.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))
                                                                                        : (darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-100 text-gray-600')
                                                                                )}>
                                                                                    {progressData.dosage.recent > progressData.dosage.previous ? '↑' : '↓'} {progressData.dosage.change.percent.toFixed(1)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.dosage.recent.toFixed(0)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                                mg/dia
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.dosage.previous.toFixed(0)} mg
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Wellbeing metrics */}
                                                    {(progressData.sleep || progressData.mood || progressData.energy) && (
                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                💚 Bem-Estar
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.sleep && (
                                                                    <div className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (themeClasses.textSecondary(darkMode))}>
                                                                                {progressData.sleep.label}
                                                                            </span>
                                                                            {progressData.sleep.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.sleep.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.sleep.change.direction === 'up' ? '↑' : '↓'} {progressData.sleep.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.sleep.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                                horas
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.sleep.previous.toFixed(1)}h
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.mood && (
                                                                    <div className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (themeClasses.textSecondary(darkMode))}>
                                                                                {progressData.mood.label}
                                                                            </span>
                                                                            {progressData.mood.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.mood.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.mood.change.direction === 'up' ? '↑' : '↓'} {progressData.mood.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.mood.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                                /10
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.mood.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.energy && (
                                                                    <div className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (themeClasses.textSecondary(darkMode))}>
                                                                                {progressData.energy.label}
                                                                            </span>
                                                                            {progressData.energy.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.energy.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.energy.change.direction === 'up' ? '↑' : '↓'} {progressData.energy.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.energy.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                                /10
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.energy.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Lifestyle metrics */}
                                                    {(progressData.bedtimeConsistency || progressData.selfCare) && (
                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                🌙 Rotinas e Autocuidado
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.bedtimeConsistency && (
                                                                    <div className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (themeClasses.textSecondary(darkMode))}>
                                                                                {progressData.bedtimeConsistency.label}
                                                                            </span>
                                                                            {progressData.bedtimeConsistency.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.bedtimeConsistency.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.bedtimeConsistency.change.isImprovement ? '↓' : '↑'} {progressData.bedtimeConsistency.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2 mb-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.bedtimeConsistency.recent < 30 ? 'Muito consistente' : progressData.bedtimeConsistency.recent < 60 ? 'Consistente' : 'Variável'}
                                                                            </span>
                                                                            <span className={'text-xs ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                variação: ±{(progressData.bedtimeConsistency.recent / 60).toFixed(0)}h
                                                                            </span>
                                                                        </div>
                                                                        <div className={(darkMode ? 'bg-gray-800/50' : 'bg-gray-100') + ' rounded px-3 py-2'}>
                                                                            <p className={'text-xs italic ' + (themeClasses.textTertiary(darkMode))}>
                                                                                {progressData.bedtimeConsistency.recent < 30
                                                                                    ? '🎯 Deitas-te sempre a horas muito semelhantes (variação <30min). Isto é excelente! O teu corpo aprende a preparar-se para dormir à mesma hora, melhorando a qualidade do sono e facilitando adormecer.'
                                                                                    : progressData.bedtimeConsistency.recent < 60
                                                                                    ? `⚖️ Variação moderada (±${(progressData.bedtimeConsistency.recent / 60).toFixed(1)}h nas horas de deitar). Há alguma consistência, mas podes melhorar. Tenta definir uma janela de 30min (ex: 23h-23h30) para deitar, mesmo aos fins-de-semana.`
                                                                                    : `🌪️ Horas muito variáveis (±${(progressData.bedtimeConsistency.recent / 60).toFixed(1)}h de diferença). Isto confunde o ritmo circadiano - o corpo não sabe quando preparar-se para dormir. Resultado: mais dificuldade em adormecer, sono menos profundo. Começar por reduzir para ±1h já ajuda.`}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.avgBedtime && (
                                                                    <div className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (themeClasses.textSecondary(darkMode))}>
                                                                                {progressData.avgBedtime.label}
                                                                            </span>
                                                                            {progressData.avgBedtime.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.avgBedtime.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.avgBedtime.change.direction === 'up' ? 'Mais tarde' : 'Mais cedo'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.avgBedtime.recentTime}
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                era: {progressData.avgBedtime.previousTime}
                                                                            </span>
                                                                        </div>
                                                                        {(() => {
                                                                            const hour = parseInt(progressData.avgBedtime.recentTime.split(':')[0]);
                                                                            let feedback = '';
                                                                            if (hour >= 0 && hour < 6) {
                                                                                feedback = 'Atenção: deitar muito tarde (madrugada) pode afetar a qualidade do sono.';
                                                                            } else if (hour >= 22 && hour < 24) {
                                                                                feedback = 'Boa janela para deitar! (22h-00h)';
                                                                            } else if (hour >= 6 && hour < 12) {
                                                                                feedback = 'Dormir de manhã pode indicar inversão do ciclo.';
                                                                            }
                                                                            return feedback ? (
                                                                                <div className={'text-xs mt-2 ' + (themeClasses.textTertiary(darkMode))}>
                                                                                    {feedback}
                                                                                </div>
                                                                            ) : null;
                                                                        })()}
                                                                    </div>
                                                                )}
                                                                {progressData.selfCare && (
                                                                    <div className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (themeClasses.textSecondary(darkMode))}>
                                                                                {progressData.selfCare.label}
                                                                            </span>
                                                                            {progressData.selfCare.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.selfCare.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.selfCare.change.direction === 'up' ? '↑' : '↓'} {progressData.selfCare.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.selfCare.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                                atividades/ciclo
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.selfCare.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Emotional metrics */}
                                                    {(progressData.negativeEmotions || progressData.positiveEmotions || progressData.topEmotions) && (
                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                🧠 Estado Emocional
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.negativeEmotions && (
                                                                    <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-700/50' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200') + ' rounded-lg p-3 border'}>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-lg">😔</span>
                                                                            <span className={'text-xs font-semibold uppercase tracking-wide ' + (darkMode ? 'text-purple-400' : 'text-purple-700')}>
                                                                                Emoções Negativas
                                                                            </span>
                                                                            {progressData.negativeEmotions.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-0.5 rounded-full font-bold ml-auto ' + (progressData.negativeEmotions.change.isImprovement ? (darkMode ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300') : (darkMode ? 'bg-red-900/50 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300'))}>
                                                                                    {progressData.negativeEmotions.change.direction === 'up' ? '↑' : '↓'}{progressData.negativeEmotions.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <div className="flex items-baseline gap-1">
                                                                                    <span className={'text-3xl font-black ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>
                                                                                        {progressData.negativeEmotions.recent.toFixed(0)}%
                                                                                    </span>
                                                                                    <span className={'text-xs font-medium ' + (darkMode ? 'text-purple-300/70' : 'text-purple-600/70')}>
                                                                                        do total
                                                                                    </span>
                                                                                </div>
                                                                                <div className={'text-xs mt-1 ' + (darkMode ? 'text-purple-400/60' : 'text-purple-600/60')}>
                                                                                    {progressData.negativeEmotions.recentCount} de {progressData.negativeEmotions.recentTotal} emoções
                                                                                </div>
                                                                            </div>
                                                                            <div className={'text-xs px-2 py-1 rounded ' + (darkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-white/70 text-gray-600')}>
                                                                                era {progressData.negativeEmotions.previous.toFixed(0)}%
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.positiveEmotions && (
                                                                    <div className={(darkMode ? 'bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-700/50' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200') + ' rounded-lg p-3 border'}>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-lg">😊</span>
                                                                            <span className={'text-xs font-semibold uppercase tracking-wide ' + (darkMode ? 'text-green-400' : 'text-green-700')}>
                                                                                Emoções Positivas
                                                                            </span>
                                                                            {progressData.positiveEmotions.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-0.5 rounded-full font-bold ml-auto ' + (progressData.positiveEmotions.change.isImprovement ? (darkMode ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300') : (darkMode ? 'bg-red-900/50 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300'))}>
                                                                                    {progressData.positiveEmotions.change.direction === 'up' ? '↑' : '↓'}{progressData.positiveEmotions.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <div className="flex items-baseline gap-1">
                                                                                    <span className={'text-3xl font-black ' + (darkMode ? 'text-green-400' : 'text-green-600')}>
                                                                                        {progressData.positiveEmotions.recent.toFixed(0)}%
                                                                                    </span>
                                                                                    <span className={'text-xs font-medium ' + (darkMode ? 'text-green-300/70' : 'text-green-600/70')}>
                                                                                        do total
                                                                                    </span>
                                                                                </div>
                                                                                <div className={'text-xs mt-1 ' + (darkMode ? 'text-green-400/60' : 'text-green-600/60')}>
                                                                                    {progressData.positiveEmotions.recentCount} de {progressData.positiveEmotions.recentTotal} emoções
                                                                                </div>
                                                                            </div>
                                                                            <div className={'text-xs px-2 py-1 rounded ' + (darkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-white/70 text-gray-600')}>
                                                                                era {progressData.positiveEmotions.previous.toFixed(0)}%
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.topEmotions && (
                                                                    <div className={(darkMode ? 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200') + ' rounded-lg p-3 border'}>
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <span className="text-lg">🌟</span>
                                                                            <span className={'text-xs font-semibold uppercase tracking-wide ' + (darkMode ? 'text-blue-400' : 'text-blue-700')}>
                                                                                Top 3 Emoções
                                                                            </span>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            {progressData.topEmotions.map((item, idx) => (
                                                                                <div key={idx} className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={'text-xs font-bold ' + (darkMode ? 'text-blue-400/50' : 'text-blue-600/50')}>#{idx + 1}</span>
                                                                                        <span className={'text-sm ' + (darkMode ? 'text-blue-300' : 'text-blue-700')}>{item.emotion}</span>
                                                                                    </div>
                                                                                    <span className={'text-xs px-2 py-0.5 rounded ' + (darkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-white/70 text-gray-600')}>
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
                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                💚 Análise de Autocuidado
                                                            </h3>

                                                            {/* Overall score */}
                                                            <div className={(darkMode ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700/50' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200') + ' rounded-lg p-4 border mb-4'}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={'text-sm font-semibold ' + (themeClasses.textSecondary(darkMode))}>
                                                                        Taxa geral de autocuidado
                                                                    </span>
                                                                    <span className={'text-2xl font-black ' + (progressData.selfCareDetailed.recentOverall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>
                                                                        {progressData.selfCareDetailed.recentOverall.toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                                <div className={(themeClasses.bgTertiaryAlt(darkMode)) + ' rounded-full h-3 overflow-hidden'}>
                                                                    <div
                                                                        className={'h-full transition-all duration-500 ' + (progressData.selfCareDetailed.recentOverall >= 70 ? 'bg-green-500' : 'bg-orange-500')}
                                                                        style={{width: `${progressData.selfCareDetailed.recentOverall}%`}}
                                                                    ></div>
                                                                </div>
                                                                <div className={'text-xs mt-2 italic ' + (themeClasses.textTertiary(darkMode))}>
                                                                    {progressData.selfCareDetailed.suggestion}
                                                                </div>
                                                            </div>

                                                            {/* Complete cycles */}
                                                            <div className={(darkMode ? 'bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-700/50' : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200') + ' rounded-lg p-4 border mb-4'}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={'text-sm font-semibold ' + (themeClasses.textSecondary(darkMode))}>
                                                                        🎯 Ciclos completos (4 indicadores)
                                                                    </span>
                                                                    <span className={'text-2xl font-black ' + (progressData.selfCareDetailed.completeCycles.recent >= 50 ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>
                                                                        {progressData.selfCareDetailed.completeCycles.recent.toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                                <div className={(themeClasses.bgTertiaryAlt(darkMode)) + ' rounded-full h-3 overflow-hidden'}>
                                                                    <div
                                                                        className={'h-full transition-all duration-500 ' + (progressData.selfCareDetailed.completeCycles.recent >= 50 ? 'bg-blue-500' : 'bg-orange-500')}
                                                                        style={{width: `${progressData.selfCareDetailed.completeCycles.recent}%`}}
                                                                    ></div>
                                                                </div>
                                                                <div className={'text-xs mt-2 ' + (themeClasses.textTertiary(darkMode))}>
                                                                    {progressData.selfCareDetailed.completeCycles.recentCount} de {progressData.selfCareDetailed.completeCycles.recentTotal} ciclos com todos os indicadores
                                                                </div>
                                                            </div>

                                                            {/* Per-area breakdown */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {Object.entries(progressData.selfCareDetailed.areas).map(([areaKey, percent]) => {
                                                                    const areaNames = {
                                                                        water: { name: 'Hidratação', emoji: '💧' },
                                                                        food: { name: 'Alimentação', emoji: '🍎' },
                                                                        rest: { name: 'Descanso', emoji: '😴' },
                                                                        social: { name: 'Socialização', emoji: '👥' }
                                                                    };
                                                                    const area = areaNames[areaKey];
                                                                    return (
                                                                        <div key={areaKey} className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-3 border'}>
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="text-lg">{area.emoji}</span>
                                                                                <span className={'text-xs font-medium ' + (themeClasses.textSecondary(darkMode))}>
                                                                                    {area.name}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-baseline gap-1">
                                                                                <span className={'text-2xl font-bold ' + (percent >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>
                                                                                    {percent.toFixed(0)}%
                                                                                </span>
                                                                            </div>
                                                                            <div className={(darkMode ? 'bg-gray-600' : 'bg-gray-200') + ' rounded-full h-1.5 overflow-hidden mt-2'}>
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
                                                    <div className={(darkMode ? 'bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-700/50' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200') + ' rounded-xl p-6 border'}>
                                                        <h3 className={'text-lg font-semibold mb-3 ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                            💡 Resumo do Progresso
                                                        </h3>
                                                        <div className={'text-sm leading-relaxed space-y-2 ' + (themeClasses.textSecondary(darkMode))}>
                                                            {progressScore >= 70 && (
                                                                <p>🎉 <strong>Excelente progresso!</strong> A maioria das métricas mostra melhoria clara. Continua neste caminho!</p>
                                                            )}
                                                            {progressScore >= 40 && progressScore < 70 && (
                                                                <p>👍 <strong>Progresso moderado.</strong> Algumas áreas melhoraram, outras mantiveram-se estáveis. Identifica o que funcionou nas áreas positivas.</p>
                                                            )}
                                                            {progressScore < 40 && (
                                                                <p>💪 <strong>Momento desafiante.</strong> Os dados mostram dificuldades em várias áreas. Lembra-te: recaídas fazem parte da recuperação. Foca-te em pequenas vitórias.</p>
                                                            )}
                                                            <div className={'mt-3 pt-3 border-t ' + (darkMode ? 'border-gray-700' : 'border-gray-200')}>
                                                                <p className="text-xs font-medium mb-1">Áreas com maior melhoria:</p>
                                                                <ul className="text-xs space-y-1">
                                                                    {Object.entries(progressData)
                                                                        .filter(([_, data]) => data.change && data.change.isImprovement && data.change.direction !== 'stable')
                                                                        .sort((a, b) => b[1].change.percent - a[1].change.percent)
                                                                        .slice(0, 3)
                                                                        .map(([key, data], i) => (
                                                                            <li key={i}>✅ {data.label} ({data.change.direction === 'up' ? '↑' : '↓'}{data.change.percent.toFixed(0)}%)</li>
                                                                        ))}
                                                                    {Object.entries(progressData).filter(([_, data]) => data.change && data.change.isImprovement && data.change.direction !== 'stable').length === 0 && (
                                                                        <li className="text-gray-500 italic">Nenhuma melhoria significativa detetada (mudanças &lt;5%)</li>
                                                                    )}
                                                                </ul>
                                                            </div>
                                                            {Object.entries(progressData).filter(([_, data]) => data.change && !data.change.isImprovement && data.change.direction !== 'stable' && !data.change.isNew).length > 0 && (
                                                                <div className={'mt-3 pt-3 border-t ' + (darkMode ? 'border-gray-700' : 'border-gray-200')}>
                                                                    <p className="text-xs font-medium mb-1">Áreas que precisam de atenção:</p>
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
                                            const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                                            filteredConsumptions.forEach(c => {
                                                const day = new Date(c.timestamp).getDay();
                                                byWeekday[day]++;
                                            });

                                            return (
                                        <div className="space-y-4">
                                            {/* Por horário */}
                                            <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                <h3 className={'font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>🕐 Consumo por Horário</h3>
                                                {Object.keys(byHour).length === 0 ? (
                                                    <div className={'text-center py-4 text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>Sem dados</div>
                                                ) : (() => {
                                                    const totalHour = Object.values(byHour).reduce((a, b) => a + b, 0);

                                                    // Agrupar horas em blocos de 3h para melhor visualização
                                                    const hourBlocks = [
                                                        { range: '00-02', hours: [0,1,2], icon: '🌙', label: 'Madrugada' },
                                                        { range: '03-05', hours: [3,4,5], icon: '🌙', label: 'Madrugada' },
                                                        { range: '06-08', hours: [6,7,8], icon: '🌅', label: 'Manhã' },
                                                        { range: '09-11', hours: [9,10,11], icon: '☀️', label: 'Manhã' },
                                                        { range: '12-14', hours: [12,13,14], icon: '🌤️', label: 'Tarde' },
                                                        { range: '15-17', hours: [15,16,17], icon: '🌤️', label: 'Tarde' },
                                                        { range: '18-20', hours: [18,19,20], icon: '🌆', label: 'Noite' },
                                                        { range: '21-23', hours: [21,22,23], icon: '🌃', label: 'Noite' }
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
                                                                if (block.label === 'Madrugada') {
                                                                    colorClass = intensity > 0.7 ? 'bg-purple-600' : intensity > 0.4 ? 'bg-purple-500' : intensity > 0.1 ? 'bg-purple-400' : (themeClasses.bgTertiary(darkMode));
                                                                } else if (block.label === 'Manhã') {
                                                                    colorClass = intensity > 0.7 ? 'bg-orange-600' : intensity > 0.4 ? 'bg-orange-500' : intensity > 0.1 ? 'bg-orange-400' : (themeClasses.bgTertiary(darkMode));
                                                                } else if (block.label === 'Tarde') {
                                                                    colorClass = intensity > 0.7 ? 'bg-yellow-600' : intensity > 0.4 ? 'bg-yellow-500' : intensity > 0.1 ? 'bg-yellow-400' : (themeClasses.bgTertiary(darkMode));
                                                                } else {
                                                                    colorClass = intensity > 0.7 ? 'bg-blue-600' : intensity > 0.4 ? 'bg-blue-500' : intensity > 0.1 ? 'bg-blue-400' : (themeClasses.bgTertiary(darkMode));
                                                                }

                                                                return (
                                                                    <div key={block.range} className="flex items-center gap-3">
                                                                        <div className={'text-xl w-8 text-center'}>
                                                                            {block.icon}
                                                                        </div>
                                                                        <div className={'text-sm font-medium w-16 ' + (themeClasses.textSecondary(darkMode))}>
                                                                            {block.range}h
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className={(themeClasses.bgTertiaryAlt(darkMode)) + ' rounded-full h-8 overflow-hidden relative'}>
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
                                                            <div className={'text-xs mt-4 pt-3 border-t flex items-center justify-center gap-4 ' + (darkMode ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200')}>
                                                                <span>💡 Intensidade de cor = frequência de consumos</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Por período do dia */}
                                            <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                <h3 className={'font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>🌅 Por Período do Dia</h3>
                                                {(() => {
                                                    const total = byPartOfDay.manha + byPartOfDay.tarde + byPartOfDay.noite + byPartOfDay.madrugada;
                                                    if (total === 0) return <div className={'text-center py-4 text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>Sem dados</div>;

                                                    const manhaPercent = Math.round((byPartOfDay.manha / total) * 100);
                                                    const tardePercent = Math.round((byPartOfDay.tarde / total) * 100);
                                                    const noitePercent = Math.round((byPartOfDay.noite / total) * 100);
                                                    const madrugadaPercent = Math.round((byPartOfDay.madrugada / total) * 100);

                                                    return (
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            <div className={(darkMode ? 'bg-yellow-900/30 border-yellow-700/50' : 'bg-yellow-50 border-yellow-200') + ' rounded-lg p-4 text-center border'}>
                                                                <div className="text-2xl mb-2">🌅</div>
                                                                <div className={'text-xs mb-1 ' + (themeClasses.textSecondary(darkMode))}>Manhã</div>
                                                                <div className={'text-xs mb-2 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>6h-12h</div>
                                                                <div className={'text-xl font-bold ' + (darkMode ? 'text-yellow-400' : 'text-yellow-600')}>{manhaPercent}%</div>
                                                                <div className={'text-xs mt-1 ' + (themeClasses.textTertiary(darkMode))}>{byPartOfDay.manha}x</div>
                                                            </div>
                                                            <div className={(darkMode ? 'bg-orange-900/30 border-orange-700/50' : 'bg-orange-50 border-orange-200') + ' rounded-lg p-4 text-center border'}>
                                                                <div className="text-2xl mb-2">☀️</div>
                                                                <div className={'text-xs mb-1 ' + (themeClasses.textSecondary(darkMode))}>Tarde</div>
                                                                <div className={'text-xs mb-2 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>12h-18h</div>
                                                                <div className={'text-xl font-bold ' + (darkMode ? 'text-orange-400' : 'text-orange-600')}>{tardePercent}%</div>
                                                                <div className={'text-xs mt-1 ' + (themeClasses.textTertiary(darkMode))}>{byPartOfDay.tarde}x</div>
                                                            </div>
                                                            <div className={(darkMode ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' rounded-lg p-4 text-center border'}>
                                                                <div className="text-2xl mb-2">🌙</div>
                                                                <div className={'text-xs mb-1 ' + (themeClasses.textSecondary(darkMode))}>Noite</div>
                                                                <div className={'text-xs mb-2 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>18h-24h</div>
                                                                <div className={'text-xl font-bold ' + (darkMode ? 'text-indigo-400' : 'text-indigo-600')}>{noitePercent}%</div>
                                                                <div className={'text-xs mt-1 ' + (themeClasses.textTertiary(darkMode))}>{byPartOfDay.noite}x</div>
                                                            </div>
                                                            <div className={(darkMode ? 'bg-purple-900/30 border-purple-700/50' : 'bg-purple-50 border-purple-200') + ' rounded-lg p-4 text-center border'}>
                                                                <div className="text-2xl mb-2">⭐</div>
                                                                <div className={'text-xs mb-1 ' + (themeClasses.textSecondary(darkMode))}>Madrugada</div>
                                                                <div className={'text-xs mb-2 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>0h-6h</div>
                                                                <div className={'text-xl font-bold ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>{madrugadaPercent}%</div>
                                                                <div className={'text-xs mt-1 ' + (themeClasses.textTertiary(darkMode))}>{byPartOfDay.madrugada}x</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Por dia da semana */}
                                            <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                <h3 className={'font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>📅 Por Dia da Semana</h3>
                                                <div className="space-y-3">
                                                    {Object.values(byWeekday).every(v => v === 0) ? (
                                                        <div className={'text-center py-4 text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>Sem dados</div>
                                                    ) : (() => {
                                                        const totalWeekday = Object.values(byWeekday).reduce((a, b) => a + b, 0);
                                                        return Object.entries(byWeekday).map(([day, count]) => {
                                                            const percent = totalWeekday > 0 ? Math.round((count / totalWeekday) * 100) : 0;
                                                            return (
                                                                <div key={day} className="flex items-center gap-2">
                                                                    <div className={'text-xs w-10 font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>{weekdayNames[parseInt(day)]}</div>
                                                                    <div className={'flex-1 rounded-full h-7 overflow-hidden ' + (themeClasses.bgTertiary(darkMode))}>
                                                                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full flex items-center justify-between px-3 text-white text-xs font-medium transition-all" style={{width: Math.min(100, (count / Math.max(...Object.values(byWeekday))) * 100) + '%'}}>
                                                                            <span>{count}x</span>
                                                                            <span>{percent}%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                            );
                                        }

                                        // ESTRUTURAL
                                        if (patternView === 'estrutural') {
                                            // Calcular intervalos entre consumos
                                            const sorted = [...filteredConsumptions].sort((a,b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
                                            const intervals = [];
                                            for (let i = 1; i < sorted.length; i++) {
                                                const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
                                                intervals.push({ hours: diff, date: sorted[i].date });
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {/* Análise de Intervalos */}
                                                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>⏱️ Intervalos Entre Consumos</h3>
                                                        {intervals.length === 0 ? (
                                                            <div className={'text-center py-4 text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                Sem intervalos (necessário ≥2 consumos)
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
                                                                        <div className={`${darkMode ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border-purple-200'} rounded-lg p-3 text-center border`}>
                                                                            <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{intervals.length}</div>
                                                                            <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</div>
                                                                        </div>
                                                                        <div className={`${darkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-50 border-blue-200'} rounded-lg p-3 text-center border`}>
                                                                            <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{avgInterval.toFixed(1)}h</div>
                                                                            <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Média</div>
                                                                        </div>
                                                                        <div className={`${darkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-50 border-green-200'} rounded-lg p-3 text-center border`}>
                                                                            <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{maxInterval.toFixed(1)}h</div>
                                                                            <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Máximo</div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-3">
                                                                        {/* Bons intervalos (≥2h) */}
                                                                        <div className={`${darkMode ? 'bg-green-900/20 border border-green-700/50' : 'bg-green-50 border border-green-200'} rounded-lg p-4`}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                                                                    <span>✅</span>
                                                                                    <span>Intervalos Bons (≥2h)</span>
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                                                                    {goodIntervals.length} ({goodPercent}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-full h-3 overflow-hidden`}>
                                                                                <div className="bg-green-500 h-full transition-all duration-500" style={{width: goodPercent + '%'}}></div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Intervalos curtos (<2h) */}
                                                                        <div className={`${darkMode ? 'bg-orange-900/20 border border-orange-700/50' : 'bg-orange-50 border border-orange-200'} rounded-lg p-4`}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                                                                                    <span>⚠️</span>
                                                                                    <span>Intervalos Curtos (&lt;2h)</span>
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                                                                                    {shortIntervals.length} ({shortPercent}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-full h-3 overflow-hidden`}>
                                                                                <div className="bg-orange-500 h-full transition-all duration-500" style={{width: shortPercent + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className={`${darkMode ? 'bg-indigo-900/20 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200'} rounded-lg p-3 mt-4 border`}>
                                                                        <p className={`text-xs leading-relaxed ${themeClasses.textSecondary(darkMode)}`}>
                                                                            {goodPercent >= 50
                                                                                ? '🌟 Ótimo! Mais de metade dos intervalos são ≥2h. Continua assim!'
                                                                                : '💪 Foca-te em aumentar o tempo entre consumos. Cada melhoria conta!'}
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
                                                        const dailyDosageRecords = filteredDailyLogs.filter(log => log.mg && log.mg > 0);

                                                        if (dailyDosageRecords.length === 0) {
                                                            return (
                                                                <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>💊 Análise de Dosagens</h3>
                                                                    <div className={'text-center py-4 text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                        Sem dosagens diárias registadas neste período
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
                                                        let trendText = 'Estáveis';
                                                        let trendPercent = 0;
                                                        let trendColor = darkMode ? 'text-blue-400' : 'text-blue-600';
                                                        let trendBg = darkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200';

                                                        if (firstHalf.length > 0 && secondHalf.length > 0) {
                                                            const avgFirst = firstHalf.reduce((sum, log) => sum + log.mg, 0) / firstHalf.length;
                                                            const avgSecond = secondHalf.reduce((sum, log) => sum + log.mg, 0) / secondHalf.length;
                                                            const change = ((avgSecond - avgFirst) / avgFirst) * 100;
                                                            trendPercent = Math.abs(change);

                                                            if (change > 5) {
                                                                trendIcon = '📈';
                                                                trendText = `Aumentaram ${trendPercent.toFixed(0)}%`;
                                                                trendColor = darkMode ? 'text-red-400' : 'text-red-600';
                                                                trendBg = darkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200';
                                                            } else if (change < -5) {
                                                                trendIcon = '📉';
                                                                trendText = `Diminuíram ${trendPercent.toFixed(0)}%`;
                                                                trendColor = darkMode ? 'text-green-400' : 'text-green-600';
                                                                trendBg = darkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200';
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
                                                            <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                <h3 className={'font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>💊 Análise de Dosagens</h3>

                                                                {/* Estatísticas Gerais */}
                                                                <div className="grid grid-cols-4 gap-3 mb-4">
                                                                    <div className={`${darkMode ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border-purple-200'} rounded-lg p-3 text-center border`}>
                                                                        <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{dailyDosageRecords.length}</div>
                                                                        <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Registos</div>
                                                                    </div>
                                                                    <div className={`${darkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-50 border-blue-200'} rounded-lg p-3 text-center border`}>
                                                                        <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{avgDosage.toFixed(1)}mg</div>
                                                                        <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Média</div>
                                                                    </div>
                                                                    <div className={`${darkMode ? 'bg-orange-900/30 border border-orange-700/50' : 'bg-orange-50 border-orange-200'} rounded-lg p-3 text-center border`}>
                                                                        <div className={`text-2xl font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{maxDosage}mg</div>
                                                                        <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Máximo</div>
                                                                    </div>
                                                                    <div className={`${darkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-50 border-green-200'} rounded-lg p-3 text-center border`}>
                                                                        <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{minDosage}mg</div>
                                                                        <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Mínimo</div>
                                                                    </div>
                                                                </div>

                                                                {/* Tendência */}
                                                                <div className={`${trendBg} rounded-lg p-4 border mb-4`}>
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <div className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tendência no período</div>
                                                                            <div className={`text-2xl font-bold ${trendColor}`}>
                                                                                {trendIcon} {trendText}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                        Comparação entre primeira e segunda metade do período
                                                                    </p>
                                                                </div>

                                                                {/* Distribuição */}
                                                                <div className="space-y-3">
                                                                    <div className={'text-sm font-medium mb-2 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>
                                                                        Distribuição de Dosagens
                                                                        {rangeMethod === 'meta' && (
                                                                            <span className={`text-xs ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                                (baseado na tua meta de {reduceQuantityGoal.target}mg)
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {ranges.baixa > 0 && (
                                                                        <div className={`${darkMode ? 'bg-green-900/20 border border-green-700/50' : 'bg-green-50 border border-green-200'} rounded-lg p-3`}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                                                                    🟢 Baixa (&lt;{Math.round(lowThreshold)}mg)
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                                                                    {ranges.baixa} ({((ranges.baixa / dosages.length) * 100).toFixed(0)}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-full h-2 overflow-hidden`}>
                                                                                <div className="bg-green-500 h-full transition-all duration-500" style={{width: ((ranges.baixa / dosages.length) * 100) + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {ranges.media > 0 && (
                                                                        <div className={`${darkMode ? 'bg-yellow-900/20 border border-yellow-700/50' : 'bg-yellow-50 border border-yellow-200'} rounded-lg p-3`}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                                                                                    🟡 Média ({Math.round(lowThreshold)}-{Math.round(highThreshold)}mg)
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                                                                                    {ranges.media} ({((ranges.media / dosages.length) * 100).toFixed(0)}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-full h-2 overflow-hidden`}>
                                                                                <div className="bg-yellow-500 h-full transition-all duration-500" style={{width: ((ranges.media / dosages.length) * 100) + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {ranges.alta > 0 && (
                                                                        <div className={`${darkMode ? 'bg-red-900/20 border border-red-700/50' : 'bg-red-50 border border-red-200'} rounded-lg p-3`}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                                                                                    🔴 Alta (≥{Math.round(highThreshold)}mg)
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                                                                                    {ranges.alta} ({((ranges.alta / dosages.length) * 100).toFixed(0)}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-full h-2 overflow-hidden`}>
                                                                                <div className="bg-red-500 h-full transition-all duration-500" style={{width: ((ranges.alta / dosages.length) * 100) + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* 📆 CICLO MENSUAL */}
                                                    {Object.keys(byDate).length >= 15 && (() => {
                                                        // Agrupar consumos por dia do mês (1-31)
                                                        const dayOfMonthData = {};
                                                        for (let i = 1; i <= 31; i++) {
                                                            dayOfMonthData[i] = [];
                                                        }

                                                        Object.entries(byDate).forEach(([date, count]) => {
                                                            const dayOfMonth = new Date(date).getDate();
                                                            dayOfMonthData[dayOfMonth].push(count);
                                                        });

                                                        // Calcular média por dia do mês
                                                        const dayOfMonthAverages = {};
                                                        Object.entries(dayOfMonthData).forEach(([day, counts]) => {
                                                            if (counts.length > 0) {
                                                                dayOfMonthAverages[day] = counts.reduce((sum, c) => sum + c, 0) / counts.length;
                                                            }
                                                        });

                                                        // Encontrar padrões (dias com maior/menor consumo)
                                                        const sortedDays = Object.entries(dayOfMonthAverages)
                                                            .filter(([_, avg]) => avg > 0)
                                                            .sort(([,a], [,b]) => b - a);

                                                        if (sortedDays.length < 5) return null;

                                                        // Identificar pico (dias 20-25 do mês, se relevante)
                                                        const days2025 = sortedDays.filter(([day]) => parseInt(day) >= 20 && parseInt(day) <= 25);
                                                        const avgDays2025 = days2025.length > 0
                                                            ? days2025.reduce((sum, [_, avg]) => sum + avg, 0) / days2025.length
                                                            : 0;
                                                        const overallAvg = sortedDays.reduce((sum, [_, avg]) => sum + avg, 0) / sortedDays.length;
                                                        const hasPeak2025 = avgDays2025 > overallAvg * 1.2;

                                                        const maxDay = sortedDays[0];
                                                        const minDay = sortedDays[sortedDays.length - 1];

                                                        return (
                                                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border mt-4'}>
                                                                <h3 className={'font-semibold mb-4 ' + (darkMode ? 'text-purple-300' : 'text-gray-800')}>
                                                                    📆 Ciclo Mensual
                                                                </h3>

                                                                {/* Gráfico de linha/área por dia do mês */}
                                                                <div className="space-y-2 mb-4">
                                                                    {sortedDays.slice(0, 10).map(([day, avg]) => {
                                                                        const dayNum = parseInt(day);
                                                                        const maxAvg = parseFloat(sortedDays[0][1]);
                                                                        const widthPercent = (avg / maxAvg) * 100;
                                                                        const isPeak = dayNum >= 20 && dayNum <= 25 && hasPeak2025;

                                                                        return (
                                                                            <div key={day} className="space-y-1">
                                                                                <div className="flex items-center justify-between text-sm">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={'font-medium w-10 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                            Dia {day}
                                                                                        </span>
                                                                                        {isPeak && <span className={'text-xs px-2 py-0.5 rounded-full ' + (darkMode ? 'bg-orange-900/50 text-orange-400' : 'bg-orange-100 text-orange-700')}>📈 Pico</span>}
                                                                                    </div>
                                                                                    <span className={'font-semibold ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>
                                                                                        {avg.toFixed(1)}/dia
                                                                                    </span>
                                                                                </div>
                                                                                <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-2 overflow-hidden'}>
                                                                                    <div
                                                                                        className={'h-full rounded-full transition-all duration-500 ' + (
                                                                                            isPeak
                                                                                                ? 'bg-gradient-to-r from-orange-500 to-red-500'
                                                                                                : avg > overallAvg * 1.2
                                                                                                    ? 'bg-gradient-to-r from-red-500 to-pink-500'
                                                                                                    : avg < overallAvg * 0.8
                                                                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                                                                                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                                                                        )}
                                                                                        style={{ width: `${widthPercent}%` }}
                                                                                    ></div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Resumo */}
                                                                <div className={'pt-3 border-t text-sm ' + (darkMode ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700')}>
                                                                    {hasPeak2025 ? (
                                                                        <p>
                                                                            Pico de consumo entre <span className={'font-semibold ' + (darkMode ? 'text-orange-400' : 'text-orange-600')}>dias 20-25</span> do mês ({avgDays2025.toFixed(1)}/dia vs {overallAvg.toFixed(1)}/dia média). Padrão hormonal?
                                                                        </p>
                                                                    ) : (
                                                                        <p>
                                                                            Dia <span className={'font-semibold ' + (darkMode ? 'text-red-400' : 'text-red-600')}>{maxDay[0]}</span> do mês tem maior consumo ({parseFloat(maxDay[1]).toFixed(1)}/dia).
                                                                            Dia <span className={'font-semibold ' + (darkMode ? 'text-green-400' : 'text-green-600')}>{minDay[0]}</span> tem menor ({parseFloat(minDay[1]).toFixed(1)}/dia).
                                                                        </p>
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
