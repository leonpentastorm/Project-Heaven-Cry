// SHADOW on the fight map (rules 1.32, Shadow 2.0 slice 1: rules 1.56; docs/design/proposals/2026-11-shadow-2.0.md
// section 8). Leon, 15 Nov 2026: "Check both the tank and shadow for eye candy, if they have no effect, nothing special
// and playing them feel like dirt, then add/rework/redraw". The engine already says when each moment happens; this file
// only draws it, in Perception's ink (#40BAA0), always with a word:
//   stance what 'hide'          (Hide, your side)   the token sinks into a pool of shadow that spreads under it: HIDDEN
//   stance what 'ghost'         (Ghost Kill)        the same, from a kill: BACK IN THE DARK
//   stance what 'shadow_gain'   (a Shadow gained)   a wisp curls in on the token's corner: SHADOW
//   stance what 'shadow_loss'   (seen, one lost)    the wisp frays off: SEEN
//   stance what 'break'         (a Break)           the actor lunges, a dark cut then a white one across its target (the
//                                                   same action's shot or blow named it), AMBUSH; then the shadow tears
//                                                   off the actor in three strips: REVEALED
//   stance what 'tag'           (Tag)               a hook line from the tagger to the foe the same action Marked: TAGGED
// The data rows carry these (`fx` on the effect rows of skills.json ingenuity.1 and shadow.json shadow.tag), emitted by
// the engine's one runner (effects/triggers.ts) at the holder: {k: 'stance', target: <holder>, at, what}. The token's
// standing look (outline, pool, wisps) is game/tokenFade.ts. Every duration goes through dom.ts (the combat speed and
// the tempo); under Reduce motion the moments are the words and a still mark.
import type { FxEvent } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { type Pt, after, anim, floatText, put, ring, svg, trace, lunge, angle } from './dom';
import { SHADOW_INK } from '../tokenFade';

export { SHADOW_INK };
const WHITE = '#FFFFFF', MUTED = '#A3AEC2', DARK = '#05070B';
/** Each moment's beat (ms at Fast). */
export const SHADOW_MS = { hide: 420, gain: 320, loss: 320, cut: 520, tear: 420, tag: 380 } as const;

/** The moments this file draws, by the event (pure, for the tests). */
export type ShadowMoment = 'hide' | 'ghost' | 'gain' | 'loss' | 'break' | 'tag';
export function shadowFxOf(e: Partial<FxEvent> & { k: string }): ShadowMoment | null {
  if (e.k !== 'stance') return null;
  const w = (e as any).what;
  return w === 'hide' ? 'hide' : w === 'ghost' ? 'ghost' : w === 'shadow_gain' ? 'gain' : w === 'shadow_loss' ? 'loss' : w === 'break' ? 'break' : w === 'tag' ? 'tag' : null;
}
/** The word each moment says (colour is never the only sign). */
export const SHADOW_WORD: Record<ShadowMoment, string> = { hide: 'HIDDEN', ghost: 'BACK IN THE DARK', gain: 'SHADOW', loss: 'SEEN', break: 'AMBUSH', tag: 'TAGGED' };
/** The beat a Shadow moment holds the stage (ms at Fast), or undefined: not one of these. */
export function shadowBeat(e: Partial<FxEvent> & { k: string }): number | undefined {
  const m = shadowFxOf(e); if (!m) return undefined;
  return m === 'break' ? SHADOW_MS.cut + SHADOW_MS.tear * 0.5 : m === 'ghost' || m === 'hide' ? SHADOW_MS.hide : m === 'tag' ? SHADOW_MS.tag : m === 'gain' ? SHADOW_MS.gain : SHADOW_MS.loss;
}

/** What play.ts lends these handlers. */
export interface ShadowKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  sideOf: (id: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number }) => void;
  /** did the squad see the event's unit when it happened (the engine's stamp) */ sawThen: (e: FxEvent) => boolean;
}

// ---------- what the same action named (its target): kept from the events just before ----------
/** The tile each unit's last attack went at (a shot or blow: its `to`), and the unit the last Mark went on. */
const lastAim = new Map<string, { to: string; target: string | null }>();
let lastMarked: { target: string; at: string } | null = null;
export function resetShadow() { lastAim.clear(); lastMarked = null; }
/** Note an attack's aim (shot, melee, volley): the Break that follows it in the same action cuts across that tile. */
export function noteAim(e: Partial<FxEvent>) { if (e.unit && (e as any).to) lastAim.set(String(e.unit), { to: String((e as any).to), target: (e as any).target ? String((e as any).target) : null }); }
export const aimOf = (id: string | null | undefined) => (id ? lastAim.get(String(id)) || null : null);

// ---------- pieces (pure SVG and CSS) ----------
/** A pool of shadow spreading under a tile's token (an ellipse growing out), then settling into the token's own. */
function pool(p: Pt, ms: number, o: { shrink?: boolean } = {}) {
  const s = svg(100, 40, '<ellipse cx="50" cy="20" rx="46" ry="16" fill="' + DARK + '" opacity=".7"/><ellipse cx="50" cy="20" rx="46" ry="16" fill="none" stroke="' + SHADOW_INK + '" stroke-width="1.6" opacity=".7"/>');
  const box = put(s, { x: p.x, y: p.y + p.s * 0.32 }, p.s * 1.25, p.s * 0.5, ms + 80); box.style.zIndex = '1';
  anim(box, o.shrink ? [{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(.2)', opacity: 0 }] : [{ transform: 'scale(.15)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 0.95, offset: 0.55 }, { transform: 'scale(1)', opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
}
/** A wisp on the token's corner: curling in (gain: its stroke draws on) or fraying off (loss: it breaks up and fades). */
function wisp(p: Pt, gain: boolean, ms: number) {
  const d = 'M8 34 C 10 24, 26 26, 22 16 S 30 4, 28 2';
  const s = svg(40, 40, '<path d="' + d + '" fill="none" stroke="' + SHADOW_INK + '" stroke-width="3" stroke-linecap="round" pathLength="1" stroke-dasharray="' + (gain ? '1' : '.12 .08') + '" stroke-dashoffset="' + (gain ? '1' : '0') + '"/>');
  const box = put(s, { x: p.x - p.s * 0.3, y: p.y - p.s * 0.45 }, p.s * 0.55, p.s * 0.55, ms + 60); box.style.zIndex = '4';
  const path = s.querySelector('path');
  if (gain) { if (path && !reducedMotion()) anim(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ms * 0.6, easing: 'ease-out', fill: 'forwards' }); anim(box, [{ opacity: 0.4 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: ms, fill: 'forwards' }); }
  else anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'translate(0,0)' }, { opacity: 0.6, transform: 'translate(-3px,-5px) rotate(-12deg)', offset: 0.5 }, { opacity: 0, transform: 'translate(-6px,-12px) rotate(-24deg)' }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
}
/** The cut across a target's tile: a dark 3 px stroke, then a white 1 px one along it. */
function cut(p: Pt, ms: number) {
  const s = svg(100, 100, '<line class="dk" x1="12" y1="88" x2="88" y2="12" stroke="' + DARK + '" stroke-width="9" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>'
    + '<line class="dk2" x1="12" y1="88" x2="88" y2="12" stroke="' + SHADOW_INK + '" stroke-width="3" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" opacity=".85"/>'
    + '<line class="wt" x1="16" y1="84" x2="84" y2="16" stroke="' + WHITE + '" stroke-width="1.6" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>');
  const box = put(s, p, p.s * 1.35, p.s * 1.35, ms + 120); box.style.zIndex = '4';
  const draw = (sel: string, delay: number) => { const l = s.querySelector(sel); if (l) anim(l, reducedMotion() ? [{ strokeDashoffset: 0 }, { strokeDashoffset: 0 }] : [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ms * 0.3, delay, easing: 'ease-in', fill: 'forwards' }); };
  draw('.dk', 0); draw('.dk2', 0); draw('.wt', 120);
  anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: ms + 120, fill: 'forwards' });
}
/** The shadow tearing off a token: three outline strips peeling outward and fading. */
function tear(p: Pt, ms: number) {
  let inner = '';
  for (let i = 0; i < 3; i++) { const a0 = i * 120 + 20, a1 = a0 + 80, r = 40, rad = (d: number) => (d * Math.PI) / 180;
    inner += '<path class="st" style="transform-origin:50px 50px" d="M' + (50 + r * Math.cos(rad(a0))).toFixed(1) + ' ' + (50 + r * Math.sin(rad(a0))).toFixed(1) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (50 + r * Math.cos(rad(a1))).toFixed(1) + ' ' + (50 + r * Math.sin(rad(a1))).toFixed(1) + '" fill="none" stroke="' + SHADOW_INK + '" stroke-width="4" stroke-linecap="round"/>'; }
  const s = svg(100, 100, inner), box = put(s, p, p.s * 1.2, p.s * 1.2, ms + 60); box.style.zIndex = '4';
  Array.from(s.querySelectorAll('.st')).forEach((st, i) => { const a = ((i * 120 + 60) * Math.PI) / 180;
    anim(st, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * 14).toFixed(1) + 'px,' + (Math.sin(a) * 14).toFixed(1) + 'px) rotate(' + (i % 2 ? 18 : -18) + 'deg)', opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' }); });
}
/** A short hook line from a to b, drawn on and gone. */
function hook(a: Pt, b: Pt, ms: number) {
  const x0 = Math.min(a.x, b.x) - 8, y0 = Math.min(a.y, b.y) - 8, w = Math.abs(a.x - b.x) + 16, h = Math.abs(a.y - b.y) + 16, ax = a.x - x0, ay = a.y - y0, bx = b.x - x0, by = b.y - y0;
  const len = Math.max(1, Math.hypot(bx - ax, by - ay));
  const s = svg(w, h, '<line x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '" stroke="' + SHADOW_INK + '" stroke-width="2" stroke-linecap="round" stroke-dasharray="' + len.toFixed(1) + '" stroke-dashoffset="' + len.toFixed(1) + '"/>');
  s.setAttribute('preserveAspectRatio', 'none');
  const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms + 200); box.style.zIndex = '3';
  const l = s.querySelector('line'); if (l) anim(l, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: reducedMotion() ? 1 : ms * 0.5, easing: 'ease-out', fill: 'forwards' });
  anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: ms + 200, fill: 'forwards' });
}

// ---------- the handlers ----------
/** Wrap `stance` (the Shadow moments; the rest go to the base) and the attacks (to note their aim). Run after every
 * other wrapper, so the attacks' own drawing is the one noted and played. */
export function wrapShadow(H: Record<string, (e: FxEvent) => void>, K: ShadowKit) {
  const base = { stance: H.stance, shot: H.shot, melee: H.melee, volley: H.volley, cond: H.cond };
  for (const k of ['shot', 'melee', 'volley'] as const) { const b = base[k]; if (b) H[k] = (e) => { noteAim(e); b(e); }; }
  H.cond = (e) => { if ((e as any).id === 'marked' && !(e as any).resisted && e.target) lastMarked = { target: String(e.target), at: String(e.at || '') }; base.cond?.(e); };
  H.stance = (e) => {
    const m = shadowFxOf(e); if (!m) { base.stance?.(e); return; }
    const id = String((e as any).target || e.unit || ''), side = K.sideOf(id);
    if ((m === 'hide' || m === 'ghost') && side !== 'pc') { base.stance?.(e); return; } // a foe's: its 'sight' hide says it
    if (!K.sawThen({ ...e, unit: id } as FxEvent)) return;
    const p = K.at(e.at || K.posOf(id)); if (!p) return;
    const tok = K.tokOf(id, e.at);
    trace('shadow', { what: m, unit: id });
    if (m === 'hide' || m === 'ghost') {
      pool(p, SHADOW_MS.hide); ring(p, SHADOW_INK, SHADOW_MS.hide, { from: 1.35, to: 0.9, width: 2 });
      if (tok && !reducedMotion()) anim(tok, [{ transform: 'translateY(0)', filter: 'none' }, { transform: 'translateY(2px)', filter: 'brightness(.5) saturate(.4)', offset: 0.6 }, { transform: 'translateY(0)', filter: 'none' }], { duration: SHADOW_MS.hide, easing: 'ease-out' });
      floatText(SHADOW_WORD[m], p, SHADOW_INK, { small: true });
      K.play('sg_mask' as Sfx, p, { gain: 0.4, rate: m === 'ghost' ? 0.9 : 1.1 });
      return;
    }
    if (m === 'gain' || m === 'loss') {
      wisp(p, m === 'gain', m === 'gain' ? SHADOW_MS.gain : SHADOW_MS.loss);
      floatText(SHADOW_WORD[m], { ...p, y: p.y - p.s * 0.2 }, m === 'gain' ? SHADOW_INK : MUTED, { small: true, delay: 80 });
      if (m === 'gain') K.play('swish', p, { gain: 0.25, rate: 0.7 });
      return;
    }
    if (m === 'tag') {
      const t = lastMarked, q = t ? K.at(t.at || K.posOf(t.target)) : null; lastMarked = null;
      if (q) { hook(p, q, SHADOW_MS.tag); after(() => { ring(q, SHADOW_INK, SHADOW_MS.tag, { from: 0.6, to: 1.05, width: 2 }); floatText(SHADOW_WORD.tag, q, SHADOW_INK, { small: true }); }, SHADOW_MS.tag * 0.4); }
      else floatText(SHADOW_WORD.tag, p, SHADOW_INK, { small: true });
      K.play('swish', p, { gain: 0.35, rate: 1.3 });
      return;
    }
    // the Break: the actor lunges at what the same action struck, the cut across it, AMBUSH; then the shadow tears off
    const aim = aimOf(id), q = aim ? K.at(aim.to) : null;
    if (tok && q && !reducedMotion()) { const a = angle(p, q); lunge(tok, Math.cos(a) * p.s * 0.08, Math.sin(a) * p.s * 0.08, 200); }
    if (q) { cut(q, SHADOW_MS.cut); floatText(SHADOW_WORD.break, { ...q, y: q.y - q.s * 0.35 }, WHITE, { delay: 90 }); K.play('slice', q, { gain: 0.7, rate: 0.8 }); }
    else floatText(SHADOW_WORD.break, p, WHITE, {});
    after(() => { tear(p, SHADOW_MS.tear); floatText('REVEALED', { ...p, y: p.y + p.s * 0.9 }, MUTED, { small: true }); }, SHADOW_MS.cut * 0.6);
  };
}
