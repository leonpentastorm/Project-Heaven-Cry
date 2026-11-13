// The map's tie lines (Classes 3.0 step 10, Leon: "Bond needs a faint connection line effect"): ONE overlay layer, keyed
// by tie, inside the map's grid (so it pans and zooms with the tiles), above the tiles and under the tokens: each line
// stops at the tokens' rims, never crossing a face. A persistent layer, not a played effect: it is drawn from the
// engine's tieLines over the combat the screen holds (the player's VIEW: fog has kept its own side's ties and dropped a
// far end it cannot see), so a line is there while the tie is and gone the render after it ends.
//
// A kind draws only when its data says so (rules.json ties.kinds[].line: ink, foe_dash); today only `bond`. Faint and
// thin, so it never reads as a targeting line (those are solid and bright): about 1.5 px at 35%, 60% on the Bonder's own
// turn or while its chip in the Bond strip is hovered; to an enemy dashed (shape, not colour alone). The pulse is the
// `phc-tie-pulse` class (combat.js CSS), off under reduced motion. pointer-events: none: the layer never takes the
// pointer from the grid.
//
// Two ADJACENT tokens (a Mender Bonded to the ally beside it, the usual case) leave only a few pixels between their rims,
// so a faint line there was invisible (Leon, 13 Nov). When the gap is shorter than TIE_MARK.min the pair gets a LINK
// MARK at the shared edge instead: a short, thicker segment across the gap (TIE_MARK.len, drawn over the rims' edges)
// with a knot at its middle, at a stronger opacity: solid with a filled knot to an ally, dashed with a hollow knot to an
// enemy (shape, not colour alone). Still one layer, still no pointer, still not an effect (fx/**).
import { tieLines, type TieLine } from '@engine';

/** The grid's geometry (combat.js gridStyle): its padding, the label strip, a tile and the gap. */
export const GRID_GEOM = { pad: 8, axis: 18, tile: 46, gap: 2 };
/** Where a line stops short of a tile's centre: the token's rim (a 38 px portrait plus its ring). */
const RIM = 22;
export const TIE_OPACITY = { rest: 0.35, hot: 0.6 };
export const TIE_WIDTH = 1.5;
/** The link mark between near tokens: drawn when the rim-to-rim gap is under `min` px; a `len` px segment, `width` thick,
 *  a knot of radius `knot`, at `opacity` (rest / hot). */
export const TIE_MARK = { min: 16, len: 16, width: 2.5, knot: 3, opacity: { rest: 0.85, hot: 1 } };

const centre = (i: number) => GRID_GEOM.pad + GRID_GEOM.axis + GRID_GEOM.gap + i * (GRID_GEOM.tile + GRID_GEOM.gap) + GRID_GEOM.tile / 2;
const at = (pos: string) => pos.split(',').map(Number) as [number, number];

export interface TieLineVals { key: string; kind: string; side: 'ally' | 'foe'; from: string; to: string; x1: number; y1: number; x2: number; y2: number; ink: string; dash: string; width: number; opacity: number; cls: string; mark: boolean }
/** A link mark's knot (the dot at the middle of a near pair's mark): filled to an ally, hollow to an enemy. */
export interface TieKnotVals { key: string; side: 'ally' | 'foe'; cx: number; cy: number; r: number; fill: string; stroke: string; opacity: number; cls: string }
export interface TieLayerVals { has: boolean; w: number; h: number; box: string; style: string; lines: TieLineVals[]; knots: TieKnotVals[] }

/** The layer's values. hot: the unit whose turn it is (its ties drawn stronger), and the far end whose Bond chip is
 *  hovered. motion: false under reduced motion (no pulse). */
export function tieLayerVals(cb: any, o: { turnOf?: string | null; hotTo?: string | null; motion?: boolean } = {}): TieLayerVals {
  const w = cb?.map ? GRID_GEOM.pad * 2 + GRID_GEOM.axis + cb.map.w * (GRID_GEOM.tile + GRID_GEOM.gap) : 0;
  const h = cb?.map ? GRID_GEOM.pad * 2 + GRID_GEOM.axis + cb.map.h * (GRID_GEOM.tile + GRID_GEOM.gap) : 0;
  const lines: TieLineVals[] = [], knots: TieKnotVals[] = [];
  let all: TieLine[] = [];
  try { all = cb ? tieLines(cb) : []; } catch { all = []; }
  for (const t of all) {
    const [ax, ay] = at(t.fromPos), [bx, by] = at(t.toPos);
    const x1 = centre(ax), y1 = centre(ay), x2 = centre(bx), y2 = centre(by), len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) continue; // one tile (never two units): nothing to draw
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const hot = (!!o.turnOf && o.turnOf === t.from) || (!!o.hotTo && o.hotTo === t.to);
    const cls = o.motion === false ? '' : 'phc-tie-pulse';
    if (len - RIM * 2 < TIE_MARK.min) {
      // near tokens: the link mark at the shared edge (see the head of this file)
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, half = TIE_MARK.len / 2, op = hot ? TIE_MARK.opacity.hot : TIE_MARK.opacity.rest;
      lines.push({ key: t.key, kind: t.kind, side: t.side, from: t.from, to: t.to,
        x1: Math.round(mx - ux * half), y1: Math.round(my - uy * half), x2: Math.round(mx + ux * half), y2: Math.round(my + uy * half),
        ink: t.ink, dash: t.dash, width: TIE_MARK.width, opacity: op, cls, mark: true });
      knots.push({ key: t.key, side: t.side, cx: Math.round(mx), cy: Math.round(my), r: TIE_MARK.knot,
        fill: t.side === 'foe' ? '#0A0D13' : t.ink, stroke: t.ink, opacity: op, cls });
      continue;
    }
    lines.push({ key: t.key, kind: t.kind, side: t.side, from: t.from, to: t.to,
      x1: Math.round(x1 + ux * RIM), y1: Math.round(y1 + uy * RIM), x2: Math.round(x2 - ux * RIM), y2: Math.round(y2 - uy * RIM),
      ink: t.ink, dash: t.dash, width: TIE_WIDTH, opacity: hot ? TIE_OPACITY.hot : TIE_OPACITY.rest, cls, mark: false });
  }
  return { has: lines.length > 0, w, h, box: '0 0 ' + w + ' ' + h, lines, knots,
    style: 'position: absolute; left: 0; top: 0; z-index: 1; pointer-events: none; overflow: visible' };
}
