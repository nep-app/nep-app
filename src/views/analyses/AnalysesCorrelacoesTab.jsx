import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as analyticsService from '../../services/analyticsService';
import { getEmotionCategory } from '../../constants/emotions';
import { safeToISODate } from '../../utils/helpers';

export const AnalysesCorrelacoesTab = React.memo(function AnalysesCorrelacoesTab({
    analysisConsumptions,
    analysisWellbeing,
    analysisCycles,
    analysisDailyLogs,
}) {
    const { t, i18n } = useTranslation();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const [expandedSections, setExpandedSections] = useState({
        wellbeingConsumption: !isMobile,
        temporalImpact: !isMobile,
        sleepMood: !isMobile,
        bedtimeConsumption: !isMobile,
        bedtimeWellbeing: !isMobile,
        wellbeingDosage: !isMobile,
        temporalPatterns: !isMobile,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const correlacaoData = useMemo(() => {
        if (analysisConsumptions.length < 1) {
            return null;
        }

        // ===== 1. CORRELAÇÕES BIDIRECIONAIS =====
        // Agregar dados por dia
        const dailyData = {};


        // Contar consumos por dia
        analysisConsumptions.forEach(c => {
            if (!dailyData[c.date]) dailyData[c.date] = { consumptions: 0, sleep: null, mood: null, energy: null };
            dailyData[c.date].consumptions++;
        });

        // Adicionar sono dos ciclos (noturno + sesta)
        analysisCycles.forEach(c => {
            const cDate = c.date || safeToISODate(c.timestamp);
            if (!cDate || !c.sleep) return;
            if (!dailyData[cDate]) dailyData[cDate] = { consumptions: 0, sleep: null, mood: null, energy: null };
            const nightSleep = parseFloat(c.sleep);
            if (!isNaN(nightSleep)) {
                const napMins = analysisWellbeing
                    .filter(w => (w.date || safeToISODate(w.timestamp)) === cDate)
                    .reduce((sum, w) => sum + (w.napDuration || 0), 0);
                dailyData[cDate].sleep = nightSleep + napMins / 60;
            }
        });

        // Adicionar bem-estar (humor, energia; sleep legado como fallback)
        analysisWellbeing.forEach(w => {
            const wDate = w.date || safeToISODate(w.timestamp);
            if (!wDate) return;
            if (!dailyData[wDate]) dailyData[wDate] = { consumptions: 0, sleep: null, mood: null, energy: null };
            if (dailyData[wDate].sleep === null && w.sleep != null && !isNaN(parseFloat(w.sleep))) dailyData[wDate].sleep = parseFloat(w.sleep);
            if (w.mood != null && !isNaN(parseInt(w.mood))) dailyData[wDate].mood = parseInt(w.mood);
            if (w.energy != null && !isNaN(parseInt(w.energy))) dailyData[wDate].energy = parseInt(w.energy);
        });


        // Calcular correlações simples (comparar dias com mais vs menos consumo)
        // IMPORTANTE: Filtrar apenas dias que têm PELO MENOS UM DADO DE BEM-ESTAR
        const daysWithData = Object.values(dailyData).filter(d =>
            (d.sleep !== null || d.mood !== null || d.energy !== null)
        );


        if (daysWithData.length < 1) {
            return { noWellbeingData: true };
        }

        const correlations = [];
        const averages = [];

        // SONO
        const sleepData = daysWithData.filter(d => d.sleep !== null);
        if (sleepData.length >= 1) {
            const correlation = sleepData.length >= 2 ? analyticsService.calculatePearsonCorrelation(sleepData, 'consumptions', 'sleep') : null;
            const avgSleep = sleepData.reduce((sum, d) => sum + d.sleep, 0) / sleepData.length;
            correlations.push({
                name: 'Consumo → Sono',
                displayName: t('correlations.nameConsSleep'),
                icon: '💊',
                correlation: correlation,
                average: avgSleep.toFixed(1),
                unit: 'h',
                dataPoints: sleepData.length
            });
        }

        // HUMOR
        const moodData = daysWithData.filter(d => d.mood !== null);
        if (moodData.length >= 1) {
            const correlation = moodData.length >= 2 ? analyticsService.calculatePearsonCorrelation(moodData, 'consumptions', 'mood') : null;
            const avgMood = moodData.reduce((sum, d) => sum + d.mood, 0) / moodData.length;
            correlations.push({
                name: 'Consumo → Humor',
                displayName: t('correlations.nameConsMood'),
                icon: '💊',
                correlation: correlation,
                average: avgMood.toFixed(1),
                unit: '/10',
                dataPoints: moodData.length
            });
        }

        // ENERGIA
        const energyData = daysWithData.filter(d => d.energy !== null);
        if (energyData.length >= 1) {
            const correlation = energyData.length >= 2 ? analyticsService.calculatePearsonCorrelation(energyData, 'consumptions', 'energy') : null;
            const avgEnergy = energyData.reduce((sum, d) => sum + d.energy, 0) / energyData.length;
            correlations.push({
                name: 'Consumo → Energia',
                displayName: t('correlations.nameConsEnergy'),
                icon: '💊',
                correlation: correlation,
                average: avgEnergy.toFixed(1),
                unit: '/10',
                dataPoints: energyData.length
            });
        }

        // ===== CORRELAÇÕES TEMPORAIS (entre dias) =====

        // SONO ANTERIOR → CONSUMO HOJE
        const sleepToConsumptionNext = [];
        const sortedDates = Object.keys(dailyData).sort();
        const sleepToConsNextData = [];

        for (let i = 0; i < sortedDates.length - 1; i++) {
            const today = sortedDates[i];
            const tomorrow = sortedDates[i + 1];

            if (dailyData[today].sleep !== null && dailyData[tomorrow].consumptions > 0) {
                sleepToConsNextData.push({
                    sleep: dailyData[today].sleep,
                    consumptions: dailyData[tomorrow].consumptions
                });
            }
        }

        if (sleepToConsNextData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(sleepToConsNextData, 'sleep', 'consumptions');
            const avgSleep = sleepToConsNextData.reduce((sum, d) => sum + d.sleep, 0) / sleepToConsNextData.length;
            sleepToConsumptionNext.push({
                name: 'Sono ontem → Consumo hoje',
                displayName: t('correlations.nameSleepYestCons'),
                icon: '😴',
                correlation: corr,
                average: avgSleep.toFixed(1),
                unit: 'h',
                dataPoints: sleepToConsNextData.length
            });
        }

        // HUMOR ONTEM → CONSUMO HOJE
        const moodToConsumptionNext = [];
        const moodToConsNextData = [];

        for (let i = 0; i < sortedDates.length - 1; i++) {
            const today = sortedDates[i];
            const tomorrow = sortedDates[i + 1];

            if (dailyData[today].mood !== null && dailyData[tomorrow].consumptions > 0) {
                moodToConsNextData.push({
                    mood: dailyData[today].mood,
                    consumptions: dailyData[tomorrow].consumptions
                });
            }
        }

        if (moodToConsNextData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(moodToConsNextData, 'mood', 'consumptions');
            const avgMood = moodToConsNextData.reduce((sum, d) => sum + d.mood, 0) / moodToConsNextData.length;
            moodToConsumptionNext.push({
                name: 'Humor ontem → Consumo hoje',
                displayName: t('correlations.nameMoodYestCons'),
                icon: '😊',
                correlation: corr,
                average: avgMood.toFixed(1),
                unit: '/10',
                dataPoints: moodToConsNextData.length
            });
        }

        // ENERGIA ONTEM → CONSUMO HOJE
        const energyToConsumptionNext = [];
        const energyToConsNextData = [];

        for (let i = 0; i < sortedDates.length - 1; i++) {
            const today = sortedDates[i];
            const tomorrow = sortedDates[i + 1];

            if (dailyData[today].energy !== null && dailyData[tomorrow].consumptions > 0) {
                energyToConsNextData.push({
                    energy: dailyData[today].energy,
                    consumptions: dailyData[tomorrow].consumptions
                });
            }
        }

        if (energyToConsNextData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(energyToConsNextData, 'energy', 'consumptions');
            const avgEnergy = energyToConsNextData.reduce((sum, d) => sum + d.energy, 0) / energyToConsNextData.length;
            energyToConsumptionNext.push({
                name: 'Energia ontem → Consumo hoje',
                displayName: t('correlations.nameEnergyYestCons'),
                icon: '⚡',
                correlation: corr,
                average: avgEnergy.toFixed(1),
                unit: '/10',
                dataPoints: energyToConsNextData.length
            });
        }

        // ===== DADOS AGREGADOS (usados por CONSUMO → X) =====

        // Agregar emoções por dia
        const emotionData = {};
        analysisWellbeing.forEach(w => {
            const wDate = w.date || safeToISODate(w.timestamp);
            if (!wDate || !w.emotions || !Array.isArray(w.emotions)) return;

            if (!emotionData[wDate]) {
                emotionData[wDate] = { negative: 0, total: 0, consumptions: dailyData[wDate]?.consumptions || 0 };
            }

            w.emotions.forEach(emotion => {
                emotionData[wDate].total++;
                const category = getEmotionCategory(emotion);
                if (category === 'negative') emotionData[wDate].negative++;
            });
        });
        const emotionCorrelationData = Object.values(emotionData).filter(d => d.total > 0);

        // Agregar autocuidado por dia
        const selfCareData = {};
        analysisWellbeing.forEach(w => {
            const wDate = w.date || safeToISODate(w.timestamp);
            if (!wDate) return;

            if (!selfCareData[wDate]) {
                selfCareData[wDate] = { count: 0, consumptions: dailyData[wDate]?.consumptions || 0 };
            }

            // Contar quantas áreas de autocuidado foram cumpridas
            ['water', 'food', 'rest', 'social'].forEach(area => {
                if (w[area] === true) selfCareData[wDate].count++;
            });
        });
        const selfCareCorrelationData = Object.values(selfCareData).filter(d => d.count >= 0);

        // CONSUMO ONTEM → CONSUMO HOJE (autocorrelação)
        const consumptionAutocorrelation = [];
        const autocorrData = [];

        for (let i = 0; i < sortedDates.length - 1; i++) {
            const today = sortedDates[i];
            const tomorrow = sortedDates[i + 1];

            if (dailyData[today].consumptions > 0 && dailyData[tomorrow].consumptions > 0) {
                autocorrData.push({
                    yesterday: dailyData[today].consumptions,
                    today: dailyData[tomorrow].consumptions
                });
            }
        }

        if (autocorrData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(autocorrData, 'yesterday', 'today');
            const avgYesterday = autocorrData.reduce((sum, d) => sum + d.yesterday, 0) / autocorrData.length;

            consumptionAutocorrelation.push({
                name: 'Consumo Ontem → Hoje',
                displayName: t('correlations.nameConsAutocorr'),
                icon: '💊',
                correlation: corr,
                average: avgYesterday.toFixed(1),
                unit: '/dia',
                dataPoints: autocorrData.length
            });
        }

        // 6. CONSUMO → EMOÇÕES (impacto no estado emocional)
        const consumptionToEmotions = [];

        if (emotionCorrelationData.length >= 2) {
            // Já calculamos emoções por dia antes
            const dataWithPercent = emotionCorrelationData.map(d => ({
                negativePercent: (d.negative / d.total) * 100,
                consumptions: d.consumptions
            }));

            const corr = analyticsService.calculatePearsonCorrelation(dataWithPercent, 'consumptions', 'negativePercent');
            const avgConsumptions = dataWithPercent.reduce((sum, d) => sum + d.consumptions, 0) / dataWithPercent.length;

            consumptionToEmotions.push({
                name: 'Consumo → Emoções Negativas',
                displayName: t('correlations.nameConsNegEmotions'),
                icon: '💊',
                correlation: corr,
                average: avgConsumptions.toFixed(1),
                unit: '/dia',
                dataPoints: dataWithPercent.length
            });
        }

        // 7. CONSUMO → AUTOCUIDADO
        const consumptionToSelfCare = [];

        if (selfCareCorrelationData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(selfCareCorrelationData, 'consumptions', 'count');
            const avgCons = selfCareCorrelationData.reduce((sum, d) => sum + d.consumptions, 0) / selfCareCorrelationData.length;

            consumptionToSelfCare.push({
                name: 'Consumo → Autocuidado',
                displayName: t('correlations.nameConsSelfCare'),
                icon: '💊',
                correlation: corr,
                average: avgCons.toFixed(1),
                unit: '/dia',
                dataPoints: selfCareCorrelationData.length
            });
        }

        // 8. DOSAGEM → BEM-ESTAR (dose alta vs baixa têm impacto diferente?)
        const dosageToWellbeing = [];

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

        // Dosagem → Sono
        const dosageSleepData = Object.values(dosageData).filter(d => d.totalMg > 0 && d.sleep !== null);
        if (dosageSleepData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(dosageSleepData, 'totalMg', 'sleep');
            const avgDosage = dosageSleepData.reduce((sum, d) => sum + d.totalMg, 0) / dosageSleepData.length;

            dosageToWellbeing.push({
                name: 'Dosagem → Sono',
                displayName: t('correlations.nameDosageSleep'),
                icon: '💊',
                correlation: corr,
                average: avgDosage.toFixed(0),
                unit: 'mg',
                dataPoints: dosageSleepData.length,
                metric: 'sono'
            });
        }

        // Dosagem → Humor
        const dosageMoodData = Object.values(dosageData).filter(d => d.totalMg > 0 && d.mood !== null);
        if (dosageMoodData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(dosageMoodData, 'totalMg', 'mood');
            const avgDosage = dosageMoodData.reduce((sum, d) => sum + d.totalMg, 0) / dosageMoodData.length;

            dosageToWellbeing.push({
                name: 'Dosagem → Humor',
                displayName: t('correlations.nameDosageMood'),
                icon: '💊',
                correlation: corr,
                average: avgDosage.toFixed(0),
                unit: 'mg',
                dataPoints: dosageMoodData.length,
                metric: 'humor'
            });
        }

        // Dosagem → Energia
        const dosageEnergyData = Object.values(dosageData).filter(d => d.totalMg > 0 && d.energy !== null);
        if (dosageEnergyData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(dosageEnergyData, 'totalMg', 'energy');
            const avgDosage = dosageEnergyData.reduce((sum, d) => sum + d.totalMg, 0) / dosageEnergyData.length;

            dosageToWellbeing.push({
                name: 'Dosagem → Energia',
                displayName: t('correlations.nameDosageEnergy'),
                icon: '💊',
                correlation: corr,
                average: avgDosage.toFixed(0),
                unit: 'mg',
                dataPoints: dosageEnergyData.length,
                metric: 'energia'
            });
        }

        // DOSAGEM SEMANAL (gráfico de tendência)
        const weeklyDosage = [];

        if (analysisDailyLogs.length >= 7) {
            // Helper: obter ISO week number
            const getISOWeek = (date) => {
                const d = new Date(date);
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                const yearStart = new Date(d.getFullYear(), 0, 1);
                const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                return `${d.getFullYear()}-W${String(weekNo).padStart(2, '00')}`;
            };

            // Agrupar dosagem por semana (usando DailyLogs)
            const weeklyData = {};
            analysisDailyLogs.forEach(log => {
                const mg = parseFloat(log.mg);
                if (!mg || mg <= 0) return;

                const logDate = log.date || safeToISODate(log.timestamp);
                const week = getISOWeek(logDate);
                if (!weeklyData[week]) {
                    weeklyData[week] = { week, totalMg: 0, days: 0 };
                }
                weeklyData[week].totalMg += mg;
                weeklyData[week].days++;
            });

            // Converter para array e ordenar por semana
            const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week));

            if (sortedWeeks.length >= 2) {
                // Calcular tendência (últimas 4 semanas vs primeiras 4)
                const recentWeeks = sortedWeeks.slice(-4);
                const oldWeeks = sortedWeeks.slice(0, Math.min(4, sortedWeeks.length - 4));
                const avgRecent = recentWeeks.reduce((s, w) => s + w.totalMg, 0) / recentWeeks.length;
                const avgOld = oldWeeks.length > 0 ? oldWeeks.reduce((s, w) => s + w.totalMg, 0) / oldWeeks.length : avgRecent;
                const trendPct = oldWeeks.length > 0 ? ((avgRecent - avgOld) / avgOld * 100) : 0;

                let trendKey = 'stable';
                let trendIcon = '➡️';
                if (trendPct > 15) {
                    trendKey = 'increasing';
                    trendIcon = '📈';
                } else if (trendPct < -15) {
                    trendKey = 'decreasing';
                    trendIcon = '📉';
                }
                const trendLabel = t('correlations.' + (trendKey === 'increasing' ? 'trendIncreasing' : trendKey === 'decreasing' ? 'trendDecreasing' : 'trendStable'));
                const weekPrefix = i18n.language === 'pt' ? 'S' : 'W';

                // Preparar dados para gráfico (últimas 12 semanas máximo)
                const chartData = sortedWeeks.slice(-12).map(w => ({
                    week: w.week.replace(/^\d{4}-W/, weekPrefix),
                    dosagem: w.totalMg,
                    days: w.days
                }));

                weeklyDosage.push({
                    chartData,
                    avgWeekly: (sortedWeeks.reduce((s, w) => s + w.totalMg, 0) / sortedWeeks.length).toFixed(0),
                    trend: trendLabel,
                    trendIcon,
                    trendPct: trendPct.toFixed(0),
                    weeks: sortedWeeks.length
                });
            }
        }

        // 9. PRIMEIRO CONSUMO → TOTAL DO DIA
        // Usa timestamp do "Novo Ciclo" como referência
        const firstConsToTotal = [];

        // Agrupar consumos por data
        const consumptionsByDateForFirst = {};
        analysisConsumptions.forEach(c => {
            if (!consumptionsByDateForFirst[c.date]) consumptionsByDateForFirst[c.date] = [];
            consumptionsByDateForFirst[c.date].push(c);
        });

        // Calcular hora do primeiro consumo (após ciclo) e total por dia
        const firstConsData = {};
        Object.entries(consumptionsByDateForFirst).forEach(([date, cons]) => {
            // Encontrar o ciclo desse dia
            const dayCycle = analysisCycles.find(cycle => safeToISODate(cycle.timestamp) === date);

            if (!dayCycle) {
                // Sem ciclo registrado, usar lógica antiga (primeiro por timestamp)
                const sortedCons = cons.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                const firstCons = sortedCons[0];
                const hour = new Date(firstCons.timestamp).getHours() + new Date(firstCons.timestamp).getMinutes() / 60;
                firstConsData[date] = { firstHour: hour, total: cons.length };
                return;
            }

            // Filtrar consumos que acontecem APÓS o timestamp do ciclo
            const cycleTime = new Date(dayCycle.timestamp).getTime();
            const consumptionsAfterCycle = cons.filter(c => new Date(c.timestamp).getTime() >= cycleTime);

            if (consumptionsAfterCycle.length === 0) {
                // Nenhum consumo após ciclo, usar o primeiro cronologicamente
                const sortedCons = cons.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                const firstCons = sortedCons[0];
                const hour = new Date(firstCons.timestamp).getHours() + new Date(firstCons.timestamp).getMinutes() / 60;
                firstConsData[date] = { firstHour: hour, total: cons.length };
                return;
            }

            // Ordenar consumos após ciclo por timestamp e pegar o primeiro
            const sortedAfterCycle = consumptionsAfterCycle.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const firstCons = sortedAfterCycle[0];
            const hour = new Date(firstCons.timestamp).getHours() + new Date(firstCons.timestamp).getMinutes() / 60;
            firstConsData[date] = { firstHour: hour, total: cons.length };
        });

        const firstConsCorrelationData = Object.values(firstConsData).filter(d => d.total > 0);

        if (firstConsCorrelationData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(firstConsCorrelationData, 'firstHour', 'total');
            const avgFirstHour = firstConsCorrelationData.reduce((sum, d) => sum + d.firstHour, 0) / firstConsCorrelationData.length;

            firstConsToTotal.push({
                name: 'Primeiro Consumo → Total do Dia',
                displayName: t('correlations.nameFirstConsDay'),
                icon: '🌅',
                correlation: corr,
                average: Math.floor(avgFirstHour) + ':' + String(Math.round((avgFirstHour % 1) * 60)).padStart(2, '0'),
                unit: '',
                dataPoints: firstConsCorrelationData.length
            });
        }

        // DISPERSÃO TEMPORAL (Desvio-padrão das horas de consumo)
        const temporalDispersion = [];

        if (analysisConsumptions.length >= 5) {
            // Calcular hora decimal de cada consumo
            const consumptionHours = analysisConsumptions.map(c => {
                const d = new Date(c.timestamp);
                return d.getHours() + d.getMinutes() / 60;
            });

            // Calcular média
            const meanHour = consumptionHours.reduce((sum, h) => sum + h, 0) / consumptionHours.length;

            // Calcular desvio-padrão
            const squaredDiffs = consumptionHours.map(h => Math.pow(h - meanHour, 2));
            const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / squaredDiffs.length;
            const stdDev = Math.sqrt(variance);

            // Classificação
            let pattern = '';
            let patternLabel = '';
            let emoji = '';
            if (stdDev < 2) {
                pattern = 'Muito Regular';
                patternLabel = t('correlations.labelVeryRegular');
                emoji = '🎯';
            } else if (stdDev < 4) {
                pattern = 'Regular';
                patternLabel = t('correlations.labelRegular');
                emoji = '📍';
            } else if (stdDev < 6) {
                pattern = 'Moderado';
                patternLabel = t('correlations.labelModerate');
                emoji = '🔀';
            } else {
                pattern = 'Caótico';
                patternLabel = t('correlations.labelChaotic');
                emoji = '🌪️';
            }

            temporalDispersion.push({
                name: 'Dispersão Temporal',
                displayName: t('correlations.nameTemporalDisp'),
                icon: emoji,
                correlation: stdDev / 12, // Normalizar para [-1, 1], assumindo máximo 12h de desvio
                average: stdDev.toFixed(1),
                unit: 'h',
                dataPoints: consumptionHours.length,
                pattern: pattern,
                patternLabel: patternLabel,
                type: 'dispersion'
            });
        }

        // ===== INTERVALOS "SEGUROS" =====
        const safeIntervals = [];

        if (analysisConsumptions.length >= 10) {
            // Calcular intervalo médio por dia
            const dailyIntervals = {};
            const sortedCons = [...analysisConsumptions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            sortedCons.forEach((c, idx) => {
                if (idx === 0) return; // Pular primeiro

                const prev = sortedCons[idx - 1];
                if (c.date === prev.date) {
                    const interval = (new Date(c.timestamp) - new Date(prev.timestamp)) / (1000 * 60 * 60); // horas

                    if (!dailyIntervals[c.date]) {
                        dailyIntervals[c.date] = { intervals: [], total: 0 };
                    }
                    dailyIntervals[c.date].intervals.push(interval);
                }
            });

            // Contar total de consumos por dia
            analysisConsumptions.forEach(c => {
                if (!dailyIntervals[c.date]) {
                    dailyIntervals[c.date] = { intervals: [], total: 0 };
                }
                dailyIntervals[c.date].total++;
            });

            // Calcular média de intervalos por dia e correlacionar com total
            const intervalData = [];
            Object.entries(dailyIntervals).forEach(([date, data]) => {
                if (data.intervals.length > 0) {
                    const avgInterval = data.intervals.reduce((s, i) => s + i, 0) / data.intervals.length;
                    intervalData.push({ avgInterval, total: data.total });
                }
            });

            if (intervalData.length >= 5) {
                const corr = analyticsService.calculatePearsonCorrelation(intervalData, 'avgInterval', 'total');
                const avgInterval = intervalData.reduce((s, d) => s + d.avgInterval, 0) / intervalData.length;

                // Análise de dias com bons intervalos (>3h)
                const goodIntervalDays = intervalData.filter(d => d.avgInterval >= 3);
                const avgTotalGood = goodIntervalDays.length > 0
                    ? goodIntervalDays.reduce((s, d) => s + d.total, 0) / goodIntervalDays.length
                    : 0;

                const badIntervalDays = intervalData.filter(d => d.avgInterval < 3);
                const avgTotalBad = badIntervalDays.length > 0
                    ? badIntervalDays.reduce((s, d) => s + d.total, 0) / badIntervalDays.length
                    : 0;

                safeIntervals.push({
                    name: 'Intervalos "Seguros" (>3h)',
                    displayName: t('correlations.nameSafeIntervals'),
                    icon: '⏱️',
                    correlation: corr,
                    average: avgInterval.toFixed(1),
                    unit: 'h',
                    dataPoints: intervalData.length,
                    goodDays: goodIntervalDays.length,
                    badDays: badIntervalDays.length,
                    avgTotalGood: avgTotalGood.toFixed(1),
                    avgTotalBad: avgTotalBad.toFixed(1),
                    type: 'safeIntervals'
                });
            }
        }

        // ===== EFICÁCIA DE ESTRATÉGIAS =====
        const strategyEffectiveness = [];

        if (analysisWellbeing.length >= 10 && analysisConsumptions.length >= 10) {
            // Agrupar bem-estar por dia
            const strategyDailyData = {};

            analysisWellbeing.forEach(w => {
                const date = w.date || safeToISODate(w.timestamp);
                if (!strategyDailyData[date]) {
                    strategyDailyData[date] = { sleep: null, exercise: null, food: null, social: null, consumptions: 0 };
                }

                // Autocuidado (4 áreas)
                if (w.sleep) strategyDailyData[date].sleep = parseInt(w.sleep);
                if (w.exerciseType || (w.exerciseDuration > 0) || w.exercise) strategyDailyData[date].exercise = 1;
                if (w.food) strategyDailyData[date].food = parseInt(w.food);
                if (w.social) strategyDailyData[date].social = parseInt(w.social);
            });

            // Adicionar consumos
            analysisConsumptions.forEach(c => {
                if (strategyDailyData[c.date]) {
                    strategyDailyData[c.date].consumptions++;
                }
            });

            // Identificar dias com autocuidado completo (4/4 áreas) vs sem
            const fullSelfCareDays = [];
            const noSelfCareDays = [];

            Object.values(strategyDailyData).forEach(day => {
                const selfCareCount = [day.sleep, day.exercise, day.food, day.social].filter(x => x !== null && x > 0).length;

                if (selfCareCount === 4) {
                    fullSelfCareDays.push(day.consumptions);
                } else if (selfCareCount === 0) {
                    noSelfCareDays.push(day.consumptions);
                }
            });

            if (fullSelfCareDays.length >= 2 && noSelfCareDays.length >= 2) {
                const avgFull = fullSelfCareDays.reduce((s, c) => s + c, 0) / fullSelfCareDays.length;
                const avgNone = noSelfCareDays.reduce((s, c) => s + c, 0) / noSelfCareDays.length;
                const reduction = avgNone > 0 ? ((avgNone - avgFull) / avgNone * 100) : 0;

                strategyEffectiveness.push({
                    name: 'Eficácia de Estratégias',
                    displayName: t('correlations.nameStrategyEff'),
                    icon: '🛡️',
                    correlation: -(avgFull / avgNone), // Negativo = bom (menos consumo com autocuidado)
                    average: reduction.toFixed(0),
                    unit: '%',
                    dataPoints: fullSelfCareDays.length + noSelfCareDays.length,
                    avgFull: avgFull.toFixed(1),
                    avgNone: avgNone.toFixed(1),
                    fullDays: fullSelfCareDays.length,
                    noneDays: noSelfCareDays.length,
                    type: 'strategyEffectiveness'
                });
            }
        }

        // CONSUMO POR PERÍODO DO DIA
        const consumptionByPeriod = [];

        if (analysisConsumptions.length >= 10 && analysisWellbeing.length >= 5) {
            // Agrupar consumos por data e período
            const periodData = {};

            analysisConsumptions.forEach(c => {
                const hour = new Date(c.timestamp).getHours();
                let period = '';
                if (hour >= 6 && hour < 12) period = 'morning';
                else if (hour >= 12 && hour < 18) period = 'afternoon';
                else if (hour >= 18 && hour < 24) period = 'evening';
                else period = 'night';

                if (!periodData[c.date]) {
                    periodData[c.date] = { morning: 0, afternoon: 0, evening: 0, night: 0 };
                }
                periodData[c.date][period]++;
            });

            // Juntar com bem-estar
            const periodWellbeingData = { morning: [], afternoon: [], evening: [] };

            Object.entries(periodData).forEach(([date, periods]) => {
                const wellbeing = analysisWellbeing.find(w => (w.date || safeToISODate(w.timestamp)) === date);
                if (!wellbeing) return;

                if (wellbeing.mood) {
                    if (periods.morning > 0) periodWellbeingData.morning.push({ cons: periods.morning, mood: parseInt(wellbeing.mood) });
                    if (periods.afternoon > 0) periodWellbeingData.afternoon.push({ cons: periods.afternoon, mood: parseInt(wellbeing.mood) });
                    if (periods.evening > 0) periodWellbeingData.evening.push({ cons: periods.evening, mood: parseInt(wellbeing.mood) });
                }
            });

            // Calcular correlações
            if (periodWellbeingData.morning.length >= 3) {
                const corr = analyticsService.calculatePearsonCorrelation(periodWellbeingData.morning, 'cons', 'mood');
                const avgCons = periodWellbeingData.morning.reduce((s, d) => s + d.cons, 0) / periodWellbeingData.morning.length;
                consumptionByPeriod.push({
                    name: 'Consumo Manhã → Humor',
                    displayName: t('correlations.nameConsMorningMood'),
                    icon: '🌅',
                    period: '6h-12h',
                    correlation: corr,
                    average: avgCons.toFixed(1),
                    dataPoints: periodWellbeingData.morning.length
                });
            }

            if (periodWellbeingData.afternoon.length >= 3) {
                const corr = analyticsService.calculatePearsonCorrelation(periodWellbeingData.afternoon, 'cons', 'mood');
                const avgCons = periodWellbeingData.afternoon.reduce((s, d) => s + d.cons, 0) / periodWellbeingData.afternoon.length;
                consumptionByPeriod.push({
                    name: 'Consumo Tarde → Humor',
                    displayName: t('correlations.nameConsAfternoonMood'),
                    icon: '☀️',
                    period: '12h-18h',
                    correlation: corr,
                    average: avgCons.toFixed(1),
                    dataPoints: periodWellbeingData.afternoon.length
                });
            }

            if (periodWellbeingData.evening.length >= 3) {
                const corr = analyticsService.calculatePearsonCorrelation(periodWellbeingData.evening, 'cons', 'mood');
                const avgCons = periodWellbeingData.evening.reduce((s, d) => s + d.cons, 0) / periodWellbeingData.evening.length;
                consumptionByPeriod.push({
                    name: 'Consumo Noite → Humor',
                    displayName: t('correlations.nameConsEveningMood'),
                    icon: '🌙',
                    period: '18h-00h',
                    correlation: corr,
                    average: avgCons.toFixed(1),
                    dataPoints: periodWellbeingData.evening.length
                });
            }
        }

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
                            name: 'Humor Baixo + Sono Mau',
                            displayName: t('correlations.nameCompositeLowMoodSleep'),
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
                                name: 'Humor Baixo + Energia Baixa',
                                displayName: t('correlations.nameCompositeLowMoodEnergy'),
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
            const sortedDatesExp = Object.keys(dailyData).sort();
            sortedDatesExp.forEach((date, idx) => {
                const today = dailyData[date];
                const todayCons = today.consumptions || 0;

                if (todayCons > 0 && idx >= 2) {
                    // Olhar para os 2 dias anteriores
                    const yesterday = dailyData[sortedDatesExp[idx - 1]];
                    const dayBefore = dailyData[sortedDatesExp[idx - 2]];

                    if (yesterday?.mood && dayBefore?.mood) {
                        // Detectar tendência de declínio de humor
                        const moodDecline = parseInt(dayBefore.mood) - parseInt(yesterday.mood) > 1;
                        const poorSleepStreak = yesterday.sleep && parseInt(yesterday.sleep) <= 5 && dayBefore.sleep && parseInt(dayBefore.sleep) <= 5;

                        if (moodDecline) {
                            experimentalFeatures.antecedents.push({
                                date,
                                pattern: 'Humor estava a descer antes de consumir',
                                displayName: t('correlations.nameAntecedentMoodFalling'),
                                icon: '📉',
                                cons: todayCons
                            });
                        }

                        if (poorSleepStreak) {
                            experimentalFeatures.antecedents.push({
                                date,
                                pattern: 'Sono mau em dias consecutivos',
                                displayName: t('correlations.nameAntecedentSleepPoor'),
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

        // 10. INTERVALO → DOSAGEM
        const intervalToDosage = [];

        // Calcular intervalos e dosagens
        const intervalDosageData = [];
        const consumptionsByDate = {};

        analysisConsumptions.forEach(c => {
            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = [];
            consumptionsByDate[c.date].push(c);
        });

        Object.entries(consumptionsByDate).forEach(([date, cons]) => {
            if (cons.length < 2) return;

            // Ordenar por timestamp
            cons.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            // Calcular intervalos médios do dia
            const intervals = [];
            for (let i = 1; i < cons.length; i++) {
                const diff = (new Date(cons[i].timestamp) - new Date(cons[i-1].timestamp)) / (1000 * 60 * 60);
                intervals.push(diff);
            }

            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

            // Buscar dosagem do dia
            const dayDosage = dosageData[date]?.totalMg || null;

            if (dayDosage) {
                intervalDosageData.push({ interval: avgInterval, dosage: dayDosage });
            }
        });

        if (intervalDosageData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(intervalDosageData, 'interval', 'dosage');
            const avgInterval = intervalDosageData.reduce((sum, d) => sum + d.interval, 0) / intervalDosageData.length;

            intervalToDosage.push({
                name: 'Intervalo → Dosagem',
                displayName: t('correlations.nameIntervalDosage'),
                icon: '⏱️',
                correlation: corr,
                average: avgInterval.toFixed(1),
                unit: 'h',
                dataPoints: intervalDosageData.length
            });
        }

        // 11. CONSUMO → BEDTIME (dia seguinte)
        const consumptionToBedtime = [];
        const consToBedtimeData = [];

        for (let i = 0; i < sortedDates.length - 1; i++) {
            const today = sortedDates[i];
            const tomorrow = sortedDates[i + 1];

            // Consumos hoje
            const todayConsumptions = dailyData[today]?.consumptions || 0;
            if (todayConsumptions === 0) continue;

            // Bedtime amanhã
            const tomorrowCycle = analysisCycles.find(c => safeToISODate(c.timestamp) === tomorrow);
            if (!tomorrowCycle?.bedtime) continue;

            // Converter bedtime para minutos
            const [h, m] = tomorrowCycle.bedtime.split(':').map(Number);
            let bedtimeMinutes = h * 60 + m;
            if (h >= 0 && h < 18) bedtimeMinutes += 1440;

            consToBedtimeData.push({
                consumptions: todayConsumptions,
                bedtime: bedtimeMinutes
            });
        }

        if (consToBedtimeData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(consToBedtimeData, 'consumptions', 'bedtime');
            const avgCons = consToBedtimeData.reduce((sum, d) => sum + d.consumptions, 0) / consToBedtimeData.length;

            consumptionToBedtime.push({
                name: 'Consumo → Bedtime Amanhã',
                displayName: t('correlations.nameConsBedtime'),
                icon: '💊',
                correlation: corr,
                average: avgCons.toFixed(1),
                unit: '/dia',
                dataPoints: consToBedtimeData.length
            });
        }

        // BEDTIME → HUMOR/ENERGIA (dia seguinte)
        const bedtimeToNextDayWellbeing = [];

        // Bedtime → Humor amanhã
        const bedtimeToMoodData = [];
        sortedDates.forEach((date, i) => {
            if (i >= sortedDates.length - 1) return;

            const todayCycle = analysisCycles.find(c => {
                const cycleDate = safeToISODate(c.timestamp);
                return cycleDate === date;
            });

            if (!todayCycle?.bedtime) return;

            const tomorrowDate = sortedDates[i + 1];
            const tomorrowMood = dailyData[tomorrowDate]?.mood;
            if (tomorrowMood === null || tomorrowMood === undefined) return;

            // Converter bedtime para minutos
            const [h, m] = todayCycle.bedtime.split(':').map(Number);
            let bedtimeMinutes = h * 60 + m;
            if (h >= 0 && h < 18) bedtimeMinutes += 1440;

            bedtimeToMoodData.push({
                bedtime: bedtimeMinutes,
                mood: tomorrowMood
            });
        });

        if (bedtimeToMoodData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(bedtimeToMoodData, 'bedtime', 'mood');
            const avgBedtime = bedtimeToMoodData.reduce((sum, d) => sum + d.bedtime, 0) / bedtimeToMoodData.length;

            bedtimeToNextDayWellbeing.push({
                name: 'Bedtime → Humor Amanhã',
                displayName: t('correlations.nameBedtimeMood'),
                icon: '🌙',
                correlation: corr,
                average: (() => {
                    const adjustedMinutes = avgBedtime >= 1440 ? avgBedtime - 1440 : avgBedtime;
                    const avgBedtimeHours = Math.floor(adjustedMinutes / 60);
                    const avgBedtimeMins = Math.round(adjustedMinutes % 60);
                    return `${String(avgBedtimeHours).padStart(2, '0')}:${String(avgBedtimeMins).padStart(2, '0')}`;
                })(),
                unit: '',
                dataPoints: bedtimeToMoodData.length,
                type: 'bedtimeImpact'
            });
        }

        // Bedtime → Energia amanhã
        const bedtimeToEnergyData = [];
        sortedDates.forEach((date, i) => {
            if (i >= sortedDates.length - 1) return;

            const todayCycle = analysisCycles.find(c => {
                const cycleDate = safeToISODate(c.timestamp);
                return cycleDate === date;
            });

            if (!todayCycle?.bedtime) return;

            const tomorrowDate = sortedDates[i + 1];
            const tomorrowEnergy = dailyData[tomorrowDate]?.energy;
            if (tomorrowEnergy === null || tomorrowEnergy === undefined) return;

            // Converter bedtime para minutos
            const [h, m] = todayCycle.bedtime.split(':').map(Number);
            let bedtimeMinutes = h * 60 + m;
            if (h >= 0 && h < 18) bedtimeMinutes += 1440;

            bedtimeToEnergyData.push({
                bedtime: bedtimeMinutes,
                energy: tomorrowEnergy
            });
        });

        if (bedtimeToEnergyData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(bedtimeToEnergyData, 'bedtime', 'energy');
            const avgBedtime = bedtimeToEnergyData.reduce((sum, d) => sum + d.bedtime, 0) / bedtimeToEnergyData.length;

            bedtimeToNextDayWellbeing.push({
                name: 'Bedtime → Energia Amanhã',
                displayName: t('correlations.nameBedtimeEnergy'),
                icon: '🌙',
                correlation: corr,
                average: (() => {
                    const adjustedMinutes = avgBedtime >= 1440 ? avgBedtime - 1440 : avgBedtime;
                    const avgBedtimeHours = Math.floor(adjustedMinutes / 60);
                    const avgBedtimeMins = Math.round(adjustedMinutes % 60);
                    return `${String(avgBedtimeHours).padStart(2, '0')}:${String(avgBedtimeMins).padStart(2, '0')}`;
                })(),
                unit: '',
                dataPoints: bedtimeToEnergyData.length,
                type: 'bedtimeImpact'
            });
        }

        // CONTEXTO → DOSAGEM (apenas direcionais: Emoções Negativas e Gatilhos)
        const wellbeingToDosage = [];

        // Emoções Negativas → Dosagem
        if (emotionCorrelationData.length >= 2) {
            const emotionsDosageData = [];

            Object.keys(emotionData).forEach(date => {
                const dayDosage = dosageData[date]?.totalMg;
                if (!dayDosage || emotionData[date].total === 0) return;

                emotionsDosageData.push({
                    negativePercent: (emotionData[date].negative / emotionData[date].total) * 100,
                    dosage: dayDosage
                });
            });

            if (emotionsDosageData.length >= 2) {
                const corr = analyticsService.calculatePearsonCorrelation(emotionsDosageData, 'negativePercent', 'dosage');
                const avgNegative = emotionsDosageData.reduce((sum, d) => sum + d.negativePercent, 0) / emotionsDosageData.length;

                wellbeingToDosage.push({
                    name: 'Emoções Negativas → Dosagem',
                    displayName: t('correlations.nameNegEmotionsDosage'),
                    icon: '😩',
                    correlation: corr,
                    average: avgNegative.toFixed(0),
                    unit: '%',
                    dataPoints: emotionsDosageData.length,
                    type: 'wellbeing'
                });
            }
        }

        // Gatilhos → Dosagem
        const triggersData = {};
        analysisWellbeing.forEach(w => {
            const wDate = w.date || safeToISODate(w.timestamp);
            if (!wDate || !w.triggers || !Array.isArray(w.triggers)) return;

            if (!triggersData[wDate]) {
                triggersData[wDate] = { count: 0, dosage: dosageData[wDate]?.totalMg || null };
            }

            triggersData[wDate].count += w.triggers.length;
        });

        const triggersDosageData = Object.values(triggersData).filter(d => d.dosage !== null && d.count > 0);

        if (triggersDosageData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(triggersDosageData, 'count', 'dosage');
            const avgTriggers = triggersDosageData.reduce((sum, d) => sum + d.count, 0) / triggersDosageData.length;

            wellbeingToDosage.push({
                name: 'Gatilhos → Dosagem',
                displayName: t('correlations.nameTriggersDosage'),
                icon: '⚠️',
                correlation: corr,
                average: avgTriggers.toFixed(1),
                unit: '/dia',
                dataPoints: triggersDosageData.length,
                type: 'wellbeing'
            });
        }

        // DOSAGEM → BEM-ESTAR - Autocuidado e Emoções (adicionados ao array existente)

        // Dosagem → Autocuidado
        const dosageToSelfCareData = [];
        analysisWellbeing.forEach(w => {
            const wDate = w.date || safeToISODate(w.timestamp);
            if (!wDate) return;

            const dayDosage = dosageData[wDate]?.totalMg;
            if (!dayDosage || dayDosage === 0) return;

            if (w.selfCare && Array.isArray(w.selfCare) && w.selfCare.length > 0) {
                dosageToSelfCareData.push({
                    dosage: dayDosage,
                    selfCareCount: w.selfCare.length
                });
            }
        });

        if (dosageToSelfCareData.length >= 2) {
            const corr = analyticsService.calculatePearsonCorrelation(dosageToSelfCareData, 'dosage', 'selfCareCount');
            const avgDosage = dosageToSelfCareData.reduce((sum, d) => sum + d.dosage, 0) / dosageToSelfCareData.length;

            dosageToWellbeing.push({
                name: 'Dosagem → Autocuidado',
                displayName: t('correlations.nameDosageSelfCare'),
                icon: '💊',
                correlation: corr,
                average: avgDosage.toFixed(0),
                unit: 'mg',
                dataPoints: dosageToSelfCareData.length,
                type: 'dosageImpact'
            });
        }

        // Dosagem → Emoções (% negativas)
        if (emotionCorrelationData.length >= 2) {
            const dosageToEmotionsData = [];

            Object.keys(emotionData).forEach(date => {
                const dayDosage = dosageData[date]?.totalMg;
                if (!dayDosage || dayDosage === 0 || emotionData[date].total === 0) return;

                dosageToEmotionsData.push({
                    dosage: dayDosage,
                    negativePercent: (emotionData[date].negative / emotionData[date].total) * 100
                });
            });

            if (dosageToEmotionsData.length >= 2) {
                const corr = analyticsService.calculatePearsonCorrelation(dosageToEmotionsData, 'dosage', 'negativePercent');
                const avgDosage = dosageToEmotionsData.reduce((sum, d) => sum + d.dosage, 0) / dosageToEmotionsData.length;

                dosageToWellbeing.push({
                    name: 'Dosagem → Emoções Negativas',
                    displayName: t('correlations.nameDosageNegEmotions'),
                    icon: '💊',
                    correlation: corr,
                    average: avgDosage.toFixed(0),
                    unit: 'mg',
                    dataPoints: dosageToEmotionsData.length,
                    type: 'dosageImpact'
                });
            }
        }

        // CONSUMO → BEM-ESTAR (DIA SEGUINTE)
        const consumptionToNextDayWellbeing = [];
        const bidirectional = [];

        sortedDates.forEach((date, i) => {
            if (i < sortedDates.length - 1) {
                const today = dailyData[date];
                const nextDay = dailyData[sortedDates[i + 1]];

                if (today.consumptions > 0 && (nextDay.sleep !== null || nextDay.mood !== null || nextDay.energy !== null)) {
                    bidirectional.push({
                        consumptions: today.consumptions,
                        nextSleep: nextDay.sleep,
                        nextMood: nextDay.mood,
                        nextEnergy: nextDay.energy
                    });
                }
            }
        });

        // Consumo → Sono amanhã
        const nextSleepData = bidirectional.filter(d => d.nextSleep !== null);
        if (nextSleepData.length >= 2) {
            const sleepCorr = analyticsService.calculatePearsonCorrelation(bidirectional, 'consumptions', 'nextSleep');
            const avgNextSleep = nextSleepData.reduce((sum, d) => sum + d.nextSleep, 0) / nextSleepData.length;
            consumptionToNextDayWellbeing.push({
                name: 'Consumo → Sono Amanhã',
                displayName: t('correlations.nameConsNextSleep'),
                icon: '💊',
                correlation: sleepCorr,
                average: avgNextSleep.toFixed(1),
                unit: 'h',
                dataPoints: nextSleepData.length,
                type: 'consumptionImpact'
            });
        }

        // Consumo → Humor amanhã
        const nextMoodData = bidirectional.filter(d => d.nextMood !== null);
        if (nextMoodData.length >= 2) {
            const moodCorr = analyticsService.calculatePearsonCorrelation(bidirectional, 'consumptions', 'nextMood');
            const avgNextMood = nextMoodData.reduce((sum, d) => sum + d.nextMood, 0) / nextMoodData.length;
            consumptionToNextDayWellbeing.push({
                name: 'Consumo → Humor Amanhã',
                displayName: t('correlations.nameConsNextMood'),
                icon: '💊',
                correlation: moodCorr,
                average: avgNextMood.toFixed(1),
                unit: '/10',
                dataPoints: nextMoodData.length,
                type: 'consumptionImpact'
            });
        }

        // Consumo → Energia amanhã
        const nextEnergyData = bidirectional.filter(d => d.nextEnergy !== null);
        if (nextEnergyData.length >= 2) {
            const energyCorr = analyticsService.calculatePearsonCorrelation(bidirectional, 'consumptions', 'nextEnergy');
            const avgNextEnergy = nextEnergyData.reduce((sum, d) => sum + d.nextEnergy, 0) / nextEnergyData.length;
            consumptionToNextDayWellbeing.push({
                name: 'Consumo → Energia Amanhã',
                displayName: t('correlations.nameConsNextEnergy'),
                icon: '💊',
                correlation: energyCorr,
                average: avgNextEnergy.toFixed(1),
                unit: '/10',
                dataPoints: nextEnergyData.length,
                type: 'consumptionImpact'
            });
        }

        if (correlations.length === 0) {
            return { noCorrelations: true };
        }

        // ===== SONO → HUMOR (computado aqui para evitar re-cálculo no render) =====
        const sleepMoodCorrelations = [];
        {
            const sameDaySleepMood = sortedDates
                .map(date => dailyData[date])
                .filter(day => day.sleep !== null && day.mood !== null)
                .map(day => ({ sleep: day.sleep, mood: day.mood }));

            const nextDaySleepMood = [];
            sortedDates.forEach((date, i) => {
                if (i < sortedDates.length - 1) {
                    const today = dailyData[date];
                    const tomorrow = dailyData[sortedDates[i + 1]];
                    if (today.sleep !== null && tomorrow.mood !== null) {
                        nextDaySleepMood.push({ sleep: today.sleep, mood: tomorrow.mood });
                    }
                }
            });

            if (sameDaySleepMood.length >= 1) {
                const corr = analyticsService.calculatePearsonCorrelation(sameDaySleepMood, 'sleep', 'mood');
                const avgSleep = sameDaySleepMood.reduce((s, d) => s + d.sleep, 0) / sameDaySleepMood.length;
                const avgMood = sameDaySleepMood.reduce((s, d) => s + d.mood, 0) / sameDaySleepMood.length;
                sleepMoodCorrelations.push({
                    name: 'Sono (última noite) → Humor hoje',
                    displayName: t('correlations.nameSleepMoodSameDay'),
                    icon: '😴➡️😊',
                    correlation: corr,
                    avgSleep: avgSleep.toFixed(1),
                    avgMood: avgMood.toFixed(1),
                    dataPoints: sameDaySleepMood.length
                });
            }

            if (nextDaySleepMood.length >= 1) {
                const corr = analyticsService.calculatePearsonCorrelation(nextDaySleepMood, 'sleep', 'mood');
                const avgSleep = nextDaySleepMood.reduce((s, d) => s + d.sleep, 0) / nextDaySleepMood.length;
                const avgMood = nextDaySleepMood.reduce((s, d) => s + d.mood, 0) / nextDaySleepMood.length;
                sleepMoodCorrelations.push({
                    name: 'Sono → Humor amanhã',
                    displayName: t('correlations.nameSleepMoodNextDay'),
                    icon: '😴💤😊',
                    correlation: corr,
                    avgSleep: avgSleep.toFixed(1),
                    avgMood: avgMood.toFixed(1),
                    dataPoints: nextDaySleepMood.length
                });
            }
        }

        // ===== BEDTIME ↔ CONSUMO (computado aqui para evitar re-cálculo no render) =====
        const bedtimeConsumptionData = [];
        analysisCycles.forEach(cycle => {
            if (!cycle.bedtime) return;

            // Nota: Qualquer hora é válida para deitar

            // Converter bedtime para minutos
            const [h, m] = cycle.bedtime.split(':').map(Number);
            let bedtimeMinutes = h * 60 + m;
            // Ajustar madrugada/tarde (00:00-17:59 → 24:00-41:59)
            // Cobre casos de sono irregular (deitar de madrugada ou durante o dia)
            if (h >= 0 && h < 18) bedtimeMinutes += 1440;

            // Encontrar data do ciclo
            const cycleDate = safeToISODate(cycle.timestamp);
            if (!cycleDate) return;

            // Contar consumos nesse dia
            const dayConsumptions = analysisConsumptions.filter(c => c.date === cycleDate).length;

            bedtimeConsumptionData.push({
                bedtime: bedtimeMinutes,
                consumptions: dayConsumptions
            });
        });

        const bedtimeConsCorrelation = bedtimeConsumptionData.length >= 1 ? analyticsService.calculatePearsonCorrelation(bedtimeConsumptionData, 'bedtime', 'consumptions') : null;

        const bedtimeToConsCard = bedtimeConsumptionData.length >= 1 ? {
            name: 'Bedtime → Consumo',
            displayName: t('correlations.nameBedtimeCons'),
            icon: '🕐',
            correlation: bedtimeConsCorrelation,
            average: (() => {
                const avgBedtime = bedtimeConsumptionData.reduce((s, d) => s + d.bedtime, 0) / bedtimeConsumptionData.length;
                const adjustedMinutes = avgBedtime >= 1440 ? avgBedtime - 1440 : avgBedtime;
                const avgBedtimeHours = Math.floor(adjustedMinutes / 60);
                const avgBedtimeMins = Math.round(adjustedMinutes % 60);
                return `${String(avgBedtimeHours).padStart(2, '0')}:${String(avgBedtimeMins).padStart(2, '0')}`;
            })(),
            unit: '',
            dataPoints: bedtimeConsumptionData.length,
            type: 'bedtime'
        } : null;

        return {
            correlations,
            averages,
            sleepData,
            moodData,
            energyData,
            sleepToConsumptionNext,
            moodToConsumptionNext,
            energyToConsumptionNext,
            emotionData,
            emotionCorrelationData,
            selfCareData,
            selfCareCorrelationData,
            consumptionAutocorrelation,
            consumptionToEmotions,
            consumptionToSelfCare,
            dosageToWellbeing,
            dosageData,
            weeklyDosage,
            firstConsToTotal,
            temporalDispersion,
            safeIntervals,
            strategyEffectiveness,
            consumptionByPeriod,
            experimentalFeatures,
            intervalToDosage,
            consumptionToBedtime,
            bedtimeToNextDayWellbeing,
            wellbeingToDosage,
            consumptionToNextDayWellbeing,
            dailyData,
            sortedDates,
            sleepMoodCorrelations,
            bedtimeConsumptionData,
            bedtimeConsCorrelation,
            bedtimeToConsCard,
        };
    }, [analysisConsumptions, analysisWellbeing, analysisCycles, analysisDailyLogs]);

    if (!correlacaoData) {
        return (
            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-8 border text-center'}>
                <div className="text-6xl mb-4">🔗</div>
                <h3 className={'text-xl font-bold mb-2 ' + ('text-white')}>{t('correlations.titleCard')}</h3>
                <p className={'text-sm ' + ('text-gray-400')}>
                    {t('correlations.noConsumptions')}
                </p>
            </div>
        );
    }

    if (correlacaoData.noWellbeingData) {
        return (
            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-8 border text-center'}>
                <div className="text-6xl mb-4">🔗</div>
                <h3 className={'text-xl font-bold mb-2 ' + ('text-white')}>{t('correlations.titleCard')}</h3>
                <p className={'text-sm ' + ('text-gray-400')}>
                    {t('correlations.noWellbeingData')}
                </p>
            </div>
        );
    }

    if (correlacaoData.noCorrelations) {
        return (
            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-8 border text-center'}>
                <div className="text-6xl mb-4">🔗</div>
                <h3 className={'text-xl font-bold mb-2 ' + ('text-white')}>{t('correlations.titleCard')}</h3>
                <p className={'text-sm ' + ('text-gray-400')}>
                    {t('correlations.noCorrelations')}
                </p>
            </div>
        );
    }

    const {
        correlations,
        sleepToConsumptionNext,
        moodToConsumptionNext,
        energyToConsumptionNext,
        consumptionAutocorrelation,
        consumptionToEmotions,
        consumptionToSelfCare,
        dosageToWellbeing,
        firstConsToTotal,
        temporalDispersion,
        safeIntervals,
        strategyEffectiveness,
        consumptionByPeriod,
        intervalToDosage,
        consumptionToBedtime,
        bedtimeToNextDayWellbeing,
        wellbeingToDosage,
        consumptionToNextDayWellbeing,
        dailyData,
        sortedDates,
        sleepMoodCorrelations,
        bedtimeConsumptionData,
        bedtimeConsCorrelation,
        bedtimeToConsCard,
    } = correlacaoData;

    const localizeDesc = (desc) => {
        if (i18n.language !== 'en' || !desc) return desc;
        return desc
            // Multi-word specific phrases first
            .replace(/Sem relação clara entre variáveis/g, 'No clear relationship between variables')
            .replace(/Relação detectada entre variáveis/g, 'Relationship detected between variables')
            .replace(/quebra de padrão/g, 'pattern break')
            .replace(/padrão de repetição/g, 'repetition pattern')
            .replace(/total de consumos/g, 'total uses')
            .replace(/Hora do 1º consumo não afeta total/g, "Time of 1st use doesn't affect total")
            .replace(/Espaçar mais pode significar doses maiores por consumo/g, 'Longer spacing may mean larger doses per use')
            // Deitar (bedtime) phrases
            .replace(/Deitar mais tarde/g, 'Going to bed later')
            .replace(/Deitar mais cedo/g, 'Going to bed earlier')
            .replace(/Deitar tarde/g, 'Going to bed late')
            .replace(/Deitar cedo/g, 'Going to bed early')
            .replace(/Hora de deitar/g, 'Bedtime')
            .replace(/hora de deitar/g, 'bedtime')
            // Temporal phrases
            .replace(/no dia seguinte/g, 'the next day')
            .replace(/ \(ontem → hoje\)/g, ' (yesterday → today)')
            .replace(/amanhã/g, 'tomorrow')
            .replace(/ontem/g, 'yesterday')
            .replace(/hoje/g, 'today')
            .replace(/no dia/g, 'that day')
            // Emotion and self-care compound phrases
            .replace(/Emoções Negativas/g, 'Negative emotions')
            .replace(/emoções negativas/g, 'negative emotions')
            .replace(/Emoções não afetam/g, "Emotions don't affect")
            .replace(/Emoções/g, 'Emotions')
            .replace(/emoções/g, 'emotions')
            .replace(/Primeiro consumo cedo/g, 'First use early')
            .replace(/Primeiro consumo tarde/g, 'First use late')
            .replace(/Primeiro consumo/g, 'First use')
            .replace(/primeiro consumo/g, 'first use')
            // Compound metric phrases (before individual words)
            .replace(/Mais consumos de manhã/g, 'More morning uses')
            .replace(/Mais consumos de tarde/g, 'More afternoon uses')
            .replace(/Mais consumos de noite/g, 'More evening uses')
            .replace(/Consumos de manhã/g, 'Morning uses')
            .replace(/Consumos de tarde/g, 'Afternoon uses')
            .replace(/Consumos de noite/g, 'Evening uses')
            .replace(/consumos de manhã/g, 'morning uses')
            .replace(/consumos de tarde/g, 'afternoon uses')
            .replace(/consumos de noite/g, 'evening uses')
            .replace(/consumos\/dia/g, 'uses/day')
            .replace(/mg\/dia/g, 'mg/day')
            .replace(/total no dia/g, 'total per day')
            .replace(/Intervalos maiores/g, 'Longer intervals')
            .replace(/Ligeira tendência para/g, 'Slight tendency toward')
            // Autocorrelation phrases
            .replace(/tende a repetir-se hoje/g, 'tends to repeat today')
            .replace(/inverte-se hoje/g, 'reverses today')
            .replace(/influencia ligeiramente hoje/g, 'slightly influences today')
            .replace(/não se repete hoje/g, "doesn't repeat today")
            .replace(/tende a inverter ligeiramente hoje/g, 'tends to slightly reverse today')
            .replace(/de ontem não afeta hoje/g, "from yesterday doesn't affect today")
            .replace(/não afetam/g, "don't affect")
            .replace(/não afeta/g, "doesn't affect")
            // Adjectives/adverbs
            .replace(/Ligeiramente/g, 'Slightly')
            .replace(/ligeiramente/g, 'slightly')
            .replace(/Mais baixo/g, 'Lower')
            .replace(/mais baixo/g, 'lower')
            // Directional words
            .replace(/Mais/g, 'More')
            .replace(/Menos/g, 'Less')
            .replace(/mais/g, 'more')
            .replace(/menos/g, 'less')
            // Quality words
            .replace(/Pior/g, 'Worse')
            .replace(/pior/g, 'worse')
            .replace(/Melhor/g, 'Better')
            .replace(/melhor/g, 'better')
            // High/Low
            .replace(/\balto\b/g, 'high')
            .replace(/\bAlto\b/g, 'High')
            .replace(/\bbaixo\b/g, 'low')
            .replace(/\bBaixo\b/g, 'Low')
            // Metrics (capitalized first)
            .replace(/Autocuidado/g, 'Self-care')
            .replace(/autocuidado/g, 'self-care')
            .replace(/Bem-estar/g, 'Wellbeing')
            .replace(/bem-estar/g, 'wellbeing')
            .replace(/Dosagem/g, 'Dosage')
            .replace(/dosagem/g, 'dosage')
            .replace(/Consumos/g, 'Uses')
            .replace(/consumos/g, 'uses')
            .replace(/Consumo/g, 'Consumption')
            .replace(/consumo/g, 'consumption')
            .replace(/Sono/g, 'Sleep')
            .replace(/sono/g, 'sleep')
            .replace(/Humor/g, 'Mood')
            .replace(/humor/g, 'mood')
            .replace(/Energia/g, 'Energy')
            .replace(/energia/g, 'energy')
            .replace(/Intervalos/g, 'Intervals')
            .replace(/intervalos/g, 'intervals')
            .replace(/Intervalo/g, 'Interval')
            .replace(/intervalo/g, 'interval')
            // Time of day
            .replace(/\bmanhã\b/g, 'morning')
            .replace(/\btarde\b/g, 'afternoon')
            .replace(/\bnoite\b/g, 'evening')
            .replace(/doses individuais maiores/g, 'larger individual doses')
            .replace(/doses maiores por consumo/g, 'larger doses per use');
    };
    const localizeUnit = (u) => i18n.language === 'en' && u === '/dia' ? '/day' : u;

    return (
        <div className="space-y-4">
            {/* Introdução às Correlações */}
            <div className="bg-blue-900/20 border-blue-700/50 rounded-lg p-4 border">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-300">
                    {t('correlations.title')}
                </h3>
                <div className="text-sm space-y-1 text-gray-400">
                    <p>{t('correlations.desc')}</p>
                    <p><span className="text-green-400">{t('correlations.good')}</span> {t('correlations.goodList')}</p>
                    <p><span className="text-red-400">{t('correlations.attention')}</span> {t('correlations.attentionList')}</p>
                    <p className="text-xs italic pt-1">{t('correlations.note')}</p>
                </div>
            </div>

            {/* Helper function para renderizar correlações */}
            {(() => {
                window.renderCorrelationCard = (corr, isInverse = false) => {
                    const getLabel = (r, name) => {
                        if (r === null) return { text: t('correlations.noData'), color: 'gray', desc: '' };

                        const isSleep = name.toLowerCase().includes('sono');
                        const isNegativeEmotion = name.toLowerCase().includes('emoções negativas') || name.toLowerCase().includes('emoções') && name.includes('→ Consumo');
                        const isSelfCare = name.toLowerCase().includes('autocuidado');
                        const isDosage = name.toLowerCase().includes('dosagem');
                        const isInterval = name.toLowerCase().includes('intervalo');
                        const isFirstCons = name.toLowerCase().includes('primeiro consumo');
                        const isBedtime = name.toLowerCase().includes('bedtime');

                        // Para correlações inversas (X → Consumo), inverter lógica
                        if (isInverse) {
                            // Bedtime → Consumo (deitar cedo = menos consumo = bom)
                            if (isBedtime && name.includes('→ Consumo')) {
                                if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'red', desc: 'Deitar tarde → Mais consumo' };
                                if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'orange', desc: 'Deitar tarde → Ligeiramente mais consumo' };
                                if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: 'Deitar cedo → Menos consumo' };
                                if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'green', desc: 'Deitar cedo → Ligeiramente menos consumo' };
                                return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Hora de deitar não afeta consumo' };
                            }

                            // Autocuidado alto → menos consumo = bom (negativa é boa)
                            if (isSelfCare) {
                                if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: 'Mais autocuidado → Menos consumo' };
                                if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'green', desc: 'Mais autocuidado → Ligeiramente menos consumo' };
                                if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'red', desc: 'Mais autocuidado → Mais consumo' };
                                if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'orange', desc: 'Mais autocuidado → Ligeiramente mais consumo' };
                                return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Autocuidado não afeta consumo' };
                            }

                            // Humor/energia altos → menos consumo (negativa é boa) e → dosagem
                            if (name.includes('Humor') && (name.includes('→ Consumo') || name.includes('→ Dosagem')) ||
                                name.includes('Energia') && (name.includes('→ Consumo') || name.includes('→ Dosagem'))) {
                                const target = name.split(' →')[1].trim();
                                const metricName = name.split(' →')[0].trim();
                                const isYesterday = metricName.toLowerCase().includes('ontem');

                                if (target.includes('Consumo')) {
                                    const suffix = isYesterday ? ' no dia seguinte' : '';
                                    if (r < -0.4) {
                                        return { text: t('correlations.labelProtective'), color: 'green', desc: `${metricName} alto → Menos consumo${suffix}` };
                                    }
                                    if (r < -0.2) {
                                        return { text: t('correlations.labelSlightlyProtective'), color: 'green', desc: `${metricName} alto → Ligeiramente menos consumo${suffix}` };
                                    }
                                    if (r > 0.4) return { text: t('correlations.labelRisk'), color: 'red', desc: `${metricName} alto → Mais consumo${suffix}` };
                                    if (r > 0.2) return { text: t('correlations.labelSlightlyRisk'), color: 'orange', desc: `${metricName} alto → Ligeiramente mais consumo${suffix}` };
                                    return { text: t('correlations.labelNoCorr'), color: 'gray', desc: `${metricName} não afeta consumo${suffix}` };
                                } else if (target.includes('Dosagem')) {
                                    if (r < -0.4) return { text: t('correlations.labelProtective'), color: 'green', desc: `${metricName} alto → Menos dosagem` };
                                    if (r < -0.2) return { text: t('correlations.labelSlightlyProtective'), color: 'green', desc: `${metricName} alto → Ligeiramente menos dosagem` };
                                    if (r > 0.4) return { text: t('correlations.labelRisk'), color: 'red', desc: `${metricName} alto → Mais dosagem` };
                                    if (r > 0.2) return { text: t('correlations.labelSlightlyRisk'), color: 'orange', desc: `${metricName} alto → Ligeiramente mais dosagem` };
                                    return { text: t('correlations.labelNoCorr'), color: 'gray', desc: `${metricName} não afeta dosagem` };
                                }
                            }

                            // Sono baixo → mais consumo/dosagem (negativa é má)
                            if (name.includes('Sono →')) {
                                const target = name.split(' →')[1].trim();
                                const isSameDayOrYesterday = !name.includes('ontem') && !name.includes('hoje');
                                const timeContext = name.includes('ontem') ? ' (ontem → hoje)' : '';

                                if (target === 'Consumo' || target.includes('Consumo')) {
                                    if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'red', desc: `Menos sono → Mais consumo${timeContext}` };
                                    if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'orange', desc: `Menos sono → Ligeiramente mais consumo${timeContext}` };
                                    if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'gray', desc: `Mais sono → Mais consumo${timeContext}` };
                                    if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'gray', desc: `Mais sono → Ligeiramente mais consumo${timeContext}` };
                                    return { text: t('correlations.labelNoCorr'), color: 'gray', desc: `Sono não afeta consumo${timeContext}` };
                                } else if (target === 'Dosagem') {
                                    if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'red', desc: 'Menos sono → Mais dosagem' };
                                    if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'orange', desc: 'Menos sono → Ligeiramente mais dosagem' };
                                    if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'gray', desc: 'Mais sono → Mais dosagem' };
                                    if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'gray', desc: 'Mais sono → Ligeiramente mais dosagem' };
                                    return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Sono não afeta dosagem' };
                                }
                            }

                            // Emoções negativas → mais consumo/dosagem (positiva é má)
                            if (name.includes('Emoções Negativas →')) {
                                const target = name.split(' →')[1].trim();

                                if (target === 'Consumo') {
                                    if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'red', desc: 'Mais emoções negativas → Mais consumo' };
                                    if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'orange', desc: 'Mais emoções negativas → Ligeiramente mais consumo' };
                                    if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: 'Mais emoções negativas → Menos consumo' };
                                    if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'green', desc: 'Mais emoções negativas → Ligeiramente menos consumo' };
                                    return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Emoções não afetam consumo' };
                                } else if (target === 'Dosagem') {
                                    if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'red', desc: 'Mais emoções negativas → Mais dosagem' };
                                    if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'orange', desc: 'Mais emoções negativas → Ligeiramente mais dosagem' };
                                    if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: 'Mais emoções negativas → Menos dosagem' };
                                    if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'green', desc: 'Mais emoções negativas → Ligeiramente menos dosagem' };
                                    return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Emoções não afetam dosagem' };
                                }
                            }
                        }

                        // Lógica padrão para correlações diretas (Consumo/Dosagem/Bedtime → X)

                        // Bedtime → Humor/Energia Amanhã (deitar tarde → pior humor/energia = mau)
                        if (name.includes('Bedtime →') && (name.includes('Humor') || name.includes('Energia'))) {
                            const metricLower = name.includes('Humor') ? 'humor' : 'energia';
                            // Correlação positiva = deitar tarde → pior métrica = mau
                            if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'green', desc: `Deitar cedo → Melhor ${metricLower} amanhã` };
                            if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'green', desc: `Deitar cedo → Ligeiramente melhor ${metricLower} amanhã` };
                            if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'red', desc: `Deitar tarde → Pior ${metricLower} amanhã` };
                            if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'orange', desc: `Deitar tarde → Ligeiramente pior ${metricLower} amanhã` };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: `Hora de deitar não afeta ${metricLower} amanhã` };
                        }

                        // Dosagem → Autocuidado (mais dosagem → menos autocuidado = mau)
                        if (name.includes('Dosagem →') && name.includes('Autocuidado')) {
                            if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'red', desc: 'Mais dosagem → Menos autocuidado' };
                            if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'orange', desc: 'Mais dosagem → Ligeiramente menos autocuidado' };
                            if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'green', desc: 'Mais dosagem → Mais autocuidado' };
                            if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'green', desc: 'Mais dosagem → Ligeiramente mais autocuidado' };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Dosagem não afeta autocuidado' };
                        }

                        // Dosagem → Emoções (mais dosagem → mais emoções negativas = mau)
                        if (name.includes('Dosagem →') && name.includes('Emoções')) {
                            if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'red', desc: 'Mais dosagem → Mais emoções negativas' };
                            if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'orange', desc: 'Mais dosagem → Ligeiramente mais emoções negativas' };
                            if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: 'Mais dosagem → Menos emoções negativas' };
                            if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'green', desc: 'Mais dosagem → Ligeiramente menos emoções negativas' };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Dosagem não afeta emoções' };
                        }

                        // Consumo → Bedtime (mais consumo → deitar tarde = mau)
                        if (name.includes('Consumo →') && name.includes('Bedtime')) {
                            if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'red', desc: 'Mais consumo → Deitar mais tarde' };
                            if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'orange', desc: 'Mais consumo → Ligeiramente deitar mais tarde' };
                            if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: 'Mais consumo → Deitar mais cedo' };
                            if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'green', desc: 'Mais consumo → Ligeiramente deitar mais cedo' };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Consumo não afeta hora de deitar' };
                        }

                        // Consumo → Sono/Humor/Energia (mais consumo → menos/pior = mau)
                        if (name.includes('Consumo →') && (name.includes('Sono') || name.includes('Humor') || name.includes('Energia'))) {
                            const isSleep = name.includes('Sono');
                            const isNextDay = name.includes('Amanhã');
                            const metricLower = name.includes('Sono') ? 'sono' : name.includes('Humor') ? 'humor' : 'energia';
                            const timeContext = isNextDay ? ' amanhã' : '';

                            if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'red', desc: `Mais consumo → ${isSleep ? 'Menos' : 'Pior'} ${metricLower}${timeContext}` };
                            if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'orange', desc: `Mais consumo → Ligeiramente ${isSleep ? 'menos' : 'pior'} ${metricLower}${timeContext}` };
                            if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'green', desc: `Mais consumo → ${isSleep ? 'Mais' : 'Melhor'} ${metricLower}${timeContext}` };
                            if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'green', desc: `Mais consumo → Ligeiramente ${isSleep ? 'mais' : 'melhor'} ${metricLower}${timeContext}` };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: `Consumo não afeta ${metricLower}${timeContext}` };
                        }

                        // Casos adicionais com explicações específicas

                        // Autocorrelação (X ontem → X hoje) - mas não X ontem → Consumo/Dosagem hoje
                        if (name.includes('ontem') && name.includes('hoje') && !name.includes('→ Consumo') && !name.includes('→ Dosagem')) {
                            const metric = name.split(' ontem')[0];
                            if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'gray', desc: `${metric} ontem tende a repetir-se hoje` };
                            if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'gray', desc: `${metric} ontem influencia ligeiramente hoje` };
                            if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'gray', desc: `${metric} ontem inverte-se hoje` };
                            if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'gray', desc: `${metric} ontem tende a inverter ligeiramente hoje` };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: `${metric} de ontem não afeta hoje` };
                        }

                        // Intervalo médio → Total/Dosagem
                        if (name.includes('Intervalo') && (name.includes('→ Total') || name.includes('→ Dosagem'))) {
                            const isDosage = name.includes('→ Dosagem');
                            if (isDosage) {
                                // Dosagem em MG - pode subir mesmo com menos consumos se cada um tiver mais mg
                                if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: 'Intervalos maiores → Menos dosagem total (mg/dia)' };
                                if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'green', desc: 'Intervalos maiores → Ligeiramente menos mg/dia' };
                                if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'red', desc: 'Intervalos maiores → Mais mg/dia (doses individuais maiores?)' };
                                if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'orange', desc: 'Espaçar mais pode significar doses maiores por consumo' };
                                return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Intervalo não afeta dosagem total' };
                            } else {
                                // Total de consumos
                                if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: 'Intervalos maiores → Menos consumos/dia' };
                                if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'green', desc: 'Intervalos maiores → Ligeiramente menos consumos/dia' };
                                if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'red', desc: 'Intervalos maiores → Mais consumos/dia' };
                                if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'orange', desc: 'Intervalos maiores → Ligeiramente mais consumos/dia' };
                                return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Intervalo não afeta total de consumos' };
                            }
                        }

                        // Dosagem → Bem-estar/Humor/Energia
                        if (name.includes('Dosagem →') && (name.includes('Bem-estar') || name.includes('Humor') || name.includes('Energia'))) {
                            const metric = name.includes('Bem-estar') ? 'bem-estar' : name.includes('Humor') ? 'humor' : 'energia';
                            if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'green', desc: `Mais dosagem → Melhor ${metric}` };
                            if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'green', desc: `Mais dosagem → Ligeiramente melhor ${metric}` };
                            if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'red', desc: `Mais dosagem → Pior ${metric}` };
                            if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'orange', desc: `Mais dosagem → Ligeiramente pior ${metric}` };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: `Dosagem não afeta ${metric}` };
                        }

                        // Bem-estar/Humor/Energia → Dosagem/Consumo (negativa é boa! mais humor → menos consumo)
                        if (name.includes('Bem-estar') && (name.includes('→ Dosagem') || name.includes('→ Consumo')) ||
                            (name.includes('Energia') && !isInverse && (name.includes('→ Dosagem') || name.includes('→ Consumo'))) ||
                            (name.includes('Humor') && !isInverse && (name.includes('→ Dosagem') || name.includes('→ Consumo')))) {
                            const metric = name.includes('Bem-estar') ? 'Bem-estar' : name.includes('Energia') ? 'Energia' : 'Humor';
                            const metricName = name.split(' →')[0].trim();
                            const target = name.includes('Dosagem') ? 'dosagem' : 'consumo';
                            const isYesterday = metricName.toLowerCase().includes('ontem');
                            const suffix = isYesterday ? ' no dia seguinte' : '';

                            // Correlação negativa = bom (mais humor/energia → menos consumo)
                            if (r < -0.4) return { text: t('correlations.labelProtective'), color: 'green', desc: `${metric} alto → Menos ${target}${suffix}` };
                            if (r < -0.2) return { text: t('correlations.labelSlightlyProtective'), color: 'green', desc: `${metric} alto → Ligeiramente menos ${target}${suffix}` };
                            // Correlação positiva = mau (mais humor/energia → mais consumo)
                            if (r > 0.4) return { text: t('correlations.labelRisk'), color: 'red', desc: `${metric} alto → Mais ${target}${suffix}` };
                            if (r > 0.2) return { text: t('correlations.labelSlightlyRisk'), color: 'orange', desc: `${metric} alto → Ligeiramente mais ${target}${suffix}` };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: `${metric} não afeta ${target}${suffix}` };
                        }

                        // Primeiro Consumo → Total
                        if (name.includes('Primeiro Consumo')) {
                            if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: 'Primeiro consumo tarde → Menos total no dia' };
                            if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'green', desc: 'Primeiro consumo tarde → Ligeiramente menos total' };
                            if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'red', desc: 'Primeiro consumo cedo → Mais total no dia' };
                            if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'orange', desc: 'Primeiro consumo cedo → Ligeiramente mais total' };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Hora do 1º consumo não afeta total' };
                        }

                        // Consumo Manhã/Tarde/Noite → Humor (períodos do dia)
                        if (name.includes('Consumo Manhã') || name.includes('Consumo Tarde') || name.includes('Consumo Noite')) {
                            const period = name.includes('Manhã') ? 'manhã' : name.includes('Tarde') ? 'tarde' : 'noite';
                            const periodTime = name.includes('Manhã') ? '6h-12h' : name.includes('Tarde') ? '12h-18h' : '18h-24h';
                            if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'red', desc: `Mais consumos de ${period} (${periodTime}) → Humor mais baixo no dia` };
                            if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'orange', desc: `Mais consumos de ${period} → Ligeira tendência para humor baixo` };
                            if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'green', desc: `Mais consumos de ${period} → Humor melhor no dia` };
                            if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'green', desc: `Mais consumos de ${period} → Ligeira tendência para humor alto` };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: `Consumos de ${period} não afetam humor` };
                        }

                        // Autocorrelação de Consumo (Consumo Ontem → Hoje) - positivo é MAU
                        // IMPORTANTE: só fazer match se COMEÇA com "Consumo", não se contém "Consumo" no final
                        if (name.toLowerCase().startsWith('consumo') && name.toLowerCase().includes('ontem') && name.toLowerCase().includes('hoje')) {
                            if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'red', desc: 'Alto consumo ontem → Alto consumo hoje (padrão de repetição)' };
                            if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'orange', desc: 'Consumo ontem tende a repetir-se hoje' };
                            if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: 'Alto consumo ontem → Baixo consumo hoje (quebra de padrão!)' };
                            if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'green', desc: 'Consumo de ontem não se repete hoje' };
                            return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Consumo de ontem não afeta hoje' };
                        }

                        // Lógica genérica (fallback com descrição baseada no nome)
                        const parts = name.split(' → ');
                        let genericDesc = 'Relação detectada entre variáveis';

                        if (parts.length === 2) {
                            const [var1, var2] = parts;

                            // Criar descrição clara baseada no tipo de relação
                            if (r < 0) {
                                // Correlação negativa: quando um sobe, o outro desce
                                if (var1.toLowerCase().includes('consumo') && var2.toLowerCase().includes('autocuidado')) {
                                    genericDesc = 'Mais consumo → Menos autocuidado';
                                } else {
                                    genericDesc = `Mais ${var1} → Menos ${var2}`;
                                }
                            } else if (r > 0) {
                                // Correlação positiva: quando um sobe, o outro sobe
                                genericDesc = `Mais ${var1} → Mais ${var2}`;
                            }
                        }

                        // Regra simples: Negativo = Vermelho (forte -> escuro), Positivo = Verde (forte -> escuro)
                        if (r < -0.7) return { text: t('correlations.labelStrongNegative'), color: 'red', desc: genericDesc };
                        if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'red', desc: genericDesc };
                        if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'orange', desc: genericDesc };
                        if (r > 0.7) return { text: t('correlations.labelStrongPositive'), color: 'green', desc: genericDesc };
                        if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'green', desc: genericDesc };
                        if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'green', desc: genericDesc };
                        return { text: t('correlations.labelNoCorr'), color: 'gray', desc: 'Sem relação clara entre variáveis' };
                    };

                    const rawLabel = getLabel(corr.correlation, corr.name);
                    const label = { ...rawLabel, desc: localizeDesc(rawLabel.desc) };

                    const colorClasses = {
                        red: 'bg-red-900/30 text-red-400 border-red-800',
                        orange: 'bg-orange-900/30 text-orange-400 border-orange-800',
                        yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
                        green: 'bg-green-900/30 text-green-400 border-green-800',
                        gray: 'bg-gray-700/50 text-gray-400 border-gray-600'
                    };

                    return (
                        <div key={corr.name} className={'rounded-lg p-4 border ' + colorClasses[label.color]}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{corr.icon}</span>
                                    <div>
                                        <div className={'font-semibold ' + ('text-white')}>{corr.displayName || corr.name}</div>
                                        <div className={'text-xs ' + ('text-gray-400')}>{t('correlations.avg')} {corr.average}{localizeUnit(corr.unit)}</div>
                                    </div>
                                </div>
                                <div className={'text-xs px-2 py-1 rounded-full font-medium ' + (
                                    label.color === 'red' ? ('bg-red-900/30 text-red-400') :
                                    label.color === 'orange' ? ('bg-orange-900/30 text-orange-400') :
                                    label.color === 'yellow' ? ('bg-yellow-900/30 text-yellow-400') :
                                    label.color === 'green' ? ('bg-green-900/30 text-green-400') :
                                    ('bg-gray-600 text-gray-300')
                                )}>
                                    {label.text}
                                </div>
                            </div>
                            <div className={'text-xs ' + ('text-gray-400')}>
                                {label.desc && <span>💡 {label.desc}</span>}
                                {corr.correlation !== null && <span className="ml-2">• r = {corr.correlation.toFixed(2)}</span>}
                                <span className="ml-2">• {corr.dataPoints} {t('correlations.days')}</span>
                            </div>
                        </div>
                    );
                };

                return null;
            })()}

            {/* 💊 CONSUMO → BEM-ESTAR (mesmo dia) */}
            {(correlations.length > 0 || consumptionToEmotions.length > 0 || consumptionToSelfCare.length > 0 || consumptionAutocorrelation.length > 0) && (
                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-4 md:p-6 border'}>
                    <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection('wellbeingConsumption')}>
                        <div>
                            <h3 className={'font-semibold ' + ('text-white')}>💊 {t('analyses.corrConsumptionWellbeing')}</h3>
                            <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                {t('analyses.corrWellbeingConsumptionDesc')}
                            </p>
                        </div>
                        <button className={'p-2 rounded-lg transition-colors ' + ('hover:bg-gray-700')}>
                            {expandedSections.wellbeingConsumption ? '▼' : '▶'}
                        </button>
                    </div>
                    {expandedSections.wellbeingConsumption && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {/* Consumo → Humor/Energia/Sono */}
                        {correlations.map(corr => window.renderCorrelationCard(corr, false))}

                        {/* Consumo → Emoções Negativas */}
                        {consumptionToEmotions.map(corr => window.renderCorrelationCard(corr, false))}

                        {/* Consumo → Autocuidado */}
                        {consumptionToSelfCare.map(corr => window.renderCorrelationCard(corr, false))}

                        {/* Consumo Ontem → Hoje */}
                        {consumptionAutocorrelation.map(corr => window.renderCorrelationCard(corr, false))}
                    </div>}
                </div>
            )}

            {/* 🔄 BEM-ESTAR ⇄ CONSUMO (temporal - entre dias) */}
            {(sleepToConsumptionNext.length > 0 || moodToConsumptionNext.length > 0 || energyToConsumptionNext.length > 0 || consumptionToNextDayWellbeing.length > 0) && (
                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-4 md:p-6 border'}>
                    <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection('temporalImpact')}>
                        <div>
                            <h3 className={'font-semibold ' + ('text-white')}>{t('analyses.corrTemporalImpactTitle')}</h3>
                            <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                {t('analyses.corrTemporalImpactDesc')}
                            </p>
                        </div>
                        <button className={'p-2 rounded-lg transition-colors ' + ('hover:bg-gray-700')}>
                            {expandedSections.temporalImpact ? '▼' : '▶'}
                        </button>
                    </div>
                    {expandedSections.temporalImpact && <div className="space-y-3 mt-4">
                        {/* Sono ontem ⇄ Consumo hoje */}
                        {(sleepToConsumptionNext.length > 0 || consumptionToNextDayWellbeing.some(c => c.name === 'Consumo → Sono Amanhã')) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {sleepToConsumptionNext.length > 0 ?
                                    window.renderCorrelationCard(sleepToConsumptionNext[0], true) :
                                    <div></div>
                                }
                                {consumptionToNextDayWellbeing.find(c => c.name === 'Consumo → Sono Amanhã') ?
                                    window.renderCorrelationCard(consumptionToNextDayWellbeing.find(c => c.name === 'Consumo → Sono Amanhã'), false) :
                                    <div></div>
                                }
                            </div>
                        )}

                        {/* Humor ontem ⇄ Consumo hoje */}
                        {(moodToConsumptionNext.length > 0 || consumptionToNextDayWellbeing.some(c => c.name === 'Consumo → Humor Amanhã')) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {moodToConsumptionNext.length > 0 ?
                                    window.renderCorrelationCard(moodToConsumptionNext[0], true) :
                                    <div></div>
                                }
                                {consumptionToNextDayWellbeing.find(c => c.name === 'Consumo → Humor Amanhã') ?
                                    window.renderCorrelationCard(consumptionToNextDayWellbeing.find(c => c.name === 'Consumo → Humor Amanhã'), false) :
                                    <div></div>
                                }
                            </div>
                        )}

                        {/* Energia ontem ⇄ Consumo hoje */}
                        {(energyToConsumptionNext.length > 0 || consumptionToNextDayWellbeing.some(c => c.name === 'Consumo → Energia Amanhã')) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {energyToConsumptionNext.length > 0 ?
                                    window.renderCorrelationCard(energyToConsumptionNext[0], true) :
                                    <div></div>
                                }
                                {consumptionToNextDayWellbeing.find(c => c.name === 'Consumo → Energia Amanhã') ?
                                    window.renderCorrelationCard(consumptionToNextDayWellbeing.find(c => c.name === 'Consumo → Energia Amanhã'), false) :
                                    <div></div>
                                }
                            </div>
                        )}
                    </div>}
                </div>
            )}

            {/* Sono → Humor */}
            {(() => {
                if (sleepMoodCorrelations.length > 0) {
                    const getCorrelationLabel = (r) => {
                        if (r === null) return { text: t('correlations.noData'), color: 'gray', desc: '' };
                        if (r > 0.7) return { text: t('correlations.labelStrongPositive'), color: 'green', desc: i18n.language === 'en' ? 'More sleep → Much better mood' : 'Mais sono → Muito melhor humor' };
                        if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'green', desc: i18n.language === 'en' ? 'More sleep → Better mood' : 'Mais sono → Melhor humor' };
                        if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'green', desc: i18n.language === 'en' ? 'Sleep helps mood' : 'Sono ajuda o humor' };
                        if (r < -0.7) return { text: t('correlations.labelStrongNegative'), color: 'red', desc: i18n.language === 'en' ? 'More sleep → Much worse mood (unusual)' : 'Mais sono → Muito pior humor (incomum)' };
                        if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'orange', desc: i18n.language === 'en' ? 'More sleep → Worse mood (unusual)' : 'Mais sono → Pior humor (incomum)' };
                        if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'yellow', desc: i18n.language === 'en' ? 'Possible negative correlation' : 'Possível correlação negativa' };
                        return { text: t('correlations.labelNoCorr'), color: 'gray', desc: i18n.language === 'en' ? 'No clear relationship' : 'Sem relação clara' };
                    };

                    const renderSleepMoodCard = (corr) => {
                        const rawLabel = getCorrelationLabel(corr.correlation);
                        const label = { ...rawLabel, desc: localizeDesc(rawLabel.desc) };
                        const colorClasses = {
                            red: 'bg-red-900/30 text-red-400 border-red-800',
                            orange: 'bg-orange-900/30 text-orange-400 border-orange-800',
                            yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
                            green: 'bg-green-900/30 text-green-400 border-green-800',
                            gray: 'bg-gray-700/50 text-gray-400 border-gray-600'
                        };
                        return (
                            <div className={'rounded-lg p-4 border ' + colorClasses[label.color]}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{corr.icon}</span>
                                        <span className="font-semibold">{corr.displayName || corr.name}</span>
                                    </div>
                                    <div className="text-sm px-2 py-1 rounded-full font-medium bg-black/10">
                                        {label.text}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div>
                                        <span className="opacity-75">{i18n.language === 'en' ? 'Sleep: ' : 'Sono: '}</span>
                                        <span className="font-bold">{corr.avgSleep}h</span>
                                        <span className="opacity-75"> • {i18n.language === 'en' ? 'Mood: ' : 'Humor: '}</span>
                                        <span className="font-bold">{corr.avgMood}/10</span>
                                    </div>
                                    <div className="opacity-75">
                                        r = {corr.correlation !== null ? corr.correlation.toFixed(2) : 'N/A'} ({corr.dataPoints} {t('correlations.days')})
                                    </div>
                                </div>
                                {label.desc && (
                                    <div className="text-xs opacity-75 mt-2">💡 {label.desc}</div>
                                )}
                            </div>
                        );
                    };

                    return (
                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-4 md:p-6 border'}>
                            <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection('sleepMood')}>
                                <div>
                                    <h3 className={'font-semibold ' + ('text-white')}>😴💭 {t('analyses.corrSleepMood')}</h3>
                                    <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                        {t('analyses.corrSleepMoodDesc')}
                                    </p>
                                </div>
                                <button className={'p-2 rounded-lg transition-colors ' + ('hover:bg-gray-700')}>
                                    {expandedSections.sleepMood ? '▼' : '▶'}
                                </button>
                            </div>
                            {expandedSections.sleepMood && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                {sleepMoodCorrelations.find(c => c.name === 'Sono (última noite) → Humor hoje') ?
                                    renderSleepMoodCard(sleepMoodCorrelations.find(c => c.name === 'Sono (última noite) → Humor hoje')) :
                                    <div></div>
                                }
                                {sleepMoodCorrelations.find(c => c.name === 'Sono → Humor amanhã') ?
                                    renderSleepMoodCard(sleepMoodCorrelations.find(c => c.name === 'Sono → Humor amanhã')) :
                                    <div></div>
                                }
                            </div>}
                        </div>
                    );
                }

                return null;
            })()}

            {/* Hora de Deitar ↔ Consumo */}
            {(() => {
                // Correlação entre hora de deitar e consumo
                const getCorrelationLabel = (r) => {
                    if (r === null) return { text: t('correlations.noData'), color: 'gray', desc: '' };
                    const en = i18n.language === 'en';
                    if (r < -0.7) return { text: t('correlations.labelStrongNegative'), color: 'green', desc: en ? 'Going to bed earlier → Less use' : 'Deitar mais cedo → Menos consumo' };
                    if (r < -0.4) return { text: t('correlations.labelNegative'), color: 'green', desc: en ? 'Going to bed early can help reduce use' : 'Deitar cedo pode ajudar a reduzir consumo' };
                    if (r < -0.2) return { text: t('correlations.labelWeakNegative'), color: 'yellow', desc: en ? 'Slight tendency: earlier bedtime → less use' : 'Leve tendência: deitar cedo → menos consumo' };
                    if (r > 0.7) return { text: t('correlations.labelStrongPositive'), color: 'red', desc: en ? 'Going to bed late → Much more use' : 'Deitar tarde → Muito mais consumo' };
                    if (r > 0.4) return { text: t('correlations.labelPositive'), color: 'orange', desc: en ? 'Going to bed late → More use' : 'Deitar tarde → Mais consumo' };
                    if (r > 0.2) return { text: t('correlations.labelWeakPositive'), color: 'yellow', desc: en ? 'Slight tendency: later bedtime → more use' : 'Leve tendência: deitar tarde → mais consumo' };
                    return { text: t('correlations.labelNoCorr'), color: 'gray', desc: en ? "Bedtime doesn't seem to affect use" : 'Hora de deitar não parece afetar consumo' };
                };

                const correlation = bedtimeConsCorrelation;
                const rawBedtimeLabel = getCorrelationLabel(correlation);
                const label = { ...rawBedtimeLabel, desc: localizeDesc(rawBedtimeLabel.desc) };

                const colorClasses = {
                    red: 'bg-red-900/30 text-red-400 border-red-800',
                    orange: 'bg-orange-900/30 text-orange-400 border-orange-800',
                    yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
                    green: 'bg-green-900/30 text-green-400 border-green-800',
                    gray: 'bg-gray-700/50 text-gray-400 border-gray-600'
                };

                return (
                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-4 md:p-6 border'}>
                        <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection('bedtimeConsumption')}>
                            <div>
                                <h3 className={'font-semibold ' + ('text-white')}>🔄 {t('analyses.corrBedtimeConsumption')}</h3>
                                <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                    {t('analyses.corrBedtimeConsumptionDesc')}
                                </p>
                            </div>
                            <button className={'p-2 rounded-lg transition-colors ' + ('hover:bg-gray-700')}>
                                {expandedSections.bedtimeConsumption ? '▼' : '▶'}
                            </button>
                        </div>
                        {expandedSections.bedtimeConsumption && ((bedtimeToConsCard || consumptionToBedtime.length > 0) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                {bedtimeToConsCard ? window.renderCorrelationCard(bedtimeToConsCard, true) : <div></div>}
                                {consumptionToBedtime.length > 0 ? window.renderCorrelationCard(consumptionToBedtime[0], false) : <div></div>}
                            </div>
                        ) : (
                            <div className={'text-center py-6 text-sm ' + ('text-gray-400')}>
                                {i18n.language === 'en' ? 'No bedtime data recorded' : 'Sem dados de hora de deitar registados'}
                            </div>
                        ))}
                    </div>
                );
            })()}

            {/* 🌙 BEDTIME → HUMOR/ENERGIA (dia seguinte) */}
            {bedtimeToNextDayWellbeing.length > 0 && (
                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-4 md:p-6 border'}>
                    <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection('bedtimeWellbeing')}>
                        <div>
                            <h3 className={'font-semibold ' + ('text-white')}>🌙 {t('analyses.corrBedtimeWellbeing')}</h3>
                            <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                {t('analyses.corrBedtimeWellbeingDesc')}
                            </p>
                        </div>
                        <button className={'p-2 rounded-lg transition-colors ' + ('hover:bg-gray-700')}>
                            {expandedSections.bedtimeWellbeing ? '▼' : '▶'}
                        </button>
                    </div>
                    {expandedSections.bedtimeWellbeing && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {bedtimeToNextDayWellbeing.find(c => c.name === 'Bedtime → Humor Amanhã') ?
                            window.renderCorrelationCard(bedtimeToNextDayWellbeing.find(c => c.name === 'Bedtime → Humor Amanhã'), false) :
                            <div></div>
                        }
                        {bedtimeToNextDayWellbeing.find(c => c.name === 'Bedtime → Energia Amanhã') ?
                            window.renderCorrelationCard(bedtimeToNextDayWellbeing.find(c => c.name === 'Bedtime → Energia Amanhã'), false) :
                            <div></div>
                        }
                    </div>}
                </div>
            )}

            {/* 💊 DOSAGEM ⇄ CONTEXTO */}
            {(dosageToWellbeing.length > 0 || wellbeingToDosage.length > 0 || intervalToDosage.length > 0) && (
                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-4 md:p-6 border'}>
                    <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection('wellbeingDosage')}>
                        <div>
                            <h3 className={'font-semibold ' + ('text-white')}>💊 {t('analyses.corrDosageContext')}</h3>
                            <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                {t('analyses.corrDosageContextDesc')}
                            </p>
                        </div>
                        <button className={'p-2 rounded-lg transition-colors ' + ('hover:bg-gray-700')}>
                            {expandedSections.wellbeingDosage ? '▼' : '▶'}
                        </button>
                    </div>
                    {expandedSections.wellbeingDosage && <div className="space-y-3 mt-4">
                        {/* Explicação introdutória */}
                        <div className={('bg-purple-900/20 border-purple-700/50') + ' rounded-lg p-3 border'}>
                            <p className={'text-xs font-semibold mb-2 ' + ('text-purple-300')}>
                                💡 {i18n.language === 'en' ? 'About dosage vs frequency:' : 'Sobre dosagem vs frequência:'}
                            </p>
                            <p className={'text-xs ' + ('text-gray-400')}>
                                {i18n.language === 'en' ? (
                                    <><strong>Dosage</strong> = total mg per day. <strong>Frequency</strong> = number of uses per day. This section analyses whether your emotional state (triggers, emotions) influences the <u>quantity</u> you use, not just how often.</>
                                ) : (
                                    <><strong>Dosagem</strong> = quantidade total de mg por dia. <strong>Frequência</strong> = número de consumos por dia. Esta secção analisa se o teu estado emocional (gatilhos, emoções) influencia a <u>quantidade</u> que consomes, não apenas quantas vezes consomes.</>
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Gatilhos/Emoções Negativas → Dosagem */}
                            {wellbeingToDosage.map(corr => window.renderCorrelationCard(corr, true))}

                            {/* Dosagem → X (Humor/Energia/Sono/Autocuidado/Emoções Negativas) */}
                            {dosageToWellbeing.map(corr => window.renderCorrelationCard(corr, false))}

                            {/* Intervalo → Dosagem */}
                            {intervalToDosage.map(corr => window.renderCorrelationCard(corr, false))}
                        </div>
                    </div>}
                </div>
            )}

            {/* ⏰ PADRÕES TEMPORAIS */}
            {(firstConsToTotal.length > 0 || temporalDispersion.length > 0 || consumptionByPeriod.length > 0) && (
                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-4 md:p-6 border'}>
                    <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection('temporalPatterns')}>
                        <div>
                            <h3 className={'font-semibold ' + ('text-white')}>⏰ {t('analyses.corrTemporalPatterns')}</h3>
                            <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                {t('analyses.corrTemporalPatternsDesc')}
                            </p>
                        </div>
                        <button className={'p-2 rounded-lg transition-colors ' + ('hover:bg-gray-700')}>
                            {expandedSections.temporalPatterns ? '▼' : '▶'}
                        </button>
                    </div>
                    {expandedSections.temporalPatterns && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        {firstConsToTotal.map(corr => window.renderCorrelationCard(corr, false))}

                        {/* Dispersão Temporal com card especial */}
                        {temporalDispersion.map(disp => (
                            <div key={disp.name} className={'rounded-lg p-4 border ' + (
                                disp.pattern === 'Muito Regular' || disp.pattern === 'Regular'
                                    ? ('bg-green-900/30 text-green-400 border-green-800')
                                    : disp.pattern === 'Caótico'
                                        ? ('bg-red-900/30 text-red-400 border-red-800')
                                        : ('bg-yellow-900/30 text-yellow-400 border-yellow-800')
                            )}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{disp.icon}</span>
                                        <div className="font-semibold text-sm">{disp.displayName || disp.name}</div>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1 mb-1">
                                    <span className="text-3xl font-black">{disp.average}</span>
                                    <span className="text-sm opacity-75">{disp.unit}</span>
                                </div>
                                <div className={'text-xs opacity-75 mb-2'}>
                                    {i18n.language === 'en' ? 'Pattern: ' : 'Padrão: '}<strong>{disp.patternLabel || disp.pattern}</strong>
                                </div>
                                <div className={'text-xs leading-relaxed opacity-90'}>
                                    {disp.pattern === 'Muito Regular' && (i18n.language === 'en' ? 'Uses occur at very consistent times — predictable pattern.' : 'Consumos ocorrem em horários muito consistentes - padrão previsível.')}
                                    {disp.pattern === 'Regular' && (i18n.language === 'en' ? 'Uses occur at relatively consistent times.' : 'Consumos ocorrem em horários relativamente consistentes.')}
                                    {disp.pattern === 'Moderado' && (i18n.language === 'en' ? 'Uses vary moderately throughout the day.' : 'Consumos variam moderadamente ao longo do dia.')}
                                    {disp.pattern === 'Caótico' && (i18n.language === 'en' ? 'Uses occur at very varied times — unpredictable pattern.' : 'Consumos ocorrem em horários muito variados - padrão imprevisível.')}
                                </div>
                                <div className={'text-xs mt-2 pt-2 border-t opacity-50 ' + ('border-gray-600')}>
                                    {disp.dataPoints} {i18n.language === 'en' ? 'uses analysed' : 'consumos analisados'}
                                </div>
                            </div>
                        ))}

                        {/* Intervalos "Seguros" com card especial */}
                        {safeIntervals.map(safe => (
                            <div key={safe.name} className={'rounded-lg p-4 border ' + (
                                safe.correlation < -0.3
                                    ? ('bg-green-900/30 text-green-400 border-green-800')
                                    : safe.correlation > 0.3
                                        ? ('bg-red-900/30 text-red-400 border-red-800')
                                        : ('bg-gray-800 border-gray-700')
                            )}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{safe.icon}</span>
                                        <div className="font-semibold text-sm">{safe.name}</div>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-3xl font-black">{safe.average}</span>
                                    <span className="text-sm opacity-75">{safe.unit} {i18n.language === 'en' ? 'avg' : 'média'}</span>
                                </div>
                                <div className={'text-sm leading-relaxed mb-2 ' + ('text-gray-300')}>
                                    {i18n.language === 'en' ? (
                                        <>💡 When you space <span className="font-semibold">&gt;3h</span> between uses: <span className="font-semibold">{safe.avgTotalGood}/day</span> ({safe.goodDays} days)<br/>Intervals &lt;3h: <span className="font-semibold">{safe.avgTotalBad}/day</span> ({safe.badDays} days)</>
                                    ) : (
                                        <>💡 Quando espaças <span className="font-semibold">&gt;3h</span> entre consumos: <span className="font-semibold">{safe.avgTotalGood}/dia</span> ({safe.goodDays} dias)<br/>Intervalos &lt;3h: <span className="font-semibold">{safe.avgTotalBad}/dia</span> ({safe.badDays} dias)</>
                                    )}
                                </div>
                                <div className={'text-xs mt-2 pt-2 border-t opacity-50 ' + ('border-gray-600')}>
                                    • r = {safe.correlation.toFixed(2)} • {safe.dataPoints} dias
                                </div>
                            </div>
                        ))}

                        {/* Eficácia de Estratégias com card especial */}
                        {strategyEffectiveness.map(strat => (
                            <div key={strat.name} className={'rounded-lg p-4 border ' + (
                                parseFloat(strat.average) > 50
                                    ? ('bg-green-900/30 text-green-400 border-green-800')
                                    : parseFloat(strat.average) > 20
                                        ? ('bg-blue-900/30 text-blue-400 border-blue-800')
                                        : ('bg-gray-800 border-gray-700')
                            )}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{strat.icon}</span>
                                        <div className="font-semibold text-sm">{strat.name}</div>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-3xl font-black">{strat.average}</span>
                                    <span className="text-sm opacity-75">{strat.unit} {i18n.language === 'en' ? 'reduction' : 'redução'}</span>
                                </div>
                                <div className={'text-sm leading-relaxed mb-2 ' + ('text-gray-300')}>
                                    {i18n.language === 'en' ? (
                                        <>💡 Days with full self-care (4/4 areas): <span className="font-semibold">{strat.avgFull}/day</span> ({strat.fullDays} days)<br/>Days without self-care: <span className="font-semibold">{strat.avgNone}/day</span> ({strat.noneDays} days)</>
                                    ) : (
                                        <>💡 Dias com autocuidado completo (4/4 áreas): <span className="font-semibold">{strat.avgFull}/dia</span> ({strat.fullDays} dias)<br/>Dias sem autocuidado: <span className="font-semibold">{strat.avgNone}/dia</span> ({strat.noneDays} dias)</>
                                    )}
                                </div>
                                <div className={'text-xs mt-2 pt-2 border-t opacity-50 ' + ('border-gray-600')}>
                                    • r = {strat.correlation.toFixed(2)} • {strat.dataPoints} dias
                                </div>
                            </div>
                        ))}

                        {/* Consumo por Período */}
                        {consumptionByPeriod.map(period => window.renderCorrelationCard({
                            name: `${period.name} (${period.period})`,
                            icon: period.icon,
                            correlation: period.correlation,
                            average: period.average,
                            unit: 'cons',
                            dataPoints: period.dataPoints
                        }, false))}
                    </div>}
                </div>
            )}
        </div>
    );
});
