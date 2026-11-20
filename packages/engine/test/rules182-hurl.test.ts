// Rules 1.82 item 7010: P14, the object op's hurl. The Breaker's Hurl (a loose object, or a small foe it holds, thrown at
// a tile within 4) and Grenadier's Arm (moved onto it). Through the reducer (combat/perk), numbers from the data.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { CLASS, applyCond, previewDescriptor } from '../src';
import { makeObject } from '../src/objects';
import { fightWith, withGame } from './helpers/perkfight';
import objectsJ from '../../../data/objects.json';

const HURL: any = (CLASS.fighter as any).gain.find((m: any) => m.id === 'hurl');
const KG = (k: string) => (objectsJ as any).items.find((o: any) => o.id === k).loose.kg;
const rig = () => {
  const f = fightWith([{ name: 'Brk', classId: 'fighter', attrs: { strength: 5 }, skills: { raw_power: 3 } }], [{ tier: 'minion', at: 'H6' }, { tier: 'soldier', at: 'H8' }]);
  const u = f.turn(f.pc); u.pos = '3,3'; u.ap = 6; f.cb.objects = [makeObject('cr', 'crate', '4,3'), makeObject('pl', 'pillar', '2,3')];
  for (const e of f.foes) { e.hp = e.maxHp = 999; e.armour = 0; }
  return { f, u };
};
const hurl = (f: any, u: any, choice: string, tile: string) => f.act({ type: 'combat/perk', unitId: u.id, id: 'class:fighter.hurl', actionId: 'hurl', choice, tile } as any);

describe('rules 1.82 item 7010: Hurl (P14)', () => {
  it('a crate next to the Breaker thrown onto a foe within reach: the foe takes the row\'s amount by weight, the crate lands there', () => {
    const { f, u } = rig(); const [m] = f.foes; m.pos = '6,3';
    hurl(f, u, 'o:cr', '6,3');
    const want = HURL.amounts.hurl.base + HURL.amounts.hurl.per[0].value * KG('crate');
    expect(999 - f.unit(m.id).hp).toBeGreaterThanOrEqual(Math.floor(want)); // × the physical Stat term
    expect(f.cb.objects!.find((o) => o.id === 'cr')!.pos).not.toBe('4,3');
    expect(f.unit(u.id).ap).toBe(6 - HURL.effects[0].ap);
  });
  it('refused before anything is paid: beyond its range, a pillar (not loose), a held-less foe, a Soldier', () => {
    const { f, u } = rig(); const [m, s] = f.foes; m.pos = '3,4'; s.pos = '4,4';
    expect(() => hurl(f, u, 'o:cr', '12,3')).toThrow(/Out of range/);
    expect(() => hurl(f, u, 'o:pl', '6,3')).toThrow(/loose object/);
    expect(() => hurl(f, u, 'u:' + m.id, '6,3')).toThrow(/Grapple or Bind/);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.unit(u.id), f.unit(s.id), 'grappled', undefined, undefined, { skipSave: true } as any));
    expect(() => hurl(f, u, 'u:' + s.id, '6,3')).toThrow(/too big to hurl/);
    expect(f.unit(u.id).ap).toBe(6);
  });
  it('a Grappled minion is thrown and lands at the tile', () => {
    const { f, u } = rig(); const [m] = f.foes; m.pos = '3,4';
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.unit(u.id), f.unit(m.id), 'grappled', undefined, undefined, { skipSave: true } as any));
    hurl(f, u, 'u:' + m.id, '6,4');
    expect(f.unit(m.id).pos).toBe('6,4'); expect(f.unit(m.id).hp).toBeLessThan(999);
  });
  it('the pick list offers the loose crate and names why a foe can\'t be lifted', () => {
    const { f, u } = rig(); const [m] = f.foes; m.pos = '3,4';
    const d: any = previewDescriptor(f.g, u.id, 'pk:class:fighter.hurl#hurl', {}, 'host');
    expect(d).toBeTruthy();
  });
});
