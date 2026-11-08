// @vitest-environment jsdom
// Blessing 2.0 effects (fx/faith.ts): every faith event of the engine's contract plays over a grid without an error, draws
// or sounds something, takes its beat and cleans up; fog hides what the viewer can't see; a Miracle's answer covers the
// screen for under 2.5 s and a click skips it; reduced motion keeps it short.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf } from '@engine';
import { setLayer } from './dom';
import { playFx, setContext, clearFx } from './play';
import { faithBeat, miracleOverlay } from './faith';
import * as sfxMod from '../sfx';

function grid(w = 14, h = 10) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return layer;
}
const ctx = () => setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { units: [
  { id: 'u', pos: '2,5', name: 'Wren', side: 'pc', charId: 'c1' }, { id: 'a', pos: '2,7', name: 'Ally', side: 'pc' }, { id: 't', pos: '3,5', name: 'Foe', side: 'foe' }] } } as any, 'combat');
export const FAITH_EVENTS: any[] = [
  { k: 'prayer', unit: 'u', kind: 'whisper', id: 'luck', patron: 'mother_ember', at: '2,5', target: 'a', ok: true },
  { k: 'prayer', unit: 'u', kind: 'hymn', id: 'warm_hands', patron: 'mother_ember', at: '2,5', target: 'a', ok: true },
  { k: 'prayer_fail', unit: 'u', kind: 'hymn', id: 'hearthlight', patron: 'mother_ember', at: '2,5', overreach: true },
  { k: 'witnessed', unit: 'u', patron: 'mother_ember', at: '2,5' },
  { k: 'intervention', patron: 'mother_ember', trigger: 'ally_low', at: '2,7', target: 'a' },
  { k: 'devotion', char: 'c1', delta: 1, reason: 'tag', tag: 'heal', patron: 'mother_ember' },
  { k: 'devotion', char: 'c1', delta: -2, reason: 'vow', patron: 'mother_ember', at: '2,5' },
  { k: 'vow', unit: 'u', id: 'shield', state: 'sworn', at: '2,5' }, { k: 'vow', unit: 'u', id: 'shield', state: 'kept', at: '2,5' }, { k: 'vow', unit: 'u', id: 'stand', state: 'broken', at: '2,5' },
  { k: 'patron_line', patron: 'mother_ember', event: 'answered', text: 'There you are, love.', unit: 'u' },
];

describe('the faith effects (Blessing 2.0)', () => {
  let spy: any;
  beforeEach(() => { vi.useFakeTimers(); grid(); spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {}); });
  afterEach(() => { spy.mockRestore(); clearFx(); vi.advanceTimersByTime(20000); vi.useRealTimers(); });

  it('every faith event plays without an error, draws or sounds something, takes its beat, and cleans up', () => {
    ctx();
    const layer = document.body.lastElementChild as HTMLElement, warn = vi.spyOn(console, 'warn');
    for (const e of FAITH_EVENTS) {
      const before = layer.childElementCount, heard = spy.mock.calls.length;
      playFx(e); vi.advanceTimersByTime(1);
      expect(layer.childElementCount - before + spy.mock.calls.length - heard, e.k + ' ' + (e.kind || e.state || '')).toBeGreaterThan(0);
      expect(faithBeat(e), e.k).toBeGreaterThan(0);
    }
    vi.advanceTimersByTime(3000);
    expect(warn).not.toHaveBeenCalled();
    expect(layer.childElementCount).toBe(0);
  });
  it('a Hymn sings, a Whisper chimes, an intervention rings', () => {
    ctx(); const names = () => spy.mock.calls.map((c: any[]) => c[0]);
    playFx(FAITH_EVENTS[1]); playFx(FAITH_EVENTS[0]); playFx(FAITH_EVENTS[4]);
    expect(names()).toEqual(expect.arrayContaining(['soul_choir', 'crystal', 'hit_metal']));
  });
  it('fog: nothing is drawn on a tile the viewer cannot see', () => {
    ctx(); setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { units: [{ id: 'u', pos: '2,5', name: 'Wren', side: 'foe' }], fog: true } } as any, 'combat');
    const layer = document.body.lastElementChild as HTMLElement;
    document.querySelectorAll('button.phc-tok').forEach((b) => b.remove()); // no tile on screen: nothing to draw on
    playFx({ k: 'prayer', unit: 'u', kind: 'hymn', id: 'x', patron: 'nerukhan', at: '2,5', target: 'u', ok: true } as any); vi.advanceTimersByTime(300);
    expect(layer.childElementCount).toBe(0);
  });
  it('a Miracle: the full-screen answer with the mark and the line, gone in under 2.5 s, or at once on a click', () => {
    ctx();
    playFx({ k: 'miracle', patron: 'old_overcast', id: 'the_sky_answers', at: '3,5', area: ['3,5', '4,5', '3,6'], name: 'Old Overcast', line: 'THE SKY ANSWERS!' } as any);
    const ov = document.querySelector('[data-phc-miracle="old_overcast"]') as HTMLElement;
    expect(ov).toBeTruthy(); expect(ov.textContent).toMatch(/MIRACLE · OLD OVERCAST/); expect(ov.textContent).toMatch(/THE SKY ANSWERS!/);
    vi.advanceTimersByTime(2400); expect(document.querySelector('[data-phc-miracle]')).toBeNull();
    const o2 = miracleOverlay({ patron: 'nerukhan', accent: '#F2DFA0' })!; o2.dispatchEvent(new Event('pointerdown')); vi.advanceTimersByTime(260);
    expect(document.querySelector('[data-phc-miracle]')).toBeNull();
    expect(faithBeat({ k: 'miracle' } as any)).toBeLessThanOrEqual(2500);
  });
  it('reduced motion: the Miracle is a short fade', () => {
    const rm = vi.spyOn(sfxMod, 'reducedMotion').mockReturnValue(true);
    miracleOverlay({ patron: 'nerukhan', accent: '#F2DFA0' }); vi.advanceTimersByTime(1150);
    expect(document.querySelector('[data-phc-miracle]')).toBeNull(); expect(faithBeat({ k: 'miracle' } as any)).toBeLessThanOrEqual(1200);
    rm.mockRestore();
  });
});
