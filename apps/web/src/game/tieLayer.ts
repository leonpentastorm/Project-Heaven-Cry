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
import { tieLines, type TieLine } from '@engine';

/** The grid's geometry (combat.js gridStyle): its padding, the label strip, a tile and the gap. */
export const GRID_GEOM = { pad: 8, axis: 18, tile: 46, gap: 2 };
/** Where a line stops short of a tile's centre: the token's rim (a 38 px portrait plus its ring). */
const RIM = 22;
export const TIE_OPACITY = { rest: 0.35, hot: 0.6 };
export const TIE_WIDTH = 1.5;

const centre = (i: number) => GRID_GEOM.pad + GRID_GEOM.axis + GRID_GEOM.gap + i * (GRID_GEOM.tile + GRID_GEOM.gap) + GRID_GEOM.tile / 2;
const at = (pos: string) => pos.split(',').map(Number) as [number, number];

export interface TieLineVals { key: string; kind: string; side: 'ally' | 'foe'; from: string; to: string; x1: number; y1: number; x2: number; y2: number; ink: string; dash: string; width: number; opacity: number; cls: string }
export interface TieLayerVals { has: boolean; w: number; h: number; box: string; style: string; lines: TieLineVals[] }

/** The layer's values. hot: the unit whose turn it is (its ties drawn stronger), and the far end whose Bond chip is
 *  hovered. motion: false under reduced motion (no pulse). */
export function tieLayerVals(cb: any, o: { turnOf?: string | null; hotTo?: string | null; motion?: boolean } = {}): TieLayerVals {
  const w = cb?.map ? GRID_GEOM.pad * 2 + GRID_GEOM.axis + cb.map.w * (GRID_GEOM.tile + GRID_GEOM.gap) : 0;
  const h = cb?.map ? GRID_GEOM.pad * 2 + GRID_GEOM.axis + cb.map.h * (GRID_GEOM.tile + GRID_GEOM.gap) : 0;
  const lines: TieLineVals[] = [];
  let all: TieLine[] = [];
  try { all = cb ? tieLines(cb) : []; } catch { all = []; }
  for (const t of all) {
    const [ax, ay] = at(t.fromPos), [bx, by] = at(t.toPos);
    const x1 = centre(ax), y1 = centre(ay), x2 = centre(bx), y2 = centre(by), len = Math.hypot(x2 - x1, y2 - y1);
    if (len <= RIM * 2) continue; // neighbours' rims touch: nothing to draw between them
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const hot = (!!o.turnOf && o.turnOf === t.from) || (!!o.hotTo && o.hotTo === t.to);
    lines.push({ key: t.key, kind: t.kind, side: t.side, from: t.from, to: t.to,
      x1: Math.round(x1 + ux * RIM), y1: Math.round(y1 + uy * RIM), x2: Math.round(x2 - ux * RIM), y2: Math.round(y2 - uy * RIM),
      ink: t.ink, dash: t.dash, width: TIE_WIDTH, opacity: hot ? TIE_OPACITY.hot : TIE_OPACITY.rest, cls: o.motion === false ? '' : 'phc-tie-pulse' });
  }
  return { has: lines.length > 0, w, h, box: '0 0 ' + w + ' ' + h, lines,
    style: 'position: absolute; left: 0; top: 0; z-index: 1; pointer-events: none; overflow: visible' };
}
