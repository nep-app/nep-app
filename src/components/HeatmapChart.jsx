import React, { useMemo, useState } from 'react';

const HeatmapChart = ({ consumptions, wellbeingLogs, days = 90 }) => {
  const [view, setView] = useState('consumptions'); // 'consumptions' or 'wellbeing'
  const [hoveredDay, setHoveredDay] = useState(null);

  // Generate array of last N days
  const dateRange = useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push({
        date: dateStr,
        dayOfWeek: date.getDay(),
        dateObj: date
      });
    }
    return dates;
  }, [days]);

  // Calculate consumption intensity per day
  const consumptionData = useMemo(() => {
    const dataMap = {};

    consumptions.forEach(c => {
      if (!dataMap[c.date]) {
        dataMap[c.date] = { count: 0, items: [] };
      }
      dataMap[c.date].count++;
      dataMap[c.date].items.push(c);
    });

    return dataMap;
  }, [consumptions]);

  // Calculate average wellbeing per day
  const wellbeingData = useMemo(() => {
    const dataMap = {};

    wellbeingLogs.forEach(log => {
      if (!dataMap[log.date]) {
        dataMap[log.date] = { mood: [], energy: [], logs: [] };
      }
      if (log.mood) dataMap[log.date].mood.push(log.mood);
      if (log.energy) dataMap[log.date].energy.push(log.energy);
      dataMap[log.date].logs.push(log);
    });

    // Calculate averages
    Object.keys(dataMap).forEach(date => {
      const data = dataMap[date];
      data.avgMood = data.mood.length > 0
        ? data.mood.reduce((sum, v) => sum + v, 0) / data.mood.length
        : null;
      data.avgEnergy = data.energy.length > 0
        ? data.energy.reduce((sum, v) => sum + v, 0) / data.energy.length
        : null;
      data.avgWellbeing = (data.avgMood !== null && data.avgEnergy !== null)
        ? (data.avgMood + data.avgEnergy) / 2
        : data.avgMood || data.avgEnergy || null;
    });

    return dataMap;
  }, [wellbeingLogs]);

  // Get intensity color based on value
  const getConsumptionColor = (count) => {
    if (!count || count === 0) return '#1f2937';
    if (count >= 1 && count <= 3) return '#7c3aed40';
    if (count >= 4 && count <= 6) return '#7c3aed70';
    if (count >= 7 && count <= 9) return '#7c3aeda0';
    if (count >= 10) return '#7c3aed';
    return '#1f2937';
  };

  const getWellbeingColor = (score) => {
    if (!score) return '#1f2937';
    if (score <= 3) return '#dc2626';
    if (score <= 5) return '#f59e0b';
    if (score <= 7) return '#10b981';
    return '#059669';
  };

  // Group dates by week
  const weeks = useMemo(() => {
    const weekGroups = [];
    let currentWeek = [];

    dateRange.forEach((day, idx) => {
      // Start a new week on Sunday
      if (day.dayOfWeek === 0 && currentWeek.length > 0) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }

      // Add padding for first week
      if (idx === 0 && day.dayOfWeek !== 0) {
        for (let i = 0; i < day.dayOfWeek; i++) {
          currentWeek.push(null);
        }
      }

      currentWeek.push(day);

      // Push last week
      if (idx === dateRange.length - 1) {
        weekGroups.push(currentWeek);
      }
    });

    return weekGroups;
  }, [dateRange]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  };

  const getDayName = (dayOfWeek) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[dayOfWeek];
  };

  const cellSize = 14;
  const cellGap = 3;

  return (
    <div className="rounded-lg p-4 border bg-gray-800 border-gray-700">
      <div className="mb-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-200">
              📊 Heatmap - {view === 'consumptions' ? 'Consumos' : 'Bem-estar'}
            </h3>
            <p className="text-xs mt-1 text-gray-400">
              Visão geral dos últimos {days} dias. Passa o rato sobre os quadrados para ver detalhes.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('consumptions')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                view === 'consumptions'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              💊 Consumos
            </button>
            <button
              onClick={() => setView('wellbeing')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                view === 'wellbeing'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              😊 Bem-estar
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* Day labels */}
          <div className="flex mb-1">
            <div style={{ width: 30 }}></div>
            {[0, 1, 2, 3, 4, 5, 6].map(day => (
              <div
                key={day}
                className="text-xs font-medium text-gray-400"
                style={{
                  width: cellSize,
                  marginRight: cellGap,
                  textAlign: 'center'
                }}
              >
                {getDayName(day)[0]}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex items-center mb-1">
              {/* Week number label */}
              <div
                className="text-xs font-medium text-gray-500"
                style={{ width: 30, textAlign: 'right', paddingRight: 5 }}
              >
                {weekIdx === 0 || weekIdx === weeks.length - 1 ? `S${weekIdx + 1}` : ''}
              </div>

              {/* Days in week */}
              {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                const day = week[dayIdx];

                if (!day) {
                  return (
                    <div
                      key={dayIdx}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        marginRight: cellGap,
                      }}
                    />
                  );
                }

                const consumptionInfo = consumptionData[day.date];
                const wellbeingInfo = wellbeingData[day.date];

                const color = view === 'consumptions'
                  ? getConsumptionColor(consumptionInfo?.count || 0)
                  : getWellbeingColor(wellbeingInfo?.avgWellbeing || null);

                const isHovered = hoveredDay === day.date;

                return (
                  <div
                    key={dayIdx}
                    onMouseEnter={() => setHoveredDay(day.date)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="relative cursor-pointer transition-transform hover:scale-150"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      marginRight: cellGap,
                      backgroundColor: color,
                      borderRadius: 2,
                      border: isHovered ? '2px solid #fff' : 'none',
                      zIndex: isHovered ? 10 : 1,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div className="mt-4 p-3 rounded-lg bg-gray-700 border-gray-600 border">
          <div className="text-sm font-bold mb-2 text-gray-200">
            📅 {formatDate(hoveredDay)}
          </div>

          {view === 'consumptions' ? (
            <div>
              {consumptionData[hoveredDay] ? (
                <div className="space-y-1">
                  <div className="text-sm text-gray-300">
                    💊 <span className="font-bold text-purple-600">{consumptionData[hoveredDay].count}</span> consumo{consumptionData[hoveredDay].count !== 1 ? 's' : ''}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  Sem consumos registados
                </div>
              )}
            </div>
          ) : (
            <div>
              {wellbeingData[hoveredDay] ? (
                <div className="space-y-1">
                  {wellbeingData[hoveredDay].avgMood !== null && (
                    <div className="text-sm text-gray-300">
                      😊 Humor: <span className="font-bold text-blue-600">{wellbeingData[hoveredDay].avgMood.toFixed(1)}</span>
                    </div>
                  )}
                  {wellbeingData[hoveredDay].avgEnergy !== null && (
                    <div className="text-sm text-gray-300">
                      ⚡ Energia: <span className="font-bold text-yellow-600">{wellbeingData[hoveredDay].avgEnergy.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    {wellbeingData[hoveredDay].logs.length} registo{wellbeingData[hoveredDay].logs.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  Sem dados de bem-estar
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-3 border-t" style={{ borderColor: '#374151' }}>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {view === 'consumptions' ? 'Menos consumos' : 'Bem-estar baixo'}
          </div>
          <div className="flex gap-1">
            {[0, 2, 5, 8, 10].map(level => (
              <div
                key={level}
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: view === 'consumptions'
                    ? getConsumptionColor(level)
                    : getWellbeingColor(level === 0 ? null : level * 1),
                  borderRadius: 2,
                }}
              />
            ))}
          </div>
          <div className="text-xs text-gray-400">
            {view === 'consumptions' ? 'Mais consumos' : 'Bem-estar alto'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapChart;
