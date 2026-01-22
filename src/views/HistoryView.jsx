import React, { useState, useMemo, useCallback } from 'react';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import { formatDateTime, formatDateShort, formatDateWithWeekday, safeDate } from '../utils/helpers';
import { analyzeNote, getSentimentDescription } from '../utils/sentimentAnalysis';
import { GapsReport } from '../components/ui/GapsReport';

const { getDateRangeForPeriod, filterByDateRange, getPeriodLabel } = analyticsService;

// Cache global para análises de sentimento
const sentimentCache = new Map();

// Função com cache para análise de sentimento
const getCachedSentimentAnalysis = (text) => {
    if (!text) return null;

    if (!sentimentCache.has(text)) {
        sentimentCache.set(text, analyzeNote(text));

        // Limitar tamanho do cache para evitar memory leak (máx 500 itens)
        if (sentimentCache.size > 500) {
            const firstKey = sentimentCache.keys().next().value;
            sentimentCache.delete(firstKey);
        }
    }

    return sentimentCache.get(text);
};

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
    allItemsToShow,
    setAllItemsToShow,
    openEditConsumption,
    deleteItem,
    handleFillGap
}) {
    const { consumptions, reflections, wellbeingLogs, cycles, thoughts, dailyLogs, db } = useData();
    const metrics = useMetrics();

    const [expandedAnalysis, setExpandedAnalysis] = useState(null);

    const toggleAnalysis = (id, text) => {
        if (expandedAnalysis === id) {
            setExpandedAnalysis(null);
        } else {
            setExpandedAnalysis(id);
        }
    };

    // Memoizar cálculos de filtragem para evitar recálculos a cada render
    const dateRange = useMemo(
        () => getDateRangeForPeriod(historyPeriod, historyPeriodOffset),
        [historyPeriod, historyPeriodOffset]
    );

    // Filtrar e ordenar dados apenas quando necessário
    const tempFilteredReflections = useMemo(() =>
        filterByDateRange(reflections, dateRange)
            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)),
        [reflections, dateRange]
    );

    const tempFilteredWellbeing = useMemo(() =>
        filterByDateRange(wellbeingLogs, dateRange)
            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)),
        [wellbeingLogs, dateRange]
    );

    const tempFilteredDailyLogs = useMemo(() =>
        filterByDateRange(dailyLogs, dateRange, 'date')
            .sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp)),
        [dailyLogs, dateRange]
    );

    const tempFilteredConsumptions = useMemo(() =>
        filterByDateRange(consumptions, dateRange)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
        [consumptions, dateRange]
    );

    const tempFilteredCycles = useMemo(() =>
        filterByDateRange(cycles, dateRange)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
        [cycles, dateRange]
    );

    const tempFilteredThoughts = useMemo(() =>
        filterByDateRange(thoughts, dateRange)
            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)),
        [thoughts, dateRange]
    );

    // Aplicar filtro de tópico
    const { filteredReflections, filteredWellbeing, filteredDailyLogs, filteredConsumptions, filteredCycles, filteredThoughts } = useMemo(() => {
        if (historyTopic === 'consumos') {
            return {
                filteredReflections: [],
                filteredWellbeing: [],
                filteredCycles: [],
                filteredThoughts: [],
                filteredDailyLogs: tempFilteredDailyLogs,
                filteredConsumptions: tempFilteredConsumptions
            };
        } else if (historyTopic === 'ciclos') {
            return {
                filteredConsumptions: [],
                filteredWellbeing: [],
                filteredReflections: [],
                filteredThoughts: [],
                filteredDailyLogs: [],
                filteredCycles: tempFilteredCycles
            };
        } else if (historyTopic === 'estado') {
            return {
                filteredConsumptions: [],
                filteredReflections: [],
                filteredDailyLogs: [],
                filteredCycles: [],
                filteredThoughts: [],
                filteredWellbeing: tempFilteredWellbeing
            };
        } else if (historyTopic === 'diario') {
            return {
                filteredConsumptions: [],
                filteredWellbeing: [],
                filteredDailyLogs: [],
                filteredCycles: [],
                filteredReflections: tempFilteredReflections,
                filteredThoughts: tempFilteredThoughts
            };
        }
        // 'todos'
        return {
            filteredReflections: tempFilteredReflections,
            filteredWellbeing: tempFilteredWellbeing,
            filteredDailyLogs: tempFilteredDailyLogs,
            filteredConsumptions: tempFilteredConsumptions,
            filteredCycles: tempFilteredCycles,
            filteredThoughts: tempFilteredThoughts
        };
    }, [historyTopic, tempFilteredReflections, tempFilteredWellbeing, tempFilteredDailyLogs, tempFilteredConsumptions, tempFilteredCycles, tempFilteredThoughts]);

    const hasData = filteredReflections.length > 0 || filteredWellbeing.length > 0 || filteredDailyLogs.length > 0 || filteredConsumptions.length > 0 || filteredCycles.length > 0 || filteredThoughts.length > 0;

    return (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-white">Histórico</h2>

                                    {/* Gaps Report - Preencher dados em falta */}
                                    {handleFillGap && <GapsReport onFillGap={handleFillGap} />}

                                    {/* Temporal Filters */}
                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-4 border">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex gap-2 flex-wrap">
                                                {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                                                    <button key={period} onClick={() => { setHistoryPeriod(period); setHistoryPeriodOffset(0); }} className={'px-4 py-2 rounded-lg font-medium transition-colors text-sm ' + (historyPeriod === period ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                                        {period === 'hoje' && '📅 Hoje'}
                                                        {period === 'semana' && '📊 Semana'}
                                                        {period === 'mes' && '📈 Mês'}
                                                        {period === 'tudo' && '🌐 Tudo'}
                                                    </button>
                                                ))}
                                            </div>
                                            {historyPeriod !== 'tudo' && (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setHistoryPeriodOffset(historyPeriodOffset + 1)} className="text-purple-600 p-2 rounded-lg transition-colors hover:bg-gray-700">
                                                        <Icons.ChevronLeft className="w-5 h-5" />
                                                    </button>
                                                    <span className="text-sm font-medium min-w-[120px] text-center text-gray-300">{getPeriodLabel(historyPeriod, historyPeriodOffset)}</span>
                                                    <button onClick={() => setHistoryPeriodOffset(Math.max(0, historyPeriodOffset - 1))} disabled={historyPeriodOffset === 0} className={'p-2 rounded-lg transition-colors ' + (historyPeriodOffset === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-purple-600 hover:bg-gray-700')}>
                                                        <Icons.ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Topic Filters */}
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {[
                                            { id: 'todos', label: '📋 Tudo' },
                                            { id: 'consumos', label: '💊 Consumos' },
                                            { id: 'ciclos', label: '🌙 Ciclos' },
                                            { id: 'estado', label: '💚 Estado' },
                                            { id: 'diario', label: '📝 Diário' }
                                        ].map(topic => (
                                            <button key={topic.id} onClick={() => setHistoryTopic(topic.id)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ' + (historyTopic === topic.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                                {topic.label}
                                            </button>
                                        ))}
                                    </div>

                                    {!hasData ? (
                                        <div className="bg-white rounded-xl p-6 border border-gray-200 text-center text-gray-500">
                                            Sem registos neste período
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Timeline única para tab "todos" */}
                                            {historyTopic === 'todos' && (
                                                <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">📋 Tudo ({filteredConsumptions.length + filteredDailyLogs.length + filteredCycles.length + filteredWellbeing.length + filteredReflections.length + filteredThoughts.length})</h3>
                                                    <div className="space-y-3">
                                                        {(() => {
                                                            const allItems = [...filteredConsumptions.map(c => ({ type: 'consumption', data: c, timestamp: c.timestamp })),
                                                              ...filteredDailyLogs.map(log => ({ type: 'dailyLog', data: log, timestamp: log.timestamp || log.date })),
                                                              ...filteredCycles.map(cycle => ({ type: 'cycle', data: cycle, timestamp: cycle.timestamp })),
                                                              ...filteredWellbeing.map(w => ({ type: 'wellbeing', data: w, timestamp: w.timestamp || w.date })),
                                                              ...filteredReflections.map(r => ({ type: 'reflection', data: r, timestamp: r.timestamp || r.date })),
                                                              ...filteredThoughts.map(t => ({ type: 'thought', data: t, timestamp: t.timestamp || t.date }))]
                                                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                                                            return allItems
                                                                .slice(0, allItemsToShow)
                                                                .map(item => {
                                                                if (item.type === 'consumption') {
                                                                    const c = item.data;
                                                                    return (
                                                                        <div key={`c-${c.id}`} className="bg-gray-700 border-gray-600 p-3 rounded-lg border">
                                                                            <div className="flex justify-between items-center">
                                                                                <div>
                                                                                    <div className="font-medium text-white">
                                                                                        💊 {formatDateTime(c.timestamp)}
                                                                                    </div>
                                                                                    {c.notes && <div className="text-sm mt-1 text-gray-300">💭 {c.notes}</div>}
                                                                                </div>
                                                                                <div className="flex gap-2 ml-2">
                                                                                    <button onClick={() => openEditConsumption(c)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>
                                                                                    <button onClick={() => deleteItem('consumptions', c.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                } else if (item.type === 'dailyLog') {
                                                                    const log = item.data;
                                                                    return (
                                                                        <div key={`l-${log.id}`} className="bg-pink-900/30 border-pink-700/50 p-3 rounded-lg border">
                                                                            <div className="flex justify-between items-center">
                                                                                <div className="flex-1">
                                                                                    <div className="font-medium mb-1 text-white">
                                                                                        💊 {(() => {
                                                                                            const d = safeDate(log.timestamp || log.date);
                                                                                            if (!d) return 'Data inválida';
                                                                                            const dateStr = d.toLocaleDateString('pt-PT');
                                                                                            const timeStr = log.timestamp ? ` - ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                            return dateStr + timeStr;
                                                                                        })()}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3">
                                                                                        {log.mg && (
                                                                                            <div className="text-sm text-pink-300">
                                                                                                <span className="font-bold text-lg">{log.mg}</span> mg diários
                                                                                            </div>
                                                                                        )}
                                                                                        {log.times != null && (
                                                                                            <div className="text-xs text-gray-400">
                                                                                                ({log.times} {log.times === 1 ? 'consumo' : 'consumos'})
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {log.notes && (
                                                                                        <div className="text-sm mt-1 italic text-gray-300">
                                                                                            💭 {log.notes}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <button onClick={() => deleteItem('dailyLogs', log.id)} className="text-red-600 hover:text-red-700 ml-2"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                } else if (item.type === 'cycle') {
                                                                    const cycle = item.data;
                                                                    return (
                                                                        <div key={`cycle-${cycle.id}`} className="bg-indigo-900/30 border-indigo-700/50 p-3 rounded-lg border">
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <div className="text-sm font-medium text-white">
                                                                                    🌙 {(() => {
                                                                                        const d = safeDate(cycle.timestamp);
                                                                                        return d ? `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : 'Data inválida';
                                                                                    })()}
                                                                                </div>
                                                                                <button onClick={() => deleteItem('cycles', cycle.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                            </div>
                                                                            {cycle.bedtime && (
                                                                                <div className="text-sm mb-1 text-gray-300">
                                                                                    <span className="text-gray-400">Hora de deitar: </span>
                                                                                    <span className="font-medium">{cycle.bedtime}</span>
                                                                                </div>
                                                                            )}
                                                                            {cycle.sleep && (
                                                                                <div className="text-sm mb-1 text-gray-300">
                                                                                    <span className="text-gray-400">Horas de sono: </span>
                                                                                    <span className="font-medium">{cycle.sleep}h</span>
                                                                                </div>
                                                                            )}
                                                                            {cycle.triggers && cycle.triggers.length > 0 && (
                                                                                <div className="text-sm mb-1 text-gray-300">
                                                                                    <span className="text-gray-400">Gatilhos: </span>
                                                                                    <span className="font-medium">{cycle.triggers.join(', ')}</span>
                                                                                </div>
                                                                            )}
                                                                            {cycle.lastBefore00 && (
                                                                                <div className="text-sm mb-1 text-green-300">
                                                                                    <span>✓ Último consumo antes da meia-noite</span>
                                                                                </div>
                                                                            )}
                                                                            {cycle.notes && <div className="text-sm mt-2 italic text-gray-300">💭 {cycle.notes}</div>}
                                                                        </div>
                                                                    );
                                                                } else if (item.type === 'wellbeing') {
                                                                    const w = item.data;
                                                                    return (
                                                                        <div key={`w-${w.id}`} className="bg-blue-900/30 border-blue-700/50 p-3 rounded-lg border">
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <div className="text-sm font-medium text-white">
                                                                                    💚 {(() => {
                                                                                        const d = safeDate(w.timestamp || w.date);
                                                                                        if (!d) return 'Data inválida';
                                                                                        const dateStr = d.toLocaleDateString('pt-PT');
                                                                                        const timeStr = w.timestamp ? ` - ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <button onClick={() => deleteItem('wellbeingLogs', w.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                            </div>
                                                                            {(w.mood || w.energy) && (
                                                                                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                                                                    {w.mood && (
                                                                                        <div className="text-center">
                                                                                            <div className="text-xs text-gray-300">Humor</div>
                                                                                            <div className="text-lg font-bold text-blue-400">{w.mood}/10</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {w.energy && (
                                                                                        <div className="text-center">
                                                                                            <div className="text-xs text-gray-300">Energia</div>
                                                                                            <div className="text-lg font-bold text-blue-400">{w.energy}/10</div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {(w.water || w.rest || w.food || w.social) && (
                                                                                <div className="grid grid-cols-4 gap-2 text-sm mb-3">
                                                                                    <div className="text-center">
                                                                                        <div className="text-xs text-gray-300">Água</div>
                                                                                        <div className="text-sm font-medium text-green-400">
                                                                                            {w.water ? 'Sim' : '-'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-center">
                                                                                        <div className="text-xs text-gray-300">Descanso</div>
                                                                                        <div className="text-sm font-medium text-green-400">
                                                                                            {w.rest ? 'Sim' : '-'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-center">
                                                                                        <div className="text-xs text-gray-300">Alimentação</div>
                                                                                        <div className="text-sm font-medium text-green-400">
                                                                                            {w.food ? 'Sim' : '-'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-center">
                                                                                        <div className="text-xs text-gray-300">Social</div>
                                                                                        <div className="text-sm font-medium text-green-400">
                                                                                            {w.social ? 'Sim' : '-'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {w.emotions && w.emotions.length > 0 && (
                                                                                <div className="mb-2">
                                                                                    <div className="text-xs mb-1 text-gray-400">Emoções:</div>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {w.emotions.map((emotion, i) => (
                                                                                            <span key={i} className="bg-blue-800/50 text-blue-300 text-xs px-2 py-1 rounded">
                                                                                                {emotion}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {w.notes && (
                                                                                <div className="text-sm mt-2 italic text-gray-300">
                                                                                    💭 {w.notes}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                } else if (item.type === 'reflection') {
                                                                    const r = item.data;
                                                                    const analysis = r.answer ? getCachedSentimentAnalysis(r.answer) : null;
                                                                    const isExpanded = expandedAnalysis === `reflection-${r.id}`;
                                                                    return (
                                                                        <div key={`r-${r.id}`} className="border-purple-500 bg-purple-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <div className="text-xs text-gray-400">
                                                                                    📝 {(() => {
                                                                                        const d = safeDate(r.timestamp || r.date);
                                                                                        if (!d) return 'Data inválida';
                                                                                        const dateStr = d.toLocaleDateString('pt-PT');
                                                                                        const timeStr = r.timestamp ? ` ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <button onClick={() => deleteItem('reflections', r.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                            </div>
                                                                            <div className="text-sm font-medium mb-1 text-purple-400">{r.question}</div>
                                                                            <div className="text-sm text-gray-300">{r.answer}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`reflection-${r.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-purple-800/50 text-purple-300 hover:bg-purple-800">
                                                                                        {isExpanded ? '▼ Ocultar análise' : '▶ Ver análise'}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">Classificação: </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">Palavras detectadas:</div>
                                                                                                    <div className="space-y-1">
                                                                                                        {analysis.details.filter(d => Math.abs(d.score) > 0.1).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 10).map((d, i) => (
                                                                                                            <div key={i} className="text-gray-300">
                                                                                                                • "<span className="font-medium">{d.word}</span>"
                                                                                                                <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                                    {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    const t = item.data;
                                                                    const analysis = t.content ? getCachedSentimentAnalysis(t.content) : null;
                                                                    const isExpanded = expandedAnalysis === `thought-${t.id}`;
                                                                    return (
                                                                        <div key={`t-${t.id}`} className="border-pink-500 bg-pink-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <div className="text-xs text-gray-400">
                                                                                    📝 {(() => {
                                                                                        const d = safeDate(t.timestamp || t.date);
                                                                                        if (!d) return 'Data inválida';
                                                                                        const dateStr = d.toLocaleDateString('pt-PT');
                                                                                        const timeStr = t.timestamp ? ` ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <button onClick={() => deleteItem('thoughts', t.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                            </div>
                                                                            <div className="text-sm text-gray-300">{t.content}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`thought-${t.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-pink-800/50 text-pink-300 hover:bg-pink-800">
                                                                                        {isExpanded ? '▼ Ocultar análise' : '▶ Ver análise'}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">Classificação: </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">Palavras detectadas:</div>
                                                                                                    <div className="space-y-1">
                                                                                                        {analysis.details.filter(d => Math.abs(d.score) > 0.1).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 10).map((d, i) => (
                                                                                                            <div key={i} className="text-gray-300">
                                                                                                                • "<span className="font-medium">{d.word}</span>"
                                                                                                                <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                                    {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                            });
                                                        })()}
                                                    </div>
                                                    {(() => {
                                                        const totalItems = filteredConsumptions.length + filteredDailyLogs.length + filteredCycles.length + filteredWellbeing.length + filteredReflections.length + filteredThoughts.length;
                                                        const remaining = totalItems - allItemsToShow;
                                                        return remaining > 0 && (
                                                            <button
                                                                onClick={() => setAllItemsToShow(prev => prev + 20)}
                                                                className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-3 w-full py-2"
                                                            >
                                                                Ver mais ({remaining} restantes)
                                                            </button>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* Timeline única para tab "diario" */}
                                            {historyTopic === 'diario' && (
                                                <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">📝 Diário ({filteredReflections.length + filteredThoughts.length})</h3>
                                                    <div className="space-y-4">
                                                        {[...filteredReflections.map(r => ({ type: 'reflection', data: r, timestamp: r.timestamp || r.date })),
                                                          ...filteredThoughts.map(t => ({ type: 'thought', data: t, timestamp: t.timestamp || t.date }))]
                                                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                                            .map(item => {
                                                                if (item.type === 'reflection') {
                                                                    const r = item.data;
                                                                    const analysis = r.answer ? getCachedSentimentAnalysis(r.answer) : null;
                                                                    const isExpanded = expandedAnalysis === `reflection-${r.id}`;
                                                                    return (
                                                                        <div key={`r-${r.id}`} className="border-purple-500 bg-purple-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <div className="text-xs text-gray-400">
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
                                                                            <div className="text-sm font-medium mb-1 text-purple-400">{r.question}</div>
                                                                            <div className="text-sm text-gray-300">{r.answer}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`reflection-${r.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-purple-800/50 text-purple-300 hover:bg-purple-800">
                                                                                        {isExpanded ? '▼ Ocultar análise' : '▶ Ver análise'}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">Classificação: </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">Palavras detectadas:</div>
                                                                                                    <div className="space-y-1">
                                                                                                        {analysis.details.filter(d => Math.abs(d.score) > 0.1).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 10).map((d, i) => (
                                                                                                            <div key={i} className="text-gray-300">
                                                                                                                • "<span className="font-medium">{d.word}</span>"
                                                                                                                <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                                    {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    const t = item.data;
                                                                    const analysis = t.content ? getCachedSentimentAnalysis(t.content) : null;
                                                                    const isExpanded = expandedAnalysis === `thought-${t.id}`;
                                                                    return (
                                                                        <div key={`t-${t.id}`} className="border-pink-500 bg-pink-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <div className="text-xs text-gray-400">
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
                                                                            <div className="text-sm text-gray-300">{t.content}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`thought-${t.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-pink-800/50 text-pink-300 hover:bg-pink-800">
                                                                                        {isExpanded ? '▼ Ocultar análise' : '▶ Ver análise'}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">Classificação: </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">Palavras detectadas:</div>
                                                                                                    <div className="space-y-1">
                                                                                                        {analysis.details.filter(d => Math.abs(d.score) > 0.1).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 10).map((d, i) => (
                                                                                                            <div key={i} className="text-gray-300">
                                                                                                                • "<span className="font-medium">{d.word}</span>"
                                                                                                                <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                                    {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                            })
                                                        }
                                                    </div>
                                                </div>
                                            )}

                                            {/* Blocos individuais para tabs específicas e tab "todos" */}
                                            {historyTopic !== 'diario' && filteredReflections.length > 0 && (
                                                <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.Brain className="w-4 h-4 text-purple-400" /> Reflexões diárias ({filteredReflections.length})</h3>
                                                    <div className="space-y-4">
                                                        {filteredReflections.slice(0, reflectionsToShow).map(r => {
                                                            const analysis = r.answer ? getCachedSentimentAnalysis(r.answer) : null;
                                                                const isExpanded = expandedAnalysis === `reflection-${r.id}`;

                                                                return (
                                                                <div key={r.id} className="border-purple-500 bg-purple-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className="text-xs text-gray-400">
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
                                                                    <div className="text-sm font-medium mb-1 text-purple-400">{r.question}</div>
                                                                    <div className="text-sm text-gray-300">{r.answer}</div>

                                                                    {analysis && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => toggleAnalysis(`reflection-${r.id}`)}
                                                                                className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-purple-800/50 text-purple-300 hover:bg-purple-800"
                                                                            >
                                                                                {isExpanded ? '▼ Ocultar análise' : '▶ Ver análise'}
                                                                            </button>

                                                                            {isExpanded && (
                                                                                <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                    <div className="mb-2">
                                                                                        <span className="font-medium text-white">Classificação: </span>
                                                                                        <span className={
                                                                                            analysis.classification.includes('positive') ? 'text-green-400' :
                                                                                            analysis.classification.includes('negative') ? 'text-red-400' :
                                                                                            'text-gray-400'
                                                                                        }>
                                                                                            {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                        </span>
                                                                                    </div>

                                                                                    {analysis.details && analysis.details.length > 0 && (
                                                                                        <div>
                                                                                            <div className="font-medium mb-1 text-white">Palavras detectadas:</div>
                                                                                            <div className="space-y-1">
                                                                                                {analysis.details
                                                                                                    .filter(d => Math.abs(d.score) > 0.1)
                                                                                                    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
                                                                                                    .slice(0, 10)
                                                                                                    .map((d, i) => (
                                                                                                    <div key={i} className="text-gray-300">
                                                                                                        • "<span className="font-medium">{d.word}</span>"
                                                                                                        <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                            {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                        </span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )})}
                                                        </div>
                                                        {filteredReflections.length > reflectionsToShow && (
                                                            <button onClick={() => setReflectionsToShow(prev => prev + 10)} className="text-purple-400 hover:text-purple-300 text-sm font-medium mt-3 w-full py-2">
                                                                Ver mais ({filteredReflections.length - reflectionsToShow} restantes)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {historyTopic !== 'diario' && filteredThoughts.length > 0 && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.BookOpen className="w-4 h-4 text-pink-400" /> Pensamentos ({filteredThoughts.length})</h3>
                                                        <div className="space-y-4">
                                                            {filteredThoughts.slice(0, thoughtsToShow).map(t => {
                                                                const analysis = t.content ? getCachedSentimentAnalysis(t.content) : null;
                                                                const isExpanded = expandedAnalysis === `thought-${t.id}`;

                                                                return (
                                                                <div key={t.id} className="border-pink-500 bg-pink-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className="text-xs text-gray-400">
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
                                                                    <div className="text-sm text-gray-300">{t.content}</div>

                                                                    {analysis && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => toggleAnalysis(`thought-${t.id}`)}
                                                                                className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-pink-800/50 text-pink-300 hover:bg-pink-800"
                                                                            >
                                                                                {isExpanded ? '▼ Ocultar análise' : '▶ Ver análise'}
                                                                            </button>

                                                                            {isExpanded && (
                                                                                <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                    <div className="mb-2">
                                                                                        <span className="font-medium text-white">Classificação: </span>
                                                                                        <span className={
                                                                                            analysis.classification.includes('positive') ? 'text-green-400' :
                                                                                            analysis.classification.includes('negative') ? 'text-red-400' :
                                                                                            'text-gray-400'
                                                                                        }>
                                                                                            {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                        </span>
                                                                                    </div>

                                                                                    {analysis.details && analysis.details.length > 0 && (
                                                                                        <div>
                                                                                            <div className="font-medium mb-1 text-white">Palavras detectadas:</div>
                                                                                            <div className="space-y-1">
                                                                                                {analysis.details
                                                                                                    .filter(d => Math.abs(d.score) > 0.1)
                                                                                                    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
                                                                                                    .slice(0, 10)
                                                                                                    .map((d, i) => (
                                                                                                    <div key={i} className="text-gray-300">
                                                                                                        • "<span className="font-medium">{d.word}</span>"
                                                                                                        <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                            {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                        </span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )})}
                                                        </div>
                                                        {filteredThoughts.length > thoughtsToShow && (
                                                            <button onClick={() => setThoughtsToShow(prev => prev + 10)} className="text-pink-400 hover:text-pink-300 text-sm font-medium mt-3 w-full py-2">
                                                                Ver mais ({filteredThoughts.length - thoughtsToShow} restantes)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {filteredWellbeing.length > 0 && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.Heart className="w-4 h-4 text-blue-400" /> Estado ({filteredWellbeing.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredWellbeing.slice(0, wellbeingToShow).map(w => (
                                                                <div key={w.id} className="bg-blue-900/30 border-blue-700/50 p-3 rounded-lg border">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className="text-sm font-medium text-white">
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
                                                                    {(w.mood || w.energy) && (
                                                                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                                                            {w.mood && (
                                                                                <div className="text-center">
                                                                                    <div className="text-xs text-gray-300">Humor</div>
                                                                                    <div className="text-lg font-bold text-blue-400">{w.mood}/10</div>
                                                                                </div>
                                                                            )}
                                                                            {w.energy && (
                                                                                <div className="text-center">
                                                                                    <div className="text-xs text-gray-300">Energia</div>
                                                                                    <div className="text-lg font-bold text-blue-400">{w.energy}/10</div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {(w.water || w.rest || w.food || w.social) && (
                                                                        <div className="grid grid-cols-4 gap-2 text-sm mb-3">
                                                                            <div className="text-center">
                                                                                <div className="text-xs text-gray-300">Água</div>
                                                                                <div className="text-sm font-medium text-green-400">
                                                                                    {w.water ? 'Sim' : '-'}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <div className="text-xs text-gray-300">Descanso</div>
                                                                                <div className="text-sm font-medium text-green-400">
                                                                                    {w.rest ? 'Sim' : '-'}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <div className="text-xs text-gray-300">Alimentação</div>
                                                                                <div className="text-sm font-medium text-green-400">
                                                                                    {w.food ? 'Sim' : '-'}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-center">
                                                                                <div className="text-xs text-gray-300">Social</div>
                                                                                <div className="text-sm font-medium text-green-400">
                                                                                    {w.social ? 'Sim' : '-'}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {w.emotions && w.emotions.length > 0 && (
                                                                        <div className="mb-2">
                                                                            <div className="text-xs mb-1 text-gray-400">Emoções:</div>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {w.emotions.map((emotion, i) => (
                                                                                    <span key={i} className="bg-blue-800/50 text-blue-300 text-xs px-2 py-1 rounded">
                                                                                        {emotion}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {w.notes && (
                                                                        <div className="text-sm mt-2 italic text-gray-300">
                                                                            💭 {w.notes}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {filteredWellbeing.length > wellbeingToShow && (
                                                            <button onClick={() => setWellbeingToShow(prev => prev + 14)} className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-3 w-full py-2">
                                                                Ver mais ({filteredWellbeing.length - wellbeingToShow} restantes)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {(filteredConsumptions.length > 0 || filteredDailyLogs.length > 0) && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.Clock className="w-4 h-4 text-purple-600" /> Consumos ({filteredConsumptions.length + filteredDailyLogs.length})</h3>
                                                        <div className="space-y-3">
                                                            {[...filteredConsumptions.map(c => ({ type: 'consumption', data: c, timestamp: c.timestamp })),
                                                              ...filteredDailyLogs.map(log => ({ type: 'dailyLog', data: log, timestamp: log.timestamp || log.date }))]
                                                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                                                .map(item => {
                                                                    if (item.type === 'consumption') {
                                                                        const c = item.data;
                                                                        return (
                                                                            <div key={`c-${c.id}`} className="bg-gray-700 border-gray-600 p-3 rounded-lg border">
                                                                                <div className="flex justify-between items-center">
                                                                                    <div>
                                                                                        <div className="font-medium text-white">
                                                                                            {formatDateTime(c.timestamp)}
                                                                                        </div>
                                                                                        {c.notes && <div className="text-sm mt-1 text-gray-300">💭 {c.notes}</div>}
                                                                                    </div>
                                                                                    <div className="flex gap-2 ml-2">
                                                                                        <button onClick={() => openEditConsumption(c)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>
                                                                                        <button onClick={() => deleteItem('consumptions', c.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    } else {
                                                                        const log = item.data;
                                                                        return (
                                                                            <div key={`l-${log.id}`} className="bg-pink-900/30 border-pink-700/50 p-3 rounded-lg border">
                                                                                <div className="flex justify-between items-center">
                                                                                    <div className="flex-1">
                                                                                        <div className="font-medium mb-1 text-white">
                                                                                            {(() => {
                                                                                                const d = safeDate(log.timestamp || log.date);
                                                                                                if (!d) return 'Data inválida';
                                                                                                const dateStr = d.toLocaleDateString('pt-PT');
                                                                                                const timeStr = log.timestamp ? ` - ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                                return dateStr + timeStr;
                                                                                            })()}
                                                                                        </div>
                                                                                        <div className="flex items-center gap-3">
                                                                                            {log.mg && (
                                                                                                <div className="text-sm text-pink-300">
                                                                                                    <span className="font-bold text-lg">{log.mg}</span> mg diários
                                                                                                </div>
                                                                                            )}
                                                                                            {log.times != null && (
                                                                                                <div className="text-xs text-gray-400">
                                                                                                    ({log.times} {log.times === 1 ? 'consumo' : 'consumos'})
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {log.notes && (
                                                                                            <div className="text-sm mt-1 italic text-gray-300">
                                                                                                💭 {log.notes}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <button onClick={() => deleteItem('dailyLogs', log.id)} className="text-red-600 hover:text-red-700 ml-2"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                })
                                                            }
                                                        </div>
                                                    </div>
                                                )}

                                                {filteredCycles.length > 0 && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">🌙 Ciclos ({filteredCycles.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredCycles.map(cycle => (
                                                                <div key={cycle.id} className="bg-indigo-900/30 border-indigo-700/50 p-3 rounded-lg border">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className="text-sm font-medium text-white">
                                                                            {(() => {
                                                                                const d = safeDate(cycle.timestamp);
                                                                                return d ? `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : 'Data inválida';
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('cycles', cycle.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    {cycle.bedtime && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">Hora de deitar: </span>
                                                                            <span className="font-medium">{cycle.bedtime}</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.sleep && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">Horas de sono: </span>
                                                                            <span className="font-medium">{cycle.sleep}h</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.triggers && cycle.triggers.length > 0 && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">Gatilhos: </span>
                                                                            <span className="font-medium">{cycle.triggers.join(', ')}</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.mg && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">Consumo diário: </span>
                                                                            <span className="font-medium">{cycle.mg} mg</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.lastBefore00 && (
                                                                        <div className="text-sm mb-1 text-green-300">
                                                                            <span>✓ Último consumo antes da meia-noite</span>
                                                                        </div>
                                                                    )}

                                                                    {cycle.notes && <div className="text-sm mt-2 italic text-gray-300">💭 {cycle.notes}</div>}
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
