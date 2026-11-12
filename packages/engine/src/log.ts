// The fight's log: the one way a line is written (say, sayOf, sayAt, unsay; test/lint-foundations.test.ts fails on a raw
// push, unshift or splice on a log). Spec item 1600 (a). A line names units by their names; each write records, per
// side, whether that side saw the units it names AT THAT MOMENT (cb.logSee, beside cb.log), so fog.ts sends a player
// only the lines about what their side saw. The marker (which units a line names, who sees them now) is combat.ts's,
// registered here; this module is a leaf (it imports no rules), so any module may write a line.
import type { Combat } from './combat';

/** One side's mark on a log line: 0, the side saw none of the units it names (the line is not sent to it); else n, the
 * names of the units it names that the side didn't see (sent as 'something unseen'), and t, their tiles then, as the
 * log writes them (refOf 'M6' and 'x,y'; sent as 'somewhere unseen'). */
export type LogSideMark = 0 | { n: string[]; t?: string[] };
/** A log line's mark (cb.logSee[i]): 0 for every side, else the sides that didn't see all of it. Past the end of
 * cb.logSee (trailing 0s are not kept), and in an old save with no cb.logSee, a line is every side's. */
export type LogMark = 0 | { pc?: LogSideMark; foe?: LogSideMark };
type Marker = (cb: Combat, text: string, about?: readonly string[]) => LogMark;
let marker: Marker | null = null, QUIET = 0;
/** combat.ts registers the marker as it loads. */
export function setLogMarker(f: Marker) { marker = f; }
const markOf = (cb: Combat, text: string, about?: readonly string[]): LogMark => (QUIET || !marker ? 0 : marker(cb, text, about));
/** Run f with no log marks worked out (a preview's throwaway copy: its lines are never sent to anyone). */
export function logQuietly<T>(f: () => T): T { QUIET++; try { return f(); } finally { QUIET--; } }
function putMark(cb: Combat, at: number, m: LogMark, insert: boolean) {
  const s = cb.logSee;
  if (!m && (!s || at >= s.length)) return;
  const list = (cb.logSee ||= []); while (list.length < at) list.push(0);
  if (insert) list.splice(at, 0, m); else list[at] = m;
  while (list.length && !list[list.length - 1]) list.pop();
  if (!list.length) delete cb.logSee;
}
/** Write lines to the fight's log, each marked with who saw what it names. Returns the log's length, as push did. No
 * fight (null): nothing. */
export function say(cb: Combat | null | undefined, ...lines: string[]): number {
  if (!cb) return 0;
  for (const l of lines) { const m = markOf(cb, l); cb.log.push(l); putMark(cb, cb.log.length - 1, m, false); }
  return cb.log.length;
}
/** say() for a line whose units are given by id, not found by name (about: [] for a line that names nobody: the
 * Narrator's own words). */
export function sayOf(cb: Combat, about: readonly string[], line: string): number {
  const m = markOf(cb, line, about); cb.log.push(line); putMark(cb, cb.log.length - 1, m, false);
  return cb.log.length;
}
/** Write a line at index at (0: the top of the log). */
export function sayAt(cb: Combat, at: number, line: string) {
  const m = markOf(cb, line); cb.log.splice(at, 0, line);
  if (m || (cb.logSee && at < cb.logSee.length)) putMark(cb, at, m, true);
}
/** Take line at back out of the log (a refused call or technique). */
export function unsay(cb: Combat, at: number) {
  cb.log.splice(at, 1);
  const s = cb.logSee; if (!s || at >= s.length) return;
  s.splice(at, 1); while (s.length && !s[s.length - 1]) s.pop(); if (!s.length) delete cb.logSee;
}
/** The fight's initiative line names every unit: when the set-up changes who is seen (sightQuietly: who starts Hidden),
 * its mark is worked out again, as the fight opens. */
export function remarkOpening(cb: Combat) {
  const at = cb.log.findIndex((l, i) => i < 4 && l.startsWith('Initiative: ')); if (at < 0) return;
  putMark(cb, at, markOf(cb, cb.log[at]), false);
}
