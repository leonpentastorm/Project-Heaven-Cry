// @ts-nocheck (builds odd fights by hand)
// THE ORDER OF paths() IS PART OF THE RULES. Callers take "the first best tile" of Object.entries(dist), and of two
// routes of equal cost the one found first is the one walked (so which hazard, Overwatch or opportunity attack a walk
// meets). combat.ts runs the search on number arrays with a heap; `plainPaths` below is the search as it was written
// first (strings, a scan of the open list: the nearest tile, the earliest found among equals) and is the ORACLE: the
// two must give the same distances, the same `prev`, and the same KEY ORDER in both, on any grid.
// If you change paths() in combat.ts, change it so that this still passes. If a rule of movement changes on purpose
// (a new cost, a new blocker), change both and say so in the commit; the replay guard will then move too.
import { describe, expect, it } from 'vitest';
import { paths, stepsFrom, coverTileFor, coverOf, dist, pathOpts, difficultOf, moveBlockers, objectsOf, trapKnown, xy, key, bindGame, type Combat } from '../src';
import { isTrap, kindOf, makeObject } from '../src/objects';
import { onHook } from '../src/effects/hooks';
import { lobby, fightTurn, type Pc } from './helpers/replay';
import { apply } from '../src';

function plainPaths(cb: Combat, from: string, self: string, avoid?: Set<string>) {
  const { w, h } = cb.map, me = cb.units.find((u) => u.id === self), diff = difficultOf(cb), opt = pathOpts(cb, me);
  const solid = new Set([...moveBlockers(cb), ...objectsOf(cb).filter((o) => isTrap(o) && trapKnown(o, me?.side || 'pc')).map((o) => o.pos)]);
  for (const k of opt.runnable) solid.delete(k);
  const blocked = new Set(cb.units.filter((u) => u.id !== self && !u.dead && !opt.pass.has(u.id)).map((u) => u.pos));
  const d: Record<string, number> = { [from]: 0 }, prev: Record<string, string> = {}, open = [from];
  const stand = (k: string) => !solid.has(k) && !blocked.has(k);
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (d[open[i]] < d[open[bi]]) bi = i;
    const k = open.splice(bi, 1)[0], [x, y] = xy(k);
    if (avoid && k !== from && avoid.has(k)) continue;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy, n = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (!stand(n)) {
        if (opt.jump) { const jx = nx + dx, jy = ny + dy, j = key(jx, jy); if (jx >= 0 && jy >= 0 && jx < w && jy < h && stand(j)) { const nd = d[k] + 2; if (d[j] === undefined || nd < d[j] - 1e-9) { d[j] = nd; prev[j] = k; open.push(j); } } }
        continue;
      }
      if (dx && dy && solid.has(key(x + dx, y)) && solid.has(key(x, y + dy))) continue;
      const nd = d[k] + (diff.has(n) && !opt.ignoreDifficult ? 2 : 1) + (dx && dy ? 0.001 : 0);
      if (d[n] === undefined || nd < d[n] - 1e-9) { d[n] = nd; prev[n] = k; open.push(n); }
    }
  }
  for (const k of Object.keys(d)) d[k] = Math.round(d[k]);
  for (const u of cb.units) if (u.id !== self && !u.dead && opt.pass.has(u.id)) delete d[u.pos];
  for (const k of opt.noStop || []) if (k !== from) delete d[k];
  for (const o of objectsOf(cb)) if ((o as any).sabotaged && kindOf(o).blocks_move && o.pos !== from) delete d[o.pos];
  return { dist: d, prev };
}

/** coverTileFor as it was written first: the dictionary of all cover, walked in its order. The oracle for the one in combat.ts. */
function plainCoverTileFor(cb: Combat, from: string, to: string): string | null {
  const [tx, ty] = xy(to);
  for (const c of Object.entries(coverOf(cb)).filter(([, v]) => v.kind === 'half').map(([k]) => k)) {
    const [cx, cy] = xy(c);
    if (Math.max(Math.abs(cx - tx), Math.abs(cy - ty)) === 1 && dist(from, c) < dist(from, to)) return c;
  }
  return null;
}

// what an item may open for a mover (Wall Run, Make Way, augmented legs…): set per trial, answered through the real hook
let OPTS: any = null;
onHook('path_opts', (o: any) => { if (!OPTS) return; if (OPTS.jump) o.jump = true; if (OPTS.ignoreDifficult) o.ignoreDifficult = true; for (const k of OPTS.runnable || []) o.runnable.add(k); for (const id of OPTS.pass || []) o.pass.add(id); if (OPTS.noStop) o.noStop = new Set(OPTS.noStop); });

const SQUAD: Pc[] = [{ build: 'opt_gun', level: 9 }, { build: 'opt_blade', level: 9 }, { build: 'plain_gun', level: 9 }, { build: 'plain_blade', level: 9 }];
function fight(map: 'open' | 'cover') {
  let g = lobby('PATHS-' + map, SQUAD);
  g = apply(g, { type: 'session/start' }, 'host'); g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', sceneTitle: 'Paths' } }, 'host');
  return apply(g, fightTurn(SQUAD, ['minion', 'soldier', 'soldier', 'elite', 'minion', 'soldier', 'boss'], map, 'Paths'), 'host');
}
const rnd = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const same = (a: any, b: any, what: string) => {
  expect(Object.keys(a.dist), what + ': the order tiles were found in').toEqual(Object.keys(b.dist));
  expect(a.dist, what + ': distances').toEqual(b.dist);
  expect(Object.keys(a.prev), what + ': the order of prev').toEqual(Object.keys(b.prev));
  expect(a.prev, what + ': the tile each was reached from').toEqual(b.prev);
};

describe('paths(): the heap search finds what the plain search finds, in the same order', () => {
  it('on the real grounds as a fight leaves them, for every unit', () => {
    for (const m of ['open', 'cover'] as const) { const g = fight(m), cb = g.combat!, was = bindGame(g);
      try { for (const u of cb.units) same(paths(cb, u.pos, u.id), plainPaths(cb, u.pos, u.id), m + ' ' + u.id); } finally { bindGame(was); } }
  }, 60_000);
  it('on 300 random grounds: walls, rough ground, traps, a sabotaged barricade, crowds, jumps, ways through people, tiles to avoid; and one step (stepsFrom) and the cover tile (coverTileFor) agree with the plain versions', () => {
    const base = fight('cover'), r = rnd(20261112);
    const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
    let reached = 0, ties = 0, steps = 0, covers = 0;
    for (let t = 0; t < 300; t++) {
      const g = JSON.parse(JSON.stringify(base)), cb: Combat = g.combat, w = 6 + Math.floor(r() * 21), h = 6 + Math.floor(r() * 21);
      const tiles: string[] = []; for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) tiles.push(x + ',' + y);
      const some = (share: number) => tiles.filter(() => r() < share);
      cb.map = { ...cb.map, w, h, solid: some(pick([0, 0.05, 0.15, 0.3, 0.45])), difficult: some(pick([0, 0.1, 0.3])) };
      cb.objects = [
        ...some(0.03).map((k, i) => makeObject('t' + i, 'trap', k, { hidden: r() < 0.5 })),
        ...some(0.03).map((k, i) => ({ ...makeObject('b' + i, 'barricade', k), ...(r() < 0.5 ? { sabotaged: 9 } : {}) })),
        ...some(0.03).map((k, i) => makeObject('c' + i, 'crate', k)), ...some(0.02).map((k, i) => makeObject('d' + i, 'door', k, r() < 0.5 ? { open: true } : {})),
        // cover, some of it two to a tile (the last one placed is the tile's cover) and some of it broken
        ...some(0.08).map((k, i) => makeObject('w' + i, pick(['low_wall', 'crate', 'pillar', 'barrel']), k, r() < 0.15 ? { hp: 0 } : {})), ...some(0.04).map((k, i) => makeObject('x' + i, pick(['low_wall', 'pillar', 'crate']), k)),
      ];
      const free = tiles.filter((k) => !cb.map.solid.includes(k));
      for (const u of cb.units) { u.pos = pick(free.length ? free : tiles); if (r() < 0.15) u.dead = true; }
      const me = pick(cb.units), others = cb.units.filter((u) => u !== me);
      OPTS = r() < 0.5 ? null : { jump: r() < 0.5, ignoreDifficult: r() < 0.3, runnable: r() < 0.3 ? some(0.1) : [], pass: r() < 0.4 ? others.filter(() => r() < 0.5).map((u) => u.id) : [], noStop: r() < 0.2 ? some(0.05) : null };
      const avoid = r() < 0.4 ? new Set(some(pick([0.03, 0.1, 0.3]))) : undefined;
      // mostly from where the unit stands; sometimes from another tile, a tile off the map's edge, or far outside
      const from = r() < 0.8 ? me.pos : r() < 0.6 ? pick(tiles) : r() < 0.5 ? pick([-1, w]) + ',' + Math.floor(r() * h) : '-5,40';
      const was = bindGame(g);
      try {
        const a = paths(cb, from, me.id, avoid), b = plainPaths(cb, from, me.id, avoid);
        same(a, b, 'trial ' + t + ' (' + w + ' × ' + h + ', from ' + from + ')');
        // one step: the tiles paths() puts at distance 1, in sorted order (Duck and Roll's choice of tile)
        if (from !== '-5,40') expect(stepsFrom(cb, from, me.id), 'trial ' + t + ': one step from ' + from).toEqual(Object.keys(b.dist).filter((k) => b.dist[k] === 1).sort());
        steps += stepsFrom(cb, me.pos, me.id).length;
        // the half cover between an attacker and a target: the same tile as the first one in coverOf's order
        for (const u of others) { const got = coverTileFor(cb, u.pos, me.pos); expect(got, 'trial ' + t + ': cover for ' + me.pos + ' from ' + u.pos).toBe(plainCoverTileFor(cb, u.pos, me.pos)); if (got) covers++; }
        reached += Object.keys(a.dist).length; const seen = new Set(Object.values(a.dist)); ties += Object.keys(a.dist).length - seen.size;
      } finally { bindGame(was); OPTS = null; }
    }
    // the trials really walked somewhere, and really had equal distances to order
    expect(reached).toBeGreaterThan(20000); expect(ties).toBeGreaterThan(15000); expect(steps).toBeGreaterThan(600); expect(covers).toBeGreaterThan(150);
  }, 60_000); // about a second alone; the plain search is slow when the machine is busy
});
