// The character sheet's derived lines: every number is the engine's, and every line names the skill the rules read.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, SKILL, newCharacter, healingMult, healReceivedMult, shieldReceivedMult, saveBonus, marginsTakenOf, ambushTakenPct, sigilRangeBonus, sigilCoreSaving, soulRangeBonus, readyDesigns } from '@engine';
import { derivedLines, previewCharacter } from './derived';

const make = (skills: Record<string, number>, attrs: Record<string, number> = {}) => {
  const base: any = Object.fromEntries(['endurance', 'strength', 'agility', 'perception', 'intelligence', 'expression', 'insight', 'determination', 'virtue'].map((a) => [a, 6]));
  const c = previewCharacter(skills, { ...base, ...attrs }, [], 'medic')!; c.level = 5; return c;
};
const row = (c: any, key: string) => derivedLines(c).find((r) => r.key === key)!;

describe('derivedLines', () => {
  it('names the skill behind each number as the rules have it now', () => {
    const c = make({});
    const from = Object.fromEntries(derivedLines(c).map((r) => [r.key, r.from]));
    expect(from.hp_pt).toBe('Pain Threshold');
    expect(from.heal_given).toBe('Insight and Empathy');
    expect(from.heal_received).toBe('Camaraderie');
    expect(from.shield_received).toBe('Conscience');
    expect(from.save_body).toBe('Guts'); expect(from.save_brain).toBe('Rumination'); expect(from.save_heart).toBe('Composure');
    expect(from.margins_taken).toBe(SKILL.analysis.name); expect(from.margin).toBe('Perception'); expect(SKILL.analysis.name).toBe('Acuity');
    expect(from.ambush_taken).toBe(SKILL.proficiency.name); expect(SKILL.proficiency.name).toBe('Improvisation');
    expect(from.sigil_range).toBe('Brain Power'); expect(from.sigil_cores).toBe('Brain Power');
    expect(from.soul_range).toBe('Will Power'); expect(from.ready_designs).toBe('Lore Master');
  });
  it('each number moves with its own skill and with no other (read from the engine)', () => {
    // rules 1.95: Pain Threshold's line is a share of the bar a point
    const cases: [string, string, (c: any) => string][] = [
      ['hp_pt', 'pain_threshold', (c) => '+' + Math.round((SKILL as any).pain_threshold.per_point.numbers.hp_pct * c.skills.pain_threshold * 100) + '%'], ['heal_given', 'empathy', (c) => '×' + Math.round(healingMult(c) * 100) / 100],
      ['heal_received', 'camaraderie', (c) => '×' + Math.round(healReceivedMult(c) * 100) / 100], ['shield_received', 'conscience', (c) => '×' + Math.round(shieldReceivedMult(c) * 100) / 100],
      ['save_brain', 'rumination', (c) => '+' + saveBonus(c, 'brain')], ['margins_taken', 'analysis', (c) => String(marginsTakenOf(c)).replace('-', '−')],
      ['ambush_taken', 'proficiency', (c) => '−' + Math.round(ambushTakenPct(c) * 100) + '%'], ['sigil_range', 'brain_power', (c) => '+' + sigilRangeBonus(c) + ' tiles'],
      ['sigil_cores', 'brain_power', (c) => sigilCoreSaving(c) + ' a Sigil'], ['soul_range', 'will_power', (c) => '+' + soulRangeBonus(c) + ' tiles'], ['ready_designs', 'lore_master', (c) => String(readyDesigns(c))],
    ];
    const zero = make({});
    for (const [key, skill, want] of cases) {
      const c = make({ [skill]: 6 });
      expect(row(c, key).v, key).toBe(want(c));
      expect(row(c, key).v, key + ' moved').not.toBe(row(zero, key).v);
    }
    // the old homes no longer move them
    expect(row(make({ durability: 6 }), 'hp_pt').v).toBe(row(zero, 'hp_pt').v);
    expect(row(make({ camaraderie: 6 }), 'heal_given').v).toBe(row(zero, 'heal_given').v);
    expect(row(make({ charisma: 6 }), 'save_brain').v).toBe(row(zero, 'save_brain').v);
    expect(row(make({ lore_master: 6 }), 'soul_range').v).toBe(row(zero, 'soul_range').v);
  });
  it('a preview character is built for every archetype', () => {
    for (const a of ARCHETYPES) { const c = previewCharacter(a.preset, a.attributes as any, [], null); expect(c, a.id).toBeTruthy(); expect(derivedLines(c!).length).toBeGreaterThan(15); }
    void newCharacter;
  });
});
