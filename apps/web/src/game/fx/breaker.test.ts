// @vitest-environment jsdom
// The Momentum chain 2.0 on the fight map (fx/breaker.ts): the engine's own events (momentum, melee, technique, shove,
// object, cond) map to the counter's moments, the impact ring (its size from data and the striker's `now`), the
// finishers' lines, Launch (the heave first, then the flight) and the smash, through play.ts's real handlers.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf, phys } from '@engine';
import { setLayer, slow } from './dom';
import { playFx, setContext, clearFx } from './play';
import { breakerFxOf, breakerBeat, breakerShow, impactRadius, impactCracks, momentumWord, noteBreaker, launchTiles, BRK_MS } from './breaker';
import { momentumLook } from '../techView';
import { TIPS, doorLine } from '../tips';
import { SKILL } from '@engine';

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
const PC = { id: 'pc-c1', charId: 'c1', side: 'pc', name: 'Breaker', pos: '1,1', hp: 100, maxHp: 100, res: { momentum: 3 }, resMax: { momentum: 5 } };
const FOE = { id: 'foe-0', side: 'foe', name: 'Foe', pos: '2,1', hp: 60, maxHp: 60 };
const game = (units: any[]) => ({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { name: 'F', round: 1, units, order: units.map((u) => u.id), turn: 0, log: [], fx: [], map: { w: 8, h: 6 } } } as any);
const traces = () => ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'breaker');
const SHOW = (phys as any).PHYS_RULES.momentum.show;

describe('the Momentum chain on the fight map', () => {
  let g: { root: HTMLElement; layer: HTMLElement };
  beforeEach(() => { vi.useFakeTimers(); g = grid(); (window as any).__phcFxTrace = []; });
  afterEach(() => { clearFx(); vi.useRealTimers(); g.root.remove(); g.layer.remove(); delete (window as any).__phcFxTrace; });

  it('the sizes are the data\'s, and the ring reads the striker\'s now', () => {
    expect(breakerShow()).toMatchObject({ counter_min: SHOW.counter_min, ring_base: SHOW.ring_base, ring_per: SHOW.ring_per, crack_at: SHOW.crack_at });
    expect(impactRadius(3)).toBe(SHOW.ring_base + SHOW.ring_per * 3);
    expect(impactRadius(5)).toBeGreaterThan(impactRadius(1));
    expect(impactCracks(SHOW.crack_at)).toBe(true); expect(impactCracks(SHOW.crack_at - 1)).toBe(false);
  });
  it('the counter\'s words: a gain "x3", full "x5 MAX", a loss "x2"; no change, no word', () => {
    expect(momentumWord({ k: 'momentum', now: 3, was: 2 }, 5)).toBe('x3');
    expect(momentumWord({ k: 'momentum', now: 5, was: 3 }, 5)).toBe('x5 MAX');
    expect(momentumWord({ k: 'momentum', now: 2, was: 3 }, 5)).toBe('x2');
    expect(momentumWord({ k: 'momentum', now: 2, was: 2 }, 5)).toBe('');
  });
  it('the token chip: the engine\'s now and max, shown from counter_min, double-ringed at full', () => {
    expect(momentumLook({ momentum: { now: 3, max: 5, hint: 'h' } } as any)).toMatchObject({ has: true, text: 'x3', full: false });
    expect(momentumLook({ momentum: { now: 5, max: 5, hint: 'h' } } as any).style).toMatch(/double/);
    expect(momentumLook({ momentum: { now: SHOW.counter_min - 1, max: 5 } } as any).has).toBe(false);
    expect(momentumLook({ momentum: null } as any).has).toBe(false);
  });
  it('a hit learns its striker\'s Momentum from the next momentum event, and plays the impact ring after the swing', () => {
    setContext(game([PC, FOE]), 'combat');
    const hit: any = { k: 'melee', unit: PC.id, target: FOE.id, from: PC.pos, to: FOE.pos, weapon: 'sabre', cat: 'blade', mode: 'melee', hit: true, dmg: 20, n: 1 };
    noteBreaker([hit, { k: 'momentum', unit: PC.id, now: 4, was: 3, n: 2 } as any]);
    expect(hit._mom).toBe(4); expect(breakerFxOf(hit)).toBe('impact');
    playFx(hit); vi.advanceTimersByTime(slow(200));
    expect(traces().map((t) => t.what)).toContain('impact');
    expect(traces().find((t) => t.what === 'impact').now).toBe(4);
    const miss: any = { ...hit, hit: false, n: 3 }; noteBreaker([miss]); expect(breakerFxOf(miss)).toBeNull();
    vi.advanceTimersByTime(3000);
  });
  it('Momentum gained and lost: the counter\'s moment, the word, on the unit', () => {
    setContext(game([PC, FOE]), 'combat');
    playFx({ k: 'momentum', unit: PC.id, now: 4, was: 3, n: 4 } as any);
    playFx({ k: 'momentum', unit: PC.id, now: 2, was: 4, n: 5 } as any);
    expect(traces().map((t) => t.what)).toEqual(['gain', 'loss']);
    vi.advanceTimersByTime(3000);
  });
  it('Launch: a push of 2 tiles or more by a unit heaves first (its own beat), then flies; a 1-tile push is the old shove', () => {
    setContext(game([PC, FOE]), 'combat');
    const e: any = { k: 'shove', unit: PC.id, target: FOE.id, from: '2,1', to: '5,1', ok: true, path: ['2,1', '3,1', '4,1', '5,1'], n: 6, source: breakerShow().launch_source };
    expect(launchTiles(e)).toBe(3); expect(breakerFxOf(e)).toBe('launch'); expect(breakerBeat(e)).toBeGreaterThan(BRK_MS.heave);
    playFx(e);
    expect(traces().map((t) => t.what)).toEqual(['launch']);
    expect(breakerFxOf({ k: 'shove', unit: PC.id, target: FOE.id, from: '2,1', to: '3,1', ok: true })).toBeNull();
    expect(breakerFxOf({ ...e, magic: true })).toBeNull();
    vi.advanceTimersByTime(3000); expect(g.layer.childElementCount).toBe(0);
  });
  it('a shove of 3 tiles that is not the Launch (a knockback, or one that names no cause) is the neutral shove: no LAUNCHED', () => {
    setContext(game([PC, FOE]), 'combat');
    const far: any = { k: 'shove', unit: PC.id, target: FOE.id, from: '2,1', to: '5,1', ok: true, path: ['2,1', '3,1', '4,1', '5,1'], n: 7 };
    expect(breakerShow().launch_source).not.toBe('');
    expect(breakerFxOf({ ...far, source: 'knockback' })).toBeNull();
    expect(breakerFxOf(far)).toBeNull();
    expect(breakerBeat({ ...far, source: 'knockback' })).toBeUndefined();
    playFx({ ...far, source: 'knockback' });
    expect(traces().map((t) => t.what)).not.toContain('launch');
    vi.advanceTimersByTime(3000);
  });
  it('the finishers and the smash have their own lines; an Exposed foe its bracket', () => {
    for (const id of ['charge', 'cleave', 'break', 'coup']) expect(breakerFxOf({ k: 'technique', id, unit: PC.id })).toBe(id);
    expect(breakerFxOf({ k: 'technique', id: 'cut', unit: PC.id })).toBeNull();
    expect(breakerFxOf({ k: 'object', at: '3,3', dmg: 12 } as any)).toBe('smash');
    expect(breakerFxOf({ k: 'cond', id: 'exposed', at: '2,1' } as any)).toBe('exposed');
    expect(breakerFxOf({ k: 'cond', id: 'exposed', at: '2,1', resisted: true } as any)).toBeNull();
  });
  it("the first-fight hint is the general door tip's (skills.json raw_power.door_line): no lane row of its own", () => {
    expect(TIPS.find((t) => t.id === 'momentum')).toBeUndefined();
    expect(doorLine('raw_power')).toBe((SKILL as any).raw_power.door_line); expect(doorLine('raw_power')).toBeTruthy();
  });
});
