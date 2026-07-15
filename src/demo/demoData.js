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
const p6  = [10, 12, 14, 16, 18, 21];
const p7  = [9, 11, 13, 15, 17, 19, 22];
const p7b = [10, 12, 13, 15, 17, 20, 22];
const p8  = [9, 11, 12, 14, 16, 18, 20, 23];
const p8b = [9, 10, 12, 14, 15, 17, 20, 22];
const p9  = [9, 10, 12, 13, 15, 16, 18, 20, 22];
const p10 = [9, 10, 11, 13, 14, 15, 17, 19, 21, 23];

const schedule = [
  // Recente: 6-7/dia
  ...p7.map(h  => [0,  h]),
  ...p6.map(h  => [1,  h]),
  ...p7.map(h  => [2,  h]),
  ...p6.map(h  => [3,  h]),
  ...p7b.map(h => [4,  h]),
  ...p6.map(h  => [5,  h]),
  ...p7.map(h  => [6,  h]),
  ...p7b.map(h => [7,  h]),
  ...p6.map(h  => [8,  h]),
  ...p7.map(h  => [9,  h]),
  ...p6.map(h  => [10, h]),
  ...p7.map(h  => [11, h]),
  ...p6.map(h  => [12, h]),
  ...p7b.map(h => [13, h]),
  // Planalto: 8/dia
  ...p8.map(h  => [14, h]),
  ...p8b.map(h => [15, h]),
  ...p8.map(h  => [16, h]),
  ...p7b.map(h => [17, h]),
  ...p8b.map(h => [18, h]),
  ...p8.map(h  => [19, h]),
  ...p8b.map(h => [20, h]),
  ...p8.map(h  => [21, h]),
  ...p7b.map(h => [22, h]),
  ...p8.map(h  => [23, h]),
  ...p8b.map(h => [24, h]),
  ...p8.map(h  => [25, h]),
  ...p8b.map(h => [26, h]),
  ...p8.map(h  => [27, h]),
  // Onde começou: 9-10/dia
  ...p9.map(h  => [28, h]),
  ...p10.map(h => [29, h]),
  ...p9.map(h  => [30, h]),
  ...p10.map(h => [31, h]),
  ...p9.map(h  => [32, h]),
  ...p10.map(h => [33, h]),
  ...p9.map(h  => [34, h]),
  ...p10.map(h => [35, h]),
  ...p9.map(h  => [36, h]),
  ...p10.map(h => [37, h]),
  ...p9.map(h  => [38, h]),
  ...p10.map(h => [39, h]),
  ...p9.map(h  => [40, h]),
  ...p10.map(h => [41, h]),
  ...p9.map(h  => [42, h]),
  ...p10.map(h => [43, h]),
  ...p9.map(h  => [44, h]),
  ...p10.map(h => [45, h]),
];

export const consumptions = schedule.map(([day, hour]) => ({
  id: uid(), timestamp: ts(day, hour), date: dk(day), notes: '',
}));

// ---------------------------------------------------------------------------
// REGISTOS DE MG — snapshots do total diário (mg = média por consumo × usos)
// ---------------------------------------------------------------------------
export const dailyLogs = [
  { id: uid(), date: dk(0),  timestamp: ts(0, 23),  times: 7,  mg: 140, notes: 'Calmer day, managed to wait longer between sessions' },
  { id: uid(), date: dk(2),  timestamp: ts(2, 22),  times: 7,  mg: 145, notes: '' },
  { id: uid(), date: dk(4),  timestamp: ts(4, 22),  times: 6,  mg: 120, notes: '' },
  { id: uid(), date: dk(7),  timestamp: ts(7, 22),  times: 7,  mg: 140, notes: 'Anxious evening, noticed the craving and rode it out a bit' },
  { id: uid(), date: dk(9),  timestamp: ts(9, 23),  times: 7,  mg: 135, notes: '' },
  { id: uid(), date: dk(11), timestamp: ts(11, 23), times: 6,  mg: 130, notes: '' },
  { id: uid(), date: dk(13), timestamp: ts(13, 22), times: 7,  mg: 145, notes: '' },
  { id: uid(), date: dk(14), timestamp: ts(14, 22), times: 8,  mg: 160, notes: 'Busier week, a bit higher' },
  { id: uid(), date: dk(16), timestamp: ts(16, 23), times: 8,  mg: 155, notes: '' },
  { id: uid(), date: dk(18), timestamp: ts(18, 23), times: 8,  mg: 155, notes: '' },
  { id: uid(), date: dk(21), timestamp: ts(21, 22), times: 8,  mg: 160, notes: 'Social night, more than I planned — and that\'s okay' },
  { id: uid(), date: dk(24), timestamp: ts(24, 23), times: 8,  mg: 165, notes: '' },
  { id: uid(), date: dk(27), timestamp: ts(27, 23), times: 8,  mg: 160, notes: '' },
  { id: uid(), date: dk(28), timestamp: ts(28, 22), times: 9,  mg: 185, notes: 'Heavier stretch, work was intense' },
  { id: uid(), date: dk(31), timestamp: ts(31, 23), times: 10, mg: 195, notes: '' },
  { id: uid(), date: dk(34), timestamp: ts(34, 22), times: 9,  mg: 180, notes: '' },
  { id: uid(), date: dk(37), timestamp: ts(37, 23), times: 10, mg: 195, notes: '' },
  { id: uid(), date: dk(40), timestamp: ts(40, 23), times: 10, mg: 200, notes: 'Tough period, leaning on it more' },
  { id: uid(), date: dk(43), timestamp: ts(43, 22), times: 9,  mg: 185, notes: '' },
];

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
