/* Service worker DEDICADO às notificações push (Firebase Cloud Messaging).
 * É separado do service worker da PWA (workbox) — este só trata de receber e
 * mostrar notificações quando a app está FECHADA/em segundo plano.
 *
 * Config do Firebase é pública (igual à do resto da app) — sem segredos aqui.
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAXCbxOyg7-mOkDH7Sy-4CnJ597JDK1RE0',
  authDomain: 'harm-reduction-d4f7d.firebaseapp.com',
  projectId: 'harm-reduction-d4f7d',
  storageBucket: 'harm-reduction-d4f7d.firebasestorage.app',
  messagingSenderId: '732077932839',
  appId: '1:732077932839:web:894f098ab346d79e462902',
});

// IMPORTANTE: inicializar messaging regista o listener que faz o Android/Firebase
// MOSTRAR a notificação sozinho (payload 'notification') — o caminho mais fiável com
// a app fechada. NÃO usamos onBackgroundMessage: se o fizéssemos, mostrava DUAS
// (a automática + a nossa). Assim aparece exatamente UMA.
firebase.messaging();

// Abrir a app ao tocar na notificação.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/nep-app/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes('/nep-app/') && 'focus' in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
