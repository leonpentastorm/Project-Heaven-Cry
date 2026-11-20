// rules 1.55 items 54 to 60 (Leon, playing live 0.28.2: "giving credit is nightmare"; "Essence of experience need to
// be crackable by all 4 focus type and sellable"): a give's amount is judged by the engine whatever the client types;
// a counted item is sold by `count` at priceOf's sale mode; using a counted item is one action, gear/use (the Essence
// cracked with any focus in a hand, its XP through the one XP door, one per rest; the stim through its own act). All
// through the reducer with real actions; numbers read from the data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, creditsOf, priceOf, sellValue, shopView, giveView, ITEM, SELL_RATE, reachable, magazineWorth, maxHp, type RunNode } from '../src';
import { survivalRoom, startRun, ownerOf, walkIn } from './helpers/survival';
import type { Pc } from './helpers/replay';

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'plain_gun', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const take = (g: GameState, node: RunNode) => { let x = g; for (let i = 0; i < 2 && x.run!.at !== node.id; i++) x = apply(x, { type: 'run/move', node: node.id }, ownerOf(i)); return x; };
/** The party in the first shop (a place where credits are given and things sold), `prep` on the state before. */
function inShop(prep?: (g: GameState) => void, seed = 'PHC-0283B'): GameState {
  const g = clone(startRun(survivalRoom(seed, DUO, { test: true }), seed)), shop = g.run!.nodes.find((n) => n.kind === 'shop')!, prev = g.run!.nodes.find((x) => x.links.includes(shop.id))!;
  g.run!.at = prev.id; g.run!.state = 'map'; prep?.(g);
  const x = take(g, shop); expect(x.run!.state).toBe('shop'); return x;
}
/** Into the first fight (both players mark it). */
function inFight(prep?: (g: GameState) => void, seed = 'PHC-0283F'): GameState {
  let g = clone(startRun(survivalRoom(seed, DUO, { test: true }), seed));
  for (const c of Object.values(g.characters)) { c.weapon = 'service_pistol'; c.pack = [...(c.pack || []), ...magazineWorth('service_pistol')]; }
  prep?.(g);
  const n = reachable(g.run!).find((x) => x.kind === 'fight')!; g = walkIn(take(g, n)); expect(g.run!.state).toBe('fight'); return g;
}
const ESSENCE = Object.keys(ITEM).find((id) => (ITEM[id] as any).counts_into?.count === 'essence')!;
const STIM = Object.keys(ITEM).find((id) => (ITEM[id] as any).use?.via === 'stim')!;
const XP = Number((ITEM[ESSENCE] as any).effects[0].value);
const FOCI = Object.keys(ITEM).filter((id) => (ITEM[id] as any).focus && !(ITEM[id] as any).variant_of); // the four focus rows (a variant, rules 1.56 L4, is its base's)
const crack = (on: string) => ({ type: 'gear/use', charId: 'c1', item: ESSENCE, targetId: on }) as any;
/** c1 holds `focus` (or nothing) in the off hand beside a one-handed pistol, and `n` Essences. */
const holding = (focus: string | null, n = 1) => (g: GameState) => { const c = g.characters.c1; c.weapon = 'service_pistol'; c.offHand = focus ? { id: focus, rarity: 'standard' } as any : undefined; c.essence = n; };

describe('rules 1.55 item 54: the amount of a give is the engine\'s to judge', () => {
  it('credits typed as 0, a negative, more than held, a fraction, 1e21, NaN or words are refused or rounded by the reducer', () => {
    const g = inShop((x) => { x.characters.c1.credits = 1240; x.characters.c2.credits = 0; });
    const give = (credits: unknown) => ({ type: 'gear/give', charId: 'c1', to: 'c2', credits }) as any;
    expect(refused(g, give(0))).toBe('Give 1 credit or more.');
    expect(refused(g, give(-50))).toBe('Give 1 credit or more.');
    expect(refused(g, give(NaN))).toBe('Give 1 credit or more.');
    expect(refused(g, give('lots'))).toBe('Give 1 credit or more.');
    expect(refused(g, give(1241))).toBe(g.characters.c1.name + ' has 1240 credits.');
    expect(refused(g, give(1e21))).toBe(g.characters.c1.name + ' has 1240 credits.');
    const a = apply(g, give(100.4), 'host'); expect(creditsOf(a.characters.c1)).toBe(1140); expect(creditsOf(a.characters.c2)).toBe(100);
    const all = apply(g, give(1240), 'host'); expect(creditsOf(all.characters.c1)).toBe(0); expect(creditsOf(all.characters.c2)).toBe(1240);
  });
  it('a counted item\'s quantity likewise: 0, more than held and NaN refused, a typed 2 gives 2', () => {
    const g = inShop((x) => { x.characters.c1.stims = 3; x.characters.c2.stims = 0; });
    const give = (qty: unknown) => ({ type: 'gear/give', charId: 'c1', to: 'c2', count: STIM, qty }) as any;
    for (const q of [0, 4, NaN, -1]) expect(refused(g, give(q))).toBe('Give 1 to 3 of those.');
    const a = apply(g, give(2), 'host'); expect(a.characters.c1.stims).toBe(1); expect(a.characters.c2.stims).toBe(2);
  });
});

describe('rules 1.55 items 55 to 57: the Essence is sold, never bought', () => {
  it('run/sell with count sells it at the sell rate of its sale price; never stocked (no buy price); the Sell list shows it', () => {
    const g = inShop(holding(null, 2)), c = g.characters.c1, cr = creditsOf(c);
    expect(priceOf(ESSENCE)).toBeNull(); // never stocked: no shelf, reward or camp line can hold it
    const price = priceOf(ESSENCE, 'standard', [], { sale: true })!; expect(price).toBe((ITEM[ESSENCE] as any).price_credits);
    const row = shopView(g as any, 'host')!.sell.find((r) => r.count === ESSENCE)!;
    expect(row.qty).toBe(2); expect(row.why).toBeNull(); expect(row.totals).toEqual([Math.floor(price * SELL_RATE), Math.floor(2 * price * SELL_RATE)]);
    const after = apply(g, { type: 'run/sell', charId: 'c1', count: ESSENCE, qty: 1 }, 'host');
    expect(creditsOf(after.characters.c1)).toBe(cr + Math.floor(price * SELL_RATE)); expect(after.characters.c1.essence).toBe(1);
    expect(refused(after, { type: 'run/sell', charId: 'c1', count: ESSENCE, qty: 2 })).toBe('You can sell 1 to 1 of those.');
    const none = apply(after, { type: 'run/sell', charId: 'c1', count: ESSENCE }, 'host');
    expect(none.characters.c1.essence).toBe(0);
    expect(refused(none, { type: 'run/sell', charId: 'c1', count: ESSENCE })).toBe(c.name + ' has none of those.');
    expect(shopView(none as any, 'host')!.sell.some((r) => r.count === ESSENCE)).toBe(false);
  });
  it('an item flagged sell: false is still refused (the armourer\'s chit, a trait\'s gift), stock: false alone is not', () => {
    for (const id of Object.keys(ITEM).filter((x) => (ITEM[x] as any).sell === false)) expect(priceOf(id, 'standard', [], { sale: true })).toBeNull();
    expect(sellValue({ id: ESSENCE, item: ESSENCE, name: 'x', qty: 1, kind: 'med' } as any)).toBe(Math.floor(priceOf(ESSENCE, 'standard', [], { sale: true })! * SELL_RATE));
  });
  it('the loop: an Essence given and then sold pays once; given, sold and cracked never make more than one Essence is worth', () => {
    const g = inShop((x) => { holding('evoker', 1)(x); x.characters.c2.essence = 0; }), sum = (x: GameState) => creditsOf(x.characters.c1) + creditsOf(x.characters.c2);
    const xp = (x: GameState) => x.characters.c1.xp + x.characters.c2.xp, cr0 = sum(g), xp0 = xp(g);
    const given = apply(g, { type: 'gear/give', charId: 'c1', to: 'c2', count: ESSENCE, qty: 1 }, 'host');
    expect(given.characters.c1.essence).toBe(0); expect(given.characters.c2.essence).toBe(1); expect(sum(given)).toBe(cr0);
    const sold = apply(given, { type: 'run/sell', charId: 'c2', count: ESSENCE }, 'p2');
    expect(sum(sold) - cr0).toBe(Math.floor(priceOf(ESSENCE, 'standard', [], { sale: true })! * SELL_RATE)); expect(xp(sold)).toBe(xp0);
    expect(refused(sold, crack('c1'))).toBe(g.characters.c1.name + ' has no Essence of Experience.');
    expect(refused(sold, { type: 'gear/give', charId: 'c2', to: 'c1', count: ESSENCE }, 'p2')).toMatch(/has no Essence of Experience/);
  });
});

describe('rules 1.55 items 58 and 59: gear/use, the one way to use a counted item', () => {
  it('any of the four foci in a hand cracks the Essence; the one picked gains the row\'s XP (tagged essence); one per rest', () => {
    expect(FOCI.length).toBe(4);
    for (const f of FOCI) {
      const g = inShop(holding(f, 2)), before = g.characters.c2.xp;
      const a = apply(g, crack('c2'), 'host');
      expect(a.characters.c2.xp - before).toBe(XP); expect(a.characters.c2.xpBySource.essence).toBe(XP); expect(a.characters.c1.essence).toBe(1);
      expect(refused(a, crack('c2'))).toBe(g.characters.c2.name + ' has had one this rest.');
      const self = apply(a, crack('c1'), 'host'); expect(self.characters.c1.xp - g.characters.c1.xp).toBe(XP); expect(self.characters.c1.essence).toBe(0);
    }
  });
  it('no focus in a hand: refused in the row\'s words, and the Essence can still be given or sold; refused in a fight', () => {
    const g = inShop(holding(null, 1));
    expect(refused(g, crack('c1'))).toBe((ITEM[ESSENCE] as any).requires_to_use[0].why);
    expect(apply(g, { type: 'run/sell', charId: 'c1', count: ESSENCE }, 'host').characters.c1.essence).toBe(0);
    expect(refused(inFight(holding('emanator', 1)), crack('c1'))).toBe('Not in a fight: use it after the fight.');
    expect(refused(g, crack('c2'), 'p2')).toBe('Not your character.');
  });
  it('the Give view\'s "Use on…" sends gear/use, with the reducer\'s reason per character', () => {
    const g = inShop(holding('attuner', 1)), row = giveView(g, 'host').rows.find((r) => r.key === 'count:' + ESSENCE)!;
    expect(row.use!.action).toEqual({ type: 'gear/use', charId: 'c1', item: ESSENCE }); expect(row.use!.label).toBe((ITEM[ESSENCE] as any).use.label);
    expect(row.use!.why).toEqual({ c1: null, c2: null });
    const bare = giveView(inShop(holding(null, 1)), 'host').rows.find((r) => r.key === 'count:' + ESSENCE)!;
    expect(bare.use!.why.c2).toBe((ITEM[ESSENCE] as any).requires_to_use[0].why);
  });
  it('a stim still works through the same action (its own act, useStim): it heals a friend off the map, from the count', () => {
    const g = inShop((x) => { x.characters.c1.stims = 2; x.characters.c2.hp = 1; });
    const row = giveView(g, 'host').rows.find((r) => r.key === 'count:' + STIM)!;
    expect(row.use!.action).toEqual({ type: 'gear/use', charId: 'c1', item: STIM }); expect(row.use!.why.c2).toBeNull();
    const a = apply(g, { ...row.use!.action, targetId: 'c2' } as any, 'host');
    expect(a.characters.c2.hp).toBeGreaterThan(1); expect(a.characters.c2.hp).toBeLessThanOrEqual(maxHp(a.characters.c2)); expect(a.characters.c1.stims).toBe(1);
    expect(refused(inFight((x) => { x.characters.c1.stims = 1; }), { type: 'gear/use', charId: 'c1', item: STIM, targetId: 'c2' })).toBe('The fight is on: stim on the combat grid.');
  });
});
