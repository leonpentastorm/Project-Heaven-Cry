// Combat clarity (Leon, 9 Nov 2026: "I want the movement in combat to be more clear … when things move out of fog it
// just appears in, stealth too, maybe a gentle ! when something enters your sight, make overwatch triggering cleaner").
// The small pieces the effects layer (play.ts) draws for it, all plain SVG/CSS (no textures, so no sourced asset):
//   - the "!" over a unit the moment it comes into your side's sight: a small chip that pops, holds and lifts away; red
//     ink (#F65157) for a hostile, muted (#A3AEC2) otherwise, always the glyph and a colour together;
//   - the OVERWATCH tag over a watcher whose held shot is sprung, and the dashed line of its aim;
//   - the record of what came into and went out of sight, for the e2e suites (window.__phcSight).
// The one sound (a soft Interface "select" tick, Kenney, CC0, credited in sfxCredits.ts) is rate-limited: a wave of
// units walking into sight makes one tick, not a rattle.
import { anim, anchor, anchorAt, put, svg, type Pt } from './dom';
import { reducedMotion } from '../sfx';

export const HOSTILE_INK = '#F65157', OTHER_INK = '#A3AEC2';

// ---------- the test hook ----------
export type SightKind = 'enter' | 'leave' | 'reveal' | 'hide';
export interface SightNote { unit: string; kind: SightKind; at: number; tile: string; bang?: boolean }
const LOG: SightNote[] = [];
/** Note a unit coming into or going out of sight (performance.now() clock). bang: a "!" showed for it. */
export function noteSight(unit: string, kind: SightKind, tile: string, bang = false) {
  LOG.push({ unit, kind, at: Math.round(performance.now()), tile, ...(bang ? { bang } : {}) });
  if (LOG.length > 60) LOG.splice(0, LOG.length - 60);
}
export const sightLog = () => LOG.slice();
/** The Overwatch beats played (watcher, mover, the tile it was stopped on), for the e2e suites (window.__phcOverwatch). */
export interface OverwatchNote { watcher: string; target: string; tile: string; at: number }
const OW: OverwatchNote[] = [];
export function noteOverwatch(n: OverwatchNote) { OW.push(n); if (OW.length > 20) OW.splice(0, OW.length - 20); }
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__phcSight', { get: () => LOG.slice(), configurable: true });
  Object.defineProperty(window, '__phcOverwatch', { get: () => OW.slice(), configurable: true });
}

// ---------- the "!" ----------
/** At most one "!" per unit in this long (a walk into sight and the engine's sight note for it are one moment). */
export const BANG_DEDUPE_MS = 1500;
/** At most one tick in this long, however many units come into sight together. */
export const BANG_SOUND_GAP_MS = 900;
const lastBang = new Map<string, number>();
let lastTick = -1e9;
/** Should this unit's "!" show now (not shown for it in the last BANG_DEDUPE_MS)? Records it. Pure on its clock (tests). */
export function bangDue(unit: string, now: number): boolean {
  const t = lastBang.get(unit);
  if (t != null && now - t < BANG_DEDUPE_MS) return false;
  lastBang.set(unit, now); return true;
}
/** Should the tick sound now (none in the last BANG_SOUND_GAP_MS)? Records it. Pure on its clock (tests). */
export function tickDue(now: number): boolean { if (now - lastTick < BANG_SOUND_GAP_MS) return false; lastTick = now; return true; }
/** Forget the clocks (a new fight, the tests). */
export function resetSight() { lastBang.clear(); lastTick = -1e9; }

/** The "!" chip over a tile: pops in, holds, lifts away (about 1.1 s at Fast; follows the map as it scrolls). */
export function bangMark(key: string, p: Pt, hostile: boolean) {
  const ink = hostile ? HOSTILE_INK : OTHER_INK, size = Math.max(18, Math.min(30, p.s * 0.46)), ms = 1100;
  const el = document.createElement('div');
  el.setAttribute('data-phc-bang', hostile ? 'hostile' : 'other');
  el.textContent = '!';
  el.style.cssText = "width:100%;height:100%;box-sizing:border-box;display:grid;place-items:center;border-radius:50%;font-family:'Chakra Petch',sans-serif;font-weight:700;line-height:1;font-size:"
    + Math.round(size * 0.7) + 'px;color:' + ink + ';background:rgba(10,13,19,.92);border:2px solid ' + ink + ';box-shadow:0 0 0 2px rgba(10,13,19,.6),0 0 10px ' + (hostile ? 'rgba(246,81,87,.45)' : 'rgba(163,174,194,.35)');
  // A badge on the token's top-right corner (clear of the words that float up from its middle: REVEALED, a hit).
  const box = put(el, { x: p.x + p.s * 0.4, y: p.y - p.s * 0.42 }, size, size, ms);
  box.style.zIndex = '4';
  anchorAt(box, key, ms, 0.4, -0.42);
  anim(el, reducedMotion() ? [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }]
    : [{ transform: 'translateY(6px) scale(.45)', opacity: 0 }, { transform: 'translateY(-2px) scale(1.12)', opacity: 1, offset: 0.12 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.22 },
      { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.75 }, { transform: 'translateY(-' + Math.round(p.s * 0.18) + 'px) scale(.92)', opacity: 0 }],
    { duration: ms, easing: 'ease-out', fill: 'forwards' });
  return box;
}

// ---------- Overwatch ----------
/** A word chip over a tile that holds (OVERWATCH): dark pill, inked border and letters; follows the map. */
export function tagChip(key: string, p: Pt, text: string, ink: string, ms = 1000, dy = -0.95) {
  const el = document.createElement('div');
  el.setAttribute('data-phc-tag', text);
  el.textContent = text;
  const fs = Math.max(9, Math.min(12, Math.round(p.s * 0.22)));
  el.style.cssText = "display:inline-block;white-space:nowrap;font-family:'Chakra Petch',sans-serif;font-weight:700;letter-spacing:.12em;line-height:1;font-size:" + fs + 'px;padding:4px 7px;border-radius:6px;color:'
    + ink + ';background:rgba(10,13,19,.92);border:1.5px solid ' + ink + ';box-shadow:0 2px 8px rgba(0,0,0,.6)';
  const w = text.length * fs * 0.78 + 18, h = fs + 10;
  const box = put(el, { x: p.x, y: p.y + dy * p.s }, w, h, ms);
  box.style.zIndex = '4'; box.style.display = 'grid'; box.style.placeItems = 'center';
  anchor(box, key, ms, dy);
  anim(el, reducedMotion() ? [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
    : [{ transform: 'translateY(4px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.12 }, { transform: 'translateY(0)', opacity: 1, offset: 0.8 }, { transform: 'translateY(-4px)', opacity: 0 }],
    { duration: ms, easing: 'ease-out', fill: 'forwards' });
  return box;
}
/** The watcher's aim: a dashed line from it to the tile it fires at, drawn on and gone (ms). */
export function aimLine(a: Pt, b: Pt, ink: string, ms = 620) {
  const x0 = Math.min(a.x, b.x) - 4, y0 = Math.min(a.y, b.y) - 4, w = Math.abs(a.x - b.x) + 8, h = Math.abs(a.y - b.y) + 8;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const s = svg(w, h, '<line x1="' + (a.x - x0) + '" y1="' + (a.y - y0) + '" x2="' + (b.x - x0) + '" y2="' + (b.y - y0) + '" stroke="' + ink + '" stroke-width="2" stroke-linecap="round" stroke-dasharray="6 6" stroke-dashoffset="' + len.toFixed(1) + '" class="ln"/>');
  s.setAttribute('preserveAspectRatio', 'none');
  const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms);
  box.style.zIndex = '2';
  anim(box, [{ opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { opacity: 0.9, offset: 0.7 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
  const ln = s.querySelector('.ln'); if (ln && !reducedMotion()) anim(ln, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms * 0.45, easing: 'ease-out', fill: 'forwards' });
}
