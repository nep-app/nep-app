import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import * as Icons from './Icons';

/**
 * FirebaseLoginScreen - Login/Criar conta Firebase (PRIMEIRO passo)
 *
 * Este é o ecrã que aparece ANTES do PIN.
 * Cria utilizadores Firebase com UIDs únicos para separar dados.
 *
 * Fluxo:
 * 1. User entra email + password
 * 2. Clica "Entrar" (login) ou "Criar Conta" (registo)
 * 3. Firebase Auth cria/autentica user → recebe UID
 * 4. DEPOIS vai para PIN creation/entry
 */
export const FirebaseLoginScreen = ({ auth, darkMode = true }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login com email/password existente
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Criar nova conta Firebase
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // Firebase auth state change vai disparar e App.jsx vai mostrar próximo ecrã (PIN)
    } catch (err) {
      console.error('[FirebaseLogin] ❌ Erro:', err);

      // Mensagens de erro em português
      if (err.code === 'auth/user-not-found') {
        setError('Email não encontrado. Cria conta primeiro.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Password incorreta.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está registado. Faz login.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password fraca (mínimo 6 caracteres).');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Email ou password incorretos.');
      } else {
        setError('Erro: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Icons.Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NEP App</h1>
          <p className="text-purple-300 text-sm">
            {isLogin ? 'Bem-vinda de volta' : 'Criar nova conta'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@email.com"
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={
              'w-full py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ' +
              (loading
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600')
            }
          >
            {loading ? (
              <>
                <Icons.RefreshCw className="w-4 h-4 animate-spin" />
                {isLogin ? 'Entrando...' : 'Criando conta...'}
              </>
            ) : (
              <>
                {isLogin ? 'Entrar' : 'Criar Conta'}
                <Icons.ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            disabled={loading}
            className="w-full text-purple-400 text-sm hover:text-purple-300 transition-colors disabled:opacity-50"
          >
            {isLogin ? 'Não tens conta? Criar conta nova' : 'Já tens conta? Fazer login'}
          </button>
        </form>

        {/* Info */}
        <div className="mt-8">
          <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Icons.Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-300">
                <p className="font-medium mb-1">💜 A tua conta pessoal</p>
                <p className="opacity-90 mb-2">
                  Cria um email e password para acederes aos teus dados em qualquer dispositivo.
                  Podes usar um email "inventado" se quiseres (ex: minhaapp@email.com).
                </p>
                <p className="opacity-75">
                  Após login, vais criar um PIN de 4 dígitos para segurança extra.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center">
          Copyright © Teresa Castro
        </p>
      </div>
    </div>
  );
};
