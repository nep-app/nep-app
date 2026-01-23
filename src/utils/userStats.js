import { db } from '../db/dexieDB';

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
export const calculateStreak = (consumptions) => {
  if (!consumptions || consumptions.length === 0) {
    return 0;
  }

  // Ordenar por timestamp desc (mais recente primeiro)
  const sorted = [...consumptions].sort((a, b) => {
    const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
    const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;

  let streak = 0;
  let expectedDate = new Date(now);
  expectedDate.setHours(0, 0, 0, 0);

  for (const consumption of sorted) {
    const consumptionDate = new Date(consumption.timestamp || consumption.createdAt);
    consumptionDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((expectedDate - consumptionDate) / msPerDay);

    if (daysDiff < 0) {
      // Consumo futuro, ignorar
      continue;
    } else if (daysDiff === 0) {
      // Mesmo dia esperado, continua streak
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (daysDiff === 1) {
      // Dia seguinte esperado, continua streak
      streak++;
      expectedDate = new Date(consumptionDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      // Gap maior que 1 dia, streak quebrado
      break;
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
export const updateUserStats = async (consumptions, cycles = null, dailyLogs = null, goals = null) => {
  try {
    if (!consumptions || consumptions.length === 0) {
      // Sem dados, guardar stats vazias
      await db.metadata.put({ key: 'userStats', value: {
        streak: 0,
        lastConsumptionTime: null,
        totalConsumptions: 0,
        last7DaysCount: 0,
        lastInterval: null,
        lastMg: null,
        goals: [],
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

    // Calcular streak
    const streak = calculateStreak(consumptions);

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
          text: `Intervalo curto! ${lastInterval}h`,
          emoji: '⚠️',
          color: 'orange',
          type: 'negative'
        });
      } else {
        alerts.push({
          text: `Bom intervalo! ${lastInterval}h`,
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
          text: `Atenção ao consumo de ontem! ${lastMg}mg`,
          emoji: '📊',
          color: 'orange',
          type: 'negative'
        });
      } else {
        alerts.push({
          text: `Boa! Consumo de ontem: ${lastMg}mg`,
          emoji: '💚',
          color: 'green',
          type: 'positive'
        });
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
      goals: [],
      alerts: [],
      lastUpdated: null
    };
  }
};
