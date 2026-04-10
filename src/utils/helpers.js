// ===== FUNÇÕES HELPER =====

export const getTodayKey = () => new Date().toISOString().split('T')[0];

export const genId = () => crypto.randomUUID();

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
