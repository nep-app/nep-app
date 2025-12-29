import React, { createContext, useContext, useState, useEffect } from 'react';
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
 * - Auto-lock após inatividade
 * - Verificação biométrica (futuro)
 */
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null); // PIN do utilizador (em memória apenas)
  const [loading, setLoading] = useState(true);

  // Auto-lock state
  const [lastActivity, setLastActivity] = useState(Date.now());
  const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutos

  // Verificar se já existe conta criada
  useEffect(() => {
    checkInitialization();
  }, []);

  // Auto-lock após inatividade
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkInactivity = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > AUTO_LOCK_TIMEOUT) {
        logout();
      }
    }, 10000); // Check every 10s

    return () => clearInterval(checkInactivity);
  }, [isAuthenticated, lastActivity]);

  // Atualizar lastActivity em qualquer interação
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());

    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    return () => {
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, []);

  /**
   * Verifica se a app já foi inicializada (conta criada)
   */
  async function checkInitialization() {
    try {
      const email = await getMetadata('userEmail');
      setUserEmail(email);
      setIsInitialized(!!email);
    } catch (error) {
      console.error('Error checking initialization:', error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Criar nova conta (primeiro uso)
   *
   * @param {string} email - Email do utilizador
   * @param {string} pin - PIN de 4-6 dígitos
   */
  async function createAccount(email, pin) {
    try {
      // Validações
      if (!email || !email.includes('@')) {
        throw new Error('Email inválido');
      }
      if (!pin || pin.length < 4) {
        throw new Error('PIN deve ter pelo menos 4 dígitos');
      }

      // Gerar salt único para este utilizador
      const salt = generateSalt();
      const saltBase64 = saltToBase64(salt);

      // Criar dados de verificação do PIN
      const verification = await createPasswordVerificationData(pin, salt);

      // Guardar metadados
      await setMetadata('userEmail', email);
      await setMetadata('salt', saltBase64);
      await setMetadata('pinVerification', JSON.stringify(verification));
      await setMetadata('createdAt', new Date().toISOString());

      // Atualizar estado
      setUserEmail(email);
      setEncryptionKey(pin);
      setIsInitialized(true);
      setIsAuthenticated(true);
      setLastActivity(Date.now());

      return { success: true };
    } catch (error) {
      console.error('Error creating account:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Login com PIN
   *
   * @param {string} pin - PIN do utilizador
   */
  async function login(pin) {
    try {
      // Obter salt e dados de verificação
      const saltBase64 = await getMetadata('salt');
      const verificationJSON = await getMetadata('pinVerification');

      if (!saltBase64 || !verificationJSON) {
        throw new Error('Dados de autenticação não encontrados');
      }

      const salt = base64ToSalt(saltBase64);
      const verification = JSON.parse(verificationJSON);

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

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Logout (limpa chave de encriptação da memória)
   */
  function logout() {
    setEncryptionKey(null);
    setIsAuthenticated(false);
  }

  /**
   * Alterar PIN
   *
   * @param {string} currentPin - PIN atual
   * @param {string} newPin - Novo PIN
   */
  async function changePin(currentPin, newPin) {
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
  }

  /**
   * Obter salt do utilizador (necessário para encriptação/desencriptação)
   */
  async function getUserSalt() {
    const saltBase64 = await getMetadata('salt');
    if (!saltBase64) {
      throw new Error('Salt não encontrado - utilizador não inicializado');
    }
    return base64ToSalt(saltBase64);
  }

  /**
   * Resetar app (apagar tudo - CUIDADO!)
   */
  async function resetApp() {
    const { clearAllData } = await import('../db/localDB');
    await clearAllData();
    setUserEmail(null);
    setEncryptionKey(null);
    setIsInitialized(false);
    setIsAuthenticated(false);
  }

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
    resetApp
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
