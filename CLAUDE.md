# CLAUDE.md — nep-app

> Guia de contexto e diretivas operacionais do NEP.app.
> Cumprimento estritamente obrigatório em todas as sessões.
> Mapeamento detalhado de ficheiros/pastas em `ARQUITETURA.md`.

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
* **Medição de mg Sem Estimativas Inventadas:** NUNCA inventar ou estimar doses em mg para dias sem pesagem. O sistema usa apenas dias com medição real (`measured`).
* **Segurança do PIN & Disfarce:** O PIN NUNCA é guardado em texto claro. Textos de ajuda ou email de recuperação NUNCA devem aparecer dentro do ecrã do modo disfarce (Calculadora).
* **Privacidade / Research:** NUNCA enviar texto livre nem análise de sentimento para o modo de investigação/research — apenas dados quantitativos e agregados anónimos.

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
