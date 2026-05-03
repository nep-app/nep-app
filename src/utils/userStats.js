import { db } from '../db/dexieDB';
import i18n from '../i18n';

/**
 * USER STATS - Sistema de estatísticas pré-calculadas
 *
 * PROBLEMA: Desencriptar 1000+ items demora 10+ segundos
 * SOLUÇÃO: Guardar stats pré-calculadas (NÃO-encriptadas) em metadata
 *
 * Stats guardadas:
 * - streak: dias consecutivos sem consumo
 * - lastConsumptionTime: timestamp do último consumo
 * - totalConsumptions: total de consumos
 * - last7DaysCount: consumos nos últimos 7 dias
 *
 * VANTAGEM: Boot INSTANTÂNEO mesmo com anos de dados!
 */

/**
 * Calcular streak (dias consecutivos sem consumo)
 * Recebe consumptions já desencriptados e ordenados
 */
// calculateStreak accepts any mix of items (consumptions, wellbeingLogs, thoughts, etc.)
export const calculateStreak = (allItems) => {
  if (!allItems || allItems.length === 0) return 0;

  // Extract unique date strings (YYYY-MM-DD), sorted desc
  const uniqueDates = [...new Set(allItems.map(item => {
    const raw = item.date || item.timestamp || item.createdAt;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d) ? null : d.toISOString().split('T')[0];
  }).filter(Boolean))].sort().reverse();

  if (uniqueDates.length === 0) return 0;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(now - 86400000).toISOString().split('T')[0];

  // Streak only active if most recent date is today or yesterday
  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0;

  let streak = 0;
  let expectedDate = uniqueDates[0];

  for (const date of uniqueDates) {
    if (date === expectedDate) {
      streak++;
      const d = new Date(expectedDate);
      d.setDate(d.getDate() - 1);
      expectedDate = d.toISOString().split('T')[0];
    } else {
      break; // gap found
    }
  }

  return streak;
};

/**
 * Atualizar stats do user (chamar após criar/editar/apagar consumo)
 * @param {Array} consumptions - Array de consumptions desencriptados
 * @param {Array} cycles - Array de cycles desencriptados (opcional - lê da DB se não passado)
 * @param {Array} dailyLogs - Array de dailyLogs desencriptados (opcional - lê da DB se não passado)
 * @param {Array} goals - Array de goals desencriptados (opcional - lê da DB se não passado)
 */
export const updateUserStats = async (consumptions, cycles = null, dailyLogs = null, goals = null, wellbeingLogs = null, thoughts = null, reflections = null) => {
  try {
    // Calcular streak com todas as fontes de atividade (independente de consumptions)
    const allActivityItems = [
      ...(consumptions || []),
      ...(dailyLogs || []),
      ...(wellbeingLogs || []),
      ...(thoughts || []),
      ...(reflections || []),
    ];
    const streak = calculateStreak(allActivityItems);

    if (!consumptions || consumptions.length === 0) {
      // Sem consumptions: guardar apenas streak (preservar valor correto)
      await db.metadata.put({ key: 'userStats', value: {
        streak,
        lastConsumptionTime: null,
        totalConsumptions: 0,
        last7DaysCount: 0,
        lastInterval: null,
        lastMg: null,
        timeSinceLastConsumption: null,
        goals: [],
        alerts: [],
        lastUpdated: new Date().toISOString()
      }});
      return;
    }

    // Se cycles/dailyLogs/goals não foram passados, usar dados do cache anterior (otimização)
    // Assim CRUD operations não precisam buscar tudo novamente
    const previousStats = await getUserStats();

    if (cycles === null) cycles = [];
    if (dailyLogs === null) dailyLogs = [];
    if (goals === null) goals = previousStats.goals || [];

    // Último consumo + intervalo
    const sorted = [...consumptions].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    const lastConsumption = sorted[0];
    const lastConsumptionTime = lastConsumption ? (lastConsumption.timestamp || lastConsumption.createdAt) : null;

    // Calcular último intervalo (horas entre últimos 2 consumos)
    let lastInterval = null;
    if (sorted.length >= 2) {
      const last = new Date(sorted[0].timestamp || sorted[0].createdAt);
      const secondLast = new Date(sorted[1].timestamp || sorted[1].createdAt);
      const diffMs = last - secondLast;
      const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
      lastInterval = parseFloat(hours);
    }

    // Último mg (de cycles ou dailyLogs)
    let lastMg = null;
    const cyclesWithMg = (cycles || [])
      .filter(c => c.mg !== undefined && c.mg !== null && c.mg !== '')
      .map(c => ({ mg: c.mg, timestamp: c.timestamp }));

    const dailyLogsWithMg = (dailyLogs || [])
      .filter(l => l.mg !== undefined && l.mg !== null && l.mg !== '')
      .map(l => ({ mg: l.mg, timestamp: l.timestamp }));

    const allWithMg = [...cyclesWithMg, ...dailyLogsWithMg]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (allWithMg.length > 0) {
      const mgValue = allWithMg[0].mg;
      lastMg = typeof mgValue === 'number' ? mgValue : parseFloat(mgValue);
    }

    // Consumos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7DaysCount = consumptions.filter(c => {
      const time = new Date(c.timestamp || c.createdAt).getTime();
      return time >= sevenDaysAgo.getTime();
    }).length;

    // Tempo desde último consumo (para badge "Sem consumir há")
    let timeSinceLastConsumption = null;
    if (lastConsumptionTime) {
      const last = new Date(lastConsumptionTime);
      const now = new Date();
      const diffMs = now - last;
      const hours = diffMs / (1000 * 60 * 60);

      if (hours < 1) {
        const minutes = Math.floor((diffMs / (1000 * 60)));
        timeSinceLastConsumption = { value: minutes, unit: 'min', hours: hours };
      } else if (hours < 24) {
        timeSinceLastConsumption = { value: parseFloat(hours.toFixed(1)), unit: 'h', hours: hours };
      } else {
        const days = Math.floor(hours / 24);
        const remainingHours = Math.floor(hours % 24);
        timeSinceLastConsumption = {
          value: days,
          unit: days === 1 ? 'dia' : 'dias',
          subValue: remainingHours,
          subUnit: 'h',
          hours: hours
        };
      }
    }

    // Guardar goals (apenas type e target - dados mínimos)
    const goalsSimple = (goals || []).map(g => ({
      type: g.type,
      target: g.target
    }));

    // PRÉ-CALCULAR AVISOS (para boot ultra-rápido!)
    const alerts = [];

    // Aviso 1: Intervalo (se existe meta increase_interval)
    const intervalGoal = (goals || []).find(g => g.type === 'increase_interval');
    if (lastInterval !== null && intervalGoal) {
      const targetInterval = parseFloat(intervalGoal.target);
      if (lastInterval < targetInterval) {
        alerts.push({
          text: i18n.t('alerts.shortInterval', { hours: lastInterval }),
          emoji: '⚠️',
          color: 'orange',
          type: 'negative'
        });
      } else {
        alerts.push({
          text: i18n.t('alerts.goodInterval', { hours: lastInterval }),
          emoji: '✨',
          color: 'green',
          type: 'positive'
        });
      }
    }

    // Aviso 2: Dosagem (se existe meta reduce_quantity)
    const quantityGoal = (goals || []).find(g => g.type === 'reduce_quantity');
    if (lastMg !== null && quantityGoal) {
      const targetMg = parseFloat(quantityGoal.target);
      if (lastMg >= targetMg) {
        alerts.push({
          text: i18n.t('alerts.watchDose', { mg: lastMg }),
          emoji: '📊',
          color: 'orange',
          type: 'negative'
        });
      } else {
        alerts.push({
          text: i18n.t('alerts.goodDose', { mg: lastMg }),
          emoji: '💚',
          color: 'green',
          type: 'positive'
        });
      }
    }

    // Aviso 3: Horas de sono (se existe meta sleep_hours)
    const sleepGoal = (goals || []).find(g => g.type === 'sleep_hours');
    if (sleepGoal && cycles && cycles.length > 0) {
      const lastCycleWithSleep = cycles
        .filter(c => c.sleep && !isNaN(parseFloat(c.sleep)))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      if (lastCycleWithSleep) {
        const sleepHours = parseFloat(lastCycleWithSleep.sleep);
        const targetSleep = parseFloat(sleepGoal.target);
        const maxHealthySleep = targetSleep + 2;

        if (sleepHours >= targetSleep && sleepHours <= maxHealthySleep) {
          alerts.push({
            text: i18n.t('alerts.goodSleep', { hours: sleepHours }),
            emoji: '🌙',
            color: 'green',
            type: 'positive'
          });
        } else if (sleepHours > maxHealthySleep) {
          alerts.push({
            text: i18n.t('alerts.excessiveSleep', { hours: sleepHours }),
            emoji: '😴',
            color: 'orange',
            type: 'warning'
          });
        } else {
          alerts.push({
            text: i18n.t('alerts.lowSleep', { hours: sleepHours }),
            emoji: '😴',
            color: 'orange',
            type: 'negative'
          });
        }
      }
    }

    // Aviso 4: Risco preditivo (sono <6h E humor <5)
    if (cycles && cycles.length > 0 && dailyLogs && dailyLogs.length > 0) {
      const lastCycleWithSleep = cycles
        .filter(c => c.sleep && !isNaN(parseFloat(c.sleep)))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      const lastWellbeingWithMood = dailyLogs
        .filter(l => l.mood && !isNaN(parseInt(l.mood)))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      if (lastCycleWithSleep && lastWellbeingWithMood) {
        const sleepHours = parseFloat(lastCycleWithSleep.sleep);
        const mood = parseInt(lastWellbeingWithMood.mood);

        if (sleepHours < 6 && mood < 5) {
          alerts.push({
            text: i18n.t('alerts.highRisk', { hours: sleepHours, mood }),
            emoji: '🔴',
            color: 'red',
            type: 'predictive',
            description: i18n.t('alerts.highRiskDesc')
          });
        } else if (sleepHours < 6 || mood < 5) {
          const factorKey = sleepHours < 6 ? 'alerts.moderateRiskSleep' : 'alerts.moderateRiskMood';
          const factorVal = sleepHours < 6 ? { hours: sleepHours } : { mood };
          alerts.push({
            text: i18n.t(factorKey, factorVal),
            emoji: '⚠️',
            color: 'orange',
            type: 'predictive',
            description: i18n.t('alerts.moderateRiskDesc')
          });
        }
      }
    }

    // Aviso 5: Hora de deitar (se existe meta bedtime_before)
    const bedtimeGoal = (goals || []).find(g => g.type === 'bedtime_before');
    if (bedtimeGoal && cycles && cycles.length > 0) {
      const lastCycle = cycles
        .filter(c => c.bedtime)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      if (lastCycle) {
        const targetStr = typeof bedtimeGoal.target === 'string' ? bedtimeGoal.target : String(bedtimeGoal.target).padStart(2, '0') + ':00';
        const bedtimeParts = lastCycle.bedtime.split(':');
        let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
        const bedtimeOriginalMinutes = bedtimeMinutes;

        const targetParts = targetStr.split(':');
        let targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

        if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) bedtimeMinutes += 1440;
        if (targetMinutes >= 0 && targetMinutes < 360) targetMinutes += 1440;

        const isHealthyBedtime = bedtimeOriginalMinutes >= 1260 || bedtimeOriginalMinutes <= 120;

        if (bedtimeMinutes <= targetMinutes && isHealthyBedtime) {
          alerts.push({
            text: i18n.t('alerts.goodBedtime', { time: lastCycle.bedtime }),
            emoji: '💤',
            color: 'green',
            type: 'positive'
          });
        } else {
          alerts.push({
            text: i18n.t('alerts.lateBedtime', { time: lastCycle.bedtime }),
            emoji: '🌃',
            color: 'orange',
            type: 'negative'
          });
        }
      }
    }

    // Aviso 6: Último consumo (meta limit_last — automático por timestamp)
    const limitLastGoal = (goals || []).find(g => g.type === 'limit_last');
    if (limitLastGoal && consumptions && consumptions.length > 0) {
      const targetStr = typeof limitLastGoal.target === 'string' ? limitLastGoal.target : '00:00';
      const [th, tm] = targetStr.split(':').map(Number);
      // 00:00 significa meia-noite = fim do dia = 1440 minutos
      const targetMinutes = (th === 0 && (tm || 0) === 0) ? 1440 : th * 60 + (tm || 0);

      // Usar data LOCAL (não UTC) para evitar bugs de timezone
      const localDateKey = (ts) => {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      };
      const now = new Date();
      const todayKey = localDateKey(now);

      const allByDay = {};
      consumptions.forEach(c => {
        const key = localDateKey(c.timestamp || c.createdAt);
        if (!allByDay[key]) allByDay[key] = [];
        allByDay[key].push(c);
      });

      const todayConsumptions = (allByDay[todayKey] || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Só avisar hoje se já consumiste DEPOIS do alvo (ciclo em aberto violado)
      if (todayConsumptions.length > 0) {
        const ld = new Date(todayConsumptions[0].timestamp);
        const lastMinutes = ld.getHours() * 60 + ld.getMinutes();
        if (lastMinutes >= targetMinutes) {
          const lastTimeStr = `${String(ld.getHours()).padStart(2,'0')}:${String(ld.getMinutes()).padStart(2,'0')}`;
          alerts.push({
            text: `Último consumo ${lastTimeStr} — meta: até ${targetStr}`,
            emoji: '⏰',
            color: 'orange',
            type: 'negative'
          });
          return;
        }
      }

      // Caso contrário: mostrar resultado do ciclo anterior (fechado)
      const previousKeys = Object.keys(allByDay).filter(k => k !== todayKey).sort().reverse();
      if (previousKeys.length > 0) {
        const prevConsumptions = allByDay[previousKeys[0]].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const prevLast = prevConsumptions[0];
        const ld = new Date(prevLast.timestamp);
        const lastMinutes = ld.getHours() * 60 + ld.getMinutes();
        const lastTimeStr = `${String(ld.getHours()).padStart(2,'0')}:${String(ld.getMinutes()).padStart(2,'0')}`;

        if (lastMinutes < targetMinutes) {
          alerts.push({
            text: `antes das ${targetStr} ✓`,
            emoji: '🌙',
            color: 'green',
            type: 'positive'
          });
        } else {
          alerts.push({
            text: `Último consumo ${lastTimeStr} — meta: até ${targetStr}`,
            emoji: '⏰',
            color: 'orange',
            type: 'negative'
          });
        }
      }
    }

    // Aviso 7: Frequência diária (se existe meta reduce_frequency)
    const frequencyGoal = (goals || []).find(g => g.type === 'reduce_frequency');
    if (frequencyGoal && consumptions && consumptions.length > 0) {
      // Calcular consumos de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayConsumptions = consumptions.filter(c => {
        const cDate = new Date(c.timestamp || c.createdAt);
        cDate.setHours(0, 0, 0, 0);
        return cDate.getTime() === today.getTime();
      });

      const todayCount = todayConsumptions.length;
      const targetFrequency = parseInt(frequencyGoal.target);

      if (todayCount < targetFrequency) {
        alerts.push({
          text: i18n.t('alerts.goodFrequency', { count: todayCount }),
          emoji: '🎯',
          color: 'green',
          type: 'positive'
        });
      } else if (todayCount >= targetFrequency) {
        alerts.push({
          text: i18n.t('alerts.highFrequency', { count: todayCount }),
          emoji: '⚠️',
          color: 'orange',
          type: 'negative'
        });
      }
    }

    // Aviso 8: Primeiro consumo após acordar (meta first_not_before)
    const firstNotBeforeGoal = (goals || []).find(g => g.type === 'first_not_before');
    if (firstNotBeforeGoal && consumptions && consumptions.length > 0 && cycles && cycles.length > 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayConsumptions = consumptions
        .filter(c => { const d = new Date(c.timestamp || c.createdAt); d.setHours(0,0,0,0); return d.getTime() === todayStart.getTime(); })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Ciclo mais recente com bedtime + sleep para calcular hora de acordar
      const lastCycleWithSleep = [...cycles]
        .filter(c => c.bedtime && c.sleep)
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))[0];

      if (todayConsumptions.length > 0 && lastCycleWithSleep) {
        const [bh, bm] = lastCycleWithSleep.bedtime.split(':').map(Number);
        let wakeupMinutes = bh * 60 + bm + parseFloat(lastCycleWithSleep.sleep) * 60;
        if (wakeupMinutes >= 1440) wakeupMinutes -= 1440;
        const targetMinutes = (wakeupMinutes + parseFloat(firstNotBeforeGoal.target) * 60) % 1440;

        // Ignorar consumos antes de acordar (pertencem ao ciclo anterior)
        const afterWakeup = todayConsumptions.filter(c => {
          const d = new Date(c.timestamp);
          const mins = d.getHours() * 60 + d.getMinutes();
          return mins >= wakeupMinutes;
        });

        if (afterWakeup.length === 0) {
          // Ainda sem consumo após acordar — não mostrar alerta
        } else {
          const first = afterWakeup[0];
          const fd = new Date(first.timestamp);
          const firstMinutes = fd.getHours() * 60 + fd.getMinutes();
          const firstTimeStr = `${String(fd.getHours()).padStart(2,'0')}:${String(fd.getMinutes()).padStart(2,'0')}`;
          const wakeupH = Math.floor(wakeupMinutes / 60);
          const wakeupM = wakeupMinutes % 60;
          const wakeupStr = `${String(wakeupH).padStart(2,'0')}:${String(wakeupM).padStart(2,'0')}`;

          if (firstMinutes < targetMinutes) {
            alerts.push({
              text: `1º consumo ${firstTimeStr} — meta: ${firstNotBeforeGoal.target}h após acordar`,
              emoji: '⏰',
              color: 'orange',
              type: 'negative'
            });
          } else {
            alerts.push({
              text: `${firstNotBeforeGoal.target}h após acordar ✓`,
              emoji: '☀️',
              color: 'green',
              type: 'positive'
            });
          }
        }
      }
    }

    // Guardar em metadata
    const stats = {
      streak,
      lastConsumptionTime,
      totalConsumptions: consumptions.length,
      last7DaysCount,
      lastInterval,
      lastMg,
      timeSinceLastConsumption, // ← Para badge "Sem consumir há"
      goals: goalsSimple,
      alerts, // ← PRÉ-CALCULADOS!
      lastUpdated: new Date().toISOString()
    };

    await db.metadata.put({ key: 'userStats', value: stats });

    console.log('[UserStats] ✅ Stats atualizadas:', stats);
    return stats;
  } catch (error) {
    console.error('[UserStats] Erro ao atualizar stats:', error);
    throw error;
  }
};

/**
 * Atualizar streak de utilização da app (chamar em cada abertura autenticada)
 * Conta dias consecutivos em que a app foi aberta, independentemente do que foi feito.
 */
export const updateAppUsageStreak = async () => {
  try {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const record = await db.metadata.get('appUsage');
    const data = record?.value || { lastOpenDate: null, appStreak: 0 };

    if (data.lastOpenDate === today) {
      // Já registado hoje — nada a fazer
      return data.appStreak;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const newStreak = data.lastOpenDate === yesterdayStr
      ? data.appStreak + 1  // Dia consecutivo
      : 1;                  // Streak quebrada (ou primeiro uso)

    await db.metadata.put({ key: 'appUsage', value: { lastOpenDate: today, appStreak: newStreak } });
    return newStreak;
  } catch (error) {
    console.error('[UserStats] Erro ao atualizar app usage streak:', error);
    return 0;
  }
};

/**
 * Ler streak de utilização da app (RÁPIDO - sem desencriptar!)
 */
export const getAppUsageStreak = async () => {
  try {
    const record = await db.metadata.get('appUsage');
    return record?.value?.appStreak || 0;
  } catch {
    return 0;
  }
};

/**
 * Ler stats do user (RÁPIDO - sem desencriptar!)
 */
export const getUserStats = async () => {
  try {
    const record = await db.metadata.get('userStats');
    if (!record) {
      return {
        streak: 0,
        lastConsumptionTime: null,
        totalConsumptions: 0,
        last7DaysCount: 0,
        lastInterval: null,
        lastMg: null,
        timeSinceLastConsumption: null,
        goals: [],
        alerts: [],
        lastUpdated: null
      };
    }
    return record.value;
  } catch (error) {
    console.error('[UserStats] Erro ao ler stats:', error);
    return {
      streak: 0,
      lastConsumptionTime: null,
      totalConsumptions: 0,
      last7DaysCount: 0,
      lastInterval: null,
      lastMg: null,
      timeSinceLastConsumption: null,
      goals: [],
      alerts: [],
      lastUpdated: null
    };
  }
};
