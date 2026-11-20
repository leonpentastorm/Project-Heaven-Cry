// Rules 1.93 items 8113 to 8119 (0.34, the review's findings; the lead's rulings), through the real paths: the shop's
// roll and buy (the reducer), the reward offer, a Narrator turn (the reducer's narrator/turn), the item card, the price.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { type GameState, type Sheet, apply, newGame, ARCHETYPES, WEAPON, ITEM, ARMOUR_CLASSES, armourClassNumOf, priceOf, itemCard, gearPreview, gradedArmour,
  rollStock, weaponOffer, packOf, gradeFor, familyStandardRow, FAMILY, rolledGear, BARE_KIT } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import type { Pc } from './helpers/replay';

const sheetFrom = (archId: string, name = 'Test'): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
const ungraded = (id: string) => (WEAPON[id] as any)?.graded === false && (WEAPON[id] as any)?.category !== 'thrown';

describe('rules 1.93 item 8113: one reader of a body armour id (any number of digits)', () => {
  it('a test-only class row 10 is priced, named, graded and previewed', () => {
    const n = ARMOUR_CLASSES.length, row: any = { ...ARMOUR_CLASSES[1], class: 10, name: 'Test plate', price_credits: 777 };
    (ARMOUR_CLASSES as any)[10] = row;
    try {
      expect(armourClassNumOf('armour:10')).toBe(10);
      expect(armourClassNumOf('armour:11')).toBeNull(); expect(armourClassNumOf('armour:1x')).toBeNull();
      expect(priceOf('armour:10')).toBe(777); // credits.ts: was single-digit only
      expect(gradedArmour('armour:10')).toBe(true);
      expect(itemCard({ id: 'armour:10' }).name).toBe('Test plate armour');
      const g0 = startRun(survivalRoom('PHC-0001', [{ build: 'plain_gun', level: 1 }] as Pc[], { test: true }), 'PHC-0001');
      const p = gearPreview(g0.characters.c1, { id: 'armour:10' });
      expect(p.lines.length).toBeGreaterThan(0);
    } finally { (ARMOUR_CLASSES as any).length = n; }
  });
});

describe('rules 1.93 item 8114: a row the grade rule refuses is handed out at Standard', () => {
  it('gradeFor: Standard for a graded: false row, the asked grade for any other, a unique its own', () => {
    expect(gradeFor('core_rifle', 'relic')).toBe('standard');
    expect(gradeFor('service_pistol', 'fine')).toBe('fine');
  });
  it('the shop roll gives every ungraded row at Standard, and the buy keeps it', () => {
    let seen: any = null;
    for (let i = 0; i < 400 && !seen; i++) for (const p of rollStock('S' + i, { id: 'n14-1', depth: 14 }, 3)) {
      if (ungraded(p.id)) { expect(p.rarity, p.id).toBe('standard'); expect(p.price).toBe(priceOf(p.id, 'standard')); seen = seen || p; }
    }
    expect(seen, 'a mana weapon in some stock').toBeTruthy();
    // the buy, through the reducer: that piece on today's shelf
    const g0 = startRun(survivalRoom('PHC-0001', [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }] as Pc[], { test: true }), 'PHC-0001');
    const shop = g0.run!.nodes.find((n) => n.kind === 'shop')!, prev = g0.run!.nodes.find((x) => x.links.includes(shop.id))!;
    let g: GameState = JSON.parse(JSON.stringify(g0)); g.run!.at = prev.id; g.run!.state = 'map';
    for (const c of Object.values(g.characters)) c.credits = 99999;
    for (let i = 0; i < 2 && g.run!.at !== shop.id; i++) g = apply(g, { type: 'run/move', node: shop.id }, ownerOf(i));
    g.run!.shop!.stock[0] = { ...seen, key: g.run!.shop!.stock[0].key };
    g = apply(g, { type: 'run/buy', charId: 'c1', key: g.run!.shop!.stock[0].key }, 'host');
    const it = packOf(g.characters.c1).find((x) => (x.weapon || x.item || x.id) === seen.id)!;
    expect(it).toBeTruthy(); expect(it.rarity || 'standard').toBe('standard');
  });
  it('the reward offer: an ungraded row offered at Standard with no Relic property, at the chest\'s Relic grade', () => {
    const g0 = startRun(survivalRoom('PHC-0001', [{ build: 'sigil', level: 1 }] as Pc[], { test: true }), 'PHC-0001'), c = g0.characters.c1;
    let seen = 0;
    for (let i = 0; i < 400; i++) {
      const o = weaponOffer(c, { id: 'n14-' + i, depth: 14 }, 'boss' as any, 3, 'S' + i, { grade: 'relic' });
      for (const w of o.weapons) {
        if (ungraded(w.id)) { seen++; expect(w.rarity, w.id).toBe('standard'); expect(w.prop).toBeUndefined(); }
        else if ((WEAPON[w.id] || (ITEM as any)[w.id]) && !(ITEM as any)[w.id]?.category?.startsWith?.('mod')) expect(['relic', 'masterwork', 'standard']).toContain(w.rarity);
      }
    }
    expect(seen, 'an ungraded row in some offer').toBeGreaterThan(0);
  });
  it('an instance already saved with a grade keeps it: the card shows the grade it holds', () => {
    const k = itemCard({ id: 'core_rifle', rarity: 'fine' });
    expect(k.grade).toBe('fine');
  });
});

describe('rules 1.93 item 8115: a weapon family id resolves to its Standard row', () => {
  const room = () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 's');
    g = apply(g, { type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }, 'host'); g = apply(g, { type: 'session/start' }, 'host');
    return g;
  };
  it('every weapon family has a Standard row that is a weapon of the family (a gun family: its standard form)', () => {
    for (const f of Object.values(FAMILY)) {
      const s = familyStandardRow(f.id); if (!s || !WEAPON[s]) continue;
      expect((WEAPON[s] as any).family, f.id).toBe(f.id);
      if (f.forms.some((x) => x.id === 'standard')) expect((WEAPON[s] as any).form, f.id).toBe('standard');
    }
  });
  it('an enemy armed by family id carries that family\'s Standard row; an unknown word keeps the service pistol and says so', () => {
    let g = room();
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', combat: { name: 'Line', difficulty: 'easy', enemies: [
      { name: 'Keel', tier: 'soldier', weapon: 'revolvers' }, { name: 'Odd', tier: 'minion', weapon: 'banana_gun' }] } } as any }, 'host');
    const foes = g.combat!.units.filter((x) => x.side === 'foe');
    expect(foes.find((x) => x.name.startsWith('Keel'))!.weapon).toBe(familyStandardRow('revolvers'));
    expect(foes.find((x) => x.name.startsWith('Odd'))!.weapon).toBe('service_pistol');
    expect(g.story.entries.some((e) => /No weapon "banana_gun" is known/.test(e.text || ''))).toBe(true);
  });
  it('loot by family id is that row, not a plot item', () => {
    let g = room(); const id = Object.keys(g.characters)[0];
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', loot: [{ charId: id, item: 'crossbows', qty: 1 }] } as any }, 'host');
    const pack = packOf(g.characters[id]);
    expect(pack.some((x) => x.weapon === familyStandardRow('crossbows'))).toBe(true);
    expect(pack.some((x) => x.kind === 'plot')).toBe(false);
  });
});

describe('rules 1.93 item 8116: the card lists the modifier rows the row carries', () => {
  it('Arsenal, Smetanita and the siege tube say their signature, numbers filled', () => {
    for (const [w, m] of [['arsenal_piston_rifle', 'mod_line_arsenal'], ['smetanita_service_pistol', 'mod_line_smetanita'], ['legion_siege_tube', 'mod_siege_reload']]) {
      const k = itemCard({ id: w }), l = k.carries.find((x) => x.id === m);
      expect(l, w).toBeTruthy(); expect(l!.text).not.toMatch(/\{=/); expect(l!.text).toBe((ITEM as any)[m].card?.text || (ITEM as any)[m].text);
    }
    expect(itemCard({ id: 'service_pistol' }).carries).toEqual([]);
  });
});

describe('rules 1.93 items 8117, 8118: the rolled-gear pool and the demolitionist\'s default charge', () => {
  it('the bare hands and any natural weapon are never rolled', () => {
    const pool = rolledGear();
    expect(pool).not.toContain(BARE_KIT.weapon);
    for (const id of pool) expect((WEAPON[id] as any)?.role, id).not.toBe('natural');
  });
});
