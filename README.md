# NEP.app — Harm Reduction Tracker

> Aplicação web de redução de danos para consumo de substâncias psicoativas

<!-- Fonte única da versão: package.json. Atualizar lá; este número deve acompanhar. -->
**Versão actual: v8.0.2**

A app começou como um tracker simples e evoluiu para uma plataforma completa de redução de danos — agnóstica à substância, que funciona para estimulantes, dissociativos, empatogénios ou qualquer outra substância que o utilizador queira monitorizar.

O objectivo não é julgar. É ajudar a consumir de forma mais consciente, identificar padrões, perceber o impacto no bem-estar e reduzir gradualmente ao ritmo de cada pessoa.

---

## O que a app faz hoje

Barra de baixo: **Início · Padrões · Análises · Histórico · Config**.

### Princípios (linhas vermelhas — ver CLAUDE.md)
- **Redução de danos**, nunca abstinência nem 12 passos. Tom neutro, sem moralismo.
- **Regra do elogio:** elogio e cores verde/vermelho só existem quando há uma
  meta que a própria pessoa definiu. Sem meta, a app só descreve.
- **A app tem de poder dizer "não sei":** cada número de relação ou efeito
  tem um mínimo de dados e um teste contra o acaso (p por permutação,
  `src/utils/stats.js`). Quando não chega, a app diz "não se distingue do acaso"
  ou "ainda há poucos dados". As correlações nunca se ordenam pelas mais fortes.
- **Nunca inventar mg:** os mg por dia só existem com pesagens reais.

### Início — registar
- **Consumos** (hora, substância, notas) e **pesagens** da balança. Os mg por
  consumo/dia calculam-se entre pesagens; dias com só parte medida aparecem
  como "≥ X mg"; períodos "não sei se pesei" ficam sem mg.
- **Sono** (hora de deitar, horas dormidas, "não dormi"). O ciclo conta para o
  dia em que se acorda.
- **Bem-estar** em dois toques (humor e energia — "Botões" ou "Quadrado") e,
  em "mais detalhes", água, comida, sesta, social, sintomas, notas.
- **Emoções**, **reflexões** e **pensamentos**.
- **Surfar o impulso:** ao registar um consumo, se uma meta for ultrapassada,
  aparecem exercícios para adiar (timer de 15 min, respiração, ancorar…), com
  "Registar agora" sempre à mão. O momento fica guardado logo ao abrir o
  primeiro exercício.
- Registo de consumos passados (não abre o impulso) e marcação de dias
  "não registei" / atípicos (ficam fora das análises).

### Padrões
- **Dashboard:** total, média por dia (só dias com registos), intervalo médio,
  "esta semana", tendência, **Sinais de hoje**, mapa de calor, evolução da
  frequência, metas.
- **Sinais de hoje:** junta sono, humor, energia, autocuidado, craving e
  emoções dos últimos dias. A app verifica nos dias passados da própria pessoa
  se essa soma acompanhou o número de consumos (Spearman + p por deslocamento
  circular). Se não acompanhou, diz que não se distingue do acaso e não arrisca.
- **Comparar** (este período vs o anterior), **Temporal** e **Estrutural**
  (horas do dia, intervalos, dose).

### Análises (períodos Hoje · Semana · Mês · Tudo)
- **Correlações:** uma pergunta de cada vez (ex.: "sono → consumo do dia
  seguinte"), com n, r e p. Mínimo de 20 dias; só pares de dias seguidos.
- **Estado:** bem-estar, emoções, dia da semana, exercício, sintomas e o
  cartão do Surfar o impulso.
- **Impacto:** humor e energia à volta de um consumo (2h antes → 4h depois),
  com "de N registos" e "pode ser acaso" debaixo de cada número; "Antes de
  consumir" compara os 2 dias antes de dias com e sem consumo ("X de Y dias").
- **Reflexão Geral:** resumo em texto de tudo, escrito por regras (sem IA, nada sai do telemóvel), com as mesmas regras de "não sei".

### Metas (escolhidas pela pessoa)
Reduzir frequência · reduzir mg · aumentar intervalo · primeiro consumo não
antes de · limitar o último consumo · horas de sono · deitar antes de.
Cada meta conta só desde o dia em que foi criada.

### Histórico
Registos agrupados por dia (consumos, ciclos, reflexões…), pesquisa e filtros,
total de mg por dia.

### Config
Modo de dados, PIN e bloqueio, **disfarce** (abre como calculadora),
**lembretes push**, temas (Riso por defeito e outros), idioma PT/EN,
exportação, substâncias. **Modo demo** com dados realistas, sem conta.

---

## Como a app evoluiu

**Fase 1 — Tracker simples**
Nascia como um diário de consumos de NEP: registo de mg, hora, notas. Local, sem cloud.

**Fase 2 — Local-First + Encriptação**
Migração para arquitectura local-first com IndexedDB. Encriptação AES-256-GCM client-side. Firebase só guarda blobs encriptados — zero-knowledge.

**Fase 3 — Bem-estar e contexto**
Adição de ciclos de sono, bem-estar diário, emoções, reflexões. A ideia era perceber o contexto de cada consumo, não só o consumo em si.

**Fase 4 — Análises e correlações**
Motor de correlações de Pearson para detectar automaticamente padrões. Análise de sentimento das reflexões (em português). Coach tab com narrativa gerada a partir dos dados.

**Fase 5 — Metas, PWA e internacionalização**
Sistema de metas com acompanhamento diário. PWA instalável. Tradução completa para inglês (incluindo correlações, emoções, análises).

---

**Fase 6 — Honestidade estatística e redesenho (v6.5x → v7.x)**
Regra do elogio (cor e elogio só com meta), "a app tem de poder dizer não
sei" (mínimos de dados e p por permutação), mg só com pesagens reais,
"Sinais de hoje" verificados no histórico, Surfar o impulso com estatísticas,
bem-estar em dois toques, temas, Histórico agrupado por dia, menos caixas.

---

## Privacidade e Segurança

- **Encriptação AES-256-GCM** — todos os dados encriptados no dispositivo antes de saírem
- **PIN pessoal** — 4–6 dígitos, só o utilizador conhece; nunca enviado para nenhum servidor
- **PBKDF2** — derivação de chave com 100 000 iterações e salt único por utilizador
- **Local-First** — dados em IndexedDB, sincronizados com Firebase como backup encriptado
- **Zero-knowledge** — o Firebase guarda apenas `{ data: blob, iv: vector }`; ilegível sem o PIN
- **Anti-brute-force** — bloqueio progressivo após tentativas falhadas
- **Bloqueio configurável** — por defeito o PIN não persiste entre sessões; no modo opcional "nunca bloquear" fica guardado localmente no próprio dispositivo (nunca num servidor) para conveniência
- **Sem tracking comercial** — sem analytics, sem telemetria, sem venda de dados. (Os agregados anónimos de investigação são opcionais, só com consentimento explícito, e nunca incluem texto — ver `researchService.js`.)

---

## Tecnologias

- **React 19** + **Vite** + **TailwindCSS**
- **Firebase 10** (Firestore) — sync na cloud
- **IndexedDB via Dexie.js** — storage local
- **Web Crypto API** — encriptação AES-256-GCM + PBKDF2
- **i18next** — internacionalização PT/EN
- **Recharts** — gráficos
- **PWA** — instalável no telemóvel, funciona offline

---

## Estrutura do código

```
src/
├── components/
│   ├── modals/          # Modais (consumo, ciclo, emoções, reflexão, urge surfing…)
│   └── ui/              # Componentes reutilizáveis
├── constants/
│   └── emotions.js      # Lista de emoções (PT/EN)
├── contexts/
│   ├── AuthContext.jsx        # PIN, autenticação, bloqueio
│   ├── DataContext.jsx        # Dados da app
│   └── LocalDataContext.jsx   # IndexedDB + encriptação
├── db/
│   └── localDB.js             # Schema Dexie
├── services/
│   ├── analyticsService.js    # Correlações, metas, estatísticas
│   └── syncService.js         # Sync incremental Firebase
├── utils/
│   ├── encryption.js          # AES-256-GCM
│   ├── helpers.js             # Datas, fusos horários (getTodayKey, safeToISODate)
│   ├── stats.js               # Spearman/permutação: "não se distingue do acaso"
│   ├── sentimentAnalysis.js   # Análise de sentimento em PT
│   └── userStats.js           # Stats pré-calculadas (boot rápido)
├── views/
│   ├── HomeViewRefactored.jsx
│   ├── HistoryView.jsx
│   ├── PatternsView.jsx
│   ├── SettingsView.jsx
│   └── AnalysesView.jsx
│       analyses/
│       ├── AnalysesCoachTab.jsx       # General Reflections
│       ├── AnalysesCorrelacoesTab.jsx # Correlações
│       ├── AnalysesEstadoTab.jsx      # Bem-estar e gatilhos
│       └── AnalysesImpactoTab.jsx     # Impacto no bem-estar
└── locales/
    ├── pt.json
    └── en.json
```

---

## Desenvolvimento local

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build para produção → docs/
```

Deploy via GitHub Actions (`main.yml`). Publicar = push **só** para os ramos de
produção (`claude/branch-naming-docs-CwjcE` e
`claude/user-experience-design-review-rmp9px`); ver CLAUDE.md.

---

## Variáveis de ambiente

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

*Esta aplicação é uma ferramenta de redução de danos. Não promove o consumo de substâncias.*
