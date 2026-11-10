import React, { useMemo, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../components/Icons';
import * as analyticsService from '../services/analyticsService';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { themeClasses } from '../utils/classNames';
import { safeToISODate, getTodayKey, subtractDays, getDateKeyFromItem, datesInRange, goalCountsFrom, goalFirstDay, goalTargetForDay, gapCrossesDays, isDayMarkLog, meetsGoal, GOAL_DIRECTION, bedtimeMeetsTarget } from '../utils/helpers';
import { getEmotionCategory, EMOTION_CATEGORIES, EMOTION_EN } from '../constants/emotions';
import HeatmapChart from '../components/HeatmapChart';
import { PeriodBar, ViewTabs } from '../components/ui/PeriodBar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { averageRanks, spearmanPermutation, rangePermutation, MIN_SHIFT } from '../utils/stats';

const { getDateRangeForPeriod, filterByDateRange, getPeriodLabel, getGoalAchievement } = analyticsService;

export function PatternsView({
    patternsPeriod,
    setPatternsPeriod,
    patternsPeriodOffset,
    setPatternsPeriodOffset,
    patternView,
    setPatternView
}) {
    const { consumptions, wellbeingLogs, cycles, dailyLogs, goals, fullDataLoaded } = useData();
    // Meta de reduzir a frequência (consumos/dia), se a pessoa a tiver ativa.
    // É ela que decide se a Tendência e as barras podem ter cor de juízo:
    // sem meta, só descrição (regra do elogio).
    const freqGoal = (goals || []).find(g => g.type === 'reduce_frequency' && !g.completed) || null;
    // Meta de aumentar o intervalo entre consumos (horas), se ativa.
    const intervalGoal = (goals || []).find(g => g.type === 'increase_interval' && !g.completed) || null;
    // Cor de um número comparado com uma meta da pessoa (regra do elogio):
    // verde se cumpre, amarelo se não (como no Início; nunca vermelho).
    // Sem meta, ou sem valor: branco, só descrição.
    const goalTone = (type, goal, value) => {
        if (!goal) return 'text-white';
        const ok = meetsGoal(type, parseFloat(value), parseFloat(goal.target));
        return ok == null ? 'text-white' : ok ? 'text-green-400' : 'text-yellow-400';
    };
    const metrics = useMetrics();
    const { t, i18n } = useTranslation();

    // Meta ativa de um tipo (a mais recente que não está concluída), ou null.
    // É ela — e só ela — que dá licença para cor de juízo, ✓ ou "na direção
    // da tua meta" (regra do elogio). Sem meta: só descrição, cor neutra.
    const activeGoal = (type) => (goals || [])
        .filter(g => g.type === type && !g.completed)
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;

    // Números com vírgula em PT e sinal de menos a sério (como no cartão "Sinais de hoje").
    const fmtNum = (v, dec = 1) => {
        const s = Math.abs(v).toFixed(dec);
        return (v < 0 ? '−' : '') + (i18n.language === 'en' ? s : s.replace('.', ','));
    };
    // p para o ecrã: nunca "0" — com b = 0 diz-se "menos de 1 em m".
    const fmtP = (r) => r.b === 0
        ? t('patterns.riskLevel.pLessThan', { m: r.m })
        : t('patterns.riskLevel.pValue', { p: fmtNum(Number(r.p.toFixed(3)), 3) });

    // ===== COMPARAR DUAS JANELAS DE DIAS (antes vs agora) =====
    // Cada lado é uma lista de valores POR DIA, por ordem de data (o antes
    // primeiro). Testa-se com spearmanPermutation entre "que janela" (0/1) e o
    // valor do dia: desliza-se a fila dos dias como uma roda, por isso as
    // semanas pesadas continuam juntas e o acaso não parece mais fraco do que é.
    // Limiares (simples, para não dizer nada com quase nada):
    // - pelo menos WIN_MIN_SIDE dias com valor em CADA janela;
    // - pelo menos 2×MIN_SHIFT+1 (= 15) dias no total — é o mínimo com que o
    //   teste por deslocamento consegue correr (stats.js).
    // Abaixo disso a app mostra os números, mas diz que não sabe se a diferença
    // é mais do que acaso.
    const WIN_MIN_SIDE = 5;
    const windowTest = (prev, recent) => {
        const nPrev = prev.length, nRecent = recent.length;
        const minTotal = 2 * MIN_SHIFT + 1;
        if (nPrev < WIN_MIN_SIDE || nRecent < WIN_MIN_SIDE || nPrev + nRecent < minTotal) {
            return { status: 'few', nPrev, nRecent, minTotal };
        }
        const r = spearmanPermutation([...prev.map(() => 0), ...recent.map(() => 1)], [...prev, ...recent]);
        if (r.rho == null) return { status: 'flat', nPrev, nRecent, minTotal };
        // Decide com o MESMO p que se mostra (3 casas), como no cartão de hoje.
        const sig = Number(r.p.toFixed(3)) < 0.05;
        return { status: 'tested', nPrev, nRecent, minTotal, ...r, sig };
    };
    // Linha pequena, por baixo de cada comparação: em quantos dias se baseia
    // e se a diferença se distingue do acaso.
    const windowTestLine = (wt) => {
        if (!wt) return null;
        const a = wt.nPrev, b = wt.nRecent;
        if (wt.status === 'few') return t('patterns.cmp.few', 'Dias: {{a}} antes, {{b}} agora — poucos para saber se a diferença é mais do que acaso (são precisos {{side}} de cada lado e {{min}} no total).', { a, b, side: WIN_MIN_SIDE, min: wt.minTotal });
        if (wt.status === 'flat') return t('patterns.cmp.flat', 'Dias: {{a}} antes, {{b}} agora — os valores não variam, não há nada a comparar.', { a, b });
        return wt.sig
            ? t('patterns.cmp.sig', 'Dias: {{a}} antes, {{b}} agora — a diferença distingue-se do acaso ({{p}}).', { a, b, p: fmtP(wt) })
            : t('patterns.cmp.chance', 'Dias: {{a}} antes, {{b}} agora — a diferença não se distingue do acaso ({{p}}).', { a, b, p: fmtP(wt) });
    };
    // Cartão de meta com a lista dos dias aberta (id da meta) — para se ver dia
    // a dia de onde vem a percentagem.
    const [openGoalDays, setOpenGoalDays] = useState(null);

    // ===== MEMOIZED DATA COMPUTATION =====
    const patternsData = useMemo(() => {
        const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
        const allFilteredConsumptions = filterByDateRange(consumptions, dateRange);
        const allFilteredWellbeingLogs = filterByDateRange(wellbeingLogs, dateRange);
        const allFilteredCycles = filterByDateRange(cycles, dateRange);
        const allFilteredDailyLogs = filterByDateRange(dailyLogs, dateRange);

        const atypicalDates = new Set(
            allFilteredWellbeingLogs
                .filter(w => w.isAtypical)
                .map(w => w.date || safeToISODate(w.timestamp))
                .filter(Boolean)
        );
        const atypicalCount = atypicalDates.size;

        // Dias marcados "não registei" saem das contas aqui TAMBÉM. Sem isto, os
        // Padrões e as Análises davam números diferentes para o mesmo período —
        // e não há forma de a pessoa saber qual deles acreditar.
        const unloggedDates = metrics?.unloggedDates || new Set();
        // Um só conjunto de dias de fora (atípicos + "não registei"), usado
        // aqui e nas metas.
        const excludedDates = new Set([...atypicalDates, ...unloggedDates]);
        const excluded = (date) => excludedDates.has(date);
        const unloggedCount = [...unloggedDates].filter(d => {
            if (!dateRange || !dateRange.start) return true;
            const t = new Date(`${d}T12:00:00`).getTime();
            return t >= dateRange.start.getTime() && t <= dateRange.end.getTime();
        }).length;

        const filteredConsumptions = allFilteredConsumptions.filter(c => !excluded(c.date || safeToISODate(c.timestamp)));
        // Bem-estar e ciclos (sono) só saem nos dias ATÍPICOS: "não registei os
        // consumos" não apaga o sono nem o humor desse dia. As contas que dependem
        // do consumo continuam a deixar esses dias de fora (excludedDates).
        const filteredWellbeingLogs = allFilteredWellbeingLogs.filter(w => !atypicalDates.has(w.date || safeToISODate(w.timestamp)));
        const filteredCycles = allFilteredCycles.filter(c => !atypicalDates.has(c.date || safeToISODate(c.timestamp)));
        // A própria marca não é um registo.
        const filteredDailyLogs = allFilteredDailyLogs.filter(l => !isDayMarkLog(l) && !excluded(l.date || safeToISODate(l.timestamp)));

        // mg POR DIA do período, da fonte unificada (metrics.dailySummary): o
        // "Registar mg" à mão manda; as pesagens do saco preenchem os outros dias.
        // Antes as secções de dosagem só viam o registo à mão.
        const summary = metrics?.dailySummary || {};
        const periodMgDays = [...new Set(filteredConsumptions.map(c => c.date || safeToISODate(c.timestamp)).filter(Boolean))]
            .map(date => ({ date, mg: summary[date]?.mg, timestamp: `${date}T12:00:00` }))
            .filter(r => r.mg != null && r.mg > 0);

        return { dateRange, atypicalDates, excludedDates, atypicalCount, unloggedCount, filteredConsumptions, filteredWellbeingLogs, filteredCycles, filteredDailyLogs, periodMgDays };
    }, [consumptions, wellbeingLogs, cycles, dailyLogs, patternsPeriod, patternsPeriodOffset, metrics?.unloggedDates, metrics?.dailySummary]);

    // O PRIMEIRO DIA com algum registo, de sempre ('YYYY-MM-DD', dia local).
    // Serve de denominador às médias "por dia": os dias de antes de a pessoa
    // começar a usar a app não são dias "a zero" — simplesmente não se sabe.
    // Sem registo nenhum → null (e as médias por dia ficam sem valor).
    // Dias "conhecidos": dias com QUALQUER registo (consumo, bem-estar, ciclo,
    // registo de mg). Só esses entram numa média "por dia": um dia com registos
    // mas sem consumos é um 0 verdadeiro; um dia sem registo nenhum não se sabe
    // (a app não estava a ser usada) e não conta como 0. Antes contava-se tudo
    // desde o 1.º registo de sempre — um registo antigo solto chegava para
    // meter centenas de dias "a zero" e afundar a média.
    const knownDays = useMemo(() => {
        const set = new Set();
        const see = (k) => { if (k) set.add(k); };
        consumptions.forEach(c => see(getDateKeyFromItem(c)));
        wellbeingLogs.forEach(w => see(getDateKeyFromItem(w)));
        cycles.forEach(c => see(getDateKeyFromItem(c)));
        dailyLogs.forEach(l => { if (!isDayMarkLog(l)) see(getDateKeyFromItem(l)); });
        // Resumos por dia: no arranque podem ter dias que os registos ainda não carregaram.
        Object.keys(metrics?.consumptionDailyRollup || {}).forEach(see);
        return set;
    }, [consumptions, wellbeingLogs, cycles, dailyLogs, metrics?.consumptionDailyRollup]);
    const firstRecordDay = useMemo(() => {
        let first = null;
        knownDays.forEach(k => { if (!first || k < first) first = k; });
        return first;
    }, [knownDays]);

    // ===== SINAIS DE HOJE (cartão do Painel) =====
    // Os sinais somam-se com pesos fixos, escritos à mão — nunca foram tirados
    // dos registos de ninguém. Por isso, antes de dizer alguma coisa sobre hoje,
    // a app VERIFICA nos registos da própria pessoa se esta soma costumou andar
    // junto com o número de consumos do dia. Se não andou (ou se ainda há poucos
    // dias para saber), diz isso mesmo.
    // Fica num useMemo: a verificação (umas dezenas de deslizes) só volta a correr
    // quando os dados mudam, não a cada toque no ecrã.
    const forecastTodayKey = getTodayKey();
    const forecastModel = useMemo(() => {
        // Agregar dados por dia
        const parseSafe = (val) => { const n = parseFloat(val); return isNaN(n) ? null : n; };
        const dailyData = {};
        // Track mood/energy sums and counts for averaging
        const moodCounts = {}, energyCounts = {};
        const ensureDay = (date) => {
            if (!dailyData[date]) dailyData[date] = { sleep: null, mood: null, energy: null, water: false, rest: false, food: false, social: false, consumptions: 0, mg: null };
        };

        wellbeingLogs.forEach(w => {
            const date = w.date || safeToISODate(w.timestamp);
            if (!date) return;
            ensureDay(date);
            if (w.mood != null) {
                const v = parseSafe(w.mood);
                if (v !== null) {
                    moodCounts[date] = moodCounts[date] || { sum: 0, n: 0 };
                    moodCounts[date].sum += v; moodCounts[date].n++;
                    dailyData[date].mood = moodCounts[date].sum / moodCounts[date].n;
                }
            }
            if (w.energy != null) {
                const v = parseSafe(w.energy);
                if (v !== null) {
                    energyCounts[date] = energyCounts[date] || { sum: 0, n: 0 };
                    energyCounts[date].sum += v; energyCounts[date].n++;
                    dailyData[date].energy = energyCounts[date].sum / energyCounts[date].n;
                }
            }
            if (w.water || (w.waterGlasses > 0)) dailyData[date].water = true;
            if (w.rest || (w.exercise && w.exercise.trim()) || w.exerciseType || (w.exerciseDuration > 0)) dailyData[date].rest = true;
            if (w.food) dailyData[date].food = true;
            if (w.social) dailyData[date].social = true;
        });
        cycles.forEach(c => {
            const date = c.date || safeToISODate(c.timestamp);
            if (!date || c.sleep == null) return;
            ensureDay(date);
            const napMins = wellbeingLogs
                .filter(w => (w.date || safeToISODate(w.timestamp)) === date && w.napDuration > 0)
                .reduce((sum, w) => sum + (w.napDuration || 0), 0);
            dailyData[date].sleep = parseFloat(c.sleep) + napMins / 60;
        });
        // mg por dia da fonte unificada (à mão ou pesagens do saco).
        Object.entries(metrics?.dailySummary || {}).forEach(([date, sday]) => {
            if (!(sday?.mg > 0)) return;
            ensureDay(date);
            dailyData[date].mg = sday.mg;
        });
        consumptions.forEach(c => {
            const date = c.date || safeToISODate(c.timestamp);
            if (!date) return;
            ensureDay(date);
            dailyData[date].consumptions++;
        });

        // Emoções de cada dia, juntas uma só vez (antes procurava-se na lista
        // toda para cada dia — com centenas de dias a verificar ficava lento).
        const emotionsByDay = {};
        wellbeingLogs.forEach(w => {
            const date = w.date || safeToISODate(w.timestamp);
            if (!date) return;
            (emotionsByDay[date] = emotionsByDay[date] || []).push(...(w.emotions || []));
        });

        // Dias com dados, por ordem, e somas acumuladas de consumos por dia da
        // semana: pre*[i] = totais dos i primeiros dias da lista. Assim, para
        // qualquer dia de referência, sabe-se a média "das sextas" só com os
        // dias ANTERIORES a ele, sem voltar a percorrer tudo.
        const sortedKeys = Object.keys(dailyData).sort();
        const dowOf = (key) => new Date(`${key}T12:00:00`).getDay(); // dia LOCAL
        const preSum = [new Array(7).fill(0)], preCnt = [new Array(7).fill(0)], preTotal = [0];
        sortedKeys.forEach((k, i) => {
            const s = preSum[i].slice(), c = preCnt[i].slice();
            const dow = dowOf(k);
            s[dow] += dailyData[k].consumptions; c[dow]++;
            preSum.push(s); preCnt.push(c); preTotal.push(preTotal[i] + dailyData[k].consumptions);
        });
        // Quantos dias da lista vêm ANTES de refKey (procura binária).
        const countBefore = (refKey) => {
            let lo = 0, hi = sortedKeys.length;
            while (lo < hi) { const mid = (lo + hi) >> 1; if (sortedKeys[mid] < refKey) lo = mid + 1; else hi = mid; }
            return lo;
        };

        // ── SCORE PARA UM DIA QUALQUER ────────────────────────────
        // Os mesmos sinais e os mesmos pesos de sempre, mas contados a partir
        // de um dia de referência (refKey): "ontem" = refKey − 1, etc. Para
        // hoje dá exatamente o que o cartão dava antes.
        // strict = true (verificação no passado): o dia da semana e a tendência
        // de consumo só olham para dias ANTERIORES a refKey — nunca para o
        // próprio dia nem para depois (seria espreitar a resposta).
        // Hoje também usa strict: o cartão mostra exatamente a conta que foi
        // verificada no passado (e não mistura os consumos de hoje, ainda a meio).
        // strict = false fica só como opção.
        // tr = função de tradução: só com ela se monta a lista de fatores (na
        // verificação do passado só interessa o número).
        const scoreFor = (refKey, { strict = false, tr = null, lang = 'pt' } = {}) => {
            const ref = new Date(`${refKey}T12:00:00`);
            const getDS = (n) => { const d = new Date(ref); d.setDate(d.getDate() - n); return safeToISODate(d); };
            const d1 = getDS(1), d2 = getDS(2), d3 = getDS(3);
            if (![d1, d2, d3].some(d => dailyData[d])) return { hasInputs: false, score: null, factors: [], weeksOfData: 0 };

            // Média ponderada 3 dias: ontem ×3, anteontem ×2, há 3 dias ×1
            const wavg = (field) => {
                const pts = [{ d: d1, w: 3 }, { d: d2, w: 2 }, { d: d3, w: 1 }].filter(p => dailyData[p.d]?.[field] != null);
                if (!pts.length) return null;
                const tw = pts.reduce((s, p) => s + p.w, 0);
                return pts.reduce((s, p) => s + dailyData[p.d][field] * p.w, 0) / tw;
            };
            const sleep = wavg('sleep'), mood = wavg('mood'), energy = wavg('energy');
            const fmt = (v) => v != null ? v.toFixed(1) : '?';

            // Autocuidado médio (ontem + anteontem)
            const yd = dailyData[d1] || {};
            const scDays = [d1, d2].filter(d => dailyData[d]);
            let selfCareAvg = null;
            if (scDays.length > 0) {
                const scores = scDays.map(d => {
                    const day = dailyData[d];
                    return (day.water ? 1 : 0) + (day.rest ? 1 : 0) + (day.food ? 1 : 0) + (day.social ? 1 : 0);
                });
                selfCareAvg = scores.reduce((s, v) => s + v, 0) / scores.length;
            }
            // Detalhes de ontem para display
            const selfCareDetails = [];
            if (yd.water) selfCareDetails.push(lang === 'en' ? 'Water' : 'Água');
            if (yd.rest) selfCareDetails.push(lang === 'en' ? 'Rest' : 'Descanso');
            if (yd.food) selfCareDetails.push(lang === 'en' ? 'Food' : 'Alimentação');
            if (yd.social) selfCareDetails.push('Social');

            // Emoções (d1, d2, d3) — valência e instabilidade
            const emotionsD1 = emotionsByDay[d1] || [];
            const emotionsD2 = emotionsByDay[d2] || [];
            const emotionsD3 = emotionsByDay[d3] || [];
            const allRecentEmotions = [...emotionsD1, ...emotionsD2, ...emotionsD3];
            const negEmotions = allRecentEmotions.filter(e => EMOTION_CATEGORIES.negative.includes(e));
            const posEmotions = allRecentEmotions.filter(e => EMOTION_CATEGORIES.positive.includes(e));
            const totalEmotions = allRecentEmotions.length;
            const negRatio = totalEmotions >= 2 ? negEmotions.length / totalEmotions : null;
            const hasCravingYesterday = emotionsD1.includes('🔥 Com craving');
            const uniqueD1 = new Set(emotionsD1).size;
            const emotionFlux = emotionsD1.length > 0 && emotionsD2.length > 0
                ? emotionsD1.filter(e => !emotionsD2.includes(e)).length
                : 0;
            const emotionallyUnstable = uniqueD1 >= 5 || emotionFlux >= 4;

            // Tendência humor/energia nos 7 dias antes de refKey (oldest→newest)
            const calcTrend = (field) => {
                const vals = Array.from({ length: 7 }, (_, i) => dailyData[getDS(7 - i)]?.[field] ?? null).filter(v => v != null);
                if (vals.length < 3) return 0;
                const h = Math.floor(vals.length / 2);
                return (vals.slice(-h).reduce((s, v) => s + v, 0) / h) - (vals.slice(0, h).reduce((s, v) => s + v, 0) / h);
            };
            const moodTrend = calcTrend('mood'), energyTrend = calcTrend('energy');

            // mg "ontem" vs. média dos 30 dias anteriores
            const mgYesterday = yd.mg ?? null;
            const mgHistory = Array.from({ length: 30 }, (_, i) => dailyData[getDS(i + 2)]?.mg).filter(v => v != null && v > 0);
            const mgAvg = mgHistory.length >= 7 ? mgHistory.reduce((s, v) => s + v, 0) / mgHistory.length : null;

            // Dia da semana (com as somas acumuladas)
            const nDays = strict ? countBefore(refKey) : sortedKeys.length;
            const weeksOfData = nDays / 7;
            const refDOW = ref.getDay();
            const dowCount = preCnt[nDays][refDOW];
            const todayAvg = dowCount ? preSum[nDays][refDOW] / dowCount : null;
            const overallAvg = preTotal[nDays] / nDays;

            // Tendência consumo: os últimos 7 dias com dados (antes de refKey, se strict)
            const l7c = sortedKeys.slice(Math.max(0, nDays - 7), nDays).map(d => dailyData[d].consumptions);
            const trendRecent = l7c.length >= 6
                ? (l7c.slice(-3).reduce((s, c) => s + c, 0) / 3) - (l7c.slice(0, 3).reduce((s, c) => s + c, 0) / 3)
                : 0;

            // ── CALCULAR SCORE ──────────────────────────────────
            // add(pontos, fator): soma sempre os pontos; o texto do fator só
            // se escreve quando há tradução (o cartão de hoje).
            let riskScore = 30;
            const riskFactors = [];
            const add = (points, makeFactor) => { riskScore += points; if (tr) riskFactors.push(makeFactor()); };
            const lbl = lang === 'en' ? '(avg 3d)' : '(média 3 dias)';

            // 1. Sono — horas dormidas (média pond. 3 dias)
            if (sleep !== null) {
                if (sleep < 4) add(20, () => ({ emoji: '😴', positive: false, text: tr('patterns.riskLevel.sleepVeryLow', { lbl, value: fmt(sleep) }) }));
                else if (sleep < 6) add(10, () => ({ emoji: '😴', positive: false, text: tr('patterns.riskLevel.sleepLow', { lbl, value: fmt(sleep) }) }));
                else if (sleep >= 7) add(-10, () => ({ emoji: '😴', positive: true, text: tr('patterns.riskLevel.sleepGood', { lbl, value: fmt(sleep) }) }));
            }

            // 2. Humor (média pond. 3 dias) — pesos reduzidos pois tendência já captura a variação
            if (mood !== null) {
                if (mood < 4) add(10, () => ({ emoji: '😔', positive: false, text: tr('patterns.riskLevel.moodVeryLow', { lbl, value: fmt(mood) }) }));
                else if (mood < 6) add(5, () => ({ emoji: '😐', positive: false, text: tr('patterns.riskLevel.moodModerate', { lbl, value: fmt(mood) }) }));
                else if (mood >= 7) add(-8, () => ({ emoji: '😊', positive: true, text: tr('patterns.riskLevel.moodGood', { lbl, value: fmt(mood) }) }));
            }

            // 3. Energia (média pond. 3 dias) — pesos reduzidos
            if (energy !== null) {
                if (energy < 4) add(10, () => ({ emoji: '🔋', positive: false, text: tr('patterns.riskLevel.energyVeryLow', { lbl, value: fmt(energy) }) }));
                else if (energy < 6) add(5, () => ({ emoji: '🪫', positive: false, text: tr('patterns.riskLevel.energyModerate', { lbl, value: fmt(energy) }) }));
                else if (energy >= 7) add(-8, () => ({ emoji: '⚡', positive: true, text: tr('patterns.riskLevel.energyGood', { lbl, value: fmt(energy) }) }));
            }

            // 4. Autocuidado (média 2 dias)
            if (selfCareAvg !== null) {
                const scLbl = () => tr(scDays.length > 1 ? 'patterns.riskLevel.selfCareAvg2d' : 'patterns.riskLevel.selfCareYesterday');
                if (selfCareAvg < 1) add(15, () => ({ emoji: '⚠️', positive: false, text: tr('patterns.riskLevel.noSelfCare') }));
                else if (selfCareAvg < 2) add(8, () => ({ emoji: '⚠️', positive: false, text: tr('patterns.riskLevel.minSelfCare', { items: selfCareDetails.join(', ') }) }));
                else if (selfCareAvg < 3) add(0, () => ({ emoji: '🟡', positive: null, text: tr('patterns.riskLevel.selfCarePartial', { lbl: scLbl(), value: selfCareAvg.toFixed(1) }) }));
                else add(-12, () => ({ emoji: '✅', positive: true, text: tr('patterns.riskLevel.goodSelfCare', { score: selfCareAvg.toFixed(1), items: selfCareDetails.join(', ') }) }));
            }

            // 5. Tendência humor/energia (últimos 7 dias)
            if (moodTrend < -1.5 || energyTrend < -1.5) {
                add(12, () => {
                    const which = moodTrend < -1.5 && energyTrend < -1.5
                        ? tr('patterns.riskLevel.moodEnergyDeclining')
                        : moodTrend < -1.5 ? tr('patterns.riskLevel.moodDeclining') : tr('patterns.riskLevel.energyDeclining');
                    return { emoji: '📉', positive: false, text: tr('patterns.riskLevel.trendDeclining', { which }) };
                });
            } else if (moodTrend > 1.5 && energyTrend > 1.5) {
                add(-8, () => ({ emoji: '📈', positive: true, text: tr('patterns.riskLevel.trendImproving') }));
            }

            // 6. mg ontem vs. média histórica
            if (mgYesterday !== null && mgAvg !== null) {
                if (mgYesterday > mgAvg * 1.4) add(12, () => ({ emoji: '💊', positive: null, text: tr('patterns.riskLevel.mgWayAbove', { yesterday: mgYesterday, avg: Math.round(mgAvg) }) }));
                else if (mgYesterday > mgAvg * 1.2) add(6, () => ({ emoji: '💊', positive: null, text: tr('patterns.riskLevel.mgAbove', { yesterday: mgYesterday, avg: Math.round(mgAvg) }) }));
                else if (mgYesterday < mgAvg * 0.8) add(-6, () => ({ emoji: '💊', positive: null, text: tr('patterns.riskLevel.mgBelow', { yesterday: mgYesterday, avg: Math.round(mgAvg) }) }));
            }

            // 7. Dia da semana — só ativo com ≥ 4 semanas de dados
            if (weeksOfData >= 4 && todayAvg !== null && todayAvg > overallAvg * 1.3) {
                add(12, () => {
                    const dayNames = tr('analyses.dayNames', { returnObjects: true });
                    return { emoji: '📅', positive: null, text: tr('patterns.riskLevel.highDayOfWeek', { day: dayNames[refDOW] }) };
                });
            }

            // 8. Tendência consumo últimos 7 dias
            if (trendRecent > 0.5) add(10, () => ({ emoji: '📊', positive: null, text: tr('patterns.riskLevel.trendIncreasing') }));
            else if (trendRecent < -0.5) add(-10, () => ({ emoji: '📊', positive: null, text: tr('patterns.riskLevel.trendDecreasing') }));

            // 9. Emoções — craving, valência e instabilidade
            if (hasCravingYesterday) add(15, () => ({ emoji: '🔥', positive: false, text: tr('patterns.riskLevel.cravingYesterday') }));
            if (negRatio !== null) {
                if (negRatio > 0.6 && totalEmotions >= 3) add(12, () => ({ emoji: '😰', positive: false, text: tr('patterns.riskLevel.emotionsMajorityNeg', { pct: Math.round(negRatio * 100) }) }));
                else if (negRatio > 0.4 && totalEmotions >= 2) add(6, () => ({ emoji: '😐', positive: false, text: tr('patterns.riskLevel.emotionsHalfNeg', { pct: Math.round(negRatio * 100) }) }));
                else if (negRatio < 0.25 && posEmotions.length >= 3) add(-8, () => ({ emoji: '💚', positive: true, text: tr('patterns.riskLevel.emotionsMostlyPos') }));
            }
            if (emotionallyUnstable) add(8, () => ({ emoji: '🌊', positive: false, text: tr('patterns.riskLevel.emotionsUnstable') }));

            riskScore = Math.max(0, Math.min(100, riskScore));
            return { hasInputs: true, score: riskScore, factors: riskFactors, weeksOfData };
        };

        // ── VERIFICAÇÃO NOS REGISTOS DA PESSOA ────────────────────
        // Para cada dia D do passado (nunca hoje): o score que a app teria dado
        // nesse dia, só com o que se sabia ANTES dele, ao lado do número de
        // consumos que houve mesmo em D. Entram só dias conhecidos (com algum
        // registo — aí 0 consumos é um 0 verdadeiro), fora dos atípicos e dos
        // "não registei", e com algum registo nos 3 dias anteriores (a mesma
        // regra do "dados insuficientes" de hoje).
        const MIN_DAYS = 30;
        const excludedAll = new Set([...(metrics?.atypicalDates || []), ...(metrics?.unloggedDates || [])]);
        const pastScores = [], pastUses = [];
        for (const D of sortedKeys) {
            if (D >= forecastTodayKey) break;
            if (excludedAll.has(D)) continue;
            const r = scoreFor(D, { strict: true });
            if (!r.hasInputs) continue;
            pastScores.push(r.score);
            pastUses.push(dailyData[D].consumptions);
        }
        const n = pastScores.length;

        // Histórico ainda a carregar (só há os últimos dias) → não se sabe.
        let check;
        if (!fullDataLoaded) check = { status: 'loading', n, min: MIN_DAYS };
        else if (n < MIN_DAYS) check = { status: 'few', n, min: MIN_DAYS };
        else {
            const test = spearmanPermutation(pastScores, pastUses);
            if (test.rho == null) check = { status: 'flat', n, min: MIN_DAYS };
            else {
                // Terços dos dias passados pelo score, com a posição a meio dos
                // empates: (ordem − 0,5) / n. Abaixo de 1/3 = dias com menos
                // sinais; acima de 2/3 = dias com mais sinais.
                const ranks = averageRanks(pastScores);
                let hiSum = 0, hiN = 0, loSum = 0, loN = 0;
                ranks.forEach((r, i) => {
                    const pos = (r - 0.5) / n;
                    if (pos > 2 / 3) { hiSum += pastUses[i]; hiN++; }
                    else if (pos < 1 / 3) { loSum += pastUses[i]; loN++; }
                });
                check = {
                    status: 'tested', n, min: MIN_DAYS, ...test, scores: pastScores,
                    hiMean: hiN ? hiSum / hiN : null, hiN, loMean: loN ? loSum / loN : null, loN,
                };
            }
        }

        return { scoreFor, check };
    }, [consumptions, wellbeingLogs, cycles, metrics?.dailySummary, metrics?.atypicalDates, metrics?.unloggedDates, fullDataLoaded, forecastTodayKey]);

    return (
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-bold text-white">{t('patterns.title')}</h2>

                                    {/* Período e vistas: uma linha de texto + pílulas (ver PeriodBar). */}
                            <PeriodBar
                                periods={['hoje', 'semana', 'mes', 'tudo'].map(id => ({ id, label: t('patterns.periods.' + id) }))}
                                value={patternsPeriod}
                                onChange={(id) => { setPatternsPeriod(id); setPatternsPeriodOffset(0); }}
                                rangeLabel={patternsPeriod !== 'tudo' ? getPeriodLabel(patternsPeriod, patternsPeriodOffset) : null}
                                onOlder={() => setPatternsPeriodOffset(patternsPeriodOffset + 1)}
                                onNewer={() => setPatternsPeriodOffset(Math.max(0, patternsPeriodOffset - 1))}
                                canNewer={patternsPeriodOffset > 0}
                            />
                            <ViewTabs
                                tabs={['dashboard', 'progress', 'temporal', 'estrutural'].map(id => ({ id, label: t('patterns.views.' + id) }))}
                                value={patternView}
                                onChange={setPatternView}
                            />

                                    {(() => {
                                        // Usar dados pré-computados do useMemo (evita recomputação em cada render)
                                        const { dateRange, atypicalDates, excludedDates, atypicalCount, unloggedCount, filteredConsumptions, filteredWellbeingLogs, filteredCycles, filteredDailyLogs, periodMgDays } = patternsData;

                                        // DIAS COMPLETOS DO PERÍODO que contam para médias e padrões: conhecidos
                                        // (com algum registo), fora dos atípicos/"não registei", desde o 1.º
                                        // registo de sempre — e SEM HOJE, que ainda vai a meio (os consumos que
                                        // faltam puxavam médias e tendências para baixo). Hoje continua nos
                                        // totais e no registo em si.
                                        const todayKeyP = getTodayKey();
                                        const periodDoneDays = (() => {
                                            if (!firstRecordDay) return [];
                                            const fromKey = [dateRange.start ? safeToISODate(dateRange.start) : null, firstRecordDay].filter(Boolean).sort().pop();
                                            const toKey = [dateRange.end ? safeToISODate(dateRange.end) : todayKeyP, todayKeyP].sort()[0];
                                            return datesInRange(fromKey, toKey).filter(d => d !== todayKeyP && !excludedDates.has(d) && knownDays.has(d));
                                        })();
                                        const periodHasToday = !dateRange.start || (safeToISODate(dateRange.start) <= todayKeyP && todayKeyP <= safeToISODate(dateRange.end));

                                        // Nota dias atípicos (mostrar em qualquer view)
                                        const atypicalBanner = (atypicalCount > 0 || unloggedCount > 0) ? (
                                            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2 text-xs text-yellow-400 flex items-center gap-2 mb-2">
                                                <span>📌</span>
                                                <span>
                                                    {atypicalCount > 0 && t('wellbeing.atypicalBanner', { count: atypicalCount })}
                                                    {atypicalCount > 0 && unloggedCount > 0 && ' · '}
                                                    {unloggedCount > 0 && (i18n.language === 'en'
                                                        ? `${unloggedCount} day(s) marked "not logged" are left out`
                                                        : `${unloggedCount} dia(s) marcado(s) "não registei" ficam de fora`)}
                                                </span>
                                            </div>
                                        ) : null;

                                        // DASHBOARD (COMPACTO)
                                        if (patternView === 'dashboard') {
                                            if (filteredConsumptions.length === 0 && filteredWellbeingLogs.length === 0) return (<div className={'bg-gray-800 border-gray-700 text-gray-400' + ' rounded-xl p-6 border text-center'}>{t('patterns.noData')}</div>);

                                            // Calculate metrics — LER do resumo-por-dia (rollup) em vez de
                                            // percorrer todos os consumos. Filtra os dias do período.
                                            const rollup = metrics.consumptionDailyRollup || {};
                                            const inRange = (dk) => {
                                                if (!dateRange.start || !dateRange.end) return true; // "tudo"
                                                const d = new Date(dk + 'T12:00:00');
                                                return d >= dateRange.start && d <= dateRange.end;
                                            };
                                            const byDate = {};
                                            const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
                                            let totalConsumptions = 0;
                                            for (const dk in rollup) {
                                                if (!inRange(dk)) continue;
                                                const v = rollup[dk];
                                                if (!v.count) continue;
                                                byDate[dk] = v.count;
                                                totalConsumptions += v.count;
                                                byPartOfDay.manha += v.manha;
                                                byPartOfDay.tarde += v.tarde;
                                                byPartOfDay.noite += v.noite;
                                                byPartOfDay.madrugada += v.madrugada;
                                            }
                                            const uniqueDays = Object.keys(byDate).length;
                                            // Média por dia: total ÷ dias do período que CONTAM — os que não estão
                                            // de fora (atípicos / "não registei"), desde o 1.º registo de sempre e
                                            // até hoje. Um dia sem consumos conta como 0; os dias de antes de a
                                            // pessoa começar a usar a app não contam. Antes dividia só pelos dias
                                            // COM consumo, o que escondia os dias a zero e inchava a média.
                                            // HOJE FICA DE FORA DA MÉDIA (mas não do Total): o dia de hoje ainda vai a
                                            // meio e os consumos que faltam puxavam a média para baixo. Numerador e
                                            // denominador são os MESMOS dias (conhecidos, não excluídos, completos).
                                            const avgDays = periodDoneDays;
                                            const avgPerDay = avgDays.length > 0
                                                ? (avgDays.reduce((s, d) => s + (rollup[d]?.count || 0), 0) / avgDays.length).toFixed(1)
                                                : '—';
                                            const todayInPeriod = periodHasToday;

                                            // Calculate average interval
                                            const sorted = [...filteredConsumptions].sort((a,b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
                                            const intervals = [];
                                            for (let i = 1; i < sorted.length; i++) {
                                                const t1 = new Date(sorted[i].timestamp).getTime(), t0 = new Date(sorted[i-1].timestamp).getTime();
                                                if (gapCrossesDays(t0, t1, excludedDates)) continue; // passa por dia sem registo → não se sabe
                                                // Só intervalos dentro do mesmo dia, como a meta "aumentar intervalo"
                                                // conta. Antes entrava também a noite (último de um dia → primeiro do
                                                // seguinte), o que inchava a média: dava ~24h ÷ consumos por dia.
                                                if (getDateKeyFromItem(sorted[i]) !== getDateKeyFromItem(sorted[i-1])) continue;
                                                intervals.push((t1 - t0) / 3600000);
                                            }
                                            // Sem intervalos não há média: "—", nunca um "0h" inventado.
                                            const avgInterval = intervals.length > 0 ? (intervals.reduce((sum, i) => sum + i, 0) / intervals.length).toFixed(1) : null;

                                            // Get dates for calendar
                                            const dates = Object.keys(byDate).sort();

                                            // (parte-do-dia já calculada acima a partir do resumo)

                                            // TENDÊNCIA (30 dias). Antes: regressão sobre os 31 dias até HOJE, com
                                            // hoje (a meio) a contar como um dia baixo no fim da reta, os dias sem
                                            // registo nenhum a contar como 0 e os atípicos/"não registei" lá dentro;
                                            // e uma projeção "daqui a 10 dias" que a app não tem como saber.
                                            // Agora: os 30 dias COMPLETOS antes de hoje, só dias conhecidos e fora
                                            // dos excluídos; a direção só se afirma se o teste por deslocamento
                                            // (spearmanPermutation dia × consumos) a distinguir do acaso. Com menos
                                            // de 15 dias (2×MIN_SHIFT+1) o teste não corre e a app diz que não sabe.
                                            const calculateTrend = () => {
                                                const outAll = new Set([...(metrics?.atypicalDates || []), ...(metrics?.unloggedDates || [])]);
                                                const todayKeyT = getTodayKey();
                                                const from = safeToISODate(subtractDays(new Date(`${todayKeyT}T12:00:00`), 30));
                                                const to = safeToISODate(subtractDays(new Date(`${todayKeyT}T12:00:00`), 1));
                                                const days = datesInRange(from, to).filter(d => knownDays.has(d) && !outAll.has(d));
                                                const minDays = 2 * MIN_SHIFT + 1;
                                                if (days.length < minDays) return { status: 'few', n: days.length, min: minDays };
                                                // x = posição do dia na janela de 30 (dias em falta deixam buraco).
                                                const all = datesInRange(from, to);
                                                const xs = days.map(d => all.indexOf(d));
                                                const ys = days.map(d => rollup[d]?.count || 0);
                                                const n = xs.length;
                                                const mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
                                                let sxy = 0, sxx = 0;
                                                for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
                                                const slope = sxx > 0 ? sxy / sxx : 0;
                                                // Valores da reta no 1.º e no último dia da janela: "de ~A para ~B por dia".
                                                const fitFirst = Math.max(0, my + slope * (0 - mx));
                                                const fitLast = Math.max(0, my + slope * ((all.length - 1) - mx));
                                                const test = spearmanPermutation(xs, ys);
                                                if (test.rho == null) return { status: 'flat', n, avg: my };
                                                const sig = Number(test.p.toFixed(3)) < 0.05;
                                                const direction = !sig ? 'chance' : test.rho > 0 ? 'increasing' : 'decreasing';
                                                return { status: 'tested', n, avg: my, fitFirst, fitLast, direction, ...test };
                                            };

                                            const trend = calculateTrend();

                                            // "Padrões identificados" — só descrição, e cada frase tem um ramo onde
                                            // recusa: com menos de INSIGHT_MIN_DAYS dias completos (7 = uma semana)
                                            // o "dia com menos" e as percentagens por parte do dia são quase só acaso,
                                            // por isso diz-se quantos dias há e quantos faltam.
                                            // Dias que contam: conhecidos, fora dos atípicos/"não registei" e SEM HOJE
                                            // (a meio: parecia sempre "o dia com menos" e enviesava as partes do dia
                                            // para as horas que já passaram). Um dia conhecido sem consumos é um 0 e
                                            // entra (antes só entravam dias com consumo).
                                            const INSIGHT_MIN_DAYS = 7;
                                            const insights = [];
                                            if (patternsPeriod !== 'hoje') {
                                                const doneDays = avgDays; // mesmos dias da média por dia (sem hoje)
                                                if (doneDays.length < INSIGHT_MIN_DAYS) {
                                                    insights.push({ text: t('patterns.insight.few', 'Ainda há poucos dias para procurar padrões — há {{n}} dias completos com registos; são precisos {{min}}.', { n: doneDays.length, min: INSIGHT_MIN_DAYS }), type: 'info' });
                                                } else {
                                                    // Dia com menos consumos (o mais recente, se houver empate).
                                                    const minCount = Math.min(...doneDays.map(d => rollup[d]?.count || 0));
                                                    const minDays = doneDays.filter(d => (rollup[d]?.count || 0) === minCount);
                                                    const lastMin = minDays[minDays.length - 1];
                                                    const dayName = new Date(lastMin + 'T12:00:00').toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'pt-PT', { weekday: 'long', day: 'numeric', month: 'short' });
                                                    insights.push({
                                                        text: minDays.length === 1
                                                            ? t('patterns.insight.minDay', 'Em {{n}} dias completos, o dia com menos consumos foi {{date}}, com {{count}}.', { n: doneDays.length, date: dayName, count: minCount })
                                                            : t('patterns.insight.minDayTie', 'Em {{n}} dias completos, o mínimo foi {{count}} consumos por dia, em {{k}} dias (o mais recente: {{date}}).', { n: doneDays.length, date: dayName, count: minCount, k: minDays.length }),
                                                        type: 'info'
                                                    });
                                                    // Parte do dia com mais consumos, nos mesmos dias.
                                                    const parts = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
                                                    doneDays.forEach(d => { const v = rollup[d]; if (v) Object.keys(parts).forEach(k => { parts[k] += v[k] || 0; }); });
                                                    const partsTotal = Object.values(parts).reduce((a, b) => a + b, 0);
                                                    const top = Object.entries(parts).reduce((m, c) => c[1] > m[1] ? c : m, ['', 0]);
                                                    if (partsTotal > 0 && top[1] > 0) {
                                                        insights.push({
                                                            text: t('patterns.insight.partOfDay', 'Em {{n}} dias completos, {{percent}}% dos consumos ({{k}} de {{total}}) foram de {{part}}.', { n: doneDays.length, percent: Math.round((top[1] / partsTotal) * 100), k: top[1], total: partsTotal, part: t('patterns.partOfDay.' + top[0]).toLowerCase() }),
                                                            type: 'info'
                                                        });
                                                    }
                                                }
                                            }

                                            // Calculate goals analysis for dashboard
                                            let goalsAnalysis = null;
                                            if (goals.length > 0) {
                                                // Filter to get only the most recent goal of each type
                                                const uniqueGoals = [];
                                                const goalsByType = {};

                                                goals.forEach(g => {
                                                    if (!goalsByType[g.type] || new Date(g.createdAt) > new Date(goalsByType[g.type].createdAt)) {
                                                        goalsByType[g.type] = g;
                                                    }
                                                });

                                                uniqueGoals.push(...Object.values(goalsByType));

                                                // (o número de dias da "Média por dia" é calculado abaixo, a partir dos
                                                //  dias que as metas contam de facto.)

                                                // (totalAchievements é calculado ABAIXO, a partir do goalBreakdown, para
                                                //  respeitar a guarda createdAt e bater certo com a soma dos cartões.)

                                                // O período escolhido, em 'YYYY-MM-DD' — igual para todas as metas.
                                                const periodFrom = dateRange?.start ? safeToISODate(dateRange.start) : null;
                                                const periodTo = dateRange?.end ? safeToISODate(dateRange.end) : null;

                                                const goalBreakdown = uniqueGoals.map(g => {
                                                    // Não contar dias de antes de a meta existir; cada dia conta
                                                    // com o alvo que estava em vigor nesse dia (goalTargetForDay).
                                                    const goalCreatedAt = goalFirstDay(g);
                                                    // Cumpridos e possíveis vêm da MESMA conta (analyticsService.getGoalAchievement),
                                                    // para a percentagem não misturar regras diferentes.
                                                    // O período começa no mais tarde de: início do período escolhido
                                                    // ou dia em que a meta foi criada.
                                                    const fromDate = [periodFrom, goalCreatedAt].filter(Boolean).sort().pop() || null;
                                                    const { achieved: achievementCount, possible: totalPossible, days: goalDays } = getGoalAchievement(
                                                        g, filteredConsumptions, filteredDailyLogs, filteredCycles, filteredWellbeingLogs,
                                                        {
                                                            fromDate,
                                                            toDate: periodTo,
                                                            targetForDay: (d) => goalTargetForDay(g, d),
                                                            excludedDates,
                                                            nightExcludedDates: atypicalDates,
                                                            measuredMgByDate: metrics?.weighingMeasuredMgByDate || {},
                                                            mgCycles: metrics?.mgByCycleMode ? metrics.mgCycles : undefined,
                                                            allCycles: cycles,
                                                            allConsumptions: consumptions,
                                                        }
                                                    );

                                                    // Sem dias que contem não há percentagem: "ainda não se sabe", não 0%.
                                                    const successRate = totalPossible > 0 ? (achievementCount / totalPossible) * 100 : null;

                                                    // Meta de mg: a média POR 24 HORAS dos MESMOS ciclos (ou dias) que a
                                                    // meta conta — venham do "Registar mg" ou da balança. Soma dos mg a
                                                    // dividir pelo TEMPO que esses ciclos duram: um ciclo de 2 dias (noite
                                                    // sem dormir) conta como 2 dias, em vez de pesar como um dia só.
                                                    // Descritiva, sem ✓/✗. Com menos de 2, não se sabe.
                                                    let mgAvg = null;
                                                    if (g.type === 'reduce_quantity') {
                                                        const counted = new Set((goalDays || []).map(dd => dd.d));
                                                        const cyc = metrics?.mgByCycleMode ? (metrics.mgCycles || []).filter(c => counted.has(c.day)) : null;
                                                        if (cyc && cyc.length >= 2) {
                                                            const mg = cyc.reduce((a, c) => a + c.mg, 0);
                                                            const days = cyc.reduce((a, c) => a + (c.end - c.start), 0) / 86400000;
                                                            if (days > 0) mgAvg = { mg: Math.round(mg / days), n: cyc.length };
                                                        } else if (!cyc) {
                                                            const vals = (goalDays || []).map(dd => Number(dd.value)).filter(v => Number.isFinite(v));
                                                            if (vals.length >= 2) mgAvg = { mg: Math.round(vals.reduce((a, v) => a + v, 0) / vals.length), n: vals.length };
                                                        }
                                                    }

                                                    return {
                                                        ...g,
                                                        achievementCount,
                                                        totalPossible,
                                                        successRate,
                                                        goalDays,
                                                        mgAvg,
                                                        countsFrom: fromDate,
                                                        currentFrom: goalCountsFrom(g),
                                                    };
                                                });

                                                // Total = soma dos cumprimentos por meta (já com a guarda createdAt).
                                                // Antes somava dados em bruto (contava até de antes de a meta existir),
                                                // por isso dava números impossíveis tipo "700".
                                                const totalAchievements = goalBreakdown.reduce((sum, gb) => sum + (gb.achievementCount || 0), 0);
                                                // Média por dia: cumprimentos ÷ dias que as metas CONTAM (a união dos
                                                // dias de getGoalAchievement). Antes dividia por 7/30 fixos (ou pelos
                                                // dias com consumo, em "Tudo"), contando hoje — que as metas do dia não
                                                // contam, por ainda ir a meio (as do sono contam a noite de hoje, que já
                                                // acabou) — e dias de antes de haver metas.
                                                // Sem dias que contem → null ("não se sabe"), nunca 0.
                                                const periodDays = new Set(goalBreakdown.flatMap(gb => (gb.goalDays || []).map(dd => dd.d))).size;
                                                const avgAchievementsPerDay = periodDays > 0 ? totalAchievements / periodDays : null;
                                                const goalsWithAchievements = goalBreakdown.filter(g => g.achievementCount > 0).length;

                                                goalsAnalysis = {
                                                    totalAchievements,
                                                    totalGoals: uniqueGoals.length,
                                                    avgAchievementsPerDay: avgAchievementsPerDay == null ? '—' : fmtNum(avgAchievementsPerDay, 1),
                                                    goalsWithAchievements,
                                                    goalBreakdown,
                                                    activeGoals: uniqueGoals.filter(g => !g.completed).length,
                                                    periodDays
                                                };
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {atypicalBanner}

                                                    {/* Métricas essenciais */}
                                                    <div className="grid grid-cols-3 divide-x divide-gray-700 border-y border-gray-700 py-2">
                                                        <div className="px-2 py-1 text-center">
                                                            <div className="text-xs mb-1 text-gray-300 leading-tight min-h-[2rem] flex items-center justify-center">{t('patterns.dashboard.metricTotal')}</div>
                                                            <div className={'text-white' + ' text-2xl font-bold font-mono-theme'}>{totalConsumptions}x</div>
                                                        </div>
                                                        <div className="px-2 py-1 text-center">
                                                            <div className="text-xs mb-1 text-gray-300 leading-tight min-h-[2rem] flex items-center justify-center">{t('patterns.dashboard.metricAvgDay')}</div>
                                                            <div className={goalTone('reduce_frequency', freqGoal, avgPerDay) + ' text-2xl font-bold font-mono-theme'}>{avgPerDay}</div>
                                                            {/* Em quantos dias se baseia a média e porque é que hoje não entra. */}
                                                            <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                                                                {avgDays.length > 0
                                                                    ? (todayInPeriod
                                                                        ? t('patterns.dashboard.avgDaysNoToday', '{{n}} dia(s), sem hoje', { n: avgDays.length })
                                                                        : t('patterns.dashboard.avgDays', '{{n}} dia(s)', { n: avgDays.length }))
                                                                    : todayInPeriod
                                                                        ? t('patterns.dashboard.avgNoDays', 'hoje ainda vai a meio')
                                                                        : t('patterns.dashboard.avgNoKnownDays', 'sem dias com registos')}
                                                            </div>
                                                        </div>
                                                        <div className="px-2 py-1 text-center">
                                                            <div className="text-xs mb-1 text-gray-300 leading-tight min-h-[2rem] flex items-center justify-center">{t('patterns.dashboard.metricAvgInterval')}</div>
                                                            <div className={goalTone('increase_interval', intervalGoal, avgInterval) + ' text-2xl font-bold font-mono-theme'}>{avgInterval == null ? '—' : `${avgInterval}h`}</div>
                                                        </div>

                                                    </div>
                                                        {/* Esta semana: 7 barrinhas num só roxo apagado (sem verde/amarelo: a pedido
                                                            da Teresa). Com meta de frequência, uma linha tracejada marca o limite — a
                                                            pessoa vê se passou sem a cor julgar. Dia marcado "não registei" = "?",
                                                            não um zero; dia sem registo nenhum também é "?" (não se sabe). Hoje
                                                            ainda vai a meio: a barra fica mais clara, com contorno tracejado, e
                                                            diz "até agora" — não se lê como um dia baixo. */}
                                                        {(() => {
                                                            const unknown = metrics?.unloggedDates || new Set();
                                                            const days = Array.from({ length: 7 }, (_, i) => {
                                                                const d = subtractDays(new Date(), 6 - i);
                                                                const k = safeToISODate(d);
                                                                const isToday = i === 6;
                                                                return { k, isToday, n: rollup[k]?.count || 0, unk: unknown.has(k) || (!isToday && !knownDays.has(k)), label: isToday ? t('home.today') : d.toLocaleDateString(i18n.language, { weekday: 'short' }).replace(/\.$/, '') };
                                                            });
                                                            const tg = freqGoal ? parseFloat(freqGoal.target) : NaN;
                                                            const top = Math.max(1, ...days.map(d => d.n), Number.isFinite(tg) ? tg : 0);
                                                            return (
                                                                <div>
                                                                    <div className="flex justify-between text-[10px] font-mono-theme tracking-widest uppercase text-gray-500 mb-1.5">
                                                                        <span>{i18n.language === 'en' ? 'This week' : 'Esta semana'}</span>
                                                                        {Number.isFinite(tg) && <span>{i18n.language === 'en' ? 'goal' : 'meta'} ≤{tg}</span>}
                                                                    </div>
                                                                    <div className="relative grid grid-cols-7 gap-1.5 items-end h-14">
                                                                        {days.map(d => (
                                                                            <div key={d.k} className="h-full flex items-end">
                                                                                <div className="w-full rounded-t" style={{ height: d.unk ? '100%' : `${Math.max(4, (d.n / top) * 100)}%`, background: d.unk ? 'transparent' : d.isToday ? 'rgb(124 58 237 / 0.2)' : 'rgb(124 58 237 / 0.45)', border: d.unk ? '1px dashed rgb(255 255 255 / 0.2)' : d.isToday ? '1px dashed rgb(196 181 253 / 0.6)' : 'none' }} />
                                                                            </div>
                                                                        ))}
                                                                        {Number.isFinite(tg) && (
                                                                            <div className="absolute left-0 right-0 border-t border-dashed border-gray-400/60 pointer-events-none" style={{ bottom: `${(tg / top) * 100}%` }} />
                                                                        )}
                                                                    </div>
                                                                    <div className="grid grid-cols-7 gap-1.5 mt-1 text-center text-[10px] text-gray-500">
                                                                        {days.map(d => (
                                                                            <span key={d.k}><b className="block font-mono-theme text-[11px] text-gray-200">{d.unk ? '?' : d.n}</b>{d.label}{d.isToday && <span className="block text-[9px] leading-tight text-gray-500">{t('patterns.week.soFar', 'até agora')}</span>}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                    {/* Tendência (30 dias) */}
                                                    {(() => {
                                                        // Cor só com meta de reduzir a frequência (regra do elogio) E só
                                                        // quando a direção se distingue do acaso: a descer = verde (é a
                                                        // direção que a pessoa escolheu); a subir = amarelo, como os avisos
                                                        // "fora da meta" do Início (nunca vermelho). Resto: neutro.
                                                        const dir = trend.status === 'tested' ? trend.direction : null;
                                                        const tone = freqGoal && dir === 'decreasing' ? 'green' : freqGoal && dir === 'increasing' ? 'yellow' : 'gray';
                                                        const box = tone === 'green' ? 'bg-green-900/30 border-green-700/50' : tone === 'yellow' ? 'bg-yellow-900/20 border-yellow-600/50' : 'bg-gray-700/30 border-gray-600';
                                                        const head = tone === 'green' ? 'text-green-400' : tone === 'yellow' ? 'text-yellow-400' : 'text-gray-400';
                                                        let main, detail;
                                                        if (trend.status === 'few') {
                                                            main = t('patterns.trend.few', 'Ainda há poucos dias para isto — há {{n}} dias completos com registos nos últimos 30; são precisos {{min}}.', { n: trend.n, min: trend.min });
                                                        } else if (trend.status === 'flat') {
                                                            main = t('patterns.trend.flat', 'O mesmo número de consumos todos os dias (~{{avg}}/dia) — não há subida nem descida.', { avg: fmtNum(trend.avg, 1) });
                                                            detail = t('patterns.trend.basis', 'Em {{n}} dias completos (hoje fica de fora: ainda vai a meio).', { n: trend.n });
                                                        } else {
                                                            const vals = { from: fmtNum(trend.fitFirst, 1), to: fmtNum(trend.fitLast, 1), n: trend.n, rho: fmtNum(trend.rho, 2), p: fmtP(trend) };
                                                            main = trend.direction === 'increasing'
                                                                ? t('patterns.trend.up', 'A subir: a reta passa de ~{{from}} para ~{{to}} consumos/dia.', vals)
                                                                : trend.direction === 'decreasing'
                                                                    ? t('patterns.trend.down', 'A descer: a reta passa de ~{{from}} para ~{{to}} consumos/dia.', vals)
                                                                    : t('patterns.trend.chance', 'Sem subida nem descida que se distinga do acaso (~{{from}} → ~{{to}} consumos/dia na reta).', vals);
                                                            detail = t('patterns.trend.testNote', 'Em {{n}} dias completos (hoje fica de fora: ainda vai a meio). ρ = {{rho}}, {{p}}.', vals);
                                                        }
                                                        return (
                                                            <div className={box + ' rounded-lg p-4 border'}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className={'text-xs font-semibold uppercase tracking-wide ' + head}>
                                                                        {t('patterns.trend.title')}
                                                                    </div>
                                                                    {/* Sem ⚠️/✅: quem decide a direção é a meta da pessoa. */}
                                                                    <span className="text-2xl">📊</span>
                                                                </div>
                                                                <div className="text-sm leading-relaxed text-gray-200">{main}</div>
                                                                {detail && <div className="text-xs mt-1 text-gray-400">{detail}</div>}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Alertas Preditivos */}
                                                    {(() => {
                                                        // Os dados por dia, o score e a verificação no passado vêm do
                                                        // useMemo forecastModel (lá em cima). Aqui só se escolhe o que dizer.
                                                        const { scoreFor, check } = forecastModel;
                                                        const todayRes = scoreFor(forecastTodayKey, { strict: true, tr: t, lang: i18n.language });

                                                        if (!todayRes.hasInputs) {
                                                            return (
                                                                <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4 mt-4">
                                                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{t('patterns.todayForecast')}</div>
                                                                    <div className="text-sm text-gray-400">
                                                                        {i18n.language === 'en'
                                                                            ? 'Not enough data yet. Register wellbeing, sleep cycles or daily dose for the last 3 days to see a prediction.'
                                                                            : 'Dados insuficientes. Regista bem-estar, ciclos de sono ou dose diária nos últimos 3 dias para ver uma previsão.'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        const { score: riskScore, factors: riskFactors, weeksOfData } = todayRes;

                                                        // Números com vírgula em português e sinal de menos a sério.
                                                        const num = (v, dec) => {
                                                            const s = Math.abs(v).toFixed(dec);
                                                            return (v < 0 ? '−' : '') + (i18n.language === 'en' ? s : s.replace('.', ','));
                                                        };
                                                        // Os números do texto em letra de números (font-mono-theme).
                                                        const withMono = (text) => String(text).split(/([−-]?\d+(?:[.,]\d+)?)/).map((part, i) =>
                                                            i % 2 === 1 ? <span key={i} className="font-mono-theme">{part}</span> : part
                                                        );

                                                        // O que dizer depende do que a verificação nos registos da
                                                        // pessoa conseguiu saber. Cada ramo pode RECUSAR dizer como vai
                                                        // ser o dia: só no último os sinais de hoje são comparados.
                                                        let riskLevel, riskNote;
                                                        if (check.status === 'loading') {
                                                            riskLevel = t('patterns.riskLevel.unknown');
                                                            riskNote = t('patterns.riskLevel.noteLoading');
                                                        } else if (check.status === 'few') {
                                                            riskLevel = t('patterns.riskLevel.unknown');
                                                            riskNote = t('patterns.riskLevel.noteFew', { min: check.min, n: check.n });
                                                        } else if (check.status === 'flat') {
                                                            riskLevel = t('patterns.riskLevel.unknown');
                                                            riskNote = t('patterns.riskLevel.noteFlat', { n: check.n });
                                                        } else {
                                                            // p como aparece no ecrã (3 casas). A decisão usa o MESMO
                                                            // número que se mostra, para nunca se ler "p = 0,050" ao lado
                                                            // de uma frase que diz que os sinais acompanham o uso.
                                                            const pShown = Number(check.p.toFixed(3));
                                                            const pText = check.b === 0
                                                                ? t('patterns.riskLevel.pLessThan', { m: check.m })
                                                                : t('patterns.riskLevel.pValue', { p: num(pShown, 3) });
                                                            const rhoText = num(check.rho, 2);
                                                            if (pShown >= 0.05 || check.rho <= 0) {
                                                                riskLevel = t('patterns.riskLevel.chance');
                                                                riskNote = t('patterns.riskLevel.noteChance', { n: check.n, rho: rhoText, p: pText });
                                                            } else {
                                                                // Onde fica o score de hoje entre os dos dias passados
                                                                // (posição a meio dos empates, como nos terços).
                                                                let below = 0, equal = 0;
                                                                check.scores.forEach(s => { if (s < riskScore) below++; else if (s === riskScore) equal++; });
                                                                const pos = (below + equal / 2) / check.n;
                                                                riskLevel = pos > 2 / 3 ? t('patterns.riskLevel.tercileHigh')
                                                                    : pos < 1 / 3 ? t('patterns.riskLevel.tercileLow')
                                                                    : t('patterns.riskLevel.tercileMid');
                                                                // Médias dos terços só com dias suficientes em cada um
                                                                // (com muitos empates um terço pode ficar quase vazio).
                                                                riskNote = (check.hiN >= 5 && check.loN >= 5)
                                                                    ? t('patterns.riskLevel.noteLinked', { n: check.n, a: num(check.hiMean, 1), b: num(check.loMean, 1), rho: rhoText, p: pText })
                                                                    : t('patterns.riskLevel.noteLinkedNoGroups', { n: check.n, rho: rhoText, p: pText });
                                                            }
                                                        }

                                                        // Classificar o PADRÃO do dia — não o "risco".
                                                        // Um dia de uso mais alto não é um perigo nem uma falha:
                                                        // é um dia. O alarme (🚨 + vermelho) dizia o contrário e
                                                        // contradizia o paradigma de redução de danos do projeto.
                                                        // Fica a informação numa paleta que não julga (sem verde/vermelho).
                                                        const riskColor = 'text-white';
                                                        const riskBg = 'bg-gray-800/40';
                                                        const riskBorder = 'border-gray-700';
                                                        const riskEmoji = '📊';

                                                        return (
                                                            <div className={`${riskBg} border ${riskBorder} rounded-lg p-4 mt-4`}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className={'text-xs font-semibold uppercase tracking-wide ' + riskColor}>
                                                                        {t('patterns.todayForecast')}
                                                                    </div>
                                                                    <span className="text-2xl">{riskEmoji}</span>
                                                                </div>
                                                                <div className={'text-sm leading-relaxed ' + 'text-gray-200'}>
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        {/* Sem percentagem: o número é um índice interno somado
                                                                            à mão, NÃO uma probabilidade. Mostrar "71%" dava-lhe
                                                                            uma precisão que ele não tem. */}
                                                                        <strong className={riskColor}>{riskLevel}</strong>
                                                                    </div>
                                                                    {riskFactors.length > 0 && (
                                                                        <div className="mt-2 space-y-1">
                                                                            <div className={'text-xs font-semibold ' + 'text-gray-400'}>{t('patterns.riskLevel.factors')}</div>
                                                                            {/* Todos os sinais em cinzento. A vermelho/verde liam-se como
                                                                                "isto empurra para mais uso" — mesmo quando a própria
                                                                                verificação dizia que não se distinguem do acaso. A cor
                                                                                afirmava o que os números não sabiam. */}
                                                                            {riskFactors.map((rf, idx) => (
                                                                                <div key={idx} className="text-xs text-gray-300">
                                                                                    {rf.emoji} {rf.text}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className={'text-xs mt-3 pt-2 border-t ' + 'border-gray-600 text-gray-400'}>
                                                                        {withMono(riskNote)}
                                                                    </div>
                                                                    {weeksOfData < 4 && (
                                                                        <div className="text-xs mt-2 text-yellow-600/70">
                                                                            ⚠️ {i18n.language === 'en' ? 'The day-of-week factor needs at least 4–6 weeks of data to be reliable.' : 'O fator dia da semana precisa de pelo menos 4–6 semanas de dados para ser fiável.'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Heatmap */}
                                                    <HeatmapChart
                                                        consumptions={consumptions}
                                                        wellbeingLogs={wellbeingLogs}
                                                                        days={90}
                                                    />

                                                    {/* Evolução da Frequência */}
                                                    {Object.keys(byDate).length > 0 && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <div className="mb-4">
                                                                <h3 className={'font-semibold ' + ('text-white')}>
                                                                    {t('patterns.freq.title')}
                                                                </h3>
                                                                <p className={'text-xs mt-1 ' + ('text-gray-400')}>
                                                                    {t('patterns.freq.desc')}
                                                                </p>
                                                            </div>
                                                            {(() => {
                                                                // Preparar dados ordenados por data
                                                                const sortedDates = Object.keys(byDate).sort();
                                                                const maxCount = Math.max(...Object.values(byDate));

                                                                // Cor das barras (regra do elogio):
                                                                // - Dia com meta de reduzir a frequência em vigor → verde se cumpre,
                                                                //   amarelo se passa (como a semana no Início; nunca vermelho).
                                                                // - Sem meta (ou dia antes de a meta existir) → só quantidade, num
                                                                //   só roxo como o mapa de calor (limites 3/6/9). Antes ia de verde
                                                                //   (1-3) a vermelho (10+) para toda a gente, com ou sem meta.
                                                                // A altura da barra mostra sempre a quantidade.
                                                                const BAR_SHADES = ['#7c3aed40', '#7c3aed70', '#7c3aeda0', '#7c3aed'];
                                                                const GOAL_OK = '#10b981';   // emerald-500
                                                                const GOAL_OVER = '#eab308'; // yellow-500
                                                                const dayTarget = (date) => {
                                                                    if (!freqGoal) return NaN;
                                                                    return parseFloat(goalTargetForDay(freqGoal, date));
                                                                };
                                                                const barColor = (count, date) => {
                                                                    const tg = dayTarget(date);
                                                                    if (Number.isFinite(tg)) return meetsGoal('reduce_frequency', count, tg) ? GOAL_OK : GOAL_OVER;
                                                                    if (count >= 10) return BAR_SHADES[3];
                                                                    if (count > 6) return BAR_SHADES[2];
                                                                    if (count > 3) return BAR_SHADES[1];
                                                                    return BAR_SHADES[0];
                                                                };
                                                                // Hoje: mesma cor da quantidade, com contorno claro.
                                                                const TODAY_RING = '0 0 0 1.5px #c4b5fd';

                                                                // Determinar quantos dias mostrar baseado no período
                                                                let daysToShow = sortedDates.length;
                                                                if (patternsPeriod === 'hoje') daysToShow = Math.min(7, sortedDates.length);
                                                                else if (patternsPeriod === 'semana') daysToShow = Math.min(14, sortedDates.length);
                                                                else if (patternsPeriod === 'mes') daysToShow = Math.min(30, sortedDates.length);
                                                                else daysToShow = Math.min(60, sortedDates.length);

                                                                const recentDates = sortedDates.slice(-daysToShow);

                                                                return (
                                                                    <div className="space-y-4">
                                                                        {/* Gráfico de barras */}
                                                                        <div className="flex items-end justify-between gap-1 h-48 relative overflow-hidden">
                                                                            {recentDates.map((date, idx) => {
                                                                                const count = byDate[date];
                                                                                const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                                                                const heightPx = Math.max((heightPercent / 100) * 192, 8); // 192px = h-48, min 8px
                                                                                const isToday = date === getTodayKey();

                                                                                return (
                                                                                    <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative" style={{ minWidth: '2px' }}>
                                                                                        {/* Tooltip */}
                                                                                        <div className={'absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap px-2 py-1 rounded text-xs ' + 'bg-gray-700 text-gray-200'}>
                                                                                            {new Date(date + 'T12:00:00').toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}: {count}x
                                                                                        </div>

                                                                                        {/* Barra */}
                                                                                        <div
                                                                                            className="w-full rounded-t transition-all duration-300"
                                                                                            style={{ height: `${heightPx}px`, minHeight: '8px', background: barColor(count, date), boxShadow: isToday ? TODAY_RING : undefined }}
                                                                                        />
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        {/* Eixo X - Datas */}
                                                                        <div className="flex items-center justify-between gap-1 w-full">
                                                                            {recentDates.filter((_, idx) => {
                                                                                // Mostrar apenas algumas labels para não ficar congestionado
                                                                                if (recentDates.length <= 7) return true;
                                                                                if (recentDates.length <= 14) return idx % 2 === 0;
                                                                                if (recentDates.length <= 30) return idx % 4 === 0 || idx === recentDates.length - 1;
                                                                                return idx % 7 === 0 || idx === recentDates.length - 1;
                                                                            }).map(date => (
                                                                                <div key={date} className={'text-xs flex-1 text-center ' + ('text-gray-400')}>
                                                                                    {new Date(date + 'T12:00:00').toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        {/* Legenda */}
                                                                        <div className={'text-xs mt-2 pt-3 border-t flex items-center justify-center gap-4 flex-wrap ' + 'text-gray-400 border-gray-700'}>
                                                                            {(() => {
                                                                                const anyGoalDay = recentDates.some(d => Number.isFinite(dayTarget(d)));
                                                                                const anyFreeDay = recentDates.some(d => !Number.isFinite(dayTarget(d)));
                                                                                const tgNow = freqGoal ? parseFloat(freqGoal.target) : NaN;
                                                                                const en = i18n.language === 'en';
                                                                                return (
                                                                                    <>
                                                                                        {anyGoalDay && (
                                                                                            <>
                                                                                                <div className="flex items-center gap-1">
                                                                                                    <div className="w-3 h-3 rounded" style={{ background: GOAL_OK }}></div>
                                                                                                    <span>{en ? 'within goal' : 'dentro da meta'}{Number.isFinite(tgNow) ? ` (≤${tgNow})` : ''}</span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-1">
                                                                                                    <div className="w-3 h-3 rounded" style={{ background: GOAL_OVER }}></div>
                                                                                                    <span>{en ? 'over goal' : 'acima da meta'}</span>
                                                                                                </div>
                                                                                            </>
                                                                                        )}
                                                                                        {anyFreeDay && [['1-3', 0], ['4-6', 1], ['7-9', 2], ['10+', 3]].map(([label, i]) => (
                                                                                            <div key={label} className="flex items-center gap-1">
                                                                                                <div className="w-3 h-3 rounded" style={{ background: BAR_SHADES[i] }}></div>
                                                                                                <span>{label}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                        <div className="flex items-center gap-1">
                                                                                            <div className="w-3 h-3 rounded" style={{ background: 'transparent', boxShadow: TODAY_RING }}></div>
                                                                                            <span>{t('patterns.freq.todaySoFar', 'hoje (até agora)')}</span>
                                                                                        </div>
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}

                                                    {/* Insights Summary */}
                                                    {insights.length > 0 && (
                                                        <div className={'bg-gray-800/40 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'font-semibold ' + ('text-white') + ' mb-4 flex items-center gap-2'}>
                                                                <span className="text-xl">💡</span>
                                                                {t('patterns.identified')}
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {insights.map((insight, i) => (
                                                                    <div key={i} className={'flex items-start gap-3 p-3 rounded-lg ' + 'bg-gray-700/50 border-gray-600'}>
                                                                        <div className={'flex-1 text-sm leading-relaxed ' + 'text-gray-200'}>
                                                                            {insight.text}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Análise de Metas */}
                                                    {goalsAnalysis && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                                                                {t('patterns.goals.title')}
                                                            </h3>

                                                            {/* Main stats */}
                                                            <div className="grid grid-cols-2 divide-x divide-gray-700 border-y border-gray-700 py-3 mb-4">
                                                                <div className="px-2 text-center">
                                                                    <div className="text-xs font-semibold mb-1 uppercase tracking-wide text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">
                                                                        {t('patterns.goals.totalCompliances')}
                                                                    </div>
                                                                    <div className="flex items-baseline justify-center gap-1">
                                                                        <span className="text-3xl font-black font-mono-theme text-white">
                                                                            {goalsAnalysis.totalAchievements}
                                                                        </span>
                                                                        <span className={'text-sm ' + ('text-gray-400')}>
                                                                            {t('patterns.goals.times')}
                                                                        </span>
                                                                    </div>
                                                                    <div className={'text-xs mt-1 ' + ('text-gray-400')}>
                                                                        {t('patterns.goals.metSomeDay', '{{achieved}} de {{total}} metas cumpridas em pelo menos um dia', { achieved: goalsAnalysis.goalsWithAchievements, total: goalsAnalysis.totalGoals })}
                                                                    </div>
                                                                </div>

                                                                <div className="px-2 text-center">
                                                                    <div className="text-xs font-semibold mb-1 uppercase tracking-wide text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">
                                                                        {t('patterns.goals.avgPerDay')}
                                                                    </div>
                                                                    <div className="flex items-baseline justify-center gap-1">
                                                                        <span className="text-3xl font-black font-mono-theme text-white">
                                                                            {goalsAnalysis.avgAchievementsPerDay}
                                                                        </span>
                                                                        <span className={'text-sm ' + ('text-gray-400')}>
                                                                            {t('patterns.goals.times')}
                                                                        </span>
                                                                    </div>
                                                                    <div className={'text-xs mt-1 ' + ('text-gray-400')}>
                                                                        {goalsAnalysis.periodDays > 0
                                                                            ? t('patterns.goals.avgPerDayCounted', 'em {{days}} dia(s) que as metas contam', { days: goalsAnalysis.periodDays })
                                                                            : t('patterns.goals.noData')}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Per-goal breakdown */}
                                                            <div>
                                                                <div className={'text-xs font-semibold mb-3 uppercase tracking-wide ' + ('text-gray-400')}>
                                                                    {t('patterns.goals.breakdown')}
                                                                </div>
                                                                <div className="divide-y divide-gray-700">
                                                                    {goalsAnalysis.goalBreakdown.map(goal => {
                                                                        const goalTypeLabels = {
                                                                            'reduce_frequency': t('patterns.goals.types.reduce_frequency'),
                                                                            'reduce_quantity': t('patterns.goals.types.reduce_quantity'),
                                                                            'limit_last': t('patterns.goals.types.limit_last'),
                                                                            'increase_interval': t('patterns.goals.types.increase_interval'),
                                                                            'sleep_hours': t('patterns.goals.types.sleep_hours'),
                                                                            'bedtime_before': t('patterns.goals.types.bedtime_before'),
                                                                            'first_not_before': t('patterns.goals.types.first_not_before')
                                                                        };
                                                                        const explanations = {
                                                                            'reduce_frequency': t('patterns.goals.explain.reduce_frequency', { target: goal.target }),
                                                                            'reduce_quantity': t(metrics?.mgByCycleMode ? 'patterns.goals.explain.reduce_quantity_cycle' : 'patterns.goals.explain.reduce_quantity', { target: goal.target }),
                                                                            'limit_last': t('patterns.goals.explain.limit_last', { target: goal.target }),
                                                                            'increase_interval': t('patterns.goals.explain.increase_interval', { target: goal.target }),
                                                                            'sleep_hours': t('patterns.goals.explain.sleep_hours', { target: goal.target }),
                                                                            'bedtime_before': t('patterns.goals.explain.bedtime_before', { target: goal.target }),
                                                                            'first_not_before': t('patterns.goals.explain.first_not_before', { target: goal.target })
                                                                        };
                                                                        return (
                                                                            <div key={goal.id} className="py-3">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <div className="flex-1">
                                                                                        <div className={'text-sm font-medium mb-1 ' + ('text-white')}>
                                                                                            {goalTypeLabels[goal.type] || goal.type}
                                                                                        </div>
                                                                                        <div className={'text-xs italic ' + ('text-gray-400')}>
                                                                                            {t('patterns.goals.target')} {goal.target + ({ increase_interval: 'h', sleep_hours: 'h', first_not_before: 'h', reduce_quantity: 'mg', reduce_frequency: i18n.language === 'en' ? 'x/day' : 'x/dia' }[goal.type] || '')}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <div className={'text-2xl font-black font-mono-theme ' + (goal.achievementCount > 0 ? 'text-white' : 'text-gray-500')}>
                                                                                            {goal.achievementCount}
                                                                                        </div>
                                                                                        <div className={'text-xs ' + 'text-gray-500'}>
                                                                                            {t('patterns.goals.times')}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                {/* Progress Bar — só quando há dias que contem; senão diz que não sabe */}
                                                                                {goal.successRate == null ? (
                                                                                    <p className="text-xs text-gray-400">{t('patterns.goals.noData')}</p>
                                                                                ) : (
                                                                                <div>
                                                                                    <div className="flex items-center justify-between mb-1">
                                                                                        <span className={'text-xs font-medium ' + ('text-gray-400')}>
                                                                                            {goal.achievementCount} / {goal.totalPossible}
                                                                                        </span>
                                                                                        <span className={'text-xs font-bold ' + (goal.successRate >= 70 ? 'text-green-400' : goal.successRate >= 40 ? 'text-yellow-400' : 'text-orange-400')}>
                                                                                            {goal.successRate.toFixed(0)}%
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className={'bg-gray-600' + ' rounded-full h-2 overflow-hidden'}>
                                                                                        <div
                                                                                            className={/* cor de meta (a pessoa escolheu-a), mas nunca vermelho: abaixo de 40% fica laranja */ 'h-full transition-all duration-500 ' + (goal.successRate >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : goal.successRate >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-orange-500')}
                                                                                            style={{width: `${Math.min(100, goal.successRate)}%`}}
                                                                                        ></div>
                                                                                    </div>
                                                                                </div>
                                                                                )}
                                                                                {goal.type === 'reduce_quantity' && (
                                                                                    <div className="mt-2 space-y-1.5 text-[11px] leading-snug">
                                                                                        <p className="text-gray-400">{t(metrics?.mgByCycleMode ? 'patterns.goals.qtyCycle' : 'patterns.goals.qtyDaily')}</p>
                                                                                        {goal.mgAvg && (
                                                                                            <p className="text-gray-300">
                                                                                                {t(metrics?.mgByCycleMode ? 'patterns.goals.qtyAvgCycles' : 'patterns.goals.qtyAvgDays', { mg: goal.mgAvg.mg, n: goal.mgAvg.n })}
                                                                                                <span className="block text-gray-500">{t(metrics?.mgByCycleMode ? 'patterns.goals.qtyAvgAllExplain' : 'patterns.goals.qtyAvgDaysExplain')}</span>
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                                {/* Desde quando conta e, ao tocar, cada dia com o valor e ✓/✗ */}
                                                                                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
                                                                                    <span>
                                                                                        {goal.countsFrom ? t('patterns.goals.since', { date: new Date(`${goal.countsFrom}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) }) : ''}
                                                                                        {(goal.targetHistory || []).length > 0 && goal.currentFrom && (
                                                                                            <span className="block">{t('patterns.goals.targetSince', { target: goal.target, date: new Date(`${goal.currentFrom}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) })}</span>
                                                                                        )}
                                                                                    </span>
                                                                                    {goal.goalDays?.length > 0 && (
                                                                                        <button type="button" onClick={() => setOpenGoalDays(o => (o === goal.id ? null : goal.id))} className="text-purple-300 hover:text-purple-200 whitespace-nowrap">
                                                                                            {openGoalDays === goal.id ? t('patterns.goals.hideDays') : t('patterns.goals.showDays')} ›
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                                {openGoalDays === goal.id && (
                                                                                    <ul className="mt-2 max-h-72 overflow-y-auto divide-y divide-gray-700/60 text-xs">
                                                                                        {goal.goalDays.map((dd, ddi) => {
                                                                                            const v = dd.value;
                                                                                            const val = goal.type === 'reduce_frequency' ? t('patterns.goals.dayVal.freq', { count: v })
                                                                                                : goal.type === 'reduce_quantity' ? `${v} mg`
                                                                                                : goal.type === 'limit_last' ? (v?.late ? t('patterns.goals.dayVal.lastLate', { time: v.late }) : t('patterns.goals.dayVal.last', { time: v?.last }))
                                                                                                : goal.type === 'first_not_before' ? t('patterns.goals.dayVal.first', { time: v?.time, after: v?.after })
                                                                                                : goal.type === 'increase_interval' ? t('patterns.goals.dayVal.interval', { long: v?.long, total: v?.total })
                                                                                                : goal.type === 'sleep_hours' ? `${v}h`
                                                                                                : goal.type === 'bedtime_before' ? t('patterns.goals.dayVal.bedtime', { time: v })
                                                                                                : String(v);
                                                                                            return (
                                                                                                <li key={`${dd.d}-${ddi}`} className="flex items-center justify-between py-1.5">
                                                                                                    <span className="text-gray-300 capitalize">{new Date(`${dd.d}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                                                                                    <span className="text-gray-200">{val} <span className={dd.ok ? 'text-green-400' : 'text-orange-400'}>{dd.ok ? '✓' : '✗'}</span></span>
                                                                                                </li>
                                                                                            );
                                                                                        })}
                                                                                    </ul>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        // ANÁLISE DE PROGRESSO TEMPORAL
                                        if (patternView === 'progress') {
                                            // DUAS JANELAS A COMPARAR, em dias LOCAIS inteiros (datesInRange):
                                            // - recente = o período que a pessoa está a ver, com as setas ←/→
                                            //   (o mesmo dateRange das outras vistas);
                                            // - anterior = o mesmo número de dias, logo antes.
                                            // "Tudo" não tem início: compara os últimos 30 dias com os 30 antes.
                                            // Antes isto usava "agora − N×24h" sobre os dados em bruto e ignorava
                                            // as setas: via-se sempre o presente, fosse qual fosse o período.
                                            //
                                            // REGRA DO ELOGIO: sem meta da pessoa para aquela métrica, só descrição
                                            // (número, diferença, seta cinzenta). Cor e ✓ só para métricas COM meta
                                            // (frequência → reduce_frequency, mg → reduce_quantity, sono →
                                            // sleep_hours, hora de deitar → bedtime_before), na direção da meta, e
                                            // só quando a diferença se distingue do acaso (windowTest).
                                            // Antes: verde/vermelho e "melhoria" decididos pela app (menos consumo =
                                            // melhor), uma percentagem de "progresso" e frases de incentivo.
                                            const todayKey = getTodayKey();
                                            let recentFrom, recentTo;
                                            if (dateRange?.start && dateRange?.end) {
                                                recentFrom = safeToISODate(dateRange.start);
                                                recentTo = safeToISODate(dateRange.end);
                                            } else {
                                                recentTo = todayKey;
                                                recentFrom = safeToISODate(subtractDays(new Date(`${todayKey}T12:00:00`), 29));
                                            }
                                            const recentAllDays = datesInRange(recentFrom, recentTo);
                                            const periodDays = recentAllDays.length;
                                            const previousAllDays = datesInRange(
                                                safeToISODate(subtractDays(new Date(`${recentFrom}T12:00:00`), periodDays)),
                                                safeToISODate(subtractDays(new Date(`${recentFrom}T12:00:00`), 1))
                                            );
                                            // HOJE AINDA VAI A MEIO: sai das médias que SOMAM coisas ao longo do dia
                                            // (consumos/dia, mg/dia, autocuidado) — os consumos e registos que ainda
                                            // faltam puxavam a média para baixo. Fica no sono (a noite de ontem já
                                            // acabou), no humor/energia e nas emoções (amostras, não somas).
                                            const todayInRecent = recentAllDays.includes(todayKey);
                                            const recentDoneDays = recentAllDays.filter(d => d !== todayKey);
                                            // Janela recente só com hoje (período "Hoje"): nada de completo para comparar.
                                            const todayOnly = todayInRecent && recentDoneDays.length === 0;

                                            // Dias de fora, nas DUAS janelas (a anterior fica fora do período, por
                                            // isso juntam-se também os atípicos de sempre, de metrics). Como nas
                                            // outras vistas: o consumo sai nos atípicos E nos "não registei"; o
                                            // bem-estar e os ciclos (sono) só saem nos atípicos — "não registei os
                                            // consumos" não apaga o sono nem o humor desse dia.
                                            const progAtypical = new Set([...atypicalDates, ...(metrics?.atypicalDates || [])]);
                                            const progExcluded = new Set([...excludedDates, ...progAtypical, ...(metrics?.unloggedDates || [])]);

                                            // Dias que CONTAM para uma média "por dia": não estão de fora e têm algum
                                            // registo (um dia sem registo nenhum não se sabe, não é zero).
                                            const countableDays = (days) => days.filter(d => !progExcluded.has(d) && knownDays.has(d));
                                            const recentCountDays = countableDays(recentDoneDays);
                                            const previousCountDays = countableDays(previousAllDays);

                                            const recentDaySet = new Set(recentAllDays);
                                            const recentDoneSet = new Set(recentDoneDays);
                                            const previousDaySet = new Set(previousAllDays);
                                            const inWindow = (daySet, outSet) => (item) => {
                                                const k = getDateKeyFromItem(item);
                                                return !!k && daySet.has(k) && !outSet.has(k);
                                            };

                                            // Filter data for both periods
                                            const recentConsumptions = consumptions.filter(inWindow(recentDoneSet, progExcluded));
                                            const previousConsumptions = consumptions.filter(inWindow(previousDaySet, progExcluded));

                                            const recentWellbeing = wellbeingLogs.filter(inWindow(recentDaySet, progAtypical));
                                            const previousWellbeing = wellbeingLogs.filter(inWindow(previousDaySet, progAtypical));

                                            const recentCycles = cycles.filter(inWindow(recentDaySet, progAtypical));
                                            const previousCycles = cycles.filter(inWindow(previousDaySet, progAtypical));

                                            // Média de uma lista de números; sem números → null ("não se sabe"),
                                            // nunca 0. Um 0 inventado dava "Humor 0.0/10" ou "↓100%".
                                            const avgOrNull = (arr) => arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : null;
                                            // Valores por dia (para o teste), por ordem de data.
                                            const byDaySeries = (map) => Object.keys(map).sort().map(d => map[d]);
                                            const dailyMeans = (items, field) => {
                                                const acc = {};
                                                items.forEach(w => {
                                                    const v = parseInt(w[field]);
                                                    const d = getDateKeyFromItem(w);
                                                    if (!d || isNaN(v)) return;
                                                    (acc[d] = acc[d] || []).push(v);
                                                });
                                                const out = {};
                                                Object.entries(acc).forEach(([d, vs]) => { out[d] = vs.reduce((a, b) => a + b, 0) / vs.length; });
                                                return out;
                                            };

                                            // Percentagem e sentido da mudança (só descrição: NÃO diz se é melhor).
                                            // null quando não há comparação possível: falta um dos lados (null) ou
                                            // o anterior é 0 (não há % de mudança a partir de zero).
                                            const calculateChange = (recent, previous) => {
                                                if (recent == null || previous == null) return null;
                                                if (previous === 0 && recent === 0) return { percent: 0, direction: 'stable' };
                                                if (previous === 0) return null;
                                                const change = ((recent - previous) / previous) * 100;
                                                const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
                                                return { percent: Math.abs(change), direction, rawChange: change };
                                            };

                                            const progressData = {};

                                            // 1. CONSUMO - Frequência (sem hoje)
                                            if (recentConsumptions.length > 0 || previousConsumptions.length > 0 || todayInRecent) {
                                                // Consumos ÷ dias que contam na janela (um dia sem consumos conta
                                                // como 0). Antes dividia só pelos dias COM consumo, e um dia a zero
                                                // desaparecia da média em vez de a baixar.
                                                const countOf = (list) => { const m = {}; list.forEach(c => { const k = getDateKeyFromItem(c); if (k) m[k] = (m[k] || 0) + 1; }); return m; };
                                                const rc = countOf(recentConsumptions), pc = countOf(previousConsumptions);
                                                const recentSeries = recentCountDays.map(d => rc[d] || 0);
                                                const previousSeries = previousCountDays.map(d => pc[d] || 0);
                                                const recentAvgFreq = avgOrNull(recentSeries);
                                                const previousAvgFreq = avgOrNull(previousSeries);
                                                if (recentAvgFreq != null || previousAvgFreq != null || todayOnly) {
                                                    progressData.frequency = {
                                                        recent: recentAvgFreq,
                                                        previous: previousAvgFreq,
                                                        change: calculateChange(recentAvgFreq, previousAvgFreq),
                                                        test: windowTest(previousSeries, recentSeries),
                                                        goalType: 'reduce_frequency',
                                                        noToday: true,
                                                        label: t('patterns.progress.freqLabel')
                                                    };
                                                }
                                            }

                                            // 2. CONSUMO - Dosagem (sem hoje)
                                            // mg POR DIA da fonte unificada (metrics.dailySummary, a mesma do resto
                                            // desta página): o "Registar mg" à mão manda, as pesagens medidas
                                            // preenchem os outros dias. Só dias com medição real (mg > 0) — nunca
                                            // se estimam mg para dias sem pesagem. Média por dia MEDIDO.
                                            const mgSummary = metrics?.dailySummary || {};
                                            const mgOfDays = (days) => days
                                                .filter(d => !progExcluded.has(d))
                                                .map(d => mgSummary[d]?.mg)
                                                .filter(v => v != null && v > 0);
                                            const recentMgValues = mgOfDays(recentDoneDays);
                                            const previousMgValues = mgOfDays(previousAllDays);

                                            if (recentMgValues.length > 0 || previousMgValues.length > 0) {
                                                const recentAvgDosage = avgOrNull(recentMgValues);
                                                const previousAvgDosage = avgOrNull(previousMgValues);

                                                progressData.dosage = {
                                                    recent: recentAvgDosage,
                                                    previous: previousAvgDosage,
                                                    change: calculateChange(recentAvgDosage, previousAvgDosage),
                                                    test: windowTest(previousMgValues, recentMgValues),
                                                    goalType: 'reduce_quantity',
                                                    noToday: true,
                                                    label: t('patterns.progress.dosageLabel')
                                                };
                                            }

                                            // 3. BEM-ESTAR - Sono (from cycles and wellbeingLogs)
                                            // Helper para extrair sono de cycles + wellbeingLogs por data
                                            const getSleepForDate = (date, cyclesData, wellbeingData) => {
                                                let nightSleep = null;
                                                // Primeiro tenta buscar nos cycles
                                                const cycle = cyclesData.find(c => {
                                                    const cycleDate = getDateKeyFromItem(c);
                                                    return cycleDate === date && c.sleep !== undefined && c.sleep !== '';
                                                });
                                                if (cycle) {
                                                    const sleepValue = typeof cycle.sleep === 'number' ? cycle.sleep : parseFloat(cycle.sleep);
                                                    if (!isNaN(sleepValue) && sleepValue > 0) nightSleep = sleepValue;
                                                }

                                                // Fallback: buscar nos wellbeingLogs (campo legado)
                                                if (nightSleep === null) {
                                                    const wellbeing = wellbeingData.find(w => {
                                                        const wDate = getDateKeyFromItem(w);
                                                        return wDate === date && w.sleep !== undefined && !isNaN(parseFloat(w.sleep));
                                                    });
                                                    if (wellbeing) {
                                                        const sleepValue = typeof wellbeing.sleep === 'number' ? wellbeing.sleep : parseFloat(wellbeing.sleep);
                                                        if (!isNaN(sleepValue) && sleepValue > 0) nightSleep = sleepValue;
                                                    }
                                                }

                                                // Adicionar horas de sesta deste dia
                                                const napMins = wellbeingData
                                                    .filter(w => getDateKeyFromItem(w) === date && w.napDuration > 0)
                                                    .reduce((sum, w) => sum + (w.napDuration || 0), 0);
                                                const napHours = napMins / 60;

                                                if (nightSleep !== null) return nightSleep + napHours;
                                                if (napHours > 0) return napHours;
                                                return null;
                                            };

                                            // Obter todas as datas únicas dos períodos para sono (por ordem)
                                            const sleepSeries = (cyc, wb) => [...new Set([...cyc.map(c => getDateKeyFromItem(c)), ...wb.map(w => getDateKeyFromItem(w))])]
                                                .filter(Boolean).sort()
                                                .map(date => getSleepForDate(date, cyc, wb))
                                                .filter(v => v !== null);
                                            const recentSleepValues = sleepSeries(recentCycles, recentWellbeing);
                                            const previousSleepValues = sleepSeries(previousCycles, previousWellbeing);

                                            if (recentSleepValues.length > 0 || previousSleepValues.length > 0) {
                                                const recentAvgSleep = avgOrNull(recentSleepValues);
                                                const previousAvgSleep = avgOrNull(previousSleepValues);

                                                progressData.sleep = {
                                                    recent: recentAvgSleep,
                                                    previous: previousAvgSleep,
                                                    change: calculateChange(recentAvgSleep, previousAvgSleep),
                                                    test: windowTest(previousSleepValues, recentSleepValues),
                                                    goalType: 'sleep_hours',
                                                    label: t('patterns.progress.sleepLabel')
                                                };
                                            }

                                            // 4. BEM-ESTAR - Humor (média dos registos; o teste usa a média de cada dia)
                                            const recentMoodLogs = recentWellbeing.filter(w => w.mood !== undefined && w.mood !== null && w.mood !== '' && !isNaN(parseInt(w.mood)));
                                            const previousMoodLogs = previousWellbeing.filter(w => w.mood !== undefined && w.mood !== null && w.mood !== '' && !isNaN(parseInt(w.mood)));

                                            if (recentMoodLogs.length > 0 || previousMoodLogs.length > 0) {
                                                const recentAvgMood = avgOrNull(recentMoodLogs.map(w => parseInt(w.mood)));
                                                const previousAvgMood = avgOrNull(previousMoodLogs.map(w => parseInt(w.mood)));

                                                progressData.mood = {
                                                    recent: recentAvgMood,
                                                    previous: previousAvgMood,
                                                    change: calculateChange(recentAvgMood, previousAvgMood),
                                                    test: windowTest(byDaySeries(dailyMeans(previousMoodLogs, 'mood')), byDaySeries(dailyMeans(recentMoodLogs, 'mood'))),
                                                    label: t('patterns.progress.moodLabel')
                                                };
                                            }

                                            // 5. BEM-ESTAR - Energia
                                            const recentEnergyLogs = recentWellbeing.filter(w => w.energy !== undefined && w.energy !== null && w.energy !== '' && !isNaN(parseInt(w.energy)));
                                            const previousEnergyLogs = previousWellbeing.filter(w => w.energy !== undefined && w.energy !== null && w.energy !== '' && !isNaN(parseInt(w.energy)));

                                            if (recentEnergyLogs.length > 0 || previousEnergyLogs.length > 0) {
                                                const recentAvgEnergy = avgOrNull(recentEnergyLogs.map(w => parseInt(w.energy)));
                                                const previousAvgEnergy = avgOrNull(previousEnergyLogs.map(w => parseInt(w.energy)));

                                                progressData.energy = {
                                                    recent: recentAvgEnergy,
                                                    previous: previousAvgEnergy,
                                                    change: calculateChange(recentAvgEnergy, previousAvgEnergy),
                                                    test: windowTest(byDaySeries(dailyMeans(previousEnergyLogs, 'energy')), byDaySeries(dailyMeans(recentEnergyLogs, 'energy'))),
                                                    label: t('patterns.progress.energyLabel')
                                                };
                                            }

                                            // 6. CICLOS - Consistência da hora de deitar + Média
                                            const bedtimeGoal = activeGoal('bedtime_before');
                                            if (recentCycles.length > 0 || previousCycles.length > 0) {
                                                const getBedtimeMinutes = (bedtime) => {
                                                    const [hours, minutes] = bedtime.split(':').map(Number);
                                                    // Ajustar madrugada/tarde (00:00-17:59) para 24:00-41:59
                                                    // Cobre casos de sono irregular (deitar de madrugada ou durante o dia)
                                                    if (hours >= 0 && hours < 18) {
                                                        return (hours + 24) * 60 + minutes;
                                                    }
                                                    return hours * 60 + minutes;
                                                };

                                                const minutesToTime = (mins) => {
                                                    const adjustedMins = mins >= 1440 ? mins - 1440 : mins; // Convert back from 24h+ to 0-23h
                                                    const h = Math.floor(adjustedMins / 60);
                                                    const m = Math.round(adjustedMins % 60);
                                                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                                };

                                                const bedSeries = (cyc) => cyc.filter(c => c.bedtime)
                                                    .sort((a, b) => String(getDateKeyFromItem(a)).localeCompare(String(getDateKeyFromItem(b))))
                                                    .map(c => getBedtimeMinutes(c.bedtime));
                                                const recentBedtimes = bedSeries(recentCycles);
                                                const previousBedtimes = bedSeries(previousCycles);

                                                if (recentBedtimes.length > 0 || previousBedtimes.length > 0) {
                                                    const getStdDev = (arr) => {
                                                        const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
                                                        const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
                                                        return Math.sqrt(variance);
                                                    };

                                                    // Consistência só com pelo menos 3 horas de deitar em CADA janela:
                                                    // com 1 só, a "variação" dava 0 e lia-se "Muito consistente".
                                                    // Só descrição: não há meta de "consistência".
                                                    if (recentBedtimes.length >= 3 && previousBedtimes.length >= 3) {
                                                        const recentStdDev = getStdDev(recentBedtimes);
                                                        const previousStdDev = getStdDev(previousBedtimes);

                                                        progressData.bedtimeConsistency = {
                                                            recent: recentStdDev,
                                                            previous: previousStdDev,
                                                            nRecent: recentBedtimes.length,
                                                            nPrevious: previousBedtimes.length,
                                                            change: calculateChange(recentStdDev, previousStdDev),
                                                            label: t('patterns.progress.bedtimeConsistLabel')
                                                        };
                                                    }

                                                    // Calculate average bedtime — sem horas numa janela, null (nunca "00:00")
                                                    const recentAvgBedtime = avgOrNull(recentBedtimes);
                                                    const previousAvgBedtime = avgOrNull(previousBedtimes);

                                                    progressData.avgBedtime = {
                                                        recent: recentAvgBedtime,
                                                        previous: previousAvgBedtime,
                                                        recentTime: recentAvgBedtime == null ? null : minutesToTime(recentAvgBedtime),
                                                        previousTime: previousAvgBedtime == null ? null : minutesToTime(previousAvgBedtime),
                                                        change: calculateChange(recentAvgBedtime, previousAvgBedtime),
                                                        test: windowTest(previousBedtimes, recentBedtimes),
                                                        goalType: 'bedtime_before',
                                                        label: t('patterns.progress.avgBedtimeLabel')
                                                    };
                                                }
                                            }

                                            // 7. AUTOCUIDADO - atividades por ciclo (sem o ciclo de hoje, a meio)
                                            const recentDoneCycles = recentCycles.filter(c => getDateKeyFromItem(c) !== todayKey);
                                            const recentSelfCareActivities = recentDoneCycles.flatMap(c => c.selfCareActivities || []);
                                            const previousSelfCareActivities = previousCycles.flatMap(c => c.selfCareActivities || []);

                                            if (recentSelfCareActivities.length > 0 || previousSelfCareActivities.length > 0) {
                                                const recentAvgSelfCare = recentDoneCycles.length > 0 ? recentSelfCareActivities.length / recentDoneCycles.length : null;
                                                const previousAvgSelfCare = previousCycles.length > 0 ? previousSelfCareActivities.length / previousCycles.length : null;

                                                progressData.selfCare = {
                                                    recent: recentAvgSelfCare,
                                                    previous: previousAvgSelfCare,
                                                    change: calculateChange(recentAvgSelfCare, previousAvgSelfCare),
                                                    test: windowTest(previousCycles.map(c => (c.selfCareActivities || []).length), recentDoneCycles.map(c => (c.selfCareActivities || []).length)),
                                                    noToday: true,
                                                    label: t('patterns.progress.selfCareLabel')
                                                };
                                            }

                                            // AUTOCUIDADO - Análise por área (water, rest, social, food), sem hoje
                                            const recentDoneWellbeing = recentWellbeing.filter(w => getDateKeyFromItem(w) !== todayKey);
                                            if (recentDoneWellbeing.length > 0) {
                                                const areas = {
                                                    water: { name: t('patterns.areas.water'), emoji: '💧' },
                                                    food: { name: t('patterns.areas.food'), emoji: '🍎' },
                                                    rest: { name: t('patterns.areas.rest'), emoji: '🏃' },
                                                    social: { name: t('patterns.areas.social'), emoji: '👥' }
                                                };

                                                const recentAreaStats = {};
                                                const previousAreaStats = {};

                                                // Agrupar wellbeing por data (1 data = 1 ciclo aprox)
                                                const recentDates = new Set(recentDoneWellbeing.map(w => w.date));
                                                const previousDates = new Set(previousWellbeing.map(w => w.date));

                                                const isAreaActive = (w, area) => {
                                                    if (area === 'water') return w.water === true || (w.waterGlasses > 0);
                                                    if (area === 'rest') return w.rest === true || (w.exercise && w.exercise.trim() !== '') || !!w.exerciseType || (w.exerciseDuration > 0);
                                                    return w[area] === true;
                                                };
                                                Object.keys(areas).forEach(area => {
                                                    const recentCyclesWithArea = Array.from(recentDates).filter(date => recentDoneWellbeing.some(w => w.date === date && isAreaActive(w, area))).length;
                                                    const previousCyclesWithArea = Array.from(previousDates).filter(date => previousWellbeing.some(w => w.date === date && isAreaActive(w, area))).length;
                                                    recentAreaStats[area] = recentDates.size > 0 ? (recentCyclesWithArea / recentDates.size) * 100 : 0;
                                                    previousAreaStats[area] = previousDates.size > 0 ? (previousCyclesWithArea / previousDates.size) * 100 : null;
                                                });

                                                const recentOverall = Object.values(recentAreaStats).reduce((sum, v) => sum + v, 0) / 4;
                                                // Sem registos de bem-estar no período anterior → null (não 0%).
                                                const previousOverall = previousDates.size > 0 ? Object.values(previousAreaStats).reduce((sum, v) => sum + v, 0) / 4 : null;

                                                const recentCompleteCycles = Array.from(recentDates).filter(date => Object.keys(areas).every(area => recentDoneWellbeing.some(w => w.date === date && isAreaActive(w, area)))).length;
                                                const recentCompleteCyclesPercent = recentDates.size > 0 ? (recentCompleteCycles / recentDates.size) * 100 : 0;

                                                // Áreas em menos de metade dos dias — só descrição (antes: "começa
                                                // por…", "pequenos passos contam!", "Excelente!").
                                                const lowAreas = Object.keys(areas).filter(a => recentAreaStats[a] < 50).map(a => areas[a].name.toLowerCase());
                                                const suggestion = lowAreas.length > 0
                                                    ? t('patterns.progress.selfCareLow', 'Em menos de metade dos dias ({{n}} com registo): {{areas}}.', { n: recentDates.size, areas: lowAreas.join(', ') })
                                                    : t('patterns.progress.selfCareAllHalf', 'Todas as áreas aparecem em pelo menos metade dos dias ({{n}} com registo).', { n: recentDates.size });

                                                progressData.selfCareDetailed = {
                                                    recentOverall,
                                                    previousOverall,
                                                    areas: recentAreaStats,
                                                    previousAreas: previousAreaStats,
                                                    suggestion,
                                                    change: calculateChange(recentOverall, previousOverall),
                                                    label: t('patterns.progress.selfCareOverallLabel'),
                                                    completeCycles: {
                                                        recent: recentCompleteCyclesPercent,
                                                        recentCount: recentCompleteCycles,
                                                        recentTotal: recentDates.size,
                                                    }
                                                };
                                            }

                                            // 8. EMOÇÕES
                                            const recentEmotions = recentWellbeing.flatMap(w => w.emotions || []);
                                            const previousEmotions = previousWellbeing.flatMap(w => w.emotions || []);

                                            const recentNegativeCount = recentEmotions.filter(e => getEmotionCategory(e) === 'negative').length;
                                            const previousNegativeCount = previousEmotions.filter(e => getEmotionCategory(e) === 'negative').length;
                                            const recentPositiveCount = recentEmotions.filter(e => getEmotionCategory(e) === 'positive').length;
                                            const previousPositiveCount = previousEmotions.filter(e => getEmotionCategory(e) === 'positive').length;

                                            // Top 3 emoções mais frequentes (período recente)
                                            const emotionFreq = {};
                                            recentEmotions.forEach(e => { emotionFreq[e] = (emotionFreq[e] || 0) + 1; });
                                            const topEmotions = Object.entries(emotionFreq)
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 3)
                                                .map(([emotion, count]) => ({ emotion, count, category: getEmotionCategory(emotion) }));

                                            if (recentNegativeCount > 0 || previousNegativeCount > 0) {
                                                const recentNegativePercent = recentEmotions.length > 0 ? (recentNegativeCount / recentEmotions.length) * 100 : null;
                                                const previousNegativePercent = previousEmotions.length > 0 ? (previousNegativeCount / previousEmotions.length) * 100 : null;
                                                progressData.negativeEmotions = {
                                                    recent: recentNegativePercent,
                                                    previous: previousNegativePercent,
                                                    change: calculateChange(recentNegativePercent, previousNegativePercent),
                                                    label: t('patterns.progress.negEmotionsLabel'),
                                                    recentCount: recentNegativeCount,
                                                    recentTotal: recentEmotions.length,
                                                };
                                            }

                                            if (recentPositiveCount > 0 || previousPositiveCount > 0) {
                                                const recentPositivePercent = recentEmotions.length > 0 ? (recentPositiveCount / recentEmotions.length) * 100 : null;
                                                const previousPositivePercent = previousEmotions.length > 0 ? (previousPositiveCount / previousEmotions.length) * 100 : null;
                                                progressData.positiveEmotions = {
                                                    recent: recentPositivePercent,
                                                    previous: previousPositivePercent,
                                                    change: calculateChange(recentPositivePercent, previousPositivePercent),
                                                    label: t('patterns.progress.posEmotionsLabel'),
                                                    recentCount: recentPositiveCount,
                                                    recentTotal: recentEmotions.length,
                                                };
                                            }

                                            if (topEmotions.length > 0) progressData.topEmotions = topEmotions;

                                            // VEREDICTO DE META (o único sítio onde há cor/✓): a métrica tem meta
                                            // ativa, a diferença distingue-se do acaso e o teste aponta para o
                                            // mesmo lado que as médias. 'toward' = na direção da meta; 'away' = ao
                                            // contrário (amarelo, como no Início; nunca vermelho). Resto: null.
                                            const metricEntries = Object.entries(progressData).filter(([k]) => k !== 'topEmotions');
                                            metricEntries.forEach(([, m]) => {
                                                m.goal = m.goalType ? activeGoal(m.goalType) : null;
                                                m.verdict = null;
                                                m.lean = null;
                                                if (!m.goal || !m.change || m.change.direction === 'stable') return;
                                                const up = m.recent > m.previous;
                                                const lowerIsToward = m.goalType === 'bedtime_before' || GOAL_DIRECTION[m.goalType] === 'max';
                                                const side = (lowerIsToward ? !up : up) ? 'toward' : 'away';
                                                // Sem teste a favor (poucos dias ou pode ser acaso): diz-se o
                                                // SENTIDO em relação à meta, a cinzento, com "pode ser acaso".
                                                // A cor fica só para quando a diferença se distingue do acaso.
                                                if (m.test?.status !== 'tested' || !m.test.sig || (m.test.rho > 0) !== up) { m.lean = side; return; }
                                                m.verdict = side;
                                            });
                                            const comparableCount = metricEntries.filter(([, m]) => m.change).length;
                                            const withGoal = metricEntries.filter(([, m]) => m.goal && m.change);
                                            const toward = withGoal.filter(([, m]) => m.verdict === 'toward');
                                            const away = withGoal.filter(([, m]) => m.verdict === 'away');
                                            const changedNoVerdict = metricEntries.filter(([, m]) => m.change && m.change.direction !== 'stable' && !m.verdict);

                                            const isEn = i18n.language === 'en';
                                            const noDataTxt = isEn ? 'no data' : 'sem dados';
                                            const noPrevTxt = isEn ? 'no data in the previous period' : 'sem dados no período anterior';
                                            const halfDayTxt = t('patterns.progress.todayHalf', 'hoje ainda vai a meio');
                                            // Valor recente (grande) — ou "sem dados", nunca um 0 inventado.
                                            const recentVal = (v, digits, unit, m) => v == null
                                                ? <span className={'text-sm italic text-gray-400'}>{m?.noToday && todayOnly ? halfDayTxt : noDataTxt}</span>
                                                : <>
                                                    <span className={'text-2xl font-bold font-mono-theme ' + 'text-white'}>{v.toFixed(digits)}</span>
                                                    {unit && <span className={'text-sm ' + ('text-gray-400')}>{unit}</span>}
                                                  </>;
                                            // "antes: X" — ou "sem dados no período anterior".
                                            const prevVal = (v, digits, suffix = '') => v == null
                                                ? noPrevTxt
                                                : `${t('patterns.progress.before')} ${v.toFixed(digits)}${suffix}`;
                                            // Etiqueta da mudança: seta + %, CINZENTA salvo veredicto de meta.
                                            const badge = (m, text) => {
                                                if (!m?.change || m.change.direction === 'stable') return null;
                                                const cls = m.verdict === 'toward' ? 'bg-green-900/30 text-green-400'
                                                    : m.verdict === 'away' ? 'bg-yellow-900/20 text-yellow-400'
                                                    : 'bg-gray-700/40 text-gray-300';
                                                return (
                                                    <span className={'text-xs px-2 py-1 rounded-full font-medium ' + cls}>
                                                        {text ?? `${m.change.direction === 'up' ? '↑' : '↓'} ${m.change.percent.toFixed(0)}%`}
                                                    </span>
                                                );
                                            };
                                            // Linha pequena: n de cada lado, acaso ou não, e (com meta) o veredicto.
                                            const basisLine = (m) => {
                                                const line = windowTestLine(m?.test);
                                                if (!line) return null;
                                                return (
                                                    <p className="text-[11px] leading-snug text-gray-500 mt-1">
                                                        {line}
                                                        {m.verdict === 'toward' && <span className="text-green-400"> {t('patterns.progress.towardGoal', '✓ Na direção da tua meta.')}</span>}
                                                        {m.verdict === 'away' && <span className="text-yellow-400"> {t('patterns.progress.awayGoal', 'No sentido contrário ao da tua meta.')}</span>}
                                                        {m.lean === 'toward' && <span className="text-gray-400"> {t('patterns.progress.leanToward', 'No sentido da tua meta.')}</span>}
                                                        {m.lean === 'away' && <span className="text-gray-400"> {t('patterns.progress.leanAway', 'No sentido contrário ao da tua meta.')}</span>}
                                                    </p>
                                                );
                                            };
                                            const row = (m, digits, unit, prevSuffix = '') => (
                                                <div className={'py-3'}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={'text-sm font-medium text-gray-300'}>{m.label}</span>
                                                        {badge(m)}
                                                    </div>
                                                    <div className="flex items-baseline gap-2">
                                                        {recentVal(m.recent, digits, unit, m)}
                                                        <span className={'text-sm ml-auto text-gray-500'}>{prevVal(m.previous, digits, prevSuffix)}</span>
                                                    </div>
                                                    {basisLine(m)}
                                                </div>
                                            );
                                            // O texto do topo: com as setas no presente, as frases de sempre; num
                                            // período passado, diz-se que dias se estão a comparar.
                                            const shortDay = (k) => new Date(`${k}T12:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
                                            const spanTxt = (days) => days.length === 0 ? '' : days.length === 1 ? shortDay(days[0]) : `${shortDay(days[0])}–${shortDay(days[days.length - 1])}`;
                                            const comparisonText = patternsPeriod !== 'tudo' && patternsPeriodOffset > 0
                                                ? (isEn
                                                    ? `Comparing ${spanTxt(recentAllDays)} vs the ${periodDays === 1 ? 'day' : periodDays + ' days'} before (${spanTxt(previousAllDays)})`
                                                    : `Comparação entre ${spanTxt(recentAllDays)} e ${periodDays === 1 ? 'o dia anterior' : 'os ' + periodDays + ' dias anteriores'} (${spanTxt(previousAllDays)})`)
                                                : patternsPeriod === 'hoje' ? t('patterns.progress.comparisons.hoje')
                                                : patternsPeriod === 'semana' ? t('patterns.progress.comparisons.semana')
                                                : patternsPeriod === 'mes' ? t('patterns.progress.comparisons.mes')
                                                : t('patterns.progress.comparisons.tudo', { days: periodDays });
                                            const notEnoughTxt = isEn ? 'Not enough data yet to compare' : 'Ainda não há dados suficientes para comparar';

                                            return (
                                                <div className="space-y-4">
                                                    {atypicalBanner}
                                                    {/* Period comparison header — sem percentagem de "progresso" nem cor:
                                                        só se diz o que se compara e, com metas, quantas mudaram na
                                                        direção delas de forma que se distingue do acaso. */}
                                                    <div className={'bg-gray-800/40 border-gray-700' + ' rounded-xl p-6 border'}>
                                                        <h3 className={'text-xl font-bold mb-3 text-white'}>
                                                            {t('patterns.progress.titleCompare', '📈 Este período e o anterior')}
                                                        </h3>
                                                        <p className={'text-sm mb-2 text-gray-300'}>{comparisonText}</p>
                                                        {todayInRecent && (
                                                            <p className="text-xs mb-2 text-gray-400">
                                                                {t('patterns.progress.todayNote', 'Hoje ainda vai a meio: fica fora das médias de consumos, mg e autocuidado (conta no sono, humor, energia e emoções).')}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-400">
                                                            {comparableCount === 0
                                                                ? notEnoughTxt
                                                                : withGoal.length === 0
                                                                    ? t('patterns.progress.noGoalsNote', 'Nenhuma destas medidas tem uma meta tua: as setas só dizem para que lado mudou, não se é melhor ou pior.')
                                                                    : t('patterns.progress.goalsNote', 'Com meta tua: {{toward}} de {{total}} mudaram na direção da meta, com uma diferença que se distingue do acaso. As outras setas são só descrição.', { toward: toward.length, total: withGoal.length })}
                                                        </p>
                                                    </div>

                                                    {/* Consumption metrics */}
                                                    {(progressData.frequency || progressData.dosage) && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 text-white'}>{t('patterns.progress.consumption')}</h3>
                                                            <div className="divide-y divide-gray-700">
                                                                {progressData.frequency && row(progressData.frequency, 1, t('patterns.progress.usesPerDay'))}
                                                                {progressData.dosage && row(progressData.dosage, 0, 'mg/dia', ' mg')}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Wellbeing metrics */}
                                                    {(progressData.sleep || progressData.mood || progressData.energy) && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 text-white'}>{t('patterns.progress.wellbeing')}</h3>
                                                            <div className="divide-y divide-gray-700">
                                                                {progressData.sleep && row(progressData.sleep, 1, t('patterns.progress.hours'), 'h')}
                                                                {progressData.mood && row(progressData.mood, 1, '/10')}
                                                                {progressData.energy && row(progressData.energy, 1, '/10')}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Lifestyle metrics */}
                                                    {(progressData.bedtimeConsistency || progressData.avgBedtime || progressData.selfCare) && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 text-white'}>{t('patterns.progress.routines')}</h3>
                                                            <div className="divide-y divide-gray-700">
                                                                {progressData.bedtimeConsistency && (() => {
                                                                    const bc = progressData.bedtimeConsistency;
                                                                    const sdH = bc.recent / 60;
                                                                    return (
                                                                        <div className={'py-3'}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <span className={'text-sm font-medium text-gray-300'}>{bc.label}</span>
                                                                                {badge(bc, bc.change && `${t('patterns.progress.variationShort', 'variação')} ${bc.change.direction === 'up' ? '↑' : '↓'} ${bc.change.percent.toFixed(0)}%`)}
                                                                            </div>
                                                                            <div className="flex items-baseline gap-2 mb-1">
                                                                                <span className={'text-2xl font-bold text-white'}>
                                                                                    {bc.recent < 30 ? t('patterns.progress.bedtimeConsist.veryConsistent') : bc.recent < 60 ? t('patterns.progress.bedtimeConsist.consistent') : t('patterns.progress.bedtimeConsist.variable')}
                                                                                </span>
                                                                                <span className={'text-xs ml-auto text-gray-500'}>
                                                                                    {t('patterns.progress.bedtimeConsist.variation', { val: fmtNum(sdH, 1) })}
                                                                                </span>
                                                                            </div>
                                                                            {/* Só descrição (antes: "Isto é excelente!", "podes melhorar",
                                                                                "confunde o ritmo circadiano"). */}
                                                                            <p className={'text-[11px] text-gray-500'}>
                                                                                {t('patterns.progress.bedtimeConsist.msgNeutral', 'As horas de deitar ficaram, em média, a ±{{val}}h umas das outras ({{n}} noites agora, {{prev}} antes).', { val: fmtNum(sdH, 1), n: bc.nRecent, prev: bc.nPrevious })}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })()}
                                                                {progressData.avgBedtime && (() => {
                                                                    const ab = progressData.avgBedtime;
                                                                    // Com meta de deitar: diz-se se a hora média fica dentro dela.
                                                                    // Sem meta: nada (antes: "Boa janela!", "pode afetar o sono",
                                                                    // "pode indicar inversão do ciclo").
                                                                    const inGoal = bedtimeGoal && ab.recentTime ? bedtimeMeetsTarget(ab.recentTime, bedtimeGoal.target) : null;
                                                                    return (
                                                                        <div className={'py-3'}>
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <span className={'text-sm font-medium text-gray-300'}>{ab.label}</span>
                                                                                {badge(ab, ab.change && (ab.change.direction === 'up' ? t('patterns.progress.avgBedtime.later') : t('patterns.progress.avgBedtime.earlier')))}
                                                                            </div>
                                                                            <div className="flex items-baseline gap-2">
                                                                                {ab.recentTime == null
                                                                                    ? <span className={'text-sm italic text-gray-400'}>{noDataTxt}</span>
                                                                                    : <span className={'text-2xl font-bold font-mono-theme text-white'}>{ab.recentTime}</span>}
                                                                                <span className={'text-sm ml-auto text-gray-500'}>
                                                                                    {ab.previousTime == null ? noPrevTxt : t('patterns.progress.avgBedtime.wasBefore', { time: ab.previousTime })}
                                                                                </span>
                                                                            </div>
                                                                            {inGoal != null && (
                                                                                <div className={'text-xs mt-2 ' + (inGoal ? 'text-green-400' : 'text-yellow-400')}>
                                                                                    {inGoal
                                                                                        ? t('patterns.progress.avgBedtime.inGoal', 'A hora média fica dentro da tua meta (até às {{target}}).', { target: bedtimeGoal.target })
                                                                                        : t('patterns.progress.avgBedtime.outGoal', 'A hora média fica depois da tua meta (até às {{target}}).', { target: bedtimeGoal.target })}
                                                                                </div>
                                                                            )}
                                                                            {basisLine(ab)}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                {progressData.selfCare && row(progressData.selfCare, 1, t('patterns.progress.activitiesPerCycle'))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Emotional metrics — só descrição (seta cinzenta). */}
                                                    {(progressData.negativeEmotions || progressData.positiveEmotions || progressData.topEmotions) && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 text-white'}>{t('patterns.progress.emotional')}</h3>
                                                            <div className="divide-y divide-gray-700">
                                                                {[['negativeEmotions', '😔', 'patterns.progress.negEmotions'], ['positiveEmotions', '😊', 'patterns.progress.posEmotions']].map(([key, emoji, titleKey]) => {
                                                                    const em = progressData[key];
                                                                    if (!em) return null;
                                                                    return (
                                                                        <div key={key} className={'py-3'}>
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="text-lg">{emoji}</span>
                                                                                <span className={'text-xs font-semibold uppercase tracking-wide text-gray-400'}>{t(titleKey)}</span>
                                                                                <span className="ml-auto">{badge(em)}</span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between">
                                                                                <div>
                                                                                    <div className="flex items-baseline gap-1">
                                                                                        <span className={'text-3xl font-black font-mono-theme text-white'}>
                                                                                            {em.recent == null ? noDataTxt : em.recent.toFixed(0) + '%'}
                                                                                        </span>
                                                                                        <span className={'text-xs font-medium text-gray-400'}>{t('patterns.progress.ofTotal')}</span>
                                                                                    </div>
                                                                                    {em.recentTotal > 0 && (
                                                                                        <div className={'text-xs mt-1 text-gray-400'}>
                                                                                            {t('patterns.progress.ofEmotions', { count: em.recentCount, total: em.recentTotal })}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className={'text-xs text-gray-400'}>
                                                                                    {em.previous == null ? noPrevTxt : t('patterns.progress.wasPercent', { val: em.previous.toFixed(0) })}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {progressData.topEmotions && (
                                                                    <div className={'py-3'}>
                                                                        <div className="flex items-center gap-2 mb-3">
                                                                            <span className="text-lg">🌟</span>
                                                                            <span className={'text-xs font-semibold uppercase tracking-wide text-gray-400'}>{t('patterns.progress.top3Emotions')}</span>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            {progressData.topEmotions.map((item, idx) => (
                                                                                <div key={idx} className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={'text-xs font-bold text-gray-500'}>#{idx + 1}</span>
                                                                                        <span className={'text-sm text-gray-200'}>{i18n.language === 'en' ? (EMOTION_EN[item.emotion] || item.emotion) : item.emotion}</span>
                                                                                    </div>
                                                                                    <span className={'text-xs px-2 py-0.5 rounded bg-gray-800/50 text-gray-400'}>{item.count}×</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Autocuidado Detalhado — números e barras neutros (não há meta de
                                                        autocuidado; antes: verde ≥70%, laranja abaixo). */}
                                                    {progressData.selfCareDetailed && (
                                                        <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 text-white'}>{t('patterns.progress.selfCare')}</h3>
                                                            <div className={'pb-3 mb-3 border-b border-gray-700'}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={'text-sm font-semibold text-gray-300'}>{t('patterns.progress.overallRate')}</span>
                                                                    <span className={'text-2xl font-black font-mono-theme text-white'}>{progressData.selfCareDetailed.recentOverall.toFixed(0)}%</span>
                                                                </div>
                                                                <div className={'bg-gray-700 rounded-full h-3 overflow-hidden'}>
                                                                    <div className={'h-full bg-gray-400 transition-all duration-500'} style={{width: `${progressData.selfCareDetailed.recentOverall}%`}}></div>
                                                                </div>
                                                                <div className={'text-xs mt-2 text-gray-400'}>{progressData.selfCareDetailed.suggestion}</div>
                                                            </div>
                                                            <div className={'pb-3 mb-3 border-b border-gray-700'}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={'text-sm font-semibold text-gray-300'}>{t('patterns.progress.completeCycles')}</span>
                                                                    <span className={'text-2xl font-black font-mono-theme text-white'}>{progressData.selfCareDetailed.completeCycles.recent.toFixed(0)}%</span>
                                                                </div>
                                                                <div className={'bg-gray-700 rounded-full h-3 overflow-hidden'}>
                                                                    <div className={'h-full bg-gray-400 transition-all duration-500'} style={{width: `${progressData.selfCareDetailed.completeCycles.recent}%`}}></div>
                                                                </div>
                                                                <div className={'text-xs mt-2 text-gray-400'}>
                                                                    {t('patterns.progress.completeCyclesDetail', { count: progressData.selfCareDetailed.completeCycles.recentCount, total: progressData.selfCareDetailed.completeCycles.recentTotal })}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {Object.entries(progressData.selfCareDetailed.areas).map(([areaKey, percent]) => {
                                                                    const areaNames = {
                                                                        water: { name: t('patterns.areas.water'), emoji: '💧' },
                                                                        food: { name: t('patterns.areas.food'), emoji: '🍎' },
                                                                        rest: { name: t('patterns.areas.rest'), emoji: '🏃' },
                                                                        social: { name: t('patterns.areas.social'), emoji: '👥' }
                                                                    };
                                                                    const area = areaNames[areaKey];
                                                                    return (
                                                                        <div key={areaKey} className={'py-2'}>
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="text-lg">{area.emoji}</span>
                                                                                <span className={'text-xs font-medium text-gray-300'}>{area.name}</span>
                                                                            </div>
                                                                            <div className="flex items-baseline gap-1">
                                                                                <span className={'text-2xl font-bold font-mono-theme text-white'}>{percent.toFixed(0)}%</span>
                                                                            </div>
                                                                            <div className={'bg-gray-600 rounded-full h-1.5 overflow-hidden mt-2'}>
                                                                                <div className={'h-full bg-gray-400'} style={{width: `${percent}%`}}></div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Resumo — sem "Excelente progresso!", "Momento desafiante" nem ⚠️.
                                                        Listas por ordem FIXA (a das secções acima), nunca pela maior
                                                        mudança: a maior, com poucos dias, é quase sempre ruído. */}
                                                    <div className={'bg-gray-800/40 border-gray-700 rounded-xl p-6 border'}>
                                                        <h3 className={'text-lg font-semibold mb-3 text-white'}>{t('patterns.progress.summaryTitleNeutral', '💡 Resumo')}</h3>
                                                        <div className={'text-sm leading-relaxed space-y-2 text-gray-300'}>
                                                            {comparableCount === 0 && <p>{notEnoughTxt}</p>}
                                                            {comparableCount > 0 && changedNoVerdict.length === 0 && toward.length === 0 && away.length === 0 && (
                                                                <p>{isEn ? 'No change larger than 5% between the two periods' : 'Sem mudanças maiores do que 5% entre os dois períodos'}</p>
                                                            )}
                                                            {toward.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-medium mb-1">{t('patterns.progress.towardList', 'Na direção das tuas metas:')}</p>
                                                                    <ul className="text-xs space-y-1">
                                                                        {toward.map(([key, m]) => <li key={key} className="text-green-400">✓ {m.label} ({m.change.direction === 'up' ? '↑' : '↓'}{m.change.percent.toFixed(0)}%)</li>)}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {away.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-medium mb-1">{t('patterns.progress.awayList', 'No sentido contrário ao das tuas metas:')}</p>
                                                                    <ul className="text-xs space-y-1">
                                                                        {away.map(([key, m]) => <li key={key} className="text-yellow-400">{m.label} ({m.change.direction === 'up' ? '↑' : '↓'}{m.change.percent.toFixed(0)}%)</li>)}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {changedNoVerdict.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-medium mb-1">{t('patterns.progress.changedList', 'Mudaram mais de 5% (só descrição — sem meta, ou a diferença não se distingue do acaso):')}</p>
                                                                    <ul className="text-xs space-y-1 text-gray-400">
                                                                        {changedNoVerdict.map(([key, m]) => <li key={key}>{m.label} ({m.change.direction === 'up' ? '↑' : '↓'}{m.change.percent.toFixed(0)}%)</li>)}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // TEMPORAL
                                        if (patternView === 'temporal') {
                                            // Calculate byDate for temporal analyses (dia LOCAL do registo)
                                            const byDate = {};
                                            filteredConsumptions.forEach(c => { const dk = c.date || safeToISODate(c.timestamp); if (dk) byDate[dk] = (byDate[dk] || 0) + 1; });
                                            // Em quantos dias se baseiam as contas por hora / parte do dia (totais:
                                            // aqui hoje entra, com o que já foi registado).
                                            const nDaysWithUse = Object.keys(byDate).length;
                                            // Abaixo de uma semana de dias com consumo, as PERCENTAGENS por hora e
                                            // por parte do dia dizem quase só como correu um ou dois dias: mostram-
                                            // -se as contagens e a app diz que ainda é cedo para percentagens.
                                            const PCT_MIN_DAYS = 7;
                                            const showPct = nDaysWithUse >= PCT_MIN_DAYS;
                                            const basisTxt = (k) => periodHasToday
                                                ? t('patterns.temporal.basisToday', '{{k}} consumo(s) em {{n}} dia(s) com consumo (hoje entra com o que já registaste).', { k, n: nDaysWithUse })
                                                : t('patterns.temporal.basis', '{{k}} consumo(s) em {{n}} dia(s) com consumo.', { k, n: nDaysWithUse });
                                            const fewPctTxt = t('patterns.temporal.fewPct', 'Percentagens só a partir de {{min}} dias com consumo (há {{n}}).', { min: PCT_MIN_DAYS, n: nDaysWithUse });

                                            // Calculate byHour
                                            const byHour = {};
                                            filteredConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                byHour[hour] = (byHour[hour] || 0) + 1;
                                            });

                                            // Calculate byPartOfDay
                                            const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
                                            filteredConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                if (hour >= 6 && hour < 12) byPartOfDay.manha++;
                                                else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
                                                else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
                                                else byPartOfDay.madrugada++;
                                            });

                                            // DIA DA SEMANA: MÉDIA de consumos por dia, em dias completos (sem hoje)
                                            // e conhecidos. Antes eram TOTAIS por dia da semana — um mês com 5
                                            // terças e 4 quartas fazia a terça "subir" sem nada mudar, e hoje (a
                                            // meio) puxava o seu dia para baixo. O dia com mais/menos só se diz com
                                            // pelo menos WEEKDAY_MIN_DAYS dias de CADA dia da semana (4 = um mês),
                                            // como o fator "dia da semana" dos Sinais de hoje.
                                            const WEEKDAY_MIN_DAYS = 4;
                                            const weekdayNames = t('analyses.dayNames', { returnObjects: true });
                                            const wd = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
                                            periodDoneDays.forEach(d => {
                                                const dow = new Date(`${d}T12:00:00`).getDay(); // dia LOCAL
                                                wd[dow].sum += byDate[d] || 0;
                                                wd[dow].n++;
                                            });
                                            const wdMean = wd.map(w => w.n > 0 ? w.sum / w.n : null);
                                            const minPerWeekday = Math.min(...wd.map(w => w.n));

                                            return (
                                        <div className="space-y-4">
                                            {atypicalBanner}
                                            {/* Por horário */}
                                            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.temporal.byHour')}</h3>
                                                {Object.keys(byHour).length === 0 ? (
                                                    <div className={'text-center py-4 text-sm ' + ('text-gray-400')}>{t('patterns.temporal.noData')}</div>
                                                ) : (() => {
                                                    const totalHour = Object.values(byHour).reduce((a, b) => a + b, 0);

                                                    // Agrupar horas em blocos de 3h para melhor visualização
                                                    const hourBlocks = [
                                                        { range: '00-02', hours: [0,1,2], icon: '🌙', label: t('patterns.timePeriods.dawn'), period: 'dawn' },
                                                        { range: '03-05', hours: [3,4,5], icon: '🌙', label: t('patterns.timePeriods.dawn'), period: 'dawn' },
                                                        { range: '06-08', hours: [6,7,8], icon: '🌅', label: t('patterns.timePeriods.morning'), period: 'morning' },
                                                        { range: '09-11', hours: [9,10,11], icon: '☀️', label: t('patterns.timePeriods.morning'), period: 'morning' },
                                                        { range: '12-14', hours: [12,13,14], icon: '🌤️', label: t('patterns.timePeriods.afternoon'), period: 'afternoon' },
                                                        { range: '15-17', hours: [15,16,17], icon: '🌤️', label: t('patterns.timePeriods.afternoon'), period: 'afternoon' },
                                                        { range: '18-20', hours: [18,19,20], icon: '🌆', label: t('patterns.timePeriods.night'), period: 'night' },
                                                        { range: '21-23', hours: [21,22,23], icon: '🌃', label: t('patterns.timePeriods.night'), period: 'night' }
                                                    ];

                                                    // Calcular máximo dos BLOCOS (não das horas individuais)
                                                    const blockCounts = hourBlocks.map(block =>
                                                        block.hours.reduce((sum, h) => sum + (byHour[h] || 0), 0)
                                                    );
                                                    const maxBlockCount = Math.max(...blockCounts);

                                                    return (
                                                        <div className="space-y-2">
                                                            {hourBlocks.map(block => {
                                                                const blockCount = block.hours.reduce((sum, h) => sum + (byHour[h] || 0), 0);
                                                                const blockPercent = totalHour > 0 ? Math.round((blockCount / totalHour) * 100) : 0;
                                                                const intensity = maxBlockCount > 0 ? (blockCount / maxBlockCount) : 0;

                                                                // Um só roxo, mais vivo = mais consumos (como o mapa de calor). Antes cada
                                                                // período tinha a sua cor (laranja, amarelo, azul), que não queria dizer nada.
                                                                const colorClass = intensity > 0.1 ? '' : 'bg-gray-700';
                                                                const barBg = intensity > 0.7 ? '#7c3aed' : intensity > 0.4 ? '#7c3aeda0' : intensity > 0.1 ? '#7c3aed70' : undefined;

                                                                return (
                                                                    <div key={block.range} className="flex items-center gap-3">
                                                                        <div className={'text-xl w-8 text-center'}>
                                                                            {block.icon}
                                                                        </div>
                                                                        <div className={'text-sm font-medium w-16 ' + ('text-gray-300')}>
                                                                            {block.range}h
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className={('bg-gray-700') + ' rounded-full h-8 overflow-hidden relative'}>
                                                                                <div className={colorClass + ' h-full flex items-center px-4 text-white text-sm font-bold font-mono-theme transition-all duration-300'} style={{width: Math.max(intensity * 100, blockCount > 0 ? 8 : 0) + '%', background: barBg}}>
                                                                                    {blockCount > 0 && (
                                                                                        <span className="whitespace-nowrap">
                                                                                            {blockCount}x {showPct && blockPercent > 0 && `· ${blockPercent}%`}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Legenda + em quantos dias se baseia */}
                                                            <div className={'text-xs mt-4 pt-3 border-t text-center space-y-1 ' + 'text-gray-400 border-gray-700'}>
                                                                <div>{t('patterns.freq.intensityLegend')}</div>
                                                                <div className="text-gray-500">{basisTxt(totalHour)}{!showPct && ` ${fewPctTxt}`}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Por período do dia */}
                                            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.temporal.byPeriod')}</h3>
                                                {(() => {
                                                    const total = byPartOfDay.manha + byPartOfDay.tarde + byPartOfDay.noite + byPartOfDay.madrugada;
                                                    if (total === 0) return <div className={'text-center py-4 text-sm ' + ('text-gray-400')}>{t('patterns.temporal.noData')}</div>;

                                                    const cells = [
                                                        ['manha', '🌅', '6h-12h'],
                                                        ['tarde', '☀️', '12h-18h'],
                                                        ['noite', '🌙', '18h-24h'],
                                                        ['madrugada', '⭐', '0h-6h'],
                                                    ];
                                                    return (
                                                        <>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 divide-x divide-gray-700 border-y border-gray-700 py-3">
                                                                {cells.map(([key, icon, hours]) => (
                                                                    <div key={key} className="px-2 text-center">
                                                                        <div className="text-2xl mb-2">{icon}</div>
                                                                        <div className={'text-xs mb-1 text-gray-300'}>{t('patterns.temporal.' + key)}</div>
                                                                        <div className={'text-xs mb-2 text-gray-500'}>{hours}</div>
                                                                        {/* Com poucos dias: a contagem em grande, sem percentagem. */}
                                                                        <div className={'text-xl font-bold font-mono-theme text-white'}>
                                                                            {showPct ? `${Math.round((byPartOfDay[key] / total) * 100)}%` : `${byPartOfDay[key]}x`}
                                                                        </div>
                                                                        {showPct && <div className={'text-xs mt-1 text-gray-400'}>{byPartOfDay[key]}x</div>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <p className="text-xs mt-3 text-center text-gray-500">{basisTxt(total)}{!showPct && ` ${fewPctTxt}`}</p>
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            {/* Por dia da semana — média por dia, em dias completos */}
                                            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                <h3 className={'font-semibold mb-1 text-white'}>{t('patterns.temporal.byWeekday')}</h3>
                                                <p className="text-xs mb-4 text-gray-400">
                                                    {periodDoneDays.length > 0
                                                        ? t('patterns.temporal.weekdayDesc', 'Média de consumos por dia, em {{n}} dias completos (hoje fica de fora: ainda vai a meio).', { n: periodDoneDays.length })
                                                        : periodHasToday ? t('patterns.progress.todayHalf', 'hoje ainda vai a meio') : t('patterns.temporal.noData')}
                                                </p>
                                                <div className="space-y-3">
                                                    {periodDoneDays.length === 0 ? (
                                                        <div className={'text-center py-4 text-sm text-gray-400'}>{t('patterns.temporal.noData')}</div>
                                                    ) : (() => {
                                                        const present = wdMean.map((m, i) => [i, m]).filter(([, m]) => m != null);
                                                        const topMean = Math.max(...present.map(([, m]) => m), 0);
                                                        // O mais alto e o mais baixo só com dias suficientes de CADA dia da semana.
                                                        const canRank = minPerWeekday >= WEEKDAY_MIN_DAYS && topMean > 0;
                                                        const maxDow = canRank ? present.reduce((a, b) => b[1] > a[1] ? b : a)[0] : null;
                                                        const minDow = canRank ? present.reduce((a, b) => b[1] < a[1] ? b : a)[0] : null;
                                                        return (
                                                            <>
                                                                {wd.map((w, day) => {
                                                                    const mean = wdMean[day];
                                                                    const isMax = day === maxDow;
                                                                    const isMin = day === minDow && maxDow !== minDow;
                                                                    return (
                                                                        <div key={day} className="flex items-center gap-2">
                                                                            <div className={'text-xs w-10 font-medium flex items-center gap-1 text-gray-300'}>
                                                                                {weekdayNames[day]}
                                                                                {isMax && <span>↑</span>}
                                                                                {isMin && <span>↓</span>}
                                                                            </div>
                                                                            <div className={'flex-1 rounded-full h-7 overflow-hidden bg-gray-700'}>
                                                                                {/* Sem vermelho no dia de mais consumo nem verde no de menos: sem meta, a app
                                                                                    não diz qual é o bom. Um só roxo (como o mapa de calor). */}
                                                                                {mean != null && (
                                                                                    <div
                                                                                        className="h-full flex items-center justify-between px-3 text-white text-xs font-medium font-mono-theme transition-all"
                                                                                        style={{ width: Math.max(18, topMean > 0 ? (mean / topMean) * 100 : 0) + '%', background: isMax ? '#7c3aed' : isMin ? '#7c3aed70' : '#7c3aeda0' }}
                                                                                    >
                                                                                        <span>{fmtNum(mean, 1)}</span>
                                                                                        <span className="text-white/70">{t('patterns.temporal.nDaysShort', '{{n}}d', { n: w.n })}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}

                                                                <div className={'mt-4 pt-3 border-t text-xs border-gray-700 text-gray-400'}>
                                                                    {canRank ? (
                                                                        <>
                                                                            <span className={'font-semibold text-white'}>↑ {weekdayNames[maxDow]}</span>: {t('patterns.temporal.weekdayHigh', 'média mais alta ({{v}}/dia em {{n}} dias)', { v: fmtNum(wdMean[maxDow], 1), n: wd[maxDow].n })}
                                                                            {maxDow !== minDow && <>{' • '}<span className={'font-semibold text-white'}>↓ {weekdayNames[minDow]}</span>: {t('patterns.temporal.weekdayLow', 'média mais baixa ({{v}}/dia em {{n}} dias)', { v: fmtNum(wdMean[minDow], 1), n: wd[minDow].n })}</>}
                                                                            <span className="block mt-1 text-gray-500">{t('patterns.temporal.weekdayCaveat', 'Com 7 dias para comparar, há sempre um mais alto e um mais baixo, mesmo só por acaso.')}</span>
                                                                        </>
                                                                    ) : (
                                                                        t('patterns.temporal.weekdayFew', 'Para dizer qual o dia da semana com mais ou menos consumos são precisos pelo menos {{min}} dias completos de cada dia da semana — o que tem menos tem {{n}}.', { min: WEEKDAY_MIN_DAYS, n: minPerWeekday })
                                                                    )}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* 📆 CICLO MENSAL */}
                                            {Object.keys(byDate).length >= 15 && (() => {
                                                // Dias completos e conhecidos (um dia conhecido sem consumos é 0;
                                                // antes só entravam dias com consumo, e o dia do mês lia-se com
                                                // new Date('YYYY-MM-DD'), meia-noite UTC — noutros fusos dava o
                                                // dia anterior).
                                                // Limiar: MONTHLY_MIN_DAYS = 56 dias (≈ 2 meses, para cada dia do mês
                                                // aparecer pelo menos ~2 vezes). Abaixo disso, a app diz que não sabe.
                                                const MONTHLY_MIN_DAYS = 56;
                                                const days = periodDoneDays;
                                                if (days.length < MONTHLY_MIN_DAYS) {
                                                    return (
                                                        <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                            <h3 className={'font-semibold mb-2 text-white'}>{t('patterns.structural.monthlyCycle')}</h3>
                                                            <p className="text-sm text-gray-400">{t('patterns.structural.monthlyFew', 'Ainda há poucos dias para isto — há {{n}} dias completos; são precisos {{min}} (cerca de 2 meses).', { n: days.length, min: MONTHLY_MIN_DAYS })}</p>
                                                        </div>
                                                    );
                                                }
                                                const domOf = (d) => new Date(`${d}T12:00:00`).getDate();
                                                const dayOfMonthData = {};
                                                days.forEach(d => { (dayOfMonthData[domOf(d)] = dayOfMonthData[domOf(d)] || []).push(byDate[d] || 0); });
                                                const dayOfMonthAverages = Object.entries(dayOfMonthData).map(([day, counts]) => [day, counts.reduce((s, c) => s + c, 0) / counts.length, counts.length]);
                                                // Ordenados pela média só para escolher os 5 de cima/baixo (é uma lista de
                                                // dias, não de relações); cada um diz em quantos meses se baseia.
                                                const sortedDays = dayOfMonthAverages.sort((a, b) => b[1] - a[1]);
                                                const maxAvg = sortedDays[0][1] || 1;

                                                // Os dias do mês diferem mais do que o acaso costuma dar? Há sempre
                                                // um dia mais alto e um mais baixo, mesmo sem padrão nenhum (31
                                                // grupos pequenos). rangePermutation compara a distância entre a
                                                // média mais alta e a mais baixa com a que sai a baralhar os dias.
                                                // (Antes: hipótese fixa "dias 20–25", tirada a pedido da Teresa.)
                                                const domGroups = Object.values(dayOfMonthData).filter(g => g.length >= 2);
                                                const domTest = domGroups.length >= 10 ? rangePermutation(domGroups) : null;
                                                const domSig = domTest && Number(domTest.p.toFixed(3)) < 0.05;
                                                const bar = (day, avg, nMonths) => (
                                                    <div key={day} className="flex items-center gap-2">
                                                        <div className={'text-xs w-12 font-medium text-right text-gray-300'}>{t('patterns.structural.day', { n: day })}</div>
                                                        <div className={'flex-1 rounded-full h-6 overflow-hidden bg-gray-700'}>
                                                            <div className="h-full flex items-center justify-between px-2 text-white text-xs font-medium font-mono-theme transition-all" style={{ width: `${Math.max(20, (avg / maxAvg) * 100)}%`, background: '#7c3aeda0' }}>
                                                                <span>{fmtNum(avg, 1)}</span>
                                                                <span className="text-white/70">×{nMonths}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );

                                                return (
                                                    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                                                        <h3 className={'font-semibold mb-1 text-white'}>{t('patterns.structural.monthlyCycle')}</h3>
                                                        <p className="text-xs mb-3 text-gray-400">{t('patterns.structural.monthlyDesc', 'Média de consumos por dia, para cada dia do mês, em {{n}} dias completos. "×2" = esse dia do mês apareceu 2 vezes.', { n: days.length })}</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                            <div className="space-y-2">
                                                                <div className={'text-xs font-semibold mb-2 text-white'}>↑ {t('patterns.structural.moreConsumption')}</div>
                                                                {sortedDays.slice(0, 5).map(([day, avg, n]) => bar(day, avg, n))}
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className={'text-xs font-semibold mb-2 text-white'}>↓ {t('patterns.structural.lessConsumption')}</div>
                                                                {sortedDays.slice(-5).reverse().map(([day, avg, n]) => bar(day, avg, n))}
                                                            </div>
                                                        </div>
                                                        <div className={'pt-3 border-t text-xs border-gray-700 text-gray-400'}>
                                                            {!domTest
                                                                ? t('patterns.structural.domFew', 'Ainda não dá para dizer se os dias do mês diferem mais do que o acaso.')
                                                                : domSig
                                                                    ? t('patterns.structural.domSig', 'Os dias do mês diferem entre si mais do que o acaso costuma dar ({{p}}).', { p: fmtP(domTest) })
                                                                    : t('patterns.structural.domChance', 'Há sempre dias mais altos e mais baixos; aqui a diferença entre eles não se distingue do acaso ({{p}}).', { p: fmtP(domTest) })}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                            );
                                        }

                                        // ESTRUTURAL
                                        if (patternView === 'estrutural') {
                                            // Calculate byDate for components that need it
                                            const byDate = {};
                                            filteredConsumptions.forEach(c => { const dk = c.date || safeToISODate(c.timestamp); if (dk) byDate[dk] = (byDate[dk] || 0) + 1; });

                                            // Calcular intervalos entre consumos
                                            const sorted = [...filteredConsumptions].sort((a,b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
                                            const intervals = [];
                                            for (let i = 1; i < sorted.length; i++) {
                                                const t1 = new Date(sorted[i].timestamp).getTime(), t0 = new Date(sorted[i-1].timestamp).getTime();
                                                if (gapCrossesDays(t0, t1, excludedDates)) continue; // passa por dia sem registo → não se sabe
                                                if (getDateKeyFromItem(sorted[i]) !== getDateKeyFromItem(sorted[i-1])) continue; // só dentro do mesmo dia (como a meta)
                                                intervals.push({ hours: (t1 - t0) / 3600000, date: sorted[i].date });
                                            }

                                            // mg por dia SEM HOJE: o mg de hoje (à mão ou da balança) pode ser só o que
                                            // já se usou até agora, e puxava as médias, os mínimos e as tendências
                                            // para baixo. Os outros dias ficam todos (só dias com medição real).
                                            const doneMgDays = periodMgDays.filter(r => r.date !== todayKeyP);
                                            const mgTodayLeftOut = doneMgDays.length !== periodMgDays.length;
                                            const mgTodayNote = mgTodayLeftOut ? t('patterns.structural.mgNoToday', 'Hoje fica de fora: ainda vai a meio.') : null;

                                            return (
                                                <div className="space-y-4">
                                                    {atypicalBanner}
                                                    {/* 📊 DOSAGEM SEMANAL */}
                                                    {(() => {
                                                        if (doneMgDays.length < 7) return null;
                                                        // Semana ISO de um dia 'YYYY-MM-DD', lido ao MEIO-DIA local (new Date('YYYY-MM-DD')
                                                        // é meia-noite UTC: em fusos atrás de UTC caía no dia anterior).
                                                        const getISOWeek = (dateKey) => {
                                                            const d = new Date(`${dateKey}T12:00:00`);
                                                            d.setHours(0, 0, 0, 0);
                                                            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
                                                            const yearStart = new Date(d.getFullYear(), 0, 1);
                                                            const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                                                            return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
                                                        };
                                                        const weeklyData = {};
                                                        doneMgDays.forEach(log => {
                                                            const mg = parseFloat(log.mg);
                                                            if (!mg || mg <= 0) return;
                                                            const logDate = log.date || safeToISODate(log.timestamp);
                                                            const week = getISOWeek(logDate);
                                                            if (!weeklyData[week]) weeklyData[week] = { week, totalMg: 0, days: 0, vals: [] };
                                                            weeklyData[week].totalMg += mg;
                                                            weeklyData[week].days++;
                                                            weeklyData[week].vals.push({ date: logDate, mg });
                                                        });
                                                        // Por semana: mg POR DIA MEDIDO (total ÷ dias com medição). Antes somava a
                                                        // semana, e uma semana com 2 dias medidos parecia "menos" do que uma com 7.
                                                        Object.values(weeklyData).forEach(w => { w.avgMg = w.totalMg / w.days; });
                                                        const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week));
                                                        if (sortedWeeks.length < 2) return null;
                                                        // A semana em curso ainda não acabou: aparece no gráfico, mas fica fora
                                                        // das comparações e da tendência.
                                                        const currentWeek = getISOWeek(getTodayKey());
                                                        const completeWeeks = sortedWeeks.filter(w => w.week !== currentWeek);
                                                        // mg por dia medido de um conjunto de semanas (cada dia medido pesa igual).
                                                        const perMeasuredDay = (weeks) => {
                                                            const days = weeks.reduce((s, w) => s + w.days, 0);
                                                            return days > 0 ? weeks.reduce((s, w) => s + w.totalMg, 0) / days : null;
                                                        };
                                                        const recentWeeks = completeWeeks.slice(-4);
                                                        const oldWeeks = completeWeeks.slice(0, Math.max(0, Math.min(4, completeWeeks.length - 4)));
                                                        const avgRecent = perMeasuredDay(recentWeeks);
                                                        const avgOld = perMeasuredDay(oldWeeks);
                                                        // Sem semanas mais antigas não há tendência: null (não "Estável 0%").
                                                        const trendPct = (avgRecent != null && avgOld != null && avgOld > 0) ? ((avgRecent - avgOld) / avgOld * 100) : null;
                                                        // A seta 📈/📉 só aparece se a diferença entre os dias medidos das
                                                        // semanas antigas e das 4 recentes se distinguir do acaso (windowTest,
                                                        // por deslocamento). Antes bastavam ±15%.
                                                        const daysOf = (weeks) => weeks.flatMap(w => w.vals).sort((a, b) => a.date.localeCompare(b.date)).map(v => v.mg);
                                                        const weeksTest = trendPct != null ? windowTest(daysOf(oldWeeks), daysOf(recentWeeks)) : null;
                                                        const weeksSig = weeksTest?.status === 'tested' && weeksTest.sig && (weeksTest.rho > 0) === (trendPct > 0);
                                                        const trendIcon = !weeksSig ? '' : trendPct > 0 ? '📈' : '📉';
                                                        const weekPrefix = i18n.language === 'pt' ? 'S' : 'W';
                                                        const chartData = sortedWeeks.slice(-12).map(w => ({ week: w.week.replace(/^\d{4}-W/, weekPrefix), dosagem: Math.round(w.avgMg), days: w.days, current: w.week === currentWeek }));
                                                        const avgWeekly = perMeasuredDay(sortedWeeks).toFixed(0);
                                                        return (
                                                            <div className={('bg-gray-800 border-gray-700') + ' rounded-xl p-4 border'}>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <h3 className={'font-semibold ' + ('text-white')}>{t('patterns.structural.weeklyDosage')}</h3>
                                                                    <div className={'text-xs px-2 py-1 rounded-full ' + ('bg-gray-800/40 border-gray-700 text-white')}>{sortedWeeks.length} {sortedWeeks.length === 1 ? t('patterns.structural.week') : t('patterns.structural.weeks')}</div>
                                                                </div>
                                                                <div className="grid grid-cols-2 divide-x divide-gray-700 border-y border-gray-700 py-3 mb-4">
                                                                    <div className="text-center px-2">
                                                                        <div className={'text-xs opacity-75 mb-1 ' + ('text-gray-400')}>{i18n.language === 'en' ? 'Average per measured day' : 'Média por dia medido'}</div>
                                                                        <div className={'text-2xl font-bold font-mono-theme ' + 'text-white'}>{avgWeekly}mg</div>
                                                                    </div>
                                                                    <div className="text-center px-2">
                                                                        <div className={'text-xs opacity-75 mb-1 ' + ('text-gray-400')}>{t('patterns.structural.trend4weeks')}</div>
                                                                        <div className="text-xl font-bold font-mono-theme flex items-center justify-center gap-1 text-white">
                                                                            {trendPct == null
                                                                                ? <span className="text-xs font-normal">{i18n.language === 'en' ? 'no older weeks to compare' : 'sem semanas anteriores para comparar'}</span>
                                                                                : <>{trendIcon && <span>{trendIcon}</span>}<span className="text-sm">{trendPct > 0 ? '+' : ''}{fmtNum(trendPct, 0)}%</span></>}
                                                                        </div>
                                                                        {weeksTest && <div className="text-[10px] leading-tight mt-1 text-gray-500">{windowTestLine(weeksTest)}</div>}
                                                                    </div>
                                                                </div>
                                                                <div style={{ width: '100%', height: 200 }}>
                                                                    <ResponsiveContainer>
                                                                        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -5 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" stroke={'#374151'} />
                                                                            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                                                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} label={{ value: 'mg/dia', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#9ca3af' }} />
                                                                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: `1px solid ${'#374151'}`, borderRadius: '6px', fontSize: '12px' }} formatter={(value, name, props) => [`${value}mg/${i18n.language === 'en' ? 'day' : 'dia'} (${props.payload.days} ${props.payload.days === 1 ? t('coach.day_singular') : t('coach.day_plural')} ${i18n.language === 'en' ? 'measured' : (props.payload.days === 1 ? 'medido' : 'medidos')}${props.payload.current ? (i18n.language === 'en' ? ' · week in progress' : ' · semana em curso') : ''})`, i18n.language === 'en' ? 'Average per measured day' : 'Média por dia medido']} />
                                                                            <Bar dataKey="dosagem" fill={'#a78bfa'} radius={[4, 4, 0, 0]} />
                                                                        </BarChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                                <p className={'text-xs italic mt-2 text-center ' + ('text-gray-400')}>{t('patterns.structural.lastNWeeks', { n: Math.min(12, sortedWeeks.length) })}{mgTodayNote && ` · ${mgTodayNote}`}</p>
                                                                {completeWeeks.length >= 2 && (() => {
                                                                    // 1.ª e última semana COMPLETAS, em mg por dia medido (a semana em
                                                                    // curso fica de fora: ainda não acabou).
                                                                    const firstWeek = completeWeeks[0];
                                                                    const lastWeek = completeWeeks[completeWeeks.length - 1];
                                                                    const change = lastWeek.avgMg - firstWeek.avgMg;
                                                                    const changePct = (change / firstWeek.avgMg * 100);
                                                                    if (Math.abs(changePct) < 5) return null;
                                                                    // Só descrição, com os dias medidos de cada semana (antes: "Bom
                                                                    // progresso!" a descer e "Possível tolerância?" a subir — juízo e
                                                                    // causa que os números não dizem). Duas semanas soltas, com poucos
                                                                    // dias medidos, não chegam: pelo menos 3 em cada uma.
                                                                    if (firstWeek.days < 3 || lastWeek.days < 3) return null;
                                                                    const vals = { first: firstWeek.avgMg.toFixed(0), last: lastWeek.avgMg.toFixed(0), pct: Math.abs(changePct).toFixed(0), a: firstWeek.days, b: lastWeek.days };
                                                                    return (
                                                                        <div className={'mt-3 pt-3 border-t text-sm ' + ('border-gray-700')}>
                                                                            <p className={'text-gray-300'}>
                                                                                {change > 0
                                                                                    ? t('patterns.structural.dosageRoseN', 'A média por dia medido passou de {{first}} mg (1.ª semana completa, {{a}} dias medidos) para {{last}} mg (última, {{b}} dias) — mais {{pct}}%.', vals)
                                                                                    : t('patterns.structural.dosageDroppedN', 'A média por dia medido passou de {{first}} mg (1.ª semana completa, {{a}} dias medidos) para {{last}} mg (última, {{b}} dias) — menos {{pct}}%.', vals)}
                                                                            </p>
                                                                            <p className="text-[11px] mt-1 text-gray-500">{t('patterns.structural.twoWeeksNote', 'São duas semanas soltas: diz o que aconteceu, não se é uma tendência.')}</p>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Análise de Intervalos */}
                                                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.structural.intervals')}</h3>
                                                        {intervals.length === 0 ? (
                                                            <div className={'text-center py-4 text-sm ' + ('text-gray-400')}>
                                                                {i18n.language === 'en' ? 'No intervals (requires ≥2 uses)' : 'Sem intervalos (necessário ≥2 consumos)'}
                                                            </div>
                                                        ) : (() => {
                                                            // Limite: a meta de intervalo da pessoa, se tiver; senão 2h, só como
                                                            // divisória descritiva (sem verde/laranja nem ✅/⚠️ — regra do elogio).
                                                            const ivTarget = intervalGoal ? parseFloat(intervalGoal.target) : NaN;
                                                            const hasIvGoal = Number.isFinite(ivTarget);
                                                            const ivThr = hasIvGoal ? ivTarget : 2;
                                                            const goodIntervals = intervals.filter(i => i.hours >= ivThr);
                                                            const shortIntervals = intervals.filter(i => i.hours < ivThr);
                                                            const avgInterval = intervals.reduce((sum, i) => sum + i.hours, 0) / intervals.length;
                                                            const maxInterval = Math.max(...intervals.map(i => i.hours));
                                                            const goodPercent = ((goodIntervals.length / intervals.length) * 100).toFixed(0);
                                                            const shortPercent = ((shortIntervals.length / intervals.length) * 100).toFixed(0);

                                                            return (
                                                                <>
                                                                    <div className="grid grid-cols-3 divide-x divide-gray-700 border-y border-gray-700 py-3 mb-4">
                                                                        <div className="px-2 py-1 text-center">
                                                                            <div className={`text-2xl font-bold font-mono-theme ${'text-white'}`}>{intervals.length}</div>
                                                                            <div className={`text-xs ${'text-gray-300'}`}>Total</div>
                                                                        </div>
                                                                        <div className="px-2 py-1 text-center">
                                                                            <div className={`text-2xl font-bold font-mono-theme ${'text-white'}`}>{avgInterval.toFixed(1)}h</div>
                                                                            <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.average')}</div>
                                                                        </div>
                                                                        <div className="px-2 py-1 text-center">
                                                                            <div className={`text-2xl font-bold font-mono-theme ${'text-white'}`}>{maxInterval.toFixed(1)}h</div>
                                                                            <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.maximum')}</div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="divide-y divide-gray-700">
                                                                        {/* Intervalos que chegam / não chegam ao limite (meta da pessoa ou 2h) */}
                                                                            {[
                                                                                { key: 'good', n: goodIntervals.length, pct: goodPercent, ok: true },
                                                                                { key: 'short', n: shortIntervals.length, pct: shortPercent, ok: false },
                                                                            ].map(row => {
                                                                                const en = i18n.language === 'en';
                                                                                const label = hasIvGoal
                                                                                    ? (row.ok ? (en ? `Reach your goal (≥${ivThr}h)` : `Chegam à tua meta (≥${ivThr}h)`) : (en ? `Below your goal (<${ivThr}h)` : `Abaixo da tua meta (<${ivThr}h)`))
                                                                                    : (row.ok ? (en ? '2h or more' : '2h ou mais') : (en ? 'Under 2h' : 'Menos de 2h'));
                                                                                const tone = !hasIvGoal ? 'text-gray-200' : row.ok ? 'text-green-400' : 'text-yellow-400';
                                                                                const bar = !hasIvGoal ? 'bg-gray-400' : row.ok ? 'bg-green-500' : 'bg-yellow-500';
                                                                                return (
                                                                                    <div key={row.key} className="py-3">
                                                                                        <div className="flex items-center justify-between mb-2">
                                                                                            <div className={'text-sm font-medium flex items-center gap-2 ' + tone}>
                                                                                                {hasIvGoal && <span>{row.ok ? '✅' : '⚠️'}</span>}
                                                                                                <span>{label}</span>
                                                                                            </div>
                                                                                            <div className={'text-sm font-bold font-mono-theme ' + tone}>
                                                                                                {row.n} ({row.pct}%)
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                                                                                            <div className={bar + ' h-full transition-all duration-500'} style={{width: row.pct + '%'}}></div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                    </div>

                                                                    {/* Frase de leitura só com meta de intervalo (regra do elogio). Antes dizia a

                                                                        toda a gente "Ótimo! Continua assim!" ou "Foca-te em aumentar o tempo". */}

                                                                    {hasIvGoal && (

                                                                        <div className="mt-3">

                                                                            <p className="text-xs leading-relaxed text-gray-300">

                                                                                {i18n.language === 'en'

                                                                                    ? (goodPercent >= 50 ? `More than half of the intervals reach your goal (${ivThr}h).` : `Fewer than half of the intervals reach your goal (${ivThr}h).`)

                                                                                    : (goodPercent >= 50 ? `Mais de metade dos intervalos chegam à tua meta (${ivThr}h).` : `Menos de metade dos intervalos chegam à tua meta (${ivThr}h).`)}

                                                                            </p>

                                                                        </div>

                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Análise de Dosagens */}
                                                    {(() => {
                                                        // mg por dia da fonte unificada ("Registar mg" à mão ou pesagens do
                                                        // saco); não cycles.mg, que pode ser o total de vários dias.
                                                        const dailyDosageRecords = doneMgDays; // sem hoje (a meio)

                                                        if (dailyDosageRecords.length === 0) {
                                                            return (
                                                                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.structural.dosageAnalysis')}</h3>
                                                                    <div className={'text-center py-4 text-sm ' + ('text-gray-400')}>
                                                                        {mgTodayLeftOut
                                                                            ? t('patterns.structural.mgOnlyToday', 'Só há mg de hoje, que ainda vai a meio — as contas começam amanhã.')
                                                                            : t('patterns.structural.noDosageData')}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        // Calcular estatísticas
                                                        const dosages = dailyDosageRecords.map(r => r.mg);
                                                        const totalDosage = dosages.reduce((sum, d) => sum + d, 0);
                                                        const avgDosage = totalDosage / dosages.length;
                                                        const maxDosage = Math.max(...dosages);
                                                        const minDosage = Math.min(...dosages);

                                                        // Calcular tendência (primeira metade vs segunda metade do período)
                                                        const sortedByDate = [...dailyDosageRecords].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
                                                        const midpoint = Math.floor(sortedByDate.length / 2);
                                                        const firstHalf = sortedByDate.slice(0, midpoint);
                                                        const secondHalf = sortedByDate.slice(midpoint);

                                                        // 1.ª vs 2.ª metade dos dias medidos. "Aumentaram/Diminuíram X%" só se a
                                                        // diferença se distinguir do acaso (windowTest, por deslocamento); senão
                                                        // mostra-se a % como descrição, com o n e o p. Sem cor de juízo.
                                                        let trendIcon = '➡️';
                                                        let trendText = t('patterns.structural.trendStable');
                                                        const trendColor = 'text-white';
                                                        const halvesTest = windowTest(firstHalf.map(r => r.mg), secondHalf.map(r => r.mg));
                                                        if (firstHalf.length > 0 && secondHalf.length > 0) {
                                                            const avgFirst = firstHalf.reduce((sum, log) => sum + log.mg, 0) / firstHalf.length;
                                                            const avgSecond = secondHalf.reduce((sum, log) => sum + log.mg, 0) / secondHalf.length;
                                                            const change = ((avgSecond - avgFirst) / avgFirst) * 100;
                                                            const trendPercent = Math.abs(change);
                                                            const sigSameWay = halvesTest.status === 'tested' && halvesTest.sig && (halvesTest.rho > 0) === (change > 0);
                                                            if (halvesTest.status === 'few') {
                                                                // Poucos dias: nem "Estáveis" nem "Aumentaram" — só a diferença.
                                                                trendIcon = '';
                                                                trendText = `${change > 0 ? '+' : change < 0 ? '−' : ''}${trendPercent.toFixed(0)}%`;
                                                            } else if (Math.abs(change) > 5 && sigSameWay) {
                                                                trendIcon = change > 0 ? '📈' : '📉';
                                                                trendText = change > 0
                                                                    ? t('patterns.structural.increasedByPct', { pct: trendPercent.toFixed(0) })
                                                                    : t('patterns.structural.decreasedByPct', { pct: trendPercent.toFixed(0) });
                                                            } else if (Math.abs(change) > 5) {
                                                                // Mudou, mas não se sabe se é mais do que acaso: sem seta de tendência.
                                                                trendIcon = '';
                                                                trendText = t('patterns.structural.halvesChangeOnly', '{{sign}}{{pct}}% (sem tendência que se distinga do acaso)', { sign: change > 0 ? '+' : '−', pct: trendPercent.toFixed(0) });
                                                            }
                                                        }

                                                        // Distribuição por faixas de dosagem (dinâmica)
                                                        // Tentar usar meta de reduce_quantity, senão usar percentis dos dados
                                                        let lowThreshold, highThreshold;
                                                        let rangeMethod = 'percentis';

                                                        // Procurar meta ativa de reduce_quantity
                                                        const reduceQuantityGoal = goals
                                                            .filter(g => g.type === 'reduce_quantity' && !g.completed)
                                                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

                                                        if (reduceQuantityGoal && reduceQuantityGoal.target) {
                                                            // Usar meta como referência: 75% e 125% da meta
                                                            const target = parseFloat(reduceQuantityGoal.target);
                                                            lowThreshold = target * 0.75;
                                                            highThreshold = target * 1.25;
                                                            rangeMethod = 'meta';
                                                        } else {
                                                            // Usar percentis 33 e 66 dos dados
                                                            const sorted = [...dosages].sort((a, b) => a - b);
                                                            const p33 = sorted[Math.floor(sorted.length * 0.33)];
                                                            const p66 = sorted[Math.floor(sorted.length * 0.66)];
                                                            lowThreshold = p33;
                                                            highThreshold = p66;
                                                        }

                                                        const ranges = {
                                                            baixa: dosages.filter(d => d < lowThreshold).length,
                                                            media: dosages.filter(d => d >= lowThreshold && d < highThreshold).length,
                                                            alta: dosages.filter(d => d >= highThreshold).length
                                                        };

                                                        return (
                                                            <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                                                                <h3 className={'font-semibold mb-4 ' + ('text-white')}>{t('patterns.structural.dosageAnalysis')}</h3>

                                                                {/* Estatísticas Gerais */}
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 border-y border-gray-700 py-3 mb-4">
                                                                    <div className="px-2 py-1 text-center">
                                                                        <div className={`text-2xl font-bold font-mono-theme ${'text-white'}`}>{dailyDosageRecords.length}</div>
                                                                        <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.records')}</div>
                                                                    </div>
                                                                    <div className="px-2 py-1 text-center">
                                                                        <div className={`text-2xl font-bold font-mono-theme ${'text-white'}`}>{avgDosage.toFixed(1)}mg</div>
                                                                        <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.average')}</div>
                                                                    </div>
                                                                    <div className="px-2 py-1 text-center">
                                                                        <div className={`text-2xl font-bold font-mono-theme ${'text-white'}`}>{maxDosage}mg</div>
                                                                        <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.maximum')}</div>
                                                                    </div>
                                                                    <div className="px-2 py-1 text-center">
                                                                        <div className={`text-2xl font-bold font-mono-theme ${'text-white'}`}>{minDosage}mg</div>
                                                                        <div className={`text-xs ${'text-gray-300'}`}>{t('patterns.structural.minimum')}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Tendência */}
                                                                <div className="pb-3 mb-3 border-b border-gray-700">
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <div className={`text-sm font-medium mb-1 ${'text-gray-300'}`}>{t('patterns.structural.periodTrend')}</div>
                                                                            <div className={`${trendIcon ? 'text-2xl' : 'text-base'} font-bold ${trendColor}`}>
                                                                                {trendIcon} {trendText}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <p className={`text-xs mt-2 ${'text-gray-400'}`}>
                                                                        {t('patterns.structural.firstVsSecondHalf')}
                                                                    </p>
                                                                    <p className="text-[11px] mt-1 text-gray-500">{windowTestLine(halvesTest)}{mgTodayNote && ` ${mgTodayNote}`}</p>
                                                                </div>

                                                                {/* Distribuição */}
                                                                <div className="divide-y divide-gray-700">
                                                                    <div className={'text-sm font-medium mb-2 ' + 'text-gray-300'}>
                                                                        {t('patterns.doseDistribution')}
                                                                        {rangeMethod === 'meta' && (
                                                                            <span className={`text-xs ml-2 ${'text-gray-400'}`}>
                                                                                {t('patterns.structural.basedOnGoal', { mg: reduceQuantityGoal.target })}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {ranges.baixa > 0 && (
                                                                        <div className="py-3">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium ${'text-white'}`}>
                                                                                    {t('patterns.structural.dosageLow', { threshold: Math.round(lowThreshold) })}
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${'text-white'}`}>
                                                                                    {ranges.baixa} ({((ranges.baixa / dosages.length) * 100).toFixed(0)}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${'bg-gray-700'} rounded-full h-2 overflow-hidden`}>
                                                                                <div className="bg-gray-400 h-full transition-all duration-500" style={{width: ((ranges.baixa / dosages.length) * 100) + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {ranges.media > 0 && (
                                                                        <div className="py-3">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium ${'text-white'}`}>
                                                                                    {t('patterns.structural.dosageMed', { low: Math.round(lowThreshold), high: Math.round(highThreshold) })}
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${'text-white'}`}>
                                                                                    {ranges.media} ({((ranges.media / dosages.length) * 100).toFixed(0)}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${'bg-gray-700'} rounded-full h-2 overflow-hidden`}>
                                                                                <div className="bg-gray-400 h-full transition-all duration-500" style={{width: ((ranges.media / dosages.length) * 100) + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {ranges.alta > 0 && (
                                                                        <div className="py-3">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className={`text-sm font-medium ${'text-white'}`}>
                                                                                    {t('patterns.structural.dosageHigh', { threshold: Math.round(highThreshold) })}
                                                                                </div>
                                                                                <div className={`text-sm font-bold ${'text-white'}`}>
                                                                                    {ranges.alta} ({((ranges.alta / dosages.length) * 100).toFixed(0)}%)
                                                                                </div>
                                                                            </div>
                                                                            <div className={`${'bg-gray-700'} rounded-full h-2 overflow-hidden`}>
                                                                                <div className="bg-gray-400 h-full transition-all duration-500" style={{width: ((ranges.alta / dosages.length) * 100) + '%'}}></div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
    );
}
