// Seeded PRNG (mulberry32). The state is one 32-bit integer kept inside the game state, so the same seed and the
// same actions always give the same rolls: replays, saves and multiplayer sync stay exact.
export interface Rng { state: number }

export function next(r: Rng): number {
  let t = (r.state = (r.state + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const die = (r: Rng, sides: number) => 1 + Math.floor(next(r) * sides);
export const d20 = (r: Rng) => die(r, 20);
export const seedFrom = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h | 0; };
