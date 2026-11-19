// @ts-nocheck (test fixtures: plain objects)
// Rules 1.77 (0.32, the engine pieces): the pieces the lead approved from the lanes' "needs a primitive" list, and the
// rules each unlocked. Every rule goes through the reducer (the helpers' fight, a real action) or a real blow; every
// number is read from data.
import { describe, it, expect } from 'vitest';
import { PERK, condOn, actionsFor } from '../src';
import { fightWith } from './helpers/perkfight';

const tierFx = (id: string, t: string) => (PERK as any)[id].tiers[t].effects;

describe('targets.if (item 6500): Five Stars II reaches the rank-and-file only', () => {
  it('a soldier can be Shaken by Five Stars II; an Elite and a Boss never are', () => {
    expect(tierFx('five_stars', 'II')[1].targets.if.target_not_tier).toEqual(['elite', 'boss']);
    const shakenOf = (tier: string) => { let n = 0; for (let i = 0; i < 8; i++) { const f = fightWith([{ skills: { authority: 9 }, perks: { five_stars: 'II' } }], [{ at: 'F6', tier }], { seed: 'FS' + i }); if (condOn(f.foe, 'shaken')) n++; } return n; };
    expect(shakenOf('soldier')).toBeGreaterThan(0);
    expect(shakenOf('elite')).toBe(0);
    expect(shakenOf('boss')).toBe(0);
  });
});

describe("grant_action tab (item 6501): the Tending verbs on Camaraderie's perks sit on the TEND tab", () => {
  it('Settle and Soothe (Steady Hands II) and Tug and Guide (Pull Together II) are TEND rows, not Perks rows', () => {
    const f = fightWith([{ skills: { empathy: 5, camaraderie: 9 }, perks: { steady_hands: 'II', pull_together: 'II' } }], [{ at: 'F6' }]);
    const rows = actionsFor(f.g, f.pc.id, null);
    for (const name of ['Settle', 'Soothe', 'Tug', 'Guide']) { const d: any = rows.find((x: any) => x.name.startsWith(name)); expect(d, name).toBeTruthy(); expect(d.group, name).toBe('tend'); }
  });
});
