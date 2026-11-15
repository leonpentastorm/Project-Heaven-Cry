// The Sigil caster's body on the fight map (nine doors audit, 0.29: "the caster's token never moves"). Two beats, both
// with the shared lunge helper (dom.ts), both paced by the battle pace (anim and after scale with it) and both off under
// Reduce motion (lunge does nothing then, and the stroke is not held back):
//   draw    the caster leans in over its own tile, and the stroke draws at the lean's deepest point
//   evoke   the caster kicks back, away from where the spell goes, as the pattern collapses into its source
// Timings only: no rule, no number of the game's.
import { type Pt, after, lunge, trace } from './dom';
import { reducedMotion } from '../sfx';

export const SIGIL_BODY = {
  /** the lean: its length, how far (a share of a tile), and where in it the stroke starts (its deepest point) */
  lean: { ms: 200, depth: 0.12, peak: 0.35 },
  /** the recoil: its length, how far, and when it lands (as the pattern's squares reach the source: play.ts squaresTo 220) */
  recoil: { ms: 240, depth: 0.14, at: 200 },
};

/** Lean the caster's token in (down, over the tile it draws on). Returns how long the stroke waits for it (0: no lean). */
export function leanIn(tok: HTMLElement | null, p: Pt): number {
  if (!tok || reducedMotion()) return 0;
  const L = SIGIL_BODY.lean;
  lunge(tok, 0, p.s * L.depth, L.ms);
  trace('sigil', { what: 'lean' });
  return Math.round(L.ms * L.peak);
}

/** Kick the caster's token back, away from the way the spell fires (a = its angle, radians), as the pattern collapses. */
export function recoil(tok: HTMLElement | null, p: Pt, a: number | null) {
  if (!tok || reducedMotion() || a == null || !Number.isFinite(a)) return;
  const R = SIGIL_BODY.recoil;
  after(() => { lunge(tok, -Math.cos(a) * p.s * R.depth, -Math.sin(a) * p.s * R.depth, R.ms); trace('sigil', { what: 'recoil' }); }, R.at);
}
