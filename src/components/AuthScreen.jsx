import React, { useState, useEffect } from 'react';
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
export const AuthScreen = () => {
  const { login, createAccount, hasAccount } = useAuth();
  const [accountExists, setAccountExists] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Criar conta
  const [step, setStep] = useState('email'); // 'email' | 'pin' | 'confirm'
  const [email, setEmail] = useState('');
  const [firstPIN, setFirstPIN] = useState('');
  const [error, setError] = useState('');

  // Verificar se conta já existe
  useEffect(() => {
    const checkAccount = async () => {
      const exists = await hasAccount();
      setAccountExists(exists);
      setLoading(false);
    };
    checkAccount();
  }, [hasAccount]);

  // LOGIN: Tentar fazer login com PIN
  const handleLogin = async (pin) => {
    setError('');
    const success = await login(pin);
    
    if (!success) {
      setError('PIN incorreto. Tenta novamente.');
      // Reset PIN inputs (será feito via key change no PINEntry)
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

  const handleFirstPIN = (pin) => {
    setFirstPIN(pin);
    setStep('confirm');
  };

  const handleConfirmPIN = async (pin) => {
    if (pin !== firstPIN) {
      setError('PINs não coincidem. Tenta novamente.');
      setStep('pin');
      setFirstPIN('');
      return;
    }

    setError('');
    
    // Criar conta
    const success = await createAccount(email, pin);
    
    if (!success) {
      setError('Erro ao criar conta. Tenta novamente.');
      setStep('email');
      setEmail('');
      setFirstPIN('');
    }
    // Se success, o AuthContext já vai mudar isAuthenticated para true
  };

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

  // LOGIN: Conta já existe
  if (accountExists) {
    return (
      <PINEntry
        key="login"
        title="Bem-vinda de volta"
        subtitle="Insere o teu PIN de 4 dígitos"
        onComplete={handleLogin}
        error={error}
      />
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
