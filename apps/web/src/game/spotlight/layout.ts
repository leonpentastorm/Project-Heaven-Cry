// The cut-in's geometry (docs/design/cutin-spec.md 3.1–3.2, 9.1): where the strips go, how a portrait is cropped to its
// eyes, and a strip as plain SVG markup for the non-React overlays. Pure (tests).
import { stripShape } from './tear';
import type { CutInStrip } from './spec';

/** A strip's size and place: one wide strip, or a stack of 2–4. Pure (tests). */
export function stackLayout(n: number, vw: number, vh: number, god: boolean[] = [], short = false): { h: number; top: number; tilt: number; dx: number; fromLeft: boolean; windowLeft: boolean }[] {
  // One strip: 29vh (150–290 px). A short one (a crit in a fight, decision 113) is a slimmer cut, 22vh (120–220 px):
  // the smaller moment reads smaller.
  if (n <= 1) { const h = short ? Math.max(120, Math.min(220, vh * 0.22)) : Math.max(150, Math.min(290, vh * 0.29)); return [{ h, top: vh * 0.46 - h / 2, tilt: -4, dx: 0, fromLeft: true, windowLeft: true }]; }
  const gap = vh * 0.012, base = Math.max(90, Math.min(200, (vh * 0.64 - gap * (n - 1)) / n));
  const hs = Array.from({ length: n }, (_, i) => (god[i] ? Math.min(base * 1.3, 240) : base));
  const total = hs.reduce((a, b) => a + b, 0) + gap * (n - 1);
  let y = Math.max(vh * 0.06, vh * 0.44 - total / 2);
  const tilts = [-3, 2, -2, 3];
  return hs.map((h, i) => { const r = { h, top: y, tilt: tilts[i % 4], dx: (i % 2 ? -1 : 1) * vw * 0.03, fromLeft: i % 2 === 0, windowLeft: i % 2 === 0 }; y += h + gap; return r; });
}

/** How far a portrait may be magnified on screen, in CSS px per source px: past this the eyes go soft (an uploaded
 *  portrait's 320 × 400 room copy at 1920 px would be 4× and more). */
export const MAX_MAGNIFY = 2.2;
/** A narrow screen (a phone held upright): the strips' words go in the plate under them, never into the torn-off end. */
export const NARROW_PX = 720;

/**
 * Where the portrait goes inside a window [x0, x1] of a strip h high, so its eyes sit on the strip's middle line.
 * The image always covers [l, r] (what the screen shows of the window's outer side: by default 20 px past the window),
 * unless that would magnify it past MAX_MAGNIFY × natW (its source width, when known): then it is anchored to the screen
 * edge side (`anchor`) and `capped` says the window is wider than the image (the strip's body fills the rest).
 * Pure (tests).
 */
export function cropOf(eye: { x: number; y: number }, x0: number, x1: number, h: number, show = 0.17,
  o: { l?: number; r?: number; natW?: number; anchor?: 'l' | 'r' } = {}) {
  const l = o.l ?? x0 - 20, r = o.r ?? x1 + 20, need = Math.max(40, r - l);
  let imgW = Math.max(h / show / 1.25, need);
  const cap = o.natW && o.natW > 0 ? Math.max(o.natW * MAX_MAGNIFY, h * 0.8) : Infinity; // never shorter than the strip
  const capped = imgW > cap; if (capped) imgW = cap;
  const imgH = imgW * 1.25;
  let y = h / 2 - eye.y * imgH; y = Math.min(0, Math.max(h - imgH, y));
  let x = (x0 + x1) / 2 - eye.x * imgW;
  x = capped ? (o.anchor === 'r' ? r - imgW : l) : Math.min(l, Math.max(r - imgW, x));
  return { x, y, w: imgW, h: imgH, capped };
}

/** A torn strip as plain SVG markup (for the Miracle's overlay, which is not React): the strip's body, the eye window
 *  (the left `frac` of it, so the eyes sit beside a centred mark, never behind it) full of the portrait's eyes, the ink
 *  lip along both rips and down the window's torn side. w × h px, the strip overhanging the screen by `over` each side. */
export function tornStripMarkup(s: CutInStrip, seed: string, w: number, h: number, o: { frac?: number; over?: number } = {}): string {
  const frac = o.frac ?? 0.42, over = o.over ?? w / 12;
  const shape = stripShape(seed, w, h, { windowFrac: frac, windowLeft: true });
  const crop = cropOf(s.eye, over, shape.edgeX, h, 0.2, { l: over - 28, r: shape.edgeX + 24, natW: 800, anchor: 'l' });
  const id = 'mi' + String(seed).replace(/[^\w]/g, '').slice(-10);
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const edge = shape.window.split(' ').slice(1, -1).join(' ');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="overflow:visible">'
    + '<defs><clipPath id="' + id + '"><polygon points="' + shape.body + '"/></clipPath><clipPath id="' + id + 'w"><polygon points="' + shape.window + '"/></clipPath>'
    + '<linearGradient id="' + id + 'v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A0D13" stop-opacity=".6"/><stop offset=".25" stop-color="#0A0D13" stop-opacity="0"/><stop offset=".75" stop-color="#0A0D13" stop-opacity="0"/><stop offset="1" stop-color="#0A0D13" stop-opacity=".65"/></linearGradient>'
    + '<linearGradient id="' + id + 'g" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="' + esc(s.ink) + '" stop-opacity=".5"/><stop offset=".4" stop-color="' + esc(s.ink) + '" stop-opacity="0"/></linearGradient></defs>'
    + '<polygon points="' + shape.lip + '" fill="' + esc(s.ink) + '"/><polygon points="' + shape.body + '" fill="#0A0D13" stroke="#0A0D13" stroke-width="2"/>'
    + '<g clip-path="url(#' + id + ')"><g clip-path="url(#' + id + 'w)"><rect width="' + w + '" height="' + h + '" fill="#1C2536"/>'
    + (s.img ? '<image href="' + esc(s.img) + '" x="' + crop.x + '" y="' + crop.y + '" width="' + crop.w + '" height="' + crop.h + '" preserveAspectRatio="xMidYMid slice"/>' : '')
    + '<rect x="' + (shape.edgeX - w * 0.18) + '" width="' + (w * 0.18) + '" height="' + h + '" fill="url(#' + id + 'g)"/>'
    + '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'v)"/></g>'
    + '<polyline points="' + edge + '" fill="none" stroke="' + esc(s.ink) + '" stroke-width="3" stroke-linejoin="round"/></g></svg>';
}
