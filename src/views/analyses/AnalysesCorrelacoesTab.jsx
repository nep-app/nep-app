import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MIN_CORRELATION_N } from '../../services/analyticsService';
import { getEmotionCategory } from '../../constants/emotions';
import { safeToISODate } from '../../utils/helpers';
import { spearmanPermutation } from '../../utils/stats';
import { useCrossMountMemo } from '../../hooks/useCrossMountMemo';

// ===== CORRELAÇÕES: UMA PERGUNTA DE CADA VEZ =====
//
// ⚠️ PORQUÊ UMA DE CADA VEZ (PLANO-ESTATISTICA.md, passo 2).
// Este ecrã mostrava ~31 correlações abertas ao mesmo tempo. Com tantas, ao
// nível habitual de 5% esperam-se 1 a 2 "fortes" SÓ POR ACASO, mesmo sem
// relação nenhuma nos dados — e são essas que saltam à vista. Pôr um p em cada
// uma não resolve: carimba os falsos achados. Agora a pessoa escolhe UMA
// pergunta e vê a resposta dessa. Não há 31 comparações à vista; há uma, que
// ela escolheu antes de ver o resultado. (A lista de perguntas não mostra
// nenhum número nem pista do resultado — só "faltam dias", que depende de n,
// não de r.)
//
// ⛔ ORDEM FIXA (linha vermelha do CLAUDE.md). A lista PERGUNTAS abaixo é
// mostrada exatamente por esta ordem. NUNCA ordenar por |ρ|, nem saltar para a
// "mais forte", nem abrir por defeito a que deu p mais baixo: isso voltava a
// embutir o problema das comparações múltiplas na interface.
//
// ⚠️ O P (passo 4). Cada pergunta é uma série de DIAS (um par de valores por
// dia). Usa-se spearmanPermutation de utils/stats.js — a mesma conta dos
// "Sinais de hoje" (Padrões): ρ de Spearman + p por deslocamento circular,
// p = (b+1)/(m+1), nunca zero ("menos de 1 em m"). Com p ≥ 0,05 (ou n abaixo
// do mínimo) a resposta é "não se distingue do acaso", a cinzento.
//
// ⚠️ PERFORMANCE. Os pares de todas as perguntas montam-se uma vez (baratos).
// O teste (os deslizes) só corre para a pergunta aberta (useMemo), não para
// as ~28 — corre no telemóvel.

// ⚠️ ZERO NÃO É VAZIO. "Não dormi" é sleep: 0 e humor/energia 0 também são
// respostas. Só falta o valor quando não existe (null/undefined) ou vem vazio.
const temValor = (v) => v != null && v !== '' && !isNaN(parseFloat(v));

// Chave local 'YYYY-MM-DD' do dia a seguir (ou `n` dias depois). Ao meio-dia
// para não tropeçar na mudança de hora; safeToISODate devolve o dia LOCAL
// (nunca toISOString). Assim "o dia seguinte" é o dia de CALENDÁRIO seguinte —
// se não houver registos nesse dia, não há par (antes usava-se a próxima data
// com dados, e um buraco de uma semana passava por "amanhã").
const diaMais = (key, n) => {
    if (!key) return null;
    if (!n) return key;
    const d = new Date(key + 'T12:00:00');
    if (isNaN(d)) return null;
    d.setDate(d.getDate() + n);
    return safeToISODate(d);
};

// Hora "HH:MM" → minutos, com a madrugada (00:00–17:59) contada a seguir à
// meia-noite (24:00–41:59): deitar à 01:00 é MAIS TARDE do que às 23:00.
const horaDeitarEmMinutos = (s) => {
    if (typeof s !== 'string') return null;
    const [h, m] = s.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m + (h >= 0 && h < 18 ? 1440 : 0);
};

// Grupos, pela ordem em que aparecem na lista.
const GRUPOS = [
    { id: 'sono', label: 'Sono e consumos' },
    { id: 'humor', label: 'Humor e energia' },
    { id: 'bem', label: 'Sono e bem-estar' },
    { id: 'emocoes', label: 'Emoções e autocuidado' },
    { id: 'mg', label: 'Quantidade (mg)' },
    { id: 'dia', label: 'Ritmo dos consumos' },
];

// As variáveis por dia (para as médias que aparecem por baixo da resposta).
// fmt: 'h1' horas com 1 casa, 'n1' número com 1 casa, 'n0' inteiro,
// 'hhmm' minutos → HH:MM, 'hdec' horas decimais → HH:MM.
const VARS = {
    sleep: { label: 'sono', unit: ' h', fmt: 'n1' },
    cons: { label: 'consumos', unit: '/dia', fmt: 'n1' },
    mood: { label: 'humor', unit: '/10', fmt: 'n1' },
    energy: { label: 'energia', unit: '/10', fmt: 'n1' },
    bedtime: { label: 'hora de deitar', unit: '', fmt: 'hhmm' },
    mg: { label: 'mg', unit: '/dia', fmt: 'n0' },
    negPct: { label: 'emoções negativas', unit: '%', fmt: 'n0' },
    selfCare: { label: 'autocuidado', unit: '/4', fmt: 'n1' },
    triggers: { label: 'gatilhos', unit: '/dia', fmt: 'n1' },
    interval: { label: 'tempo entre consumos', unit: ' h', fmt: 'n1' },
    firstHour: { label: '1.º consumo', unit: '', fmt: 'hdec' },
    consManha: { label: 'consumos de manhã', unit: '/dia', fmt: 'n1' },
    consTarde: { label: 'consumos à tarde', unit: '/dia', fmt: 'n1' },
    consNoite: { label: 'consumos à noite', unit: '/dia', fmt: 'n1' },
};

// ===== AS PERGUNTAS (ORDEM FIXA — ver o aviso lá em cima) =====
// x e y: [variável, desfasamento em dias]. O par do dia D junta x de D com y
// de D + desfasamento (dia de CALENDÁRIO). O ciclo do dia D é o dia em que se
// ACORDA: o sono/hora de deitar guardados em D são a noite de D-1 para D. Por
// isso "sono → consumos nesse dia" é [sleep,0]→[cons,0], e "consumos → sono
// nessa noite" é [cons,0]→[sleep,1].
// pos/neg: a frase quando ρ > 0 / ρ < 0 — só DESCRIÇÃO ("nos dias com…,
// houve…"), nunca causa ("faz", "aumenta", "por causa de"), nunca juízo.
//
// Saíram em relação à versão antiga:
// - "Consumo → Sono Amanhã": depois das correções de datas era a MESMA conta
//   que "Consumo → Sono" (consumo de D com a noite D→D+1). Duplicado.
// - "Sono → Humor amanhã": juntava o sono da noite D-1→D com o humor de D+1
//   (dois dias depois) — o mesmo engano de datas já corrigido no resto; certo,
//   ficava igual a "Sono → humor nesse dia". Duplicado.
// - "Emoções Negativas → Dosagem": a mesma conta que "Dosagem → Emoções
//   Negativas" com os eixos trocados (o mesmo dia; ρ é simétrico). Duplicado.
// - "Eficácia de Estratégias": comparava "4/4 áreas de autocuidado" com "0/4",
//   mas lia `food`/`social` com parseInt(true) = NaN, por isso o 4/4 nunca
//   acontecia; e chamava "redução" à diferença (juízo de direção). A pergunta
//   "Consumos → autocuidado" cobre a mesma relação, com teste.
// - "Intervalos «Seguros»": a palavra "seguros" julga; fica a pergunta
//   "Tempo entre consumos → total do dia", com teste.
// - Gatilhos compostos, antecedentes, satisfação e tendência semanal de mg:
//   eram calculados mas nunca mostrados. Saíram (contas a mais no telemóvel).
const PERGUNTAS = [
    { id: 'sleepToCons', g: 'sono', x: ['sleep', 0], y: ['cons', 0],
        label: 'Horas de sono → consumos no dia a seguir',
        pos: 'Depois de noites com mais horas de sono, houve mais consumos nesse dia.',
        neg: 'Depois de noites com mais horas de sono, houve menos consumos nesse dia.' },
    { id: 'consToSleep', g: 'sono', x: ['cons', 0], y: ['sleep', 1],
        label: 'Consumos de um dia → horas de sono nessa noite',
        pos: 'Nos dias com mais consumos, a noite a seguir teve mais horas de sono.',
        neg: 'Nos dias com mais consumos, a noite a seguir teve menos horas de sono.' },
    { id: 'bedtimeToCons', g: 'sono', x: ['bedtime', 0], y: ['cons', 0],
        label: 'Hora de deitar → consumos no dia a seguir',
        pos: 'Depois de noites em que te deitaste mais tarde, houve mais consumos nesse dia.',
        neg: 'Depois de noites em que te deitaste mais tarde, houve menos consumos nesse dia.' },
    { id: 'consToBedtime', g: 'sono', x: ['cons', 0], y: ['bedtime', 1],
        label: 'Consumos de um dia → hora de deitar nessa noite',
        pos: 'Nos dias com mais consumos, deitaste-te mais tarde nessa noite.',
        neg: 'Nos dias com mais consumos, deitaste-te mais cedo nessa noite.' },

    { id: 'consMood', g: 'humor', x: ['cons', 0], y: ['mood', 0],
        label: 'Consumos → humor no mesmo dia',
        pos: 'Nos dias com mais consumos, o humor registado foi mais alto.',
        neg: 'Nos dias com mais consumos, o humor registado foi mais baixo.' },
    { id: 'consEnergy', g: 'humor', x: ['cons', 0], y: ['energy', 0],
        label: 'Consumos → energia no mesmo dia',
        pos: 'Nos dias com mais consumos, a energia registada foi mais alta.',
        neg: 'Nos dias com mais consumos, a energia registada foi mais baixa.' },
    { id: 'moodToNextCons', g: 'humor', x: ['mood', 0], y: ['cons', 1],
        label: 'Humor de um dia → consumos no dia seguinte',
        pos: 'Depois de dias com humor mais alto, houve mais consumos no dia seguinte.',
        neg: 'Depois de dias com humor mais alto, houve menos consumos no dia seguinte.' },
    { id: 'energyToNextCons', g: 'humor', x: ['energy', 0], y: ['cons', 1],
        label: 'Energia de um dia → consumos no dia seguinte',
        pos: 'Depois de dias com energia mais alta, houve mais consumos no dia seguinte.',
        neg: 'Depois de dias com energia mais alta, houve menos consumos no dia seguinte.' },
    { id: 'consToNextMood', g: 'humor', x: ['cons', 0], y: ['mood', 1],
        label: 'Consumos de um dia → humor no dia seguinte',
        pos: 'Nos dias com mais consumos, o humor do dia seguinte foi mais alto.',
        neg: 'Nos dias com mais consumos, o humor do dia seguinte foi mais baixo.' },
    { id: 'consToNextEnergy', g: 'humor', x: ['cons', 0], y: ['energy', 1],
        label: 'Consumos de um dia → energia no dia seguinte',
        pos: 'Nos dias com mais consumos, a energia do dia seguinte foi mais alta.',
        neg: 'Nos dias com mais consumos, a energia do dia seguinte foi mais baixa.' },

    { id: 'sleepMood', g: 'bem', x: ['sleep', 0], y: ['mood', 0],
        label: 'Horas de sono → humor nesse dia',
        pos: 'Depois de noites com mais horas de sono, o humor desse dia foi mais alto.',
        neg: 'Depois de noites com mais horas de sono, o humor desse dia foi mais baixo.' },
    { id: 'bedtimeMood', g: 'bem', x: ['bedtime', 0], y: ['mood', 0],
        label: 'Hora de deitar → humor no dia a seguir',
        pos: 'Depois de noites em que te deitaste mais tarde, o humor desse dia foi mais alto.',
        neg: 'Depois de noites em que te deitaste mais tarde, o humor desse dia foi mais baixo.' },
    { id: 'bedtimeEnergy', g: 'bem', x: ['bedtime', 0], y: ['energy', 0],
        label: 'Hora de deitar → energia no dia a seguir',
        pos: 'Depois de noites em que te deitaste mais tarde, a energia desse dia foi mais alta.',
        neg: 'Depois de noites em que te deitaste mais tarde, a energia desse dia foi mais baixa.' },

    { id: 'consNegEmotions', g: 'emocoes', x: ['cons', 0], y: ['negPct', 0],
        label: 'Consumos → emoções negativas no mesmo dia',
        pos: 'Nos dias com mais consumos, uma parte maior das emoções registadas foi negativa.',
        neg: 'Nos dias com mais consumos, uma parte menor das emoções registadas foi negativa.' },
    { id: 'consSelfCare', g: 'emocoes', x: ['cons', 0], y: ['selfCare', 0],
        label: 'Consumos → autocuidado no mesmo dia',
        pos: 'Nos dias com mais consumos, registaste mais áreas de autocuidado.',
        neg: 'Nos dias com mais consumos, registaste menos áreas de autocuidado.' },

    { id: 'mgSleep', g: 'mg', x: ['mg', 0], y: ['sleep', 1],
        label: 'mg de um dia → horas de sono nessa noite',
        pos: 'Nos dias com mais mg, a noite a seguir teve mais horas de sono.',
        neg: 'Nos dias com mais mg, a noite a seguir teve menos horas de sono.' },
    { id: 'mgMood', g: 'mg', x: ['mg', 0], y: ['mood', 0],
        label: 'mg → humor no mesmo dia',
        pos: 'Nos dias com mais mg, o humor registado foi mais alto.',
        neg: 'Nos dias com mais mg, o humor registado foi mais baixo.' },
    { id: 'mgEnergy', g: 'mg', x: ['mg', 0], y: ['energy', 0],
        label: 'mg → energia no mesmo dia',
        pos: 'Nos dias com mais mg, a energia registada foi mais alta.',
        neg: 'Nos dias com mais mg, a energia registada foi mais baixa.' },
    { id: 'mgNegEmotions', g: 'mg', x: ['mg', 0], y: ['negPct', 0],
        label: 'mg → emoções negativas no mesmo dia',
        pos: 'Nos dias com mais mg, uma parte maior das emoções registadas foi negativa.',
        neg: 'Nos dias com mais mg, uma parte menor das emoções registadas foi negativa.' },
    { id: 'mgSelfCare', g: 'mg', x: ['mg', 0], y: ['selfCare', 0],
        label: 'mg → autocuidado no mesmo dia',
        pos: 'Nos dias com mais mg, registaste mais áreas de autocuidado.',
        neg: 'Nos dias com mais mg, registaste menos áreas de autocuidado.' },
    { id: 'triggersMg', g: 'mg', x: ['triggers', 0], y: ['mg', 0],
        label: 'Gatilhos registados → mg nesse dia',
        pos: 'Nos dias com mais gatilhos registados, houve mais mg.',
        neg: 'Nos dias com mais gatilhos registados, houve menos mg.' },
    { id: 'intervalMg', g: 'mg', x: ['interval', 0], y: ['mg', 0],
        label: 'Tempo entre consumos → mg nesse dia',
        pos: 'Nos dias com mais tempo entre consumos, houve mais mg.',
        neg: 'Nos dias com mais tempo entre consumos, houve menos mg.' },

    { id: 'consAutocorr', g: 'dia', x: ['cons', 0], y: ['cons', 1],
        label: 'Consumos de um dia → consumos no dia seguinte',
        pos: 'Depois de dias com mais consumos, o dia seguinte também teve mais.',
        neg: 'Depois de dias com mais consumos, o dia seguinte teve menos.' },
    { id: 'firstConsTotal', g: 'dia', x: ['firstHour', 0], y: ['cons', 0],
        label: 'Hora do primeiro consumo → total do dia',
        pos: 'Nos dias em que o primeiro consumo foi mais tarde, houve mais consumos no total.',
        neg: 'Nos dias em que o primeiro consumo foi mais tarde, houve menos consumos no total.' },
    { id: 'intervalTotal', g: 'dia', x: ['interval', 0], y: ['cons', 0],
        label: 'Tempo entre consumos → total do dia',
        pos: 'Nos dias com mais tempo entre consumos, houve mais consumos no total.',
        neg: 'Nos dias com mais tempo entre consumos, houve menos consumos no total.',
        nota: 'Em parte isto é aritmética: com mais consumos no mesmo dia, sobra menos tempo entre eles.' },
    { id: 'morningMood', g: 'dia', x: ['consManha', 0], y: ['mood', 0],
        label: 'Consumos de manhã (6h–12h) → humor desse dia',
        pos: 'Nos dias com mais consumos de manhã, o humor registado foi mais alto.',
        neg: 'Nos dias com mais consumos de manhã, o humor registado foi mais baixo.' },
    { id: 'afternoonMood', g: 'dia', x: ['consTarde', 0], y: ['mood', 0],
        label: 'Consumos à tarde (12h–18h) → humor desse dia',
        pos: 'Nos dias com mais consumos à tarde, o humor registado foi mais alto.',
        neg: 'Nos dias com mais consumos à tarde, o humor registado foi mais baixo.' },
    { id: 'eveningMood', g: 'dia', x: ['consNoite', 0], y: ['mood', 0],
        label: 'Consumos à noite (18h–24h) → humor desse dia',
        pos: 'Nos dias com mais consumos à noite, o humor registado foi mais alto.',
        neg: 'Nos dias com mais consumos à noite, o humor registado foi mais baixo.' },
    // Não é uma relação entre duas coisas: é só uma descrição (sem teste).
    { id: 'dispersion', g: 'dia', tipo: 'desc',
        label: 'Quão espalhados estão os consumos ao longo do dia' },
];

// Mínimo de consumos para a descrição da dispersão de horas.
const MIN_DISPERSAO = 5;
// Limiar do "distingue-se do acaso". Só serve para escolher a FRASE: o p
// aparece sempre ao lado, para a pessoa ver que 0,049 e 0,051 são quase iguais.
const P_LIMIAR = 0.05;

const LS_KEY = 'nep_corr_pergunta';
const lerPerguntaGuardada = () => {
    try {
        const v = sessionStorage.getItem(LS_KEY);
        return PERGUNTAS.some(q => q.id === v) ? v : PERGUNTAS[0].id;
    } catch { return PERGUNTAS[0].id; }
};

export const AnalysesCorrelacoesTab = React.memo(function AnalysesCorrelacoesTab({
    analysisConsumptions,
    analysisWellbeing,
    analysisCycles,
    analysisDailyLogs,
    analysisMgDays = [],
}) {
    const { t, i18n } = useTranslation();
    const en = i18n.language === 'en';
    const [perguntaId, setPerguntaIdRaw] = useState(lerPerguntaGuardada);
    const setPerguntaId = (id) => {
        setPerguntaIdRaw(id);
        try { sessionStorage.setItem(LS_KEY, id); } catch { /* sem armazenamento: não faz mal */ }
    };

    // Assinatura barata dos dados: muda quando há mais/menos registos, quando
    // muda o período (primeiro/último registo) ou o idioma.
    const pontas = (arr) => arr.length ? `${arr[0]?.timestamp || arr[0]?.date}~${arr[arr.length - 1]?.timestamp || arr[arr.length - 1]?.date}` : '';
    const _sig = `${analysisConsumptions.length}|${analysisWellbeing.length}|${analysisCycles.length}|${analysisDailyLogs.length}|${analysisMgDays.length}|${analysisMgDays.reduce((a, d) => a + d.mg, 0)}|${pontas(analysisConsumptions)}|${pontas(analysisWellbeing)}|${pontas(analysisCycles)}`;

    // ===== DADOS POR DIA + PARES DE CADA PERGUNTA (baratos; sem testes) =====
    const dados = useCrossMountMemo('analises-correlacoes-v2', _sig, () => {
        if (analysisConsumptions.length < 1) return null;

        // Um registo por dia de CALENDÁRIO com tudo o que as perguntas usam.
        // Um dia entra aqui se tiver algum registo (consumo, ciclo ou bem-estar).
        // Nesses dias, 0 consumos é um 0 verdadeiro: os dias "não registei os
        // consumos" e os atípicos já saíram em AnalysesView. (Antes, várias
        // perguntas "→ consumo" deitavam fora os dias sem consumos — isso
        // mudava a pergunta para "nos dias em que houve consumo…".)
        const dias = {};
        const dia = (d) => dias[d] || (dias[d] = {
            cons: 0, sleep: null, mood: null, energy: null, bedtime: null, mg: null,
            negPct: null, selfCare: null, triggers: null, interval: null, firstHour: null,
            consManha: 0, consTarde: 0, consNoite: 0,
        });

        // Consumos: contagem por dia e por período do dia.
        const consPorDia = {};
        analysisConsumptions.forEach(c => {
            const d = c.date || safeToISODate(c.timestamp);
            if (!d) return;
            const x = dia(d);
            x.cons++;
            const h = new Date(c.timestamp).getHours();
            if (h >= 6 && h < 12) x.consManha++;
            else if (h >= 12 && h < 18) x.consTarde++;
            else if (h >= 18) x.consNoite++;
            (consPorDia[d] || (consPorDia[d] = [])).push(c);
        });

        // Ciclos: o 1.º de cada dia (o dia em que se ACORDA).
        const cicloPorDia = {};
        analysisCycles.forEach(c => {
            const d = c.date || safeToISODate(c.timestamp);
            if (d && !(d in cicloPorDia)) cicloPorDia[d] = c;
        });

        // Sestas somam ao sono da noite.
        const sestaMin = {};
        analysisWellbeing.forEach(w => {
            const d = w.date || safeToISODate(w.timestamp);
            if (d) sestaMin[d] = (sestaMin[d] || 0) + (w.napDuration || 0);
        });

        Object.entries(cicloPorDia).forEach(([d, c]) => {
            const x = dia(d);
            // `sleep: 0` = "não dormi" e conta; sem o campo = não se sabe.
            if (temValor(c.sleep)) x.sleep = parseFloat(c.sleep) + (sestaMin[d] || 0) / 60;
            const bt = horaDeitarEmMinutos(c.bedtime);
            if (bt != null) x.bedtime = bt;
            if (Array.isArray(c.triggers)) x.triggers = (x.triggers || 0) + c.triggers.length;
        });

        // Bem-estar: humor, energia, emoções, autocuidado (+ sono antigo).
        const emo = {};
        const auto = {};
        analysisWellbeing.forEach(w => {
            const d = w.date || safeToISODate(w.timestamp);
            if (!d) return;
            const x = dia(d);
            if (x.sleep === null && temValor(w.sleep)) x.sleep = parseFloat(w.sleep);
            if (temValor(w.mood)) x.mood = parseInt(w.mood);
            if (temValor(w.energy)) x.energy = parseInt(w.energy);
            if (Array.isArray(w.emotions) && w.emotions.length) {
                const e = emo[d] || (emo[d] = { neg: 0, total: 0 });
                w.emotions.forEach(em => { e.total++; if (getEmotionCategory(em) === 'negative') e.neg++; });
            }
            // Autocuidado: quantas das 4 áreas houve NESSE DIA (0–4), contando
            // cada área uma vez mesmo com vários registos no dia. (Antes somava
            // por registo e podia passar de 4.)
            const s = auto[d] || (auto[d] = new Set());
            if (w.water === true || w.waterGlasses > 0) s.add('water');
            ['food', 'rest', 'social'].forEach(a => { if (w[a] === true) s.add(a); });
            if (Array.isArray(w.triggers)) x.triggers = (x.triggers || 0) + w.triggers.length;
        });
        Object.entries(emo).forEach(([d, e]) => { if (e.total > 0) dias[d].negPct = e.neg / e.total * 100; });
        Object.entries(auto).forEach(([d, s]) => { dias[d].selfCare = s.size; });

        // mg: só dias com medição real (fonte unificada). NUNCA inventar mg.
        analysisMgDays.forEach(item => {
            const d = item.date || safeToISODate(item.timestamp);
            const mg = typeof item.mg === 'number' ? item.mg : parseFloat(item.mg);
            if (!d || !Number.isFinite(mg) || mg <= 0 || !dias[d]) return;
            dias[d].mg = (dias[d].mg || 0) + mg;
        });

        // Tempo médio entre consumos (dias com 2+) e hora do 1.º consumo
        // (o 1.º depois do "Novo ciclo" desse dia; sem ciclo, o 1.º do dia).
        Object.entries(consPorDia).forEach(([d, lista]) => {
            const ord = lista.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            if (ord.length >= 2) {
                let soma = 0;
                for (let i = 1; i < ord.length; i++) soma += (new Date(ord[i].timestamp) - new Date(ord[i - 1].timestamp)) / 3600000;
                dias[d].interval = soma / (ord.length - 1);
            }
            const ciclo = cicloPorDia[d];
            const tCiclo = ciclo ? new Date(ciclo.timestamp).getTime() : NaN;
            const primeiro = (Number.isFinite(tCiclo) && ord.find(c => new Date(c.timestamp).getTime() >= tCiclo)) || ord[0];
            const tp = new Date(primeiro.timestamp);
            if (!isNaN(tp)) dias[d].firstHour = tp.getHours() + tp.getMinutes() / 60;
        });

        const datas = Object.keys(dias).sort();

        // Pares de cada pergunta, POR ORDEM DE DATA (o deslocamento circular
        // precisa disto: desliza a fila dos dias). Só entram dias com os dois
        // valores. Buracos (dias sem um dos valores) ficam de fora e a fila
        // "encosta": vizinhos na fila podem estar a dias de distância no
        // calendário. O teste continua válido — desliza a fila inteira, por isso
        // continua a manter juntas as semanas pesadas que existem — mas, com
        // muitos buracos, a semelhança entre vizinhos é mais fraca do que nos
        // dias seguidos, e o p fica, quando muito, um pouco cauteloso de mais
        // (diz "não sei" mais vezes), nunca confiante de mais por causa disto.
        const pares = {};
        PERGUNTAS.forEach(q => {
            if (q.tipo === 'desc') return;
            const [kx, lx] = q.x, [ky, ly] = q.y;
            const xs = [], ys = [];
            datas.forEach(d => {
                const vx = dias[diaMais(d, lx)]?.[kx];
                const vy = dias[diaMais(d, ly)]?.[ky];
                if (vx == null || vy == null || !Number.isFinite(vx) || !Number.isFinite(vy)) return;
                xs.push(vx); ys.push(vy);
            });
            pares[q.id] = { xs, ys };
        });

        // Dispersão das horas de consumo (descrição, sem teste).
        const horas = analysisConsumptions
            .map(c => { const d = new Date(c.timestamp); return isNaN(d) ? null : d.getHours() + d.getMinutes() / 60; })
            .filter(h => h != null);
        let dispersao = { n: horas.length, sd: null };
        if (horas.length >= MIN_DISPERSAO) {
            const m = horas.reduce((s, h) => s + h, 0) / horas.length;
            dispersao.sd = Math.sqrt(horas.reduce((s, h) => s + (h - m) ** 2, 0) / horas.length);
        }

        const temBemEstar = datas.some(d => dias[d].sleep !== null || dias[d].mood !== null || dias[d].energy !== null);
        return { pares, dispersao, temBemEstar };
    });

    const pergunta = PERGUNTAS.find(q => q.id === perguntaId) || PERGUNTAS[0];

    // ===== O TESTE — só para a pergunta aberta =====
    const resultado = useMemo(() => {
        if (!dados || pergunta.tipo === 'desc') return null;
        const { xs, ys } = dados.pares[pergunta.id] || { xs: [], ys: [] };
        const n = xs.length;
        const media = (v) => v.length ? v.reduce((s, a) => s + a, 0) / v.length : null;
        const base = { n, mx: media(xs), my: media(ys) };
        // Ramo do "não sei" n.º 1: poucos dias → nenhum número de relação.
        if (n < MIN_CORRELATION_N) return { ...base, estado: 'poucos' };
        const teste = spearmanPermutation(xs, ys);
        // Ramo n.º 2: uma das coisas nunca variou → não há ligação para medir.
        if (teste.rho == null || !Number.isFinite(teste.rho)) return { ...base, estado: 'plano' };
        // Ramo n.º 3: o acaso dá isto com facilidade → "não se distingue".
        const estado = teste.p < P_LIMIAR ? 'sinal' : 'acaso';
        return { ...base, ...teste, estado };
    }, [dados, pergunta]);

    // ===== Formatação =====
    const loc = en ? 'en-GB' : 'pt-PT';
    const num = (v, d) => Number(v).toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/^-/, '−');
    const fmtVar = (key, v) => {
        if (v == null || !Number.isFinite(v)) return '—';
        const f = VARS[key].fmt;
        if (f === 'hhmm' || f === 'hdec') {
            const mins = Math.round(f === 'hhmm' ? v : v * 60) % 1440;
            return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
        }
        return num(v, f === 'n0' ? 0 : 1) + t(`correlations.v.${key}.unit`, VARS[key].unit);
    };
    const fmtP = (r) => r.b === 0
        ? t('correlations.pLessThan', { defaultValue: 'p: menos de 1 em {{m}}', m: r.m })
        : 'p = ' + num(r.p, r.p < 0.01 ? 3 : 2);
    const tq = (q, campo) => t(`correlations.q.${q.id}.${campo}`, q[campo]);

    const caixaVazia = (msg) => (
        <div className="bg-gray-800 border-gray-700 rounded-xl p-8 border text-center">
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-xl font-bold mb-2 text-white">{t('correlations.titleCard')}</h3>
            <p className="text-sm text-gray-400">{msg}</p>
        </div>
    );
    if (!dados) return caixaVazia(t('correlations.noConsumptions'));
    if (!dados.temBemEstar) return caixaVazia(t('correlations.noWellbeingData'));

    const idx = PERGUNTAS.findIndex(q => q.id === pergunta.id);
    const nDe = (q) => q.tipo === 'desc' ? dados.dispersao.n : (dados.pares[q.id]?.xs.length || 0);
    const minDe = (q) => q.tipo === 'desc' ? MIN_DISPERSAO : MIN_CORRELATION_N;

    // ===== A resposta da pergunta aberta =====
    const renderResposta = () => {
        if (pergunta.tipo === 'desc') {
            const { n, sd } = dados.dispersao;
            if (sd == null) return (
                <p className="text-sm text-gray-400">
                    {t('correlations.fewUses', { defaultValue: 'Ainda não há consumos suficientes — há {{n}}, faltam {{falta}}.', n, falta: MIN_DISPERSAO - n })}
                </p>
            );
            return (
                <div className="space-y-2">
                    <p className="text-sm text-gray-200">
                        {t('correlations.dispersionText', { defaultValue: 'Em média, cada consumo ficou a {{h}} h da hora média dos teus consumos.', h: num(sd, 1) })}
                    </p>
                    <p className="text-xs text-gray-400">
                        {t('correlations.dispersionHelp', 'Número pequeno: os consumos juntam-se a horas parecidas. Número grande: espalham-se pelo dia. É só uma descrição — não compara nada com nada.')}
                    </p>
                    <p className="text-xs text-gray-500"><span className="font-mono-theme">{n}</span> {t('correlations.usesAnalysed', 'consumos')}</p>
                </div>
            );
        }

        const r = resultado;
        const [kx] = pergunta.x, [ky] = pergunta.y;
        const medias = r.n > 0 && (
            <p className="text-xs text-gray-500">
                {r.n === 1 ? t('correlations.avgInOneDay', 'Valores desse dia:') : t('correlations.avgInDays', { defaultValue: 'Médias nestes {{n}} dias:', n: r.n })}{' '}
                {t(`correlations.v.${kx}.label`, VARS[kx].label)} <span className="font-mono-theme">{fmtVar(kx, r.mx)}</span>
                {ky !== kx && <> · {t(`correlations.v.${ky}.label`, VARS[ky].label)} <span className="font-mono-theme">{fmtVar(ky, r.my)}</span></>}
            </p>
        );

        if (r.estado === 'poucos') return (
            <div className="space-y-2">
                <p className="text-sm text-gray-400">
                    {t('correlations.fewDays', { defaultValue: 'Ainda não há dias suficientes — há {{n}}, faltam {{falta}}.', n: r.n, falta: MIN_CORRELATION_N - r.n })}
                </p>
                <p className="text-xs text-gray-500">
                    {t('correlations.fewDaysHelp', { defaultValue: 'Contam os dias com os dois valores registados. A partir de {{min}}, a app vê se andam juntos.', min: MIN_CORRELATION_N })}
                </p>
                {medias}
            </div>
        );

        if (r.estado === 'plano') return (
            <div className="space-y-2">
                <p className="text-sm text-gray-400">
                    {t('correlations.flat', 'Um dos dois valores foi sempre igual nestes dias — assim não dá para ver se andam juntos.')}
                </p>
                <p className="text-xs text-gray-500"><span className="font-mono-theme">n = {r.n}</span> {t('correlations.days')}</p>
                {medias}
            </div>
        );

        const sinal = r.estado === 'sinal';
        return (
            <div className="space-y-2">
                {sinal ? (
                    <p className="text-base text-white leading-snug">{tq(pergunta, r.rho > 0 ? 'pos' : 'neg')}</p>
                ) : (
                    <p className="text-base text-gray-400 leading-snug">
                        {t('correlations.chance', 'Não se distingue do acaso.')}
                    </p>
                )}
                {!sinal && (
                    <p className="text-xs text-gray-500">
                        {t('correlations.chanceHelp', 'Nestes dias, as duas coisas não andaram juntas mais do que o acaso costuma dar. Pode não haver ligação, ou ainda não haver dias para a ver.')}
                    </p>
                )}
                <p className={'text-xs ' + (sinal ? 'text-gray-300' : 'text-gray-500')}>
                    <span className="font-mono-theme">n = {r.n}</span> {t('correlations.days')} · <span className="font-mono-theme">ρ = {num(r.rho, 2)}</span> · {r.b === 0 ? fmtP(r) : <span className="font-mono-theme">{fmtP(r)}</span>}
                </p>
                <p className="text-xs text-gray-500">
                    {r.b === 0
                        ? t('correlations.shiftExplainNone', { defaultValue: 'Deslizámos os teus dias uns contra os outros {{m}} vezes. Em nenhuma delas o acaso deu uma ligação tão forte como esta.', m: r.m })
                        : t('correlations.shiftExplain', { defaultValue: 'Deslizámos os teus dias uns contra os outros {{m}} vezes. Em {{b}} delas, o acaso deu uma ligação tão forte como esta.', m: r.m, b: r.b })}
                </p>
                {pergunta.nota && <p className="text-xs text-gray-500">{tq(pergunta, 'nota')}</p>}
                {sinal && (
                    <p className="text-xs text-gray-500">
                        {t('correlations.notCause', 'Andarem juntas não quer dizer que uma cause a outra — e não diz qual dos lados é melhor.')}
                    </p>
                )}
                {medias}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Como ler. Sem verde/vermelho: as setas mostram se duas coisas
                andam juntas, não qual dos lados é o bom. */}
            <div className="bg-blue-900/20 border-blue-700/50 rounded-lg p-4 border">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-300">
                    {t('correlations.title')}
                </h3>
                <div className="text-sm space-y-1 text-gray-400">
                    <p>{t('correlations.introOne', 'Escolhe uma pergunta de cada vez. A app olha para os teus dias e diz se as duas coisas andaram juntas — ou se isso não se distingue do acaso.')}</p>
                    <p><span className="text-gray-300">{t('correlations.whyOne', '☝️ Uma de cada vez:')}</span> {t('correlations.whyOneText', 'com muitas perguntas abertas ao mesmo tempo, algumas pareceriam fortes só por acaso. E mesmo uma a uma: se fores ver muitas, espera que mais ou menos 1 em cada 20 pareça real só por acaso.')}</p>
                    <p><span className="text-gray-300">{t('correlations.attention')}</span> {t('correlations.minDaysText', { min: MIN_CORRELATION_N, defaultValue: 'cada pergunta precisa de {{min}} dias com os dois valores. Antes disso, a app diz quantos faltam.' })}</p>
                    <p className="text-xs italic pt-1">{t('correlations.note')}</p>
                </div>
            </div>

            {/* A pergunta (lista por ORDEM FIXA) e a resposta dela. */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-4 border space-y-4">
                <div>
                    <label htmlFor="corr-pergunta" className="block text-xs text-gray-400 mb-1">
                        {t('correlations.pickQuestion', 'Pergunta')} <span className="font-mono-theme">{idx + 1}/{PERGUNTAS.length}</span>
                    </label>
                    <div className="flex items-stretch gap-2">
                        <button
                            type="button"
                            aria-label={t('correlations.prevQuestion', 'Pergunta anterior')}
                            onClick={() => setPerguntaId(PERGUNTAS[(idx - 1 + PERGUNTAS.length) % PERGUNTAS.length].id)}
                            className="px-3 rounded-lg bg-gray-900 border border-gray-600 text-gray-300 hover:bg-gray-700"
                        >‹</button>
                        <select
                            id="corr-pergunta"
                            value={pergunta.id}
                            onChange={e => setPerguntaId(e.target.value)}
                            className="flex-1 min-w-0 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            {GRUPOS.map(g => (
                                <optgroup key={g.id} label={t(`correlations.g.${g.id}`, g.label)}>
                                    {PERGUNTAS.filter(q => q.g === g.id).map(q => (
                                        <option key={q.id} value={q.id}>
                                            {tq(q, 'label')}{nDe(q) < minDe(q) ? ' · ' + t('correlations.fewDaysShort', 'faltam dias') : ''}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <button
                            type="button"
                            aria-label={t('correlations.nextQuestion', 'Pergunta seguinte')}
                            onClick={() => setPerguntaId(PERGUNTAS[(idx + 1) % PERGUNTAS.length].id)}
                            className="px-3 rounded-lg bg-gray-900 border border-gray-600 text-gray-300 hover:bg-gray-700"
                        >›</button>
                    </div>
                </div>

                <div className="border-t border-gray-700 pt-4 space-y-3">
                    <h3 className="font-semibold text-white">{tq(pergunta, 'label')}</h3>
                    {renderResposta()}
                </div>
            </div>
        </div>
    );
});
