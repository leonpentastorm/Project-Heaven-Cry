// Survival's path map as LANES (rules 1.48, Leon 13 Nov; replaces rules 1.40's rows; survival-spec rules 7 to 12). Every
// number is read from data/survival.json `map`. SURVIVAL_MAP_REPORT=1 prints the measured distribution (the hand-off's
// table) and three maps.
import { describe, expect, it, vi } from 'vitest';
import { MAP_DATA, MAP_DRAWS, NODE_KINDS, choicePoints, crossings, drawMap, mapNodes, mapPaths, mapProblems, pathMap, referenceRoute, renderPathMap, segmentsOf, shopAhead, type PathMap, type PathNode } from '../src/run/map';
import { rngFor, next } from '../src/rng';
import { nodeXp, nodeCredits } from '../src/run/rewards';
declare const process: { env: Record<string, string | undefined> }; // the engine's tsconfig has no node types
declare const console: { log(...a: unknown[]): void };

const D = MAP_DATA;
const SEEDS = 1000, STAGES = 5;
const all: { m: PathMap; stage: number }[] = [];
for (let s = 0; s < SEEDS; s++) for (let st = 1; st <= STAGES; st++) all.push({ m: pathMap('seed-' + s, st), stage: st });
const byIdOf = (m: PathMap) => Object.fromEntries(mapNodes(m).map((n) => [n.id, n])) as Record<string, PathNode>;
const kindsOn = (p: PathNode[]) => { const c: Record<string, number> = {}; for (const n of p) c[n.kind] = (c[n.kind] || 0) + 1; return c; };

describe('Survival path map: lanes (rules 1.48)', () => {
  it('rngFor: a named stream, the same for the same seed and key, different for another key', () => {
    const a = rngFor('PHC-0001', 'map#1'), b = rngFor('PHC-0001', 'map#1'), c = rngFor('PHC-0001', 'map#2');
    const xs = [next(a), next(a)], ys = [next(b), next(b)], zs = [next(c), next(c)];
    expect(xs).toEqual(ys);
    expect(xs).not.toEqual(zs);
  });

  it('same seed and stage, same map; another seed or stage, another map; no Math.random', () => {
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Math.random in the path map'); });
    try {
      expect(pathMap('PHC-0001', 1)).toEqual(pathMap('PHC-0001', 1));
      expect(JSON.stringify(pathMap('PHC-0001', 1))).not.toEqual(JSON.stringify(pathMap('PHC-0002', 1)));
      expect(JSON.stringify(mapNodes(pathMap('PHC-0001', 1)).map((n) => n.kind))).not.toEqual(JSON.stringify(mapNodes(pathMap('PHC-0001', 2)).map((n) => n.kind)));
    } finally { spy.mockRestore(); }
  });

  it(SEEDS + ' seeds x stages 1 to ' + STAGES + ': every placement rule and guarantee holds (mapProblems empty)', () => {
    const bad: string[] = [];
    for (const { m, stage } of all) for (const p of mapProblems(m, stage)) bad.push(m.seed + ' stage ' + stage + ': ' + p);
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('most maps are the first draw; none needs all ' + MAP_DRAWS + ' (a redraw is the next stream, never Math.random)', () => {
    let first = 0;
    for (const { m, stage } of all) if (JSON.stringify(drawMap(m.seed, stage, D, null, 0)) === JSON.stringify(m)) first++;
    expect(first / all.length).toBeGreaterThan(0.95);
  });

  it('the fixed nodes: plain fights in row 1, the gate Elite, the final junction, row 14 a shop and a rest, the Boss', () => {
    for (const { m } of all) {
      expect(m.rows).toHaveLength(D.rows);
      expect(m.rows[0]).toHaveLength(m.lanes);
      expect(m.rows[0].every((n) => n.kind === 'fight' && n.lane != null)).toBe(true);
      expect(m.rows[D.gate_row - 1].map((n) => [n.kind, !!n.gate, !!n.junction])).toEqual([['elite', true, true]]);
      expect(m.rows[D.final_row - 1].map((n) => !!n.junction)).toEqual([true]);
      expect(m.rows[D.shop_rest_row - 1].map((n) => n.kind).sort()).toEqual(['rest', 'shop']);
      expect(m.rows[D.boss_row - 1].map((n) => n.kind)).toEqual(['boss']);
      expect(m.rows[D.final_row - 1][0].links.slice().sort()).toEqual(m.rows[D.shop_rest_row - 1].map((x) => x.id).sort());
    }
  });

  it('every lane node has exactly one way forward (the vault\'s fork adds only its spur); only junctions have more; no links cross', () => {
    for (const { m } of all) {
      const by = byIdOf(m);
      for (const n of m.rows.flat()) {
        const fwd = n.links.filter((l) => !by[l].spur);
        if (n.lane != null) expect(fwd).toHaveLength(1);
        else if (n.depth < D.rows) expect(n.junction || n.depth === D.shop_rest_row).toBe(true);
        if (n.links.length > fwd.length) expect(n.lane != null && n.links.length === 2).toBe(true);
      }
      for (let i = 0; i < m.rows.length - 1; i++) {
        const edges = m.rows[i].flatMap((n, a) => n.links.filter((l) => !by[l].spur).map((l) => [a, m.rows[i + 1].findIndex((x) => x.id === l)] as [number, number]));
        expect(crossings(edges)).toBe(0);
      }
    }
  });

  it('the start opens every lane; junctions merge ' + Object.keys(D.junction.sizes).join(' or ') + ' neighbouring lanes; segments are ' + D.junction.segment.join(' to ') + ' nodes; the lanes from one node differ', () => {
    const [lo, hi] = D.junction.segment, sizes = Object.keys(D.junction.sizes).map(Number);
    for (const { m } of all) {
      expect(Object.keys(D.lanes).map(Number)).toContain(m.lanes);
      for (const n of m.rows.flat().filter((x) => x.junction && !x.gate && x.depth !== D.final_row)) expect(sizes).toContain(n.links.length);
      const segs = segmentsOf(m), from: Record<string, string[]> = {};
      for (const s of segs) {
        expect(s.nodes.length).toBeGreaterThanOrEqual(lo); expect(s.nodes.length).toBeLessThanOrEqual(hi);
        (from[s.from ?? 'start'] ||= []).push(s.nodes.map((n) => n.kind).sort().join());
      }
      expect(from.start).toHaveLength(m.lanes);
      for (const sigs of Object.values(from)) expect(new Set(sigs).size).toBe(sigs.length);
    }
  });

  it('exactly one vault: a guard then a chest, off an edge lane node (not a junction) in depths ' + D.vault.depths.join(' to ') + ', leading back onto that lane', () => {
    for (const { m } of all) {
      expect(m.spur.map((n) => n.kind)).toEqual(['vault_guard', 'vault']);
      const [guard, chest] = m.spur, by = byIdOf(m), at = by[guard.from!];
      expect(at.lane === 0 || at.lane === m.lanes - 1).toBe(true);
      expect(at.junction).toBeFalsy();
      expect(at.depth).toBeGreaterThanOrEqual(D.vault.depths[0]); expect(at.depth).toBeLessThanOrEqual(D.vault.depths[1]);
      expect(at.links).toContain(guard.id); expect(guard.links).toEqual([chest.id]);
      expect(chest.links).toEqual(at.links.filter((l) => l !== guard.id));
      expect(mapNodes(m).filter((n) => n.links.includes(guard.id)).map((n) => n.id)).toEqual([at.id]);
    }
  });

  it('every route passes ' + D.every_route.join(' and ') + ' before row ' + D.shop_rest_row + '; a shop within ' + D.shop_gap + ' nodes of the start and of every junction; the reference route exists', () => {
    for (const { m, stage } of all) {
      for (const p of mapPaths(m)) for (const k of D.every_route) expect(p.some((n) => n.kind === k && n.depth <= D.final_row)).toBe(true);
      for (const cp of choicePoints(m)) expect(shopAhead(m, cp)).toBeLessThanOrEqual(D.shop_gap);
      const r = referenceRoute(m, stage);
      expect(r).not.toBeNull();
      expect(r!.map((n) => n.depth)).toEqual(Array.from({ length: D.rows }, (_, i) => i + 1));
    }
  });

  it('every node is reachable from the start and leads to the Boss', () => {
    for (const { m } of all) {
      const ids = new Set(mapNodes(m).map((n) => n.id)), by = byIdOf(m);
      const seen = new Set<string>(), stack = m.rows[0].map((n) => n.id);
      while (stack.length) { const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id); stack.push(...by[id].links); }
      expect(seen).toEqual(ids);
      const boss = m.rows[D.boss_row - 1][0].id, toBoss = (id: string, k = 0): boolean => id === boss || (k < 40 && by[id].links.some((l) => toBoss(l, k + 1)));
      for (const id of ids) expect(toBoss(id)).toBe(true);
    }
  });

  it("each kind's count on a map is within the spec's 'about N' band; a typical route holds " + D.expect.path.fight.join(' to ') + ' fights', () => {
    const sum: Record<string, number> = {};
    let routes = 0, inBand = 0;
    for (const { m } of all) {
      sum.nodes = (sum.nodes || 0) + mapNodes(m).length; for (const n of mapNodes(m)) sum[n.kind] = (sum[n.kind] || 0) + 1;
      for (const p of mapPaths(m)) { routes++; const f = p.filter((n) => n.kind === 'fight').length; if (f >= D.expect.path.fight[0] && f <= D.expect.path.fight[1]) inBand++; }
    }
    const e = D.expect, off: string[] = [];
    for (const k of Object.keys(e.about)) {
      const mean = (sum[k] || 0) / all.length, tol = e.tolerance[k] ?? e.tolerance.default;
      if (Math.abs(mean - e.about[k]) > tol) off.push(k + ' ' + mean.toFixed(2) + ' (about ' + e.about[k] + ' ± ' + tol + ')');
    }
    expect(off).toEqual([]);
    expect(inBand / routes).toBeGreaterThanOrEqual(e.typical_share);
  });

  it('the text renderer draws the camp, the gate, the vault and the Boss', () => {
    const t = renderPathMap(pathMap('PHC-0001', 1));
    for (const w of ['CMP', 'GATE', 'GRD', 'VLT', 'BOSS']) expect(t).toContain(w);
  });

  it.runIf(process.env.SURVIVAL_MAP_REPORT)('report: the measured distribution and three maps', () => {
    const per: Record<string, number[]> = {}, map: Record<string, number[]> = {}, shape: Record<string, number[]> = {};
    const add = (h: Record<string, number[]>, k: string, v: number, n = 1) => { const a = (h[k] ||= []); a[v] = (a[v] || 0) + n; };
    let paths = 0;
    for (const { m } of all) {
      const c = kindsOn(mapNodes(m));
      add(map, 'nodes', mapNodes(m).length);
      for (const k of NODE_KINDS) add(map, k, c[k] || 0);
      for (const p of mapPaths(m)) { paths++; const pc = kindsOn(p); for (const k of NODE_KINDS) add(per, k, pc[k] || 0); }
      add(shape, 'lanes', m.lanes); add(shape, 'routes', mapPaths(m).length);
      add(shape, 'junction rows', new Set(m.rows.flat().filter((n) => n.junction && !n.gate).map((n) => n.depth)).size);
      for (const n of m.rows.flat().filter((x) => x.junction && !x.gate && x.depth !== D.final_row)) add(shape, 'junction at depth', n.depth);
      for (const s of segmentsOf(m)) add(shape, 'segment length', s.nodes.length);
      add(shape, 'vault at depth', m.spur[0] ? mapNodes(m).find((n) => n.id === m.spur[0].from)!.depth : 0);
    }
    const tot = (h: number[]) => h.reduce((s, x) => s + (x || 0), 0);
    const mean = (h: number[]) => h.reduce((s, x, v) => s + (x || 0) * v, 0) / tot(h);
    const q = (h: number[], f: number) => { let acc = 0; const t = tot(h); for (let v = 0; v < h.length; v++) { acc += h[v] || 0; if (acc > f * t) return v; } return h.length - 1; };
    const share = (h: number[], lo: number, hi: number) => h.reduce((s, x, v) => s + (v >= lo && v <= hi ? x || 0 : 0), 0) / tot(h);
    const lines = ['| Kind | Spec: map (about) | Measured map: mean (5%–95%) | Spec: route | Measured route: mean (5%–95%) | Routes in the spec\'s range |', '| --- | --- | --- | --- | --- | --- |'];
    for (const k of [...NODE_KINDS, 'nodes']) {
      const pk = per[k], r = D.expect.path[k];
      lines.push('| ' + k + ' | ' + (D.expect.about[k] ?? '') + ' | ' + mean(map[k]).toFixed(2) + ' (' + q(map[k], 0.05) + '–' + q(map[k], 0.95) + ') | ' + (r ? r.join('–') : '') + ' | ' + (pk ? mean(pk).toFixed(2) + ' (' + q(pk, 0.05) + '–' + q(pk, 0.95) + ')' : '') + ' | ' + (pk && r ? (100 * share(pk, r[0], r[1])).toFixed(1) + '%' : '') + ' |');
    }
    const sh = ['| Shape | Distribution (value: share) |', '| --- | --- |'];
    for (const [k, h] of Object.entries(shape)) sh.push('| ' + k + ' | ' + h.map((x, v) => (x ? v + ': ' + (100 * x / tot(h)).toFixed(1) + '%' : '')).filter(Boolean).join(', ') + ' |');
    const fh = per.fight, fl = ['| Fights on a route | ' + fh.map((_, v) => v).filter((v) => fh[v]).join(' | ') + ' |', '| --- |' + fh.filter(Boolean).map(() => ' --- |').join(''), '| Routes | ' + fh.map((x, v) => (x ? (100 * x / tot(fh)).toFixed(1) + '%' : '')).filter(Boolean).join(' | ') + ' |'];
    console.log(SEEDS + ' seeds x ' + STAGES + ' stages = ' + all.length + ' maps, ' + paths + ' routes\n' + lines.join('\n') + '\n\n' + sh.join('\n') + '\n\n' + fl.join('\n'));
    for (const s of ['PHC-0001', 'PHC-0002', 'PHC-0003']) console.log('\n' + s + ', stage 1\n' + renderPathMap(pathMap(s, 1)));
    // section 11.1 re-walked: the stage-1 reference route's XP and credits (and every route's), and the vault's optional line
    const pay = (p: PathNode[]) => p.reduce((t, n) => { const k = n.gate ? 'gate' : n.kind; const paid = ['fight', 'elite', 'gate', 'boss', 'cache'].includes(k);
      return { xp: t.xp + (paid ? nodeXp(k as any, n.depth, 1) : 0), cr: t.cr + (paid ? nodeCredits(k as any, n.depth, 1) : 0), f: t.f + (n.kind === 'fight' ? 1 : 0), e: t.e + (n.kind === 'elite' ? 1 : 0) }; }, { xp: 0, cr: 0, f: 0, e: 0 });
    const ref = { xp: 0, cr: 0, f: 0, e: 0 }, any = { xp: 0, cr: 0, f: 0, e: 0 }, vault = { xp: 0, cr: 0 }; let maps1 = 0, routes1 = 0;
    for (const { m, stage } of all) {
      if (stage !== 1) continue; maps1++;
      const r = pay(referenceRoute(m, 1)!); for (const k of ['xp', 'cr', 'f', 'e'] as const) ref[k] += r[k];
      for (const p of mapPaths(m)) { routes1++; const x = pay(p); for (const k of ['xp', 'cr', 'f', 'e'] as const) any[k] += x[k]; }
      const g = m.spur[0]; vault.xp += nodeXp('vault_guard', g.depth, 1); vault.cr += nodeCredits('vault_guard', g.depth, 1) + nodeCredits('vault', g.depth, 1);
    }
    const f = (o: Record<string, number>, n: number) => Object.entries(o).map(([k, v]) => k + ' ' + (v / n).toFixed(k === 'f' || k === 'e' ? 2 : 0)).join(', ');
    console.log('\nStage 1 income: the reference route: ' + f(ref, maps1) + '; every route: ' + f(any, routes1) + '; the vault (guard and chest), optional: ' + f(vault, maps1));
  });
});
