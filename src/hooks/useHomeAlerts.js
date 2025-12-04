import { useMemo } from 'react';

export function useHomeAlerts(goals, metrics, cycles, dailyLogs) {
  return useMemo(() => {
    const alerts = [];

    // 1. META: Intervalo entre consumos (increase_interval)
    const intervalGoal = goals.find(g => g.type === 'increase_interval');
    if (metrics.lastInterval && intervalGoal) {
      const targetInterval = parseFloat(intervalGoal.target);
      if (metrics.lastInterval.hours < targetInterval) {
        alerts.push({
          text: `Intervalo curto! ${metrics.lastInterval.hours}h`,
          emoji: '⚠️',
          color: 'orange',
          type: 'negative'
        });
      } else {
        alerts.push({
          text: `Bom intervalo! ${metrics.lastInterval.hours}h`,
          emoji: '✨',
          color: 'green',
          type: 'positive'
        });
      }
    }

    // 2. META: Quantidade/Dosagem (reduce_quantity)
    const quantityGoal = goals.find(g => g.type === 'reduce_quantity');
    if (quantityGoal) {
      const cyclesWithMg = cycles
        .filter(c => c.mg !== undefined && c.mg !== null && c.mg !== '')
        .map(c => ({ source: 'cycle', mg: c.mg, timestamp: c.timestamp, date: c.date }));

      const dailyLogsWithMg = dailyLogs
        .filter(l => l.mg !== undefined && l.mg !== null && l.mg !== '')
        .map(l => ({ source: 'dailyLog', mg: l.mg, timestamp: l.timestamp, date: l.date }));

      const allWithMg = [...cyclesWithMg, ...dailyLogsWithMg]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const lastCycleWithMg = allWithMg[0];

      if (lastCycleWithMg && lastCycleWithMg.mg) {
        const targetMg = parseFloat(quantityGoal.target);
        const mgValue = typeof lastCycleWithMg.mg === 'number' ? lastCycleWithMg.mg : parseFloat(lastCycleWithMg.mg);

        // Tanto ciclos como registos diários referem-se ao ciclo que terminou
        // Por isso, mostrar "último ciclo" para ambos
        const dateLabel = 'último ciclo';

        if (mgValue >= targetMg) {
          alerts.push({
            text: `Atenção ao consumo ${dateLabel}! ${mgValue}mg`,
            emoji: '📊',
            color: 'orange',
            type: 'negative'
          });
        } else {
          alerts.push({
            text: `Boa! Consumo ${dateLabel}: ${mgValue}mg`,
            emoji: '💚',
            color: 'green',
            type: 'positive'
          });
        }
      }
    }

    // 3. META: Horas de sono (sleep_hours)
    const sleepGoal = goals.find(g => g.type === 'sleep_hours');
    if (sleepGoal && cycles.length > 0) {
      const lastCycleWithSleep = cycles
        .filter(c => c.sleep && !isNaN(parseFloat(c.sleep)))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      if (lastCycleWithSleep) {
        const sleepHours = parseFloat(lastCycleWithSleep.sleep);
        const targetSleep = parseFloat(sleepGoal.target);

        if (sleepHours >= targetSleep) {
          alerts.push({
            text: `Parabéns! ${sleepHours}h de sono`,
            emoji: '🌙',
            color: 'green',
            type: 'positive'
          });
        } else {
          alerts.push({
            text: `Atenção ao sono: ${sleepHours}h`,
            emoji: '😴',
            color: 'orange',
            type: 'negative'
          });
        }
      }
    }

    // 4. META: Hora de deitar (bedtime_before)
    const bedtimeGoal = goals.find(g => g.type === 'bedtime_before');
    if (bedtimeGoal && cycles.length > 0) {
      const lastCycle = cycles
        .filter(c => c.bedtime)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      if (lastCycle) {
        const targetStr = typeof bedtimeGoal.target === 'string' ? bedtimeGoal.target : String(bedtimeGoal.target).padStart(2, '0') + ':00';
        const bedtimeParts = lastCycle.bedtime.split(':');
        let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
        const bedtimeOriginalMinutes = bedtimeMinutes; // Guardar hora original (sem ajuste +24h)

        const targetParts = targetStr.split(':');
        let targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

        if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) bedtimeMinutes += 1440;
        if (targetMinutes >= 0 && targetMinutes < 360) targetMinutes += 1440;

        // Meta SÓ é cumprida se hora for entre 21:00-02:00
        const isHealthyBedtime = bedtimeOriginalMinutes >= 1260 || bedtimeOriginalMinutes <= 120; // 21:00-02:00

        if (bedtimeMinutes <= targetMinutes && isHealthyBedtime) {
          alerts.push({
            text: `Boa! Deitaste às ${lastCycle.bedtime}`,
            emoji: '💤',
            color: 'green',
            type: 'positive'
          });
        } else {
          alerts.push({
            text: `Atenção! Deitaste às ${lastCycle.bedtime}`,
            emoji: '🌃',
            color: 'orange',
            type: 'negative'
          });
        }
      }
    }

    // 5. META: Último consumo antes da 00h (limit_last)
    const limitLastGoal = goals.find(g => g.type === 'limit_last');
    if (limitLastGoal && cycles.length > 0) {
      const lastCycle = cycles
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      if (lastCycle && lastCycle.lastBefore00 !== undefined) {
        if (lastCycle.lastBefore00 === true) {
          alerts.push({
            text: `Boa! Último consumo antes da 00h`,
            emoji: '🌙',
            color: 'green',
            type: 'positive'
          });
        } else {
          alerts.push({
            text: `Cuidado! Último após 00h`,
            emoji: '⏰',
            color: 'orange',
            type: 'negative'
          });
        }
      }
    }

    // 6. META: Frequência diária (reduce_frequency)
    const frequencyGoal = goals.find(g => g.type === 'reduce_frequency');
    if (frequencyGoal) {
      const todayCount = metrics.todayConsumptions.length;
      const targetFrequency = parseInt(frequencyGoal.target);

      if (todayCount < targetFrequency) {
        alerts.push({
          text: `Boa! Só ${todayCount} ${todayCount === 1 ? 'consumo' : 'consumos'} hoje`,
          emoji: '🎯',
          color: 'green',
          type: 'positive'
        });
      } else if (todayCount >= targetFrequency) {
        alerts.push({
          text: `Atenção! Já ${todayCount} consumos hoje`,
          emoji: '⚠️',
          color: 'orange',
          type: 'negative'
        });
      }
    }

    return alerts;
  }, [goals, metrics, cycles, dailyLogs]);
}
