// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1a, row 5 (docs/design/rev4-primitives.md P5): the unit set `targets` on any op. The op runs once for
// each unit of the set, as its target, in the fight's order (kit.ts unitsIn). Fixture items in
// test/fixtures/classes-3.0-primitives.json; the expected sets are worked out here from the same kit selectors.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { targetsProblem, TARGET_FIELDS } from '../src/effects/triggers';
import { unitsIn, inArea } from '../src/kit';
import { A, W, dice, HIT, pcs, foes, charOf } from './golden/harness';
import { opsFight } from './golden/itemops';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives.json', import.meta.url)), 'utf8'));
const relic = (id: string) => FIX.relics.find((r: any) => r.id === id);
const apply = (g: any, a: any) => { const g1 = A.apply(g, a, 'host'); Object.assign(g, g1); return g; };
const has = (u: any, id: string) => Object.keys(u.conds || {}).includes(id);

describe('P5: targets, the unit set', () => {
  beforeAll(() => addItems('relic', FIX.relics));
  afterAll(() => clearAddedItems());
  it('the shape is checked: fields, words, a cone\'s length', () => {
    expect(Object.keys(TARGET_FIELDS)).toEqual(['of', 'side', 'within', 'shape', 'seen', 'alive', 'downed', 'max', 'sees', 'tied', 'aims_at']);
    expect(targetsProblem({ of: 'target', side: 'foe', within: 3 })).toBeNull();
    expect(targetsProblem({ side: 'enemy' })).toMatch(/side/); expect(targetsProblem({ shape: 'cone' })).toMatch(/within/); expect(targetsProblem({ nearby: 1 })).toMatch(/unknown/); expect(targetsProblem({ tied: 'bond' })).toBeNull(); // (step 1b: tied came with ties)
  });
  it('of target, side foe, within: a kill marks the other enemies within reach of the body (not the body, not the holder\'s side)', () => {
    const e = relic('test_targets_dread').effects[0], g = opsFight({ relics: ['test_targets_dread'] }), u = pcs(g)[0], far = foes(g)[1];
    far.hp = 1; const at = far.pos;
    const want = unitsIn(g.combat, { shape: 'burst', at, r: e.targets.within }).filter((v: any) => v.side !== u.side && v !== far).map((v: any) => v.id);
    expect(want.length).toBeGreaterThan(0);
    W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, u, far, 'shot', charOf(g, u))));
    expect(foes(g).filter((v: any) => has(v, e.condition)).map((v: any) => v.id)).toEqual(want);
    expect(pcs(g).some((v: any) => has(v, e.condition))).toBe(false);
    expect(g.combat.log.some((l: string) => l.startsWith('Dread over ' + far.name))).toBe(true);
  });
  it('a set with nobody in it does nothing and says nothing', () => {
    const g = opsFight({ relics: ['test_targets_dread'] }), u = pcs(g)[0], far = foes(g)[1];
    for (const v of foes(g)) if (v !== far) v.pos = '15,15'; far.hp = 1;
    W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, u, far, 'shot', charOf(g, u))));
    expect(g.combat.log.some((l: string) => l.startsWith('Dread over'))).toBe(false);
  });
  it('side ally (not the holder), max: the first n in the fight\'s order', () => {
    const e = relic('test_targets_rally').effects[0], g = opsFight({ relics: ['test_targets_rally'] }), u = pcs(g)[0], v = pcs(g)[1];
    u.ammo = 0; u.hp = 10; const hpV = v.hp;
    W(g, () => apply(g, { type: 'combat/reload', unitId: u.id }));
    // what the same heal gives this ally straight through the sink (its receiver's multiplier and items)
    const g2 = opsFight({}), v2 = pcs(g2)[1], hp2 = v2.hp; W(g2, () => A.mend(g2.combat, pcs(g2)[0], v2, { kind: 'heal', base: e.amount.base, profile: e.amount.profile, round: 'none' }, { who: charOf(g2, pcs(g2)[0]), healKind: 'perk' }));
    const g3 = opsFight({}), u3 = pcs(g3)[0], hp3 = pcs(g3)[1].hp; u3.ammo = 0; u3.hp = 10; W(g3, () => apply(g3, { type: 'combat/reload', unitId: u3.id })); // the reload alone
    expect(pcs(g)[1].hp - hpV - (pcs(g3)[1].hp - hp3)).toBe(v2.hp - hp2); expect(v2.hp).toBeGreaterThan(hp2); expect(pcs(g)[0].hp).toBe(pcs(g3)[0].hp); // the ally; never the holder (side ally)
  });
  it('shape cone from the holder toward the target, seen by the holder\'s side', () => {
    const e = relic('test_targets_cone').effects[0], g = opsFight({ relics: ['test_targets_cone'] }), u = pcs(g)[0], far = foes(g)[1];
    far.hp = 999; far.maxHp = 999;
    const want = foes(g).filter((v: any) => inArea({ shape: 'cone', from: u.pos, toward: far.pos, n: e.targets.within }, v.pos)).map((v: any) => v.id);
    W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, u, far, 'shot', charOf(g, u))));
    expect(foes(g).filter((v: any) => has(v, e.condition)).map((v: any) => v.id)).toEqual(want.filter((id: string) => W(g, () => A.sideSees(g.combat, 'pc', g.combat.units.find((x: any) => x.id === id)))));
  });
});
