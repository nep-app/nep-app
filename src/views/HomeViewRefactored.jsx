import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../components/Icons';
import { InfoBadge } from '../components/ui/InfoBadge';
import { GradientButton } from '../components/ui/GradientButton';
import { AlertCard } from '../components/ui/AlertCard';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { formatDateTime } from '../utils/helpers';
import { themeClasses } from '../utils/classNames';
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
  setConsumptionsToShow,
  showToast
}) {
  const { t } = useTranslation();
  const { consumptions, goals, cycles, dailyLogs, manualSync, isSyncing } = useData();
  const metrics = useMetrics();
  const { darkMode, setShowThoughtsModal, setShowGoalModal, setShowWellbeingModal, setShowEmotionsModal, setShowReflectionModal, setShowCycleModal, setShowDailyLogModal } = useUI();

  const [cachedAlerts, setCachedAlerts] = useState([]);
  const [cachedTimeSince, setCachedTimeSince] = useState(null);

  useEffect(() => {
    getUserStats().then(stats => {
      if (stats.timeSinceLastConsumption) {
        setCachedTimeSince(stats.timeSinceLastConsumption);
      }
    });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      getUserStats().then(stats => {
        if (stats.timeSinceLastConsumption) {
          setCachedTimeSince(stats.timeSinceLastConsumption);
        }
      });
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    getUserStats().then(stats => {
      setCachedAlerts(stats.alerts && stats.alerts.length > 0 ? stats.alerts : []);
      if (stats.timeSinceLastConsumption) {
        setCachedTimeSince(stats.timeSinceLastConsumption);
      }
    });
  }, [consumptions, cycles, dailyLogs, goals]);

  const handleSync = async () => {
    try {
      const result = await manualSync();
      if (result) {
        const totalDocs = (result.pulled || 0) + (result.pushed || 0);
        if (totalDocs > 0) {
          showToast(t('home.syncSuccess', { count: totalDocs }), 'success');
        } else {
          showToast(t('home.syncAlreadyDone'), 'success');
        }
      }
    } catch (error) {
      showToast(`✗ ${error.message || t('home.syncError', 'Verifica a tua ligação à internet.')}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Botão sync */}
      <div className="flex justify-end">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
          title={t('home.sync')}
        >
          <Icons.RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? t('home.syncing') : t('home.sync')}
        </button>
      </div>

      {(() => {
        const timeSince = cachedTimeSince || metrics.timeSinceLastConsumption;
        if (timeSince) {
          const isLong = timeSince.hours >= 2;
          return (
            <div className="flex justify-center mb-4">
              <InfoBadge
                label={t('home.timeSinceLabel')}
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
          {t('home.markConsumption')}
        </GradientButton>
        <GradientButton
          onClick={() => setShowThoughtsModal(true)}
          icon={Icons.BookOpen}
          variant="green"
          size="large"
          className="shadow-xl"
        >
          {t('home.thoughts')}
        </GradientButton>
      </div>

      {cachedAlerts.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {cachedAlerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} darkMode={darkMode} />
          ))}
        </div>
      )}

      {/* Linha 1: Bem-estar, Emoções, Reflexão Diária */}
      <div className="grid grid-cols-3 gap-3">
        <GradientButton
          onClick={() => setShowWellbeingModal(true)}
          icon={Icons.Heart}
          variant="blue"
          size="medium"
          className="flex flex-col items-center h-auto py-4"
        >
          <div className="text-sm font-semibold">{t('home.wellbeing')}</div>
          <div className="text-xs opacity-80 mt-1">{t('home.wellbeingSubtitle')}</div>
        </GradientButton>
        <GradientButton
          onClick={() => setShowEmotionsModal(true)}
          icon={Icons.Heart}
          variant="purple"
          size="medium"
          className="flex flex-col items-center h-auto py-4"
        >
          <div className="text-sm font-semibold">{t('home.emotions')}</div>
          <div className="text-xs opacity-80 mt-1">{t('home.emotionsSubtitle')}</div>
        </GradientButton>
        <GradientButton
          onClick={() => setShowReflectionModal(true)}
          icon={Icons.Brain}
          variant="green"
          size="medium"
          className="flex flex-col items-center h-auto py-4"
        >
          <div className="text-sm font-semibold">{t('home.dailyReflection')}</div>
          <div className="text-xs opacity-80 mt-1">{t('home.dailyReflectionSubtitle')}</div>
        </GradientButton>
      </div>

      {/* Linha 2: Novo Ciclo, Registar mg, Metas */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setShowCycleModal(true)} className="bg-gradient-to-br from-yellow-500 to-amber-500 text-white rounded-xl p-3 font-medium hover:from-yellow-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
          <div className="text-lg mb-1">🌙</div>
          <div className="text-xs">{t('home.newCycle')}</div>
        </button>
        <button onClick={() => setShowDailyLogModal(true)} className="bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-xl p-3 font-medium hover:from-rose-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
          <div className="text-lg mb-1">📊</div>
          <div className="text-xs">{t('home.registerMg')}</div>
        </button>
        <button onClick={() => setShowGoalModal(true)} className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-xl p-3 font-medium hover:from-orange-600 hover:to-amber-700 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
          <div className="text-lg mb-1">🎯</div>
          <div className="text-xs">{t('home.goals')}</div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-purple-800/10' : 'bg-gradient-to-br from-purple-50 to-purple-100/50') + ' rounded-xl p-3'}>
          <div className={(darkMode ? 'text-purple-400' : 'text-purple-600') + ' text-xs font-medium mb-1'}>{t('home.today')}</div>
          <div className="flex items-baseline gap-1">
            <span className={'text-2xl font-black ' + (darkMode ? 'text-purple-300' : 'text-purple-600')}>{currentCycleCount}</span>
            <span className={(darkMode ? 'text-purple-400' : 'text-purple-500') + ' text-sm font-medium'}>x</span>
          </div>
        </div>
        <div className={(darkMode ? 'bg-gradient-to-br from-pink-900/20 to-pink-800/10' : 'bg-gradient-to-br from-pink-50 to-pink-100/50') + ' rounded-xl p-3'}>
          <div className={(darkMode ? 'text-pink-400' : 'text-pink-600') + ' text-xs font-medium mb-1'}>{t('home.avg7days')}</div>
          <div className="flex items-baseline gap-1">
            <span className={'text-2xl font-black ' + (darkMode ? 'text-pink-300' : 'text-pink-600')}>{last7.avgTimes}</span>
            <span className={(darkMode ? 'text-pink-400' : 'text-pink-500') + ' text-sm font-medium'}>x</span>
          </div>
          <div className={(darkMode ? 'text-pink-500' : 'text-pink-400') + ' text-xs font-medium mt-0.5'}>{last7.avgMg}{t('home.mgPerDay')}</div>
        </div>
      </div>

      <div className={(darkMode ? 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20' : 'bg-gradient-to-r from-blue-50 to-cyan-50') + ' rounded-xl p-4'}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">💡</span>
          <h3 className={'font-semibold ' + (darkMode ? 'text-blue-300' : 'text-gray-800')}>{t('home.strategiesTitle')}</h3>
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
          <div className={'text-xs mt-3 italic ' + (darkMode ? 'text-cyan-400' : 'text-blue-600')}>{t('home.strategiesBasedOnTriggers')}</div>
        )}
      </div>

      {consumptions.length > 0 && (
        <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-pink-900/20' : 'bg-white') + ' rounded-xl p-4'}>
          <h3 className={'font-semibold mb-3 ' + (darkMode ? 'text-purple-300' : 'text-gray-800')}>{t('home.recentConsumptions')}</h3>
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
              {t('home.showMore', { count: consumptions.length - consumptionsToShow })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
