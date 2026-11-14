// ===== ESTATÍSTICA PARTILHADA =====
// Contas pequenas, sem bibliotecas, para correrem no telemóvel. Servem para a
// app poder dizer "não se distingue do acaso" (CLAUDE.md, "não sei") com o
// MESMO método em todo o lado: Padrões ("Sinais de hoje"), Análises
// (Correlações, Impacto).
//
// Regras:
// - p = (b+1)/(m+1), nunca zero ("menos de 1 em m").
// - Séries de DIAS (um valor por dia) parecem-se de um dia para o outro:
//   testam-se por deslocamento circular (spearmanPermutation), não por
//   baralhar ao calhas, que faria o acaso parecer mais fraco do que é.
// - Grupos de registos soltos (ex.: humor antes vs depois): diffPermutation.

// Contas pequenas, sem bibliotecas, para correrem no telemóvel. Servem para
// a app VERIFICAR nos registos da própria pessoa se a soma de sinais do cartão
// "Sinais de hoje" anda mesmo junto com o número de consumos do dia — e, se
// não andar, dizer "não se distingue do acaso" (ver CLAUDE.md, "não sei").

// Ordens com empates: cada valor recebe a sua posição na fila (1 = o mais
// baixo); valores iguais recebem a MÉDIA das posições que ocupariam.
// Ex.: [5, 1, 5] → [2.5, 1, 2.5].
export function averageRanks(values) {
    const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
    const ranks = new Array(values.length);
    let i = 0;
    while (i < order.length) {
        let j = i;
        while (j + 1 < order.length && values[order[j + 1]] === values[order[i]]) j++;
        const r = (i + j) / 2 + 1;
        for (let k = i; k <= j; k++) ranks[order[k]] = r;
        i = j + 1;
    }
    return ranks;
}

// Correlação de Spearman (ρ) entre xs e ys + p por "deslocamento".
// ρ é a correlação das ORDENS: só pergunta "quando um sobe, o outro tende a
// subir?", sem supor linhas retas.
// O p: dias seguidos parecem-se uns com os outros (uma semana pesada dá
// vários dias pesados). Baralhar os dias ao calhas desfaz isso e faz o acaso
// parecer mais fraco do que é — a app diria "há relação" vezes demais. Por
// isso, em vez de baralhar, desliza-se a fila dos ys inteira (como uma
// roda: o que sai de um lado entra do outro), e também a fila virada ao
// contrário. As semanas pesadas continuam juntas, só deixam de coincidir
// com os dias certos. Contam-se todos os deslizes (k) e em quantos (b) o
// acaso dá um |ρ| tão forte como o verdadeiro: p = (b+1)/(k+1), nunca
// zero — com b = 0 diz-se "menos de 1 em k". Deslizes de menos de
// MIN_SHIFT dias ficam de fora (seriam quase a fila verdadeira).
// Sem sorteio: os mesmos registos dão sempre o mesmo p.
// Se uma das séries for sempre igual, não há ordem para comparar → rho null.
export const MIN_SHIFT = 7;
export function spearmanPermutation(xs, ys) {
    const n = xs.length;
    if (n < 2 * MIN_SHIFT + 1 || ys.length !== n) return { n, rho: null, b: null, m: 0, p: null };
    const rx = averageRanks(xs), ry = averageRanks(ys);
    const mid = (n + 1) / 2; // a média das ordens é sempre (n+1)/2, mesmo com empates
    const ax = rx.map(r => r - mid), by = ry.map(r => r - mid);
    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += ax[i] * ax[i]; syy += by[i] * by[i]; sxy += ax[i] * by[i]; }
    if (sxx === 0 || syy === 0) return { n, rho: null, b: null, m: 0, p: null };
    const den = Math.sqrt(sxx * syy);
    const rho = sxy / den;
    // Deslizar só muda a ordem dos ys: sxx e syy ficam iguais, por isso cada
    // deslize só precisa de refazer o produto cruzado.
    const limit = Math.abs(rho) - 1e-12; // folga para arredondamentos: um empate conta
    const rev = by.slice().reverse();
    let b = 0, m = 0;
    const test = (arr, k) => {
        let s = 0;
        for (let i = 0; i < n; i++) s += ax[i] * arr[(i + k) % n];
        m++;
        if (Math.abs(s / den) >= limit) b++;
    };
    for (let k = MIN_SHIFT; k <= n - MIN_SHIFT; k++) test(by, k);
    for (let k = 0; k < n; k++) test(rev, k);
    return { n, rho, b, m, p: (b + 1) / (m + 1) };
}

// Diferença de médias entre dois grupos de registos + p por permutação:
// misturam-se os registos dos dois grupos, reparte-se ao calhas m vezes e
// conta-se em quantas (b) o acaso dá uma diferença tão grande como a
// verdadeira. p = (b+1)/(m+1), nunca zero. Semente fixa: os mesmos registos
// dão sempre o mesmo p. (Aproximado: registos do mesmo dia parecem-se entre
// si, por isso isto é um "sinal", não uma prova.)
export const MIN_PER_WINDOW = 5;
export function diffPermutation(a, b, m = 2000) {
    const na = a.length, nb = b.length;
    const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
    const diff = mean(b) - mean(a);
    const all = a.concat(b), total = all.reduce((s, x) => s + x, 0), n = all.length;
    let seed = 20261109 >>> 0;
    const rand = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const sh = all.slice();
    const limit = Math.abs(diff) - 1e-9;
    let hits = 0;
    for (let k = 0; k < m; k++) {
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = sh[i]; sh[i] = sh[j]; sh[j] = t; }
        let sa = 0;
        for (let i = 0; i < na; i++) sa += sh[i];
        const d = (total - sa) / nb - sa / na;
        if (Math.abs(d) >= limit) hits++;
    }
    return { diff, p: (hits + 1) / (m + 1) };
}

// Vários grupos (ex.: dias da semana): a diferença entre a média mais alta e a
// mais baixa, com p por permutação ("há sempre um dia mais alto, mesmo por acaso").
export function rangePermutation(groups, m = 2000) {
    const sizes = groups.map(g => g.length);
    const all = groups.flat();
    const stat = (arr) => {
        let off = 0, hi = -Infinity, lo = Infinity;
        for (const n of sizes) {
            let sum = 0;
            for (let i = 0; i < n; i++) sum += arr[off + i];
            off += n;
            const mu = sum / n;
            if (mu > hi) hi = mu;
            if (mu < lo) lo = mu;
        }
        return hi - lo;
    };
    const obs = stat(all);
    let seed = 20261110 >>> 0;
    const rand = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const sh = all.slice();
    const limit = obs - 1e-9;
    let b = 0;
    for (let k = 0; k < m; k++) {
        for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const tmp = sh[i]; sh[i] = sh[j]; sh[j] = tmp; }
        if (stat(sh) >= limit) b++;
    }
    return { range: obs, b, m, p: (b + 1) / (m + 1) };
}

// ===== SINAIS QUE SE APRENDEM COM OS DIAS DA PESSOA ("Sinais de hoje") =====
// Os pesos dos sinais não vêm de fábrica: aprendem-se com os registos dela.
// Regra de ouro: nunca se verifica nos mesmos dias com que se aprendeu (seria
// o aluno a corrigir o próprio teste). Por isso usa-se "walk-forward": para
// cada dia de teste D, os pesos aprendem-se SÓ com os dias anteriores a D, e
// só depois se compara o que a soma dizia com o que aconteceu em D.
//
// O método é de propósito simples, para aguentar poucos dias e se explicar em
// português:
// - cada sinal passa a "posição na fila" dos dias de treino (0 = o valor mais
//   baixo visto, 1 = o mais alto; a meio dos empates), menos 0,5 — assim um
//   sinal em horas e outro em percentagem pesam na mesma escala, e um dia
//   estranho não puxa tudo;
// - o peso de cada sinal é a correlação de Spearman entre esse sinal e o
//   número de consumos, nos dias de treino, encolhida para 0 quando há poucos
//   dias: peso = ρ × n / (n + WF_SHRINK). Com 20 dias, metade; com 180, ~90%;
// - sinal em falta num dia = 0 (nem puxa para cima nem para baixo);
// - score do dia = soma dos pesos × posições.

// ρ de Spearman simples (sem p). null se faltar variação ou houver < 3 pares.
export function spearmanRho(xs, ys) {
    const n = xs.length;
    if (n < 3 || ys.length !== n) return null;
    const rx = averageRanks(xs), ry = averageRanks(ys);
    const mid = (n + 1) / 2;
    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
        const a = rx[i] - mid, b = ry[i] - mid;
        sxx += a * a; syy += b * b; sxy += a * b;
    }
    if (sxx === 0 || syy === 0) return null;
    return sxy / Math.sqrt(sxx * syy);
}

// Posição de v numa lista JÁ ORDENADA (crescente): fração dos valores abaixo
// de v + metade dos iguais. 0..1. Lista vazia → 0,5 (o meio: não se sabe).
export function midRankPosition(sorted, v) {
    const n = sorted.length;
    if (!n) return 0.5;
    let lo = 0, hi = n;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
    const below = lo;
    hi = n;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= v) lo = m + 1; else hi = m; }
    return (below + (lo - below) / 2) / n;
}

export const WF_MIN_TRAIN = 30;   // dias de treino antes de haver modelo
export const WF_MIN_TEST = 20;    // dias de teste, no mínimo (ou o último terço, se for mais)
export const WF_SHRINK = 20;      // encolhimento dos pesos para 0 com poucos dias
export const WF_MIN_FEATURE = 10; // um sinal só ganha peso com pelo menos 10 dias com valor
export const WF_REFIT_EVERY = 7;  // reaprende a cada 7 dias de teste (sempre só com dias anteriores)
export const WF_MAX_REFITS = 12;  // com muitos dias, reaprende no máximo ~12 vezes (para correr leve no telemóvel)

// Aprende os pesos com os dias de treino. rows: [{ x: [sinal1, ..., null], y }].
// Devolve { weights, sorted, nF } — sorted[f] = valores do sinal f nos dias de
// treino, por ordem (servem para pôr qualquer dia novo na fila).
export function fitSignalWeights(rows, nFeatures) {
    const weights = new Array(nFeatures).fill(0);
    const sorted = new Array(nFeatures);
    const nF = new Array(nFeatures).fill(0);
    for (let f = 0; f < nFeatures; f++) {
        const xs = [], ys = [];
        for (const r of rows) { const v = r.x[f]; if (v != null && Number.isFinite(v)) { xs.push(v); ys.push(r.y); } }
        nF[f] = xs.length;
        sorted[f] = xs.slice().sort((a, b) => a - b);
        if (xs.length < WF_MIN_FEATURE) continue;
        const rho = spearmanRho(xs, ys);
        if (rho == null) continue;
        weights[f] = rho * xs.length / (xs.length + WF_SHRINK);
    }
    return { weights, sorted, nF };
}

// Score de um dia com um modelo aprendido: soma de peso × (posição − 0,5).
export function scoreSignals(model, x) {
    let s = 0;
    for (let f = 0; f < model.weights.length; f++) {
        const w = model.weights[f], v = x[f];
        if (!w || v == null || !Number.isFinite(v)) continue;
        s += w * (midRankPosition(model.sorted[f], v) - 0.5);
    }
    return s;
}

// Aprende com rows (dias de treino) e devolve uma função que diz onde um dia
// novo fica entre esses dias (0..1): "posição do score". É esta posição — e não
// o score cru — que se compara entre modelos diferentes (os pesos mudam à
// medida que há mais dias, a fila não).
export function trainSignalModel(rows, nFeatures) {
    const model = fitSignalWeights(rows, nFeatures);
    const trainScores = rows.map(r => scoreSignals(model, r.x)).sort((a, b) => a - b);
    const allZero = model.weights.every(w => w === 0);
    return { ...model, allZero, position: (x) => midRankPosition(trainScores, scoreSignals(model, x)) };
}

// Walk-forward completo. rows: dias elegíveis por ordem de data (o mais antigo
// primeiro), cada um { key, x, y }. Os dias de teste são os mais recentes (o
// último terço, no mínimo WF_MIN_TEST); antes deles têm de existir pelo menos
// WF_MIN_TRAIN dias de treino. Cada dia de teste é posto na fila por um modelo
// que só viu dias anteriores a ele.
// Devolve:
//   { status: 'few', n, need }                     — poucos dias
//   { status: 'flat', ..., reason }                — nada para comparar
//   { status: 'tested', n, nTrain, nTest, trainUntil, testFrom, testTo,
//     rho, b, m, p, testPos, testY, testKeys, final }
// final = modelo aprendido com TODOS os dias (para hoje).
export function walkForwardSignals(rows, nFeatures, { minTrain = WF_MIN_TRAIN, minTest = WF_MIN_TEST, refitEvery = null } = {}) {
    const n = rows.length;
    const nTest = Math.max(minTest, Math.floor(n / 3));
    const need = minTrain + minTest;
    if (n - nTest < minTrain) return { status: 'few', n, need };
    // Reaprender mais espaçado só muda QUANTOS dias anteriores cada modelo viu,
    // nunca deixa um modelo ver o dia que vai testar.
    if (refitEvery == null) refitEvery = Math.max(WF_REFIT_EVERY, Math.ceil(nTest / WF_MAX_REFITS));
    const start = n - nTest;
    const testPos = [], testY = [], testKeys = [];
    let anyModel = false;
    for (let i = start; i < n; i += refitEvery) {
        const m = trainSignalModel(rows.slice(0, i), nFeatures);
        if (!m.allZero) anyModel = true;
        for (let j = i; j < Math.min(n, i + refitEvery); j++) {
            testPos.push(m.position(rows[j].x));
            testY.push(rows[j].y);
            testKeys.push(rows[j].key);
        }
    }
    const base = {
        n, nTrain: start, nTest, trainUntil: rows[start - 1].key, testFrom: rows[start].key, testTo: rows[n - 1].key,
        testPos, testY, testKeys,
    };
    const final = trainSignalModel(rows, nFeatures);
    if (!anyModel) return { status: 'flat', reason: 'noWeights', ...base, final };
    const test = spearmanPermutation(testPos, testY);
    if (test.rho == null) return { status: 'flat', reason: 'noVariation', ...base, final };
    return { status: 'tested', ...base, ...test, final };
}
