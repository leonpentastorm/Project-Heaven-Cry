// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1a, row 4 (docs/design/rev4-primitives.md P4): conditions are items. A data/conditions.json row's
// effects with a trigger `when` run through the item-op runner with the bearer as the holder and the giver as `source`
// ({source} in a say); a row's stat_mod of any declared stat answers statQuery (condtable.ts keeps the seven it reads).
// The fixture row is in test/fixtures/classes-3.0-primitives.json, added at run time (hooks.ts addConditions).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addConditions, clearAddedConditionRows, statQuery } from '../src/effects/hooks';
import { COND_TABLE_STATS } from '../src/effects/triggers';
import { condDef } from '../src/condtable';
import { maxReactions } from '../src/tactics';
import { A, W, dice, HIT, pcs, foes, charOf, turn } from './golden/harness';
import { opsFight } from './golden/itemops';
import CONDITIONS from '../../../data/conditions.json';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives.json', import.meta.url)), 'utf8'));
const row = FIX.conditions[0], fx = row.effects;
const shot = (bear: boolean) => {
  const g = opsFight({}), u = pcs(g)[0], v = pcs(g)[1], t = foes(g)[1];
  if (bear) W(g, () => A.applyCond(g.combat, g.rng, v, u, row.id, undefined, undefined, { skipSave: true }));
  const hp = t.hp; W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, u, t, 'shot', charOf(g, u)))); return { dealt: hp - t.hp, g, u, v };
};

describe('P4: conditions are items', () => {
  beforeAll(() => addConditions(FIX.conditions));
  afterAll(() => clearAddedConditionRows());
  it('a row added at run time is a condition like any other', () => { expect(condDef(row.id)?.title).toBe(row.name); });
  it('its triggered effect runs for the bearer (dealing: + the row\'s value) and stops when it ends', () => {
    const plain = shot(false).dealt, borne = shot(true);
    expect(borne.dealt).toBeGreaterThan(plain); // the flat add, multiplied with the shot (the one formula's order)
    W(borne.g, () => A.endCond(borne.u, row.id, borne.g.combat));
    const t = foes(borne.g)[1], hp = t.hp; W(borne.g, () => dice(HIT, () => A.resolveAttack(borne.g.combat, borne.g.rng, borne.u, t, 'shot', charOf(borne.g, borne.u)))); expect(hp - t.hp).toBe(plain);
  });
  it('its stat_mod of a declared stat answers statQuery (reactions)', () => {
    const { g, u } = shot(true), base = shot(false);
    W(g, () => { expect(statQuery({ u }, 'reactions').add).toBe(fx[1].value); expect(maxReactions(u, g.combat)).toBe(1 + fx[1].value); });
    W(base.g, () => expect(maxReactions(base.u, base.g.combat)).toBe(1));
  });
  it('the giver is its {source}', () => {
    const { g, u, v } = shot(true); turn(g, u, 0);
    expect(g.combat.log.join('\n')).toContain(fx[2].say.replace('{source}', v.name).replace('{self}', u.name));
  });
  it('the stats condtable.ts reads from a row are not answered twice (Guarded\'s Defense, Slowed\'s Movement)', () => {
    for (const r of (CONDITIONS as any).items) for (const e of r.effects || []) if (e.op === 'stat_mod' && COND_TABLE_STATS.has(e.stat)) {
      const g = opsFight({}), u = pcs(g)[0]; W(g, () => A.applyCond(g.combat, g.rng, foes(g)[0], u, r.id, undefined, undefined, { skipSave: true }));
      expect(statQuery({ u }, e.stat === 'defense' ? 'defense' : 'vision').add, r.id).toBe(0);
    }
  });
});
