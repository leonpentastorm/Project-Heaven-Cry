// Rules 1.82 item 7011 (Waiting on Leon 19, built as the agility draft says, PROVISIONAL): Athletics gives +1 Defense a
// point from its first point (skills.json athletics per_point.numbers.defense_from 1; was from 2). Read through the
// unit a fight builds from the sheet (the to-hit a foe faces).
import { describe, expect, it } from 'vitest';
import { fightWith } from './helpers/perkfight';
import skillsJ from '../../../data/skills.json';

const N: any = (skillsJ as any).items.find((x: any) => x.id === 'athletics').per_point.numbers;
const defOf = (pts: number) => fightWith([{ skills: { athletics: pts } }], [{}]).pc.def;
describe('rules 1.82 item 7011: Athletics\' Defense from the first point', () => {
  it('0 points: nothing; each point from defense_from adds its defense', () => {
    expect(N.defense_from).toBe(1);
    const base = defOf(0);
    for (const p of [1, 2, 5]) expect(defOf(p) - base, 'Athletics ' + p).toBe((p - (N.defense_from - 1)) * N.defense);
  });
});
