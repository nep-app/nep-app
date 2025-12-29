import { collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db as dexieDB, markAsSynced, getAllItems } from '../db/dexieDB';
import { encryptForFirebase, decryptFromFirebase } from '../utils/dexieEncryption';

/**
 * SyncService - Sincronização bidirecional Dexie ↔ Firebase
 *
 * Estratégia:
 * 1. PULL (Firebase → Dexie): Na primeira vez, importar todos os dados do Firebase
 * 2. PUSH (Dexie → Firebase): Quando há mudanças locais, enviar para Firebase (encriptado)
 * 3. REALTIME: Listener do Firebase para mudanças de outros dispositivos
 *
 * Encriptação:
 * - Dados no Dexie: Campos sensíveis encriptados
 * - Dados no Firebase: TUDO encriptado (item completo)
 *
 * Resolução de conflitos:
 * - Last-write-wins (baseado em lastModified timestamp)
 */

const COLLECTIONS = [
  'consumptions',
  'dailyLogs',
  'reflections',
  'wellbeingLogs',
  'cycles',
  'goals',
  'thoughts'
];

class SyncService {
  constructor() {
    this.firebaseDB = null;
    this.firebaseUser = null;
    this.pin = null;
    this.salt = null;
    this.listeners = {}; // Realtime listeners
    this.isSyncing = false;
    this.syncQueue = [];
  }

  /**
   * Inicializar sync service
   */
  async init(firebaseDB, firebaseUser, pin, salt) {
    this.firebaseDB = firebaseDB;
    this.firebaseUser = firebaseUser;
    this.pin = pin;
    this.salt = salt;

    console.log('[Sync] Service initialized for user:', firebaseUser.uid);
  }

  /**
   * PULL: Importar dados do Firebase para Dexie (primeira vez)
   *
   * Verifica se já existe dados locais. Se não, importa tudo do Firebase.
   * Se o UID mudou, LIMPA Dexie e FAZ PULL (novo user logado).
   */
  async pullFromFirebase(forcePull = false) {
    if (!this.firebaseDB || !this.firebaseUser || !this.pin || !this.salt) {
      console.warn('[Sync] Service não inicializado');
      return;
    }

    console.log('[Sync] 🔄 Iniciando PULL do Firebase...');
    console.log('[Sync] 👤 Firebase UID:', this.firebaseUser.uid);
    console.log('[Sync] 🔑 Force PULL:', forcePull);

    try {
      for (const collectionName of COLLECTIONS) {
        // Se forcePull, pula a verificação local
        if (!forcePull) {
          // Verificar se já existe dados locais
          const localItems = await getAllItems(collectionName);

          if (localItems.length > 0) {
            console.log(`[Sync] ${collectionName}: ${localItems.length} items locais já existem, pulando PULL`);
            continue;
          }
        } else {
          console.log(`[Sync] ${collectionName}: FORCE PULL ativado, ignorando dados locais`);
        }

        // Buscar do Firebase
        const firebasePath = `users/${this.firebaseUser.uid}/${collectionName}`;
        const firebaseCollection = collection(this.firebaseDB, firebasePath);
        const snapshot = await getDocs(firebaseCollection);

        console.log(`[Sync] ${collectionName}: ${snapshot.size} items encontrados no Firebase`);

        // Importar para Dexie
        for (const docSnap of snapshot.docs) {
          const firebaseData = docSnap.data();

          // Firebase pode ter dados encriptados (novos) ou não-encriptados (antigos)
          let item;

          if (firebaseData.encrypted === true && firebaseData.data && firebaseData.iv) {
            // Dados encriptados (novo formato)
            item = await decryptFromFirebase(firebaseData.data, firebaseData.iv, this.pin, this.salt);
          } else {
            // Dados não-encriptados (formato antigo - compatibilidade)
            item = { ...firebaseData };
          }

          // Adicionar metadados de sync
          item.syncStatus = 'synced';
          item.lastModified = item.lastModified || new Date().toISOString();
          item.deleted = false;

          // Guardar no Dexie
          await dexieDB[collectionName].put(item);
        }

        console.log(`[Sync] ✅ ${collectionName}: ${snapshot.size} items importados`);
      }

      console.log('[Sync] ✅ PULL completo!');
    } catch (error) {
      console.error('[Sync] ❌ Erro no PULL:', error);
      throw error;
    }
  }

  /**
   * PUSH: Enviar dados pendentes do Dexie para Firebase (encriptados)
   */
  async pushToFirebase() {
    if (!this.firebaseDB || !this.firebaseUser || !this.pin || !this.salt) {
      console.warn('[Sync] Service não inicializado');
      return;
    }

    if (this.isSyncing) {
      console.log('[Sync] Já está sincronizando, aguardando...');
      return;
    }

    this.isSyncing = true;

    try {
      console.log('[Sync] 🔄 Iniciando PUSH para Firebase...');

      let totalPushed = 0;

      for (const collectionName of COLLECTIONS) {
        // Buscar items pendentes
        const pendingItems = await dexieDB[collectionName]
          .where('syncStatus')
          .equals('pending')
          .toArray();

        if (pendingItems.length === 0) {
          continue;
        }

        console.log(`[Sync] ${collectionName}: ${pendingItems.length} items pendentes`);

        for (const item of pendingItems) {
          try {
            const firebasePath = `users/${this.firebaseUser.uid}/${collectionName}`;

            if (item.deleted) {
              // Deletar no Firebase
              const docRef = doc(this.firebaseDB, firebasePath, item.id);
              await deleteDoc(docRef);
              console.log(`[Sync] 🗑️ Item deletado no Firebase: ${item.id}`);
            } else {
              // Encriptar TUDO antes de enviar
              const { data, iv } = await encryptForFirebase(item, this.pin, this.salt);

              const firebaseData = {
                encrypted: true,
                data,
                iv,
                lastModified: item.lastModified || new Date().toISOString()
              };

              // Salvar no Firebase
              const docRef = doc(this.firebaseDB, firebasePath, item.id);
              await setDoc(docRef, firebaseData);
              console.log(`[Sync] ✅ Item enviado para Firebase: ${item.id}`);
            }

            // Marcar como sincronizado
            await markAsSynced(collectionName, item.id);
            totalPushed++;
          } catch (error) {
            console.error(`[Sync] ❌ Erro ao sincronizar item ${item.id}:`, error);
          }
        }
      }

      console.log(`[Sync] ✅ PUSH completo! ${totalPushed} items sincronizados`);
    } catch (error) {
      console.error('[Sync] ❌ Erro no PUSH:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync completo: PULL + PUSH
   */
  async sync() {
    console.log('[Sync] 🔄 Iniciando sync completo...');
    await this.pullFromFirebase();
    await this.pushToFirebase();
    console.log('[Sync] ✅ Sync completo!');
  }

  /**
   * Iniciar listeners em tempo real (para mudanças de outros dispositivos)
   *
   * NOTA: Por enquanto desativado para evitar conflitos.
   * Implementar depois com resolução de conflitos adequada.
   */
  startRealtimeSync() {
    console.log('[Sync] Realtime sync não implementado ainda');
    // TODO: Implementar listeners do Firebase
  }

  /**
   * Parar listeners
   */
  stopRealtimeSync() {
    Object.values(this.listeners).forEach(unsubscribe => unsubscribe());
    this.listeners = {};
    console.log('[Sync] Realtime listeners parados');
  }

  /**
   * Agendar sync automático (a cada X minutos)
   */
  startAutoSync(intervalMinutes = 5) {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(() => {
      console.log('[Sync] Auto-sync triggered');
      this.pushToFirebase(); // Apenas PUSH automático
    }, intervalMinutes * 60 * 1000);

    console.log(`[Sync] Auto-sync ativado (a cada ${intervalMinutes}min)`);
  }

  /**
   * Parar sync automático
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('[Sync] Auto-sync desativado');
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopRealtimeSync();
    this.stopAutoSync();
    this.firebaseDB = null;
    this.firebaseUser = null;
    this.pin = null;
    this.salt = null;
    console.log('[Sync] Service destroyed');
  }
}

// Singleton instance
export const syncService = new SyncService();

export default syncService;
