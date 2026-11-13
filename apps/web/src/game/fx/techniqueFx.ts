// Every physical technique's own animation, as a table: technique id → the parts it plays (fx/techniqueParts.ts) and
// their parameters. Leon, 12 Nov 2026: "every technique that doesn't have its own unique SVG animation to have one",
// and then "I want an attack effect and a result effect so you feel something if it misses". So each row is:
//   attack: the stroke or shot itself (a slash arc, a thrust, a chop, a tracer, a cone…), played hit or miss;
//   hit / miss / crit: what it does to the target. A miss has its own result (the stroke passing wide, a parry tick, a
//   round going past), never just the word; a crit is the hit made bigger, in white, with a starburst.
// A new technique is one row. The test (techniqueFx.test.ts) walks every technique in the data and every physical class
// move, and fails if one has no row, if a row names a part that doesn't exist, or if two rows are the same.
//
// When it plays: a strike row on each of its strikes (the engine marks a technique's melee and shot events with `tech`,
// a class move's with `move`; a plain attack plays Cut's or Shot's row); a use row (no strike of its own: a Guard, a
// Bead, a Trip) on its technique event, its result read ahead from what followed in the same action (a save made, a
// beat refused). The attack starts with the event; the result lands with the impact (a swing's 120 ms, a round's
// flight), so nothing lands before its number, and every part is done well inside the beat.
//
// Shots on screen match rounds spent (Leon, 12 Nov 2026: "Burst eats 3 ammo but shoots only 2 bullet VFX"): the
// engine counts the rounds a volley spent with no roll of their own on the volley event (`loose`, combat.ts
// noteLoose); techPrepass hands them to the volley's last roll, and this file draws each as its own round (muzzle,
// tracer, casing, and its bang where no one recording covers the volley), landing on the target when that roll hit and
// going wide when it missed. Full auto's spray, Mag Dump's stream and Suppress's extra rounds read the same count.
import type { FxEvent } from '@engine';
import { SKILLS, hitsWith } from '@engine';
import type { Sfx } from '../sfx';
import { type Pt, after, angle, centre, trace } from './dom';
import { brassOf, ejectShell, whoOf } from './brass';
import { type PartCtx, type PartParams, PART_NAMES, WHITE, HP, playPart } from './techniqueParts';

// Colour = meaning (docs/design/colour-system.md): a technique's ink is its attribute's, read from the weapon's
// hitting skill (Raw Power → Strength, Dexterity → Agility); a Faith move takes Virtue's.
export const ATTR_INK: Record<string, string> = {
  endurance: '#F65157', strength: '#F68A38', agility: '#E3BF51', perception: '#40BAA0', intelligence: '#8BDEEE',
  expression: '#5394AC', insight: '#EB95B7', determination: '#9D7ADC', virtue: '#D36A90',
};
const VIRTUE = ATTR_INK.virtue;

export type PartRef = [string, PartParams];
export interface TechRow {
  attack: PartRef[]; hit: PartRef[]; miss: PartRef[]; crit: PartRef[];
  /** strike: on each melee or shot event of it; use: on its technique event; shove / anchor: on that event */
  on: 'strike' | 'use' | 'shove' | 'anchor';
  /** a multi-target stroke drawn once (Sweep's arc): the attack plays on the first strike only */
  once?: boolean;
  /** a round fired with no roll (a Warning Shot, Flush, Rout): its result is what it meant to do */
  noRoll?: boolean;
}
const p = (name: string, o: PartParams = {}): PartRef => [name, o];
const row = (attack: PartRef[], hit: PartRef[], miss: PartRef[], crit: PartRef[] = [p('star')], more: Partial<TechRow> = {}): TechRow => ({ attack, hit, miss, crit, on: 'strike', ...more });
const use = (attack: PartRef[], hit: PartRef[], miss: PartRef[], more: Partial<TechRow> = {}): TechRow => ({ attack, hit, miss, crit: [], on: 'use', ...more });

// One row each. (tools/technique_fx_inventory.py reads this table: keep each row on one line.)
export const TECH_FX: Record<string, TechRow> = {
  // ----- melee: openers -----
  lunge: row([p('dashes', { len: 0.7 }), p('thrust', { len: 0.25 })], [p('cross', { n: 1, size: 0.22 })], [p('whiff', { side: -1 })]),
  charge: row([p('thrust', { w: 0.11, len: 0.5, draw: 60 }), p('dashes', { len: 1.1 })], [p('chevrons', { n: 2 }), p('ring', { r: 0.5 })], [p('deflect')], [p('star', { n: 10 })]),
  feint: use([p('jab', { count: 1, gap: 0 })], [p('bracket', { r: 0.5 })], [p('deflect', { side: -1 })]),
  draw_cut: row([p('slash', { arc: 70, tilt: 35, draw: 55, echo: true })], [p('cross', { n: 1, size: 0.3 })], [p('whiff')]),
  ambush: row([p('thrust', { w: 0.09, len: 0.45, draw: 50 })], [p('cross', { n: 2, size: 0.2 }), p('brand', { shape: 'eye' })], [p('whiff')], [p('star', { n: 12 })]),
  // ----- melee: strikes -----
  cut: row([p('slash', { arc: 100 })], [p('cross', { n: 1 })], [p('whiff')]),
  sweep: row([p('sweep', { span: 150 })], [p('cross', { n: 1, size: 0.2 })], [p('whiff', { side: -1 })], [p('star')], { once: true }),
  bash: row([p('jab', { count: 2 })], [p('chevrons', { n: 1 }), p('ring', { r: 0.35 })], [p('deflect')]),
  sunder: row([p('weapon', { move: 'chop' }), p('chop', { w: 0.1 })], [p('crack', { n: 3 })], [p('deflect')]),
  flurry: row([p('slash', { arc: 70, w: 0.07, draw: 60 })], [p('pips'), p('cross', { n: 1, size: 0.18 })], [p('pips'), p('whiff')]),
  hamstring: row([p('slash', { arc: 70, r: 0.38, low: 0.3, w: 0.09 })], [p('drops', { n: 2 }), p('brand', { shape: 'chevron', up: -0.45, side: 0 })], [p('whiff', { side: 1 })]),
  bind: use([p('hook', { w: 0.07 })], [p('bracket', { r: 0.42 })], [p('deflect', { side: 1 })]),
  half_sword: row([p('thrust', { w: 0.05, len: 0.45, draw: 60 })], [p('crack', { n: 1 })], [p('deflect', { side: -1 })]),
  throw: row([p('aim', { dash: '6 5', short: 0.3 })], [p('cross', { n: 1, size: 0.24 })], [p('wide')]),
  pull_out: use([p('hook', { w: 0.1 })], [p('drops', { n: 3 })], [p('deflect')]),
  // ----- melee: links -----
  sidestep: use([p('dashes', { len: 0.8, side: -1 })], [p('ring', { at: 'a', r: 0.45, from: 0.6, to: 1.1 })], []),
  guard: use([p('guard', { span: 100 })], [p('ring', { at: 'a', r: 0.5, dash: '3 4', from: 1.3 })], []),
  shove: use([p('bash', { half: 0.4 })], [p('chevrons', { n: 2 }), p('streak', { n: 3 })], [p('deflect', { side: 1 }), p('stomp', { rings: 1, color: '#A3AEC2' })]),
  trip: use([p('hook', { low: 0.3, w: 0.08 })], [p('stomp', { rings: 2 })], [p('deflect', { side: -1 }), p('wide', { side: -1 })]),
  drag: use([p('hook', { w: 0.08 })], [p('chevrons', { n: 1, back: true }), p('streak', { n: 2, len: 0.5 })], [p('deflect')]),
  // ----- melee: finishers -----
  coup: row([p('chop', { h: 1.15 })], [p('cross', { n: 2 }), p('crack', { n: 1 })], [p('deflect')], [p('star', { n: 10 })]),
  cleave: row([p('slash', { arc: 140, w: 0.16 })], [p('cross', { n: 1, size: 0.32 })], [p('whiff')]),
  break: row([p('chop', { w: 0.2, h: 1.1 })], [p('crack', { n: 5 })], [p('deflect', { side: -1 })], [p('star', { n: 12 })]),
  run_through: row([p('thrust', { w: 0.09, len: 1.0 })], [p('cross', { n: 1, size: 0.2 }), p('drops', { n: 1 })], [p('whiff', { side: -1 })]),
  throw_down: use([p('hook', { w: 0.12 })], [p('stomp', { rings: 3 })], [p('deflect')]),
  // ----- melee: answers -----
  parry: use([p('guard', { span: 70 })], [p('deflect', { side: -1 }), p('ring', { at: 'a', r: 0.4 })], [p('whiff')]),
  riposte: row([p('slash', { arc: 60, draw: 50 }), p('guard', { span: 60 })], [p('cross', { n: 1, size: 0.2 })], [p('whiff', { side: -1 })]),
  keep_back: row([p('thrust', { len: 0.05, w: 0.08 })], [p('chevrons', { n: 1 }), p('bracket', { r: 0.55 })], [p('whiff')]),
  // ----- melee: the shield -----
  shield_bash: row([p('bash')], [p('chevrons', { n: 1 }), p('ring', { r: 0.42 })], [p('deflect', { side: -1 })]),
  raise_shield: use([p('guard', { span: 120, double: true })], [p('ring', { at: 'a', r: 0.6, from: 0.8 })], []),
  grapple: use([p('hook', { low: 0.1, w: 0.11 })], [p('bracket', { r: 0.36 })], [p('deflect', { side: -1 })]),
  shield_wall: use([p('guard', { span: 150, double: true })], [p('ring', { at: 'a', r: 0.7, dash: '6 3' })], []),
  interpose: use([p('guard', { span: 90 }), p('dashes', { len: 0.5 })], [p('ring', { at: 'a', r: 0.55 })], []),

  // ----- ranged: fire -----
  shot: row([p('tracer')], [p('cross', { n: 1, size: 0.16 })], [p('wide')]),
  snap_shot: row([p('tracer', { draw: 40 })], [p('cross', { n: 1, size: 0.2 }), p('ring', { r: 0.3 })], [p('wide', { side: -1 })]),
  burst: row([p('tracer', { w: 0.04, hold: 240 })], [p('cross', { n: 1, size: 0.14 }), p('ticks', { n: 2, r: 0.4 })], [p('wide')]),
  aimed_shot: row([p('aim'), p('tracer', { t: 120 })], [p('cross', { n: 2, size: 0.18 })], [p('wide')], [p('star', { n: 10 })]),
  called_shot: row([p('aim', { dash: '2 3' }), p('tracer')], [p('brand', { shape: 'target', up: 0, size: 0.16 })], [p('wide', { side: -1 })]),
  walking_fire: row([p('dashes', { len: 0.9 }), p('tracer')], [p('cross', { n: 1, size: 0.18 })], [p('wide')]),
  punch_through: row([p('heavy', { past: 0.9, w: 0.1 })], [p('crack', { n: 2 })], [p('wide')]),
  lob: row([p('ring', { r: 0.8, dash: '4 4', from: 1.3 })], [p('stomp', { rings: 3 })], [p('wide')]),
  heavy_bolt: row([p('heavy', { w: 0.2 })], [p('crack', { n: 2 }), p('chevrons', { n: 1 })], [p('wide')]),
  // ----- ranged: press -----
  suppress: row([p('ticks', { n: 4 })], [p('brand', { shape: 'chevron', up: -0.5, side: 0 })], [p('wide'), p('ticks', { n: 2, color: '#A3AEC2', r: 0.8 })]),
  rake: row([p('cone', { span: 50 })], [p('cross', { n: 1, size: 0.18 })], [p('wide', { side: -1 })]),
  warning_shot: row([p('tracer', { over: 0.45 })], [p('brand', { shape: 'bar', up: 0.8, side: -0.6 })], [p('wide', { side: 1 })], [], { noRoll: true }),
  flush: row([p('tracer', { draw: 60 })], [p('crack', { n: 2 }), p('streak', { n: 2 })], [p('wide')], [], { noRoll: true }),
  mag_dump: row([p('cone', { span: 24 }), p('ticks', { n: 6, gap: 35 })], [p('cross', { n: 2, size: 0.22 })], [p('wide')]),
  crossfire: row([p('aim', { dash: '5 3' }), p('tracer')], [p('brand', { shape: 'cross' })], [p('wide')]),
  // ----- ranged: set -----
  bead: use([p('aim', { dash: '2 4' })], [p('bracket', { r: 0.6 })], []),
  spot: use([p('aim', { dash: '1 4' })], [p('brand', { shape: 'eye' })], []),
  brace: use([p('guard', { span: 160 })], [p('stomp', { rings: 1 })], []),
  load_special: use([p('ring', { at: 'a', r: 0.35, from: 0.5, to: 1 })], [p('ring', { at: 'a', r: 0.55, dash: '2 3' })], []),
  shift: use([p('dashes', { len: 0.9 })], [p('ring', { at: 'a', r: 0.4, dash: '4 3', from: 1.2 })], []),
  vent: use([p('ticks', { n: 3, r: 0.4 })], [p('ring', { at: 'a', r: 0.45, from: 1.4, to: 0.8 })], []),
  head_down: use([p('stomp', { rings: 1 })], [p('ring', { at: 'a', r: 0.5, from: 1.4, to: 0.7 })], []),
  // ----- ranged: take -----
  dead_centre: row([p('aim'), p('heavy', { w: 0.1, past: 0.3 })], [p('brand', { shape: 'target', up: 0 }), p('cross', { n: 2, size: 0.2 })], [p('wide')], [p('star', { n: 12 })]),
  pin_down: row([p('tracer')], [p('brand', { shape: 'bar', up: -0.5, side: 0 }), p('stomp', { rings: 1 })], [p('wide')]),
  rout: row([p('tracer', { over: 0.5 })], [p('streak', { n: 3, len: 0.9 })], [p('wide')], [], { noRoll: true }),
  stopping_shot: row([p('tracer', { w: 0.05 })], [p('chevrons', { n: 2 }), p('streak', { n: 2 })], [p('wide')]),
  storm: row([p('dashes', { len: 1.2 }), p('tracer')], [p('cross', { n: 1, size: 0.2 }), p('ring', { r: 0.4 })], [p('wide')]),
  last_round: row([p('tracer'), p('ring', { at: 'a', r: 0.35 })], [p('cross', { n: 2, size: 0.16 })], [p('wide')], [p('star', { n: 6 })]),
  // ----- ranged: watch (each fires a shot of its own when it springs) -----
  overwatch: row([p('aim', { dash: '3 3' }), p('tracer')], [p('cross', { n: 1, size: 0.2 })], [p('wide')]),
  deny: row([p('aim', { dash: '6 2' }), p('tracer')], [p('bracket', { r: 0.45 })], [p('wide')]),
  cover_me: row([p('tracer'), p('ticks', { n: 3 })], [p('cross', { n: 1, size: 0.18 })], [p('wide')], [], { noRoll: true }),
  dead_to_rights: row([p('aim'), p('tracer')], [p('brand', { shape: 'target', up: 0, size: 0.22 })], [p('wide')]),

  // ----- class moves that are physical attacks (data/classes.json; the engine marks their events with `move`) -----
  'move:fighter.lunge': row([p('dashes', { len: 1.0 }), p('thrust', { len: 0.45, w: 0.08 })], [p('cross', { n: 1 }), p('ring', { r: 0.4 })], [p('whiff')]),
  'move:fighter.finisher': row([p('chop', { h: 1.25, w: 0.18 })], [p('cross', { n: 2, size: 0.3 }), p('crack', { n: 2 })], [p('deflect')], [p('star', { n: 14 })]),
  'move:fighter.shove': { attack: [p('bash', { half: 0.36 })], hit: [p('chevrons', { n: 3 })], miss: [p('deflect', { side: -1 }), p('ring', { r: 0.4, color: '#A3AEC2' })], crit: [], on: 'shove' },
  'move:defender.anchor': { attack: [p('guard', { span: 160 }), p('ring', { at: 'a', r: 0.5 })], hit: [p('bracket', { r: 0.5, color: '#F65157' })], miss: [p('deflect')], crit: [], on: 'anchor' },
  // Called Shot (the Operative's, rules 1.32): the technique's own look, with any weapon
  'move:gunslinger.called_shot': row([p('aim', { dash: '2 3' }), p('tracer')], [p('brand', { shape: 'target', up: 0, size: 0.2 }), p('ring', { r: 0.3 })], [p('wide', { side: -1 })]),
  'move:lumeri_templar.judgement': row([p('ring', { at: 'a', r: 0.5, color: VIRTUE }), p('chop', { color: VIRTUE })], [p('brand', { shape: 'cross', color: VIRTUE }), p('crack', { n: 2 })], [p('deflect')], [p('star', { n: 12, color: VIRTUE })]),
};

/** The row an event plays, by what the engine says it was (or null: a melee or shot with no technique plays Cut or Shot). */
export function rowKey(e: { k: string; tech?: string; move?: string; thrown?: boolean; mode?: string; [x: string]: any }): string | null {
  if (e.k === 'melee' || e.k === 'shot') {
    if (e.tech && TECH_FX[e.tech]) return e.tech;
    if (e.move && TECH_FX['move:' + e.move]) return 'move:' + e.move;
    if (e.k === 'melee') return 'cut';
    if (e.thrown) return 'throw';
    return e.mode === 'burst' ? 'burst' : 'shot';
  }
  if (e.k === 'technique') return TECH_FX[e.id]?.on === 'use' ? e.id : null;
  if (e.k === 'shove') return e.unit && !e._tech && !e.interpose && !e.magic ? 'move:fighter.shove' : null;
  if (e.k === 'anchor') return e.what === 'oa' && e.target ? 'move:defender.anchor' : null;
  return null;
}
/** Every part a row names, flat (the test checks each exists). */
export const partsOf = (r: TechRow) => [...r.attack, ...r.hit, ...r.miss, ...r.crit].map(([n]) => n);
export { PART_NAMES };

/** The ink of a technique: its weapon's hitting skill's attribute (ranged: Agility; melee: Strength, when unknown). */
export function inkOf(weapon: string | undefined, ranged: boolean): string {
  let skill = '';
  try { skill = weapon ? hitsWith(weapon) : ''; } catch { skill = ''; }
  const attr = (SKILLS as any[]).find((s) => s.id === skill)?.attribute;
  return ATTR_INK[attr] || (ranged ? ATTR_INK.agility : ATTR_INK.strength);
}

// ---------- the pre-pass: rounds to their rolls, a use's outcome read ahead ----------
/** Volleys whose loose rounds are drawn by someone else (full auto's spray, a streaming Mag Dump: the volley; Suppress:
 *  fx/ranged.ts's extra rounds, reading the shot's _loose). Everything else draws them on the volley's last roll here. */
const SPRAY = new Set(['auto']);
/** Copies of the batch's events (never the saved ones) with: a volley's loose rounds on its last roll (`_loose`), or the
 *  volley marked to draw them itself (`_drawLoose`: a volley with no roll, a spray); a use technique's outcome (`_out`:
 *  'hit' | 'miss' | 'use'); a shove inside a technique marked with it (`_tech`). streams(v): does this volley draw its
 *  own rounds as one stream (a Mag Dump with bullets; play.ts knows the gun). Pure. */
export function techPrepass<T extends { k: string; [f: string]: any }>(evs: T[], streams: (v: T) => boolean = () => false): T[] {
  let out: T[] | null = null;
  const set = (i: number, extra: Record<string, any>) => { if (!out) out = evs.slice(); out[i] = { ...out[i], ...extra }; };
  const cur = new Map<string, string>(); // unit → technique in progress (this batch)
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i];
    if (e.k === 'turn') cur.clear();
    if (e.k === 'technique' && !e.refused) cur.set(String(e.unit), String(e.id));
    if (e.k === 'shove' && e.unit && cur.has(String(e.unit))) set(i, { _tech: cur.get(String(e.unit)) });
    if (e.k === 'shot' && Number(e.loose) > 0) set(i, { _loose: Number(e.loose) + (Number((out || evs)[i]._loose) || 0) }); // a roll that carries its own (Both Barrels)
    if (e.k === 'volley' && Number(e.loose) > 0) {
      if (SPRAY.has(e.mode) || streams(e)) { set(i, { _drawLoose: true }); continue; }
      let last = -1;
      for (let j = i + 1; j < evs.length; j++) {
        const x = evs[j];
        if (x.k === 'turn' || ((x.k === 'technique' || x.k === 'volley') && x.unit === e.unit)) break;
        if (x.k === 'shot' && x.unit === e.unit && !x.thrown) last = j;
      }
      if (last >= 0) set(last, { _loose: Number(e.loose) + (Number((out || evs)[last]._loose) || 0) }); else set(i, { _drawLoose: true });
    }
    if (e.k === 'technique' && !e.refused && TECH_FX[e.id]?.on === 'use') {
      let res: 'hit' | 'miss' | 'use' = 'use';
      for (let j = i + 1; j < evs.length; j++) {
        const x = evs[j];
        if (x.k === 'turn' || (x.k === 'technique' && x.unit === e.unit)) break;
        if (x.k === 'save' && (x.tech === e.id || !x.tech)) { res = x.ok ? 'miss' : 'hit'; break; }
        if (x.k === 'melee_fx' && x.unit === e.unit && !x.refused && x.beat !== 'fall') { res = x.ok === false || x.won === false ? 'miss' : 'hit'; break; }
        if (x.k === 'shove' && x.unit === e.unit) { res = x.ok ? 'hit' : 'miss'; break; }
      }
      set(i, { _out: res });
    }
  }
  return out || evs;
}
/** The time between a volley's rounds drawn here (ms at Fast): a Burst's three in rhythm. */
export const LOOSE_GAP = 85;
/** The extra stage a shot holds for the rounds it draws after its own (ms at Fast). */
export function techExtraBeat(e: { k: string; _loose?: number; [x: string]: any }, drawnHere = true): number {
  return e.k === 'shot' && drawnHere && Number(e._loose) > 0 ? Number(e._loose) * LOOSE_GAP : 0;
}

// ---------- the handlers ----------
export interface TechKit {
  at(k: string | null | undefined): Pt | null;
  posOf(id: string | null | undefined): string | undefined;
  tokOf(id: string | null | undefined, fallback?: string): HTMLElement | null;
  play(s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number }): void;
  sawThen(e: FxEvent): boolean;
  /** when a shot's round lands (ms at Fast from the event's start) */
  landsIn(e: FxEvent): number;
  gunOf(id: string, cat: string): { sound: Sfx | null; rate?: number; look: string; color?: string };
  muzzle(from: Pt, to: Pt, color?: string): { x: number; y: number };
  projectile(a: { x: number; y: number }, b: { x: number; y: number }, ms: number, look: any, s: number, color?: string): void;
  missPoint(from: Pt, to: Pt): { x: number; y: number };
  /** does one recording cover this volley's rounds (a gun's burst rattle)? then the extra rounds draw silent */
  rattles(e: FxEvent): boolean;
  /** does fx/ranged.ts draw this shot's loose rounds itself (Suppress)? */
  drawsOwnLoose(e: FxEvent): boolean;
}
type H = (e: FxEvent) => void;
const unitDir = (a: Pt | null, b: Pt): { x: number; y: number } => { if (!a) return { x: 1, y: 0 }; const d = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / d, y: (b.y - a.y) / d }; };
/** The test hook (e2e/fx-sweep.mjs, the unit tests): which row played, with which outcome. */
function record(key: string, outcome: string) {
  if (typeof window === 'undefined') return;
  const w = window as any, list: { key: string; outcome: string; at: number }[] = (w.__phcTechFx ||= []);
  list.push({ key, outcome, at: Math.round(performance.now()) }); if (list.length > 200) list.splice(0, list.length - 200);
}

/** Play a row's attack now and its result at `land` ms. */
export function playRow(key: string, r: TechRow, c0: Omit<PartCtx, 'scale' | 'outcome' | 'delay'>, outcome: PartCtx['outcome'], land: number, o: { attack?: boolean; wide?: boolean } = {}) {
  const crit = outcome === 'crit', c: PartCtx = { ...c0, delay: 0, outcome, scale: crit ? 1.35 : 1 };
  // a melee miss: the stroke itself goes past (a third of a tile to the side), so the swing reads as a miss before its word
  const ca: PartCtx = o.wide ? { ...c, b: { ...c.b, x: c.b.x - c.dir.y * c.s * 0.38, y: c.b.y + c.dir.x * c.s * 0.38 } } : c;
  const go = (parts: PartRef[], t0: number, k: Partial<PartCtx> = {}, base = c) => {
    for (const [n, params] of parts) { const t = t0 + (typeof params.t === 'number' ? params.t : 0), cc = { ...base, ...k }; if (t > 0) after(() => playPart(n, cc, params), t); else playPart(n, cc, params); }
  };
  if (o.attack !== false) go(r.attack, 0, {}, ca);
  const res = outcome === 'miss' ? r.miss : r.hit;
  go(res, land, crit ? { ink: WHITE } : {});
  if (crit) go(r.crit, land);
  record(key, outcome);
}

export function wrapTechFx(H: Record<string, H>, K: TechKit) {
  const base: Record<string, H> = { ...H };
  const strike = (e: any, melee: boolean) => {
    const key = rowKey(e); const r = key ? TECH_FX[key] : null; if (!r || !key || e.object) return;
    const b = K.at(e.to); if (!b) return;
    const a = K.at(e.from), outcome: PartCtx['outcome'] = r.noRoll ? 'hit' : e.hit ? (e.crit ? 'crit' : 'hit') : 'miss';
    const ink = key.startsWith('move:lumeri') ? VIRTUE : inkOf(e.weapon, !melee);
    const vi = Number(e.vi) || 0, first = !(r.once && vi > 0);
    const land = melee ? 120 : Math.max(60, K.landsIn(e));
    playRow(key, r, { a, b, dir: unitDir(a, b), s: b.s, ink, weapon: e.weapon, strikes: Number(e.strikes) || vi + 1 }, outcome, land, { attack: first, wide: melee && outcome === 'miss' });
  };
  H.melee = (e: any) => { base.melee(e); try { strike(e, true); } catch { /* never breaks the queue */ } };
  H.shot = (e: any) => {
    base.shot(e);
    try { strike(e, false); } catch { /* never */ }
    if (Number(e._loose) > 0 && !K.drawsOwnLoose(e)) { try { looseRounds(e, Number(e._loose)); } catch { /* never */ } }
  };
  H.technique = (e: any) => {
    base.technique?.(e);
    if (e.refused) return;
    const key = rowKey(e); const r = key ? TECH_FX[key] : null; if (!r || !key) return;
    try {
      const a = K.sawThen(e) ? K.at(e.at) : null, tk = e.target ? K.posOf(e.target) : e.tile || null, bt = tk ? K.at(tk) : null, b = bt || a;
      if (!b || (tk && !bt && TECH_FX[key].miss.length)) return; // its target out of sight: nothing drawn round the user instead
      const outcome = e._out === 'miss' ? 'miss' : e._out === 'hit' ? 'hit' : 'use';
      playRow(key, r, { a, b, dir: a && b !== a ? unitDir(a, b) : { x: 1, y: 0 }, s: b.s, ink: inkOf(e.weapon, e.system === 'ranged'), weapon: e.weapon }, outcome, 150);
    } catch { /* never */ }
  };
  const onEvent = (k: 'shove' | 'anchor') => (e: any) => {
    base[k]?.(e);
    const key = rowKey(e); const r = key ? TECH_FX[key] : null; if (!r || !key) return;
    try {
      const a = K.at(K.posOf(e.unit) || (k === 'anchor' ? e.at : undefined)), b = K.at(k === 'anchor' ? K.posOf(e.target) : e.to) || null; if (!b) return;
      const outcome = k === 'shove' ? (e.ok ? 'hit' : 'miss') : 'hit';
      playRow(key, r, { a, b, dir: unitDir(a, b), s: b.s, ink: k === 'anchor' ? ATTR_INK.endurance : ATTR_INK.strength }, outcome, 110);
    } catch { /* never */ }
  };
  H.shove = onEvent('shove'); H.anchor = onEvent('anchor');

  /** The rounds a roll accounts for beyond its own: each its muzzle flash, tracer, casing and (with no recording over
   *  the volley) its bang, LOOSE_GAP apart after the roll's own; on the target when the roll hit, wide when it missed. */
  function looseRounds(e: any, n: number) {
    const from = K.at(e.from), toP = centre(e.to); if (!toP) return;
    const g = K.gunOf(e.weapon || '', e.cat || ''), br = brassOf(e.weapon || '', e.cat || ''), quiet = K.rattles(e);
    const tok = from ? K.tokOf(e.unit, e.from) : null, aim = from ? angle(from, toP) : 0;
    for (let i = 1; i <= n; i++) after(() => {
      trace('round', { unit: e.unit, loose: true });
      if (!quiet && g.sound) K.play(g.sound, from || toP, { rate: (g.rate || 1) * (0.96 + Math.random() * 0.08) });
      if (!from) return;
      const m = g.look === 'bullet' || g.look === 'pellets' || g.look === 'bolt' ? K.muzzle(from, toP, g.color) : { x: from.x, y: from.y };
      const end = e.hit ? { x: toP.x + (Math.random() - 0.5) * toP.s * 0.25, y: toP.y + (Math.random() - 0.5) * toP.s * 0.25 } : K.missPoint(from, toP);
      K.projectile(m, end, Math.max(60, Math.min(320, Math.hypot(end.x - m.x, end.y - m.y) / 2.2)), g.look === 'pellets' ? 'bullet' : g.look, toP.s, g.color);
      if (tok && br.when === 'shot') ejectShell(whoOf(tok), br.shell, aim);
      // its own trail in the technique's ink (the row's attack), so each round of the volley shows
      const key = rowKey(e), r = key ? TECH_FX[key] : null, b = K.at(e.to);
      if (r && b) for (const [n2, q] of r.attack) if (n2 === 'tracer') playPart(n2, { a: from, b, dir: { x: Math.cos(aim), y: Math.sin(aim) }, s: b.s, ink: inkOf(e.weapon, true), scale: 1, delay: 0, outcome: e.hit ? 'hit' : 'miss' }, { ...q, side: i % 2 ? -1 : 1 });
    }, i * LOOSE_GAP);
  }
}
export { HP };
