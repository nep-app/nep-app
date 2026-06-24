/**
 * Camada de Encriptação End-to-End (E2E)
 *
 * Algoritmo: AES-256-GCM (Advanced Encryption Standard com Galois/Counter Mode)
 * - AES-256: Encriptação simétrica de nível militar (256 bits)
 * - GCM: Modo autenticado que garante integridade dos dados
 *
 * Derivação de Chave: PBKDF2 (Password-Based Key Derivation Function 2)
 * - Converte PIN/password em chave criptográfica
 * - 100,000 iterações (abranda tentativas de brute force)
 * - Salt único por utilizador
 *
 * ⚠️ LIMITAÇÃO IMPORTANTE: a força real desta encriptação depende da ENTROPIA
 * do segredo usado. Um PIN só de dígitos (4-6) tem um espaço pequeno (10^4 a 10^6),
 * pelo que as 100k iterações NÃO o tornam resistente a brute force offline se alguém
 * obtiver o blob cifrado + o salt. A proteção principal dos dados na nuvem é a
 * conta Firebase (email + password forte). Para confidencialidade reforçada,
 * usar uma passphrase alfanumérica em vez de um PIN numérico.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100000;
const IV_LENGTH = 12; // 96 bits para GCM

// Cache da chave derivada - evita re-derivar 100k iterações PBKDF2 para cada item
// A chave só muda se o PIN ou salt mudar (o que não acontece numa sessão normal)
let _cachedKey = null;
let _cachedKeyId = null;

/**
 * Deriva uma chave criptográfica a partir de um PIN/password
 * Usa cache interno para evitar re-derivação em operações em batch (ex: 1000+ items)
 *
 * @param {string} password - PIN ou password do utilizador
 * @param {Uint8Array} salt - Salt único (deve ser guardado)
 * @returns {Promise<CryptoKey>} - Chave derivada para encriptação
 */
async function deriveKey(password, salt) {
  // Criar identificador único para este par (password, salt)
  const saltStr = (salt instanceof Uint8Array ? salt : new Uint8Array(salt)).join(',');
  const keyId = `${password}:${saltStr}`;

  if (_cachedKeyId === keyId && _cachedKey) {
    return _cachedKey;
  }

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Importar password como "raw key" para PBKDF2
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derivar chave AES-256 usando PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    false, // não exportável (segurança)
    ['encrypt', 'decrypt']
  );

  _cachedKey = derivedKey;
  _cachedKeyId = keyId;
  return derivedKey;
}

/**
 * Gera um salt aleatório para derivação de chave
 * IMPORTANTE: Deve ser guardado e reutilizado para o mesmo utilizador
 *
 * @returns {Uint8Array} - Salt de 16 bytes
 */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Gera um IV (Initialization Vector) aleatório para cada encriptação
 * IMPORTANTE: Deve ser único para cada operação de encriptação
 *
 * @returns {Uint8Array} - IV de 12 bytes
 */
function generateIV() {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encripta dados usando AES-256-GCM
 *
 * @param {any} data - Dados a encriptar (será convertido para JSON)
 * @param {string} password - PIN/password do utilizador
 * @param {Uint8Array} salt - Salt para derivação de chave
 * @returns {Promise<Object>} - { iv, encryptedData } em base64
 */
export async function encrypt(data, password, salt) {
  try {
    // Derivar chave a partir do password
    const key = await deriveKey(password, salt);

    // Gerar IV único para esta encriptação
    const iv = generateIV();

    // Converter dados para string JSON
    const encoder = new TextEncoder();
    const jsonString = JSON.stringify(data);
    const dataBuffer = encoder.encode(jsonString);

    // Encriptar
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      dataBuffer
    );

    // Converter para base64 para armazenamento
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedBase64 = arrayBufferToBase64(encryptedArray);
    const ivBase64 = arrayBufferToBase64(iv);

    return {
      iv: ivBase64,
      data: encryptedBase64
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Falha ao encriptar dados');
  }
}

/**
 * Desencripta dados usando AES-256-GCM
 *
 * @param {string} encryptedDataBase64 - Dados encriptados em base64
 * @param {string} ivBase64 - IV em base64
 * @param {string} password - PIN/password do utilizador
 * @param {Uint8Array} salt - Salt usado na encriptação
 * @returns {Promise<any>} - Dados desencriptados (objeto original)
 */
export async function decrypt(encryptedDataBase64, ivBase64, password, salt) {
  try {
    // Derivar a mesma chave
    const key = await deriveKey(password, salt);

    // Converter de base64 para ArrayBuffer
    const encryptedData = base64ToArrayBuffer(encryptedDataBase64);
    const iv = base64ToArrayBuffer(ivBase64);

    // Desencriptar
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      encryptedData
    );

    // Converter de ArrayBuffer para string JSON
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);

    // Parse JSON para objeto
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Falha ao desencriptar dados - PIN incorreto ou dados corrompidos');
  }
}

/**
 * Verifica se um PIN/password está correto
 *
 * @param {string} password - PIN a verificar
 * @param {string} testEncryptedData - Dados de teste encriptados
 * @param {string} testIV - IV dos dados de teste
 * @param {Uint8Array} salt - Salt do utilizador
 * @returns {Promise<boolean>} - true se PIN correto
 */
export async function verifyPassword(password, testEncryptedData, testIV, salt) {
  try {
    await decrypt(testEncryptedData, testIV, password, salt);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cria dados de teste encriptados para verificação futura do PIN
 *
 * @param {string} password - PIN do utilizador
 * @param {Uint8Array} salt - Salt do utilizador
 * @returns {Promise<Object>} - { iv, data } para guardar
 */
export async function createPasswordVerificationData(password, salt) {
  const testData = { verified: true, timestamp: Date.now() };
  return await encrypt(testData, password, salt);
}

// ============================================================================
// Utilitários de conversão ArrayBuffer ↔ Base64
// ============================================================================

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ============================================================================
// Utilitários para conversão Salt ↔ Base64 (para armazenamento)
// ============================================================================

export function saltToBase64(salt) {
  return arrayBufferToBase64(salt);
}

export function base64ToSalt(base64) {
  return new Uint8Array(base64ToArrayBuffer(base64));
}
