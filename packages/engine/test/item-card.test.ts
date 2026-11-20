// Items 2.0 lane A3 (design section 6): the item card's one view-model (gearpreview.ts itemCard, carried on every
// gear preview as `card`). What a card says about an instance comes from the engine: its name, the picture chain, the
// grade with its word and marks (the rarity rows), whether it holds a grade at all (the grade step's own test), its
// family and form, its maker line, its tags, its second skill, an empty Weapon Art slot. The worn slots: a worn piece and
// body armour are previewed at their grade, and compared against what is worn there at its grade.
import { describe, it, expect } from 'vitest';
import { type GameState, apply, WEAPON, RARITY, packOf, itemTags, itemCard, gearPreview, compareGear, heldAgainst, shopView, armourOf } from '../src';
import { bindGame } from '../src/effects/hooks';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import type { Pc } from './helpers/replay';

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const W = <T,>(g: GameState, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const line = (p: any, k: string) => p.lines.find((l: any) => l.key === k);

function atPlace(kind: 'forge' | 'shop'): GameState {
  const g0 = clone(startRun(survivalRoom('PHC-0001', DUO, { test: true }), 'PHC-0001')), r = g0.run!;
  const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map';
  for (const c of Object.values(g0.characters)) c.credits = 20000;
  let g = g0; for (let i = 0; i < DUO.length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  expect(g.run!.at).toBe(n.id);
  return g;
}

describe('the item card view-model (Items 2.0 lane A3)', () => {
  it('a weapon in a family: its family and form in words, its maker line, its tags, its grade from the rarity rows', () => {
    const k = itemCard({ id: 'sabre' });
    expect(k).toMatchObject({ id: 'sabre', name: (WEAPON.sabre as any).name, kind: 'light_melee', family: 'cavalry_blades', familyName: 'Cavalry blades', form: 'dex', formWord: 'Dexterity',
      familyLine: 'Cavalry blades, Dexterity', line: 'officers', lineWord: 'Officers', grade: 'standard', gradeWord: 'Standard', marks: 0, graded: true, unique: false, weaponArt: null });
    expect(k.tags).toEqual(itemTags('sabre'));
    expect(k.pictures[0]).toBe('sabre');
    const f = itemCard({ id: 'sabre', rarity: 'masterwork' });
    expect([f.grade, f.gradeWord, f.marks]).toEqual(['masterwork', 'Masterwork', RARITY.masterwork.marks]);
    expect(f.tags).toContain('grade:masterwork');
  });
  it('holds a grade only where the grade step would grade it (a gun, a focus, a graded worn piece, body armour; never a grenade, a stim, a magazine, an ungraded worn piece)', () => {
    for (const id of ['service_pistol', 'evoker', 'trauma_plate', 'armour:2']) expect(itemCard({ id }).graded, id).toBe(true);
    for (const id of ['frag_grenade', 'stim_injector', 'mag:service_pistol', 'field_helmet', 'fists']) expect(itemCard({ id }).graded, id).toBe(false);
  });
  it('body armour is a card too: its class row\'s name, its family and form, the body slot', () => {
    const k = itemCard({ id: 'armour:3' });
    expect(k).toMatchObject({ kind: 'armour', form: 'heavy', graded: true });
    expect(k.tags).toContain('family:vests'); // (the class rows name vests; data/families.json has no vests row yet: the card then draws no family line)
    expect(k.name).toMatch(/ armour$/);
    expect(k.tags).toContain('slot:torso_outer');
  });
  it('the picture chain: its own id, its variant\'s base, then its family\'s rows (the Standard form first); a row in no family is its own', () => {
    const v = Object.keys(WEAPON).find((id) => (WEAPON[id] as any).variant_of)!, base = (WEAPON[v] as any).variant_of;
    const pv = itemCard({ id: v }).pictures;
    expect(pv.slice(0, 2)).toEqual([v, base]);
    expect(pv).not.toContain(undefined);
    const fam = itemCard({ id: 'sabre' }).pictures;
    for (const id of fam) expect(itemTags(id), id).toContain('family:cavalry_blades');
    expect(itemCard({ id: 'afterword' }).pictures).toEqual(['afterword']);
    const gun = itemCard({ id: 'service_pistol' }).pictures, std = gun.slice(1).filter((id) => itemTags(id).includes('form:standard'));
    if (std.length) expect(gun.slice(1, 1 + std.length)).toEqual(std);
  });
  it('the second skill is named, and not yet built (design item 10: the card shows it only when its effect is)', () => {
    expect(itemCard({ id: 'parlour_pistol' }).secondSkill).toEqual({ id: 'ingenuity', name: 'Ingenuity', built: false });
    expect(itemCard({ id: 'sabre' }).secondSkill).toBeNull();
  });
});

describe('the cards a shop draws carry the view-model (the real path: shopView)', () => {
  it('every card of the counter and today\'s gear has its card, at its own grade', () => {
    const g = atPlace('shop'), v = shopView(g as any, ownerOf(0))!;
    const cards = [...v.shelves.flatMap((s) => s.cards), ...v.gear].filter((c) => !c.id.startsWith('restock:'));
    expect(cards.length).toBeGreaterThan(3);
    for (const c of cards) { expect(c.preview.card.id, c.key).toBe(c.id); expect(c.preview.card.grade, c.key).toBe(c.rarity); expect(c.preview.card.marks).toBe(c.marks); expect(c.preview.card.gradeWord).toBe(c.rarityWord); }
  });
});

describe('the worn slots (lane A3): a worn piece and body armour previewed and compared at their grade', () => {
  it('bought, worn and graded at the Forge: the card and the compare read the worn grade; the armour line follows arm', () => {
    let g = atPlace('forge');
    g.run!.visit = { ...g.run!.visit!, stock: [{ id: 'trauma_plate', price: 1 } as any] };
    g = apply(g, { type: 'run/forge', charId: 'c1', slot: 0 }, 'host');
    const idx = packOf(g.characters.c1).findIndex((x) => (x.item || x.id) === 'trauma_plate');
    g = apply(g, { type: 'gear/equip', charId: 'c1', idx, to: 'worn' }, 'host');
    g = apply(g, { type: 'run/upgrade', charId: 'c1', where: 'worn:inner_torso', place: 'forge' }, 'host');
    const c = g.characters.c1;
    expect(c.wornState).toEqual({ inner_torso: { rarity: 'fine' } });
    W(g, () => {
      expect(heldAgainst(c, { id: 'trauma_plate' })).toEqual({ inst: { id: 'trauma_plate', rarity: 'fine' }, slot: 'Inner torso' });
      const cmp = compareGear(c, { id: 'trauma_plate' });
      expect(cmp.held!.card.grade).toBe('fine');
      const was = RARITY.fine.arm;
      try {
        const plain = line(gearPreview(c, { id: 'trauma_plate', rarity: 'fine' }), 'armour').num;
        (RARITY as any).fine.arm = 2;
        expect(line(gearPreview(c, { id: 'trauma_plate', rarity: 'fine' }), 'armour').num).toBeCloseTo(plain * 2, 6);
        expect(line(gearPreview(c, { id: 'trauma_plate' }), 'armour').num).toBeCloseTo(plain, 6); // Standard: arm 1
      } finally { (RARITY as any).fine.arm = was; }
    });
  });
  it('body armour: what the class adds over none, level-scaled as the fight reads it (armourOf), and compared against the class worn', () => {
    const g = atPlace('forge'), c = g.characters.c1; c.armourClass = 1; c.wornState = { torso_outer: { rarity: 'fine' } };
    W(g, () => {
      const p = gearPreview(c, { id: 'armour:3' });
      expect(p.kind).toBe('armour'); expect(p.card.id).toBe('armour:3');
      const x = { ...c, armourClass: 3, wornState: undefined }, x0 = { ...c, armourClass: 0, wornState: undefined };
      expect(line(p, 'armour').num).toBeCloseTo(armourOf(x as any) - armourOf(x0 as any), 6);
      expect(heldAgainst(c, { id: 'armour:3' })).toEqual({ inst: { id: 'armour:1', rarity: 'fine' }, slot: 'Body armour' });
    });
  });
});
