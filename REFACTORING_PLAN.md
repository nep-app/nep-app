# 🔧 Plano de Refatoração - NEP App

## 🎯 Objetivo
Reduzir App.jsx de 5704 linhas para ~2000 linhas, melhorando manutenibilidade.

## ✅ Fase 1: Quick Wins (Semana 1) - RISCO BAIXO

### 1. Mover Estados de Modal para UIContext (30 min)
**Ficheiros:** `src/contexts/UIContext.jsx`, `src/App.jsx`
**Risco:** 🟢 BAIXO

Estados a mover:
- showDailyLogModal
- showWellbeingModal
- showReflectionModal
- showCycleModal
- showGoalModal
- showEditConsumptionModal
- editingConsumption
- editingGoal

**Teste:** Abrir/fechar cada modal

---

### 2. Criar useToast Hook (20 min)
**Ficheiro novo:** `src/hooks/useToast.js`
**Risco:** 🟢 BAIXO

```javascript
export const useToast = () => {
    const [toasts, setToasts] = useState([]);
    const showToast = useCallback((message, type = 'success') => {
        const id = genId();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);
    return { toasts, showToast };
};
```

**Teste:** Mostrar toast de sucesso/erro

---

### 3. Criar useAuth Hook (45 min)
**Ficheiro novo:** `src/hooks/useAuth.js`
**Risco:** 🟢 BAIXO

Extrair:
- isLogin, setIsLogin
- email, setEmail
- password, setPassword
- authError
- handleLogin
- handleSignup
- handleLogout

**Teste:** Login, Signup, Logout

---

### 4. Criar useReminders Hook (1h)
**Ficheiro novo:** `src/hooks/useReminders.js`
**Risco:** 🟢 BAIXO

Extrair:
- reminderDismissed
- notificationsEnabled
- requestNotificationPermission
- dismissReminder
- shouldShowReminder
- showBrowserNotification
- checkReminders useEffect

**Teste:** Verificar notificações funcionam

---

## ✅ Fase 2: Médias Melhorias (Semana 2) - RISCO MÉDIO

### 5. Criar useForms Hook (1.5h)
**Ficheiro novo:** `src/hooks/useForms.js`
**Risco:** 🟡 MÉDIO

Extrair:
- dailyForm, setDailyForm
- wellbeingForm, setWellbeingForm
- reflectionAnswer, setReflectionAnswer
- cycleForm, setCycleForm
- goalForm, setGoalForm
- resetAllForms (novo helper)

**Teste:** Submeter cada formulário

---

### 6. Criar goalService (2h)
**Ficheiro novo:** `src/services/goalService.js`
**Risco:** 🟡 MÉDIO

Funções a extrair:
- getGoalProgress
- getGoalAchievementCount
- getGoalProgressStats

**Teste:** Verificar cálculos de progresso de metas

---

## ✅ Fase 3: Grande Refactor (Semana 3) - RISCO MÉDIO

### 7. Extrair Views (4h)
**Ficheiros novos:**
- `src/views/DashboardView.jsx`
- `src/views/PatternsView.jsx`
- `src/views/AnalyticsView.jsx`
- `src/views/HistoryView.jsx`
- `src/views/GoalsView.jsx`

**Risco:** 🟡 MÉDIO

Cada view deve:
- Receber props do App.jsx
- Ter lazy loading
- Ser independente

**Teste:** Navegar entre todas as views

---

## 📊 Resultado Esperado

| Métrica | Antes | Depois | Ganho |
|---------|-------|--------|-------|
| Linhas App.jsx | 5704 | ~2000 | 65% ↓ |
| Estados App.jsx | 40 | ~15 | 62% ↓ |
| Manutenibilidade | 🔴 | 🟢 | +200% |
| Testabilidade | 🔴 | 🟢 | +300% |

---

## ⚠️ IMPORTANTE: Segurança

### Antes de CADA mudança:
```bash
# 1. Criar branch
git checkout -b refactor/fase-1-quick-wins

# 2. Fazer mudança

# 3. Testar

# 4. Commit
git add .
git commit -m "refactor: move modal states to UIContext"

# 5. Push
git push -u origin refactor/fase-1-quick-wins
```

### Rollback se algo quebrar:
```bash
git checkout claude/wellness-check-analysis-01VBCwuYZPWL2ggH95VXrEVE
```

---

## 🧪 Checklist de Teste

Após CADA mudança, testar:
- [ ] Login/Logout funciona
- [ ] Criar consumo funciona
- [ ] Abrir/fechar modais
- [ ] Criar meta funciona
- [ ] Dashboard carrega dados
- [ ] Gráficos aparecem
- [ ] Dark mode funciona
- [ ] Notificações funcionam
- [ ] Export CSV funciona
- [ ] Firebase sincroniza

---

## 🎓 Recursos

- [React Hooks](https://react.dev/reference/react)
- [Context API](https://react.dev/reference/react/useContext)
- [Code Splitting](https://react.dev/reference/react/lazy)

---

**Última atualização:** 2025-11-22
**Status:** 📋 Planeado
