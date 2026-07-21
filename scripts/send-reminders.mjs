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

// O cron grátis do GitHub é estrangulado e corre ~de hora a hora, ÀS VEZES COM
// BURACOS DE 3H. Por isso NÃO usamos uma janela curta (que perdia o lembrete se
// o buraco fosse maior): o lembrete dispara na PRIMEIRA corrida que aconteça
// DEPOIS da hora marcada, uma vez por dia (o dedup 'sent' diário evita repetir).
// Assim chega sempre — pode é chegar mais tarde do que a hora exata.

// Modo de teste: FORCE=true ignora a hora e o dedup diário (envia todos os
// lembretes ligados, uma vez). Ativado pelo input 'force' do workflow_dispatch.
const FORCE = process.env.FORCE === 'true';

async function run() {
  if (FORCE) console.log('MODO FORÇADO: ignora hora e dedup (teste).');
  const snap = await db.collectionGroup('push').get();
  let sentCount = 0;

  for (const docSnap of snap.docs) {
    if (docSnap.id !== 'prefs') continue;
    const data = docSnap.data() || {};
    const reminders = Array.isArray(data.reminders) ? data.reminders : [];

    // UMA morada por aparelho: o mapa `tokens` tem { <deviceId>: { token, ... } }.
    // Recuo para o formato antigo (campo único `token`) enquanto houver docs por migrar.
    // Cada destino leva a sua CHAVE, para podermos apagar só o que der erro.
    const targets = []; // { key, token }  (key '_legacy' = campo antigo `token`)
    if (data.tokens && typeof data.tokens === 'object') {
      for (const [devId, entry] of Object.entries(data.tokens)) {
        const tk = entry && entry.token;
        if (tk) targets.push({ key: devId, token: tk });
      }
    }
    if (data.token) targets.push({ key: '_legacy', token: data.token });
    if (targets.length === 0 || reminders.length === 0) continue;

    const { date, minutes: nowMin } = nowInTz(data.tz);
    const sent = { ...(data.sent || {}) };
    let changed = false;

    for (const r of reminders) {
      if (!r || r.enabled === false) continue;
      const rMin = (parseInt(r.hour, 10) || 0) * 60 + (parseInt(r.minute, 10) || 0);
      const due = FORCE || (nowMin >= rMin);
      if (!due) continue;
      if (!FORCE && sent[r.id] === date) continue; // já enviado hoje (ignorado em teste)

      const msg = MESSAGES[r.id] || MESSAGES.custom;

      // Enviar para TODAS as moradas deste utilizador (telemóvel, PC…). Uma falha
      // numa morada não impede as outras. O dedup diário é por lembrete (não por
      // aparelho): marcamos 'enviado hoje' se pelo menos uma morada aceitou.
      let anyOk = false;
      for (const target of targets) {
        try {
          // Payload 'notification' → o sistema mostra sozinho (fiável com a app fechada).
          // O service worker NÃO tem onBackgroundMessage, por isso NÃO há duplicado.
          await admin.messaging().send({
            token: target.token,
            notification: { title: msg.title, body: msg.body },
            webpush: {
              // Urgency: high — sem isto, o Android (sobretudo Xiaomi/MIUI) segura
              // as mensagens em segundo plano e "não chega nada". Lição de uma PWA
              // que funciona no mesmo aparelho (ver PUSH_NOTIFICATIONS.md).
              headers: { Urgency: 'high' },
              notification: {
                icon: 'https://nep-app.github.io/nep-app/icon-192.png',
                badge: 'https://nep-app.github.io/nep-app/icon-192.png',
                tag: `nep-${r.id}`,
              },
              fcmOptions: { link: 'https://nep-app.github.io/nep-app/' },
            },
          });
          anyOk = true;
          sentCount++;
          console.log(`Enviado '${r.id}' para ${docSnap.ref.path} [${target.key}]`);
        } catch (e) {
          console.error(`Falha ao enviar '${r.id}' (${docSnap.ref.path} [${target.key}]):`, e.message);
          // Morada morta → apagar SÓ essa entrada (não as outras), para não tentar sempre.
          if (e.code === 'messaging/registration-token-not-registered') {
            // Nota: para apagar um campo ANINHADO com set(merge), usa-se a forma de
            // objeto aninhado ({ tokens: { <key>: delete } }), não a chave com ponto.
            const field = target.key === '_legacy'
              ? { token: admin.firestore.FieldValue.delete() }
              : { tokens: { [target.key]: admin.firestore.FieldValue.delete() } };
            await docSnap.ref.set(field, { merge: true }).catch(() => {});
          }
        }
      }
      if (anyOk && !FORCE) { sent[r.id] = date; changed = true; } // em teste não marca como enviado
    }

    if (changed) {
      await docSnap.ref.set({ sent }, { merge: true }).catch(() => {});
    }
  }

  console.log(`Concluído. ${sentCount} notificação(ões) enviada(s).`);
}

run().catch(e => { console.error(e); process.exit(1); });
