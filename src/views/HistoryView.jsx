import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../components/Icons';
import { formatSubstances } from '../utils/substances';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import { formatDateTime, formatDateShort, formatDateWithWeekday, safeDate, safeToISODate, isDayMarkLog } from '../utils/helpers';
import { analyzeNote, getSentimentDescription } from '../utils/sentimentAnalysis';
import { periodInfoForClosing, typicalMgPerDose, balanceAverage } from '../utils/mgDerivation';
import { GapsReport } from '../components/ui/GapsReport';
import { DayMarksPanel } from '../components/ui/DayMarksPanel';
import { EMOTION_EN } from '../constants/emotions';

const { getDateRangeForPeriod, filterByDateRange, getPeriodLabel } = analyticsService;

// Cache global para análises de sentimento
const sentimentCache = new Map();

// Análise de sentimento DESATIVADA na vista de histórico.
// O classificador é uma lista de palavras simples, só PT, sem contexto/negação:
// em texto EN dava sempre "neutral (0.00)" e mesmo em PT etiquetava mal (ex.:
// classificava mal linguagem de redução de danos). Mostrar isto às pessoas
// confundia e não acrescentava valor — fica oculto até haver um classificador
// fiável. (Basta remover esta linha para o reativar.)
const SENTIMENT_UI_ENABLED = false;

// Função com cache para análise de sentimento
const getCachedSentimentAnalysis = (text) => {
    if (!SENTIMENT_UI_ENABLED) return null;
    if (!text) return null;

    if (!sentimentCache.has(text)) {
        sentimentCache.set(text, analyzeNote(text));

        // Limitar tamanho do cache para evitar memory leak (máx 500 itens)
        if (sentimentCache.size > 500) {
            const firstKey = sentimentCache.keys().next().value;
            sentimentCache.delete(firstKey);
        }
    }

    return sentimentCache.get(text);
};

export function HistoryView({
    historyPeriod,
    setHistoryPeriod,
    historyPeriodOffset,
    setHistoryPeriodOffset,
    historyTopic,
    setHistoryTopic,
    reflectionsToShow,
    setReflectionsToShow,
    wellbeingToShow,
    setWellbeingToShow,
    cyclesHistoryToShow,
    setCyclesHistoryToShow,
    thoughtsToShow,
    setThoughtsToShow,
    allItemsToShow,
    setAllItemsToShow,
    openEditConsumption,
    openEditCycle,
    openEditDailyLog,
    openEditWellbeingLog,
    openEditReflection,
    openEditThought,
    deleteItem,
    handleFillGap
}) {
    const { consumptions, allConsumptions, reflections, wellbeingLogs, cycles, thoughts, dailyLogs, weighings, updateWeighing, db } = useData();
    const { setShowCycleModal } = useUI();
    const [showAllCycleGaps, setShowAllCycleGaps] = useState(false);
    // A lista mostra TODOS os registos (também os só de outras substâncias);
    // as contas de mg usam só os da principal (consumptions).
    const listConsumptions = allConsumptions || consumptions;
    const metrics = useMetrics();
    const { t, i18n } = useTranslation();
    // Em inglês, traduzir emoções (guardadas como '😌 Calmo/a') e gatilhos (guardados
    // em PT, ex.: 'Ansiedade') para não mostrarem português na versão EN.
    const isEN = i18n.language === 'en';
    const trEmotion = (e) => (isEN ? (EMOTION_EN[e] || e) : e);
    const trTrigger = (tr) => t('triggers.' + tr, tr);

    const [expandedAnalysis, setExpandedAnalysis] = useState(null);

    // Edição de PESAGENS: data/hora + "mg postos no saco" (= cheio − antes).
    const [showAllDoseDays, setShowAllDoseDays] = useState(false);
    const [showAllMgCycles, setShowAllMgCycles] = useState(false);
    const [showCalendarDays, setShowCalendarDays] = useState(false);
    const [showMissingMgDays, setShowMissingMgDays] = useState(false);
    const [showPeriods, setShowPeriods] = useState(false);
    const [showAllPeriods, setShowAllPeriods] = useState(false);
    const [editingWeighing, setEditingWeighing] = useState(null);
    const [ewDatetime, setEwDatetime] = useState('');
    const [ewAdded, setEwAdded] = useState('');
    const toLocalInput = (d) => {
        const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return x.toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:mm' local
    };
    // Peso do saco VAZIO = constante recuperável da pesagem intacta mais recente.
    // Serve de referência para calcular "mg postos = cheio − vazio" e para curar
    // pesagens a que faltem os campos before/empty (ex.: estragadas por edições
    // antigas antes da correção do envelope cifrado).
    const emptyRef = useMemo(() => {
        const sorted = [...(weighings || [])]
            .filter(w => w && !w.notWeighed && typeof w.empty === 'number')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return sorted.length ? sorted[0].empty : null;
    }, [weighings]);
    // Referência de "antes" desta pesagem: o próprio 'before' se existir, senão o
    // vazio recuperado das outras pesagens.
    const weighingBeforeRef = (w) => (typeof w.before === 'number' ? w.before : emptyRef);
    const weighingCanEditAdded = (w) => !w.notWeighed && typeof w.full === 'number' && weighingBeforeRef(w) != null;
    const openEditWeighing = (w) => {
        const dt = new Date(w.timestamp || (w.date ? `${w.date}T12:00:00` : Date.now()));
        setEwDatetime(toLocalInput(dt));
        const ref = weighingBeforeRef(w);
        const added = (typeof w.full === 'number' && ref != null) ? Math.round(w.full - ref) : '';
        setEwAdded(added === '' ? '' : String(added));
        setEditingWeighing(w);
    };
    const saveEditWeighing = async () => {
        const w = editingWeighing;
        if (!w || !ewDatetime) return;
        const d = new Date(ewDatetime);
        if (isNaN(d)) return;
        const updates = { timestamp: d.toISOString(), date: safeToISODate(d) };
        const ref = weighingBeforeRef(w);
        if (weighingCanEditAdded(w) && ewAdded !== '' && ref != null) {
            const addedVal = parseFloat(ewAdded);
            if (!isNaN(addedVal) && addedVal >= 0) {
                updates.full = ref + addedVal;
                // Curar registos a que faltem os campos (recupera o vazio constante).
                if (typeof w.before !== 'number') updates.before = ref;
                if (typeof w.empty !== 'number' && emptyRef != null) updates.empty = emptyRef;
            }
        }
        try { await updateWeighing(w.id, updates); } catch { /* silencioso */ }
        setEditingWeighing(null);
    };

    const toggleAnalysis = (id, text) => {
        if (expandedAnalysis === id) {
            setExpandedAnalysis(null);
        } else {
            setExpandedAnalysis(id);
        }
    };

    // Memoizar cálculos de filtragem para evitar recálculos a cada render
    const dateRange = useMemo(
        () => getDateRangeForPeriod(historyPeriod, historyPeriodOffset),
        [historyPeriod, historyPeriodOffset]
    );

    // Filtrar e ordenar dados apenas quando necessário
    const tempFilteredReflections = useMemo(() =>
        filterByDateRange(reflections, dateRange)
            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)),
        [reflections, dateRange]
    );

    const tempFilteredWellbeing = useMemo(() =>
        filterByDateRange(wellbeingLogs, dateRange)
            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)),
        [wellbeingLogs, dateRange]
    );

    // As marcas "não registei" são metadados, não registos: se entrassem aqui
    // apareciam como cartões vazios no Histórico e inchavam as contagens
    // ("Tudo (4103)"). Quem as mostra é o painel "Dias que não registei".
    const tempFilteredDailyLogs = useMemo(() =>
        filterByDateRange(dailyLogs.filter(l => !isDayMarkLog(l)), dateRange, 'date')
            .sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp)),
        [dailyLogs, dateRange]
    );

    const tempFilteredConsumptions = useMemo(() =>
        filterByDateRange(listConsumptions, dateRange)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
        [listConsumptions, dateRange]
    );

    const tempFilteredCycles = useMemo(() =>
        filterByDateRange(cycles, dateRange)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
        [cycles, dateRange]
    );

    const tempFilteredThoughts = useMemo(() =>
        filterByDateRange(thoughts, dateRange)
            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)),
        [thoughts, dateRange]
    );

    const tempFilteredWeighings = useMemo(() =>
        filterByDateRange(weighings || [], dateRange)
            .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)),
        [weighings, dateRange]
    );

    // Pesagens: só aparecem no tópico próprio e no "todos".
    const filteredWeighings = useMemo(() => (
        (historyTopic === 'todos' || historyTopic === 'pesagens') ? tempFilteredWeighings : []
    ), [historyTopic, tempFilteredWeighings]);

    // Registos de mg À MÃO (dailyLogs com mg): é dosagem tal como uma pesagem,
    // só registada de outra forma — por isso vive no mesmo separador.
    const filteredMgLogs = useMemo(() => (
        historyTopic === 'pesagens'
            ? tempFilteredDailyLogs.filter(l => l && l.mg != null && !isNaN(parseFloat(l.mg)) && parseFloat(l.mg) > 0)
            : []
    ), [historyTopic, tempFilteredDailyLogs]);

    // mg/toque típico — referência para a pessoa julgar um período suspeito.
    const typicalPerDose = useMemo(
        () => typicalMgPerDose(weighings || [], consumptions || [], { unloggedDates: metrics?.unloggedDates, unsureDates: metrics?.unsureRefillDates }),
        [weighings, consumptions, metrics?.unloggedDates, metrics?.unsureRefillDates]
    );

    // PERÍODOS PESADOS: o que saiu do saco entre duas pesagens. Vem da balança,
    // não depende de toques — é o que continua verdade quando faltam registos.
    const weighedPeriods = metrics?.weighedPeriods || [];

    // MÉDIA PELA BALANÇA dos últimos 7 dias — o nível geral, ao lado do
    // "Total por dia" (que é estimado dia a dia e é o que a meta conta).
    const balanceWeek = useMemo(
        () => balanceAverage(weighedPeriods, Date.now() - 7 * 86400000, Date.now(), { excludedDates: metrics?.atypicalDates }),
        [weighedPeriods, metrics?.atypicalDates]
    );

    // Dias marcados como ATÍPICOS (ficam fora das médias).
    const atypicalDates = useMemo(() => {
        const s = new Set();
        (wellbeingLogs || []).forEach(w => {
            if (w && w.isAtypical) {
                const d = w.date || safeToISODate(w.timestamp);
                if (d) s.add(d);
            }
        });
        return s;
    }, [wellbeingLogs]);

    // Dias marcados como "NÃO REGISTEI" (dados em falta, não zeros).
    const unloggedDates = metrics?.unloggedDates || new Set();

    // Dias COM consumos mas SEM valor de mg — e o motivo. Sem isto, o "Total por
    // dia" limitava-se a saltar dias em silêncio, o que parece um erro.
    const missingMgDays = useMemo(() => {
        try {
            const summary = metrics?.dailySummary || {};
            const seen = new Set();
            const arr = [];
            const consider = (d) => {
                if (!d || seen.has(d)) return;
                seen.add(d);
                const mg = summary[d]?.mg;
                if (mg != null && mg > 0) return;
                // Motivo concreto vindo do motor de mg (troca de saco sem pesos,
                // "não pesei", saco ainda em aberto, …). A marca da pessoa manda
                // sempre sobre o que a app deduz.
                const gap = metrics?.mgGapReasonsByDate?.[d] || null;
                const codes = gap?.codes || [];
                // "Faltam toques" manda sobre os outros motivos: é o que explica
                // um dia inflacionado, e é o que a pessoa pode corrigir.
                const code = codes.includes('unloggedDaysInPeriod')
                    ? 'unloggedDaysInPeriod'
                    : codes.includes('unsureRefillInPeriod') ? 'unsureRefillInPeriod'
                    : codes.includes('missingTouches') ? 'missingTouches' : (codes[0] || 'unmeasured');
                // Há um "Registar mg" para este dia, mas com a caixa dos mg vazia:
                // dizer isso (é diferente de não haver registo nenhum).
                const emptyLog = (code === 'beforeFirstWeighing' || code === 'unmeasured')
                    && (dailyLogs || []).some(l => l && !isDayMarkLog(l) && l.date === d && (l.mg == null || l.mg === ''));
                arr.push({
                    date: d,
                    reason: unloggedDates.has(d) ? 'unlogged' : atypicalDates.has(d) ? 'atypical' : emptyLog ? 'emptyMgLog' : code,
                    detail: gap?.detail || null,
                });
            };
            for (const c of (consumptions || [])) consider(c.date || safeToISODate(c.timestamp));
            // Dias marcados "não registei" não têm consumos — mas têm de aparecer
            // na explicação, senão a pessoa vê um buraco sem motivo nenhum.
            unloggedDates.forEach(d => consider(d));
            return filterByDateRange(arr, dateRange, 'date').sort((a, b) => (a.date < b.date ? 1 : -1));
        } catch { return []; }
    }, [consumptions, dailyLogs, metrics?.dailySummary, metrics?.mgGapReasonsByDate, atypicalDates, unloggedDates, dateRange]);

    // Dias seguidos com o MESMO motivo (e o mesmo período) num cartão só —
    // "11 → 14 set." em vez de quatro cartões a repetir a mesma frase.
    const missingMgGroups = useMemo(() => {
        const next = (d) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + 1); return safeToISODate(x); };
        const sig = (m) => `${m.reason}|${m.detail ? JSON.stringify([m.detail.consumed, m.detail.missingTs, (m.detail.dates || []).join(',')]) : ''}`;
        const groups = [];
        for (const m of missingMgDays) { // mais recente primeiro
            const g = groups[groups.length - 1];
            if (g && g.sig === sig(m) && next(m.date) === g.from) { g.from = m.date; g.count++; continue; }
            groups.push({ ...m, sig: sig(m), from: m.date, to: m.date, count: 1 });
        }
        return groups;
    }, [missingMgDays]);

    // Motivos em linguagem simples (o objetivo é a pessoa perceber o que fazer).
    const mgGapReasonText = (code) => {
        switch (code) {
            case 'atypical':
                return isEN ? '📌 atypical day (kept out of averages)' : '📌 dia atípico (fora das médias)';
            case 'notWeighed':
                return isEN ? '⚖️ a refill was marked "not weighed"' : '⚖️ houve um enchimento marcado "não pesei"';
            case 'forgottenRefill':
                return isEN ? '⚖️ a forgotten refill in this period' : '⚖️ enchimento esquecido neste período';
            case 'newBagMissingWeights':
                return isEN ? '⚖️ bag change without the empty-bag weight' : '⚖️ troca de saco sem o peso do saco vazio';
            case 'missingWeights':
                return isEN ? '⚖️ a weighing in this period is missing a weight' : '⚖️ uma pesagem deste período ficou sem um dos pesos';
            case 'negative':
                return isEN ? '⚖️ weights look swapped (negative result)' : '⚖️ pesos parecem trocados (deu negativo)';
            case 'missingTouches':
                return isEN ? '➕ uses missing in this period' : '➕ faltam toques registados neste período';
            case 'emptyMgLog':
                return isEN ? '📊 "Log mg" saved without a number' : '📊 "Registar mg" guardado sem número';
            case 'unlogged':
                return isEN ? '🕳️ you marked it as not logged' : '🕳️ marcaste como "não registei"';
            case 'unloggedDaysInPeriod':
                return isEN ? '🕳️ period covers days you did not log' : '🕳️ período apanha dias que não registaste';
            case 'unsureRefillInPeriod':
                return isEN ? '❔ you are not sure if you refilled the bag' : '❔ não sabes se encheste o saco neste período';
            case 'beforeFirstWeighing':
                // Antes das pesagens do saco só havia o "Registar mg": este dia
                // não tem nenhum (não é "não pesavas" — pesava-se, à mão).
                return isEN ? '📊 no mg logged this day (before bag weighings)' : '📊 sem "Registar mg" neste dia (antes das pesagens do saco)';
            case 'afterLastWeighing':
                return isEN ? '⚖️ no weighing after these uses yet' : '⚖️ ainda não há pesagem depois destes toques';
            case 'outsideAnyPeriod':
                return isEN ? '⚖️ uses outside any closed weighing' : '⚖️ toques fora de pesagens fechadas';
            default:
                return isEN ? '⚖️ no weighing covering the whole day' : '⚖️ sem pesagem que cubra o dia todo';
        }
    };

    // Total de mg POR DIA, da FONTE UNIFICADA (registo à mão OU derivado das
    // pesagens — a mesma regra do resto da app), do mais recente para o mais
    // antigo, dentro do período selecionado.
    const derivedDaysList = useMemo(() => {
        try {
            const summary = metrics?.dailySummary || {};
            const arr = Object.entries(summary)
                .filter(([, v]) => v && v.mg != null && v.mg > 0)
                .map(([date, v]) => ({ date, mg: Math.round(v.mg) }));
            return filterByDateRange(arr, dateRange, 'date')
                .sort((a, b) => (a.date < b.date ? 1 : -1));
        } catch { return []; }
    }, [metrics?.dailySummary, dateRange]);

    // Aplicar filtro de tópico
    const { filteredReflections, filteredWellbeing, filteredDailyLogs, filteredConsumptions, filteredCycles, filteredThoughts } = useMemo(() => {
        if (historyTopic === 'consumos') {
            return {
                filteredReflections: [],
                filteredWellbeing: [],
                filteredCycles: [],
                filteredThoughts: [],
                filteredDailyLogs: tempFilteredDailyLogs,
                filteredConsumptions: tempFilteredConsumptions
            };
        } else if (historyTopic === 'ciclos') {
            return {
                filteredConsumptions: [],
                filteredWellbeing: [],
                filteredReflections: [],
                filteredThoughts: [],
                filteredDailyLogs: [],
                filteredCycles: tempFilteredCycles
            };
        } else if (historyTopic === 'estado') {
            return {
                filteredConsumptions: [],
                filteredReflections: [],
                filteredDailyLogs: [],
                filteredCycles: [],
                filteredThoughts: [],
                filteredWellbeing: tempFilteredWellbeing
            };
        } else if (historyTopic === 'diario') {
            return {
                filteredConsumptions: [],
                filteredWellbeing: [],
                filteredDailyLogs: [],
                filteredCycles: [],
                filteredReflections: tempFilteredReflections,
                filteredThoughts: tempFilteredThoughts
            };
        } else if (historyTopic === 'pesagens') {
            // Só dosagens: sem este ramo, 'pesagens' caía no 'todos' e o separador
            // mostrava também reflexões, pensamentos, bem-estar, ciclos e consumos.
            return {
                filteredConsumptions: [],
                filteredWellbeing: [],
                filteredDailyLogs: [],
                filteredCycles: [],
                filteredReflections: [],
                filteredThoughts: []
            };
        }
        // 'todos'
        return {
            filteredReflections: tempFilteredReflections,
            filteredWellbeing: tempFilteredWellbeing,
            filteredDailyLogs: tempFilteredDailyLogs,
            filteredConsumptions: tempFilteredConsumptions,
            filteredCycles: tempFilteredCycles,
            filteredThoughts: tempFilteredThoughts,
        };
    }, [historyTopic, tempFilteredReflections, tempFilteredWellbeing, tempFilteredDailyLogs, tempFilteredConsumptions, tempFilteredCycles, tempFilteredThoughts]);

    const allItemsSorted = useMemo(() => {
        return [
            ...filteredConsumptions.map(c => ({ type: 'consumption', data: c, timestamp: c.timestamp })),
            ...filteredDailyLogs.map(log => ({ type: 'dailyLog', data: log, timestamp: log.timestamp || log.date })),
            ...filteredCycles.map(cycle => ({ type: 'cycle', data: cycle, timestamp: cycle.timestamp })),
            ...filteredWellbeing.map(w => ({ type: 'wellbeing', data: w, timestamp: w.timestamp || w.date })),
            ...filteredReflections.map(r => ({ type: 'reflection', data: r, timestamp: r.timestamp || r.date })),
            ...filteredThoughts.map(t => ({ type: 'thought', data: t, timestamp: t.timestamp || t.date })),
            ...filteredWeighings.map(w => ({ type: 'weighing', data: w, timestamp: w.timestamp || w.date }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [filteredConsumptions, filteredDailyLogs, filteredCycles, filteredWellbeing, filteredReflections, filteredThoughts, filteredWeighings]);

    // Lista consumos+dailyLogs ordenada — memoizada para não re-ordenar a cada render
    const consumptionLogsSorted = useMemo(() => (
        [...filteredConsumptions.map(c => ({ type: 'consumption', data: c, timestamp: c.timestamp })),
         ...filteredDailyLogs.map(log => ({ type: 'dailyLog', data: log, timestamp: log.timestamp || log.date }))]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    ), [filteredConsumptions, filteredDailyLogs]);

    // Diário (reflexões + pensamentos) — ordenado uma vez, não a cada render.
    const diaryItemsSorted = useMemo(() => (
        [...filteredReflections.map(r => ({ type: 'reflection', data: r, timestamp: r.timestamp || r.date })),
         ...filteredThoughts.map(t => ({ type: 'thought', data: t, timestamp: t.timestamp || t.date }))]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    ), [filteredReflections, filteredThoughts]);

    // Dosagens (pesagens + registos de mg), a mesma lista dos dois lados.
    const doseItemsSorted = useMemo(() => (
        [...filteredWeighings.map(w => ({ kind: 'w', data: w, ts: w.timestamp || (w.date ? `${w.date}T12:00:00` : null) })),
         ...filteredMgLogs.map(l => ({ kind: 'l', data: l, ts: l.timestamp || (l.date ? `${l.date}T12:00:00` : null) }))]
            .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
    ), [filteredWeighings, filteredMgLogs]);

    // ⚡ LIMITES DE ECRÃ. Estas três listas desenhavam TUDO de uma vez: com o
    // período "Tudo" e meses de registos eram milhares de cartões no ecrã ao
    // mesmo tempo (cada um com botões e ícones), e o telemóvel ficava a arrastar
    // só para os manter. Passam a mostrar um bocado e a crescer a pedido, como
    // já faziam as reflexões, os ciclos e o bem-estar.
    const PAGE = 30;
    const [consumptionsToShow, setConsumptionsToShow] = useState(PAGE);
    const [diaryToShow, setDiaryToShow] = useState(PAGE);
    const [doseItemsToShow, setDoseItemsToShow] = useState(PAGE);
    // Mudar de período ou de separador recomeça do início (senão ficava a
    // arrastar o limite antigo de uma lista que já não é a mesma).
    useEffect(() => {
        setConsumptionsToShow(PAGE);
        setDiaryToShow(PAGE);
        setDoseItemsToShow(PAGE);
    }, [historyTopic, historyPeriod, historyPeriodOffset]);

    const hasData = filteredReflections.length > 0 || filteredWellbeing.length > 0 || filteredDailyLogs.length > 0 || filteredConsumptions.length > 0 || filteredCycles.length > 0 || filteredThoughts.length > 0 || filteredWeighings.length > 0 || filteredMgLogs.length > 0;

    // Cartão de uma pesagem no Histórico (mesmo estilo dos outros itens). Mostra o
    // peso atual em mg e, quando dá, quanto se gastou desde a pesagem anterior.
    const renderWeighing = (w) => {
        const dt = new Date(w.timestamp || (w.date ? `${w.date}T12:00:00` : Date.now()));
        // Mostrar a SUBSTÂNCIA que foi posta no saco = cheio − o que pesava antes,
        // NÃO o peso do saco cheio (que inclui o saco). É o mesmo valor que o modal
        // apresenta como "Puseste:".
        const added = (typeof w.full === 'number' && typeof w.before === 'number')
            ? Math.round(w.full - w.before) : null;
        // O que sobrava DENTRO do saco = peso na balança − peso do saco vazio.
        // Sem a tara não se sabe, e aí não se mostra número nenhum.
        const restante = (typeof w.before === 'number' && typeof w.empty === 'number')
            ? Math.round(w.before - w.empty) : null;
        const gasto = periodInfoForClosing(weighings || [], consumptions || [], w.id);
        return (
            <div key={`weigh-${w.id}`} className="bg-amber-900/25 border-amber-700/50 p-3 rounded-lg border">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="font-medium text-white">⚖️ {formatDateTime(dt)}</div>
                        {w.notWeighed ? (
                            <div className="text-sm mt-1 text-gray-300">
                                {isEN ? 'Filled without weighing (no weight recorded)' : 'Enchi sem pesar (sem peso registado)'}
                            </div>
                        ) : (
                            <div className="text-sm mt-1 text-amber-200">
                                {/* ⚠️ ESTE CARTÃO SÓ SABIA DIZER "mg postos no saco".
                                   Numa pesagem SEM ENCHER não se põe nada, por isso
                                   caía no "pesagem registada" — sem número nenhum,
                                   como se o peso que ela mediu não existisse. Agora
                                   cada caso diz o que tem; e quando não há pesos
                                   mesmo, diz isso em vez de ficar vago. */}
                                {/* Pesou sem encher (marcado ou não): há peso, só não se pôs nada. */}
                                {(w.noRefill || (!(added > 0) && typeof w.before === 'number')) ? (
                                    restante != null ? (
                                        <>{isEN ? 'Weighed without refilling · ' : 'Pesei sem encher · '}
                                        <span className="font-bold">{restante}</span> mg {isEN ? 'left in the bag' : 'no saco'}</>
                                    ) : (
                                        <>{isEN ? 'Weighed without refilling' : 'Pesei sem encher'}
                                        {typeof w.before === 'number' && (
                                            <span className="text-gray-400"> · {isEN ? 'bag weighed' : 'o saco pesou'} {Math.round(w.before)}</span>
                                        )}</>
                                    )
                                ) : added != null && added > 0 ? (
                                    <><span className="font-bold">{added}</span> mg {isEN ? 'added to the bag' : 'postos no saco'}</>
                                ) : (
                                    <span className="text-gray-400">
                                        {isEN ? 'weighing with no weights recorded' : 'pesagem sem pesos registados'}
                                    </span>
                                )}
                                {w.isNewBag && <span className="text-gray-400"> · {isEN ? 'new bag' : 'saco novo'}</span>}
                            </div>
                        )}
                        {/* Gasto desde a pesagem anterior. É a informação que torna
                           útil pesar à mesma hora todos os dias, e não aparecia em
                           lado nenhum. Fica de fora quando o período está marcado
                           como enchimento esquecido (aí o número aparece em baixo,
                           com o aviso, e não como se fosse bom). */}
                        {!w.notWeighed && !w.forgottenRefill && gasto && gasto.consumed != null && (
                            <div className="text-xs mt-1 text-gray-300">
                                {isEN ? 'Since the previous weighing: ' : 'Desde a pesagem anterior: '}
                                <span className="font-bold">{gasto.consumed}</span> mg
                                {gasto.doseCount > 0 && (
                                    <> {isEN ? 'in' : 'em'} {gasto.doseCount} {isEN ? 'uses' : 'toques'}
                                    {gasto.mgPerDose != null && <> (~{gasto.mgPerDose} mg/{isEN ? 'use' : 'toque'})</>}</>
                                )}
                            </div>
                        )}
                        {/* Marca de "enchimento esquecido": foi respondida uma vez à
                            pergunta da app e deixava o período sem mg PARA SEMPRE,
                            sem forma de voltar atrás. Agora dá para desmarcar. */}
                        {w.forgottenRefill && (() => {
                            // Mostrar os NÚMEROS do período para a pessoa poder decidir
                            // com base em factos (não de memória): o que daria por toque
                            // vs. o seu normal. Um valor perto do normal é sinal de que
                            // a marca foi um engano.
                            const info = periodInfoForClosing(weighings || [], consumptions || [], w.id);
                            const fmtD = (ms) => new Date(ms).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
                            return (
                                <div className="mt-2 text-xs text-amber-300/90 space-y-1">
                                    <div>⚠️ {isEN ? 'marked as "I forgot to weigh a refill"' : 'marcada como "esqueci-me de pesar um enchimento"'}</div>
                                    {info && (
                                        <div className="text-gray-300">
                                            {isEN ? 'Period' : 'Período'} {fmtD(info.start)} → {fmtD(info.end)}
                                            {' · '}{info.doseCount} {isEN ? 'uses' : 'toques'}
                                            {info.mgPerDose != null && (
                                                <>
                                                    {' · '}{isEN ? 'would give' : 'daria'} <span className="font-bold">~{info.mgPerDose}</span> mg/{isEN ? 'use' : 'toque'}
                                                    {typicalPerDose != null && (
                                                        <> ({isEN ? 'your usual' : 'o teu normal'} ~{Math.round(typicalPerDose)})</>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => updateWeighing(w.id, { forgottenRefill: false }).catch(() => {})}
                                        className="underline text-amber-200 hover:text-white"
                                    >
                                        {isEN ? 'undo (count this period again)' : 'desmarcar (voltar a contar este período)'}
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                    <div className="flex gap-2 ml-2 flex-shrink-0">
                        <button onClick={() => openEditWeighing(w)} aria-label={isEN ? 'Edit' : 'Editar'} className="text-blue-400 hover:text-blue-300"><Icons.Edit className="w-4 h-4" aria-hidden="true" /></button>
                        <button onClick={() => deleteItem('weighings', w.id)} aria-label={isEN ? 'Delete' : 'Apagar'} className="text-red-500 hover:text-red-400"><Icons.Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                    </div>
                </div>
            </div>
        );
    };

    // Cartão de um REGISTO DE MG (dailyLogs.mg). Aparece lado a lado com as
    // pesagens no separador "Dosagens" — são a mesma informação (quanto),
    // registada de maneiras diferentes. Nenhuma vale menos do que a outra.
    const renderMgLog = (log) => {
        const d = safeDate(log.date || log.timestamp);
        return (
            <div key={`mglog-${log.id}`} className="bg-pink-900/25 border-pink-700/50 p-3 rounded-lg border">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="font-medium text-white">📝 {d ? d.toLocaleDateString(i18n.language) : t('history.invalidDate')}</div>
                        <div className="text-sm mt-1 text-pink-200">
                            <span className="font-bold">{log.mg}</span> mg {isEN ? 'logged' : 'registados'}
                            {log.times != null && (
                                <span className="text-gray-400"> · {log.times} {log.times === 1 ? t('history.use') : t('history.uses')}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 ml-2 flex-shrink-0">
                        {openEditDailyLog && <button onClick={() => openEditDailyLog(log)} aria-label={isEN ? 'Edit' : 'Editar'} className="text-blue-400 hover:text-blue-300"><Icons.Edit className="w-4 h-4" aria-hidden="true" /></button>}
                        <button onClick={() => deleteItem('dailyLogs', log.id)} aria-label={isEN ? 'Delete' : 'Apagar'} className="text-red-500 hover:text-red-400"><Icons.Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                    </div>
                </div>
            </div>
        );
    };

    return (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-white">{t('history.title')}</h2>

                                    {editingWeighing && (
                                        <div
                                            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                                            role="dialog" aria-modal="true"
                                            onClick={(e) => { if (e.target === e.currentTarget) setEditingWeighing(null); }}
                                        >
                                            <div className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-5 motion-safe:animate-scaleIn"
                                                style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-base font-bold text-white">⚖️ {isEN ? 'Edit weighing' : 'Editar pesagem'}</h3>
                                                    <button aria-label={isEN ? 'Cancel' : 'Cancelar'} onClick={() => setEditingWeighing(null)} className="text-gray-400 hover:text-gray-200 text-xl leading-none">✕</button>
                                                </div>
                                                <label className="block text-sm font-medium text-gray-300 mb-1">{isEN ? 'Date & time' : 'Data e hora'}</label>
                                                <input type="datetime-local" value={ewDatetime} onChange={(e) => setEwDatetime(e.target.value)}
                                                    className="bg-gray-700 border border-gray-600 text-white w-full p-3 rounded-lg focus:ring-2 focus:ring-purple-400 mb-3" />
                                                {weighingCanEditAdded(editingWeighing) ? (
                                                    <>
                                                        <label className="block text-sm font-medium text-gray-300 mb-1">{isEN ? 'mg added to the bag' : 'mg postos no saco'}</label>
                                                        <input type="number" inputMode="numeric" value={ewAdded} onChange={(e) => setEwAdded(e.target.value)}
                                                            className="bg-gray-700 border border-gray-600 text-white w-full p-3 rounded-lg focus:ring-2 focus:ring-purple-400 mb-4" />
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-gray-400 mb-4">{isEN ? 'This weighing has no weight to edit (date/time only).' : 'Esta pesagem não tem peso para editar (só data/hora).'}</p>
                                                )}
                                                <div className="flex gap-3">
                                                    <button onClick={() => setEditingWeighing(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors">{isEN ? 'Cancel' : 'Cancelar'}</button>
                                                    <button onClick={saveEditWeighing} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors">{isEN ? 'Save' : 'Guardar'}</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Gaps Report - Preencher dados em falta */}
                                    {handleFillGap && <GapsReport onFillGap={handleFillGap} />}

                                    {/* Dias que simplesmente não foram registados: dado em
                                        falta, não um dia a zero. Fica ao lado dos gaps porque
                                        é a resposta para quando não há nada a preencher. */}
                                    {/* MARCAR UM DIA: uma pergunta só ("o que aconteceu?") com as
                                        três situações, cada uma a dizer o que tira e o que deixa. */}
                                    <DayMarksPanel />

                                    {/* Temporal Filters */}
                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-4 border">
                                        <div className="flex flex-col gap-2 mb-3">
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                                                    <button key={period} onClick={() => { setHistoryPeriod(period); setHistoryPeriodOffset(0); }} className={'px-1 py-2 rounded-lg font-medium transition-colors text-xs whitespace-nowrap ' + (historyPeriod === period ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                                        {t(`patterns.periods.${period}`)}
                                                    </button>
                                                ))}
                                            </div>
                                            {historyPeriod !== 'tudo' && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => setHistoryPeriodOffset(historyPeriodOffset + 1)} className="text-purple-600 p-2 rounded-lg transition-colors hover:bg-gray-700">
                                                        <Icons.ChevronLeft className="w-5 h-5" />
                                                    </button>
                                                    <span className="text-sm font-medium min-w-[120px] text-center text-gray-300">{getPeriodLabel(historyPeriod, historyPeriodOffset)}</span>
                                                    <button onClick={() => setHistoryPeriodOffset(Math.max(0, historyPeriodOffset - 1))} disabled={historyPeriodOffset === 0} className={'p-2 rounded-lg transition-colors ' + (historyPeriodOffset === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-purple-600 hover:bg-gray-700')}>
                                                        <Icons.ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Topic Filters */}
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {[
                                            { id: 'todos', label: t('history.filterAll') },
                                            { id: 'consumos', label: t('history.filterLogs') },
                                            { id: 'ciclos', label: t('history.filterCycles') },
                                            { id: 'estado', label: t('history.filterWellbeing') },
                                            { id: 'diario', label: t('history.filterDiary') },
                                            { id: 'pesagens', label: isEN ? '⚖️ Doses' : '⚖️ Dosagens' }
                                        ].map(topic => (
                                            <button key={topic.id} onClick={() => setHistoryTopic(topic.id)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ' + (historyTopic === topic.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                                {topic.label}
                                            </button>
                                        ))}
                                    </div>

                                    {!hasData ? (
                                        <div className="bg-white rounded-xl p-6 border border-gray-200 text-center text-gray-500">
                                            {t('history.noRecords')}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Timeline única para tab "todos" */}
                                            {historyTopic === 'todos' && (
                                                <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">{t('history.headerAll', { count: filteredConsumptions.length + filteredDailyLogs.length + filteredCycles.length + filteredWellbeing.length + filteredReflections.length + filteredThoughts.length })}</h3>
                                                    <div className="space-y-3">
                                                        {(() => {
                                                            return allItemsSorted
                                                                .slice(0, allItemsToShow)
                                                                .map(item => {
                                                                if (item.type === 'consumption') {
                                                                    const c = item.data;
                                                                    return (
                                                                        <div key={`c-${c.id}`} className="bg-gray-700 border-gray-600 p-3 rounded-lg border">
                                                                            <div className="flex justify-between items-center">
                                                                                <div>
                                                                                    <div className="font-medium text-white">
                                                                                        💊 {formatDateTime(c.timestamp)}
                                                                                    </div>
                                                                                    {c.substances?.length > 0 && <div className="text-sm mt-1 text-gray-200">{formatSubstances(c.substances)}</div>}
{c.notes && <div className="text-sm mt-1 text-gray-300">💭 {c.notes}</div>}
                                                                                </div>
                                                                                <div className="flex gap-2 ml-2">
                                                                                    <button onClick={() => openEditConsumption(c)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>
                                                                                    <button onClick={() => deleteItem('consumptions', c.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                } else if (item.type === 'dailyLog') {
                                                                    const log = item.data;
                                                                    return (
                                                                        <div key={`l-${log.id}`} className="bg-pink-900/30 border-pink-700/50 p-3 rounded-lg border">
                                                                            <div className="flex justify-between items-center">
                                                                                <div className="flex-1">
                                                                                    <div className="font-medium mb-1 text-white">
                                                                                        💊 {(() => {
                                                                                            const d = safeDate(log.date || log.timestamp);
                                                                                            if (!d) return t('history.invalidDate');
                                                                                            const dateStr = d.toLocaleDateString(i18n.language);
                                                                                            if (log.timestamp) {
                                                                                                const ts = safeDate(log.timestamp);
                                                                                                if (ts) return `${dateStr} - ${ts.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}`;
                                                                                            }
                                                                                            return dateStr;
                                                                                        })()}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3">
                                                                                        {log.mg && (
                                                                                            <div className="text-sm text-pink-300">
                                                                                                <span className="font-bold text-lg">{log.mg}</span> {t('history.mgDaily')}
                                                                                            </div>
                                                                                        )}
                                                                                        {log.times != null && (
                                                                                            <div className="text-xs text-gray-400">
                                                                                                ({log.times} {log.times === 1 ? t('history.use') : t('history.uses')})
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {log.notes && (
                                                                                        <div className="text-sm mt-1 italic text-gray-300">
                                                                                            💭 {log.notes}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex gap-2 ml-2">
                                                                                    {openEditDailyLog && <button onClick={() => openEditDailyLog(log)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>}
                                                                                    <button onClick={() => deleteItem('dailyLogs', log.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                } else if (item.type === 'cycle') {
                                                                    const cycle = item.data;
                                                                    return (
                                                                        <div key={`cycle-${cycle.id}`} className="bg-indigo-900/30 border-indigo-700/50 p-3 rounded-lg border">
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <div className="text-sm font-medium text-white">
                                                                                    🌙 {(() => {
                                                                                        const d = safeDate(cycle.timestamp);
                                                                                        return d ? `${d.toLocaleDateString(i18n.language)} ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : t('history.invalidDate');
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    <button onClick={() => openEditCycle(cycle)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>
                                                                                    <button onClick={() => deleteItem('cycles', cycle.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            {cycle.bedtime && (
                                                                                <div className="text-sm mb-1 text-gray-300">
                                                                                    <span className="text-gray-400">{t('history.bedtime')} </span>
                                                                                    <span className="font-medium">{cycle.bedtime}</span>
                                                                                </div>
                                                                            )}
                                                                            {cycle.sleep != null && (
                                                                                <div className="text-sm mb-1 text-gray-300">
                                                                                    <span className="text-gray-400">{t('history.sleepHours')} </span>
                                                                                    <span className="font-medium">{cycle.sleep}h</span>
                                                                                </div>
                                                                            )}
                                                                            {cycle.triggers && cycle.triggers.length > 0 && (
                                                                                <div className="text-sm mb-1 text-gray-300">
                                                                                    <span className="text-gray-400">{t('history.triggers')} </span>
                                                                                    <span className="font-medium">{cycle.triggers.map(trTrigger).join(', ')}</span>
                                                                                </div>
                                                                            )}
                                                                            {cycle.lastBefore00 && (
                                                                                <div className="text-sm mb-1 text-green-300">
                                                                                    <span>✓ Último consumo antes da meia-noite</span>
                                                                                </div>
                                                                            )}
                                                                            {cycle.notes && <div className="text-sm mt-2 italic text-gray-300">💭 {cycle.notes}</div>}
                                                                        </div>
                                                                    );
                                                                } else if (item.type === 'wellbeing') {
                                                                    const w = item.data;
                                                                    return (
                                                                        <div key={`w-${w.id}`} className="bg-blue-900/30 border-blue-700/50 p-3 rounded-lg border">
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <div className="text-sm font-medium text-white">
                                                                                    💚 {(() => {
                                                                                        const d = safeDate(w.timestamp || w.date);
                                                                                        if (!d) return t('history.invalidDate');
                                                                                        const dateStr = d.toLocaleDateString(i18n.language);
                                                                                        const timeStr = w.timestamp ? ` - ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {openEditWellbeingLog && <button onClick={() => openEditWellbeingLog(w)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                                    <button onClick={() => deleteItem('wellbeingLogs', w.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            {(w.mood || w.energy) && (
                                                                                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                                                                    {w.mood && (
                                                                                        <div className="text-center">
                                                                                            <div className="text-xs text-gray-300">{t('history.moodLabel')}</div>
                                                                                            <div className="text-lg font-bold text-blue-400">{w.mood}/10</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {w.energy && (
                                                                                        <div className="text-center">
                                                                                            <div className="text-xs text-gray-300">{t('history.energyLabel')}</div>
                                                                                            <div className="text-lg font-bold text-blue-400">{w.energy}/10</div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            <div className="flex flex-wrap gap-2 text-xs mb-2">
                                                                                {w.isAtypical && <span className="bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded-full">📌 {t('wellbeing.atypicalTag')}{w.atypicalReason ? ` · ${w.atypicalReason}` : ''}</span>}
                                                                                {(w.waterGlasses > 0) && <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">💧 {w.waterGlasses >= 50 ? `${w.waterGlasses}ml` : `${w.waterGlasses * 250}ml`}</span>}
                                                                                {w.exerciseType && <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">🏃 {w.exerciseType}{w.exerciseDuration ? ` · ${w.exerciseDuration}min` : ''}</span>}
                                                                                {w.food && <span className="bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded-full">🍽️ {t('history.foodTag')}</span>}
                                                                                {w.social && <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">👥 {t('history.socialTag')}</span>}
                                                                            </div>
                                                                            {w.emotions && w.emotions.length > 0 && (
                                                                                <div className="mb-2">
                                                                                    <div className="text-xs mb-1 text-gray-400">{t('history.emotionsLabel')}</div>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {w.emotions.map((emotion, i) => (
                                                                                            <span key={i} className="bg-blue-800/50 text-blue-300 text-xs px-2 py-1 rounded">
                                                                                                {trEmotion(emotion)}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {(w.symptoms && w.symptoms.length > 0 || w.customSymptom) && (
                                                                                <div className="mb-2">
                                                                                    <div className="text-xs mb-1 text-teal-400">{t('history.symptomsLabel')}</div>
                                                                                    <div className="flex flex-wrap gap-1">
                                                                                        {(w.symptoms || []).map(s => (
                                                                                            <span key={s} className="text-xs bg-teal-800/50 text-teal-300 px-2 py-0.5 rounded-full">{s.replace(/_/g,' ')}</span>
                                                                                        ))}
                                                                                        {w.customSymptom && <span className="text-xs bg-teal-800/50 text-teal-300 px-2 py-0.5 rounded-full">{w.customSymptom}</span>}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {w.notes && (
                                                                                <div className="text-sm mt-2 italic text-gray-300">
                                                                                    💭 {w.notes}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                } else if (item.type === 'reflection') {
                                                                    const r = item.data;
                                                                    const analysis = r.answer ? getCachedSentimentAnalysis(r.answer) : null;
                                                                    const isExpanded = expandedAnalysis === `reflection-${r.id}`;
                                                                    return (
                                                                        <div key={`r-${r.id}`} className="border-purple-500 bg-purple-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <div className="text-xs text-gray-400">
                                                                                    📝 {(() => {
                                                                                        const d = safeDate(r.timestamp || r.date);
                                                                                        if (!d) return t('history.invalidDate');
                                                                                        const dateStr = d.toLocaleDateString(i18n.language);
                                                                                        const timeStr = r.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {openEditReflection && <button onClick={() => openEditReflection(r)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                                    <button onClick={() => deleteItem('reflections', r.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm font-medium mb-1 text-purple-400">{r.question}</div>
                                                                            <div className="text-sm text-gray-300">{r.answer}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`reflection-${r.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-purple-800/50 text-purple-300 hover:bg-purple-800">
                                                                                        {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">{t('history.classification')} </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
                                                                                                    <div className="space-y-1">
                                                                                                        {analysis.details.filter(d => Math.abs(d.score) > 0.1).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 10).map((d, i) => (
                                                                                                            <div key={i} className="text-gray-300">
                                                                                                                • "<span className="font-medium">{d.word}</span>"
                                                                                                                <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                                    {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                } else if (item.type === 'weighing') {
                                                                    return renderWeighing(item.data);
                                                                } else {
                                                                    const thought = item.data;
                                                                    const analysis = thought.content ? getCachedSentimentAnalysis(thought.content) : null;
                                                                    const isExpanded = expandedAnalysis === `thought-${thought.id}`;
                                                                    return (
                                                                        <div key={`t-${thought.id}`} className="border-pink-500 bg-pink-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <div className="text-xs text-gray-400">
                                                                                    📝 {(() => {
                                                                                        const d = safeDate(thought.timestamp || thought.date);
                                                                                        if (!d) return t('history.invalidDate');
                                                                                        const dateStr = d.toLocaleDateString(i18n.language);
                                                                                        const timeStr = thought.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {openEditThought && <button onClick={() => openEditThought(thought)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                                    <button onClick={() => deleteItem('thoughts', thought.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm text-gray-300">{thought.content}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`thought-${thought.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-pink-800/50 text-pink-300 hover:bg-pink-800">
                                                                                        {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">{t('history.classification')} </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
                                                                                                    <div className="space-y-1">
                                                                                                        {analysis.details.filter(d => Math.abs(d.score) > 0.1).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 10).map((d, i) => (
                                                                                                            <div key={i} className="text-gray-300">
                                                                                                                • "<span className="font-medium">{d.word}</span>"
                                                                                                                <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                                    {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                            });
                                                        })()}
                                                    </div>
                                                    {(() => {
                                                        const totalItems = filteredConsumptions.length + filteredDailyLogs.length + filteredCycles.length + filteredWellbeing.length + filteredReflections.length + filteredThoughts.length;
                                                        const remaining = totalItems - allItemsToShow;
                                                        return remaining > 0 && (
                                                            <button
                                                                onClick={() => setAllItemsToShow(prev => prev + 20)}
                                                                className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-3 w-full py-2"
                                                            >
                                                                {t('history.showMore', { count: remaining })}
                                                            </button>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* Bloco dedicado: Dosagens (pesagens + registos de mg à mão) */}
                                            {historyTopic === 'pesagens' && (() => {
                                                // As duas formas de registar dosagem, numa lista só, por ordem
                                                // de data (mais recente primeiro).
                                                const doseItems = doseItemsSorted;
                                                return (
                                                <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                    <h3 className="font-semibold text-white mb-1 flex items-center gap-2">⚖️ {isEN ? 'Doses' : 'Dosagens'} ({doseItems.length})</h3>
                                                    <p className="text-xs text-gray-500 mb-4">{isEN ? 'Bag weighings (⚖️) and mg you logged (📝) — both ways of recording how much.' : 'Pesagens do saco (⚖️) e mg registados (📝) — as duas formas de registar quanto.'}</p>

                                                    {/* Total de mg por dia PRIMEIRO: é o que se procura ao entrar
                                                        aqui. Fica encurtado para não empurrar os registos para
                                                        fora do ecrã quando há muitas dosagens. */}
                                                    {/* Duas respostas diferentes, cada uma dita pelo nome: a MÉDIA vem só
                                                        da balança (nível geral, sem picos); o TOTAL POR DIA reparte pelos
                                                        toques (vê os picos, mas é estimado) e é o que a meta conta. */}
                                                    {weighedPeriods.length > 0 && (
                                                        <div className="mb-5 pb-4 border-b border-gray-700">
                                                            <h4 className="text-sm font-semibold text-white mb-1">{isEN ? 'Average from the scale · last 7 days' : 'Média pela balança · últimos 7 dias'}</h4>
                                                            {balanceWeek ? (
                                                                <>
                                                                    <p className="text-sm text-gray-200">≈ <span className="font-semibold text-green-300">{balanceWeek.mgPerDay} mg</span> {isEN ? 'per day' : 'por dia'} <span className="text-xs text-gray-500">· {isEN ? `the scale covers ~${balanceWeek.coveredDays} of ${balanceWeek.spanDays} days` : `a balança cobre ~${balanceWeek.coveredDays} dos ${balanceWeek.spanDays} dias`}</span></p>
                                                                    <p className="text-xs text-gray-500 mt-1">{isEN ? 'Everything that left the bag, divided by the time between weighings. It does not depend on your taps, but it hides peaks: one very high day gets diluted.' : 'Tudo o que saiu do saco a dividir pelo tempo entre pesagens. Não depende dos toques, mas esconde os picos: um dia muito alto fica diluído.'}</p>
                                                                </>
                                                            ) : (
                                                                <p className="text-xs text-gray-500">{isEN ? 'Not enough weighings in the last 7 days to know (at least 2 days covered).' : 'Ainda não se sabe: as pesagens dos últimos 7 dias cobrem menos de 2 dias.'}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* POR CICLO (acordar → acordar): o que a meta de mg conta quando há
                                                        ciclos registados. O "por dia" fica atrás de um toque. */}
                                                    {metrics?.mgByCycleMode && (
                                                        <div className="mb-5 pb-4 border-b border-gray-700">
                                                            <h4 className="text-sm font-semibold text-white mb-1">{isEN ? 'Total per cycle (wake → wake)' : 'Total por ciclo (acordar → acordar)'}</h4>
                                                            <p className="text-xs text-gray-500 mb-3">{isEN ? 'From when you woke up until you woke up again — this is what your mg goal counts. The app splits what left the bag across your taps, as if they were all the same size, so it is an estimate. It shows peaks. Cycles without a reliable value (a tap without a weighing, a day marked not logged or atypical, a missing wake-up) are not shown.' : 'De quando acordaste até voltares a acordar — é isto que a meta de mg conta. A app divide o que saiu do saco pelos toques, como se fossem todos do mesmo tamanho: por isso é uma estimativa. Mostra os picos. Ciclos sem valor fiável (um toque sem pesagem, um dia marcado "não registei" ou atípico, um acordar por registar) não aparecem.'}</p>
                                                            {(metrics.mgCycles || []).length === 0 ? (
                                                                <p className="text-xs text-gray-400">{isEN ? 'No cycle with a reliable value yet.' : 'Ainda não há nenhum ciclo com valor fiável.'}</p>
                                                            ) : (
                                                                <div className="space-y-1">
                                                                    {(showAllMgCycles ? metrics.mgCycles : metrics.mgCycles.slice(0, 7)).map(c => {
                                                                        const f = (ms) => { const d = new Date(ms); return `${d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }).replace(/\.$/, '')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
                                                                        return (
                                                                            <div key={`cy-${c.start}`} className="flex items-center justify-between gap-2 bg-gray-900/40 rounded px-3 py-1.5">
                                                                                <span className="text-[13px] text-gray-300">{f(c.start)} → {f(c.end)}</span>
                                                                                <span className="text-sm font-medium text-green-300 whitespace-nowrap">{c.mg} mg{c.manual ? ' ✍️' : ''}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {metrics.mgCycles.length > 7 && (
                                                                        <button onClick={() => setShowAllMgCycles(v => !v)} className="mt-2 text-xs text-indigo-300 hover:text-indigo-200 underline">
                                                                            {showAllMgCycles ? (isEN ? 'Show fewer' : 'Mostrar menos') : (isEN ? `Show all ${metrics.mgCycles.length}` : `Ver todos os ${metrics.mgCycles.length}`)}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {/* Mais de 36h sem acordar registado: a app não sabe se dormiste,
                                                                por isso pergunta em vez de adivinhar. */}
                                                            {(metrics.cycleGaps || []).length > 0 && (
                                                                <div className="mt-4 pt-3 border-t border-gray-700/60">
                                                                    <p className="text-xs text-amber-200/90 mb-2">{isEN
                                                                        ? `❓ Since 1 Oct (when the "Didn't sleep" button appeared), ${metrics.cycleGaps.length} time(s) more than 36 h went by without a wake-up logged — and without a day marked "not logged". The app does not know if you slept, so those cycles do not count. If you remember, log when you woke up — or "Didn't sleep". (Before 1 Oct, a long gap counts as a night without sleep.)`
                                                                        : `❓ Desde 1 de outubro (quando apareceu o botão "Não dormi"), ${metrics.cycleGaps.length} vez(es) passaram mais de 36 h sem registares um acordar — nem marcaste o dia como "não registei". A app não sabe se dormiste, por isso esses ciclos não contam. Se te lembrares, regista quando acordaste — ou "Não dormi". (Antes de 1 de outubro, um buraco longo conta como noite sem dormir.)`}</p>
                                                                    <div className="space-y-1">
                                                                        {(showAllCycleGaps ? metrics.cycleGaps : metrics.cycleGaps.slice(0, 3)).map(g => {
                                                                            const f = (ms) => { const d = new Date(ms); return `${d.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }).replace(/\.$/, '')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
                                                                            return (
                                                                                <div key={`gap-${g.start}`} className="flex items-center justify-between gap-2 bg-gray-900/40 rounded px-3 py-1.5">
                                                                                    <span className="text-[13px] text-gray-300">{f(g.start)} → {f(g.end)} <span className="text-gray-500">· ~{Math.round((g.end - g.start) / 3600000)} h</span></span>
                                                                                    <button onClick={() => setShowCycleModal(true)} className="text-xs text-amber-200 hover:text-amber-100 underline whitespace-nowrap">{isEN ? 'Log cycle' : 'Registar ciclo'}</button>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {metrics.cycleGaps.length > 3 && (
                                                                        <button onClick={() => setShowAllCycleGaps(v => !v)} className="mt-2 text-xs text-indigo-300 hover:text-indigo-200 underline">
                                                                            {showAllCycleGaps ? (isEN ? 'Show fewer' : 'Mostrar menos') : (isEN ? `Show all ${metrics.cycleGaps.length}` : `Ver todas as ${metrics.cycleGaps.length}`)}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {derivedDaysList.length > 0 && (
                                                        <div className="mb-5 pb-4 border-b border-gray-700">
                                                            {metrics?.mgByCycleMode ? (
                                                                <button onClick={() => setShowCalendarDays(v => !v)} aria-expanded={showCalendarDays} className="text-sm font-semibold text-white hover:text-gray-200 mb-1">
                                                                    {isEN ? 'Per calendar day (midnight to midnight)' : 'Por dia do calendário (meia-noite a meia-noite)'} {showCalendarDays ? '▴' : '▾'}
                                                                </button>
                                                            ) : (
                                                                <h4 className="text-sm font-semibold text-white mb-1">{isEN ? 'Total per day' : 'Total por dia'}</h4>
                                                            )}
                                                            {(!metrics?.mgByCycleMode || showCalendarDays) && (
                                                            <p className="text-xs text-gray-500 mb-3">{metrics?.mgByCycleMode
                                                                ? (isEN ? 'The same calculation, cut at midnight instead of when you wake up. Days without a reliable value are not shown.' : 'A mesma conta, cortada à meia-noite em vez de quando acordas. Dias sem valor fiável não aparecem.')
                                                                : (isEN ? 'How much on each day — this is what your mg goal counts. On weighed days, the app splits what left the bag across that period\'s taps, as if they were all the same size, so it is an estimate. It shows peaks. Days without a reliable value are not shown.' : 'Quanto foi em cada dia — é isto que a meta de mg conta. Nos dias pesados, a app divide o que saiu do saco pelos toques desse período, como se fossem todos do mesmo tamanho: por isso é uma estimativa. Mostra os picos. Dias sem valor fiável não aparecem.')}</p>
                                                            )}
                                                            <div className="space-y-1">
                                                                {(metrics?.mgByCycleMode && !showCalendarDays ? [] : showAllDoseDays ? derivedDaysList : derivedDaysList.slice(0, 7)).map(d => (
                                                                    <div key={d.date} className="flex items-center justify-between bg-gray-900/40 rounded px-3 py-1.5">
                                                                        <span className="text-sm text-gray-300">
                                                                            {(safeDate(d.date) || new Date(`${d.date}T12:00:00`)).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                                                                        </span>
                                                                        <span className="text-sm font-medium text-green-300">{d.mg} mg</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {derivedDaysList.length > 7 && (!metrics?.mgByCycleMode || showCalendarDays) && (
                                                                <button
                                                                    onClick={() => setShowAllDoseDays(v => !v)}
                                                                    className="mt-2 text-xs text-indigo-300 hover:text-indigo-200 underline"
                                                                >
                                                                    {showAllDoseDays
                                                                        ? (isEN ? 'Show fewer' : 'Mostrar menos')
                                                                        : (isEN ? `Show all ${derivedDaysList.length} days` : `Ver todos os ${derivedDaysList.length} dias`)}
                                                                </button>
                                                            )}

                                                            {/* Dias que NÃO aparecem em cima — e porquê. Saltar dias em
                                                                silêncio parece um erro; dizer o motivo é informação. */}
                                                            {/* Os dias sem valor são do "por dia do calendário": com ciclos,
                                                                ficam dentro dessa secção (fechada), para não parecer que
                                                                faltam no total por ciclo. */}
                                                            {missingMgDays.length > 0 && (!metrics?.mgByCycleMode || showCalendarDays) && (
                                                                <div className="mt-4 pt-3 border-t border-gray-700/60">
                                                                    <button
                                                                        onClick={() => setShowMissingMgDays(v => !v)}
                                                                        aria-expanded={showMissingMgDays}
                                                                        className="text-xs text-gray-400 hover:text-gray-200 underline"
                                                                    >
                                                                        {isEN
                                                                            ? `${missingMgDays.length} day(s) without an mg value — why?`
                                                                            : `${missingMgDays.length} dia(s) sem valor de mg — porquê?`}
                                                                    </button>
                                                                    {showMissingMgDays && (
                                                                        <div className="mt-2 space-y-1">
                                                                            {missingMgGroups.map(d => (
                                                                                <div key={`miss-${d.to}`} className="bg-gray-900/30 rounded px-3 py-1.5">
                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                        <span className="text-sm text-gray-400 whitespace-nowrap">
                                                                                            {(() => { const f = (k) => new Date(`${k}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }); return d.count > 1 ? `${f(d.from)} → ${f(d.to)}` : f(d.to); })()}
                                                                                        </span>
                                                                                        <span className="text-[11px] text-gray-500 text-right">
                                                                                            {mgGapReasonText(d.reason)}
                                                                                        </span>
                                                                                    </div>
                                                                                    {/* Os NÚMEROS que sustentam a suspeita — e o que é sólido:
                                                                                        o total do período saiu mesmo do saco. */}
                                                                                    {d.reason === 'missingTouches' && d.detail && d.detail.consumed != null && (
                                                                                        <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                                                                                            {isEN
                                                                                                ? `${d.detail.consumed} mg left the bag with only ${d.detail.doseCount} uses logged (≈${d.detail.mgPerDose} mg/use vs your usual ~${d.detail.typical}). If you remember the missing uses, add them and the value comes back — if not, the ${d.detail.consumed} mg are still counted under "Per weighed period" above.`
                                                                                                : `Saíram ${d.detail.consumed} mg do saco com apenas ${d.detail.doseCount} toques registados (≈${d.detail.mgPerDose} mg/toque, o teu normal ~${d.detail.typical}). Se te lembrares dos toques que faltam, regista-os e o valor volta — se não, os ${d.detail.consumed} mg continuam contados em "Por período pesado", aqui em cima.`}
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Período que atravessa dias "não registei": dizer o que
                                                                                        é sólido (o total do saco) e porque é que não dá para
                                                                                        repartir por dia. */}
                                                                                    {d.reason === 'unloggedDaysInPeriod' && d.detail && d.detail.consumed != null && (
                                                                                        <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                                                                                            {isEN
                                                                                                ? `At least ${d.detail.consumed} mg left the bag in a period that covers ${d.detail.dates.length} day(s) you marked as not logged (there may have been a refill that was never logged). There is no way to know how much was on each day — see the period under "Per weighed period".`
                                                                                                : `Saíram pelo menos ${d.detail.consumed} mg do saco num período que apanha ${d.detail.dates.length} dia(s) que marcaste como "não registei" (pode ter havido um enchimento por registar). Não se sabe quanto foi em cada dia — vês o período em "Por período pesado".`}
                                                                                        </div>
                                                                                    )}
                                                                                    {d.reason === 'unsureRefillInPeriod' && d.detail && d.detail.consumed != null && (
                                                                                        <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                                                                                            {isEN
                                                                                                ? `At least ${d.detail.consumed} mg left the bag in this period. You marked ${d.detail.dates.length} day(s) as "not sure if I refilled": if you did, more left. Your uses count as usual; the mg per day are not known — see the period under "Per weighed period".`
                                                                                                : `Saíram pelo menos ${d.detail.consumed} mg do saco neste período. Marcaste ${d.detail.dates.length} dia(s) como "não sei se enchi": se encheste, saiu mais. Os consumos contam normalmente; os mg de cada dia é que não se sabem — vês o período em "Por período pesado".`}
                                                                                        </div>
                                                                                    )}
                                                                                    {d.reason === 'emptyMgLog' && (
                                                                                        <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                                                                                            {isEN
                                                                                                ? 'There is a "Log mg" record for this day, but with no number in it (only the number of uses). If you remember the mg, open it (pencil, under Records) and fill it in.'
                                                                                                : 'Há um "Registar mg" deste dia, mas sem número lá dentro (só a contagem de consumos). Se te lembrares dos mg, abre-o (lápis, em Registos) e escreve-os.'}
                                                                                        </div>
                                                                                    )}
                                                                                    {d.reason === 'unlogged' && (
                                                                                        <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                                                                                            {isEN
                                                                                                ? 'Missing information, not a zero: this day is left out of the averages instead of dragging them down.'
                                                                                                : 'Informação em falta, não um zero: este dia fica de fora das médias em vez de as puxar para baixo.'}
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Dizer QUAL pesagem e QUE peso falta — sem isso a
                                                                                        mensagem não dá para agir. */}
                                                                                    {(d.reason === 'missingWeights' || d.reason === 'newBagMissingWeights') && d.detail && d.detail.missingTs && (
                                                                                        <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                                                                                            {isEN ? 'The weighing of ' : 'À pesagem de '}
                                                                                            <span className="text-gray-400">
                                                                                                {new Date(d.detail.missingTs).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                                                                                            </span>
                                                                                            {d.detail.missingField === 'full'
                                                                                                ? (isEN ? ' has no "full" weight (after filling).' : ' falta o peso depois de encheres o saco.')
                                                                                                : d.detail.missingField === 'before'
                                                                                                    ? (isEN ? ' has no "before" weight (before filling).' : ' falta o peso do saco antes de o encheres.')
                                                                                                    : (isEN ? ' has no empty-bag weight.' : ' falta o peso do saco vazio.')}
                                                                                            {isEN ? ' Edit it (pencil) to fill it in.' : ' Edita-a (lápis) para preencher.'}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* O QUE A BALANÇA SABE, independentemente dos toques: quanto
                                                        saiu do saco entre cada duas pesagens. Continua verdade
                                                        mesmo quando não dá para repartir por dia. */}
                                                    {weighedPeriods.length > 0 && (
                                                        <div className="mb-5 pb-4 border-b border-gray-700">
                                                            <button
                                                                onClick={() => setShowPeriods(v => !v)}
                                                                aria-expanded={showPeriods}
                                                                className="text-sm font-semibold text-white hover:text-gray-200"
                                                            >
                                                                {isEN ? 'Per weighed period' : 'Por período pesado'} {showPeriods ? '▴' : '▾'}
                                                            </button>
                                                            {showPeriods && (
                                                                <>
                                                                <p className="text-xs text-gray-500 mt-1 mb-2">
                                                                    {isEN
                                                                        ? 'What actually left the bag between two weighings. This comes from the scale, so it holds even when uses are missing.'
                                                                        : 'O que saiu mesmo do saco entre duas pesagens. Vem da balança, por isso vale mesmo quando faltam toques.'}
                                                                </p>
                                                                <div className="space-y-1">
                                                                    {weighedPeriods.slice(0, showAllPeriods ? undefined : 8).map(p => {
                                                                        const f = (ms) => new Date(ms).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
                                                                        return (
                                                                            <div key={`per-${p.start}-${p.end}`} className="bg-gray-900/40 rounded px-3 py-1.5">
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                    <span className="text-sm text-gray-300">{f(p.start)} → {f(p.end)}</span>
                                                                                    <span className="text-sm font-medium text-green-300">{(p.unloggedDays?.length > 0 || p.unsureDays?.length > 0) ? '≥ ' : ''}{p.consumed} mg</span>
                                                                                </div>
                                                                                <div className="text-[11px] text-gray-500">
                                                                                    {/* Duração REAL entre as duas pesagens (não dias de calendário:
                                                                                        "14 → 16" podiam ser 36h e apareciam como 3 dias). O mg por
                                                                                        24h só com pelo menos ~1 dia — um período de poucas horas
                                                                                        esticado a 24h dava um número que não aconteceu. */}
                                                                                    {(() => { const h = (p.end - p.start) / 3600000; return h < 48 ? `~${Math.max(1, Math.round(h))} h` : `~${Math.round(h / 24)} ${isEN ? 'days' : 'dias'}`; })()}
                                                                                    {' · '}{p.doseCount} {isEN ? 'uses' : 'toques'}
                                                                                    {p.mgPerDose != null && !(p.unloggedDays?.length > 0 || p.unsureDays?.length > 0) && <> · ≈{p.mgPerDose} mg/{isEN ? 'use' : 'toque'}</>}
                                                                                    {(p.end - p.start) >= 20 * 3600000 && !(p.unloggedDays?.length > 0 || p.unsureDays?.length > 0) && <>{' · ≈'}{Math.round(p.consumed / ((p.end - p.start) / 86400000))} mg {isEN ? 'per 24h' : 'por 24h'}</>}
                                                                                </div>
                                                                                {/* O total continua fiável (veio da balança); o mg/toque
                                                                                    é que não, porque faltam os toques desses dias. */}
                                                                                {p.unloggedDays && p.unloggedDays.length > 0 && (
                                                                                    <div className="text-[11px] text-amber-400/70 mt-0.5 leading-snug">
                                                                                        {isEN
                                                                                            ? `Includes ${p.unloggedDays.length} day(s) you marked as not logged. On those days there may have been a refill that was never logged, so at least ${p.consumed} mg left the bag — maybe more. And there is no way to know how much each use was.`
                                                                                            : `Apanha ${p.unloggedDays.length} dia(s) que marcaste como "não registei". Nesses dias pode ter havido um enchimento que não ficou registado: por isso saíram pelo menos ${p.consumed} mg — talvez mais. E não dá para saber quanto foi cada toque.`}
                                                                                    </div>
                                                                                )}
                                                                                {!(p.unloggedDays?.length > 0) && p.unsureDays?.length > 0 && (
                                                                                    <div className="text-[11px] text-amber-400/70 mt-0.5 leading-snug">
                                                                                        {isEN
                                                                                            ? `Includes ${p.unsureDays.length} day(s) you marked as "not sure if I refilled". If you did, more left the bag: at least ${p.consumed} mg — maybe more. Not split per day and left out of the average.`
                                                                                            : `Apanha ${p.unsureDays.length} dia(s) que marcaste como "não sei se enchi". Se encheste, saiu mais: pelo menos ${p.consumed} mg — talvez mais. Não se reparte por dia e fica fora da média.`}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {weighedPeriods.length > 8 && (
                                                                        <button
                                                                            onClick={() => setShowAllPeriods(v => !v)}
                                                                            className="mt-1 text-xs text-indigo-300 hover:text-indigo-200 underline"
                                                                        >
                                                                            {showAllPeriods
                                                                                ? (isEN ? 'Show fewer' : 'Mostrar menos')
                                                                                : (isEN ? `Show all ${weighedPeriods.length}` : `Ver todos os ${weighedPeriods.length}`)}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Título próprio para a lista de registos — sem ele, colava-se à
                                                        secção de cima e "260 mg postos no saco" parecia ser "o que
                                                        saiu do saco" (é o contrário: o que lá foi POSTO). */}
                                                    <h4 className="text-sm font-semibold text-white mb-1">
                                                        {isEN ? 'Records' : 'Registos'}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mb-3">
                                                        {isEN
                                                            ? 'Each weighing (how much you put IN the bag) and each mg entry, by date.'
                                                            : 'Cada pesagem (quanto PUSESTE no saco) e cada registo de mg, por data.'}
                                                    </p>
                                                    {doseItems.length === 0 ? (
                                                        <p className="text-sm text-gray-400">{isEN ? 'No doses recorded in this period.' : 'Sem dosagens registadas neste período.'}</p>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {doseItems.slice(0, doseItemsToShow).map(it => it.kind === 'w' ? renderWeighing(it.data) : renderMgLog(it.data))}
                                                        {doseItems.length > doseItemsToShow && (
                                                            <button
                                                                onClick={() => setDoseItemsToShow(prev => prev + PAGE)}
                                                                className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-3 w-full py-2"
                                                            >
                                                                {t('history.showMore', { count: doseItems.length - doseItemsToShow })}
                                                            </button>
                                                        )}
                                                        </div>
                                                    )}
                                                </div>
                                                );
                                            })()}

                                            {/* Timeline única para tab "diario" */}
                                            {historyTopic === 'diario' && (
                                                <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                    <h3 className="font-semibold text-white mb-1 flex items-center gap-2">📝 {isEN ? 'Journal' : 'Diário'} ({filteredReflections.length + filteredThoughts.length})</h3>
                                                    <p className="text-xs text-gray-500 mb-4">
                                                        ✍️ {filteredReflections.length} {isEN ? (filteredReflections.length === 1 ? 'reflection' : 'reflections') : (filteredReflections.length === 1 ? 'reflexão' : 'reflexões')}
                                                        {' · '}
                                                        📖 {filteredThoughts.length} {isEN ? (filteredThoughts.length === 1 ? 'thought' : 'thoughts') : (filteredThoughts.length === 1 ? 'pensamento' : 'pensamentos')}
                                                    </p>
                                                    <div className="space-y-4">
                                                        {diaryItemsSorted.slice(0, diaryToShow)
                                                            .map(item => {
                                                                if (item.type === 'reflection') {
                                                                    const r = item.data;
                                                                    const analysis = r.answer ? getCachedSentimentAnalysis(r.answer) : null;
                                                                    const isExpanded = expandedAnalysis === `reflection-${r.id}`;
                                                                    return (
                                                                        <div key={`r-${r.id}`} className="border-purple-500 bg-purple-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                            {/* Etiqueta: distinguir pelo NOME, não só pela cor. */}
                                                                            <div className="text-[11px] font-semibold uppercase tracking-wide text-purple-300 mb-1">
                                                                                ✍️ {isEN ? 'Reflection' : 'Reflexão'}
                                                                            </div>
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <div className="text-xs text-gray-400">
                                                                                    {(() => {
                                                                                        const d = safeDate(r.timestamp || r.date);
                                                                                        if (!d) return t('history.invalidDate');
                                                                                        const dateStr = d.toLocaleDateString(i18n.language);
                                                                                        const timeStr = r.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {openEditReflection && <button onClick={() => openEditReflection(r)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                                    <button onClick={() => deleteItem('reflections', r.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm font-medium mb-1 text-purple-400">{r.question}</div>
                                                                            <div className="text-sm text-gray-300">{r.answer}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`reflection-${r.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-purple-800/50 text-purple-300 hover:bg-purple-800">
                                                                                        {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">{t('history.classification')} </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
                                                                                                    <div className="space-y-1">
                                                                                                        {analysis.details.filter(d => Math.abs(d.score) > 0.1).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 10).map((d, i) => (
                                                                                                            <div key={i} className="text-gray-300">
                                                                                                                • "<span className="font-medium">{d.word}</span>"
                                                                                                                <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                                    {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                } else if (item.type === 'weighing') {
                                                                    return renderWeighing(item.data);
                                                                } else {
                                                                    const thought = item.data;
                                                                    const analysis = thought.content ? getCachedSentimentAnalysis(thought.content) : null;
                                                                    const isExpanded = expandedAnalysis === `thought-${thought.id}`;
                                                                    return (
                                                                        <div key={`t-${thought.id}`} className="border-pink-500 bg-pink-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                            {/* Etiqueta: distinguir pelo NOME, não só pela cor. */}
                                                                            <div className="text-[11px] font-semibold uppercase tracking-wide text-pink-300 mb-1">
                                                                                📖 {isEN ? 'Thought' : 'Pensamento'}
                                                                            </div>
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <div className="text-xs text-gray-400">
                                                                                    {(() => {
                                                                                        const d = safeDate(thought.timestamp || thought.date);
                                                                                        if (!d) return t('history.invalidDate');
                                                                                        const dateStr = d.toLocaleDateString(i18n.language);
                                                                                        const timeStr = thought.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                        return dateStr + timeStr;
                                                                                    })()}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {openEditThought && <button onClick={() => openEditThought(thought)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                                    <button onClick={() => deleteItem('thoughts', thought.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm text-gray-300">{thought.content}</div>
                                                                            {analysis && (
                                                                                <>
                                                                                    <button onClick={() => toggleAnalysis(`thought-${thought.id}`)} className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-pink-800/50 text-pink-300 hover:bg-pink-800">
                                                                                        {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                                    </button>
                                                                                    {isExpanded && (
                                                                                        <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                            <div className="mb-2">
                                                                                                <span className="font-medium text-white">{t('history.classification')} </span>
                                                                                                <span className={analysis.classification.includes('positive') ? 'text-green-400' : analysis.classification.includes('negative') ? 'text-red-400' : 'text-gray-400'}>
                                                                                                    {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                                </span>
                                                                                            </div>
                                                                                            {analysis.details && analysis.details.length > 0 && (
                                                                                                <div>
                                                                                                    <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
                                                                                                    <div className="space-y-1">
                                                                                                        {analysis.details.filter(d => Math.abs(d.score) > 0.1).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 10).map((d, i) => (
                                                                                                            <div key={i} className="text-gray-300">
                                                                                                                • "<span className="font-medium">{d.word}</span>"
                                                                                                                <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                                    {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                            })
                                                        }
                                                        {diaryItemsSorted.length > diaryToShow && (
                                                            <button
                                                                onClick={() => setDiaryToShow(prev => prev + PAGE)}
                                                                className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-3 w-full py-2"
                                                            >
                                                                {t('history.showMore', { count: diaryItemsSorted.length - diaryToShow })}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Blocos individuais para tabs específicas e tab "todos" */}
                                            {historyTopic !== 'diario' && filteredReflections.length > 0 && (
                                                <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.Brain className="w-4 h-4 text-purple-400" /> {t('history.sectionReflections')} ({filteredReflections.length})</h3>
                                                    <div className="space-y-4">
                                                        {filteredReflections.slice(0, reflectionsToShow).map(r => {
                                                            const analysis = r.answer ? getCachedSentimentAnalysis(r.answer) : null;
                                                                const isExpanded = expandedAnalysis === `reflection-${r.id}`;

                                                                return (
                                                                <div key={r.id} className="border-purple-500 bg-purple-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className="text-xs text-gray-400">
                                                                            {(() => {
                                                                                const d = safeDate(r.timestamp || r.date);
                                                                                if (!d) return t('history.invalidDate');
                                                                                const dateStr = d.toLocaleDateString(i18n.language);
                                                                                const timeStr = r.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                return dateStr + timeStr;
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('reflections', r.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    <div className="text-sm font-medium mb-1 text-purple-400">{r.question}</div>
                                                                    <div className="text-sm text-gray-300">{r.answer}</div>

                                                                    {analysis && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => toggleAnalysis(`reflection-${r.id}`)}
                                                                                className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-purple-800/50 text-purple-300 hover:bg-purple-800"
                                                                            >
                                                                                {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                            </button>

                                                                            {isExpanded && (
                                                                                <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                    <div className="mb-2">
                                                                                        <span className="font-medium text-white">{t('history.classification')} </span>
                                                                                        <span className={
                                                                                            analysis.classification.includes('positive') ? 'text-green-400' :
                                                                                            analysis.classification.includes('negative') ? 'text-red-400' :
                                                                                            'text-gray-400'
                                                                                        }>
                                                                                            {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                        </span>
                                                                                    </div>

                                                                                    {analysis.details && analysis.details.length > 0 && (
                                                                                        <div>
                                                                                            <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
                                                                                            <div className="space-y-1">
                                                                                                {analysis.details
                                                                                                    .filter(d => Math.abs(d.score) > 0.1)
                                                                                                    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
                                                                                                    .slice(0, 10)
                                                                                                    .map((d, i) => (
                                                                                                    <div key={i} className="text-gray-300">
                                                                                                        • "<span className="font-medium">{d.word}</span>"
                                                                                                        <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                            {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                        </span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )})}
                                                        </div>
                                                        {filteredReflections.length > reflectionsToShow && (
                                                            <button onClick={() => setReflectionsToShow(prev => prev + 10)} className="text-purple-400 hover:text-purple-300 text-sm font-medium mt-3 w-full py-2">
                                                                {t('history.showMore', { count: filteredReflections.length - reflectionsToShow })}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {historyTopic !== 'diario' && filteredThoughts.length > 0 && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.BookOpen className="w-4 h-4 text-pink-400" /> {t('history.sectionThoughts')} ({filteredThoughts.length})</h3>
                                                        <div className="space-y-4">
                                                            {filteredThoughts.slice(0, thoughtsToShow).map(thought => {
                                                                const analysis = thought.content ? getCachedSentimentAnalysis(thought.content) : null;
                                                                const isExpanded = expandedAnalysis === `thought-${thought.id}`;

                                                                return (
                                                                <div key={thought.id} className="border-pink-500 bg-pink-900/30 border-l-4 pl-4 py-2 rounded-r-lg">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className="text-xs text-gray-400">
                                                                            {(() => {
                                                                                const d = safeDate(thought.timestamp || thought.date);
                                                                                if (!d) return t('history.invalidDate');
                                                                                const dateStr = d.toLocaleDateString(i18n.language);
                                                                                const timeStr = thought.timestamp ? ` ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                return dateStr + timeStr;
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('thoughts', thought.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    <div className="text-sm text-gray-300">{thought.content}</div>

                                                                    {analysis && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => toggleAnalysis(`thought-${thought.id}`)}
                                                                                className="text-xs mt-2 px-2 py-1 rounded transition-colors bg-pink-800/50 text-pink-300 hover:bg-pink-800"
                                                                            >
                                                                                {isExpanded ? t('history.hideAnalysis') : t('history.showAnalysis')}
                                                                            </button>

                                                                            {isExpanded && (
                                                                                <div className="mt-2 p-3 rounded text-xs bg-gray-800/50 border border-gray-700">
                                                                                    <div className="mb-2">
                                                                                        <span className="font-medium text-white">{t('history.classification')} </span>
                                                                                        <span className={
                                                                                            analysis.classification.includes('positive') ? 'text-green-400' :
                                                                                            analysis.classification.includes('negative') ? 'text-red-400' :
                                                                                            'text-gray-400'
                                                                                        }>
                                                                                            {getSentimentDescription(analysis.classification)} (score: {analysis.score.toFixed(2)})
                                                                                        </span>
                                                                                    </div>

                                                                                    {analysis.details && analysis.details.length > 0 && (
                                                                                        <div>
                                                                                            <div className="font-medium mb-1 text-white">{t('history.detectedWords')}</div>
                                                                                            <div className="space-y-1">
                                                                                                {analysis.details
                                                                                                    .filter(d => Math.abs(d.score) > 0.1)
                                                                                                    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
                                                                                                    .slice(0, 10)
                                                                                                    .map((d, i) => (
                                                                                                    <div key={i} className="text-gray-300">
                                                                                                        • "<span className="font-medium">{d.word}</span>"
                                                                                                        <span className={d.score > 0 ? 'text-green-400' : 'text-red-400'}>
                                                                                                            {' '}({d.score > 0 ? '+' : ''}{d.score.toFixed(2)})
                                                                                                        </span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )})}
                                                        </div>
                                                        {filteredThoughts.length > thoughtsToShow && (
                                                            <button onClick={() => setThoughtsToShow(prev => prev + 10)} className="text-pink-400 hover:text-pink-300 text-sm font-medium mt-3 w-full py-2">
                                                                {t('history.showMore', { count: filteredThoughts.length - thoughtsToShow })}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {filteredWellbeing.length > 0 && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.Heart className="w-4 h-4 text-blue-400" /> {t('history.sectionState')} ({filteredWellbeing.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredWellbeing.slice(0, wellbeingToShow).map(w => (
                                                                <div key={w.id} className="bg-blue-900/30 border-blue-700/50 p-3 rounded-lg border">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className="text-sm font-medium text-white">
                                                                            {(() => {
                                                                                const d = safeDate(w.timestamp || w.date);
                                                                                if (!d) return t('history.invalidDate');
                                                                                const dateStr = d.toLocaleDateString(i18n.language);
                                                                                const timeStr = w.timestamp ? ` - ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                return dateStr + timeStr;
                                                                            })()}
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            {openEditWellbeingLog && <button onClick={() => openEditWellbeingLog(w)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>}
                                                                            <button onClick={() => deleteItem('wellbeingLogs', w.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                        </div>
                                                                    </div>
                                                                    {(w.mood || w.energy) && (
                                                                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                                                            {w.mood && (
                                                                                <div className="text-center">
                                                                                    <div className="text-xs text-gray-300">{t('history.moodLabel')}</div>
                                                                                    <div className="text-lg font-bold text-blue-400">{w.mood}/10</div>
                                                                                </div>
                                                                            )}
                                                                            {w.energy && (
                                                                                <div className="text-center">
                                                                                    <div className="text-xs text-gray-300">{t('history.energyLabel')}</div>
                                                                                    <div className="text-lg font-bold text-blue-400">{w.energy}/10</div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-wrap gap-2 text-xs mb-2">
                                                                        {w.isAtypical && <span className="bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded-full">📌 {t('wellbeing.atypicalTag')}{w.atypicalReason ? ` · ${w.atypicalReason}` : ''}</span>}
                                                                        {(w.waterGlasses > 0) && <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full">💧 {w.waterGlasses >= 50 ? `${w.waterGlasses}ml` : `${w.waterGlasses * 250}ml`}</span>}
                                                                        {w.exerciseType && <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">🏃 {w.exerciseType}{w.exerciseDuration ? ` · ${w.exerciseDuration}min` : ''}</span>}
                                                                        {(w.napDuration > 0) && <span className="bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">{t('wellbeing.napLabel')} {w.napDuration}min</span>}
                                                                        {w.food && <span className="bg-orange-900/50 text-orange-300 px-2 py-0.5 rounded-full">🍽️ {t('history.foodTag')}</span>}
                                                                        {w.social && <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">👥 {t('history.socialTag')}</span>}
                                                                    </div>
                                                                    {w.emotions && w.emotions.length > 0 && (
                                                                        <div className="mb-2">
                                                                            <div className="text-xs mb-1 text-gray-400">{t('history.emotionsLabel')}</div>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {w.emotions.map((emotion, i) => (
                                                                                    <span key={i} className="bg-blue-800/50 text-blue-300 text-xs px-2 py-1 rounded">
                                                                                        {trEmotion(emotion)}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {(w.symptoms && w.symptoms.length > 0 || w.customSymptom) && (
                                                                        <div className="mb-2">
                                                                            <div className="text-xs mb-1 text-teal-400">{t('history.symptomsLabel')}</div>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {(w.symptoms || []).map(s => (
                                                                                    <span key={s} className="text-xs bg-teal-800/50 text-teal-300 px-2 py-0.5 rounded-full">{s.replace(/_/g,' ')}</span>
                                                                                ))}
                                                                                {w.customSymptom && <span className="text-xs bg-teal-800/50 text-teal-300 px-2 py-0.5 rounded-full">{w.customSymptom}</span>}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {w.notes && (
                                                                        <div className="text-sm mt-2 italic text-gray-300">
                                                                            💭 {w.notes}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {filteredWellbeing.length > wellbeingToShow && (
                                                            <button onClick={() => setWellbeingToShow(prev => prev + 14)} className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-3 w-full py-2">
                                                                {t('history.showMore', { count: filteredWellbeing.length - wellbeingToShow })}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {(filteredConsumptions.length > 0 || filteredDailyLogs.length > 0) && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Icons.Clock className="w-4 h-4 text-purple-600" /> {t('history.headerLogs', { count: filteredConsumptions.length + filteredDailyLogs.length })}</h3>
                                                        <div className="space-y-3">
                                                            {consumptionLogsSorted.slice(0, consumptionsToShow).map(item => {
                                                                    if (item.type === 'consumption') {
                                                                        const c = item.data;
                                                                        return (
                                                                            <div key={`c-${c.id}`} className="bg-gray-700 border-gray-600 p-3 rounded-lg border">
                                                                                <div className="flex justify-between items-center">
                                                                                    <div>
                                                                                        <div className="font-medium text-white">
                                                                                            {formatDateTime(c.timestamp)}
                                                                                        </div>
                                                                                        {c.substances?.length > 0 && <div className="text-sm mt-1 text-gray-200">{formatSubstances(c.substances)}</div>}
{c.notes && <div className="text-sm mt-1 text-gray-300">💭 {c.notes}</div>}
                                                                                    </div>
                                                                                    <div className="flex gap-2 ml-2">
                                                                                        <button onClick={() => openEditConsumption(c)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>
                                                                                        <button onClick={() => deleteItem('consumptions', c.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    } else {
                                                                        const log = item.data;
                                                                        return (
                                                                            <div key={`l-${log.id}`} className="bg-pink-900/30 border-pink-700/50 p-3 rounded-lg border">
                                                                                <div className="flex justify-between items-center">
                                                                                    <div className="flex-1">
                                                                                        <div className="font-medium mb-1 text-white">
                                                                                            {(() => {
                                                                                                // Usar log.date (dia do registo) em vez de timestamp (quando foi criado)
                                                                                                const d = safeDate(log.date || log.timestamp);
                                                                                                if (!d) return t('history.invalidDate');
                                                                                                const dateStr = d.toLocaleDateString(i18n.language);
                                                                                                return dateStr;
                                                                                            })()}
                                                                                        </div>
                                                                                        <div className="flex items-center gap-3">
                                                                                            {log.mg && (
                                                                                                <div className="text-sm text-pink-300">
                                                                                                    <span className="font-bold text-lg">{log.mg}</span> {t('history.mgDaily')}
                                                                                                </div>
                                                                                            )}
                                                                                            {log.times != null && (
                                                                                                <div className="text-xs text-gray-400">
                                                                                                    ({log.times} {log.times === 1 ? t('history.use') : t('history.uses')})
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        {log.notes && (
                                                                                            <div className="text-sm mt-1 italic text-gray-300">
                                                                                                💭 {log.notes}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex gap-2 ml-2">
                                                                                    {openEditDailyLog && <button onClick={() => openEditDailyLog(log)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>}
                                                                                    <button onClick={() => deleteItem('dailyLogs', log.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                                </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                })
                                                            }
                                                            {consumptionLogsSorted.length > consumptionsToShow && (
                                                                <button
                                                                    onClick={() => setConsumptionsToShow(prev => prev + PAGE)}
                                                                    className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-3 w-full py-2"
                                                                >
                                                                    {t('history.showMore', { count: consumptionLogsSorted.length - consumptionsToShow })}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {filteredCycles.length > 0 && (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">{t('history.sectionCycles')} ({filteredCycles.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredCycles.slice(0, cyclesHistoryToShow).map(cycle => (
                                                                <div key={cycle.id} className="bg-indigo-900/30 border-indigo-700/50 p-3 rounded-lg border">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className="text-sm font-medium text-white">
                                                                            {(() => {
                                                                                const d = safeDate(cycle.timestamp);
                                                                                return d ? `${d.toLocaleDateString(i18n.language)} ${d.toLocaleTimeString(i18n.language, {hour: '2-digit', minute: '2-digit'})}` : 'Data inválida';
                                                                            })()}
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button onClick={() => openEditCycle(cycle)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-3 h-3" /></button>
                                                                            <button onClick={() => deleteItem('cycles', cycle.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                        </div>
                                                                    </div>
                                                                    {cycle.bedtime && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">{t('history.bedtime')} </span>
                                                                            <span className="font-medium">{cycle.bedtime}</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.sleep != null && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">{t('history.sleepHours')} </span>
                                                                            <span className="font-medium">{cycle.sleep}h</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.triggers && cycle.triggers.length > 0 && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">{t('history.triggers')} </span>
                                                                            <span className="font-medium">{cycle.triggers.join(', ')}</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.mg && (
                                                                        <div className="text-sm mb-1 text-gray-300">
                                                                            <span className="text-gray-400">{t('history.dailyUse')} </span>
                                                                            <span className="font-medium">{cycle.mg} mg</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.lastBefore00 && (
                                                                        <div className="text-sm mb-1 text-green-300">
                                                                            <span>✓ Último consumo antes da meia-noite</span>
                                                                        </div>
                                                                    )}

                                                                    {cycle.notes && <div className="text-sm mt-2 italic text-gray-300">💭 {cycle.notes}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {filteredCycles.length > cyclesHistoryToShow && (
                                                            <button
                                                                onClick={() => setCyclesHistoryToShow(prev => prev + 10)}
                                                                className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                                            >
                                                                Mostrar mais ({filteredCycles.length - cyclesHistoryToShow} restantes)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                        </div>
                                    )}
                                </div>
    );
}
