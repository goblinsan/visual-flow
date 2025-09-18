// Simple logger utility with level-based gating.
// Usage: import { logger } from './utils/logger'; logger.debug('message', data);
// Level controlled via localStorage key 'vf:logLevel' or ?log=debug in URL.

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

function resolveLevel(): LogLevel {
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('log');
    if (q && ['silent','error','warn','info','debug'].includes(q)) return q as LogLevel;
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('vf:logLevel') : null;
    if (stored && ['silent','error','warn','info','debug'].includes(stored)) return stored as LogLevel;
  } catch { /* ignore */ }
  return 'info';
}

let currentLevel: LogLevel = resolveLevel();
const order: LogLevel[] = ['silent','error','warn','info','debug'];

function should(level: LogLevel) {
  return order.indexOf(level) <= order.indexOf(currentLevel) && currentLevel !== 'silent';
}

function setLevel(l: LogLevel) {
  currentLevel = l;
  try { localStorage.setItem('vf:logLevel', l); } catch { /* ignore */ }
}

function fmt(level: string, parts: any[]) {
  const ts = new Date().toISOString();
  return [`%c[${ts}]%c ${level}%c`, 'color:gray;font-size:10px', 'color:#2563eb;font-weight:bold', 'color:inherit', ...parts];
}

export const logger = {
  setLevel,
  get level() { return currentLevel; },
  error: (...args: any[]) => { if (should('error')) console.error(...fmt('ERROR', args)); },
  warn:  (...args: any[]) => { if (should('warn')) console.warn(...fmt('WARN', args)); },
  info:  (...args: any[]) => { if (should('info')) console.log(...fmt('INFO', args)); },
  debug: (...args: any[]) => { if (should('debug')) console.log(...fmt('DEBUG', args)); },
};

// Helper to log once per key
const seen = new Set<string>();
export function debugOnce(key: string, ...args: any[]) {
  if (seen.has(key)) return; seen.add(key); logger.debug('[once]', key, ...args);
}
