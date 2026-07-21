# CLAUDE.md — nep-app

> Guia do projeto para qualquer futura sessão (Claude ou humano) entrar ao assunto
> sem ter de reaprender tudo. Mantém as **regras de desenvolvimento** no topo — são
> obrigatórias.

---

## Sobre o projeto

`nep-app` (NEP.app) é uma **app de redução de danos** para acompanhamento de consumo de
substâncias psicoativas. **Privacy-first**, **local-first**, funciona **offline** e é uma
**PWA** (instalável no telemóvel). O objetivo **não é julgar nem abstinência** — é ajudar a
consumir de forma mais consciente, ver padrões, perceber o impacto no bem-estar/sono e
reduzir ao ritmo de cada pessoa.

**Utilizadora principal:** a Teresa — **não é programadora**. Explicar sempre em **português
simples, não técnico, com analogias**. Segurança e privacidade pesam muito (população
vulnerável, dados sensíveis).

---

## Regras de desenvolvimento (OBRIGATÓRIO)

### Performance e lazy-loading
Após qualquer otimização de performance ou alteração de lazy-loading, verifica se a app ainda
arranca sem erros de TDZ ("Cannot access X before initialization") e retesta o contador de
dias de utilização antes de fazeres commit.

### Linguagem das explicações
Explica as alterações em português simples e não técnico. Evita jargão denso — o utilizador
não é programador e precisa de linguagem simples. Usa analogias do dia a dia.

### Autenticação e PIN
Qualquer refactor de autenticação/bloqueio/PIN deve ser testado em recarregamentos completos
de página (não apenas na sessão) e verificado se o login por PIN continua a funcionar antes do
commit. Nunca assumas que reinstalar a PWA é desnecessário.

### Fusos horários e limites de meia-noite
Ao agrupar ou comparar eventos de consumo por data/hora, tem em conta o fuso horário UTC vs
local e o caso limite de 00:00 = 0 minutos para que os alertas de metas não sejam disparados
erradamente. **(Usar `getTodayKey()` de `utils/helpers`, NÃO `new Date().toISOString()` que dá
UTC.)**

### Remoção de campos
Quando for pedido para remover um campo (ex: lastBefore00), confirma se os registos antigos
continuam a contar corretamente em TODAS as análises e indica explicitamente o que foi alterado.

## Antes de cada commit
- **Sobe a versão** no `package.json` (fonte única, lida pela app via `__APP_VERSION__`)
  e alinha o `README.md` — a versão TEM de refletir as mudanças, não é escolha de marca
  do utilizador. Mudança pequena → sobe o patch/minor; conjunto grande de features → sobe
  o major. Nunca deixar a versão congelada quando há alterações reais.
- Constrói a app (`npm run build`) e verifica se não há erros
- Verifica se não há erros de TDZ/inicialização na consola
- Confirma que o contador de dias de utilização está correto
- Testa o login por PIN após qualquer alteração de autenticação
- Lista explicitamente o que foi verificado

---

## Stack

- **React 19** + **Vite** + **TailwindCSS**
- **i18next** — PT/EN (`src/locales/pt.json`, `en.json`)
- **Dexie / IndexedDB** — armazenamento local (`src/db/localDB.js`)
- **Firebase** — Auth (email+password) + Firestore (sync, backup cifrado). Projeto: `harm-reduction-d4f7d`.
- **Web Crypto API** — encriptação **AES-256-GCM** end-to-end derivada do PIN (PBKDF2)
- **Recharts / d3** — gráficos
- **PWA** publicada em **GitHub Pages** (`https://nep-app.github.io/nep-app/`)

## Arranque / build / deploy

- Dev: `npm run dev`. Build: `npm run build` → gera para **`docs/`** (é o que o Pages serve).
- **Deploy:** workflow `.github/workflows/main.yml` corre a cada push para `claude/**`, faz build
  e publica no GitHub Pages (source = GitHub Actions).
- **Ramo principal (default) do repo:** `claude/branch-naming-docs-CwjcE` — é a **versão real/atual**.
- ⚠️ **GitHub Pages anda instável** ("Deployment failed, try again later"). O *build* passa quase
  sempre; falha só o *publish*. Solução: **voltar a disparar** o `main.yml` (workflow_dispatch) até
  ficar verde.
- ⚠️ **`firestore.rules`** no repo **só entra em vigor quando publicado à mão** no Firebase Console
  (Firestore → Regras). Mudar o ficheiro não muda as regras a valer.
- ⚠️ Segredos no GitHub (Settings → Secrets → Actions): `VITE_FIREBASE_VAPID_KEY` (injetado no build)
  e `FIREBASE_SERVICE_ACCOUNT` (usado pelo carteiro dos lembretes).

---

## Estrutura de pastas (o que cada coisa faz)

### Topo
- `src/main.jsx` — entry point; monta a árvore normal **ou** a **árvore de demo** (isolada, sem
  auth/IDB/Firebase). Injeta a versão (`__APP_VERSION__` vindo do `package.json` via `vite.config.js`).
- `src/App.jsx` — componente raiz (~1300 linhas): navegação entre ecrãs, estado dos modais, atalhos
  PWA (`?action=`), inicialização.
- `src/i18n.js` — configuração i18next.
- `vite.config.js` — build para `docs/`, PWA (workbox), injeção de versão + VAPID, `manualChunks`.

### `src/views/` — os ecrãs (tabs de baixo)
- `HomeViewRefactored.jsx` — **Início**. Botão "Marcar Consumo", registos rápidos, alertas de metas,
  e o **modal de repensar o consumo** (ver secção própria).
- `PatternsView.jsx` — **Padrões** (~2800 linhas, "god component"). Sub-vistas: dashboard, progresso,
  temporal, estrutural.
- `AnalysesView.jsx` — **Análises** (fatorizado, bom modelo). Só monta o sub-separador ativo.
- `HistoryView.jsx` — **Histórico** (paginado + memoizado).
- `SettingsView.jsx` — **Config** (definições, backup, lembretes push, etc.).
- `src/views/analyses/` — sub-separadores das Análises: `AnalysesCorrelacoesTab`, `AnalysesCoachTab`,
  `AnalysesEstadoTab`, `AnalysesImpactoTab` (cálculos pesados; ver Performance).

### `src/contexts/`
- `AuthContext.jsx` — PIN, login/criação de conta, `changePin` (atómico), lockMode, auto-lock, salt.
- `DataContext.jsx` — inicializa Firebase (singleton via `utils/firebase.js`), expõe os dados e os
  wrappers `addX/updateX/deleteX` (com **push debounced** — `schedulePush`).
- `LocalDataContext.jsx` — **carregamento em FASES** (1: app pronta instantânea; 2: últimos 7 dias;
  3: histórico completo). Metas (todas) e ciclos recentes carregam **cedo** (para o modal de metas).
- `MetricsContext.jsx` — métricas derivadas; **rollup por dia** e **ficha-resumo por dia**
  (`dailySummary`), **persistidos** para as páginas pesadas não desencriptarem tudo.
- `UIContext.jsx` — estado de UI partilhado. `DemoDataContext.jsx` — dados de demo em memória.

### `src/services/`
- `syncService.js` — push/pull com o Firestore (documentos **cifrados**: `{data, iv, ...}`).
- `analyticsService.js` — cálculos de analytics (correlações, períodos, labels).
- `researchService.js` — envia **só agregados anónimos** para investigação (nunca texto). O sentimento
  já **não** é enviado.
- `exportService.js` — backup completo em JSON (`nep-backup-completo.json`). *(Nota: a app exporta mas
  ainda NÃO reimporta.)*

### `src/db/`
- `localDB.js` — base de dados **principal** (Dexie, `NEPDatabase`). Coleções: consumptions, dailyLogs,
  reflections, wellbeingLogs, cycles, goals, copingStrategies, thoughts, healthLogs + `metadata` +
  `syncQueue`. *(Havia uma segunda BD órfã `dexieDB.js` — já removida.)*

### `src/utils/` (crípto + helpers)
- `encryption.js` — AES-256-GCM + PBKDF2 (100k iterações) + salt. `deriveKey` com cache. `clearKeyCache`.
- `dexieEncryption.js` — encripta/desencripta **por item** (em lotes de 100, em paralelo).
- `saltManager.js` — gestão do salt (local + recuperação via Firebase, multi-dispositivo).
- `syncValidation.js` — item de controlo de integridade do sync.
- `firebase.js` — config pública + **singleton** (`getFirebaseApp/Auth/Db`).
- `helpers.js` — datas (`getTodayKey`, `safeToISODate`…), formatação. **Usar as versões LOCAIS de data.**
- `storage.js` — `safeLocalStorage` (get/set com validação). *(Tinha um bug com arrays — corrigido.)*
- `userStats.js` — stats pré-calculadas (streak, contador de dias) + **rollup/summary persistidos**.
  *(Escreve na `metadata` do `localDB`.)*
- `pushNotifications.js` — lado cliente das notificações push (ver secção).
- `sentimentAnalysis.js`, `logger.js`, `classNames.js`, `validation.js`.

### `src/hooks/`
- `useAnalysis.js` — cálculos centrais (streaks, correlações temporais).
- `useReminders.js` — lembretes **locais** (só com a app aberta).
- `useCrossMountMemo.js` — memória que **sobrevive a trocar de separador** (Análises não recalcula).
- `useToast`, `useModalKeyboard`, `useAuth` (hook Firebase, distinto do `AuthContext`).

### `src/components/modals/`
Modais de registo: `CycleModal` (sono), `DailyLogModal` (mg), `EmotionsModal`, `WellbeingModal`,
`ReflectionModal`, `ThoughtsModal`, `GoalModal` (metas), `EditConsumptionModal`, `ExportModal`,
`LegalModal`, e **`UrgeSurfingModal`** (exercício de "surfar o impulso" — timer, HALT, sem julgamento).
Outros componentes: `PushRemindersSettings.jsx`, `FeatureAnnouncement.jsx`, `DataModeSelector.jsx`.

---

## Segurança / encriptação (E2E)

- Tudo o que é sensível é **cifrado no dispositivo antes de subir**. O Firebase só vê o envelope
  `{ data: <base64>, iv: <base64>, lastModified, deleted }` — **sem campos em claro**.
- A chave vem do **PIN** (PBKDF2 + salt). **Sem o PIN, os dados na nuvem são ilegíveis** (nem nós).
- Camadas: `encryption.js` (núcleo) → `dexieEncryption.js` (por item) → `saltManager.js` (salt).
- `firestore.rules` valida a **forma cifrada** e restringe ao dono (`isOwner`), com deny-all final.

## Modos de dados (DataModeSelector)
- **Só local** (sem backup), **Cloud encriptada** (recomendado), **Cloud + investigação** (partilha
  agregados anónimos). A Teresa está em **research** (cloud + investigação).

## Modal de "repensar o consumo" (metas)
- Em `HomeViewRefactored.jsx`, `computeLiveGoalBreaches()` verifica **na hora** se consumir AGORA
  viola uma meta **de consumo** que a utilizadora definiu: **intervalo** (`increase_interval`),
  **frequência** (`reduce_frequency`), **hora-limite** (`limit_last`), **não consumir ao acordar**
  (`first_not_before`). As metas de **sono/deitar não entram** (não têm a ver com o ato de consumir).
- Se violar → abre o `UrgeSurfingModal`. As metas e ciclos são carregados **cedo** (FASE 1) para isto
  funcionar logo no arranque, sem ir aos Padrões.

---

## Performance (arquitetura importante)

O custo grande é **desencriptar/processar** meses de histórico. Estratégias:
1. **Carregamento em fases** (`LocalDataContext`): app pronta já, dados a chegar em background.
2. **Rollup + ficha-resumo por dia PERSISTIDOS** (`MetricsContext` + `userStats`): as páginas pesadas
   leem o resumo gravado **sem** abrir o cofre inteiro.
3. **`useCrossMountMemo`**: cada separador das Análises calcula **uma vez**; trocar e voltar é instantâneo.
4. **Índices por data** nas Análises (evita padrões O(N²) do tipo "por cada ciclo, varrer todos os consumos").
5. Histórico **paginado**; Análises só monta o **separador ativo**.

⚠️ `PatternsView.jsx` (~2800) e `AnalysesCorrelacoesTab.jsx`/`CoachTab.jsx` são "god components" grandes —
mexer com cuidado.

---

## Notificações push (lembretes com a app fechada)

Objetivo: lembretes **agendados** (registar mg, emoções, bem-estar, reflexão, ir dormir) que aparecem
**mesmo com a app fechada**.

- **Cliente:** `src/utils/pushNotifications.js` — pede permissão, obtém token FCM (`getToken` com a
  chave **VAPID**), guarda token + preferências em `users/{uid}/push/prefs` no Firestore.
  UI em `src/components/PushRemindersSettings.jsx` (Definições → 🔔).
- **Recetor:** `public/firebase-messaging-sw.js` — service worker dedicado ao FCM. **NÃO** tem
  `onBackgroundMessage` — deixamos o **sistema mostrar a notificação sozinho** (payload `notification`),
  que é o caminho **fiável com a app fechada** (e evita duplicados).
- **Carteiro (agendador):** `scripts/send-reminders.mjs` + `.github/workflows/reminders.yml`. Um cron do
  GitHub Actions corre o script (`firebase-admin`), lê as prefs, vê quem tem lembrete "na hora" (no fuso
  de cada um) e envia. Dedup diário. **Input `force`** no workflow para **testar** (ignora hora/dedup).

**Lições aprendidas (importantes):**
- **`notification` payload > data-only** no Android/MIUI com a app fechada. Data-only exige "acordar" o
  service worker, coisa que o **Xiaomi/MIUI bloqueia**. Por isso enviamos `notification` e **removemos**
  o `onBackgroundMessage` (senão vinha a dobrar).
- **Cron grátis do GitHub é estrangulado** (~de hora a hora, não de 15 em 15 min). Por isso a **janela**
  no script é larga (120 min) — o lembrete dispara no 1º run até 2h depois. Para hora **ao minuto**,
  seria preciso **Cloud Functions `onSchedule` (plano Blaze, com cartão)**.
- **Registo (`getToken`) é frágil:** pode falhar com `push service error` ou `token-subscribe-failed`
  (muitas vezes transitório — repetir resolve; às vezes é subscrição estragada no aparelho → reinstalar
  limpo). Web push falha mesmo em alguns Android.
- A tarefa **agendada só corre a partir do ramo predefinido** do repo (por isso o default foi mudado
  para `claude/branch-naming-docs-CwjcE`).

---

## Preferências da utilizadora (Teresa)

- **Explicar em PT simples e não técnico**, com analogias do dia a dia. Nada de jargão.
- **Redução de danos:** tom **observacional** ("notámos que…"), **nunca** de abstinência/julgamento
  ("estás limpo", "um dia de cada vez"). Evitar "menos = melhor" como norma.
- **Segurança/privacidade** pesam mais do que o normal (dados sensíveis, população vulnerável).
- Ser **honesto** sobre limitações (ex.: web push no Xiaomi não é 100%) em vez de prometer perfeição.
- Confirmar ações irreversíveis/produção antes de avançar.

## Gotchas / notas úteis

- `safeLocalStorage` teve um bug que estragava **arrays/objetos** (não persistiam) — corrigido; usar à
  vontade agora.
- Datas: **sempre local** (`getTodayKey`), nunca `toISOString()` (UTC) para comparar/filtrar por dia.
- Deploy do Pages **instável** → repetir o `main.yml`.
- `firestore.rules` precisa de **publicação manual** no Firebase Console.
- Há um `CLAUDE.md` de regras que **override** comportamento — respeitar sempre a secção do topo.
