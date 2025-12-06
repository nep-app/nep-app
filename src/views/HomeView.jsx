import React from 'react';
import * as Icons from '../components/Icons';
import { MotivationalCard } from '../components/ui/MotivationalCard';
import { InfoBadge } from '../components/ui/InfoBadge';
import { GradientButton } from '../components/ui/GradientButton';
import { AlertCard } from '../components/ui/AlertCard';
import { StatCard } from '../components/ui/StatCard';

export function HomeView({
  darkMode,
  currentReflection,
  getTimeSinceLastConsumption,
  markConsumption,
  setShowThoughtsModal,
  goals,
  getLastInterval,
  cycles,
  dailyLogs,
  wellbeingLogs,
  consumptions,
  safeDate,
  positiveFeedback,
  badges,
  getCurrentCycleId,
  setShowDailyLogModal,
  setShowWellbeingModal,
  setShowReflectionModal,
  setShowCycleModal,
  setShowGoalModal,
  copingStrategiesData,
  copingStrategies,
  deleteCopingStrategy
}) {
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

      {(() => {
        // Recriar os alerts aqui (após o botão)
        const alerts = [];

        // 1. META: Intervalo entre consumos (increase_interval)
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

            // Tanto ciclos como registos diários referem-se ao ciclo que terminou
            // Por isso, mostrar "último ciclo" para ambos
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

        // 3. META: Horas de sono (sleep_hours)
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

            const targetParts = targetStr.split(':');
            let targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

            if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) bedtimeMinutes += 1440;
            if (targetMinutes >= 0 && targetMinutes < 360) targetMinutes += 1440;

            if (bedtimeMinutes <= targetMinutes) {
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

        return alerts.length > 0 && (
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
            {alerts.map((alert, i) => (
              <AlertCard key={i} {...alert} darkMode={darkMode} />
            ))}
          </div>
        );
      })()}

      {positiveFeedback.length > 0 && (
        <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-700/50' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200') + ' rounded-xl p-4 border'}>
          <div className="space-y-2">
            {positiveFeedback.map((msg, i) => (
              <p key={i} className={'text-sm ' + (darkMode ? 'text-purple-300' : 'text-purple-700')}>
                {msg}
              </p>
            ))}
          </div>
        </div>
      )}

      {badges && badges.length > 0 && (
        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
          <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
            🏆 Badges Conquistados
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map((badge, idx) => (
              <div key={idx} className={(darkMode ? 'bg-gray-700/50' : 'bg-gray-50') + ' rounded-lg p-3 text-center'}>
                <div className="text-3xl mb-1">{badge.icon}</div>
                <div className={'text-xs font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                  {badge.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={() => <span className="text-xl">📝</span>}
          label="Registos"
          value={consumptions.length}
          darkMode={darkMode}
        />
        <StatCard
          icon={() => <span className="text-xl">🎯</span>}
          label="Ciclos"
          value={cycles.length}
          darkMode={darkMode}
        />
        <StatCard
          icon={() => <span className="text-xl">💚</span>}
          label="Bem-estar"
          value={wellbeingLogs.length}
          darkMode={darkMode}
        />
        <StatCard
          icon={() => <span className="text-xl">🎪</span>}
          label="Metas"
          value={goals.length}
          darkMode={darkMode}
        />
      </div>

      {/* Quick Actions */}
      <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
        <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
          ⚡ Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowDailyLogModal(true)}
            className={(darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800') + ' p-4 rounded-lg font-medium transition-colors text-sm'}
          >
            📊 Registar Dose
          </button>
          <button
            onClick={() => setShowWellbeingModal(true)}
            className={(darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800') + ' p-4 rounded-lg font-medium transition-colors text-sm'}
          >
            💚 Bem-estar
          </button>
          <button
            onClick={() => setShowReflectionModal(true)}
            className={(darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800') + ' p-4 rounded-lg font-medium transition-colors text-sm'}
          >
            🧠 Reflexão DBT
          </button>
          <button
            onClick={() => setShowCycleModal(true)}
            className={(darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800') + ' p-4 rounded-lg font-medium transition-colors text-sm'}
          >
            🎯 Terminar Ciclo
          </button>
        </div>
      </div>

      {/* Goals Section */}
      <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={'text-lg font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800')}>
            🎯 Metas
          </h3>
          <button
            onClick={() => setShowGoalModal(true)}
            className={'text-sm font-medium px-3 py-1 rounded-lg ' + (darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-100 hover:bg-purple-200 text-purple-700')}
          >
            + Nova Meta
          </button>
        </div>
        {goals.length === 0 ? (
          <p className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
            Ainda não tens metas. Cria a tua primeira meta!
          </p>
        ) : (
          <div className="space-y-3">
            {goals.slice(0, 3).map((goal, i) => (
              <div key={i} className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-3 border'}>
                <div className="flex justify-between items-start mb-2">
                  <span className={'text-sm font-medium ' + (darkMode ? 'text-gray-200' : 'text-gray-800')}>
                    {goal.type === 'reduce_frequency' && '📉 Reduzir frequência'}
                    {goal.type === 'reduce_quantity' && '📊 Reduzir quantidade'}
                    {goal.type === 'increase_interval' && '⏱️ Aumentar intervalo'}
                    {goal.type === 'sleep_hours' && '😴 Horas de sono'}
                    {goal.type === 'bedtime_before' && '🛏️ Hora de deitar'}
                    {goal.type === 'limit_last' && '🌙 Último antes 00h'}
                  </span>
                </div>
                <p className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                  Meta: {goal.target}{goal.type === 'increase_interval' || goal.type === 'sleep_hours' ? 'h' : goal.type === 'reduce_quantity' ? 'mg' : ''}
                </p>
              </div>
            ))}
            {goals.length > 3 && (
              <p className={'text-xs text-center ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                +{goals.length - 3} metas adicionais
              </p>
            )}
          </div>
        )}
      </div>

      {/* Coping Strategies */}
      {copingStrategies && copingStrategies.length > 0 && (
        <div className={(darkMode ? 'bg-gradient-to-br from-green-900/20 to-teal-900/20 border-green-700/50' : 'bg-gradient-to-br from-green-50 to-teal-50 border-green-200') + ' rounded-xl p-6 border'}>
          <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-green-300' : 'text-green-700')}>
            💡 Estratégias Recomendadas
          </h3>
          <ul className="space-y-2">
            {copingStrategies.map((strategy, i) => (
              <li key={i} className={'text-sm ' + (darkMode ? 'text-green-200' : 'text-green-800')}>
                • {strategy}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* User Coping Strategies */}
      {copingStrategiesData && copingStrategiesData.length > 0 && (
        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
          <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
            🛠️ Minhas Estratégias
          </h3>
          <div className="space-y-2">
            {copingStrategiesData.map(strategy => (
              <div key={strategy.id} className={(darkMode ? 'bg-gray-700/50' : 'bg-gray-50') + ' rounded-lg p-3 flex justify-between items-center'}>
                <span className={'text-sm ' + (darkMode ? 'text-gray-200' : 'text-gray-800')}>
                  {strategy.text}
                </span>
                <button
                  onClick={() => deleteCopingStrategy(strategy.id)}
                  className={'text-xs px-2 py-1 rounded hover:bg-red-500/20 ' + (darkMode ? 'text-red-400' : 'text-red-600')}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
