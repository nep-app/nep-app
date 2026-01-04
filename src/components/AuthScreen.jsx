import React, { useState, useEffect, useCallback, useRef } from 'react';
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
      setError(result.error || 'PIN incorreto. Tenta novamente.');
    }

    isSubmittingRef.current = false;
  }, [login]);

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
      setError('Erro ao resetar. Tenta recarregar a página manualmente (Ctrl+Shift+R).');
      setLoading(false);
    }
  };

  // CRIAR CONTA: Fluxo de 3 passos
  const handleEmailSubmit = (e) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setError('Email inválido');
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
      setError('PINs não coincidem. Tenta novamente.');
      setStep('pin');
      setFirstPIN('');
      return;
    }

    setError('');

    // Criar conta
    const result = await createAccount(email, pin);

    if (!result.success) {
      setError(result.error || 'Erro ao criar conta. Tenta novamente.');
      setStep('email');
      setEmail('');
      setFirstPIN('');
    }
    // Se success, o AuthContext já vai mudar isAuthenticated para true
  }, [firstPIN, email, createAccount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
        <div className="text-center">
          <Icons.RefreshCw className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-300">Carregando...</p>
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
              <h2 className="text-2xl font-bold text-white mb-2">⚠️ Resetar Dados Locais?</h2>
              <p className="text-gray-300 text-sm mb-4">
                Esta ação vai:
              </p>
              <ul className="text-left text-gray-300 text-sm space-y-2 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>Apagar TODOS os dados locais deste dispositivo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>Manter dados do Firebase intactos (nada é perdido)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Re-sincronizar tudo do Firebase no próximo login</span>
                </li>
              </ul>
              <p className="text-yellow-300 text-xs bg-yellow-900/20 border border-yellow-700/50 rounded p-2">
                💡 Usa isto se o PIN está correto mas não consegues entrar
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleEmergencyReset}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-all font-medium"
              >
                Sim, Resetar Dados Locais
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  setError('');
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-all font-medium"
              >
                Cancelar
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
            title="Bem-vinda de volta"
            subtitle="Insere o teu PIN de 4 dígitos"
            onComplete={handleLogin}
            error={error}
          />

          {/* Mostrar botão de reset APENAS se houver erro de PIN */}
          {error && error.includes('PIN incorreto') && (
            <div className="mt-6">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/50 text-yellow-300 py-3 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Icons.RefreshCw className="w-4 h-4" />
                PIN correto mas não funciona? Resetar dados locais
              </button>
              <p className="text-center text-xs text-gray-400 mt-2">
                (Dados do Firebase não são afetados)
              </p>
            </div>
          )}

          {/* Botão para trocar de conta */}
          <div className="mt-6">
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
              Trocar de conta
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">
              Fazer logout e entrar noutra conta
            </p>
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
            <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
            <p className="text-purple-300 text-sm">Passo 1 de 3: Email</p>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">
                Email (opcional, só para recuperação)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              Continuar
              <Icons.ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setStep('pin')}
              className="w-full text-purple-400 text-sm hover:text-purple-300 transition-colors"
            >
              Saltar (continuar sem email)
            </button>
          </form>

          {/* Info */}
          <div className="mt-8">
            <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Icons.Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-purple-300">
                  <p className="opacity-90">
                    O email é opcional e apenas usado se precisares recuperar acesso.
                    Podes saltar este passo.
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
      <PINEntry
        key="create"
        title="Criar PIN"
        subtitle="Passo 2 de 3: Escolhe um PIN de 4 dígitos"
        onComplete={handleFirstPIN}
        error={error}
      />
    );
  }

  // Step 3: Confirmar PIN
  if (step === 'confirm') {
    return (
      <PINEntry
        key="confirm"
        title="Confirmar PIN"
        subtitle="Passo 3 de 3: Insere o PIN novamente"
        onComplete={handleConfirmPIN}
        error={error}
      />
    );
  }

  return null;
};
