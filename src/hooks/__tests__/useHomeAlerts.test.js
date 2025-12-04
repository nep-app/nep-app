import { renderHook } from '@testing-library/react';
import { useHomeAlerts } from '../useHomeAlerts';
import { describe, it, expect } from 'vitest';

describe('useHomeAlerts', () => {
  it('should return no alerts when there are no goals', () => {
    const goals = [];
    const metrics = {};
    const cycles = [];
    const dailyLogs = [];

    const { result } = renderHook(() => useHomeAlerts(goals, metrics, cycles, dailyLogs));
    expect(result.current).toEqual([]);
  });

  it('should return positive alert for interval goal met', () => {
    const goals = [{ type: 'increase_interval', target: '2' }];
    const metrics = { lastInterval: { hours: 3 } };
    const cycles = [];
    const dailyLogs = [];

    const { result } = renderHook(() => useHomeAlerts(goals, metrics, cycles, dailyLogs));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].type).toBe('positive');
    expect(result.current[0].text).toContain('Bom intervalo');
  });

  it('should return negative alert for interval goal not met', () => {
    const goals = [{ type: 'increase_interval', target: '4' }];
    const metrics = { lastInterval: { hours: 2 } };
    const cycles = [];
    const dailyLogs = [];

    const { result } = renderHook(() => useHomeAlerts(goals, metrics, cycles, dailyLogs));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].type).toBe('negative');
    expect(result.current[0].text).toContain('Intervalo curto');
  });

  it('should return alert for frequency goal', () => {
    const goals = [{ type: 'reduce_frequency', target: '3' }];
    const metrics = { todayConsumptions: [{}, {}, {}, {}] }; // 4 consumptions
    const cycles = [];
    const dailyLogs = [];

    const { result } = renderHook(() => useHomeAlerts(goals, metrics, cycles, dailyLogs));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].type).toBe('negative');
    expect(result.current[0].text).toContain('Atenção! Já 4 consumos hoje');
  });
});
