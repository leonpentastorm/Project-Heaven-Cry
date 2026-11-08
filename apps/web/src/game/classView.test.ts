// game/classView.ts: attribute progress (Class Roster Revision 3), closest classes, advanced classes in reach, moves by rank, uses left.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, newCharacter, CLASS, type Character } from '@engine';
import { signatureOf, closestClasses, advancedInReach, classMoves, usesLine, classLabel, emblemOf } from './classView';

const charWith = (o: Partial<Character> = {}): Character => {
  const a = ARCHETYPES.find((x: any) => x.id === 'sharpshooter') || ARCHETYPES[0];
  const c = newCharacter('c1', 'p1', { name: 'T', portrait: '', origin: 'x', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} });
  return Object.assign(c, o);
};
/** Class Roster Revision 3: a class's rank reads its attribute (II at 5, III at 8). */
const setAttr = (c: Character, cls: string, v: number) => { c.attrs[CLASS[cls].attribute] = v; };

describe('classView', () => {
  it('attribute progress to the next rank (5, 8)', () => {
    const c = charWith({ classId: 'marksman' }); setAttr(c, 'marksman', 4);
    const s = signatureOf(c, 'marksman')!;
    expect(s.total).toBe(4); expect(s.rank).toBe(1); expect(s.next).toBe(5); expect(s.nextLine).toBe('Rank II at Agility 5 · 1 to go');
    expect(s.skills.map((x: any) => x.id)).toEqual(CLASS.marksman.skills);
    setAttr(c, 'marksman', 8); expect(signatureOf(c, 'marksman')!.nextLine).toBe('Top rank');
  });
  it('moves by rank, two a rank: earned lit, the rest locked with their threshold; reused moves keep their old key', () => {
    const c = charWith({ classId: 'marksman' }); setAttr(c, 'marksman', 5); // rank II
    const m = classMoves({}, c, 'marksman');
    expect(m.map((x) => x.earned)).toEqual([true, true, true, true, false, false]);
    expect(m[4].unlock).toBe('unlocks at Agility 8');
    expect(m.find((x) => x.id === 'called_shot')!.key).toBe('class:gunslinger.called_shot');
    m.forEach((x) => expect(['Engine runs it', 'Narrator rules it', 'Both']).toContain(x.badge));
    expect(classLabel(c)).toBe('Marksman II');
  });
  it('closest classes mark the closest-class options', () => {
    const c = charWith(); const cl = closestClasses(c, 4);
    expect(cl.length).toBeGreaterThanOrEqual(4); expect(cl[0].offered).toBe(true);
    expect(cl[0].total).toBeGreaterThanOrEqual(cl[cl.length - 1].total);
    expect(cl[0].icon).toMatch(/^data:image\/svg\+xml,/);
  });
  it('advanced classes are shelved: each says so, none is ready; a held one is not shown as active', () => {
    const c = charWith({ classId: 'marksman' });
    const gun = advancedInReach(c, 30).find((a) => a.id === 'gunslinger')!;
    expect(gun.ready).toBe(false); expect(gun.missing).toEqual(['Advanced classes are being rebuilt; not learnable yet.']);
    c.advancedClass = 'gunslinger'; expect(classLabel(c)).toBe('Marksman I');
  });
  it('uses left from the engine counters (a per-scene move)', () => {
    const c = charWith({ classId: 'mage' }); setAttr(c, 'mage', 5); c.uses = {};
    const g = { characters: { c1: c }, story: { scene: { n: 1 }, round: 1 }, sessionN: 1 };
    expect(usesLine(g, c, 'class:mage.overcharge', 'II')).toMatch(/1\/1 scene left/);
  });
  it('emblems take the core ink', () => {
    expect(emblemOf('mage').ink).toBe('#4FC8DF'); expect(emblemOf(null).icon).toBe('');
  });
});
