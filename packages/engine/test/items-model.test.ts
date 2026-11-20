// Rules 1.91 (Items 2.0 stage A, lane A1): the item model. The tag reader (itemTags, itemsWith) and the families;
// the grade ladder read from the rarity rows; the pools that read tags give the same lists as the category filters they
// replaced (so the same seeded stock: the shop's roll and the reward offer are pure functions of these lists and the
// seed); the unique-ready variants line on a TEST-ONLY fixture row (no unique ships): its fixed grade at a grant, its
// effects held while it is in a hand (through the reducer's gear/equip), the Forge's grade step refused (through the
// reducer's run/upgrade); GearState.weapon_art never written.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { type GameState, apply, RuleError, WEAPON, ITEM, VARIANT_MOD, RULES, RARITY, GRADES, SOLD_GRADES, gradeWord, isGrade, priceOf, packOf, setGrade,
  itemTags, itemsWith, tagOf, hasTag, itemFamilyOf, familyForm, fixedGradeOf, FAMILY, ITEM_TAG_KINDS, expandVariants, lootToPack, rolledGear, archetypeWeapons,
  weaponTeaches, statQuery, bindGame, holds, armPenalty, meleeReachOf } from '../src';
import variantsJ from '../../../data/variants.json';
import svJ from '../../../data/survival.json';
import { storyWith, fightWith } from './helpers/perkfight';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import type { Pc } from './helpers/replay';

const SV: any = svJ;

describe('rules 1.91 items 7900, 7901: the tags', () => {
  it('the closed list of kinds is the data list; no explosive and no rarity kind', () => {
    expect(ITEM_TAG_KINDS).toEqual(((RULES as any).item_tag_kinds as any[]).map((k) => k.id));
    expect(ITEM_TAG_KINDS).not.toContain('explosive'); expect(ITEM_TAG_KINDS).not.toContain('rarity');
  });
  it('a row with no family is its own family; the kind is the raw category; the grade is the instance\'s', () => {
    expect(itemTags('sabre')).toEqual(['kind:light_melee', 'family:sabre', 'slot:main_hand', 'grade:standard']);
    expect(itemTags('sabre', { rarity: 'fine' })).toContain('grade:fine');
    expect(tagOf('evoker', 'kind')).toBe('focus'); expect(tagOf('evoker', 'slot')).toBe('off_hand');
    expect(itemTags('ballistic_helmet')).toEqual(expect.arrayContaining(['kind:armour', 'slot:head']));
    expect(itemTags('armour:3')).toEqual(['kind:armour', 'family:vests', 'form:heavy', 'slot:torso_outer', 'grade:standard']); // rules 1.91 item 7950: the class row's tag fields (lane A2)
    expect(itemTags('no_such_thing')).toEqual([]);
    // a variant is its base's family
    const v = Object.keys(WEAPON).find((id) => (WEAPON[id] as any).variant_of)!;
    expect(itemFamilyOf(v)).toBe((WEAPON[v] as any).variant_of);
  });
  it('the role tags: the row\'s tags (lever, electronic, evoker_linked) and natural on the fists and the bite', () => {
    expect(hasTag('lever_carbine', 'role:lever')).toBe(true);
    expect(itemsWith({ all: ['role:natural'] })).toEqual(['fists', 'beast_bite']);
  });
  it('itemsWith: all / any / none, from one table, rolled (priced, no variant)', () => {
    const thrown = itemsWith({ from: 'weapons', all: ['kind:thrown'] });
    expect(thrown).toEqual(Object.keys(WEAPON).filter((id) => WEAPON[id].category === 'thrown'));
    const rolled = itemsWith({ from: 'weapons', rolled: true });
    expect(rolled.some((id) => (WEAPON[id] as any).variant_of)).toBe(false);
    expect(rolled.every((id) => priceOf(id) != null)).toBe(true);
  });
});

describe('rules 1.91 item 7920: the pools read tags and hold what the category filters held', () => {
  // The filters as they were written before rules 1.91 (shop.ts GEAR_POOL and ITEM_POOL, rewards.ts PICKABLE,
  // loadout.ts archetypeWeapons, progress.ts forgeStock): the same lists in the same order mean the same seeded rolls.
  const oldPickable = [...Object.keys(WEAPON).filter((id) => (WEAPON[id] as any).category !== 'thrown'), ...Object.keys(ITEM).filter((id) => (ITEM[id] as any).focus)]
    .filter((id) => priceOf(id) != null && !((WEAPON[id] || ITEM[id]) as any).variant_of);
  it('the reward pick and the shop\'s rolled gear', () => {
    expect(rolledGear()).toEqual(oldPickable);
    expect([...rolledGear()].sort()).toEqual([...oldPickable].sort());
  });
  it('the shop\'s rolled items', () => {
    const counter = new Set((SV.shop.always as any[]).flatMap((s) => s.ids.map((x: any) => x.id)));
    const old = Object.keys(ITEM).filter((id) => (SV.shop.stock.item_categories as string[]).includes((ITEM[id] as any).category) && !(ITEM[id] as any).focus && !counter.has(id) && priceOf(id) != null).sort();
    const now = itemsWith({ from: 'items', any: (SV.shop.stock.item_categories as string[]).map((k) => 'kind:' + k), none: ['kind:focus'], rolled: true }).filter((id) => !counter.has(id)).sort();
    expect(now).toEqual(old);
  });
  it('the camp loadout\'s archetype weapons', () => {
    for (const a of SV.loadout.archetypes.list as any[]) {
      const old = Object.keys(WEAPON).filter((id) => { const w: any = WEAPON[id]; return w.mastery_family === a.family && w.category === a.category && !w.variant_of && !(a.skip || []).includes(id) && priceOf(id) != null; })
        .sort((x, y) => (priceOf(x) || 0) - (priceOf(y) || 0) || (x < y ? -1 : 1));
      expect(archetypeWeapons(a), a.id).toEqual(old);
    }
  });
  it('the Forge\'s rolled stock (mods and worn pieces)', () => {
    const old = (Object.values(ITEM) as any[]).filter((it) => (it.category === 'mod' || (it.category === 'armour' && it.slot)) && priceOf(it.id) != null).map((it) => it.id);
    const now = itemsWith({ from: 'items', any: ['kind:mod', 'kind:armour'] }).filter((id) => { const it: any = ITEM[id]; return (it.category === 'mod' || !!it.slot) && priceOf(id) != null; });
    expect(now).toEqual(old);
  });
});

describe('rules 1.91 items 7902 to 7904: the families', () => {
  it('two sample families, their forms; a row with no family keeps its own technique', () => {
    expect(Object.keys(FAMILY)).toEqual(['cavalry_blades', 'axes']);
    expect(FAMILY.cavalry_blades.forms.map((f) => f.id)).toEqual(['dex', 'hybrid', 'str']);
    expect(weaponTeaches('sabre')).toBe((WEAPON.sabre as any).phys.teaches);
    expect(familyForm('sabre')).toBeNull();
  });
  it('a row that names a family and form and no technique lends its family form\'s (the one copy)', () => {
    const was = WEAPON.sabre, row: any = { ...was, family: 'cavalry_blades', form: 'dex', phys: { ...(was as any).phys } };
    delete row.phys.teaches;
    WEAPON.sabre = row;
    try {
      expect(familyForm('sabre')?.teaches).toBe('riposte');
      expect(weaponTeaches('sabre')).toBe('riposte');
      expect(itemTags('sabre')).toEqual(expect.arrayContaining(['family:cavalry_blades', 'form:dex']));
    } finally { WEAPON.sabre = was; }
  });
  it('the hit skill: every row\'s skill is its phys.hits_with', () => {
    for (const w of Object.values(WEAPON) as any[]) expect(w.skill, w.id).toBe(w.phys.hits_with);
  });
});

describe('rules 1.91 items 7905, 7906: the grade ladder is the rarity rows', () => {
  it('order, words, sold, and the arm column (1 for every grade)', () => {
    expect(GRADES).toEqual(['standard', 'fine', 'masterwork', 'relic', 'celestial']);
    expect(SOLD_GRADES).toEqual(['standard', 'fine', 'masterwork', 'relic']);
    expect(GRADES.map(gradeWord)).toEqual(['Standard', 'Fine', 'Masterwork', 'Relic', 'Celestial']);
    expect(GRADES.map((r) => RARITY[r].arm)).toEqual([1, 1, 1, 1, 1]);
    expect(isGrade('masterwork')).toBe(true); expect(isGrade('rare')).toBe(false);
  });
});

describe('rules 1.91 item 7910 (N2): self_holds hands takes tags', () => {
  it('a hand holding a weapon of a family answers its tags', () => {
    const s = storyWith([{ kit: 'soldier' }]), c = s.g.characters.c1;
    const tag = 'kind:' + WEAPON[c.weapon].category;
    expect(holds(c, { hands: { tags: [tag] } } as any)).toBe(true);
    expect(holds(c, { hands: { tags: ['family:no_such_family'] } } as any)).toBe(false);
  });
});

// ------------------------------------------------------------------------------------------- the unique-ready line
const FIX_ID = 'ork_machete.test_unique';
const FIX = { kinds: (variantsJ as any).kinds, items: [{ id: FIX_ID, name: 'Test Teeth', base: 'ork_machete', rarity: 'relic', unique: true,
  mods: [{ kind: 'rider', form: 'bleed' }], effects: [{ op: 'stat_mod', stat: 'injury_resist', value: 7 }], weapon_art: null }] };
const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const W = <T,>(g: GameState, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };

describe('rules 1.91 item 7917: the unique-ready variants line (a test-only fixture row; zero uniques ship)', () => {
  beforeAll(() => {
    const made = expandVariants(FIX, WEAPON as any, ITEM as any);
    for (const w of made.weapons) (WEAPON as any)[w.id] = w;
    for (const m of made.mods) VARIANT_MOD[m.id] = m;
  });
  afterAll(() => { delete (WEAPON as any)[FIX_ID]; delete VARIANT_MOD[FIX_ID.replace(/^/, 'vmod.') + '.unique']; for (const k of Object.keys(VARIANT_MOD)) if (k.startsWith('vmod.' + FIX_ID)) delete VARIANT_MOD[k]; });

  it('no unique ships in data', () => {
    expect(((variantsJ as any).items as any[]).filter((l) => l.unique)).toEqual([]);
  });
  it('the loader: the row is a unique, its effects one modifier item held like the others; its family its base\'s; never rolled', () => {
    const w: any = WEAPON[FIX_ID];
    expect(w.unique).toBe(true);
    expect(w.variant_mods).toContain('vmod.' + FIX_ID + '.unique');
    expect(VARIANT_MOD['vmod.' + FIX_ID + '.unique'].effects).toEqual(FIX.items[0].effects);
    expect(itemTags(FIX_ID)).toEqual(expect.arrayContaining(['unique:true', 'family:ork_machete', 'grade:relic']));
    expect(fixedGradeOf(FIX_ID)).toBe('relic'); expect(fixedGradeOf('ork_machete')).toBeNull();
    expect(rolledGear()).not.toContain(FIX_ID); expect(itemsWith({ rolled: true })).not.toContain(FIX_ID);
  });
  it('its fixed grade is written at a grant (the one grant converter), whatever grade is asked', () => {
    expect(lootToPack({ item: FIX_ID })[0].rarity).toBe('relic');
    expect(lootToPack({ item: FIX_ID, rarity: 'fine' })[0].rarity).toBe('relic');
    expect(lootToPack({ item: 'ork_machete', rarity: 'fine' })[0].rarity).toBe('fine'); // an ordinary row keeps what it is given
    expect(itemTags(FIX_ID, { rarity: 'standard' })).toContain('grade:relic');
  });
  it('its effects are held while it is in a hand (through the reducer: gear/equip, gear/unequip), not in the pack', () => {
    const s = storyWith([{ kit: 'soldier' }]);
    let g = clone(s.g); const c0 = g.characters.c1;
    c0.pack = [...packOf(c0), ...lootToPack({ item: FIX_ID })];
    const ir = (gg: GameState) => { const was = bindGame(gg); try { return statQuery({ c: gg.characters.c1 }, 'injury_resist' as any).add; } finally { bindGame(was); } };
    const before = ir(g);
    g = apply(g, { type: 'gear/equip', charId: 'c1', idx: packOf(g.characters.c1).length - 1, to: 'main' }, 'host');
    expect(g.characters.c1.weapon).toBe(FIX_ID);
    expect(g.characters.c1.weaponState?.rarity).toBe('relic');
    expect(ir(g) - before).toBe(7);
    g = apply(g, { type: 'gear/unequip', charId: 'c1', slot: 'main' }, 'host');
    expect(ir(g)).toBe(before);
    // the Weapon Art slot is never written (rules 1.91 item 7918)
    expect(JSON.stringify(g.characters.c1)).not.toMatch(/weapon_art/);
  });
  it('the Forge\'s grade step refuses it (run/upgrade through the reducer), and setGrade will not change it', () => {
    const g0 = clone(startRun(survivalRoom('PHC-0001', DUO, { test: true }), 'PHC-0001')), r = g0.run!;
    const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
    n.kind = 'forge' as any; r.at = prev.id; r.state = 'map';
    for (const c of Object.values(g0.characters)) c.credits = 10000;
    g0.characters.c1.weapon = FIX_ID; g0.characters.c1.weaponState = { rarity: 'relic' };
    let g = g0; for (let i = 0; i < DUO.length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
    expect(refused(g, { type: 'run/upgrade', charId: 'c1', where: 'main', place: 'forge' })).toBe('The Test Teeth\'s grade is its own: no armourer changes it.');
    const c = clone(g).characters.c1;
    expect(setGrade(c, 'main', 'celestial')).toBe('Its grade is its own: Relic.');
  });
});

describe('rules 1.91 items 7911 to 7914: the two intended changes', () => {
  it('one-handed is the row\'s hands: an off-arm injury costs a one-handed weapon nothing, a two-handed one -2', () => {
    const f = fightWith([{ kit: 'soldier' }], [{ tier: 'soldier' }]), u: any = f.pc;
    W(f.g, () => {
      u.hand = 'right'; u.injuries = [{ loc: 'arm', side: 'left' }];
      for (const id of ['ork_machete', 'legion_pdw', 'sawn_off', 'spellslinger_pistol', 'evoker_blade', 'emanator_gauntlet', 'emanator_katana', 'sabre']) expect(armPenalty(u, WEAPON[id]), id).toBe(0);
      for (const id of ['maul', 'hellraiser_service_rifle']) expect(armPenalty(u, WEAPON[id]), id).toBe(-2);
      u.injuries = [{ loc: 'arm', side: 'right' }];
      expect(armPenalty(u, WEAPON.ork_machete)).toBe(-2);
    });
  });
  it('one reach reader: the Reach property, the older reach_2, no id; the grand staff and the banner reach 2', () => {
    const f = fightWith([{ kit: 'soldier' }], [{ tier: 'soldier' }]), u: any = f.pc;
    W(f.g, () => {
      for (const [id, r] of [['lance', 2], ['glaive', 2], ['grand_staff', 2], ['bot_thread_banner', 2], ['sabre', 1], ['service_pistol', 1]] as const) { u.weapon = id; expect(meleeReachOf(u, 'melee'), id).toBe(r); }
    });
  });
});
