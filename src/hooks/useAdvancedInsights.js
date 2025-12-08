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

        // 1. OUTLIERS SIMPLES
        // "28 de novembro teve 11 consumos — 3 acima da tua média de 8. É um dos teus 3 dias mais altos."
        if (analysisConsumptions.length >= 5) {
            const consumptionsByDate = {};
            analysisConsumptions.forEach(c => {
                if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                consumptionsByDate[c.date]++;
            });

            const dailyCounts = Object.entries(consumptionsByDate).map(([date, count]) => ({ date, count }));
            if (dailyCounts.length > 0) {
                const avgDaily = dailyCounts.reduce((sum, d) => sum + d.count, 0) / dailyCounts.length;
                const topDays = dailyCounts.sort((a, b) => b.count - a.count).slice(0, 3);

                if (topDays.length > 0 && topDays[0].count >= avgDaily + 2) {
                     const top1 = topDays[0];
                     const diffFromAvg = (top1.count - avgDaily).toFixed(0);
                     const dateStr = new Date(top1.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' });

                     generatedInsights.push({
                        type: 'outlier',
                        title: '📍 Outliers',
                        content: `${dateStr} teve ${top1.count} consumos — ${diffFromAvg} acima da tua média de ${avgDaily.toFixed(1)}. É ${topDays.length === 1 ? 'o teu dia mais alto' : `um dos teus ${topDays.length} dias mais altos`}.`,
                        subContent: 'Outliers não são falhas — são dados. Que gap de necessidades foi preenchido nesses dias?',
                        level: 'warning'
                     });
                }
            }
        }


        // 2. CLUSTERS DE COMPORTAMENTO (Day Types A/B/C)
        if (analysisConsumptions.length >= 10 || analysisCycles.length >= 5) {
             const dailyData = {};
             // Aggregate data by date
             analysisConsumptions.forEach(c => {
                 if (!dailyData[c.date]) dailyData[c.date] = { consumos: 0, sono: null, humor: null };
                 dailyData[c.date].consumos++;
             });
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
                 equilibrio: []   // consumo médio (7-10) + humor ≥6 (Adjusted logic from user prompt: consumo médio + humor bom)
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
                 if (clusters.altaPressao.length > 0) content.push(`Dias "Alta Pressão" (${clusters.altaPressao.length}): Muito consumo + pouco sono + humor estável. Estás a "pedalar no limiar" — funcionas, mas à custa de estimulação.`);
                 if (clusters.paradoxo.length > 0) content.push(`Dias "Paradoxo" (${clusters.paradoxo.length}): Pouco consumo + muito sono + humor baixo. Sono não compensa humor baixo — possível depressão mascarada ou outro fator.`);
                 if (clusters.equilibrio.length > 0) content.push(`Dias "Equilíbrio" (${clusters.equilibrio.length}): Consumo moderado + humor bom. Este é o teu sweet spot atual.`);

                 generatedInsights.push({
                     type: 'cluster',
                     title: '🔬 Padrões de Comportamento',
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
                 // Avg per day calculation needs grouping by date first
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
                         title: '📈 Micro-tendência',
                         content: `Últimos 7 dias: média de ${avgLast7.toFixed(1)} consumos/dia vs ${avgPrev21.toFixed(1)} nas 3 semanas anteriores (${formatPercent(percentChange)}).`,
                         subContent: analysis,
                         level: level
                     });
                 }
             }
        }

        // 4. NARRATIVAS DINÂMICAS (Gatilhos Emocionais)
        if (analysisWellbeing.length >= 5) {
            const emotionImpact = {};
            const consumptionsByDate = {};
            analysisConsumptions.forEach(c => {
                if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                consumptionsByDate[c.date]++;
            });

            // Calculate global average daily consumption
            const dailyCounts = Object.values(consumptionsByDate);
            const avgDaily = dailyCounts.length > 0 ? dailyCounts.reduce((a,b)=>a+b,0)/dailyCounts.length : 0;

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
                    diff: (data.totalCons / data.days) - avgDaily
                }))
                .filter(e => Math.abs(e.diff) >= 2)
                .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)); // Sort by impact magnitude

            if (significantEmotions.length > 0) {
                const items = significantEmotions.slice(0, 2).map(e => {
                    if (e.diff > 0) return `Emoção "${e.emotion}" correlaciona com +${e.diff.toFixed(1)} consumos acima da média (${e.days} dias). É gatilho validado, não especulação.`;
                    return `Emoção "${e.emotion}" correlaciona com ${Math.abs(e.diff).toFixed(1)} consumos ABAIXO da média. Factor protetor — cultivar.`;
                });

                generatedInsights.push({
                    type: 'correlation',
                    title: '🎭 Gatilhos Emocionais Validados',
                    content: items,
                    level: 'warning'
                });
            }
        }

        // 5. CONTEXTO SOCIAL / AUTOCUIDADO
        if (analysisWellbeing.length >= 5) {
             const consumptionsByDate = {};
             analysisConsumptions.forEach(c => {
                 if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                 consumptionsByDate[c.date]++;
             });
             const avgDaily = Object.values(consumptionsByDate).length > 0 ? Object.values(consumptionsByDate).reduce((a,b)=>a+b,0)/Object.values(consumptionsByDate).length : 0;

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
             const areaNames = { water: 'água suficiente', food: 'refeições nutritivas', social: 'socialização' };

             Object.entries(areas).forEach(([area, values]) => {
                 if (values.length < 3) return;
                 const avgWith = values.reduce((a,b)=>a+b,0)/values.length;
                 const percentDiff = ((avgWith - avgDaily) / avgDaily * 100);
                 if (Math.abs(percentDiff) >= 10) {
                     impacts.push({ area, percentDiff, days: values.length });
                 }
             });

             if (impacts.length > 0) {
                 impacts.sort((a,b) => a.percentDiff - b.percentDiff); // Best protectors first (most negative diff)
                 const topImpact = impacts[0];
                 let text = '';
                 if (topImpact.percentDiff < 0) {
                     text = `Nos dias com ${areaNames[topImpact.area]}, consumiste ${Math.abs(topImpact.percentDiff).toFixed(0)}% menos (${topImpact.days} dias). Factor protetor claro — não é coincidência.`;
                 } else {
                     text = `Nos dias com ${areaNames[topImpact.area]}, consumiste ${topImpact.percentDiff.toFixed(0)}% mais. Correlação inesperada — explorar.`;
                 }

                 generatedInsights.push({
                     type: 'context',
                     title: '💧 Contexto Autocuidado',
                     content: text,
                     level: topImpact.percentDiff < 0 ? 'success' : 'warning'
                 });
             }
        }

        // 6. MICRO-TEMPO (Intervalos em dias difíceis)
        if (analysisConsumptions.length >= 20) {
             const consumptionsByDate = {};
             analysisConsumptions.forEach(c => {
                 if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = [];
                 consumptionsByDate[c.date].push(c);
             });

             const intervalsHigh = []; // Days >= 10 consumptions
             const intervalsNormal = []; // Days < 10 consumptions

             Object.values(consumptionsByDate).forEach(dayCons => {
                 if (dayCons.length < 2) return;
                 const sorted = [...dayCons].sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp));
                 for(let i=1; i<sorted.length; i++){
                     const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000*60*60);
                     if (dayCons.length >= 10) intervalsHigh.push(diff);
                     else intervalsNormal.push(diff);
                 }
             });

             if (intervalsHigh.length >= 5 && intervalsNormal.length >= 5) {
                 const avgHigh = intervalsHigh.reduce((a,b)=>a+b,0)/intervalsHigh.length;
                 const avgNormal = intervalsNormal.reduce((a,b)=>a+b,0)/intervalsNormal.length;

                 if (Math.abs(avgHigh - avgNormal) >= 0.5) {
                     let tactic = '';
                     if (avgHigh < 2) tactic = 'Indica padrão de redosing compulsivo quando frequência é alta. Tática: pré-dosagem/espaçamento forçado nesses dias.';
                     else tactic = 'Padrão de aceleração em dias de pressão.';

                     generatedInsights.push({
                         type: 'microtime',
                         title: '⏱️ Micro-Tempo',
                         content: `Em dias difíceis (≥10 consumos), o intervalo médio cai para ${avgHigh.toFixed(1)}h (vs ${avgNormal.toFixed(1)}h em dias normais).`,
                         subContent: tactic,
                         level: 'warning'
                     });
                 }
             }
        }

        // 7. DISSONÂNCIA SONO E HUMOR (New Feature based on Prompt)
        // "A correlação fraca (−0.19) entre sono e humor é contra-intuitiva..."
        if (analysisWellbeing.length >= 10) {
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
                         title: '💤➡️😊 Dissonância Sono e Humor',
                         content: `A correlação fraca (${correlation.toFixed(2)}) entre sono e humor é contra-intuitiva. A falta de relação linear sugere que o consumo diário pode estar a mascarar o impacto da privação de sono.`,
                         subContent: '💡 Ação Tática: Testa o que acontece com a tua energia 48h após um dia de pouco sono. A exaustão pode ser acumulada.',
                         level: 'info'
                     });
                }
            }
        }

        // 8. AMPLITUDE EMOCIONAL (New Feature based on Prompt)
        // "O humor médio foi 5.0, mas a amplitude (desvio padrão) foi 2.8..."
        if (analysisWellbeing.length >= 5) {
            const moodValues = analysisWellbeing.filter(w => w.mood).map(w => parseInt(w.mood));
            if (moodValues.length >= 5) {
                const mean = moodValues.reduce((a,b)=>a+b,0)/moodValues.length;
                const variance = moodValues.reduce((a,b) => a + Math.pow(b-mean, 2), 0) / moodValues.length;
                const stdDev = Math.sqrt(variance);

                if (stdDev > 2.0) {
                    generatedInsights.push({
                         type: 'amplitude',
                         title: '⚡ Amplitude Emocional',
                         content: `O humor médio foi ${mean.toFixed(1)}, mas o desvio padrão foi ${stdDev.toFixed(1)} (alto). Isto significa oscilações rápidas de picos altos/baixos.`,
                         subContent: 'A moderação é uma ilusão estatística aqui. A flutuação pode ser efeito direto de come-up/come-down rápido.',
                         level: 'warning'
                    });
                }
            }
        }

        return generatedInsights;
    }, [analysisConsumptions, analysisWellbeing, analysisCycles, analysisReflections, analysisDailyLogs, analysisThoughts, patternsPeriod]); // Re-calculate when analyzed data changes

    return insights;
};
