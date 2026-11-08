// @vitest-environment jsdom
// Grand forms on the ground (fx/grand.ts, fx/ambient.ts, game/sigilView.ts): every word has a look and a tint, the 5×5
// is read tile by tile (inside, edge ring, the staff), the grid layer and the legend show it, and nothing breaks with
// reduced motion.
import { describe, expect, it } from 'vitest';
import { SIGIL } from '@engine';
import { GRAND_LOOK, grandLook, grandNode, grandTint } from './grand';
import { ambientOf } from './ambient';
import { placedView, placedLegend } from '../sigilView';

const tiles = (c: string) => { const [x, y] = c.split(',').map(Number), out: string[] = []; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) out.push((x + i) + ',' + (y + j)); return out; };
const Z = (word: string, o: any = {}) => ({ id: 'g1', kind: 'grand', tiles: tiles('6,6'), words: [word], by: 'u1', side: 'pc', left: 3, mult: 1, who: 'Ilse', centre: '6,6', ...o });
const game = (zones: any[]) => ({ code: 'X', characters: {}, story: { zones: [] }, combat: { zones, units: [], glyphs: [], objects: [], map: { w: 16, h: 12 } } }) as any;

describe('Grand forms on the ground', () => {
  it('every Sigil word has a look and its own tint; element words borrow their field look', () => {
    for (const w of Object.keys(SIGIL)) expect(GRAND_LOOK[w], w).toBeTruthy();
    expect(new Set(Object.keys(SIGIL).map((w) => GRAND_LOOK[w].look + GRAND_LOOK[w].tint)).size).toBeGreaterThan(30);
    expect(grandLook('fire')).toMatchObject({ look: 'lava', element: 'fire' }); expect(grandLook('nonsense').look).toBe('pulse');
    expect(grandTint('fire', 0.5)).toBe('rgba(255, 154, 74, 0.5)');
  });
  it('the ambient layer reads every tile: inside, the edge ring and the staff', () => {
    const items = ambientOf(game([Z('ward')]), 'combat');
    expect(items.length).toBe(25); expect(items.filter((i) => i.where === 'staff').map((i) => i.tile)).toEqual(['6,6']);
    expect(items.filter((i) => i.where === 'edge').length).toBe(16); expect(items.filter((i) => i.where === 'inner').length).toBe(8);
    expect(items.every((i) => i.kind === 'grand' && i.word === 'ward')).toBe(true);
    // an enemy's Grand form is shown too: it is a battlefield, not a secret
    expect(ambientOf(game([Z('fire', { side: 'foe' })]), 'combat', new Set()).length).toBe(25);
  });
  it('each look builds a node; the edge and the staff add their own layers', () => {
    for (const w of ['fire', 'veil', 'mend', 'command', 'leech']) for (const where of ['inner', 'edge', 'staff'] as const) {
      const n = grandNode(w, where, 3); expect(n.dataset.grand).toBe(w); expect(n.dataset.where).toBe(where); expect(n.children.length).toBeGreaterThan(0);
    }
    expect(grandNode('mend', 'staff').children.length).toBeGreaterThan(grandNode('mend', 'inner').children.length);
  });
  it('the grid draws it: tint on every tile, the edge rim, the staff badge, the form in the tooltip, and a legend line', () => {
    const v = placedView({ zones: [Z('watch')], units: [], glyphs: [], objects: [], map: { w: 16, h: 12 } }, 'pc');
    expect(Object.keys(v.tiles).length).toBe(25); expect(v.kinds.has('grand')).toBe(true);
    expect(v.tiles['6,6'].marks.some((m) => m.text === '◎ WATCH 3')).toBe(true);
    expect(v.tiles['4,4'].layer).toMatch(/inset 0 0 0 2px/); expect(v.tiles['5,5'].layer).not.toMatch(/inset/);
    expect(v.tiles['5,5'].note).toMatch(/Sentinel/);
    expect(placedLegend(v.kinds, false).some((l) => /Grand form/.test(l.name))).toBe(true);
  });
});
