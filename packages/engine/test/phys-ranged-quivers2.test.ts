// Rules 1.53 (Leon, 14 Nov 2026): bows and quivers. A shot draws its arrow from the worn quiver (there is no Nock an
// arrow); every archer may carry two quivers and Switch quiver is the bow's reload (a reload's price); a quiver's grade
// gives arrows held and nothing else; one enchantment a quiver rides every arrow drawn from it.
import { describe, it, expect, beforeEach } from 'vitest';
import './helpers/yard16';
import { weaponActions, reloadAp, type Character, type PackItem } from '../src';
import { rig } from './helpers/physfight';
import { storyWith } from './helpers/perkfight';
import { condOn } from '../src/magic';
import { quiversOf, setQuivers, quiverHolds, carryQuiver, stowQuiver, fitQuiverMod, swapQuivers, setGrade, gearAt, QUIVERS_CARRIED } from '../src/character';
import { ITEM, WEAPON } from '../src/data';
import { priceOf } from '../src/credits';
import { enchantmentOf } from '../src/physical/ranged/quiver';
import { gearPreview, compareGear } from '../src/gearpreview';
import { bowFight } from './helpers/physfight-ranged';

beforeEach(() => rig(null));
const ENCH = ['ench_fire', 'ench_storm', 'ench_frost', 'ench_stone', 'ench_gale', 'ench_acid'];
const arrows = (n: number, type?: string): PackItem => ({ id: 'rounds:arrow', name: 'Arrow', qty: n, kind: 'ammo', calibre: 'arrow', ...(type ? { ammoType: type } : {}) });

describe('the data (rules 1.53)', () => {
  it('each quiver grade holds 20 more arrows than every quiver did before (20): Standard 40; higher grades hold more, read from data', () => {
    const a = (ITEM as any).quiver.arrows;
    expect(quiverHolds('quiver', 'standard')).toBe(a.standard); expect(a.standard).toBe(20 + 20);
    const G = ['standard', 'fine', 'masterwork', 'relic', 'celestial'];
    for (let i = 1; i < G.length; i++) expect(a[G[i]]).toBeGreaterThan(a[G[i - 1]]);
    for (const g of G) expect(quiverHolds('quiver', g as any)).toBe(a[g]);
    // the bows' own number (the quiver a bow comes with) is the Standard quiver's
    expect(WEAPON.recurve_bow.magazine).toBe(a.standard); expect(WEAPON.longbow.magazine).toBe(a.standard);
    expect(QUIVERS_CARRIED).toBe(2);
  });
  it('six enchantments, one per tone the game has (Fire, Storm, Frost, Stone, Gale, Acid), each a mod for the quiver\'s one slot, each costing damage and credits', () => {
    expect(ENCH.map((id) => (ITEM as any)[id].tone)).toEqual(['fire', 'storm', 'frost', 'stone', 'gale', 'acid']);
    for (const id of ENCH) { const e: any = (ITEM as any)[id]; expect(e.mod_slot).toBe('enchantment'); expect(e.damage_mult).toBeLessThan(1); expect(priceOf(id)).toBeGreaterThan(0); }
    expect((ITEM as any).quiver.mod_slots).toEqual(['enchantment']);
    // priced through priceOf: a graded quiver with an enchantment is its grade's price plus the enchantment's
    expect(priceOf('quiver', 'fine', ['ench_fire'])).toBe(priceOf('quiver', 'fine')! + priceOf('ench_fire')!);
  });
});

describe('out of a fight: carry, stow, enchant, grade, swap', () => {
  const archer = (pack: PackItem[] = []) => {
    const s = storyWith([{ weapon: 'recurve_bow', skills: { dexterity: 6 } }]); const c: Character = s.g.characters[Object.keys(s.g.characters)[0]];
    c.pack = [...(c.pack || []), ...pack]; return { s, c };
  };
  it('an archer with no quivers recorded (an older save) has the one its bow came with, holding what the bow held', () => {
    const { c } = archer(); delete c.quivers; c.loaded = 13;
    expect(quiversOf(c)).toEqual([{ id: 'quiver', arrows: { standard: 13 } }]);
    (c as any).phys = { ...(c.phys || {}), quiver: { recurve_bow: { standard: 5, incendiary: 2 } } };
    expect(quiversOf(c)[0].arrows).toEqual({ standard: 5, incendiary: 2 });
  });
  it('a second quiver from the pack is carried ready; a third is refused; stowing puts its arrows back in the pack', () => {
    const { c } = archer([{ id: 'quiver', item: 'quiver', name: 'Quiver', qty: 2, kind: 'tool' }, arrows(30)]);
    const i = () => c.pack!.findIndex((x) => x.item === 'quiver');
    expect(carryQuiver(c, i())).toBeNull(); expect(quiversOf(c).length).toBe(2);
    expect(carryQuiver(c, i())).toBe('You carry 2 quivers already: put one away first.');
    expect(fitQuiverMod(c, c.pack!.length, 1)).toBe('That isn\'t a mod.');
    c.pack!.push({ id: 'ench_fire', item: 'ench_fire', name: 'Ember enchantment', qty: 1, kind: 'tool' });
    expect(fitQuiverMod(c, c.pack!.length - 1, 1)).toBeNull(); expect(quiversOf(c)[1].mods).toEqual(['ench_fire']);
    c.pack!.push({ id: 'mod_scope', item: 'mod_scope', name: 'Scope', qty: 1, kind: 'tool' });
    expect(fitQuiverMod(c, c.pack!.length - 1, 1)).toBe('A quiver takes an enchantment, not a optic mod.');
    expect(swapQuivers(c)).toBeNull(); expect(quiversOf(c)[0].mods).toEqual(['ench_fire']);
    expect(stowQuiver(c, 0)).toBeNull(); expect(quiversOf(c).length).toBe(1);
    const e = c.pack!.find((x) => x.item === 'quiver' && x.mods)!; expect(e.mods).toEqual(['ench_fire']);
  });
  it('a carried quiver climbs the grade ladder through setGrade (the gear ladder the Survival shop and Forge sell): more arrows held, nothing else', () => {
    const { s, c } = archer([arrows(80)]);
    expect(gearAt(c, 'quiver:0')).toMatchObject({ id: 'quiver', rarity: 'standard' });
    expect(setGrade(c, 'quiver:0', 'celestial')).toBeNull();
    expect(quiversOf(c)[0].rarity).toBe('celestial');
    s.act({ type: 'phys/quiver', charId: c.id, weaponId: 'recurve_bow', load: { standard: quiverHolds('quiver', 'celestial') } } as any);
    expect(quiversOf(s.g.characters[c.id])[0].arrows).toEqual({ standard: quiverHolds('quiver', 'celestial') });
    // two Celestial quivers: nothing blocks the run goal
    const x = s.g.characters[c.id]; x.pack = [...x.pack!, { id: 'quiver', item: 'quiver', name: 'Quiver', qty: 1, kind: 'tool', rarity: 'celestial' }];
    expect(carryQuiver(x, x.pack.length - 1)).toBeNull(); expect(quiversOf(x).map((q) => q.rarity)).toEqual(['celestial', 'celestial']);
  });
  it('the gear preview (shop and Forge cards): a quiver shows its arrows held by grade against the worn one; an enchantment its damage and rider', () => {
    const { c } = archer();
    const pv = gearPreview(c, { id: 'quiver', rarity: 'fine' });
    expect(pv.category).toBe('Quiver'); expect(pv.lines.find((l) => l.key === 'arrows')!.num).toBe(quiverHolds('quiver', 'fine'));
    const cmp = compareGear(c, { id: 'quiver', rarity: 'fine' }); expect(JSON.stringify(cmp)).toMatch(/Worn quiver/);
    const e = gearPreview(c, { id: 'ench_frost' }); expect(e.lines.find((l) => l.key === 'arrow_dmg')!.num).toBe((ITEM as any).ench_frost.damage_mult);
  });
  it('the actions: phys/quiver loads the ready quiver (which: 1) and swaps; gear actions carry, stow and enchant; none of it in a fight', () => {
    const { s, c } = archer([{ id: 'quiver', item: 'quiver', name: 'Quiver', qty: 1, kind: 'tool' }, arrows(20, 'incendiary')]);
    s.act({ type: 'gear/equip', charId: c.id, idx: s.g.characters[c.id].pack!.findIndex((x) => x.item === 'quiver'), to: 'quiver' } as any);
    s.act({ type: 'phys/quiver', charId: c.id, weaponId: 'recurve_bow', load: { incendiary: 20 }, which: 1 } as any);
    expect(quiversOf(s.g.characters[c.id])[1].arrows).toEqual({ incendiary: 20 });
    s.act({ type: 'phys/quiver', charId: c.id, weaponId: 'recurve_bow', load: {}, swap: true } as any);
    expect(quiversOf(s.g.characters[c.id])[0].arrows).toEqual({ incendiary: 20 }); expect(s.g.characters[c.id].loaded).toBe(20);
  });
});

describe('in a fight (rules 1.53)', () => {
  const plain = (n: number) => ({ id: 'quiver', arrows: { standard: n } });
  it('a shot draws its arrow from the worn quiver as part of the shot: no Nock an arrow, its AP is the shot\'s alone', () => {
    const f = bowFight({ standard: 5 }); rig({ hit: false, die: 5 }); const a0 = f.pc.ap;
    expect(weaponActions(f.unit(f.pc.id)).map((a) => a.label)).not.toContain('Nock an arrow');
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.quiver).toEqual({ standard: 4 }); expect(f.pc.ap).toBe(a0 - (WEAPON.recurve_bow as any).ap_cost.single);
  });
  it('two quivers: Switch quiver is the bow\'s reload, at a reload\'s price, and the next arrows come from the other quiver', () => {
    const f = bowFight({ standard: 2 }, { ready: { id: 'quiver', arrows: { incendiary: 9 } } }); const u = f.unit(f.pc.id), a0 = u.ap;
    const card = weaponActions(u, f.cb).find((a) => a.id === 'reload')!;
    expect(card.label).toBe('Switch quiver'); expect(card.ap).toBe(f.bound(() => reloadAp(u, f.cb))); expect(card.ap).toBe(2); expect(card.why).toBeNull();
    f.act({ type: 'combat/reload', unitId: u.id } as any);
    const x = f.unit(u.id); expect(x.quiver).toEqual({ incendiary: 9 }); expect(x.ammo).toBe(9); expect(x.ap).toBe(a0 - 2);
    expect(x.quiverReady!.arrows).toEqual({ standard: 2 }); expect(x.ammoType).toBe('incendiary');
    expect(f.cb.log.some((l) => /switches quiver: 9 arrows/.test(l))).toBe(true);
    // a quiver is never refilled in a fight: switching back finds the same 2 arrows
    rig({ hit: false, die: 5 }); f.act({ type: 'combat/reload', unitId: u.id } as any); expect(f.unit(u.id).quiver).toEqual({ standard: 2 });
  });
  it('an empty worn quiver with a ready one: the card says so, a shot is refused in words naming the other; an empty ready one can\'t be switched to', () => {
    const f = bowFight({}, { ready: { id: 'quiver', arrows: { standard: 7 } } }); const u = f.unit(f.pc.id);
    expect(u.ammo).toBe(0);
    expect(f.tech('shot', { targetId: f.foe.id })).toBe('The quiver is empty: Switch quiver (7 in the other).');
    const card = weaponActions(u, f.cb).find((a) => a.id === 'reload')!; expect(card.text).toMatch(/Your quiver is empty: the other holds 7/); expect(card.why).toBeNull();
    const g = bowFight({ standard: 3 }, { ready: { id: 'quiver', arrows: {} } }); const gu = g.unit(g.pc.id);
    expect(weaponActions(gu, g.cb).find((a) => a.id === 'reload')!.why).toBe('The other quiver is empty.');
    expect(() => g.act({ type: 'combat/reload', unitId: gu.id } as any)).toThrow('The other quiver is empty.');
  });
  it('both quivers go back to the character after the fight, the switch kept', () => {
    const f = bowFight({ standard: 2 }, { ready: { id: 'quiver', rarity: 'fine', arrows: { hollow_point: 4 } } }); rig({ hit: true, die: 15 });
    const cid = f.pc.charId!; f.act({ type: 'combat/reload', unitId: f.pc.id } as any);
    f.unit(f.foe.id).hp = 1; expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    const c = f.g.characters[cid], qs = quiversOf(c);
    expect(qs[0]).toMatchObject({ rarity: 'fine', arrows: { hollow_point: 3 } }); expect(qs[1].arrows).toEqual({ standard: 2 }); expect(c.loaded).toBe(3);
  });
  it('a quiver\'s grade adds no accuracy and no damage (Leon: accuracy is the bow\'s)', () => {
    const f = bowFight({ standard: 5 }); const g = bowFight({ standard: 5 }, { worn: { rarity: 'celestial' } });
    const a = f.pv('shot', { targetId: f.foe.id }).attacks[0].pv, b = g.pv('shot', { targetId: g.foe.id }).attacks[0].pv;
    expect(b.toHit).toBe(a.toHit); expect(b.dmg!.total).toBe(a.dmg!.total);
  });
  it('an enchanted quiver: every arrow from it carries the tone\'s rider and its damage price; arrows from the other quiver do not', () => {
    const f = bowFight({ standard: 5 }, { worn: { mods: ['ench_fire'] }, ready: plain(5) }); rig({ hit: true, die: 15 });
    const pv = f.pv('shot', { targetId: f.foe.id }); const d = pv.attacks[0].pv.dmg!;
    expect(d.mults.some((m: any) => m.label === 'ember enchantment' && m.v === 0.9)).toBe(true);
    expect(pv.notes.join(' ')).toMatch(/ember enchantment/);
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    expect(condOn(f.unit(f.foe.id), 'burning')).toBeTruthy();
    expect(f.cb.fx!.some((e: any) => e.k === 'shot' && e.element === 'fire')).toBe(true);
    // the plain quiver: no rider, full damage
    const g = bowFight({ standard: 5 }, { ready: { id: 'quiver', mods: ['ench_fire'], arrows: { standard: 5 } } }); rig({ hit: true, die: 15 });
    expect(g.pv('shot', { targetId: g.foe.id }).attacks[0].pv.dmg!.mults.some((m: any) => /enchantment/.test(m.label))).toBe(false);
    expect(g.tech('shot', { targetId: g.foe.id })).toBeNull(); expect(condOn(g.unit(g.foe.id), 'burning')).toBeFalsy();
  });
  it('each enchantment does what its tone already does on a hit (its riders at its stage)', () => {
    for (const id of ENCH) {
      const f = bowFight({ standard: 5 }, { worn: { mods: [id] } }); rig({ hit: true, die: 15 });
      const e = enchantmentOf([id])!, at = f.unit(f.foe.id).pos;
      if (id === 'ench_storm') { expect(f.pv('shot', { targetId: f.foe.id }).attacks[0].pv.cover).toBe(0); continue; } // ignores half cover, read before the roll
      expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
      const t = f.unit(f.foe.id), line = f.cb.log.find((l) => l.includes(e.name + ':'));
      expect(line, id).toBeTruthy();
      if (id === 'ench_fire') expect(condOn(t, 'burning')).toBeTruthy();
      if (id === 'ench_gale') expect(t.pos).not.toBe(at);
    }
  });
  it('an enemy archer\'s bow follows the same rule: its shots draw from its one Standard quiver, no reload offered', () => {
    const f = bowFight(undefined, { foe: { weapon: 'longbow' } }); const e = f.unit(f.foe.id);
    expect(e.quiver).toEqual({ standard: quiverHolds() }); expect(weaponActions(e, f.cb).some((a) => a.id === 'reload')).toBe(false);
  });
  it('setQuivers keeps the held bow\'s loaded count on the worn quiver', () => {
    const f = bowFight(); const c = f.char(f.unit(f.pc.id)); setQuivers(c, [plain(3), plain(9)]); expect(c.loaded).toBe(3);
  });
});
