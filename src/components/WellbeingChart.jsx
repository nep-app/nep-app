import React, { useMemo } from 'react';

const WellbeingChart = ({ wellbeingLogs, consumptions, darkMode, selectedCycle }) => {
  // Prepara timeline de bem-estar com comparações
  const timeline = useMemo(() => {
    if (wellbeingLogs.length === 0) return [];

    const today = wellbeingLogs[0]?.date;
    const todayLogs = wellbeingLogs
      .filter(log => log.date === today)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (todayLogs.length === 0) return [];

    return todayLogs.map((log, idx) => {
      const currentTime = new Date(log.timestamp);
      const currentTimeStr = currentTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

      let diff = null;
      let previousTimeStr = null;
      let consumptionsBetween = 0;
      let arrow = null;

      if (idx > 0) {
        const previousLog = todayLogs[idx - 1];
        const previousTime = new Date(previousLog.timestamp);
        previousTimeStr = previousTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

        const moodDiff = log.mood - previousLog.mood;
        const energyDiff = log.energy - previousLog.energy;

        // Determina arrow
        if (moodDiff > 0.5 && energyDiff > 0.5) {
          arrow = '↑';
        } else if (moodDiff < -0.5 && energyDiff < -0.5) {
          arrow = '↓';
        } else {
          arrow = '→';
        }

        // Conta consumos entre os dois registos
        const todayConsumptions = consumptions.filter(c => c.date === today);
        consumptionsBetween = todayConsumptions.filter(c => {
          const consTime = new Date(c.timestamp);
          return consTime > previousTime && consTime <= currentTime;
        }).length;

        diff = { mood: moodDiff, energy: energyDiff };
      }

      return {
        time: currentTimeStr,
        mood: log.mood,
        energy: log.energy,
        diff,
        previousTime: previousTimeStr,
        consumptionsBetween,
        arrow
      };
    });
  }, [wellbeingLogs, consumptions]);

  const getColorForDiff = (value) => {
    if (value > 0.5) return darkMode ? 'text-green-400' : 'text-green-600';
    if (value < -0.5) return darkMode ? 'text-red-400' : 'text-red-600';
    return darkMode ? 'text-gray-400' : 'text-gray-600';
  };

  const getDiffIcon = (value) => {
    if (value > 0.5) return '↑';
    if (value < -0.5) return '↓';
    return '→';
  };

  if (timeline.length === 0) {
    return (
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
        <p className="text-sm">Sem dados de bem-estar registados para hoje</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      <div className={'text-sm font-semibold mb-6 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
        📈 Evolução de Bem-estar & Consumos
      </div>

      <div className="space-y-4">
        {timeline.map((entry, idx) => (
          <div key={idx}>
            {/* Linha 1: Arrow + Hora + Consumos */}
            <div className={'flex items-center gap-2 text-sm font-medium ' + (darkMode ? 'text-gray-200' : 'text-gray-800')}>
              {entry.arrow ? (
                <span className="text-lg">{entry.arrow}</span>
              ) : (
                <span className="text-lg">•</span>
              )}
              <span>{entry.time}</span>
              {entry.consumptionsBetween > 0 && (
                <span className="text-xs ml-2">
                  💊 {entry.consumptionsBetween} consumo{entry.consumptionsBetween !== 1 ? 's' : ''} desde {entry.previousTime}
                </span>
              )}
              {entry.previousTime && entry.consumptionsBetween === 0 && (
                <span className={`text-xs ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  (sem consumos desde {entry.previousTime})
                </span>
              )}
            </div>

            {/* Linha 2: Humor */}
            <div className={'text-sm ml-6 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
              Humor: {entry.mood}
              {entry.diff && (
                <span className={`ml-2 font-medium ${getColorForDiff(entry.diff.mood)}`}>
                  ({getDiffIcon(entry.diff.mood)} {entry.diff.mood > 0 ? '+' : ''}{entry.diff.mood.toFixed(0)})
                </span>
              )}
            </div>

            {/* Linha 3: Energia */}
            <div className={'text-sm ml-6 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
              Energia: {entry.energy}
              {entry.diff && (
                <span className={`ml-2 font-medium ${getColorForDiff(entry.diff.energy)}`}>
                  ({getDiffIcon(entry.diff.energy)} {entry.diff.energy > 0 ? '+' : ''}{entry.diff.energy.toFixed(0)})
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WellbeingChart;
