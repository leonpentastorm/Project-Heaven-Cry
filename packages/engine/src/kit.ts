// THE KIT (engine foundations 1, review finding F6): the small helpers every lane file used to write for itself.
// One meaning each. If you need "the tiles around X", "can a unit stand here", "the enemies of this unit", "is this
// the area map", "the rng of this action" or "the unit with this id": it is here. Do not write a private copy in a
// lane file (test/lint-foundations.test.ts fails on the old one-liners).
//
//   PRELUDE     overworld, inFight, say, unitById, tileOf, rngOf
//   GRID        tilesAround, tilesLine, inBounds, landBlockers, canStand
//   SELECTORS   units, foesOf, alliesOf
//   AREAS       Area (burst, aura, cone, line, band), inArea, tilesIn, unitsIn   (engine foundations 2)
import type { Combat, Unit } from './combat';
import { keyOf, key, xy, dist, moveBlockers, unitSees, sideSeesUnit, sightBlockers } from './combat';
import { boundGame, onHook, statQuery, emit, charOfUnit } from './effects/hooks';
import { condOn, endCond } from './magic';
import { holds } from './character';
import './datatext'; // fills the texts' {=placeholders} before any data is read
import RULES_K from '../../../data/rules.json';
import type { Rng } from './rng';

// =================================================================================================== prelude
/** Is this "fight" the area map (the scratch fight built for every action outside a real fight)? */
export const overworld = (cb: Combat | null | undefined): boolean => !!cb && !!(cb.overworld || cb.name === 'overworld');
/** A real fight (not the area map), with a unit in it. */
export const inFight = (h: { cb?: Combat | null; u?: Unit | null }): boolean => !!h.cb && !!h.u && !overworld(h.cb);
/** Write a line in the fight log (nothing when there is no fight): combat.ts's say, the one way to write a line. */
export { say } from './combat';
/** The unit with this id, or null. */
export const unitById = (cb: Combat | null | undefined, id?: string | null): Unit | null => (cb && id ? cb.units.find((x) => x.id === id) || null : null);
/** A tile named by a player or the Narrator ('3,4' or a grid reference 'D5') as a tile key, or null. Tile keys are
 * never negative: '-1,2' is not a tile. */
export const tileOf = (cb: Combat, t?: string | null): string | null => (!t ? null : /^\d+,\d+$/.test(t) ? t : keyOf(t, cb.map));

/** The rng of the action being resolved: the hook's (ctx.rng), else the holder's game's, else the bound game's.
 * It THROWS when none is in reach. It never falls back to a fixed seed: a fixed seed rolls the same die every time
 * and no test notices (review F6.8). A preview that must not move the game's dice passes its own scratch rng. */
export function rngOf(h?: { g?: any } | null, ctx?: { rng?: Rng | null } | null): Rng {
  const r = ctx?.rng || h?.g?.rng || boundGame()?.rng;
  if (!r) throw new Error('No rng in reach: pass the action\'s rng (ctx.rng), or run inside apply() so the game is bound.');
  return r as Rng;
}

// =================================================================================================== grid
/** Is this tile on the map? */
export const inBounds = (cb: Combat, k: string): boolean => { const [x, y] = xy(k); return x >= 0 && y >= 0 && x < cb.map.w && y < cb.map.h; };
/** Every tile within r of a tile (a square of side 2r + 1, the centre included), column by column. Give the fight
 * to drop the tiles off the map; without it the list is raw (a caller that filters by its own area). */
export function tilesAround(k: string, r: number, cb?: Combat | null): string[] {
  const [x, y] = xy(k), out: string[] = [];
  for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { const nx = x + i, ny = y + j; if (cb && (nx < 0 || ny < 0 || nx >= cb.map.w || ny >= cb.map.h)) continue; out.push(key(nx, ny)); }
  return out;
}
/** The straight run of tiles from a to b: one tile a step of the longer axis, the other axis rounded. `a` itself is
 * never in it; `b` is the last tile unless o.end is false ("the tiles BETWEEN the two"). */
export function tilesLine(a: string, b: string, o: { end?: boolean } = {}): string[] {
  const [x0, y0] = xy(a), [x1, y1] = xy(b), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), out: string[] = [];
  for (let i = 1; i <= n - (o.end === false ? 1 : 0); i++) out.push(key(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n)));
  return out;
}
/** THE list of tiles nothing can be moved onto or walk through: the map's solid tiles and every standing object whose
 * kind says `blocks_move` in data/objects.json (a crate, a low wall, a pillar, a barricade, a closed door, a hole, a
 * barrel, a container, a terminal, a turret, a Sigil wall). It is `moveBlockers`: walking and forced movement share
 * it. A broken object and an open door block nothing. */
export const landBlockers = (cb: Combat): Set<string> => moveBlockers(cb);
/** Can a unit stand on this tile: on the map, nothing that blocks movement, and nobody there but `mover` (a Downed
 * body is somebody; a dead one is not). ONE rule for a step, a push, a pull, a throw, a teleport and a swap. Pass
 * `blocked` (landBlockers(cb)) when asking about many tiles. */
export function canStand(cb: Combat, k: string, mover?: Unit | null, blocked: Set<string> = moveBlockers(cb)): boolean {
  return inBounds(cb, k) && !blocked.has(k) && !cb.units.some((v) => v !== mover && !v.dead && v.pos === k);
}
/** What stops a unit from standing on a tile: 'edge' (off the map), 'object' (a solid tile or a blocking object), the
 * unit that is there, or null when it is free. */
export function standBlocker(cb: Combat, k: string, mover?: Unit | null, blocked: Set<string> = moveBlockers(cb)): 'edge' | 'object' | Unit | null {
  if (!inBounds(cb, k)) return 'edge'; if (blocked.has(k)) return 'object';
  return cb.units.find((v) => v !== mover && !v.dead && v.pos === k) || null;
}

// =================================================================================================== selectors
/** Who counts. The defaults are the rule: a unit still in the fight (not dead, not Downed, not surrendered), Hidden
 * or not, a companion or not, a False Image or not. Every exception is named at the call. */
export interface Who {
  /** Downed units too (a body on the ground). */ downed?: boolean;
  /** Dead units too (a wreck: rules 1.34, the Rigger's Salvage and Scrap Turret). */ dead?: boolean;
  /** Units that surrendered too. */ surrendered?: boolean;
  /** false: leave Hidden units out. */ hidden?: boolean;
  /** false: leave companions (a drone, a beast, a summon with `companion`) out. */ companions?: boolean;
  /** false: leave False Images out. */ images?: boolean;
  /** Only units within this many tiles of `from` (default: of the unit asked about). */ within?: number; from?: string;
  /** Only units this unit sees (line of sight and Vision). */ seenBy?: Unit;
  /** Only units this side sees now, shared by its squad (combat.ts sideSeesUnit: the fog's answer; Hidden ones only when
   * always seen). What an AI may act on (rules 1.37). */ seenBySide?: Unit['side'];
  /** alliesOf only: the unit itself too. */ self?: boolean;
}
function counts(cb: Combat, v: Unit, o: Who, from: string): boolean {
  if ((v.dead && !o.dead) || (!v.dead && v.downed && !o.downed) || (v.surrendered && !o.surrendered)) return false;
  if (o.hidden === false && v.hidden) return false;
  if (o.companions === false && v.companion) return false;
  if (o.images === false && (v as any).ghostOf) return false;
  if (o.within != null && dist(v.pos, o.from || from) > o.within) return false;
  if (o.seenBy && !unitSees(cb, o.seenBy, v.pos)) return false;
  if (o.seenBySide && !sideSeesUnit(cb, o.seenBySide, v, false, walls || (walls = sightBlockers(cb)))) return false;
  return true;
}
let walls: Set<string> | null = null; // built once per selector call (foesOf / alliesOf clear it)
/** The units of the other side. See `Who` for what counts by default and how to ask for more or less. */
export const foesOf = (cb: Combat, u: Unit, o: Who = {}): Unit[] => { walls = null; return cb.units.filter((v) => v.side !== u.side && counts(cb, v, o, u.pos)); };
/** The OTHER units of this unit's side (o.self: the unit too). See `Who`. */
export const alliesOf = (cb: Combat, u: Unit, o: Who = {}): Unit[] => { walls = null; return cb.units.filter((v) => v.side === u.side && (o.self || v !== u) && counts(cb, v, o, u.pos)); };

// ---------- work counters (tests only read them) ----------
/** How much work the planners did: a count per name, raised by work('<name>') at the top of a costly function
 * (planEvoke, previewOutburstPlan, paths). A test that used to assert milliseconds asserts these instead: a count is
 * the same on a loaded machine. Nothing in the rules reads it. */
export const WORK: Record<string, number> = {};
/** Count one unit of work under a name (speed tests count work, never milliseconds). */
export const work = (what: string): void => { WORK[what] = (WORK[what] || 0) + 1; };
/** Run fn and return what it counted (the counters are put back as they were). */
export function counted<T>(fn: () => T): { ret: T; work: Record<string, number> } {
  const was = { ...WORK }; for (const k of Object.keys(WORK)) delete WORK[k];
  try { const ret = fn(); return { ret, work: { ...WORK } }; } finally { for (const k of Object.keys(WORK)) delete WORK[k]; Object.assign(WORK, was); }
}

// =================================================================================================== areas
// ONE description of an area and ONE answer to "which tiles" and "who is in it" (engine foundations 2, the rest of
// review finding F6). An area is tiles, nothing more: what blocks sight, who is spared and what the area does are the
// caller's. Distances are the grid's (dist: a diagonal step is one tile), so a radius is a square.
//   burst   every tile within r of a tile, that tile too (a grenade, a Burst, a splash)
//   aura    the same around a unit's tile, its own tile left out
//   cone    from a tile toward a tile or a direction: within n tiles and within about 45 degrees of the line
//           (reach 'round', the default: n + 0.5 as the crow flies, the flamer's and the Wave's; 'square': n by the
//           grid's distance, a Sigil PUSH's)
//   line    the straight run of tiles from a tile toward another, n tiles long (tilesLine; the far tile when n is not given)
//   band    everything ahead of a tile and within `width` of the line to another (full-auto fire)
export type Area =
  | { shape: 'burst'; at: string; r: number }
  | { shape: 'aura'; at: string; r: number }
  | { shape: 'cone'; from: string; toward: string | [number, number]; n: number; reach?: 'round' | 'square' }
  | { shape: 'line'; from: string; toward: string; n?: number }
  | { shape: 'band'; from: string; toward: string; width: number };
/** The cone's cosine: a tile is in the cone when the angle between it and the cone's line is no more than about 45 degrees. */
export const CONE_COS = 0.7;
/** Is tile k inside the area? (No map is asked: a tile off the map can be "in" an area; tilesIn drops those.) */
export function inArea(a: Area, k: string): boolean {
  if (a.shape === 'burst') return dist(a.at, k) <= a.r;
  if (a.shape === 'aura') return k !== a.at && dist(a.at, k) <= a.r;
  if (a.shape === 'line') { const run = tilesLine(a.from, a.toward); return (a.n == null ? run : run.slice(0, a.n)).includes(k); }
  const [fx, fy] = xy(a.from), [x, y] = xy(k), ax = x - fx, ay = y - fy, l = Math.hypot(ax, ay);
  const [dx, dy] = typeof a.toward === 'string' ? (() => { const [tx, ty] = xy(a.toward as string); return [tx - fx, ty - fy]; })() : a.toward, dl = Math.hypot(dx, dy) || 1;
  if (a.shape === 'band') { const along = (ax * dx + ay * dy) / dl; return along > 0 && Math.abs(ax * dy - ay * dx) / dl <= a.width; }
  if (!l || (a.reach === 'square' ? dist(a.from, k) > a.n : l > a.n + 0.5)) return false;
  return (ax * dx + ay * dy) / (l * dl) >= CONE_COS;
}
/** The tiles of an area that are on the map, column by column (a line: nearest first). */
export function tilesIn(cb: Combat, a: Area): string[] {
  if (a.shape === 'line') { const run = tilesLine(a.from, a.toward).filter((k) => inBounds(cb, k)); return a.n == null ? run : run.slice(0, a.n); }
  if (a.shape === 'band') { const out: string[] = []; for (let x = 0; x < cb.map.w; x++) for (let y = 0; y < cb.map.h; y++) if (inArea(a, key(x, y))) out.push(key(x, y)); return out; }
  const c = a.shape === 'cone' ? a.from : a.at, r = a.shape === 'cone' ? a.n : a.r;
  return tilesAround(c, r, cb).filter((k) => inArea(a, k));
}
/** WHO IS IN IT: the units standing in an area (or on any of a list of tiles), of either side. `Who` says who counts
 * (by default a unit still in the fight: not dead, Downed or surrendered); `side`: only that side; `not`: leave these
 * out (the one the blast was aimed at, the caster). In the fight's own order. */
export function unitsIn(cb: Combat, a: Area | string[], o: Who & { side?: Unit['side']; not?: (Unit | null | undefined)[] } = {}): Unit[] {
  const tiles = Array.isArray(a) ? new Set(a) : null; walls = null;
  return cb.units.filter((v) => (tiles ? tiles.has(v.pos) : inArea(a as Area, v.pos)) && (!o.side || v.side === o.side) && !(o.not || []).includes(v) && counts(cb, v, o, v.pos));
}

// ====================================================================================================== ties (P8)
// Classes 3.0 P8 (docs/design/rev4-primitives.md): an edge between two units with a kind (a Bond, an owned unit…):
// cb.ties [{kind, from, to}], oldest first. Each kind is a row of data/rules.json ties.kinds (or added at run time):
// `max` (a holder's base cap; the stat ties_max:<kind> adds to it; no max: no cap), `ends_on` (from_down: the near
// end goes Down; to_down: the far end goes Down; to_dead: the far end dies; unseen_round: the far end has been out of
// the near end's sight for a full round; combat_end) and `on_end` (none, or unmake: the far end is unmade, P9).
/** A tie between two units. `lost`: the round starts in a row its far end was out of the near end's sight (unseen_round). */
export interface Tie { kind: string; from: string; to: string; lost?: number }
/** What ends a tie (a kind's `ends_on`). */
export const TIE_ENDS = ['from_down', 'to_down', 'to_dead', 'unseen_round', 'combat_end'] as const;
/** What happens when a tie ends (a kind's `on_end`). */
export const TIE_ON_END = ['none', 'unmake'] as const;
/** An end rule: a word, or (rules 1.33) {word, side}: only for a tie whose far end is of that side to the near end
 * (foe, ally). */
export type TieEnd = (typeof TIE_ENDS)[number] | { word: (typeof TIE_ENDS)[number]; side?: 'foe' | 'ally' };
/** A kind of tie, as data/rules.json ties.kinds has it. Rules 1.33: `mark`, a condition the far end bears while it is
 * tied by this kind (the Bonded mark): when the last such tie to it ends the mark ends, and when the mark ends (its
 * rounds, a cleanse) every such tie to it ends. `gear`: a focus the near end must carry on its person ({door}), else
 * at a round's start its ties of this kind end (the Attuner leaving your person). */
export interface TieKind { id: string; max?: number; ends_on?: TieEnd[]; on_end?: (typeof TIE_ON_END)[number]; about?: string; mark?: string; gear?: { door: string } }
const TIE_DATA: TieKind[] = (((RULES_K as any).ties?.kinds || []) as TieKind[]);
let TIE_ADDED: TieKind[] = [];
/** The kinds of tie (the data's, then those added at run time: a test's fixture). */
export const tieKinds = (): TieKind[] => [...TIE_DATA, ...TIE_ADDED];
/** A kind of tie by id. */
export const tieKind = (id: string): TieKind | undefined => tieKinds().find((k) => k.id === id);
/** Add tie kinds at run time (tests); clearTieKinds takes them away. */
export function addTieKinds(rows: TieKind[]) { TIE_ADDED = [...TIE_ADDED.filter((k) => !rows.some((r) => r.id === k.id)), ...rows]; }
/** Forget the tie kinds added at run time. */
export function clearTieKinds() { TIE_ADDED = []; }
/** The ties a unit has (as: from, to or any end), of a kind or of every kind. */
export function tiesOf(cb: Combat, u: Unit, kind?: string | null, as: 'from' | 'to' | 'any' = 'any'): Tie[] {
  return (cb.ties || []).filter((t) => (!kind || t.kind === kind) && ((as !== 'to' && t.from === u.id) || (as !== 'from' && t.to === u.id)));
}
/** Is `v` tied to `u` by this kind (as: v is the tie's from end, its to end, or either)? */
export const tiedTo = (cb: Combat, u: Unit, v: Unit, kind: string, as: 'from' | 'to' | 'any' = 'any'): boolean =>
  (cb.ties || []).some((t) => t.kind === kind && ((as !== 'to' && t.from === v.id && t.to === u.id) || (as !== 'from' && t.from === u.id && t.to === v.id)));
/** How many ties of a kind a unit may hold from its end: the kind's max + the stat ties_max:<kind> (Infinity: no max). */
export function tieCap(cb: Combat, u: Unit, kind: string): number {
  const k = tieKind(kind); if (!k || k.max == null) return Infinity;
  return Math.max(0, k.max + statQuery({ u, cb }, `ties_max:${kind}`).add);
}
/** THE door that ties two units (from → to): refused (null) for an unknown kind, a tie that stands, or a holder at its cap. */
export function tie(cb: Combat, from: Unit, to: Unit, kind: string): Tie | null {
  if (!tieKind(kind) || from === to || tiedTo(cb, from, to, kind, 'to')) return null;
  if (tiesOf(cb, from, kind, 'from').length >= tieCap(cb, from, kind)) return null;
  const t: Tie = { kind, from: from.id, to: to.id };
  cb.ties = [...(cb.ties || []), t];
  return t;
}
/** End the ties that match (each kind's on_end runs). Returns how many ended. */
export function untie(cb: Combat, pick: (t: Tie) => boolean): number {
  const gone = (cb.ties || []).filter(pick); if (!gone.length) return 0;
  cb.ties = (cb.ties || []).filter((t) => !gone.includes(t)); if (!cb.ties.length) delete cb.ties;
  // 'tie_end' {cb, tie, unmake}: a tie ended (owned.ts unmakes the far end when its kind says so: P9)
  for (const t of gone) emit(cb, 'tie_end', { cb, tie: t, unmake: tieKind(t.kind)?.on_end === 'unmake' });
  // rules 1.33: a kind's mark ends with the last tie of that kind to its bearer
  for (const t of gone) { const m = tieKind(t.kind)?.mark; if (!m || (cb.ties || []).some((x) => x.kind === t.kind && x.to === t.to)) continue; const v = cb.units.find((x) => x.id === t.to); if (v && condOn(v, m)) endCond(v, m, cb); }
  return gone.length;
}
/** Does this tie's kind end on this word (a plain word, or {word, side} when its far end is of that side to its near end)? */
function tieEnds(t: Tie, w: (typeof TIE_ENDS)[number], cb?: Combat): boolean {
  return !!tieKind(t.kind)?.ends_on?.some((e) => {
    if (typeof e === 'string') return e === w;
    if (e.word !== w) return false; if (!e.side || !cb) return !e.side;
    const a = cb.units.find((x) => x.id === t.from), b = cb.units.find((x) => x.id === t.to); if (!a || !b) return true;
    return e.side === 'foe' ? a.side !== b.side : a.side === b.side;
  });
}
// the end rules, while there are ties: a unit going Down or dying; a round's sight
onHook('on_downed', (ctx: any, cb: Combat) => {
  if (!cb.ties?.length) return; const v: Unit = ctx.victim; if (!v) return;
  // rules 1.33: a unit that answers ties_keep:<kind> keeps its ties of that kind to its own side when it goes Down (not when it dies)
  const keeps = (t: Tie) => !v.dead && cb.units.some((x) => x.id === t.to && x.side === v.side) && statQuery({ u: v, cb }, `ties_keep:${t.kind}`).add > 0;
  untie(cb, (t) => (t.from === v.id && tieEnds(t, 'from_down', cb) && !keeps(t)) || (t.to === v.id && (tieEnds(t, 'to_down', cb) || (!!v.dead && tieEnds(t, 'to_dead', cb)))));
});
// rules 1.33: a kind's mark ends: every tie of that kind to its bearer ends with it
onHook('cond_end', (ctx: any, cb: Combat) => {
  if (!cb?.ties?.length) return; const u: Unit = ctx.u || ctx.t, id: string = ctx.id; if (!u || !id) return;
  const kinds = tieKinds().filter((k) => k.mark === id).map((k) => k.id); if (!kinds.length) return;
  untie(cb, (t) => t.to === u.id && kinds.includes(t.kind));
});
onHook('combat_end', (_ctx: any, cb: Combat) => { if (cb.ties?.length) untie(cb, (t) => tieEnds(t, 'combat_end')); });
onHook('round_start', (_ctx: any, cb: Combat) => {
  if (!cb.ties?.length) return;
  const byId = (id: string) => cb.units.find((x) => x.id === id);
  for (const t of [...cb.ties]) {
    const a = byId(t.from), b = byId(t.to); if (!a || !b) continue;
    // rules 1.33: the kind's focus left its near end's person (the Attuner: its Bonds end at the next round's start)
    const g = tieKind(t.kind)?.gear, c = g ? charOfUnit(a) : null;
    if (g && c && !holds(c, { slot: 'person', door: g.door })) { untie(cb, (x) => x === t); continue; }
    if (!tieEnds(t, 'unseen_round', cb)) continue;
    if (unitSees(cb, a, b.pos)) { delete t.lost; continue; }
    t.lost = (t.lost || 0) + 1; if (t.lost >= 2) untie(cb, (x) => x === t); // out of sight at two round starts in a row: a full round
  }
});
