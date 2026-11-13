// Item icons on screen (Physical 2.0, implementer C part 1): which lists carry a weapon's, armour piece's or shield's
// icon (gearIcons.ts), and that an item with none draws nothing. The pile hover and the pick-up checklist
// (worldView.ts), the backpack in a fight (backpack.ts).
import { describe, expect, it } from 'vitest';
import { magsOf, WEAPON, ITEM, type Character, type GameState, type Unit } from '@engine';
import { storyWith } from '../../../../packages/engine/test/helpers/perkfight';
import { pileLook, pileRows, pileEntryId } from './worldView';
import { backpackView } from './backpack';
import { gearIconUri, GEAR_INK_OFF } from './gearIcons';

const pile = (items: any[]): any => ({ id: 'pile-1-1', kind: 'pile', pos: '1,1', approaches: [], items: items.map((e, i) => ({ key: 'e' + i, qty: 1, ...e })) });

describe('icons in pile lists', () => {
  it("a pile entry's item id, whether loot-shaped or pack-shaped", () => {
    expect(pileEntryId({ item: 'combat_knife' })).toBe('combat_knife');
    expect(pileEntryId({ pack: { id: 'service_pistol', weapon: 'service_pistol' } })).toBe('service_pistol');
    expect(pileEntryId({ pack: { id: 'field_helmet', item: 'field_helmet' } })).toBe('field_helmet');
    expect(pileEntryId({ pack: { id: 'mag:service_pistol', weapon: 'service_pistol', mags: [12] } })).toBe(''); // a magazine is not the gun
    expect(pileEntryId(null)).toBe('');
  });
  it('the hover: a heading, then one row an entry, with an icon only for weapons, armour and shields', () => {
    const L = pileLook(pile([{ item: 'combat_knife', name: 'Combat knife' }, { item: 'mag:service_pistol', name: 'Service pistol magazine 7/12' }, { pack: { id: 'buckler', item: 'buckler', name: 'Buckler', qty: 1, kind: 'tool' }, name: 'Buckler' }]));
    expect(L.tipRows.map((r) => [r.text, r.hasIcon])).toEqual([['PILE AT ' + L.tip.split('\n')[0].slice(8), false], ['Combat knife', true], ['Service pistol magazine 7/12', true], ['Buckler', true]]);
    expect(L.tipRows[2].icon).toBe(gearIconUri('mag-pistol_32')); // a magazine: the painted magazine of its gun
    expect(L.tipRows[1].icon).toBe(gearIconUri('combat_knife'));
    expect(L.tip.split('\n')).toEqual(L.tipRows.map((r) => r.text)); // the text the hover reads is unchanged
  });
  it('the hover with more than 8 entries: icons on the 8 shown, none on "+N more"', () => {
    const L = pileLook(pile(Array.from({ length: 10 }, (_, i) => ({ item: 'combat_knife', name: 'Knife ' + i }))));
    expect(L.tipRows.length).toBe(1 + 8 + 1); expect(L.tipRows.slice(1, 9).every((r) => r.hasIcon)).toBe(true);
    expect(L.tipRows.at(-1)).toMatchObject({ text: '+2 more', hasIcon: false });
  });
  it('the pick-up checklist: each row has its icon in white and, for out of reach, muted', () => {
    const rows = pileRows(pile([{ item: 'combat_knife', name: 'Combat knife' }, { item: 'rounds:rifle', name: '30 × Rifle' }]));
    expect(rows[0]).toMatchObject({ hasIcon: true, icon: gearIconUri('combat_knife'), iconOff: gearIconUri('combat_knife', GEAR_INK_OFF) });
    expect(rows[1]).toMatchObject({ hasIcon: true, icon: gearIconUri('rounds-rifle') }); // loose rounds: the painted rounds of their calibre
  });
});

describe('icons in the backpack', () => {
  it('hands, armour, pack weapons and pieces carry their item; ammo rows their derived gear id', () => {
    const s = storyWith([{ name: 'Rook', kit: 'soldier' }]);
    const c0: Character = s.g.characters[s.chars[0].id];
    c0.weapon = 'service_pistol'; c0.weaponState = {}; c0.offHand = null; c0.worn = { head_accessory: 'night_goggles' };
    c0.pack = [magsOf('service_pistol', 2), { id: 'drifter_revolver', name: WEAPON.drifter_revolver.name, qty: 1, kind: 'weapon', weapon: 'drifter_revolver' } as any,
      { id: 'field_helmet', item: 'field_helmet', name: ITEM.field_helmet.name, qty: 1, kind: 'tool' } as any];
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Gear', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists', at: '' }] } } } as any);
    const g: GameState = s.g, u: Unit = g.combat!.units.find((x) => x.charId === s.chars[0].id)!;
    const b = backpackView(g, g.combat, u, true)!, rowsOf = (k: string) => b.sections.find((x) => x.key === k)!.rows;
    expect(rowsOf('hands')[0].item).toBe('service_pistol');
    expect(rowsOf('hands')[1].item).toBeUndefined(); // an empty off hand
    expect(rowsOf('armour').find((r) => /goggles/i.test(r.name))!.item).toBe('night_goggles');
    expect(rowsOf('pack').map((r) => r.item)).toEqual(expect.arrayContaining(['drifter_revolver', 'field_helmet']));
    // ammo rows carry the derived gear id of their painted icon: the gun's magazine, the calibre's rounds
    expect(rowsOf('ammo').find((r) => r.key === 'mags')?.item).toBe('mag-pistol_32');
  });
});
