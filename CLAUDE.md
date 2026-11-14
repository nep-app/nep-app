# CLAUDE.md — nep-app

> Guia de contexto e diretivas operacionais do NEP.app.
> Cumprimento estritamente obrigatório em todas as sessões.
> Mapeamento detalhado de ficheiros/pastas em `ARQUITETURA.md`.

---

## ⏳ PENDENTES PARA A PRÓXIMA CONVERSA (Lembrar a Teresa)

1. **Diário Falso (2.ª Opção de Disfarce):** Diário genérico que NÃO escreve na coleção real de `thoughts`. Gesto de acesso: abrir data → hora `00:00` → PIN. Criar seletor de disfarce nas Definições e atualizar o modal explicativo do gesto.

*(Remover esta secção após a Teresa decidir/concluir).*

---

## 🛡️ REGRAS INVIOLÁVEIS DE DESENVOLVIMENTO & QA

### 1. Manipulação de Datas e Fusos Horários
* **USAR SEMPRE `getTodayKey()`** de `utils/helpers`.
* **NUNCA usar `new Date().toISOString()`** para agrupar ou filtrar eventos por dia (retorna UTC e quebra metas/alertas na viragem da meia-noite).

### 2. Checklist Obrigatória Antes de Cada Commit
* [ ] **Subir versão** no `package.json` (`__APP_VERSION__`) e alinhar o `README.md` (mudança pequena = patch/minor; grande = major). A versão REFLETE as alterações, não é escolha de marca.
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

## ⛔ DECISÕES & LINHAS VERMELHAS (O que NUNCA fazer)

* **Sem Cultura de 12 Passos:** Proibido reintroduzir modelos baseados em abstinência/12 passos (ex: o HALT foi removido do Urge Surfing a pedido explícito).
* **A Direção é da Utilizadora, Não da App (regra do elogio):** A app NUNCA decide sozinha que uma direção de consumo é boa. Elogio, cor (verde/vermelho), emoji de alarme (🚨/⚠️/✅) e frases de incentivo ("Continua assim!", "Progresso!") só existem para uma meta que a pessoa definiu.
  * **Sem meta → só descrição.** O número mostra-se sempre; o juízo é que não. *Gate no elogio, nunca nos dados.*
  * **Meta de reduzir ou manter → pode reconhecer-se o progresso**, porque é a escolha dela.
  * **Meta de aumentar → só descritivo, nunca celebração.** Não julgar ≠ encorajar: uma app não empurra ninguém para usar mais. O neutro está sempre disponível.
  * Isto vale para bem-estar (sono, humor, autocuidado) de forma mais solta — aí o elogio é sobre cuidar de si, não sobre a direção do consumo.
  * *Aplicado em v6.50.0. Tipos de meta existentes: `reduce_frequency`, `reduce_quantity`, `keep_frequency`, `keep_quantity`, `increase_interval`, `first_not_before`, `limit_last`, `sleep_hours`, `bedtime_before`. Desde a v8.1.0 **"manter" existe** (`keep_frequency`, `keep_quantity`: "por volta de X ± Y", campos `target` + `tolerance`; dentro de [X−Y, X+Y] cumpre; **abaixo do intervalo nunca é falhar** — cinzento, sem aviso nem frase que empurre para consumir mais; acima = amarelo/laranja; no "Comparar" sem veredicto de direção). Usar `keepGoalZone`/`meetsGoal(type, v, target, tolerance)` de `utils/helpers`. Não existe "aumentar" — se for criado, a regra acima já decide o comportamento.*
  * *"Surfar o impulso" é escolhido **meta a meta** (campo `offerUrge`, desligado nas metas novas; metas antigas sem o campo = ligadas). Usar `goalOffersUrge(goal, interruptorGeral)`. Só abre se pelo menos uma das metas ultrapassadas o pedir; o interruptor `nep_urge_exercise` das Definições é o geral.*
* **A App Tem de Poder Dizer "Não Sei":** A app pode dizer *"isto não se distingue do acaso"*, e **tem de o poder dizer antes de poder dizer o contrário**. Uma ferramenta que só sabe afirmar é uma ferramenta que só sabe convencer.
  * Nenhum número apresentado como certeza sem a incerteza ao lado (ex.: o "75% probabilidade" fixo no texto, removido na v6.51.0).
  * Ao contar por permutação, usar sempre `(b+1)/(m+1)`: com 5000 baralhações e zero acertos diz-se **"menos de 1 em 5000"**, nunca "zero".
  * *Plano completo em `PLANO-ESTATISTICA.md` (ecrã → n mínimo → p por permutação → parcial com Freedman–Lane).*

* **Estatística partilhada:** usar `src/utils/stats.js` (Spearman + p por deslocamento circular para séries de dias; `diffPermutation` para dois grupos de registos). Não reinventar noutro sítio.
* **Nunca Ordenar Correlações por Força:** A tab das Correlações mostra os blocos por ordem FIXA no código, nunca por `|r|`. **Não mexer.** Ordenar pelas mais fortes é o tipo de melhoria que se propõe de boa-fé e que embute o problema das comparações múltiplas na própria interface: com 31 correlações no ecrã, a maior é quase sempre ruído, e quem lê lê-a como se fosse a única. Nenhum p-value salva uma interface que já escolheu a resposta.
* **Regra Testável do "Não Sei":** Nenhum número vai para o ecrã se o código que o pôs lá **não pudesse ter decidido não o pôr**. Todo o caminho que mostra um valor tem de ter um ramo onde recusa mostrá-lo (dados insuficientes, sem meta, sem medição fiável). Verifica-se a ler o código — ao contrário do slogan, que não se testa.

* **Medição de mg Sem Estimativas Inventadas:** NUNCA inventar ou estimar doses em mg para dias sem pesagem. O sistema usa apenas dias com medição real (`measured`).
* **Segurança do PIN & Disfarce:** O PIN NUNCA é guardado em texto claro. Textos de ajuda ou email de recuperação NUNCA devem aparecer dentro do ecrã do modo disfarce (Calculadora).
* **Privacidade / Research:** NUNCA enviar texto livre nem análise de sentimento para o modo de investigação/research — apenas dados quantitativos e agregados anónimos (na verdade pseudónimos: as semanas da mesma pessoa ficam ligadas). A **intenção / "como" / "correu como querias"** (campos `intentions`, `how`, `evaluation` nos consumos) **nunca** entram no research. Perguntas de investigação em `PLANO-INVESTIGACAO.md`.
* **Registar é UM toque:** nada (intenção, perguntas) pode ficar à frente do registo de um consumo. O "correu como querias?" está desligado por defeito.

---

## 📐 ARQUITETURA & ECOSSISTEMA

* **Stack:** React 19 + Vite + TailwindCSS | Dexie (IndexedDB) | Firebase (Auth/Firestore) | Web Crypto API (AES-256-GCM + PBKDF2) | Recharts/D3 | i18next.
* **Privacidade & E2E:** Dados cifrados no dispositivo antes da sincronização. O Firestore apenas guarda o envelope cifrado (`{ data, iv, lastModified, deleted }`). Sem PIN, os dados na nuvem são irrecuperáveis.
* **Carregamento por Fases (`LocalDataContext`):** FASE 1 (App pronta + metas/ciclos recentes) → FASE 2 (Últimos 7 dias) → FASE 3 (Histórico total).
* **Modos de Dados:** Local | Cloud Encriptada | Cloud + Investigação (A Teresa usa este modo).
* *Mapa completo da estrutura de ficheiros:* Ver `ARQUITETURA.md`.

---

## 🚀 DEPLOY, INFRAESTRUTURA E GOTCHAS

* **Ramo Principal:** `claude/branch-naming-docs-CwjcE` (versão ativa de produção).
* **Build & Host:** Build gera para `/docs`. Workflow `.github/workflows/main.yml` publica em GitHub Pages.
* **⚠️ Publicar = push SÓ para os ramos de produção** (`claude/branch-naming-docs-CwjcE` e `claude/user-experience-design-review-rmp9px`). Fazer push de outro ramo `claude/**` ao mesmo tempo (ex.: o ramo de trabalho da sessão) lança outro deploy que **cancela o de produção** e depois falha (o ambiente do Pages não aceita esse ramo). Se acontecer: disparar o `main.yml` à mão no ramo de produção.
* **⚠️ Instabilidade no GitHub Pages:** O build costuma passar, mas o *publish* pode falhar. Solução: Disparar manualmente o `main.yml` (workflow_dispatch) até ficar verde.
* **⚠️ Firestore Rules (`firestore.rules`):** Alterações no ficheiro no repositório **NÃO têm efeito automático**. É obrigatório publicar manualmente no Firebase Console (Firestore → Regras).
* **⚠️ Segredos do GitHub:** `VITE_FIREBASE_VAPID_KEY` (build) e `FIREBASE_SERVICE_ACCOUNT` (cron de lembretes).

---

## 🔔 SISTEMA DE NOTIFICAÇÕES PUSH (FCM)

* **Arquitetura:** `src/utils/pushNotifications.js` (cliente) + `public/firebase-messaging-sw.js` (Service Worker) + `scripts/send-reminders.mjs` (Carteiro via GitHub Actions cron).
* **Regras do Payload:** Usar **sempre `notification` payload** em vez de data-only (evita que o Android/MIUI mate o SW com a app fechada). O SW **não** deve ter `onBackgroundMessage` para evitar notificações duplicadas.
* **Janela do Cron:** O cron gratuito do GitHub corre com atrasos (~1h). A janela de verificação do script é de 120 min.
* **⚠️ Cron só do ramo default:** A tarefa agendada dos lembretes só corre a partir do ramo predefinido do repo (por isso o default é `claude/branch-naming-docs-CwjcE`). Mudar o default sem querer = lembretes deixam de sair.

---

## 💬 TOM, COMUNICAÇÃO E PERFIL DA UTILIZADORA

* **Utilizadora:** Teresa — não é programadora. Todas as explicações técnicas devem ser feitas em **português simples, direto, sem jargão e com analogias do dia a dia**.
* **Paradigma de Redução de Danos:** Tom puramente **observacional e neutro** ("notámos que..."). **Proibido** tom moralista, paternalista ou focado em abstinência ("estás limpo", "um dia de cada vez"). Nunca assumir que "menos consumo = melhor".
* **Segurança de Dados:** Trata-se de população vulnerável e dados altamente sensíveis; a privacidade sobrepõe-se à conveniência de desenvolvimento.
