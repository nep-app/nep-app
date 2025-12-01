import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { themeClasses } from '../utils/classNames';
import { safeDate } from '../utils/helpers';

export function HistoryView() {
    const {
        consumptions, wellbeingLogs, cycles, dailyLogs, reflections, thoughts,
        deleteItem: deleteGenericItem, loadFullHistory, isFullHistoryLoaded
    } = useData();
    const { darkMode, setShowEditConsumptionModal, setEditingConsumption } = useUI();

    // Local State
    const [historyPeriod, setHistoryPeriod] = useState('tudo');
    const [historyPeriodOffset, setHistoryPeriodOffset] = useState(0);
    const [historyTopic, setHistoryTopic] = useState('todos'); // todos, consumo, ciclos, bem-estar, dbt, pensamentos

    // Pagination Limits
    const [limits, setLimits] = useState({
        reflections: 10,
        thoughts: 10,
        wellbeing: 14,
        consumptions: 20
    });

    // Load full history when entering this view
    useEffect(() => {
        loadFullHistory();
    }, []);

    // Filter Logic
    const filteredData = useMemo(() => {
        const dateRange = analyticsService.getDateRangeForPeriod(historyPeriod, historyPeriodOffset);

        let filtered = {
            reflections: analyticsService.filterByDateRange(reflections, dateRange),
            wellbeing: analyticsService.filterByDateRange(wellbeingLogs, dateRange),
            dailyLogs: analyticsService.filterByDateRange(dailyLogs, dateRange, 'date'),
            consumptions: analyticsService.filterByDateRange(consumptions, dateRange),
            cycles: analyticsService.filterByDateRange(cycles, dateRange),
            thoughts: analyticsService.filterByDateRange(thoughts, dateRange)
        };

        // Apply Topic Filter
        if (historyTopic === 'consumo') {
            filtered.reflections = []; filtered.wellbeing = []; filtered.dailyLogs = []; filtered.cycles = []; filtered.thoughts = [];
        } else if (historyTopic === 'ciclos') {
            filtered.consumptions = []; filtered.wellbeing = []; filtered.reflections = []; filtered.thoughts = [];
        } else if (historyTopic === 'bem-estar') {
            filtered.consumptions = []; filtered.reflections = []; filtered.dailyLogs = []; filtered.cycles = []; filtered.thoughts = [];
        } else if (historyTopic === 'dbt') {
            filtered.consumptions = []; filtered.wellbeing = []; filtered.dailyLogs = []; filtered.cycles = []; filtered.thoughts = [];
        } else if (historyTopic === 'pensamentos') {
            filtered.consumptions = []; filtered.wellbeing = []; filtered.dailyLogs = []; filtered.cycles = []; filtered.reflections = [];
        }

        return filtered;
    }, [consumptions, wellbeingLogs, cycles, dailyLogs, reflections, thoughts, historyPeriod, historyPeriodOffset, historyTopic]);

    const { reflections: fReflections, wellbeing: fWellbeing, dailyLogs: fDailyLogs, consumptions: fConsumptions, cycles: fCycles, thoughts: fThoughts } = filteredData;
    const hasData = fReflections.length > 0 || fWellbeing.length > 0 || fDailyLogs.length > 0 || fConsumptions.length > 0 || fCycles.length > 0 || fThoughts.length > 0;

    // Helper for delete
    const handleDelete = async (collection, id) => {
        if (!window.confirm('Tens a certeza?')) return;
        if (deleteGenericItem) {
            await deleteGenericItem(collection, id);
        }
    };

    const openEditConsumption = (c) => {
        setEditingConsumption({...c});
        setShowEditConsumptionModal(true);
    };

    return (
        <div className="space-y-6">
            <h2 className={'text-2xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>Histórico</h2>

            {/* Filters */}
            <div className={themeClasses.container(darkMode) + ' rounded-xl p-4 border'}>
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
                            <button onClick={() => setHistoryPeriodOffset(prev => prev + 1)} className={'text-purple-600 p-2 rounded-lg transition-colors ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50')}>
                                <Icons.ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className={'text-sm font-medium min-w-[120px] text-center ' + (themeClasses.textSecondary(darkMode))}>{analyticsService.getPeriodLabel(historyPeriod, historyPeriodOffset)}</span>
                            <button onClick={() => setHistoryPeriodOffset(prev => Math.max(0, prev - 1))} disabled={historyPeriodOffset === 0} className={'p-2 rounded-lg transition-colors ' + (historyPeriodOffset === 0 ? (darkMode ? 'text-gray-600' : 'text-gray-300') + ' cursor-not-allowed' : 'text-purple-600 ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50'))}>
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
                    { id: 'dbt', label: '🎯 Reflexões' },
                    { id: 'pensamentos', label: '📝 Pensamentos' }
                ].map(topic => (
                    <button key={topic.id} onClick={() => setHistoryTopic(topic.id)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ' + (historyTopic === topic.id ? 'bg-indigo-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                        {topic.label}
                    </button>
                ))}
            </div>

            {!hasData ? (
                <div className="bg-white rounded-xl p-6 border border-gray-200 text-center text-gray-500">Sem registos neste período</div>
            ) : (
                <div className="space-y-6">
                    {/* Consumptions */}
                    {fConsumptions.length > 0 && (
                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}><Icons.Clock className="w-4 h-4 text-purple-600" /> Consumos ({fConsumptions.length})</h3>
                            <div className="space-y-3">
                                {fConsumptions.slice(0, limits.consumptions).map(c => (
                                    <div key={c.id} className={(darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200') + ' p-3 rounded-lg border'}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className={'font-medium ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                    {new Date(c.timestamp).toLocaleDateString('pt-PT')} - {new Date(c.timestamp).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}
                                                </div>
                                                {c.notes && <div className={'text-sm mt-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>💭 {c.notes}</div>}
                                            </div>
                                            <div className="flex gap-2 ml-2">
                                                <button onClick={() => openEditConsumption(c)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete('consumptions', c.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {fConsumptions.length > limits.consumptions && (
                                <button onClick={() => setLimits(prev => ({...prev, consumptions: prev.consumptions + 20}))} className={(darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                    Ver mais ({fConsumptions.length - limits.consumptions} restantes)
                                </button>
                            )}
                        </div>
                    )}

                    {/* Cycles */}
                    {fCycles.length > 0 && (
                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}>🌙 Ciclos ({fCycles.length})</h3>
                            <div className="space-y-3">
                                {fCycles.map(cycle => (
                                    <div key={cycle.id} className={(darkMode ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' p-3 rounded-lg border'}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className={'text-sm font-medium ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                {(() => {
                                                    const d = safeDate(cycle.timestamp);
                                                    return d ? `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : 'Data inválida';
                                                })()}
                                            </div>
                                            <button onClick={() => handleDelete('cycles', cycle.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        {cycle.bedtime && <div className={'text-sm ' + (themeClasses.textSecondary(darkMode))}>Deitar: {cycle.bedtime}</div>}
                                        {cycle.triggers && <div className={'text-sm ' + (themeClasses.textSecondary(darkMode))}>Gatilhos: {cycle.triggers.join(', ')}</div>}
                                        {cycle.notes && <div className={'text-sm italic ' + (themeClasses.textTertiary(darkMode))}>{cycle.notes}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Wellbeing */}
                    {fWellbeing.length > 0 && (
                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}><Icons.Heart className={'w-4 h-4 ' + (darkMode ? 'text-blue-400' : 'text-blue-600')} /> Bem-Estar ({fWellbeing.length})</h3>
                            <div className="space-y-3">
                                {fWellbeing.slice(0, limits.wellbeing).map(w => (
                                    <div key={w.id} className={(darkMode ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-50 border-blue-200') + ' p-3 rounded-lg border'}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className={'text-sm font-medium ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                {(() => {
                                                    const d = safeDate(w.timestamp || w.date);
                                                    return d ? d.toLocaleDateString('pt-PT') : 'Data inválida';
                                                })()}
                                            </div>
                                            <button onClick={() => handleDelete('wellbeingLogs', w.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
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
                                        {w.notes && <div className={'text-sm italic ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>{w.notes}</div>}
                                    </div>
                                ))}
                            </div>
                            {fWellbeing.length > limits.wellbeing && (
                                <button onClick={() => setLimits(prev => ({...prev, wellbeing: prev.wellbeing + 14}))} className={(darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                    Ver mais ({fWellbeing.length - limits.wellbeing} restantes)
                                </button>
                            )}
                        </div>
                    )}

                    {/* Reflections */}
                    {fReflections.length > 0 && (
                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}><Icons.Brain className={'w-4 h-4 ' + (darkMode ? 'text-purple-400' : 'text-purple-600')} /> Reflexões ({fReflections.length})</h3>
                            <div className="space-y-4">
                                {fReflections.slice(0, limits.reflections).map(r => (
                                    <div key={r.id} className={(darkMode ? 'border-purple-500 bg-purple-900/30' : 'border-purple-400 bg-purple-50') + ' border-l-4 pl-4 py-2 rounded-r-lg'}>
                                        <div className="flex justify-between items-start mb-1">
                                            <div className={'text-xs ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                {(() => {
                                                    const d = safeDate(r.timestamp || r.date);
                                                    return d ? d.toLocaleDateString('pt-PT') : 'Data inválida';
                                                })()}
                                            </div>
                                            <button onClick={() => handleDelete('reflections', r.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <div className={'text-sm font-medium mb-1 ' + (darkMode ? 'text-purple-400' : 'text-purple-700')}>{r.question}</div>
                                        <div className={'text-sm ' + (themeClasses.textSecondary(darkMode))}>{r.answer}</div>
                                    </div>
                                ))}
                            </div>
                            {fReflections.length > limits.reflections && (
                                <button onClick={() => setLimits(prev => ({...prev, reflections: prev.reflections + 10}))} className={(darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                    Ver mais ({fReflections.length - limits.reflections} restantes)
                                </button>
                            )}
                        </div>
                    )}

                    {/* Thoughts */}
                    {fThoughts.length > 0 && (
                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}><Icons.BookOpen className={'w-4 h-4 ' + (darkMode ? 'text-pink-400' : 'text-pink-600')} /> Pensamentos ({fThoughts.length})</h3>
                            <div className="space-y-4">
                                {fThoughts.slice(0, limits.thoughts).map(t => (
                                    <div key={t.id} className={(darkMode ? 'border-pink-500 bg-pink-900/30' : 'border-pink-400 bg-pink-50') + ' border-l-4 pl-4 py-2 rounded-r-lg'}>
                                        <div className="flex justify-between items-start mb-1">
                                            <div className={'text-xs ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                {(() => {
                                                    const d = safeDate(t.timestamp || t.date);
                                                    return d ? d.toLocaleDateString('pt-PT') : 'Data inválida';
                                                })()}
                                            </div>
                                            <button onClick={() => handleDelete('thoughts', t.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <div className={'text-sm ' + (themeClasses.textSecondary(darkMode))}>{t.content}</div>
                                    </div>
                                ))}
                            </div>
                            {fThoughts.length > limits.thoughts && (
                                <button onClick={() => setLimits(prev => ({...prev, thoughts: prev.thoughts + 10}))} className={(darkMode ? 'text-pink-400 hover:text-pink-300' : 'text-pink-600 hover:text-pink-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                    Ver mais ({fThoughts.length - limits.thoughts} restantes)
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
