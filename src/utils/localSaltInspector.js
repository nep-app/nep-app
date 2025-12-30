/**
 * Local Salt Inspector - Verificar salt no localStorage atual
 *
 * Se estás no PC original, o Salt A pode ainda estar aqui!
 */

import { getMetadata } from '../db/localDB';
import { base64ToSalt, saltToBase64 } from './encryption';
import { downloadSaltFromFirebase } from './saltSync';
import { recoverSaltFromControlItem } from './syncValidation';

/**
 * Comparar salt local com salts no Firebase
 */
export async function inspectLocalSalt(firebaseDB, userId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 INSPEÇÃO DE SALT LOCAL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Buscar salt local
  console.log('[Inspector] 📍 Verificando localStorage...');
  const localSaltBase64 = await getMetadata('salt');

  if (!localSaltBase64) {
    console.log('[Inspector] ❌ Nenhum salt encontrado no localStorage!');
    console.log('[Inspector] ⚠️ Isto significa que:');
    console.log('[Inspector]    - localStorage foi limpo');
    console.log('[Inspector]    - OU nunca foi guardado localmente');
    console.log('[Inspector]    - OU estás num browser profile diferente\n');
    return {
      hasLocalSalt: false,
      localSalt: null
    };
  }

  const localSalt = base64ToSalt(localSaltBase64);
  console.log('[Inspector] ✅ Salt encontrado no localStorage!');
  console.log(`[Inspector]    Preview: ${localSalt.slice(0, 8).join(',')}.../`);
  console.log(`[Inspector]    Tamanho: ${localSalt.length} bytes\n`);

  // 2. Buscar salts do Firebase
  const remoteSalts = [];

  console.log('[Inspector] 📍 Buscando salts do Firebase...\n');

  // 2a. Firebase settings/encryption
  try {
    const salt1 = await downloadSaltFromFirebase(firebaseDB, userId);
    if (salt1) {
      remoteSalts.push({
        source: 'settings/encryption',
        salt: salt1,
        label: 'Salt do Firebase Settings'
      });
      console.log('[Inspector] ✅ Salt encontrado em settings/encryption');
    }
  } catch (error) {
    console.log('[Inspector] ⚠️ Sem salt em settings/encryption');
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
      console.log('[Inspector] ✅ Salt encontrado em _system/validation');
    }
  } catch (error) {
    console.log('[Inspector] ⚠️ Sem salt em _system/validation');
  }

  console.log(`\n[Inspector] 📊 Total de salts remotos: ${remoteSalts.length}\n`);

  // 3. Comparar local com remoto
  console.log('[Inspector] 🔍 Comparando local com remoto...\n');

  const comparisons = [];

  for (const remote of remoteSalts) {
    const matches = arraysEqual(localSalt, remote.salt);

    comparisons.push({
      source: remote.source,
      label: remote.label,
      matches: matches
    });

    if (matches) {
      console.log(`[Inspector] ✅ MATCH! Local = ${remote.label}`);
    } else {
      console.log(`[Inspector] ❌ DIFERENTE! Local ≠ ${remote.label}`);
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
 * Helper: comparar dois Uint8Arrays
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Testar qual salt (local ou remoto) desencripta dados históricos
 */
export async function testSaltWithHistoricalData(firebaseDB, userId, pin, sampleItem) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE DE SALT COM DADOS HISTÓRICOS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const inspection = await inspectLocalSalt(firebaseDB, userId);

  if (!inspection.hasLocalSalt) {
    console.log('❌ Sem salt local para testar!\n');
    return { success: false, error: 'Sem salt local' };
  }

  const saltsToTest = [
    {
      label: 'Salt Local (localStorage)',
      salt: inspection.localSalt,
      source: 'localStorage'
    }
  ];

  // Adicionar salts do Firebase para teste também
  try {
    const firebaseSalt = await downloadSaltFromFirebase(firebaseDB, userId);
    if (firebaseSalt && !arraysEqual(firebaseSalt, inspection.localSalt)) {
      saltsToTest.push({
        label: 'Salt do Firebase Settings',
        salt: firebaseSalt,
        source: 'settings/encryption'
      });
    }
  } catch (error) {
    // Ignora
  }

  try {
    const controlSalt = await recoverSaltFromControlItem(firebaseDB, userId);
    if (controlSalt && !arraysEqual(controlSalt, inspection.localSalt)) {
      saltsToTest.push({
        label: 'Salt do Item de Controlo',
        salt: controlSalt,
        source: '_system/validation'
      });
    }
  } catch (error) {
    // Ignora
  }

  console.log(`🧪 Testando ${saltsToTest.length} salt(s) diferentes...\n`);

  const { decryptFromFirebase } = await import('./dexieEncryption');

  for (const saltTest of saltsToTest) {
    console.log(`[Teste] 🧪 ${saltTest.label}...`);

    try {
      const decrypted = await decryptFromFirebase(
        sampleItem.data,
        sampleItem.iv,
        pin,
        saltTest.salt
      );

      console.log(`[Teste] ✅ SUCESSO! Este salt conseguiu desencriptar!`);
      console.log(`[Teste] 🎯 Salt correto: ${saltTest.label}\n`);

      return {
        success: true,
        correctSalt: saltTest.salt,
        correctSaltLabel: saltTest.label,
        correctSaltSource: saltTest.source,
        isLocalSalt: saltTest.source === 'localStorage'
      };

    } catch (error) {
      console.log(`[Teste] ❌ Falhou - ${error.name}`);
    }
  }

  console.log('\n❌ NENHUM salt conseguiu desencriptar o item sample!');
  console.log('   Possíveis causas:');
  console.log('   - PIN incorreto');
  console.log('   - Item corrompido');
  console.log('   - Salt original perdido\n');

  return { success: false, error: 'Nenhum salt funcionou' };
}

/**
 * Comando principal para executar inspeção completa
 */
export async function runSaltInspection(firebaseDB, userId) {
  const inspection = await inspectLocalSalt(firebaseDB, userId);

  if (inspection.status === 'OK') {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Sem ação necessária. Salt está sincronizado.\n');
    return inspection;
  }

  if (inspection.status === 'CONFLICT') {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️ AÇÃO NECESSÁRIA:');
    console.log('   Testar qual salt (local ou Firebase) desencripta os dados.');
    console.log('   Use testSaltWithHistoricalData() com um item sample.\n');
    return inspection;
  }

  return inspection;
}
