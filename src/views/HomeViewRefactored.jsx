import React, { useState, useEffect } from 'react';
import * as Icons from '../components/Icons';
import { InfoBadge } from '../components/ui/InfoBadge';
import { GradientButton } from '../components/ui/GradientButton';
import { AlertCard } from '../components/ui/AlertCard';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { formatDateTime } from '../utils/helpers';
import { getUserStats } from '../utils/userStats';

export function HomeViewRefactored({
  currentReflection,
  markConsumption,
  openEditConsumption,
  deleteItem,
  last7,
  copingStrategies,
  badges,
  currentCycleCount,
  consumptionsToShow,
  setConsumptionsToShow
}) {
  const { consumptions, goals, cycles, dailyLogs, manualSync, isSyncing, allDataLoaded } = useData();
  const metrics = useMetrics();
  const { setShowThoughtsModal, setShowGoalModal, setShowWellbeingModal, setShowEmotionsModal, setShowReflectionModal, setShowCycleModal, setShowDailyLogModal } = useUI();

  // Carregar dados pré-calculados do cache (aparecem LOGO!)
  const [cachedAlerts, setCachedAlerts] = useState([]);
  const [cachedTimeSince, setCachedTimeSince] = useState(null);

  // Atualizar avisos quando dados mudam
  useEffect(() => {
    // Pequeno delay para garantir que recalculateStats já executou
    const timer = setTimeout(() => {
      getUserStats().then(stats => {
        if (stats.alerts && stats.alerts.length > 0) {
          console.log('[HomeView] ⚡ Avisos atualizados:', stats.alerts);
          setCachedAlerts(stats.alerts);
        } else {
          // Se não há avisos, limpar array
          console.log('[HomeView] 🧹 Nenhum aviso - limpando');
          setCachedAlerts([]);
        }
        if (stats.timeSinceLastConsumption) {
          console.log('[HomeView] ⚡ TimeSince atualizado:', stats.timeSinceLastConsumption);
          setCachedTimeSince(stats.timeSinceLastConsumption);
        }
      });
    }, 150); // Esperar um pouco mais que o setTimeout do recalculateStats (100ms)

    return () => clearTimeout(timer);
  }, [consumptions, cycles, dailyLogs, goals]); // ✅ Atualizar quando dados mudarem!

  const handleSync = async () => {
    try {
      await manualSync();
    } catch (error) {
      console.error('[HomeView] Erro ao sincronizar:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Botão sync no canto superior */}
      <div className="flex justify-end">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
          title="Sincronizar com a cloud"
        >
          <Icons.RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'A sincronizar...' : 'Sincronizar'}
        </button>
      </div>

      {(() => {
        // Usar cached timeSince até FASE 3 completar
        const timeSince = !allDataLoaded && cachedTimeSince ? cachedTimeSince : metrics.timeSinceLastConsumption;
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

      {(() => {
        // Usar avisos do cache ATÉ a FASE 3 completar (todos os dados carregados)
        // Só calcular em tempo real quando temos TODOS os dados (especialmente goals completos)
        if (!allDataLoaded && cachedAlerts.length > 0) {
          // Mostrar avisos do cache (INSTANTÂNEO!)
          return (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {cachedAlerts.map((alert, i) => (
                <AlertCard key={i} alert={alert} />
              ))}
            </div>
          );
        }

        // Calcular avisos em tempo real (quando dados disponíveis)
        const alerts = [];

        // 1. META: Intervalo entre consumos (increase_interval)
        const intervalGoal = goals.find(g => g.type === 'increase_interval');
        if (metrics.lastInterval && intervalGoal) {
          const targetInterval = parseFloat(intervalGoal.target);
          if (metrics.lastInterval.hours < targetInterval) {
            alerts.push({
              text: `Intervalo curto! ${metrics.lastInterval.hours}h`,
              emoji: '⚠️',
              color: 'orange',
              type: 'negative'
            });
          } else {
            alerts.push({
              text: `Bom intervalo! ${metrics.lastInterval.hours}h`,
              emoji: '✨',
              color: 'green',
              type: 'positive'
            });
          }
        }

        // 2. META: Quantidade/Dosagem (reduce_quantity)
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

            // Tanto ciclos como registos diários referem-se ao dia anterior
            // Por isso, mostrar "de ontem" para ambos
            const dateLabel = 'de ontem';

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

        // 3. META: Horas de sono (sleep_hours)
        const sleepGoal = goals.find(g => g.type === 'sleep_hours');
        if (sleepGoal && cycles.length > 0) {
          const lastCycleWithSleep = cycles
            .filter(c => c.sleep && !isNaN(parseFloat(c.sleep)))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

          if (lastCycleWithSleep) {
            const sleepHours = parseFloat(lastCycleWithSleep.sleep);
            const targetSleep = parseFloat(sleepGoal.target);

            // Definir range saudável: entre target e target+2h
            // Ex: se meta é 8h, saudável é 8-10h
            const maxHealthySleep = targetSleep + 2;

            if (sleepHours >= targetSleep && sleepHours <= maxHealthySleep) {
              // Dentro do range saudável - Parabéns!
              alerts.push({
                text: `Parabéns! ${sleepHours}h de sono`,
                emoji: '🌙',
                color: 'green',
                type: 'positive'
              });
            } else if (sleepHours > maxHealthySleep) {
              // Sono excessivo - não é saudável
              alerts.push({
                text: `Sono excessivo: ${sleepHours}h`,
                emoji: '😴',
                color: 'orange',
                type: 'warning'
              });
            } else {
              // Abaixo da meta
              alerts.push({
                text: `Atenção ao sono: ${sleepHours}h`,
                emoji: '😴',
                color: 'orange',
                type: 'negative'
              });
            }
          }
        }

        // ALERTA PREDITIVO: Risco elevado de dia difícil
        (() => {
          // Verificar se dormiu <6h E humor <5 ontem
          const lastCycleWithSleep = cycles
            .filter(c => c.sleep && !isNaN(parseFloat(c.sleep)))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

          const lastWellbeingWithMood = dailyLogs
            .filter(l => l.mood && !isNaN(parseInt(l.mood)))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

          if (lastCycleWithSleep && lastWellbeingWithMood) {
            const sleepHours = parseFloat(lastCycleWithSleep.sleep);
            const mood = parseInt(lastWellbeingWithMood.mood);

            if (sleepHours < 6 && mood < 5) {
              // Calcular probabilidade baseada em dados históricos (opcional)
              // Por agora, usar 75% como indicação geral
              alerts.push({
                text: `⚠️ Risco elevado hoje: Dormiste ${sleepHours}h + humor baixo (${mood}/10)`,
                emoji: '🔴',
                color: 'red',
                type: 'predictive',
                description: '75% probabilidade de dia desafiante. Considera estratégias preventivas.'
              });
            } else if (sleepHours < 6 || mood < 5) {
              // Risco moderado (só um dos fatores)
              const factor = sleepHours < 6 ? `sono curto (${sleepHours}h)` : `humor baixo (${mood}/10)`;
              alerts.push({
                text: `⚡ Atenção: ${factor} ontem`,
                emoji: '⚠️',
                color: 'orange',
                type: 'predictive',
                description: 'Risco moderado. Planeia bem o dia.'
              });
            }
          }
        })();

        // 4. META: Hora de deitar (bedtime_before)
        const bedtimeGoal = goals.find(g => g.type === 'bedtime_before');
        if (bedtimeGoal && cycles.length > 0) {
          const lastCycle = cycles
            .filter(c => c.bedtime)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

          if (lastCycle) {
            const targetStr = typeof bedtimeGoal.target === 'string' ? bedtimeGoal.target : String(bedtimeGoal.target).padStart(2, '0') + ':00';
            const bedtimeParts = lastCycle.bedtime.split(':');
            let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
            const bedtimeOriginalMinutes = bedtimeMinutes; // Guardar hora original (sem ajuste +24h)

            const targetParts = targetStr.split(':');
            let targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

            if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) bedtimeMinutes += 1440;
            if (targetMinutes >= 0 && targetMinutes < 360) targetMinutes += 1440;

            // Meta SÓ é cumprida se hora for entre 21:00-02:00
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

        // 5. META: Último consumo antes da 00h (limit_last)
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

        // 6. META: Frequência diária (reduce_frequency)
        const frequencyGoal = goals.find(g => g.type === 'reduce_frequency');
        if (frequencyGoal) {
          const todayCount = metrics.todayConsumptions.length;
          const targetFrequency = parseInt(frequencyGoal.target);

          if (todayCount < targetFrequency) {
            alerts.push({
              text: `Boa! Só ${todayCount} ${todayCount === 1 ? 'consumo' : 'consumos'} hoje`,
              emoji: '🎯',
              color: 'green',
              type: 'positive'
            });
          } else if (todayCount >= targetFrequency) {
            alerts.push({
              text: `Atenção! Já ${todayCount} consumos hoje`,
              emoji: '⚠️',
              color: 'orange',
              type: 'negative'
            });
          }
        }

        return alerts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {alerts.map((alert, i) => (
              <AlertCard key={i} alert={alert} />
            ))}
          </div>
        );
      })()}

      {/* Linha 1: Bem-estar, Emoções, Reflexão Diária */}
      <div className="grid grid-cols-3 gap-3">
        <GradientButton
          onClick={() => setShowWellbeingModal(true)}
          icon={Icons.Heart}
          variant="blue"
          size="medium"
          className="flex flex-col items-center h-auto py-4"
        >
          <div className="text-sm font-semibold">Bem-estar</div>
          <div className="text-xs opacity-80 mt-1">Humor • Energia • Autocuidado</div>
        </GradientButton>
        <GradientButton
          onClick={() => setShowEmotionsModal(true)}
          icon={Icons.Heart}
          variant="purple"
          size="medium"
          className="flex flex-col items-center h-auto py-4"
        >
          <div className="text-sm font-semibold">Emoções</div>
          <div className="text-xs opacity-80 mt-1">Emoções do dia</div>
        </GradientButton>
        <GradientButton
          onClick={() => setShowReflectionModal(true)}
          icon={Icons.Brain}
          variant="green"
          size="medium"
          className="flex flex-col items-center h-auto py-4"
        >
          <div className="text-sm font-semibold">Reflexão Diária</div>
          <div className="text-xs opacity-80 mt-1">Como correu o dia?</div>
        </GradientButton>
      </div>

      {/* Linha 2: Novo Ciclo, Registar mg, Metas */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setShowCycleModal(true)} className="bg-gradient-to-br from-yellow-500 to-amber-500 text-white rounded-xl p-4 font-medium hover:from-yellow-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
          <div className="text-xl mb-1">🌙</div>
          <div className="text-sm">Novo Ciclo</div>
        </button>
        <button onClick={() => setShowDailyLogModal(true)} className="bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-xl p-4 font-medium hover:from-rose-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
          <div className="text-xl mb-1">📊</div>
          <div className="text-sm">Registar mg</div>
        </button>
        <GradientButton
          onClick={() => setShowGoalModal(true)}
          icon={Icons.Target}
          variant="orange"
          size="medium"
          className="h-full"
        >
          Metas
        </GradientButton>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className='bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl p-3'>
          <div className='text-purple-400 text-xs font-medium mb-1'>Hoje</div>
          <div className="flex items-baseline gap-1">
            <span className='text-2xl font-black text-purple-300'>{currentCycleCount}</span>
            <span className='text-purple-400 text-sm font-medium'>x</span>
          </div>
        </div>
        <div className='bg-gradient-to-br from-pink-900/20 to-pink-800/10 rounded-xl p-3'>
          <div className='text-pink-400 text-xs font-medium mb-1'>Média 7 dias</div>
          <div className="flex items-baseline gap-1">
            <span className='text-2xl font-black text-pink-300'>{last7.avgTimes}</span>
            <span className='text-pink-400 text-sm font-medium'>x</span>
          </div>
          <div className='text-pink-500 text-xs font-medium mt-0.5'>{last7.avgMg}mg/dia</div>
        </div>
      </div>

      <div className='bg-gradient-to-br from-blue-900/20 to-cyan-900/20 rounded-xl p-4'>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">💡</span>
          <h3 className='font-semibold text-blue-300'>Estratégias para Hoje</h3>
        </div>
        <div className="space-y-2">
          {copingStrategies.map((strategy, i) => (
            <div key={i} className='flex items-start gap-2 text-sm p-2.5 rounded-lg text-gray-200 bg-blue-950/30'>
              <span className='text-cyan-400 font-bold'>•</span>
              <span>{strategy}</span>
            </div>
          ))}
        </div>
        {cycles.length > 0 && cycles.some(c => c.triggers && c.triggers.length > 0) && (
          <div className='text-xs mt-3 italic text-cyan-400'>Baseado nos teus gatilhos identificados</div>
        )}
      </div>

      {consumptions.length > 0 && (
        <div className='bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl p-4'>
          <h3 className='font-semibold mb-3 text-purple-300'>Consumos Recentes</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {consumptions.slice(0, consumptionsToShow).map(c => (
              <div key={c.id} className='flex items-center justify-between py-2.5 px-3 rounded-lg bg-purple-950/30'>
                <div className="flex-1">
                  <div className='text-sm font-medium text-gray-200'>
                    {formatDateTime(c.timestamp)}
                  </div>
                  {c.notes && <div className='text-xs mt-1 text-gray-400'>{c.notes}</div>}
                </div>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => openEditConsumption(c)} className='text-blue-400 hover:text-blue-300'><Icons.Edit className="w-4 h-4" /></button>
                  <button onClick={() => deleteItem('consumptions', c.id)} className='text-red-400 hover:text-red-300'><Icons.Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
          {consumptions.length > consumptionsToShow && (
            <button onClick={() => setConsumptionsToShow(prev => prev + 20)} className='text-purple-400 hover:text-purple-300 text-sm font-medium mt-3 w-full py-2'>
              Ver mais ({consumptions.length - consumptionsToShow} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
