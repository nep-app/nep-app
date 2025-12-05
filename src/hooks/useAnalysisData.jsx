import { useState, useMemo } from 'react';
import { filterByDateRange } from '../services/analyticsService';

export const useAnalysisData = (rawData) => {
  const [dateRange, setDateRange] = useState('week'); // 'week', 'month', 'year'

  const filteredData = useMemo(() => {
    if (!rawData) return [];
    return filterByDateRange(rawData, dateRange);
  }, [rawData, dateRange]);

  return {
    dateRange,
    setDateRange,
    filteredData
  };
};
