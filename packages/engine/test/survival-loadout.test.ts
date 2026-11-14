// Rules 1.52 (Leon, 14 Nov 2026: gear is given by the mode; the Survival loadout): creation makes a bare character;
// the camp before node 1 (run/loadout, run/ready) through the one reducer, its refusals in words, the budget at the one
// price door (priceOf), the unspent budget kept as credits, a declined focus, the weight refusal, Recommended, the host's
// close; a campaign gives a bare character its loadout; a character made with a kit (an old draft, a test) keeps it.
import { describe, expect, it } from 'vitest';
import { type GameState, newGame, apply, RuleError, newCharacter, validateSheet, creditsOf, packOf, priceOf, carriedKg, carryLimit, viewFor,
  LOADOUT, RACK, archetypeWeapons, loadoutLines, loadoutSpent, recommendedPick, startOffer, kitFor, campaignLoadout, KITS, WEAPON, quiversOf, quiverHolds } from '../src';
import { sheetOf } from './helpers/perkfight';
import svJ from '../../../data/survival.json';

const SV: any = svJ;
const HOST = 'host', P2 = 'p2';
const refused = (g: GameState, a: any, by = HOST) => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
/** A sheet as creation makes it now: no kit. */
const bareSheet = (name: string) => { const s: any = { ...sheetOf({ name }) }; delete s.kit; return s; };
/** A Survival room in its lobby with one bare character a player (the host's Kade; with two, Mai's Ha). */
function room(two = false): GameState {
  let g = newGame('LOAD01', { id: HOST, name: 'Leon' }, 'seed-load'); g.settings.play = 'survival';
  if (two) g = apply(g, { type: 'player/join', id: P2, name: 'Mai' }, HOST);
  g = apply(g, { type: 'char/add', sheet: bareSheet('Kade') }, HOST);
  if (two) g = apply(g, { type: 'char/add', sheet: bareSheet('Ha') }, P2);
  return g;
}
const camp = (two = false) => apply(room(two), { type: 'run/start', seed: 'PHC-0001' }, HOST);
const idOf = (g: GameState, name: string) => Object.values(g.characters).find((c) => c.name === name)!.id;
const lo = (g: GameState, name: string, a: any, by = HOST) => apply(g, { type: 'run/loadout', charId: idOf(g, name), ...a }, by);
/** The free weapon of an archetype (Leon, 14 Nov 2026: the most basic of each), and the rack's better one. */
const FREE = (id: string) => RACK.find((x) => x.id === id)!.free, BETTER = (id: string) => RACK.find((x) => x.id === id)!.better!;
/** Choose the first starting boon offered (rules 1.51: the camp's second step, before Ready). */
const boon = (g: GameState, name: string, by = HOST) => apply(g, { type: 'run/boon', charId: idOf(g, name), choice: 0 }, by);

describe('creation without a kit (rules 1.52)', () => {
  it('a sheet with no kit is legal and makes a bare character; a named kit still gives its gear', () => {
    const s = bareSheet('Kade');
    expect(validateSheet(s)).toBeNull();
    const c = newCharacter('c1', HOST, s);
    expect(c.bare).toBe(true); expect(c.weapon).toBe('fists'); expect(c.armourClass).toBe(0); expect(c.offHand).toBeNull(); expect(c.stims).toBe(0);
    expect(packOf(c).filter((x) => x.kind !== 'plot')).toEqual([]);
    const k = newCharacter('c2', HOST, sheetOf({ name: 'Old', kit: 'soldier' }));
    expect(k.bare).toBeUndefined(); expect(k.weapon).toBe(KITS.soldier.weapon); expect(k.armourClass).toBe(KITS.soldier.armourClass);
  });
  it('a campaign gives a bare character the campaign\'s loadout at the session\'s start (the door skill picks the kit)', () => {
    let g = newGame('CAMP01', { id: HOST, name: 'Leon' }, 'seed-camp'); g.settings.play = 'campaign';
    g = apply(g, { type: 'char/add', sheet: bareSheet('Kade') }, HOST);
    const s = apply(g, { type: 'session/start' }, HOST), c = Object.values(s.characters)[0];
    const kit = kitFor(c, campaignLoadout(s.campaign as any));
    expect(c.bare).toBeUndefined(); expect(c.weapon).toBe(KITS[kit].weapon); expect(c.armourClass).toBe(KITS[kit].armourClass);
    expect(kitFor({ skills: { brain_power: 2 } } as any, campaignLoadout(null))).toBe('sigil');
    expect(kitFor({ skills: { empathy: 1, will_power: 2 } } as any, campaignLoadout(null))).toBe('soul');
    expect(kitFor({ skills: {} } as any, campaignLoadout(null))).toBe('soldier');
    expect(kitFor({ skills: {} } as any, { kit: 'medic' })).toBe('medic'); // a campaign that names its own
  });
  it('the Proving Ground gears a bare character with the same default', () => {
    const g = apply(room(), { type: 'sandbox/start' }, HOST), c = Object.values(g.characters)[0];
    expect(c.bare).toBeUndefined(); expect(c.weapon).not.toBe('fists');
  });
});

describe('the camp (rules 1.52)', () => {
  it('run/start opens the camp: stripped, the budget in the purse, no node reachable; the view carries it', () => {
    const g = camp(), c = Object.values(g.characters)[0];
    expect(g.run!.state).toBe('loadout'); expect(c.weapon).toBe('fists'); expect(creditsOf(c)).toBe(LOADOUT.budget);
    expect(refused(g, { type: 'run/move', node: g.run!.nodes[0].id })).toMatch(/^Finish your loadout at the camp first/);
    expect(() => viewFor(g, HOST)).not.toThrow();
  });
  it('the free list is the most basic weapon of every archetype (Leon, 14 Nov); the rack holds it again and the next one up', () => {
    for (const a of LOADOUT.archetypes.list) {
      const ws = archetypeWeapons(a), r = RACK.find((x) => x.id === a.id)!;
      expect(r.free, a.id).toBe(ws[0]); expect(r.better, a.id).toBe(ws[1] || null);
      for (const id of ws) expect(priceOf(id)!, id).toBeGreaterThanOrEqual(priceOf(r.free)!);
      if (r.better) expect(priceOf(r.better)!).toBeGreaterThanOrEqual(priceOf(r.free)!);
    }
    const c = Object.values(camp().characters)[0], keys = loadoutLines(c).map((l) => l.key);
    for (const r of RACK) { expect(keys, r.id).toContain('stock:' + r.free); if (r.better) expect(keys, r.id).toContain('stock:' + r.better); }
    // what a better weapon over the whole budget is: shown, with the reason it can't be taken
    const over = RACK.filter((r) => r.better && priceOf(r.better)! > LOADOUT.budget);
    expect(over.length).toBeGreaterThan(0);
    const v = viewFor(camp(), HOST) as any; void v;
  });
  it('every archetype\'s free weapon finds its own ammunition on the menu, and each focus its cores', () => {
    for (const r of RACK) {
      const w: any = WEAPON[r.free]; if (!w.ammo) continue;
      const g = lo(camp(), 'Kade', { op: 'pick', slot: 'weapon', id: r.free }), c = Object.values(g.characters)[0], ls = loadoutLines(c);
      expect(ls.some((l) => l.id === 'mag:' + r.free || l.id === 'rounds:' + w.ammo), r.id).toBe(true);
    }
    const c = Object.values(camp().characters)[0];
    expect(loadoutLines(c).some((l) => l.id === 'standard_core')).toBe(true);
  });
  it('ONE free weapon and ONE free focus; a gun comes loaded and with a spare (which can be left behind for nothing), a bow with one quiver', () => {
    const P = 'service_pistol';
    let g = lo(camp(), 'Kade', { op: 'pick', slot: 'weapon', id: FREE('revolvers') });
    let c = Object.values(g.characters)[0], w: any = WEAPON[FREE('revolvers')];
    expect(c.weapon).toBe(FREE('revolvers')); expect(c.loaded).toBe(w.magazine); expect(packOf(c).find((x) => x.weapon === c.weapon && x.mags)!.mags).toEqual([w.magazine]);
    expect(creditsOf(c)).toBe(LOADOUT.budget); // free
    g = lo(g, 'Kade', { op: 'spare', keep: false }); c = Object.values(g.characters)[0];
    expect(packOf(c).some((x) => x.weapon === c.weapon && x.mags)).toBe(false); expect(creditsOf(c)).toBe(LOADOUT.budget); // nothing given for it
    g = lo(g, 'Kade', { op: 'spare', keep: true }); c = Object.values(g.characters)[0];
    expect(packOf(c).find((x) => x.weapon === c.weapon && x.mags)!.mags).toEqual([w.magazine]);
    g = lo(g, 'Kade', { op: 'take', key: 'stock:' + BETTER('pistols') }); c = Object.values(g.characters)[0]; // the rack's better pistol, at its price
    expect(BETTER('pistols')).toBe(P); expect(packOf(c).some((x) => (x.weapon || x.id) === P)).toBe(true); expect(creditsOf(c)).toBe(LOADOUT.budget - priceOf(P)!);
    g = lo(g, 'Kade', { op: 'take', key: 'stock:' + P, qty: -1 }); c = Object.values(g.characters)[0]; // sold back at the full price: removed
    expect(creditsOf(c)).toBe(LOADOUT.budget);
    g = lo(g, 'Kade', { op: 'pick', slot: 'weapon', id: FREE('bows') }); c = Object.values(g.characters)[0];
    expect(c.weapon).toBe(FREE('bows')); expect(quiversOf(c)).toHaveLength(1); expect(c.loaded).toBe(quiverHolds()); // one quiver, full (rules 1.53)
    expect(packOf(c).some((x) => x.weapon === FREE('revolvers'))).toBe(false); // ONE weapon: the revolver went back
    g = lo(g, 'Kade', { op: 'pick', slot: 'focus', id: 'evoker' }); c = Object.values(g.characters)[0];
    expect(c.offHand).toBeNull(); expect(packOf(c).some((x) => x.id === 'evoker' && x.kind === 'focus')).toBe(true); // a bow takes both hands: the focus is packed
    expect(packOf(c).find((x) => x.id === 'standard_core')?.qty).toBe(LOADOUT.focus_with.evoker[0].qty);
    g = lo(g, 'Kade', { op: 'pick', slot: 'weapon', id: FREE('light_blades') }); c = Object.values(g.characters)[0];
    expect(c.offHand).toEqual({ id: 'evoker' }); // a one-handed blade: the focus in the off hand
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'pick', slot: 'weapon', id: 'long_rifle' })).toMatch(/^The free weapon is one of: /);
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'pick', slot: 'focus', id: 'riot_shield' })).toMatch(/^The free focus is one of/);
  });
  it('a declined focus gives nothing back; the budget buys from the shop\'s menu at priceOf; what is left is kept as credits', () => {
    let g = lo(camp(), 'Kade', { op: 'pick', slot: 'weapon', id: FREE('smgs') });
    g = lo(g, 'Kade', { op: 'pick', slot: 'focus', id: null });
    let c = Object.values(g.characters)[0];
    expect(c.offHand).toBeNull(); expect(creditsOf(c)).toBe(LOADOUT.budget);
    g = lo(g, 'Kade', { op: 'take', key: 'stim_injector', qty: 2 }); c = Object.values(g.characters)[0];
    expect(c.stims).toBe(2); expect(creditsOf(c)).toBe(LOADOUT.budget - 2 * priceOf('stim_injector')!);
    g = lo(g, 'Kade', { op: 'take', key: 'stim_injector', qty: -1 }); c = Object.values(g.characters)[0];
    expect(c.stims).toBe(1); expect(creditsOf(c)).toBe(LOADOUT.budget - priceOf('stim_injector')!);
    expect(loadoutSpent(c, g.run!.loadout![c.id])).toBe(priceOf('stim_injector'));
    // the shop's own lines: the gun's magazine is on the menu, at the shop's price
    expect(loadoutLines(c).find((l) => l.key === 'mag:' + FREE('smgs'))!.price).toBe(priceOf('mag:' + FREE('smgs')));
    // over the budget: refused in words, nothing changes
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'take', key: 'stock:armour:2' })).toBe('Over the budget by ' + (priceOf('stim_injector')! + priceOf('armour:2')! - LOADOUT.budget) + ' credits (' + (priceOf('stim_injector')! + priceOf('armour:2')!) + ' of ' + LOADOUT.budget + ').');
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'take', key: 'field_kit', qty: -1 })).toBe('Kade has none of that to put back.');
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'take', key: 'nonsense' })).toBe('The camp doesn\'t stock that.');
  });
  it('armour: Light body armour takes most of the budget (Leon: "a character going out with armor will lack in many other things"); one class; a slot once', () => {
    let g = lo(camp(), 'Kade', { op: 'take', key: 'stock:armour:1' }), c = Object.values(g.characters)[0];
    expect(c.armourClass).toBe(1); expect(creditsOf(c)).toBe(LOADOUT.budget - priceOf('armour:1')!);
    expect(priceOf('armour:1')! / LOADOUT.budget).toBeGreaterThanOrEqual(0.5);
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'take', key: 'stock:armour:1' })).toBe('Body armour is one piece: take one class.');
    g = lo(g, 'Kade', { op: 'take', key: 'stock:work_gloves' });
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'take', key: 'stock:work_gloves' })).toBe('Work gloves: one is worn at a time.');
  });
  it('the weight refusal: past the carry limit, in words', () => {
    const c = Object.values(camp().characters)[0];
    // a character already carrying 19 kg (a body on its back) at a carry limit of 20 kg: the rifle does not fit
    const h: GameState = JSON.parse(JSON.stringify(camp())); h.characters[c.id].attrs.strength = 1;
    (h.characters[c.id] as any).traits = []; h.characters[c.id].carried = [{ npc: null, kg: 19 }];
    expect(refused(h, { type: 'run/loadout', charId: c.id, op: 'pick', slot: 'weapon', id: FREE('smgs') })).toMatch(/^Too heavy: Kade would carry [\d.]+ kg of 20 kg\.$/);
  });
  it('only the character\'s player changes it; Ready locks it; co-op: the run goes on when both are ready, the host closes for an away player with Recommended', () => {
    let g = camp(true); const ha = idOf(g, 'Ha');
    expect(refused(g, { type: 'run/loadout', charId: ha, op: 'recommended' }, HOST)).toBe('Only Ha\'s player makes Ha\'s loadout.');
    expect(refused(g, { type: 'run/ready' }, HOST)).toBe('Choose Kade\'s starting boon first.'); // rules 1.51: the loadout, then the boon, then Ready
    g = apply(boon(g, 'Kade'), { type: 'run/ready' }, HOST); expect(g.run!.state).toBe('loadout');
    expect(refused(g, { type: 'run/loadout', charId: idOf(g, 'Kade'), op: 'clear' })).toBe('Kade is marked ready: take the mark back to change the loadout.');
    const both = apply(boon(apply(g, { type: 'run/loadout', charId: ha, op: 'recommended' }, P2), 'Ha', P2), { type: 'run/ready' }, P2);
    expect(both.run!.state).toBe('map'); expect(both.run!.loadout).toBeNull();
    for (const c of Object.values(both.characters)) expect(c.bare).toBeUndefined();
    expect(refused(both, { type: 'run/ready' }, P2)).toBe('The camp is closed.');
    // the host's close: Ha untouched takes the Recommended loadout
    const closed = apply(camp(true), { type: 'run/ready', close: true }, HOST), h = closed.characters[ha];
    expect(closed.run!.state).toBe('map'); expect(h.weapon).toBe(recommendedPick(h, { pack: [], worn: {} }).weapon);
    expect(h.relics).toEqual([startOffer(h, closed.run!.seed)[0]]); // and the first starting boon offered
    expect(refused(camp(true), { type: 'run/ready', close: true }, P2)).toBe('Only the host starts the run for everyone: mark Ready.');
  });
  it('Recommended: Class 1 armour first, then the door\'s core for a Sigilist, a stim for a gunner and a blade, a field kit for a healer; the arithmetic', () => {
    const rec = (skills: Record<string, number>) => { let g = camp(); const id = idOf(g, 'Kade'); g.characters[id].skills = skills; g = lo(g, 'Kade', { op: 'recommended' }); return { c: g.characters[id], p: g.run!.loadout![id] }; };
    const gun = rec({ dexterity: 3 });
    expect(gun.c.weapon).toBe(FREE('rifles')); expect(gun.c.armourClass).toBe(1); expect(gun.c.offHand).toBeNull();
    expect(creditsOf(gun.c)).toBe(LOADOUT.budget - loadoutSpent(gun.c, gun.p));
    const blade = rec({ raw_power: 3, dexterity: 1 });
    expect(blade.c.weapon).toBe(FREE('heavy_melee')); expect(blade.c.armourClass).toBe(1); expect(creditsOf(blade.c)).toBe(LOADOUT.budget - loadoutSpent(blade.c, blade.p));
    const sig = rec({ brain_power: 3, dexterity: 1 });
    expect(sig.c.weapon).toBe(FREE('pistols')); expect(sig.c.offHand).toEqual({ id: 'evoker' });
    expect(packOf(sig.c).find((x) => x.id === 'standard_core')!.qty).toBe(LOADOUT.focus_with.evoker[0].qty + 1);
    const heal = rec({ empathy: 3 });
    expect(heal.c.offHand).toEqual({ id: 'attuner' }); expect(packOf(heal.c).some((x) => x.id === 'field_kit')).toBe(true); expect(heal.c.armourClass).toBe(1);
    for (const x of [gun, blade, sig, heal]) { expect(loadoutSpent(x.c, x.p)).toBeLessThanOrEqual(LOADOUT.budget); expect(carriedKg(x.c).total).toBeLessThanOrEqual(carryLimit(x.c)); }
    expect(SV.run.start_credits).toBe(0); // the old flat purse (150) is replaced by the unspent budget
  });
});
