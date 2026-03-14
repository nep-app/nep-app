import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PINEntry } from './PINEntry';
import { useAuth } from '../contexts/AuthContext';
import * as Icons from './Icons';

/**
 * Ecrã de autenticação - Cria conta OU faz login
 *
 * Fluxo:
 * 1. Verifica se já existe conta (hasAccount)
 * 2. Se não: mostra criação de conta (email + PIN + confirmar PIN)
 * 3. Se sim: mostra login (PIN)
 */
export const AuthScreen = ({ onFirebaseLogout }) => {
  const { t } = useTranslation();
  const { login, createAccount, hasAccount, checkRemoteAccount, resetApp, logout } = useAuth();
  const [accountExists, setAccountExists] = useState(null);
  const [loading, setLoading] = useState(true);

  // Criar conta
  const [step, setStep] = useState('email'); // 'email' | 'pin' | 'confirm'
  const [email, setEmail] = useState('');
  const [firstPIN, setFirstPIN] = useState('');
  const [error, setError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // RECONHECIMENTO DE PERFIL INTELIGENTE
  // Verifica conta local E remota (Firebase) automaticamente
  useEffect(() => {
    const checkAccount = async () => {
      console.log('[AuthScreen] 🔍 Verificando contas (local e Firebase)...');

      // 1. Verificar conta local
      const localExists = await hasAccount();

      if (localExists) {
        console.log('[AuthScreen] ✅ Conta local encontrada');
        setAccountExists(true);
        setLoading(false);
        return;
      }

      // 2. Conta local não existe → verificar Firebase
      console.log('[AuthScreen] 🔍 Conta local não encontrada, verificando Firebase...');
      const remoteExists = await checkRemoteAccount();

      if (remoteExists) {
        console.log('[AuthScreen] ✅ Conta encontrada no Firebase! Auto-switch para login PIN');
        setAccountExists(true); // Forçar modo login
      } else {
        console.log('[AuthScreen] ❌ Nenhuma conta encontrada (local ou Firebase)');
        setAccountExists(false);
      }

      setLoading(false);
    };
    checkAccount();
  }, [hasAccount, checkRemoteAccount]);

  // LOGIN: Tentar fazer login com PIN
  const isSubmittingRef = useRef(false);

  const handleLogin = useCallback(async (pin) => {

    // Prevent concurrent submissions
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setError('');

    const result = await login(pin);

    if (!result.success) {
      setError(result.error || t('auth.pinWrong'));
    }

    isSubmittingRef.current = false;
  }, [login, t]);

  // EMERGENCY RESET: Resetar dados locais e re-sincronizar do Firebase
  const handleEmergencyReset = async () => {
    try {
      console.log('[AuthScreen] 🚨 EMERGENCY RESET - Apagando dados locais...');
      setLoading(true);
      setError('');

      // Apagar tudo
      await resetApp();

      console.log('[AuthScreen] ✅ Dados locais apagados, recarregando...');

      // Aguardar um pouco para garantir que tudo foi limpo
      await new Promise(resolve => setTimeout(resolve, 500));

      // Recarregar página para forçar re-inicialização
      window.location.reload();
    } catch (error) {
      console.error('[AuthScreen] ❌ Erro no emergency reset:', error);
      setError(t('auth.resetError'));
      setLoading(false);
    }
  };

  // CRIAR CONTA: Fluxo de 3 passos
  const handleEmailSubmit = (e) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setError(t('auth.emailInvalid'));
      return;
    }

    setError('');
    setStep('pin');
  };

  const handleFirstPIN = useCallback((pin) => {
    setFirstPIN(pin);
    setStep('confirm');
  }, []);

  const handleConfirmPIN = useCallback(async (pin) => {
    if (pin !== firstPIN) {
      setError(t('auth.pinMismatch'));
      setStep('pin');
      setFirstPIN('');
      return;
    }

    setError('');

    // Criar conta
    const result = await createAccount(email, pin);

    if (!result.success) {
      setError(result.error || t('auth.createError'));
      setStep('email');
      setEmail('');
      setFirstPIN('');
    }
    // Se success, o AuthContext já vai mudar isAuthenticated para true
  }, [firstPIN, email, createAccount, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
        <div className="text-center">
          <Icons.RefreshCw className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-300">{t('auth.loading')}</p>
        </div>
      </div>
    );
  }

  // LOGIN: Conta já existe (local OU Firebase)
  if (accountExists) {
    // Modal de confirmação de reset
    if (showResetConfirm) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
          <div className="w-full max-w-md bg-gray-800 rounded-lg p-6 border-2 border-red-500/50">
            <div className="text-center mb-6">
              <Icons.AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">{t('auth.resetTitle')}</h2>
              <p className="text-gray-300 text-sm mb-4">
                {t('auth.resetDescription')}
              </p>
              <ul className="text-left text-gray-300 text-sm space-y-2 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>{t('auth.resetBullet1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>{t('auth.resetBullet2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>{t('auth.resetBullet3')}</span>
                </li>
              </ul>
              <p className="text-yellow-300 text-xs bg-yellow-900/20 border border-yellow-700/50 rounded p-2">
                {t('auth.resetHint')}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleEmergencyReset}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-all font-medium"
              >
                {t('auth.resetConfirm')}
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  setError('');
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-all font-medium"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Tela de login normal
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
        <div className="w-full max-w-md">
          <PINEntry
            key="login"
            title={t('auth.loginTitle')}
            subtitle={t('auth.loginSubtitle')}
            onComplete={handleLogin}
            error={error}
          />

          {/* Mostrar botão de reset APENAS se houver erro de PIN */}
          {error && error.includes('PIN') && (
            <div className="mt-6">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/50 text-yellow-300 py-3 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Icons.RefreshCw className="w-4 h-4" />
                {t('auth.resetLink')}
              </button>
              <p className="text-center text-xs text-gray-400 mt-2">
                {t('auth.firebaseNote')}
              </p>
            </div>
          )}

          {/* Botões de navegação */}
          <div className="mt-6 space-y-3">
            {/* Opção de criar nova conta */}
            <button
              onClick={() => setAccountExists(false)}
              className="w-full bg-gray-700/50 hover:bg-gray-700 border border-gray-600 text-gray-300 py-3 rounded-lg transition-all text-sm font-medium"
            >
              {t('auth.noAccount')}
            </button>

            {/* Botão para trocar de conta */}
            <button
              onClick={async () => {
                await logout();
                if (onFirebaseLogout) {
                  onFirebaseLogout();
                }
              }}
              className="w-full bg-gray-700/50 hover:bg-gray-700 border border-gray-600 text-gray-300 py-3 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <Icons.LogOut className="w-4 h-4" />
              {t('auth.switchAccount')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CRIAR CONTA: Não existe conta ainda
  // Step 1: Email
  if (step === 'email') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Icons.Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('auth.createTitle')}</h1>
            <p className="text-purple-300 text-sm">{t('auth.step1')}</p>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">
                {t('auth.emailLabel')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-medium flex items-center justify-center gap-2"
            >
              {t('auth.continue')}
              <Icons.ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {/* Opção de mudar para Login */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setAccountExists(true)}
              className="w-full bg-gray-700/50 hover:bg-gray-700 border border-gray-600 text-gray-300 py-3 rounded-lg transition-all text-sm font-medium"
            >
              {t('auth.hasAccount')}
            </button>
          </div>

          {/* Info */}
          <div className="mt-8">
            <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Icons.Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-purple-300">
                  <p className="opacity-90">
                    {t('auth.emailInfo')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Criar PIN
  if (step === 'pin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md">
          <PINEntry
            key="create"
            title={t('auth.createPIN')}
            subtitle={t('auth.step2')}
            onComplete={handleFirstPIN}
            error={error}
          />

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setAccountExists(true)}
              className="w-full text-purple-400 text-sm hover:text-purple-300 transition-colors"
            >
              {t('auth.hasAccount')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Confirmar PIN
  if (step === 'confirm') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md">
          <PINEntry
            key="confirm"
            title={t('auth.confirmPIN')}
            subtitle={t('auth.step3')}
            onComplete={handleConfirmPIN}
            error={error}
          />

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setAccountExists(true)}
              className="w-full text-purple-400 text-sm hover:text-purple-300 transition-colors"
            >
              {t('auth.hasAccount')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
