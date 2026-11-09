// The cut-in's geometry (docs/design/cutin-spec.md 3.1–3.2, 9.1): where the strips go, how a portrait is cropped to its
// eyes, and a strip as plain SVG markup for the non-React overlays. Pure (tests).
import { stripShape } from './tear';
import type { CutInStrip } from './spec';

/** A strip's size and place: one wide strip, or a stack of 2–4. Pure (tests). */
export function stackLayout(n: number, vw: number, vh: number, god: boolean[] = []): { h: number; top: number; tilt: number; dx: number; fromLeft: boolean; windowLeft: boolean }[] {
  if (n <= 1) { const h = Math.max(150, Math.min(280, vh * 0.26)); return [{ h, top: vh * 0.46 - h / 2, tilt: -4, dx: 0, fromLeft: true, windowLeft: true }]; }
  const gap = vh * 0.012, base = Math.max(90, Math.min(200, (vh * 0.64 - gap * (n - 1)) / n));
  const hs = Array.from({ length: n }, (_, i) => (god[i] ? Math.min(base * 1.3, 240) : base));
  const total = hs.reduce((a, b) => a + b, 0) + gap * (n - 1);
  let y = Math.max(vh * 0.06, vh * 0.44 - total / 2);
  const tilts = [-3, 2, -2, 3];
  return hs.map((h, i) => { const r = { h, top: y, tilt: tilts[i % 4], dx: (i % 2 ? -1 : 1) * vw * 0.03, fromLeft: i % 2 === 0, windowLeft: i % 2 === 0 }; y += h + gap; return r; });
}

/** Where the portrait goes inside a window [x0, x1] of a strip h high, so its eyes sit on the strip's middle line. */
export function cropOf(eye: { x: number; y: number }, x0: number, x1: number, h: number, show = 0.17) {
  const W = Math.max(40, x1 - x0);
  let imgH = h / show, imgW = imgH / 1.25;
  if (imgW < W + 40) { imgW = W + 40; imgH = imgW * 1.25; }
  let y = h / 2 - eye.y * imgH; y = Math.min(0, Math.max(h - imgH, y));
  let x = (x0 + x1) / 2 - eye.x * imgW; x = Math.min(x0 - 20, Math.max(x1 + 20 - imgW, x));
  return { x, y, w: imgW, h: imgH };
}

/** A torn strip as plain SVG markup (for the Miracle's overlay, which is not React): the strip's body full of the
 *  portrait's eyes, the ink lip along both rips. w × h px. */
export function tornStripMarkup(s: CutInStrip, seed: string, w: number, h: number): string {
  const shape = stripShape(seed, w, h, { windowFrac: 0.5 });
  const crop = cropOf(s.eye, 0, w, h, 0.2), id = 'mi' + String(seed).replace(/[^\w]/g, '').slice(-10);
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="overflow:visible">'
    + '<defs><clipPath id="' + id + '"><polygon points="' + shape.body + '"/></clipPath><linearGradient id="' + id + 'v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A0D13" stop-opacity=".6"/><stop offset=".25" stop-color="#0A0D13" stop-opacity="0"/><stop offset=".75" stop-color="#0A0D13" stop-opacity="0"/><stop offset="1" stop-color="#0A0D13" stop-opacity=".65"/></linearGradient></defs>'
    + '<polygon points="' + shape.lip + '" fill="' + esc(s.ink) + '"/><polygon points="' + shape.body + '" fill="#0A0D13" stroke="#0A0D13" stroke-width="2"/>'
    + '<g clip-path="url(#' + id + ')">' + (s.img ? '<image href="' + esc(s.img) + '" x="' + crop.x + '" y="' + crop.y + '" width="' + crop.w + '" height="' + crop.h + '" preserveAspectRatio="xMidYMid slice" opacity=".9"/>' : '')
    + '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'v)"/></g></svg>';
}
