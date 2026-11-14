// The repair service (rules 1.50; survival-spec rules 37a and 44a): a shop and a Forge bring a carried weapon or shield
// back to full durability for a price from one function (the Core Rules' gunsmith rate x priceOf x the share missing,
// with a floor, x the place's factor), through the one reducer (`run/repair`). The primitives first (wearAt, repairAt,
// wearState), then the action: the price at a shop and at a Forge, a broken gun, an item at full, a pack line, every
// refusal in words; then the shop's services shelf and the Forge's Upgrade tab. Numbers are read from data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, creditsOf, priceOf, maxDurOf, wearAt, repairAt, wearState, WORN_SHARE, repairPrice, repairProblem, REPAIR,
  runOptions, shopView, placeView, gearPreview, bindGame } from '../src';
import { survivalRoom, ownerOf } from './helpers/survival';
import type { Pc } from './helpers/replay';
import svJ from '../../../data/survival.json';
import rulesJ from '../../../data/rules.json';

const SV: any = svJ, RJ: any = rulesJ;
const SOLO: Pc[] = [{ build: 'plain_gun', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const started = (pcs: Pc[] = SOLO, seed = 'PHC-0001') => apply(survivalRoom(seed, pcs, { test: true }), { type: 'run/start', seed, camp: 'recommended' }, 'host');
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
/** The squad at a node of this kind (depth 5 made that kind, its way in walked), the gun in hand worn to `dur`. */
function at(kind: string, o: { dur?: number; credits?: number; pcs?: Pc[]; prep?: (g: GameState) => void } = {}): GameState {
  const g0 = clone(started(o.pcs || SOLO)), r = g0.run!;
  const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map';
  for (const c of Object.values(g0.characters)) { c.credits = o.credits ?? 10000; if (o.dur != null) c.weaponState = { ...(c.weaponState || {}), dur: o.dur }; }
  o.prep?.(g0);
  let g = g0; for (let i = 0; i < (o.pcs || SOLO).length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  return g;
}
const c1 = (g: GameState) => g.characters.c1;
/** The price the rule gives, worked out here from data alone (the test's own copy of the formula). */
const expected = (id: string, rarity: string, now: number, place: 'shop' | 'forge') => {
  const max = maxDurOf(id, rarity as any), p = priceOf(id, rarity as any)!, R = SV.repair;
  return Math.ceil(Math.max(R.floor, R.rate * p * ((max - now) / max)) * R.places[place]);
};

describe('rules 1.50: wear, the primitives', () => {
  it('the worn share is data (weapons_rules.worn.share), and the states are Broken at 0, Worn at that share or less', () => {
    expect(WORN_SHARE).toBe(RJ.weapons_rules.worn.share);
    expect(wearState(0, 400)).toBe('broken');
    expect(wearState(400 * WORN_SHARE, 400)).toBe('worn');
    expect(wearState(400 * WORN_SHARE + 1, 400)).toBe('sound');
    expect(wearState(0, 0)).toBe('sound'); // a thing that does not wear
  });
  it('wearAt reads a hand and a pack line (a missing dur is full); repairAt brings one back to full, splitting a stack', () => {
    const g = at('shop', { dur: 37 }), c = c1(g), max = maxDurOf(c.weapon, c.weaponState?.rarity);
    expect(wearAt(c, 'main')).toMatchObject({ id: c.weapon, now: 37, max, state: 'worn' });
    expect(repairAt(c, 'main')).toBe(max - 37);
    expect(wearAt(c, 'main')!.now).toBe(max);
    expect(repairAt(c, 'main')).toBe(0); // already full
    c.pack = [...(c.pack || []), { id: 'sabre', name: 'Sabre', qty: 2, kind: 'weapon', weapon: 'sabre', dur: 10 } as any];
    const i = c.pack!.length - 1;
    expect(wearAt(c, i)).toMatchObject({ id: 'sabre', now: 10, max: maxDurOf('sabre'), state: 'worn' });
    expect(repairAt(c, i)).toBe(maxDurOf('sabre') - 10);
    expect(c.pack![i]).toMatchObject({ qty: 1, dur: 10 }); // the rest of the stack keeps its wear
    expect(c.pack![c.pack!.length - 1]).toMatchObject({ qty: 1, dur: maxDurOf('sabre') });
  });
  it('a focus, a tool and rounds do not wear (max 0 or nothing there)', () => {
    const g = at('shop'), c = c1(g);
    c.pack = [{ id: 'evoker', item: 'evoker', name: 'Evoker', qty: 1, kind: 'focus' } as any, { id: 'spare_parts', item: 'spare_parts', name: 'Spare parts', qty: 3, kind: 'item' } as any];
    expect(wearAt(c, 0)!.max).toBe(0);
    expect(wearAt(c, 1)!.max).toBe(0);
    expect(wearAt(c, 7)).toBeNull();
  });
});

describe('rules 1.50: run/repair through the reducer', () => {
  it('at a shop: full price, the purse down by exactly it, the gun at full, the line in the log', () => {
    const g = at('shop', { dur: 100 }), c = c1(g), id = c.weapon, r = c.weaponState?.rarity || 'standard', want = expected(id, r, 100, 'shop');
    expect(repairPrice(wearAt(c, 'main')!, 'shop')).toBe(want);
    expect(want).toBe(Math.ceil(SV.repair.rate * priceOf(id)! * 0.75)); // a Standard rifle 75% worn: a tenth of its price x 0.75
    const g2 = apply(g, { type: 'run/repair', charId: 'c1', where: 'main', place: 'shop' }, 'host');
    expect(creditsOf(c1(g2))).toBe(10000 - want);
    expect(wearAt(c1(g2), 'main')!.now).toBe(maxDurOf(id, r));
    expect(g2.story.entries.some((l: any) => /repaired to full/.test(l.text))).toBe(true);
    expect(g2.run!.shop!.log.some((l: string) => /repaired to full/.test(l))).toBe(true); // the shop's visit log
  });
  it('at a Forge: the Forge\'s factor from data', () => {
    const g = at('forge', { dur: 100 }), c = c1(g), want = expected(c.weapon, 'standard', 100, 'forge');
    expect(want).toBeLessThan(expected(c.weapon, 'standard', 100, 'shop'));
    const g2 = apply(g, { type: 'run/repair', charId: 'c1', where: 'main', place: 'forge' }, 'host');
    expect(creditsOf(c1(g2))).toBe(10000 - want);
  });
  it('a broken gun (0) costs the whole rate; a scratch costs the floor; a graded gun is priced at its grade', () => {
    const g = at('shop', { dur: 0 }), c = c1(g), p = priceOf(c.weapon)!;
    expect(wearAt(c, 'main')!.state).toBe('broken');
    expect(repairPrice(wearAt(c, 'main')!, 'shop')).toBe(Math.ceil(Math.max(SV.repair.floor, SV.repair.rate * p)));
    const g2 = apply(g, { type: 'run/repair', charId: 'c1', where: 'main', place: 'shop' }, 'host');
    expect(wearAt(c1(g2), 'main')!.state).toBe('sound');
    const max = maxDurOf(c.weapon);
    expect(repairPrice({ ...wearAt(c, 'main')!, now: max - 1 }, 'shop')).toBe(SV.repair.floor);
    const mw = { ...wearAt(c, 'main')!, rarity: 'masterwork' as const, max: maxDurOf(c.weapon, 'masterwork'), now: 0 };
    expect(repairPrice(mw, 'shop')).toBe(Math.ceil(SV.repair.rate * priceOf(c.weapon, 'masterwork')!));
  });
  it('a pack line is repaired where it lies', () => {
    const g = at('shop', { prep: (g0) => { const c = c1(g0); c.pack = [...(c.pack || []), { id: 'sabre', name: 'Sabre', qty: 1, kind: 'weapon', weapon: 'sabre', dur: 0 } as any]; } });
    const i = c1(g).pack!.length - 1, want = expected('sabre', 'standard', 0, 'shop');
    const g2 = apply(g, { type: 'run/repair', charId: 'c1', where: i, place: 'shop' }, 'host');
    expect(c1(g2).pack![i].dur).toBe(maxDurOf('sabre'));
    expect(creditsOf(c1(g2))).toBe(10000 - want);
  });
  it('every refusal is in words, and nothing changes', () => {
    const full = at('shop');
    expect(refused(full, { type: 'run/repair', charId: 'c1', where: 'main', place: 'shop' })).toMatch(/is already in full repair\.$/);
    const g = at('shop', { dur: 0, credits: 5 }), price = repairPrice(wearAt(c1(g), 'main')!, 'shop');
    expect(refused(g, { type: 'run/repair', charId: 'c1', where: 'main', place: 'shop' })).toBe(c1(g).name + ' is ' + (price - 5) + ' credits short.');
    expect(refused(g, { type: 'run/repair', charId: 'c1', where: 'main', place: 'forge' })).toBe('This is not a Forge.');
    expect(refused(g, { type: 'run/repair', charId: 'c1', where: 42, place: 'shop' })).toBe('There is nothing there to repair.');
    const rest = at('rest', { dur: 0 });
    expect(refused(rest, { type: 'run/repair', charId: 'c1', where: 'main', place: 'shop' })).toMatch(/^You are not at a shop or a Forge/);
    const focus = at('shop', { prep: (g0) => { c1(g0).pack = [{ id: 'evoker', item: 'evoker', name: 'Evoker', qty: 1, kind: 'focus' } as any]; } });
    expect(refused(focus, { type: 'run/repair', charId: 'c1', where: 0, place: 'shop' })).toMatch(/never wears out/);
    expect(refused(g, { type: 'run/repair', charId: 'nobody', where: 'main', place: 'shop' })).toBe('No such character.');
    expect(creditsOf(c1(g))).toBe(5);
  });
});

describe('rules 1.50: the screens read the engine', () => {
  it('the shop\'s services shelf has a repair card per worn thing: wear now and full, the price, the reason; the grade cards beside it', () => {
    const g = at('shop', { dur: 100 }), was = bindGame(g);
    try {
      const v = shopView(g as any, 'host')!, cards = v.services.filter((s) => s.service === 'repair');
      expect(cards.length).toBe(1);
      const k = cards[0], w = wearAt(c1(g), 'main')!;
      expect(k).toMatchObject({ id: c1(g).weapon, price: repairPrice(w, 'shop'), why: null, wear: { now: 100, max: w.max, state: 'worn' }, action: { type: 'run/repair', charId: 'c1', where: 'main', place: 'shop' } });
      expect(k.note).not.toContain('Forge'); // the shop's card says its own price only (docs/design/ui-screens.md, Writing for the player)
      expect(v.services.some((s) => s.service === 'grade_step')).toBe(true);
      expect(v.me!.handWear).toEqual({ now: 100, max: w.max, state: 'worn' });
      const poor = at('shop', { dur: 0, credits: 1 }), pc = shopView(poor as any, 'host')!.services.find((s) => s.service === 'repair')!;
      expect(pc.why).toMatch(/is \d+ credits short/);
      expect(shopView(at('shop') as any, 'host')!.services.filter((s) => s.service === 'repair')).toEqual([]); // nothing worn: no card
    } finally { bindGame(was); }
  });
  it('the Forge\'s Upgrade tab holds the repair group; its options are the engine\'s', () => {
    const g = at('forge', { dur: 50 }), v = placeView(g, 'host')!;
    expect(v.tabs.find((t) => t.id === 'upgrade')!.groups).toContain('repair');
    const card = v.cards.find((x) => x.o.group === 'repair')!;
    expect(card.id).toBe(c1(g).weapon);
    expect(card.o.price).toBe(repairPrice(wearAt(c1(g), 'main')!, 'forge'));
    expect(card.o.wear).toMatchObject({ now: 50, state: 'worn' });
    expect(runOptions(g, 'c1').filter((o) => o.group === 'repair').length).toBe(1);
  });
  it('a weapon\'s gear preview shows its full durability at its grade (the grade step\'s card shows it rise)', () => {
    const g = at('shop'), c = c1(g);
    expect(gearPreview(c, { id: c.weapon }).lines.find((l) => l.key === 'dur')!.num).toBe(maxDurOf(c.weapon));
    expect(gearPreview(c, { id: c.weapon, rarity: 'fine' }).lines.find((l) => l.key === 'dur')!.num).toBe(maxDurOf(c.weapon, 'fine'));
  });
  it('the data: the rate is the Core Rules\' gunsmith (a tenth), every number provisional', () => {
    expect(REPAIR.rate).toBe(0.1);
    expect(SV.repair.provisional).toBe(true);
    expect(Object.keys(REPAIR.places).sort()).toEqual(['forge', 'shop']);
    void repairProblem;
  });
});
