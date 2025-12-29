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
 * Campos que NÃO devem ser encriptados (necessários para índices/queries)
 * Todos os outros campos serão encriptados!
 */
const INDEX_FIELDS = ['id', 'date', 'timestamp', 'syncStatus', 'lastModified', 'deleted', 'createdAt', 'type'];

/**
 * Encriptar um item antes de guardar no Dexie
 *
 * ESTRATÉGIA: Encriptar TUDO exceto campos de índice
 *
 * @param {string} collection - Nome da coleção (ex: 'consumptions')
 * @param {object} item - Item a encriptar
 * @param {string} pin - PIN do utilizador (usado para gerar chave)
 * @param {Uint8Array} salt - Salt único do utilizador
 * @returns {Promise<object>} Item com todos os campos sensíveis encriptados
 */
export const encryptItem = async (collection, item, pin, salt) => {
  const encrypted = {};

  // Separar campos de índice vs campos a encriptar
  const dataToEncrypt = {};

  for (const [key, value] of Object.entries(item)) {
    if (INDEX_FIELDS.includes(key)) {
      // Manter campos de índice não-encriptados
      encrypted[key] = value;
    } else {
      // Guardar para encriptar
      dataToEncrypt[key] = value;
    }
  }

  // Se não há dados para encriptar, retornar apenas os índices
  if (Object.keys(dataToEncrypt).length === 0) {
    return encrypted;
  }

  // Encriptar TUDO de uma vez (serializado como JSON)
  const dataStr = JSON.stringify(dataToEncrypt);
  const { data, iv } = await encrypt(dataStr, pin, salt);

  // Adicionar dados encriptados ao item
  encrypted._encrypted = {
    data,
    iv
  };

  return encrypted;
};

/**
 * Desencriptar um item ao ler do Dexie
 *
 * @param {string} collection - Nome da coleção
 * @param {object} item - Item a desencriptar
 * @param {string} pin - PIN do utilizador
 * @param {Uint8Array} salt - Salt único do utilizador
 * @returns {Promise<object>} Item com todos os campos desencriptados
 */
export const decryptItem = async (collection, item, pin, salt) => {
  // Se não tem dados encriptados, retornar como está
  if (!item._encrypted || !item._encrypted.data || !item._encrypted.iv) {
    return item;
  }

  try {
    // Desencriptar dados
    const decryptedStr = await decrypt(item._encrypted.data, item._encrypted.iv, pin, salt);
    const decryptedData = JSON.parse(decryptedStr);

    // Combinar campos de índice + dados desencriptados
    const result = { ...item };
    delete result._encrypted; // Remover campo de encriptação

    // Adicionar dados desencriptados
    Object.assign(result, decryptedData);

    return result;
  } catch (error) {
    console.error(`[Encryption] Erro ao desencriptar item de ${collection}:`, error);
    // Retornar apenas campos de índice se falhar
    const result = { ...item };
    delete result._encrypted;
    result._decryptionError = true;
    return result;
  }
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
 * Verificar se um item está encriptado
 */
export const isItemEncrypted = (item) => {
  return item && item._encrypted && item._encrypted.data && item._encrypted.iv;
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

