import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import { useAuth } from './AuthContext';
import { db } from '../db/localDB';
import {
  encryptItem,
  decryptItem,
  encryptItems,
  decryptItems
} from '../utils/dexieEncryption';
import { updateUserStats, updateAppUsageStreak } from '../utils/userStats';

// Helper functions (using localDB instead of dexieDB)
const addItemWithSync = async (collection, item) => {
  const itemWithSync = {
    ...item,
    syncStatus: 'pending',
    lastModified: new Date().toISOString(),
    deleted: false
  };
  await db[collection].put(itemWithSync);
  logger.log(`[LocalData] ✅ Item adicionado: ${collection}/${item.id} - syncStatus: pending`);
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
  logger.log(`[LocalData] ✏️ Item atualizado: ${collection}/${id} - syncStatus: pending`);
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
  logger.log(`[LocalData] 🗑️ Item marcado como deleted: ${collection}/${id}`, { deleted: deleted.deleted, syncStatus: deleted.syncStatus });
  return deleted;
};

const getAllItems = async (collection) => {
  const all = await db[collection].toArray();
  const filtered = all.filter(item => !item.deleted);
  const deletedCount = all.length - filtered.length;
  if (deletedCount > 0) {
    logger.log(`[LocalData] 🗑️ ${collection}: ${deletedCount} deleted items filtrados (${filtered.length} ativos de ${all.length} total)`);
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

  // Cache do salt para evitar 8+ chamadas IndexedDB desnecessárias por boot
  const saltCache = useRef(null);
  useEffect(() => { saltCache.current = null; }, [encryptionKey]);
  const getCachedSalt = useCallback(async () => {
    if (!saltCache.current) saltCache.current = await getUserSalt();
    return saltCache.current;
  }, [getUserSalt]);

  // Estado para cada coleção
  const [consumptions, setConsumptions] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [wellbeingLogs, setWellbeingLogs] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [goals, setGoals] = useState([]);
  const [thoughts, setThoughts] = useState([]);
  const [healthLogs, setHealthLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [allDataLoaded, setAllDataLoaded] = useState(false);
  const [fullDataLoaded, setFullDataLoaded] = useState(false); // True quando FASE 3 completa

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
      const salt = await getCachedSalt();
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

      logger.log(`[LocalData] 📦 ${collectionName}: ${recentItems.length} recentes (últimos ${maxAgeDays}d) de ${allItems.length} total`);

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
      logger.error(`[LocalData] Erro ao carregar ${collectionName}:`, error);
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
      return { items: [], total: 0 };
    }

    try {
      const salt = await getCachedSalt();
      const allItems = await getAllItems(collectionName);

      if (allItems.length === 0) {
        return { items: [], total: 0 };
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

      logger.log(`[LocalData] 📦 ${collectionName}: ${recentItems.length} recentes (últimos ${maxAgeDays}d) + primeiro item de ${allItems.length} total`);

      // Desencriptar
      const decrypted = await decryptItems(collectionName, itemsToLoad, encryptionKey, salt);

      // Ordenar por timestamp desc (mais recente primeiro)
      const sorted = decrypted.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      return { items: sorted, total: allItems.length };
    } catch (error) {
      logger.error(`[LocalData] Erro ao carregar ${collectionName}:`, error);
      return { items: [], total: 0 };
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
      logger.log('[LocalData] ⚡ FASE 1: App pronta instantânea (stats do cache)...');

      setLoading(false); // App PRONTA já!
      updateAppUsageStreak(); // Registar abertura da app (streak de utilização)
      logger.log('[LocalData] ✅ FASE 1 completa - App pronta (<500ms)!');

      // 🔄 FASE 2: Carregar últimos 7 dias em background (lista aparece)
      setTimeout(async () => {
        try {
          setBackgroundLoading(true);
          logger.log('[LocalData] 🔄 FASE 2: Carregando últimos 7 dias (lista aparece)...');

          const [
            { items: consumptionsData, total: totalC },
            { items: dailyLogsData,    total: totalD },
            { items: reflectionsData,  total: totalR },
            { items: wellbeingLogsData,total: totalW },
            { items: cyclesData,       total: totalCy },
            { items: goalsData,        total: totalG },
            { items: thoughtsData,     total: totalT },
            { items: healthLogsData,   total: totalH }
          ] = await Promise.all([
            loadCollectionWithFirst('consumptions', 7),
            loadCollectionWithFirst('dailyLogs', 7),
            loadCollectionWithFirst('reflections', 7),
            loadCollectionWithFirst('wellbeingLogs', 7),
            loadCollectionWithFirst('cycles', 7),
            loadCollectionWithFirst('goals', 7),
            loadCollectionWithFirst('thoughts', 7),
            loadCollectionWithFirst('healthLogs', 7)
          ]);

          setConsumptions(consumptionsData);
          setDailyLogs(dailyLogsData);
          setReflections(reflectionsData);
          setWellbeingLogs(wellbeingLogsData);
          setCycles(cyclesData);
          setGoals(goalsData);
          setThoughts(thoughtsData);
          setHealthLogs(healthLogsData);

          // Totais já vêm da loadCollectionWithFirst — sem queries extra à DB
          const totalInDB = totalC + totalD + totalR + totalW + totalCy + totalG + totalT + totalH;
          const totalLoaded = consumptionsData.length + dailyLogsData.length + reflectionsData.length + wellbeingLogsData.length + cyclesData.length + goalsData.length + thoughtsData.length + healthLogsData.length;

          logger.log('[LocalData] ✅ FASE 2 completa - Lista apareceu!');
          setAllDataLoaded(true); // FASE 2 chega para o auto-pull check
          setBackgroundLoading(false);

          if (totalLoaded >= totalInDB) {
            // FASE 2 carregou tudo — actualizar stats e marcar Phase 3 como feita
            logger.log('[LocalData] ⚡ FASE 2 já carregou TUDO - stats actualizadas, skip FASE 3');
            updateUserStats(consumptionsData, cyclesData, dailyLogsData, goalsData, wellbeingLogsData, thoughtsData, reflectionsData)
              .catch(err => logger.error('[LocalData] Erro ao actualizar stats FASE 2:', err));
            setFullDataLoaded(true);
          }
          // Se há dados históricos, NÃO actualizar stats agora — o cache anterior tem o valor completo correcto.
          // Phase 3 (sob-demanda) actualizará quando o utilizador abrir Padrões/Análises/Histórico.

        } catch (error) {
          logger.error('[LocalData] Erro na FASE 2:', error);
          setBackgroundLoading(false);
        }
      }, 0); // Ceder ao event loop para UI renderizar, depois carregar dados

    } catch (error) {
      logger.error('[LocalData] Erro ao carregar dados (FASE 1):', error);
      setLoading(false);
    }
  }, [encryptionKey, loadCollectionWithFirst]);

  /**
   * FASE 3 (sob-demanda): Carregar TODOS os dados históricos
   * Chamado apenas quando o utilizador navega para Padrões/Análises/Histórico
   */
  const loadFullData = useCallback(async () => {
    if (fullDataLoaded || !encryptionKey) return;

    logger.log('[LocalData] 🔄 FASE 3 (demanda): Carregando dados históricos...');
    setBackgroundLoading(true);

    try {
      const [
        consumptionsFullData,
        dailyLogsFullData,
        reflectionsFullData,
        wellbeingLogsFullData,
        cyclesFullData,
        goalsFullData,
        thoughtsFullData,
        healthLogsFullData
      ] = await Promise.all([
        loadCollection('consumptions', 999999),
        loadCollection('dailyLogs', 999999),
        loadCollection('reflections', 999999),
        loadCollection('wellbeingLogs', 999999),
        loadCollection('cycles', 999999),
        loadCollection('goals', 999999),
        loadCollection('thoughts', 999999),
        loadCollection('healthLogs', 999999)
      ]);

      setConsumptions(consumptionsFullData);
      setDailyLogs(dailyLogsFullData);
      setReflections(reflectionsFullData);
      setWellbeingLogs(wellbeingLogsFullData);
      setCycles(cyclesFullData);
      setGoals(goalsFullData);
      setThoughts(thoughtsFullData);
      setHealthLogs(healthLogsFullData);

      await updateUserStats(consumptionsFullData, cyclesFullData, dailyLogsFullData, goalsFullData, wellbeingLogsFullData, thoughtsFullData, reflectionsFullData);
      setFullDataLoaded(true);
      logger.log('[LocalData] ✅ FASE 3 completa - Todos os dados carregados!');
    } catch (error) {
      logger.error('[LocalData] Erro na FASE 3:', error);
    } finally {
      setBackgroundLoading(false);
    }
  }, [encryptionKey, fullDataLoaded, loadCollection]);

  // Carregar dados quando encryptionKey estiver disponível
  useEffect(() => {
    if (encryptionKey) {
      loadAllCollections();
      setFullDataLoaded(false); // Reset Phase 3 quando chave muda
    }
  }, [encryptionKey, loadAllCollections]);

  /**
   * Helper: Recalcular stats pré-calculadas usando dados atuais
   */
  const recalculateStats = useCallback(() => {
    // Ler estados atuais e recalcular (async mas não esperamos)
    updateUserStats(consumptions, cycles, dailyLogs, goals, wellbeingLogs, thoughts, reflections).catch(err =>
      logger.error('[LocalData] Erro ao recalcular stats:', err)
    );
  }, [consumptions, cycles, dailyLogs, goals, wellbeingLogs, thoughts, reflections]);

  /**
   * CRUD: Adicionar item
   */
  const addItem = useCallback(async (collectionName, item) => {
    if (!encryptionKey) {
      throw new Error('PIN não disponível - faça login primeiro');
    }

    const salt = await getCachedSalt();

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
      thoughts: setThoughts,
      healthLogs: setHealthLogs
    };

    const setter = setterMap[collectionName];
    if (setter) {
      // Prevenir duplicados: se ID já existe, substituir em vez de adicionar
      setter(prev => {
        const existingIndex = prev.findIndex(item => item.id === decrypted.id);
        return existingIndex >= 0
          ? prev.map((item, i) => i === existingIndex ? decrypted : item)
          : [decrypted, ...prev];
      });

      // Recalcular stats para collections que afetam avisos (boot rápido futuro)
      if (['consumptions', 'cycles', 'dailyLogs', 'goals'].includes(collectionName)) {
        // Usar queueMicrotask para recalcular DEPOIS do setState completar (mais rápido que setTimeout!)
        queueMicrotask(() => recalculateStats());
      }
    }


    return decrypted;
  }, [encryptionKey, getCachedSalt, recalculateStats]);

  /**
   * CRUD: Atualizar item
   */
  const updateItem = useCallback(async (collectionName, id, updates) => {
    if (!encryptionKey) {
      throw new Error('PIN não disponível');
    }

    const salt = await getCachedSalt();

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
      thoughts: setThoughts,
      healthLogs: setHealthLogs
    };

    const setter = setterMap[collectionName];
    if (setter) {
      setter(prev => prev.map(item => item.id === id ? decrypted : item));

      // Recalcular stats para collections que afetam avisos (boot rápido futuro)
      if (['consumptions', 'cycles', 'dailyLogs', 'goals'].includes(collectionName)) {
        // Usar queueMicrotask para recalcular DEPOIS do setState completar (mais rápido que setTimeout!)
        queueMicrotask(() => recalculateStats());
      }
    }


    return decrypted;
  }, [encryptionKey, getCachedSalt, recalculateStats]);

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
      thoughts: setThoughts,
      healthLogs: setHealthLogs
    };

    const setter = setterMap[collectionName];
    if (setter) {
      setter(prev => {
        const filtered = prev.filter(item => item.id !== id);
        logger.log(`[LocalData] 🗑️ Removido do estado React: ${collectionName}/${id} (antes: ${prev.length}, depois: ${filtered.length})`);
        return filtered;
      });

      // Recalcular stats para collections que afetam avisos (boot rápido futuro)
      if (['consumptions', 'cycles', 'dailyLogs', 'goals'].includes(collectionName)) {
        // Usar queueMicrotask para recalcular DEPOIS do setState completar (mais rápido que setTimeout!)
        queueMicrotask(() => recalculateStats());
      }
    } else {
      logger.warn(`[LocalData] ⚠️ Setter não encontrado para ${collectionName}`);
    }

  }, [encryptionKey, recalculateStats]);

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
    fullDataLoaded,
    consumptions,
    dailyLogs,
    reflections,
    wellbeingLogs,
    cycles,
    goals,
    thoughts,
    healthLogs,

    // CRUD operations
    addItem,
    updateItem,
    deleteItem,

    // Sync helpers
    getPendingSyncItems,
    markItemAsSynced,

    // Reload
    loadAllCollections,
    loadFullData
  };

  return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
};
