import React, { useMemo } from 'react';
import * as Icons from '../Icons';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { getTodayKey, safeToISODate, safeDate } from '../../utils/helpers';

export default function HistoryView() {
    const {
        historyPeriod, setHistoryPeriod, historyPeriodOffset, setHistoryPeriodOffset,
        historyTopic, setHistoryTopic, reflectionsToShow, setReflectionsToShow,
        wellbeingToShow, setWellbeingToShow, openEditConsumption
    } = useUI();

    const {
        consumptions, dailyLogs, wellbeingLogs, cycles, reflections, deleteItem
    } = useData();

    const darkMode = true;

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

    const filterByDateRange = (items, dateRange, dateField = 'timestamp') => {
        if (!dateRange.start || !dateRange.end) return items;
        return items.filter(item => {
            const itemDate = new Date(item[dateField]);
            return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });
    };

    const filteredData = useMemo(() => {
        const dateRange = getDateRangeForPeriod(historyPeriod, historyPeriodOffset);
        const tempFilteredReflections = filterByDateRange(reflections, dateRange);
        const tempFilteredWellbeing = filterByDateRange(wellbeingLogs, dateRange);
        const tempFilteredDailyLogs = filterByDateRange(dailyLogs, dateRange, 'date');
        const tempFilteredConsumptions = filterByDateRange(consumptions, dateRange);
        const tempFilteredCycles = filterByDateRange(cycles, dateRange);

        let filteredReflections = tempFilteredReflections;
        let filteredWellbeing = tempFilteredWellbeing;
        let filteredDailyLogs = tempFilteredDailyLogs;
        let filteredConsumptions = tempFilteredConsumptions;
        let filteredCycles = tempFilteredCycles;

        if (historyTopic === 'consumo') {
            filteredReflections = []; filteredWellbeing = []; filteredDailyLogs = []; filteredCycles = [];
        } else if (historyTopic === 'ciclos') {
            filteredConsumptions = []; filteredWellbeing = []; filteredDailyLogs = []; filteredReflections = [];
        } else if (historyTopic === 'bem-estar') {
            filteredConsumptions = []; filteredReflections = []; filteredDailyLogs = []; filteredCycles = [];
        } else if (historyTopic === 'dbt') {
            filteredConsumptions = []; filteredWellbeing = []; filteredDailyLogs = []; filteredCycles = [];
        } else if (historyTopic === 'registos') {
            filteredConsumptions = []; filteredReflections = []; filteredWellbeing = []; filteredCycles = [];
        }

        return {
            reflections: filteredReflections,
            wellbeing: filteredWellbeing,
            dailyLogs: filteredDailyLogs,
            consumptions: filteredConsumptions,
            cycles: filteredCycles,
            hasData: filteredReflections.length > 0 || filteredWellbeing.length > 0 || filteredDailyLogs.length > 0 || filteredConsumptions.length > 0 || filteredCycles.length > 0
        };
    }, [reflections, wellbeingLogs, dailyLogs, consumptions, cycles, historyPeriod, historyPeriodOffset, historyTopic]);

    return (
        <div className="space-y-6">
            <h2 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Histórico</h2>

            {/* Temporal Filters */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border'}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-2 flex-wrap">
                        {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                            <button key={period} onClick={() => { setHistoryPeriod(period); setHistoryPeriodOffset(0); }} className={'px-4 py-2 rounded-lg font-medium transition-colors text-sm ' + (historyPeriod === period ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                {period === 'hoje' && '📅 Hoje'}
                                {period === 'semana' && '📊 Semana'}
                                {period === 'mes' && '📈 Mês'}
                                {period === 'tudo' && '🌐 Tudo'}
                            </button>
                        ))}
                    </div>
                    {historyPeriod !== 'tudo' && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setHistoryPeriodOffset(historyPeriodOffset + 1)} className={'text-purple-600 p-2 rounded-lg transition-colors ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50')}>
                                <Icons.ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className={'text-sm font-medium min-w-[120px] text-center ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>{getPeriodLabel(historyPeriod, historyPeriodOffset)}</span>
                            <button onClick={() => setHistoryPeriodOffset(Math.max(0, historyPeriodOffset - 1))} disabled={historyPeriodOffset === 0} className={'p-2 rounded-lg transition-colors ' + (historyPeriodOffset === 0 ? (darkMode ? 'text-gray-600' : 'text-gray-300') + ' cursor-not-allowed' : 'text-purple-600 ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50'))}>
                                <Icons.ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Topic Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'todos', label: '📋 Todos' },
                    { id: 'consumo', label: '💊 Consumos' },
                    { id: 'ciclos', label: '🌙 Ciclos' },
                    { id: 'bem-estar', label: '💚 Bem-estar' },
                    { id: 'registos', label: '📝 Registos Diários' },
                    { id: 'dbt', label: '🎯 DBT' }
                ].map(topic => (
                    <button key={topic.id} onClick={() => setHistoryTopic(topic.id)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ' + (historyTopic === topic.id ? 'bg-indigo-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                        {topic.label}
                    </button>
                ))}
            </div>

            {!filteredData.hasData ? (
                <div className="bg-white rounded-xl p-6 border border-gray-200 text-center text-gray-500">Sem registos neste período</div>
            ) : (
                <div className="space-y-6">
                    {filteredData.reflections.length > 0 && (
                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}><Icons.Brain className={'w-4 h-4 ' + (darkMode ? 'text-purple-400' : 'text-purple-600')} /> Reflexões DBT ({filteredData.reflections.length})</h3>
                            <div className="space-y-4">
                                {filteredData.reflections.slice(0, reflectionsToShow).map(r => (
                                    <div key={r.id} className={(darkMode ? 'border-purple-500 bg-purple-900/30' : 'border-purple-400 bg-purple-50') + ' border-l-4 pl-4 py-2 rounded-r-lg'}>
                                        <div className="flex justify-between items-start mb-1">
                                            <div className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                                                {(() => {
                                                    const d = safeDate(r.timestamp || r.date);
                                                    if (!d) return 'Data inválida';
                                                    const dateStr = d.toLocaleDateString('pt-PT');
                                                    const timeStr = r.timestamp ? ` ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : '';
                                                    return dateStr + timeStr;
                                                })()}
                                            </div>
                                            <button onClick={() => deleteItem('reflections', r.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <div className={'text-sm font-medium mb-1 ' + (darkMode ? 'text-purple-400' : 'text-purple-700')}>{r.question}</div>
                                        <div className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>{r.answer}</div>
                                    </div>
                                ))}
                            </div>
                            {filteredData.reflections.length > reflectionsToShow && (
                                <button onClick={() => setReflectionsToShow(prev => prev + 10)} className={(darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                    Ver mais ({filteredData.reflections.length - reflectionsToShow} restantes)
                                </button>
                            )}
                        </div>
                    )}

                    {filteredData.wellbeing.length > 0 && (
                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}><Icons.Heart className={'w-4 h-4 ' + (darkMode ? 'text-blue-400' : 'text-blue-600')} /> Bem-Estar ({filteredData.wellbeing.length})</h3>
                            <div className="space-y-3">
                                {filteredData.wellbeing.slice(0, wellbeingToShow).map(w => (
                                    <div key={w.id} className={(darkMode ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-50 border-blue-200') + ' p-3 rounded-lg border'}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className={'text-sm font-medium ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                {(() => {
                                                    const d = safeDate(w.timestamp || w.date);
                                                    return d ? d.toLocaleDateString('pt-PT') : 'Data inválida';
                                                })()}
                                            </div>
                                            <button onClick={() => deleteItem('wellbeingLogs', w.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                                            <div className="text-center">
                                                <div className={'text-xs ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Sono</div>
                                                <div className={'text-lg font-bold ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>{w.sleep}h</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={'text-xs ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Humor</div>
                                                <div className={'text-lg font-bold ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>{w.mood}/10</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={'text-xs ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Energia</div>
                                                <div className={'text-lg font-bold ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>{w.energy || '-'}/10</div>
                                            </div>
                                        </div>
                                        {w.emotions && w.emotions.length > 0 && (
                                            <div className="mb-2">
                                                <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>Emoções:</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {w.emotions.map((emotion, i) => (
                                                        <span key={i} className={(darkMode ? 'bg-blue-800/50 text-blue-300' : 'bg-blue-100 text-blue-700') + ' text-xs px-2 py-1 rounded'}>
                                                            {emotion}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {w.notes && (
                                            <div className={'text-sm mt-2 italic ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>
                                                💭 {w.notes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {filteredData.wellbeing.length > wellbeingToShow && (
                                <button onClick={() => setWellbeingToShow(prev => prev + 14)} className={(darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                    Ver mais ({filteredData.wellbeing.length - wellbeingToShow} restantes)
                                </button>
                            )}
                        </div>
                    )}

                    {filteredData.dailyLogs.length > 0 && (
                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}>📊 Registos Diários ({filteredData.dailyLogs.length})</h3>
                            <div className="space-y-3">
                                {filteredData.dailyLogs.map(l => (
                                    <div key={l.id} className={(darkMode ? 'bg-pink-900/30 border-pink-700/50' : 'bg-pink-50 border-pink-200') + ' p-3 rounded-lg border'}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className={'text-sm font-medium ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                {(() => {
                                                    const d = safeDate(l.timestamp || l.date);
                                                    return d ? d.toLocaleDateString('pt-PT') : 'Data inválida';
                                                })()}
                                            </div>
                                            <button onClick={() => deleteItem('dailyLogs', l.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <div className="flex gap-4 text-sm">
                                            <div>
                                                <span className={(darkMode ? 'text-gray-300' : 'text-gray-600')}>Quantidade: </span>
                                                <span className={'font-bold ' + (darkMode ? 'text-pink-400' : 'text-pink-600')}>{l.mg}mg</span>
                                            </div>
                                        </div>
                                        {l.notes && <div className={'text-sm mt-2 italic ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>💭 {l.notes}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {filteredData.consumptions.length > 0 && (
                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}><Icons.Clock className="w-4 h-4 text-purple-600" /> Consumos ({filteredData.consumptions.length})</h3>
                            <div className="space-y-3">
                                {filteredData.consumptions.map(c => (
                                    <div key={c.id} className={(darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200') + ' p-3 rounded-lg border'}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className={'font-medium ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                    {new Date(c.timestamp).toLocaleDateString('pt-PT')} - {new Date(c.timestamp).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}
                                                </div>
                                                {c.notes && <div className={'text-sm mt-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>💭 {c.notes}</div>}
                                            </div>
                                            <div className="flex gap-2 ml-2">
                                                <button onClick={() => openEditConsumption(c)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>
                                                <button onClick={() => deleteItem('consumptions', c.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {filteredData.cycles.length > 0 && (
                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}>🌙 Ciclos ({filteredData.cycles.length})</h3>
                            <div className="space-y-3">
                                {filteredData.cycles.map(cycle => (
                                    <div key={cycle.id} className={(darkMode ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' p-3 rounded-lg border'}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className={'text-sm font-medium ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                {(() => {
                                                    const d = safeDate(cycle.timestamp);
                                                    return d ? `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : 'Data inválida';
                                                })()}
                                            </div>
                                            <button onClick={() => deleteItem('cycles', cycle.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        {cycle.bedtime && (
                                            <div className={'text-sm mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                <span className={(darkMode ? 'text-gray-400' : 'text-gray-600')}>Hora de deitar: </span>
                                                <span className="font-medium">{cycle.bedtime}</span>
                                            </div>
                                        )}
                                        {cycle.triggers && cycle.triggers.length > 0 && (
                                            <div className={'text-sm mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                <span className={(darkMode ? 'text-gray-400' : 'text-gray-600')}>Gatilhos: </span>
                                                <span className="font-medium">{cycle.triggers.join(', ')}</span>
                                            </div>
                                        )}
                                        {cycle.notes && <div className={'text-sm mt-2 italic ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>💭 {cycle.notes}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
