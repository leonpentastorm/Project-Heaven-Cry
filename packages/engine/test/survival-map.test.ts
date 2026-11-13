// Survival's path map (rules 1.40; survival-spec rules 7 to 12, build step 2). Every number is read from
// data/survival.json `map`. SURVIVAL_MAP_REPORT=1 prints the measured distribution (the hand-off's table) and three maps.
import { describe, expect, it, vi } from 'vitest';
import { MAP_DATA, NODE_KINDS, mapNodes, mapPaths, mapProblems, pathMap, referenceRoute, renderPathMap, type PathMap, type PathNode } from '../src/run/map';
import { rngFor, next } from '../src/rng';
declare const process: { env: Record<string, string | undefined> }; // the engine's tsconfig has no node types
declare const console: { log(...a: unknown[]): void };

const D = MAP_DATA;
const SEEDS = 1000, STAGES = 5;
const all: { m: PathMap; stage: number }[] = [];
for (let s = 0; s < SEEDS; s++) for (let st = 1; st <= STAGES; st++) all.push({ m: pathMap('seed-' + s, st), stage: st });
const pathsOf = (m: PathMap) => mapPaths(m);
const kindsOn = (p: PathNode[]) => { const c: Record<string, number> = {}; for (const n of p) c[n.kind] = (c[n.kind] || 0) + 1; return c; };

describe('Survival path map (rules 1.40)', () => {
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
      expect(JSON.stringify(pathMap('PHC-0001', 1).rows.map((r) => r.map((n) => n.kind)))).not.toEqual(JSON.stringify(pathMap('PHC-0001', 2).rows.map((r) => r.map((n) => n.kind))));
    } finally { spy.mockRestore(); }
  });

  it(SEEDS + ' seeds x stages 1 to ' + STAGES + ': every placement rule and guarantee holds', () => {
    const bad: string[] = [];
    for (const { m, stage } of all) for (const p of mapProblems(m, stage)) bad.push(m.seed + ' stage ' + stage + ': ' + p);
    expect(bad.slice(0, 20)).toEqual([]);
  });

  it('the fixed rows: plain fights in row 1, the gate Elite, row 14 a shop and a rest, the Boss', () => {
    for (const { m } of all) {
      expect(m.rows).toHaveLength(D.rows);
      expect(m.rows[0].every((n) => n.kind === 'fight')).toBe(true);
      expect(m.rows[D.gate_row - 1].map((n) => [n.kind, !!n.gate])).toEqual([['elite', true]]);
      expect(m.rows[D.shop_rest_row - 1].map((n) => n.kind).sort()).toEqual(['rest', 'shop']);
      expect(m.rows[D.boss_row - 1].map((n) => n.kind)).toEqual(['boss']);
      for (const n of m.rows[D.shop_rest_row - 2]) expect(n.links.sort()).toEqual(m.rows[D.shop_rest_row - 1].map((x) => x.id).sort());
    }
  });

  it('every node is reachable and every node leads to the Boss', () => {
    for (const { m } of all) {
      const ids = new Set(mapNodes(m).map((n) => n.id));
      const seen = new Set<string>(m.rows[0].map((n) => n.id));
      for (const row of m.rows) for (const n of row) if (seen.has(n.id)) n.links.forEach((l) => seen.add(l));
      expect(seen).toEqual(ids);
      const toBoss = new Set<string>([m.rows[D.boss_row - 1][0].id]);
      for (let i = m.rows.length - 2; i >= 0; i--) for (const n of m.rows[i]) if (n.links.some((l) => toBoss.has(l))) toBoss.add(n.id);
      expect(toBoss).toEqual(ids);
    }
  });

  it('a choice of two kinds at 12 of the 14 steps of every path (the gate and the Boss are the two without)', () => {
    const steps = D.rows - 1 - 2;
    for (const { m } of all.slice(0, 20 * STAGES)) {
      const kind: Record<string, string> = {};
      for (const n of mapNodes(m)) kind[n.id] = n.kind;
      for (const p of pathsOf(m)) {
        const choices = p.filter((n) => new Set(n.links.map((l) => kind[l])).size >= 2).length;
        expect(choices).toBe(steps);
      }
    }
  });

  it('the reference route exists on every map (a shop in each half, a Forge, a rest, shops never more than six apart)', () => {
    for (const { m, stage } of all) {
      const r = referenceRoute(m, stage);
      expect(r).not.toBeNull();
      expect(r!.map((n) => n.depth)).toEqual(Array.from({ length: D.rows }, (_, i) => i + 1));
    }
  });

  it("each kind's count on a map is within the spec's 'about N' band", () => {
    const sum: Record<string, number> = {};
    for (const { m } of all) { sum.nodes = (sum.nodes || 0) + mapNodes(m).length; for (const n of mapNodes(m)) sum[n.kind] = (sum[n.kind] || 0) + 1; }
    const e = D.expect;
    const off: string[] = [];
    for (const k of Object.keys(e.about)) {
      const mean = (sum[k] || 0) / all.length, tol = e.tolerance[k] ?? e.tolerance.default;
      if (Math.abs(mean - e.about[k]) > tol) off.push(k + ' ' + mean.toFixed(2) + ' (about ' + e.about[k] + ' ± ' + tol + ')');
    }
    expect(off).toEqual([]);
  });

  it('the text renderer draws every row, the gate and the Boss', () => {
    const t = renderPathMap(pathMap('PHC-0001', 1));
    expect(t.split('\n').filter((l) => /^\s?\d+ /.test(l))).toHaveLength(D.rows);
    expect(t).toContain('GATE');
    expect(t).toContain('Boss');
  });

  it.runIf(process.env.SURVIVAL_MAP_REPORT)('report: the measured distribution and three maps', () => {
    // histograms (value -> how many), so a million paths cost nothing to keep
    const per: Record<string, number[]> = {}, map: Record<string, number[]> = {}, most: Record<string, number[]> = {};
    const add = (h: Record<string, number[]>, k: string, v: number, n = 1) => { const a = (h[k] ||= []); a[v] = (a[v] || 0) + n; };
    let paths = 0;
    for (const { m } of all) {
      const c = kindsOn(mapNodes(m));
      add(map, 'nodes', mapNodes(m).length);
      for (const k of NODE_KINDS) add(map, k, c[k] || 0);
      for (const p of pathsOf(m)) { paths++; const pc = kindsOn(p); for (const k of NODE_KINDS) add(per, k, pc[k] || 0); }
      // the most of each kind one path can take (a party that seeks it), by a walk from the Boss back
      const best: Record<string, Record<string, number>> = {};
      for (let i = m.rows.length - 1; i >= 0; i--) for (const n of m.rows[i]) {
        best[n.id] = {};
        for (const k of NODE_KINDS) best[n.id][k] = (n.kind === k ? 1 : 0) + Math.max(0, ...n.links.map((l) => best[l][k]));
      }
      for (const k of NODE_KINDS) add(most, k, Math.max(...m.rows[0].map((n) => best[n.id][k])));
    }
    const tot = (h: number[]) => h.reduce((s, x) => s + (x || 0), 0);
    const mean = (h: number[]) => h.reduce((s, x, v) => s + (x || 0) * v, 0) / tot(h);
    const q = (h: number[], f: number) => { let acc = 0; const t = tot(h); for (let v = 0; v < h.length; v++) { acc += h[v] || 0; if (acc > f * t) return v; } return h.length - 1; };
    const share = (h: number[], lo: number, hi: number) => h.reduce((s, x, v) => s + (v >= lo && v <= hi ? x || 0 : 0), 0) / tot(h);
    const lines = ['| Kind | Spec: map (about) | Measured map: mean (5%–95%) | Spec: path | Measured path: mean (5%–95%) | Paths in the spec\'s range | The most one path takes: mean (5%–95%) |', '| --- | --- | --- | --- | --- | --- | --- |'];
    for (const k of [...NODE_KINDS, 'nodes']) {
      const pk = per[k], r = D.expect.path[k];
      lines.push('| ' + k + ' | ' + (D.expect.about[k] ?? '') + ' | ' + mean(map[k]).toFixed(2) + ' (' + q(map[k], 0.05) + '–' + q(map[k], 0.95) + ') | ' + (r ? r.join('–') : '') + ' | ' + (pk ? mean(pk).toFixed(2) + ' (' + q(pk, 0.05) + '–' + q(pk, 0.95) + ')' : '') + ' | ' + (pk && r ? (100 * share(pk, r[0], r[1])).toFixed(1) + '%' : '') + ' | ' + (most[k] ? mean(most[k]).toFixed(2) + ' (' + q(most[k], 0.05) + '–' + q(most[k], 0.95) + ')' : '') + ' |');
    }
    console.log(SEEDS + ' seeds x ' + STAGES + ' stages = ' + all.length + ' maps, ' + paths + ' paths\n' + lines.join('\n'));
    for (const s of ['PHC-0001', 'PHC-0002', 'PHC-0003']) console.log('\n' + s + ', stage 1\n' + renderPathMap(pathMap(s, 1)));
  });
});