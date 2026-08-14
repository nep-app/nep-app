import React, { useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { safeToISODate } from '../utils/helpers';
import { AnalysesCoachTab } from './analyses/AnalysesCoachTab';
import { AnalysesEstadoTab } from './analyses/AnalysesEstadoTab';
import { AnalysesCorrelacoesTab } from './analyses/AnalysesCorrelacoesTab';
import { AnalysesImpactoTab } from './analyses/AnalysesImpactoTab';
import { UrgeSurfingStats } from '../components/UrgeSurfingStats';

const { getDateRangeForPeriod, filterByDateRange } = analyticsService;

export function AnalysesView({
    analysisSubView,
    setAnalysisSubView,
    patternsPeriod,
    setPatternsPeriod,
    patternsPeriodOffset,
    setPatternsPeriodOffset
}) {
    const { consumptions, wellbeingLogs, cycles, dailyLogs, goals, reflections, thoughts } = useData();
    const { weighingMeasuredMgByDate } = useMetrics();
    const { selectedCycle } = useUI();
    const { t, i18n } = useTranslation();

    const analysisData = useMemo(() => {
        const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
        const filteredConsumptions = filterByDateRange(consumptions, dateRange);
        const filteredWellbeingLogs = filterByDateRange(wellbeingLogs, dateRange);
        const filteredCycles = filterByDateRange(cycles, dateRange);
        const filteredDailyLogs = filterByDateRange(dailyLogs, dateRange);
        const filteredReflections = filterByDateRange(reflections, dateRange);
        const filteredThoughts = filterByDateRange(thoughts, dateRange);

        const atypicalDates = new Set(
            filteredWellbeingLogs
                .filter(w => w.isAtypical)
                .map(w => w.date || safeToISODate(w.timestamp))
                .filter(Boolean)
        );
        const atypicalCount = atypicalDates.size;

        return {
            dateRange,
            atypicalCount,
            atypicalDates,
            analysisConsumptions: filteredConsumptions.filter(c => !atypicalDates.has(c.date || safeToISODate(c.timestamp))),
            analysisWellbeing: filteredWellbeingLogs.filter(w => !atypicalDates.has(w.date || safeToISODate(w.timestamp))),
            analysisCycles: filteredCycles.filter(c => !atypicalDates.has(c.date || safeToISODate(c.timestamp))),
            analysisDailyLogs: filteredDailyLogs.filter(l => !atypicalDates.has(l.date || safeToISODate(l.timestamp))),
            analysisReflections: filteredReflections,
            analysisThoughts: filteredThoughts,
        };
    }, [consumptions, wellbeingLogs, cycles, dailyLogs, reflections, thoughts, patternsPeriod, patternsPeriodOffset]);

    const {
        dateRange, atypicalCount,
        analysisConsumptions, analysisWellbeing, analysisCycles,
        analysisDailyLogs, analysisReflections, analysisThoughts,
    } = analysisData;

    // mg reais por dia (derivados das PESAGENS — mesma fonte do gráfico de
    // dosagem), limitados às datas do período em análise. Serve para o Coach
    // contar corretamente os "dias com dosagem" (o campo antigo cycle.mg
    // subcontava — só apanhava 16 dias).
    const analysisMgByDate = useMemo(() => {
        const out = {};
        const seen = new Set();
        for (const c of analysisConsumptions) {
            const d = c.date || safeToISODate(c.timestamp);
            if (!d || seen.has(d)) continue;
            seen.add(d);
            const mg = weighingMeasuredMgByDate?.[d];
            if (mg != null && mg > 0) out[d] = mg;
        }
        return out;
    }, [analysisConsumptions, weighingMeasuredMgByDate]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{t('nav.analyses')}</h2>

            {/* Selector de período */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-4 border">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-white">{t('analyses.periodLabel')}</div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPatternsPeriodOffset(prev => prev + 1)}
                            disabled={patternsPeriodOffset >= 100 || patternsPeriod === 'tudo'}
                            className={(patternsPeriodOffset >= 100 || patternsPeriod === 'tudo') ? 'opacity-30 cursor-not-allowed p-1.5 rounded' : 'p-1.5 rounded hover:bg-gray-700'}
                        >
                            <Icons.ChevronLeft className="w-4 h-4 text-white" />
                        </button>
                        <button
                            onClick={() => setPatternsPeriodOffset(prev => Math.max(0, prev - 1))}
                            disabled={patternsPeriodOffset === 0 || patternsPeriod === 'tudo'}
                            className={(patternsPeriodOffset === 0 || patternsPeriod === 'tudo') ? 'opacity-30 cursor-not-allowed p-1.5 rounded' : 'p-1.5 rounded hover:bg-gray-700'}
                        >
                            <Icons.ChevronRight className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                        <button
                            key={period}
                            onClick={() => { setPatternsPeriod(period); setPatternsPeriodOffset(0); }}
                            className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ' + (patternsPeriod === period ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}
                        >
                            {period === 'hoje' && t('analyses.periodHoje')}
                            {period === 'semana' && t('analyses.periodSemana')}
                            {period === 'mes' && t('analyses.periodMes')}
                            {period === 'tudo' && t('analyses.periodTudo')}
                        </button>
                    ))}
                </div>
                {patternsPeriod !== 'tudo' && (
                    <div className="text-xs mt-2 text-center text-gray-400">
                        {new Date(dateRange.start + 'T12:00:00').toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}
                        {' - '}
                        {new Date(dateRange.end + 'T12:00:00').toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {/* Sub-tab navigation */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['correlacoes', 'estado', 'impacto', 'coach'].map(subView => (
                        <button
                            key={subView}
                            onClick={() => setAnalysisSubView(subView)}
                            className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ' + (analysisSubView === subView ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}
                        >
                            {subView === 'correlacoes' && t('analyses.tabCorrelacoes')}
                            {subView === 'estado' && t('analyses.tabEstado')}
                            {subView === 'impacto' && t('analyses.tabImpacto')}
                            {subView === 'coach' && t('analyses.tabCoach')}
                        </button>
                    ))}
                </div>

                {atypicalCount > 0 && (
                    <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2 text-xs text-yellow-400 flex items-center gap-2">
                        <span>📌</span>
                        <span>{t('wellbeing.atypicalBanner', { count: atypicalCount })}</span>
                    </div>
                )}

                {analysisSubView === 'coach' && (
                    <AnalysesCoachTab
                        analysisConsumptions={analysisConsumptions}
                        analysisWellbeing={analysisWellbeing}
                        analysisCycles={analysisCycles}
                        analysisDailyLogs={analysisDailyLogs}
                        analysisReflections={analysisReflections}
                        analysisThoughts={analysisThoughts}
                        goals={goals}
                        consumptions={consumptions}
                        mgByDate={analysisMgByDate}
                        patternsPeriod={patternsPeriod}
                        patternsPeriodOffset={patternsPeriodOffset}
                    />
                )}
                {analysisSubView === 'estado' && (
                    <>
                        {/* Sempre "desde sempre" (não depende do período) — evita
                            aparecer só no "tudo". */}
                        <UrgeSurfingStats dateRange={null} />
                        <AnalysesEstadoTab
                            analysisConsumptions={analysisConsumptions}
                            analysisWellbeing={analysisWellbeing}
                            analysisCycles={analysisCycles}
                        />
                    </>
                )}
                {analysisSubView === 'correlacoes' && (
                    <AnalysesCorrelacoesTab
                        analysisConsumptions={analysisConsumptions}
                        analysisWellbeing={analysisWellbeing}
                        analysisCycles={analysisCycles}
                        analysisDailyLogs={analysisDailyLogs}
                    />
                )}
                {analysisSubView === 'impacto' && (
                    <AnalysesImpactoTab
                        analysisConsumptions={analysisConsumptions}
                        analysisWellbeing={analysisWellbeing}
                        analysisCycles={analysisCycles}
                        analysisDailyLogs={analysisDailyLogs}
                        selectedCycle={selectedCycle}
                    />
                )}
            </div>
        </div>
    );
}
