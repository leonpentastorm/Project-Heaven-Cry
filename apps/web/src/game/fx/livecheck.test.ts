// @vitest-environment jsdom
// Physical 2.0 B fx: the fixes from the live check of the ranged techniques in the real game (10 Nov 2026). Floating
// words never pile up (the same news once, the rest a line apart; long words never cut off at the screen's edge); a
// unit's own words sit on its own tile; cover and smoke wait on the grid for the shot or grenade that changes them; a
// pushed unit stays where it was until its push plays; a kill's token stays for the cut-in; a smoke Lob is drawn whole;
// a flashbang whites out the map, not the panels.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf, ARCHETYPES, newCharacter, startCombat } from '@engine';
import { setLayer, floatText, riseAt, sameNews, clearShift, resetFloats, type FloatBox } from './dom';
import { playFx, setContext, clearFx, moversOf, tilesOf, holdMovers, rememberTokens, fxHeldUnits, fightStream, setProcessed } from './play';
import { tagOf, resetRanged, SAID_AFTER } from './ranged';
import { NAME_DY } from './physical';
import { setInBattle } from '../combatSpeed';

function grid(w = 10, h = 7) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  (scr as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: w * 40, height: h * 40, right: w * 40, bottom: h * 40 });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    const zone = document.createElement('span'); zone.setAttribute('style', 'position: absolute; inset: 0; z-index: 1; box-sizing: border-box; background: grey'); b.appendChild(zone);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  setContext({ code: 'X', characters: { a: { id: 'a', name: 'Vel' } }, story: { positions: { a: '1,3' }, npcs: [{ id: 'f1', name: 'Raider', pos: '6,3' }] }, combat: null } as any, 'main');
  return layer;
}
/** A fight on the grid: the gunner pc-a at 1,3 and one foe f1 (both seen unless far away). */
function fight(foePos = '6,3', w = 10, h = 7, more: (cb: any) => void = () => {}) {
  const layer = grid(w, h);
  const ar = ARCHETYPES[0];
  const c = newCharacter('a', 'p1', { name: 'Vel', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...ar.preset }, attrs: { ...ar.attributes }, cores: { ...ar.cores }, identity: {} } as any);
  const cb: any = startCombat('t', 'yard', [{ c, pos: '1,3' }], [{ name: 'Raider', tier: 'minion', weapon: 'service_pistol', at: refOf(foePos) }] as any, 'easy', { state: 4 } as any, []);
  const pc = cb.units.find((u: any) => u.side === 'pc'); pc.id = 'pc-a'; pc.pos = '1,3';
  const foe = cb.units.find((u: any) => u.side === 'foe'); foe.id = 'f1'; foe.pos = foePos;
  more(cb);
  const g: any = { code: 'X', characters: { a: c }, story: { positions: {}, npcs: [] }, combat: cb };
  setContext(g, 'combat');
  return { layer, cb, g };
}
let N = 5000;
const n = () => ++N;
const words = (layer: HTMLElement) => ([...layer.children] as HTMLElement[]).filter((b) => b.style.zIndex === '3');

beforeEach(() => { vi.useFakeTimers(); resetRanged(); clearFx(); resetFloats(); });
afterEach(() => { vi.useRealTimers(); setInBattle(false); });

describe('floating words never pile up', () => {
  it('pure: a float rises as its keyframes say; the same word on the same spot is the same news; numbers never are', () => {
    expect(riseAt(0, 20)).toBe(6); expect(riseAt(0.15, 20)).toBeCloseTo(-4); expect(riseAt(1, 20)).toBeCloseTo(-20);
    const b: FloatBox = { l: 90, r: 110, y: 100, h: 14, t0: 0, ms: 1000, rise: 20, text: 'PINNED' };
    expect(sameNews([b], 'PINNED', 100, 102, 40, 300)).toBe(true);
    expect(sameNews([b], 'PINNED', 100, 102, 40, 900)).toBe(false); // later: news again
    expect(sameNews([{ ...b, text: '−23' }], '−23', 100, 100, 40, 100)).toBe(false); // two hits of 23 are two hits
    expect(sameNews([b], 'PINNED', 200, 100, 40, 100)).toBe(false); // another tile
  });
  it('pure: an overlapping float moves down a line; one clear of it stays; one that has risen away leaves room', () => {
    const b: FloatBox = { l: 90, r: 110, y: 100, h: 14, t0: 0, ms: 1000, rise: 20, text: '−23' };
    expect(clearShift([b], 100, 100, 10, 14, 0)).toBe(15);
    expect(clearShift([b, { ...b, y: 115 }], 100, 100, 10, 14, 0)).toBe(30);
    expect(clearShift([b], 160, 100, 10, 14, 0)).toBe(0);
    expect(clearShift([{ ...b, t0: -2000 }], 100, 100, 10, 14, 0)).toBe(0); // gone
  });
  it('three rolls\' damage on one target stack a line apart; PINNED from the condition and the stop shows once', () => {
    const layer = grid();
    const p = { x: 100, y: 100, s: 40 };
    floatText('−23', p, 'red'); vi.advanceTimersByTime(100); floatText('−23', p, 'red'); vi.advanceTimersByTime(100); floatText('−23', p, 'red');
    const tops = words(layer).map((b) => parseFloat(b.style.top));
    expect(new Set(tops).size).toBe(3);
    floatText('PINNED', { x: 300, y: 100, s: 40 }, 'white', { small: true }); floatText('PINNED', { x: 302, y: 104, s: 40 }, 'white', { small: true });
    expect(words(layer).filter((b) => b.textContent === 'PINNED')).toHaveLength(1);
  });
  it('a long word at the screen\'s left edge is measured by its text and moved fully on screen', () => {
    const layer = grid();
    Object.defineProperty(layer, 'clientWidth', { value: 1440, configurable: true });
    const spanW = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const w = this.tagName === 'SPAN' ? 300 : 40; return { left: 0, top: 0, width: w, height: 14, right: w, bottom: 14 } as DOMRect;
    });
    floatText('WATCH LOST · SMOKE GRENADE', { x: 20, y: 100, s: 40 }, 'grey', { small: true });
    spanW.mockRestore();
    const box = words(layer)[0]; expect(parseFloat(box.style.left)).toBeGreaterThanOrEqual(4); expect(parseFloat(box.style.width)).toBeGreaterThanOrEqual(300);
  });
});

describe('a unit\'s own words sit on its own tile', () => {
  it('a technique\'s name is centred inside its user\'s tile, not on the tile above (where another unit may stand)', () => {
    const layer = grid();
    playFx({ k: 'technique', n: n(), unit: 'pc-a', id: 'burst', group: 'fire', system: 'ranged', target: 'f1', at: '1,3', weapon: 'hellraiser_service_rifle' } as any);
    const name = words(layer).find((b) => /BURST/i.test(b.textContent || ''))!;
    const cy = parseFloat(name.style.top) + parseFloat(name.style.height) / 2;
    expect(cy).toBeGreaterThan(3 * 40); expect(cy).toBeLessThan(3 * 40 + 20); // the top half of row 3 (y 120..140)
    expect(NAME_DY).toBeGreaterThan(-0.2);
  });
  it('Brace and the Watches name themselves once (their stance or watch_set says it)', () => {
    const layer = grid();
    for (const id of ['brace', 'overwatch']) expect(SAID_AFTER.has(id)).toBe(true);
    playFx({ k: 'technique', n: n(), unit: 'pc-a', id: 'brace', group: 'set', system: 'ranged', target: null, at: '1,3', weapon: 'lmg' } as any);
    playFx({ k: 'stance', n: n(), unit: 'pc-a', at: '1,3', what: 'brace' } as any);
    const t = layer.textContent || '';
    expect(t).toMatch(/BRACED/); expect(t.replace('BRACED', '')).not.toMatch(/BRACE/);
  });
});

describe('the grid waits for the effect that changes it', () => {
  it('pure: which tiles a batch changes (cover struck, a smoke cloud), and who it pushes', () => {
    const evs: any[] = [{ k: 'object', n: 1, at: '3,3', dmg: 9 }, { k: 'object', n: 2, at: '3,3', dmg: 9, broken: true }, { k: 'object', n: 3, at: '4,4', dmg: 0 },
      { k: 'explode', n: 4, at: '6,3', radius: 2, what: 'smoke_grenade' }, { k: 'explode', n: 5, at: '6,3', radius: 1, what: 'frag_grenade' }];
    const t = tilesOf(evs);
    expect([...t.objects]).toEqual([['3,3', 2]]); expect(t.clouds).toEqual([{ at: '6,3', radius: 2, n: 4 }]);
    const m = moversOf([{ k: 'shot', n: 1, unit: 'pc-a' }, { k: 'shove', n: 2, unit: 'pc-a', target: 'f1', from: '3,4', to: '4,4', ok: true }] as any, () => 'foe');
    expect(m.get('f1')).toEqual({ kind: 'walk', stand: '3,4' });
  });
  it('struck cover shows as it was until its last object event plays; then the grid\'s own tile shows', () => {
    const { layer, cb } = fight('6,3', 10, 7, (cb) => { cb.objects = [...(cb.objects || []), { id: 'w1', kind: 'low_wall', name: 'Low wall', pos: '4,3', hp: 60, max: 60 }]; });
    rememberTokens();
    const evs: any[] = [{ k: 'shot', n: n(), unit: 'pc-a', from: '1,3', to: '6,3', target: 'f1', hit: true, dmg: 5, weapon: 'thumper', cat: 'launcher' }, { k: 'object', n: n(), at: '4,3', dmg: 30, hp: 30, max: 60 }, { k: 'object', n: n(), at: '4,3', dmg: 30, broken: true, hp: 0, max: 60 }];
    void cb;
    holdMovers(evs);
    const was = () => layer.querySelectorAll('[data-phc-tile-was="4,3"]').length;
    expect(was()).toBe(1);
    expect(layer.querySelector('[data-phc-tile-was] button.phc-tok')).toBeNull(); // never a second tile the layer could find
    playFx(evs[1]); vi.advanceTimersByTime(200); expect(was()).toBe(1);
    playFx(evs[2]); vi.advanceTimersByTime(200); expect(was()).toBe(0);
  });
  it('a smoke cloud\'s tint waits for its grenade; anything that doesn\'t play lets it go in time', () => {
    const { layer } = fight();
    const z = (k: string) => { const [x, y] = k.split(',').map(Number); return (document.querySelectorAll('button.phc-tok')[y * 10 + x] as HTMLElement).querySelector('span') as HTMLElement; };
    const spy = vi.fn(); const orig = (HTMLElement.prototype as any).animate;
    (HTMLElement.prototype as any).animate = function (this: HTMLElement, f: any, o: any) { const a = { cancel: () => spy(this), finished: Promise.resolve(), onfinish: null }; return a; };
    try {
      const ex: any = { k: 'explode', n: n(), at: '5,3', radius: 1, what: 'smoke_grenade' };
      holdMovers([ex]);
      playFx(ex);
      expect(spy.mock.calls.some((c) => c[0] === z('5,3'))).toBe(true);
    } finally { (HTMLElement.prototype as any).animate = orig; }
    void layer;
  });
  it('Stopping Shot: the target stays on its tile (and takes the shot there) until its push plays; the screen draws it held', () => {
    const { layer, g } = fight('4,3');
    const foe = g.combat.units.find((u: any) => u.id === 'f1'); foe.pos = '5,3'; setContext(g, 'combat'); // the state: already pushed
    const sh: any = { k: 'shove', n: n(), unit: 'pc-a', target: 'f1', from: '4,3', to: '5,3', ok: true };
    g.combat.fx = [sh]; setProcessed(fightStream(g), 0);
    expect(fxHeldUnits(g).has('f1')).toBe(true);
    rememberTokens(); holdMovers([sh]);
    expect(layer.querySelector('[data-phc-stand="f1"]')?.getAttribute('data-phc-stand-at')).toBe('4,3');
    playFx(sh); expect(layer.querySelector('[data-phc-stand="f1"]')).toBeNull();
  });
  it('a kill: the target\'s token stands on its tile from the moment the batch arrives (through a cut-in) until it falls', () => {
    const { layer, g } = fight('4,3');
    rememberTokens();
    const foe = g.combat.units.find((u: any) => u.id === 'f1'); foe.dead = true; setContext(g, 'combat');
    holdMovers([{ k: 'shot', n: n(), unit: 'pc-a', target: 'f1', from: '1,3', to: '4,3', hit: true, killed: true, dmg: 30 }, { k: 'down', n: n(), unit: 'f1', at: '4,3', dead: true }] as any);
    const ghosts = () => ([...layer.children] as HTMLElement[]).filter((b) => b.style.zIndex === '1' && b.querySelector('img')).length;
    expect(ghosts()).toBe(1);
    vi.advanceTimersByTime(4000); expect(ghosts()).toBe(1); // a cut-in's length later, still there
  });
});

describe('Lob and the flashbang', () => {
  it('a smoke Lob is drawn whole although the cloud already hides its tiles: arc, reticle, radius box and every puff', () => {
    // the target box (x 20..24) is far out of the squad's sight (vision 12): only the thrower being seen draws it
    const { layer } = fight('6,3', 30, 7);
    const t: any = { k: 'technique', n: n(), unit: 'pc-a', id: 'lob', group: 'fire', system: 'ranged', target: null, tile: '22,3', at: '1,3', line: 'blast', weapon: 'smoke_grenade' };
    const s: any = { k: 'shot', n: n(), unit: 'pc-a', target: null, from: '1,3', to: '22,3', weapon: 'smoke_grenade', cat: 'thrown', hit: true, object: true, tech: 'lob', vi: 0 };
    const ex: any = { k: 'explode', n: n(), at: '22,3', radius: 2, what: 'smoke_grenade' };
    tagOf(t); tagOf(s); tagOf(ex);
    playFx(t); playFx(ex); vi.advanceTimersByTime(600);
    const puffs = ([...layer.children] as HTMLElement[]).filter((b) => /puff/.test(b.innerHTML)).length;
    expect(puffs).toBeGreaterThanOrEqual(9);
    expect(layer.querySelectorAll('[data-rfx="arc"],[data-rfx="radius"]').length + layer.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
  it('a hostile\'s smoke out of sight stays unseen (nothing of the cloud is in sight, its thrower isn\'t)', () => {
    const { layer } = fight('6,3', 30, 7);
    playFx({ k: 'explode', n: n(), at: '22,3', radius: 2, what: 'smoke_grenade' } as any); vi.advanceTimersByTime(600);
    expect(([...layer.children] as HTMLElement[]).filter((b) => /puff/.test(b.innerHTML)).length).toBe(0);
  });
  it('a flashbang whites out the map, not the whole screen', () => {
    const layer = grid();
    playFx({ k: 'explode', n: n(), at: '6,3', radius: 2, what: 'flashbang' } as any);
    const fixed = ([...layer.querySelectorAll('div')] as HTMLElement[]).filter((d) => d.style.position === 'fixed' && /inset/.test(d.style.cssText));
    expect(fixed).toHaveLength(0);
    expect(([...layer.children] as HTMLElement[]).some((b) => /radial-gradient/.test(b.innerHTML))).toBe(true);
  });
});
