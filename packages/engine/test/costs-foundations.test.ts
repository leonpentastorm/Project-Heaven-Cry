// Engine foundations 2 (docs/design/handoffs/engine-foundations-2-costs.md): the cost primitive (effects/cost.ts) and
// the counter primitive (effects/uses.ts), each rule pinned once. The numbers of every action are held by the costs
// tables (test/golden/costs.ts); this file holds what a table can't say: how the primitive behaves at its edges.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import {
  price, priced, costOf, hasCost, whyNot, canPay, pay, refund, spend, needs, poolWhyNot, grantAp, loseAp, setAp, freely, withAp, apFor, creditFor, lend, settleCredit,
  resLeft, RESOURCES, AP_MAX, previewAttack, moveOptions, uses, SCOPES, scopeOf, register, perkActionsFor, previewPerkAction, basicActions, previewAction, loadMagazine, enemyTurn, apply, type Unit,
  apMeter, actionName, resWhyNot, weaponActions, reloadAp, analyzeCost, ventAp, coreAp, stimAp, basicCost, runPerkAction,
} from '../src';
import { fightWith, storyWith, withGame, onlyHandlers } from './helpers/perkfight';
import ACTIONS from '../../../data/actions.json';

const fight = (spec: any = {}) => { const f = fightWith([spec, {}], [{ at: 'F6', classic: true }]); f.turn(f.pc); return f; };

describe('price(): one way to say what an action costs', () => {
  it('reads the base from data/actions.json (a row, or `costs`), and throws on an action the data does not have', () => {
    for (const a of (ACTIONS as any).items) if (typeof a.ap === 'number') expect(costOf(a.id), a.id).toBe(a.ap);
    for (const [id, v] of Object.entries((ACTIONS as any).costs) as [string, any][]) expect(costOf(id), id).toBe(v.ap);
    expect(costOf('stim', 'ap_downed')).toBe(2); expect(hasCost('move')).toBe(false);
    expect(() => costOf('no_such_action')).toThrow(/data\/actions\.json/);
    const f = fight(); expect(withGame(f.g, () => price({ cb: f.cb, u: f.pc }, 'door').ap)).toBe((ACTIONS as any).items.find((a: any) => a.id === 'door').ap);
  });
  it('the one `cost` hook reaches every priced action: a built-in verb, an attack\'s pipeline (priced), an item\'s action', () => {
    const seen: string[] = [];
    onlyHandlers([{ id: 'chain_smoker', kind: 'trait', on: { cost: (ctx: any, h: any) => { if (ctx.u !== h.u) return; seen.push(ctx.action); if (ctx.action === 'prone') ctx.ap -= 1; if (ctx.action === 'brace') ctx.min = 3; if (ctx.action === 'door') ctx.free = true; } } } as any], () => {
      const f = fight({ traits: ['chain_smoker'] }), u = f.pc;
      withGame(f.g, () => {
        expect(price({ cb: f.cb, u }, 'prone').ap).toBe(costOf('prone') - 1);           // a discount
        expect(price({ cb: f.cb, u }, 'brace').ap).toBe(3);                               // a floor an item raises
        expect(price({ cb: f.cb, u }, 'door')).toMatchObject({ ap: 0, free: true });      // free
        expect(priced({ cb: f.cb, u }, 'evoke', 1.6, { charge: 2 })).toMatchObject({ ap: 1.6, res: { charge: 2 } });
        expect(price({ u }, 'prone').ap).toBe(costOf('prone') - 1);                       // no fight in reach: the unit's own items still answer
      });
      // the pipelines with a price of their own end in the same hook: an attack, a move, a technique, a Call
      withGame(f.g, () => { previewAttack(f.cb, u, f.foe, 'shot'); moveOptions(f.g, f.cb, u.id, 'move'); });
      expect(seen).toEqual(expect.arrayContaining(['prone', 'brace', 'door', 'evoke', 'attack', 'move']));
      // and the reducer takes what price() said: Prone for 0 AP
      expect(previewAction(f.g, { type: 'combat/prone', unitId: u.id } as any, 'host').ap).toBe(0);
    });
  });
  it('a verb that priced a literal before is a cost site now: data alone can change it (review 1, F3)', () => {
    // {"op":"action_cost","action":"prone","value":-1} on a trait, with no code
    const f = fight(), u = f.pc;
    expect(withGame(f.g, () => price({ cb: f.cb, u }, 'prone').ap)).toBe(1);
    for (const site of ['prone', 'door', 'brace', 'load', 'pickup', 'scuff', 'syphon', 'steady', 'feed', 'song', 'search', 'pull_free', 'overwatch', 'attempt']) expect(withGame(f.g, () => price({ cb: f.cb, u }, site, 2).ap), site).toBe(2);
  });
});

describe('whyNot() / canPay(): one refusal sentence', () => {
  it('"Needs N AP.", "Needs N charge.": the resource\'s own word; what the action declares is asked before the AP', () => {
    const f = fight({ kit: 'sigil', classId: 'mage' }), u = f.pc; u.ap = 1; u.mg!.charge = 1;
    expect(whyNot(f.cb, u, 2)).toBe('Needs 2 AP.'); expect(whyNot(f.cb, u, 1)).toBeNull(); expect(canPay(f.cb, u, 0)).toBe(true);
    expect(whyNot(f.cb, u, { action: 'x', ap: 1, res: { charge: 3 }, labels: [], free: false })).toBe('Needs 3 charge.');
    expect(whyNot(f.cb, u, { action: 'x', ap: 5, res: { charge: 3 }, labels: [], free: false })).toBe('Needs 3 charge.');
    expect(whyNot(f.cb, u, { action: 'x', ap: 5, res: { charge: 1 }, labels: [], free: false })).toBe('Needs 5 AP.');
    expect(needs(2)).toBe('Needs 2 AP.'); expect(needs(2, 'AP', 1)).toBe('Needs 2 AP (1 left).');
    expect(poolWhyNot(1, 2)).toBe('Needs 2 AP.'); expect(poolWhyNot(1, 2, { left: true })).toBe('Needs 2 AP (1 left).'); expect(poolWhyNot(2, 2)).toBeNull();
  });
  it('every resource of data/actions.json can be read on a unit that has it and is 0 on one that has not', () => {
    const f = fight(), u = f.pc;
    for (const id of Object.keys(RESOURCES)) expect(typeof resLeft(u, id), id).toBe('number');
    expect(() => resLeft(u, 'gold_teeth')).toThrow(/Unknown resource/);
  });
});

describe('pay(), refund(), spend(): nothing else takes AP or a resource', () => {
  it('pay takes the AP (in tenths) and each resource; refund gives them back', () => {
    const f = fight({ kit: 'sigil', classId: 'mage' }), u = f.pc; u.ap = 6; u.mg!.charge = 9;
    const p = { action: 'draw', ap: 0.6, res: { charge: 2 }, labels: [], free: false };
    pay(f.cb, u, p); expect(u.ap).toBe(5.4); expect(u.mg!.charge).toBe(7);
    pay(f.cb, u, 0.6); pay(f.cb, u, 0.6); expect(u.ap).toBe(4.2); // no 4.200000000000001
    refund(f.cb, u, p); expect(u.ap).toBe(4.8); expect(u.mg!.charge).toBe(9);
    expect(spend(u, 'charge', 4)).toBe(true); expect(u.mg!.charge).toBe(5); expect(spend(u, 'charge', 6)).toBe(false); expect(u.mg!.charge).toBe(5);
  });
  it('an item action declares what it costs (`res`): the runtime refuses and pays, run() subtracts nothing', () => {
    onlyHandlers([{ id: 'chain_smoker', kind: 'trait', actions: [{ id: 'burn', label: 'Burn', scope: ['combat'], target: 'none', ap: 2, res: { charge: 3 }, run: () => null }] } as any], () => {
      const f = fight({ kit: 'sigil', classId: 'mage', traits: ['chain_smoker'] }), v = f.pc, c = f.g.characters[v.charId!]; v.mg!.charge = 2;
      const x = { u: v, c, cb: f.cb, g: f.g };
      expect(withGame(f.g, () => perkActionsFor(x, 'combat').find((e) => e.id === 'trait:chain_smoker')!.why)).toBe('Needs 3 charge.');
      v.mg!.charge = 5;
      expect(withGame(f.g, () => previewPerkAction(x, 'trait:chain_smoker', {}, 'combat').ok)).toBe(true);
      const g2 = apply(f.g, { type: 'combat/perk', unitId: v.id, id: 'trait:chain_smoker' } as any, 'host'), u2 = g2.combat!.units.find((y) => y.id === v.id)!;
      expect(u2.mg!.charge).toBe(2); expect(u2.ap).toBe(v.ap - 2);
    });
  });
});

describe('AP that is given, lost or set', () => {
  it('grantAp never passes the ceiling (or its own max); loseAp never goes under 0; setAp sets', () => {
    const f = fight(), u = f.pc; u.ap = 8;
    expect(grantAp(f.cb, u, 3)).toBe(AP_MAX - 8); expect(u.ap).toBe(AP_MAX);
    expect(grantAp(f.cb, u, 2, { max: Infinity })).toBe(2); expect(u.ap).toBe(AP_MAX + 2);
    expect(loseAp(u, 20)).toBe(AP_MAX + 2); expect(u.ap).toBe(0);
    setAp(u, 4); expect(u.ap).toBe(4);
  });
  it('freely(): an inner action costs nothing and leaves the AP as it was; withAp(): a dry run at another AP', () => {
    const f = fight(), u = f.pc; u.ap = 1;
    expect(freely(u, () => { expect(canPay(f.cb, u, 9)).toBe(true); pay(f.cb, u, 5); return 'done'; })).toBe('done'); expect(u.ap).toBe(1);
    expect(withAp(u, 6, () => u.ap)).toBe(6); expect(u.ap).toBe(1);
  });
  it('freely(): the inner action draws on no credit either: the action it is part of still finds its Brief', () => {
    const f = fight(), u = f.pc; u.ap = 2; u.apGained = 0; u.apTurnTotal = 6; u.call = { brief: { cuts: [1] } } as any;
    const loan = lend(f.cb, u, { type: 'combat/reload', hand: 'both' })!; (f.cb as any).acting = true;
    freely(u, () => pay(f.cb, u, 2));                                    // the inner reload of "Reload both"
    expect(loan.briefUsed).toBe(0); expect(u.ap).toBe(2);
    expect(whyNot(f.cb, u, 3)).toBeNull(); expect(pay(f.cb, u, 3)).toBe(2); expect(u.ap).toBe(0); // the outer price: 1 from the Brief, 2 of its own
    delete (f.cb as any).acting; expect(settleCredit(f.cb, loan)).toMatchObject({ brief: 1, spent: 3 });
  });
});

describe('credit: Encore\'s repeat and a Brief\'s cut are drawn on by pay(), never added to the AP', () => {
  it('a Brief pays the first AP of the next action; the unit\'s AP is never inflated', () => {
    const f = fight(), u = f.pc; u.ap = 2; u.apGained = 0; u.apTurnTotal = 6; u.call = { brief: { cuts: [1] } } as any;
    expect(creditFor(u, { type: 'combat/prone' }, f.cb)).toBe(1); expect(apFor(f.cb, u, { type: 'combat/prone' })).toBe(3);
    expect(apFor(f.cb, u)).toBe(2); // with no action named (an enemy's turn, a helper): its own AP only, so nothing is promised that pay() would not find
    const loan = lend(f.cb, u, { type: 'combat/prone' })!; (f.cb as any).acting = true;
    expect(u.ap).toBe(2);                                   // nothing lent into the AP
    expect(whyNot(f.cb, u, 3)).toBeNull(); expect(whyNot(f.cb, u, 4)).toBe('Needs 4 AP.');
    expect(pay(f.cb, u, 3)).toBe(2); expect(u.ap).toBe(0);  // 1 from the Brief, 2 of its own
    delete (f.cb as any).acting;
    expect(settleCredit(f.cb, loan)).toMatchObject({ brief: 1, encore: 0, spent: 3 }); expect((f.cb as any).credit).toBeUndefined();
  });
  it('through the reducer: a briefed Prone costs 0 of the unit\'s AP, the Brief is used, and it counts in the turn\'s +3', () => {
    const f = fight(), u = f.pc; u.ap = 6; u.apGained = 0; u.apTurnTotal = 6; u.call = { brief: { cuts: [1] } } as any;
    const g2 = apply(f.g, { type: 'combat/prone', unitId: u.id } as any, 'host'), v = g2.combat!.units.find((y) => y.id === u.id)!;
    expect(v.ap).toBe(6); expect(v.call?.brief).toBeUndefined(); expect(v.apGained).toBe(1);
    expect(g2.combat!.log.join('\n')).toMatch(/Briefed: that cost .* 1 AP less/);
  });
  it('AP gained inside a credited action is kept (the old loan took it back; spec item 1522)', () => {
    const f = fight(), u = f.pc; u.ap = 3; u.faith = { encore: { key: 'combat/prone', ap: 1 } } as any;
    const loan = lend(f.cb, u, { type: 'combat/prone' })!; (f.cb as any).acting = true;
    pay(f.cb, u, 1); grantAp(f.cb, u, 2); delete (f.cb as any).acting;
    expect(settleCredit(f.cb, loan)).toMatchObject({ encore: 1, spent: 1, hadEncore: true }); expect(u.ap).toBe(5);
  });
});

describe('two bugs found by reading, fixed by going through the primitive', () => {
  it('Load with AP in tenths never spends more AP than the unit has (it loaded for the next whole AP)', () => {
    const f = fight({ weapon: 'hellraiser_service_rifle' }), u = f.pc; u.ap = 1.4; u.mags = [0, 0]; u.loose = 30;
    expect(withGame(f.g, () => loadMagazine(f.cb, u))).toBeNull(); expect(u.ap).toBe(0.4); expect(u.mags[0] + u.mags[1]).toBe(5);
  });
  it('an enemy asks its weapon\'s own reload price, not a typed 2 AP (a 1 AP reload with 1 AP; a 3 AP reload not with 2)', () => {
    // Review: the first version of this test only said "the ammo stays 0", true with or without the fix. What can be
    // seen: a quick-release magazine reloads for 1 AP, and an enemy with 1 AP left now does it (the typed 2 refused it).
    const quick = (ap: number) => { const f = fightWith([{}], [{ at: 'F6', weapon: 'hellraiser_service_rifle', classic: true }]), e = f.foe; f.cb.round = 2; f.turn(e); e.mods = ['mod_quick_release']; e.ap = ap; e.ammo = 0;
      expect(withGame(f.g, () => reloadAp(e, f.cb))).toBe(1); withGame(f.g, () => enemyTurn(f.cb, f.g.rng)); return e; };
    { const e = quick(1); expect(e.ammo).toBeGreaterThan(0); expect(e.ap).toBe(0); }
    // The breacher tube reloads for 3 AP: with 2 it is not tried, with 3 it is done. (No shipped enemy gets here: a gun
    // loaded round by round has no spare magazine, so its bearer counts as dry and never asks. This one is given one.)
    const tube = (ap: number) => { const f = fightWith([{}], [{ at: 'F6', weapon: 'breacher_tube', classic: true }]), e = f.foe; f.cb.round = 2; f.turn(e); e.ap = ap; e.ammo = 0; e.mags = [1]; e.loose = 2;
      expect(withGame(f.g, () => reloadAp(e, f.cb))).toBe(3); withGame(f.g, () => enemyTurn(f.cb, f.g.rng)); return e; };
    expect(tube(2).ammo).toBe(0); { const e = tube(3); expect(e.ammo).toBe(1); expect(e.ap).toBe(0); }
  });
});

describe('uses(): limits, firsts, per-target counters and cooldowns in one store', () => {
  it('READING a counter writes nothing: not even the unit\'s empty bag (review 4 found it with deep-equal tests)', () => {
    const f = fight(), u = f.pc; delete u.uses; const c = f.g.characters[u.charId!]; delete (c as any).uses; delete (f.g.story as any).ps;
    const h = { key: 'perk:x', u, c, cb: f.cb, g: f.g }, before = JSON.stringify([u, c, f.g.story]);
    for (const s of Object.keys(SCOPES) as any[]) { uses(h).used(s); uses(h).left(s, 2); }
    uses(h).had('kill'); uses(h).coolLeft(3); uses(h).ready(3); uses(h).cooledAt(); uses(h).on(f.foe).left('per_round');
    uses({ key: 'perk:x', c, g: f.g }).left('per_turn'); uses({ key: 'perk:x', c, g: f.g }).coolLeft(2); // the story's side too
    expect(JSON.stringify([u, c, f.g.story])).toBe(before); expect(u.uses).toBeUndefined();
  });
  it('take / left / refund by scope; a new round frees a round\'s and a turn\'s use, not a fight\'s', () => {
    const f = fight(), u = f.pc, h = { key: 'perk:x', u, cb: f.cb, g: f.g };
    expect(uses(h).take('per_round')).toBe(true); expect(uses(h).take('per_round')).toBe(false); expect(uses(h).left('per_round')).toBe(0);
    expect(uses(h).take('per_turn', 2)).toBe(true); expect(uses(h).take('per_turn', 2)).toBe(true); expect(uses(h).take('per_turn', 2)).toBe(false);
    expect(uses(h).take('per_combat')).toBe(true); uses(h).refund('per_turn'); expect(uses(h).left('per_turn', 2)).toBe(1);
    f.cb.round += 1;
    expect(uses(h).left('per_round')).toBe(1); expect(uses(h).left('per_turn', 2)).toBe(2); expect(uses(h).left('per_combat')).toBe(0);
  });
  it('first(): "the first kill of the fight" is true once; on(target): each target has its own count', () => {
    const f = fight(), u = f.pc, h = { key: 'perk:x', u, cb: f.cb, g: f.g };
    expect(uses(h).had('kill')).toBe(false); expect(uses(h).first('kill')).toBe(true); expect(uses(h).first('kill')).toBe(false); expect(uses(h).had('kill')).toBe(true);
    expect(uses(h).first('hit', 'per_round')).toBe(true); f.cb.round += 1; expect(uses(h).first('hit', 'per_round')).toBe(true);
    expect(uses(h).on(f.foe).take('per_round')).toBe(true); expect(uses(h).on(f.foe).take('per_round')).toBe(false); expect(uses(h).on(f.pcs[1]).take('per_round')).toBe(true);
  });
  it('a cooldown: once every N rounds, counted from the round it was stamped with', () => {
    const f = fight(), u = f.pc, h = { key: 'perk:x', u, cb: f.cb, g: f.g }; f.cb.round = 2;
    expect(uses(h).ready(3)).toBe(true); expect(uses(h).cool(3)).toBe(true); expect(uses(h).cooledAt()).toBe(2);
    expect(uses(h).cool(3)).toBe(false); expect(uses(h).coolLeft(3)).toBe(3);
    f.cb.round = 4; expect(uses(h).coolLeft(3)).toBe(1); f.cb.round = 5; expect(uses(h).ready(3)).toBe(true); expect(uses(h).cool(3)).toBe(true);
    expect(uses(h).coolLeft(3, undefined, 7)).toBe(1); // "would it be ready for something that lands in round 7?"
    uses(h).uncool(); expect(uses(h).ready(3)).toBe(true); expect(uses(h).cooledAt()).toBeNull();
    expect(uses(h).cool(2, h.key + '#other')).toBe(true); expect(uses(h).ready(2)).toBe(true); // keys are apart
  });
  it('the reset points are one table: every scope says when it is fresh and where it lives', () => {
    for (const [id, row] of Object.entries(SCOPES)) { expect(row.fresh, id).toBeTruthy(); expect(['unit', 'story', 'character']).toContain(row.fight); expect(['unit', 'story', 'character']).toContain(row.map); }
    expect(scopeOf('once_per_turn')).toBe('per_turn'); expect(scopeOf('per_fight')).toBe('per_combat'); expect(scopeOf('cooldown')).toBe('at_will'); // data never names the cooldown scope: an item asks cool(turns)
    // a scene's use is the character's and outlives the fight's unit
    const f = fight(), u = f.pc, c = f.g.characters[u.charId!], h = { key: 'perk:x', u, c, cb: f.cb, g: f.g };
    uses(h).take('per_scene'); expect(Object.keys(c.uses || {})).toContain('perk:x|per_scene'); expect(Object.keys(u.uses || {})).not.toContain('perk:x|per_scene');
  });
  void register; void basicActions;
});

// ---------------------------------------------------------------------------------------------------------------------
// The review of engine foundations 2 (hand-off, "Problems found in review and what was done"): each problem as a test
// that failed before its fix. The credit, enemy and cooldown TABLES are test/golden-costs-review.test.ts.
describe('review: an action under a Brief or an Encore pays as the same action without one, less the credit', () => {
  const two = () => { const f = fightWith([{ weapon: 'service_pistol' }, {}], [{ at: 'F6', classic: true }]); f.turn(f.pc); const u = f.pc; u.offWeapon = 'service_pistol'; u.offAmmo = 0; u.ammo = 1; u.mags = [8, 8, 8]; (f.g.characters[u.charId!] as any).offHand = { id: 'service_pistol' }; return f; };
  const after = (g: any, id: string) => g.combat!.units.find((y: Unit) => y.id === id)!;
  it('problem 1: a Briefed "Reload both" (3 AP) takes 2 from the unit, never more than it has', () => {
    for (const [ap, left] of [[2, 0], [3, 1], [6, 4]]) {
      const f = two(), u = f.pc; u.ap = ap; u.apGained = 0; u.apTurnTotal = ap; u.call = { brief: { cuts: [1] } } as any;
      const g2 = apply(f.g, { type: 'combat/reload', unitId: u.id, hand: 'both' } as any, 'host'), v = after(g2, u.id);
      expect(v.ap, 'from ' + ap).toBe(left); expect(v.ammo).toBe(8); expect(v.offAmmo).toBe(8); expect(v.call?.brief).toBeUndefined();
    }
    const f = two(), u = f.pc; u.ap = 1; u.apGained = 0; u.apTurnTotal = 1; u.call = { brief: { cuts: [1] } } as any;
    expect(() => apply(f.g, { type: 'combat/reload', unitId: u.id, hand: 'both' } as any, 'host')).toThrow(/Needs 3 AP/);
  });
  it('problem 1: an Encore of "Reload both" pays its 2 AP of it; the third is the unit\'s', () => {
    const f = two(), u = f.pc; u.ap = 1; u.faith = { encore: { key: 'combat/reload:both', ap: 2, started: true } } as any;
    const v = after(apply(f.g, { type: 'combat/reload', unitId: u.id, hand: 'both' } as any, 'host'), u.id);
    expect(v.ap).toBe(0); expect(v.offAmmo).toBe(8); expect(v.faith?.encore).toBeUndefined();
  });
  it('problem 2: a Briefed Load loads for the AP the action can draw on (the unit\'s and the Brief\'s), never 0 rounds', () => {
    const load = (ap: number) => { const f = fightWith([{ weapon: 'hellraiser_service_rifle' }, {}], [{ at: 'F6', classic: true }]); f.turn(f.pc); const u = f.pc; u.ap = ap; u.mags = [0, 0]; u.loose = 30; u.apGained = 0; u.apTurnTotal = ap; u.call = { brief: { cuts: [1] } } as any;
      return after(apply(f.g, { type: 'combat/load', unitId: u.id } as any, 'host'), u.id); };
    { const v = load(0); expect(v.mags![0] + v.mags![1]).toBe(5); expect(v.ap).toBe(0); expect(v.call?.brief).toBeUndefined(); }
    { const v = load(2); expect(v.mags![0] + v.mags![1]).toBe(15); expect(v.ap).toBe(0); }
  });
  it('problem 2: what an action took in all is read with apMeter (a credit pays first, so `ap0 - u.ap` leaves it out); a refund goes back to the credit', () => {
    const f = fight(), u = f.pc; u.ap = 4; u.apGained = 0; u.apTurnTotal = 4; u.call = { brief: { cuts: [1] } } as any;
    const loan = lend(f.cb, u, { type: 'combat/perk', id: 'x' })!; (f.cb as any).acting = true;
    const taken = apMeter(f.cb, u); pay(f.cb, u, 3);
    expect(u.ap).toBe(2); expect(taken()).toBe(3);                     // 1 of the Brief's, 2 of its own
    refund(f.cb, u, 3); expect(u.ap).toBe(4); expect(loan.briefUsed).toBe(0); expect(taken()).toBe(0); // all of it back where it came from: the Brief is not used up
    pay(f.cb, u, 1); delete (f.cb as any).acting;
    refund(f.cb, u, 1); expect(u.ap).toBe(5);                           // the action is over: a later refund (a ruling) is the unit's
    settleCredit(f.cb, loan);
  });
});

describe('review, problem 3: in a fight every price passes the fight, so another unit\'s item hears the `cost` hook', () => {
  const FREE = ['prone', 'reload', 'analyze', 'stim', 'stabilise', 'vent', 'swap_core', 'brace', 'load', 'clear_jam', 'field_repair', 'overwatch', 'throw', 'reload_both'];
  const ally = { id: 'chain_smoker', kind: 'trait', on: { cost: (ctx: any, h: any) => { if (ctx.u && ctx.u !== h.u && ctx.u.side === h.u.side && FREE.includes(ctx.action)) ctx.free = true; } } } as any;
  it('the action: an ally\'s item makes Prone AND Reload free (Reload was priced without the fight and still cost 2)', () => {
    onlyHandlers([ally], () => {
      const f = fightWith([{ weapon: 'hellraiser_service_rifle' }, { traits: ['chain_smoker'] }], [{ at: 'F6', classic: true }]); f.turn(f.pc); const u = f.pc; u.ap = 6; u.ammo = 1;
      const at = (g: any) => g.combat!.units.find((y: Unit) => y.id === u.id)!;
      expect(at(apply(f.g, { type: 'combat/prone', unitId: u.id } as any, 'host')).ap).toBe(6);
      const r = at(apply(f.g, { type: 'combat/reload', unitId: u.id } as any, 'host')); expect(r.ap).toBe(6); expect(r.ammo).toBeGreaterThan(1);
    });
  });
  it('the helper prices and the weapon\'s rows, given the fight: reload, analyze, a stim, vent, a core change, Overwatch', () => {
    onlyHandlers([ally], () => {
      const f = fightWith([{ weapon: 'hellraiser_service_rifle', kit: 'sigil', classId: 'mage' }, { traits: ['chain_smoker'] }], [{ at: 'F6', classic: true }]); f.turn(f.pc); const u = f.pc, cb = f.cb;
      withGame(f.g, () => {
        expect([reloadAp(u, cb), analyzeCost(u, cb), ventAp(u, cb), coreAp(u, cb), stimAp(u, f.pcs[1], false, cb), stimAp(u, { ...f.pcs[1], downed: true } as Unit, false, cb)]).toEqual([0, 0, 0, 0, 0, 0]);
        const rows = weaponActions(u, cb);
        for (const id of ['reload', 'overwatch']) expect(rows.find((x) => x.id === id)?.ap, id).toBe(0);
        // with no fight given (a card outside a fight) only the unit's own items are asked: the documented exception
        expect(reloadAp(u)).toBe(costOf('reload'));
      });
    });
  });
});

describe('review, problem 4: a verb reaches the `cost` hook under ONE name (its site), from its row and from its action', () => {
  it('every row whose id is not its site is priced under the site, by either name, with the same floor', () => {
    const rows = ((ACTIONS as any).items as any[]).filter((a) => a.site && a.site !== a.id);
    expect(rows.map((a) => a.id).sort()).toEqual(['cover', 'pullfree', 'reload2']);
    const seen: string[] = [];
    onlyHandlers([{ id: 'chain_smoker', kind: 'trait', on: { cost: (ctx: any, h: any) => { if (ctx.u === h.u) seen.push(ctx.action + '<' + ctx.row); } } } as any], () => {
      const f = fight({ traits: ['chain_smoker'] }), u = f.pc;
      withGame(f.g, () => { for (const a of rows) { expect(actionName(a.id)).toBe(a.site); expect(price({ cb: f.cb, u }, a.id, 2).action).toBe(a.site); expect(price({ cb: f.cb, u }, a.site, 2)).toEqual(price({ cb: f.cb, u }, a.id, 2)); } });
      for (const a of rows) { expect(seen).toContain(a.site + '<' + a.id); expect(seen).toContain(a.site + '<' + a.site); expect(seen.some((x) => x.startsWith(a.id + '<'))).toBe(false); }
    });
  });
  it('Pull free: a handler on `pull_free` changes the row and the action alike (the row showed 2 AP, the action took 3)', () => {
    onlyHandlers([{ id: 'chain_smoker', kind: 'trait', on: { cost: (ctx: any, h: any) => { if (ctx.u === h.u && ctx.action === 'pull_free') ctx.ap += 1; } } } as any], () => {
      const f = fight({ traits: ['chain_smoker'] }), u = f.pc; u.ap = 6; u.nailed = { by: f.foe.id, id: 'run_through', ap: 2 } as any;
      const row = withGame(f.g, () => basicActions(f.cb, u, { g: f.g }).find((r) => r.id === 'pullfree')!);
      expect(row.ap).toBe(3); expect(withGame(f.g, () => basicCost(f.cb, u, 'pullfree', {}, { g: f.g }))).toBe(3);
      const v = apply(f.g, { type: 'combat/pull-free', unitId: u.id } as any, 'host').combat!.units.find((y) => y.id === u.id)!;
      expect(v.ap).toBe(6 - row.ap);
    });
  });
  it('Reload both: the row and the action ask the same name', () => {
    onlyHandlers([{ id: 'chain_smoker', kind: 'trait', on: { cost: (ctx: any, h: any) => { if (ctx.u === h.u && ctx.action === 'reload_both') ctx.ap -= 1; } } } as any], () => {
      const f = fightWith([{ weapon: 'service_pistol', traits: ['chain_smoker'] }, {}], [{ at: 'F6', classic: true }]); f.turn(f.pc); const u = f.pc;
      u.offWeapon = 'service_pistol'; u.offAmmo = 0; u.ammo = 1; u.mags = [8, 8, 8]; (f.g.characters[u.charId!] as any).offHand = { id: 'service_pistol' }; u.ap = 6;
      const row = withGame(f.g, () => basicActions(f.cb, u, { g: f.g }).find((r) => r.id === 'reload2')!);
      expect(row.ap).toBe(costOf('reload2') - 1);
      const v = apply(f.g, { type: 'combat/reload', unitId: u.id, hand: 'both' } as any, 'host').combat!.units.find((y) => y.id === u.id)!;
      expect(v.ap).toBe(6 - row.ap);
    });
  });
});

describe('review, problem 5: a declared `res` is refused and paid in a story too', () => {
  let RAN = 0;
  const act = (res: any) => ({ id: 'chain_smoker', kind: 'trait', actions: [{ id: 'burn', label: 'Burn', scope: ['story'], target: 'none', ap: 0, res, run: () => { RAN++; return null; } }] } as any);
  it('what the character holds (Echo, stims): "Needs 1 Echo." with none, taken with one', () => {
    onlyHandlers([act({ echo: 1 })], () => {
      const s = storyWith([{ traits: ['chain_smoker'] }]), c = s.chars[0], x = { c, g: s.g }; RAN = 0;
      c.echo = 0;
      expect(withGame(s.g, () => perkActionsFor(x, 'story').find((e) => e.id === 'trait:chain_smoker')!.why)).toBe('Needs 1 Echo.');
      expect(withGame(s.g, () => runPerkAction(x, 'trait:chain_smoker', {}, { state: 7 }, 'story'))).toBe('Needs 1 Echo.'); expect(RAN).toBe(0);
      c.echo = 1;
      expect(withGame(s.g, () => perkActionsFor(x, 'story').find((e) => e.id === 'trait:chain_smoker')!.why)).toBeNull();
      expect(withGame(s.g, () => runPerkAction(x, 'trait:chain_smoker', {}, { state: 7 }, 'story'))).toBeNull(); expect(RAN).toBe(1); expect(c.echo).toBe(0);
    });
  });
  it('what only a unit holds (charge, MP, Supplies) can\'t be paid where there is no unit: refused, never run for nothing', () => {
    onlyHandlers([act({ charge: 2 })], () => {
      const s = storyWith([{ traits: ['chain_smoker'] }]), c = s.chars[0], x = { c, g: s.g }; RAN = 0;
      expect(withGame(s.g, () => runPerkAction(x, 'trait:chain_smoker', {}, { state: 7 }, 'story'))).toBe('Only in a fight (it costs 2 charge).'); expect(RAN).toBe(0);
      expect(resWhyNot({ charge: 2 }, null, c)).toMatch(/Only in a fight/); expect(resWhyNot({}, null, c)).toBeNull();
    });
  });
});
