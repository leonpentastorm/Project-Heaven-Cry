// @ts-nocheck (a measuring tool, like the rest of test/balance)
// Survival's levels by route (rules 1.54 item 9, survival-spec 14.4): every route of stage 1's map, walked with the
// engine's own pay (`nodeXp`, the paid kinds `PAY_KINDS` of `run/rewards.ts`) and the shared `xp_total` (`levelForXp`), on many seeds.
// For each map: the route with the most fights (plain, Elite and the gate), a typical route (the median count) and the
// route with the fewest; where each reaches level 3 (the depth, or the Boss), and the level on arriving at the Boss.
//  - THE GUARD (always on; rules 1.55 item 28, 0.28.2 Survival XP pace: docs/design/proposals/2026-11-xp-fit-0.29.md): the
//    lead's targets read against the data's pay: level 3 at the Boss's door on 80% of most-fights routes and 50% of typical
//    ones, no route above level 4 after the Boss, level 3 before the gate (`map.gate_row`) on at most 1% of routes and never
//    before the row above it, and level 3 from the Boss on 99% of routes;
//  - THE TABLE (opt-in, SIM_LEVELS=1, SIM_LEVEL_SEEDS default 400): the measure for the hand-off.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { pathMap, mapPaths, type PathNode } from '../../src/run/map';
import { nodeXp, PAY_KINDS } from '../../src/run/rewards';
import { levelForXp } from '../../src';
import svJ from '../../../../data/survival.json';
const SV: any = svJ;

const env = (globalThis as any).process?.env || {};
const kindOf = (n: PathNode) => (n.gate ? 'gate' : n.kind);
/** One route walked: its fights (plain, Elite, gate), the depth level 3 comes at (15 = from the Boss), the XP and level
 * at the Boss's door and after it. */
function walk(p: PathNode[]) {
  let xp = 0, at3: number | null = null, fights = 0, boss: PathNode | null = null;
  for (const n of p) {
    const k = kindOf(n);
    if (k === 'boss') { boss = n; break; }
    if (!PAY_KINDS.includes(k as any)) continue;
    if (k !== 'cache' && k !== 'vault') fights++;
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

describe('Survival, levels by route (rules 1.55 item 28, 0.28.2 Survival XP pace): the guard', () => {
  it('level 3 comes after the gate and at the Boss door on most-fights and typical routes; never past level 4 in stage 1', () => {
    const rs = routes(60), all = rs.flatMap((r) => r.all), gate = SV.map.gate_row;
    const share = (xs: any[], f: (w: any) => boolean) => xs.filter(f).length / xs.length;
    expect(share(rs.map((r) => r.most), (w) => w.doorLevel >= 3)).toBeGreaterThanOrEqual(0.8);
    expect(share(rs.map((r) => r.typical), (w) => w.doorLevel >= 3)).toBeGreaterThanOrEqual(0.5);
    expect(Math.max(...all.map((w) => w.afterLevel))).toBeLessThanOrEqual(4);
    // measured 15 Nov at base 35, per_depth 0 (200 maps): 0.2% of routes reach level 3 before the gate, the earliest at row 7
    expect(share(all, (w) => w.at3 != null && w.at3 < gate)).toBeLessThanOrEqual(0.01);
    expect(all.every((w) => w.at3 == null || w.at3 >= gate - 1), JSON.stringify(all.filter((w) => w.at3 != null && w.at3 < gate - 1).slice(0, 3))).toBe(true);
    expect(share(all, (w) => w.afterLevel >= 3)).toBeGreaterThanOrEqual(0.99);
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
