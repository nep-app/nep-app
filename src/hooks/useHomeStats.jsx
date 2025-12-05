import { useMemo } from 'react';

export const useHomeStats = (data) => {
  return useMemo(() => {
    if (!data) return {
      streak: 0,
      mood: 0,
      craving: 0,
      trend: 'stable'
    };

    const today = new Date().toISOString().split('T')[0];
    const recentData = data.filter(d => d.date <= today).slice(-7);

    // Calculate streak
    let currentStreak = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].consumption === 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    const avgMood = recentData.reduce((acc, curr) => acc + curr.mood, 0) / (recentData.length || 1);
    const avgCraving = recentData.reduce((acc, curr) => acc + curr.craving, 0) / (recentData.length || 1);

    return {
      streak: currentStreak,
      mood: Math.round(avgMood * 10) / 10,
      craving: Math.round(avgCraving * 10) / 10,
      trend: avgMood > 5 ? 'improving' : 'declining'
    };
  }, [data]);
};
