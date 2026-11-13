// How faint a unit's token is drawn (Leon, 13 Nov 2026: a Hidden unit at 60% so it reads as hidden). The one place the
// map's token and the turn bar's portrait take their opacity from, read from the unit as the player's VIEW holds it
// (fog has already dropped a Hidden enemy nobody on the side sees; a unit the view still has and marks `hidden` is one
// the viewer may see: its own side's, or an enemy spotted in hiding). The order, the first that applies wins:
//   held (a held portrait is drawn elsewhere): 0 · Downed: 0.5 · Hidden: 0.6 · else 1.
// Opacity is never the only sign: the Hidden chip and word stay on the unit (condChips), and Downed keeps its dashed ring.

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
/** The style fragment for it ('' at 1): '; opacity: n'. */
export const fadeStyle = (u: Parameters<typeof tokenOpacity>[0], o: { held?: boolean } = {}): string => { const n = tokenOpacity(u, o); return n === 1 ? '' : '; opacity: ' + n; };
