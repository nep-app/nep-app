# Arquitetura e Mapeamento do Projeto (nep-app)

> Documento de referência para localização de componentes, contextos, serviços e utilitários.

---

## Estrutura de Pastas e Componentes

### Topo (`src/`)
* `src/main.jsx` — Entry point; monta a árvore normal ou a árvore de demo (isolada). Injeta `__APP_VERSION__`. `checkForUpdates()` limpa caches ao mudar a versão.
* `src/App.jsx` — Componente raiz (~1300 linhas): navegação, modais, atalhos PWA (`?action=`), gate do modo disfarce.
* `src/i18n.js` — Configuração i18next.
* `vite.config.js` — Build para `/docs`, PWA (workbox), injeção de versão + VAPID, `manualChunks`.

### Vistas principais (`src/views/`)
* `HomeViewRefactored.jsx` — Ecrã Início (registos rápidos, alertas de metas, modal de repensar consumo).
* `PatternsView.jsx` — Ecrã Padrões (~2800 linhas, god component — mexer com cuidado).
* `AnalysesView.jsx` — Ecrã Análises (monta apenas a sub-tab ativa em `src/views/analyses/`: `Correlacoes`, `Coach`, `Estado`, `Impacto`).
* `HistoryView.jsx` — Ecrã Histórico (paginado + memoizado). Inclui gestão de pesagens.
* `SettingsView.jsx` — Definições (Notificações, Dados, Segurança/Disfarce, Conta, Legal).

### Contextos (`src/contexts/`)
* `AuthContext.jsx` — PIN, autenticação, `changePin` (atómico), auto-lock, salt.
* `DataContext.jsx` — Singleton Firebase, operantes CRUD com push debounced (`schedulePush`).
* `LocalDataContext.jsx` — Carregamento em FASES (FASE 1: Metas e ciclos recentes).
* `MetricsContext.jsx` — Métricas derivadas, rollup por dia e `dailySummary` persistidos.
* `UIContext.jsx` / `DemoDataContext.jsx` — Estado de UI e dados simulados para demo.

### Serviços, Base de Dados e Utilitários (`src/services/`, `src/db/`, `src/utils/`)
* `src/services/syncService.js` — Push/pull encriptado com Firestore.
* `src/services/exportService.js` — Backup e reimportação em JSON.
* `src/db/localDB.js` — BD Dexie/IndexedDB (`NEPDatabase`).
* `src/utils/encryption.js` & `dexieEncryption.js` — Criptografia AES-256-GCM + PBKDF2 (100k iterações) por item.
* `src/utils/helpers.js` — Gestão de datas locais (`getTodayKey`, `safeToISODate`).
* `src/utils/mgDerivation.js` — Algoritmo de distribuição de mg medidas entre ciclos de pesagem.
* `src/utils/urgeLog.js` — Registo local de eventos do "Surfar o Impulso".
