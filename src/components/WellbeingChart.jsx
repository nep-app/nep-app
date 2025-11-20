import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';

const WellbeingChart = ({ wellbeingLogs, consumptions, darkMode, selectedCycle }) => {
  // Prepara dados: só os registos de hoje em ordem cronológica
  const chartData = useMemo(() => {
    if (wellbeingLogs.length === 0) return [];

    const today = wellbeingLogs[0]?.date;
    const todayLogs = wellbeingLogs
      .filter(log => log.date === today)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (todayLogs.length === 0) return [];

    return todayLogs.map((log, idx) => {
      const time = new Date(log.timestamp);
      const timeStr = time.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

      return {
        time: timeStr,
        timeNum: time.getTime(),
        mood: log.mood,
        energy: log.energy,
        index: idx
      };
    });
  }, [wellbeingLogs]);

  // Encontra consumos para marcar
  const consumptionMarkers = useMemo(() => {
    if (consumptions.length === 0 || chartData.length === 0) return [];

    const today = wellbeingLogs[0]?.date;
    const todayConsumptions = consumptions.filter(c => c.date === today);

    return todayConsumptions.map(cons => {
      const consTime = new Date(cons.timestamp).getTime();
      const timeStr = new Date(cons.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

      return {
        id: cons.id,
        timeNum: consTime,
        timeStr: timeStr,
        // Encontra o ponto mais próximo do gráfico para posicionar o marker
        closestDataPoint: chartData.reduce((closest, current) => {
          const currentDiff = Math.abs(current.timeNum - consTime);
          const closestDiff = Math.abs(closest.timeNum - consTime);
          return currentDiff < closestDiff ? current : closest;
        })
      };
    });
  }, [consumptions, wellbeingLogs, chartData]);

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
      <div className={'text-sm font-semibold mb-4 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
        📈 Evolução de Humor & Energia ao Longo do Dia
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
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

          {/* Linhas de dados */}
          <Line
            type="linear"
            dataKey="mood"
            stroke="#3b82f6"
            name="Humor"
            dot={{ fill: '#3b82f6', r: 5 }}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="energy"
            stroke="#f59e0b"
            name="Energia"
            dot={{ fill: '#f59e0b', r: 5 }}
            strokeWidth={2}
            isAnimationActive={false}
          />

          {/* Marcadores de consumo */}
          {consumptionMarkers.map((marker) => (
            <ReferenceDot
              key={marker.id}
              x={marker.closestDataPoint.time}
              y={marker.closestDataPoint.mood !== undefined ? marker.closestDataPoint.mood : 5}
              r={7}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className={`mt-4 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <p>● Pontos: Teus registos | 🟦 Azul: Humor | 🟧 Laranja: Energia | 🔴 Círculo vazio: Consumo</p>
      </div>

      {/* Resumo dos consumos */}
      {consumptionMarkers.length > 0 && (
        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className={'text-xs font-medium mb-2 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
            💊 Consumos marcados: {consumptionMarkers.map(m => m.timeStr).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default WellbeingChart;
