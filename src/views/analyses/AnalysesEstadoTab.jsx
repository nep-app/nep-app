import React from 'react';
import { getEmotionCategory } from '../../constants/emotions';
import { safeToISODate } from '../../utils/helpers';

export const AnalysesEstadoTab = React.memo(function AnalysesEstadoTab({
    analysisConsumptions,
    analysisWellbeing,
    analysisCycles,
}) {
    return (
        <>
            {(() => {
                                                        const allEmotions = analysisWellbeing.flatMap(w => w.emotions || []);

                                                        if (allEmotions.length === 0) {
                                                            return (
                                                                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-8 border text-center'}>
                                                                    <div className="text-4xl mb-3">🌈</div>
                                                                    <p className={'text-lg font-medium mb-2 ' + ('text-white')}>
                                                                        Sem dados emocionais
                                                                    </p>
                                                                    <p className={'text-sm ' + ('text-gray-400')}>
                                                                        Regista as tuas emoções no Bem-estar para veres análises detalhadas aqui.
                                                                    </p>
                                                                </div>
                                                            );
                                                        }

                                                        // Categorizar emoções
                                                        const positiveEmotions = allEmotions.filter(e => getEmotionCategory(e) === 'positive');
                                                        const negativeEmotions = allEmotions.filter(e => getEmotionCategory(e) === 'negative');
                                                        const neutralEmotions = allEmotions.filter(e => getEmotionCategory(e) === 'neutral');

                                                        const totalCategorized = positiveEmotions.length + negativeEmotions.length;
                                                        const positivePercent = totalCategorized > 0 ? (positiveEmotions.length / totalCategorized) * 100 : 0;
                                                        const negativePercent = totalCategorized > 0 ? (negativeEmotions.length / totalCategorized) * 100 : 0;

                                                        // Top emoções
                                                        const emotionFreq = {};
                                                        allEmotions.forEach(e => { emotionFreq[e] = (emotionFreq[e] || 0) + 1; });
                                                        const topEmotions = Object.entries(emotionFreq)
                                                            .sort((a, b) => b[1] - a[1])
                                                            .slice(0, 10)
                                                            .map(([emotion, count]) => ({
                                                                emotion,
                                                                count,
                                                                percent: (count / allEmotions.length) * 100,
                                                                category: getEmotionCategory(emotion)
                                                            }));

                                                        // Emoções por dia da semana
                                                        const emotionsByWeekday = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
                                                        analysisWellbeing.forEach(w => {
                                                            if (w.emotions && w.emotions.length > 0) {
                                                                const date = w.timestamp ? new Date(w.timestamp) : null;
                                                                if (date) {
                                                                    const day = date.getDay();
                                                                    w.emotions.forEach(e => emotionsByWeekday[day].push(e));
                                                                }
                                                            }
                                                        });

                                                        const weekdayStats = Object.entries(emotionsByWeekday).map(([day, emotions]) => {
                                                            const pos = emotions.filter(e => getEmotionCategory(e) === 'positive').length;
                                                            const neg = emotions.filter(e => getEmotionCategory(e) === 'negative').length;
                                                            const total = pos + neg;
                                                            return {
                                                                day: parseInt(day),
                                                                total: emotions.length,
                                                                positivePercent: total > 0 ? (pos / total) * 100 : 0
                                                            };
                                                        }).filter(s => s.total > 0);

                                                        const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                                                        const bestDay = weekdayStats.reduce((best, curr) =>
                                                            curr.positivePercent > best.positivePercent ? curr : best,
                                                            weekdayStats[0] || { day: 0, positivePercent: 0 }
                                                        );
                                                        const worstDay = weekdayStats.reduce((worst, curr) =>
                                                            curr.positivePercent < worst.positivePercent ? curr : worst,
                                                            weekdayStats[0] || { day: 0, positivePercent: 0 }
                                                        );

                                                        return (
                                                            <div className="space-y-4">
                                                                {/* Overview */}
                                                                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                        🌈 Panorama Emocional
                                                                    </h3>
                                                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                                                        <div className={('bg-green-900/20 border-green-700/50') + ' rounded-lg p-4 border text-center'}>
                                                                            <div className={'text-3xl font-black mb-1 ' + ('text-green-400')}>
                                                                                {positivePercent.toFixed(0)}%
                                                                            </div>
                                                                            <div className={'text-xs font-medium ' + ('text-green-300/70')}>
                                                                                Positivas
                                                                            </div>
                                                                            <div className={'text-xs mt-1 ' + ('text-green-400/60')}>
                                                                                {positiveEmotions.length} emoções
                                                                            </div>
                                                                        </div>
                                                                        <div className={('bg-purple-900/20 border-purple-700/50') + ' rounded-lg p-4 border text-center'}>
                                                                            <div className={'text-3xl font-black mb-1 ' + ('text-purple-400')}>
                                                                                {negativePercent.toFixed(0)}%
                                                                            </div>
                                                                            <div className={'text-xs font-medium ' + ('text-purple-300/70')}>
                                                                                Negativas
                                                                            </div>
                                                                            <div className={'text-xs mt-1 ' + ('text-purple-400/60')}>
                                                                                {negativeEmotions.length} emoções
                                                                            </div>
                                                                        </div>
                                                                        <div className={('bg-gray-800/50 border-gray-700/50') + ' rounded-lg p-4 border text-center'}>
                                                                            <div className={'text-3xl font-black mb-1 ' + ('text-gray-400')}>
                                                                                {allEmotions.length}
                                                                            </div>
                                                                            <div className={'text-xs font-medium ' + ('text-gray-400/70')}>
                                                                                Total
                                                                            </div>
                                                                            <div className={'text-xs mt-1 ' + ('text-gray-400/60')}>
                                                                                registadas
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className={'flex items-center h-4 rounded-full overflow-hidden ' + ('bg-gray-800')}>
                                                                        <div
                                                                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                                                                            style={{width: positivePercent + '%'}}
                                                                        />
                                                                        <div
                                                                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                                                                            style={{width: negativePercent + '%'}}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Top Emoções + Padrões por Dia (compacto) */}
                                                                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                        📊 Emoções Mais Frequentes & Padrões Semanais
                                                                    </h3>
                                                                    <div className="grid md:grid-cols-2 gap-4">
                                                                        {/* Top 10 Emoções */}
                                                                        <div>
                                                                            <div className={'text-sm font-semibold mb-3 ' + ('text-gray-400')}>⭐ Top 10 Emoções</div>
                                                                            <div className="space-y-2">
                                                                                {topEmotions.slice(0, 10).map((item, idx) => (
                                                                                    <div key={idx} className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2 flex-1">
                                                                                            <span className={'text-xs font-bold w-5 text-center ' + ('text-gray-600')}>#{idx + 1}</span>
                                                                                            <span className={'text-sm truncate ' + (
                                                                                                item.category === 'positive' ? ('text-green-400') :
                                                                                                item.category === 'negative' ? ('text-purple-400') :
                                                                                                ('text-gray-400')
                                                                                            )}>{item.emotion}</span>
                                                                                        </div>
                                                                                        <span className={'text-xs ' + ('text-gray-500')}>
                                                                                            {item.count}× ({item.percent.toFixed(0)}%)
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Padrões por Dia da Semana */}
                                                                        {weekdayStats.length > 0 && (
                                                                            <div>
                                                                                <div className={'text-sm font-semibold mb-3 ' + ('text-gray-400')}>📅 Por Dia da Semana</div>
                                                                                <div className="space-y-2">
                                                                                    {weekdayStats
                                                                                        .sort((a, b) => b.positivePercent - a.positivePercent)
                                                                                        .map((stat) => (
                                                                                        <div key={stat.day} className="flex items-center justify-between">
                                                                                            <span className={'text-sm w-16 ' + ('text-white')}>{weekdayNames[stat.day]}</span>
                                                                                            <div className="flex-1 mx-2">
                                                                                                <div className={'h-1.5 rounded-full overflow-hidden ' + ('bg-gray-900')}>
                                                                                                    <div
                                                                                                        className={'h-full transition-all duration-500 ' + (
                                                                                                            stat.positivePercent >= 60 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                                                                                            stat.positivePercent >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                                                                                            'bg-gradient-to-r from-purple-500 to-indigo-500'
                                                                                                        )}
                                                                                                        style={{width: stat.positivePercent + '%'}}
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <span className={'text-xs w-12 text-right ' + (
                                                                                                stat.positivePercent >= 60 ? ('text-green-400') :
                                                                                                stat.positivePercent >= 40 ? ('text-yellow-400') :
                                                                                                ('text-purple-400')
                                                                                            )}>
                                                                                                {stat.positivePercent.toFixed(0)}%
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                {weekdayStats.length >= 2 && (
                                                                                    <div className={('bg-blue-900/20 border-blue-700/50') + ' rounded-lg p-3 mt-3 border'}>
                                                                                        <p className={'text-xs ' + ('text-blue-300')}>
                                                                                            💡 Melhor dia: <strong>{weekdayNames[bestDay.day]}s</strong> ({bestDay.positivePercent.toFixed(0)}%). Mais desafiante: <strong>{weekdayNames[worstDay.day]}s</strong> ({worstDay.positivePercent.toFixed(0)}%).
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Correlação Emoções vs Consumo */}
                                                                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                        🔍 Emoções vs Consumo
                                                                    </h3>
                                                                    {(() => {
                                                                        // Análise de emoções correlacionadas com consumo
                                                                        const emotionData = {};

                                                                        // Para cada registo de bem-estar
                                                                        analysisWellbeing.forEach(log => {
                                                                            if (!log.emotions || log.emotions.length === 0) return;

                                                                            const logDate = safeToISODate(log.timestamp);
                                                                            if (!logDate) return;

                                                                            // Contar consumos nesse dia
                                                                            const dayConsumptions = analysisConsumptions.filter(c => c.date === logDate).length;

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

                                                                        // Emoções com MAIOR consumo (top 3)
                                                                        const highRiskEmotions = emotionsWithAvg
                                                                            .filter(e => e.count >= 2) // Apenas emoções registadas 2+ vezes
                                                                            .sort((a, b) => b.avgConsumptions - a.avgConsumptions)
                                                                            .slice(0, 3);

                                                                        // Emoções com MENOR consumo (bottom 2)
                                                                        const lowRiskEmotions = emotionsWithAvg
                                                                            .filter(e => e.count >= 2 && e.avgConsumptions < 10) // Menos de 10 consumos em média
                                                                            .sort((a, b) => a.avgConsumptions - b.avgConsumptions)
                                                                            .slice(0, 2);

                                                                        if (highRiskEmotions.length === 0 && lowRiskEmotions.length === 0) {
                                                                            return (
                                                                                <div className={'text-center py-4 text-sm ' + ('bg-gray-700/30 text-gray-400') + ' rounded-lg'}>
                                                                                    Sem dados suficientes para correlação (necessário ≥2 ocorrências por emoção)
                                                                                </div>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <div className="space-y-3">
                                                                                {/* Emoções de ALTO risco (mais consumo) */}
                                                                                {highRiskEmotions.length > 0 && (
                                                                                    <div>
                                                                                        <div className={'text-xs font-medium mb-2 uppercase tracking-wide ' + ('text-red-400')}>
                                                                                            🔴 Alto Risco (mais consumo)
                                                                                        </div>
                                                                                        {highRiskEmotions.map(e => (
                                                                                            <div key={e.emotion} className={('bg-red-900/20 border-red-700/50') + ' rounded-lg p-3 border mb-2'}>
                                                                                                <div className="flex items-center justify-between mb-1">
                                                                                                    <span className={'font-medium text-sm ' + ('text-red-300')}>{e.emotion}</span>
                                                                                                    <span className={('bg-red-700/50 text-red-200') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{e.count}×</span>
                                                                                                </div>
                                                                                                <div className={'text-xs ' + ('text-red-400/70')}>
                                                                                                    ⚠️ Quando sentes isto: média de <span className="font-bold">{e.avgConsumptions.toFixed(1)} consumos</span>. Esta emoção é um momento crítico - prepara estratégias DBT para quando surgir.
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}

                                                                                {/* Emoções de BAIXO risco (menos consumo) */}
                                                                                {lowRiskEmotions.length > 0 && (
                                                                                    <div>
                                                                                        <div className={'text-xs font-medium mb-2 uppercase tracking-wide ' + ('text-green-400')}>
                                                                                            🟢 Baixo Risco (menos consumo)
                                                                                        </div>
                                                                                        {lowRiskEmotions.map(e => (
                                                                                            <div key={e.emotion} className={('bg-green-900/20 border-green-700/50') + ' rounded-lg p-3 border mb-2'}>
                                                                                                <div className="flex items-center justify-between mb-1">
                                                                                                    <span className={'font-medium text-sm ' + ('text-green-300')}>{e.emotion}</span>
                                                                                                    <span className={('bg-green-700/50 text-green-200') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{e.count}×</span>
                                                                                                </div>
                                                                                                <div className={'text-xs ' + ('text-green-400/70')}>
                                                                                                    ✓ Quando sentes isto: média de <span className="font-bold">{e.avgConsumptions.toFixed(1)} consumos</span>. Este é um estado emocional mais seguro para ti!
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        );
            })()
            }
            {(() => {
                                                        const allTriggers = analysisCycles.flatMap(c => c.triggers || []);

                                                        if (allTriggers.length === 0) {
                                                            return (
                                                                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-8 border text-center'}>
                                                                    <div className="text-4xl mb-3">⚡</div>
                                                                    <p className={'text-lg font-medium mb-2 ' + ('text-white')}>
                                                                        Sem gatilhos registados
                                                                    </p>
                                                                    <p className={'text-sm ' + ('text-gray-400')}>
                                                                        Identifica e regista os teus gatilhos ao criar novos ciclos para veres análises detalhadas aqui.
                                                                    </p>
                                                                </div>
                                                            );
                                                        }

                                                        // Frequência de gatilhos
                                                        const triggerFreq = {};
                                                        allTriggers.forEach(t => { triggerFreq[t] = (triggerFreq[t] || 0) + 1; });
                                                        const topTriggers = Object.entries(triggerFreq)
                                                            .sort((a, b) => b[1] - a[1])
                                                            .map(([trigger, count]) => ({
                                                                trigger,
                                                                count,
                                                                percent: (count / allTriggers.length) * 100
                                                            }));

                                                        // Gatilhos por dia da semana
                                                        const triggersByWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                                                        analysisCycles.forEach(c => {
                                                            if (c.triggers && c.triggers.length > 0) {
                                                                const date = c.timestamp ? new Date(c.timestamp) : null;
                                                                if (date) {
                                                                    const day = date.getDay();
                                                                    triggersByWeekday[day] += c.triggers.length;
                                                                }
                                                            }
                                                        });

                                                        const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                                                        const mostTriggersDay = Object.entries(triggersByWeekday)
                                                            .reduce((max, [day, count]) => count > max.count ? { day: parseInt(day), count } : max, { day: 0, count: 0 });

                                                        // Ciclos com gatilhos vs sem gatilhos
                                                        const cyclesWithTriggers = analysisCycles.filter(c => c.triggers && c.triggers.length > 0).length;
                                                        const cyclesWithoutTriggers = analysisCycles.length - cyclesWithTriggers;

                                                        return (
                                                            <div className="space-y-4">
                                                                {/* Overview */}
                                                                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                        ⚡ Panorama de Gatilhos
                                                                    </h3>
                                                                    <div className="grid grid-cols-3 gap-4">
                                                                        <div className={('bg-red-900/20 border-red-700/50') + ' rounded-lg p-4 border text-center'}>
                                                                            <div className={'text-3xl font-black mb-1 ' + ('text-red-400')}>
                                                                                {allTriggers.length}
                                                                            </div>
                                                                            <div className={'text-xs font-medium ' + ('text-red-300/70')}>
                                                                                Total de gatilhos
                                                                            </div>
                                                                            <div className={'text-xs mt-1 ' + ('text-red-400/60')}>
                                                                                identificados
                                                                            </div>
                                                                        </div>
                                                                        <div className={('bg-orange-900/20 border-orange-700/50') + ' rounded-lg p-4 border text-center'}>
                                                                            <div className={'text-3xl font-black mb-1 ' + ('text-orange-400')}>
                                                                                {topTriggers.length}
                                                                            </div>
                                                                            <div className={'text-xs font-medium ' + ('text-orange-300/70')}>
                                                                                Tipos diferentes
                                                                            </div>
                                                                            <div className={'text-xs mt-1 ' + ('text-orange-400/60')}>
                                                                                de gatilhos
                                                                            </div>
                                                                        </div>
                                                                        <div className={('bg-yellow-900/20 border-yellow-700/50') + ' rounded-lg p-4 border text-center'}>
                                                                            <div className={'text-3xl font-black mb-1 ' + ('text-yellow-400')}>
                                                                                {(allTriggers.length / analysisCycles.length).toFixed(1)}
                                                                            </div>
                                                                            <div className={'text-xs font-medium ' + ('text-yellow-300/70')}>
                                                                                Média
                                                                            </div>
                                                                            <div className={'text-xs mt-1 ' + ('text-yellow-400/60')}>
                                                                                por ciclo
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Top Gatilhos + Padrões por Dia (compacto) */}
                                                                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                        📊 Gatilhos Mais Frequentes & Padrões Semanais
                                                                    </h3>
                                                                    <div className="grid md:grid-cols-2 gap-4">
                                                                        {/* Top 10 Gatilhos */}
                                                                        <div>
                                                                            <div className={'text-sm font-semibold mb-3 ' + ('text-gray-400')}>🎯 Top 10 Gatilhos</div>
                                                                            <div className="space-y-2">
                                                                                {topTriggers.slice(0, 10).map((item, idx) => (
                                                                                    <div key={idx} className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2 flex-1">
                                                                                            <span className={'text-xs font-bold w-5 text-center ' + ('text-gray-600')}>#{idx + 1}</span>
                                                                                            <span className={'text-sm truncate ' + ('text-red-400')}>{item.trigger}</span>
                                                                                        </div>
                                                                                        <span className={'text-xs ' + ('text-gray-500')}>
                                                                                            {item.count}× ({item.percent.toFixed(0)}%)
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Padrões por Dia da Semana */}
                                                                        {Object.values(triggersByWeekday).some(count => count > 0) && (
                                                                            <div>
                                                                                <div className={'text-sm font-semibold mb-3 ' + ('text-gray-400')}>📅 Por Dia da Semana</div>
                                                                                <div className="space-y-2">
                                                                                    {Object.entries(triggersByWeekday)
                                                                                        .map(([day, count]) => ({
                                                                                            day: parseInt(day),
                                                                                            count,
                                                                                            percent: allTriggers.length > 0 ? (count / allTriggers.length) * 100 : 0
                                                                                        }))
                                                                                        .filter(stat => stat.count > 0)
                                                                                        .sort((a, b) => b.count - a.count)
                                                                                        .map((stat) => (
                                                                                        <div key={stat.day} className="flex items-center justify-between">
                                                                                            <span className={'text-sm w-16 ' + ('text-white')}>{weekdayNames[stat.day]}</span>
                                                                                            <div className="flex-1 mx-2">
                                                                                                <div className={'h-1.5 rounded-full overflow-hidden ' + ('bg-gray-900')}>
                                                                                                    <div
                                                                                                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500"
                                                                                                        style={{width: stat.percent + '%'}}
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <span className={'text-xs w-12 text-right ' + ('text-red-400')}>
                                                                                                {stat.count}
                                                                                            </span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                {mostTriggersDay.count > 0 && (
                                                                                    <div className={('bg-blue-900/20 border-blue-700/50') + ' rounded-lg p-3 mt-3 border'}>
                                                                                        <p className={'text-xs ' + ('text-blue-300')}>
                                                                                            💡 Dia com mais gatilhos: <strong>{weekdayNames[mostTriggersDay.day]}s</strong> ({mostTriggersDay.count}).
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Correlação Gatilhos vs Consumo */}
                                                                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                        🔍 Gatilhos vs Consumo
                                                                    </h3>
                                                                    {(() => {
                                                                        // Calcular gatilhos e média de consumos por gatilho
                                                                        const triggerData = {};

                                                                        analysisCycles.forEach(cycle => {
                                                                            if (!cycle.triggers || cycle.triggers.length === 0) return;

                                                                            // Encontrar data do ciclo usando o timestamp
                                                                            const cycleDate = safeToISODate(cycle.timestamp);
                                                                            if (!cycleDate) return;

                                                                            // Contar consumos nesse dia
                                                                            const dayConsumptions = analysisConsumptions.filter(c => c.date === cycleDate).length;

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

                                                                        if (highRiskTriggers.length === 0 && lowRiskTriggers.length === 0) {
                                                                            return (
                                                                                <div className={'text-center py-4 text-sm ' + ('bg-gray-700/30 text-gray-400') + ' rounded-lg'}>
                                                                                    Sem dados suficientes para correlação (necessário ≥2 ocorrências por gatilho)
                                                                                </div>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <div className="space-y-3">
                                                                                {/* Gatilhos de ALTO risco (mais consumo) */}
                                                                                {highRiskTriggers.length > 0 && (
                                                                                    <div>
                                                                                        <div className={'text-xs font-medium mb-2 uppercase tracking-wide ' + ('text-red-400')}>
                                                                                            🔴 Alto Risco (mais consumo)
                                                                                        </div>
                                                                                        {highRiskTriggers.map(t => (
                                                                                            <div key={t.trigger} className={('bg-red-900/20 border-red-700/50') + ' rounded-lg p-3 border mb-2'}>
                                                                                                <div className="flex items-center justify-between mb-1">
                                                                                                    <span className={'font-medium text-sm ' + ('text-red-300')}>{t.trigger}</span>
                                                                                                    <span className={('bg-red-700/50 text-red-200') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{t.count}×</span>
                                                                                                </div>
                                                                                                <div className={'text-xs ' + ('text-red-400/70')}>
                                                                                                    ⚠️ Nos dias com este gatilho: média de <span className="font-bold">{t.avgConsumptions.toFixed(1)} consumos</span>. Esta situação é um fator de risco - prepara um plano de ação para quando surgir.
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}

                                                                                {/* Gatilhos de BAIXO risco (menos consumo) */}
                                                                                {lowRiskTriggers.length > 0 && (
                                                                                    <div>
                                                                                        <div className={'text-xs font-medium mb-2 uppercase tracking-wide ' + ('text-green-400')}>
                                                                                            🟢 Baixo Risco (menos consumo)
                                                                                        </div>
                                                                                        {lowRiskTriggers.map(t => (
                                                                                            <div key={t.trigger} className={('bg-green-900/20 border-green-700/50') + ' rounded-lg p-3 border mb-2'}>
                                                                                                <div className="flex items-center justify-between mb-1">
                                                                                                    <span className={'font-medium text-sm ' + ('text-green-300')}>{t.trigger}</span>
                                                                                                    <span className={('bg-green-700/50 text-green-200') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{t.count}×</span>
                                                                                                </div>
                                                                                                <div className={'text-xs ' + ('text-green-400/70')}>
                                                                                                    ✓ Nos dias com este gatilho: média de <span className="font-bold">{t.avgConsumptions.toFixed(1)} consumos</span>. Esta situação é mais segura para ti!
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>

                                                                {/* Consciencialização */}
                                                                <div className={('bg-purple-900/20 border-purple-700/50') + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'text-lg font-semibold mb-3 ' + ('text-purple-400')}>
                                                                        🧠 Consciencialização
                                                                    </h3>
                                                                    <p className={'text-sm mb-3 ' + ('text-purple-300')}>
                                                                        Identificaste gatilhos em <strong>{cyclesWithTriggers}</strong> de {analysisCycles.length} ciclos ({((cyclesWithTriggers / analysisCycles.length) * 100).toFixed(0)}%).
                                                                    </p>
                                                                    <p className={'text-sm ' + ('text-purple-300/80')}>
                                                                        Reconhecer os teus gatilhos é um passo fundamental para desenvolver estratégias de prevenção eficazes.
                                                                        Cada gatilho identificado é uma oportunidade de aprendizagem e crescimento.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
            })()
            }
            {(() => {
                                                        const exerciseLogs = analysisWellbeing.filter(w => w.exerciseType || (w.exerciseDuration > 0) || w.exercise);
                                                        const totalLogged = analysisWellbeing.length;
                                                        const daysWithExercise = new Set(exerciseLogs.map(w => w.date || safeToISODate(w.timestamp))).size;
                                                        const totalDays = new Set(analysisWellbeing.map(w => w.date || safeToISODate(w.timestamp))).size;
                                                        const exercisePercent = totalDays > 0 ? (daysWithExercise / totalDays) * 100 : 0;

                                                        const durationsWithData = exerciseLogs.filter(w => w.exerciseDuration > 0);
                                                        const avgDuration = durationsWithData.length > 0
                                                            ? durationsWithData.reduce((s, w) => s + w.exerciseDuration, 0) / durationsWithData.length
                                                            : null;

                                                        const typeFreq = {};
                                                        exerciseLogs.forEach(w => {
                                                            const raw = w.exerciseType || (w.exercise ? w.exercise.trim() : null) || 'outros';
                                                            const t = raw.trim().toLowerCase();
                                                            if (t) typeFreq[t] = (typeFreq[t] || 0) + 1;
                                                        });
                                                        const topTypes = Object.entries(typeFreq).sort((a, b) => b[1] - a[1]).slice(0, 6);

                                                        const exerciseDateSet = new Set(exerciseLogs.map(w => w.date || safeToISODate(w.timestamp)));
                                                        const consWithExercise = [];
                                                        const consWithoutExercise = [];
                                                        const moodWithExercise = [];
                                                        const moodWithoutExercise = [];
                                                        const energyWithExercise = [];
                                                        const energyWithoutExercise = [];

                                                        const allLoggedDates = new Set(analysisWellbeing.map(w => w.date || safeToISODate(w.timestamp)));
                                                        const consByDate = {};
                                                        analysisConsumptions.forEach(c => {
                                                            const d = c.date || safeToISODate(c.timestamp);
                                                            if (d) consByDate[d] = (consByDate[d] || 0) + 1;
                                                        });
                                                        const moodByDate = {};
                                                        const energyByDate = {};
                                                        analysisWellbeing.forEach(w => {
                                                            const d = w.date || safeToISODate(w.timestamp);
                                                            if (!d) return;
                                                            if (w.mood) { moodByDate[d] = moodByDate[d] || []; moodByDate[d].push(parseInt(w.mood)); }
                                                            if (w.energy) { energyByDate[d] = energyByDate[d] || []; energyByDate[d].push(parseInt(w.energy)); }
                                                        });

                                                        allLoggedDates.forEach(date => {
                                                            const cons = consByDate[date] || 0;
                                                            const hasEx = exerciseDateSet.has(date);
                                                            if (hasEx) consWithExercise.push(cons);
                                                            else consWithoutExercise.push(cons);

                                                            const moods = moodByDate[date];
                                                            if (moods && moods.length > 0) {
                                                                const avg = moods.reduce((s, v) => s + v, 0) / moods.length;
                                                                if (hasEx) moodWithExercise.push(avg);
                                                                else moodWithoutExercise.push(avg);
                                                            }
                                                            const energies = energyByDate[date];
                                                            if (energies && energies.length > 0) {
                                                                const avg = energies.reduce((s, v) => s + v, 0) / energies.length;
                                                                if (hasEx) energyWithExercise.push(avg);
                                                                else energyWithoutExercise.push(avg);
                                                            }
                                                        });

                                                        const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

                                                        if (totalLogged === 0) {
                                                            return (
                                                                <div className={'bg-gray-800 border-gray-700 rounded-xl p-8 border text-center'}>
                                                                    <div className="text-4xl mb-3">🏃</div>
                                                                    <p className={'text-lg font-medium mb-2 text-white'}>Sem dados de exercício</p>
                                                                    <p className={'text-sm text-gray-400'}>Regista o exercício no Bem-estar para veres análises aqui.</p>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div className="space-y-4">
                                                                <div className={'bg-gray-800 border-gray-700 rounded-xl p-6 border'}>
                                                                    <h3 className={'text-lg font-semibold mb-4 text-white'}>🏃 Exercício</h3>
                                                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                                                        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                                                                            <div className={'text-2xl font-bold text-green-400'}>{daysWithExercise}</div>
                                                                            <div className={'text-xs text-gray-400 mt-1'}>dias c/ exercício</div>
                                                                        </div>
                                                                        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                                                                            <div className={'text-2xl font-bold text-green-400'}>{exercisePercent.toFixed(0)}%</div>
                                                                            <div className={'text-xs text-gray-400 mt-1'}>dos dias registados</div>
                                                                        </div>
                                                                        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                                                                            <div className={'text-2xl font-bold text-green-400'}>{avgDuration != null ? `${Math.round(avgDuration)}min` : '—'}</div>
                                                                            <div className={'text-xs text-gray-400 mt-1'}>duração média</div>
                                                                        </div>
                                                                    </div>

                                                                    {topTypes.length > 0 && (
                                                                        <div className="mb-4">
                                                                            <p className={'text-sm font-medium text-gray-300 mb-2'}>Tipos de exercício</p>
                                                                            <div className="space-y-1">
                                                                                {topTypes.map(([type, count]) => (
                                                                                    <div key={type} className="flex items-center gap-2">
                                                                                        <span className={'text-xs text-gray-300 w-24 truncate'}>{type}</span>
                                                                                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                                                                                            <div
                                                                                                className="bg-green-500 h-2 rounded-full"
                                                                                                style={{ width: `${(count / topTypes[0][1]) * 100}%` }}
                                                                                            />
                                                                                        </div>
                                                                                        <span className={'text-xs text-gray-400 w-6 text-right'}>{count}x</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {(consWithExercise.length >= 3 || moodWithExercise.length >= 3 || energyWithExercise.length >= 3) && (
                                                                        <div className="border-t border-gray-700 pt-4">
                                                                            <p className={'text-sm font-medium text-gray-300 mb-3'}>Impacto do exercício</p>
                                                                            <div className="grid grid-cols-1 gap-2">
                                                                                {consWithExercise.length >= 3 && consWithoutExercise.length >= 3 && (() => {
                                                                                    const withEx = avg(consWithExercise);
                                                                                    const withoutEx = avg(consWithoutExercise);
                                                                                    const diff = withEx - withoutEx;
                                                                                    const pct = withoutEx > 0 ? ((diff / withoutEx) * 100).toFixed(0) : 0;
                                                                                    if (Math.abs(pct) < 5) return null;
                                                                                    return (
                                                                                        <p className={'text-xs text-gray-300'}>
                                                                                            🔢 Dias com exercício: média de <strong>{withEx.toFixed(1)}</strong> consumos vs <strong>{withoutEx.toFixed(1)}</strong> sem exercício
                                                                                            {' '}({diff < 0 ? <span className="text-green-400">−{Math.abs(pct)}%</span> : <span className="text-orange-400">+{pct}%</span>}).
                                                                                        </p>
                                                                                    );
                                                                                })()}
                                                                                {moodWithExercise.length >= 3 && moodWithoutExercise.length >= 3 && (() => {
                                                                                    const withEx = avg(moodWithExercise);
                                                                                    const withoutEx = avg(moodWithoutExercise);
                                                                                    const diff = (withEx - withoutEx).toFixed(1);
                                                                                    if (Math.abs(diff) < 0.3) return null;
                                                                                    return (
                                                                                        <p className={'text-xs text-gray-300'}>
                                                                                            😊 Humor com exercício: <strong>{withEx.toFixed(1)}/10</strong> vs <strong>{withoutEx.toFixed(1)}/10</strong> sem exercício
                                                                                            {' '}({diff > 0 ? <span className="text-green-400">+{diff}</span> : <span className="text-orange-400">{diff}</span>}).
                                                                                        </p>
                                                                                    );
                                                                                })()}
                                                                                {energyWithExercise.length >= 3 && energyWithoutExercise.length >= 3 && (() => {
                                                                                    const withEx = avg(energyWithExercise);
                                                                                    const withoutEx = avg(energyWithoutExercise);
                                                                                    const diff = (withEx - withoutEx).toFixed(1);
                                                                                    if (Math.abs(diff) < 0.3) return null;
                                                                                    return (
                                                                                        <p className={'text-xs text-gray-300'}>
                                                                                            ⚡ Energia com exercício: <strong>{withEx.toFixed(1)}/10</strong> vs <strong>{withoutEx.toFixed(1)}/10</strong> sem exercício
                                                                                            {' '}({diff > 0 ? <span className="text-green-400">+{diff}</span> : <span className="text-orange-400">{diff}</span>}).
                                                                                        </p>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
            })()
            }
            {(() => {
                                                        const allSymptoms = analysisWellbeing.flatMap(w => [
                                                            ...(w.symptoms || []),
                                                            ...(w.customSymptom ? [w.customSymptom] : [])
                                                        ]).filter(s => s && s.trim()).map(s => s.trim().toLowerCase());

                                                        if (allSymptoms.length === 0) {
                                                            return (
                                                                <div className={'bg-gray-800 border-gray-700 rounded-xl p-8 border text-center'}>
                                                                    <div className="text-4xl mb-3">🤒</div>
                                                                    <p className={'text-lg font-medium mb-2 text-white'}>Sem sintomas registados</p>
                                                                    <p className={'text-sm text-gray-400'}>Regista sintomas de saúde no Bem-estar para veres análises aqui.</p>
                                                                </div>
                                                            );
                                                        }

                                                        const symptomFreq = {};
                                                        allSymptoms.forEach(s => { const k = s.trim().toLowerCase(); symptomFreq[k] = (symptomFreq[k] || 0) + 1; });
                                                        const topSymptoms = Object.entries(symptomFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);

                                                        const symptomDates = {};
                                                        analysisWellbeing.forEach(w => {
                                                            const d = w.date || safeToISODate(w.timestamp);
                                                            if (!d) return;
                                                            const syms = [...(w.symptoms || []), ...(w.customSymptom ? [w.customSymptom] : [])].filter(s => s && s.trim()).map(s => s.trim().toLowerCase());
                                                            syms.forEach(s => {
                                                                if (!symptomDates[s]) symptomDates[s] = new Set();
                                                                symptomDates[s].add(d);
                                                            });
                                                        });

                                                        const daysWithAnySymptom = new Set(
                                                            analysisWellbeing
                                                                .filter(w => ((w.symptoms || []).length > 0) || w.customSymptom)
                                                                .map(w => w.date || safeToISODate(w.timestamp))
                                                        ).size;
                                                        const totalDays = new Set(analysisWellbeing.map(w => w.date || safeToISODate(w.timestamp))).size;

                                                        const consByDate = {};
                                                        analysisConsumptions.forEach(c => {
                                                            const d = c.date || safeToISODate(c.timestamp);
                                                            if (d) consByDate[d] = (consByDate[d] || 0) + 1;
                                                        });
                                                        const moodByDate = {};
                                                        analysisWellbeing.forEach(w => {
                                                            const d = w.date || safeToISODate(w.timestamp);
                                                            if (d && w.mood) { moodByDate[d] = moodByDate[d] || []; moodByDate[d].push(parseInt(w.mood)); }
                                                        });
                                                        const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

                                                        const symptomDaySet = new Set(
                                                            analysisWellbeing
                                                                .filter(w => ((w.symptoms || []).length > 0) || w.customSymptom)
                                                                .map(w => w.date || safeToISODate(w.timestamp))
                                                        );
                                                        const allDays = new Set(analysisWellbeing.map(w => w.date || safeToISODate(w.timestamp)));
                                                        const consWithSymptom = [];
                                                        const consWithoutSymptom = [];
                                                        const moodWithSymptom = [];
                                                        const moodWithoutSymptom = [];
                                                        allDays.forEach(date => {
                                                            const hasSym = symptomDaySet.has(date);
                                                            const cons = consByDate[date] || 0;
                                                            if (hasSym) consWithSymptom.push(cons);
                                                            else consWithoutSymptom.push(cons);
                                                            const moods = moodByDate[date];
                                                            if (moods && moods.length > 0) {
                                                                const m = avg(moods);
                                                                if (hasSym) moodWithSymptom.push(m);
                                                                else moodWithoutSymptom.push(m);
                                                            }
                                                        });

                                                        return (
                                                            <div className="space-y-4">
                                                                <div className={'bg-gray-800 border-gray-700 rounded-xl p-6 border'}>
                                                                    <h3 className={'text-lg font-semibold mb-4 text-white'}>🤒 Sintomas de Saúde</h3>
                                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                                        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                                                                            <div className={'text-2xl font-bold text-orange-400'}>{allSymptoms.length}</div>
                                                                            <div className={'text-xs text-gray-400 mt-1'}>registos de sintomas</div>
                                                                        </div>
                                                                        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                                                                            <div className={'text-2xl font-bold text-orange-400'}>{totalDays > 0 ? ((daysWithAnySymptom / totalDays) * 100).toFixed(0) : 0}%</div>
                                                                            <div className={'text-xs text-gray-400 mt-1'}>dias c/ sintomas</div>
                                                                        </div>
                                                                    </div>

                                                                    <p className={'text-sm font-medium text-gray-300 mb-2'}>Sintomas mais frequentes</p>
                                                                    <div className="space-y-1 mb-4">
                                                                        {topSymptoms.map(([symptom, count]) => (
                                                                            <div key={symptom} className="flex items-center gap-2">
                                                                                <span className={'text-xs text-gray-300 w-32 truncate'}>{symptom}</span>
                                                                                <div className="flex-1 bg-gray-700 rounded-full h-2">
                                                                                    <div
                                                                                        className="bg-orange-500 h-2 rounded-full"
                                                                                        style={{ width: `${(count / topSymptoms[0][1]) * 100}%` }}
                                                                                    />
                                                                                </div>
                                                                                <span className={'text-xs text-gray-400 w-6 text-right'}>{count}x</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    {(consWithSymptom.length >= 3 || moodWithSymptom.length >= 3) && (
                                                                        <div className="border-t border-gray-700 pt-4">
                                                                            <p className={'text-sm font-medium text-gray-300 mb-2'}>Sintomas vs padrão de consumo</p>
                                                                            <div className="space-y-2">
                                                                                {consWithSymptom.length >= 3 && consWithoutSymptom.length >= 3 && (() => {
                                                                                    const withS = avg(consWithSymptom);
                                                                                    const withoutS = avg(consWithoutSymptom);
                                                                                    const diff = withS - withoutS;
                                                                                    const pct = withoutS > 0 ? ((diff / withoutS) * 100).toFixed(0) : 0;
                                                                                    if (Math.abs(pct) < 5) return <p className={'text-xs text-gray-400'}>Sem diferença significativa no consumo em dias com sintomas.</p>;
                                                                                    return (
                                                                                        <p className={'text-xs text-gray-300'}>
                                                                                            🔢 Dias com sintomas: média de <strong>{withS.toFixed(1)}</strong> consumos vs <strong>{withoutS.toFixed(1)}</strong> sem sintomas
                                                                                            {' '}({diff > 0 ? <span className="text-orange-400">+{pct}%</span> : <span className="text-green-400">−{Math.abs(pct)}%</span>}).
                                                                                        </p>
                                                                                    );
                                                                                })()}
                                                                                {moodWithSymptom.length >= 3 && moodWithoutSymptom.length >= 3 && (() => {
                                                                                    const withS = avg(moodWithSymptom);
                                                                                    const withoutS = avg(moodWithoutSymptom);
                                                                                    const diff = (withS - withoutS).toFixed(1);
                                                                                    if (Math.abs(diff) < 0.3) return null;
                                                                                    return (
                                                                                        <p className={'text-xs text-gray-300'}>
                                                                                            😊 Humor em dias com sintomas: <strong>{withS.toFixed(1)}/10</strong> vs <strong>{withoutS.toFixed(1)}/10</strong> sem sintomas.
                                                                                        </p>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
            })()
            }
        </>
    );
});
