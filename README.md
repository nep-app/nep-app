# NEP.app — Harm Reduction Tracker

> **Aplicação web de acompanhamento e redução de danos no consumo de substâncias psicoativas**

Versão atual: **v4.6.0**

A app é agnóstica à substância — funciona para qualquer substância que o utilizador queira monitorizar (estimulantes, dissociativos, empatogénios, etc.). O objetivo é ajudar a consumir de forma mais consciente e reduzir gradualmente, ao ritmo de cada pessoa.

---

## 🛡️ O que a app faz

### Registo diário
- Consumos com dosagem (mg), hora e notas
- Ciclos: hora de deitar, horas de sono, gatilhos (triggers)
- Bem-estar: humor, energia, água, alimentação, descanso, vida social
- Emoções (categorizadas como positivas/negativas)
- Reflexões e pensamentos livres

### Análises e padrões
- Correlações entre sono/bem-estar e consumo
- Fatores de risco identificados automaticamente
- Análise de sentimento das reflexões e pensamentos
- Impacto do consumo no bem-estar ao longo do tempo
- Estatísticas: streak, intervalos, dosagens, primeiro/último consumo

### Metas de redução de danos
- Limitar frequência semanal
- Reduzir dosagem total
- Aumentar intervalo entre consumos
- Definir hora máxima para último consumo
- Definir hora mínima para primeiro consumo
- Metas de sono (horas e hora de deitar)

### Avisos inteligentes
- Intervalo curto entre consumos
- Dosagem acima da meta
- Sono insuficiente
- Bedtime tardio
- Último consumo após meia-noite

### Outras funcionalidades
- Exercícios guiados para gerir impulso de consumo (urge surfing)
- Fichas educativas de harm reduction
- Badges de conquistas
- Relatório de gaps (dias com dados em falta)
- Suporte a português e inglês

---

## 🔒 Privacidade e Segurança

- **Encriptação AES-256-GCM** — todos os dados encriptados no dispositivo
- **PIN pessoal** — 4–6 dígitos, só o utilizador conhece
- **Local-First** — dados guardados em IndexedDB, sincronizados com Firebase
- **Zero-knowledge** — o Firebase guarda apenas blobs encriptados; ninguém consegue ler sem o PIN
- **Proteção anti-brute-force** — bloqueio após tentativas falhadas
- **PIN em sessionStorage** — não persiste entre sessões do browser

---

## 🚀 Como Usar

### Desenvolvimento local

```bash
npm install
npm run dev
# http://localhost:5173
```

### Build para produção

```bash
npm run build
npm run preview
```

### Deploy

Deploy automático via GitHub Actions em push para branches `claude/**`. Requer Firebase configurado.

---

## 🔧 Tecnologias

- **React 18** + **Vite 5** + **TailwindCSS**
- **Firebase 10** (Firestore) — sync na cloud
- **IndexedDB via Dexie.js** — storage local
- **Web Crypto API** — encriptação AES-256-GCM + PBKDF2
- **i18next** — internacionalização (PT/EN)
- **Recharts** — gráficos
- **PWA** — instalável no telemóvel, funciona offline

---

## 📁 Estrutura

```
src/
├── components/
│   ├── modals/       # Modais (consumo, ciclo, emoções, etc.)
│   └── ui/           # Componentes reutilizáveis
├── contexts/
│   ├── AuthContext.jsx        # PIN e autenticação
│   ├── DataContext.jsx        # Dados da app
│   └── LocalDataContext.jsx   # IndexedDB + encriptação
├── services/
│   ├── analyticsService.js    # Análises e metas
│   └── syncService.js         # Sync Firebase
├── utils/
│   ├── encryption.js          # AES-256-GCM
│   ├── userStats.js           # Stats e avisos pré-calculados
│   └── sentimentAnalysis.js   # Análise de sentimento PT
├── views/
│   ├── HomeViewRefactored.jsx
│   ├── HistoryView.jsx
│   ├── PatternsView.jsx
│   └── AnalysesView.jsx (+ tabs)
└── locales/
    ├── pt.json
    └── en.json
```

---

## 🔐 Encriptação

1. PIN → chave AES-256 derivada com PBKDF2 (100k iterações) + salt único por utilizador
2. Dados encriptados client-side antes de sair do dispositivo
3. Firebase guarda apenas `{ data: blob, iv: vector }` — ilegível sem o PIN
4. Desencriptação só acontece localmente

---

## 🔄 Changelog

### v4.6.0 (Atual)
- Tradução completa para inglês (emoções, gaps, fatores de risco, alertas, correlações)
- Correção dos denominadores de todas as metas no dashboard
- Correção da análise de sentimento (negação em frases positivas)
- Simplificação da explicação de correlações
- Modo demo com dados realistas (sem registo necessário)

### v4.x
- Exercícios guiados para gerir impulso de consumo
- Fichas educativas de harm reduction
- Mais perguntas de reflexão DBT + rotação diária
- Recorde de streak
- Data de primeiro uso editável nas definições
- Cartão semanal com círculos de progresso das metas
- Segurança: brute-force lockout, PIN em sessionStorage, sanitização de inputs
- Sync incremental com timestamps exatos (84x mais rápido)
- Stats pré-calculadas para boot ultra-rápido
- PWA com suporte offline
- Arquitetura Local-First + encriptação AES-256-GCM

---

## 📝 Variáveis de Ambiente

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

---

**Esta aplicação é uma ferramenta de redução de danos. Não promove o consumo de substâncias.**
