import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';
import { useData } from '../../contexts/DataContext';

// Key para localStorage
const CONFIRMED_GAPS_KEY = 'nep-confirmed-gaps';

/**
 * Componente para mostrar gaps (dias com dados em falta) e permitir preenchimento rápido
 * Memoizado para evitar re-renders desnecessárias
 */
export const GapsReport = React.memo(({ onFillGap }) => {
  const { t, i18n } = useTranslation();
  const { consumptions, dailyLogs, cycles, wellbeingLogs, reflections, thoughts, weighings } = useData();

  // Estado para gaps confirmados (que o user marcou como "OK/correto")
  const [confirmedGaps, setConfirmedGaps] = useState(() => {
    try {
      const stored = localStorage.getItem(CONFIRMED_GAPS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Salvar no localStorage sempre que muda
  useEffect(() => {
    localStorage.setItem(CONFIRMED_GAPS_KEY, JSON.stringify(confirmedGaps));
  }, [confirmedGaps]);

  // Função para confirmar que um gap está correto (não precisa preencher)
  const confirmGap = (type, date) => {
    const gapKey = `${type}-${date}`;
    setConfirmedGaps(prev => ({ ...prev, [gapKey]: true }));
  };

  // Verificar se um gap já foi confirmado
  const isGapConfirmed = (type, date) => {
    const gapKey = `${type}-${date}`;
    return confirmedGaps[gapKey] === true;
  };

  // Calcular últimos 7 dias (OTIMIZADO para performance com grandes datasets)
  const last7Days = useMemo(() => {
    // PASSO 1: Criar índices de datas (uma única passagem pelos dados)
    // Isto reduz complexidade de O(n*7) para O(n+7) = MUITO mais rápido!

    const consumptionDates = new Set();
    consumptions.forEach(c => {
      try {
        consumptionDates.add(new Date(c.timestamp).toISOString().split('T')[0]);
      } catch {}
    });

    const dailyLogDates = new Set();
    dailyLogs.forEach(log => {
      const logDate = log.date || (log.timestamp ? new Date(log.timestamp).toISOString().split('T')[0] : null);
      if (logDate) dailyLogDates.add(logDate);
    });

    // Dias com pesagem (ou "não pesei"): contam como mg registado — a app deriva
    // os mg da pesagem, por isso não deve pedir o "mg" à mão nesses dias.
    const weighingDates = new Set();
    (weighings || []).forEach(w => {
      const wDate = w.date || (w.timestamp ? new Date(w.timestamp).toISOString().split('T')[0] : null);
      if (wDate) weighingDates.add(wDate);
    });

    const cycleDates = new Set();
    cycles.forEach(cycle => {
      if (cycle.timestamp) {
        try {
          cycleDates.add(new Date(cycle.timestamp).toISOString().split('T')[0]);
        } catch {}
      }
    });

    const wellbeingCoreDates = new Set();
    const emotionsDates = new Set();
    wellbeingLogs.forEach(w => {
      const wDate = w.date || (w.timestamp ? new Date(w.timestamp).toISOString().split('T')[0] : null);
      if (!wDate) return;

      // Verificar bem-estar básico (humor, energia, autocuidado)
      if (w.mood || w.energy || w.water || w.rest || w.social || w.food) {
        wellbeingCoreDates.add(wDate);
      }

      // Verificar emoções separadamente
      if (w.emotions && w.emotions.length > 0) {
        emotionsDates.add(wDate);
      }
    });

    const reflectionDates = new Set();
    reflections.forEach(r => {
      const rDate = r.date || (r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : null);
      if (rDate) reflectionDates.add(rDate);
    });

    const thoughtDates = new Set();
    thoughts.forEach(t => {
      const tDate = t.date || (t.timestamp ? new Date(t.timestamp).toISOString().split('T')[0] : null);
      if (tDate) thoughtDates.add(tDate);
    });

    // PASSO 2: Agora iterar pelos 7 dias usando lookups O(1) nos Sets
    const days = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayName = date.toLocaleDateString(i18n.language, { weekday: 'short' });
      const dayNumber = date.getDate();
      const monthName = date.toLocaleDateString(i18n.language, { month: 'short' });

      // Verificar o que existe para este dia (lookup O(1) - instantâneo!)
      const hasConsumptions = consumptionDates.has(dateKey);
      // "mg" está registado se houver registo à mão OU uma pesagem nesse dia.
      const hasDailyLog = dailyLogDates.has(dateKey) || weighingDates.has(dateKey);
      const hasCycle = cycleDates.has(dateKey);
      const hasWellbeingCore = wellbeingCoreDates.has(dateKey);
      const hasEmotions = emotionsDates.has(dateKey);
      const hasReflection = reflectionDates.has(dateKey);
      const hasThought = thoughtDates.has(dateKey);

      // Construir lista de gaps RAW (sem filtrar confirmados ainda)
      const gaps = [];
      if (!hasConsumptions) gaps.push({ type: 'consumption', label: 'consumos' });
      if (!hasDailyLog) gaps.push({ type: 'dailyLog', label: 'mg' });
      if (!hasCycle) gaps.push({ type: 'cycle', label: 'ciclo' });
      if (!hasWellbeingCore) gaps.push({ type: 'wellbeing', label: 'estado' });
      if (!hasEmotions) gaps.push({ type: 'emotions', label: 'emoções' });
      if (!hasReflection) gaps.push({ type: 'reflection', label: 'reflexão' });
      if (!hasThought) gaps.push({ type: 'thought', label: 'pensamento' });

      days.push({
        date: dateKey,
        dateObj: date,
        dayName,
        dayNumber,
        monthName,
        hasConsumptions,
        hasDailyLog,
        hasCycle,
        hasWellbeingCore,
        hasEmotions,
        hasReflection,
        hasThought,
        gaps,
        isComplete: gaps.length === 0
      });
    }

    return days;
  }, [consumptions, dailyLogs, cycles, wellbeingLogs, reflections, thoughts, weighings]);

  // Contar total de gaps (excluindo confirmados)
  const totalGaps = useMemo(() => {
    return last7Days.reduce((sum, day) => {
      const activeGaps = day.gaps.filter(gap => !isGapConfirmed(gap.type, day.date));
      return sum + activeGaps.length;
    }, 0);
  }, [last7Days, confirmedGaps]);

  // Dias com pelo menos um gap não confirmado
  const daysWithGaps = last7Days.filter(day => {
    const activeGaps = day.gaps.filter(gap => !isGapConfirmed(gap.type, day.date));
    return activeGaps.length > 0;
  });

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-700/50 rounded-xl p-4 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Icons.AlertCircle className="w-5 h-5 text-yellow-400" />
          {t('gaps.title')}
        </h3>
        {totalGaps === 0 ? (
          <span className="text-sm font-medium text-green-400">{t('gaps.allFilled')}</span>
        ) : (
          <span className="text-sm font-medium text-yellow-400">{totalGaps === 1 ? t('gaps.gapCount', { count: totalGaps }) : t('gaps.gapsCount', { count: totalGaps })}</span>
        )}
      </div>

      {totalGaps === 0 ? (
        <p className="text-sm text-gray-300">{t('gaps.allComplete')}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 mb-3">
            <Icons.Plus className="w-3 h-3 inline mr-1" /> {t('gaps.fillInstruction')}
            {' • '}
            <Icons.Check className="w-3 h-3 inline mr-1 text-green-400" /> {t('gaps.markOkInstruction')}
          </p>

          {daysWithGaps.map(day => {
            // Filtrar apenas gaps não confirmados
            const activeGaps = day.gaps.filter(gap => !isGapConfirmed(gap.type, day.date));

            return (
              <div key={day.date} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {day.dayName}, {day.dayNumber} {day.monthName}
                    </div>
                    <div className="text-xs text-gray-400">{day.date}</div>
                  </div>
                  <div className="text-xs font-medium text-yellow-400">
                    {activeGaps.length} {activeGaps.length === 1 ? 'gap' : 'gaps'}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeGaps.map(gap => {
                    // Configuração de cada tipo de gap
                    const gapConfig = {
                      consumption: { icon: '💊', label: t('gaps.consumption'), style: 'bg-gray-700 text-gray-300 hover:bg-gray-600' },
                      dailyLog: { icon: '💊', label: t('gaps.dailyLog'), style: 'bg-pink-900/50 text-pink-300 hover:bg-pink-900' },
                      cycle: { icon: '🌙', label: t('gaps.cycle'), style: 'bg-indigo-900/50 text-indigo-300 hover:bg-indigo-900' },
                      wellbeing: { icon: '💚', label: t('gaps.wellbeing'), style: 'bg-blue-900/50 text-blue-300 hover:bg-blue-900' },
                      emotions: { icon: '😊', label: t('gaps.emotions'), style: 'bg-purple-800/50 text-purple-300 hover:bg-purple-800' },
                      reflection: { icon: '📝', label: t('gaps.reflection'), style: 'bg-purple-900/50 text-purple-300 hover:bg-purple-900' },
                      thought: { icon: '📝', label: t('gaps.thought'), style: 'bg-pink-900/50 text-pink-300 hover:bg-pink-900' }
                    };

                    const config = gapConfig[gap.type];

                    return (
                      <div key={gap.type} className="flex items-center gap-1">
                        {/* Botão principal - Preencher */}
                        <button
                          onClick={() => onFillGap(gap.type, day.date)}
                          className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${config.style}`}
                          title={`Preencher ${config.label}`}
                        >
                          <Icons.Plus className="w-3 h-3" />
                          {config.icon} {config.label}
                        </button>

                        {/* Botão secundário - Marcar como OK/correto */}
                        <button
                          onClick={() => confirmGap(gap.type, day.date)}
                          className="text-xs px-1.5 py-1 rounded bg-green-900/50 text-green-300 hover:bg-green-900 transition-colors"
                          title="Marcar como correto (não precisa preencher)"
                        >
                          <Icons.Check className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
