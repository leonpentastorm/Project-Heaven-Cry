// The kit drawing of a generated map (rules 1.45; game/kitMap.ts): walls chosen by their neighbours, a doorway piece in a
// wall line's gap, decals, dressing, the ground's square of texture, kit sprites by object kind, and the fallback per
// piece (a piece the kit lacks is not drawn; a map with no skin has no kit at all).
import { afterEach, describe, expect, it } from 'vitest';
import { kitLayout, wallLayers, kitSprite, kitTileBg, kitGround, setKitAssets } from './kitMap';

const ALL = ['wall-straight', 'wall-corner', 'wall-end', 'wall-door', 'wall-broken', 'decal-rubble', 'decal-scorch', 'decal-toxic', 'dress-1', 'crate', 'crate-broken', 'door', 'door-open', 'ground-1-r0', 'ground-1-r2']
  .reduce((m, p) => ({ ...m, ['kit-t-' + p]: '/assets/kit-t-' + p + '.webp' }), {} as Record<string, string>);
const turn = (l: { style: string }) => Number((/rotate\((\d+)deg\)/.exec(l.style) || [0, 0])[1]) / 90;
const src = (l: { src: string }) => l.src.replace(/^\/assets\/kit-t-|\.webp$/g, '');
afterEach(() => setKitAssets(null));

describe('kit map drawing (rules 1.45)', () => {
  it('walls by their neighbours: end, straight, corner, T, cross, each turned to fit', () => {
    setKitAssets(ALL);
    const one = (n: boolean, e: boolean, s: boolean, w: boolean) => wallLayers('t', n, e, s, w)!.map((l) => src(l) + '@' + turn(l)).join(' + ');
    expect(one(false, false, false, true)).toBe('wall-end@0');
    expect(one(true, false, false, false)).toBe('wall-end@1');
    expect(one(false, true, false, false)).toBe('wall-end@2');
    expect(one(false, false, true, false)).toBe('wall-end@3');
    expect(one(false, true, false, true)).toBe('wall-straight@0');
    expect(one(true, false, true, false)).toBe('wall-straight@1');
    expect(one(false, false, true, true)).toBe('wall-corner@0');
    expect(one(true, false, false, true)).toBe('wall-corner@1');
    expect(one(true, true, false, false)).toBe('wall-corner@2');
    expect(one(false, true, true, false)).toBe('wall-corner@3');
    expect(one(false, true, true, true)).toBe('wall-end@3 + wall-straight@0'); // T: the stem under the run
    expect(one(true, true, true, true)).toBe('wall-straight@0 + wall-straight@1');
    expect(wallLayers('t', false, false, false, false)).toBeNull(); // a lone block: as before
  });

  it('a map: walls, a doorway in the line (turned with it), a breach where rubble lies, decals, dressing, the ground', () => {
    setKitAssets(ALL);
    // ###.###   a wall line with a gap at 3,1; a vertical line at x 1 (rows 3 and 5) with rubble in its gap at 1,4
    const map = { id: 'm', w: 7, h: 7, solid: ['0,1', '1,1', '2,1', '4,1', '5,1', '6,1', '1,3', '1,5'], difficult: ['5,4'],
      objects: [{ kind: 'rubble', at: 'B5' }, { kind: 'fire', at: 'A7' }], skin: { setting: 't', ground: 1, rotate: 2, dressing: [{ at: '6,5', piece: 1, rotate: 1 }] } };
    const L = kitLayout(map)!;
    expect(L.get('3,1')!.layers.map(src)).toEqual(['wall-door']); expect(L.get('3,1')!.doorTurn).toBe(0);
    expect(L.get('1,4')!.layers.map(src)).toEqual(['wall-broken']); expect(L.get('1,4')!.doorTurn).toBe(1);
    expect(L.get('2,1')!.layers.map((l) => src(l) + '@' + turn(l))).toEqual(['wall-straight@0']); // joins the doorway
    expect(L.get('0,1')!.layers.map((l) => src(l) + '@' + turn(l))).toEqual(['wall-end@2']);
    expect(L.get('2,1')!.wall).toBe(true);
    expect(L.get('5,4')!.decal).toBe(true);
    expect(L.get('0,6')!.layers.map(src)).toEqual(['decal-scorch']);
    expect(L.get('6,5')!.layers.map(src)).toEqual(['dress-1']);
    expect(L.get('0,0')!.ground).toBe('/assets/kit-t-ground-1-r2.webp');
    expect(kitLayout(map)).toBe(L); // worked out once per map
    expect(kitLayout({ ...map, skin: undefined })).toBeNull();
  });

  it('the fallback per piece: a kit without walls draws none, and without a ground the tiles keep their fill', () => {
    setKitAssets({ 'kit-t-crate': '/c.webp' });
    const L = kitLayout({ id: 'n', w: 3, h: 3, solid: ['0,1', '1,1', '2,1'], difficult: [], skin: { setting: 't', ground: 3, rotate: 1, dressing: [] } })!;
    for (const t of L.values()) { expect(t.layers).toEqual([]); expect(t.wall).toBe(false); expect(t.ground).toBe(''); }
    expect(kitSprite('t', { kind: 'crate' })).toBe('/c.webp');
    expect(kitSprite('t', { kind: 'pillar' })).toBe('');
    expect(kitSprite('t', { kind: 'crate', hp: 0 })).toBe('/c.webp'); // no broken piece: the whole one (faded as before)
    expect(kitSprite(null, { kind: 'crate' })).toBe('');
  });

  it('sprites by kind: open door, broken cover, rubble and toxic as decals; the ground\'s square and its fallback ground', () => {
    setKitAssets(ALL);
    expect(kitSprite('t', { kind: 'door', open: true })).toMatch(/door-open/);
    expect(kitSprite('t', { kind: 'crate', hp: 0 })).toMatch(/crate-broken/);
    expect(kitSprite('t', { kind: 'rubble' })).toMatch(/decal-rubble/);
    expect(kitSprite('t', { kind: 'toxic' })).toMatch(/decal-toxic/);
    expect(kitGround('t', 3, 0)).toMatch(/ground-1-r0/); // ground 3 missing: the kit's first that has art
    expect(kitTileBg('/g.webp', '5,2', 'rgba(0, 0, 0, 0.1)')).toBe('linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)), url("/g.webp") 33.33333333333333% 66.66666666666666% / 400% 400% no-repeat');
  });
});
