import Dexie from 'dexie';
import { db } from '../db/localDB';
import i18n from '../i18n';
import { deriveDailyMg, typicalMgPerDose } from './mgDerivation';

// MODO DEMO: a demo renderiza a app real (com dados falsos). Estas funções
// escrevem na base de dados REAL (localDB) — por isso, em demo, NÃO devem gravar
// nada, senão o streak/contador/resumos da demo ficavam guardados e uma conta
// REAL criada depois nesse browser via os números da demo (ex.: "streak de 7
// dias" numa conta acabada de criar).
const isDemoMode = () => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('nep_demo') === '1';
  } catch {
    return false;
  }
};

/**
 * MIGRAÇÃO ÚNICA: as stats/streaks eram gravadas numa base de dados separada
 * ('NEPDatabase_v2', ficheiro dexieDB.js já removido), órfã do resto da app.
 * Esta função copia 'userStats' e 'appUsage' dessa base antiga para a base
 * principal (localDB) UMA vez, para o contador de dias não recomeçar do zero.
 * Corre no máximo uma vez por sessão e é tolerante a falhas (se a base antiga
 * não existir, simplesmente não há nada a migrar).
 */
let _statsMigration = null;
function ensureStatsMigrated() {
  if (!_statsMigration) {
    _statsMigration = (async () => {
      try {
        const haveStats = await db.metadata.get('userStats');
        const haveUsage = await db.metadata.get('appUsage');
        if (haveStats && haveUsage) return; // já há dados na base nova
        const legacy = new Dexie('NEPDatabase_v2');
        await legacy.open(); // abre o schema existente; lança se não existir
        if (!haveStats) {
          const lu = await legacy.table('metadata').get('userStats').catch(() => null);
          if (lu) await db.metadata.put({ key: 'userStats', value: lu.value });
        }
        if (!haveUsage) {
          const la = await legacy.table('metadata').get('appUsage').catch(() => null);
          if (la) await db.metadata.put({ key: 'appUsage', value: la.value });
        }
        legacy.close();
      } catch {
        // Base antiga inexistente ou ilegível — utilizador novo, nada a migrar
      }
    })();
  }
  return _statsMigration;
}

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
 * Calcular o RECORDE de dias consecutivos de atividade (maior sequência de sempre).
 * Recebe qualquer mistura de items (consumptions, wellbeingLogs, thoughts, etc.).
 */
export const calculateMaxStreak = (allItems) => {
  if (!allItems || allItems.length === 0) return 0;

  const uniqueDates = [...new Set(allItems.map(item => {
    const raw = item.date || item.timestamp || item.createdAt;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d) ? null : d.toISOString().split('T')[0];
  }).filter(Boolean))].sort();

  if (uniqueDates.length === 0) return 0;

  let maxStreak = 1;
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const diffDays = Math.round((new Date(uniqueDates[i]) - new Date(uniqueDates[i - 1])) / 86400000);
    if (diffDays === 1) {
      streak++;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 1;
    }
  }
  return maxStreak;
};

/**
 * Atualizar stats do user (chamar após criar/editar/apagar consumo)
 * @param {Array} consumptions - Array de consumptions desencriptados
 * @param {Array} cycles - Array de cycles desencriptados (opcional - lê da DB se não passado)
 * @param {Array} dailyLogs - Array de dailyLogs desencriptados (opcional - lê da DB se não passado)
 * @param {Array} goals - Array de goals desencriptados (opcional - lê da DB se não passado)
 */
export const updateUserStats = async (consumptions, cycles = null, dailyLogs = null, goals = null, wellbeingLogs = null, thoughts = null, reflections = null, weighings = null) => {
  if (isDemoMode()) return; // demo nunca grava na base real
  try {
    await ensureStatsMigrated();
    // Calcular streak com todas as fontes de atividade (independente de consumptions)
    const allActivityItems = [
      ...(consumptions || []),
      ...(dailyLogs || []),
      ...(wellbeingLogs || []),
      ...(thoughts || []),
      ...(reflections || []),
    ];
    const streak = calculateStreak(allActivityItems);
    const maxStreak = calculateMaxStreak(allActivityItems);

    if (!consumptions || consumptions.length === 0) {
      // Sem consumptions: guardar apenas streak (preservar valor correto)
      await db.metadata.put({ key: 'userStats', value: {
        streak,
        maxStreak,
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

    // Filtrar dias atípicos — não contam para metas nem alertas
    const atypicalDates = new Set(
      (wellbeingLogs || [])
        .filter(w => w.isAtypical)
        .map(w => {
          if (w.date) return w.date;
          const ts = w.timestamp || w.createdAt;
          if (!ts) return null;
          const d = new Date(ts);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        })
        .filter(Boolean)
    );
    const filteredConsumptions = consumptions.filter(c => !atypicalDates.has(c.date));
    const filteredCycles = cycles.filter(c => !atypicalDates.has(c.date));
    const filteredDailyLogs = dailyLogs.filter(l => !atypicalDates.has(l.date));
    const filteredWellbeingLogs = (wellbeingLogs || []).filter(w => !w.isAtypical);

    // Último consumo real (para badge "Tempo desde último consumo" — inclui dias atípicos)
    const rawSorted = [...consumptions].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    const lastConsumption = rawSorted[0];
    const lastConsumptionTime = lastConsumption ? (lastConsumption.timestamp || lastConsumption.createdAt) : null;

    // Calcular último intervalo usando consumos filtrados (subconjunto de rawSorted)
    let lastInterval = null;
    // Recolher só os 2 primeiros consumos não-atípicos — evita copiar a lista inteira
    const twoFiltered = [];
    for (const c of rawSorted) {
      if (!atypicalDates.has(c.date)) { twoFiltered.push(c); if (twoFiltered.length === 2) break; }
    }
    if (twoFiltered.length >= 2) {
      const last = new Date(twoFiltered[0].timestamp || twoFiltered[0].createdAt);
      const secondLast = new Date(twoFiltered[1].timestamp || twoFiltered[1].createdAt);
      const diffMs = last - secondLast;
      const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
      lastInterval = parseFloat(hours);
    }

    // Último mg — de cycles, dailyLogs E dos mg DERIVADOS das pesagens.
    // Sem a parte das pesagens, quem regista os mg pela PESAGEM (em vez do
    // "Registar mg" à mão) não via a dose refletida nos avisos do ecrã inicial.
    let lastMg = null;
    let lastMgTs = null; // timestamp do valor escolhido, para o aviso mostrar a DATA real
    let lastMgEstimated = false; // true → valor ESTIMADO (mostra "≈"), false → medido/à mão
    const cyclesWithMg = filteredCycles
      .filter(c => c.mg !== undefined && c.mg !== null && c.mg !== '')
      .map(c => ({ mg: c.mg, timestamp: c.timestamp, estimated: false }));

    const dailyLogsWithMg = filteredDailyLogs
      .filter(l => l.mg !== undefined && l.mg !== null && l.mg !== '')
      .map(l => ({ mg: l.mg, timestamp: l.timestamp || (l.date ? `${l.date}T12:00:00` : null), estimated: false }));

    // mg/dia derivados das pesagens. Um dia com mg registado à MÃO (dailyLog)
    // manda — só usamos o derivado para dias SEM registo manual. Dias atípicos
    // não contam. As datas são LOCAIS (getTodayKey), por isso o fim-do-dia é
    // construído em hora local (NÃO UTC) para não trocar o limite da meia-noite.
    const manualMgDates = new Set(
      filteredDailyLogs
        .filter(l => l.mg !== undefined && l.mg !== null && l.mg !== '')
        .map(l => l.date)
        .filter(Boolean)
    );
    const derivedMgEntries = [];
    if (weighings && weighings.length > 0) {
      try {
        const typical = typicalMgPerDose(weighings, consumptions);
        const perDay = deriveDailyMg(weighings, consumptions, { typical });
        for (const [date, day] of Object.entries(perDay || {})) {
          if (!day || !(day.mg > 0)) continue;
          if (atypicalDates.has(date)) continue;
          if (manualMgDates.has(date)) continue; // registo manual manda
          // Dias 'measured' são exatos; 'estimated'/'mixed' são ESTIMADOS (marcados
          // com "≈" no aviso). Dias 'unknown' têm mg null e já foram saltados acima.
          derivedMgEntries.push({
            mg: day.mg,
            timestamp: new Date(`${date}T23:59:59`).getTime(),
            estimated: day.state !== 'measured',
          });
        }
      } catch (e) {
        // Derivação é best-effort: nunca deve partir os avisos.
      }
    }

    const allWithMg = [...cyclesWithMg, ...dailyLogsWithMg, ...derivedMgEntries]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (allWithMg.length > 0) {
      const mgValue = allWithMg[0].mg;
      lastMg = typeof mgValue === 'number' ? mgValue : parseFloat(mgValue);
      lastMgTs = allWithMg[0].timestamp;
      lastMgEstimated = !!allWithMg[0].estimated;
    }

    // Consumos últimos 7 dias (excluindo dias atípicos)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7DaysCount = filteredConsumptions.filter(c => {
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
    // Mostra o intervalo ANTERIOR (entre os dois últimos consumos registados).
    // O tempo desde o consumo ATUAL já é mostrado no cartão de topo.
    const intervalGoal = (goals || []).find(g => g.type === 'increase_interval');
    if (lastInterval !== null && intervalGoal) {
      const targetInterval = parseFloat(intervalGoal.target);
      if (lastInterval < targetInterval) {
        alerts.push({
          text: i18n.t('alerts.shortInterval', { hours: lastInterval }),
          emoji: '⚠️',
          color: 'orange',
          type: 'negative',
          urge: true
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
      // Data REAL do valor mostrado (não "ontem" — o valor pode ser de outro dia).
      let dateLabel = '';
      try {
        const d = lastMgTs ? new Date(lastMgTs) : null;
        if (d && !isNaN(d.getTime())) dateLabel = d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
      } catch (e) { /* sem data → usa recuo abaixo */ }
      if (!dateLabel) dateLabel = (i18n.language || '').startsWith('en') ? 'recent' : 'há pouco';
      // Valor ESTIMADO (derivado da pesagem, não medido a 100%) → prefixo "≈".
      const mgShown = lastMgEstimated ? `≈${lastMg}` : `${lastMg}`;
      if (lastMg >= targetMg) {
        alerts.push({
          text: i18n.t('alerts.watchDose', { mg: mgShown, date: dateLabel }),
          emoji: '📊',
          color: 'orange',
          type: 'negative'
        });
      } else {
        alerts.push({
          text: i18n.t('alerts.goodDose', { mg: mgShown, date: dateLabel }),
          emoji: '💚',
          color: 'green',
          type: 'positive'
        });
      }
    }

    // Aviso 3: Horas de sono (se existe meta sleep_hours)
    const sleepGoal = (goals || []).find(g => g.type === 'sleep_hours');
    if (sleepGoal && filteredCycles.length > 0) {
      const lastCycleWithSleep = filteredCycles
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

    // Aviso 4: Risco preditivo (sono <6h E humor <5) — usa wellbeingLogs bruto (estado actual, não meta)
    if (filteredCycles.length > 0 && (wellbeingLogs || []).length > 0) {
      const lastCycleWithSleep = filteredCycles
        .filter(c => c.sleep && !isNaN(parseFloat(c.sleep)))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      const lastWellbeingWithMood = (wellbeingLogs || [])
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
    if (bedtimeGoal && filteredCycles.length > 0) {
      const lastCycle = filteredCycles
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

    // Aviso 6: Último consumo (meta limit_last — baseado no ciclo de sono, não no dia de calendário)
    const limitLastGoal = (goals || []).find(g => g.type === 'limit_last');
    if (limitLastGoal && filteredConsumptions.length > 0) {
      const targetStr = typeof limitLastGoal.target === 'string' ? limitLastGoal.target : '00:00';
      const [th, tm] = targetStr.split(':').map(Number);
      const targetMinutes = (th === 0 && (tm || 0) === 0) ? 1440 : th * 60 + (tm || 0);

      const now = new Date();

      // O "dia" é definido pelo ciclo de sono: começa quando o utilizador acordou (último ciclo registado)
      // Se não há ciclo, usar meia-noite do dia de calendário como fallback
      const sortedCycles = (cycles || [])
        .filter(c => c.timestamp || c.date)
        .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

      const lastCycleTime = sortedCycles.length > 0
        ? new Date(sortedCycles[0].timestamp || sortedCycles[0].date)
        : null;

      // Consumos do ciclo atual: desde o último ciclo registado (ou todos se não há ciclo)
      const cycleConsumptions = filteredConsumptions
        .filter(c => !lastCycleTime || new Date(c.timestamp) > lastCycleTime)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (cycleConsumptions.length > 0) {
        const lastCons = new Date(cycleConsumptions[0].timestamp);
        const lastConsMinutes = lastCons.getHours() * 60 + lastCons.getMinutes();
        const lastTimeStr = `${String(lastCons.getHours()).padStart(2,'0')}:${String(lastCons.getMinutes()).padStart(2,'0')}`;

        // A meia-noite relevante é a primeira 00:00 que ocorreu DENTRO deste ciclo
        const cycleStart = lastCycleTime || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        // Se a meia-noite já passou E ocorreu depois do início do ciclo → é a meia-noite relevante
        const midnightIsWithinCycle = midnight > cycleStart && midnight <= now;

        let afterMidnight = false;
        if (midnightIsWithinCycle) {
          // Há consumos depois da meia-noite deste ciclo?
          afterMidnight = cycleConsumptions.some(c => new Date(c.timestamp) >= midnight);
        } else {
          // A meia-noite ainda não aconteceu neste ciclo → avaliar pela hora (< targetMinutes)
          afterMidnight = (lastConsMinutes + (lastConsMinutes < 360 ? 1440 : 0)) >= targetMinutes;
        }

        if (afterMidnight) {
          alerts.push({
            text: i18n.t('alerts.limitLastFail', { time: lastTimeStr, target: targetStr }),
            emoji: '⏰',
            color: 'orange',
            type: 'negative',
            urge: true
          });
        } else {
          alerts.push({
            text: i18n.t('alerts.limitLastSuccess', { target: targetStr }),
            emoji: '🌙',
            color: 'green',
            type: 'positive'
          });
        }
      } else if (sortedCycles.length > 0) {
        // Ciclo fechado (há novo ciclo, sem consumos desde então) — mostrar resultado do ciclo anterior
        const prevCycleStart = sortedCycles.length > 1
          ? new Date(sortedCycles[1].timestamp || sortedCycles[1].date)
          : null;
        const prevCycleCons = filteredConsumptions
          .filter(c => {
            const t = new Date(c.timestamp);
            return t <= lastCycleTime && (!prevCycleStart || t > prevCycleStart);
          })
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (prevCycleCons.length > 0) {
          const prevLast = new Date(prevCycleCons[0].timestamp);
          // Meia-noite dentro do ciclo anterior
          const prevMidnight = new Date(lastCycleTime.getFullYear(), lastCycleTime.getMonth(), lastCycleTime.getDate(), 0, 0, 0);
          const prevCycleStartTs = prevCycleStart || new Date(0);
          const prevMidnightInCycle = prevMidnight > prevCycleStartTs && prevMidnight <= lastCycleTime;
          const hadAfterMidnight = prevMidnightInCycle
            ? prevCycleCons.some(c => new Date(c.timestamp) >= prevMidnight)
            : false;

          if (hadAfterMidnight) {
            const lastTimeStr = `${String(prevLast.getHours()).padStart(2,'0')}:${String(prevLast.getMinutes()).padStart(2,'0')}`;
            // SEM urge: é o resultado de um ciclo JÁ FECHADO (retrospetivo). Não deve
            // abrir a janela do impulso quando se vai consumir num ciclo novo.
            alerts.push({
              text: i18n.t('alerts.limitLastFail', { time: lastTimeStr, target: targetStr }),
              emoji: '⏰', color: 'orange', type: 'negative'
            });
          } else {
            alerts.push({
              text: i18n.t('alerts.limitLastSuccess', { target: targetStr }),
              emoji: '🌙', color: 'green', type: 'positive'
            });
          }
        }
      }
    }

    // Aviso 7: Frequência diária (se existe meta reduce_frequency)
    const frequencyGoal = (goals || []).find(g => g.type === 'reduce_frequency');
    if (frequencyGoal && filteredConsumptions.length > 0) {
      // Calcular consumos de hoje (excluindo dias atípicos)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayConsumptions = filteredConsumptions.filter(c => {
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
          type: 'negative',
          urge: true
        });
      }
    }

    // Aviso 8: Primeiro consumo após acordar (meta first_not_before)
    const firstNotBeforeGoal = (goals || []).find(g => g.type === 'first_not_before');
    if (firstNotBeforeGoal && filteredConsumptions.length > 0 && filteredCycles.length > 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayConsumptions = filteredConsumptions
        .filter(c => { const d = new Date(c.timestamp || c.createdAt); d.setHours(0,0,0,0); return d.getTime() === todayStart.getTime(); })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Ciclo mais recente com bedtime + sleep para calcular hora de acordar
      const lastCycleWithSleep = [...filteredCycles]
        .filter(c => c.bedtime && c.sleep)
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))[0];

      // Só mostrar este alerta se o utilizador registou um novo ciclo hoje (após meia-noite)
      // Se não registou ciclo hoje, ainda não "acordou" no sentido da app — não faz sentido mostrar
      const lastCycleTs = lastCycleWithSleep ? new Date(lastCycleWithSleep.timestamp || lastCycleWithSleep.createdAt) : null;
      const cycleLoggedToday = lastCycleTs !== null && lastCycleTs >= todayStart;

      if (todayConsumptions.length > 0 && lastCycleWithSleep && cycleLoggedToday) {
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
              text: i18n.t('alerts.firstNotBeforeFail', { time: firstTimeStr, hours: firstNotBeforeGoal.target }),
              emoji: '⏰',
              color: 'orange',
              type: 'negative'
            });
          } else {
            alerts.push({
              text: i18n.t('alerts.firstNotBeforeSuccess', { hours: firstNotBeforeGoal.target }),
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
      maxStreak,
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
  if (isDemoMode()) return 0; // demo nunca grava na base real
  try {
    await ensureStatsMigrated();
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
    await ensureStatsMigrated();
    const record = await db.metadata.get('appUsage');
    return record?.value?.appStreak || 0;
  } catch {
    return 0;
  }
};

/**
 * RESUMO-POR-DIA PERSISTENTE
 * Grava/le o resumo-por-dia (count + parte-do-dia por data) em metadata, NÃO
 * encriptado (são agregados, à semelhança das stats já guardadas). Permite que as
 * páginas pesadas mostrem o resumo instantaneamente no arranque, sem desencriptar
 * os milhares de registos do histórico todo.
 */
export const saveDailyRollup = async (rollup) => {
  if (isDemoMode()) return; // demo nunca grava na base real
  try {
    await db.metadata.put({ key: 'consumptionDailyRollup', value: rollup });
  } catch (e) {
    console.error('[UserStats] Erro ao gravar resumo-por-dia:', e);
  }
};

export const getDailyRollup = async () => {
  try {
    const record = await db.metadata.get('consumptionDailyRollup');
    return record?.value || null;
  } catch {
    return null;
  }
};

/**
 * FICHA-RESUMO COMPLETA POR DIA
 * Como o resumo-por-dia, mas com mais campos por dia (sono, hora de deitar, mg,
 * humor, energia) para as páginas de Análises/Histórico poderem ler tudo sem
 * desencriptar o histórico inteiro. Também são agregados (não cifrado).
 */
export const saveDailySummary = async (summary) => {
  if (isDemoMode()) return; // demo nunca grava na base real
  try {
    await db.metadata.put({ key: 'dailySummary', value: summary });
  } catch (e) {
    console.error('[UserStats] Erro ao gravar ficha-resumo por dia:', e);
  }
};

export const getDailySummary = async () => {
  try {
    const record = await db.metadata.get('dailySummary');
    return record?.value || null;
  } catch {
    return null;
  }
};

/**
 * Ler stats do user (RÁPIDO - sem desencriptar!)
 */
export const getUserStats = async () => {
  try {
    await ensureStatsMigrated();
    const record = await db.metadata.get('userStats');
    if (!record) {
      return {
        streak: 0,
        maxStreak: 0,
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
