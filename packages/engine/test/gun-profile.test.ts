// Rules 1.57 (0.30, G1; Leon 16 Nov 2026: "add damage per attribute like others, nerf the base dmg, not to a useless
// degree"): a character's gun shot reads the gun profile (rules.json output.profiles.gun) through the gun's row
// (weapons.json phys.profile: gun), a slope on its scales_with Attribute (Agility); k re-pins Agility 7 to the weapon
// profile's 1.5. Played through the reducer: the same seeded shots at Agility 1, 7 and 10. An enemy's gun reads its tier
// and level, not the profile (combat.ts attackDamage): the golden tables hold the enemy rows byte for byte.
import { describe, it, expect } from 'vitest';
import { PROFILES, WEAPONS } from '../src';
import { fightWith } from './helpers/perkfight';

const SEEDS = Array.from({ length: 16 }, (_, i) => 'G1-gun-' + i);
/** One fresh fight a seed, one plain shot at a soldier with HP to spare and no armour (so the ratio is the profile's);
 * what each shot took. */
function volley(agility: number, weapon = 'service_pistol') {
  return SEEDS.map((seed) => {
    const f = fightWith([{ weapon, attrs: { agility }, skills: { dexterity: 6 }, classId: null }], [{ tier: 'soldier', at: 'F6', classic: true }], { seed });
    const foe = f.foe; foe.hp = foe.maxHp = 9999; foe.armour = 0; f.turn(f.pc);
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: foe.id, mode: 'shot' });
    return 9999 - f.unit(foe.id).hp;
  });
}

describe('rules 1.57: a character\'s gun shot grows with the gun\'s Attribute', () => {
  it('every gun names the gun profile; bows, thrown charges and the foci\'s weapons name none', () => {
    const GUNS = ['pistol', 'revolver', 'smg', 'rifle', 'shotgun', 'heavy'];
    for (const w of WEAPONS as any[]) if (w.phys?.system === 'ranged') expect(w.phys.profile, w.id).toBe(GUNS.includes(w.category) ? 'gun' : undefined);
    const g = PROFILES.gun; expect(g.skill).toBe(0); expect(g.k * (1 + g.attr * 6)).toBeCloseTo(PROFILES.weapon.k, 4);
  });
  it('played: the same seeded shots deal about x0.77 at Agility 1 and x1.12 at Agility 10 of what Agility 7 deals', () => {
    const g = PROFILES.gun, at = [1, 7, 10].map((a) => volley(a));
    const both = SEEDS.map((_, i) => i).filter((i) => at.every((r) => r[i] > 0)); // the seeds where every shot landed
    expect(both.length, 'the shots landed').toBeGreaterThan(8);
    const sum = (r: number[]) => both.reduce((t, i) => t + r[i], 0), [a1, a7, a10] = at.map(sum);
    expect(a1 / a7).toBeCloseTo(1 / (1 + g.attr * 6), 1);
    expect(a10 / a7).toBeCloseTo((1 + g.attr * 9) / (1 + g.attr * 6), 1);
    expect(a1).toBeLessThan(a7); expect(a10).toBeGreaterThan(a7);
});
});
