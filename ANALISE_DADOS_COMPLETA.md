# 📊 Análise Completa: Dados Guardados no Firebase

**Data**: 2025-12-29
**App**: NEP Harm Reduction Tracker

---

## ✅ COLEÇÕES REAIS NO FIREBASE (7 ativas)

### 1. **consumptions** - Consumos Individuais
- **Modal**: Botão "Registar Consumo" (HomeView)
- **Campos guardados**:
  - `id` - ID único
  - `substance` - Nome da substância
  - `amount` - Quantidade (número)
  - `unit` - Unidade (mg, g, ml, etc)
  - `timestamp` - Data e hora exata
  - `date` - Data em formato YYYY-MM-DD
  - `notes` - Notas opcionais
  - `location` - Local (opcional)
  - `context` - Contexto (opcional)

### 2. **cycles** - Ciclos de Sono/Vigília
- **Modal**: CycleModal.jsx ("🌙 Novo Ciclo")
- **Quando**: Criado quando acordas
- **Campos guardados**:
  - `id` - ID único
  - `bedtime` - Hora que te deitaste (HH:MM)
  - `sleep` - Horas dormidas (número, ex: 7.5)
  - `triggers[]` - Array de gatilhos identificados
    - Opções: Stress, Ansiedade, Solidão, Festa, Trabalho, Família, Hábito, Tristeza, Dependência, Tédio, Cansaço, Dor física, Insónia, Conflito, Celebração
  - `lastBefore00` - Boolean (último consumo antes 00h?)
  - `notes` - Notas sobre o ciclo
  - `timestamp` - Data e hora
  - `date` - Data

**IMPORTANTE**: `cycles` NÃO é "ciclos de redução" - é cada registo de sono!

### 3. **dailyLogs** - Dosagem Diária Total
- **Modal**: DailyLogModal.jsx ("Registar Dosagem do Dia")
- **Campos guardados**:
  - `id` - ID único
  - `date` - Data do registo
  - `mg` - Total aproximado de mg do dia
  - `notes` - Notas opcionais
  - `timestamp` - Data e hora

### 4. **wellbeingLogs** - Bem-Estar Completo
- **Modal**: WellbeingModal.jsx ("Check-in Bem-Estar")
- **Campos guardados**:
  - `id` - ID único
  - `date` - Data
  - `timestamp` - Data e hora
  - `mood` - Humor (1-10)
  - `energy` - Energia (1-10)
  - **Autocuidado (checkboxes)**:
    - `water` - Boolean (bebi água suficiente)
    - `rest` - Boolean (descansei suficiente)
    - `social` - Boolean (tive contacto social)
    - `food` - Boolean (comi refeições nutritivas)
  - `emotions[]` - Array de emoções selecionadas (32 opções):
    - **Positivas**: Feliz, Calmo, Motivado, Grato, Produtivo, Confiante, Amado, Entusiasmado, Orgulhoso, Divertido, Resiliente, Otimista, Apoiado, Em paz
    - **Negativas**: Triste, Ansioso, Irritado, Frustrado, Stressado, Inseguro, Solitário, Confuso, Culpado, Apático, Arrependido, Desconectado, Com craving, Overwhelmed
    - **Neutras**: Cansado, Ambivalente, Vulnerável, Okay
  - `notes` - Notas opcionais

### 5. **reflections** - Reflexões
- **Modal**: ReflectionModal.jsx
- **Campos guardados**:
  - `id` - ID único
  - `date` - Data
  - `timestamp` - Data e hora
  - `text` - Texto da reflexão
  - `sentiment` - Sentimento (opcional)

### 6. **thoughts** - Pensamentos
- **Modal**: ThoughtsModal.jsx
- **Campos guardados**:
  - `id` - ID único
  - `timestamp` - Data e hora
  - `date` - Data
  - `thought` - Texto do pensamento
  - `notes` - Notas adicionais

### 7. **goals** - Objetivos
- **Modal**: GoalModal.jsx
- **Campos guardados**:
  - `id` - ID único
  - `title` - Título do objetivo
  - `description` - Descrição
  - `createdAt` - Data de criação
  - `completed` - Boolean (completo?)
  - `progress` - Progresso (0-100)

---

## ❌ COLEÇÃO QUE EXISTE NO CÓDIGO MAS NÃO É USADA

### 8. **copingStrategies** - Estratégias de Coping
- **Status**: ⚠️ CÓDIGO EXISTE, MAS NUNCA É CHAMADO
- **DataContext.jsx**: Listener existe (linha 168)
- **Funções**: `addCopingStrategy`, `deleteCopingStrategy` existem
- **UIContext.jsx**: `showCopingModal` existe
- **Problema**: Não há UI/botão que abra este modal!
- **Resultado**: Coleção vazia/inexistente no Firebase

**Conclusão**: Esta funcionalidade foi planeada mas nunca implementada completamente.

---

## 📋 RESUMO FINAL

### Dados REALMENTE Guardados (7 coleções ativas):
1. ✅ **consumptions** - Cada consumo individual
2. ✅ **cycles** - Sono + gatilhos
3. ✅ **dailyLogs** - Dosagem total diária
4. ✅ **wellbeingLogs** - Humor, Energia, Autocuidado, Emoções
5. ✅ **reflections** - Reflexões
6. ✅ **thoughts** - Pensamentos
7. ✅ **goals** - Objetivos

### Dados NO CÓDIGO mas não guardados:
8. ⚠️ **copingStrategies** - Funcionalidade incompleta

---

## 🔍 VERIFICAÇÃO: Tens todos os dados?

Para verificar se tens TODOS os dados até hoje:

1. Abre Firebase Console: https://console.firebase.google.com/
2. Vai a Firestore Database
3. Verifica em `users/{teuUserID}/`

Cada coleção deve ter:
- **consumptions**: Todos os consumos que registaste
- **cycles**: Cada vez que fizeste "Novo Ciclo" (sono)
- **dailyLogs**: Dosagens totais diárias
- **wellbeingLogs**: Check-ins de bem-estar
- **reflections**: Reflexões escritas
- **thoughts**: Pensamentos registados
- **goals**: Objetivos definidos

**Se faltar algo**: Pode ser porque:
- Não registaste esse tipo de dado ainda
- Houve erro ao guardar (pouco provável)
- Dados antigos foram apagados manualmente

---

## ⚠️ IMPORTANTE: Migração Local-First

**A app CONTINUA IGUAL!** Nada mudou ainda:
- ✅ Continua a guardar no Firebase
- ✅ Todos os dados novos vão para Firebase
- ✅ Não há PIN ainda
- ✅ Funciona exatamente como antes

**Quando terminar a migração**:
- ✅ VAI COPIAR todos os dados antigos do Firebase → Local
- ✅ Depois pede PIN
- ✅ Novos dados vão para local (encriptados)

**ZERO PERDAS garantido!**
