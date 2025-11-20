import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts';

const WellbeingChart = ({ wellbeingLogs, consumptions, darkMode, selectedCycle }) => {
  // Gráfico do dia - Humor & Energia ao longo das 24h
  const dayData = useMemo(() => {
    if (wellbeingLogs.length === 0) return [];

    const today = wellbeingLogs[0]?.date;
    const todayLogs = wellbeingLogs.filter(log => log.date === today).sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    if (todayLogs.length === 0) return [];

    // Inicializa 24 horas
    const hourlyData = {};
    for (let hour = 0; hour <= 23; hour++) {
      hourlyData[hour] = { hour: `${hour.toString().padStart(2, '0')}:00`, mood: null, energy: null };
    }

    // Preenche com dados (pega o último valor de cada hora)
    todayLogs.forEach(log => {
      const time = new Date(log.timestamp);
      const hour = time.getHours();
      if (hourlyData[hour]) {
        hourlyData[hour].mood = log.mood;
        hourlyData[hour].energy = log.energy;
      }
    });

    return Object.entries(hourlyData).map(([key, val]) => ({
      ...val,
      hourNum: parseInt(key)
    }));
  }, [wellbeingLogs]);

  // Cards de antes/depois do consumo
  const impactCards = useMemo(() => {
    if (consumptions.length === 0) return [];

    const today = wellbeingLogs[0]?.date;
    const todayConsumptions = consumptions.filter(c => c.date === today);

    return todayConsumptions.map(cons => {
      const consTime = new Date(cons.timestamp);

      // Bem-estar nas 3h ANTES
      const beforeWellbeing = wellbeingLogs.filter(w => {
        const wTime = new Date(w.timestamp);
        const hoursDiff = (consTime - wTime) / (1000 * 60 * 60);
        return hoursDiff > 0 && hoursDiff <= 3;
      }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      // Bem-estar nas 3h DEPOIS
      const afterWellbeing = wellbeingLogs.filter(w => {
        const wTime = new Date(w.timestamp);
        const hoursDiff = (wTime - consTime) / (1000 * 60 * 60);
        return hoursDiff > 0 && hoursDiff <= 3;
      }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];

      if (!beforeWellbeing || !afterWellbeing) return null;

      const moodDiff = afterWellbeing.mood - beforeWellbeing.mood;
      const energyDiff = afterWellbeing.energy - beforeWellbeing.energy;

      return {
        id: cons.id,
        time: new Date(cons.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
        moodBefore: beforeWellbeing.mood,
        moodAfter: afterWellbeing.mood,
        moodDiff,
        energyBefore: beforeWellbeing.energy,
        energyAfter: afterWellbeing.energy,
        energyDiff
      };
    }).filter(Boolean);
  }, [consumptions, wellbeingLogs]);

  // Encontra consumos para marcar no gráfico
  const consumptionMarkers = useMemo(() => {
    const today = wellbeingLogs[0]?.date;
    const todayConsumptions = consumptions.filter(c => c.date === today);

    return todayConsumptions.map(cons => {
      const time = new Date(cons.timestamp);
      const hour = time.getHours();
      const minutes = time.getMinutes();
      return {
        hour: hour + minutes / 60,
        hourLabel: `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      };
    });
  }, [consumptions, wellbeingLogs]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-800 border border-gray-300'}`}>
          {payload.map((entry, idx) => (
            <p key={idx} style={{ color: entry.color }}>
              {entry.name}: {entry.value !== undefined && entry.value !== null ? entry.value : '-'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getImpactColor = (diff) => {
    if (diff > 0.5) return 'text-green-600';
    if (diff < -0.5) return 'text-red-600';
    return 'text-gray-500';
  };

  const getImpactBgColor = (diff) => {
    if (diff > 0.5) return darkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200';
    if (diff < -0.5) return darkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200';
    return darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200';
  };

  const getImpactIcon = (diff) => {
    if (diff > 0.5) return '↑';
    if (diff < -0.5) return '↓';
    return '→';
  };

  if (dayData.length === 0) {
    return (
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
        <p className="text-sm">Sem dados de bem-estar registados para hoje</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gráfico do Dia */}
      <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <div className={'text-sm font-semibold mb-4 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
          📈 Humor & Energia ao Longo do Dia
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dayData} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ddd'} />
            <XAxis
              dataKey="hour"
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

            {/* Linhas */}
            <Line
              type="monotone"
              dataKey="mood"
              stroke="#3b82f6"
              name="Humor"
              connectNulls
              dot={{ fill: '#3b82f6', r: 4 }}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="energy"
              stroke="#f59e0b"
              name="Energia"
              connectNulls
              dot={{ fill: '#f59e0b', r: 4 }}
              strokeWidth={2}
              isAnimationActive={false}
            />

            {/* Marcadores de consumo */}
            {consumptionMarkers.map((marker, idx) => (
              <ReferenceDot
                key={idx}
                x={marker.hour}
                y={10}
                r={6}
                fill="#ef4444"
                opacity={0.8}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <div className={`mt-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>📊 Azul: Humor | 🟠 Energia | 🔴 Consumo</p>
        </div>
      </div>

      {/* Cards de Antes/Depois */}
      {impactCards.length > 0 && (
        <div>
          <div className={'text-sm font-semibold mb-3 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
            💊 Impacto do Consumo (Antes → Depois)
          </div>

          <div className="space-y-3">
            {impactCards.map((card) => (
              <div
                key={card.id}
                className={`rounded-lg p-4 border ${getImpactBgColor(Math.max(card.moodDiff, card.energyDiff))}`}
              >
                <div className={'text-xs font-medium mb-2 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>
                  ⏰ {card.time}
                </div>

                <div className="space-y-2">
                  {/* Humor */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Humor:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{card.moodBefore}</span>
                      <span className={`text-lg font-bold ${getImpactColor(card.moodDiff)}`}>
                        {getImpactIcon(card.moodDiff)}
                      </span>
                      <span className="text-sm font-medium">{card.moodAfter}</span>
                    </div>
                  </div>

                  {/* Energia */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Energia:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{card.energyBefore}</span>
                      <span className={`text-lg font-bold ${getImpactColor(card.energyDiff)}`}>
                        {getImpactIcon(card.energyDiff)}
                      </span>
                      <span className="text-sm font-medium">{card.energyAfter}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem se não há dados suficientes */}
      {impactCards.length === 0 && consumptions.length > 0 && (
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'} border text-xs`}>
          ℹ️ Para análise antes/depois, precisa de registos de bem-estar próximos ao consumo (3h antes e 3h depois)
        </div>
      )}
    </div>
  );
};

export default WellbeingChart;
