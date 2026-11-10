// @vitest-environment jsdom
// Combat clarity: walks in and out of the fog of war, the "!" when a hostile comes into sight, stealth reveals and
// hides, and the Overwatch beat (the mover stops on the tile it is shot on, then walks on).
import { describe, expect, it, vi, afterEach, beforeAll } from 'vitest';
import { refOf, ARCHETYPES, newCharacter, startCombat } from '@engine';
import { setCombatSpeed } from '../combatSpeed';
import { setLayer } from './dom';
import { playFx, setContext, clearFx, walkSpan, moveSeen, moveSteps, PARK_MS } from './play';
import { bangDue, tickDue, resetSight, sightLog, BANG_DEDUPE_MS, BANG_SOUND_GAP_MS } from './sight';
import * as sfxMod from '../sfx';

function grid(w = 10, h = 6) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return layer;
}
/** A fight on the open yard (everyone in sight): the PC 'pc-a' and hostiles by id where given. */
function fight(foes: Record<string, string>, pcAt = '0,1') {
  const a = ARCHETYPES[0];
  const c = newCharacter('a', 'p1', { name: 'Vel', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any);
  const ids = Object.keys(foes);
  const cb = startCombat('t', 'yard', [{ c, pos: pcAt }], ids.map((id, i) => ({ name: 'Raider ' + (i + 1), tier: 'minion', weapon: 'service_pistol', at: refOf(foes[id]) })), 'easy', { state: 4 }, []);
  cb.units.filter((u) => u.side === 'foe').forEach((u, i) => { u.id = ids[i]; u.pos = foes[ids[i]]; });
  setContext({ code: 'X', characters: { a: c }, story: { positions: {}, npcs: [] }, combat: cb } as any, 'combat');
  return cb;
}
const ctx = (foeAt: string, pcAt = '0,1') => fight({ f: foeAt }, pcAt);
beforeAll(() => setCombatSpeed('fast')); // the written timings
afterEach(() => { clearFx(); if (vi.isFakeTimers()) vi.advanceTimersByTime(20000); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('the part of a walk to draw', () => {
  it('from the fog edge to one step past the last seen tile', () => {
    expect(walkSpan([false, false, true, true])).toEqual({ from: 1, to: 3, entered: 2, left: 3 });
    expect(walkSpan([true, true, false, false])).toEqual({ from: 0, to: 2, entered: 0, left: 1 });
    expect(walkSpan([true, true, true])).toEqual({ from: 0, to: 2, entered: 0, left: 2 });
    expect(walkSpan([false, false])).toBeNull();
  });
  it('the engine\'s sight decides; without it (an old save), what the squad sees now', () => {
    const e: any = { path: ['0,0', '1,0', '2,0'], sight: { pc: '001', foe: '111' } };
    expect(moveSeen(e, e.path, false, () => true)).toEqual([false, false, true]);
    expect(moveSeen(e, e.path, true, () => false)).toEqual([true, true, true]); // its own side always
    expect(moveSeen({ path: e.path } as any, e.path, false, (k) => k !== '0,0')).toEqual([false, true, true]);
    expect(moveSteps(e, false)).toBe(1); expect(moveSteps(e, true)).toBe(2); expect(moveSteps({ ...e, sight: { pc: '000' } }, false)).toBe(0);
  });
});

describe('the "!"', () => {
  it('shows once per unit in a moment, and a wave of them makes one tick', () => {
    resetSight();
    expect(bangDue('a', 1000)).toBe(true); expect(bangDue('a', 1000 + BANG_DEDUPE_MS - 1)).toBe(false); expect(bangDue('b', 1001)).toBe(true);
    expect(bangDue('a', 1000 + BANG_DEDUPE_MS + 5)).toBe(true);
    expect(tickDue(5000)).toBe(true); expect(tickDue(5000 + BANG_SOUND_GAP_MS - 1)).toBe(false); expect(tickDue(5000 + BANG_SOUND_GAP_MS)).toBe(true);
  });
});

describe('walking out of the fog', () => {
  it('a hostile walks in from the fog edge: its copy starts see-through there, the "!" pops as it comes into sight, one tick', () => {
    vi.useFakeTimers(); const layer = grid(); ctx('5,1'); resetSight();
    const spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    playFx({ k: 'move', n: 1, unit: 'f', from: '9,1', to: '5,1', path: ['9,1', '8,1', '7,1', '6,1', '5,1'], how: 'move', sight: { pc: '00111', foe: '11111' } } as any);
    const walker = layer.querySelector('[data-phc-walker="f"]') as HTMLElement;
    expect(walker).toBeTruthy();
    // It starts at the fog edge (8,1: the last unseen tile), not deep in the fog (9,1): the copy sits on its last tile
    // (5,1) and is moved back by the walk's first frame; jsdom has no animations, so check what was drawn instead.
    expect(layer.querySelector('[data-phc-bang]')).toBeNull();
    vi.advanceTimersByTime(140); // the first step (115 ms at Fast, ×1 outside a fight): 7,1 is in sight
    expect(layer.querySelector('[data-phc-bang="hostile"]')).toBeTruthy();
    expect(sightLog().filter((x) => x.unit === 'f' && x.kind === 'enter').length).toBe(1);
    expect(sightLog().find((x) => x.unit === 'f')!.tile).toBe('7,1');
    // A second hostile right behind it: its own "!", but no second tick (one tick for a wave).
    fight({ f: '5,1', g: '5,3' });
    playFx({ k: 'move', n: 2, unit: 'g', from: '8,3', to: '5,3', path: ['8,3', '7,3', '6,3', '5,3'], how: 'move', sight: { pc: '0011', foe: '1111' } } as any);
    vi.advanceTimersByTime(400);
    expect(sightLog().some((x) => x.unit === 'g' && x.kind === 'enter' && x.bang)).toBe(true);
    expect(spy.mock.calls.filter((c) => c[0] === 'sighted').length).toBe(1);
    // Footsteps only where each is seen (f: 7,1 6,1 5,1; g: 6,3 5,3): none from the fog.
    vi.advanceTimersByTime(800);
    expect(spy.mock.calls.filter((c) => c[0] === 'step').length).toBe(5);
  });
  it('a walk never in sight draws nothing and makes no sound; one walking off into the fog is noted leaving', () => {
    vi.useFakeTimers(); const layer = grid(); ctx('9,1'); resetSight();
    const spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    playFx({ k: 'move', n: 1, unit: 'f', from: '7,1', to: '9,1', path: ['7,1', '8,1', '9,1'], how: 'move', sight: { pc: '000', foe: '111' } } as any);
    vi.advanceTimersByTime(1000);
    expect(layer.childElementCount).toBe(0); expect(spy).not.toHaveBeenCalled();
    playFx({ k: 'move', n: 2, unit: 'f', from: '5,1', to: '8,1', path: ['5,1', '6,1', '7,1', '8,1'], how: 'move', sight: { pc: '1100', foe: '1111' } } as any);
    expect(layer.querySelector('[data-phc-walker="f"]')).toBeTruthy();
    vi.advanceTimersByTime(1000);
    expect(sightLog().some((x) => x.unit === 'f' && x.kind === 'leave' && x.tile === '6,1')).toBe(true);
    expect(layer.querySelector('[data-phc-bang]')).toBeNull(); // leaving is quiet
  });
});

describe('stealth', () => {
  it('a reveal shimmers in with the "!" and REVEALED; going Hidden fades out with HIDDEN', () => {
    vi.useFakeTimers(); const layer = grid(); ctx('4,1'); resetSight();
    vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    playFx({ k: 'sight', n: 1, unit: 'f', at: '4,1', how: 'reveal', only: 'pc' } as any);
    vi.advanceTimersByTime(300);
    expect(layer.querySelector('[data-phc-bang="hostile"]')).toBeTruthy();
    expect(layer.textContent).toContain('REVEALED');
    expect(sightLog().at(-1)).toMatchObject({ unit: 'f', kind: 'reveal', tile: '4,1' });
    vi.advanceTimersByTime(3000);
    playFx({ k: 'sight', n: 2, unit: 'f', at: '4,1', how: 'hide', only: 'pc' } as any);
    expect(layer.textContent).toContain('HIDDEN');
    expect(sightLog().at(-1)).toMatchObject({ unit: 'f', kind: 'hide' });
  });
  it('an event for the other side\'s eyes plays nothing here', () => {
    vi.useFakeTimers(); const layer = grid(); ctx('4,1'); resetSight();
    playFx({ k: 'sight', n: 1, unit: 'pc-a', at: '0,1', how: 'enter', only: 'foe' } as any);
    vi.advanceTimersByTime(300);
    expect(layer.childElementCount).toBe(0); expect(sightLog().some((x) => x.unit === 'pc-a')).toBe(false);
  });
});

describe('Overwatch', () => {
  it('the mover stops on the tile it is shot on (its copy waits there), the watcher says OVERWATCH, then the walk goes on', () => {
    vi.useFakeTimers(); const layer = grid();
    // The PC walks 0,1 → 4,1; a hostile watcher at 8,1 springs its shot at 2,1. The PC now stands at 4,1.
    fight({ f: '8,1' }, '4,1');
    vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    playFx({ k: 'move', n: 1, unit: 'pc-a', from: '0,1', to: '2,1', path: ['0,1', '1,1', '2,1'], how: 'move', sight: { pc: '111', foe: '111' } } as any);
    vi.advanceTimersByTime(400); // the walk to 2,1 is over: the copy is parked there
    expect(layer.querySelector('[data-phc-walker="pc-a"]')).toBeTruthy();
    playFx({ k: 'overwatch', n: 2, unit: 'f', target: 'pc-a', from: '8,1', at: '2,1', mode: 'shot' } as any);
    expect(layer.querySelector('[data-phc-tag="OVERWATCH"]')).toBeTruthy();
    expect((window as any).__phcOverwatch.at(-1)).toMatchObject({ watcher: 'f', target: 'pc-a', tile: '2,1' });
    vi.advanceTimersByTime(600);
    expect(layer.querySelector('[data-phc-walker="pc-a"]')).toBeTruthy(); // still standing there through the beat
    // The rest of the walk takes over from the parked copy: one walker, ending where the PC stands.
    playFx({ k: 'move', n: 4, unit: 'pc-a', from: '2,1', to: '4,1', path: ['2,1', '3,1', '4,1'], how: 'move', sight: { pc: '111', foe: '111' } } as any);
    expect(layer.querySelectorAll('[data-phc-walker="pc-a"]').length).toBe(1);
    vi.advanceTimersByTime(400);
    expect(layer.querySelector('[data-phc-walker="pc-a"]')).toBeNull();
  });
  it('a parked walker gives up after a while if the rest never comes', () => {
    vi.useFakeTimers(); const layer = grid();
    fight({ f: '8,4' }, '4,1');
    vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    playFx({ k: 'move', n: 1, unit: 'pc-a', from: '0,1', to: '2,1', path: ['0,1', '1,1', '2,1'], how: 'move' } as any);
    vi.advanceTimersByTime(300 + PARK_MS + 200);
    expect(layer.querySelector('[data-phc-walker="pc-a"]')).toBeNull();
  });
});

describe('units wait for their moment', () => {
  it('the batch\'s walkers stay where they were (a stand-in where seen), and a hostile found without walking stays hidden', async () => {
    const { moversOf } = await import('./play');
    const side = (id: string) => (id.startsWith('pc') ? 'pc' : 'foe');
    const m = moversOf([
      { n: 1, k: 'turn', unit: 'f' }, { n: 2, k: 'move', unit: 'f', path: ['9,1', '8,1', '7,1'], sight: { pc: '001', foe: '111' } },
      { n: 3, k: 'move', unit: 'g', path: ['5,1', '4,1'], sight: { pc: '11', foe: '11' } }, { n: 4, k: 'move', unit: 'g', path: ['4,1', '3,1'] },
      { n: 5, k: 'move', unit: 'pc-a', path: ['0,1', '1,1'], sight: { pc: '11', foe: '00' } }, { n: 6, k: 'sight', unit: 'h', at: '6,4', how: 'enter', only: 'pc' },
      { n: 7, k: 'sight', unit: 'pc-a', at: '1,1', how: 'enter', only: 'foe' }, { n: 8, k: 'sight', unit: 'k', at: '2,2', how: 'hide', only: 'pc' },
    ] as any, side);
    expect(Object.fromEntries(m)).toEqual({ f: { kind: 'walk', stand: null }, g: { kind: 'walk', stand: '5,1' }, 'pc-a': { kind: 'walk', stand: '0,1' }, h: { kind: 'sight', stand: null } });
  });
});

describe('what the combat screen keeps see-through', () => {
  it('units with a walk or a coming-into-sight the layer has not taken up yet; none once taken up', async () => {
    const { fxHeldUnits, setProcessed, fightStream } = await import('./play');
    const cb: any = fight({ f: '5,1' });
    cb.fx = [{ n: 1, k: 'turn', unit: 'f' }, { n: 2, k: 'move', unit: 'f', path: ['7,1', '6,1', '5,1'], sight: { pc: '011', foe: '111' } }, { n: 3, k: 'sight', unit: 'h', how: 'enter', only: 'pc' }, { n: 4, k: 'sight', unit: 'k', how: 'enter', only: 'foe' }];
    const g: any = { code: 'X', characters: {}, combat: cb };
    expect([...fxHeldUnits(g)].sort()).toEqual(['f', 'h']); // a fight's opening: everything in it will play
    setProcessed(fightStream(g), 4); expect([...fxHeldUnits(g)]).toEqual([]);
    setProcessed(fightStream(g), 2); expect([...fxHeldUnits(g)]).toEqual(['h']);
  });
});

describe('the area map', () => {
  it('draws every walk: a throwaway fight\'s sight on the event is not the map\'s', () => {
    vi.useFakeTimers(); const layer = grid();
    setContext({ code: 'X', characters: { a: { id: 'a', name: 'Vel' } }, story: { positions: { a: '0,1' }, npcs: [{ id: 'f', name: 'Raider', pos: '5,1' }] }, combat: null } as any, 'main');
    playFx({ k: 'move', n: 1, unit: 'f', from: '7,1', to: '5,1', path: ['7,1', '6,1', '5,1'], how: 'move', sight: { pc: '000', foe: '111' } } as any);
    expect(layer.querySelector('[data-phc-walker="f"]')).toBeTruthy();
  });
});
