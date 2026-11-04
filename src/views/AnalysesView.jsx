import React, { useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { safeToISODate, isDayMarkLog } from '../utils/helpers';
import { AnalysesCoachTab } from './analyses/AnalysesCoachTab';
import { AnalysesEstadoTab } from './analyses/AnalysesEstadoTab';
import { AnalysesCorrelacoesTab } from './analyses/AnalysesCorrelacoesTab';
import { AnalysesImpactoTab } from './analyses/AnalysesImpactoTab';
import { UrgeSurfingStats } from '../components/UrgeSurfingStats';
import { PeriodBar, ViewTabs } from '../components/ui/PeriodBar';

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
    const { dailySummary, unloggedDates } = useMetrics();
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
        // As Análises comparam quase tudo com o consumo ("isto anda junto com
        // aquilo"): um dia "não registei os consumos" teria consumo 0 falso. Por
        // isso aqui esses dias saem por inteiro (antes entravam como dias a zero).
        const unl = unloggedDates || new Set();
        const out = (x) => { const d = x.date || safeToISODate(x.timestamp); return atypicalDates.has(d) || unl.has(d); };

        return {
            dateRange,
            atypicalCount,
            atypicalDates,
            analysisConsumptions: filteredConsumptions.filter(c => !out(c)),
            analysisWellbeing: filteredWellbeingLogs.filter(w => !out(w)),
            analysisCycles: filteredCycles.filter(c => !out(c)),
            analysisDailyLogs: filteredDailyLogs.filter(l => !isDayMarkLog(l) && !out(l)),
            analysisReflections: filteredReflections,
            analysisThoughts: filteredThoughts,
        };
    }, [consumptions, wellbeingLogs, cycles, dailyLogs, reflections, thoughts, patternsPeriod, patternsPeriodOffset, unloggedDates]);

    const {
        dateRange, atypicalCount,
        analysisConsumptions, analysisWellbeing, analysisCycles,
        analysisDailyLogs, analysisReflections, analysisThoughts,
    } = analysisData;

    // mg real por dia a partir da FONTE UNIFICADA (dailySummary): inclui tanto o
    // "registo de mg" à mão (dailyLogs) como o mg derivado das pesagens — a mesma
    // regra do resto da app (o registo à mão manda; a pesagem preenche o resto).
    // Limitado às datas do período em análise. Serve para o Coach contar TODOS os
    // dias com dosagem (à mão OU pesados), não só os das pesagens.
    const analysisMgByDate = useMemo(() => {
        const out = {};
        const seen = new Set();
        for (const c of analysisConsumptions) {
            const d = c.date || safeToISODate(c.timestamp);
            if (!d || seen.has(d)) continue;
            seen.add(d);
            const mg = dailySummary?.[d]?.mg;
            if (mg != null && mg > 0) out[d] = mg;
        }
        return out;
    }, [analysisConsumptions, dailySummary]);
    // A mesma fonte, em lista, para as Correlações e o Impacto (antes só viam o
    // "Registar mg" à mão e perdiam tudo o que vem das pesagens do saco).
    const analysisMgDays = useMemo(
        () => Object.entries(analysisMgByDate).map(([date, mg]) => ({ date, mg })),
        [analysisMgByDate]
    );

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">{t('nav.analyses')}</h2>

            {/* Período e vistas: uma linha de texto + pílulas (ver PeriodBar). */}
            <PeriodBar
                periods={[['hoje', 'analyses.periodHoje'], ['semana', 'analyses.periodSemana'], ['mes', 'analyses.periodMes'], ['tudo', 'analyses.periodTudo']].map(([id, k]) => ({ id, label: t(k) }))}
                value={patternsPeriod}
                onChange={(id) => { setPatternsPeriod(id); setPatternsPeriodOffset(0); }}
                rangeLabel={patternsPeriod !== 'tudo'
                    ? new Date(dateRange.start).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })
                      + ' – ' + new Date(dateRange.end).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })
                    : null}
                onOlder={() => setPatternsPeriodOffset(prev => prev + 1)}
                onNewer={() => setPatternsPeriodOffset(prev => Math.max(0, prev - 1))}
                canOlder={patternsPeriodOffset < 100}
                canNewer={patternsPeriodOffset > 0}
            />

            <div className="space-y-4">
                <ViewTabs
                    tabs={[['correlacoes', 'analyses.tabCorrelacoes'], ['estado', 'analyses.tabEstado'], ['impacto', 'analyses.tabImpacto'], ['coach', 'analyses.tabCoach']].map(([id, k]) => ({ id, label: t(k) }))}
                    value={analysisSubView}
                    onChange={setAnalysisSubView}
                />

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
                        unloggedDates={unloggedDates}
                        excludedDays={analysisData.atypicalDates}
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
                        analysisMgDays={analysisMgDays}
                        analysisConsumptions={analysisConsumptions}
                        analysisWellbeing={analysisWellbeing}
                        analysisCycles={analysisCycles}
                        analysisDailyLogs={analysisDailyLogs}
                    />
                )}
                {analysisSubView === 'impacto' && (
                    <AnalysesImpactoTab
                        analysisMgDays={analysisMgDays}
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
