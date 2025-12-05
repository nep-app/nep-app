import { useMemo } from 'react';

export function useHomeStats(metrics, cycles, currentCycleCount, badges) {
  return useMemo(() => {
    // 1. Time Since Last Consumption
    const timeSinceMetric = metrics.timeSinceLastConsumption;
    let timeSince = null;

    if (timeSinceMetric) {
      const isLongTimeSince = timeSinceMetric.hours >= 2;
      timeSince = {
        ...timeSinceMetric,
        isLong: isLongTimeSince
      };
    }

    // 2. Current Cycle Stats
    // currentCycleCount is passed in

    // 3. Last 7 Days Stats
    const last7 = metrics.last7Days;

    return {
      timeSince,
      currentCycleCount,
      last7,
      badgesCount: badges.length
    };
  }, [metrics.timeSinceLastConsumption, metrics.last7Days, currentCycleCount, badges.length]);
}
