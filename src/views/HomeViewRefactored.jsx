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

  // Carregar timeSince da cache no mount
  useEffect(() => {
    getUserStats().then(stats => {
      if (stats.timeSinceLastConsumption) {
        setCachedTimeSince(stats.timeSinceLastConsumption);
      }
    });
  }, []); // Apenas no mount

  // Atualizar avisos e timeSince quando dados mudam
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
      const result = await manualSync();
      console.log('[HomeView] ✅ Sync concluído:', result);

      // Mostrar feedback visual de sucesso
      if (result) {
        const totalDocs = (result.consumptions?.total || 0) +
                         (result.cycles?.total || 0) +
                         (result.dailyLogs?.total || 0);
        if (totalDocs > 0) {
          alert(`✅ Sincronizado! ${totalDocs} registos atualizados.`);
        } else {
          alert('✅ Já está tudo sincronizado!');
        }
      }
    } catch (error) {
      console.error('[HomeView] ❌ Erro ao sincronizar:', error);
      // Mostrar erro ao utilizador
      alert(`❌ Erro ao sincronizar: ${error.message || 'Verifica a tua ligação à internet e tenta novamente.'}`);
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


      {/* Avisos pré-calculados (atualizados automaticamente quando dados mudam) */}
      {cachedAlerts.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {cachedAlerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} />
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
