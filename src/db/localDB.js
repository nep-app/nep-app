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

    // Referências tipadas para as tabelas
    this.consumptions = this.table('consumptions');
    this.dailyLogs = this.table('dailyLogs');
    this.reflections = this.table('reflections');
    this.wellbeingLogs = this.table('wellbeingLogs');
    this.cycles = this.table('cycles');
    this.goals = this.table('goals');
    this.copingStrategies = this.table('copingStrategies');
    this.thoughts = this.table('thoughts');
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
    await db.metadata.clear();
    await db.syncQueue.clear();
  });
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
    syncQueue: await db.syncQueue.count()
  };

  const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

  return { ...stats, total };
}
