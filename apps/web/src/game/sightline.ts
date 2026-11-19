// Rules 1.76 item 6404, the shadow sightline (Leon's name for the detect view): who can see you and from where, drawn
// on the map from the engine's own answer (Hide's row in the action list carries `watch`: each tile from which you,
// standing there, are in the eyes of an enemy your side sees, with those enemies; descriptors.ts sightline, from
// tactics.ts eyesOn). This file only paints that answer: no sight is worked out here.
//
// Watched tiles are shaded in the hurting ink, deeper by how many eyes reach them; a tile no enemy watches stays clear;
// hovering an enemy outlines the tiles it watches (its reach toward you); hovering a tile says who sees you there.
// The switch is saved per player (this browser); with no choice saved it is on while you are Hidden or the SHADOW tab is open.

const KEY = 'phc.sightline';
/** The hurting ink (colour-system.md: HP, damage) for watched tiles; the count deepens it (1, 2, 3 or more). */
const HURT = '246, 81, 87';
const FILL = [0.12, 0.2, 0.28];

let saved: 'on' | 'off' | null = (() => { try { const v = localStorage.getItem(KEY); return v === 'on' || v === 'off' ? v : null; } catch { return null; } })();

/** Is the sightline drawn now? The player's saved choice, else on while Hidden or on the SHADOW tab. */
export function sightlineOn(cur: any, tab: string | null | undefined): boolean {
  if (saved) return saved === 'on';
  return !!(cur && cur.hidden) || tab === 'shadow';
}
/** Flip it (and save the choice). */
export function toggleSightline(now: boolean): void {
  saved = now ? 'off' : 'on';
  try { localStorage.setItem(KEY, saved); } catch { /* private mode: kept for this visit */ }
}

const nameOf = (cb: any, id: string) => (cb?.units || []).find((u: any) => u.id === id)?.name || 'an enemy';
const list = (names: string[]) => (names.length <= 1 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]);

/** One tile's shading: watched by n, deeper by n; the edge of the watched ground drawn where a watched tile meets an
 * unwatched one (the reach of their eyes toward you, as a line); a hovered enemy's own reach edged in white instead. */
export function sightTile(watch: Record<string, string[]> | null | undefined, k: string, hoverFoe: string | null): { has: boolean; n: number; style: string } {
  const ids = (watch && watch[k]) || [], n = ids.length;
  if (!n) return { has: false, n: 0, style: '' };
  const [x, y] = k.split(',').map(Number), mine = !!hoverFoe && ids.includes(hoverFoe);
  const near = (dx: number, dy: number) => { const o = (watch && watch[(x + dx) + ',' + (y + dy)]) || []; return mine ? o.includes(hoverFoe!) : o.length > 0; };
  const ink = mine ? '#FFFFFF' : 'rgba(' + HURT + ', 0.95)', side = (open: boolean) => (open ? '2px solid ' + ink : '0 solid transparent');
  const i = Math.min(n, 3) - 1;
  return { has: true, n, style: 'position: absolute; inset: -1px; pointer-events: none; box-sizing: border-box; background: rgba(' + HURT + ', ' + (mine ? FILL[i] + 0.08 : FILL[i]) + '); '
    + 'border-top: ' + side(!near(0, -1)) + '; border-bottom: ' + side(!near(0, 1)) + '; border-left: ' + side(!near(-1, 0)) + '; border-right: ' + side(!near(1, 0)) };
}
/** The words for a tile: seen here by whom, or unseen here (for the hover card and the read-out). */
export function sightWords(cb: any, watch: Record<string, string[]> | null | undefined, k: string): string {
  const ids = (watch && watch[k]) || [];
  return ids.length ? 'seen here by ' + list(ids.map((id) => nameOf(cb, id))) : 'unseen here';
}
/** The switch and the read-out over the map. at: the tile the read-out speaks of (the hovered one, else yours). */
export function sightBar(cb: any, watch: Record<string, string[]> | null | undefined, on: boolean, at: string | null, ref: (k: string) => string) {
  const words = at ? sightWords(cb, watch, at) : '';
  return {
    on: on ? '1' : '0', pressed: on ? 'true' : 'false',
    tip: on ? 'Hide the sightline: who can see you, and from where' : 'Show the sightline: who can see you, and from where',
    label: 'SIGHTLINE',
    style: on ? 'border-color: #40BAA0; color: #FFFFFF' : 'color: #A3AEC2',
    hasRead: on && !!at,
    read: at ? ref(at) + ' · ' + words : '',
    readState: at ? (((watch && watch[at]) || []).length ? 'seen' : 'unseen') : '',
    readStyle: 'margin-left: 6px; padding: 3px 9px; border-radius: 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; font-size: var(--fs-sub); font-weight: 700; letter-spacing: 0.02em; '
      + (at && ((watch && watch[at]) || []).length ? 'border: 1px solid rgba(' + HURT + ', 0.9); color: #F65157' : 'border: 1px solid #40BAA0; color: #6FEA77'),
  };
}
