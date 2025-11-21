import { useMemo } from 'react';
import { calculateBadges } from '../utils/badgesCalculator';

export const useBadges = (consumptions, reflections, wellbeingLogs, cycles, goals, getGoalProgress) => {
  return useMemo(() => {
    return calculateBadges({
      consumptions,
      reflections,
      wellbeingLogs,
      cycles,
      goals,
      getGoalProgress
    });
  }, [consumptions, reflections, wellbeingLogs, cycles, goals, getGoalProgress]);
};
