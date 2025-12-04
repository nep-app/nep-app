import { useMemo } from 'react';
import * as analyticsService from '../services/analyticsService';

const { getDateRangeForPeriod, filterByDateRange } = analyticsService;

export function useAnalysisData(period, periodOffset, data) {
  return useMemo(() => {
    const { consumptions, wellbeingLogs, cycles, dailyLogs, reflections, thoughts } = data;

    // Calculate date range based on period and offset
    const dateRange = getDateRangeForPeriod(period, periodOffset);

    // Filter all data collections by this date range
    const filteredConsumptions = filterByDateRange(consumptions, dateRange);
    const filteredWellbeingLogs = filterByDateRange(wellbeingLogs, dateRange);
    const filteredCycles = filterByDateRange(cycles, dateRange);
    const filteredDailyLogs = filterByDateRange(dailyLogs, dateRange);
    const filteredReflections = filterByDateRange(reflections, dateRange);
    const filteredThoughts = filterByDateRange(thoughts, dateRange);

    return {
      dateRange,
      filteredConsumptions,
      filteredWellbeingLogs,
      filteredCycles,
      filteredDailyLogs,
      filteredReflections,
      filteredThoughts
    };
  }, [period, periodOffset, data]);
}
