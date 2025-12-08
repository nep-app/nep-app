// Simple logger that only logs in development
// Prevents leaking sensitive info in production console

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },

  warn: (...args) => {
    if (isDev) console.warn(...args);
  },

  error: (...args) => {
    if (isDev) console.error(...args);
  },

  info: (...args) => {
    if (isDev) console.info(...args);
  },

  debug: (...args) => {
    if (isDev) console.debug(...args);
  }
};

// Export isDev for conditional logic
export { isDev };
