// Engine foundations 2 (docs/design/handoffs/engine-foundations-2-costs.md): the cost primitive (effects/cost.ts) and
// the counter primitive (effects/uses.ts), each rule pinned once. The numbers of every action are held by the costs
// tables (test/golden/costs.ts); this file holds what a table can't say: how the primitive behaves at its edges.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import {
  price, priced, costOf, hasCost, whyNot, canPay, pay, refund, spend, needs, poolWhyNot, grantAp, loseAp, setAp, freely, withAp, apFor, creditFor, lend, settleCredit,
  resLeft, RESOURCES, AP_MAX, previewAttack, moveOptions, uses, SCOPES, scopeOf, register, perkActionsFor, previewPerkAction, basicActions, previewAction, loadMagazine, enemyTurn, apply, type Unit,
} from '../src';
import { fightWith, withGame, onlyHandlers } from './helpers/perkfight';
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
  it('an enemy whose reload costs more than 2 AP does not burn its turn trying with 2', () => {
    const f = fightWith([{}], [{ at: 'F6', weapon: 'breacher_tube', classic: true }]), e = f.foe; f.turn(e);
    const cost = withGame(f.g, () => price({ cb: f.cb, u: e }, 'reload', 3).ap); expect(cost).toBe(3);
    e.ap = 2; e.ammo = 0; const log0 = f.cb.log.length;
    withGame(f.g, () => enemyTurn(f.cb, f.g.rng)); void log0;
    expect(e.ammo).toBe(0); // it could not reload, and it knew: no six refused tries
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
