import { doc, getDoc } from 'firebase/firestore';
import { decryptFromFirebase } from './dexieEncryption';
import { downloadSaltFromFirebase, uploadSaltToFirebase } from './saltSync';
import { recoverSaltFromControlItem, createControlItem } from './syncValidation';
import { setMetadata } from '../db/localDB';
import { saltToBase64 } from './encryption';

/**
 * Salt Detective - Encontra qual salt consegue desencriptar dados históricos
 *
 * Problema: Dados históricos encriptados com Salt A, mas Firebase tem Salt B
 * Solução: Testar múltiplos salts disponíveis até encontrar o correto
 */

/**
 * Buscar TODOS os salts possíveis de diferentes locais
 */
async function getAllPossibleSalts(firebaseDB, userId) {
  const salts = [];

  console.log('[SaltDetective] 🔍 Procurando todos os salts disponíveis...');

  // 1. Salt do settings/encryption
  try {
    const salt1 = await downloadSaltFromFirebase(firebaseDB, userId);
    if (salt1) {
      salts.push({
        source: 'settings/encryption',
        salt: salt1,
        label: 'Salt do Firebase Settings'
      });
      console.log('[SaltDetective] ✅ Encontrado salt em settings/encryption');
    }
  } catch (error) {
    console.log('[SaltDetective] ⚠️ Sem salt em settings/encryption');
  }

  // 2. Salt do item de controlo
  try {
    const salt2 = await recoverSaltFromControlItem(firebaseDB, userId);
    if (salt2) {
      // Verificar se é diferente do salt1
      const isDifferent = !salts.some(s =>
        s.salt.length === salt2.length &&
        s.salt.every((byte, i) => byte === salt2[i])
      );

      if (isDifferent) {
        salts.push({
          source: '_system/validation',
          salt: salt2,
          label: 'Salt do Item de Controlo'
        });
        console.log('[SaltDetective] ✅ Encontrado salt diferente em _system/validation');
      }
    }
  } catch (error) {
    console.log('[SaltDetective] ⚠️ Sem salt em _system/validation');
  }

  // 3. TODO: Podemos adicionar mais fontes (ex: backups, outros documentos)

  console.log(`[SaltDetective] 📊 Total de salts únicos encontrados: ${salts.length}`);
  return salts;
}

/**
 * Buscar um item sample de cada coleção para teste
 */
async function getSampleItems(firebaseDB, userId, collections) {
  const samples = [];

  for (const collectionName of collections) {
    try {
      const collectionPath = `users/${userId}/${collectionName}`;
      const docRef = doc(firebaseDB, collectionPath);

      // Tentar buscar o primeiro documento (limitado)
      // Nota: Firestore não tem "getFirst" direto, precisamos usar query
      // Por agora, vamos assumir IDs conhecidos ou usar getDocs limitado

      console.log(`[SaltDetective] 🔍 Buscando sample de ${collectionName}...`);

      // TODO: Implementar busca de sample real
      // Por agora, retornar estrutura vazia

    } catch (error) {
      console.log(`[SaltDetective] ⚠️ Não foi possível buscar sample de ${collectionName}`);
    }
  }

  return samples;
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
    console.error('[SaltDetective] ❌ Nenhum salt encontrado no Firebase!');
    return {
      found: false,
      error: 'Nenhum salt disponível para testar'
    };
  }

  console.log(`[SaltDetective] 🧪 Testando ${possibleSalts.length} salt(s) diferentes...\n`);

  // 2. Testar cada salt com o item sample
  for (let i = 0; i < possibleSalts.length; i++) {
    const { source, salt, label } = possibleSalts[i];

    console.log(`[SaltDetective] 🧪 Teste ${i + 1}/${possibleSalts.length}: ${label}`);
    console.log(`[SaltDetective]    Fonte: ${source}`);

    try {
      // Tentar desencriptar o item sample
      const decrypted = await decryptFromFirebase(
        sampleItem.data,
        sampleItem.iv,
        pin,
        salt
      );

      console.log(`[SaltDetective] ✅ SUCESSO! Este salt conseguiu desencriptar!`);
      console.log(`[SaltDetective] 🎯 Salt correto encontrado: ${label}\n`);

      return {
        found: true,
        salt: salt,
        source: source,
        label: label,
        index: i
      };

    } catch (error) {
      console.log(`[SaltDetective] ❌ Falhou - ${error.name}`);
      // Continuar para próximo salt
    }
  }

  console.log('\n[SaltDetective] ❌ NENHUM salt conseguiu desencriptar o item sample!');
  console.log('[SaltDetective] ⚠️ Possíveis causas:');
  console.log('[SaltDetective]    1. PIN incorreto');
  console.log('[SaltDetective]    2. Dados corrompidos');
  console.log('[SaltDetective]    3. Salt original perdido\n');

  return {
    found: false,
    error: 'Nenhum dos salts disponíveis conseguiu desencriptar os dados',
    testedSalts: possibleSalts.length
  };
}

/**
 * Análise completa: detectar conflito de salt e sugerir solução
 */
export async function analyzeSaltConflict(firebaseDB, userId, pin, collections) {
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
    console.log('[SaltAnalysis] ℹ️ Apenas 1 salt encontrado - sem conflito aparente');
    return {
      hasConflict: false,
      salts: possibleSalts,
      message: 'Apenas um salt encontrado. Se erros persistem, salt pode estar incorreto.'
    };
  }

  console.log(`[SaltAnalysis] ⚠️ CONFLITO DETECTADO!`);
  console.log(`[SaltAnalysis] 📊 ${possibleSalts.length} salts DIFERENTES encontrados:\n`);

  possibleSalts.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.label}`);
    console.log(`      Fonte: ${s.source}`);
    console.log(`      Hash: ${s.salt.slice(0, 8).join(',')}.../`);
  });

  console.log('\n[SaltAnalysis] 💡 RECOMENDAÇÃO:');
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

  // Imports já estão no topo do ficheiro (static)

  try {
    // 1. Atualizar localStorage
    const saltBase64 = saltToBase64(correctSalt);
    await setMetadata('salt', saltBase64);
    console.log('[ReplaceSalt] ✅ LocalStorage atualizado');

    // 2. Atualizar Firebase settings/encryption
    await uploadSaltToFirebase(firebaseDB, userId, correctSalt);
    console.log('[ReplaceSalt] ✅ Firebase settings/encryption atualizado');

    // 3. Atualizar item de controlo (precisa do PIN)
    // Nota: Não podemos criar item de controlo sem PIN
    console.log('[ReplaceSalt] ⚠️ Item de controlo precisa ser recriado com PIN após login');

    console.log('\n[ReplaceSalt] ✅ Salt substituído em todos os locais acessíveis!');
    console.log('[ReplaceSalt] 💡 Faça logout e login novamente para aplicar mudanças.\n');

    return true;

  } catch (error) {
    console.error('[ReplaceSalt] ❌ Erro ao substituir salt:', error);
    return false;
  }
}
