// Rules 1.54 (survival-spec section 14, rows R6 to R13): the sheet in a run, materials, making, loot and the shop's
// stock, every case through the one reducer. Numbers are read from data.
import { describe, expect, it } from 'vitest';
import { type GameState, type PackItem, type Sheet, apply, RuleError, packOf, RECIPES, ITEM, WEAPON, priceOf, makeView, newGame, ARCHETYPES, isFocusId, inHands, nodeCredits } from '../src';
import svJ from '../../../data/survival.json';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import { Rec, type Pc } from './helpers/replay';

const SV: any = svJ;

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const started = (pcs: Pc[] = DUO, seed = 'PHC-0001') => startRun(survivalRoom(seed, pcs, { test: true }), seed);
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
/** The squad at a node of this kind (depth 5), every player marking it (as survival-give.test.ts walks). */
function at(kind: string, o: { pcs?: Pc[]; prep?: (g: GameState) => void } = {}): GameState {
  const g0 = clone(started(o.pcs || DUO)), r = g0.run!;
  const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map';
  o.prep?.(g0);
  let g = g0; for (let i = 0; i < (o.pcs || DUO).length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  return g;
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
    // out of the camp the same action is the gear's own business again
    const m = started();
    expect(packOf(m.characters.c1).length).toBeGreaterThan(0);
    expect(refused(m, { type: 'gear/load', charId: 'c1' })).not.toMatch(/At the camp/);
  });
});

describe('rules 1.54 items 2 to 4: the pick (Materials or One weapon) and Survival\'s foes\' drops', () => {
  it('after a fight: one weapon or the Materials card for the node\'s credits, whole into the pack; credits instead retired', () => {
    let g = at('fight');
    const n = g.run!.nodes.find((x) => x.id === g.run!.at)!;
    g = apply(g, { type: 'run/skip' }, 'host');
    const o = g.run!.offers!.c1, C = nodeCredits('fight', n.depth, g.run!.stage);
    expect(o.weapons).toHaveLength(SV.rewards.offer.fight); expect(o.instead).toBeUndefined();
    expect(o.materials).toEqual(SV.rewards.materials.items.map((m: any) => ({ item: m.item, n: Math.ceil(C / m.per_credits) })));
    const had = (cid: string, id: string) => has(g, cid, (x) => (x.item || x.id) === id);
    const p = apply(g, { type: 'run/pick', charId: 'c1', choice: 'materials' }, 'host');
    for (const m of o.materials!) expect(has(p, 'c1', (x) => (x.item || x.id) === m.item)).toBe(had('c1', m.item) + m.n);
    expect(p.story.entries.at(-1)!.text).toMatch(/takes the materials: /);
    expect(packOf(p.characters.c1).filter((x) => x.weapon === o.weapons[0].id && !x.mags).length).toBe(packOf(g.characters.c1).filter((x) => x.weapon === o.weapons[0].id && !x.mags).length);
  });

  it('every foe of a Survival fight carries the flag: no weapon or magazines drop, materials are given (gun: gunpowder and casings)', () => {
    const g = at('fight');
    const foes = g.combat!.units.filter((u) => u.side === 'foe');
    expect(foes.length).toBeGreaterThan(0);
    for (const u of foes) {
      expect(u.drops!.gear).toBe(false);
      const gun = (WEAPON as any)[u.weapon]?.ammo && (WEAPON as any)[u.weapon]?.magazine != null && (WEAPON as any)[u.weapon]?.category !== 'thrown';
      expect((u.drops!.items || []).map((e) => e.item)).toEqual([...(gun ? SV.drops.gun : []), ...(SV.drops.by_table[u.drops!.table!] || [])].map((e: any) => e.item));
    }
    // the fight played through the reducer: what dies leaves no gear on its tile
    const r = new Rec(g, DUO); r.fight(40);
    const lines = (r.g.combat?.dropLines || []) as { line: string }[];
    for (const l of lines) for (const u of foes) expect(l.line).not.toContain((WEAPON as any)[u.weapon]?.name + ' (worn)');
    const piles = (r.g.combat?.objects || []).filter((o: any) => o.kind === 'pile');
    for (const p of piles) for (const e of p.items || []) { expect(e.pack?.kind).not.toBe('weapon'); expect(e.pack?.mags).toBeUndefined(); }
    expect(lines.length).toBeGreaterThan(0);
    expect(piles.flatMap((p: any) => p.items || []).some((e: any) => [...SV.drops.gun, ...Object.values(SV.drops.by_table).flat()].some((d: any) => d.item === e.item))).toBe(true);
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
