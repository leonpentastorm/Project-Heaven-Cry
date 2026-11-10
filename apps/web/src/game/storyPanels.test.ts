// The story screen's right column as four movable modules (game/storyPanels.ts): the order is always sound, a drop
// and the arrow keys move a panel, the order is kept in this browser, and the player card keeps room for five seats.
import { beforeEach, describe, expect, it } from 'vitest';
import { STORY_PANELS, STORY_PANELS_KEY, normaliseOrder, isDefaultOrder, moveStoryPanel, keyMoveStoryPanel, readStoryPanels, saveStoryPanels, squadRows, squadMinHeight, SQUAD_SEATS } from './storyPanels';

const store: Record<string, string> = {};
(globalThis as any).localStorage = { getItem: (k: string) => (k in store ? store[k] : null), setItem: (k: string, v: string) => { store[k] = String(v); }, removeItem: (k: string) => { delete store[k]; } };
beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

describe('the right column\'s modules', () => {
  it('the first order: mana forecast, map, quest board, player card', () => {
    expect(STORY_PANELS).toEqual(['mana', 'map', 'quests', 'squad']);
    expect(normaliseOrder(null)).toEqual(STORY_PANELS); expect(isDefaultOrder(normaliseOrder(undefined))).toBe(true);
  });
  it('any stored value is made sound: each panel once, unknown ids dropped, a missing one back in its place', () => {
    expect(normaliseOrder(['squad', 'squad', 'nope', 'map'])).toEqual(['mana', 'squad', 'quests', 'map']); // the missing ones at their first index
    expect(normaliseOrder('junk')).toEqual(STORY_PANELS);
    expect(normaliseOrder(['quests', 'squad', 'map', 'mana'])).toEqual(['quests', 'squad', 'map', 'mana']);
  });
  it('a drop moves a panel to the gap (counted before the move)', () => {
    expect(moveStoryPanel(STORY_PANELS, 'squad', 0)).toEqual(['squad', 'mana', 'map', 'quests']);
    expect(moveStoryPanel(STORY_PANELS, 'mana', 4)).toEqual(['map', 'quests', 'squad', 'mana']);
    expect(moveStoryPanel(STORY_PANELS, 'map', 3)).toEqual(['mana', 'quests', 'map', 'squad']);
    expect(moveStoryPanel(STORY_PANELS, 'map', 1)).toEqual(STORY_PANELS); expect(moveStoryPanel(STORY_PANELS, 'map', 2)).toEqual(STORY_PANELS); // dropped where it is
  });
  it('the arrow keys move one place, Home first, End last; nothing at an end', () => {
    expect(keyMoveStoryPanel('ArrowUp', 'map', STORY_PANELS)).toEqual(['map', 'mana', 'quests', 'squad']);
    expect(keyMoveStoryPanel('ArrowDown', 'map', STORY_PANELS)).toEqual(['mana', 'quests', 'map', 'squad']);
    expect(keyMoveStoryPanel('Home', 'squad', STORY_PANELS)).toEqual(['squad', 'mana', 'map', 'quests']);
    expect(keyMoveStoryPanel('End', 'mana', STORY_PANELS)).toEqual(['map', 'quests', 'squad', 'mana']);
    expect(keyMoveStoryPanel('ArrowUp', 'mana', STORY_PANELS)).toBeNull(); expect(keyMoveStoryPanel('ArrowDown', 'squad', STORY_PANELS)).toBeNull(); expect(keyMoveStoryPanel('Enter', 'map', STORY_PANELS)).toBeNull();
  });
  it('kept in this browser; the first order keeps nothing', () => {
    saveStoryPanels(['squad', 'mana', 'map', 'quests']);
    expect(JSON.parse(store[STORY_PANELS_KEY])).toEqual(['squad', 'mana', 'map', 'quests']); expect(readStoryPanels()).toEqual(['squad', 'mana', 'map', 'quests']);
    saveStoryPanels([...STORY_PANELS]); expect(store[STORY_PANELS_KEY]).toBeUndefined(); expect(readStoryPanels()).toEqual(STORY_PANELS);
    store[STORY_PANELS_KEY] = '{broken'; expect(readStoryPanels()).toEqual(STORY_PANELS);
  });
  it('the player card keeps room for five seats (four players and the Narrator): three rows of two', () => {
    expect(SQUAD_SEATS).toBe(5); expect(squadRows()).toBe(3); expect(squadMinHeight()).toBe(3 * 40 + 2 * 6);
    expect(squadRows(4)).toBe(2); expect(squadMinHeight(4)).toBe(2 * 40 + 6);
  });
});
