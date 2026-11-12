import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import { canRevertLevelUp } from '../src';
import { storyWith } from './helpers/perkfight';

/** Leon, 11 Nov 2026: a Revert button on the level-up screen. What a visit spent can be taken back until a fight or a
 * class settles it. */
describe('taking a level-up back', () => {
  const mk = () => { const s = storyWith([{ archetype: 'sharpshooter' }]); const c: any = s.chars[0]; c.unspent.skill = 3; c.unspent.attr = 2; c.attrs.agility = 4; c.skills.dexterity = 2; c.level = 4; return s; };
  const C = (s: any) => Object.values(s.g.characters)[0] as any;
  it('nothing to take back before anything is spent', () => { const s = mk(); expect(canRevertLevelUp(s.g, C(s))).toMatch(/Nothing/); });
  it('points and the perk step they opened come back', () => {
    const s = mk(), before = JSON.stringify([C(s).skills, C(s).attrs, C(s).unspent, C(s).perks]);
    s.act({ type: 'levelup/raise', charId: C(s).id, kind: 'skill', id: 'dexterity' });
    s.act({ type: 'levelup/raise', charId: C(s).id, kind: 'attr', id: 'endurance' });
    expect(C(s).skills.dexterity).toBe(3); expect(canRevertLevelUp(s.g, C(s))).toBeNull();
    s.act({ type: 'levelup/revert', charId: C(s).id });
    expect(JSON.stringify([C(s).skills, C(s).attrs, C(s).unspent, C(s).perks])).toBe(before);
    expect(canRevertLevelUp(s.g, C(s))).toMatch(/Nothing/);
    expect(() => s.act({ type: 'levelup/revert', charId: C(s).id })).toThrow(/Nothing/);
  });
  it('a fight settles it', () => {
    const s = mk(); s.act({ type: 'levelup/raise', charId: C(s).id, kind: 'skill', id: 'dexterity' });
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'minion', weapon: 'fists' }] } } } as any);
    expect(canRevertLevelUp(s.g, C(s))).toMatch(/Nothing/); expect(C(s).skills.dexterity).toBe(3);
  });
  it('a build changed by something else is not rolled back over', () => {
    const s = mk(); s.act({ type: 'levelup/raise', charId: C(s).id, kind: 'skill', id: 'dexterity' });
    const g = JSON.parse(JSON.stringify(s.g)); (Object.values(g.characters)[0] as any).perks.push({ id: 'bulwark', tier: 'I' });
    expect(canRevertLevelUp(g, Object.values(g.characters)[0] as any)).toMatch(/Nothing/);
  });
});
