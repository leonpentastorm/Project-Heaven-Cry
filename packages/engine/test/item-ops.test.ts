// @ts-nocheck (it reads data/effect_ops.json: node's fs, which the engine's tsconfig does not know)
// Item ops (engine foundations 3: docs/design/handoffs/engine-foundations-3-item-ops.md).
// 1. The closed lists in effects/triggers.ts and data/effect_ops.json `item_ops` (what tools/validate.py checks
//    against) are the same. ITEM_OPS_WRITE=1 writes the data block from the code.
// 2. Every triggered effect in the data is well formed and owned by the runner (or by its item's handler).
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRIGGERS, PREDICATES, OPS, LIMIT_SCOPES, isTriggered, triggerProblem } from '../src/effects/triggers';
import { allItems, ownerOf } from '../src';

const OPS_FILE = fileURLToPath(new URL('../../../data/effect_ops.json', import.meta.url));
export function itemOpsBlock() {
  return {
    about: 'The closed lists of item ops (engine foundations 3): an effect whose `when` is one of these triggers is run by the engine\'s generic runner (packages/engine/src/effects/triggers.ts). `if` keys are predicates, `op` and every `and` op must take the trigger, `limit` is { per, n, key?, each? } or { cooldown }. Written from the code by test/item-ops.test.ts (ITEM_OPS_WRITE=1); tools/validate.py checks the data against it.',
    triggers: Object.fromEntries(Object.entries(TRIGGERS).map(([k, t]) => [k, { hook: t.hook, ...(t.phase ? { phase: t.phase } : {}), self: t.self, about: t.about }])),
    predicates: Object.fromEntries(Object.entries(PREDICATES).map(([k, p]) => [k, { arg: p.arg, about: p.about }])),
    ops: Object.fromEntries(Object.entries(OPS).map(([k, o]) => [k, { on: o.on, fields: o.fields, changes_state: o.state, about: o.about }])),
    limit_scopes: LIMIT_SCOPES,
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
