// The effects layer's drawing kit: find a tile or token on screen from a grid key, put sprites, text and SVG over it,
// animate them with the Web Animations API, and clean every node up. Nothing here reads or changes game state, and
// nothing here touches the React-managed DOM except through animations (which leave its attributes alone).
import { refOf } from '@engine';
import { reducedMotion } from '../sfx';

let layer: HTMLDivElement | null = null;
export const setLayer = (el: HTMLDivElement | null) => { layer = el; };
export const hasLayer = () => !!layer && layer.isConnected;
/** The layer node itself (the ambient field and turret looks keep their own nodes on it). */
export const layerEl = () => layer;

// ---------- later steps ----------
/** Bumped by play.ts's clearFx: a handler's own later step (an impact after the flight time, a volley's tracers) is
 *  dropped when the queue is cleared meanwhile (the room was left, the tab hidden, a new game loaded). */
let gen = 0;
export const bumpGen = () => { gen++; };
// ---------- tempo (the spotlight cut-in's slowed action, decision 110) ----------
/** The playback tempo: 1 normally; 0.85 while an action after a spotlight cut-in plays (every duration and delay drawn
 *  here is divided by it). Set around one event's handler by play.ts (withTempo); later steps keep the tempo they were
 *  scheduled under. */
let tempo = 1;
export const fxTempo = () => tempo;
/** Run f with this tempo (its own later steps, scheduled with after(), keep it). */
export function withTempo<T>(tp: number, f: () => T): T { const was = tempo; tempo = tp > 0 ? tp : 1; try { return f(); } finally { tempo = was; } }
/** ms at the current tempo. */
export const slow = (ms: number) => (tempo === 1 ? ms : ms / tempo);
/** Run f after ms, unless the effects were cleared meanwhile. The wait follows the tempo, and f runs under it. */
export const after = (f: () => void, ms: number) => { const g0 = gen, tp = tempo; setTimeout(() => { if (g0 === gen) withTempo(tp, f); }, tp === 1 ? ms : ms / tp); };

// ---------- finding tiles and tokens ----------
/** The on-screen tile for a grid key ("x,y"): a button.phc-tok whose aria-label starts with its reference ("C7 · …" or
 *  "C7: …"). Where a map shows twice (the minimap and the area map), the biggest visible one wins. */
const tileCache = new Map<string, { el: HTMLElement; at: number }>();
export function tileEl(key: string | null | undefined): HTMLElement | null {
  if (!key || !/^\d+,\d+$/.test(key)) return null;
  const ref = refOf(key), hit = tileCache.get(key), now = performance.now();
  // A found tile is good for a moment (the anchored effects ask every frame); a re-render or a scroll re-finds it.
  if (hit && now - hit.at < 250 && hit.el.isConnected) return hit.el;
  const el = findTile(ref);
  if (el) tileCache.set(key, { el, at: now }); else tileCache.delete(key);
  return el;
}
function findTile(ref: string): HTMLElement | null {
  let best: HTMLElement | null = null, area = 0;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('button.phc-tok[aria-label]'))) {
    const l = el.getAttribute('aria-label') || '';
    if (!l.startsWith(ref) || /[0-9A-Za-z]/.test(l.charAt(ref.length))) continue;
    const r = el.getBoundingClientRect(), a = r.width * r.height;
    if (a > area && r.bottom > 0 && r.top < innerHeight) { area = a; best = el; }
  }
  return best;
}
/** Is any map grid on screen at all? */
export const gridShown = () => !!document.querySelector('button.phc-tok[aria-label]');
/** The token inside a tile (the combat portrait <img>, or the area map's round token <span>), else the tile itself. */
export function tokenEl(tile: HTMLElement | null): HTMLElement | null {
  if (!tile) return null;
  for (const c of Array.from(tile.children) as HTMLElement[]) {
    const st = c.getAttribute('style') || '';
    if (/z-index:\s*2(\D|$)/.test(st) && (c.tagName === 'IMG' || /inset:\s*6%/.test(st))) return c;
  }
  return null;
}
export interface Pt { x: number; y: number; s: number }
/** The centre of a tile on screen and its size, in viewport pixels. */
export function centre(key: string | null | undefined): Pt | null {
  const el = tileEl(key); if (!el) return null;
  const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.max(18, r.width) };
}
export const angle = (a: Pt, b: Pt) => Math.atan2(b.y - a.y, b.x - a.x);
export const panOf = (p: Pt | null) => (p ? Math.max(-0.7, Math.min(0.7, (p.x / Math.max(1, innerWidth)) * 1.4 - 0.7)) : 0);

// ---------- nodes ----------
/** Put a node on the layer at a viewport point (its centre), for ms; it is removed after, whatever happens. */
export function put(el: HTMLElement | SVGElement, p: { x: number; y: number }, w: number, h: number, ms: number): HTMLElement {
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:' + (p.x - w / 2) + 'px;top:' + (p.y - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px;pointer-events:none;will-change:transform,opacity';
  box.appendChild(el);
  if (!layer) return box;
  layer.appendChild(box);
  setTimeout(() => box.remove(), slow(ms) + 60);
  return box;
}
/** A sprite from public/fx. White sprites (.png) can take any colour through a mask; colour sprites (.webp) show as they are. */
export function sprite(name: string, color?: string): HTMLElement {
  const url = '/fx/' + name + (/^(boom|fireflash|smoke_black|puff)/.test(name) ? '.webp' : '.png');
  if (!color) { const i = document.createElement('img'); i.src = url; i.alt = ''; i.style.cssText = 'width:100%;height:100%;display:block'; return i; }
  const d = document.createElement('div');
  const m = 'url("' + url + '") center / contain no-repeat';
  d.style.cssText = 'width:100%;height:100%;background:' + color + ';-webkit-mask:' + m + ';mask:' + m;
  return d;
}
/** Animate a node; returns the animation (or null where the browser has none). Errors never escape. */
export function anim(el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Animation | null {
  if (tempo !== 1) opts = { ...opts, ...(typeof opts.duration === 'number' ? { duration: opts.duration / tempo } : {}), ...(opts.delay ? { delay: opts.delay / tempo } : {}) };
  try { return (el as any).animate ? el.animate(frames, opts) : null; } catch { return null; }
}
/** A sprite burst at a point: scale from a to b and fade, rotated. */
export function burst(name: string, p: { x: number; y: number }, size: number, ms: number, o: { color?: string; rot?: number; from?: number; to?: number; fade?: number; blend?: string; delay?: number } = {}) {
  const run = () => {
    const el = sprite(name, o.color), box = put(el, p, size, size, ms);
    if (o.blend) box.style.mixBlendMode = o.blend;
    const r = (o.rot || 0) + 'deg', from = o.from ?? 0.4, to = o.to ?? 1.2;
    anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'rotate(' + r + ') scale(' + from + ')', opacity: 1 }, { transform: 'rotate(' + r + ') scale(' + to + ')', opacity: o.fade ?? 0 }], { duration: ms, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
  };
  if (o.delay) after(run, o.delay); else run();
}
/** The centre x of a box of width w kept inside lo..hi (it shifts inward near an edge; centred when it can't fit). */
export function clampCentre(x: number, w: number, lo: number, hi: number): number {
  if (hi - lo <= w) return (lo + hi) / 2;
  return Math.max(lo + w / 2, Math.min(hi - w / 2, x));
}
/** Floating text over a point: damage numbers, MISS, a condition. */
export function floatText(text: string, p: { x: number; y: number; s: number }, color: string, o: { big?: boolean; delay?: number; ms?: number; small?: boolean } = {}) {
  const run = () => {
    const t = document.createElement('div'), fs = o.big ? Math.round(p.s * 0.62) : o.small ? Math.max(10, Math.round(p.s * 0.26)) : Math.round(p.s * 0.42);
    t.textContent = text;
    t.style.cssText = "font-family:'Chakra Petch',sans-serif;font-weight:700;white-space:nowrap;text-align:center;line-height:1;letter-spacing:.04em;font-size:" + fs + 'px;color:' + color +
      ';text-shadow:0 0 3px #000,0 2px 0 #000,0 0 10px rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;width:100%;height:100%';
    const ms = o.ms || (o.big ? 1300 : 1000), box = put(t, { x: p.x, y: p.y - p.s * 0.35 }, p.s * 3, fs * 1.4, ms);
    box.style.zIndex = '3';
    // A long float near an edge of the layer shifts inward, so its words are never cut off (the text is measured once
    // it is on the layer; the box widens to fit it).
    const room = layer?.clientWidth || (typeof innerWidth === 'number' ? innerWidth : 0), need = Math.max(p.s * 3, (t.scrollWidth || 0) + 8);
    if (room > 0) { box.style.width = need + 'px'; box.style.left = (clampCentre(p.x, need, 4, room - 4) - need / 2) + 'px'; }
    anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }]
      : [{ transform: 'translateY(6px) scale(' + (o.big ? 1.8 : 0.7) + ')', opacity: 0 }, { transform: 'translateY(-4px) scale(1)', opacity: 1, offset: 0.15 }, { transform: 'translateY(-' + p.s * 0.5 + 'px) scale(1)', opacity: 1, offset: 0.7 }, { transform: 'translateY(-' + p.s * 0.8 + 'px) scale(.95)', opacity: 0 }],
      { duration: ms, easing: 'ease-out', fill: 'forwards' });
  };
  if (o.delay) after(run, o.delay); else run();
}

/** One small particle at a point: a box of size px styled by css, animated through frames over ms (after delay). */
export function particle(p: { x: number; y: number }, size: number, css: string, frames: Keyframe[], ms: number, delay = 0, easing = 'ease-out') {
  const run = () => { const d = document.createElement('div'); d.style.cssText = 'width:100%;height:100%;' + css; const box = put(d, p, size, size, ms); anim(box, frames, { duration: ms, easing, fill: 'forwards' }); };
  if (delay) after(run, delay); else run();
}

// ---------- effects that follow a tile (rings, decals) ----------
interface Anchored { box: HTMLElement; key: string; until: number; dy: number }
const anchored: Anchored[] = [];
let raf = 0;
function track() {
  raf = 0;
  const now = performance.now();
  for (let i = anchored.length - 1; i >= 0; i--) {
    const a = anchored[i];
    if (now > a.until || !a.box.isConnected) { anchored.splice(i, 1); continue; }
    const p = centre(a.key);
    if (!p) { a.box.style.opacity = '0'; continue; }
    a.box.style.left = (p.x - a.box.offsetWidth / 2) + 'px'; a.box.style.top = (p.y + a.dy * p.s - a.box.offsetHeight / 2) + 'px';
  }
  if (anchored.length) raf = requestAnimationFrame(track);
}
/** Keep a node centred over a tile (dy in tiles) while it lives, so it follows scrolling and re-layouts. */
export function anchor(box: HTMLElement, key: string, ms: number, dy = 0) {
  anchored.push({ box, key, until: performance.now() + ms, dy });
  if (!raf) raf = requestAnimationFrame(track);
}

// ---------- tokens ----------
/** Shake a token (or a tile) with the individual translate property, so the template's own transform stays put. */
export function shake(el: HTMLElement | null, power = 1) {
  if (!el || reducedMotion()) return;
  const a = Math.round(3 + 3 * power), f: Keyframe[] = [];
  for (let i = 0; i < 7; i++) f.push({ translate: (i % 2 ? -a : a) * (1 - i / 7) + 'px ' + (i % 3 - 1) * a * 0.4 + 'px' });
  f.push({ translate: '0 0' });
  anim(el, f, { duration: 320 + 80 * power, easing: 'linear' });
}
/** A red (or any) flash on a token: brightness and tint, then back. */
export function flash(el: HTMLElement | null, kind: 'hurt' | 'heal' | 'white' | 'magic' | 'soul' = 'hurt') {
  if (!el) return;
  const f = kind === 'heal' ? 'brightness(1.5) sepia(1) saturate(4) hue-rotate(60deg)' : kind === 'white' ? 'brightness(2.6) saturate(0)' : kind === 'magic' ? 'brightness(1.6) sepia(1) saturate(4) hue-rotate(140deg)' : kind === 'soul' ? 'brightness(1.5) sepia(1) saturate(4) hue-rotate(210deg)' : 'brightness(1.7) sepia(1) saturate(7) hue-rotate(-35deg)';
  anim(el, [{ filter: 'none' }, { filter: f, offset: 0.2 }, { filter: 'none' }], { duration: 300, easing: 'ease-out' });
}
/** The screen jolts (crits, explosions). Off under reduced motion. */
export function shakeScreen(power = 1) {
  if (reducedMotion()) return;
  const root = document.querySelector('#root > div') as HTMLElement | null; if (!root) return;
  const a = 3 + 5 * power, f: Keyframe[] = [];
  for (let i = 0; i < 8; i++) f.push({ translate: ((i % 2 ? -1 : 1) * a * (1 - i / 8)).toFixed(1) + 'px ' + (((i * 7) % 3) - 1) * a * 0.6 * (1 - i / 8) + 'px' });
  f.push({ translate: '0 0' });
  anim(root, f, { duration: 280 + 120 * power, easing: 'linear' });
}
/** A full-screen tint for a beat (a Mana Short's grey, an overload's red edge). */
export function screenTint(kind: 'grey' | 'red' | 'white', ms = 500) {
  if (!layer) return;
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;pointer-events:none;' + (kind === 'grey' ? 'backdrop-filter:grayscale(1) brightness(.75);-webkit-backdrop-filter:grayscale(1) brightness(.75)' : kind === 'red' ? 'box-shadow:inset 0 0 80px 20px rgba(246,81,87,.75)' : 'background:rgba(255,255,255,.55)');
  layer.appendChild(d);
  anim(d, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
  setTimeout(() => d.remove(), slow(ms) + 60);
}
/** The screen's edge throbs in a colour (a heart at stage 4, Strain over the limit): an inset glow that beats twice.
 *  Under reduced motion it shows once, without the beat. */
export function edgePulse(color: string, ms = 800, strength = 1) {
  if (!layer) return;
  const d = document.createElement('div'), px = Math.round(60 + 50 * strength);
  d.style.cssText = 'position:fixed;inset:0;pointer-events:none;box-shadow:inset 0 0 ' + px + 'px ' + Math.round(px * 0.3) + 'px ' + color;
  layer.appendChild(d);
  anim(d, reducedMotion() ? [{ opacity: 0 }, { opacity: 0.6, offset: 0.3 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 0.9, offset: 0.12 }, { opacity: 0.25, offset: 0.3 }, { opacity: 0.75, offset: 0.45 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  setTimeout(() => d.remove(), slow(ms) + 60);
}
/** A move: a copy of the token walks the path while the real one (already at the end) is hidden. */
export function walk(path: string[], destTokenKey: string, msPerTile: number): number {
  const pts = path.map((k) => centre(k)).filter(Boolean) as Pt[];
  const tok = tokenEl(tileEl(destTokenKey));
  if (pts.length < 2 || !tok || reducedMotion()) return 0;
  const r = tok.getBoundingClientRect(), ghost = tok.cloneNode(true) as HTMLElement;
  ghost.style.position = 'static'; ghost.style.inset = ''; ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px'; ghost.style.margin = '0'; ghost.style.boxShadow = 'none';
  const ms = msPerTile * (pts.length - 1), last = pts[pts.length - 1];
  const box = put(ghost, last, r.width, r.height, ms);
  box.style.display = 'grid'; box.style.placeItems = 'center';
  anim(box, pts.map((p, i) => ({ transform: 'translate(' + (p.x - last.x) + 'px,' + (p.y - last.y) + 'px) translateY(' + (i % 2 ? -3 : 0) + 'px)' })), { duration: ms, easing: 'linear', fill: 'forwards' });
  anim(tok, [{ opacity: 0 }, { opacity: 0 }], { duration: ms });
  return ms;
}
/** Slide a token from where it was to where it is now (a shove, a knockback). */
export function slideFrom(fromKey: string, toKey: string, ms = 220) {
  const a = centre(fromKey), b = centre(toKey), tok = tokenEl(tileEl(toKey));
  if (!a || !b || !tok || reducedMotion()) return;
  anim(tok, [{ translate: (a.x - b.x) + 'px ' + (a.y - b.y) + 'px' }, { translate: '0 0' }], { duration: ms, easing: 'cubic-bezier(.2,.9,.3,1)' });
}
/** A short lunge toward a point and back (melee), or a kick back (recoil). */
export function lunge(el: HTMLElement | null, dx: number, dy: number, ms = 220) {
  if (!el || reducedMotion()) return;
  anim(el, [{ translate: '0 0' }, { translate: dx + 'px ' + dy + 'px', offset: 0.35 }, { translate: '0 0' }], { duration: ms, easing: 'ease-out' });
}

// ---------- SVG bits (rings, glyph strokes, reticles) ----------
const NS = 'http://www.w3.org/2000/svg';
export function svg(w: number, h: number, inner: string): SVGSVGElement {
  const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 ' + w + ' ' + h); s.setAttribute('width', '100%'); s.setAttribute('height', '100%'); s.style.overflow = 'visible';
  s.innerHTML = inner; return s;
}
/** The action timer: a ring above a unit that runs down over ms (a reload, a jam, a repair), with a word under it. */
export function timerRing(key: string, ms: number, color: string, label: string) {
  const p = centre(key); if (!p || !layer) return;
  const size = Math.max(40, Math.min(66, p.s * 1.1)), C = 2 * Math.PI * 15;
  const s = svg(40, 52, '<circle cx="20" cy="20" r="18" fill="rgba(10,13,19,.82)" stroke="#232D3F" stroke-width="1"/><circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="4"/>'
    + '<circle class="run" cx="20" cy="20" r="15" fill="none" stroke="' + color + '" stroke-width="4" stroke-linecap="round" transform="rotate(-90 20 20)" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="0"/>'
    + '<text x="20" y="24.5" text-anchor="middle" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="11" fill="#FFFFFF" class="sec"></text>'
    + '<text x="20" y="50" text-anchor="middle" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="8" letter-spacing="1" fill="' + color + '" stroke="#0A0D13" stroke-width="2.5" paint-order="stroke">' + label + '</text>');
  const box = put(s, { x: p.x, y: p.y - p.s * 1.05 }, size, size * 1.3, ms + 250);
  anchor(box, key, ms + 250, -1.05);
  const run = s.querySelector('.run') as SVGCircleElement, sec = s.querySelector('.sec') as SVGTextElement;
  anim(run, [{ strokeDashoffset: 0 }, { strokeDashoffset: C }], { duration: ms, easing: 'linear', fill: 'forwards' });
  anim(box, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.08 }, { transform: 'scale(1)', opacity: 1, offset: 0.85 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: ms + 250, fill: 'forwards' });
  const t0 = performance.now();
  const tick = () => { const left = Math.max(0, ms - (performance.now() - t0)); sec.textContent = (left / 1000).toFixed(1); if (left > 0 && box.isConnected) setTimeout(tick, 100); else sec.textContent = '✓'; };
  tick();
}
/** A pulse ring from a tile (turn start, heartbeat, a shield). */
export function ring(p: Pt, color: string, ms = 600, o: { from?: number; to?: number; width?: number; delay?: number } = {}) {
  const run = () => {
    const s = svg(100, 100, '<circle cx="50" cy="50" r="40" fill="none" stroke="' + color + '" stroke-width="' + (o.width ?? 5) + '"/>');
    const box = put(s, p, p.s * 1.6, p.s * 1.6, ms);
    anim(box, [{ transform: 'scale(' + (o.from ?? 0.5) + ')', opacity: 0.95 }, { transform: 'scale(' + (o.to ?? 1.3) + ')', opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  };
  if (o.delay) after(run, o.delay); else run();
}
