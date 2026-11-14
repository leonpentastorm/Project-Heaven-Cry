// @ts-nocheck (a measuring tool, like the rest of test/balance)
// Survival's levels by route (rules 1.54 item 9, survival-spec 14.4): every route of stage 1's map, walked with the
// engine's own pay (`nodeXp`, the paid kinds of `run/rewards.ts`) and the shared `xp_total` (`levelForXp`), on many seeds.
// For each map: the route with the most fights (plain, Elite and the gate), a typical route (the median count) and the
// route with the fewest; where each reaches level 3 (the depth, or the Boss), and the level on arriving at the Boss.
//  - THE GUARD (always on): level 3 never comes before depth 12 on any route, and 99% of routes have it from the Boss
//    (spec 14.4: "the most-fights route reaches 250 at depth 12 or 13, before the Boss; every other route from the Boss");
//  - THE TABLE (opt-in, SIM_LEVELS=1, SIM_LEVEL_SEEDS default 400): the measure for the hand-off.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { pathMap, mapPaths, type PathNode } from '../../src/run/map';
import { nodeXp } from '../../src/run/rewards';
import { levelForXp } from '../../src';

const env = (globalThis as any).process?.env || {};
const PAID = ['fight', 'elite', 'gate', 'cache'];
const kindOf = (n: PathNode) => (n.gate ? 'gate' : n.kind);
/** One route walked: its fights (plain, Elite, gate), the depth level 3 comes at (15 = from the Boss), the XP and level
 * at the Boss's door and after it. */
function walk(p: PathNode[]) {
  let xp = 0, at3: number | null = null, fights = 0, boss: PathNode | null = null;
  for (const n of p) {
    const k = kindOf(n);
    if (k === 'boss') { boss = n; break; }
    if (!PAID.includes(k)) continue;
    if (k !== 'cache') fights++;
    xp += nodeXp(k as any, n.depth, 1);
    if (at3 == null && levelForXp(xp) >= 3) at3 = n.depth;
  }
  const door = xp, after = door + (boss ? nodeXp('boss', boss.depth, 1) : 0);
  if (at3 == null && levelForXp(after) >= 3) at3 = boss ? boss.depth : 99;
  return { fights, at3, door, doorLevel: levelForXp(door), after, afterLevel: levelForXp(after) };
}
function routes(seeds: number) {
  const out: { most: any; typical: any; fewest: any; all: any[] }[] = [];
  for (let i = 1; i <= seeds; i++) {
    const all = mapPaths(pathMap('LV-' + i, 1)).map(walk).sort((a, b) => a.fights - b.fights || a.door - b.door);
    out.push({ fewest: all[0], typical: all[Math.floor((all.length - 1) / 2)], most: all[all.length - 1], all });
  }
  return out;
}

describe('Survival, levels by route (rules 1.54 item 9): the guard', () => {
  it('level 3 never before depth 12 on any stage-1 route, and from the Boss on 99% of them', () => {
    const rs = routes(60), all = rs.flatMap((r) => r.all);
    expect(all.every((w) => w.at3 == null || w.at3 >= 12), JSON.stringify(all.filter((w) => w.at3 != null && w.at3 < 12).slice(0, 3))).toBe(true);
    // measured 14 Nov (400 maps, 23,510 routes): 0.03% (the fewest fights) end stage 1 at level 2 (244 XP and under)
    expect(all.filter((w) => w.afterLevel >= 3).length / all.length).toBeGreaterThanOrEqual(0.99);
  });
});

describe.runIf(env.SIM_LEVELS)('Survival, levels by route: the table', () => {
  it('prints where level 3 comes and the level at the Boss, by route', () => {
    const rs = routes(Number(env.SIM_LEVEL_SEEDS || 400)), lines = ['| Route | Fights (mean) | XP at the Boss\'s door (mean, min-max) | Level at the door | Level 3 reached at (share of maps) | Level after the Boss |', '| --- | --- | --- | --- | --- | --- |'];
    const mean = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length;
    const dist = (xs: (number | string)[]) => { const m: Record<string, number> = {}; for (const x of xs) m[x] = (m[x] || 0) + 1; return Object.entries(m).sort().map(([k, v]) => (k === '15' ? 'the Boss' : 'depth ' + k) + ' ' + Math.round((100 * v) / xs.length) + '%').join(', '); };
    for (const k of ['most', 'typical', 'fewest'] as const) {
      const w = rs.map((r) => r[k]);
      lines.push('| ' + k + ' | ' + mean(w.map((x) => x.fights)).toFixed(1) + ' | ' + Math.round(mean(w.map((x) => x.door))) + ' (' + Math.min(...w.map((x) => x.door)) + '-' + Math.max(...w.map((x) => x.door)) + ') | ' + dist(w.map((x) => x.doorLevel)).replace(/depth /g, '') + ' | ' + dist(w.map((x) => x.at3)) + ' | ' + dist(w.map((x) => x.afterLevel)).replace(/depth /g, '') + ' |');
    }
    const all = rs.flatMap((r) => r.all);
    lines.push('', rs.length + ' maps, ' + all.length + ' routes: level 3 before the Boss on ' + (100 * all.filter((w) => w.at3 != null && w.at3 < 15).length / all.length).toFixed(2) + '% of routes; still level 2 after the Boss on ' + (100 * all.filter((w) => w.afterLevel < 3).length / all.length).toFixed(2) + '%.');
    if (env.SIM_LEVELS_OUT) writeFileSync(env.SIM_LEVELS_OUT, lines.join('\n')); else (globalThis as any).console.log(lines.join('\n'));
  });
});
