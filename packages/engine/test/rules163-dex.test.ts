// Rules 1.63 (0.31), Pressure is Dexterity's (docs/rules/PHC-Core-Rules-v1.0.md items 4800 onward). Every rule through a
// real action of the reducer (combat/attack, combat/technique); every number read from the data.
import { describe, expect, it, afterEach } from 'vitest';
import { physFight, rig } from './helpers/physfight';
import { PREDICATES } from '../src/effects/triggers';
import { phys, SKILL, PERK, WEAPON, previewAttack } from '../src';
import forksJ from '../../../data/forks.json';

afterEach(() => rig(null));
const DOOR: any = (SKILL as any).dexterity.unlocks['1'];
const PIP = DOOR.effects.find((e: any) => e.label === 'pressing_blade');
const P: any = phys.PHYS_RULES.pressure;
type F = ReturnType<typeof physFight>;
const big = (f: F, u: any) => { const x = f.unit(u.id); x.hp = x.maxHp = 9999; return x; };
/** A blade fighter next to one Soldier, on its turn with 9 AP, the dice rigged to hit. */
function blade(spec: any = {}) {
  const f = physFight([{ weapon: 'combat_knife', skills: { dexterity: 7 }, attrs: { agility: 7 }, level: 6, ...spec }], [{ at: 'F5', tier: 'soldier', weapon: 'combat_knife' }]);
  f.cb.objects = []; f.put(f.pc, 'E5'); f.put(f.foe, 'F5'); big(f, f.foe); f.unit(f.foe.id).conds = {};
  const u = f.turn(f.pc); f.unit(u.id).ap = 9; rig({ hit: true });
  return f;
}
const cut = (f: F) => f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'melee' } as any);

describe('the predicate rolled_with (the one closed-list addition)', () => {
  it('reads the attack\'s `via`, or its damage source\'s', () => {
    const t = PREDICATES.rolled_with.test;
    expect(t({ ctx: { via: 'dexterity' } } as any, ['dexterity'])).toBe(true);
    expect(t({ ctx: { src: { via: 'dexterity' } } } as any, ['dexterity'])).toBe(true);
    expect(t({ ctx: { via: 'raw_power' } } as any, ['dexterity'])).toBe(false);
    expect(t({ ctx: {} } as any, ['dexterity'])).toBe(false);
  });
});

describe('D1, D2: a blow rolled with Dexterity lays Pressure and sheds none of yours', () => {
  it('a knife\'s Cut adds the door row\'s pip, at most the row\'s limit on a target a turn', () => {
    const f = blade(); const p0 = f.pressure(f.foe);
    cut(f); expect(f.pressure(f.foe)).toBe(p0 + PIP.value);
    for (let i = 1; i < PIP.limit.n + 2; i++) { f.unit(f.pc.id).ap = 9; cut(f); }
    expect(f.pressure(f.foe)).toBe(Math.min(phys.pressureCap(f.unit(f.foe.id)), p0 + PIP.value * PIP.limit.n));
  });
  it('the attacker\'s own Pressure is not shed by a Dexterity blow; a Raw Power blow sheds it and lays none', () => {
    const f = blade(); f.press(f.pc, 2, f.foe); cut(f);
    expect(f.pressure(f.pc)).toBe(2);
  });
  it('a Raw Power weapon\'s blow sheds the door\'s melee_hit_sheds and lays nothing', () => {
    const f = physFight([{ weapon: 'ork_machete', skills: { raw_power: 7 }, attrs: { strength: 7 }, level: 6 }], [{ at: 'F5', tier: 'soldier', weapon: 'combat_knife' }]);
    f.cb.objects = []; f.put(f.pc, 'E5'); f.put(f.foe, 'F5'); big(f, f.foe);
    const u = f.turn(f.pc); f.unit(u.id).ap = 9; rig({ hit: true });
    f.press(f.pc, 2, f.foe); const p0 = f.pressure(f.foe);
    cut(f);
    expect(f.pressure(f.foe)).toBe(p0); expect(f.pressure(f.pc)).toBe(2 - P.melee_hit_sheds);
  });
  it('Open Hand gloves that roll with Dexterity (roll_with picks it) press as a knife does', () => {
    const f = physFight([{ weapon: 'hand_wraps', offHand: null, skills: { dexterity: 7, raw_power: 1 }, attrs: { agility: 7 }, level: 6 }], [{ at: 'F5', tier: 'soldier', weapon: 'combat_knife' }]);
    f.cb.objects = []; f.put(f.pc, 'E5'); f.put(f.foe, 'F5'); big(f, f.foe); f.unit(f.foe.id).conds = {};
    const u = f.turn(f.pc); f.unit(u.id).ap = 9; rig({ hit: true });
    const pv = f.bound(() => previewAttack(f.cb, f.unit(u.id), f.unit(f.foe.id), 'melee'));
    expect(pv.via).toBe('dexterity');
    const p0 = f.pressure(f.foe); cut(f); expect(f.pressure(f.foe)).toBe(p0 + PIP.value);
  });
});

describe('D3: the alpha perks and forks read Dexterity, not range', () => {
  it('Pressure Point II lays its extra pips on a Pressed foe from a Dexterity blow', () => {
    const f = blade({ perks: { both_hands: 'II' } }); f.press(f.foe, P.pressed, f.pc);
    cut(f);
    const steps = (PERK as any).both_hands.tiers.II.effects[0].value.steps;
    expect(f.pressure(f.foe)).toBe(Math.min(phys.pressureCap(f.unit(f.foe.id)), P.pressed + PIP.value + steps.reduce((n: number, s: any) => n + s.value, 0)));
  });
  it('Keep Their Heads Down II puts a Pressed foe Off Balance from a Dexterity blow', () => {
    const f = blade({ perks: { running_reload: 'II' } }); f.press(f.foe, P.pressed, f.pc);
    cut(f); expect(!!f.unit(f.foe.id).conds?.off_balance).toBe(true);
  });
  it('every Pressure fork row and the Skirmisher\'s two moves gate on rolled_with, none on melee: false', () => {
    const rows = (forksJ as any).items.filter((x: any) => x.door === 'dexterity').flatMap((x: any) => x.effects);
    for (const e of rows) expect(e.if?.melee, JSON.stringify(e)).not.toBe(false);
    expect(rows.filter((e: any) => e.if?.rolled_with).length).toBeGreaterThan(0);
  });
});

describe('D4: a gun still presses as before (every gun rolls with Dexterity)', () => {
  it('every ranged weapon a character can hold hits with Dexterity', () => {
    for (const w of Object.values(WEAPON) as any[]) if (w.phys?.system === 'ranged' && !w.companion_only) expect(w.phys.hits_with, w.id).toBe('dexterity');
  });
});

describe('D5: Throw costs no Momentum', () => {
  it('a knife opens from range with no Momentum', () => {
    const f = physFight([{ weapon: 'combat_knife', skills: { dexterity: 7 }, attrs: { agility: 7 }, level: 6 }], [{ at: 'I5', tier: 'soldier', weapon: 'combat_knife' }]);
    f.cb.objects = []; f.put(f.pc, 'E5'); f.put(f.foe, 'I5'); big(f, f.foe);
    const u = f.turn(f.pc); f.unit(u.id).ap = 9; f.momentum(f.pc, 0); rig({ hit: true });
    expect(phys.TECHNIQUE.throw.numbers.momentum_cost).toBe(0);
    expect(f.tech('throw', { targetId: f.foe.id })).toBeNull();
    expect(f.momentum(f.pc)).toBe(0);
  });
  it('Pull Out\'s damage reads the weapon\'s own scaling (the one damage path): more Agility, more damage', () => {
    const pull = (agility: number) => {
      const f = physFight([{ weapon: 'combat_knife', skills: { dexterity: 7 }, attrs: { agility }, level: 6 }], [{ at: 'H5', tier: 'soldier', weapon: 'combat_knife' }]);
      f.cb.objects = []; f.put(f.pc, 'E5'); f.put(f.foe, 'H5'); big(f, f.foe); f.unit(f.foe.id).armour = 0;
      const u = f.turn(f.pc); f.unit(u.id).ap = 9; rig({ hit: true });
      expect(f.tech('throw', { targetId: f.foe.id })).toBeNull();
      f.put(f.pc, 'G5'); const hp = f.unit(f.foe.id).hp;
      expect(f.tech('pull_out', { targetId: f.foe.id })).toBeNull();
      return hp - f.unit(f.foe.id).hp;
    };
    expect(pull(7)).toBeGreaterThan(pull(1));
  });
});
