import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safeToISODate } from '../utils/helpers';

const HeatmapChart = ({ consumptions, wellbeingLogs, days = 90 }) => {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState('consumptions');
  const [hoveredDay, setHoveredDay] = useState(null);

  const dateRange = useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = safeToISODate(date); // chave local (coerente com c.date)
      dates.push({ date: dateStr, dayOfWeek: date.getDay(), dateObj: date });
    }
    return dates;
  }, [days]);

  const consumptionData = useMemo(() => {
    const dataMap = {};
    consumptions.forEach(c => {
      if (!dataMap[c.date]) dataMap[c.date] = { count: 0, items: [] };
      dataMap[c.date].count++;
      dataMap[c.date].items.push(c);
    });
    return dataMap;
  }, [consumptions]);

  const wellbeingData = useMemo(() => {
    const dataMap = {};
    wellbeingLogs.forEach(log => {
      if (!dataMap[log.date]) dataMap[log.date] = { mood: [], energy: [], logs: [] };
      if (log.mood) dataMap[log.date].mood.push(log.mood);
      if (log.energy) dataMap[log.date].energy.push(log.energy);
      dataMap[log.date].logs.push(log);
    });
    Object.keys(dataMap).forEach(date => {
      const data = dataMap[date];
      data.avgMood = data.mood.length > 0 ? data.mood.reduce((s, v) => s + v, 0) / data.mood.length : null;
      data.avgEnergy = data.energy.length > 0 ? data.energy.reduce((s, v) => s + v, 0) / data.energy.length : null;
      data.avgWellbeing = (data.avgMood !== null && data.avgEnergy !== null)
        ? (data.avgMood + data.avgEnergy) / 2
        : data.avgMood || data.avgEnergy || null;
    });
    return dataMap;
  }, [wellbeingLogs]);

  const getConsumptionColor = (count) => {
    if (!count || count === 0) return '#1f2937';
    if (count <= 3) return '#7c3aed40';
    if (count <= 6) return '#7c3aed70';
    if (count <= 9) return '#7c3aeda0';
    return '#7c3aed';
  };

  const getWellbeingColor = (score) => {
    if (!score) return '#1f2937';
    if (score <= 3) return '#dc2626';
    if (score <= 5) return '#f59e0b';
    if (score <= 7) return '#10b981';
    return '#059669';
  };

  // Group dates by week column (Sunday-start), weeks flow left to right
  const weeks = useMemo(() => {
    const weekGroups = [];
    let currentWeek = new Array(7).fill(null);

    dateRange.forEach(day => {
      const dow = day.dayOfWeek; // 0=Sun
      currentWeek[dow] = day;
      if (dow === 6) {
        weekGroups.push(currentWeek);
        currentWeek = new Array(7).fill(null);
      }
    });
    // Push the last partial week
    if (currentWeek.some(d => d !== null)) {
      weekGroups.push(currentWeek);
    }
    return weekGroups;
  }, [dateRange]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  };

  const getDayName = (dayOfWeek) =>
    new Date(2024, 0, 7 + dayOfWeek).toLocaleDateString(i18n.language, { weekday: 'narrow' });

  // Cell size and gap — larger cells fill the width better
  const cellSize = 18;
  const cellGap = 3;

  // Day-of-week labels (Sun=0 through Sat=6), show alternate rows to save space
  const DOW_LABELS = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="rounded-lg p-4 border bg-gray-800 border-gray-700">
      <div className="mb-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold text-gray-200">
            {view === 'consumptions' ? t('patterns.heatmap.titleConsumptions') : t('patterns.heatmap.titleWellbeing')}
          </h3>
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">
              {t('patterns.heatmap.desc', { days })}
            </p>
            <div className="flex gap-2 flex-shrink-0 ml-2">
              <button
                onClick={() => setView('consumptions')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  view === 'consumptions' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {t('patterns.heatmap.btnConsumptions')}
              </button>
              <button
                onClick={() => setView('wellbeing')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  view === 'wellbeing' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {t('patterns.heatmap.btnWellbeing')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid — weeks as columns, days-of-week as rows */}
      <div className="overflow-x-auto pb-2">
        <div className="flex" style={{ gap: cellGap }}>
          {/* Day-of-week labels column */}
          <div className="flex flex-col flex-shrink-0" style={{ gap: cellGap, width: 18 }}>
            {/* Empty space above for alignment */}
            <div style={{ height: cellSize }} />
            {DOW_LABELS.map(dow => (
              <div
                key={dow}
                className="text-xs text-gray-500 flex items-center justify-end"
                style={{ height: cellSize, fontSize: 10 }}
              >
                {dow % 2 === 1 ? getDayName(dow) : ''}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col flex-shrink-0" style={{ gap: cellGap }}>
              {/* Month label on top of first week of month */}
              {(() => {
                const firstDay = week.find(d => d !== null);
                const isFirstWeek = weekIdx === 0;
                const isNewMonth = firstDay && (weekIdx === 0 || !weeks[weekIdx - 1].find(d => d && d.date.slice(0, 7) === firstDay.date.slice(0, 7)));
                if (isNewMonth && firstDay) {
                  const date = new Date(firstDay.date + 'T12:00:00');
                  return (
                    <div
                      className="text-xs text-gray-500"
                      style={{ height: cellSize, fontSize: 10, lineHeight: cellSize + 'px', overflow: 'hidden', whiteSpace: 'nowrap' }}
                    >
                      {date.toLocaleDateString(i18n.language, { month: 'short' })}
                    </div>
                  );
                }
                return <div style={{ height: cellSize }} />;
              })()}

              {/* 7 day cells for this week */}
              {DOW_LABELS.map(dow => {
                const day = week[dow];
                if (!day) {
                  return <div key={dow} style={{ width: cellSize, height: cellSize, borderRadius: 3 }} />;
                }

                const consumptionInfo = consumptionData[day.date];
                const wellbeingInfo = wellbeingData[day.date];
                const hasData = view === 'consumptions' ? !!consumptionInfo : !!wellbeingInfo;
                const color = view === 'consumptions'
                  ? getConsumptionColor(consumptionInfo?.count || 0)
                  : getWellbeingColor(wellbeingInfo?.avgWellbeing || null);
                const isHovered = hoveredDay === day.date;

                return (
                  <div
                    key={dow}
                    role="button"
                    tabIndex={0}
                    aria-label={formatDate(day.date)}
                    onClick={() => setHoveredDay(isHovered ? null : day.date)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHoveredDay(isHovered ? null : day.date); } }}
                    onMouseEnter={() => setHoveredDay(day.date)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="cursor-pointer transition-transform hover:scale-125 focus:outline-none focus:scale-125"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: color,
                      borderRadius: 3,
                      // dias sem dados ficam com um contorno subtil, para a grelha
                      // ser sempre visível (mesmo quando há poucos registos).
                      border: isHovered ? '2px solid #fff' : (hasData ? 'none' : '1px solid #374151'),
                      zIndex: isHovered ? 10 : 1,
                      position: 'relative',
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
                <div className="text-sm text-gray-300">
                  💊 <span className="font-bold text-purple-400">{consumptionData[hoveredDay].count}</span>{' '}
                  {consumptionData[hoveredDay].count === 1
                    ? t('patterns.heatmap.consumptionCount', { count: '' }).trim()
                    : t('patterns.heatmap.consumptionCountPlural', { count: '' }).trim()}
                </div>
              ) : (
                <div className="text-sm text-gray-400">{t('patterns.heatmap.noConsumptions')}</div>
              )}
            </div>
          ) : (
            <div>
              {wellbeingData[hoveredDay] ? (
                <div className="space-y-1">
                  {wellbeingData[hoveredDay].avgMood !== null && (
                    <div className="text-sm text-gray-300">
                      😊 {t('patterns.heatmap.mood')}: <span className="font-bold text-blue-400">{wellbeingData[hoveredDay].avgMood.toFixed(1)}</span>
                    </div>
                  )}
                  {wellbeingData[hoveredDay].avgEnergy !== null && (
                    <div className="text-sm text-gray-300">
                      ⚡ {t('patterns.heatmap.energy')}: <span className="font-bold text-yellow-400">{wellbeingData[hoveredDay].avgEnergy.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    {wellbeingData[hoveredDay].logs.length === 1
                      ? t('patterns.heatmap.recordCount', { count: wellbeingData[hoveredDay].logs.length })
                      : t('patterns.heatmap.recordCountPlural', { count: wellbeingData[hoveredDay].logs.length })}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">{t('patterns.heatmap.noWellbeing')}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {view === 'consumptions' ? t('patterns.heatmap.lessConsumptions') : t('patterns.heatmap.lowWellbeing')}
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
                    : getWellbeingColor(level === 0 ? null : level),
                  borderRadius: 2,
                }}
              />
            ))}
          </div>
          <div className="text-xs text-gray-400">
            {view === 'consumptions' ? t('patterns.heatmap.moreConsumptions') : t('patterns.heatmap.highWellbeing')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapChart;
