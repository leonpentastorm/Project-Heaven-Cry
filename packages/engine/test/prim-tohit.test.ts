// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1b, sub-step 1 (rev4-primitives.md section 6, Leon's ruling of 13 Nov 2026: "one hook"): every roll
// to hit a target, a weapon attack's, a Sigil's and an Outburst's, asks the same hook ('to_hit', rolls.ts toHitTerms),
// so an item or a condition that changes "a roll to hit this target" reaches all three. Nothing listens in the data yet:
// the golden tables do not move. Fixture: test/fixtures/classes-3.0-primitives-1b.json (test_to_hit_marked).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { toHitTerms, toHitAdd } from '../src/rolls';
import { previewAttack } from '../src/combat';
import { TRIGGERS, OPS } from '../src/effects/triggers';
import { A, W, pcs, foes } from './golden/harness';
import { opsFight } from './golden/itemops';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives-1b.json', import.meta.url)), 'utf8'));
const fx = FIX.relics.find((r: any) => r.id === 'test_to_hit_marked').effects;
const SRC = (f: string) => readFileSync(fileURLToPath(new URL('../src/' + f, import.meta.url)), 'utf8');

describe('one hook for every roll to hit', () => {
  beforeAll(() => addItems('relic', FIX.relics));
  afterAll(() => clearAddedItems());
  it('the trigger to_hit takes roll_mod; the three rolls ask the one hook', () => {
    expect(TRIGGERS.to_hit.hook).toBe('to_hit'); expect(OPS.roll_mod.on).toContain('to_hit');
    expect(SRC('combat.ts')).toMatch(/toHitTerms\(cb, att, tgt, 'weapon'/);
    expect(SRC('sigil.ts')).toMatch(/toHitAdd\(cb, caster, t, 'sigil'\)/);
    expect(SRC('magic.ts')).toMatch(/toHitAdd\(cb, u, t, 'soul'\)/);
    expect(SRC('classes/soul.ts')).toMatch(/toHitAdd\(cb, u, t, 'soul'/);
  });
  it('a data item reaches each kind of roll (the `damage` predicate tells them apart), and only against its target', () => {
    const g = opsFight({ relics: ['test_to_hit_marked'] }), cb = g.combat, u = pcs(g)[0], f = foes(g)[0];
    W(g, () => {
      for (const k of ['weapon', 'sigil', 'soul']) expect(toHitAdd(cb, u, f, k as any)).toBe(0);
      A.applyCond(cb, g.rng, u, f, 'marked', 2, undefined, { skipSave: true });
      expect(toHitAdd(cb, u, f, 'weapon')).toBe(fx[0].value); expect(toHitAdd(cb, u, f, 'soul')).toBe(fx[0].value);
      expect(toHitAdd(cb, u, f, 'sigil')).toBe(fx[0].value + fx[1].value);
      expect(toHitTerms(cb, foes(g)[1], u, 'weapon')).toEqual([]); // another holder, another target
    });
  });
  it('the weapon attack\'s preview shows the term and counts it', () => {
    const g0 = opsFight({}), g = opsFight({ relics: ['test_to_hit_marked'] });
    const run = (gg: any) => W(gg, () => { const cb = gg.combat, u = pcs(gg)[0], f = foes(gg)[0]; A.applyCond(cb, gg.rng, u, f, 'marked', 2, undefined, { skipSave: true }); return previewAttack(cb, u, f, 'shot'); });
    const a = run(g0), b = run(g);
    expect(b.toHit - a.toHit).toBe(fx[0].value); expect(b.terms.some((t: any) => t.v === fx[0].value)).toBe(true);
  });
});
