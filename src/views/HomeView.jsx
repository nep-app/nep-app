import React, { useState, useMemo } from 'react';
import * as Icons from '../components/Icons';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { useToast } from '../hooks/useToast';
import { calculateBadges } from '../utils/badgesCalculator';
import * as analyticsService from '../services/analyticsService';
import { getGoalProgress } from '../utils/goalUtils';
import { getTodayKey, genId } from '../utils/helpers';
import { themeClasses } from '../utils/classNames';

// Import UI components
import { AlertCard } from '../components/ui/AlertCard';
import { GradientButton } from '../components/ui/GradientButton';
import { InfoBadge } from '../components/ui/InfoBadge';
import { MotivationalCard } from '../components/ui/MotivationalCard';

export function HomeView({
    currentReflection,
    openEditConsumption,
    deleteItem
}) {
    // Contexts
    const {
        user, db, consumptions, dailyLogs, reflections, wellbeingLogs, cycles, goals,
        addConsumption,
        copingStrategies: copingStrategiesData
    } = useData();

    const {
        darkMode,
        setShowThoughtsModal,
        setShowGoalModal,
        setShowWellbeingModal,
        setShowReflectionModal,
        setShowCycleModal,
        setEditingConsumption,
        setShowEditConsumptionModal
    } = useUI();

    const { showToast } = useToast();

    // Local State
    const [consumptionsToShow, setConsumptionsToShow] = useState(20);

    // Helpers & Logic copied/moved from App.jsx

    const getCurrentCycleId = () => {
        if (cycles.length === 0) return null;
        return cycles[0].id; // Most recent cycle (sorted by timestamp desc)
    };

    const markConsumption = async () => {
        try {
            const now = new Date();
            const currentCycle = getCurrentCycleId();
            const item = { id: genId(), timestamp: now.toISOString(), date: getTodayKey(), cycleId: currentCycle, notes: '' };
            await addConsumption(item);
            showToast('✓ Consumo registado', 'success');
        } catch (error) {
            console.error('❌ ERRO COMPLETO:', error);
            console.error('❌ Mensagem:', error.message);
            console.error('❌ Stack:', error.stack);
            showToast('✗ Erro ao guardar consumo', 'error');
        }
    };

    // Memoized interval statistics (optimized to prevent re-calculation)
    const intervalStats = useMemo(() => analyticsService.calculateIntervalStats(consumptions), [consumptions]);
    const getIntervalStats = () => intervalStats;

    // Memoized last interval calculation
    const lastInterval = useMemo(() => analyticsService.calculateLastInterval(consumptions), [consumptions]);
    const getLastInterval = () => lastInterval;

    // Time since last consumption
    const getTimeSinceLastConsumption = () => analyticsService.calculateTimeSinceLastConsumption(consumptions);

    // Memoized today's consumptions
    const todayConsumptions = useMemo(() => analyticsService.getTodayConsumptions(consumptions), [consumptions]);

    const getLast7Days = () => {
        // Calculate avgTimes from actual consumptions in last 7 complete days
        const last7Dates = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (i + 1)); // Start from yesterday (exclude today)
            return d.toISOString().split('T')[0];
        });

        const totalConsumptions = last7Dates.reduce((sum, date) => {
            return sum + consumptions.filter(c => c.date === date).length;
        }, 0);

        const avgTimes = (totalConsumptions / 7).toFixed(1);

        // Calculate avgMg from cycles (novo) ou dailyLogs (compatibilidade)
        const mgValues = [];

        last7Dates.forEach(date => {
            // Buscar primeiro nos cycles (novo método)
            // BUGFIX: cycles antigos só têm timestamp, não date - fazer fallback
            const cycle = cycles.find(c => {
                const cycleDate = c.date || new Date(c.timestamp).toISOString().split('T')[0];
                return cycleDate === date && c.mg !== undefined && c.mg !== '';
            });
            if (cycle) {
                const mgValue = typeof cycle.mg === 'number' ? cycle.mg : parseFloat(cycle.mg);
                if (!isNaN(mgValue) && mgValue > 0) {
                    mgValues.push(mgValue);
                    return;
                }
            }

            // Fallback: buscar nos dailyLogs (compatibilidade)
            const dailyLog = dailyLogs.find(l => l.date === date && l.mg !== undefined && !isNaN(parseFloat(l.mg)));
            if (dailyLog) {
                const mgValue = typeof dailyLog.mg === 'number' ? dailyLog.mg : parseFloat(dailyLog.mg);
                if (!isNaN(mgValue) && mgValue > 0) {
                    mgValues.push(mgValue);
                }
            }
        });

        const avgMg = mgValues.length > 0 ? (mgValues.reduce((sum, mg) => sum + mg, 0) / mgValues.length).toFixed(0) : 0;

        return { avgTimes, avgMg };
    };


    const getStreaks = () => {
        if (consumptions.length === 0 && wellbeingLogs.length === 0) return { current: 0, max: 0 };

        const allDates = [...new Set([...consumptions.map(c => c.date), ...wellbeingLogs.map(w => w.date)])].sort();
        const today = getTodayKey();

        let currentStreak = 0;
        let maxStreak = 1;
        let streak = 1;

        for (let i = 1; i < allDates.length; i++) {
            const prev = new Date(allDates[i-1]);
            const curr = new Date(allDates[i]);
            const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
            if (diffDays === 1) {
                streak++;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1;
            }
        }

        if (allDates.includes(today)) {
            currentStreak = 1;
            let checkDate = new Date(today);
            for (let i = allDates.length - 2; i >= 0; i--) {
                checkDate.setDate(checkDate.getDate() - 1);
                const checkKey = checkDate.toISOString().split('T')[0];
                if (allDates[i] === checkKey) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }

        return { current: currentStreak, max: maxStreak };
    };

    // Wrapper for goalUtils function
    const getGoalProgressWrapper = (goal) => getGoalProgress(goal, consumptions, cycles, dailyLogs, wellbeingLogs);

    // Derived values
    const currentCycle = cycles.length > 0 ? cycles[0] : null;
    const currentCycleCount = currentCycle ? consumptions.filter(c => c.cycleId === currentCycle.id).length : 0;

    // Memoized values
    const last7 = useMemo(() => getLast7Days(), [consumptions, dailyLogs, wellbeingLogs, cycles]);
    const streaks = useMemo(() => getStreaks(), [consumptions, wellbeingLogs]);

    const copingStrategies = useMemo(() => {
        const allTriggers = cycles.flatMap(c => c.triggers || []);
        const triggerCount = {};
        allTriggers.forEach(t => { triggerCount[t] = (triggerCount[t] || 0) + 1; });
        const topTriggers = Object.entries(triggerCount).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

        const strategies = {
            'Stress': [
                'Respiração 4-7-8: inspira 4seg, segura 7seg, expira 8seg. Repete 4x quando sentires tensão aumentar',
                'Técnica STOP: Stop (para), Take a breath (respira), Observe (observa o que sentes), Proceed (continua com escolha consciente)',
                'Escreve 3 coisas que consegues controlar agora (ex: beber água, sair 5min, avisar alguém)'
            ],
            'Ansiedade': [
                '5-4-3-2-1: Nomeia 5 coisas que vês, 4 que ouves, 3 que tocas, 2 que cheiras, 1 que saboreias',
                'Gelo nas mãos ou rosto 30seg: sensação intensa traz-te ao presente (skill DBT - TIP)',
                'Desafia o pensamento: "É facto ou interpretação? Qual a probabilidade real? O que diria a um amigo?"'
            ],
            'Solidão': [
                'Mensagem para 3 pessoas (sem expectativa de resposta imediata): partilha algo neutro, cria conexão',
                'Sai de casa 15min: café, passeio, biblioteca. Presença de outros ajuda mesmo sem interação',
                'Atividade online com pessoas (discord, gaming, livestream): conexão conta, mesmo virtual'
            ],
            'Festa': [
                'Define limite ANTES: máximo X consumos, horário de saída, orçamento. Diz a alguém o teu plano',
                'Alterna: 1 bebida → 1 água/sumo. Mantém copo na mão (menos pressão social para beber)',
                'Identifica pessoa de confiança perto + transporte de volta planeado + local seguro se precisares sair'
            ],
            'Trabalho': [
                'Micro-pausas: cada 25min para 5min (lavar cara, esticar, snack). Evita burnout acumulado',
                'Prioriza 3 tarefas máximo/dia: resto é bonus. Pressão irrealista é gatilho para consumo',
                'Se overwhelmed: email/mensagem para chefe "preciso ajuste prazo/carga". Pedir ajuda ≠ fraqueza'
            ],
            'Família': [
                'Limites claros: "Não consigo falar sobre X agora" ou "Preciso de espaço, falo contigo amanhã"',
                'Auto-compaixão: "Estou a fazer o melhor que consigo com o que tenho agora". Culpa não ajuda',
                'Rede de apoio fora da família: amigo, terapeuta, grupo online. Não dependas só de quem te gatilha'
            ],
            'Hábito': [
                'Quebra padrão: muda 1 passo da rotina (caminho diferente, hora diferente, contexto diferente)',
                'Substitui: chá/café especial, duche frio, 10 flexões, 5min de jogo. Ocupa mãos + mente',
                'Adia 15min: "Posso fazer isto daqui a 15min se ainda quiser". Muitas vezes o impulso passa'
            ],
            'Tristeza': [
                'Valida emoção: "Faz sentido sentir isto". Tristeza não é fraqueza, é informação sobre o que importa',
                'Auto-cuidado radical: banho quente, refeição que gostas, roupa limpa. Corpo afeta mente',
                'Fala com alguém (amigo, familiar, terapeuta): partilhar alivia, não precisas resolver sozinho/a'
            ],
            'Dependência': [
                'HALT check: tenho Fome? Raiva? Solidão? Cansaço? Resolve a necessidade real primeiro',
                'Surfar impulso: imagina como onda - sobe, pico (3-15min), desce. Não preciso agir no pico',
                'Se vou usar: planeia harm reduction (dose menor, contexto seguro, alguém sabe onde estou, água/comida preparada)'
            ]
        };

        if (topTriggers.length === 0) {
            return [
                'Check HALT: tenho Fome, Raiva (anger), Solidão (lonely) ou Cansaço (tired)? Resolve isso primeiro',
                'Hidratação + snack: cérebro funciona melhor, decisões são melhores, impulsos mais controláveis',
                'Rotina de sono (mesmo fim-de-semana): deita 21h-02h, acordar mesma hora ±1h. Padrões ajudam regulação emocional'
            ];
        }

        const selectedStrategies = [];
        topTriggers.forEach(trigger => {
            if (strategies[trigger]) {
                selectedStrategies.push(...strategies[trigger].slice(0, 1));
            }
        });

        return selectedStrategies.length > 0 ? selectedStrategies : strategies['Stress'];
    }, [cycles]);

    const badges = useMemo(() => calculateBadges({
        consumptions,
        reflections,
        wellbeingLogs,
        cycles,
        goals,
        getGoalProgress: getGoalProgressWrapper
    }), [consumptions, reflections, wellbeingLogs, cycles, goals]);

    // Derived Feedback
    // const positiveFeedback = ... (removed as it wasn't rendered in the target JSX block)

    return (
        <div className="space-y-6">
            {/* Mensagem Motivacional */}
            <MotivationalCard message={currentReflection} darkMode={darkMode} />

            {(() => {
                const timeSince = getTimeSinceLastConsumption();
                if (timeSince) {
                    const isLong = timeSince.hours >= 2;
                    return (
                        <div className="flex justify-center mb-4">
                            <InfoBadge
                                label="Sem consumir há"
                                value={`${timeSince.value}${timeSince.unit}`}
                                subValue={timeSince.subValue}
                                subUnit={timeSince.subUnit}
                                isPositive={isLong}
                                darkMode={darkMode}
                            />
                        </div>
                    );
                }
                return null;
            })()}

            <div className="grid grid-cols-2 gap-4">
                <GradientButton
                    onClick={markConsumption}
                    icon={Icons.Clock}
                    variant="purple"
                    size="large"
                    className="shadow-xl"
                >
                    Marcar Consumo Agora
                </GradientButton>
                <GradientButton
                    onClick={() => setShowThoughtsModal(true)}
                    icon={Icons.BookOpen}
                    variant="green"
                    size="large"
                    className="shadow-xl"
                >
                    Pensamentos
                </GradientButton>
            </div>

            {/* ALERTS SECTION */}
            {(() => {
                const alerts = [];

                // 1. META: Intervalo entre consumos
                const intervalGoal = goals.find(g => g.type === 'increase_interval');
                const lastInterval = getLastInterval();
                if (lastInterval && intervalGoal) {
                    const targetInterval = parseFloat(intervalGoal.target);
                    if (lastInterval.hours < targetInterval) {
                        alerts.push({
                            text: `Intervalo curto! ${lastInterval.hours}h`,
                            emoji: '⚠️',
                            color: 'orange',
                            type: 'negative'
                        });
                    } else {
                        alerts.push({
                            text: `Bom intervalo! ${lastInterval.hours}h`,
                            emoji: '✨',
                            color: 'green',
                            type: 'positive'
                        });
                    }
                }

                // 2. META: Quantidade/Dosagem
                const quantityGoal = goals.find(g => g.type === 'reduce_quantity');
                if (quantityGoal) {
                    const cyclesWithMg = cycles
                        .filter(c => c.mg !== undefined && c.mg !== null && c.mg !== '')
                        .map(c => ({ source: 'cycle', mg: c.mg, timestamp: c.timestamp, date: c.date }));

                    const dailyLogsWithMg = dailyLogs
                        .filter(l => l.mg !== undefined && l.mg !== null && l.mg !== '')
                        .map(l => ({ source: 'dailyLog', mg: l.mg, timestamp: l.timestamp, date: l.date }));

                    const allWithMg = [...cyclesWithMg, ...dailyLogsWithMg]
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                    const lastCycleWithMg = allWithMg[0];

                    if (lastCycleWithMg && lastCycleWithMg.mg) {
                        const targetMg = parseFloat(quantityGoal.target);
                        const mgValue = typeof lastCycleWithMg.mg === 'number' ? lastCycleWithMg.mg : parseFloat(lastCycleWithMg.mg);
                        const dateLabel = 'último ciclo';

                        if (mgValue >= targetMg) {
                            alerts.push({
                                text: `Atenção ao consumo ${dateLabel}! ${mgValue}mg`,
                                emoji: '📊',
                                color: 'orange',
                                type: 'negative'
                            });
                        } else {
                            alerts.push({
                                text: `Boa! Consumo ${dateLabel}: ${mgValue}mg`,
                                emoji: '💚',
                                color: 'green',
                                type: 'positive'
                            });
                        }
                    }
                }

                // 3. META: Horas de sono
                const sleepGoal = goals.find(g => g.type === 'sleep_hours');
                if (sleepGoal && wellbeingLogs.length > 0) {
                    const lastWellbeing = wellbeingLogs
                        .filter(w => w.sleep && !isNaN(parseFloat(w.sleep)))
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

                    if (lastWellbeing) {
                        const sleepHours = parseFloat(lastWellbeing.sleep);
                        const targetSleep = parseFloat(sleepGoal.target);

                        if (sleepHours >= targetSleep) {
                            alerts.push({
                                text: `Parabéns! ${sleepHours}h de sono`,
                                emoji: '🌙',
                                color: 'green',
                                type: 'positive'
                            });
                        } else {
                            alerts.push({
                                text: `Atenção ao sono: ${sleepHours}h`,
                                emoji: '😴',
                                color: 'orange',
                                type: 'negative'
                            });
                        }
                    }
                }

                // 4. META: Hora de deitar
                const bedtimeGoal = goals.find(g => g.type === 'bedtime_before');
                if (bedtimeGoal && cycles.length > 0) {
                    const lastCycle = cycles
                        .filter(c => c.bedtime)
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

                    if (lastCycle) {
                        const targetStr = typeof bedtimeGoal.target === 'string' ? bedtimeGoal.target : String(bedtimeGoal.target).padStart(2, '0') + ':00';
                        const bedtimeParts = lastCycle.bedtime.split(':');
                        let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
                        const bedtimeOriginalMinutes = bedtimeMinutes;

                        const targetParts = targetStr.split(':');
                        let targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

                        if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) bedtimeMinutes += 1440;
                        if (targetMinutes >= 0 && targetMinutes < 360) targetMinutes += 1440;

                        const isHealthyBedtime = bedtimeOriginalMinutes >= 1260 || bedtimeOriginalMinutes <= 120; // 21:00-02:00

                        if (bedtimeMinutes <= targetMinutes && isHealthyBedtime) {
                            alerts.push({
                                text: `Boa! Deitaste às ${lastCycle.bedtime}`,
                                emoji: '💤',
                                color: 'green',
                                type: 'positive'
                            });
                        } else {
                            alerts.push({
                                text: `Atenção! Deitaste às ${lastCycle.bedtime}`,
                                emoji: '🌃',
                                color: 'orange',
                                type: 'negative'
                            });
                        }
                    }
                }

                // 5. META: Último consumo antes da 00h
                const limitLastGoal = goals.find(g => g.type === 'limit_last');
                if (limitLastGoal && cycles.length > 0) {
                    const lastCycle = cycles
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

                    if (lastCycle && lastCycle.lastBefore00 !== undefined) {
                        if (lastCycle.lastBefore00 === true) {
                            alerts.push({
                                text: `Boa! Último consumo antes da 00h`,
                                emoji: '🌙',
                                color: 'green',
                                type: 'positive'
                            });
                        } else {
                            alerts.push({
                                text: `Cuidado! Último após 00h`,
                                emoji: '⏰',
                                color: 'orange',
                                type: 'negative'
                            });
                        }
                    }
                }

                // 6. META: Frequência diária
                const frequencyGoal = goals.find(g => g.type === 'reduce_frequency');
                if (frequencyGoal) {
                    const today = getTodayKey();
                    const todayConsumptions = consumptions.filter(c => c.date === today).length;
                    const targetFrequency = parseInt(frequencyGoal.target);

                    if (todayConsumptions < targetFrequency) {
                        alerts.push({
                            text: `Boa! Só ${todayConsumptions} ${todayConsumptions === 1 ? 'consumo' : 'consumos'} hoje`,
                            emoji: '🎯',
                            color: 'green',
                            type: 'positive'
                        });
                    } else if (todayConsumptions >= targetFrequency) {
                        alerts.push({
                            text: `Atenção! Já ${todayConsumptions} consumos hoje`,
                            emoji: '⚠️',
                            color: 'orange',
                            type: 'negative'
                        });
                    }
                }

                return alerts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                        {alerts.map((alert, i) => (
                            <AlertCard key={i} alert={alert} darkMode={darkMode} />
                        ))}
                    </div>
                );
            })()}

            <div className="grid grid-cols-2 gap-4">
                <GradientButton
                    onClick={() => setShowGoalModal(true)}
                    icon={Icons.Target}
                    variant="pink"
                >
                    Metas
                </GradientButton>
                <GradientButton
                    onClick={() => setShowWellbeingModal(true)}
                    icon={Icons.Heart}
                    variant="blue"
                >
                    Check-in Bem-Estar
                </GradientButton>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowReflectionModal(true)} className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl p-4 font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
                    <Icons.Brain className="w-5 h-5 mb-2" />
                    <div className="text-sm">Reflexão diária</div>
                </button>
                <button onClick={() => setShowCycleModal(true)} className="bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl p-4 font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
                    <div className="text-xl mb-1">🌙</div>
                    <div className="text-sm">Novo Ciclo</div>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-purple-800/10' : 'bg-gradient-to-br from-purple-50 to-purple-100/50') + ' rounded-xl p-3'}>
                    <div className={(darkMode ? 'text-purple-400' : 'text-purple-600') + ' text-xs font-medium mb-1'}>Este Ciclo</div>
                    <div className="flex items-baseline gap-1">
                        <span className={'text-2xl font-black ' + (darkMode ? 'text-purple-300' : 'text-purple-600')}>{currentCycleCount}</span>
                        <span className={(darkMode ? 'text-purple-400' : 'text-purple-500') + ' text-sm font-medium'}>x</span>
                    </div>
                </div>
                <div className={(darkMode ? 'bg-gradient-to-br from-pink-900/20 to-pink-800/10' : 'bg-gradient-to-br from-pink-50 to-pink-100/50') + ' rounded-xl p-3'}>
                    <div className={(darkMode ? 'text-pink-400' : 'text-pink-600') + ' text-xs font-medium mb-1'}>Média 7 dias</div>
                    <div className="flex items-baseline gap-1">
                        <span className={'text-2xl font-black ' + (darkMode ? 'text-pink-300' : 'text-pink-600')}>{last7.avgTimes}</span>
                        <span className={(darkMode ? 'text-pink-400' : 'text-pink-500') + ' text-sm font-medium'}>x</span>
                    </div>
                    <div className={(darkMode ? 'text-pink-500' : 'text-pink-400') + ' text-xs font-medium mt-0.5'}>{last7.avgMg}mg/dia</div>
                </div>
            </div>

            <div className={(darkMode ? 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20' : 'bg-gradient-to-r from-blue-50 to-cyan-50') + ' rounded-xl p-4'}>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">💡</span>
                    <h3 className={'font-semibold ' + (darkMode ? 'text-blue-300' : 'text-gray-800')}>Estratégias para Hoje</h3>
                </div>
                <div className="space-y-2">
                    {copingStrategies.map((strategy, i) => (
                        <div key={i} className={'flex items-start gap-2 text-sm p-2.5 rounded-lg ' + (darkMode ? 'text-gray-200 bg-blue-950/30' : 'text-gray-700 bg-white/80')}>
                            <span className={(darkMode ? 'text-cyan-400' : 'text-blue-500') + ' font-bold'}>•</span>
                            <span>{strategy}</span>
                        </div>
                    ))}
                </div>
                {cycles.length > 0 && cycles.some(c => c.triggers && c.triggers.length > 0) && (
                    <div className={'text-xs mt-3 italic ' + (darkMode ? 'text-cyan-400' : 'text-blue-600')}>Baseado nos teus gatilhos identificados</div>
                )}
            </div>

            {/* Conquistas */}
            {badges.length > 0 && (
                <div className={(darkMode ? 'bg-gradient-to-br from-yellow-900/30 via-orange-900/20 to-amber-900/30 border-yellow-700/50' : 'bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 border-yellow-300') + ' rounded-xl p-4 border-2'}>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="text-2xl">🏆</div>
                        <div>
                            <h3 className={'font-bold ' + (darkMode ? 'text-yellow-300' : 'text-yellow-800')}>Conquistas</h3>
                            <p className={'text-xs ' + (darkMode ? 'text-yellow-400/70' : 'text-yellow-700/70')}>{badges.length} {badges.length === 1 ? 'conquista' : 'conquistas'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                        {badges.map(badge => (
                            <div key={badge.id} className={(darkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-700/80 border-gray-600' : 'bg-gradient-to-br from-white to-gray-50 border-' + badge.color + '-300') + ' rounded-lg p-3 border flex items-center gap-2'}>
                                <div className="text-xl">{badge.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className={'font-bold text-xs truncate ' + (darkMode ? 'text-gray-100' : 'text-' + badge.color + '-800')}>{badge.title}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {consumptions.length > 0 && (
                <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-pink-900/20' : 'bg-white') + ' rounded-xl p-4'}>
                    <h3 className={'font-semibold mb-3 ' + (darkMode ? 'text-purple-300' : 'text-gray-800')}>Consumos Recentes</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {consumptions.slice(0, consumptionsToShow).map(c => (
                            <div key={c.id} className={'flex items-center justify-between py-2.5 px-3 rounded-lg ' + (darkMode ? 'bg-purple-950/30' : 'bg-gray-50')}>
                                <div className="flex-1">
                                    <div className={'text-sm font-medium ' + (darkMode ? 'text-gray-200' : 'text-gray-800')}>
                                        {new Date(c.timestamp).toLocaleDateString('pt-PT')} - {new Date(c.timestamp).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}
                                    </div>
                                    {c.notes && <div className={'text-xs mt-1 ' + (themeClasses.textTertiaryAlt(darkMode))}>{c.notes}</div>}
                                </div>
                                <div className="flex gap-2 ml-2">
                                    <button onClick={() => openEditConsumption(c)} className={(darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600')}><Icons.Edit className="w-4 h-4" /></button>
                                    <button onClick={() => deleteItem('consumptions', c.id)} className={(darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600')}><Icons.Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {consumptions.length > consumptionsToShow && (
                        <button onClick={() => setConsumptionsToShow(prev => prev + 20)} className={(darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                            Ver mais ({consumptions.length - consumptionsToShow} restantes)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
