import React, { useState, Suspense } from 'react';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { analyzeMultipleNotes, identifyThemes } from '../utils/sentimentAnalysis';
import { getGoalAchievementCount } from '../utils/goalUtils';
import { safeToISODate } from '../utils/helpers';

// Lazy load heavy components
const WellbeingChart = React.lazy(() => import('../components/WellbeingChart'));

export const AnalysesView = () => {
    const { consumptions, wellbeingLogs, cycles, dailyLogs, reflections, thoughts, goals } = useData();
    const { darkMode } = useUI();

    const [patternsPeriod, setPatternsPeriod] = useState('tudo'); // hoje, semana, mes, tudo
    const [patternsPeriodOffset, setPatternsPeriodOffset] = useState(0); // 0 = current, 1 = previous, etc
    const [analysisSubView, setAnalysisSubView] = useState('estrutural'); // estrutural, correlacoes, coach

    // Helper proxies
    const getDateRangeForPeriod = (period, offset = 0) => analyticsService.getDateRangeForPeriod(period, offset);
    const filterByDateRange = (items, dateRange, dateField = 'timestamp') => analyticsService.filterByDateRange(items, dateRange, dateField);

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

                // Usar dados filtrados diretamente (sem excluir dia atual)
                const analysisConsumptions = filterByDateRange(consumptions, dateRange);
                const analysisWellbeing = filterByDateRange(wellbeingLogs, dateRange);
                const analysisCycles = filterByDateRange(cycles, dateRange);
                const analysisDailyLogs = filterByDateRange(dailyLogs, dateRange);
                const analysisReflections = filterByDateRange(reflections, dateRange);
                const analysisThoughts = filterByDateRange(thoughts, dateRange);

                // Calculate all needed data
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

                        {/* COACH / REFLEXÃO GERAL */}
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
                            const avgInterval = intervals.length > 0 ? (intervals.reduce((sum, i) => sum + i.hours, 0) / intervals.length).toFixed(1) : 0;
                            const goodIntervals = intervals.filter(i => i.hours >= 2).length;
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

                            // Sentiment analysis
                            const allNotes = [
                                ...analysisConsumptions.map(c => c.notes || ''),
                                ...analysisWellbeing.map(w => w.notes || ''),
                                ...analysisCycles.map(c => c.notes || ''),
                                ...analysisReflections.map(r => r.answer || ''),
                                ...analysisDailyLogs.map(d => d.notes || ''),
                                ...analysisThoughts.map(t => t.content || '')
                            ].filter(n => n.length > 0);

                            const sentimentAnalysis = analyzeMultipleNotes(allNotes);
                            const sentimentThemes = identifyThemes(allNotes);

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

                                            {/* Paragraph 4: Wellbeing Integration */}
                                            {(avgMood || avgEnergy || avgSleep) && (
                                                <p>
                                                    Sobre o teu bem-estar geral:
                                                    {avgSleep && <> estás a dormir em média <strong className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>{avgSleep} horas</strong>{parseFloat(avgSleep) < 6 ? ', o que é abaixo do recomendado' : parseFloat(avgSleep) > 9 ? ', o que pode indicar necessidade de descanso extra' : ' - um valor razoável'}.</>}
                                                    {avgMood && <> O teu humor médio foi de <strong className={(parseFloat(avgMood) >= 7 ? (darkMode ? 'text-green-400' : 'text-green-600') : parseFloat(avgMood) >= 5 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-red-400' : 'text-red-600'))}>{avgMood}/10</strong>.</>}
                                                    {avgEnergy && <> Energia média: <strong className={(parseFloat(avgEnergy) >= 7 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>{avgEnergy}/10</strong>.</>}
                                                </p>
                                            )}

                                            {/* Paragraph 5: Sentiment Analysis */}
                                            <p>
                                                {allNotes.length > 0 ? (
                                                    <>
                                                        📝 <strong className={(darkMode ? 'text-purple-400' : 'text-purple-600')}>Análise das tuas Reflexões</strong>:
                                                        {(() => {
                                                            const dist = sentimentAnalysis.distribution;
                                                            const total = sentimentAnalysis.noteCount;
                                                            const positivePercent = Math.round(((dist.very_positive + dist.positive) / total) * 100);
                                                            const negativePercent = Math.round(((dist.very_negative + dist.negative) / total) * 100);

                                                            let realOverall = 'neutral';
                                                            if (positivePercent >= 60) realOverall = 'positive';
                                                            else if (negativePercent >= 60) realOverall = 'negative';

                                                            return (
                                                                <>
                                                                    <br/>
                                                                    🔍 <strong className={(darkMode ? 'text-indigo-300' : 'text-indigo-700')}>Padrões emocionais:</strong>
                                                                    {realOverall === 'positive' ? (
                                                                        <> Tom geral <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>positivo</strong> ({positivePercent}%). Há esperança e resiliência nas tuas notas. </>
                                                                    ) : realOverall === 'negative' ? (
                                                                        <> Tom geral <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>negativo</strong> ({negativePercent}%). Reconheço que estás a enfrentar dificuldades. </>
                                                                    ) : (
                                                                        <> Tom equilibrado. Estás a navegar os altos e baixos. </>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </>
                                                ) : (
                                                    <> Encorajo-te a escrever mais nas tuas reflexões - ajuda a identificar padrões. </>
                                                )}
                                            </p>

                                            {/* Paragraph 6: Autoconhecimento */}
                                            {(analysisWellbeing.length > 3 || analysisCycles.length > 2) && (
                                                <p>
                                                    ✨ <strong className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>Autoconhecimento:</strong> Estás a registar de forma consistente.
                                                    <span className={'font-medium ' + (darkMode ? 'text-cyan-400' : 'text-cyan-600')}> Isto já é um passo enorme! Registar é autoconsciência.</span>
                                                </p>
                                            )}

                                            {/* Paragraph 7: Closing */}
                                            <p className={'font-medium pt-2 border-t ' + (darkMode ? 'border-gray-700 text-purple-400' : 'border-gray-200 text-purple-600')}>
                                                🤝 <strong>Compromisso:</strong> O simples facto de estares aqui, a registar, a refletir, a analisar - isso já é mudança.
                                                <span> Redução de danos não é perfeição, é progresso. E tu estás a progredir. 💜</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
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
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

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

                            return (
                                <div className="space-y-4">
                                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                                        <h3 className={'font-semibold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>Impacto do Consumo</h3>
                                        <p className={'text-xs mb-4 ' + (themeClasses.textTertiary(darkMode))}>
                                            Análise simplificada de correlações (requer mais dados para análise profunda).
                                        </p>

                                        <Suspense fallback={<div className="h-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>}>
                                            <WellbeingChart
                                                wellbeingLogs={analysisWellbeing}
                                                consumptions={analysisConsumptions}
                                                darkMode={darkMode}
                                            />
                                        </Suspense>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                );
            })()}
        </div>
    );
};
