// Rules 1.11 (spec: Levels and XP, "On reaching a level"; item 924): odd levels 2 Skill points, even levels 1 Skill
// point and 1 Attribute point, a Core point every 3rd level up to 18.
import { describe, it, expect } from 'vitest';
import { levelGains, careerGains, applyLevels, xpForLevel, newCharacter, type Sheet } from '../src';

describe('level gains (rules 1.11)', () => {
  it('follows the spec table level by level', () => {
    expect(levelGains(1)).toEqual({ skill: 0, attr: 0, core: 0 });
    expect(levelGains(2)).toEqual({ skill: 1, attr: 1, core: 0 });
    expect(levelGains(3)).toEqual({ skill: 2, attr: 0, core: 0 });
    expect(levelGains(4)).toEqual({ skill: 1, attr: 1, core: 0 });
    expect(levelGains(5)).toEqual({ skill: 2, attr: 0, core: 0 });
    expect(levelGains(6)).toEqual({ skill: 1, attr: 1, core: 0 });
    expect(levelGains(18)).toEqual({ skill: 1, attr: 1, core: 0 });
    expect(levelGains(19)).toEqual({ skill: 2, attr: 0, core: 0 });
    expect(levelGains(20)).toEqual({ skill: 1, attr: 1, core: 0 });
    const cores = Array.from({ length: 20 }, (_, i) => i + 1).filter((l) => levelGains(l).core);
    expect(cores).toEqual([]); // rules 1.13: no Core points
  });
  it('gives 28 Skill and 10 Attribute points over levels 2 to 20 (rules 1.13: no Core points)', () => {
    expect(careerGains()).toEqual({ skill: 28, attr: 10, core: 0 });
  });
  it('applyLevels banks them as unspent points', () => {
    const sheet: Sheet = { name: 'T', playerName: 'T', skills: { dexterity: 4, vigilant: 3, reaction_speed: 3 }, attrs: { endurance: 4, strength: 2, agility: 4, perception: 4 }, cores: { body: 4, mind: 4, soul: 1 }, traits: [], kit: 'soldier' } as any;
    const c = newCharacter('c1', 'p1', sheet);
    c.xp = xpForLevel(3);
    expect(applyLevels(c)).toBe(2);
    expect(c.unspent).toEqual({ skill: 3, attr: 1, core: 0 });
    c.xp = xpForLevel(20); applyLevels(c);
    expect(c.unspent).toEqual({ skill: 28, attr: 10, core: 0 });
  });
});
