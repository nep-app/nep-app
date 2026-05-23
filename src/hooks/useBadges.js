import { useMemo } from 'react';

export const useBadges = (consumptions, reflections, wellbeingLogs, cycles, goals, getGoalProgress) => {
  return useMemo(() => {
    return [];
  }, [consumptions, reflections, wellbeingLogs, cycles, goals, getGoalProgress]);
};
