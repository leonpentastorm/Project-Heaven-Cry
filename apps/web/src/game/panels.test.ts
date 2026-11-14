// The guard of rules 1.54 item 11 ("Every mode keeps the side panels", CLAUDE.md; ui-screens.md "The three columns"):
// every mode in data/modes.json, and the Proving Ground, has a right panel (a non-empty `panels` list), and every id in
// it is one the panel registry (panels.ts) can draw. Read from the data file itself, not from a copy.
import { describe, expect, it } from 'vitest';
import modes from '../../../../data/modes.json';
import { MODES } from '@engine';
import { PANEL_DRAW, PANEL_NAME, panelsOf, isPanelId, offersAreaMap } from './panels';

const M = modes as any;
describe('the right panel by mode (rules 1.54 item 11)', () => {
  it('every mode has a non-empty panels list, every id in the registry and named', () => {
    expect(M.items.length).toBeGreaterThan(0);
    for (const m of M.items) {
      expect(Array.isArray(m.panels) && m.panels.length > 0, m.id + ' has a right panel').toBe(true);
      for (const id of m.panels) { expect(id in PANEL_DRAW, m.id + ': ' + id + ' is in the registry').toBe(true); expect(typeof PANEL_NAME[id], id + ' has a name').toBe('string'); }
    }
  });
  it('the Proving Ground has its list too, every id in the registry', () => {
    expect(M.proving_ground.panels.length).toBeGreaterThan(0);
    for (const id of M.proving_ground.panels) expect(isPanelId(id), id).toBe(true);
  });
  it('the engine reads the same lists (ModeDef.panels), and a run reads its mode\'s, the story the campaign\'s', () => {
    for (const m of MODES) expect(m.panels).toEqual(M.items.find((x: any) => x.id === m.id).panels);
    expect(panelsOf({ settings: { play: 'survival' }, run: { state: 'map' } } as any).list).toEqual(M.items.find((x: any) => x.id === 'survival').panels);
    expect(panelsOf({ settings: { play: 'campaign' }, run: null } as any).list).toEqual(M.items.find((x: any) => x.id === 'campaign').panels);
    expect(panelsOf({ settings: {}, sandbox: { state: 'gearing' } } as any).list).toEqual(M.proving_ground.panels);
  });
  it('the area map (header button, M key) is offered only where the list holds the map module: never in a run', () => {
    expect(offersAreaMap({ settings: { play: 'survival' }, run: { state: 'map' } } as any)).toBe(false);
    expect(offersAreaMap({ settings: { play: 'campaign' }, run: null } as any)).toBe(true);
    expect(offersAreaMap({ settings: {}, sandbox: { state: 'gearing' } } as any)).toBe(true);
  });
});
