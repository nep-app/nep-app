# NEP.app — Harm Reduction Tracker

> Aplicação web de redução de danos para consumo de substâncias psicoativas

<!-- Fonte única da versão: package.json. Atualizar lá; este número deve acompanhar. -->
**Versão actual: v6.11.2**

A app começou como um tracker simples e evoluiu para uma plataforma completa de redução de danos — agnóstica à substância, que funciona para estimulantes, dissociativos, empatogénios ou qualquer outra substância que o utilizador queira monitorizar.

O objectivo não é julgar. É ajudar a consumir de forma mais consciente, identificar padrões, perceber o impacto no bem-estar e reduzir gradualmente ao ritmo de cada pessoa.

---

## O que a app faz hoje

### Registo diário
- Consumos individuais com dosagem (mg), hora e notas
- Ciclos de sono: hora de deitar, horas dormidas, gatilhos (triggers)
- Bem-estar diário: humor, energia, água, alimentação, descanso, vida social
- Emoções (lista curada com categorização positiva/negativa)
- Reflexões livres e pensamentos (análise de sentimento automática)
- Registo diário agregado (mg total do dia)

### Análises e padrões
Quatro tabs de análise distintas:

**Correlações** — Descobre automaticamente relações entre variáveis: como o sono afecta o consumo, se deitar tarde aumenta o uso, como as emoções se correlacionam com a dosagem, padrões temporais ao longo do dia, etc.

**Estado** — Análise de bem-estar, gatilhos de risco (emoções que precedem mais consumo), impacto do exercício, sintomas físicos, análise do dia da semana.

**Impacto** — Como o consumo afecta o bem-estar ao longo do tempo. Comparação antes/depois de eventos marcantes.

**General Reflections (Coach)** — Análise narrativa que junta tudo: tendências de frequência e dosagem, padrões de autocuidado, análise de sentimento das reflexões, progresso nas metas, correlações sono-humor, clusters de dias difíceis vs. fáceis.

### Padrões
- Gráfico de frequência ao longo do tempo
- Evolução semanal da dosagem
- Análise de intervalos entre consumos
- Ciclo mensal
- Previsão do dia de hoje (baseada nos últimos 3 dias)
- Comparação entre períodos (esta semana vs. semana passada, etc.)
- Análise estrutural: dosagem, intervalos, distribuição por hora do dia

### Metas de redução de danos
- Reduzir frequência (máx. X usos/dia)
- Reduzir dosagem total (máx. X mg/dia)
- Aumentar intervalo mínimo entre consumos
- Limitar hora do último consumo (antes da meia-noite)
- Adiar o primeiro consumo após acordar
- Horas de sono mínimas
- Hora de deitar máxima

Cada meta é avaliada só desde o dia em que foi criada — não contra todo o histórico.

### Avisos inteligentes
- Intervalo demasiado curto entre consumos
- Dosagem acima da meta
- Sono insuficiente
- Hora de deitar muito tarde
- Último consumo após meia-noite

### Outras funcionalidades
- Urge Surfing — exercícios guiados para gerir impulso de consumo (baseados em DBT)
- Fichas educativas de harm reduction
- Badges de conquistas (streak, metas cumpridas, etc.)
- Relatório de gaps (dias com dados em falta)
- Histórico pesquisável e filtrável
- Modo demo com dados realistas (sem registo necessário)
- Português e inglês

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
│   ├── helpers.js             # Datas, fusos horários
│   ├── sentimentAnalysis.js   # Análise de sentimento em PT
│   └── userStats.js           # Stats pré-calculadas (boot rápido)
├── views/
│   ├── HomeViewRefactored.jsx
│   ├── HistoryView.jsx
│   ├── PatternsView.jsx
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

Deploy automático via GitHub Actions em push para branches `claude/**`.

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
