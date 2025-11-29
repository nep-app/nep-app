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
        <div className={`p-4 rounded-lg shadow-xl border-2 ${darkMode ? 'bg-gray-900 text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}>
          <p className="font-bold mb-3 text-base pb-2 border-b" style={{ borderColor: darkMode ? '#444' : '#ddd' }}>
            🕐 {data?.time}
          </p>
          <div className="space-y-2 mt-2">
            {payload.map((entry, idx) => (
              entry.value !== null && entry.name !== 'Consumos' && (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <span className="font-medium text-sm">{entry.name}:</span>
                  <span className="font-bold text-lg px-2 py-1 rounded" style={{
                    color: entry.color,
                    backgroundColor: `${entry.color}20`
                  }}>
                    {entry.value}
                  </span>
                </div>
              )
            ))}
          </div>
          {data?.hasConsumption && (
            <div className="mt-3 pt-2 border-t" style={{ borderColor: darkMode ? '#444' : '#ddd' }}>
              <p className="text-red-500 font-bold text-sm flex items-center gap-2">
                💊 <span className="text-base">{data.consumptionCount}</span> consumo{data.consumptionCount !== 1 ? 's' : ''}
              </p>
            </div>
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

  // Análise do impacto do consumo no humor/energia
  const analysis = useMemo(() => {
    if (chartData.length === 0) return null;

    const moodData = chartData.filter(d => d.mood !== null);
    const energyData = chartData.filter(d => d.energy !== null);
    const consumptionData = chartData.filter(d => d.hasConsumption);

    if (moodData.length === 0 && energyData.length === 0) return null;
    if (consumptionData.length === 0) {
      return {
        text: 'Sem consumos registados neste dia para analisar impacto.',
        type: 'neutral'
      };
    }

    // Opção 3: Analisar janelas de tempo (30-60min) antes e depois de cada consumo
    const WINDOW_BEFORE = 60; // minutos antes do consumo
    const WINDOW_AFTER = 60;  // minutos depois do consumo

    if (consumptionData.length === 0) {
      return {
        text: 'Sem consumos registados para análise.',
        type: 'neutral'
      };
    }

    const allData = chartData.filter(d => d.mood !== null || d.energy !== null);
    if (allData.length < 2) {
      return {
        text: 'Dados insuficientes para analisar impacto (pelo menos 2 registos necessários).',
        type: 'neutral'
      };
    }

    // Para cada consumo, encontrar bem-estar antes e depois
    const comparisons = [];
    let totalBeforeData = 0;
    let totalAfterData = 0;
    let consumptionsWithBefore = 0;
    let consumptionsWithAfter = 0;
    let consumptionsWithBoth = 0;

    consumptionData.forEach(cons => {
      const consTime = cons.minutesSinceMidnight;

      // Bem-estar ANTES (30-60min antes)
      const beforeMood = moodData.filter(d =>
        d.minutesSinceMidnight >= consTime - WINDOW_BEFORE &&
        d.minutesSinceMidnight < consTime - 30
      );
      const beforeEnergy = energyData.filter(d =>
        d.minutesSinceMidnight >= consTime - WINDOW_BEFORE &&
        d.minutesSinceMidnight < consTime - 30
      );

      // Bem-estar DEPOIS (30-60min depois)
      const afterMood = moodData.filter(d =>
        d.minutesSinceMidnight > consTime + 30 &&
        d.minutesSinceMidnight <= consTime + WINDOW_AFTER
      );
      const afterEnergy = energyData.filter(d =>
        d.minutesSinceMidnight > consTime + 30 &&
        d.minutesSinceMidnight <= consTime + WINDOW_AFTER
      );

      const hasBefore = beforeMood.length > 0 || beforeEnergy.length > 0;
      const hasAfter = afterMood.length > 0 || afterEnergy.length > 0;

      if (hasBefore) consumptionsWithBefore++;
      if (hasAfter) consumptionsWithAfter++;
      if (hasBefore && hasAfter) consumptionsWithBoth++;

      totalBeforeData += beforeMood.length + beforeEnergy.length;
      totalAfterData += afterMood.length + afterEnergy.length;

      // Calcular médias se houver dados
      if (beforeMood.length > 0 && afterMood.length > 0) {
        const avgBefore = beforeMood.reduce((sum, d) => sum + d.mood, 0) / beforeMood.length;
        const avgAfter = afterMood.reduce((sum, d) => sum + d.mood, 0) / afterMood.length;
        comparisons.push({ type: 'mood', change: avgAfter - avgBefore });
      }

      if (beforeEnergy.length > 0 && afterEnergy.length > 0) {
        const avgBefore = beforeEnergy.reduce((sum, d) => sum + d.energy, 0) / beforeEnergy.length;
        const avgAfter = afterEnergy.reduce((sum, d) => sum + d.energy, 0) / afterEnergy.length;
        comparisons.push({ type: 'energy', change: avgAfter - avgBefore });
      }
    });

    if (comparisons.length === 0) {
      // Verificar se há dados de bem-estar no geral
      if (moodData.length === 0 && energyData.length === 0) {
        return {
          text: 'Sem dados de bem-estar registados neste dia.',
          type: 'neutral'
        };
      }

      // Há dados de bem-estar, mas não nas janelas específicas
      if (totalBeforeData === 0 && totalAfterData === 0) {
        return {
          text: `Analisados ${consumptionData.length} consumo${consumptionData.length !== 1 ? 's' : ''}: registe bem-estar 30-60min antes e depois para ver impacto.`,
          type: 'neutral'
        };
      } else if (totalBeforeData === 0) {
        return {
          text: `${consumptionsWithAfter} de ${consumptionData.length} consumo${consumptionData.length !== 1 ? 's' : ''} têm dados depois. Registe também 30-60min ANTES para comparar.`,
          type: 'neutral'
        };
      } else if (totalAfterData === 0) {
        return {
          text: `${consumptionsWithBefore} de ${consumptionData.length} consumo${consumptionData.length !== 1 ? 's' : ''} têm dados antes. Registe também 30-60min DEPOIS para comparar.`,
          type: 'neutral'
        };
      } else {
        // Há dados antes e depois, mas não nas janelas temporais ideais
        // Fazer análise alternativa usando TODOS os dados do dia (não apenas nas janelas de 30-60 min)
        const altComparisons = [];

        consumptionData.forEach(cons => {
          const consTime = cons.minutesSinceMidnight;

          // Pegar TODOS os dados ANTES do consumo
          const allBeforeMood = moodData.filter(d => d.minutesSinceMidnight < consTime);
          const allBeforeEnergy = energyData.filter(d => d.minutesSinceMidnight < consTime);

          // Pegar TODOS os dados DEPOIS do consumo
          const allAfterMood = moodData.filter(d => d.minutesSinceMidnight > consTime);
          const allAfterEnergy = energyData.filter(d => d.minutesSinceMidnight > consTime);

          // Calcular médias se houver dados
          if (allBeforeMood.length > 0 && allAfterMood.length > 0) {
            const avgBefore = allBeforeMood.reduce((sum, d) => sum + d.mood, 0) / allBeforeMood.length;
            const avgAfter = allAfterMood.reduce((sum, d) => sum + d.mood, 0) / allAfterMood.length;
            altComparisons.push({ type: 'mood', change: avgAfter - avgBefore });
          }

          if (allBeforeEnergy.length > 0 && allAfterEnergy.length > 0) {
            const avgBefore = allBeforeEnergy.reduce((sum, d) => sum + d.energy, 0) / allBeforeEnergy.length;
            const avgAfter = allAfterEnergy.reduce((sum, d) => sum + d.energy, 0) / allAfterEnergy.length;
            altComparisons.push({ type: 'energy', change: avgAfter - avgBefore });
          }
        });

        if (altComparisons.length > 0) {
          // Usar as comparações alternativas para gerar texto
          const altMoodChanges = altComparisons.filter(c => c.type === 'mood').map(c => c.change);
          const altEnergyChanges = altComparisons.filter(c => c.type === 'energy').map(c => c.change);

          const avgMoodChange = altMoodChanges.length > 0
            ? altMoodChanges.reduce((sum, v) => sum + v, 0) / altMoodChanges.length
            : null;
          const avgEnergyChange = altEnergyChanges.length > 0
            ? altEnergyChanges.reduce((sum, v) => sum + v, 0) / altEnergyChanges.length
            : null;

          const parts = [];

          if (avgMoodChange !== null) {
            if (avgMoodChange > 0.5) parts.push('humor tende a melhorar após consumo');
            else if (avgMoodChange < -0.5) parts.push('humor tende a piorar após consumo');
            else parts.push('humor mantém-se estável após consumo');
          }

          if (avgEnergyChange !== null) {
            if (avgEnergyChange > 0.5) parts.push('energia tende a aumentar após consumo');
            else if (avgEnergyChange < -0.5) parts.push('energia tende a diminuir após consumo');
            else parts.push('energia mantém-se estável após consumo');
          }

          const type = avgMoodChange !== null || avgEnergyChange !== null
            ? (avgMoodChange < -0.5 || avgEnergyChange < -0.5 ? 'warning' : avgMoodChange > 0.5 || avgEnergyChange > 0.5 ? 'success' : 'neutral')
            : 'neutral';

          return {
            text: `Análise geral: ${parts.join('; ')}. (Dados fora das janelas ideais de 30-60min)`,
            type
          };
        } else {
          // Se mesmo a análise alternativa não funcionou
          return {
            text: `${consumptionData.length} consumo${consumptionData.length !== 1 ? 's' : ''} registado${consumptionData.length !== 1 ? 's' : ''}. Registe bem-estar antes E depois para análise de impacto.`,
            type: 'neutral'
          };
        }
      }
    }

    // Agregar mudanças por tipo
    const moodChanges = comparisons.filter(c => c.type === 'mood').map(c => c.change);
    const energyChanges = comparisons.filter(c => c.type === 'energy').map(c => c.change);

    const avgMoodChange = moodChanges.length > 0
      ? moodChanges.reduce((sum, v) => sum + v, 0) / moodChanges.length
      : null;
    const avgEnergyChange = energyChanges.length > 0
      ? energyChanges.reduce((sum, v) => sum + v, 0) / energyChanges.length
      : null;

    // Gerar texto explicativo
    const parts = [];

    if (avgMoodChange !== null) {
      if (avgMoodChange > 0.5) parts.push('humor tende a melhorar após consumo');
      else if (avgMoodChange < -0.5) parts.push('humor tende a piorar após consumo');
      else parts.push('humor mantém-se estável após consumo');
    }

    if (avgEnergyChange !== null) {
      if (avgEnergyChange > 0.5) parts.push('energia tende a aumentar após consumo');
      else if (avgEnergyChange < -0.5) parts.push('energia tende a diminuir após consumo');
      else parts.push('energia mantém-se estável após consumo');
    }

    if (parts.length === 0) {
      return {
        text: 'Dados insuficientes para análise.',
        type: 'neutral'
      };
    }

    const type = (avgMoodChange && avgMoodChange < -0.5) || (avgEnergyChange && avgEnergyChange < -0.5) ? 'negative' :
                 (avgMoodChange && avgMoodChange > 0.5) || (avgEnergyChange && avgEnergyChange > 0.5) ? 'positive' : 'neutral';

    return {
      text: parts.join(', ') + '.',
      type
    };
  }, [chartData]);

  return (
    <div className={`rounded-lg p-3 border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      {/* Header compacto */}
      <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
        <div className={'text-xs font-medium ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
          📈 Impacto do Consumo no Humor/Energia
        </div>
      </div>

      {/* Análise */}
      {analysis && (
        <div className={`text-xs p-2 rounded-lg mb-2 ${
          analysis.type === 'negative' ? (darkMode ? 'bg-red-900/20 text-red-400 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200') :
          analysis.type === 'positive' ? (darkMode ? 'bg-green-900/20 text-green-400 border border-green-800' : 'bg-green-50 text-green-700 border border-green-200') :
          (darkMode ? 'bg-gray-600/20 text-gray-300 border border-gray-600' : 'bg-gray-100 text-gray-600 border border-gray-300')
        }`}>
          <span className="font-medium">💡 Análise:</span> {analysis.text}
        </div>
      )}

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
              tick={{ fontSize: 14, fill: darkMode ? '#ccc' : '#444', fontWeight: 600 }}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '10px',
                paddingBottom: '5px'
              }}
              iconSize={16}
              iconType="line"
              formatter={(value, entry) => (
                <span style={{
                  color: darkMode ? '#ddd' : '#333',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginLeft: '8px'
                }}>
                  {value}
                </span>
              )}
            />

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

            {/* Linha invisível só para mostrar consumos na legenda */}
            <Line
              dataKey="consumptionCount"
              stroke="rgba(239, 68, 68, 0)"
              strokeWidth={0}
              name="💊 Consumos"
              dot={false}
              legendType="circle"
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
