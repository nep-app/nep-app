import React, { useMemo } from 'react';
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

    if (!coachData) {
        return (<div className={('bg-gray-800 border-gray-700 text-gray-400') + ' rounded-xl p-6 border text-center'}>Sem dados para este período</div>);
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
                        Reflexão Geral
                    </h3>
                </div>
                <p className={'text-xs ' + ('text-gray-400')}>
                    Resumo personalizado do período selecionado
                </p>
            </div>

            {/* Narrative Summary */}
            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                <div className={'space-y-4 leading-relaxed ' + ('text-gray-200')}>
                    {/* Paragraph 1: Overview */}
                    <p>
                        {totalConsumptions > 0 ? (
                            <>📊 <strong className={('text-purple-400')}>Visão Geral:</strong> {totalConsumptions} {totalConsumptions === 1 ? 'consumo' : 'consumos'} em {uniqueDays} {uniqueDays === 1 ? 'dia' : 'dias'} (média {avgPerDay}/dia). Vamos explorar os padrões:</>
                        ) : (
                            <>🎉 Nenhum consumo registado neste período - excelente!</>
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

                        const goodThreshold = Math.max(1, frequencyGoal.target - 1); // Meta - 1
                        const difficultThreshold = frequencyGoal.target + 1; // Meta + 1

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
                                🏆 <strong className={('text-green-400')}>Dias Bons vs Difíceis:</strong>
                                {goodDays.length > 0 && <> Tiveste <strong>{goodDays.length} {goodDays.length === 1 ? 'dia bom' : 'dias bons'}</strong> (≤{goodThreshold} consumos){goodSleep && <> com média de <strong>{goodSleep}h sono</strong></>}{goodMood && <> e humor de <strong>{goodMood}/10</strong></>}.</>}
                                {difficultDays.length > 0 && <> {goodDays.length > 0 && 'Por outro lado,'} houve <strong className={('text-orange-400')}>{difficultDays.length} {difficultDays.length === 1 ? 'dia difícil' : 'dias difíceis'}</strong> (≥{difficultThreshold} consumos){difficultSleep && <> com média de <strong>{difficultSleep}h sono</strong></>}{difficultMood && <> e humor de <strong>{difficultMood}/10</strong></>}.</>}
                                {goodSleep && difficultSleep && parseFloat(goodSleep) > parseFloat(difficultSleep) + 1 && (
                                    <> <span className={('text-cyan-400')}>💡 Padrão claro: dormir mais ({(parseFloat(goodSleep) - parseFloat(difficultSleep)).toFixed(1)}h a mais) correlaciona-se com dias bons!</span></>
                                )}
                                {goodMood && difficultMood && parseFloat(goodMood) > parseFloat(difficultMood) + 1.5 && (
                                    <> <span className={('text-purple-400')}>💡 Humor também é fator: dias bons têm +{(parseFloat(goodMood) - parseFloat(difficultMood)).toFixed(1)} pontos.</span></>
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
                        const balanceLabel = positivePercent >= 70 ? 'muito positivo' : positivePercent >= 50 ? 'positivo' : positivePercent >= 30 ? 'misto' : 'desafiante';

                        return (
                            <p>
                                🌈 <strong className={('text-cyan-400')}>Estado Emocional:</strong> Balanço <strong className={(isPositive ? 'text-green-400' : 'text-orange-400')}>{balanceLabel}</strong> ({positivePercent}% emoções positivas).
                                {topEmotions.length > 0 && <> As tuas emoções mais frequentes foram <strong>{topEmotions.join(', ')}</strong>.</>}
                                {positivePercent >= 60 ? (
                                    <> <span className={('text-green-400')}>✨ Ótimo! Mantém estas práticas que te fazem sentir bem.</span></>
                                ) : positivePercent < 40 ? (
                                    <> <span className={('text-purple-400')}>💜 Lembra-te: períodos difíceis passam. Procura apoio se precisares.</span></>
                                ) : null}
                            </p>
                        );
                    })()}

                    {/* NOVO: Paragraph 3 - Dias da Semana */}
                    {(() => {
                        if (analysisConsumptions.length < 7) return null;

                        // Agrupar por dia da semana
                        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
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
                                📅 <strong className={('text-indigo-400')}>Padrão Semanal:</strong> <strong className={('text-orange-400')}>{dayNames[worstDay[0]]}s</strong> são os teus dias mais difíceis (média de <strong>{worstDay[1].toFixed(1)} consumos</strong>), enquanto <strong className={('text-green-400')}>{dayNames[bestDay[0]]}s</strong> são melhores (média {bestDay[1].toFixed(1)}).
                                {parseInt(worstDay[0]) >= 1 && parseInt(worstDay[0]) <= 5 ? (
                                    <> <span className={('text-yellow-400')}>💡 Dia de semana difícil pode estar ligado a stress de trabalho/rotina. Planeia estratégias preventivas às {dayNames[worstDay[0]]}s.</span></>
                                ) : (
                                    <> <span className={('text-cyan-400')}>💡 Fins de semana tendem a ser mais desafiantes - talvez por mudança de rotina ou tédio. Estrutura atividades para esse dia.</span></>
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
                                🌅 <strong className={('text-amber-400')}>Primeiro Consumo → Escalada:</strong> Quando o primeiro consumo é <strong>antes das 10h</strong>, o total do dia é <strong className={(percentDiff > 0 ? ('text-orange-400') : ('text-green-400'))}>{Math.abs(percentDiff)}% {percentDiff > 0 ? 'maior' : 'menor'}</strong> (média {avgEarlyTotal.toFixed(1)} vs {avgLateTotal.toFixed(1)} quando começas mais tarde).
                                {percentDiff > 0 ? (
                                    <> <span className={('text-yellow-400')}>⚠️ Começar cedo correlaciona-se com escalada. Atrasar o primeiro consumo pode ser estratégia de redução de danos.</span></>
                                ) : (
                                    <> <span className={('text-cyan-400')}>💡 Começar mais cedo não piora o dia - pode até ajudar a espaçar melhor.</span></>
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
                                🔥 <strong className={('text-orange-400')}>Momentum:</strong> O teu recorde é <strong className={('text-green-400')}>{maxStreak} {maxStreak === 1 ? 'dia' : 'dias'} consecutivos</strong> com consumo controlado (≤{median} consumos/dia).
                                {isCurrentStreakActive && maxStreak === currentStreak ? (
                                    <> <span className={'font-medium ' + ('text-green-400')}>🎉 E estás nessa streak AGORA! Continua - cada dia conta!</span></>
                                ) : maxStreakEnd ? (
                                    <> O último foi até {new Date(maxStreakEnd).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}. <span className={('text-cyan-400')}>Conseguiste uma vez, consegues de novo!</span></>
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
                        let windowType = '';
                        if (maxWindowStart >= 22 || maxWindowStart <= 2) windowType = 'noite/madrugada';
                        else if (maxWindowStart >= 6 && maxWindowStart <= 11) windowType = 'manhã';
                        else if (maxWindowStart >= 12 && maxWindowStart <= 17) windowType = 'tarde';
                        else windowType = 'fim de tarde/noite';

                        return (
                            <p>
                                ⏰ <strong className={('text-red-400')}>Janela de Vulnerabilidade:</strong> <strong>{concentrationPercent}%</strong> dos teus consumos acontecem entre <strong className={('text-orange-400')}>{formatWindow(maxWindowStart)}</strong> ({windowType}).
                                {concentrationPercent >= 70 ? (
                                    <> <span className={('text-yellow-400')}>⚠️ Concentração muito alta! Esta é a tua janela crítica - planeia atividades alternativas ou estratégias de distração nesse horário.</span></>
                                ) : (
                                    <> <span className={('text-cyan-400')}>💡 Identificar este padrão é o primeiro passo. Que rotinas/gatilhos existem nesse período?</span></>
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
                                🌊 <strong className={('text-purple-400')}>Efeito Cascata:</strong>
                                {longestCascade >= 2 ? (
                                    <> Detectei <strong className={('text-orange-400')}>{cascadeEvents} {cascadeEvents === 1 ? 'episódio' : 'episódios'} de cascata</strong> (dias difíceis consecutivos). O mais longo foi de <strong>{longestCascade} dias</strong>.
                                    {longestCascade >= 3 ? (
                                        <> <span className={('text-red-400')}>⚠️ Cascatas longas são preocupantes - um dia mau leva a outro. Quando detetas o primeiro dia difícil, é crucial intervir logo no dia seguinte para quebrar o ciclo.</span></>
                                    ) : (
                                        <> <span className={('text-yellow-400')}>💡 Padrão: depois de um dia difícil, há risco de continuar. Quebra o ciclo no 2º dia!</span></>
                                    )}</>
                                ) : (
                                    <> Não deteto efeito cascata significativo - geralmente consegues recuperar após dias difíceis. <span className={('text-green-400')}>✓ Boa resiliência!</span></>
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
                                🔄 <strong className={('text-teal-400')}>Perfil de Recuperação:</strong>
                                {avgRecovery ? (
                                    <> Em média, levas <strong>{avgRecovery} {parseFloat(avgRecovery) === 1 ? 'dia' : 'dias'}</strong> para voltar ao normal após um dia difícil.
                                    {parseFloat(avgRecovery) <= 1.5 ? (
                                        <> <span className={('text-green-400')}>✓ Recuperação rápida! Tens boa capacidade de "reset" após deslizes.</span></>
                                    ) : parseFloat(avgRecovery) <= 3 ? (
                                        <> <span className={('text-yellow-400')}>💡 Recuperação moderada. Tenta identificar o que te ajuda a voltar ao normal mais rápido.</span></>
                                    ) : (
                                        <> <span className={('text-orange-400')}>⚠️ Recuperação lenta - dias difíceis tendem a prolongar-se. Foca em estratégias de "reset" no dia seguinte (rotina, sono, atividade física).</span></>
                                    )}</>
                                ) : null}
                                {stillRecoveringDays > 0 && (
                                    <> <span className={('text-yellow-400')}>⏳ <strong>{stillRecoveringDays} {stillRecoveringDays === 1 ? 'dia difícil ainda em recuperação' : 'dias difíceis ainda em recuperação'}</strong> (não voltaram à média nos últimos dias).</span></>
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
                                📍 <strong className={('text-orange-400')}>Outliers:</strong> {new Date(top1.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })} teve <strong>{top1.count} consumos</strong> — {diffFromAvg} acima da tua média de {avgDaily.toFixed(1)}. É {topDays.length === 1 ? 'o teu dia mais alto' : `um dos teus ${topDays.length} dias mais altos`}.
                                {top1Emotions.length > 0 && (
                                    <> Emoções registadas: <strong className={('text-purple-400')}>{top1Emotions.join(', ')}</strong>{top1Mood && <> (humor: {top1Mood}/10)</>}.</>
                                )}
                                {topDays.length > 1 && (
                                    <> Outros picos: {topDays.slice(1).map((d, i) => (
                                        <span key={d.date}>
                                            {i > 0 && ', '}
                                            {new Date(d.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} ({d.count})
                                        </span>
                                    ))}.</>
                                )}
                                <> <span className={('text-cyan-400')}>Outliers não são falhas — são dados. {top1Emotions.length > 0 ? `Repara no padrão emocional: ${top1Emotions[0]}.` : 'Que gap de necessidades foi preenchido nesses dias?'}</span></>
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
                                🔬 <strong className={('text-indigo-400')}>Padrões de Comportamento:</strong>
                                {clusters.altaPressao.length > 0 && (
                                    <> <strong className={('text-red-400')}>Dias "Alta Pressão"</strong> ({clusters.altaPressao.length}): Muito consumo + pouco sono + humor estável. Estás a "pedalar no limiar" — funcionas, mas à custa de estimulação.</>
                                )}
                                {clusters.paradoxo.length > 0 && (
                                    <> <strong className={('text-yellow-400')}>Dias "Paradoxo"</strong> ({clusters.paradoxo.length}): Pouco consumo + muito sono + humor baixo. Sono não compensa humor baixo — possível depressão mascarada ou outro fator.</>
                                )}
                                {clusters.equilibrio.length > 0 && (
                                    <> <strong className={('text-green-400')}>Dias "Equilíbrio"</strong> ({clusters.equilibrio.length}): Consumo moderado + humor bom. Este é o teu sweet spot atual.</>
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
                                📈 <strong className={('text-blue-400')}>Micro-tendência:</strong> Últimos 7 dias: média de <strong>{avgLast7.toFixed(1)} consumos/dia</strong> vs {avgPrev21.toFixed(1)} nas 3 semanas anteriores
                                ({percentChange > 0 ? '+' : ''}{percentChange}%).
                                {percentChange > 15 ? (
                                    <> <span className={('text-orange-400')}>Aumento significativo. Sistema a desviar — identificar causa antes que normalize.</span></>
                                ) : percentChange < -15 ? (
                                    <> <span className={('text-green-400')}>Redução clara. O que mudou? Replicar essas condições.</span></>
                                ) : percentChange > 0 ? (
                                    <> Ligeira subida — monitorizar.</>
                                ) : (
                                    <> Ligeira descida — bom sinal.</>
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
                                🎭 <strong className={('text-pink-400')}>Gatilhos Emocionais Validados:</strong>
                                {topRisk && topRisk.diff > 0 && (
                                    <> Emoção <strong className={('text-red-400')}>{topRisk.emotion}</strong> correlaciona com +{topRisk.diff.toFixed(1)} consumos acima da média ({topRisk.days} dias). É gatilho validado, não especulação.</>
                                )}
                                {topProtector && topProtector.diff < 0 && (
                                    <> Emoção <strong className={('text-green-400')}>{topProtector.emotion}</strong> correlaciona com {Math.abs(topProtector.diff).toFixed(1)} consumos ABAIXO da média. Factor protetor — cultivar.</>
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
                        const areaNames = { water: 'água suficiente', food: 'refeições nutritivas', social: 'socialização' };

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
                                💧 <strong className={('text-teal-400')}>Contexto Autocuidado:</strong>
                                {topImpact.percentDiff < 0 ? (
                                    <> Nos dias com <strong className={('text-green-400')}>{areaNames[topImpact.area]}</strong>, consumiste <strong>{Math.abs(topImpact.percentDiff)}% menos</strong> ({topImpact.days} dias). Forte associação com dias de menor consumo.</>
                                ) : (
                                    <> Nos dias com <strong>{areaNames[topImpact.area]}</strong>, consumiste <strong className={('text-orange-400')}>{topImpact.percentDiff}% mais</strong>. Correlação inesperada — explorar.</>
                                )}
                                {impacts.length > 1 && impacts[1].percentDiff < 0 && (
                                    <> Também: {areaNames[impacts[1].area]} associado com redução de {Math.abs(impacts[1].percentDiff)}%.</>
                                )}
                                <> <span className={('text-gray-400')}>⚠️ Nota: Dias bons podem naturalmente incluir mais autocuidado E menos consumo. A correlação não prova que um causa o outro.</span></>
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
                                        🔗 <strong className={('text-red-400')}>Trigger Mapping:</strong> <strong>{percentLowSleep}%</strong> dos consumos tardios (00h-06h) aconteceram em dias com <strong>&lt;6h sono</strong>.
                                        <> <span className={('text-orange-400')}>Padrão forte: privação de sono está consistentemente associada a consumo nocturno. Melhorar o sono pode ser uma alavanca útil.</span></>
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
                                            🔗 <strong className={('text-red-400')}>Trigger Mapping:</strong> Em <strong>{percent}%</strong> dos dias com alta frequência (≥{difficultThreshold} consumos), registaste emoção <strong className={('text-orange-400')}>{topEmotion[0]}</strong>.
                                            <> Este é o teu trigger primário validado — não é especulação. Desenvolver estratégias para esta emoção específica tem ROI alto.</>
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

                        const oscillationLevel = parseFloat(stdDev) > 2.5 ? 'alta' : parseFloat(stdDev) > 1.5 ? 'moderada' : 'baixa';
                        const emotionalDiversity = numTypes >= 4 ? 'alta' : numTypes >= 2 ? 'moderada' : 'baixa';

                        // Tipo emocional dominante
                        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
                        const dominantType = sortedTypes[0];

                        return (
                            <p>
                                🧠 <strong className={('text-purple-400')}>Perfil Emocional:</strong> <strong>Diversidade emocional {emotionalDiversity}</strong> — registaste <strong>{numTypes} tipos de emoções</strong> diferentes. {dominantType && <>A mais frequente foi <strong>{dominantType[0]}</strong> (<strong>{dominantType[1]} vezes</strong>). </>}<strong>Oscilação de humor {oscillationLevel}</strong> — {oscillationLevel === 'alta' ? 'há variações notáveis de intensidade' : oscillationLevel === 'moderada' ? 'oscilações moderadas' : 'sem grandes extremos'}.
                            </p>
                        );
                    })()}

                    {/* Paragraph 7: Emotional Tone & Encouragement (ANÁLISE AVANÇADA) */}
                    <p>
                        {allNotes.length > 0 ? (
                            <>
                                📝 <strong className={('text-purple-400')}>Análise das tuas Reflexões</strong> ({sentimentAnalysis.noteCount} notas):
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
                                            🔍 <strong className={('text-indigo-300')}>Padrões emocionais:</strong>
                                            {realOverall === 'positive' ? (
                                                <> Tom geral <strong className={('text-green-400')}>positivo</strong> ({positivePercent}% positivas vs {negativePercent}% negativas). Há consciência dos desafios, mas também esperança e resiliência. </>
                                            ) : realOverall === 'negative' ? (
                                                <> Tom geral <strong className={('text-orange-400')}>negativo</strong> ({negativePercent}% negativas vs {positivePercent}% positivas). Reconheço que estás a enfrentar dificuldades. </>
                                            ) : (
                                                <> Tom equilibrado entre positivo ({positivePercent}%) e negativo ({negativePercent}%), com {neutralPercent}% neutro - estás a navegar os altos e baixos. </>
                                            )}
                                            {sentimentAnalysis.trend === 'improving' && <span className={'font-medium ' + ('text-green-400')}>📈 Tendência: a melhorar!</span>}
                                            {sentimentAnalysis.trend === 'worsening' && <span className={('text-yellow-400')}>📉 Tendência: a piorar nos últimos dias.</span>}
                                            {highNegDays > 0 && highNegHighCons / highNegDays > 0.6 && (
                                                <> <strong className={('text-orange-300')}>⚠️ Padrão: dias com reflexões muito negativas coincidem com mais consumo</strong> ({highNegHighCons} de {highNegDays} dias). Humor baixo pode ser gatilho.</>
                                            )}
                                        </>
                                    );
                                })()}
                                <br/>
                                💭 <strong className={('text-purple-300')}>Temas principais:</strong>
                                {(() => {
                                    // Mostrar 3 temas mais mencionados com sentimento médio
                                    const topThemes = Object.entries(sentimentThemes)
                                        .filter(([_, data]) => data.count > 2)
                                        .sort((a, b) => b[1].count - a[1].count)
                                        .slice(0, 3);
                                    const themeNames = { sleep: 'sono', stress: 'stress/ansiedade', energy: 'energia', mood: 'humor', focus: 'foco/concentração', social: 'relações sociais', health: 'saúde física' };
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
                                                {sentimentThemes.stress && sentimentThemes.stress.avgSentiment < -0.3 && <> <strong className={('text-yellow-300')}>Nota:</strong> As tuas reflexões sobre stress/ansiedade tendem a ser negativas - este é um tema que merece atenção.</>}
                                                {sentimentThemes.sleep && sentimentThemes.sleep.avgSentiment < -0.3 && <> <strong className={('text-cyan-300')}>Nota:</strong> O sono é fonte frequente de preocupação nas tuas notas - melhorar a qualidade do sono pode ter grande impacto.</>}
                                            </>
                                        );
                                    }
                                    return <> Escreve mais reflexões para identificar temas recorrentes.</>;
                                })()}
                            </>
                        ) : (
                            <> Encorajo-te a escrever mais nas tuas reflexões - expressar pensamentos e sentimentos ajuda a processar emoções e a identificar padrões. </>
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

                        if (difficultDays > 0) optimizationAreas.push(`frequência (reduzir dias ≥${difficultThreshold})`);

                        if (analysisCycles.length > 0) {
                            const avgSleep = analysisCycles
                                .filter(c => c.sleep)
                                .reduce((sum, c) => sum + parseFloat(c.sleep), 0) / analysisCycles.filter(c => c.sleep).length;
                            if (avgSleep < 7) optimizationAreas.push('sono (aumentar para 7-8h)');
                        }

                        if (analysisWellbeing.length > 0) {
                            const avgMood = analysisWellbeing
                                .filter(w => w.mood)
                                .reduce((sum, w) => sum + parseInt(w.mood), 0) / analysisWellbeing.filter(w => w.mood).length;
                            if (avgMood < 6) optimizationAreas.push('regulação emocional');
                        }

                        const lateConsumptions = analysisConsumptions.filter(c => {
                            const hour = new Date(c.timestamp).getHours();
                            return hour >= 0 && hour < 6;
                        });
                        if (lateConsumptions.length / analysisConsumptions.length > 0.2) {
                            optimizationAreas.push('timing (evitar consumo nocturno)');
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
                            if (avgInterval < 2.5) optimizationAreas.push('espaçamento (aumentar intervalo entre consumos)');
                        }

                        return (
                            <p className={('bg-gray-800/50 border-gray-700') + ' p-4 rounded-lg border'}>
                                💭 <strong className={('text-cyan-400')}>Síntese:</strong>
                                {hasEffort && hasLimits ? (
                                    <> Os teus dados mostram <strong>esforço consistente</strong>{goodDays > 0 && ` (${goodDays} dias bons)`}, mas também <strong>limites claros</strong>{difficultDays > 0 && ` (${difficultDays} dias difíceis)`}.</>
                                ) : hasEffort ? (
                                    <> Os dados mostram controlo razoável — média de {avgPerDay} consumos/dia. Sistema estável mas há espaço para optimização.</>
                                ) : hasLimits ? (
                                    <> Os dados revelam pressão significativa — média de {avgPerDay} consumos/dia com {difficultDays} dias ≥{difficultThreshold}. Sistema sob stress.</>
                                ) : (
                                    <> Dados em construção — ainda a mapear o teu padrão baseline.</>
                                )}
                                {optimizationAreas.length > 0 && (
                                    <> <strong className={('text-orange-300')}>A questão agora: o que queres optimizar no próximo ciclo?</strong> {optimizationAreas.length === 1 ? (
                                        <> Foca em <strong>{optimizationAreas[0]}</strong>.</>
                                    ) : optimizationAreas.length === 2 ? (
                                        <> Duas opções: <strong>{optimizationAreas[0]}</strong> ou <strong>{optimizationAreas[1]}</strong>. Escolhe um eixo.</>
                                    ) : (
                                        <> Opções: {optimizationAreas.slice(0, 3).map((area, i) => (
                                            <span key={i}>
                                                {i > 0 && ', '}
                                                <strong>{area}</strong>
                                            </span>
                                        ))}. Escolhe <strong>um eixo</strong> — não tentes optimizar tudo em simultâneo.</>
                                    )}</>
                                )}
                                {!hasEffort && !hasLimits && <> Continua a registar dados — padrões emergem com o tempo.</>}
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
                                Sobre a tua rotina de sono: estás a deitar-te em média às <strong className={('text-indigo-400')}>{avgBedtimeStr}</strong>.
                                {avgBedtimeHours >= 0 && avgBedtimeHours < 6 ? (
                                    <> <span className={('text-orange-400')}>Deitar muito tarde (madrugada) pode afetar a qualidade do sono e a recuperação.</span> Considera criar uma rotina relaxante antes de dormir para adormecer mais cedo.</>
                                ) : avgBedtimeHours >= 22 && avgBedtimeHours < 24 ? (
                                    <> <span className={('text-green-400')}>Essa é uma boa janela para deitar!</span> Estás a manter uma rotina saudável de sono.</>
                                ) : avgBedtimeHours >= 6 && avgBedtimeHours < 12 ? (
                                    <> Deitar de manhã pode indicar inversão do ciclo de sono, o que pode afetar a tua energia e humor durante o dia.</>
                                ) : (
                                    <> Continua a observar como esta rotina afeta o teu bem-estar geral.</>
                                )}
                                {daysWithoutSleep > 0 && (
                                    <> <span className={('text-red-400')}>⚠️ Dias sem dormir: {daysWithoutSleep} {daysWithoutSleep === 1 ? 'dia' : 'dias'} ({pctDaysWithoutSleep}%).</span> Registar dados de sono ajuda a entender melhor o impacto no teu bem-estar.</>
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
                                💤 <strong>Score de Sono:</strong>{' '}
                                <span className={'text-xl font-bold ' + scoreColor}>
                                    {finalScore.toFixed(1)}/10
                                </span>
                                {trend === 'improving' && <> <span className={('text-green-400')}>↗️ A melhorar</span></>}
                                {trend === 'worsening' && <> <span className={('text-red-400')}>↘️ A piorar</span></>}
                                {trend === 'stable' && <> <span className={('text-gray-400')}>→ Estável</span></>}
                                {' '}
                                <span className={('text-gray-300')}>
                                    (Horas: {hoursScore.toFixed(1)}/5, Regularidade: {regularityScore.toFixed(1)}/5)
                                </span>
                                .
                                {finalScore >= 8 ? (
                                    <> <span className={('text-green-400')}>Excelente! Estás a dormir {avgSleep.toFixed(1)}h em média — mantém esta rotina.</span></>
                                ) : finalScore >= 6 ? (
                                    <> <span className={('text-yellow-400')}>Razoável. Dormes {avgSleep.toFixed(1)}h em média{regularityScore < 3 ? ' mas a tua rotina é irregular — tenta deitar-te à mesma hora' : ''}.</span></>
                                ) : (
                                    <> <span className={('text-red-400')}>⚠️ Alerta: {avgSleep.toFixed(1)}h é insuficiente{regularityScore < 3 ? ' e irregular' : ''}. Prioriza dormir 7-8h e criar uma rotina consistente.</span></>
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
                                📊 <strong className={('text-cyan-400')}>Análise de Quantidade:</strong> Em média, consomes <strong className={('text-purple-400')}>{avgMgPerDay.toFixed(0)}mg por dia</strong> (dados de {uniqueDaysWithMg} {uniqueDaysWithMg === 1 ? 'dia' : 'dias'}).
                                {avgMgPerDay > 300 ? (
                                    <> <span className={('text-orange-400')}>Esta é uma quantidade elevada.</span> Considera estabelecer uma meta de redução gradual.</>
                                ) : avgMgPerDay > 200 ? (
                                    <> Esta é uma quantidade moderada-alta. Há espaço para redução se esse for um objetivo teu.</>
                                ) : avgMgPerDay > 100 ? (
                                    <> <span className={('text-blue-400')}>Esta é uma quantidade moderada.</span> Se estás a trabalhar na redução, estás no caminho certo.</>
                                ) : (
                                    <> <span className={('text-green-400')}>Esta é uma quantidade relativamente baixa!</span> Bom trabalho na gestão de quantidade.</>
                                )}
                                {analysisCycles.length >= 3 && <> Em <strong className={(pctNoLate >= 50 ? ('text-green-400') : ('text-orange-400'))}>{pctNoLate}%</strong> dos dias não houve consumo após a meia-noite{pctNoLate >= 70 ? ' - excelente controlo!' : pctNoLate >= 50 ? ' - continua a melhorar este aspeto.' : '. Evitar consumo tardio pode melhorar a qualidade do sono.'}.</>}
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

                        const areaNames = { water: 'hidratação', food: 'alimentação', rest: 'descanso', social: 'socialização' };
                        const overall = (percentages.water + percentages.food + percentages.rest + percentages.social) / 4;

                        // Sugestões específicas por área
                        const suggestions = {
                            water: 'tenta manter uma garrafa de água visível ao teu lado',
                            food: 'define 3 refeições básicas diárias, mesmo que pequenas',
                            rest: 'agenda pausas de 5-10 minutos ao longo do dia',
                            social: 'envia uma mensagem a alguém uma vez por dia'
                        };

                        return (
                            <p>
                                💧 <strong className={('text-teal-400')}>Autocuidado:</strong> A tua taxa geral está em <strong className={(overall >= 70 ? ('text-green-400') : ('text-orange-400'))}>{overall.toFixed(0)}%</strong>.
                                {lowAreas.length >= 3 ? (
                                    <> Reparei que estás abaixo dos 70% em várias áreas. <span className={('text-yellow-400')}>Foca primeiro em {areaNames[lowAreas[0][0]]} ({lowAreas[0][1].toFixed(0)}%): {suggestions[lowAreas[0][0]]}.</span> Depois expande para {areaNames[lowAreas[1][0]]}.</>
                                ) : lowAreas.length === 2 ? (
                                    <> Duas áreas precisam de atenção: {areaNames[lowAreas[0][0]]} ({lowAreas[0][1].toFixed(0)}%) e {areaNames[lowAreas[1][0]]} ({lowAreas[1][1].toFixed(0)}%). <span className={('text-cyan-400')}>Para {areaNames[lowAreas[0][0]]}: {suggestions[lowAreas[0][0]]}.</span></>
                                ) : lowAreas.length === 1 ? (
                                    <> Só uma área abaixo de 70%: {areaNames[lowAreas[0][0]]} ({lowAreas[0][1].toFixed(0)}%). <span className={('text-blue-400')}>Dica prática: {suggestions[lowAreas[0][0]]}.</span> Pequenos passos contam!</>
                                ) : (
                                    <> <span className={('text-green-400')}>Excelente! Estás a manter bons hábitos em todas as áreas (todas ≥70%).</span> Continua assim - o autocuidado é a base da recuperação.</>
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
                            reduce_frequency: 'Reduzir Frequência',
                            reduce_quantity: 'Reduzir Quantidade (mg)',
                            increase_interval: 'Aumentar Intervalo',
                            limit_last: 'Limitar Último Consumo',
                            bedtime_before: 'Deitar Antes de',
                            sleep_hours: 'Horas de Sono',
                            first_not_before: '☀️ 1º Consumo Após'
                        };

                        return (
                            <p>
                                🎯 <strong className={('text-pink-400')}>Progresso de Metas:</strong> Cumpriste condições das tuas metas <strong>{totalAchievements} vezes</strong> neste período!
                                {goalsWithAchievements.length === uniqueGoals.length ? (
                                    <> <span className={('text-green-400')}>Todas as {uniqueGoals.length} metas ativas tiveram cumprimentos - isso é incrível!</span></>
                                ) : goalsWithAchievements.length > 0 ? (
                                    <> Progredir em {goalsWithAchievements.length} de {uniqueGoals.length} metas.</>
                                ) : (
                                    <> Ainda não atingiste nenhuma meta neste período - ajustar metas é parte do processo.</>
                                )}
                                {bestGoal && bestGoal.percentage > 0 && (
                                    <>
                                        {' '}A tua melhor meta é <strong className={('text-purple-400')}>{goalTypeNames[bestGoal.goal.type]}</strong>: alcançada <strong>{bestGoal.achievements} vezes</strong> em {bestGoal.totalPossible} dias possíveis (<strong className={(bestGoal.percentage >= 70 ? ('text-green-400') : bestGoal.percentage >= 40 ? ('text-yellow-400') : ('text-orange-400'))}>{bestGoal.percentage}%</strong>)
                                        {bestGoal.percentage >= 70 ? ' - excelente!' : bestGoal.percentage >= 40 ? '. Continua a trabalhar nesta meta!' : '. Há espaço para melhorar - revê as tuas estratégias.'}
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
                                💤➡️😊 <strong className={('text-indigo-400')}>Sono e Humor:</strong> Analisei como o teu sono afeta o humor no dia seguinte.
                                {correlation > 0.4 ? (
                                    <> <span className={('text-green-400')}>Correlação forte (+{correlation.toFixed(2)}):</span> Dormir bem <strong>melhora claramente</strong> o teu humor no dia seguinte! Nos dados, mais sono = humor melhor. <strong className={('text-green-300')}>💡 Ação: Prioriza 7-8h de sono - é o teu melhor investimento emocional.</strong></>
                                ) : correlation > 0.2 ? (
                                    <> <span className={('text-blue-400')}>Correlação moderada (+{correlation.toFixed(2)}):</span> Há uma ligação positiva entre sono e humor, mas outros fatores também influenciam. <strong className={('text-blue-300')}>💡 Ação: Melhora a qualidade do sono (ambiente escuro, horário regular).</strong></>
                                ) : correlation < -0.3 ? (
                                    <> <span className={('text-red-400')}>Correlação negativa ({correlation.toFixed(2)}):</span> Curiosamente, mais sono associa-se com pior humor - isto pode indicar que dormir demasiado (possivelmente depressão) ou má qualidade de sono afeta negativamente. <strong className={('text-orange-300')}>💡 Ação: Foca na QUALIDADE do sono, não apenas quantidade. Considera consultar profissional de saúde.</strong></>
                                ) : (
                                    <> <span className={('text-gray-400')}>Correlação fraca ({correlation.toFixed(2)}):</span> Não há uma relação linear clara nos teus dados. Isso não significa que o sono não importa - pode haver um padrão não-linear, ou outros fatores (consumo, stress, socialização) têm mais peso. <strong className={('text-yellow-300')}>💡 Ação: Observa padrões específicos - talvez haja um "sweet spot" de horas de sono para ti.</strong></>
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
                                🔍 <strong className={('text-indigo-400')}>Impacto do Consumo:</strong> Analisei como o consumo de hoje afeta o teu bem-estar amanhã.
                                {moodCorr !== null && Math.abs(moodCorr) >= 0.3 && (
                                    <>
                                        {moodCorr < -0.5 ? (
                                            <> <span className={('text-red-400')}>Correlação forte ({moodCorr.toFixed(2)}):</span> Dias com mais consumo <strong>precedem claramente</strong> dias com humor mais baixo. <strong className={('text-red-300')}>💡 O ciclo é evidente nos teus dados - consumir hoje = sentir-te pior amanhã.</strong></>
                                        ) : moodCorr < -0.3 ? (
                                            <> <span className={('text-orange-400')}>Correlação moderada ({moodCorr.toFixed(2)}):</span> Há um padrão onde dias de mais consumo tendem a preceder humor mais baixo. O impacto emocional existe, embora outros fatores também influenciem. <strong className={('text-orange-300')}>💡 Reduzir consumo pode melhorar o teu estado emocional.</strong></>
                                        ) : moodCorr > 0.3 ? (
                                            <> <span className={('text-yellow-400')}>Correlação positiva ({moodCorr.toFixed(2)}):</span> Curiosamente, mais consumo associa-se com melhor humor no dia seguinte - isto pode indicar alívio temporário, autocontrolo diferente em dias bons, ou outros fatores. <strong className={('text-yellow-300')}>💡 Observa se este padrão se mantém a longo prazo.</strong></>
                                        ) : null}
                                    </>
                                )}
                                {energyCorr !== null && Math.abs(energyCorr) >= 0.3 && (
                                    <>
                                        {energyCorr < -0.5 ? (
                                            <> <span className={('text-red-400')}>Na energia: correlação forte ({energyCorr.toFixed(2)})</span> - mais consumo resulta em fadiga clara no dia seguinte. <strong className={('text-red-300')}>O teu corpo está a pedir descanso da substância.</strong></>
                                        ) : energyCorr < -0.3 ? (
                                            <> <span className={('text-orange-400')}>Na energia: correlação moderada ({energyCorr.toFixed(2)})</span> - consumo afeta os teus níveis de energia no dia seguinte. O corpo está em recuperação. <strong className={('text-orange-300')}>💡 Mais descanso e hidratação nos dias seguintes pode ajudar.</strong></>
                                        ) : energyCorr > 0.3 ? (
                                            <> <span className={('text-blue-400')}>Na energia: correlação positiva ({energyCorr.toFixed(2)})</span> - mais consumo associa-se com mais energia no dia seguinte. Observa se isto é sustentável ou se há um efeito rebote posterior.</>
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
                                🎯 <strong className={('text-yellow-400')}>Perfil de Risco:</strong> Identifiquei um padrão importante:
                                {moodDiff > 0 ? (
                                    <> <span className={('text-orange-400')}>Dias com mais consumo tendem a ser precedidos por humor mais baixo no dia anterior</span> (diferença de {moodDiff.toFixed(1)} pontos). <strong>Isto sugere que humor baixo é um gatilho para ti.</strong> Quando te sentires em baixo, esse é o momento de usar estratégias de prevenção - contacta alguém, faz exercício, ou usa técnicas de mindfulness.</>
                                ) : (
                                    <> Dias com mais consumo são precedidos por humor mais alto (diferença de {Math.abs(moodDiff).toFixed(1)} pontos) - isto pode indicar que celebração ou euforia são gatilhos. Estar consciente disto ajuda-te a moderar.</>
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
                                    <>
                                        📈 <strong className={('text-orange-400')}>Tendência:</strong> O consumo aumentou <strong>{Math.abs(percentChange).toFixed(0)}%</strong> neste período comparado com o anterior (de {previousPeriod.length} para {currentPeriod.length} consumos).
                                        <span className={('text-yellow-400')}> Sem julgamento - só dados. O que mudou? Stress? Menos sono? Menos apoio? Identifica o trigger e ajusta o plano.</span>
                                    </>
                                ) : (
                                    <>
                                        📉 <strong className={('text-green-400')}>Tendência:</strong> O consumo diminuiu <strong>{Math.abs(percentChange).toFixed(0)}%</strong> neste período comparado com o anterior (de {previousPeriod.length} para {currentPeriod.length} consumos).
                                        <span className={'font-medium ' + ('text-green-400')}> Parabéns! Isto é progresso real. O que fizeste diferente? Identifica essas estratégias para continuar este caminho!</span>
                                    </>
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
                                ⚡ <strong className={('text-yellow-400')}>Energia e Consumo:</strong> Das últimas {countWithData} vezes que consumiste, <strong className={('text-yellow-300')}>{countWithLowEnergy} tinham check-in com energia baixa (&lt;4)</strong>.
                                {percentage >= 70 ? (
                                    <> <span className={('text-red-400')}>Isto sugere uma forte correlação entre cansaço e consumo.</span> Considera estratégias de gestão de energia (pausas, descanso, nutrição) como parte do teu plano de redução de danos.</>
                                ) : (
                                    <> Isto sugere que o cansaço pode ser um gatilho. Identifica formas de recarregar energia antes de recorrer ao consumo.</>
                                )}
                            </p>
                        );
                    })()}


                    {/* Paragraph 12: Autoconhecimento */}
                    {(analysisWellbeing.length > 3 || analysisCycles.length > 2) && (
                        <p>
                            ✨ <strong className={('text-cyan-400')}>Autoconhecimento:</strong> Estás a registar de forma consistente
                            {analysisWellbeing.length > 0 && <> (bem-estar)</>}
                            {analysisCycles.length > 0 && <>{analysisWellbeing.length > 0 && ','} ciclos de sono</>}.
                            <span className={'font-medium ' + ('text-cyan-400')}> Isto já é um passo enorme! Registar é autoconsciência. Os padrões vão-se tornando mais claros com o tempo, e isso dá-te poder para agir.</span>
                        </p>
                    )}

                    {/* Paragraph 13: Tu Tens o Controlo */}
                    <p className={'font-medium ' + ('text-purple-300')}>
                        💪 <strong>Tu tens o controlo.</strong> Estes dados são teus. Este progresso é teu. Este poder de escolha é teu.
                        <span className={('text-purple-400')}> Cada decisão que tomas - registar, refletir, ajustar - é um ato de autonomia. Continua a usar esta app, continua a analisar, continua a crescer. 🚀</span>
                    </p>

                    {/* Paragraph 14: Closing & Next Steps */}
                    <p className={'font-medium pt-2 border-t ' + ('border-gray-700 text-purple-400')}>
                        🤝 <strong>Compromisso:</strong> O simples facto de estares aqui, a registar, a refletir, a analisar - isso já é mudança.
                        <span> Redução de danos não é perfeição, é progresso. E tu estás a progredir, um dia de cada vez.</span>
                        <br/><br/>
                        Lembra-te: a recuperação não é linear. Haverá dias melhores e piores, e isso é normal. O importante é continuares a aparecer.
                        Estou orgulhoso/a do caminho que estás a percorrer. Vamos continuar juntos. 💜
                    </p>
                </div>
            </div>
        </div>
    );
});
