// THE OPEN HAND on the fight map (rules 1.56, the unarmed fighter; docs/design/proposals/2026-11-unarmed.md section 5).
// Bare hands and gloves are one weapon family; its forms are data toggles on an attack (items.json `open_hand`). The
// engine already says everything needed; this file only draws it, in the melee inks (fx/melee-techniques.ts MFX_INK):
//   melee {cat: unarmed, hit}          the fist lands: the striker's short jab toward the target, then two rings at the
//                                      contact edge (Strength ink); a Flurry's strikes (tech: flurry) also leave two
//                                      afterimages of the striker along the line (40% and 20%, gone in 160 ms)
//   stance {what: <form>, word}        the form named on the striker (the toggle's own effect fx, data): Jab one small
//                                      ring, Palm a flat bar at the hand and an arc pushed a tile ahead, Sweep an arc
//                                      along the floor (Agility ink), Snatch a hook; its word (the data's `word`)
//   stance {what: swept, word}         the Sweep's Prone landed: the target tips (the word on the target)
//   stance {what: sway, word}          slice 2, Sway halved a blow on the holder: its token leans off the line and back
//                                      (6 px, ease-in-out), the word on it
//   stance {what: breath, word}        slice 2, Breath: a slow ring drawn in from a tile to the token (Body amber, the
//                                      guard's ink), the word on it
//   melee {cat: unarmed, tech: riposte} slice 2, Counter (Riposte with the family): a snap strike line from the striker
//                                      through its target and COUNTER on the target
// The target of a form is the striker's last blow (its melee event, which the engine sends first: combat.ts emits the
// blow before its damage and its riders). No id is named here; the shapes are keyed by the data's `what`. Every
// duration goes through dom.ts (the combat speed and the tempo); with Reduce motion nothing moves, the words still show.
import type { FxEvent } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { type Pt, after, anim, floatText, put, ring, svg, trace, lunge, angle } from './dom';
import { MFX_INK } from './melee-techniques';

const { cut: WHITE, force: FORCE, foot: FOOT, muted: MUTED, guard: GUARD } = MFX_INK;
/** The beats (ms at Fast): the jab, the rings, a form's shape, the afterimages; slice 2: Sway's lean, Breath's ring, the
 *  Counter's snap line. */
export const OPEN_MS = { jab: 90, rings: 220, form: 260, ghost: 160, swept: 240, sway: 260, breath: 500, counter: 140 } as const;
/** The word a Counter shows (the strike is Riposte's, named by the engine's event: tech). */
export const COUNTER_WORD = 'COUNTER';
/** The shapes a form's `what` draws (the data's fx; an unknown `what` with a word still shows its word). */
const SHAPES = ['jab', 'palm', 'sweep', 'snatch'] as const;
type Shape = (typeof SHAPES)[number];

/** What an event is on screen for the Open Hand (pure, for the tests): an unarmed blow landing, a form named, the
 *  Sweep's fall, or none (the base handlers keep it). */
export function openHandFxOf(e: Partial<FxEvent> & { k: string }): 'blow' | 'form' | 'swept' | 'sway' | 'breath' | null {
  if (e.k === 'melee' && e.cat === 'unarmed') return 'blow';
  if (e.k === 'stance' && typeof e.word === 'string' && e.word && !(e as any)._said) return e.what === 'swept' ? 'swept' : e.what === 'sway' ? 'sway' : e.what === 'breath' ? 'breath' : 'form';
  return null;
}
/** The beat an Open Hand event holds the stage (ms at Fast), or undefined: the others keep theirs. A blow keeps its own
 *  melee beat (its rings play inside it). */
export function openHandBeat(e: Partial<FxEvent> & { k: string }): number | undefined {
  const w = openHandFxOf(e);
  return w === 'form' ? OPEN_MS.form : w === 'swept' ? OPEN_MS.swept : w === 'sway' ? OPEN_MS.sway : w === 'breath' ? OPEN_MS.breath : undefined;
}
/** The shape a form draws, from its `what` (null: just its word). */
export const formShape = (what: unknown): Shape | null => ((SHAPES as readonly string[]).includes(String(what)) ? (what as Shape) : null);

/** What play.ts lends these handlers. */
export interface OpenKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  /** did the squad see the user when it happened (the engine's seen stamp) */ sawThen: (e: FxEvent) => boolean;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number }) => void;
}

// The striker's last blow this fight (from, to, target): where a form that follows it is drawn.
const LAST = new Map<string, { from: string; to: string; target: string }>();
export function resetOpenHand() { LAST.clear(); }

// ---------- pieces (pure SVG and CSS) ----------
/** A point on the line from a toward b, t of the way. */
const along = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: a.s });
/** Two concentric rings at the contact edge (one for a light blow). */
function impact(p: Pt, n: 1 | 2, ink: string) {
  ring(p, ink, OPEN_MS.rings, { from: 0.25, to: 0.6, width: 2 });
  if (n === 2) ring(p, ink, OPEN_MS.rings, { from: 0.4, to: 0.95, width: 1.5, delay: 40 });
}
/** Afterimages of the striker's token along its line (a Flurry): copies at 40% and 20%, gone at once. */
function afterimages(K: OpenKit, e: FxEvent, a: Pt, b: Pt) {
  const tok = K.tokOf(e.unit, e.from); if (!tok || reducedMotion()) return;
  [[0.18, 0.4], [0.34, 0.2]].forEach(([t, op], i) => {
    const c = tok.cloneNode(true) as HTMLElement; c.style.translate = ''; c.style.opacity = '1'; c.setAttribute('data-oh-ghost', String(i));
    const q = along(a, b, t), box = put(c, q, a.s * 0.8, a.s * 0.8, OPEN_MS.ghost + 40); box.style.display = 'grid'; box.style.placeItems = 'center';
    c.style.filter = 'brightness(1.4)';
    anim(box, [{ opacity: op }, { opacity: 0 }], { duration: OPEN_MS.ghost, delay: i * 30, fill: 'forwards' });
  });
}
/** A form's own shape at the contact point (the striker at a, the target at b). */
function shape(s: Shape, a: Pt, b: Pt) {
  const c = along(a, b, 0.55), ang = angle(a, b), deg = (ang * 180) / Math.PI, sz = a.s * 1.2;
  let inner = '';
  if (s === 'jab') { ring(c, FORCE, OPEN_MS.form, { from: 0.2, to: 0.5, width: 2 }); return; }
  if (s === 'palm') inner = '<line x1="44" y1="30" x2="44" y2="70" stroke="' + FORCE + '" stroke-width="5" stroke-linecap="round"/><path d="M60 26 Q84 50 60 74" fill="none" stroke="' + WHITE + '" stroke-width="1.6"/>';
  if (s === 'sweep') inner = '<path d="M18 70 Q50 92 82 70" fill="none" stroke="' + FOOT + '" stroke-width="4" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>';
  if (s === 'snatch') inner = '<path d="M40 64 L60 44 Q70 34 60 30" fill="none" stroke="' + WHITE + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  const el = svg(100, 100, inner), box = put(el, c, sz, sz, OPEN_MS.form + 80); el.style.transform = 'rotate(' + deg.toFixed(0) + 'deg)'; box.setAttribute('data-oh-shape', s);
  const path = el.querySelector('[pathLength]'); if (path && !reducedMotion()) anim(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: OPEN_MS.form * 0.6, easing: 'ease-out', fill: 'forwards' });
  if (s === 'palm' && !reducedMotion()) { const arc = el.querySelector('path'); if (arc) anim(arc, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + (100 * 0.3).toFixed(0) + 'px)', opacity: 0 }], { duration: OPEN_MS.form, easing: 'ease-out', fill: 'forwards' }); }
  anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: OPEN_MS.form + 60, fill: 'forwards' });
}

/** The Counter's snap strike: a straight line from the striker through its target and a tile past it, white. */
function snap(a: Pt, b: Pt) {
  const end = along(a, b, 2), x0 = Math.min(a.x, end.x), y0 = Math.min(a.y, end.y), w = Math.max(2, Math.abs(end.x - a.x)), h = Math.max(2, Math.abs(end.y - a.y));
  const el = svg(w, h, '<line x1="' + (a.x - x0) + '" y1="' + (a.y - y0) + '" x2="' + (end.x - x0) + '" y2="' + (end.y - y0) + '" stroke="' + WHITE + '" stroke-width="2" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>');
  const box = put(el, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, OPEN_MS.counter + 120); box.setAttribute('data-oh-counter', '1');
  const line = el.querySelector('line'); if (line && !reducedMotion()) anim(line, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: OPEN_MS.counter, easing: 'ease-in', fill: 'forwards' });
  anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: OPEN_MS.counter + 100, fill: 'forwards' });
}

// ---------- the handlers ----------
/** Wrap the blow and the stance handlers (after every other wrapper: the blow's own lunge, hit and number play first). */
export function wrapOpenHand(H: Record<string, (e: FxEvent) => void>, K: OpenKit) {
  const base = { melee: H.melee, stance: H.stance };
  H.melee = (e) => {
    base.melee?.(e);
    if (openHandFxOf(e) !== 'blow') return;
    if (e.unit && e.from && e.to) LAST.set(String(e.unit), { from: String(e.from), to: String(e.to), target: String(e.target || '') });
    const a = K.at(e.from), b = K.at(e.to); if (!a || !b) return;
    try {
      if (e.tech === 'flurry' && K.sawThen(e)) afterimages(K, e, a, b);
      if (e.tech === 'riposte') { trace('openhand', { what: 'counter', unit: e.unit }); snap(a, b); floatText(COUNTER_WORD, b, WHITE, { small: true }); }
      if (!e.hit) return;
      trace('openhand', { what: 'blow', unit: e.unit, tech: e.tech || null });
      after(() => impact(along(a, b, 0.6), e.tech === 'flurry' ? 1 : 2, FORCE), OPEN_MS.jab);
    } catch { /* an effect never breaks the queue */ }
  };
  H.stance = (e) => {
    const w = openHandFxOf(e); if (!w) { base.stance?.(e); return; }
    const who = String(e.target || e.unit || ''), last = LAST.get(who);
    const a = K.at(last?.from || e.at), b = last ? K.at(last.to) : null;
    trace('openhand', { what: w, form: e.what, unit: who });
    if (w === 'sway' || w === 'breath') { // the holder's own defence: drawn on the holder (the stance names it)
      const p = K.at(e.at) || (who ? K.at(String((e as any).pos || '')) : null), tok = K.tokOf(who, e.at); if (!p) return;
      if (w === 'sway') { if (tok) lunge(tok, p.s * 0.15, -p.s * 0.06, OPEN_MS.sway); floatText(String(e.word), p, WHITE, { small: true }); K.play('swish', p, { rate: 1.3, gain: 0.3 }); }
      else { ring(p, GUARD, OPEN_MS.breath, { from: 1.3, to: 0.35, width: 2 }); floatText(String(e.word), p, GUARD, { small: true, delay: OPEN_MS.breath * 0.6 }); }
      return;
    }
    if (w === 'swept') { // the target tips: the word on it
      if (!b) return;
      const tok = K.tokOf(last!.target, last!.to);
      if (tok && !reducedMotion()) anim(tok, [{ rotate: '0deg' }, { rotate: '12deg', offset: 0.6 }, { rotate: '0deg' }], { duration: OPEN_MS.swept, easing: 'ease-in' });
      floatText(String(e.word), b, WHITE, { small: true, delay: 60 });
      K.play('body_fall', b, { rate: 1.2, gain: 0.6, delay: 80 });
      return;
    }
    if (!a) return;
    // the striker moves first: a short jab toward its target, then the form's shape and its word
    const tok = K.tokOf(who, last?.from || e.at);
    if (tok && b) { const g = angle(a, b), d = a.s * (formShape(e.what) === 'palm' ? 0.12 : 0.08); lunge(tok, Math.cos(g) * d, Math.sin(g) * d, OPEN_MS.jab * 2); }
    const s = formShape(e.what); if (s && b) shape(s, a, b);
    floatText(String(e.word), b || a, s === 'sweep' ? FOOT : s ? FORCE : MUTED, { small: true });
    K.play(s === 'sweep' ? 'swish' : 'hit_heavy', b || a, { rate: s === 'jab' ? 1.5 : 1.1, gain: 0.35 });
  };
}
