import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const WellbeingChart = ({ wellbeingLogs, consumptions, selectedCycle }) => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(null);

  const availableDates = useMemo(() => {
    if (wellbeingLogs.length === 0) return [];
    const dates = [...new Set(wellbeingLogs.map(log => log.date))].sort().reverse();
    return dates;
  }, [wellbeingLogs]);

  const currentDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    if (availableDates.length > 0) return availableDates[0];
    return null;
  }, [selectedDate, availableDates]);

  const getDayLabel = (date) => {
    if (!date || availableDates.length === 0) return '';
    const index = availableDates.indexOf(date);
    if (index === 0) return t('analyses.wbcToday');
    if (index === 1) return t('analyses.wbcYesterday');
    return t('analyses.wbcDaysAgo', { n: index });
  };

  const chartData = useMemo(() => {
    if (!currentDate) return [];

    const dataByMinute = {};

    const getMinutesFromMidnight = (timestamp) => {
      const date = new Date(timestamp);
      return date.getHours() * 60 + date.getMinutes();
    };

    const minutesToTimeStr = (minutes) => {
      const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
      const mins = (minutes % 60).toString().padStart(2, '0');
      return `${hours}:${mins}`;
    };

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

    return Object.values(dataByMinute).sort((a, b) => a.minutesSinceMidnight - b.minutesSinceMidnight);
  }, [wellbeingLogs, consumptions, currentDate]);

  const minutesToTimeStr = (minutes) => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  // Analysis returns a structured result, text generated in JSX
  const analysisResult = useMemo(() => {
    if (chartData.length === 0) return null;

    const moodData = chartData.filter(d => d.mood !== null);
    const energyData = chartData.filter(d => d.energy !== null);
    const consumptionData = chartData.filter(d => d.hasConsumption);

    if (moodData.length === 0 && energyData.length === 0) return null;

    if (consumptionData.length === 0) return { state: 'noConsumptions', type: 'neutral' };

    const allData = chartData.filter(d => d.mood !== null || d.energy !== null);
    if (allData.length < 2) return { state: 'insufficient', type: 'neutral' };

    const comparisons = [];
    consumptionData.forEach(cons => {
      const consTime = cons.minutesSinceMidnight;
      const beforeMood = moodData.filter(d => d.minutesSinceMidnight < consTime);
      const beforeEnergy = energyData.filter(d => d.minutesSinceMidnight < consTime);
      const afterMood = moodData.filter(d => d.minutesSinceMidnight > consTime);
      const afterEnergy = energyData.filter(d => d.minutesSinceMidnight > consTime);

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
      return { state: 'consumptionsLogged', count: consumptionData.length, type: 'neutral' };
    }

    const moodChanges = comparisons.filter(c => c.type === 'mood').map(c => c.change);
    const energyChanges = comparisons.filter(c => c.type === 'energy').map(c => c.change);

    const avgMoodChange = moodChanges.length > 0 ? moodChanges.reduce((s, v) => s + v, 0) / moodChanges.length : null;
    const avgEnergyChange = energyChanges.length > 0 ? energyChanges.reduce((s, v) => s + v, 0) / energyChanges.length : null;

    const moodDir = avgMoodChange === null ? null : avgMoodChange > 0.5 ? 'improves' : avgMoodChange < -0.5 ? 'worsens' : 'stable';
    const energyDir = avgEnergyChange === null ? null : avgEnergyChange > 0.5 ? 'increases' : avgEnergyChange < -0.5 ? 'decreases' : 'stable';

    if (!moodDir && !energyDir) return { state: 'insufficientAnalysis', type: 'neutral' };

    const type = (avgMoodChange && avgMoodChange < -0.5) || (avgEnergyChange && avgEnergyChange < -0.5) ? 'negative' :
                 (avgMoodChange && avgMoodChange > 0.5) || (avgEnergyChange && avgEnergyChange > 0.5) ? 'positive' : 'neutral';

    return { state: 'analysis', moodDir, energyDir, type };
  }, [chartData]);

  const getAnalysisText = () => {
    if (!analysisResult) return null;
    if (analysisResult.state === 'noConsumptions') return t('analyses.wbcNoConsumptions');
    if (analysisResult.state === 'insufficient') return t('analyses.wbcInsufficient');
    if (analysisResult.state === 'consumptionsLogged') return t('analyses.wbcLogged', { count: analysisResult.count });
    if (analysisResult.state === 'insufficientAnalysis') return t('analyses.wbcInsuffAnalysis');
    if (analysisResult.state === 'analysis') {
      const parts = [];
      if (analysisResult.moodDir === 'improves') parts.push(t('analyses.wbcMoodImproves'));
      else if (analysisResult.moodDir === 'worsens') parts.push(t('analyses.wbcMoodWorsens'));
      else if (analysisResult.moodDir === 'stable') parts.push(t('analyses.wbcMoodStable'));
      if (analysisResult.energyDir === 'increases') parts.push(t('analyses.wbcEnergyIncreases'));
      else if (analysisResult.energyDir === 'decreases') parts.push(t('analyses.wbcEnergyDecreases'));
      else if (analysisResult.energyDir === 'stable') parts.push(t('analyses.wbcEnergyStable'));
      return parts.join(', ') + '.';
    }
    return null;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="p-4 rounded-lg shadow-xl border-2 bg-gray-900 text-white border-gray-600">
          <p className="font-bold mb-3 text-base pb-2 border-b" style={{ borderColor: '#444' }}>
            🕐 {data?.time}
          </p>
          <div className="space-y-2 mt-2">
            {payload.map((entry, idx) => (
              entry.value !== null && entry.dataKey !== 'consumptionCount' && (
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
            <div className="mt-3 pt-2 border-t" style={{ borderColor: '#444' }}>
              <p className="text-red-500 font-bold text-sm flex items-center gap-2">
                💊 <span className="text-base">{t('analyses.wbcUse', { count: data.consumptionCount })}</span>
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
      <div className="p-4 rounded-lg bg-gray-700 text-gray-300">
        <p className="text-sm">{t('analyses.wbcNoData')}</p>
      </div>
    );
  }

  const analysisText = getAnalysisText();

  return (
    <div className="rounded-lg p-3 border bg-gray-700/50 border-gray-600">
      <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
        <div className="text-xs font-medium text-gray-400">
          {t('analyses.wbcTitle')}
        </div>
      </div>

      {analysisResult && analysisText && (
        <div className={`text-xs p-2 rounded-lg mb-2 ${
          analysisResult.type === 'negative' ? 'bg-red-900/20 text-red-400 border border-red-800' :
          analysisResult.type === 'positive' ? 'bg-green-900/20 text-green-400 border border-green-800' :
          'bg-gray-600/20 text-gray-300 border border-gray-600'
        }`}>
          <span className="font-medium">{t('analyses.wbcAnalysis')}</span> {analysisText}
        </div>
      )}

      <div className="w-full">
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 20, right: 5, bottom: 5, left: -5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              type="number"
              dataKey="minutesSinceMidnight"
              domain={[0, 1440]}
              ticks={[0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200, 1260, 1320, 1380]}
              tickFormatter={(minutes) => minutesToTimeStr(minutes)}
              tick={{ fontSize: 11, fill: '#999' }}
              angle={-45}
              height={60}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
              tick={{ fontSize: 14, fill: '#ccc', fontWeight: 600 }}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px', paddingBottom: '5px' }}
              iconSize={16}
              iconType="line"
              formatter={(value) => (
                <span style={{ color: '#ddd', fontSize: '14px', fontWeight: 600, marginLeft: '8px' }}>
                  {value}
                </span>
              )}
            />

            <Line
              type="linear"
              dataKey="mood"
              stroke="#3b82f6"
              name={t('analyses.wbcMoodLabel')}
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
              name={t('analyses.wbcEnergyLabel')}
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

            <Line
              dataKey="consumptionCount"
              stroke="rgba(239, 68, 68, 0)"
              strokeWidth={0}
              name={t('analyses.wbcConsLabel')}
              dot={false}
              legendType="circle"
              isAnimationActive={false}
            />

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
