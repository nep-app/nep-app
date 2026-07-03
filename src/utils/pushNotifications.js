/**
 * Notificações push (Firebase Cloud Messaging) — lado do cliente.
 *
 * Fluxo: pedir autorização → registar o service worker dedicado → obter o "token"
 * (endereço deste dispositivo) → guardar o token + preferências de lembretes no
 * Firestore, para o "carteiro" (GitHub Action) poder enviar os toques às horas certas.
 *
 * NOTA: precisa da chave VAPID (VITE_FIREBASE_VAPID_KEY), definida como secret no
 * GitHub e injetada no build. Sem ela, o pedido de token falha com aviso claro.
 */
import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getFirebaseApp, getFirebaseDb, getFirebaseAuth } from './firebase';
import { logger } from './logger';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function currentUid() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sem sessão Firebase — inicia sessão primeiro.');
  return user.uid;
}

async function registerMessagingSW() {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers não suportados.');
  return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`);
}

/**
 * Ativa os lembretes push neste dispositivo: pede permissão, obtém o token e
 * guarda-o no Firestore. Devolve o token.
 */
export async function enablePushReminders() {
  if (!(await isSupported())) {
    throw new Error('Este dispositivo/navegador não suporta notificações push.');
  }
  if (!VAPID_KEY) {
    throw new Error('Falta a chave de notificações (VAPID). Ainda não foi configurada.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão de notificações não concedida.');
  }

  const swReg = await registerMessagingSW();
  const messaging = getMessaging(getFirebaseApp());

  // Registo simples (estado que funcionou de origem). NÃO fazemos deleteToken antes:
  // isso podia deixar a "instalação" Firebase num estado que faz o getToken falhar
  // com 'token-subscribe-failed / missing authentication credential'.
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
  if (!token) throw new Error('Não foi possível obter o token de notificações.');

  const db = getFirebaseDb();
  await setDoc(
    doc(db, 'users', currentUid(), 'push', 'prefs'),
    {
      token,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  logger.log('[Push] Token registado.');
  return token;
}

/**
 * Guarda a configuração de lembretes (quais + a que horas) no Firestore.
 * @param {Array<{id:string, hour:number, minute:number, enabled:boolean}>} reminders
 */
export async function saveReminderConfig(reminders) {
  const db = getFirebaseDb();
  await setDoc(
    doc(db, 'users', currentUid(), 'push', 'prefs'),
    { reminders, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/** Desativa os lembretes push neste dispositivo (apaga token local e no Firestore). */
export async function disablePushReminders() {
  try {
    if (await isSupported()) {
      const messaging = getMessaging(getFirebaseApp());
      await deleteToken(messaging).catch(() => {});
    }
    const db = getFirebaseDb();
    await deleteDoc(doc(db, 'users', currentUid(), 'push', 'prefs')).catch(() => {});
  } catch (e) {
    logger.error('[Push] Erro ao desativar:', e);
  }
}
