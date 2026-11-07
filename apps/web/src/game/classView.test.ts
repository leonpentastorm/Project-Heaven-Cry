// game/classView.ts: signature progress, closest classes, advanced classes in reach, moves by rank, uses left.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, newCharacter, CLASS, type Character } from '@engine';
import { signatureOf, closestClasses, advancedInReach, classMoves, usesLine, classLabel, emblemOf } from './classView';

const charWith = (o: Partial<Character> = {}): Character => {
  const a = ARCHETYPES.find((x: any) => x.id === 'sharpshooter') || ARCHETYPES[0];
  const c = newCharacter('c1', 'p1', { name: 'T', portrait: '', origin: 'x', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} });
  return Object.assign(c, o);
};
const setSig = (c: Character, cls: string, each: number) => CLASS[cls].signature.forEach((s: string) => { c.skills[s] = each; });

describe('classView', () => {
  it('signature progress to the next rank (13, 18)', () => {
    const c = charWith({ classId: 'marksman' }); setSig(c, 'marksman', 4);
    const s = signatureOf(c, 'marksman')!;
    expect(s.total).toBe(12); expect(s.rank).toBe(1); expect(s.next).toBe(13); expect(s.nextLine).toBe('Rank II at 13 · 1 to go');
    setSig(c, 'marksman', 6); expect(signatureOf(c, 'marksman')!.nextLine).toBe('Top rank');
  });
  it('moves by rank: earned lit, the rest locked with their threshold', () => {
    const c = charWith({ classId: 'marksman' }); setSig(c, 'marksman', 5); // 15: rank II
    const m = classMoves({}, c, 'marksman');
    expect(m.map((x) => x.earned)).toEqual([true, true, false]);
    expect(m[2].unlock).toBe('unlocks at 18');
    m.forEach((x) => expect(['Engine runs it', 'Narrator rules it', 'Both']).toContain(x.badge));
    expect(classLabel(c)).toBe('Marksman II');
  });
  it('closest classes mark the closest-class options', () => {
    const c = charWith(); const cl = closestClasses(c, 4);
    expect(cl.length).toBeGreaterThanOrEqual(4); expect(cl[0].offered).toBe(true);
    expect(cl[0].total).toBeGreaterThanOrEqual(cl[cl.length - 1].total);
    expect(cl[0].icon).toMatch(/^data:image\/svg\+xml,/);
  });
  it('advanced classes in reach list what is missing; ready once totals and tutor are there', () => {
    const c = charWith({ classId: 'marksman' }); setSig(c, 'marksman', 5); setSig(c, 'fighter', 3);
    let gun = advancedInReach(c, 30).find((a) => a.id === 'gunslinger')!;
    expect(gun.ready).toBe(false); expect(gun.missing).toEqual([expect.stringMatching(/^a tutor/)]);
    c.tutors = ['gunslinger'];
    gun = advancedInReach(c, 30).find((a) => a.id === 'gunslinger')!;
    expect(gun.ready).toBe(true); expect(gun.missing).toEqual([]);
    expect(advancedInReach(c, 3)[0].id).toBe('gunslinger');
    setSig(c, 'fighter', 2);
    expect(advancedInReach(c, 30).find((a) => a.id === 'gunslinger')!.missing[0]).toBe('Fighter signature 6/9');
  });
  it('uses left from the engine counters (a per-scene move)', () => {
    const c = charWith({ classId: 'mage' }); setSig(c, 'mage', 5); c.uses = {};
    const g = { characters: { c1: c }, story: { scene: { n: 1 }, round: 1 }, sessionN: 1 };
    expect(usesLine(g, c, 'class:mage.overcharge', 'II')).toMatch(/1\/1 scene left/);
  });
  it('emblems take the core ink', () => {
    expect(emblemOf('mage').ink).toBe('#4FC8DF'); expect(emblemOf(null).icon).toBe('');
  });
});
