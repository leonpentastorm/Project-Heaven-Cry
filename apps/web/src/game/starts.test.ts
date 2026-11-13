// Classes 3.0 step 10b (Leon, 13 Nov 2026: "hide it for now"): M813 is off every menu and never a new room's start,
// behind the one switch, its data's `listed` (data/campaigns/m813.json). Not deleted: it is still a built-in campaign.
import { describe, it, expect } from 'vitest';
import { BUILT_IN_CAMPAIGNS } from '@engine';
import { STARTS, DEFAULT_START, OPEN_START, startsFor, startOf, shownStart, isListed } from './starts';
import m813 from '../../../../data/campaigns/m813.json';

describe('step 10b: M813 hidden behind its data switch', () => {
  it('the switch is the campaign data\'s `listed: false`; the campaign is still built in', () => {
    expect((m813 as any).listed).toBe(false);
    expect(BUILT_IN_CAMPAIGNS.some((c) => c.id === 'm813')).toBe(true);
  });
  it('no start on the menu is M813, and a new room never starts on it', () => {
    expect(STARTS.some((s) => s.id === 'm813')).toBe(false);
    expect(DEFAULT_START).not.toBe('m813');
    expect(shownStart(null, 'm813')).toBe(false);
    expect(shownStart(null, DEFAULT_START)).toBe(true);
  });
  it('with nothing listed, the room offers the Narrator\'s own start', () => {
    const listed = BUILT_IN_CAMPAIGNS.filter(isListed);
    if (!listed.length) { expect(DEFAULT_START).toBe(OPEN_START); expect(STARTS.map((s) => s.id)).toEqual([OPEN_START]); }
  });
  it('a room saved on M813 keeps it, and says so', () => {
    const g: any = { settings: { start: 'm813' }, campaign: null };
    expect(startsFor(g).some((s) => s.id === 'm813')).toBe(true);
    expect(startOf(g).id).toBe('m813');
  });
});
