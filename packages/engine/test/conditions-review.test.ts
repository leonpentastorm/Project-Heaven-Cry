// The review of engine foundations 2 (conditions), 12 Nov 2026: docs/design/proposals/2026-11-engine-review/
// conditions-review.json. One test per problem the review found that a unit test can show (the pin gaps are lines of
// test/golden/conditions.json; the lint's are in test/lint-conditions.test.ts; the validator's in tools/validate.py).
// What was done about each: docs/design/handoffs/engine-foundations-2-conditions.md, "Problems found in review".
import { describe, expect, it } from 'vitest';
import { CLASS, d20, applyCond, endCond, condOn, hideAgain, toggleProne, setBraced, type Unit } from '../src';
import { onHook } from '../src/effects/hooks';
import { fightWith, withGame } from './helpers/perkfight';

// a stand-in for an item that ends Prone the moment it lands, exactly as Shrug It Off does (classes/rev3.ts)
const TAP: { landed: string[]; shrug?: string } = { landed: [] };
onHook('cond_landed', (ctx: any) => {
  TAP.landed.push(ctx.id);
  if (TAP.shrug && ctx.t?.id === TAP.shrug && ctx.id === 'prone') { endCond(ctx.t, 'prone', ctx.cb); ctx.cb.log.push(ctx.t.name + ' shrugs it off.'); }
});
const cls = (id: string, n: number) => ({ classId: id, level: 12, attrs: { [CLASS[id].attribute]: n } });
const rngFor = (n: number) => { for (let s = 1; s < 2000000; s++) if (d20({ state: s }) === n) return s; throw new Error('no seed'); };

// problem 4 (the Fighter's own Shove telling cond_landed once) left with the move: rules 1.60 item 4621 (R3) made it
// Wind-up; everyone's Shove (2 AP) is tested in boss-holds.test.ts and actions.test.ts.

describe('problem 7: hideAgain takes the action\'s rng (it works with no game bound, and never draws the live game\'s dice)', () => {
  it('outside withGame it hides the unit as the same entry', () => {
    const f = fightWith([{}], [{}]); const u = f.unit(f.pc.id); endCond(u, 'hidden', f.cb);
    expect(hideAgain(f.cb, f.g.rng, u)).toBe(true); expect(u.hidden).toBe(true);
  });
});

describe('problem 8: dropping Prone by choice keeps a weapon Brace; being knocked down ends it', () => {
  function braced() { const f = fightWith([{}], [{}]); const u = f.unit(f.pc.id); f.turn(u); setBraced(u, true); return { f, u }; }
  it('toggleProne (drop) keeps Braced, and standing up again too', () => {
    const { f, u } = braced();
    withGame(f.g, () => toggleProne(f.cb, u)); expect([u.prone, u.braced]).toEqual([true, true]);
    withGame(f.g, () => toggleProne(f.cb, u)); expect([u.prone, u.braced]).toEqual([false, true]);
  });
  it('knocked Prone (applyCond) ends it', () => {
    const { f, u } = braced(); const foe = f.unit(f.foe.id);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, foe, u, 'prone', undefined, undefined, { skipSave: true })); expect([u.prone, u.braced]).toEqual([true, false]);
  });
});

describe('problem 2 (a ruling kept, spec item 1580): Mind Without Fog stops Heart debuffs, not boons', () => {
  function fog() { const f = fightWith([{ traits: ['mind_without_fog'] }, {}], [{}]); const u = f.unit(f.pc.id), by = f.unit(f.pcs[1].id); return { f, u, by }; }
  const put = (x: ReturnType<typeof fog>, id: string) => withGame(x.f.g, () => applyCond(x.f.cb, x.f.g.rng, x.by, x.u, id, undefined, undefined, { skipSave: true }));
  it('Shaken is stopped; Witnessed and Hopeful land', () => {
    const x = fog();
    expect(put(x, 'shaken')).toMatch(/untouched \(Mind Without Fog\)/); expect(condOn(x.u, 'shaken')).toBe(false);
    expect(put(x, 'witnessed')).toMatch(/is Witnessed/); expect(put(x, 'hopeful')).toMatch(/is Hopeful/);
  });
});

describe('problem 1 (a correction kept, spec items 1512 and 1581): Bleeding from a technique lasts 3 rounds', () => {
  it('the same call every technique makes (no rounds given) gives 3', () => {
    const f = fightWith([{}], [{}]); const u: Unit = f.unit(f.foe.id);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.unit(f.pc.id), u, 'bleeding', undefined, undefined, { skipSave: true }));
    expect(u.bleed).toBe(3);
  });
});
