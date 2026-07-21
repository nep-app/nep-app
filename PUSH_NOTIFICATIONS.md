# Notificações push — NEP.app

Guia da funcionalidade de **lembretes push** (aparecerem mesmo com a app fechada).
Baseado numa receita comprovada de outra PWA que funciona no mesmo aparelho
(Xiaomi/MIUI), adaptado à arquitetura desta app.

> **Estado atual (2026-07):** o **envio** está montado e o servidor corre. O
> bloqueio atual é no **cliente**: em alguns aparelhos, o `getToken` falha no
> registo com `messaging/token-subscribe-failed: missing required authentication
> credential`. Já foram descartados: APIs desativadas, restrições da chave de API,
> App Check (tudo verificado e correto). Falta o **detalhe da consola do browser**
> (num PC) para cravar a causa. Ver secção "Problemas conhecidos".

---

## A arquitetura desta app (o que temos)

Ao contrário da receita "clássica" (Cloud Functions + plano Blaze), aqui o envio
é feito por um **carteiro** no GitHub Actions, para **não exigir billing**:

- **Cliente** — `src/utils/pushNotifications.js`: pede permissão, regista o
  service worker dedicado, obtém o **token FCM** (`getToken` com a chave VAPID) e
  guarda `token` + `reminders` (quais + a que horas) em `users/{uid}/push/prefs`
  no Firestore. UI em `src/components/PushRemindersSettings.jsx`.
- **Service worker** — `public/firebase-messaging-sw.js`: dedicado ao FCM.
- **Carteiro (agendador)** — `scripts/send-reminders.mjs` + `.github/workflows/reminders.yml`:
  um cron do GitHub corre o script (`firebase-admin`), lê as prefs, vê quem tem
  lembrete "na hora" (no fuso de cada um) e envia. Dedup diário.

---

## As 3 partes do fluxo

1. **Registar o "endereço" do aparelho** — `getToken({ vapidKey })` gera um token
   FCM; guarda-se no Firestore.
2. **Enviar** — o carteiro (admin SDK) lê o token e faz `messaging().send(...)`.
3. **Mostrar** — app fechada: o payload `notification` faz o sistema mostrar
   sozinho (ou, na receita data-only, o `onBackgroundMessage` do SW mostra).

---

## Decisões que custam bugs (importantes)

- **Um token por APARELHO, não por utilizador.** ✅ **Implementado.** O doc guarda
  agora `tokens = { [deviceId]: { token, tz, updatedAt } }` — cada aparelho (telemóvel,
  PC…) tem a sua entrada e nenhum apaga a do outro. O `deviceId` é um id aleatório
  estável no `localStorage` (`nep_device_id`), não identifica a pessoa. O carteiro
  envia para **todas** as moradas e, quando uma dá `registration-token-not-registered`,
  apaga **só essa** entrada (`tokens.<deviceId>`). Recuo para o campo antigo `token`
  (chave `_legacy`) enquanto houver docs por migrar; ao regravar, o cliente apaga esse
  campo antigo para não haver envio duplicado.
- **`Urgency: high` no webpush** ⚠️ — sem isto, o Android (sobretudo Xiaomi/MIUI)
  segura as mensagens em segundo plano → "não chega nada". **Já aplicado** em
  `scripts/send-reminders.mjs` (`webpush.headers.Urgency = 'high'`).
- **`notification` payload vs data-only.**
  - Hoje enviamos `notification` (o sistema mostra sozinho) e o SW **não** tem
    `onBackgroundMessage` — evita o duplicado.
  - Alternativa comprovada noutra PWA MIUI: **data-only** (sem campo
    `notification`) + o SW mostra via `onBackgroundMessage`. Sem `notification`
    não há duplicado. Se o `notification` payload não chegar de forma fiável no
    MIUI, **migrar para data-only + onBackgroundMessage**.
- **Primeiro plano: `registration.showNotification()`, NUNCA `new Notification()`.**
  O `new Notification()` funciona no desktop mas rebenta no Android
  (`Illegal constructor`). Usar sempre o service worker.
- **Antes de re-registar, limpar a subscrição antiga se a chave mudou.** Trocar a
  VAPID deixa presa uma subscrição com a chave velha → `push service error`.
  **Já aplicado** em `pushNotifications.js` (`clearStalePushSubscription`, via
  `PushManager.unsubscribe`, NÃO `deleteToken`).
- **Retry no getToken.** O `token-subscribe-failed` é por vezes transitório;
  tentamos 3 vezes com pausa. **Já aplicado.**

---

## Infraestrutura / permissões

- **Chave VAPID** — gerar no Firebase Console (Cloud Messaging → Web Push
  certificates) e passar ao `getToken({ vapidKey })`. Nesta app vem do secret
  `VITE_FIREBASE_VAPID_KEY` (injetado no build pelo `main.yml`). O valor do secret
  tem de ser **igual** à chave pública do par no Firebase.
- **Regras do Firestore** — `users/{uid}/push/{docId}` só o dono; o carteiro usa
  a service account admin e não passa pelas regras. (Ver `firestore.rules`.)
- **Se um dia se usar Cloud Functions agendadas** (`onSchedule`, 2ª geração) em
  vez do carteiro do GitHub:
  - Precisa do **plano Blaze** (billing ativo).
  - A service account do deploy precisa dos papéis **"Cloud Functions Admin" +
    "Cloud Run Admin"** — senão falha a configurar o "invoker" do Scheduler
    (erro *"Unable to set the invoker"*) e a função nunca dispara.
  - Cilada: se o deploy diz *"Skipped (No changes detected)"* não re-aplica a
    permissão — forçar uma alteração real no código da função.
  - Não misturar funções de 1ª e 2ª geração no mesmo ficheiro.

---

## Limitações do dispositivo (avisar as utilizadoras — não são bugs)

- **iPhone/iOS:** push só com a app **instalada no ecrã principal** (Safari →
  Partilhar → Adicionar ao ecrã principal) e **iOS 16.4+**. Em separador normal
  do Safari, nunca funciona.
- **Android/Xiaomi (MIUI):** a gestão de bateria pode bloquear o **registo**
  (`AbortError`) ou a **entrega** em segundo plano. Reiniciar, atualizar o Google
  Play Services, e permitir o **arranque automático** da app nas definições do
  MIUI.

---

## Problema que estava a bloquear tudo — RESOLVIDO ✅

- **`token-subscribe-failed: missing required authentication credential`** no
  registo. **Causa real: a chave VAPID estava ERRADA.** O segredo
  `VITE_FIREBASE_VAPID_KEY` tinha um valor que não correspondia ao Web Push
  certificate do projeto (foi alterado muitas vezes, mas o valor nunca ficou
  certo — e como o segredo é invisível, não dava para confirmar).
  **Solução:** fixámos no código (`pushNotifications.js`) a chave VAPID **real**,
  copiada do Firebase Console (Cloud Messaging → Certificados push da Web). Como é
  o `applicationServerKey` (público), pode estar no código.
  - Lição: o link que a Google mete neste erro
    (`.../identity/sign-in/web/devconsole-project`) é **genérico e enganador** (é
    sobre Google Sign-In, não sobre FCM) — ignorar. E o texto "missing credential"
    NÃO era a chave de API nem o App Check — era mesmo a VAPID.
  - Se a chave push da Web for regenerada no Console, **atualizar a constante
    `VAPID_KEY`** em `src/utils/pushNotifications.js`.
- Entrega no Android/Xiaomi (MIUI): resolvida com `Urgency: high` no carteiro.

## Token que "morre sozinho" a meio do dia — RESOLVIDO ✅

- **Sintoma:** o teste à força funcionava (recebia as notificações), mas os
  lembretes agendados falhavam **sem a utilizadora reinstalar nada**. Nos registos
  do carteiro: `Falha ao enviar ... Device unregistered.` → `0 enviadas`.
- **Causa real:** o telemóvel (sobretudo Xiaomi/MIUI, mas também o Chrome ao
  reciclar o service worker / limpar memória) **troca a subscrição push por conta
  própria**. O token guardado no Firestore fica "morto", mas a app só regravava o
  token **quando a utilizadora carregava em "Ativar"** — logo a nuvem ficava a
  apontar para o token velho até uma reativação manual.
- **Solução:** `refreshPushTokenIfEnabled()` em `pushNotifications.js`, chamada no
  arranque do `AuthenticatedApp` (`App.jsx`). Se as notificações já estão ligadas
  (`nep_push_enabled`) e a permissão foi concedida, faz `getToken` em silêncio e
  regrava o token fresco no Firestore. Assim o token mantém-se vivo sozinho — basta
  abrir a app de vez em quando.
- Nota: o carteiro, quando apanha `messaging/registration-token-not-registered`,
  apaga o token morto (`send-reminders.mjs`). Por isso, depois de um token morrer,
  os testes à força davam `0` ("sem token") até haver um refresh/reativação.

---

## Ficheiros-chave

- `src/utils/pushNotifications.js` — registo do token (cliente).
- `src/components/PushRemindersSettings.jsx` — UI dos lembretes.
- `public/firebase-messaging-sw.js` — service worker do FCM.
- `scripts/send-reminders.mjs` + `.github/workflows/reminders.yml` — carteiro.
- `users/{uid}/push/prefs` (Firestore) — token + preferências de lembretes.
