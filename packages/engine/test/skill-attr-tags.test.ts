// Bug, 13 Nov 2026: Acuity (`analysis`, Perception's beta) carried `attr:expression` and Improvisation (`proficiency`,
// Expression's beta) `attr:perception`. skill_mod_tag (effects/core.ts skillHasTag) matches a skill's tags as well as
// its attribute, so an item's `attr:expression` modifier would have reached Acuity too. The validator holds the data
// (tools/validate.py: a skill's attr: tag is its attribute); this holds what the engine loaded.
import { describe, expect, it } from 'vitest';
import { SKILL, condSkillMod, type Unit } from '../src';

describe('a skill\'s attr: tag is its attribute', () => {
  it('every skill carries exactly one attr: tag, its own attribute', () => {
    for (const s of Object.values(SKILL) as any[]) expect((s.tags || []).filter((t: string) => t.startsWith('attr:')), s.id).toEqual(['attr:' + s.attribute]);
  });
  it('Right Brain Debuff (attr:expression, core:soul) reaches Improvisation, not Acuity', () => {
    const u = { conds: { rdebuff: 2 } } as unknown as Unit;
    expect(condSkillMod(u, 'proficiency')).toBe(-2);
    expect(condSkillMod(u, 'analysis')).toBe(0);
  });
});
