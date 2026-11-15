// THE MOMENTUM CHAIN 2.0 on the fight map (rules 1.56; docs/design/proposals/2026-11-momentum-2.0.md section 4). Leon,
// 15 Nov 2026, of the newer doors: "no effect, no animation, no nothing, feels like standing still". The engine already
// sends every moment this file draws; it decides nothing, it only draws (Strength's ink #F68A38, always with a word):
//   momentum {unit, now, was}      the token's counter pops ("x3"), drops on a loss ("x2"), doubles at full ("x5 MAX")
//   melee {unit, target, hit}      an impact ring on the target as big as the striker's Momentum after the blow (the
//                                  next `momentum` event of the same unit in the batch: noteBreaker), cracks at crack_at
//   technique {id, group, unit, target}   Charge: a chevron at the runner; Cleave: a wide arc; Break: a hexagon that
//                                  splits over its target; Coup: a vertical slash
//   shove {unit, target, from, to, path, source}  the Launch's own flight (source: the item that did it, matched to
//                                  techniques.json rules.momentum.show.launch_source; 2 tiles or more): the pusher's
//                                  heave first, then a dashed arc along the path and a landing ring, "LAUNCHED n".
//                                  Any other shove (a Gale, a knockback, a push that names no cause) is the neutral one
//   object {at, dmg, broken}       the grid gives way: line shards from the struck piece, a dust ring
//   cond {id: exposed}             a bracket over the unit, "EXPOSED"
// Sizes are data: techniques.json rules.momentum.show (ring_base, ring_per, crack_at). Under Reduce motion only the
// words and the counter's number show. Every duration goes through dom.ts (the combat speed and the tempo).
import { phys, type FxEvent } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { type Pt, after, anim, floatText, put, ring, svg, lunge, angle, trace } from './dom';

export const STRENGTH_INK = '#F68A38';
const WHITE = '#FFFFFF', MUTED = '#A3AEC2', HP = '#F65157';
/** The beats (ms at Fast): the heave before a Launch's flight, the flight, a hit's ring. */
export const BRK_MS = { heave: 140, flight: 360, ring: 240, pop: 160, smash: 420 } as const;

/** The counter's and the ring's sizes, from the data (techniques.json rules.momentum.show). */
export function breakerShow(): { counter_min: number; ring_base: number; ring_per: number; crack_at: number; launch_source: string } {
  const s = (phys as any).PHYS_RULES?.momentum?.show || {};
  return { counter_min: Number(s.counter_min ?? 1), ring_base: Number(s.ring_base ?? 0), ring_per: Number(s.ring_per ?? 0), crack_at: Number(s.crack_at ?? Infinity), launch_source: String(s.launch_source ?? '') };
}
/** The impact ring's radius for a striker's Momentum `now`, in the data's units (a tile is 40). */
export const impactRadius = (now: number): number => { const s = breakerShow(); return s.ring_base + s.ring_per * Math.max(0, now); };
/** Does a hit at this Momentum crack the ground? */
export const impactCracks = (now: number): boolean => now >= breakerShow().crack_at;
/** The word a Momentum event floats (pure): "x3" on a gain, "x5 MAX" at full, "x2" on a loss; '' for none. */
export function momentumWord(e: Partial<FxEvent> & { k: string }, max?: number | null): string {
  if (e.k !== 'momentum') return '';
  const now = Number(e.now), was = Number(e.was); if (!Number.isFinite(now) || now === was) return '';
  return 'x' + now + (now > was && max != null && now >= max ? ' MAX' : '');
}
/** Which moment an event is for this file (pure, for the tests), or null. */
export function breakerFxOf(e: Partial<FxEvent> & { k: string }): 'gain' | 'loss' | 'impact' | 'launch' | 'charge' | 'cleave' | 'break' | 'coup' | 'smash' | 'exposed' | null {
  switch (e.k) {
    case 'momentum': return Number(e.now) > Number(e.was) ? 'gain' : Number(e.now) < Number(e.was) ? 'loss' : null;
    case 'melee': return e.hit && typeof (e as any)._mom === 'number' ? 'impact' : null;
    case 'shove': { const src = breakerShow().launch_source; return e.ok && e.unit && !e.magic && !e.pull && !!src && (e as any).source === src && launchTiles(e) >= 2 ? 'launch' : null; }
    case 'technique': return (e as any).refused ? null : (['charge', 'cleave', 'break', 'coup'] as const).find((x) => x === e.id) || null;
    case 'object': return Number((e as any).dmg) > 0 || (e as any).broken ? 'smash' : null;
    case 'cond': return e.id === 'exposed' && !e.resisted ? 'exposed' : null;
    default: return null;
  }
}
/** The tiles a push moved its target: its path less the start, or 1 for a plain one. */
export const launchTiles = (e: Partial<FxEvent>): number => (Array.isArray((e as any).path) ? Math.max(0, (e as any).path.length - 1) : e.from && e.to && e.from !== e.to ? 1 : 0);
/** The beat a Launch holds the stage (ms at Fast), or undefined: everything else keeps its own. */
export function breakerBeat(e: Partial<FxEvent> & { k: string }): number | undefined {
  return breakerFxOf(e) === 'launch' ? BRK_MS.heave + BRK_MS.flight + 120 : undefined;
}
/** Before a batch plays: each melee hit learns its striker's Momentum after the blow (the next momentum event of the
 *  same unit, or none). Presentation only: the numbers are the engine's. */
export function noteBreaker(evs: FxEvent[]): FxEvent[] {
  evs.forEach((e, i) => {
    if (e.k !== 'melee' || !e.hit || !e.unit) return;
    for (let j = i + 1; j < evs.length && j < i + 12; j++) { const x = evs[j]; if (x.k === 'momentum' && x.unit === e.unit) { (e as any)._mom = Number(x.now); return; } if (x.k === 'melee' && x.unit === e.unit) return; }
  });
  return evs;
}

/** What play.ts lends these handlers. */
export interface BrkKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  maxOf: (id: string | null | undefined) => number | null;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number }) => void;
}

// ---------- pieces (pure SVG lines) ----------
function lineSvg(p: Pt, inner: string, ms: number, size = 1.6): HTMLElement { const s = svg(100, 100, inner), box = put(s, p, p.s * size, p.s * size, ms); box.style.zIndex = '3'; return box; }
/** The impact ring: a 2-unit stroke as big as the Momentum, out and fading; four radial cracks at crack_at. */
function impact(p: Pt, now: number) {
  const r = impactRadius(now), to = r / 40 / 0.64; // ring() draws r 0.64 of a tile at scale 1
  ring(p, STRENGTH_INK, BRK_MS.ring, { from: to * 0.45, to, width: 3 });
  if (impactCracks(now) && !reducedMotion()) {
    let inner = ''; for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i * Math.PI) / 2, x1 = 50 + Math.cos(a) * 22, y1 = 50 + Math.sin(a) * 22, x2 = 50 + Math.cos(a) * 44, y2 = 50 + Math.sin(a) * 44; inner += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + STRENGTH_INK + '" stroke-width="3" stroke-linecap="round"/>'; }
    const box = lineSvg(p, inner, 420); anim(box, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)', offset: 0.25 }, { opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
  }
}
/** The token's counter chip pops (scale 1.35 to 1), or drops (a loss). */
function popChip(K: BrkKit, id: string, drop: boolean) {
  const tok = K.tokOf(id, K.posOf(id)), tile = tok?.closest('[data-tile], button.phc-tok, .phc-tok') as HTMLElement | null, chip = tile?.querySelector('[data-momentum-chip]') as HTMLElement | null;
  if (!chip || reducedMotion()) return;
  anim(chip, drop ? [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(3px)', opacity: 0.5, offset: 0.5 }, { transform: 'translateY(0)', opacity: 1 }] : [{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: BRK_MS.pop, easing: 'ease-out' });
}
/** An arc around the token: one segment filled per Momentum (max segments), doubled at full. */
function arcSegments(p: Pt, now: number, max: number, ms: number) {
  if (reducedMotion() || !(max > 0)) return;
  let inner = ''; const r = 44, gap = 0.18;
  for (let i = 0; i < max; i++) {
    const a0 = -Math.PI / 2 + (i / max) * Math.PI * 2 + gap / 2, a1 = -Math.PI / 2 + ((i + 1) / max) * Math.PI * 2 - gap / 2;
    const d = (rr: number) => 'M' + (50 + Math.cos(a0) * rr).toFixed(1) + ' ' + (50 + Math.sin(a0) * rr).toFixed(1) + ' A' + rr + ' ' + rr + ' 0 0 1 ' + (50 + Math.cos(a1) * rr).toFixed(1) + ' ' + (50 + Math.sin(a1) * rr).toFixed(1);
    const on = i < now, col = on ? STRENGTH_INK : 'rgba(231,235,243,0.35)';
    inner += '<path d="' + d(r) + '" fill="none" stroke="' + col + '" stroke-width="' + (on ? 4 : 2) + '" stroke-linecap="round"/>';
    if (now >= max) inner += '<path d="' + d(r - 7) + '" fill="none" stroke="' + STRENGTH_INK + '" stroke-width="2" stroke-linecap="round"/>';
  }
  const box = lineSvg(p, inner, ms, 1.5); anim(box, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
}
/** A dashed arc along the push's path (a parabola over the line from start to landing). */
function flightArc(a: Pt, b: Pt, ms: number) {
  const x0 = Math.min(a.x, b.x) - a.s, y0 = Math.min(a.y, b.y) - a.s * 1.2, w = Math.abs(a.x - b.x) + a.s * 2, h = Math.abs(a.y - b.y) + a.s * 2.2;
  const ax = a.x - x0, ay = a.y - y0, bx = b.x - x0, by = b.y - y0, mx = (ax + bx) / 2, my = Math.min(ay, by) - a.s * 0.9;
  const s = svg(w, h, '<path d="M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1) + '" fill="none" stroke="' + STRENGTH_INK + '" stroke-width="2.5" stroke-dasharray="6 5" stroke-linecap="round"/>');
  s.setAttribute('preserveAspectRatio', 'none'); s.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
  const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms + 200); box.style.zIndex = '3';
  anim(box, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: ms + 200, fill: 'forwards' });
}
const hexagon = (r: number) => Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r]; });

/** Wrap the handlers (after physHandlers and the melee techniques; before the Figments, which wrap last). */
export function wrapBreaker(H: Record<string, (e: FxEvent) => void>, K: BrkKit) {
  const base = { momentum: H.momentum, melee: H.melee, technique: H.technique, shove: H.shove, object: H.object, cond: H.cond };
  H.momentum = (e) => {
    const id = String(e.unit || ''), p = K.at(K.posOf(id)), w = breakerFxOf(e); if (!w || !p) return;
    const max = K.maxOf(id), word = momentumWord(e, max);
    trace('breaker', { what: w, unit: id, now: e.now, was: e.was });
    popChip(K, id, w === 'loss');
    if (w === 'gain') { arcSegments(p, Number(e.now), max ?? Number(e.now), 520); floatText(word, { x: p.x, y: p.y + p.s * 0.35, s: p.s }, STRENGTH_INK, { small: !word.endsWith('MAX'), ms: 520 }); }
    else floatText(word, { x: p.x, y: p.y + p.s * 0.45, s: p.s }, MUTED, { small: true, ms: 420, rise: -0.15 });
  };
  H.melee = (e) => {
    base.melee?.(e);
    if (breakerFxOf(e) !== 'impact') return;
    const q = K.at(e.to || K.posOf(e.target)); if (!q) return;
    after(() => { impact(q, Number((e as any)._mom)); trace('breaker', { what: 'impact', unit: e.unit, now: (e as any)._mom }); }, 90);
  };
  H.technique = (e) => {
    base.technique?.(e);
    const w = breakerFxOf(e); if (!w) return;
    const p = K.at(e.at || K.posOf(e.unit)), q = K.at(K.posOf(e.target)); trace('breaker', { what: w, unit: e.unit, target: e.target });
    if (reducedMotion()) return;
    if (w === 'charge' && p) { const a = q ? angle(p, q) : 0, box = lineSvg(p, '<path d="M30 30 L50 50 L30 70 M50 30 L70 50 L50 70" fill="none" stroke="' + STRENGTH_INK + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>', 360, 0.9); box.style.rotate = a + 'rad'; anim(box, [{ opacity: 0, translate: '0 0' }, { opacity: 1, offset: 0.3 }, { opacity: 0, translate: Math.cos(a) * p.s * 0.5 + 'px ' + Math.sin(a) * p.s * 0.5 + 'px' }], { duration: 360, fill: 'forwards' }); }
    if (w === 'cleave' && p) { const box = lineSvg(p, '<path d="M14 70 A40 40 0 1 1 86 70" fill="none" stroke="' + STRENGTH_INK + '" stroke-width="4" stroke-linecap="round"/>', 420, 2.6); anim(box, [{ opacity: 0, rotate: '-60deg' }, { opacity: 1, offset: 0.3 }, { opacity: 0, rotate: '60deg' }], { duration: 420, easing: 'ease-out', fill: 'forwards' }); }
    if (w === 'break' && q) {
      const pts = hexagon(30); let inner = '';
      for (let i = 0; i < 3; i++) { const [a, b, c] = [pts[i * 2], pts[i * 2 + 1], pts[(i * 2 + 2) % 6]]; inner += '<path class="sh" d="M' + a.join(' ') + ' L' + b.join(' ') + ' L' + c.join(' ') + '" fill="none" stroke="' + WHITE + '" stroke-width="3" stroke-linejoin="round"/>'; }
      const box = lineSvg(q, inner, 520, 1.3);
      Array.from(box.querySelectorAll('.sh')).forEach((el, i) => { const a = ((i * 2 + 1) / 6) * Math.PI * 2 - Math.PI / 2; anim(el, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(0,0)', opacity: 1, offset: 0.35 }, { transform: 'translate(' + (Math.cos(a) * 12).toFixed(1) + 'px,' + (Math.sin(a) * 12).toFixed(1) + 'px)', opacity: 0 }], { duration: 520, fill: 'forwards' }); });
    }
    if (w === 'coup' && q) { const box = lineSvg(q, '<line x1="56" y1="4" x2="44" y2="96" stroke="' + WHITE + '" stroke-width="4" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>', 380, 1.3); const l = box.querySelector('line'); if (l) anim(l, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0, offset: 0.4 }, { strokeDashoffset: 0 }], { duration: 380, fill: 'forwards' }); anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 380, fill: 'forwards' }); }
  };
  H.shove = (e) => {
    if (breakerFxOf(e) !== 'launch') { base.shove?.(e); return; }
    const n = launchTiles(e), by = String(e.unit), a = K.at(e.from), b = K.at(e.to), pp = K.at(K.posOf(by)), tok = K.tokOf(by, K.posOf(by));
    trace('breaker', { what: 'launch', unit: by, target: e.target, tiles: n });
    // 1. the acting token heaves (it moves first: the player's action)
    if (tok && pp && a && !reducedMotion()) { const ang = angle(pp, a); lunge(tok, Math.cos(ang) * pp.s * 0.12, Math.sin(ang) * pp.s * 0.12 - pp.s * 0.08, BRK_MS.heave + 80); }
    K.play('hit_heavy', pp || a, { rate: 0.7, gain: 0.6 });
    // 2. the throw: the engine's own slide of the target, with its arc and a landing ring
    after(() => {
      base.shove?.(e);
      if (a && b && !reducedMotion()) flightArc(a, b, BRK_MS.flight);
      if (b) { after(() => { ring(b, STRENGTH_INK, 380, { from: 0.6, to: 1.4, width: 3 }); floatText('LAUNCHED ' + n, b, STRENGTH_INK, { small: true }); K.play('body_fall', b, { gain: 0.8 }); }, BRK_MS.flight * 0.8); }
    }, BRK_MS.heave);
  };
  H.object = (e) => {
    base.object?.(e);
    if (breakerFxOf(e) !== 'smash') return;
    const p = K.at(e.at); if (!p) return; trace('breaker', { what: 'smash', at: e.at, broken: !!(e as any).broken });
    if (!reducedMotion()) {
      let inner = ''; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.4, x1 = 50 + Math.cos(a) * 10, y1 = 50 + Math.sin(a) * 10, x2 = 50 + Math.cos(a) * 22, y2 = 50 + Math.sin(a) * 22; inner += '<line class="sd" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + WHITE + '" stroke-width="3" stroke-linecap="round"/>'; }
      const box = lineSvg(p, inner, BRK_MS.smash, 1.6);
      Array.from(box.querySelectorAll('.sd')).forEach((el, i) => { const a = (i / 5) * Math.PI * 2 + 0.4; anim(el, [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * 26).toFixed(1) + 'px,' + (Math.sin(a) * 26).toFixed(1) + 'px) rotate(' + (i % 2 ? 90 : -90) + 'deg)', opacity: 0 }], { duration: BRK_MS.smash, easing: 'ease-out', fill: 'forwards' }); });
      ring(p, MUTED, BRK_MS.smash, { from: 0.5, to: 1.3, width: 2 });
    }
    if ((e as any).broken) floatText('BREACH', p, WHITE, { small: true, delay: 120 });
  };
  H.cond = (e) => {
    base.cond?.(e);
    if (breakerFxOf(e) !== 'exposed') return;
    const p = K.at(e.at); if (!p || reducedMotion()) return;
    const box = lineSvg(p, '<path d="M30 14 H16 V86 H30 M70 14 H84 V86 H70" fill="none" stroke="' + HP + '" stroke-width="4" stroke-linejoin="round"/>', 700, 1.4);
    anim(box, [{ opacity: 0, transform: 'scale(1.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.3 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 700, fill: 'forwards' });
  };
}
