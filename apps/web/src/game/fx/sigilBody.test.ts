// @vitest-environment jsdom
// The Sigil caster's body on the fight map (fx/sigilBody.ts, nine doors audit 0.29), through play.ts's real handlers:
// Draw leans the caster in BEFORE the stroke draws; Evoke kicks it back, away from where the spell goes, as the pattern
// collapses; under Reduce motion neither moves and the stroke is not held back.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf } from '@engine';
import { setLayer, slow } from './dom';
import { playFx, setContext, clearFx } from './play';
import { SIGIL_BODY } from './sigilBody';
import { setUiPrefs } from '../sfx';

function grid(w = 8, h = 6) {
  const root = document.createElement('div'); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    root.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return { root, layer };
}
const PC = { id: 'pc-c1', charId: 'c1', side: 'pc', name: 'Sigilist', pos: '2,2', hp: 100, maxHp: 100 };
const game = () => ({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { name: 'F', round: 1, units: [PC], order: [PC.id], turn: 0, log: [], fx: [], glyphs: [], map: { w: 8, h: 6 } } } as any);
const traces = () => ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'sigil').map((t) => t.what);
const lunges: any[] = [];

describe('the Sigil caster leans in to draw and recoils on Evoke', () => {
  let g: { root: HTMLElement; layer: HTMLElement };
  beforeEach(() => {
    vi.useFakeTimers(); g = grid(); (window as any).__phcFxTrace = []; lunges.length = 0; setUiPrefs({ reduceMotion: false });
    // the token's animations (dom.ts anim → Element.animate): record the lunge's translate keyframes
    (HTMLElement.prototype as any).animate = function (k: any[]) { if (Array.isArray(k) && k.some((f) => f && f.translate && f.translate !== '0 0')) lunges.push(k); return { finished: Promise.resolve(), cancel() {}, onfinish: null, addEventListener() {} }; };
  });
  afterEach(() => { clearFx(); vi.useRealTimers(); g.root.remove(); g.layer.remove(); delete (window as any).__phcFxTrace; setUiPrefs({ reduceMotion: false }); });

  it('draw: the lean (the lunge helper, down over the tile) comes first; the stroke waits for its deepest point', () => {
    setContext(game(), 'combat');
    playFx({ n: 1, k: 'draw', unit: PC.id, at: PC.pos, tile: PC.pos, word: 'fire', side: 'pc', effect: 'starts' } as any);
    expect(traces()).toEqual(['lean']); expect(lunges.length).toBe(1);
    const down = lunges[0].find((f: any) => f.translate !== '0 0').translate.split(' ').map(parseFloat); expect(down[0]).toBe(0); expect(down[1]).toBeGreaterThan(0);
    vi.advanceTimersByTime(slow(Math.round(SIGIL_BODY.lean.ms * SIGIL_BODY.lean.peak)) + 5);
    expect(traces()).toEqual(['lean', 'stroke']);
  });
  it('evoke: the caster kicks back, away from the way it fires, as the pattern collapses', () => {
    setContext(game(), 'combat');
    playFx({ n: 2, k: 'evoke', unit: PC.id, at: PC.pos, shape: 'line', tiles: ['3,2', '4,2'], words: ['fire', 'seek'], side: 'pc', dir: [1, 0], src: '4,2', impact: '7,2' } as any);
    expect(traces()).not.toContain('recoil');
    vi.advanceTimersByTime(slow(SIGIL_BODY.recoil.at) + 5);
    expect(traces()).toContain('recoil');
    const back = lunges.map((k) => k.find((f: any) => f.translate !== '0 0').translate.split(' ').map(parseFloat)).find((d: number[]) => d[0] < 0);
    expect(back).toBeTruthy(); expect(back![1]).toBeCloseTo(0, 5); // fired east (+x): kicked west
  });
  it('under Reduce motion: no lean, no recoil, and the stroke draws at once', () => {
    setUiPrefs({ reduceMotion: true }); setContext(game(), 'combat');
    playFx({ n: 3, k: 'draw', unit: PC.id, at: PC.pos, tile: PC.pos, word: 'fire', side: 'pc', effect: 'starts' } as any);
    expect(traces()).toEqual(['stroke']); expect(lunges.length).toBe(0);
  });
});
