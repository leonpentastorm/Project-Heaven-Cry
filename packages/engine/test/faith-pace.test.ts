// Faith 2.1 pace (design docs/design/faith-2.1-spec.md section 6; spec item 717): a seeded "typical session" run for
// 30 sessions with the engine's own XP functions and caps (tagDevotion and its tag caps, shiftDevotion, the Narrator's
// narratorDevotion and its session cap, the rites' once-a-session rule), asserting Leon's pace table: Devotion 5 in
// sessions 3-4 (±1), 7 in sessions 8-10 (±1), 10 at 20+ sessions (never before session 20; on average after 21).
//
// The typical session (PROVISIONAL, item 717): 2-4 fights (about 3) and 2-4 scenes out of fights (about 3); in each
// fight a vow is sworn 80% of the time and kept 85% of the time it is sworn; each of the patron's 3 liked tags comes up
// in a fight 60% of the time and in a scene 30%; a taboo 10% of fights and 5% of scenes; the engine rite every session
// and the Narrator rite half of them (1-2 rites); one Narrator deed of 2-5 XP.
import { describe, expect, it } from 'vitest';
import {
  apply, die, d20, setDevotionXp, devotionThreshold, tagDevotion, shiftDevotion, narratorDevotion, narratorRite,
  DEVOTION_XP, FAITH_PATRON, type GameState, type Rng,
} from '../src';
import { storyWith, withGame } from './helpers/perkfight';

const pct = (rng: Rng, p: number) => d20(rng) <= Math.round(p * 20);

/** Run 30 sessions; the level at the end of each session (index 0 = session 1). */
function simulate(seed: number, patron = 'nerukhan'): number[] {
  const s = storyWith([{ name: 'Pilgrim', skills: { faith: 5 } }], 'PACE' + seed);
  let g: GameState = s.g; const id = s.chars[0].id;
  { const c = g.characters[id]; c.belief = { kind: 'faithful', patron }; c.patron = patron; setDevotionXp(c, devotionThreshold(3)); }
  const p = FAITH_PATRON[patron], likes: string[] = p.likes, taboos: string[] = p.taboos;
  const engineRite = p.rites.find((r: any) => r.engine), narrRite = p.rites.find((r: any) => !r.engine);
  const rng: Rng = { state: 7919 * seed + 13 };
  const out: number[] = [];
  for (let n = 1; n <= 30; n++) {
    if (n > 1) g.sessionN = (g.sessionN || 1) + 1;
    const fights = 1 + die(rng, 3), scenes = 1 + die(rng, 3);
    // Out of fights: the scenes (a new scene number each), the engine rite from its button, the Narrator's rite and deed.
    for (let k = 0; k < scenes; k++) {
      g.story.scene.n += 1;
      withGame(g, () => {
        const c = g.characters[id];
        for (const t of likes) if (pct(rng, 0.3)) tagDevotion(g, null, c, t, {});
        if (pct(rng, 0.05)) tagDevotion(g, null, c, taboos[die(rng, taboos.length) - 1], {});
      });
      if (k === 0) g = apply(g, { type: 'faith/rite', charId: id, id: engineRite.id } as any, 'host');
    }
    withGame(g, () => {
      const c = g.characters[id];
      if (pct(rng, 0.5)) narratorRite(g, c, narrRite.id);
      narratorDevotion(g, c, DEVOTION_XP.deedMin - 1 + die(rng, DEVOTION_XP.deedMax - DEVOTION_XP.deedMin + 1), 'a deed');
      // The fights: a vow, the liked tags as they come (once each a fight, capped), a taboo now and then.
      for (let f = 0; f < fights; f++) {
        const fight = 'S' + n + 'F' + f;
        for (const t of likes) if (pct(rng, 0.6)) tagDevotion(g, null, c, t, { fight });
        if (pct(rng, 0.1)) tagDevotion(g, null, c, taboos[die(rng, taboos.length) - 1], { fight });
        if (pct(rng, 0.8)) { if (pct(rng, 0.85)) shiftDevotion(g, null, c, DEVOTION_XP.vowKept, 'vow kept'); else shiftDevotion(g, null, c, -DEVOTION_XP.vowBroken, 'vow broken'); }
      }
    });
    out.push(g.characters[id].devotion ?? 0);
  }
  return out;
}
/** The first session (1-based) that ends at or above a level. */
const reach = (levels: number[], lv: number) => levels.findIndex((x) => x >= lv) + 1 || Infinity;

describe('the pace of Devotion (a seeded 30-session simulation, item 717)', () => {
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const runs = seeds.map((sd) => ({ sd, levels: simulate(sd) }));
  it('Devotion 5 in sessions 3-4 (±1), 7 in sessions 8-10 (±1), 10 not before session 20 (and by session 30)', () => {
    for (const { sd, levels } of runs) {
      const r5 = reach(levels, 5), r7 = reach(levels, 7), r10 = reach(levels, 10);
      const why = 'seed ' + sd + ': ' + levels.join(' ');
      expect(r5, why).toBeGreaterThanOrEqual(2); expect(r5, why).toBeLessThanOrEqual(5);
      expect(r7, why).toBeGreaterThanOrEqual(7); expect(r7, why).toBeLessThanOrEqual(11);
      expect(r10, why).toBeGreaterThanOrEqual(20); expect(r10, why).toBeLessThanOrEqual(30);
    }
  });
  it('on average it lands in the middle of the targets', () => {
    const avg = (lv: number) => runs.reduce((a, r) => a + reach(r.levels, lv), 0) / runs.length;
    expect(avg(5)).toBeGreaterThanOrEqual(3); expect(avg(5)).toBeLessThanOrEqual(4.5);
    expect(avg(7)).toBeGreaterThanOrEqual(8); expect(avg(7)).toBeLessThanOrEqual(10.5);
    expect(avg(10)).toBeGreaterThan(21);
  });
  it('is deterministic (the same seed, the same levels)', () => { expect(simulate(3)).toEqual(simulate(3)); });
});
