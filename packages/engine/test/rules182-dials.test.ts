// Rules 1.82 item 7003: a base class's dials (classes.json `dials`), the class-only multiplier. A dial at 1 is no item
// at all; a dial turned by a measure multiplies what that class's characters deal through its door, on the one
// `dealing` hook (the item op damage_mult), and nobody else's. Through the real path: a Figment's blow is sized by
// attackDamage (as its strike is), the Rigger's dial is read from the class's data.
import { describe, it, expect } from 'vitest';
import { figFight } from './helpers/figfight';
import { withGame } from './helpers/perkfight';
import { attackDamage, CLASSES } from '../src';
import { classDialMove } from '../src/data';

const RIGGER: any = (CLASSES as any[]).find((b) => b.id === 'trickster');
const fig = (classId: string | null) => {
  const f = figFight([{ skills: { visualization: 8 }, classId, picks: ['fork.figment.hard_light', 'fork.figment.many_hands'], forms: ['double', 'beast', 'snare'], weapon: 'service_pistol' } as any], [{ tier: 'soldier', at: '9,4', classic: true }]);
  let u = f.turn(f.pc); u.ap = 9; f.picture(u, 'beast', '3,4'); u = f.unit(u.id); const b = f.figments(u)[f.figments(u).length - 1];
  return withGame(f.g, () => attackDamage(f.cb, f.unit(b.id), f.foe, 'melee', null, { preview: true }));
};

describe('rules 1.82 item 7003: the class dials', () => {
  it('every dial ships at 1, so no class holds a dial item (nothing moves until the balance pass fits one)', () => {
    for (const b of CLASSES as any[]) expect(classDialMove(b), b.id).toBeNull();
    expect(RIGGER.dials.length).toBeGreaterThan(0);
  });
  it('a dial turned multiplies the Rigger\'s Figments\' blows, by its label, and not another class\'s', () => {
    const was = RIGGER.dials[0].value; RIGGER.dials[0].value = 1.25;
    try {
      const r = fig('trickster'), o = fig('mage');
      expect(r.mults.filter((m: any) => m.label === RIGGER.dials[0].label).map((m: any) => m.v)).toEqual([1.25]);
      expect(o.mults.some((m: any) => m.label === RIGGER.dials[0].label)).toBe(false);
    } finally { RIGGER.dials[0].value = was; }
  });
});
