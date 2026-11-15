// @vitest-environment jsdom
// Pressure 2.0 on the fight map (fx/pressure.ts, rules 1.56): the engine's own events (pressure, watch_set, watch_fire,
// technique flush, cond fear / slipping, move, shove) through play.ts's real handlers: a pin draws a tracer and dust and
// floats "+1 PRESSURE"; a state reached floats its word and line from data; a held shot draws its lane; Flush cracks
// the cover; Afraid turns away; a Slipping move or slide is named. Words and pips only under Reduce motion.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf, PHYS_RULES } from '@engine';
import { setLayer } from './dom';
import { playFx, setContext, clearFx } from './play';
import { pressureFxOf, pressWords, laneOf, poseOf, moveWord, pressureBeat, resetPressure, PRESS_MS } from './pressure';
import { pressureLook } from '../techView';

function grid(w = 10, h = 6) {
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
const PC = { id: 'pc-c1', charId: 'c1', side: 'pc', name: 'Skirmisher', pos: '1,1', hp: 100, maxHp: 100 };
const ALLY = { id: 'pc-c2', charId: 'c2', side: 'pc', name: 'Ally', pos: '1,3', hp: 100, maxHp: 100 };
const FOE = { id: 'foe-0', side: 'foe', name: 'Foe', pos: '6,1', hp: 60, maxHp: 60 };
const game = (units: any[]) => ({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { name: 'F', round: 1, units, order: units.map((u) => u.id), turn: 0, log: [], fx: [], map: { w: 10, h: 6 } } } as any);
const traces = () => ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'pressure').map((t) => t.what);
const words = () => Array.from(document.querySelectorAll('body *')).map((n) => (n.childElementCount === 0 ? n.textContent || '' : '')).filter(Boolean);
const S = (PHYS_RULES as any).pressure.states;

describe('Pressure 2.0 on the fight map', () => {
  let g: { root: HTMLElement; layer: HTMLElement };
  beforeEach(() => { vi.useFakeTimers(); g = grid(); (window as any).__phcFxTrace = []; resetPressure(); setContext(game([PC, ALLY, FOE]), 'combat'); });
  afterEach(() => { clearFx(); vi.useRealTimers(); g.root.remove(); g.layer.remove(); delete (window as any).__phcFxTrace; document.body.innerHTML = ''; });

  it('the words: a pin says "+n PRESSURE", a state reached says its data word and line, a fall says "−n"', () => {
    expect(pressWords({ k: 'pressure', now: 1, was: 0, state: '' })).toEqual({ gain: '+1 PRESSURE', state: '', says: '' });
    expect(pressWords({ k: 'pressure', now: 3, was: 1, state: 'suppressed' })).toEqual({ gain: '+2 PRESSURE', state: S.suppressed.word.toUpperCase(), says: S.suppressed.says });
    expect(pressWords({ k: 'pressure', now: 3, was: 2, state: 'suppressed' }, 'suppressed').state).toBe(''); // named once a state
    expect(pressWords({ k: 'pressure', now: 1, was: 2, state: '' }).gain).toBe('−1');
    expect(pressureFxOf({ k: 'pressure', now: 2, was: 2 })).toBeNull(); // shown pips: the pulse only
  });
  it('a pin from a shooter draws the tracer and the dust, and floats its words, inside its beat', () => {
    const e = { k: 'pressure', unit: FOE.id, at: FOE.pos, now: 2, was: 1, state: 'pressed', by: PC.id, why: 'a hit', n: 1 };
    expect(pressureBeat(e)).toBeGreaterThan(0);
    playFx(e as any); vi.advanceTimersByTime(400);
    expect(traces()).toContain('pin');
    expect(g.layer.querySelector('[data-press-line]')).toBeTruthy();
    expect(g.layer.querySelector('[data-press-dust]')).toBeTruthy();
    const w = words(); expect(w).toContain('+1 PRESSURE'); expect(w).toContain(S.pressed.word.toUpperCase()); expect(w).toContain(S.pressed.says);
  });
  it('a fall floats "−1" and draws no tracer', () => {
    playFx({ k: 'pressure', unit: FOE.id, at: FOE.pos, now: 1, was: 2, state: '', by: null, why: 'the end of a turn', n: 1 } as any); vi.advanceTimersByTime(300);
    expect(traces()).toEqual(['fall']); expect(g.layer.querySelector('[data-press-line]')).toBeNull(); expect(words()).toContain('−1');
  });
  it('the held shots draw their lanes from watch_set\'s own fields: Deny to its tiles, Cover Me an arc, Dead to Rights a line, Overwatch a field', () => {
    const base = { k: 'watch_set', unit: PC.id, at: PC.pos, n: 1 };
    const cases: [any, string, string][] = [
      [{ ...base, id: 'deny', tiles: ['4,1', '4,2'] }, 'tiles', '[data-press-box]'],
      [{ ...base, id: 'cover_me', allyId: ALLY.id, tiles: [] }, 'ally', '[data-press-arc]'],
      [{ ...base, id: 'dead_to_rights', targetId: FOE.id, tiles: [] }, 'target', '[data-press-line]'],
      [{ ...base, id: 'overwatch', tiles: [] }, 'field', '[data-press-field]'],
    ];
    for (const [e, lane, sel] of cases) {
      g.layer.innerHTML = ''; expect(laneOf(e)).toBe(lane);
      playFx(e); vi.advanceTimersByTime(200);
      expect(g.layer.querySelector(sel), lane).toBeTruthy();
    }
  });
  it('Flush cracks the cover by its target and floats FLUSHED; Afraid turns the target away', () => {
    playFx({ k: 'technique', unit: PC.id, id: 'flush', group: 'press', system: 'ranged', target: FOE.id, at: PC.pos, n: 1 } as any); vi.advanceTimersByTime(PRESS_MS.tracer + 200);
    expect(traces()).toContain('flush'); expect(g.layer.querySelector('[data-press-crack]')).toBeTruthy(); expect(words()).toContain('FLUSHED');
    playFx({ k: 'cond', target: FOE.id, at: FOE.pos, id: 'fear', n: 2 } as any); vi.advanceTimersByTime(300);
    expect(traces()).toContain('afraid');
  });
  it('a Slipping walk is named MOVE and a slide to cover SLIDE (the acting token\'s own move); a plain walk is not', () => {
    expect(moveWord({ k: 'move' })).toBe('MOVE'); expect(moveWord({ k: 'shove' })).toBe('SLIDE');
    playFx({ k: 'move', unit: PC.id, from: '1,1', to: '2,1', path: ['1,1', '2,1'], n: 1 } as any); vi.advanceTimersByTime(400);
    expect(traces()).not.toContain('slide');
    playFx({ k: 'cond', target: PC.id, at: PC.pos, id: 'slipping', n: 2 } as any);
    playFx({ k: 'shove', target: PC.id, from: '1,1', to: '2,2', ok: true, magic: true, n: 3 } as any); vi.advanceTimersByTime(400);
    expect(traces()).toContain('slide'); expect(words()).toContain('SLIDE');
  });
  it('the token\'s pose and tag come from the engine\'s state (physView), never a sum the client makes', () => {
    for (const s of ['pressed', 'suppressed', 'broken']) {
      const look = pressureLook({ pressure: { now: 2, max: 4, state: s, word: S[s].word, says: S[s].says, cost: S[s].text, by: [], hint: '' } } as any);
      expect(look.pose).toBe(poseOf(s)); expect(look.pose).toMatch(/scale/); expect(look.tag).toBe(S[s].word.toUpperCase());
    }
    expect(pressureLook({ pressure: { now: 1, max: 4, state: '', word: 'Under fire', says: '', cost: '', by: [], hint: '' } } as any).pose).toBe('');
  });
});
