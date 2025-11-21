import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const WellbeingChart = ({ wellbeingLogs, consumptions, darkMode, selectedCycle }) => {
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
    if (!currentDate) return [];

    // Cria mapa de dados por minuto desde meia-noite
    const dataByMinute = {};

    // Função auxiliar para converter tempo em minutos desde meia-noite
    const getMinutesFromMidnight = (timestamp) => {
      const date = new Date(timestamp);
      return date.getHours() * 60 + date.getMinutes();
    };

    // Função auxiliar para converter minutos para string HH:MM
    const minutesToTimeStr = (minutes) => {
      const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
      const mins = (minutes % 60).toString().padStart(2, '0');
      return `${hours}:${mins}`;
    };

    // Adiciona registos de wellbeing
    const selectedLogs = wellbeingLogs
      .filter(log => log.date === currentDate)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    selectedLogs.forEach(log => {
      const minutesSinceMidnight = getMinutesFromMidnight(log.timestamp);
      const timeStr = minutesToTimeStr(minutesSinceMidnight);

      if (!dataByMinute[minutesSinceMidnight]) {
        dataByMinute[minutesSinceMidnight] = {
          time: timeStr,
          minutesSinceMidnight,
          mood: null,
          energy: null,
          consumptionCount: 0,
          hasConsumption: false
        };
      }

      dataByMinute[minutesSinceMidnight].mood = log.mood;
      dataByMinute[minutesSinceMidnight].energy = log.energy;
    });

    // Adiciona TODOS os consumos ao gráfico
    const selectedConsumptions = consumptions.filter(c => c.date === currentDate);
    selectedConsumptions.forEach(cons => {
      const minutesSinceMidnight = getMinutesFromMidnight(cons.timestamp);
      const timeStr = minutesToTimeStr(minutesSinceMidnight);

      if (!dataByMinute[minutesSinceMidnight]) {
        dataByMinute[minutesSinceMidnight] = {
          time: timeStr,
          minutesSinceMidnight,
          mood: null,
          energy: null,
          consumptionCount: 0,
          hasConsumption: false
        };
      }

      dataByMinute[minutesSinceMidnight].consumptionCount++;
      dataByMinute[minutesSinceMidnight].hasConsumption = true;
    });

    // Converte mapa em array ordenado
    const data = Object.values(dataByMinute).sort((a, b) => a.minutesSinceMidnight - b.minutesSinceMidnight);

    return data;
  }, [wellbeingLogs, consumptions, currentDate]);

  const minutesToTimeStr = (minutes) => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-800 border border-gray-300'}`}>
          <p className="font-semibold mb-1">{data?.time}</p>
          {payload.map((entry, idx) => (
            entry.value !== null && entry.name !== 'Consumos' && (
              <p key={idx} style={{ color: entry.color }}>
                {entry.name}: {entry.value}
              </p>
            )
          ))}
          {data?.hasConsumption && (
            <p className="mt-1 text-red-500 font-semibold">💊 {data.consumptionCount} consumo{data.consumptionCount !== 1 ? 's' : ''}</p>
          )}
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
    <div className={`rounded-lg p-3 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      {/* Header compacto */}
      <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
        <div className={'text-xs font-medium ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
          📈
        </div>
      </div>

      {/* SCATTER CHART */}
      <div className="w-full">
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ddd'} />
            <XAxis
              type="number"
              dataKey="minutesSinceMidnight"
              domain={[0, 1440]}
              ticks={[0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200, 1260, 1320, 1380]}
              tickFormatter={(minutes) => minutesToTimeStr(minutes)}
              tick={{ fontSize: 11, fill: darkMode ? '#999' : '#666' }}
              angle={-45}
              height={60}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              tick={{ fontSize: 12, fill: darkMode ? '#999' : '#666' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '0px', color: darkMode ? '#999' : '#666' }} />

            <Line
              type="linear"
              dataKey="mood"
              stroke="#3b82f6"
              name="Humor"
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.hasConsumption && !payload.mood) return null;
                return <circle cx={cx} cy={cy} r={7} fill="#3b82f6" />;
              }}
              strokeWidth={3}
              connectNulls={true}
              isAnimationActive={false}
            />

            <Line
              type="linear"
              dataKey="energy"
              stroke="#f59e0b"
              name="Energia"
              strokeDasharray="5 5"
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.hasConsumption && !payload.energy) return null;
                return <circle cx={cx} cy={cy} r={7} fill="#f59e0b" />;
              }}
              strokeWidth={3}
              connectNulls={true}
              isAnimationActive={false}
            />

            {/* Marcas de consumo no eixo X */}
            {chartData
              .filter(d => d.hasConsumption)
              .map((d, idx) => (
                <ReferenceLine
                  key={idx}
                  x={d.minutesSinceMidnight}
                  stroke="rgba(239, 68, 68, 0.2)"
                  strokeDasharray="2 2"
                  label={{ value: '💊', position: 'top', fill: '#ef4444', fontSize: 14 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WellbeingChart;
