// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1a, row 6 (docs/design/rev4-primitives.md P7): sight words. One function, tactics.ts sightOf(cb, u,
// by?), says which of seen / unseen and in_view / out_of_view hold (shadow-spec.md 2.1's table over seenByFoes,
// sideSeesUnit, unitSees); predicates self_sight, actor_sight, target_sight read it; stat always_seen makes a unit seen
// wherever it is; a unit with `eyes: false` sees nothing. Fixtures in test/fixtures/classes-3.0-primitives.json.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems, addConditions, clearAddedConditionRows } from '../src/effects/hooks';
import { sightOf, seenByFoes, SIGHT_WORDS } from '../src/tactics';
import { sideSeesUnit, unitSees, visibility } from '../src/combat';
import { PREDICATES } from '../src/effects/triggers';
import { A, W, pcs, foes, turn } from './golden/harness';
import { opsFight } from './golden/itemops';
import CLASSES from '../../../data/classes.json';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives.json', import.meta.url)), 'utf8'));
const relic = (id: string) => FIX.relics.find((r: any) => r.id === id);
/** Blind every enemy (their eyes reach no tile): the holder is out of view. */
const blindFoes = (g: any) => { for (const f of foes(g)) f.vision = 0.1; };

describe('P7: sight words', () => {
  beforeAll(() => { addItems('relic', FIX.relics); addConditions(FIX.conditions); });
  afterAll(() => { clearAddedItems(); clearAddedConditionRows(); });
  it('the words are the closed list of the three predicates', () => {
    for (const p of ['self_sight', 'actor_sight', 'target_sight']) expect(PREDICATES[p].values).toEqual(SIGHT_WORDS);
  });
  it('sightOf is the engine\'s own tests: seen = sideSeesUnit, in_view = seenByFoes; to one unit: unitSees and not Hidden', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0], f = foes(g)[0];
    W(g, () => {
      for (const v of cb.units) { const s = sightOf(cb, v); expect(s[0] === 'seen', v.id).toBe(sideSeesUnit(cb, v.side === 'pc' ? 'foe' : 'pc', v)); expect(s[1] === 'in_view', v.id).toBe(seenByFoes(cb, v)); }
      u.hidden = true; expect(sightOf(cb, u)[0]).toBe('unseen'); expect(sightOf(cb, u)[1]).toBe(seenByFoes(cb, u) ? 'in_view' : 'out_of_view');
      expect(sightOf(cb, u, f)).toEqual(['unseen', unitSees(cb, f, u.pos) ? 'in_view' : 'out_of_view']);
      blindFoes(g); u.hidden = false; expect(sightOf(cb, u)).toEqual(['unseen', 'out_of_view']);
    });
  });
  it('always_seen (a condition row answering it: P4): seen and in view wherever it is', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0]; blindFoes(g); u.hidden = true;
    W(g, () => { expect(sightOf(cb, u)).toEqual(['unseen', 'out_of_view']); A.applyCond(cb, g.rng, foes(g)[0], u, 'test_beacon', 2, undefined, { skipSave: true }); expect(sightOf(cb, u)).toEqual(['seen', 'in_view']); });
  });
  it('eyes: false: the unit sees nothing, and its side sees nothing through it', () => {
    const g = opsFight({}), cb = g.combat, f = foes(g)[0], u = pcs(g)[0];
    W(g, () => { expect(unitSees(cb, f, u.pos)).toBe(true); f.eyes = false; expect(unitSees(cb, f, u.pos)).toBe(false); expect(unitSees(cb, f, f.pos)).toBe(false); });
    const g2 = opsFight({}); for (const x of foes(g2)) x.eyes = false; W(g2, () => expect(visibility(g2.combat, 'foe').tiles.size).toBe(0));
  });
  it('self_sight in data: out of view, the turn\'s start gives AP; seen, a flag', () => {
    const e = relic('test_sight_shroud').effects;
    const g = opsFight({ relics: ['test_sight_shroud'] }), u = pcs(g)[0]; blindFoes(g); W(g, () => turn(g, u, 0)); // turn() sets AP after beginTurn: read the bank of perk AP
    const g0 = opsFight({}); blindFoes(g0); const a0 = W(g0, () => { g0.combat.turn = g0.combat.order.indexOf(pcs(g0)[0].id); A.beginTurn(g0.combat, g0.rng); return pcs(g0)[0].ap; });
    const a1 = W(g, () => { g.combat.round++; g.combat.turn = g.combat.order.indexOf(u.id); A.beginTurn(g.combat, g.rng); return u.ap; });
    expect(a1).toBe(a0 + e[0].value);
    const s = opsFight({ relics: ['test_sight_shroud'] }), su = pcs(s)[0]; W(s, () => turn(s, su, 0));
    expect(!!su.ps?.['relic:test_sight_shroud']?.flags?.spotted).toBe(W(s, () => sightOf(s.combat, su)[0] === 'seen'));
  });
  it('Vanish\'s gate is written in sight words now (requires_state is gone): out of view, not Marked, not Hidden', () => {
    const v = (CLASSES as any).base.find((b: any) => b.id === 'infiltrator').ranks.I.moves.find((m: any) => m.id === 'vanish');
    const g = v.effects.find((e: any) => e.op === 'grant_action');
    expect(g.requires_state).toBeUndefined(); expect(g.if).toEqual({ self_sight: ['out_of_view'], self_lacks: ['marked', 'hidden'] });
  });
});
