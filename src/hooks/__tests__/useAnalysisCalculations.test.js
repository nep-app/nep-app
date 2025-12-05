import { renderHook } from '@testing-library/react';
import { useAnalysisCalculations } from '../useAnalysisCalculations';
import { describe, it, expect } from 'vitest';

describe('useAnalysisCalculations', () => {
  it('returns null for empty data', () => {
    const { result } = renderHook(() => useAnalysisCalculations(null));
    expect(result.current).toBeNull();
  });

  it('calculates insights', () => {
    const mockData = [
      { mood: 1, craving: 9 },
      { mood: 2, craving: 8 }
    ];

    const { result } = renderHook(() => useAnalysisCalculations(mockData));

    expect(result.current).toHaveProperty('correlation');
    expect(result.current).toHaveProperty('insight');
  });
});
