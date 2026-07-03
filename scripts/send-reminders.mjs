/**
 * "Carteiro" dos lembretes push — corre no GitHub Actions (cron).
 *
 * Lê as preferências de lembretes de cada utilizador em users/{uid}/push/prefs,
 * vê quais estão na hora (no fuso horário do utilizador) e ainda não foram enviados
 * hoje, e envia a notificação push via Firebase Cloud Messaging.
 *
 * Autentica-se com a service account (secret FIREBASE_SERVICE_ACCOUNT). Como é admin,
 * lê o Firestore diretamente. NÃO consegue ler os dados cifrados do utilizador (não
 * tem o PIN), por isso o lembrete dispara à hora marcada — texto sempre discreto.
 */
import admin from 'firebase-admin';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error('Falta o secret FIREBASE_SERVICE_ACCOUNT.');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
const db = admin.firestore();

// Mensagens DISCRETAS de propósito — nunca revelam consumo/detalhes no ecrã bloqueado.
const MESSAGES = {
  'log-mg':         { title: 'NEP', body: 'Tens um registo pendente para hoje. 🙂' },
  'log-emotions':   { title: 'NEP', body: 'Um momento para ti — como te sentes?' },
  'log-wellbeing':  { title: 'NEP', body: 'Tens um registo pendente para hoje. 🙂' },
  'log-reflection': { title: 'NEP', body: 'Um momento para pensar no teu dia.' },
  'bedtime':        { title: 'NEP', body: 'Hora de começar a abrandar para dormir. 🌙' },
  'custom':         { title: 'NEP', body: 'Lembrete.' },
};

// Hora atual no fuso do utilizador → { date: 'YYYY-MM-DD', minutes: h*60+m }
function nowInTz(tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'Europe/Lisbon', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date());
  const g = (t) => parts.find(p => p.type === t)?.value;
  const date = `${g('year')}-${g('month')}-${g('day')}`;
  let hh = parseInt(g('hour'), 10);
  if (hh === 24) hh = 0; // alguns ambientes devolvem 24 à meia-noite
  return { date, minutes: hh * 60 + parseInt(g('minute'), 10) };
}

// Janela larga: o cron grátis do GitHub é estrangulado e corre ~de hora a hora, não
// de 15 em 15 min. Com uma janela larga, um lembrete das 20h ainda dispara no primeiro
// run que aconteça até 2h depois (uma vez só, por causa do dedup 'sent' diário).
const WINDOW_MIN = 120;

async function run() {
  const snap = await db.collectionGroup('push').get();
  let sentCount = 0;

  for (const docSnap of snap.docs) {
    if (docSnap.id !== 'prefs') continue;
    const data = docSnap.data() || {};
    const token = data.token;
    const reminders = Array.isArray(data.reminders) ? data.reminders : [];
    if (!token || reminders.length === 0) continue;

    const { date, minutes: nowMin } = nowInTz(data.tz);
    const sent = { ...(data.sent || {}) };
    let changed = false;

    for (const r of reminders) {
      if (!r || r.enabled === false) continue;
      const rMin = (parseInt(r.hour, 10) || 0) * 60 + (parseInt(r.minute, 10) || 0);
      const due = nowMin >= rMin && (nowMin - rMin) < WINDOW_MIN;
      if (!due) continue;
      if (sent[r.id] === date) continue; // já enviado hoje

      const msg = MESSAGES[r.id] || MESSAGES.custom;
      try {
        // SÓ 'data' (sem 'notification') — evita a notificação duplicada no web push.
        // O service worker (firebase-messaging-sw.js) mostra UMA a partir destes dados.
        await admin.messaging().send({
          token,
          data: {
            title: msg.title,
            body: msg.body,
            tag: `nep-${r.id}`,
            url: 'https://nep-app.github.io/nep-app/',
          },
        });
        sent[r.id] = date;
        changed = true;
        sentCount++;
        console.log(`Enviado '${r.id}' para ${docSnap.ref.path}`);
      } catch (e) {
        console.error(`Falha ao enviar '${r.id}' (${docSnap.ref.path}):`, e.message);
        // Token inválido/expirado → limpar para não tentar sempre
        if (e.code === 'messaging/registration-token-not-registered') {
          await docSnap.ref.set({ token: admin.firestore.FieldValue.delete() }, { merge: true }).catch(() => {});
        }
      }
    }

    if (changed) {
      await docSnap.ref.set({ sent }, { merge: true }).catch(() => {});
    }
  }

  console.log(`Concluído. ${sentCount} notificação(ões) enviada(s).`);
}

run().catch(e => { console.error(e); process.exit(1); });
