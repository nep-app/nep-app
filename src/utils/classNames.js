/**
 * Utility for combining class names with dark mode support
 * Replaces the pattern: className={(darkMode ? 'dark-classes' : 'light-classes')}
 */

/**
 * Combines base classes with conditional dark/light mode classes
 * @param {string} base - Base classes that apply to both modes
 * @param {string} dark - Classes for dark mode
 * @param {string} light - Classes for light mode
 * @param {boolean} isDark - Dark mode state
 * @returns {string} Combined class names
 */
export function cn(base, dark, light, isDark) {
  return `${base} ${isDark ? dark : light}`.trim();
}

/**
 * Theme-aware class combinations for common UI patterns
 */
export const themeClasses = {
  // Cards and containers
  card: (isDark) => isDark
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900',

  // Container without text color (for when children define their own text colors)
  container: (isDark) => isDark
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-200',

  cardHover: (isDark) => isDark
    ? 'hover:bg-gray-750 hover:border-gray-600'
    : 'hover:bg-gray-50 hover:border-gray-300',

  // Backgrounds
  bgPrimary: (isDark) => isDark ? 'bg-gray-900' : 'bg-gray-50',
  bgSecondary: (isDark) => isDark ? 'bg-gray-800' : 'bg-white',
  bgTertiary: (isDark) => isDark ? 'bg-gray-700' : 'bg-gray-100',
  bgTertiaryAlt: (isDark) => isDark ? 'bg-gray-700' : 'bg-gray-200',

  // Container variants
  containerLight: (isDark) => isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200',

  // Borders
  border: (isDark) => isDark ? 'border-gray-700' : 'border-gray-200',
  borderLight: (isDark) => isDark ? 'border-gray-600' : 'border-gray-300',

  // Text colors
  textPrimary: (isDark) => isDark ? 'text-white' : 'text-gray-900',
  textPrimaryAlt: (isDark) => isDark ? 'text-white' : 'text-gray-800',
  textSecondary: (isDark) => isDark ? 'text-gray-300' : 'text-gray-700',
  textSecondaryAlt: (isDark) => isDark ? 'text-gray-300' : 'text-gray-600',
  textTertiary: (isDark) => isDark ? 'text-gray-400' : 'text-gray-600',
  textTertiaryAlt: (isDark) => isDark ? 'text-gray-400' : 'text-gray-500',
  textMuted: (isDark) => isDark ? 'text-gray-500' : 'text-gray-400',

  // Inputs
  input: (isDark) => isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',

  inputFocus: (isDark) => isDark
    ? 'focus:border-blue-500 focus:ring-blue-500/20'
    : 'focus:border-blue-500 focus:ring-blue-500/20',

  // Buttons
  button: (isDark) => isDark
    ? 'bg-gray-700 hover:bg-gray-600 text-white'
    : 'bg-gray-200 hover:bg-gray-300 text-gray-900',

  buttonPrimary: (isDark) => isDark
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : 'bg-blue-500 hover:bg-blue-600 text-white',

  // Modals
  modal: (isDark) => isDark
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-200',

  modalOverlay: (isDark) => isDark
    ? 'bg-black/70'
    : 'bg-black/50',

  // Badges and tags
  badge: (isDark) => isDark
    ? 'bg-gray-700 text-gray-200'
    : 'bg-gray-200 text-gray-700',

  badgeSuccess: (isDark) => isDark
    ? 'bg-green-900/30 text-green-400 border-green-700'
    : 'bg-green-100 text-green-700 border-green-300',

  badgeWarning: (isDark) => isDark
    ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700'
    : 'bg-yellow-100 text-yellow-700 border-yellow-300',

  badgeDanger: (isDark) => isDark
    ? 'bg-red-900/30 text-red-400 border-red-700'
    : 'bg-red-100 text-red-700 border-red-300',

  badgeInfo: (isDark) => isDark
    ? 'bg-blue-900/30 text-blue-400 border-blue-700'
    : 'bg-blue-100 text-blue-700 border-blue-300',
};

/**
 * Get all theme classes as an object for easy spreading
 * @param {boolean} isDark - Dark mode state
 * @returns {Object} Object with all theme class combinations
 */
export function getThemeClasses(isDark) {
  return Object.fromEntries(
    Object.entries(themeClasses).map(([key, fn]) => [key, fn(isDark)])
  );
}

/**
 * Conditional class helper - only adds classes if condition is true
 * @param {boolean} condition - Condition to check
 * @param {string} classes - Classes to add if condition is true
 * @returns {string} Classes or empty string
 */
export function cx(condition, classes) {
  return condition ? classes : '';
}
