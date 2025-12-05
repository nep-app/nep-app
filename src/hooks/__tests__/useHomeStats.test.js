import { renderHook } from '@testing-library/react';
import { useHomeStats } from '../useHomeStats';
import { describe, it, expect } from 'vitest';

describe('useHomeStats', () => {
  it('should return null timeSince when metrics is null', () => {
    const metrics = { timeSinceLastConsumption: null, last7Days: {} };
    const cycles = [];
    const currentCycleCount = 0;
    const badges = [];

    const { result } = renderHook(() => useHomeStats(metrics, cycles, currentCycleCount, badges));
    expect(result.current.timeSince).toBeNull();
  });

  it('should return formatted timeSince when metrics exists', () => {
    const metrics = {
      timeSinceLastConsumption: { hours: 3, value: 3, unit: 'h' },
      last7Days: {}
    };
    const cycles = [];
    const currentCycleCount = 0;
    const badges = [];

    const { result } = renderHook(() => useHomeStats(metrics, cycles, currentCycleCount, badges));
    expect(result.current.timeSince).toEqual({
      hours: 3,
      value: 3,
      unit: 'h',
      isLong: true
    });
  });
});
