import { doc, getDoc, setDoc } from 'firebase/firestore';
import { saltToBase64, base64ToSalt, generateSalt } from './encryption';

/**
 * Salt Sync - Sincronização do Salt de encriptação com Firebase
 *
 * PROBLEMA: Cada dispositivo gera o seu próprio salt localmente,
 * resultando em chaves de encriptação diferentes para o mesmo PIN.
 *
 * SOLUÇÃO: Guardar o salt no Firebase (Firestore) e sincronizar
 * entre dispositivos. O primeiro dispositivo gera e guarda o salt,
 * os outros dispositivos fazem download do salt existente.
 */

/**
 * Guardar salt no Firebase Firestore
 *
 * @param {Object} firestore - Instância do Firestore
 * @param {string} userId - UID do utilizador Firebase
 * @param {Uint8Array} salt - Salt de encriptação
 * @returns {Promise<void>}
 */
export async function uploadSaltToFirebase(firestore, userId, salt) {
  if (!firestore || !userId || !salt) {
    throw new Error('uploadSaltToFirebase: parâmetros inválidos');
  }

  console.log('[SaltSync] 📤 Enviando salt para Firebase...');

  try {
    const saltBase64 = saltToBase64(salt);

    // Guardar em users/{uid}/settings/encryption
    const settingsRef = doc(firestore, `users/${userId}/settings`, 'encryption');

    await setDoc(settingsRef, {
      salt: saltBase64,
      createdAt: new Date().toISOString(),
      version: '1.0'
    }, { merge: true }); // merge: true para não apagar outros settings

    console.log('[SaltSync] ✅ Salt guardado no Firebase com sucesso');
  } catch (error) {
    console.error('[SaltSync] ❌ Erro ao guardar salt:', error);
    throw new Error('Falha ao guardar salt no Firebase: ' + error.message);
  }
}

/**
 * Buscar salt do Firebase Firestore
 *
 * @param {Object} firestore - Instância do Firestore
 * @param {string} userId - UID do utilizador Firebase
 * @returns {Promise<Uint8Array|null>} - Salt ou null se não existir
 */
export async function downloadSaltFromFirebase(firestore, userId) {
  if (!firestore || !userId) {
    throw new Error('downloadSaltFromFirebase: parâmetros inválidos');
  }

  console.log('[SaltSync] 📥 Buscando salt do Firebase...');

  try {
    const settingsRef = doc(firestore, `users/${userId}/settings`, 'encryption');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      console.log('[SaltSync] ⚠️ Salt não encontrado no Firebase (primeiro login)');
      return null;
    }

    const data = settingsSnap.data();
    if (!data.salt) {
      console.log('[SaltSync] ⚠️ Salt não encontrado no documento');
      return null;
    }

    const salt = base64ToSalt(data.salt);
    console.log('[SaltSync] ✅ Salt recuperado do Firebase com sucesso');

    return salt;
  } catch (error) {
    console.error('[SaltSync] ❌ Erro ao buscar salt:', error);
    throw new Error('Falha ao buscar salt do Firebase: ' + error.message);
  }
}

/**
 * Sincronizar salt entre local e Firebase
 *
 * Estratégia:
 * 1. Verificar se existe salt no Firebase
 * 2. Se SIM → usar salt do Firebase (download)
 * 3. Se NÃO → gerar novo salt e guardar no Firebase (upload)
 *
 * @param {Object} firestore - Instância do Firestore
 * @param {string} userId - UID do utilizador Firebase
 * @returns {Promise<Uint8Array>} - Salt sincronizado
 */
export async function syncSalt(firestore, userId) {
  console.log('[SaltSync] 🔄 Sincronizando salt...');

  try {
    // 1. Tentar buscar salt do Firebase
    const existingSalt = await downloadSaltFromFirebase(firestore, userId);

    if (existingSalt) {
      // Salt já existe no Firebase → usar esse
      console.log('[SaltSync] ✅ Usando salt existente do Firebase');
      return existingSalt;
    }

    // 2. Salt não existe → gerar novo e guardar
    console.log('[SaltSync] 🆕 Gerando novo salt (primeiro dispositivo)');
    const newSalt = generateSalt();

    await uploadSaltToFirebase(firestore, userId, newSalt);

    console.log('[SaltSync] ✅ Novo salt criado e guardado no Firebase');
    return newSalt;

  } catch (error) {
    console.error('[SaltSync] ❌ Erro na sincronização do salt:', error);
    throw error;
  }
}
