# NEP APP - SNIPPETS PRONTOS PARA OTIMIZAÇÃO

## 1. ADICIONAR MEMOIZAÇÃO (IMPACTO: 60-70% CPU)

### 1.1 Memoizar getBadges()

```javascript
// SUBSTITUIR linhas 1010-1084 por:
const badges = useMemo(() => {
  const badges = [];

  // Long intervals badge (5 days with >2h intervals)
  if (consumptions.length >= 2) {
    const sorted = [...consumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    const intervalsByDate = {};
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
      if (diff >= 2) {
        intervalsByDate[sorted[i].date] = (intervalsByDate[sorted[i].date] || 0) + 1;
      }
    }
    const daysWithLongIntervals = Object.keys(intervalsByDate).length;
    if (daysWithLongIntervals >= 5) badges.push({ id: 'long_intervals_5', title: '5 Dias com Intervalos Saudáveis', description: daysWithLongIntervals + ' dias com intervalos >2h', icon: '⏱️', color: 'green' });
    if (daysWithLongIntervals >= 10) badges.push({ id: 'long_intervals_10', title: '10 Dias com Intervalos Saudáveis', description: daysWithLongIntervals + ' dias com intervalos >2h', icon: '🏆', color: 'green' });
  }

  // ... resto da lógica badges

  return badges;
}, [consumptions, wellbeingLogs, cycles, goals, reflections]);

// Depois substituir todas as chamadas a getBadges() por:
// {badges.map(badge => (...))}
```

### 1.2 Memoizar getTemporalCorrelations()

```javascript
// SUBSTITUIR linhas 1120-1185 por:
const temporalCorrelations = useMemo(() => {
  if (wellbeingLogs.length < 2 || consumptions.length < 2) return null;

  // ... resto da lógica (idêntico, apenas envolvido em useMemo)

  return {
    sleepLag1: { correlation: ..., dataPoints: ... },
    moodLag1: { correlation: ..., dataPoints: ... }
  };
}, [wellbeingLogs, consumptions]);
```

### 1.3 Memoizar getBidirectionalAnalysis()

```javascript
// SUBSTITUIR linhas 1187-1349 por:
const bidirectionalAnalysis = useMemo(() => {
  if (wellbeingLogs.length < 2 || consumptions.length < 2) return null;

  // ... resto da lógica (idêntico, apenas envolvido em useMemo)

  return {
    sameDay: { ... },
    nextDay: { ... },
    sleepToMood: { ... }
  };
}, [wellbeingLogs, consumptions]);
```

---

## 2. CONSOLIDAR FUNÇÕES DUPLICADAS (IMPACTO: 3-5 KB)

### Extrair getCorrelation() duplicada

```javascript
// ADICIONAR ANTES de linha 1010 (antes de getBadges):
const calculatePearsonCorrelation = (data, xKey, yKey) => {
  if (data.length < 2) return null;
  const n = data.length;
  const sumX = data.reduce((sum, d) => sum + d[xKey], 0);
  const sumY = data.reduce((sum, d) => sum + d[yKey], 0);
  const sumXY = data.reduce((sum, d) => sum + d[xKey] * d[yKey], 0);
  const sumX2 = data.reduce((sum, d) => sum + d[xKey] * d[xKey], 0);
  const sumY2 = data.reduce((sum, d) => sum + d[yKey] * d[yKey], 0);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return denominator === 0 ? null : numerator / denominator;
};

// REMOVER linhas 1162-1173 (primeira getCorrelation)
// REMOVER linhas 1215-1226 (segunda getCorrelation)
// REMOVER linhas 1215-1226 novamente (terceira getCorrelation)

// SUBSTITUIR todos os usos de getCorrelation por calculatePearsonCorrelation:
// Linha 1177: getCorrelation(sleepLag1Data, 'yesterdaySleep', 'todayConsumptions')
// → calculatePearsonCorrelation(sleepLag1Data, 'yesterdaySleep', 'todayConsumptions')

// E em getBidirectionalAnalysis():
// Linha 1312: correlation: getCorrelation(consumptionToSleepSameDay, ...)
// → correlation: calculatePearsonCorrelation(consumptionToSleepSameDay, ...)
```

---

## 3. EXTRAIR HELPER FUNCTIONS (IMPACTO: Legibilidade)

### Consolidar funções de data

```javascript
// ADICIONAR ANTES de linha 75 (antes de getTodayKey):

// Date helpers
const getTodayKey = () => new Date().toISOString().split('T')[0];

const getLast7Days = (excludeToday = true) => {
  return [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + (excludeToday ? 1 : 0)));
    return d.toISOString().split('T')[0];
  });
};

const getLast30Days = (excludeToday = true) => {
  return [...Array(30)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + (excludeToday ? 1 : 0)));
    return d.toISOString().split('T')[0];
  });
};

// SUBSTITUIR todas as linhas 643-647, 668-671, 973, 1046, 1060 por:
const last7Dates = getLast7Days();
// etc.
```

---

## 4. REMOVER BABEL STANDALONE (IMPACTO: 95 KB)

### Converter JSX para React.createElement()

```javascript
// REMOVER linha 9:
// <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

// SUBSTITUIR tipo de script na linha 34:
// <script type="text/babel">
// por:
// <script type="text/javascript">

// CONVERTER JSX para React.createElement():
// ANTES:
// <div className="min-h-screen">
//   <h1>Title</h1>
// </div>

// DEPOIS:
// React.createElement('div', { className: 'min-h-screen' },
//   React.createElement('h1', null, 'Title')
// )

// Usar ferramenta online para converter: https://transform.tools/jsx-to-react-createElement
```

---

## 5. SEPARAR ESTADOS EM CONTEXTOS (IMPACTO: 40-50% re-renders)

### Criar DataContext

```javascript
// ADICIONAR DEPOIS de linha 76 (genId):

// Firebase Data Context
const DataContext = React.createContext();

function DataProvider({ children }) {
  const [consumptions, setConsumptions] = React.useState([]);
  const [dailyLogs, setDailyLogs] = React.useState([]);
  const [wellbeingLogs, setWellbeingLogs] = React.useState([]);
  const [reflections, setReflections] = React.useState([]);
  const [cycles, setCycles] = React.useState([]);
  const [goals, setGoals] = React.useState([]);

  const value = {
    consumptions, setConsumptions,
    dailyLogs, setDailyLogs,
    wellbeingLogs, setWellbeingLogs,
    reflections, setReflections,
    cycles, setCycles,
    goals, setGoals
  };

  return React.createElement(DataContext.Provider, { value }, children);
}

function useData() {
  const context = React.useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de DataProvider');
  }
  return context;
}
```

### Criar UIContext

```javascript
// ADICIONAR DEPOIS de DataProvider:

// UI State Context
const UIContext = React.createContext();

function UIProvider({ children }) {
  const [currentView, setCurrentView] = React.useState('home');
  const [showDailyLogModal, setShowDailyLogModal] = React.useState(false);
  const [showWellbeingModal, setShowWellbeingModal] = React.useState(false);
  const [showReflectionModal, setShowReflectionModal] = React.useState(false);
  const [showCycleModal, setShowCycleModal] = React.useState(false);
  const [showGoalModal, setShowGoalModal] = React.useState(false);
  const [showEditConsumptionModal, setShowEditConsumptionModal] = React.useState(false);
  
  const value = {
    currentView, setCurrentView,
    showDailyLogModal, setShowDailyLogModal,
    showWellbeingModal, setShowWellbeingModal,
    showReflectionModal, setShowReflectionModal,
    showCycleModal, setShowCycleModal,
    showGoalModal, setShowGoalModal,
    showEditConsumptionModal, setShowEditConsumptionModal
  };

  return React.createElement(UIContext.Provider, { value }, children);
}

function useUI() {
  const context = React.useContext(UIContext);
  if (!context) {
    throw new Error('useUI deve ser usado dentro de UIProvider');
  }
  return context;
}
```

### Atualizar renderização principal

```javascript
// SUBSTITUIR a renderização final (linha 5681-5684) por:
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(DataProvider, null,
    React.createElement(UIProvider, null,
      React.createElement(HarmReductionTracker, null)
    )
  )
);
```

---

## 6. OTIMIZAR FIREBASE LISTENERS (IMPACTO: 30-40%)

### Adicionar debouncing

```javascript
// SUBSTITUIR linha 352 por:

useEffect(() => {
  if (!user || !db) return;
  
  const { collection, onSnapshot } = window.firebaseModules;
  
  // Usar useTransition para batching
  const [isPending, startTransition] = React.useTransition?.() || [false, (cb) => cb()];
  
  const unsubs = [
    onSnapshot(
      collection(db, `users/${user.uid}/consumptions`),
      snap => {
        startTransition(() => {
          setConsumptions(
            snap.docs
              .map(d => d.data())
              .sort((a,b) => b.timestamp.localeCompare(a.timestamp))
          );
        });
      }
    ),
    // ... resto dos listeners
  ];
  
  return () => unsubs.forEach(u => u());
}, [user, db]);
```

---

## 7. REMOVER CÓDIGO MORTO

### Estados não utilizados

```javascript
// REMOVER linhas 150:
// const [currentCycleId, setCurrentCycleId] = useState(null);

// REMOVER linhas 161-162 (simplificar para um state):
// const [patternView, setPatternView] = useState('dashboard');
// const [patternsSubView, setPatternsSubView] = useState('temporal');

// SUBSTITUIR por:
const [patternView, setPatternView] = useState('dashboard');
const [patternsSubView, setPatternsSubView] = useState('temporal');
// Manter mas apenas para padrões, não para outras views
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

```markdown
### Fase 1 - Memoização (2 horas)
- [ ] Adicionar useMemo a getBadges()
- [ ] Adicionar useMemo a getTemporalCorrelations()
- [ ] Adicionar useMemo a getBidirectionalAnalysis()
- [ ] Testar com React DevTools Profiler
- [ ] Verificar redução de re-renders

### Fase 1 - Consolidação (1 hora)
- [ ] Extrair calculatePearsonCorrelation()
- [ ] Remover funções getCorrelation() duplicadas
- [ ] Testar que correlações ainda funcionam

### Fase 1 - Helpers (1 hora)
- [ ] Extrair date helpers (getLast7Days, getLast30Days)
- [ ] Consolidar getTodayKey usage
- [ ] Remover código morto

### Fase 1 - Bundle (3 horas)
- [ ] Remover Babel Standalone
- [ ] Converter JSX para React.createElement()
- [ ] Testar que app ainda funciona
- [ ] Verificar redução de 95 KB

### Fase 2 - Contextos (4 horas)
- [ ] Criar DataProvider
- [ ] Criar UIProvider
- [ ] Mover states para contextos
- [ ] Atualizar HarmReductionTracker
- [ ] Testar com Redux DevTools

### Fase 2 - Componentes (6 horas)
- [ ] Extrair DailyLogModal como componente
- [ ] Extrair WellbeingModal como componente
- [ ] Extrair ReflectionModal como componente
- [ ] Extrair CycleModal como componente
- [ ] Testar modais

### Fase 2 - Firebase (2 horas)
- [ ] Adicionar useTransition para batching
- [ ] Adicionar debouncing se necessário
- [ ] Testar sincronização
```

---

## FERRAMENTAS ÚTEIS

1. **Converter JSX para createElement:** https://transform.tools/jsx-to-react-createElement
2. **React DevTools Profiler:** chrome://extensions → React Developer Tools
3. **Lighthouse:** DevTools → Lighthouse
4. **Bundle Analyzer:** `npm install -g webpack-bundle-analyzer`
5. **Code Splitting:** https://vitejs.dev/

---

**Nota:** Implementar nesta ordem garante máximo impacto com mínimo risco!

