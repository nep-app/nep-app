import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { getEmotionCategory, EMOTION_EN } from '../../constants/emotions';
import { safeToISODate } from '../../utils/helpers';
import { diffPermutation, MIN_PER_WINDOW, rangePermutation } from '../../utils/stats';
import { IntentionStats } from '../../components/IntentionStats';

// ===== "A APP TEM DE PODER DIZER NÃO SEI" (CLAUDE.md) =====
// Cada comparação deste separador (dias com X vs dias sem X, dias da semana)
// passa por um teste e tem um ramo onde recusa afirmar: poucos dias → diz
// quantos há e quantos são precisos; p ≥ 0,05 → "não se distingue do acaso".

const PERM_M = 2000; // baralhações (o mesmo m que o diffPermutation usa por omissão)
const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;

// Diferença entre o grupo com a média mais alta e o com a mais baixa (ex.: os
// dias da semana) + p por permutação: baralham-se as etiquetas dos grupos m
// vezes. Escolher "o maior e o menor" DEPOIS de ver os dados faz qualquer
// diferença parecer grande — por isso o acaso é medido com a MESMA escolha
// (máximo − mínimo) em cada baralhação. p = (b+1)/(m+1), nunca zero. Semente
// fixa: os mesmos registos dão sempre o mesmo p.
// TODO: mudar para utils/stats.js (está duplicada no AnalysesCoachTab.jsx).

// Ordem FIXA dos dias da semana (segunda → domingo). Nunca pela média: ordenar
// pelo "melhor" já é escolher a resposta antes de a testar.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const AnalysesEstadoTab = React.memo(function AnalysesEstadoTab({
    analysisConsumptions,
    analysisWellbeing,
    analysisCycles,
}) {
    const { t, i18n } = useTranslation();
    // TRIGGER_EN covers old-format emotions stored without emoji prefix
    const translateEmotion = (emotion) => i18n.language === 'en' ? (EMOTION_EN[emotion] || TRIGGER_EN[emotion] || emotion) : emotion;

    const TRIGGER_EN = {
        'Stress': 'Stress', 'Ansiedade': 'Anxiety', 'Solidão': 'Loneliness',
        'Festa': 'Party', 'Trabalho': 'Work', 'Família': 'Family',
        'Hábito': 'Habit', 'Tristeza': 'Sadness', 'Dependência': 'Dependency',
        'Tédio': 'Boredom', 'Cansaço': 'Fatigue', 'Dor física': 'Physical pain',
        'Insónia': 'Insomnia', 'Conflito': 'Conflict', 'Celebração': 'Celebration',
    };
    const translateTrigger = (trigger) => i18n.language === 'en' ? (TRIGGER_EN[trigger] || trigger) : trigger;

    // p como aparece no ecrã (3 casas). Com b = 0 diz-se "menos de 1 em m",
    // nunca zero. A decisão usa o MESMO número que se mostra.
    const pShown = (p) => Number(p.toFixed(3));
    const fmtP = (p, m = PERM_M) => {
        const b = Math.round(p * (m + 1)) - 1;
        return b <= 0
            ? t('estadoTab.pLessThan', { m, defaultValue: 'p: menos de 1 em {{m}}' })
            : t('estadoTab.pValue', { p: pShown(p).toLocaleString(i18n.language), defaultValue: 'p = {{p}}' });
    };
    const verdict = (p, m = PERM_M) => pShown(p) < 0.05
        ? t('estadoTab.notChance', { p: fmtP(p, m), defaultValue: 'dificilmente é só acaso ({{p}})' })
        : t('estadoTab.chance', { p: fmtP(p, m), defaultValue: 'não se distingue do acaso ({{p}})' });
    const fmt1 = (v) => v.toFixed(1);

    // Duas listas de valores por DIA (com X / sem X) → uma linha de texto.
    // Com menos de MIN_PER_WINDOW dias de um dos lados não há número nenhum:
    // diz quantos há e quantos são precisos.
    const twoGroupLine = (withArr, withoutArr, key, fallback, fewWhat) => {
        if (withArr.length === 0 && withoutArr.length === 0) return null;
        if (withArr.length < MIN_PER_WINDOW || withoutArr.length < MIN_PER_WINDOW) {
            return (
                <p className="text-xs text-gray-500">
                    {t('estadoTab.fewDays', { what: fewWhat, nA: withArr.length, nB: withoutArr.length, min: MIN_PER_WINDOW, defaultValue: '{{what}}: poucos dias para comparar ({{nA}} com e {{nB}} sem; são precisos {{min}} de cada lado).' })}
                </p>
            );
        }
        const r = diffPermutation(withoutArr, withArr);
        return (
            <p className="text-xs text-gray-300">
                {t(key, { a: fmt1(mean(withArr)), nA: withArr.length, b: fmt1(mean(withoutArr)), nB: withoutArr.length, verdict: verdict(r.p), defaultValue: fallback })}
            </p>
        );
    };

    // "Dias com esta etiqueta vs dias sem ela" (emoções, gatilhos) no número de
    // consumos do dia. Uma linha por etiqueta, por ordem de FREQUÊNCIA (quantos
    // dias tem), nunca pela diferença. Cada uma com o seu teste; etiquetas sem
    // dias suficientes de um dos lados não mostram número (contam-se à parte).
    const compareByLabel = (records) => {
        const base = new Set();
        const byLabel = new Map();
        records.forEach(({ day, labels }) => {
            base.add(day);
            labels.forEach(l => {
                if (!byLabel.has(l)) byLabel.set(l, new Set());
                byLabel.get(l).add(day);
            });
        });
        const dayCons = (d) => consCountByDate[d] || 0;
        const rows = [];
        let few = 0;
        [...byLabel.entries()]
            .sort((a, b) => b[1].size - a[1].size || String(a[0]).localeCompare(String(b[0])))
            .forEach(([label, days]) => {
                const withV = [...days].map(dayCons);
                const withoutV = [...base].filter(d => !days.has(d)).map(dayCons);
                if (withV.length < MIN_PER_WINDOW || withoutV.length < MIN_PER_WINDOW) { few++; return; }
                const r = diffPermutation(withoutV, withV);
                rows.push({ label, nWith: withV.length, nWithout: withoutV.length, avgWith: mean(withV), avgWithout: mean(withoutV), p: r.p });
            });
        return { rows, few, nDays: base.size };
    };

    // ⚡ Contagem de consumos por dia, calculada UMA vez. Antes, cada cartão
    // (emoções/gatilhos vs consumo) fazia um .filter em toda a lista de consumos
    // por cada registo — O(n²) a cada render. Agora é uma consulta direta O(1).
    const consCountByDate = useMemo(() => {
        const m = {};
        for (const c of analysisConsumptions) {
            if (c && c.date != null) m[c.date] = (m[c.date] || 0) + 1;
        }
        return m;
    }, [analysisConsumptions]);

    // Emoções / gatilhos vs consumos do dia — com teste, por ordem de frequência.
    const emotionCompare = useMemo(() => compareByLabel(
        analysisWellbeing
            .filter(w => w.emotions && w.emotions.length > 0)
            .map(w => ({ day: w.date || safeToISODate(w.timestamp), labels: w.emotions }))
            .filter(r => r.day)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [analysisWellbeing, consCountByDate]);
    const triggerCompare = useMemo(() => compareByLabel(
        analysisCycles
            .filter(c => c.triggers && c.triggers.length > 0)
            .map(c => ({ day: c.date || safeToISODate(c.timestamp), labels: c.triggers }))
            .filter(r => r.day)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [analysisCycles, consCountByDate]);

    // Lista "dias com X vs sem X". Sem nenhuma etiqueta com dias suficientes,
    // diz o que falta em vez de ficar calada.
    const renderCompare = (res, translateLabel) => {
        if (res.rows.length === 0) {
            return (
                <div className="text-center py-4 text-sm text-gray-400">
                    {t('estadoTab.compareNone', { min: MIN_PER_WINDOW, n: res.nDays, defaultValue: 'Ainda não dá para comparar: cada uma precisa de pelo menos {{min}} dias com ela e {{min}} sem ela (há {{n}} dias com registo).' })}
                </div>
            );
        }
        return (
            <div>
                <p className="text-xs text-gray-400 mb-2">
                    {t('estadoTab.compareIntro', { defaultValue: 'Consumos por dia, em média, nos dias em que registaste cada uma e nos outros dias com registo.' })}
                </p>
                <div className="divide-y divide-gray-700">
                    {res.rows.map(r => (
                        <div key={r.label} className="py-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm text-white">{translateLabel(r.label)}</span>
                                <span className="text-xs text-gray-400">
                                    {t('estadoTab.withLabel', 'com')} <span className="font-mono-theme text-white">{fmt1(r.avgWith)}</span>
                                    {' · '}{t('estadoTab.withoutLabel', 'sem')} <span className="font-mono-theme">{fmt1(r.avgWithout)}</span>
                                </span>
                            </div>
                            <div className="text-xs text-gray-400">
                                {t('estadoTab.compareRow', { nA: r.nWith, nB: r.nWithout, verdict: verdict(r.p), defaultValue: '{{nA}} dias com, {{nB}} sem — a diferença {{verdict}}.' })}
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    {res.rows.length >= 2 && t('estadoTab.compareMultiple', { k: res.rows.length, defaultValue: 'São {{k}} comparações ao mesmo tempo: é normal uma ou outra parecer diferente só por acaso.' })}
                    {res.few > 0 && <> {t('estadoTab.compareFew', { n: res.few, min: MIN_PER_WINDOW, defaultValue: 'Mais {{n}} com poucos dias para comparar (são precisos {{min}} dias com e {{min}} sem).' })}</>}
                </p>
            </div>
        );
    };

    const emotionStats = useMemo(() => {
        const allEmotions = analysisWellbeing.flatMap(w => w.emotions || []);

        if (allEmotions.length === 0) return null;

        // Categorizar emoções
        const positiveEmotions = allEmotions.filter(e => getEmotionCategory(e) === 'positive');
        const negativeEmotions = allEmotions.filter(e => getEmotionCategory(e) === 'negative');
        const neutralEmotions = allEmotions.filter(e => getEmotionCategory(e) === 'neutral');

        const totalCategorized = positiveEmotions.length + negativeEmotions.length;
        const positivePercent = totalCategorized > 0 ? (positiveEmotions.length / totalCategorized) * 100 : 0;
        const negativePercent = totalCategorized > 0 ? (negativeEmotions.length / totalCategorized) * 100 : 0;

        // Top emoções
        const emotionFreq = {};
        allEmotions.forEach(e => { emotionFreq[e] = (emotionFreq[e] || 0) + 1; });
        const topEmotions = Object.entries(emotionFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([emotion, count]) => ({
                emotion,
                count,
                percent: (count / allEmotions.length) * 100,
                category: getEmotionCategory(emotion)
            }));

        // Emoções por dia da semana
        const emotionsByWeekday = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        analysisWellbeing.forEach(w => {
            if (w.emotions && w.emotions.length > 0) {
                const date = w.timestamp ? new Date(w.timestamp) : null;
                if (date) {
                    const day = date.getDay();
                    w.emotions.forEach(e => emotionsByWeekday[day].push(e));
                }
            }
        });

        const weekdayStats = Object.entries(emotionsByWeekday).map(([day, emotions]) => {
            const pos = emotions.filter(e => getEmotionCategory(e) === 'positive').length;
            const neg = emotions.filter(e => getEmotionCategory(e) === 'negative').length;
            const total = pos + neg;
            return {
                day: parseInt(day),
                total: emotions.length,
                positivePercent: total > 0 ? (pos / total) * 100 : 0
            };
        }).filter(s => s.total > 0);

        // ⚠️ "MELHOR DIA / MAIS DESAFIANTE" ERA DITO SEMPRE, mesmo com um
        // registo por dia da semana. Agora testa-se: cada emoção positiva conta
        // 1 e cada negativa 0 (a média de um dia é a mesma % das barras); só
        // entram os dias da semana com MIN_PER_WINDOW registos de bem-estar ou
        // mais; e a distância entre o dia mais alto e o mais baixo é comparada
        // com a que o acaso dá baralhando os dias da semana. (Aproximado:
        // emoções do mesmo registo parecem-se entre si — é um sinal, não prova.)
        const logsByWeekday = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        const nLogsByWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        analysisWellbeing.forEach(w => {
            if (!w.emotions || w.emotions.length === 0 || !w.timestamp) return;
            const day = new Date(w.timestamp).getDay();
            let any = false;
            w.emotions.forEach(e => {
                const c = getEmotionCategory(e);
                if (c === 'positive') { logsByWeekday[day].push(1); any = true; }
                else if (c === 'negative') { logsByWeekday[day].push(0); any = true; }
            });
            if (any) nLogsByWeekday[day]++;
        });
        const testedDays = WEEK_ORDER.filter(d => nLogsByWeekday[d] >= MIN_PER_WINDOW);
        let weekdayTest = null;
        if (testedDays.length >= 2) {
            const r = rangePermutation(testedDays.map(d => logsByWeekday[d]));
            const means = testedDays.map(d => ({ day: d, mean: mean(logsByWeekday[d]), n: nLogsByWeekday[d] }));
            const hi = means.reduce((a, b) => (b.mean > a.mean ? b : a));
            const lo = means.reduce((a, b) => (b.mean < a.mean ? b : a));
            weekdayTest = { ...r, hi, lo, k: testedDays.length };
        }

        return {
            allEmotions,
            positiveEmotions,
            negativeEmotions,
            neutralEmotions,
            totalCategorized,
            positivePercent,
            negativePercent,
            topEmotions,
            weekdayStats,
            weekdayTest,
            testedDaysCount: testedDays.length,
        };
    }, [analysisWellbeing, analysisConsumptions, i18n.language]);

    const triggerStats = useMemo(() => {
        const allTriggers = analysisCycles.flatMap(c => c.triggers || []);

        if (allTriggers.length === 0) return null;

        // Frequência de gatilhos
        const triggerFreq = {};
        allTriggers.forEach(t => { triggerFreq[t] = (triggerFreq[t] || 0) + 1; });
        const topTriggers = Object.entries(triggerFreq)
            .sort((a, b) => b[1] - a[1])
            .map(([trigger, count]) => ({
                trigger,
                count,
                percent: (count / allTriggers.length) * 100
            }));

        // Gatilhos por dia da semana
        const triggersByWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        analysisCycles.forEach(c => {
            if (c.triggers && c.triggers.length > 0) {
                const date = c.timestamp ? new Date(c.timestamp) : null;
                if (date) {
                    const day = date.getDay();
                    triggersByWeekday[day] += c.triggers.length;
                }
            }
        });

        const mostTriggersDay = Object.entries(triggersByWeekday)
            .reduce((max, [day, count]) => count > max.count ? { day: parseInt(day), count } : max, { day: 0, count: 0 });

        // Ciclos com gatilhos vs sem gatilhos
        const cyclesWithTriggers = analysisCycles.filter(c => c.triggers && c.triggers.length > 0).length;
        const cyclesWithoutTriggers = analysisCycles.length - cyclesWithTriggers;

        return {
            allTriggers,
            topTriggers,
            triggersByWeekday,
            mostTriggersDay,
            cyclesWithTriggers,
            cyclesWithoutTriggers,
        };
    }, [analysisCycles, i18n.language]);

    const exerciseStats = useMemo(() => {
        const exerciseLogs = analysisWellbeing.filter(w => w.exerciseType || (w.exerciseDuration > 0) || w.exercise);
        const totalLogged = analysisWellbeing.length;
        const daysWithExercise = new Set(exerciseLogs.map(w => w.date || safeToISODate(w.timestamp))).size;
        const totalDays = new Set(analysisWellbeing.map(w => w.date || safeToISODate(w.timestamp))).size;
        const exercisePercent = totalDays > 0 ? (daysWithExercise / totalDays) * 100 : 0;

        const durationsWithData = exerciseLogs.filter(w => w.exerciseDuration > 0);
        const avgDuration = durationsWithData.length > 0
            ? durationsWithData.reduce((s, w) => s + w.exerciseDuration, 0) / durationsWithData.length
            : null;

        const typeFreq = {};
        exerciseLogs.forEach(w => {
            const raw = w.exerciseType || (w.exercise ? w.exercise.trim() : null) || 'outros';
            const t = raw.trim().toLowerCase();
            if (t) typeFreq[t] = (typeFreq[t] || 0) + 1;
        });
        const topTypes = Object.entries(typeFreq).sort((a, b) => b[1] - a[1]).slice(0, 6);

        const exerciseDateSet = new Set(exerciseLogs.map(w => w.date || safeToISODate(w.timestamp)));
        const consWithExercise = [];
        const consWithoutExercise = [];
        const moodWithExercise = [];
        const moodWithoutExercise = [];
        const energyWithExercise = [];
        const energyWithoutExercise = [];

        const allLoggedDates = new Set(analysisWellbeing.map(w => w.date || safeToISODate(w.timestamp)));
        const consByDate = {};
        analysisConsumptions.forEach(c => {
            const d = c.date || safeToISODate(c.timestamp);
            if (d) consByDate[d] = (consByDate[d] || 0) + 1;
        });
        const moodByDate = {};
        const energyByDate = {};
        analysisWellbeing.forEach(w => {
            const d = w.date || safeToISODate(w.timestamp);
            if (!d) return;
            if (w.mood) { moodByDate[d] = moodByDate[d] || []; moodByDate[d].push(parseInt(w.mood)); }
            if (w.energy) { energyByDate[d] = energyByDate[d] || []; energyByDate[d].push(parseInt(w.energy)); }
        });

        allLoggedDates.forEach(date => {
            const cons = consByDate[date] || 0;
            const hasEx = exerciseDateSet.has(date);
            if (hasEx) consWithExercise.push(cons);
            else consWithoutExercise.push(cons);

            const moods = moodByDate[date];
            if (moods && moods.length > 0) {
                const avgVal = moods.reduce((s, v) => s + v, 0) / moods.length;
                if (hasEx) moodWithExercise.push(avgVal);
                else moodWithoutExercise.push(avgVal);
            }
            const energies = energyByDate[date];
            if (energies && energies.length > 0) {
                const avgVal = energies.reduce((s, v) => s + v, 0) / energies.length;
                if (hasEx) energyWithExercise.push(avgVal);
                else energyWithoutExercise.push(avgVal);
            }
        });

        const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

        if (totalLogged === 0) return null;

        return {
            exerciseLogs,
            totalLogged,
            daysWithExercise,
            totalDays,
            exercisePercent,
            avgDuration,
            topTypes,
            consWithExercise,
            consWithoutExercise,
            moodWithExercise,
            moodWithoutExercise,
            energyWithExercise,
            energyWithoutExercise,
            avg,
        };
    }, [analysisWellbeing, analysisConsumptions]);

    const symptomStats = useMemo(() => {
        const allSymptoms = analysisWellbeing.flatMap(w => [
            ...(w.symptoms || []),
            ...(w.customSymptom ? [w.customSymptom] : [])
        ]).filter(s => s && s.trim()).map(s => s.trim().toLowerCase());

        if (allSymptoms.length === 0) return null;

        const symptomFreq = {};
        allSymptoms.forEach(s => { const k = s.trim().toLowerCase(); symptomFreq[k] = (symptomFreq[k] || 0) + 1; });
        const topSymptoms = Object.entries(symptomFreq).sort((a, b) => b[1] - a[1]).slice(0, 8);

        const symptomDates = {};
        analysisWellbeing.forEach(w => {
            const d = w.date || safeToISODate(w.timestamp);
            if (!d) return;
            const syms = [...(w.symptoms || []), ...(w.customSymptom ? [w.customSymptom] : [])].filter(s => s && s.trim()).map(s => s.trim().toLowerCase());
            syms.forEach(s => {
                if (!symptomDates[s]) symptomDates[s] = new Set();
                symptomDates[s].add(d);
            });
        });

        const daysWithAnySymptom = new Set(
            analysisWellbeing
                .filter(w => ((w.symptoms || []).length > 0) || w.customSymptom)
                .map(w => w.date || safeToISODate(w.timestamp))
        ).size;
        const totalDays = new Set(analysisWellbeing.map(w => w.date || safeToISODate(w.timestamp))).size;

        const consByDate = {};
        analysisConsumptions.forEach(c => {
            const d = c.date || safeToISODate(c.timestamp);
            if (d) consByDate[d] = (consByDate[d] || 0) + 1;
        });
        const moodByDate = {};
        analysisWellbeing.forEach(w => {
            const d = w.date || safeToISODate(w.timestamp);
            if (d && w.mood) { moodByDate[d] = moodByDate[d] || []; moodByDate[d].push(parseInt(w.mood)); }
        });
        const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

        const symptomDaySet = new Set(
            analysisWellbeing
                .filter(w => ((w.symptoms || []).length > 0) || w.customSymptom)
                .map(w => w.date || safeToISODate(w.timestamp))
        );
        const allDays = new Set(analysisWellbeing.map(w => w.date || safeToISODate(w.timestamp)));
        const consWithSymptom = [];
        const consWithoutSymptom = [];
        const moodWithSymptom = [];
        const moodWithoutSymptom = [];
        allDays.forEach(date => {
            const hasSym = symptomDaySet.has(date);
            const cons = consByDate[date] || 0;
            if (hasSym) consWithSymptom.push(cons);
            else consWithoutSymptom.push(cons);
            const moods = moodByDate[date];
            if (moods && moods.length > 0) {
                const m = avg(moods);
                if (hasSym) moodWithSymptom.push(m);
                else moodWithoutSymptom.push(m);
            }
        });

        return {
            allSymptoms,
            topSymptoms,
            symptomDates,
            daysWithAnySymptom,
            totalDays,
            consWithSymptom,
            consWithoutSymptom,
            moodWithSymptom,
            moodWithoutSymptom,
            avg,
        };
    }, [analysisWellbeing, analysisConsumptions]);

    const getWeekdayName = (dayIndex) =>
        new Date(2024, 0, 7 + dayIndex).toLocaleDateString(i18n.language, { weekday: 'long' });

    return (
        <>
            {!emotionStats ? (
                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-8 border text-center'}>
                    <div className="text-4xl mb-3">🌈</div>
                    <p className={'text-lg font-medium mb-2 ' + ('text-white')}>
                        {t('analyses.noEmotions')}
                    </p>
                    <p className={'text-sm ' + ('text-gray-400')}>
                        {t('analyses.noEmotionsDesc')}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Overview */}
                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                        <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                            {t('analyses.emotionalOverview')}
                        </h3>
                        {/* Números sem caixa, separados por linhas finas (como no Dashboard dos Padrões) */}
                        <div className="grid grid-cols-3 divide-x divide-gray-700 border-y border-gray-700 py-2 mb-4">
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">
                                    {t('analyses.positive')}
                                </div>
                                <div className="text-2xl font-bold font-mono-theme text-white">
                                    {emotionStats.positivePercent.toFixed(0)}%
                                </div>
                                <div className="text-xs mt-1 font-mono-theme text-gray-400">
                                    {emotionStats.positiveEmotions.length}
                                </div>
                            </div>
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">
                                    {t('analyses.negative')}
                                </div>
                                <div className="text-2xl font-bold font-mono-theme text-white">
                                    {emotionStats.negativePercent.toFixed(0)}%
                                </div>
                                <div className="text-xs mt-1 font-mono-theme text-gray-400">
                                    {emotionStats.negativeEmotions.length}
                                </div>
                            </div>
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">
                                    {t('analyses.totalLogged')}
                                </div>
                                <div className="text-2xl font-bold font-mono-theme text-white">
                                    {emotionStats.allEmotions.length}
                                </div>
                            </div>
                        </div>
                        <div className={'flex items-center h-4 rounded-full overflow-hidden ' + ('bg-gray-900')}>
                            <div
                                className="h-full transition-all duration-500"
                                style={{width: emotionStats.positivePercent + '%', background: '#7c3aed'}}
                            />
                            <div
                                className="h-full bg-gray-400 transition-all duration-500"
                                style={{width: emotionStats.negativePercent + '%'}}
                            />
                        </div>
                    </div>

                    {/* Top Emoções + Padrões por Dia (compacto) */}
                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                        <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                            {t('analyses.topEmotionsPatterns')}
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Top 10 Emoções */}
                            <div>
                                <div className={'text-sm font-semibold mb-3 ' + ('text-gray-400')}>{t('analyses.topEmotions')}</div>
                                <div className="divide-y divide-gray-700">
                                    {emotionStats.topEmotions.slice(0, 10).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className={'text-xs font-bold font-mono-theme w-5 text-center ' + ('text-gray-500')}>#{idx + 1}</span>
                                                <span className={'text-sm truncate ' + (
                                                    item.category === 'positive' ? ('text-green-400') :
                                                    item.category === 'negative' ? ('text-gray-300') :
                                                    ('text-gray-400')
                                                )}>{translateEmotion(item.emotion)}</span>
                                            </div>
                                            <span className={'text-xs font-mono-theme ' + ('text-gray-400')}>
                                                {item.count}× ({item.percent.toFixed(0)}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Padrões por Dia da Semana */}
                            {emotionStats.weekdayStats.length > 0 && (
                                <div>
                                    <div className={'text-sm font-semibold mb-3 ' + ('text-gray-400')}>{t('analyses.byWeekday')}</div>
                                    <div className="divide-y divide-gray-700">
                                        {/* Ordem fixa (segunda → domingo), nunca pela percentagem */}
                                        {[...emotionStats.weekdayStats]
                                            .sort((a, b) => WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day))
                                            .map((stat) => (
                                            <div key={stat.day} className="flex items-center justify-between py-2">
                                                <span className={'text-sm w-16 ' + ('text-white')}>{getWeekdayName(stat.day)}</span>
                                                <div className="flex-1 mx-2">
                                                    <div className={'h-1.5 rounded-full overflow-hidden ' + ('bg-gray-900')}>
                                                        {/* Uma só cor de dados: a largura já mostra a proporção, a cor não julga */}
                                                        <div
                                                            className="h-full transition-all duration-500"
                                                            style={{width: stat.positivePercent + '%', background: '#7c3aed'}}
                                                        />
                                                    </div>
                                                </div>
                                                <span className={'text-xs w-12 text-right font-mono-theme ' + ('text-white')}>
                                                    {stat.positivePercent.toFixed(0)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {emotionStats.weekdayStats.length >= 2 && (
                                        <div className="border-t border-gray-700 pt-3 mt-1">
                                            <p className={'text-xs ' + ('text-gray-400')}>
                                                {emotionStats.weekdayTest
                                                    ? t('estadoTab.weekdayRange', {
                                                        best: getWeekdayName(emotionStats.weekdayTest.hi.day),
                                                        bestPct: (emotionStats.weekdayTest.hi.mean * 100).toFixed(0),
                                                        worst: getWeekdayName(emotionStats.weekdayTest.lo.day),
                                                        worstPct: (emotionStats.weekdayTest.lo.mean * 100).toFixed(0),
                                                        k: emotionStats.weekdayTest.k,
                                                        verdict: verdict(emotionStats.weekdayTest.p, emotionStats.weekdayTest.m),
                                                        defaultValue: 'Entre os {{k}} dias da semana com registos suficientes, as emoções positivas vão de {{bestPct}}% ({{best}}) a {{worstPct}}% ({{worst}}). Uma diferença destas entre dias da semana {{verdict}}.',
                                                    })
                                                    : t('estadoTab.weekdayFew', {
                                                        min: MIN_PER_WINDOW,
                                                        k: emotionStats.testedDaysCount,
                                                        defaultValue: 'Para comparar dias da semana são precisos pelo menos {{min}} registos com emoções em cada dia (por agora só {{k}} dias da semana chegam lá).',
                                                    })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Correlação Emoções vs Consumo */}
                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                        <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                            {t('analyses.emotionsVsConsumption')}
                        </h3>
                        {/* ⚠️ ANTES: "média mais alta / mais baixa" — as 3 emoções com mais
                            consumo e as 2 com menos, escolhidas pela diferença, com
                            só 2 registos cada e sem teste. Ordenar pela força é
                            escolher a resposta antes de a testar (CLAUDE.md). */}
                        {renderCompare(emotionCompare, translateEmotion)}
                    </div>
                </div>
            )}
            {!triggerStats ? (
                <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-8 border text-center'}>
                    <div className="text-4xl mb-3">⚡</div>
                    <p className={'text-lg font-medium mb-2 ' + ('text-white')}>
                        {t('analyses.noTriggers')}
                    </p>
                    <p className={'text-sm ' + ('text-gray-400')}>
                        {t('analyses.noTriggersDesc')}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Overview */}
                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                        <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                            {t('analyses.triggerOverview')}
                        </h3>
                        {/* Números sem caixa nem cor de alarme (gatilhos não são "maus") */}
                        <div className="grid grid-cols-3 divide-x divide-gray-700 border-y border-gray-700 py-2">
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">
                                    {t('analyses.totalTriggers')}
                                </div>
                                <div className="text-2xl font-bold font-mono-theme text-white">
                                    {triggerStats.allTriggers.length}
                                </div>
                                <div className={'text-xs mt-1 ' + ('text-gray-500')}>
                                    {t('analyses.identified')}
                                </div>
                            </div>
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">
                                    {t('analyses.differentTypes')}
                                </div>
                                <div className="text-2xl font-bold font-mono-theme text-white">
                                    {triggerStats.topTriggers.length}
                                </div>
                                <div className={'text-xs mt-1 ' + ('text-gray-500')}>
                                    {t('analyses.ofTriggers')}
                                </div>
                            </div>
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">
                                    {t('analyses.avgPerCycle')}
                                </div>
                                <div className="text-2xl font-bold font-mono-theme text-white">
                                    {(triggerStats.allTriggers.length / analysisCycles.length).toFixed(1)}
                                </div>
                                <div className={'text-xs mt-1 ' + ('text-gray-500')}>
                                    {t('analyses.perCycle')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Gatilhos + Padrões por Dia (compacto) */}
                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                        <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                            {t('analyses.topTriggersPatterns')}
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Top 10 Gatilhos */}
                            <div>
                                <div className={'text-sm font-semibold mb-3 ' + ('text-gray-400')}>{t('analyses.topTriggers')}</div>
                                <div className="divide-y divide-gray-700">
                                    {triggerStats.topTriggers.slice(0, 10).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className={'text-xs font-bold font-mono-theme w-5 text-center ' + ('text-gray-500')}>#{idx + 1}</span>
                                                <span className={'text-sm truncate ' + ('text-white')}>{translateTrigger(item.trigger)}</span>
                                            </div>
                                            <span className={'text-xs font-mono-theme ' + ('text-gray-400')}>
                                                {item.count}× ({item.percent.toFixed(0)}%)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Padrões por Dia da Semana */}
                            {Object.values(triggerStats.triggersByWeekday).some(count => count > 0) && (
                                <div>
                                    <div className={'text-sm font-semibold mb-3 ' + ('text-gray-400')}>{t('analyses.byWeekday')}</div>
                                    <div className="divide-y divide-gray-700">
                                        {Object.entries(triggerStats.triggersByWeekday)
                                            .map(([day, count]) => ({
                                                day: parseInt(day),
                                                count,
                                                percent: triggerStats.allTriggers.length > 0 ? (count / triggerStats.allTriggers.length) * 100 : 0
                                            }))
                                            .filter(stat => stat.count > 0)
                                            .sort((a, b) => WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day))
                                            .map((stat) => (
                                            <div key={stat.day} className="flex items-center justify-between py-2">
                                                <span className={'text-sm w-16 ' + ('text-white')}>{getWeekdayName(stat.day)}</span>
                                                <div className="flex-1 mx-2">
                                                    <div className={'h-1.5 rounded-full overflow-hidden ' + ('bg-gray-900')}>
                                                        <div
                                                            className="h-full transition-all duration-500"
                                                            style={{width: stat.percent + '%', background: '#7c3aed'}}
                                                        />
                                                    </div>
                                                </div>
                                                <span className={'text-xs w-12 text-right font-mono-theme ' + ('text-white')}>
                                                    {stat.count}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {triggerStats.mostTriggersDay.count > 0 && (
                                        <div className="border-t border-gray-700 pt-3 mt-1">
                                            <p className={'text-xs ' + ('text-gray-400')}>
                                                {t('analyses.mostTriggersDay', {
                                                    day: getWeekdayName(triggerStats.mostTriggersDay.day),
                                                    count: triggerStats.mostTriggersDay.count,
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Correlação Gatilhos vs Consumo */}
                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                        <h3 className={'text-lg font-semibold mb-4 ' + ('text-white')}>
                            {t('analyses.triggersVsConsumption')}
                        </h3>
                        {renderCompare(triggerCompare, translateTrigger)}
                    </div>

                    {/* Consciencialização */}
                    <div className={'bg-gray-800 border-gray-700' + ' rounded-xl p-6 border'}>
                        <h3 className={'text-lg font-semibold mb-3 ' + ('text-white')}>
                            {t('analyses.awarenessSection')}
                        </h3>
                        <p className={'text-sm mb-3 font-mono-theme ' + ('text-white')}>
                            <strong>{triggerStats.cyclesWithTriggers}</strong> / {analysisCycles.length} ({((triggerStats.cyclesWithTriggers / analysisCycles.length) * 100).toFixed(0)}%)
                        </p>
                        <p className={'text-sm ' + ('text-gray-400')}>
                            {t('analyses.awarenessText')}
                        </p>
                    </div>
                </div>
            )}
            {!exerciseStats ? (
                <div className={'bg-gray-800 border-gray-700 rounded-xl p-8 border text-center'}>
                    <div className="text-4xl mb-3">🏃</div>
                    <p className={'text-lg font-medium mb-2 text-white'}>{t('analyses.noExerciseData')}</p>
                    <p className={'text-sm text-gray-400'}>{t('analyses.exerciseSection')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className={'bg-gray-800 border-gray-700 rounded-xl p-6 border'}>
                        <h3 className={'text-lg font-semibold mb-4 text-white'}>{t('analyses.exerciseSection')}</h3>
                        <div className="grid grid-cols-3 divide-x divide-gray-700 border-y border-gray-700 py-2 mb-4">
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">{t('analyses.exerciseDays')}</div>
                                <div className="text-2xl font-bold font-mono-theme text-white">{exerciseStats.daysWithExercise}</div>
                            </div>
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">{t('analyses.exerciseOfLoggedDays')}</div>
                                <div className="text-2xl font-bold font-mono-theme text-white">{exerciseStats.exercisePercent.toFixed(0)}%</div>
                            </div>
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">{t('analyses.avgDuration')}</div>
                                <div className="text-2xl font-bold font-mono-theme text-white">{exerciseStats.avgDuration != null ? `${Math.round(exerciseStats.avgDuration)}min` : '—'}</div>
                            </div>
                        </div>

                        {exerciseStats.topTypes.length > 0 && (
                            <div className="mb-4">
                                <p className={'text-sm font-medium text-gray-300 mb-2'}>{t('analyses.exerciseTypesLabel')}</p>
                                <div className="space-y-1">
                                    {exerciseStats.topTypes.map(([type, count]) => (
                                        <div key={type} className="flex items-center gap-2">
                                            <span className={'text-xs text-gray-300 w-24 truncate'}>{type}</span>
                                            <div className="flex-1 bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-gray-400 h-2 rounded-full"
                                                    style={{ width: `${(count / exerciseStats.topTypes[0][1]) * 100}%` }}
                                                />
                                            </div>
                                            <span className={'text-xs font-mono-theme text-gray-400 w-6 text-right'}>{count}x</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ⚠️ ANTES: "Impacto do exercício" (linguagem de causa), com 3 dias
                            de cada lado, sem teste, e escondido quando a diferença era
                            pequena — só aparecia o que parecia efeito. Agora: dias com e
                            sem exercício, cada comparação com o seu teste. */}
                        {(exerciseStats.consWithExercise.length + exerciseStats.consWithoutExercise.length) > 0 && (
                            <div className="border-t border-gray-700 pt-4">
                                <p className={'text-sm font-medium text-gray-300 mb-3'}>{t('analyses.exerciseImpact')}</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {twoGroupLine(exerciseStats.consWithExercise, exerciseStats.consWithoutExercise, 'estadoTab.exCons',
                                        '🔢 Consumos: {{a}} por dia nos dias com exercício ({{nA}} dias) e {{b}} nos outros ({{nB}} dias) — {{verdict}}.',
                                        t('estadoTab.whatCons', 'Consumos'))}
                                    {twoGroupLine(exerciseStats.moodWithExercise, exerciseStats.moodWithoutExercise, 'estadoTab.exMood',
                                        '😊 Humor: {{a}}/10 nos dias com exercício ({{nA}} dias) e {{b}}/10 nos outros ({{nB}} dias) — {{verdict}}.',
                                        t('estadoTab.whatMood', 'Humor'))}
                                    {twoGroupLine(exerciseStats.energyWithExercise, exerciseStats.energyWithoutExercise, 'estadoTab.exEnergy',
                                        '⚡ Energia: {{a}}/10 nos dias com exercício ({{nA}} dias) e {{b}}/10 nos outros ({{nB}} dias) — {{verdict}}.',
                                        t('estadoTab.whatEnergy', 'Energia'))}
                                    {[['consWithExercise', 'consWithoutExercise'], ['moodWithExercise', 'moodWithoutExercise'], ['energyWithExercise', 'energyWithoutExercise']]
                                        .some(([a, b]) => exerciseStats[a].length >= MIN_PER_WINDOW && exerciseStats[b].length >= MIN_PER_WINDOW) && (
                                        <p className="text-xs text-gray-500">{t('estadoTab.togetherNote', 'Andarem juntos não quer dizer que um cause o outro.')}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {!symptomStats ? (
                <div className={'bg-gray-800 border-gray-700 rounded-xl p-8 border text-center'}>
                    <div className="text-4xl mb-3">🤒</div>
                    <p className={'text-lg font-medium mb-2 text-white'}>{t('analyses.noSymptomData')}</p>
                    <p className={'text-sm text-gray-400'}>{t('analyses.symptomsSection')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className={'bg-gray-800 border-gray-700 rounded-xl p-6 border'}>
                        <h3 className={'text-lg font-semibold mb-4 text-white'}>{t('analyses.symptomsSection')}</h3>
                        <div className="grid grid-cols-2 divide-x divide-gray-700 border-y border-gray-700 py-2 mb-4">
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">{t('analyses.symptomRecords')}</div>
                                <div className="text-2xl font-bold font-mono-theme text-white">{symptomStats.allSymptoms.length}</div>
                            </div>
                            <div className="px-2 py-1 text-center">
                                <div className="text-xs mb-1 text-gray-400 leading-tight min-h-[2rem] flex items-center justify-center">{t('analyses.symptomDaysLabel')}</div>
                                <div className="text-2xl font-bold font-mono-theme text-white">{symptomStats.totalDays > 0 ? ((symptomStats.daysWithAnySymptom / symptomStats.totalDays) * 100).toFixed(0) : 0}%</div>
                            </div>
                        </div>

                        <p className={'text-sm font-medium text-gray-300 mb-2'}>{t('analyses.mostFrequentSymptoms')}</p>
                        <div className="space-y-1 mb-4">
                            {symptomStats.topSymptoms.map(([symptom, count]) => (
                                <div key={symptom} className="flex items-center gap-2">
                                    <span className={'text-xs text-gray-300 w-32 truncate'}>{symptom}</span>
                                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-gray-400 h-2 rounded-full"
                                            style={{ width: `${(count / symptomStats.topSymptoms[0][1]) * 100}%` }}
                                        />
                                    </div>
                                    <span className={'text-xs font-mono-theme text-gray-400 w-6 text-right'}>{count}x</span>
                                </div>
                            ))}
                        </div>

                        {(symptomStats.consWithSymptom.length + symptomStats.consWithoutSymptom.length) > 0 && (
                            <div className="border-t border-gray-700 pt-4">
                                <p className={'text-sm font-medium text-gray-300 mb-2'}>{t('analyses.symptomsVsPattern')}</p>
                                <div className="space-y-2">
                                    {twoGroupLine(symptomStats.consWithSymptom, symptomStats.consWithoutSymptom, 'estadoTab.symCons',
                                        '🔢 Consumos: {{a}} por dia nos dias com sintomas ({{nA}} dias) e {{b}} nos outros ({{nB}} dias) — {{verdict}}.',
                                        t('estadoTab.whatCons', 'Consumos'))}
                                    {twoGroupLine(symptomStats.moodWithSymptom, symptomStats.moodWithoutSymptom, 'estadoTab.symMood',
                                        '😊 Humor: {{a}}/10 nos dias com sintomas ({{nA}} dias) e {{b}}/10 nos outros ({{nB}} dias) — {{verdict}}.',
                                        t('estadoTab.whatMood', 'Humor'))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Intenção e "correu como querias?" — só aparece se houver dados. */}
            <div className="mt-4 empty:hidden"><IntentionStats consumptions={analysisConsumptions} /></div>
        </>
    );
});
