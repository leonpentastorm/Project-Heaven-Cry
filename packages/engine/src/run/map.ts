// Survival's path map, LANES (rules 1.48, Leon 13 Nov; replaces rules 1.40's every-node-links-to-two rows; survival-spec
// rules 7 to 12, section 3.1): a pure, seeded function from (seed, stage, data) to one stage's node graph. Every number
// is data (`data/survival.json` `map`). It knows nothing of `g.run`: the run reducer stores what it returns and reads it.
//
// The shape: from the start (the camp, before depth 1) EVERY lane can be chosen; a lane is a run of nodes with exactly
// one way forward; lanes meet only at JUNCTIONS (two or three neighbouring lanes merge into one node and split again),
// at the gate (every lane), at the final junction (every lane, before row 14's shop and rest) and at the Boss. A run of
// a lane between two meeting nodes is a SEGMENT; the segments leaving one meeting node take distinct themes (data), so
// the choice is made by reading ahead. One dead end, the VAULT: a spur of two nodes (a guard fight, then a chest) off an
// edge lane in the middle third; after the chest the party walks on along the lane it left.
//
// The order of the work is fixed (lanes, junctions, nodes, links, kinds by theme, the guarantees repaired
// deterministically, never rerolled, then the vault), so the same seed and stage always give the same map.
import '../datatext'; // fills the texts' {=placeholders} before any data is read
import survivalJ from '../../../../data/survival.json';
import { next, rngFor, type Rng } from '../rng';
import { rollTable } from '../loot';

/** The twelve node kinds (survival-spec section 3.1); `event` is the node the card calls Crossroads; `vault_guard` and
 * `vault` are the dead end's two steps (rules 1.48). */
export type NodeKind = 'fight' | 'elite' | 'boss' | 'shop' | 'forge' | 'training' | 'shrine' | 'rest' | 'cache' | 'event' | 'vault_guard' | 'vault';
/** The kinds in the order tables and the renderer list them. */
export const NODE_KINDS: NodeKind[] = ['fight', 'elite', 'boss', 'shop', 'forge', 'training', 'shrine', 'rest', 'cache', 'event', 'vault_guard', 'vault'];

/** A segment's theme (`map.themes`): what it holds (placed in order where the placement rules allow) and what fills the
 * rest of it (weights; none: fights). */
export interface MapTheme { id: string; name: string; weight: number; holds: NodeKind[]; fill?: Record<string, number> }
/** The path map's numbers (`data/survival.json` `map`; every one provisional). */
export interface MapData {
  rows: number; gate_row: number; final_row: number; shop_rest_row: number; boss_row: number;
  /** How many lanes a stage has, by weight. */
  lanes: Record<string, number>;
  /** A junction merges `sizes` neighbouring lanes (by weight); every segment is `segment` [min, max] nodes long. */
  junction: { sizes: Record<string, number>; segment: [number, number] };
  fight_rows: number[];
  /** The kinds a junction node rolls (weights). */
  junction_kinds: Record<string, number>;
  themes: MapTheme[];
  from_depth: Record<string, number>; not_rows: Record<string, number[]>;
  /** Kinds every route from the start to the Boss passes in depths 1 to `final_row`. */
  every_route: NodeKind[];
  /** Kinds the reference route holds in its window (rows [first, last]). */
  guarantees: { kind: NodeKind; rows: [number, number] }[];
  shop_gap: number;
  vault: { depths: [number, number]; edge: boolean };
  words: Record<string, string>;
  expect?: any;
}
/** The shipped map data (`data/survival.json` `map`). */
export const MAP_DATA: MapData = (survivalJ as any).map;

/** One node of a stage's map. `col` is in half-lanes (lane i sits at 2i; a junction at the mean of its lanes; the vault's
 * spur two outside its lane); `links` are the ids it leads to; `room` is null until designed rooms exist (spec section
 * 9: must not block). `lane`: a lane node's lane; `junction`: a node where lanes meet (the gate is one too); `seg` and
 * `theme`: a lane node's segment and its theme; `spur` and `from`: the vault's two steps and the lane node they leave. */
export interface PathNode {
  id: string; depth: number; col: number; kind: NodeKind; gate?: boolean; links: string[]; setting: string | null; room: null;
  lane?: number; junction?: boolean; seg?: string; theme?: string; spur?: 'guard' | 'chest'; from?: string;
}
/** A stage's map: `rows[d - 1]` is depth d, top to bottom by `col`; `spur` the vault's two nodes (off the rows). */
export interface PathMap { seed: string; stage: number; lanes: number; rows: PathNode[][]; spur: PathNode[] }

/** A node's id: stage, depth and place in its row, so a node's own streams (`rngFor(seed, id + purpose)`) differ per stage. */
export const nodeId = (stage: number, depth: number, i: number | string) => 's' + stage + '.d' + depth + '.' + i;

/** A key of `w` by weight among those `allowed`, through the loot roller's one weighted pick (`rollTable`). */
const weighted = (r: Rng, w: Record<string, number>, allowed?: (k: string) => boolean): string | null =>
  rollTable(r, { id: 'weights', entries: Object.keys(w).filter((k) => w[k] > 0 && (!allowed || allowed(k))).map((k) => ({ item: k, weight: w[k] })) })?.item ?? null;
const pick = <T>(r: Rng, xs: T[]): T => xs[Math.floor(next(r) * xs.length)];

/** How many pairs of links between two rows cross (links to a shared node never do). Lanes never cross: the test. */
export function crossings(edges: [number, number][]): number {
  let n = 0;
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const [a, b] = edges[i], [c, e] = edges[j];
    if (a !== c && b !== e && (a < c) !== (b < e)) n++;
  }
  return n;
}

/** The ways to split `n` neighbouring lanes into junction groups of the allowed sizes, left to right. */
function compositions(n: number, sizes: number[]): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const s of sizes) if (s <= n) for (const rest of compositions(n - s, sizes)) out.push([s, ...rest]);
  return out;
}

/** One span between two all-lane meeting rows (the start at depth 0, the gate, the final junction): its junction
 * groups, each a set of neighbouring lanes and the depth they merge at (none: the span is one segment a lane). */
interface Span { a: number; b: number; groups: { lanes: number[]; row: number }[] }
function spansOf(d: MapData, r: Rng, L: number): Span[] {
  const [lo, hi] = d.junction.segment;
  const out: Span[] = [];
  for (const [a, b] of [[0, d.gate_row], [d.gate_row, d.final_row]] as [number, number][]) {
    const n = b - a - 1;
    if (n <= hi) { out.push({ a, b, groups: [] }); continue; }
    const sizes = Object.keys(d.junction.sizes).map(Number).filter((s) => d.junction.sizes[s] > 0);
    const comps = compositions(L, sizes);
    if (!comps.length) throw new Error('pathMap: ' + L + ' lanes cannot be grouped into junctions of ' + sizes.join(' or '));
    const comp = pick(r, comps);
    const rowsOk: number[] = [];
    for (let j = a + 1; j < b; j++) { const x = j - a - 1, y = b - j - 1; if (x >= lo && x <= hi && y >= lo && y <= hi) rowsOk.push(j); }
    if (!rowsOk.length) throw new Error('pathMap: no junction row between depths ' + a + ' and ' + b + ' keeps every segment ' + lo + ' to ' + hi + ' long');
    let at = 0;
    out.push({ a, b, groups: comp.map((s) => { const lanes = Array.from({ length: s }, (_, i) => at + i); at += s; return { lanes, row: pick(r, rowsOk) }; }) });
  }
  return out;
}

/** Every route from depth 1 to the Boss along the lanes (the vault's spur left out), as node lists, in a fixed order. */
function lanePaths(m: PathMap, from?: PathNode): PathNode[][] {
  const byId = byIdOf(m), out: PathNode[][] = [];
  const rec = (n: PathNode, acc: PathNode[]) => {
    acc.push(n);
    const on = n.links.map((l) => byId[l]).filter((x) => x && !x.spur);
    if (!on.length) out.push(acc.slice()); else for (const x of on) rec(x, acc);
    acc.pop();
  };
  for (const n of from ? [from] : m.rows[0]) rec(n, []);
  return out;
}
const byIdOf = (m: PathMap): Record<string, PathNode> => { const o: Record<string, PathNode> = {}; for (const n of mapNodes(m)) o[n.id] = n; return o; };
const parentsOf = (m: PathMap): Record<string, string[]> => { const o: Record<string, string[]> = {}; for (const n of mapNodes(m)) o[n.id] ||= []; for (const n of mapNodes(m)) for (const l of n.links) (o[l] ||= []).push(n.id); return o; };

/** The meeting nodes a party chooses its lane at (rules 1.48): the start (null) and every junction, the gate and the
 * final junction included. */
export const choicePoints = (m: PathMap): (PathNode | null)[] => [null, ...m.rows.flat().filter((n) => n.junction)];

/** A map's segments: each lane's run of lane nodes between two meeting nodes, with the meeting node it leaves (null: the
 * start). The segments leaving one node are siblings: the choice there. */
export function segmentsOf(m: PathMap): { id: string; from: string | null; nodes: PathNode[] }[] {
  const out: Record<string, { id: string; from: string | null; nodes: PathNode[] }> = {}, par = parentsOf(m), byId = byIdOf(m);
  for (const row of m.rows) for (const n of row) {
    if (!n.seg) continue;
    const s = (out[n.seg] ||= { id: n.seg, from: null, nodes: [] });
    if (!s.nodes.length) { const p = (par[n.id] || []).map((x) => byId[x]).find((x) => !x.spur); s.from = p ? p.id : null; }
    s.nodes.push(n);
  }
  return Object.values(out);
}
/** A segment's signature (what it offers, sorted): siblings must differ (rules 1.48, the choice by reading ahead). */
const signature = (nodes: PathNode[]) => nodes.map((n) => n.kind).sort().join(',');

/** Is kind k allowed on node n (the placement rules: rows, depths, no special kind next to its own kind)? */
function allowed(d: MapData, m: PathMap, n: PathNode, k: NodeKind, par: Record<string, string[]>, byId: Record<string, PathNode>): boolean {
  if (k === 'fight') return true;
  if ((d.from_depth[k] ?? 0) > n.depth) return false;
  if ((d.not_rows[k] || []).includes(n.depth)) return false;
  if ((par[n.id] || []).some((p) => byId[p].kind === k)) return false;
  if (n.links.some((l) => byId[l]?.kind === k)) return false;
  void m;
  return true;
}
/** Can node n change kind (not a fixed node, not a row of plain fights)? */
const movable = (d: MapData, n: PathNode) => !n.gate && !n.spur && n.depth !== d.boss_row && n.depth !== d.shop_rest_row && !d.fight_rows.includes(n.depth);

/** The depth of the shop before row 1 for the reference route's gap: the run's start (0) in stage 1; from stage 2 the
 * previous stage's row 14 (its Boss stands at depth 0), so the gap runs on into the next stage (rule 9c). */
const shopBefore = (d: MapData, stage: number) => (stage <= 1 ? 0 : d.shop_rest_row - d.boss_row);

/** A route's unmet reference guarantees (rule 9 c, d): each window whose kind it lacks, and each gap of more than
 * `shop_gap` nodes between its shops (from the stop before row 1 to row 14's shop), as {kind, lo, hi} to fill. */
function routeNeeds(d: MapData, stage: number, p: PathNode[]): { kind: NodeKind; lo: number; hi: number }[] {
  const out: { kind: NodeKind; lo: number; hi: number }[] = [];
  for (const w of d.guarantees) if (!p.some((n) => n.kind === w.kind && n.depth >= w.rows[0] && n.depth <= w.rows[1])) out.push({ kind: w.kind, lo: w.rows[0], hi: w.rows[1] });
  const at = [shopBefore(d, stage), ...p.filter((n) => n.kind === 'shop' && n.depth < d.shop_rest_row).map((n) => n.depth), d.shop_rest_row];
  for (let i = 1; i < at.length; i++) if (at[i] - at[i - 1] - 1 > d.shop_gap) out.push({ kind: 'shop', lo: at[i - 1] + 1, hi: Math.min(at[i] - 1, at[i - 1] + d.shop_gap + 1) });
  return out;
}

/** The reference route (survival-spec 5.4 and 5.6; rule 9 c and d): the first lane route, from row 1 to the Boss
 * through row 14's shop, that holds every guaranteed kind in its window and never more than `shop_gap` nodes between
 * shops. Null when none does (the 1,000-seed test forbids it). The simulated party walks it. */
export function referenceRoute(m: PathMap, stage: number = m.stage, d: MapData = MAP_DATA): PathNode[] | null {
  for (const p of lanePaths(m)) if (p.some((n) => n.kind === 'shop' && n.depth === d.shop_rest_row) && !routeNeeds(d, stage, p).length) return p;
  return null;
}

/** The nearest shop ahead of a choice point (null: the start, depth 0), in nodes (the shop's depth less the point's). */
export function shopAhead(m: PathMap, from: PathNode | null): number {
  const byId = byIdOf(m), d0 = from ? from.depth : 0;
  let best = Infinity;
  const seen = new Set<string>(), stack = from ? from.links.map((l) => byId[l]) : m.rows[0].slice();
  while (stack.length) {
    const n = stack.pop()!; if (!n || seen.has(n.id) || n.spur) continue; seen.add(n.id);
    if (n.kind === 'shop') { best = Math.min(best, n.depth - d0); continue; }
    for (const l of n.links) stack.push(byId[l]);
  }
  return best;
}

/** Convert one fight (else one node of a kind no rule asks for) of `cands` into kind k, the one on most `weight` first,
 * ties by the node's own key from the map's stream. False when none may change. */
function convert(d: MapData, m: PathMap, cands: PathNode[], k: NodeKind, key: Record<string, number>, weight: (n: PathNode) => number = () => 0): boolean {
  const par = parentsOf(m), byId = byIdOf(m);
  const guarded = new Set<string>([...d.guarantees.map((x) => x.kind), ...d.every_route]);
  for (const pass of ['fight', 'other']) {
    const ok = cands.filter((n) => movable(d, n) && n.kind !== k && (pass === 'fight' ? n.kind === 'fight' : n.kind !== 'fight' && n.kind !== 'elite' && !guarded.has(n.kind)) && allowed(d, m, n, k, par, byId));
    if (!ok.length) continue;
    ok.sort((x, y) => weight(y) - weight(x) || key[x.id] - key[y.id]);
    ok[0].kind = k;
    return true;
  }
  return false;
}

/** By segment: the kinds its sibling segments (those leaving the same meeting node) hold. */
function sibKinds(m: PathMap): Record<string, Set<string>> {
  const segs = segmentsOf(m), out: Record<string, Set<string>> = {};
  for (const s of segs) out[s.id] = new Set(segs.filter((x) => x !== s && x.from === s.from).flatMap((x) => x.nodes.map((n) => n.kind)));
  return out;
}
/** The kinds a sibling may take to tell itself from another (rules 1.48 repair 4), in the order tried. */
const SWAP_KINDS: NodeKind[] = ['cache', 'event', 'training', 'shrine', 'forge', 'rest', 'shop'];
/** Guarantees (1) to (3) of the repair, as one test. */
function coreHolds(d: MapData, m: PathMap, stage: number): boolean {
  const routes = lanePaths(m);
  for (const k of d.every_route) if (routes.some((p) => !p.some((n) => n.kind === k && n.depth <= d.final_row))) return false;
  for (const cp of choicePoints(m)) if (shopAhead(m, cp) > d.shop_gap) return false;
  return !!referenceRoute(m, stage, d);
}

/** Repair the guarantees (rules 1.48) in a fixed order, deterministically: (1) every route passes each `every_route`
 * kind in depths 1 to `final_row`; (2) from the start and every junction a shop lies within `shop_gap` nodes on some
 * route; (3) the reference route; (4) sibling segments offer different things. False if one could not be met (the map
 * then fails `mapProblems`, which the 1,000-seed test forbids). */
function repair(d: MapData, m: PathMap, stage: number, key: Record<string, number>): boolean {
  for (let guard = 0; guard < 200; guard++) {
    const routes = lanePaths(m).map((p) => p.filter((n) => n.depth <= d.final_row));
    // (1) every route: the node on most failing routes takes the kind
    let broke = false, fixed = false;
    for (const k of d.every_route) {
      const bad = routes.filter((p) => !p.some((n) => n.kind === k));
      if (!bad.length) continue;
      broke = true;
      const on: Record<string, number> = {}; for (const p of bad) for (const n of p) on[n.id] = (on[n.id] || 0) + 1;
      // a node whose sibling lane already offers k is the last choice (the lanes must stay different, repair 4)
      const sib = sibKinds(m);
      fixed = convert(d, m, bad[0], k, key, (n) => (on[n.id] || 0) - (n.seg && sib[n.seg]?.has(k) ? 1000 : 0));
      break;
    }
    if (broke) { if (!fixed) return false; continue; }
    // (2) a shop within reach of every choice point
    for (const cp of choicePoints(m)) {
      const d0 = cp ? cp.depth : 0;
      if (shopAhead(m, cp) <= d.shop_gap) continue;
      broke = true;
      const ahead = lanePaths(m, cp ?? undefined).flat().filter((n) => n.depth > d0 && n.depth <= d0 + d.shop_gap);
      const on: Record<string, number> = {}; for (const n of ahead) on[n.id] = (on[n.id] || 0) + 1;
      fixed = convert(d, m, [...new Map(ahead.map((n) => [n.id, n])).values()], 'shop', key, (n) => on[n.id] || 0);
      break;
    }
    if (broke) { if (!fixed) return false; continue; }
    // (3) the reference route: the route lacking least takes what it lacks
    if (!referenceRoute(m, stage, d)) {
      const ps = lanePaths(m).filter((p) => p.some((n) => n.kind === 'shop' && n.depth === d.shop_rest_row));
      const ranked = ps.map((p, i) => ({ p, i, needs: routeNeeds(d, stage, p) })).sort((x, y) => x.needs.length - y.needs.length || x.i - y.i);
      for (const r of ranked) if (r.needs.some((nd) => convert(d, m, r.p.filter((n) => n.depth >= nd.lo && n.depth <= nd.hi), nd.kind, key))) { fixed = true; break; }
      if (!fixed) return false;
      continue;
    }
    // (4) siblings differ: one node of the later of two alike (else of the earlier) takes a kind the other lacks, its
    // fights first, so long as (1) to (3) still hold
    const segs = segmentsOf(m), from: Record<string, typeof segs> = {};
    for (const s of segs) (from[s.from ?? 'start'] ||= []).push(s);
    const par = parentsOf(m), byId = byIdOf(m);
    for (const sibs of Object.values(from)) {
      for (let i = 0; i < sibs.length && !broke; i++) for (let j = i + 1; j < sibs.length && !broke; j++) {
        if (signature(sibs[i].nodes) !== signature(sibs[j].nodes)) continue;
        broke = true;
        for (const [mine, other] of [[sibs[j], sibs[i]], [sibs[i], sibs[j]]]) {
          const ns = mine.nodes.filter((n) => movable(d, n) && n.kind !== 'elite').sort((x, y) => Number(x.kind !== 'fight') - Number(y.kind !== 'fight') || key[x.id] - key[y.id]);
          for (const n of ns) {
            for (const k of SWAP_KINDS) {
              if (n.kind === k || other.nodes.some((x) => x.kind === k) || !allowed(d, m, n, k, par, byId)) continue;
              const was = n.kind; n.kind = k;
              if (coreHolds(d, m, stage)) { fixed = true; break; }
              n.kind = was;
            }
            if (fixed) break;
          }
          if (fixed) break;
        }
      }
      if (broke) break;
    }
    if (!broke) return true;
    if (!fixed) return false;
  }
  return false;
}

/** How many draws a stage's map may take: a draw whose repair can't meet every guarantee (about one in seventy, when
 * the lanes from one meeting node are too short to differ and still carry the shop and rest every route needs) is
 * drawn again from the next stream; the 1,000-seed test measures it and forbids a map that fails them all. */
export const MAP_DRAWS = 8;
/** A stage's path map (rules 1.48; survival-spec rules 7 to 9 and 12): the lanes and their junctions, the links, the
 * kinds by segment theme under the placement rules, the guarantees repaired, then the vault's spur. Pure and
 * deterministic: the first draw's stream is `rngFor(seed, 'map#' + stage)`, a later draw's `'map#' + stage + '#' + n`.
 * `setting` is the stage's tile (rule 10), on every node. */
export function pathMap(seed: string, stage: number, d: MapData = MAP_DATA, setting: string | null = null): PathMap {
  let m: PathMap | null = null;
  for (let n = 0; n < MAP_DRAWS; n++) {
    m = drawMap(seed, stage, d, setting, n);
    if (!mapProblems(m, stage, d).length) return m;
  }
  return m!;
}
/** One draw of a stage's map (pathMap). `draw` is the draw's number (0: the first). */
export function drawMap(seed: string, stage: number, d: MapData, setting: string | null, draw: number): PathMap {
  const r = rngFor(seed, 'map#' + stage + (draw ? '#' + draw : ''));
  const L = Number(weighted(r, d.lanes) ?? 3), mid = L - 1;
  const spans = spansOf(d, r, L);
  const rows: PathNode[][] = [];
  const carries: Record<string, number[]> = {};
  const mk = (depth: number, i: number, col: number, lanes: number[], extra: Partial<PathNode> = {}): PathNode => {
    const n: PathNode = { id: nodeId(stage, depth, i), depth, col, kind: 'fight', links: [], setting, room: null, ...extra };
    carries[n.id] = lanes; return n;
  };
  const all = Array.from({ length: L }, (_, i) => i);
  for (let depth = 1; depth <= d.rows; depth++) {
    if (depth === d.gate_row) { rows.push([mk(depth, 0, mid, all, { kind: 'elite', gate: true, junction: true })]); continue; }
    if (depth === d.final_row) { rows.push([mk(depth, 0, mid, all, { junction: true })]); continue; }
    if (depth === d.boss_row) { rows.push([mk(depth, 0, mid, all, { kind: 'boss' })]); continue; }
    if (depth === d.shop_rest_row) {
      const s = next(r) < 0.5;
      rows.push([mk(depth, 0, mid - 1, all, { kind: s ? 'shop' : 'rest' }), mk(depth, 1, mid + 1, all, { kind: s ? 'rest' : 'shop' })]);
      continue;
    }
    const sp = spans.find((x) => depth > x.a && depth < x.b)!, si = spans.indexOf(sp);
    const row: PathNode[] = [];
    for (let lane = 0; lane < L; lane++) {
      const g = sp.groups.find((x) => x.lanes.includes(lane));
      if (g && g.row === depth) { if (g.lanes[0] === lane) row.push(mk(depth, row.length, g.lanes.reduce((t, x) => t + 2 * x, 0) / g.lanes.length, g.lanes, { junction: true })); continue; }
      const part = g && depth > g.row ? 1 : 0;
      row.push(mk(depth, row.length, 2 * lane, [lane], { lane, seg: 's' + si + '.' + part + '.' + lane }));
    }
    rows.push(row);
  }
  // links: a node leads to every node of the next row that carries one of its lanes (rules 1.48: a lane node to one)
  for (let i = 0; i < rows.length - 1; i++) for (const n of rows[i]) n.links = rows[i + 1].filter((x) => carries[x.id].some((l) => carries[n.id].includes(l))).map((x) => x.id);
  const m: PathMap = { seed, stage, lanes: L, rows, spur: [] };
  const key: Record<string, number> = {};
  for (const n of rows.flat()) key[n.id] = next(r);
  const par = parentsOf(m), byId = byIdOf(m);
  // junction kinds, then each segment's theme (siblings distinct) and what it holds; the rest of it by its fill
  for (const n of rows.flat()) if (n.junction && !n.gate) n.kind = (weighted(r, d.junction_kinds, (k) => allowed(d, m, n, k as NodeKind, par, byId)) || 'fight') as NodeKind;
  const segs = segmentsOf(m), sibs: Record<string, typeof segs> = {};
  for (const s of segs) (sibs[s.from ?? 'start'] ||= []).push(s);
  for (const group of Object.values(sibs)) {
    const left = Object.fromEntries(d.themes.map((t) => [t.id, t.weight]));
    for (const s of group) {
      const id = weighted(r, left) || d.themes[0].id, t = d.themes.find((x) => x.id === id)!;
      delete left[id];
      for (const n of s.nodes) n.theme = t.id;
      for (const k of t.holds) {
        const free = s.nodes.filter((n) => n.kind === 'fight' && movable(d, n) && allowed(d, m, n, k, par, byId));
        if (free.length) pick(r, free).kind = k;
      }
      for (const n of s.nodes) if (n.kind === 'fight' && movable(d, n) && t.fill) n.kind = (weighted(r, t.fill, (k) => allowed(d, m, n, k as NodeKind, par, byId)) || 'fight') as NodeKind;
    }
  }
  repair(d, m, stage, key);
  // the vault (rules 1.48): a spur of a guard and a chest off an edge lane node in the middle third
  const [v0, v1] = d.vault.depths;
  const cand = rows.flat().filter((n) => n.lane != null && !n.junction && n.depth >= v0 && n.depth <= v1 && n.links.length === 1 && (!d.vault.edge || n.lane === 0 || n.lane === L - 1));
  if (cand.length) {
    const at = pick(r, cand), side = at.lane === 0 ? -1 : 1, onward = at.links.slice();
    const chest: PathNode = { id: nodeId(stage, at.depth, 'vault'), depth: at.depth, col: at.col + 2 * side, kind: 'vault', links: onward, setting, room: null, spur: 'chest', from: at.id };
    const guard: PathNode = { id: nodeId(stage, at.depth, 'guard'), depth: at.depth, col: at.col + 2 * side, kind: 'vault_guard', links: [chest.id], setting, room: null, spur: 'guard', from: at.id };
    at.links = [...onward, guard.id];
    m.spur = [guard, chest];
  }
  return m;
}

/** Every node of a map, row by row, then the vault's spur. */
export const mapNodes = (m: PathMap): PathNode[] => [...m.rows.flat(), ...(m.spur || [])];

/** Every lane route from depth 1 to the Boss, as node lists (the vault's spur left out; tens at most). */
export const mapPaths = (m: PathMap): PathNode[][] => lanePaths(m);

/** What breaks a rule of 1.48 in this map, in words (empty: none). The generator's own check, and the test's. */
export function mapProblems(m: PathMap, stage: number = m.stage, d: MapData = MAP_DATA): string[] {
  const out: string[] = [];
  const byId = byIdOf(m), par = parentsOf(m);
  const [slo, shi] = d.junction.segment;
  if (m.rows.length !== d.rows) out.push('rows ' + m.rows.length);
  if (!(String(m.lanes) in d.lanes)) out.push(m.lanes + ' lanes');
  m.rows.forEach((row, i) => {
    const depth = i + 1, kinds = row.map((n) => n.kind);
    if (d.fight_rows.includes(depth) && kinds.some((k) => k !== 'fight')) out.push('depth ' + depth + ': not all fights');
    if (depth === d.gate_row && !(row.length === 1 && row[0].kind === 'elite' && row[0].gate)) out.push('the gate is ' + kinds.join(','));
    if (depth === d.boss_row && !(row.length === 1 && row[0].kind === 'boss')) out.push('the Boss row is ' + kinds.join(','));
    if (depth === d.final_row && !(row.length === 1 && row[0].junction)) out.push('the final junction is ' + row.length + ' nodes');
    if (depth === d.shop_rest_row && kinds.slice().sort().join() !== 'rest,shop') out.push('depth ' + depth + ': ' + kinds.join(','));
    for (const n of row) {
      if (depth !== d.boss_row && n.kind === 'boss') out.push(n.id + ': a Boss off its row');
      if (n.kind === 'vault' || n.kind === 'vault_guard') out.push(n.id + ': a vault on a lane');
      if (!n.gate && (d.from_depth[n.kind] ?? 0) > depth) out.push(n.id + ': ' + n.kind + ' before depth ' + d.from_depth[n.kind]);
      if ((d.not_rows[n.kind] || []).includes(depth)) out.push(n.id + ': ' + n.kind + ' in depth ' + depth);
      if (depth < d.rows && !n.links.length) out.push(n.id + ': no way out');
      if (depth > 1 && !(par[n.id] || []).length) out.push(n.id + ': no way in');
      const fwd = n.links.filter((l) => !byId[l]?.spur);
      for (const l of fwd) { const t = byId[l]; if (!t || t.depth !== depth + 1) out.push(n.id + ': a link to ' + l); }
      // a lane node has exactly one way forward (the vault's fork adds the spur); only meeting nodes have more
      if (n.lane != null && fwd.length !== 1) out.push(n.id + ': a lane node with ' + fwd.length + ' ways forward');
      if (n.lane != null && (par[n.id] || []).filter((p) => !byId[p].spur).length !== (depth === 1 ? 0 : 1)) out.push(n.id + ': a lane node with ' + (par[n.id] || []).length + ' ways in');
      if (n.kind !== 'fight') for (const l of n.links) if (byId[l]?.kind === n.kind && !byId[l]?.spur) out.push(n.id + ': ' + n.kind + ' links to ' + n.kind);
    }
    if (depth < d.rows) {
      const nextRow = m.rows[depth];
      const edges = row.flatMap((n, a) => n.links.filter((l) => !byId[l]?.spur).map((l) => [a, nextRow.findIndex((x) => x.id === l)] as [number, number]));
      const x = crossings(edges); if (x) out.push('depth ' + depth + ': ' + x + ' crossings');
      for (let a = 1; a < row.length; a++) if (row[a].col <= row[a - 1].col) out.push('depth ' + depth + ': nodes out of order');
    }
  });
  // segments: lengths in the band; siblings differ
  const segs = segmentsOf(m), sibs: Record<string, typeof segs> = {};
  for (const s of segs) {
    if (s.nodes.length < slo || s.nodes.length > shi) out.push('segment ' + s.id + ': ' + s.nodes.length + ' nodes');
    (sibs[s.from ?? 'start'] ||= []).push(s);
  }
  for (const [from, ss] of Object.entries(sibs)) {
    const sig = ss.map((s) => signature(s.nodes));
    if (new Set(sig).size !== sig.length) out.push('from ' + from + ': two lanes offer the same (' + sig.join(' | ') + ')');
  }
  // the vault: exactly one, its spur of two off an edge lane node of the middle third, back onto that lane
  const sp = m.spur || [];
  const guard = sp.find((n) => n.spur === 'guard'), chest = sp.find((n) => n.spur === 'chest');
  if (sp.length !== 2 || !guard || !chest || guard.kind !== 'vault_guard' || chest.kind !== 'vault') out.push('no vault (or not one)');
  else {
    const at = byId[guard.from!];
    if (!at || at.lane == null || at.junction) out.push('the vault leaves ' + guard.from + ', not a lane node');
    else {
      if (at.depth < d.vault.depths[0] || at.depth > d.vault.depths[1]) out.push('the vault at depth ' + at.depth);
      if (d.vault.edge && at.lane !== 0 && at.lane !== m.lanes - 1) out.push('the vault off lane ' + at.lane);
      if (!at.links.includes(guard.id) || guard.links.join() !== chest.id || chest.links.join() !== at.links.filter((l) => l !== guard.id).join()) out.push('the vault does not lead back onto its lane');
      if ((par[guard.id] || []).join() !== at.id) out.push('the vault is entered from elsewhere');
    }
  }
  if (out.length) return out;
  // the guarantees
  for (const k of d.every_route) for (const p of lanePaths(m)) if (!p.some((n) => n.kind === k && n.depth <= d.final_row)) { out.push('a route ' + p.map((n) => n.id).join('>') + ' passes no ' + k); break; }
  for (const cp of choicePoints(m)) if (shopAhead(m, cp) > d.shop_gap) out.push((cp ? cp.id : 'the start') + ': no shop within ' + d.shop_gap + ' nodes ahead');
  if (!referenceRoute(m, stage, d)) out.push('no route holds every guaranteed kind with its shops ' + d.shop_gap + ' nodes apart at most');
  return out;
}

/** A map as text, left to right (the start at the left, the Boss at the right; for hand-offs and `npm run try`): each
 * node a three-letter code (a junction in brackets), the lanes' links as `-`, `/` and `\`, the vault's spur under or
 * over its lane. */
export function renderPathMap(m: PathMap): string {
  const code: Record<string, string> = { fight: 'Fgt', elite: 'ELT', boss: 'BOSS', shop: 'SHP', forge: 'FRG', training: 'Trn', shrine: 'Shr', rest: 'RST', cache: 'Cch', event: 'Xrd', vault_guard: 'GRD', vault: 'VLT' };
  const nodes = mapNodes(m), cols = nodes.map((n) => n.col), c0 = Math.min(...cols), c1 = Math.max(...cols);
  const W = 7, H = c1 - c0 + 1, grid: string[][] = Array.from({ length: H }, () => Array(4 + W * m.rows.length + 4).fill(' '));
  const put = (y: number, x: number, s: string) => { for (let i = 0; i < s.length; i++) if (grid[y] && x + i < grid[y].length) grid[y][x + i] = s[i]; };
  const xOf = (n: PathNode) => 4 + W * (n.depth - 1) + (n.spur === 'chest' ? 4 : n.spur === 'guard' ? 0 : 0);
  const byId = byIdOf(m);
  for (const n of nodes) {
    const y = n.col - c0, w = n.gate ? 'GATE' : (n.junction ? '[' + code[n.kind] + ']' : code[n.kind]);
    for (const l of n.links) {
      const t = byId[l]; if (!t || t.spur) continue;
      const ty = t.col - c0, x = xOf(n) + 4;
      if (ty === y) put(y, x, '---');
      else { const s = ty > y ? 1 : -1; for (let k = 1; k < Math.abs(ty - y); k++) put(y + s * k, x + 1, s > 0 ? '\\' : '/'); }
    }
    put(y, xOf(n) + (n.spur === 'guard' ? 0 : 0), n.spur ? (n.spur === 'guard' ? 'GRD>' : 'VLT') : w);
  }
  put(Math.round((m.lanes - 1) - c0), 0, 'CMP');
  return grid.map((l) => l.join('').trimEnd()).join('\n');
}
