import React, { useState, useMemo } from 'react';
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const WellbeingChart = ({ wellbeingLogs, consumptions, darkMode, selectedCycle }) => {
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline', 'scatter', 'step'

  // Prepara dados do gráfico
  const chartData = useMemo(() => {
    if (wellbeingLogs.length === 0) return [];

    const today = wellbeingLogs[0]?.date;
    const todayLogs = wellbeingLogs
      .filter(log => log.date === today)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (todayLogs.length === 0) return [];

    return todayLogs.map((log) => {
      const time = new Date(log.timestamp);
      const timeNum = time.getTime();
      const timeStr = time.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

      return {
        time: timeStr,
        timeNum,
        mood: log.mood,
        energy: log.energy
      };
    });
  }, [wellbeingLogs]);

  // Prepara timeline (mesma lógica anterior)
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

        if (moodDiff > 0.5 && energyDiff > 0.5) {
          arrow = '↑';
        } else if (moodDiff < -0.5 && energyDiff < -0.5) {
          arrow = '↓';
        } else {
          arrow = '→';
        }

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

  // Encontra consumos para marcar nos gráficos
  const consumptionMarkers = useMemo(() => {
    if (consumptions.length === 0 || chartData.length === 0) return [];

    const today = wellbeingLogs[0]?.date;
    const todayConsumptions = consumptions.filter(c => c.date === today);

    return todayConsumptions.map(cons => {
      const consTime = new Date(cons.timestamp);
      const timeStr = consTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

      return {
        time: timeStr,
        timeNum: consTime.getTime()
      };
    });
  }, [consumptions, wellbeingLogs, chartData]);

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

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-800 border border-gray-300'}`}>
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
        <p className="text-sm">Sem dados de bem-estar registados para hoje</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex justify-between items-center mb-4">
        <div className={'text-sm font-semibold ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
          📈 Evolução de Bem-estar & Consumos
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            className={`text-xs px-2 py-1 rounded ${
              viewMode === 'timeline'
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-700')
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setViewMode('scatter')}
            className={`text-xs px-2 py-1 rounded ${
              viewMode === 'scatter'
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-700')
            }`}
          >
            Scatter
          </button>
          <button
            onClick={() => setViewMode('step')}
            className={`text-xs px-2 py-1 rounded ${
              viewMode === 'step'
                ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-700')
            }`}
          >
            Step
          </button>
        </div>
      </div>

      {/* TIMELINE VIEW */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {timeline.map((entry, idx) => (
            <div key={idx}>
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

              <div className={'text-sm ml-6 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                Humor: {entry.mood}
                {entry.diff && (
                  <span className={`ml-2 font-medium ${getColorForDiff(entry.diff.mood)}`}>
                    ({getDiffIcon(entry.diff.mood)} {entry.diff.mood > 0 ? '+' : ''}{entry.diff.mood.toFixed(0)})
                  </span>
                )}
              </div>

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
      )}

      {/* SCATTER CHART VIEW */}
      {viewMode === 'scatter' && (
        <div>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ddd'} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12, fill: darkMode ? '#999' : '#666' }}
                angle={-45}
                height={80}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fill: darkMode ? '#999' : '#666' }}
                label={{ value: 'Valor (0-10)', angle: -90, position: 'insideLeft', offset: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px', color: darkMode ? '#999' : '#666' }} />

              {/* Linha contínua de Humor */}
              <Scatter
                name="Humor"
                dataKey="mood"
                fill="#3b82f6"
                line={{ stroke: '#3b82f6', strokeWidth: 2 }}
              />

              {/* Linha contínua de Energia */}
              <Scatter
                name="Energia"
                dataKey="energy"
                fill="#f59e0b"
                line={{ stroke: '#f59e0b', strokeWidth: 2 }}
              />

              {/* Marcadores de consumo como linha de referência */}
              {consumptionMarkers.map((marker, idx) => (
                <ReferenceLine
                  key={idx}
                  x={marker.time}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: '▼', position: 'bottom', fill: '#ef4444', fontSize: 14 }}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          <div className={`mt-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <p>● Azul: Humor | ● Laranja: Energia | ▼ Consumos</p>
          </div>
        </div>
      )}

      {/* STEP CHART VIEW */}
      {viewMode === 'step' && (
        <div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ddd'} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12, fill: darkMode ? '#999' : '#666' }}
                angle={-45}
                height={80}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 12, fill: darkMode ? '#999' : '#666' }}
                label={{ value: 'Valor (0-10)', angle: -90, position: 'insideLeft', offset: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px', color: darkMode ? '#999' : '#666' }} />

              {/* Step chart: mantém valor até ao próximo */}
              <Line
                type="stepAfter"
                dataKey="mood"
                stroke="#3b82f6"
                name="Humor"
                dot={{ fill: '#3b82f6', r: 5 }}
                strokeWidth={2}
                isAnimationActive={false}
              />

              <Line
                type="stepAfter"
                dataKey="energy"
                stroke="#f59e0b"
                name="Energia"
                dot={{ fill: '#f59e0b', r: 5 }}
                strokeWidth={2}
                isAnimationActive={false}
              />

              {/* Marcadores de consumo */}
              {consumptionMarkers.map((marker, idx) => (
                <ReferenceLine
                  key={idx}
                  x={marker.time}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: '▼', position: 'bottom', fill: '#ef4444', fontSize: 14 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className={`mt-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <p>● Azul: Humor | ● Laranja: Energia | ▼ Consumos</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WellbeingChart;
