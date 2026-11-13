// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1b, sub-step 7 (docs/design/rev4-primitives.md section 6): `delay` on any op (queued, its amount
// fixed when queued, saved with the fight, dropped on a dead unit); the number source ties:<kind>; the predicates
// self_holds / self_lacks_gear (character.ts holds: the one "focus in hand" test hasEvoker and hasEmanator are); the
// op redirect and its split. Fixtures: test/fixtures/classes-3.0-primitives-1b.json.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems, ifFails } from '../src/effects/hooks';
import { tie, addTieKinds, clearTieKinds } from '../src/kit';
import { holds, hasEvoker, hasEmanator } from '../src/character';
import { applyDamage } from '../src/effects/damage';
import { PREDICATES, SOURCE_SPACES, OPS, DELAY_UNTIL } from '../src/effects/triggers';
import { A, W, pcs, foes, turn, dice } from './golden/harness';
import { opsFight } from './golden/itemops';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives-1b.json', import.meta.url)), 'utf8'));
const R = (id: string) => FIX.relics.find((r: any) => r.id === id).effects;
const hit = (cb: any, t: any, by: any, n: number) => applyDamage(cb, t, n, { by, type: 'weapon', shield: true, credit: 'hp' });

describe('section 6: the addendum', () => {
  beforeAll(() => { addTieKinds(FIX.tie_kinds); addItems('relic', FIX.relics); });
  afterAll(() => { clearTieKinds(); clearAddedItems(); });
  it('the closed lists', () => {
    expect(DELAY_UNTIL).toEqual(['target_turn_start', 'holder_turn_start', 'rounds']); expect(SOURCE_SPACES).toContain('ties');
    expect(PREDICATES.self_holds.arg).toBe('hold'); expect(PREDICATES.self_lacks_gear).toBeTruthy(); expect(OPS.redirect.on).toEqual(['taking']);
  });
  it('delay: queued with its amount fixed, run at the target\'s next turn, saved on the fight; dropped when the target is dead', () => {
    const g = opsFight({ relics: ['test_delay_sting'] }), cb = g.combat, u = pcs(g)[0], f = foes(g)[0];
    W(g, () => {
      dice({ die: 10, hit: true }, () => A.resolveAttack(cb, g.rng, u, f, 'shot', null, { noAp: true }));
      expect(cb.delayed.length).toBe(1); const n = cb.delayed[0].op.fixed.n; expect(n).toBeGreaterThanOrEqual(R('test_delay_sting')[0].amount.base);
      expect(JSON.parse(JSON.stringify(cb.delayed))).toEqual(cb.delayed); // plain data: saved with the fight
      const hp = f.hp; turn(g, f, 6); expect(hp - f.hp).toBe(Math.floor(n)); expect(cb.delayed).toBeUndefined();
      dice({ die: 10, hit: true }, () => A.resolveAttack(cb, g.rng, u, f, 'shot', null, { noAp: true }));
      f.dead = true; turn(g, f, 6); expect(cb.delayed).toBeUndefined(); // dropped
    });
  });
  it('ties:<kind>: a number counts the holder\'s ties of a kind', () => {
    const g = opsFight({ relics: ['test_ties_count'] }), cb = g.combat, u = pcs(g)[0], [f, far] = foes(g);
    W(g, () => {
      const a = A.previewAttack(cb, u, f, 'shot').dmg.total; tie(cb, u, far, 'test_bond');
      expect(A.previewAttack(cb, u, f, 'shot').dmg.total).toBeGreaterThan(a);
    });
  });
  it('self_holds / self_lacks_gear: one test of a focus in hand, which hasEvoker and hasEmanator are', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0], c = g.characters[u.charId];
    W(g, () => {
      const h: any = { key: 'perk:x', info: null, u, cb, c };
      c.weapon = 'evoker'; expect(holds(c, { slot: 'hand', door: 'evoker' })).toBe(true); expect(hasEvoker(c)).toBe(true); expect(hasEmanator(c)).toBe(false);
      expect(ifFails(h, { self_holds: { slot: 'hand', door: 'evoker' } })).toBeNull(); expect(ifFails(h, { self_lacks_gear: { door: 'evoker' } })).toBe('self_lacks_gear');
      expect(ifFails(h, { self_holds: { slot: 'person', item: 'evoker' } })).toBeNull();
    });
  });
  it('redirect: half of an ally\'s hit comes to the holder; split: divided among a set', () => {
    const g = opsFight({ relics: ['test_share_hit'] }), cb = g.combat, [u, al] = pcs(g), f = foes(g)[0];
    W(g, () => { u.shield = 0; al.shield = 0; const a = al.hp, b = u.hp; hit(cb, al, f, 10); expect(a - al.hp).toBe(5); expect(b - u.hp).toBe(5); });
    const g2 = opsFight({ relics: ['test_share_split'] }), cb2 = g2.combat, [u2, al2] = pcs(g2);
    W(g2, () => { u2.shield = 0; al2.shield = 0; const a = u2.hp, b = al2.hp; hit(cb2, u2, foes(g2)[0], 10); expect(a - u2.hp).toBe(5); expect(b - al2.hp).toBe(5); });
  });
});
