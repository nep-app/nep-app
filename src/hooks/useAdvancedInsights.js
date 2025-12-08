import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { analyzeMultipleNotes, identifyThemes } from '../utils/sentimentAnalysis';
import { safeToISODate, getDateDaysAgo } from '../utils/helpers';
import * as analyticsService from '../services/analyticsService';

export const useAdvancedInsights = (analysisConsumptions, analysisWellbeing, analysisCycles, analysisReflections, analysisDailyLogs, analysisThoughts, patternsPeriod) => {
    const { consumptions, wellbeingLogs, cycles } = useData(); // Global data for broader context
    const metrics = useMetrics();

    const insights = useMemo(() => {
        const generatedInsights = [];

        // Helper for formatting
        const formatPercent = (val) => (val > 0 ? '+' : '') + val.toFixed(0) + '%';

        // Calculate Global Baselines (using all data)
        const globalDailyCounts = {};
        consumptions.forEach(c => {
            if (!globalDailyCounts[c.date]) globalDailyCounts[c.date] = 0;
            globalDailyCounts[c.date]++;
        });
        const globalDays = Object.values(globalDailyCounts);
        const globalAvg = globalDays.length > 0 ? globalDays.reduce((a,b)=>a+b,0)/globalDays.length : 0;

        // 0. QUICK SUMMARY (Always show for short periods)
        if (patternsPeriod === 'hoje' && analysisConsumptions.length > 0) {
            const todayCount = analysisConsumptions.length;
            const diff = todayCount - globalAvg;

            let status = '';
            let level = 'info';
            if (todayCount > globalAvg + 2) {
                status = 'Acima da média';
                level = 'warning';
            } else if (todayCount < globalAvg - 2) {
                status = 'Abaixo da média';
                level = 'success';
            } else {
                status = 'Dentro da média';
            }

            generatedInsights.push({
                type: 'summary',
                title: '📅 Estado Atual',
                content: `Hoje: ${todayCount} consumos. Média histórica: ${globalAvg.toFixed(1)}.`,
                subContent: `${status} (${diff > 0 ? '+' : ''}${diff.toFixed(1)}).`,
                level: level
            });
        }

        // 1. OUTLIERS SIMPLES (Refined logic: compare current period days against GLOBAL average)
        if (analysisConsumptions.length >= 1) {
            const currentPeriodCounts = {};
            analysisConsumptions.forEach(c => {
                if (!currentPeriodCounts[c.date]) currentPeriodCounts[c.date] = 0;
                currentPeriodCounts[c.date]++;
            });

            const topDays = Object.entries(currentPeriodCounts)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => b.count - a.count);

            if (topDays.length > 0) {
                const topDay = topDays[0];
                // Flag if top day is significantly higher than global average
                if (topDay.count >= globalAvg + 3) { // Threshold: +3 over average
                     const diffFromAvg = (topDay.count - globalAvg).toFixed(0);
                     const dateStr = new Date(topDay.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });

                     generatedInsights.push({
                        type: 'outlier',
                        title: '📍 Pico Detetado',
                        content: `${dateStr} teve ${topDay.count} consumos — ${diffFromAvg} acima da tua média geral de ${globalAvg.toFixed(1)}.`,
                        subContent: 'Outliers não são falhas — são dados. Que gap de necessidades foi preenchido?',
                        level: 'warning'
                     });
                }
            }
        }


        // 2. CLUSTERS DE COMPORTAMENTO (Day Types A/B/C)
        if (analysisConsumptions.length >= 5 || (patternsPeriod === 'semana' && analysisConsumptions.length > 0)) {
             const dailyData = {};
             // Aggregate data by date for current view
             analysisConsumptions.forEach(c => {
                 if (!dailyData[c.date]) dailyData[c.date] = { consumos: 0, sono: null, humor: null };
                 dailyData[c.date].consumos++;
             });

             // Match with wellbeing/cycles in the current view
             analysisCycles.forEach(cycle => {
                 const cDate = cycle.date || new Date(cycle.timestamp).toISOString().split('T')[0];
                 if (dailyData[cDate] && cycle.sleep) dailyData[cDate].sono = parseFloat(cycle.sleep);
             });
             analysisWellbeing.forEach(w => {
                 const wDate = w.date || safeToISODate(w.timestamp);
                 if (wDate && dailyData[wDate] && w.mood) dailyData[wDate].humor = parseInt(w.mood);
             });

             const clusters = {
                 altaPressao: [], // ≥10 consumos + <6h sono + humor ≥5
                 paradoxo: [],    // ≤7 consumos + ≥7h sono + humor <5
                 equilibrio: []   // consumo médio (7-10) + humor ≥6
             };

             Object.entries(dailyData).forEach(([date, d]) => {
                 if (d.consumos >= 10 && d.sono !== null && d.sono < 6 && d.humor !== null && d.humor >= 5) {
                     clusters.altaPressao.push(date);
                 } else if (d.consumos <= 7 && d.sono !== null && d.sono >= 7 && d.humor !== null && d.humor < 5) {
                     clusters.paradoxo.push(date);
                 } else if (d.consumos >= 7 && d.consumos < 10 && d.humor !== null && d.humor >= 6) {
                     clusters.equilibrio.push(date);
                 }
             });

             if (clusters.altaPressao.length > 0 || clusters.paradoxo.length > 0 || clusters.equilibrio.length > 0) {
                 const content = [];
                 if (clusters.altaPressao.length > 0) content.push(`Dias "Alta Pressão" (${clusters.altaPressao.length}): Muito consumo + pouco sono. Estás a "pedalar no limiar".`);
                 if (clusters.paradoxo.length > 0) content.push(`Dias "Paradoxo" (${clusters.paradoxo.length}): Pouco consumo + muito sono + humor baixo. Depressão mascarada?`);
                 if (clusters.equilibrio.length > 0) content.push(`Dias "Equilíbrio" (${clusters.equilibrio.length}): Consumo moderado + humor bom. Sweet spot.`);

                 generatedInsights.push({
                     type: 'cluster',
                     title: '🔬 Padrões Identificados',
                     content: content,
                     level: 'info'
                 });
             }
        }

        // 3. MICRO-COMPARAÇÕES TEMPORAIS
        if (analysisConsumptions.length >= 14) {
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

             if (last7Days.length >= 3 && previous21Days.length >= 10) {
                 const groupDaily = (arr) => {
                     const map = {};
                     arr.forEach(c => { if(!map[c.date]) map[c.date]=0; map[c.date]++; });
                     return Object.values(map);
                 };
                 const dailyLast7 = groupDaily(last7Days);
                 const dailyPrev21 = groupDaily(previous21Days);

                 const avgLast7 = dailyLast7.reduce((a,b)=>a+b,0)/dailyLast7.length;
                 const avgPrev21 = dailyPrev21.reduce((a,b)=>a+b,0)/dailyPrev21.length;

                 const percentChange = ((avgLast7 - avgPrev21) / avgPrev21 * 100);

                 if (Math.abs(percentChange) >= 5) {
                     let analysis = '';
                     let level = 'info';
                     if (percentChange > 15) {
                         analysis = 'Aumento significativo. Sistema a desviar — identificar causa antes que normalize.';
                         level = 'warning';
                     } else if (percentChange < -15) {
                         analysis = 'Redução clara. O que mudou? Replicar essas condições.';
                         level = 'success';
                     } else if (percentChange > 0) {
                         analysis = 'Ligeira subida — monitorizar.';
                     } else {
                         analysis = 'Ligeira descida — bom sinal.';
                     }

                     generatedInsights.push({
                         type: 'trend',
                         title: '📈 Micro-tendência (7 vs 21 dias)',
                         content: `Média recente: ${avgLast7.toFixed(1)} vs Anterior: ${avgPrev21.toFixed(1)} (${formatPercent(percentChange)}).`,
                         subContent: analysis,
                         level: level
                     });
                 }
             }
        }

        // 4. NARRATIVAS DINÂMICAS (Gatilhos Emocionais)
        if (analysisWellbeing.length >= 3) {
            const emotionImpact = {};
            const consumptionsByDate = {};
            analysisConsumptions.forEach(c => {
                if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                consumptionsByDate[c.date]++;
            });

            analysisWellbeing.forEach(w => {
                const wDate = w.date || safeToISODate(w.timestamp);
                if (!wDate || !w.emotions || w.emotions.length === 0) return;
                const dayCons = consumptionsByDate[wDate] || 0;

                w.emotions.forEach(emotion => {
                    if (!emotionImpact[emotion]) emotionImpact[emotion] = { days: 0, totalCons: 0 };
                    emotionImpact[emotion].days++;
                    emotionImpact[emotion].totalCons += dayCons;
                });
            });

            const significantEmotions = Object.entries(emotionImpact)
                .filter(([_, data]) => data.days >= 2)
                .map(([emotion, data]) => ({
                    emotion,
                    avg: data.totalCons / data.days,
                    days: data.days,
                    diff: (data.totalCons / data.days) - globalAvg
                }))
                .filter(e => Math.abs(e.diff) >= 2)
                .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

            if (significantEmotions.length > 0) {
                const items = significantEmotions.slice(0, 2).map(e => {
                    if (e.diff > 0) return `"${e.emotion}" → +${e.diff.toFixed(1)} consumos vs média geral.`;
                    return `"${e.emotion}" → ${e.diff.toFixed(1)} consumos vs média geral (Protetor).`;
                });

                generatedInsights.push({
                    type: 'correlation',
                    title: '🎭 Gatilhos no Período',
                    content: items,
                    level: 'warning'
                });
            }
        }

        // 5. ANÁLISE DE SENTIMENTO E TEXTO (NEW)
        const reflectionNotes = analysisReflections.map(r => r.answer).filter(Boolean);
        const dailyLogNotes = analysisDailyLogs.map(l => l.notes).filter(Boolean);
        const thoughtNotes = analysisThoughts.map(t => t.content).filter(Boolean);
        const allNotes = [...reflectionNotes, ...dailyLogNotes, ...thoughtNotes];

        if (allNotes.length >= 2) { // Minimal data needed
            const sentiment = analyzeMultipleNotes(allNotes);

            if (sentiment.noteCount > 0) {
                 const themes = identifyThemes(allNotes);
                 const topTheme = Object.entries(themes)
                    .sort((a, b) => b[1].count - a[1].count)
                    .find(([_, data]) => data.count > 0);

                 let content = `Detetado tom ${sentiment.overall === 'very_negative' ? 'muito negativo' : sentiment.overall === 'negative' ? 'negativo' : sentiment.overall === 'positive' ? 'positivo' : 'neutro/misto'} nas tuas notas.`;

                 if (topTheme) {
                     const themeLabels = { sleep: 'sono', stress: 'stress', energy: 'energia', mood: 'humor', focus: 'foco', social: 'social', health: 'saúde' };
                     content += ` Tema recorrente: ${themeLabels[topTheme[0]]}.`;
                 }

                 let subContent = '';
                 if (sentiment.trend === 'worsening') subContent = 'A tua narrativa interna está a ficar mais pesada nos últimos dias.';
                 else if (sentiment.trend === 'improving') subContent = 'Nota-se uma melhoria na forma como escreves sobre ti.';

                 if (sentiment.overall !== 'neutral' || subContent) {
                     generatedInsights.push({
                         type: 'sentiment',
                         title: '📝 Narrativa Interna',
                         content: content,
                         subContent: subContent || 'A forma como escreves reflete o teu estado.',
                         level: sentiment.overall.includes('negative') ? 'warning' : 'info'
                     });
                 }
            }
        }

        // 6. CONTEXTO SOCIAL / AUTOCUIDADO
        if (analysisWellbeing.length >= 3) {
             const consumptionsByDate = {};
             analysisConsumptions.forEach(c => {
                 if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                 consumptionsByDate[c.date]++;
             });

             const areas = { water: [], food: [], social: [] };
             analysisWellbeing.forEach(w => {
                 const wDate = w.date || safeToISODate(w.timestamp);
                 if (!wDate) return;
                 const dayCons = consumptionsByDate[wDate] || 0;
                 if (w.water === true) areas.water.push(dayCons);
                 if (w.food === true) areas.food.push(dayCons);
                 if (w.social === true) areas.social.push(dayCons);
             });

             const impacts = [];
             const areaNames = { water: 'água', food: 'nutrição', social: 'social' };

             Object.entries(areas).forEach(([area, values]) => {
                 if (values.length < 2) return;
                 const avgWith = values.reduce((a,b)=>a+b,0)/values.length;
                 const percentDiff = ((avgWith - globalAvg) / globalAvg * 100);
                 if (Math.abs(percentDiff) >= 15) {
                     impacts.push({ area, percentDiff, days: values.length });
                 }
             });

             if (impacts.length > 0) {
                 impacts.sort((a,b) => a.percentDiff - b.percentDiff);
                 const topImpact = impacts[0];
                 let text = '';
                 if (topImpact.percentDiff < 0) {
                     text = `Dias com ${areaNames[topImpact.area]}: ${Math.abs(topImpact.percentDiff).toFixed(0)}% menos consumo que a tua média.`;
                 } else {
                     text = `Dias com ${areaNames[topImpact.area]}: ${topImpact.percentDiff.toFixed(0)}% mais consumo.`;
                 }

                 generatedInsights.push({
                     type: 'context',
                     title: '💧 Contexto',
                     content: text,
                     level: topImpact.percentDiff < 0 ? 'success' : 'warning'
                 });
             }
        }

        // 7. MICRO-TEMPO (Intervalos em dias difíceis)
        if (analysisConsumptions.length >= 10) {
             const consumptionsByDate = {};
             analysisConsumptions.forEach(c => {
                 if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = [];
                 consumptionsByDate[c.date].push(c);
             });

             const intervalsHigh = [];
             const intervalsNormal = [];

             Object.values(consumptionsByDate).forEach(dayCons => {
                 if (dayCons.length < 2) return;
                 const sorted = [...dayCons].sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp));
                 for(let i=1; i<sorted.length; i++){
                     const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000*60*60);
                     if (dayCons.length >= 10) intervalsHigh.push(diff);
                     else intervalsNormal.push(diff);
                 }
             });

             if (intervalsHigh.length >= 3 && intervalsNormal.length >= 3) {
                 const avgHigh = intervalsHigh.reduce((a,b)=>a+b,0)/intervalsHigh.length;
                 const avgNormal = intervalsNormal.reduce((a,b)=>a+b,0)/intervalsNormal.length;

                 if (Math.abs(avgHigh - avgNormal) >= 0.5) {
                     generatedInsights.push({
                         type: 'microtime',
                         title: '⏱️ Aceleração',
                         content: `Em dias de pico, intervalo cai para ${avgHigh.toFixed(1)}h (vs ${avgNormal.toFixed(1)}h).`,
                         subContent: avgHigh < 2 ? 'Risco de redosing compulsivo.' : 'Aceleração notável.',
                         level: 'warning'
                     });
                 }
             }
        }

        // 8. DISSONÂNCIA SONO E HUMOR
        if (analysisWellbeing.length >= 5) {
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
            for (let i=0; i<sortedDates.length-1; i++) {
                const today = dailyData[sortedDates[i]];
                const tomorrow = dailyData[sortedDates[i+1]];
                if (today.sleep!==null && tomorrow.mood!==null) {
                    nextDaySleepMood.push({ sleep: today.sleep, mood: tomorrow.mood });
                }
            }
            if (nextDaySleepMood.length >= 5) {
                const correlation = analyticsService.calculatePearsonCorrelation(nextDaySleepMood, 'sleep', 'mood');
                if (correlation !== null && correlation > -0.2 && correlation < 0.2) {
                     generatedInsights.push({
                         type: 'dissonance',
                         title: '💤 Dissonância Sono/Humor',
                         content: `Correlação fraca (${correlation.toFixed(2)}) entre sono e humor.`,
                         subContent: 'O consumo pode estar a mascarar a exaustão.',
                         level: 'info'
                     });
                }
            }
        }

        // 9. AMPLITUDE EMOCIONAL
        if (analysisWellbeing.length >= 3) {
            const moodValues = analysisWellbeing.filter(w => w.mood).map(w => parseInt(w.mood));
            if (moodValues.length >= 3) {
                const mean = moodValues.reduce((a,b)=>a+b,0)/moodValues.length;
                const variance = moodValues.reduce((a,b) => a + Math.pow(b-mean, 2), 0) / moodValues.length;
                const stdDev = Math.sqrt(variance);

                if (stdDev > 2.0) {
                    generatedInsights.push({
                         type: 'amplitude',
                         title: '⚡ Instabilidade Emocional',
                         content: `Desvio padrão de ${stdDev.toFixed(1)} no humor. Oscilações fortes detetadas.`,
                         subContent: 'Cuidado com o efeito montanha-russa.',
                         level: 'warning'
                    });
                }
            }
        }

        return generatedInsights;
    }, [analysisConsumptions, analysisWellbeing, analysisCycles, analysisReflections, analysisDailyLogs, analysisThoughts, patternsPeriod, consumptions, wellbeingLogs, cycles]);

    return insights;
};
