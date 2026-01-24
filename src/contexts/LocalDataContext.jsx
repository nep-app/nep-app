import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../db/localDB';
import {
  encryptItem,
  decryptItem,
  encryptItems,
  decryptItems
} from '../utils/dexieEncryption';
import { updateUserStats } from '../utils/userStats';

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
  const [allDataLoaded, setAllDataLoaded] = useState(false); // True quando FASE 3 completa

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
        // Usar timestamp (data de criação) em vez de lastModified (data de sync)
        // Isto garante que filtramos por IDADE REAL do item, não quando foi sincronizado
        const itemDate = item.timestamp || item.createdAt || item.date || item.lastModified;
        if (!itemDate) return true; // Items sem data - carregar sempre (segurança)
        const itemTime = new Date(itemDate).getTime();
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
        // Usar timestamp (data de criação) em vez de lastModified (data de sync)
        const itemDate = item.timestamp || item.createdAt || item.date || item.lastModified;
        if (!itemDate) return true;
        const itemTime = new Date(itemDate).getTime();
        return itemTime >= cutoffTime;
      });

      // Encontrar PRIMEIRO item ever (mais antigo por timestamp/createdAt)
      const oldestItem = allItems.reduce((oldest, item) => {
        const itemDate = item.timestamp || item.createdAt || item.date || item.lastModified;
        if (!itemDate) return oldest;
        if (!oldest) return item;

        const oldestDate = oldest.timestamp || oldest.createdAt || oldest.date || oldest.lastModified;
        if (!oldestDate) return item;

        if (new Date(itemDate).getTime() < new Date(oldestDate).getTime()) {
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
   * Carregar todas as coleções (com LAZY LOADING em 3 fases)
   *
   * FASE 1 (INSTANTÂNEO <500ms): App pronta logo (stats do cache)
   * FASE 2 (BACKGROUND ~1-2s): Carrega últimos 7 dias (lista aparece)
   * FASE 3 (BACKGROUND ~10s): Carrega resto dos dados + actualiza stats
   *
   * Isto garante que a app abre INSTANTÂNEA e depois carrega dados progressivamente
   */
  const loadAllCollections = useCallback(async () => {
    if (!encryptionKey) {
      return;
    }

    setLoading(true);
    setAllDataLoaded(false); // Reset quando começar novo load

    try {
      // ⚡ FASE 1: App pronta IMEDIATAMENTE (sem desencriptar nada!)
      // Stats aparecem do cache (via useAnalysis), resto carrega em background
      console.log('[LocalData] ⚡ FASE 1: App pronta instantânea (stats do cache)...');

      setLoading(false); // App PRONTA já!
      console.log('[LocalData] ✅ FASE 1 completa - App pronta (<500ms)!');

      // 🔄 FASE 2: Carregar últimos 7 dias em background (lista aparece)
      setTimeout(async () => {
        try {
          setBackgroundLoading(true);
          console.log('[LocalData] 🔄 FASE 2: Carregando últimos 7 dias (lista aparece)...');

          const [
            consumptionsData,
            dailyLogsData,
            reflectionsData,
            wellbeingLogsData,
            cyclesData,
            goalsData,
            thoughtsData
          ] = await Promise.all([
            loadCollectionWithFirst('consumptions', 7),
            loadCollectionWithFirst('dailyLogs', 7),
            loadCollectionWithFirst('reflections', 7),
            loadCollectionWithFirst('wellbeingLogs', 7),
            loadCollectionWithFirst('cycles', 7),
            loadCollectionWithFirst('goals', 7),
            loadCollectionWithFirst('thoughts', 7)
          ]);

          setConsumptions(consumptionsData);
          setDailyLogs(dailyLogsData);
          setReflections(reflectionsData);
          setWellbeingLogs(wellbeingLogsData);
          setCycles(cyclesData);
          setGoals(goalsData);
          setThoughts(thoughtsData);

          console.log('[LocalData] ✅ FASE 2 completa - Lista apareceu!');

          // 🔄 FASE 3: Carregar TUDO em background (dados antigos + actualizar stats)
          setTimeout(async () => {
            try {
              // Verificar se FASE 2 já carregou TUDO
              const allItemsCount = await getAllItems('consumptions');
              if (consumptionsData.length >= allItemsCount.length) {
                console.log('[LocalData] ⚡ FASE 2 já carregou TUDO - skip FASE 3');

                // IMPORTANTE: Só atualizar stats se TODOS os goals foram carregados!
                // FASE 2 pode carregar goals parcialmente, então precisamos verificar
                const allGoals = await getAllItems('goals');
                if (goalsData.length >= allGoals.length && consumptionsData.length > 0) {
                  console.log('[LocalData] 📊 Atualizando stats pré-calculadas...');
                  await updateUserStats(consumptionsData, cyclesData, dailyLogsData, goalsData);
                  setAllDataLoaded(true); // Sinalizar que TUDO está carregado
                } else {
                  console.log('[LocalData] ⚠️ Goals parcialmente carregados - aguardar FASE 3 para stats');
                }

                setBackgroundLoading(false);
                return;
              }

              console.log('[LocalData] 🔄 FASE 3: Carregando dados antigos...');

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

              // Atualizar stats pré-calculadas (para próximo boot)
              console.log('[LocalData] 📊 Atualizando stats pré-calculadas...');
              await updateUserStats(consumptionsFullData, cyclesFullData, dailyLogsFullData, goalsFullData);

              setAllDataLoaded(true); // Sinalizar que FASE 3 está completa
              console.log('[LocalData] ✅ FASE 3 completa - Todos os dados carregados!');
            } catch (error) {
              console.error('[LocalData] Erro na FASE 3:', error);
            } finally {
              setBackgroundLoading(false);
            }
          }, 100); // FASE 3 começa 100ms depois da FASE 2

        } catch (error) {
          console.error('[LocalData] Erro na FASE 2:', error);
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
        const newData = existingIndex >= 0
          ? prev.map((item, i) => i === existingIndex ? decrypted : item)
          : [decrypted, ...prev];

        // Recalcular stats para consumptions (boot rápido futuro)
        if (collectionName === 'consumptions') {
          updateUserStats(newData).catch(err =>
            console.error('[LocalData] Erro ao atualizar stats:', err)
          );
        }

        return newData;
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

        // Recalcular stats para consumptions (boot rápido futuro)
        if (collectionName === 'consumptions') {
          updateUserStats(filtered).catch(err =>
            console.error('[LocalData] Erro ao atualizar stats:', err)
          );
        }

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
    allDataLoaded,
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
