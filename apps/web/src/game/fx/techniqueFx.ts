// Every physical technique's own animation, as a table: technique id → the parts it plays (fx/techniqueParts.ts) and
// their parameters. Leon, 12 Nov 2026: "every technique that doesn't have its own unique SVG animation to have one".
// Each row is:
//   attack: the technique's own gesture, if it has one (a thrust, a chop, the weapon biting, the sight settling on the
//     target, a cone of fire arriving), played hit or miss;
//   hit / crit: what it does to the target (a crit is the hit made bigger, in white, with a starburst).
// Leon, 13 Nov 2026, on live 0.25.0: "disable the yellow lines effect when shooting, the half circle effect when
// meleeing, the miss shot effect and the melee miss effect … Just keep the slash effect on hit, and change the effect
// for shots to a bullet hole." So: no `tracer` part (the yellow line per round), no arc swept on a swing, and a miss
// draws nothing (the word MISS is the whole of it). A shot that hits leaves the weapon's mark: the rows name the part
// `round`, and the weapon's family picks what it is (shotMarkOf, read from the weapon's `ammo` in the data: a bullet
// hole, a shotgun's pellet cluster, an arrow's or a bolt's shaft; nothing for a launcher, a flamer or a thrown weapon,
// whose landing is their own). Leon, 14 Nov 2026: only those four went and that one came; every technique's own
// effect stays as it was before 13 Nov (Heavy Bolt's, Punch Through's and Dead Centre's `heavy`, Rake's and Mag
// Dump's `cone`, their hit parts; the sights' `aim` stays a ring on the target, its old yellow line being one of the four), with the hole added to a hit and the plain Shot's cross become
// the hole.
// A new technique is one row. The test (techniqueFx.test.ts) walks every technique in the data and every physical class
// move, and fails if one has no row, if a row names a part that doesn't exist, or if two rows are the same.
//
// When it plays: a strike row on each of its strikes (the engine marks a technique's melee and shot events with `tech`,
// a class move's with `move`; a plain attack plays Cut's or Shot's row); a use row (no strike of its own: a Guard, a
// Bead, a Trip) on its technique event, its result read ahead from what followed in the same action (a save made, a
// beat refused). The attack starts with the event; the result lands with the impact (a swing's 120 ms, a round's
// flight), so nothing lands before its number, and every part is done well inside the beat.
//
// Bullet holes drawn = rounds that hit; casings = rounds spent (Leon, 12 Nov 2026: "Burst eats 3 ammo but shoots only
// 2 bullet VFX"; the rule became this on 13 Nov). The engine counts the rounds a volley spent with no roll of their own
// on the volley event (`loose`, combat.ts noteLoose); techPrepass hands them to the volley's last roll, and this file
// fires each as its own round (its muzzle flash, its bullet in flight, its casing, its own bang), one
// LOOSE_GAP after the other, and puts its mark on the target when that roll hit. A double barrel's both barrels are
// two shells: two blasts, one-two, and two pellet clusters. Full auto's spray, Mag Dump's stream and Suppress's extra
// rounds are fired at nobody in particular: casings, no holes.
import type { FxEvent } from '@engine';
import { SKILLS, WEAPONS, hitsWith } from '@engine';
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
  attack: PartRef[]; hit: PartRef[]; crit: PartRef[];
  /** strike: on each melee or shot event of it; use: on its technique event; shove / anchor: on that event */
  on: 'strike' | 'use' | 'shove' | 'anchor';
  /** a multi-target stroke drawn once (Sweep's arc): the attack plays on the first strike only */
  once?: boolean;
  /** a round fired with no roll (a Warning Shot, Flush, Rout): its result is what it meant to do, and it leaves no hole */
  noRoll?: boolean;
  /** the user's own stance or step (a Guard, a Bead, a Shift): drawn round the user even when its target is unseen */
  own?: boolean;
}
const p = (name: string, o: PartParams = {}): PartRef => [name, o];
const row = (attack: PartRef[], hit: PartRef[], crit: PartRef[] = [p('star')], more: Partial<TechRow> = {}): TechRow => ({ attack, hit, crit, on: 'strike', ...more });
const use = (attack: PartRef[], hit: PartRef[], more: Partial<TechRow> = {}): TechRow => ({ attack, hit, crit: [], on: 'use', ...more });
const own = { own: true };
// A shot's hit names `round`: the weapon's own mark where it hits (the part plays what shotMarkOf says).

// One row each. (tools/technique_fx_inventory.py reads this table: keep each row on one line.)
export const TECH_FX: Record<string, TechRow> = {
  // ----- melee: openers -----
  lunge: row([p('dashes', { len: 0.7 }), p('thrust', { len: 0.25 })], [p('cross', { n: 1, size: 0.22 })]),
  charge: row([p('thrust', { w: 0.11, len: 0.5, draw: 60 }), p('dashes', { len: 1.1 })], [p('chevrons', { n: 2 }), p('ring', { r: 0.5 })], [p('star', { n: 10 })]),
  feint: use([p('jab', { count: 1, gap: 0 })], [p('bracket', { r: 0.5 })]),
  draw_cut: row([], [p('cross', { n: 1, size: 0.3 })]),
  ambush: row([p('thrust', { w: 0.09, len: 0.45, draw: 50 })], [p('cross', { n: 2, size: 0.2 }), p('brand', { shape: 'eye' })], [p('star', { n: 12 })]),
  // ----- melee: strikes -----
  cut: row([], [p('cross', { n: 1 })]),
  sweep: row([p('sweep', { span: 150 })], [p('cross', { n: 1, size: 0.2 })], [p('star')], { once: true }),
  bash: row([p('jab', { count: 2 })], [p('chevrons', { n: 1 }), p('ring', { r: 0.35 })]),
  sunder: row([p('weapon', { move: 'chop' }), p('chop', { w: 0.1 })], [p('crack', { n: 3 })]),
  flurry: row([], [p('pips'), p('cross', { n: 1, size: 0.18 })]),
  hamstring: row([], [p('drops', { n: 2 }), p('brand', { shape: 'chevron', up: -0.45, side: 0 })]),
  bind: use([p('hook', { w: 0.07 })], [p('bracket', { r: 0.42 })]),
  half_sword: row([p('thrust', { w: 0.05, len: 0.45, draw: 60 })], [p('crack', { n: 1 })]),
  throw: row([p('aim', { dash: '6 5', size: 0.5 })], [p('cross', { n: 1, size: 0.24 })]),
  pull_out: use([p('hook', { w: 0.1 })], [p('drops', { n: 3 })]),
  // ----- melee: links -----
  sidestep: use([p('dashes', { len: 0.8, side: -1 })], [p('ring', { at: 'a', r: 0.45, from: 0.6, to: 1.1 })], own),
  guard: use([p('guard', { span: 100 })], [p('ring', { at: 'a', r: 0.5, dash: '3 4', from: 1.3 })], own),
  shove: use([p('bash', { half: 0.4 })], [p('chevrons', { n: 2 }), p('streak', { n: 3 })]),
  trip: use([p('hook', { low: 0.3, w: 0.08 })], [p('stomp', { rings: 2 })]),
  drag: use([p('hook', { w: 0.08 })], [p('chevrons', { n: 1, back: true }), p('streak', { n: 2, len: 0.5 })]),
  // ----- melee: finishers -----
  coup: row([p('chop', { h: 1.15 })], [p('cross', { n: 2 }), p('crack', { n: 1 })], [p('star', { n: 10 })]),
  cleave: row([], [p('cross', { n: 1, size: 0.32 })]),
  break: row([p('chop', { w: 0.2, h: 1.1 })], [p('crack', { n: 5 })], [p('star', { n: 12 })]),
  run_through: row([p('thrust', { w: 0.09, len: 1.0 })], [p('cross', { n: 1, size: 0.2 }), p('drops', { n: 1 })]),
  throw_down: use([p('hook', { w: 0.12 })], [p('stomp', { rings: 3 })]),
  // ----- melee: answers -----
  parry: use([p('guard', { span: 70 })], [p('ring', { at: 'a', r: 0.4 })]),
  riposte: row([p('guard', { span: 60 })], [p('cross', { n: 1, size: 0.2 })]),
  keep_back: row([p('thrust', { len: 0.05, w: 0.08 })], [p('chevrons', { n: 1 }), p('bracket', { r: 0.55 })]),
  // ----- melee: the shield -----
  shield_bash: row([p('bash')], [p('chevrons', { n: 1 }), p('ring', { r: 0.42 })]),
  raise_shield: use([p('guard', { span: 120, double: true })], [p('ring', { at: 'a', r: 0.6, from: 0.8 })], own),
  grapple: use([p('hook', { low: 0.1, w: 0.11 })], [p('bracket', { r: 0.36 })]),
  shield_wall: use([p('guard', { span: 150, double: true })], [p('ring', { at: 'a', r: 0.7, dash: '6 3' })], own),
  interpose: use([p('guard', { span: 90 }), p('dashes', { len: 0.5 })], [p('ring', { at: 'a', r: 0.55 })], own),

  // ----- ranged: fire -----
  shot: row([], [p('round')]),
  snap_shot: row([], [p('round'), p('ring', { r: 0.3 })]),
  burst: row([], [p('round'), p('ticks', { n: 2, r: 0.4 })]),
  aimed_shot: row([p('aim')], [p('round'), p('cross', { n: 2, size: 0.18 })], [p('star', { n: 10 })]),
  called_shot: row([p('aim', { dash: '2 3' })], [p('round'), p('brand', { shape: 'target', up: 0, size: 0.16 })]),
  walking_fire: row([p('dashes', { len: 0.9 })], [p('round'), p('cross', { n: 1, size: 0.18 })]),
  punch_through: row([p('heavy', { past: 0.9, w: 0.1 })], [p('round'), p('crack', { n: 2 })]),
  lob: row([p('ring', { r: 0.8, dash: '4 4', from: 1.3 })], [p('stomp', { rings: 3 })]),
  heavy_bolt: row([p('heavy', { w: 0.2 })], [p('round'), p('crack', { n: 2 }), p('chevrons', { n: 1 })]),
  // ----- ranged: press -----
  suppress: row([p('ticks', { n: 4 })], [p('round'), p('brand', { shape: 'chevron', up: -0.5, side: 0 })]),
  rake: row([p('cone', { span: 50 })], [p('round'), p('cross', { n: 1, size: 0.18 })]),
  warning_shot: row([], [p('brand', { shape: 'bar', up: 0.8, side: -0.6 })], [], { noRoll: true }),
  flush: row([], [p('crack', { n: 2 }), p('streak', { n: 2 })], [], { noRoll: true }),
  mag_dump: row([p('cone', { span: 24 }), p('ticks', { n: 6, gap: 35 })], [p('round'), p('cross', { n: 2, size: 0.22 })]),
  crossfire: row([p('aim', { dash: '5 3' })], [p('round'), p('brand', { shape: 'cross' })]),
  // ----- ranged: set -----
  bead: use([p('aim', { dash: '2 4' })], [p('bracket', { r: 0.6 })], own),
  spot: use([p('aim', { dash: '1 4' })], [p('brand', { shape: 'eye' })], own),
  brace: use([p('guard', { span: 160 })], [p('stomp', { rings: 1 })], own),
  load_special: use([p('ring', { at: 'a', r: 0.35, from: 0.5, to: 1 })], [p('ring', { at: 'a', r: 0.55, dash: '2 3' })], own),
  shift: use([p('dashes', { len: 0.9 })], [p('ring', { at: 'a', r: 0.4, dash: '4 3', from: 1.2 })], own),
  vent: use([p('ticks', { n: 3, r: 0.4 })], [p('ring', { at: 'a', r: 0.45, from: 1.4, to: 0.8 })], own),
  head_down: use([p('stomp', { rings: 1 })], [p('ring', { at: 'a', r: 0.5, from: 1.4, to: 0.7 })], own),
  // ----- ranged: take -----
  dead_centre: row([p('aim'), p('heavy', { w: 0.1, past: 0.3 })], [p('round'), p('brand', { shape: 'target', up: 0 }), p('cross', { n: 2, size: 0.2 })], [p('star', { n: 12 })]),
  pin_down: row([], [p('round'), p('brand', { shape: 'bar', up: -0.5, side: 0 }), p('stomp', { rings: 1 })]),
  rout: row([], [p('streak', { n: 3, len: 0.9 })], [], { noRoll: true }),
  stopping_shot: row([], [p('round'), p('chevrons', { n: 2 }), p('streak', { n: 2 })]),
  storm: row([p('dashes', { len: 1.2 })], [p('round'), p('cross', { n: 1, size: 0.2 }), p('ring', { r: 0.4 })]),
  last_round: row([p('ring', { at: 'a', r: 0.35 })], [p('round'), p('cross', { n: 2, size: 0.16 })], [p('star', { n: 6 })]),
  // ----- ranged: watch (each fires a shot of its own when it springs) -----
  overwatch: row([p('aim', { dash: '3 3' })], [p('round'), p('cross', { n: 1, size: 0.2 })]),
  deny: row([p('aim', { dash: '6 2' })], [p('round'), p('bracket', { r: 0.45 })]),
  cover_me: row([p('ticks', { n: 3 })], [p('cross', { n: 1, size: 0.18 })], [], { noRoll: true }),
  dead_to_rights: row([p('aim')], [p('round'), p('brand', { shape: 'target', up: 0, size: 0.22 })]),

  // ----- class moves that are physical attacks (data/classes.json; the engine marks their events with `move`) -----
  'move:fighter.lunge': row([p('dashes', { len: 1.0 }), p('thrust', { len: 0.45, w: 0.08 })], [p('cross', { n: 1 }), p('ring', { r: 0.4 })]),
  'move:fighter.finisher': row([p('chop', { h: 1.25, w: 0.18 })], [p('cross', { n: 2, size: 0.3 }), p('crack', { n: 2 })], [p('star', { n: 14 })]),
  'move:fighter.shove': { attack: [p('bash', { half: 0.36 })], hit: [p('chevrons', { n: 3 })], crit: [], on: 'shove' },
  'move:defender.anchor': { attack: [p('guard', { span: 160 }), p('ring', { at: 'a', r: 0.5 })], hit: [p('bracket', { r: 0.5, color: '#F65157' })], crit: [], on: 'anchor' },
  // Called Shot (the Operative's, rules 1.32): the technique's own look, with any weapon
  'move:gunslinger.called_shot': row([p('aim', { dash: '2 3' })], [p('round'), p('brand', { shape: 'target', up: 0, size: 0.2 }), p('ring', { r: 0.3 })]),
  'move:lumeri_templar.judgement': row([p('ring', { at: 'a', r: 0.5, color: VIRTUE }), p('chop', { color: VIRTUE })], [p('brand', { shape: 'cross', color: VIRTUE }), p('crack', { n: 2 })], [p('star', { n: 12, color: VIRTUE })]),
};

/** What a weapon's round leaves where it hits, by its ammunition (data/weapons.json `ammo`): a shell's pellets, an
 *  arrow's or a bolt's shaft, nothing for what lands as a blast or a flame; any other cartridge (and a core rifle's
 *  charge) a bullet hole. */
export const AMMO_MARK: Record<string, string | null> = { shell: 'pellets', arrow: 'shaft', bolt: 'shaft', '40 mm grenade': null, rocket: null, 'fuel canister': null };
const WEAPON_BY_ID = new Map((WEAPONS as any[]).map((w) => [w.id, w]));
/** The mark a weapon's round leaves (a part name: 'hole', 'pellets', 'shaft'), or null: a thrown weapon (its landing is
 *  its own: the blade's melee_fx, a grenade's blast), a launcher, a flamer. A weapon not in the data: by its category. */
export function shotMarkOf(weapon: string | undefined, cat: string | undefined): string | null {
  const w = weapon ? WEAPON_BY_ID.get(weapon) : null, c = String(w?.category || cat || '');
  if (c === 'thrown' || /melee|unarmed/.test(c)) return null;
  const ammo = w ? w.ammo : c === 'shotgun' ? 'shell' : c === 'bow' ? 'arrow' : 'round';
  if (!ammo) return null;
  return ammo in AMMO_MARK ? AMMO_MARK[ammo] : 'hole';
}

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
export const partsOf = (r: TechRow) => [...r.attack, ...r.hit, ...r.crit].map(([n]) => n);
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
  /** wide: a shotgun's blast (a short, wide flash) */
  muzzle(from: Pt, to: Pt, color?: string, wide?: boolean): { x: number; y: number };
  missPoint(from: Pt, to: Pt): { x: number; y: number };
  projectile(a: { x: number; y: number }, b: { x: number; y: number }, ms: number, look: any, s: number, color?: string): void;
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

/** Play a row's attack now and its result at `land` ms (a miss: no result; its word is the whole of it). */
export function playRow(key: string, r: TechRow, c0: Omit<PartCtx, 'scale' | 'outcome' | 'delay'>, outcome: PartCtx['outcome'], land: number, o: { attack?: boolean } = {}) {
  const crit = outcome === 'crit', c: PartCtx = { ...c0, delay: 0, outcome, scale: crit ? 1.35 : 1 };
  const go = (parts: PartRef[], t0: number, k: Partial<PartCtx> = {}) => {
    for (const [n, params] of parts) { const t = t0 + (typeof params.t === 'number' ? params.t : 0), cc = { ...c, ...k }; if (t > 0) after(() => playPart(n, cc, params), t); else playPart(n, cc, params); }
  };
  if (o.attack !== false) go(r.attack, 0);
  if (outcome !== 'miss') { go(r.hit, land, crit ? { ink: WHITE } : {}); if (crit) go(r.crit, land); }
  record(key, outcome);
}

export function wrapTechFx(H: Record<string, H>, K: TechKit) {
  const base: Record<string, H> = { ...H };
  const strike = (e: any, melee: boolean) => {
    const key = rowKey(e); const r = key ? TECH_FX[key] : null;
    const mark = melee || e.thrown || r?.noRoll ? null : shotMarkOf(e.weapon, e.cat), land = melee ? 120 : Math.max(60, K.landsIn(e));
    // a round into an object, or into the cover in the way: its mark on that tile, as it lands
    const struck = e.object ? (e.hit ? e.to : null) : !e.hit && e.cover ? e.cover : null;
    if (mark && struck) { const t = K.at(struck); if (t) after(() => playPart('round', { a: K.at(e.from), b: t, dir: unitDir(K.at(e.from), t), s: t.s, ink: WHITE, scale: 1, delay: 0, outcome: 'hit', mark, round: Number(e.vi) || 0 }), land); }
    if (!r || !key || e.object) return;
    const b = K.at(e.to); if (!b) return;
    const a = K.at(e.from), outcome: PartCtx['outcome'] = r.noRoll ? 'hit' : e.hit ? (e.crit ? 'crit' : 'hit') : 'miss';
    const ink = key.startsWith('move:lumeri') ? VIRTUE : inkOf(e.weapon, !melee);
    const vi = Number(e.vi) || 0, first = !(r.once && vi > 0);
    playRow(key, r, { a, b, dir: unitDir(a, b), s: b.s, ink, weapon: e.weapon, strikes: Number(e.strikes) || vi + 1, mark, round: vi }, outcome, land, { attack: first });
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
      if (!b || (tk && !bt && !r.own)) return; // its target out of sight: nothing drawn round the user instead (but its own stance)
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

  /** The rounds a roll accounts for beyond its own: each its muzzle flash, bullet in flight, casing and its
   *  own bang, LOOSE_GAP apart after the roll's own; and, when the roll hit, its mark on the target as it lands
   *  (a Burst's three holes one after another, a double barrel's two pellet clusters). */
  function looseRounds(e: any, n: number) {
    const from = K.at(e.from), toP = centre(e.to); if (!toP) return;
    const g = K.gunOf(e.weapon || '', e.cat || ''), br = brassOf(e.weapon || '', e.cat || '');
    const tok = from ? K.tokOf(e.unit, e.from) : null, aim = from ? angle(from, toP) : 0;
    const key = rowKey(e), mark = e.hit && !(key && TECH_FX[key]?.noRoll) ? shotMarkOf(e.weapon, e.cat) : null, vi = Number(e.vi) || 0;
    for (let i = 1; i <= n; i++) after(() => {
      trace('round', { unit: e.unit, loose: true });
      if (g.sound) K.play(g.sound, from || toP, { rate: (g.rate || 1) * (0.96 + Math.random() * 0.08) });
      if (tok && br.when === 'shot') ejectShell(whoOf(tok), br.shell, aim);
      if (!from) return;
      const m = g.look === 'bullet' || g.look === 'pellets' || g.look === 'bolt' ? K.muzzle(from, toP, g.color, g.look === 'pellets') : { x: from.x, y: from.y };
      const end = e.hit ? toP : K.missPoint(from, toP), ms = Math.max(60, Math.min(320, Math.hypot(end.x - m.x, end.y - m.y) / 2.2));
      K.projectile(m, end, ms, g.look, toP.s, g.color); // a shell: its pellet cluster
      const b = K.at(e.to);
      if (mark && b) after(() => playPart('round', { a: from, b, dir: { x: Math.cos(aim), y: Math.sin(aim) }, s: b.s, ink: WHITE, scale: 1, delay: 0, outcome: 'hit', mark, round: vi + i }), ms);
    }, i * LOOSE_GAP);
  }
}
export { HP };
