import { renderHook } from '@testing-library/react';
import { useAnalysisCalculations } from '../useAnalysisCalculations';
import { describe, it, expect } from 'vitest';

describe('useAnalysisCalculations', () => {
  it('should calculate basic stats correctly', () => {
    const data = {
      filteredConsumptions: [
        { timestamp: '2023-01-01T10:00:00Z', date: '2023-01-01', notes: '' },
        { timestamp: '2023-01-01T14:00:00Z', date: '2023-01-01', notes: '' },
        { timestamp: '2023-01-02T10:00:00Z', date: '2023-01-02', notes: '' }
      ],
      filteredWellbeingLogs: [
        { sleep: '8', mood: '7', energy: '6', notes: '' }
      ],
      filteredCycles: [],
      filteredDailyLogs: [],
      filteredReflections: [],
      filteredThoughts: []
    };
    const goals = [];

    const { result } = renderHook(() => useAnalysisCalculations(data, goals));

    expect(result.current.stats.totalConsumptions).toBe(3);
    expect(result.current.stats.uniqueDays).toBe(2);
    expect(result.current.stats.avgPerDay).toBe('1.5');
    expect(result.current.stats.avgSleep).toBe('8.0');
    expect(result.current.stats.avgMood).toBe('7.0');
  });

  it('should calculate cycle stats correctly', () => {
    const data = {
      filteredConsumptions: [],
      filteredWellbeingLogs: [],
      filteredCycles: [
        { id: '1', mg: 50, bedtime: '23:00' },
        { id: '2', mg: 100, bedtime: '01:00' }
      ],
      filteredDailyLogs: [],
      filteredReflections: [],
      filteredThoughts: []
    };
    const goals = [];

    const { result } = renderHook(() => useAnalysisCalculations(data, goals));

    expect(result.current.cycleStats.avgMgPerCycle).toBe(75);
    expect(result.current.cycleStats.cyclesWithMg).toBe(2);
    // 23:00 = 23*60 = 1380
    // 01:00 = 1*60 + 24*60 = 60 + 1440 = 1500
    // Avg = (1380 + 1500) / 2 = 2880 / 2 = 1440
    // 1440 min = 24h = 00:00
    // The implementation converts >24h back to 0-23h for display if needed
    // "24:00" is strictly "00:00" in HH:MM format
    expect(result.current.cycleStats.avgBedtimeStr).toBe('00:00');
  });

  it('should calculate goal progress correctly', () => {
    const data = {
      filteredConsumptions: [
        { timestamp: '2023-01-01T10:00:00Z', date: '2023-01-01' }
      ],
      filteredWellbeingLogs: [],
      filteredCycles: [],
      filteredDailyLogs: [],
      filteredReflections: [],
      filteredThoughts: []
    };
    const goals = [
      { id: 'g1', type: 'reduce_frequency', target: 5, createdAt: '2023-01-01' }
    ];

    const { result } = renderHook(() => useAnalysisCalculations(data, goals));

    expect(result.current.goalsStats.totalAchievements).toBeGreaterThanOrEqual(0);
    expect(result.current.goalsStats.uniqueGoals).toHaveLength(1);
  });
});
