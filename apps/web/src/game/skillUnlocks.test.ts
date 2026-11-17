import { describe, expect, it } from 'vitest';
import { SKILL } from '@engine';
import { fromSkillsOf } from './skillUnlocks';

describe('FROM YOUR SKILLS (0.31.9)', () => {
  it('lists the named unlocks the points reach, with their card line and skill; no perk steps, forks or verb rows', () => {
    const rows = fromSkillsOf({ skills: { durability: 5, pain_threshold: 3, composure: 2 } }, SKILL as any);
    const names = rows.map((r) => r.name);
    expect(names).toContain('Second Wind'); expect(names).toContain('Numb');
    expect(names).not.toContain('Still Standing'); expect(names).not.toContain('Poker Face'); // 5 and 3 points: not reached
    expect(rows.find((r) => r.name === 'Second Wind')).toMatchObject({ skill: 'Durability', cat: 'ACTIVE SKILL' });
    expect(rows.every((r) => r.text && !/\{=/.test(r.text))).toBe(true);
    expect(names.some((n) => /^Mastery \d|^Mastered$/.test(n))).toBe(false);
    expect(fromSkillsOf(null, SKILL as any)).toEqual([]);
  });
});
