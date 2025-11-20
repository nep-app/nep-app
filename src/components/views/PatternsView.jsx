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

    // Helper Functions (duplicated from App.jsx logic, now localized)
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

    // Simplified Analysis Logic (Ported from App.jsx)
    // Ideally, complex analysis logic should move to a hook or utility file
    // But for now keeping it in view to match current logic
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

    return (
        <div className="space-y-6">
            <h2 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Padrões</h2>

            {/* Temporal Filters */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border'}>
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
                    <button key={view} onClick={() => setPatternView(view)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ' + (patternView === view ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
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

            {/* Placeholder for other sub-views if needed, or implement full logic */}
            {patternView === 'progress' && (
                <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border text-center text-gray-500'}>
                    Funcionalidade de Progresso migrada em breve.
                </div>
            )}

            {patternView === 'estrutural' && (
                <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border text-center text-gray-500'}>
                     Funcionalidade Estrutural migrada em breve.
                </div>
            )}
        </div>
    );
}
