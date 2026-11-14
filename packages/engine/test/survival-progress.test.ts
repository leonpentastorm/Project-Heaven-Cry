// In-run progression (rules 1.43; survival-spec section 11, rules 25a, 26, 31, 37 to 46; build step 4a). The four
// primitives first (a focus's rarity on its door, setGrade, a gear instance's named property with `with_this`,
// addPractice), then each safe node through the one reducer: the grade step at a shop and at a Forge (price, the one a
// visit, the stage's ceiling, the Relic step and its property on the cap, the chit), the Forge's stock and fitting, the
// rest's and the training ground's trainings, the shrine's rite, piece and token, every Crossroads trade's gain and
// cost, the Elites' and caches' picks of kit, and the reward weapons' Relic property. Numbers are read from data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, creditsOf, priceOf, RARITY, unitFromCharacter, maxHp, packOf, setGrade, gearAt, gearProps,
  toHitTerms, focusAccTerm, previewAttack, withOffHand, saveAgainst, saveTn, addPractice, practiceOf, runOptions, relicChoices, gradePrice, GRADE_UP, TRAIN, TRAINING, TRADES,
  runWorth, capRoom, BOON_CAP, worthOf, relicRow, RELIC_PROPS, propFits, weaponOffer, pickedItem, cappedRarity, stageCeiling, lastingOffer, DEVOTION_XP, devotionXpOf, bindGame, FOCUS_IDS } from '../src';
import { physOf } from '../src';
import { survivalRoom, ownerOf } from './helpers/survival';
import { storyWith, fightWith } from './helpers/perkfight';
import type { Pc } from './helpers/replay';
import svJ from '../../../data/survival.json';

const SV: any = svJ;
const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const W = <T,>(g: GameState, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const started = (pcs: Pc[] = DUO, seed = 'PHC-0001') => apply(survivalRoom(seed, pcs, { test: true }), { type: 'run/start', seed, camp: 'recommended' }, 'host');
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
/** The squad at a node of this kind: a node of depth 3 or more made that kind, its way in walked (every player marks it). */
function visit(kind: string, o: { pcs?: Pc[]; stage?: number; credits?: number; prep?: (g: GameState) => void } = {}): GameState {
  const g0 = clone(started(o.pcs || DUO)), r = g0.run!;
  const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map'; if (o.stage) r.stage = o.stage;
  for (const c of Object.values(g0.characters)) c.credits = o.credits ?? 10000;
  o.prep?.(g0);
  let g = g0; for (let i = 0; i < (o.pcs || DUO).length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i)); // rules 1.48: one way forward, one click
  return g;
}

describe('rules 1.43: a focus\'s rarity on its door (spec rule 25a, item 9)', () => {
  it('a Fine weapon\'s attack is one point up (the existing reading), and a Fine Evoker\'s Sigil roll and an Emanator\'s Outburst roll too', () => {
    const s = storyWith([{ kit: 'soldier' }]), c = clone(s.g).characters.c1;
    const std = unitFromCharacter(c, '1,1', { state: 1 } as any).attack;
    c.weaponState = { ...(c.weaponState || {}), rarity: 'fine' };
    expect(unitFromCharacter(c, '1,1', { state: 1 } as any).attack - std).toBe(RARITY.fine.acc);
    for (const [kit, type, door] of [['sigil', 'sigil', 'brain_power'], ['soul', 'soul', 'will_power']] as const) {
      const f = fightWith([{ kit }], [{ tier: 'soldier' }]), g = f.g, u = f.pc, foe = f.foe, ch = g.characters[u.charId!];
      W(g, () => {
        expect(focusAccTerm(u, door)).toBeNull(); // a Standard focus adds nothing: the golden tables do not move
        const plain = toHitTerms(g.combat, u, foe, type);
        ch.offHand = { ...ch.offHand!, rarity: 'fine' };
        expect(toHitTerms(g.combat, u, foe, type).reduce((t, x) => t + x.v, 0) - plain.reduce((t, x) => t + x.v, 0)).toBe(RARITY.fine.acc);
        ch.offHand = { ...ch.offHand!, rarity: 'masterwork' };
        expect(focusAccTerm(u, door)!.v).toBe(RARITY.masterwork.acc);
        expect(toHitTerms(g.combat, u, foe, 'weapon').some((t) => /focus/.test(t.label))).toBe(false); // a weapon's own rarity is in its attack
        const pack = ch.offHand; ch.offHand = null; ch.pack = [...packOf(ch), { id: pack!.id, item: pack!.id, name: 'focus', qty: 1, kind: 'focus', rarity: 'masterwork' }];
        expect(focusAccTerm(u, door)).toBeNull(); // in the pack it counts for nothing
      });
    }
  });
  it('the saves a door forces are harder by the focus\'s accuracy (a Bond\'s through Empathy, a push\'s through Will Power)', () => {
    const f = fightWith([{ kit: 'sigil' }], [{ tier: 'soldier' }]), g = f.g, u = f.pc, foe = f.foe, ch = g.characters[u.charId!];
    W(g, () => {
      const a = saveAgainst(g.combat!, { state: 7 } as any, u, foe, 'brain', 'test', { via: 'brain_power' });
      ch.offHand = { ...ch.offHand!, rarity: 'fine' };
      const b = saveAgainst(g.combat!, { state: 7 } as any, u, foe, 'brain', 'test', { via: 'brain_power' });
      expect(b.tn - a.tn).toBe(RARITY.fine.acc); expect(a.tn).toBe(saveTn(u, 'brain_power'));
      const att = FOCUS_IDS.attuner[0]; ch.offHand = { id: att, rarity: 'fine' };
      expect(saveAgainst(g.combat!, { state: 7 } as any, u, foe, 'heart', 'test', { via: 'empathy' }).tn - saveTn(u, 'empathy')).toBe(RARITY.fine.acc);
    });
  });
});

describe('rules 1.43: setGrade and a gear instance\'s named property (items 10, 11)', () => {
  it('setGrade raises one instance, keeps its mods, name and property, restores its durability; refusals in words', () => {
    const c = clone(storyWith([{ kit: 'soldier' }]).g).characters.c1;
    c.weaponState = { mods: ['mod_compensator'], name: 'Old Faithful', dur: 3 };
    expect(setGrade(c, 'main', 'fine')).toBeNull();
    expect(c.weaponState).toMatchObject({ rarity: 'fine', mods: ['mod_compensator'], name: 'Old Faithful', dur: Math.round((priceOf(c.weapon) ? 1 : 1) * (unitFromCharacter(c, '1,1', { state: 1 } as any).maxDur || 0)) });
    expect(setGrade(c, 'main', 'relic', 'prop.keen')).toBeNull(); expect(c.weaponState!.prop).toBe('prop.keen');
    expect(setGrade(c, 'main', 'relic')).toBeNull(); expect(c.weaponState!.prop).toBe('prop.keen'); // kept unless named
    expect(setGrade(c, 'main', 'mythic' as any)).toMatch(/^There is no grade "mythic"/);
    c.pack = [...packOf(c), { id: 'note', name: 'A note', qty: 1, kind: 'plot', text: 'x' }];
    expect(setGrade(c, packOf(c).length - 1, 'fine')).toBe('A plot item has no grade.');
    expect(setGrade(c, 'off', 'fine')).toBe('There is no weapon or focus there to grade.');
  });
  it('a Relic\'s property is held and travels with its instance: hand, pack and back (gearProps), and counts on the cap', () => {
    const c = clone(storyWith([{ kit: 'soldier' }]).g).characters.c1;
    setGrade(c, 'main', 'relic', 'prop.keen');
    expect(gearProps(c)).toEqual(['prop.keen']); expect(runWorth(c)).toBe(worthOf('prop.keen')); expect(capRoom(c)).toBe(BOON_CAP - worthOf('prop.keen'));
    c.relics = ['boon.true_aim']; expect(runWorth(c)).toBe(worthOf('prop.keen') + worthOf('boon.true_aim'));
  });
  it('with_this: Keen works in hand, not in the pack, and not for another weapon\'s action', () => {
    const f = fightWith([{ kit: 'soldier' }], [{ tier: 'soldier' }]), g = f.g, u = f.pc, foe = f.foe, ch = g.characters[u.charId!];
    const keen = (x: any) => (x.dmg?.mults || []).some((t: any) => t.label === relicRow('prop.keen')!.name);
    W(g, () => {
      expect(keen(previewAttack(g.combat!, u, foe, 'shot'))).toBe(false);
      setGrade(ch, 'main', 'relic', 'prop.keen');
      const pv = previewAttack(g.combat!, u, foe, 'shot'); expect(keen(pv)).toBe(true);
      expect(pv.dmg!.mults.find((t: any) => t.label === 'Keen')!.v).toBe(RELIC_PROPS.find((p) => p.id === 'prop.keen')!.effects[0].value);
      ch.offHand = { id: 'service_pistol' }; u.offWeapon = 'service_pistol'; u.offAmmo = 8;
      expect(keen(withOffHand(u, () => previewAttack(g.combat!, u, foe, 'shot')))).toBe(false); // the off-hand pistol's attack
      const main = { id: ch.weapon, ...ch.weaponState }; ch.pack = [...packOf(ch), { id: main.id, name: 'rifle', qty: 1, kind: 'weapon', weapon: main.id, rarity: 'relic', prop: 'prop.keen' }];
      ch.weaponState = { rarity: 'relic' }; // the Keen one is in the pack now: the rifle in hand is another instance
      expect(keen(previewAttack(g.combat!, u, foe, 'shot'))).toBe(false);
    });
  });
  it('Deep (a focus property) adds to its own door\'s roll only, while in hand', () => {
    const f = fightWith([{ kit: 'sigil' }], [{ tier: 'soldier' }]), g = f.g, u = f.pc, foe = f.foe, ch = g.characters[u.charId!];
    W(g, () => {
      const base = toHitTerms(g.combat, u, foe, 'sigil').reduce((t, x) => t + x.v, 0);
      setGrade(ch, 'off', 'relic', 'prop.deep');
      const deep = RELIC_PROPS.find((p) => p.id === 'prop.deep')!.effects[0].value;
      expect(toHitTerms(g.combat, u, foe, 'sigil').reduce((t, x) => t + x.v, 0) - base).toBe(RARITY.relic.acc + deep);
      expect(toHitTerms(g.combat, u, foe, 'soul').some((t) => t.label === 'Deep')).toBe(false); // an Evoker's Deep is the Sigil's
    });
  });
  it('addPractice: practice outside a fight, its log line', () => {
    const c = clone(storyWith([{ kit: 'soul' }]).g).characters.c1, before = practiceOf(c);
    expect(addPractice(c, 5, 'a rest')).toMatch(/practises the Outburst \(\+5, a rest\)/); expect(practiceOf(c)).toBe(before + 5);
    expect(addPractice(c, 0)).toBe('');
  });
});

describe('rules 1.43: the grade step (rules 37, 38, 43)', () => {
  it('at a shop at full price, at a Forge at its factor; one a visit; the stage\'s ceiling; refusals in words', () => {
    const shop = visit('shop'), c0 = shop.characters.c1;
    expect(refused(shop, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge' })).toBe('This is not a Forge.');
    const a = apply(shop, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'shop' }, 'host');
    expect(a.characters.c1.weaponState!.rarity).toBe('fine'); expect(creditsOf(a.characters.c1)).toBe(creditsOf(c0) - GRADE_UP.price.fine);
    expect(refused(a, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'shop' })).toBe('Masterwork upgrades open in stage 2.');
    const b = apply(a, { type: 'run/upgrade', charId: 'c2', where: 'main', place: 'shop' }, 'p2');
    expect(refused(b, { type: 'run/upgrade', charId: 'c2', where: 'off', place: 'shop' }, 'p2')).toBe('One upgrade per visit. ' + b.characters.c2.name + ' has had it here.');
    expect(refused(b, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'shop' }, 'p2')).toMatch(/^Only .+'s player chooses for/);
    const forge = visit('forge');
    const f = apply(forge, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge' }, 'host');
    expect(creditsOf(f.characters.c1)).toBe(10000 - Math.round(GRADE_UP.price.fine * GRADE_UP.places.forge)); expect(gradePrice('fine', 'forge')).toBe(1200);
    const poor = visit('forge', { credits: 100 });
    expect(refused(poor, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge' })).toMatch(/is 1100 credits short/);
    expect(refused(visit('rest'), { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'shop' })).toBe('This is not a shop.');
  });
  it('the Relic step: a Forge only, from stage 3, one of three properties that fit and the cap; Masterwork first', () => {
    const prep = (g: GameState) => { for (const c of Object.values(g.characters)) setGrade(c, 'main', 'masterwork'); };
    expect(refused(visit('forge', { stage: 2, prep }), { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge' })).toBe('Relic upgrades open in stage 3.');
    const shop = visit('shop', { stage: 3, prep });
    expect(refused(shop, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'shop' })).toBe('Only a Forge makes a Relic.');
    const g = visit('forge', { stage: 3, prep }), c = g.characters.c1, offer = relicChoices(g, c, 'main');
    expect(offer.length).toBe(GRADE_UP.relic_offer); for (const p of offer) expect(propFits(p, c.weapon)).toBe(true);
    expect(refused(g, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge' })).toBe('Pick one of the three properties.');
    expect(refused(g, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge', prop: 'prop.gentle' })).toMatch(/not one of the three/);
    const r = apply(g, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge', prop: offer[0] }, 'host');
    expect(r.characters.c1.weaponState).toMatchObject({ rarity: 'relic', prop: offer[0] }); expect(creditsOf(r.characters.c1)).toBe(10000 - GRADE_UP.price.relic);
    expect(runWorth(r.characters.c1)).toBe(worthOf(offer[0]));
    // a cap nearly full: nothing past it is offered
    const full = visit('forge', { stage: 3, prep: (x) => { prep(x); x.characters.c1.relics = ['boon.second_wind', 'boon.hardened', 'boon.edge', 'boon.echo']; } });
    const room = capRoom(full.characters.c1); expect(room).toBe(BOON_CAP - 45);
    for (const p of relicChoices(full, full.characters.c1, 'main')) expect(worthOf(p)).toBeLessThanOrEqual(room);
  });
  it('the armourer\'s chit pays one Fine or Masterwork step (the visit\'s limit holds)', () => {
    const g = visit('forge', { prep: (x) => { x.characters.c1.pack = [...packOf(x.characters.c1), { id: GRADE_UP.chit, item: GRADE_UP.chit, name: 'chit', qty: 1, kind: 'tool' }]; } });
    const a = apply(g, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge', chit: true }, 'host');
    expect(a.characters.c1.weaponState!.rarity).toBe('fine'); expect(creditsOf(a.characters.c1)).toBe(10000);
    expect(packOf(a.characters.c1).some((x) => (x.item || x.id) === GRADE_UP.chit)).toBe(false);
    expect(refused(visit('forge'), { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge', chit: true })).toMatch(/has no armourer's chit/);
    expect(priceOf(GRADE_UP.chit)).toBeNull(); // never sold
  });
});

describe('rules 1.43: the Forge\'s stock and fitting (rule 44)', () => {
  it('four rolled pieces, shared, first buyer; the next armour class for its price', () => {
    const g = visit('forge'), stock = g.run!.visit!.stock!;
    expect(stock).toHaveLength(SV.forge.slots); for (const s of stock) expect(s.price).toBe(priceOf(s.id));
    const a = apply(g, { type: 'run/forge', charId: 'c1', slot: 0 }, 'host');
    expect(packOf(a.characters.c1).some((x) => (x.item || x.id) === stock[0].id)).toBe(true); expect(creditsOf(a.characters.c1)).toBe(10000 - stock[0].price);
    expect(refused(a, { type: 'run/forge', charId: 'c2', slot: 0 }, 'p2')).toBe('Sold to ' + a.characters.c1.name + '.');
    const cls = a.characters.c2.armourClass, fit = apply(a, { type: 'run/fit', charId: 'c2' }, 'p2');
    expect(fit.characters.c2.armourClass).toBe(cls + 1); expect(creditsOf(fit.characters.c2)).toBe(10000 - SV.armour_fit.price[String(cls + 1)]);
  });
});

describe('rules 1.43: trainings (rules 39, 45)', () => {
  it('a rest: one small training each, drill on a carried weapon; a second refused', () => {
    const g = visit('rest'), w = g.characters.c1.weapon, d0 = physOf(g.characters.c1).drill[w] || 0;
    const a = apply(g, { type: 'run/train', charId: 'c1', train: 'drill', weapon: w }, 'host');
    expect(physOf(a.characters.c1).drill[w]).toBe(d0 + TRAIN.drill);
    expect(refused(a, { type: 'run/train', charId: 'c1', train: 'drill', weapon: w })).toBe('One training per rest. ' + a.characters.c1.name + ' has had it.');
    expect(refused(a, { type: 'run/train', charId: 'c2', train: 'practice' }, 'p2')).toMatch(/needs Will Power 1 to practise Outbursts/);
    const s = apply(a, { type: 'run/train', charId: 'c2', train: 'study' }, 'p2');
    expect((s.characters.c2 as any).sigilGrowth?.study ?? 0).toBeGreaterThanOrEqual(TRAIN.study);
  });
  it('a training ground: the first free, a second for its price, no third; Devotion is the shrine\'s', () => {
    const g = visit('training'), w = g.characters.c1.weapon;
    const a = apply(g, { type: 'run/train', charId: 'c1', train: 'drill', weapon: w }, 'host');
    expect(physOf(a.characters.c1).drill[w]).toBe((physOf(g.characters.c1).drill[w] || 0) + TRAINING.drill); expect(creditsOf(a.characters.c1)).toBe(10000);
    const b = apply(a, { type: 'run/train', charId: 'c1', train: 'drill', weapon: w }, 'host');
    expect(creditsOf(b.characters.c1)).toBe(10000 - TRAINING.extra_price);
    expect(refused(b, { type: 'run/train', charId: 'c1', train: 'drill', weapon: w })).toMatch(/the most the yard allows/);
    expect(refused(g, { type: 'run/train', charId: 'c1', train: 'devotion' })).toBe('Devotion is raised at a shrine, not here.');
    const poor = visit('training', { credits: 0 }), p1 = apply(poor, { type: 'run/train', charId: 'c1', train: 'drill', weapon: w }, 'host');
    expect(refused(p1, { type: 'run/train', charId: 'c1', train: 'drill', weapon: w })).toMatch(/is 300 credits short/);
  });
});

describe('rules 1.43: the shrine (rule 46)', () => {
  it('a rite for the faithful, a piece for the faithless, a token on the cap; one offer each', () => {
    const faithful = (x: GameState) => { x.characters.c1.belief = { kind: 'faithful', patron: 'mother_ember' } as any; x.characters.c2.belief = { kind: 'atheist' } as any; };
    const g = visit('shrine', { prep: faithful }), p = g.run!.visit!.patron!;
    expect(p).toBeTruthy();
    const xp0 = devotionXpOf(g.characters.c1);
    const a = apply(g, { type: 'run/shrine', charId: 'c1', choice: 'rite' }, 'host');
    expect(devotionXpOf(a.characters.c1)).toBe(xp0 + DEVOTION_XP.rite);
    expect(refused(a, { type: 'run/shrine', charId: 'c1', choice: 'token' })).toBe('One thing per shrine. ' + a.characters.c1.name + ' has taken it.');
    expect(refused(a, { type: 'run/shrine', charId: 'c2', choice: 'rite' }, 'p2')).toMatch(/is an Atheist: take a piece of lore or the token instead/);
    const b = apply(a, { type: 'run/shrine', charId: 'c2', choice: 'piece' }, 'p2');
    expect(b.characters.c2.faithPieces?.[p]).toBe(1);
    const t = apply(g, { type: 'run/shrine', charId: 'c2', choice: 'token' }, 'p2'), tok = t.characters.c2.relics![0];
    expect(relicRow(tok)!.worth).toBeLessThanOrEqual(SV.shrine.token_max_worth); expect(runWorth(t.characters.c2)).toBe(relicRow(tok)!.worth);
    expect(t.run!.marks!.c2).toEqual(['token@1']);
  });
});

describe('rules 1.43: the Crossroads (rule 42): every trade\'s gain and cost', () => {
  const at = (o: any = {}) => visit('event', { ...o, prep: (x) => { o.prep?.(x); } });
  const all = (g: GameState) => { const x = clone(g); x.run!.visit!.trades = TRADES.items.map((t) => t.id); return x; };
  it('the off-books armourer: a step outside the limit for a cut of the shop\'s price, the weapon worn to its share', () => {
    const g = all(at()), t = TRADES.items.find((x) => x.do === 'grade')!;
    const a = apply(g, { type: 'run/trade', charId: 'c1', trade: t.id, where: 'main' }, 'host'), c = a.characters.c1;
    expect(c.weaponState!.rarity).toBe('fine'); expect(creditsOf(c)).toBe(10000 - Math.round(GRADE_UP.price.fine * t.cut_rate));
    expect(c.weaponState!.dur).toBe(Math.round(unitFromCharacter(c, '1,1', { state: 1 } as any).maxDur! * t.dur_share));
    expect(refused(a, { type: 'run/trade', charId: 'c1', trade: t.id, where: 'main' })).toMatch(/^One trade each\. /);
  });
  it('a hard sparring: drill for a share of HP now', () => {
    const g = all(at()), t = TRADES.items.find((x) => x.do === 'drill')!, c0 = g.characters.c1, w = c0.weapon;
    const a = apply(g, { type: 'run/trade', charId: 'c1', trade: t.id, weapon: w }, 'host');
    expect(a.characters.c1.hp).toBe(c0.hp - Math.floor(c0.hp * t.hp_share)); expect(physOf(a.characters.c1).drill[w]).toBe((physOf(c0).drill[w] || 0) + t.drill);
  });
  it('a sealed crate: its price, then a weapon pick at an Elite\'s grade', () => {
    const g = all(at()), t = TRADES.items.find((x) => x.do === 'crate')!;
    const a = apply(g, { type: 'run/trade', charId: 'c1', trade: t.id }, 'host');
    expect(creditsOf(a.characters.c1)).toBe(10000 - t.price); expect(a.run!.state).toBe('reward'); expect(a.run!.offers!.c1.weapons).toHaveLength(SV.rewards.offer);
    for (const w of a.run!.offers!.c1.weapons) expect(['fine', 'masterwork']).toContain(w.rarity); // stage 1's ceiling caps the Elite's table
    const b = apply(a, { type: 'run/pick', charId: 'c1', choice: 0 }, 'host'); expect(b.run!.state).toBe('map');
  });
  it('a wayside shrine: free, once a stage, Devotion or study or practice', () => {
    const g = all(at({ pcs: [{ build: 'outburst', level: 1 }, { build: 'sigil', level: 1 }] })), t = TRADES.items.find((x) => x.do === 'wayside')!;
    const p0 = practiceOf(g.characters.c1), a = apply(g, { type: 'run/trade', charId: 'c1', trade: t.id, train: 'practice' }, 'host');
    expect(practiceOf(a.characters.c1)).toBe(p0 + t.practice); expect(creditsOf(a.characters.c1)).toBe(10000);
    const again = clone(a); again.run!.visit!.did = {}; expect(refused(again, { type: 'run/trade', charId: 'c1', trade: t.id, train: 'practice' })).toMatch(/once per stage/);
  });
  it('a back-room graft: a boon of the tile\'s pool on the cap, max HP down by its share', () => {
    const g = all(at()), t = TRADES.items.find((x) => x.do === 'graft')!, hp0 = maxHp(g.characters.c1);
    const a = apply(g, { type: 'run/trade', charId: 'c1', trade: t.id }, 'host'), c = a.characters.c1;
    expect(c.relics![0]).toMatch(/^graft\./); expect(maxHp(c)).toBe(Math.max(1, Math.round(hp0 * SV.graft.hp_mult)));
    expect(runWorth(c)).toBe(worthOf(c.relics![0])); expect(c.hp).toBeLessThanOrEqual(maxHp(c));
  });
  it('a salvage buyer: a pack line for its share of its price', () => {
    const g = all(at()), t = TRADES.items.find((x) => x.do === 'salvage')!, c0 = g.characters.c1;
    // rules 1.52: the camp's Recommended loadout carries nothing salvageable but its gun: a knife in the pack to sell
    c0.pack = [...packOf(c0), { id: 'combat_knife', name: 'Combat knife', qty: 1, kind: 'weapon', weapon: 'combat_knife' }];
    const i = packOf(c0).findIndex((x) => !x.mags && !x.calibre && x.kind !== 'ammo' && priceOf(x.weapon || x.item || x.id, x.rarity || 'standard') != null);
    const it = packOf(c0)[i], n = Math.round(priceOf(it.weapon || it.item || it.id, it.rarity || 'standard')! * t.rate);
    const a = apply(g, { type: 'run/trade', charId: 'c1', trade: t.id, pick: i }, 'host');
    expect(creditsOf(a.characters.c1)).toBe(10000 + n);
    expect(refused(all(at()), { type: 'run/trade', charId: 'c1', trade: t.id, pick: packOf(c0).findIndex((x) => !!x.mags) })).toMatch(/^Pick a weapon or item/);
  });
  it('only the trades rolled for this crossroads are offered; the options carry the engine\'s reasons', () => {
    const g = at(), offered = g.run!.visit!.trades!;
    expect(offered).toHaveLength(TRADES.offer);
    const not = TRADES.items.find((x) => !offered.includes(x.id))!;
    expect(refused(g, { type: 'run/trade', charId: 'c1', trade: not.id })).toBe('That trade is not offered here.');
    expect(runOptions(g, 'c1').every((o) => o.group === 'trade' && offered.includes((o.action as any).trade))).toBe(true);
  });
});

describe('rules 1.43: picks of kit and reward weapons (rules 26, 41, 43)', () => {
  it('an Elite\'s and a cache\'s pick hold at least two lasting things; the gate\'s holds a chit in stage 1; run/take', () => {
    const s = clone(started()), c = s.characters.c1, gate = s.run!.nodes.find((n) => n.gate)!;
    const l = lastingOffer(c, gate, 1, s.run!.seed);
    expect(l.items).toHaveLength(SV.lasting.offer); expect(l.items[0].id).toBe(GRADE_UP.chit);
    expect(l.items.filter((x) => x.lasting).length).toBeGreaterThanOrEqual(SV.lasting.min);
    const g = visit('cache');
    expect(g.run!.state).toBe('reward'); expect(g.run!.lasting!.c1.items.filter((x) => x.lasting).length).toBeGreaterThanOrEqual(SV.lasting.min);
    const pick = g.run!.lasting!.c1.items[0].id;
    const a = apply(g, { type: 'run/take', charId: 'c1', choice: 0 }, 'host');
    expect(packOf(a.characters.c1).some((x) => (x.item || x.weapon || x.id) === pick)).toBe(true); expect(a.run!.state).toBe('reward');
    const b = apply(a, { type: 'run/take', charId: 'c2', choice: 'none' }, 'p2'); expect(b.run!.state).toBe('map');
  });
  it('reward weapons: capped by the stage; a Relic comes with a property that fits and the cap; a Celestial roll is a Relic', () => {
    expect(cappedRarity('celestial', 3)).toBe('relic'); expect(cappedRarity('relic', 2)).toBe('masterwork'); expect(cappedRarity('masterwork', 1)).toBe('fine');
    expect(stageCeiling(1)).toBe('fine'); expect(stageCeiling(5)).toBe('relic');
    const c = clone(started()).characters.c1; let seen = 0;
    for (let i = 0; i < 40; i++) for (const w of weaponOffer(c, { id: 'n' + i, depth: 15 }, 'boss', 3, 'S' + i).weapons) {
      if (w.rarity === 'relic') { seen++; expect(w.prop && propFits(w.prop, w.id)).toBe(true); expect(w.price).toBe(priceOf(w.id, 'relic')); }
    }
    expect(seen).toBeGreaterThan(0);
    c.relics = ['boon.second_wind', 'boon.hardened', 'boon.edge', 'boon.echo', 'boon.deep_well']; // 53: no room for any property
    for (let i = 0; i < 20; i++) for (const w of weaponOffer(c, { id: 'n' + i, depth: 15 }, 'boss', 3, 'S' + i).weapons) expect(w.rarity).not.toBe('relic');
  });
  it('a picked Relic carries its property into the pack', () => {
    const items = pickedItem({ id: 'hellraiser_service_rifle', rarity: 'relic', price: 0, prop: 'prop.keen' });
    expect(items[0]).toMatchObject({ rarity: 'relic', prop: 'prop.keen' });
    const c = clone(started()).characters.c1; c.pack = [...packOf(c), ...items]; expect(gearProps(c)).toEqual(['prop.keen']);
    expect(gearAt(c, packOf(c).length - 1)).toMatchObject({ rarity: 'relic', prop: 'prop.keen' });
  });
});
