import { collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db as dexieDB } from '../db/localDB';
import { encryptForFirebase, decryptFromFirebase } from '../utils/dexieEncryption';
import { validateKey, validateSalt, createControlItem, SyncCircuitBreaker, SyncErrorLogger } from '../utils/syncValidation';
import { detectCorrectSalt, analyzeSaltConflict } from '../utils/saltDetective';
import { diagnoseSaltSituation } from '../utils/saltRecoveryCheck';

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

            // 🪦 TOMBSTONE: Sempre usar setDoc, nunca deleteDoc
            // Items deletados são marcados como deleted:true no Firebase
            // Isso previne ressurreição quando outros dispositivos fazem sync

            const { data, iv } = await encryptForFirebase(item, this.pin, this.salt);

            const firebaseData = {
              encrypted: true,
              data,
              iv,
              lastModified: item.lastModified || new Date().toISOString(),
              deleted: item.deleted || false  // 🪦 Tombstone flag
            };

            // Salvar no Firebase (mesmo se deleted)
            const docRef = doc(this.firebaseDB, firebasePath, item.id);
            await setDoc(docRef, firebaseData);

            if (item.deleted) {
              console.log(`[Sync] 🪦 Tombstone enviado: ${collectionName}/${item.id}`);
            } else {
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
   *
   * @param {Object} options - Opções de sync
   * @param {boolean} options.skipZombies - Se true, ignora items que falham desencriptação (padrão: true)
   * @param {boolean} options.incremental - Se true, sincroniza apenas desde último sync (padrão: true)
   * @param {number} options.maxAge - Idade máxima em dias para sincronizar (padrão: calculado automaticamente se incremental)
   */
  async fullSync(options = {}) {
    const { skipZombies = true, incremental = true, maxAge = null } = options;

    // 🚀 SYNC INCREMENTAL: Calcular maxAge baseado no último sync
    let effectiveMaxAge = maxAge;
    if (incremental && maxAge === null) {
      try {
        const { getMetadata } = await import('../db/metadata');
        const lastSyncStr = await getMetadata('lastSyncTimestamp');
        if (lastSyncStr) {
          const lastSync = new Date(lastSyncStr);
          const now = new Date();
          const daysSinceLastSync = Math.ceil((now - lastSync) / (1000 * 60 * 60 * 24));
          effectiveMaxAge = Math.max(daysSinceLastSync + 1, 7); // Mínimo 7 dias por segurança
          console.log(`[Sync] 🚀 INCREMENTAL: Sincronizando últimos ${effectiveMaxAge} dias (desde ${lastSync.toLocaleString()})`);
        } else {
          console.log('[Sync] 🚀 Primeiro sync - sincronizando tudo');
          effectiveMaxAge = null; // Primeiro sync = tudo
        }
      } catch (error) {
        console.warn('[Sync] ⚠️ Erro ao calcular incremental, fazendo full sync:', error);
        effectiveMaxAge = null;
      }
    }

    if (!this.firebaseDB || !this.firebaseUser || !this.pin || !this.salt) {
      throw new Error('Sync não inicializado');
    }

    if (this.isSyncing) {
      throw new Error('Sincronização já em curso');
    }

    this.isSyncing = true;

    try {
      // ✅ PASSO 1: VALIDAR CHAVE COM ITEM DE CONTROLO (CRÍTICO)
      console.log('[Sync] 🔐 Validando PIN e Salt antes de desencriptar dados...');

      // validateKey agora LANÇA ERRO se validação falhar
      await validateKey(
        this.firebaseDB,
        this.firebaseUser.uid,
        this.pin,
        this.salt
      );

      console.log('[Sync] ✅ Chave validada! Prosseguindo com sync...');

      if (skipZombies) {
        console.log('[Sync] 🧟 MODO SKIP ZOMBIES ATIVADO');
        console.log('[Sync]    Items que falham desencriptação serão IGNORADOS');
        console.log('[Sync]    Sync vai continuar mesmo com erros\n');
      }

      if (effectiveMaxAge) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - effectiveMaxAge);
        console.log(`[Sync] 📅 Sincronizando apenas items desde: ${cutoffDate.toISOString()}\n`);
      }

      // Inicializar circuit breaker e error logger
      // Se skipZombies = true, aumentar limite do circuit breaker para valor alto (basicamente desativa)
      const circuitBreaker = new SyncCircuitBreaker(skipZombies ? 9999 : 5);
      const errorLogger = new SyncErrorLogger();

      let totalMerged = 0;
      let totalPushed = 0;
      let totalPulled = 0;
      let totalSkipped = 0;
      let totalZombies = 0; // Items zombies ignorados

      // Guardar primeiro item que falhou para análise posterior
      let firstFailedItem = null;

      for (const collectionName of COLLECTIONS) {
        // ⛔ CIRCUIT BREAKER CHECK: Verificar ANTES de processar collection
        if (circuitBreaker.shouldStop()) {
          console.error(
            `[Sync] ⛔ SYNC COMPLETAMENTE INTERROMPIDO!\n` +
            `Circuit breaker aberto. Parando TODAS as operações.\n` +
            `Coleção atual: ${collectionName}\n` +
            `Verifique PIN e Salt.`
          );
          break; // Sair IMEDIATAMENTE do loop de collections
        }

        // 1. Buscar TODOS os dados do Firebase
        const firebasePath = `users/${this.firebaseUser.uid}/${collectionName}`;
        const firebaseCollection = collection(this.firebaseDB, firebasePath);
        const snapshot = await getDocs(firebaseCollection);

        const firebaseItems = new Map();
        for (const docSnap of snapshot.docs) {
          // ⛔ CIRCUIT BREAKER CHECK: Verificar a cada item
          if (circuitBreaker.shouldStop()) {
            console.error(
              `[Sync] ⛔ Circuit breaker aberto durante processamento!\n` +
              `Coleção: ${collectionName}\n` +
              `PARANDO IMEDIATAMENTE.`
            );
            break; // Sair do loop de items
          }

          try {
            const firebaseData = docSnap.data();

            // 🧟 FILTRO DE IDADE: Skip items muito antigos se maxAge especificado
            if (maxAge && firebaseData.lastModified) {
              const itemDate = new Date(firebaseData.lastModified);
              const cutoffDate = new Date();
              cutoffDate.setDate(cutoffDate.getDate() - maxAge);

              if (itemDate < cutoffDate) {
                // Item muito antigo - skip silenciosamente
                totalZombies++;
                continue;
              }
            }

            // Desencriptar
            let item;
            if (firebaseData.encrypted === true && firebaseData.data && firebaseData.iv) {
              item = await decryptFromFirebase(firebaseData.data, firebaseData.iv, this.pin, this.salt);
            } else {
              item = { ...firebaseData };
            }

            item.lastModified = firebaseData.lastModified || item.lastModified || new Date().toISOString();
            firebaseItems.set(docSnap.id, item);

            // ✅ Sucesso - reset circuit breaker
            circuitBreaker.recordSuccess();

          } catch (error) {
            // 🧟 MODO SKIP ZOMBIES: Ignorar SILENCIOSAMENTE
            if (skipZombies) {
              totalZombies++;
              // Não fazer log, não registar erro, apenas continuar
              continue;
            }

            // ❌ Erro - registar no logger (SEM stack trace)
            errorLogger.logError(collectionName, docSnap.id, error.name || 'DecryptError');
            totalSkipped++;

            // Guardar primeiro item que falhou para análise de salt
            if (!firstFailedItem && firebaseData.encrypted) {
              firstFailedItem = {
                collection: collectionName,
                id: docSnap.id,
                data: firebaseData.data,
                iv: firebaseData.iv,
                error: error.name
              };
            }

            // Registar no circuit breaker - SE ABRIR, PARA IMEDIATAMENTE
            const shouldStop = circuitBreaker.recordError();
            if (shouldStop) {
              // Circuit breaker abriu - break IMEDIATAMENTE
              console.error(
                `[Sync] ⛔ CIRCUIT BREAKER ABERTO!\n` +
                `${circuitBreaker.consecutiveErrors} erros consecutivos.\n` +
                `Item: ${collectionName}/${docSnap.id}\n` +
                `PARANDO SYNC AGORA!`
              );
              break; // Sair do loop de items IMEDIATAMENTE
            }
          }
        }

        // ⛔ CRITICAL: Se circuit breaker abriu, PARAR TUDO (não processar merge)
        if (circuitBreaker.shouldStop()) {
          console.error(
            `[Sync] ⛔ SYNC ABORTADO - Circuit breaker aberto.\n` +
            `NÃO vou processar merge de dados locais.\n` +
            `Motivo: Erros sistemáticos de desencriptação.`
          );
          break; // Sair do loop de collections IMEDIATAMENTE
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
              // 🪦 TOMBSTONE: Respeitar deleted flag do Firebase
              // (já vem correto do decrypt, não sobrescrever)
              await dexieDB[collectionName].put(firebaseItem);
              totalPulled++;
            } else if (localTime > firebaseTime) {
              // Local mais recente → atualizar Firebase
              // 🪦 TOMBSTONE: Enviar SEMPRE, mesmo se deleted (para propagar tombstones)
              const { data, iv } = await encryptForFirebase(localItem, this.pin, this.salt);
              const firebaseData = {
                encrypted: true,
                data,
                iv,
                lastModified: localItem.lastModified,
                deleted: localItem.deleted || false  // 🪦 Tombstone flag
              };
              const docRef = doc(this.firebaseDB, firebasePath, localItem.id);
              await setDoc(docRef, firebaseData);
              await markAsSynced(collectionName, localItem.id);
              totalPushed++;
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

      // Imprimir resumo de erros (apenas uma vez, limpo)
      if (errorLogger.getSummary().totalErrors > 0) {
        errorLogger.printSummary();
      }

      // Verificar se circuit breaker foi ativado
      const breakerSummary = circuitBreaker.getSummary();
      if (breakerSummary.isOpen) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 EXECUTANDO DIAGNÓSTICO DE SALT...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // PASSO 1: DIAGNÓSTICO - Verificar se recuperação é possível
        const diagnosis = await diagnoseSaltSituation(
          this.firebaseDB,
          this.firebaseUser.uid
        );

        console.log(`\n${diagnosis.message}\n`);

        // Se dados IRRECUPERÁVEIS → avisar e parar
        if (!diagnosis.canRecover) {
          throw new Error(
            `❌ DADOS HISTÓRICOS IRRECUPERÁVEIS!\n\n` +
            `Salt original não encontrado no Firebase.\n` +
            `Sem o salt, é IMPOSSÍVEL desencriptar os dados (AES-GCM).\n\n` +
            `OPÇÕES:\n` +
            `1. Recuperar salt do localStorage do dispositivo original\n` +
            `2. Limpar dados históricos e recomeçar\n` +
            `3. Aceitar perda permanente dos dados\n\n` +
            `Total de items afetados: ~${totalSkipped}`
          );
        }

        // Se PODE ser recuperável → tentar Salt Detective
        if (diagnosis.canRecover === true || diagnosis.canRecover === 'maybe') {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🕵️ EXECUTANDO SALT DETECTIVE...');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          // Analisar conflito
          const conflictAnalysis = await analyzeSaltConflict(
            this.firebaseDB,
            this.firebaseUser.uid,
            this.pin,
            COLLECTIONS
          );

          if (conflictAnalysis.hasConflict || diagnosis.canRecover === 'maybe') {
            // Tentar detectar salt correto com item que falhou
            if (firstFailedItem) {
              console.log(`🧪 Testando salts com item: ${firstFailedItem.collection}/${firstFailedItem.id}\n`);

              const detection = await detectCorrectSalt(
                this.firebaseDB,
                this.firebaseUser.uid,
                this.pin,
                firstFailedItem
              );

              if (detection.found) {
                console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ SALT CORRETO ENCONTRADO!');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log(`Fonte: ${detection.label}`);
                console.log(`Local: ${detection.source}\n`);

                throw new Error(
                  `✅ SALT CORRETO IDENTIFICADO!\n\n` +
                  `Fonte: ${detection.label} (${detection.source})\n\n` +
                  `O salt atual é DIFERENTE do que encriptou os dados históricos.\n` +
                  `Sistema detectou o salt correto automaticamente.\n\n` +
                  `PRÓXIMO PASSO:\n` +
                  `Substituir salt em uso pelo salt correto e tentar sync novamente.`
                );
              } else {
                console.log('\n❌ Nenhum salt conseguiu desencriptar.');
                console.log('Possíveis causas: PIN incorreto, dados corrompidos, ou salt perdido.\n');
              }
            }
          }
        }

        throw new Error(
          `Sync interrompido por Circuit Breaker!\n` +
          `${breakerSummary.consecutiveErrors} erros consecutivos detectados.\n` +
          `Total de erros: ${breakerSummary.totalErrors}\n` +
          `Verifica PIN e Salt!`
        );
      }

      // Log final com estatísticas
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SYNC COMPLETO');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📤 Pushed:  ${totalPushed}`);
      console.log(`📥 Pulled:  ${totalPulled}`);
      console.log(`🔄 Merged:  ${totalMerged}`);
      console.log(`⏭️  Skipped: ${totalSkipped}`);
      if (totalZombies > 0) {
        console.log(`🧟 Zombies: ${totalZombies} (ignorados)`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // 🚀 SYNC INCREMENTAL: Guardar timestamp do sync bem-sucedido
      if (incremental) {
        try {
          const { setMetadata } = await import('../db/metadata');
          await setMetadata('lastSyncTimestamp', new Date().toISOString());
        } catch (error) {
          console.warn('[Sync] ⚠️ Erro ao guardar lastSyncTimestamp:', error);
        }
      }

      return {
        success: true,
        pushed: totalPushed,
        pulled: totalPulled,
        merged: totalMerged,
        skipped: totalSkipped,
        zombies: totalZombies,
        errors: errorLogger.getSummary()
      };

    } catch (error) {
      console.error('[Sync] ❌ Erro na sincronização completa:', error.message);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Criar item de controlo (deve ser chamado após login bem-sucedido)
   */
  async createControlItem() {
    if (!this.firebaseDB || !this.firebaseUser || !this.pin || !this.salt) {
      console.warn('[Sync] ⚠️ Não é possível criar item de controlo (não inicializado)');
      return false;
    }

    return await createControlItem(
      this.firebaseDB,
      this.firebaseUser.uid,
      this.pin,
      this.salt
    );
  }

  /**
   * Limpar items zombies (que não conseguem ser desencriptados)
   * ATENÇÃO: Isto vai DELETAR permanentemente items do Firebase!
   *
   * @param {number} maxAge - Deletar items com mais de X dias (padrão: 90)
   * @param {boolean} dryRun - Se true, apenas lista items sem deletar (padrão: true)
   */
  async cleanZombies(maxAge = 90, dryRun = true) {
    if (!this.firebaseDB || !this.firebaseUser || !this.pin || !this.salt) {
      throw new Error('Sync não inicializado');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧟 LIMPEZA DE ITEMS ZOMBIES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (dryRun) {
      console.log('🔍 MODO DRY-RUN: Apenas listar, SEM deletar\n');
    } else {
      console.log('⚠️  MODO ATIVO: Vai DELETAR items do Firebase!\n');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);
    console.log(`📅 Data de corte: ${cutoffDate.toISOString()}`);
    console.log(`   (items mais antigos que ${maxAge} dias)\n`);

    let totalZombies = 0;
    let totalDeleted = 0;
    const zombiesByCollection = {};

    for (const collectionName of COLLECTIONS) {
      const firebasePath = `users/${this.firebaseUser.uid}/${collectionName}`;
      const firebaseCollection = collection(this.firebaseDB, firebasePath);
      const snapshot = await getDocs(firebaseCollection);

      let collectionZombies = 0;

      for (const docSnap of snapshot.docs) {
        const firebaseData = docSnap.data();

        // Verificar idade
        if (firebaseData.lastModified) {
          const itemDate = new Date(firebaseData.lastModified);

          if (itemDate < cutoffDate) {
            // Item antigo - tentar desencriptar
            let isZombie = false;

            if (firebaseData.encrypted === true && firebaseData.data && firebaseData.iv) {
              try {
                await decryptFromFirebase(firebaseData.data, firebaseData.iv, this.pin, this.salt);
                // Conseguiu desencriptar - NÃO é zombie
              } catch (error) {
                // Falhou desencriptação - É ZOMBIE!
                isZombie = true;
              }
            }

            if (isZombie) {
              totalZombies++;
              collectionZombies++;

              console.log(`🧟 Zombie: ${collectionName}/${docSnap.id}`);
              console.log(`   Data: ${firebaseData.lastModified}`);
              console.log(`   Idade: ${Math.floor((Date.now() - itemDate.getTime()) / (1000 * 60 * 60 * 24))} dias`);

              if (!dryRun) {
                // DELETAR do Firebase
                const docRef = doc(this.firebaseDB, firebasePath, docSnap.id);
                await deleteDoc(docRef);
                totalDeleted++;
                console.log(`   ❌ DELETADO\n`);
              } else {
                console.log(`   (seria deletado em modo ativo)\n`);
              }
            }
          }
        }
      }

      if (collectionZombies > 0) {
        zombiesByCollection[collectionName] = collectionZombies;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total de zombies encontrados: ${totalZombies}`);

    if (Object.keys(zombiesByCollection).length > 0) {
      console.log('\nPor coleção:');
      for (const [col, count] of Object.entries(zombiesByCollection)) {
        console.log(`  ${col}: ${count}`);
      }
    }

    if (dryRun) {
      console.log(`\n💡 Para DELETAR permanentemente, execute:`);
      console.log(`   syncService.cleanZombies(${maxAge}, false)`);
    } else {
      console.log(`\n❌ Items deletados: ${totalDeleted}`);
      console.log(`✅ Limpeza concluída!`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      totalZombies,
      totalDeleted,
      zombiesByCollection,
      dryRun
    };
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

            // 🪦 TOMBSTONE: Com tombstones, 'removed' nunca acontece
            // Items deletados vêm como 'added'/'modified' com deleted:true

            if (change.type === 'added' || change.type === 'modified' || change.type === 'removed') {
              // Item novo, modificado, ou removido (legacy) no Firebase
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

                  // 🪦 TOMBSTONE: Respeitar flag deleted do Firebase
                  item.deleted = firebaseData.deleted || false;

                  // Atualizar localmente
                  await dexieDB[collectionName].put(item);

                  if (item.deleted) {
                    console.log(`[Sync] 🪦 Tombstone recebido: ${collectionName}/${itemId}`);
                  } else {
                    console.log(`[Sync] ✅ Atualizado de outro dispositivo: ${collectionName}/${itemId}`);
                  }
                } catch (decryptError) {
                  // Ignorar SILENCIOSAMENTE zombies (items antigos não desencriptáveis)
                  // Não fazer log para evitar spam na consola
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

// Expor globalmente para debug na consola do browser
if (typeof window !== 'undefined') {
  window.syncService = syncService;
  console.log('[SyncService] Disponível globalmente como window.syncService');
}

export default syncService;
