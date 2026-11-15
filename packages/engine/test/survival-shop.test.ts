// The Survival shop through the one reducer (rules 1.42; survival-spec rules 11, 25 to 27, sections 3.4 and 8.3; build
// step 4): a shop node opens full screen with its setting's face and today's rolled stock; the counter sells every
// calibre and the always-stocked list, never sold out, at priceOf's fixed price; a rolled piece goes to the first buyer
// ("Sold to <name>" for the rest); each character pays from its own purse; selling pays sell_rate of the price at the
// item's own rarity and mods; every refusal is in words; the party leaves when everyone is ready or the host closes.
// The gear preview (spec item 14) gives the card's numbers from the fight's own unit build. Numbers read from data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, shopView, RuleError, reachable, creditsOf, priceOf, counterLines, linePrice, sellValue, rollStock, faceFor, FACES, SHOP_DATA, SELL_RATE, ROUND_PRICE, emptyMagPrice,
  gearPreview, compareGear, registerShopService, shopServices, packOf, WEAPON, ITEM, RARITY, runMoveProblem, magazineWorth, type RunNode } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import { type Pc } from './helpers/replay';
import svJ from '../../../data/survival.json';
import rulesJ from '../../../data/rules.json';

const SV: any = svJ, RJ: any = rulesJ;
const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const started = (pcs: Pc[], seed = 'PHC-0001') => startRun(survivalRoom(seed, pcs, { test: true }), seed);
const take = (g: GameState, node: RunNode, n: number) => { let x = g; for (let i = 0; i < n && x.run!.at !== node.id; i++) x = apply(x, { type: 'run/move', node: node.id }, ownerOf(i)); return x; };
/** A run standing at the node before the first shop, then into the shop (both players mark it). */
function inShop(pcs: Pc[] = DUO, seed = 'PHC-0001', rich: number | null = null): GameState {
  const g = started(pcs, seed), shop = g.run!.nodes.find((n) => n.kind === 'shop')!, prev = g.run!.nodes.find((x) => x.links.includes(shop.id))!;
  const x: GameState = JSON.parse(JSON.stringify(g)); x.run!.at = prev.id; x.run!.state = 'map';
  if (rich != null) for (const c of Object.values(x.characters)) c.credits = rich;
  return take(x, shop, pcs.length);
}
const purse = (g: GameState, id = 'c1') => creditsOf(g.characters[id]);

describe('Survival shop (rules 1.42)', () => {
  it('a shop node opens the shop at once: the setting\'s face greets, today\'s stock is rolled, the run waits in it', () => {
    const g = inShop(), sh = g.run!.shop!;
    expect(g.run!.state).toBe('shop');
    const face = faceFor('shop', g.run!.world[0].setting)!;
    expect(sh.face).toBe(face.id); expect(face.lines.greet).toContain(sh.line.text);
    const S = SHOP_DATA.stock; expect(sh.stock.length).toBe(S.weapons + S.items + S.rare);
    expect(reachable(g.run!)).toEqual([]);
    expect(runMoveProblem(g, 'host', g.run!.nodes[0].id)).toBe('Leave the shop first: everyone marks ready, or the host closes it.');
  });

  it('the stock is the seed\'s (same seed, same stock), capped at Fine in stage 1, priced by priceOf at the face\'s price', () => {
    const node = { id: 'n5-1', depth: 5 }, face = FACES.find((f) => f.id === 'quartermaster')!;
    expect(rollStock('PHC-0001', node, 1, face)).toEqual(rollStock('PHC-0001', node, 1, face));
    for (let i = 0; i < 300; i++) for (const p of rollStock('S' + i, node, 1, face)) {
      expect(['standard', 'fine']).toContain(p.rarity);
      expect(p.price).toBe(Math.round(priceOf(p.id, p.rarity)! * face.price));
    }
    for (let i = 0; i < 200; i++) for (const p of rollStock('S' + i, node, 2, face)) expect(['standard', 'fine', 'masterwork']).toContain(p.rarity);
  });

  it('the counter: every calibre (twelve), the special rounds, thrown, cores, supplies, priced; the guns shelf for every gun carried', () => {
    const g = inShop(); g.characters.c1.weapon = 'hellraiser_service_rifle'; // a magazine-fed gun in hand (rules 1.52: the camp's free rifle loads round by round)
    const lines = counterLines(Object.values(g.characters));
    // rules 1.55: ammunition follows the characters: the calibres of the guns carried, no other
    const cal = lines.filter((l) => l.shelf === 'calibres').map((l) => l.id.slice('rounds:'.length));
    const takes = new Set(Object.values(g.characters).flatMap((c) => [c.weapon, ...packOf(c).map((x) => x.weapon)]).map((id) => (WEAPON[id || ''] as any)?.ammo).filter(Boolean));
    expect(cal.sort()).toEqual(RJ.weapons_rules.calibres.map((c: any) => c.id).filter((c: string) => takes.has(c)).sort());
    for (const id of ['ammo_armor_piercing', 'ammo_hollow_point', 'ammo_incendiary', 'ammo_enhanced', 'frag_grenade', 'smoke_grenade', 'flashbang', 'incendiary_grenade', 'standard_core', 'spare_parts', 'stim_injector', 'field_kit', 'ration_pack'])
      expect(lines.some((l) => l.id === id)).toBe(true);
    for (const l of lines) if (!l.res) expect(linePrice(l)).toBeGreaterThan(0);
    const gun = g.characters.c1.weapon; expect(lines.some((l) => l.shelf === 'magazines' && l.id === 'mag:' + gun)).toBe(true);
    expect(lines.some((l) => l.shelf === 'magazines' && l.id === 'mag:' + gun + ':0')).toBe(true); // rules 1.55: and an empty one
    expect(priceOf('mag:' + gun + ':0')).toBe(emptyMagPrice(gun)); // the same formula with no rounds
    // the prices are the Core Rules' table: a full magazine is the empty magazine and its rounds; a special round its price_mult x the reference calibre
    const w: any = WEAPON[gun]; expect(priceOf('mag:' + gun)).toBe(emptyMagPrice(gun)! + w.magazine * ROUND_PRICE[w.ammo]);
    expect(priceOf('ammo_armor_piercing')).toBe((ITEM as any).ammo_armor_piercing.price_mult * ROUND_PRICE[RJ.weapons_rules.special_round_price.calibre]);
    expect(priceOf('rounds:rifle')).toBe(ROUND_PRICE.rifle);
  });

  it('buy ammunition: the purse pays the exact price, the rounds go into the buyer\'s pack, the other purse is untouched; never sold out', () => {
    let g = inShop(DUO, 'PHC-0001', 2000);
    const l = counterLines(Object.values(g.characters)).find((x) => x.id === 'rounds:rifle')!;
    const before = packOf(g.characters.c1).filter((p) => p.calibre === 'rifle' && !p.mags).reduce((t, p) => t + p.qty, 0);
    g = apply(g, { type: 'run/buy', charId: 'c1', key: l.key, qty: 2 }, 'host');
    expect(purse(g)).toBe(2000 - linePrice(l) * 2); expect(purse(g, 'c2')).toBe(2000);
    expect(packOf(g.characters.c1).filter((p) => p.calibre === 'rifle' && !p.mags).reduce((t, p) => t + p.qty, 0)).toBe(before + l.per * 2);
    // rules 1.55: the counter sells a character only what fits it: no rifle rounds for one without a rifle
    if (!counterLines([g.characters.c2]).some((x) => x.key === l.key)) expect(refused(g, { type: 'run/buy', charId: 'c2', key: l.key }, 'p2')).toBe('This shop does not sell that.');
    else g = apply(g, { type: 'run/buy', charId: 'c2', key: l.key }, 'p2');
    expect(g.run!.shop!.log[0]).toMatch(/bought/);
    const stim = counterLines(Object.values(g.characters)).find((x) => x.id === 'stim_injector')!, s0 = g.characters.c1.stims || 0;
    g = apply(g, { type: 'run/buy', charId: 'c1', key: stim.key, qty: 3 }, 'host');
    expect(g.characters.c1.stims).toBe(s0 + 3); // a stim joins the count the fight spends
  });

  it('rules 1.55: an empty magazine is bought at the empty price, joins the spares with 0 rounds, and gear/load fills it from loose rounds', () => {
    let g = inShop(DUO, 'PHC-0001', 2000); const gun = 'hellraiser_service_rifle', w: any = WEAPON[gun]; g.characters.c1.weapon = gun;
    const spares = () => packOf(g.characters.c1).find((x) => x.weapon === gun && x.mags)?.mags || [];
    const n0 = spares().length;
    g = apply(g, { type: 'run/buy', charId: 'c1', key: 'mag:' + gun + ':0' }, 'host');
    expect(purse(g)).toBe(2000 - emptyMagPrice(gun)!); expect(spares()).toHaveLength(n0 + 1); expect(spares()[n0]).toBe(0);
    const rl = counterLines([g.characters.c1]).find((x) => x.id === 'rounds:' + w.ammo)!;
    g = apply(g, { type: 'run/buy', charId: 'c1', key: rl.key }, 'host');
    const loose = packOf(g.characters.c1).filter((x) => x.calibre === w.ammo && !x.mags).reduce((t, x) => t + x.qty, 0), room = spares().slice(0, n0).reduce((t, m) => t + w.magazine - m, 0);
    g = apply(g, { type: 'gear/load', charId: 'c1' }, 'host');
    expect(spares()[n0]).toBe(Math.max(0, Math.min(w.magazine, loose - room))); expect(spares()[n0]).toBeGreaterThan(0);
  });

  it('buy a rolled piece: the first buyer takes it; the second hears "Sold to <name>."; it arrives at its rarity', () => {
    let g = inShop(DUO, 'PHC-0001', 99999);
    const p = g.run!.shop!.stock.find((x) => WEAPON[x.id] || (ITEM as any)[x.id]?.focus)!;
    g = apply(g, { type: 'run/buy', charId: 'c1', key: p.key }, 'host');
    expect(purse(g)).toBe(99999 - p.price);
    expect(g.run!.shop!.stock.find((x) => x.key === p.key)!.sold).toBe('c1');
    const got = [...packOf(g.characters.c1)].reverse().find((x) => (x.weapon || x.item || x.id) === p.id)!;
    expect(got).toBeTruthy(); if (p.rarity !== 'standard') expect(got.rarity).toBe(p.rarity);
    expect(refused(g, { type: 'run/buy', charId: 'c2', key: p.key }, 'p2')).toBe('Sold to ' + g.characters.c1.name + '.');
  });

  it('refusals in words: short credits (and the keeper\'s line), quantity, not your character, not sold here, no shop', () => {
    const g = inShop(DUO, 'PHC-0001', 10), l = counterLines(Object.values(g.characters)).find((x) => x.id === 'field_kit')!;
    expect(refused(g, { type: 'run/buy', charId: 'c1', key: l.key })).toBe(g.characters.c1.name + ' is ' + (linePrice(l) - 10) + ' credits short.');
    expect(refused(g, { type: 'run/buy', charId: 'c1', key: l.key, qty: 0 })).toBe('You can buy 1 to ' + SHOP_DATA.max_qty + ' at a time.');
    expect(refused(g, { type: 'run/buy', charId: 'c1', key: l.key, qty: SHOP_DATA.max_qty + 1 })).toBe('You can buy 1 to ' + SHOP_DATA.max_qty + ' at a time.');
    expect(refused(g, { type: 'run/buy', charId: 'c2', key: l.key }, 'host')).toBe('Only ' + g.characters.c2.name + '\'s player spends ' + g.characters.c2.name + '\'s credits.');
    expect(refused(g, { type: 'run/buy', charId: 'c1', key: 'grimoire' })).toBe('This shop does not sell that.');
    expect(refused(g, { type: 'run/buy', charId: 'zz', key: l.key })).toBe('No such character.');
    const p = g.run!.shop!.stock[0]; expect(refused(g, { type: 'run/buy', charId: 'c1', key: p.key, qty: 2 })).toBe('There is only one of these.');
    expect(refused(started(DUO), { type: 'run/buy', charId: 'c1', key: l.key })).toBe('No shop is open here.');
    expect(refused(g, { type: 'run/restock', charId: 'c1', res: 'toxins' })).toBe('This shop does not sell that.');
  });

  it('sell at sell_rate of the price at the item\'s own rarity with its mods; a plot item can\'t be sold; stacks sell by quantity', () => {
    let g = inShop(DUO, 'PHC-0001', 0);
    const c = g.characters.c1; c.pack = [...packOf(c), { id: 'hellraiser_service_rifle', name: 'Fine rifle', qty: 1, kind: 'weapon', weapon: 'hellraiser_service_rifle', rarity: 'fine', mods: ['mod_red_dot'] },
      { id: 'plot:locket', name: 'A locket', qty: 1, kind: 'plot' } as any];
    const i = packOf(c).length - 2, want = Math.floor((priceOf('hellraiser_service_rifle', 'fine')! + priceOf('mod_red_dot')!) * SELL_RATE);
    expect(sellValue(packOf(c)[i])).toBe(want); expect(SELL_RATE).toBe(SV.sell_rate.rate);
    expect(refused(g, { type: 'run/sell', charId: 'c1', idx: i + 1 })).toBe('A locket can\'t be sold.');
    expect(refused(g, { type: 'run/sell', charId: 'c1', idx: 99 })).toBe('Nothing there in ' + c.name + '\'s pack.');
    expect(refused(g, { type: 'run/sell', charId: 'c1', idx: i }, 'p2')).toMatch(/^Only .+'s player spends/);
    g = apply(g, { type: 'run/sell', charId: 'c1', idx: i }, 'host');
    expect(purse(g)).toBe(want); expect(packOf(g.characters.c1).some((x) => x.rarity === 'fine')).toBe(false);
    expect(g.run!.shop!.log[0]).toMatch(new RegExp('^' + c.name + ' sold Fine rifle.* for ' + want + ' credits$'));
    // a stack of loose rounds sells by quantity at the counter's round price
    const k = packOf(g.characters.c1).findIndex((x) => x.calibre && !x.mags);
    if (k >= 0) { const it = packOf(g.characters.c1)[k], q = Math.min(10, it.qty), p0 = purse(g);
      g = apply(g, { type: 'run/sell', charId: 'c1', idx: k, qty: q }, 'host');
      expect(purse(g)).toBe(p0 + Math.floor(ROUND_PRICE[it.calibre!] * q * SELL_RATE)); }
  });

  it('leaving: each player\'s Ready; the party goes when everyone is; the host may close at once, a guest may not', () => {
    const g = inShop();
    const one = apply(g, { type: 'run/leave' }, 'host');
    expect(one.run!.state).toBe('shop'); expect(one.run!.ready).toEqual({ host: true });
    const both = apply(one, { type: 'run/leave' }, 'p2');
    expect(both.run!.state).toBe('map'); expect(both.run!.shop).toBeNull(); expect(reachable(both.run!).length).toBeGreaterThan(0);
    expect(refused(g, { type: 'run/leave', close: true }, 'p2')).toBe('Only the host can close the shop for everyone. Mark yourself ready to leave instead.');
    const closed = apply(g, { type: 'run/leave', close: true }, 'host');
    expect(closed.run!.state).toBe('map');
    expect(refused(closed, { type: 'run/leave' })).toBe('No shop is open here.');
  });

  it('the services shelf is a registry: a service plugs its cards in by node kind (the seam for the grade step)', () => {
    registerShopService({ id: 'test:svc', tab: 'upgrade', kinds: ['forge'], cards: () => [] });
    expect(shopServices('forge').some((s) => s.id === 'test:svc')).toBe(true);
    expect(shopServices('shop').some((s) => s.id === 'test:svc')).toBe(false);
  });

  it('the gear preview (spec item 14): to hit and damage from the fight\'s unit build; a Fine weapon is one point (5%) more likely to hit; compare reads better and worse', () => {
    const g = started(DUO), c = g.characters.c1, gun = c.weapon;
    const std = gearPreview(c, { id: gun }), fine = gearPreview(c, { id: gun, rarity: 'fine' });
    const hit = (p: any) => p.lines.find((l: any) => l.key === 'hit').num, dmg = (p: any) => p.lines.find((l: any) => l.key === 'dmg').num;
    expect(hit(std)).toBeGreaterThanOrEqual(5); expect(hit(std)).toBeLessThanOrEqual(95); expect(dmg(std)).toBeGreaterThan(0);
    expect(hit(fine)).toBe(Math.min(95, hit(std) + 5 * RARITY.fine.acc));
    const cmp = compareGear(c, { id: gun, rarity: 'fine' });
    expect(cmp.held!.id).toBe(gun); expect(cmp.rows.find((r) => r.key === 'hit')!.diff).toBe(RARITY.fine.acc > 0 ? 'better' : 'same');
    expect(JSON.stringify(g.characters.c1)).toBe(JSON.stringify(c)); // the preview changes nothing
    const p = gearPreview(c, { id: 'field_kit' }); expect(p.kind).toBe('item'); expect(gearPreview(c, { id: 'torch' }).kind).toBe('item');
    expect(magazineWorth('ork_machete')).toEqual([]); // a picked blade takes no magazine (it once gave a stray plot item)
    const r = gearPreview(c, { id: 'rounds:rifle' }); expect(r.kind).toBe('ammo');
  });
});
