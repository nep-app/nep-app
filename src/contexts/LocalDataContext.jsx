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
  return deleted;
};

const getAllItems = async (collection) => {
  const all = await db[collection].toArray();
  return all.filter(item => !item.deleted);
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
  console.log('[LocalDataContext] 🚀 Provider inicializando...');
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

  /**
   * Carregar dados de uma coleção (com desencriptação)
   */
  const loadCollection = useCallback(async (collectionName) => {
    if (!encryptionKey) {
      console.warn('[LocalData] encryptionKey não disponível, aguardando...');
      return [];
    }

    try {
      const salt = await getUserSalt();
      const items = await getAllItems(collectionName);

      // Desencriptar todos os items
      const decrypted = await decryptItems(collectionName, items, encryptionKey, salt);

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
   * Carregar todas as coleções
   */
  const loadAllCollections = useCallback(async () => {
    if (!encryptionKey) {
      console.log('[LocalData] Aguardando encryptionKey...');
      return;
    }

    setLoading(true);

    try {
      console.log('[LocalData] Carregando dados locais...');

      const [
        consumptionsData,
        dailyLogsData,
        reflectionsData,
        wellbeingLogsData,
        cyclesData,
        goalsData,
        thoughtsData
      ] = await Promise.all([
        loadCollection('consumptions'),
        loadCollection('dailyLogs'),
        loadCollection('reflections'),
        loadCollection('wellbeingLogs'),
        loadCollection('cycles'),
        loadCollection('goals'),
        loadCollection('thoughts')
      ]);

      setConsumptions(consumptionsData);
      setDailyLogs(dailyLogsData);
      setReflections(reflectionsData);
      setWellbeingLogs(wellbeingLogsData);
      setCycles(cyclesData);
      setGoals(goalsData);
      setThoughts(thoughtsData);

      console.log('[LocalData] ✅ Dados carregados:', {
        consumptions: consumptionsData.length,
        dailyLogs: dailyLogsData.length,
        reflections: reflectionsData.length,
        wellbeingLogs: wellbeingLogsData.length,
        cycles: cyclesData.length,
        goals: goalsData.length,
        thoughts: thoughtsData.length
      });
    } catch (error) {
      console.error('[LocalData] Erro ao carregar dados:', error);
    } finally {
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
      setter(prev => [decrypted, ...prev]);
    }

    console.log(`[LocalData] ✅ Item adicionado a ${collectionName}:`, item.id);

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

    console.log(`[LocalData] ✅ Item atualizado em ${collectionName}:`, id);

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
      setter(prev => prev.filter(item => item.id !== id));
    }

    console.log(`[LocalData] ✅ Item deletado de ${collectionName}:`, id);
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
    console.log(`[LocalData] Item marcado como synced: ${collectionName}/${id}`);
  }, []);

  const value = {
    // Estado
    loading,
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
