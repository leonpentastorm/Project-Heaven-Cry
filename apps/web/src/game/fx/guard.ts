// GUARD on the fight map (Guard 2.0, slice 1; rules 1.56 Guard 2.0, item 4300). Leon, 15 Nov 2026: "even with a shield
// it's just 10 more fake hp a turn" (his words of the time; the pool's size and a plate's soak are the data's,
// techniques.json rules.guard max and soak, which the 'guard' event's max and soaked carry: this file types neither).
// Guard is drawn as plates around the token, one per point of Guard, in Body's amber
// (#F2A54A) and always with a word or a number:
//   standing   the plates the unit holds now, the empty slots of its pool faint (melee-techniques.ts's standing layer
//              draws them: guardMarkup below, with the Guard stance's front arc, so one copy)
//   gain       the new plates slide in from outside and lock, "+N GUARD"                 why: gain
//   soak       the plates that ate the hit flash white and fly off as line shards, a clang, "BLOCKED N"  why: soak
//   pressure   the plates spent dim and drop, "−N GUARD"                                 why: pressure
//   spend      the plates spent dim and drop, no word (the order spending them draws its own)  why: spend
//   broken     the last plate went to a blow or to Pressure: the ring cracks and its pieces fly, "GUARD BROKEN"
// The engine's 'guard' event says all of it ({unit, at, was, now, max, why, soaked}, physical/core.ts guardFx); the
// screen decides nothing. Every duration goes through dom.ts (the combat speed); Reduce motion keeps the words and
// fades the plates in place. The soak comes after the blow's own event in the queue, so the blow lands first.
import type { FxEvent } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { type Pt, after, anim, floatText, lunge, put, ring, shake, svg, trace } from './dom';

export const GUARD_INK = '#F2A54A';
const WHITE = '#FFFFFF', MUTED = '#A3AEC2', GROUND = '#0A0D13';
const CASING = 'drop-shadow(0 0 1px #0A0D13) drop-shadow(0 0 2.5px rgba(10,13,19,.85))';
/** How long each Guard moment holds the stage (ms at Fast). */
export const GUARD_MS = { gain: 420, soak: 460, broken: 620, spend: 260 } as const;

export type GuardMoment = 'gain' | 'soak' | 'broken' | 'pressure' | 'spend';
/** What a 'guard' event is on screen (pure, for the tests), or null for anything else. */
export function guardFxOf(e: Partial<FxEvent> & { k: string }): GuardMoment | null {
  if (e.k !== 'guard') return null;
  const was = Number(e.was) || 0, now = Number(e.now) || 0;
  if (now > was) return 'gain';
  if (now === was) return null;
  if (now === 0 && (e.why === 'soak' || e.why === 'pressure')) return 'broken';
  if (e.why === 'soak') return 'soak';
  if (e.why === 'pressure') return 'pressure';
  return 'spend';
}
// ---------- the door's moves (rules 1.56 Guard 2.0, slice 1: skills.json durability.1, each op's `fx`) ----------
/** The moves of Durability's door the engine marks with a 'guard_move' event ({target: the tank, other: the ally, the
 *  attacker or nobody, from: that unit's tile, move}). */
export type GuardMove = 'crit_turned' | 'close_guard' | 'last_plate' | 'retort' | 'challenge' | 'slam';
export const GUARD_MOVE_MS: Record<GuardMove, number> = { crit_turned: 420, close_guard: 380, last_plate: 640, retort: 380, challenge: 520, slam: 480 };
/** The word each move floats (always with the amber or white ink). */
export function guardMoveWord(e: Partial<FxEvent> & { k: string }): string | null {
  if (e.k !== 'guard_move') return null;
  return ({ crit_turned: 'CRIT TURNED', close_guard: 'CLOSE GUARD', last_plate: 'LAST PLATE', retort: 'RETORT', challenge: 'CHALLENGE', slam: 'SLAM' } as Record<string, string>)[String(e.move)] || null;
}
/** The beat a Guard event holds (ms at Fast), or undefined for any other event. */
export function guardBeat(e: Partial<FxEvent> & { k: string }): number | undefined {
  if (e.k === 'guard_move') return (GUARD_MOVE_MS as any)[String(e.move)] ?? 0;
  const m = guardFxOf(e); if (!m) return e.k === 'guard' ? 0 : undefined;
  return m === 'pressure' ? GUARD_MS.spend : GUARD_MS[m];
}
/** The word a Guard moment shows (always paired with its colour). */
export function guardWord(e: Partial<FxEvent> & { k: string }): string | null {
  const m = guardFxOf(e), d = Math.abs((Number(e.now) || 0) - (Number(e.was) || 0));
  if (m === 'gain') return '+' + d + ' GUARD';
  if (m === 'soak') return 'BLOCKED ' + (Number(e.soaked) || 0);
  if (m === 'broken') return e.why === 'soak' && Number(e.soaked) ? 'BLOCKED ' + Number(e.soaked) + ' · GUARD BROKEN' : 'GUARD BROKEN';
  if (m === 'pressure') return '−' + d + ' GUARD';
  return null;
}

// ---------- the plates ----------
/** Where plate i of a pool of max stands. The token's own marks sit on its edges (the Pressure pips and the Shadow wisps
 *  on top, the Momentum chip on the left, the Sigil chip on the right, the HP bar along the bottom), so the plates keep to
 *  the four corner windows between them (0.29 integration: the plates never cover another mark), the top two first, a
 *  window's plates side by side when the pool holds more than four. Rules 1.59 (T5: the Bulwark's pool grows to the
 *  data's max_by_rank, 7 at rank III): past four the windows open as wide as the other marks allow (WIDE), so two plates
 *  side by side still read as plates. `front` is kept for the callers; the windows don't turn. */
const RING = 0.66, GAP = 4; // the plates' radius (in tiles) and the gap between two plates in one window (degrees)
const WINDOWS = [-34, -146, 34, 146], WIN_HALF = 9; // the windows' centres (degrees: top right, top left, bottom right, bottom left) and half-width
/** The windows past four plates: [from, to] in degrees, each kept clear of the top pips, the side chips and the HP bar. */
const WIDE: [number, number][] = [[-48, -20], [-160, -132], [24, 51], [129, 156]];
function plateArc(p: { x: number; y: number }, s: number, i: number, max: number, _front: number[] | null, r = RING): { d: string; mid: { x: number; y: number }; a0: number; a1: number } {
  const m = Math.max(1, max), w = i % WINDOWS.length, inWin = Math.ceil((m - w) / WINDOWS.length), k = Math.floor(i / WINDOWS.length);
  const [from, to] = m > WINDOWS.length ? WIDE[w] : [WINDOWS[w] - WIN_HALF, WINDOWS[w] + WIN_HALF];
  const rad = Math.PI / 180, span = (to - from - GAP * (inWin - 1)) / Math.max(1, inWin), lo = from + k * (span + GAP);
  const a0 = lo * rad, a1 = (lo + Math.max(2, span)) * rad, mid = (a0 + a1) / 2, R = s * r;
  const x0 = p.x + Math.cos(a0) * R, y0 = p.y + Math.sin(a0) * R, x1 = p.x + Math.cos(a1) * R, y1 = p.y + Math.sin(a1) * R;
  return { d: 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + R.toFixed(1) + ' ' + R.toFixed(1) + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1), mid: { x: p.x + Math.cos(mid) * R, y: p.y + Math.sin(mid) * R }, a0, a1 };
}
/** The plates as SVG: n held (amber, thick), the rest of the pool's max as faint slots. */
export function platesMarkup(p: { x: number; y: number }, s: number, n: number, max: number, front: number[] | null = null, ink = GUARD_INK): string {
  let out = '';
  const m = Math.max(n, max);
  for (let i = 0; i < m; i++) {
    const a = plateArc(p, s, i, m, front);
    out += i < n
      ? '<path data-plate="' + i + '" d="' + a.d + '" stroke="' + ink + '" stroke-width="' + Math.max(3.5, s * 0.11).toFixed(1) + '" stroke-linecap="butt" fill="none"/>'
      : '<path data-slot="' + i + '" d="' + a.d + '" stroke="' + MUTED + '" stroke-width="' + Math.max(1, s * 0.03).toFixed(1) + '" stroke-dasharray="2 3" fill="none" opacity=".55"/>';
  }
  // the count, small, past the token's bottom-right corner (clear of the HP bar): the number is the meaning, the colour only pairs with it
  if (n > 0) out += '<text x="' + (p.x + s * 0.6).toFixed(1) + '" y="' + (p.y + s * 0.66).toFixed(1) + '" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="' + Math.max(8, s * 0.2).toFixed(1) + '" fill="' + ink + '" stroke="' + GROUND + '" stroke-width="2.5" paint-order="stroke" text-anchor="middle">⛨' + n + '</text>';
  return out;
}
/** The standing Guard look (one copy: melee-techniques.ts's standing layer draws it): the plates of the pool, and the
 *  Guard stance's front arc (Heavy's second arc and Reach's dotted ring) when the stance is up. */
export function guardMarkup(p: { x: number; y: number }, s: number, front: number[] | null, o: { heavy?: boolean; reach?: boolean; stance?: boolean; plates?: number; max?: number } = {}): string {
  const stance = o.stance !== false && !!front;
  let out = (o.max || o.plates) ? platesMarkup(p, s, o.plates || 0, o.max || 0) : ''; // the plates always start at the top (as the moments draw them)
  if (stance) {
    const ang = Math.atan2(front![1] || 0, front![0] || 1), half = (50 * Math.PI) / 180;
    const arc = (r: number, w: number, op: number) => {
      const a0 = ang - half, a1 = ang + half, x0 = p.x + Math.cos(a0) * r, y0 = p.y + Math.sin(a0) * r, x1 = p.x + Math.cos(a1) * r, y1 = p.y + Math.sin(a1) * r;
      return '<path d="M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" stroke="' + GUARD_INK + '" stroke-width="' + w.toFixed(1) + '" stroke-linecap="round" fill="none" opacity="' + op + '"/>';
    };
    // with plates the stance arc stands outside them; alone it is where it always was
    const r0 = o.max || o.plates ? 0.74 : 0.6;
    out += arc(s * r0, Math.max(o.max || o.plates ? 2 : 3.5, s * (o.max || o.plates ? 0.05 : 0.12)), 1) + (o.heavy ? arc(s * (r0 + 0.12), Math.max(1.5, s * 0.04), 0.8) : '')
      + (o.reach ? '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (s * 1.5).toFixed(1) + '" fill="none" stroke="' + GUARD_INK + '" stroke-width="1.5" stroke-dasharray="3 5" opacity=".7"/>' : '');
  }
  return out;
}

// ---------- the moments ----------
export interface GuardKit {
  at: (k: string | null | undefined) => Pt | null;
  /** the token of a unit (the acting token moves first) */ tokOf?: (id: string | null | undefined) => HTMLElement | null;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number }) => void;
  /** the screen saw the unit when the event happened (play.ts sawThen) */ sawThen: (e: FxEvent) => boolean;
}
function stage(p: Pt, pad: number, ms: number): { s: SVGSVGElement; box: HTMLElement } {
  const w = pad * 2, x0 = p.x - pad, y0 = p.y - pad;
  const s = svg(w, w, ''); s.setAttribute('viewBox', x0 + ' ' + y0 + ' ' + w + ' ' + w); s.style.filter = CASING;
  const box = put(s, p, w, w, ms); box.setAttribute('data-guard-fx', ''); box.style.zIndex = '2';
  return { s, box };
}
const NS = 'http://www.w3.org/2000/svg';
function path(d: string, stroke: string, w: number, extra: Record<string, string> = {}): SVGPathElement {
  const n = document.createElementNS(NS, 'path') as SVGPathElement;
  n.setAttribute('d', d); n.setAttribute('stroke', stroke); n.setAttribute('stroke-width', w.toFixed(1)); n.setAttribute('fill', 'none'); n.setAttribute('stroke-linecap', 'round');
  for (const [k, v] of Object.entries(extra)) n.setAttribute(k, v);
  return n;
}
/** A plate's line shards: three short strokes from where it sat, flying outward and turning as they go. */
function shards(s: SVGSVGElement, p: Pt, mid: { x: number; y: number }, ink: string, ms: number, rm: boolean) {
  const ox = mid.x - p.x, oy = mid.y - p.y, l = Math.hypot(ox, oy) || 1, ux = ox / l, uy = oy / l;
  for (let j = 0; j < 3; j++) {
    const tx = -uy, ty = ux, off = (j - 1) * p.s * 0.12, cx = mid.x + tx * off, cy = mid.y + ty * off, len = p.s * 0.09;
    const n = path('M' + (cx - tx * len).toFixed(1) + ' ' + (cy - ty * len).toFixed(1) + ' L' + (cx + tx * len).toFixed(1) + ' ' + (cy + ty * len).toFixed(1), ink, Math.max(2, p.s * 0.05));
    s.appendChild(n);
    const fly = p.s * (0.35 + j * 0.08), dx = (ux + tx * (j - 1) * 0.5) * fly, dy = (uy + ty * (j - 1) * 0.5) * fly + p.s * 0.15;
    (n as any).style.transformBox = 'fill-box'; (n as any).style.transformOrigin = 'center';
    anim(n, rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + (j % 2 ? 160 : -140) + 'deg)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
  }
}
/** A straight amber line from a to b drawn out over ms (Close Guard's share, Retort's throw). */
function line(a: Pt, b: Pt, ms: number, o: { width?: number; chevron?: boolean; ink?: string } = {}) {
  const pad = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / 2 + a.s, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
  const { s } = stage({ x: cx, y: cy, s: a.s }, pad, ms + 200), ink = o.ink || GUARD_INK;
  const n = path('M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' L' + b.x.toFixed(1) + ' ' + b.y.toFixed(1), ink, o.width ?? Math.max(2, a.s * 0.05));
  const L = Math.hypot(b.x - a.x, b.y - a.y) || 1; n.setAttribute('stroke-dasharray', L.toFixed(1)); s.appendChild(n);
  anim(n, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ strokeDashoffset: L, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.45 }, { strokeDashoffset: 0, opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  if (o.chevron) { // a chevron at b, pointing along the line
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, k = a.s * 0.16, bx = b.x - ux * a.s * 0.3, by = b.y - uy * a.s * 0.3;
    const c = path('M' + (bx - ux * k - uy * k).toFixed(1) + ' ' + (by - uy * k + ux * k).toFixed(1) + ' L' + bx.toFixed(1) + ' ' + by.toFixed(1) + ' L' + (bx - ux * k + uy * k).toFixed(1) + ' ' + (by - uy * k - ux * k).toFixed(1), ink, Math.max(2.5, a.s * 0.07));
    s.appendChild(c); anim(c, [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
  }
}
/** Every plate slot of the token flashing at once (Set Against the Blow, Last Plate): white, then amber, then gone. */
function flare(p: Pt, n: number, ms: number, ink = WHITE) {
  const { s } = stage(p, p.s * 0.9, ms + 120);
  for (let i = 0; i < n; i++) { const a = plateArc(p, p.s, i, n, null), q = path(a.d, ink, Math.max(4, p.s * 0.13), { 'stroke-linecap': 'butt' }); s.appendChild(q);
    anim(q, [{ opacity: 0 }, { opacity: 1, stroke: ink, offset: 0.2 }, { opacity: 1, stroke: GUARD_INK, offset: 0.55 }, { opacity: 0 }], { duration: ms, fill: 'forwards' }); }
}
export function guardHandlers(K: GuardKit): Record<string, (e: FxEvent) => void> {
  return {
    guard_move(e) {
      const mv = String(e.move) as GuardMove, ms = GUARD_MOVE_MS[mv]; if (!ms || !K.sawThen(e)) return;
      const p = K.at(e.at), o = K.at((e as any).from); if (!p) return;
      const word = guardMoveWord(e), rm = reducedMotion(), tok = K.tokOf?.(e.target as string) || null;
      trace('guard_move', { move: mv, unit: e.target, other: (e as any).other || null });
      const toward = (q: Pt | null, d: number) => { if (q && tok && !rm) { const L = Math.hypot(q.x - p.x, q.y - p.y) || 1; lunge(tok, ((q.x - p.x) / L) * d, ((q.y - p.y) / L) * d, Math.round(ms * 0.4)); } };
      if (mv === 'crit_turned') { flare(p, 4, ms); if (!rm) shake(tok, 0.4); K.play('hit_metal', p, { rate: 0.9, gain: 0.5 }); }
      else if (mv === 'close_guard') { toward(o, 3); if (o) line(o, p, ms); K.play('hit_metal', p, { rate: 1.4, gain: 0.3 }); }
      else if (mv === 'retort') { toward(o, 4); if (o) after(() => line(p, o, Math.round(ms * 0.7), { chevron: true, width: Math.max(2.5, p.s * 0.07) }), Math.round(ms * 0.25)); K.play('hit_heavy', p, { rate: 1.3, gain: 0.4 }); }
      else if (mv === 'last_plate') { flare(p, 5, ms); ring(p, WHITE, ms, { from: 0.55, to: 0.62, width: 2 }); if (!rm) shake(tok, 0.8); K.play('hit_metal', p, { rate: 0.6, gain: 0.6 }); }
      else if (mv === 'challenge') { if (tok && !rm) lunge(tok, 0, -2, 160); const r = Number((e as any).within) || 2; ring(p, GUARD_INK, ms, { from: 0.4, to: 0.4 + r * 0.95, width: 3 }); K.play('hit_heavy', p, { rate: 0.8, gain: 0.35 }); }
      else if (mv === 'slam') { if (tok && !rm) lunge(tok, 0, 3, 160); ring(p, GUARD_INK, ms, { from: 0.5, to: 1.5, width: 4 }); flare(p, 6, Math.round(ms * 0.7), GUARD_INK); K.play('hit_heavy', p, { rate: 0.7, gain: 0.6 }); }
      if (word) floatText(word, { x: p.x, y: p.y - p.s * 0.6, s: p.s }, mv === 'last_plate' || mv === 'crit_turned' ? WHITE : GUARD_INK, { small: mv !== 'last_plate', delay: 40, ms: 900 });
    },
    guard(e) {
      const m = guardFxOf(e); if (!m || !K.sawThen(e)) return;
      const p = K.at(e.at); if (!p) return;
      const rm = reducedMotion(), was = Number(e.was) || 0, now = Number(e.now) || 0, max = Math.max(Number(e.max) || 0, was, now), word = guardWord(e);
      trace('guard', { what: m, unit: e.unit, was, now, soaked: e.soaked || 0 });
      if (m === 'gain') {
        const { s } = stage(p, p.s * 0.9, GUARD_MS.gain + 200);
        for (let i = was; i < now; i++) {
          const a = plateArc(p, p.s, i, max, null), n = path(a.d, GUARD_INK, Math.max(3.5, p.s * 0.11), { 'stroke-linecap': 'butt' });
          s.appendChild(n); (n as any).style.transformBox = 'view-box'; (n as any).style.transformOrigin = p.x + 'px ' + p.y + 'px';
          anim(n, rm ? [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }] : [{ transform: 'scale(1.5)', opacity: 0 }, { transform: 'scale(.96)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: GUARD_MS.gain + 200, delay: (i - was) * 60, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' });
        }
        K.play('hit_metal', p, { rate: 1.7, gain: 0.25 });
      } else {
        const lost = was - now, ms = m === 'broken' ? GUARD_MS.broken : m === 'soak' ? GUARD_MS.soak : GUARD_MS.spend + 120;
        const { s } = stage(p, p.s * 1.4, ms + 120);
        // the plates that go: the outermost held ones (the last to come, the first to go), flashed white on a blow
        for (let i = now; i < was; i++) {
          const a = plateArc(p, p.s, i, max, null), hit = m === 'soak' || m === 'broken';
          const n = path(a.d, hit ? WHITE : GUARD_INK, Math.max(3.5, p.s * 0.11), { 'stroke-linecap': 'butt' }); s.appendChild(n);
          anim(n, hit ? [{ opacity: 1, stroke: WHITE }, { opacity: 1, stroke: GUARD_INK, offset: 0.25 }, { opacity: 0, offset: 0.45 }] : [{ opacity: 0.9 }, { opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
          if (hit) after(() => shards(s, p, a.mid, i % 2 ? WHITE : GUARD_INK, ms - 120, rm), 90);
        }
        if (m === 'broken') { // the ring cracks: its last ring flashes and breaks into four arcs flying apart
          for (let q = 0; q < 4; q++) {
            const a0 = q * (Math.PI / 2) + 0.2, a1 = a0 + Math.PI / 2 - 0.4, R = p.s * 0.66;
            const d = 'M' + (p.x + Math.cos(a0) * R).toFixed(1) + ' ' + (p.y + Math.sin(a0) * R).toFixed(1) + ' A' + R.toFixed(1) + ' ' + R.toFixed(1) + ' 0 0 1 ' + (p.x + Math.cos(a1) * R).toFixed(1) + ' ' + (p.y + Math.sin(a1) * R).toFixed(1);
            const n = path(d, GUARD_INK, Math.max(2, p.s * 0.05)); s.appendChild(n);
            const mid = (a0 + a1) / 2, fly = p.s * 0.45;
            anim(n, rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (Math.cos(mid) * fly).toFixed(1) + 'px,' + (Math.sin(mid) * fly + p.s * 0.2).toFixed(1) + 'px)', opacity: 0 }], { duration: ms, delay: 120, easing: 'cubic-bezier(.3,.6,.5,1)', fill: 'both' });
          }
          K.play('hit_metal', p, { rate: 0.7, gain: 0.55 });
          K.play('hit_heavy', p, { rate: 1.2, gain: 0.3, delay: 110 });
        } else if (m === 'soak') K.play('hit_metal', p, { rate: 1.1, gain: 0.5 });
      }
      if (word) floatText(word, { x: p.x, y: p.y - p.s * 0.45, s: p.s }, m === 'gain' || m === 'soak' ? GUARD_INK : m === 'broken' ? WHITE : MUTED, { small: m !== 'broken', delay: m === 'gain' ? 0 : 60, ms: m === 'broken' ? 1100 : 900 });
    },
  };
}
