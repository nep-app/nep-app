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
import { doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { getFirebaseApp, getFirebaseDb, getFirebaseAuth } from './firebase';
import { safeLocalStorage } from './storage';
import { logger } from './logger';

// Chave VAPID (Web Push certificate) do projeto harm-reduction-d4f7d, tirada
// diretamente do Firebase Console (Cloud Messaging → Certificados push da Web).
// É PÚBLICA (é o applicationServerKey), por isso pode estar aqui fixa. Fixámo-la
// no código porque o segredo VITE_FIREBASE_VAPID_KEY podia estar com um valor
// errado (era invisível/não verificável). Se um dia mudar a chave no Console,
// atualizar aqui.
const VAPID_KEY = 'BF0WrNv1scVewl7OoCnzwyYaf_uS91k-2mep9Uh6bcQuHBsGFog-f1FxjWGJ_9HcHDinb0Mnuyvk5e8AJ73NUUM';

function currentUid() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sem sessão Firebase — inicia sessão primeiro.');
  return user.uid;
}

// Identificador ESTÁVEL deste aparelho (telemóvel, PC…), guardado no localStorage.
// Serve para guardarmos UMA morada (token) por aparelho na nuvem, de modo a que o
// telemóvel e o PC não se apaguem um ao outro (cada um tem a sua entrada no mapa
// `tokens`). Não identifica a pessoa — é só um número aleatório local ao aparelho.
function getDeviceId() {
  let id = safeLocalStorage.get('nep_device_id', null);
  if (typeof id !== 'string' || !id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    safeLocalStorage.set('nep_device_id', id);
  }
  return id;
}

// Grava a morada (token) DESTE aparelho no mapa `tokens.<deviceId>` do doc de prefs,
// e apaga o campo antigo `token` (formato de morada única) para o carteiro não enviar
// a dobrar. Cada aparelho fica com a sua própria entrada — nenhum apaga o do outro.
async function writeDeviceToken(token) {
  const db = getFirebaseDb();
  const ref = doc(db, 'users', currentUid(), 'push', 'prefs');
  const deviceId = getDeviceId();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon';
  await setDoc(
    ref,
    {
      tokens: { [deviceId]: { token, tz, updatedAt: new Date().toISOString() } },
      // `tz` também no topo (o carteiro usa-o para saber a hora local dos lembretes).
      tz,
      // Apagar o formato antigo de morada única, se existir (evita envio duplicado).
      token: deleteField(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

async function registerMessagingSW() {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers não suportados.');
  const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`);
  // Garantir que o service worker está ATIVO antes de pedir o token (senão o
  // getToken pode falhar por o SW ainda não controlar a página).
  await navigator.serviceWorker.ready;
  return reg;
}

// Converte um ArrayBuffer (applicationServerKey da subscrição) para base64url,
// para comparar com a chave VAPID (que já é base64url).
function abToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Se já existe uma subscrição push com uma CHAVE DIFERENTE (ex.: a VAPID foi
 * trocada entretanto), tem de ser apagada ANTES de subscrever com a nova —
 * senão o navegador rejeita com "push service error". Só apaga quando a chave
 * não bate certo (evita churn desnecessário e o erro 'token-subscribe-failed').
 */
async function clearStalePushSubscription(swReg) {
  try {
    const existing = await swReg.pushManager.getSubscription();
    if (!existing) return;
    const key = existing.options && existing.options.applicationServerKey;
    const currentB64 = key ? abToBase64Url(key) : null;
    const wantB64 = (VAPID_KEY || '').replace(/=+$/, '');
    if (currentB64 !== wantB64) {
      await existing.unsubscribe();
      logger.log('[Push] Subscrição antiga (chave diferente) removida.');
    }
  } catch (e) {
    // Se falhar a comparação, remover à mesma é o mais seguro para destravar.
    try { const s = await swReg.pushManager.getSubscription(); if (s) await s.unsubscribe(); } catch {}
  }
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

  // Limpar subscrição antiga se a chave mudou (causa comum de "push service error"
  // depois de trocar a VAPID). Usamos PushManager.unsubscribe (nível do navegador),
  // NÃO o deleteToken do Firebase — este último deixava a instalação num estado que
  // fazia o getToken falhar com 'token-subscribe-failed / missing authentication credential'.
  await clearStalePushSubscription(swReg);

  // O getToken pode falhar de forma TRANSITÓRIA (token-subscribe-failed / push
  // service error) mesmo com tudo bem configurado. Tentar até 3 vezes com uma
  // pequena pausa resolve a maioria dessas falhas passageiras.
  let token = null;
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
      if (token) break;
    } catch (e) {
      lastErr = e;
      logger.error(`[Push] Tentativa ${attempt} falhou:`, e?.message || e);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  if (!token) {
    // Expor o MÁXIMO de detalhe (o FCM guarda a resposta crua do servidor em
    // customData.serverResponse) — permite diagnosticar sem consola/PC.
    const detail =
      lastErr?.customData?.serverResponse ||
      lastErr?.customData?._serverResponse ||
      (lastErr?.customData ? JSON.stringify(lastErr.customData) : '') ||
      '';
    const base = `${lastErr?.code || ''} ${lastErr?.message || 'Falha ao obter token'}`.trim();
    throw new Error(detail ? `${base}\n\nDETALHE: ${detail}` : base);
  }

  await writeDeviceToken(token);
  logger.log('[Push] Token registado (morada deste aparelho).');
  return token;
}

/**
 * Regrava EM SILÊNCIO a morada (token) na nuvem, se as notificações já estiverem
 * ligadas neste dispositivo. Serve para o caso em que o telemóvel (sobretudo
 * Xiaomi/MIUI, ou quando o Chrome recicla o service worker / limpa memória)
 * TROCA a subscrição push por conta própria: o token guardado no Firestore fica
 * "morto" (o carteiro apanha 'Device unregistered') e os lembretes deixam de
 * chegar até a utilizadora reativar à mão.
 *
 * Ao correr isto sempre que a app arranca, o token fresco volta a ficar gravado
 * automaticamente — a utilizadora não tem de fazer nada. NÃO pede permissão nem
 * mostra erros: se algo falhar, fica calado (é um "melhor esforço" em segundo plano).
 *
 * Só corre se: o dispositivo suporta push, a permissão JÁ foi concedida
 * (`Notification.permission === 'granted'`) e há sessão Firebase.
 */
export async function refreshPushTokenIfEnabled() {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!VAPID_KEY) return;
    if (!(await isSupported())) return;
    if (!getFirebaseAuth().currentUser) return;

    const swReg = await registerMessagingSW();
    const messaging = getMessaging(getFirebaseApp());
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (!token) return;

    await writeDeviceToken(token);
    logger.log('[Push] Token atualizado em silêncio no arranque (morada deste aparelho).');
  } catch (e) {
    // Silencioso de propósito — é só um melhor-esforço em segundo plano.
    logger.error('[Push] refresh silencioso falhou (ignorado):', e?.message || e);
  }
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

/**
 * Desativa os lembretes push NESTE aparelho: apaga o token local e remove apenas a
 * entrada deste aparelho no mapa `tokens` (não mexe nos lembretes nem nas moradas dos
 * outros aparelhos — desativar no PC não pode calar o telemóvel).
 */
export async function disablePushReminders() {
  try {
    if (await isSupported()) {
      const messaging = getMessaging(getFirebaseApp());
      await deleteToken(messaging).catch(() => {});
    }
    const db = getFirebaseDb();
    const ref = doc(db, 'users', currentUid(), 'push', 'prefs');
    const deviceId = getDeviceId();
    // Remove só a morada deste aparelho; apaga também o campo antigo `token` por segurança.
    await updateDoc(ref, {
      [`tokens.${deviceId}`]: deleteField(),
      token: deleteField(),
    }).catch(() => {});
  } catch (e) {
    logger.error('[Push] Erro ao desativar:', e);
  }
}
