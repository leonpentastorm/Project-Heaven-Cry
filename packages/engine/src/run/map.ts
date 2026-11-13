// Survival's path map (rules 1.40; survival-spec rules 7 to 12, section 3.1): a pure, seeded function from (seed, stage,
// data) to one stage's node graph. Every number is data (`data/survival.json` `map`). It knows nothing of `g.run`: the run
// reducer stores what it returns and reads it. The order of the work is fixed (shape, links, kinds rolled under the
// placement rules, then the guarantees repaired deterministically, never rerolled), so the same seed and stage always
// give the same map.
import survivalJ from '../../../../data/survival.json';
import { next, rngFor, type Rng } from '../rng';
import { rollTable } from '../loot';

/** The ten node kinds (survival-spec section 3.1); `event` is the node the card calls Crossroads. */
export type NodeKind = 'fight' | 'elite' | 'boss' | 'shop' | 'forge' | 'training' | 'shrine' | 'rest' | 'cache' | 'event';
/** The ten kinds in the order tables and the renderer list them. */
export const NODE_KINDS: NodeKind[] = ['fight', 'elite', 'boss', 'shop', 'forge', 'training', 'shrine', 'rest', 'cache', 'event'];

/** The path map's numbers (`data/survival.json` `map`; every one provisional). */
export interface MapData {
  rows: number; gate_row: number; shop_rest_row: number; boss_row: number;
  width: { min: number; max: number; rows: Record<string, [number, number]>; start: Record<string, number>; widen: number; widen_two: number };
  links: number; reach: number; fight_rows: number[];
  row_one_of: { row: number; kinds: Record<string, number> };
  kind_weights: Record<string, number>;
  from_depth: Record<string, number>; not_rows: Record<string, number[]>;
  guarantees: { kind: NodeKind; rows: [number, number]; until: number }[];
  shop_gap: number;
  words: Record<string, string>;
  expect?: any;
}
/** The shipped map data (`data/survival.json` `map`). */
export const MAP_DATA: MapData = (survivalJ as any).map;

/** One node of a stage's map. `col` is in half-columns (0 to 2 × (width.max − 1)), so a row of any width sits centred;
 * `links` are ids in the next row; `room` is null until designed rooms exist (spec section 9: must not block). */
export interface PathNode { id: string; depth: number; col: number; kind: NodeKind; gate?: boolean; links: string[]; setting: string | null; room: null }
/** A stage's map: `rows[d - 1]` is depth d, left to right. */
export interface PathMap { seed: string; stage: number; rows: PathNode[][] }

/** A node's id: stage, depth and place in its row, so a node's own streams (`rngFor(seed, id + purpose)`) differ per stage. */
export const nodeId = (stage: number, depth: number, i: number) => 's' + stage + '.d' + depth + '.' + i;

const pick = <T>(r: Rng, xs: T[]): T => xs[Math.floor(next(r) * xs.length)];
/** A key of `w` by weight among those `allowed`, through the loot roller's one weighted pick (`rollTable`). */
const weighted = (r: Rng, w: Record<string, number>, allowed?: (k: string) => boolean): string | null =>
  rollTable(r, { id: 'weights', entries: Object.keys(w).filter((k) => w[k] > 0 && (!allowed || allowed(k))).map((k) => ({ item: k, weight: w[k] })) })?.item ?? null;
const fixedRow = (d: MapData, depth: number) => depth === d.gate_row || depth === d.shop_rest_row || depth === d.boss_row;
/** True when the link from `depth` to `depth + 1` is all-to-all (into or out of the gate, row 14 and the Boss: rule 8). */
const fullLinks = (d: MapData, depth: number) => fixedRow(d, depth) || fixedRow(d, depth + 1);

function widthRange(d: MapData, depth: number): [number, number] {
  return d.width.rows[String(depth)] || [d.width.min, d.width.max];
}

/** The rows' widths: a half starts at a weighted width (`width.start`) and never narrows inside a half (a narrower row
 * would leave a node one link inside the column rule, which guarantee (a) forbids); it widens by `widen` / `widen_two`. */
function shape(d: MapData, r: Rng): number[] {
  const w: number[] = [];
  for (let depth = 1; depth <= d.rows; depth++) {
    if (depth === d.gate_row || depth === d.boss_row) { w.push(1); continue; }
    if (depth === d.shop_rest_row) { w.push(2); continue; }
    const [lo, hi] = widthRange(d, depth);
    const prev = w[depth - 2];
    if (depth === 1 || prev === undefined || depth === d.gate_row + 1 || prev === 1) {
      const s = Number(weighted(r, d.width.start, (k) => Number(k) >= lo && Number(k) <= hi) ?? lo);
      w.push(s); continue;
    }
    const u = next(r);
    let x = prev;
    if (u < d.width.widen_two && prev + 2 <= hi) x = prev + 2;
    else if (u < d.width.widen_two + d.width.widen && prev + 1 <= hi) x = prev + 1;
    w.push(Math.max(lo, Math.min(hi, x)));
  }
  return w;
}

/** How many pairs of links between two rows cross (links to a shared node never do). */
export function crossings(edges: [number, number][]): number {
  let n = 0;
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const [a, b] = edges[i], [c, e] = edges[j];
    if (a !== c && b !== e && (a < c) !== (b < e)) n++;
  }
  return n;
}

/** The links of one row into the next: each node takes `links` targets within `reach` columns, every next node gets a
 * way in, the fewest crossings win (a row that keeps its width needs one: rules 1.40), the stream picks among the rest. */
function linkRow(d: MapData, r: Rng, up: PathNode[], down: PathNode[], filter?: (sets: number[][]) => boolean): number[][] {
  const opts = up.map((u) => {
    const near = down.map((x, j) => (Math.abs(x.col - u.col) <= 2 * d.reach ? j : -1)).filter((j) => j >= 0);
    if (near.length <= d.links) return [near];
    const out: number[][] = [];
    const rec = (from: number, acc: number[]) => { if (acc.length === d.links) { out.push(acc.slice()); return; } for (let k = from; k < near.length; k++) { acc.push(near[k]); rec(k + 1, acc); acc.pop(); } };
    rec(0, []);
    return out;
  });
  let best: number[][][] = [], bestX = Infinity;
  const walk = (i: number, acc: number[][]) => {
    if (i === up.length) {
      const hit = new Set(acc.flat());
      if (hit.size !== down.length) return;
      if (filter && !filter(acc)) return;
      const x = crossings(acc.flatMap((s, a) => s.map((b) => [a, b] as [number, number])));
      if (x < bestX) { bestX = x; best = []; }
      if (x === bestX) best.push(acc.map((s) => s.slice()));
      return;
    }
    for (const o of opts[i]) { acc.push(o); walk(i + 1, acc); acc.pop(); }
  };
  walk(0, []);
  if (!best.length) throw new Error('pathMap: no links from depth ' + up[0].depth + ' (widths ' + up.length + ' → ' + down.length + ')');
  return pick(r, best);
}

/** Everything about a map's graph the repairs and checks read: each node by id, its parents, and the paths through it. */
interface Graph { byId: Record<string, PathNode>; parents: Record<string, string[]>; through: Record<string, number> }
function graphOf(m: PathMap): Graph {
  const byId: Record<string, PathNode> = {}, parents: Record<string, string[]> = {};
  for (const row of m.rows) for (const n of row) { byId[n.id] = n; parents[n.id] = []; }
  for (const row of m.rows) for (const n of row) for (const l of n.links) parents[l].push(n.id);
  const inn: Record<string, number> = {}, out: Record<string, number> = {};
  for (const row of m.rows) for (const n of row) inn[n.id] = n.depth === 1 ? 1 : parents[n.id].reduce((s, p) => s + inn[p], 0);
  for (let i = m.rows.length - 1; i >= 0; i--) for (const n of m.rows[i]) out[n.id] = n.links.length ? n.links.reduce((s, l) => s + out[l], 0) : 1;
  const through: Record<string, number> = {};
  for (const id in byId) through[id] = inn[id] * out[id];
  return { byId, parents, through };
}
/** Every path between two depths (inclusive), as node lists, in a fixed order (row order, then link order). */
function pathsBetween(m: PathMap, from: number, to: number): PathNode[][] {
  const byId: Record<string, PathNode> = {};
  for (const row of m.rows) for (const n of row) byId[n.id] = n;
  const out: PathNode[][] = [];
  const rec = (n: PathNode, acc: PathNode[]) => { acc.push(n); if (n.depth === to) out.push(acc.slice()); else for (const l of n.links) rec(byId[l], acc); acc.pop(); };
  for (const n of m.rows[from - 1]) rec(n, []);
  return out;
}

/** The depth of the last shop before row 1: the run's start in stage 1 (depth 0); from stage 2 the previous stage's
 * row 14 (its Boss stands at depth 0), so the gap runs on into the next stage (rule 9c). */
const shopBefore = (d: MapData, stage: number) => (stage <= 1 ? 0 : d.shop_rest_row - d.boss_row);

/** Guarantees (c) and (d) as rules 1.40 reads them: the nodes a party can stand on, having met no `kind` in depths
 * w0..w1 on its way, from which no `kind` in that window is ahead any more. Empty when the guarantee holds. */
export function stranded(m: PathMap, kind: NodeKind, w0: number, w1: number, until: number = w1 - 1): PathNode[] {
  const g = graphOf(m);
  const isK = (n: PathNode) => n.kind === kind && n.depth >= w0 && n.depth <= w1;
  const ahead: Record<string, boolean> = {}, clean: Record<string, boolean> = {};
  for (let i = Math.min(w1, m.rows.length) - 1; i >= 0; i--) for (const n of m.rows[i]) ahead[n.id] = isK(n) || n.links.some((l) => g.byId[l].depth <= w1 && ahead[l]);
  const out: PathNode[] = [];
  for (let i = 0; i < Math.min(w1, m.rows.length); i++) for (const n of m.rows[i]) {
    clean[n.id] = n.depth === 1 || g.parents[n.id].some((p) => clean[p] && !isK(g.byId[p]));
    if (clean[n.id] && !ahead[n.id] && n.depth <= until) out.push(n);
  }
  return out;
}

/** Guarantee (c)'s gap as rules 1.40 reads it: the stops (the stage's start, then every shop of depths 1 to 13) from
 * which the next shop is more than `shop_gap` nodes ahead on the best route (row 14's shop counts: every node of row
 * 13 links to it). Each comes with the deepest depth a shop may stand at to close it. Empty when it holds. */
export function shopGapsOver(m: PathMap, stage: number = m.stage, d: MapData = MAP_DATA): { from: PathNode | null; by: number }[] {
  const g = graphOf(m);
  const between: Record<string, number> = {}; // nodes strictly between a node and the nearest shop ahead
  for (let i = m.rows.length - 1; i >= 0; i--) for (const n of m.rows[i]) {
    between[n.id] = n.links.length ? Math.min(...n.links.map((l) => (g.byId[l].kind === 'shop' ? 0 : 1 + between[l]))) : Infinity;
  }
  const out: { from: PathNode | null; by: number }[] = [];
  const s0 = shopBefore(d, stage);
  const fromStart = Math.min(...m.rows[0].map((n) => (n.kind === 'shop' ? 0 : 1 + between[n.id]))) + (0 - s0);
  if (fromStart > d.shop_gap) out.push({ from: null, by: s0 + d.shop_gap + 1 });
  for (const n of mapNodes(m)) if (n.kind === 'shop' && n.depth < d.shop_rest_row && between[n.id] > d.shop_gap) out.push({ from: n, by: n.depth + d.shop_gap + 1 });
  return out;
}

/** Can node n become kind k without breaking a placement rule or guarantee (a) or (b)? */
function canBe(d: MapData, m: PathMap, g: Graph, n: PathNode, k: NodeKind): boolean {
  if (n.gate || fixedRow(d, n.depth) || d.fight_rows.includes(n.depth) || n.depth === d.row_one_of.row) return false;
  if (k !== 'fight' && (d.from_depth[k] ?? 0) > n.depth) return false;
  if ((d.not_rows[k] || []).includes(n.depth)) return false;
  const was = n.kind;
  if (k !== 'fight') {
    if (g.parents[n.id].some((p) => g.byId[p].kind === k)) return false;
    if (n.links.some((l) => g.byId[l].kind === k)) return false;
  }
  n.kind = k;
  let ok = true;
  for (const p of g.parents[n.id]) {
    const kids = g.byId[p].links.map((l) => g.byId[l].kind);
    if (kids.length >= 2 && new Set(kids).size < 2) { ok = false; break; }
  }
  if (ok && new Set(m.rows[n.depth - 1].map((x) => x.kind)).size < 2) ok = false;
  n.kind = was;
  return ok;
}

/** The nodes at or ahead of `from` (null: row 1 on) within depths lo..hi. */
function aheadOf(m: PathMap, g: Graph, from: PathNode | null, lo: number, hi: number): PathNode[] {
  const seen = new Set<string>(), out: PathNode[] = [];
  const stack = from ? [from] : m.rows[0].slice();
  while (stack.length) {
    const n = stack.pop()!;
    if (seen.has(n.id) || n.depth > hi) continue;
    seen.add(n.id);
    if (n.depth >= lo) out.push(n);
    for (const l of n.links) stack.push(g.byId[l]);
  }
  return out;
}

/** Turn one of `cands` into kind k: the plain fight with the fewest paths through it (rule 9), else (rules 1.40) a node
 * of a kind no guarantee asks for; ties by the node's own key from the map's stream. False when none may change. */
function convert(d: MapData, m: PathMap, g: Graph, key: Record<string, number>, cands: PathNode[], k: NodeKind, no: Set<string> = new Set()): boolean {
  const guarded = new Set(d.guarantees.map((x) => x.kind));
  for (const pass of ['fight', 'other']) {
    const ok = cands.filter((n) => (pass === 'fight' ? n.kind === 'fight' : n.kind !== 'fight' && !guarded.has(n.kind) && n.kind !== k) && !no.has(n.id + '|' + k) && (canBe(d, m, g, n, k) || (no.add(n.id + '|' + k), false)));
    if (!ok.length) continue;
    ok.sort((x, y) => g.through[x.id] - g.through[y.id] || key[x.id] - key[y.id]);
    ok[0].kind = k;
    return true;
  }
  return false;
}
/** A route's unmet guarantees (rules 1.40): each window whose kind it lacks, and each gap of more than `shop_gap`
 * nodes between its shops (from the stop before row 1 to row 14's shop), as {kind, lo, hi} to fill. */
function routeNeeds(d: MapData, stage: number, a: PathNode[], b: PathNode[]): { kind: NodeKind; lo: number; hi: number }[] {
  const out: { kind: NodeKind; lo: number; hi: number }[] = [];
  for (const w of d.guarantees) {
    const has = (p: PathNode[]) => p.some((n) => n.kind === w.kind && n.depth >= w.rows[0] && n.depth <= w.rows[1]);
    if (!has(a) && !has(b)) out.push({ kind: w.kind, lo: w.rows[0], hi: w.rows[1] });
  }
  const at = [shopBefore(d, stage), ...a.filter((n) => n.kind === 'shop').map((n) => n.depth), ...b.filter((n) => n.kind === 'shop').map((n) => n.depth), d.shop_rest_row];
  for (let i = 1; i < at.length; i++) if (at[i] - at[i - 1] - 1 > d.shop_gap) out.push({ kind: 'shop', lo: at[i - 1] + 1, hi: Math.min(at[i] - 1, at[i - 1] + d.shop_gap + 1) });
  return out;
}

/** The routes through a map, best first: every first half (rows 1 to the gate's) with every second half (the gate's
 * to row 14's), ranked by how many guarantees each still lacks, then by enumeration order. */
function* routes(d: MapData, m: PathMap, stage: number): Generator<{ a: PathNode[]; b: PathNode[]; needs: { kind: NodeKind; lo: number; hi: number }[] }> {
  const A = pathsBetween(m, 1, d.gate_row - 1), B = pathsBetween(m, d.gate_row + 1, d.shop_rest_row - 1);
  const full = (1 << d.guarantees.length) - 1;
  const mask = (p: PathNode[]) => d.guarantees.reduce((s, w, i) => (p.some((n) => n.kind === w.kind && n.depth >= w.rows[0] && n.depth <= w.rows[1]) ? s | (1 << i) : s), 0);
  const gaps = (at: number[]) => { let k = 0; for (let i = 1; i < at.length; i++) if (at[i] - at[i - 1] - 1 > d.shop_gap) k++; return k; };
  const shops = (p: PathNode[]) => p.filter((n) => n.kind === 'shop').map((n) => n.depth);
  // halves that score alike are grouped, so a pair of groups is scored once (a map has thousands of routes, tens of groups)
  const group = (ps: PathNode[][], f: (p: PathNode[]) => { mask: number; gaps: number; end: number }) => {
    const out = new Map<string, { mask: number; gaps: number; end: number; ps: PathNode[][] }>();
    for (const p of ps) { const s = f(p), k = s.mask + ',' + s.gaps + ',' + s.end; if (!out.has(k)) out.set(k, { ...s, ps: [] }); out.get(k)!.ps.push(p); }
    return [...out.values()];
  };
  const ga = group(A, (p) => { const s = [shopBefore(d, stage), ...shops(p)]; return { mask: mask(p), gaps: gaps(s), end: s[s.length - 1] }; });
  const gb = group(B, (p) => { const s = [...shops(p), d.shop_rest_row]; return { mask: mask(p), gaps: gaps(s), end: s[0] }; });
  const bits = (x: number) => { let k = 0; for (; x; x &= x - 1) k++; return k; };
  const buckets: [number, number][][] = [];
  ga.forEach((x, i) => gb.forEach((y, j) => {
    const c = bits(full & ~(x.mask | y.mask)) + x.gaps + y.gaps + (y.end - x.end - 1 > d.shop_gap ? 1 : 0);
    (buckets[c] ||= []).push([i, j]);
  }));
  for (const xs of buckets) for (const [i, j] of xs || []) for (const a of ga[i].ps) for (const b of gb[j].ps) yield { a, b, needs: routeNeeds(d, stage, a, b) };
}

/** The reference route (survival-spec 5.4 and 5.6; guarantee (c) and (d) as rules 1.40 reads them): one route from
 * row 1 to the Boss that holds every guaranteed kind in its window and never more than `shop_gap` nodes between
 * shops. Null when none does (the 1,000-seed test forbids it). The simulated party walks it. */
export function referenceRoute(m: PathMap, stage: number = m.stage, d: MapData = MAP_DATA): PathNode[] | null {
  const best = routes(d, m, stage).next().value;
  return best && !best.needs.length ? [...best.a, m.rows[d.gate_row - 1][0], ...best.b, m.rows[d.shop_rest_row - 1].find((n) => n.kind === 'shop')!, m.rows[d.boss_row - 1][0]] : null;
}

/** Repair the guarantees (rule 9 c and d, as rules 1.40 reads them), the shallowest break first, deterministically;
 * returns false if one could not be met (the map then fails `mapProblems`, which the 1,000-seed test forbids). */
function repair(d: MapData, m: PathMap, stage: number, key: Record<string, number>): boolean {
  for (let guard = 0; guard < 200; guard++) {
    const g = graphOf(m);
    let fixed = false, broke = false;
    const no = new Set<string>();
    // the reference route first: the best route takes the kind it lacks on itself (the first one that can change)
    const rs = routes(d, m, stage);
    let cur = rs.next();
    if (!cur.done && cur.value.needs.length) {
      broke = true;
      for (; !cur.done; cur = rs.next()) {
        const rt = cur.value, path = [...rt.a, ...rt.b];
        if (rt.needs.some((nd) => convert(d, m, g, key, path.filter((n) => n.depth >= nd.lo && n.depth <= nd.hi), nd.kind, no))) { fixed = true; break; }
      }
      if (!fixed) return false;
      continue;
    }
    for (const want of d.guarantees) {
      const [w0, w1] = want.rows;
      const s = stranded(m, want.kind, w0, w1, want.until)[0];
      if (!s) continue;
      broke = true;
      fixed = convert(d, m, g, key, aheadOf(m, g, s, Math.max(w0, s.depth), w1), want.kind);
      break;
    }
    if (!broke) {
      const gap = shopGapsOver(m, stage, d)[0];
      if (gap) { broke = true; fixed = convert(d, m, g, key, aheadOf(m, g, gap.from, (gap.from?.depth ?? 0) + 1, gap.by), 'shop'); }
    }
    if (!broke) return true;
    if (!fixed) return false;
  }
  return false;
}

/** A stage's path map (rules 1.40; survival-spec rules 7 to 9 and 12): the shape, the links, the kinds rolled by
 * `kind_weights` under the placement rules, then the guarantees repaired. Pure and deterministic: the stream is
 * `rngFor(seed, 'map#' + stage)`. `setting` is the stage's tile (rule 10), written on every node. */
export function pathMap(seed: string, stage: number, d: MapData = MAP_DATA, setting: string | null = null): PathMap {
  const r = rngFor(seed, 'map#' + stage);
  const widths = shape(d, r);
  const cols = 2 * (d.width.max - 1);
  const rows: PathNode[][] = widths.map((w, i) => Array.from({ length: w }, (_, j) => ({
    id: nodeId(stage, i + 1, j), depth: i + 1, col: cols / 2 - (w - 1) + 2 * j, kind: 'fight' as NodeKind, links: [] as string[], setting, room: null,
  })));
  const m: PathMap = { seed, stage, rows };
  // links (rule 8)
  for (let i = 0; i < rows.length - 1; i++) {
    const up = rows[i], down = rows[i + 1];
    if (fullLinks(d, i + 1)) { for (const u of up) u.links = down.map((x) => x.id); continue; }
    // into the row with one special (row 2): every parent shares a child, so the special can sit under all of them
    const filter = i + 2 === d.row_one_of.row ? (sets: number[][]) => sets.reduce((acc, s) => acc.filter((x) => s.includes(x)), sets[0]).length > 0 : undefined;
    const sets = linkRow(d, r, up, down, filter);
    up.forEach((u, a) => { u.links = sets[a].map((j) => down[j].id); });
  }
  const key: Record<string, number> = {};
  for (const row of rows) for (const n of row) key[n.id] = next(r);
  const g = graphOf(m);
  // fixed rows (rule 7)
  for (const row of rows) {
    const depth = row[0].depth;
    if (depth === d.gate_row) { row[0].kind = 'elite'; row[0].gate = true; }
    else if (depth === d.boss_row) row[0].kind = 'boss';
    else if (depth === d.shop_rest_row) { const s = next(r) < 0.5 ? 0 : 1; row[s].kind = 'shop'; row[1 - s].kind = 'rest'; }
    else if (depth === d.row_one_of.row) {
      const under = row.filter((n) => rows[depth - 2].every((p) => p.links.includes(n.id)));
      const at = pick(r, under.length ? under : row);
      at.kind = (weighted(r, d.row_one_of.kinds) || 'fight') as NodeKind;
    }
  }
  // rolled rows (rule 9), row by row, left to right, each kind drawn from those the rules allow here
  for (const row of rows) {
    const depth = row[0].depth;
    if (fixedRow(d, depth) || d.fight_rows.includes(depth) || depth === d.row_one_of.row) continue;
    const done = new Set<string>();
    row.forEach((n, idx) => {
      const ok = (k: string) => {
        if (k !== 'fight' && (d.from_depth[k] ?? 0) > depth) return false;
        if ((d.not_rows[k] || []).includes(depth)) return false;
        if (k !== 'fight' && g.parents[n.id].some((p) => g.byId[p].kind === k)) return false;
        for (const p of g.parents[n.id]) { // (a): a parent's links are of two kinds
          const kids = g.byId[p].links.filter((l) => l !== n.id);
          const set = kids.filter((l) => done.has(l)).map((l) => g.byId[l].kind);
          if (kids.length && set.length === kids.length && set.every((x) => x === k)) return false;
        }
        if (idx === row.length - 1 && row.length > 1 && row.slice(0, -1).every((x) => x.kind === k)) return false;
        return true;
      };
      n.kind = (weighted(r, d.kind_weights, ok) || 'fight') as NodeKind;
      done.add(n.id);
    });
  }
  repair(d, m, stage, key);
  return m;
}

/** Every node of a map, row by row. */
export const mapNodes = (m: PathMap): PathNode[] => m.rows.flat();

/** Every path from depth 1 to the Boss, as node lists (a few thousand at most: use for checks and tools, not per frame). */
export const mapPaths = (m: PathMap): PathNode[][] => pathsBetween(m, 1, m.rows.length);

/** What breaks a rule of 1.40 in this map, in words (empty: none). The generator's own check, and the test's. */
export function mapProblems(m: PathMap, stage: number = m.stage, d: MapData = MAP_DATA): string[] {
  const out: string[] = [];
  const g = graphOf(m);
  const special = (k: NodeKind) => k !== 'fight';
  if (m.rows.length !== d.rows) out.push('rows ' + m.rows.length);
  m.rows.forEach((row, i) => {
    const depth = i + 1;
    const want = depth === d.gate_row || depth === d.boss_row ? [1, 1] : depth === d.shop_rest_row ? [2, 2] : widthRange(d, depth);
    if (row.length < want[0] || row.length > want[1]) out.push('depth ' + depth + ': ' + row.length + ' nodes');
    const kinds = row.map((n) => n.kind);
    if (d.fight_rows.includes(depth) && kinds.some((k) => k !== 'fight')) out.push('depth ' + depth + ': not all fights');
    if (depth === d.row_one_of.row && (kinds.filter((k) => k !== 'fight').length > 1 || kinds.some((k) => k !== 'fight' && !(k in d.row_one_of.kinds)))) out.push('depth ' + depth + ': ' + kinds.join(','));
    if (depth === d.gate_row && !(row[0].kind === 'elite' && row[0].gate)) out.push('the gate is ' + row[0].kind);
    if (depth === d.boss_row && row[0].kind !== 'boss') out.push('the Boss row is ' + row[0].kind);
    if (depth === d.shop_rest_row && kinds.slice().sort().join() !== 'rest,shop') out.push('depth ' + depth + ': ' + kinds.join(','));
    if (depth >= 2 && row.length >= 2 && new Set(kinds).size < 2) out.push('depth ' + depth + ': one kind');
    for (const n of row) {
      if (!fixedRow(d, depth) && n.kind === 'boss') out.push(n.id + ': a Boss off its row');
      if (!n.gate && depth !== d.gate_row && (d.from_depth[n.kind] ?? 0) > depth) out.push(n.id + ': ' + n.kind + ' before depth ' + d.from_depth[n.kind]);
      if ((d.not_rows[n.kind] || []).includes(depth)) out.push(n.id + ': ' + n.kind + ' in depth ' + depth);
      if (depth < d.rows && !n.links.length) out.push(n.id + ': no way out');
      if (depth > 1 && !g.parents[n.id].length) out.push(n.id + ': no way in');
      for (const l of n.links) {
        const t = g.byId[l];
        if (!t || t.depth !== depth + 1) { out.push(n.id + ': a link to ' + l); continue; }
        if (!fullLinks(d, depth) && Math.abs(t.col - n.col) > 2 * d.reach) out.push(n.id + ': a link past the column rule');
        if (special(n.kind) && t.kind === n.kind) out.push(n.id + ': ' + n.kind + ' links to ' + n.kind);
      }
      if (!fullLinks(d, depth) && depth < d.rows && n.links.length !== d.links) out.push(n.id + ': ' + n.links.length + ' links');
      if (n.links.length >= 2 && new Set(n.links.map((l) => g.byId[l].kind)).size < 2) out.push(n.id + ': its links are one kind');
    }
    if (depth < d.rows && !fullLinks(d, depth)) {
      const edges = row.flatMap((n, a) => n.links.map((l) => [a, m.rows[depth].findIndex((x) => x.id === l)] as [number, number]));
      const x = crossings(edges);
      if (x > (m.rows[depth].length > row.length ? 0 : 1)) out.push('depth ' + depth + ': ' + x + ' crossings');
    }
  });
  if (out.length) return out;
  for (const want of d.guarantees) {
    const s = stranded(m, want.kind, want.rows[0], want.rows[1], want.until);
    if (s.length) out.push(s[0].id + ': no ' + want.kind + ' in depths ' + want.rows[0] + ' to ' + want.rows[1] + ' is ahead any more');
  }
  if (!referenceRoute(m, stage, d)) out.push('no route holds every guaranteed kind with its shops ' + d.shop_gap + ' nodes apart at most');
  for (const x of shopGapsOver(m, stage, d)) out.push((x.from ? x.from.id : 'the start') + ': the next shop is more than ' + d.shop_gap + ' nodes ahead');
  return out;
}

/** The choices on one path: at how many of its steps the node it stands on links to two kinds or more (rule 9a). */
export function choiceSteps(path: PathNode[], m: PathMap): number {
  const byId: Record<string, PathNode> = {};
  for (const n of mapNodes(m)) byId[n.id] = n;
  return path.filter((n) => new Set(n.links.map((l) => byId[l].kind)).size >= 2).length;
}

/** A map as text, the Boss at the top (for `npm run try`-style reading and hand-offs): each node its kind's word, the
 * gate marked, and between rows a stroke per link (`/`, `|`, `\`, `X` where two cross). */
export function renderPathMap(m: PathMap, d: MapData = MAP_DATA): string {
  const S = 6, pad = 4, W = pad + S * 2 * (d.width.max - 1) + 20;
  const word = (n: PathNode) => (n.gate ? 'GATE' : d.words[n.kind] || n.kind);
  const lines: string[] = [];
  for (let i = m.rows.length - 1; i >= 0; i--) {
    const row = m.rows[i];
    const line = Array(W).fill(' ');
    for (const n of row) {
      const w = word(n), x = pad + n.col * S + 6 - Math.floor(w.length / 2);
      for (let k = 0; k < w.length; k++) line[x + k] = w[k];
    }
    lines.push(String(i + 1).padStart(2) + ' ' + line.join('').trimEnd());
    if (i > 0) {
      const below = m.rows[i - 1];
      const strokes = Array(W).fill(' ');
      for (const n of below) for (const l of n.links) {
        const t = row.find((x) => x.id === l)!;
        const x = pad + Math.round(((n.col + t.col) / 2) * S) + 6;
        const ch = t.col > n.col ? '/' : t.col < n.col ? '\\' : '|';
        strokes[x] = strokes[x] === ' ' || strokes[x] === ch ? ch : 'X';
      }
      lines.push('   ' + strokes.join('').trimEnd());
    }
  }
  return lines.join('\n');
}
