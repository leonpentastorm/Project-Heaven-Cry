// How faint a unit's token is drawn (Leon, 13 Nov 2026: a Hidden unit at 60% so it reads as hidden). The one place the
// map's token and the turn bar's portrait take their opacity from, read from the unit as the player's VIEW holds it
// (fog has already dropped a Hidden enemy nobody on the side sees; a unit the view still has and marks `hidden` is one
// the viewer may see: its own side's, or an enemy spotted in hiding). The order, the first that applies wins:
//   held (a held portrait is drawn elsewhere): 0 · Downed: 0.5 · Hidden: 0.6 · else 1.
// Opacity is never the only sign: the Hidden chip and word stay on the unit (condChips), and Downed keeps its dashed ring.
//
// Rules 1.56, Shadow 2.0 (the Hidden look): a Hidden token also goes dark to an outline in Perception ink (#40BAA0; your
// own solid, an ally's dashed), a shadow pools under it, and the Shadow it holds shows as wisps under it, one a point
// (u.res.shadow against its cap u.resMax.shadow, the engine's numbers). Pure CSS and SVG; the HIDDEN chip and the
// resource row say it in words.

/** The token opacity for this unit (1: drawn plainly). */
export function tokenOpacity(u: { downed?: boolean; dead?: boolean; hidden?: boolean } | null | undefined, o: { held?: boolean } = {}): number {
  if (!u) return 1;
  if (o.held) return 0;
  if (u.downed || u.dead) return 0.5;
  if (u.hidden) return HIDDEN_OPACITY;
  return 1;
}
/** A Hidden unit's token (provisional, Leon's number). */
export const HIDDEN_OPACITY = 0.6;
/** Perception's ink: the Shadow door's marks. */
export const SHADOW_INK = '#40BAA0';
/** The style fragment for it ('' at 1): '; opacity: n'. A Hidden token (not Downed, not held) also darkens to its
 *  outline in Perception ink; `ally` (a squadmate's, not your own): the outline dashed. */
export const fadeStyle = (u: (Parameters<typeof tokenOpacity>[0] & { side?: string }) | null | undefined, o: { held?: boolean; ally?: boolean } = {}): string => {
  const n = tokenOpacity(u, o); if (n === 1) return '';
  const dark = !!u && !!u.hidden && !o.held && !u.downed && !u.dead;
  return '; opacity: ' + n + (dark ? '; filter: brightness(0.42) saturate(0.3); border-color: ' + SHADOW_INK + (o.ally ? '; border-style: dashed' : '') : '');
};
/** The pool of shadow under a Hidden token (a dark ellipse; under the token, above the floor). */
export const SHADE_POOL = 'position: absolute; left: 4%; right: 4%; bottom: -3px; height: 34%; z-index: 1; border-radius: 50%; pointer-events: none; background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.45) 45%, rgba(0, 0, 0, 0) 72%)';
/** The Shadow a unit holds and its cap (the engine's u.res / u.resMax), or null: it has no Shadow meter. */
export function shadowHeld(u: { res?: Record<string, number>; resMax?: Record<string, number> } | null | undefined): { n: number; max: number } | null {
  const max = u?.resMax?.shadow; if (max == null) return null;
  return { n: Math.max(0, Math.min(max, u?.res?.shadow || 0)), max };
}
/** The wisps under a token: one curled stroke a point of Shadow held, fanned (an SVG data URI), and the empty ones as
 *  faint dots up to the cap, so "1 of 3" reads at a glance. '' when it holds none and has no cap. */
export function wispsUri(n: number, max: number): string {
  if (!(max > 0)) return '';
  const w = 12 * max + 4; let inner = '';
  for (let i = 0; i < max; i++) {
    const x = 4 + i * 12;
    inner += i < n ? '<path d="M' + x + ' 13 C ' + (x + 1) + ' 8, ' + (x + 7) + ' 9, ' + (x + 5) + ' 4 S ' + (x + 9) + ' 1, ' + (x + 8) + ' 1" fill="none" stroke="' + SHADOW_INK + '" stroke-width="2" stroke-linecap="round"/>'
      : '<circle cx="' + (x + 4) + '" cy="10" r="1.6" fill="' + SHADOW_INK + '" opacity="0.45"/>';
  }
  return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="15" viewBox="0 0 ' + w + ' 15">' + inner + '</svg>');
}
/** Where the wisps sit: under the token's left edge, above its HP bar. */
export const wispStyle = (max: number): string => 'position: absolute; left: 2px; top: -9px; z-index: 4; height: 12px; width: ' + (max * 10 + 4) + 'px; pointer-events: none; filter: drop-shadow(0 0 2px rgba(5, 7, 11, 0.9))';
