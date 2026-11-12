// The kit (src/kit.ts, engine foundations 1, F6): one meaning each for the tiles around a tile, a straight line, "can
// a unit stand here" and "the enemies of this unit".
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { tilesAround, tilesLine, canStand, standBlocker, landBlockers, moveBlockers, foesOf, alliesOf, inBounds, tileOf, makeObject, OBJ } from '../src';
import { fightWith } from './helpers/perkfight';

describe('kit: the grid', () => {
  it('tilesAround: a square of side 2r + 1, the centre in it, column by column; with the fight, only tiles on the map', () => {
    expect(tilesAround('5,5', 1)).toEqual(['4,4', '4,5', '4,6', '5,4', '5,5', '5,6', '6,4', '6,5', '6,6']);
    expect(tilesAround('0,0', 1)).toHaveLength(9);
    const f = fightWith([{}], [{}]);
    expect(tilesAround('0,0', 1, f.cb)).toEqual(['0,0', '0,1', '1,0', '1,1']);
    expect(inBounds(f.cb, '-1,0')).toBe(false); expect(tileOf(f.cb, '-1,2')).toBeNull(); expect(tileOf(f.cb, '3,4')).toBe('3,4'); expect(tileOf(f.cb, 'D5')).toBe('3,4');
  });
  it('tilesLine: one tile a step of the longer axis, never the start; the end unless end: false', () => {
    expect(tilesLine('1,1', '4,1')).toEqual(['2,1', '3,1', '4,1']);
    expect(tilesLine('1,1', '4,1', { end: false })).toEqual(['2,1', '3,1']);
    expect(tilesLine('0,0', '4,2')).toEqual(['1,1', '2,1', '3,2', '4,2']);
    expect(tilesLine('3,3', '3,3')).toEqual([]);
  });
  it('canStand: ONE blocker list, the objects whose kind says blocks_move in data/objects.json; a broken one and an open door block nothing; a Downed body does', () => {
    const f = fightWith([{}, {}], [{}]); const cb = f.cb; cb.objects = []; const [a, b] = f.pcs;
    const blocking = Object.values(OBJ).filter((k: any) => k.blocks_move).map((k: any) => k.id).sort();
    expect(blocking).toEqual(['barrel', 'barricade', 'container', 'crate', 'door', 'hole', 'low_wall', 'pillar', 'sigil_wall', 'terminal', 'turret']);
    for (const k of Object.values(OBJ) as any[]) { cb.objects = [makeObject('o', k.id, '9,9')]; expect(canStand(cb, '9,9'), k.id).toBe(!k.blocks_move); }
    cb.objects = [{ ...makeObject('o', 'crate', '9,9'), hp: 0 }]; expect(canStand(cb, '9,9'), 'a broken crate').toBe(true);
    cb.objects = [{ ...makeObject('o', 'door', '9,9'), open: true }]; expect(canStand(cb, '9,9'), 'an open door').toBe(true);
    cb.objects = [makeObject('o', 'crate', '9,9')];
    expect(standBlocker(cb, '9,9')).toBe('object'); expect(standBlocker(cb, '-1,0')).toBe('edge'); expect([...landBlockers(cb)]).toEqual([...moveBlockers(cb)]);
    a.pos = '2,2'; b.pos = '2,3';
    expect(canStand(cb, '2,3')).toBe(false); expect(canStand(cb, '2,3', b)).toBe(true); expect(standBlocker(cb, '2,3', a)).toBe(b);
    b.downed = true; expect(canStand(cb, '2,3'), 'a Downed body is somebody').toBe(false);
    b.dead = true; expect(canStand(cb, '2,3'), 'a dead one is not').toBe(true);
  });
});

describe('kit: who counts', () => {
  it('foesOf and alliesOf: units still in the fight by default; every exception is asked for by name', () => {
    const f = fightWith([{}, {}], [{}, {}, {}]); const cb = f.cb; const [a, b] = f.pcs, [x, y, z] = f.foes;
    expect(foesOf(cb, a).map((u) => u.id)).toEqual([x.id, y.id, z.id]);
    expect(alliesOf(cb, a).map((u) => u.id)).toEqual([b.id]); expect(alliesOf(cb, a, { self: true }).map((u) => u.id)).toEqual([a.id, b.id]);
    x.downed = true; y.surrendered = true; z.hidden = true;
    expect(foesOf(cb, a).map((u) => u.id)).toEqual([z.id]); // Hidden still counts
    expect(foesOf(cb, a, { hidden: false })).toEqual([]);
    expect(foesOf(cb, a, { downed: true }).map((u) => u.id)).toEqual([x.id, z.id]);
    expect(foesOf(cb, a, { downed: true, surrendered: true })).toHaveLength(3);
    x.downed = false; x.dead = true; expect(foesOf(cb, a, { downed: true, surrendered: true })).toHaveLength(2); // the dead never count
    z.hidden = false; (z as any).companion = 'beast'; expect(foesOf(cb, a, { companions: false })).toEqual([]);
    delete (z as any).companion; a.pos = '1,1'; z.pos = '4,1'; expect(foesOf(cb, a, { within: 3 })).toHaveLength(1); expect(foesOf(cb, a, { within: 2 })).toHaveLength(0);
    expect(foesOf(cb, a, { within: 1, from: '4,2' })).toHaveLength(1);
  });
});
