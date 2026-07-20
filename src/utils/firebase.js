// ===== CONFIGURAÇÃO FIREBASE =====

// NOTA DE SEGURANÇA: Estas chaves são públicas e devem estar aqui (é normal em apps client-side).
// A PROTEÇÃO REAL vem das Firestore Security Rules — ver o ficheiro `firestore.rules`
// na raiz do projeto (valida o envelope cifrado, restringe ao dono e nega tudo o resto).

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAXCbxOyg7-mOkDH7Sy-4CnJ597JDK1RE0",
  authDomain: "harm-reduction-d4f7d.firebaseapp.com",
  projectId: "harm-reduction-d4f7d",
  storageBucket: "harm-reduction-d4f7d.firebasestorage.app",
  messagingSenderId: "732077932839",
  appId: "1:732077932839:web:894f098ab346d79e462902"
};

// Singleton: garante UMA única instância da app Firebase partilhada por toda a app.
// (Antes, App/DataContext/AuthContext repetiam este guard cada um por si.)
export function getFirebaseApp() {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}
