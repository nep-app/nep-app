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
