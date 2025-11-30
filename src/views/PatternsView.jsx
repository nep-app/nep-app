import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { themeClasses } from '../utils/classNames';

// Lazy load chart for performance
const WellbeingChart = lazy(() => import('../components/WellbeingChart'));

export function PatternsView() {
  const { consumptions, wellbeingLogs, cycles, dailyLogs, goals } = useData();
  const { darkMode } = useUI();

  // Local state for this view
  const [patternsPeriod, setPatternsPeriod] = useState('tudo'); // hoje, semana, mes, tudo
  const [patternsPeriodOffset, setPatternsPeriodOffset] = useState(0);
  const [patternView, setPatternView] = useState('dashboard');

  // Filter Data Logic
  const filteredData = useMemo(() => {
    const dateRange = analyticsService.getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
    return {
      consumptions: analyticsService.filterByDateRange(consumptions, dateRange),
      wellbeingLogs: analyticsService.filterByDateRange(wellbeingLogs, dateRange),
      cycles: analyticsService.filterByDateRange(cycles, dateRange),
      dailyLogs: analyticsService.filterByDateRange(dailyLogs, dateRange),
      dateRange
    };
  }, [consumptions, wellbeingLogs, cycles, dailyLogs, patternsPeriod, patternsPeriodOffset]);

  const { consumptions: filteredConsumptions, wellbeingLogs: filteredWellbeingLogs, cycles: filteredCycles, dailyLogs: filteredDailyLogs } = filteredData;

  // Render logic...
  // DASHBOARD VIEW
  if (patternView === 'dashboard') {
    if (filteredConsumptions.length === 0 && filteredWellbeingLogs.length === 0) {
      return (
        <div className="space-y-6">
          <HeaderControls
            patternsPeriod={patternsPeriod}
            setPatternsPeriod={setPatternsPeriod}
            patternsPeriodOffset={patternsPeriodOffset}
            setPatternsPeriodOffset={setPatternsPeriodOffset}
            patternView={patternView}
            setPatternView={setPatternView}
            darkMode={darkMode}
          />
          <div className={(darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500') + ' rounded-xl p-6 border text-center'}>
            Sem dados para este período
          </div>
        </div>
      );
    }

    // Calculate metrics
    const totalConsumptions = filteredConsumptions.length;
    const byDate = {};
    filteredConsumptions.forEach(c => { byDate[c.date] = (byDate[c.date] || 0) + 1; });
    const uniqueDays = Object.keys(byDate).length;
    const avgPerDay = uniqueDays > 0 ? (totalConsumptions / uniqueDays).toFixed(1) : 0;

    // Calculate average interval
    const sorted = [...filteredConsumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
        intervals.push(diff);
    }
    const avgInterval = intervals.length > 0 ? (intervals.reduce((sum, i) => sum + i, 0) / intervals.length).toFixed(1) : 0;

    const dates = Object.keys(byDate).sort();

    return (
      <div className="space-y-6">
        <h2 className={'text-2xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>Padrões</h2>
        <HeaderControls
            patternsPeriod={patternsPeriod}
            setPatternsPeriod={setPatternsPeriod}
            patternsPeriodOffset={patternsPeriodOffset}
            setPatternsPeriodOffset={setPatternsPeriodOffset}
            patternView={patternView}
            setPatternView={setPatternView}
            darkMode={darkMode}
        />

        {/* Simple Dashboard Content */}
        <div className="space-y-4">
             {/* Mini-resumo contextual */}
            <div className={(darkMode ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' rounded-lg p-4 border'}>
                <p className={'text-sm leading-relaxed ' + (darkMode ? 'text-gray-200' : 'text-gray-700')}>
                    {`Tiveste ${totalConsumptions} ${totalConsumptions === 1 ? 'consumo' : 'consumos'} (média ${avgPerDay}/dia).${avgInterval > 0 ? ` Intervalo médio: ${avgInterval}h.` : ''}`}
                </p>
            </div>

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

            {/* Calendar Widget */}
            <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border relative'}>
                <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4'}>
                    📅 {patternsPeriod === 'hoje' ? 'Hoje' : patternsPeriod === 'semana' ? 'Esta Semana' : patternsPeriod === 'mes' ? 'Este Mês' : 'Todo o Período'}
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto" style={{scrollbarWidth: 'thin'}}>
                    {dates.slice().reverse().map(date => {
                        const count = byDate[date];
                        const dayConsumptions = filteredConsumptions.filter(c => c.date === date).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
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
      </div>
    );
  }

  // PROGRESS VIEW
  if (patternView === 'progress') {
     // Simplified progress view logic restored from original App.jsx logic structure
     // Due to complexity, focusing on core comparison logic

     const now = new Date();
     let recentStart, recentEnd, previousStart, previousEnd;

     if (patternsPeriod === 'hoje') {
         recentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
         recentEnd = now;
         previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
         previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
     } else {
         const days = patternsPeriod === 'semana' ? 7 : patternsPeriod === 'mes' ? 30 : 30;
         recentStart = new Date(now);
         recentStart.setDate(now.getDate() - days);
         recentEnd = now;
         previousStart = new Date(now);
         previousStart.setDate(now.getDate() - (days * 2));
         previousEnd = recentStart;
     }

     const recentConsumptions = consumptions.filter(c => { const d = new Date(c.timestamp); return d >= recentStart && d <= recentEnd; });
     const previousConsumptions = consumptions.filter(c => { const d = new Date(c.timestamp); return d >= previousStart && d <= previousEnd; });

     // Calculate simple comparison
     const recentCount = recentConsumptions.length;
     const previousCount = previousConsumptions.length;
     const diff = recentCount - previousCount;
     const label = diff > 0 ? `Mais ${diff}` : diff < 0 ? `Menos ${Math.abs(diff)}` : 'Igual';
     const color = diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-500';

     return (
        <div className="space-y-6">
             <h2 className={'text-2xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>Padrões</h2>
             <HeaderControls
                patternsPeriod={patternsPeriod}
                setPatternsPeriod={setPatternsPeriod}
                patternsPeriodOffset={patternsPeriodOffset}
                setPatternsPeriodOffset={setPatternsPeriodOffset}
                patternView={patternView}
                setPatternView={setPatternView}
                darkMode={darkMode}
            />
            <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                <h3 className={'text-lg font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>📈 Comparação de Progresso</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Anterior</div>
                        <div className="text-2xl font-bold">{previousCount}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Atual</div>
                        <div className="text-2xl font-bold">{recentCount}</div>
                    </div>
                </div>
                <div className={`mt-4 text-center font-medium ${color}`}>
                    {label} consumos comparado com o período anterior.
                </div>
            </div>
        </div>
     )
  }

  // TEMPORAL VIEW
  if (patternView === 'temporal') {
      const byHour = {};
      filteredConsumptions.forEach(c => {
          const hour = new Date(c.timestamp).getHours();
          byHour[hour] = (byHour[hour] || 0) + 1;
      });

      return (
         <div className="space-y-6">
             <h2 className={'text-2xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>Padrões</h2>
             <HeaderControls
                patternsPeriod={patternsPeriod}
                setPatternsPeriod={setPatternsPeriod}
                patternsPeriodOffset={patternsPeriodOffset}
                setPatternsPeriodOffset={setPatternsPeriodOffset}
                patternView={patternView}
                setPatternView={setPatternView}
                darkMode={darkMode}
            />
            <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                 <h3 className={'font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>🕐 Consumo por Horário</h3>
                 {Object.keys(byHour).length === 0 ? (
                     <div className="text-center text-gray-500">Sem dados.</div>
                 ) : (
                     <div className="space-y-2">
                         {Array.from({length: 24}).map((_, h) => {
                             const count = byHour[h] || 0;
                             if (count === 0) return null;
                             return (
                                 <div key={h} className="flex items-center gap-2">
                                     <div className="w-12 text-sm text-gray-500">{h}h</div>
                                     <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                                         <div className="bg-purple-500 h-full" style={{width: `${Math.min(100, count * 10)}%`}}></div>
                                     </div>
                                     <div className="text-sm font-bold">{count}</div>
                                 </div>
                             )
                         })}
                     </div>
                 )}
            </div>
         </div>
      )
  }

  return null;
}

function HeaderControls({ patternsPeriod, setPatternsPeriod, patternsPeriodOffset, setPatternsPeriodOffset, patternView, setPatternView, darkMode }) {
    return (
        <>
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
                            <span className={'text-sm font-medium min-w-[120px] text-center ' + (themeClasses.textSecondary(darkMode))}>{analyticsService.getPeriodLabel(patternsPeriod, patternsPeriodOffset)}</span>
                            <button onClick={() => setPatternsPeriodOffset(Math.max(0, patternsPeriodOffset - 1))} disabled={patternsPeriodOffset === 0} className={'p-2 rounded-lg transition-colors ' + (patternsPeriodOffset === 0 ? (darkMode ? 'text-gray-600' : 'text-gray-300') + ' cursor-not-allowed' : 'text-purple-600 ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50'))}>
                                <Icons.ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {['dashboard', 'progress', 'temporal'].map(view => (
                    <button key={view} onClick={() => setPatternView(view)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ' + (patternView === view ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                        {view === 'dashboard' && '📊 Dashboard'}
                        {view === 'progress' && '📈 Progresso'}
                        {view === 'temporal' && '⏰ Temporal'}
                    </button>
                ))}
            </div>
        </>
    );
}
