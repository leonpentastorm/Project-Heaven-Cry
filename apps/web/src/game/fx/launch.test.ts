// @vitest-environment jsdom
// What a weapon's shot looks like and when it lands (Leon, 11 Nov 2026: a grenade launcher's Suppress drew bullet
// tracers; a lobbed round's blast went off while it was still in the air). Read from the effects layer's own trace
// (fx/dom.ts trace), the same one the browser sweep reads (apps/web/e2e/fx-sweep.mjs).
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf } from '@engine';
import { setLayer } from './dom';
import { playFx, queueFx, setContext, clearFx, combatTempoInfo } from './play';
import { resetRanged } from './ranged';
import { setInBattle } from '../combatSpeed';

function grid(w = 12, h = 7) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  setContext({ code: 'X', characters: { a: { id: 'a', name: 'Vel' } }, story: { positions: { a: '1,3' }, npcs: [{ id: 'f1', name: 'Raider', pos: '9,3' }, { id: 'f2', name: 'Raider', pos: '10,3' }] }, combat: null } as any, 'main');
}
type T = { w: string; n: number; t: number; look?: string; ms?: number; k?: string; s?: string };
const trace = () => (window as any).__phcFxTrace as T[];
let N = 500;
const n = () => ++N;
const THUMPER = { unit: 'pc-a', from: '1,3', weapon: 'smetanita_thumper', cat: 'heavy' }, RIFLE = { unit: 'pc-a', from: '1,3', weapon: 'hellraiser_service_rifle', cat: 'rifle' };
const tech = (id: string, w: typeof THUMPER, extra: Record<string, unknown> = {}) => ({ k: 'technique', n: n(), unit: 'pc-a', id, group: id === 'lob' ? 'fire' : 'press', system: 'ranged', target: 'f1', tile: null, hand: 'main', at: '1,3', weapon: w.weapon, ...extra });
const shot = (w: typeof THUMPER, extra: Record<string, unknown> = {}) => ({ k: 'shot', n: n(), ...w, target: 'f1', to: '9,3', mode: 'shot', hit: true, crit: false, fumble: false, dmg: 9, killed: false, ...extra });

beforeEach(() => { vi.useFakeTimers(); resetRanged(); clearFx(); grid(); (window as any).__phcFxTrace = []; });
afterEach(() => { vi.useRealTimers(); setInBattle(false); (window as any).__phcFxTrace = null; });

describe('what a weapon fires is what is drawn', () => {
  const suppress = (w: typeof THUMPER) => {
    queueFx([tech('suppress', w), { k: 'volley', n: n(), ...w, target: 'f1', to: '9,3', mode: 'suppress', shots: 3, tech: 'suppress' }, shot(w, { chain: true, tech: 'suppress', vi: 0 })] as any);
    vi.advanceTimersByTime(3000);
    return trace();
  };
  it('Suppress with a grenade launcher: three lobbed rounds and their blasts, no tracer, no muzzle flash, no burst rattle', () => {
    const tr = suppress(THUMPER), looks = tr.filter((e) => e.w === 'proj').map((e) => e.look);
    expect(looks).toEqual(['lob', 'lob', 'lob']);
    expect(tr.some((e) => e.w === 'muzzle')).toBe(false);
    expect(tr.filter((e) => e.w === 'boom').length).toBe(3);
    expect(tr.some((e) => e.w === 'sfx' && /^(gun_|burst_|auto_)/.test(e.s || ''))).toBe(false);
  });
  it('Suppress with a rifle: its rattle starts with the first muzzle flash, three rounds leave, and the hit comes with the last of them', () => {
    const tr = suppress(RIFLE), fly = tr.filter((e) => e.w === 'proj');
    expect(fly.map((e) => e.look)).toEqual(['bullet', 'bullet', 'bullet']);
    const rattle = tr.find((e) => e.w === 'sfx' && /^burst_/.test(e.s || ''))!, flashes = tr.filter((e) => e.w === 'muzzle'), hit = tr.find((e) => e.w === 'impact')!;
    expect(rattle).toBeTruthy(); expect(flashes).toHaveLength(3);
    expect(Math.abs(flashes[0].t - rattle.t)).toBeLessThanOrEqual(20); // (it was a beat, about 100 ms, before the flash)
    expect(hit.t).toBeGreaterThanOrEqual(Math.max(...fly.map((e) => e.t))); // (it landed before two of the three had left)
    const press = { k: 'pressure', n: n(), unit: 'f1', at: '9,3', now: 2, was: 0, state: 'pressed', by: 'pc-a', why: 'Suppress' };
    (window as any).__phcFxTrace = [];
    queueFx([tech('suppress', RIFLE), { k: 'volley', n: n(), ...RIFLE, target: 'f1', to: '9,3', mode: 'suppress', shots: 3, tech: 'suppress' }, shot(RIFLE, { chain: true, tech: 'suppress', vi: 0 }), press] as any);
    vi.advanceTimersByTime(3000);
    const t2 = trace(); // the Pressure it gives shows after the hit, not before
    expect(t2.find((e) => e.w === 'ev' && e.k === 'pressure')!.t).toBeGreaterThanOrEqual(t2.find((e) => e.w === 'impact')!.t);
  });
});

describe('what follows a landing waits for it', () => {
  it('Lob (Blast): the blast, the wound and the HP bar come when the round lands, never while it is in the air', () => {
    const s = shot(THUMPER, { target: null, object: true, dmg: 0, tech: 'lob', technique: 'lob', vi: 0 });
    const boom = { k: 'explode', n: n(), at: '9,3', radius: 2, what: 'smetanita_thumper', hp: { f1: [100, 70] } };
    const hurt = { k: 'hurt', n: n(), target: 'f1', at: '9,3', dmg: 30, why: 'explosion', killed: false };
    queueFx([tech('lob', THUMPER, { tile: '9,3', target: null, line: 'blast' }), s, boom, hurt] as any);
    vi.advanceTimersByTime(4000);
    const tr = trace(), fly = tr.find((e) => e.w === 'proj' && e.n === s.n)!, lands = fly.t + fly.ms! - 1;
    expect(fly.look).toBe('lob');
    expect(fly.ms).toBeGreaterThan(400); // 8 tiles: a real flight, not a blink
    for (const e of tr.filter((x) => (x.w === 'ev' && (x.k === 'explode' || x.k === 'hurt')) || x.w === 'boom' || x.w === 'hp')) expect(e.t, e.w + ' ' + (e.k || '')).toBeGreaterThanOrEqual(lands);
    expect(tr.some((e) => e.w === 'sfx' && e.s === 'hit_wood')).toBe(false); // a charge landing is not a knock on a crate
  });
  it('a launcher\'s shot holds the stage for its flight (the wounds around the blast are the next events); a rifle\'s keeps its beat', () => {
    const beat = combatTempoInfo().beat;
    expect(beat('shot', shot(THUMPER, { chain: true }))).toBeGreaterThan(600);
    expect(beat('shot', shot(THUMPER))).toBeGreaterThan(600);
    expect(beat('shot', shot(RIFLE, { chain: true }))).toBe(170);
    expect(beat('shot', shot(RIFLE))).toBe(400);
  });
  it('a hit\'s HP change comes when a slow round lands (a lob, an arrow after its draw), a bullet\'s as before', () => {
    const a = shot(THUMPER, { hp: { f1: [100, 60] } }), b = shot(RIFLE, { hp: { f1: [60, 51] } });
    playFx(a as any, 'cb|t'); vi.advanceTimersByTime(3000);
    let tr = trace(); const fly = tr.find((e) => e.w === 'proj' && e.n === a.n)!, hp = tr.find((e) => e.w === 'hp' && e.n === a.n)!;
    expect(hp.t).toBeGreaterThanOrEqual(fly.t + fly.ms! - 1); // (the trace rounds the flight to a millisecond)
    (window as any).__phcFxTrace = [];
    playFx(b as any, 'cb|t'); vi.advanceTimersByTime(3000);
    tr = trace(); const ev = tr.find((e) => e.w === 'ev' && e.n === b.n)!, hp2 = tr.find((e) => e.w === 'hp' && e.n === b.n)!;
    expect(Math.round(hp2.t - ev.t)).toBe(260);
  });
});
