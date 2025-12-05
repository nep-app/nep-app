import React, { useMemo, lazy, Suspense } from 'react';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import { safeToISODate, timestampToPT, getTodayPT } from '../utils/helpers';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { useAnalysisCalculations } from '../hooks/useAnalysisCalculations';

const WellbeingChart = lazy(() => import('../components/WellbeingChart'));

const { getPeriodLabel, getGoalAchievementCount } = analyticsService;

export function AnalysesView({
    analysisSubView,
    setAnalysisSubView,
    patternsPeriod,
    setPatternsPeriod,
    patternsPeriodOffset,
    setPatternsPeriodOffset
}) {
    const dataContext = useData();
    const { goals } = dataContext;
    const { darkMode, currentCycle } = useUI();
    const metrics = useMetrics();

    // Use custom hooks for data filtering and calculations
    const filteredData = useAnalysisData(patternsPeriod, patternsPeriodOffset, dataContext);
    const calculations = useAnalysisCalculations(filteredData, goals);

    const {
        filteredConsumptions: analysisConsumptions,
        filteredWellbeingLogs: analysisWellbeing,
        filteredCycles: analysisCycles,
        filteredDailyLogs: analysisDailyLogs,
        dateRange
    } = filteredData;

    const { stats, patterns, sentiment, correlations, goalsStats, selfCare, riskProfile, cycleStats, energyImpact } = calculations;

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
                        {new Date(dateRange.start).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ' - ' + new Date(dateRange.end).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                )}
            </div>

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

                {/* TEMPORAL / COACH */}
                {analysisSubView === 'coach' && (
                    stats.totalConsumptions === 0 && analysisWellbeing.length === 0 ? (
                        <div className={(darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500') + ' rounded-xl p-6 border text-center'}>Sem dados para este período</div>
                    ) : (
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
                                        {stats.totalConsumptions > 0 ? (
                                            <> Registaste <strong className={(darkMode ? 'text-purple-400' : 'text-purple-600')}>{stats.totalConsumptions} {stats.totalConsumptions === 1 ? 'consumo' : 'consumos'}</strong> ao longo de {stats.uniqueDays} {stats.uniqueDays === 1 ? 'dia' : 'dias'}, com uma média de <strong>{stats.avgPerDay} consumos/dia</strong>.</>
                                        ) : (
                                            <> Não tens consumos registados neste período - isso é excelente! </>
                                        )}
                                    </p>

                                    {/* Paragraph 2: Patterns and Progress */}
                                    {stats.totalConsumptions > 0 && (
                                        <p>
                                            {stats.intervals.length > 0 ? (
                                                <>
                                                    Notei que tens um intervalo médio de <strong className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>{stats.avgInterval} horas</strong> entre consumos.
                                                    {stats.goodPercent >= 50 ? (
                                                        <> <span className={'font-medium ' + (darkMode ? 'text-green-400' : 'text-green-600')}>Isso é fantástico - {stats.goodPercent}% dos teus intervalos são ≥2h!</span> Estás a conseguir espaçar bem os consumos, o que demonstra grande controlo.</>
                                                    ) : (
                                                        <> Há espaço para melhorar aqui - atualmente {stats.goodPercent}% dos intervalos são ≥2h. Pequenas mudanças, como adicionar uma atividade entre consumos, podem fazer grande diferença.</>
                                                    )}
                                                </>
                                            ) : (
                                                <> Neste período ainda não tenho dados suficientes sobre intervalos, mas vamos continuar a acompanhar juntos.</>
                                            )}
                                        </p>
                                    )}

                                    {/* Paragraph 3: Time Patterns */}
                                    {stats.totalConsumptions > 0 && patterns.maxPartOfDay[1] > 0 && (() => {
                                        const partNames = { manha: 'manhã', tarde: 'tarde', noite: 'noite', madrugada: 'madrugada' };
                                        return (
                                            <p>
                                                Reparei que a maioria dos teus consumos ({Math.round((patterns.maxPartOfDay[1] / stats.totalConsumptions) * 100)}%) acontece à <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>{partNames[patterns.maxPartOfDay[0]]}</strong>.
                                                {patterns.maxPartOfDay[0] === 'madrugada' && (
                                                    <> Consumir durante a madrugada pode indicar dificuldades com o sono ou ansiedade noturna. Tens pensado no que te leva a consumir nesse período? Talvez seja útil explorar técnicas de relaxamento para a noite.</>
                                                )}
                                                {patterns.maxPartOfDay[0] === 'noite' && (
                                                    <> A noite é um período comum para consumo, muitas vezes ligado ao descontrair após o dia. Considera se há formas alternativas de relaxar que te fazem sentir bem.</>
                                                )}
                                                {patterns.maxPartOfDay[0] === 'tarde' && (
                                                    <> As tardes podem ser desafiantes, especialmente se há rotinas ou gatilhos específicos. Identifica o que precede esses momentos.</>
                                                )}
                                                {patterns.maxPartOfDay[0] === 'manha' && (
                                                    <> Consumir pela manhã pode estar relacionado com o acordar ou com a gestão de ansiedade matinal. Observa como te sentes ao acordar e se há padrões.</>
                                                )}
                                            </p>
                                        );
                                    })()}

                                    {/* Paragraph 4: Wellbeing Integration */}
                                    {(stats.avgMood || stats.avgEnergy || stats.avgSleep) && (
                                        <p>
                                            Sobre o teu bem-estar geral:
                                            {stats.avgSleep && <> estás a dormir em média <strong className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>{stats.avgSleep} horas</strong>{parseFloat(stats.avgSleep) < 6 ? ', o que é abaixo do recomendado - o sono é fundamental para a recuperação e regulação emocional' : parseFloat(stats.avgSleep) > 9 ? ', o que pode indicar necessidade de descanso extra ou até depressão - observa como te sentes' : parseFloat(stats.avgSleep) >= 7 && parseFloat(stats.avgSleep) <= 9 ? ' - excelente! Esse é o intervalo ideal para a maioria das pessoas' : ' - um valor razoável'}.</>}
                                            {stats.avgMood && <> O teu humor médio foi de <strong className={(parseFloat(stats.avgMood) >= 7 ? (darkMode ? 'text-green-400' : 'text-green-600') : parseFloat(stats.avgMood) >= 5 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-red-400' : 'text-red-600'))}>{stats.avgMood}/10</strong>{parseFloat(stats.avgMood) >= 7 ? ' - isso é muito positivo!' : parseFloat(stats.avgMood) >= 5 ? ' - moderado, com espaço para melhorias.' : ' - isto preocupa-me. Como te podes apoiar melhor?'}.</>}
                                            {stats.avgEnergy && <> Energia média: <strong className={(parseFloat(stats.avgEnergy) >= 7 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>{stats.avgEnergy}/10</strong>{parseFloat(stats.avgEnergy) < 5 ? '. Níveis baixos de energia podem estar relacionados com o consumo, sono ou alimentação.' : '.'}.</>}
                                        </p>
                                    )}

                                    {/* Goals Analysis */}
                                    {goalsStats && goalsStats.totalAchievements > 0 && (
                                        <p>
                                            🎯 <strong className={(darkMode ? 'text-pink-400' : 'text-pink-600')}>Progresso de Metas:</strong> Cumpriste condições das tuas metas <strong>{goalsStats.totalAchievements} vezes</strong> neste período!
                                            {goalsStats.goalsWithAchievements.length === goalsStats.uniqueGoals.length ? (
                                                <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Todas as {goalsStats.uniqueGoals.length} metas ativas tiveram cumprimentos - isso é incrível!</span></>
                                            ) : goalsStats.goalsWithAchievements.length > 0 ? (
                                                <> Progredir em {goalsStats.goalsWithAchievements.length} de {goalsStats.uniqueGoals.length} metas.</>
                                            ) : (
                                                <> Ainda não atingiste nenhuma meta neste período - ajustar metas é parte do processo.</>
                                            )}
                                        </p>
                                    )}

                                    {/* Correlations: Sleep -> Mood */}
                                    {correlations.sleepToMood && (
                                        <p>
                                            💤➡️😊 <strong className={(darkMode ? 'text-indigo-400' : 'text-indigo-600')}>Sono e Humor:</strong> Analisei como o teu sono afeta o humor no dia seguinte.
                                            {correlations.sleepToMood > 0.4 ? (
                                                <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Correlação forte (+{correlations.sleepToMood.toFixed(2)}):</span> Dormir bem <strong>melhora claramente</strong> o teu humor no dia seguinte! Nos dados, mais sono = humor melhor. <strong className={(darkMode ? 'text-green-300' : 'text-green-700')}>💡 Ação: Prioriza 7-8h de sono - é o teu melhor investimento emocional.</strong></>
                                            ) : correlations.sleepToMood > 0.2 ? (
                                                <> <span className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>Correlação moderada (+{correlations.sleepToMood.toFixed(2)}):</span> Há uma ligação positiva entre sono e humor, mas outros fatores também influenciam. <strong className={(darkMode ? 'text-blue-300' : 'text-blue-700')}>💡 Ação: Melhora a qualidade do sono (ambiente escuro, horário regular).</strong></>
                                            ) : null}
                                        </p>
                                    )}

                                    {/* Correlations: Consumption -> Wellbeing */}
                                    {correlations.mood && Math.abs(correlations.mood) > 0.3 && (
                                        <p>
                                            🔍 <strong className={(darkMode ? 'text-indigo-400' : 'text-indigo-600')}>Impacto do Consumo:</strong> Analisei como o consumo de hoje afeta o teu bem-estar amanhã.
                                            {correlations.mood < -0.3 ? (
                                                <> <span className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>Correlação moderada ({correlations.mood.toFixed(2)}):</span> Há um padrão onde dias de mais consumo tendem a preceder humor mais baixo. <strong className={(darkMode ? 'text-orange-300' : 'text-orange-700')}>💡 Reduzir consumo pode melhorar o teu estado emocional.</strong></>
                                            ) : null}
                                        </p>
                                    )}

                                    {/* Self Care */}
                                    {selfCare && (
                                        <p>
                                            💧 <strong className={(darkMode ? 'text-teal-400' : 'text-teal-600')}>Autocuidado:</strong> A tua taxa geral está em <strong className={(selfCare.overall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>{selfCare.overall.toFixed(0)}%</strong>.
                                            {selfCare.lowAreas.length > 0 && (
                                                <> Foca primeiro em {selfCare.lowAreas[0].area} ({selfCare.lowAreas[0].percent.toFixed(0)}%).</>
                                            )}
                                        </p>
                                    )}

                                    {/* Risk Profile */}
                                    {riskProfile && Math.abs(riskProfile.moodDiff) > 1.5 && (
                                        <p>
                                            🎯 <strong className={(darkMode ? 'text-yellow-400' : 'text-yellow-600')}>Perfil de Risco:</strong> Identifiquei um padrão importante:
                                            {riskProfile.moodDiff > 0 ? (
                                                <> <span className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>Dias com mais consumo tendem a ser precedidos por humor mais baixo no dia anterior</span>. <strong>Isto sugere que humor baixo é um gatilho para ti.</strong></>
                                            ) : null}
                                        </p>
                                    )}

                                    {/* Cycle Stats */}
                                    {cycleStats && (
                                        <p>
                                            📊 <strong className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>Análise de Ciclos:</strong> Em média, consomes <strong className={(darkMode ? 'text-purple-400' : 'text-purple-600')}>{cycleStats.avgMgPerCycle.toFixed(0)}mg por ciclo</strong>.
                                            {cycleStats.avgBedtimeStr && (
                                                <> Estás a deitar-te em média às <strong className={(darkMode ? 'text-indigo-400' : 'text-indigo-600')}>{cycleStats.avgBedtimeStr}</strong>.</>
                                            )}
                                        </p>
                                    )}

                                    {/* Energy Impact */}
                                    {energyImpact && energyImpact.percentage >= 50 && (
                                        <p>
                                            ⚡ <strong className={(darkMode ? 'text-yellow-400' : 'text-yellow-600')}>Energia e Consumo:</strong> Das últimas {energyImpact.countWithData} vezes que consumiste, <strong className={(darkMode ? 'text-yellow-300' : 'text-yellow-700')}>{energyImpact.countWithLowEnergy} tinham check-in com energia baixa (&lt;4)</strong>.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                )}

                {/* ESTRUTURAL */}
                {analysisSubView === 'estrutural' && (
                    <div className="space-y-4">
                        <div className={themeClasses.container(darkMode) + ' rounded-xl p-6 border'}>
                            <h3 className={'font-semibold mb-4 ' + (themeClasses.textPrimaryAlt(darkMode))}>⏱️ Intervalos Entre Consumos</h3>
                            {stats.intervals.length === 0 ? (
                                <div className={'text-center py-4 text-sm ' + (themeClasses.textTertiaryAlt(darkMode))}>
                                    Sem intervalos (necessário ≥2 consumos)
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className={`${darkMode ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border-purple-200'} rounded-lg p-3 text-center border`}>
                                            <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{stats.intervals.length}</div>
                                            <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</div>
                                        </div>
                                        <div className={`${darkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-50 border-blue-200'} rounded-lg p-3 text-center border`}>
                                            <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{parseFloat(stats.avgInterval).toFixed(1)}h</div>
                                            <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Média</div>
                                        </div>
                                        <div className={`${darkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-50 border-green-200'} rounded-lg p-3 text-center border`}>
                                            <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{parseFloat(stats.maxInterval).toFixed(1)}h</div>
                                            <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Máximo</div>
                                        </div>
                                    </div>
                                    {/* Progress bars could be added here if needed */}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* CORRELAÇÕES - Placeholder */}
                {analysisSubView === 'correlacoes' && (
                    <div className={themeClasses.container(darkMode) + ' rounded-xl p-8 border text-center'}>
                        <div className="text-6xl mb-4">🔗</div>
                        <h3 className={'text-xl font-bold mb-2 ' + (themeClasses.textPrimaryAlt(darkMode))}>Correlações</h3>
                        <p className={'text-sm ' + (themeClasses.textTertiary(darkMode))}>
                            Funcionalidade simplificada para esta versão.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
