import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

const WellbeingChart = ({ wellbeingLogs, consumptions, darkMode, selectedCycle }) => {
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'cycle'

  // Dados por dia (24 horas)
  const dayData = useMemo(() => {
    if (wellbeingLogs.length === 0) return [];

    // Agrupa por dia
    const today = wellbeingLogs[0]?.date;
    const todayLogs = wellbeingLogs.filter(log => log.date === today).sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    if (todayLogs.length === 0) return [];

    // Cria array com horas do dia
    const hourlyData = {};
    for (let hour = 0; hour <= 23; hour++) {
      hourlyData[hour] = { hour: `${hour.toString().padStart(2, '0')}:00`, mood: null, energy: null, consumptions: 0 };
    }

    // Preenche com dados de bem-estar
    todayLogs.forEach(log => {
      const time = new Date(log.timestamp);
      const hour = time.getHours();
      if (hourlyData[hour]) {
        if (!hourlyData[hour].mood) hourlyData[hour].mood = log.mood;
        if (!hourlyData[hour].energy) hourlyData[hour].energy = log.energy;
      }
    });

    // Adiciona consumos
    const todayConsumptions = consumptions.filter(c => c.date === today);
    todayConsumptions.forEach(cons => {
      const time = new Date(cons.timestamp);
      const hour = time.getHours();
      if (hourlyData[hour]) hourlyData[hour].consumptions++;
    });

    return Object.values(hourlyData).map(item => ({
      ...item,
      mood: item.mood !== null ? item.mood : undefined,
      energy: item.energy !== null ? item.energy : undefined
    }));
  }, [wellbeingLogs, consumptions]);

  // Dados por ciclo (impacto nas 3h após cada consumo)
  const cycleData = useMemo(() => {
    if (consumptions.length === 0) return [];

    const cycleConsumptions = selectedCycle
      ? consumptions.filter(c => c.cycleId === selectedCycle)
      : consumptions.slice(0, 5); // Últimos 5 se não houver ciclo selecionado

    return cycleConsumptions.map((cons, idx) => {
      const consTime = new Date(cons.timestamp);

      // Encontra registos de bem-estar nas 3h seguintes
      const afterWellbeing = wellbeingLogs.filter(w => {
        const wTime = new Date(w.timestamp);
        const hoursDiff = (wTime - consTime) / (1000 * 60 * 60);
        return hoursDiff > 0 && hoursDiff <= 3;
      }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Bem-estar nos 30min antes
      const beforeWellbeing = wellbeingLogs.filter(w => {
        const wTime = new Date(w.timestamp);
        const minsDiff = (consTime - wTime) / (1000 * 60);
        return minsDiff > 0 && minsDiff <= 30;
      }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const baseMood = beforeWellbeing.length > 0 ? beforeWellbeing[0].mood : null;
      const baseEnergy = beforeWellbeing.length > 0 ? beforeWellbeing[0].energy : null;

      const dataPoints = [];
      dataPoints.push({
        time: '0h (consumo)',
        mood: baseMood,
        energy: baseEnergy,
        label: 'Antes'
      });

      afterWellbeing.forEach((w, i) => {
        const hoursDiff = (new Date(w.timestamp) - consTime) / (1000 * 60 * 60);
        dataPoints.push({
          time: `${hoursDiff.toFixed(1)}h`,
          mood: w.mood,
          energy: w.energy,
          label: `Após ${hoursDiff.toFixed(1)}h`
        });
      });

      return { consumptionId: cons.id, consumptionTime: cons.timestamp, data: dataPoints };
    });
  }, [consumptions, wellbeingLogs, selectedCycle]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-800 border border-gray-300'}`}>
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color }}>
              {entry.name}: {entry.value !== undefined ? entry.value : '-'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (viewMode === 'day') {
    if (dayData.length === 0) {
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
            📈 Humor & Energia ao Longo do Dia
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`text-xs px-3 py-1 rounded ${viewMode === 'day' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-700')}`}
            >
              Por Dia
            </button>
            <button
              onClick={() => setViewMode('cycle')}
              className={`text-xs px-3 py-1 rounded ${viewMode === 'cycle' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-700')}`}
            >
              Por Ciclo
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dayData}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ddd'} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 12, fill: darkMode ? '#999' : '#666' }}
              angle={-45}
              height={80}
            />
            <YAxis
              yAxisId="left"
              label={{ value: 'Humor/Energia (0-10)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12, fill: darkMode ? '#999' : '#666' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Consumos', angle: 90, position: 'insideRight' }}
              tick={{ fontSize: 12, fill: darkMode ? '#999' : '#666' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px', color: darkMode ? '#999' : '#666' }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="mood"
              stroke="#3b82f6"
              name="Humor"
              connectNulls
              dot={{ fill: '#3b82f6', r: 4 }}
              strokeWidth={2}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="energy"
              stroke="#f59e0b"
              name="Energia"
              connectNulls
              dot={{ fill: '#f59e0b', r: 4 }}
              strokeWidth={2}
            />
            <Bar
              yAxisId="right"
              dataKey="consumptions"
              fill="#ef4444"
              name="Consumos"
              opacity={0.4}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={`mt-4 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>📊 Azul: Humor | 🟠 Energia | 🔴 Consumos nesta hora</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'cycle') {
    if (cycleData.length === 0) {
      return (
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
          <p className="text-sm">Sem dados de impacto disponíveis</p>
        </div>
      );
    }

    return (
      <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <div className={'text-sm font-semibold ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
            💊 Impacto do Consumo (3h seguintes)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`text-xs px-3 py-1 rounded ${viewMode === 'day' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-700')}`}
            >
              Por Dia
            </button>
            <button
              onClick={() => setViewMode('cycle')}
              className={`text-xs px-3 py-1 rounded ${viewMode === 'cycle' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-700')}`}
            >
              Por Ciclo
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {cycleData.map((cycle, idx) => (
            <div key={cycle.consumptionId}>
              <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Consumo {idx + 1} - {new Date(cycle.consumptionTime).toLocaleTimeString('pt-PT')}
              </div>
              {cycle.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={cycle.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ddd'} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: darkMode ? '#999' : '#666' }}
                    />
                    <YAxis
                      label={{ value: 'Valor (0-10)', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 11, fill: darkMode ? '#999' : '#666' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: darkMode ? '#999' : '#666' }} />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke="#3b82f6"
                      name="Humor"
                      connectNulls
                      dot={{ fill: '#3b82f6', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="#f59e0b"
                      name="Energia"
                      connectNulls
                      dot={{ fill: '#f59e0b', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className={`text-xs p-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Sem registos de bem-estar nas 3h seguintes
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={`mt-4 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>📊 Visualiza como o consumo afeta o humor e energia nas próximas 3 horas</p>
        </div>
      </div>
    );
  }
};

export default WellbeingChart;
