import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../db/localDB';
import {
  encryptItem,
  decryptItem,
  encryptItems,
  decryptItems
} from '../utils/dexieEncryption';

// Helper functions (using localDB instead of dexieDB)
const addItemWithSync = async (collection, item) => {
  const itemWithSync = {
    ...item,
    syncStatus: 'pending',
    lastModified: new Date().toISOString(),
    deleted: false
  };
  await db[collection].put(itemWithSync);
  console.log(`[LocalData] ✅ Item adicionado: ${collection}/${item.id} - syncStatus: pending`);
  return itemWithSync;
};

const updateItemWithSync = async (collection, id, updates) => {
  const existing = await db[collection].get(id);
  if (!existing) throw new Error(`Item ${id} não encontrado em ${collection}`);

  const updated = {
    ...existing,
    ...updates,
    syncStatus: 'pending',
    lastModified: new Date().toISOString()
  };
  await db[collection].put(updated);
  console.log(`[LocalData] ✏️ Item atualizado: ${collection}/${id} - syncStatus: pending`);
  return updated;
};

const deleteItemWithSync = async (collection, id) => {
  const existing = await db[collection].get(id);
  if (!existing) throw new Error(`Item ${id} não encontrado em ${collection}`);

  const deleted = {
    ...existing,
    deleted: true,
    syncStatus: 'pending',
    lastModified: new Date().toISOString()
  };
  await db[collection].put(deleted);
  console.log(`[LocalData] 🗑️ Item marcado como deleted: ${collection}/${id}`, { deleted: deleted.deleted, syncStatus: deleted.syncStatus });
  return deleted;
};

const getAllItems = async (collection) => {
  const all = await db[collection].toArray();
  const filtered = all.filter(item => !item.deleted);
  const deletedCount = all.length - filtered.length;
  if (deletedCount > 0) {
    console.log(`[LocalData] 🗑️ ${collection}: ${deletedCount} deleted items filtrados (${filtered.length} ativos de ${all.length} total)`);
  }
  return filtered;
};

const getPendingSync = async (collection) => {
  return await db[collection].where('syncStatus').equals('pending').toArray();
};

const markAsSynced = async (collection, id) => {
  await db[collection].update(id, { syncStatus: 'synced' });
};

const LocalDataContext = createContext();

export const useLocalData = () => {
  const context = useContext(LocalDataContext);
  if (!context) {
    throw new Error('useLocalData must be used within LocalDataProvider');
  }
  return context;
};

/**
 * LocalDataProvider - Gere dados locais usando Dexie (IndexedDB)
 *
 * Funcionalidades:
 * - CRUD operations com encriptação automática
 * - Dados persistem localmente (10-20x mais rápido que Firebase)
 * - Sync status tracking (pending/synced/conflict)
 * - Funciona offline
 *
 * IMPORTANTE: Requer autenticação com PIN (usa encryptionKey do AuthContext)
 */
export const LocalDataProvider = ({ children }) => {
  const { encryptionKey, getUserSalt } = useAuth();

  // Estado para cada coleção
  const [consumptions, setConsumptions] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [wellbeingLogs, setWellbeingLogs] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [goals, setGoals] = useState([]);
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);

  /**
   * Carregar dados de uma coleção (com desencriptação)
   *
   * OTIMIZAÇÃO: Por defeito carrega apenas últimos 30 dias para evitar
   * desencriptar 1000+ items no boot (+ rápido 5-10x)
   *
   * @param {string} collectionName - Nome da coleção
   * @param {number} maxAgeDays - Idade máxima dos items a carregar (default: 30 dias)
   */
  const loadCollection = useCallback(async (collectionName, maxAgeDays = 30) => {
    if (!encryptionKey) {
      return [];
    }

    try {
      const salt = await getUserSalt();
      const allItems = await getAllItems(collectionName);

      // 🚀 OTIMIZAÇÃO: Filtrar items recentes ANTES de desencriptar
      // Isto evita desencriptar 1000+ items antigos ou zombies
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
      const cutoffTime = cutoffDate.getTime();

      const recentItems = allItems.filter(item => {
        // Usar lastModified para filtrar (mais confiável que timestamp encriptado)
        if (!item.lastModified) return true; // Items sem lastModified - carregar sempre
        const itemTime = new Date(item.lastModified).getTime();
        return itemTime >= cutoffTime;
      });

      console.log(`[LocalData] 📦 ${collectionName}: ${recentItems.length} recentes (últimos ${maxAgeDays}d) de ${allItems.length} total`);

      // Desencriptar apenas items recentes (MUITO mais rápido!)
      const decrypted = await decryptItems(collectionName, recentItems, encryptionKey, salt);

      // Ordenar por timestamp desc (mais recente primeiro)
      const sorted = decrypted.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      return sorted;
    } catch (error) {
      console.error(`[LocalData] Erro ao carregar ${collectionName}:`, error);
      return [];
    }
  }, [encryptionKey, getUserSalt]);

  /**
   * Carregar coleção com PRIMEIRO item (para métricas corretas)
   *
   * Carrega últimos N dias + o PRIMEIRO item ever (mais antigo)
   * Isto garante que métricas tipo "Usas a app há X dias" ficam corretas
   *
   * @param {string} collectionName - Nome da coleção
   * @param {number} maxAgeDays - Últimos N dias a carregar
   * @returns {Array} Items recentes + primeiro item
   */
  const loadCollectionWithFirst = useCallback(async (collectionName, maxAgeDays = 7) => {
    if (!encryptionKey) {
      return [];
    }

    try {
      const salt = await getUserSalt();
      const allItems = await getAllItems(collectionName);

      if (allItems.length === 0) {
        return [];
      }

      // Filtrar items recentes
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
      const cutoffTime = cutoffDate.getTime();

      const recentItems = allItems.filter(item => {
        if (!item.lastModified) return true;
        const itemTime = new Date(item.lastModified).getTime();
        return itemTime >= cutoffTime;
      });

      // Encontrar PRIMEIRO item ever (mais antigo por lastModified)
      const oldestItem = allItems.reduce((oldest, item) => {
        if (!item.lastModified) return oldest;
        if (!oldest || new Date(item.lastModified).getTime() < new Date(oldest.lastModified).getTime()) {
          return item;
        }
        return oldest;
      }, null);

      // Combinar: items recentes + primeiro item (se não estiver já incluído)
      const itemsToLoad = [...recentItems];
      if (oldestItem && !recentItems.find(i => i.id === oldestItem.id)) {
        itemsToLoad.push(oldestItem);
      }

      console.log(`[LocalData] 📦 ${collectionName}: ${recentItems.length} recentes (últimos ${maxAgeDays}d) + primeiro item de ${allItems.length} total`);

      // Desencriptar
      const decrypted = await decryptItems(collectionName, itemsToLoad, encryptionKey, salt);

      // Ordenar por timestamp desc (mais recente primeiro)
      const sorted = decrypted.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      return sorted;
    } catch (error) {
      console.error(`[LocalData] Erro ao carregar ${collectionName}:`, error);
      return [];
    }
  }, [encryptionKey, getUserSalt]);

  /**
   * Carregar todas as coleções (com LAZY LOADING)
   *
   * FASE 1 (RÁPIDA): Carrega últimos 7 dias + PRIMEIRO item (métricas corretas)
   * FASE 2 (BACKGROUND): Carrega resto dos dados (~800+ items) após 500ms
   *
   * Isto garante que a app abre RÁPIDO (Fase 1) e depois carrega tudo (Fase 2)
   */
  const loadAllCollections = useCallback(async () => {
    if (!encryptionKey) {
      return;
    }

    setLoading(true);

    try {
      // ⚡ FASE 1: Carregar últimos 30 dias + PRIMEIRO item (BOOT RÁPIDO + alerts/métricas corretas!)
      console.log('[LocalData] ⚡ FASE 1: Carregando últimos 30 dias + primeiro item (boot rápido + alerts)...');

      const [
        consumptionsData,
        dailyLogsData,
        reflectionsData,
        wellbeingLogsData,
        cyclesData,
        goalsData,
        thoughtsData
      ] = await Promise.all([
        loadCollectionWithFirst('consumptions', 30),
        loadCollectionWithFirst('dailyLogs', 30),
        loadCollectionWithFirst('reflections', 30),
        loadCollectionWithFirst('wellbeingLogs', 30),
        loadCollectionWithFirst('cycles', 30),
        loadCollectionWithFirst('goals', 30),
        loadCollectionWithFirst('thoughts', 30)
      ]);

      setConsumptions(consumptionsData);
      setDailyLogs(dailyLogsData);
      setReflections(reflectionsData);
      setWellbeingLogs(wellbeingLogsData);
      setCycles(cyclesData);
      setGoals(goalsData);
      setThoughts(thoughtsData);

      // App está PRONTA! Loading = false
      setLoading(false);
      console.log('[LocalData] ✅ FASE 1 completa - App pronta!');

      // 🔄 FASE 2: Carregar resto dos dados em BACKGROUND (após 500ms)
      setTimeout(async () => {
        try {
          setBackgroundLoading(true);
          console.log('[LocalData] 🔄 FASE 2: Carregando TODOS os dados em background...');

          // Carregar TUDO (sem filtro de idade - 999999 dias = todos)
          const [
            consumptionsFullData,
            dailyLogsFullData,
            reflectionsFullData,
            wellbeingLogsFullData,
            cyclesFullData,
            goalsFullData,
            thoughtsFullData
          ] = await Promise.all([
            loadCollection('consumptions', 999999),
            loadCollection('dailyLogs', 999999),
            loadCollection('reflections', 999999),
            loadCollection('wellbeingLogs', 999999),
            loadCollection('cycles', 999999),
            loadCollection('goals', 999999),
            loadCollection('thoughts', 999999)
          ]);

          setConsumptions(consumptionsFullData);
          setDailyLogs(dailyLogsFullData);
          setReflections(reflectionsFullData);
          setWellbeingLogs(wellbeingLogsFullData);
          setCycles(cyclesFullData);
          setGoals(goalsFullData);
          setThoughts(thoughtsFullData);

          console.log('[LocalData] ✅ FASE 2 completa - Todos os dados carregados!');
        } catch (error) {
          console.error('[LocalData] Erro na FASE 2 (background):', error);
        } finally {
          setBackgroundLoading(false);
        }
      }, 500); // Esperar 500ms antes de carregar resto

    } catch (error) {
      console.error('[LocalData] Erro ao carregar dados (FASE 1):', error);
      setLoading(false);
    }
  }, [encryptionKey, loadCollection]);

  // Carregar dados quando encryptionKey estiver disponível
  useEffect(() => {
    if (encryptionKey) {
      loadAllCollections();
    }
  }, [encryptionKey, loadAllCollections]);

  /**
   * CRUD: Adicionar item
   */
  const addItem = useCallback(async (collectionName, item) => {
    if (!encryptionKey) {
      throw new Error('PIN não disponível - faça login primeiro');
    }

    const salt = await getUserSalt();

    // Encriptar campos sensíveis
    const encrypted = await encryptItem(collectionName, item, encryptionKey, salt);

    // Adicionar ao Dexie com metadados de sync
    const saved = await addItemWithSync(collectionName, encrypted);

    // Desencriptar para retornar
    const decrypted = await decryptItem(collectionName, saved, encryptionKey, salt);

    // Atualizar estado local
    const setterMap = {
      consumptions: setConsumptions,
      dailyLogs: setDailyLogs,
      reflections: setReflections,
      wellbeingLogs: setWellbeingLogs,
      cycles: setCycles,
      goals: setGoals,
      thoughts: setThoughts
    };

    const setter = setterMap[collectionName];
    if (setter) {
      // Prevenir duplicados: se ID já existe, substituir em vez de adicionar
      setter(prev => {
        const existingIndex = prev.findIndex(item => item.id === decrypted.id);
        if (existingIndex >= 0) {
          // ID já existe - substituir (isto cobre casos de uso incorreto de addItem)
          console.warn(`[LocalData] ⚠️ addItem chamado com ID existente: ${collectionName}/${decrypted.id} - substituindo`);
          return prev.map((item, i) => i === existingIndex ? decrypted : item);
        }
        // ID novo - adicionar ao início
        return [decrypted, ...prev];
      });
    }


    return decrypted;
  }, [encryptionKey, getUserSalt]);

  /**
   * CRUD: Atualizar item
   */
  const updateItem = useCallback(async (collectionName, id, updates) => {
    if (!encryptionKey) {
      throw new Error('PIN não disponível');
    }

    const salt = await getUserSalt();

    // Encriptar campos sensíveis nos updates
    const encryptedUpdates = await encryptItem(collectionName, updates, encryptionKey, salt);

    // Atualizar no Dexie
    const updated = await updateItemWithSync(collectionName, id, encryptedUpdates);

    // Desencriptar para retornar
    const decrypted = await decryptItem(collectionName, updated, encryptionKey, salt);

    // Atualizar estado local
    const setterMap = {
      consumptions: setConsumptions,
      dailyLogs: setDailyLogs,
      reflections: setReflections,
      wellbeingLogs: setWellbeingLogs,
      cycles: setCycles,
      goals: setGoals,
      thoughts: setThoughts
    };

    const setter = setterMap[collectionName];
    if (setter) {
      setter(prev => prev.map(item => item.id === id ? decrypted : item));
    }


    return decrypted;
  }, [encryptionKey, getUserSalt]);

  /**
   * CRUD: Deletar item (soft delete)
   */
  const deleteItem = useCallback(async (collectionName, id) => {
    if (!encryptionKey) {
      throw new Error('PIN não disponível');
    }

    // Soft delete (marca como deleted para sync)
    await deleteItemWithSync(collectionName, id);

    // Remover do estado local
    const setterMap = {
      consumptions: setConsumptions,
      dailyLogs: setDailyLogs,
      reflections: setReflections,
      wellbeingLogs: setWellbeingLogs,
      cycles: setCycles,
      goals: setGoals,
      thoughts: setThoughts
    };

    const setter = setterMap[collectionName];
    if (setter) {
      setter(prev => {
        const filtered = prev.filter(item => item.id !== id);
        console.log(`[LocalData] 🗑️ Removido do estado React: ${collectionName}/${id} (antes: ${prev.length}, depois: ${filtered.length})`);
        return filtered;
      });
    } else {
      console.warn(`[LocalData] ⚠️ Setter não encontrado para ${collectionName}`);
    }

  }, [encryptionKey]);

  /**
   * Obter items pendentes de sync
   */
  const getPendingSyncItems = useCallback(async (collectionName) => {
    return await getPendingSync(collectionName);
  }, []);

  /**
   * Marcar item como sincronizado
   */
  const markItemAsSynced = useCallback(async (collectionName, id) => {
    await markAsSynced(collectionName, id);
  }, []);

  const value = {
    // Estado
    loading,
    backgroundLoading,
    consumptions,
    dailyLogs,
    reflections,
    wellbeingLogs,
    cycles,
    goals,
    thoughts,

    // CRUD operations
    addItem,
    updateItem,
    deleteItem,

    // Sync helpers
    getPendingSyncItems,
    markItemAsSynced,

    // Reload
    loadAllCollections
  };

  return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
};
