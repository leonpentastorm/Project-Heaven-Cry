// @vitest-environment jsdom
// Blessing 2.0 effects (fx/faith.ts): every faith event of the engine's contract plays over a grid without an error, draws
// or sounds something, takes its beat and cleans up; fog hides what the viewer can't see; a Miracle's cut-in (game/cutIn.ts)
// covers the screen until it lands and a click skips it; reduced motion keeps it short.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf } from '@engine';
import { setLayer, clampCentre } from './dom';
import { playFx, setContext, clearFx } from './play';
import { faithBeat, miracleOverlay, devotionWord, FACE_MS } from './faith';
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
  { k: 'devotion', char: 'c1', delta: 1, xp: 46, reason: 'tag', tag: 'heal', patron: 'mother_ember', now: 3, was: 3 },
  { k: 'devotion', char: 'c1', delta: -5, xp: 40, reason: 'vow', patron: 'mother_ember', at: '2,5', now: 2, was: 3, level: 2 },
  { k: 'devotion', char: 'c1', delta: 4, xp: 102, reason: 'a rite', patron: 'mother_ember', now: 5, was: 4, level: 5 },
  { k: 'leave', char: 'c1', patron: 'mother_ember', to: 'nerukhan', letGo: true, roll: { die: 14, mod: 3, total: 17, tn: 10 } },
  { k: 'leave', char: 'c1', patron: 'old_overcast', to: 'mother_ember', letGo: false },
  { k: 'grudge', char: 'c1', patron: 'old_overcast', sessions: 3, condition: 'dazed', at: '2,5', unit: 'u' },
  { k: 'grudge', char: 'c1', patron: 'nerukhan', sessions: 3, condition: 'marked' },
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
  it('Devotion floats its XP ("+1 DEVOTION XP · HEAL") and a level change says the level ("DEVOTION 5")', () => {
    ctx(); const layer = document.body.lastElementChild as HTMLElement;
    expect(devotionWord({ delta: 1, tag: 'heal' })).toBe('+1 DEVOTION XP · HEAL'); expect(devotionWord({ delta: -3 })).toBe('−3 DEVOTION XP');
    playFx(FAITH_EVENTS[7]); vi.advanceTimersByTime(900);
    expect(layer.textContent).toMatch(/\+4 DEVOTION XP/); expect(layer.textContent).toMatch(/DEVOTION 5/);
    expect(faithBeat(FAITH_EVENTS[7])).toBeGreaterThan(faithBeat(FAITH_EVENTS[5])!);
  });
  it('a pact says so and floats only the XP that moved: no "+45" and no level-up glow on a switch that keeps or loses XP (item 719)', () => {
    ctx(); const layer = document.body.lastElementChild as HTMLElement;
    playFx({ k: 'devotion', char: 'c1', delta: 0, xp: 45, reason: 'a pact', now: 3, was: 3, pact: 'counting_weaver', at: '2,5' } as any); vi.advanceTimersByTime(900);
    expect(layer.textContent).toMatch(/PACT · THE COUNTING WEAVER/); expect(layer.textContent).not.toMatch(/DEVOTION XP|DEVOTION 3/);
    clearFx(); vi.advanceTimersByTime(3000);
    playFx({ k: 'devotion', char: 'c1', delta: -225, xp: 45, reason: 'a pact', now: 3, was: 8, level: 3, pact: 'counting_weaver', at: '2,5' } as any); vi.advanceTimersByTime(900);
    expect(layer.textContent).toMatch(/−225 DEVOTION XP/); expect(layer.textContent).toMatch(/DEVOTION 3/); expect(layer.innerHTML).not.toMatch(/glow\.png/);
  });
  it('a long float near the edge shifts inward; the grudge float sits above the condition\'s', () => {
    expect(clampCentre(10, 120, 4, 1000)).toBe(64); expect(clampCentre(990, 120, 4, 1000)).toBe(940); expect(clampCentre(500, 120, 4, 1000)).toBe(500); expect(clampCentre(5, 300, 0, 200)).toBe(100);
    ctx(); const layer = document.body.lastElementChild as HTMLElement;
    playFx({ k: 'grudge', char: 'c1', patron: 'nerukhan', sessions: 3, condition: 'marked', at: '0,5', unit: 'u' } as any); vi.advanceTimersByTime(400);
    const box = [...layer.children].find((b) => /GRUDGE/.test(b.textContent || '')) as HTMLElement;
    expect(parseFloat(box.style.left)).toBeGreaterThanOrEqual(4);
    expect(parseFloat(box.style.top) + parseFloat(box.style.height) / 2).toBeLessThan(5 * 40 + 20 - 40 * 0.35); // centred higher than a plain float on that tile
  });
  it('leaving a patron and a grudge: the words, and a sound even with no tile to draw on', () => {
    ctx(); const layer = document.body.lastElementChild as HTMLElement, names = () => spy.mock.calls.map((c: any[]) => c[0]);
    playFx(FAITH_EVENTS[8]); playFx(FAITH_EVENTS[10]); vi.advanceTimersByTime(400);
    expect(layer.textContent).toMatch(/LET GO · MOTHER EMBER/); expect(layer.textContent).toMatch(/GRUDGE · OLD OVERCAST/);
    const n0 = spy.mock.calls.length; playFx(FAITH_EVENTS[11]); expect(spy.mock.calls.length).toBeGreaterThan(n0);
    expect(names()).toEqual(expect.arrayContaining(['crystal', 'hit_metal']));
  });
  it('a Hymn sings, a Whisper chimes, an intervention rings', () => {
    ctx(); const names = () => spy.mock.calls.map((c: any[]) => c[0]);
    playFx(FAITH_EVENTS[1]); playFx(FAITH_EVENTS[0]); playFx(FAITH_EVENTS[4]);
    expect(names()).toEqual(expect.arrayContaining(['soul_choir', 'crystal', 'hit_metal']));
  });
  // Faith 2.2 (spec 2.1, 2.2): the Whisper's icon and the Hymn's face over the head of the one who prays.
  const boxOf = (el: Element | null) => { let b = el as HTMLElement | null; while (b && !(b.style && b.style.position === 'absolute' && b.style.left)) b = b.parentElement; return b!; };
  const centreY = (b: HTMLElement) => parseFloat(b.style.top) + parseFloat(b.style.height) / 2;
  const centreX = (b: HTMLElement) => parseFloat(b.style.left) + parseFloat(b.style.width) / 2;
  it('a Whisper: its own prayer icon rises over the head of the one who prays (not the target), no portrait', () => {
    ctx(); const layer = document.body.lastElementChild as HTMLElement;
    playFx(FAITH_EVENTS[0]); vi.advanceTimersByTime(50);
    const icon = layer.querySelector('[data-phc-faith-whisper="luck"]') as HTMLImageElement;
    expect(icon).toBeTruthy(); expect(icon.getAttribute('data-phc-faith-miss')).toBeNull();
    expect(layer.querySelector('[data-phc-faith-face]')).toBeNull(); // a Whisper has no portrait
    const b = boxOf(icon); expect(centreX(b)).toBe(2 * 40 + 20); expect(centreY(b)).toBeLessThan(5 * 40); // over the praying unit at 2,5, above its tile
    vi.advanceTimersByTime(1400); expect(layer.querySelector('[data-phc-faith-whisper]')).toBeNull();
  });
  it('a Hymn: a square crop of the patron\'s portrait over the head, framed in the accent, about 1.5 s', () => {
    ctx(); const layer = document.body.lastElementChild as HTMLElement;
    playFx(FAITH_EVENTS[1]); vi.advanceTimersByTime(50);
    const face = layer.querySelector('[data-phc-faith-face="mother_ember"]') as HTMLElement;
    expect(face).toBeTruthy(); expect(face.getAttribute('data-phc-faith-miss')).toBeNull();
    const img = face.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toMatch(/patron-mother_ember/); // the painting, not the mark
    expect(img.style.width).toBe('277.78%'); // the face box: a side of 0.36 of the width
    expect(face.style.overflow).toBe('hidden'); expect(face.style.border).toMatch(/2px solid/);
    const b = boxOf(face); expect(parseFloat(b.style.width)).toBe(parseFloat(b.style.height)); // square
    expect(centreX(b)).toBe(2 * 40 + 20); expect(centreY(b) + parseFloat(b.style.height) / 2).toBeLessThanOrEqual(5 * 40); // over the head, not on the token
    expect(FACE_MS).toBe(1500);
    vi.advanceTimersByTime(1400); expect(layer.querySelector('[data-phc-faith-face]')).toBeTruthy();
    vi.advanceTimersByTime(300); expect(layer.querySelector('[data-phc-faith-face]')).toBeNull();
  });
  it('a missed Hymn: the face greys and fades; a missed Whisper\'s icon sinks back grey', () => {
    ctx(); const layer = document.body.lastElementChild as HTMLElement, frames: any[] = [];
    const orig = (Element.prototype as any).animate; (Element.prototype as any).animate = function (f: any) { frames.push(f); return { cancel() {}, finished: Promise.resolve() }; };
    try {
      playFx(FAITH_EVENTS[2]); vi.advanceTimersByTime(250);
      const face = layer.querySelector('[data-phc-faith-face="mother_ember"]') as HTMLElement;
      expect(face.getAttribute('data-phc-faith-miss')).toBe('1');
      expect(JSON.stringify(frames)).toMatch(/grayscale\(1\)/);
      expect(layer.textContent).toMatch(/REFUSED/); // the engine's payload says why: 'overreach'
      playFx({ k: 'prayer_fail', unit: 'u', kind: 'whisper', id: 'luck', patron: null, at: '2,5', why: 'dice' } as any); vi.advanceTimersByTime(250);
      expect(layer.querySelector('[data-phc-faith-whisper="luck"][data-phc-faith-miss="1"]')).toBeTruthy();
      playFx({ k: 'prayer_fail', unit: 'u', kind: 'hymn', id: 'x', patron: 'nerukhan', at: '2,5', why: 'dice' } as any); vi.advanceTimersByTime(250);
      expect([...layer.querySelectorAll('div')].some((d) => d.textContent === 'UNANSWERED')).toBe(true);
    } finally { (Element.prototype as any).animate = orig; }
  });
  it('the area map: a story prayer (no tile, the character named) goes over the character\'s token', () => {
    setContext({ code: 'X', characters: { c1: { id: 'c1', name: 'Wren' } }, story: { positions: { c1: '6,3' }, npcs: [] } } as any, 'main');
    const layer = document.body.lastElementChild as HTMLElement;
    playFx({ k: 'prayer', unit: 'c1', kind: 'hymn', id: 'h', patron: 'old_overcast', at: null, target: 'c1', ok: true } as any); vi.advanceTimersByTime(50);
    const face = layer.querySelector('[data-phc-faith-face="old_overcast"]') as HTMLElement; expect(face).toBeTruthy();
    expect(centreX(boxOf(face))).toBe(6 * 40 + 20);
    playFx({ k: 'prayer', unit: 'c1', kind: 'whisper', id: 'courage', patron: null, at: null, target: 'c1', ok: true } as any); vi.advanceTimersByTime(50);
    expect(centreX(boxOf(layer.querySelector('[data-phc-faith-whisper="courage"]')))).toBe(6 * 40 + 20);
  });
  it('Witnessed\'s eye waits for the Hymn\'s face over the same head', () => {
    ctx(); const layer = document.body.lastElementChild as HTMLElement;
    playFx(FAITH_EVENTS[1]); vi.advanceTimersByTime(900); playFx(FAITH_EVENTS[3]); vi.advanceTimersByTime(50);
    const eye = () => [...layer.querySelectorAll('img')].find((i) => /prayer-witnessed|%3Cpath/.test(i.getAttribute('src') || '') && !i.closest('[data-phc-faith-face]'));
    expect(eye()).toBeFalsy();
    vi.advanceTimersByTime(600); expect(eye()).toBeTruthy();
  });
  it('fog: nothing is drawn on a tile the viewer cannot see', () => {
    ctx(); setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { units: [{ id: 'u', pos: '2,5', name: 'Wren', side: 'foe' }], fog: true } } as any, 'combat');
    const layer = document.body.lastElementChild as HTMLElement;
    document.querySelectorAll('button.phc-tok').forEach((b) => b.remove()); // no tile on screen: nothing to draw on
    playFx({ k: 'prayer', unit: 'u', kind: 'hymn', id: 'x', patron: 'nerukhan', at: '2,5', target: 'u', ok: true } as any); vi.advanceTimersByTime(300);
    expect(layer.childElementCount).toBe(0);
  });
  it('a Miracle (Faith 2.2): the cut-in with the portrait and the line, gone when it lands, or at once on a click; the box follows', () => {
    ctx();
    playFx({ k: 'miracle', patron: 'old_overcast', id: 'the_sky_answers', at: '3,5', area: ['3,5', '4,5', '3,6'], unit: 'u', char: 'c1', name: 'The Sky Answers', text: 'Storm on the area.', line: 'THE SKY ANSWERS!', summary: 'Foe takes 40 Storm.' } as any);
    const ov = document.querySelector('[data-phc-miracle="old_overcast"]') as HTMLElement;
    expect(ov).toBeTruthy(); expect(ov.textContent).toMatch(/OLD OVERCAST · MIRACLE · THE SKY ANSWERS/); expect(ov.textContent).toMatch(/THE SKY ANSWERS!/);
    expect(faithBeat({ k: 'miracle' } as any)).toBe(3000); // the queue's next events (its effects) play as it lands
    vi.advanceTimersByTime(3050); expect(document.querySelector('[data-phc-miracle]')).toBeNull();
    vi.advanceTimersByTime(500); expect(document.querySelector('[data-phc-cut-box]')?.textContent).toMatch(/The Sky Answers.*Foe takes 40 Storm/);
    vi.advanceTimersByTime(3000); expect(document.querySelector('[data-phc-cut-box]')).toBeNull();
    const o2 = miracleOverlay({ patron: 'nerukhan', accent: '#F2DFA0' })!; o2.dispatchEvent(new Event('pointerdown')); vi.advanceTimersByTime(260);
    expect(document.querySelector('[data-phc-miracle]')).toBeNull();
  });
  it('reduced motion: the Miracle\'s cut-in is a fade, no zoom, and lands sooner', () => {
    const rm = vi.spyOn(sfxMod, 'reducedMotion').mockReturnValue(true);
    miracleOverlay({ patron: 'nerukhan', accent: '#F2DFA0' }); vi.advanceTimersByTime(2300);
    expect(document.querySelector('[data-phc-miracle]')).toBeNull(); expect(faithBeat({ k: 'miracle' } as any)).toBe(2250);
    rm.mockRestore();
  });
});
