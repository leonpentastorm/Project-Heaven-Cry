// An enemy with a gun that reaches further than it can see (rules 1.16 deploys the sides 10 to 14 tiles apart): it
// used to count its own tile as a firing position, be refused the shot ("You can't see it") and never move.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { ARCHETYPES, MAPS, newCharacter, startCombat, refOf, enemyTurn, dist, type Sheet, type MapDef } from '../src';

const a0 = ARCHETYPES[0];
const sheet: Sheet = { name: 'P', portrait: '', origin: 'Central City', kit: 'medic', traits: [], skills: { ...a0.preset }, attrs: { ...a0.attributes }, cores: { ...a0.cores }, identity: {} } as any;
const open = (): MapDef => ({ ...MAPS.yard16, w: 26, h: 12, cover: [], full: [], solid: [], difficult: [], pcStart: ['2,5'], foeStart: ['20,5'] });

describe('an enemy further off than it can see', () => {
  for (const gap of [13, 14]) it('at ' + gap + ' tiles with a long gun it closes in (or fires), it does not stand still', () => {
    const cb = startCombat('t', open(), [{ c: newCharacter('c0', 'p1', sheet), pos: '3,5' }], [{ name: 'Foe', at: refOf((3 + gap) + ',5'), tier: 'soldier', weapon: 'long_rifle' } as any], 'easy', { state: 5 }, []);
    cb.objects = [];
    const p = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
    p.hp = p.maxHp = 9999; e.vision = 12; cb.turn = cb.order.indexOf(e.id); e.ap = 6;
    const was = e.pos, l0 = cb.log.length;
    enemyTurn(cb, { state: 3 });
    const log = cb.log.slice(l0).join(' | ');
    expect(dist(e.pos, p.pos) < dist(was, p.pos) || /shoots|fires|attacks|hits|misses/i.test(log), log).toBe(true);
  });
});
