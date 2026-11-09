// The torn edges of a spotlight strip (docs/design/cutin-spec.md 3.5): seeded jagged polygons, so the same moment tears
// the same way on every screen and on a replay. Pure (tests): no DOM, no Math.random.

/** A 32-bit hash of a string (FNV-1a). */
export function hashSeed(s: string | number): number {
  const t = String(s); let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** mulberry32: a small seeded generator, 0 ≤ r() < 1. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export type Pt = [number, number];
/** A torn horizontal edge from x0 to x1 at y: about one point every `step` px, each `dir` × (3–12 px) into the strip,
 *  one in seven a deep notch (16–22 px). dir +1 tears downward (the top edge), −1 upward (the bottom edge). */
export function tornEdge(r: () => number, x0: number, x1: number, y: number, dir: 1 | -1, step = 28): Pt[] {
  const out: Pt[] = [], n = Math.max(2, Math.round((x1 - x0) / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n + (i > 0 && i < n ? (r() - 0.5) * step * 0.6 : 0);
    const deep = r() < 1 / 7, d = deep ? 16 + r() * 6 : 3 + r() * 9;
    out.push([round(x), round(y + dir * d)]);
  }
  return out;
}
/** The same edge pushed outward 6–9 px (the ink lip shows along the rip), each point with its own jitter. */
export function lipOf(r: () => number, edge: Pt[], dir: 1 | -1): Pt[] {
  return edge.map(([x, y]) => [x, round(y - dir * (6 + r() * 3))] as Pt);
}
/** A torn vertical edge (the eye window's inner side) at x, from y0 to y1, jittered ±(3–11) px about every 16 px. */
export function tornColumn(r: () => number, x: number, y0: number, y1: number, step = 16): Pt[] {
  const out: Pt[] = [], n = Math.max(2, Math.round((y1 - y0) / step));
  for (let i = 0; i <= n; i++) out.push([round(x + (r() - 0.5) * 2 * (3 + r() * 8)), round(y0 + ((y1 - y0) * i) / n)]);
  return out;
}
const round = (v: number) => Math.round(v * 10) / 10;
export const pointsAttr = (pts: Pt[]) => pts.map(([x, y]) => x + ',' + y).join(' ');

/** Every polygon of one strip, w × h px, torn from `seed`: the ink lip, the body, the eye window (left or right). */
export interface StripShape { lip: string; body: string; window: string; windowLeft: boolean; edgeX: number; top: Pt[] }
export function stripShape(seed: string | number, w: number, h: number, o: { windowFrac?: number; windowLeft?: boolean; inset?: number } = {}): StripShape {
  const r = mulberry32(hashSeed(seed));
  const left = o.windowLeft ?? r() < 0.5, frac = o.windowFrac ?? 0.62, inset = o.inset ?? 10;
  const top = tornEdge(r, -20, w + 20, inset, 1), bot = tornEdge(r, w + 20, -20, h - inset, -1);
  const lipTop = lipOf(r, top, 1), lipBot = lipOf(r, bot, -1);
  const edgeX = left ? w * frac : w * (1 - frac);
  const col = tornColumn(r, edgeX, 0, h);
  const win: Pt[] = left ? [[-20, 0], ...col, [-20, h]] : [[w + 20, 0], ...col, [w + 20, h]];
  return { lip: pointsAttr([...lipTop, ...lipBot]), body: pointsAttr([...top, ...bot]), window: pointsAttr(win), windowLeft: left, edgeX, top };
}
/** How far down the torn top edge reaches between x0 and x1 (its lowest point there, the edge read between its points). */
export function topDepth(top: Pt[], x0: number, x1: number): number {
  let d = 0;
  for (let i = 0; i < top.length; i++) {
    const [x, y] = top[i];
    if (x >= x0 && x <= x1) d = Math.max(d, y);
    const nx = top[i + 1];
    if (nx) for (const e of [x0, x1]) if ((x - e) * (nx[0] - e) < 0) d = Math.max(d, y + ((nx[1] - y) * (e - x)) / (nx[0] - x));
  }
  return d;
}
/** A whole avatar (a small square face drawn whole, its top at the picture's top: Wick's placeholder robot) in a strip
 *  h px tall whose torn top edge reaches `depth` px down over the window: its size (about 1.15 × h) and its top, so the
 *  whole head sits below the tear (the eyes as near the middle line as that allows). eyeY: the eyes' height in it, 0–1. */
export function wholeFit(h: number, eyeY: number, depth: number): { side: number; y: number } {
  const side = Math.round(h * 1.15), clear = Math.ceil(depth) + 3;
  return { side, y: Math.max(clear, Math.min(h * 0.12, h / 2 - eyeY * side)) };
}
