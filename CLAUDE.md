# CLAUDE.md — nep-app

> Guia de contexto e diretivas operacionais do projeto NEP.app.
> As regras de desenvolvimento e QA são de cumprimento obrigatório.

---

## ⏳ PENDENTES PARA A PRÓXIMA CONVERSA (Lembrar a Teresa)

1. **Estatísticas de "Surfar o Impulso" nas Análises:** Contabilizar frequência de exercícios, consumos adiados e tempo de adiamento (comparar `getUrgeEvents()` de `utils/urgeLog.js` com consumos subsequentes).
2. **Diário Falso (2.ª Opção de Disfarce):** Diário genérico que NÃO escreve na coleção real de `thoughts`. Gesto de acesso: abrir data → hora `00:00` → PIN. Criar seletor de disfarce nas Definições e atualizar o modal explicativo do gesto.

*(Remover esta secção após a Teresa decidir/concluir).*

---

## 🛡️ REGRAS INVIOLÁVEIS DE DESENVOLVIMENTO & QA

### 1. Manipulação de Datas e Fusos Horários
* **USAR SEMPRE `getTodayKey()`** de `utils/helpers`. 
* **NUNCA usar `new Date().toISOString()`** para agrupar ou filtrar eventos por dia (retorna UTC e quebra metas/alertas na viragem da meia-noite).

### 2. Checklist Obrigatória Antes de Cada Commit
* [ ] **Subir versão** no `package.json` (`__APP_VERSION__`) e alinhar o `README.md` (mudança pequena = patch/minor; grande = major). A versão TEM de refletir as mudanças — não é escolha de marca do utilizador.
* [ ] Executar `npm run build` sem erros.
* [ ] Garantir ausência de erros de TDZ na consola ("*Cannot access X before initialization*").
* [ ] Confirmar o contador de dias de utilização.
* [ ] Testar login por PIN com recarregamento completo de página.
* [ ] Listar explicitamente no commit o que foi verificado.

### 3. Integridade de Refactors e Campos
* **Performance / Lazy-loading:** Testar se o arranque e o contador de dias mantêm integridade.
* **Autenticação / PIN:** Validar sempre o fluxo de login em *refresh* real (nunca assumir que reinstalar PWA resolve).
* **Remoção de Campos:** Ao remover campos (ex: `lastBefore00`), garantir e declarar que os registos históricos continuam a contabilizar nas Análises.

---

## 📐 ARQUITETURA & ECOSSISTEMA

* **Stack:** React 19 + Vite + TailwindCSS | Dexie (IndexedDB) | Firebase (Auth/Firestore) | Web Crypto API (AES-256-GCM + PBKDF2) | Recharts/D3 | i18next.
* **Privacidade & E2E:** Dados cifrados no dispositivo antes da sincronização. O Firestore apenas guarda o envelope cifrado (`{ data, iv, lastModified, deleted }`). Sem PIN, os dados na nuvem são irrecuperáveis.
* **Carregamento por Fases (`LocalDataContext`):** FASE 1 (App pronta + metas/ciclos recentes) → FASE 2 (Últimos 7 dias) → FASE 3 (Histórico total).
* **Modos de Dados:** Local | Cloud Encriptada | Cloud + Investigação (A Teresa usa este modo; envia apenas agregados anónimos).

---

## 🚀 DEPLOY, INFRAESTRUTURA E GOTCHAS

* **Ramo Principal:** `claude/branch-naming-docs-CwjcE` (versão ativa de produção).
* **Build & Host:** Build gera para `/docs`. Workflow `.github/workflows/main.yml` publica em GitHub Pages.
* **⚠️ Instabilidade no GitHub Pages:** O build costuma passar, mas o *publish* pode falhar. Solução: Disparar manualmente o `main.yml` (workflow_dispatch) até ficar verde.
* **⚠️ Firestore Rules (`firestore.rules`):** Alterações no ficheiro no repositório **NÃO têm efeito automático**. É obrigatório publicar manualmente no Firebase Console (Firestore → Regras).
* **⚠️ Segredos do GitHub:** `VITE_FIREBASE_VAPID_KEY` (build) e `FIREBASE_SERVICE_ACCOUNT` (cron de lembretes).

---

## 🔔 SISTEMA DE NOTIFICAÇÕES PUSH (FCM)

* **Arquitetura:** `src/utils/pushNotifications.js` (cliente) + `public/firebase-messaging-sw.js` (Service Worker) + `scripts/send-reminders.mjs` (Carteiro via GitHub Actions cron).
* **Regras do Payload:** Usar **sempre `notification` payload** em vez de data-only. Dispositivos Android/MIUI matam o Service Worker com a app fechada se for data-only. O SW **não** deve ter `onBackgroundMessage` para evitar notificações duplicadas.
* **Janela do Cron:** O cron gratuito do GitHub corre com atrasos (~1h). A janela de verificação do script é de 120 min.

---

## 💬 TOM, COMUNICAÇÃO E PERFIL DA UTILIZADORA

* **Utilizadora:** Teresa — não é programadora. Todas as explicações técnicas devem ser feitas em **português simples, direto, sem jargão e com analogias do dia a dia**.
* **Paradigma de Redução de Danos:** Tom puramente **observacional e neutro** ("notámos que..."). **Proibido** tom moralista, paternalista ou focado em abstinência ("estás limpo", "um dia de cada vez"). Nunca assumir que "menos consumo = melhor".
* **Segurança de Dados:** Trata-se de população vulnerável e dados altamente sensíveis; a privacidade sobrepõe-se à conveniência de desenvolvimento.

---

## 📎 REFERÊNCIA DETALHADA (chato de ler, mas poupa tempo)

> Esta secção é a "memória longa" do projeto: o mapa dos ficheiros e as lições
> já aprendidas à força. Não é preciso ler de uma vez — consultar quando fizer falta.

### Mapa da app (que ficheiro faz o quê)

**Topo**
* `src/main.jsx` — entry point; monta a árvore normal **ou** a árvore de demo (isolada, sem auth/IDB/Firebase). Injeta `__APP_VERSION__`. `checkForUpdates()` limpa caches e recarrega quando a versão muda.
* `src/App.jsx` — componente raiz (~1300 linhas): navegação entre ecrãs, modais, atalhos PWA (`?action=`), inicialização. Também aloja o **gate do modo disfarce** (calculadora).
* `src/i18n.js` — configuração i18next. `vite.config.js` — build para `docs/`, PWA (workbox), injeção de versão + VAPID, `manualChunks`.

**`src/views/` (os ecrãs / tabs de baixo)**
* `HomeViewRefactored.jsx` — **Início**. Botão "Marcar Consumo", registos rápidos, alertas de metas, cartão do último período pesado, e o **modal de repensar o consumo** (ver abaixo).
* `PatternsView.jsx` — **Padrões** (~2800 linhas, "god component" — mexer com cuidado).
* `AnalysesView.jsx` — **Análises** (fatorizado; só monta o sub-separador ativo). Sub-tabs em `src/views/analyses/`: `AnalysesCorrelacoesTab`, `AnalysesCoachTab`, `AnalysesEstadoTab`, `AnalysesImpactoTab` (cálculos pesados; `CorrelacoesTab`/`CoachTab` também são grandes).
* `HistoryView.jsx` — **Histórico** (paginado + memoizado). Inclui o tópico "Pesagens".
* `SettingsView.jsx` — **Config**. Secções em dropdown (`Section`): Notificações (+ surfar o impulso), Comunidade, Os meus dados (+ modo de dados), Segurança e bloqueio (bloqueio automático + modo disfarce), Conta, Sobre/ajuda/legal.

**`src/contexts/`**
* `AuthContext.jsx` — PIN, login/criação de conta, `changePin` (atómico), lockMode, auto-lock, salt.
* `DataContext.jsx` — inicializa Firebase (singleton), expõe dados e wrappers `addX/updateX/deleteX` (push debounced — `schedulePush`).
* `LocalDataContext.jsx` — carregamento em FASES (ver Arquitetura). Metas e ciclos recentes carregam cedo (FASE 1) para o modal de metas funcionar logo.
* `MetricsContext.jsx` — métricas derivadas; **rollup por dia** e **ficha-resumo por dia** (`dailySummary`) **persistidos** para as páginas pesadas não desencriptarem tudo.
* `UIContext.jsx` — estado de UI. `DemoDataContext.jsx` — dados de demo em memória.

**`src/services/`**
* `syncService.js` — push/pull com o Firestore (documentos cifrados). `analyticsService.js` — correlações, períodos, labels.
* `researchService.js` — envia **só agregados anónimos** (nunca texto; o sentimento já **não** é enviado).
* `exportService.js` — backup completo em JSON. *(A app já exporta E reimporta — ver botões em Definições → Os meus dados.)*

**`src/db/`**
* `localDB.js` — BD principal (Dexie, `NEPDatabase`): consumptions, dailyLogs, reflections, wellbeingLogs, cycles, goals, copingStrategies, thoughts, healthLogs, weighings + `metadata` + `syncQueue`.

**`src/utils/` (cripto + helpers)**
* `encryption.js` — AES-256-GCM + PBKDF2 (100k) + salt (`deriveKey` com cache; `clearKeyCache`).
* `dexieEncryption.js` — cifra/decifra **por item** (lotes de 100, em paralelo). `saltManager.js` — salt local + recuperação via Firebase (multi-dispositivo). `syncValidation.js` — integridade do sync. `firebase.js` — config pública + singleton.
* `helpers.js` — datas (`getTodayKey`, `safeToISODate`…). **Usar sempre as versões LOCAIS de data.** `storage.js` — `safeLocalStorage` (get/set validados).
* `userStats.js` — stats pré-calculadas (streak, contador de dias) + rollup/summary persistidos (escreve na `metadata`). O alerta de dose usa só dias com mg **medida** de pesagem.
* `mgDerivation.js` — deriva mg a partir de pesagens (ver abaixo). `urgeLog.js` — regista os momentos de impulso (localStorage `nep_urge_events`).
* `pushNotifications.js`, `sentimentAnalysis.js`, `logger.js`, `classNames.js`, `validation.js`.

**`src/hooks/`**
* `useAnalysis.js` (streaks, correlações), `useReminders.js` (lembretes locais, só com app aberta), `useCrossMountMemo.js` (memória que sobrevive a trocar de separador), `useToast`, `useModalKeyboard`, `useAuth`.

**`src/components/modals/`**
* `CycleModal` (sono), `DailyLogModal` (mg), `EmotionsModal`, `WellbeingModal`, `ReflectionModal`, `ThoughtsModal`, `GoalModal`, `EditConsumptionModal`, `ExportModal`, `LegalModal`, `WeighingModal` (com data/hora), `UrgeSurfingModal` (surfar o impulso — ver abaixo). Outros: `PushRemindersSettings`, `FeatureAnnouncement`, `DataModeSelector`, `CalculatorDecoy`.

### Modal de "repensar o consumo" (metas)
* Em `HomeViewRefactored.jsx`, `computeLiveGoalBreaches()` verifica **na hora** se consumir AGORA viola uma meta **de consumo**: intervalo (`increase_interval`), frequência (`reduce_frequency`), hora-limite (`limit_last`), não consumir ao acordar (`first_not_before`).
* As metas de **sono/deitar NÃO entram** (não têm a ver com o ato de consumir).
* Se violar → abre o `UrgeSurfingModal`. Metas e ciclos carregam cedo (FASE 1) para isto funcionar logo no arranque.

### Exercício "Surfar o Impulso" (`UrgeSurfingModal`)
* Removido o HALT (cultura de 12 passos que a Teresa rejeita). Exercícios atuais: "O que preciso agora?" (pergunta aberta com sugestões), "Ancorar 5-4-3-2-1", "Mexer o corpo" (inclui água fria/gelo), e sugestão de responder à reflexão do dia.
* Timer selecionável (15 min por defeito, até 60; **não notifica** — fica só o timer no ecrã).
* Cada utilização é registada via `urgeLog.js` (`logUrgeEvent`), incluindo se adiou o consumo. Toggle liga/desliga em Definições → Notificações.

### Pesagens → mg (`mgDerivation.js`)
* `buildCycles` = períodos entre duas pesagens; `deriveDailyMg` distribui **só o total MEDIDO** (`consumido / nº de doses`) pelos dias com dose nesse ciclo.
* **NUNCA inventa mg em dias sem pesagem** (o branch de estimativa "típica" foi removido). Estados: measured / estimated / mixed / unknown / none.
* `lastMeasuredPeriod(weighings)` = último ciclo medido fechado (cartão no Início). O alerta de dose e o Histórico só mostram mg com estado `measured`.

### Modo disfarce (`CalculatorDecoy`)
* A app abre como calculadora real. Gesto secreto para entrar: **AC 3× → escrever o PIN (aparece escondido, ••••) → "="**.
* Destranca com o **PIN de sempre** — o código nunca é guardado em claro. Contas normais nunca tentam o PIN nem provocam bloqueio (o contador de falhas é reposto).
* Ligado em `nep_disguise_enabled` (localStorage). Ao ativar, um pop-up explica o gesto e exige confirmação ("não me esqueço"). Textos de ajuda/email **só** aparecem nas Definições, nunca dentro do disfarce.

### Lições aprendidas — Notificações Push (importantes)
* **`notification` payload > data-only** no Android/MIUI com a app fechada. Data-only exige "acordar" o SW, coisa que o Xiaomi/MIUI bloqueia. Por isso removemos o `onBackgroundMessage` (senão vinha a dobrar).
* **Cron grátis do GitHub é estrangulado** (~de hora a hora). Janela larga (120 min). Para hora ao minuto seria preciso Cloud Functions `onSchedule` (plano Blaze, com cartão).
* **Registo (`getToken`) é frágil:** pode falhar com `push service error` / `token-subscribe-failed` (muitas vezes transitório — repetir resolve; às vezes é subscrição estragada no aparelho → reinstalar limpo). Web push falha mesmo em alguns Android.
* Guardamos um **mapa de tokens multi-dispositivo** (`tokens[deviceId]`), e há **refresh silencioso do token ao abrir a app** (resolve o token morto após reinstalar).
* A **tarefa agendada só corre a partir do ramo predefinido** do repo (por isso o default é `claude/branch-naming-docs-CwjcE`).

### Performance (estratégias, resumo)
1. Carregamento em fases (`LocalDataContext`). 2. Rollup + ficha-resumo por dia **persistidos** (`MetricsContext` + `userStats`). 3. `useCrossMountMemo` (Análises não recalcula ao voltar). 4. Índices por data nas Análises (evita O(N²)). 5. Histórico paginado; Análises só monta o separador ativo.

### Gotchas pequenos
* `safeLocalStorage` teve um bug que estragava arrays/objetos — **corrigido**; usar à vontade.
* Datas: **sempre local** (`getTodayKey`), nunca `toISOString()` (UTC) para comparar/filtrar por dia.
* Deploy do Pages instável → repetir o `main.yml`. `firestore.rules` precisa de publicação manual no Firebase Console.
