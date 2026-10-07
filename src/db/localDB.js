import Dexie from 'dexie';

/**
 * Local-First Database usando Dexie.js (IndexedDB)
 *
 * Estrutura:
 * - Todos os dados guardados localmente encriptados
 * - Sync opcional com Firebase (dados encriptados E2E)
 * - Funciona 100% offline
 */

export class LocalDatabase extends Dexie {
  constructor() {
    super('NEPDatabase');

    // Define schema das tabelas
    // Sintaxe: 'campo1, campo2, &campo3' onde & = primary key, * = multi-entry index
    this.version(1).stores({
      // Tabelas de dados principais
      consumptions: '++id, date, timestamp, substance, amount, unit, syncStatus, lastModified',
      dailyLogs: '++id, date, timestamp, syncStatus, lastModified',
      reflections: '++id, date, timestamp, syncStatus, lastModified',
      wellbeingLogs: '++id, date, timestamp, syncStatus, lastModified',
      cycles: '++id, startDate, endDate, syncStatus, lastModified',
      goals: '++id, createdAt, syncStatus, lastModified',
      copingStrategies: '++id, createdAt, syncStatus, lastModified',
      thoughts: '++id, timestamp, syncStatus, lastModified',

      // Tabela de metadados e configuração
      metadata: 'key, value',

      // Tabela de sync (controla o que precisa sincronizar)
      syncQueue: '++id, collection, documentId, operation, timestamp, retries'
    });

    this.version(2).stores({
      // Manter todas as tabelas existentes
      consumptions: '++id, date, timestamp, substance, amount, unit, syncStatus, lastModified',
      dailyLogs: '++id, date, timestamp, syncStatus, lastModified',
      reflections: '++id, date, timestamp, syncStatus, lastModified',
      wellbeingLogs: '++id, date, timestamp, syncStatus, lastModified',
      cycles: '++id, startDate, endDate, syncStatus, lastModified',
      goals: '++id, createdAt, syncStatus, lastModified',
      copingStrategies: '++id, createdAt, syncStatus, lastModified',
      thoughts: '++id, timestamp, syncStatus, lastModified',

      // Nova tabela: registos de sintomas/saúde
      healthLogs: '++id, date, timestamp, syncStatus, lastModified',

      // Tabela de metadados e configuração
      metadata: 'key, value',

      // Tabela de sync
      syncQueue: '++id, collection, documentId, operation, timestamp, retries'
    });

    this.version(3).stores({
      // Manter todas as tabelas existentes
      consumptions: '++id, date, timestamp, substance, amount, unit, syncStatus, lastModified',
      dailyLogs: '++id, date, timestamp, syncStatus, lastModified',
      reflections: '++id, date, timestamp, syncStatus, lastModified',
      wellbeingLogs: '++id, date, timestamp, syncStatus, lastModified',
      cycles: '++id, startDate, endDate, syncStatus, lastModified',
      goals: '++id, createdAt, syncStatus, lastModified',
      copingStrategies: '++id, createdAt, syncStatus, lastModified',
      thoughts: '++id, timestamp, syncStatus, lastModified',
      healthLogs: '++id, date, timestamp, syncStatus, lastModified',

      // Nova tabela: pesagens do saco (para derivar mg/dia sem contas à mão)
      weighings: '++id, date, timestamp, syncStatus, lastModified',

      metadata: 'key, value',
      syncQueue: '++id, collection, documentId, operation, timestamp, retries'
    });

    this.version(4).stores({
      // Manter todas as tabelas existentes
      consumptions: '++id, date, timestamp, substance, amount, unit, syncStatus, lastModified',
      dailyLogs: '++id, date, timestamp, syncStatus, lastModified',
      reflections: '++id, date, timestamp, syncStatus, lastModified',
      wellbeingLogs: '++id, date, timestamp, syncStatus, lastModified',
      cycles: '++id, startDate, endDate, syncStatus, lastModified',
      goals: '++id, createdAt, syncStatus, lastModified',
      copingStrategies: '++id, createdAt, syncStatus, lastModified',
      thoughts: '++id, timestamp, syncStatus, lastModified',
      healthLogs: '++id, date, timestamp, syncStatus, lastModified',
      weighings: '++id, date, timestamp, syncStatus, lastModified',

      // Nova tabela: momentos de "surfar o impulso" (cifrados e sincronizados,
      // como o resto dos dados — deixa de ser só-neste-telemóvel).
      urgeEvents: '++id, timestamp, syncStatus, lastModified',

      metadata: 'key, value',
      syncQueue: '++id, collection, documentId, operation, timestamp, retries'
    });

    // Versão 5: a lista de substâncias de cada pessoa (nome + qual é a "por
    // defeito"). Cifrada como o resto — só ficam em claro o id e as datas —
    // e sincronizada, para não se perder ao trocar de telemóvel.
    this.version(5).stores({
      substances: '++id, createdAt, syncStatus, lastModified'
    });

    // Referências tipadas para as tabelas
    this.consumptions = this.table('consumptions');
    this.dailyLogs = this.table('dailyLogs');
    this.reflections = this.table('reflections');
    this.wellbeingLogs = this.table('wellbeingLogs');
    this.cycles = this.table('cycles');
    this.goals = this.table('goals');
    this.copingStrategies = this.table('copingStrategies');
    this.thoughts = this.table('thoughts');
    this.healthLogs = this.table('healthLogs');
    this.weighings = this.table('weighings');
    this.urgeEvents = this.table('urgeEvents');
    this.substances = this.table('substances');
    this.metadata = this.table('metadata');
    this.syncQueue = this.table('syncQueue');
  }
}

// Instância única do banco de dados
export const db = new LocalDatabase();

/**
 * Utilitário para obter metadados
 */
export async function getMetadata(key) {
  const result = await db.metadata.get(key);
  return result ? result.value : null;
}

/**
 * Utilitário para guardar metadados
 */
export async function setMetadata(key, value) {
  await db.metadata.put({ key, value });
}

/**
 * Limpar toda a base de dados (para logout)
 */
/**
 * Conta os consumos de um DIA, lendo directamente da base local.
 *
 * ⚠️ PORQUE EXISTE: contar a partir do array em memória (`consumptions`) dá
 * valores ERRADOS, porque os dados entram por fases — a FASE 2 traz só os
 * últimos 7 dias e a FASE 3 (o histórico todo) demora ~10s. Quem preenchesse
 * um registo de um dia antigo antes de a FASE 3 acabar ficava com `times: 0`,
 * mesmo em dias com 10 consumos. Aconteceu mesmo: 23 registos de 20/06 a 12/07
 * de 2026, todos a zero, preenchidos de uma vez em 19/07.
 *
 * O campo `date` é um índice em CLARO (não é cifrado — ver INDEX_FIELDS em
 * utils/dexieEncryption.js), por isso dá para contar sem desencriptar nada e
 * sem depender do que já foi carregado para memória.
 *
 * @param {string} date - chave local 'YYYY-MM-DD' (usar getTodayKey/safeToISODate)
 * @returns {Promise<number|null>} nº de consumos, ou null se não der para contar
 */
export async function countConsumptionsOnDate(date) {
  if (!date) return null;
  try {
    const rows = await db.consumptions.where('date').equals(date).toArray();
    return rows.filter(r => !r.deleted).length;
  } catch (e) {
    // Nunca inventar um número: null quer dizer "não sei", e quem mostra
    // trata o null como ausente em vez de escrever 0.
    return null;
  }
}

export async function clearAllData() {
  await db.transaction('rw', [
    db.consumptions,
    db.dailyLogs,
    db.reflections,
    db.wellbeingLogs,
    db.cycles,
    db.goals,
    db.copingStrategies,
    db.thoughts,
    db.healthLogs,
    db.weighings,
    db.urgeEvents,
    db.substances,
    db.metadata,
    db.syncQueue
  ], async () => {
    await db.consumptions.clear();
    await db.dailyLogs.clear();
    await db.reflections.clear();
    await db.wellbeingLogs.clear();
    await db.cycles.clear();
    await db.goals.clear();
    await db.copingStrategies.clear();
    await db.thoughts.clear();
    await db.healthLogs.clear();
    await db.weighings.clear();
    await db.urgeEvents.clear();
    await db.substances.clear();
    await db.metadata.clear();
    await db.syncQueue.clear();
  });
}

/**
 * Limpa APENAS os dados do utilizador (não apaga metadados de autenticação)
 * Usado no logout para manter a informação de que a conta existe
 */
export async function clearUserDataOnly() {
  await db.transaction('rw', [
    db.consumptions,
    db.dailyLogs,
    db.reflections,
    db.wellbeingLogs,
    db.cycles,
    db.goals,
    db.copingStrategies,
    db.thoughts,
    db.healthLogs,
    db.weighings,
    db.urgeEvents,
    db.substances,
    db.syncQueue
  ], async () => {
    await db.consumptions.clear();
    await db.dailyLogs.clear();
    await db.reflections.clear();
    await db.wellbeingLogs.clear();
    await db.cycles.clear();
    await db.goals.clear();
    await db.copingStrategies.clear();
    await db.thoughts.clear();
    await db.healthLogs.clear();
    await db.weighings.clear();
    await db.urgeEvents.clear();
    await db.substances.clear();
    await db.syncQueue.clear();
    // NÃO limpa db.metadata - mantém userEmail, salt, pinVerification
  });
}

/**
 * Limpar estatísticas/derivados ESPECÍFICOS DA CONTA guardados em metadata.
 *
 * Usar quando se troca de conta (UID diferente): a `clearUserDataOnly` limpa os
 * dados mas mantém a metadata de propósito (para o auto-lock reabrir depressa).
 * O problema é que o streak, o contador de dias e os resumos ficavam lá e a conta
 * NOVA via os números da conta ANTERIOR (ex.: "streak de 7 dias" numa conta acabada
 * de criar). Aqui apagamos só esses derivados — NÃO o salt/PIN/email.
 */
export async function clearDerivedStats() {
  await db.metadata.bulkDelete([
    'userStats',
    'appUsage',
    'consumptionDailyRollup',
    'dailySummary',
    'firstUseDate',
    'firstUseDateLocked',
    'lastSyncTimestamp',
  ]);
}

/**
 * Obter estatísticas da base de dados
 */
export async function getDatabaseStats() {
  const stats = {
    consumptions: await db.consumptions.count(),
    dailyLogs: await db.dailyLogs.count(),
    reflections: await db.reflections.count(),
    wellbeingLogs: await db.wellbeingLogs.count(),
    cycles: await db.cycles.count(),
    goals: await db.goals.count(),
    copingStrategies: await db.copingStrategies.count(),
    thoughts: await db.thoughts.count(),
    healthLogs: await db.healthLogs.count(),
    urgeEvents: await db.urgeEvents.count(),
    substances: await db.substances.count(),
    syncQueue: await db.syncQueue.count()
  };

  const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

  return { ...stats, total };
}
