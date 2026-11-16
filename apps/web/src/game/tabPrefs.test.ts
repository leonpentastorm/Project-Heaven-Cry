// The fight tabs' order and hiding (game/tabPrefs.ts): pure functions, then the browser's storage.
import { describe, expect, it } from 'vitest';
import { NO_PREFS, mergeOrder, withPresent, shownTabs, moveTab, setHidden, hideWhy, resetTabs, firstUsable, loadTabPrefs, saveTabPrefs, noteTabs, tabKey, _resetTabPrefsCache, type TabPrefs } from './tabPrefs';

const KNOWN = ['move', 'attack', 'utility', 'perks', 'class', 'shadow', 'tend', 'figments', 'sigils', 'outbursts', 'faith', 'calls'];
const P = (order: string[], hidden: string[] = [], custom = false): TabPrefs => ({ order, hidden, custom });

describe('the order: kept, with new tabs appended once arranged', () => {
  it('a first fight takes the action list\'s own order', () => {
    expect(mergeOrder([], ['move', 'attack', 'utility', 'sigils'], KNOWN)).toEqual(['move', 'attack', 'utility', 'sigils']);
  });
  it('a tab that appears later goes at the end: none of the others moves (Perks would sit before Sigils in the list)', () => {
    const was = ['move', 'attack', 'utility', 'sigils'];
    const now = mergeOrder(was, ['move', 'attack', 'utility', 'perks', 'sigils'], KNOWN);
    expect(now).toEqual(['move', 'attack', 'utility', 'sigils', 'perks']);
    expect(shownTabs(P(now), ['move', 'attack', 'utility', 'perks', 'sigils']).indexOf('sigils')).toBe(was.indexOf('sigils'));
  });
  it('not arranged (custom false): a tab that appears later takes its natural place, not the end', () => {
    const p = withPresent(P(['move', 'attack', 'utility', 'sigils', 'calls']), ['move', 'attack', 'utility', 'perks', 'sigils', 'calls'], KNOWN);
    expect(p.order).toEqual(['move', 'attack', 'utility', 'perks', 'sigils', 'calls']);
    expect(withPresent(P(['move', 'attack', 'sigils', 'calls'], [], true), ['move', 'attack', 'perks'], KNOWN).order).toEqual(['move', 'attack', 'sigils', 'calls', 'perks']);
  });
  it('a tab absent today keeps its place for when it comes back; unknown ids are dropped', () => {
    const p = withPresent(P(['move', 'retired_tab', 'attack', 'calls'], ['retired_tab', 'calls']), ['move', 'attack'], KNOWN);
    expect(p.order).toEqual(['move', 'attack', 'calls']);
    expect(p.hidden).toEqual(['calls']);
    expect(shownTabs(p, ['move', 'attack'], KNOWN)).toEqual(['move', 'attack']);
    expect(shownTabs(p, ['move', 'attack', 'calls'], KNOWN)).toEqual(['move', 'attack']); // still hidden when it returns
  });
});

describe('moving and hiding', () => {
  const base = P(['move', 'attack', 'utility', 'sigils']);
  it('up and down swap with the neighbour; the ends stay put', () => {
    expect(moveTab(base, 'sigils', -1).order).toEqual(['move', 'attack', 'sigils', 'utility']);
    expect(moveTab(base, 'move', 1)).toMatchObject({ order: ['attack', 'move', 'utility', 'sigils'], custom: true });
    expect(moveTab(base, 'move', -1)).toBe(base);
    expect(moveTab(base, 'sigils', 1)).toBe(base);
  });
  it('the first tab cannot be hidden, and a hidden tab moved to the top shows again', () => {
    expect(hideWhy(base, 'move')).toBe('The first tab always shows.');
    expect(setHidden(base, 'move', true)).toBe(base);
    const h = setHidden(base, 'sigils', true); expect(h).toMatchObject({ hidden: ['sigils'], custom: true });
    let q = h; for (let i = 0; i < 3; i++) q = moveTab(q, 'sigils', -1);
    expect(q.order[0]).toBe('sigils'); expect(q.hidden).toEqual([]);
  });
  it('at least one tab stays shown', () => {
    let p = P(['move', 'attack']);
    expect(hideWhy(p, 'attack')).toBeNull();
    p = setHidden(p, 'attack', true); expect(p.hidden).toEqual(['attack']);
    expect(shownTabs(p, ['move', 'attack'])).toEqual(['move']);
    // only hidden tabs present (the first is absent today): the first present one in the order shows
    expect(shownTabs(P(['sigils', 'attack', 'utility'], ['attack', 'utility']), ['attack', 'utility'])).toEqual(['attack']);
  });
  it('show again', () => {
    const p = setHidden(setHidden(P(['move', 'attack', 'utility']), 'utility', true), 'utility', false);
    expect(p.hidden).toEqual([]);
  });
  it('Reset to default: the natural order of the tabs this character has, nothing hidden, not custom', () => {
    const p = setHidden(moveTab(moveTab(P(['move', 'attack', 'utility', 'sigils', 'perks']), 'sigils', -1), 'sigils', -1), 'move', true);
    expect(resetTabs({ ...p, hidden: ['utility'] }, KNOWN)).toEqual({ order: ['move', 'attack', 'utility', 'perks', 'sigils'], hidden: [], custom: false });
  });
  it('a custom order opens on the first shown tab with something usable', () => {
    expect(firstUsable(['sigils', 'attack', 'move'], (id) => id !== 'sigils')).toBe('attack');
    expect(firstUsable(['sigils'], () => false)).toBeNull();
  });
});

describe('the browser\'s storage', () => {
  it('per character key; noteTabs appends a new tab and keeps the player\'s choices', () => {
    _resetTabPrefsCache();
    const k = tabKey('c3');
    expect(loadTabPrefs(k)).toEqual(NO_PREFS);
    noteTabs(k, ['move', 'attack', 'utility'], KNOWN);
    saveTabPrefs(k, setHidden(moveTab(loadTabPrefs(k), 'utility', -1), 'attack', true));
    const q = noteTabs(k, ['move', 'attack', 'utility', 'perks'], KNOWN);
    expect(q).toEqual({ order: ['move', 'utility', 'attack', 'perks'], hidden: ['attack'], custom: true });
    expect(tabKey('c3')).toBe(k); // the key is the character's id alone: the same in any room
    expect(loadTabPrefs(tabKey('c4'))).toEqual(NO_PREFS); // another character keeps its own
  });
});
