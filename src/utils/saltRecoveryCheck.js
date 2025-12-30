/**
 * Salt Recovery Check - Verificar se dados são recuperáveis
 *
 * Se Salt A não existe EM NENHUM LUGAR → dados IRRECUPERÁVEIS
 * Se Salt A existe algures → dados RECUPERÁVEIS com Salt Detective
 */

import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

/**
 * Verificar TODOS os locais possíveis onde salt pode estar
 */
export async function checkAllSaltLocations(firebaseDB, userId) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 VERIFICAÇÃO COMPLETA DE SALT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const locations = [];

  // 1. Firebase settings/encryption
  console.log('[Check] 📍 Verificando settings/encryption...');
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
      console.log('[Check] ✅ Salt encontrado em settings/encryption');
      console.log(`        Criado em: ${saltData.createdAt || 'data desconhecida'}`);
    } else {
      console.log('[Check] ❌ Salt NÃO encontrado em settings/encryption');
      locations.push({ location: 'settings/encryption', found: false });
    }
  } catch (error) {
    console.log('[Check] ⚠️ Erro ao verificar settings/encryption:', error.message);
    locations.push({ location: 'settings/encryption', found: false, error: error.message });
  }

  // 2. Firebase _system/validation (item de controlo)
  console.log('[Check] 📍 Verificando _system/validation...');
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
      console.log('[Check] ✅ Salt encontrado em _system/validation');
      console.log(`        Última modificação: ${controlData.lastModified || 'data desconhecida'}`);
    } else {
      console.log('[Check] ❌ Salt NÃO encontrado em _system/validation');
      locations.push({ location: '_system/validation', found: false });
    }
  } catch (error) {
    console.log('[Check] ⚠️ Erro ao verificar _system/validation:', error.message);
    locations.push({ location: '_system/validation', found: false, error: error.message });
  }

  // 3. TODO: Verificar outros locais se existirem (backups, etc.)

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
    console.log('  Use Salt Detective para verificar.\n');

    return {
      recoverable: 'maybe',
      reason: 'Apenas 1 salt encontrado - precisa teste',
      locations: locations,
      foundLocations: foundLocations,
      recommendation: 'Executar Salt Detective para testar'
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
  console.log('  Salt Detective vai testar cada um para encontrar o correto.\n');

  return {
    recoverable: true,
    reason: `${foundLocations.length} salts encontrados`,
    locations: locations,
    foundLocations: foundLocations,
    recommendation: 'Executar Salt Detective - alta probabilidade de sucesso'
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
      'Salt Detective vai testar cada um para encontrar o correto.\n' +
      'Alta probabilidade de sucesso!',
    canRecover: true,
    check: check
  };
}
