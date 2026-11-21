// Rules 1.59 (Leon's rulings for the tank, 16 Nov 2026), through the reducer:
//   T1 the roll_with of Durability's door is melee only (tank-fit.test.ts T.3 holds the roll itself)
//   T2 a blow rolled with Durability takes its damage from the weapon's own attribute (output.profiles.melee,
//      phys.scales_with) and nothing else: Durability moves the roll, never the damage
//   T3 a shield's own strike scales with Endurance (Durability's attribute), and still hits with Durability
//   T4 a shield in each hand doubles every Guard gain (rules.guard.two_shield_mult), the pool's cap unchanged
//   T5 (retired by rules 1.97 item 8340, ruling 43): the Bulwark's pool is the door's, Durability's Reach, at every rank
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, WEAPON, CLASS, classResources, doorLadderOf, reachAt, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const G = phys.PHYS_RULES.guard;
const reach = (dur: number) => reachAt({ durability: dur }, doorLadderOf('durability')!);

/** One PC on C5 with `weapon` (a shield in the off hand when `off`), the foe on D5, the PC's turn; its Guard set to `g`. */
function fight(o: { weapon: string; off?: string; dur: number; attrs?: Record<string, number>; g?: number; classId?: string; level?: number; skills?: Record<string, number> }) {
  const f = physFight([{ weapon: o.weapon, known: [], level: o.level, attrs: { endurance: 8, ...(o.attrs || {}) }, ...(o.classId ? { classId: o.classId } : {}), skills: { durability: o.dur, dexterity: 0, raw_power: 0, athletics: 0, ...(o.skills || {}) } } as any], [{ tier: 'elite', weapon: 'service_pistol' }]);
  f.cb.objects = [];
  f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'D5'); foe.hp = foe.maxHp = 9000; foe.armour = 0;
  if (o.off) { f.char(f.pc).offHand = { id: o.off } as any; f.unit(f.pc.id).offItem = o.off; }
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1; f.turn(f.pc);
  (f.char(f.pc) as any).phys.answers = [];
  if (o.g != null && f.unit(f.pc.id).res) f.unit(f.pc.id).res!.guard = o.g;
  return f;
}
type F = ReturnType<typeof fight>;
/** A plain melee attack through the reducer (the d20 forced to 12: a hit, never a critical): [HP the foe lost, the roll's modifier]. */
function blow(f: F): [number, number] {
  rig({ hit: true, die: 12 }); const foe = f.unit(f.foe.id), hp = foe.hp;
  f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'melee' } as any);
  const line = f.cb.log.find((l) => /d20 12 /.test(l)) || '', m = /d20 12 ([−+-]\s?\d+)/.exec(line);
  return [hp - f.unit(f.foe.id).hp, m ? Number(m[1].replace('−', '-').replace(/\s/g, '')) : NaN];
}

describe('T2: a blow rolled with Durability deals the weapon\'s own damage', () => {
  it('a knife (Agility) held by the tank: Durability 1 or 7 with Guard, the same damage; the roll differs', () => {
    expect((WEAPON as any).combat_knife.phys.scales_with).toEqual(['agility']);
    const [lo, rlo] = blow(fight({ weapon: 'combat_knife', dur: 1, g: 1 })), [hi, rhi] = blow(fight({ weapon: 'combat_knife', dur: 7, g: 1 }));
    expect(lo).toBeGreaterThan(0); expect(hi).toBe(lo); expect(rhi).toBeGreaterThan(rlo);
  });
  it('the knife\'s damage grows with its attribute (Agility), and Endurance (Durability\'s) adds nothing', () => {
    const [base] = blow(fight({ weapon: 'combat_knife', dur: 7, g: 1, attrs: { agility: 2 } }));
    const [agi] = blow(fight({ weapon: 'combat_knife', dur: 7, g: 1, attrs: { agility: 6 } }));
    const [end] = blow(fight({ weapon: 'combat_knife', dur: 7, g: 1, attrs: { agility: 2, endurance: 10 } }));
    expect(agi).toBeGreaterThan(base); expect(end).toBe(base);
  });
});

describe('T3: a shield\'s own strike scales with Endurance and hits with Durability', () => {
  it('every shield row: hits_with durability, scales_with endurance (Durability\'s attribute)', () => {
    for (const id of Object.keys(WEAPON).filter((x) => ((WEAPON as any)[x].phys?.props || []).includes('shield'))) {
      expect((WEAPON as any)[id].phys, id).toMatchObject({ hits_with: 'durability', scales_with: ['endurance'] });
    }
  });
  it('the Buckler in the main hand: more Endurance, more damage; Strength, none', () => {
    const [e3] = blow(fight({ weapon: 'buckler', dur: 3, attrs: { endurance: 3 } }));
    const [e8] = blow(fight({ weapon: 'buckler', dur: 3, attrs: { endurance: 8 } }));
    const [s8] = blow(fight({ weapon: 'buckler', dur: 3, attrs: { endurance: 3, strength: 8 } }));
    expect(e8).toBeGreaterThan(e3); expect(s8).toBe(e3);
  });
});

describe('T4: a shield in each hand doubles every Guard gain, under the pool', () => {
  it('Brace and the Guard technique through the reducer: one shield +1, two shields x two_shield_mult', () => {
    const brace = (off?: string, weapon = 'buckler') => { const f = fight({ weapon, off, dur: 2, classId: 'defender', level: 12 }); f.unit(f.pc.id).res!.guard = 0; f.unit(f.pc.id).resMax!.guard = 9; /* a deep pool: this test counts the gains */ f.act({ type: 'combat/brace', unitId: f.pc.id } as any); return f.unit(f.pc.id).res!.guard; };
    expect(brace(undefined, 'sabre')).toBe(G.brace_gain);
    expect(brace(undefined)).toBe(G.brace_gain + G.brace_shield_gain);
    expect(brace('riot_shield')).toBe(G.brace_gain * G.two_shield_mult);
    const tech = (off?: string) => { const f = fight({ weapon: 'buckler', off, dur: 2, classId: 'defender', level: 12 }); (f.char(f.pc) as any).phys.known = ['guard']; f.unit(f.pc.id).res!.guard = 0; f.unit(f.pc.id).resMax!.guard = 9; expect(f.tech('guard')).toBeNull(); return f.unit(f.pc.id).res!.guard; };
    expect(tech()).toBe(G.gain_base + G.gain_per_point + G.shield_gain);
    expect(tech('buckler')).toBe((G.gain_base + G.gain_per_point) * G.two_shield_mult);
  });
  it('the cap is unchanged: Durability 3 with two shields (no class) braces to its pool, its Reach', () => {
    const f = fight({ weapon: 'buckler', off: 'buckler', dur: 3 }); f.unit(f.pc.id).res!.guard = 0;
    f.act({ type: 'combat/brace', unitId: f.pc.id } as any); expect(f.unit(f.pc.id).res!.guard).toBe(reach(3));
  });
});

describe('T5 (retired: rules 1.97 item 8340, ruling 43): the Bulwark holds the door pool at every rank', () => {
  it('no rank pool in the data; the fight reads Durability Reach for the Bulwark and for anyone else', () => {
    expect((CLASS as any).defender.resource.max_by_rank).toBeUndefined();
    const pool = (o: Partial<Parameters<typeof fight>[0]>) => fight({ weapon: 'sabre', dur: 7, ...o }).pc.resMax!.guard;
    expect(pool({ classId: 'defender', level: 3, attrs: { endurance: 7 } })).toBe(reach(7));
    expect(pool({ classId: 'defender', level: 12, attrs: { endurance: 8 } })).toBe(reach(7));
    expect(pool({ classId: 'fighter', level: 12, attrs: { endurance: 8 } })).toBe(reach(7));
    const d = fight({ weapon: 'sabre', dur: 7, classId: 'defender', level: 12, attrs: { endurance: 8 } });
    expect(classResources(d.char(d.pc)).find((r) => r.id === 'guard')!.max).toBe(reach(7));
  });
});
void ({} as Unit);
