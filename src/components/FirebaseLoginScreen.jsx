import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
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
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const handleChangeLang = (lang) => { i18n.changeLanguage(lang); localStorage.setItem('nep_lang', lang); };

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) { setError(t('firebase.resetErrNoEmail')); return; }
    setError('');
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      if (err.code === 'auth/user-not-found') setError(t('firebase.errUserNotFound'));
      else if (err.code === 'auth/invalid-email') setError(t('auth.emailInvalid'));
      else setError(t('common.error') + ': ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error('[FirebaseLogin] ❌ Erro:', err);

      if (err.code === 'auth/user-not-found') {
        setError(t('firebase.errUserNotFound'));
      } else if (err.code === 'auth/wrong-password') {
        setError(t('firebase.errWrongPassword'));
      } else if (err.code === 'auth/email-already-in-use') {
        setError(t('firebase.errEmailInUse'));
      } else if (err.code === 'auth/weak-password') {
        setError(t('firebase.errWeakPassword'));
      } else if (err.code === 'auth/invalid-email') {
        setError(t('auth.emailInvalid'));
      } else if (err.code === 'auth/invalid-credential') {
        setError(t('firebase.errInvalidCred'));
      } else {
        setError(t('common.error') + ': ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
      <div className="w-full max-w-md">
        {/* Language toggle */}
        <div className="flex justify-end gap-2 mb-4 text-sm">
          <button onClick={() => handleChangeLang('pt')} className={currentLang === 'pt' ? 'font-bold text-white' : 'text-gray-500 hover:text-gray-300'}>PT</button>
          <span className="text-gray-600">|</span>
          <button onClick={() => handleChangeLang('en')} className={currentLang === 'en' ? 'font-bold text-white' : 'text-gray-500 hover:text-gray-300'}>ENG</button>
        </div>

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Icons.Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NEP App</h1>
          <p className="text-purple-300 text-sm">
            {isLogin ? t('auth.loginTitle') : t('firebase.createNew')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2">
              {t('firebase.passwordLabel')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('firebase.passwordPlaceholder')}
              className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {isLogin && (
            <div className="text-right -mt-2">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading || loading}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
              >
                {resetLoading ? t('firebase.resetSending') : t('firebase.forgotPassword')}
              </button>
            </div>
          )}

          {resetSent && (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-green-300 text-sm">
              {t('firebase.resetEmailSent')}
            </div>
          )}

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
                {isLogin ? t('firebase.signingIn') : t('firebase.creating')}
              </>
            ) : (
              <>
                {isLogin ? t('firebase.signIn') : t('auth.createTitle')}
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
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          </button>
        </form>

        {/* Demo mode */}
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-xs text-gray-500">ou</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>
          <button
            type="button"
            onClick={() => { localStorage.setItem('nep_demo', '1'); window.location.reload(); }}
            className="w-full py-3 rounded-lg border border-purple-700/50 text-purple-300 hover:bg-purple-900/20 transition-all font-medium text-sm flex items-center justify-center gap-2"
          >
            🎭 Experimentar em modo demo
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">Sem registo — dados de exemplo, nada é guardado</p>
        </div>

        {/* Info */}
        <div className="mt-6">
          <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Icons.Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-300">
                <p className="font-medium mb-1">{t('firebase.infoTitle')}</p>
                <p className="opacity-90 mb-2">{t('firebase.infoText1')}</p>
                <p className="opacity-75">{t('firebase.infoText2')}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center">
          {t('settings.copyright')}
        </p>
      </div>
    </div>
  );
};
