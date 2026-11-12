// THE KIT (engine foundations 1, review finding F6): the small helpers every lane file used to write for itself.
// One meaning each. If you need "the tiles around X", "can a unit stand here", "the enemies of this unit", "is this
// the area map", "the rng of this action" or "the unit with this id": it is here. Do not write a private copy in a
// lane file (test/lint-foundations.test.ts fails on the old one-liners).
//
//   PRELUDE     overworld, inFight, say, unitById, tileOf, rngOf
//   GRID        tilesAround, tilesLine, inBounds, landBlockers, canStand
//   SELECTORS   units, foesOf, alliesOf
import type { Combat, Unit } from './combat';
import { keyOf } from './combat';
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
