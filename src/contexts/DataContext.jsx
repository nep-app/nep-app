import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../utils/firebase';
import { useLocalData } from './LocalDataContext';
import { useAuth } from './AuthContext';
import { syncService } from '../services/syncService';

const DataContext = createContext();

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
    addItem,
    updateItem,
    deleteItem,
    loadAllCollections
  } = useLocalData();

  // Coping strategies (legacy - vazio por agora)
  const [copingStrategies, setCopingStrategies] = useState([]);

  // Loading combinado (Firebase auth + LocalData)
  const loading = firebaseLoading || localLoading;

  // Sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('[DataContext] Firebase auth state:', currentUser?.uid || 'logged out');
      setUser(currentUser);
      setFirebaseLoading(false);
    });
    return unsubscribe;
  }, [auth]);

  // Inicializar SyncService quando tudo estiver pronto
  useEffect(() => {
    const initSync = async () => {
      if (!user || !pin || !db) {
        console.log('[DataContext] Aguardando user + PIN + db...');
        return;
      }

      try {
        console.log('[DataContext] Inicializando SyncService...');

        const salt = await getUserSalt();

        // Inicializar sync service
        await syncService.init(db, user, pin, salt);

        // PULL inicial: Importar dados do Firebase (se necessário)
        setIsSyncing(true);
        await syncService.pullFromFirebase();

        // Recarregar dados locais após PULL
        await loadAllCollections();

        // PUSH: Enviar mudanças pendentes
        await syncService.pushToFirebase();

        setLastSyncTime(new Date());
        setIsSyncing(false);

        // Ativar auto-sync (a cada 5min)
        syncService.startAutoSync(5);

        console.log('[DataContext] ✅ SyncService inicializado!');
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
      }
    };
  }, [user, pin, db, getUserSalt, loadAllCollections]);

  /**
   * CRUD Operations - Wrapper para LocalData com auto-sync
   */

  const addConsumption = useCallback(async (item) => {
    const result = await addItem('consumptions', item);
    // Trigger sync em background
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const deleteConsumption = useCallback(async (id) => {
    await deleteItem('consumptions', id);
    setTimeout(() => syncService.pushToFirebase(), 1000);
  }, [deleteItem]);

  const addDailyLog = useCallback(async (item) => {
    const result = await addItem('dailyLogs', item);
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const addReflection = useCallback(async (item) => {
    const result = await addItem('reflections', item);
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const addWellbeingLog = useCallback(async (item) => {
    const result = await addItem('wellbeingLogs', item);
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const addCycle = useCallback(async (item) => {
    const result = await addItem('cycles', item);
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const updateCycle = useCallback(async (id, updates) => {
    const result = await updateItem('cycles', id, updates);
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [updateItem]);

  const deleteCycle = useCallback(async (id) => {
    await deleteItem('cycles', id);
    setTimeout(() => syncService.pushToFirebase(), 1000);
  }, [deleteItem]);

  const addGoal = useCallback(async (item) => {
    const result = await addItem('goals', item);
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  const updateGoal = useCallback(async (id, updates) => {
    const result = await updateItem('goals', id, updates);
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [updateItem]);

  const deleteGoal = useCallback(async (id) => {
    await deleteItem('goals', id);
    setTimeout(() => syncService.pushToFirebase(), 1000);
  }, [deleteItem]);

  const addCopingStrategy = useCallback(async (item) => {
    // Legacy - não usado
    console.warn('[DataContext] addCopingStrategy não implementado');
  }, []);

  const deleteCopingStrategy = useCallback(async (id) => {
    // Legacy - não usado
    console.warn('[DataContext] deleteCopingStrategy não implementado');
  }, []);

  const addThought = useCallback(async (item) => {
    const result = await addItem('thoughts', item);
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  /**
   * Função manual de sync (para botão nas settings)
   */
  const manualSync = useCallback(async () => {
    if (isSyncing) {
      console.log('[DataContext] Já está sincronizando...');
      return;
    }

    setIsSyncing(true);
    try {
      await syncService.sync();
      await loadAllCollections();
      setLastSyncTime(new Date());
      console.log('[DataContext] ✅ Sync manual completo');
    } catch (error) {
      console.error('[DataContext] ❌ Erro no sync manual:', error);
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
    addCopingStrategy,
    deleteCopingStrategy,
    addThought,

    // Sync info
    isSyncing,
    lastSyncTime,
    manualSync
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
