import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMetadata, setMetadata, clearUserDataOnly, clearAllData } from '../db/localDB';
import {
  encrypt,
  decrypt,
  generateSalt,
  saltToBase64,
  base64ToSalt,
  verifyPassword,
  createPasswordVerificationData
} from '../utils/encryption';
import { decryptFromFirebase } from '../utils/dexieEncryption';
import { syncSalt, uploadSaltToFirebase } from '../utils/saltSync';
import { uploadPinVerificationToFirebase, downloadPinVerificationFromFirebase, checkPinAccountExistsInFirebase } from '../utils/pinVerificationSync';
import { createControlItem, recoverSaltFromControlItem } from '../utils/syncValidation';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '../utils/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * AuthProvider - Gere autenticação local com PIN/Password
 *
 * Funcionalidades:
 * - Criar conta com email + PIN
 * - Login com PIN
 * - Encriptação E2E de todos os dados
 * - Salt sincronizado com Firebase (cross-device support)
 * - Auto-lock após inatividade
 * - Verificação biométrica (futuro)
 */
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null); // PIN do utilizador (em memória apenas)
  const [loading, setLoading] = useState(true);

  // Inicializar Firebase (singleton - safe to call multiple times)
  const [firebaseInstances] = useState(() => {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    return {
      auth: getAuth(app),
      firestore: getFirestore(app)
    };
  });

  // Auto-lock state
  const [lastActivity, setLastActivity] = useState(Date.now());
  const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutos

  /**
   * Verifica se a app já foi inicializada (conta criada)
   */
  const checkInitialization = useCallback(async () => {
    try {
      const email = await getMetadata('userEmail');
      const salt = await getMetadata('salt');
      const pinVerification = await getMetadata('pinVerification');

      setUserEmail(email);
      setIsInitialized(!!email);
    } catch (error) {
      console.error('Error checking initialization:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar se já existe conta criada
  useEffect(() => {
    checkInitialization();
  }, [checkInitialization]);

  // TEMPORARIAMENTE DESABILITADO - Auto-lock após inatividade
  // useEffect(() => {
  //   if (!isAuthenticated) return;

  //   const checkInactivity = setInterval(() => {
  //     const now = Date.now();
  //     if (now - lastActivity > AUTO_LOCK_TIMEOUT) {
  //       logout();
  //     }
  //   }, 10000); // Check every 10s

  //   return () => clearInterval(checkInactivity);
  // }, [isAuthenticated, lastActivity, logout]);

  // TEMPORARIAMENTE DESABILITADO - Atualizar lastActivity em qualquer interação
  // useEffect(() => {
  //   const updateActivity = () => setLastActivity(Date.now());

  //   window.addEventListener('mousedown', updateActivity);
  //   window.addEventListener('keydown', updateActivity);
  //   window.addEventListener('touchstart', updateActivity);

  //   return () => {
  //     window.removeEventListener('mousedown', updateActivity);
  //     window.removeEventListener('keydown', updateActivity);
  //     window.removeEventListener('touchstart', updateActivity);
  //   };
  // }, []);

  /**
   * Criar nova conta (primeiro uso)
   *
   * @param {string} email - Email do utilizador
   * @param {string} pin - PIN de 4-6 dígitos
   */
  const createAccount = useCallback(async (email, pin) => {
    try {
      // Validações
      if (email && !email.includes('@')) {
        throw new Error('Email inválido');
      }
      if (!pin || pin.length < 4) {
        throw new Error('PIN deve ter pelo menos 4 dígitos');
      }

      console.log('[AuthContext] 🔧 Criando conta...');

      // Obter Firebase user atual
      const firebaseUser = firebaseInstances.auth.currentUser;
      if (!firebaseUser) {
        console.warn('[AuthContext] ⚠️ Nenhum Firebase user - usando salt local');
      }

      let salt;

      if (firebaseUser) {
        // SYNC com Firebase: buscar salt existente ou criar novo
        console.log('[AuthContext] 🔄 Sincronizando salt com Firebase...');
        salt = await syncSalt(firebaseInstances.firestore, firebaseUser.uid);
      } else {
        // Fallback: gerar salt local (caso não tenha Firebase user)
        console.log('[AuthContext] ⚠️ Gerando salt local (sem Firebase)');
        salt = generateSalt();
      }

      const saltBase64 = saltToBase64(salt);

      // Criar dados de verificação do PIN
      const verification = await createPasswordVerificationData(pin, salt);

      // Guardar metadados LOCALMENTE
      await setMetadata('userEmail', email || 'sem-email');
      await setMetadata('salt', saltBase64);
      await setMetadata('pinVerification', JSON.stringify(verification));
      await setMetadata('createdAt', new Date().toISOString());

      // SYNC com Firebase: guardar pinVerification na nuvem
      if (firebaseUser) {
        try {
          console.log('[AuthContext] 📤 Guardando pinVerification no Firebase...');
          await uploadPinVerificationToFirebase(firebaseInstances.firestore, firebaseUser.uid, verification);
          console.log('[AuthContext] ✅ pinVerification guardado no Firebase');
        } catch (error) {
          console.error('[AuthContext] ⚠️ Erro ao guardar pinVerification no Firebase (não crítico):', error);
          // Não falhar a criação da conta se sync falhar
        }

        // Criar item de controlo para validação futura
        try {
          console.log('[AuthContext] 🔧 Criando item de controlo para validação...');
          await createControlItem(firebaseInstances.firestore, firebaseUser.uid, pin, salt);
          console.log('[AuthContext] ✅ Item de controlo criado');
        } catch (error) {
          console.error('[AuthContext] ⚠️ Erro ao criar item de controlo (não crítico):', error);
        }
      }

      // Atualizar estado
      setUserEmail(email || 'sem-email');
      setEncryptionKey(pin);
      setIsInitialized(true);
      setIsAuthenticated(true);
      setLastActivity(Date.now());

      console.log('[AuthContext] ✅ Conta criada com sucesso');
      return { success: true };
    } catch (error) {
      console.error('[AuthContext] ❌ Erro ao criar conta:', error);
      return { success: false, error: error.message };
    }
  }, [firebaseInstances]);

  /**
   * Login com PIN
   *
   * @param {string} pin - PIN do utilizador
   */
  const login = useCallback(async (pin) => {
    try {
      console.log('[AuthContext] 🔓 Fazendo login...');

      // Obter Firebase user atual
      const firebaseUser = firebaseInstances.auth.currentUser;

      // RECUPERAÇÃO DE SALT COM FALLBACKS MÚLTIPLOS
      let saltBase64 = await getMetadata('salt');
      let salt;
      let saltFromFirebase = null;

      // 🔥 SEMPRE buscar salt do Firebase PRIMEIRO (fonte da verdade)
      if (firebaseUser) {
        console.log('[AuthContext] 🔄 Buscando salt do Firebase (fonte da verdade)...');

        try {
          saltFromFirebase = await syncSalt(firebaseInstances.firestore, firebaseUser.uid);
          console.log('[AuthContext] ✅ Salt do Firebase obtido');
        } catch (error) {
          console.warn('[AuthContext] ⚠️ Não foi possível buscar salt do Firebase:', error);
        }
      }

      // Se temos salt do Firebase E salt local, comparar
      if (saltFromFirebase && saltBase64) {
        const saltLocal = base64ToSalt(saltBase64);

        // Comparar byte a byte
        let isDifferent = saltLocal.length !== saltFromFirebase.length;
        if (!isDifferent) {
          for (let i = 0; i < saltLocal.length; i++) {
            if (saltLocal[i] !== saltFromFirebase[i]) {
              isDifferent = true;
              break;
            }
          }
        }

        if (isDifferent) {
          console.warn('[AuthContext] ⚠️ SALT LOCAL DIFERENTE DO FIREBASE!');
          console.warn('[AuthContext] 🔄 Substituindo salt local pelo salt do Firebase (correto)...');

          salt = saltFromFirebase;
          saltBase64 = saltToBase64(salt);
          await setMetadata('salt', saltBase64);

          console.log('[AuthContext] ✅ Salt local SUBSTITUÍDO pelo salt do Firebase');

          // 🔥 CRÍTICO: Se salt mudou, precisamos RE-BAIXAR pinVerification do Firebase!
          // (porque o pinVerification local foi criado com o salt antigo)
          console.warn('[AuthContext] 🔄 Salt mudou - apagando pinVerification local (será re-baixado do Firebase)...');
          await setMetadata('pinVerification', null);
        } else {
          console.log('[AuthContext] ✅ Salt local coincide com Firebase');
          salt = saltLocal;
        }
      } else if (saltFromFirebase) {
        // Só temos Firebase salt
        console.log('[AuthContext] 📥 Usando salt do Firebase (local não existe)');
        salt = saltFromFirebase;
        saltBase64 = saltToBase64(salt);
        await setMetadata('salt', saltBase64);
      } else if (saltBase64) {
        // ✅ FALLBACK: Salt local existe mas Firebase não respondeu
        salt = base64ToSalt(saltBase64);
        console.log('[AuthContext] 📦 Usando salt local (Firebase indisponível)');
      } else if (firebaseUser) {
        // ⚠️ Salt local NÃO existe → tentar recuperar do Firebase
        console.log('[AuthContext] ⚠️ Salt local não encontrado - tentando recuperar do Firebase...');

        // ✅ FALLBACK 2: Buscar do Firebase settings/encryption
        try {
          salt = await syncSalt(firebaseInstances.firestore, firebaseUser.uid);
          console.log('[AuthContext] ✅ Salt recuperado do Firebase (settings/encryption)');
        } catch (error) {
          console.error('[AuthContext] ❌ Falha ao buscar salt de settings/encryption:', error);

          // ✅ FALLBACK 3: Buscar do item de controlo
          console.log('[AuthContext] 🔄 Tentando recuperar salt do item de controlo...');
          const recoveredSalt = await recoverSaltFromControlItem(
            firebaseInstances.firestore,
            firebaseUser.uid
          );

          if (recoveredSalt) {
            salt = recoveredSalt;
            console.log('[AuthContext] ✅ Salt recuperado do item de controlo!');

            // Guardar nos outros locais para sincronização
            try {
              await uploadSaltToFirebase(firebaseInstances.firestore, firebaseUser.uid, salt);
              console.log('[AuthContext] ✅ Salt re-sincronizado para settings/encryption');
            } catch (uploadError) {
              console.warn('[AuthContext] ⚠️ Não foi possível re-sincronizar salt:', uploadError);
            }
          } else {
            throw new Error(
              'SALT IRRECUPERÁVEL!\n\n' +
              'Salt não encontrado em:\n' +
              '- LocalStorage\n' +
              '- Firebase settings/encryption\n' +
              '- Firebase _system/validation\n\n' +
              'Sem o salt original, é impossível desencriptar os dados.\n' +
              'Pode ser necessário criar uma nova conta.'
            );
          }
        }

        saltBase64 = saltToBase64(salt);

        // Guardar localmente para próximas vezes
        await setMetadata('salt', saltBase64);
        console.log('[AuthContext] ✅ Salt guardado localmente');
      } else {
        throw new Error('Salt não encontrado e nenhum Firebase user disponível');
      }

      // Obter dados de verificação do PIN
      let verificationJSON = await getMetadata('pinVerification');
      let verification;

      if (!verificationJSON && firebaseUser) {
        // Não tem local → buscar do Firebase
        console.log('[AuthContext] 📥 PIN verification não encontrado localmente, buscando do Firebase...');
        verification = await downloadPinVerificationFromFirebase(firebaseInstances.firestore, firebaseUser.uid);

        if (!verification) {
          throw new Error('Conta PIN não encontrada. Cria uma conta primeiro.');
        }

        // Guardar localmente para próximas vezes
        await setMetadata('pinVerification', JSON.stringify(verification));
        console.log('[AuthContext] ✅ PIN verification sincronizado do Firebase');
      } else if (verificationJSON) {
        verification = JSON.parse(verificationJSON);
      } else {
        throw new Error('Dados de verificação do PIN não encontrados');
      }

      // Verificar PIN - TENTAR DIRETO COM DECRYPT PARA CAPTURAR ERRO
      let isValid = false;
      let needsPinVerificationRecovery = false;
      let verifyError = null;

      // 🔧 TENTAR DESENCRIPTAR DIRETAMENTE (em vez de verifyPassword que engole o erro)
      try {
        await decrypt(verification.data, verification.iv, pin, salt);
        isValid = true;
      } catch (error) {
        verifyError = error;
        console.warn('[AuthContext] ⚠️ Erro ao verificar PIN:', error.name);
      }

      // 🚨 RECUPERAÇÃO AUTOMÁTICA: Se PIN falhar, tentar validar com item de controlo
      if (!isValid && verifyError && firebaseUser) {
        console.log('[AuthContext] 🔧 Tentando recuperação automática...');

        try {
          // Buscar item de controlo do Firebase
          const controlDoc = await getDoc(doc(firebaseInstances.firestore, `users/${firebaseUser.uid}/_system/validation`));

          if (controlDoc.exists()) {
            const controlData = controlDoc.data();

            // 🔑 SALT RECOVERY: Item de controlo guarda o salt ORIGINAL (não encriptado!)
            if (controlData.salt) {
              const correctSalt = new Uint8Array(controlData.salt);
              console.log('[AuthContext] 🔍 Salt original encontrado no item de controlo!');
              console.log('[AuthContext] 🧪 Testando PIN com salt do item de controlo...');

              try {
                await decryptFromFirebase(controlData.data, controlData.iv, pin, correctSalt);

                // ✅ PIN está CORRETO com o salt do item de controlo!
                console.log('[AuthContext] ✅ PIN VALIDADO com salt do item de controlo!');
                console.log('[AuthContext] 🔧 Atualizando salt local e Firebase...');

                // Atualizar salt para o correto
                salt = correctSalt;
                saltBase64 = saltToBase64(salt);
                await setMetadata('salt', saltBase64);

                // 🔥 CRÍTICO: Atualizar salt no Firebase também!
                try {
                  await uploadSaltToFirebase(firebaseInstances.firestore, firebaseUser.uid, salt);
                  console.log('[AuthContext] ✅ Salt correto sincronizado para Firebase');
                } catch (uploadError) {
                  console.warn('[AuthContext] ⚠️ Não foi possível atualizar salt no Firebase:', uploadError);
                }

                isValid = true;
                needsPinVerificationRecovery = true;
              } catch (decryptError) {
                console.error('[AuthContext] ❌ PIN incorreto mesmo com salt do item de controlo');
              }
            } else {
              console.warn('[AuthContext] ⚠️ Item de controlo não tem salt guardado');
            }
          } else {
            console.warn('[AuthContext] ⚠️ Item de controlo não encontrado no Firebase');
          }
        } catch (recoveryError) {
          console.error('[AuthContext] ❌ Recuperação automática falhou:', recoveryError.name);
          // PIN realmente está incorreto
        }
      }

      if (!isValid) {
        throw new Error('PIN incorreto');
      }

      // 🔧 Se pinVerification estava corrompido mas PIN é válido, recriá-lo
      if (needsPinVerificationRecovery) {
        try {
          console.log('[AuthContext] 🔧 Recriando pinVerification com salt correto...');
          const newVerification = await createPasswordVerificationData(pin, salt);

          // Guardar localmente
          await setMetadata('pinVerification', JSON.stringify(newVerification));

          // Guardar no Firebase
          if (firebaseUser) {
            await uploadPinVerificationToFirebase(firebaseInstances.firestore, firebaseUser.uid, newVerification);
          }

          console.log('[AuthContext] ✅ pinVerification recuperado com sucesso!');
        } catch (recreateError) {
          console.error('[AuthContext] ⚠️ Erro ao recriar pinVerification (não crítico):', recreateError);
          // Não falhar o login por causa disto
        }
      }

      // Login bem-sucedido
      setEncryptionKey(pin);
      setIsAuthenticated(true);
      setLastActivity(Date.now());

      // MIGRAÇÃO/SYNC: Garantir que pinVerification está no Firebase
      // (importante para contas antigas criadas antes do sync existir)
      if (firebaseUser && verificationJSON) {
        try {
          console.log('[AuthContext] 🔄 Verificando sync de pinVerification com Firebase...');
          await uploadPinVerificationToFirebase(firebaseInstances.firestore, firebaseUser.uid, verification);
          console.log('[AuthContext] ✅ pinVerification sincronizado com Firebase');
        } catch (error) {
          console.error('[AuthContext] ⚠️ Erro ao sincronizar pinVerification (não crítico):', error);
          // Não falhar o login se sync falhar
        }

        // Criar/atualizar item de controlo para validação futura
        try {
          console.log('[AuthContext] 🔧 Criando/atualizando item de controlo...');
          await createControlItem(firebaseInstances.firestore, firebaseUser.uid, pin, salt);
          console.log('[AuthContext] ✅ Item de controlo criado/atualizado');
        } catch (error) {
          console.error('[AuthContext] ⚠️ Erro ao criar item de controlo (não crítico):', error);
        }
      }

      console.log('[AuthContext] ✅ Login bem-sucedido');
      return { success: true };
    } catch (error) {
      console.error('[AuthContext] ❌ Erro no login:', error);
      return { success: false, error: error.message };
    }
  }, [firebaseInstances]);

  /**
   * Logout (limpa chave de encriptação da memória + dados do utilizador)
   */
  const logout = useCallback(async () => {
    // Limpar apenas dados do utilizador, MAS manter metadados de autenticação
    // (userEmail, salt, pinVerification) para que a app saiba que a conta existe
    await clearUserDataOnly();
    console.log('[Auth] 🗑️ Dados do utilizador limpos no logout (metadados mantidos)');

    // Limpar estado
    setEncryptionKey(null);
    setIsAuthenticated(false);
    setUserEmail(null);
  }, []);

  /**
   * Alterar PIN
   *
   * @param {string} currentPin - PIN atual
   * @param {string} newPin - Novo PIN
   */
  const changePin = useCallback(async (currentPin, newPin) => {
    try {
      // Verificar PIN atual
      const loginResult = await login(currentPin);
      if (!loginResult.success) {
        throw new Error('PIN atual incorreto');
      }

      // Validar novo PIN
      if (!newPin || newPin.length < 4) {
        throw new Error('Novo PIN deve ter pelo menos 4 dígitos');
      }

      // Obter salt
      const saltBase64 = await getMetadata('salt');
      const salt = base64ToSalt(saltBase64);

      // Criar novos dados de verificação com novo PIN
      const verification = await createPasswordVerificationData(newPin, salt);
      await setMetadata('pinVerification', JSON.stringify(verification));

      // IMPORTANTE: Aqui precisaríamos re-encriptar TODOS os dados com novo PIN
      // Por agora, só atualizamos a verificação
      // TODO: Implementar re-encriptação de dados em background

      // Atualizar chave em memória
      setEncryptionKey(newPin);

      return { success: true };
    } catch (error) {
      console.error('Error changing PIN:', error);
      return { success: false, error: error.message };
    }
  }, [login]);

  /**
   * Obter salt do utilizador (necessário para encriptação/desencriptação)
   */
  const getUserSalt = useCallback(async () => {
    const saltBase64 = await getMetadata('salt');
    if (!saltBase64) {
      throw new Error('Salt não encontrado - utilizador não inicializado');
    }
    return base64ToSalt(saltBase64);
  }, []);

  /**
   * Resetar app (apagar tudo - CUIDADO!)
   */
  const resetApp = useCallback(async () => {
    await clearAllData();
    setUserEmail(null);
    setEncryptionKey(null);
    setIsInitialized(false);
    setIsAuthenticated(false);
  }, []);

  /**
   * Verifica se já existe conta (helper para AuthScreen)
   * Verificar não só email, mas também salt e pinVerification
   */
  const hasAccount = useCallback(async () => {
    try {
      const email = await getMetadata('userEmail');
      const salt = await getMetadata('salt');
      const pinVerification = await getMetadata('pinVerification');

      // Conta só existe se tiver TODOS os dados necessários
      const accountExists = !!email && !!salt && !!pinVerification;


      return accountExists;
    } catch (error) {
      console.error('[hasAccount] Error:', error);
      return false;
    }
  }, []);

  /**
   * Verifica se existe conta PIN no Firebase
   * (auto-detecção para reconhecimento de perfil)
   */
  const checkRemoteAccount = useCallback(async () => {
    try {
      const firebaseUser = firebaseInstances.auth.currentUser;
      if (!firebaseUser) {
        return false;
      }

      return await checkPinAccountExistsInFirebase(firebaseInstances.firestore, firebaseUser.uid);
    } catch (error) {
      console.error('[checkRemoteAccount] Error:', error);
      return false;
    }
  }, [firebaseInstances]);

  const value = {
    // Estado
    isAuthenticated,
    isInitialized,
    loading,
    userEmail,
    encryptionKey, // PIN do utilizador (só disponível quando autenticado)

    // Métodos
    createAccount,
    login,
    logout,
    changePin,
    getUserSalt,
    hasAccount,
    checkRemoteAccount, // Verificar conta no Firebase (auto-detecção)
    resetApp
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
