// The composable SVG parts every physical technique's animation is built from (fx/techniqueFx.ts: the table of which
// parts each technique plays, and with what parameters). Leon, 12 Nov 2026: "an attack effect and a result effect so
// you feel something if it misses": every technique plays an ATTACK part (the stroke or shot itself, whether or not it
// lands) and a RESULT part on the target (a hit, a miss and a crit each look different).
//
// The asset rule (CLAUDE.md): everything here is a line, an arc, a ring, a tick, a chevron, a glyph or a tint, drawn as
// SVG in viewport pixels; nothing here needs texture, so nothing new is sourced. The weapon part shows the weapon's own
// monoline icon (art/icons/weapons through game/gearIcons.ts), used where it reads better than a stroke (Sunder).
// Cheap on purpose: one small SVG box per part, animated by transform, opacity and stroke-dashoffset only (no layout per
// frame), removed by put() when it is done. Time: every duration and delay goes through fx/dom.ts (put, anim, after), so
// the combat speed (Normal, Fast, the test pace) and a spotlight's slow-mo apply. Reduced motion: nothing travels or
// draws on; each part shows its end state and fades.
import { reducedMotion } from '../sfx';
import { gearIconUri, hasGearIcon } from '../gearIcons';
import { type Pt, anim, put, svg } from './dom';

export const INK_DARK = '#0A0D13', WHITE = '#FFFFFF', MUTED = '#A3AEC2', HP = '#F65157';
type XY = { x: number; y: number };

/** What every part is given: the attacker (null when unseen), the target point, the direction attacker → target, the
 *  tile size, the technique's ink, how big (a crit is bigger), the delay from the event's start, and the event. */
export interface PartCtx {
  a: Pt | null; b: Pt; dir: XY; s: number; ink: string; scale: number; delay: number;
  outcome: 'hit' | 'miss' | 'crit' | 'use';
  weapon?: string; strikes?: number;
}
export type PartParams = Record<string, number | string | boolean | undefined>;
export type PartFn = (c: PartCtx, o: PartParams) => void;

const f1 = (n: number) => n.toFixed(1);
const num = (o: PartParams, k: string, d: number) => (typeof o[k] === 'number' ? (o[k] as number) : d);
const str = (o: PartParams, k: string, d: string) => (typeof o[k] === 'string' ? (o[k] as string) : d);
const rm = () => reducedMotion();
const rot = (v: XY, ang: number): XY => ({ x: v.x * Math.cos(ang) - v.y * Math.sin(ang), y: v.x * Math.sin(ang) + v.y * Math.cos(ang) });
const add = (p: XY, v: XY, k = 1): XY => ({ x: p.x + v.x * k, y: p.y + v.y * k });
const nrm = (v: XY): XY => ({ x: -v.y, y: v.x });
const pathD = (pts: XY[]) => pts.map((p, i) => (i ? 'L' : 'M') + f1(p.x) + ' ' + f1(p.y)).join(' ');
const lenOf = (pts: XY[]) => pts.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
/** The dark casing every stroke gets, so white and ink lines read over portraits and the floor alike. */
const CASING = 'drop-shadow(0 0 1px #0A0D13) drop-shadow(0 0 2.5px rgba(10,13,19,.85))';

/** One SVG box on the layer, its user units viewport pixels, around the points (pad px), alive for ms. */
function stage(pts: XY[], pad: number, ms: number, tag: string): { s: SVGSVGElement; box: HTMLElement } {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(1, Math.max(...xs) - x0 + pad), h = Math.max(1, Math.max(...ys) - y0 + pad);
  const s = svg(w, h, ''); s.setAttribute('viewBox', f1(x0) + ' ' + f1(y0) + ' ' + f1(w) + ' ' + f1(h));
  const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms);
  box.setAttribute('data-tech-fx', tag); box.style.zIndex = '2';
  s.style.filter = CASING;
  return { s, box };
}
const NS = 'http://www.w3.org/2000/svg';
function el(tag: string, attrs: Record<string, string | number>): SVGElement {
  const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); return n;
}
/** A stroke drawn on along its length over draw ms, held, then faded (reduced motion: shown whole, then faded). */
function drawOn(n: SVGElement, len: number, draw: number, hold: number, fade: number, delay = 0) {
  const total = draw + hold + fade;
  n.setAttribute('opacity', '0');
  if (!rm()) { n.setAttribute('stroke-dasharray', f1(len) + ' ' + f1(len + 4)); anim(n, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: Math.max(1, draw), delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }); }
  anim(n, [{ opacity: 1 }, { opacity: 1, offset: (draw + hold) / total }, { opacity: 0 }], { duration: total, delay, fill: 'both' });
}
/** A whole box that pops in (scale from k0) and fades. */
function popBox(box: HTMLElement, ms: number, delay: number, k0 = 0.6, k1 = 1) {
  anim(box, rm() ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }]
    : [{ transform: 'scale(' + k0 + ')', opacity: 0 }, { transform: 'scale(' + k1 + ')', opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.65 }, { transform: 'scale(' + k1 + ')', opacity: 0 }], { duration: ms, delay, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' });
}
/** A stroke path between points (stroke width w px). */
function stroke(s: SVGSVGElement, pts: XY[], color: string, w: number, o: { dash?: string; opacity?: number; cap?: string } = {}): SVGElement {
  const n = el('path', { d: pathD(pts), fill: 'none', stroke: color, 'stroke-width': f1(w), 'stroke-linecap': o.cap || 'round', 'stroke-linejoin': 'round', ...(o.dash ? { 'stroke-dasharray': o.dash } : {}), ...(o.opacity != null ? { 'stroke-opacity': o.opacity } : {}) });
  s.appendChild(n); return n;
}
/** Points along an arc around c, radius r, from angle a0 to a1. */
const arcPts = (c: XY, r: number, a0: number, a1: number, n = 16): XY[] => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / n; return { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r }; });
const angOf = (v: XY) => Math.atan2(v.y, v.x);
/** The point where a stroke from the attacker meets the target's near side. */
const nearSide = (c: PartCtx, k = 0.42) => add(c.b, c.dir, -c.s * k);

// ---------------------------------------------------------------------------------------------------------- the parts
export const PARTS: Record<string, PartFn> = {
  // ===== attack strokes (the stroke itself: played hit or miss) =====
  /** A curved cut across the target's front. arc: degrees swept; turn: ±1 the way it goes; r: radius in tiles; w: width
   *  in tiles; count: cuts, each gap ms apart, alternating; off: tiles the centre sits short of the target. */
  slash(c, o) {
    const n = Math.max(1, num(o, 'count', 1)), gap = num(o, 'gap', 70), r = c.s * num(o, 'r', 0.55) * c.scale, w = Math.max(2.5, c.s * num(o, 'w', 0.12) * c.scale);
    const centre = add(c.b, c.dir, -c.s * num(o, 'off', 0.1)), half = (num(o, 'arc', 110) * Math.PI) / 360, tilt = (num(o, 'tilt', 0) * Math.PI) / 180;
    for (let i = 0; i < n; i++) {
      const turn = (num(o, 'turn', 1) * (i % 2 ? -1 : 1)), base = angOf(c.dir) + Math.PI + tilt + (i % 2 ? 0.5 : 0) * (n > 1 ? 1 : 0);
      // the arc faces the attacker: centred behind the target, sweeping across its front
      const pts = arcPts(add(centre, c.dir, r * 0.55), r, base - half * turn, base + half * turn, 18);
      const { s } = stage(pts, w + 4, 520 + i * gap + c.delay, 'slash');
      const ln = stroke(s, pts, str(o, 'color', '') || c.ink, w);
      drawOn(ln, lenOf(pts), num(o, 'draw', 110), 70, 260, c.delay + i * gap);
      if (o.echo) { const e2 = stroke(s, pts.map((p) => add(p, c.dir, -w * 0.9)), WHITE, Math.max(1.5, w * 0.35), { opacity: 0.8 }); drawOn(e2, lenOf(pts), num(o, 'draw', 110), 40, 220, c.delay + i * gap + 30); }
    }
  },
  /** A straight drive from the attacker into (and through) the target, with a point. len: tiles past the target;
   *  count: thrusts gap ms apart, fanned by spread degrees; w: width in tiles. */
  thrust(c, o) {
    const n = Math.max(1, num(o, 'count', 1)), gap = num(o, 'gap', 80), w = Math.max(2, c.s * num(o, 'w', 0.07) * c.scale), spread = (num(o, 'spread', 0) * Math.PI) / 180;
    for (let i = 0; i < n; i++) {
      const d = rot(c.dir, n > 1 ? spread * (i - (n - 1) / 2) : 0), from = c.a ? add(c.a, d, c.s * 0.35) : add(c.b, d, -c.s * 1.1), end = add(c.b, d, c.s * num(o, 'len', 0.35));
      const nn = nrm(d), tip = c.s * 0.13 * c.scale, pts = [from, end];
      const { s } = stage([from, end], w + tip + 4, 480 + i * gap + c.delay, 'thrust');
      const ln = stroke(s, pts, str(o, 'color', '') || c.ink, w);
      drawOn(ln, lenOf(pts), num(o, 'draw', 80), 90, 220, c.delay + i * gap);
      const head = stroke(s, [add(add(end, d, -tip), nn, tip * 0.7), end, add(add(end, d, -tip), nn, -tip * 0.7)], str(o, 'color', '') || c.ink, Math.max(2, w * 0.9));
      drawOn(head, tip * 3, 1, 160, 220, c.delay + i * gap + num(o, 'draw', 80));
    }
  },
  /** An overhead blow coming down onto the target from above, ending in a flat impact bar. h: height in tiles. */
  chop(c, o) {
    const w = Math.max(3, c.s * num(o, 'w', 0.14) * c.scale), h = c.s * num(o, 'h', 0.95), lean = c.dir.x >= 0 ? 1 : -1;
    const top = { x: c.b.x - lean * c.s * 0.28, y: c.b.y - h }, low = { x: c.b.x + lean * c.s * 0.05, y: c.b.y + c.s * 0.05 };
    const bar = [{ x: low.x - c.s * 0.3 * c.scale, y: low.y + c.s * 0.08 }, { x: low.x + c.s * 0.3 * c.scale, y: low.y + c.s * 0.08 }];
    const { s } = stage([top, low, ...bar], w + 4, 520 + c.delay, 'chop');
    const ln = stroke(s, [top, { x: (top.x + low.x) / 2 - lean * c.s * 0.06, y: (top.y + low.y) / 2 }, low], str(o, 'color', '') || c.ink, w);
    drawOn(ln, h * 1.05, num(o, 'draw', 90), 80, 240, c.delay);
    const b2 = stroke(s, bar, WHITE, Math.max(2, w * 0.4)); drawOn(b2, c.s * 0.6, 60, 90, 200, c.delay + num(o, 'draw', 90));
  },
  /** A wide arc around the attacker (a sweep, a spinning stroke). span: degrees; r: radius in tiles (0: to the target). */
  sweep(c, o) {
    const at = c.a || add(c.b, c.dir, -c.s); const r = num(o, 'r', 0) > 0 ? c.s * num(o, 'r', 0) : Math.hypot(c.b.x - at.x, c.b.y - at.y) || c.s;
    const half = (num(o, 'span', 140) * Math.PI) / 360, base = angOf(c.dir), w = Math.max(3, c.s * num(o, 'w', 0.1) * c.scale);
    const pts = arcPts(at, r, base - half, base + half, 24);
    const { s } = stage(pts, w + 4, 560 + c.delay, 'sweep');
    drawOn(stroke(s, pts, str(o, 'color', '') || c.ink, w), lenOf(pts), num(o, 'draw', 160), 60, 260, c.delay);
  },
  /** A shield or pommel driven flat into the target: a short block face that flies in and squashes. */
  bash(c, o) {
    const nn = nrm(c.dir), hw = c.s * num(o, 'half', 0.32) * c.scale, contact = nearSide(c, 0.38);
    const face = [add(contact, nn, hw), add(contact, nn, -hw)];
    const { s, box } = stage([...face, add(contact, c.dir, -c.s * 0.6)], c.s * 0.3, 460 + c.delay, 'bash');
    const w = Math.max(3, c.s * num(o, 'w', 0.13));
    stroke(s, face, str(o, 'color', '') || c.ink, w, { cap: 'square' });
    stroke(s, [add(face[0], c.dir, -w * 1.6), face[0]], str(o, 'color', '') || c.ink, Math.max(2, w * 0.5));
    stroke(s, [add(face[1], c.dir, -w * 1.6), face[1]], str(o, 'color', '') || c.ink, Math.max(2, w * 0.5));
    const k = c.s * 0.5;
    anim(box, rm() ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }]
      : [{ transform: 'translate(' + f1(-c.dir.x * k) + 'px,' + f1(-c.dir.y * k) + 'px)', opacity: 0 }, { transform: 'translate(0,0) scale(1,1)', opacity: 1, offset: 0.25 }, { transform: 'translate(0,0) scale(.9,1.1)', opacity: 1, offset: 0.45 }, { opacity: 0 }], { duration: 460, delay: c.delay, easing: 'cubic-bezier(.3,.9,.4,1)', fill: 'both' });
  },
  /** A hook: a line from the attacker that curls round the target and pulls back (a drag, a hooked leg, a pull). */
  hook(c, o) {
    const at = c.a || add(c.b, c.dir, -c.s); const nn = nrm(c.dir), low = num(o, 'low', 0) * c.s;
    const end = add(add(c.b, c.dir, c.s * 0.25), { x: 0, y: low }), curl = add(add(end, nn, c.s * 0.3), c.dir, -c.s * 0.2);
    const pts = [add(at, c.dir, c.s * 0.3), add(add(c.b, nn, -c.s * 0.1), { x: 0, y: low }), end, curl];
    const { s } = stage(pts, c.s * 0.3, 560 + c.delay, 'hook');
    const w = Math.max(2.5, c.s * num(o, 'w', 0.08));
    drawOn(stroke(s, pts, str(o, 'color', '') || c.ink, w), lenOf(pts), num(o, 'draw', 120), 120, 240, c.delay);
  },
  /** A stamp onto the ground at the target's feet: flattened rings squashing out. rings: how many. */
  stomp(c, o) {
    const n = Math.max(1, num(o, 'rings', 2)), feet = { x: c.b.x, y: c.b.y + c.s * 0.32 };
    for (let i = 0; i < n; i++) {
      const rx = c.s * (0.45 + i * 0.18) * c.scale, ry = rx * 0.38;
      const { s, box } = stage([{ x: feet.x - rx, y: feet.y - ry }, { x: feet.x + rx, y: feet.y + ry }], 6, 460 + c.delay + i * 60, 'stomp');
      s.appendChild(el('ellipse', { cx: f1(feet.x), cy: f1(feet.y), rx: f1(rx), ry: f1(ry), fill: 'none', stroke: str(o, 'color', '') || c.ink, 'stroke-width': f1(Math.max(2, c.s * 0.07)) }));
      popBox(box, 420, c.delay + i * 60, 0.3, 1.1);
    }
  },
  /** Short quick jabs into the target's near side, count of them gap ms apart (fists, a pommel, a rabbit punch). */
  jab(c, o) {
    const n = Math.max(1, num(o, 'count', 2)), gap = num(o, 'gap', 60), nn = nrm(c.dir);
    for (let i = 0; i < n; i++) {
      const side = (i % 2 ? 1 : -1) * c.s * 0.14, end = add(nearSide(c, 0.2), nn, side), from = add(end, c.dir, -c.s * 0.5);
      const { s } = stage([from, end], 8, 360 + c.delay + i * gap, 'jab');
      drawOn(stroke(s, [from, end], str(o, 'color', '') || c.ink, Math.max(3, c.s * 0.1 * c.scale)), c.s * 0.5, 50, 60, 160, c.delay + i * gap);
    }
  },
  /** A thin line of aim from the attacker to the target, drawn first (an Aimed or Called Shot, a held bead). */
  aim(c, o) {
    if (!c.a) return;
    const from = add(c.a, c.dir, c.s * 0.4), end = nearSide(c, num(o, 'short', 0.5));
    const { s } = stage([from, end], 6, 420 + c.delay, 'aim');
    const n = stroke(s, [from, end], str(o, 'color', '') || c.ink, Math.max(1.2, c.s * 0.03), { dash: str(o, 'dash', '') || undefined });
    if (o.dash) { anim(n, [{ opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { opacity: 0.9, offset: 0.7 }, { opacity: 0 }], { duration: 420, delay: c.delay, fill: 'both' }); } else drawOn(n, lenOf([from, end]), 120, 160, 140, c.delay);
  },
  /** The round's trail in the technique's ink, from the muzzle along the shot (onto the target, or past it on a miss;
   *  over: lifted over its head by that many tiles, a shot meant to miss). w: width in tiles; draw: ms. */
  tracer(c, o) {
    if (!c.a) return;
    const nn = nrm(c.dir), from = add(c.a, c.dir, c.s * 0.45), lift = num(o, 'over', 0) * c.s;
    const end = c.outcome === 'miss' ? add(add(c.b, c.dir, c.s * 0.8), nn, c.s * 0.5) : lift ? add({ x: c.b.x, y: c.b.y - lift }, c.dir, c.s * 0.9) : nearSide(c, 0.3);
    const { s } = stage([from, end], 6, 360, 'tracer');
    drawOn(stroke(s, [from, end], str(o, 'color', '') || c.ink, Math.max(1.5, c.s * num(o, 'w', 0.03)), { opacity: 0.85 }), lenOf([from, end]), num(o, 'draw', 70), 60, 200, c.delay);
  },
  /** A heavy line: a thick white core in the ink, from the muzzle through the target (a bolt, a heavy round). */
  heavy(c, o) {
    const from = c.a ? add(c.a, c.dir, c.s * 0.45) : add(c.b, c.dir, -c.s * 2), end = add(c.b, c.dir, c.s * num(o, 'past', 0.6));
    const { s } = stage([from, end], c.s * 0.2, 440 + c.delay, 'heavy');
    const w = c.s * num(o, 'w', 0.16) * c.scale;
    drawOn(stroke(s, [from, end], str(o, 'color', '') || c.ink, w, { opacity: 0.55 }), lenOf([from, end]), num(o, 'draw', 70), 80, 240, c.delay);
    drawOn(stroke(s, [from, end], WHITE, Math.max(1.5, w * 0.3)), lenOf([from, end]), num(o, 'draw', 70), 80, 240, c.delay);
  },
  /** A cone from the attacker opening toward the target (a scattering, a sweep of fire). span: degrees; len: tiles past. */
  cone(c, o) {
    if (!c.a) return;
    const half = (num(o, 'span', 36) * Math.PI) / 360, d = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y) + c.s * num(o, 'len', 0.6);
    const o0 = add(c.a, c.dir, c.s * 0.35), l = add(c.a, rot(c.dir, -half), d), r = add(c.a, rot(c.dir, half), d);
    const { s } = stage([o0, l, r], 6, 520 + c.delay, 'cone');
    const ink = str(o, 'color', '') || c.ink;
    drawOn(stroke(s, [l, o0, r], ink, Math.max(1.5, c.s * 0.04), { opacity: 0.9 }), lenOf([l, o0, r]), 140, 120, 240, c.delay);
    const fill = el('path', { d: pathD([o0, l, ...arcPts(c.a, d, angOf(c.dir) - half, angOf(c.dir) + half, 8), r]) + ' Z', fill: ink, opacity: 0 }); s.appendChild(fill);
    anim(fill, [{ opacity: 0 }, { opacity: 0.18, offset: 0.3 }, { opacity: 0 }], { duration: 420, delay: c.delay, fill: 'both' });
  },
  /** Short radial ticks around the target, one after another (suppressing fire cracking past). n: ticks; r: tiles. */
  ticks(c, o) {
    const n = Math.max(1, num(o, 'n', 4)), r = c.s * num(o, 'r', 0.62), gap = num(o, 'gap', 45);
    for (let i = 0; i < n; i++) {
      const ang = angOf(c.dir) + Math.PI + ((i % 2 ? 1 : -1) * (0.5 + i * 0.35)), p = { x: c.b.x + Math.cos(ang) * r, y: c.b.y + Math.sin(ang) * r }, q = { x: c.b.x + Math.cos(ang) * (r + c.s * 0.18), y: c.b.y + Math.sin(ang) * (r + c.s * 0.18) };
      const { s } = stage([p, q], 6, 320 + c.delay + i * gap, 'ticks');
      drawOn(stroke(s, [p, q], str(o, 'color', '') || c.ink, Math.max(2, c.s * 0.05)), c.s * 0.2, 40, 80, 160, c.delay + i * gap);
    }
  },
  /** A glyph stamped over the target (a mark): diamond, cross, eye, target, chevron, bar, clock. */
  brand(c, o) {
    const shape = str(o, 'shape', 'diamond'), z = c.s * num(o, 'size', 0.22) * c.scale, p = { x: c.b.x, y: c.b.y - c.s * num(o, 'up', 0.62) };
    const { s, box } = stage([{ x: p.x - z, y: p.y - z }, { x: p.x + z, y: p.y + z }], 6, 620 + c.delay, 'brand');
    const ink = str(o, 'color', '') || c.ink, w = Math.max(2, c.s * 0.055);
    const P = (dx: number, dy: number) => ({ x: p.x + dx * z, y: p.y + dy * z });
    const shapes: Record<string, XY[][]> = {
      diamond: [[P(0, -1), P(1, 0), P(0, 1), P(-1, 0), P(0, -1)]], cross: [[P(-1, -1), P(1, 1)], [P(1, -1), P(-1, 1)]],
      target: [[P(0, -1.2), P(0, -0.4)], [P(0, 0.4), P(0, 1.2)], [P(-1.2, 0), P(-0.4, 0)], [P(0.4, 0), P(1.2, 0)]],
      chevron: [[P(-1, -0.5), P(0, 0.5), P(1, -0.5)]], bar: [[P(-1, 0), P(1, 0)], [P(-1, -0.5), P(-1, 0.5)], [P(1, -0.5), P(1, 0.5)]],
      clock: [[P(0, -1), P(0, 0), P(0.7, 0.4)]], eye: [[P(-1, 0), P(0, -0.6), P(1, 0), P(0, 0.6), P(-1, 0)]], drop: [[P(0, -1), P(0.6, 0.3), P(0, 0.9), P(-0.6, 0.3), P(0, -1)]],
    };
    for (const pts of shapes[shape] || shapes.diamond) stroke(s, pts, ink, w);
    if (shape === 'target' || shape === 'eye' || shape === 'clock') s.appendChild(el('circle', { cx: f1(p.x), cy: f1(p.y), r: f1(z * (shape === 'eye' ? 0.25 : 0.85)), fill: 'none', stroke: ink, 'stroke-width': f1(w) }));
    popBox(box, 600, c.delay, 1.6, 1);
  },
  /** Speed streaks behind the target the way it is shoved (a knockback, a stopping round). n: lines; len: tiles. */
  streak(c, o) {
    const n = Math.max(1, num(o, 'n', 3)), len = c.s * num(o, 'len', 0.7) * c.scale, nn = nrm(c.dir);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * c.s * 0.18, st = add(add(c.b, c.dir, c.s * 0.3), nn, off), end = add(st, c.dir, len * (i % 2 ? 0.75 : 1));
      const { s } = stage([st, end], 6, 380 + c.delay + i * 30, 'streak');
      drawOn(stroke(s, [st, end], str(o, 'color', '') || c.ink, Math.max(2, c.s * 0.05)), len, 90, 60, 200, c.delay + i * 30);
    }
  },
  /** Chevrons past the target pointing the way it goes (a push, a drive back; back: toward the attacker, a pull). */
  chevrons(c0, o) {
    const c = o.back ? { ...c0, dir: { x: -c0.dir.x, y: -c0.dir.y } } : c0;
    const n = Math.max(1, num(o, 'n', 2)), z = c.s * 0.2 * c.scale, nn = nrm(c.dir);
    const pts: XY[] = []; for (let i = 0; i < n; i++) { const m = add(c.b, c.dir, c.s * (0.55 + i * 0.28)); pts.push(add(add(m, c.dir, -z), nn, z), m, add(add(m, c.dir, -z), nn, -z)); }
    const { s } = stage(pts, 6, 460 + c.delay, 'chevrons');
    for (let i = 0; i < n; i++) { const ln = stroke(s, pts.slice(i * 3, i * 3 + 3), str(o, 'color', '') || c.ink, Math.max(2.5, c.s * 0.07)); drawOn(ln, z * 3, 60, 140 - i * 30, 200, c.delay + i * 60); }
  },
  /** A ring at the target (at: 'b') or the attacker (at: 'a'), from → to scale. */
  ring(c, o) {
    const p = str(o, 'at', 'b') === 'a' ? c.a : c.b; if (!p) return;
    const r = p.s * num(o, 'r', 0.6) * c.scale;
    const { s, box } = stage([{ x: p.x - r, y: p.y - r }, { x: p.x + r, y: p.y + r }], 6, 520 + c.delay, 'ring');
    s.appendChild(el('circle', { cx: f1(p.x), cy: f1(p.y), r: f1(r), fill: 'none', stroke: str(o, 'color', '') || c.ink, 'stroke-width': f1(Math.max(2, p.s * num(o, 'w', 0.06))), ...(o.dash ? { 'stroke-dasharray': String(o.dash) } : {}) }));
    popBox(box, 500, c.delay, num(o, 'from', 1.5), num(o, 'to', 1));
  },
  /** The guard raised on the attacker's front: an arc facing the target side (a parry, a raised shield, an Interpose). */
  guard(c, o) {
    const p = c.a; if (!p) return;
    const r = p.s * num(o, 'r', 0.62), half = (num(o, 'span', 100) * Math.PI) / 360, pts = arcPts(p, r, angOf(c.dir) - half, angOf(c.dir) + half, 14);
    const { s, box } = stage(pts, 8, 560 + c.delay, 'guard');
    stroke(s, pts, str(o, 'color', '') || c.ink, Math.max(3, p.s * num(o, 'w', 0.11)));
    if (o.double) stroke(s, arcPts(p, r * 1.2, angOf(c.dir) - half * 0.8, angOf(c.dir) + half * 0.8, 12), str(o, 'color', '') || c.ink, Math.max(1.5, p.s * 0.04));
    popBox(box, 540, c.delay, 0.7, 1);
  },
  /** The weapon's own monoline icon striking along the attack (move: swing | chop | thrust | slam), in the ink. A weapon
   *  with no icon falls back to a short blade bar. Sunder's attack: the weapon bites, then its shield-break follows. */
  weapon(c, o) {
    if (!c.a) return;
    const size = c.s * num(o, 'size', 0.8) * c.scale, ink = str(o, 'color', '') || c.ink, move = str(o, 'move', 'swing');
    const node: HTMLElement = c.weapon && hasGearIcon(c.weapon) ? (() => { const i = document.createElement('img'); i.src = gearIconUri(c.weapon, ink); i.alt = ''; i.style.cssText = 'width:100%;height:100%;display:block;filter:' + CASING; return i; })()
      : (() => { const d = document.createElement('div'); d.style.cssText = 'width:100%;height:' + Math.max(3, size * 0.1) + 'px;margin-top:' + size * 0.45 + 'px;background:' + ink + ';border-radius:2px;box-shadow:0 0 3px #000'; return d; })();
    const hit = nearSide(c, 0.45), base = (angOf(c.dir) * 180) / Math.PI, back = add(hit, c.dir, -c.s * 0.55);
    const box = put(node, hit, size, size, 520 + c.delay); box.setAttribute('data-tech-fx', 'weapon'); box.style.zIndex = '3';
    const T = (p: XY, deg: number, k = 1) => 'translate(' + f1(p.x - hit.x) + 'px,' + f1(p.y - hit.y) + 'px) rotate(' + f1(deg) + 'deg) scale(' + k + ')';
    const frames: Keyframe[] = rm() ? [{ transform: T(hit, base + 45), opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }]
      : move === 'thrust' ? [{ transform: T(back, base + 45, 0.9), opacity: 0 }, { transform: T(back, base + 45, 0.9), opacity: 1, offset: 0.15 }, { transform: T(add(hit, c.dir, c.s * 0.2), base + 45), opacity: 1, offset: 0.4 }, { transform: T(hit, base + 45), opacity: 1, offset: 0.7 }, { opacity: 0 }]
        : move === 'chop' || move === 'slam' ? [{ transform: T({ x: hit.x, y: hit.y - c.s * 0.7 }, base - 40, 0.9), opacity: 0 }, { transform: T({ x: hit.x, y: hit.y - c.s * 0.7 }, base - 40, 0.9), opacity: 1, offset: 0.15 }, { transform: T(hit, base + 70, move === 'slam' ? 1.1 : 1), opacity: 1, offset: 0.4 }, { transform: T(hit, base + 76), opacity: 1, offset: 0.7 }, { opacity: 0 }]
          : [{ transform: T(back, base - 50, 0.9), opacity: 0 }, { transform: T(back, base - 50, 0.9), opacity: 1, offset: 0.12 }, { transform: T(hit, base + 80), opacity: 1, offset: 0.42 }, { transform: T(hit, base + 90), opacity: 1, offset: 0.7 }, { opacity: 0 }];
    anim(box, frames, { duration: 520, delay: c.delay, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'both' });
  },
  /** Dashes beside the attacker along a step (a sidestep, a shift, a storm), length in tiles. */
  dashes(c, o) {
    const p = c.a; if (!p) return;
    const nn = nrm(c.dir), side = num(o, 'side', 1);
    for (let i = 0; i < 3; i++) {
      const st = add(add(p, nn, side * p.s * (0.3 + i * 0.12)), c.dir, -p.s * 0.4), end = add(st, c.dir, p.s * num(o, 'len', 0.6));
      const { s } = stage([st, end], 6, 360 + c.delay + i * 40, 'dashes');
      drawOn(stroke(s, [st, end], str(o, 'color', '') || c.ink, 2), p.s * 0.6, 80, 60, 180, c.delay + i * 40);
    }
  },

  // ===== results on the target =====
  /** A cut mark across the target (an X, or one diagonal with n: 1). */
  cross(c, o) {
    const z = c.s * num(o, 'size', 0.26) * c.scale, n = num(o, 'n', 2), ink = str(o, 'color', '') || c.ink;
    const { s } = stage([{ x: c.b.x - z, y: c.b.y - z }, { x: c.b.x + z, y: c.b.y + z }], 6, 460 + c.delay, 'cross');
    const lines = [[{ x: c.b.x - z, y: c.b.y - z }, { x: c.b.x + z, y: c.b.y + z }], [{ x: c.b.x + z, y: c.b.y - z }, { x: c.b.x - z, y: c.b.y + z }]].slice(0, Math.max(1, n));
    lines.forEach((pts, i) => drawOn(stroke(s, pts, ink, Math.max(2.5, c.s * 0.08 * c.scale)), z * 2.9, 60, 140, 220, c.delay + i * 50));
  },
  /** Tick marks dripping or flaking off the target over a beat (bleed, corrode, burn: color and fall). */
  drops(c, o) {
    const n = Math.max(1, num(o, 'n', 3)), ink = str(o, 'color', '') || HP, fall = c.s * num(o, 'fall', 0.35);
    for (let i = 0; i < n; i++) {
      const x = c.b.x + (i - (n - 1) / 2) * c.s * 0.2, y = c.b.y + c.s * 0.05 + (i % 2) * c.s * 0.08;
      const { s, box } = stage([{ x, y }, { x, y: y + fall + c.s * 0.15 }], 6, 520 + c.delay + i * 70, 'drops');
      stroke(s, [{ x, y }, { x, y: y + c.s * 0.13 }], ink, Math.max(2, c.s * 0.05));
      anim(box, rm() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translateY(' + f1(fall) + 'px)', opacity: 0 }], { duration: 480, delay: c.delay + i * 70, easing: 'ease-in', fill: 'both' });
    }
  },
  /** A crit's starburst: radial lines flaring out from the target. n: lines. */
  star(c, o) {
    const n = Math.max(4, num(o, 'n', 8)), r0 = c.s * 0.45, r1 = c.s * 0.85 * c.scale;
    const pts: XY[][] = Array.from({ length: n }, (_, i) => { const a = (i * 2 * Math.PI) / n + 0.2; return [{ x: c.b.x + Math.cos(a) * r0, y: c.b.y + Math.sin(a) * r0 }, { x: c.b.x + Math.cos(a) * r1, y: c.b.y + Math.sin(a) * r1 }]; });
    const { s, box } = stage(pts.flat(), 6, 440 + c.delay, 'star');
    for (const p of pts) stroke(s, p, str(o, 'color', '') || WHITE, Math.max(2, c.s * 0.05));
    popBox(box, 420, c.delay, 0.5, 1.15);
  },
  /** A miss in melee: the stroke carries on past the target, muted and dashed, with a swish tick beyond it. */
  whiff(c, o) {
    const nn = nrm(c.dir), side = num(o, 'side', 1) * c.s * 0.48, from = add(add(c.b, c.dir, -c.s * 0.5), nn, side), end = add(add(c.b, c.dir, c.s * 0.7), nn, side * 1.25);
    const ctl = add(c.b, nn, side * 0.7);
    const pts = [from, add(ctl, c.dir, -c.s * 0.1), ctl, end];
    const { s } = stage(pts, 8, 480 + c.delay, 'whiff');
    drawOn(stroke(s, pts, MUTED, Math.max(2, c.s * 0.06), { dash: '5 4' }), lenOf(pts), 110, 80, 220, c.delay);
    for (let i = 0; i < 2; i++) { const t0 = add(end, nn, (i ? 1 : -1) * c.s * 0.06), t1 = add(t0, c.dir, c.s * 0.22); drawOn(stroke(s, [t0, t1], MUTED, 2), c.s * 0.22, 50, 60, 160, c.delay + 110 + i * 30); }
  },
  /** A miss turned aside: a short bounce tick off the target's near side and two sparks of line (a block, a dodge). */
  deflect(c, o) {
    const nn = nrm(c.dir), p = nearSide(c, 0.42), k = num(o, 'side', 1);
    const out = add(add(p, c.dir, -c.s * 0.25), nn, k * c.s * 0.35);
    const { s } = stage([p, out, add(p, nn, -k * c.s * 0.2)], 8, 440 + c.delay, 'deflect');
    drawOn(stroke(s, [p, out], MUTED, Math.max(2, c.s * 0.06)), c.s * 0.45, 70, 90, 200, c.delay);
    for (const g of [-0.6, 0.6]) { const d = rot(nn, g), q = add(p, d, -k * c.s * 0.18); drawOn(stroke(s, [p, q], WHITE, 1.6), c.s * 0.18, 40, 60, 160, c.delay + 30); }
  },
  /** A miss at range: a muted tick where the round went past and a short dash of dust behind the target. */
  wide(c, o) {
    const nn = nrm(c.dir), side = num(o, 'side', 1) * c.s * 0.55, p = add(add(c.b, c.dir, c.s * 0.75), nn, side);
    const { s } = stage([add(p, c.dir, -c.s * 0.3), add(p, c.dir, c.s * 0.25)], 8, 420 + c.delay, 'wide');
    drawOn(stroke(s, [add(p, c.dir, -c.s * 0.3), add(p, c.dir, c.s * 0.2)], MUTED, 2, { dash: '4 3' }), c.s * 0.5, 80, 80, 200, c.delay);
    const q = add(p, c.dir, c.s * 0.25); drawOn(stroke(s, [add(q, nn, -c.s * 0.1), add(q, nn, c.s * 0.1)], MUTED, Math.max(2, c.s * 0.06)), c.s * 0.2, 40, 120, 200, c.delay + 70);
  },
  /** Pips over the target, lit one by one in time with each strike (a multi-hit's count). */
  pips(c, o) {
    const n = Math.max(1, Math.min(6, Number(c.strikes) || num(o, 'n', 2))), gap = num(o, 'gap', 70), z = c.s * 0.07, y = c.b.y - c.s * 0.78;
    const xs = Array.from({ length: n }, (_, i) => c.b.x + (i - (n - 1) / 2) * z * 3);
    const { s } = stage(xs.map((x) => ({ x, y })), z * 2 + 4, 520 + c.delay + n * gap, 'pips');
    xs.forEach((x, i) => { const d = el('circle', { cx: f1(x), cy: f1(y), r: f1(z), fill: c.outcome === 'miss' ? MUTED : str(o, 'color', '') || c.ink, opacity: 0 }); s.appendChild(d); anim(d, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 480, delay: c.delay + i * gap, fill: 'both' }); });
  },
  /** Corner brackets closing on the target (a lock, a set-up, a held target). */
  bracket(c, o) {
    const r = c.s * num(o, 'r', 0.5), l = c.s * 0.16, ink = str(o, 'color', '') || c.ink;
    const { s, box } = stage([{ x: c.b.x - r, y: c.b.y - r }, { x: c.b.x + r, y: c.b.y + r }], 6, 560 + c.delay, 'bracket');
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const cx = c.b.x + sx * r, cy = c.b.y + sy * r; stroke(s, [{ x: cx - sx * l, y: cy }, { x: cx, y: cy }, { x: cx, y: cy - sy * l }], ink, Math.max(2, c.s * 0.05), { cap: 'square' }); }
    popBox(box, 540, c.delay, 1.5, 1);
  },
  /** A crack running into the target from the struck side (a heavy blow that breaks something: armour, a guard). */
  crack(c, o) {
    const n = Math.max(1, num(o, 'n', 3)), ink = str(o, 'color', '') || WHITE;
    for (let i = 0; i < n; i++) {
      const a = angOf(c.dir) + (i - (n - 1) / 2) * 0.55, pts: XY[] = [nearSide(c, 0.3)]; let r = 0;
      for (let k = 1; k <= 3; k++) { r += c.s * 0.14 * c.scale; const j = (k % 2 ? 1 : -1) * 0.35; pts.push({ x: pts[0].x + Math.cos(a + j) * r, y: pts[0].y + Math.sin(a + j) * r }); }
      const { s } = stage(pts, 6, 520 + c.delay, 'crack');
      drawOn(stroke(s, pts, ink, Math.max(2, c.s * 0.045)), lenOf(pts), 90, 160, 240, c.delay + i * 30);
    }
  },
};
export const PART_NAMES = Object.keys(PARTS);

/** Play one part, never throwing (a missing point, a bad parameter: nothing drawn). */
export function playPart(name: string, c: PartCtx, o: PartParams = {}): boolean {
  const f = PARTS[name]; if (!f) return false;
  try { f(c, o); } catch { /* a part never breaks the queue */ }
  return true;
}
