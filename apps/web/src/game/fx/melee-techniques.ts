// Physical 2.0, the melee technique effects (docs/design/handoffs/physical-2.0-A-FX.md; Leon, 10 Nov 2026: "we using
// new effects for these?"). The engine's melee handlers emit one `melee_fx` beat per use (packages/engine/src/physical/
// melee/shared.ts meleeFx): what the technique did that the plain swing can't show (an arc across everyone struck, a
// thrown weapon flying to its pile, a hold between two units, a slam, a skid, a fall, a clash, a pin, a guard raised…).
// This draws each beat once, short, and a standing layer keeps the lasting states (a Bind or a grapple, a weapon left in
// a nailed unit, a raised Guard, a Feint's mark) for as long as the saved state holds them.
//
// The asset rule (CLAUDE.md): everything drawn here is plain SVG and CSS (arcs, lines, links, rings, trails, chevrons,
// brackets, shards, cracks, tints); what needs texture (dust, sparks, flashes, flares) is the already credited Kenney
// Particle Pack in public/fx (fx/fxCredits.ts), and every sound is an already credited one (sfxCredits.ts).
// Time: every duration and delay goes through fx/dom.ts (after, anim, put, burst, ring, floatText), so the combat speed
// and the spotlight cut-in's slow-mo apply; nothing here waits, and the standing layer is never in the queue (it never
// extends window.__phcHold). Reduced motion: nothing travels, rotates or shakes; each beat shows its end state and fades.
// Fog: every point comes through the kit's at() (null out of sight); a line between two units needs both ends seen; the
// user's own part (the jab, the draw, the guard, the afterimage) also needs the engine's seen stamp (sawThen).
import type { FxEvent, GameState } from '@engine';
import { phys } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { gearIconUri, hasGearIcon } from '../gearIcons';
import { type Pt, after, anim, burst, centre, floatText, layerEl, put, ring, shake, shakeScreen, svg } from './dom';

// Colour = meaning (docs/design/colour-system.md): white the cut, Strength ink force (pushes, pulls, holds, slams),
// Agility ink footwork, Body amber the guard, HP red damage or a warning, muted failed, held or armour.
export const MFX_INK = { cut: '#FFFFFF', force: '#F68A38', foot: '#E3BF51', guard: '#F2A54A', hp: '#F65157', muted: '#A3AEC2' } as const;
const { cut: WHITE, force: FORCE, foot: FOOT, guard: GUARD, hp: HP, muted: MUTED } = MFX_INK;

export interface MeleeKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  sideOf: (id: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }) => void;
  /** did the squad see the user when it happened (the engine's seen stamp) */
  sawThen: (e: FxEvent) => boolean;
}

// ---------- the beats (pure) ----------
/** Extra queue time each beat adds, in ms at Normal (section 4 of the design); the code stores it at Fast (× 0.85). */
export const MELEE_BEAT_NORMAL: Record<string, number> = {
  arc: 210, cleave: 190, throw: 0, bind: 160, slam: 260, force: 120, fall: 0, parry: 180, pin: 200, feint: 200, guard: 180,
  sidestep: 60, halt: 160, thrust: 60, sunder: 180, flurry: 140, draw: 160, ambush: 180, break: 260, charge: 0,
};
/** The most any one technique adds (Normal): one short beat. */
export const MELEE_BEAT_MAX = 260;
/** How long a melee_fx holds the stage (ms at Fast), or undefined for any other event. A refused one holds nothing. */
export function meleeTechBeat(e: Partial<FxEvent> & { k: string }): number | undefined {
  if (e.k !== 'melee_fx') return undefined;
  if ((e as any).refused || (e as any)._early) return 0; // _early: moved to play over its own move (leadMoves)
  const key = e.beat === 'arc' && (e as any).cleave ? 'cleave' : String(e.beat || '');
  return Math.round((MELEE_BEAT_NORMAL[key] ?? 0) * 0.85);
}
/** The quick strikes (section 4.1): after an arc (Sweep, Cleave) or a Flurry, the user's later strikes of that use play
 *  at the chained beat. Returns the batch with those `melee` events copied and marked `_quick` (the saved events are
 *  never changed). Pure. */
export function quickStrikes<T extends { k: string; [f: string]: any }>(evs: T[]): T[] {
  let out: T[] | null = null;
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i]; if (e.k !== 'melee_fx' || e.refused || !(e.beat === 'arc' || e.beat === 'flurry')) continue;
    let left = e.beat === 'arc' ? (e.struck?.length || 0) : Number(e.strikes) || 0, first = true;
    const upto = Number.isFinite(e.upto) ? Number(e.upto) : Infinity; // the engine's own end of this use (melee/shared upto)
    for (let j = i + 1; j < evs.length && left > 0; j++) {
      const x = evs[j];
      // the use ends at its upto, the next technique or the next turn: a later plain attack is never quick
      if (x.k === 'technique' || x.k === 'turn' || (x.k === 'melee_fx' && x.beat !== 'fall') || (Number.isFinite(x.n) && x.n > upto)) break;
      if ((x.k !== 'melee' && !(x.k === 'shot' && x.thrown)) || x.unit !== e.unit) continue;
      left--; if (first) { first = false; continue; }
      if (!out) out = evs.slice(); out[j] = { ...x, _quick: true };
    }
  }
  return out || evs;
}

/** The movement beats play over the movement they describe (review fix): the engine emits a forced move's `force` skid,
 *  a `fall` and a `sidestep` after the core's own shove, stance and move events (the path is only known after the move),
 *  so each is moved to just before the first of those events of its unit in the same use, and marked `_early` (it holds
 *  no beat of its own: the trail draws while the token slides, the tip with the PRONE word). Copies; never the saved
 *  events. Pure. */
export function leadMoves<T extends { k: string; [f: string]: any }>(evs: T[]): T[] {
  let out: T[] | null = null;
  for (let i = 0; i < evs.length; i++) {
    const src: T[] = out || evs, e = src[i];
    if (e.k !== 'melee_fx' || e.refused || e._early || !(e.beat === 'force' || e.beat === 'fall' || e.beat === 'sidestep')) continue;
    const who = e.beat === 'sidestep' ? e.unit : e.target, swap = e.beat === 'force' && e.how === 'swap';
    const first = (x: T) => e.beat === 'force' ? x.k === 'shove' && x.ok && x.target === who
      : e.beat === 'fall' ? (x.k === 'stance' && x.what === 'prone' && x.unit === who) || (x.k === 'stopped' && x.unit === who)
        : x.k === 'move' && x.unit === who;
    let to = -1;
    for (let j = i - 1; j >= 0; j--) { const x = src[j]; if (x.k === 'technique' || x.k === 'turn') break; if (first(x) || (swap && x.k === 'move' && x.unit === e.unit)) to = j; }
    if (to < 0) continue;
    const list: T[] = src.slice(); list.splice(i, 1); list.splice(to, 0, { ...e, _early: true }); out = list;
  }
  return out || evs;
}
/** Every pre-pass the melee beats need before the queue times a batch: the movement beats over their moves, the quick
 *  strikes, and a Thrown Flurry's flights on its own thrown shots. Pure. */
export function meleePrepass<T extends { k: string; [f: string]: any }>(evs: T[]): T[] {
  let out = quickStrikes(leadMoves(evs));
  for (let i = 0; i < out.length; i++) {
    const e = out[i]; if (e.k !== 'melee_fx' || e.beat !== 'flurry' || !e.thrown || e.refused) continue;
    const upto = Number.isFinite(e.upto) ? Number(e.upto) : Infinity, idx: number[] = [];
    for (let j = i + 1; j < out.length; j++) { const x = out[j]; if (x.k === 'technique' || x.k === 'turn' || x.n > upto) break; if (x.k === 'shot' && x.thrown && x.unit === e.unit) idx.push(j); }
    if (!idx.length) continue;
    if (out === evs) out = evs.slice();
    idx.forEach((j, q) => { out[j] = { ...out[j], _fly: { weapon: e.weapon, land: q === idx.length - 1 ? (e.land || out[j].to) : null } }; });
  }
  return out;
}

// ---------- the test hook (e2e/melee-fx.mjs) ----------
export interface MeleeFxRecord { id: string; kind: string; at: number; drawn: boolean }
const record = (id: string, kind: string, drawn: boolean) => {
  if (typeof window === 'undefined') return;
  const w = window as any, list: MeleeFxRecord[] = (w.__phcMeleeFx ||= []);
  list.push({ id, kind, at: Math.round(performance.now()), drawn }); if (list.length > 200) list.splice(0, list.length - 200);
};

// ---------- drawing bits ----------
const NS = 'http://www.w3.org/2000/svg';
/** The dark edge every stroke gets (CSS on the SVG), so white and ink lines read over portraits and the floor alike. */
const CASING = 'drop-shadow(0 0 1px #0A0D13) drop-shadow(0 0 2.5px rgba(10,13,19,.85))';
/** An SVG over the layer whose user units are viewport pixels (draw at the points' own x, y). */
function overlay(pts: { x: number; y: number }[], pad: number, ms: number, tag: string): { s: SVGSVGElement; box: HTMLElement } {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(1, Math.max(...xs) - x0 + pad), h = Math.max(1, Math.max(...ys) - y0 + pad);
  const s = svg(w, h, ''); s.setAttribute('viewBox', x0 + ' ' + y0 + ' ' + w + ' ' + h);
  const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms);
  box.setAttribute('data-melee-fx', tag); box.style.zIndex = '2';
  s.style.filter = CASING; // a dark edge: the strokes read over a bright portrait
  return { s, box };
}
function el(tag: string, attrs: Record<string, string | number>): SVGElement {
  const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); return n;
}
const pathD = (pts: { x: number; y: number }[]) => pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
const lenOf = (pts: { x: number; y: number }[]) => pts.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
/** Draw a stroke on by its dash (or, with reduced motion, show it whole), then fade it. */
function drawOn(n: SVGElement, len: number, ms: number, hold: number, fade: number) {
  if (!reducedMotion()) { n.setAttribute('stroke-dasharray', len.toFixed(1)); n.setAttribute('stroke-dashoffset', len.toFixed(1)); anim(n, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }); }
  anim(n, [{ opacity: 1 }, { opacity: 1, offset: (ms + hold) / (ms + hold + fade) }, { opacity: 0 }], { duration: ms + hold + fade, fill: 'forwards' });
}
const fadeBox = (box: Element, ms: number, delay = 0) => anim(box, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, delay, fill: 'forwards' });
const unitVec = (a: { x: number; y: number }, b: { x: number; y: number }) => { const d = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / d, y: (b.y - a.y) / d }; };
/** Seen points along a path (null where the fog is), and its unbroken seen runs. */
function seenRuns(at: MeleeKit['at'], path: string[]): Pt[][] {
  const runs: Pt[][] = []; let cur: Pt[] = [];
  for (const k of path) { const p = at(k); if (p) cur.push(p); else { if (cur.length) runs.push(cur); cur = []; } }
  if (cur.length) runs.push(cur); return runs;
}
/** A dust puff at a unit's feet (Kenney dust). */
const dustAt = (p: Pt, size = 0.9) => burst('dust', { x: p.x, y: p.y + p.s * 0.25 }, p.s * size, 420, { color: '#C9B79A', from: 0.4, to: 1.1, fade: 0 });
/** Chevrons pointing along a direction at a point. */
function chevrons(s: SVGSVGElement, p: { x: number; y: number }, dir: { x: number; y: number }, size: number, color: string, n = 2) {
  const nx = -dir.y, ny = dir.x;
  for (let i = 0; i < n; i++) {
    const c = { x: p.x + dir.x * size * 0.55 * i, y: p.y + dir.y * size * 0.55 * i }, tip = { x: c.x + dir.x * size * 0.4, y: c.y + dir.y * size * 0.4 };
    s.appendChild(el('path', { d: pathD([{ x: c.x + nx * size * 0.4, y: c.y + ny * size * 0.4 }, tip, { x: c.x - nx * size * 0.4, y: c.y - ny * size * 0.4 }]), fill: 'none', stroke: color, 'stroke-width': Math.max(2, size * 0.16), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.95 - i * 0.25 }));
  }
}
/** The held link between two units: a double line with a knot (a grapple's knot is a hand: a ring with a bar). */
export function linkMarkup(a: { x: number; y: number }, b: { x: number; y: number }, s: number, grapple: boolean, color = FORCE): string {
  const v = unitVec(a, b), nx = -v.y, ny = v.x, g = Math.max(2, s * 0.06), r = s * 0.24;
  const a1 = { x: a.x + v.x * r, y: a.y + v.y * r }, b1 = { x: b.x - v.x * r, y: b.y - v.y * r }, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const line = (o: number) => '<path d="' + pathD([{ x: a1.x + nx * o, y: a1.y + ny * o }, { x: b1.x + nx * o, y: b1.y + ny * o }]) + '" stroke="' + color + '" stroke-width="' + Math.max(2.5, s * 0.07).toFixed(1) + '" stroke-linecap="round" fill="none"/>';
  const knot = grapple
    ? '<circle cx="' + m.x.toFixed(1) + '" cy="' + m.y.toFixed(1) + '" r="' + (s * 0.15).toFixed(1) + '" fill="#0A0D13" stroke="' + color + '" stroke-width="' + Math.max(2, s * 0.06).toFixed(1) + '"/><path d="' + pathD([{ x: m.x - nx * s * 0.08, y: m.y - ny * s * 0.08 }, { x: m.x + nx * s * 0.08, y: m.y + ny * s * 0.08 }]) + '" stroke="' + color + '" stroke-width="' + Math.max(2, s * 0.05).toFixed(1) + '" stroke-linecap="round"/>'
    : '<rect x="' + (m.x - s * 0.11).toFixed(1) + '" y="' + (m.y - s * 0.11).toFixed(1) + '" width="' + (s * 0.22).toFixed(1) + '" height="' + (s * 0.22).toFixed(1) + '" transform="rotate(45 ' + m.x.toFixed(1) + ' ' + m.y.toFixed(1) + ')" fill="#0A0D13" stroke="' + color + '" stroke-width="' + Math.max(2, s * 0.06).toFixed(1) + '"/>';
  return line(g) + line(-g) + knot;
}
/** The raised guard: an arc on the front side of a token (100°), with Heavy's second arc and Reach's dotted ring. */
export function guardMarkup(p: { x: number; y: number }, s: number, front: number[], o: { heavy?: boolean; reach?: boolean } = {}): string {
  const ang = Math.atan2(front[1] || 0, front[0] || 1), half = (50 * Math.PI) / 180;
  const arc = (r: number, w: number, op: number) => {
    const a0 = ang - half, a1 = ang + half, x0 = p.x + Math.cos(a0) * r, y0 = p.y + Math.sin(a0) * r, x1 = p.x + Math.cos(a1) * r, y1 = p.y + Math.sin(a1) * r;
    return '<path d="M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" stroke="' + GUARD + '" stroke-width="' + w.toFixed(1) + '" stroke-linecap="round" fill="none" opacity="' + op + '"/>';
  };
  return arc(s * 0.6, Math.max(3.5, s * 0.12), 1) + (o.heavy ? arc(s * 0.72, Math.max(1.5, s * 0.04), 0.8) : '')
    + (o.reach ? '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (s * 1.5).toFixed(1) + '" fill="none" stroke="' + GUARD + '" stroke-width="1.5" stroke-dasharray="3 5" opacity=".7"/>' : '');
}
/** A Feint's set-up mark: four white corner brackets around a tile. */
export function bracketsMarkup(p: { x: number; y: number }, s: number, k = 1): string {
  const r = s * 0.48 * k, l = s * 0.16, w = Math.max(2, s * 0.06);
  let d = '';
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const cx = p.x + sx * r, cy = p.y + sy * r; d += 'M' + (cx - sx * l).toFixed(1) + ' ' + cy.toFixed(1) + ' L' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' L' + cx.toFixed(1) + ' ' + (cy - sy * l).toFixed(1) + ' '; }
  return '<path d="' + d + '" stroke="' + WHITE + '" stroke-width="' + w.toFixed(1) + '" fill="none" stroke-linecap="square"/>';
}
/** The weapon's monoline icon as an <img> in white ink (a short white bar for a weapon with none). */
function weaponImg(weapon: string | undefined, size: number, ink = WHITE): HTMLElement {
  if (weapon && hasGearIcon(weapon)) { const i = document.createElement('img'); i.src = gearIconUri(weapon, ink); i.alt = ''; i.style.cssText = 'width:100%;height:100%;display:block;filter:drop-shadow(0 0 1px #0A0D13) drop-shadow(0 0 1px #0A0D13) drop-shadow(0 0 4px rgba(10,13,19,.9))'; return i; }
  const d = document.createElement('div'); d.style.cssText = 'width:100%;height:' + Math.max(3, size * 0.1) + 'px;margin-top:' + size * 0.45 + 'px;background:' + ink + ';border-radius:2px;box-shadow:0 0 3px #000'; return d;
}

// ---------- the handler ----------
export function meleeTechHandlers(K: MeleeKit): Record<string, (e: FxEvent) => void> {
  const { at, tokOf, play } = K;
  const rm = () => reducedMotion();
  /** A token's lean toward a point and back (a jab, a push back): the individual translate property. */
  /** A ring (fx/dom.ts ring scales it); with reduced motion a still circle that fades. */
  const ringAt = (p: Pt, color: string, ms: number, o: { from?: number; to?: number; width?: number; delay?: number } = {}) => {
    if (!rm()) { ring(p, color, ms, o); return; }
    const { s, box } = overlay([p], p.s, ms, 'ring'); s.appendChild(el('circle', { cx: p.x, cy: p.y, r: p.s * 0.6, fill: 'none', stroke: color, 'stroke-width': o.width ?? 4 })); fadeBox(box, ms);
  };
  const nudge = (tok: HTMLElement | null, dx: number, dy: number, ms: number) => { if (!tok || rm()) return; anim(tok, [{ translate: '0 0' }, { translate: dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px', offset: 0.35 }, { translate: '0 0' }], { duration: ms, easing: 'ease-out' }); };

  const beats: Record<string, (e: any) => boolean> = {
    // ----- Sweep: a wide arc across the swept tiles; Heavy: a full ring. Cleave: a cut running target to target. -----
    arc(e) {
      if (e.cleave) return cleave(e);
      const u = sawThen(e) ? at(e.at) : null, tiles: string[] = e.tiles || [], struck: string[] = e.struck || [];
      const tp = tiles.map((k) => at(k)).filter(Boolean) as Pt[];
      let drawn = false;
      if (u && (tp.length || e.heavy)) {
        const r = u.s * (e.heavy ? 1.0 : tp.length ? Math.max(0.8, tp.reduce((n, p) => n + Math.hypot(p.x - u.x, p.y - u.y), 0) / tp.length) / u.s : 1);
        const { s } = overlay([u], r + u.s * 0.4, 700, 'arc');
        if (e.heavy) {
          const c = el('circle', { cx: u.x, cy: u.y, r, fill: 'none', stroke: WHITE, 'stroke-width': Math.max(4, u.s * 0.16), opacity: 0.9 }); s.appendChild(c); drawOn(c, 2 * Math.PI * r, 220, 60, 300);
        } else {
          const dir = Math.atan2(e.dir?.[1] ?? 0, e.dir?.[0] ?? 1), rel = tp.map((p) => { let a = Math.atan2(p.y - u.y, p.x - u.x) - dir; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; });
          const lo = Math.min(-Math.PI / 4, ...rel) - 0.18, hi = Math.max(Math.PI / 4, ...rel) + 0.18, pts: { x: number; y: number }[] = [];
          for (let i = 0; i <= 18; i++) { const a = dir + lo + ((hi - lo) * i) / 18; pts.push({ x: u.x + Math.cos(a) * r, y: u.y + Math.sin(a) * r }); }
          const wedge = el('path', { d: 'M' + u.x + ' ' + u.y + ' ' + pathD(pts).replace(/^M/, 'L') + ' Z', fill: WHITE, opacity: 0 }); s.appendChild(wedge);
          anim(wedge, [{ opacity: 0.32 }, { opacity: 0 }], { duration: 300, delay: 160, fill: 'forwards' });
          const band = el('path', { d: pathD(pts), fill: 'none', stroke: WHITE, 'stroke-width': Math.max(4, u.s * 0.2), 'stroke-linecap': 'round', opacity: 0.95 }); s.appendChild(band);
          drawOn(band, lenOf(pts), 180, 40, 300);
        }
        drawn = true;
        play('swish', u, { rate: 0.85, gain: 0.8 });
      }
      // a struck ally: its segment is a warning (friendly fire): an HP-red ring on it
      for (const id of struck) if (K.sideOf(id) && K.sideOf(id) === K.sideOf(e.unit)) { const q = at(K.posOf(id)); if (q) { ringAt(q, HP, 420, { from: 1.2, to: 0.7, width: 4 }); drawn = true; } }
      return drawn;
    },
    // ----- Throw: the weapon flies to the target and drops into the pile on its tile. -----
    throw(e) { return flyWeapon(e.weapon, e.from, e.to, 0, true); },
    // ----- Bind (and Bare's grapple): the link snaps from the user to the target. -----
    bind(e) {
      const a = at(e.at), b = at(e.to || K.posOf(e.target)); if (!a || !b) return false;
      const { s, box } = overlay([a, b], a.s, 520, 'bind'); s.innerHTML = linkMarkup(a, b, a.s, e.kind === 'grapple');
      const [x0, y0] = s.getAttribute('viewBox')!.split(' ').map(Number);
      s.style.transformOrigin = (a.x - x0).toFixed(1) + 'px ' + (a.y - y0).toFixed(1) + 'px'; // it snaps out from the user
      if (!rm()) anim(s, [{ transform: 'scale(.15)', opacity: 0.5 }, { transform: 'scale(1)', opacity: 1, offset: 0.27 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
      else fadeBox(box, 300, 220);
      play('hit_heavy', b, { rate: 1.3, gain: 0.35 });
      return true;
    },
    // ----- Throw Down: the hold tears, the body's path, and the slam on the landing tile (and anyone standing there). -----
    slam(e) {
      const a = at(e.at), from = at(e.from), land = at(e.land); let drawn = false;
      dropMarks((m) => (m.kind === 'bind' || m.kind === 'grapple') && [m.unit, m.other].includes(e.unit) && [m.unit, m.other].includes(e.target));
      if (a && from && !rm()) { // the link tears: two halves fly apart
        const { s } = overlay([a, from], a.s, 260, 'slam-tear'), m = { x: (a.x + from.x) / 2, y: (a.y + from.y) / 2 }, v = unitVec(a, from);
        const h1 = el('g', {}), h2 = el('g', {}); h1.innerHTML = linkMarkup(a, m, a.s, false); h2.innerHTML = linkMarkup(m, from, a.s, false); s.appendChild(h1); s.appendChild(h2);
        anim(h1, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (-v.x * a.s * 0.3) + 'px,' + (-v.y * a.s * 0.3) + 'px)', opacity: 0 }], { duration: 160, fill: 'forwards' });
        anim(h2, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (v.x * a.s * 0.3) + 'px,' + (v.y * a.s * 0.3) + 'px)', opacity: 0 }], { duration: 160, fill: 'forwards' });
        drawn = true;
      }
      if ((e.path || []).length > 1) drawn = trail(e.path, FORCE, 'slam-path') || drawn;
      if (land) {
        const { s: im } = overlay([land], land.s * 0.9, 460, 'slam');
        const shock = el('circle', { cx: land.x, cy: land.y, r: land.s * 0.75, fill: 'none', stroke: FORCE, 'stroke-width': Math.max(3, land.s * 0.1) }); im.appendChild(shock);
        (shock as any).style.transformBox = 'fill-box'; (shock as any).style.transformOrigin = 'center';
        anim(shock, rm() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(1.1)', opacity: 1 }, { transform: 'scale(.4)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
        burst('dust', land, land.s * 1.5, 520, { color: '#C9B79A', from: 0.4, to: 1.25 });
        burst('dirt', land, land.s * 1.2, 460, { color: '#8F7A5E', from: 0.3, to: 1.1, delay: 30 });
        const tok = tokOf(e.target, e.land);
        if (tok && !rm()) anim(tok, [{ scale: '1.14' }, { scale: '0.94', offset: 0.55 }, { scale: '1' }], { duration: 260, easing: 'ease-out' });
        shakeScreen(0.35); shake(tok, 0.6);
        if (e.occupant) { const occ = at(K.posOf(e.occupant)) || land; ringAt(occ, HP, 360, { from: 1.3, to: 0.7, width: 4, delay: 60 }); shake(tokOf(e.occupant), 0.7); }
        play('hit_heavy', land, { rate: 0.7 }); play('body_fall', land, { delay: 80 });
        drawn = true;
      }
      return drawn;
    },
    // ----- Drag, Shove, Bash's and Lunge's push: the skid along the real path, a chevron the way it went. -----
    force(e) {
      let drawn = false;
      if (e.how === 'swap' && e.user) {
        const a = at(e.path?.[0]), b = at(e.path?.[e.path.length - 1]);
        if (a && b) {
          const { s } = overlay([a, b], a.s * 0.7, 520, 'force'), v = unitVec(a, b), nx = -v.y * a.s * 0.35, ny = v.x * a.s * 0.35;
          for (const [p, q, o] of [[a, b, 1], [b, a, -1]] as [Pt, Pt, number][]) {
            const c = { x: (p.x + q.x) / 2 + nx * o, y: (p.y + q.y) / 2 + ny * o }, d = 'M' + p.x + ' ' + p.y + ' Q' + c.x + ' ' + c.y + ' ' + q.x + ' ' + q.y;
            const n = el('path', { d, fill: 'none', stroke: FORCE, 'stroke-width': Math.max(3, a.s * 0.09), 'stroke-linecap': 'round' }); s.appendChild(n); drawOn(n, Math.hypot(q.x - p.x, q.y - p.y) * 1.15, 180, 120, 220);
            chevrons(s, { x: q.x - unitVec(c, q).x * a.s * 0.45, y: q.y - unitVec(c, q).y * a.s * 0.45 }, unitVec(c, q), a.s * 0.3, FORCE, 1);
          }
          drawn = true;
        }
        return drawn;
      }
      drawn = trail(e.path || [], FORCE, 'force');
      const end = at(e.path?.[e.path.length - 1]); if (end) dustAt(end, 0.8);
      return drawn;
    },
    // ----- Trip, Charge's or Hamstring's Prone: the token tips and drops, with a puff of dust. -----
    fall(e) {
      const p = at(e.to || K.posOf(e.target)); if (!p) return false;
      const tok = tokOf(e.target, e.to);
      if (tok && !rm()) anim(tok, [{ rotate: '0deg', translate: '0 0' }, { rotate: '-14deg', translate: '0 ' + (p.s * 0.12).toFixed(1) + 'px', offset: 0.45 }, { rotate: '-10deg', translate: '0 ' + (p.s * 0.1).toFixed(1) + 'px', offset: 0.75 }, { rotate: '0deg', translate: '0 0' }], { duration: 300, easing: 'cubic-bezier(.3,.7,.4,1)' });
      dustAt(p, 1.1);
      const { box } = overlay([p], p.s * 0.6, 340, 'fall'); fadeBox(box, 340);
      return true;
    },
    // ----- Parry: the clash where the hit is turned aside (or not). -----
    parry(e) {
      const a = at(e.from), d = at(e.to); if (!d) return false;
      const m = a ? { x: a.x * 0.4 + d.x * 0.6, y: a.y * 0.4 + d.y * 0.6, s: d.s } : { x: d.x, y: d.y - d.s * 0.3, s: d.s };
      const { s, box } = overlay([m], d.s * 0.8, 520, 'parry'), r = d.s * 0.42, w = Math.max(3, d.s * 0.09);
      if (e.won) {
        for (const o of [1, -1]) {
          const st = el('path', { d: 'M' + (m.x - r) + ' ' + (m.y - r * o) + ' L' + (m.x + r) + ' ' + (m.y + r * o), stroke: WHITE, 'stroke-width': w, 'stroke-linecap': 'round', fill: 'none' }); s.appendChild(st);
          if (!rm()) anim(st, [{ transform: 'rotate(' + 26 * o + 'deg)', opacity: 0.6 }, { transform: 'rotate(0deg)', opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 520, easing: 'ease-out', fill: 'forwards' });
          (st as any).style.transformOrigin = m.x + 'px ' + m.y + 'px'; (st as any).style.transformBox = 'view-box';
        }
        if (rm()) fadeBox(box, 300, 200);
        burst('spark_burst', m, d.s * 1.1, 300, { color: '#FFF3C4', from: 0.4, to: 1.2, blend: 'screen' });
        if (a) { const v = unitVec(a, d); nudge(tokOf(e.ally || e.unit, e.to), v.x * d.s * 0.06, v.y * d.s * 0.06, 200); }
        floatText('PARRIED', { x: d.x, y: d.y + d.s * 0.5, s: d.s }, WHITE, { small: true, ms: 640 });
        play('hit_metal', m, { rate: 1.2 });
      } else {
        const st = el('path', { d: 'M' + (m.x - r) + ' ' + (m.y + r) + ' L' + (m.x + r) + ' ' + (m.y - r), stroke: MUTED, 'stroke-width': w, 'stroke-linecap': 'round', fill: 'none' }); s.appendChild(st);
        fadeBox(box, 420, 100);
        floatText('THROUGH', { x: d.x, y: d.y + d.s * 0.5, s: d.s }, MUTED, { small: true, ms: 560 });
        play('dry_click', m, { gain: 0.6 });
      }
      return true;
    },
    // ----- Run Through: the thrust line through the target (and on behind it), then the pin mark. -----
    pin(e) {
      const line = (e.line || []) as string[], u = at(line[0]), v = at(line[1] || e.to); if (!v) return false;
      const pts = line.map((k) => at(k)).filter(Boolean) as Pt[];
      if (u && pts.length >= 2) {
        const last = pts[pts.length - 1], dir = unitVec(u, v), end = pts.length > 2 ? last : { x: v.x + dir.x * v.s * 0.45, y: v.y + dir.y * v.s * 0.45 };
        const { s } = overlay([u, end], u.s * 0.5, 620, 'pin');
        const n = el('path', { d: pathD([{ x: u.x + dir.x * u.s * 0.3, y: u.y + dir.y * u.s * 0.3 }, end]), stroke: WHITE, 'stroke-width': Math.max(3, u.s * 0.08), 'stroke-linecap': 'round', fill: 'none' }); s.appendChild(n);
        drawOn(n, Math.hypot(end.x - u.x, end.y - u.y), 120, 160, 300);
        play('slice', v);
      }
      // the pin mark on the target (the standing layer keeps the weapon stuck in it while nailed)
      after(() => { const { s, box } = overlay([v], v.s * 0.4, 420, 'pin-mark'); s.innerHTML = '<path d="M' + (v.x - v.s * 0.18) + ' ' + (v.y - v.s * 0.18) + ' L' + (v.x + v.s * 0.18) + ' ' + (v.y + v.s * 0.18) + ' M' + (v.x + v.s * 0.18) + ' ' + (v.y - v.s * 0.18) + ' L' + (v.x - v.s * 0.18) + ' ' + (v.y + v.s * 0.18) + '" stroke="' + FORCE + '" stroke-width="' + Math.max(3, v.s * 0.08) + '" stroke-linecap="round"/>'; fadeBox(box, 300, 120); play('hit_metal', v, { rate: 0.8 }); }, 130);
      return true;
    },
    // ----- Feint: the jab, then the target's set-up brackets close (or NOT FOOLED). -----
    feint(e) {
      const a = sawThen(e) ? at(e.at) : null, b = at(e.to || K.posOf(e.target));
      if (a && b) { const v = unitVec(a, b); nudge(tokOf(e.unit, e.at), v.x * a.s * 0.15, v.y * a.s * 0.15, 180); }
      if (a || b) play('swish', a || b, { rate: 1.4, gain: 0.4 });
      if (!b) return !!a;
      if (e.ok) {
        const { s } = overlay([b], b.s * 0.8, 520, 'feint'); s.innerHTML = bracketsMarkup(b, b.s);
        const g = s.firstElementChild as SVGElement | null;
        if (g) { (g as any).style.transformOrigin = b.x + 'px ' + b.y + 'px'; (g as any).style.transformBox = 'view-box'; anim(g, rm() ? [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }] : [{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.35 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 520, easing: 'ease-out', fill: 'forwards' }); }
      } else { // it saw through: muted brackets spring open and fade
        const { s, box } = overlay([b], b.s * 0.9, 460, 'feint'); s.innerHTML = bracketsMarkup(b, b.s, 1.15).replace(WHITE, MUTED);
        anim(box, rm() ? [{ opacity: 0.8 }, { opacity: 0 }] : [{ transform: 'scale(.85)', opacity: 0.9 }, { transform: 'scale(1.15)', opacity: 0 }], { duration: 460, easing: 'ease-out', fill: 'forwards' });
        floatText('NOT FOOLED', { x: b.x, y: b.y - b.s * 0.5, s: b.s }, MUTED, { small: true, ms: 600 });
      }
      return true;
    },
    // ----- Guard: the amber arc rises on the front side (the standing layer keeps it). -----
    guard(e) {
      const p = sawThen(e) ? at(e.at) : null; if (!p) return false;
      const { s } = overlay([p], p.s * (e.reach ? 1.7 : 0.9), 560, 'guard'); s.innerHTML = guardMarkup(p, p.s, e.front || [1, 0], { heavy: e.heavy, reach: e.reach });
      const g = s as unknown as SVGElement;
      (g as any).style.transformOrigin = '50% 50%';
      anim(g, rm() ? [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }] : [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
      play('hit_metal', p, { rate: 1.6, gain: 0.3 });
      return true;
    },
    // ----- Sidestep: an afterimage left on the old tile and speed lines along the step. -----
    sidestep(e) {
      if (!sawThen(e)) return false;
      const a = at(e.from), b = at(e.to); if (!a && !b) return false;
      if (a && !rm()) { const tok = tokOf(e.unit, e.to); if (tok) { const ghost = tok.cloneNode(true) as HTMLElement; ghost.style.cssText += ';position:static;inset:auto;width:100%;height:100%;filter:sepia(1) saturate(3) hue-rotate(5deg) brightness(1.2)'; const box = put(ghost, a, a.s * 0.9, a.s * 0.9, 260); box.setAttribute('data-melee-fx', 'sidestep-ghost'); anim(box, [{ opacity: 0.5 }, { opacity: 0 }], { duration: 240, fill: 'forwards' }); } }
      if (a && b) {
        const { s } = overlay([a, b], a.s * 0.5, 360, 'sidestep'), v = unitVec(a, b), nx = -v.y, ny = v.x;
        for (const o of [-0.22, 0, 0.22]) { const n = el('path', { d: pathD([{ x: a.x + nx * a.s * o, y: a.y + ny * a.s * o }, { x: b.x - v.x * a.s * 0.4 + nx * a.s * o, y: b.y - v.y * a.s * 0.4 + ny * a.s * o }]), stroke: FOOT, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.85 }); s.appendChild(n); drawOn(n, Math.hypot(b.x - a.x, b.y - a.y), 100, 60, 200); }
      }
      play('swish', b || a, { rate: 1.5, gain: 0.4 });
      return true;
    },
    // ----- Keep Back: the reach line from the holder to the mover, a crossbar where it stops. -----
    halt(e) {
      const a = at(e.at), b = at(e.to || K.posOf(e.target)); if (!b) return false;
      if (a) {
        const v = unitVec(a, b), end = { x: b.x - v.x * b.s * 0.42, y: b.y - v.y * b.s * 0.42 }, nx = -v.y * b.s * 0.3, ny = v.x * b.s * 0.3;
        const { s } = overlay([a, b], a.s * 0.5, 560, 'halt');
        const ln = el('path', { d: pathD([{ x: a.x + v.x * a.s * 0.35, y: a.y + v.y * a.s * 0.35 }, end]), stroke: WHITE, 'stroke-width': Math.max(2.5, a.s * 0.07), 'stroke-linecap': 'round' }); s.appendChild(ln); drawOn(ln, Math.hypot(end.x - a.x, end.y - a.y), 110, 200, 240);
        const bar = el('path', { d: pathD([{ x: end.x + nx, y: end.y + ny }, { x: end.x - nx, y: end.y - ny }]), stroke: WHITE, 'stroke-width': Math.max(3, a.s * 0.1), 'stroke-linecap': 'round', opacity: 0 }); s.appendChild(bar);
        anim(bar, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.65 }, { opacity: 0 }], { duration: 520, delay: 90, fill: 'forwards' });
        after(() => nudge(tokOf(e.target, e.to), v.x * b.s * 0.08, v.y * b.s * 0.08, 200), 100);
      } else { const { box } = overlay([b], b.s * 0.5, 300, 'halt'); fadeBox(box, 300); }
      play('hit_wood', b, { rate: 0.9 });
      return true;
    },
    // ----- Half-Sword: a narrow thrust line into the target and on through (armour ignored). -----
    thrust(e) {
      const a = at(e.at), b = at(e.to || K.posOf(e.target)); if (!a || !b) return false;
      const v = unitVec(a, b), end = { x: b.x + v.x * b.s * 0.3, y: b.y + v.y * b.s * 0.3 };
      const { s } = overlay([a, end], a.s * 0.3, 420, 'thrust');
      const n = el('path', { d: pathD([{ x: a.x + v.x * a.s * 0.35, y: a.y + v.y * a.s * 0.35 }, end]), stroke: WHITE, 'stroke-width': 2.2, 'stroke-linecap': 'round' }); s.appendChild(n);
      drawOn(n, Math.hypot(end.x - a.x, end.y - a.y), 90, 120, 200);
      return true;
    },
    // ----- Sunder: armour shards chip off the far side and fall; ARMOUR was → now. -----
    sunder(e) {
      const b = at(e.to || K.posOf(e.target)); if (!b) return false;
      const a = at(e.at), v = a ? unitVec(a, b) : { x: 1, y: 0 };
      const { s } = overlay([b], b.s * 1.1, 620, 'sunder');
      for (let i = 0; i < 5; i++) {
        const ang = Math.atan2(v.y, v.x) + (i - 2) * 0.45, c = { x: b.x + Math.cos(ang) * b.s * 0.38, y: b.y + Math.sin(ang) * b.s * 0.38 }, z = b.s * (0.07 + (i % 2) * 0.03);
        const sh = el('path', { d: 'M' + (c.x - z) + ' ' + (c.y + z) + ' L' + (c.x + z * 1.2) + ' ' + (c.y) + ' L' + (c.x - z * 0.3) + ' ' + (c.y - z * 1.1) + ' Z', fill: MUTED, stroke: '#0A0D13', 'stroke-width': 1 }); s.appendChild(sh);
        anim(sh, rm() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + (Math.cos(ang) * b.s * 0.3).toFixed(1) + 'px,' + (b.s * 0.4).toFixed(1) + 'px) rotate(' + (i % 2 ? 80 : -70) + 'deg)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.3,.2,.6,1)', fill: 'forwards' });
        (sh as any).style.transformBox = 'fill-box'; (sh as any).style.transformOrigin = 'center';
      }
      burst('spark_burst_2', { x: b.x + v.x * b.s * 0.3, y: b.y + v.y * b.s * 0.3 }, b.s * 0.8, 280, { color: MUTED, from: 0.4, to: 1.1 });
      floatText('ARMOUR ' + e.was + ' → ' + e.now, { x: b.x, y: b.y + b.s * 0.55, s: b.s }, MUTED, { small: true, ms: 760 });
      play('hit_metal', b, { rate: 0.75 }); play('el_stone_crumble', b, { gain: 0.4, delay: 40 });
      return true;
    },
    // ----- Flurry: quick thin cuts across the target. Thrown: no cuts; each thrown shot flies the weapon's icon (its
    // _fly from meleePrepass, played by the shot: thrownShot below) and the last lands in the last target's pile. -----
    flurry(e) {
      const tiles: string[] = e.tiles || [], n = Math.max(1, Math.min(3, Number(e.strikes) || 2));
      let drawn = false;
      const p0 = at(e.at);
      if (e.thrown) { if (p0 && sawThen(e)) play('swish', p0, { rate: 1.3, gain: 0.5 }); return false; } // its flights draw on the shots
      tiles.forEach((k, ti) => {
        const b = at(k); if (!b) return; drawn = true;
        const { s } = overlay([b], b.s * 0.7, 560, 'flurry');
        for (let i = 0; i < n; i++) {
          if (tiles.length > 1 && i % tiles.length !== ti) continue;
          const ang = ((i % 2 ? 30 : -30) + (i === 2 ? 90 : 0)) * Math.PI / 180, r = b.s * 0.5;
          const ln = el('path', { d: pathD([{ x: b.x - Math.cos(ang) * r, y: b.y - Math.sin(ang) * r }, { x: b.x + Math.cos(ang) * r, y: b.y + Math.sin(ang) * r }]), stroke: WHITE, 'stroke-width': Math.max(2, b.s * 0.05), 'stroke-linecap': 'round', opacity: 0 }); s.appendChild(ln);
          const go = () => drawOn(ln, 2 * r, 70, 120, 220);
          if (rm()) go(); else after(go, i * 70);
        }
      });
      for (let i = 0; i < n; i++) play('swish', p0 || at(tiles[0]), { rate: 1.3, gain: 0.5, delay: i * 70 });
      return drawn;
    },
    // ----- Draw Cut: the draw flash out of the token's side, a flare at its tip. -----
    draw(e) {
      const a = sawThen(e) ? at(e.at) : null; if (!a) return false;
      const b = at(e.to || K.posOf(e.target)), v = b ? unitVec(a, b) : { x: 1, y: 0 };
      const st = { x: a.x - v.x * a.s * 0.1, y: a.y + a.s * 0.12 }, end = { x: a.x + v.x * a.s * 0.85, y: a.y + v.y * a.s * 0.85 };
      const { s } = overlay([st, end], a.s * 0.4, 460, 'draw');
      const n = el('path', { d: pathD([st, end]), stroke: WHITE, 'stroke-width': Math.max(3, a.s * 0.08), 'stroke-linecap': 'round' }); s.appendChild(n);
      drawOn(n, Math.hypot(end.x - st.x, end.y - st.y), 120, 80, 240);
      burst('flare', end, a.s * 0.9, 300, { color: '#FFF3C4', from: 0.3, to: 1.1, blend: 'screen', delay: rm() ? 0 : 100 });
      play('sg_sharpen', a);
      return true;
    },
    // ----- Ambush: the user snaps in out of hiding with a dark streak, a flash on the target. -----
    ambush(e) {
      const a = sawThen(e) ? at(e.at) : null, b = at(e.to || K.posOf(e.target)); let drawn = false;
      if (a && b) {
        const v = unitVec(a, b), st = { x: a.x - v.x * a.s * 0.9, y: a.y - v.y * a.s * 0.9 };
        const { s } = overlay([st, b], a.s * 0.4, 420, 'ambush');
        const n = el('path', { d: pathD([st, { x: b.x - v.x * b.s * 0.4, y: b.y - v.y * b.s * 0.4 }]), stroke: '#0A0D13', 'stroke-width': Math.max(5, a.s * 0.18), 'stroke-linecap': 'round', opacity: 0.85 }); s.appendChild(n);
        const n2 = el('path', { d: n.getAttribute('d')!, stroke: WHITE, 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0.8 }); s.appendChild(n2);
        drawOn(n, Math.hypot(b.x - st.x, b.y - st.y), 140, 60, 220); drawOn(n2, Math.hypot(b.x - st.x, b.y - st.y), 140, 60, 220);
        const tok = tokOf(e.unit, e.at); if (tok && !rm()) anim(tok, [{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' });
        drawn = true;
      }
      if (b) {
        burst('flash_crit', b, b.s * 1.3, 320, { color: '#FFFFFF', from: 0.4, to: 1.2, blend: 'screen', delay: a ? 120 : 0 });
        if (e.bare && a) { const { s, box } = overlay([a, b], a.s, 520, 'ambush-grab'); s.innerHTML = linkMarkup(a, b, a.s, true); fadeBox(box, 340, 180); }
        if (!drawn) { const { box } = overlay([b], b.s * 0.5, 320, 'ambush'); fadeBox(box, 320); }
        drawn = true;
      }
      if (drawn) play('whiz', a || b, { rate: 0.6 });
      return drawn;
    },
    // ----- Break: jagged cracks burst across the target, a flash, the screen jolts; Blunt: ARMOUR 0. -----
    break(e) {
      const b = at(e.to || K.posOf(e.target)); if (!b) return false;
      const { s } = overlay([b], b.s * 1.1, 620, 'break');
      for (let i = 0; i < 5; i++) {
        const ang = (i * 72 + 17) * Math.PI / 180, pts = [{ x: b.x, y: b.y }]; let r = 0;
        for (let k = 1; k <= 3; k++) { r += b.s * (0.18 + 0.06 * ((i + k) % 2)); const j = (k % 2 ? 1 : -1) * 0.28; pts.push({ x: b.x + Math.cos(ang + j) * r, y: b.y + Math.sin(ang + j) * r }); }
        const n = el('path', { d: pathD(pts), stroke: WHITE, 'stroke-width': Math.max(2, b.s * 0.05), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }); s.appendChild(n);
        drawOn(n, lenOf(pts), 120, 200, 280);
      }
      burst('flash_star', b, b.s * 1.4, 320, { color: '#FFFFFF', from: 0.4, to: 1.2, blend: 'screen' });
      burst('spark_burst', b, b.s * 1.2, 340, { color: '#FFF3C4', from: 0.4, to: 1.3, delay: 40 });
      shakeScreen(0.35);
      if (e.armour) floatText('ARMOUR 0', { x: b.x, y: b.y + b.s * 0.55, s: b.s }, MUTED, { small: true, ms: 760, delay: 120 });
      play('el_shatter', b, { gain: 0.8 });
      return true;
    },
    // ----- Charge: dash lines along the run behind the runner, a puff of dust where it began. -----
    charge(e) {
      const route: string[] = e.route || [];
      // a Hidden (or unseen) charger gives nothing away: no trail, no dust where it began (its own move shows what is seen)
      if (!sawThen(e)) return false;
      if (route.length < 2) { const p = at(e.at); if (p) { dustAt(p, 0.9); const { box } = overlay([p], p.s * 0.5, 300, 'charge'); fadeBox(box, 300); return true; } return false; }
      const runs = seenRuns(at, route); if (!runs.length) return false;
      const p0 = at(route[0]); if (p0) dustAt(p0, 1);
      const per = Math.min(450, 115 * (route.length - 1)) / Math.max(1, route.length - 1);
      for (const run of runs) {
        if (run.length < 2) continue;
        const { s } = overlay(run, run[0].s * 0.5, per * route.length + 520, 'charge'), v = unitVec(run[0], run[run.length - 1]), nx = -v.y, ny = v.x;
        for (const o of [-0.2, 0.2]) {
          const pts = run.map((p) => ({ x: p.x + nx * p.s * o, y: p.y + ny * p.s * o }));
          const n = el('path', { d: pathD(pts), stroke: FOOT, 'stroke-width': Math.max(2, run[0].s * 0.06), 'stroke-linecap': 'round', fill: 'none', opacity: 0.9 }); s.appendChild(n);
          drawOn(n, lenOf(pts), per * (run.length - 1), 80, 380);
        }
      }
      return true;
    },
  };
  /** Cleave: a white cut that runs from the first target through each extra, in order, with rounded joins. */
  function cleave(e: any): boolean {
    const tiles: string[] = e.tiles || [], runs = seenRuns(at, tiles), u = at(e.at); let drawn = false;
    for (const run of runs) {
      const pts = run.length === 1 && u ? [{ x: run[0].x + (u.x - run[0].x) * 0.2 - (run[0].y - u.y) * 0.25, y: run[0].y + (u.y - run[0].y) * 0.2 + (run[0].x - u.x) * 0.25 }, { x: run[0].x - (run[0].y - u.y) * -0.25, y: run[0].y + (run[0].x - u.x) * -0.25 }] : run.map((p) => ({ x: p.x, y: p.y }));
      // bow each segment toward the user: the swing's arc
      const curved: { x: number; y: number }[] = [];
      pts.forEach((p, i) => { if (i && u) { const q = pts[i - 1], m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; curved.push({ x: m.x + (u.x - m.x) * 0.22, y: m.y + (u.y - m.y) * 0.22 }); } curved.push(p); });
      const { s } = overlay(curved, run[0].s * 0.6, 640, 'cleave');
      const n = el('path', { d: pathD(curved), stroke: WHITE, 'stroke-width': Math.max(4, run[0].s * 0.14), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none', opacity: 0.95 }); s.appendChild(n);
      drawOn(n, lenOf(curved), 160, 60, 320);
      drawn = true;
    }
    if (drawn) play('swish', u || at(tiles[0]), { rate: 0.75, gain: 0.85 });
    return drawn;
  }
  /** A tapered trail along a path (its seen runs), fading, with a chevron the way it went. */
  function trail(path: string[], color: string, tag: string): boolean {
    let drawn = false;
    for (const run of seenRuns(at, path)) {
      if (run.length < 2) continue;
      const { s } = overlay(run, run[0].s * 0.6, 640, tag), w = Math.max(4, run[0].s * 0.16);
      for (let i = 1; i < run.length; i++) {
        const a = run[i - 1], b = run[i], v = unitVec(a, b), nx = -v.y, ny = v.x, wa = w * (0.25 + 0.75 * ((i - 1) / Math.max(1, run.length - 1))), wb = w * (0.25 + 0.75 * (i / Math.max(1, run.length - 1)));
        const poly = el('path', { d: pathD([{ x: a.x + nx * wa / 2, y: a.y + ny * wa / 2 }, { x: b.x + nx * wb / 2, y: b.y + ny * wb / 2 }, { x: b.x - nx * wb / 2, y: b.y - ny * wb / 2 }, { x: a.x - nx * wa / 2, y: a.y - ny * wa / 2 }]) + ' Z', fill: color, opacity: 0.55 }); s.appendChild(poly);
      }
      const last = run[run.length - 1], dir = unitVec(run[run.length - 2], last);
      chevrons(s, { x: last.x + dir.x * last.s * 0.35, y: last.y + dir.y * last.s * 0.35 }, dir, last.s * 0.32, color, 2);
      anim(s, rm() ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0.2 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.45 }, { opacity: 0 }], { duration: 600, fill: 'forwards' });
      drawn = true;
    }
    return drawn;
  }
  /** The weapon's icon spins along a shallow arc from one tile to another, then drops into the pile there. */
  function flyWeapon(weapon: string | undefined, fromK: string, toK: string, delay: number, land: boolean, quiet = false): boolean {
    const a = at(fromK), b = at(toK); if (!b) return false;
    const size = b.s * 0.95;
    const run = () => {
      const fly = !!a && !rm(), dist = a ? Math.hypot(b.x - a.x, b.y - a.y) : 0, ft = fly ? Math.max(140, Math.min(380, dist / 0.9)) : 0;
      const img = weaponImg(weapon, size), box = put(img, b, size, size, ft + 520);
      box.setAttribute('data-melee-fx', 'throw'); box.style.zIndex = '3';
      const frames: Keyframe[] = [];
      if (fly) {
        const hgt = Math.min(b.s * 0.9, dist * 0.22), ang0 = (Math.atan2(b.y - a!.y, b.x - a!.x) * 180) / Math.PI;
        for (let i = 0; i <= 6; i++) { const t = i / 6, x = (a!.x - b.x) * (1 - t), y = (a!.y - b.y) * (1 - t) - Math.sin(Math.PI * t) * hgt; frames.push({ transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (ang0 + t * 540).toFixed(0) + 'deg)', opacity: 1, offset: (t * ft) / (ft + 520) }); }
      }
      if (fly) {
        frames.push({ transform: 'translate(0,' + (b.s * 0.12).toFixed(1) + 'px) rotate(560deg) scale(.85)', opacity: 1, offset: (ft + 200) / (ft + 520) });
        frames.push({ transform: 'translate(0,' + (b.s * 0.25).toFixed(1) + 'px) rotate(560deg) scale(.7)', opacity: 0, offset: 1 });
      } else { box.style.transform = 'rotate(-30deg) scale(.85)'; frames.push({ opacity: 1 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }); } // reduced motion: it lies in the pile and fades
      anim(box, frames, { duration: ft + 520, easing: 'linear', fill: 'forwards' });
      if (a && !quiet) play('swish', a, { rate: 0.8 });
      if (land) after(() => { dustAt({ x: b.x, y: b.y, s: b.s }, 0.6); play('hit_wood', b, { rate: 1.3, gain: 0.35 }); }, ft + 200);
    };
    if (delay) after(run, delay); else run();
    return true;
  }
  const sawThen = K.sawThen;
  markTok = K.tokOf;
  // A Thrown Flurry's flight rides each of its thrown shots (meleePrepass marks them _fly): the shot plays (fx/play.ts
  // dispatches 'phc-fx' with the event as played), then the weapon flies from the thrower to the tile shot at.
  flyOnShot = (x: any) => { const f = x?._fly; if (x?.k !== 'shot' || !f) return; const drawn = flyWeapon(f.weapon, x.from, f.land || x.to, 0, !!f.land, true); record('flurry', 'flurry-throw', drawn); }; // quiet: the shot plays its own swish
  return {
    melee_fx(e: any) {
      if (e.refused) return;
      const f = beats[String(e.beat)];
      let drawn = false;
      try { drawn = !!f && f(e); } finally { record(String(e.id || ''), String(e.beat || ''), drawn); }
    },
  };
}

// ---------- the standing layer: lasting states ----------
export interface MeleeMark {
  key: string; kind: 'bind' | 'grapple' | 'nailed' | 'guard' | 'feint';
  /** the holder's (or the marked unit's) tile, and the other end for a link */ a: string; b?: string;
  unit: string; other?: string; weapon?: string | null; ap?: number; front?: number[]; heavy?: boolean; reach?: boolean;
}
const cheb = (a: string, b: string) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };
/** The lasting states on the grid now (pure, from the saved state). seen: the tiles the squad sees (null: all). A unit
 *  of the viewer's side is always seen; another only on a seen tile and not hidden. A link needs both ends seen. */
export function meleeMarksOf(g: GameState | null | undefined, seen?: Set<string> | null, side: 'pc' | 'foe' = 'pc'): MeleeMark[] {
  const cb = g?.combat as any; if (!cb || !Array.isArray(cb.units)) return [];
  const units: any[] = cb.units, byId = new Map(units.map((u) => [u.id, u]));
  const live = (u: any) => !!u && !u.dead && !u.downed && !!u.pos;
  const sees = (u: any) => live(u) && (u.side === side || (!u.hidden && (!seen || seen.has(u.pos))));
  const out: MeleeMark[] = [];
  let stamp = '';
  try { stamp = String((phys as any).turnStamp(cb)); } catch { stamp = ''; }
  for (const u of units) {
    if (!live(u)) continue;
    const bind = u.tech?.bind;
    if (bind?.target) { const t = byId.get(bind.target); if (live(t) && cheb(u.pos, t.pos) <= 1 && sees(u) && sees(t)) out.push({ key: 'bind|' + u.id + '|' + t.id, kind: 'bind', a: u.pos, b: t.pos, unit: u.id, other: t.id }); }
    const gby = u.condBy?.grappled;
    if (gby && (u.conds?.grappled || 0) > 0) { const h = byId.get(gby); if (live(h) && sees(u) && sees(h)) out.push({ key: 'grapple|' + h.id + '|' + u.id, kind: 'grapple', a: h.pos, b: u.pos, unit: h.id, other: u.id }); }
    if (u.nailed && sees(u)) out.push({ key: 'nailed|' + u.id + '|' + (u.nailed.weapon || ''), kind: 'nailed', a: u.pos, unit: u.id, weapon: u.nailed.weapon || null, ap: u.nailed.ap });
    const gd = u.tech?.guard;
    if (gd?.on && sees(u)) out.push({ key: 'guard|' + u.id + '|' + (gd.front || []).join(','), kind: 'guard', a: u.pos, unit: u.id, front: gd.front || [1, 0], heavy: !!gd.heavy, reach: !!gd.reach });
    const su = u.setUp;
    if (su && su.label === 'Feint' && (!stamp || su.t === stamp) && su.target) { const t = byId.get(su.target); if (live(t) && sees(u) && sees(t)) out.push({ key: 'feint|' + u.id + '|' + t.id, kind: 'feint', a: t.pos, unit: u.id, other: t.id }); }
  }
  return out;
}

interface MarkNode { m: MeleeMark; g: SVGGElement; sig: string }
const marks = new Map<string, MarkNode>();
let root: SVGSVGElement | null = null, raf = 0;
/** The kit's token finder (fx/play.ts tokOf: a stopped walker's copy, else the token on the unit's tile), set when the
 *  handlers are built: a mark is drawn where its unit's token is on screen, so a token that moves carries its mark. */
let markTok: MeleeKit['tokOf'] | null = null;
/** A Thrown Flurry's flight on each of its shots (set with the handlers). */
let flyOnShot: ((x: any) => void) | null = null;
if (typeof window !== 'undefined') window.addEventListener('phc-fx', (ev: Event) => { try { flyOnShot?.((ev as CustomEvent).detail); } catch { /* */ } });
/** The one SVG the standing marks are drawn in (the whole viewport, in viewport pixels). */
function rootSvg(): SVGSVGElement | null {
  const layer = layerEl(); if (!layer) return null;
  if (root && root.isConnected && root.parentElement === layer) return root;
  root = document.createElementNS(NS, 'svg') as SVGSVGElement;
  root.setAttribute('data-melee-marks', ''); root.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:visible;pointer-events:none;z-index:1;filter:' + CASING;
  layer.appendChild(root); return root;
}
/** The ids at a mark's two ends (a Feint's mark stands on its target). */
const endIds = (m: MeleeMark): [string | undefined, string | undefined] => (m.kind === 'feint' ? [m.other, undefined] : [m.unit, m.other]);
/** Where a mark's end is on screen: the centre of its unit's token (where it really stands, held or walking), else the
 *  tile's centre; s is the tile's size either way. */
function endAt(id: string | undefined, key: string): Pt | null {
  const c = centre(key), tok = id && markTok ? markTok(id, key) : null;
  if (!tok || !tok.isConnected) return c;
  const r = tok.getBoundingClientRect(); if (!(r.width > 0)) return c;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: c ? c.s : Math.max(18, r.width) };
}
function drawMark(n: MarkNode): boolean {
  const [ia, ib] = endIds(n.m), a = endAt(ia, n.m.a), b = n.m.b ? endAt(ib, n.m.b) : null; if (!a || (n.m.b && !b)) return false;
  // Rebuilt only when it moved or changed (review fix: it was rebuilt every frame, the nailed weapon's 7 images with it).
  const sig = [a.x, a.y, a.s, b?.x, b?.y].map((v) => (v == null ? '' : v.toFixed(1))).join('|') + '|' + n.m.key + '|' + (n.m.ap ?? '') + '|' + (n.m.front || []).join(',') + (n.m.heavy ? 'h' : '') + (n.m.reach ? 'r' : '');
  if (sig === n.sig) return true;
  n.sig = sig;
  const s = a.s;
  if (n.m.kind === 'bind' || n.m.kind === 'grapple') n.g.innerHTML = linkMarkup(a, b!, s, n.m.kind === 'grapple');
  else if (n.m.kind === 'guard') n.g.innerHTML = guardMarkup(a, s, n.m.front || [1, 0], { heavy: n.m.heavy, reach: n.m.reach });
  else if (n.m.kind === 'feint') n.g.innerHTML = bracketsMarkup(a, s, 0.92);
  else if (n.m.kind === 'nailed') {
    // the weapon stuck in the token at 35°, its grip standing out of the top right (a dark outline under the white ink)
    const z = s * 0.9, x = a.x + s * 0.2, y = a.y - s * 0.22, img = (ink: string, dx: number, dy: number) => '<image href="' + gearIconUri(n.m.weapon, ink) + '" x="' + (x - z / 2 + dx).toFixed(1) + '" y="' + (y - z / 2 + dy).toFixed(1) + '" width="' + z.toFixed(1) + '" height="' + z.toFixed(1) + '" transform="rotate(35 ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
    n.g.innerHTML = (n.m.weapon && hasGearIcon(n.m.weapon)
      ? [[-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5], [1, 1], [-1, -1]].map(([dx, dy]) => img('#0A0D13', dx, dy)).join('') + img('#FFFFFF', 0, 0)
      : '<path d="M' + (a.x - s * 0.16) + ' ' + (a.y - s * 0.16) + ' L' + (a.x + s * 0.16) + ' ' + (a.y + s * 0.16) + ' M' + (a.x + s * 0.16) + ' ' + (a.y - s * 0.16) + ' L' + (a.x - s * 0.16) + ' ' + (a.y + s * 0.16) + '" stroke="' + FORCE + '" stroke-width="' + Math.max(2.5, s * 0.07).toFixed(1) + '" stroke-linecap="round"/>')
      + (n.m.ap ? '<text x="' + (a.x + s * 0.3).toFixed(1) + '" y="' + (a.y + s * 0.44).toFixed(1) + '" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="' + Math.max(8, s * 0.2).toFixed(1) + '" fill="' + FORCE + '" stroke="#0A0D13" stroke-width="2.5" paint-order="stroke" text-anchor="middle">' + n.m.ap + ' AP</text>' : '');
  }
  return true;
}
function track() {
  raf = 0;
  for (const n of marks.values()) { const ok = drawMark(n), op = ok ? '' : '0'; if (n.g.style.opacity !== op) n.g.style.opacity = op; }
  if (marks.size) raf = requestAnimationFrame(track);
}
/** Take a mark away (a link tears, the rest fade; a nailed weapon drops into the pile). */
function goneMark(k: string, n: MarkNode, animate = true) {
  marks.delete(k);
  if (!n.g.isConnected) return;
  n.g.removeAttribute('data-melee-mark'); n.g.setAttribute('data-melee-gone', n.m.kind);
  record(k, 'unmark:' + n.m.kind, true);
  if (!animate) { n.g.remove(); return; }
  const frames: Keyframe[] = reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }]
    : n.m.kind === 'nailed' ? [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(' + ((centre(n.m.a)?.s || 40) * 0.3).toFixed(1) + 'px)', opacity: 0 }]
      : n.m.kind === 'bind' || n.m.kind === 'grapple' ? [{ opacity: 1, strokeDasharray: 'none' }, { opacity: 0.6, offset: 0.3 }, { opacity: 0 }]
        : [{ opacity: 1 }, { opacity: 0 }];
  const a = anim(n.g, frames, { duration: n.m.kind === 'nailed' ? 240 : 200, easing: 'ease-in', fill: 'forwards' });
  const g = n.g; if (a) a.onfinish = () => g.remove(); else g.remove();
  setTimeout(() => g.remove(), 1500);
}
/** A beat that ends a lasting state as it plays (Throw Down tears the hold it threw from): its mark goes now, with no
 *  fade of its own (the beat draws the tear). */
function dropMarks(pred: (m: MeleeMark) => boolean) { for (const [k, n] of [...marks]) if (pred(n.m)) goneMark(k, n, false); }
/** Keep the standing marks in step with the state: add new ones (they rise in), remove gone ones. Never in the effects
 *  queue: FxLayer.tsx calls this only once the queue has played what the state already holds (review fix: the marks
 *  showed with the state, ahead of the beats that make them, and on tiles a held walker hadn't reached). */
export function syncMeleeMarks(items: MeleeMark[]) {
  const want = new Map(items.map((m) => [m.key, m]));
  for (const [k, n] of [...marks]) if (!(want.has(k) && n.g.isConnected)) goneMark(k, n);
  const s = want.size ? rootSvg() : root;
  if (s) for (const [k, m] of want) {
    const had = marks.get(k); if (had) { had.m = m; continue; }
    const g = document.createElementNS(NS, 'g') as SVGGElement; g.setAttribute('data-melee-mark', m.kind); g.setAttribute('data-unit', m.unit);
    s.appendChild(g); const n: MarkNode = { m, g, sig: '' }; marks.set(k, n); drawMark(n);
    record(k, 'mark:' + m.kind, true);
    if (!reducedMotion()) anim(g, [{ opacity: 0 }, { opacity: 1 }], { duration: 180, fill: 'backwards' });
  }
  if (marks.size && !raf && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(track);
}
/** Drop every standing mark (leaving the room, a hidden tab). */
export function clearMeleeMarks() { for (const n of marks.values()) n.g.remove(); marks.clear(); root?.remove(); root = null; }
/** How many standing marks are up (tests). */
export const meleeMarkCount = () => marks.size;
