import React, { useMemo } from 'react';
import * as Icons from '../Icons';
import { useData } from '../../contexts/DataContext';

/**
 * Componente para mostrar gaps (dias com dados em falta) e permitir preenchimento rápido
 */
export const GapsReport = ({ onFillGap }) => {
  const { consumptions, dailyLogs, cycles, wellbeingLogs, reflections, thoughts } = useData();

  // Calcular últimos 7 dias
  const last7Days = useMemo(() => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayName = date.toLocaleDateString('pt-PT', { weekday: 'short' });
      const dayNumber = date.getDate();
      const monthName = date.toLocaleDateString('pt-PT', { month: 'short' });

      // Verificar o que existe para este dia
      const hasConsumptions = consumptions.some(c => {
        const cDate = new Date(c.timestamp).toISOString().split('T')[0];
        return cDate === dateKey;
      });

      const hasDailyLog = dailyLogs.some(log => {
        const logDate = log.date || (log.timestamp ? new Date(log.timestamp).toISOString().split('T')[0] : null);
        return logDate === dateKey;
      });

      const hasCycle = cycles.some(cycle => {
        const cycleDate = cycle.timestamp ? new Date(cycle.timestamp).toISOString().split('T')[0] : null;
        return cycleDate === dateKey;
      });

      const hasWellbeing = wellbeingLogs.some(w => {
        const wDate = w.date || (w.timestamp ? new Date(w.timestamp).toISOString().split('T')[0] : null);
        return wDate === dateKey;
      });

      const hasReflection = reflections.some(r => {
        const rDate = r.date || (r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : null);
        return rDate === dateKey;
      });

      const hasThought = thoughts.some(t => {
        const tDate = t.date || (t.timestamp ? new Date(t.timestamp).toISOString().split('T')[0] : null);
        return tDate === dateKey;
      });

      const gaps = [];
      if (!hasConsumptions) gaps.push('consumos');
      if (!hasDailyLog) gaps.push('mg');
      if (!hasCycle) gaps.push('ciclo');
      if (!hasWellbeing) gaps.push('estado');
      if (!hasReflection) gaps.push('reflexão');
      if (!hasThought) gaps.push('pensamento');

      days.push({
        date: dateKey,
        dateObj: date,
        dayName,
        dayNumber,
        monthName,
        hasConsumptions,
        hasDailyLog,
        hasCycle,
        hasWellbeing,
        hasReflection,
        hasThought,
        gaps,
        isComplete: gaps.length === 0
      });
    }

    return days;
  }, [consumptions, dailyLogs, cycles, wellbeingLogs, reflections, thoughts]);

  // Contar total de gaps
  const totalGaps = useMemo(() => {
    return last7Days.reduce((sum, day) => sum + day.gaps.length, 0);
  }, [last7Days]);

  // Dias com pelo menos um gap
  const daysWithGaps = last7Days.filter(day => !day.isComplete);

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-700/50 rounded-xl p-4 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Icons.AlertCircle className="w-5 h-5 text-yellow-400" />
          Preencher Gaps (Últimos 7 dias)
        </h3>
        {totalGaps === 0 ? (
          <span className="text-sm font-medium text-green-400">✓ Tudo preenchido</span>
        ) : (
          <span className="text-sm font-medium text-yellow-400">{totalGaps} {totalGaps === 1 ? 'gap' : 'gaps'}</span>
        )}
      </div>

      {totalGaps === 0 ? (
        <p className="text-sm text-gray-300">
          🎉 Parabéns! Tens todos os registos completos nos últimos 7 dias.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 mb-3">
            Clica nos botões para preencher rapidamente os dados em falta:
          </p>

          {daysWithGaps.map(day => (
            <div key={day.date} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {day.dayName}, {day.dayNumber} {day.monthName}
                  </div>
                  <div className="text-xs text-gray-400">{day.date}</div>
                </div>
                <div className="text-xs font-medium text-yellow-400">
                  {day.gaps.length} {day.gaps.length === 1 ? 'gap' : 'gaps'}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!day.hasConsumptions && (
                  <button
                    onClick={() => onFillGap('consumption', day.date)}
                    className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors flex items-center gap-1"
                  >
                    <Icons.Plus className="w-3 h-3" />
                    💊 Consumo
                  </button>
                )}

                {!day.hasDailyLog && (
                  <button
                    onClick={() => onFillGap('dailyLog', day.date)}
                    className="text-xs px-2 py-1 rounded bg-pink-900/50 text-pink-300 hover:bg-pink-900 transition-colors flex items-center gap-1"
                  >
                    <Icons.Plus className="w-3 h-3" />
                    mg diários
                  </button>
                )}

                {!day.hasCycle && (
                  <button
                    onClick={() => onFillGap('cycle', day.date)}
                    className="text-xs px-2 py-1 rounded bg-indigo-900/50 text-indigo-300 hover:bg-indigo-900 transition-colors flex items-center gap-1"
                  >
                    <Icons.Plus className="w-3 h-3" />
                    🌙 Ciclo
                  </button>
                )}

                {!day.hasWellbeing && (
                  <button
                    onClick={() => onFillGap('wellbeing', day.date)}
                    className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-300 hover:bg-blue-900 transition-colors flex items-center gap-1"
                  >
                    <Icons.Plus className="w-3 h-3" />
                    💚 Estado
                  </button>
                )}

                {!day.hasReflection && (
                  <button
                    onClick={() => onFillGap('reflection', day.date)}
                    className="text-xs px-2 py-1 rounded bg-purple-900/50 text-purple-300 hover:bg-purple-900 transition-colors flex items-center gap-1"
                  >
                    <Icons.Plus className="w-3 h-3" />
                    Reflexão
                  </button>
                )}

                {!day.hasThought && (
                  <button
                    onClick={() => onFillGap('thought', day.date)}
                    className="text-xs px-2 py-1 rounded bg-pink-900/50 text-pink-300 hover:bg-pink-900 transition-colors flex items-center gap-1"
                  >
                    <Icons.Plus className="w-3 h-3" />
                    Pensamento
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
