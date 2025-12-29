import { encrypt, decrypt } from './encryption';

/**
 * Encriptação para dados no Dexie (IndexedDB local)
 *
 * Usa AES-256-GCM com chave derivada do PIN do utilizador
 *
 * IMPORTANTE:
 * - Encriptamos dados SENSÍVEIS antes de guardar localmente
 * - Campos de índice (id, date, timestamp) ficam não-encriptados para permitir queries
 * - Campos sensíveis (notes, answer, content, etc.) são encriptados
 */

/**
 * Campos que devem ser encriptados (dados sensíveis)
 */
const SENSITIVE_FIELDS = {
  consumptions: ['notes'],
  dailyLogs: ['notes'],
  reflections: ['answer', 'question'],
  wellbeingLogs: ['notes', 'emotions'],
  cycles: ['notes', 'triggers'],
  goals: [],
  thoughts: ['content']
};

/**
 * Encriptar um item antes de guardar no Dexie
 *
 * @param {string} collection - Nome da coleção (ex: 'consumptions')
 * @param {object} item - Item a encriptar
 * @param {string} pin - PIN do utilizador (usado para gerar chave)
 * @param {Uint8Array} salt - Salt único do utilizador
 * @returns {Promise<object>} Item com campos sensíveis encriptados
 */
export const encryptItem = async (collection, item, pin, salt) => {
  const fieldsToEncrypt = SENSITIVE_FIELDS[collection] || [];

  if (fieldsToEncrypt.length === 0) {
    // Nada para encriptar nesta coleção
    return item;
  }

  const encrypted = { ...item };

  // Encriptar cada campo sensível
  for (const field of fieldsToEncrypt) {
    if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
      const value = item[field];

      // Serializar para JSON se for objeto/array
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

      // Encriptar
      const { data, iv } = await encrypt(valueStr, pin, salt);

      // Guardar como objeto com data + iv
      encrypted[field] = {
        encrypted: true,
        data,
        iv
      };
    }
  }

  return encrypted;
};

/**
 * Desencriptar um item ao ler do Dexie
 *
 * @param {string} collection - Nome da coleção
 * @param {object} item - Item a desencriptar
 * @param {string} pin - PIN do utilizador
 * @param {Uint8Array} salt - Salt único do utilizador
 * @returns {Promise<object>} Item com campos sensíveis desencriptados
 */
export const decryptItem = async (collection, item, pin, salt) => {
  const fieldsToDecrypt = SENSITIVE_FIELDS[collection] || [];

  if (fieldsToDecrypt.length === 0) {
    return item;
  }

  const decrypted = { ...item };

  // Desencriptar cada campo sensível
  for (const field of fieldsToDecrypt) {
    const value = item[field];

    // Verificar se está encriptado
    if (value && typeof value === 'object' && value.encrypted === true) {
      try {
        const decryptedStr = await decrypt(value.data, value.iv, pin, salt);

        // Se começar com { ou [, é JSON - fazer parse
        if (decryptedStr.startsWith('{') || decryptedStr.startsWith('[')) {
          decrypted[field] = JSON.parse(decryptedStr);
        } else {
          decrypted[field] = decryptedStr;
        }
      } catch (error) {
        console.error(`[Encryption] Erro ao desencriptar ${collection}.${field}:`, error);
        // Manter valor encriptado se falhar
        decrypted[field] = '[Erro ao desencriptar]';
      }
    }
  }

  return decrypted;
};

/**
 * Encriptar array de items
 */
export const encryptItems = async (collection, items, pin, salt) => {
  const promises = items.map(item => encryptItem(collection, item, pin, salt));
  return await Promise.all(promises);
};

/**
 * Desencriptar array de items
 */
export const decryptItems = async (collection, items, pin, salt) => {
  const promises = items.map(item => decryptItem(collection, item, pin, salt));
  return await Promise.all(promises);
};

/**
 * Verificar se um campo está encriptado
 */
export const isFieldEncrypted = (value) => {
  return value && typeof value === 'object' && value.encrypted === true;
};

/**
 * Encriptar dados para sync com Firebase
 * Encripta TODO o item (não apenas campos sensíveis)
 *
 * @param {object} item - Item completo
 * @param {string} pin - PIN do utilizador
 * @param {Uint8Array} salt - Salt
 * @returns {Promise<{data: string, iv: string}>} Dados encriptados
 */
export const encryptForFirebase = async (item, pin, salt) => {
  const itemStr = JSON.stringify(item);
  return await encrypt(itemStr, pin, salt);
};

/**
 * Desencriptar dados vindos do Firebase
 *
 * @param {string} encryptedData - Dados encriptados (base64)
 * @param {string} iv - IV (base64)
 * @param {string} pin - PIN do utilizador
 * @param {Uint8Array} salt - Salt
 * @returns {Promise<object>} Item desencriptado
 */
export const decryptFromFirebase = async (encryptedData, iv, pin, salt) => {
  const itemStr = await decrypt(encryptedData, iv, pin, salt);
  return JSON.parse(itemStr);
};

console.log('[Encryption] Dexie encryption utilities loaded');
