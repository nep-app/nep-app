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
