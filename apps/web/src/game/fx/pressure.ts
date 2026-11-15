// PRESSURE 2.0 on the fight map (rules 1.56, "Pressure 2.0 (the Skirmisher)"; docs/design/proposals/2026-11-pressure-2.0.md
// section 6). Leon, 15 Nov 2026, of the newer doors: "no effect, no animation, no nothing, feels like standing still".
// The engine already says everything needed; this file only draws it:
//   pressure {unit, at, now, was, state, by}   a pin: a tracer from the shooter, dust kicked up round the target's feet
//                                              (a fan away from the shooter), "+1 PRESSURE"; a state reached: its word
//                                              and its short line from data (rules.pressure.states); a fall: "−1"
//   watch_set {unit, at, id, tiles, allyId, targetId}   the held shot drawn as a lane: Deny a dashed line to its tile(s)
//                                              boxed with corner ticks, Cover Me an arc to the ally, Dead to Rights a
//                                              thin line and a crosshair, Overwatch its field (spokes)
//   watch_fire {unit, target, from, at}        the lane flashes white before the shot
//   technique flush {unit, target}             the cover by the target cracks, "FLUSHED"
//   cond fear {target}                         the target turns away and backs off a little, "AFRAID"
//   cond slipping, then move / shove           the Skirmisher's low slide (dust at the start), "MOVE" or "SLIDE"
// The token's crouch (Pressed dips, Suppressed crouches, Broken lower still) is its pose from the engine's state
// (techView.ts pressureLook, physView's `state`), never a sum the client makes. Colour always with a word. SVG and CSS
// only (lines, arcs, rings, shards drawn as lines: CLAUDE.md asset rule). Every duration goes through dom.ts (the combat
// speed, the tempo); under Reduce motion only the words and the pips remain. Fog: every point comes through the kit's
// at() (null out of sight).
import { PHYS_RULES, type FxEvent } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { type Pt, after, anim, angle, floatText, put, ring, shake, svg, trace } from './dom';

const WHITE = '#FFFFFF', MUTED = '#A3AEC2', HP = '#F65157', AGI = '#E3BF51';
/** The beats (ms at Fast): the tracer's travel, the dust, a lane drawing in, a lane's flash. */
export const PRESS_MS = { tracer: 110, dust: 300, lane: 460, flash: 120, crack: 320, slide: 200 } as const;

/** What a Pressure event is on screen (pure, for the tests). */
export function pressureFxOf(e: Partial<FxEvent> & { k: string }): 'pin' | 'fall' | null {
  if (e.k !== 'pressure') return null;
  const now = Number(e.now) || 0, was = Number(e.was) || 0;
  return now > was ? 'pin' : now < was ? 'fall' : null;
}
/** A state's row (data: techniques.json rules.pressure.states). */
const stateRow = (s: string | null | undefined): { word?: string; says?: string } => (s ? (PHYS_RULES as any).pressure?.states?.[s] || {} : {});
/** The words a Pressure event floats (pure): the gain ("+1 PRESSURE"), the fall ("−1"), the state reached and its line. */
export function pressWords(e: Partial<FxEvent> & { k: string }, before = ''): { gain: string; state: string; says: string } {
  const kind = pressureFxOf(e), n = Math.abs((Number(e.now) || 0) - (Number(e.was) || 0));
  const reached = kind === 'pin' && e.state && e.state !== before ? stateRow(String(e.state)) : null;
  return { gain: kind === 'pin' ? '+' + n + ' PRESSURE' : kind === 'fall' ? '−' + n : '', state: reached?.word ? reached.word.toUpperCase() : '', says: reached?.says || '' };
}
/** The lane a held shot draws (pure): from its event's own fields. */
export function laneOf(e: Partial<FxEvent> & { k: string }): 'ally' | 'target' | 'tiles' | 'field' | null {
  if (e.k !== 'watch_set') return null;
  return e.allyId ? 'ally' : e.targetId ? 'target' : Array.isArray(e.tiles) && e.tiles.length ? 'tiles' : 'field';
}
/** The token's pose for a Pressure state (pure; the state is the engine's). '' when it stands. */
export function poseOf(state: string | null | undefined): string {
  return state === 'pressed' ? 'scale: 1 0.93; transform-origin: 50% 100%' : state === 'suppressed' ? 'scale: 0.95 0.84; transform-origin: 50% 100%' : state === 'broken' ? 'scale: 0.92 0.78; transform-origin: 50% 100%' : '';
}
/** What the Skirmisher's own move is called (pure): after Slipping a walk is MOVE and a willing slide to cover SLIDE. */
export const moveWord = (e: Partial<FxEvent> & { k: string }): string => (e.k === 'move' ? 'MOVE' : e.k === 'shove' ? 'SLIDE' : '');

export interface PressKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }) => void;
}

// ---------- pieces ----------
/** A straight line a to b drawn from a (a tracer, a lane), then fading. */
function line(a: Pt, b: Pt, color: string, width: number, ms: number, o: { dash?: string; hold?: number; delay?: number; past?: number } = {}) {
  const run = () => {
    const ang = Math.atan2(b.y - a.y, b.x - a.x), ex = b.x + Math.cos(ang) * (o.past || 0) * b.s, ey = b.y + Math.sin(ang) * (o.past || 0) * b.s;
    const x0 = Math.min(a.x, ex) - 8, y0 = Math.min(a.y, ey) - 8, w = Math.abs(a.x - ex) + 16, h = Math.abs(a.y - ey) + 16;
    const ax = a.x - x0, ay = a.y - y0, bx = ex - x0, by = ey - y0, len = Math.max(1, Math.hypot(bx - ax, by - ay)), hold = o.hold || 0;
    const s = svg(w, h, '<line x1="' + ax.toFixed(1) + '" y1="' + ay.toFixed(1) + '" x2="' + bx.toFixed(1) + '" y2="' + by.toFixed(1) + '" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round"'
      + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : ' stroke-dasharray="' + len.toFixed(1) + '" stroke-dashoffset="' + len.toFixed(1) + '"') + '/>');
    s.setAttribute('preserveAspectRatio', 'none'); s.setAttribute('data-press-line', color);
    const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms + hold + 200); box.style.zIndex = '3';
    const l = s.querySelector('line'); if (l && !o.dash) anim(l, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
    if (l && o.dash) anim(l, [{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
    anim(box, [{ opacity: 1 }, { opacity: 1, offset: (ms + hold) / (ms + hold + 200) }, { opacity: 0 }], { duration: ms + hold + 200, fill: 'forwards' });
  };
  if (o.delay) after(run, o.delay); else run();
}
/** Dust kicked up at a point: short line shards in a fan (spread radians) round a direction. */
function dust(p: Pt, dir: number, n: number, ms: number, spread = Math.PI * 0.66, color = MUTED) {
  let inner = '';
  for (let i = 0; i < n; i++) {
    const a = dir - spread / 2 + (spread * (i + 0.5)) / n, r0 = 10 + (i % 2) * 4, r1 = r0 + 6 + (i % 3) * 3;
    inner += '<line x1="' + (50 + Math.cos(a) * r0).toFixed(1) + '" y1="' + (50 + Math.sin(a) * r0).toFixed(1) + '" x2="' + (50 + Math.cos(a) * r1).toFixed(1) + '" y2="' + (50 + Math.sin(a) * r1).toFixed(1) + '" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round"/>';
  }
  const s = svg(100, 100, inner); s.setAttribute('data-press-dust', String(n));
  const box = put(s, { x: p.x, y: p.y + p.s * 0.28 }, p.s * 1.3, p.s * 1.3, ms + 40); box.style.zIndex = '3';
  anim(box, [{ opacity: 1, transform: 'scale(.6)' }, { opacity: 0.9, transform: 'scale(1)', offset: 0.45 }, { opacity: 0, transform: 'scale(1.25) translateY(-6%)' }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
}
/** Corner ticks boxing a tile (a Deny's tile). */
function corners(p: Pt, color: string, ms: number) {
  const t = 'stroke="' + color + '" stroke-width="3" fill="none" stroke-linecap="round"';
  const s = svg(100, 100, '<path ' + t + ' d="M8 30V8H30M70 8H92V30M92 70V92H70M30 92H8V70"/>'); s.setAttribute('data-press-box', '1');
  const box = put(s, p, p.s * 0.95, p.s * 0.95, ms + 300); box.style.zIndex = '2';
  anim(box, [{ opacity: 0, transform: 'scale(1.35)' }, { opacity: 1, transform: 'scale(1)', offset: 0.4 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ms + 300, easing: 'ease-out', fill: 'forwards' });
}
/** An arc from a to b bowing up (Cover Me). */
function arc(a: Pt, b: Pt, color: string, ms: number) {
  const x0 = Math.min(a.x, b.x) - a.s, y0 = Math.min(a.y, b.y) - a.s * 1.2, w = Math.abs(a.x - b.x) + a.s * 2, h = Math.abs(a.y - b.y) + a.s * 2.2;
  const ax = a.x - x0, ay = a.y - y0, bx = b.x - x0, by = b.y - y0, cx = (ax + bx) / 2, cy = Math.min(ay, by) - a.s * 0.9;
  const s = svg(w, h, '<path d="M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1) + '" stroke="' + color + '" stroke-width="2" fill="none" stroke-dasharray="6 4" pathLength="100"/>');
  s.setAttribute('preserveAspectRatio', 'none'); s.setAttribute('data-press-arc', '1');
  const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms + 500); box.style.zIndex = '3';
  anim(box, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: ms + 500, fill: 'forwards' });
}
/** A field of fire: spokes out from the holder, dashed (Overwatch). */
function field(p: Pt, ms: number) {
  let inner = '';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; inner += '<line x1="' + (50 + Math.cos(a) * 14).toFixed(1) + '" y1="' + (50 + Math.sin(a) * 14).toFixed(1) + '" x2="' + (50 + Math.cos(a) * 48).toFixed(1) + '" y2="' + (50 + Math.sin(a) * 48).toFixed(1) + '" stroke="' + WHITE + '" stroke-width="1" stroke-dasharray="4 3" opacity=".7"/>'; }
  const s = svg(100, 100, inner + '<circle cx="50" cy="50" r="47" stroke="' + WHITE + '" stroke-width="1" stroke-dasharray="4 3" fill="none" opacity=".6"/>'); s.setAttribute('data-press-field', '1');
  const box = put(s, p, p.s * 5.5, p.s * 5.5, ms + 400); box.style.zIndex = '1';
  anim(box, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.45 }, { opacity: 0.8, offset: 0.8 }, { opacity: 0 }], { duration: ms + 400, easing: 'ease-out', fill: 'forwards' });
}
/** Cracks out from a point (the cover a Flush shoots apart). */
function crack(p: Pt, dir: number, ms: number) {
  let inner = '';
  for (let i = 0; i < 5; i++) { const a = dir + (i - 2) * 0.55, x1 = 50 + Math.cos(a) * 8, y1 = 50 + Math.sin(a) * 8, xm = 50 + Math.cos(a + 0.25) * 24, ym = 50 + Math.sin(a + 0.25) * 24, x2 = 50 + Math.cos(a) * 42, y2 = 50 + Math.sin(a) * 42;
    inner += '<polyline points="' + [x1, y1, xm, ym, x2, y2].map((v) => v.toFixed(1)).join(' ') + '" stroke="' + WHITE + '" stroke-width="2" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>'; }
  const s = svg(100, 100, inner); s.setAttribute('data-press-crack', '1');
  const box = put(s, p, p.s * 0.9, p.s * 0.9, ms + 260); box.style.zIndex = '3';
  for (const l of Array.from(s.querySelectorAll('polyline'))) anim(l, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ms * 0.6, easing: 'ease-out', fill: 'forwards' });
  anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: ms + 260, fill: 'forwards' });
}

// ---------- the handlers ----------
/** The units whose state was named this fight (once a state each), and the units that just started Slipping. */
const named = new Map<string, string>(), slipping = new Set<string>();
export function resetPressure() { named.clear(); slipping.clear(); }

/** Wrap the handlers (after every other wrapper): Pressure's pins, falls and states, the lanes, Flush, Afraid, the slide. */
export function wrapPressure(H: Record<string, (e: FxEvent) => void>, K: PressKit) {
  const base = { pressure: H.pressure, watch_set: H.watch_set, watch_fire: H.watch_fire, technique: H.technique, cond: H.cond, move: H.move, shove: H.shove };
  const still = () => reducedMotion();
  H.pressure = (e: any) => {
    const kind = pressureFxOf(e), before = named.get(String(e.unit)) || '', w = pressWords(e, before);
    // the pips' pulse (physical.ts); its state word is drawn here, with the state's own line from data
    try { base.pressure?.({ ...e, state: '' }); } catch { /* never breaks the queue */ }
    const p = K.at(e.at || K.posOf(e.unit)); if (!p || !kind) return;
    trace('pressure', { what: kind, unit: e.unit, now: e.now, was: e.was, state: e.state });
    if (kind === 'pin') {
      const q = e.by ? K.at(K.posOf(e.by)) : null;
      if (q && !still()) { line(q, p, WHITE, 1.4, PRESS_MS.tracer, { past: 0.3 }); }
      if (!still()) dust(p, q ? angle(q, p) : -Math.PI / 2, 5, PRESS_MS.dust);
      floatText(w.gain, { x: p.x, y: p.y + p.s * 0.2, s: p.s }, WHITE, { small: true, ms: 600, delay: 60 });
      K.play('hit_metal', p, { rate: 1.9, gain: 0.18, lowpass: 1800 });
      if (w.state) {
        named.set(String(e.unit), String(e.state));
        floatText(w.state, { x: p.x, y: p.y - p.s * 0.75, s: p.s }, HP, { ms: 800, delay: 120 });
        if (w.says) floatText(w.says, { x: p.x, y: p.y - p.s * 0.45, s: p.s }, WHITE, { small: true, ms: 800, delay: 200 });
        const tok = K.tokOf(e.unit, e.at);
        if (tok && !still()) anim(tok, [{ scale: '1 1' }, { scale: '1.04 0.8', offset: 0.4 }, { scale: '1 1' }], { duration: 300, easing: 'ease-out' }); // it ducks
        if (e.state === 'broken') shake(tok, 0.5);
      }
    } else {
      if (!e.now) named.delete(String(e.unit)); else if (e.state !== before) named.set(String(e.unit), String(e.state || ''));
      floatText(w.gain, { x: p.x, y: p.y - p.s * 0.6, s: p.s }, MUTED, { small: true, ms: 520 });
      const tok = K.tokOf(e.unit, e.at);
      if (tok && !still()) anim(tok, [{ translate: '0 4px' }, { translate: '0 0' }], { duration: 220, easing: 'ease-out' }); // it stands up a step
    }
  };
  H.watch_set = (e: any) => {
    try { base.watch_set?.(e); } catch { /* never breaks the queue */ }
    const p = K.at(e.at || K.posOf(e.unit)), kind = laneOf(e); if (!p || !kind || still()) return;
    trace('pressure', { what: 'lane', lane: kind, unit: e.unit });
    if (kind === 'ally') { const q = K.at(K.posOf(e.allyId)); if (q) { arc(p, q, WHITE, PRESS_MS.lane); ring(q, WHITE, PRESS_MS.lane + 200, { from: 1.3, to: 1, width: 2 }); floatText('COVERING', q, WHITE, { small: true, delay: 160 }); } }
    else if (kind === 'target') { const q = K.at(K.posOf(e.targetId)); if (q) { line(p, q, HP, 1.2, PRESS_MS.lane, { hold: 500 }); ring(q, HP, PRESS_MS.lane + 300, { from: 0.9, to: 0.5, width: 2 }); floatText('ON YOU', q, HP, { small: true, delay: 200 }); } }
    else if (kind === 'tiles') {
      const tiles: string[] = e.tiles, near = tiles.map((k) => K.at(k)).filter((x): x is Pt => !!x);
      if (near.length) line(p, near[0], WHITE, 1.2, PRESS_MS.lane, { dash: '5 4', hold: 500 });
      near.forEach((q, i) => after(() => corners(q, WHITE, PRESS_MS.lane), i * 40));
    } else field(p, PRESS_MS.lane);
  };
  H.watch_fire = (e: any) => {
    const p = K.at(e.from || K.posOf(e.unit)), q = K.at(e.at || K.posOf(e.target));
    if (p && q && !still()) line(p, q, WHITE, 3, PRESS_MS.flash * 0.4, { hold: PRESS_MS.flash }); // the lane flashes, then it fires
    try { base.watch_fire?.(e); } catch { /* never breaks the queue */ }
  };
  H.technique = (e: any) => {
    try { base.technique?.(e); } catch { /* never breaks the queue */ }
    if (e.refused || e.id !== 'flush') return;
    const p = K.at(K.posOf(e.target)), q = K.at(e.at || K.posOf(e.unit)); if (!p) return;
    const dir = q ? angle(p, q) : 0, c = { x: p.x + Math.cos(dir) * p.s * 0.45, y: p.y + Math.sin(dir) * p.s * 0.45, s: p.s };
    trace('pressure', { what: 'flush', unit: e.unit, target: e.target });
    after(() => { if (!still()) { crack(c, dir + Math.PI, PRESS_MS.crack); dust(c, dir + Math.PI, 6, PRESS_MS.dust, Math.PI, WHITE); } floatText('FLUSHED', p, WHITE, { small: true, delay: 80 }); K.play('hit_metal', c, { rate: 0.8, gain: 0.4 }); }, PRESS_MS.tracer);
  };
  H.cond = (e: any) => {
    if (e.id === 'slipping' && !e.resisted) { slipping.add(String(e.target)); return; } // said by the move it rides (MOVE, SLIDE)
    try { base.cond?.(e); } catch { /* never breaks the queue */ }
    if (e.id !== 'fear' || e.resisted) return;
    const tok = K.tokOf(e.target, e.at); if (!tok || still()) return;
    trace('pressure', { what: 'afraid', unit: e.target });
    anim(tok, [{ scale: '1 1', translate: '0 0' }, { scale: '-1 1', translate: '0 0', offset: 0.35 }, { scale: '-1 1', translate: '0 3px', offset: 0.8 }, { scale: '1 1', translate: '0 0' }], { duration: 700, easing: 'ease-out' }); // it turns away
  };
  for (const k of ['move', 'shove'] as const) {
    const b = base[k];
    H[k] = (e: any) => {
      const who = String(k === 'move' ? e.unit : e.target), slip = slipping.delete(who);
      try { b?.(e); } catch { /* never breaks the queue */ }
      if (!slip || !e.from || !e.to || e.from === e.to) return;
      const a = K.at(e.from), p = K.at(e.to); if (!p) return;
      trace('pressure', { what: 'slide', how: k, unit: who });
      if (a && !still()) dust(a, angle(p, a), 4, PRESS_MS.dust);
      floatText(moveWord(e), { x: p.x, y: p.y + p.s * 0.05, s: p.s }, AGI, { small: true, ms: 560, rise: 0.25 });
      const tok = K.tokOf(who, e.to);
      if (tok && !still()) anim(tok, [{ scale: '1 0.86' }, { scale: '1 1' }], { duration: PRESS_MS.slide, easing: 'ease-out' }); // low through the move
      K.play('step', p, { rate: 1.4, gain: 0.4 });
    };
  }
}
/** The beat a Pressure moment adds (ms at Fast), or undefined: a pin that reaches a state holds a little longer. */
export function pressureBeat(e: Partial<FxEvent> & { k: string }): number | undefined {
  if (e.k === 'pressure') { const k = pressureFxOf(e); return k === 'pin' ? (e.state && e.state !== 'pressed' ? 260 : 160) : k === 'fall' ? 60 : 0; }
  if (e.k === 'watch_set') return PRESS_MS.lane;
  return undefined;
}
