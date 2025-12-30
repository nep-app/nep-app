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
        const { getMetadata, setMetadata } = await import('../db/localDB');
        const lastUID = await getMetadata('lastFirebaseUID');
        const currentUID = user.uid;

        let shouldForcePull = false;

        if (lastUID && lastUID !== currentUID) {
          shouldForcePull = true;

          // Guardar novo UID
          await setMetadata('lastFirebaseUID', currentUID);
        } else if (!lastUID) {
          await setMetadata('lastFirebaseUID', currentUID);
        } else {
        }

        // PULL inicial: Importar dados do Firebase (se necessário)
        setIsSyncing(true);
        await syncService.pullFromFirebase(shouldForcePull);

        // Recarregar dados locais após PULL
        await loadAllCollections();

        // PUSH: Enviar mudanças pendentes
        await syncService.pushToFirebase();

        setLastSyncTime(new Date());
        setIsSyncing(false);

        // Ativar auto-sync (a cada 5min)
        syncService.startAutoSync(5);

        // Ativar sincronização em tempo real
        syncService.startRealtimeSync();

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

  /**
   * CRUD Operations - Wrapper para LocalData com auto-sync
   */

  const addConsumption = useCallback(async (item) => {
    const result = await addItem('consumptions', item);
    console.log('[DataContext] ✅ Item adicionado:', item.id);
    // Trigger sync em background
    setTimeout(() => {
      console.log('[DataContext] 🔄 Iniciando push para Firebase...');
      syncService.pushToFirebase();
    }, 1000);
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
    console.log('[DataContext] ✅ Wellbeing adicionado:', item.id);
    setTimeout(() => {
      console.log('[DataContext] 🔄 Iniciando push para Firebase...');
      syncService.pushToFirebase();
    }, 1000);
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
  }, []);

  const deleteCopingStrategy = useCallback(async (id) => {
    // Legacy - não usado
  }, []);

  const addThought = useCallback(async (item) => {
    const result = await addItem('thoughts', item);
    setTimeout(() => syncService.pushToFirebase(), 1000);
    return result;
  }, [addItem]);

  /**
   * Função manual de sync completo (para botão nas settings)
   * Faz merge bidirecional de todos os dados
   */
  const manualSync = useCallback(async () => {
    if (isSyncing) {
      throw new Error('Sincronização já em curso');
    }

    setIsSyncing(true);

    try {
      // FORÇAR: Marcar tudo como pending antes de sincronizar
      const totalMarked = await syncService.forceMarkAllPending();

      // PUSH direto - enviar TUDO para Firebase ANTES de fazer pull
      console.log('[DataContext] Fazendo PUSH de todos os items...');
      await syncService.pushToFirebase();

      // Agora fazer PULL (ignorar erros de desencriptação)
      try {
        console.log('[DataContext] Fazendo PULL do Firebase...');
        const result = await syncService.fullSync();
        await loadAllCollections();
        setLastSyncTime(new Date());
        return result;
      } catch (pullError) {
        console.warn('[DataContext] PULL falhou (items corrompidos), mas PUSH teve sucesso');
        // PUSH foi bem sucedido, então retornar sucesso parcial
        await loadAllCollections();
        setLastSyncTime(new Date());
        return { success: true, pushed: totalMarked, pulled: 0, merged: 0, skipped: 0 };
      }
    } catch (error) {
      console.error('[DataContext] Erro no sync manual:', error);
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
