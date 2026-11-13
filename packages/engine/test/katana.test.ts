// Rules 1.32: the katana, added by data alone (data/weapons.json `katana`; no engine code). It loads, sits inside the
// light-blade family's ranges next to its comparable (the sabre), equips, strikes with the family's plain attack (Cut),
// offers what its properties give, and lends Draw Cut from the pack. Every number is read from data.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, WEAPON, WEAPONS, gearEntry, equip } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const K = WEAPON.katana as any;
const family = (WEAPONS as any[]).filter((w) => w.category === 'light_melee' && w.id !== 'katana');
const range = (k: string) => [Math.min(...family.map((w) => w[k])), Math.max(...family.map((w) => w[k]))];

describe('the katana (rules 1.32): data alone', () => {
  it('loads as a light blade, every number inside the family and nearest the sabre', () => {
    expect(K).toBeTruthy();
    expect(K.category).toBe('light_melee'); expect(K.mastery_family).toBe(WEAPON.sabre.mastery_family);
    expect(K.hands).toBe('1H'); expect(K.range_tiles).toBe(1); expect(K.skill).toBe('dexterity');
    for (const k of ['damage', 'weight_kg', 'price_credits']) { const [lo, hi] = range(k); expect(K[k], k).toBeGreaterThanOrEqual(lo); expect(K[k], k).toBeLessThanOrEqual(hi); }
    expect(K.ap_cost).toEqual(WEAPON.sabre.ap_cost); expect(K.durability).toBe(WEAPON.sabre.durability);
    expect(K.requires).toBeUndefined(); // no light blade needs a skill
    expect(K.phys.props).toEqual(WEAPON.sabre.phys.props);
    expect(phys.TECHNIQUE[K.phys.teaches]).toBeTruthy(); // an existing technique, no new one
  });
  it('equips from the pack into the main hand', () => {
    const f = physFight([{ weapon: 'service_pistol' }], [{ at: 'D5' }]);
    const c = f.char(f.pc); c.pack = [...(c.pack || []), gearEntry('katana')!];
    expect(equip(c, c.pack.length - 1, 'main')).toBeNull();
    expect(c.weapon).toBe('katana');
  });
  it('strikes with Cut (the free plain attack) for its own damage, at the light blade cost', () => {
    const f = physFight([{ weapon: 'katana', skills: { dexterity: 4 } }], [{ at: 'D5', tier: 'elite' }]);
    f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc); f.foe.hp = f.foe.maxHp = 999;
    const pv = f.pv('cut', { targetId: f.foe.id }); expect(pv.ok).toBe(true);
    expect(pv.attacks[0].pv.dmg!.base).toBe(K.damage);
    expect(pv.ap).toBe(K.ap_cost.attack);
    rig({ hit: true, die: 12 }); const ap = f.pc.ap!;
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    expect(f.foe.hp).toBeLessThan(999); expect(f.pc.ap).toBe(ap - K.ap_cost.attack);
  });
  it('its pad: the free strike and what its properties bring; Draw Cut is lent from the pack, never in the hand', () => {
    const held = physFight([{ weapon: 'katana' }], [{ at: 'D5' }]);
    held.put(held.pc, 'C5'); held.turn(held.pc);
    const ids = held.pad().flatMap((g) => g.entries.map((e) => e.id));
    expect(ids).toContain('cut'); expect(ids).not.toContain('draw_cut');
    const f = physFight([{ weapon: 'service_pistol', skills: { dexterity: 4 } }], [{ at: 'D5', tier: 'elite' }]);
    f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc); f.foe.hp = f.foe.maxHp = 999;
    const c = f.char(f.pc); c.pack = [...(c.pack || []), gearEntry('katana')!]; const item = c.pack.length - 1;
    const pad = f.bound(() => phys.packPad(f.cb, f.pc));
    expect(pad.find((b) => b.weapon === 'katana')?.entries.map((e) => e.id)).toContain('draw_cut');
    const pv = f.pv('draw_cut', { targetId: f.foe.id, item }); expect(pv.ok).toBe(true);
    expect(pv.attacks[0].pv.dmg!.base).toBe(K.damage);
    rig({ hit: true, die: 12 }); expect(f.tech('draw_cut', { targetId: f.foe.id, item })).toBeNull();
    expect(f.pc.weapon).toBe('katana'); expect(f.foe.hp).toBeLessThan(999);
  });
});

describe('the Emanator katana (rules 1.32): designed, not built', () => {
  // The engine's focus gate reads a list written in code (FOCUS_IDS, character.ts), not a weapon's counts_as_emanator:
  // a weapon cannot be made a focus by data alone. When that list is read from data, add the weapon and this test.
  it.todo('with it in hand a character with the Outburst door can Begin; without it, cannot (item 1956)');
});
