// Demo data — generated relative to today, deterministic

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

// Realistic use patterns spread through the day
const p6  = [10, 12, 14, 16, 18, 21];
const p7  = [9, 11, 13, 15, 17, 19, 22];
const p7b = [10, 12, 13, 15, 17, 20, 22];
const p8  = [9, 11, 12, 14, 16, 18, 20, 23];
const p8b = [9, 10, 12, 14, 15, 17, 20, 22];
const p9  = [9, 10, 12, 13, 15, 16, 18, 20, 22];
const p10 = [9, 10, 11, 13, 14, 15, 17, 19, 21, 23];

// Days 0-13 (recent 2 weeks): 6-7/day — showing improvement
// Days 14-27 (weeks 3-4): 8/day — plateau
// Days 28-45 (weeks 5-7): 9-10/day — where it started
const schedule = [
  // Recent: 6-7/day
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
  // Plateau: 8/day
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
  // Where it started: 9-10/day
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

// Daily logs — weekly snapshots tracking total daily mg
// ~140mg/day recent (6-7 uses × ~20mg) → ~980mg/week
// ~160mg/day mid → ~1120mg/week
// ~185mg/day early → ~1295mg/week
export const dailyLogs = [
  { id: uid(), date: dk(0),  timestamp: ts(0, 23),  times: 7,  mg: 140, notes: 'Calmer day, managed to wait longer between sessions' },
  { id: uid(), date: dk(4),  timestamp: ts(4, 22),  times: 6,  mg: 120, notes: '' },
  { id: uid(), date: dk(7),  timestamp: ts(7, 22),  times: 7,  mg: 140, notes: 'Anxiety was high, craved more but held back' },
  { id: uid(), date: dk(11), timestamp: ts(11, 23), times: 6,  mg: 130, notes: '' },
  { id: uid(), date: dk(14), timestamp: ts(14, 22), times: 8,  mg: 160, notes: 'Stressful week, higher than usual' },
  { id: uid(), date: dk(18), timestamp: ts(18, 23), times: 8,  mg: 155, notes: '' },
  { id: uid(), date: dk(21), timestamp: ts(21, 22), times: 8,  mg: 160, notes: 'Social event, used more than planned' },
  { id: uid(), date: dk(25), timestamp: ts(25, 23), times: 8,  mg: 165, notes: '' },
  { id: uid(), date: dk(28), timestamp: ts(28, 22), times: 9,  mg: 185, notes: 'High-use period, stress at work' },
  { id: uid(), date: dk(32), timestamp: ts(32, 23), times: 10, mg: 195, notes: '' },
  { id: uid(), date: dk(36), timestamp: ts(36, 22), times: 9,  mg: 180, notes: '' },
  { id: uid(), date: dk(40), timestamp: ts(40, 23), times: 10, mg: 200, notes: 'Very difficult period, using to cope' },
  { id: uid(), date: dk(43), timestamp: ts(43, 22), times: 9,  mg: 185, notes: '' },
];

// Weekly sleep cycles with realistic English data
export const cycles = [
  { id: uid(), timestamp: ts(2, 8),  date: dk(2),  bedtime: '23:30', sleep: 7.5, triggers: ['anxiety'], notes: 'Slept reasonably well' },
  { id: uid(), timestamp: ts(9, 8),  date: dk(9),  bedtime: '00:30', sleep: 6.5, triggers: ['stress', 'work'], notes: 'Heavy week, late nights' },
  { id: uid(), timestamp: ts(16, 8), date: dk(16), bedtime: '01:00', sleep: 6.0, triggers: ['social'], notes: 'Friday night out' },
  { id: uid(), timestamp: ts(23, 8), date: dk(23), bedtime: '00:00', sleep: 7.0, triggers: ['anxiety', 'loneliness'], notes: '' },
  { id: uid(), timestamp: ts(30, 8), date: dk(30), bedtime: '01:30', sleep: 5.5, triggers: ['stress'], notes: 'Difficult work period, poor sleep' },
  { id: uid(), timestamp: ts(37, 8), date: dk(37), bedtime: '00:30', sleep: 6.0, triggers: ['boredom'], notes: '' },
  { id: uid(), timestamp: ts(44, 8), date: dk(44), bedtime: '02:00', sleep: 5.0, triggers: ['stress', 'anxiety'], notes: 'Very stressed this month, staying up late' },
];

// Wellbeing logs every few days — English emotions
export const wellbeingLogs = [
  { id: uid(), timestamp: ts(1, 20),  date: dk(1),  mood: 7, energy: 6, waterGlasses: 6, exerciseType: 'walk', exerciseDuration: 30, social: false, food: true,  emotions: ['calm', 'hopeful'],             symptoms: [],                        notes: 'Good day, managed to go for a walk' },
  { id: uid(), timestamp: ts(5, 20),  date: dk(5),  mood: 5, energy: 5, waterGlasses: 4, exerciseType: '',     exerciseDuration: null, social: true, food: true,  emotions: ['anxiety'],                     symptoms: ['insomnia'],              notes: '' },
  { id: uid(), timestamp: ts(8, 20),  date: dk(8),  mood: 6, energy: 6, waterGlasses: 5, exerciseType: 'gym',  exerciseDuration: 45,   social: false, food: false, emotions: ['determination'],               symptoms: [],                        notes: 'First gym session in weeks — felt good' },
  { id: uid(), timestamp: ts(12, 20), date: dk(12), mood: 4, energy: 4, waterGlasses: 3, exerciseType: '',     exerciseDuration: null, social: false, food: false, emotions: ['sadness', 'apathy'],           symptoms: ['fatigue'],               notes: 'Hard day' },
  { id: uid(), timestamp: ts(17, 20), date: dk(17), mood: 7, energy: 7, waterGlasses: 7, exerciseType: 'run',  exerciseDuration: 25,   social: true,  food: true,  emotions: ['joy', 'connection'],           symptoms: [],                        notes: 'Dinner with friends, great evening' },
  { id: uid(), timestamp: ts(22, 20), date: dk(22), mood: 5, energy: 5, waterGlasses: 4, exerciseType: '',     exerciseDuration: null, social: false, food: true,  emotions: ['anxiety', 'irritability'],     symptoms: ['tension'],               notes: '' },
  { id: uid(), timestamp: ts(28, 20), date: dk(28), mood: 4, energy: 3, waterGlasses: 3, exerciseType: '',     exerciseDuration: null, social: false, food: false, emotions: ['sadness'],                     symptoms: ['fatigue', 'insomnia'],   notes: 'Very heavy week' },
  { id: uid(), timestamp: ts(33, 20), date: dk(33), mood: 6, energy: 5, waterGlasses: 5, exerciseType: 'walk', exerciseDuration: 20,   social: false, food: true,  emotions: ['calm'],                        symptoms: [],                        notes: '' },
  { id: uid(), timestamp: ts(38, 20), date: dk(38), mood: 4, energy: 4, waterGlasses: 3, exerciseType: '',     exerciseDuration: null, social: true,  food: false, emotions: ['stress', 'anxiety'],           symptoms: ['tension'],               notes: 'Work deadline this week' },
  { id: uid(), timestamp: ts(43, 20), date: dk(43), mood: 3, energy: 3, waterGlasses: 3, exerciseType: '',     exerciseDuration: null, social: false, food: false, emotions: ['exhaustion', 'sadness'],       symptoms: ['fatigue', 'headaches'],  notes: 'Very difficult month' },
];

// Daily reflections in English
export const reflections = [
  { id: uid(), timestamp: ts(2, 22),  date: dk(2),  question: 'What made me want to use today?',         answer: 'Work anxiety, a difficult meeting. I used it to unwind in the evening — a habit I want to change.' },
  { id: uid(), timestamp: ts(9, 22),  date: dk(9),  question: 'How do I feel after using?',              answer: 'More relaxed in the moment, but then some guilt creeps in. I want to build healthier wind-down routines.' },
  { id: uid(), timestamp: ts(17, 22), date: dk(17), question: 'What alternatives do I have?',            answer: 'Today I tried a run first and it actually helped a lot. I need to use that more.' },
  { id: uid(), timestamp: ts(25, 22), date: dk(25), question: 'What patterns have I noticed?',           answer: 'I use much more when I\'m home alone in the evenings. I need more activities during those moments.' },
  { id: uid(), timestamp: ts(40, 22), date: dk(40), question: 'How can I take better care of myself?',   answer: 'Sleep before midnight, drink more water, try not to use before 6pm.' },
];

// Personal journal thoughts in English
export const thoughts = [
  { id: uid(), timestamp: ts(3, 21),  date: dk(3),  content: 'I realised today I use a lot more when I\'m anxious. It ends up being an escape from what I\'m feeling rather than actually dealing with it.' },
  { id: uid(), timestamp: ts(11, 21), date: dk(11), content: 'Managed to wait an extra hour and a half today before the second session. Feels like a small win, but I\'ll take it.' },
  { id: uid(), timestamp: ts(19, 22), date: dk(19), content: 'Better week overall. Less stress, fewer sessions. The connection is clear.' },
  { id: uid(), timestamp: ts(32, 21), date: dk(32), content: 'I need to be kinder to myself. This journey isn\'t linear.' },
];

// Goals: reduce to 6/day (almost there from 9-10) + 2h minimum interval
export const goals = [
  { id: uid(), type: 'reduce_frequency', target: 6,  createdAt: ts(30, 10), completed: false },
  { id: uid(), type: 'increase_interval', target: 2, createdAt: ts(30, 10), completed: false },
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
