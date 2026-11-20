// Rules 1.54 (survival-spec section 14, rows R6 to R13): the sheet in a run, materials, making, loot and the shop's
// stock, every case through the one reducer. Numbers are read from data.
import { describe, expect, it } from 'vitest';
import { type GameState, type PackItem, type Sheet, apply, RuleError, packOf, isGunId, gearLockWhy, sheetPack, sellValue, NODE_TIP, RECIPES, ITEM, WEAPON, priceOf, makeView, newGame, ARCHETYPES, isFocusId, inHands, nodeCredits, materialsView, placeView } from '../src';
import svJ from '../../../data/survival.json';
import { survivalRoom, startRun, ownerOf, leaveField, walkIn } from './helpers/survival';
import { counterLines, linePrice, ROUND_PRICE, SPECIAL_ROUND_ITEM, SPECIAL_CALIBRES } from '../src';
import rulesJ from '../../../data/rules.json';
const RJ: any = rulesJ;
import { Rec, type Pc } from './helpers/replay';

const SV: any = svJ;

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const started = (pcs: Pc[] = DUO, seed = 'PHC-0001') => startRun(survivalRoom(seed, pcs, { test: true }), seed);
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
/** The squad at a node of this kind (depth 5), every player marking it (as survival-give.test.ts walks). */
function at(kind: string, o: { pcs?: Pc[]; seed?: string; prep?: (g: GameState) => void } = {}): GameState {
  const g0 = clone(started(o.pcs || DUO, o.seed)), r = g0.run!;
  const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map';
  o.prep?.(g0);
  let g = g0; for (let i = 0; i < (o.pcs || DUO).length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  return walkIn(g);
}
const line = (item: string, qty: number, extra: Partial<PackItem> = {}): PackItem => ({ id: item, item, name: ITEM[item].name, qty, kind: 'loot', ...extra });
const has = (g: GameState, cid: string, f: (x: PackItem) => boolean) => packOf(g.characters[cid]).filter(f).reduce((t, x) => t + x.qty, 0);
/** The first recipe that makes rounds of a calibre, the first whose tool is any focus (no id typed in the test). */
const ROUNDS = RECIPES.find((r) => /^rounds:/.test(r.gives[0].item) && r.gives[0].n === 1)!;
const CORE = RECIPES.find((r) => r.tool.focus === 'any')!;
const TOOL = ROUNDS.tool.item!;
const [POWDER, CASE] = ROUNDS.needs.map((l) => l.item);

describe('rules 1.54 item 1: the sheet in a run (R6)', () => {
  it('the host\'s rest is refused in a run (RUN_REFUSED named rest/, the type is rest)', () => {
    const g = started();
    expect(g.run!.state).toBe('map');
    expect(refused(g, { type: 'rest', kind: 'long' })).toMatch(/Survival run/);
    expect(refused(g, { type: 'rest', kind: 'short' })).toMatch(/Survival run/);
  });

  it('every gear/* action is refused at the camp, in words naming the character', () => {
    const g = apply(survivalRoom('PHC-0001', DUO), { type: 'run/start', seed: 'PHC-0001' } as any, 'host');
    expect(g.run!.state).toBe('loadout');
    const name = g.characters.c1.name;
    for (const a of [{ type: 'gear/load', charId: 'c1' }, { type: 'gear/equip', charId: 'c1', idx: 0, to: 'main' }, { type: 'gear/unequip', charId: 'c1', slot: 'main' }, { type: 'gear/give', charId: 'c1', to: 'c2', credits: 1 }])
      expect(refused(g, a)).toBe('At the camp, change ' + name + '\'s gear in the loadout.');
    expect(gearLockWhy(g, 'c1')).toBe(refused(g, { type: 'gear/load', charId: 'c1' })); // the sheet's gate is the reducer's words
    // out of the camp the same action is the gear's own business again
    const m = started();
    expect(packOf(m.characters.c1).length).toBeGreaterThan(0);
    expect(refused(m, { type: 'gear/load', charId: 'c1' })).not.toMatch(/At the camp/);
  });
});

describe('the sheet\'s pack list (consolidation 0.28 S8)', () => {
  it('the counted things come from the engine, flagged, with the sell rule\'s note; the pack lines keep their order', () => {
    const g = started(), c = g.characters.c1;
    const list = sheetPack(c), counted = list.filter((x) => x.counted);
    expect(list.filter((x) => !x.counted)).toEqual(packOf(c));
    expect(counted.reduce((t, x) => t + x.qty, 0)).toBe((c.stims || 0) + (c.essence || 0));
    for (const x of counted) { const v = sellValue(x, 1); expect(x.note).toBe(v == null ? "Can't be sold" : 'Sells for ' + v); expect(x.name).toBe((ITEM as any)[(x as any).item].name); }
    expect((c.stims || 0) > 0).toBe(true); // the plain gun's loadout carries stims: the list has a counted line to check
  });
});

describe('rules 1.54 items 2 to 4: the pick (Materials or One weapon) and Survival\'s foes\' drops', () => {
  it('after a fight: one weapon or the Materials card for the node\'s credits, whole into the pack; credits instead retired', () => {
    let g = at('fight');
    const n = g.run!.nodes.find((x) => x.id === g.run!.at)!;
    const wc = SV.rewards.weapon_card.fight; SV.rewards.weapon_card.fight = 1; // rules 1.55 item 21: the weapon card forced on here
    try { g = leaveField(apply(g, { type: 'run/skip' }, 'host')); } finally { SV.rewards.weapon_card.fight = wc; }
    const o = g.run!.offers!.c1, C = nodeCredits('fight', n.depth, g.run!.stage);
    expect(o.weapons).toHaveLength(SV.rewards.offer.fight); expect(o.instead).toBeUndefined();
    expect(o.materials!.filter((m) => SV.rewards.materials.items.some((x: any) => x.item === m.item && x.per_credits))).toEqual(SV.rewards.materials.items.filter((m: any) => m.per_credits).map((m: any) => ({ item: m.item, n: Math.ceil(C / m.per_credits) }))); // rules 1.55: residue by `by`
    const had = (cid: string, id: string) => has(g, cid, (x) => (x.item || x.id) === id);
    const p = apply(g, { type: 'run/pick', charId: 'c1', choice: 'materials' }, 'host');
    for (const m of o.materials!) expect(has(p, 'c1', (x) => (x.item || x.id) === m.item)).toBe(had('c1', m.item) + m.n);
    expect(p.story.entries.at(-1)!.text).toMatch(/: \+\d+ /);
    expect(p.run!.note!.picks!.c1).toBe(p.story.entries.at(-1)!.text); // the stop's note says what was taken (the run board's This stop)
    // the card as the engine gives it to the screen: names, counts, what it sells for, the action the reducer takes
    const v = materialsView(g, 'c1')!;
    expect(v.lines.map((l) => [l.item, l.n])).toEqual(o.materials!.map((m) => [m.item, m.n]));
    expect(v.lines.map((l) => l.name)).toEqual(o.materials!.map((m) => ITEM[m.item].name));
    // S9: the card's hover and the fight's node tip name what data names (the recipes' needs, the card's materials), no copy
    const words = (id: string) => String((ITEM as any)[id].plural || ITEM[id].name).toLowerCase();
    for (const r of RECIPES) for (const l of r.needs) expect(v.tip.toLowerCase()).toContain(words(l.item));
    for (const m of SV.rewards.materials.items) expect(NODE_TIP.fight.toLowerCase()).toContain(words(m.item));
    // the merge with 0.28.1: the words read as 0.28.1's typed tip did (the certain ones, then the chance one)
    expect(NODE_TIP.fight).toBe('A fight. Win for XP and credits, then take the materials (gunpowder and casings, now and then mana residue) or, sometimes, one weapon.');
    expect(SV.tips.fight).not.toMatch(new RegExp(SV.rewards.materials.items.map((m: any) => words(m.item)).join('|'), 'i'));
    expect(v.sells).toBe(o.materials!.reduce((t, m) => t + Math.floor(priceOf(m.item)! * m.n * SV.sell_rate.rate), 0));
    expect(apply(g, v.action, 'host').story.entries.at(-1)!.text).toBe(p.story.entries.at(-1)!.text);
    expect(packOf(p.characters.c1).filter((x) => x.weapon === o.weapons[0].id && !x.mags).length).toBe(packOf(g.characters.c1).filter((x) => x.weapon === o.weapons[0].id && !x.mags).length);
  });

  it('every foe of a Survival fight carries the flag: no weapon or magazines drop, materials are given (gun: gunpowder and casings)', () => {
    const g = at('fight');
    const foes = g.combat!.units.filter((u) => u.side === 'foe');
    expect(foes.length).toBeGreaterThan(0);
    for (const u of foes) {
      expect(u.drops!.gear).toBe(false);
      const gun = isGunId(u.weapon); // the engine's one gun test
      expect(u.drops!.table).toBeUndefined(); // rules 1.55 item 26: the kind's table is not rolled (drops.kind_table false)
      const given = (u.drops!.items || []).map((e) => e.item), mine = [...(gun ? SV.drops.gun : [])].map((e: any) => e.item);
      expect(given.slice(0, mine.length)).toEqual(mine); for (const e of u.drops!.items || []) expect(e.chance).toBeLessThan(1); // every drop rare
    }
    // the fight played through the reducer: what dies leaves no gear on its tile
    const r = new Rec(g, DUO); r.fight(40);
    const lines = (r.g.combat?.dropLines || []) as { line: string }[];
    for (const l of lines) for (const u of foes) expect(l.line).not.toContain((WEAPON as any)[u.weapon]?.name + ' (worn)');
    const piles = (r.g.combat?.objects || []).filter((o: any) => o.kind === 'pile');
    for (const p of piles) for (const e of p.items || []) { expect(e.pack?.kind).not.toBe('weapon'); expect(e.pack?.mags).toBeUndefined(); }
    // rules 1.55 item 26: what a foe leaves is rare now; survival-loot.test.ts measures the ground over 300 fights
  });
});

describe('the shop\'s stock (Leon, 14 Nov): a trait\'s gear is not sold, food is; the ammo maker is on the counter', () => {
  const traitGear = Object.values(ITEM).filter((x: any) => x.stock === false).map((x) => x.id);
  // rules 1.55 item 55: never bought (stock: false) and never sold (sell: false) are two facts; a trait's gear is both
  const neverSold = Object.values(ITEM).filter((x: any) => x.stock === false && x.sell === false).map((x) => x.id);
  it('the counter sells the ammo maker at its price; nothing a trait grants is on the counter or in the rolled stock', () => {
    expect(traitGear.length).toBeGreaterThan(1);
    for (const seed of ['PHC-0001', 'PHC-0002', 'PHC-0003']) {
      const g = at('shop', { seed, prep: (x) => { for (const c of Object.values(x.characters)) c.credits = 10000; } });
      const sh = g.run!.shop!;
      for (const p of sh.stock) expect(traitGear).not.toContain(p.id);
      const b = apply(g, { type: 'run/buy', charId: 'c1', key: TOOL }, 'host');
      expect(b.characters.c1.credits).toBe(10000 - priceOf(TOOL)!);
      expect(has(b, 'c1', (x) => (x.item || x.id) === TOOL)).toBe(1);
      for (const id of traitGear) expect(refused(g, { type: 'run/buy', charId: 'c1', key: id })).toBe('This shop does not sell that.');
    }
  });
  it('a trait\'s gear has no price, so it can\'t be sold either; food a trait counts (the smoker\'s) keeps its price', () => {
    const g = at('shop', { prep: (x) => { x.characters.c1.pack = [...packOf(x.characters.c1), line(neverSold[0], 1, { kind: 'tool' })]; } });
    const idx = packOf(g.characters.c1).findIndex((x) => (x.item || x.id) === neverSold[0]);
    expect(refused(g, { type: 'run/sell', charId: 'c1', idx })).toMatch(/can't be sold\.$/);
    // food a trait reads keeps its price (Lunarshine's bottle); the ration pack and the cigarettes, which nothing reads,
    // are off Survival's shelves (rules 1.61 addendum items 4745 and 4755, Leon's playtest of 0.30.0)
    expect((ITEM as any).bottle_of_spirits.stock).not.toBe(false);
    for (const id of ['ration_pack', 'cigarettes']) expect((ITEM as any)[id].stock).toBe(false);
  });
});

describe('rules 1.54 items 5 to 7: making (gear/make, one converter for every recipe)', () => {
  it('every recipe is worth what it makes at priceOf (the validator holds the same parity)', () => {
    const worth = (l: { item: string; n: number }[]) => l.reduce((t, x) => t + (priceOf(x.item) || NaN) * x.n, 0);
    for (const r of RECIPES) expect(worth(r.needs), r.id).toBe(worth(r.gives));
    expect(RECIPES.filter((r) => r.tool.item === TOOL).length).toBeGreaterThanOrEqual(14);
  });

  it('makes rounds between fights, free, the needs taken across stacks (packTake), the rounds added to their calibre', () => {
    const t = 5, need = ROUNDS.needs[0].n * t;
    let g = at('rest', { prep: (x) => { x.characters.c1.pack = [...packOf(x.characters.c1), line(TOOL, 1, { kind: 'tool' }), line(POWDER, need - 2), line(POWDER, 2, { note: 'damp' }), line(CASE, need + 3)]; } });
    const cal = ROUNDS.gives[0].item.slice('rounds:'.length), before = has(g, 'c1', (x) => x.calibre === cal && !x.ammoType), credits = g.characters.c1.credits;
    g = apply(g, { type: 'gear/make', charId: 'c1', recipe: ROUNDS.id, times: t }, 'host');
    expect(has(g, 'c1', (x) => x.calibre === cal && !x.ammoType)).toBe(before + ROUNDS.gives[0].n * t);
    expect(has(g, 'c1', (x) => (x.item || x.id) === POWDER)).toBe(0);
    expect(packOf(g.characters.c1).some((x) => x.note === 'damp')).toBe(false); // the emptied stack left the pack
    expect(has(g, 'c1', (x) => (x.item || x.id) === CASE)).toBe(3);
    expect(g.characters.c1.credits).toBe(credits);
    expect(g.story.entries.at(-1)!.text).toMatch(new RegExp('^' + g.characters.c1.name + ' makes '));
    expect(placeView(g, 'host')!.log[0]).toBe(g.story.entries.at(-1)!.text.replace(/\.$/, '')); // and in the visit's log
  });

  it('refusals in words naming the character: no tool, too little, in a fight, down, not yours', () => {
    const g = at('rest', { prep: (x) => { x.characters.c1.pack = [...packOf(x.characters.c1), line(POWDER, 12), line(CASE, 12)]; } });
    const name = g.characters.c1.name, toolName = ITEM[TOOL].name.toLowerCase();
    expect(refused(g, { type: 'gear/make', charId: 'c1', recipe: ROUNDS.id, times: 1 })).toBe(name + ' needs an ' + toolName + ' ' + ROUNDS.does + '.');
    const tool = clone(g); tool.characters.c1.pack = [...packOf(tool.characters.c1), line(TOOL, 1, { kind: 'tool' })];
    const want = ROUNDS.needs[0].n * 20;
    expect(refused(tool, { type: 'gear/make', charId: 'c1', recipe: ROUNDS.id, times: 20 })).toBe(name + ' needs ' + want + ' ' + ITEM[POWDER].name.toLowerCase() + ' for that and has 12.');
    const cased = clone(tool); cased.characters.c1.pack = packOf(cased.characters.c1).map((x) => ((x.item || x.id) === POWDER ? { ...x, qty: 99 } : x));
    expect(refused(cased, { type: 'gear/make', charId: 'c1', recipe: ROUNDS.id, times: 20 })).toBe(name + ' needs ' + want + ' ' + String((ITEM[CASE] as any).plural).toLowerCase() + ' for that and has 12.');
    const down = clone(tool); down.characters.c1.hp = 0;
    expect(refused(down, { type: 'gear/make', charId: 'c1', recipe: ROUNDS.id, times: 1 })).toBe(name + ' is down and can\'t make anything.');
    expect(refused(tool, { type: 'gear/make', charId: 'c1', recipe: ROUNDS.id, times: 1 }, 'p2')).toBe('Only ' + name + '\'s player makes things for ' + name + '.');
    expect(refused(tool, { type: 'gear/make', charId: 'c1', recipe: ROUNDS.id, times: 0 })).toBe('Make it 1 time or more.');
    const fight = at('fight', { prep: (x) => { x.characters.c1.pack = [...packOf(x.characters.c1), line(TOOL, 1, { kind: 'tool' }), line(POWDER, 12), line(CASE, 12)]; } });
    expect(fight.run!.state).toBe('fight');
    expect(refused(fight, { type: 'gear/make', charId: 'c1', recipe: ROUNDS.id, times: 1 })).toBe(name + ' can\'t make anything in a fight.');
  });

  it('a core from mana residue needs any focus in a hand (the hold test\'s door any); it goes in as its pack_kind line', () => {
    const n = CORE.needs[0].n, res = CORE.needs[0].item, made = CORE.gives[0].item;
    let g = at('rest', { prep: (x) => { x.characters.c2.pack = [...packOf(x.characters.c2), line(res, n * 2)]; } });
    expect(inHands(g.characters.c2).some(isFocusId)).toBe(true); // the sigil build holds its Evoker
    const before = has(g, 'c2', (x) => (x.item || x.id) === made);
    g = apply(g, { type: 'gear/make', charId: 'c2', recipe: CORE.id, times: 2 }, 'p2');
    expect(has(g, 'c2', (x) => (x.item || x.id) === made)).toBe(before + 2);
    expect(packOf(g.characters.c2).filter((x) => (x.item || x.id) === made).every((x) => x.kind === (ITEM[made] as any).pack_kind)).toBe(true);
    // the focus put away: carried in the pack is not in a hand
    let bare = at('rest', { prep: (x) => { x.characters.c2.pack = [...packOf(x.characters.c2), line(res, n)]; } });
    const c = bare.characters.c2, slot = isFocusId(c.weapon) ? 'main' : 'off';
    bare = apply(bare, { type: 'gear/unequip', charId: 'c2', slot }, 'p2');
    expect(inHands(bare.characters.c2).some(isFocusId)).toBe(false);
    expect(refused(bare, { type: 'gear/make', charId: 'c2', recipe: CORE.id, times: 1 }, 'p2')).toBe(c.name + ' needs a focus in hand ' + CORE.does + '.');
  });

  it('the make list: what each recipe needs and the character has, how many times, the reason; hidden at the camp', () => {
    const g = at('rest', { prep: (x) => { x.characters.c1.pack = [...packOf(x.characters.c1), line(TOOL, 1, { kind: 'tool' }), line(POWDER, 7), line(CASE, 4)]; } });
    const v = makeView(g, 'host')!;
    expect(v.charId).toBe('c1'); expect(v.shown).toBe(true); expect(v.rows.length).toBe(RECIPES.length);
    const row = v.rows.find((x) => x.recipe === ROUNDS.id)!;
    expect(row.needs.map((l) => l.have)).toEqual([7, 4]);
    expect(row.most).toBe(Math.floor(4 / ROUNDS.needs[1].n)); expect(row.why).toBeNull();
    const big = v.rows.find((x) => x.tool.held && x.needs[0].n > 7)!;
    expect(big.most).toBe(0); expect(big.why).toMatch(/ for that and has 7\.$/);
    expect(v.rows.find((x) => x.recipe === CORE.id)!.tool.held).toBe(false);
    // the most the view offers is what the reducer takes
    expect(() => apply(g, { ...row.action, times: row.most }, 'host')).not.toThrow();
    const camp = apply(survivalRoom('PHC-0001', DUO), { type: 'run/start', seed: 'PHC-0001' } as any, 'host');
    expect(makeView(camp, 'host')).toBeNull();
    // in a fight the sheet hides the Make group (rules 1.54 item 5: between fights only), the rows keep the reason
    const fight = at('fight', { prep: (x) => { x.characters.c1.pack = [...packOf(x.characters.c1), line(TOOL, 1, { kind: 'tool' }), line(POWDER, 7), line(CASE, 4)]; } });
    const fv = makeView(fight, 'host')!;
    expect(fv.shown).toBe(false); expect(fv.rows.find((x) => x.recipe === ROUNDS.id)!.why).toBe(fight.characters.c1.name + ' can\'t make anything in a fight.');
  });

  it('the Proving Ground takes gear/make while gearing up, as it takes gear/load', () => {
    const a = ARCHETYPES[0], sheet: Sheet = { name: 'Vel', portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
    let g = newGame('PROVE1', { id: 'h1', name: 'Host' }, 'seed-proving');
    g = apply(g, { type: 'char/add', sheet }, 'h1');
    g = apply(g, { type: 'sandbox/start' }, 'h1');
    const c = Object.values(g.characters)[0];
    for (const [item, qty] of [[TOOL, 1], [POWDER, 10], [CASE, 10]] as [string, number][]) g = apply(g, { type: 'sandbox/give', charId: c.id, item, qty } as any, 'h1');
    const cal = ROUNDS.gives[0].item.slice('rounds:'.length), before = has(g, c.id, (x) => x.calibre === cal && !x.ammoType);
    g = apply(g, { type: 'gear/make', charId: c.id, recipe: ROUNDS.id, times: 3 }, 'h1');
    expect(has(g, c.id, (x) => x.calibre === cal && !x.ammoType)).toBe(before + 3 * ROUNDS.gives[0].n);
    expect(has(g, c.id, (x) => (x.item || x.id) === POWDER)).toBe(10 - 3 * ROUNDS.needs[0].n);
  });
});

// Rules 1.56 (L2, D3): special rounds are priced and made by calibre through the one priceOf and the one recipe path:
// a special round for a heavy gun costs and needs materials in proportion. Numbers read from data.
describe('rules 1.56: special rounds by calibre (the shop and gear/make, through the reducer)', () => {
  const HEAVY = Object.values(WEAPON).filter((w: any) => SPECIAL_CALIBRES.includes(w.ammo)).sort((a: any, b: any) => ROUND_PRICE[b.ammo] - ROUND_PRICE[a.ammo])[0] as any;
  const CAL = HEAVY.ammo, TYPE = 'armor_piercing', ID = 'rounds:' + CAL + ':' + TYPE;
  const each = Number(SPECIAL_ROUND_ITEM[TYPE].price_mult) * ROUND_PRICE[CAL];
  it('the heaviest calibre\'s armour-piercing round costs price_mult x its own round at the counter, and buying it puts rounds of that calibre and type in the pack', () => {
    expect(ROUND_PRICE[CAL]).toBeGreaterThan(ROUND_PRICE[RJ.weapons_rules.special_round_price.calibre]); // a heavy gun's round, not the reference's
    expect(priceOf(ID)).toBe(each);
    let g = at('shop', { prep: (x) => { x.characters.c1.credits = 100000; x.characters.c1.weapon = HEAVY.id; } });
    const l = counterLines(Object.values(g.characters)).find((x) => x.id === ID)!; expect(l).toBeTruthy();
    expect(linePrice(l)).toBe(each * l.per);
    g = apply(g, { type: 'run/buy', charId: 'c1', key: l.key, qty: 1 }, 'host');
    expect(g.characters.c1.credits).toBe(100000 - each * l.per);
    expect(has(g, 'c1', (x) => x.calibre === CAL && x.ammoType === TYPE)).toBe(l.per);
    // out of a fight the heavy gun loads them; rounds of another calibre would not do
    g = apply(g, { type: 'gear/ammo', charId: 'c1', ammo: TYPE } as any, 'host');
    expect(g.characters.c1.loadedType).toBe(TYPE); expect(g.characters.c1.loaded).toBe(Math.min(l.per, HEAVY.magazine));
  });
  it('the recipe of that round needs materials worth its price (half gunpowder, half casings), made through gear/make', () => {
    const row = RECIPES.find((r) => r.gives[0].item === ID)!; expect(row).toBeTruthy();
    const worth = (ls: { item: string; n: number }[]) => ls.reduce((t, x) => t + (priceOf(x.item) || NaN) * x.n, 0);
    expect(worth(row.needs)).toBe(each * row.gives[0].n); expect(worth(row.needs)).toBe(worth(row.gives));
    for (const l of row.needs) expect((priceOf(l.item) || 0) * l.n).toBe(worth(row.needs) / row.needs.length);
    const pack = (x: GameState) => { x.characters.c1.pack = [...packOf(x.characters.c1), line(TOOL, 1, { kind: 'tool' }), ...row.needs.map((l) => line(l.item, l.n))]; };
    let g = at('rest', { prep: pack });
    g = apply(g, { type: 'gear/make', charId: 'c1', recipe: row.id, times: 1 }, 'host');
    expect(has(g, 'c1', (x) => x.calibre === CAL && x.ammoType === TYPE)).toBe(row.gives[0].n);
    for (const l of row.needs) expect(has(g, 'c1', (x) => (x.item || x.id) === l.item)).toBe(0);
    // the reference calibre's row makes what the old one-for-every-gun row made, for the same materials
    const ref = RECIPES.find((r) => r.gives[0].item === 'rounds:' + RJ.weapons_rules.special_round_price.calibre + ':' + TYPE)!;
    expect(worth(ref.needs)).toBe(priceOf(SPECIAL_ROUND_ITEM[TYPE].id)! * ref.gives[0].n);
  });
  it('every each_calibre row is expanded for every calibre that sells the round, and each holds the parity', () => {
    for (const t of Object.keys(SPECIAL_ROUND_ITEM)) for (const cal of SPECIAL_CALIBRES) {
      const id = 'rounds:' + cal + ':' + t; if (priceOf(id) == null) continue;
      expect(RECIPES.filter((r) => r.gives[0].item === id).length, id).toBe(1);
    }
  });
});

