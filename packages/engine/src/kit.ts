// THE KIT (engine foundations 1, review finding F6): the small helpers every lane file used to write for itself.
// One meaning each. If you need "the tiles around X", "can a unit stand here", "the enemies of this unit", "is this
// the area map", "the rng of this action" or "the unit with this id": it is here. Do not write a private copy in a
// lane file (test/lint-foundations.test.ts fails on the old one-liners).
//
//   PRELUDE     overworld, inFight, say, unitById, tileOf, rngOf
//   GRID        tilesAround, tilesLine, inBounds, landBlockers, canStand
//   SELECTORS   units, foesOf, alliesOf
import type { Combat, Unit } from './combat';
import { keyOf, key, xy, dist, moveBlockers, unitSees } from './combat';
import { boundGame } from './effects/hooks';
import type { Rng } from './rng';

// =================================================================================================== prelude
/** Is this "fight" the area map (the scratch fight built for every action outside a real fight)? */
export const overworld = (cb: Combat | null | undefined): boolean => !!cb && !!(cb.overworld || cb.name === 'overworld');
/** A real fight (not the area map), with a unit in it. */
export const inFight = (h: { cb?: Combat | null; u?: Unit | null }): boolean => !!h.cb && !!h.u && !overworld(h.cb);
/** Write a line in the fight log (nothing when there is no fight). */
export const say = (cb: Combat | null | undefined, line: string): void => { if (cb) cb.log.push(line); };
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
  /** Units that surrendered too. */ surrendered?: boolean;
  /** false: leave Hidden units out. */ hidden?: boolean;
  /** false: leave companions (a drone, a beast, a summon with `companion`) out. */ companions?: boolean;
  /** false: leave False Images out. */ images?: boolean;
  /** Only units within this many tiles of `from` (default: of the unit asked about). */ within?: number; from?: string;
  /** Only units this unit sees (line of sight and Vision). */ seenBy?: Unit;
  /** alliesOf only: the unit itself too. */ self?: boolean;
}
function counts(cb: Combat, v: Unit, o: Who, from: string): boolean {
  if (v.dead || (v.downed && !o.downed) || (v.surrendered && !o.surrendered)) return false;
  if (o.hidden === false && v.hidden) return false;
  if (o.companions === false && v.companion) return false;
  if (o.images === false && (v as any).ghostOf) return false;
  if (o.within != null && dist(v.pos, o.from || from) > o.within) return false;
  if (o.seenBy && !unitSees(cb, o.seenBy, v.pos)) return false;
  return true;
}
/** The units of the other side. See `Who` for what counts by default and how to ask for more or less. */
export const foesOf = (cb: Combat, u: Unit, o: Who = {}): Unit[] => cb.units.filter((v) => v.side !== u.side && counts(cb, v, o, u.pos));
/** The OTHER units of this unit's side (o.self: the unit too). See `Who`. */
export const alliesOf = (cb: Combat, u: Unit, o: Who = {}): Unit[] => cb.units.filter((v) => v.side === u.side && (o.self || v !== u) && counts(cb, v, o, u.pos));

// ---------- work counters (tests only read them) ----------
/** How much work the planners did: a count per name, raised by work('<name>') at the top of a costly function
 * (planEvoke, previewOutburstPlan, paths). A test that used to assert milliseconds asserts these instead: a count is
 * the same on a loaded machine. Nothing in the rules reads it. */
export const WORK: Record<string, number> = {};
export const work = (what: string): void => { WORK[what] = (WORK[what] || 0) + 1; };
/** Run fn and return what it counted (the counters are put back as they were). */
export function counted<T>(fn: () => T): { ret: T; work: Record<string, number> } {
  const was = { ...WORK }; for (const k of Object.keys(WORK)) delete WORK[k];
  try { const ret = fn(); return { ret, work: { ...WORK } }; } finally { for (const k of Object.keys(WORK)) delete WORK[k]; Object.assign(WORK, was); }
}
