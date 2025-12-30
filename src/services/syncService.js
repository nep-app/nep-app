import { collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db as dexieDB } from '../db/localDB';
import { encryptForFirebase, decryptFromFirebase } from '../utils/dexieEncryption';

// Helper functions (moved from dexieDB.js to use correct DB)
const getAllItems = async (collectionName) => {
  const all = await dexieDB[collectionName].toArray();
  return all.filter(item => !item.deleted);
};

const markAsSynced = async (collectionName, id) => {
  await dexieDB[collectionName].update(id, { syncStatus: 'synced' });
};

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
    this.isSyncing = false;  // Para fullSync apenas
    this.isPushing = false;  // Para pushToFirebase apenas
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

  }

  /**
   * PULL: Importar dados do Firebase para Dexie (primeira vez)
   *
   * Verifica se já existe dados locais. Se não, importa tudo do Firebase.
   * Se o UID mudou, LIMPA Dexie e FAZ PULL (novo user logado).
   */
  async pullFromFirebase(forcePull = false) {
    if (!this.firebaseDB || !this.firebaseUser || !this.pin || !this.salt) {
      return;
    }


    try {
      for (const collectionName of COLLECTIONS) {
        // Se forcePull, pula a verificação local
        if (!forcePull) {
          // Verificar se já existe dados locais
          const localItems = await getAllItems(collectionName);

          if (localItems.length > 0) {
            continue;
          }
        } else {
        }

        // Buscar do Firebase
        const firebasePath = `users/${this.firebaseUser.uid}/${collectionName}`;
        const firebaseCollection = collection(this.firebaseDB, firebasePath);
        const snapshot = await getDocs(firebaseCollection);


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

      }

    } catch (error) {
      console.error('[Sync] ❌ Erro no PULL:', error);
      throw error;
    }
  }

  /**
   * FORÇAR: Marcar TODOS os items locais como pending
   * Usa quando sync está quebrado e precisa forçar tudo
   */
  async forceMarkAllPending() {
    console.log('[Sync] 🔧 Forçando TODOS os items para pending...');

    let totalMarked = 0;
    for (const collectionName of COLLECTIONS) {
      const allItems = await dexieDB[collectionName].toArray();

      for (const item of allItems) {
        if (!item.deleted) {
          await dexieDB[collectionName].update(item.id, {
            syncStatus: 'pending',
            lastModified: new Date().toISOString()
          });
          totalMarked++;
        }
      }
    }

    console.log(`[Sync] ✅ ${totalMarked} items marcados como pending`);
    return totalMarked;
  }

  /**
   * PUSH: Enviar dados pendentes do Dexie para Firebase (encriptados)
   */
  async pushToFirebase() {
    if (!this.firebaseDB || !this.firebaseUser || !this.pin || !this.salt) {
      console.log('[Sync] ⚠️ pushToFirebase: não inicializado');
      return;
    }

    if (this.isPushing) {
      console.log('[Sync] ⚠️ pushToFirebase: já em curso');
      return;
    }

    this.isPushing = true;
    console.log('[Sync] 🔄 pushToFirebase INICIADO');

    try {

      let totalPushed = 0;

      for (const collectionName of COLLECTIONS) {
        // Buscar items pendentes
        const pendingItems = await dexieDB[collectionName]
          .where('syncStatus')
          .equals('pending')
          .toArray();

        // LOG: Mostrar TODAS as coleções, mesmo se 0 pending
        console.log(`[Sync] 📊 ${collectionName}: ${pendingItems.length} pendentes`);

        if (pendingItems.length === 0) {
          continue;
        }

        console.log(`[Sync] 📤 ${collectionName}: Enviando ${pendingItems.length} items...`);

        for (const item of pendingItems) {
          try {
            const firebasePath = `users/${this.firebaseUser.uid}/${collectionName}`;

            if (item.deleted) {
              // Deletar no Firebase
              const docRef = doc(this.firebaseDB, firebasePath, item.id);
              await deleteDoc(docRef);
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
              console.log(`[Sync] ✅ Enviado: ${collectionName}/${item.id}`);
            }

            // Marcar como sincronizado
            await markAsSynced(collectionName, item.id);
            totalPushed++;
          } catch (error) {
            console.error(`[Sync] ❌ Erro ao sincronizar item ${item.id}:`, error);
          }
        }
      }

      console.log(`[Sync] ✅ pushToFirebase COMPLETO - ${totalPushed} items enviados`);

    } catch (error) {
      console.error('[Sync] ❌ Erro no PUSH:', error);
    } finally {
      this.isPushing = false;
    }
  }

  /**
   * Sync completo: PULL + PUSH
   */
  async sync() {
    await this.pullFromFirebase();
    await this.pushToFirebase();
  }

  /**
   * Sincronização completa bidirecional com merge de dados
   * Usa timestamps para resolver conflitos (last-write-wins)
   */
  async fullSync() {
    if (!this.firebaseDB || !this.firebaseUser || !this.pin || !this.salt) {
      throw new Error('Sync não inicializado');
    }

    if (this.isSyncing) {
      throw new Error('Sincronização já em curso');
    }

    this.isSyncing = true;

    try {
      let totalMerged = 0;
      let totalPushed = 0;
      let totalPulled = 0;
      let totalSkipped = 0;

      for (const collectionName of COLLECTIONS) {
        // 1. Buscar TODOS os dados do Firebase
        const firebasePath = `users/${this.firebaseUser.uid}/${collectionName}`;
        const firebaseCollection = collection(this.firebaseDB, firebasePath);
        const snapshot = await getDocs(firebaseCollection);

        const firebaseItems = new Map();
        for (const docSnap of snapshot.docs) {
          try {
            const firebaseData = docSnap.data();

            // Desencriptar
            let item;
            if (firebaseData.encrypted === true && firebaseData.data && firebaseData.iv) {
              item = await decryptFromFirebase(firebaseData.data, firebaseData.iv, this.pin, this.salt);
            } else {
              item = { ...firebaseData };
            }

            item.lastModified = firebaseData.lastModified || item.lastModified || new Date().toISOString();
            firebaseItems.set(docSnap.id, item);
          } catch (error) {
            console.error(`[Sync] ⚠️ Erro ao desencriptar item ${docSnap.id} de ${collectionName}:`, error.message);
            totalSkipped++;
            // Continuar com próximo item
          }
        }

        // 2. Buscar TODOS os dados locais
        const localItems = await dexieDB[collectionName].toArray();

        // 3. Merge: comparar timestamps e manter versão mais recente
        for (const localItem of localItems) {
          const firebaseItem = firebaseItems.get(localItem.id);

          if (!firebaseItem) {
            // Item só existe localmente → PUSH para Firebase
            if (!localItem.deleted) {
              const { data, iv } = await encryptForFirebase(localItem, this.pin, this.salt);
              const firebaseData = {
                encrypted: true,
                data,
                iv,
                lastModified: localItem.lastModified || new Date().toISOString()
              };
              const docRef = doc(this.firebaseDB, firebasePath, localItem.id);
              await setDoc(docRef, firebaseData);
              await markAsSynced(collectionName, localItem.id);
              totalPushed++;
            }
          } else {
            // Item existe em ambos → comparar timestamps
            const localTime = new Date(localItem.lastModified || '1970-01-01');
            const firebaseTime = new Date(firebaseItem.lastModified || '1970-01-01');

            if (firebaseTime > localTime) {
              // Firebase mais recente → atualizar local
              firebaseItem.syncStatus = 'synced';
              firebaseItem.deleted = false;
              await dexieDB[collectionName].put(firebaseItem);
              totalPulled++;
            } else if (localTime > firebaseTime) {
              // Local mais recente → atualizar Firebase
              if (!localItem.deleted) {
                const { data, iv } = await encryptForFirebase(localItem, this.pin, this.salt);
                const firebaseData = {
                  encrypted: true,
                  data,
                  iv,
                  lastModified: localItem.lastModified
                };
                const docRef = doc(this.firebaseDB, firebasePath, localItem.id);
                await setDoc(docRef, firebaseData);
                await markAsSynced(collectionName, localItem.id);
                totalPushed++;
              }
            } else {
              // Timestamps iguais → já sincronizado
              totalMerged++;
            }

            // Remover do Map para saber quais items só existem no Firebase
            firebaseItems.delete(localItem.id);
          }
        }

        // 4. Items que só existem no Firebase → PULL para local
        for (const [itemId, firebaseItem] of firebaseItems) {
          firebaseItem.syncStatus = 'synced';
          firebaseItem.deleted = false;
          await dexieDB[collectionName].put(firebaseItem);
          totalPulled++;
        }
      }

      return {
        success: true,
        pushed: totalPushed,
        pulled: totalPulled,
        merged: totalMerged,
        skipped: totalSkipped
      };

    } catch (error) {
      console.error('[Sync] Erro na sincronização completa:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Iniciar listeners em tempo real (para mudanças de outros dispositivos)
   */
  startRealtimeSync() {
    if (!this.firebaseDB || !this.firebaseUser) {
      return;
    }

    // Parar listeners existentes
    this.stopRealtimeSync();

    // Criar listener para cada coleção
    for (const collectionName of COLLECTIONS) {
      const firebasePath = `users/${this.firebaseUser.uid}/${collectionName}`;
      const firebaseCollection = collection(this.firebaseDB, firebasePath);

      // Listener em tempo real
      const unsubscribe = onSnapshot(firebaseCollection, async (snapshot) => {
        try {
          for (const change of snapshot.docChanges()) {
            const firebaseData = change.doc.data();
            const itemId = change.doc.id;

            if (change.type === 'removed') {
              // Item deletado no Firebase → deletar localmente
              const localItem = await dexieDB[collectionName].get(itemId);
              if (localItem && !localItem.deleted) {
                await dexieDB[collectionName].update(itemId, {
                  deleted: true,
                  syncStatus: 'synced',
                  lastModified: new Date().toISOString()
                });
              }
            } else if (change.type === 'added' || change.type === 'modified') {
              // Item novo ou modificado no Firebase
              const localItem = await dexieDB[collectionName].get(itemId);

              // Só atualizar se: (1) não existe localmente OU (2) Firebase é mais recente
              const firebaseTime = new Date(firebaseData.lastModified || '1970-01-01').getTime();
              const localTime = localItem ? new Date(localItem.lastModified || '1970-01-01').getTime() : 0;
              const shouldUpdate = !localItem || firebaseTime > localTime;

              if (shouldUpdate) {
                try {
                  // Desencriptar dados do Firebase
                  let item;
                  if (firebaseData.encrypted === true && firebaseData.data && firebaseData.iv) {
                    item = await decryptFromFirebase(firebaseData.data, firebaseData.iv, this.pin, this.salt);
                  } else {
                    item = { ...firebaseData };
                  }

                  // Adicionar metadados
                  item.syncStatus = 'synced';
                  item.lastModified = firebaseData.lastModified || new Date().toISOString();
                  item.deleted = false;

                  // Atualizar localmente
                  await dexieDB[collectionName].put(item);
                  console.log(`[Sync] ✅ Atualizado de outro dispositivo: ${collectionName}/${itemId}`);
                } catch (decryptError) {
                  console.error(`[Sync] ⚠️ Erro ao desencriptar item ${itemId}:`, decryptError.message);
                }
              }
            }
          }
        } catch (error) {
          console.error(`[Sync] ❌ Erro no listener de ${collectionName}:`, error);
        }
      });

      this.listeners[collectionName] = unsubscribe;
    }

  }

  /**
   * Parar listeners
   */
  stopRealtimeSync() {
    Object.values(this.listeners).forEach(unsubscribe => unsubscribe());
    this.listeners = {};
  }

  /**
   * Agendar sync automático (a cada X minutos)
   */
  startAutoSync(intervalMinutes = 5) {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(() => {
      this.pushToFirebase(); // Apenas PUSH automático
    }, intervalMinutes * 60 * 1000);

  }

  /**
   * Parar sync automático
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
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
  }
}

// Singleton instance
export const syncService = new SyncService();

export default syncService;
