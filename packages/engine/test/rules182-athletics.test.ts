// Rules 1.82 item 7011 (Waiting on Leon 19, built as the agility draft says, PROVISIONAL): Athletics gives +1 Defense a
// point from its first point when skills.json athletics per_point.numbers.defense_from is 1. It ships at 2 (the rule
// before): from 1 it moves the enemy yardstick and the defence guard, whose refit is the balance lane's. Read through the
// unit a fight builds from the sheet (the Defense a foe rolls against).
import { describe, expect, it } from 'vitest';
import { fightWith } from './helpers/perkfight';
import { SKILL } from '../src';

const N: any = (SKILL as any).athletics.per_point.numbers;
const defOf = (pts: number) => fightWith([{ skills: { athletics: pts } }], [{}]).pc.def;
describe('rules 1.82 item 7011: Athletics\' Defense from the first point (a switch)', () => {
  it('ships at 2: the first point gives nothing, each point from the second +defense', () => {
    expect(N.defense_from).toBe(2);
    const base = defOf(0); expect(defOf(1)).toBe(base); expect(defOf(3) - base).toBe(2 * N.defense);
  });
  it('at 1: each point from the first adds its defense', () => {
    const was = N.defense_from; N.defense_from = 1;
    try { const base = defOf(0); for (const p of [1, 2, 5]) expect(defOf(p) - base, 'Athletics ' + p).toBe(p * N.defense); }
    finally { N.defense_from = was; }
  });
});
