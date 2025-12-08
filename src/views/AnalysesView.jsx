import React, { useMemo, lazy, Suspense } from 'react';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import { safeToISODate, formatDateShort, formatDateWithWeekday, formatDateTime, getDateDaysAgo, getTodayPT, timestampToPT } from '../utils/helpers';
import { analyzeMultipleNotes, identifyThemes, getSentimentDescription, getTrendDescription } from '../utils/sentimentAnalysis';
import { useAdvancedInsights } from '../hooks/useAdvancedInsights';

const WellbeingChart = lazy(() => import('../components/WellbeingChart'));

const { getDateRangeForPeriod, filterByDateRange, getPeriodLabel, calculatePearsonCorrelation, getGoalAchievementCount } = analyticsService;

export function AnalysesView({
    analysisSubView,
    setAnalysisSubView,
    patternsPeriod,
    setPatternsPeriod,
    patternsPeriodOffset,
    setPatternsPeriodOffset
}) {
    const { consumptions, wellbeingLogs, cycles, dailyLogs, goals, reflections, thoughts } = useData();
    const { darkMode, currentCycle } = useUI();
    const metrics = useMetrics();

    // Prepare data for insights hook (memoized to prevent infinite loops in hook)
    const { analysisConsumptions, analysisWellbeing, analysisCycles, analysisReflections, analysisDailyLogs, analysisThoughts } = useMemo(() => {
        const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
        return {
            analysisConsumptions: filterByDateRange(consumptions, dateRange),
            analysisWellbeing: filterByDateRange(wellbeingLogs, dateRange),
            analysisCycles: filterByDateRange(cycles, dateRange),
            analysisDailyLogs: filterByDateRange(dailyLogs, dateRange),
            analysisReflections: filterByDateRange(reflections, dateRange),
            analysisThoughts: filterByDateRange(thoughts, dateRange)
        };
    }, [consumptions, wellbeingLogs, cycles, dailyLogs, reflections, thoughts, patternsPeriod, patternsPeriodOffset]);

    const advancedInsights = useAdvancedInsights(analysisConsumptions, analysisWellbeing, analysisCycles, analysisReflections, analysisDailyLogs, analysisThoughts, patternsPeriod);

    // Calculate structural data for other tabs
    const { sorted, intervals } = useMemo(() => {
        const sortedData = [...analysisConsumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
        const intervalsData = [];
        for (let i = 1; i < sortedData.length; i++) {
            const diff = (new Date(sortedData[i].timestamp) - new Date(sortedData[i-1].timestamp)) / (1000 * 60 * 60);
            intervalsData.push({ hours: diff, date: sortedData[i].date });
        }
        return { sorted: sortedData, intervals: intervalsData };
    }, [analysisConsumptions]);

    // Calculate correlations for 'correlacoes' tab
    const correlationData = useMemo(() => {
        if (analysisConsumptions.length < 1) return null;

        const dailyData = {};
        // Count consumptions
        analysisConsumptions.forEach(c => {
            if (!dailyData[c.date]) dailyData[c.date] = { consumptions: 0, sleep: null, mood: null, energy: null };
            dailyData[c.date].consumptions++;
        });
        // Add wellbeing
        analysisWellbeing.forEach(w => {
            const wDate = w.date || safeToISODate(w.timestamp);
            if (!wDate) return;
            if (!dailyData[wDate]) dailyData[wDate] = { consumptions: 0, sleep: null, mood: null, energy: null };
            if (w.sleep) dailyData[wDate].sleep = parseFloat(w.sleep);
            if (w.mood) dailyData[wDate].mood = parseInt(w.mood);
            if (w.energy) dailyData[wDate].energy = parseInt(w.energy);
        });

        const daysWithData = Object.values(dailyData).filter(d => (d.sleep !== null || d.mood !== null || d.energy !== null));
        if (daysWithData.length < 1) return null;

        const correlations = [];
        // Sleep
        const sleepData = daysWithData.filter(d => d.sleep !== null);
        if (sleepData.length >= 2) {
            correlations.push({
                name: 'Sono', icon: '😴', unit: 'h',
                correlation: analyticsService.calculatePearsonCorrelation(sleepData, 'consumptions', 'sleep'),
                average: (sleepData.reduce((s, d) => s + d.sleep, 0) / sleepData.length).toFixed(1),
                dataPoints: sleepData.length
            });
        }
        // Mood
        const moodData = daysWithData.filter(d => d.mood !== null);
        if (moodData.length >= 2) {
            correlations.push({
                name: 'Humor', icon: '😊', unit: '/10',
                correlation: analyticsService.calculatePearsonCorrelation(moodData, 'consumptions', 'mood'),
                average: (moodData.reduce((s, d) => s + d.mood, 0) / moodData.length).toFixed(1),
                dataPoints: moodData.length
            });
        }
        // Energy
        const energyData = daysWithData.filter(d => d.energy !== null);
        if (energyData.length >= 2) {
            correlations.push({
                name: 'Energia', icon: '⚡', unit: '/10',
                correlation: analyticsService.calculatePearsonCorrelation(energyData, 'consumptions', 'energy'),
                average: (energyData.reduce((s, d) => s + d.energy, 0) / energyData.length).toFixed(1),
                dataPoints: energyData.length
            });
        }
        return correlations;
    }, [analysisConsumptions, analysisWellbeing]);

    return (
        <div className="space-y-6">
            <h2 className={'text-2xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>Análises</h2>

            {/* Temporal Filters */}
            <div className={themeClasses.container(darkMode) + ' rounded-xl p-4 border'}>
                <div className="flex items-center justify-between mb-3">
                    <div className={'text-sm font-semibold ' + (themeClasses.textPrimaryAlt(darkMode))}>Período de análise</div>
                    <div className="flex gap-2">
                        <button onClick={() => setPatternsPeriodOffset(prev => prev + 1)} disabled={patternsPeriodOffset >= 100 || patternsPeriod === 'tudo'} className={(patternsPeriodOffset >= 100 || patternsPeriod === 'tudo') ? 'opacity-30 cursor-not-allowed p-1.5 rounded transition' : 'p-1.5 rounded transition hover:bg-gray-700'}>
                            <Icons.ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPatternsPeriodOffset(prev => Math.max(0, prev - 1))} disabled={patternsPeriodOffset === 0 || patternsPeriod === 'tudo'} className={(patternsPeriodOffset === 0 || patternsPeriod === 'tudo') ? 'opacity-30 cursor-not-allowed p-1.5 rounded transition' : 'p-1.5 rounded transition hover:bg-gray-700'}>
                            <Icons.ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                        <button key={period} onClick={() => { setPatternsPeriod(period); setPatternsPeriodOffset(0); }} className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ' + (patternsPeriod === period ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                            {period === 'hoje' && 'Hoje'}
                            {period === 'semana' && 'Semana'}
                            {period === 'mes' && 'Mês'}
                            {period === 'tudo' && 'Tudo'}
                        </button>
                    ))}
                </div>
                {patternsPeriod !== 'tudo' && (
                    <div className={'text-xs mt-2 text-center ' + (themeClasses.textTertiary(darkMode))}>
                        {(() => {
                            const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
                            return new Date(dateRange.start).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ' - ' + new Date(dateRange.end).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
                        })()}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {/* Sub-tab navigation */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['estrutural', 'correlacoes', 'coach'].map(subView => (
                        <button
                            key={subView}
                            onClick={() => setAnalysisSubView(subView)}
                            className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ' + (analysisSubView === subView ? (darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}
                        >
                            {subView === 'estrutural' && '📊 Estrutural'}
                            {subView === 'correlacoes' && '🔗 Correlações'}
                            {subView === 'coach' && '💬 Reflexão Geral'}
                        </button>
                    ))}
                </div>

                {/* TEMPORAL / COACH */}
                {analysisSubView === 'coach' && (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className={(darkMode ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-700/50' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200') + ' rounded-xl p-6 border'}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-4xl">💬</span>
                                <h3 className={'text-2xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                    Reflexão Geral
                                </h3>
                            </div>
                            <p className={'text-xs ' + (themeClasses.textTertiary(darkMode))}>
                                Resumo personalizado do período selecionado
                            </p>
                        </div>

                        {/* Narrative Summary */}
                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                            <div className={'space-y-6 leading-relaxed ' + (darkMode ? 'text-gray-200' : 'text-gray-700')}>
                                {advancedInsights.length > 0 ? (
                                    advancedInsights.map((insight, index) => (
                                        <div key={index} className="border-b border-gray-700/50 pb-4 last:border-0 last:pb-0">
                                            <h4 className={`font-bold mb-2 flex items-center gap-2 ${
                                                insight.level === 'warning' ? (darkMode ? 'text-orange-400' : 'text-orange-600') :
                                                insight.level === 'success' ? (darkMode ? 'text-green-400' : 'text-green-600') :
                                                (darkMode ? 'text-blue-400' : 'text-blue-600')
                                            }`}>
                                                {insight.title}
                                            </h4>

                                            {Array.isArray(insight.content) ? (
                                                <ul className="space-y-2 mb-2">
                                                    {insight.content.map((item, i) => (
                                                        <li key={i} className="flex items-start gap-2">
                                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0"></span>
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="mb-2">{insight.content}</p>
                                            )}

                                            {insight.subContent && (
                                                <p className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {insight.subContent}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 py-4">
                                        Ainda não há dados suficientes para gerar insights avançados neste período. Continue a registar!
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ESTRUTURAL */}
                {analysisSubView === 'estrutural' && (
                    <div className="space-y-4">
                        {/* Análise de Intervalos Simplificada */}
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
                    </div>
                )}

                {/* CORRELAÇÕES */}
                {analysisSubView === 'correlacoes' && (
                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                        <h3 className={'font-semibold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>Correlação Consumos → Bem-estar</h3>
                        {correlationData ? (
                            <div className="space-y-3">
                                {correlationData.map((corr, i) => {
                                    const getCorrelationLabel = (r) => {
                                        if (r === null) return { text: 'Sem dados', color: 'gray' };
                                        if (r < -0.7) return { text: 'Forte Negativa', color: 'red' };
                                        if (r < -0.4) return { text: 'Negativa', color: 'orange' };
                                        if (r > 0.7) return { text: 'Forte Positiva', color: 'green' };
                                        if (r > 0.4) return { text: 'Positiva', color: 'green' };
                                        return { text: 'Sem Correlação', color: 'gray' };
                                    };
                                    const corrLabel = getCorrelationLabel(corr.correlation);
                                    return (
                                        <div key={i} className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-4 border'}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">{corr.icon}</span>
                                                    <div>
                                                        <div className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode))}>{corr.name}</div>
                                                        <div className={'text-xs ' + (themeClasses.textTertiary(darkMode))}>Média: {corr.average}{corr.unit}</div>
                                                    </div>
                                                </div>
                                                <div className={'text-xs px-2 py-1 rounded-full font-medium ' + (corrLabel.color === 'red' ? (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') : corrLabel.color === 'orange' ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700') : corrLabel.color === 'green' ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'))}>
                                                    {corrLabel.text}
                                                </div>
                                            </div>
                                            <div className={'text-xs ' + (themeClasses.textTertiary(darkMode))}>
                                                <span className="ml-2">• r = {corr.correlation !== null ? corr.correlation.toFixed(2) : 'N/A'}</span>
                                                <span className="ml-2">• {corr.dataPoints} dias</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className={'text-sm ' + (themeClasses.textTertiary(darkMode))}>Sem dados suficientes para correlações.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
