// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1b, sub-step 4 (docs/design/rev4-primitives.md P12): data toggles. An item's
// `toggles: [{id, name, on, if, default_on, effects}]` is shown by togglesFor like a lane's ToggleDef; its `if` greys
// it; its effects are the item's own triggered effects with `if: {toggle: [id]}` (predicate `toggle`: on for the action
// being resolved, cb.mods, or acted's ctx.toggles). Fixture: test/fixtures/classes-3.0-primitives-1b.json.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { togglesFor } from '../src/effects/actions';
import { itemInfo } from '../src/effects/collect';
import { previewAttack } from '../src/combat';
import { PREDICATES } from '../src/effects/triggers';
import { A, W, pcs, foes } from './golden/harness';
import { opsFight } from './golden/itemops';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives-1b.json', import.meta.url)), 'utf8'));
const T = FIX.relics.find((r: any) => r.id === 'test_toggle_heavy').toggles[0];
const KEY = 'relic:test_toggle_heavy';

describe('P12: data toggles', () => {
  beforeAll(() => addItems('relic', FIX.relics));
  afterAll(() => clearAddedItems());
  it('a toggle\'s effects are the item\'s own, each gated by the predicate toggle', () => {
    expect(PREDICATES.toggle).toBeTruthy();
    const info = itemInfo(KEY)!; expect(info.effects).toEqual([{ ...T.effects[0], if: { toggle: [T.id] } }]);
  });
  it('togglesFor lists it on its action type, with its `if`', () => {
    const g = opsFight({ relics: ['test_toggle_heavy'] }), cb = g.combat, u = pcs(g)[0];
    const list = () => W(g, () => togglesFor({ u, cb, g }, T.on[0], {}, []));
    expect(list()).toEqual([{ id: KEY + '#' + T.id, itemKey: KEY, label: T.name, why: null, on: false, preview: null, defaultOn: false }]);
    expect(W(g, () => togglesFor({ u, cb, g }, 'combat/move', {}, []))).toEqual([]);
    W(g, () => A.applyCond(cb, g.rng, foes(g)[0], u, 'marked', 2, undefined, { skipSave: true }));
    expect(list()[0].why).toMatch(/Not now/);
  });
  it('on for the action being resolved, its effect runs (the attack\'s damage); off, it does not', () => {
    const g = opsFight({ relics: ['test_toggle_heavy'] }), cb = g.combat, u = pcs(g)[0], f = foes(g)[0];
    const mults = (mods: string[]) => W(g, () => { cb.mods = mods; try { return previewAttack(cb, u, f, 'shot').dmg.mults; } finally { delete cb.mods; } });
    const off = mults([]), on = mults([KEY + '#' + T.id]);
    expect(on.length).toBe(off.length + 1); expect(on[on.length - 1]).toMatchObject({ v: T.effects[0].value });
  });
});
