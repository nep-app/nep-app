import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../utils/firebase';
import { useLocalData } from './LocalDataContext';
import { useAuth } from './AuthContext';
import { syncService } from '../services/syncService';
import { getDataMode, syncResearchData } from '../services/researchService';
import { getMetadata, setMetadata } from '../db/localDB';

export const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

/**
 * DataProvider V2 - Usa LocalData (Dexie) + Firebase Sync
 *
 * Estratégia:
 * - Dados vêm do LocalDataContext (rápido, encriptado, offline)
 * - SyncService sincroniza com Firebase em background
 * - Mantém mesma interface que DataProvider antigo (compatibilidade)
 */
export const DataProvider = ({ children }) => {
  // Firebase init (ainda precisamos para sync)
  const { app, auth, db } = useMemo(() => {
    const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    return {
      app: firebaseApp,
      auth: getAuth(firebaseApp),
      db: getFirestore(firebaseApp)
    };
  }, []);

  // Firebase user state
  const [user, setUser] = useState(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);

  // Auth context (para PIN)
  const { encryptionKey: pin, getUserSalt } = useAuth();

  // LocalData context (dados locais encriptados)
  const {
    loading: localLoading,
    consumptions,
    dailyLogs,
    reflections,
    wellbeingLogs,
    cycles,
    goals,
    thoughts,
    healthLogs,
    addItem,
    updateItem,
    deleteItem,
    loadAllCollections,
    loadFullData,
    getPendingSyncItems,
    allDataLoaded,
    fullDataLoaded,
  } = useLocalData();

  // Coping strategies (legacy - vazio por agora)
  const [copingStrategies, setCopingStrategies] = useState([]);

  // Loading combinado (Firebase auth + LocalData)
  const loading = firebaseLoading || localLoading;

  // Sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncReady, setSyncReady] = useState(false);

  // Ref para dados actuais (usado no research sync sem stale closures)
  const currentDataRef = useRef({});
  useEffect(() => {
    currentDataRef.current = { consumptions, cycles, wellbeingLogs, reflections, thoughts, goals };
  }, [consumptions, cycles, wellbeingLogs, reflections, thoughts, goals]);

  // Research sync automático: uma vez por dia quando os dados estão carregados
  const researchSyncAttempted = useRef(false);
  useEffect(() => {
    if (getDataMode() !== 'research' || !allDataLoaded || !db) return;
    if (researchSyncAttempted.current) return;
    const last = localStorage.getItem('nep_research_last_sync');
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (last && new Date(last).getTime() > oneDayAgo) return;
    researchSyncAttempted.current = true;
    syncResearchData(db, currentDataRef.current);
  }, [allDataLoaded, db]);

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setFirebaseLoading(false);
    });
    return unsubscribe;
  }, [auth]);

  // Firebase authentication is now handled in App.jsx before PIN
  // User must login with email/password FIRST, then enter PIN

  // Inicializar SyncService quando tudo estiver pronto
  useEffect(() => {
    const initSync = async () => {
      // Se não tem PIN, não faz nada
      if (!pin) {
        return;
      }

      // Modo local-only: sem sync com Firebase
      if (getDataMode() === 'local') {
        setSyncReady(false);
        return;
      }

      // Aguardar Firebase auth state
      if (firebaseLoading) {
        return;
      }

      // Se não tem Firebase user, tentar novamente (auto-login deve ter falhado)
      if (!user) {
        return;
      }

      // Se tem user + pin, inicializa sync
      try {

        const salt = await getUserSalt();

        // Inicializar sync service
        await syncService.init(db, user, pin, salt);

        // Verificar se é um user diferente (UID mudou)
        const lastUID = await getMetadata('lastFirebaseUID');
        const currentUID = user.uid;

        if (lastUID && lastUID !== currentUID) {
          // User mudou - guardar novo UID
          await setMetadata('lastFirebaseUID', currentUID);
        } else if (!lastUID) {
          await setMetadata('lastFirebaseUID', currentUID);
        }

        // 🔄 MIGRAÇÃO: Garantir que todos os dados históricos do Firebase estão em local
        // Se `syncMigrationV1` não está definido, limpar o lastSyncTimestamp para que
        // o próximo manualSync faça um pull completo (não incremental) e busque tudo.
        const migrationDone = await getMetadata('syncMigrationV1');
        if (!migrationDone) {
          console.log('[DataContext] 🔄 Migração V1: limpando lastSyncTimestamp...');
          await setMetadata('lastSyncTimestamp', null);
          await setMetadata('syncMigrationV1', 'done');
        }

        setSyncReady(true);

      } catch (error) {
        console.error('[DataContext] ❌ Erro ao inicializar sync:', error);
        setIsSyncing(false);
      }
    };

    initSync();

    // Cleanup
    return () => {
      if (syncService) {
        syncService.stopAutoSync();
        syncService.stopRealtimeSync();
      }
    };
  }, [user, pin, db, getUserSalt, loadAllCollections, firebaseLoading]);

  // Auto-pull quando Dexie está vazio após carregamento completo (ex: novo dispositivo)
  const autoSyncAttempted = useRef(false);
  useEffect(() => {
    if (!allDataLoaded || !syncReady || isSyncing) return;
    if (autoSyncAttempted.current) return;

    const total = consumptions.length + dailyLogs.length + wellbeingLogs.length +
                  cycles.length + reflections.length + thoughts.length;
    if (total > 0) {
      autoSyncAttempted.current = true; // tem dados, não precisa de auto-pull
      return;
    }

    autoSyncAttempted.current = true;
    console.log('[DataContext] 📥 Dexie vazio após boot — pull automático do Firebase...');
    setIsSyncing(true);
    syncService.fullSync({ skipZombies: true, incremental: false })
      .then(result => {
        if (result?.pulled > 0 || result?.pushed > 0) return loadAllCollections();
      })
      .catch(err => console.warn('[DataContext] Auto-pull falhou:', err.message))
      .finally(() => setIsSyncing(false));
  }, [allDataLoaded, syncReady, isSyncing, consumptions, dailyLogs, wellbeingLogs, cycles, reflections, thoughts, loadAllCollections]);

  /**
   * CRUD Operations - AUTO-PUSH para Firebase
   * - Dados vão para Dexie (local) IMEDIATAMENTE
   * - PUSH para Firebase acontece 1s depois (automático)
   * - PULL/refresh do Firebase é 100% MANUAL (evita "refresh automático")
   */

  const addConsumption = useCallback(async (item) => {
    const result = await addItem('consumptions', item);
    console.log('[DataContext] ✅ Item adicionado:', item.id);
    // ✅ AUTO-PUSH: Enviar para Firebase após 1s
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const deleteConsumption = useCallback(async (id) => {
    await deleteItem('consumptions', id);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
  }, [deleteItem]);

  const addDailyLog = useCallback(async (item) => {
    const result = await addItem('dailyLogs', item);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const addReflection = useCallback(async (item) => {
    const result = await addItem('reflections', item);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const addWellbeingLog = useCallback(async (item) => {
    const result = await addItem('wellbeingLogs', item);
    console.log('[DataContext] ✅ Wellbeing adicionado:', item.id);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const addCycle = useCallback(async (item) => {
    const result = await addItem('cycles', item);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const updateCycle = useCallback(async (id, updates) => {
    const result = await updateItem('cycles', id, updates);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [updateItem]);

  const deleteCycle = useCallback(async (id) => {
    await deleteItem('cycles', id);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
  }, [deleteItem]);

  const addGoal = useCallback(async (item) => {
    const result = await addItem('goals', item);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const updateGoal = useCallback(async (id, updates) => {
    const result = await updateItem('goals', id, updates);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [updateItem]);

  const deleteGoal = useCallback(async (id) => {
    await deleteItem('goals', id);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
  }, [deleteItem]);

  const addThought = useCallback(async (item) => {
    const result = await addItem('thoughts', item);
    // ✅ AUTO-PUSH
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  /**
   * Contar quantos items estão pendentes de sincronização
   */
  const countPendingItems = useCallback(async () => {
    try {
      const collections = ['consumptions', 'dailyLogs', 'reflections', 'wellbeingLogs', 'cycles', 'goals', 'thoughts'];
      let totalPending = 0;

      for (const collectionName of collections) {
        const pending = await getPendingSyncItems(collectionName);
        totalPending += pending.length;
      }

      return totalPending;
    } catch (error) {
      console.error('[DataContext] Erro ao contar pending items:', error);
      return 0;
    }
  }, [getPendingSyncItems]);

  /**
   * Função manual de sync completo (para botão nas settings)
   * Faz merge bidirecional de todos os dados
   */
  const manualSync = useCallback(async () => {
    if (isSyncing) {
      throw new Error('Sincronização já em curso');
    }

    setIsSyncing(true);

    // Modo local-only: apenas recarrega dados locais
    if (getDataMode() === 'local') {
      try {
        await loadAllCollections();
        setLastSyncTime(new Date());
        return { pulled: 0, pushed: 0 };
      } finally {
        setIsSyncing(false);
      }
    }

    try {
      await syncService.pushToFirebase();
      const result = await syncService.fullSync({ skipZombies: true, incremental: true });
      if (result && (result.pulled > 0 || result.pushed > 0)) {
        await loadAllCollections();
        if (result.pulled > 0) loadFullData();
      }

      // Modo investigação: sincronizar dados anónimos
      if (getDataMode() === 'research') {
        syncResearchData(db, currentDataRef.current);
      }

      setLastSyncTime(new Date());
      return result;
    } catch (error) {
      console.error('[DataContext] Erro no sync manual:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, loadAllCollections, loadFullData, db]);

  /**
   * Force full sync: limpa lastSyncTimestamp, marca tudo pending, push + pull completo
   */
  const forcePushAll = useCallback(async () => {
    if (isSyncing) {
      throw new Error('Sincronização já em curso');
    }

    setIsSyncing(true);

    try {
      console.log('[ForceSync] A iniciar force sync completo...');
      // Limpar timestamp para forçar sync completo (não incremental)
      await setMetadata('lastSyncTimestamp', null);
      // Marcar todos itens locais como pending para garantir push
      const marked = await syncService.forceMarkAllPending();
      console.log(`[ForceSync] ${marked} items marcados como pending`);
      // Push de tudo para Firebase
      await syncService.pushToFirebase();
      // Pull de TUDO do Firebase (incremental: false ignora timestamp)
      const result = await syncService.fullSync({ skipZombies: true, incremental: false });
      console.log('[ForceSync] Resultado:', { pushed: result?.pushed, pulled: result?.pulled, merged: result?.merged, zombies: result?.zombies, success: result?.success });
      if (result && (result.pulled > 0 || result.pushed > 0)) {
        await loadAllCollections();
      }
      setLastSyncTime(new Date());
      return result;
    } catch (error) {
      console.error('[DataContext] Erro no force sync:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, loadAllCollections]);

  const value = {
    // Firebase (para compatibilidade)
    app,
    auth,
    db,
    user,
    loading,

    // Dados (do LocalData)
    consumptions,
    dailyLogs,
    reflections,
    wellbeingLogs,
    cycles,
    goals,
    copingStrategies,
    thoughts,
    healthLogs,

    // CRUD operations
    addConsumption,
    deleteConsumption,
    addDailyLog,
    addReflection,
    addWellbeingLog,
    addCycle,
    updateCycle,
    deleteCycle,
    addGoal,
    updateGoal,
    deleteGoal,
    addThought,
    updateItem, // Generic update for all collections
    deleteItem, // Generic delete for all collections

    // Sync info
    isSyncing,
    lastSyncTime,
    manualSync,
    forcePushAll,
    countPendingItems,

    // Carregamento histórico sob-demanda
    loadFullData,
    fullDataLoaded,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
