import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import { formatDateTime, formatDateShort, formatDateWithWeekday, safeDate } from '../utils/helpers';
import { analyzeNote, getSentimentDescription } from '../utils/sentimentAnalysis';
import { GapsReport } from '../components/ui/GapsReport';
import { EMOTION_EN } from '../constants/emotions';

const { getDateRangeForPeriod, filterByDateRange, getPeriodLabel } = analyticsService;

// Cache global para análises de sentimento
const sentimentCache = new Map();

// Análise de sentimento DESATIVADA na vista de histórico.
// O classificador é uma lista de palavras simples, só PT, sem contexto/negação:
// em texto EN dava sempre "neutral (0.00)" e mesmo em PT etiquetava mal (ex.:
// classificava mal linguagem de redução de danos). Mostrar isto às pessoas
// confundia e não acrescentava valor — fica oculto até haver um classificador
// fiável. (Basta remover esta linha para o reativar.)
const SENTIMENT_UI_ENABLED = false;

// Função com cache para análise de sentimento
const getCachedSentimentAnalysis = (text) => {
    if (!SENTIMENT_UI_ENABLED) return null;
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
    openEditCycle,
    openEditDailyLog,
    openEditWellbeingLog,
    openEditReflection,
    openEditThought,
    deleteItem,
    handleFillGap
}) {
    const { consumptions, reflections, wellbeingLogs, cycles, thoughts, dailyLogs, db } = useData();
    const metrics = useMetrics();
    const { t, i18n } = useTranslation();
    // Em inglês, traduzir emoções (guardadas como '😌 Calmo/a') e gatilhos (guardados
    // em PT, ex.: 'Ansiedade') para não mostrarem português na versão EN.
    const isEN = i18n.language === 'en';
    const trEmotion = (e) => (isEN ? (EMOTION_EN[e] || e) : e);
    const trTrigger = (tr) => t('triggers.' + tr, tr);

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
            filteredThoughts: tempFilteredThoughts,
        };
    }, [historyTopic, tempFilteredReflections, tempFilteredWellbeing, tempFilteredDailyLogs, tempFilteredConsumptions, tempFilteredCycles, tempFilteredThoughts]);

    const allItemsSorted = useMemo(() => {
        return [
            ...filteredConsumptions.map(c => ({ type: 'consumption', data: c, timestamp: c.timestamp })),
            ...filteredDailyLogs.map(log => ({ type: 'dailyLog', data: log, timestamp: log.timestamp || log.date })),
            ...filteredCycles.map(cycle => ({ type: 'cycle', data: cycle, timestamp: cycle.timestamp })),
            ...filteredWellbeing.map(w => ({ type: 'wellbeing', data: w, timestamp: w.timestamp || w.date })),
            ...filteredReflections.map(r => ({ type: 'reflection', data: r, timestamp: r.timestamp || r.date })),
            ...filteredThoughts.map(t => ({ type: 'thought', data: t, timestamp: t.timestamp || t.date }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [filteredConsumptions, filteredDailyLogs, filteredCycles, filteredWellbeing, filteredReflections, filteredThoughts]);

    // Lista consumos+dailyLogs ordenada — memoizada para não re-ordenar a cada render
    const consumptionLogsSorted = useMemo(() => (
        [...filteredConsumptions.map(c => ({ type: 'consumption', data: c, timestamp: c.timestamp })),
         ...filteredDailyLogs.map(log => ({ type: 'dailyLog', data: log, timestamp: log.timestamp || log.date }))]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    ), [filteredConsumptions, filteredDailyLogs]);

    const hasData = filteredReflections.length > 0 || filteredWellbeing.length > 0 || filteredDailyLogs.length > 0 || filteredConsumptions.length > 0 || filteredCycles.length > 0 || filteredThoughts.length > 0;

    return (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-white">{t('history.title')}</h2>

                                    {/* Gaps Report - Preencher dados em falta */}
                                    {handleFillGap && <GapsReport onFillGap={handleFillGap} />}

                                    {/* Temporal Filters */}
                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-4 border">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex gap-2 flex-wrap">
                                                {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                                                    <button key={period} onClick={() => { setHistoryPeriod(period); setHistoryPeriodOffset(0); }} className={'px-4 py-2 rounded-lg font-medium transition-colors text-sm ' + (historyPeriod === period ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                                        {t(`patterns.periods.${period}`)}
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
                                            { id: 'todos', label: t('history.filterAll') },
                                            { id: 'consumos', label: t('history.filterLogs') },
                                            { id: 'ciclos', label: t('history.filterCycles') },
                                            { id: 'estado', label: t('history.filterWellbeing') },
                                            { id: 'diario', label: t('history.filterDiary') }
                                        ].map(topic => (
                                            <button key={topic.id} onClick={() => setHistoryTopic(topic.id)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ' + (historyTopic === topic.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                                {topic.label}
                                            </button>
                                        ))}
                                    </div>

                                    {!hasData ? (
                                        <div className="bg-white rounded-xl p-6 border border-gray-200 text-center text-gray-500">
                                            {t('history.noRecords')}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Timeline única para tab "todos" */}
                                            {historyTopic === 'todos' && (
                                                <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">{t('history.headerAll', { count: filteredConsumptions.length + filteredDailyLogs.length + filteredCycles.length + filteredWellbeing.length + filteredReflections.length + filteredThoughts.length })}</h3>
                                                    <div className="space-y-3">
                                                        {(() => {
                                                            return allItemsSorted
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
                                                                                            const d = safeDate(log.date || log.timestamp);
                                                                                            if (!d) return t('history.invalidDate');
                                                                                            const dateStr = d.toLocaleDateString(i18n.language);
                                                                                            if (log.timestamp) {
                                                                                                const ts = safeDate(log.timestamp);
                                                                                                if (ts) return `${dateStr} - ${ts.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}`;
                                                                                            }
                                                                                            return dateStr;
                                                                                        })()}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3">
                                                                                        {log.mg && (
                                                                                            <div className="text-sm text-pink-300">
                                                                                                <span className="font-bold text-lg">{log.mg}</span> {t('history.mgDaily')}
                                                                                            </div>
                                                                                        )}
                                                                                        {log.times != null && (
                                                                                            <div className="text-xs text-gray-400">
                                                                                                ({log.times} {log.times === 1 ? t('history.use') : t('history.uses')})
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {log.notes && (
                                                                                        <div className="text-sm mt-1 italic text-gray-300">
                                                                                            💭 {log.notes}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex gap-2 ml-2">
                                                                                    {openEditDailyLog && <button onClick={() => openEditDailyLog(log)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>}
                                                                                    <button onClick={() => deleteItem('dailyLogs', log.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                                </div>
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
                                                                                        return d ? `${d.toLocaleDateString(i18n.language)} ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : t('history.invalidDate');
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    <button onClick={() => openEditCycle(cycle)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>
                                                                                    <button onClick={() => deleteItem('cycles', cycle.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            {cycle.bedtime && (
                                                                                <div className="text-sm mb-1 text-gray-300">
                                                                                    <span className="text-gray-400">{t('history.bedtime')} </span>
                                                                                    <span className="font-medium">{cycle.bedtime}</span>
                                                                                </div>
                                                                            )}
                                                                            {cycle.sleep && (
                                                                                <div className="text-sm mb-1 text-gray-300">
                                                                                    <span className="text-gray-400">{t('history.sleepHours')} </span>
                                                                                    <span className="font-medium">{cycle.sleep}h</span>
                                                                                </div>
                                                                            )}
                                                                            {cycle.triggers && cycle.triggers.length > 0 && (
                                                                                <div className="text-sm mb-1 text-gray-300">
                                                                                    <span className="text-gray-400">{t('history.triggers')} </span>
                                                                                    <span className="font-medium">{cycle.triggers.map(trTrigger).join(', ')}</span>
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
                                                                                        if (!d) return t('history.invalidDate');
                                                                                        const dateStr = d.toLocaleDateString(i18n.language);
                                                                                        const timeStr = w.timestamp ? ` - ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {openEditWellbeingLog && <button onClick={() => openEditWellbeingLog(w)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                                    <button onClick={() => deleteItem('wellbeingLogs', w.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            {(w.mood || w.energy) && (
                                                                                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                                                                    {w.mood && (
                                                                                        <div className="text-center">
                                                                                            <div className="text-xs text-gray-300">{t('history.moodLabel')}</div>
                                                                                            <div className="text-lg font-bold text-blue-400">{w.mood}/10</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {w.energy && (
                                                                                        <div className="text-center">
                                                                                            <div className="text-xs text-gray-300">{t('history.energyLabel')}</div>
                                                                                            <div className="text-lg font-bold text-blue-400">{w.energy}/10</div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            <div className="flex flex-wrap gap-2 text-xs mb-2">
                                                                                {w.isAtypical && <span className="bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded-full">📌 {t('wellbeing.atypicalTag')}{w.atypicalReason ? ` · ${w.atypicalReason}` : ''}</span>}
                                                                                {(w.waterGlasses > 0) && <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">💧 {w.waterGlasses >= 50 ? `${w.waterGlasses}ml` : `${w.waterGlasses * 250}ml`}</span>}
                                                                                {w.exerciseType && <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">🏃 {w.exerciseType}{w.exerciseDuration ? ` · ${w.exerciseDuration}min` : ''}</span>}
                                                                                {w.food && <span className="bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded-full">🍽️ {t('history.foodTag')}</span>}
                                                                                {w.social && <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">👥 {t('history.socialTag')}</span>}
                                                                            </div>
                                                                            {w.emotions && w.emotions.length > 0 && (
                                                                                <div className="mb-2">
                                                                                    <div className="text-xs mb-1 text-gray-400">{t('history.emotionsLabel')}</div>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {w.emotions.map((emotion, i) => (
                                                                                            <span key={i} className="bg-blue-800/50 text-blue-300 text-xs px-2 py-1 rounded">
                                                                                                {trEmotion(emotion)}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {(w.symptoms && w.symptoms.length > 0 || w.customSymptom) && (
                                                                                <div className="mb-2">
                                                                                    <div className="text-xs mb-1 text-teal-400">{t('history.symptomsLabel')}</div>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {(w.symptoms || []).map(s => (
                                                                                            <span key={s} className="text-xs bg-teal-800/50 text-teal-300 px-2 py-0.5 rounded-full">{s.replace(/_/g,' ')}</span>
                                                                                        ))}
                                                                                        {w.customSymptom && <span className="text-xs bg-teal-800/50 text-teal-300 px-2 py-0.5 rounded-full">{w.customSymptom}</span>}
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
                                                                                        if (!d) return t('history.invalidDate');
                                                                                        const dateStr = d.toLocaleDateString(i18n.language);
                                                                                        const timeStr = r.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {openEditReflection && <button onClick={() => openEditReflection(r)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                                    <button onClick={() => deleteItem('reflections', r.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm font-medium mb-1 text-purple-400">{r.question}</div>
                                                                            <div className="text-sm text-gray-300">{r.answer}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`reflection-${r.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-purple-800/50 text-purple-300 hover:bg-purple-800">
                                                                                        {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">{t('history.classification')} </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
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
                                                                    const thought = item.data;
                                                                    const analysis = thought.content ? getCachedSentimentAnalysis(thought.content) : null;
                                                                    const isExpanded = expandedAnalysis === `thought-${thought.id}`;
                                                                    return (
                                                                        <div key={`t-${thought.id}`} className="border-pink-500 bg-pink-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <div className="text-xs text-gray-400">
                                                                                    📝 {(() => {
                                                                                        const d = safeDate(thought.timestamp || thought.date);
                                                                                        if (!d) return t('history.invalidDate');
                                                                                        const dateStr = d.toLocaleDateString(i18n.language);
                                                                                        const timeStr = thought.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {openEditThought && <button onClick={() => openEditThought(thought)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                                    <button onClick={() => deleteItem('thoughts', thought.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm text-gray-300">{thought.content}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`thought-${thought.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-pink-800/50 text-pink-300 hover:bg-pink-800">
                                                                                        {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">{t('history.classification')} </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
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
                                                                {t('history.showMore', { count: remaining })}
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
                                                                                        if (!d) return t('history.invalidDate');
                                                                                        const dateStr = d.toLocaleDateString(i18n.language);
                                                                                        const timeStr = r.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {openEditReflection && <button onClick={() => openEditReflection(r)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                                    <button onClick={() => deleteItem('reflections', r.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm font-medium mb-1 text-purple-400">{r.question}</div>
                                                                            <div className="text-sm text-gray-300">{r.answer}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`reflection-${r.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-purple-800/50 text-purple-300 hover:bg-purple-800">
                                                                                        {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">{t('history.classification')} </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
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
                                                                    const thought = item.data;
                                                                    const analysis = thought.content ? getCachedSentimentAnalysis(thought.content) : null;
                                                                    const isExpanded = expandedAnalysis === `thought-${thought.id}`;
                                                                    return (
                                                                        <div key={`t-${thought.id}`} className="border-pink-500 bg-pink-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <div className="text-xs text-gray-400">
                                                                                    {(() => {
                                                                                        const d = safeDate(thought.timestamp || thought.date);
                                                                                        if (!d) return t('history.invalidDate');
                                                                                        const dateStr = d.toLocaleDateString(i18n.language);
                                                                                        const timeStr = thought.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {openEditThought && <button onClick={() => openEditThought(thought)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                                    <button onClick={() => deleteItem('thoughts', thought.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm text-gray-300">{thought.content}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`thought-${thought.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-pink-800/50 text-pink-300 hover:bg-pink-800">
                                                                                        {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">{t('history.classification')} </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
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
                                                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.Brain className="w-4 h-4 text-purple-400" /> {t('history.sectionReflections')} ({filteredReflections.length})</h3>
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
                                                                                if (!d) return t('history.invalidDate');
                                                                                const dateStr = d.toLocaleDateString(i18n.language);
                                                                                const timeStr = r.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
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
                                                                                {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                            </button>

                                                                            {isExpanded && (
                                                                                <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                    <div className="mb-2">
                                                                                        <span className="font-medium text-white">{t('history.classification')} </span>
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
                                                                                            <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
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
                                                                {t('history.showMore', { count: filteredReflections.length - reflectionsToShow })}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {historyTopic !== 'diario' && filteredThoughts.length > 0 && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.BookOpen className="w-4 h-4 text-pink-400" /> {t('history.sectionThoughts')} ({filteredThoughts.length})</h3>
                                                        <div className="space-y-4">
                                                            {filteredThoughts.slice(0, thoughtsToShow).map(thought => {
                                                                const analysis = thought.content ? getCachedSentimentAnalysis(thought.content) : null;
                                                                const isExpanded = expandedAnalysis === `thought-${thought.id}`;

                                                                return (
                                                                <div key={thought.id} className="border-pink-500 bg-pink-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className="text-xs text-gray-400">
                                                                            {(() => {
                                                                                const d = safeDate(thought.timestamp || thought.date);
                                                                                if (!d) return t('history.invalidDate');
                                                                                const dateStr = d.toLocaleDateString(i18n.language);
                                                                                const timeStr = thought.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                return dateStr + timeStr;
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('thoughts', thought.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    <div className="text-sm text-gray-300">{thought.content}</div>

                                                                    {analysis && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => toggleAnalysis(`thought-${thought.id}`)}
                                                                                className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-pink-800/50 text-pink-300 hover:bg-pink-800"
                                                                            >
                                                                                {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                            </button>

                                                                            {isExpanded && (
                                                                                <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                    <div className="mb-2">
                                                                                        <span className="font-medium text-white">{t('history.classification')} </span>
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
                                                                                            <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
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
                                                                {t('history.showMore', { count: filteredThoughts.length - thoughtsToShow })}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {filteredWellbeing.length > 0 && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.Heart className="w-4 h-4 text-blue-400" /> {t('history.sectionState')} ({filteredWellbeing.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredWellbeing.slice(0, wellbeingToShow).map(w => (
                                                                <div key={w.id} className="bg-blue-900/30 border-blue-700/50 p-3 rounded-lg border">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className="text-sm font-medium text-white">
                                                                            {(() => {
                                                                                const d = safeDate(w.timestamp || w.date);
                                                                                if (!d) return t('history.invalidDate');
                                                                                const dateStr = d.toLocaleDateString(i18n.language);
                                                                                const timeStr = w.timestamp ? ` - ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                return dateStr + timeStr;
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('wellbeingLogs', w.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    {(w.mood || w.energy) && (
                                                                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                                                            {w.mood && (
                                                                                <div className="text-center">
                                                                                    <div className="text-xs text-gray-300">{t('history.moodLabel')}</div>
                                                                                    <div className="text-lg font-bold text-blue-400">{w.mood}/10</div>
                                                                                </div>
                                                                            )}
                                                                            {w.energy && (
                                                                                <div className="text-center">
                                                                                    <div className="text-xs text-gray-300">{t('history.energyLabel')}</div>
                                                                                    <div className="text-lg font-bold text-blue-400">{w.energy}/10</div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-wrap gap-2 text-xs mb-2">
                                                                        {w.isAtypical && <span className="bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded-full">📌 {t('wellbeing.atypicalTag')}{w.atypicalReason ? ` · ${w.atypicalReason}` : ''}</span>}
                                                                        {(w.waterGlasses > 0) && <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">💧 {w.waterGlasses >= 50 ? `${w.waterGlasses}ml` : `${w.waterGlasses * 250}ml`}</span>}
                                                                        {w.exerciseType && <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">🏃 {w.exerciseType}{w.exerciseDuration ? ` · ${w.exerciseDuration}min` : ''}</span>}
                                                                        {(w.napDuration > 0) && <span className="bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">{t('wellbeing.napLabel')} {w.napDuration}min</span>}
                                                                        {w.food && <span className="bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded-full">🍽️ {t('history.foodTag')}</span>}
                                                                        {w.social && <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">👥 {t('history.socialTag')}</span>}
                                                                    </div>
                                                                    {w.emotions && w.emotions.length > 0 && (
                                                                        <div className="mb-2">
                                                                            <div className="text-xs mb-1 text-gray-400">{t('history.emotionsLabel')}</div>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {w.emotions.map((emotion, i) => (
                                                                                    <span key={i} className="bg-blue-800/50 text-blue-300 text-xs px-2 py-1 rounded">
                                                                                        {trEmotion(emotion)}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {(w.symptoms && w.symptoms.length > 0 || w.customSymptom) && (
                                                                        <div className="mb-2">
                                                                            <div className="text-xs mb-1 text-teal-400">{t('history.symptomsLabel')}</div>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {(w.symptoms || []).map(s => (
                                                                                    <span key={s} className="text-xs bg-teal-800/50 text-teal-300 px-2 py-0.5 rounded-full">{s.replace(/_/g,' ')}</span>
                                                                                ))}
                                                                                {w.customSymptom && <span className="text-xs bg-teal-800/50 text-teal-300 px-2 py-0.5 rounded-full">{w.customSymptom}</span>}
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
                                                                {t('history.showMore', { count: filteredWellbeing.length - wellbeingToShow })}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {(filteredConsumptions.length > 0 || filteredDailyLogs.length > 0) && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.Clock className="w-4 h-4 text-purple-600" /> {t('history.headerLogs', { count: filteredConsumptions.length + filteredDailyLogs.length })}</h3>
                                                        <div className="space-y-3">
                                                            {consumptionLogsSorted.map(item => {
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
                                                                                                // Usar log.date (dia do registo) em vez de timestamp (quando foi criado)
                                                                                                const d = safeDate(log.date || log.timestamp);
                                                                                                if (!d) return t('history.invalidDate');
                                                                                                const dateStr = d.toLocaleDateString(i18n.language);
                                                                                                return dateStr;
                                                                                            })()}
                                                                                        </div>
                                                                                        <div className="flex items-center gap-3">
                                                                                            {log.mg && (
                                                                                                <div className="text-sm text-pink-300">
                                                                                                    <span className="font-bold text-lg">{log.mg}</span> {t('history.mgDaily')}
                                                                                                </div>
                                                                                            )}
                                                                                            {log.times != null && (
                                                                                                <div className="text-xs text-gray-400">
                                                                                                    ({log.times} {log.times === 1 ? t('history.use') : t('history.uses')})
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {log.notes && (
                                                                                            <div className="text-sm mt-1 italic text-gray-300">
                                                                                                💭 {log.notes}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex gap-2 ml-2">
                                                                                    {openEditDailyLog && <button onClick={() => openEditDailyLog(log)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>}
                                                                                    <button onClick={() => deleteItem('dailyLogs', log.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                                </div>
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
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">{t('history.sectionCycles')} ({filteredCycles.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredCycles.slice(0, cyclesHistoryToShow).map(cycle => (
                                                                <div key={cycle.id} className="bg-indigo-900/30 border-indigo-700/50 p-3 rounded-lg border">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className="text-sm font-medium text-white">
                                                                            {(() => {
                                                                                const d = safeDate(cycle.timestamp);
                                                                                return d ? `${d.toLocaleDateString(i18n.language)} ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : 'Data inválida';
                                                                            })()}
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button onClick={() => openEditCycle(cycle)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>
                                                                            <button onClick={() => deleteItem('cycles', cycle.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                        </div>
                                                                    </div>
                                                                    {cycle.bedtime && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">{t('history.bedtime')} </span>
                                                                            <span className="font-medium">{cycle.bedtime}</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.sleep && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">{t('history.sleepHours')} </span>
                                                                            <span className="font-medium">{cycle.sleep}h</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.triggers && cycle.triggers.length > 0 && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">{t('history.triggers')} </span>
                                                                            <span className="font-medium">{cycle.triggers.join(', ')}</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.mg && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">{t('history.dailyUse')} </span>
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
                                                        {filteredCycles.length > cyclesHistoryToShow && (
                                                            <button
                                                                onClick={() => setCyclesHistoryToShow(prev => prev + 10)}
                                                                className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                                            >
                                                                Mostrar mais ({filteredCycles.length - cyclesHistoryToShow} restantes)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                        </div>
                                    )}
                                </div>
    );
}
