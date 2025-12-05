import { useMemo } from 'react';
import { calculateCorrelation, analyzeSentiment } from '../utils/analytics';

export const useAnalysisCalculations = (data) => {
  return useMemo(() => {
    if (!data || data.length === 0) return null;

    const correlation = calculateCorrelation(
      data.map(d => d.mood),
      data.map(d => d.craving)
    );

    const sentiment = analyzeSentiment(data);

    return {
      correlation,
      sentiment,
      insight: correlation < -0.5
        ? "Forte correlação negativa: Melhor humor está associado a menor craving."
        : "Correlação fraca ou inexistente entre humor e craving."
    };
  }, [data]);
};
