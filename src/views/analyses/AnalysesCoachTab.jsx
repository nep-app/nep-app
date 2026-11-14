import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as analyticsService from '../../services/analyticsService';
import { analyzeMultipleNotes, analyzeNote, identifyThemes } from '../../utils/sentimentAnalysis';
import { getEmotionCategory, EMOTION_EN } from '../../constants/emotions';
import { safeToISODate, getTodayKey, gapCrossesDays, datesInRange, keepGoalZone, readTolerance } from '../../utils/helpers';
import { useCrossMountMemo } from '../../hooks/useCrossMountMemo';
import { diffPermutation, spearmanPermutation, MIN_PER_WINDOW, MIN_SHIFT, rangePermutation } from '../../utils/stats';

const { getDateRangeForPeriod, filterByDateRange } = analyticsService;

// O dia de calendário N dias depois (ou antes, com N negativo) de 'YYYY-MM-DD',
// em hora local. Ao meio-dia para a mudança de hora (verão/inverno) não
// empurrar o resultado para outro dia. "Ontem" e "amanhã" são SEMPRE estes —
// nunca "o registo anterior/seguinte", que pode estar a uma semana de distância.
const somaDias = (key, n) => {
    const d = new Date(`${key}T12:00:00`);
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + n);
    return safeToISODate(d);
};
const diaSeguinte = (key) => somaDias(key, 1);
const diaAnterior = (key) => somaDias(key, -1);

// Este registo tem horas de sono? ⚠️ ZERO NÃO É VAZIO: `sleep: 0` é "Não
// dormi", uma noite real de 0 h. Só falta o valor quando o campo não existe
// (ou vem vazio). Com `c.sleep &&` as noites sem dormir desapareciam das
// contas — e eram justamente as que mais pesam.
const temSono = (x) => !!x && x.sleep != null && x.sleep !== '' && !isNaN(parseFloat(x.sleep));

// ===== "A APP TEM DE PODER DIZER NÃO SEI" (CLAUDE.md) =====
// Toda a frase deste separador que diz que duas coisas andam juntas ou que dois
// grupos de dias são diferentes passa por um teste e tem um ramo onde recusa:
//   - dois grupos de dias/registos → diffPermutation (stats.js);
//   - duas séries diárias (ex.: sono e humor) → spearmanPermutation (stats.js),
//     com pelo menos MIN_SPEARMAN dias;
//   - "o dia da semana com mais vs o com menos" → rangePermutation (em utils/stats.js).
// Poucos dados → diz quantos há e quantos faltam. p ≥ 0,05 → "não se distingue
// do acaso". E nada de linguagem de causa ("afeta", "provoca"): "anda junto".
const PERM_M = 2000; // baralhações do diffPermutation (o valor por omissão)
const MIN_SPEARMAN = 2 * MIN_SHIFT + 1; // o mínimo que o spearmanPermutation aceita
const media = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;

// Diferença entre o grupo com a média mais alta e o com a mais baixa + p por
// permutação (baralham-se as etiquetas dos grupos). Escolher "o maior e o
// menor" depois de ver os dados faz qualquer diferença parecer grande, por isso
// o acaso é medido com a MESMA escolha em cada baralhação. p = (b+1)/(m+1).
// TODO: mudar para utils/stats.js (está duplicada no AnalysesEstadoTab.jsx).

export const AnalysesCoachTab = React.memo(function AnalysesCoachTab({
    analysisConsumptions,
    analysisWellbeing,
    analysisCycles,
    analysisDailyLogs,
    analysisReflections,
    analysisThoughts,
    goals,
    consumptions,
    mgByDate,
    unloggedDates,
    excludedDays,
    patternsPeriod,
    patternsPeriodOffset,
}) {
    const _sigCoach = `${analysisConsumptions.length}|${analysisWellbeing.length}|${analysisCycles.length}|${analysisDailyLogs.length}|${analysisReflections.length}|${analysisThoughts.length}|${(goals || []).length}|${patternsPeriod}|${patternsPeriodOffset}|${(unloggedDates && unloggedDates.size) || 0}|${(excludedDays && excludedDays.size) || 0}`;
    const coachData = useCrossMountMemo('analises-coach', _sigCoach, () => {
        if (analysisConsumptions.length === 0 && analysisWellbeing.length === 0) {
            return null;
        }

        // ===== DYNAMIC THRESHOLDS BASED ON USER GOALS =====
        // Buscar meta de redução de frequência para thresholds personalizados
        const frequencyGoal = goals.find(g => g.type === 'reduce_frequency');
        // ⚠️ SEM META, NÃO HÁ LIMIAR. Isto era `: 10` — um número inventado pela
        // app que definia o que conta como "dia difícil" para quem nunca pediu
        // meta nenhuma, e sobre o qual se construíam correlações inteiras.
        // A null obriga cada secção a não se mostrar em vez de assumir um alvo.
        const difficultThreshold = frequencyGoal ? frequencyGoal.target + 2 : null;

        // Calculate all metrics for narrative
        const totalConsumptions = analysisConsumptions.length;
        const byDate = {};
        analysisConsumptions.forEach(c => { byDate[c.date] = (byDate[c.date] || 0) + 1; });
        const uniqueDays = Object.keys(byDate).length;
        // Média por dia SEM hoje: hoje ainda vai a meio e puxava a média para
        // baixo. (Dias com consumo: os dias a zero não entram — o texto diz
        // "dias com consumo".)
        const _hoje = getTodayKey();
        const _diasSemHoje = Object.keys(byDate).filter(d => d !== _hoje);
        const _totalSemHoje = _diasSemHoje.reduce((s, d) => s + byDate[d], 0);
        const avgPerDay = _diasSemHoje.length > 0 ? (_totalSemHoje / _diasSemHoje.length).toFixed(1) : 0;

        // Wellbeing averages
        const validSleep = analysisWellbeing.filter(w => w.sleep != null && !isNaN(parseFloat(w.sleep)));
        const avgSleep = validSleep.length > 0 ? (validSleep.reduce((sum, w) => sum + parseFloat(w.sleep), 0) / validSleep.length).toFixed(1) : null;

        const validMood = analysisWellbeing.filter(w => w.mood && !isNaN(parseInt(w.mood)));
        const avgMood = validMood.length > 0 ? (validMood.reduce((sum, w) => sum + parseInt(w.mood), 0) / validMood.length).toFixed(1) : null;

        const validEnergy = analysisWellbeing.filter(w => w.energy && !isNaN(parseInt(w.energy)));
        const avgEnergy = validEnergy.length > 0 ? (validEnergy.reduce((sum, w) => sum + parseInt(w.energy), 0) / validEnergy.length).toFixed(1) : null;

        // Trending
        const sorted = [...analysisConsumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
        const intervals = [];
        // Intervalos que passam por um dia "não registei os consumos" ou atípico
        // não se conhecem: ficam de fora.
        const skipDays = new Set([...(unloggedDates || []), ...(excludedDays || [])]);
        for (let i = 1; i < sorted.length; i++) {
            const t1 = new Date(sorted[i].timestamp).getTime(), t0 = new Date(sorted[i-1].timestamp).getTime();
            if (gapCrossesDays(t0, t1, skipDays)) continue;
            intervals.push((t1 - t0) / 3600000);
        }
        const avgInterval = intervals.length > 0 ? (intervals.reduce((sum, i) => sum + i, 0) / intervals.length).toFixed(1) : 0;
        const goodIntervals = intervals.filter(i => i >= 2).length;
        const goodPercent = intervals.length > 0 ? Math.round((goodIntervals / intervals.length) * 100) : 0;

        // Best/worst days (excluir o dia de hoje exceto quando filtrado por "dia")
        const dates = Object.keys(byDate).sort();
        // Data LOCAL (não UTC) para excluir corretamente o dia de hoje, ainda a meio.
        const today = getTodayKey();
        const completedDates = patternsPeriod === 'hoje' ? dates : dates.filter(d => d !== today);
        const sortedDates = completedDates.sort((a, b) => byDate[a] - byDate[b]);
        const bestDate = sortedDates.length > 0 ? sortedDates[0] : null;
        const worstDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
        const bestCount = bestDate ? byDate[bestDate] : 0;
        const worstCount = worstDate ? byDate[worstDate] : 0;

        // Time pattern
        const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
        analysisConsumptions.forEach(c => {
            const hour = new Date(c.timestamp).getHours();
            if (hour >= 6 && hour < 12) byPartOfDay.manha++;
            else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
            else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
            else byPartOfDay.madrugada++;
        });
        const maxPartOfDay = Object.entries(byPartOfDay).reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
        const partNames = { manha: 'manhã', tarde: 'tarde', noite: 'noite', madrugada: 'madrugada' };

        // Sentiment analysis AVANÇADO - INCLUIR TUDO do histórico do período
        const allNotes = [
            ...analysisConsumptions.map(c => c.notes || ''),
            ...analysisWellbeing.map(w => w.notes || ''),
            ...analysisCycles.map(c => c.notes || ''),
            ...analysisReflections.map(r => r.answer || ''),
            ...analysisDailyLogs.map(d => d.notes || ''),
            ...analysisThoughts.map(t => t.content || '')
        ].filter(n => n.length > 0);

        // Usar análise avançada com negações, intensificadores e contexto
        const sentimentAnalysis = analyzeMultipleNotes(allNotes);
        const sentimentThemes = identifyThemes(allNotes);
        const sentimentScore = sentimentAnalysis.score;

        return {
            frequencyGoal,
            difficultThreshold,
            totalConsumptions,
            byDate,
            uniqueDays,
            avgPerDay,
            avgSleep,
            avgMood,
            avgEnergy,
            sorted,
            intervals,
            avgInterval,
            goodIntervals,
            goodPercent,
            dates,
            completedDates,
            sortedDates,
            bestDate,
            worstDate,
            bestCount,
            worstCount,
            byPartOfDay,
            maxPartOfDay,
            partNames,
            allNotes,
            sentimentAnalysis,
            sentimentThemes,
            sentimentScore,
        };
    });

    const { t, i18n } = useTranslation();

    // ⚠️ TODOS OS HOOKS ANTES DO "return" ANTECIPADO. Este useState estava
    // depois do `if (!coachData) return` — ao passar de um período sem dados
    // para um com dados, o React via um hook a mais do que no render anterior
    // e a página rebentava ("Rendered more hooks than during the previous
    // render"). Os hooks têm de ser chamados sempre, pela mesma ordem.
    const [openSections, setOpenSections] = useState({
        resumo: true,
        dias: false,
        horarios: false,
        sono: false,
        emocoes: false,
        avancado: false,
        sintese: false,
    });

    if (!coachData) {
        return (<div className={('bg-gray-800 border-gray-700 text-gray-400') + ' rounded-xl p-6 border text-center'}>{t('coach.noData')}</div>);
    }

    const {
        frequencyGoal,
        difficultThreshold,
        totalConsumptions,
        byDate,
        uniqueDays,
        avgPerDay,
        avgSleep,
        avgMood,
        avgEnergy,
        sorted,
        intervals,
        avgInterval,
        goodIntervals,
        goodPercent,
        dates,
        completedDates,
        sortedDates,
        bestDate,
        worstDate,
        bestCount,
        worstCount,
        byPartOfDay,
        maxPartOfDay,
        partNames,
        allNotes,
        sentimentAnalysis,
        sentimentThemes,
        sentimentScore,
    } = coachData;

    // p como aparece no ecrã (3 casas); com b = 0 → "menos de 1 em m", nunca
    // zero. A decisão (< 0,05) usa o MESMO número que se mostra.
    const pShown = (p) => Number(p.toFixed(3));
    const fmtP = (p, m = PERM_M, b = null) => {
        const hits = b != null ? b : Math.round(p * (m + 1)) - 1;
        return hits <= 0
            ? t('coach.pLessThan', { m, defaultValue: 'p: menos de 1 em {{m}}' })
            : t('coach.pValue', { p: pShown(p).toLocaleString(i18n.language), defaultValue: 'p = {{p}}' });
    };
    const isChance = (p) => pShown(p) >= 0.05;
    // "A diferença …" + veredicto, para juntar a frases que já têm os números.
    const verdict = (p, m = PERM_M, b = null) => isChance(p)
        ? t('coach.verdictChance', { p: fmtP(p, m, b), defaultValue: 'não se distingue do acaso ({{p}})' })
        : t('coach.verdictNotChance', { p: fmtP(p, m, b), defaultValue: 'dificilmente é só acaso ({{p}})' });
    const rhoTxt = (r) => r.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Dias de calendário que a app CONHECE entre duas datas: a partir do
    // primeiro registo, sem "não registei os consumos" nem dias atípicos (os
    // consumos desses dias já vêm tirados — contá-los a zero seria inventar).
    const foraDias = new Set([...(unloggedDates || []), ...(excludedDays || [])]);
    const primeiroRegisto = (() => {
        const ds = [...(consumptions || []), ...analysisWellbeing, ...analysisCycles, ...analysisDailyLogs]
            .map(x => x.date || safeToISODate(x.timestamp)).filter(Boolean);
        return ds.length ? ds.reduce((a, b) => (b < a ? b : a)) : null;
    })();
    const diasConhecidos = (de, ate) => {
        if (!primeiroRegisto || !de || !ate) return [];
        return datesInRange(de < primeiroRegisto ? primeiroRegisto : de, ate).filter(d => !foraDias.has(d));
    };
    const consPorDia = {};
    analysisConsumptions.forEach(c => {
        const d = c.date || safeToISODate(c.timestamp);
        if (d) consPorDia[d] = (consPorDia[d] || 0) + 1;
    });
    // Meta de frequência (reduzir): a única coisa que deixa a app dizer que
    // uma direção "vai no sentido da meta" (regra do elogio).
    const metaFreqAlvo = frequencyGoal ? Number(frequencyGoal.target) : null;

    const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    const sectionBtn = (id, icon, title) => (
        <button
            onClick={() => toggleSection(id)}
            aria-expanded={!!openSections[id]}
            className={'w-full flex items-center justify-between px-4 py-3 font-semibold text-left transition-colors ' + (openSections[id] ? 'text-white' : 'text-gray-300 hover:text-white')}
        >
            <span className="flex items-center gap-2"><span>{icon}</span> {title}</span>
            <span className="text-xs" style={{ display: 'inline-block', transform: openSections[id] ? 'rotate(180deg)' : 'none' }}>▼</span>
        </button>
    );

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="px-1">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl">💬</span>
                    <h3 className={'text-xl font-bold text-white'}>{t('coach.title')}</h3>
                </div>
                <p className={'text-xs text-gray-400'}>{t('coach.subtitle')}</p>
            </div>

            {/* Todas as secções numa só caixa, separadas por linhas finas (antes
                cada título e cada conteúdo tinham a sua própria caixa). */}
            <div className="rounded-xl border border-gray-700 bg-gray-800 divide-y divide-gray-700">
            {/* ── SECÇÃO 1: RESUMO ── */}
            {sectionBtn('resumo', '📊', i18n.language === 'en' ? 'Overview' : 'Resumo')}
            {openSections.resumo && (
                <div className={'!border-t-0 px-4 pb-5 pt-1 space-y-4 leading-relaxed text-gray-200'}>
                    {/* Paragraph 1: Overview */}
                    <p>
                        {totalConsumptions > 0 ? (
                            <>📊 <strong className={('text-white')}>{t('coach.overviewLabel')}</strong>{' '}
                            {t('coach.overviewText', {
                                total: totalConsumptions,
                                uses: t(totalConsumptions === 1 ? 'coach.use_singular' : 'coach.use_plural'),
                                days: uniqueDays,
                                daysLabel: t(uniqueDays === 1 ? 'coach.day_singular' : 'coach.day_plural'),
                                avg: avgPerDay
                            })}</>
                        ) : (
                            <>{t('coach.noConsumptions')}</>
                        )}
                        {/* Meta de MANTER a frequência (X ± Y), se não houver a de reduzir:
                            só se diz onde fica a média; abaixo ou acima a cinzento, sem juízo. */}
                        {(() => {
                            if (frequencyGoal || totalConsumptions === 0) return null;
                            const keepFreq = goals.find(g => g.type === 'keep_frequency');
                            const zone = keepFreq && parseFloat(avgPerDay) > 0 ? keepGoalZone(parseFloat(avgPerDay), keepFreq.target, keepFreq.tolerance) : null;
                            if (!zone) return null;
                            const range = `${keepFreq.target} ± ${readTolerance(keepFreq.tolerance)}`;
                            return <> <span className={zone === 'in' ? 'text-emerald-400' : 'text-gray-300'}>{t(zone === 'in' ? 'coach.keepFreqIn' : zone === 'above' ? 'coach.keepFreqAbove' : 'coach.keepFreqBelow', { range })}</span></>;
                        })()}
                    </p>

                    {/* Micro-trend (📈 last 7 vs previous 21) */}
                    {(() => {
                        if (analysisConsumptions.length < 14) return null;

                        // ⚠️ MÉDIA POR DIA DE CALENDÁRIO, NÃO POR "DIA COM CONSUMO".
                        // Antes dividia-se pelos dias em que houve consumo: uma semana
                        // com 3 dias a zero dava a mesma média que uma semana sem
                        // pausas. E o dia de hoje (ainda a meio) entrava nos 7 dias,
                        // a puxar a média para baixo só por não ter acabado.
                        // Agora: as duas janelas são dias de calendário seguidos que
                        // acabam ONTEM (ou no fim do período escolhido, se já passou).
                        // Ficam de fora os dias que a app não conhece: antes do
                        // primeiro registo, fora do período, "não registei os
                        // consumos" e atípicos (os consumos desses dias já vêm
                        // tirados, por isso contá-los como dia a zero seria inventar).
                        const range = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
                        const ontem = somaDias(getTodayKey(), -1);
                        const fimPeriodo = range.end ? safeToISODate(range.end) : null;
                        const lastDay = fimPeriodo && fimPeriodo < ontem ? fimPeriodo : ontem;
                        const inicioPeriodo = range.start ? safeToISODate(range.start) : null;
                        const todasAsDatas = [
                            ...(consumptions || []), ...analysisWellbeing, ...analysisCycles, ...analysisDailyLogs,
                        ].map(x => x.date || safeToISODate(x.timestamp)).filter(Boolean);
                        if (todasAsDatas.length === 0) return null;
                        const primeiroRegisto = todasAsDatas.reduce((a, b) => (b < a ? b : a));
                        const desde = inicioPeriodo && inicioPeriodo > primeiroRegisto ? inicioPeriodo : primeiroRegisto;
                        const foraDias = new Set([...(unloggedDates || []), ...(excludedDays || [])]);
                        const diasValidos = (de, ate) => datesInRange(de < desde ? desde : de, ate).filter(d => !foraDias.has(d));

                        const last7Keys = diasValidos(somaDias(lastDay, -6), lastDay);
                        const prev21Keys = diasValidos(somaDias(lastDay, -27), somaDias(lastDay, -7));
                        // Poucos dias conhecidos numa das janelas → não se compara.
                        if (last7Keys.length < 5 || prev21Keys.length < 14) return null;

                        const valsLast7 = last7Keys.map(d => consPorDia[d] || 0);
                        const valsPrev21 = prev21Keys.map(d => consPorDia[d] || 0);
                        const somaLast7 = valsLast7.reduce((a, b) => a + b, 0);
                        const somaPrev21 = valsPrev21.reduce((a, b) => a + b, 0);

                        if (somaLast7 < 3 || somaPrev21 < 10) return null;

                        const avgLast7 = somaLast7 / last7Keys.length;
                        const avgPrev21 = somaPrev21 / prev21Keys.length;
                        if (!(avgPrev21 > 0)) return null;

                        const percentChange = ((avgLast7 - avgPrev21) / avgPrev21 * 100).toFixed(0);

                        if (Math.abs(percentChange) < 5) return null;

                        // ⚠️ ANTES: "Aumento significativo. Vale a pena perceber a causa"
                        // / "Redução clara. O que mudou? … repara no que ajudou" — a
                        // app decidia que descer é bom e chamava "significativo" a
                        // uma diferença que nunca foi testada. Agora: os números, o
                        // teste (dias de uma janela vs dias da outra) e, só com meta
                        // de reduzir, se a diferença vai no sentido dela.
                        const test = diffPermutation(valsPrev21, valsLast7);
                        const chance = isChance(test.p);
                        return (
                            <p>
                                📈 <strong className={('text-white')}>{t('coach.microTrendLabel')}</strong>{' '}
                                {t('coach.microTrendText', { last7: avgLast7.toFixed(1), prev21: avgPrev21.toFixed(1), pct: `${percentChange > 0 ? '+' : ''}${percentChange}` })}
                                {' '}<span className="text-gray-400">{t('coach.diffSentence', { verdict: verdict(test.p), defaultValue: 'A diferença {{verdict}}.' })}</span>
                                {!chance && metaFreqAlvo != null && (
                                    <> {t(percentChange < 0 ? 'coach.towardGoal' : 'coach.awayFromGoal', { defaultValue: percentChange < 0 ? 'Vai no sentido da tua meta de reduzir.' : 'Vai no sentido contrário ao da tua meta de reduzir.' })}</>
                                )}
                            </p>
                        );
                    })()}

                    {/* Trend vs previous period */}
                    {(() => {
                        if (totalConsumptions === 0) return null;
                        // "Tudo" não tem período anterior; "Hoje" é um dia contra um dia.
                        if (patternsPeriod === 'tudo' || patternsPeriod === 'hoje') return null;

                        // ⚠️ ANTES: comparava o TOTAL de consumos dos dois períodos
                        // (com 3 consumos de cada lado bastava) e dizia "O que mudou?
                        // Identifica o trigger e ajusta o plano" — juízo e conselho
                        // sem meta, sobre uma diferença nunca testada. E o período
                        // atual inclui hoje, ainda a meio. Agora: média por dia de
                        // calendário conhecido (sem hoje), com teste.
                        const range = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
                        const prevRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset + 1);
                        if (!range.start || !prevRange.start) return null;
                        const ontem = somaDias(getTodayKey(), -1);
                        const fimAtual = safeToISODate(range.end) < ontem ? safeToISODate(range.end) : ontem;
                        const diasAtual = diasConhecidos(safeToISODate(range.start), fimAtual);
                        const diasAnterior = diasConhecidos(safeToISODate(prevRange.start), safeToISODate(prevRange.end));
                        if (diasAtual.length < MIN_PER_WINDOW || diasAnterior.length < MIN_PER_WINDOW) return null;

                        const consAnteriorPorDia = {};
                        filterByDateRange(consumptions || [], prevRange).forEach(c => {
                            const d = c.date || safeToISODate(c.timestamp);
                            if (d) consAnteriorPorDia[d] = (consAnteriorPorDia[d] || 0) + 1;
                        });
                        const valsAtual = diasAtual.map(d => consPorDia[d] || 0);
                        const valsAnterior = diasAnterior.map(d => consAnteriorPorDia[d] || 0);
                        const mAtual = media(valsAtual), mAnterior = media(valsAnterior);
                        if (!(mAnterior > 0)) return null;
                        const pct = ((mAtual - mAnterior) / mAnterior) * 100;
                        if (Math.abs(pct) < 5) return null;

                        const test = diffPermutation(valsAnterior, valsAtual);
                        return (
                            <p>
                                📊 <strong className="text-white">{t('coach.trendLabel', 'Comparado com o período anterior:')}</strong>{' '}
                                {t('coach.trendCompare', {
                                    curr: mAtual.toFixed(1), nCurr: diasAtual.length,
                                    prev: mAnterior.toFixed(1), nPrev: diasAnterior.length,
                                    pct: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}`,
                                    defaultValue: 'média de {{curr}} consumos por dia neste ({{nCurr}} dias) e {{prev}} no anterior ({{nPrev}} dias), {{pct}}%.',
                                })}
                                {' '}<span className="text-gray-400">{t('coach.diffSentence', { verdict: verdict(test.p), defaultValue: 'A diferença {{verdict}}.' })}</span>
                                {!isChance(test.p) && metaFreqAlvo != null && (
                                    <> {t(pct < 0 ? 'coach.towardGoal' : 'coach.awayFromGoal')}</>
                                )}
                            </p>
                        );
                    })()}

                    {/* Quantity/mg */}
                    {(() => {
                        // mg real por DIA vindo da FONTE UNIFICADA (dailySummary):
                        // inclui o registo de mg à mão (dailyLogs) E o mg derivado
                        // das pesagens. Assim "dias em que registaste dosagem" conta
                        // TODOS os dias com dosagem, não só os das pesagens (antes,
                        // ligado só às pesagens, mostrava ~20; e o cycle.mg antigo ~16).
                        const mgDates = Object.keys(mgByDate || {});
                        if (mgDates.length === 0) return null;

                        let totalMg = 0;
                        mgDates.forEach(d => { totalMg += mgByDate[d]; });
                        const uniqueDaysWithMg = mgDates.length;
                        const avgMgPerDay = totalMg / uniqueDaysWithMg;

                        // Índice consumos-por-data (uma vez) para não varrer todos os
                        // consumos por cada ciclo (O(N²)).
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = [];
                            consumptionsByDate[c.date].push(c);
                        });

                        // Ciclos sem consumo após 00h
                        const cyclesWithNoLateConsumption = analysisCycles.filter(cycle => {
                            // Derivar data do ciclo
                            const cycleDate = cycle.date || safeToISODate(cycle.timestamp);

                            // Consumos deste dia (consulta O(1))
                            const cycleConsumptions = consumptionsByDate[cycleDate] || [];

                            // Verificar se algum consumo foi após 00h
                            const hasLateConsumption = cycleConsumptions.some(c => {
                                const hour = new Date(c.timestamp).getHours();
                                return hour >= 0 && hour < 6; // 00h-06h
                            });

                            return !hasLateConsumption;
                        }).length;

                        const pctNoLate = ((cyclesWithNoLateConsumption / analysisCycles.length) * 100).toFixed(0);

                        // COBERTURA: uma média de 20 dias não quer dizer o mesmo se o
                        // período tinha 20 dias ou 60. Dizer de quantos dias falamos é
                        // o que torna a média honesta — sem isto, dias em falta somem
                        // em silêncio e a média parece valer para o período todo.
                        const isEN = i18n.language === 'en';
                        const dayKeyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const range = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
                        const allDates = [...mgDates, ...Object.keys(consumptionsByDate)].sort();
                        const spanStartKey = range.start ? dayKeyOf(range.start) : (allDates[0] || null);
                        const spanEndKey = range.end ? dayKeyOf(range.end) : getTodayKey();
                        let spanDays = null;
                        if (spanStartKey && spanEndKey && spanStartKey <= spanEndKey) {
                            const a = new Date(`${spanStartKey}T12:00:00`);
                            const b = new Date(`${spanEndKey}T12:00:00`);
                            spanDays = Math.round((b - a) / 86400000) + 1;
                        }
                        const unloggedInSpan = unloggedDates
                            ? [...unloggedDates].filter(d => (!spanStartKey || d >= spanStartKey) && (!spanEndKey || d <= spanEndKey)).length
                            : 0;

                        return (
                            <>
                            <p>
                                📊 <strong className={('text-cyan-400')}>{t('coach.quantityLabel')}</strong>{' '}
                                {t('coach.quantityText', { mg: avgMgPerDay.toFixed(0), n: uniqueDaysWithMg, label: t(uniqueDaysWithMg === 1 ? 'coach.day_singular' : 'coach.day_plural') })}
                                {/* ⚠️ AQUI ESTAVAM QUATRO JUÍZOS INVENTADOS PELA APP.
                                   Era: >300mg "quantidade elevada, considera estabelecer
                                   uma meta de redução"; >200 "moderada-alta"; >100
                                   "moderada, se estás a trabalhar na redução estás no
                                   caminho certo"; abaixo disso "relativamente baixa! Bom
                                   trabalho". Os limiares (100/200/300) não vêm de lado
                                   nenhum e o elogio existia sem meta nenhuma definida.
                                   Agora: o número mostra-se sempre; a comparação só
                                   existe se ELA tiver uma meta de quantidade, e é
                                   contra a meta dela. Sem meta, a app diz o valor e
                                   cala-se. */}
                                {(() => {
                                    const metaQtd = goals.find(g => g.type === 'reduce_quantity' && g.target > 0);
                                    if (!metaQtd) {
                                        // Meta de MANTER os mg (X ± Y): dentro = verde (é a meta
                                        // dela); fora — abaixo ou acima — só a descrição, a cinzento.
                                        const keepQtd = goals.find(g => g.type === 'keep_quantity' && parseFloat(g.target) > 0);
                                        const zone = keepQtd ? keepGoalZone(avgMgPerDay, keepQtd.target, keepQtd.tolerance) : null;
                                        if (!zone) return null;
                                        const range = `${keepQtd.target} ± ${readTolerance(keepQtd.tolerance)}`;
                                        return (
                                            <> <span className={zone === 'in' ? 'text-emerald-400' : 'text-gray-300'}>
                                                {t(zone === 'in' ? 'coach.keepQtyIn' : zone === 'above' ? 'coach.keepQtyAbove' : 'coach.keepQtyBelow', { range })}
                                            </span></>
                                        );
                                    }
                                    const dentro = avgMgPerDay <= metaQtd.target;
                                    return (
                                        <> <span className={dentro ? 'text-emerald-400' : 'text-gray-300'}>
                                            {t(dentro ? 'coach.quantityGoalWithin' : 'coach.quantityGoalAbove', { target: metaQtd.target })}
                                        </span></>
                                    );
                                })()}
                                {analysisCycles.length >= 3 && <> {t(pctNoLate >= 70 ? 'coach.quantityNoLateHighPct' : pctNoLate >= 50 ? 'coach.quantityNoLateMedPct' : 'coach.quantityNoLateLowPct', { pct: pctNoLate })}</>}
                            </p>
                            {spanDays != null && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {isEN
                                        ? `This average is built on ${uniqueDaysWithMg} of the ${spanDays} days in the period.`
                                        : `Esta média é feita com ${uniqueDaysWithMg} dos ${spanDays} dias do período.`}
                                    {unloggedInSpan > 0 && (isEN
                                        ? ` ${unloggedInSpan} of them you marked as "not logged" — missing information, so they are left out instead of counting as zero.`
                                        : ` ${unloggedInSpan} deles marcaste como "não registei" — informação em falta, por isso ficam de fora em vez de contarem como zero.`)}
                                </p>
                            )}
                            </>
                        );
                    })()}
                </div>
            )}

            {/* ── SECÇÃO 2: DIAS E PADRÕES ── */}
            {sectionBtn('dias', '📅', i18n.language === 'en' ? 'Days & Patterns' : 'Dias e Padrões')}
            {openSections.dias && (
                <div className={'!border-t-0 px-4 pb-5 pt-1 space-y-4 leading-relaxed text-gray-200'}>
                    {/* Good vs Difficult Days */}
                    {(() => {
                        if (totalConsumptions === 0) return null;

                        // Agrupar consumos por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = { count: 0, cycles: [], wellbeing: [] };
                            consumptionsByDate[c.date].count++;
                        });

                        // Adicionar dados de ciclos
                        analysisCycles.forEach(cycle => {
                            const cycleDate = cycle.date || safeToISODate(cycle.timestamp);
                            if (consumptionsByDate[cycleDate]) {
                                consumptionsByDate[cycleDate].cycles.push(cycle);
                            }
                        });

                        // Adicionar dados de wellbeing
                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (wDate && consumptionsByDate[wDate]) {
                                consumptionsByDate[wDate].wellbeing.push(w);
                            }
                        });

                        // Buscar meta de redução de frequência para definir thresholds dinâmicos
                        const frequencyGoal = goals.find(g => g.type === 'reduce_frequency');

                        // Se não houver meta, não mostrar esta secção
                        if (!frequencyGoal) return null;

                        // Um dia DENTRO da meta (≤ alvo) conta como bom — não "alvo - 1".
                        // Senão, cumprir a meta (ex.: 6 quando o alvo é 6) não aparecia como bom.
                        const goodThreshold = Math.max(1, frequencyGoal.target);
                        // Use the same global threshold (target + 2) so all sections agree

                        const goodDays = Object.entries(consumptionsByDate).filter(([_, d]) => d.count <= goodThreshold);
                        const difficultDays = Object.entries(consumptionsByDate).filter(([_, d]) => d.count >= difficultThreshold);

                        if (goodDays.length === 0 && difficultDays.length === 0) return null;

                        // Valores por DIA (um por dia, para os dois grupos serem
                        // comparáveis): sono do ciclo, média do humor do dia.
                        const sleepVals = (days) => days.flatMap(([_, d]) => {
                            const v = d.cycles.filter(temSono).map(c => parseFloat(c.sleep));
                            return v.length ? [media(v)] : [];
                        });
                        const moodVals = (days) => days.flatMap(([_, d]) => {
                            const v = d.wellbeing.filter(w => w.mood).map(w => parseInt(w.mood));
                            return v.length ? [media(v)] : [];
                        });
                        const gSleep = sleepVals(goodDays), dSleep = sleepVals(difficultDays);
                        const gMood = moodVals(goodDays), dMood = moodVals(difficultDays);
                        const goodSleep = gSleep.length ? media(gSleep).toFixed(1) : null;
                        const difficultSleep = dSleep.length ? media(dSleep).toFixed(1) : null;
                        const goodMood = gMood.length ? media(gMood).toFixed(1) : null;
                        const difficultMood = dMood.length ? media(dMood).toFixed(1) : null;

                        // ⚠️ ANTES: "Nesses dias dormiste mais Xh" só aparecia quando o
                        // sono era MAIOR nos dias dentro da meta (nunca ao contrário) e
                        // sem teste. Agora a diferença é testada nos dois sentidos, e
                        // com poucos dias de um dos lados diz-se que não dá.
                        const linhaTeste = (a, b, what) => {
                            if (a.length === 0 || b.length === 0) return null;
                            if (a.length < MIN_PER_WINDOW || b.length < MIN_PER_WINDOW) {
                                return t('coach.groupFew', { what, nA: a.length, nB: b.length, min: MIN_PER_WINDOW, defaultValue: '{{what}}: poucos dias para comparar os dois grupos ({{nA}} e {{nB}}; são precisos {{min}} de cada lado).' });
                            }
                            const r = diffPermutation(b, a);
                            return t('coach.groupTest', { what, verdict: verdict(r.p), defaultValue: '{{what}}: a diferença entre os dois grupos {{verdict}}.' });
                        };
                        const testeSono = linhaTeste(gSleep, dSleep, t('coach.whatSleep', 'Sono'));
                        const testeHumor = linhaTeste(gMood, dMood, t('coach.whatMood', 'Humor'));

                        return (
                            <p>
                                📊 <strong className={('text-gray-200')}>{t('coach.goodVsDifficultLabel')}</strong>
                                {goodDays.length > 0 && <> {t('coach.youHad')} <strong>{goodDays.length} {t(goodDays.length === 1 ? 'coach.goodDaysSingular' : 'coach.goodDaysPlural')}</strong> {t('coach.atMostUses', { n: goodThreshold })}{goodSleep && <><strong>{t('coach.withAvgSleep', { h: goodSleep })}</strong></>}{goodMood && <><strong>{t('coach.withMood', { n: goodMood })}</strong></>}.</>}
                                {difficultDays.length > 0 && <> {goodDays.length > 0 && t('coach.onTheOtherHand')} {t('coach.thereWere')} <strong className="text-white">{difficultDays.length} {t(difficultDays.length === 1 ? 'coach.difficultDaySingular' : 'coach.difficultDayPlural')}</strong> {t('coach.atLeastUses', { n: difficultThreshold })}{difficultSleep && <><strong>{t('coach.withAvgSleep', { h: difficultSleep })}</strong></>}{difficultMood && <><strong>{t('coach.withMood', { n: difficultMood })}</strong></>}.</>}
                                {goodDays.length > 0 && difficultDays.length > 0 && (testeSono || testeHumor) && (
                                    <> <span className="text-gray-400">{[testeSono, testeHumor].filter(Boolean).join(' ')}</span></>
                                )}
                            </p>
                        );
                    })()}

                    {/* Weekly Pattern */}
                    {(() => {
                        if (analysisConsumptions.length < 7) return null;

                        const dayNames = Array.from({ length: 7 }, (_, i) =>
                            new Date(2024, 0, 7 + i).toLocaleDateString(i18n.language, { weekday: 'long' })
                        );

                        // ⚠️ ANTES: "Xs são os teus dias mais difíceis… Ys são melhores",
                        // com a média só dos dias COM consumo (um dia a zero não
                        // contava), sem teste, mesmo numa semana (um dia de cada), e
                        // com conselhos ("Estrutura atividades para esse dia").
                        // Agora: todos os dias conhecidos do período (zeros
                        // incluídos, sem hoje); só entram os dias da semana com
                        // MIN_DIAS_SEMANA dias; o mais alto vs o mais baixo é
                        // comparado com o acaso baralhando os dias da semana.
                        const MIN_DIAS_SEMANA = 4;
                        const range = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
                        const ontem = somaDias(getTodayKey(), -1);
                        const inicio = range.start ? safeToISODate(range.start) : primeiroRegisto;
                        const fim = range.end && safeToISODate(range.end) < ontem ? safeToISODate(range.end) : ontem;
                        const dias = diasConhecidos(inicio, fim);
                        const porDiaSemana = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
                        dias.forEach(d => { porDiaSemana[new Date(`${d}T12:00:00`).getDay()].push(consPorDia[d] || 0); });
                        const testados = [1, 2, 3, 4, 5, 6, 0].filter(k => porDiaSemana[k].length >= MIN_DIAS_SEMANA);

                        if (testados.length < 2) {
                            return (
                                <p>
                                    📅 <strong className={('text-white')}>{t('coach.weeklyPatternLabel')}</strong>{' '}
                                    <span className="text-gray-400">{t('coach.weeklyFew', { min: MIN_DIAS_SEMANA, n: dias.length, defaultValue: 'Para comparar dias da semana são precisos pelo menos {{min}} dias de cada (há {{n}} dias no período).' })}</span>
                                </p>
                            );
                        }

                        const r = rangePermutation(testados.map(k => porDiaSemana[k]));
                        const medias = testados.map(k => ({ k, m: media(porDiaSemana[k]) }));
                        const hi = medias.reduce((a, b) => (b.m > a.m ? b : a));
                        const lo = medias.reduce((a, b) => (b.m < a.m ? b : a));

                        return (
                            <p>
                                📅 <strong className={('text-white')}>{t('coach.weeklyPatternLabel')}</strong>{' '}
                                {t('coach.weeklyRange', { day: dayNames[hi.k], avg: hi.m.toFixed(1), bestDay: dayNames[lo.k], bestAvg: lo.m.toFixed(1), k: testados.length, n: dias.length, defaultValue: 'Com mais consumos em média: {{day}} ({{avg}}); com menos: {{bestDay}} ({{bestAvg}}), em {{n}} dias.' })}
                                {' '}<span className="text-gray-400">{t('coach.weeklyVerdict', { verdict: verdict(r.p, r.m, r.b), defaultValue: 'Uma diferença destas entre dias da semana {{verdict}}.' })}</span>
                            </p>
                        );
                    })()}

                    {/* Momentum/Streaks */}
                    {(() => {
                        if (analysisConsumptions.length < 5) return null;

                        // ⚠️ ISTO CALCULAVA A MEDIANA DOS PRÓPRIOS DIAS E CHAMAVA-LHE
                        // "as tuas metas". Não havia meta nenhuma: a app inventava o
                        // alvo a partir dos dados da pessoa e depois aplaudia-a por o
                        // cumprir ("🎉 estás nessa streak AGORA!").
                        // Pior do que uma opinião — parecia um número dela.
                        // E por construção metade dos dias ficam sempre "dentro": a
                        // mediana não é um alvo, é uma propriedade da distribuição. O
                        // "recorde" até descia sozinho à medida que a mediana mudava.
                        // Agora: só existe com uma meta REAL de frequência, e o limite
                        // é o alvo que a pessoa definiu.
                        if (!frequencyGoal) return null;
                        const target = Math.max(1, parseInt(frequencyGoal.target, 10));
                        if (!target || isNaN(target)) return null;

                        // Agrupar por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        // Ordenar por data
                        const sortedDates = Object.keys(consumptionsByDate).sort();
                        let maxStreak = 0, currentStreak = 0, maxStreakEnd = null, isCurrentStreakActive = false;

                        sortedDates.forEach((date, idx) => {
                            // "Seguidos" = dias de calendário seguidos, não registos
                            // seguidos (um buraco de uma semana não é sequência).
                            if (idx > 0 && diaSeguinte(sortedDates[idx - 1]) !== date) currentStreak = 0;
                            if (consumptionsByDate[date] <= target) {
                                currentStreak++;
                                if (currentStreak > maxStreak) {
                                    maxStreak = currentStreak;
                                    maxStreakEnd = date;
                                }
                                if (idx === sortedDates.length - 1) isCurrentStreakActive = true;
                            } else {
                                currentStreak = 0;
                                isCurrentStreakActive = false;
                            }
                        });

                        if (maxStreak < 2) return null;

                        return (
                            <p>
                                🔥 <strong className={('text-white')}>{t('coach.momentumLabel')}</strong>{' '}
                                {t('coach.momentumRecord', { n: maxStreak, label: t(maxStreak === 1 ? 'coach.day_singular' : 'coach.day_plural'), target })}
                                {isCurrentStreakActive && maxStreak === currentStreak ? (
                                    <> <span className={'font-medium ' + ('text-green-400')}>{t('coach.momentumActiveStreak')}</span></>
                                ) : maxStreakEnd ? (
                                    <> {t('coach.momentumPastStreak', { date: new Date(maxStreakEnd + 'T12:00:00').toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }) })}</>
                                ) : null}
                            </p>
                        );
                    })()}

                    {/* Outliers */}
                    {(() => {
                        if (analysisConsumptions.length < 5) return null;

                        // Agrupar por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        const dailyCounts = Object.entries(consumptionsByDate).map(([date, count]) => ({date, count}));
                        const avgDaily = dailyCounts.reduce((sum, d) => sum + d.count, 0) / dailyCounts.length;

                        // Top 3 dias mais altos
                        const topDays = dailyCounts.sort((a, b) => b.count - a.count).slice(0, 3);

                        if (topDays.length === 0 || topDays[0].count < avgDaily + 2) return null;

                        const top1 = topDays[0];
                        const diffFromAvg = (top1.count - avgDaily).toFixed(0);

                        // Buscar emoções/wellbeing do dia top 1 outlier
                        const top1Wellbeing = analysisWellbeing.find(w => (w.date || safeToISODate(w.timestamp)) === top1.date);
                        const top1Emotions = top1Wellbeing?.emotions || [];
                        const top1Mood = top1Wellbeing?.mood ? parseInt(top1Wellbeing.mood) : null;

                        // Buscar reflexões/notes desse dia
                        const top1Reflection = analysisReflections.find(r => (r.date || safeToISODate(r.timestamp)) === top1.date);
                        const top1Note = top1Reflection?.answer || null;

                        return (
                            <p>
                                📍 <strong className={('text-white')}>{t('coach.outliersLabel')}</strong>{' '}
                                {topDays.length === 1
                                    ? t('coach.outliersTopDay', { date: new Date(top1.date + 'T12:00:00').toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }), n: top1.count, diff: diffFromAvg, avg: avgDaily.toFixed(1) })
                                    : t('coach.outliersTopDayN', { date: new Date(top1.date + 'T12:00:00').toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' }), n: top1.count, diff: diffFromAvg, avg: avgDaily.toFixed(1), k: topDays.length })}
                                {top1Emotions.length > 0 && (
                                    <> <strong className={('text-white')}>{top1Emotions.join(', ')}</strong>{top1Mood && <> ({top1Mood}/10)</>}.</>
                                )}
                                {topDays.length > 1 && (
                                    <> {t('coach.outliersOtherPeaks')} {topDays.slice(1).map((d, i) => (
                                        <span key={d.date}>
                                            {i > 0 && ', '}
                                            {new Date(d.date + 'T12:00:00').toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })} ({d.count})
                                        </span>
                                    ))}.</>
                                )}
                                {/* Antes: "Outliers não são falhas… Que gap de necessidades foi
                                    preenchido?" / "Repara no padrão emocional" — interpretação
                                    a partir de UM dia. Ficam só os factos desse dia. */}
                            </p>
                        );
                    })()}

                    {/* Recovery Profile */}
                    {(() => {
                        if (analysisConsumptions.length < 20) return null;
                        if (difficultThreshold == null) return null; // sem meta, sem "dia difícil"

                        // Agrupar por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        const dailyCounts = Object.values(consumptionsByDate);
                        const avgDaily = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;

                        // Ordenar por data
                        const sortedDates = Object.keys(consumptionsByDate).sort();

                        // Detectar recuperações: dias após dia difícil (≥threshold)
                        const recoveryTimes = [];
                        let stillRecoveringDays = 0; // Contador de dias difíceis ainda sem recuperação
                        sortedDates.forEach((date, idx) => {
                            if (consumptionsByDate[date] >= difficultThreshold && idx < sortedDates.length - 1) {
                                // Procurar quando volta à média
                                let recovered = false;
                                for (let j = idx + 1; j < sortedDates.length; j++) {
                                    if (consumptionsByDate[sortedDates[j]] <= avgDaily) {
                                        recoveryTimes.push(j - idx);
                                        recovered = true;
                                        break;
                                    }
                                    // Limite de 7 dias
                                    if (j - idx >= 7) break;
                                }
                                // Se não recuperou nos últimos 7 dias ou ainda está a decorrer
                                if (!recovered) stillRecoveringDays++;
                            }
                        });

                        if (recoveryTimes.length === 0 && stillRecoveringDays === 0) return null;

                        const avgRecovery = recoveryTimes.length > 0 ? (recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length).toFixed(1) : null;

                        return (
                            <p>
                                🔄 <strong className={('text-white')}>{t('coach.recoveryLabel')}</strong>
                                {/* Antes: "Isso é rapidamente" / "Pequenos hábitos de 'reset'
                                    podem ajudar" e cores amarelo/laranja — juízo e conselho.
                                    E voltar à média depois de um dia alto acontece muitas
                                    vezes só por acaso: diz-se isso em vez de o ler como
                                    "recuperação". */}
                                {avgRecovery ? (
                                    <> {t(parseFloat(avgRecovery) === 1 ? 'coach.recoveryAvgSingular' : 'coach.recoveryAvgPlural', { n: avgRecovery })}</>
                                ) : null}
                                {stillRecoveringDays > 0 && (
                                    <> {t(stillRecoveringDays === 1 ? 'coach.recoveryStillSingular' : 'coach.recoveryStillPlural', { n: stillRecoveringDays })}</>
                                )}
                                {' '}<span className="text-gray-400">{t('coach.recoveryChanceNote', 'Depois de um dia muito acima da média, é comum os seguintes estarem mais perto dela, mesmo só por acaso — isto descreve, não mede uma "recuperação".')}</span>
                            </p>
                        );
                    })()}

                    {/* Cascade */}
                    {(() => {
                        if (analysisConsumptions.length < 15) return null;
                        if (difficultThreshold == null) return null; // sem meta, sem "dia difícil"

                        // Agrupar por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        // Ordenar por data
                        const sortedDates = Object.keys(consumptionsByDate).sort();

                        // ⚠️ DUAS CORRECÇÕES AQUI.
                        //
                        // 1. Dias SEGUIDOS a sério. `sortedDates` são as datas COM
                        //    registos, não o calendário: uma "cascata" podia ser
                        //    dois dias difíceis separados por uma semana.
                        //
                        // 2. COMPARAR COM O ACASO. Contar sequências e chamar-lhes
                        //    "padrão" não prova nada: se uma pessoa tem dias difíceis
                        //    em 44% dos dias, sequências de 2 e 3 acontecem o tempo
                        //    todo só por acaso. Nos dados reais da utilizadora um dia
                        //    difícil é seguido de outro 42,8% das vezes, contra 46,2%
                        //    depois de um dia normal — diferença NEGATIVA, p = 0,71.
                        //    A app estava a avisá-la de um arrastamento que não existe.
                        //    Agora mostra-se o esperado ao acaso ao lado do observado,
                        //    e o texto só fala em padrão se o observado o ultrapassar.
                        const saoSeguidos = (a, b) => Math.round(
                            (new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000
                        ) === 1;

                        let cascadeEvents = 0, longestCascade = 0, currentCascade = 0;
                        let diasDificeis = 0;

                        sortedDates.forEach((date, idx) => {
                            const dificil = consumptionsByDate[date] >= difficultThreshold;
                            if (dificil) diasDificeis++;
                            const seguido = idx > 0 && saoSeguidos(sortedDates[idx - 1], date);
                            if (dificil && (seguido || currentCascade === 0)) {
                                currentCascade = (dificil && seguido) ? currentCascade + 1 : 1;
                                if (currentCascade > longestCascade) longestCascade = currentCascade;
                                if (currentCascade === 2) cascadeEvents++;
                            } else {
                                currentCascade = dificil ? 1 : 0;
                                if (currentCascade > longestCascade) longestCascade = currentCascade;
                            }
                        });

                        if (cascadeEvents === 0 && longestCascade < 2) return null;

                        // ⚠️ O "esperado ao acaso" de antes comparava coisas
                        // diferentes: contava EPISÓDIOS observados (uma sequência de
                        // 18 dias = 1) contra PARES esperados. Agora testa-se a
                        // pergunta certa, com pares de dias de calendário seguidos:
                        // depois de um dia acima, o seguinte é mais vezes acima do
                        // que depois dos outros dias? (diffPermutation em 0/1)
                        const depoisDificil = [], depoisOutro = [];
                        sortedDates.forEach((date, idx) => {
                            if (idx === 0 || !saoSeguidos(sortedDates[idx - 1], date)) return;
                            const hoje1 = consumptionsByDate[date] >= difficultThreshold ? 1 : 0;
                            if (consumptionsByDate[sortedDates[idx - 1]] >= difficultThreshold) depoisDificil.push(hoje1);
                            else depoisOutro.push(hoje1);
                        });
                        const poucos = depoisDificil.length < MIN_PER_WINDOW || depoisOutro.length < MIN_PER_WINDOW;
                        const test = poucos ? null : diffPermutation(depoisOutro, depoisDificil);
                        const pctOf = (arr) => arr.length ? Math.round(media(arr) * 100) : 0;

                        return (
                            <p>
                                🌊 <strong className={('text-white')}>{t('coach.cascadeLabel')}</strong>
                                {longestCascade >= 2 ? (
                                    <> {t('coach.cascadeDetected', { n: cascadeEvents, label: t(cascadeEvents === 1 ? 'coach.episode_singular' : 'coach.episode_plural'), longest: longestCascade, threshold: difficultThreshold })}
                                    {' '}<span className={('text-gray-400')}>
                                        {poucos
                                            ? t('coach.cascadeFew', { nA: depoisDificil.length, nB: depoisOutro.length, min: MIN_PER_WINDOW, defaultValue: 'Para ver se um dia acima puxa o seguinte são precisos {{min}} pares de dias seguidos de cada tipo (há {{nA}} e {{nB}}).' })
                                            : t('coach.cascadeTest', { a: pctOf(depoisDificil), nA: depoisDificil.length, b: pctOf(depoisOutro), nB: depoisOutro.length, verdict: verdict(test.p), defaultValue: 'Depois de um dia acima, o seguinte também foi acima em {{a}}% das vezes (de {{nA}}); depois dos outros dias, em {{b}}% (de {{nB}}). A diferença {{verdict}}.' })}
                                    </span>
                                    </>
                                ) : (
                                    <> {t('coach.cascadeNone')}</>
                                )}
                            </p>
                        );
                    })()}
                </div>
            )}

            {/* ── SECÇÃO 3: HORÁRIOS E RISCOS ── */}
            {sectionBtn('horarios', '⏰', i18n.language === 'en' ? 'Timing' : 'Horários')}
            {openSections.horarios && (
                <div className={'!border-t-0 px-4 pb-5 pt-1 space-y-4 leading-relaxed text-gray-200'}>
                    {(() => {
                    const _horarioBlocks = [

                    /* Vulnerability Windows */
                    (() => {
                        if (analysisConsumptions.length < 10) return null;

                        // Calcular consumos por hora
                        const byHour = {};
                        for (let h = 0; h < 24; h++) byHour[h] = 0;

                        analysisConsumptions.forEach(c => {
                            const hour = new Date(c.timestamp).getHours();
                            byHour[hour]++;
                        });

                        // Detectar janelas de 4h com maior concentração
                        let maxWindowCount = 0, maxWindowStart = 0;
                        for (let start = 0; start < 24; start++) {
                            let windowCount = 0;
                            for (let i = 0; i < 4; i++) {
                                windowCount += byHour[(start + i) % 24];
                            }
                            if (windowCount > maxWindowCount) {
                                maxWindowCount = windowCount;
                                maxWindowStart = start;
                            }
                        }

                        const concentrationPercent = Math.round((maxWindowCount / analysisConsumptions.length) * 100);

                        const formatWindow = (start) => {
                            const end = (start + 4) % 24;
                            return `${String(start).padStart(2, '0')}h-${String(end).padStart(2, '0')}h`;
                        };

                        // Categorizar janela
                        let windowTypeKey = '';
                        if (maxWindowStart >= 22 || maxWindowStart <= 2) windowTypeKey = 'coach.windowNight';
                        else if (maxWindowStart >= 6 && maxWindowStart <= 11) windowTypeKey = 'coach.windowMorning';
                        else if (maxWindowStart >= 12 && maxWindowStart <= 17) windowTypeKey = 'coach.windowAfternoon';
                        else windowTypeKey = 'coach.windowEveningNight';

                        // Mostrar SEMPRE a janela de maior consumo (com ≥10 consumos há
                        // sempre uma). Se houver pico forte (≥50%), enquadra-se como janela
                        // de risco; se o consumo estiver espalhado, é uma observação neutra
                        // (tom observacional, sem alarmismo).
                        // Antes: com ≥50% chamava-lhe "Janela de Vulnerabilidade" e
                        // com ≥70% dava um aviso a amarelo. É só onde os consumos
                        // caem: descreve-se, sem rótulo de risco nem cor de alarme.
                        const concentrated = concentrationPercent >= 50;
                        return (
                            <p>
                                ⏰ <strong className={'text-white'}>
                                    {t('coach.peakWindowLabel')}
                                </strong>{' '}
                                {t('coach.vulnerabilityText', { pct: concentrationPercent, window: formatWindow(maxWindowStart), type: t(windowTypeKey) })}
                                {' '}<span className={('text-gray-400')}>
                                    {concentrated
                                        ? t('coach.peakWindowConcentrated', 'Mais de metade dos teus consumos cai nestas 4 horas.')
                                        : t('coach.peakWindowSpread')}
                                </span>
                            </p>
                        );
                    })(),

                    /* Escalation (First Use) */
                    (() => {
                        if (analysisConsumptions.length < 10 || analysisCycles.length < 3) return null;

                        // Agrupar consumos por dia
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = [];
                            consumptionsByDate[c.date].push(c);
                        });

                        // Calcular hora do primeiro consumo e total por dia
                        const firstConsData = {};
                        Object.entries(consumptionsByDate).forEach(([date, cons]) => {
                            const dayCycle = analysisCycles.find(cycle => safeToISODate(cycle.timestamp) === date);
                            const cycleTime = dayCycle ? new Date(dayCycle.timestamp).getTime() : 0;
                            const consumptionsAfterCycle = dayCycle ? cons.filter(c => new Date(c.timestamp).getTime() >= cycleTime) : cons;

                            if (consumptionsAfterCycle.length === 0) return;

                            const sortedCons = consumptionsAfterCycle.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                            const firstCons = sortedCons[0];
                            const hour = new Date(firstCons.timestamp).getHours();
                            firstConsData[date] = { firstHour: hour, total: cons.length };
                        });

                        const dataPoints = Object.values(firstConsData);
                        if (dataPoints.length < 5) return null;

                        // Dividir em dois grupos: primeiro consumo cedo (<10h) vs tarde (≥10h)
                        const earlyStarts = dataPoints.filter(d => d.firstHour < 10);
                        const lateStarts = dataPoints.filter(d => d.firstHour >= 10);

                        // Antes: 3 dias de cada lado, sem teste, título "Escalada" e
                        // "começar mais cedo não piora o dia — pode até ajudar"
                        // (causa e juízo). Agora: 5 dias de cada lado e teste; com
                        // menos, diz-se que não dá.
                        if (earlyStarts.length < MIN_PER_WINDOW || lateStarts.length < MIN_PER_WINDOW) {
                            return (
                                <p>
                                    🌅 <strong className="text-white">{t('coach.escalationLabel')}</strong>{' '}
                                    <span className="text-gray-400">{t('coach.escalationFew', { nE: earlyStarts.length, nL: lateStarts.length, min: MIN_PER_WINDOW, defaultValue: 'Para comparar os dias que começam antes das 10h com os outros são precisos {{min}} dias de cada (há {{nE}} e {{nL}}).' })}</span>
                                </p>
                            );
                        }

                        const avgEarlyTotal = media(earlyStarts.map(d => d.total));
                        const avgLateTotal = media(lateStarts.map(d => d.total));
                        const test = diffPermutation(lateStarts.map(d => d.total), earlyStarts.map(d => d.total));

                        return (
                            <p>
                                🌅 <strong className="text-white">{t('coach.escalationLabel')}</strong>{' '}
                                {t('coach.escalationCompare', { early: avgEarlyTotal.toFixed(1), nE: earlyStarts.length, late: avgLateTotal.toFixed(1), nL: lateStarts.length, defaultValue: 'Nos dias em que o primeiro consumo foi antes das 10h houve em média {{early}} consumos ({{nE}} dias); nos dias em que começou mais tarde, {{late}} ({{nL}} dias).' })}
                                {' '}<span className="text-gray-400">
                                    {t('coach.diffSentence', { verdict: verdict(test.p) })}
                                    {' '}{t('coach.escalationHoursNote', 'Começar mais cedo também deixa mais horas no dia.')}
                                </span>
                            </p>
                        );
                    })(),

                    /* Trigger Mapping */
                    (() => {
                        if (analysisConsumptions.length < 10 || analysisCycles.length < 5) return null;

                        // ⚠️ ANTES: "X% dos consumos tardios aconteceram em dias com <6h
                        // sono. Padrão forte… Melhorar o sono pode ser uma alavanca" —
                        // sem comparar com os OUTROS dias (se quase todas as noites
                        // têm <6h, 60% não diz nada), e com linguagem de causa. E uma
                        // 2.ª parte escolhia a emoção mais comum nos dias de muitos
                        // consumos e chamava-lhe "trigger primário validado — não é
                        // especulação". Essa saiu: as emoções são comparadas, com
                        // teste e todas pela mesma ordem, em "Emoções e consumo".
                        // Agora: dias com consumos entre as 00h e as 06h vs os outros
                        // dias com consumo, na parte com menos de 6h de sono.
                        const sonoPorDia = new Map();
                        analysisCycles.forEach(c => {
                            const d = c.date || safeToISODate(c.timestamp);
                            if (d && temSono(c)) sonoPorDia.set(d, parseFloat(c.sleep));
                        });
                        const diasTardios = new Set(analysisConsumptions
                            .filter(c => { const h = new Date(c.timestamp).getHours(); return h >= 0 && h < 6; })
                            .map(c => c.date || safeToISODate(c.timestamp)));
                        const comTardio = [], semTardio = [];
                        Object.keys(consPorDia).forEach(d => {
                            if (!sonoPorDia.has(d)) return;
                            (diasTardios.has(d) ? comTardio : semTardio).push(sonoPorDia.get(d) < 6 ? 1 : 0);
                        });
                        if (comTardio.length === 0) return null;
                        if (comTardio.length < MIN_PER_WINDOW || semTardio.length < MIN_PER_WINDOW) {
                            return (
                                <p>
                                    🔗 <strong className="text-white">{t('coach.triggerMappingLabel')}</strong>{' '}
                                    <span className="text-gray-400">{t('coach.lateSleepFew', { nA: comTardio.length, nB: semTardio.length, min: MIN_PER_WINDOW, defaultValue: 'Para comparar o sono dos dias com consumos entre as 00h e as 06h com o dos outros dias são precisos {{min}} dias de cada, com sono registado (há {{nA}} e {{nB}}).' })}</span>
                                </p>
                            );
                        }
                        const test = diffPermutation(semTardio, comTardio);
                        return (
                            <p>
                                🔗 <strong className="text-white">{t('coach.triggerMappingLabel')}</strong>{' '}
                                {t('coach.lateSleepCompare', { a: Math.round(media(comTardio) * 100), nA: comTardio.length, b: Math.round(media(semTardio) * 100), nB: semTardio.length, defaultValue: 'Nos dias com consumos entre as 00h e as 06h, {{a}}% tinham menos de 6h de sono registado ({{nA}} dias); nos outros dias com consumo, {{b}}% ({{nB}} dias).' })}
                                {' '}<span className="text-gray-400">{t('coach.diffSentence', { verdict: verdict(test.p) })}</span>
                            </p>
                        );
                    })(),

                    /* Risk Profile */
                    (() => {
                        // Identificar condições que precedem dias com mais consumo
                        if (analysisConsumptions.length < 1 || analysisWellbeing.length < 1) return null;

                        const dailyProfile = {};

                        // Agrupar por dia
                        analysisConsumptions.forEach(c => {
                            if (!dailyProfile[c.date]) dailyProfile[c.date] = { consumptions: 0, prevSleep: null, prevMood: null, prevEnergy: null };
                            dailyProfile[c.date].consumptions++;
                        });

                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (!wDate) return;
                            if (!dailyProfile[wDate]) dailyProfile[wDate] = { consumptions: 0, prevSleep: null, prevMood: null, prevEnergy: null };
                        });

                        // Para cada dia, pegar bem-estar do dia ANTERIOR — o dia de
                        // calendário antes (D-1), não "o registo anterior": se não
                        // houve registo ontem, este dia fica sem "véspera" em vez de
                        // ir buscar o de há uma semana.
                        const sortedDates = Object.keys(dailyProfile).sort();
                        for (let i = 0; i < sortedDates.length; i++) {
                            const yesterday = diaAnterior(sortedDates[i]);
                            const yesterdayWellbeing = analysisWellbeing.find(w => {
                                const wDate = w.date || safeToISODate(w.timestamp);
                                return wDate === yesterday;
                            });

                            if (yesterdayWellbeing) {
                                dailyProfile[sortedDates[i]].prevSleep = temSono(yesterdayWellbeing) ? parseFloat(yesterdayWellbeing.sleep) : null;
                                dailyProfile[sortedDates[i]].prevMood = yesterdayWellbeing.mood ? parseInt(yesterdayWellbeing.mood) : null;
                                dailyProfile[sortedDates[i]].prevEnergy = yesterdayWellbeing.energy ? parseInt(yesterdayWellbeing.energy) : null;
                            }
                        }

                        // ⚠️ ANTES: "dias de alto risco" (o terço com mais consumo) vs o
                        // resto, com 2 dias de cada lado, sem teste — aparecia até
                        // numa semana — e com "Humor baixo pode ser gatilho… usa
                        // estratégias de prevenção". Agora: as duas séries diárias
                        // (humor da véspera, consumos do dia) por ordem de data,
                        // spearmanPermutation, pelo menos MIN_SPEARMAN dias.
                        const pares = sortedDates
                            .filter(d => dailyProfile[d].prevMood !== null)
                            .map(d => ({ mood: dailyProfile[d].prevMood, cons: dailyProfile[d].consumptions }));
                        if (pares.length === 0) return null;
                        if (pares.length < MIN_SPEARMAN) {
                            return (
                                <p>
                                    🎯 <strong className="text-white">{t('coach.riskProfileLabel')}</strong>{' '}
                                    <span className="text-gray-400">{t('coach.prevMoodFew', { n: pares.length, min: MIN_SPEARMAN, defaultValue: 'Para ver se o humor da véspera anda junto com o número de consumos são precisos {{min}} dias com humor registado na véspera (há {{n}}).' })}</span>
                                </p>
                            );
                        }
                        const test = spearmanPermutation(pares.map(x => x.mood), pares.map(x => x.cons));
                        if (test.rho == null) return null;
                        const chance = isChance(test.p);
                        return (
                            <p>
                                🎯 <strong className="text-white">{t('coach.riskProfileLabel')}</strong>{' '}
                                {chance
                                    ? t('coach.prevMoodChance', { n: test.n, rho: rhoTxt(test.rho), p: fmtP(test.p, test.m, test.b), defaultValue: 'Em {{n}} dias, o humor da véspera não anda junto com o número de consumos de forma que se distinga do acaso (ρ = {{rho}}, {{p}}).' })
                                    : t(test.rho < 0 ? 'coach.prevMoodLow' : 'coach.prevMoodHigh', { n: test.n, rho: rhoTxt(test.rho), p: fmtP(test.p, test.m, test.b), defaultValue: test.rho < 0
                                        ? 'Em {{n}} dias, os dias a seguir a um humor mais baixo tenderam a ter mais consumos (ρ = {{rho}}, {{p}}). Andam juntos — não quer dizer que um cause o outro.'
                                        : 'Em {{n}} dias, os dias a seguir a um humor mais alto tenderam a ter mais consumos (ρ = {{rho}}, {{p}}). Andam juntos — não quer dizer que um cause o outro.' })}
                            </p>
                        );
                    })(),

                    ].filter(Boolean);
                    if (_horarioBlocks.length === 0) {
                        return <p className="text-gray-500 text-sm italic text-center py-2">{t('coach.noData')}</p>;
                    }
                    return _horarioBlocks.map((block, i) => <React.Fragment key={`horario-${i}`}>{block}</React.Fragment>);
                    })()}
                </div>
            )}

            {/* ── SECÇÃO 4: SONO ── */}
            {sectionBtn('sono', '💤', i18n.language === 'en' ? 'Sleep' : 'Sono')}
            {openSections.sono && (
                <div className={'!border-t-0 px-4 pb-5 pt-1 space-y-4 leading-relaxed text-gray-200'}>
                    {/* Sleep Score */}
                    {(() => {
                        // Combinar dados de sono de cycles e wellbeing
                        const allSleepData = [];

                        // Adicionar dados de cycles (sono noturno + sesta do mesmo dia)
                        analysisCycles.forEach(c => {
                            if (temSono(c) && c.bedtime) {
                                const date = c.date || safeToISODate(c.timestamp);
                                const napMins = analysisWellbeing
                                    .filter(w => (w.date || safeToISODate(w.timestamp)) === date)
                                    .reduce((sum, w) => sum + (w.napDuration || 0), 0);
                                allSleepData.push({
                                    date,
                                    sleep: parseFloat(c.sleep) + napMins / 60,
                                    bedtime: c.bedtime,
                                    timestamp: c.timestamp
                                });
                            }
                        });

                        // Adicionar dados de wellbeing (se não houver em cycles — legado)
                        analysisWellbeing.forEach(w => {
                            if (temSono(w)) {
                                const date = w.date || safeToISODate(w.timestamp);
                                if (!allSleepData.some(s => s.date === date)) {
                                    const napMins = analysisWellbeing
                                        .filter(w2 => (w2.date || safeToISODate(w2.timestamp)) === date)
                                        .reduce((sum, w2) => sum + (w2.napDuration || 0), 0);
                                    allSleepData.push({
                                        date,
                                        sleep: parseFloat(w.sleep) + napMins / 60,
                                        bedtime: null,
                                        timestamp: w.timestamp
                                    });
                                }
                            }
                        });

                        if (allSleepData.length < 3) return null; // Precisamos de pelo menos 3 dias

                        // Ordenar por data
                        allSleepData.sort((a, b) => new Date(a.timestamp || a.date) - new Date(b.timestamp || b.date));

                        // 1. SCORE DE HORAS (0-5 pontos)
                        const avgSleep = allSleepData.reduce((sum, s) => sum + s.sleep, 0) / allSleepData.length;
                        let hoursScore = 0;
                        if (avgSleep >= 7 && avgSleep <= 8) {
                            hoursScore = 5; // Perfeito
                        } else if (avgSleep >= 6 && avgSleep < 7) {
                            hoursScore = 3.5; // Razoável
                        } else if (avgSleep > 8 && avgSleep <= 9) {
                            hoursScore = 4; // Bom mas um pouco acima
                        } else if (avgSleep >= 5 && avgSleep < 6) {
                            hoursScore = 2; // Insuficiente
                        } else if (avgSleep > 9) {
                            hoursScore = 3; // Muito sono pode indicar problemas
                        } else {
                            hoursScore = 1; // <5h muito mau
                        }

                        // 2. SCORE DE REGULARIDADE (0-5 pontos)
                        let regularityScore = 0;
                        const dataWithBedtime = allSleepData.filter(s => s.bedtime);

                        if (dataWithBedtime.length >= 3) {
                            const getBedtimeMinutes = (bedtime) => {
                                const [hours, minutes] = bedtime.split(':').map(Number);
                                // Normalizar madrugada (0-6h) para 24-30h
                                if (hours >= 0 && hours < 6) return (hours + 24) * 60 + minutes;
                                return hours * 60 + minutes;
                            };

                            const bedtimeMinutes = dataWithBedtime.map(s => getBedtimeMinutes(s.bedtime));
                            const avgBedtime = bedtimeMinutes.reduce((a, b) => a + b, 0) / bedtimeMinutes.length;

                            // Calcular desvio padrão
                            const variance = bedtimeMinutes.reduce((sum, bt) => sum + Math.pow(bt - avgBedtime, 2), 0) / bedtimeMinutes.length;
                            const stdDev = Math.sqrt(variance);

                            // Converter desvio para horas
                            const stdDevHours = stdDev / 60;

                            if (stdDevHours < 0.5) {
                                regularityScore = 5; // Muito regular (±30 min)
                            } else if (stdDevHours < 1) {
                                regularityScore = 4; // Bom (±1h)
                            } else if (stdDevHours < 1.5) {
                                regularityScore = 3; // Razoável (±1.5h)
                            } else if (stdDevHours < 2) {
                                regularityScore = 2; // Irregular (±2h)
                            } else {
                                regularityScore = 1; // Muito irregular
                            }
                        } else {
                            // Se não temos bedtime suficiente, dar score neutro
                            regularityScore = 2.5;
                        }

                        // 3. SCORE FINAL (0-10)
                        const finalScore = hoursScore + regularityScore;

                        // 4. TENDÊNCIA (primeira metade vs segunda metade das noites).
                        // Antes: bastava uma diferença de 0,5h para dizer "a subir"
                        // ou "a piorar" (a verde/vermelho), sem teste. Agora só se diz
                        // que mudou se a diferença não se confundir com o acaso.
                        let trend = null;
                        if (allSleepData.length >= 2 * MIN_PER_WINDOW) {
                            const midpoint = Math.floor(allSleepData.length / 2);
                            const firstHalf = allSleepData.slice(0, midpoint).map(s => s.sleep);
                            const secondHalf = allSleepData.slice(midpoint).map(s => s.sleep);
                            const r = diffPermutation(firstHalf, secondHalf);
                            trend = { dir: isChance(r.p) ? 'stable' : (r.diff > 0 ? 'up' : 'down'), p: r.p, a: media(firstHalf), b: media(secondHalf) };
                        }

                        // Sono é bem-estar (a regra do elogio é mais solta), mas a
                        // cor de semáforo (verde/amarelo/vermelho) saiu: o número e a
                        // frase chegam.
                        return (
                            <p>
                                💤 <strong>{t('coach.sleepScoreLabel')}</strong>{' '}
                                <span className={'text-xl font-bold font-mono-theme text-white'}>
                                    {finalScore.toFixed(1)}/10
                                </span>
                                {' '}
                                <span className={('text-gray-300')}>
                                    {t('coach.sleepScoreDetails', { hours: hoursScore.toFixed(1), reg: regularityScore.toFixed(1) })}
                                </span>
                                .
                                {finalScore >= 8 ? (
                                    <> {t('coach.sleepScoreExcellent', { avg: avgSleep.toFixed(1) })}</>
                                ) : finalScore >= 6 ? (
                                    <> {t(regularityScore < 3 ? 'coach.sleepScoreReasonableIrregular' : 'coach.sleepScoreReasonable', { avg: avgSleep.toFixed(1) })}</>
                                ) : (
                                    <> {t(regularityScore < 3 ? 'coach.sleepScorePoorIrregular' : 'coach.sleepScorePoor', { avg: avgSleep.toFixed(1) })}</>
                                )}
                                {' '}<span className="text-gray-400">
                                    {trend
                                        ? t(trend.dir === 'up' ? 'coach.sleepTrendUp' : trend.dir === 'down' ? 'coach.sleepTrendDown' : 'coach.sleepTrendChance', {
                                            a: trend.a.toFixed(1), b: trend.b.toFixed(1), p: fmtP(trend.p),
                                            defaultValue: trend.dir === 'up'
                                                ? 'Primeira metade das noites: {{a}}h em média; segunda: {{b}}h — a subir ({{p}}).'
                                                : trend.dir === 'down'
                                                    ? 'Primeira metade das noites: {{a}}h em média; segunda: {{b}}h — a descer ({{p}}).'
                                                    : 'Primeira metade das noites: {{a}}h em média; segunda: {{b}}h — a diferença não se distingue do acaso ({{p}}).',
                                        })
                                        : t('coach.sleepTrendFew', { n: allSleepData.length, min: 2 * MIN_PER_WINDOW, defaultValue: 'Para ver se o sono está a mudar são precisas {{min}} noites registadas (há {{n}}).' })}
                                </span>
                            </p>
                        );
                    })()}

                    <hr className="border-gray-700/50" />

                    {/* No Sleep Days */}
                    {(() => {
                        if (analysisConsumptions.length === 0) return null;

                        // Separar datas em "sem sono" e "com sono"
                        const uniqueConsDates = new Set();
                        analysisConsumptions.forEach(c => { if (c.date) uniqueConsDates.add(c.date); });

                        // ⚠️ AQUI ESTAVA O MESMO ERRO DE SEMPRE: "não há registo de
                        // sono" era tratado como "não dormiu". Nos dados reais, dos
                        // 29 dias que a app chamava "sem dormir", 25 não tinham
                        // registo NENHUM de ciclo — ela só não registou. E o texto
                        // acrescentava "a privação de sono pode intensificar efeitos
                        // e craving", ou seja, uma afirmação clínica em cima de dados
                        // que não existem.
                        //
                        // Agora: só conta como pouco sono o que foi MEDIDO. Dias sem
                        // registo saem da comparação e são contados à parte, para a
                        // pessoa poder preenchê-los se quiser.
                        const LIMIAR_POUCO_SONO = 3; // horas

                        const horasPorDia = new Map();
                        analysisCycles.forEach(c => {
                            const d = c.date || (c.timestamp ? safeToISODate(c.timestamp) : null);
                            const v = parseFloat(c.sleep);
                            if (d && !isNaN(v)) horasPorDia.set(d, Math.min(horasPorDia.get(d) ?? Infinity, v));
                        });
                        analysisWellbeing.forEach(w => {
                            const d = w.date || (w.timestamp ? safeToISODate(w.timestamp) : null);
                            const v = parseFloat(w.sleep);
                            if (d && !isNaN(v)) horasPorDia.set(d, Math.min(horasPorDia.get(d) ?? Infinity, v));
                        });

                        const noSleepDates = new Set();   // pouco sono, MEDIDO
                        const withSleepDates = new Set(); // sono normal, MEDIDO
                        const semRegistoDeSono = new Set(); // não se sabe — fora das contas

                        uniqueConsDates.forEach(date => {
                            const h = horasPorDia.get(date);
                            if (h == null) semRegistoDeSono.add(date);
                            else if (h <= LIMIAR_POUCO_SONO) noSleepDates.add(date);
                            else withSleepDates.add(date);
                        });

                        if (noSleepDates.size === 0) return null;
                        // Antes bastavam 3 noites de cada lado e "Consumiste mais nesses
                        // dias" saía de uma diferença de 15%, sem teste. Agora: 5 de
                        // cada lado e teste; com menos, diz-se quantas há.
                        if (noSleepDates.size < MIN_PER_WINDOW || withSleepDates.size < MIN_PER_WINDOW) {
                            return (
                                <p>
                                    😴 <strong className={('text-cyan-400')}>{t('coach.noSleepAnalysisLabel')}</strong>{' '}
                                    <span className="text-gray-400">{t('coach.noSleepFew', { n: noSleepDates.size, m: withSleepDates.size, min: MIN_PER_WINDOW, defaultValue: 'Há {{n}} noites com 3h ou menos registadas e {{m}} com mais — para comparar são precisas {{min}} de cada.' })}</span>
                                    {semRegistoDeSono.size > 0 && (
                                        <> <span className={('text-gray-500')}>{t('coach.noSleepUnlogged', { n: semRegistoDeSono.size })}</span></>
                                    )}
                                </p>
                            );
                        }

                        // Consumos por dia: pouco sono vs o resto (um valor por dia)
                        const consNoSleep = [...noSleepDates].map(d => consPorDia[d] || 0);
                        const consWithSleep = [...withSleepDates].map(d => consPorDia[d] || 0);
                        const avgConsNoSleep = media(consNoSleep);
                        const avgConsWithSleep = media(consWithSleep);
                        const testCons = diffPermutation(consWithSleep, consNoSleep);

                        // Humor e energia: média por dia, nos dois grupos
                        const porDiaMedia = (campo, dias) => {
                            const m = {};
                            analysisWellbeing.forEach(w => {
                                const d = w.date || (w.timestamp ? safeToISODate(w.timestamp) : null);
                                if (!d || !dias.has(d) || w[campo] == null || isNaN(parseFloat(w[campo]))) return;
                                (m[d] = m[d] || []).push(parseFloat(w[campo]));
                            });
                            return Object.values(m).map(media);
                        };
                        const moodNoSleep = porDiaMedia('mood', noSleepDates), moodWithSleep = porDiaMedia('mood', withSleepDates);
                        const energyNoSleep = porDiaMedia('energy', noSleepDates), energyWithSleep = porDiaMedia('energy', withSleepDates);
                        const hasMoodData = moodNoSleep.length > 0 && moodWithSleep.length > 0;
                        const hasEnergyData = energyNoSleep.length > 0 && energyWithSleep.length > 0;
                        const linhaTeste = (a, b, what) => {
                            if (a.length === 0 || b.length === 0) return null;
                            if (a.length < MIN_PER_WINDOW || b.length < MIN_PER_WINDOW) {
                                return t('coach.groupFew', { what, nA: a.length, nB: b.length, min: MIN_PER_WINDOW });
                            }
                            return t('coach.groupTest', { what, verdict: verdict(diffPermutation(b, a).p) });
                        };

                        return (
                            <p>
                                😴 <strong className={('text-cyan-400')}>{t('coach.noSleepAnalysisLabel')}</strong>{' '}
                                {t('coach.noSleepCompare', {
                                    n: noSleepDates.size,
                                    avgCons: avgConsNoSleep.toFixed(1),
                                    avgConsS: avgConsWithSleep.toFixed(1)
                                })}
                                {' '}<span className="text-gray-400">{t('coach.diffSentence', { verdict: verdict(testCons.p) })}</span>
                                {hasMoodData && (
                                    <> {t('coach.noSleepMoodEnergy', {
                                        mood: media(moodNoSleep).toFixed(1),
                                        energy: hasEnergyData ? media(energyNoSleep).toFixed(1) : '–',
                                        moodS: media(moodWithSleep).toFixed(1),
                                        energyS: hasEnergyData ? media(energyWithSleep).toFixed(1) : '–'
                                    })}
                                    {' '}<span className="text-gray-400">{[linhaTeste(moodNoSleep, moodWithSleep, t('coach.whatMood', 'Humor')), linhaTeste(energyNoSleep, energyWithSleep, t('coach.whatEnergy', 'Energia'))].filter(Boolean).join(' ')}</span></>
                                )}
                                {!hasMoodData && <> {t('coach.noSleepNoWellbeing')}</>}
                                {semRegistoDeSono.size > 0 && (
                                    <> <span className={('text-gray-500')}>{t('coach.noSleepUnlogged', { n: semRegistoDeSono.size })}</span></>
                                )}
                            </p>
                        );
                    })()}

                    <hr className="border-gray-700/50" />

                    {/* ===== HORAS DOS CONSUMOS NOS DIAS SEM SONO REGISTADO =====
                       A pergunta da Teresa: nos dias sem horas de sono, "os consumos
                       são a que horas? Não dá para perceber se são constantes e se
                       realmente não dormi."

                       Medido nos dados dela: dá, mas só num sentido. O maior intervalo
                       sem consumos DENTRO do dia de calendário (é aí que o sono dela
                       cai — deita-se de madrugada e acorda à tarde do mesmo dia)
                       correlaciona-se com as horas de sono registadas: r = 0,43 em 288
                       dias. Um intervalo de 8h ou mais aparece em 141 noites de sono
                       normal e em 1 de sono curto. Mas o contrário não se sustenta: das
                       noites com intervalo curto, a maioria tinha sono normal — pode
                       estar acordada horas sem consumir.

                       Por isso este bloco mostra o FACTO (o intervalo, e a que horas
                       foi) e deixa a conclusão para ela. A regra de leitura não está
                       escrita à mão: é contada nos dias dela, e se não houver dias
                       suficientes o bloco diz que não dá para comparar. */}
                    {(() => {
                        const LIMIAR_POUCO_SONO = 3;   // horas de sono
                        const INTERVALO_LONGO = 8;     // horas sem consumos
                        const INTERVALO_CURTO = 4;
                        const MIN_DIAS_REFERENCIA = 20;
                        const MIN_SUBGRUPO = 5;        // noites de cada lado antes de falar
                        const hoje = getTodayKey();

                        const horasPorDia = new Map();
                        analysisCycles.forEach(c => {
                            const d = c.date || (c.timestamp ? safeToISODate(c.timestamp) : null);
                            const v = parseFloat(c.sleep);
                            if (d && !isNaN(v)) horasPorDia.set(d, Math.min(horasPorDia.get(d) ?? Infinity, v));
                        });
                        analysisWellbeing.forEach(w => {
                            const d = w.date || (w.timestamp ? safeToISODate(w.timestamp) : null);
                            const v = parseFloat(w.sleep);
                            if (d && !isNaN(v)) horasPorDia.set(d, Math.min(horasPorDia.get(d) ?? Infinity, v));
                        });

                        // Consumos agrupados pelo dia de calendário, em hora local.
                        const porDia = new Map();
                        analysisConsumptions.forEach(c => {
                            const d = c.date || (c.timestamp ? safeToISODate(c.timestamp) : null);
                            if (!d || !c.timestamp) return;
                            const ms = new Date(c.timestamp).getTime();
                            if (isNaN(ms)) return;
                            if (!porDia.has(d)) porDia.set(d, []);
                            porDia.get(d).push(ms);
                        });

                        // Maior intervalo entre dois consumos seguidos do mesmo dia.
                        // Com menos de 2 consumos não existe intervalo: fica a null e o
                        // dia mostra-se sem número em vez de com um zero inventado.
                        const intervaloPorDia = new Map();
                        porDia.forEach((lista, d) => {
                            if (lista.length < 2) { intervaloPorDia.set(d, null); return; }
                            const ord = [...lista].sort((a, b) => a - b);
                            let maior = 0, inicio = ord[0];
                            for (let i = 1; i < ord.length; i++) {
                                const h = (ord[i] - ord[i - 1]) / 3600000;
                                if (h > maior) { maior = h; inicio = ord[i - 1]; }
                            }
                            intervaloPorDia.set(d, { horas: maior, inicio, fim: inicio + maior * 3600000, n: ord.length });
                        });

                        // Hoje fica de fora: o dia ainda não acabou e a noite ainda
                        // não aconteceu, por isso o intervalo de hoje não quer dizer
                        // nada sobre dormir.
                        const semRegisto = [...porDia.keys()]
                            .filter(d => d !== hoje && horasPorDia.get(d) == null)
                            .sort((a, b) => b.localeCompare(a));

                        if (semRegisto.length === 0) return null;

                        // Referência: só dias em que o sono FOI registado e há intervalo.
                        const ref = [...porDia.keys()]
                            .filter(d => d !== hoje && horasPorDia.get(d) != null && intervaloPorDia.get(d))
                            .map(d => ({ gap: intervaloPorDia.get(d).horas, sono: horasPorDia.get(d) }));

                        const longos = ref.filter(r => r.gap >= INTERVALO_LONGO);
                        const curtos = ref.filter(r => r.gap < INTERVALO_CURTO);
                        const longosComSono = longos.filter(r => r.sono > LIMIAR_POUCO_SONO).length;
                        const curtosComPouco = curtos.filter(r => r.sono <= LIMIAR_POUCO_SONO).length;

                        // A app só explica como ler o intervalo se tiver dias dela para
                        // o sustentar: 20 dias com sono registado E pelo menos 5 noites
                        // de cada lado. Sem isso, mostra as horas e cala-se — dizer
                        // "2 de 2" soaria a certeza e são duas noites.
                        const temReferencia = ref.length >= MIN_DIAS_REFERENCIA
                            && longos.length >= MIN_SUBGRUPO && curtos.length >= MIN_SUBGRUPO;

                        const dm = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
                        const hm = ms => {
                            const x = new Date(ms);
                            return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
                        };

                        const MOSTRAR = 8;
                        const visiveis = semRegisto.slice(0, MOSTRAR);

                        return (
                            <div>
                                <p>
                                    🕐 <strong className={('text-cyan-400')}>{t('coach.gapTitle')}</strong>{' '}
                                    {t('coach.gapIntro', { n: semRegisto.length })}
                                </p>
                                <p className="mt-2 text-gray-400">
                                    {temReferencia
                                        ? t('coach.gapRule', {
                                            ref: ref.length,
                                            longH: INTERVALO_LONGO,
                                            longN: longos.length,
                                            longSlept: longosComSono,
                                            shortH: INTERVALO_CURTO,
                                            shortN: curtos.length,
                                            shortLittle: curtosComPouco,
                                            thr: LIMIAR_POUCO_SONO
                                        })
                                        : ref.length < MIN_DIAS_REFERENCIA
                                            ? t('coach.gapNoRule', { ref: ref.length, min: MIN_DIAS_REFERENCIA })
                                            : t('coach.gapNoRuleGroups', {
                                                longH: INTERVALO_LONGO,
                                                longN: longos.length,
                                                shortH: INTERVALO_CURTO,
                                                shortN: curtos.length,
                                                min: MIN_SUBGRUPO
                                            })}
                                </p>
                                <ul className="mt-2 space-y-1">
                                    {visiveis.map(d => {
                                        const iv = intervaloPorDia.get(d);
                                        return (
                                            <li key={d} className="text-gray-300">
                                                <span className="font-medium">{dm(d)}</span>{' · '}
                                                {iv
                                                    ? t('coach.gapRow', {
                                                        n: iv.n,
                                                        gap: iv.horas.toFixed(1),
                                                        from: hm(iv.inicio),
                                                        to: hm(iv.fim)
                                                    })
                                                    : <span className="text-gray-500">{t('coach.gapRowNoGap')}</span>}
                                            </li>
                                        );
                                    })}
                                </ul>
                                {semRegisto.length > MOSTRAR && (
                                    <p className="mt-1 text-gray-500">{t('coach.gapMore', { n: semRegisto.length - MOSTRAR })}</p>
                                )}
                            </div>
                        );
                    })()}

                    <hr className="border-gray-700/50" />

                    {/* Sleep-Mood Correlation */}
                    {(() => {
                        const dailyData = {};

                        // Mood from wellbeing logs
                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (!wDate) return;
                            if (!dailyData[wDate]) dailyData[wDate] = { sleep: null, mood: null };
                            if (w.mood) dailyData[wDate].mood = parseInt(w.mood);
                            // Legacy: some old wellbeing records have sleep field
                            if (temSono(w) && dailyData[wDate].sleep == null) dailyData[wDate].sleep = parseFloat(w.sleep);
                        });

                        // Sleep from cycles (primary source — wellbeing rarely has sleep)
                        analysisCycles.forEach(c => {
                            const cDate = c.date || safeToISODate(c.timestamp);
                            if (!cDate || !temSono(c)) return;
                            if (!dailyData[cDate]) dailyData[cDate] = { sleep: null, mood: null };
                            dailyData[cDate].sleep = parseFloat(c.sleep);
                        });

                        // O sono do ciclo D é a noite de D-1 para D (D = dia em que
                        // acordou). O humor que vem a seguir a essa noite é o do
                        // PRÓPRIO dia D. Antes juntava-se o sono de D ao humor do
                        // registo seguinte (até 2 dias depois) — ou seja, à noite
                        // errada, e às vezes com um dia inteiro pelo meio.
                        // ⚠️ ANTES: Pearson com 3 dias bastava, e o texto dizia "Dormir
                        // bem melhora claramente o teu humor… é o teu melhor
                        // investimento emocional" (causa + conselho) ou "Considera
                        // consultar profissional de saúde". Agora: as duas séries por
                        // ordem de data, spearmanPermutation, pelo menos MIN_SPEARMAN
                        // dias; e só se diz "andam juntos".
                        const pares = Object.keys(dailyData).sort()
                            .filter(d => dailyData[d].sleep !== null && dailyData[d].mood !== null)
                            .map(d => dailyData[d]);
                        if (pares.length === 0) return null;
                        const label = (
                            <>💤 <strong className={('text-white')}>{t('coach.sleepMoodLabel')}</strong>{' '}</>
                        );
                        if (pares.length < MIN_SPEARMAN) {
                            return (
                                <p>
                                    {label}
                                    <span className="text-gray-400">{t('coach.sleepMoodFew', { n: pares.length, min: MIN_SPEARMAN, defaultValue: 'Para ver se as horas de sono andam junto com o humor desse dia são precisos {{min}} dias com os dois registados (há {{n}}).' })}</span>
                                </p>
                            );
                        }
                        const test = spearmanPermutation(pares.map(x => x.sleep), pares.map(x => x.mood));
                        if (test.rho == null) return null;
                        const args = { n: test.n, rho: rhoTxt(test.rho), p: fmtP(test.p, test.m, test.b) };
                        return (
                            <p>
                                {label}
                                {isChance(test.p)
                                    ? t('coach.sleepMoodChance', { ...args, defaultValue: 'Em {{n}} dias, as horas de sono e o humor desse dia não andam juntos de forma que se distinga do acaso (ρ = {{rho}}, {{p}}).' })
                                    : t(test.rho > 0 ? 'coach.sleepMoodPos' : 'coach.sleepMoodNegative', { ...args, defaultValue: test.rho > 0
                                        ? 'Em {{n}} dias, depois de noites mais longas o humor tendeu a ser mais alto (ρ = {{rho}}, {{p}}). Andam juntos — não quer dizer que um cause o outro.'
                                        : 'Em {{n}} dias, depois de noites mais longas o humor tendeu a ser mais baixo (ρ = {{rho}}, {{p}}). Andam juntos — não quer dizer que um cause o outro.' })}
                            </p>
                        );
                    })()}
                </div>
            )}

            {/* ── SECÇÃO 5: EMOÇÕES E BEM-ESTAR ── */}
            {sectionBtn('emocoes', '🌈', i18n.language === 'en' ? 'Emotions & Wellbeing' : 'Emoções e Bem-estar')}
            {openSections.emocoes && (
                <div className={'!border-t-0 px-4 pb-5 pt-1 space-y-4 leading-relaxed text-gray-200'}>
                    {/* Emotional State */}
                    {(() => {
                        if (analysisWellbeing.length === 0) return null;

                        // Contar emoções por categoria
                        const allEmotions = analysisWellbeing.flatMap(w => w.emotions || []);
                        if (allEmotions.length === 0) return null;

                        const positiveCount = allEmotions.filter(e => getEmotionCategory(e) === 'positive').length;
                        const negativeCount = allEmotions.filter(e => getEmotionCategory(e) === 'negative').length;
                        const totalEmotions = positiveCount + negativeCount;
                        if (totalEmotions === 0) return null;

                        const positivePercent = Math.round((positiveCount / totalEmotions) * 100);

                        // Top 3 emoções
                        const emotionFreq = {};
                        allEmotions.forEach(e => { emotionFreq[e] = (emotionFreq[e] || 0) + 1; });
                        const topEmotions = Object.entries(emotionFreq)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([emotion]) => emotion);

                        // Determinar se é maioritariamente positivo ou negativo
                                                const balanceLabelKey = positivePercent >= 70 ? 'coach.balanceVeryPositive' : positivePercent >= 50 ? 'coach.balancePositive' : positivePercent >= 30 ? 'coach.balanceMixed' : 'coach.balanceChallenging';

                        return (
                            <p>
                                🌈 <strong className={('text-cyan-400')}>{t('coach.emotionalStateLabel')}</strong>{' '}{t('coach.emotionalBalance')} <strong className="text-white">{t(balanceLabelKey)}</strong> {t('coach.pctPositiveEmotions', { pct: positivePercent })}
                                {topEmotions.length > 0 && <> {t('coach.mostFrequentEmotions')} <strong>{topEmotions.map(e => i18n.language === 'en' ? (EMOTION_EN[e] || e) : e).join(', ')}</strong>.</>}
                                {/* Antes, com ≥60%: "✨ Ótimo! Mantém estas práticas que te fazem
                                    sentir bem" — elogio e uma causa que a app não conhece. */}
                                {positivePercent < 40 && (
                                    <> <span className={('text-gray-300')}>{t('coach.emotionalDifficultTip')}</span></>
                                )}
                            </p>
                        );
                    })()}

                    {/* Emotional Triggers */}
                    {(() => {
                        if (analysisWellbeing.length < 5) return null;

                        // ⚠️ ANTES: "Gatilhos Emocionais Validados: Emoção X correlaciona
                        // com +2 consumos… É gatilho validado, não especulação" e "Fator
                        // protetor — cultivar": a emoção com a MAIOR diferença (escolhida
                        // pela força), com 2 dias, sem teste. Agora: cada emoção com
                        // dias suficientes é testada (dias com ela vs dias sem ela, no
                        // nº de consumos), e diz-se quantas foram testadas — com
                        // muitas, uma ou outra parece diferente só por acaso.
                        const diasPorEmocao = new Map();
                        const diasComEmocoes = new Set();
                        analysisWellbeing.forEach(w => {
                            const d = w.date || safeToISODate(w.timestamp);
                            if (!d || !w.emotions || w.emotions.length === 0) return;
                            diasComEmocoes.add(d);
                            w.emotions.forEach(e => {
                                if (!diasPorEmocao.has(e)) diasPorEmocao.set(e, new Set());
                                diasPorEmocao.get(e).add(d);
                            });
                        });
                        const testadas = [];
                        diasPorEmocao.forEach((dias, emotion) => {
                            const com = [...dias].map(d => consPorDia[d] || 0);
                            const sem = [...diasComEmocoes].filter(d => !dias.has(d)).map(d => consPorDia[d] || 0);
                            if (com.length < MIN_PER_WINDOW || sem.length < MIN_PER_WINDOW) return;
                            const r = diffPermutation(sem, com);
                            testadas.push({ emotion, n: com.length, a: media(com), b: media(sem), p: r.p });
                        });
                        const nomeEmocao = (e) => (i18n.language === 'en' ? (EMOTION_EN[e] || e) : e);
                        const label = (<>🎭 <strong className={('text-white')}>{t('coach.emotionalTriggersLabel')}</strong>{' '}</>);
                        if (testadas.length === 0) {
                            return (
                                <p>
                                    {label}
                                    <span className="text-gray-400">{t('coach.emotionsFew', { min: MIN_PER_WINDOW, defaultValue: 'Ainda nenhuma emoção tem dias suficientes para comparar (são precisos {{min}} dias com ela e {{min}} sem).' })}</span>
                                </p>
                            );
                        }
                        // Ordem fixa (alfabética), nunca pela diferença.
                        const sinal = testadas.filter(x => !isChance(x.p)).sort((x, y) => String(x.emotion).localeCompare(String(y.emotion)));
                        return (
                            <p>
                                {label}
                                {sinal.length === 0
                                    ? t('coach.emotionsNone', { k: testadas.length, defaultValue: 'Testámos {{k}} emoções (as que têm dias suficientes): em nenhuma o número de consumos nos dias com ela se distingue do acaso.' })
                                    : <>
                                        {t('coach.emotionsSome', { k: testadas.length, defaultValue: 'Testámos {{k}} emoções (as que têm dias suficientes). Nos dias com estas, o número de consumos foi diferente de forma que dificilmente é só acaso:' })}{' '}
                                        {sinal.map((x, i) => (
                                            <span key={x.emotion}>
                                                {i > 0 && '; '}
                                                <strong>{nomeEmocao(x.emotion)}</strong>{' '}
                                                {t('coach.emotionRow', { a: x.a.toFixed(1), b: x.b.toFixed(1), n: x.n, p: fmtP(x.p), defaultValue: '{{a}} consumos/dia contra {{b}} sem ela ({{n}} dias, {{p}})' })}
                                            </span>
                                        ))}.
                                        {' '}<span className="text-gray-400">{t('coach.emotionsMultiple', { k: testadas.length, e: (testadas.length * 0.05).toLocaleString(i18n.language, { maximumFractionDigits: 1 }), defaultValue: 'Com {{k}} comparações, cerca de {{e}} dariam este resultado só por acaso. Andarem juntos não quer dizer que um cause o outro.' })}</span>
                                    </>}
                            </p>
                        );
                    })()}

                    {/* Emotional Profile (🧠) */}
                    {(() => {
                        if (analysisWellbeing.length < 10) return null;

                        // Agrupar emoções por tipo
                        const emotionTypes = {
                            ansiedade: ['😰 Ansioso/a', '😓 Stressado/a', '😩 Overwhelmed'],
                            frustração: ['😫 Frustrado/a', '😤 Irritado/a', '😕 Confuso/a'],
                            tristeza: ['😢 Triste', '😔 Inseguro/a', '🥺 Solitário/a'],
                            apatia: ['😞 Apático/a', '🔌 Desconectado/a', '😐 Ambivalente'],
                            energia: ['💪 Motivado/a', '⚡ Okay', '🌟 Produtiva/o'],
                            positivas: ['😊 Feliz', '🎉 Entusiasmado/a', '🌈 Otimista', '😌 Calmo/a']
                        };

                        const typeCounts = {};
                        const moodValues = [];

                        analysisWellbeing.forEach(w => {
                            if (w.emotions && w.emotions.length > 0) {
                                w.emotions.forEach(emotion => {
                                    Object.entries(emotionTypes).forEach(([type, list]) => {
                                        if (list.includes(emotion)) {
                                            if (!typeCounts[type]) typeCounts[type] = 0;
                                            typeCounts[type]++;
                                        }
                                    });
                                });
                            }
                            if (w.mood) moodValues.push(parseInt(w.mood));
                        });

                        if (Object.keys(typeCounts).length === 0 || moodValues.length < 5) return null;

                        // Calcular oscilação de humor (intensidade)
                        const avgMood = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;
                        const variance = moodValues.reduce((sum, val) => sum + Math.pow(val - avgMood, 2), 0) / moodValues.length;
                        const stdDev = Math.sqrt(variance).toFixed(1);

                        // Diversidade emocional (quantos tipos diferentes)
                        const numTypes = Object.keys(typeCounts).length;

                        const oscillationLevel = parseFloat(stdDev) > 2.5 ? t('coach.emotionalOscillationHigh') : parseFloat(stdDev) > 1.5 ? t('coach.emotionalOscillationModerate') : t('coach.emotionalOscillationLow');
                        const emotionalDiversity = numTypes >= 4 ? t('coach.emotionalDiversityHigh') : numTypes >= 2 ? t('coach.emotionalDiversityModerate') : t('coach.emotionalDiversityLow');

                        // Tipo emocional dominante
                        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
                        const dominantType = sortedTypes[0];

                        const EMOTION_TYPE_EN = {
                            ansiedade: 'anxiety', frustração: 'frustration', tristeza: 'sadness',
                            apatia: 'apathy', energia: 'energy', positivas: 'positive emotions'
                        };
                        const translateEmotionTypeName = (type) => i18n.language === 'en' ? (EMOTION_TYPE_EN[type] || type) : type;

                        return (
                            <p>
                                🧠 <strong className={('text-white')}>{t('coach.emotionalProfileLabel')}</strong>{' '}
                                {t('coach.emotionalProfileText', { level: emotionalDiversity, n: numTypes })}{' '}
                                {dominantType && <>{t('coach.emotionalProfileDominant', { type: translateEmotionTypeName(dominantType[0]), n: dominantType[1] })}{' '}</>}
                                {oscillationLevel === t('coach.emotionalOscillationHigh') ? t('coach.emotionalProfileOscillationHigh') : oscillationLevel === t('coach.emotionalOscillationModerate') ? t('coach.emotionalProfileOscillationMod') : t('coach.emotionalProfileOscillationLow')}
                            </p>
                        );
                    })()}

                    {/* Self-care Context */}
                    {(() => {
                        if (analysisWellbeing.length < 5) return null;

                        // ⚠️ ANTES: comparava a média dos dias com cada área com a média
                        // de TODOS os dias com consumo, sem teste, ordenava as áreas
                        // pela diferença e dizia "Forte associação" / "Correlação
                        // inesperada — explorar". Agora: por dia, dias com a área vs
                        // dias com registo de bem-estar sem ela, pela ordem fixa
                        // (água, comida, socialização), cada uma com o seu teste.
                        const areas = { water: new Set(), food: new Set(), social: new Set() };
                        const diasBemEstar = new Set();
                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (!wDate) return;
                            diasBemEstar.add(wDate);
                            if (w.water === true || (w.waterGlasses > 0)) areas.water.add(wDate);
                            if (w.food === true) areas.food.add(wDate);
                            if (w.social === true) areas.social.add(wDate);
                        });
                        const areaNames = { water: t('coach.selfCareContextWater'), food: t('coach.selfCareContextFood'), social: t('coach.selfCareContextSocial') };
                        const linhas = [];
                        let algumTestado = false;
                        ['water', 'food', 'social'].forEach(area => {
                            const com = [...areas[area]].map(d => consPorDia[d] || 0);
                            const sem = [...diasBemEstar].filter(d => !areas[area].has(d)).map(d => consPorDia[d] || 0);
                            if (com.length === 0) return;
                            if (com.length < MIN_PER_WINDOW || sem.length < MIN_PER_WINDOW) {
                                linhas.push(t('coach.selfCareFew', { area: areaNames[area], nA: com.length, nB: sem.length, min: MIN_PER_WINDOW, defaultValue: 'Dias com {{area}}: poucos para comparar ({{nA}} com e {{nB}} sem; são precisos {{min}} de cada).' }));
                                return;
                            }
                            const r = diffPermutation(sem, com);
                            algumTestado = true;
                            linhas.push(t('coach.selfCareCompare', { area: areaNames[area], a: media(com).toFixed(1), nA: com.length, b: media(sem).toFixed(1), nB: sem.length, verdict: verdict(r.p), defaultValue: 'Dias com {{area}}: {{a}} consumos/dia ({{nA}} dias); sem: {{b}} ({{nB}} dias) — {{verdict}}.' }));
                        });
                        if (linhas.length === 0) return null;

                        return (
                            <p>
                                💧 <strong className={('text-white')}>{t('coach.selfCareContextLabel')}</strong>{' '}
                                {linhas.join(' ')}
                                {algumTestado && <> <span className={('text-gray-400')}>{t('coach.selfCareContextNote')}</span></>}
                            </p>
                        );
                    })()}

                    {/* Notes / Sentiment Analysis */}
                    <p>
                        {allNotes.length > 0 ? (
                            <>
                                📝 <strong className={('text-white')}>{t('coach.notesLabel', { n: sentimentAnalysis.noteCount })}</strong>
                                {(() => {
                                    // Calcular sentimento com base na DISTRIBUIÇÃO em vez da média
                                    const dist = sentimentAnalysis.distribution;
                                    const total = sentimentAnalysis.noteCount;
                                    const positivePercent = Math.round(((dist.very_positive + dist.positive) / total) * 100);
                                    const negativePercent = Math.round(((dist.very_negative + dist.negative) / total) * 100);
                                    const neutralPercent = Math.round((dist.neutral / total) * 100);

                                    // Classificar com base na distribuição
                                    let realOverall = 'neutral';
                                    if (positivePercent >= 60) realOverall = 'positive';
                                    else if (positivePercent >= 40 && positivePercent > negativePercent) realOverall = 'positive';
                                    else if (negativePercent >= 60) realOverall = 'negative';
                                    else if (negativePercent >= 40 && negativePercent > positivePercent) realOverall = 'negative';

                                    // Correlação com consumo
                                    const consumptionsByDate = {};
                                    analysisConsumptions.forEach(c => {
                                        if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                                        consumptionsByDate[c.date]++;
                                    });

                                    const reflectionsByDate = {};
                                    allNotes.forEach(note => {
                                        const noteDate = note.date || (note.timestamp ? new Date(note.timestamp).toLocaleDateString('pt-PT') : null);
                                        if (noteDate) {
                                            if (!reflectionsByDate[noteDate]) reflectionsByDate[noteDate] = [];
                                            reflectionsByDate[noteDate].push(note);
                                        }
                                    });

                                    // Encontrar dias com muitas reflexões negativas vs consumo
                                    let highNegDays = 0, highNegHighCons = 0;
                                    Object.entries(reflectionsByDate).forEach(([date, notes]) => {
                                        const negCount = notes.filter(n => {
                                            const text = n.text || n.content || n.note || '';
                                            if (!text) return false;
                                            const sentiment = analyzeNote ? analyzeNote(text) : null;
                                            if (!sentiment) return false;
                                            return sentiment.overall === 'negative' || sentiment.overall === 'very_negative';
                                        }).length;
                                        if (negCount >= notes.length * 0.6 && notes.length >= 2) {
                                            highNegDays++;
                                            if (consumptionsByDate[date] && consumptionsByDate[date] > avgPerDay) {
                                                highNegHighCons++;
                                            }
                                        }
                                    });

                                    return (
                                        <>
                                            <br/>
                                            🔍 <strong className={('text-white')}>{t('coach.notesPatternsLabel')}</strong>
                                            {realOverall === 'positive' ? (
                                                <> {t('coach.notesPositiveTone', { positivePct: positivePercent, negativePct: negativePercent })}</>
                                            ) : realOverall === 'negative' ? (
                                                <> {t('coach.notesNegativeTone', { negativePct: negativePercent, positivePct: positivePercent })}</>
                                            ) : (
                                                <> {t('coach.notesBalancedTone', { positivePct: positivePercent, negativePct: negativePercent, neutralPct: neutralPercent })}</>
                                            )}
                                            {sentimentAnalysis.trend === 'improving' && <> <span className="text-gray-300">{t('coach.notesTrendImproving')}</span></>}
                                            {sentimentAnalysis.trend === 'worsening' && <> <span className="text-gray-300">{t('coach.notesTrendWorsening')}</span></>}
                                            {highNegDays > 0 && highNegHighCons / highNegDays > 0.6 && (
                                                <> <span className="text-gray-300">{t('coach.notesHighNegPattern', { n: highNegHighCons, total: highNegDays })}</span></>
                                            )}
                                        </>
                                    );
                                })()}
                                <br/>
                                💭 <strong className={('text-white')}>{t('coach.notesThemesLabel')}</strong>
                                {(() => {
                                    const topThemes = Object.entries(sentimentThemes)
                                        .filter(([_, data]) => data.count > 2)
                                        .sort((a, b) => b[1].count - a[1].count)
                                        .slice(0, 3);
                                    const themeNames = {
                                        sleep: t('coach.notesThemeSleep'),
                                        stress: t('coach.notesThemeStress'),
                                        energy: t('coach.notesThemeEnergy'),
                                        mood: t('coach.notesThemeMood'),
                                        focus: t('coach.notesThemeFocus'),
                                        social: t('coach.notesThemeSocial'),
                                        health: t('coach.notesThemeHealth')
                                    };
                                    if (topThemes.length > 0) {
                                        return (
                                            <>
                                                {topThemes.map(([theme, data], idx) => {
                                                    const avgSent = data.avgSentiment || 0;
                                                    // Sem verde/vermelho nem ✓/⚠: o tom das notas descreve-se, não se julga.
                                                    return (
                                                        <span key={theme}>
                                                            {idx > 0 && ', '}
                                                            <strong className="text-white">{themeNames[theme]}</strong> ({data.count}x)
                                                        </span>
                                                    );
                                                })}
                                                .
                                                {sentimentThemes.stress && sentimentThemes.stress.avgSentiment < -0.3 && <> {t('coach.notesStressNote')}</>}
                                                {sentimentThemes.sleep && sentimentThemes.sleep.avgSentiment < -0.3 && <> {t('coach.notesSleepNote')}</>}
                                            </>
                                        );
                                    }
                                    return <> {t('coach.notesNoThemes')}</>;
                                })()}
                            </>
                        ) : (
                            <> {t('coach.notesEncourage')} </>
                        )}
                    </p>
                </div>
            )}

            {/* ── SECÇÃO 6: ANÁLISE AVANÇADA ── */}
            {sectionBtn('avancado', '🔬', i18n.language === 'en' ? 'Advanced Analysis' : 'Análise Avançada')}
            {openSections.avancado && (
                <div className={'!border-t-0 px-4 pb-5 pt-1 space-y-4 leading-relaxed text-gray-200'}>
                    {/* Behavior Clusters */}
                    {(() => {
                        if (analysisConsumptions.length < 10 || analysisCycles.length < 5) return null;

                        // Agrupar dados por dia
                        const dailyData = {};
                        analysisConsumptions.forEach(c => {
                            if (!dailyData[c.date]) dailyData[c.date] = { consumos: 0, sono: null, humor: null };
                            dailyData[c.date].consumos++;
                        });

                        analysisCycles.forEach(cycle => {
                            const cDate = cycle.date || safeToISODate(cycle.timestamp);
                            if (dailyData[cDate] && temSono(cycle)) {
                                dailyData[cDate].sono = parseFloat(cycle.sleep);
                            }
                        });

                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (wDate && dailyData[wDate] && w.mood) {
                                dailyData[wDate].humor = parseInt(w.mood);
                            }
                        });

                        // Calcular percentis dos TEUS dados (não fixos!)
                        const consumoCounts = Object.values(dailyData).map(d => d.consumos).sort((a, b) => a - b);
                        const p25 = consumoCounts[Math.floor(consumoCounts.length * 0.25)]; // Bottom 25%
                        const p50 = consumoCounts[Math.floor(consumoCounts.length * 0.50)]; // Mediana
                        const p75 = consumoCounts[Math.floor(consumoCounts.length * 0.75)]; // Top 25%

                        // Definir clusters baseados nos TEUS padrões
                        const clusters = {
                            altaPressao: [], // Top 25% consumo + <6h sono + humor ≥5
                            paradoxo: [],    // Bottom 25% consumo + ≥7h sono + humor <5
                            equilibrio: []   // Consumo na mediana + humor ≥6
                        };

                        Object.entries(dailyData).forEach(([date, d]) => {
                            if (d.consumos >= p75 && d.sono !== null && d.sono < 6 && d.humor !== null && d.humor >= 5) {
                                clusters.altaPressao.push(date);
                            } else if (d.consumos <= p25 && d.sono !== null && d.sono >= 7 && d.humor !== null && d.humor < 5) {
                                clusters.paradoxo.push(date);
                            } else if (d.consumos >= p50 * 0.8 && d.consumos <= p50 * 1.2 && d.humor !== null && d.humor >= 6) {
                                clusters.equilibrio.push(date);
                            }
                        });

                        const hasAnyClusters = clusters.altaPressao.length > 0 || clusters.paradoxo.length > 0 || clusters.equilibrio.length > 0;
                        if (!hasAnyClusters) return null;

                        return (
                            <p>
                                🔬 <strong className={('text-white')}>{t('coach.clustersLabel')}</strong>
                                {/* Antes: "Estás a 'pedalar no limiar' — funcionas, mas à custa
                                    de estimulação" e "possível depressão mascarada" — leituras
                                    clínicas a partir de uma contagem de dias. Ficam só as
                                    contagens, e o aviso de que são só isso. */}
                                {clusters.altaPressao.length > 0 && (
                                    <> {t('coach.clustersHighPressure', { n: clusters.altaPressao.length })}</>
                                )}
                                {clusters.paradoxo.length > 0 && (
                                    <> {t('coach.clustersParadox', { n: clusters.paradoxo.length })}</>
                                )}
                                {clusters.equilibrio.length > 0 && (
                                    <> {t('coach.clustersBalance', { n: clusters.equilibrio.length })}</>
                                )}
                                {' '}<span className="text-gray-400">{t('coach.clustersNote', { n: Object.keys(dailyData).length, defaultValue: 'São só contagens (de {{n}} dias com consumo): não dizem se estas combinações aparecem mais do que o acaso daria.' })}</span>
                            </p>
                        );
                    })()}

                    {/* Consumption Impact */}
                    {(() => {
                        // Os consumos de um dia andam junto com o bem-estar do dia seguinte?
                        const dailyConsumptionData = {};

                        // Agrupar consumos por dia
                        analysisConsumptions.forEach(c => {
                            if (!dailyConsumptionData[c.date]) dailyConsumptionData[c.date] = { consumptions: 0, mood: null, energy: null };
                            dailyConsumptionData[c.date].consumptions++;
                        });

                        // Adicionar bem-estar
                        analysisWellbeing.forEach(w => {
                            const wDate = w.date || safeToISODate(w.timestamp);
                            if (!wDate) return;
                            if (!dailyConsumptionData[wDate]) dailyConsumptionData[wDate] = { consumptions: 0, mood: null, energy: null };
                            if (w.mood) dailyConsumptionData[wDate].mood = parseInt(w.mood);
                            if (w.energy) dailyConsumptionData[wDate].energy = parseInt(w.energy);
                        });

                        const sortedDates = Object.keys(dailyConsumptionData).sort();
                        const nextDayData = [];

                        // Correlacionar consumo de hoje com bem-estar de amanhã.
                        // "Amanhã" é o dia de calendário seguinte (D+1), não o
                        // próximo dia com registo: se D+1 não tem humor/energia
                        // (ou é "não registei"/atípico), este dia não entra.
                        for (let i = 0; i < sortedDates.length; i++) {
                            const today = dailyConsumptionData[sortedDates[i]];
                            const tomorrow = dailyConsumptionData[diaSeguinte(sortedDates[i])];
                            if (!tomorrow) continue;
                            // Dias sem consumo (mas com registo) contam como 0 — são
                            // reais: os "não registei" já vêm tirados.
                            if (tomorrow.mood !== null || tomorrow.energy !== null) {
                                nextDayData.push({
                                    consumptions: today.consumptions,
                                    mood: tomorrow.mood,
                                    energy: tomorrow.energy
                                });
                            }
                        }

                        // ⚠️ ANTES: Pearson com 2 dias, e frases como "O ciclo é evidente
                        // — consumir hoje = sentir-te pior amanhã", "mais consumo resulta
                        // em fadiga clara… O teu corpo está a pedir descanso" (causa,
                        // juízo e diagnóstico). Agora: duas séries diárias por ordem de
                        // data (consumos de um dia, humor/energia do dia seguinte),
                        // spearmanPermutation, pelo menos MIN_SPEARMAN dias, e só
                        // "andam juntos".
                        if (nextDayData.length === 0) return null;
                        let algumTestado = false;
                        const linha = (campo, what) => {
                            const v = nextDayData.filter(d => d[campo] !== null);
                            if (v.length === 0) return null;
                            if (v.length < MIN_SPEARMAN) {
                                return t('coach.nextDayFew', { what, n: v.length, min: MIN_SPEARMAN, defaultValue: '{{what}}: são precisos {{min}} pares de dias seguidos com os dois registados (há {{n}}).' });
                            }
                            const r = spearmanPermutation(v.map(d => d.consumptions), v.map(d => d[campo]));
                            if (r.rho == null) return null;
                            algumTestado = true;
                            const args = { what, n: r.n, rho: rhoTxt(r.rho), p: fmtP(r.p, r.m, r.b) };
                            if (isChance(r.p)) return t('coach.nextDayChance', { ...args, defaultValue: '{{what}}: em {{n}} pares de dias, não anda junto com os consumos da véspera de forma que se distinga do acaso (ρ = {{rho}}, {{p}}).' });
                            return t(r.rho < 0 ? 'coach.nextDayLower' : 'coach.nextDayHigher', { ...args, defaultValue: r.rho < 0
                                ? '{{what}}: em {{n}} pares de dias, depois de dias com mais consumos tendeu a ser mais baixo (ρ = {{rho}}, {{p}}).'
                                : '{{what}}: em {{n}} pares de dias, depois de dias com mais consumos tendeu a ser mais alto (ρ = {{rho}}, {{p}}).' });
                        };
                        const linhas = [linha('mood', t('coach.whatMood', 'Humor')), linha('energy', t('coach.whatEnergy', 'Energia'))].filter(Boolean);
                        if (linhas.length === 0) return null;

                        return (
                            <p>
                                🔍 <strong className={('text-white')}>{t('coach.consumptionImpactLabel')}</strong>{' '}
                                {linhas.join(' ')}
                                {algumTestado && <>{' '}<span className="text-gray-400">{t('coach.togetherNote', 'Andarem juntos não quer dizer que um cause o outro.')}</span></>}
                            </p>
                        );
                    })()}

                    {/* Energy */}
                    {(() => {
                        if (analysisConsumptions.length < 1) return null;

                        // Pegar os últimos 10 consumos (ou menos se não houver 10)
                        const sortedConsumptions = [...analysisConsumptions].sort((a, b) =>
                            new Date(b.timestamp) - new Date(a.timestamp)
                        );
                        const last10Consumptions = sortedConsumptions.slice(0, 10);

                        // Para cada consumo, encontrar o check-in de bem-estar mais próximo no mesmo dia
                        let countWithLowEnergy = 0;
                        let countWithData = 0;
                        const usados = new Set(); // check-ins que vieram antes destes consumos

                        last10Consumptions.forEach(cons => {
                            const consDate = cons.date;
                            const consTime = new Date(cons.timestamp);

                            // Encontrar check-ins de bem-estar do mesmo dia ANTES do consumo
                            const priorWellbeing = analysisWellbeing.filter(w => {
                                const wDate = w.date || safeToISODate(w.timestamp);
                                return wDate === consDate && w.energy != null && new Date(w.timestamp) <= consTime;
                            });

                            if (priorWellbeing.length === 0) return;

                            // Usar o check-in mais recente antes do consumo
                            const latestPrior = priorWellbeing.reduce((latest, current) =>
                                new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
                            );

                            countWithData++;
                            usados.add(latestPrior);
                            if (parseInt(latestPrior.energy) < 4) {
                                countWithLowEnergy++;
                            }
                        });

                        // Só mostrar se houver pelo menos 5 consumos com dados de energia
                        if (countWithData < 5) return null;

                        // ⚠️ ANTES: "Isto sugere uma forte correlação entre cansaço e
                        // consumo" / "o cansaço pode ser um gatilho" — sem olhar para
                        // quantas vezes a energia está baixa nos OUTROS check-ins (se
                        // está quase sempre baixa, 7 em 10 não diz nada). Agora
                        // compara-se com os outros check-ins, com teste (0/1 por
                        // check-in; repetidos contam uma vez).
                        const unicos = [...usados];
                        const antes = unicos.map(w => (parseInt(w.energy) < 4 ? 1 : 0));
                        const outros = analysisWellbeing
                            .filter(w => w.energy != null && !isNaN(parseInt(w.energy)) && !usados.has(w))
                            .map(w => (parseInt(w.energy) < 4 ? 1 : 0));
                        const label = (<>⚡ <strong className={('text-white')}>{t('coach.energyLabel')}</strong>{' '}</>);
                        if (antes.length < MIN_PER_WINDOW || outros.length < MIN_PER_WINDOW) {
                            return (
                                <p>
                                    {label}
                                    {t('coach.energyText', { total: countWithData, low: countWithLowEnergy })}{' '}
                                    <span className="text-gray-400">{t('coach.energyFew', { nA: antes.length, nB: outros.length, min: MIN_PER_WINDOW, defaultValue: 'Para comparar com os outros check-ins são precisos {{min}} de cada lado (há {{nA}} e {{nB}}).' })}</span>
                                </p>
                            );
                        }
                        const test = diffPermutation(outros, antes);
                        return (
                            <p>
                                {label}
                                {t('coach.energyText', { total: countWithData, low: countWithLowEnergy })}{' '}
                                {t('coach.energyCompare', { a: Math.round(media(antes) * 100), b: Math.round(media(outros) * 100), nB: outros.length, defaultValue: 'Nos check-ins logo antes de consumir, a energia estava baixa em {{a}}%; nos outros {{nB}} check-ins, em {{b}}%.' })}
                                {' '}<span className="text-gray-400">{t('coach.diffSentence', { verdict: verdict(test.p) })}</span>
                            </p>
                        );
                    })()}
                </div>
            )}

            {/* ── SECÇÃO 7: SÍNTESE ── */}
            {sectionBtn('sintese', '💭', i18n.language === 'en' ? 'Summary & Reflection' : 'Síntese e Conclusão')}
            {openSections.sintese && (
                <div className={'!border-t-0 px-4 pb-5 pt-1 space-y-4 leading-relaxed text-gray-200'}>
                    {/* Final Reflection */}
                    {(() => {
                        if (totalConsumptions === 0) return null;

                        // Calcular dados-chave
                        const consumptionsByDate = {};
                        analysisConsumptions.forEach(c => {
                            if (!consumptionsByDate[c.date]) consumptionsByDate[c.date] = 0;
                            consumptionsByDate[c.date]++;
                        });

                        const dailyCounts = Object.values(consumptionsByDate);

                        // ⚠️ ANTES: "dias mais leves/mais pesados" com outro limiar
                        // (alvo − 1) diferente do resto do separador; "esforço" e
                        // "limites" decididos por números inventados (média < 12,
                        // > 10); "Muitas vezes sinal de mais pressão à tua volta"; e
                        // uma lista do que "optimizar" escolhida pela app (sono 7-8h,
                        // evitar consumo nocturno, espaçar) sem a pessoa ter metas
                        // dessas. Agora: só a meta dela, com o mesmo corte da secção
                        // "Dias" (≤ alvo = dentro), e só as metas que ela definiu.
                        if (!frequencyGoal) return null;
                        const alvo = Math.max(1, Number(frequencyGoal.target));
                        if (!Number.isFinite(alvo)) return null;
                        const dentro = dailyCounts.filter(c => c <= alvo).length;
                        const acima = dailyCounts.length - dentro;

                        return (
                            <p className={('bg-gray-800/50 border-gray-700') + ' p-4 rounded-lg border'}>
                                💭 <strong className={('text-white')}>{t('coach.synthesisLabel')}</strong>{' '}
                                {t('coach.synthesisGoal', { target: alvo, dentro, acima, n: dailyCounts.length, defaultValue: 'Com a tua meta de até {{target}} consumos por dia: {{dentro}} dias dentro e {{acima}} acima, em {{n}} dias com consumo.' })}
                            </p>
                        );
                    })()}

                    {/* Self-knowledge */}
                    {(analysisWellbeing.length > 3 || analysisCycles.length > 2) && (
                        <p>
                            ✨ <strong className={('text-cyan-400')}>{t('coach.selfKnowledgeLabel')}</strong>{' '}{t('coach.selfKnowledgeText')}
                            {analysisWellbeing.length > 0 && <> {t('coach.selfKnowledgeWellbeing')}</>}
                            {analysisCycles.length > 0 && <>{analysisWellbeing.length > 0 && ','} {t('coach.selfKnowledgeSleepCycles')}</>}.
                            <span className={'font-medium ' + ('text-cyan-400')}> {t('coach.selfKnowledgeTip')}</span>
                        </p>
                    )}

                    {/* You Are in Control */}
                    <p className={'font-medium ' + ('text-white')}>
                        💪 <strong>{t('coach.controlLabel')}</strong> {t('coach.controlText')}
                        <span className={('text-white')}> {t('coach.controlTip')}</span>
                    </p>

                    {/* Closing */}
                    <p className={'font-medium pt-2 border-t ' + ('border-gray-700 text-white')}>
                        🤝 <strong>{t('coach.closingLabel')}</strong> {t('coach.closingText')}
                        <span> {t('coach.closingHarmReduction')}</span>
                        <br/><br/>
                        {t('coach.closingRemember')}
                        {' '}{t('coach.closingProud')}
                    </p>
                </div>
            )}
            </div>
        </div>
    );
});
