import { useState, useEffect } from 'react';
import { getGoalProgress, getGoalAchievementCount } from '../utils/goalUtils';

export const useHomeAlerts = (data, goals) => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!data || !goals) return;

    const newAlerts = [];
    const today = new Date().toISOString().split('T')[0];

    // Check for relapse risk (high craving patterns)
    const recentCravings = data
      .filter(d => d.date >= today && d.craving > 7)
      .length;

    if (recentCravings > 2) {
      newAlerts.push({
        id: 'relapse-risk',
        type: 'warning',
        title: 'Risco de Recaída',
        message: 'Detetado padrão de craving elevado. Considere contactar o seu suporte.'
      });
    }

    // Check goals
    goals.forEach(goal => {
      const progress = getGoalProgress(goal, data);
      if (progress >= 100) {
        newAlerts.push({
          id: `goal-${goal.id}`,
          type: 'success',
          title: 'Objetivo Alcançado!',
          message: `Parabéns! Atingiu o objetivo "${goal.title}".`
        });
      }
    });

    setAlerts(newAlerts);
  }, [data, goals]);

  return { alerts, dismissAlert: (id) => setAlerts(prev => prev.filter(a => a.id !== id)) };
};
