// @vitest-environment jsdom
// The effects layer: every event kind plays over a grid of tiles without throwing, draws something, and cleans up.
import { describe, expect, it, vi } from 'vitest';
import { refOf } from '@engine';
import { setLayer, tileEl, tokenEl, centre, put, shiftLayer, liveAt, floatText, resetFloats } from './dom';
import { playFx, queueFx, fxBusyUntil, setContext, clearFx, reloadKind } from './play';
import * as sfxMod from '../sfx';

function grid(w = 8, h = 6) {
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

describe('effects layer', () => {
  it('finds tiles by grid reference and their tokens', () => {
    grid();
    expect(tileEl('2,3')?.getAttribute('aria-label')).toMatch(/^C4 /);
    expect(tokenEl(tileEl('2,3'))?.tagName).toBe('IMG');
    expect(tileEl('99,99')).toBeNull();
  });
  it('a point found before the camera moved is drawn where its tile is by then (review of roadmap 2c)', () => {
    vi.useFakeTimers();
    const layer = grid(); resetFloats();
    const p = centre('2,3')!; // C4: centre 100, 140
    expect([p.x, p.y]).toEqual([100, 140]);
    shiftLayer(30, 98); // the camera glides: the map moves 30 px left and 98 px up on screen
    expect([liveAt(p).x, liveAt(p).y]).toEqual([70, 42]);
    // a point built from it by spreading keeps its stamp; one built by hand is taken as it is (as before)
    expect(liveAt({ ...p, y: p.y + 10 }).y).toBe(52);
    expect(liveAt({ x: p.x, y: p.y }).y).toBe(140);
    const box = put(document.createElement('i'), p, 20, 20, 500);
    expect([parseFloat(box.style.left), parseFloat(box.style.top)]).toEqual([60, 32]);
    // a wound's number that appears 150 ms after the hit: the camera moves again in between
    const q = centre('2,3')!; // found now: the stamp is the scroll so far
    floatText('−17', q, '#F65157', { delay: 150 });
    shiftLayer(0, 50); vi.advanceTimersByTime(400);
    const num = [...layer.children].find((c) => c.textContent === '−17') as HTMLElement;
    expect(num).toBeTruthy();
    // its box is centred on x 100 and sits 0.35 tile above the tile's centre, 50 px higher than where the tile was
    expect(parseFloat(num.style.top) + parseFloat(num.style.height) / 2).toBeCloseTo(140 - 40 * 0.35 - 50, 0);
    vi.useRealTimers(); layer.remove();
  });
  it('plays every kind of event without throwing, and leaves nothing behind', async () => {
    vi.useFakeTimers();
    const layer = grid();
    setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: null } as any, 'main');
    const evs: any[] = [
      { k: 'turn', unit: 'u', side: 'pc', at: '1,1' }, { k: 'move', unit: 'u', from: '1,1', to: '3,1', path: ['1,1', '2,1', '3,1'], how: 'move' },
      { k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,3', weapon: 'service_pistol', cat: 'pistol', hit: true, crit: true, dmg: 22 },
      { k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,3', weapon: 'coach_gun', cat: 'shotgun', hit: false, fumble: true },
      { k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,3', weapon: 'frag_grenade', cat: 'thrown', hit: true, dmg: 30 },
      { k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,3', weapon: 'purifier_flamer', cat: 'heavy', hit: true, dmg: 12, cover: '4,3' },
      { k: 'volley', unit: 'u', from: '1,1', to: '5,3', cat: 'smg', mode: 'auto' }, { k: 'melee', unit: 'u', target: 't', from: '1,1', to: '2,1', cat: 'heavy_melee', hit: true, dmg: 9 },
      { k: 'reload', unit: 'u', at: '1,1', cat: 'pistol', how: 'mag', dur: 1200 }, { k: 'reload', unit: 'u', at: '1,1', cat: 'revolver', how: 'loose', rounds: 6, dur: 1400 },
      { k: 'load', unit: 'u', at: '1,1', rounds: 10, dur: 1400 }, { k: 'clear', unit: 'u', at: '1,1', dur: 1000 }, { k: 'repair', unit: 'u', at: '1,1', dur: 1400 },
      { k: 'stim', unit: 'u', target: 't', from: '1,1', to: '2,1', heal: 30 }, { k: 'heal', target: 't', at: '2,1', amount: 10, revive: true },
      { k: 'hurt', target: 't', at: '2,1', dmg: 5, why: 'burn' }, { k: 'shield', target: 't', at: '2,1', absorbed: 4 }, { k: 'down', unit: 't', at: '2,1', dead: true },
      { k: 'explode', at: '4,4', radius: 1 }, { k: 'object', at: '4,4', broken: true }, { k: 'door', at: '3,3', open: true }, { k: 'trap', unit: 'u', at: '3,3' },
      { k: 'shove', unit: 'u', target: 't', from: '2,1', to: '3,1', ok: true, prone: true }, { k: 'stance', unit: 'u', at: '1,1', what: 'overwatch' },
      { k: 'analyze', unit: 'u', target: 't', from: '1,1', to: '5,3' }, { k: 'pickup', unit: 'u', at: '1,1' },
      { k: 'draw', unit: 'u', at: '1,1', tile: '2,2', word: 'fire' }, { k: 'scuff', unit: 'u', at: '2,2' },
      { k: 'evoke', unit: 'u', at: '1,1', shape: 'line', tiles: ['1,2', '2,2'], src: '2,2', impact: '6,2', targets: ['t'], element: 'shock' },
      { k: 'miss', unit: 'u', target: 't', at: '6,2', by: 'sigil' }, { k: 'cond', target: 't', at: '6,2', id: 'slowed' }, { k: 'overload', unit: 'u', at: '1,1' }, { k: 'vent', unit: 'u', at: '1,1', flux: 3 },
      { k: 'core', unit: 'u', at: '1,1', dur: 1000 }, { k: 'outburst', unit: 'u', at: '1,1', hold: true }, { k: 'grow', unit: 'u', at: '1,1', stage: 3 },
      { k: 'release', unit: 'u', at: '1,1', to: '5,2', stage: 3, area: 1, school: 'buff', wild: true }, { k: 'short', unit: 'u', at: '1,1', burst: false },
      { k: 'syphon', unit: 'u', at: '1,1', mp: 12 }, { k: 'crystallise', unit: 'u', at: '1,1', dur: 1400 }, { k: 'mana', band: 'rich' }, { k: 'nonsense' },
    ];
    const warn = vi.spyOn(console, 'warn');
    for (const e of evs) playFx(e);
    expect(warn).not.toHaveBeenCalled();
    expect(layer.childElementCount).toBeGreaterThan(20);
    vi.advanceTimersByTime(10000);
    expect(layer.childElementCount).toBe(0);
    // Queued, they take their turns: the queue reports when it will be done.
    queueFx(evs.slice(0, 6).map((e, i) => ({ n: i + 1, ...e })));
    expect(fxBusyUntil()).toBeGreaterThan(performance.now() + 500);
    clearFx(); vi.advanceTimersByTime(10000);
    vi.useRealTimers();
  });
  it('reloads sound like what is loaded: arrows, fuel, a launcher shell, shells, or a gun', () => {
    expect(reloadKind('recurve_bow', 'bow')).toBe('bow'); expect(reloadKind('longbow', 'bow')).toBe('bow');
    expect(reloadKind('crossbow', 'bow')).toBe('bow'); expect(reloadKind('repeating_crossbow', 'bow')).toBe('bow');
    expect(reloadKind('purifier_flamer', 'heavy')).toBe('fuel');
    expect(reloadKind('smetanita_thumper', 'heavy')).toBe('launcher'); expect(reloadKind('breacher_tube', 'heavy')).toBe('launcher');
    expect(reloadKind('lumeri_censer_gun', 'mana')).toBe('shells'); expect(reloadKind('coach_gun', 'shotgun')).toBe('shells');
    expect(reloadKind('drifter_revolver', 'revolver')).toBe('gun'); expect(reloadKind('decrkm_smg', 'smg')).toBe('gun');
  });
  it('a missed grenade goes off where it lands (no bullet whiz); a broken object is not a second wood hit', () => {
    vi.useFakeTimers(); grid();
    setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: null } as any, 'main');
    const spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    playFx({ k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,3', weapon: 'frag_grenade', cat: 'thrown', hit: false } as any);
    vi.advanceTimersByTime(1000);
    const names = spy.mock.calls.map((c) => c[0]);
    expect(names).toContain('explosion'); expect(names).not.toContain('whiz');
    spy.mockClear();
    playFx({ k: 'shot', unit: 'u', from: '1,1', to: '4,1', weapon: 'service_pistol', cat: 'pistol', hit: true, object: true } as any);
    playFx({ k: 'object', at: '4,1', broken: true } as any);
    vi.advanceTimersByTime(1000);
    expect(spy.mock.calls.filter((c) => c[0] === 'hit_wood').length).toBe(1);
    spy.mockRestore(); clearFx(); vi.advanceTimersByTime(5000); vi.useRealTimers();
  });
  it('clearing the queue also drops a handler\'s own later steps (leaving the room mid enemy phase is silent)', () => {
    vi.useFakeTimers(); grid();
    setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: null } as any, 'main');
    const spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    queueFx([1, 2, 3].map((n) => ({ n, k: 'shot', unit: 'u', target: 't', from: '1,1', to: '5,3', weapon: 'service_pistol', cat: 'pistol', hit: true, dmg: 5 })) as any);
    const before = spy.mock.calls.length; clearFx(); vi.advanceTimersByTime(8000);
    expect(spy.mock.calls.length).toBe(before);
    spy.mockRestore(); vi.useRealTimers();
  });
  it('Sigil 1.5 sounds: a stroke join, an inflection coming on, a word copied (Analyze on a glyph, Investigate on a mark)', () => {
    vi.useFakeTimers(); grid();
    setContext({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: null } as any, 'main');
    const spy = vi.spyOn(sfxMod, 'sfx').mockImplementation(() => {});
    const heard = (e: any) => { spy.mockClear(); playFx(e); vi.advanceTimersByTime(1500); return spy.mock.calls.map((c) => c[0]); };
    expect(heard({ k: 'draw', unit: 'u', at: '1,1', tile: '2,2', word: 'seek', effect: 'extends' })).toContain('sg_join');
    expect(heard({ k: 'draw', unit: 'u', at: '1,1', tile: '2,2', word: 'fire', effect: 'starts' })).not.toContain('sg_join');
    expect(heard({ k: 'sigil_growth', unit: 'u', at: '1,1', study: 30, mastered: ['fire'] })).toContain('sg_inflect');
    expect(heard({ k: 'sigil_growth', unit: 'u', at: '1,1', study: 6, mastered: [] })).toContain('sg_study');
    expect(heard({ k: 'analyze', unit: 'u', from: '1,1', to: '4,1', glyph: true })).toContain('sg_study');
    expect(heard({ k: 'analyze', unit: 'u', target: 't', from: '1,1', to: '4,1' })).not.toContain('sg_study');
    expect(heard({ k: 'approach', unit: 'pc-a', at: '3,3', label: 'Investigate', ok: true, effect: 'copied PULL' })).toContain('sg_study');
    expect(heard({ k: 'approach', unit: 'pc-a', at: '3,3', label: 'Search', ok: true, effect: 'removed' })).not.toContain('sg_study');
    spy.mockRestore(); clearFx(); vi.advanceTimersByTime(5000); vi.useRealTimers();
  });
});
