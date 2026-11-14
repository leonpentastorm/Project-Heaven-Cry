// The effects layer's drawing kit: find a tile or token on screen from a grid key, put sprites, text and SVG over it,
// animate them with the Web Animations API, and clean every node up. Nothing here reads or changes game state, and
// nothing here touches the React-managed DOM except through animations (which leave its attributes alone).
import { refOf } from '@engine';
import { reducedMotion } from '../sfx';
import { battlePace } from '../combatSpeed';

let layer: HTMLDivElement | null = null;
export const setLayer = (el: HTMLDivElement | null) => { layer = el; applyClip(); };
// ---------- the camera (game/cameraView.ts) ----------
// Everything on the layer is placed in viewport pixels over the map. When the map scrolls under it (the camera glides,
// the player drags), what is already drawn moves with the map: every absolutely placed box shifts by the scroll. Boxes
// that follow a tile each frame (anchor, the standing looks, the reload card) place themselves again anyway, and the
// full-screen ones (position: fixed) stay. And the layer is clipped to the map's window, so an effect on a tile that
// is off screen never draws over the panels beside the map.
/** The map scrolled by (dx, dy) px: move what is drawn with it. */
export function shiftLayer(dx: number, dy: number) {
  tileCache.clear();
  scrolled.x += dx; scrolled.y += dy;
  for (const f of floats) { f.l -= dx; f.r -= dx; f.y -= dy; }
  if (!layer || (!dx && !dy)) return;
  for (const el of Array.from(layer.children) as HTMLElement[]) {
    const st = el.style; if (!st || st.position !== 'absolute') continue;
    const l = parseFloat(st.left), t = parseFloat(st.top);
    if (Number.isFinite(l)) st.left = (l - dx) + 'px';
    if (Number.isFinite(t)) st.top = (t - dy) + 'px';
  }
}
/** How far the map has scrolled in all (the camera). A point found with centre() carries the figure of that moment,
 *  so a step that draws at it later (a wound's number 150 ms after the hit, an impact after the flight) lands on the
 *  tile where it is by then, not where it was before the camera moved (liveAt). */
const scrolled = { x: 0, y: 0 };
/** A point as it is on screen now: one found with centre() before the map scrolled is moved with the map. A point
 *  built by hand (no stamp) is taken as it is. */
export function liveAt<T extends { x: number; y: number }>(p: T): T {
  const q = p as T & { _sx?: number; _sy?: number };
  if (typeof q._sx !== 'number' || typeof q._sy !== 'number' || (q._sx === scrolled.x && q._sy === scrolled.y)) return p;
  return { ...p, x: p.x - (scrolled.x - q._sx), y: p.y - (scrolled.y - q._sy), _sx: scrolled.x, _sy: scrolled.y };
}
let clip: { left: number; top: number; right: number; bottom: number } | null = null;
function applyClip() {
  if (!layer) return;
  const W = typeof innerWidth === 'number' ? innerWidth : 0, H = typeof innerHeight === 'number' ? innerHeight : 0;
  const v = clip ? 'inset(' + Math.max(0, Math.round(clip.top)) + 'px ' + Math.max(0, Math.round(W - clip.right)) + 'px ' + Math.max(0, Math.round(H - clip.bottom)) + 'px ' + Math.max(0, Math.round(clip.left)) + 'px)' : '';
  if (layer.style.clipPath !== v) layer.style.clipPath = v;
}
/** Clip the layer to the map's window (viewport pixels), or lift the clip (null: no camera on screen). */
export function setLayerClip(r: { left: number; top: number; right: number; bottom: number } | null) { clip = r; applyClip(); }
export const hasLayer = () => !!layer && layer.isConnected;
/** The layer node itself (the ambient field and turret looks keep their own nodes on it). */
export const layerEl = () => layer;

// ---------- later steps ----------
/** Bumped by play.ts's clearFx: a handler's own later step (an impact after the flight time, a volley's tracers) is
 *  dropped when the queue is cleared meanwhile (the room was left, the tab hidden, a new game loaded). */
let gen = 0;
export const bumpGen = () => { gen++; };
// ---------- tempo (the combat speed, and the spotlight cut-in's slowed action, decision 113) ----------
/** The spotlight tempo: 1 normally; 0.85 while an action after a spotlight cut-in plays (every duration and delay drawn
 *  here is divided by it, and one-shot sounds play at its rate). Set around one event's handler by play.ts (withTempo);
 *  later steps keep the tempo they were scheduled under. */
let tempo = 1;
export const fxTempo = () => tempo;
/** The combat speed's multiplier (game/combatSpeed.ts: Normal ≈ 1.176, Fast 1; 1 outside a fight). */
export const fxPace = () => battlePace();
/** Everything together: how much longer than its written length a duration or delay drawn now plays (pace ÷ tempo;
 *  the spotlight's slow-mo stacks on the combat speed). */
export const fxScale = () => battlePace() / tempo;
/** Run f with this tempo (its own later steps, scheduled with after(), keep it). */
export function withTempo<T>(tp: number, f: () => T): T { const was = tempo; tempo = tp > 0 ? tp : 1; try { return f(); } finally { tempo = was; } }
/** ms at the current pace and tempo. */
export const slow = (ms: number) => { const k = fxScale(); return k === 1 ? ms : ms * k; };
/** Run f after ms, unless the effects were cleared meanwhile. The wait follows the pace and tempo, and f runs under the
 *  same tempo. */
export const after = (f: () => void, ms: number) => { const g0 = gen, tp = tempo, n = cur, d = slow(ms), due = clock == null ? null : clock + d; setTimeout(() => { if (g0 === gen) withEvent(n, () => withTempo(tp, f), due); }, d); };

// ---------- the trace (apps/web/e2e/fx-sweep.mjs) ----------
// What was drawn and heard, and when: a test sets window.__phcFxTrace = [] and reads it back. Each entry is
// { w: what ('ev' an event's handler started, 'proj' a projectile and its flight time, 'muzzle', 'boom', 'impact',
// 'swing', 'throw', 'burst' a sprite, 'float' a floating word or number, 'sfx' a sound, 'hp' the HP bars took an event's
// change), n: the engine event it belongs to, t: when it was due (ms), rt: when it ran (performance.now()), … }.
// t is the plan, not the clock: the time the queue gave the event plus the waits of the later steps that led here, so
// it is the same on a busy machine and at any combat speed (scaled by the pace). A sound's t and rt are when it is heard
// (its delay added). Nothing is recorded unless a test asks.
let cur = 0, clock: number | null = null;
/** Run f as part of engine event n, due at `at` on the plan's clock (its later steps, scheduled with after(), keep the
 *  event and move the clock on by their own wait). */
export function withEvent<T>(n: number, f: () => T, at?: number | null): T { const was = cur, wasAt = clock; cur = n; if (at !== undefined) clock = at; try { return f(); } finally { cur = was; clock = wasAt; } }
export function trace(w: string, d: Record<string, unknown> = {}, wait = 0) {
  const T = typeof window !== 'undefined' ? (window as any).__phcFxTrace : null;
  if (Array.isArray(T)) { const rt = performance.now(); T.push({ w, n: cur, t: (clock ?? rt) + wait, rt: rt + wait, ...d }); }
}

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
  // A tile of a map bigger than its window (the camera) can lie beyond the browser window's own edge: it is still the
  // tile (its effects are drawn there, clipped, and ride in when the camera arrives; a walk through it must not be
  // dropped), so it is found when no tile of that name is inside the browser window.
  let best: HTMLElement | null = null, area = 0, off: HTMLElement | null = null, offArea = 0;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('button.phc-tok[aria-label]'))) {
    const l = el.getAttribute('aria-label') || '';
    if (!l.startsWith(ref) || /[0-9A-Za-z]/.test(l.charAt(ref.length))) continue;
    const r = el.getBoundingClientRect(), a = r.width * r.height;
    if (r.bottom > 0 && r.top < innerHeight) { if (a > area) { area = a; best = el; } }
    else if (a > offArea) { offArea = a; off = el; }
  }
  return best || off;
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
export interface Pt { x: number; y: number; s: number; _sx?: number; _sy?: number }
/** The centre of a tile on screen and its size, in viewport pixels. */
export function centre(key: string | null | undefined): Pt | null {
  const el = tileEl(key); if (!el) return null;
  const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.max(18, r.width), _sx: scrolled.x, _sy: scrolled.y };
}
export const angle = (a: Pt, b: Pt) => Math.atan2(b.y - a.y, b.x - a.x);
export const panOf = (p: Pt | null) => (p ? Math.max(-0.7, Math.min(0.7, (p.x / Math.max(1, innerWidth)) * 1.4 - 0.7)) : 0);

// ---------- nodes ----------
/** Put a node on the layer at a viewport point (its centre), for ms; it is removed after, whatever happens. */
export function put(el: HTMLElement | SVGElement, p: { x: number; y: number }, w: number, h: number, ms: number): HTMLElement {
  p = liveAt(p);
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
  const k = fxScale();
  if (k !== 1) opts = { ...opts, ...(typeof opts.duration === 'number' ? { duration: opts.duration * k } : {}), ...(opts.delay ? { delay: opts.delay * k } : {}) };
  try { return (el as any).animate ? el.animate(frames, opts) : null; } catch { return null; }
}
/** A sprite burst at a point: scale from a to b and fade, rotated. */
export function burst(name: string, p: { x: number; y: number }, size: number, ms: number, o: { color?: string; rot?: number; from?: number; to?: number; fade?: number; blend?: string; delay?: number; flight?: string } = {}) {
  const run = () => {
    trace('burst', { name });
    const el = sprite(name, o.color), box = put(el, p, size, size, ms);
    if (o.blend) box.style.mixBlendMode = o.blend;
    if (o.flight) box.setAttribute('data-fx-flight', o.flight); // a round in the air drawn as a burst (a flamer's gout): the suites count it
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
// ---------- floating words that never pile up ----------
// Every float on the layer is kept here while it lives, so a new one never lands on top of another: the same word on
// the same spot within a moment is the same news said twice (a condition and the stop that caused it) and shows once;
// anything else that would overlap a float still on screen moves down a line (the older one is rising away), so three
// rolls' damage, MISS over a number, or BROKEN on three wall tiles in a row all read. Pure parts exported (tests).
export interface FloatBox { l: number; r: number; y: number; h: number; t0: number; ms: number; rise: number; text: string }
const floats: FloatBox[] = [];
/** How far a float has risen (px, up is negative) a fraction f of the way through its life (the keyframes below). */
export function riseAt(f: number, rise: number): number {
  if (f <= 0) return 6;
  if (f < 0.15) return 6 - 10 * (f / 0.15);
  if (f < 0.7) return -4 - (rise * 0.62 - 4) * ((f - 0.15) / 0.55);
  return -rise * 0.62 - rise * 0.38 * Math.min(1, (f - 0.7) / 0.3);
}
/** Is this word one already showing on the same spot (a word, not a number: two hits of −23 are two hits)? */
export function sameNews(list: FloatBox[], text: string, x: number, y: number, s: number, now: number): boolean {
  if (/\d/.test(text)) return false;
  // the result of a roll is news every time: three rounds that miss are three misses
  if (/^(MISS|COVER|FUMBLE|DODGE|DODGED|BLOCKED|PARRIED|GRAZE|CRIT|CRITICAL|SAVED|RESISTED)\b/i.test(text.trim())) return false;
  return list.some((b) => b.text === text && now - b.t0 < 700 && Math.abs((b.l + b.r) / 2 - x) < s * 0.6 && Math.abs(b.y - y) < s * 0.6);
}
/** The vertical shift (px, 0 or down a line or more) that keeps a new float of half-width hw, height h at (x, y) clear
 *  of every float still showing (where each is now, as it rises); up a line as a last resort. */
export function clearShift(list: FloatBox[], x: number, y: number, hw: number, h: number, now: number): number {
  const live = list.filter((b) => now - b.t0 < b.ms * 0.85);
  const hits = (dy: number) => live.some((b) => {
    if (b.r < x - hw + 2 || b.l > x + hw - 2) return false;
    const by = b.y + riseAt((now - b.t0) / b.ms, b.rise);
    return Math.abs(by - (y + dy + riseAt(0, 0))) < (b.h + h) / 2 - 1; // the new one starts where every float starts
  });
  for (const k of [0, 1, 2, 3, 4, -1, -2]) { const dy = k * (h + 1); if (!hits(dy)) return dy; }
  return 0;
}
/** Floating text over a point: damage numbers, MISS, a condition. rise: how far it drifts up over its life (in tiles;
 *  0.5 by default, so it fades before it reaches the unit in the tile above). */
export function floatText(text: string, p0: { x: number; y: number; s: number }, color: string, o: { big?: boolean; delay?: number; ms?: number; small?: boolean; rise?: number } = {}) {
  const run = () => {
    const p = liveAt(p0);
    const t = document.createElement('div'), fs = o.big ? Math.round(p.s * 0.62) : o.small ? Math.max(10, Math.round(p.s * 0.26)) : Math.round(p.s * 0.42);
    const ms = o.ms || (o.big ? 1300 : 1000), now = performance.now(), rise = p.s * (o.rise ?? 0.5), h = fs * 1.4;
    for (let i = floats.length - 1; i >= 0; i--) if (now - floats[i].t0 > floats[i].ms * fxScale() + 50) floats.splice(i, 1);
    const y0 = p.y - p.s * 0.35;
    trace('float', { text });
    if (sameNews(floats, text, p.x, y0, p.s, now)) return;
    const span = document.createElement('span');
    span.textContent = text;
    t.appendChild(span);
    t.style.cssText = "font-family:'Chakra Petch',sans-serif;font-weight:700;white-space:nowrap;text-align:center;line-height:1;letter-spacing:.04em;font-size:" + fs + 'px;color:' + color +
      ';text-shadow:0 0 3px #000,0 2px 0 #000,0 0 10px rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;width:100%;height:100%';
    const box = put(t, { x: p.x, y: y0 }, p.s * 3, h, ms);
    box.style.zIndex = '3';
    // A long float near an edge of the layer shifts inward, so its words are never cut off (the text is measured once
    // it is on the layer, by its own span: a flex box's scrollWidth misses what overflows on the left; the box widens
    // to fit it).
    const room = layer?.clientWidth || (typeof innerWidth === 'number' ? innerWidth : 0), textW = span.getBoundingClientRect?.().width || span.offsetWidth || text.length * fs * 0.62;
    const need = Math.max(p.s * 3, textW + 8);
    let cx = p.x;
    if (room > 0) { cx = clampCentre(p.x, need, 4, room - 4); box.style.width = need + 'px'; box.style.left = (cx - need / 2) + 'px'; }
    const hw = Math.max(textW, fs) / 2 + 2, dy = clearShift(floats, cx, y0, hw, h, now);
    if (dy) box.style.top = (y0 + dy - h / 2) + 'px';
    floats.push({ l: cx - hw, r: cx + hw, y: y0 + dy, h, t0: now, ms: ms * fxScale(), rise, text });
    anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }]
      : [{ transform: 'translateY(6px) scale(' + (o.big ? 1.8 : 0.7) + ')', opacity: 0 }, { transform: 'translateY(-4px) scale(1)', opacity: 1, offset: 0.15 }, { transform: 'translateY(-' + rise * 0.62 + 'px) scale(1)', opacity: 1, offset: 0.7 }, { transform: 'translateY(-' + rise + 'px) scale(.95)', opacity: 0 }],
      { duration: ms, easing: 'ease-out', fill: 'forwards' });
  };
  if (o.delay) after(run, o.delay); else run();
}
/** Forget the floats on screen (clearFx; the tests). */
export function resetFloats() { floats.length = 0; }

/** One small particle at a point: a box of size px styled by css, animated through frames over ms (after delay). */
export function particle(p: { x: number; y: number }, size: number, css: string, frames: Keyframe[], ms: number, delay = 0, easing = 'ease-out') {
  const run = () => { const d = document.createElement('div'); d.style.cssText = 'width:100%;height:100%;' + css; const box = put(d, p, size, size, ms); anim(box, frames, { duration: ms, easing, fill: 'forwards' }); };
  if (delay) after(run, delay); else run();
}

// ---------- effects that follow a tile (rings, decals) ----------
interface Anchored { box: HTMLElement; key: string; until: number; dy: number; dx?: number }
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
    a.box.style.left = (p.x + (a.dx || 0) * p.s - a.box.offsetWidth / 2) + 'px'; a.box.style.top = (p.y + a.dy * p.s - a.box.offsetHeight / 2) + 'px';
  }
  if (anchored.length) raf = requestAnimationFrame(track);
}
/** Keep a node centred over a tile (dy in tiles) while it lives, so it follows scrolling and re-layouts. */
export function anchor(box: HTMLElement, key: string, ms: number, dy = 0) {
  anchored.push({ box, key, until: performance.now() + slow(ms), dy });
  if (!raf) raf = requestAnimationFrame(track);
}
/** Move an anchored node to another tile (a pushed unit's stand-in, step by step). */
export function reanchor(box: HTMLElement, key: string) {
  for (const a of anchored) if (a.box === box) a.key = key;
  if (!raf && anchored.length) raf = requestAnimationFrame(track);
}
/** anchor, off the tile's centre by dx and dy (in tiles). */
export function anchorAt(box: HTMLElement, key: string, ms: number, dx: number, dy: number) {
  anchored.push({ box, key, until: performance.now() + slow(ms), dy, dx });
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
  box.style.zIndex = '2'; // over what a reload throws off (fx/brass.ts), under floating text
  anchor(box, key, ms + 250, -1.05);
  const run = s.querySelector('.run') as SVGCircleElement, sec = s.querySelector('.sec') as SVGTextElement;
  anim(run, [{ strokeDashoffset: 0 }, { strokeDashoffset: C }], { duration: ms, easing: 'linear', fill: 'forwards' });
  anim(box, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.08 }, { transform: 'scale(1)', opacity: 1, offset: 0.85 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: ms + 250, fill: 'forwards' });
  const t0 = performance.now(), real = slow(ms); // the countdown runs the time the ring really takes (the pace and tempo)
  const tick = () => { const left = Math.max(0, real - (performance.now() - t0)); sec.textContent = (left / 1000).toFixed(1); if (left > 0 && box.isConnected) setTimeout(tick, 100); else sec.textContent = '✓'; };
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
