# NEP App - N-Ethylpentedrone Harm Reduction Tracker

> **Aplicação web para acompanhamento de redução de danos no consumo de N-Ethylpentedrone (catinona sintética)**

Versão atual: **v1.3.0**

## 🔒 Segurança e Privacidade

- **🔐 Encriptação AES-256-GCM** - Todos os dados são encriptados client-side
- **🔑 PIN pessoal** - Cada utilizador tem um PIN único (4-6 dígitos)
- **🧂 Salt único** - Derivação de chave com salt individual por utilizador
- **📱 Local-First** - Dados guardados localmente (IndexedDB) e sincronizados com Firebase
- **🚀 Sync Incremental** - Sincronização ultra-rápida (~500ms sem mudanças)

## 🚀 Como Usar

### Desenvolvimento Local

```bash
# 1. Instalar dependências (primeira vez)
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Abrir no browser
# http://localhost:5173
```

### Build para Produção

```bash
# Criar build otimizado
npm run build

# Preview do build
npm run preview
```

### Deploy

A app está configurada para deploy automático via GitHub Actions:
- Push para branches `claude/**` → build e deploy automático
- Requer Firebase configurado (`.env` ou secrets do GitHub)

## 📁 Estrutura do Projeto

```
nep-app/
├── src/
│   ├── components/          # Componentes React
│   │   ├── modals/         # Modais (Cycle, Consumption, etc)
│   │   └── ui/             # Componentes UI reutilizáveis
│   ├── contexts/           # React Contexts
│   │   ├── AuthContext.jsx        # Autenticação e PIN
│   │   ├── DataContext.jsx        # Gestão de dados
│   │   └── LocalDataContext.jsx   # IndexedDB + Encryption
│   ├── services/           # Serviços
│   │   ├── syncService.js         # Sync com Firebase
│   │   └── analyticsService.js    # Análises e estatísticas
│   ├── utils/              # Utilitários
│   │   ├── encryption.js          # AES-256-GCM
│   │   ├── userStats.js           # Stats pré-calculadas
│   │   └── firebase.js            # Config Firebase
│   ├── db/                 # IndexedDB
│   │   └── localDB.js
│   ├── views/              # Views principais
│   │   ├── HomeViewRefactored.jsx
│   │   ├── HistoryView.jsx
│   │   ├── PatternsView.jsx
│   │   └── AnalysesView.jsx
│   └── App.jsx             # Componente principal
├── public/                 # Assets estáticos
├── .github/workflows/      # CI/CD
└── package.json
```

## 🔧 Tecnologias

### Core
- **React 18** - UI framework
- **Vite 5** - Build tool e dev server
- **TailwindCSS** - Styling

### Backend & Storage
- **Firebase 10** - Authentication, Firestore
- **IndexedDB (Dexie.js)** - Storage local
- **Web Crypto API** - Encriptação AES-256-GCM

### Features Principais
- Local-First Architecture
- End-to-End Encryption
- Sync incremental com timestamps exatos
- PWA (Progressive Web App)
- Dark mode permanente

## 📊 Funcionalidades

### Tracking
- ✅ Consumos (mg, timestamp, notas)
- ✅ Ciclos (sono, bedtime, triggers)
- ✅ Daily Logs (consumo diário total)
- ✅ Wellbeing (humor, energia, sono)
- ✅ Reflexões e pensamentos
- ✅ Metas de redução de danos

### Análises
- 📈 Padrões de consumo
- 🔄 Correlações (consumo vs wellbeing)
- 📊 Estatísticas (streak, intervalos, dosagens)
- 🎯 Progresso de metas
- 🏆 Badges de conquistas

### Avisos Inteligentes
- ⚠️ Intervalo curto entre consumos
- 😴 Sono insuficiente
- 📊 Dosagem acima da meta
- 🌃 Bedtime tardio
- ⏰ Último consumo após meia-noite

## 🔐 Sistema de Encriptação

1. **PIN** → deriva chave AES-256 com PBKDF2 (100k iterações)
2. **Salt único** por utilizador (guardado no Firebase)
3. **Dados encriptados** client-side antes de enviar para Firebase
4. **Firestore** guarda apenas blobs encriptados (campo `data` + `iv`)
5. **Desencriptação** apenas local, com PIN do utilizador

**Ninguém pode ler os teus dados sem o teu PIN!** (nem o admin do Firebase)

## 🚀 Performance

- **Boot inicial:** <500ms (stats do cache)
- **Sync sem mudanças:** ~500ms (84x mais rápido que antes)
- **Sync com 5 mudanças:** ~800ms
- **App pronta:** 3 fases progressivas (instantânea → lista → todos os dados)

## 📝 Variáveis de Ambiente

Cria `.env` na raiz:

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

## 🔄 Changelog

### v1.3.0 (Atual)
- ✅ Sync incremental com timestamps exatos
- ✅ Stats pré-calculadas para boot ultra-rápido
- ✅ Avisos atualizam automaticamente
- ✅ Editar ciclos no histórico
- ✅ Auto-fill data/hora atual em novos ciclos
- ✅ Fix: Sleep input aceita qualquer decimal (step="any")
- ✅ Fix: DailyLogs mostram data correta

### v1.2.0
- Salt utilities consolidation
- Re-encrypt data when PIN changes

### v1.1.0
- Local-First architecture
- AES-256-GCM encryption
- PWA support

## 📜 Licença

Ver [LICENSE.md](LICENSE.md)

## 🛡️ Segurança

Ver [SECURITY.md](SECURITY.md) para política de segurança e como reportar vulnerabilidades.

## ⚖️ Ética e Governança

Ver [ETHICAL_GOVERNANCE.md](ETHICAL_GOVERNANCE.md) para princípios de redução de danos.

---

**⚠️ NOTA IMPORTANTE:**
Esta aplicação é uma ferramenta de **redução de danos**, não promove o consumo de substâncias. O objetivo é ajudar utilizadores a monitorizar e reduzir o consumo de forma consciente e segura.
