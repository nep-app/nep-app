import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const WellbeingChart = ({ wellbeingLogs, consumptions, darkMode, selectedCycle }) => {
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline', 'scatter', 'step'
  const [selectedDate, setSelectedDate] = useState(null); // Data selecionada

  // Encontra todas as datas únicas com bem-estar registado
  const availableDates = useMemo(() => {
    if (wellbeingLogs.length === 0) return [];

    const dates = [...new Set(wellbeingLogs.map(log => log.date))].sort().reverse();
    return dates;
  }, [wellbeingLogs]);

  // Define a data selecionada (padrão: hoje)
  const currentDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    if (availableDates.length > 0) return availableDates[0];
    return null;
  }, [selectedDate, availableDates]);

  // Calcula label do dia (Hoje, Ontem, Há 2 dias, etc.)
  const getDayLabel = (date) => {
    if (!date || availableDates.length === 0) return '';

    const index = availableDates.indexOf(date);
    if (index === 0) return 'Hoje';
    if (index === 1) return 'Ontem';
    return `Há ${index} dias`;
  };

  // Prepara dados do gráfico para o dia selecionado
  const chartData = useMemo(() => {
    if (wellbeingLogs.length === 0 || !currentDate) return [];

    const selectedLogs = wellbeingLogs
      .filter(log => log.date === currentDate)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (selectedLogs.length === 0) return [];

    return selectedLogs.map((log) => {
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
  }, [wellbeingLogs, currentDate]);

  // Prepara timeline para o dia selecionado
  const timeline = useMemo(() => {
    if (wellbeingLogs.length === 0 || !currentDate) return [];

    const selectedLogs = wellbeingLogs
      .filter(log => log.date === currentDate)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (selectedLogs.length === 0) return [];

    return selectedLogs.map((log, idx) => {
      const currentTime = new Date(log.timestamp);
      const currentTimeStr = currentTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

      let diff = null;
      let previousTimeStr = null;
      let consumptionsBetween = 0;
      let arrow = null;

      if (idx > 0) {
        const previousLog = selectedLogs[idx - 1];
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

        const selectedConsumptions = consumptions.filter(c => c.date === currentDate);
        consumptionsBetween = selectedConsumptions.filter(c => {
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
  }, [wellbeingLogs, consumptions, currentDate]);

  // Encontra consumos para o dia selecionado
  const consumptionMarkers = useMemo(() => {
    if (consumptions.length === 0 || chartData.length === 0 || !currentDate) return [];

    const selectedConsumptions = consumptions.filter(c => c.date === currentDate);

    return selectedConsumptions.map(cons => {
      const consTime = new Date(cons.timestamp);
      const timeStr = consTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

      return {
        time: timeStr,
        timeNum: consTime.getTime()
      };
    });
  }, [consumptions, chartData, currentDate]);

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

  if (availableDates.length === 0 || chartData.length === 0) {
    return (
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
        <p className="text-sm">Sem dados de bem-estar registados</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      {/* Header com seletor de data e visualização */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className={'text-sm font-semibold ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
          📈 Evolução de Bem-estar & Consumos
        </div>

        {/* Seletor de datas */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => {
              const currentIdx = availableDates.indexOf(currentDate);
              if (currentIdx < availableDates.length - 1) {
                setSelectedDate(availableDates[currentIdx + 1]);
              }
            }}
            disabled={availableDates.indexOf(currentDate) >= availableDates.length - 1}
            className={`text-xs px-2 py-1 rounded ${
              availableDates.indexOf(currentDate) >= availableDates.length - 1
                ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                : (darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-300 text-gray-700 hover:bg-gray-400')
            }`}
          >
            ←
          </button>

          <div className={`text-xs px-3 py-1 rounded font-medium ${darkMode ? 'bg-gray-600 text-white' : 'bg-blue-100 text-blue-800'}`}>
            {getDayLabel(currentDate)}
          </div>

          <button
            onClick={() => {
              const currentIdx = availableDates.indexOf(currentDate);
              if (currentIdx > 0) {
                setSelectedDate(availableDates[currentIdx - 1]);
              }
            }}
            disabled={availableDates.indexOf(currentDate) <= 0}
            className={`text-xs px-2 py-1 rounded ${
              availableDates.indexOf(currentDate) <= 0
                ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                : (darkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-300 text-gray-700 hover:bg-gray-400')
            }`}
          >
            →
          </button>
        </div>

        {/* Seletor de visualização */}
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

              <Line
                type="linear"
                dataKey="mood"
                stroke="#3b82f6"
                name="Humor"
                dot={{ fill: '#3b82f6', r: 7 }}
                strokeWidth={3}
                isAnimationActive={false}
              />

              <Line
                type="linear"
                dataKey="energy"
                stroke="#f59e0b"
                name="Energia"
                strokeDasharray="5 5"
                dot={{ fill: '#f59e0b', r: 7 }}
                strokeWidth={3}
                isAnimationActive={false}
              />

              {consumptionMarkers.map((marker, idx) => (
                <ReferenceLine
                  key={idx}
                  x={marker.time}
                  stroke="#ef4444"
                  strokeWidth={3}
                  label={{ value: '◆ CONSUMO', position: 'top', fill: '#ef4444', fontSize: 12, offset: 10 }}
                />
              ))}
            </LineChart>
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

              <Line
                type="stepAfter"
                dataKey="mood"
                stroke="#3b82f6"
                name="Humor"
                dot={{ fill: '#3b82f6', r: 7 }}
                strokeWidth={3}
                isAnimationActive={false}
              />

              <Line
                type="stepAfter"
                dataKey="energy"
                stroke="#f59e0b"
                name="Energia"
                strokeDasharray="5 5"
                dot={{ fill: '#f59e0b', r: 7 }}
                strokeWidth={3}
                isAnimationActive={false}
              />

              {consumptionMarkers.map((marker, idx) => (
                <ReferenceLine
                  key={idx}
                  x={marker.time}
                  stroke="#ef4444"
                  strokeWidth={3}
                  label={{ value: '◆ CONSUMO', position: 'top', fill: '#ef4444', fontSize: 12, offset: 10 }}
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
