// ===== FUNÇÕES HELPER =====

const localDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getTodayKey = () => localDateKey(new Date());

export const genId = () => crypto.randomUUID();

// Helper: Converter data para ISO string de forma segura
export const safeToISODate = (dateValue) => {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  return (d instanceof Date && !isNaN(d)) ? localDateKey(d) : null;
};

// Helper: Criar Date object seguro
export const safeDate = (dateValue) => {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  return (d instanceof Date && !isNaN(d)) ? d : null;
};

export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-PT');
};

export const subtractDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
};

export const getDateDaysAgo = (days) => {
  return subtractDays(new Date(), days);
};

// ===== FUNÇÕES DE FORMATAÇÃO ADICIONAIS =====

export const getTodayPT = () => {
  return new Date().toLocaleDateString('pt-PT');
};

export const getDateKeyFromItem = (item) => {
  if (!item) return null;
  if (item.date) return item.date;
  return safeToISODate(item.timestamp);
};

export const formatDateTime = (date) => {
  if (!date) return '';
  const d = safeDate(date);
  if (!d) return '';
  return `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}`;
};

export const formatDateShort = (date) => {
  if (!date) return '';
  const d = safeDate(date);
  if (!d) return '';
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
};

export const formatDateWithWeekday = (date) => {
  if (!date) return '';
  const d = safeDate(date);
  if (!d) return '';
  return d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' });
};

export const formatDateWithWeekdayFull = (date) => {
  if (!date) return '';
  const d = safeDate(date);
  if (!d) return '';
  return d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
};

export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = safeDate(startDate);
  const end = safeDate(endDate);
  if (!start || !end) return '';
  return `${start.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};

/**
 * Converte timestamp para formato PT (DD/MM/YYYY)
 */
export const timestampToPT = (timestamp) => {
  if (!timestamp) return '';
  const d = safeDate(timestamp);
  if (!d) return '';
  return d.toLocaleDateString('pt-PT');
};

// ===== META "DEITAR ANTES DE" =====
// Havia TRÊS versões desta conta (analyticsService, userStats, MetricsContext)
// e davam respostas diferentes. Duas acrescentavam uma regra própria — só
// contava se a hora fosse entre as 21h e as 02h, "janela saudável" — que
// passava por cima da meta que a pessoa escolheu: com a meta "até às 03:00",
// deitar às 02:30 não contava. E todas tratavam só 00:00–05:59 como "depois
// da meia-noite", por isso deitar às 07:00 contava como "antes das 03:00".
//
// Agora há uma só. A noite vira às 18:00: das 18:00 às 23:59 é antes da
// meia-noite; das 00:00 às 17:59 é depois. Quem se deita às 16:00 depois de
// uma noite acordada não se deitou "antes das 03:00".
const BEDTIME_DAY_TURN_MIN = 18 * 60;
const parseHHMM = (v) => {
  if (v == null) return null;
  const s = typeof v === 'string' ? v : String(v).padStart(2, '0') + ':00';
  const [h, m] = s.split(':').map(n => parseInt(n, 10));
  if (isNaN(h) || h < 0 || h > 23) return null;
  const mm = isNaN(m) ? 0 : m;
  return h * 60 + mm;
};
const onNightClock = (min) => (min < BEDTIME_DAY_TURN_MIN ? min + 1440 : min);

// true/false se dá para comparar; null se a hora ou a meta não se lêem
// (não se sabe — não conta nem como cumprida nem como falhada).
export const bedtimeMeetsTarget = (bedtime, target) => {
  const b = parseHHMM(bedtime);
  const t = parseHHMM(target);
  if (b == null || t == null) return null;
  return onNightClock(b) <= onNightClock(t);
};

// ===== META "ÚLTIMO CONSUMO ATÉ" =====
// Também havia três versões: uma ignorava a meta e comparava SEMPRE com a
// meia-noite (com a meta "até às 02:30", um consumo à 01:00 contava como
// falhado); as outras só tratavam 00:00–05:59 como madrugada, e um último
// consumo às 06:30 passava como "antes das 02:30".
//
// O prazo é a primeira vez que o relógio marca a hora da meta DEPOIS de ela
// acordar (início do ciclo). Com a meta 00:00 dá exactamente o mesmo que a
// conta antiga da meia-noite — verificado nos 291 ciclos dela.
export const limitLastDeadline = (cycleStartMs, target) => {
  const t = parseHHMM(target);
  if (t == null || cycleStartMs == null || isNaN(cycleStartMs)) return null;
  const d = new Date(cycleStartMs);
  d.setHours(Math.floor(t / 60), t % 60, 0, 0);
  if (d.getTime() <= cycleStartMs) d.setDate(d.getDate() + 1);
  return d.getTime();
};
