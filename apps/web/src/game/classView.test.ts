// game/classView.ts: attribute progress (Class Roster Revision 3), closest classes, advanced classes in reach, moves by rank, uses left.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, newCharacter, CLASS, type Character } from '@engine';
import { attributeProgress, closestClasses, advancedInReach, classMoves, classRanks, classCard, resourceLine, heldClassId, currentClassId, usesLine, classLabel, emblemOf } from './classView';
import { classOf } from './commands';

const charWith = (o: Partial<Character> = {}): Character => {
  const a = ARCHETYPES.find((x: any) => x.id === 'sharpshooter') || ARCHETYPES[0];
  const c = newCharacter('c1', 'p1', { name: 'T', portrait: '', origin: 'x', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} });
  return Object.assign(c, o);
};
/** Class Roster Revision 3: a class's rank reads its attribute (II at 5, III at 8) and, since rules 1.11, the level (6, 12). */
const setAttr = (c: Character, cls: string, v: number) => { c.attrs[CLASS[cls].attribute] = v; };

describe('classView', () => {
  it('attribute progress to the next rank (5, 8)', () => {
    const c = charWith({ classId: 'marksman', level: 4 }); setAttr(c, 'marksman', 4);
    const s = attributeProgress(c, 'marksman')!;
    expect(s.total).toBe(4); expect(s.rank).toBe(1); expect(s.next).toBe(5); expect(s.nextLine).toBe('Rank II at Agility 5 · 1 to go and level 6 · 2 to go');
    setAttr(c, 'marksman', 8); expect(attributeProgress(c, 'marksman')!.rank).toBe(1); // the attribute alone isn't enough (rules 1.11)
    expect(attributeProgress(c, 'marksman')!.nextLine).toBe('Rank II at Agility 5 ✓ and level 6 · 2 to go');
    c.level = 6; expect(attributeProgress(c, 'marksman')!.nextLine).toBe('Rank III at Agility 8 ✓ and level 12 · 6 to go');
    c.level = 12; setAttr(c, 'marksman', 4);
    expect(s.skills.map((x: any) => x.id)).toEqual(CLASS.marksman.skills);
    expect(s.label).toBe('AGILITY 4'); expect(s.ink).toBe('#E3BF51'); // the attribute's ink
    setAttr(c, 'marksman', 8); expect(attributeProgress(c, 'marksman')!.nextLine).toBe('Top rank');
  });
  it('moves by rank, two a rank: earned lit, the rest locked with their threshold; reused moves keep their old key', () => {
    const c = charWith({ classId: 'marksman', level: 6 }); setAttr(c, 'marksman', 5); // rank II
    const m = classMoves({}, c, 'marksman');
    expect(m.map((x) => x.earned)).toEqual([true, true, true, true, false, false]);
    expect(m[4].unlock).toBe('unlocks at Agility 8 and level 12');
    expect(m.find((x) => x.id === 'run_and_gun')!.key).toBe('class:marksman.run_and_gun'); // rules 1.30: Called Shot left rank III
    expect(m.find((x) => x.id === 'killzone')!.key).toBe('class:marksman.killzone'); // a reused move keeps its old key
    m.forEach((x) => expect(['Engine runs it', 'Narrator rules it', 'Both']).toContain(x.badge));
    expect(classLabel(c)).toBe(CLASS.marksman.name + ' II');
  });
  it('ranks: three, two moves each, with the attribute value that unlocks them', () => {
    const c = charWith({ classId: 'bard', level: 6 }); setAttr(c, 'bard', 5);
    const r = classRanks({}, c, 'bard');
    expect(r.map((x) => x.head)).toEqual(['RANK I · WITH THE CLASS', 'RANK II · INSIGHT 5 · LEVEL 6', 'RANK III · INSIGHT 8 · LEVEL 12']);
    expect(r.map((x) => x.unlocked)).toEqual([true, true, false]);
    r.forEach((x) => expect(x.moves.length).toBe(2));
    expect(r[0].moves[0].key).toBe('class:medic.triage'); // a reused move keeps its old key
  });
  it('picker card: attribute with its ink, the fantasy line, resources, both rank I moves', () => {
    const c = charWith(); for (const k of Object.keys(c.attrs)) c.attrs[k] = 3;
    const v = classCard(c, 'infiltrator')!;
    expect(v.attributeName).toBe('Perception'); expect(v.attrInk).toBe('#40BAA0'); expect(v.value).toBe(3);
    expect(v.tagline).toBe(CLASS.infiltrator.tagline); expect(v.resource).toBe('Marks (max 3) · Toxin doses');
    expect(v.moves.map((m: any) => m.name)).toEqual(CLASS.infiltrator.ranks.I.moves.map((m: any) => m.name));
    expect(v.moves.length).toBe(2); expect(v.icon).toMatch(/^data:image\/svg\+xml,/);
    expect(resourceLine('bard')).toBe('Supplies · MP · Strain');
  });
  it('a held shelved advanced class shows nothing of its own; a move origin maps to the class that holds it now', () => {
    const c = charWith({ classId: 'marksman', advancedClass: 'gunslinger' } as any);
    expect(heldClassId(c)).toBe('marksman');
    expect(classOf(c)!.name).toBe(CLASS.marksman.name);
    expect(currentClassId('medic')).toBe('bard'); expect(currentClassId('assassin')).toBe('infiltrator'); expect(currentClassId('mage')).toBe('mage');
    expect(classOf(null, 'medic')!.name).toBe(CLASS.bard.name); // the Class tab with no character: Triage's origin → the bard class
    expect(classOf({ classId: 'bard' }, 'medic')!.id).toBe('bard');
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
    c.advancedClass = 'gunslinger'; expect(classLabel(c)).toBe(CLASS.marksman.name + ' I');
  });
  it('uses left from the engine counters (a per-scene move)', () => {
    const c = charWith({ classId: 'mage', level: 6 }); setAttr(c, 'mage', 5); c.uses = {};
    const g = { characters: { c1: c }, story: { scene: { n: 1 }, round: 1 }, sessionN: 1 };
    expect(usesLine(g, c, 'class:mage.overcharge', 'II')).toMatch(/1\/1 scene left/);
  });
  it('emblems take the core ink', () => {
    expect(emblemOf('mage').ink).toBe('#4FC8DF'); expect(emblemOf(null).icon).toBe('');
  });
});
