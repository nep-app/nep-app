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
    loadAllCollections,
    getPendingSyncItems
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

        if (lastUID && lastUID !== currentUID) {
          // User mudou - guardar novo UID
          await setMetadata('lastFirebaseUID', currentUID);
        } else if (!lastUID) {
          await setMetadata('lastFirebaseUID', currentUID);
        }

        // ❌ SYNC INICIAL DESATIVADO
        // Sync 100% MANUAL - utilizador controla quando sincronizar
        // (Antes fazia fullSync() aqui no boot, agora não)

        // ❌ AUTO-SYNC DESATIVADO (sincronizar só quando utilizador pedir)
        // syncService.startAutoSync(5);

        // ❌ REALTIME SYNC DESATIVADO (mais rápido + menos bateria)
        // syncService.startRealtimeSync();

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
   * CRUD Operations - Wrapper para LocalData (SEM auto-sync)
   * Sincronização é 100% MANUAL (utilizador controla quando sincronizar)
   */

  const addConsumption = useCallback(async (item) => {
    const result = await addItem('consumptions', item);
    console.log('[DataContext] ✅ Item adicionado:', item.id);
    // ❌ AUTO-PUSH DESATIVADO - sincronizar manualmente
    return result;
  }, [addItem]);

  const deleteConsumption = useCallback(async (id) => {
    await deleteItem('consumptions', id);
    // ❌ AUTO-PUSH DESATIVADO
  }, [deleteItem]);

  const addDailyLog = useCallback(async (item) => {
    const result = await addItem('dailyLogs', item);
    // ❌ AUTO-PUSH DESATIVADO
    return result;
  }, [addItem]);

  const addReflection = useCallback(async (item) => {
    const result = await addItem('reflections', item);
    // ❌ AUTO-PUSH DESATIVADO
    return result;
  }, [addItem]);

  const addWellbeingLog = useCallback(async (item) => {
    const result = await addItem('wellbeingLogs', item);
    console.log('[DataContext] ✅ Wellbeing adicionado:', item.id);
    // ❌ AUTO-PUSH DESATIVADO
    return result;
  }, [addItem]);

  const addCycle = useCallback(async (item) => {
    const result = await addItem('cycles', item);
    // ❌ AUTO-PUSH DESATIVADO
    return result;
  }, [addItem]);

  const updateCycle = useCallback(async (id, updates) => {
    const result = await updateItem('cycles', id, updates);
    // ❌ AUTO-PUSH DESATIVADO
    return result;
  }, [updateItem]);

  const deleteCycle = useCallback(async (id) => {
    await deleteItem('cycles', id);
    // ❌ AUTO-PUSH DESATIVADO
  }, [deleteItem]);

  const addGoal = useCallback(async (item) => {
    const result = await addItem('goals', item);
    // ❌ AUTO-PUSH DESATIVADO
    return result;
  }, [addItem]);

  const updateGoal = useCallback(async (id, updates) => {
    const result = await updateItem('goals', id, updates);
    // ❌ AUTO-PUSH DESATIVADO
    return result;
  }, [updateItem]);

  const deleteGoal = useCallback(async (id) => {
    await deleteItem('goals', id);
    // ❌ AUTO-PUSH DESATIVADO
  }, [deleteItem]);

  const addCopingStrategy = useCallback(async (item) => {
    // Legacy - não usado
  }, []);

  const deleteCopingStrategy = useCallback(async (id) => {
    // Legacy - não usado
  }, []);

  const addThought = useCallback(async (item) => {
    const result = await addItem('thoughts', item);
    // ❌ AUTO-PUSH DESATIVADO
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

    try {
      // PUSH: Enviar apenas items pendentes (novos/alterados)
      console.log('[DataContext] 🔼 PUSH: Enviando items pendentes...');
      await syncService.pushToFirebase();

      // PULL: Receber alterações recentes do Firebase
      console.log('[DataContext] 🔽 PULL: Recebendo do Firebase...');
      const result = await syncService.fullSync({
        skipZombies: true,  // Ignorar items antigos não desencriptáveis
        maxAge: 7           // Sincronizar últimos 7 dias (rápido)
      });

      await loadAllCollections();
      setLastSyncTime(new Date());
      return result;
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
    updateItem, // Generic update for all collections
    deleteItem, // Generic delete for all collections

    // Sync info
    isSyncing,
    lastSyncTime,
    manualSync,
    countPendingItems
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
