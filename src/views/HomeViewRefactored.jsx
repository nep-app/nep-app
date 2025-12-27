import React from 'react';
import * as Icons from '../components/Icons';
import { MotivationalCard } from '../components/ui/MotivationalCard';
import { InfoBadge } from '../components/ui/InfoBadge';
import { GradientButton } from '../components/ui/GradientButton';
import { AlertCard } from '../components/ui/AlertCard';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { formatDateTime } from '../utils/helpers';
import { themeClasses } from '../utils/classNames';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const { consumptions, goals, cycles, dailyLogs } = useData();
  const metrics = useMetrics();
  const { darkMode, setShowThoughtsModal, setShowGoalModal, setShowWellbeingModal, setShowReflectionModal, setShowCycleModal, setShowDailyLogModal } = useUI();

  return (
    <div className="space-y-6">
      {/* Mensagem Motivacional */}
      <MotivationalCard message={currentReflection} darkMode={darkMode} />

      {(() => {
        const timeSince = metrics.timeSinceLastConsumption;
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
              <AlertCard key={i} alert={alert} darkMode={darkMode} />
            ))}
          </div>
        );
      })()}

      <div className="grid grid-cols-2 gap-4">
        <GradientButton
          onClick={() => setShowGoalModal(true)}
          icon={Icons.Target}
          variant="orange"
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

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setShowReflectionModal(true)} className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-xl p-4 font-medium hover:from-emerald-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
          <Icons.Brain className="w-5 h-5 mb-2" />
          <div className="text-sm">Reflexão diária</div>
        </button>
        <button onClick={() => setShowDailyLogModal(true)} className="bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-xl p-4 font-medium hover:from-rose-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
          <div className="text-xl mb-1">📊</div>
          <div className="text-sm">Registar mg</div>
        </button>
        <button onClick={() => setShowCycleModal(true)} className="bg-gradient-to-br from-yellow-500 to-amber-500 text-white rounded-xl p-4 font-medium hover:from-yellow-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
          <div className="text-xl mb-1">🌙</div>
          <div className="text-sm">Novo Ciclo</div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-purple-800/10' : 'bg-gradient-to-br from-purple-50 to-purple-100/50') + ' rounded-xl p-3'}>
          <div className={(darkMode ? 'text-purple-400' : 'text-purple-600') + ' text-xs font-medium mb-1'}>Hoje</div>
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

      {/* 📊 GRÁFICO DE DOSAGEM SEMANAL */}
      {(() => {
        if (dailyLogs.length < 7) return null;

        // Helper: obter ISO week number
        const getISOWeek = (date) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 4 - (d.getDay() || 7));
          const yearStart = new Date(d.getFullYear(), 0, 1);
          const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
          return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
        };

        // Agrupar dosagem por semana
        const weeklyData = {};
        dailyLogs.forEach(log => {
          const mg = parseFloat(log.mg);
          if (!mg || mg <= 0) return;

          const week = getISOWeek(log.timestamp);
          if (!weeklyData[week]) {
            weeklyData[week] = { week, totalMg: 0, days: 0 };
          }
          weeklyData[week].totalMg += mg;
          weeklyData[week].days++;
        });

        const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week));
        if (sortedWeeks.length < 2) return null;

        // Calcular tendência
        const recentWeeks = sortedWeeks.slice(-4);
        const oldWeeks = sortedWeeks.slice(0, Math.min(4, sortedWeeks.length - 4));
        const avgRecent = recentWeeks.reduce((s, w) => s + w.totalMg, 0) / recentWeeks.length;
        const avgOld = oldWeeks.length > 0 ? oldWeeks.reduce((s, w) => s + w.totalMg, 0) / oldWeeks.length : avgRecent;
        const trendPct = oldWeeks.length > 0 ? ((avgRecent - avgOld) / avgOld * 100) : 0;

        let trendLabel = 'Estável';
        let trendIcon = '➡️';
        if (trendPct > 15) {
          trendLabel = 'A Aumentar';
          trendIcon = '📈';
        } else if (trendPct < -15) {
          trendLabel = 'A Reduzir';
          trendIcon = '📉';
        }

        const chartData = sortedWeeks.slice(-12).map(w => ({
          week: w.week.replace(/^\d{4}-W/, 'S'),
          dosagem: w.totalMg,
          days: w.days
        }));

        const avgWeekly = (sortedWeeks.reduce((s, w) => s + w.totalMg, 0) / sortedWeeks.length).toFixed(0);

        return (
          <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-pink-900/20' : 'bg-white') + ' rounded-xl p-4 border ' + (darkMode ? 'border-purple-800/30' : 'border-purple-200')}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={'font-semibold ' + (darkMode ? 'text-purple-300' : 'text-gray-800')}>📊 Dosagem Semanal</h3>
              <div className={'text-xs px-2 py-1 rounded-full ' + (darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700')}>
                {sortedWeeks.length} {sortedWeeks.length === 1 ? 'semana' : 'semanas'}
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={'text-center p-3 rounded-lg ' + (darkMode ? 'bg-gray-800/50' : 'bg-gray-50')}>
                <div className={'text-xs opacity-75 mb-1 ' + (themeClasses.textTertiary(darkMode))}>Média Semanal</div>
                <div className={'text-2xl font-bold ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>
                  {avgWeekly}mg
                </div>
              </div>
              <div className={'text-center p-3 rounded-lg ' + (
                trendLabel === 'A Reduzir'
                  ? (darkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-100 border border-green-300')
                  : trendLabel === 'A Aumentar'
                    ? (darkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-100 border border-red-300')
                    : (darkMode ? 'bg-gray-800/50' : 'bg-gray-50')
              )}>
                <div className={'text-xs opacity-75 mb-1 ' + (themeClasses.textTertiary(darkMode))}>Tendência (4 sem)</div>
                <div className={'text-xl font-bold flex items-center justify-center gap-1 ' + (
                  trendLabel === 'A Reduzir'
                    ? (darkMode ? 'text-green-400' : 'text-green-600')
                    : trendLabel === 'A Aumentar'
                      ? (darkMode ? 'text-red-400' : 'text-red-600')
                      : (darkMode ? 'text-gray-400' : 'text-gray-600')
                )}>
                  <span>{trendIcon}</span>
                  <span className="text-sm">{trendPct.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Gráfico */}
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                    label={{ value: 'mg', angle: -90, position: 'insideLeft', fontSize: 11, fill: darkMode ? '#9ca3af' : '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1f2937' : '#fff',
                      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    formatter={(value, name, props) => [
                      `${value}mg (${props.payload.days} ${props.payload.days === 1 ? 'dia' : 'dias'})`,
                      'Dosagem Total'
                    ]}
                  />
                  <Bar
                    dataKey="dosagem"
                    fill={darkMode ? '#a78bfa' : '#8b5cf6'}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className={'text-xs italic mt-2 text-center ' + (themeClasses.textTertiary(darkMode))}>
              Últimas {Math.min(12, sortedWeeks.length)} semanas
            </p>
          </div>
        );
      })()}

      {consumptions.length > 0 && (
        <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-pink-900/20' : 'bg-white') + ' rounded-xl p-4'}>
          <h3 className={'font-semibold mb-3 ' + (darkMode ? 'text-purple-300' : 'text-gray-800')}>Consumos Recentes</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {consumptions.slice(0, consumptionsToShow).map(c => (
              <div key={c.id} className={'flex items-center justify-between py-2.5 px-3 rounded-lg ' + (darkMode ? 'bg-purple-950/30' : 'bg-gray-50')}>
                <div className="flex-1">
                  <div className={'text-sm font-medium ' + (darkMode ? 'text-gray-200' : 'text-gray-800')}>
                    {formatDateTime(c.timestamp)}
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
