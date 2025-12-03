import React, { useMemo, lazy, Suspense } from 'react';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import { safeToISODate, formatDateShort, formatDateWithWeekday, formatDateTime, getDateDaysAgo } from '../utils/helpers';

const WellbeingChart = lazy(() => import('../components/WellbeingChart'));

const { getDateRangeForPeriod, filterByDateRange, getPeriodLabel, calculatePearsonCorrelation } = analyticsService;

export function AnalysesView({
    analysisSubView,
    setAnalysisSubView,
    patternsPeriod,
    setPatternsPeriod,
    patternsPeriodOffset,
    setPatternsPeriodOffset,
    getGoalAchievementCount
}) {
    const { consumptions, wellbeingLogs, cycles, dailyLogs, goals, reflections } = useData();
    const { darkMode, currentCycle } = useUI();
    const metrics = useMetrics();

    return (
                                <div className="space-y-6">
                                    <h2 className={'text-2xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>Análises</h2>

                                    {/* Temporal Filters */}
                                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-4 border'}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={'text-sm font-semibold ' + (themeClasses.textPrimaryAlt(darkMode))}>Período de análise</div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setPatternsPeriodOffset(prev => prev + 1)} disabled={patternsPeriodOffset >= 100 || patternsPeriod === 'tudo'} className={(patternsPeriodOffset >= 100 || patternsPeriod === 'tudo') ? 'opacity-30 cursor-not-allowed p-1.5 rounded transition' : 'p-1.5 rounded transition hover:bg-gray-700'}>
                                                    <Icons.ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setPatternsPeriodOffset(prev => Math.max(0, prev - 1))} disabled={patternsPeriodOffset === 0 || patternsPeriod === 'tudo'} className={(patternsPeriodOffset === 0 || patternsPeriod === 'tudo') ? 'opacity-30 cursor-not-allowed p-1.5 rounded transition' : 'p-1.5 rounded transition hover:bg-gray-700'}>
                                                    <Icons.ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                                                <button key={period} onClick={() => { setPatternsPeriod(period); setPatternsPeriodOffset(0); }} className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ' + (patternsPeriod === period ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                                    {period === 'hoje' && 'Hoje'}
                                                    {period === 'semana' && 'Semana'}
                                                    {period === 'mes' && 'Mês'}
                                                    {period === 'tudo' && 'Tudo'}
                                                </button>
                                            ))}
                                        </div>
                                        {patternsPeriod !== 'tudo' && (
                                            <div className={'text-xs mt-2 text-center ' + (themeClasses.textTertiary(darkMode))}>
                                                {(() => {
                                                    const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
                                                    return new Date(dateRange.start).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ' - ' + new Date(dateRange.end).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {(() => {
                                        // Apply temporal filter to all data
                                        const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
                                        const filteredConsumptions = filterByDateRange(consumptions, dateRange);
                                        const filteredWellbeingLogs = filterByDateRange(wellbeingLogs, dateRange);
                                        const filteredCycles = filterByDateRange(cycles, dateRange);
                                        const filteredDailyLogs = filterByDateRange(dailyLogs, dateRange);
                                        const filteredReflections = filterByDateRange(reflections, dateRange);
                                        const filteredThoughts = filterByDateRange(thoughts, dateRange);

                                        // Usar dados filtrados diretamente (sem excluir dia atual)
                                        const analysisConsumptions = filteredConsumptions;
                                        const analysisWellbeing = filteredWellbeingLogs;
                                        const analysisCycles = filteredCycles;
                                        const analysisDailyLogs = filteredDailyLogs;
                                        const analysisReflections = filteredReflections;
                                        const analysisThoughts = filteredThoughts;

                                            // Calculate all needed data
                                            const byHour = {};
                                            analysisConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                byHour[hour] = (byHour[hour] || 0) + 1;
                                            });

                                            const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
                                            analysisConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                if (hour >= 6 && hour < 12) byPartOfDay.manha++;
                                                else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
                                                else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
                                                else byPartOfDay.madrugada++;
                                            });

                                            const byWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                                            const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                                            analysisConsumptions.forEach(c => {
                                                const day = new Date(c.timestamp).getDay();
                                                byWeekday[day]++;
                                            });

                                            const sorted = [...analysisConsumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                                            const intervals = [];
                                            for (let i = 1; i < sorted.length; i++) {
                                                const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
                                                intervals.push({ hours: diff, date: sorted[i].date });
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {/* Sub-tab navigation */}
                                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                                        {['estrutural', 'correlacoes', 'coach'].map(subView => (
                                                            <button
                                                                key={subView}
                                                                onClick={() => setAnalysisSubView(subView)}
                                                                className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ' + (analysisSubView === subView ? (darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}
                                                            >
                                                                {subView === 'estrutural' && '📊 Estrutural'}
                                                                {subView === 'correlacoes' && '🔗 Correlações'}
                                                                {subView === 'coach' && '💬 Reflexão Geral'}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* TEMPORAL */}
                                                    {analysisSubView === 'coach' && (() => {
                                                            if (analysisConsumptions.length === 0 && analysisWellbeing.length === 0) {
                                                                return (<div className={(darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500') + ' rounded-xl p-6 border text-center'}>Sem dados para este período</div>);
                                                            }
                
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

                                                            return (
                                                                <div className="space-y-4">
                                                                    {/* Header */}
                                                                    <div className={(darkMode ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-700/50' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200') + ' rounded-xl p-6 border'}>
                                                                        <div className="flex items-center gap-3 mb-2">
                                                                            <span className="text-4xl">💬</span>
                                                                            <h3 className={'text-2xl font-bold ' + (themeClasses.textPrimaryAlt(darkMode))}>
                                                                                Reflexão Geral
                                                                            </h3>
                                                                        </div>
                                                                        <p className={'text-xs ' + (themeClasses.textTertiary(darkMode))}>
                                                                            Resumo personalizado do período selecionado
                                                                        </p>
                                                                    </div>
                
                                                                    {/* Narrative Summary */}
                                                                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                        <div className={'space-y-4 leading-relaxed ' + (darkMode ? 'text-gray-200' : 'text-gray-700')}>
                                                                            {/* Paragraph 1: Overview */}
                                                                            <p>
                                                                                Olá! Vamos refletir sobre este período juntos.
                                                                                {totalConsumptions > 0 ? (
                                                                                    <> Registaste <strong className={(darkMode ? 'text-purple-400' : 'text-purple-600')}>{totalConsumptions} {totalConsumptions === 1 ? 'consumo' : 'consumos'}</strong> ao longo de {uniqueDays} {uniqueDays === 1 ? 'dia' : 'dias'}, com uma média de <strong>{avgPerDay} consumos/dia</strong>.</>
                                                                                ) : (
                                                                                    <> Não tens consumos registados neste período - isso é excelente! </>
                                                                                )}
                                                                            </p>
                
                                                                            {/* Paragraph 2: Patterns and Progress */}
                                                                            {totalConsumptions > 0 && (
                                                                                <p>
                                                                                    {intervals.length > 0 ? (
                                                                                        <>
                                                                                            Notei que tens um intervalo médio de <strong className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>{avgInterval} horas</strong> entre consumos.
                                                                                            {goodPercent >= 50 ? (
                                                                                                <> <span className={'font-medium ' + (darkMode ? 'text-green-400' : 'text-green-600')}>Isso é fantástico - {goodPercent}% dos teus intervalos são ≥2h!</span> Estás a conseguir espaçar bem os consumos, o que demonstra grande controlo.</>
                                                                                            ) : (
                                                                                                <> Há espaço para melhorar aqui - atualmente {goodPercent}% dos intervalos são ≥2h. Pequenas mudanças, como adicionar uma atividade entre consumos, podem fazer grande diferença.</>
                                                                                            )}
                                                                                        </>
                                                                                    ) : (
                                                                                        <> Neste período ainda não tenho dados suficientes sobre intervalos, mas vamos continuar a acompanhar juntos.</>
                                                                                    )}
                                                                                </p>
                                                                            )}
                
                                                                            {/* Paragraph 3: Time Patterns */}
                                                                            {totalConsumptions > 0 && maxPartOfDay[1] > 0 && (
                                                                                <p>
                                                                                    Reparei que a maioria dos teus consumos ({Math.round((maxPartOfDay[1] / totalConsumptions) * 100)}%) acontece à <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>{partNames[maxPartOfDay[0]]}</strong>.
                                                                                    {maxPartOfDay[0] === 'madrugada' && (
                                                                                        <> Consumir durante a madrugada pode indicar dificuldades com o sono ou ansiedade noturna. Tens pensado no que te leva a consumir nesse período? Talvez seja útil explorar técnicas de relaxamento para a noite.</>
                                                                                    )}
                                                                                    {maxPartOfDay[0] === 'noite' && (
                                                                                        <> A noite é um período comum para consumo, muitas vezes ligado ao descontrair após o dia. Considera se há formas alternativas de relaxar que te fazem sentir bem.</>
                                                                                    )}
                                                                                    {maxPartOfDay[0] === 'tarde' && (
                                                                                        <> As tardes podem ser desafiantes, especialmente se há rotinas ou gatilhos específicos. Identifica o que precede esses momentos.</>
                                                                                    )}
                                                                                    {maxPartOfDay[0] === 'manha' && (
                                                                                        <> Consumir pela manhã pode estar relacionado com o acordar ou com a gestão de ansiedade matinal. Observa como te sentes ao acordar e se há padrões.</>
                                                                                    )}
                                                                                </p>
                                                                            )}
                
                                                                            {/* Paragraph 3b: Hourly Consumption Analysis */}
                                                                            {(() => {
                                                                                if (totalConsumptions === 0) return null;
                
                                                                                // Calcular consumos por hora (inicializar todas as 24 horas com 0)
                                                                                const byHour = {};
                                                                                for (let h = 0; h < 24; h++) {
                                                                                    byHour[h] = 0;
                                                                                }
                
                                                                                analysisConsumptions.forEach(c => {
                                                                                    const hour = new Date(c.timestamp).getHours();
                                                                                    byHour[hour]++;
                                                                                });
                
                                                                                if (analysisConsumptions.length === 0) return null;
                
                                                                                // Encontrar hora com mais e menos consumos (todas as 24 horas)
                                                                                const hourEntries = Object.entries(byHour).map(([h, count]) => ({ hour: parseInt(h), count }));
                                                                                hourEntries.sort((a, b) => b.count - a.count);
                
                                                                                const worstHour = hourEntries[0];
                                                                                const bestHour = hourEntries[hourEntries.length - 1];
                
                                                                                const formatHourRange = (h) => `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;
                
                                                                                // Só mostrar se houver variação significativa entre horas
                                                                                // Se melhor hora tem 0, qualquer pior hora > 0 é significativo
                                                                                // Caso contrário, pior hora precisa ter pelo menos 2x mais que melhor
                                                                                const hasSignificantVariation = bestHour.count === 0
                                                                                    ? worstHour.count > 0
                                                                                    : worstHour.count >= bestHour.count * 2;
                
                                                                                if (!hasSignificantVariation) return null;
                
                                                                                return (
                                                                                    <p>
                                                                                        A tua <strong className={(darkMode ? 'text-red-400' : 'text-red-600')}>hora de maior risco</strong> é das <strong>{formatHourRange(worstHour.hour)}</strong> ({worstHour.count} {worstHour.count === 1 ? 'consumo' : 'consumos'}).
                                                                                        {bestHour.count === 0 ? (
                                                                                            <> Por outro lado, das <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>{formatHourRange(bestHour.hour)}</strong> <strong>nunca registas consumos</strong>. <span className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>O que fazes diferente nesse horário? Esse padrão pode ser uma pista valiosa para estratégias de redução de risco.</span></>
                                                                                        ) : (
                                                                                            <> Por outro lado, das <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>{formatHourRange(bestHour.hour)}</strong> registas menos consumos ({bestHour.count}x). <span className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>O que fazes diferente nesse horário? Esse padrão pode ser uma pista valiosa para estratégias de redução de risco.</span></>
                                                                                        )}
                                                                                    </p>
                                                                                );
                                                                            })()}
                
                                                                            {/* Paragraph 4: Wellbeing Integration */}
                                                                            {(avgMood || avgEnergy || avgSleep) && (
                                                                                <p>
                                                                                    Sobre o teu bem-estar geral:
                                                                                    {avgSleep && <> estás a dormir em média <strong className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>{avgSleep} horas</strong>{parseFloat(avgSleep) < 6 ? ', o que é abaixo do recomendado - o sono é fundamental para a recuperação e regulação emocional' : parseFloat(avgSleep) > 9 ? ', o que pode indicar necessidade de descanso extra ou até depressão - observa como te sentes' : parseFloat(avgSleep) >= 7 && parseFloat(avgSleep) <= 9 ? ' - excelente! Esse é o intervalo ideal para a maioria das pessoas' : ' - um valor razoável'}.</>}
                                                                                    {avgMood && <> O teu humor médio foi de <strong className={(parseFloat(avgMood) >= 7 ? (darkMode ? 'text-green-400' : 'text-green-600') : parseFloat(avgMood) >= 5 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-red-400' : 'text-red-600'))}>{avgMood}/10</strong>{parseFloat(avgMood) >= 7 ? ' - isso é muito positivo!' : parseFloat(avgMood) >= 5 ? ' - moderado, com espaço para melhorias.' : ' - isto preocupa-me. Como te podes apoiar melhor?'}.</>}
                                                                                    {avgEnergy && <> Energia média: <strong className={(parseFloat(avgEnergy) >= 7 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>{avgEnergy}/10</strong>{parseFloat(avgEnergy) < 5 ? '. Níveis baixos de energia podem estar relacionados com o consumo, sono ou alimentação.' : '.'}.</>}
                                                                                </p>
                                                                            )}
                
                                                                            {/* Paragraph 5: Emotional Tone & Encouragement (ANÁLISE AVANÇADA) */}
                                                                            <p>
                                                                                {allNotes.length > 0 ? (
                                                                                    <>
                                                                                        📝 <strong className={(darkMode ? 'text-purple-400' : 'text-purple-600')}>Análise das tuas Reflexões</strong> ({sentimentAnalysis.noteCount} notas):
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
                                                                                                const negCount = notes.filter(n => n.sentiment && (n.sentiment.overall === 'negative' || n.sentiment.overall === 'very_negative')).length;
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
                                                                                                    🔍 <strong className={(darkMode ? 'text-indigo-300' : 'text-indigo-700')}>Padrões emocionais:</strong>
                                                                                                    {realOverall === 'positive' ? (
                                                                                                        <> Tom geral <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>positivo</strong> ({positivePercent}% positivas vs {negativePercent}% negativas). Há consciência dos desafios, mas também esperança e resiliência. </>
                                                                                                    ) : realOverall === 'negative' ? (
                                                                                                        <> Tom geral <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>negativo</strong> ({negativePercent}% negativas vs {positivePercent}% positivas). Reconheço que estás a enfrentar dificuldades. </>
                                                                                                    ) : (
                                                                                                        <> Tom equilibrado entre positivo ({positivePercent}%) e negativo ({negativePercent}%), com {neutralPercent}% neutro - estás a navegar os altos e baixos. </>
                                                                                                    )}
                                                                                                    {sentimentAnalysis.trend === 'improving' && <span className={'font-medium ' + (darkMode ? 'text-green-400' : 'text-green-600')}>📈 Tendência: a melhorar!</span>}
                                                                                                    {sentimentAnalysis.trend === 'worsening' && <span className={(darkMode ? 'text-yellow-400' : 'text-yellow-600')}>📉 Tendência: a piorar nos últimos dias.</span>}
                                                                                                    {highNegDays > 0 && highNegHighCons / highNegDays > 0.6 && (
                                                                                                        <> <strong className={(darkMode ? 'text-orange-300' : 'text-orange-700')}>⚠️ Padrão: dias com reflexões muito negativas coincidem com mais consumo</strong> ({highNegHighCons} de {highNegDays} dias). Humor baixo pode ser gatilho.</>
                                                                                                    )}
                                                                                                </>
                                                                                            );
                                                                                        })()}
                                                                                        <br/>
                                                                                        💭 <strong className={(darkMode ? 'text-purple-300' : 'text-purple-700')}>Temas principais:</strong>
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
                                                                                                            const sentColor = avgSent > 0.3 ? (darkMode ? 'text-green-400' : 'text-green-600') : avgSent < -0.3 ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-gray-400' : 'text-gray-600');
                                                                                                            return (
                                                                                                                <span key={theme}>
                                                                                                                    {idx > 0 && ', '}
                                                                                                                    <strong className={sentColor}>{themeNames[theme]}</strong> ({data.count}x{avgSent > 0.3 ? '✓' : avgSent < -0.3 ? '⚠' : ''})
                                                                                                                </span>
                                                                                                            );
                                                                                                        })}
                                                                                                        .
                                                                                                        {sentimentThemes.stress && sentimentThemes.stress.avgSentiment < -0.3 && <> <strong className={(darkMode ? 'text-yellow-300' : 'text-yellow-700')}>Nota:</strong> As tuas reflexões sobre stress/ansiedade tendem a ser negativas - este é um tema que merece atenção.</>}
                                                                                                        {sentimentThemes.sleep && sentimentThemes.sleep.avgSentiment < -0.3 && <> <strong className={(darkMode ? 'text-cyan-300' : 'text-cyan-700')}>Nota:</strong> O sono é fonte frequente de preocupação nas tuas notas - melhorar a qualidade do sono pode ter grande impacto.</>}
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
                
                                                                            {/* Paragraph 6: Highlights */}
                                                                            {bestDate && totalConsumptions > 0 && (
                                                                                <p>
                                                                                    {bestCount <= 2 ? (
                                                                                        <>
                                                                                            Destaco o dia <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>{new Date(bestDate).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}</strong>, onde tiveste apenas {bestCount} {bestCount === 1 ? 'consumo' : 'consumos'}.
                                                                                            <span className={'font-medium ' + (darkMode ? 'text-green-400' : 'text-green-600')}> O que fizeste diferente nesse dia? Identificar essas estratégias pode ser a chave para replicar esse sucesso.</span>
                                                                                        </>
                                                                                    ) : worstDate && worstCount >= 8 ? (
                                                                                        <>
                                                                                            Repara que em <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>{new Date(worstDate).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}</strong> houve {worstCount} consumos. Não te culpes - em vez disso, pergunta-te: o que aconteceu? Houve gatilhos específicos? Stress? Tédio? Compreender é o primeiro passo para prevenir.
                                                                                        </>
                                                                                    ) : null}
                                                                                </p>
                                                                            )}
                
                                                                            {/* Paragraph 7: Bedtime & Sleep Patterns */}
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
                
                                                                                return (
                                                                                    <p>
                                                                                        Sobre a tua rotina de sono: estás a deitar-te em média às <strong className={(darkMode ? 'text-indigo-400' : 'text-indigo-600')}>{avgBedtimeStr}</strong>.
                                                                                        {avgBedtimeHours >= 0 && avgBedtimeHours < 6 ? (
                                                                                            <> <span className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>Deitar muito tarde (madrugada) pode afetar a qualidade do sono e a recuperação.</span> Considera criar uma rotina relaxante antes de dormir para adormecer mais cedo.</>
                                                                                        ) : avgBedtimeHours >= 22 && avgBedtimeHours < 24 ? (
                                                                                            <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Essa é uma boa janela para deitar!</span> Estás a manter uma rotina saudável de sono.</>
                                                                                        ) : avgBedtimeHours >= 6 && avgBedtimeHours < 12 ? (
                                                                                            <> Deitar de manhã pode indicar inversão do ciclo de sono, o que pode afetar a tua energia e humor durante o dia.</>
                                                                                        ) : (
                                                                                            <> Continua a observar como esta rotina afeta o teu bem-estar geral.</>
                                                                                        )}
                                                                                    </p>
                                                                                );
                                                                            })()}

                                                                            {/* Paragraph 7b: Análise de Ciclos (mg e padrões) */}
                                                                            {(() => {
                                                                                if (analysisCycles.length === 0) return null;

                                                                                // Calcular mg total e média por ciclo
                                                                                let totalMg = 0;
                                                                                let cyclesWithMg = 0;
                                                                                const cyclesMgData = [];

                                                                                analysisCycles.forEach(cycle => {
                                                                                    // Usar cycle.mg diretamente (fonte única de verdade)
                                                                                    const cycleMg = parseFloat(cycle.mg) || 0;
                                                                                    if (cycleMg > 0) {
                                                                                        totalMg += cycleMg;
                                                                                        cyclesWithMg++;
                                                                                        cyclesMgData.push(cycleMg);
                                                                                    }
                                                                                });

                                                                                if (cyclesWithMg === 0) return null;

                                                                                const avgMgPerCycle = totalMg / cyclesWithMg;

                                                                                // Ciclos sem consumo após 00h
                                                                                const cyclesWithNoLateConsumption = analysisCycles.filter(cycle => {
                                                                                    // Filtrar consumos deste ciclo pelo cycleId
                                                                                    const cycleConsumptions = analysisConsumptions.filter(c => c.cycleId === cycle.id);

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
                                                                                        📊 <strong className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>Análise de Ciclos:</strong> Em média, consomes <strong className={(darkMode ? 'text-purple-400' : 'text-purple-600')}>{avgMgPerCycle.toFixed(0)}mg por ciclo</strong> (dados de {cyclesWithMg} {cyclesWithMg === 1 ? 'ciclo' : 'ciclos'}).
                                                                                        {avgMgPerCycle > 300 ? (
                                                                                            <> <span className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>Esta é uma quantidade elevada.</span> Considera estabelecer uma meta de redução gradual.</>
                                                                                        ) : avgMgPerCycle > 200 ? (
                                                                                            <> Esta é uma quantidade moderada-alta. Há espaço para redução se esse for um objetivo teu.</>
                                                                                        ) : avgMgPerCycle > 100 ? (
                                                                                            <> <span className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>Esta é uma quantidade moderada.</span> Se estás a trabalhar na redução, estás no caminho certo.</>
                                                                                        ) : (
                                                                                            <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Esta é uma quantidade relativamente baixa!</span> Bom trabalho na gestão de quantidade.</>
                                                                                        )}
                                                                                        {analysisCycles.length >= 3 && <> Em <strong className={(pctNoLate >= 50 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>{pctNoLate}%</strong> dos ciclos não houve consumo após a meia-noite{pctNoLate >= 70 ? ' - excelente controlo!' : pctNoLate >= 50 ? ' - continua a melhorar este aspeto.' : '. Evitar consumo tardio pode melhorar a qualidade do sono.'}.</>}
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
                                                                                        💧 <strong className={(darkMode ? 'text-teal-400' : 'text-teal-600')}>Autocuidado:</strong> A tua taxa geral está em <strong className={(overall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>{overall.toFixed(0)}%</strong>.
                                                                                        {lowAreas.length >= 3 ? (
                                                                                            <> Reparei que estás abaixo dos 70% em várias áreas. <span className={(darkMode ? 'text-yellow-400' : 'text-yellow-600')}>Foca primeiro em {areaNames[lowAreas[0][0]]} ({lowAreas[0][1].toFixed(0)}%): {suggestions[lowAreas[0][0]]}.</span> Depois expande para {areaNames[lowAreas[1][0]]}.</>
                                                                                        ) : lowAreas.length === 2 ? (
                                                                                            <> Duas áreas precisam de atenção: {areaNames[lowAreas[0][0]]} ({lowAreas[0][1].toFixed(0)}%) e {areaNames[lowAreas[1][0]]} ({lowAreas[1][1].toFixed(0)}%). <span className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>Para {areaNames[lowAreas[0][0]]}: {suggestions[lowAreas[0][0]]}.</span></>
                                                                                        ) : lowAreas.length === 1 ? (
                                                                                            <> Só uma área abaixo de 70%: {areaNames[lowAreas[0][0]]} ({lowAreas[0][1].toFixed(0)}%). <span className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>Dica prática: {suggestions[lowAreas[0][0]]}.</span> Pequenos passos contam!</>
                                                                                        ) : (
                                                                                            <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Excelente! Estás a manter bons hábitos em todas as áreas (todas ≥70%).</span> Continua assim - o autocuidado é a base da recuperação.</>
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
                                                                                    const today = getTodayPT();

                                                                                    if (g.type === 'reduce_frequency') {
                                                                                        // DIAS com consumos (excluindo hoje)
                                                                                        const allDates = new Set();
                                                                                        analysisConsumptions.forEach(c => {
                                                                                            const dateKey = timestampToPT(c.timestamp);
                                                                                            if (dateKey !== today) allDates.add(dateKey);
                                                                                        });
                                                                                        totalPossible = allDates.size;
                                                                                    } else if (g.type === 'increase_interval') {
                                                                                        // DIAS com ≥2 consumos (excluindo hoje)
                                                                                        const consumptionsByDate = {};
                                                                                        analysisConsumptions.forEach(c => {
                                                                                            const dateKey = timestampToPT(c.timestamp);
                                                                                            if (dateKey === today) return;
                                                                                            if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = [];
                                                                                            consumptionsByDate[dateKey].push(c);
                                                                                        });
                                                                                        totalPossible = Object.values(consumptionsByDate).filter(arr => arr.length >= 2).length;
                                                                                    } else if (g.type === 'sleep_hours') {
                                                                                        // DIAS com bem-estar (excluindo hoje)
                                                                                        const allDates = new Set();
                                                                                        analysisWellbeing.forEach(w => {
                                                                                            const dateKey = w.date || (w.timestamp ? new Date(w.timestamp).toLocaleDateString('pt-PT') : null);
                                                                                            if (dateKey && dateKey !== today) allDates.add(dateKey);
                                                                                        });
                                                                                        totalPossible = allDates.size;
                                                                                    } else if (g.type === 'limit_last' || g.type === 'reduce_quantity' || g.type === 'bedtime_before') {
                                                                                        // CICLOS
                                                                                        totalPossible = analysisCycles.length;
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
                                                                                    sleep_hours: 'Horas de Sono'
                                                                                };

                                                                                return (
                                                                                    <p>
                                                                                        🎯 <strong className={(darkMode ? 'text-pink-400' : 'text-pink-600')}>Progresso de Metas:</strong> Cumpriste condições das tuas metas <strong>{totalAchievements} vezes</strong> neste período!
                                                                                        {goalsWithAchievements.length === uniqueGoals.length ? (
                                                                                            <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Todas as {uniqueGoals.length} metas ativas tiveram cumprimentos - isso é incrível!</span></>
                                                                                        ) : goalsWithAchievements.length > 0 ? (
                                                                                            <> Progredir em {goalsWithAchievements.length} de {uniqueGoals.length} metas.</>
                                                                                        ) : (
                                                                                            <> Ainda não atingiste nenhuma meta neste período - ajustar metas é parte do processo.</>
                                                                                        )}
                                                                                        {bestGoal && bestGoal.percentage > 0 && (
                                                                                            <>
                                                                                                {' '}A tua melhor meta é <strong className={(darkMode ? 'text-purple-400' : 'text-purple-600')}>{goalTypeNames[bestGoal.goal.type]}</strong>: alcançada <strong>{bestGoal.achievements} vezes</strong> em {bestGoal.totalPossible} {bestGoal.goal.type.includes('cycle') || bestGoal.goal.type === 'limit_last' || bestGoal.goal.type === 'reduce_quantity' || bestGoal.goal.type === 'bedtime_before' ? 'ciclos' : 'dias'} possíveis (<strong className={(bestGoal.percentage >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : bestGoal.percentage >= 40 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>{bestGoal.percentage}%</strong>)
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
                                                                                        💤➡️😊 <strong className={(darkMode ? 'text-indigo-400' : 'text-indigo-600')}>Sono e Humor:</strong> Analisei como o teu sono afeta o humor no dia seguinte.
                                                                                        {correlation > 0.4 ? (
                                                                                            <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Correlação forte (+{correlation.toFixed(2)}):</span> Dormir bem <strong>melhora claramente</strong> o teu humor no dia seguinte! Nos dados, mais sono = humor melhor. <strong className={(darkMode ? 'text-green-300' : 'text-green-700')}>💡 Ação: Prioriza 7-8h de sono - é o teu melhor investimento emocional.</strong></>
                                                                                        ) : correlation > 0.2 ? (
                                                                                            <> <span className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>Correlação moderada (+{correlation.toFixed(2)}):</span> Há uma ligação positiva entre sono e humor, mas outros fatores também influenciam. <strong className={(darkMode ? 'text-blue-300' : 'text-blue-700')}>💡 Ação: Melhora a qualidade do sono (ambiente escuro, horário regular).</strong></>
                                                                                        ) : correlation < -0.3 ? (
                                                                                            <> <span className={(darkMode ? 'text-red-400' : 'text-red-600')}>Correlação negativa ({correlation.toFixed(2)}):</span> Curiosamente, mais sono associa-se com pior humor - isto pode indicar que dormir demasiado (possivelmente depressão) ou má qualidade de sono afeta negativamente. <strong className={(darkMode ? 'text-orange-300' : 'text-orange-700')}>💡 Ação: Foca na QUALIDADE do sono, não apenas quantidade. Considera consultar profissional de saúde.</strong></>
                                                                                        ) : (
                                                                                            <> <span className={(darkMode ? 'text-gray-400' : 'text-gray-600')}>Correlação fraca ({correlation.toFixed(2)}):</span> Não há uma relação linear clara nos teus dados. Isso não significa que o sono não importa - pode haver um padrão não-linear, ou outros fatores (consumo, stress, socialização) têm mais peso. <strong className={(darkMode ? 'text-yellow-300' : 'text-yellow-700')}>💡 Ação: Observa padrões específicos - talvez haja um "sweet spot" de horas de sono para ti.</strong></>
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
                                                                                        🔍 <strong className={(darkMode ? 'text-indigo-400' : 'text-indigo-600')}>Impacto do Consumo:</strong> Analisei como o consumo de hoje afeta o teu bem-estar amanhã.
                                                                                        {moodCorr !== null && Math.abs(moodCorr) >= 0.3 && (
                                                                                            <>
                                                                                                {moodCorr < -0.5 ? (
                                                                                                    <> <span className={(darkMode ? 'text-red-400' : 'text-red-600')}>Correlação forte ({moodCorr.toFixed(2)}):</span> Dias com mais consumo <strong>precedem claramente</strong> dias com humor mais baixo. <strong className={(darkMode ? 'text-red-300' : 'text-red-700')}>💡 O ciclo é evidente nos teus dados - consumir hoje = sentir-te pior amanhã.</strong></>
                                                                                                ) : moodCorr < -0.3 ? (
                                                                                                    <> <span className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>Correlação moderada ({moodCorr.toFixed(2)}):</span> Há um padrão onde dias de mais consumo tendem a preceder humor mais baixo. O impacto emocional existe, embora outros fatores também influenciem. <strong className={(darkMode ? 'text-orange-300' : 'text-orange-700')}>💡 Reduzir consumo pode melhorar o teu estado emocional.</strong></>
                                                                                                ) : moodCorr > 0.3 ? (
                                                                                                    <> <span className={(darkMode ? 'text-yellow-400' : 'text-yellow-600')}>Correlação positiva ({moodCorr.toFixed(2)}):</span> Curiosamente, mais consumo associa-se com melhor humor no dia seguinte - isto pode indicar alívio temporário, autocontrolo diferente em dias bons, ou outros fatores. <strong className={(darkMode ? 'text-yellow-300' : 'text-yellow-700')}>💡 Observa se este padrão se mantém a longo prazo.</strong></>
                                                                                                ) : null}
                                                                                            </>
                                                                                        )}
                                                                                        {energyCorr !== null && Math.abs(energyCorr) >= 0.3 && (
                                                                                            <>
                                                                                                {energyCorr < -0.5 ? (
                                                                                                    <> <span className={(darkMode ? 'text-red-400' : 'text-red-600')}>Na energia: correlação forte ({energyCorr.toFixed(2)})</span> - mais consumo resulta em fadiga clara no dia seguinte. <strong className={(darkMode ? 'text-red-300' : 'text-red-700')}>O teu corpo está a pedir descanso da substância.</strong></>
                                                                                                ) : energyCorr < -0.3 ? (
                                                                                                    <> <span className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>Na energia: correlação moderada ({energyCorr.toFixed(2)})</span> - consumo afeta os teus níveis de energia no dia seguinte. O corpo está em recuperação. <strong className={(darkMode ? 'text-orange-300' : 'text-orange-700')}>💡 Mais descanso e hidratação nos dias seguintes pode ajudar.</strong></>
                                                                                                ) : energyCorr > 0.3 ? (
                                                                                                    <> <span className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>Na energia: correlação positiva ({energyCorr.toFixed(2)})</span> - mais consumo associa-se com mais energia no dia seguinte. Observa se isto é sustentável ou se há um efeito rebote posterior.</>
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
                                                                                        🎯 <strong className={(darkMode ? 'text-yellow-400' : 'text-yellow-600')}>Perfil de Risco:</strong> Identifiquei um padrão importante:
                                                                                        {moodDiff > 0 ? (
                                                                                            <> <span className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>Dias com mais consumo tendem a ser precedidos por humor mais baixo no dia anterior</span> (diferença de {moodDiff.toFixed(1)} pontos). <strong>Isto sugere que humor baixo é um gatilho para ti.</strong> Quando te sentires em baixo, esse é o momento de usar estratégias de prevenção - contacta alguém, faz exercício, ou usa técnicas de mindfulness.</>
                                                                                        ) : (
                                                                                            <> Dias com mais consumo são precedidos por humor mais alto (diferença de {Math.abs(moodDiff).toFixed(1)} pontos) - isto pode indicar que celebração ou euforia são gatilhos. Estar consciente disto ajuda-te a moderar.</>
                                                                                        )}
                                                                                    </p>
                                                                                );
                                                                            })()}
                
                                                                            {/* Paragraph 11: Tendência (se aplicável) */}
                                                                            {(() => {
                                                                                if (totalConsumptions === 0) return null;
                
                                                                                const now = new Date();
                                                                                let recentPeriod, previousPeriod, periodLabel;
                
                                                                                // Adaptar comparação ao filtro selecionado
                                                                                if (patternsPeriod === 'hoje') {
                                                                                    // Comparar hoje vs ontem
                                                                                    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                                                                                    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
                                                                                    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
                
                                                                                    recentPeriod = consumptions.filter(c => new Date(c.timestamp) >= todayStart);
                                                                                    previousPeriod = consumptions.filter(c => {
                                                                                        const d = new Date(c.timestamp);
                                                                                        return d >= yesterdayStart && d <= yesterdayEnd;
                                                                                    });
                                                                                    periodLabel = { recent: 'hoje', previous: 'ontem' };
                                                                                } else if (patternsPeriod === 'semana') {
                                                                                    // Comparar esta semana vs semana anterior
                                                                                    const sevenDaysAgo = getDateDaysAgo(7);
                                                                                    const fourteenDaysAgo = getDateDaysAgo(14);
                
                                                                                    recentPeriod = consumptions.filter(c => new Date(c.timestamp) >= sevenDaysAgo);
                                                                                    previousPeriod = consumptions.filter(c => {
                                                                                        const d = new Date(c.timestamp);
                                                                                        return d >= fourteenDaysAgo && d < sevenDaysAgo;
                                                                                    });
                                                                                    periodLabel = { recent: 'nesta semana', previous: 'na anterior' };
                                                                                } else if (patternsPeriod === 'mês') {
                                                                                    // Comparar este mês vs mês anterior
                                                                                    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                                                                                    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                                                                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                
                                                                                    recentPeriod = consumptions.filter(c => new Date(c.timestamp) >= thisMonthStart);
                                                                                    previousPeriod = consumptions.filter(c => {
                                                                                        const d = new Date(c.timestamp);
                                                                                        return d >= lastMonthStart && d <= lastMonthEnd;
                                                                                    });
                                                                                    periodLabel = { recent: 'neste mês', previous: 'no anterior' };
                                                                                } else {
                                                                                    // 'tudo': Comparar últimos 7 dias vs 7 dias anteriores
                                                                                    const sevenDaysAgo = getDateDaysAgo(7);
                                                                                    const fourteenDaysAgo = getDateDaysAgo(14);
                
                                                                                    recentPeriod = consumptions.filter(c => new Date(c.timestamp) >= sevenDaysAgo);
                                                                                    previousPeriod = consumptions.filter(c => {
                                                                                        const d = new Date(c.timestamp);
                                                                                        return d >= fourteenDaysAgo && d < sevenDaysAgo;
                                                                                    });
                                                                                    periodLabel = { recent: 'na última semana', previous: 'na anterior' };
                                                                                }
                
                                                                                if (recentPeriod.length === 0 || previousPeriod.length === 0) return null;
                
                                                                                const percentChange = ((recentPeriod.length - previousPeriod.length) / previousPeriod.length) * 100;
                
                                                                                // Só mostrar se mudança significativa (>20%)
                                                                                if (Math.abs(percentChange) < 20) return null;
                
                                                                                return (
                                                                                    <p>
                                                                                        {percentChange > 0 ? (
                                                                                            <>
                                                                                                📈 <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>Tendência:</strong> O consumo aumentou <strong>{Math.abs(percentChange).toFixed(0)}%</strong> {periodLabel.recent} comparado {periodLabel.previous} (de {previousPeriod.length} para {recentPeriod.length} consumos).
                                                                                                <span className={(darkMode ? 'text-yellow-400' : 'text-yellow-600')}> Sem julgamento - só dados. O que mudou? Stress? Menos sono? Menos apoio? Identifica o trigger e ajusta o plano.</span>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                📉 <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>Tendência:</strong> O consumo diminuiu <strong>{Math.abs(percentChange).toFixed(0)}%</strong> {periodLabel.recent} comparado {periodLabel.previous} (de {previousPeriod.length} para {recentPeriod.length} consumos).
                                                                                                <span className={'font-medium ' + (darkMode ? 'text-green-400' : 'text-green-600')}> Parabéns! Isto é progresso real. O que fizeste diferente? Identifica essas estratégias para continuar este caminho!</span>
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
                                                                                        ⚡ <strong className={(darkMode ? 'text-yellow-400' : 'text-yellow-600')}>Energia e Consumo:</strong> Das últimas {countWithData} vezes que consumiste, <strong className={(darkMode ? 'text-yellow-300' : 'text-yellow-700')}>{countWithLowEnergy} tinham check-in com energia baixa (&lt;4)</strong>.
                                                                                        {percentage >= 70 ? (
                                                                                            <> <span className={(darkMode ? 'text-red-400' : 'text-red-600')}>Isto sugere uma forte correlação entre cansaço e consumo.</span> Considera estratégias de gestão de energia (pausas, descanso, nutrição) como parte do teu plano de redução de danos.</>
                                                                                        ) : (
                                                                                            <> Isto sugere que o cansaço pode ser um gatilho. Identifica formas de recarregar energia antes de recorrer ao consumo.</>
                                                                                        )}
                                                                                    </p>
                                                                                );
                                                                            })()}

                                                                            {/* Paragraph 12: Autoconhecimento */}
                                                                            {(analysisWellbeing.length > 3 || analysisCycles.length > 2) && (
                                                                                <p>
                                                                                    ✨ <strong className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>Autoconhecimento:</strong> Estás a registar de forma consistente
                                                                                    {analysisWellbeing.length > 0 && <> (bem-estar)</>}
                                                                                    {analysisCycles.length > 0 && <>{analysisWellbeing.length > 0 && ','} ciclos de sono</>}.
                                                                                    <span className={'font-medium ' + (darkMode ? 'text-cyan-400' : 'text-cyan-600')}> Isto já é um passo enorme! Registar é autoconsciência. Os padrões vão-se tornando mais claros com o tempo, e isso dá-te poder para agir.</span>
                                                                                </p>
                                                                            )}
                
                                                                            {/* Paragraph 13: Tu Tens o Controlo */}
                                                                            <p className={'font-medium ' + (darkMode ? 'text-purple-300' : 'text-purple-700')}>
                                                                                💪 <strong>Tu tens o controlo.</strong> Estes dados são teus. Este progresso é teu. Este poder de escolha é teu.
                                                                                <span className={(darkMode ? 'text-purple-400' : 'text-purple-600')}> Cada decisão que tomas - registar, refletir, ajustar - é um ato de autonomia. Continua a usar esta app, continua a analisar, continua a crescer. 🚀</span>
                                                                            </p>
                
                                                                            {/* Paragraph 14: Closing & Next Steps */}
                                                                            <p className={'font-medium pt-2 border-t ' + (darkMode ? 'border-gray-700 text-purple-400' : 'border-gray-200 text-purple-600')}>
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
                                                        return null;
                                                    })()}

                                                    {/* ESTRUTURAL */}
                                                    {analysisSubView === 'estrutural' && (
                                                        <div className="space-y-4">
                                                            {/* Análise de Intervalos Simplificada */}
                                                            <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                <h3 className={'font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>⏱️ Intervalos Entre Consumos</h3>
                                                                {intervals.length === 0 ? (
                                                                    <div className={'text-center py-4 text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                        Sem intervalos (necessário ≥2 consumos)
                                                                    </div>
                                                                ) : (() => {
                                                                    const goodIntervals = intervals.filter(i => i.hours >= 2);
                                                                    const shortIntervals = intervals.filter(i => i.hours < 2);
                                                                    const avgInterval = intervals.reduce((sum, i) => sum + i.hours, 0) / intervals.length;
                                                                    const maxInterval = Math.max(...intervals.map(i => i.hours));
                                                                    const goodPercent = ((goodIntervals.length / intervals.length) * 100).toFixed(0);
                                                                    const shortPercent = ((shortIntervals.length / intervals.length) * 100).toFixed(0);

                                                                    return (
                                                                        <>
                                                                            <div className="grid grid-cols-3 gap-3 mb-4">
                                                                                <div className={`${darkMode ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border-purple-200'} rounded-lg p-3 text-center border`}>
                                                                                    <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{intervals.length}</div>
                                                                                    <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</div>
                                                                                </div>
                                                                                <div className={`${darkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-50 border-blue-200'} rounded-lg p-3 text-center border`}>
                                                                                    <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{avgInterval.toFixed(1)}h</div>
                                                                                    <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Média</div>
                                                                                </div>
                                                                                <div className={`${darkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-50 border-green-200'} rounded-lg p-3 text-center border`}>
                                                                                    <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{maxInterval.toFixed(1)}h</div>
                                                                                    <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Máximo</div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-3">
                                                                                {/* Bons intervalos (≥2h) */}
                                                                                <div className={`${darkMode ? 'bg-green-900/20 border border-green-700/50' : 'bg-green-50 border border-green-200'} rounded-lg p-4`}>
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <div className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                                                                            <span>✅</span>
                                                                                            <span>Intervalos Bons (≥2h)</span>
                                                                                        </div>
                                                                                        <div className={`text-sm font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                                                                            {goodIntervals.length} ({goodPercent}%)
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-full h-3 overflow-hidden`}>
                                                                                        <div className="bg-green-500 h-full transition-all duration-500" style={{width: goodPercent + '%'}}></div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Intervalos curtos (<2h) */}
                                                                                <div className={`${darkMode ? 'bg-orange-900/20 border border-orange-700/50' : 'bg-orange-50 border border-orange-200'} rounded-lg p-4`}>
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <div className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                                                                                            <span>⚠️</span>
                                                                                            <span>Intervalos Curtos (&lt;2h)</span>
                                                                                        </div>
                                                                                        <div className={`text-sm font-bold ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                                                                                            {shortIntervals.length} ({shortPercent}%)
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-full h-3 overflow-hidden`}>
                                                                                        <div className="bg-orange-500 h-full transition-all duration-500" style={{width: shortPercent + '%'}}></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className={`${darkMode ? 'bg-indigo-900/20 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200'} rounded-lg p-3 mt-4 border`}>
                                                                                <p className={`text-xs leading-relaxed ${themeClasses.textSecondary(darkMode)}`}>
                                                                                    {goodPercent >= 50
                                                                                        ? '🌟 Ótimo! Mais de metade dos intervalos são ≥2h. Continua assim!'
                                                                                        : '💪 Foca-te em aumentar o tempo entre consumos. Cada melhoria conta!'}
                                                                                </p>
                                                                            </div>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>

                                                            {/* Gatilhos */}
                                                            {filteredCycles.length > 0 && filteredCycles.some(c => c.triggers && c.triggers.length > 0) && (
                                                                <div className={themeClasses.container(darkMode) + ' rounded-xl p-4 border'}>
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <span className="text-lg">⚡</span>
                                                                        <h3 className={'font-semibold text-sm ' + (themeClasses.textPrimaryAlt(darkMode))}>Análise de Gatilhos</h3>
                                                                    </div>
                                                                    {(() => {
                                                                        // Calcular gatilhos e média de consumos por gatilho
                                                                        const triggerData = {};

                                                                        filteredCycles.forEach(cycle => {
                                                                            if (!cycle.triggers || cycle.triggers.length === 0) return;

                                                                            // Encontrar data do ciclo usando o timestamp
                                                                            const cycleDate = safeToISODate(cycle.timestamp);
                                                                            if (!cycleDate) return;

                                                                            // Contar consumos nesse dia
                                                                            const dayConsumptions = filteredConsumptions.filter(c => c.date === cycleDate).length;

                                                                            cycle.triggers.forEach(trigger => {
                                                                                if (!triggerData[trigger]) {
                                                                                    triggerData[trigger] = { count: 0, totalConsumptions: 0, days: [] };
                                                                                }
                                                                                triggerData[trigger].count++;
                                                                                triggerData[trigger].totalConsumptions += dayConsumptions;
                                                                                triggerData[trigger].days.push(cycleDate);
                                                                            });
                                                                        });

                                                                        // Calcular média de consumos para cada gatilho
                                                                        const triggersWithAvg = Object.entries(triggerData).map(([trigger, data]) => ({
                                                                            trigger,
                                                                            count: data.count,
                                                                            avgConsumptions: data.count > 0 ? data.totalConsumptions / data.count : 0
                                                                        }));

                                                                        // Gatilhos com MAIOR consumo (top 3)
                                                                        const highRiskTriggers = triggersWithAvg
                                                                            .filter(t => t.count >= 2)
                                                                            .sort((a, b) => b.avgConsumptions - a.avgConsumptions)
                                                                            .slice(0, 3);

                                                                        // Gatilhos com MENOR consumo (bottom 2)
                                                                        const lowRiskTriggers = triggersWithAvg
                                                                            .filter(t => t.count >= 2 && t.avgConsumptions < 10)
                                                                            .sort((a, b) => a.avgConsumptions - b.avgConsumptions)
                                                                            .slice(0, 2);

                                                                        // Análise de emoções correlacionadas com consumo
                                                                        const emotionData = {};

                                                                        // Para cada registo de bem-estar
                                                                        filteredWellbeingLogs.forEach(log => {
                                                                            if (!log.emotions || log.emotions.length === 0) return;

                                                                            const logDate = safeToISODate(log.timestamp);
                                                                            if (!logDate) return;

                                                                            // Contar consumos nesse dia
                                                                            const dayConsumptions = filteredConsumptions.filter(c => c.date === logDate).length;

                                                                            log.emotions.forEach(emotion => {
                                                                                if (!emotionData[emotion]) {
                                                                                    emotionData[emotion] = { count: 0, totalConsumptions: 0, days: [] };
                                                                                }
                                                                                emotionData[emotion].count++;
                                                                                emotionData[emotion].totalConsumptions += dayConsumptions;
                                                                                emotionData[emotion].days.push(logDate);
                                                                            });
                                                                        });

                                                                        // Calcular média de consumos para cada emoção e ordenar
                                                                        const emotionsWithAvg = Object.entries(emotionData).map(([emotion, data]) => ({
                                                                            emotion,
                                                                            count: data.count,
                                                                            avgConsumptions: data.count > 0 ? data.totalConsumptions / data.count : 0
                                                                        }));

                                                                        // Emoções com MAIOR consumo (top 2)
                                                                        const highRiskEmotions = emotionsWithAvg
                                                                            .filter(e => e.count >= 2) // Apenas emoções registadas 2+ vezes
                                                                            .sort((a, b) => b.avgConsumptions - a.avgConsumptions)
                                                                            .slice(0, 2);

                                                                        // Emoções com MENOR consumo (bottom 2)
                                                                        const lowRiskEmotions = emotionsWithAvg
                                                                            .filter(e => e.count >= 2 && e.avgConsumptions < 10) // Menos de 10 consumos em média
                                                                            .sort((a, b) => a.avgConsumptions - b.avgConsumptions)
                                                                            .slice(0, 2);

                                                                        return (
                                                                            <div className="space-y-3">
                                                                                {/* GATILHOS (situações/contextos) */}
                                                                                <div>
                                                                                    <h4 className={'text-xs font-semibold mb-2 uppercase tracking-wide ' + (themeClasses.textTertiary(darkMode))}>
                                                                                        Análise de Gatilhos
                                                                                    </h4>

                                                                                    {highRiskTriggers.length === 0 && lowRiskTriggers.length === 0 ? (
                                                                                        <div className={'text-center py-3 text-sm rounded-lg ' + (darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-50 text-gray-500')}>
                                                                                            Sem dados suficientes de gatilhos neste período
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="space-y-2">
                                                                                            {/* Gatilhos de ALTO risco (mais consumo) */}
                                                                                            {highRiskTriggers.length > 0 && (
                                                                                                <div>
                                                                                                    <div className={'text-xs font-medium mb-1 ' + (darkMode ? 'text-red-400' : 'text-red-600')}>
                                                                                                        🔴 Alto Risco (mais consumo)
                                                                                                    </div>
                                                                                                    {highRiskTriggers.map(t => (
                                                                                                        <div key={t.trigger} className={(darkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200') + ' rounded-lg p-3 border mb-2'}>
                                                                                                            <div className="flex items-center justify-between mb-1">
                                                                                                                <span className={'font-medium text-sm ' + (darkMode ? 'text-red-300' : 'text-red-700')}>{t.trigger}</span>
                                                                                                                <span className={(darkMode ? 'bg-red-700/50 text-red-200' : 'bg-red-200 text-red-800') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{t.count}x</span>
                                                                                                            </div>
                                                                                                            <div className={'text-xs ' + (darkMode ? 'text-red-400/70' : 'text-red-600/70')}>
                                                                                                                ⚠️ Nos dias com este gatilho: média de <span className="font-bold">{t.avgConsumptions.toFixed(1)} consumos</span>. Esta situação é um fator de risco - prepara um plano de ação para quando surgir.
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Gatilhos de BAIXO risco (menos consumo) */}
                                                                                            {lowRiskTriggers.length > 0 && (
                                                                                                <div>
                                                                                                    <div className={'text-xs font-medium mb-1 ' + (darkMode ? 'text-green-400' : 'text-green-600')}>
                                                                                                        🟢 Baixo Risco (menos consumo)
                                                                                                    </div>
                                                                                                    {lowRiskTriggers.map(t => (
                                                                                                        <div key={t.trigger} className={(darkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200') + ' rounded-lg p-3 border mb-2'}>
                                                                                                            <div className="flex items-center justify-between mb-1">
                                                                                                                <span className={'font-medium text-sm ' + (darkMode ? 'text-green-300' : 'text-green-700')}>{t.trigger}</span>
                                                                                                                <span className={(darkMode ? 'bg-green-700/50 text-green-200' : 'bg-green-200 text-green-800') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{t.count}x</span>
                                                                                                            </div>
                                                                                                            <div className={'text-xs ' + (darkMode ? 'text-green-400/70' : 'text-green-600/70')}>
                                                                                                                ✓ Nos dias com este gatilho: média de <span className="font-bold">{t.avgConsumptions.toFixed(1)} consumos</span>. Esta situação é mais segura para ti!
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* EMOÇÕES (estados emocionais) */}
                                                                                <div>
                                                                                    <h4 className={'text-xs font-semibold mb-2 uppercase tracking-wide ' + (themeClasses.textTertiary(darkMode))}>
                                                                                        Análise de Emoções
                                                                                    </h4>

                                                                                    {highRiskEmotions.length === 0 && lowRiskEmotions.length === 0 ? (
                                                                                        <div className={'text-center py-3 text-sm rounded-lg ' + (darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-50 text-gray-500')}>
                                                                                            Sem dados suficientes de emoções neste período
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="space-y-2">
                                                                                            {/* Emoções de ALTO risco (mais consumo) */}
                                                                                            {highRiskEmotions.length > 0 && (
                                                                                                <div>
                                                                                                    <div className={'text-xs font-medium mb-1 ' + (darkMode ? 'text-red-400' : 'text-red-600')}>
                                                                                                        🔴 Alto Risco (mais consumo)
                                                                                                    </div>
                                                                                                    {highRiskEmotions.map(e => (
                                                                                                        <div key={e.emotion} className={(darkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200') + ' rounded-lg p-3 border mb-2'}>
                                                                                                            <div className="flex items-center justify-between mb-1">
                                                                                                                <span className={'font-medium text-sm ' + (darkMode ? 'text-red-300' : 'text-red-700')}>{e.emotion}</span>
                                                                                                                <span className={(darkMode ? 'bg-red-700/50 text-red-200' : 'bg-red-200 text-red-800') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{e.count}x</span>
                                                                                                            </div>
                                                                                                            <div className={'text-xs ' + (darkMode ? 'text-red-400/70' : 'text-red-600/70')}>
                                                                                                                ⚠️ Quando sentes isto: média de <span className="font-bold">{e.avgConsumptions.toFixed(1)} consumos</span>. Esta emoção é um momento crítico - prepara estratégias DBT para quando surgir.
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Emoções de BAIXO risco (menos consumo) */}
                                                                                            {lowRiskEmotions.length > 0 && (
                                                                                                <div>
                                                                                                    <div className={'text-xs font-medium mb-1 ' + (darkMode ? 'text-green-400' : 'text-green-600')}>
                                                                                                        🟢 Baixo Risco (menos consumo)
                                                                                                    </div>
                                                                                                    {lowRiskEmotions.map(e => (
                                                                                                        <div key={e.emotion} className={(darkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200') + ' rounded-lg p-3 border mb-2'}>
                                                                                                            <div className="flex items-center justify-between mb-1">
                                                                                                                <span className={'font-medium text-sm ' + (darkMode ? 'text-green-300' : 'text-green-700')}>{e.emotion}</span>
                                                                                                                <span className={(darkMode ? 'bg-green-700/50 text-green-200' : 'bg-green-200 text-green-800') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{e.count}x</span>
                                                                                                            </div>
                                                                                                            <div className={'text-xs ' + (darkMode ? 'text-green-400/70' : 'text-green-600/70')}>
                                                                                                                ✓ Quando sentes isto: média de <span className="font-bold">{e.avgConsumptions.toFixed(1)} consumos</span>. Este é um estado emocional mais seguro para ti!
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* CORRELAÇÕES */}
                                                    {/* CORRELAÇÕES */}
                                                    {analysisSubView === 'correlacoes' && (() => {
                                                        if (analysisConsumptions.length < 1) {
                                                            return (
                                                                <div className={themeClasses.container(darkMode) + ' rounded-xl p-8 border text-center'}>
                                                                    <div className="text-6xl mb-4">🔗</div>
                                                                    <h3 className={'text-xl font-bold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>Correlações</h3>
                                                                    <p className={'text-sm ' + (themeClasses.textTertiary(darkMode))}>
                                                                        Sem consumos registados para análise.
                                                                    </p>
                                                                </div>
                                                            );
                                                        }

                                                        // ===== 1. CORRELAÇÕES BIDIRECIONAIS =====
                                                        // Agregar dados por dia
                                                        const dailyData = {};


                                                        // Contar consumos por dia
                                                        analysisConsumptions.forEach(c => {
                                                            if (!dailyData[c.date]) dailyData[c.date] = { consumptions: 0, sleep: null, mood: null, energy: null };
                                                            dailyData[c.date].consumptions++;
                                                        });

                                                        // Adicionar bem-estar
                                                        analysisWellbeing.forEach(w => {
                                                            // Extrair data do timestamp se não houver campo date
                                                            const wDate = w.date || safeToISODate(w.timestamp);
                                                            if (!wDate) return; // Skip if invalid date
                                                            if (!dailyData[wDate]) dailyData[wDate] = { consumptions: 0, sleep: null, mood: null, energy: null };
                                                            if (w.sleep != null && !isNaN(parseFloat(w.sleep))) dailyData[wDate].sleep = parseFloat(w.sleep);
                                                            if (w.mood != null && !isNaN(parseInt(w.mood))) dailyData[wDate].mood = parseInt(w.mood);
                                                            if (w.energy != null && !isNaN(parseInt(w.energy))) dailyData[wDate].energy = parseInt(w.energy);
                                                        });


                                                        // Calcular correlações simples (comparar dias com mais vs menos consumo)
                                                        // IMPORTANTE: Filtrar apenas dias que têm PELO MENOS UM DADO DE BEM-ESTAR
                                                        const daysWithData = Object.values(dailyData).filter(d =>
                                                            (d.sleep !== null || d.mood !== null || d.energy !== null)
                                                        );


                                                        if (daysWithData.length < 1) {
                                                            return (
                                                                <div className={themeClasses.container(darkMode) + ' rounded-xl p-8 border text-center'}>
                                                                    <div className="text-6xl mb-4">🔗</div>
                                                                    <h3 className={'text-xl font-bold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>Correlações</h3>
                                                                    <p className={'text-sm ' + (themeClasses.textTertiary(darkMode))}>
                                                                        Sem dados suficientes para análise de correlações neste momento.
                                                                    </p>
                                                                </div>
                                                            );
                                                        }

                                                        const correlations = [];
                                                        const averages = [];

                                                        // SONO
                                                        const sleepData = daysWithData.filter(d => d.sleep !== null);
                                                        if (sleepData.length >= 1) {
                                                            const correlation = sleepData.length >= 2 ? analyticsService.calculatePearsonCorrelation(sleepData, 'consumptions', 'sleep') : null;
                                                            const avgSleep = sleepData.reduce((sum, d) => sum + d.sleep, 0) / sleepData.length;
                                                            correlations.push({
                                                                name: 'Sono',
                                                                icon: '😴',
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
                                                                name: 'Humor',
                                                                icon: '😊',
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
                                                                name: 'Energia',
                                                                icon: '⚡',
                                                                correlation: correlation,
                                                                average: avgEnergy.toFixed(1),
                                                                unit: '/10',
                                                                dataPoints: energyData.length
                                                            });
                                                        }

                                                        if (correlations.length === 0) {
                                                            return (
                                                                <div className={themeClasses.container(darkMode) + ' rounded-xl p-8 border text-center'}>
                                                                    <div className="text-6xl mb-4">🔗</div>
                                                                    <h3 className={'text-xl font-bold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>Correlações</h3>
                                                                    <p className={'text-sm ' + (themeClasses.textTertiary(darkMode))}>
                                                                        Regista bem-estar (sono, humor, energia) para ver correlações com consumo.
                                                                    </p>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div className="space-y-4">
                                                                <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'font-semibold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>Correlação Consumos → Bem-estar</h3>
                                                                    <p className={'text-xs mb-4 ' + (themeClasses.textTertiary(darkMode))}>
                                                                        Correlação entre nº de consumos e bem-estar nos dias com dados
                                                                    </p>

                                                                    <div className="space-y-3">
                                                                        {correlations.map((corr, i) => {
                                                                            const getCorrelationLabel = (r) => {
                                                                                if (r === null) return { text: 'Sem dados', color: 'gray', desc: '' };
                                                                                const abs = Math.abs(r);
                                                                                if (r < -0.7) return { text: 'Forte Negativa', color: 'red', desc: 'Mais consumos → Muito pior bem-estar' };
                                                                                if (r < -0.4) return { text: 'Negativa', color: 'orange', desc: 'Mais consumos → Pior bem-estar' };
                                                                                if (r < -0.2) return { text: 'Fraca Negativa', color: 'yellow', desc: 'Mais consumos → Ligeiramente pior bem-estar' };
                                                                                if (r > 0.7) return { text: 'Forte Positiva', color: 'green', desc: 'Mais consumos → Muito melhor bem-estar' };
                                                                                if (r > 0.4) return { text: 'Positiva', color: 'green', desc: 'Mais consumos → Melhor bem-estar' };
                                                                                if (r > 0.2) return { text: 'Fraca Positiva', color: 'green', desc: 'Mais consumos → Ligeiramente melhor bem-estar' };
                                                                                return { text: 'Sem Correlação', color: 'gray', desc: 'Sem relação clara entre consumo e bem-estar' };
                                                                            };
                                                                            const corrLabel = getCorrelationLabel(corr.correlation);
                                                                            return (
                                                                                <div key={i} className={(themeClasses.containerLight(darkMode)) + ' rounded-lg p-4 border'}>
                                                                                    <div className="flex items-center justify-between mb-3">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-2xl">{corr.icon}</span>
                                                                                            <div>
                                                                                                <div className={'font-semibold ' + (themeClasses.textPrimaryAlt(darkMode))}>{corr.name}</div>
                                                                                                <div className={'text-xs ' + (themeClasses.textTertiary(darkMode))}>Média: {corr.average}{corr.unit}</div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className={'text-xs px-2 py-1 rounded-full font-medium ' + (corrLabel.color === 'red' ? (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') : corrLabel.color === 'orange' ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700') : corrLabel.color === 'yellow' ? (darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') : corrLabel.color === 'green' ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'))}>
                                                                                            {corrLabel.text}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className={'text-xs ' + (themeClasses.textTertiary(darkMode))}>
                                                                                        {corrLabel.desc && <span>💡 {corrLabel.desc}</span>}
                                                                                        {corr.correlation !== null && <span className="ml-2">• r = {corr.correlation.toFixed(2)}</span>}
                                                                                        <span className="ml-2">• {corr.dataPoints} dias</span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                {/* Consumo → Bem-estar (dia seguinte) */}
                                                                {(() => {
                                                                    const bidirectional = [];
                                                                    const sortedDates = Object.keys(dailyData).sort();

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

                                                                    if (bidirectional.length >= 1) {
                                                                        const getCorrelationLabel = (r) => {
                                                                            if (r === null) return { text: 'Sem dados', color: 'gray', desc: '' };
                                                                            if (r < -0.7) return { text: 'Forte Negativa', color: 'red', desc: 'Mais consumos hoje → Muito pior amanhã' };
                                                                            if (r < -0.4) return { text: 'Negativa', color: 'orange', desc: 'Mais consumos hoje → Pior amanhã' };
                                                                            if (r < -0.2) return { text: 'Fraca Negativa', color: 'yellow', desc: 'Mais consumos hoje → Ligeiramente pior amanhã' };
                                                                            if (r > 0.7) return { text: 'Forte Positiva', color: 'green', desc: 'Mais consumos hoje → Muito melhor amanhã' };
                                                                            if (r > 0.4) return { text: 'Positiva', color: 'green', desc: 'Mais consumos hoje → Melhor amanhã' };
                                                                            if (r > 0.2) return { text: 'Fraca Positiva', color: 'green', desc: 'Mais consumos hoje → Ligeiramente melhor amanhã' };
                                                                            return { text: 'Sem Correlação', color: 'gray', desc: 'Sem relação clara entre consumo e bem-estar' };
                                                                        };

                                                                        const bidirCorrelations = [];

                                                                        // Sono
                                                                        const sleepCorr = analyticsService.calculatePearsonCorrelation(bidirectional, 'consumptions', 'nextSleep');
                                                                        const sleepData = bidirectional.filter(d => d.nextSleep !== null);
                                                                        if (sleepData.length >= 1) {
                                                                            const avgNextSleep = sleepData.reduce((sum, d) => sum + d.nextSleep, 0) / sleepData.length;
                                                                            bidirCorrelations.push({
                                                                                name: 'Sono',
                                                                                icon: '😴',
                                                                                correlation: sleepCorr,
                                                                                average: avgNextSleep.toFixed(1),
                                                                                unit: 'h',
                                                                                dataPoints: sleepData.length
                                                                            });
                                                                        }

                                                                        // Humor
                                                                        const moodCorr = analyticsService.calculatePearsonCorrelation(bidirectional, 'consumptions', 'nextMood');
                                                                        const moodData = bidirectional.filter(d => d.nextMood !== null);
                                                                        if (moodData.length >= 1) {
                                                                            const avgNextMood = moodData.reduce((sum, d) => sum + d.nextMood, 0) / moodData.length;
                                                                            bidirCorrelations.push({
                                                                                name: 'Humor',
                                                                                icon: '😊',
                                                                                correlation: moodCorr,
                                                                                average: avgNextMood.toFixed(1),
                                                                                unit: '/10',
                                                                                dataPoints: moodData.length
                                                                            });
                                                                        }

                                                                        // Energia
                                                                        const energyCorr = analyticsService.calculatePearsonCorrelation(bidirectional, 'consumptions', 'nextEnergy');
                                                                        const energyData = bidirectional.filter(d => d.nextEnergy !== null);
                                                                        if (energyData.length >= 1) {
                                                                            const avgNextEnergy = energyData.reduce((sum, d) => sum + d.nextEnergy, 0) / energyData.length;
                                                                            bidirCorrelations.push({
                                                                                name: 'Energia',
                                                                                icon: '⚡',
                                                                                correlation: energyCorr,
                                                                                average: avgNextEnergy.toFixed(1),
                                                                                unit: '/10',
                                                                                dataPoints: energyData.length
                                                                            });
                                                                        }

                                                                        if (bidirCorrelations.length > 0) {
                                                                            return (
                                                                                <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                                    <h3 className={'font-semibold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>Impacto Temporal Consumo → Bem-estar</h3>
                                                                                    <p className={'text-xs mb-4 ' + (themeClasses.textTertiary(darkMode))}>
                                                                                        Correlação entre consumo hoje e bem-estar no dia seguinte
                                                                                    </p>

                                                                                    {bidirCorrelations.map((corr, i) => {
                                                                                        const label = getCorrelationLabel(corr.correlation);
                                                                                        const colorClasses = {
                                                                                            red: darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200',
                                                                                            orange: darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-orange-50 text-orange-700 border-orange-200',
                                                                                            yellow: darkMode ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                                                                            green: darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200',
                                                                                            gray: darkMode ? 'bg-gray-700/50 text-gray-400 border-gray-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                                                                                        };
                                                                                        return (
                                                                                            <div key={i} className={'rounded-lg p-4 border mb-3 last:mb-0 ' + colorClasses[label.color]}>
                                                                                                <div className="flex items-center justify-between mb-2">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <span className="text-xl">{corr.icon}</span>
                                                                                                        <span className="font-semibold">{corr.name} amanhã</span>
                                                                                                    </div>
                                                                                                    <div className="text-sm px-2 py-1 rounded-full font-medium bg-black/10">
                                                                                                        {label.text}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex items-center justify-between text-sm">
                                                                                                    <div>
                                                                                                        <span className="opacity-75">Média: </span>
                                                                                                        <span className="font-bold">{corr.average}{corr.unit}</span>
                                                                                                    </div>
                                                                                                    <div className="opacity-75">
                                                                                                        r = {corr.correlation !== null ? corr.correlation.toFixed(2) : 'N/A'} ({corr.dataPoints} dias)
                                                                                                    </div>
                                                                                                </div>
                                                                                                {label.desc && (
                                                                                                    <div className="text-xs opacity-75 mt-2">{label.desc}</div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            );
                                                                        }
                                                                    }
                                                                    return null;
                                                                })()}

                                                                {/* Sono → Humor */}
                                                                {(() => {
                                                                    const sleepToMoodData = [];
                                                                    const sortedDates = Object.keys(dailyData).sort();

                                                                    // Same day: Sleep → Mood
                                                                    const sameDaySleepMood = sortedDates
                                                                        .map(date => dailyData[date])
                                                                        .filter(day => day.sleep !== null && day.mood !== null)
                                                                        .map(day => ({ sleep: day.sleep, mood: day.mood }));

                                                                    // Next day: Tonight's sleep → Tomorrow's mood
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

                                                                    if (sameDaySleepMood.length >= 1 || nextDaySleepMood.length >= 1) {
                                                                        const getCorrelationLabel = (r) => {
                                                                            if (r === null) return { text: 'Sem dados', color: 'gray', desc: '' };
                                                                            if (r > 0.7) return { text: 'Forte Positiva', color: 'green', desc: 'Mais sono → Muito melhor humor' };
                                                                            if (r > 0.4) return { text: 'Positiva', color: 'green', desc: 'Mais sono → Melhor humor' };
                                                                            if (r > 0.2) return { text: 'Fraca Positiva', color: 'green', desc: 'Sono ajuda o humor' };
                                                                            if (r < -0.7) return { text: 'Forte Negativa', color: 'red', desc: 'Mais sono → Muito pior humor (incomum)' };
                                                                            if (r < -0.4) return { text: 'Negativa', color: 'orange', desc: 'Mais sono → Pior humor (incomum)' };
                                                                            if (r < -0.2) return { text: 'Fraca Negativa', color: 'yellow', desc: 'Possível correlação negativa' };
                                                                            return { text: 'Sem Correlação', color: 'gray', desc: 'Sem relação clara' };
                                                                        };

                                                                        const sleepMoodCorrelations = [];

                                                                        if (sameDaySleepMood.length >= 1) {
                                                                            const corr = analyticsService.calculatePearsonCorrelation(sameDaySleepMood, 'sleep', 'mood');
                                                                            const avgSleep = sameDaySleepMood.reduce((s, d) => s + d.sleep, 0) / sameDaySleepMood.length;
                                                                            const avgMood = sameDaySleepMood.reduce((s, d) => s + d.mood, 0) / sameDaySleepMood.length;
                                                                            sleepMoodCorrelations.push({
                                                                                name: 'Sono → Humor (mesmo dia)',
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
                                                                                icon: '😴💤😊',
                                                                                correlation: corr,
                                                                                avgSleep: avgSleep.toFixed(1),
                                                                                avgMood: avgMood.toFixed(1),
                                                                                dataPoints: nextDaySleepMood.length
                                                                            });
                                                                        }

                                                                        if (sleepMoodCorrelations.length > 0) {
                                                                            return (
                                                                                <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                                    <h3 className={'font-semibold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>😴💭 Sono → Humor</h3>
                                                                                    <p className={'text-xs mb-4 ' + (themeClasses.textTertiary(darkMode))}>
                                                                                        Como a qualidade/quantidade de sono influencia o humor
                                                                                    </p>
                                                                                    <div className="space-y-3">
                                                                                        {sleepMoodCorrelations.map((corr, i) => {
                                                                                            const label = getCorrelationLabel(corr.correlation);
                                                                                            const colorClasses = {
                                                                                                red: darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200',
                                                                                                orange: darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-orange-50 text-orange-700 border-orange-200',
                                                                                                yellow: darkMode ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                                                                                green: darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200',
                                                                                                gray: darkMode ? 'bg-gray-700/50 text-gray-400 border-gray-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                                                                                            };
                                                                                            return (
                                                                                                <div key={i} className={'rounded-lg p-4 border ' + colorClasses[label.color]}>
                                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <span className="text-xl">{corr.icon}</span>
                                                                                                            <span className="font-semibold">{corr.name}</span>
                                                                                                        </div>
                                                                                                        <div className="text-sm px-2 py-1 rounded-full font-medium bg-black/10">
                                                                                                            {label.text}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex items-center justify-between text-sm">
                                                                                                        <div>
                                                                                                            <span className="opacity-75">Sono: </span>
                                                                                                            <span className="font-bold">{corr.avgSleep}h</span>
                                                                                                            <span className="opacity-75"> • Humor: </span>
                                                                                                            <span className="font-bold">{corr.avgMood}/10</span>
                                                                                                        </div>
                                                                                                        <div className="opacity-75">
                                                                                                            r = {corr.correlation !== null ? corr.correlation.toFixed(2) : 'N/A'} ({corr.dataPoints} dias)
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    {label.desc && (
                                                                                                        <div className="text-xs opacity-75 mt-2">💡 {label.desc}</div>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }
                                                                    }

                                                                    return null;
                                                                })()}

                                                                {/* Hora de Deitar ↔ Consumo */}
                                                                {(() => {
                                                                    // Correlação entre hora de deitar e consumo
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

                                                                    const getCorrelationLabel = (r) => {
                                                                        if (r === null) return { text: 'Sem dados', color: 'gray', desc: '' };
                                                                        if (r < -0.7) return { text: 'Forte Negativa', color: 'green', desc: 'Deitar mais cedo → Menos consumo' };
                                                                        if (r < -0.4) return { text: 'Negativa', color: 'green', desc: 'Deitar cedo pode ajudar a reduzir consumo' };
                                                                        if (r < -0.2) return { text: 'Fraca Negativa', color: 'yellow', desc: 'Leve tendência: deitar cedo → menos consumo' };
                                                                        if (r > 0.7) return { text: 'Forte Positiva', color: 'red', desc: 'Deitar tarde → Muito mais consumo' };
                                                                        if (r > 0.4) return { text: 'Positiva', color: 'orange', desc: 'Deitar tarde → Mais consumo' };
                                                                        if (r > 0.2) return { text: 'Fraca Positiva', color: 'yellow', desc: 'Leve tendência: deitar tarde → mais consumo' };
                                                                        return { text: 'Sem Correlação', color: 'gray', desc: 'Hora de deitar não parece afetar consumo' };
                                                                    };

                                                                    const correlation = bedtimeConsumptionData.length >= 1 ? analyticsService.calculatePearsonCorrelation(bedtimeConsumptionData, 'bedtime', 'consumptions') : null;
                                                                    const label = getCorrelationLabel(correlation);

                                                                    const colorClasses = {
                                                                        red: darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200',
                                                                        orange: darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-orange-50 text-orange-700 border-orange-200',
                                                                        yellow: darkMode ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                                                        green: darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200',
                                                                        gray: darkMode ? 'bg-gray-700/50 text-gray-400 border-gray-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                                                                    };

                                                                    return (
                                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                            <h3 className={'font-semibold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>🕐💊 Hora de Deitar vs Consumo</h3>
                                                                            <p className={'text-xs mb-4 ' + (themeClasses.textTertiary(darkMode))}>
                                                                                Correlação entre a hora que te deitas e o consumo desse dia
                                                                            </p>
                                                                            {bedtimeConsumptionData.length >= 1 ? (
                                                                                <div className={'rounded-lg p-4 border ' + colorClasses[label.color]}>
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-xl">🕐➡️💊</span>
                                                                                            <span className="font-semibold">Bedtime → Consumo</span>
                                                                                        </div>
                                                                                        <div className="text-sm px-2 py-1 rounded-full font-medium bg-black/10">
                                                                                            {label.text}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-sm mb-2">
                                                                                        <span className="opacity-75">Hora média de deitar: </span>
                                                                                        <span className="font-bold">{(() => {
                                                                                            const avgBedtime = bedtimeConsumptionData.reduce((s, d) => s + d.bedtime, 0) / bedtimeConsumptionData.length;
                                                                                            const adjustedMinutes = avgBedtime >= 1440 ? avgBedtime - 1440 : avgBedtime;
                                                                                            const avgBedtimeHours = Math.floor(adjustedMinutes / 60);
                                                                                            const avgBedtimeMins = Math.round(adjustedMinutes % 60);
                                                                                            return `${String(avgBedtimeHours).padStart(2, '0')}:${String(avgBedtimeMins).padStart(2, '0')}`;
                                                                                        })()}</span>
                                                                                        <span className="opacity-75"> • Consumo médio: </span>
                                                                                        <span className="font-bold">{(bedtimeConsumptionData.reduce((s, d) => s + d.consumptions, 0) / bedtimeConsumptionData.length).toFixed(1)}/dia</span>
                                                                                    </div>
                                                                                    <div className="text-xs opacity-75">
                                                                                        {label.desc && <span>💡 {label.desc}</span>}
                                                                                        {correlation !== null && <span className="ml-2">• r = {correlation.toFixed(2)}</span>}
                                                                                        <span className="ml-2">• {bedtimeConsumptionData.length} dias</span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className={'text-center py-6 text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                                    Sem dados de hora de deitar registados
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}

                                                                {/* Gatilhos/Emoções → Consumo */}
                                                                {(() => {
                                                                    // Analisar gatilhos e emoções de alto risco
                                                                    const triggerData = {};
                                                                    const emotionData = {};

                                                                    filteredCycles.forEach(cycle => {
                                                                        if (!cycle.triggers || cycle.triggers.length === 0) return;
                                                                        const cycleDate = safeToISODate(cycle.timestamp);
                                                                        if (!cycleDate) return;
                                                                        const dayConsumptions = filteredConsumptions.filter(c => c.date === cycleDate).length;

                                                                        cycle.triggers.forEach(trigger => {
                                                                            if (!triggerData[trigger]) {
                                                                                triggerData[trigger] = { count: 0, totalConsumptions: 0, days: [] };
                                                                            }
                                                                            triggerData[trigger].count++;
                                                                            triggerData[trigger].totalConsumptions += dayConsumptions;
                                                                            triggerData[trigger].days.push(dayConsumptions);
                                                                        });
                                                                    });

                                                                    // Análise de emoções
                                                                    analysisWellbeing.forEach(w => {
                                                                        if (!w.emotions || w.emotions.length === 0) return;
                                                                        const wDate = w.date || safeToISODate(w.timestamp);
                                                                        if (!wDate) return;
                                                                        const dayConsumptions = filteredConsumptions.filter(c => c.date === wDate).length;

                                                                        w.emotions.forEach(emotion => {
                                                                            if (!emotionData[emotion]) {
                                                                                emotionData[emotion] = { count: 0, totalConsumptions: 0, days: [] };
                                                                            }
                                                                            emotionData[emotion].count++;
                                                                            emotionData[emotion].totalConsumptions += dayConsumptions;
                                                                            emotionData[emotion].days.push(dayConsumptions);
                                                                        });
                                                                    });

                                                                    // Calcular médias e identificar alto risco
                                                                    const avgConsumptions = filteredConsumptions.length / Math.max(1, [...new Set(filteredConsumptions.map(c => c.date))].length);

                                                                    const highRiskTriggers = Object.entries(triggerData)
                                                                        .map(([trigger, data]) => ({
                                                                            trigger,
                                                                            avgConsumptions: data.totalConsumptions / data.count,
                                                                            count: data.count
                                                                        }))
                                                                        .filter(t => t.avgConsumptions > avgConsumptions && t.count >= 2);

                                                                    const highRiskEmotions = Object.entries(emotionData)
                                                                        .map(([emotion, data]) => ({
                                                                            emotion,
                                                                            avgConsumptions: data.totalConsumptions / data.count,
                                                                            count: data.count
                                                                        }))
                                                                        .filter(e => e.avgConsumptions > avgConsumptions && e.count >= 2);

                                                                    // Identificar se ansiedade/stress estão presentes
                                                                    const anxietyStressTriggers = highRiskTriggers.filter(t =>
                                                                        t.trigger.toLowerCase().includes('ansiedade') ||
                                                                        t.trigger.toLowerCase().includes('stress') ||
                                                                        t.trigger.toLowerCase().includes('ansioso')
                                                                    );

                                                                    const anxietyStressEmotions = highRiskEmotions.filter(e =>
                                                                        e.emotion.toLowerCase().includes('ansioso') ||
                                                                        e.emotion.toLowerCase().includes('stress') ||
                                                                        e.emotion.toLowerCase().includes('nervoso')
                                                                    );

                                                                    const hasAnxietyStress = anxietyStressTriggers.length > 0 || anxietyStressEmotions.length > 0;

                                                                    if (!hasAnxietyStress) return null;

                                                                    // Construir lista de gatilhos/emoções identificados
                                                                    const identifiedItems = [];
                                                                    anxietyStressTriggers.forEach(t => identifiedItems.push(t.trigger));
                                                                    anxietyStressEmotions.forEach(e => identifiedItems.push(e.emotion));

                                                                    return (
                                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                            <h3 className={'font-semibold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>😰💊 Gatilhos Emocionais vs Consumo</h3>
                                                                            <p className={'text-xs mb-4 ' + (themeClasses.textTertiary(darkMode))}>
                                                                                Correlação entre estados emocionais e padrões de consumo
                                                                            </p>
                                                                            <div className={(darkMode ? 'bg-orange-900/20 border-orange-700/50' : 'bg-orange-50 border-orange-200') + ' rounded-lg p-4 border'}>
                                                                                <div className="flex items-start gap-3">
                                                                                    <span className="text-2xl">⚠️</span>
                                                                                    <div className="flex-1">
                                                                                        <div className={'font-semibold mb-2 ' + (darkMode ? 'text-orange-300' : 'text-orange-700')}>
                                                                                            Padrão Identificado
                                                                                        </div>
                                                                                        <div className={'text-sm leading-relaxed ' + (darkMode ? 'text-orange-200/90' : 'text-orange-900/90')}>
                                                                                            Pareces mais propenso/a a consumir quando te sentes: <strong>{identifiedItems.join(', ')}</strong>.
                                                                                        </div>
                                                                                        <div className={'text-xs mt-3 ' + (darkMode ? 'text-orange-400/70' : 'text-orange-700/70')}>
                                                                                            💡 Identificar este padrão é o primeiro passo. Prepara estratégias DBT (skills de tolerância ao distress) para quando estes estados surgirem.
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}

                                                                {/* Análise Intraciclo */}
                                                                {(() => {
                                                                    const cycleData = {};

                                                                    analysisConsumptions.forEach(c => {
                                                                        if (!c.cycleId) return;
                                                                        if (!cycleData[c.cycleId]) cycleData[c.cycleId] = { consumptions: [], wellbeing: [] };
                                                                        cycleData[c.cycleId].consumptions.push({ timestamp: c.timestamp, type: 'consumption' });
                                                                    });

                                                                    analysisWellbeing.forEach(w => {
                                                                        if (!w.cycleId) return;
                                                                        if (!cycleData[w.cycleId]) cycleData[w.cycleId] = { consumptions: [], wellbeing: [] };
                                                                        if (w.mood && !isNaN(parseInt(w.mood))) {
                                                                            cycleData[w.cycleId].wellbeing.push({ timestamp: w.timestamp, mood: parseInt(w.mood), energy: parseInt(w.energy) || null });
                                                                        }
                                                                    });

                                                                    const cyclesWithData = Object.values(cycleData).filter(c => c.consumptions.length > 0 && c.wellbeing.length >= 1);

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
                                                                                const startEnergy = startSegment.filter(w => w.energy).reduce((s, w) => s + w.energy, 0) / startSegment.filter(w => w.energy).length;
                                                                                const endEnergy = endSegment.filter(w => w.energy).reduce((s, w) => s + w.energy, 0) / endSegment.filter(w => w.energy).length;

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

                                                                        return (
                                                                            <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                                <h3 className={'font-semibold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>🔄 Análise Intraciclo Detalhada</h3>
                                                                                <p className={'text-xs mb-4 ' + (themeClasses.textTertiary(darkMode))}>
                                                                                    Como evoluem humor, energia e consumo dentro do mesmo ciclo de sono (período entre acordar e voltar a dormir)
                                                                                </p>
                                                                                <div className="space-y-4">
                                                                                    {/* Evolução de Humor */}
                                                                                    <div className={(darkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200') + ' rounded-lg p-4 border'}>
                                                                                        <div className={'text-sm font-semibold mb-3 ' + (darkMode ? 'text-blue-300' : 'text-blue-800')}>📊 Evolução de Humor no Ciclo</div>

                                                                                        {avgMoodStart && avgMoodEnd && (() => {
                                                                                            const diff = parseFloat(avgMoodEnd) - parseFloat(avgMoodStart);
                                                                                            const arrow = diff > 0.5 ? '↗️' : diff < -0.5 ? '↘️' : '→';
                                                                                            const trendText = diff > 0.5 ? 'O teu humor melhora ao longo do ciclo!' : diff < -0.5 ? 'O teu humor piora ao longo do ciclo.' : 'O teu humor mantém-se estável no ciclo.';

                                                                                            return (
                                                                                                <>
                                                                                                    <div className="flex items-center justify-between mb-3">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <span className={'text-lg font-bold ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>{avgMoodStart}</span>
                                                                                                            <span className="text-xl">{arrow}</span>
                                                                                                            <span className={'text-lg font-bold ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>{avgMoodEnd}</span>
                                                                                                        </div>
                                                                                                        <span className={'text-sm font-semibold px-2 py-1 rounded ' + (diff > 0.5 ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : diff < -0.5 ? (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') : (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'))}>
                                                                                                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <p className={'text-xs italic ' + (themeClasses.textTertiary(darkMode))}>
                                                                                                        💬 {trendText}
                                                                                                    </p>
                                                                                                </>
                                                                                            );
                                                                                        })()}
                                                                                    </div>

                                                                                    {/* Evolução de Energia */}
                                                                                    {avgEnergyStart && avgEnergyEnd && (() => {
                                                                                        const diff = parseFloat(avgEnergyEnd) - parseFloat(avgEnergyStart);
                                                                                        const arrow = diff > 0.5 ? '↗️' : diff < -0.5 ? '↘️' : '→';
                                                                                        const trendText = diff > 0.5 ? 'A tua energia aumenta ao longo do ciclo!' : diff < -0.5 ? 'A tua energia diminui ao longo do ciclo.' : 'A tua energia mantém-se estável no ciclo.';

                                                                                        return (
                                                                                            <div className={(darkMode ? 'bg-yellow-900/20 border-yellow-700/50' : 'bg-yellow-50 border-yellow-200') + ' rounded-lg p-4 border'}>
                                                                                                <div className={'text-sm font-semibold mb-3 ' + (darkMode ? 'text-yellow-300' : 'text-yellow-800')}>⚡ Evolução de Energia no Ciclo</div>
                                                                                                <div className="flex items-center justify-between mb-3">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <span className={'text-lg font-bold ' + (darkMode ? 'text-yellow-400' : 'text-yellow-600')}>{avgEnergyStart}</span>
                                                                                                        <span className="text-xl">{arrow}</span>
                                                                                                        <span className={'text-lg font-bold ' + (darkMode ? 'text-yellow-400' : 'text-yellow-600')}>{avgEnergyEnd}</span>
                                                                                                    </div>
                                                                                                    <span className={'text-sm font-semibold px-2 py-1 rounded ' + (diff > 0.5 ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : diff < -0.5 ? (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') : (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'))}>
                                                                                                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <p className={'text-xs italic ' + (themeClasses.textTertiary(darkMode))}>
                                                                                                    💬 {trendText}
                                                                                                </p>
                                                                                            </div>
                                                                                        );
                                                                                    })()}

                                                                                    {/* Padrão Temporal de Consumo */}
                                                                                    {totalCons > 0 && (() => {
                                                                                        const startPct = Math.round(consumptionTiming.start / totalCons * 100);
                                                                                        const middlePct = Math.round(consumptionTiming.middle / totalCons * 100);
                                                                                        const endPct = Math.round(consumptionTiming.end / totalCons * 100);

                                                                                        let insight = '';
                                                                                        if (endPct >= 50) {
                                                                                            insight = `Consumos concentram-se no final do ciclo (${endPct}%). Considera espaçar melhor ao longo do dia para evitar picos antes de dormir.`;
                                                                                        } else if (startPct >= 50) {
                                                                                            insight = `Consumos concentram-se no início do ciclo (${startPct}%). Isto pode indicar consumo logo após acordar.`;
                                                                                        } else if (Math.max(startPct, middlePct, endPct) - Math.min(startPct, middlePct, endPct) < 15) {
                                                                                            insight = 'Distribuição equilibrada de consumos ao longo do ciclo.';
                                                                                        } else {
                                                                                            insight = 'Padrão variável de consumo ao longo do ciclo.';
                                                                                        }

                                                                                        return (
                                                                                            <div className={(darkMode ? 'bg-purple-900/20 border-purple-700/50' : 'bg-purple-50 border-purple-200') + ' rounded-lg p-4 border'}>
                                                                                                <div className={'text-sm font-semibold mb-3 ' + (darkMode ? 'text-purple-300' : 'text-purple-800')}>⏰ Padrão de Consumo no Ciclo</div>
                                                                                                <div className="space-y-2 mb-3">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className={'text-xs w-20 ' + (themeClasses.textTertiary(darkMode))}>Início (33%)</div>
                                                                                                        <div className="flex-1">
                                                                                                            <div className={(themeClasses.bgTertiaryAlt(darkMode)) + ' rounded-full h-6 overflow-hidden'}>
                                                                                                                <div className={'h-full bg-purple-500 flex items-center px-2 text-white text-xs font-bold'} style={{width: Math.max(5, startPct) + '%'}}>
                                                                                                                    {startPct}%
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className={'text-xs w-20 ' + (themeClasses.textTertiary(darkMode))}>Meio (33%)</div>
                                                                                                        <div className="flex-1">
                                                                                                            <div className={(themeClasses.bgTertiaryAlt(darkMode)) + ' rounded-full h-6 overflow-hidden'}>
                                                                                                                <div className={'h-full bg-purple-500 flex items-center px-2 text-white text-xs font-bold'} style={{width: Math.max(5, middlePct) + '%'}}>
                                                                                                                    {middlePct}%
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className={'text-xs w-20 ' + (themeClasses.textTertiary(darkMode))}>Fim (33%)</div>
                                                                                                        <div className="flex-1">
                                                                                                            <div className={(themeClasses.bgTertiaryAlt(darkMode)) + ' rounded-full h-6 overflow-hidden'}>
                                                                                                                <div className={'h-full bg-purple-600 flex items-center px-2 text-white text-xs font-bold'} style={{width: Math.max(5, endPct) + '%'}}>
                                                                                                                    {endPct}%
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <p className={'text-xs italic ' + (themeClasses.textTertiary(darkMode))}>
                                                                                                    💬 {insight}
                                                                                                </p>
                                                                                            </div>
                                                                                        );
                                                                                    })()}

                                                                                    {/* Impacto do Consumo - Novo Componente com Gráficos (Lazy Loaded) */}
                                                                                    <Suspense fallback={
                                                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border text-center'}>
                                                                                            <div className="animate-pulse">
                                                                                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mx-auto mb-4"></div>
                                                                                                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                                                            </div>
                                                                                            <p className="text-xs text-gray-500 mt-2">A carregar gráfico...</p>
                                                                                        </div>
                                                                                    }>
                                                                                        <WellbeingChart
                                                                                            wellbeingLogs={analysisWellbeing}
                                                                                            consumptions={analysisConsumptions}
                                                                                            darkMode={darkMode}
                                                                                            selectedCycle={currentCycle}
                                                                                        />
                                                                                    </Suspense>

                                                                                    {/* Intervalo Médio */}
                                                                                    {avgInterval && (
                                                                                        <div className={(darkMode ? 'bg-indigo-900/20 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' rounded-lg p-4 border'}>
                                                                                            <div className={'text-sm font-semibold mb-2 ' + (darkMode ? 'text-indigo-300' : 'text-indigo-800')}>⏱️ Intervalo Médio Entre Consumos</div>
                                                                                            <div className={'text-2xl font-bold ' + (darkMode ? 'text-indigo-400' : 'text-indigo-600')}>
                                                                                                {avgInterval}h
                                                                                            </div>
                                                                                            <div className={'text-xs mt-1 ' + (themeClasses.textTertiary(darkMode))}>
                                                                                                Tempo médio entre consumos dentro do mesmo ciclo
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                                                            <h3 className={'font-semibold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>🔄 Análise Intraciclo Detalhada</h3>
                                                                            <p className={'text-xs mb-4 ' + (themeClasses.textTertiary(darkMode))}>
                                                                                Como evoluem humor, energia e consumo dentro do mesmo ciclo de sono
                                                                            </p>
                                                                            <div className={'text-center py-6 text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                                                                Sem dados de ciclos com consumo e bem-estar registados
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                    })()}
                                </div>
    );
}
