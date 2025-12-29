import Dexie from 'dexie';

/**
 * Schema do banco de dados local usando Dexie (IndexedDB)
 *
 * Todas as 7 coleções:
 * - consumptions: Registos de consumo
 * - dailyLogs: Registos diários de mg
 * - reflections: Reflexões DBT
 * - wellbeingLogs: Bem-estar (humor, energia, autocuidado)
 * - cycles: Ciclos de sono
 * - goals: Metas/objetivos
 * - thoughts: Diário de pensamentos
 *
 * Campos especiais:
 * - syncStatus: 'pending' | 'synced' | 'conflict'
 * - lastModified: timestamp da última modificação
 * - deleted: flag para soft delete (para sync)
 */

class NEPDatabase extends Dexie {
  constructor() {
    super('NEPDatabase');

    // Schema version 1
    this.version(1).stores({
      consumptions: 'id, date, timestamp, syncStatus, lastModified, deleted',
      dailyLogs: 'id, date, timestamp, syncStatus, lastModified, deleted',
      reflections: 'id, date, timestamp, syncStatus, lastModified, deleted',
      wellbeingLogs: 'id, date, timestamp, syncStatus, lastModified, deleted',
      cycles: 'id, date, timestamp, syncStatus, lastModified, deleted',
      goals: 'id, type, createdAt, syncStatus, lastModified, deleted',
      thoughts: 'id, date, timestamp, syncStatus, lastModified, deleted',

      // Metadados e configurações
      metadata: 'key, value',

      // Fila de sync (para retry em caso de falha)
      syncQueue: '++id, collection, itemId, operation, timestamp, retries'
    });

    // Typed tables
    this.consumptions = this.table('consumptions');
    this.dailyLogs = this.table('dailyLogs');
    this.reflections = this.table('reflections');
    this.wellbeingLogs = this.table('wellbeingLogs');
    this.cycles = this.table('cycles');
    this.goals = this.table('goals');
    this.thoughts = this.table('thoughts');
    this.metadata = this.table('metadata');
    this.syncQueue = this.table('syncQueue');
  }
}

// Singleton instance
export const db = new NEPDatabase();

/**
 * Helper: Adicionar item com metadados de sync
 */
export const addItemWithSync = async (collection, item) => {
  const itemWithSync = {
    ...item,
    syncStatus: 'pending',
    lastModified: new Date().toISOString(),
    deleted: false
  };

  await db[collection].put(itemWithSync);
  return itemWithSync;
};

/**
 * Helper: Atualizar item (merge com dados existentes)
 */
export const updateItemWithSync = async (collection, id, updates) => {
  const existing = await db[collection].get(id);

  if (!existing) {
    throw new Error(`Item ${id} não encontrado em ${collection}`);
  }

  const updated = {
    ...existing,
    ...updates,
    syncStatus: 'pending',
    lastModified: new Date().toISOString()
  };

  await db[collection].put(updated);
  return updated;
};

/**
 * Helper: Soft delete (marca como deleted para sync)
 */
export const deleteItemWithSync = async (collection, id) => {
  const existing = await db[collection].get(id);

  if (!existing) {
    throw new Error(`Item ${id} não encontrado em ${collection}`);
  }

  const deleted = {
    ...existing,
    deleted: true,
    syncStatus: 'pending',
    lastModified: new Date().toISOString()
  };

  await db[collection].put(deleted);
  return deleted;
};

/**
 * Helper: Obter todos os items não-deletados
 */
export const getAllItems = async (collection) => {
  const all = await db[collection].toArray();
  return all.filter(item => !item.deleted);
};

/**
 * Helper: Obter items pendentes de sync
 */
export const getPendingSync = async (collection) => {
  return await db[collection]
    .where('syncStatus')
    .equals('pending')
    .toArray();
};

/**
 * Helper: Marcar item como sincronizado
 */
export const markAsSynced = async (collection, id) => {
  await db[collection].update(id, { syncStatus: 'synced' });
};

/**
 * Helper: Limpar todos os dados (CUIDADO!)
 */
export const clearAllData = async () => {
  await db.consumptions.clear();
  await db.dailyLogs.clear();
  await db.reflections.clear();
  await db.wellbeingLogs.clear();
  await db.cycles.clear();
  await db.goals.clear();
  await db.thoughts.clear();
  await db.metadata.clear();
  await db.syncQueue.clear();
};

/**
 * Exportar tudo para backup
 */
export const exportAllData = async () => {
  return {
    consumptions: await db.consumptions.toArray(),
    dailyLogs: await db.dailyLogs.toArray(),
    reflections: await db.reflections.toArray(),
    wellbeingLogs: await db.wellbeingLogs.toArray(),
    cycles: await db.cycles.toArray(),
    goals: await db.goals.toArray(),
    thoughts: await db.thoughts.toArray(),
    metadata: await db.metadata.toArray()
  };
};

/**
 * Importar dados de backup
 */
export const importAllData = async (data) => {
  if (data.consumptions) await db.consumptions.bulkPut(data.consumptions);
  if (data.dailyLogs) await db.dailyLogs.bulkPut(data.dailyLogs);
  if (data.reflections) await db.reflections.bulkPut(data.reflections);
  if (data.wellbeingLogs) await db.wellbeingLogs.bulkPut(data.wellbeingLogs);
  if (data.cycles) await db.cycles.bulkPut(data.cycles);
  if (data.goals) await db.goals.bulkPut(data.goals);
  if (data.thoughts) await db.thoughts.bulkPut(data.thoughts);
  if (data.metadata) await db.metadata.bulkPut(data.metadata);
};

