import { doc, getDoc, setDoc } from 'firebase/firestore';
import { encryptForFirebase, decryptFromFirebase } from './dexieEncryption';

/**
 * Sync Validation - Validação de integridade antes de sync massivo
 *
 * Previne desencriptação massiva com chave/salt errados
 */

/**
 * Item de controlo - usado para validar que PIN/Salt estão corretos
 */
const CONTROL_ITEM = {
  id: '__control__',
  type: 'control',
  version: '1.0',
  message: 'Se consegues ler isto, o teu PIN e Salt estão corretos!',
  timestamp: new Date().toISOString()
};

/**
 * Criar/atualizar item de controlo no Firebase
 * Deve ser chamado quando user faz login com sucesso
 */
export async function createControlItem(firebaseDB, userId, pin, salt) {
  try {
    console.log('[SyncValidation] 🔧 Criando item de controlo...');

    const { data, iv } = await encryptForFirebase(CONTROL_ITEM, pin, salt);

    const firebaseData = {
      encrypted: true,
      data,
      iv,
      lastModified: new Date().toISOString()
    };

    const docRef = doc(firebaseDB, `users/${userId}/__control__`, '__control__');
    await setDoc(docRef, firebaseData);

    console.log('[SyncValidation] ✅ Item de controlo criado');
    return true;
  } catch (error) {
    console.error('[SyncValidation] ❌ Erro ao criar item de controlo:', error.message);
    return false;
  }
}

/**
 * Validar chave (PIN + Salt) antes de sync massivo
 * Tenta desencriptar o item de controlo
 *
 * @returns {Object} { valid: boolean, error: string }
 */
export async function validateKey(firebaseDB, userId, pin, salt) {
  try {
    console.log('[SyncValidation] 🔍 Validando PIN e Salt com item de controlo...');

    const docRef = doc(firebaseDB, `users/${userId}/__control__`, '__control__');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log('[SyncValidation] ⚠️ Item de controlo não encontrado (conta antiga?)');
      // Criar agora
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
      if (decrypted.type === 'control' && decrypted.id === '__control__') {
        console.log('[SyncValidation] ✅ PIN e Salt validados com sucesso!');
        console.log('[SyncValidation] 💬', decrypted.message);
        return { valid: true, error: null };
      } else {
        console.error('[SyncValidation] ❌ Item desencriptado mas conteúdo inválido');
        return {
          valid: false,
          error: 'Item de controlo corrompido'
        };
      }
    } catch (decryptError) {
      console.error('[SyncValidation] ❌ Falha ao desencriptar item de controlo');
      return {
        valid: false,
        error: 'PIN ou Salt incorretos - impossível desencriptar dados'
      };
    }
  } catch (error) {
    console.error('[SyncValidation] ❌ Erro na validação:', error.message);
    return {
      valid: false,
      error: 'Erro ao validar chave: ' + error.message
    };
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
        `[CircuitBreaker] ⛔ CIRCUIT BREAKER ABERTO!\n` +
        `${this.consecutiveErrors} erros consecutivos detectados.\n` +
        `Sync interrompido para prevenir danos.`
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
  }

  /**
   * Registar erro (SEM stack trace)
   */
  logError(collectionName, itemId, errorType) {
    this.errors.push({
      collection: collectionName,
      itemId: itemId,
      type: errorType,
      timestamp: Date.now()
    });

    // Contar por tipo
    const count = this.errorsByType.get(errorType) || 0;
    this.errorsByType.set(errorType, count + 1);
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
      `[SyncErrors] ⚠️ RESUMO DE ERROS:\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Total de erros: ${summary.totalErrors}\n` +
      `\nPor tipo:\n${JSON.stringify(summary.errorsByType, null, 2)}\n` +
      `\nPor coleção:\n${JSON.stringify(summary.failedCollections, null, 2)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );
  }
}
