# NEP App - N-Ethylpentedrone Harm Reduction Tracker

> **Web application for harm reduction tracking of N-Ethylpentedrone (synthetic cathinone) consumption**

Current version: **v1.3.0**

[🇵🇹 Versão Portuguesa](README.md)

## 🔒 Security and Privacy

- **🔐 AES-256-GCM Encryption** - All data encrypted client-side
- **🔑 Personal PIN** - Each user has a unique PIN (4-6 digits)
- **🧂 Unique Salt** - Key derivation with individual salt per user
- **📱 Local-First** - Data stored locally (IndexedDB) and synced with Firebase
- **🚀 Incremental Sync** - Ultra-fast synchronization (~500ms with no changes)

## 🚀 How to Use

### Local Development

```bash
# 1. Install dependencies (first time)
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
# http://localhost:5173
```

### Production Build

```bash
# Create optimized build
npm run build

# Preview build
npm run preview
```

### Deploy

The app is configured for automatic deployment via GitHub Actions:
- Push to `claude/**` branches → automatic build and deploy
- Requires configured Firebase (`.env` or GitHub secrets)

## 📁 Project Structure

```
nep-app/
├── src/
│   ├── components/          # React components
│   │   ├── modals/         # Modals (Cycle, Consumption, etc)
│   │   └── ui/             # Reusable UI components
│   ├── contexts/           # React Contexts
│   │   ├── AuthContext.jsx        # Authentication and PIN
│   │   ├── DataContext.jsx        # Data management
│   │   └── LocalDataContext.jsx   # IndexedDB + Encryption
│   ├── services/           # Services
│   │   ├── syncService.js         # Firebase sync
│   │   └── analyticsService.js    # Analytics and statistics
│   ├── utils/              # Utilities
│   │   ├── encryption.js          # AES-256-GCM
│   │   ├── userStats.js           # Pre-calculated stats
│   │   └── firebase.js            # Firebase config
│   ├── db/                 # IndexedDB
│   │   └── localDB.js
│   ├── views/              # Main views
│   │   ├── HomeViewRefactored.jsx
│   │   ├── HistoryView.jsx
│   │   ├── PatternsView.jsx
│   │   └── AnalysesView.jsx
│   └── App.jsx             # Main component
├── public/                 # Static assets
├── .github/workflows/      # CI/CD
└── package.json
```

## 🔧 Technologies

### Core
- **React 18** - UI framework
- **Vite 5** - Build tool and dev server
- **TailwindCSS** - Styling

### Backend & Storage
- **Firebase 10** - Authentication, Firestore
- **IndexedDB (Dexie.js)** - Local storage
- **Web Crypto API** - AES-256-GCM encryption

### Main Features
- Local-First Architecture
- End-to-End Encryption
- Incremental sync with exact timestamps
- PWA (Progressive Web App)
- Permanent dark mode

## 📊 Features

### Tracking
- ✅ Consumptions (mg, timestamp, notes)
- ✅ Cycles (sleep, bedtime, triggers)
- ✅ Daily Logs (total daily consumption)
- ✅ Wellbeing (mood, energy, sleep)
- ✅ Reflections and thoughts
- ✅ Harm reduction goals

### Analytics
- 📈 Consumption patterns
- 🔄 Correlations (consumption vs wellbeing)
- 📊 Statistics (streak, intervals, dosages)
- 🎯 Goal progress
- 🏆 Achievement badges

### Intelligent Alerts
- ⚠️ Short interval between consumptions
- 😴 Insufficient sleep
- 📊 Dosage above target
- 🌃 Late bedtime
- ⏰ Last consumption after midnight

## 🔐 Encryption System

1. **PIN** → derives AES-256 key with PBKDF2 (100k iterations)
2. **Unique salt** per user (stored in Firebase)
3. **Encrypted data** client-side before sending to Firebase
4. **Firestore** stores only encrypted blobs (`data` + `iv` fields)
5. **Decryption** only locally, with user's PIN

**No one can read your data without your PIN!** (not even Firebase admin)

## 🚀 Performance

- **Initial boot:** <500ms (stats from cache)
- **Sync with no changes:** ~500ms (84x faster than before)
- **Sync with 5 changes:** ~800ms
- **App ready:** 3 progressive phases (instant → list → all data)

## 📝 Environment Variables

Create `.env` in root:

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

## 🔄 Changelog

### v1.3.0 (Current)
- ✅ Incremental sync with exact timestamps
- ✅ Pre-calculated stats for ultra-fast boot
- ✅ Auto-updating alerts
- ✅ Edit cycles in history
- ✅ Auto-fill current date/time in new cycles
- ✅ Fix: Sleep input accepts any decimal (step="any")
- ✅ Fix: DailyLogs show correct date

### v1.2.0
- Salt utilities consolidation
- Re-encrypt data when PIN changes

### v1.1.0
- Local-First architecture
- AES-256-GCM encryption
- PWA support

## 📜 License

See [LICENSE.md](LICENSE.md)

## 🛡️ Security

See [SECURITY.md](SECURITY.md) for security policy and how to report vulnerabilities.

## ⚖️ Ethics and Governance

See [ETHICAL_GOVERNANCE.md](ETHICAL_GOVERNANCE.md) for harm reduction principles.

---

**⚠️ IMPORTANT NOTE:**
This application is a **harm reduction** tool, it does not promote substance use. The goal is to help users monitor and reduce consumption in a conscious and safe manner.
