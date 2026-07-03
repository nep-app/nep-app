/* Service worker DEDICADO às notificações push (Firebase Cloud Messaging).
 * É separado do service worker da PWA (workbox) — este só trata de receber e
 * mostrar notificações quando a app está FECHADA/em segundo plano.
 *
 * Config do Firebase é pública (igual à do resto da app) — sem segredos aqui.
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDH8-OZZQPHzWOnkcABi0tWbeFpxSrnc0w',
  authDomain: 'harm-reduction-d4f7d.firebaseapp.com',
  projectId: 'harm-reduction-d4f7d',
  storageBucket: 'harm-reduction-d4f7d.firebasestorage.app',
  messagingSenderId: '732077932839',
  appId: '1:732077932839:web:894f098ab346d79e462902',
});

const messaging = firebase.messaging();

// Mensagem recebida com a app fechada/em segundo plano.
messaging.onBackgroundMessage((payload) => {
  // Mensagens são enviadas SÓ com 'data' (sem 'notification') de propósito: assim o
  // Firebase NÃO mostra automaticamente e evitamos a notificação duplicada — só este
  // handler mostra UMA. Texto discreto — nunca revela consumo/detalhes.
  const d = payload.data || {};
  const title = d.title || 'NEP';
  const body = d.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/nep-app/icon-192.png',
    badge: '/nep-app/icon-192.png',
    tag: d.tag || 'nep-reminder',
    data: { url: d.url || '/nep-app/' },
  });
});

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
