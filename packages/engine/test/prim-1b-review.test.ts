// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1b, sub-step 0: the step 1a review's list "step 1b must add" and the lead's rulings on it (13 Nov
// 2026; docs/design/handoffs/classes-3.0-step-1a-review.md). One step key for every answer to a step (with a serial);
// every react() resolves inside its callback; always_seen in the fog and the AI; `acted` from the enemy AI; one copy of
// the patron reader and of the table's stats; P5's `via` on op condition, the witness filter `sees`, the standing aura.
// The rulings: Order's ordered act is the ally's reaction (it provokes nothing); Anchor's strike is `attack`; Drink It In
// and the helping Calls are `protect`. Fixtures: test/fixtures/classes-3.0-primitives{,-1b}.json.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems, addConditions, clearAddedConditionRows, statQuery, onHook } from '../src/effects/hooks';
import { react, maxReactions, reactionsUsed } from '../src/tactics';
import { newStep, stepEvent, visibility } from '../src/combat';
import { perceivedFoes } from '../src/illusion';
import { callReactKind, callReactWhy } from '../src/calls/core';
import { CALL } from '../src/calls/data';
import { COND_TABLE_STATS } from '../src/condtable';
import { patronIdOf } from '../src/belief';
import { A, W, pcs, foes, ALSO } from './golden/harness';
import { opsFight } from './golden/itemops';
import { physFight } from './helpers/physfight';
import CONDITIONS from '../../../data/conditions.json';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives.json', import.meta.url)), 'utf8'));
const FIX1B = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives-1b.json', import.meta.url)), 'utf8'));
const relic = (id: string) => FIX1B.relics.find((r: any) => r.id === id);
const TAP: { acted?: string[] } = {};
onHook('acted', (c: any) => { TAP.acted?.push(c.u.id + ':' + c.action); });
const SRC = (f: string) => readFileSync(fileURLToPath(new URL('../src/' + f, import.meta.url)), 'utf8');

describe('rule 3: one key for every answer to a step, with a serial', () => {
  it('stepEvent names the mover, the step\'s serial and the tile it arrives on: a unit answers a step once, whichever reaction', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0], f = foes(g)[0]; u.call = { cue: { r: cb.round } }; // two reactions
    W(g, () => {
      newStep(f); const k = stepEvent(f);
      expect(k).toMatch(new RegExp('^step:' + f.id + ':\\d+:' + f.pos + '$'));
      expect(react(cb, u, { kind: 'attack', event: k })).toBe(true);
      expect(react(cb, u, { kind: 'attack', event: stepEvent(f) })).toBe(false); // the same step: an Overwatch after an opportunity attack
      newStep(f); expect(stepEvent(f)).not.toBe(k); // the same tile walked again is another step
      expect(react(cb, u, { kind: 'attack', event: stepEvent(f) })).toBe(true);
    });
  });
  it('a walk: a unit with two reactions takes the opportunity attack and keeps its Overwatch on the same step', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0], f = foes(g)[0]; u.call = { cue: { r: cb.round } }; u.overwatch = 'shot';
    W(g, () => { f.ap = 6; A.moveUnit(cb, f, '5,6', g.rng); });
    expect(cb.log.filter((l: string) => /opportunity attack/.test(l)).length).toBe(1);
    expect(u.overwatch).toBe('shot'); // the step was answered once: the held shot waits for another step
  });
  it('every react() call passes its resolution (a lint: no react( without a callback but as a test)', () => {
    const bare: string[] = [];
    for (const f of ['combat.ts', 'magic.ts', 'calls/core.ts', 'calls/handlers.ts', 'classes/i.ts', 'classes/j.ts', 'classes/k.ts', 'classes/rev3.ts', 'perks/c.ts', 'physical/core.ts', 'effects/triggers.ts'])
      for (const line of SRC(f).split('\n')) if (/(?<![A-Za-z])react\((cb|ctx\.cb|t\.cb)\b/.test(line) && !/\}, (\(\) =>|go\)|plate\)|act\))/.test(line)) bare.push(f + ': ' + line.trim().slice(0, 90));
    expect(bare).toEqual([]);
  });
});

describe('the lead\'s rulings (rules 1.28)', () => {
  it('Order: the ordered ally\'s move is its reaction: it provokes no opportunity attack', () => {
    const f = physFight([{ skills: { authority: 3 } }, {}], [{}]);
    const a = f.pcs[1], foe = f.foes[0];
    f.put(f.pcs[0], '2,2'); f.put(a, '3,2'); f.put(foe, '4,2'); f.cb.order = [f.pcs[0].id, a.id, foe.id]; f.turn(f.pc);
    const hp = a.hp; f.act({ type: 'combat/call', unitId: f.pc.id, id: 'call.order', targetId: a.id, opt: 'move', tile: '3,4' });
    expect(f.unit(a.id).pos).toBe('3,4'); expect(reactionsUsed(f.cb, f.unit(a.id))).toBe(1);
    expect(reactionsUsed(f.cb, f.unit(foe.id))).toBe(0); expect(f.unit(a.id).hp).toBe(hp);
  });
  it('a helping Call made as a reaction protects; a hindering one is never a reaction (the integration\'s ruling)', () => {
    for (const d of Object.values(CALL) as any[]) { expect(callReactWhy(d) === null).toBe(d.kind === 'helping'); if (d.kind === 'helping') expect(callReactKind(d)).toBe('protect'); }
  });
  it('Anchor\'s strike is an attack and Drink It In protects (the source)', () => {
    expect(SRC('classes/rev3.ts')).toMatch(/react\(cb, me, \{ kind: 'attack', event: stepEvent\(u\), window: \{ kind: 'opportunity'/);
    expect(SRC('classes/i.ts')).toMatch(/react\(cb, me, \{ kind: 'protect', event: attackEvent\(\) \}, \(\) => \{\n\s+\/\/ The spell's own price/);
  });
});

describe('always_seen reaches the fog and the AI (the review\'s finding 13)', () => {
  beforeAll(() => addConditions(FIX.conditions));
  afterAll(() => clearAddedConditionRows());
  it('a unit that is always seen is in the other side\'s view and among an enemy\'s perceived targets, Hidden and far', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0]; for (const f of foes(g)) f.vision = 0.1; u.hidden = true;
    W(g, () => {
      expect(visibility(cb, 'foe').seen.has(u.id)).toBe(false); expect(perceivedFoes(cb, foes(g)[2]).includes(u)).toBe(false);
      A.applyCond(cb, g.rng, foes(g)[0], u, 'test_beacon', 2, undefined, { skipSave: true });
      expect(visibility(cb, 'foe').seen.has(u.id)).toBe(true); expect(perceivedFoes(cb, foes(g)[2]).includes(u)).toBe(true);
      expect(visibility(cb, 'pc').seen.has(u.id)).toBe(false); // its own side's view of it is unchanged (a side always has its own)
    });
  });
});

describe('`acted` from the enemy AI (finding 14)', () => {
  beforeAll(() => addItems('relic', FIX1B.relics));
  afterAll(() => clearAddedItems());
  it('an enemy\'s own action fires acted, as a player\'s does', () => {
    const p = physFight([{}], [{}]), f = p.foes[0];
    p.put(p.pc, '2,2'); p.put(f, '6,2'); p.cb.order = [p.pc.id, f.id]; p.turn(f);
    const fu = p.unit(f.id); fu.held = { perks: [], traits: [], relics: ['test_acted_foe'] };
    const seen: string[] = []; TAP.acted = seen;
    (ALSO as any).ai = true; try { W(p.g, () => A.enemyTurn(p.cb, p.g.rng)); } finally { delete TAP.acted; delete (ALSO as any).ai; } // (the golden harness skips enemy actions unless ALSO.ai)
    expect(seen.length).toBeGreaterThan(0); expect(seen.every((s) => s.startsWith(f.id + ':'))).toBe(true);
    expect(fu.ps?.['relic:test_acted_foe']?.flags?.[relic('test_acted_foe').effects[0].flag]).toBe(true);
  });
});

describe('one copy each (finding 15)', () => {
  it('the patron predicate reads belief.ts; the table\'s stats are condtable.ts\'s', () => {
    expect(SRC('effects/triggers.ts')).toMatch(/import \{ patronIdOf \} from '..\/belief'/);
    expect(SRC('faith.ts')).not.toMatch(/export function beliefOf/);
    expect(patronIdOf({ belief: { kind: 'atheist' } } as any)).toBeNull();
    for (const r of (CONDITIONS as any).items) for (const e of r.effects || []) if (e.op === 'stat_mod' && !e.when && ['defense', 'vision', 'ap'].includes(e.stat)) expect(COND_TABLE_STATS.has(e.stat)).toBe(true);
    expect(SRC('effects/triggers.ts')).not.toMatch(/new Set\(\['defense'/);
  });
});

describe('P5 extensions: `via` on op condition, the witness filter, the standing aura', () => {
  beforeAll(() => addItems('relic', FIX1B.relics));
  afterAll(() => clearAddedItems());
  it('a witness is an enemy within reach of the body with a line of sight to it, not Blinded; its save reads `via`', () => {
    const e = relic('test_witness_dread').effects[0];
    const g = opsFight({ relics: ['test_witness_dread'] }), cb = g.combat, u = pcs(g)[0], [f, far, el] = foes(g);
    el.pos = '6,6'; // within 3 of the body at 4,6
    A.applyCond(cb, g.rng, u, far, 'blinded', 2, undefined, { skipSave: true }); // blinded: no witness
    for (const x of [far, el]) x.sv = { body: -50, brain: -50, heart: -50 };
    W(g, () => { f.hp = 1; A.resolveAttack(cb, g.rng, u, f, 'melee', null, { noAp: true }); });
    expect(f.dead || f.hp <= 0).toBe(true);
    expect(A.condOn(el, e.condition)).toBe(true); expect(A.condOn(far, e.condition)).toBe(false);
  });
  it('the standing aura: an ally within reach is answered while the holder stands; nobody else', () => {
    const e = relic('test_aura_reactions').effects[0];
    const g = opsFight({ relics: ['test_aura_reactions'] }), cb = g.combat, [u, al] = pcs(g), f = foes(g)[0];
    W(g, () => {
      expect(maxReactions(al, cb)).toBe(1 + e.value); expect(maxReactions(u, cb)).toBe(1); expect(maxReactions(f, cb)).toBe(1);
      al.pos = '1,1'; expect(statQuery({ u: al, cb }, 'reactions').add).toBe(0);
      al.pos = '2,6'; u.downed = true; expect(statQuery({ u: al, cb }, 'reactions').add).toBe(0);
    });
  });
});
