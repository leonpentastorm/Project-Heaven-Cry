// Rules 1.91 items 7950 to 7958 (Items 2.0 stage A, lane A2: armour). Everything through the real paths: the reducer
// (gear/equip, gear/unequip, gear/give, run/forge, run/upgrade, run/fit, sandbox's armour), the load door
// (migrateLoaded), a fight begun by the Narrator's turn. The class rows are the one copy of body armour; worn pieces and
// the body armour carry a grade (wornState); a grade scales the armour value only, by its rarity row's `arm`; the
// Forge's grade step takes armour (no Relic step), its fitting reaches Juggernaut at the class row's price; a worn
// piece's own non-gear effects are held (N4).
import { describe, it, expect, afterEach } from 'vitest';
import { type GameState, apply, RuleError, ITEM, ARMOUR, ARMOUR_CLASSES, RARITY, packOf, armourOf, gearBonus, noSprintClass, armouredClass, LIGHT_CAP, ARMOURED_FROM,
  bodyArmourValue, migrateLoaded, heldOfChar, statQuery, bindGame, setGrade, itemTags, runOptions, priceOf, expandVariants, unitFromCharacter } from '../src';
import { addItems } from '../src/effects/hooks';
import variantsJ from '../../../data/variants.json';
import svJ from '../../../data/survival.json';
import techJ from '../../../data/techniques.json';
import { storyWith } from './helpers/perkfight';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import type { Pc } from './helpers/replay';

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const W = <T,>(g: GameState, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const SV: any = svJ, UP = SV.grade_up;

/** A run standing at a Forge (a depth-5 node made a Forge), every character with credits to spend. */
function atForge(kind: 'forge' | 'shop' = 'forge'): GameState {
  const g0 = clone(startRun(survivalRoom('PHC-0001', DUO, { test: true }), 'PHC-0001')), r = g0.run!;
  const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map';
  for (const c of Object.values(g0.characters)) c.credits = 20000;
  let g = g0; for (let i = 0; i < DUO.length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  expect(g.run!.at).toBe(n.id);
  return g;
}

describe('rules 1.91 items 7950, 7951: the class rows are the one copy', () => {
  it('ARMOUR is read from the rows: every class of 0.33 gives what it gave; class 6 is the breacher plate', () => {
    // the typed table of 0.33, kept here as the record that nothing moved
    const was = [{ value: 0, move: 0, dodge: 0 }, { value: 5, move: 0, dodge: 0 }, { value: 10, move: 0, dodge: 0 }, { value: 15, move: -0.5, dodge: 0 }, { value: 20, move: -0.5, dodge: -1 }, { value: 25, move: -1, dodge: 0 }];
    was.forEach((w, i) => expect({ value: ARMOUR[i].value, move: ARMOUR[i].move, dodge: ARMOUR[i].dodge }).toEqual(w));
    expect(ARMOUR_CLASSES.map((r) => r.class)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const bp = ARMOUR_CLASSES[6];
    expect([bp.name, bp.value, bp.weight_kg, bp.price_credits, bp.penalty.movement, !!bp.penalty.no_sprint]).toEqual(['Breacher plate', 18, 14, 1400, -0.5, false]);
    expect((techJ as any).rules.gear_gates.heavy_armour.classes['6']).toBe(2);
    expect(priceOf('armour:6')).toBe(1400);
    expect(itemTags('armour:6')).toEqual(['kind:armour', 'family:plate', 'form:light', 'slot:torso_outer', 'grade:standard']);
  });
  it('the fields code reads in place of a class number: no Sprint (5 only), armoured (2 on), the light cap (Class I\'s 5)', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(noSprintClass)).toEqual([false, false, false, false, false, true, false]);
    expect([0, 1, 2, 3, 4, 5, 6].map(armouredClass)).toEqual([false, false, true, true, true, true, true]);
    expect(LIGHT_CAP).toBe(5); expect(ARMOURED_FROM).toBe(10);
  });
  it('in a fight: Juggernaut forbids Sprint, the breacher plate does not; the plate\'s armour is its row\'s, scaled by level', () => {
    const s = storyWith([{ kit: 'soldier', skills: { pain_threshold: 5 } }]);
    const sprint = (cls: number) => W(s.g, () => { const c = clone(s.g).characters.c1; c.armourClass = cls; return unitFromCharacter(c, '1,1', s.g.rng as any) as any; });
    expect(sprint(5).noSprint).toBe(true); expect(sprint(6).noSprint).toBe(false);
    const u6 = sprint(6); expect(u6.armour).toBe(armourOf({ ...s.g.characters.c1, armourClass: 6 } as any, W(s.g, () => gearBonus(s.g.characters.c1, 'armour_bonus'))));
  });
  it('the Proving Ground sets class 6 (a class row), asking its Pain Threshold 2', () => {
    const s = storyWith([{ kit: 'soldier' }]);
    const g = clone(s.g); (g as any).sandbox = { on: true }; g.characters.c1.skills.pain_threshold = 1;
    const why = refused(g, { type: 'sandbox/armour', charId: 'c1', armourClass: 6 });
    expect(why).toMatch(/Pain Threshold 2/);
  });
});

describe('rules 1.91 item 7958: the inner torso slot is one key; an old save\'s worn.torso_inner is moved on load', () => {
  it('migrateLoaded (the load door) moves it, once; a filled slot sends the older piece to the pack; no old key, nothing written', () => {
    const s = storyWith([{ kit: 'soldier' }, { kit: 'soldier' }]);
    const save = clone(s.g), [a, b] = Object.keys(save.characters);
    (save.characters[a] as any).worn = { torso_inner: 'trauma_plate', head: 'field_helmet' };
    (save.characters[b] as any).worn = { torso_inner: 'padded_undershirt', inner_torso: 'trauma_plate' };
    const plain = clone(s.g);
    const g = migrateLoaded(JSON.parse(JSON.stringify(save)));
    expect(g.characters[a].worn).toEqual({ head: 'field_helmet', inner_torso: 'trauma_plate' });
    expect(g.characters[b].worn).toEqual({ inner_torso: 'trauma_plate' });
    expect(packOf(g.characters[b]).some((x) => (x.item || x.id) === 'padded_undershirt')).toBe(true);
    // and it plays on: taking the piece off puts it in the pack
    const g2 = apply(g, { type: 'gear/unequip', charId: a, slot: 'inner_torso' }, g.characters[a].owner);
    expect(g2.characters[a].worn).toEqual({ head: 'field_helmet' });
    // a save with no old key loads as it was
    expect(migrateLoaded(JSON.parse(JSON.stringify(plain))).characters).toEqual(plain.characters);
  });
});

describe('rules 1.91 items 7953 to 7955: armour grades through the Forge (buy, grade, wear, take off, give)', () => {
  it('buy a piece, grade it worn, take it off and give it: the grade goes with it', () => {
    let g = atForge();
    g.run!.visit = { ...g.run!.visit!, stock: [{ id: 'trauma_plate', price: priceOf('trauma_plate')! }] };
    const cr0 = g.characters.c1.credits!;
    g = apply(g, { type: 'run/forge', charId: 'c1', slot: 0 }, 'host');
    const idx = packOf(g.characters.c1).findIndex((x) => (x.item || x.id) === 'trauma_plate');
    g = apply(g, { type: 'gear/equip', charId: 'c1', idx, to: 'worn' }, 'host');
    expect(g.characters.c1.worn?.inner_torso).toBe('trauma_plate');
    expect(g.characters.c1.wornState).toBeUndefined(); // Standard: nothing written
    // the Forge lists the worn piece's grade step, at the ladder's fee and the Forge's factor
    const opt = runOptions(g, 'c1').find((o) => o.key === 'grade:worn:inner_torso')!;
    expect(opt.price).toBe(Math.round(UP.price.fine * UP.places.forge)); expect(opt.why).toBeNull();
    const before = W(g, () => armourOf(g.characters.c1, gearBonus(g.characters.c1, 'armour_bonus')));
    g = apply(g, { type: 'run/upgrade', charId: 'c1', where: 'worn:inner_torso', place: 'forge' }, 'host');
    expect(g.characters.c1.wornState).toEqual({ inner_torso: { rarity: 'fine' } });
    expect(g.characters.c1.credits).toBe(cr0 - priceOf('trauma_plate')! - opt.price);
    // arm is 1 for every grade: the armour does not move
    expect(W(g, () => armourOf(g.characters.c1, gearBonus(g.characters.c1, 'armour_bonus')))).toBe(before);
    // one step a visit (at a stage where Masterwork is open)
    g.run!.stage = 9;
    expect(refused(g, { type: 'run/upgrade', charId: 'c1', where: 'worn:inner_torso', place: 'forge' })).toMatch(/One upgrade per visit/);
    // take it off: the pack line is Fine; give it: the friend's pack line is Fine; the friend wears it: its wornState is Fine
    g = apply(g, { type: 'gear/unequip', charId: 'c1', slot: 'inner_torso' }, 'host');
    expect(g.characters.c1.wornState).toBeUndefined();
    const li = packOf(g.characters.c1).findIndex((x) => (x.item || x.id) === 'trauma_plate');
    expect(packOf(g.characters.c1)[li].rarity).toBe('fine');
    g = apply(g, { type: 'gear/give', charId: 'c1', to: 'c2', idx: li }, 'host');
    const lj = packOf(g.characters.c2).findIndex((x) => (x.item || x.id) === 'trauma_plate');
    expect(packOf(g.characters.c2)[lj].rarity).toBe('fine');
    g = apply(g, { type: 'gear/equip', charId: 'c2', idx: lj, to: 'worn' }, ownerOf(1));
    expect(g.characters.c2.wornState).toEqual({ inner_torso: { rarity: 'fine' } });
  });
  it('the grade scales the armour value only, by the rarity row\'s arm (a test value of arm, put back after)', () => {
    let g = atForge(); const c = g.characters.c1;
    c.worn = { inner_torso: 'trauma_plate', head: 'field_helmet' }; c.wornState = { inner_torso: { rarity: 'fine' }, torso_outer: { rarity: 'fine' } }; c.armourClass = 2;
    const was = RARITY.fine.arm;
    try {
      const plain = W(g, () => ({ arm: gearBonus(c, 'armour_bonus'), ir: gearBonus(c, 'injury_resist_bonus'), body: bodyArmourValue(c) }));
      expect(plain).toEqual({ arm: 3, ir: 10, body: 10 });
      (RARITY as any).fine.arm = 2;
      expect(W(g, () => ({ arm: gearBonus(c, 'armour_bonus'), ir: gearBonus(c, 'injury_resist_bonus'), body: bodyArmourValue(c) }))).toEqual({ arm: 6, ir: 10, body: 20 });
    } finally { (RARITY as any).fine.arm = was; }
  });
  it('body armour: graded at the Forge (wornState.torso_outer); a fitting is a new plate at Standard; the fitting reaches Juggernaut at its row\'s price', () => {
    let g = atForge(); const c = g.characters.c1;
    c.armourClass = 4; c.skills.pain_threshold = 5;
    g = apply(g, { type: 'run/upgrade', charId: 'c1', where: 'worn:torso_outer', place: 'forge' }, 'host');
    expect(g.characters.c1.wornState).toEqual({ torso_outer: { rarity: 'fine' } });
    const fit = runOptions(g, 'c1').find((o) => o.key === 'fit')!;
    expect(fit.price).toBe(ARMOUR_CLASSES[5].price_credits); expect(SV.armour_fit.price['5']).toBeUndefined(); expect(fit.why).toBeNull();
    g = apply(g, { type: 'run/fit', charId: 'c1' }, 'host');
    expect(g.characters.c1.armourClass).toBe(5); expect(g.characters.c1.wornState).toBeUndefined();
    // past Juggernaut the Forge fits nothing (the breacher plate is no forge_fit row)
    expect(runOptions(g, 'c1').some((o) => o.key === 'fit')).toBe(false);
    expect(refused(g, { type: 'run/fit', charId: 'c1' })).toMatch(/heaviest class the Forge fits/);
  });
  it('refused: the Relic step on armour, a shop\'s step on armour, an ungraded piece', () => {
    let g = atForge(); const c = g.characters.c1;
    c.worn = { inner_torso: 'trauma_plate' }; c.wornState = { inner_torso: { rarity: 'masterwork' } }; g.run!.stage = 9;
    expect(refused(g, { type: 'run/upgrade', charId: 'c1', where: 'worn:inner_torso', place: 'forge', prop: 'x' })).toMatch(/Armour takes no Relic property yet/);
    let s = atForge('shop'); s.characters.c1.worn = { inner_torso: 'trauma_plate' };
    expect(refused(s, { type: 'run/upgrade', charId: 'c1', where: 'worn:inner_torso', place: 'shop' })).toBe('Only a Forge grades armour.');
    expect(runOptions(s, 'c1').some((o) => String(o.key).includes('worn:'))).toBe(false);
    const row: any = ITEM.field_helmet, had = 'graded' in row, was = row.graded;
    try {
      row.graded = false; const x = clone(g).characters.c1; x.worn = { head: 'field_helmet' };
      expect(setGrade(x, 'worn:head', 'fine')).toBe('There is no weapon or focus there to grade.');
    } finally { if (had) row.graded = was; else delete row.graded; }
  });
});

describe('rules 1.91 item 7956 (N4): a worn piece\'s own effects are held', () => {
  const HOOD = 'test_a2_hood';
  afterEach(() => { delete (ITEM as any)[HOOD]; addItems('relic', []); });
  it('a pieces of 0.33 (gear ops only) adds nothing to the held list', () => {
    const s = storyWith([{ kit: 'soldier' }]); const c = clone(s.g).characters.c1;
    const bare = heldOfChar(c);
    c.worn = { head: 'ballistic_helmet', inner_torso: 'trauma_plate', footwear: 'heavy_boots', head_accessory: 'night_goggles' };
    expect(heldOfChar(c)).toEqual(bare);
  });
  it('a hood\'s seen_range (a test-only row: the hoods are stage B\'s) is heard in a fight once it is worn', () => {
    (ITEM as any)[HOOD] = { id: HOOD, name: 'Test hood', category: 'armour', slot: 'head', weight_kg: 0.3, graded: false, effects: [{ op: 'armour_bonus', value: 1 }, { op: 'stat_mod', stat: 'seen_range', value: -2 }] };
    addItems('relic', []); // the runtime's caches: an item row was added
    const s = storyWith([{ kit: 'soldier' }]);
    s.g = clone(s.g); s.g.characters.c1.pack = [...packOf(s.g.characters.c1), { id: HOOD, item: HOOD, name: 'Test hood', qty: 1, kind: 'tool' }];
    s.act({ type: 'gear/equip', charId: 'c1', idx: packOf(s.g.characters.c1).length - 1, to: 'worn' });
    expect(heldOfChar(s.g.characters.c1).relics).toContain(HOOD);
    expect(W(s.g, () => gearBonus(s.g.characters.c1, 'armour_bonus'))).toBe(1); // its gear op is summed by gearEffects, not held
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Test fight', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '' }] } } } as any);
    const cb = s.g.combat!, pc = cb.units.find((u) => u.side === 'pc')!;
    expect(W(s.g, () => statQuery({ u: pc, cb }, 'seen_range' as any).add)).toBe(-2);
  });
});

describe('rules 1.91 item 7957: a body armour class as a variants line\'s base (a test-only line)', () => {
  it('the loader makes an items row of the armour kind in the body slot, carrying the class and its row\'s numbers', () => {
    const file = { kinds: (variantsJ as any).kinds, items: [{ id: 'test_a2_plate', name: 'Test Plate', base: 'armour:5', rarity: 'relic', unique: true, mods: [], effects: [{ op: 'stat_mod', stat: 'injury_resist', value: 5 }], weapon_art: null }] };
    const made = expandVariants(file, {}, {}, (id: string) => (id === 'armour:5' ? { id, name: 'Juggernaut', category: 'armour', slot: 'torso_outer', armour_class: 5, value: 25, weight_kg: 28, price_credits: 4000, family: 'plate', form: 'heavy', effects: [] } : null));
    expect(made.items.map((x) => [x.id, x.category, x.slot, x.armour_class, x.variant_of, x.unique])).toEqual([['test_a2_plate', 'armour', 'torso_outer', 5, 'armour:5', true]]);
    expect(made.mods.map((m) => m.id)).toEqual(['vmod.test_a2_plate.unique']);
    expect(() => expandVariants({ kinds: [], items: [{ id: 'x', name: 'X', base: 'armour:9', mods: [] }] }, {}, {})).toThrow(/body armour class/);
  });
});
