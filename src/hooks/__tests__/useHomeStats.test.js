import { renderHook } from '@testing-library/react';
import { useHomeStats } from '../useHomeStats';
import { describe, it, expect } from 'vitest';

describe('useHomeStats', () => {
  it('returns default stats for empty data', () => {
    const { result } = renderHook(() => useHomeStats(null));
    expect(result.current).toEqual({
      streak: 0,
      mood: 0,
      craving: 0,
      trend: 'stable'
    });
  });

  it('calculates stats correctly', () => {
    const mockData = [
      { date: '2023-10-01', mood: 8, craving: 2, consumption: 0 },
      { date: '2023-10-02', mood: 6, craving: 4, consumption: 0 }
    ];

    const { result } = renderHook(() => useHomeStats(mockData));

    // Streak logic might depend on "today", so exact value varies,
    // but mood should be average.
    expect(result.current.mood).toBe(7); // (8+6)/2
    expect(result.current.craving).toBe(3); // (2+4)/2
  });
});
