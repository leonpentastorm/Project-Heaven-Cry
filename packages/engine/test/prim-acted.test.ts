// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1a, row 1 (docs/design/rev4-primitives.md section 5): the trigger `acted` (P2) and the closed-list
// rows that need no mechanism (trigger `spot`, predicates `by_cover` and `patron`, `via` and `nonlethal` on `deal`,
// `heal_kind` on an amount block, the `resource` op over every data/actions.json resources row). Each is proven with a
// fixture item written in data only (test/fixtures/classes-3.0-primitives.json); the numbers are read from it.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems, handlerOf, onHook } from '../src/effects/hooks';
import { itemInfo } from '../src';
import { triggerProblem, PREDICATES } from '../src/effects/triggers';
import { RESOURCES } from '../src/effects/cost';
import { viaOf } from '../src/magic';
import { A, W, dice, HIT, pcs, foes, charOf, turn } from './golden/harness';
import { opsFight } from './golden/itemops';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives.json', import.meta.url)), 'utf8'));
const relic = (id: string) => FIX.relics.find((r: any) => r.id === id);
const apply = (g: any, a: any) => { const g1 = A.apply(g, a, 'host'); Object.assign(g, g1); return g; };
// taps on the hook bus (registered once; they record only while a test holds them open)
const TAP: { spot?: number[]; via?: string[]; kinds?: string[] } = {};
onHook('spot', (ctx: any) => { TAP.spot?.push(ctx.mod); });
onHook('damage_in', (ctx: any) => { if (ctx.phase === 'reduce' && ctx.src?.item === 'relic:test_deal_nonlethal') TAP.via?.push(String(viaOf(ctx.src.by))); });
onHook('heal_in', (ctx: any) => { TAP.kinds?.push(ctx.kind); });
const tap = <T>(k: 'spot' | 'via' | 'kinds', f: () => T): any[] => { const out: any[] = []; TAP[k] = out; try { f(); } finally { delete TAP[k]; } return out; };

describe('P2 and the batch rows: fixture items in data only', () => {
  beforeAll(() => { addItems('perk', FIX.perks); addItems('relic', FIX.relics); });
  afterAll(() => clearAddedItems());

  it('every fixture effect is well formed for the runner and has no handler', () => {
    for (const r of FIX.relics) { const info = itemInfo('relic:' + r.id)!; expect(handlerOf(info.key)).toBeFalsy(); info.effects.forEach((e: any, i: number) => expect(triggerProblem(e), r.id + ' #' + i).toBeNull()); }
    const p = itemInfo('perk:test_acted_ping')!; expect(p.effects.length).toBe(2); // the nested `when: acted` effect is lifted
    expect(p.effects[1].if.action).toEqual([FIX.perks[0].effects[0].action]);
  });

  it('acted: fires once after the unit\'s own action succeeded, named by its cost site; not on a refused one', () => {
    const g = opsFight({ relics: ['test_acted_reload'] }), u = pcs(g)[0], gain = relic('test_acted_reload').effects[0].value;
    u.ammo = 0; const ap0 = u.ap, cost = W(g, () => A.price({ cb: g.combat, u }, 'reload').ap);
    W(g, () => apply(g, { type: 'combat/reload', unitId: u.id }));
    const v = pcs(g)[0]; expect(v.ap).toBe(ap0 - cost + gain);
    // once a turn (its limit), and a refused action fires nothing
    const ap1 = v.ap; v.ammo = 0; W(g, () => apply(g, { type: 'combat/reload', unitId: v.id }));
    expect(pcs(g)[0].ap).toBe(ap1 - cost);
  });

  it('acted: Analyze fires its own, with its target (the private analyze hook is gone)', () => {
    const g = opsFight({ relics: ['test_acted_analyze'] }), u = pcs(g)[0], far = foes(g)[1];
    W(g, () => apply(g, { type: 'combat/analyze', unitId: u.id, targetId: far.id }));
    expect(Object.keys(foes(g)[1].conds || {})).toContain(relic('test_acted_analyze').effects[0].condition);
    // the plain sheet: nothing
    const g0 = opsFight({}); W(g0, () => apply(g0, { type: 'combat/analyze', unitId: pcs(g0)[0].id, targetId: foes(g0)[1].id }));
    expect(Object.keys(foes(g0)[1].conds || {})).not.toContain('marked');
    expect(A.HOOK_ABOUT?.analyze).toBeUndefined();
  });

  it('acted: a grant_action\'s nested `when: acted` effect runs after its own action only (sugar for if.action)', () => {
    const g = opsFight({ perks: { test_acted_ping: 'mastered' } }), u = pcs(g)[0], d = FIX.perks[0].effects[0];
    const ap0 = u.ap; W(g, () => apply(g, { type: 'combat/perk', unitId: u.id, id: 'perk:test_acted_ping' }));
    expect(pcs(g)[0].ap).toBe(ap0 - d.ap + d.effects[0].value);
    const ap1 = pcs(g)[0].ap; pcs(g)[0].ammo = 0; W(g, () => apply(g, { type: 'combat/reload', unitId: u.id }));
    expect(pcs(g)[0].ap).toBe(ap1 - W(g, () => A.price({ cb: g.combat, u: pcs(g)[0] }, 'reload').ap)); // another action: no gain
  });

  it('spot: roll_mod changes the roll against the holder; cancel stops it', () => {
    const roll = (relics: string[]) => {
      const g = opsFight({ relics }), u = pcs(g)[0], far = foes(g)[1]; u.hidden = true; u.hideEntry = 1; far.vision = 30;
      const mods = tap('spot', () => W(g, () => A.spotHidden(g.combat, g.rng, far)));
      return { mods, hidden: pcs(g)[0].hidden };
    };
    const base = roll([]), still = roll(['test_spot_still']), none = roll(['test_spot_cancel']);
    expect(base.mods.length).toBe(1);
    expect(still.mods[0]).toBe(base.mods[0] + relic('test_spot_still').effects[0].value);
    expect(none.hidden).toBe(true); expect(none.mods.length).toBe(1); // the hook fired; cancel stopped the roll
  });

  it('by_cover: a move that ends next to cover', () => {
    const g = opsFight({ relics: ['test_by_cover'] }), cb = g.combat, u = pcs(g)[0];
    expect(PREDICATES.by_cover.values).toEqual(['from', 'to', 'here']); // here: rules 1.32 (Still Breath)
    cb.objects = [...(cb.objects || []), A.makeObject('crate_t', 'crate', '3,10')];
    W(g, () => apply(g, { type: 'combat/move', unitId: u.id, to: '3,9' }));
    const st = pcs(g)[0].ps?.['relic:test_by_cover'];
    expect(!!st?.flags?.in_cover).toBe(A.nextToCover(g.combat, '3,9'));
    expect(A.nextToCover(g.combat, '3,9')).toBe(true);
  });

  it('patron: the holder\'s patron, from patrons.json', () => {
    expect(PREDICATES.patron.values.length).toBeGreaterThan(0);
    const g = opsFight({}), u = pcs(g)[0], c = charOf(g, u), id = PREDICATES.patron.values[0];
    const ev: any = { h: { c, key: 'x' }, self: u, cb: g.combat, ctx: {} };
    expect(W(g, () => PREDICATES.patron.test(ev, [id]))).toBe(A.patronOf(c)?.id === id);
  });

  it('deal: via (the source it counts as) and nonlethal (the last HP subdues)', () => {
    const g = opsFight({ relics: ['test_deal_nonlethal'] }), u = pcs(g)[0], f = foes(g)[0];
    const seen = tap('via', () => W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, u, f, 'melee', charOf(g, u)))));
    const t = foes(g)[0]; expect(t.dead).toBeFalsy(); expect(t.surrendered).toBe(true);
    expect(seen).toEqual([relic('test_deal_nonlethal').effects[0].via]);
  });

  it('mend: an amount block\'s heal_kind is the heal\'s kind', () => {
    const g = opsFight({ relics: ['test_mend_kind'] }), u = pcs(g)[0];
    const kinds = tap('kinds', () => W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, u, foes(g)[0], 'melee', charOf(g, u)))));
    expect(kinds).toEqual([relic('test_mend_kind').effects[0].amount.heal_kind]);
  });

  it('resource: any data/actions.json row (pressure through its setter; mp only with an Emanator, up to its max)', () => {
    expect(RESOURCES.pressure.setter).toBe('pressure'); expect(RESOURCES.mp.needs).toBeTruthy();
    const shot = (relics: string[]) => { const g = opsFight({ relics }), u = pcs(g)[0]; W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, u, foes(g)[1], 'shot', charOf(g, u)))); return foes(g)[1].pressure || 0; };
    const base = shot([]), more = shot(['test_res_pressure']);
    expect(more).toBe(Math.min(base + relic('test_res_pressure').effects[0].value, A.pressureCap(foes(opsFight({}))[1])));
    // MP: a holder without an Emanator gets nothing; with one, up to its max
    const g = opsFight({ relics: ['test_res_mp'] }), u = pcs(g)[0]; u.mg = { ...(u.mg || {}), mp: 10, mpMax: 25, emanator: null };
    W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, u, foes(g)[0], 'melee', charOf(g, u)))); expect(pcs(g)[0].mg.mp).toBe(10);
    const v = pcs(g)[0]; v.mg.emanator = 'x'; v.ap = 9; turn(g, v, 9); W(g, () => dice(HIT, () => A.resolveAttack(g.combat, g.rng, v, foes(g)[0], 'melee', charOf(g, v))));
    expect(pcs(g)[0].mg.mp).toBe(25);
  });
});
