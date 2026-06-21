import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as analyticsService from '../../services/analyticsService';
import { analyzeMultipleNotes, analyzeNote, identifyThemes } from '../../utils/sentimentAnalysis';
import { getEmotionCategory } from '../../constants/emotions';
import { safeToISODate } from '../../utils/helpers';

const { getDateRangeForPeriod, filterByDateRange, getGoalAchievementCount } = analyticsService;

export const AnalysesCoachTab = React.memo(function AnalysesCoachTab({
    analysisConsumptions,
    analysisWellbeing,
    analysisCycles,
    analysisDailyLogs,
    analysisReflections,
    analysisThoughts,
    goals,
    consumptions,
    patternsPeriod,
    patternsPeriodOffset,
}) {
    const coachData = useMemo(() => {
        if (analysisConsumptions.length === 0 && analysisWellbeing.length === 0) {
            return null;
        }

        // ===== DYNAMIC THRESHOLDS BASED ON USER GOALS =====
        // Buscar meta de redução de frequência para thresholds personalizados
        const frequencyGoal = goals.find(g => g.type === 'reduce_frequency');
        // Threshold para "dia difícil": meta + 2 (ou 10 se não houver meta)
        const difficultThreshold = frequencyGoal ? frequencyGoal.target + 2 : 10;

        // Calculate all metrics for narrative
        const totalConsumptions = analysisConsumptions.length;
        const byDate = {};
        analysisConsumptions.forEach(c => { byDate[c.date] = (byDate[c.date] || 0) + 1; });
        const uniqueDays = Object.keys(byDate).length;
        const avgPerDay = uniqueDays > 0 ? (totalConsumptions / uniqueDays).toFixed(1) : 0;

        // Wellbeing averages
        const validSleep = analysisWellbeing.filter(w => w.sleep && !isNaN(parseFloat(w.sleep)));
        const avgSleep = validSleep.length > 0 ? (validSleep.reduce((sum, w) => sum + parseFloat(w.sleep), 0) / validSleep.length).toFixed(1) : null;

        const validMood = analysisWellbeing.filter(w => w.mood && !isNaN(parseInt(w.mood)));
        const avgMood = validMood.length > 0 ? (validMood.reduce((sum, w) => sum + parseInt(w.mood), 0) / validMood.length).toFixed(1) : null;

        const validEnergy = analysisWellbeing.filter(w => w.energy && !isNaN(parseInt(w.energy)));
        const avgEnergy = validEnergy.length > 0 ? (validEnergy.reduce((sum, w) => sum + parseInt(w.energy), 0) / validEnergy.length).toFixed(1) : null;

        // Trending
        const sorted = [...analysisConsumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
        const intervals = [];
        for (let i = 1; i < sorted.length; i++) {
            const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
            intervals.push(diff);
        }
        const avgInterval = intervals.length > 0 ? (intervals.reduce((sum, i) => sum + i, 0) / intervals.length).toFixed(1) : 0;
        const goodIntervals = intervals.filter(i => i >= 2).length;
        const goodPercent = intervals.length > 0 ? Math.round((goodIntervals / intervals.length) * 100) : 0;

        // Best/worst days (excluir o dia de hoje exceto quando filtrado por "dia")
        const dates = Object.keys(byDate).sort();
        const today = new Date().toISOString().split('T')[0];
        const completedDates = patternsPeriod === 'hoje' ? dates : dates.filter(d => d !== today);
        const sortedDates = completedDates.sort((a, b) => byDate[a] - byDate[b]);
        const bestDate = sortedDates.length > 0 ? sortedDates[0] : null;
        const worstDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
        const bestCount = bestDate ? byDate[bestDate] : 0;
        const worstCount = worstDate ? byDate[worstDate] : 0;

        // Time pattern
        const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
        analysisConsumptions.forEach(c => {
            const hour = new Date(c.timestamp).getHours();
            if (hour >= 6 && hour < 12) byPartOfDay.manha++;
            else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
            else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
            else byPartOfDay.madrugada++;
        });
        const maxPartOfDay = Object.entries(byPartOfDay).reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
        const partNames = { manha: 'manhã', tarde: 'tarde', noite: 'noite', madrugada: 'madrugada' };

        // Sentiment analysis AVANÇADO - INCLUIR TUDO do histórico do período
        const allNotes = [
            ...analysisConsumptions.map(c => c.notes || ''),
            ...analysisWellbeing.map(w => w.notes || ''),
            ...analysisCycles.map(c => c.notes || ''),
            ...analysisReflections.map(r => r.answer || ''),
            ...analysisDailyLogs.map(d => d.notes || ''),
            ...analysisThoughts.map(t => t.content || '')
        ].filter(n => n.length > 0);

        // Usar análise avançada com negações, intensificadores e contexto
        const sentimentAnalysis = analyzeMultipleNotes(allNotes);
        const sentimentThemes = identifyThemes(allNotes);
        const sentimentScore = sentimentAnalysis.score;

        return {
            frequencyGoal,
            difficultThreshold,
            totalConsumptions,
            byDate,
            uniqueDays,
            avgPerDay,
            avgSleep,
            avgMood,
            avgEnergy,
            sorted,
            intervals,
            avgInterval,
            goodIntervals,
            goodPercent,
            dates,
            completedDates,
            sortedDates,
            bestDate,
            worstDate,
            bestCount,
            worstCount,
            byPartOfDay,
            maxPartOfDay,
            partNames,
            allNotes,
            sentimentAnalysis,
            sentimentThemes,
            sentimentScore,
        };
    }, [
        analysisConsumptions,
        analysisWellbeing,
        analysisCycles,
        analysisDailyLogs,
        analysisReflections,
        analysisThoughts,
        goals,
        patternsPeriod,
    ]);

    const { t, i18n } = useTranslation();

    if (!coachData) {
        return (<div className={('bg-gray-800 border-gray-700 text-gray-400') + ' rounded-xl p-6 border text-center'}>{t('coach.noData')}</div>);
    }

    const {
        frequencyGoal,
        difficultThreshold,
        totalConsumptions,
        byDate,
        uniqueDays,
        avgPerDay,
        avgSleep,
        avgMood,
        avgEnergy,
        sorted,
        intervals,
        avgInterval,
        goodIntervals,
        goodPercent,
        dates,
        completedDates,
        sortedDates,
        bestDate,
        worstDate,
        bestCount,
        worstCount,
        byPartOfDay,
        maxPartOfDay,
        partNames,
        allNotes,
        sentimentAnalysis,
        sentimentThemes,
        sentimentScore,
    } = coachData;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className={('bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-700/50') + ' rounded-xl p-6 border'}>
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">💬</span>
                    <h3 className={'text-2xl font-bold ' + ('text-white')}>
                        {t('coach.title')}
                    </h3>
                </div>
                <p className={'text-xs ' + ('text-gray-400')}>
                    {t('coach.subtitle')}
                </p>
            </div>

            {/* Narrative Summary */}
            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                <div className={'space-y-4 leading-relaxed ' + ('text-gray-200')}>
                    {/* Paragraph 1: Overview */}
                    <p>
                        {totalConsumptions > 0 ? (
                            <>📊 <strong className={('text-purple-400')}>{t('coach.overviewLabel')}</strong>{' '}
                            {t('coach.overviewText', {
                                total: totalConsumptions,
                                uses: t(totalConsumptions === 1 ? 'coach.use_singular' : 'coach.use_plural'),
                                days: uniqueDays,
                                daysLabel: t(uniqueDays === 1 ? 'coach.day_singular' : 'coach.day_plural'),
                                avg: avgPerDay
                            })}</>
                        ) : (
                            <>{t('coach.noConsumptions')}</>
                        )}
                    </p>

                    {/* NOVO: Paragraph 2 - Dias Bons vs Difíceis */}
                    {(() => {
                        if (totalConsumptions === 0) return null;

                        // Agrupar consumos por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = { count: 0, cycles: [], wellbeing: [] };
                            consumptionsByDate[c.date].count++;
                        });

                        // Adicionar dados de ciclos
                        analysisCycles.forEach(cycle => {
                            const cycleDate = cycle.date || new Date(cycle.timestamp).toISOString().split('T')[0];
                            if (consumptionsByDate[cycleDate]) {
                                consumptionsByDate[cycleDate].cycles.push(cycle);
                            }
                        });

                        // Adicionar dados de wellbeing
                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (wDate && consumptionsByDate[wDate]) {
                                consumptionsByDate[wDate].wellbeing.push(w);
                            }
                        });

                        // Buscar meta de redução de frequência para definir thresholds dinâmicos
                        const frequencyGoal = goals.find(g => g.type === 'reduce_frequency');

                        // Se não houver meta, não mostrar esta secção
                        if (!frequencyGoal) return null;

                        const goodThreshold = Math.max(1, frequencyGoal.target - 1); // target - 1
                        // Use the same global threshold (target + 2) so all sections agree

                        const goodDays = Object.entries(consumptionsByDate).filter(([_, d]) => d.count <= goodThreshold);
                        const difficultDays = Object.entries(consumptionsByDate).filter(([_, d]) => d.count >= difficultThreshold);

                        if (goodDays.length === 0 && difficultDays.length === 0) return null;

                        // Calcular médias
                        const calcAvgSleep = (days) => {
                            const sleepData = days.flatMap(([_, d]) => d.cycles.filter(c => c.sleep && !isNaN(parseFloat(c.sleep))).map(c => parseFloat(c.sleep)));
                            return sleepData.length > 0 ? (sleepData.reduce((a, b) => a + b, 0) / sleepData.length).toFixed(1) : null;
                        };

                        const calcAvgMood = (days) => {
                            const moodData = days.flatMap(([_, d]) => d.wellbeing.filter(w => w.mood).map(w => parseInt(w.mood)));
                            return moodData.length > 0 ? (moodData.reduce((a, b) => a + b, 0) / moodData.length).toFixed(1) : null;
                        };

                        const goodSleep = calcAvgSleep(goodDays);
                        const difficultSleep = calcAvgSleep(difficultDays);
                        const goodMood = calcAvgMood(goodDays);
                        const difficultMood = calcAvgMood(difficultDays);

                        return (
                            <p>
                                🏆 <strong className={('text-green-400')}>{t('coach.goodVsDifficultLabel')}</strong>
                                {goodDays.length > 0 && <> {t('coach.youHad')} <strong>{goodDays.length} {t(goodDays.length === 1 ? 'coach.goodDaysSingular' : 'coach.goodDaysPlural')}</strong> {t('coach.atMostUses', { n: goodThreshold })}{goodSleep && <><strong>{t('coach.withAvgSleep', { h: goodSleep })}</strong></>}{goodMood && <><strong>{t('coach.withMood', { n: goodMood })}</strong></>}.</>}
                                {difficultDays.length > 0 && <> {goodDays.length > 0 && t('coach.onTheOtherHand')} {t('coach.thereWere')} <strong className={('text-orange-400')}>{difficultDays.length} {t(difficultDays.length === 1 ? 'coach.difficultDaySingular' : 'coach.difficultDayPlural')}</strong> {t('coach.atLeastUses', { n: difficultThreshold })}{difficultSleep && <><strong>{t('coach.withAvgSleep', { h: difficultSleep })}</strong></>}{difficultMood && <><strong>{t('coach.withMood', { n: difficultMood })}</strong></>}.</>}
                                {goodSleep && difficultSleep && parseFloat(goodSleep) > parseFloat(difficultSleep) + 1 && (
                                    <> <span className={('text-cyan-400')}>{t('coach.sleepPatternInsight', { diff: (parseFloat(goodSleep) - parseFloat(difficultSleep)).toFixed(1) })}</span></>
                                )}
                                {goodMood && difficultMood && parseFloat(goodMood) > parseFloat(difficultMood) + 1.5 && (
                                    <> <span className={('text-purple-400')}>{t('coach.moodPatternInsight', { diff: (parseFloat(goodMood) - parseFloat(difficultMood)).toFixed(1) })}</span></>
                                )}
                            </p>
                        );
                    })()}

                    {/* NOVO: Paragraph Emoções */}
                    {(() => {
                        if (analysisWellbeing.length === 0) return null;

                        // Contar emoções por categoria
                        const allEmotions = analysisWellbeing.flatMap(w => w.emotions || []);
                        if (allEmotions.length === 0) return null;

                        const positiveCount = allEmotions.filter(e => getEmotionCategory(e) === 'positive').length;
                        const negativeCount = allEmotions.filter(e => getEmotionCategory(e) === 'negative').length;
                        const totalEmotions = positiveCount + negativeCount;
                        if (totalEmotions === 0) return null;

                        const positivePercent = Math.round((positiveCount / totalEmotions) * 100);

                        // Top 3 emoções
                        const emotionFreq = {};
                        allEmotions.forEach(e => { emotionFreq[e] = (emotionFreq[e] || 0) + 1; });
                        const topEmotions = Object.entries(emotionFreq)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([emotion]) => emotion);

                        // Determinar se é maioritariamente positivo ou negativo
                        const isPositive = positivePercent >= 50;
                        const balanceLabelKey = positivePercent >= 70 ? 'coach.balanceVeryPositive' : positivePercent >= 50 ? 'coach.balancePositive' : positivePercent >= 30 ? 'coach.balanceMixed' : 'coach.balanceChallenging';

                        return (
                            <p>
                                🌈 <strong className={('text-cyan-400')}>{t('coach.emotionalStateLabel')}</strong>{' '}{t('coach.emotionalBalance')} <strong className={(isPositive ? 'text-green-400' : 'text-orange-400')}>{t(balanceLabelKey)}</strong> {t('coach.pctPositiveEmotions', { pct: positivePercent })}
                                {topEmotions.length > 0 && <> {t('coach.mostFrequentEmotions')} <strong>{topEmotions.join(', ')}</strong>.</>}
                                {positivePercent >= 60 ? (
                                    <> <span className={('text-green-400')}>{t('coach.emotionalPositiveTip')}</span></>
                                ) : positivePercent < 40 ? (
                                    <> <span className={('text-purple-400')}>{t('coach.emotionalDifficultTip')}</span></>
                                ) : null}
                            </p>
                        );
                    })()}

                    {/* NOVO: Paragraph 3 - Dias da Semana */}
                    {(() => {
                        if (analysisConsumptions.length < 7) return null;

                        // Agrupar por dia da semana
                        const dayNames = Array.from({ length: 7 }, (_, i) =>
                            new Date(2024, 0, 7 + i).toLocaleDateString(i18n.language, { weekday: 'long' })
                        );
                        const byDayOfWeek = {};
                        for (let i = 0; i < 7; i++) byDayOfWeek[i] = [];

                        analysisConsumptions.forEach(c => {
                            const dayOfWeek = new Date(c.timestamp).getDay();
                            byDayOfWeek[dayOfWeek].push(c);
                        });

                        // Calcular médias (total consumos / número de ocorrências desse dia)
                        const avgByDay = {};
                        Object.keys(byDayOfWeek).forEach(day => {
                            const consumptions = byDayOfWeek[day];
                            if (consumptions.length === 0) {
                                avgByDay[day] = 0;
                                return;
                            }
                            // Contar quantos dias únicos
                            const uniqueDates = new Set(consumptions.map(c => c.date));
                            avgByDay[day] = consumptions.length / uniqueDates.size;
                        });

                        const sortedDays = Object.entries(avgByDay).sort((a, b) => b[1] - a[1]);
                        const worstDay = sortedDays[0];
                        const bestDay = sortedDays[sortedDays.length - 1];

                        // Só mostrar se diferença significativa
                        if (worstDay[1] - bestDay[1] < 2) return null;

                        return (
                            <p>
                                📅 <strong className={('text-indigo-400')}>{t('coach.weeklyPatternLabel')}</strong>{' '}
                                {t('coach.weeklyHardDays', { day: dayNames[worstDay[0]], avg: worstDay[1].toFixed(1), bestDay: dayNames[bestDay[0]], bestAvg: bestDay[1].toFixed(1) })}
                                {parseInt(worstDay[0]) >= 1 && parseInt(worstDay[0]) <= 5 ? (
                                    <> <span className={('text-yellow-400')}>{t('coach.weeklyWeekdayTip', { day: dayNames[worstDay[0]] })}</span></>
                                ) : (
                                    <> <span className={('text-cyan-400')}>{t('coach.weeklyWeekendTip')}</span></>
                                )}
                            </p>
                        );
                    })()}

                    {/* NOVO: Paragraph 3b - Primeiro Consumo → Escalada */}
                    {(() => {
                        if (analysisConsumptions.length < 10 || analysisCycles.length < 3) return null;

                        // Agrupar consumos por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = [];
                            consumptionsByDate[c.date].push(c);
                        });

                        // Calcular hora do primeiro consumo e total por dia
                        const firstConsData = {};
                        Object.entries(consumptionsByDate).forEach(([date, cons]) => {
                            const dayCycle = analysisCycles.find(cycle => safeToISODate(cycle.timestamp) === date);
                            const cycleTime = dayCycle ? new Date(dayCycle.timestamp).getTime() : 0;
                            const consumptionsAfterCycle = dayCycle ? cons.filter(c => new Date(c.timestamp).getTime() >= cycleTime) : cons;

                            if (consumptionsAfterCycle.length === 0) return;

                            const sortedCons = consumptionsAfterCycle.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                            const firstCons = sortedCons[0];
                            const hour = new Date(firstCons.timestamp).getHours();
                            firstConsData[date] = { firstHour: hour, total: cons.length };
                        });

                        const dataPoints = Object.values(firstConsData);
                        if (dataPoints.length < 5) return null;

                        // Dividir em dois grupos: primeiro consumo cedo (<10h) vs tarde (≥10h)
                        const earlyStarts = dataPoints.filter(d => d.firstHour < 10);
                        const lateStarts = dataPoints.filter(d => d.firstHour >= 10);

                        if (earlyStarts.length < 3 || lateStarts.length < 3) return null;

                        const avgEarlyTotal = earlyStarts.reduce((sum, d) => sum + d.total, 0) / earlyStarts.length;
                        const avgLateTotal = lateStarts.reduce((sum, d) => sum + d.total, 0) / lateStarts.length;

                        const percentDiff = ((avgEarlyTotal - avgLateTotal) / avgLateTotal * 100).toFixed(0);

                        // Só mostrar se diferença significativa (>20%)
                        if (Math.abs(percentDiff) < 20) return null;

                        return (
                            <p>
                                🌅 <strong className={('text-amber-400')}>{t('coach.escalationLabel')}</strong>{' '}
                                {percentDiff > 0
                                    ? t('coach.escalationHigher', { pct: Math.abs(percentDiff), early: avgEarlyTotal.toFixed(1), late: avgLateTotal.toFixed(1) })
                                    : t('coach.escalationLower', { pct: Math.abs(percentDiff), early: avgEarlyTotal.toFixed(1), late: avgLateTotal.toFixed(1) })}
                                {percentDiff > 0 ? (
                                    <> <span className={('text-yellow-400')}>{t('coach.escalationWarning')}</span></>
                                ) : (
                                    <> <span className={('text-cyan-400')}>{t('coach.escalationPositive')}</span></>
                                )}
                            </p>
                        );
                    })()}

                    {/* NOVO: Paragraph 3c - Streaks/Momentum */}
                    {(() => {
                        if (analysisConsumptions.length < 5) return null;

                        // Agrupar por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        const dailyCounts = Object.values(consumptionsByDate).sort((a, b) => a - b);
                        const median = dailyCounts[Math.floor(dailyCounts.length / 2)];

                        // Ordenar por data
                        const sortedDates = Object.keys(consumptionsByDate).sort();
                        let maxStreak = 0, currentStreak = 0, maxStreakEnd = null, isCurrentStreakActive = false;

                        sortedDates.forEach((date, idx) => {
                            if (consumptionsByDate[date] <= median) {
                                currentStreak++;
                                if (currentStreak > maxStreak) {
                                    maxStreak = currentStreak;
                                    maxStreakEnd = date;
                                }
                                if (idx === sortedDates.length - 1) isCurrentStreakActive = true;
                            } else {
                                currentStreak = 0;
                                isCurrentStreakActive = false;
                            }
                        });

                        if (maxStreak < 2) return null;

                        return (
                            <p>
                                🔥 <strong className={('text-orange-400')}>{t('coach.momentumLabel')}</strong>{' '}
                                {t('coach.momentumRecord', { n: maxStreak, label: t(maxStreak === 1 ? 'coach.day_singular' : 'coach.day_plural'), median })}
                                {isCurrentStreakActive && maxStreak === currentStreak ? (
                                    <> <span className={'font-medium ' + ('text-green-400')}>{t('coach.momentumActiveStreak')}</span></>
                                ) : maxStreakEnd ? (
                                    <> {t('coach.momentumPastStreak', { date: new Date(maxStreakEnd).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }) })}</>
                                ) : null}
                            </p>
                        );
                    })()}

                    {/* NOVO: Paragraph 4 - Janelas de Vulnerabilidade */}
                    {(() => {
                        if (analysisConsumptions.length < 10) return null;

                        // Calcular consumos por hora
                        const byHour = {};
                        for (let h = 0; h < 24; h++) byHour[h] = 0;

                        analysisConsumptions.forEach(c => {
                            const hour = new Date(c.timestamp).getHours();
                            byHour[hour]++;
                        });

                        // Detectar janelas de 4h com maior concentração
                        let maxWindowCount = 0, maxWindowStart = 0;
                        for (let start = 0; start < 24; start++) {
                            let windowCount = 0;
                            for (let i = 0; i < 4; i++) {
                                windowCount += byHour[(start + i) % 24];
                            }
                            if (windowCount > maxWindowCount) {
                                maxWindowCount = windowCount;
                                maxWindowStart = start;
                            }
                        }

                        const concentrationPercent = Math.round((maxWindowCount / analysisConsumptions.length) * 100);

                        // Só mostrar se concentração >= 50%
                        if (concentrationPercent < 50) return null;

                        const formatWindow = (start) => {
                            const end = (start + 4) % 24;
                            return `${String(start).padStart(2, '0')}h-${String(end).padStart(2, '0')}h`;
                        };

                        // Categorizar janela
                        let windowTypeKey = '';
                        if (maxWindowStart >= 22 || maxWindowStart <= 2) windowTypeKey = 'coach.windowNight';
                        else if (maxWindowStart >= 6 && maxWindowStart <= 11) windowTypeKey = 'coach.windowMorning';
                        else if (maxWindowStart >= 12 && maxWindowStart <= 17) windowTypeKey = 'coach.windowAfternoon';
                        else windowTypeKey = 'coach.windowEveningNight';

                        return (
                            <p>
                                ⏰ <strong className={('text-red-400')}>{t('coach.vulnerabilityLabel')}</strong>{' '}
                                {t('coach.vulnerabilityText', { pct: concentrationPercent, window: formatWindow(maxWindowStart), type: t(windowTypeKey) })}
                                {concentrationPercent >= 70 ? (
                                    <> <span className={('text-yellow-400')}>{t('coach.vulnerabilityHighWarning')}</span></>
                                ) : (
                                    <> <span className={('text-cyan-400')}>{t('coach.vulnerabilityTip')}</span></>
                                )}
                            </p>
                        );
                    })()}

                    {/* NOVO: Paragraph 5 - Cascata de Consumo */}
                    {(() => {
                        if (analysisConsumptions.length < 15) return null;

                        // Agrupar por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        // Ordenar por data
                        const sortedDates = Object.keys(consumptionsByDate).sort();

                        // Detectar cascatas: dia difícil (≥threshold) seguido de mais dias difíceis
                        let cascadeEvents = 0, longestCascade = 0, currentCascade = 0;

                        sortedDates.forEach((date, idx) => {
                            if (consumptionsByDate[date] >= difficultThreshold) {
                                currentCascade++;
                                if (currentCascade > longestCascade) longestCascade = currentCascade;
                                if (currentCascade === 2) cascadeEvents++; // Conta quando começa cascata (2º dia)
                            } else {
                                currentCascade = 0;
                            }
                        });

                        if (cascadeEvents === 0 && longestCascade < 2) return null;

                        return (
                            <p>
                                🌊 <strong className={('text-purple-400')}>{t('coach.cascadeLabel')}</strong>
                                {longestCascade >= 2 ? (
                                    <> {t('coach.cascadeDetected', { n: cascadeEvents, label: t(cascadeEvents === 1 ? 'coach.episode_singular' : 'coach.episode_plural'), longest: longestCascade })}
                                    {longestCascade >= 3 ? (
                                        <> <span className={('text-red-400')}>{t('coach.cascadeLongWarning')}</span></>
                                    ) : (
                                        <> <span className={('text-yellow-400')}>{t('coach.cascadeShortTip')}</span></>
                                    )}</>
                                ) : (
                                    <> {t('coach.cascadeNone')}</>
                                )}
                            </p>
                        );
                    })()}

                    {/* NOVO: Paragraph 6 - Perfil de Recuperação */}
                    {(() => {
                        if (analysisConsumptions.length < 20) return null;

                        // Agrupar por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        const dailyCounts = Object.values(consumptionsByDate);
                        const avgDaily = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;

                        // Ordenar por data
                        const sortedDates = Object.keys(consumptionsByDate).sort();

                        // Detectar recuperações: dias após dia difícil (≥threshold)
                        const recoveryTimes = [];
                        let stillRecoveringDays = 0; // Contador de dias difíceis ainda sem recuperação
                        sortedDates.forEach((date, idx) => {
                            if (consumptionsByDate[date] >= difficultThreshold && idx < sortedDates.length - 1) {
                                // Procurar quando volta à média
                                let recovered = false;
                                for (let j = idx + 1; j < sortedDates.length; j++) {
                                    if (consumptionsByDate[sortedDates[j]] <= avgDaily) {
                                        recoveryTimes.push(j - idx);
                                        recovered = true;
                                        break;
                                    }
                                    // Limite de 7 dias
                                    if (j - idx >= 7) break;
                                }
                                // Se não recuperou nos últimos 7 dias ou ainda está a decorrer
                                if (!recovered) stillRecoveringDays++;
                            }
                        });

                        if (recoveryTimes.length === 0 && stillRecoveringDays === 0) return null;

                        const avgRecovery = recoveryTimes.length > 0 ? (recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length).toFixed(1) : null;

                        return (
                            <p>
                                🔄 <strong className={('text-teal-400')}>{t('coach.recoveryLabel')}</strong>
                                {avgRecovery ? (
                                    <> {t(parseFloat(avgRecovery) === 1 ? 'coach.recoveryAvgSingular' : 'coach.recoveryAvgPlural', { n: avgRecovery })}
                                    {parseFloat(avgRecovery) <= 1.5 ? (
                                        <> <span className={('text-green-400')}>{t('coach.recoveryFast')}</span></>
                                    ) : parseFloat(avgRecovery) <= 3 ? (
                                        <> <span className={('text-yellow-400')}>{t('coach.recoveryModerate')}</span></>
                                    ) : (
                                        <> <span className={('text-orange-400')}>{t('coach.recoverySlow')}</span></>
                                    )}</>
                                ) : null}
                                {stillRecoveringDays > 0 && (
                                    <> <span className={('text-yellow-400')}>{t(stillRecoveringDays === 1 ? 'coach.recoveryStillSingular' : 'coach.recoveryStillPlural', { n: stillRecoveringDays })}</span></>
                                )}
                            </p>
                        );
                    })()}

                    {/* NOVO: Outliers - Dias mais altos */}
                    {(() => {
                        if (analysisConsumptions.length < 5) return null;

                        // Agrupar por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        const dailyCounts = Object.entries(consumptionsByDate).map(([date, count]) => ({date, count}));
                        const avgDaily = dailyCounts.reduce((sum, d) => sum + d.count, 0) / dailyCounts.length;

                        // Top 3 dias mais altos
                        const topDays = dailyCounts.sort((a, b) => b.count - a.count).slice(0, 3);

                        if (topDays.length === 0 || topDays[0].count < avgDaily + 2) return null;

                        const top1 = topDays[0];
                        const diffFromAvg = (top1.count - avgDaily).toFixed(0);

                        // Buscar emoções/wellbeing do dia top 1 outlier
                        const top1Wellbeing = analysisWellbeing.find(w => (w.date || safeToISODate(w.timestamp)) === top1.date);
                        const top1Emotions = top1Wellbeing?.emotions || [];
                        const top1Mood = top1Wellbeing?.mood ? parseInt(top1Wellbeing.mood) : null;

                        // Buscar reflexões/notes desse dia
                        const top1Reflection = analysisReflections.find(r => (r.date || safeToISODate(r.timestamp)) === top1.date);
                        const top1Note = top1Reflection?.answer || null;

                        return (
                            <p>
                                📍 <strong className={('text-orange-400')}>{t('coach.outliersLabel')}</strong>{' '}
                                {topDays.length === 1
                                    ? t('coach.outliersTopDay', { date: new Date(top1.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }), n: top1.count, diff: diffFromAvg, avg: avgDaily.toFixed(1) })
                                    : t('coach.outliersTopDayN', { date: new Date(top1.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }), n: top1.count, diff: diffFromAvg, avg: avgDaily.toFixed(1), k: topDays.length })}
                                {top1Emotions.length > 0 && (
                                    <> <strong className={('text-purple-400')}>{top1Emotions.join(', ')}</strong>{top1Mood && <> ({top1Mood}/10)</>}.</>
                                )}
                                {topDays.length > 1 && (
                                    <> {t('coach.outliersOtherPeaks')} {topDays.slice(1).map((d, i) => (
                                        <span key={d.date}>
                                            {i > 0 && ', '}
                                            {new Date(d.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })} ({d.count})
                                        </span>
                                    ))}.</>
                                )}
                                <> <span className={('text-cyan-400')}>{top1Emotions.length > 0 ? t('coach.outliersNoteEmotion', { emotion: top1Emotions[0] }) : t('coach.outliersNoteQuestion')}</span></>
                            </p>
                        );
                    })()}

                    {/* NOVO: Clusters de Comportamento */}
                    {(() => {
                        if (analysisConsumptions.length < 10 || analysisCycles.length < 5) return null;

                        // Agrupar dados por dia
                        const dailyData = {};
                        analysisConsumptions.forEach(c => {
                            if (!dailyData[c.date]) dailyData[c.date] = { consumos: 0, sono: null, humor: null };
                            dailyData[c.date].consumos++;
                        });

                        analysisCycles.forEach(cycle => {
                            const cDate = cycle.date || new Date(cycle.timestamp).toISOString().split('T')[0];
                            if (dailyData[cDate] && cycle.sleep) {
                                dailyData[cDate].sono = parseFloat(cycle.sleep);
                            }
                        });

                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (wDate && dailyData[wDate] && w.mood) {
                                dailyData[wDate].humor = parseInt(w.mood);
                            }
                        });

                        // Calcular percentis dos TEUS dados (não fixos!)
                        const consumoCounts = Object.values(dailyData).map(d => d.consumos).sort((a, b) => a - b);
                        const p25 = consumoCounts[Math.floor(consumoCounts.length * 0.25)]; // Bottom 25%
                        const p50 = consumoCounts[Math.floor(consumoCounts.length * 0.50)]; // Mediana
                        const p75 = consumoCounts[Math.floor(consumoCounts.length * 0.75)]; // Top 25%

                        // Definir clusters baseados nos TEUS padrões
                        const clusters = {
                            altaPressao: [], // Top 25% consumo + <6h sono + humor ≥5
                            paradoxo: [],    // Bottom 25% consumo + ≥7h sono + humor <5
                            equilibrio: []   // Consumo na mediana + humor ≥6
                        };

                        Object.entries(dailyData).forEach(([date, d]) => {
                            if (d.consumos >= p75 && d.sono !== null && d.sono < 6 && d.humor !== null && d.humor >= 5) {
                                clusters.altaPressao.push(date);
                            } else if (d.consumos <= p25 && d.sono !== null && d.sono >= 7 && d.humor !== null && d.humor < 5) {
                                clusters.paradoxo.push(date);
                            } else if (d.consumos >= p50 * 0.8 && d.consumos <= p50 * 1.2 && d.humor !== null && d.humor >= 6) {
                                clusters.equilibrio.push(date);
                            }
                        });

                        const hasAnyClusters = clusters.altaPressao.length > 0 || clusters.paradoxo.length > 0 || clusters.equilibrio.length > 0;
                        if (!hasAnyClusters) return null;

                        return (
                            <p>
                                🔬 <strong className={('text-indigo-400')}>{t('coach.clustersLabel')}</strong>
                                {clusters.altaPressao.length > 0 && (
                                    <> <strong className={('text-red-400')}>{t('coach.clustersHighPressure', { n: clusters.altaPressao.length })}</strong></>
                                )}
                                {clusters.paradoxo.length > 0 && (
                                    <> <strong className={('text-yellow-400')}>{t('coach.clustersParadox', { n: clusters.paradoxo.length })}</strong></>
                                )}
                                {clusters.equilibrio.length > 0 && (
                                    <> <strong className={('text-green-400')}>{t('coach.clustersBalance', { n: clusters.equilibrio.length })}</strong></>
                                )}
                            </p>
                        );
                    })()}

                    {/* NOVO: Micro-comparações temporais */}
                    {(() => {
                        if (analysisConsumptions.length < 14) return null;

                        const now = new Date();
                        const last7Days = analysisConsumptions.filter(c => {
                            const cDate = new Date(c.timestamp);
                            const diffDays = (now - cDate) / (1000 * 60 * 60 * 24);
                            return diffDays <= 7;
                        });

                        const previous21Days = analysisConsumptions.filter(c => {
                            const cDate = new Date(c.timestamp);
                            const diffDays = (now - cDate) / (1000 * 60 * 60 * 24);
                            return diffDays > 7 && diffDays <= 28;
                        });

                        if (last7Days.length < 3 || previous21Days.length < 10) return null;

                        // Agrupar por dia
                        const last7ByDate = {};
                        last7Days.forEach(c => {
                            if (!last7ByDate[c.date]) last7ByDate[c.date] = 0;
                            last7ByDate[c.date]++;
                        });

                        const prev21ByDate = {};
                        previous21Days.forEach(c => {
                            if (!prev21ByDate[c.date]) prev21ByDate[c.date] = 0;
                            prev21ByDate[c.date]++;
                        });

                        const avgLast7 = Object.values(last7ByDate).reduce((a, b) => a + b, 0) / Object.keys(last7ByDate).length;
                        const avgPrev21 = Object.values(prev21ByDate).reduce((a, b) => a + b, 0) / Object.keys(prev21ByDate).length;

                        const percentChange = ((avgLast7 - avgPrev21) / avgPrev21 * 100).toFixed(0);

                        if (Math.abs(percentChange) < 5) return null;

                        return (
                            <p>
                                📈 <strong className={('text-blue-400')}>{t('coach.microTrendLabel')}</strong>{' '}
                                {t('coach.microTrendText', { last7: avgLast7.toFixed(1), prev21: avgPrev21.toFixed(1), pct: `${percentChange > 0 ? '+' : ''}${percentChange}` })}
                                {percentChange > 15 ? (
                                    <> <span className={('text-orange-400')}>{t('coach.microTrendIncrease')}</span></>
                                ) : percentChange < -15 ? (
                                    <> <span className={('text-green-400')}>{t('coach.microTrendDecrease')}</span></>
                                ) : percentChange > 0 ? (
                                    <> {t('coach.microTrendSlightIncrease')}</>
                                ) : (
                                    <> {t('coach.microTrendSlightDecrease')}</>
                                )}
                            </p>
                        );
                    })()}

                    {/* NOVO: Narrativas Dinâmicas - Emoções específicas */}
                    {(() => {
                        if (analysisWellbeing.length < 5) return null;

                        // Análise por emoção específica
                        const emotionImpact = {};
                        const consumptionsByDate = {};

                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (!wDate || !w.emotions || w.emotions.length === 0) return;

                            const dayConsumptions = consumptionsByDate[wDate] || 0;

                            w.emotions.forEach(emotion => {
                                if (!emotionImpact[emotion]) emotionImpact[emotion] = { days: 0, totalCons: 0 };
                                emotionImpact[emotion].days++;
                                emotionImpact[emotion].totalCons += dayConsumptions;
                            });
                        });

                        const avgDaily = Object.values(consumptionsByDate).reduce((a, b) => a + b, 0) / Object.keys(consumptionsByDate).length;

                        // Encontrar emoções com impacto claro
                        const emotionsWithAvg = Object.entries(emotionImpact)
                            .filter(([_, data]) => data.days >= 2)
                            .map(([emotion, data]) => ({
                                emotion,
                                avg: data.totalCons / data.days,
                                days: data.days,
                                diff: (data.totalCons / data.days) - avgDaily
                            }))
                            .filter(e => Math.abs(e.diff) >= 2);

                        if (emotionsWithAvg.length === 0) return null;

                        // Top risco e top protetor
                        const topRisk = emotionsWithAvg.sort((a, b) => b.diff - a.diff)[0];
                        const topProtector = emotionsWithAvg.sort((a, b) => a.diff - b.diff)[0];

                        return (
                            <p>
                                🎭 <strong className={('text-pink-400')}>{t('coach.emotionalTriggersLabel')}</strong>
                                {topRisk && topRisk.diff > 0 && (
                                    <> {t('coach.emotionalTriggersRisk', { emotion: topRisk.emotion, diff: topRisk.diff.toFixed(1), n: topRisk.days })}</>
                                )}
                                {topProtector && topProtector.diff < 0 && (
                                    <> {t('coach.emotionalTriggersProtector', { emotion: topProtector.emotion, diff: Math.abs(topProtector.diff).toFixed(1) })}</>
                                )}
                            </p>
                        );
                    })()}

                    {/* NOVO: Contexto Autocuidado (água, comida, social) */}
                    {(() => {
                        if (analysisWellbeing.length < 5) return null;

                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        const avgDaily = Object.values(consumptionsByDate).reduce((a, b) => a + b, 0) / Object.keys(consumptionsByDate).length;

                        // Analisar impacto de cada área
                        const areas = { water: [], food: [], social: [] };

                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (!wDate) return;

                            const dayCons = consumptionsByDate[wDate] || 0;

                            if (w.water === true || (w.waterGlasses > 0)) areas.water.push(dayCons);
                            if (w.food === true) areas.food.push(dayCons);
                            if (w.social === true) areas.social.push(dayCons);
                        });

                        const impacts = [];
                        const areaNames = { water: t('coach.selfCareContextWater'), food: t('coach.selfCareContextFood'), social: t('coach.selfCareContextSocial') };

                        Object.entries(areas).forEach(([area, values]) => {
                            if (values.length < 3) return;

                            const avgWith = values.reduce((a, b) => a + b, 0) / values.length;
                            const percentDiff = ((avgWith - avgDaily) / avgDaily * 100).toFixed(0);

                            if (Math.abs(percentDiff) >= 10) {
                                impacts.push({ area, percentDiff: parseFloat(percentDiff), days: values.length });
                            }
                        });

                        if (impacts.length === 0) return null;

                        // Ordenar por impacto
                        impacts.sort((a, b) => a.percentDiff - b.percentDiff);
                        const topImpact = impacts[0];

                        return (
                            <p>
                                💧 <strong className={('text-teal-400')}>{t('coach.selfCareContextLabel')}</strong>
                                {topImpact.percentDiff < 0 ? (
                                    <> {t('coach.selfCareContextPositive', { area: areaNames[topImpact.area], pct: Math.abs(topImpact.percentDiff), n: topImpact.days })}</>
                                ) : (
                                    <> {t('coach.selfCareContextNegative', { area: areaNames[topImpact.area], pct: topImpact.percentDiff })}</>
                                )}
                                {impacts.length > 1 && impacts[1].percentDiff < 0 && (
                                    <> {t('coach.selfCareContextAlso', { area: areaNames[impacts[1].area], pct: Math.abs(impacts[1].percentDiff) })}</>
                                )}
                                <> <span className={('text-gray-400')}>{t('coach.selfCareContextNote')}</span></>
                            </p>
                        );
                    })()}

                    {/* NOVO: Trigger Mapping "Se isto então aquilo" */}
                    {(() => {
                        if (analysisConsumptions.length < 10 || analysisCycles.length < 5) return null;

                        // 1. Consumos tardios (00h-06h) vs sono
                        const lateConsumptions = analysisConsumptions.filter(c => {
                            const hour = new Date(c.timestamp).getHours();
                            return hour >= 0 && hour < 6;
                        });

                        if (lateConsumptions.length >= 5) {
                            // Verificar sono nesses dias
                            const lateDates = new Set(lateConsumptions.map(c => c.date));
                            const cyclesWithLate = analysisCycles.filter(cycle => {
                                const cDate = cycle.date || new Date(cycle.timestamp).toISOString().split('T')[0];
                                return lateDates.has(cDate) && cycle.sleep;
                            });

                            const lowSleepCount = cyclesWithLate.filter(c => parseFloat(c.sleep) < 6).length;
                            const percentLowSleep = cyclesWithLate.length > 0 ? (lowSleepCount / cyclesWithLate.length * 100).toFixed(0) : 0;

                            if (percentLowSleep >= 60) {
                                return (
                                    <p>
                                        🔗 <strong className={('text-red-400')}>{t('coach.triggerMappingLabel')}</strong>{' '}
                                        {t('coach.triggerMappingLate', { pct: percentLowSleep })}
                                    </p>
                                );
                            }
                        }

                        // 2. Dias com alta frequência (≥threshold) vs triggers específicos
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        const highFreqDates = Object.entries(consumptionsByDate)
                            .filter(([_, count]) => count >= difficultThreshold)
                            .map(([date, _]) => date);

                        if (highFreqDates.length >= 3 && analysisWellbeing.length >= 5) {
                            // Verificar emoções comuns nesses dias (contar DIAS únicos, não ocorrências)
                            const emotionDaysCount = {};

                            analysisWellbeing.forEach(w => {
                                const wDate = w.date || safeToISODate(w.timestamp);
                                if (!wDate || !highFreqDates.includes(wDate) || !w.emotions) return;

                                // Usar Set para contar cada emoção apenas uma vez por dia
                                const uniqueEmotions = new Set(w.emotions);
                                uniqueEmotions.forEach(emotion => {
                                    if (!emotionDaysCount[emotion]) emotionDaysCount[emotion] = new Set();
                                    emotionDaysCount[emotion].add(wDate);
                                });
                            });

                            // Converter Sets para contagens
                            const emotionCounts = {};
                            Object.entries(emotionDaysCount).forEach(([emotion, datesSet]) => {
                                emotionCounts[emotion] = datesSet.size;
                            });

                            const sortedEmotions = Object.entries(emotionCounts)
                                .sort((a, b) => b[1] - a[1]);

                            if (sortedEmotions.length > 0 && sortedEmotions[0][1] >= 2) {
                                const topEmotion = sortedEmotions[0];
                                const daysWithEmotion = topEmotion[1];
                                const percent = (daysWithEmotion / highFreqDates.length * 100).toFixed(0);

                                if (percent >= 50) {
                                    return (
                                        <p>
                                            🔗 <strong className={('text-red-400')}>{t('coach.triggerMappingLabel')}</strong>{' '}
                                            {t('coach.triggerMappingHighFreq', { pct: percent, threshold: difficultThreshold, emotion: topEmotion[0] })}
                                        </p>
                                    );
                                }
                            }
                        }

                        return null;
                    })()}

                    {/* NOVO: Feedback Emocional Menos Binário */}
                    {(() => {
                        if (analysisWellbeing.length < 10) return null;

                        // Agrupar emoções por tipo
                        const emotionTypes = {
                            ansiedade: ['😰 Ansioso/a', '😓 Stressado/a', '😩 Overwhelmed'],
                            frustração: ['😫 Frustrado/a', '😤 Irritado/a', '😕 Confuso/a'],
                            tristeza: ['😢 Triste', '😔 Inseguro/a', '🥺 Solitário/a'],
                            apatia: ['😞 Apático/a', '🔌 Desconectado/a', '😐 Ambivalente'],
                            energia: ['💪 Motivado/a', '⚡ Okay', '🌟 Produtiva/o'],
                            positivas: ['😊 Feliz', '🎉 Entusiasmado/a', '🌈 Otimista', '😌 Calmo/a']
                        };

                        const typeCounts = {};
                        const moodValues = [];

                        analysisWellbeing.forEach(w => {
                            if (w.emotions && w.emotions.length > 0) {
                                w.emotions.forEach(emotion => {
                                    Object.entries(emotionTypes).forEach(([type, list]) => {
                                        if (list.includes(emotion)) {
                                            if (!typeCounts[type]) typeCounts[type] = 0;
                                            typeCounts[type]++;
                                        }
                                    });
                                });
                            }
                            if (w.mood) moodValues.push(parseInt(w.mood));
                        });

                        if (Object.keys(typeCounts).length === 0 || moodValues.length < 5) return null;

                        // Calcular oscilação de humor (intensidade)
                        const avgMood = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;
                        const variance = moodValues.reduce((sum, val) => sum + Math.pow(val - avgMood, 2), 0) / moodValues.length;
                        const stdDev = Math.sqrt(variance).toFixed(1);

                        // Diversidade emocional (quantos tipos diferentes)
                        const numTypes = Object.keys(typeCounts).length;

                        const oscillationLevel = parseFloat(stdDev) > 2.5 ? t('coach.emotionalOscillationHigh') : parseFloat(stdDev) > 1.5 ? t('coach.emotionalOscillationModerate') : t('coach.emotionalOscillationLow');
                        const emotionalDiversity = numTypes >= 4 ? t('coach.emotionalDiversityHigh') : numTypes >= 2 ? t('coach.emotionalDiversityModerate') : t('coach.emotionalDiversityLow');

                        // Tipo emocional dominante
                        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
                        const dominantType = sortedTypes[0];

                        return (
                            <p>
                                🧠 <strong className={('text-purple-400')}>{t('coach.emotionalProfileLabel')}</strong>{' '}
                                {t('coach.emotionalProfileText', { level: emotionalDiversity, n: numTypes })}{' '}
                                {dominantType && <>{t('coach.emotionalProfileDominant', { type: dominantType[0], n: dominantType[1] })}{' '}</>}
                                {oscillationLevel === t('coach.emotionalOscillationHigh') ? t('coach.emotionalProfileOscillationHigh') : oscillationLevel === t('coach.emotionalOscillationModerate') ? t('coach.emotionalProfileOscillationMod') : t('coach.emotionalProfileOscillationLow')}
                            </p>
                        );
                    })()}

                    {/* Paragraph 7: Emotional Tone & Encouragement (ANÁLISE AVANÇADA) */}
                    <p>
                        {allNotes.length > 0 ? (
                            <>
                                📝 <strong className={('text-purple-400')}>{t('coach.notesLabel', { n: sentimentAnalysis.noteCount })}</strong>
                                {(() => {
                                    // Calcular sentimento com base na DISTRIBUIÇÃO em vez da média
                                    const dist = sentimentAnalysis.distribution;
                                    const total = sentimentAnalysis.noteCount;
                                    const positivePercent = Math.round(((dist.very_positive + dist.positive) / total) * 100);
                                    const negativePercent = Math.round(((dist.very_negative + dist.negative) / total) * 100);
                                    const neutralPercent = Math.round((dist.neutral / total) * 100);

                                    // Classificar com base na distribuição
                                    let realOverall = 'neutral';
                                    if (positivePercent >= 60) realOverall = 'positive';
                                    else if (positivePercent >= 40 && positivePercent > negativePercent) realOverall = 'positive';
                                    else if (negativePercent >= 60) realOverall = 'negative';
                                    else if (negativePercent >= 40 && negativePercent > positivePercent) realOverall = 'negative';

                                    // Correlação com consumo
                                    const consumptionsByDate = {};
                                    analysisConsumptions.forEach(c => {
                                        if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                                        consumptionsByDate[c.date]++;
                                    });

                                    const reflectionsByDate = {};
                                    allNotes.forEach(note => {
                                        const noteDate = note.date || (note.timestamp ? new Date(note.timestamp).toLocaleDateString('pt-PT') : null);
                                        if (noteDate) {
                                            if (!reflectionsByDate[noteDate]) reflectionsByDate[noteDate] = [];
                                            reflectionsByDate[noteDate].push(note);
                                        }
                                    });

                                    // Encontrar dias com muitas reflexões negativas vs consumo
                                    let highNegDays = 0, highNegHighCons = 0;
                                    Object.entries(reflectionsByDate).forEach(([date, notes]) => {
                                        const negCount = notes.filter(n => {
                                            const text = n.text || n.content || n.note || '';
                                            if (!text) return false;
                                            const sentiment = analyzeNote ? analyzeNote(text) : null;
                                            if (!sentiment) return false;
                                            return sentiment.overall === 'negative' || sentiment.overall === 'very_negative';
                                        }).length;
                                        if (negCount >= notes.length * 0.6 && notes.length >= 2) {
                                            highNegDays++;
                                            if (consumptionsByDate[date] && consumptionsByDate[date] > avgPerDay) {
                                                highNegHighCons++;
                                            }
                                        }
                                    });

                                    return (
                                        <>
                                            <br/>
                                            🔍 <strong className={('text-indigo-300')}>{t('coach.notesPatternsLabel')}</strong>
                                            {realOverall === 'positive' ? (
                                                <> {t('coach.notesPositiveTone', { positivePct: positivePercent, negativePct: negativePercent })}</>
                                            ) : realOverall === 'negative' ? (
                                                <> {t('coach.notesNegativeTone', { negativePct: negativePercent, positivePct: positivePercent })}</>
                                            ) : (
                                                <> {t('coach.notesBalancedTone', { positivePct: positivePercent, negativePct: negativePercent, neutralPct: neutralPercent })}</>
                                            )}
                                            {sentimentAnalysis.trend === 'improving' && <span className={'font-medium ' + ('text-green-400')}>{t('coach.notesTrendImproving')}</span>}
                                            {sentimentAnalysis.trend === 'worsening' && <span className={('text-yellow-400')}>{t('coach.notesTrendWorsening')}</span>}
                                            {highNegDays > 0 && highNegHighCons / highNegDays > 0.6 && (
                                                <> <strong className={('text-orange-300')}>{t('coach.notesHighNegPattern', { n: highNegHighCons, total: highNegDays })}</strong></>
                                            )}
                                        </>
                                    );
                                })()}
                                <br/>
                                💭 <strong className={('text-purple-300')}>{t('coach.notesThemesLabel')}</strong>
                                {(() => {
                                    const topThemes = Object.entries(sentimentThemes)
                                        .filter(([_, data]) => data.count > 2)
                                        .sort((a, b) => b[1].count - a[1].count)
                                        .slice(0, 3);
                                    const themeNames = {
                                        sleep: t('coach.notesThemeSleep'),
                                        stress: t('coach.notesThemeStress'),
                                        energy: t('coach.notesThemeEnergy'),
                                        mood: t('coach.notesThemeMood'),
                                        focus: t('coach.notesThemeFocus'),
                                        social: t('coach.notesThemeSocial'),
                                        health: t('coach.notesThemeHealth')
                                    };
                                    if (topThemes.length > 0) {
                                        return (
                                            <>
                                                {topThemes.map(([theme, data], idx) => {
                                                    const avgSent = data.avgSentiment || 0;
                                                    const sentColor = avgSent > 0.3 ? ('text-green-400') : avgSent < -0.3 ? ('text-red-400') : ('text-gray-400');
                                                    return (
                                                        <span key={theme}>
                                                            {idx > 0 && ', '}
                                                            <strong className={sentColor}>{themeNames[theme]}</strong> ({data.count}x{avgSent > 0.3 ? '✓' : avgSent < -0.3 ? '⚠' : ''})
                                                        </span>
                                                    );
                                                })}
                                                .
                                                {sentimentThemes.stress && sentimentThemes.stress.avgSentiment < -0.3 && <> {t('coach.notesStressNote')}</>}
                                                {sentimentThemes.sleep && sentimentThemes.sleep.avgSentiment < -0.3 && <> {t('coach.notesSleepNote')}</>}
                                            </>
                                        );
                                    }
                                    return <> {t('coach.notesNoThemes')}</>;
                                })()}
                            </>
                        ) : (
                            <> {t('coach.notesEncourage')} </>
                        )}
                    </p>

                    {/* NOVO: Reflexão Final Realista */}
                    {(() => {
                        if (totalConsumptions === 0) return null;

                        // Calcular dados-chave
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        const dailyCounts = Object.values(consumptionsByDate);

                        // Usar threshold global já definido (baseado em meta)
                        const goodThreshold = frequencyGoal ? Math.max(1, frequencyGoal.target - 1) : 7;
                        // difficultThreshold já definido globalmente no início (linha ~161)

                        const goodDays = dailyCounts.filter(c => c <= goodThreshold).length;
                        const difficultDays = dailyCounts.filter(c => c >= difficultThreshold).length;

                        // Verificar se há melhoria ou esforço
                        let hasEffort = false;
                        if (goodDays > 0 || avgPerDay < 12) hasEffort = true;

                        // Verificar limites
                        let hasLimits = false;
                        if (difficultDays >= dailyCounts.length * 0.3 || avgPerDay > 10) hasLimits = true;

                        // Áreas para optimizar
                        const optimizationAreas = [];

                        if (difficultDays > 0) optimizationAreas.push(t('coach.optFrequency', { n: difficultThreshold }));

                        if (analysisCycles.length > 0) {
                            const avgSleep = analysisCycles
                                .filter(c => c.sleep)
                                .reduce((sum, c) => sum + parseFloat(c.sleep), 0) / analysisCycles.filter(c => c.sleep).length;
                            if (avgSleep < 7) optimizationAreas.push(t('coach.optSleep'));
                        }

                        if (analysisWellbeing.length > 0) {
                            const avgMood = analysisWellbeing
                                .filter(w => w.mood)
                                .reduce((sum, w) => sum + parseInt(w.mood), 0) / analysisWellbeing.filter(w => w.mood).length;
                            if (avgMood < 6) optimizationAreas.push(t('coach.optEmotion'));
                        }

                        const lateConsumptions = analysisConsumptions.filter(c => {
                            const hour = new Date(c.timestamp).getHours();
                            return hour >= 0 && hour < 6;
                        });
                        if (lateConsumptions.length / analysisConsumptions.length > 0.2) {
                            optimizationAreas.push(t('coach.optTiming'));
                        }

                        // Calcular intervalos
                        const intervals = [];
                        Object.values(consumptionsByDate).forEach((_, date) => {
                            const dayConsumptions = analysisConsumptions
                                .filter(c => c.date === Object.keys(consumptionsByDate)[date])
                                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                            for (let i = 1; i < dayConsumptions.length; i++) {
                                const diff = (new Date(dayConsumptions[i].timestamp) - new Date(dayConsumptions[i-1].timestamp)) / (1000 * 60 * 60);
                                intervals.push(diff);
                            }
                        });

                        if (intervals.length > 0) {
                            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                            if (avgInterval < 2.5) optimizationAreas.push(t('coach.optSpacing'));
                        }

                        return (
                            <p className={('bg-gray-800/50 border-gray-700') + ' p-4 rounded-lg border'}>
                                💭 <strong className={('text-cyan-400')}>{t('coach.synthesisLabel')}</strong>
                                {hasEffort && hasLimits ? (
                                    <> {t('coach.synthesisEffortAndLimits', { goodDays, difficultDays })}</>
                                ) : hasEffort ? (
                                    <> {t('coach.synthesisEffort', { avg: avgPerDay })}</>
                                ) : hasLimits ? (
                                    <> {t('coach.synthesisLimits', { avg: avgPerDay, difficultDays, threshold: difficultThreshold })}</>
                                ) : (
                                    <> {t('coach.synthesisBuilding')}</>
                                )}
                                {optimizationAreas.length > 0 && (
                                    <> <strong className={('text-orange-300')}>{t('coach.synthesisOptimiseQuestion')}</strong>{' '}
                                    {optimizationAreas.length === 1 ? (
                                        t('coach.synthesisFocusOne', { area: optimizationAreas[0] })
                                    ) : optimizationAreas.length === 2 ? (
                                        t('coach.synthesisFocusTwo', { area1: optimizationAreas[0], area2: optimizationAreas[1] })
                                    ) : (
                                        t('coach.synthesisFocusMany', { areas: optimizationAreas.slice(0, 3).join(', ') })
                                    )}</>
                                )}
                                {!hasEffort && !hasLimits && <> {t('coach.synthesisKeepRecording')}</>}
                            </p>
                        );
                    })()}

                    {/* Paragraph 8: Bedtime & Sleep Patterns */}
                    {(() => {
                        // Nota: Qualquer hora é válida para deitar
                        const cyclesWithValidBedtime = analysisCycles.filter(c => {
                            return c.bedtime; // Aceitar qualquer hora
                        });

                        if (cyclesWithValidBedtime.length === 0) return null;

                        const getBedtimeMinutes = (bedtime) => {
                            const [hours, minutes] = bedtime.split(':').map(Number);
                            // Ajustar madrugada/tarde (00:00-17:59) para 24:00-41:59
                            // Cobre casos de sono irregular (deitar de madrugada ou durante o dia)
                            if (hours >= 0 && hours < 18) return (hours + 24) * 60 + minutes;
                            return hours * 60 + minutes;
                        };

                        const avgBedtimeMinutes = cyclesWithValidBedtime.reduce((sum, c) => sum + getBedtimeMinutes(c.bedtime), 0) / cyclesWithValidBedtime.length;
                        // Converter de volta para 0-23h se necessário
                        const adjustedMinutes = avgBedtimeMinutes >= 1440 ? avgBedtimeMinutes - 1440 : avgBedtimeMinutes;
                        const avgBedtimeHours = Math.floor(adjustedMinutes / 60);
                        const avgBedtimeMins = Math.round(adjustedMinutes % 60);
                        const avgBedtimeStr = `${String(avgBedtimeHours).padStart(2, '0')}:${String(avgBedtimeMins).padStart(2, '0')}`;

                        // Calcular dias sem dormir (dias com consumptions mas sem dados de sono)
                        const uniqueConsumptionDates = new Set();
                        analysisConsumptions.forEach(c => {
                            if (c.date) uniqueConsumptionDates.add(c.date);
                        });

                        let daysWithoutSleep = 0;
                        uniqueConsumptionDates.forEach(date => {
                            const hasSleepInCycle = analysisCycles.some(c => {
                                const cycleDate = c.date || (c.timestamp ? new Date(c.timestamp).toISOString().split('T')[0] : null);
                                return cycleDate === date && c.sleep != null && c.sleep !== '';
                            });
                            const hasSleepInWellbeing = analysisWellbeing.some(w => {
                                const wDate = w.date || (w.timestamp ? new Date(w.timestamp).toISOString().split('T')[0] : null);
                                return wDate === date && w.sleep != null && w.sleep !== '';
                            });

                            if (!hasSleepInCycle && !hasSleepInWellbeing) {
                                daysWithoutSleep++;
                            }
                        });

                        const totalDaysWithConsumptions = uniqueConsumptionDates.size;
                        const pctDaysWithoutSleep = totalDaysWithConsumptions > 0 ? Math.round((daysWithoutSleep / totalDaysWithConsumptions) * 100) : 0;

                        return (
                            <p>
                                {t('coach.bedtimeText', { time: avgBedtimeStr })}
                                {avgBedtimeHours >= 0 && avgBedtimeHours < 6 ? (
                                    <> {t('coach.bedtimeLate')}</>
                                ) : avgBedtimeHours >= 22 && avgBedtimeHours < 24 ? (
                                    <> {t('coach.bedtimeGood')}</>
                                ) : avgBedtimeHours >= 6 && avgBedtimeHours < 12 ? (
                                    <> {t('coach.bedtimeMorning')}</>
                                ) : (
                                    <> {t('coach.bedtimeObserve')}</>
                                )}
                                {daysWithoutSleep > 0 && (
                                    <> <span className={('text-red-400')}>{t(daysWithoutSleep === 1 ? 'coach.bedtimeDaysWithoutSleepSingular' : 'coach.bedtimeDaysWithoutSleepPlural', { n: daysWithoutSleep, pct: pctDaysWithoutSleep })}</span></>
                                )}
                            </p>
                        );
                    })()}

                    {/* Paragraph 8b: Score de Sono */}
                    {(() => {
                        // Combinar dados de sono de cycles e wellbeing
                        const allSleepData = [];

                        // Adicionar dados de cycles (sono noturno + sesta do mesmo dia)
                        analysisCycles.forEach(c => {
                            if (c.sleep && c.bedtime) {
                                const date = c.date || new Date(c.timestamp).toISOString().split('T')[0];
                                const napMins = analysisWellbeing
                                    .filter(w => (w.date || safeToISODate(w.timestamp)) === date)
                                    .reduce((sum, w) => sum + (w.napDuration || 0), 0);
                                allSleepData.push({
                                    date,
                                    sleep: parseFloat(c.sleep) + napMins / 60,
                                    bedtime: c.bedtime,
                                    timestamp: c.timestamp
                                });
                            }
                        });

                        // Adicionar dados de wellbeing (se não houver em cycles — legado)
                        analysisWellbeing.forEach(w => {
                            if (w.sleep) {
                                const date = w.date || new Date(w.timestamp).toISOString().split('T')[0];
                                if (!allSleepData.some(s => s.date === date)) {
                                    const napMins = analysisWellbeing
                                        .filter(w2 => (w2.date || safeToISODate(w2.timestamp)) === date)
                                        .reduce((sum, w2) => sum + (w2.napDuration || 0), 0);
                                    allSleepData.push({
                                        date,
                                        sleep: parseFloat(w.sleep) + napMins / 60,
                                        bedtime: null,
                                        timestamp: w.timestamp
                                    });
                                }
                            }
                        });

                        if (allSleepData.length < 3) return null; // Precisamos de pelo menos 3 dias

                        // Ordenar por data
                        allSleepData.sort((a, b) => new Date(a.timestamp || a.date) - new Date(b.timestamp || b.date));

                        // 1. SCORE DE HORAS (0-5 pontos)
                        const avgSleep = allSleepData.reduce((sum, s) => sum + s.sleep, 0) / allSleepData.length;
                        let hoursScore = 0;
                        if (avgSleep >= 7 && avgSleep <= 8) {
                            hoursScore = 5; // Perfeito
                        } else if (avgSleep >= 6 && avgSleep < 7) {
                            hoursScore = 3.5; // Razoável
                        } else if (avgSleep > 8 && avgSleep <= 9) {
                            hoursScore = 4; // Bom mas um pouco acima
                        } else if (avgSleep >= 5 && avgSleep < 6) {
                            hoursScore = 2; // Insuficiente
                        } else if (avgSleep > 9) {
                            hoursScore = 3; // Muito sono pode indicar problemas
                        } else {
                            hoursScore = 1; // <5h muito mau
                        }

                        // 2. SCORE DE REGULARIDADE (0-5 pontos)
                        let regularityScore = 0;
                        const dataWithBedtime = allSleepData.filter(s => s.bedtime);

                        if (dataWithBedtime.length >= 3) {
                            const getBedtimeMinutes = (bedtime) => {
                                const [hours, minutes] = bedtime.split(':').map(Number);
                                // Normalizar madrugada (0-6h) para 24-30h
                                if (hours >= 0 && hours < 6) return (hours + 24) * 60 + minutes;
                                return hours * 60 + minutes;
                            };

                            const bedtimeMinutes = dataWithBedtime.map(s => getBedtimeMinutes(s.bedtime));
                            const avgBedtime = bedtimeMinutes.reduce((a, b) => a + b, 0) / bedtimeMinutes.length;

                            // Calcular desvio padrão
                            const variance = bedtimeMinutes.reduce((sum, bt) => sum + Math.pow(bt - avgBedtime, 2), 0) / bedtimeMinutes.length;
                            const stdDev = Math.sqrt(variance);

                            // Converter desvio para horas
                            const stdDevHours = stdDev / 60;

                            if (stdDevHours < 0.5) {
                                regularityScore = 5; // Muito regular (±30 min)
                            } else if (stdDevHours < 1) {
                                regularityScore = 4; // Bom (±1h)
                            } else if (stdDevHours < 1.5) {
                                regularityScore = 3; // Razoável (±1.5h)
                            } else if (stdDevHours < 2) {
                                regularityScore = 2; // Irregular (±2h)
                            } else {
                                regularityScore = 1; // Muito irregular
                            }
                        } else {
                            // Se não temos bedtime suficiente, dar score neutro
                            regularityScore = 2.5;
                        }

                        // 3. SCORE FINAL (0-10)
                        const finalScore = hoursScore + regularityScore;

                        // 4. TENDÊNCIA (comparar primeira metade vs segunda metade)
                        let trend = 'stable';
                        if (allSleepData.length >= 6) {
                            const midpoint = Math.floor(allSleepData.length / 2);
                            const firstHalf = allSleepData.slice(0, midpoint);
                            const secondHalf = allSleepData.slice(midpoint);

                            const avgFirst = firstHalf.reduce((sum, s) => sum + s.sleep, 0) / firstHalf.length;
                            const avgSecond = secondHalf.reduce((sum, s) => sum + s.sleep, 0) / secondHalf.length;

                            const diff = avgSecond - avgFirst;

                            if (diff > 0.5) trend = 'improving'; // A melhorar
                            else if (diff < -0.5) trend = 'worsening'; // A piorar
                        }

                        // Determinar cor do score
                        const scoreColor = finalScore >= 8 ? ('text-green-400') :
                                          finalScore >= 6 ? ('text-yellow-400') :
                                          ('text-red-400');

                        return (
                            <p>
                                💤 <strong>{t('coach.sleepScoreLabel')}</strong>{' '}
                                <span className={'text-xl font-bold ' + scoreColor}>
                                    {finalScore.toFixed(1)}/10
                                </span>
                                {trend === 'improving' && <> <span className={('text-green-400')}>{t('coach.sleepScoreImproving')}</span></>}
                                {trend === 'worsening' && <> <span className={('text-red-400')}>{t('coach.sleepScoreWorsening')}</span></>}
                                {trend === 'stable' && <> <span className={('text-gray-400')}>{t('coach.sleepScoreStable')}</span></>}
                                {' '}
                                <span className={('text-gray-300')}>
                                    {t('coach.sleepScoreDetails', { hours: hoursScore.toFixed(1), reg: regularityScore.toFixed(1) })}
                                </span>
                                .
                                {finalScore >= 8 ? (
                                    <> <span className={('text-green-400')}>{t('coach.sleepScoreExcellent', { avg: avgSleep.toFixed(1) })}</span></>
                                ) : finalScore >= 6 ? (
                                    <> <span className={('text-yellow-400')}>{t(regularityScore < 3 ? 'coach.sleepScoreReasonableIrregular' : 'coach.sleepScoreReasonable', { avg: avgSleep.toFixed(1) })}</span></>
                                ) : (
                                    <> <span className={('text-red-400')}>{t(regularityScore < 3 ? 'coach.sleepScorePoorIrregular' : 'coach.sleepScorePoor', { avg: avgSleep.toFixed(1) })}</span></>
                                )}
                            </p>
                        );
                    })()}

                    {/* Paragraph 7b: Análise de Ciclos (mg e padrões) */}
                    {(() => {
                        if (analysisCycles.length === 0) return null;

                        // Calcular mg total e média por DIA (não por ciclo)
                        let totalMg = 0;
                        let cyclesWithMg = 0;
                        const cyclesMgData = [];
                        const datesWithMg = new Set();

                        analysisCycles.forEach(cycle => {
                            // Usar cycle.mg diretamente (fonte única de verdade)
                            const cycleMg = parseFloat(cycle.mg) || 0;
                            if (cycleMg > 0) {
                                totalMg += cycleMg;
                                cyclesWithMg++;
                                cyclesMgData.push(cycleMg);
                                // Adicionar data única
                                const cycleDate = cycle.date || new Date(cycle.timestamp).toISOString().split('T')[0];
                                datesWithMg.add(cycleDate);
                            }
                        });

                        if (cyclesWithMg === 0) return null;

                        const uniqueDaysWithMg = datesWithMg.size;
                        const avgMgPerDay = totalMg / uniqueDaysWithMg;

                        // Ciclos sem consumo após 00h
                        const cyclesWithNoLateConsumption = analysisCycles.filter(cycle => {
                            // Derivar data do ciclo
                            const cycleDate = cycle.date || new Date(cycle.timestamp).toISOString().split('T')[0];

                            // Filtrar consumos deste dia
                            const cycleConsumptions = analysisConsumptions.filter(c => c.date === cycleDate);

                            // Verificar se algum consumo foi após 00h
                            const hasLateConsumption = cycleConsumptions.some(c => {
                                const hour = new Date(c.timestamp).getHours();
                                return hour >= 0 && hour < 6; // 00h-06h
                            });

                            return !hasLateConsumption;
                        }).length;

                        const pctNoLate = ((cyclesWithNoLateConsumption / analysisCycles.length) * 100).toFixed(0);

                        return (
                            <p>
                                📊 <strong className={('text-cyan-400')}>{t('coach.quantityLabel')}</strong>{' '}
                                {t('coach.quantityText', { mg: avgMgPerDay.toFixed(0), n: uniqueDaysWithMg, label: t(uniqueDaysWithMg === 1 ? 'coach.day_singular' : 'coach.day_plural') })}
                                {avgMgPerDay > 300 ? (
                                    <> {t('coach.quantityHigh')}</>
                                ) : avgMgPerDay > 200 ? (
                                    <> {t('coach.quantityModHigh')}</>
                                ) : avgMgPerDay > 100 ? (
                                    <> {t('coach.quantityMod')}</>
                                ) : (
                                    <> {t('coach.quantityLow')}</>
                                )}
                                {analysisCycles.length >= 3 && <> {t(pctNoLate >= 70 ? 'coach.quantityNoLateHighPct' : pctNoLate >= 50 ? 'coach.quantityNoLateMedPct' : 'coach.quantityNoLateLowPct', { pct: pctNoLate })}</>}
                            </p>
                        );
                    })()}

                    {/* Paragraph 8: Self-Care Analysis */}
                    {(() => {
                        const periodWellbeing = analysisWellbeing;
                        if (periodWellbeing.length < 1) return null;

                        // Agrupar por DIAS (mesma lógica que Padrões)
                        const wellbeingDates = new Set(periodWellbeing.map(w => w.date));
                        const totalDays = wellbeingDates.size;

                        // Para cada área, contar quantos DIAS tiveram pelo menos um registo com essa área
                        const areas = { water: 0, food: 0, rest: 0, social: 0 };
                        Object.keys(areas).forEach(area => {
                            const daysWithArea = Array.from(wellbeingDates).filter(date => {
                                return periodWellbeing.some(w => w.date === date && w[area] === true);
                            }).length;
                            areas[area] = daysWithArea;
                        });

                        const percentages = {
                            water: totalDays > 0 ? (areas.water / totalDays) * 100 : 0,
                            food: totalDays > 0 ? (areas.food / totalDays) * 100 : 0,
                            rest: totalDays > 0 ? (areas.rest / totalDays) * 100 : 0,
                            social: totalDays > 0 ? (areas.social / totalDays) * 100 : 0
                        };

                        const lowAreas = Object.entries(percentages)
                            .filter(([_, pct]) => pct < 70)
                            .sort((a, b) => a[1] - b[1]);

                        const areaNames = {
                            water: t('coach.selfCareAreaWater'),
                            food: t('coach.selfCareAreaFood'),
                            rest: t('coach.selfCareAreaRest'),
                            social: t('coach.selfCareAreaSocial')
                        };
                        const overall = (percentages.water + percentages.food + percentages.rest + percentages.social) / 4;

                        const suggestions = {
                            water: t('coach.selfCareSuggWater'),
                            food: t('coach.selfCareSuggFood'),
                            rest: t('coach.selfCareSuggRest'),
                            social: t('coach.selfCareSuggSocial')
                        };

                        return (
                            <p>
                                💧 <strong className={('text-teal-400')}>{t('coach.selfCareLabel')}</strong>{' '}
                                {t('coach.selfCareRate', { pct: overall.toFixed(0) })}
                                {lowAreas.length >= 3 ? (
                                    <> {t('coach.selfCareMultipleLow', { area: areaNames[lowAreas[0][0]], pct: lowAreas[0][1].toFixed(0), suggestion: suggestions[lowAreas[0][0]], next: areaNames[lowAreas[1][0]] })}</>
                                ) : lowAreas.length === 2 ? (
                                    <> {t('coach.selfCareTwoLow', { area1: areaNames[lowAreas[0][0]], pct1: lowAreas[0][1].toFixed(0), area2: areaNames[lowAreas[1][0]], pct2: lowAreas[1][1].toFixed(0), suggestion: suggestions[lowAreas[0][0]] })}</>
                                ) : lowAreas.length === 1 ? (
                                    <> {t('coach.selfCareOneLow', { area: areaNames[lowAreas[0][0]], pct: lowAreas[0][1].toFixed(0), suggestion: suggestions[lowAreas[0][0]] })}</>
                                ) : (
                                    <> {t('coach.selfCareAllGood')}</>
                                )}
                            </p>
                        );
                    })()}

                    {/* Paragraph 9: Goals Achievement (DETALHADO) */}
                    {goals.length > 0 && (() => {
                        // Filter to get only the most recent goal of each type (mesma lógica que Dashboard)
                        const goalsByType = {};
                        goals.forEach(g => {
                            if (!goalsByType[g.type] || new Date(g.createdAt) > new Date(goalsByType[g.type].createdAt)) {
                                goalsByType[g.type] = g;
                            }
                        });
                        const uniqueGoals = Object.values(goalsByType);

                        // Calcular detalhes para cada meta
                        const goalDetails = uniqueGoals.map(g => {
                            const achievements = getGoalAchievementCount(g, analysisConsumptions, analysisDailyLogs, analysisCycles, analysisWellbeing);

                            // Calcular total possível baseado no tipo de meta
                            let totalPossible = 0;

                            if (g.type === 'reduce_frequency') {
                                // DIAS com consumos (usar .date se existir, senão extrair de timestamp)
                                const allDates = new Set();
                                analysisConsumptions.forEach(c => {
                                    const dateKey = c.date || safeToISODate(c.timestamp);
                                    if (dateKey) allDates.add(dateKey);
                                });
                                totalPossible = allDates.size;
                            } else if (g.type === 'increase_interval') {
                                // DIAS com ≥2 consumos
                                const consumptionsByDate = {};
                                analysisConsumptions.forEach(c => {
                                    const dateKey = c.date || safeToISODate(c.timestamp);
                                    if (!dateKey) return;
                                    if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = [];
                                    consumptionsByDate[dateKey].push(c);
                                });
                                totalPossible = Object.values(consumptionsByDate).filter(arr => arr.length >= 2).length;
                            } else if (g.type === 'sleep_hours') {
                                // DIAS com sono registado (cycles ou wellbeing)
                                const allDates = new Set();

                                // Adicionar dias de cycles com sono
                                analysisCycles.forEach(c => {
                                    if (c.sleep && !isNaN(parseFloat(c.sleep))) {
                                        const dateKey = c.date || safeToISODate(c.timestamp);
                                        if (dateKey) allDates.add(dateKey);
                                    }
                                });

                                // Adicionar dias de wellbeing com sono (Set elimina duplicados automaticamente)
                                analysisWellbeing.forEach(w => {
                                    if (w.sleep && !isNaN(parseFloat(w.sleep))) {
                                        const dateKey = w.date || safeToISODate(w.timestamp);
                                        if (dateKey) allDates.add(dateKey);
                                    }
                                });

                                totalPossible = allDates.size;
                            } else if (g.type === 'bedtime_before') {
                                // DIAS com sono registado (NÃO consumos!)
                                const allDates = new Set();
                                analysisCycles.forEach(c => {
                                    if (c.sleep && !isNaN(parseFloat(c.sleep))) {
                                        const dateKey = c.date || safeToISODate(c.timestamp);
                                        if (dateKey) allDates.add(dateKey);
                                    }
                                });
                                analysisWellbeing.forEach(w => {
                                    if (w.sleep && !isNaN(parseFloat(w.sleep))) {
                                        const dateKey = w.date || safeToISODate(w.timestamp);
                                        if (dateKey) allDates.add(dateKey);
                                    }
                                });
                                totalPossible = allDates.size;
                            } else if (g.type === 'limit_last' || g.type === 'reduce_quantity' || g.type === 'first_not_before') {
                                // DIAS com consumos
                                const allDates = new Set();
                                analysisConsumptions.forEach(c => {
                                    const dateKey = c.date || safeToISODate(c.timestamp);
                                    if (dateKey) allDates.add(dateKey);
                                });
                                totalPossible = allDates.size;
                            }

                            const percentage = totalPossible > 0 ? Math.min(100, ((achievements / totalPossible) * 100)).toFixed(0) : 0;

                            return {
                                goal: g,
                                achievements,
                                totalPossible,
                                percentage: parseInt(percentage)
                            };
                        });

                        const totalAchievements = goalDetails.reduce((sum, gd) => sum + gd.achievements, 0);
                        const goalsWithAchievements = goalDetails.filter(gd => gd.achievements > 0);
                        const bestGoal = goalDetails.length > 0 ? goalDetails.reduce((max, gd) => gd.percentage > max.percentage ? gd : max) : null;

                        const goalTypeNames = {
                            reduce_frequency: t('coach.goalTypeReduceFrequency'),
                            reduce_quantity: t('coach.goalTypeReduceQuantity'),
                            increase_interval: t('coach.goalTypeIncreaseInterval'),
                            limit_last: t('coach.goalTypeLimitLast'),
                            bedtime_before: t('coach.goalTypeBedtimeBefore'),
                            sleep_hours: t('coach.goalTypeSleepHours'),
                            first_not_before: t('coach.goalTypeFirstNotBefore')
                        };

                        return (
                            <p>
                                🎯 <strong className={('text-pink-400')}>{t('coach.goalsLabel')}</strong>{' '}
                                {t('coach.goalsAchievements', { n: totalAchievements })}
                                {goalsWithAchievements.length === uniqueGoals.length ? (
                                    <> <span className={('text-green-400')}>{t('coach.goalsAllAchieved', { n: uniqueGoals.length })}</span></>
                                ) : goalsWithAchievements.length > 0 ? (
                                    <> {t('coach.goalsSomeAchieved', { n: goalsWithAchievements.length, total: uniqueGoals.length })}</>
                                ) : (
                                    <> {t('coach.goalsNoneAchieved')}</>
                                )}
                                {bestGoal && bestGoal.percentage > 0 && (
                                    <>
                                        {' '}{t('coach.goalsBestGoal', { type: goalTypeNames[bestGoal.goal.type], n: bestGoal.achievements, total: bestGoal.totalPossible, pct: bestGoal.percentage })}
                                        {bestGoal.percentage >= 70 ? t('coach.goalsBestExcellent') : bestGoal.percentage >= 40 ? t('coach.goalsBestKeepGoing') : t('coach.goalsBestImprove')}
                                    </>
                                )}
                            </p>
                        );
                    })()}

                    {/* Paragraph 10: Sleep-Mood Correlation */}
                    {(() => {
                        const dailyData = {};

                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (!wDate) return;
                            if (!dailyData[wDate]) dailyData[wDate] = { sleep: null, mood: null };
                            if (w.sleep) dailyData[wDate].sleep = parseFloat(w.sleep);
                            if (w.mood) dailyData[wDate].mood = parseInt(w.mood);
                        });

                        const sortedDates = Object.keys(dailyData).sort();
                        const nextDaySleepMood = [];

                        for (let i = 0; i < sortedDates.length - 1; i++) {
                            const today = dailyData[sortedDates[i]];
                            const tomorrow = dailyData[sortedDates[i + 1]];
                            if (today.sleep !== null && tomorrow.mood !== null) {
                                nextDaySleepMood.push({ sleep: today.sleep, mood: tomorrow.mood });
                            }
                        }

                        if (nextDaySleepMood.length < 2) return null;

                        const correlation = analyticsService.calculatePearsonCorrelation(nextDaySleepMood, 'sleep', 'mood');
                        if (correlation === null) return null;

                        return (
                            <p>
                                💤➡️😊 <strong className={('text-indigo-400')}>{t('coach.sleepMoodLabel')}</strong>{' '}
                                {t('coach.sleepMoodText')}
                                {correlation > 0.4 ? (
                                    <> {t('coach.sleepMoodStrongPos', { r: correlation.toFixed(2) })}</>
                                ) : correlation > 0.2 ? (
                                    <> {t('coach.sleepMoodModPos', { r: correlation.toFixed(2) })}</>
                                ) : correlation < -0.3 ? (
                                    <> {t('coach.sleepMoodNeg', { r: correlation.toFixed(2) })}</>
                                ) : (
                                    <> {t('coach.sleepMoodWeak', { r: correlation.toFixed(2) })}</>
                                )}
                            </p>
                        );
                    })()}

                    {/* Paragraph 10b: Consumption-Wellbeing Correlation */}
                    {(() => {
                        // Análise: consumo hoje afeta bem-estar amanhã?
                        const dailyConsumptionData = {};

                        // Agrupar consumos por dia
                        analysisConsumptions.forEach(c => {
                            if (!dailyConsumptionData[c.date]) dailyConsumptionData[c.date] = { consumptions: 0, mood: null, energy: null };
                            dailyConsumptionData[c.date].consumptions++;
                        });

                        // Adicionar bem-estar
                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (!wDate) return;
                            if (!dailyConsumptionData[wDate]) dailyConsumptionData[wDate] = { consumptions: 0, mood: null, energy: null };
                            if (w.mood) dailyConsumptionData[wDate].mood = parseInt(w.mood);
                            if (w.energy) dailyConsumptionData[wDate].energy = parseInt(w.energy);
                        });

                        const sortedDates = Object.keys(dailyConsumptionData).sort();
                        const nextDayData = [];

                        // Correlacionar consumo de hoje com bem-estar de amanhã
                        for (let i = 0; i < sortedDates.length - 1; i++) {
                            const today = dailyConsumptionData[sortedDates[i]];
                            const tomorrow = dailyConsumptionData[sortedDates[i + 1]];
                            if (today.consumptions > 0 && (tomorrow.mood !== null || tomorrow.energy !== null)) {
                                nextDayData.push({
                                    consumptions: today.consumptions,
                                    mood: tomorrow.mood,
                                    energy: tomorrow.energy
                                });
                            }
                        }

                        if (nextDayData.length < 2) return null;

                        const validMoodData = nextDayData.filter(d => d.mood !== null);
                        const validEnergyData = nextDayData.filter(d => d.energy !== null);

                        const moodCorr = validMoodData.length >= 2 ? analyticsService.calculatePearsonCorrelation(validMoodData, 'consumptions', 'mood') : null;
                        const energyCorr = validEnergyData.length >= 2 ? analyticsService.calculatePearsonCorrelation(validEnergyData, 'consumptions', 'energy') : null;

                        // Só mostrar se pelo menos uma correlação existe e é significativa
                        if ((moodCorr === null || Math.abs(moodCorr) < 0.3) && (energyCorr === null || Math.abs(energyCorr) < 0.3)) return null;

                        return (
                            <p>
                                🔍 <strong className={('text-indigo-400')}>{t('coach.consumptionImpactLabel')}</strong>{' '}
                                {t('coach.consumptionImpactText')}
                                {moodCorr !== null && Math.abs(moodCorr) >= 0.3 && (
                                    <>
                                        {moodCorr < -0.5 ? (
                                            <> {t('coach.consumptionImpactMoodStrong', { r: moodCorr.toFixed(2) })}</>
                                        ) : moodCorr < -0.3 ? (
                                            <> {t('coach.consumptionImpactMoodMod', { r: moodCorr.toFixed(2) })}</>
                                        ) : moodCorr > 0.3 ? (
                                            <> {t('coach.consumptionImpactMoodPos', { r: moodCorr.toFixed(2) })}</>
                                        ) : null}
                                    </>
                                )}
                                {energyCorr !== null && Math.abs(energyCorr) >= 0.3 && (
                                    <>
                                        {energyCorr < -0.5 ? (
                                            <> {t('coach.consumptionImpactEnergyStrong', { r: energyCorr.toFixed(2) })}</>
                                        ) : energyCorr < -0.3 ? (
                                            <> {t('coach.consumptionImpactEnergyMod', { r: energyCorr.toFixed(2) })}</>
                                        ) : energyCorr > 0.3 ? (
                                            <> {t('coach.consumptionImpactEnergyPos', { r: energyCorr.toFixed(2) })}</>
                                        ) : null}
                                    </>
                                )}
                            </p>
                        );
                    })()}

                    {/* Paragraph 10c: Perfil de Risco */}
                    {(() => {
                        // Identificar condições que precedem dias com mais consumo
                        if (analysisConsumptions.length < 1 || analysisWellbeing.length < 1) return null;

                        const dailyProfile = {};

                        // Agrupar por dia
                        analysisConsumptions.forEach(c => {
                            if (!dailyProfile[c.date]) dailyProfile[c.date] = { consumptions: 0, prevSleep: null, prevMood: null, prevEnergy: null };
                            dailyProfile[c.date].consumptions++;
                        });

                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (!wDate) return;
                            if (!dailyProfile[wDate]) dailyProfile[wDate] = { consumptions: 0, prevSleep: null, prevMood: null, prevEnergy: null };
                        });

                        // Para cada dia, pegar bem-estar do dia ANTERIOR
                        const sortedDates = Object.keys(dailyProfile).sort();
                        for (let i = 1; i < sortedDates.length; i++) {
                            const yesterday = sortedDates[i - 1];
                            const yesterdayWellbeing = analysisWellbeing.find(w => {
                                const wDate = w.date || safeToISODate(w.timestamp);
                                return wDate === yesterday;
                            });

                            if (yesterdayWellbeing) {
                                dailyProfile[sortedDates[i]].prevSleep = yesterdayWellbeing.sleep ? parseFloat(yesterdayWellbeing.sleep) : null;
                                dailyProfile[sortedDates[i]].prevMood = yesterdayWellbeing.mood ? parseInt(yesterdayWellbeing.mood) : null;
                                dailyProfile[sortedDates[i]].prevEnergy = yesterdayWellbeing.energy ? parseInt(yesterdayWellbeing.energy) : null;
                            }
                        }

                        // Identificar "dias de alto risco" (top 33% de consumo)
                        const daysWithData = Object.values(dailyProfile).filter(d => d.consumptions > 0);
                        if (daysWithData.length < 1) return null;

                        daysWithData.sort((a, b) => b.consumptions - a.consumptions);
                        const highRiskDays = daysWithData.slice(0, Math.ceil(daysWithData.length / 3));

                        // Calcular médias de bem-estar do dia anterior para dias de alto vs baixo risco
                        const highRiskPrevMood = highRiskDays.filter(d => d.prevMood !== null).map(d => d.prevMood);
                        const lowRiskDays = daysWithData.slice(Math.ceil(daysWithData.length / 3));
                        const lowRiskPrevMood = lowRiskDays.filter(d => d.prevMood !== null).map(d => d.prevMood);

                        if (highRiskPrevMood.length < 2 || lowRiskPrevMood.length < 2) return null;

                        const avgHighRiskPrevMood = highRiskPrevMood.reduce((a, b) => a + b, 0) / highRiskPrevMood.length;
                        const avgLowRiskPrevMood = lowRiskPrevMood.reduce((a, b) => a + b, 0) / lowRiskPrevMood.length;
                        const moodDiff = avgLowRiskPrevMood - avgHighRiskPrevMood;

                        // Só mostrar se diferença significativa (>1.5 pontos)
                        if (Math.abs(moodDiff) < 1.5) return null;

                        return (
                            <p>
                                🎯 <strong className={('text-yellow-400')}>{t('coach.riskProfileLabel')}</strong>{' '}
                                {t('coach.riskProfileText')}
                                {moodDiff > 0 ? (
                                    <> {t('coach.riskProfileLowMood', { diff: moodDiff.toFixed(1) })}</>
                                ) : (
                                    <> {t('coach.riskProfileHighMood', { diff: Math.abs(moodDiff).toFixed(1) })}</>
                                )}
                            </p>
                        );
                    })()}

                    {/* Paragraph 11: Tendência (se aplicável) */}
                    {(() => {
                        if (totalConsumptions === 0) return null;

                        // Comparar período atual (analysisConsumptions) vs período anterior
                        const currentPeriod = analysisConsumptions;

                        // Pegar o período anterior (mesmo tipo, offset+1)
                        const previousDateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset + 1);
                        const previousPeriod = filterByDateRange(consumptions, previousDateRange);

                        if (currentPeriod.length === 0 || previousPeriod.length === 0) return null;
                        if (currentPeriod.length < 3 || previousPeriod.length < 3) return null; // Mínimo 3 consumos em cada

                        const percentChange = ((currentPeriod.length - previousPeriod.length) / previousPeriod.length) * 100;

                        // Só mostrar se mudança significativa (>20%)
                        if (Math.abs(percentChange) < 20) return null;

                        return (
                            <p>
                                {percentChange > 0 ? (
                                    <>{t('coach.trendIncrease', { pct: Math.abs(percentChange).toFixed(0), prev: previousPeriod.length, curr: currentPeriod.length })}</>
                                ) : (
                                    <>{t('coach.trendDecrease', { pct: Math.abs(percentChange).toFixed(0), prev: previousPeriod.length, curr: currentPeriod.length })}</>
                                )}
                            </p>
                        );
                    })()}

                    {/* Paragraph: Análise de Energia nos Últimos Consumos */}
                    {(() => {
                        if (analysisConsumptions.length < 1) return null;

                        // Pegar os últimos 10 consumos (ou menos se não houver 10)
                        const sortedConsumptions = [...analysisConsumptions].sort((a, b) =>
                            new Date(b.timestamp) - new Date(a.timestamp)
                        );
                        const last10Consumptions = sortedConsumptions.slice(0, 10);

                        // Para cada consumo, encontrar o check-in de bem-estar mais próximo no mesmo dia
                        let countWithLowEnergy = 0;
                        let countWithData = 0;

                        last10Consumptions.forEach(cons => {
                            const consDate = cons.date;
                            const consTime = new Date(cons.timestamp);

                            // Encontrar check-ins de bem-estar do mesmo dia
                            const sameDayWellbeing = analysisWellbeing.filter(w => {
                                const wDate = w.date || safeToISODate(w.timestamp);
                                return wDate === consDate && w.energy != null;
                            });

                            if (sameDayWellbeing.length === 0) return;

                            // Encontrar o check-in mais próximo (antes ou depois do consumo)
                            const closestWellbeing = sameDayWellbeing.reduce((closest, current) => {
                                const currentTime = new Date(current.timestamp);
                                const closestTime = new Date(closest.timestamp);
                                const currentDiff = Math.abs(currentTime - consTime);
                                const closestDiff = Math.abs(closestTime - consTime);
                                return currentDiff < closestDiff ? current : closest;
                            });

                            countWithData++;
                            if (parseInt(closestWellbeing.energy) < 4) {
                                countWithLowEnergy++;
                            }
                        });

                        // Só mostrar se houver pelo menos 5 consumos com dados de energia
                        if (countWithData < 5) return null;

                        const percentage = Math.round((countWithLowEnergy / countWithData) * 100);

                        // Só mostrar se pelo menos 50% dos consumos tinham energia baixa
                        if (percentage < 50) return null;

                        return (
                            <p>
                                ⚡ <strong className={('text-yellow-400')}>{t('coach.energyLabel')}</strong>{' '}
                                {t('coach.energyText', { total: countWithData, low: countWithLowEnergy })}
                                {percentage >= 70 ? (
                                    <> {t('coach.energyStrongCorrelation')}</>
                                ) : (
                                    <> {t('coach.energyTrigger')}</>
                                )}
                            </p>
                        );
                    })()}


                    {/* Paragraph 12: Autoconhecimento */}
                    {(analysisWellbeing.length > 3 || analysisCycles.length > 2) && (
                        <p>
                            ✨ <strong className={('text-cyan-400')}>{t('coach.selfKnowledgeLabel')}</strong>{' '}{t('coach.selfKnowledgeText')}
                            {analysisWellbeing.length > 0 && <> {t('coach.selfKnowledgeWellbeing')}</>}
                            {analysisCycles.length > 0 && <>{analysisWellbeing.length > 0 && ','} {t('coach.selfKnowledgeSleepCycles')}</>}.
                            <span className={'font-medium ' + ('text-cyan-400')}> {t('coach.selfKnowledgeTip')}</span>
                        </p>
                    )}

                    {/* Paragraph 13: You Are in Control */}
                    <p className={'font-medium ' + ('text-purple-300')}>
                        💪 <strong>{t('coach.controlLabel')}</strong> {t('coach.controlText')}
                        <span className={('text-purple-400')}> {t('coach.controlTip')}</span>
                    </p>

                    {/* Paragraph 14: Closing & Next Steps */}
                    <p className={'font-medium pt-2 border-t ' + ('border-gray-700 text-purple-400')}>
                        🤝 <strong>{t('coach.closingLabel')}</strong> {t('coach.closingText')}
                        <span> {t('coach.closingHarmReduction')}</span>
                        <br/><br/>
                        {t('coach.closingRemember')}
                        {' '}{t('coach.closingProud')}
                    </p>
                </div>
            </div>
        </div>
    );
});
