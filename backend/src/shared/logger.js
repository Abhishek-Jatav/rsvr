'use strict';
/**
 * Minimal structured logger. Never pass request bodies, cookies, OTPs,
 * tokens or personal data to it (docs/rules.md section 2).
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL] || LEVELS.info;

function log(level, message, meta) {
  if (process.env.NODE_ENV === 'test' || LEVELS[level] < threshold) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...meta });
  (level === 'error' ? console.error : console.log)(line);
}

module.exports = {
  debug: (m, meta) => log('debug', m, meta),
  info: (m, meta) => log('info', m, meta),
  warn: (m, meta) => log('warn', m, meta),
  error: (m, meta) => log('error', m, meta),
};
