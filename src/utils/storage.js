/**
 * Safe localStorage wrapper with validation and error handling
 * Protects against:
 * - JSON parsing errors
 * - Type mismatches
 * - Prototype pollution
 * - Storage quota errors
 */

export const safeLocalStorage = {
  /**
   * Safely get item from localStorage with type validation
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
   * @returns {*} Parsed value or defaultValue
   */
  get(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);

      // Key doesn't exist
      if (item === null) {
        return defaultValue;
      }

      // Parse JSON
      const parsed = JSON.parse(item);

      // Validate type matches default
      if (typeof parsed !== typeof defaultValue) {
        console.warn(`LocalStorage type mismatch for "${key}". Expected ${typeof defaultValue}, got ${typeof parsed}`);
        return defaultValue;
      }

      // Extra protection against prototype pollution
      if (parsed && typeof parsed === 'object' && '__proto__' in parsed) {
        console.error(`Potential prototype pollution detected in localStorage key "${key}"`);
        return defaultValue;
      }

      return parsed;
    } catch (e) {
      console.error(`Error reading "${key}" from localStorage:`, e);
      return defaultValue;
    }
  },

  /**
   * Safely set item in localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON stringified)
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      // Remove __proto__ if present (security)
      if (value && typeof value === 'object') {
        const { __proto__, ...safe } = value;
        value = safe;
      }

      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // Handle quota exceeded or other errors
      if (e.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded. Consider clearing old data.');
      } else {
        console.error(`Error writing "${key}" to localStorage:`, e);
      }
      return false;
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing "${key}" from localStorage:`, e);
    }
  },

  /**
   * Clear all localStorage (use with caution!)
   */
  clear() {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Error clearing localStorage:', e);
    }
  }
};
