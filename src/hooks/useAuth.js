import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export const useAuth = (auth) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!auth) return;

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setAuthError('Email não encontrado. Cria conta primeiro.');
      } else if (error.code === 'auth/wrong-password') {
        setAuthError('Password errada.');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError('Email já existe. Faz login.');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Password fraca (mínimo 12 caracteres).');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Email inválido.');
      } else if (error.code === 'auth/invalid-credential') {
        setAuthError('Email ou password incorretos.');
      } else {
        setAuthError('Erro: ' + error.message);
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return {
    isLogin,
    setIsLogin,
    email,
    setEmail,
    password,
    setPassword,
    authError,
    handleAuth,
    handleLogout,
  };
};
