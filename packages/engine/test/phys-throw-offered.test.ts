// Rules 1.55 (15 Nov 2026, Leon's ruling B): Throw comes with a throwing weapon (the thrown property, by data: no
// weapon id in code), and Pull Out brings a stuck weapon back. Everything through the real reducer and the real pad.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, WEAPON } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const fight = (weapon: string, at = 'D5') => {
  const f = physFight([{ weapon, known: [], skills: { athletics: 6, raw_power: 4, dexterity: 6 } }], [{ at, tier: 'elite', weapon: 'service_pistol' }]);
  f.put(f.pc, 'C5'); f.put(f.foes[0], at); f.turn(f.pc); return f;
};
const offered = (f: ReturnType<typeof fight>) => f.pad().flatMap((g) => g.entries).map((e) => e.id);
const thrownWeapons = () => Object.values(WEAPON as any).filter((w: any) => phys.weaponSystem(w.id) === 'melee' && phys.weaponProps(w.id).includes('thrown')).map((w: any) => w.id as string);

describe('Throw comes with the thrown property', () => {
  it('every melee weapon with the thrown property offers Throw without readying it', () => {
    const ids = thrownWeapons(); expect(ids.length).toBeGreaterThan(1);
    for (const id of ids) expect(offered(fight(id)), id).toContain('throw');
  });
  it('a maul (no thrown property) is offered neither Throw nor a usable Pull Out', () => {
    const f = fight('maul'); expect(offered(f)).not.toContain('throw');
    expect(f.tech('throw', { targetId: f.foe.id })).toMatch(/don't have Throw ready/);
    expect(f.tech('pull_out', { targetId: f.foe.id })).toMatch(/No weapon is stuck/);
  });
  it('a throw that hits and does not kill leaves the knife stuck; Pull Out from next to it brings it back', () => {
    const f = fight('combat_knife', 'G5');
    rig({ hit: true, die: 12 }); expect(f.tech('throw', { targetId: f.foe.id })).toBeNull(); rig(null);
    expect(f.foe.hp).toBeGreaterThan(0);
    expect((f.foe.stuck || []).map((x: any) => x.weapon)).toEqual(['combat_knife']);
    expect(f.pc.weapon).toBe('fists');
    // the sheet's line and the target's mark read the engine's view
    expect(phys.physView(f.cb, f.pc, 'pc', f.g).thrown.map((x) => x.text)).toEqual([expect.stringMatching(/^Your combat knife is stuck in /)]);
    expect(phys.physView(f.cb, f.foe, 'pc', f.g).stuck.map((x) => x.weapon)).toEqual(['combat_knife']);
    expect(f.tech('pull_out', { targetId: f.foe.id })).toMatch(/Stand next to/);
    f.put(f.pc, 'F5'); f.pc.ap = 6;
    expect(offered(f)).toContain('pull_out');
    expect(f.tech('pull_out', { targetId: f.foe.id })).toBeNull();
    expect(f.foe.stuck).toBeFalsy(); expect(f.pc.weapon).toBe('combat_knife');
    expect(phys.physView(f.cb, f.pc, 'pc', f.g).thrown).toEqual([]);
  });
});
