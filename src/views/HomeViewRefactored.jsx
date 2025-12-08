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
import { useGoalAlerts } from '../hooks/useGoalAlerts';

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
  const { consumptions, cycles } = useData();
  const metrics = useMetrics();
  const { darkMode, setShowThoughtsModal, setShowGoalModal, setShowWellbeingModal, setShowReflectionModal, setShowCycleModal, setShowDailyLogModal } = useUI();
  const alerts = useGoalAlerts();

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

      {alerts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {alerts.map((alert, i) => (
              <AlertCard key={i} alert={alert} darkMode={darkMode} />
            ))}
          </div>
      )}

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

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setShowReflectionModal(true)} className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl p-4 font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
          <Icons.Brain className="w-5 h-5 mb-2" />
          <div className="text-sm">Reflexão diária</div>
        </button>
        <button onClick={() => setShowDailyLogModal(true)} className="bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-xl p-4 font-medium hover:from-pink-600 hover:to-rose-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
          <div className="text-xl mb-1">📊</div>
          <div className="text-sm">Registar mg</div>
        </button>
        <button onClick={() => setShowCycleModal(true)} className="bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl p-4 font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
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
