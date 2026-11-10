// Weapon and armour icons (game/gearIcons.ts): every weapon in data/weapons.json and every armour piece and shield in
// data/items.json has one, and each follows the monoline rule (art/icons/weapons/README.md).
import { describe, expect, it } from 'vitest';
import weapons from '../../../../data/weapons.json';
import items from '../../../../data/items.json';
import { gearIcon, hasGearIcon, GEAR_ICON_IDS } from './gearIcons';

const weaponIds = (weapons as { items: { id: string }[] }).items.map((w) => w.id);
const armourIds = (items as { items: { id: string; category?: string }[] }).items.filter((i) => i.category === 'armour' || i.category === 'shield').map((i) => i.id);

describe('gear icons', () => {
  it('every weapon, armour piece and shield has an icon', () => {
    expect(weaponIds.length).toBeGreaterThan(0);
    expect(armourIds.length).toBeGreaterThan(0);
    for (const id of [...weaponIds, ...armourIds]) expect(hasGearIcon(id), id).toBe(true);
  });
  it('each is a 64-box monoline svg in currentColor', () => {
    for (const id of [...weaponIds, ...armourIds]) {
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
