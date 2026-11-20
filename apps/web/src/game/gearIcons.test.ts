// Weapon and armour icons (game/gearIcons.ts): every weapon in data/weapons.json and every armour piece and shield in
// data/items.json has one, and each follows the monoline rule (art/icons/weapons/README.md).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import weapons from '../../../../data/weapons.json';
import items from '../../../../data/items.json';
import { gearIcon, hasGearIcon, GEAR_ICON_IDS } from './gearIcons';

const weaponIds = (weapons as { items: { id: string }[] }).items.map((w) => w.id);
const armourIds = (items as { items: { id: string; category?: string }[] }).items.filter((i) => i.category === 'armour' || i.category === 'shield' || i.category === 'focus').map((i) => i.id);

// Items 2.0 (20 Nov 2026: new rows ship on a placeholder): an id the typing sheet adds is exempt only while it has no icon
// (the item card draws its marked placeholder); the day its icon lands this binds it again.
const SHEET = JSON.parse(readFileSync(new URL('../../../../docs/design/proposals/2026-11-20-items-2.0-rows.json', import.meta.url), 'utf8'));
const ON_PLACEHOLDER = new Set<string>([...SHEET.weapons, ...SHEET.items].map((r: any) => r.id));
const owed = (id: string) => ON_PLACEHOLDER.has(id) && !hasGearIcon(id);

describe('gear icons', () => {
  it('every weapon, armour piece, shield and magic focus has an icon', () => {
    expect(armourIds).toEqual(expect.arrayContaining(['evoker', 'emanator']));
    expect(weaponIds.length).toBeGreaterThan(0);
    expect(armourIds.length).toBeGreaterThan(0);
    for (const id of [...weaponIds, ...armourIds]) if (!owed(id)) expect(hasGearIcon(id), id).toBe(true);
  });
  it('each is a 64-box monoline svg in currentColor', () => {
    for (const id of [...weaponIds, ...armourIds]) {
      if (owed(id)) continue;
      const svg = gearIcon(id)!;
      const root = svg.match(/^<svg\b[^>]*>/)?.[0] ?? '';
      expect(root, id).toMatch(/viewBox="0 0 64 64"/);
      expect(root, id).toMatch(/fill="none"/);
      expect(root, id).toMatch(/stroke="currentColor"/);
      expect(root, id).toMatch(/stroke-width="2"/);
      expect(svg.trimEnd().endsWith('</svg>'), id).toBe(true);
      expect(svg, id).not.toMatch(/(fill|stroke)="#|<text|<image|filter=/);
    }
  });
  it('unknown ids give null', () => {
    expect(gearIcon('no_such_item')).toBeNull();
    expect(gearIcon(null)).toBeNull();
    expect(hasGearIcon('toString')).toBe(false);
    expect(GEAR_ICON_IDS).toContain('hellraiser_service_rifle');
  });
});

describe('gear icons as images', () => {
  it('a data URI in the ink asked for, with no currentColor left; empty for an item with no icon', async () => {
    const { gearIconUri, GEAR_INK, GEAR_INK_OFF } = await import('./gearIcons');
    const on = decodeURIComponent(gearIconUri('hellraiser_service_rifle', GEAR_INK, { line: true }).slice('data:image/svg+xml,'.length));
    expect(on).toMatch(/^<svg\b/);
    expect(on).toContain('stroke="' + GEAR_INK + '"');
    expect(on).not.toMatch(/currentColor|<!--/);
    expect(gearIconUri('hellraiser_service_rifle', GEAR_INK_OFF, { line: true })).toContain(encodeURIComponent(GEAR_INK_OFF));
    expect(gearIconUri('no_such_item')).toBe('');
    expect(gearIconUri(undefined)).toBe('');
  });
});

// The painted (Heavenprint) gear icons (art/style-guide/gear-icons.md), built by `npm run assets` as gear-<item id>.
describe('painted gear icons', () => {
  it('assets.json carries one by item id for every item the delivery drew, small and large', async () => {
    const A = (await import('./assets.json')).default as Record<string, string>;
    for (const id of ['service_pistol', 'katana', 'emanator_katana', 'evoker', 'ammo_armor_piercing', 'mod_suppressor', 'ration_pack', 'rounds-32_decrkm', 'mag-belt', 'armour-torso_class3_heavy'])
      { expect(A['gear-' + id], id).toMatch(/^\/assets\/gear-.+\.webp$/); expect(A['gear-' + id + '-lg'], id).toMatch(/-lg\.webp$/); }
  });
  it('the resolver: the painted icon when there is one (never inked), the monoline fallback when not, the line icon for effects', async () => {
    const { gearIconUri, gearLineUri, hasPaintedGear, setGearArt, GEAR_INK_OFF } = await import('./gearIcons');
    setGearArt({ 'gear-service_pistol': '/assets/gear-service_pistol.webp', 'gear-service_pistol-lg': '/assets/gear-service_pistol-lg.webp' });
    try {
      expect(gearIconUri('service_pistol')).toBe('/assets/gear-service_pistol.webp');
      expect(gearIconUri('service_pistol', GEAR_INK_OFF)).toBe('/assets/gear-service_pistol.webp'); // full colour: the ink doesn't reach it
      expect(gearIconUri('service_pistol', undefined, { large: true })).toBe('/assets/gear-service_pistol-lg.webp');
      expect(hasPaintedGear('service_pistol')).toBe(true);
      expect(gearIconUri('drifter_revolver')).toMatch(/^data:image\/svg\+xml,/); // no painting here: the monoline icon
      expect(hasPaintedGear('drifter_revolver')).toBe(false);
      expect(gearLineUri('service_pistol')).toMatch(/^data:image\/svg\+xml,/); // effects keep the line art
    } finally { setGearArt(null); }
  });
  it('derived gear: rounds by calibre, magazines by gun, torso armour by Armour Class', async () => {
    const { roundsGearId, magGearId, torsoGearId, gearIconUri } = await import('./gearIcons');
    expect(roundsGearId('.32 decrkm')).toBe('rounds-32_decrkm');
    expect(roundsGearId('40 mm grenade')).toBe('rounds-40mm_grenade');
    expect(roundsGearId('.700')).toBe('rounds-700');
    expect(roundsGearId('no calibre')).toBe('');
    // a magazine and the body armour of a class answer to the engine's own ids (the catalog's data_ids)
    expect(magGearId('service_pistol')).toBe('mag:service_pistol');
    expect(gearIconUri(magGearId('service_pistol'))).toMatch(/gear-mag-pistol_32\.webp/);
    expect(gearIconUri(magGearId('hellraiser_rotary'))).toMatch(/gear-mag-belt\.webp/);
    expect(gearIconUri('mag:hellraiser_service_rifle:0')).toMatch(/gear-mag-rifle\.webp/); // an empty one: the same picture
    expect(magGearId('crossbow')).toBe('');
    expect(torsoGearId(2)).toBe('armour:2');
    expect(gearIconUri('armour:2')).toMatch(/gear-armour-torso_class2_medium\.webp/);
    expect(gearIconUri(roundsGearId('rifle'))).toMatch(/gear-rounds-rifle\.webp/);
  });
  it("rules 1.56: a special round shows its own item's picture, a plain one its calibre's; a rounds id resolves either", async () => {
    const { roundsGearId, roundsIdGear, gearIconUri } = await import('./gearIcons');
    const { SPECIAL_ROUND_ITEM } = await import('@engine');
    const [type, sp] = Object.entries(SPECIAL_ROUND_ITEM as Record<string, any>)[0];
    expect(roundsGearId('rifle', type)).toBe(sp.id);
    expect(roundsGearId('rifle', null)).toBe('rounds-rifle');
    expect(roundsIdGear('rounds:rifle:' + type)).toBe(sp.id);
    expect(roundsIdGear('rounds:rifle')).toBe('rounds-rifle');
    expect(gearIconUri('rounds:rifle:' + type)).toBe(gearIconUri(sp.id));
    expect(gearIconUri('rounds:rifle:' + type)).not.toBe(gearIconUri('rounds:rifle'));
  });
  it("rules 1.56 (L4): a variant with no picture of its own shows its base's (variant_of, by data)", async () => {
    const { gearIconUri, gearIcon, hasPaintedGear } = await import('./gearIcons');
    const { WEAPON, ITEM } = await import('@engine');
    const vs = [...Object.values(WEAPON as Record<string, any>), ...Object.values(ITEM as Record<string, any>)].filter((r) => r?.variant_of);
    expect(vs.length).toBeGreaterThan(0);
    for (const v of vs) {
      expect(gearIconUri(v.id, '#FFFFFF', { large: true }), v.id).toBe(gearIconUri(v.variant_of, '#FFFFFF', { large: true }));
      expect(gearIcon(v.id), v.id).toBe(gearIcon(v.variant_of));
      expect(hasPaintedGear(v.id), v.id).toBe(hasPaintedGear(v.variant_of));
    }
  });
});
