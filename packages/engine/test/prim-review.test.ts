// Classes 3.0 step 1a review (rules 1.28, "a reaction never triggers a reaction"): a protective reaction that moves the
// blow onto the reactor (Brace's Interpose) resolves that blow as part of the reaction. Before the review the
// interposer's own hit landed after react() returned, outside cb.reacting, so anything that answers a hit (a data
// reaction on `taking`, another Interpose, a link) could answer the Interpose: a reaction triggered by a reaction.
// @ts-nocheck (reads a fixture through node's fs)
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveAttack, attackEvent, type Unit } from '../src/combat';
import { onHook, addItems, clearAddedItems } from '../src/effects/hooks';
import { react, canReact, reactionsUsed, maxReactions } from '../src/tactics';
import { targetsProblem, sourceOf } from '../src/effects/triggers';
import { A, W, dice, HIT, pcs, foes } from './golden/harness';
import { opsFight } from './golden/itemops';
import { fightWith, withGame } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes();
const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives.json', import.meta.url)), 'utf8'));

const seen: { t: string; reacting: boolean }[] = [];
let watch: string | null = null;
onHook('damage_in', (ctx: any, cb: any) => { if (watch && ctx.phase === 'reduce' && ctx.t?.id === watch) seen.push({ t: ctx.t.id, reacting: !!cb.reacting }); });

describe('review fixes: react() edges', () => {
  it('a reaction paid by another (payer) or already paid (spend 0) still needs a reactor that can react (not Stunned)', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0], v = pcs(g)[1], f = foes(g)[0];
    W(g, () => {
      A.applyCond(cb, g.rng, f, u, 'stunned', 1, undefined, { skipSave: true });
      expect(maxReactions(u, cb)).toBe(0);
      expect(canReact(cb, u, 'attack', 0)).toBe(false);
      expect(react(cb, u, { kind: 'attack', payer: v })).toBe(false); expect(reactionsUsed(cb, v)).toBe(0);
    });
  });
  it('a data reaction answers the attack it is in once (rule 3: the attack is its event)', () => {
    addItems('relic', FIX.relics);
    try {
      const g = opsFight({ relics: ['test_react_brace'] }), cb = g.combat, u = pcs(g)[0], far = foes(g)[1];
      u.call = { cue: { r: cb.round } }; // two reactions this round
      const hp0 = u.hp; let first: boolean | null = null;
      onHook('attack_roll', (ctx: any) => { if (first === null && ctx.tgt === u) first = react(cb, u, { kind: 'protect', event: attackEvent() }); });
      W(g, () => dice(HIT, () => { far.ap = 9; cb.turn = cb.order.indexOf(far.id); A.resolveAttack(cb, g.rng, far, u, 'shot', null); }));
      expect(first).toBe(true);
      expect(hp0 - u.hp).toBeGreaterThan(0);
      expect(cb.log.some((l: string) => /braces for it/.test(l))).toBe(false); // the same attack: not answered twice
      expect(reactionsUsed(cb, u)).toBe(1);
    } finally { clearAddedItems(); }
  });
  it('event:<field> reads the damage\'s source too (an attack\'s ambush is ctx.src.ambush on `dealing`: the Break\'s term)', () => {
    const ev: any = { ctx: { src: { ambush: true, crit: false } } };
    expect(sourceOf(ev, 'event:ambush')).toBe(1); expect(sourceOf(ev, 'event:crit')).toBe(0);
    expect(sourceOf({ ctx: { ambush: false, src: { ambush: true } } } as any, 'event:ambush')).toBe(0); // the payload's own field first
  });
  it('targets: a burst or an aura needs `within` (with none it was a set of nobody)', () => {
    expect(targetsProblem({ shape: 'burst', side: 'foe' })).toMatch(/within/);
    expect(targetsProblem({ shape: 'aura' })).toMatch(/within/);
    expect(targetsProblem({ side: 'foe' })).toBeNull(); // the whole field
  });
});

describe('rules 1.28: a protective reaction resolves inside react()', () => {
  it('Brace\'s Interpose: the hit the Defender takes for the ally lands while the reaction resolves', () => {
    const sig = SIG('defender');
    const f = fightWith([{ classId: 'defender', level: 5, skills: { ...Object.fromEntries(sig.map((s: string) => [s, 1])), durability: 3 } }, {}], [{}]);
    const [d, ally] = f.pcs; const at = (u: Unit, x: number) => { f.unit(u.id).pos = x + ',2'; };
    at(d, 3); at(ally, 4); at(f.foe, 8);
    const u = f.turn(d); f.act({ unitId: u.id, type: 'combat/perk', id: 'class:defender.brace' });
    const foe = f.unit(f.foe.id); foe.attack = 60; seen.length = 0; watch = d.id;
    try { withGame(f.g, () => resolveAttack(f.cb, f.g.rng, foe, f.unit(ally.id), 'shot', null, { noAp: true })); } finally { watch = null; }
    expect(f.cb.log.some((l) => /interposes for/.test(l))).toBe(true);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((x) => x.reacting)).toBe(true);
    expect(f.cb.reacting).toBeUndefined();
  });
});
