import React from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import { formatDateTime, formatDateShort, formatDateWithWeekday, safeDate } from '../utils/helpers';

const { getDateRangeForPeriod, filterByDateRange, getPeriodLabel } = analyticsService;

export function HistoryView({
    historyPeriod,
    setHistoryPeriod,
    historyPeriodOffset,
    setHistoryPeriodOffset,
    historyTopic,
    setHistoryTopic,
    reflectionsToShow,
    setReflectionsToShow,
    wellbeingToShow,
    setWellbeingToShow,
    cyclesHistoryToShow,
    setCyclesHistoryToShow,
    thoughtsToShow,
    setThoughtsToShow,
    openEditConsumption,
    deleteItem
}) {
    const { consumptions, reflections, wellbeingLogs, cycles, thoughts, dailyLogs, db } = useData();
    const { darkMode } = useUI();
    const metrics = useMetrics();

    return (
                                <div className="space-y-6">
                                    <h2 className={'text-2xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>Histórico</h2>

                                    {/* Temporal Filters */}
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
                                                    <button onClick={() => setHistoryPeriodOffset(historyPeriodOffset + 1)} className={'text-purple-600 p-2 rounded-lg transition-colors ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50')}>
                                                        <Icons.ChevronLeft className="w-5 h-5" />
                                                    </button>
                                                    <span className={'text-sm font-medium min-w-[120px] text-center ' + (themeClasses.textSecondary(darkMode))}>{getPeriodLabel(historyPeriod, historyPeriodOffset)}</span>
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
                                            { id: 'dbt', label: '🎯 Reflexões' },
                                            { id: 'pensamentos', label: '📝 Pensamentos' }
                                        ].map(topic => (
                                            <button key={topic.id} onClick={() => setHistoryTopic(topic.id)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ' + (historyTopic === topic.id ? 'bg-indigo-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                                {topic.label}
                                            </button>
                                        ))}
                                    </div>

                                    {(() => {
                                        // Apply temporal filter
                                        const dateRange = getDateRangeForPeriod(historyPeriod, historyPeriodOffset);

                                        const tempFilteredReflections = filterByDateRange(reflections, dateRange)
                                            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
                                        const tempFilteredWellbeing = filterByDateRange(wellbeingLogs, dateRange)
                                            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
                                        const tempFilteredDailyLogs = filterByDateRange(dailyLogs, dateRange, 'date')
                                            .sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp));
                                        const tempFilteredConsumptions = filterByDateRange(consumptions, dateRange)
                                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                                        const tempFilteredCycles = filterByDateRange(cycles, dateRange)
                                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                                        const tempFilteredThoughts = filterByDateRange(thoughts, dateRange)
                                            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

                                        // Apply topic filter
                                        let filteredReflections = tempFilteredReflections;
                                        let filteredWellbeing = tempFilteredWellbeing;
                                        let filteredDailyLogs = tempFilteredDailyLogs;
                                        let filteredConsumptions = tempFilteredConsumptions;
                                        let filteredCycles = tempFilteredCycles;
                                        let filteredThoughts = tempFilteredThoughts;

                                        if (historyTopic === 'consumo') {
                                            filteredReflections = [];
                                            filteredWellbeing = [];
                                            filteredDailyLogs = [];
                                            filteredCycles = [];
                                            filteredThoughts = [];
                                        } else if (historyTopic === 'ciclos') {
                                            filteredConsumptions = [];
                                            filteredWellbeing = [];
                                            filteredReflections = [];
                                            filteredThoughts = [];
                                            // Manter filteredDailyLogs para mostrar dentro dos ciclos
                                        } else if (historyTopic === 'bem-estar') {
                                            filteredConsumptions = [];
                                            filteredReflections = [];
                                            filteredDailyLogs = [];
                                            filteredCycles = [];
                                            filteredThoughts = [];
                                        } else if (historyTopic === 'dbt') {
                                            filteredConsumptions = [];
                                            filteredWellbeing = [];
                                            filteredDailyLogs = [];
                                            filteredCycles = [];
                                            filteredThoughts = [];
                                        } else if (historyTopic === 'pensamentos') {
                                            filteredConsumptions = [];
                                            filteredWellbeing = [];
                                            filteredDailyLogs = [];
                                            filteredCycles = [];
                                            filteredReflections = [];
                                        }

                                        const hasData = filteredReflections.length > 0 || filteredWellbeing.length > 0 || filteredDailyLogs.length > 0 || filteredConsumptions.length > 0 || filteredCycles.length > 0 || filteredThoughts.length > 0;

                                        if (!hasData) return (<div className="bg-white rounded-xl p-6 border border-gray-200 text-center text-gray-500">Sem registos neste período</div>);

                                        return (
                                            <div className="space-y-6">
                                                {filteredReflections.length > 0 && (
                                                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}><Icons.Brain className={'w-4 h-4 ' + (darkMode ? 'text-purple-400' : 'text-purple-600')} /> Reflexões diárias ({filteredReflections.length})</h3>
                                                        <div className="space-y-4">
                                                            {filteredReflections.slice(0, reflectionsToShow).map(r => (
                                                                <div key={r.id} className={(darkMode ? 'border-purple-500 bg-purple-900/30' : 'border-purple-400 bg-purple-50') + ' border-l-4 pl-4 py-2 rounded-r-lg'}>
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className={'text-xs ' + (themeClasses.textTertiaryAlt(darkMode))}>
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
                                                                    <div className={'text-sm ' + (themeClasses.textSecondary(darkMode))}>{r.answer}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {filteredReflections.length > reflectionsToShow && (
                                                            <button onClick={() => setReflectionsToShow(prev => prev + 10)} className={(darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                                                Ver mais ({filteredReflections.length - reflectionsToShow} restantes)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {filteredThoughts.length > 0 && (
                                                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}><Icons.BookOpen className={'w-4 h-4 ' + (darkMode ? 'text-pink-400' : 'text-pink-600')} /> Pensamentos ({filteredThoughts.length})</h3>
                                                        <div className="space-y-4">
                                                            {filteredThoughts.slice(0, thoughtsToShow).map(t => (
                                                                <div key={t.id} className={(darkMode ? 'border-pink-500 bg-pink-900/30' : 'border-pink-400 bg-pink-50') + ' border-l-4 pl-4 py-2 rounded-r-lg'}>
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className={'text-xs ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                            {(() => {
                                                                                const d = safeDate(t.timestamp || t.date);
                                                                                if (!d) return 'Data inválida';
                                                                                const dateStr = d.toLocaleDateString('pt-PT');
                                                                                const timeStr = t.timestamp ? ` ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                return dateStr + timeStr;
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('thoughts', t.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    <div className={'text-sm ' + (themeClasses.textSecondary(darkMode))}>{t.content}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {filteredThoughts.length > thoughtsToShow && (
                                                            <button onClick={() => setThoughtsToShow(prev => prev + 10)} className={(darkMode ? 'text-pink-400 hover:text-pink-300' : 'text-pink-600 hover:text-pink-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                                                Ver mais ({filteredThoughts.length - thoughtsToShow} restantes)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {filteredWellbeing.length > 0 && (
                                                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}><Icons.Heart className={'w-4 h-4 ' + (darkMode ? 'text-blue-400' : 'text-blue-600')} /> Bem-Estar ({filteredWellbeing.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredWellbeing.slice(0, wellbeingToShow).map(w => (
                                                                <div key={w.id} className={(darkMode ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-50 border-blue-200') + ' p-3 rounded-lg border'}>
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className={'text-sm font-medium ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                            {(() => {
                                                                                const d = safeDate(w.timestamp || w.date);
                                                                                if (!d) return 'Data inválida';
                                                                                const dateStr = d.toLocaleDateString('pt-PT');
                                                                                const timeStr = w.timestamp ? ` - ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                return dateStr + timeStr;
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
                                                                            <div className={'text-xs mb-1 ' + (themeClasses.textTertiaryAlt(darkMode))}>Emoções:</div>
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
                                                        {filteredWellbeing.length > wellbeingToShow && (
                                                            <button onClick={() => setWellbeingToShow(prev => prev + 14)} className={(darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                                                Ver mais ({filteredWellbeing.length - wellbeingToShow} restantes)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {filteredConsumptions.length > 0 && (
                                                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}><Icons.Clock className="w-4 h-4 text-purple-600" /> Consumos ({filteredConsumptions.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredConsumptions.map(c => (
                                                                <div key={c.id} className={(darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200') + ' p-3 rounded-lg border'}>
                                                                    <div className="flex justify-between items-center">
                                                                        <div>
                                                                            <div className={'font-medium ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                                {formatDateTime(c.timestamp)}
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

                                                {filteredCycles.length > 0 && (
                                                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode)) + ' mb-4 flex items-center gap-2'}>🌙 Ciclos ({filteredCycles.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredCycles.map(cycle => (
                                                                <div key={cycle.id} className={(darkMode ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' p-3 rounded-lg border'}>
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className={'text-sm font-medium ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                            {(() => {
                                                                                const d = safeDate(cycle.timestamp);
                                                                                return d ? `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : 'Data inválida';
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('cycles', cycle.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    {cycle.bedtime && (
                                                                        <div className={'text-sm mb-1 ' + (themeClasses.textSecondary(darkMode))}>
                                                                            <span className={(themeClasses.textTertiary(darkMode))}>Hora de deitar: </span>
                                                                            <span className="font-medium">{cycle.bedtime}</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.sleep && (
                                                                        <div className={'text-sm mb-1 ' + (themeClasses.textSecondary(darkMode))}>
                                                                            <span className={(themeClasses.textTertiary(darkMode))}>Horas de sono: </span>
                                                                            <span className="font-medium">{cycle.sleep}h</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.triggers && cycle.triggers.length > 0 && (
                                                                        <div className={'text-sm mb-1 ' + (themeClasses.textSecondary(darkMode))}>
                                                                            <span className={(themeClasses.textTertiary(darkMode))}>Gatilhos: </span>
                                                                            <span className="font-medium">{cycle.triggers.join(', ')}</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.mg && (
                                                                        <div className={'text-sm mb-1 ' + (themeClasses.textSecondary(darkMode))}>
                                                                            <span className={(themeClasses.textTertiary(darkMode))}>Consumo diário: </span>
                                                                            <span className="font-medium">{cycle.mg} mg</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.lastBefore00 && (
                                                                        <div className={'text-sm mb-1 ' + (darkMode ? 'text-green-300' : 'text-green-700')}>
                                                                            <span>✓ Último consumo antes da meia-noite</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Registos Diários deste ciclo */}
                                                                    {(() => {
                                                                        // Buscar dailyLogs que pertencem a este ciclo (por data)
                                                                        const cycleDailyLogs = filteredDailyLogs.filter(log => {
                                                                            // Comparar por data
                                                                            if (log.date && cycle.date && log.date === cycle.date) return true;
                                                                            // Fallback: derivar data do timestamp
                                                                            if (log.timestamp && cycle.timestamp) {
                                                                                const logDate = new Date(log.timestamp).toISOString().split('T')[0];
                                                                                const cycleDate = new Date(cycle.timestamp).toISOString().split('T')[0];
                                                                                return logDate === cycleDate;
                                                                            }
                                                                            return false;
                                                                        });

                                                                        return cycleDailyLogs.length > 0 && (
                                                                            <div className={'text-xs mt-2 p-2 rounded ' + (darkMode ? 'bg-gray-800/50' : 'bg-gray-100')}>
                                                                                <div className={'font-medium mb-1 ' + (themeClasses.textTertiary(darkMode))}>📝 Registos Diários:</div>
                                                                                {cycleDailyLogs.map(log => (
                                                                                    <div key={log.id} className={'flex justify-between items-center py-1 ' + (themeClasses.textSecondary(darkMode))}>
                                                                                        <div>
                                                                                            {log.mg && <span className="font-medium">{log.mg}mg</span>}
                                                                                            {log.notes && <span className="italic ml-2">- {log.notes}</span>}
                                                                                        </div>
                                                                                        <button onClick={() => deleteItem('dailyLogs', log.id)} className="text-red-600 hover:text-red-700 ml-2"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {cycle.notes && <div className={'text-sm mt-2 italic ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>💭 {cycle.notes}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
    );
}
