// Rules 1.52 (Leon, 14 Nov 2026: gear is given by the mode; the Survival loadout): creation makes a bare character;
// the camp before node 1 (run/loadout, run/ready) through the one reducer, its refusals in words, the budget at the one
// price door (priceOf), the unspent budget kept as credits, a declined focus, the weight refusal, Recommended, the host's
// close; a campaign gives a bare character its loadout; a character made with a kit (an old draft, a test) keeps it.
import { describe, expect, it } from 'vitest';
import { isShieldId, type GameState, newGame, apply, RuleError, newCharacter, validateSheet, creditsOf, packOf, priceOf, roundsIdOf, carriedKg, carryLimit, viewFor,
  LOADOUT, RACK, archetypeWeapons, loadoutLines, loadoutSpent, recommendedPick, loadoutView, startOffer, kitFor, campaignLoadout, KITS, WEAPON, quiversOf, quiverHolds, ITEM, twoHands, emptyMagPrice } from '../src';
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
    // rules 1.55: with nothing held, the rack lists every weapon within the budget (once: a line on a counter shelf is not repeated)
    const c = Object.values(camp().characters)[0], ls = loadoutLines(c), keys = ls.map((l) => l.key);
    for (const r of RACK) for (const id of [r.free, ...(r.better ? [r.better] : [])]) {
      const elsewhere = ls.some((l) => l.id === id && l.shelf !== 'rack');
      expect(keys.includes('stock:' + id), id).toBe(priceOf(id)! <= LOADOUT.budget && !elsewhere);
    }
    expect(ls.filter((l) => l.price > LOADOUT.budget)).toEqual([]);
    const v = viewFor(camp(), HOST) as any; void v;
  });
  it('every archetype\'s free weapon finds its own ammunition on the menu, and each focus its cores', () => {
    for (const r of RACK) {
      const w: any = WEAPON[r.free]; if (!w.ammo) continue;
      const g = lo(camp(), 'Kade', { op: 'pick', slot: 'weapon', id: r.free }), c = Object.values(g.characters)[0], ls = loadoutLines(c);
      expect(ls.some((l) => l.id === 'mag:' + r.free || l.id === 'rounds:' + w.ammo), r.id).toBe(true);
    }
    // rules 1.55: cores only for a focus that burns them (`fuel`), none for no focus or an MP focus
    const c = Object.values(camp().characters)[0];
    expect(loadoutLines(c).some((l) => l.id === 'standard_core')).toBe(false);
    for (const f of LOADOUT.focuses) { const x = Object.values(lo(camp(), 'Kade', { op: 'pick', slot: 'focus', id: f }).characters)[0];
      expect(loadoutLines(x).some((l) => l.id === 'standard_core'), f).toBe((ITEM[f] as any).focus.fuel === (ITEM.standard_core as any).fuel); }
  });
  it('rules 1.55: the camp offers what the character can use: nothing over the budget, no second focus, no second two-hander (another one only of a one-hander), no line twice, ammunition for what it holds', () => {
    const picks: any[] = [...RACK.map((r) => ({ slot: 'weapon', id: r.free })), ...LOADOUT.focuses.map((f) => ({ slot: 'focus', id: f }))];
    for (const pk of picks) {
      const c = Object.values(lo(camp(), 'Kade', { op: 'pick', ...pk }).characters)[0], ls = loadoutLines(c);
      expect(ls.filter((l) => l.price > LOADOUT.budget), pk.id).toEqual([]);
      expect(new Set(ls.map((l) => l.id + '#' + l.per)).size, pk.id).toBe(ls.length);
      if (pk.slot === 'focus') expect(ls.filter((l) => (ITEM[l.id] as any)?.focus), pk.id).toEqual([]);
      const held = c.weapon !== 'fists' ? c.weapon : null, wl = ls.filter((l) => (l.shelf === 'rack' || l.shelf === 'stock') && WEAPON[l.id]);
      if (held && twoHands(c, held)) { for (const l of wl) expect(twoHands(c, l.id), pk.id + ' ' + l.id).toBe(false); expect(wl.some((l) => l.id === held), pk.id).toBe(false); }
      if (held && !twoHands(c, held) && RACK.find((r) => r.free === held)!.free && priceOf(held)! <= LOADOUT.budget) expect(ls.some((l) => l.key === 'stock:' + held) || ls.some((l) => l.id === held && l.shelf !== 'rack'), pk.id).toBe(true); // another one of a one-hander
      const cals = new Set([held, ...packOf(c).map((x) => x.weapon)].map((id) => (WEAPON[id || ''] as any)?.ammo).filter(Boolean));
      for (const l of ls) { const r = roundsIdOf(l.id); if (r) expect(cals.has(r.calibre), pk.id + ' ' + l.id).toBe(true); } // rules 1.56: a special round's calibre too
    }
    // taking a pistol brings its rounds and both magazines (full and empty) onto the menu
    let g = lo(camp(), 'Kade', { op: 'pick', slot: 'weapon', id: FREE('light_blades') });
    const P = BETTER('pistols'), w: any = WEAPON[P];
    expect(loadoutLines(Object.values(g.characters)[0]).some((l) => l.id === 'rounds:' + w.ammo)).toBe(false);
    g = lo(g, 'Kade', { op: 'take', key: 'stock:' + P });
    const ls = loadoutLines(Object.values(g.characters)[0], g.run!.loadout![Object.values(g.characters)[0].id].take);
    expect(ls.some((l) => l.id === 'rounds:' + w.ammo)).toBe(true);
    expect(ls.find((l) => l.id === 'mag:' + P)?.shelf).toBe('magazines');
    expect(ls.find((l) => l.id === 'mag:' + P + ':0')?.price).toBe(emptyMagPrice(P));
    expect(ls.some((l) => l.key === 'stock:' + P)).toBe(true); // the line taken stays listed (a second one-hander may join it)
  });
  it('rules 1.55: a focus that burns cores comes with four of them (focus_with), free', () => {
    for (const f of LOADOUT.focuses) {
      const c = Object.values(lo(camp(), 'Kade', { op: 'pick', slot: 'focus', id: f }).characters)[0];
      const cores = packOf(c).filter((x) => x.id === 'standard_core').reduce((t, x) => t + x.qty, 0);
      expect(cores, f).toBe((ITEM[f] as any).focus.fuel === 'core' ? 4 : 0); expect(creditsOf(c)).toBe(LOADOUT.budget);
    }
  });
  it('ONE free weapon and ONE free focus; a gun comes loaded and with a spare (which can be left behind for nothing), a bow with one quiver', () => {
    const P = 'service_pistol';
    let g = lo(camp(), 'Kade', { op: 'pick', slot: 'weapon', id: FREE('revolvers') });
    let c = Object.values(g.characters)[0], w: any = WEAPON[FREE('revolvers')];
    expect(c.weapon).toBe(FREE('revolvers')); expect(c.loaded).toBe(w.magazine); expect(packOf(c).find((x) => x.weapon === c.weapon && x.mags)!.mags).toEqual(Array(SV.loadout.gun.spare).fill(w.magazine));
    expect(creditsOf(c)).toBe(LOADOUT.budget); // free
    g = lo(g, 'Kade', { op: 'spare', keep: false }); c = Object.values(g.characters)[0];
    expect(packOf(c).some((x) => x.weapon === c.weapon && x.mags)).toBe(false); expect(creditsOf(c)).toBe(LOADOUT.budget); // nothing given for it
    g = lo(g, 'Kade', { op: 'spare', keep: true }); c = Object.values(g.characters)[0];
    expect(packOf(c).find((x) => x.weapon === c.weapon && x.mags)!.mags).toEqual(Array(SV.loadout.gun.spare).fill(w.magazine));
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
    g = lo(g, 'Kade', { op: 'take', key: 'stock:armour:1' });
    const sum = priceOf('stim_injector')! + priceOf('armour:1')! + priceOf('field_kit')!;
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'take', key: 'field_kit' })).toBe((sum - LOADOUT.budget) + ' over budget');
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
    expect(sig.c.weapon).toBe(FREE('revolvers')); expect(sig.c.offHand).toEqual({ id: 'evoker' });
    expect(packOf(sig.c).find((x) => x.id === 'standard_core')!.qty).toBe(LOADOUT.focus_with.evoker[0].qty + 1);
    const heal = rec({ empathy: 3 });
    expect(heal.c.offHand).toEqual({ id: 'attuner' }); expect(packOf(heal.c).some((x) => x.id === 'field_kit')).toBe(true); expect(heal.c.armourClass).toBe(1);
    for (const x of [gun, blade, sig, heal]) { expect(loadoutSpent(x.c, x.p)).toBeLessThanOrEqual(LOADOUT.budget); expect(carriedKg(x.c).total).toBeLessThanOrEqual(carryLimit(x.c)); }
    expect(SV.run.start_credits).toBe(0); // the old flat purse (150) is replaced by the unspent budget
  });
});

describe('the camp as a checklist and a shield for a tank (rules 1.55 items 49 to 53)', () => {
  /** A camp with one bare character of an archetype (archetypes.json), the host's. */
  const campOf = (archetype: string) => { let g = newGame('LOAD02', { id: HOST, name: 'Leon' }, 'seed-load'); g.settings.play = 'survival';
    const s: any = { ...sheetOf({ name: 'Kade', archetype } as any) }; delete s.kit; g = apply(g, { type: 'char/add', sheet: s }, HOST); return apply(g, { type: 'run/start', seed: 'PHC-0001' }, HOST); };
  const view = (g: GameState) => loadoutView(g as any, HOST)!;
  /** The camp's off-hand items (a shield): the fixed stock's items that go in the off hand and are not a focus (data). */
  const SHIELDS = LOADOUT.stock.ids.filter((id) => isShieldId(id)); // rules 1.57: shields are weapons.json rows (the one prop test)
  it('rules 1.55 item 49: the view says which cards are free, what each free pick holds and whether it is still open', () => {
    let g = campOf('sharpshooter'), v = view(g);
    expect(v.rack.every((a) => a.free.free && a.free.price === 0)).toBe(true);
    expect(v.rack.every((a) => (!a.again || !a.again.free) && (!a.better || !a.better.free))).toBe(true);
    expect(v.shelves.every((s) => s.cards.every((k) => !k.free && k.price > 0))).toBe(true);
    expect(v.focus.every((k) => k.free)).toBe(true);
    expect(v.freePicks.weapon).toEqual({ offered: true, id: null, name: null, open: true });
    expect(v.freePicks.focus.offered).toBe(false); expect(v.freePicks.focus.open).toBe(false); // no door skill: no focus step
    g = lo(g, 'Kade', { op: 'pick', slot: 'weapon', id: FREE('rifles') }); v = view(g);
    expect(v.freePicks.weapon.open).toBe(false); expect(v.freePicks.weapon.id).toBe(FREE('rifles')); expect(v.freePicks.weapon.name).toBe((WEAPON[FREE('rifles')] as any).name);
    // a caster: the focus step is offered and open until taken; Recommended closes both
    g = campOf('sigilist'); v = view(g);
    expect(v.freePicks.focus).toEqual({ offered: true, id: null, name: null, open: true });
    const rec = recommendedPick(Object.values(g.characters)[0], g.run!.loadout![Object.values(g.characters)[0].id].base);
    expect(v.recommended.lines[0]).toBe((WEAPON[rec.weapon!] as any).name + ' (free)'); expect(v.recommended.lines[1]).toBe(ITEM[rec.focus!].name + ' (free)');
    expect(v.recommended.lines.length).toBe(2 + Object.keys(rec.take).length);
    g = lo(g, 'Kade', { op: 'recommended' }); v = view(g);
    expect(v.freePicks.weapon.open).toBe(false); expect(v.freePicks.focus.open).toBe(false); expect(v.recommended.left).toBe(v.left);
  });
  it('rules 1.55 item 50: a tank\'s camp offers the shield at priceOf; bought with a one-hander it is in the off hand; with a two-hander it is refused in words', () => {
    expect(SHIELDS.length).toBeGreaterThan(0);
    const S = SHIELDS[0], oneH = RACK.find((r) => !twoHands({ skills: {} } as any, r.free) && (WEAPON[r.free] as any).category !== 'bow')!.free, twoH = RACK.find((r) => twoHands({ skills: {} } as any, r.free))!.free;
    let g = campOf('bulwark');
    const card = view(g).shelves.flatMap((s) => s.cards).find((k) => k.id === S)!;
    expect(card.price).toBe(priceOf(S)); expect(card.price).toBeLessThanOrEqual(LOADOUT.budget); expect(card.why).toBeNull(); expect(card.free).toBe(false);
    g = lo(g, 'Kade', { op: 'pick', slot: 'weapon', id: oneH });
    g = lo(g, 'Kade', { op: 'take', key: card.key });
    const c = Object.values(g.characters)[0];
    expect(c.offHand?.id).toBe(S); expect(c.weapon).toBe(oneH); expect(creditsOf(c)).toBe(LOADOUT.budget - priceOf(S)!);
    expect(packOf(c).some((x) => (x.item || x.id) === S)).toBe(false);
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'take', key: card.key })).toMatch(/one is held at a time/);
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'pick', slot: 'weapon', id: twoH })).toBe(WEAPON[S].name + ': your main-hand weapon needs both hands.');
    // the card says so before it is pressed, with the two-hander held
    const g2 = lo(campOf('bulwark'), 'Kade', { op: 'pick', slot: 'weapon', id: twoH });
    expect(view(g2).shelves.flatMap((s) => s.cards).find((k) => k.id === S)!.why).toBe(WEAPON[S].name + ': your main-hand weapon needs both hands.');
  });
  it("rules 1.55 item 51, 1.59 T6: a Durability all-in's Recommended kit is a one-handed melee weapon (the cheapest of the rack) and the shield, accepted by the reducer; a gunner's is unchanged", () => {
    const row = LOADOUT.recommended.weapon.find((w) => w.top === 'durability')!;
    expect(row.archetype).toBeTruthy(); expect(LOADOUT.recommended.buys[row.profile!][0]).toBe(SHIELDS[0]);
    let g = campOf('living_wall'); const id = Object.values(g.characters)[0].id;
    g = lo(g, 'Kade', { op: 'recommended' }); const c = g.characters[id], p = g.run!.loadout![id];
    expect(c.weapon).toBe(p.weapon); expect(RACK.some((r) => r.free === c.weapon)).toBe(true); expect(twoHands(c, c.weapon)).toBe(false);
    expect(c.offHand?.id).toBe(SHIELDS[0]); expect(p.focus).toBeNull();
    expect(creditsOf(c)).toBe(LOADOUT.budget - loadoutSpent(c, p)); expect(carriedKg(c).total).toBeLessThanOrEqual(carryLimit(c));
    // rules 1.59 (T6): the row's archetype's free weapon, a one-handed melee weapon, the cheapest one-handed melee weapon the rack holds (its blows hit with Durability)
    expect(c.weapon).toBe(FREE(row.archetype!)); expect((WEAPON[c.weapon] as any).phys?.system).toBe('melee');
    const melee1 = RACK.map((r) => r.free).filter((w) => !twoHands(c, w) && (WEAPON[w] as any).phys?.system === 'melee');
    expect(melee1.every((w) => (priceOf(w) || 0) >= (priceOf(c.weapon) || 0))).toBe(true);
    // a gunner keeps the rifle, its armour and no shield
    const d = lo(campOf('deadeye'), 'Kade', { op: 'recommended' }), dc = Object.values(d.characters)[0];
    expect(dc.weapon).toBe(FREE('rifles')); expect(dc.armourClass).toBe(1); expect(dc.offHand ?? null).toBeNull();
  });
  it("rules 1.56 (the 0.28.3 merge): an Operative's Recommended kit is the pistol and the shadow buys, no focus, accepted by the reducer", () => {
    const row = LOADOUT.recommended.weapon.find((w) => w.top === 'ingenuity')!;
    expect(row.archetype).toBe('pistols'); expect(row.focus).toBe(false); expect(row.profile).toBe('shadow');
    let g = campOf('phantom'); const id = Object.values(g.characters)[0].id;
    g = lo(g, 'Kade', { op: 'recommended' }); const c = g.characters[id], p = g.run!.loadout![id];
    expect(c.weapon).toBe(FREE('pistols')); expect(p.focus).toBeNull();
    // the profile's buys in order while the budget pays: the first (a smoke grenade) is taken
    const first = LOADOUT.recommended.buys.shadow[0];
    expect(Object.keys(p.take).some((k) => loadoutLines(c).find((l) => l.key === k)?.id === first)).toBe(true);
    expect(creditsOf(c)).toBe(LOADOUT.budget - loadoutSpent(c, p)); expect(carriedKg(c).total).toBeLessThanOrEqual(carryLimit(c));
    expect(view(g).recommended.why).toBeNull();
  });
  it("rules 1.56 (the 0.28.3 merge): the Monk's Recommended weapon is the unarmed rack's free one (the Hand wraps), by its own archetype", () => {
    const row = LOADOUT.recommended.weapon.find((w) => w.character === 'monk')!;
    expect(row.archetype).toBe('unarmed');
    // the creation screen keeps its pick on the sheet (charfile.ts `archetype`): a sheet that names the Monk
    const monkCamp = (keep: boolean) => { let r = newGame('LOAD03', { id: HOST, name: 'Leon' }, 'seed-load'); r.settings.play = 'survival';
      const s: any = { ...sheetOf({ name: 'Kade', archetype: 'monk' } as any), ...(keep ? { archetype: 'monk' } : {}) }; delete s.kit;
      r = apply(r, { type: 'char/add', sheet: s }, HOST); return apply(r, { type: 'run/start', seed: 'PHC-0001' }, HOST); };
    let g = monkCamp(true); const id = Object.values(g.characters)[0].id;
    expect(g.characters[id].archetype).toBe('monk');
    g = lo(g, 'Kade', { op: 'recommended' }); const c = g.characters[id];
    expect(c.weapon).toBe(FREE('unarmed')); expect((WEAPON[c.weapon] as any).category).toBe('unarmed');
    expect((WEAPON[c.weapon] as any).variant_mods).toContain('open_hand'); // the Open Hand family's glove
    // the same skills without the Monk's archetype do not take the row
    let h = monkCamp(false); const hid = Object.values(h.characters)[0].id;
    h = lo(h, 'Kade', { op: 'recommended' }); expect(h.characters[hid].weapon).not.toBe(FREE('unarmed'));
  });
  it('rules 1.55 item 52: with the shield in the off hand a free focus is refused in words that say what to do', () => {
    let g = lo(campOf('living_wall'), 'Kade', { op: 'recommended' });
    const want = 'Your off hand holds the ' + WEAPON[SHIELDS[0]].name + '. Put it back to take a focus.';
    expect(refused(g, { type: 'run/loadout', charId: idOf(g, 'Kade'), op: 'pick', slot: 'focus', id: LOADOUT.focuses[0] })).toBe(want);
    expect(view(g).focus.find((k) => k.id === LOADOUT.focuses[0])!.why).toBe(want);
  });
  it('rules 1.56 (a shield in either hand): with a focus and no weapon picked the shield goes in the main hand; a second is refused', () => {
    const S = SHIELDS[0]; expect(S).toBeTruthy();
    let g = campOf('sigilist');
    g = lo(g, 'Kade', { op: 'pick', slot: 'focus', id: LOADOUT.focuses[0] });
    const key = view(g).shelves.flatMap((s) => s.cards).find((k) => k.id === S)!.key;
    g = lo(g, 'Kade', { op: 'take', key });
    const c = Object.values(g.characters)[0]; expect([c.weapon, c.offHand?.id]).toEqual([S, LOADOUT.focuses[0]]);
    // a second one: both hands are full (and the camp's budget pays for one shield only)
    expect(refused(g, { type: 'run/loadout', charId: c.id, op: 'take', key })).toMatch(/one is held at a time/);
  });
  it('rules 1.55 item 53: when the reducer would refuse the Recommended kit, the view says why (and nothing when it would not)', () => {
    let g = campOf('deadeye'); const id = idOf(g, 'Kade');
    expect(view(g).recommended.why).toBeNull();
    // a base pack over the carry limit (what the character brought from its traits): every kit is too heavy
    g.run!.loadout![id].base.pack.push({ id: SHIELDS[0], weapon: SHIELDS[0], name: WEAPON[SHIELDS[0]].name, qty: 200, kind: 'weapon' } as any);
    const why = view(g).recommended.why;
    expect(why).toMatch(/^Too heavy: /);
    expect(refused(g, { type: 'run/loadout', charId: id, op: 'recommended' })).toBe(why);
  });
});
