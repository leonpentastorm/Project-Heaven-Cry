// @ts-nocheck (replaces two handlers with recording ones)
// dispatch() (physical/core.ts) calls a unit's Answers on a hook, in the registry's order, each with the hand that has
// it usable. It works out what the unit has usable ONCE per unit and AGAIN AFTER EACH OF ITS REACTIONS, because a
// reaction may change what the unit holds or can use. The contract is: the same handlers are called, with the same
// hand, as if every Answer were asked for afresh in turn (which is how dispatch was written first).
//
// With the five Answers of rules 1.13 nothing in play can show a stale answer: the only two on one hook are Parry then
// Interpose (damage_in), Parry changes nothing a unit holds, and answer() asks canAnswer() again before it spends the
// reaction. So no whole-game replay can pin the re-reading; this file does, with two recording handlers put in the
// place of Riposte and Parry (the registry lets a test replace a handler). The first one's "reaction" changes what the
// unit holds; the second must then be called with the hand that has it NOW, or not at all.
// Checked by mutation: without the `sets = null` after a handler ran, the two "after a reaction" tests fail.
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveAttack } from '../src';
import { technique } from '../src/physical/core';
import { physFight, rig } from './helpers/physfight';

// What the first handler does to the unit when it is called (set per test), and what was called, in order.
let FIRST: ((u: any) => void) | null = null; const CALLS: [string, string, string][] = [];
// Riposte is registered before Parry (melee/answers.ts), so on a hook both listen to, Riposte's handler is called first.
// A replacement keeps its place in the registry. Both listen on damage_in here (the real Riposte listens on on_miss).
technique({ id: 'riposte', run: () => 'A reaction.', react: { damage_in(ctx: any, t: any) { if (ctx.phase !== 'reduce' || ctx.t !== t.u) return; CALLS.push(['riposte', t.hand, t.weaponId]); FIRST?.(t.u); } } } as any);
technique({ id: 'parry', run: () => 'A reaction.', react: { damage_in(ctx: any, t: any) { if (ctx.phase !== 'reduce' || ctx.t !== t.u) return; CALLS.push(['parry', t.hand, t.weaponId]); } } } as any);

beforeEach(() => { rig(null); FIRST = null; CALLS.length = 0; });
/** A PC with a sabre (and maybe an off-hand weapon) that has both Answers ready; an enemy beside it, whose turn it is. */
function fight(off?: string) {
  const f = physFight([{ weapon: 'sabre', known: ['riposte', 'parry'], ...(off ? { off } : {}), skills: { athletics: 4, raw_power: 4 } }], [{ at: 'D5', tier: 'elite', weapon: 'sabre' }]);
  f.put(f.pc, 'C5'); f.turn(f.foe); rig({ hit: true, die: 10 });
  return f;
}
const swing = (f: any) => { CALLS.length = 0; f.bound(() => resolveAttack(f.cb, f.g.rng, f.foe, f.unit(f.pc.id), 'melee', null, { noAp: true })); return CALLS.map((c) => c.join(' ')); };

describe('dispatch: a unit\'s Answers on one hook, each with the hand that has it usable now', () => {
  it('both Answers of a unit are called, in the registry\'s order, with the main hand', () => {
    expect(swing(fight())).toEqual(['riposte main sabre', 'parry main sabre']);
  });
  it('after a reaction that leaves the unit nothing to answer with, the next Answer is not called', () => {
    const f = fight();
    FIRST = (u) => { u.weapon = 'service_pistol'; }; // the sabre is gone from the hand: a pistol has no melee Answer
    expect(swing(f)).toEqual(['riposte main sabre']);
    // and with the sabre back, both again (nothing was remembered from the swing before)
    FIRST = null; f.unit(f.pc.id).weapon = 'sabre';
    expect(swing(f)).toEqual(['riposte main sabre', 'parry main sabre']);
  });
  it('after a reaction that moves the Answer to the other hand, the next Answer is called with that hand and its weapon', () => {
    const f = fight('combat_knife');
    expect(swing(f)).toEqual(['riposte main sabre', 'parry main sabre']); // usable in both hands: the main hand's
    FIRST = (u) => { u.weapon = 'service_pistol'; }; // only the knife in the off hand can parry now
    expect(swing(f)).toEqual(['riposte main sabre', 'parry off combat_knife']);
  });
  it('a unit that falls in its own reaction answers nothing more; the next unit is still asked', () => {
    const f = physFight([{ weapon: 'sabre', known: ['riposte', 'parry'] }, { weapon: 'sabre', known: ['riposte', 'parry'] }], [{ at: 'D5', tier: 'elite', weapon: 'sabre' }]);
    f.put(f.pc, 'C5'); f.put(f.pcs[1], 'C6'); f.turn(f.foe); rig({ hit: true, die: 10 });
    FIRST = (u) => { u.downed = true; };
    expect(swing(f)).toEqual(['riposte main sabre']);
  });
});
