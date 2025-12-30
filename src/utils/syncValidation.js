import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { encryptForFirebase, decryptFromFirebase } from './dexieEncryption';

/**
 * Sync Validation - Validação de integridade CRÍTICA antes de sync massivo
 *
 * Previne desencriptação massiva com chave/salt errados
 */

/**
 * Item de controlo - usado para validar que PIN/Salt estão corretos
 */
const CONTROL_ITEM = {
  id: 'validation',
  type: 'control',
  version: '1.0',
  message: 'Se consegues ler isto, o teu PIN e Salt estão corretos!',
  timestamp: new Date().toISOString()
};

/**
 * Criar/atualizar item de controlo no Firebase
 * Deve ser chamado quando user faz login com sucesso
 *
 * @throws {Error} Se falhar a criação (CRÍTICO)
 */
export async function createControlItem(firebaseDB, userId, pin, salt) {
  try {
    console.log('[SyncValidation] 🔧 Criando item de controlo...');

    const { data, iv } = await encryptForFirebase(CONTROL_ITEM, pin, salt);

    const firebaseData = {
      encrypted: true,
      data,
      iv,
      salt: Array.from(salt), // Guardar salt para validação futura
      lastModified: new Date().toISOString()
    };

    // Usar _system como coleção (nomes com __ são reservados)
    const docRef = doc(firebaseDB, `users/${userId}/_system`, 'validation');
    await setDoc(docRef, firebaseData);

    console.log('[SyncValidation] ✅ Item de controlo criado com sucesso');
    return true;
  } catch (error) {
    console.error('[SyncValidation] ❌ ERRO CRÍTICO ao criar item de controlo:', error);
    throw new Error(`Falha ao criar item de controlo: ${error.message}`);
  }
}

/**
 * Validar Salt antes de tentar desencriptar
 * Compara salt local com salt guardado no Firebase
 *
 * @returns {Object} { valid: boolean, error: string, remoteExists: boolean }
 */
export async function validateSalt(firebaseDB, userId, localSalt) {
  try {
    console.log('[SyncValidation] 🔍 Validando Salt...');

    const docRef = doc(firebaseDB, `users/${userId}/_system`, 'validation');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn('[SyncValidation] ⚠️ Item de controlo não existe (conta nova ou antiga)');
      return { valid: true, error: null, remoteExists: false };
    }

    const firebaseData = docSnap.data();

    if (!firebaseData.salt) {
      console.warn('[SyncValidation] ⚠️ Salt não guardado no item de controlo (versão antiga)');
      return { valid: true, error: null, remoteExists: true, saltMissing: true };
    }

    const remoteSalt = new Uint8Array(firebaseData.salt);

    // Comparar salt local com remoto
    if (localSalt.length !== remoteSalt.length) {
      return {
        valid: false,
        error: 'Salt local tem tamanho diferente do Salt remoto!',
        remoteExists: true
      };
    }

    for (let i = 0; i < localSalt.length; i++) {
      if (localSalt[i] !== remoteSalt[i]) {
        return {
          valid: false,
          error: 'Salt local NÃO coincide com Salt remoto! Isto vai causar falhas de desencriptação.',
          remoteExists: true
        };
      }
    }

    console.log('[SyncValidation] ✅ Salt validado - local coincide com remoto');
    return { valid: true, error: null, remoteExists: true };

  } catch (error) {
    console.error('[SyncValidation] ❌ Erro ao validar Salt:', error);
    return {
      valid: false,
      error: 'Erro ao validar Salt: ' + error.message,
      remoteExists: false
    };
  }
}

/**
 * Validar chave (PIN + Salt) antes de sync massivo
 * Tenta desencriptar o item de controlo
 *
 * @throws {Error} Se validação falhar (CRÍTICO)
 */
export async function validateKey(firebaseDB, userId, pin, salt) {
  try {
    console.log('[SyncValidation] 🔍 Validando PIN e Salt com item de controlo...');

    // PASSO 1: Validar Salt PRIMEIRO
    const saltValidation = await validateSalt(firebaseDB, userId, salt);

    if (!saltValidation.valid) {
      throw new Error(
        `❌ VALIDAÇÃO DE SALT FALHOU!\n\n` +
        `${saltValidation.error}\n\n` +
        `CAUSA: Salt local diferente do Salt que encriptou os dados.\n` +
        `SOLUÇÃO: Faz logout completo e login novamente.`
      );
    }

    if (!saltValidation.remoteExists) {
      console.log('[SyncValidation] ℹ️ Item de controlo não existe - a criar agora...');
      await createControlItem(firebaseDB, userId, pin, salt);
      return { valid: true, error: null, created: true };
    }

    // PASSO 2: Validar PIN tentando desencriptar
    const docRef = doc(firebaseDB, `users/${userId}/_system`, 'validation');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Não devia acontecer (já verificámos acima) mas handle anyway
      console.log('[SyncValidation] ℹ️ Item de controlo desapareceu - a criar...');
      await createControlItem(firebaseDB, userId, pin, salt);
      return { valid: true, error: null, created: true };
    }

    const firebaseData = docSnap.data();

    // Tentar desencriptar
    try {
      const decrypted = await decryptFromFirebase(
        firebaseData.data,
        firebaseData.iv,
        pin,
        salt
      );

      // Verificar se é o item de controlo correto
      if (decrypted.type === 'control' && decrypted.id === 'validation') {
        console.log('[SyncValidation] ✅ PIN e Salt validados com sucesso!');
        console.log('[SyncValidation] 💬', decrypted.message);
        return { valid: true, error: null };
      } else {
        throw new Error('Item de controlo corrompido - conteúdo inválido');
      }
    } catch (decryptError) {
      throw new Error(
        `❌ VALIDAÇÃO DE PIN FALHOU!\n\n` +
        `Impossível desencriptar item de controlo.\n\n` +
        `CAUSA: PIN incorreto ou dados corrompidos.\n` +
        `SOLUÇÃO: Verifica o PIN e tenta novamente.`
      );
    }
  } catch (error) {
    // Re-throw errors já formatados, ou formatar novos
    if (error.message.includes('❌')) {
      throw error;
    } else {
      throw new Error(`Erro na validação de chave: ${error.message}`);
    }
  }
}

/**
 * Circuit Breaker - para sync se houver muitos erros consecutivos
 */
export class SyncCircuitBreaker {
  constructor(maxConsecutiveErrors = 5) {
    this.maxConsecutiveErrors = maxConsecutiveErrors;
    this.consecutiveErrors = 0;
    this.totalErrors = 0;
    this.isOpen = false;
  }

  /**
   * Registar sucesso - reset contador
   */
  recordSuccess() {
    this.consecutiveErrors = 0;
  }

  /**
   * Registar erro - incrementar contador
   * @returns {boolean} true se circuit breaker abriu (deve parar)
   */
  recordError() {
    this.consecutiveErrors++;
    this.totalErrors++;

    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      this.isOpen = true;
      console.error(
        `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⛔ CIRCUIT BREAKER ABERTO! ⛔\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${this.consecutiveErrors} erros consecutivos detectados.\n` +
        `SYNC INTERROMPIDO para prevenir browser freeze.\n` +
        `\n` +
        `CAUSA PROVÁVEL: PIN ou Salt incorretos.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      );
      return true;
    }

    return false;
  }

  /**
   * Verificar se circuit breaker está aberto
   */
  shouldStop() {
    return this.isOpen;
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.consecutiveErrors = 0;
    this.totalErrors = 0;
    this.isOpen = false;
  }

  /**
   * Obter resumo
   */
  getSummary() {
    return {
      consecutiveErrors: this.consecutiveErrors,
      totalErrors: this.totalErrors,
      isOpen: this.isOpen
    };
  }
}

/**
 * Logger de erros sanitizado - evita fritar browser com stack traces
 */
export class SyncErrorLogger {
  constructor() {
    this.errors = [];
    this.errorsByType = new Map();
    this.maxLogsShown = 3; // Mostrar apenas primeiros 3 erros
  }

  /**
   * Registar erro (SEM stack trace)
   */
  logError(collectionName, itemId, errorType) {
    const errorCount = this.errors.length;

    this.errors.push({
      collection: collectionName,
      itemId: itemId,
      type: errorType,
      timestamp: Date.now()
    });

    // Contar por tipo
    const count = this.errorsByType.get(errorType) || 0;
    this.errorsByType.set(errorType, count + 1);

    // Mostrar apenas os primeiros N erros (evitar spam)
    if (errorCount < this.maxLogsShown) {
      console.error(`[Sync] ❌ Erro #${errorCount + 1}: ${collectionName}/${itemId} - ${errorType}`);
    } else if (errorCount === this.maxLogsShown) {
      console.warn(`[Sync] ⚠️ Mais erros detectados... (suprimindo logs, resumo no final)`);
    }
    // Depois dos primeiros N, não mostrar mais nada
  }

  /**
   * Obter resumo limpo (sem stack traces)
   */
  getSummary() {
    const summary = {
      totalErrors: this.errors.length,
      errorsByType: Object.fromEntries(this.errorsByType),
      failedCollections: this.getFailedCollections()
    };

    return summary;
  }

  /**
   * Obter coleções com falhas
   */
  getFailedCollections() {
    const collections = new Map();

    for (const error of this.errors) {
      const count = collections.get(error.collection) || 0;
      collections.set(error.collection, count + 1);
    }

    return Object.fromEntries(collections);
  }

  /**
   * Limpar logs
   */
  clear() {
    this.errors = [];
    this.errorsByType.clear();
  }

  /**
   * Imprimir resumo (apenas uma vez, no final)
   */
  printSummary() {
    const summary = this.getSummary();

    if (summary.totalErrors === 0) {
      console.log('[SyncErrors] ✅ Nenhum erro detectado');
      return;
    }

    console.warn(
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ RESUMO DE ERROS DE SYNC\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Total de erros: ${summary.totalErrors}\n` +
      `\nPor tipo:\n${JSON.stringify(summary.errorsByType, null, 2)}\n` +
      `\nPor coleção:\n${JSON.stringify(summary.failedCollections, null, 2)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    );
  }
}
