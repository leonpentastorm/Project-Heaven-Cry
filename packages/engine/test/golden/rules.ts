// @ts-nocheck (a recording tool; see harness.ts)
// THE RULES TABLES of engine foundations 1 (docs/design/handoffs/engine-foundations-1.md): the same actions as the
// damage tables (record.ts lists them), read a second way. Where a damage line holds amounts, a rules line holds what
// the DICE and the RULES did: how many times the dice were rolled, and what changed on each unit that is not an
// amount (its tile, its conditions, Prone, Bleeding, Dazed, Stunned, Hidden, Braced, Nailed, injuries, surrender).
// Every action that rolls is played from five seeds: the table's own, and four whose first d20 or second d20 is a 1 or
// a 20, so a natural 1 and a natural 20 are on record for whatever rolls first and second (an attack, then its save).
//
// Each action gives TWO lines, kept in two files:
//   rules-<section>.json       the STATE line: dice count and unit changes. A refactor of saves, rolls or forced
//                              movement must leave every one as it is; one that moves is a behaviour change and is
//                              listed in the hand-off.
//   rules-<section>.log.json   the WORDS: the log lines and the save / move events of the action. The wording of a
//                              roll is made in one place now (src/rolls.ts), so these are re-recorded when it changes
//                              (GOLDEN_RECORD=log), and a reviewer reads the diff.
// Record on purpose only:  GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-rules      (both files)
//                          GOLDEN_RECORD=log npm test -w @phc/engine -- golden-rules    (the words only)
import { expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ALSO, A, label, rollState } from './harness';
import { recordSection } from './record';

const draws = (from: number, to: number): string => { let s = from | 0, n = 0; while (s !== (to | 0) && n < 600) { s = (s + 0x6d2b79f5) | 0; n++; } return n >= 600 ? '?' : String(n); };
const FLAGS = ['prone', 'hidden', 'braced', 'surrendered', 'jammed'];
const NUMS = ['bleed', 'dazedNext', 'stunnedNext'];
const WORDS = /save|d20|vs \d|resist|shrug|untouched|holds|shove|push|pull|thrown|dragged|drag|swap|steps to|hurl|slam|knock|trap|springs|nail|injur/i;
const FX = new Set(['save', 'roll', 'shove', 'swap', 'blink', 'contest']);

function snapRules(cb: any) {
  return { log: cb.log.length, units: cb.units.map((u: any) => ({ id: u.id, l: label(cb, u), pos: u.pos, conds: { ...(u.conds || {}) }, flags: FLAGS.map((k) => !!u[k]), nums: NUMS.map((k) => u[k] || 0), nailed: !!u.nailed, inj: (u.injuries || []).length, watch: !!(u.watch || u.overwatch) })) };
}
function oneRules(b: any, cb: any, seed: number, rngAfter: number): string {
  const out: string[] = [];
  for (const u of cb.units) {
    const w = b.units.find((x: any) => x.id === u.id); if (!w) { out.push(label(cb, u) + ' new@' + u.pos); continue; }
    const p: string[] = [];
    if (w.pos !== u.pos) p.push(w.pos + '>' + u.pos);
    const now = u.conds || {};
    for (const k of Object.keys(now).sort()) if (!(k in w.conds)) p.push('+' + k + now[k]); else if (w.conds[k] !== now[k]) p.push(k + w.conds[k] + '>' + now[k]);
    for (const k of Object.keys(w.conds).sort()) if (!(k in now)) p.push('-' + k);
    FLAGS.forEach((k, i) => { if (w.flags[i] !== !!u[k]) p.push((u[k] ? '+' : '-') + k); });
    NUMS.forEach((k, i) => { if (w.nums[i] !== (u[k] || 0)) p.push(k + w.nums[i] + '>' + (u[k] || 0)); });
    if (w.nailed !== !!u.nailed) p.push(u.nailed ? '+nailed' : '-nailed');
    if (w.inj !== (u.injuries || []).length) p.push('inj' + w.inj + '>' + (u.injuries || []).length);
    if (w.watch !== !!(u.watch || u.overwatch)) p.push(u.watch || u.overwatch ? '+watch' : '-watch');
    if (p.length) out.push(w.l + ' ' + p.join(' '));
  }
  const n = draws(seed, rngAfter);
  if (n === '0' && !out.length) return '';
  const words = cb.log.slice(b.log).filter((l: string) => WORDS.test(l)).map((l: string) => l.slice(0, 260));
  const fx = (cb.fx || []).filter((e: any) => FX.has(e.k) && !b.fxSeen?.has(e.n)).map((e: any) => e.k + '(' + ['unit', 'target', 'from', 'to', 'ok', 'fam', 'die', 'mod', 'total', 'tn', 'how'].filter((k) => e[k] != null).map((k) => k + '=' + e[k]).join(',') + ')');
  return 'n' + n + ' ' + out.join(', ') + ' ## ' + words.join(' / ') + (fx.length ? ' ~ ' + fx.join(' ') : '');
}
/** Seeds whose first d20 is a 1 and a 20, and whose SECOND d20 is a 1 and a 20 (an attack rolls first, its save second). */
let SEEDS: number[] | null = null;
function seeds(): number[] {
  if (SEEDS) return SEEDS;
  const second = (want: number) => { for (let s = 1; s < 400000; s++) { const r = { state: s }; A.d20(r); if (A.d20(r) === want) return s; } throw new Error('no seed'); };
  return (SEEDS = [rollState(1), rollState(20), second(1), second(20)]);
}
function lineRules(b: any, cb: any, seed: number, rngAfter: number, again: (s: number) => string): string {
  const first = oneRules(b, cb, seed, rngAfter); if (!first) return '=>';
  if (/^n0 /.test(first)) return first; // nothing rolled: one reading is all there is
  const all = [first, ...seeds().map(again)].map((x) => (x.includes(' ## ') ? x.split(' ## ') : [x, '']));
  return all.map((x) => x[0]).join(' || ') + ' ## ' + all.map((x) => x[1]).join(' || ');
}
const snapWithFx = (cb: any) => { const s = snapRules(cb); s.fxSeen = new Set((cb.fx || []).map((e: any) => e.n)); return s; };

/** A section of record.ts read as rules lines: { state, log } tables with the same keys. */
export function recordRules(name: string): { state: Record<string, string>; log: Record<string, string> } {
  ALSO.snap = snapWithFx; ALSO.one = oneRules; ALSO.line = lineRules;
  let table: Record<string, string>;
  try { table = recordSection(name).table; } finally { delete ALSO.snap; delete ALSO.one; delete ALSO.line; }
  const state: Record<string, string> = {}, log: Record<string, string> = {};
  for (const [k, v] of Object.entries(table)) { if (!v.includes(' ## ')) continue; const [a, b] = v.split(' ## '); state[k] = a; log[k] = b; }
  return { state, log };
}

// ---------- the files ----------
const fileOf = (name: string) => fileURLToPath(new URL('./' + name + '.json', import.meta.url));
const write = (name: string, t: Record<string, any>) => writeFileSync(fileOf(name), '{\n' + Object.entries(t).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n}\n');
const read = (name: string): Record<string, any> => (existsSync(fileOf(name)) ? JSON.parse(readFileSync(fileOf(name), 'utf8')) : {});
export function diffTables(name: string, want: Record<string, string>, got: Record<string, string>, how: string) {
  const diffs: string[] = [];
  for (const k of Object.keys(want)) if (!(k in got)) diffs.push('GONE     ' + k + '\n    was: ' + want[k]); else if (got[k] !== want[k]) diffs.push('CHANGED  ' + k + '\n    was: ' + want[k] + '\n    now: ' + got[k]);
  for (const k of Object.keys(got)) if (!(k in want)) diffs.push('NEW      ' + k + '\n    now: ' + got[k]);
  if (diffs.length) expect.fail('golden table "' + name + '": ' + diffs.length + ' of ' + Object.keys(want).length + ' lines differ from test/golden/' + name + '.json. The first ' + Math.min(10, diffs.length) + ':\n' + diffs.slice(0, 10).join('\n') + '\n(' + how + ')');
  expect(Object.keys(want).length).toBeGreaterThan(0);
}
/** Compare (or record) two tables under a name: <name>.json must never move without a ruling; <name>.log.json is words. */
export function goldenPair(name: string, state: Record<string, string>, log: Record<string, string>): number {
  const rec = process.env.GOLDEN_RECORD;
  if (rec === '1') write(name, state);
  if (rec === '1' || rec === 'log') { write(name + '.log', log); console.log('GOLDEN_RECORD: wrote test/golden/' + name + (rec === '1' ? '.json and ' + name : '') + '.log.json (' + Object.keys(state).length + ' actions)'); }
  if (rec !== '1') diffTables(name, read(name), state, 'A state line moved: the dice or the rules changed. If that was a ruling, record on purpose (GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-rules) and list the line in the hand-off.');
  if (rec !== '1' && rec !== 'log') diffTables(name + '.log', read(name + '.log'), log, 'Only the words moved. If the wording was meant to change: GOLDEN_RECORD=log npm test -w @phc/engine -- golden-rules');
  return Object.keys(state).length;
}
export function goldenRules(section: string): number { const { state, log } = recordRules(section); return goldenPair('rules-' + section, state, log); }
