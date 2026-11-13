// Seeded PRNG (mulberry32). The state is one 32-bit integer kept inside the game state, so the same seed and the
// same actions always give the same rolls: replays, saves and multiplayer sync stay exact.
export interface Rng { state: number }

/** The next number of a stream, in [0, 1); it advances the stream. */
export function next(r: Rng): number {
  let t = (r.state = (r.state + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A tap for tests: every die rolled, as (sides, value). Never set in the game. test/helpers/roll-digest.ts uses it to
 * prove that a refactor rolls the same dice in the same order. */
export const ROLL_TAP: { f?: ((sides: number, value: number) => void) | null } = {};
/** A die of `sides` faces (1 to sides) from the stream; the tap above sees it. Inside a fight, roll through rolls.ts. */
export const die = (r: Rng, sides: number) => { const v = 1 + Math.floor(next(r) * sides); if (ROLL_TAP.f) ROLL_TAP.f(sides, v); return v; };
/** A d20 from the stream (only rolls.ts calls it: the lint `raw_d20`). */
export const d20 = (r: Rng) => die(r, 20);
/** A 32-bit seed from a string (FNV-1a): the room seed of a game, the base of every named stream. */
export const seedFrom = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h | 0; };
/** A named seeded stream (Survival rule 12): the same seed and key always give the same stream, and content generation
 * (a stage's path map, a node's encounter, offers and stock) never consumes a fight's dice in `g.rng`. */
export const rngFor = (seed: string | number, key: string): Rng => ({ state: seedFrom(String(seed) + '#' + key) });
