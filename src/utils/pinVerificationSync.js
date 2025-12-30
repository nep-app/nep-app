import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * PIN Verification Sync - Sincronização dos dados de verificação do PIN
 *
 * Guarda o pinVerification no Firebase para permitir login
 * em qualquer dispositivo/janela anônima.
 */

/**
 * Guardar pinVerification no Firebase
 *
 * @param {Object} firestore - Instância do Firestore
 * @param {string} userId - UID do utilizador Firebase
 * @param {Object} verification - Dados de verificação do PIN {data, iv}
 * @returns {Promise<void>}
 */
export async function uploadPinVerificationToFirebase(firestore, userId, verification) {
  if (!firestore || !userId || !verification) {
    throw new Error('uploadPinVerificationToFirebase: parâmetros inválidos');
  }

  console.log('[PinVerificationSync] 📤 Enviando pinVerification para Firebase...');

  try {
    // Guardar em users/{uid}/settings/encryption
    const settingsRef = doc(firestore, `users/${userId}/settings`, 'encryption');

    await setDoc(settingsRef, {
      pinVerification: JSON.stringify(verification),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('[PinVerificationSync] ✅ pinVerification guardado no Firebase');
  } catch (error) {
    console.error('[PinVerificationSync] ❌ Erro ao guardar:', error);
    throw new Error('Falha ao guardar pinVerification: ' + error.message);
  }
}

/**
 * Buscar pinVerification do Firebase
 *
 * @param {Object} firestore - Instância do Firestore
 * @param {string} userId - UID do utilizador Firebase
 * @returns {Promise<Object|null>} - Verification data ou null
 */
export async function downloadPinVerificationFromFirebase(firestore, userId) {
  if (!firestore || !userId) {
    throw new Error('downloadPinVerificationFromFirebase: parâmetros inválidos');
  }

  console.log('[PinVerificationSync] 📥 Buscando pinVerification do Firebase...');

  try {
    const settingsRef = doc(firestore, `users/${userId}/settings`, 'encryption');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      console.log('[PinVerificationSync] ⚠️ Documento não encontrado');
      return null;
    }

    const data = settingsSnap.data();
    if (!data.pinVerification) {
      console.log('[PinVerificationSync] ⚠️ pinVerification não encontrado');
      return null;
    }

    const verification = JSON.parse(data.pinVerification);
    console.log('[PinVerificationSync] ✅ pinVerification recuperado com sucesso');

    return verification;
  } catch (error) {
    console.error('[PinVerificationSync] ❌ Erro ao buscar:', error);
    throw new Error('Falha ao buscar pinVerification: ' + error.message);
  }
}

/**
 * Verificar se existe conta PIN no Firebase
 * (útil para auto-detectar se utilizador já tem conta)
 *
 * @param {Object} firestore - Instância do Firestore
 * @param {string} userId - UID do utilizador Firebase
 * @returns {Promise<boolean>} - true se existe salt e pinVerification
 */
export async function checkPinAccountExistsInFirebase(firestore, userId) {
  if (!firestore || !userId) {
    return false;
  }

  console.log('[PinVerificationSync] 🔍 Verificando se conta PIN existe no Firebase...');

  try {
    const settingsRef = doc(firestore, `users/${userId}/settings`, 'encryption');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      console.log('[PinVerificationSync] ❌ Conta PIN não existe');
      return false;
    }

    const data = settingsSnap.data();
    const hasSalt = !!data.salt;
    const hasPinVerification = !!data.pinVerification;

    console.log('[PinVerificationSync]', hasSalt && hasPinVerification ? '✅ Conta PIN existe' : '❌ Conta PIN incompleta');

    return hasSalt && hasPinVerification;
  } catch (error) {
    console.error('[PinVerificationSync] ❌ Erro ao verificar conta:', error);
    return false;
  }
}
