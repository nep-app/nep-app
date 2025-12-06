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
