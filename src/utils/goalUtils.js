
export const getGoalProgress = (goal, data) => {
  // Simplified implementation based on goal types
  if (!data || !goal) return 0;

  if (goal.type === 'reduce_frequency') {
    // Example logic
    return 50;
  }
  return 0;
};

export const getGoalAchievementCount = (goal, data) => {
  return 0;
};
