// @ts-nocheck (it reads data/effect_ops.json: node's fs, which the engine's tsconfig does not know)
// Item ops (engine foundations 3: docs/design/handoffs/engine-foundations-3-item-ops.md).
// 1. The closed lists in effects/triggers.ts and data/effect_ops.json `item_ops` (what tools/validate.py checks
//    against) are the same. ITEM_OPS_WRITE=1 writes the data block from the code.
// 2. Every triggered effect in the data is well formed and owned by the runner (or by its item's handler).
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRIGGERS, PREDICATES, OPS, LIMIT_SCOPES, TARGET_FIELDS, isTriggered, triggerProblem } from '../src/effects/triggers';
import { allItems, ownerOf, addItems, clearAddedItems, itemInfo, handlerOf } from '../src';
import { afterAll, beforeAll } from 'vitest';
import { opsFight, situations } from './golden/itemops';
import { A, W, dice, HIT, pcs, foes, charOf } from './golden/harness';

const OPS_FILE = fileURLToPath(new URL('../../../data/effect_ops.json', import.meta.url));
export function itemOpsBlock() {
  return {
    about: 'The closed lists of item ops (engine foundations 3): an effect whose `when` is one of these triggers is run by the engine\'s generic runner (packages/engine/src/effects/triggers.ts). `if` keys are predicates, `op` and every `and` op must take the trigger, `limit` is { per, n, key?, each? } or { cooldown }. Written from the code by test/item-ops.test.ts (ITEM_OPS_WRITE=1); tools/validate.py checks the data against it.',
    triggers: Object.fromEntries(Object.entries(TRIGGERS).map(([k, t]) => [k, { hook: t.hook, ...(t.phase ? { phase: t.phase } : {}), self: t.self, about: t.about }])),
    predicates: Object.fromEntries(Object.entries(PREDICATES).map(([k, p]) => [k, { arg: p.arg, about: p.about, ...(p.values ? { values: p.values } : {}) }])),
    ops: Object.fromEntries(Object.entries(OPS).map(([k, o]) => [k, { on: o.on, fields: o.fields, changes_state: o.state, about: o.about }])),
    limit_scopes: LIMIT_SCOPES,
    targets: { about: 'Classes 3.0 P5: `targets` on any op runs it once for each unit of the set, as its target (effects/triggers.ts TargetSet)', fields: TARGET_FIELDS },
  };
}

describe('item ops: the closed lists', () => {
  it('data/effect_ops.json item_ops is the code\'s list', () => {
    const raw = JSON.parse(readFileSync(OPS_FILE, 'utf8')), want = itemOpsBlock();
    if (process.env.ITEM_OPS_WRITE === '1') { raw.item_ops = want; writeFileSync(OPS_FILE, JSON.stringify(raw, null, 2) + '\n'); }
    expect(raw.item_ops).toEqual(want);
  });
  it('every triggered effect in the data is well formed, and run by the runner or its item\'s own handler', () => {
    const bad: string[] = [];
    for (const info of allItems()) info.effects.forEach((e, i) => {
      if (!isTriggered(e)) return;
      const own = ownerOf(info, i), why = triggerProblem(e);
      if (own === 'handler') return; // the item's handler claims it (a legacy token in its own words)
      if (why || own !== 'generic') bad.push(info.key + '@' + info.tier + ' #' + i + ': ' + (why || own));
    });
    expect(bad).toEqual([]);
  });
});

// ---------- 3. the proof: a perk and a relic written in data only, in a fight ----------
const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/item-ops-items.json', import.meta.url)), 'utf8'));
describe('item ops: a new perk and a relic in data only (test/fixtures/item-ops-items.json), in a fight', () => {
  beforeAll(() => { addItems('perk', FIX.perks); addItems('relic', FIX.relics); });
  afterAll(() => clearAddedItems());
  it('they are items like any other: no handler, every effect run by the runner, every effect well formed', () => {
    for (const k of ['perk:test_blood_for_blood', 'relic:test_ember_charm']) {
      const info = itemInfo(k)!; expect(info, k).toBeTruthy(); expect(handlerOf(k)).toBeFalsy();
      info.effects.forEach((e, i) => { expect(triggerProblem(e), k + ' #' + i).toBeNull(); expect(ownerOf(info, i), k + ' #' + i).toBe('generic'); });
    }
  });
  const base = () => opsFight({});
  it('the perk: an ally dropped by an enemy banks 2 AP once a fight, and the next hit deals +50%', () => {
    const g0 = opsFight({ perks: { test_blood_for_blood: 'mastered' } }), b0 = base();
    const mine = situations(g0), theirs = situations(b0);
    expect(theirs['ally-lethal'].line).not.toMatch(/apNext/);
    expect(mine['ally-lethal'].line).toMatch(/P1 apNext:->2/);
    expect(mine['ally-lethal'].words).toMatch(/swears it on Squadmate's blood \(Blood for Blood\)/);
    // then the holder's shot: half as much again as the same shot without the perk; the shot after it is plain
    const play = (g: any) => W(g, () => dice(HIT, () => {
      const cb = g.combat, [u, al] = pcs(g), far = foes(g)[1];
      al.hp = 3; far.ap = 9; cb.turn = cb.order.indexOf(far.id); A.resolveAttack(cb, g.rng, far, al, 'shot', null); // the ally drops
      cb.turn = cb.order.indexOf(u.id); u.ap = 9; const hp0 = far.hp;
      A.resolveAttack(cb, g.rng, u, far, 'shot', charOf(g, u)); const first = hp0 - far.hp;
      const hp1 = far.hp; u.ap = 9; A.resolveAttack(cb, g.rng, u, far, 'shot', charOf(g, u)); return [first, hp1 - far.hp];
    }));
    const [m1, m2] = play(g0), [b1, b2] = play(b0);
    expect(b1).toBeGreaterThan(0);
    expect(m1 / b1).toBeGreaterThan(1.4); expect(m1 / b1).toBeLessThan(1.6);
    expect(m2).toBe(b2);
    // once a fight: a second ally drop banks nothing more
    const again = W(g0, () => dice(HIT, () => { const cb = g0.combat, al = pcs(g0)[1], far = foes(g0)[1]; A.setDowned(al, false); al.hp = 3; far.ap = 9; cb.turn = cb.order.indexOf(far.id); A.resolveAttack(cb, g0.rng, far, al, 'shot', null); return pcs(g0)[0].apNext || 0; }));
    expect(again).toBe(2);
  });
  it('the relic: a melee hit sets Burning once a turn, the turn start heals (base 5, on the one formula: its Level term), a reload costs 1 AP less', () => {
    const g0 = opsFight({ relics: ['test_ember_charm'] }), mine = situations(g0), theirs = situations(base());
    expect(mine.blow.line).toMatch(/F1 [^,]*conds:>burning/); expect(theirs.blow.line).not.toMatch(/burning/);
    expect(mine.blow.words).toMatch(/The Ember Charm flares/);
    { const m = /P1 hp:141\/235>(\d+)\/235/.exec(mine['turn-again'].line); expect(m && +m[1] > 141, mine['turn-again'].line).toBe(true); } expect(theirs['turn-again'].line).not.toMatch(/hp:/);
    expect(mine.prices.words).toMatch(/ reload1 /); expect(theirs.prices.words).toMatch(/ reload2 /);
    // once a turn: a second melee hit in the same turn, on a fresh target, lights nothing
    const lit = W(g0, () => dice(HIT, () => { const cb = g0.combat, u = pcs(g0)[0], [f, far] = foes(g0); u.ap = 9; A.resolveAttack(cb, g0.rng, u, f, 'melee', charOf(g0, u)); far.pos = '3,7'; u.ap = 9; A.resolveAttack(cb, g0.rng, u, far, 'melee', charOf(g0, u)); return [A.condOn(f, 'burning'), A.condOn(far, 'burning')]; }));
    expect(lit).toEqual([true, false]);
  });
});
