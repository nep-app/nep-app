// ===== FUNÇÕES HELPER =====

export const getTodayKey = () => new Date().toISOString().split('T')[0];

export const genId = () => crypto.randomUUID();

// Alias for compatibility
export const generateId = genId;

// Helper: Converter data para ISO string de forma segura
export const safeToISODate = (dateValue) => {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  return (d instanceof Date && !isNaN(d)) ? d.toISOString().split('T')[0] : null;
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

export const formatDateForInput = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

export const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
  return new Date(d.setDate(diff));
};

export const getEndOfWeek = (date) => {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  return d;
};

export const getStartOfMonth = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export const getEndOfMonth = (date) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

export const calculateDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ===== FUNÇÕES DE FORMATAÇÃO ADICIONAIS =====

/**
 * Retorna hoje em formato PT (DD/MM/YYYY)
 */
export const getTodayPT = () => {
  return new Date().toLocaleDateString('pt-PT');
};

/**
 * Extrai a data (ISO) de um item que pode ter .date ou .timestamp
 * Padrão comum: item.date || new Date(item.timestamp).toISOString().split('T')[0]
 */
export const getDateKeyFromItem = (item) => {
  if (!item) return null;
  if (item.date) return item.date;
  return safeToISODate(item.timestamp);
};

/**
 * Formata data e hora em formato PT
 * Ex: "03/12/2025 14:30"
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  const d = safeDate(date);
  if (!d) return '';
  return `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}`;
};

/**
 * Formata timestamp para data e hora separadas
 * Retorna: { date: "03/12/2025", time: "14:30" }
 */
export const formatTimestampSplit = (timestamp) => {
  if (!timestamp) return { date: '', time: '' };
  const d = safeDate(timestamp);
  if (!d) return { date: '', time: '' };
  return {
    date: d.toLocaleDateString('pt-PT'),
    time: d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})
  };
};

/**
 * Verifica se uma data é hoje
 */
export const isDateToday = (date) => {
  if (!date) return false;
  const d = safeDate(date);
  if (!d) return false;
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

/**
 * Formata data em formato curto
 * Ex: "2 dez", "15 jan"
 */
export const formatDateShort = (date) => {
  if (!date) return '';
  const d = safeDate(date);
  if (!d) return '';
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
};

/**
 * Formata data com dia da semana
 * Ex: "segunda, 2 dez", "quarta, 15 jan"
 */
export const formatDateWithWeekday = (date) => {
  if (!date) return '';
  const d = safeDate(date);
  if (!d) return '';
  return d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' });
};

/**
 * Formata data completa com dia da semana
 * Ex: "segunda-feira, 2 de dezembro"
 */
export const formatDateWithWeekdayFull = (date) => {
  if (!date) return '';
  const d = safeDate(date);
  if (!d) return '';
  return d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
};

/**
 * Formata intervalo de datas
 * Ex: "2 dez - 8 dez 2025"
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = safeDate(startDate);
  const end = safeDate(endDate);
  if (!start || !end) return '';
  return `${start.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};

/**
 * Converte timestamp para formato ISO date (YYYY-MM-DD)
 * Alias mais claro para safeToISODate
 */
export const timestampToISO = (timestamp) => {
  return safeToISODate(timestamp);
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
