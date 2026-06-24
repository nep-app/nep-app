import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { safeToISODate } from '../../utils/helpers';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const WellbeingChart = lazy(() => import('../../components/WellbeingChart'));

export const AnalysesImpactoTab = React.memo(function AnalysesImpactoTab({
    analysisConsumptions,
    analysisWellbeing,
    analysisCycles,
    analysisDailyLogs,
    selectedCycle,
}) {
    const { t } = useTranslation();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const [expandedSections, setExpandedSections] = useState({
        intraDayAnalysis: !isMobile,
        experimental: !isMobile,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const impactoData = useMemo(() => {
        // Agrupar dados por dia para experimentalFeatures
        const dailyData = {};

        analysisWellbeing.forEach(w => {
            const date = w.date || safeToISODate(w.timestamp);
            if (!dailyData[date]) {
                dailyData[date] = { sleep: null, exercise: null, food: null, social: null, mood: null, energy: null, consumptions: 0 };
            }

            if (w.sleep) dailyData[date].sleep = parseInt(w.sleep);
            if (w.exerciseType || (w.exerciseDuration > 0) || w.exercise) dailyData[date].exercise = 1;
            if (w.food) dailyData[date].food = parseInt(w.food);
            if (w.social) dailyData[date].social = parseInt(w.social);
            if (w.mood) dailyData[date].mood = parseInt(w.mood);
            if (w.energy) dailyData[date].energy = parseInt(w.energy);
        });

        // Adicionar consumos
        analysisConsumptions.forEach(c => {
            const date = c.date || safeToISODate(c.timestamp);
            if (!dailyData[date]) {
                dailyData[date] = { sleep: null, exercise: null, food: null, social: null, mood: null, energy: null, consumptions: 0 };
            }
            dailyData[date].consumptions++;
        });

        // Agregar dosagem por dia
        const dosageData = {};
        [...analysisCycles, ...analysisDailyLogs].forEach(item => {
            const itemDate = item.date || safeToISODate(item.timestamp);
            if (!itemDate || !item.mg) return;

            const mg = typeof item.mg === 'number' ? item.mg : parseFloat(item.mg);
            if (isNaN(mg) || mg <= 0) return;

            if (!dosageData[itemDate]) {
                dosageData[itemDate] = { totalMg: 0, sleep: dailyData[itemDate]?.sleep || null, mood: dailyData[itemDate]?.mood || null, energy: dailyData[itemDate]?.energy || null };
            }

            dosageData[itemDate].totalMg += mg;
        });

        // ⚗️ FEATURES EXPERIMENTAIS
        const experimentalFeatures = {
            compositeTriggers: [],
            antecedents: [],
            satisfaction: []
        };

        if (analysisConsumptions.length >= 10 && analysisWellbeing.length >= 10) {
            // 1. GATILHOS COMPOSTOS (combinações de fatores)
            const compositeData = [];

            Object.entries(dailyData).forEach(([date, data]) => {
                const cons = data.consumptions || 0;
                if (cons > 0 && data.mood !== null && data.sleep !== null) {
                    compositeData.push({
                        date,
                        cons,
                        lowMood: parseInt(data.mood) <= 4,
                        poorSleep: parseInt(data.sleep) <= 5,
                        lowEnergy: data.energy ? parseInt(data.energy) <= 4 : null,
                        mood: parseInt(data.mood),
                        sleep: parseInt(data.sleep),
                        energy: data.energy ? parseInt(data.energy) : null
                    });
                }
            });

            if (compositeData.length >= 10) {
                // Analisar: Humor Baixo + Sono Mau
                const lowMoodPoorSleep = compositeData.filter(d => d.lowMood && d.poorSleep);
                const normalDays = compositeData.filter(d => !d.lowMood || !d.poorSleep);

                if (lowMoodPoorSleep.length >= 3 && normalDays.length >= 3) {
                    const avgConsWhenBoth = lowMoodPoorSleep.reduce((s, d) => s + d.cons, 0) / lowMoodPoorSleep.length;
                    const avgConsNormal = normalDays.reduce((s, d) => s + d.cons, 0) / normalDays.length;
                    const increasePct = avgConsNormal > 0 ? ((avgConsWhenBoth - avgConsNormal) / avgConsNormal * 100) : 0;

                    if (Math.abs(increasePct) > 10) {
                        experimentalFeatures.compositeTriggers.push({
                            name: t('analyses.impactCompositeLowMoodSleep'),
                            icon: '😔💤',
                            avgCons: avgConsWhenBoth.toFixed(1),
                            normalCons: avgConsNormal.toFixed(1),
                            increase: increasePct.toFixed(0),
                            occurrences: lowMoodPoorSleep.length
                        });
                    }
                }

                // Analisar: Humor Baixo + Energia Baixa
                const hasEnergy = compositeData.filter(d => d.lowEnergy !== null);
                if (hasEnergy.length >= 10) {
                    const lowMoodLowEnergy = hasEnergy.filter(d => d.lowMood && d.lowEnergy);
                    const normalDaysEnergy = hasEnergy.filter(d => !d.lowMood || !d.lowEnergy);

                    if (lowMoodLowEnergy.length >= 3 && normalDaysEnergy.length >= 3) {
                        const avgConsWhenBoth = lowMoodLowEnergy.reduce((s, d) => s + d.cons, 0) / lowMoodLowEnergy.length;
                        const avgConsNormal = normalDaysEnergy.reduce((s, d) => s + d.cons, 0) / normalDaysEnergy.length;
                        const increasePct = avgConsNormal > 0 ? ((avgConsWhenBoth - avgConsNormal) / avgConsNormal * 100) : 0;

                        if (Math.abs(increasePct) > 10) {
                            experimentalFeatures.compositeTriggers.push({
                                name: t('analyses.impactCompositeLowMoodEnergy'),
                                icon: '😔⚡',
                                avgCons: avgConsWhenBoth.toFixed(1),
                                normalCons: avgConsNormal.toFixed(1),
                                increase: increasePct.toFixed(0),
                                occurrences: lowMoodLowEnergy.length
                            });
                        }
                    }
                }
            }

            // 2. ANTECEDENTES 24-48h (padrões antes de consumir)
            const sortedDates = Object.keys(dailyData).sort();
            sortedDates.forEach((date, idx) => {
                const today = dailyData[date];
                const todayCons = today.consumptions || 0;

                if (todayCons > 0 && idx >= 2) {
                    // Olhar para os 2 dias anteriores
                    const yesterday = dailyData[sortedDates[idx - 1]];
                    const dayBefore = dailyData[sortedDates[idx - 2]];

                    if (yesterday?.mood && dayBefore?.mood) {
                        // Detectar tendência de declínio de humor
                        const moodDecline = parseInt(dayBefore.mood) - parseInt(yesterday.mood) > 1;
                        const poorSleepStreak = yesterday.sleep && parseInt(yesterday.sleep) <= 5 && dayBefore.sleep && parseInt(dayBefore.sleep) <= 5;

                        if (moodDecline) {
                            experimentalFeatures.antecedents.push({
                                date,
                                pattern: t('analyses.impactAntecedentMoodFalling'),
                                icon: '📉',
                                cons: todayCons
                            });
                        }

                        if (poorSleepStreak) {
                            experimentalFeatures.antecedents.push({
                                date,
                                pattern: t('analyses.impactAntecedentSleepPoor'),
                                icon: '💤',
                                cons: todayCons
                            });
                        }
                    }
                }
            });

            // 3. SATISFAÇÃO/EFICÁCIA (melhoria pós-consumo)
            const satisfactionData = [];

            analysisConsumptions.forEach(cons => {
                const consTime = new Date(cons.timestamp);

                // Encontrar bem-estar ANTES (-2h a 0h) e DEPOIS (+1h a +3h)
                const beforeRecords = analysisWellbeing.filter(w => {
                    const wTime = new Date(w.timestamp);
                    const hoursDiff = (wTime - consTime) / (1000 * 60 * 60);
                    return hoursDiff >= -2 && hoursDiff <= 0 && w.mood;
                });

                const afterRecords = analysisWellbeing.filter(w => {
                    const wTime = new Date(w.timestamp);
                    const hoursDiff = (wTime - consTime) / (1000 * 60 * 60);
                    return hoursDiff >= 1 && hoursDiff <= 3 && w.mood;
                });

                if (beforeRecords.length > 0 && afterRecords.length > 0) {
                    const avgBefore = beforeRecords.reduce((s, r) => s + parseInt(r.mood), 0) / beforeRecords.length;
                    const avgAfter = afterRecords.reduce((s, r) => s + parseInt(r.mood), 0) / afterRecords.length;
                    const improvement = avgAfter - avgBefore;

                    satisfactionData.push({
                        before: avgBefore,
                        after: avgAfter,
                        improvement,
                        effective: improvement > 0.5
                    });
                }
            });

            if (satisfactionData.length >= 5) {
                const avgImprovement = satisfactionData.reduce((s, d) => s + d.improvement, 0) / satisfactionData.length;
                const effectiveCount = satisfactionData.filter(d => d.effective).length;
                const effectiveRate = (effectiveCount / satisfactionData.length * 100);

                experimentalFeatures.satisfaction.push({
                    avgImprovement: avgImprovement.toFixed(1),
                    effectiveRate: effectiveRate.toFixed(0),
                    totalEvents: satisfactionData.length,
                    effectiveCount
                });
            }
        }

        // Agregar TODOS os consumos de TODOS os dias e calcular impacto médio
        const aggregatedImpact = [];

        analysisConsumptions.forEach(cons => {
            const consTime = new Date(cons.timestamp);

            // Encontrar registos de bem-estar em janela temporal (-2h a +4h)
            const nearbyWellbeing = analysisWellbeing.filter(w => {
                const wTime = new Date(w.timestamp);
                const hoursDiff = (wTime - consTime) / (1000 * 60 * 60);
                return hoursDiff >= -2 && hoursDiff <= 4 && w.mood;
            });

            nearbyWellbeing.forEach(w => {
                const wTime = new Date(w.timestamp);
                const hoursDiff = (wTime - consTime) / (1000 * 60 * 60);
                aggregatedImpact.push({
                    timeOffset: hoursDiff,
                    mood: parseInt(w.mood),
                    energy: w.energy ? parseInt(w.energy) : null
                });
            });
        });

        // Calcular chartData e latência para impacto médio agregado
        let chartData = null;
        let latency = [];

        if (aggregatedImpact.length >= 10) {
            // Agrupar por janelas temporais
            const timeWindows = [
                { label: '-2h', min: -2.5, max: -1.5, data: [] },
                { label: '-1h', min: -1.5, max: -0.5, data: [] },
                { label: '0h', min: -0.25, max: 0.25, data: [] },
                { label: '+30min', min: 0.25, max: 0.75, data: [] },
                { label: '+1h', min: 0.75, max: 1.5, data: [] },
                { label: '+2h', min: 1.5, max: 2.5, data: [] },
                { label: '+4h', min: 3.5, max: 4.5, data: [] }
            ];

            aggregatedImpact.forEach(point => {
                timeWindows.forEach(window => {
                    if (point.timeOffset >= window.min && point.timeOffset < window.max) {
                        window.data.push(point);
                    }
                });
            });

            // Calcular médias por janela
            const computedChartData = timeWindows
                .filter(w => w.data.length >= 2)
                .map(w => {
                    const energyData = w.data.filter(d => d.energy);
                    return {
                        time: w.label,
                        humor: (w.data.reduce((s, d) => s + d.mood, 0) / w.data.length).toFixed(1),
                        energia: energyData.length > 0 ?
                            (energyData.reduce((s, d) => s + d.energy, 0) / energyData.length).toFixed(1) : null,
                        count: w.data.length
                    };
                });

            if (computedChartData.length >= 3) {
                chartData = computedChartData;

                // Métricas de latência
                const baseline = chartData.find(d => d.time === '0h');
                const post30min = chartData.find(d => d.time === '+30min');
                const post1h = chartData.find(d => d.time === '+1h');
                const post2h = chartData.find(d => d.time === '+2h');

                if (baseline && post30min) {
                    latency.push({
                        window: t('analyses.impactLatency30min'),
                        delta: (parseFloat(post30min.humor) - parseFloat(baseline.humor)).toFixed(1),
                        isPeak: false
                    });
                }
                if (baseline && post1h) {
                    latency.push({
                        window: t('analyses.impactLatency1h'),
                        delta: (parseFloat(post1h.humor) - parseFloat(baseline.humor)).toFixed(1),
                        isPeak: false
                    });
                }
                if (baseline && post2h) {
                    latency.push({
                        window: t('analyses.impactLatency2h'),
                        delta: (parseFloat(post2h.humor) - parseFloat(baseline.humor)).toFixed(1),
                        isPeak: false
                    });
                }

                // Identificar pico
                if (latency.length > 0) {
                    const maxIdx = latency.reduce((maxI, curr, i, arr) => parseFloat(curr.delta) > parseFloat(arr[maxI].delta) ? i : maxI, 0);
                    latency[maxIdx].isPeak = true;
                }
            }
        }

        // Análise Intra-dia
        const dayData = {};

        analysisConsumptions.forEach(c => {
            if (!c.date) return;
            if (!dayData[c.date]) dayData[c.date] = { consumptions: [], wellbeing: [] };
            dayData[c.date].consumptions.push({ timestamp: c.timestamp, type: 'consumption' });
        });

        analysisWellbeing.forEach(w => {
            if (!w.date) return;
            if (!dayData[w.date]) dayData[w.date] = { consumptions: [], wellbeing: [] };
            if (w.mood && !isNaN(parseInt(w.mood))) {
                dayData[w.date].wellbeing.push({ timestamp: w.timestamp, mood: parseInt(w.mood), energy: parseInt(w.energy) || null });
            }
        });

        const cyclesWithData = Object.values(dayData).filter(c => c.consumptions.length > 0 && c.wellbeing.length >= 1);

        let intraDayStats = null;

        if (cyclesWithData.length >= 1) {
            // 1. Evolução de Humor e Energia ao longo do ciclo
            let moodProgression = { start: [], middle: [], end: [] };
            let energyProgression = { start: [], middle: [], end: [] };
            let moodImproves = 0;
            let moodWorsens = 0;
            let energyImproves = 0;
            let energyWorsens = 0;

            // 2. Padrão temporal de consumo
            let consumptionTiming = { start: 0, middle: 0, end: 0 };

            // 3. Intervalos entre consumos
            let intervals = [];

            // 4. Impacto do consumo
            let moodAfterCons = { better: 0, worse: 0, same: 0 };
            let energyAfterCons = { better: 0, worse: 0, same: 0 };

            cyclesWithData.forEach(cycle => {
                const sortedWellbeing = cycle.wellbeing.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                const sortedConsumptions = cycle.consumptions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                if (sortedWellbeing.length >= 1) {
                    // Dividir ciclo em 3 partes (início, meio, fim)
                    const third = Math.floor(sortedWellbeing.length / 3);

                    const startSegment = sortedWellbeing.slice(0, Math.max(1, third));
                    const middleSegment = sortedWellbeing.slice(third, sortedWellbeing.length - third);
                    const endSegment = sortedWellbeing.slice(-Math.max(1, third));

                    // Calcular médias de cada segmento
                    const startMood = startSegment.reduce((s, w) => s + w.mood, 0) / startSegment.length;
                    const endMood = endSegment.reduce((s, w) => s + w.mood, 0) / endSegment.length;

                    moodProgression.start.push(startMood);
                    if (middleSegment.length > 0) {
                        moodProgression.middle.push(middleSegment.reduce((s, w) => s + w.mood, 0) / middleSegment.length);
                    }
                    moodProgression.end.push(endMood);

                    // Tendência de humor
                    if (endMood > startMood + 0.5) moodImproves++;
                    else if (endMood < startMood - 0.5) moodWorsens++;

                    // Energia
                    const startEnergyData = startSegment.filter(w => w.energy);
                    const endEnergyData = endSegment.filter(w => w.energy);
                    const startEnergy = startEnergyData.reduce((s, w) => s + w.energy, 0) / startEnergyData.length;
                    const endEnergy = endEnergyData.reduce((s, w) => s + w.energy, 0) / endEnergyData.length;

                    if (!isNaN(startEnergy) && !isNaN(endEnergy)) {
                        energyProgression.start.push(startEnergy);
                        energyProgression.end.push(endEnergy);

                        if (endEnergy > startEnergy + 0.5) energyImproves++;
                        else if (endEnergy < startEnergy - 0.5) energyWorsens++;
                    }
                }

                // Padrão temporal de consumo
                if (sortedConsumptions.length > 0 && sortedWellbeing.length >= 2) {
                    const cycleStart = new Date(sortedWellbeing[0].timestamp);
                    const cycleEnd = new Date(sortedWellbeing[sortedWellbeing.length - 1].timestamp);
                    const cycleDuration = cycleEnd - cycleStart;

                    sortedConsumptions.forEach(cons => {
                        const consTime = new Date(cons.timestamp);
                        const elapsed = consTime - cycleStart;
                        const position = elapsed / cycleDuration;

                        if (position < 0.33) consumptionTiming.start++;
                        else if (position < 0.67) consumptionTiming.middle++;
                        else consumptionTiming.end++;
                    });
                }

                // Intervalos entre consumos
                for (let i = 1; i < sortedConsumptions.length; i++) {
                    const interval = (new Date(sortedConsumptions[i].timestamp) - new Date(sortedConsumptions[i-1].timestamp)) / (1000 * 60 * 60);
                    intervals.push(interval);
                }

                // Impacto do consumo no humor/energia
                cycle.consumptions.forEach(cons => {
                    const consTime = new Date(cons.timestamp);
                    const afterWellbeing = cycle.wellbeing.filter(w => {
                        const wTime = new Date(w.timestamp);
                        const hoursDiff = (wTime - consTime) / (1000 * 60 * 60);
                        return hoursDiff > 0 && hoursDiff <= 3; // Nas 3h seguintes
                    });
                    const beforeWellbeing = cycle.wellbeing.filter(w => {
                        const wTime = new Date(w.timestamp);
                        const hoursDiff = (consTime - wTime) / (1000 * 60 * 60);
                        return hoursDiff > 0 && hoursDiff <= 3; // Nas 3h anteriores
                    });

                    if (afterWellbeing.length > 0 && beforeWellbeing.length > 0) {
                        const avgMoodBefore = beforeWellbeing.reduce((s, w) => s + w.mood, 0) / beforeWellbeing.length;
                        const avgMoodAfter = afterWellbeing.reduce((s, w) => s + w.mood, 0) / afterWellbeing.length;

                        if (avgMoodAfter > avgMoodBefore + 0.5) moodAfterCons.better++;
                        else if (avgMoodAfter < avgMoodBefore - 0.5) moodAfterCons.worse++;
                        else moodAfterCons.same++;

                        const energyBefore = beforeWellbeing.filter(w => w.energy);
                        const energyAfter = afterWellbeing.filter(w => w.energy);

                        if (energyBefore.length > 0 && energyAfter.length > 0) {
                            const avgEnergyBefore = energyBefore.reduce((s, w) => s + w.energy, 0) / energyBefore.length;
                            const avgEnergyAfter = energyAfter.reduce((s, w) => s + w.energy, 0) / energyAfter.length;

                            if (avgEnergyAfter > avgEnergyBefore + 0.5) energyAfterCons.better++;
                            else if (avgEnergyAfter < avgEnergyBefore - 0.5) energyAfterCons.worse++;
                            else energyAfterCons.same++;
                        }
                    }
                });
            });

            // Calcular médias globais
            const avgMoodStart = moodProgression.start.length > 0 ? (moodProgression.start.reduce((a,b) => a+b, 0) / moodProgression.start.length).toFixed(1) : null;
            const avgMoodMiddle = moodProgression.middle.length > 0 ? (moodProgression.middle.reduce((a,b) => a+b, 0) / moodProgression.middle.length).toFixed(1) : null;
            const avgMoodEnd = moodProgression.end.length > 0 ? (moodProgression.end.reduce((a,b) => a+b, 0) / moodProgression.end.length).toFixed(1) : null;

            const avgEnergyStart = energyProgression.start.length > 0 ? (energyProgression.start.reduce((a,b) => a+b, 0) / energyProgression.start.length).toFixed(1) : null;
            const avgEnergyEnd = energyProgression.end.length > 0 ? (energyProgression.end.reduce((a,b) => a+b, 0) / energyProgression.end.length).toFixed(1) : null;

            const avgInterval = intervals.length > 0 ? (intervals.reduce((a,b) => a+b, 0) / intervals.length).toFixed(1) : null;

            const totalCons = consumptionTiming.start + consumptionTiming.middle + consumptionTiming.end;

            intraDayStats = {
                avgMoodStart,
                avgMoodMiddle,
                avgMoodEnd,
                avgEnergyStart,
                avgEnergyEnd,
                avgInterval,
                totalCons,
                consumptionTiming,
                moodImproves,
                moodWorsens,
                energyImproves,
                energyWorsens,
                moodAfterCons,
                energyAfterCons,
                hasData: true,
            };
        }

        return {
            dailyData,
            dosageData,
            experimentalFeatures,
            chartData,
            latency,
            intraDayStats,
        };
    }, [analysisConsumptions, analysisWellbeing, analysisCycles, analysisDailyLogs, selectedCycle]);

    const { experimentalFeatures, chartData, latency, intraDayStats } = impactoData;

    return (
        <div className="space-y-4">
            {/* 📊 IMPACTO MÉDIO AGREGADO (Multi-dia) */}
            {chartData && (() => {
                return (
                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-4 md:p-6 border'}>
                        <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection('intraDayAnalysis')}>
                            <div>
                                <h3 className={'font-semibold ' + ('text-white')}>{t('analyses.impactTitle')}</h3>
                                <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                    {t('analyses.impactAvgDesc')}
                                </p>
                            </div>
                            <button className={'p-2 rounded-lg transition-colors ' + ('hover:bg-gray-700')}>
                                {expandedSections.intraDayAnalysis ? '▼' : '▶'}
                            </button>
                        </div>
                        {expandedSections.intraDayAnalysis && (
                            <div className="space-y-4 mt-4">
                                {/* Latência Temporal + Eficácia (INTEGRADAS) */}
                                {(latency.length > 0 || experimentalFeatures.satisfaction.length > 0) && (
                                    <div className="space-y-3">
                                        {/* Impacto Imediato do Consumo (Evolução + Eficácia juntos) */}
                                        {(latency.length > 0 || experimentalFeatures.satisfaction.length > 0) && (
                                            <div className={('bg-gradient-to-br from-purple-900/20 to-green-900/20 border-purple-700/50') + ' rounded-lg p-4 border'}>
                                                <div className={'text-sm font-semibold mb-4 ' + ('text-purple-300')}>{t('analyses.impactMoodTitle')}</div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Evolução Temporal (0h → 30min/1h/2h) */}
                                                    {latency.length > 0 && (
                                                        <div>
                                                            <div className={'text-xs font-semibold mb-2 opacity-75'}>{t('analyses.impactMoodChangeSince')}</div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {latency.map(lat => (
                                                                    <div key={lat.window} className={'text-center p-2 rounded ' + ('bg-gray-800/50')}>
                                                                        <div className={'text-xs opacity-60'}>{lat.window}</div>
                                                                        <div className={'text-lg font-bold ' + (parseFloat(lat.delta) > 0 ? ('text-green-400') : parseFloat(lat.delta) < 0 ? ('text-red-400') : ('text-gray-400'))}>
                                                                            {lat.delta > 0 ? '+' : ''}{lat.delta}
                                                                        </div>
                                                                        {lat.isPeak && <div className={'text-xs font-medium mt-0.5 ' + ('text-yellow-400')}>⚡</div>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Eficácia (Antes → Depois) */}
                                                    {experimentalFeatures.satisfaction.length > 0 && experimentalFeatures.satisfaction.map((sat, idx) => (
                                                        <div key={idx}>
                                                            <div className={'text-xs font-semibold mb-2 opacity-75'}>{t('analyses.impactEfficacyLabel')}</div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className={'text-center p-2 rounded ' + ('bg-gray-800/50')}>
                                                                    <div className={'text-xs opacity-60'}>{t('analyses.impactImprovementLabel')}</div>
                                                                    <div className={'text-lg font-bold ' + (parseFloat(sat.avgImprovement) > 0 ? ('text-green-400') : parseFloat(sat.avgImprovement) < 0 ? ('text-red-400') : ('text-gray-400'))}>
                                                                        {sat.avgImprovement > 0 ? '+' : ''}{sat.avgImprovement}
                                                                    </div>
                                                                    <div className={'text-xs opacity-60'}>pts</div>
                                                                </div>
                                                                <div className={'text-center p-2 rounded ' + ('bg-gray-800/50')}>
                                                                    <div className={'text-xs opacity-60'}>{t('analyses.impactRateLabel')}</div>
                                                                    <div className={'text-lg font-bold ' + ('text-green-400')}>
                                                                        {sat.effectiveRate}%
                                                                    </div>
                                                                    <div className={'text-xs opacity-60'}>{sat.effectiveCount}/{sat.totalEvents}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Gráfico Agregado */}
                                <div className={('bg-gray-800/50') + ' rounded-lg p-4'}>
                                    <div className={'text-sm font-semibold mb-3 ' + ('text-gray-300')}>{t('analyses.impactTemporalEvolution')}</div>
                                    <div style={{ width: '100%', height: 200 }}>
                                        <ResponsiveContainer>
                                            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={'#374151'} />
                                                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#1f2937',
                                                        border: `1px solid ${'#374151'}`,
                                                        borderRadius: '6px',
                                                        fontSize: '12px'
                                                    }}
                                                />
                                                <Line type="monotone" dataKey="humor" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name={t('analyses.impactChartMood')} />
                                                {chartData.some(d => d.energia) && (
                                                    <Line type="monotone" dataKey="energia" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name={t('analyses.impactChartEnergy')} />
                                                )}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className={'text-xs italic mt-2 ' + ('text-gray-400')}>
                                        {t('analyses.impactXAxisLabel')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ⚗️ FEATURES EXPERIMENTAIS */}
            {(experimentalFeatures.compositeTriggers.length > 0 || experimentalFeatures.antecedents.length > 0 || experimentalFeatures.satisfaction.length > 0) && (
                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-4 md:p-6 border border-dashed'}>
                    <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection('experimental')}>
                        <div>
                            <h3 className={'font-semibold ' + ('text-white')}>⚗️ {t('analyses.experimentalFeatures')}</h3>
                            <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                {t('analyses.impactExperimental')}
                            </p>
                        </div>
                        <button className={'p-2 rounded-lg transition-colors ' + ('hover:bg-gray-700')}>
                            {expandedSections.experimental ? '▼' : '▶'}
                        </button>
                    </div>
                    {expandedSections.experimental && (
                        <div className="space-y-4 mt-4">
                            {/* Gatilhos Compostos */}
                            {experimentalFeatures.compositeTriggers.length > 0 && (
                                <div className={('bg-orange-900/20 border-orange-700/50') + ' rounded-lg p-4 border'}>
                                    <div className={'text-sm font-semibold mb-3 ' + ('text-orange-300')}>
                                        {t('analyses.impactCompositeTriggers')}
                                    </div>
                                    <p className={'text-xs mb-3 ' + ('text-gray-400')}>
                                        {t('analyses.impactCompositeTriggersDesc')}
                                    </p>
                                    <div className="space-y-2">
                                        {experimentalFeatures.compositeTriggers.map((trigger, idx) => (
                                            <div key={idx} className={'p-3 rounded border ' + ('bg-gray-800/50 border-gray-700')}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-lg">{trigger.icon}</span>
                                                            <span className={'font-semibold text-sm ' + ('text-gray-300')}>
                                                                {trigger.name}
                                                            </span>
                                                        </div>
                                                        <div className={'text-xs ' + ('text-gray-400')}>
                                                            {t('analyses.impactOccurrencesRegistered', { n: trigger.occurrences })}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={'text-2xl font-bold ' + (parseFloat(trigger.increase) > 0 ? ('text-red-400') : ('text-green-400'))}>
                                                            {trigger.increase > 0 ? '+' : ''}{trigger.increase}%
                                                        </div>
                                                        <div className={'text-xs ' + ('text-gray-400')}>
                                                            {trigger.avgCons} vs {trigger.normalCons} cons
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Antecedentes */}
                            {experimentalFeatures.antecedents.length > 0 && (
                                <div className={('bg-blue-900/20 border-blue-700/50') + ' rounded-lg p-4 border'}>
                                    <div className={'text-sm font-semibold mb-3 ' + ('text-blue-300')}>
                                        {t('analyses.impactAntecedents')}
                                    </div>
                                    <div className="space-y-1">
                                        {/* Agrupar por padrão */}
                                        {(() => {
                                            const grouped = {};
                                            experimentalFeatures.antecedents.forEach(a => {
                                                if (!grouped[a.pattern]) grouped[a.pattern] = { ...a, count: 0 };
                                                grouped[a.pattern].count++;
                                            });
                                            return Object.values(grouped).map((pattern, idx) => (
                                                <div key={idx} className={'flex items-center justify-between p-2 rounded ' + ('bg-gray-800/50')}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base">{pattern.icon}</span>
                                                        <span className={'text-sm ' + ('text-gray-300')}>
                                                            {pattern.pattern}
                                                        </span>
                                                    </div>
                                                    <div className={'text-xs font-semibold ' + ('text-blue-400')}>
                                                        {pattern.count}x
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            <p className={'text-xs italic ' + ('text-gray-400')}>
                                {t('analyses.impactExperimental')}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Análise Intra-dia */}
            {intraDayStats ? (
                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                    <h3 className={'font-semibold mb-2 ' + ('text-white')}>{t('analyses.intradayTitle')}</h3>
                    <p className={'text-xs mb-4 ' + ('text-gray-400')}>
                        {t('analyses.impactIntraDayDesc')}
                    </p>
                    <div className="space-y-4">
                        {/* Evolução de Humor e Energia */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Evolução de Humor */}
                            <div className={('bg-blue-900/20 border-blue-700/50') + ' rounded-lg p-4 border'}>
                                <div className={'text-sm font-semibold mb-3 ' + ('text-blue-300')}>{t('analyses.moodEvolution')}</div>

                                {intraDayStats.avgMoodStart && intraDayStats.avgMoodEnd && (() => {
                                    const diff = parseFloat(intraDayStats.avgMoodEnd) - parseFloat(intraDayStats.avgMoodStart);
                                    const arrow = diff > 0.5 ? '↗️' : diff < -0.5 ? '↘️' : '→';
                                    const trendText = diff > 0.5 ? t('analyses.moodImproves') : diff < -0.5 ? t('analyses.moodDeclines') : t('analyses.energyStable');

                                    return (
                                        <>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={'text-lg font-bold ' + ('text-blue-400')}>{intraDayStats.avgMoodStart}</span>
                                                    <span className="text-xl">{arrow}</span>
                                                    <span className={'text-lg font-bold ' + ('text-blue-400')}>{intraDayStats.avgMoodEnd}</span>
                                                </div>
                                                <span className={'text-sm font-semibold px-2 py-1 rounded ' + (diff > 0.5 ? ('bg-green-900/30 text-green-400') : diff < -0.5 ? ('bg-red-900/30 text-red-400') : ('bg-gray-700 text-gray-400'))}>
                                                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                                </span>
                                            </div>
                                            <p className={'text-xs italic ' + ('text-gray-400')}>
                                                💬 {trendText}
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Evolução de Energia */}
                            {intraDayStats.avgEnergyStart && intraDayStats.avgEnergyEnd && (() => {
                                const diff = parseFloat(intraDayStats.avgEnergyEnd) - parseFloat(intraDayStats.avgEnergyStart);
                                const arrow = diff > 0.5 ? '↗️' : diff < -0.5 ? '↘️' : '→';
                                const trendText = diff > 0.5 ? t('analyses.moodImproves') : diff < -0.5 ? t('analyses.moodDeclines') : t('analyses.energyStable');

                                return (
                                    <div className={('bg-yellow-900/20 border-yellow-700/50') + ' rounded-lg p-4 border'}>
                                        <div className={'text-sm font-semibold mb-3 ' + ('text-yellow-300')}>{t('analyses.energyEvolution')}</div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={'text-lg font-bold ' + ('text-yellow-400')}>{intraDayStats.avgEnergyStart}</span>
                                                <span className="text-xl">{arrow}</span>
                                                <span className={'text-lg font-bold ' + ('text-yellow-400')}>{intraDayStats.avgEnergyEnd}</span>
                                            </div>
                                            <span className={'text-sm font-semibold px-2 py-1 rounded ' + (diff > 0.5 ? ('bg-green-900/30 text-green-400') : diff < -0.5 ? ('bg-red-900/30 text-red-400') : ('bg-gray-700 text-gray-400'))}>
                                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                            </span>
                                        </div>
                                        <p className={'text-xs italic ' + ('text-gray-400')}>
                                            💬 {trendText}
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Impacto do Consumo - Novo Componente com Gráficos (Lazy Loaded) */}
                        <Suspense fallback={
                            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border text-center'}>
                                <div className="animate-pulse">
                                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mx-auto mb-4"></div>
                                    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{t('analyses.loadingChart')}</p>
                            </div>
                        }>
                            <WellbeingChart
                                wellbeingLogs={analysisWellbeing}
                                consumptions={analysisConsumptions}

                                selectedCycle={selectedCycle}
                            />
                        </Suspense>
                    </div>
                </div>
            ) : (
                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                    <h3 className={'font-semibold mb-2 ' + ('text-white')}>{t('analyses.intradayTitle')}</h3>
                    <p className={'text-xs mb-4 ' + ('text-gray-400')}>
                        {t('analyses.impactIntraDayDesc')}
                    </p>
                    <div className={'text-center py-6 text-sm ' + ('text-gray-400')}>
                        {t('analyses.impactNoData')}
                    </div>
                </div>
            )}
        </div>
    );
});
