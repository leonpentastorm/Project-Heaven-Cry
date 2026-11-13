// Rules 1.13, Durability's door (docs/design/proposals/2026-11-nine-doors.md, section 19). One block per rule:
//   1. the pool: anyone with Durability (its points, 5 at most); the Defender keeps its own; a client's view carries it
//   2. gained by Brace and by the Guard technique: 1, +1 a Durability point above 1, +1 with a shield, never above the pool
//   3. it soaks: 10 damage a point, on what would reach HP (after armour and the shield); not a condition's tick
//   4. Pressure comes off Guard first
//   5. Interpose from Durability 3
//   6. lost when the fight ends; a hit on a unit holding Guard costs no Momentum
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, resolveAttack, previewAttack, applyDamage, classResources, guardPool, resourcesFor, viewFor, weaponActions, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const G = phys.PHYS_RULES.guard;
type F = ReturnType<typeof fight>;
/** PCs side by side from C5 (the first is the one under test), one foe on D5 unless placed, the first PC's turn. */
function fight(specs: { dur?: number; weapon?: string; shield?: string; known?: string[]; classId?: string; skills?: Record<string, number> }[], o: { foeAt?: string; foeWeapon?: string } = {}) {
  const f = physFight(specs.map((s) => ({ weapon: s.weapon || 'sabre', known: s.known || [], ...(s.classId ? { classId: s.classId } : {}), skills: { athletics: 4, raw_power: 6, dexterity: 6, durability: s.dur ?? 0, ...(s.skills || {}) } })), [{ tier: 'elite', weapon: o.foeWeapon || 'service_pistol' }]);
  f.cb.objects = [];
  const spots = ['C5', 'C4', 'C6'];
  f.pcs.forEach((u, i) => { f.put(u, spots[i]); const s = specs[i]; if (s.shield) { f.char(u).offHand = { id: s.shield } as any; f.unit(u.id).offItem = s.shield; } });
  const foe = f.put(f.foe, o.foeAt || 'D5'); foe.hp = foe.maxHp = 900; foe.lvlDmg = 1; // its weapon's plain damage (rules 1.15 would scale it; these tests count Guard against whole numbers)
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1;
  f.turn(f.pc);
  for (const u of f.cb.units) { delete (u as any).reactUsed; delete (u as any).uses?.['reaction|reaction']; if (u.side === 'pc') { u.hp = u.maxHp; u.armour = 0; } }
  return f;
}
const guard = (f: F, u: Unit = f.pc, n?: number) => { const x = f.unit(u.id); if (n != null) x.res!.guard = n; return x.res?.guard ?? 0; };
/** The foe attacks a PC outside any turn cost (the dice forced to hit); returns the HP the PC lost. */
const hit = (f: F, tgt: Unit = f.pc, mode: 'melee' | 'shot' = 'shot') => { rig({ hit: true, die: 12 }); const t = f.unit(tgt.id), hp = t.hp; f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), t, mode, null, { noAp: true })); return hp - f.unit(tgt.id).hp; };

describe('1. the pool', () => {
  it('the numbers are in the data, provisional', () => {
    expect(G).toMatchObject({ max: 5, per_durability: 1, gain_base: 1, gain_per_point: 1, shield_gain: 1, brace_gain: 2, brace_shield_gain: 1, soak: 10, keep_back: 1, interpose_durability: 3, interpose_cost: 1 });
  });
  it('no Durability, no pool; the pool is the Durability points, 5 at most', () => {
    expect(guardPool({ skills: {} })).toBe(0); expect(guardPool({ skills: { durability: 2 } })).toBe(2); expect(guardPool({ skills: { durability: 9 } })).toBe(5);
    expect(fight([{ dur: 0 }]).pc.resMax?.guard).toBeUndefined();
    const f = fight([{ dur: 2 }]); expect(f.pc.resMax!.guard).toBe(2); expect(f.pc.res!.guard).toBe(0); // a fight starts with none
    expect(fight([{ dur: 7 }]).pc.resMax!.guard).toBe(5);
  });
  it('the Defender keeps its own pool: 5 with 1 Durability point, and with none', () => {
    expect(fight([{ dur: 1, classId: 'defender' }]).pc.resMax!.guard).toBe(5);
    const f = fight([{ dur: 0, classId: 'defender' }]); expect(f.pc.resMax!.guard).toBe(5);
    expect(classResources(f.char(f.pc)).filter((r) => r.id === 'guard')).toEqual([{ id: 'guard', max: 5, persist: false }]);
  });
  it('a client\'s view carries the pool, and the engine\'s own view of it', () => {
    const f = fight([{ dur: 3 }]); guard(f, f.pc, 2);
    const u = viewFor(f.g, 'host').combat!.units.find((x) => x.id === f.pc.id)!;
    expect(u.resMax!.guard).toBe(3); expect(u.res!.guard).toBe(2);
    expect(f.bound(() => phys.physView(f.cb, f.pc, 'pc')).guard).toMatchObject({ now: 2, max: 3, gain: 3, soak: 10, shield: false });
    expect(f.bound(() => phys.physView(f.cb, f.foe, 'pc')).guard).toBeNull();
  });
});

describe('2. gained by Brace and by the Guard technique', () => {
  it('Brace: a flat 2 Guard whatever the Durability (the pool of Durability 1 holds 1 of it), for 1 AP, with any weapon', () => {
    for (const [dur, want] of [[1, 1], [3, 2], [5, 2]]) {
      const f = fight([{ dur }]);
      expect(weaponActions(f.pc).find((x) => x.id === 'brace')).toMatchObject({ ap: 1, why: null });
      f.act({ type: 'combat/brace', unitId: f.pc.id } as any);
      expect(guard(f)).toBe(want); expect(f.pc.ap).toBe(5); expect(f.pc.braced).toBe(true);
      expect(f.fx('guard').at(-1)).toMatchObject({ unit: f.pc.id, now: want, was: 0 });
    }
  });
  it('a shield in the off hand adds 1; the pool is the ceiling', () => {
    const f = fight([{ dur: 3, shield: 'riot_shield' }]); guard(f, f.pc, 0);
    expect(f.bound(() => phys.guardGain(f.pc))).toBe(4);
    expect(f.bound(() => phys.guardGain(f.pc, 'brace'))).toBe(3); // Brace: 2, 3 with a shield
    f.act({ type: 'combat/brace', unitId: f.pc.id } as any); expect(guard(f)).toBe(3);
    const g = fight([{ dur: 5, shield: 'buckler' }]); guard(g, g.pc, 1);
    g.act({ type: 'combat/brace', unitId: g.pc.id } as any); expect(guard(g)).toBe(4);
    const two = fight([{ dur: 2, shield: 'riot_shield' }]); two.act({ type: 'combat/brace', unitId: two.pc.id } as any); expect(guard(two)).toBe(2); // the pool is the ceiling
    const p = fight([{ dur: 2, shield: 'pavise' }]); expect(p.bound(() => phys.guardGain(p.pc))).toBe(2); // a pavise is carried, not held up
  });
  it('bracing only for Guard sets the stance, not the weapon: Recoil is halved only for a weapon that had Brace before', () => {
    const recoil = (f: F) => { f.unit(f.pc.id).shotsThisTurn = 6; return f.bound(() => previewAttack(f.cb, f.unit(f.pc.id), f.unit(f.foe.id), 'shot', { free: true })).terms!.find((t) => t.label === 'recoil')?.v ?? 0; };
    const f = fight([{ dur: 3, weapon: 'service_pistol' }], { foeAt: 'G5' }); const loose = recoil(f); expect(loose).toBeLessThan(0);
    expect(weaponActions(f.pc).find((x) => x.id === 'brace')!.text).not.toMatch(/Recoil/);
    f.act({ type: 'combat/brace', unitId: f.pc.id } as any);
    expect(f.pc.braced).toBe(true); expect(f.pc.guardBrace).toBe(true); expect(guard(f)).toBe(2); expect(recoil(f)).toBe(loose);
    // a weapon with Brace of its own (the LMG) is set as before, and its bearer gains the Guard too
    const l = fight([{ dur: 3, weapon: 'hellraiser_lmg' }], { foeAt: 'G5' }); const was = recoil(l); expect(was).toBeLessThan(-1);
    l.act({ type: 'combat/brace', unitId: l.pc.id } as any);
    expect(l.pc.guardBrace).toBeUndefined(); expect(guard(l)).toBe(2); expect(recoil(l)).toBe(Math.ceil(was / 2));
    // no Durability: the LMG still braces as it always did
    const n = fight([{ dur: 0, weapon: 'hellraiser_lmg' }], { foeAt: 'G5' }); n.act({ type: 'combat/brace', unitId: n.pc.id } as any); expect(recoil(n)).toBe(Math.ceil(was / 2));
  });
  it('without a pool a sabre has nothing to brace', () => {
    const f = fight([{ dur: 0 }]);
    expect(weaponActions(f.pc).some((x) => x.id === 'brace')).toBe(false);
    expect(() => f.act({ type: 'combat/brace', unitId: f.pc.id } as any)).toThrow(/nothing to brace/);
  });
  it('the Guard technique gives the scaling gain (1, +1 a Durability point above 1), and its card says so without changing anything', () => {
    const f = fight([{ dur: 2, known: ['guard'] }]);
    const pv = f.pv('guard'); expect(pv.ok).toBe(true); expect(pv.guard).toEqual({ now: 0, after: 2 }); expect(pv.notes.join(' ')).toMatch(/\+2 Guard/);
    expect(guard(f)).toBe(0);
    expect(f.tech('guard')).toBeNull(); expect(guard(f)).toBe(2); expect(phys.guardUp(f.pc)).toBe(true);
    const five = fight([{ dur: 5, known: ['guard'] }]); expect(five.tech('guard')).toBeNull(); expect(guard(five)).toBe(5); // where Brace gives 2
    const n = fight([{ dur: 0, known: ['guard'] }]); expect(n.pv('guard').guard).toBeUndefined(); expect(n.tech('guard')).toBeNull(); expect(guard(n)).toBe(0);
  });
});

describe('3. Guard soaks', () => {
  // melee blows here: a ranged hit also adds Pressure, which comes off Guard too (block 4)
  const fight0 = fight; const hit0 = hit;
  it('each point takes 10 off the hit, as many as it needs but the last, after armour', () => {
    const fight = (s: Parameters<typeof fight0>[0]) => fight0(s, { foeWeapon: 'maul' }), hit = (f: F, t?: Unit) => hit0(f, t, 'melee');
    const base = hit(fight([{ dur: 0 }])); expect(base).toBeGreaterThan(10); // the same blow with no Guard
    const need = Math.ceil(base / 10);
    const f = fight([{ dur: 5 }]); f.pc.resMax!.guard = 9; guard(f, f.pc, need + 2);
    expect(hit(f)).toBe(0); expect(guard(f)).toBe(2); // as many points as the hit needs, no more
    const two = fight([{ dur: 5 }]); guard(two, two.pc, 2);
    expect(hit(two)).toBe(base - 10); expect(guard(two)).toBe(1); // the last point is kept back for a reaction
    expect(two.cb.log.some((l) => /Guard takes 10 of it \(1 Guard, 1 left\)/.test(l))).toBe(true);
    const one = fight([{ dur: 5 }]); guard(one, one.pc, 1);
    expect(hit(one)).toBe(base); expect(guard(one)).toBe(1); expect(one.cb.log.some((l) => /Guard takes/.test(l))).toBe(false);
    // armour first: a hit armour stops down to 1 costs one point, not the points the raw damage would
    const a = fight([{ dur: 5 }]); guard(a, a.pc, 5); a.pc.armour = 999;
    expect(hit(a)).toBe(0); expect(guard(a)).toBe(4);
  });
  it('the last point is spent too when the hit would otherwise take the unit down', () => {
    const fight = (s: Parameters<typeof fight0>[0]) => fight0(s, { foeWeapon: 'maul' }), hit = (f: F, t?: Unit) => hit0(f, t, 'melee');
    const base = hit(fight([{ dur: 0 }])), need = Math.ceil(base / 10);
    const f = fight([{ dur: 5 }]); f.pc.resMax!.guard = 9; guard(f, f.pc, need); f.pc.hp = 5; // need − 1 points would let 10 through: down
    expect(hit(f)).toBe(0); expect(guard(f)).toBe(0); expect(f.pc.hp).toBe(5);
    const g = fight([{ dur: 5 }]); g.pc.resMax!.guard = 9; guard(g, g.pc, need); g.pc.hp = 50; // it survives what gets through: 1 kept
    expect(hit(g)).toBeGreaterThan(0); expect(guard(g)).toBe(1); expect(g.pc.hp).toBeGreaterThan(0);
  });
  it('the unit\'s shield is taken first: Guard is spent only on what would reach HP', () => {
    const fight = (s: Parameters<typeof fight0>[0]) => fight0(s, { foeWeapon: 'maul' }), hit = (f: F, t?: Unit) => hit0(f, t, 'melee');
    const base = hit(fight([{ dur: 0 }]));
    const f = fight([{ dur: 5 }]); guard(f, f.pc, 5); f.pc.shield = base + 20;
    expect(hit(f)).toBe(0); expect(guard(f)).toBe(5); expect(f.pc.shield).toBe(20);
    const g = fight([{ dur: 5 }]); guard(g, g.pc, 5); g.pc.shield = base - 5;
    expect(hit(g)).toBe(0); expect(guard(g)).toBe(4); expect(g.pc.shield).toBe(0);
  });
  it('a condition\'s tick and self-harm are not hits; a trap is', () => {
    const f = fight([{ dur: 5 }]); guard(f, f.pc, 3);
    f.bound(() => applyDamage(f.cb, f.pc, 5, { type: 'bleed', shield: false })); expect(guard(f)).toBe(3); expect(f.pc.maxHp - f.pc.hp).toBe(5);
    f.bound(() => applyDamage(f.cb, f.pc, 8, { type: 'soul', by: f.pc })); expect(guard(f)).toBe(3);
    const hp = f.pc.hp; f.bound(() => applyDamage(f.cb, f.pc, 25, { type: 'trap', shield: false })); expect(guard(f)).toBe(1); expect(hp - f.pc.hp).toBe(5); // 2 points soak 20, 1 kept
  });
  it('a unit that holds the Defender\'s Reactive Plate spends Guard through the plate, once', () => {
    const base = hit(fight([{ dur: 0 }]), undefined, 'melee');
    const f = physFight([{ weapon: 'sabre', classId: 'defender', level: 12, attrs: { endurance: 8 }, skills: { durability: 3, athletics: 4 } }], [{ tier: 'elite' }]);
    f.cb.objects = []; f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.turn(f.pc); f.pc.hp = f.pc.maxHp; guard(f as any, f.pc, 5);
    expect(f.bound(() => phys.holds(f.pc, 'class:defender.reactive_plate'))).toBe(true);
    f.pc.armour = 0; const lost = hit(f as any, undefined, 'melee');
    expect(f.cb.log.filter((l) => /plate hardens/.test(l)).length).toBe(1); expect(f.cb.log.some((l) => /Guard takes/.test(l))).toBe(false);
    expect(lost).toBeLessThan(base);
  });
});

describe('4. Pressure comes off Guard first', () => {
  it('1 Guard a point, for anyone with the pool', () => {
    const f = fight([{ dur: 2 }]); guard(f, f.pc, 2);
    expect(f.press(f.pc, 1, f.foe)).toBe(0); expect(guard(f)).toBe(1);
    expect(f.bound(() => phys.addPressureTo(f.cb, f.pc, 2, f.foe, 'test'))).toBe(1); expect(guard(f)).toBe(0); expect(f.pressure(f.pc)).toBe(1);
  });
});

describe('5. Interpose from Durability 3', () => {
  it('an ally next to you is hit: 1 Guard and your reaction, and the hit is yours (your armour applies)', () => {
    const f = fight([{ dur: 3 }, { dur: 0 }], { foeAt: 'F5' }); const [me, ally] = f.pcs; guard(f, me, 1);
    f.unit(me.id).armour = 999; // the hit worked out again against the one who takes it: armour leaves 1
    f.turn(f.foe);
    expect(hit(f, ally)).toBe(0);
    expect(guard(f, me)).toBe(0); expect(f.unit(me.id).maxHp - f.unit(me.id).hp).toBe(1);
    expect(f.cb.log.some((l) => /answers with Interpose/.test(l))).toBe(true); expect(f.cb.log.some((l) => /interposes for .* \(1 Guard\) and takes 1 damage/.test(l))).toBe(true);
    expect(hit(f, ally)).toBeGreaterThan(0); // the reaction is spent, and so is the Guard
  });
  it('the Guard left after the cost soaks the hit', () => {
    const f = fight([{ dur: 5 }, { dur: 0 }], { foeAt: 'F5' }); const [me, ally] = f.pcs; guard(f, me, 5); f.turn(f.foe);
    const hp = f.unit(me.id).hp;
    expect(hit(f, ally)).toBe(0); expect(guard(f, me)).toBeLessThan(4); expect(hp - f.unit(me.id).hp + 10 * (4 - guard(f, me))).toBeGreaterThan(0);
  });
  it('not at Durability 2, not without Guard, not from 2 tiles away, not for your own hit', () => {
    const low = fight([{ dur: 2 }, { dur: 0 }], { foeAt: 'F5' }); guard(low, low.pcs[0], 2); low.turn(low.foe);
    expect(hit(low, low.pcs[1])).toBeGreaterThan(0); expect(guard(low, low.pcs[0])).toBe(2);
    const none = fight([{ dur: 3 }, { dur: 0 }], { foeAt: 'F5' }); none.turn(none.foe);
    expect(hit(none, none.pcs[1])).toBeGreaterThan(0);
    const far = fight([{ dur: 3 }, { dur: 0 }], { foeAt: 'F5' }); guard(far, far.pcs[0], 3); far.put(far.pcs[1], 'C7'); far.turn(far.foe);
    expect(hit(far, far.pcs[1])).toBeGreaterThan(0); expect(guard(far, far.pcs[0])).toBe(3);
    const own = fight([{ dur: 3 }], { foeAt: 'F5' }); guard(own, own.pc, 1); own.turn(own.foe); hit(own);
    expect(own.cb.log.some((l) => /Interpose/.test(l))).toBe(false);
  });
  it('everyone with the points has it, whatever is in the hands, and it can be switched off like any Answer', () => {
    const f = fight([{ dur: 3, weapon: 'service_pistol' }, { dur: 0 }], { foeAt: 'F5' }); const [me, ally] = f.pcs;
    expect(f.bound(() => phys.usable(f.cb, f.unit(me.id), 'main')).some((x) => x.id === 'interpose')).toBe(true);
    expect(f.bound(() => phys.usable(f.cb, f.unit(ally.id), 'main')).some((x) => x.id === 'interpose')).toBe(false);
    guard(f, me, 2); (f.char(me) as any).phys.answers = []; f.turn(f.foe);
    expect(hit(f, ally)).toBeGreaterThan(0); expect(guard(f, me)).toBe(2);
    delete (f.char(me) as any).phys.answers;
    expect(hit(f, ally)).toBe(0); expect(guard(f, me)).toBeLessThan(2);
  });
  it('it works while Suppressed (it protects), and a Defender Interposes by its class move', () => {
    const f = fight([{ dur: 3 }, { dur: 0 }], { foeAt: 'F5' }); const [me, ally] = f.pcs;
    f.unit(me.id).pressure = 3; guard(f, me, 1); f.turn(f.foe);
    expect(hit(f, ally)).toBe(0);
    const d = fight([{ dur: 3, classId: 'defender' }, { dur: 0 }], { foeAt: 'F5' }); guard(d, d.pcs[0], 2); d.turn(d.foe);
    expect(hit(d, d.pcs[1])).toBe(0);
    expect(d.cb.log.some((l) => /answers with Interpose/.test(l))).toBe(false); expect(d.cb.log.filter((l) => /interposes for/.test(l)).length).toBe(1);
  });
});

describe('6. it is a fight\'s resource', () => {
  it('a new fight starts with none', () => {
    const f = fight([{ dur: 4 }]); guard(f, f.pc, 4);
    expect(resourcesFor(f.char(f.pc))).toMatchObject({ res: { guard: 0 }, resMax: { guard: 4 } });
  });
  it('a hit that Guard soaked part of costs no Momentum; the kept point alone protects nothing', () => {
    const f = fight([{ dur: 5 }]); f.momentum(f.pc, 2); guard(f, f.pc, 2); f.turn(f.foe);
    hit(f, f.pc, 'melee'); expect(f.momentum(f.pc)).toBe(2); expect(guard(f)).toBe(1); // one point soaked: the Momentum stays
    hit(f, f.pc, 'melee'); expect(guard(f)).toBe(1); expect(f.momentum(f.pc)).toBe(1);  // the last point is kept back and soaks nothing: the hit costs Momentum
  });
});
