// Input validation utilities

// Text validation
export const MAX_NOTE_LENGTH = 2000;
export const MAX_THOUGHT_LENGTH = 5000;

export const validateText = (text, maxLength = MAX_NOTE_LENGTH) => {
  if (typeof text !== 'string') return { valid: false, error: 'Texto inválido' };
  if (text.length > maxLength) return { valid: false, error: `Texto muito longo (máx: ${maxLength} caracteres)` };
  return { valid: true };
};

// Numeric validation
export const validateSleepHours = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return { valid: false, error: 'Número inválido' };
  if (num < 0 || num > 24) return { valid: false, error: 'Horas devem estar entre 0 e 24' };
  return { valid: true, value: num };
};

export const validateMoodEnergy = (value) => {
  const num = parseInt(value, 10);
  if (isNaN(num)) return { valid: false, error: 'Número inválido' };
  if (num < 1 || num > 10) return { valid: false, error: 'Valor deve estar entre 1 e 10' };
  return { valid: true, value: num };
};

export const validateQuantity = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return { valid: false, error: 'Número inválido' };
  if (num < 0) return { valid: false, error: 'Quantidade não pode ser negativa' };
  if (num > 10000) return { valid: false, error: 'Quantidade muito alta (máx: 10000mg)' };
  return { valid: true, value: num };
};

// Sanitize text to prevent XSS (basic)
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  // Remove any HTML tags (basic protection)
  return text.replace(/<[^>]*>/g, '').trim();
};
