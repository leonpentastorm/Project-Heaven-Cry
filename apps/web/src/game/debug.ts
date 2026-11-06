// What a problem report needs (spec: Reporting a problem): the last errors and warnings in this browser and the last
// Narrator calls, kept in memory only. Nothing here is sent anywhere; the Report button downloads it as a file.

export interface LogLine { at: number; level: 'error' | 'warn' | 'info'; text: string }
export interface Exchange { at: number; model: string; effort?: string; kind: 'turn' | 'rewrite'; ms: number; system?: string[]; tools?: string[]; messages: unknown[]; reply?: unknown; usage?: unknown; error?: string }

const logs: LogLine[] = [], exchanges: Exchange[] = [];
const KEY_RE = /sk-ant-[\w-]{8,}/g;
/** Never let anything that looks like an API key into a report. */
export const scrub = (s: string) => s.replace(KEY_RE, 'sk-ant-[removed]');
const str = (x: unknown) => { if (x instanceof Error) return x.name + ': ' + x.message + (x.stack ? '\n' + x.stack.split('\n').slice(1, 6).join('\n') : ''); if (typeof x === 'string') return x; try { return JSON.stringify(x); } catch { return String(x); } };
function push(level: LogLine['level'], args: unknown[]) { logs.push({ at: Date.now(), level, text: scrub(args.map(str).join(' ')).slice(0, 4000) }); if (logs.length > 300) logs.splice(0, logs.length - 300); }

if (typeof window !== 'undefined' && !(window as any).__phcDebug) {
  (window as any).__phcDebug = true;
  for (const level of ['error', 'warn', 'info'] as const) {
    const orig = console[level].bind(console);
    console[level] = (...a: unknown[]) => { push(level, a); orig(...a); };
  }
  window.addEventListener('error', (e) => push('error', ['Uncaught', e.message, e.filename + ':' + e.lineno, e.error]));
  window.addEventListener('unhandledrejection', (e) => push('error', ['Unhandled promise rejection', e.reason]));
}

export function noteExchange(x: Exchange) { exchanges.push(x); if (exchanges.length > 3) exchanges.shift(); }
export const recentLogs = () => logs.slice();
export const recentExchanges = () => exchanges.slice();
