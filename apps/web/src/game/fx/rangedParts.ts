// The SVG and CSS pieces the ranged techniques draw (fx/ranged.ts): lines held and snapped, a sweep across targets, a
// reticle closing on a body part, stakes driven down, a held lane, a heat strip, a pin, a radar sweep, chevrons, speed
// streaks, cracks, and the cover debris (the one textured piece: Cethiel's "Earth Impact" frames, CC0, public/fx/debris_*,
// credited in fx/fxCredits.ts). Everything here is a ring, a line, a stroke or a word (CLAUDE.md, the asset rule), drawn
// over the grid for a few hundred milliseconds. Every duration goes through put/anim/after (fx/dom.ts), so the combat
// speed and the spotlight tempo apply; under reduced motion moving pieces only fade.
import { reducedMotion } from '../sfx';
import { type Pt, after, anchor, anim, burst, put, sprite, svg } from './dom';

export const WHITE = '#FFFFFF', HP = '#F65157', MUTED = '#A3AEC2', AMBER = '#F2A54A', INK = '#0A0D13';
type XY = { x: number; y: number };

/** A box on the layer holding an SVG drawn in viewport pixels between points (the aimLine pattern of fx/sight.ts). */
function spanBox(pts: XY[], pad: number, ms: number, inner: (o: XY) => string): { box: HTMLElement; s: SVGSVGElement } {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - x0 + pad, h = Math.max(...ys) - y0 + pad;
  const s = svg(w, h, inner({ x: x0, y: y0 }));
  s.setAttribute('preserveAspectRatio', 'none');
  const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms);
  box.style.zIndex = '2';
  return { box, s };
}
const f1 = (n: number) => n.toFixed(1);
/** Name a piece on the layer (data-rfx), so the tests and the screenshot script can find it. */
export const mark = <T extends HTMLElement>(box: T, name: string): T => { box.setAttribute('data-rfx', name); return box; };

/** A line from a to b drawn on (dashoffset) over draw ms, held, then faded; dash '' is solid. */
export function line(a: XY, b: XY, o: { color?: string; width?: number; dash?: string; ms?: number; draw?: number; opacity?: number; glow?: boolean; under?: boolean } = {}) {
  const ms = o.ms ?? 500, len = Math.hypot(b.x - a.x, b.y - a.y), color = o.color || WHITE;
  // under: a dark ink stroke beneath, so a white line reads over the token's own white rim and over pale tiles
  const { box, s } = spanBox([a, b], 6, ms, (q) => (o.under ? '<line class="ln" x1="' + f1(a.x - q.x) + '" y1="' + f1(a.y - q.y) + '" x2="' + f1(b.x - q.x) + '" y2="' + f1(b.y - q.y) + '" stroke="' + INK + '" stroke-width="' + ((o.width ?? 1.6) + 3) + '" stroke-linecap="round" opacity=".7"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : ' stroke-dasharray="' + f1(len) + '"') + ' stroke-dashoffset="' + (o.dash ? '0' : f1(len)) + '"/>' : '') + '<line class="ln" x1="' + f1(a.x - q.x) + '" y1="' + f1(a.y - q.y) + '" x2="' + f1(b.x - q.x) + '" y2="' + f1(b.y - q.y) + '" stroke="' + color + '" stroke-width="' + (o.width ?? 1.6) + '" stroke-linecap="round"'
    + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : ' stroke-dasharray="' + f1(len) + '"') + ' stroke-dashoffset="' + (o.dash ? '0' : f1(len)) + '"' + (o.glow ? ' style="filter:drop-shadow(0 0 3px ' + color + ')"' : '') + '/>');
  const op = o.opacity ?? 0.95;
  anim(box, [{ opacity: 0 }, { opacity: op, offset: 0.12 }, { opacity: op, offset: 0.7 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
  for (const ln of Array.from(s.querySelectorAll('.ln'))) {
    if (!o.dash && !reducedMotion()) anim(ln, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: o.draw ?? ms * 0.35, easing: 'ease-out', fill: 'forwards' });
    else if (!o.dash) (ln as SVGElement).setAttribute('stroke-dashoffset', '0');
  }
  return mark(box, 'line');
}

/** A line that snaps in its middle: the two halves pull apart and fade (a Bead lost). */
export function snapLine(a: XY, b: XY, color = WHITE, ms = 420) {
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ang = Math.atan2(b.y - a.y, b.x - a.x), px = -Math.sin(ang) * 5, py = Math.cos(ang) * 5;
  for (const [p, q, k] of [[a, m, -1], [m, b, 1]] as [XY, XY, number][]) {
    const box = line(p, q, { color, width: 1.6, ms, draw: 1, opacity: 0.9 });
    if (!reducedMotion()) anim(box, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + f1(px * k + Math.cos(ang) * 6 * k) + 'px,' + f1(py * k + Math.sin(ang) * 6 * k) + 'px)' }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  }
  burst('flash_star', m, 18, 160, { color, from: 0.4, to: 1.1 });
}

/** A dashed arc from a to b rising h px (a lobbed shot's path, Walking Fire's route). */
export function arcPath(a: XY, b: XY, h: number, o: { color?: string; ms?: number; dash?: string; width?: number } = {}) {
  const ms = o.ms ?? 520, c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - h * 2 };
  const { box, s } = spanBox([a, b, { x: c.x, y: (a.y + b.y) / 2 - h }], 8, ms, (q) => '<path class="ln" d="M' + f1(a.x - q.x) + ' ' + f1(a.y - q.y) + ' Q' + f1(c.x - q.x) + ' ' + f1(c.y - q.y) + ' ' + f1(b.x - q.x) + ' ' + f1(b.y - q.y) + '" pathLength="100" fill="none" stroke="' + (o.color || WHITE) + '" stroke-width="' + (o.width ?? 1.6) + '" stroke-linecap="round" stroke-dasharray="' + (o.dash || '4 3') + '"/>');
  anim(box, [{ opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { opacity: 0.9, offset: 0.7 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
  // the dashes march along the path as it shows (the way the round goes)
  const ln = s.querySelector('.ln');
  if (ln && !reducedMotion()) anim(ln, [{ strokeDashoffset: 14 }, { strokeDashoffset: 0 }], { duration: ms, easing: 'linear', fill: 'forwards' });
  return mark(box, 'arc');
}

/** A route of tiles as a dashed polyline with a tick at its end (Walking Fire, Shift, Storm's charge). */
export function route(pts: XY[], o: { color?: string; ms?: number; dash?: string; s?: number } = {}) {
  if (pts.length < 2) return null;
  const ms = o.ms ?? 520, color = o.color || WHITE, end = pts[pts.length - 1], tick = (o.s || 40) * 0.18;
  const { box } = spanBox(pts, tick + 4, ms, (q) => '<polyline points="' + pts.map((p) => f1(p.x - q.x) + ',' + f1(p.y - q.y)).join(' ') + '" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>'
    + '<polyline points="' + pts.map((p) => f1(p.x - q.x) + ',' + f1(p.y - q.y)).join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + (o.dash || '6 5') + '"/>'
    + '<circle cx="' + f1(end.x - q.x) + '" cy="' + f1(end.y - q.y) + '" r="' + f1(tick) + '" fill="none" stroke="' + color + '" stroke-width="2"/>');
  anim(box, reducedMotion() ? [{ opacity: 0.9 }, { opacity: 0 }] : [{ opacity: 0, clipPath: 'inset(0 0 0 0)' }, { opacity: 0.95, offset: 0.15 }, { opacity: 0.95, offset: 0.7 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
  return mark(box, 'route');
}

/** The point of a body part on a token (Called Shot): head above the centre, legs below, an arm to one side. Pure. */
export function partPoint(p: Pt, part: string | null | undefined, side = 1): XY {
  if (part === 'head') return { x: p.x, y: p.y - p.s * 0.3 };
  if (part === 'leg') return { x: p.x + p.s * 0.08 * side, y: p.y + p.s * 0.3 };
  if (part === 'arm') return { x: p.x + p.s * 0.25 * side, y: p.y };
  return { x: p.x, y: p.y };
}
/** A reticle's corners closing on a point (size in px); dot: a centre dot that turns red as it locks (Dead Centre). */
export function reticle(q: XY, size: number, o: { color?: string; ms?: number; dot?: boolean; lock?: string } = {}) {
  const ms = o.ms ?? 420, c = o.color || WHITE;
  const s = svg(40, 40, '<path d="M5 13 V5 H13 M27 5 H35 V13 M35 27 V35 H27 M13 35 H5 V27" fill="none" stroke="' + INK + '" stroke-width="5" opacity=".6"/><path d="M5 13 V5 H13 M27 5 H35 V13 M35 27 V35 H27 M13 35 H5 V27" fill="none" stroke="' + c + '" stroke-width="2.5"/>'
    + (o.dot ? '<circle class="dot" cx="20" cy="20" r="2.6" fill="' + c + '"/>' : '<path d="M20 15 V18 M20 22 V25 M15 20 H18 M22 20 H25" stroke="' + c + '" stroke-width="1.5"/>'));
  const box = put(s, q, size, size, ms); box.style.zIndex = '3';
  anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(2.2) rotate(45deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.45 }, { transform: 'scale(1)', opacity: 1, offset: 0.8 }, { transform: 'scale(.9)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
  const dot = s.querySelector('.dot');
  if (dot && o.lock) anim(dot, [{ fill: c }, { fill: c, offset: 0.45 }, { fill: o.lock, offset: 0.55 }, { fill: o.lock }], { duration: ms, fill: 'forwards' });
  return mark(box, 'reticle');
}

/** A sweep of fire: a bright stroke drawn through the targets in order (Rake), ms to draw, then fading. */
export function sweep(pts: XY[], ms = 260) {
  if (pts.length < 2) return null;
  const life = ms + 260;
  const d = pts.map((p, i) => (i ? 'L' : 'M') + '_x' + i + ' _y' + i).join(' ');
  const { box, s } = spanBox(pts, 10, life, (q) => {
    let path = d; pts.forEach((p, i) => { path = path.replace('_x' + i + ' ', f1(p.x - q.x) + ' ').replace('_y' + i, f1(p.y - q.y)); });
    return '<path d="' + path + '" pathLength="100" fill="none" stroke="#FFE2A0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".35" class="ln"/>'
      + '<path d="' + path + '" pathLength="100" fill="none" stroke="' + WHITE + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ln"/>';
  });
  for (const ln of Array.from(s.querySelectorAll('.ln'))) { ln.setAttribute('stroke-dasharray', '100'); ln.setAttribute('stroke-dashoffset', reducedMotion() ? '0' : '100'); if (!reducedMotion()) anim(ln, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: ms, easing: 'linear', fill: 'forwards' }); }
  anim(box, [{ opacity: 1 }, { opacity: 1, offset: ms / life }, { opacity: 0 }], { duration: life, fill: 'forwards' });
  return mark(box, 'sweep');
}

/** Four stakes driven down at a token's corners (Pin Down), or an X staple across its base (nailed). */
export function stakes(p: Pt, nailed = false, ms = 900) {
  const inner = nailed
    ? '<path d="M10 30 L30 38 M30 30 L10 38" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/><path d="M10 30 L30 38 M30 30 L10 38" stroke="' + WHITE + '" stroke-width="2.6" stroke-linecap="round"/>'
    : [[5, 5], [35, 5], [5, 35], [35, 35]].map(([x, y]) => '<path d="M' + x + ' ' + (y - 7) + ' V' + (y + 2) + '" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/><path d="M' + x + ' ' + (y - 7) + ' V' + (y + 2) + ' M' + (x - 3) + ' ' + (y + 3) + ' H' + (x + 3) + '" stroke="' + WHITE + '" stroke-width="2.2" stroke-linecap="round"/>').join('');
  const s = svg(40, 40, inner), box = put(s, p, p.s * 1.15, p.s * 1.15, ms); box.style.zIndex = '3';
  anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translateY(-' + f1(p.s * 0.35) + 'px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.25 }, { transform: 'translateY(0)', opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ms, easing: 'steps(4, end)', fill: 'forwards' });
  return mark(box, 'stakes');
}

/** A dashed ring of r tiles held round a tile (Suppress's held lane), slowly turning, with a word chip elsewhere. */
export function laneRing(p: Pt, r: number, color = HP, ms = 900) {
  const d = p.s * (r * 2 + 1), s = svg(100, 100, '<circle cx="50" cy="50" r="48" fill="' + color + '" fill-opacity=".06" stroke="' + color + '" stroke-width="1.2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>');
  const box = put(s, p, d, d, ms);
  anim(box, reducedMotion() ? [{ opacity: 0.9 }, { opacity: 0 }] : [{ transform: 'scale(.85) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(8deg)', opacity: 0.95, offset: 0.2 }, { transform: 'scale(1) rotate(24deg)', opacity: 0.9, offset: 0.75 }, { transform: 'scale(1) rotate(30deg)', opacity: 0 }], { duration: ms, easing: 'linear', fill: 'forwards' });
  return mark(box, 'lane');
}
/** A blast's radius outlined on landing (r tiles, square: the grid's reach is Chebyshev), red: the damage reach. */
export function radiusBox(p: Pt, r: number, color = HP, ms = 520) {
  const d = p.s * (r * 2 + 1), s = svg(100, 100, '<rect x="1" y="1" width="98" height="98" rx="3" fill="' + color + '" fill-opacity=".10" stroke="' + color + '" stroke-width="1.6" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>');
  const box = put(s, p, d, d, ms);
  anim(box, reducedMotion() ? [{ opacity: 0.9 }, { opacity: 0 }] : [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.25 }, { opacity: 0.9, offset: 0.7 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  return mark(box, 'radius');
}

/** The Heat strip under a token (below its HP bar, clear of C's name rising above it): limit segments, filled to `now`
 *  (from `was`), in Body amber, with its words under the strip. */
export const HEAT_BAR_PX = 10;
export function heatBar(p: Pt, was: number, now: number, limit: number, label: string, ms = 1000) {
  const n = Math.max(1, Math.min(12, Math.round(limit) || 6)), w = Math.max(48, p.s * 1.2), h = 30;
  const el = document.createElement('div');
  el.setAttribute('data-phc-heat', String(now));
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;width:100%';
  const word = document.createElement('div');
  word.textContent = label;
  word.style.cssText = "font:700 " + Math.max(9, Math.round(p.s * 0.2)) + "px 'Chakra Petch',sans-serif;letter-spacing:.1em;color:" + AMBER + ';text-shadow:0 0 3px #000,0 1px 0 #000;white-space:nowrap';
  const bar = document.createElement('div');
  // border-box everywhere (main.tsx): the 10px holds 2px padding and 1px border each side, leaving the segments 4px
  bar.style.cssText = 'display:grid;grid-template-columns:repeat(' + n + ',1fr);grid-template-rows:1fr;gap:2px;flex:none;box-sizing:border-box;width:100%;height:' + HEAT_BAR_PX + 'px;padding:2px;background:rgba(10,13,19,.9);border:1px solid #232D3F;border-radius:3px';
  const segs: HTMLElement[] = [];
  for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.style.cssText = 'display:block;min-height:4px;border-radius:1px;background:' + (i < was ? AMBER : 'rgba(242,165,74,.18)'); bar.appendChild(c); segs.push(c); }
  el.append(bar, word);
  const box = put(el, { x: p.x, y: p.y + p.s * 0.5 + h / 2 + 2 }, w, h, ms); box.style.zIndex = '4';
  anim(box, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
  // the segments that change light up (rising) or drain (falling) one by one
  const lo = Math.min(was, now), hi = Math.max(was, now), up = now > was;
  for (let i = lo; i < hi && i < n; i++) {
    const k = up ? i - lo : hi - 1 - i;
    after(() => { segs[i].style.background = up ? AMBER : 'rgba(242,165,74,.18)'; }, 120 + k * 70);
  }
  return mark(box, 'heat');
}

/** A diamond pin that drops onto a point with two ping rings (Spot); dashed: only your side sees it. */
export function pin(p: Pt, color = WHITE, dashed = false, ms = 900) {
  const s = svg(24, 36, '<path d="M12 2 L22 13 L12 24 L2 13 Z" fill="rgba(10,13,19,.85)" stroke="' + color + '" stroke-width="2"' + (dashed ? ' stroke-dasharray="3 2"' : '') + '/><path d="M12 8 L16 13 L12 18 L8 13 Z" fill="' + color + '"/><path d="M12 25 V34" stroke="' + color + '" stroke-width="2"' + (dashed ? ' stroke-dasharray="2 2"' : '') + '/>');
  const box = put(s, { x: p.x, y: p.y - p.s * 0.75 }, p.s * 0.45, p.s * 0.68, ms); box.style.zIndex = '3';
  anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translateY(-' + f1(p.s * 0.6) + 'px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.22 }, { transform: 'translateY(-2px)', opacity: 1, offset: 0.3 }, { transform: 'translateY(0)', opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' });
  return mark(box, 'pin');
}

/** One radar sweep round a holder (Overwatch held): a wedge turning once inside a ring. */
export function radar(p: Pt, r = 1.6, ms = 520) {
  const d = p.s * r * 2, s = svg(100, 100, '<defs><linearGradient id="rw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient></defs>'
    + '<circle cx="50" cy="50" r="48" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1" vector-effect="non-scaling-stroke"/><path d="M50 50 L98 50 A48 48 0 0 0 83.9 16.1 Z" fill="url(#rw)"/><path d="M50 50 L98 50" stroke="#fff" stroke-width="1.5" vector-effect="non-scaling-stroke"/>');
  const box = put(s, p, d, d, ms);
  anim(box, reducedMotion() ? [{ opacity: 0.8 }, { opacity: 0 }] : [{ transform: 'rotate(0deg)', opacity: 0 }, { transform: 'rotate(60deg)', opacity: 1, offset: 0.15 }, { transform: 'rotate(330deg)', opacity: 0.9, offset: 0.85 }, { transform: 'rotate(360deg)', opacity: 0 }], { duration: ms, easing: 'linear', fill: 'forwards' });
  return mark(box, 'radar');
}

/** A denied tile: bracket corners and a red hatch fill. */
export function hatch(p: Pt, ms = 600, color = HP) {
  const id = 'h' + Math.random().toString(36).slice(2, 7);
  const s = svg(40, 40, '<defs><pattern id="' + id + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="6" fill="' + color + '" fill-opacity=".45"/></pattern></defs>'
    + '<rect x="3" y="3" width="34" height="34" fill="url(#' + id + ')"/><path d="M3 11 V3 H11 M29 3 H37 V11 M37 29 V37 H29 M11 37 H3 V29" fill="none" stroke="' + color + '" stroke-width="2.5"/>');
  const box = put(s, p, p.s, p.s, ms);
  anim(box, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: ms, easing: 'steps(5, end)', fill: 'forwards' });
  return mark(box, 'hatch');
}

/** Chevrons (two `>` strokes) leaving a point along an angle (Stopping Shot's push). */
export function chevrons(q: XY, ang: number, s: number, ms = 360, color = WHITE) {
  const deg = (ang * 180) / Math.PI;
  const el = svg(40, 24, '<path d="M6 4 L16 12 L6 20 M18 4 L28 12 L18 20" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/><path d="M6 4 L16 12 L6 20 M18 4 L28 12 L18 20" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>');
  const box = put(el, q, s * 0.7, s * 0.42, ms); box.style.zIndex = '3';
  const dx = Math.cos(ang) * s * 0.7, dy = Math.sin(ang) * s * 0.7;
  anim(box, reducedMotion() ? [{ transform: 'rotate(' + deg + 'deg)', opacity: 1 }, { transform: 'rotate(' + deg + 'deg)', opacity: 0 }]
    : [{ transform: 'translate(0,0) rotate(' + deg + 'deg) scale(.6)', opacity: 0 }, { transform: 'translate(' + f1(dx * 0.3) + 'px,' + f1(dy * 0.3) + 'px) rotate(' + deg + 'deg) scale(1)', opacity: 1, offset: 0.3 }, { transform: 'translate(' + f1(dx) + 'px,' + f1(dy) + 'px) rotate(' + deg + 'deg) scale(1.1)', opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  return mark(box, 'chevrons');
}

/** Speed streaks: three short white lines behind a point, pointing back along ang (a charge, a rout, a snap draw). */
export function streaks(q: XY, ang: number, s: number, ms = 320, color = WHITE) {
  const back = ang + Math.PI;
  for (let i = -1; i <= 1; i++) {
    const off = { x: -Math.sin(ang) * i * s * 0.22, y: Math.cos(ang) * i * s * 0.22 }, len = s * (0.5 + (i === 0 ? 0.25 : 0));
    const a = { x: q.x + off.x + Math.cos(back) * s * 0.35, y: q.y + off.y + Math.sin(back) * s * 0.35 }, b = { x: a.x + Math.cos(back) * len, y: a.y + Math.sin(back) * len };
    after(() => line(a, b, { color, width: 2, ms, draw: ms * 0.3, opacity: 0.85 }), Math.abs(i) * 30);
  }
}

/** The Snap Shot arc's box in tiles (its radius is 0.4 of the box: 0.72 of a tile, clear of the token's rim at 0.5). */
export const SNAP_ARC = 1.8;
/** A quarter arc of speed swept round a token toward an angle (Snap Shot's draw). */
export function speedArc(p: Pt, ang: number, ms = 220) {
  const deg = (ang * 180) / Math.PI;
  // outside the token's rim (r 16 of 40 at 1.8 tiles: 0.72 of a tile from the centre, the rim is at 0.5), on a dark
  // under-stroke so it parts from the rim and the board
  const d = 'M8 30 A16 16 0 0 1 30 8';
  const s = svg(40, 40, '<path class="ln" d="' + d + '" pathLength="100" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="100" stroke-dashoffset="100" opacity=".75"/><path class="ln" d="' + d + '" pathLength="100" fill="none" stroke="' + WHITE + '" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="100" stroke-dashoffset="100"/>');
  const box = mark(put(s, p, p.s * SNAP_ARC, p.s * SNAP_ARC, ms), 'snap'); box.style.zIndex = '3';
  box.style.transform = 'rotate(' + f1(deg + 45) + 'deg)';
  for (const ln of Array.from(s.querySelectorAll('.ln'))) {
    if (!reducedMotion()) anim(ln, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0, offset: 0.55 }, { strokeDashoffset: -100 }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
    else ln.setAttribute('stroke-dashoffset', '0');
  }
  anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
}

/** A ring broken into two arcs that drift apart and fade (a Watch lost). */
export function breakRing(p: Pt, color = MUTED, ms = 520) {
  for (const k of [-1, 1]) {
    const s = svg(100, 100, '<path d="' + (k < 0 ? 'M14 60 A38 38 0 0 1 86 40' : 'M86 40 A38 38 0 0 1 14 60') + '" fill="none" stroke="' + color + '" stroke-width="4" stroke-dasharray="9 6"/>');
    const box = mark(put(s, p, p.s * 1.6, p.s * 1.6, ms), 'break');
    anim(box, reducedMotion() ? [{ opacity: 0.9 }, { opacity: 0 }] : [{ transform: 'translate(0,0) rotate(0deg)', opacity: 0.95 }, { transform: 'translate(' + k * p.s * 0.18 + 'px,' + -k * p.s * 0.1 + 'px) rotate(' + k * 14 + 'deg)', opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  }
}

/** An X of two short strokes where two lines meet on a target (Crossfire). */
export function crossX(p: Pt, ms = 520, color = WHITE) {
  const s = svg(40, 40, '<path d="M12 12 L28 28 M28 12 L12 28" stroke="' + INK + '" stroke-width="6" stroke-linecap="round" opacity=".6"/><path d="M12 12 L28 28 M28 12 L12 28" stroke="' + color + '" stroke-width="2.6" stroke-linecap="round"/>');
  const box = mark(put(s, p, p.s * 0.8, p.s * 0.8, ms), 'cross'); box.style.zIndex = '3';
  anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(1.8) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.35 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
}

/** Cracks left on struck cover, along the shot's angle; they stay on the tile for a while (anchored). */
export function crack(key: string, p: Pt, ang: number, ms = 2400) {
  const deg = (ang * 180) / Math.PI;
  const d = 'M20 20 L27 17 L33 19 L39 15 M20 20 L25 26 L24 33 M20 20 L13 24 L6 22 M20 20 L16 13 L18 5';
  const s = svg(40, 40, '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><path d="' + d + '" fill="none" stroke="' + MUTED + '" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity=".7" transform="translate(.6 -.6)"/>');
  const box = put(s, p, p.s * 0.8, p.s * 0.8, ms);
  box.style.zIndex = '1';
  box.style.transform = 'rotate(' + f1(deg) + 'deg)';
  anchor(box, key, ms);
  anim(s, [{ opacity: 0 }, { opacity: 1, offset: 0.05 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
  return mark(box, 'crack');
}

/** What a cover object is made of, by its kind (data/objects.json): the tint and the sound of its debris. Pure. */
export function coverMaterial(kind: string | null | undefined): { tint: string; sound: 'hit_wood' | 'hit_metal' | 'el_stone'; label: string } {
  const k = String(kind || '');
  if (/crate|barricade|door|table|wood|cache/.test(k)) return { tint: '#E2C394', sound: 'hit_wood', label: 'wood' };
  if (/barrel|container|turret|terminal|camera|metal|alarm|lamp/.test(k)) return { tint: '#EEF2F8', sound: 'hit_metal', label: 'metal' };
  return { tint: '#D2D8E2', sound: 'el_stone', label: 'stone' };
}
/** The debris burst off struck cover (Cethiel's frames, tinted by material): the 4-frame splinter burst at the point,
 *  rotated along the shot, then loose chips thrown on along it. big: Flush's Spread or Blast, a wreck. */
export function debris(p: Pt, ang: number, tint: string, big = 1) {
  const size = p.s * 1.7 * big, deg = (ang * 180) / Math.PI + 90, ms = 340;
  // the frames keep their stone shading as transparency: two layers of the mask and a dark rim make them read over
  // cover art and the dark ground alike
  const look = (name: string) => { const d = document.createElement('div'); d.style.cssText = 'position:relative;width:100%;height:100%;filter:drop-shadow(0 1px 0 ' + INK + ') drop-shadow(0 0 2px rgba(10,13,19,.9))'; for (let k = 0; k < 2; k++) { const l = sprite(name, tint); l.style.position = 'absolute'; l.style.inset = '0'; d.appendChild(l); } return d; };
  for (let i = 0; i < 4; i++) {
    const el = look('debris_' + (i + 1)), box = mark(put(el, p, size, size, ms), 'debris');
    box.style.zIndex = '2';
    const a = i / 4, b = (i + 1) / 4;
    const fr: Keyframe[] = reducedMotion() ? [{ opacity: i === 0 ? 1 : 0 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'rotate(' + deg + 'deg) scale(' + (0.7 + a * 0.4) + ')', offset: 0 }, ...(a > 0 ? [{ opacity: 0, offset: a } as Keyframe] : []), { opacity: 1, transform: 'rotate(' + deg + 'deg) scale(' + (0.7 + b * 0.4) + ')', offset: Math.min(1, a + 0.02) }, { opacity: i === 3 ? 0.9 : 1, offset: b }, ...(i < 3 ? [{ opacity: 0, offset: Math.min(1, b + 0.02) } as Keyframe, { opacity: 0, offset: 1 } as Keyframe] : [{ opacity: 0, transform: 'rotate(' + deg + 'deg) scale(1.2)', offset: 1 } as Keyframe])];
    anim(box, fr, { duration: ms, easing: 'linear', fill: 'forwards' });
  }
  if (reducedMotion()) return;
  // the chips fly on along the shot
  for (const [n, k] of [[1, 0.55], [2, 0.85]] as [number, number][]) {
    const el = look('debris_chips_' + n), box = mark(put(el, p, size * 0.8, size * 0.8, 420), 'chips');
    box.style.zIndex = '2';
    const dx = Math.cos(ang) * p.s * k * big, dy = Math.sin(ang) * p.s * k * big;
    anim(box, [{ transform: 'translate(0,0) rotate(' + deg + 'deg) scale(.6)', opacity: 0 }, { transform: 'translate(' + f1(dx * 0.35) + 'px,' + f1(dy * 0.35) + 'px) rotate(' + (deg + 20 * n) + 'deg) scale(.9)', opacity: 1, offset: 0.2 }, { transform: 'translate(' + f1(dx) + 'px,' + f1(dy + p.s * 0.12) + 'px) rotate(' + (deg + 50 * n) + 'deg) scale(1)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
  }
}
