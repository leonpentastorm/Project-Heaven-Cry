// Drawing a generated map from its setting's kit (rules 1.45; survival-spec 4.3, "the drawing contract"). A fight map with
// a skin (`map.skin`: the setting's kit, its ground and turn, the dressing) is drawn from pieces: the ground repeated
// under every tile, a wall piece on each solid tile chosen by its four neighbours (straight, corner, T, end), a doorway
// piece where a gap sits in a wall line (a breach where rubble lies in it), decals under rubble, toxic spills and fire,
// object sprites by engine kind, dressing on the skin's tiles. It is not a painted map (rules 1.16): every piece is placed
// by the map's own data. FALLBACK PER PIECE: a piece the kit lacks (no asset built: not delivered, or held back with
// "use": false in the catalog) is not drawn, and that part of the tile draws exactly as before (flat tiles, the glyph).
// Everything here is static per map: worked out once per map (`kitLayout`, cached on the map's own picture) and given
// to the tiles as plain values, so the memoised tiles never re-render on a hover (map-hover-performance.md).
import ASSETS from './assets.json';

let A: Record<string, string> = ASSETS as Record<string, string>;
/** Tests only: use this asset map instead of assets.json (null restores it). */
export function setKitAssets(map: Record<string, string> | null) { A = map || (ASSETS as Record<string, string>); last = null; }
/** The web asset of one kit piece (`kit-<kit>-<piece>`), or '' when the kit has none: the caller draws its fallback. */
export const kitArt = (kit: string, piece: string): string => A['kit-' + kit + '-' + piece] || '';

/** A ground texture covers this many tiles a side (1024 px at 256 px a tile). */
export const GROUND_TILES = 4;
/** One image laid over a tile: the asset, its quarter turns clockwise, how opaque. */
export interface KitLayer { key: string; src: string; style: string }
/** What a tile of a kit map draws under the tokens: its ground (a CSS background image layer, '' for none), the
 * layers (wall, doorway, decal, dressing; in order), whether a wall piece stands on it (the solid tile is darkened,
 * not filled), whether a decal covers its difficult ground (the "ROUGH" word is not needed), the turn of a door
 * sprite in its doorway. */
export interface KitTile { ground: string; layers: KitLayer[]; wall: boolean; decal: boolean; doorTurn: number }
/** The map the kit reads: the fight map's own fields (engine `MapDef`). */
export interface KitMapIn { id: string; w: number; h: number; solid: string[]; difficult: string[]; objects?: { kind: string; at: string; open?: boolean }[];
  skin?: { setting: string; ground: number; rotate: number; dressing: { at: string; piece: number; rotate: number }[] } }

const LAYER = 'position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; object-fit: contain';
/** A wall or doorway piece reaches over the tile's border and half the grid's gap (2 px each side), so pieces of
 * neighbouring tiles butt together across the grid line. */
const JOIN = 'position: absolute; left: -2px; top: -2px; width: calc(100% + 4px); height: calc(100% + 4px); z-index: 1; pointer-events: none; object-fit: fill';
const layer = (key: string, src: string, turn: number, extra = ''): KitLayer => ({ key, src, style: (/^(wall|door)/.test(key) ? JOIN : LAYER) + (turn ? '; transform: rotate(' + turn * 90 + 'deg)' : '') + (extra ? '; ' + extra : '') });
const refKey = (r: string): string => (r.charCodeAt(0) - 65) + ',' + (Number(r.slice(1)) - 1);

/** The kit's ground for a map: its own ground (`skin.ground`) turned by `skin.rotate`, or the kit's first ground that
 * has art; '' when the kit has none (flat tiles, as before). */
export function kitGround(kit: string, ground: number, rotate: number): string {
  for (const n of [ground, 1, 2, 3]) { const src = kitArt(kit, 'ground-' + n + '-r' + (((rotate % 4) + 4) % 4)); if (src) return src; }
  return '';
}
/** The CSS background of one tile showing its square of the ground (the texture repeats every GROUND_TILES tiles),
 * under a tint. */
export function kitTileBg(src: string, k: string, tint: string): string {
  const [x, y] = k.split(',').map(Number), pos = (n: number) => ((((n % GROUND_TILES) + GROUND_TILES) % GROUND_TILES) / (GROUND_TILES - 1)) * 100;
  return 'linear-gradient(' + tint + ', ' + tint + '), url("' + src + '") ' + pos(x) + '% ' + pos(y) + '% / ' + GROUND_TILES * 100 + '% ' + GROUND_TILES * 100 + '% no-repeat';
}

/** The wall piece for a solid tile by which of its four neighbours continue the wall (n, e, s, w), as layers drawn in
 * order: an end, a straight, a corner; a T is an end under a straight; a cross two straights. The pieces are painted
 * facing east (a straight runs left to right, an end joins the left edge, a corner joins left and bottom). Null: no
 * neighbour (a lone block), or a piece the kit lacks, so the tile draws as before. */
export function wallLayers(kit: string, n: boolean, e: boolean, s: boolean, w: boolean): KitLayer[] | null {
  const c = +n + +e + +s + +w, straight = kitArt(kit, 'wall-straight'), end = kitArt(kit, 'wall-end'), corner = kitArt(kit, 'wall-corner');
  const endTurn = (dir: 'n' | 'e' | 's' | 'w') => ({ w: 0, n: 1, e: 2, s: 3 })[dir];
  if (c === 1) return end ? [layer('wall', end, endTurn(n ? 'n' : e ? 'e' : s ? 's' : 'w'))] : null;
  if (c === 2 && ((n && s) || (e && w))) return straight ? [layer('wall', straight, n ? 1 : 0)] : null;
  if (c === 2) return corner ? [layer('wall', corner, w && s ? 0 : n && w ? 1 : e && n ? 2 : 3)] : null;
  if (c === 3) { const odd = !n ? 's' : !s ? 'n' : !e ? 'w' : 'e', across = odd === 'n' || odd === 's' ? 0 : 1;
    return end && straight ? [layer('wall-t', end, endTurn(odd)), layer('wall', straight, across)] : null; }
  if (c === 4) return straight ? [layer('wall', straight, 0), layer('wall-x', straight, 1)] : null;
  return null;
}

let last: { key: string; out: Map<string, KitTile> } | null = null;
/** Every tile's kit drawing for a map with a skin (null for a map with none: it draws as before). Worked out once per
 * map: kept while the map's picture (id, size, walls, objects at the start, skin) is the same. */
export function kitLayout(map: KitMapIn | null | undefined): Map<string, KitTile> | null {
  const sk = map && map.skin;
  if (!map || !sk || !sk.setting) return null;
  const key = map.id + '|' + map.w + 'x' + map.h + '|' + map.solid.join(';') + '|' + JSON.stringify(map.objects || []) + '|' + JSON.stringify(sk);
  if (last && last.key === key) return last.out;
  const kit = sk.setting, W = map.w, H = map.h, solid = new Set(map.solid), diff = new Set(map.difficult);
  const objs = new Map<string, string[]>(); for (const o of map.objects || []) { const k = refKey(o.at); objs.set(k, [...(objs.get(k) || []), o.kind]); }
  const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const isSolid = (x: number, y: number) => inMap(x, y) && solid.has(x + ',' + y);
  // a doorway: a tile you can stand in between two wall tiles of one line (its axis: 'h' walls west and east, 'v' north and south)
  const doorway = (x: number, y: number): 'h' | 'v' | null => !inMap(x, y) || solid.has(x + ',' + y) ? null : isSolid(x - 1, y) && isSolid(x + 1, y) && !isSolid(x, y - 1) && !isSolid(x, y + 1) ? 'h' : isSolid(x, y - 1) && isSolid(x, y + 1) && !isSolid(x - 1, y) && !isSolid(x + 1, y) ? 'v' : null;
  const joins = (x: number, y: number, axis: 'h' | 'v') => isSolid(x, y) || doorway(x, y) === axis;
  const ground = kitGround(kit, sk.ground, sk.rotate), dress = new Map(sk.dressing.map((d) => [d.at, d]));
  const out = new Map<string, KitTile>();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = x + ',' + y, here = objs.get(k) || [], layers: KitLayer[] = [];
    let wall = false, decal = false, doorTurn = 0;
    if (solid.has(k)) {
      const ws = wallLayers(kit, joins(x, y - 1, 'v'), joins(x + 1, y, 'h'), joins(x, y + 1, 'v'), joins(x - 1, y, 'h'));
      if (ws) { layers.push(...ws); wall = true; }
    } else {
      const d = doorway(x, y);
      if (d) { const breach = here.includes('rubble') ? kitArt(kit, 'wall-broken') : '', src = breach || kitArt(kit, 'wall-door'); if (src) layers.push(layer('door', src, d === 'v' ? 1 : 0)); doorTurn = d === 'v' ? 1 : 0; }
      if (diff.has(k) && !here.includes('rubble')) { const src = kitArt(kit, 'decal-rubble'); if (src) { layers.push(layer('rough', src, (x + y) % 4, 'opacity: 0.8')); decal = true; } }
      if (here.includes('fire')) { const src = kitArt(kit, 'decal-scorch'); if (src) layers.push(layer('scorch', src, (x * 3 + y) % 4)); }
      const dr = dress.get(k);
      if (dr && !here.length) { const src = kitArt(kit, 'dress-' + dr.piece); if (src) layers.push(layer('dress', src, dr.rotate, 'opacity: 0.9')); }
    }
    out.set(k, { ground, layers, wall, decal, doorTurn });
  }
  last = { key, out };
  return out;
}

/** The kit's sprite for a map object (engine kind; a destroyed crate, pillar or barricade its broken piece; an open door
 * its open piece; rubble and a toxic spill their decals), or '' (the object draws as before: its glyph). */
export function kitSprite(kit: string | null | undefined, o: { kind: string; open?: boolean; hp?: number }): string {
  if (!kit) return '';
  if (o.kind === 'rubble') return kitArt(kit, 'decal-rubble');
  if (o.kind === 'toxic') return kitArt(kit, 'decal-toxic');
  if (o.kind === 'door' && o.open) return kitArt(kit, 'door-open');
  if (o.hp != null && o.hp <= 0) return kitArt(kit, o.kind + '-broken') || kitArt(kit, o.kind);
  return kitArt(kit, o.kind);
}
