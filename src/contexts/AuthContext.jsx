import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMetadata, setMetadata } from '../db/localDB';
import {
  encrypt,
  decrypt,
  generateSalt,
  saltToBase64,
  base64ToSalt,
  verifyPassword,
  createPasswordVerificationData
} from '../utils/encryption';
import { syncSalt, uploadSaltToFirebase } from '../utils/saltSync';
import { uploadPinVerificationToFirebase, downloadPinVerificationFromFirebase, checkPinAccountExistsInFirebase } from '../utils/pinVerificationSync';
import { createControlItem, recoverSaltFromControlItem } from '../utils/syncValidation';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

      if (saltBase64) {
        // ✅ FALLBACK 1: Salt local existe (melhor caso)
        salt = base64ToSalt(saltBase64);
        console.log('[AuthContext] 📦 Usando salt local');
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

      // Verificar PIN
      const isValid = await verifyPassword(
        pin,
        verification.data,
        verification.iv,
        salt
      );

      if (!isValid) {
        throw new Error('PIN incorreto');
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
   * Logout (limpa chave de encriptação da memória)
   */
  const logout = useCallback(() => {
    setEncryptionKey(null);
    setIsAuthenticated(false);
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
    const { clearAllData } = await import('../db/localDB');
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
