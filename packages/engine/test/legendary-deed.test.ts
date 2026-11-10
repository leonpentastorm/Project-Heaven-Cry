import { describe, expect, it } from 'vitest';
import { attrCapAt, canRaise, legendRoom, newCharacter } from '../src';
import { sheetOf } from './helpers/perkfight';

/** Rules 1.13, item 1006: a Legendary Deed grants 1 Attribute point, and one Attribute point per deed may stand 1 above
 * the level's ceiling (never above 10). */
describe('a Legendary Deed', () => {
  const mk = () => { const c: any = newCharacter('c1', 'p1', sheetOf({ archetype: 'sharpshooter' })); c.level = 1; c.unspent.attr = 3; c.attrs.strength = attrCapAt(1); return c; };
  it('without one, the ceiling holds', () => { const c = mk(); expect(canRaise(c, 'attr', 'strength')).toMatch(/opens at level/); expect(legendRoom(c)).toBe(0); });
  it('with one, a single Attribute goes 1 above the ceiling and no further', () => {
    const c = mk(); c.legends = 1; expect(canRaise(c, 'attr', 'strength')).toBeNull();
    c.attrs.strength++; expect(legendRoom(c)).toBe(0);
    expect(canRaise(c, 'attr', 'strength')).toMatch(/opens at level/);
    c.attrs.agility = attrCapAt(1); expect(canRaise(c, 'attr', 'agility')).toMatch(/opens at level/); // the room is used
  });
  it('a ceiling that rises frees the room again', () => { const c = mk(); c.legends = 1; c.attrs.strength++; c.level = 3; expect(legendRoom(c)).toBe(1); });
  it('never above 10', () => { const c = mk(); c.legends = 1; c.level = 9; c.attrs.strength = 10; expect(canRaise(c, 'attr', 'strength')).toMatch(/Already at 10/); });
});
