// The combat screen's adjustable layout (game/combatLayout.ts): pure parts.
import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, normalise, movePanel, clampWidth, placement, isDefault, keyMovePanel, expandLayout, MAP_MIN, SIDE_MIN, SPLIT_W } from './combatLayout';
import combatT from '../templates/combat.template.html?raw';

const key = (k: string, shift = false) => ({ key: k, shiftKey: shift } as KeyboardEvent);

describe('the combat layout', () => {
  it('normalises anything stored: every panel once, the map and the action menu in their zones', () => {
    expect(normalise(null)).toEqual(DEFAULT_LAYOUT);
    expect(normalise({ mapZone: ['log', 'log', 'actions', 'map'], sideZone: ['legend', 'map'], width: '640.4', swap: 1 }))
      .toEqual({ width: 640, swap: true, mapZone: ['log', 'mana', 'map'], sideZone: ['actions', 'legend'] });
    // A layout saved before the mana forecast existed gets it just above the map; one that has it keeps it where it is.
    expect(normalise({ mapZone: ['map', 'legend', 'log'], sideZone: ['actions'] }).mapZone).toEqual(['mana', 'map', 'legend', 'log']);
    expect(normalise({ mapZone: ['map', 'legend', 'log'], sideZone: ['actions', 'mana'] })).toMatchObject({ mapZone: ['map', 'legend', 'log'], sideZone: ['actions', 'mana'] });
    expect(normalise({ width: -5 }).width).toBeNull();
  });
  it('reorders within a zone and moves the legend and log between zones', () => {
    expect(DEFAULT_LAYOUT.mapZone).toEqual(['mana', 'map', 'legend', 'log']);
    let l = movePanel(DEFAULT_LAYOUT, 'log', 'mapZone', 0);
    expect(l.mapZone).toEqual(['log', 'mana', 'map', 'legend']);
    l = movePanel(l, 'log', 'mapZone', 4);
    expect(l.mapZone).toEqual(['mana', 'map', 'legend', 'log']);
    l = movePanel(l, 'legend', 'sideZone', 1);
    expect(l).toMatchObject({ mapZone: ['mana', 'map', 'log'], sideZone: ['actions', 'legend'] });
    expect(movePanel(l, 'mana', 'sideZone', 1)).toMatchObject({ mapZone: ['map', 'log'], sideZone: ['actions', 'mana', 'legend'] });
    l = movePanel(l, 'log', 'sideZone', 2);
    expect(l.sideZone).toEqual(['actions', 'legend', 'log']);
    // the action menu always heads its zone
    expect(movePanel(l, 'log', 'sideZone', 0).sideZone).toEqual(['actions', 'log', 'legend']);
  });
  it('the map or the action menu dropped in the other zone swaps the sides', () => {
    expect(movePanel(DEFAULT_LAYOUT, 'actions', 'mapZone', 0).swap).toBe(true);
    expect(movePanel(movePanel(DEFAULT_LAYOUT, 'map', 'sideZone', 0), 'map', 'sideZone', 0).swap).toBe(false);
    expect(movePanel(DEFAULT_LAYOUT, 'map', 'mapZone', 3)).toEqual(normalise({ ...DEFAULT_LAYOUT, mapZone: ['mana', 'legend', 'map', 'log'] }));
  });
  it('the splitter keeps both zones at their minimum', () => {
    expect(clampWidth(100, 1400)).toBe(MAP_MIN);
    expect(clampWidth(5000, 1400)).toBe(1400 - SIDE_MIN - SPLIT_W);
    expect(clampWidth(700.6, 1400)).toBe(701);
  });
  it('places panels, and puts everything in the map zone while the action menu is hidden', () => {
    const l = normalise({ mapZone: ['legend', 'map'], sideZone: ['actions', 'log'], swap: true });
    expect(placement(l, false)).toMatchObject({ swap: true, legendIn: 'mapZone', logIn: 'sideZone', manaIn: 'mapZone', order: { legend: 0, mana: 1, map: 2, log: 1 } });
    expect(placement(l, true)).toMatchObject({ swap: false, legendIn: 'mapZone', logIn: 'mapZone', manaIn: 'mapZone', order: { legend: 0, mana: 1, map: 2, log: 3 } });
    expect(placement(normalise({ mapZone: ['map'], sideZone: ['actions', 'mana'] }), false)).toMatchObject({ manaIn: 'sideZone', order: { mana: 1 } });
  });
  it('keyboard: up and down reorder, left and right change zone (or swap sides)', () => {
    expect(keyMovePanel(key('ArrowUp'), 'log', DEFAULT_LAYOUT)!.mapZone).toEqual(['mana', 'map', 'log', 'legend']);
    expect(keyMovePanel(key('ArrowDown'), 'map', DEFAULT_LAYOUT)!.mapZone).toEqual(['mana', 'legend', 'map', 'log']);
    expect(keyMovePanel(key('ArrowDown'), 'mana', DEFAULT_LAYOUT)!.mapZone).toEqual(['map', 'mana', 'legend', 'log']);
    expect(keyMovePanel(key('ArrowRight'), 'mana', DEFAULT_LAYOUT)!.sideZone).toEqual(['actions', 'mana']);
    expect(keyMovePanel(key('ArrowRight'), 'legend', DEFAULT_LAYOUT)!.sideZone).toEqual(['actions', 'legend']);
    expect(keyMovePanel(key('ArrowLeft'), 'actions', DEFAULT_LAYOUT)!.swap).toBe(true);
    expect(keyMovePanel(key('ArrowUp'), 'mana', DEFAULT_LAYOUT)).toBeNull();
    expect(keyMovePanel(key('a'), 'map', DEFAULT_LAYOUT)).toBeNull();
  });
  it('knows the default', () => {
    expect(isDefault(DEFAULT_LAYOUT)).toBe(true);
    expect(isDefault({ ...DEFAULT_LAYOUT, width: 600 })).toBe(false);
  });
  it('the template has one copy of the legend and the log, copied into the action zone\'s slots', () => {
    const t = expandLayout(combatT);
    expect(t).not.toMatch(/<!--\/?(PANEL|SLOT):/);
    expect(t.match(/data-phc-panel="legend"/g)!.length).toBe(2);
    expect(t.match(/data-phc-panel="log"/g)!.length).toBe(2);
    expect(t.match(/data-phc-panel="mana"/g)!.length).toBe(2);
    expect(t).not.toMatch(/\{\{manaText\}\}/); // the header chip is gone: the forecast panel replaces it
    expect(t.match(/>COMBAT LOG</g)!.length).toBe(2);
    expect(t).toMatch(/role="separator" class="phc-cb-split"/);
  });
});
