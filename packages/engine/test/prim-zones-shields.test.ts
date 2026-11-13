// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1b, sub-step 3 (docs/design/rev4-primitives.md P10, P11): zones from data (op `zone`, predicates
// self_in_zone / target_in_zone, a zone's `pool` spent by the damage_mult that reads it) and shield layers
// (grantShield's layer and holders; op mend's `layer`, `holders`; a layer is spent before the base, the newest first).
// The existing Sanctuary is on them (its halving, item 525's exception and its end are item ops in its data).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { makeZone, zonesAt, DATA_ZONE_KINDS } from '../src/magic';
import { grantShield, applyDamage, shieldTotal } from '../src/effects/damage';
import { PREDICATES, OPS } from '../src/effects/triggers';
import { A, W, pcs, foes, turn } from './golden/harness';
import { opsFight } from './golden/itemops';
import CLASSES from '../../../data/classes.json';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives-1b.json', import.meta.url)), 'utf8'));
const R = (id: string) => FIX.relics.find((r: any) => r.id === id).effects;
const sanctuary = (CLASSES as any).move_pool.moves.find((m: any) => m.id === 'sanctuary' && m.origin === 'guardian');
const hit = (cb: any, t: any, by: any, n: number) => applyDamage(cb, t, n, { by, type: 'weapon', shield: true, credit: 'hp' });

describe('P10: zones from data', () => {
  beforeAll(() => addItems('relic', FIX.relics));
  afterAll(() => clearAddedItems());
  it('the closed lists: op zone, predicates self_in_zone and target_in_zone over the data zone kinds', () => {
    expect(OPS.zone).toBeTruthy(); expect(PREDICATES.target_in_zone.values).toEqual([...DATA_ZONE_KINDS]); expect(PREDICATES.self_in_zone.arg).toBe('zone');
  });
  it('a zone laid by data: an ally inside takes less, out of the pool, which ends the zone when spent', () => {
    const e = R('test_zone_bulwark'), g = opsFight({ relics: ['test_zone_bulwark'] }), cb = g.combat, [u, al] = pcs(g), f = foes(g)[0];
    W(g, () => {
      const z = zonesAt(cb, u.pos, 'sanctuary', 'self', u)[0]; // laid at the turn opsFight began
      expect(z.pool).toBe(e[0].pool); expect(z.tiles).toContain(al.pos); // al at 2,6 next to u at 3,6
      const hp = al.hp; hit(cb, al, f, 8); expect(hp - al.hp).toBe(8 * e[1].value); expect(z.pool).toBe(e[0].pool - 8 * e[1].value);
      const hp2 = al.hp; hit(cb, al, f, 20); expect(hp2 - al.hp).toBe(20 - (e[0].pool - 8 * e[1].value)); // the pool gives only what is left
      expect(zonesAt(cb, u.pos, 'sanctuary', 'any').length).toBe(0); // spent: the zone is gone
    });
  });
  it('Sanctuary is data now: its halving (rounded up), your own burn not halved, its end at your turn', () => {
    expect(sanctuary.effects.map((x: any) => x.op).filter((op: string) => op !== 'grant_action')).toEqual(['damage_mult', 'damage_mult', 'zone']); // (rules 1.31: laid by its Hymn, a grant's own effect)
    const g = opsFight({}), cb = g.combat, [u, al] = pcs(g), f = foes(g)[0];
    u.held = { perks: [], traits: [], cls: 'guardian', rank: 3, relics: [] }; // (the holder, as the reducer builds it)
    W(g, () => {
      A._setRevision2Classes?.(false);
      makeZone(cb, u, { kind: 'sanctuary', tiles: A.tilesAround(u.pos, 1), rounds: 2, mult: 0.5 });
      const hp = al.hp; hit(cb, al, f, 9); expect(hp - al.hp).toBe(Math.ceil(9 * 0.5));
      const h2 = u.hp; applyDamage(cb, u, 9, { by: u, type: 'strain', shield: false, credit: 'hp' }); expect(h2 - u.hp).toBe(9);
      const h3 = u.hp; hit(cb, u, f, 9); expect(h3 - u.hp).toBe(Math.ceil(9 * 0.5));
      turn(g, u, 6); expect(zonesAt(cb, u.pos, 'sanctuary', 'any').length).toBe(0); expect(cb.log.some((l: string) => /Sanctuary fades/.test(l))).toBe(true);
    });
  });
});

describe('P11: shield layers', () => {
  beforeAll(() => addItems('relic', FIX.relics));
  afterAll(() => clearAddedItems());
  it('a layer stands beside the base shield and is spent first, the newest first', () => {
    const g = opsFight({}), cb = g.combat, [u, al] = pcs(g), f = foes(g)[0];
    W(g, () => {
      al.shieldRecv = 1; grantShield(cb, al, 10, u); grantShield(cb, al, 4, u, { layer: 'ward' }); grantShield(cb, al, 3, f, { layer: 'veil' });
      expect(al.shield).toBe(10); expect(shieldTotal(al)).toBe(17);
      const hp = al.hp; const r = hit(cb, al, f, 5); expect(r.shielded).toBe(5); expect(al.hp).toBe(hp);
      expect(al.shields).toEqual([{ layer: 'ward', n: 2, by: u.id, s: expect.any(Number) }]); expect(al.shield).toBe(10);
      grantShield(cb, al, 1, u, { layer: 'ward' }); expect(al.shields[0].n).toBe(2); // the larger of one giver's layer stands
    });
  });
  it('holders: one giver\'s layer stands on at most n units (a new one ends the oldest); op mend lays it from data', () => {
    const e = R('test_layer_ward')[0], g = opsFight({ relics: ['test_layer_ward'] }), cb = g.combat, [u, al] = pcs(g);
    W(g, () => {
      for (const x of cb.units) delete x.shields; // (the relic laid its ward as opsFight began the turn)
      grantShield(cb, u, 5, al, { layer: 'ward', holders: 1 }); grantShield(cb, al, 5, al, { layer: 'ward', holders: 1 });
      expect(u.shields).toBeUndefined(); expect(al.shields.length).toBe(1);
      turn(g, u, 6); // the relic: a ward on each ally within reach, at most `holders` carry it
      const carriers = cb.units.filter((x: any) => (x.shields || []).some((l: any) => l.layer === e.layer && l.by === u.id));
      expect(carriers.length).toBe(e.holders); expect(carriers[0].shields.find((l: any) => l.by === u.id).n).toBeGreaterThanOrEqual(e.amount.base); // (its amount block: the flat profile grows with level)
    });
  });
});
