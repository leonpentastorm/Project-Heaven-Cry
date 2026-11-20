// Rules 1.78 item 6613: the Open Hand's stance picture is placed on the token card's standing to-hit line (rules 1.77
// item 6511's reader, standingModsFor): each term names its item (src) and the screen finds the item's move picture
// for that term by catalog data_ids (`relic:open_hand#open_guard`).
import { describe, expect, it, vi } from 'vitest';
vi.mock('../game/store', () => ({ getState: () => ({}), subscribe: () => () => {}, act: () => {}, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { guardPicOf } = await import('./combat.js');
const { tokenVals } = await import('./shared.js');

describe('the stance picture on the token card (item 6613)', () => {
  it('Open guard from the Open Hand finds its delivered picture; a term with no picture or no item finds none', () => {
    expect(guardPicOf({ v: -2, label: 'Open guard', src: 'relic:open_hand' })).toMatch(/\/assets\/move-open-guard\.webp/);
    expect(guardPicOf({ v: -1, label: 'Something else', src: 'relic:open_hand' })).toBe('');
    expect(guardPicOf({ v: -1, label: 'Open guard' })).toBe('');
  });
  it('the card lists each term with its picture beside its words', () => {
    const pic = guardPicOf({ v: -2, label: 'Open guard', src: 'relic:open_hand' });
    const u: any = { id: 'u1', name: 'Monk', side: 'pc', hp: 100, maxHp: 100, ap: 6, pos: '2,2', conds: {} };
    const t: any = tokenVals(u, { ally: true, guards: [{ v: -2, label: 'Open guard', src: 'relic:open_hand', pic }] });
    expect(t.hasGuards).toBe(true);
    expect(t.guardList).toEqual([{ text: 'Open guard −2 to hit them', pic, hasPic: true }]);
  });
});
