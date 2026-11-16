// FOLLOW STRIKES on the fight map (rules 1.58, hands 5e; docs/design/proposals/2026-11-follow-strike.md section 9). The
// engine sends the off hand's follow as the melee event of its own roll, marked `follow: true` (and `chain`, so it plays
// at the chained beat right after the main swing); this file only draws what makes it read as a second swing from the
// other hand, on top of the ordinary blow the base handlers draw:
//   melee {follow, cat: shield}   a short lunge of the striker from its off-hand side, then the shield's rim as a short
//                                 arc swept across the target
//   melee {follow, other cat}     the same lunge; the base handler's slash is the blade's (no second shape)
//   melee {follow, hit}           the target tilts (6 degrees) and back
// The plate a shield's follow gives plays through the `guard` event (why: gain, fx/guard.ts). No id is named here: the
// shapes are keyed by the event's category. Every duration goes through dom.ts; with Reduce motion nothing moves.
import type { FxEvent } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { type Pt, after, anim, put, svg, trace, lunge, angle } from './dom';
import { MFX_INK } from './melee-techniques';

const { cut: WHITE, guard: GUARD } = MFX_INK;
/** The beats (ms at Fast): the off hand's lunge comes this long after the main swing; the rim's sweep; the tilt. */
export const FOLLOW_MS = { delay: 120, lunge: 140, rim: 100, tilt: 200 } as const;
/** The lunge (px at a tile of 48) and the tilt (degrees) of a follow. */
export const FOLLOW_SIZE = { lunge: 4, tilt: 6 } as const;

/** What a melee event is on screen for a follow (pure, for the tests): a shield's follow, another follows item's, or
 *  null (not a follow: the base handlers keep it). */
export function followFxOf(e: Partial<FxEvent> & { k: string }): 'shield' | 'blade' | null {
  if (e.k !== 'melee' || !(e as any).follow) return null;
  return e.cat === 'shield' ? 'shield' : 'blade';
}

/** What play.ts lends these handlers. */
export interface FollowKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number }) => void;
}

/** The shield's rim, a short arc swept across the target (the striker at a, the target at b). */
function rim(a: Pt, b: Pt) {
  const deg = (angle(a, b) * 180) / Math.PI, sz = a.s * 1.1;
  const el = svg(100, 100, '<path d="M30 22 Q66 50 30 78" fill="none" stroke="' + GUARD + '" stroke-width="5" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>');
  const box = put(el, b, sz, sz, FOLLOW_MS.rim + 160); el.style.transform = 'rotate(' + deg.toFixed(0) + 'deg)'; box.setAttribute('data-follow-rim', '1');
  const path = el.querySelector('path'); if (path && !reducedMotion()) anim(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: FOLLOW_MS.rim, easing: 'ease-out', fill: 'forwards' });
  anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: FOLLOW_MS.rim + 140, fill: 'forwards' });
}

/** Wrap the melee handler (after the others: the blow's own line, hit and number play first). */
export function wrapFollow(H: Record<string, (e: FxEvent) => void>, K: FollowKit) {
  const base = H.melee;
  H.melee = (e) => {
    base?.(e);
    const w = followFxOf(e); if (!w) return;
    try {
      const a = K.at(e.from), b = K.at(e.to); if (!a || !b) return;
      trace('follow', { what: w, unit: e.unit, hit: !!e.hit });
      after(() => {
        const tok = K.tokOf(e.unit, e.from), ang = angle(a, b), d = (FOLLOW_SIZE.lunge * a.s) / 48;
        // from the off-hand side: a step across the line of the main swing, toward the target
        if (tok && !reducedMotion()) lunge(tok, Math.cos(ang) * d - Math.sin(ang) * d * 0.5, Math.sin(ang) * d + Math.cos(ang) * d * 0.5, FOLLOW_MS.lunge);
        if (w === 'shield') rim(a, b);
        if (e.hit) {
          const t = K.tokOf(e.target, e.to);
          if (t && !reducedMotion()) anim(t, [{ rotate: '0deg' }, { rotate: FOLLOW_SIZE.tilt + 'deg', offset: 0.5 }, { rotate: '0deg' }], { duration: FOLLOW_MS.tilt, easing: 'ease-out' });
        }
      }, FOLLOW_MS.delay);
    } catch { /* an effect never breaks the queue */ }
  };
  void WHITE;
}
