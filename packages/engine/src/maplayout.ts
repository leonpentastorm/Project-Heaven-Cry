// Maps (spec: Maps, rules 1.16): the size limits, a map written as a picture (rows of characters), and where the two
// sides start. A layout is small, readable data: the campaign file (or data/maps.json for the shared open ground) holds
// the rows, and this file turns them into the solid, difficult, start and object lists every map already had.
// It imports only data and the seeded stream (no fight code): combat.ts builds its open ground from here. The second
// half is the layout generator (rules 1.45): a fight's map drawn from a seed, and the checks it must pass.
import './datatext'; // fills the texts' {=placeholders} before any data is read
import mapsJ from '../../../data/maps.json';
import objectsJ from '../../../data/objects.json';
import { type Rng, next } from './rng';

/** max and min: a map's width and height, in tiles. deploy_min and deploy_max: tiles between the nearest of each side. */
export const MAP_LIMITS: { max: number; min: number; full_size: number; deploy_min: number; deploy_max: number } = (mapsJ as any).limits;
const DEFAULT_LEGEND: Record<string, any> = (mapsJ as any).legend;
/** The layouts every campaign may name ("layout": "open_ground"). */
export const MAP_LAYOUTS: Record<string, { name: string; w: number; h: number; rows: string[]; legend?: Record<string, any>; notes?: { at: string; text: string }[] }> = (mapsJ as any).layouts;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ref = (x: number, y: number) => LETTERS[x] + (y + 1);

/** In plain words, what is wrong with a map's size (null when it is fine). Over the maximum or under the minimum is an
 * error, never a silent clamp. */
export function sizeProblem(w: unknown, h: unknown): string | null {
  const { min, max } = MAP_LIMITS, ok = (n: unknown) => Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
  return ok(w) && ok(h) ? null : 'a map is ' + min + ' to ' + max + ' tiles wide and ' + min + ' to ' + max + ' tall (this one is ' + w + ' × ' + h + ').';
}

export interface LayoutParts { solid: string[]; difficult: string[]; start: string[]; enemyStart: string[]; objects: any[]; errors: string[] }
/** Rows of characters to a map's lists, as grid references. `.` open, `#` solid, `~` difficult, `S` a squad start,
 * `E` an enemy start; any other character is an object from the legend ({ kind, name?, text?, … }). Start tiles come
 * out nearest the middle of their group first, so one fighter alone stands in the middle of the line. */
export function readLayout(rows: unknown, w: number, h: number, legend: Record<string, any> = {}): LayoutParts {
  const out: LayoutParts = { solid: [], difficult: [], start: [], enemyStart: [], objects: [], errors: [] };
  if (!Array.isArray(rows) || !rows.every((r) => typeof r === 'string')) { out.errors.push('the layout must be a list of rows of characters.'); return out; }
  if (rows.length !== h) out.errors.push('the layout has ' + rows.length + ' rows but the map is ' + h + ' tall.');
  const L = { ...DEFAULT_LEGEND, ...legend }, S: [number, number][] = [], E: [number, number][] = [], unknown = new Set<string>();
  rows.forEach((row: string, y) => {
    if (row.length !== w) out.errors.push('layout row ' + (y + 1) + ' has ' + row.length + ' characters but the map is ' + w + ' wide.');
    if (y >= h) return;
    for (let x = 0; x < Math.min(w, row.length); x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      if (ch === '#') out.solid.push(ref(x, y));
      else if (ch === '~') out.difficult.push(ref(x, y));
      else if (ch === 'S') S.push([x, y]);
      else if (ch === 'E') E.push([x, y]);
      else if (L[ch] && typeof L[ch] === 'object' && typeof L[ch].kind === 'string') out.objects.push({ ...JSON.parse(JSON.stringify(L[ch])), at: ref(x, y) });
      else unknown.add(ch);
    }
  });
  for (const ch of unknown) out.errors.push('the layout uses "' + ch + '" but the legend does not say what it is.');
  const centreFirst = (ts: [number, number][]) => { if (!ts.length) return [];
    const cx = ts.reduce((s, t) => s + t[0], 0) / ts.length, cy = ts.reduce((s, t) => s + t[1], 0) / ts.length;
    return ts.map((t, i) => ({ t, i, d: (t[0] - cx) ** 2 + (t[1] - cy) ** 2 })).sort((a, b) => a.d - b.d || a.i - b.i).map((o) => ref(o.t[0], o.t[1])); };
  out.start = centreFirst(S); out.enemyStart = centreFirst(E);
  return out;
}

/** A campaign zone with its layout turned into the plain lists (solid, difficult, start, enemyStart, objects), added to
 * whatever the zone lists by hand; the layout and legend fields are gone from the result. A zone without a layout
 * comes back as it is. Problems with the picture are in `errors`. */
export function expandZone<Z extends Record<string, any>>(z: Z): { zone: Z; errors: string[] } {
  if (!z || z.layout == null) return { zone: z, errors: [] };
  const named = typeof z.layout === 'string' ? MAP_LAYOUTS[z.layout] : null;
  if (typeof z.layout === 'string' && !named) { const { layout, legend, ...rest } = z; return { zone: rest as any, errors: ['unknown layout "' + z.layout + '" (the layouts are: ' + Object.keys(MAP_LAYOUTS).join(', ') + ').'] }; }
  const rows = named ? named.rows : z.layout, legend = { ...(named?.legend || {}), ...(z.legend || {}) };
  const p = readLayout(rows, z.w, z.h, legend);
  const { layout, legend: _l, ...rest } = z, both = (a: string[] | undefined, b: string[]) => [...(a || []), ...b];
  const zone: any = { ...rest, solid: both(z.solid, p.solid), difficult: both(z.difficult, p.difficult), start: both(z.start, p.start), objects: [...p.objects, ...(z.objects || [])] };
  const es = both(z.enemyStart, p.enemyStart); if (es.length) zone.enemyStart = es;
  if (!zone.solid.length) delete zone.solid; if (!zone.difficult.length) delete zone.difficult;
  if (!zone.notes && named?.notes) zone.notes = JSON.parse(JSON.stringify(named.notes));
  return { zone, errors: p.errors };
}
/** A campaign with every zone's layout expanded (a copy when anything changed; the same object when nothing had one). */
export function expandCampaign<C extends { zones?: any[] }>(c: C): C {
  if (!c || !Array.isArray(c.zones) || !c.zones.some((z) => z && z.layout != null)) return c;
  return { ...c, zones: c.zones.map((z) => expandZone(z).zone) };
}

const cheb = (a: string, b: string) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };
/** Tiles between the nearest squad start and the nearest enemy start (tile keys "x,y"). */
export const startGap = (a: string[], b: string[]): number => { let g = Infinity; for (const p of a) for (const q of b) g = Math.min(g, cheb(p, q)); return g; };
/**
 * Where the enemy starts when a map does not say (spec: Maps, deployment): the squad's start tiles mirrored to the
 * other side of the map; brought nearer, column by column, until the nearest of each side are at most `deploy_max`
 * tiles apart; and any tile something stands on moved to the nearest free one. On a map too narrow for `deploy_min`
 * the sides are as far apart as it allows. `blocked`: solid ground and objects in the way (tile keys).
 */
export function deployEnemy(w: number, h: number, start: string[], blocked: Set<string>): string[] {
  if (!start.length) return [];
  const xs = start.map((k) => Number(k.split(',')[0])), mid = (w - 1) / 2, mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  let tiles = start.map((k) => { const [x, y] = k.split(',').map(Number); return [w - 1 - x, y] as [number, number]; });
  const dir = mean <= mid ? -1 : 1; // the way back toward the squad
  const gap = () => startGap(start, tiles.map((t) => t.join(',')));
  for (let n = 0; n < w && gap() > MAP_LIMITS.deploy_max; n++) tiles = tiles.map(([x, y]) => [x + dir, y]);
  // A squad that starts near the middle has no far side: the enemy goes as far the other way as the map allows.
  for (let n = 0; n < w && gap() < MAP_LIMITS.deploy_min && tiles.every(([x]) => x - dir >= 0 && x - dir < w); n++) tiles = tiles.map(([x, y]) => [x - dir, y]);
  const taken = new Set<string>([...blocked, ...start]), out: string[] = [];
  for (const [x0, y0] of tiles) {
    let at: string | null = null;
    for (let r = 0; r < Math.max(w, h) && !at; r++) for (let dy = -r; dy <= r && !at; dy++) for (let dx = -r; dx <= r && !at; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = x0 + dx, y = y0 + dy, k = x + ',' + y;
      if (x >= 0 && y >= 0 && x < w && y < h && !taken.has(k)) at = k;
    }
    if (at) { taken.add(at); out.push(at); }
  }
  return out;
}
/** The free tile nearest `from` (rings outward; `free` decides), or null: where someone goes when the start tiles run out. */
export function nearestFree(w: number, h: number, from: string, free: (k: string) => boolean): string | null {
  const [x0, y0] = from.split(',').map(Number);
  for (let r = 0; r < Math.max(w, h); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = x0 + dx, y = y0 + dy, k = x + ',' + y;
    if (x >= 0 && y >= 0 && x < w && y < h && free(k)) return k;
  }
  return null;
}

// ---------- the layout generator (rules 1.45; survival-spec rule 22, section 4.3; Survival build step 7) ----------
// A fight's map drawn from a seed: stamps (small pictures in the legend) placed and turned by the stream, loose cover
// until the middle is covered, barrels, props, difficult patches, a hazard where the recipe allows one, and dressing for
// the renderer. Every number comes from the recipe (data/survival.json `layout` and each setting's own block); the
// checks are `layoutProblems`, which the seeded test runs over every template, setting and size. General: the
// roguelike's rooms can take the same recipe with their own stamps.

/** A stamp: a small picture in the maps legend (3 to 7 tiles a side). `.` keeps a tile clear, a space leaves it as it
 * is, `#` is a wall, `~` difficult ground, any other character an object from the legend. */
export interface LayoutStamp { id: string; name?: string; rows: string[] }
/** Everything the generator needs: the map's size and where each side starts, the stamps it may use, the cover kinds,
 * the numbers (all from data), a hazard (null: the template or the setting has none), props by object kind. */
export interface LayoutRecipe {
  size: number; squadCols: number[]; zoneCols: number; foeZone: number; tries: number;
  stamps: LayoutStamp[]; stampCount: [number, number]; stampGap: number; legend: Record<string, any>;
  cover: { half: string[]; full: string[] }; fullEvery: number; coverRun: [number, number]; coverShare: [number, number]; coverReach: number; startCoverReach: number;
  barrels: [number, number]; props: Record<string, [number, number]>; difficult: { patches: [number, number]; size: [number, number] };
  hazard: { kind: string; size: [number, number] } | null; dressing: [number, number]; dressPieces: number; grounds: number;
}
/** What the renderer reads beside the rules (survival-spec 4.2 item 6): the setting's kit, which ground texture and its
 * quarter turns, and the dressing (a piece and a turn on a free tile). Presentation only: no rule reads it. */
export interface MapSkin { setting: string; ground: number; rotate: number; dressing: { at: string; piece: number; rotate: number }[] }
/** A generated layout: rows of the legend (no start tiles: the encounter places them), the legend, the skin, the
 * stamps it holds (their ids) and the try that passed. */
export interface GeneratedLayout { rows: string[]; legend: Record<string, any>; skin: MapSkin; stamps: string[]; tries: number }

const OBJ_KINDS: Record<string, any> = Object.fromEntries(((objectsJ as any).items as any[]).map((o) => [o.id, o]));
const pickOf = <T>(r: Rng, list: T[]): T => list[Math.floor(next(r) * list.length)];
const between = (r: Rng, [lo, hi]: [number, number]) => lo + Math.floor(next(r) * (hi - lo + 1));
const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** A stamp turned a quarter `turns` times clockwise, then mirrored left to right when `flip`. */
export function turnStamp(rows: string[], turns: number, flip: boolean): string[] {
  let g = rows.map((r) => r.split(''));
  for (let t = 0; t < ((turns % 4) + 4) % 4; t++) { const h = g.length, w = g[0].length, src = g; g = Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => src[h - 1 - x][y])); }
  if (flip) g = g.map((r) => [...r].reverse());
  return g.map((r) => r.join(''));
}
/** The squad's start tiles on a map (the columns given, nearest the middle row first, then the nearer column; at most
 * six), among the tiles `free` allows. The encounter and the generator read the same list. */
export function squadStartTiles(w: number, h: number, cols: number[], free: (k: string) => boolean): string[] {
  const mid = (h - 1) / 2, cand: string[] = [];
  for (const x of cols) for (let y = 0; y < h; y++) if (free(x + ',' + y)) cand.push(x + ',' + y);
  return cand.sort((a, b) => Math.abs(Number(a.split(',')[1]) - mid) - Math.abs(Number(b.split(',')[1]) - mid) || Number(a.split(',')[0]) - Number(b.split(',')[0])).slice(0, 6);
}
/** The two sides' start zones on a recipe's map: the squad's start tiles, the enemy line the deployment rule gives
 * (`deployEnemy`), and the columns kept for the enemy (`foeLo` to `foeHi`). */
export function zonesOf(rc: Pick<LayoutRecipe, 'size' | 'squadCols' | 'foeZone'>) {
  const S = rc.size, squad = squadStartTiles(S, S, rc.squadCols, () => true), line = deployEnemy(S, S, squad, new Set());
  const xs = line.map((k) => Number(k.split(',')[0])), lineLo = Math.min(...xs), lineHi = Math.max(...xs);
  return { squad, line, lineLo, lineHi, foeLo: Math.max(0, lineLo - rc.foeZone), foeHi: Math.min(S - 1, lineHi + rc.foeZone) };
}
/** The legend's character for an object kind (the default legend first, then the recipe's); a door's is the closed one. */
function legendChar(L: Record<string, any>, kind: string): string {
  const hit = Object.entries(L).find(([, v]) => v && typeof v === 'object' && v.kind === kind && !v.open);
  if (!hit) throw new Error('the maps legend has no character for "' + kind + '"');
  return hit[0];
}
/** The tiles reachable from `from` by plain steps (4 neighbours) over the tiles `open` allows. */
function reachFrom(S: number, open: (i: number) => boolean, from: number): Uint8Array {
  const seen = new Uint8Array(S * S); if (!open(from)) return seen;
  const q = [from]; seen[from] = 1;
  while (q.length) { const i = q.pop()!, x = i % S, y = (i / S) | 0;
    for (const [dx, dy] of STEPS) { const nx = x + dx, ny = y + dy, j = ny * S + nx;
      if (nx >= 0 && ny >= 0 && nx < S && ny < S && !seen[j] && open(j)) { seen[j] = 1; q.push(j); } } }
  return seen;
}
/** The shortest way by plain steps from any of `from` to any of `to` (tile indexes), or null. */
function shortestPath(S: number, open: (i: number) => boolean, from: number[], to: Set<number>): number[] | null {
  const prev = new Int32Array(S * S).fill(-2), q: number[] = [];
  for (const f of from) if (open(f) && prev[f] === -2) { prev[f] = -1; q.push(f); }
  for (let h = 0; h < q.length; h++) { const i = q[h];
    if (to.has(i)) { const p: number[] = []; for (let j = i; j !== -1; j = prev[j]) p.push(j); return p.reverse(); }
    const x = i % S, y = (i / S) | 0;
    for (const [dx, dy] of STEPS) { const nx = x + dx, ny = y + dy, j = ny * S + nx;
      if (nx >= 0 && ny >= 0 && nx < S && ny < S && prev[j] === -2 && open(j)) { prev[j] = i; q.push(j); } } }
  return null;
}

/** Generate a fight's layout (rules 1.45): up to `tries` tries, one stamp fewer after each failed one (survival-spec
 * 4.3: "a failure drops the last stamp"); null when none passes `layoutProblems` (the caller falls back to the open
 * ground, cropped). */
export function generateLayout(rc: LayoutRecipe, rng: Rng, setting: string): GeneratedLayout | null {
  let want = between(rng, rc.stampCount);
  for (let t = 1; t <= rc.tries; t++) {
    const out = layoutTry(rc, rng, setting, want);
    if (!layoutProblems(out.rows, rc).length) return { ...out, tries: t };
    want = Math.max(0, want - 1);
  }
  return null;
}

function layoutTry(rc: LayoutRecipe, rng: Rng, setting: string, nStamps: number) {
  const S = rc.size, N = S * S, L = { ...DEFAULT_LEGEND, ...rc.legend };
  const ch: string[] = new Array(N).fill('.'), keep = new Uint8Array(N), stampAt = new Uint8Array(N), covered = new Uint8Array(N), loose: number[] = [];
  const X = (i: number) => i % S, Y = (i: number) => (i / S) | 0, I = (x: number, y: number) => y * S + x;
  const kindAt = (i: number): string | null => { const v = L[ch[i]]; return v && typeof v === 'object' ? v.kind : null; };
  const blocks = (i: number) => ch[i] === '#' || (!!kindAt(i) && !!OBJ_KINDS[kindAt(i)!]?.blocks_move && !L[ch[i]].open);
  const isCover = (i: number) => !!kindAt(i) && !!OBJ_KINDS[kindAt(i)!]?.cover;
  const z = zonesOf(rc), inZone = (x: number) => x < rc.zoneCols || (x >= z.foeLo && x <= z.foeHi);
  const startCol = (x: number) => rc.squadCols.includes(x) || (x >= z.lineLo && x <= z.lineHi);
  const box = (i: number, r: number, test: (j: number) => boolean) => { const out: number[] = [];
    for (let y = Math.max(0, Y(i) - r); y <= Math.min(S - 1, Y(i) + r); y++) for (let x = Math.max(0, X(i) - r); x <= Math.min(S - 1, X(i) + r); x++) if (test(I(x, y))) out.push(I(x, y));
    return out; };
  // (3) stamps: turned and mirrored by the stream, their tiles outside both zones, apart from each other; a ring of one
  // tile around each is kept clear of loose blockers (so its doorways stay open)
  const placed: string[] = [];
  for (let s = 0; s < nStamps && rc.stamps.length; s++) {
    const st = pickOf(rng, rc.stamps), rows = turnStamp(st.rows, Math.floor(next(rng) * 4), next(rng) < 0.5), h = rows.length, w = rows[0].length;
    for (let at = 0; at < 16; at++) {
      const x0 = 1 + Math.floor(next(rng) * Math.max(1, S - w - 1)), y0 = 1 + Math.floor(next(rng) * Math.max(1, S - h - 1));
      if (x0 + w > S - 1 || y0 + h > S - 1) continue;
      let ok = true;
      for (let y = y0 - rc.stampGap; y < y0 + h + rc.stampGap && ok; y++) for (let x = x0 - rc.stampGap; x < x0 + w + rc.stampGap && ok; x++) {
        if (x < 0 || y < 0 || x >= S || y >= S) continue;
        if (stampAt[I(x, y)] || (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h && inZone(x))) ok = false;
      }
      if (!ok) continue;
      for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) if (x >= 0 && y >= 0 && x < S && y < S) { keep[I(x, y)] = 1; stampAt[I(x, y)] = 1; }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = rows[y][x]; if (c !== ' ') ch[I(x0 + x, y0 + y)] = c; }
      placed.push(st.id); break;
    }
  }
  for (let i = 0; i < N; i++) if (isCover(i)) for (const j of box(i, rc.coverReach, () => true)) covered[j] = 1;
  // (4) loose cover: near each start first, then until every tile outside the zones is within reach of cover, then up to
  // the share; one in `fullEvery` full cover
  const free = (i: number) => ch[i] === '.' && !keep[i] && !startCol(X(i));
  let n = 0;
  // half cover goes down in short straight runs (`coverRun` tiles, one kind), so it reads as a line someone built
  const putCover = (i: number) => {
    const full = n++ % rc.fullEvery === rc.fullEvery - 1, c = legendChar(L, pickOf(rng, full ? rc.cover.full : rc.cover.half));
    const len = full ? 1 : between(rng, rc.coverRun), [dx, dy] = STEPS[Math.floor(next(rng) * 4)];
    for (let s = 0, x = X(i), y = Y(i); s < len; s++, x += dx, y += dy) {
      if (x < 0 || y < 0 || x >= S || y >= S || (s > 0 && !free(I(x, y)))) break;
      const j = I(x, y); ch[j] = c; loose.push(j); for (const k of box(j, rc.coverReach, () => true)) covered[k] = 1;
    }
  };
  for (const k of [...z.squad, ...z.line]) {
    const [x, y] = k.split(',').map(Number), i = I(x, y);
    if (box(i, rc.startCoverReach, isCover).length) continue;
    const c = box(i, rc.startCoverReach, free); if (c.length) putCover(pickOf(rng, c));
  }
  for (let pass = 0; pass < N; pass++) {
    const bare: number[] = []; for (let i = 0; i < N; i++) if (!covered[i] && !inZone(X(i)) && ch[i] !== '#') bare.push(i);
    if (!bare.length) break;
    const b = pickOf(rng, bare), c = box(b, 1, free); if (c.length) putCover(pickOf(rng, c)); else covered[b] = 1;
  }
  { const pool: number[] = []; for (let i = 0; i < N; i++) if (free(i)) pool.push(i);
    const count = () => { let c = 0; for (let i = 0; i < N; i++) if (isCover(i)) c++; return c; }, need = Math.ceil(rc.coverShare[0] * N);
    for (let have = count(); have < need && pool.length; ) { const i = pool.splice(Math.floor(next(rng) * pool.length), 1)[0]; if (free(i)) { putCover(i); have = count(); } } }
  // (5) barrels beside cover; props by kind; difficult patches; a hazard, never in or beside a zone
  for (let b = between(rng, rc.barrels); b > 0; b--) {
    const c: number[] = []; for (let i = 0; i < N; i++) if (free(i) && !inZone(X(i)) && box(i, 1, isCover).length) c.push(i);
    if (c.length) { const i = pickOf(rng, c); ch[i] = legendChar(L, 'barrel'); loose.push(i); }
  }
  for (const [kind, range] of Object.entries(rc.props)) for (let p = between(rng, range); p > 0; p--) {
    const c: number[] = []; for (let i = 0; i < N; i++) if (free(i) && !inZone(X(i))) c.push(i);
    if (c.length) { const i = pickOf(rng, c); ch[i] = legendChar(L, kind); if (OBJ_KINDS[kind]?.blocks_move) loose.push(i); }
  }
  const blob = (size: number, put: (i: number) => void, ok: (i: number) => boolean) => {
    const c: number[] = []; for (let i = 0; i < N; i++) if (ok(i)) c.push(i);
    if (!c.length) return; let at = pickOf(rng, c); put(at);
    for (let s = 1; s < size; s++) { const nb = box(at, 1, ok); if (!nb.length) return; at = pickOf(rng, nb); put(at); }
  };
  for (let p = between(rng, rc.difficult.patches); p > 0; p--) blob(between(rng, rc.difficult.size), (i) => { ch[i] = '~'; }, (i) => ch[i] === '.' && !keep[i] && !inZone(X(i)));
  if (rc.hazard) { const hz = legendChar(L, rc.hazard.kind); blob(between(rng, rc.hazard.size), (i) => { ch[i] = hz; }, (i) => ch[i] === '.' && !keep[i] && !inZone(X(i)) && !inZone(X(i) - 1) && !inZone(X(i) + 1)); }
  // a loose blocker that walls a pocket off is taken away again (the stamps stay; a stamp that seals fails the checks)
  for (let fix = 0; fix < 8; fix++) {
    const seen = reachFrom(S, (i) => !blocks(i), I(rc.squadCols[0], (S / 2) | 0));
    const cut = loose.filter((i) => blocks(i) && box(i, 1, (j) => !blocks(j) && !seen[j]).length);
    if (!cut.length) break;
    for (const i of cut) ch[i] = '.';
  }
  // (6) the skin: a ground of the setting's and its turn, and dressing on free tiles (a piece and a turn each)
  const dressing: MapSkin['dressing'] = [], pool: number[] = []; for (let i = 0; i < N; i++) if (ch[i] === '.') pool.push(i);
  for (let d = between(rng, rc.dressing); d > 0 && pool.length; d--) { const i = pool.splice(Math.floor(next(rng) * pool.length), 1)[0]; dressing.push({ at: X(i) + ',' + Y(i), piece: 1 + Math.floor(next(rng) * rc.dressPieces), rotate: Math.floor(next(rng) * 4) }); }
  const rows = Array.from({ length: S }, (_, y) => ch.slice(y * S, y * S + S).join(''));
  return { rows, legend: rc.legend, stamps: placed, skin: { setting, ground: 1 + Math.floor(next(rng) * rc.grounds), rotate: Math.floor(next(rng) * 4), dressing } };
}

/** Every rule a generated layout keeps (rules 1.45), as problems in words (empty: it passes): every walkable tile
 * reachable (no sealed room), two lanes between the sides, the start gap inside the deployment band, cover within reach
 * of every start of both zones, no blocker or hazard on a start (the zones', and the map's own start tiles when given
 * as `starts`), every doorway clear (open on both sides), the cover share. */
export function layoutProblems(rows: string[], rc: LayoutRecipe, starts?: { squad: string[]; foes: string[] }): string[] {
  const S = rc.size, N = S * S, L = { ...DEFAULT_LEGEND, ...rc.legend }, out: string[] = [];
  const p = readLayout(rows, S, S, rc.legend); if (p.errors.length) return p.errors;
  const ch = rows.join('').split('');
  const obj = (i: number) => { const v = L[ch[i]]; return v && typeof v === 'object' ? v : null; };
  const solid = (i: number) => ch[i] === '#';
  const blocks = (i: number) => solid(i) || (!!obj(i) && !!OBJ_KINDS[obj(i).kind]?.blocks_move && !obj(i).open);
  const danger = (i: number) => !!obj(i) && (!!OBJ_KINDS[obj(i).kind]?.hazard || !!OBJ_KINDS[obj(i).kind]?.trap || obj(i).kind === 'hole');
  const cover = (i: number) => !!obj(i) && !!OBJ_KINDS[obj(i).kind]?.cover;
  const I = (k: string) => { const [x, y] = k.split(',').map(Number); return y * S + x; };
  const z = zonesOf(rc);
  for (const k of [...z.squad, ...z.line, ...(starts ? [...starts.squad, ...starts.foes] : [])]) if (blocks(I(k)) || danger(I(k))) out.push('a start tile (' + k + ') holds a blocker or a hazard.');
  const gap = startGap(z.squad, z.line); if (gap < MAP_LIMITS.deploy_min || gap > MAP_LIMITS.deploy_max) out.push('the start gap is ' + gap + ' (the band is ' + MAP_LIMITS.deploy_min + ' to ' + MAP_LIMITS.deploy_max + ').');
  const seen = reachFrom(S, (i) => !blocks(i), I(z.squad[0]));
  let sealed = 0; for (let i = 0; i < N; i++) if (!blocks(i) && !seen[i]) sealed++;
  if (sealed) out.push(sealed + ' walkable tiles can\'t be reached (a sealed room or pocket).');
  // two lanes: the shortest way from the squad to the enemy line; with its tiles between the zones blocked, another remains
  const from = z.squad.map(I), to = new Set(z.line.map(I)), path = shortestPath(S, (i) => !blocks(i), from, to);
  if (!path) out.push('no way from the squad to the enemy.');
  else { const cut = new Set(path.filter((i) => { const x = i % S; return x >= rc.zoneCols && x < z.foeLo; }));
    if (cut.size && !shortestPath(S, (i) => !blocks(i) && !cut.has(i), from, to)) out.push('only one lane between the sides.'); }
  const near = (i: number, r: number) => { const x0 = i % S, y0 = (i / S) | 0;
    for (let y = Math.max(0, y0 - r); y <= Math.min(S - 1, y0 + r); y++) for (let x = Math.max(0, x0 - r); x <= Math.min(S - 1, x0 + r); x++) if (cover(y * S + x)) return true;
    return false; };
  for (const k of [...z.squad, ...z.line]) if (!near(I(k), rc.startCoverReach)) out.push('no cover within ' + rc.startCoverReach + ' tiles of the start ' + k + '.');
  for (let i = 0; i < N; i++) {
    if (blocks(i)) continue;
    const x = i % S, y = (i / S) | 0, at = (dx: number, dy: number) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < S && ny < S ? ny * S + nx : -1; };
    const wall = (dx: number, dy: number) => at(dx, dy) >= 0 && solid(at(dx, dy)), open = (dx: number, dy: number) => at(dx, dy) < 0 || !blocks(at(dx, dy));
    if ((wall(-1, 0) && wall(1, 0) && !(open(0, -1) && open(0, 1))) || (wall(0, -1) && wall(0, 1) && !(open(-1, 0) && open(1, 0)))) out.push('the doorway at ' + x + ',' + y + ' is not clear.');
  }
  let nc = 0; for (let i = 0; i < N; i++) if (cover(i)) nc++;
  if (nc < rc.coverShare[0] * N || nc > rc.coverShare[1] * N) out.push('cover is ' + Math.round(100 * nc / N) + '% of the tiles (the band is ' + Math.round(100 * rc.coverShare[0]) + ' to ' + Math.round(100 * rc.coverShare[1]) + '%).');
  return out;
}
