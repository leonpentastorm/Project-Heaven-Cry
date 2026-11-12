// Maps (spec: Maps, rules 1.16): the size limits, a map written as a picture (rows of characters), and where the two
// sides start. A layout is small, readable data: the campaign file (or data/maps.json for the shared open ground) holds
// the rows, and this file turns them into the solid, difficult, start and object lists every map already had.
// No imports from the rest of the engine: combat.ts builds its open ground from here.
import './datatext'; // fills the texts' {=placeholders} before any data is read
import mapsJ from '../../../data/maps.json';

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
