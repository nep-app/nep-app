import React, { useMemo } from 'react';
import * as Icons from '../Icons';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { safeToISODate, safeDate } from '../../utils/helpers';
import { getTemporalCorrelations, getBidirectionalAnalysis, calculatePearsonCorrelation, analyzeSentiment } from '../../utils/analytics';

export default function AnalysesView() {
    const {
        patternsPeriod, setPatternsPeriod, patternsPeriodOffset, setPatternsPeriodOffset,
        analysisSubView, setAnalysisSubView
    } = useUI();

    const {
        consumptions, dailyLogs, wellbeingLogs, cycles, reflections, goals
    } = useData();

    const darkMode = true;

    // Helper Functions (duplicated from App.jsx logic, now localized)
    const getDateRangeForPeriod = (period, offset = 0) => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        let start, end;

        if (period === 'hoje') {
            end = new Date(now);
            end.setDate(end.getDate() - offset);
            start = new Date(end);
            start.setHours(0, 0, 0, 0);
        } else if (period === 'semana') {
            end = new Date(now);
            end.setDate(end.getDate() - (offset * 7));
            start = new Date(end);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
        } else if (period === 'mes') {
            end = new Date(now);
            end.setDate(end.getDate() - (offset * 30));
            start = new Date(end);
            start.setDate(start.getDate() - 29);
            start.setHours(0, 0, 0, 0);
        } else {
            return { start: null, end: null };
        }
        return { start, end };
    };

    const getPeriodLabel = (period, offset) => {
        if (offset === 0) {
            if (period === 'hoje') return 'Hoje';
            if (period === 'semana') return 'Últimos 7 dias';
            if (period === 'mes') return 'Últimos 30 dias';
            return 'Todo o período';
        }
        if (period === 'hoje') {
            const date = new Date();
            date.setDate(date.getDate() - offset);
            return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
        }
        if (period === 'semana') return `${offset} ${offset === 1 ? 'semana' : 'semanas'} atrás`;
        if (period === 'mes') return `${offset} ${offset === 1 ? 'mês' : 'meses'} atrás`;
        return 'Todo o período';
    };

    const filterByDateRange = (items, dateRange, dateField = 'timestamp') => {
        if (!dateRange.start || !dateRange.end) return items;
        return items.filter(item => {
            const itemDate = new Date(item[dateField]);
            return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });
    };

    // Filter Data
    const filteredData = useMemo(() => {
        const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
        return {
            consumptions: filterByDateRange(consumptions, dateRange),
            wellbeing: filterByDateRange(wellbeingLogs, dateRange),
            cycles: filterByDateRange(cycles, dateRange),
            reflections: filterByDateRange(reflections, dateRange),
            dailyLogs: filterByDateRange(dailyLogs, dateRange, 'date'),
            dateRange
        };
    }, [consumptions, wellbeingLogs, cycles, reflections, dailyLogs, patternsPeriod, patternsPeriodOffset]);

    const analysisData = useMemo(() => {
        const { consumptions } = filteredData;
        const byHour = {};
        consumptions.forEach(c => {
            const hour = new Date(c.timestamp).getHours();
            byHour[hour] = (byHour[hour] || 0) + 1;
        });

        return { byHour, total: consumptions.length };
    }, [filteredData.consumptions]);

    // Complex Analysis (Memoized)
    const correlations = useMemo(() => {
        return getTemporalCorrelations(filteredData.wellbeing, filteredData.consumptions);
    }, [filteredData.wellbeing, filteredData.consumptions]);

    const bidirectional = useMemo(() => {
        return getBidirectionalAnalysis(filteredData.wellbeing, filteredData.consumptions);
    }, [filteredData.wellbeing, filteredData.consumptions]);

    // Helper for correlation labels
    const getCorrelationLabel = (r) => {
        if (r === null) return { text: 'Sem dados', color: 'gray', desc: '' };
        if (r < -0.7) return { text: 'Forte Negativa', color: 'red', desc: 'Forte relação inversa' };
        if (r < -0.4) return { text: 'Negativa', color: 'orange', desc: 'Relação inversa moderada' };
        if (r < -0.2) return { text: 'Fraca Negativa', color: 'yellow', desc: 'Leve relação inversa' };
        if (r > 0.7) return { text: 'Forte Positiva', color: 'green', desc: 'Forte relação direta' };
        if (r > 0.4) return { text: 'Positiva', color: 'green', desc: 'Relação direta moderada' };
        if (r > 0.2) return { text: 'Fraca Positiva', color: 'green', desc: 'Leve relação direta' };
        return { text: 'Sem Correlação', color: 'gray', desc: 'Sem relação clara' };
    };

    const getTabClass = (isActive) => {
        const baseClass = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ';
        if (isActive) {
            return baseClass + (darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white');
        }
        return baseClass + (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200');
    };

    return (
        <div className="space-y-6">
            <h2 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Análises</h2>

            {/* Temporal Filters */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border'}>
                <div className="flex items-center justify-between mb-3">
                    <div className={'text-sm font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Período de análise</div>
                    <div className="flex gap-2">
                        <button onClick={() => setPatternsPeriodOffset(prev => prev - 1)} disabled={patternsPeriodOffset >= 0 || patternsPeriod === 'tudo'} className={(patternsPeriodOffset >= 0 || patternsPeriod === 'tudo') ? 'opacity-30 cursor-not-allowed p-1.5 rounded transition' : 'p-1.5 rounded transition hover:bg-gray-700'}>
                            <Icons.ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPatternsPeriodOffset(prev => prev + 1)} disabled={patternsPeriodOffset === 0 || patternsPeriod === 'tudo'} className={(patternsPeriodOffset === 0 || patternsPeriod === 'tudo') ? 'opacity-30 cursor-not-allowed p-1.5 rounded transition' : 'p-1.5 rounded transition hover:bg-gray-700'}>
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
                    <div className={'text-xs mt-2 text-center ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                        {(() => {
                            const dateRange = filteredData.dateRange;
                            return new Date(dateRange.start).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ' - ' + new Date(dateRange.end).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
                        })()}
                    </div>
                )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {['temporal', 'coach', 'correlacoes'].map(subView => (
                    <button
                        key={subView}
                        onClick={() => setAnalysisSubView(subView)}
                        className={getTabClass(analysisSubView === subView)}
                    >
                        {subView === 'temporal' && '⏰ Temporal'}
                        {subView === 'coach' && '💬 Coach'}
                        {subView === 'correlacoes' && '🔗 Correlações'}
                    </button>
                ))}
            </div>

            {analysisSubView === 'temporal' && (
                <div className="space-y-4">
                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                        <h3 className={'font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>🕐 Consumo por Horário</h3>
                        {Object.keys(analysisData.byHour).length === 0 ? (
                            <div className={'text-center py-4 text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>Sem dados</div>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(analysisData.byHour).map(([hour, count]) => (
                                    <div key={hour} className="flex items-center gap-3">
                                        <div className={'text-sm font-medium w-16 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>{hour}h</div>
                                        <div className="flex-1">
                                            <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-8 overflow-hidden relative'}>
                                                <div className={'bg-blue-600 h-full flex items-center px-4 text-white text-sm font-bold transition-all duration-300'} style={{width: Math.max((count / analysisData.total) * 100, 8) + '%'}}>
                                                    <span className="whitespace-nowrap">{count}x</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {analysisSubView === 'coach' && (
                <div className="space-y-4">
                    <div className={(darkMode ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-700/50' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200') + ' rounded-xl p-6 border'}>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-4xl">💬</span>
                            <h3 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>O Teu Coach</h3>
                        </div>
                        <p className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Resumo personalizado do período selecionado</p>
                    </div>

                    {(() => {
                        const filteredConsumptions = filteredData.consumptions;
                        const filteredWellbeingLogs = filteredData.wellbeing;
                        const filteredCycles = filteredData.cycles;

                        if (filteredConsumptions.length === 0 && filteredWellbeingLogs.length === 0) {
                            return (<div className={(darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500') + ' rounded-xl p-6 border text-center'}>Sem dados para este período</div>);
                        }

                        // Calculate all metrics for narrative
                        const totalConsumptions = filteredConsumptions.length;
                        const byDate = {};
                        filteredConsumptions.forEach(c => { byDate[c.date] = (byDate[c.date] || 0) + 1; });
                        const uniqueDays = Object.keys(byDate).length;
                        const avgPerDay = uniqueDays > 0 ? (totalConsumptions / uniqueDays).toFixed(1) : 0;

                        // Wellbeing averages
                        const validSleep = filteredWellbeingLogs.filter(w => w.sleep && !isNaN(parseFloat(w.sleep)));
                        const avgSleep = validSleep.length > 0 ? (validSleep.reduce((sum, w) => sum + parseFloat(w.sleep), 0) / validSleep.length).toFixed(1) : null;

                        const validMood = filteredWellbeingLogs.filter(w => w.mood && !isNaN(parseInt(w.mood)));
                        const avgMood = validMood.length > 0 ? (validMood.reduce((sum, w) => sum + parseInt(w.mood), 0) / validMood.length).toFixed(1) : null;

                        const validEnergy = filteredWellbeingLogs.filter(w => w.energy && !isNaN(parseInt(w.energy)));
                        const avgEnergy = validEnergy.length > 0 ? (validEnergy.reduce((sum, w) => sum + parseInt(w.energy), 0) / validEnergy.length).toFixed(1) : null;

                        // Trending
                        const sorted = [...filteredConsumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                        const intervals = [];
                        for (let i = 1; i < sorted.length; i++) {
                            const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
                            intervals.push(diff);
                        }
                        const avgInterval = intervals.length > 0 ? (intervals.reduce((sum, i) => sum + i, 0) / intervals.length).toFixed(1) : 0;
                        const goodIntervals = intervals.filter(i => i >= 2).length;
                        const goodPercent = intervals.length > 0 ? Math.round((goodIntervals / intervals.length) * 100) : 0;

                        // Time pattern
                        const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
                        filteredConsumptions.forEach(c => {
                            const hour = new Date(c.timestamp).getHours();
                            if (hour >= 6 && hour < 12) byPartOfDay.manha++;
                            else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
                            else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
                            else byPartOfDay.madrugada++;
                        });
                        const maxPartOfDay = Object.entries(byPartOfDay).reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
                        const partNames = { manha: 'manhã', tarde: 'tarde', noite: 'noite', madrugada: 'madrugada' };

                        // Sentiment analysis
                        const allNotes = [...filteredConsumptions.map(c => c.note || ''), ...filteredWellbeingLogs.map(w => w.note || ''), ...filteredCycles.map(c => c.notes || '')].filter(n => n.length > 0).join(' ');
                        const sentiment = analyzeSentiment(allNotes);

                        return (
                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                <div className={'space-y-4 leading-relaxed ' + (darkMode ? 'text-gray-200' : 'text-gray-700')}>
                                    <p>
                                        Olá! Vamos refletir sobre este período juntos.
                                        {totalConsumptions > 0 ? (
                                            <> Registaste <strong className={(darkMode ? 'text-purple-400' : 'text-purple-600')}>{totalConsumptions} {totalConsumptions === 1 ? 'consumo' : 'consumos'}</strong> ao longo de {uniqueDays} {uniqueDays === 1 ? 'dia' : 'dias'}, com uma média de <strong>{avgPerDay} consumos/dia</strong>.</>
                                        ) : (
                                            <> Não tens consumos registados neste período - isso é excelente! </>
                                        )}
                                    </p>

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

                                    {totalConsumptions > 0 && maxPartOfDay[1] > 0 && (
                                        <p>
                                            Reparei que a maioria dos teus consumos ({Math.round((maxPartOfDay[1] / totalConsumptions) * 100)}%) acontece à <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>{partNames[maxPartOfDay[0]]}</strong>.
                                            {maxPartOfDay[0] === 'madrugada' && <> Consumir durante a madrugada pode indicar dificuldades com o sono ou ansiedade noturna. Tens pensado no que te leva a consumir nesse período? Talvez seja útil explorar técnicas de relaxamento para a noite.</>}
                                            {maxPartOfDay[0] === 'noite' && <> A noite é um período comum para consumo, muitas vezes ligado ao descontrair após o dia. Considera se há formas alternativas de relaxar que te fazem sentir bem.</>}
                                            {maxPartOfDay[0] === 'tarde' && <> As tardes podem ser desafiantes, especialmente se há rotinas ou gatilhos específicos. Identifica o que precede esses momentos.</>}
                                            {maxPartOfDay[0] === 'manha' && <> Consumir pela manhã pode estar relacionado com o acordar ou com a gestão de ansiedade matinal. Observa como te sentes ao acordar e se há padrões.</>}
                                        </p>
                                    )}

                                    {(avgMood || avgEnergy || avgSleep) && (
                                        <p>
                                            Sobre o teu bem-estar geral:
                                            {avgSleep && <> estás a dormir em média <strong className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>{avgSleep} horas</strong>.</>}
                                            {avgMood && <> O teu humor médio foi de <strong className={(parseFloat(avgMood) >= 7 ? (darkMode ? 'text-green-400' : 'text-green-600') : parseFloat(avgMood) >= 5 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-red-400' : 'text-red-600'))}>{avgMood}/10</strong>.</>}
                                            {avgEnergy && <> Energia média: <strong className={(parseFloat(avgEnergy) >= 7 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>{avgEnergy}/10</strong>.</>}
                                        </p>
                                    )}

                                    <p>
                                        {allNotes.length > 50 ? (
                                            <>
                                                Ao ler as tuas reflexões, percebo que tens usado palavras
                                                {sentiment.score > 5 ? (
                                                    <> <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>maioritariamente positivas</strong> - isso reflete resiliência e otimismo, mesmo nos desafios. Continua a cultivar essa perspetiva!</>
                                                ) : sentiment.score < -5 ? (
                                                    <> <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>que sugerem alguma dificuldade emocional</strong>. Quero que saibas que é completamente normal passar por fases mais difíceis. Estou aqui para te apoiar, e lembra-te: pequenos passos contam.</>
                                                ) : (
                                                    <> neutras ou mistas. Isso mostra que estás a navegar os altos e baixos da vida, o que é humano e esperado.</>
                                                )}
                                            </>
                                        ) : (
                                            <> Encorajo-te a escrever mais nas tuas reflexões - expressar pensamentos e sentimentos ajuda a processar emoções e a identificar padrões. </>
                                        )}
                                    </p>

                                    <p className={'font-medium ' + (darkMode ? 'text-purple-300' : 'text-purple-700')}>
                                        💪 <strong>Tu tens o controlo.</strong> Estes dados são teus. Este progresso é teu. Este poder de escolha é teu.
                                        <span className={(darkMode ? 'text-purple-400' : 'text-purple-600')}> Cada decisão que tomas - registar, refletir, ajustar - é um ato de autonomia. Continua a usar esta app, continua a analisar, continua a crescer. 🚀</span>
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {analysisSubView === 'correlacoes' && (
                <div className="space-y-4">
                     <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                        <h3 className={'font-semibold mb-2 ' + (darkMode ? 'text-white' : 'text-gray-800')}>🔗 Correlações Temporais</h3>
                        <p className={'text-xs mb-4 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                            Como o bem-estar de ontem afeta o consumo de hoje
                        </p>

                        {correlations ? (
                            <div className="space-y-3">
                                {correlations.sleepLag1.dataPoints >= 5 && (
                                    <div className={(darkMode ? 'bg-gray-700/50' : 'bg-gray-50') + ' rounded-lg p-4 border border-gray-600'}>
                                        <div className="flex justify-between mb-2">
                                            <span className="font-medium text-gray-300">Sono (Ontem) → Consumo (Hoje)</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getCorrelationLabel(correlations.sleepLag1.correlation).color === 'green' ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'}`}>
                                                {getCorrelationLabel(correlations.sleepLag1.correlation).text}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            Correlação: {correlations.sleepLag1.correlation?.toFixed(2) || 'N/A'} ({correlations.sleepLag1.dataPoints} dias)
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                             <div className="text-center py-4 text-gray-500">Dados insuficientes para correlações</div>
                        )}
                     </div>
                </div>
            )}
        </div>
    );
}
