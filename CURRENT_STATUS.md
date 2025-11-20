# NEP APP - STATUS ATUAL E PRÓXIMOS PASSOS

**Data:** 24 de Maio de 2024
**Status:** 🟡 Em Progresso (Fase 1 Concluída, Fase 2 Pendente)

## ✅ O QUE JÁ FOI FEITO (FASE 1 - OTIMIZAÇÃO DE CÁLCULOS)

A análise do código atual (`src/App.jsx`) revela que as otimizações de performance de renderização mais críticas foram implementadas:

1.  **Memoização de Cálculos Pesados**:
    *   `badges`: Agora usa `useMemo`.
    *   `temporalCorrelations`: Agora usa `useMemo`.
    *   `bidirectionalAnalysis`: Agora usa `useMemo`.
    *   `last7`, `streaks`: Memoizados.
    *   **Impacto**: Redução drástica no uso de CPU durante re-renders (evita recálculos O(n²)).

2.  **Limpeza de Código**:
    *   `calculatePearsonCorrelation` foi extraída e desduplicada.
    *   Babel Standalone foi removido (migração para Vite confirmada).

---

## ⚠️ O QUE FALTA (FASE 2 - ARQUITETURA E MANUTENIBILIDADE)

Apesar das melhorias de CPU, o código sofre de problemas estruturais graves que impedem a escalabilidade e dificultam a manutenção:

1.  **Componente Monolítico (`HarmReductionTracker`)**:
    *   O ficheiro `src/App.jsx` tem **2470 linhas**.
    *   Contém **TODA** a lógica: Firebase, gestão de estado, UI, modais, dashboards, helpers.
    *   Mistura responsabilidades, tornando difícil entender e modificar partes isoladas.

2.  **"State Bloat" & Re-renders**:
    *   Existem **30+ `useState` hooks** no componente raiz.
    *   Qualquer alteração num estado (ex: abrir um modal) causa o re-render de **TODA** a aplicação.
    *   Não há uso de `Context` para separar dados (Firebase) de UI (Modais/Navegação).

3.  **Falta de Componentização**:
    *   Modais (`DailyLogModal`, `WellbeingModal`, etc.) estão definidos inline no JSX.
    *   Secções grandes (Dashboard, Patterns, History) estão inline com condicionais gigantes.
    *   Isso impede o *Code Splitting* e o *Lazy Loading* (Fase 3).

---

## 🚀 PLANO DE AÇÃO RECOMENDADO (PRIORITÁRIO)

Para resolver os problemas acima, recomendo executar imediatamente a **Fase 2** do plano original, focando na refatorização arquitetural:

### Passo 1: Extrair Contextos (Gerir Estado)
*   Criar `src/context/DataContext.jsx`: Mover lógica do Firebase e estados de dados (`consumptions`, `logs`, etc.).
*   Criar `src/context/UIContext.jsx`: Mover estados de interface (`currentView`, `showModal`, etc.).
*   **Benefício**: Separação de preocupações e redução de re-renders.

### Passo 2: Extrair Componentes (Modularizar UI)
*   Criar pasta `src/components/modals/`: Mover cada modal para seu próprio ficheiro.
*   Criar pasta `src/components/views/`: Mover `Dashboard`, `Patterns`, `History` para componentes separados.
*   **Benefício**: Ficheiros menores (<300 linhas), código mais legível e manutenível.

### Passo 3: Otimizar Hooks
*   Implementar hooks personalizados (ex: `useFirebaseData`, `useCalculations`) para limpar o componente principal.

---

## RESUMO

O trabalho de "performance bruta" (algoritmos) está feito. Agora é necessário "performance de arquitetura" (organização) para garantir que o projeto não se torne incontrolável.

**Recomendação:** Iniciar a criação dos Contextos e a extração dos Modais imediatamente.
