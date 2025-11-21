// ===== CONFIGURAÇÃO FIREBASE =====

// NOTA DE SEGURANÇA: Estas chaves são públicas e devem estar aqui (é normal em apps client-side).
// A PROTEÇÃO REAL vem das Firestore Security Rules no Firebase Console.
//
// ⚠️ IMPORTANTE: Verifica que tens estas regras no Firestore:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /users/{userId}/{document=**} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//   }
// }
// Isto garante que cada utilizador só acede aos SEUS dados.

export const firebaseConfig = {
  apiKey: "AIzaSyDH8-OZZQPHzWOnkcABi0tWbeFpxSrnc0w",
  authDomain: "harm-reduction-d4f7d.firebaseapp.com",
  projectId: "harm-reduction-d4f7d",
  storageBucket: "harm-reduction-d4f7d.firebasestorage.app",
  messagingSenderId: "732077932839",
  appId: "1:732077932839:web:894f098ab346d79e462902"
};
