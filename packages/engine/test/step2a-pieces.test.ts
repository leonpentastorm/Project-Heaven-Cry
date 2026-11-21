// Rules 1.96 (step 2a of the total rebalance, docs/design/growth/09-build-order.md): the general pieces, one test a piece,
// each through a real action (the reducer) or the real load path. Margins themselves (S1) are proved in
// enemy-levels.test.ts, rules115-review.test.ts and rules117-magic.test.ts.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { addItems, clearAddedItems, applyCond, condOn, cashSum, cashSumOf, cashFactor, doorLadderOf, doorOfResource, reachAt, biteAt, DOOR_LADDERS, CASH_STEP, RULES, d20 } from '../src';
import { SKILL } from '../src/data';
import conditionsJ from '../../../data/conditions.json';
import { fightWith, withGame } from './helpers/perkfight';

const rngFor = (want: number) => { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === want) return { state: s }; } throw new Error('no seed'); };
const BIBLE_STEP: Record<string, number> = Object.fromEntries(DOOR_LADDERS.map((l) => [l.door, l.cash_step]));

describe('S13: the critical range is one gear field (crit_range, with its modes)', () => {
  it('the CCEC marksman rifle: a natural 18 is a critical on an Aimed Shot, not on a plain shot', () => {
    const shot = (mode: 'aimed' | 'shot') => {
      const f = fightWith([{ weapon: 'ccec_marksman_rifle' }], [{ at: 'J6' }]); const pc = f.turn(f.pc); pc.pos = '3,5'; f.foe.pos = '7,5'; f.foe.hp = f.foe.maxHp = 9999; pc.ap = 9;
      f.g.rng.state = rngFor(18).state; const from = f.cb.log.length;
      f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode } as any);
      return f.cb.log.slice(from).join(' ');
    };
    expect(shot('aimed')).toMatch(/d20 18 .*CRITICAL/);
    expect(shot('shot')).not.toMatch(/CRITICAL/);
  });
});

describe('S2: the door ladder (skills.json door_ladder), read on the load path', () => {
  it('every door names its resource, its one Bite (ruling 63) and its own step; the family gates hold a step back', () => {
    expect(DOOR_LADDERS.map((l) => l.door).sort()).toEqual(['bonds', 'figments', 'guard', 'momentum', 'outbursts', 'prayer', 'pressure', 'shadow', 'sigils']);
    for (const l of DOOR_LADDERS) { expect(l.rows.filter((r) => typeof r.bite === 'number').length, l.door).toBe(1); expect(l.cash_step).toBeGreaterThanOrEqual(1); expect(SKILL[l.skill].slot).toBe('alpha'); }
    const rp = doorLadderOf('raw_power')!, top = rp.rows[rp.rows.length - 1], seven = rp.rows.find((r) => r.points === 7)!;
    const need = Object.entries(seven.needs || {})[0];
    expect(need).toBeTruthy();
    const below = rp.rows.filter((r) => r.points < 7 && typeof r.reach === 'number').slice(-1)[0].reach;
    expect(reachAt({ raw_power: 7 }, rp)).toBe(below); // the gate not met: the step below stands
    expect(reachAt({ raw_power: 7, [need[0]]: need[1] }, rp)).toBe(seven.reach);
    expect(reachAt({ raw_power: 10, ...Object.fromEntries(Object.entries(top.needs || {})) }, rp)).toBe(top.reach);
    expect(reachAt({ raw_power: 0 }, rp)).toBe(0); expect(biteAt({ raw_power: 0 }, rp)).toBe(0);
    expect(biteAt({ raw_power: 1 }, rp)).toBe(rp.rows.find((r) => typeof r.bite === 'number')!.bite);
    expect(doorOfResource('momentum')!.skill).toBe('raw_power');
  });
});

describe('S3: the cash-out source (cash:<res> and cash_share:<res>, rules.json output.cash_out)', () => {
  beforeAll(() => addItems('relic', [{ id: 'test_cash_out', name: 'Cash-out (test)', text: 'test', effects: [
    { op: 'resource', resource: 'momentum', value: 'all', when: 'acted', if: { action: ['attack'] } },
    { op: 'resource', resource: 'guard', value: { base: 0, per: [{ of: 'cash:momentum', value: 10 }] }, when: 'acted', if: { action: ['attack'] } },
  ] }]));
  afterAll(() => clearAddedItems());
  it('S(n) is the law\'s sum at the door\'s own step; the law\'s step for a resource no door owns', () => {
    expect(CASH_STEP).toBe((RULES as any).output.cash_out.step);
    expect(cashSum(3, 1)).toBe(3); expect(cashSum(3, 2)).toBe(7); expect(cashSum(0, 2)).toBe(0);
    expect(cashSumOf('momentum', 3)).toBeCloseTo(cashSum(3, BIBLE_STEP.momentum), 9);
    expect(cashSumOf('no_such_counter', 3)).toBeCloseTo(cashSum(3, CASH_STEP), 9);
    const rp = doorLadderOf('raw_power')!;
    expect(cashFactor({ raw_power: 1 }, 'momentum', 3)).toBeCloseTo(1 + biteAt({ raw_power: 1 }, rp) * cashSum(3, rp.cash_step), 9);
  });
  it('through a real action: an attack that spends all its Momentum reads S(n) of what it spent', () => {
    const f = fightWith([{ weapon: 'ork_machete', relics: ['test_cash_out'] }], [{ at: 'D5' }]);
    const pc = f.turn(f.pc); pc.pos = '3,4'; f.foe.pos = '3,5'; f.foe.hp = f.foe.maxHp = 9999; pc.ap = 9;
    pc.resMax = { ...(pc.resMax || {}), momentum: 5, guard: 999 }; pc.res = { ...(pc.res || {}), momentum: 3, guard: 0 };
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'melee' } as any);
    // a plain melee hit gives 1 (the engine's +1) before the action's 'acted': 4 spent on a hit, 3 on a miss
    const u = f.unit(pc.id), n = /strikes Foe 1:.*· (hit|CRITICAL)/.test(f.cb.log.join(' ')) ? 4 : 3;
    expect(u.res!.momentum).toBe(0);
    expect(u.res!.guard).toBe(Math.min(999, 10 * cashSumOf('momentum', n)));
  });
});

describe('S5: a pool\'s top (res_max:<res>); S10: Grace is a resource', () => {
  beforeAll(() => addItems('relic', [{ id: 'test_top', name: 'Top (test)', text: 'test', effects: [
    { op: 'stat_mod', stat: 'res_max:grace', value: 1 },
    { op: 'resource', resource: 'grace', value: 9, when: 'acted', if: { action: ['attack'] } },
  ] }]));
  afterAll(() => clearAddedItems());
  it('a held res_max term raises the top a resource fills to; Grace fills to its top', () => {
    expect((RULES as any).output.cash_out).toBeTruthy();
    const f = fightWith([{ relics: ['test_top'] }], [{ at: 'J6' }]); const pc = f.turn(f.pc); pc.pos = '3,5'; f.foe.pos = '7,5'; f.foe.hp = f.foe.maxHp = 9999; pc.ap = 9;
    pc.resMax = { ...(pc.resMax || {}), grace: 3 }; pc.res = { ...(pc.res || {}), grace: 0 };
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'shot' } as any);
    expect(f.unit(pc.id).res!.grace).toBe(4); // 3 + the res_max term's 1
  });
});

describe('S6: wear (wear:<res>) at the wear site', () => {
  beforeAll(() => addItems('relic', [{ id: 'test_wear', name: 'Wear (test)', text: 'test', effects: [{ op: 'stat_mod', stat: 'wear:momentum', value: -9 }] }]));
  afterAll(() => clearAddedItems());
  it('a walk wears the chain by a step a tile; a held wear term of -9 keeps it whole', () => {
    const walk = (relics: string[]) => {
      const f = fightWith([{ weapon: 'ork_machete', relics }], [{ at: 'O10' }]); const pc = f.turn(f.pc); pc.pos = '3,5'; pc.ap = 9;
      pc.resMax = { ...(pc.resMax || {}), momentum: 5 }; pc.res = { ...(pc.res || {}), momentum: 3 };
      f.act({ type: 'combat/move', unitId: pc.id, to: '3,7' } as any);
      return f.unit(pc.id).res!.momentum;
    };
    expect(walk([])).toBeLessThan(3);
    expect(walk(['test_wear'])).toBe(3);
  });
});

describe('the squad\'s one mark and one gift (ruling 41: conditions.json squad)', () => {
  it('a second mark laid on a foe ends the first; a second gift on an ally ends the first; a mark and a gift stand together', () => {
    const f = fightWith([{}, { name: 'Ally' }], [{ at: 'J6' }]); const pc = f.pc, al = f.pcs[1], foe = f.foe;
    withGame(f.g, () => {
      applyCond(f.cb, f.g.rng, pc, foe, 'exposed', undefined, undefined, { skipSave: true }); expect(condOn(foe, 'exposed')).toBe(true);
      applyCond(f.cb, f.g.rng, pc, foe, 'corroded', undefined, undefined, { skipSave: true });
      expect(condOn(foe, 'corroded')).toBe(true); expect(condOn(foe, 'exposed')).toBe(false);
      applyCond(f.cb, f.g.rng, pc, al, 'given_rage', undefined, undefined, { skipSave: true }); applyCond(f.cb, f.g.rng, pc, al, 'given_joy', undefined, undefined, { skipSave: true });
      expect(condOn(al, 'given_joy')).toBe(true); expect(condOn(al, 'given_rage')).toBe(false);
      applyCond(f.cb, f.g.rng, pc, al, 'exposed', undefined, undefined, { skipSave: true }); expect(condOn(al, 'given_joy')).toBe(true); // a mark does not end a gift
    });
  });
  it('the sizes are the bible\'s: a gift x1.2 on its damage, a mark -2 Defense', () => {
    const rows: any[] = (conditionsJ as any).items;
    const row = (id: string) => rows.find((r) => r.id === id);
    for (const id of ['given_rage', 'given_joy', 'given_shame', 'given_despair', 'given_abandon']) expect(row(id).effects.find((e: any) => e.op === 'damage_mult').value, id).toBe(1.2);
    for (const id of ['exposed', 'corroded', 'foe_rage', 'foe_abandon']) expect(row(id).effects.find((e: any) => e.op === 'stat_mod' && e.stat === 'defense').value, id).toBe(-2);
  });
});
