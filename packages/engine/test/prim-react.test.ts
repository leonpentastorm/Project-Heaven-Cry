// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1a, row 3 (docs/design/rev4-primitives.md P1; rules 1.28): react(cb, u, {kind, event, spend, payer,
// window}, fn), the one door every reaction goes through, counted in the `uses` cell of scope `reaction`. Its two
// rulings (Leon, 13 Nov 2026): a reaction never triggers a reaction; Suppressed (the condition, and Pressure's state)
// forbids attacking and moving reactions, never protective ones. Fixture items in test/fixtures/classes-3.0-primitives.json.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems, onHook } from '../src/effects/hooks';
import { react, canReact, reactionsUsed, maxReactions, loseReactions, reactBlocked, REACT_KINDS } from '../src/tactics';
import { SCOPES } from '../src/effects/uses';
import { condMods } from '../src/condtable';
import { A, W, dice, HIT, pcs, foes, charOf } from './golden/harness';
import { opsFight } from './golden/itemops';
import CONDITIONS from '../../../data/conditions.json';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives.json', import.meta.url)), 'utf8'));
const relic = (id: string) => FIX.relics.find((r: any) => r.id === id);
const TAP: { windows?: any[] } = {};
onHook('reaction_window', (ctx: any) => { if (TAP.windows) { TAP.windows.push(ctx.kind); if (ctx.kind === 'test-cancel') ctx.cancel = true; } });
const fight = () => { const g = opsFight({}); return { g, cb: g.combat, u: pcs(g)[0], v: pcs(g)[1], f: foes(g)[0] }; };
const suppressedKinds = (CONDITIONS as any).items.find((c: any) => c.id === 'suppressed').effects.find((e: any) => e.op === 'forbid').kinds;

describe('P1 react(): the count', () => {
  it('one reaction a round in the uses cell (scope reaction: fresh each round; on the area map it lives in the story)', () => {
    const { g, cb, u } = fight();
    W(g, () => {
      expect(maxReactions(u, cb)).toBe(1); expect(reactionsUsed(cb, u)).toBe(0);
      expect(react(cb, u, { kind: 'attack' })).toBe(true); expect(reactionsUsed(cb, u)).toBe(1);
      expect(canReact(cb, u, 'attack')).toBe(false); expect(react(cb, u, { kind: 'protect' })).toBe(false);
      cb.round++; expect(reactionsUsed(cb, u)).toBe(0); expect(canReact(cb, u, 'attack')).toBe(true);
    });
    expect(SCOPES.reaction.map).toBe('story'); expect(SCOPES.reaction.fight).toBe('unit');
  });
  it('spend: n reactions at once (refused with fewer); a payer pays for another (Many Hands, the owner later)', () => {
    const { g, cb, u, v } = fight();
    W(g, () => {
      expect(react(cb, u, { kind: 'attack', spend: 2 })).toBe(false); expect(reactionsUsed(cb, u)).toBe(0);
      expect(react(cb, u, { kind: 'attack', payer: v })).toBe(true); expect(reactionsUsed(cb, u)).toBe(0); expect(reactionsUsed(cb, v)).toBe(1);
      expect(react(cb, u, { kind: 'attack', payer: v })).toBe(false); // the payer has none left
    });
  });
  it('the window: an item may cancel it, and then nothing is spent', () => {
    const { g, cb, u } = fight(); const seen: any[] = []; TAP.windows = seen;
    try { W(g, () => { expect(react(cb, u, { kind: 'attack', window: { kind: 'test-cancel' } })).toBe(false); expect(reactionsUsed(cb, u)).toBe(0);
      expect(react(cb, u, { kind: 'attack', window: { kind: 'opportunity' } })).toBe(true); }); } finally { delete TAP.windows; }
    expect(seen).toEqual(['test-cancel', 'opportunity']);
  });
  it('one event, one reaction a unit (rule 3): a unit with two reactions answers one event once', () => {
    const { g, cb, u } = fight(); u.call = { cue: { r: cb.round } }; // a Cue: a second reaction
    W(g, () => {
      expect(react(cb, u, { kind: 'attack', event: 'atk1' })).toBe(true);
      expect(canReact(cb, u, 'protect')).toBe(true); expect(react(cb, u, { kind: 'protect', event: 'atk1' })).toBe(false);
      expect(react(cb, u, { kind: 'protect', event: 'atk2' })).toBe(true);
    });
  });
  it('loseReactions: what is not a reaction burns them (Dread all, Rewrite and Order one)', () => {
    const { g, cb, u } = fight(); u.call = { cue: { r: cb.round } };
    W(g, () => { loseReactions(cb, u, 'all'); expect(canReact(cb, u, 'attack')).toBe(false); expect(u.call.cue).toBeUndefined(); });
  });
  it('an old save\'s count (u.reactUsed, u.reactedRound) is read once into the cell', () => {
    const { g, cb, u, v } = fight(); u.reactUsed = { r: cb.round, n: 1 }; v.reactedRound = cb.round;
    W(g, () => { expect(reactionsUsed(cb, u)).toBe(1); expect(reactionsUsed(cb, v)).toBe(1); });
    expect(u.reactUsed).toBeUndefined(); expect(v.reactedRound).toBeUndefined();
    const w = fight(); w.u.reactUsed = { r: w.cb.round - 1, n: 1 }; W(w.g, () => expect(reactionsUsed(w.cb, w.u)).toBe(0)); // last round's: nothing
  });
});

describe('P1 rulings (rules 1.28)', () => {
  it('a reaction never triggers a reaction: while one resolves nobody can react, and it is over when fn returns', () => {
    const { g, cb, u, v, f } = fight(); let inner: any = null;
    W(g, () => {
      expect(react(cb, u, { kind: 'attack' }, () => {
        expect(cb.reacting).toEqual({ unit: u.id, kind: 'attack' });
        inner = { v: canReact(cb, v, 'protect'), f: canReact(cb, f, 'attack'), r: react(cb, v, { kind: 'protect' }) };
      })).toBe(true);
      expect(cb.reacting).toBeUndefined(); expect(canReact(cb, v, 'protect')).toBe(true);
    });
    expect(inner).toEqual({ v: false, f: false, r: false }); expect(reactionsUsed(cb, v)).toBe(0);
  });
  it('a reaction\'s attack draws no reaction: an opportunity attack\'s blow is not answered (the step it was taken on provokes nothing more)', () => {
    // the same walk, with and without a reaction already resolving: the walker's step draws the adjacent enemy's
    // opportunity attack only outside one
    const walk = (nested: boolean) => { const { g, cb, u, f } = fight(); u.pos = '3,6'; f.pos = '4,6'; cb.turn = cb.order.indexOf(u.id); u.ap = 9;
      W(g, () => { const go = () => A.moveUnit(cb, u, '1,6', g.rng, 'move'); if (nested) react(cb, pcs(g)[1], { kind: 'move' }, go); else go(); });
      return reactionsUsed(cb, f); };
    expect(walk(false)).toBe(1); expect(walk(true)).toBe(0);
  });
  it('Suppressed (the condition) forbids attacking and moving reactions, never protective ones', () => {
    expect(suppressedKinds).toEqual(['attack', 'move']); expect(condMods('suppressed').noReact).toEqual(suppressedKinds);
    const { g, cb, u, f } = fight();
    W(g, () => {
      A.applyCond(cb, g.rng, f, u, 'suppressed', 1, undefined, { skipSave: true });
      for (const k of REACT_KINDS) expect(canReact(cb, u, k), k).toBe(!suppressedKinds.includes(k));
      expect(reactBlocked(u, 'attack')).toBe('Suppressed'); expect(react(cb, u, { kind: 'protect' })).toBe(true);
    });
  });
  it('Pressure\'s Suppressed state: the same rule', () => {
    const { g, cb, f } = fight();
    W(g, () => {
      f.pressure = A.PHYS_RULES?.pressure?.suppressed ?? 3; // the meter at Suppressed
      expect(A.isSuppressed(f)).toBe(true);
      expect(canReact(cb, f, 'attack')).toBe(false); expect(canReact(cb, f, 'move')).toBe(false); expect(canReact(cb, f, 'protect')).toBe(true);
    });
  });
  it('an Answer\'s kind is its data (techniques.json `reaction`): Parry protects, Riposte attacks', () => {
    expect(A.phys.answerKind('parry')).toBe('protect'); expect(A.phys.answerKind('riposte')).toBe('attack'); expect(A.phys.answerKind('interpose')).toBe('protect');
  });
});

describe('P1 in data: limit {reaction, kind} and the trigger reaction', () => {
  beforeAll(() => addItems('relic', FIX.relics));
  afterAll(() => clearAddedItems());
  const taken = (relics: string[], twice: boolean, pre?: (g: any, u: any) => void) => {
    const g = opsFight({ relics }), u = pcs(g)[0], far = foes(g)[1]; pre?.(g, u);
    const hits: number[] = [];
    for (let i = 0; i < (twice ? 2 : 1); i++) { const hp = u.hp; W(g, () => dice(HIT, () => { far.ap = 9; g.combat.turn = g.combat.order.indexOf(far.id); A.resolveAttack(g.combat, g.rng, far, u, 'shot', null); })); hits.push(hp - u.hp); u.shield = 0; }
    return { hits, g, u };
  };
  it('an item op that is a reaction: once a round, through react() (it spends the holder\'s reaction)', () => {
    const base = taken([], true).hits, mine = taken(['test_react_brace'], true);
    expect(mine.hits[0]).toBe(Math.floor(base[0] * relic('test_react_brace').effects[0].value)); // (taken after armour: the multiplier on what landed)
    expect(mine.hits[0]).toBeLessThan(base[0]); expect(mine.hits[1]).toBe(base[1]); // the second hit: no reaction left
    expect(reactionsUsed(mine.g.combat, mine.u)).toBe(1);
  });
  it('it is protective: it still works while Suppressed', () => {
    const base = taken([], false).hits, mine = taken(['test_react_brace'], false, (g, u) => W(g, () => A.applyCond(g.combat, g.rng, foes(g)[0], u, 'suppressed', 1, undefined, { skipSave: true })));
    expect(mine.hits[0]).toBeLessThan(base[0]);
  });
  it('the trigger reaction fires inside react() with its kind (how)', () => {
    const { g, u } = taken(['test_react_brace', 'test_react_seen'], false);
    expect(u.ps?.['relic:test_react_seen']?.flags?.protected).toBe(true);
    const o = taken(['test_react_seen'], false); expect(o.u.ps?.['relic:test_react_seen']?.flags?.protected).toBeFalsy();
    void g;
  });
});
