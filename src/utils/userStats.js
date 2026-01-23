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
 */
export const updateUserStats = async (consumptions) => {
  try {
    if (!consumptions || consumptions.length === 0) {
      // Sem dados, guardar stats vazias
      await db.metadata.put({ key: 'userStats', value: {
        streak: 0,
        lastConsumptionTime: null,
        totalConsumptions: 0,
        last7DaysCount: 0,
        lastUpdated: new Date().toISOString()
      }});
      return;
    }

    // Calcular streak
    const streak = calculateStreak(consumptions);

    // Último consumo
    const sorted = [...consumptions].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    const lastConsumption = sorted[0];
    const lastConsumptionTime = lastConsumption ? (lastConsumption.timestamp || lastConsumption.createdAt) : null;

    // Consumos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7DaysCount = consumptions.filter(c => {
      const time = new Date(c.timestamp || c.createdAt).getTime();
      return time >= sevenDaysAgo.getTime();
    }).length;

    // Guardar em metadata
    const stats = {
      streak,
      lastConsumptionTime,
      totalConsumptions: consumptions.length,
      last7DaysCount,
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
      lastUpdated: null
    };
  }
};
