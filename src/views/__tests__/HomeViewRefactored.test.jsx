import React from 'react';
import { render, screen } from '@testing-library/react';
import { HomeViewRefactored } from '../HomeViewRefactored';
import { describe, it, expect, vi } from 'vitest';

// Mock contexts
vi.mock('../../contexts/DataContext', () => ({
  useData: () => ({
    consumptions: [],
    goals: [],
    cycles: [],
    dailyLogs: []
  })
}));

vi.mock('../../contexts/MetricsContext', () => ({
  useMetrics: () => ({
    timeSinceLastConsumption: { hours: 5, value: 5, unit: 'h' },
    todayConsumptions: [],
    last7Days: { avgTimes: 2, avgMg: 50 } // Added missing mock data
  })
}));

vi.mock('../../contexts/UIContext', () => ({
  useUI: () => ({
    darkMode: false,
    setShowThoughtsModal: vi.fn(),
    setShowGoalModal: vi.fn(),
    setShowWellbeingModal: vi.fn(),
    setShowReflectionModal: vi.fn(),
    setShowCycleModal: vi.fn()
  })
}));

describe('HomeViewRefactored', () => {
  it('renders motivational card', () => {
    const props = {
      currentReflection: 'Stay strong!',
      markConsumption: vi.fn(),
      openEditConsumption: vi.fn(),
      deleteItem: vi.fn(),
      last7: { avgTimes: 2, avgMg: 50 },
      copingStrategies: ['Breath', 'Drink water'],
      badges: [],
      currentCycleCount: 1,
      consumptionsToShow: 5,
      setConsumptionsToShow: vi.fn()
    };

    render(<HomeViewRefactored {...props} />);
    expect(screen.getByText('Stay strong!')).toBeInTheDocument();
  });

  it('renders coping strategies', () => {
    const props = {
      currentReflection: 'Stay strong!',
      markConsumption: vi.fn(),
      openEditConsumption: vi.fn(),
      deleteItem: vi.fn(),
      last7: { avgTimes: 2, avgMg: 50 },
      copingStrategies: ['Breathe deeply', 'Call a friend'],
      badges: [],
      currentCycleCount: 1,
      consumptionsToShow: 5,
      setConsumptionsToShow: vi.fn()
    };

    render(<HomeViewRefactored {...props} />);
    expect(screen.getByText('Breathe deeply')).toBeInTheDocument();
    expect(screen.getByText('Call a friend')).toBeInTheDocument();
  });
});
