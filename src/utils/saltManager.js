import { doc, getDoc, setDoc } from 'firebase/firestore';
import { saltToBase64, base64ToSalt, generateSalt } from './encryption';
import { decryptFromFirebase } from './dexieEncryption';
import { setMetadata, getMetadata } from '../db/localDB';
import { recoverSaltFromControlItem } from './syncValidation';

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SALT MANAGER - Gestão consolidada de salt e PIN verification
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Consolidação de 5 ficheiros:
 *   - saltSync.js
 *   - saltDetective.js
 *   - localSaltInspector.js
 *   - saltRecoveryCheck.js
 *   - pinVerificationSync.js
 *
 * Funcionalidades:
 *   1. Upload/Download de salt e pinVerification
 *   2. Sincronização entre local e Firebase
 *   3. Deteção de conflitos de salt
 *   4. Recuperação de salt correto
 *   5. Inspeção de salt local
 *   6. Diagnóstico de situação
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CORE OPERATIONS - Upload/Download
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Guardar salt no Firebase Firestore
 */
export async function uploadSaltToFirebase(firestore, userId, salt) {
  if (!firestore || !userId || !salt) {
    throw new Error('uploadSaltToFirebase: parâmetros inválidos');
  }

  console.log('[SaltManager] 📤 Enviando salt para Firebase...');

  try {
    const saltBase64 = saltToBase64(salt);
    const settingsRef = doc(firestore, `users/${userId}/settings`, 'encryption');

    await setDoc(settingsRef, {
      salt: saltBase64,
      createdAt: new Date().toISOString(),
      version: '1.0'
    }, { merge: true });

    console.log('[SaltManager] ✅ Salt guardado no Firebase com sucesso');
  } catch (error) {
    console.error('[SaltManager] ❌ Erro ao guardar salt:', error);
    throw new Error('Falha ao guardar salt no Firebase: ' + error.message);
  }
}

/**
 * Buscar salt do Firebase Firestore
 */
export async function downloadSaltFromFirebase(firestore, userId) {
  if (!firestore || !userId) {
    throw new Error('downloadSaltFromFirebase: parâmetros inválidos');
  }

  console.log('[SaltManager] 📥 Buscando salt do Firebase...');

  try {
    const settingsRef = doc(firestore, `users/${userId}/settings`, 'encryption');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      console.log('[SaltManager] ⚠️ Salt não encontrado no Firebase (primeiro login)');
      return null;
    }

    const data = settingsSnap.data();
    if (!data.salt) {
      console.log('[SaltManager] ⚠️ Salt não encontrado no documento');
      return null;
    }

    const salt = base64ToSalt(data.salt);
    console.log('[SaltManager] ✅ Salt recuperado do Firebase com sucesso');

    return salt;
  } catch (error) {
    console.error('[SaltManager] ❌ Erro ao buscar salt:', error);
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
 */
export async function syncSalt(firestore, userId) {
  console.log('[SaltManager] 🔄 Sincronizando salt...');

  try {
    const existingSalt = await downloadSaltFromFirebase(firestore, userId);

    if (existingSalt) {
      console.log('[SaltManager] ✅ Usando salt existente do Firebase');
      return existingSalt;
    }

    console.log('[SaltManager] 🆕 Gerando novo salt (primeiro dispositivo)');
    const newSalt = generateSalt();

    await uploadSaltToFirebase(firestore, userId, newSalt);

    console.log('[SaltManager] ✅ Novo salt criado e guardado no Firebase');
    return newSalt;

  } catch (error) {
    console.error('[SaltManager] ❌ Erro na sincronização do salt:', error);
    throw error;
  }
}

/**
 * Guardar pinVerification no Firebase
 */
export async function uploadPinVerificationToFirebase(firestore, userId, verification) {
  if (!firestore || !userId || !verification) {
    throw new Error('uploadPinVerificationToFirebase: parâmetros inválidos');
  }

  console.log('[SaltManager] 📤 Enviando pinVerification para Firebase...');

  try {
    const settingsRef = doc(firestore, `users/${userId}/settings`, 'encryption');

    await setDoc(settingsRef, {
      pinVerification: JSON.stringify(verification),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('[SaltManager] ✅ pinVerification guardado no Firebase');
  } catch (error) {
    console.error('[SaltManager] ❌ Erro ao guardar:', error);
    throw new Error('Falha ao guardar pinVerification: ' + error.message);
  }
}

/**
 * Buscar pinVerification do Firebase
 */
export async function downloadPinVerificationFromFirebase(firestore, userId) {
  if (!firestore || !userId) {
    throw new Error('downloadPinVerificationFromFirebase: parâmetros inválidos');
  }

  console.log('[SaltManager] 📥 Buscando pinVerification do Firebase...');

  try {
    const settingsRef = doc(firestore, `users/${userId}/settings`, 'encryption');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      console.log('[SaltManager] ⚠️ Documento não encontrado');
      return null;
    }

    const data = settingsSnap.data();
    if (!data.pinVerification) {
      console.log('[SaltManager] ⚠️ pinVerification não encontrado');
      return null;
    }

    const verification = JSON.parse(data.pinVerification);
    console.log('[SaltManager] ✅ pinVerification recuperado com sucesso');

    return verification;
  } catch (error) {
    console.error('[SaltManager] ❌ Erro ao buscar:', error);
    throw new Error('Falha ao buscar pinVerification: ' + error.message);
  }
}

/**
 * Verificar se existe conta PIN no Firebase
 */
export async function checkPinAccountExistsInFirebase(firestore, userId) {
  if (!firestore || !userId) {
    return false;
  }

  console.log('[SaltManager] 🔍 Verificando se conta PIN existe no Firebase...');

  try {
    const settingsRef = doc(firestore, `users/${userId}/settings`, 'encryption');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      console.log('[SaltManager] ❌ Conta PIN não existe');
      return false;
    }

    const data = settingsSnap.data();
    const hasSalt = !!data.salt;
    const hasPinVerification = !!data.pinVerification;

    console.log('[SaltManager]', hasSalt && hasPinVerification ? '✅ Conta PIN existe' : '❌ Conta PIN incompleta');

    return hasSalt && hasPinVerification;
  } catch (error) {
    console.error('[SaltManager] ❌ Erro ao verificar conta:', error);
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SALT DISCOVERY - Buscar todos os salts possíveis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Buscar TODOS os salts possíveis de diferentes locais
 */
export async function getAllPossibleSalts(firebaseDB, userId) {
  const salts = [];

  console.log('[SaltManager] 🔍 Procurando todos os salts disponíveis...');

  // 1. Salt do settings/encryption
  try {
    const salt1 = await downloadSaltFromFirebase(firebaseDB, userId);
    if (salt1) {
      salts.push({
        source: 'settings/encryption',
        salt: salt1,
        label: 'Salt do Firebase Settings'
      });
      console.log('[SaltManager] ✅ Encontrado salt em settings/encryption');
    }
  } catch (error) {
    console.log('[SaltManager] ⚠️ Sem salt em settings/encryption');
  }

  // 2. Salt do item de controlo
  try {
    const salt2 = await recoverSaltFromControlItem(firebaseDB, userId);
    if (salt2) {
      // Verificar se é diferente do salt1
      const isDifferent = !salts.some(s => arraysEqual(s.salt, salt2));

      if (isDifferent) {
        salts.push({
          source: '_system/validation',
          salt: salt2,
          label: 'Salt do Item de Controlo'
        });
        console.log('[SaltManager] ✅ Encontrado salt diferente em _system/validation');
      }
    }
  } catch (error) {
    console.log('[SaltManager] ⚠️ Sem salt em _system/validation');
  }

  // 3. Salt local (se disponível)
  try {
    const localSaltBase64 = await getMetadata('salt');
    if (localSaltBase64) {
      const localSalt = base64ToSalt(localSaltBase64);
      const isDifferent = !salts.some(s => arraysEqual(s.salt, localSalt));

      if (isDifferent) {
        salts.push({
          source: 'localStorage',
          salt: localSalt,
          label: 'Salt Local'
        });
        console.log('[SaltManager] ✅ Encontrado salt diferente em localStorage');
      }
    }
  } catch (error) {
    console.log('[SaltManager] ⚠️ Sem salt em localStorage');
  }

  console.log(`[SaltManager] 📊 Total de salts únicos encontrados: ${salts.length}`);
  return salts;
}

/**
 * Testar qual salt consegue desencriptar um item sample
 */
export async function detectCorrectSalt(firebaseDB, userId, pin, sampleItem) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🕵️ SALT DETECTIVE - Procurando salt correto...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Buscar todos os salts disponíveis
  const possibleSalts = await getAllPossibleSalts(firebaseDB, userId);

  if (possibleSalts.length === 0) {
    console.error('[SaltManager] ❌ Nenhum salt encontrado no Firebase!');
    return {
      found: false,
      error: 'Nenhum salt disponível para testar'
    };
  }

  console.log(`[SaltManager] 🧪 Testando ${possibleSalts.length} salt(s) diferentes...\n`);

  // 2. Testar cada salt com o item sample
  for (let i = 0; i < possibleSalts.length; i++) {
    const { source, salt, label } = possibleSalts[i];

    console.log(`[SaltManager] 🧪 Teste ${i + 1}/${possibleSalts.length}: ${label}`);
    console.log(`[SaltManager]    Fonte: ${source}`);

    try {
      // Tentar desencriptar o item sample
      const decrypted = await decryptFromFirebase(
        sampleItem.data,
        sampleItem.iv,
        pin,
        salt
      );

      console.log(`[SaltManager] ✅ SUCESSO! Este salt conseguiu desencriptar!`);
      console.log(`[SaltManager] 🎯 Salt correto encontrado: ${label}\n`);

      return {
        found: true,
        salt: salt,
        source: source,
        label: label,
        index: i
      };

    } catch (error) {
      console.log(`[SaltManager] ❌ Falhou - ${error.name}`);
      // Continuar para próximo salt
    }
  }

  console.log('\n[SaltManager] ❌ NENHUM salt conseguiu desencriptar o item sample!');
  console.log('[SaltManager] ⚠️ Possíveis causas:');
  console.log('[SaltManager]    1. PIN incorreto');
  console.log('[SaltManager]    2. Dados corrompidos');
  console.log('[SaltManager]    3. Salt original perdido\n');

  return {
    found: false,
    error: 'Nenhum dos salts disponíveis conseguiu desencriptar os dados',
    testedSalts: possibleSalts.length
  };
}

/**
 * Análise completa: detectar conflito de salt e sugerir solução
 */
export async function analyzeSaltConflict(firebaseDB, userId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 ANÁLISE DE CONFLITO DE SALT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Verificar quantos salts diferentes existem
  const possibleSalts = await getAllPossibleSalts(firebaseDB, userId);

  if (possibleSalts.length === 0) {
    return {
      hasConflict: false,
      error: 'Nenhum salt encontrado',
      salts: []
    };
  }

  if (possibleSalts.length === 1) {
    console.log('[SaltManager] ℹ️ Apenas 1 salt encontrado - sem conflito aparente');
    return {
      hasConflict: false,
      salts: possibleSalts,
      message: 'Apenas um salt encontrado. Se erros persistem, salt pode estar incorreto.'
    };
  }

  console.log(`[SaltManager] ⚠️ CONFLITO DETECTADO!`);
  console.log(`[SaltManager] 📊 ${possibleSalts.length} salts DIFERENTES encontrados:\n`);

  possibleSalts.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.label}`);
    console.log(`      Fonte: ${s.source}`);
    console.log(`      Hash: ${s.salt.slice(0, 8).join(',')}.../`);
  });

  console.log('\n[SaltManager] 💡 RECOMENDAÇÃO:');
  console.log('   Execute detectCorrectSalt() com um item sample para');
  console.log('   descobrir qual salt consegue desencriptar os dados históricos.\n');

  return {
    hasConflict: true,
    salts: possibleSalts,
    recommendation: 'Use detectCorrectSalt() para identificar o salt correto'
  };
}

/**
 * Substituir salt incorreto pelo correto em todos os locais
 */
export async function replaceSaltEverywhere(firebaseDB, userId, correctSalt) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 SUBSTITUINDO SALT EM TODOS OS LOCAIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. Atualizar localStorage
    const saltBase64 = saltToBase64(correctSalt);
    await setMetadata('salt', saltBase64);
    console.log('[SaltManager] ✅ LocalStorage atualizado');

    // 2. Atualizar Firebase settings/encryption
    await uploadSaltToFirebase(firebaseDB, userId, correctSalt);
    console.log('[SaltManager] ✅ Firebase settings/encryption atualizado');

    // 3. Nota sobre item de controlo
    console.log('[SaltManager] ⚠️ Item de controlo precisa ser recriado com PIN após login');

    console.log('\n[SaltManager] ✅ Salt substituído em todos os locais acessíveis!');
    console.log('[SaltManager] 💡 Faça logout e login novamente para aplicar mudanças.\n');

    return true;

  } catch (error) {
    console.error('[SaltManager] ❌ Erro ao substituir salt:', error);
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. LOCAL INSPECTION - Comparar salt local com remoto
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Comparar salt local com salts no Firebase
 */
export async function inspectLocalSalt(firebaseDB, userId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 INSPEÇÃO DE SALT LOCAL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Buscar salt local
  console.log('[SaltManager] 📍 Verificando localStorage...');
  const localSaltBase64 = await getMetadata('salt');

  if (!localSaltBase64) {
    console.log('[SaltManager] ❌ Nenhum salt encontrado no localStorage!');
    console.log('[SaltManager] ⚠️ Isto significa que:');
    console.log('[SaltManager]    - localStorage foi limpo');
    console.log('[SaltManager]    - OU nunca foi guardado localmente');
    console.log('[SaltManager]    - OU estás num browser profile diferente\n');
    return {
      hasLocalSalt: false,
      localSalt: null
    };
  }

  const localSalt = base64ToSalt(localSaltBase64);
  console.log('[SaltManager] ✅ Salt encontrado no localStorage!');
  console.log(`[SaltManager]    Preview: ${localSalt.slice(0, 8).join(',')}.../`);
  console.log(`[SaltManager]    Tamanho: ${localSalt.length} bytes\n`);

  // 2. Buscar salts do Firebase
  const remoteSalts = [];

  console.log('[SaltManager] 📍 Buscando salts do Firebase...\n');

  // 2a. Firebase settings/encryption
  try {
    const salt1 = await downloadSaltFromFirebase(firebaseDB, userId);
    if (salt1) {
      remoteSalts.push({
        source: 'settings/encryption',
        salt: salt1,
        label: 'Salt do Firebase Settings'
      });
      console.log('[SaltManager] ✅ Salt encontrado em settings/encryption');
    }
  } catch (error) {
    console.log('[SaltManager] ⚠️ Sem salt em settings/encryption');
  }

  // 2b. Firebase _system/validation
  try {
    const salt2 = await recoverSaltFromControlItem(firebaseDB, userId);
    if (salt2) {
      remoteSalts.push({
        source: '_system/validation',
        salt: salt2,
        label: 'Salt do Item de Controlo'
      });
      console.log('[SaltManager] ✅ Salt encontrado em _system/validation');
    }
  } catch (error) {
    console.log('[SaltManager] ⚠️ Sem salt em _system/validation');
  }

  console.log(`\n[SaltManager] 📊 Total de salts remotos: ${remoteSalts.length}\n`);

  // 3. Comparar local com remoto
  console.log('[SaltManager] 🔍 Comparando local com remoto...\n');

  const comparisons = [];

  for (const remote of remoteSalts) {
    const matches = arraysEqual(localSalt, remote.salt);

    comparisons.push({
      source: remote.source,
      label: remote.label,
      matches: matches
    });

    if (matches) {
      console.log(`[SaltManager] ✅ MATCH! Local = ${remote.label}`);
    } else {
      console.log(`[SaltManager] ❌ DIFERENTE! Local ≠ ${remote.label}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESULTADO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allMatch = comparisons.every(c => c.matches);
  const someMatch = comparisons.some(c => c.matches);
  const noneMatch = comparisons.every(c => !c.matches);

  if (allMatch) {
    console.log('✅ TUDO OK!');
    console.log('   Salt local COINCIDE com todos os salts no Firebase.');
    console.log('   Não há conflito.\n');

    return {
      hasLocalSalt: true,
      localSalt: localSalt,
      localSaltBase64: localSaltBase64,
      status: 'OK',
      message: 'Salt local coincide com Firebase',
      comparisons: comparisons
    };
  }

  if (noneMatch) {
    console.log('🔴 CONFLITO TOTAL!');
    console.log('   Salt local é DIFERENTE de TODOS os salts no Firebase!');
    console.log('\n💡 ISTO SIGNIFICA:');
    console.log('   - Salt local pode ser o SALT ORIGINAL (Salt A)');
    console.log('   - Firebase tem salt(s) DIFERENTE(S) (Salt B)');
    console.log('   - Dados históricos provavelmente encriptados com Salt A (local)');
    console.log('\n📋 RECOMENDAÇÃO:');
    console.log('   Testar se salt LOCAL consegue desencriptar os dados históricos.\n');

    return {
      hasLocalSalt: true,
      localSalt: localSalt,
      localSaltBase64: localSaltBase64,
      status: 'CONFLICT',
      message: 'Salt local DIFERENTE de todos os salts no Firebase',
      comparisons: comparisons,
      recommendation: 'Testar se salt local desencripta dados históricos'
    };
  }

  if (someMatch) {
    const matched = comparisons.find(c => c.matches);
    const notMatched = comparisons.filter(c => !c.matches);

    console.log('🟡 CONFLITO PARCIAL!');
    console.log(`   Salt local = ${matched.label}`);
    console.log(`   Mas DIFERENTE de:`);
    notMatched.forEach(nm => console.log(`     - ${nm.label}`));
    console.log('\n💡 ISTO SIGNIFICA:');
    console.log('   Há múltiplos salts diferentes no Firebase.');
    console.log('   Salt local coincide com um deles.\n');

    return {
      hasLocalSalt: true,
      localSalt: localSalt,
      localSaltBase64: localSaltBase64,
      status: 'PARTIAL_CONFLICT',
      message: 'Salt local coincide com alguns salts mas não todos',
      comparisons: comparisons,
      matched: matched
    };
  }

  return {
    hasLocalSalt: true,
    localSalt: localSalt,
    localSaltBase64: localSaltBase64,
    status: 'UNKNOWN',
    comparisons: comparisons
  };
}

/**
 * Testar qual salt (local ou remoto) desencripta dados históricos
 */
export async function testSaltWithHistoricalData(firebaseDB, userId, pin, sampleItem) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE DE SALT COM DADOS HISTÓRICOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Buscar todos os salts disponíveis (incluindo local)
  const possibleSalts = await getAllPossibleSalts(firebaseDB, userId);

  if (possibleSalts.length === 0) {
    console.log('❌ Nenhum salt disponível para testar!\n');
    return { success: false, error: 'Sem salts disponíveis' };
  }

  console.log(`🧪 Testando ${possibleSalts.length} salt(s) diferentes...\n`);

  for (const saltTest of possibleSalts) {
    console.log(`[SaltManager] 🧪 ${saltTest.label}...`);

    try {
      const decrypted = await decryptFromFirebase(
        sampleItem.data,
        sampleItem.iv,
        pin,
        saltTest.salt
      );

      console.log(`[SaltManager] ✅ SUCESSO! Este salt conseguiu desencriptar!`);
      console.log(`[SaltManager] 🎯 Salt correto: ${saltTest.label}\n`);

      return {
        success: true,
        correctSalt: saltTest.salt,
        correctSaltLabel: saltTest.label,
        correctSaltSource: saltTest.source,
        isLocalSalt: saltTest.source === 'localStorage'
      };

    } catch (error) {
      console.log(`[SaltManager] ❌ Falhou - ${error.name}`);
    }
  }

  console.log('\n❌ NENHUM salt conseguiu desencriptar o item sample!');
  console.log('   Possíveis causas:');
  console.log('   - PIN incorreto');
  console.log('   - Item corrompido');
  console.log('   - Salt original perdido\n');

  return { success: false, error: 'Nenhum salt funcionou' };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. RECOVERY CHECK - Verificar se dados são recuperáveis
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Verificar TODOS os locais possíveis onde salt pode estar
 */
export async function checkAllSaltLocations(firebaseDB, userId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFICAÇÃO COMPLETA DE SALT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const locations = [];

  // 1. Firebase settings/encryption
  console.log('[SaltManager] 📍 Verificando settings/encryption...');
  try {
    const settingsRef = doc(firebaseDB, `users/${userId}/settings`, 'encryption');
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists() && settingsSnap.data().salt) {
      const saltData = settingsSnap.data();
      locations.push({
        location: 'settings/encryption',
        found: true,
        createdAt: saltData.createdAt,
        saltPreview: saltData.salt.substring(0, 20) + '...'
      });
      console.log('[SaltManager] ✅ Salt encontrado em settings/encryption');
      console.log(`        Criado em: ${saltData.createdAt || 'data desconhecida'}`);
    } else {
      console.log('[SaltManager] ❌ Salt NÃO encontrado em settings/encryption');
      locations.push({ location: 'settings/encryption', found: false });
    }
  } catch (error) {
    console.log('[SaltManager] ⚠️ Erro ao verificar settings/encryption:', error.message);
    locations.push({ location: 'settings/encryption', found: false, error: error.message });
  }

  // 2. Firebase _system/validation (item de controlo)
  console.log('[SaltManager] 📍 Verificando _system/validation...');
  try {
    const controlRef = doc(firebaseDB, `users/${userId}/_system`, 'validation');
    const controlSnap = await getDoc(controlRef);

    if (controlSnap.exists() && controlSnap.data().salt) {
      const controlData = controlSnap.data();
      const saltArray = new Uint8Array(controlData.salt);
      locations.push({
        location: '_system/validation',
        found: true,
        lastModified: controlData.lastModified,
        saltPreview: saltArray.slice(0, 8).join(',') + '...'
      });
      console.log('[SaltManager] ✅ Salt encontrado em _system/validation');
      console.log(`        Última modificação: ${controlData.lastModified || 'data desconhecida'}`);
    } else {
      console.log('[SaltManager] ❌ Salt NÃO encontrado em _system/validation');
      locations.push({ location: '_system/validation', found: false });
    }
  } catch (error) {
    console.log('[SaltManager] ⚠️ Erro ao verificar _system/validation:', error.message);
    locations.push({ location: '_system/validation', found: false, error: error.message });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESULTADO DA VERIFICAÇÃO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const foundLocations = locations.filter(l => l.found);

  if (foundLocations.length === 0) {
    console.log('❌ NENHUM salt encontrado no Firebase!');
    console.log('\n🔴 STATUS: DADOS PROVAVELMENTE IRRECUPERÁVEIS');
    console.log('\nPossíveis causas:');
    console.log('  1. Salt nunca foi sincronizado (conta criada antes do saltSync)');
    console.log('  2. Firebase foi limpo/resetado');
    console.log('  3. UID incorreto\n');
    console.log('💡 ÚNICA SOLUÇÃO:');
    console.log('  Se tens acesso ao dispositivo original, recupera salt do localStorage.');
    console.log('  Caso contrário, dados históricos estão PERMANENTEMENTE perdidos.\n');

    return {
      recoverable: false,
      reason: 'Nenhum salt encontrado no Firebase',
      locations: locations,
      recommendation: 'Verificar localStorage do dispositivo original ou aceitar perda de dados'
    };
  }

  if (foundLocations.length === 1) {
    console.log(`✅ 1 salt encontrado: ${foundLocations[0].location}`);
    console.log('\n🟡 STATUS: PODE NÃO SER O SALT CORRETO');
    console.log('\nPróximo passo:');
    console.log('  Testar se este salt consegue desencriptar os dados históricos.');
    console.log('  Use detectCorrectSalt() para verificar.\n');

    return {
      recoverable: 'maybe',
      reason: 'Apenas 1 salt encontrado - precisa teste',
      locations: locations,
      foundLocations: foundLocations,
      recommendation: 'Executar detectCorrectSalt() para testar'
    };
  }

  console.log(`✅ ${foundLocations.length} salts DIFERENTES encontrados!`);
  foundLocations.forEach((loc, i) => {
    console.log(`\n   ${i + 1}. ${loc.location}`);
    console.log(`      Preview: ${loc.saltPreview}`);
    if (loc.createdAt) console.log(`      Criado: ${loc.createdAt}`);
    if (loc.lastModified) console.log(`      Modificado: ${loc.lastModified}`);
  });

  console.log('\n🟢 STATUS: DADOS POTENCIALMENTE RECUPERÁVEIS');
  console.log('\nPróximo passo:');
  console.log('  detectCorrectSalt() vai testar cada um para encontrar o correto.\n');

  return {
    recoverable: true,
    reason: `${foundLocations.length} salts encontrados`,
    locations: locations,
    foundLocations: foundLocations,
    recommendation: 'Executar detectCorrectSalt() - alta probabilidade de sucesso'
  };
}

/**
 * Verificar se dados históricos são recuperáveis
 * Retorna diagnóstico claro para o utilizador
 */
export async function diagnoseSaltSituation(firebaseDB, userId) {
  const check = await checkAllSaltLocations(firebaseDB, userId);

  if (!check.recoverable) {
    return {
      status: 'IRRECUPERÁVEL',
      message:
        '🔴 DADOS HISTÓRICOS IRRECUPERÁVEIS\n\n' +
        'O salt original (Salt A) não foi encontrado em nenhum local do Firebase.\n' +
        'Sem o salt, é IMPOSSÍVEL desencriptar os dados (AES-GCM é criptograficamente seguro).\n\n' +
        'OPÇÕES:\n' +
        '1. Se tens acesso ao dispositivo original → recuperar salt do localStorage\n' +
        '2. Limpar dados históricos do Firebase e recomeçar com salt atual\n' +
        '3. Aceitar perda permanente dos dados históricos',
      canRecover: false,
      check: check
    };
  }

  if (check.recoverable === 'maybe') {
    return {
      status: 'INCERTO',
      message:
        '🟡 RECUPERAÇÃO INCERTA\n\n' +
        'Encontrado 1 salt no Firebase, mas pode não ser o salt original.\n' +
        'Vou tentar desencriptar dados com este salt.\n\n' +
        'Se falhar, dados estão provavelmente perdidos.',
      canRecover: 'maybe',
      check: check
    };
  }

  return {
    status: 'RECUPERÁVEL',
    message:
      '🟢 DADOS RECUPERÁVEIS!\n\n' +
      `Encontrados ${check.foundLocations.length} salts diferentes no Firebase.\n` +
      'detectCorrectSalt() vai testar cada um para encontrar o correto.\n' +
      'Alta probabilidade de sucesso!',
    canRecover: true,
    check: check
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. UTILITIES - Helper functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Comparar dois Uint8Arrays
 */
function arraysEqual(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
