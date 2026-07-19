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
    syncQueue: await db.syncQueue.count()
  };

  const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

  return { ...stats, total };
}
