import React, { useMemo } from 'react';
import * as Icons from '../Icons';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { safeToISODate, safeDate } from '../../utils/helpers';

export default function PatternsView() {
    const {
        patternsPeriod, setPatternsPeriod, patternsPeriodOffset, setPatternsPeriodOffset,
        patternView, setPatternView
    } = useUI();

    const {
        consumptions, dailyLogs, wellbeingLogs, cycles, goals
    } = useData();

    const darkMode = true;

    // Helper Functions
    const getDateRangeForPeriod = (period, offset = 0) => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        let start, end;

        if (period === 'hoje') {
            end = new Date(now);
            end.setDate(end.getDate() - offset);
            start = new Date(end);
            start.setHours(0, 0, 0, 0);
        } else if (period === 'semana') {
            end = new Date(now);
            end.setDate(end.getDate() - (offset * 7));
            start = new Date(end);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
        } else if (period === 'mes') {
            end = new Date(now);
            end.setDate(end.getDate() - (offset * 30));
            start = new Date(end);
            start.setDate(start.getDate() - 29);
            start.setHours(0, 0, 0, 0);
        } else {
            return { start: null, end: null };
        }
        return { start, end };
    };

    const getPeriodLabel = (period, offset) => {
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

    const filterByDateRange = (items, dateRange, dateField = 'timestamp') => {
        if (!dateRange.start || !dateRange.end) return items;
        return items.filter(item => {
            const itemDate = new Date(item[dateField]);
            return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });
    };

    const getTabClass = (isActive) => {
        const baseClass = 'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ';
        if (isActive) {
            return baseClass + (darkMode ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white');
        }
        return baseClass + (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200');
    };

    // Filter Data
    const filteredData = useMemo(() => {
        const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
        return {
            consumptions: filterByDateRange(consumptions, dateRange),
            wellbeing: filterByDateRange(wellbeingLogs, dateRange),
            cycles: filterByDateRange(cycles, dateRange),
            dailyLogs: filterByDateRange(dailyLogs, dateRange, 'date'),
            dateRange
        };
    }, [consumptions, wellbeingLogs, cycles, dailyLogs, patternsPeriod, patternsPeriodOffset]);

    // Dashboard Analysis
    const dashboardData = useMemo(() => {
        const { consumptions } = filteredData;
        if (consumptions.length === 0) return null;

        const byDate = {};
        consumptions.forEach(c => { byDate[c.date] = (byDate[c.date] || 0) + 1; });

        const sorted = [...consumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
        const intervals = [];
        for (let i = 1; i < sorted.length; i++) {
            const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
            intervals.push(diff);
        }
        const avgInterval = intervals.length > 0 ? (intervals.reduce((sum, i) => sum + i, 0) / intervals.length).toFixed(1) : 0;

        return {
            total: consumptions.length,
            avgPerDay: (consumptions.length / Object.keys(byDate).length).toFixed(1),
            avgInterval,
            dates: Object.keys(byDate).sort(),
            byDate
        };
    }, [filteredData.consumptions]);

    // Structural Analysis
    const structuralData = useMemo(() => {
        const { consumptions } = filteredData;
        if (consumptions.length === 0) return null;

        const byHour = {};
        const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
        const byWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        consumptions.forEach(c => {
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

        return { byHour, byPartOfDay, byWeekday, weekdayNames, total: consumptions.length };
    }, [filteredData.consumptions]);

    // Progress Analysis
    const progressData = useMemo(() => {
        // Define recent vs previous period
        const now = new Date();
        let recentStart, recentEnd, previousStart, previousEnd;

        if (patternsPeriod === 'hoje') {
            recentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            recentEnd = now;
            previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
            previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        } else if (patternsPeriod === 'semana') {
            recentStart = new Date(now);
            recentStart.setDate(now.getDate() - 7);
            recentEnd = now;
            previousStart = new Date(now);
            previousStart.setDate(now.getDate() - 14);
            previousEnd = recentStart;
        } else { // mes or tudo (defaults to 30 days comparison)
            recentStart = new Date(now);
            recentStart.setDate(now.getDate() - 30);
            recentEnd = now;
            previousStart = new Date(now);
            previousStart.setDate(now.getDate() - 60);
            previousEnd = recentStart;
        }

        const filterPeriod = (items, start, end) => items.filter(item => {
            const d = new Date(item.timestamp || item.date);
            return d >= start && d <= end;
        });

        const recentConsumptions = filterPeriod(consumptions, recentStart, recentEnd);
        const previousConsumptions = filterPeriod(consumptions, previousStart, previousEnd);

        // Calculate Frequency
        const calcFreq = (items) => {
            if (items.length === 0) return 0;
            const days = new Set(items.map(i => i.date)).size;
            return days > 0 ? items.length / days : 0;
        };

        const recentFreq = calcFreq(recentConsumptions);
        const previousFreq = calcFreq(previousConsumptions);

        const calculateChange = (recent, previous, lowerIsBetter = true) => {
            if (previous === 0 && recent === 0) return { percent: 0, direction: 'stable', isImprovement: false };
            if (previous === 0) return { percent: 100, direction: 'up', isImprovement: !lowerIsBetter };
            if (recent === 0) return { percent: 100, direction: 'down', isImprovement: lowerIsBetter };

            const change = ((recent - previous) / previous) * 100;
            const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
            const isImprovement = lowerIsBetter ? change < 0 : change > 0;
            return { percent: Math.abs(change), direction, isImprovement };
        };

        return {
            frequency: {
                recent: recentFreq,
                previous: previousFreq,
                change: calculateChange(recentFreq, previousFreq, true),
                label: 'Frequência média diária'
            },
        };
    }, [consumptions, patternsPeriod]);

    return (
        <div className="space-y-6">
            <h2 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Padrões</h2>

            {/* Temporal Filters */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border'}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-2 flex-wrap">
                        {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                            <button
                                key={period}
                                onClick={() => { setPatternsPeriod(period); setPatternsPeriodOffset(0); }}
                                className={getTabClass(patternsPeriod === period) + ' text-sm'}
                            >
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
                            <span className={'text-sm font-medium min-w-[120px] text-center ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>{getPeriodLabel(patternsPeriod, patternsPeriodOffset)}</span>
                            <button onClick={() => setPatternsPeriodOffset(Math.max(0, patternsPeriodOffset - 1))} disabled={patternsPeriodOffset === 0} className={'p-2 rounded-lg transition-colors ' + (patternsPeriodOffset === 0 ? (darkMode ? 'text-gray-600' : 'text-gray-300') + ' cursor-not-allowed' : 'text-purple-600 ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50'))}>
                                <Icons.ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {['dashboard', 'progress', 'estrutural'].map(view => (
                    <button
                        key={view}
                        onClick={() => setPatternView(view)}
                        className={getTabClass(patternView === view)}
                    >
                        {view === 'dashboard' && '📊 Dashboard'}
                        {view === 'progress' && '📈 Progresso'}
                        {view === 'estrutural' && '📊 Estrutural'}
                    </button>
                ))}
            </div>

            {patternView === 'dashboard' && (
                <>
                    {!dashboardData ? (
                        <div className={(darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500') + ' rounded-xl p-6 border text-center'}>Sem dados para este período</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className={(darkMode ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border-purple-200') + ' rounded-lg p-4 text-center border'}>
                                    <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Total</div>
                                    <div className={(darkMode ? 'text-purple-400' : 'text-purple-600') + ' text-2xl font-bold'}>{dashboardData.total}x</div>
                                </div>
                                <div className={(darkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-50 border-blue-200') + ' rounded-lg p-4 text-center border'}>
                                    <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Média/dia</div>
                                    <div className={(darkMode ? 'text-blue-400' : 'text-blue-600') + ' text-2xl font-bold'}>{dashboardData.avgPerDay}</div>
                                </div>
                                <div className={(darkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-50 border-green-200') + ' rounded-lg p-4 text-center border'}>
                                    <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Intervalo médio</div>
                                    <div className={(darkMode ? 'text-green-400' : 'text-green-600') + ' text-2xl font-bold'}>{dashboardData.avgInterval}h</div>
                                </div>
                            </div>

                            {/* Mini Calendar */}
                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border relative'}>
                                <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4'}>
                                    📅 {patternsPeriod === 'hoje' ? 'Hoje' : patternsPeriod === 'semana' ? 'Esta Semana' : patternsPeriod === 'mes' ? 'Este Mês' : 'Todo o Período'}
                                </h3>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto" style={{scrollbarWidth: 'thin'}}>
                                    {dashboardData.dates.reverse().map(date => {
                                        const count = dashboardData.byDate[date];
                                        const dayConsumptions = filteredData.consumptions.filter(c => c.date === date).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                                        return (
                                            <div key={date} className={(darkMode ? 'border-gray-700' : 'border-gray-200') + ' border rounded-lg p-3'}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-800')}>{new Date(date).toLocaleDateString('pt-PT', {weekday: 'short', day: '2-digit', month: 'short'})}</div>
                                                    <div className={'text-lg font-bold ' + (count >= 10 ? (darkMode ? 'text-red-400' : 'text-red-600') : count > 6 ? (darkMode ? 'text-orange-400' : 'text-orange-600') : count > 3 ? (darkMode ? 'text-yellow-500' : 'text-yellow-600') : (darkMode ? 'text-green-400' : 'text-green-600'))}>{count}x</div>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {dayConsumptions.map((c, i) => (
                                                        <span key={i} className={'text-xs px-2 py-1 rounded ' + (darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700')}>{new Date(c.timestamp).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {patternView === 'estrutural' && structuralData && (
                <div className="space-y-4">
                    {/* Por horário */}
                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                        <h3 className={'font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>🕐 Consumo por Horário</h3>
                        {Object.keys(structuralData.byHour).length === 0 ? (
                            <div className={'text-center py-4 text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>Sem dados</div>
                        ) : (() => {
                            const totalHour = structuralData.total;
                            const maxCount = Math.max(...Object.values(structuralData.byHour));

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

                            return (
                                <div className="space-y-2">
                                    {hourBlocks.map(block => {
                                        const blockCount = block.hours.reduce((sum, h) => sum + (structuralData.byHour[h] || 0), 0);
                                        const blockPercent = totalHour > 0 ? Math.round((blockCount / totalHour) * 100) : 0;
                                        const intensity = maxCount > 0 ? (blockCount / maxCount) : 0;

                                        let colorClass = '';
                                        if (block.label === 'Madrugada') colorClass = intensity > 0.7 ? 'bg-purple-600' : intensity > 0.4 ? 'bg-purple-500' : intensity > 0.1 ? 'bg-purple-400' : (darkMode ? 'bg-gray-700' : 'bg-gray-100');
                                        else if (block.label === 'Manhã') colorClass = intensity > 0.7 ? 'bg-orange-600' : intensity > 0.4 ? 'bg-orange-500' : intensity > 0.1 ? 'bg-orange-400' : (darkMode ? 'bg-gray-700' : 'bg-gray-100');
                                        else if (block.label === 'Tarde') colorClass = intensity > 0.7 ? 'bg-yellow-600' : intensity > 0.4 ? 'bg-yellow-500' : intensity > 0.1 ? 'bg-yellow-400' : (darkMode ? 'bg-gray-700' : 'bg-gray-100');
                                        else colorClass = intensity > 0.7 ? 'bg-blue-600' : intensity > 0.4 ? 'bg-blue-500' : intensity > 0.1 ? 'bg-blue-400' : (darkMode ? 'bg-gray-700' : 'bg-gray-100');

                                        return (
                                            <div key={block.range} className="flex items-center gap-3">
                                                <div className={'text-xl w-8 text-center'}>{block.icon}</div>
                                                <div className={'text-sm font-medium w-16 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>{block.range}h</div>
                                                <div className="flex-1">
                                                    <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-8 overflow-hidden relative'}>
                                                        <div className={colorClass + ' h-full flex items-center px-4 text-white text-sm font-bold transition-all duration-300'} style={{width: Math.max(blockPercent, blockCount > 0 ? 8 : 0) + '%'}}>
                                                            {blockCount > 0 && <span className="whitespace-nowrap">{blockCount}x {blockPercent > 0 && `· ${blockPercent}%`}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Por período do dia */}
                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                        <h3 className={'font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>🌅 Por Período do Dia</h3>
                        {(() => {
                            const total = structuralData.byPartOfDay.manha + structuralData.byPartOfDay.tarde + structuralData.byPartOfDay.noite + structuralData.byPartOfDay.madrugada;
                            if (total === 0) return <div className={'text-center py-4 text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>Sem dados</div>;

                            const manhaPercent = Math.round((structuralData.byPartOfDay.manha / total) * 100);
                            const tardePercent = Math.round((structuralData.byPartOfDay.tarde / total) * 100);
                            const noitePercent = Math.round((structuralData.byPartOfDay.noite / total) * 100);
                            const madrugadaPercent = Math.round((structuralData.byPartOfDay.madrugada / total) * 100);

                            return (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className={(darkMode ? 'bg-yellow-900/30 border-yellow-700/50' : 'bg-yellow-50 border-yellow-200') + ' rounded-lg p-4 text-center border'}>
                                        <div className="text-2xl mb-2">🌅</div>
                                        <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Manhã</div>
                                        <div className={'text-xl font-bold ' + (darkMode ? 'text-yellow-400' : 'text-yellow-600')}>{manhaPercent}%</div>
                                        <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>{structuralData.byPartOfDay.manha}x</div>
                                    </div>
                                    <div className={(darkMode ? 'bg-orange-900/30 border-orange-700/50' : 'bg-orange-50 border-orange-200') + ' rounded-lg p-4 text-center border'}>
                                        <div className="text-2xl mb-2">☀️</div>
                                        <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Tarde</div>
                                        <div className={'text-xl font-bold ' + (darkMode ? 'text-orange-400' : 'text-orange-600')}>{tardePercent}%</div>
                                        <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>{structuralData.byPartOfDay.tarde}x</div>
                                    </div>
                                    <div className={(darkMode ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' rounded-lg p-4 text-center border'}>
                                        <div className="text-2xl mb-2">🌙</div>
                                        <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Noite</div>
                                        <div className={'text-xl font-bold ' + (darkMode ? 'text-indigo-400' : 'text-indigo-600')}>{noitePercent}%</div>
                                        <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>{structuralData.byPartOfDay.noite}x</div>
                                    </div>
                                    <div className={(darkMode ? 'bg-purple-900/30 border-purple-700/50' : 'bg-purple-50 border-purple-200') + ' rounded-lg p-4 text-center border'}>
                                        <div className="text-2xl mb-2">⭐</div>
                                        <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Madrugada</div>
                                        <div className={'text-xl font-bold ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>{madrugadaPercent}%</div>
                                        <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>{structuralData.byPartOfDay.madrugada}x</div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Por dia da semana */}
                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                        <h3 className={'font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>📅 Por Dia da Semana</h3>
                        <div className="space-y-3">
                            {Object.values(structuralData.byWeekday).every(v => v === 0) ? (
                                <div className={'text-center py-4 text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>Sem dados</div>
                            ) : (() => {
                                const totalWeekday = Object.values(structuralData.byWeekday).reduce((a, b) => a + b, 0);
                                return Object.entries(structuralData.byWeekday).map(([day, count]) => {
                                    const percent = totalWeekday > 0 ? Math.round((count / totalWeekday) * 100) : 0;
                                    return (
                                        <div key={day} className="flex items-center gap-2">
                                            <div className={'text-xs w-10 font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>{structuralData.weekdayNames[parseInt(day)]}</div>
                                            <div className={'flex-1 rounded-full h-7 overflow-hidden ' + (darkMode ? 'bg-gray-700' : 'bg-gray-100')}>
                                                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full flex items-center justify-between px-3 text-white text-xs font-medium transition-all" style={{width: Math.min(100, (count / Math.max(...Object.values(structuralData.byWeekday))) * 100) + '%'}}>
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
            )}

            {patternView === 'progress' && progressData && (
                <div className="space-y-4">
                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                        <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                            💊 Consumo
                        </h3>
                        <div className="space-y-3">
                            <div className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                        {progressData.frequency.label}
                                    </span>
                                    {progressData.frequency.change.direction !== 'stable' && (
                                        <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.frequency.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                            {progressData.frequency.change.direction === 'up' ? '↑' : '↓'} {progressData.frequency.change.percent.toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                        {progressData.frequency.recent.toFixed(1)}
                                    </span>
                                    <span className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                                        consumos/dia
                                    </span>
                                    <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                        antes: {progressData.frequency.previous.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
