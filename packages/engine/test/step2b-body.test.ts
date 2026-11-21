// Rules 1.97 (step 2b of the total rebalance, docs/design/growth/09-build-order.md): the Body doors on their ladders.
// Every expectation reads the data (skills.json door_ladder, the beta rows, enemies.json tier rows) and goes through the
// reducer (a real technique, a real attack) or the real load path (a fight's units built from the sheet).
import { describe, it, expect, afterEach } from 'vitest';
import { doorLadderOf, reachAt, biteAt, cashSum, cashSumOf, keepsOf } from '../src';
import { ENEMY, SKILL } from '../src/data';
import { resolveAttack } from '../src/combat';
import techniquesJ from '../../../data/techniques.json';
import { physFight, rig } from './helpers/physfight';

const beta = (id: string) => (SKILL as any)[id].per_point.numbers;
afterEach(() => rig(null));

describe('a Body door\'s counter tops at its Reach (item 8340)', () => {
  it('Guard: the plates a fight gives are Durability\'s Reach, the family gate holding a step back', () => {
    const top = (skills: Record<string, number>) => { const f = physFight([{ skills: { durability: 0, pain_threshold: 0, sensory: 0, ...skills } }], [{ at: 'J6' }]); return f.unit(f.pc.id).resMax?.guard ?? 0; };
    const l = doorLadderOf('durability')!, seven = l.rows.find((r) => r.points === 7)!;
    expect(top({ durability: 1 })).toBe(reachAt({ durability: 1 }, l));
    expect(top({ durability: 7 })).toBe(reachAt({ durability: 4 }, l)); // Pain Threshold under the gate: the step below
    expect(top({ durability: 7, ...seven.needs })).toBe(seven.reach);
  });
  it('Momentum: the chain tops at Raw Power\'s Reach; with no Raw Power, the door\'s unbought chain', () => {
    const top = (skills: Record<string, number>) => { const f = physFight([{ weapon: 'ork_machete', skills: { raw_power: 0, guts: 0, intimidation: 0, ...skills } }], [{ at: 'J6' }]); return f.unit(f.pc.id).resMax?.momentum ?? 0; };
    const l = doorLadderOf('raw_power')!, ten = l.rows.find((r) => r.points === 10)!;
    expect(top({ raw_power: 4 })).toBe(reachAt({ raw_power: 4 }, l));
    expect(top({ raw_power: 10, ...ten.needs })).toBe(ten.reach);
    expect(top({})).toBe((techniquesJ as any).rules.momentum.max);
  });
  it('Pressure: a foe stops at the best Dexterity Reach laid on it, less its tier\'s pressure_off', () => {
    const l = doorLadderOf('dexterity')!, ten = l.rows.find((r) => r.points === 10)!;
    for (const tier of ['soldier', 'elite', 'boss']) {
      const f = physFight([{ skills: { dexterity: 10, ...ten.needs } }, { name: 'Low', skills: { dexterity: 1, athletics: 0, reaction_speed: 0 } }], [{ at: 'J6', tier }]);
      const foe = f.foe, low = f.pcs[1];
      expect(f.press(foe, 9, low)).toBe(Math.max(0, reachAt({ dexterity: 1 }, l) - (ENEMY as any)[tier].pressure_off));
      expect(f.press(foe, 9, f.pc)).toBe(ten.reach! - (ENEMY as any)[tier].pressure_off);
    }
  });
});

describe('the cash-outs (item 8342), through the reducer', () => {
  it('Coup pays x(1 + Bite x S(n)) on the blow it rolls, and a Finisher keeps what Guts 10 keeps', () => {
    const skills = { raw_power: 4, guts: 10 };
    const f = physFight([{ weapon: 'ork_machete', known: ['coup'], skills }], [{ at: 'D6' }]);
    f.put(f.pc, 'D5'); f.foe.hp = f.foe.maxHp = 999999; f.unit(f.pc.id).ap = 9; f.momentum(f.pc, 3);
    const pv = f.pv('coup', { targetId: f.foe.id });
    const want = 1 + biteAt(skills, doorLadderOf('raw_power')!) * cashSumOf('momentum', 3);
    expect((pv.attacks[0].pv as any).dmg.mults.find((m: any) => /cash-out/.test(m.label))?.v).toBeCloseTo(want, 6);
    rig({ hit: true });
    expect(f.tech('coup', { targetId: f.foe.id })).toBeNull();
    expect(f.momentum(f.pc)).toBe(keepsOf(skills, 'momentum'));
    expect(keepsOf(skills, 'momentum')).toBe(beta('guts').keeps);
  });
  it('Break\'s save is harder by S(n) rounded down; Cleave strikes 1 + S(n) rounded down foes and counts no Margins', () => {
    const f = physFight([{ weapon: 'ork_machete', known: ['break'], skills: { raw_power: 1 } }], [{ at: 'D6' }]);
    f.put(f.pc, 'D5'); f.foe.hp = f.foe.maxHp = 999999; f.unit(f.pc.id).ap = 9; f.momentum(f.pc, 3);
    const pv = f.pv('break', { targetId: f.foe.id });
    expect(pv.notes.join(' ')).toContain('−' + Math.floor(cashSumOf('momentum', 3)) + ')');
    const g = physFight([{ weapon: 'ork_machete', known: ['cleave'], skills: { raw_power: 1 } }], [{ at: 'D6' }, { at: 'C6', name: 'B' }, { at: 'E6', name: 'C' }, { at: 'C5', name: 'D' }, { at: 'E5', name: 'E' }]);
    g.put(g.pc, 'D5'); for (const v of g.foes) v.hp = v.maxHp = 999999; g.unit(g.pc.id).ap = 9; g.momentum(g.pc, 2);
    rig({ hit: true, margins: 3 });
    const from = g.cb.log.length;
    expect(g.tech('cleave', { targetId: g.foe.id })).toBeNull();
    const struck = g.cb.log.slice(from).filter((x) => /Cleave|strikes/.test(x) && /hit|CRITICAL/.test(x)).length;
    expect(struck).toBe(1 + Math.floor(cashSum(2, doorLadderOf('raw_power')!.cash_step)));
    expect(g.cb.log.slice(from).join(' ')).not.toMatch(/Margin/);
  });
  it('a Take spends every pip on its foe (Athletics 10 leaves one) and Dead Centre pays the pips\' cash-out', () => {
    const skills = { dexterity: 4, athletics: 10 };
    const f = physFight([{ known: ['dead_centre'], skills }], [{ at: 'J6' }]);
    f.put(f.pc, 'C6'); f.foe.hp = f.foe.maxHp = 999999; f.unit(f.pc.id).ap = 9;
    expect(f.press(f.foe, 3, f.pc)).toBe(3);
    const pv = f.pv('dead_centre', { targetId: f.foe.id });
    const want = 1 + biteAt(skills, doorLadderOf('dexterity')!) * cashSumOf('pressure', 3);
    expect((pv.attacks[0].pv as any).dmg.mults.find((m: any) => /cash-out/.test(m.label))?.v).toBeCloseTo(want, 6);
    rig({ hit: true });
    expect(f.tech('dead_centre', { targetId: f.foe.id })).toBeNull();
    expect(f.pressure(f.foe)).toBe(beta('athletics').keeps);
  });
});

describe('the betas (items 8343, 8344)', () => {
  it('Athletics gives Defense from its first point', () => {
    const def = (a: number) => { const f = physFight([{ skills: { athletics: a } }], [{ at: 'J6' }]); return f.unit(f.pc.id).def; };
    expect(beta('athletics').defense_from).toBe(1);
    expect(def(1) - def(0)).toBe(beta('athletics').defense);
  });
  it('Guts from its first_hit_free_from: the first damaging hit a round wears no step of the chain', () => {
    const run = (guts: number) => {
      const f = physFight([{ weapon: 'ork_machete', skills: { raw_power: 4, guts } }], [{ at: 'D6', weapon: 'ork_machete' }]);
      f.put(f.pc, 'D5'); f.unit(f.pc.id).hp = f.unit(f.pc.id).maxHp = 999999; f.momentum(f.pc, 3);
      rig({ hit: true }); f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(f.pc.id), 'melee', null, { free: true }));
      return f.momentum(f.pc);
    };
    expect(run(beta('guts').first_hit_free_from)).toBe(3);
    expect(run(beta('guts').first_hit_free_from - 1)).toBe(2);
  });
});

describe('enemies\' Margins by tier (item 8346)', () => {
  it('a foe\'s blow counts at most its tier row\'s margins_max from the roll; a natural 20\'s two always count', () => {
    const margins = (tier: string, die: number) => {
      const f = physFight([{}], [{ at: 'D6', tier, weapon: 'ork_machete' }]);
      f.put(f.pc, 'D5'); const pc = f.unit(f.pc.id); pc.hp = pc.maxHp = 999999; pc.def = -60;
      rig({ die }); const from = f.cb.log.length;
      f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), pc, 'melee', null, { free: true }));
      const m = /\((\d+) Margins?\)/.exec(f.cb.log.slice(from).join(' ')); return m ? Number(m[1]) : 0;
    };
    expect(margins('minion', 15)).toBe((ENEMY as any).minion.margins_max);
    expect(margins('soldier', 15)).toBe((ENEMY as any).soldier.margins_max);
    expect(margins('elite', 15)).toBe((ENEMY as any).elite.margins_max);
    expect(margins('minion', 20)).toBe((ENEMY as any).minion.margins_max + 2);
    expect(margins('boss', 15)).toBeGreaterThan((ENEMY as any).elite.margins_max);
  });
});
