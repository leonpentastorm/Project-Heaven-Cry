// The ambient mana meter's deaths (spec: The ambient mana meter; rules.json mana.meter.events): a person +5, a beast or
// monster +3, a robot or machine +2, each death once.
import { describe, expect, it } from 'vitest';
import { deathMana, noteDeaths, type Unit } from '../src';
import { fightWith } from './helpers/perkfight';

describe('deaths raise the meter by what died', () => {
  it('a person +5, a beast +3, a robot +2 (deathMana), and noteDeaths counts each death once', () => {
    const u = (kind: string, name = 'X') => ({ kind, name } as unknown as Unit);
    expect([deathMana(u('human', 'Raider')), deathMana(u('beast', 'Ridge hound')), deathMana(u('robot', 'Unit 7')), deathMana(u('', 'Scavenger drone'))]).toEqual([5, 3, 2, 2]);
    const f = fightWith([{}], [{}, {}]); const cb = f.cb; cb.mana = 15;
    f.foes[0].kind = 'beast'; f.foes[0].dead = true; f.foes[1].dead = true;
    noteDeaths(cb); expect(cb.mana).toBe(15 + 3 + (f.foes[1].kind === 'robot' ? 2 : 5));
    const m = cb.mana; noteDeaths(cb); expect(cb.mana).toBe(m);
  });
});
