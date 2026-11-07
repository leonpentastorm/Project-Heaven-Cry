// The title art's geometry (art/ui/title-screen/technical-review.json; docs/design/title-screen.md §5, §8).
// Kept apart from Title.tsx so it can be tested without a browser.
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** The painted canvas, its central safe rect (what a 16:9 window shows), the phone crop's centre and the most any
 *  layer may slide (canvas px) before an edge would show. */
export const CANVAS = [4096, 2304] as const, SAFE = [256, 144, 3840, 2160] as const, PHONE_CX = (2218 + 3352) / 2, MAX_SHIFT = [246, 69] as const;
/** Layers back to front, with how far each follows the pointer (fraction of the window width; vertical is half). */
export const LAYERS = [['back', 0.008], ['mid', 0.025], ['front', 0.05], ['fx', 0.05]] as const;
export type Geo = { s: number; left: number; top: number; w: number; h: number; cx: number; cy: number; vw: number; vh: number };
/** Cover the window with the safe rect; a narrower window keeps the right of the picture (the Celestial and the
 *  squad), moving toward the phone crop's centre, and never leaves the safe rect. */
export function titleGeometry(vw: number, vh: number): Geo {
  const sw = SAFE[2] - SAFE[0], sh = SAFE[3] - SAFE[1], s = Math.max(vw / sw, vh / sh);
  const visW = vw / s, visH = vh / s;
  const cx = clamp(PHONE_CX, SAFE[0] + visW / 2, SAFE[2] - visW / 2), cy = clamp(CANVAS[1] / 2, SAFE[1] + visH / 2, SAFE[3] - visH / 2);
  return { s, cx, cy, vw, vh, left: vw / 2 - cx * s, top: vh / 2 - cy * s, w: CANVAS[0] * s, h: CANVAS[1] * s };
}
/** The most a layer slides, px: the spec's share of the window, never past what the art's overscan covers. */
export const layerShift = (g: Geo, depth: number) => [Math.min(depth * g.vw, MAX_SHIFT[0] * g.s), Math.min(depth * g.vh * 0.5, MAX_SHIFT[1] * g.s)] as const;
