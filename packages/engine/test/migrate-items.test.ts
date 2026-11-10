import { describe, expect, it } from 'vitest';
import { apply, migrateLoaded } from '../src';
import { storyWith } from './helpers/perkfight';

/** 0.19.0 crashed on start for a save that held Grapple or Origami Hands (renamed in rules 1.13): every screen that
 * lists perks looked the id up and found nothing. */
describe('a save with a renamed or removed perk', () => {
  const old = () => { const s = storyWith([{}]); const g = JSON.parse(JSON.stringify(s.g)); const c: any = Object.values(g.characters)[0];
    c.perks = [{ id: 'grapple', tier: 'II' }, { id: 'origami_hands', tier: 'I' }, { id: 'no_such_perk', tier: 'I' }, { id: 'bulwark', tier: 'I' }]; c.traits = ['no_such_trait']; return g; };
  it('is settled as it is loaded, before any screen draws it', () => {
    const g = migrateLoaded(old()), c: any = Object.values(g.characters)[0];
    expect(c.perks).toEqual([{ id: 'iron_grip', tier: 'II' }, { id: 'both_hands', tier: 'I' }, { id: 'bulwark', tier: 'I' }]);
    expect(c.traits).toEqual([]);
  });
  it('and by the first action, with a line in the story', () => {
    const g = apply(old(), { type: 'player/join', id: 'p9', name: 'Nine' } as any, 'host'), c: any = Object.values(g.characters)[0];
    expect(c.perks.map((x: any) => x.id)).toEqual(['iron_grip', 'both_hands', 'bulwark']);
    expect(g.story.entries.some((e: any) => /Iron Grip replaces an older perk/.test(e.text || ''))).toBe(true);
  });
  it('null and empty saves pass through', () => { expect(migrateLoaded(null)).toBeNull(); });
});
