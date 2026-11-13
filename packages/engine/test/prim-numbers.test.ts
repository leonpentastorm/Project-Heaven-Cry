// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1a, row 2 (docs/design/rev4-primitives.md P3): number blocks and amount sources. Any numeric field
// of an item op may be {base, per: [{of, value}], min?, max?}; `of` names res:<id>, event:<field>, self:/actor:/
// target:<field>; an amount block's per-point parts read the same sources; op `resource` takes "all" and "zero".
// Fixture items in test/fixtures/classes-3.0-primitives.json; every number is read from there or from the data.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems, onHook } from '../src/effects/hooks';
import { numberOf, isNumberBlock } from '../src/effects/amounts';
import { effNum } from '../src/effects/num';
import { A, W, dice, HIT, pcs, foes, charOf } from './golden/harness';
import { opsFight } from './golden/itemops';
import CLASSES from '../../../data/classes.json';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives.json', import.meta.url)), 'utf8'));
const relic = (id: string) => FIX.relics.find((r: any) => r.id === id);
const apply = (g: any, a: any) => { const g1 = A.apply(g, a, 'host'); Object.assign(g, g1); return g; };
const TAP: { mults?: any[]; dmg?: number[] } = {};
onHook('on_damaged', (ctx: any) => { TAP.dmg?.push(ctx.dmg); });
onHook('damage_out', (ctx: any) => { TAP.mults?.push(...ctx.mults.filter((m: any) => m.label === 'Marked bonus').map((m: any) => m.v)); });

describe('P3: number blocks', () => {
  it('numberOf: base + Σ value × source, held between min and max; a plain number is itself; an amount block is not one', () => {
    const b = { base: 1, per: [{ of: 'a', value: 0.2 }, { of: 'b', value: 2 }], min: 0.5, max: 2 };
    expect(numberOf(b, (of) => ({ a: 2, b: 0 } as any)[of])).toBeCloseTo(1.4);
    expect(numberOf(b, (of) => ({ a: 10, b: 0 } as any)[of])).toBe(2);
    expect(numberOf({ ...b, base: -5 }, () => 0)).toBe(0.5);
    expect(numberOf(7)).toBe(7);
    expect(isNumberBlock({ kind: 'heal', base: 3 })).toBe(false);
  });
});

describe('P3 in item ops: fixture items in data only', () => {
  beforeAll(() => { addItems('relic', FIX.relics); });
  afterAll(() => clearAddedItems());

  it('a damage_mult from target:<condition> (1 while it has it)', () => {
    const blk = relic('test_num_marked').effects[0].value, shot = (mark: boolean) => {
      const g = opsFight({ relics: ['test_num_marked'] }), u = pcs(g)[0], t = foes(g)[1];
      if (mark) W(g, () => A.applyCond(g.combat, g.rng, u, t, 'marked', 2, undefined, { skipSave: true }));
      const out: any[] = []; TAP.mults = out; try { W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, u, t, 'shot', charOf(g, u)))); } finally { delete TAP.mults; }
      return out;
    };
    expect(shot(false).every((v) => v === blk.base)).toBe(true);
    expect(shot(true).at(-1)).toBe(Math.min(blk.max, blk.base + blk.per[0].value));
  });

  it('a grant_ap from res:<id>, held at its max', () => {
    const blk = relic('test_num_guard').effects[0].value;
    for (const guard of [1, 4]) {
      const g = opsFight({ relics: ['test_num_guard'] }), u = pcs(g)[0]; u.res = { ...(u.res || {}), guard }; u.resMax = { ...(u.resMax || {}), guard: 5 }; u.ammo = 0;
      const ap0 = u.ap, cost = W(g, () => A.price({ cb: g.combat, u }, 'reload').ap);
      W(g, () => apply(g, { type: 'combat/reload', unitId: u.id }));
      expect(pcs(g)[0].ap, 'guard ' + guard).toBe(ap0 - cost + Math.min(blk.max, guard * blk.per[0].value));
    }
  });

  it('resource "all" spends and "zero" loses all of it', () => {
    const g = opsFight({ relics: ['test_res_all'] }), u = pcs(g)[0]; u.res = { ...(u.res || {}), guard: 3, momentum: 2 }; u.resMax = { ...(u.resMax || {}), guard: 5, momentum: 5 };
    W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, u, foes(g)[1], 'shot', charOf(g, u))));
    expect(pcs(g)[0].res.guard).toBe(0); expect(pcs(g)[0].res.momentum).toBe(2);
    W(g, () => A.endTurn(g.combat, g.rng)); expect(pcs(g)[0].res.momentum).toBe(0);
  });

  it('an amount block\'s per-point parts read event:amount and self:max_hp', () => {
    const fx = relic('test_amount_sources').effects;
    const g = opsFight({ relics: ['test_amount_sources'] }), u = pcs(g)[0], f = foes(g)[1];
    const dmg: number[] = []; TAP.dmg = dmg;
    try { W(g, () => dice(HIT, () => { f.ap = 9; g.combat.turn = g.combat.order.indexOf(f.id); A.resolveAttack(g.combat, g.rng, f, u, 'shot', null); })); } finally { delete TAP.dmg; }
    const took = dmg[0]; expect(took).toBeGreaterThan(0);
    expect(pcs(g)[0].shield).toBe(Math.floor(took * fx[0].amount.per[0].value * (u.shieldRecv || 1))); // the sink's receiver multiplier, as for every shield
    const v = pcs(g)[0]; v.shield = 0; v.hp = 10; g.combat.turn = g.combat.order.indexOf(v.id); v.ap = 9;
    W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, v, foes(g)[1], 'shot', charOf(g, v))));
    expect(pcs(g)[0].hp).toBe(10 + Math.floor(v.maxHp * fx[1].amount.per[0].value * (v.healRecv || 1))); // the heal sink's receiver multiplier
  });
});

describe('P3 moved the handlers\' math into data', () => {
  const pool = (CLASSES as any).move_pool.moves, fin = pool.find((m: any) => m.id === 'finisher'), plate = pool.find((m: any) => m.id === 'reactive_plate');
  it('Finisher: its multiplier is its data\'s number block (base, per Momentum spent, max)', () => {
    const blk = fin.effects[0].value, h = { key: 'class:fighter.finisher' };
    for (const n of [1, 3, 5, 7]) expect(effNum(h, 'damage_mult', 'value', { momentum_spent: n })).toBeCloseTo(Math.min(blk.max, blk.base + blk.per[0].value * n));
  });
  it('Reactive Plate: its cut, its shed and its count come from its effects', () => {
    const h = { key: 'class:defender.reactive_plate' };
    expect(effNum(h, 'stat_mod')).toBe(plate.effects[0].value); expect(effNum(h, 'meter', 'every')).toBe(plate.effects[1].every); expect(effNum(h, 'meter')).toBe(plate.effects[1].value);
    expect(() => effNum(h, 'meter', 'nothing')).toThrow();
  });
});
