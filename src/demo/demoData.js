// Demo data — generated relative to today, deterministic

function ts(daysAgo, hour = 12, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

function dk(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

let _n = 1;
const uid = () => `demo_${_n++}`;

// Consumption schedule: gradual reduction over 60 days
// [daysAgo, hour]
const schedule = [
  // Last week: 1-2/day
  [0, 10], [0, 21],
  [1, 9],  [1, 20],
  [2, 11], [2, 19],
  [3, 10],
  [4, 9],  [4, 22],
  [5, 10], [5, 18],
  [6, 11],
  // Week 2: 2/day
  [7, 10], [7, 20],
  [8, 9],  [8, 21],
  [9, 11], [9, 19],
  [10, 10],[10, 21],
  [11, 9], [11, 20],
  [12, 10],[12, 22],
  [13, 11],[13, 20],
  // Weeks 3-4: 2-3/day
  [14, 9], [14, 15],[14, 21],
  [15, 10],[15, 20],
  [16, 11],[16, 18],[16, 23],
  [17, 9], [17, 21],
  [18, 10],[18, 16],[18, 22],
  [19, 9], [19, 20],
  [20, 11],[20, 19],
  [21, 10],[21, 15],[21, 22],
  [22, 9], [22, 21],
  [23, 10],[23, 20],
  [24, 11],[24, 16],[24, 23],
  [25, 9], [25, 20],
  [26, 10],[26, 21],
  [27, 9], [27, 14],[27, 22],
  // Days 28-42: 3-4/day
  [28, 8], [28, 14],[28, 20],
  [29, 9], [29, 15],[29, 22],
  [30, 8], [30, 13],[30, 20],
  [31, 9], [31, 14],[31, 21],[31, 23],
  [33, 8], [33, 15],[33, 21],
  [34, 9], [34, 14],[34, 22],
  [35, 8], [35, 13],[35, 20],[35, 23],
  [36, 9], [36, 16],[36, 22],
  [37, 8], [37, 14],[37, 21],
  [38, 9], [38, 15],[38, 23],
  [39, 8], [39, 14],[39, 20],
  [40, 10],[40, 16],[40, 22],
  [41, 9], [41, 15],[41, 23],
  [42, 8], [42, 14],[42, 21],[42, 23],
  // Days 43-60: 4-5/day
  [43, 8], [43, 12],[43, 17],[43, 22],
  [44, 9], [44, 13],[44, 18],[44, 23],
  [45, 8], [45, 12],[45, 16],[45, 21],
  [46, 9], [46, 13],[46, 18],[46, 22],
  [47, 8], [47, 11],[47, 16],[47, 21],[47, 23],
  [48, 9], [48, 14],[48, 19],[48, 23],
  [49, 8], [49, 12],[49, 17],[49, 22],
  [50, 9], [50, 13],[50, 16],[50, 21],[50, 23],
  [52, 8], [52, 12],[52, 17],[52, 22],
  [53, 9], [53, 14],[53, 19],[53, 23],
  [55, 8], [55, 12],[55, 17],[55, 21],
  [57, 9], [57, 13],[57, 18],[57, 22],
  [59, 8], [59, 12],[59, 16],[59, 21],[59, 23],
];

export const consumptions = schedule.map(([day, hour]) => ({
  id: uid(), timestamp: ts(day, hour), date: dk(day), notes: '',
}));

export const dailyLogs = [
  { id: uid(), date: dk(0),  timestamp: ts(0, 23),  times: 2, mg: 20, notes: 'Dia tranquilo' },
  { id: uid(), date: dk(3),  timestamp: ts(3, 22),  times: 1, mg: 20, notes: '' },
  { id: uid(), date: dk(7),  timestamp: ts(7, 22),  times: 2, mg: 25, notes: 'Ansiedade alta hoje' },
  { id: uid(), date: dk(10), timestamp: ts(10, 23), times: 2, mg: 25, notes: '' },
  { id: uid(), date: dk(14), timestamp: ts(14, 22), times: 3, mg: 30, notes: 'Semana difícil' },
  { id: uid(), date: dk(18), timestamp: ts(18, 23), times: 2, mg: 30, notes: '' },
  { id: uid(), date: dk(21), timestamp: ts(21, 22), times: 3, mg: 30, notes: 'Saída com amigos' },
  { id: uid(), date: dk(25), timestamp: ts(25, 23), times: 3, mg: 35, notes: '' },
  { id: uid(), date: dk(30), timestamp: ts(30, 22), times: 3, mg: 35, notes: 'Período de mais stress' },
  { id: uid(), date: dk(35), timestamp: ts(35, 23), times: 4, mg: 40, notes: '' },
  { id: uid(), date: dk(40), timestamp: ts(40, 22), times: 4, mg: 40, notes: '' },
  { id: uid(), date: dk(45), timestamp: ts(45, 23), times: 4, mg: 40, notes: 'Muita pressão no trabalho' },
  { id: uid(), date: dk(50), timestamp: ts(50, 22), times: 5, mg: 45, notes: '' },
  { id: uid(), date: dk(55), timestamp: ts(55, 23), times: 5, mg: 50, notes: '' },
];

export const cycles = [
  { id: uid(), timestamp: ts(2, 8),  date: dk(2),  bedtime: '23:30', sleep: 7,   triggers: ['ansiedade'], notes: 'Dormi razoavelmente' },
  { id: uid(), timestamp: ts(9, 8),  date: dk(9),  bedtime: '00:30', sleep: 6.5, triggers: ['stress', 'trabalho'], notes: 'Semana pesada' },
  { id: uid(), timestamp: ts(16, 8), date: dk(16), bedtime: '01:00', sleep: 6,   triggers: ['social'], notes: 'Saída na sexta' },
  { id: uid(), timestamp: ts(23, 8), date: dk(23), bedtime: '00:00', sleep: 7,   triggers: ['ansiedade', 'solidão'], notes: '' },
  { id: uid(), timestamp: ts(30, 8), date: dk(30), bedtime: '01:30', sleep: 5.5, triggers: ['stress'], notes: 'Período difícil no trabalho' },
  { id: uid(), timestamp: ts(37, 8), date: dk(37), bedtime: '00:30', sleep: 6,   triggers: ['tédio'], notes: '' },
  { id: uid(), timestamp: ts(44, 8), date: dk(44), bedtime: '01:00', sleep: 6,   triggers: ['stress', 'ansiedade'], notes: 'Muito stress este mês' },
  { id: uid(), timestamp: ts(51, 8), date: dk(51), bedtime: '02:00', sleep: 5,   triggers: ['social', 'tédio'], notes: '' },
];

export const wellbeingLogs = [
  { id: uid(), timestamp: ts(1, 20),  date: dk(1),  mood: 7, energy: 6, waterGlasses: 6, exerciseType: 'caminhada', exerciseDuration: 30, social: false, food: true,  emotions: ['calma', 'esperança'],       symptoms: [],                       notes: 'Bom dia, consegui caminhar' },
  { id: uid(), timestamp: ts(4, 20),  date: dk(4),  mood: 5, energy: 5, waterGlasses: 4, exerciseType: '',          exerciseDuration: null, social: true, food: true,  emotions: ['ansiedade'],                 symptoms: ['insónia'],              notes: '' },
  { id: uid(), timestamp: ts(8, 20),  date: dk(8),  mood: 6, energy: 6, waterGlasses: 5, exerciseType: 'gym',       exerciseDuration: 45,   social: false, food: false, emotions: ['determinação'],             symptoms: [],                       notes: 'Fui ao ginásio pela primeira vez em semanas' },
  { id: uid(), timestamp: ts(12, 20), date: dk(12), mood: 4, energy: 4, waterGlasses: 3, exerciseType: '',          exerciseDuration: null, social: false, food: false, emotions: ['tristeza', 'apatia'],       symptoms: ['cansaço'],              notes: 'Dia difícil' },
  { id: uid(), timestamp: ts(17, 20), date: dk(17), mood: 7, energy: 7, waterGlasses: 7, exerciseType: 'corrida',   exerciseDuration: 25,   social: true,  food: true,  emotions: ['alegria', 'conexão'],       symptoms: [],                       notes: 'Jantar com amigos, boa noite' },
  { id: uid(), timestamp: ts(22, 20), date: dk(22), mood: 5, energy: 5, waterGlasses: 4, exerciseType: '',          exerciseDuration: null, social: false, food: true,  emotions: ['ansiedade', 'irritabilidade'], symptoms: ['tensão'],             notes: '' },
  { id: uid(), timestamp: ts(28, 20), date: dk(28), mood: 4, energy: 3, waterGlasses: 3, exerciseType: '',          exerciseDuration: null, social: false, food: false, emotions: ['tristeza'],                  symptoms: ['cansaço', 'insónia'],   notes: 'Semana muito pesada' },
  { id: uid(), timestamp: ts(33, 20), date: dk(33), mood: 6, energy: 5, waterGlasses: 5, exerciseType: 'caminhada', exerciseDuration: 20,   social: false, food: true,  emotions: ['calma'],                    symptoms: [],                       notes: '' },
  { id: uid(), timestamp: ts(38, 20), date: dk(38), mood: 4, energy: 4, waterGlasses: 3, exerciseType: '',          exerciseDuration: null, social: true,  food: false, emotions: ['stressado', 'ansiedade'],   symptoms: ['tensão'],               notes: 'Prazo no trabalho esta semana' },
  { id: uid(), timestamp: ts(43, 20), date: dk(43), mood: 3, energy: 3, waterGlasses: 3, exerciseType: '',          exerciseDuration: null, social: false, food: false, emotions: ['esgotamento', 'tristeza'],  symptoms: ['cansaço', 'dores de cabeça'], notes: 'Mês muito difícil' },
];

export const reflections = [
  { id: uid(), timestamp: ts(2, 22),  date: dk(2),  question: 'O que me fez querer consumir hoje?',     answer: 'Ansiedade no trabalho, reunião complicada. Usei como forma de desligar à noite.' },
  { id: uid(), timestamp: ts(9, 22),  date: dk(9),  question: 'Como me sinto depois de consumir?',      answer: 'Mais relaxado no momento mas depois sinto um bocado de culpa. Quero mudar isso.' },
  { id: uid(), timestamp: ts(17, 22), date: dk(17), question: 'Que alternativas tenho ao consumo?',     answer: 'Hoje tentei a caminhada e ajudou. Preciso de usar mais isso.' },
  { id: uid(), timestamp: ts(25, 22), date: dk(25), question: 'O que aprendi sobre os meus padrões?',   answer: 'Consumo muito mais quando estou sozinho à noite. Tenho de arranjar actividades para esses momentos.' },
  { id: uid(), timestamp: ts(40, 22), date: dk(40), question: 'Como posso tratar-me melhor esta semana?', answer: 'Dormir antes da meia-noite, beber mais água, tentar não consumir antes das 20h.' },
];

export const thoughts = [
  { id: uid(), timestamp: ts(3, 21),  date: dk(3),  content: 'Hoje percebi que uso muito mais quando estou ansioso. A cannabis acaba por ser uma fuga ao que estou a sentir, mas não resolve o problema.' },
  { id: uid(), timestamp: ts(11, 21), date: dk(11), content: 'Consegui esperar mais 2 horas hoje antes de consumir. Parece pouco mas para mim é muito.' },
  { id: uid(), timestamp: ts(19, 22), date: dk(19), content: 'Semana melhor. Menos stress, menos consumo. A correlação é clara.' },
  { id: uid(), timestamp: ts(32, 21), date: dk(32), content: 'Preciso de ser mais gentil comigo. Esta jornada não é linear.' },
];

export const goals = [
  { id: uid(), type: 'reduce_frequency', target: 1,  createdAt: ts(30, 10), completed: false },
  { id: uid(), type: 'increase_interval', target: 8, createdAt: ts(30, 10), completed: false },
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
