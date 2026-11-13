// Rules 1.32: the katana, added by data alone (data/weapons.json `katana`; no engine code). It loads, sits inside the
// light-blade family's ranges next to its comparable (the sabre), equips, strikes with the family's plain attack (Cut),
// offers what its properties give, and lends Draw Cut from the pack. Every number is read from data.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, WEAPON, WEAPONS, gearEntry, equip } from '../src';
import { FOCUS_IDS } from '../src/character';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const K = WEAPON.katana as any;
const family = (WEAPONS as any[]).filter((w) => w.category === 'light_melee' && w.id !== 'katana');
const range = (k: string) => [Math.min(...family.map((w) => w[k])), Math.max(...family.map((w) => w[k]))];

describe('the katana (rules 1.35): data alone', () => {
  it('loads as a light blade, every number inside the family and nearest the sabre', () => {
    expect(K).toBeTruthy();
    expect(K.category).toBe('light_melee'); expect(K.mastery_family).toBe(WEAPON.sabre.mastery_family);
    expect(K.hands).toBe('1H'); expect(K.range_tiles).toBe(1); expect(K.skill).toBe('dexterity');
    for (const k of ['damage', 'weight_kg', 'price_credits']) { const [lo, hi] = range(k); expect(K[k], k).toBeGreaterThanOrEqual(lo); expect(K[k], k).toBeLessThanOrEqual(hi); }
    const S = WEAPON.sabre as any;
    expect(K.ap_cost).toEqual(S.ap_cost); expect(K.durability).toBe(S.durability);
    expect(K.requires).toBeUndefined(); // no light blade needs a skill
    expect(K.phys.props).toEqual(S.phys.props);
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

describe('the Emanator katana (rules 1.38): data alone, now the focus list is read from data', () => {
  const E = WEAPON.emanator_katana as any, B = WEAPON.evoker_blade as any;
  it('loads as a mana arm with the Evoker blade\'s numbers, Will Power 3, and a focus block on the Emanator\'s door', () => {
    expect(E).toBeTruthy(); expect(E.category).toBe(B.category); expect(E.mastery_family).toBe(B.mastery_family);
    for (const k of ['damage', 'weight_kg', 'price_credits', 'hands', 'range_tiles']) expect(E[k], k).toBe(B[k]);
    expect(E.requires).toEqual({ will_power: B.requires.brain_power });
    expect(E.focus.door).toBe('will_power'); expect(E.properties).toContain('counts_as_emanator');
  });
  it('counts as an Emanator: in FOCUS_IDS from data, never by a list in code', () => {
    expect(FOCUS_IDS.emanator).toContain('emanator_katana');
    expect(FOCUS_IDS.evoker).not.toContain('emanator_katana');
  });
  // the Outburst through it: focus.test.ts ('the Emanator katana')
});
