// Demo data — generated relative to today, DETERMINISTIC (no Math.random).
// Objetivo: dados ricos, coerentes e alinhados com redução de danos —
// nada de demonizar o consumo. Dias bons podem ter consumo alto e vice-versa.

function ts(daysAgo, hour = 12, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  if (d.getTime() > Date.now() - 60000) {
    return new Date(Date.now() - 60000).toISOString();
  }
  return d.toISOString();
}

function dk(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

let _n = 1;
const uid = () => `demo_${_n++}`;

// Pseudo-aleatório DETERMINÍSTICO (mesma seed → mesmo valor). Assim a demo é
// sempre igual entre recarregamentos, mas os dados parecem naturais/variados.
const rnd = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const pick = (arr, seed) => arr[Math.floor(rnd(seed) * arr.length)];

// ---------------------------------------------------------------------------
// CONSUMOS — padrão realista ao longo do dia, a reduzir suavemente com o tempo
// ---------------------------------------------------------------------------
// Os horários estão pensados para as METAS baterem certo com a lógica real da app:
//  - meta de intervalo (>2h): dias "bons" espaçam ~3h; dias pesados ~2h.
//  - meta de frequência (≤6): dias "bons" têm 5-6 usos; pesados 7-10.
// A meta foi criada há 30 dias, por isso só os dias 0–30 contam para as metas;
// os dias 31–45 mostram de ONDE se partiu nos gráficos de tendência.
// Cada elemento é [dia, hora, minuto].
const G6 = [[9, 0], [12, 0], [15, 0], [18, 0], [21, 0], [23, 0]];             // 6 usos, ~3h
const G5 = [[10, 0], [13, 0], [16, 0], [19, 0], [22, 0]];                     // 5 usos, ~3h
const M7 = [[10, 0], [12, 0], [14, 0], [16, 0], [18, 0], [20, 0], [22, 0]];   // 7 usos, ~2h
const M8 = [[9, 0], [11, 0], [13, 0], [15, 0], [17, 0], [19, 0], [21, 0], [23, 0]]; // 8 usos, ~2h
const E9 = [[9, 0], [10, 30], [12, 0], [13, 30], [15, 0], [16, 30], [18, 0], [20, 0], [22, 0]]; // 9, apertado
const H9 = [[9, 0], [10, 0], [12, 0], [13, 0], [15, 0], [16, 0], [18, 0], [20, 0], [22, 0]];     // 9
const H10 = [[9, 0], [10, 0], [11, 0], [13, 0], [14, 0], [15, 0], [17, 0], [19, 0], [21, 0], [23, 0]]; // 10

// Plano por dia. Recente (0–13): sobretudo dias bons, com alguns dias "off".
// Meio (14–27): planalto ~7-8/dia. 28–30: início da subida. 31–45: pré-meta, pesado.
const dayPlan = {
  0: G6, 1: G5, 2: G6, 3: G5, 4: M7, 5: G6, 6: G5, 7: G6, 8: M7, 9: G5, 10: G6, 11: G5, 12: G6, 13: M7,
  14: M8, 15: M7, 16: M8, 17: M7, 18: M8, 19: M7, 20: M8, 21: M7, 22: M8, 23: M7, 24: M8, 25: M7, 26: M8, 27: M7,
  28: E9, 29: H10, 30: E9,
  31: H9, 32: H10, 33: H9, 34: H9, 35: H10, 36: H9, 37: H10, 38: H9, 39: H10, 40: H9, 41: H10, 42: H9, 43: H10, 44: H9, 45: H10,
};

const schedule = [];
for (let d = 0; d <= 45; d++) {
  (dayPlan[d] || []).forEach(([h, m]) => schedule.push([d, h, m]));
}
// Duas madrugadas em que o consumo passou da meia-noite → a meta "não depois de
// 00:00" não fica nos 100% (mostra que a app deteta mesmo estas noites).
schedule.push([20, 0, 30]);
schedule.push([26, 0, 30]);

export const consumptions = schedule.map(([day, hour, min = 0]) => ({
  id: uid(), timestamp: ts(day, hour, min), date: dk(day), notes: '',
}));

// Nº de usos por dia — para o registo de mg diário bater certo com os pontos.
const dayCount = (d) => (dayPlan[d] || []).length;

// ---------------------------------------------------------------------------
// REGISTOS DE MG — total diário. IMPORTANTE: 'times' = nº EXATO de usos desse
// dia (senão o Histórico mostrava "6 usos" num dia com 7 pontos). A meta de
// quantidade compara o TOTAL do dia (mg) com o alvo (150) — não é por consumo.
// ---------------------------------------------------------------------------
const mgLogDays = [
  [0, 120, 'Calmer day, more space between sessions'],
  [2, 120, ''],
  [4, 145, ''],
  [6, 100, 'A lighter day'],
  [8, 140, ''],
  [10, 125, ''],
  [13, 145, ''],
  [15, 150, ''],
  [18, 160, ''],
  [21, 150, 'Social night — a bit more, and that\'s okay'],
  [24, 165, ''],
  [27, 155, ''],
  [29, 195, ''],
  [31, 185, ''],
  [34, 180, ''],
  [37, 200, 'Heavier stretch, work was intense'],
  [40, 185, ''],
  [43, 200, ''],
];
export const dailyLogs = mgLogDays.map(([day, mg, notes]) => ({
  id: uid(), date: dk(day), timestamp: ts(day, 22), times: dayCount(day), mg, notes,
}));

// ---------------------------------------------------------------------------
// CICLOS DE SONO — quase diários (deixa poucas lacunas), com sono e deitar
// DESLIGADOS do consumo (varia por si), e gatilhos variados/espalhados.
// ---------------------------------------------------------------------------
const cycleTriggers = [
  'Stress', 'Ansiedade', 'Trabalho', 'Solidão', 'Tédio', 'Cansaço',
  'Festa', 'Conflito', 'Insónia', 'Hábito', 'Celebração', 'Tristeza',
];
const cycleNotes = {
  2:  'Slept reasonably well',
  9:  'Late night, mind was busy',
  16: 'Friday out with people — worth it',
  30: 'Rough sleep, lots on my mind',
  44: 'Early start after a short night',
};

export const cycles = [];
for (let d = 1; d <= 45; d++) {
  // ~1 em 6 dias sem registo → lacunas realistas (não "39 dias sem dormir")
  if (rnd(d * 7.3 + 0.5) < 0.16) continue;
  // Sono 5.0–8.5h, variação própria (não segue o consumo)
  const sleep = Math.round((5.0 + rnd(d * 5.7) * 3.5) * 2) / 2;
  // Deitar entre 22:30 e 01:30
  const totalMin = 22 * 60 + 30 + Math.floor(rnd(d * 9.2) * 180);
  const bh = Math.floor(totalMin / 60) % 24;
  const bm = totalMin % 60;
  const bedtime = `${String(bh).padStart(2, '0')}:${String(bm).padStart(2, '0')}`;
  // Gatilhos em ~45% das noites, 1–2, variados
  const triggers = [];
  if (rnd(d * 2.9) < 0.45) {
    triggers.push(pick(cycleTriggers, d * 4.4));
    if (rnd(d * 6.6) < 0.35) {
      const t2 = pick(cycleTriggers, d * 8.1);
      if (t2 !== triggers[0]) triggers.push(t2);
    }
  }
  cycles.push({
    id: uid(), timestamp: ts(d, 8), date: dk(d),
    bedtime, sleep, triggers, notes: cycleNotes[d] || '',
  });
}

// ---------------------------------------------------------------------------
// BEM-ESTAR — muitos registos, com AS CHAVES CERTAS de emoção (senão dava 0%),
// emoções equilibradas (positivas E negativas), humor/energia DESLIGADOS do
// consumo, e alguns dias com 2–3 registos (variação intradiária que sobe/desce).
// ---------------------------------------------------------------------------
const posPool = [
  '😌 Calmo/a', '😊 Feliz', '💪 Motivado/a', '🙏 Grato/a', '🌟 Produtiva/o',
  '🧘 Em paz', '🌈 Otimista', '✨ Resiliente', '🤝 Apoiado/a', '⚡ Okay',
  '😊 Divertido/a', '🥰 Amado/a', '🎉 Entusiasmado/a', '🌱 Orgulhoso/a',
];
const negPool = [
  '😰 Ansioso/a', '😓 Stressado/a', '😫 Frustrado/a', '🥺 Solitário/a',
  '😴 Cansado/a', '😖 Culpado/a', '🔥 Com craving', '😤 Irritado/a',
  '😩 Overwhelmed', '😢 Triste', '🤗 Vulnerável',
];
const exercises = ['walk', 'gym', 'run', 'yoga', 'cycling', 'swim'];
const exDurations = [20, 25, 30, 40, 45, 60];
const symptomsPool = ['fatigue', 'insomnia', 'headache', 'tension', 'low appetite', 'dry mouth'];
const wbNotes = {
  1:  'Good day overall — got out for a walk and it helped clear my head.',
  5:  'A flatter day, but I ate properly and drank water.',
  8:  'First gym session in a while. Felt genuinely good afterwards.',
  17: 'Dinner with friends — really nice evening, laughed a lot.',
  23: 'Quiet day at home. I feel calmer when I keep a little busy.',
  33: 'Slept well last night and it showed today.',
  40: 'Heavier day. Was kind to myself and went to bed earlier.',
};
const hoursByCount = { 1: [20], 2: [10, 21], 3: [9, 15, 22] };

export const wellbeingLogs = [];
for (let d = 0; d <= 45; d++) {
  // Regista em ~72% dos dias (deixa lacunas, incluindo algumas recentes)
  if (rnd(d * 11.7 + 2) < 0.28) continue;
  const r = rnd(d * 4.9 + 1);
  const entries = r < 0.22 ? 3 : r < 0.5 ? 2 : 1; // alguns dias com vários registos
  const hrs = hoursByCount[entries];
  // "Tom" do dia — decidido por si, NÃO pelo consumo (dias de uso alto podem ser bons)
  const baseMood = 3 + Math.floor(rnd(d * 6.3 + 5) * 5); // 3..7
  const dayExercise = rnd(d * 13.1) < 0.42;

  for (let e = 0; e < entries; e++) {
    const seed = d * 100 + e + 1;
    // Variação intradiária: meio do dia tende a subir, extremos a descer
    const drift = entries === 1 ? 0 : (e === 0 ? -1 : e === entries - 1 ? -1 : +1);
    let mood = baseMood + drift + (rnd(seed * 1.7) < 0.5 ? 1 : 0) - (rnd(seed * 2.3) < 0.3 ? 1 : 0);
    mood = Math.min(9, Math.max(2, mood));
    let energy = Math.min(9, Math.max(2, mood + (rnd(seed * 3.9) < 0.5 ? -1 : 1)));

    // Emoções: seguem o humor mas mantêm mistura (nunca só negativas)
    const emotions = [];
    if (mood >= 6) {
      emotions.push(pick(posPool, seed * 5.1));
      if (rnd(seed * 7.7) < 0.4) emotions.push(pick(mood >= 7 ? posPool : negPool, seed * 8.3));
    } else if (mood <= 4) {
      emotions.push(pick(negPool, seed * 5.1));
      if (rnd(seed * 7.7) < 0.45) emotions.push(pick(posPool, seed * 8.3)); // dia difícil mas com algo bom
    } else {
      emotions.push(pick(rnd(seed * 9.0) < 0.5 ? posPool : negPool, seed * 5.1));
      if (rnd(seed * 6.1) < 0.3) emotions.push(pick(posPool, seed * 8.9));
    }
    const uniqEmotions = [...new Set(emotions)];

    const hasEx = dayExercise && e === 0;
    const symptoms = (e === entries - 1 && rnd(d * 17.3) < 0.30) ? [pick(symptomsPool, d * 19.1)] : [];

    wellbeingLogs.push({
      id: uid(),
      timestamp: ts(d, hrs[e], (seed % 5) * 7),
      date: dk(d),
      mood, energy,
      waterGlasses: 3 + Math.floor(rnd(seed * 21.3) * 6),
      exerciseType: hasEx ? pick(exercises, d * 23.7) : '',
      exerciseDuration: hasEx ? exDurations[Math.floor(rnd(d * 29.1) * exDurations.length)] : null,
      social: rnd(seed * 31.3) < 0.4,
      food: rnd(seed * 37.7) < 0.75,
      emotions: uniqEmotions,
      symptoms,
      notes: (e === entries - 1 && wbNotes[d]) ? wbNotes[d] : '',
    });
  }
}

// ---------------------------------------------------------------------------
// REFLEXÕES — tom observacional, sem culpa nem abstinência. Curiosidade, não juízo.
// ---------------------------------------------------------------------------
const reflectionsRaw = [
  [2,  'What made me want to use today?', 'A stressful meeting at work left me wired. Using in the evening was how I came down. Good to see the pattern clearly.'],
  [6,  'How do I feel after using?', 'Relaxed in the moment, then a bit flat later. Noting it so I can spot what actually helps me wind down.'],
  [12, 'What helped me today?', 'Went for a run before the evening. I still used, but a little less, and the day felt lighter.'],
  [19, 'What patterns have I noticed?', 'Evenings alone at home are when I reach for it most. Company or a plan seems to change that.'],
  [26, 'What am I curious about?', 'Whether starting later in the day shifts how the whole day goes. Going to keep an eye on it.'],
  [34, 'What would support look like this week?', 'Getting to bed before midnight and having something planned for the evenings.'],
  [41, 'What do I want to remember?', 'This is my own pace. The point is understanding myself, not being perfect.'],
];
export const reflections = reflectionsRaw.map(([d, question, answer]) => ({
  id: uid(), timestamp: ts(d, 22), date: dk(d), question, answer,
}));

// ---------------------------------------------------------------------------
// PENSAMENTOS — diário pessoal, mesmo tom
// ---------------------------------------------------------------------------
const thoughtsRaw = [
  [3,  'Noticed I reach for it most when I\'m anxious. It\'s become a way to step away from the feeling — interesting to see it laid out.'],
  [11, 'Waited an extra hour and a half before the second session today. Small thing, but it felt like mine.'],
  [19, 'Lighter week. Less stress, fewer sessions. The link is pretty clear when I look at it.'],
  [27, 'Some days are heavier, some are lighter. Seeing them side by side helps me not judge the heavy ones so hard.'],
  [35, 'Being kinder to myself actually seems to help more than being strict. Who knew.'],
  [44, 'Starting to see my own rhythm in the data. That feels useful, not scary.'],
];
export const thoughts = thoughtsRaw.map(([d, content]) => ({
  id: uid(), timestamp: ts(d, 21), date: dk(d), content,
}));

// ---------------------------------------------------------------------------
// METAS — uma de CADA tipo possível, para mostrar a funcionalidade toda
// ---------------------------------------------------------------------------
export const goals = [
  { id: uid(), type: 'reduce_quantity',   target: 150,     createdAt: ts(30, 10), completed: false }, // mg por consumo
  { id: uid(), type: 'reduce_frequency',  target: 6,       createdAt: ts(30, 10), completed: false }, // consumos/dia
  { id: uid(), type: 'increase_interval', target: 2,       createdAt: ts(30, 10), completed: false }, // horas entre consumos
  { id: uid(), type: 'first_not_before',  target: 2,       createdAt: ts(30, 10), completed: false }, // horas após acordar
  { id: uid(), type: 'limit_last',        target: '00:00', createdAt: ts(30, 10), completed: false }, // não consumir depois de
  { id: uid(), type: 'bedtime_before',    target: '23:30', createdAt: ts(30, 10), completed: false }, // deitar antes de
  { id: uid(), type: 'sleep_hours',       target: 7,       createdAt: ts(30, 10), completed: false }, // horas de sono
];

export function getAllDemoData() {
  return {
    consumptions: [...consumptions],
    dailyLogs:    [...dailyLogs],
    cycles:       [...cycles],
    wellbeingLogs:[...wellbeingLogs],
    reflections:  [...reflections],
    thoughts:     [...thoughts],
    goals:        [...goals],
    healthLogs:   [],
  };
}
