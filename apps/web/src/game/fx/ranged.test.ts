// @vitest-environment jsdom
// Physical 2.0 B: the ranged techniques' effects (fx/ranged.ts), driven by feeding the events the ranged engine sends
// (claude/physical-2.0-B-ranged: physical/ranged/*.ts, the core's technique / pressure / watch_* / stopped, combat.ts's
// shot / volley / object / explode / hurt). Each effect plays from its events, the beats follow the combat speed, a
// missing field never throws, and every new asset file is credited.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { refOf, ARCHETYPES, newCharacter, startCombat, fogFight } from '@engine';
import { setLayer } from './dom';
import { playFx, queueFx, setContext, clearFx, combatTempoInfo } from './play';
import { tagOf, looseKind, stepDown, partOf, tilesWithin, quietEnd, rangedBeat, resetRanged, rangedBatch, smokeTiles, EVENTS_FOR_THE_LEAD, EVENTS_SENT, ROUND_WORD } from './ranged';
import { coverMaterial, partPoint, HEAT_BAR_PX, SNAP_ARC } from './rangedParts';
import { FX_CREDITS } from './fxCredits';
import { SFX_CREDITS } from '../sfxCredits';
import { SFX_FILES } from '../sfx';
import { setCombatSpeed, setInBattle } from '../combatSpeed';
import * as sfxMod from '../sfx';

const PUBLIC = resolve(__dirname, '../../../public');
function grid(w = 10, h = 7) {
  document.body.innerHTML = '';
  const root = document.createElement('div'); root.id = 'root'; const scr = document.createElement('div'); root.appendChild(scr); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    const img = document.createElement('img'); img.setAttribute('style', 'position: relative; z-index: 2; width: 38px'); b.appendChild(img);
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    scr.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  // the area map's context: everyone on it is in view (the gunner 'pc-a' at 1,3; hostiles f1 at 6,3, f2 at 7,4, f3 at 6,5)
  setContext({ code: 'X', characters: { a: { id: 'a', name: 'Vel' } }, story: { positions: { a: '1,3' }, npcs: [{ id: 'f1', name: 'Raider', pos: '6,3' }, { id: 'f2', name: 'Raider', pos: '7,4' }, { id: 'f3', name: 'Raider', pos: '6,5' }] }, combat: null } as any, 'main');
  return layer;
}
let N = 1000;
const n = () => ++N;
const W = { unit: 'pc-a', from: '1,3', weapon: 'hellraiser_service_rifle', cat: 'rifle' };
const tech = (id: string, extra: Record<string, unknown> = {}) => ({ k: 'technique', n: n(), unit: 'pc-a', id, group: 'fire', system: 'ranged', target: 'f1', tile: null, hand: 'main', at: '1,3', ...extra });
const shot = (extra: Record<string, unknown> = {}) => ({ k: 'shot', n: n(), ...W, target: 'f1', to: '6,3', mode: 'shot', hit: true, crit: false, fumble: false, dmg: 9, killed: false, ...extra });
const rfx = (layer: HTMLElement, name: string) => layer.querySelectorAll('[data-rfx="' + name + '"]').length;
const text = (layer: HTMLElement) => layer.textContent || '';

beforeEach(() => { vi.useFakeTimers(); resetRanged(); clearFx(); });
afterEach(() => { vi.useRealTimers(); setInBattle(false); });

describe('which technique a shot belongs to', () => {
  it('a technique tags the shots of its user that follow, up to its rolls; another unit\'s shot never inherits; a turn clears it', () => {
    const t = tech('burst'), s1 = shot({ chain: true }), s2 = shot({ chain: true }), other = shot({ unit: 'f2', from: '7,4', to: '1,3', target: 'pc-a' });
    expect(tagOf(t)?.id).toBe('burst');
    expect(tagOf(s1)?.id).toBe('burst'); expect(tagOf(other)).toBeNull(); expect(tagOf(s2)?.id).toBe('burst');
    expect(tagOf(t)!.shots).toHaveLength(2);
    const d = tech('dead_centre', { group: 'take' }), a = shot(), b = shot();
    tagOf(d); expect(tagOf(a)?.id).toBe('dead_centre'); expect(tagOf(b)).toBeNull(); // a plain shot after its one roll
    const m = tech('mag_dump'); tagOf(m); tagOf({ k: 'turn', n: n(), unit: 'pc-a', side: 'pc', at: '1,3' }); expect(tagOf(shot())).toBeNull();
  });
  it('the engine\'s `tech` on a shot wins (E1a); a melee or refused technique tags nothing', () => {
    tagOf(tech('suppress')); expect(tagOf(shot({ tech: 'called_shot' }))?.id).toBe('called_shot');
    tagOf(tech('suppress')); expect(tagOf(shot({ tech: null }))).toBeNull();
    tagOf(tech('lunge', { system: 'melee' })); expect(tagOf(shot())).toBeNull();
    tagOf(tech('burst', { refused: true })); expect(tagOf(shot())).toBeNull();
  });
  it('a copy of an event (the queue plays copies) finds its original\'s record by its number', () => {
    const t = tech('rake'), s = [shot(), shot({ target: 'f2', to: '7,4' }), shot({ target: 'f3', to: '6,5' })];
    tagOf(t); s.forEach(tagOf);
    expect(tagOf({ ...s[0] })?.shots).toHaveLength(3);
  });
  it('what followed is kept for a look ahead: the cover a Punch Through broke, the condition a Called Shot caused', () => {
    const t = tech('punch_through'); tagOf(t); tagOf(shot());
    tagOf({ k: 'object', n: n(), at: '4,3', what: 'crate', dmg: 12, broken: false, hp: 18 });
    expect(tagOf(t)!.objects).toHaveLength(1);
    const c = tech('called_shot'); tagOf(c); tagOf(shot()); tagOf({ k: 'cond', n: n(), target: 'f1', at: '6,3', id: 'slowed' });
    expect(partOf(tagOf(c))).toBe('leg');
    expect(partOf({ ...tagOf(c)!, opt: 'head' })).toBe('head');
  });
});

describe('pure pieces', () => {
  it('loose rounds (no attack roll) by their flags', () => {
    expect(looseKind({ k: 'shot', target: null, warning: true })).toBe('warning');
    expect(looseKind({ k: 'shot', target: null, rout: true })).toBe('rout');
    expect(looseKind({ k: 'shot', target: null, cover: true })).toBe('covering'); // today's Cover Me flag
    expect(looseKind({ k: 'shot', target: null, covering: true })).toBe('covering'); // E12
    expect(looseKind({ k: 'shot', target: null, cover: '4,3' })).toBeNull(); // a tile key: an ordinary shot's cover
    expect(looseKind({ k: 'shot', target: null, flush: true, object: true })).toBe('flush');
    expect(looseKind({ k: 'shot', target: null, flush: true })).toBe('arc');
    expect(looseKind({ k: 'shot', target: 'f1', warning: true })).toBeNull();
  });
  it('the step-down, the parts, the blast tiles, the quiet ends, the materials', () => {
    expect([0, 1].map((i) => stepDown(i, 2))).toEqual([0, 2]);
    expect([0, 1, 2].map((i) => stepDown(i, 3))).toEqual([0, 1, 2]);
    const p = { x: 100, y: 100, s: 40 };
    expect(partPoint(p, 'head').y).toBeLessThan(100); expect(partPoint(p, 'leg').y).toBeGreaterThan(100); expect(partPoint(p, null)).toEqual({ x: 100, y: 100 });
    expect(tilesWithin('5,5', 1)).toHaveLength(9); expect(tilesWithin('5,5', 3)).toHaveLength(12); expect(tilesWithin('0,0', 1)).toHaveLength(4); expect(tilesWithin('5,5', 2)[0]).toBe('5,5');
    expect(quietEnd('replaced')).toBe(true); expect(quietEnd('fired')).toBe(true); expect(quietEnd('Smoke grenade')).toBe(false);
    expect(coverMaterial('crate').sound).toBe('hit_wood'); expect(coverMaterial('barrel').sound).toBe('hit_metal'); expect(coverMaterial('low_wall').label).toBe('stone');
    expect(ROUND_WORD.armor_piercing).toBe('AP ROUND');
    expect(EVENTS_FOR_THE_LEAD).toEqual([]); // the ranged engine sends all of E1–E17 now
    expect(EVENTS_SENT).toHaveLength(18);
  });
});

describe('the beats', () => {
  it('a plain technique adds at most ~130 ms; loose rounds and the streams are shorter than a shot', () => {
    expect(rangedBeat(tech('snap_shot') as any)).toBe(180);
    expect(rangedBeat(tech('aimed_shot') as any)).toBeUndefined(); // C's beat
    expect(rangedBeat({ ...shot({ target: null, warning: true }) } as any)).toBe(260);
    expect(rangedBeat({ ...shot({ target: null, object: true, flush: true }) } as any)).toBe(270);
    expect(rangedBeat({ k: 'bead_end', n: n(), why: 'replaced' } as any)).toBe(0);
    expect(rangedBeat({ k: 'watch_end', n: n(), why: 'Flashbang' } as any)).toBe(80);
    expect(rangedBeat({ k: 'shot', n: n(), ...W, target: 'f1', to: '6,3', hit: true } as any)).toBeUndefined(); // a plain shot: today's
  });
  it('a Mag Dump of 4 rolls plays in well under today\'s 4 × 400 ms, and the beats follow the combat speed', () => {
    setInBattle(true);
    const run = () => { resetRanged(); const evs = [tech('mag_dump', { group: 'press' }), shot(), shot({ hit: false }), shot(), shot({ hit: false })]; const T = combatTempoInfo(); return evs.reduce((a, e) => a + T.beat(e.k, e), 0); };
    setCombatSpeed('fast'); const fast = run();
    setCombatSpeed('normal'); const normal = run();
    expect(fast).toBeLessThan(120 + 4 * 400 - 600);
    expect(normal / fast).toBeCloseTo(1 / 0.85, 2);
  });
});

describe('the effects', () => {
  it('every ranged scenario plays without a warning and leaves nothing behind', () => {
    const layer = grid();
    const warn = vi.spyOn(console, 'warn');
    const batches: any[][] = [
      [tech('aimed_shot'), shot()], [tech('snap_shot'), shot()],
      [tech('burst'), { k: 'volley', n: n(), ...W, target: 'f1', to: '6,3', mode: 'burst', shots: 3 }, shot({ chain: true }), shot({ chain: true, hit: false }), shot({ chain: true })],
      [tech('called_shot', { opt: 'head' }), shot(), { k: 'cond', n: n(), target: 'f1', at: '6,3', id: 'dazed' }],
      [tech('walking_fire', { tile: '2,3' }), shot()],
      [tech('punch_through'), shot(), { k: 'object', n: n(), at: '4,3', what: 'crate', dmg: 12, broken: false, hp: 18 }, { k: 'hurt', n: n(), target: 'f2', at: '7,4', dmg: 6, why: 'weapon' }],
      [tech('lob', { tile: '6,3', target: null }), { k: 'shot', n: n(), ...W, weapon: 'frag_grenade', cat: 'thrown', target: null, to: '6,3', hit: true, object: true, technique: 'lob' }, { k: 'explode', n: n(), at: '6,3', radius: 2, what: 'frag_grenade' }],
      [tech('suppress'), shot({ dmg: 4 }), { k: 'pressure', n: n(), unit: 'f1', at: '6,3', now: 2, was: 0, state: 'pressed', by: 'pc-a', why: 'Suppress' }],
      [tech('rake'), shot(), shot({ target: 'f2', to: '7,4', hit: false }), shot({ target: 'f3', to: '6,5' })],
      [tech('warning_shot'), shot({ target: null, hit: false, dmg: 0, warning: true })],
      [tech('flush'), shot({ target: null, to: '4,3', hit: false, object: true, flush: true }), { k: 'object', n: n(), at: '4,3', what: 'crate', dmg: 10, hp: 8 }],
      [tech('flush'), shot({ target: null, hit: false, flush: true }), { k: 'hurt', n: n(), target: 'f1', at: '6,3', dmg: 4, why: 'weapon', by: 'pc-a' }],
      [tech('mag_dump'), shot(), shot({ hit: false }), shot(), { k: 'heat', n: n(), unit: 'pc-a', at: '1,3', now: 7, was: 3, why: 'dump', limit: 8 }],
      [shot({ unit: 'f3', from: '6,5' }), tech('crossfire'), shot()],
      [tech('bead'), { k: 'bead', n: n(), unit: 'pc-a', at: '1,3', target: 'f1', to: '6,3' }], [{ k: 'bead_end', n: n(), unit: 'pc-a', at: '1,3', target: 'f1', why: 'moved' }],
      [tech('spot'), { k: 'spot', n: n(), unit: 'pc-a', at: '1,3', target: 'f1', to: '6,3', only: 'pc', hidden: true }],
      [tech('brace'), { k: 'stance', n: n(), unit: 'pc-a', at: '1,3', what: 'brace' }],
      [tech('load_special'), { k: 'load', n: n(), unit: 'pc-a', at: '1,3', rounds: 1, special: 'armor_piercing', dur: 400 }, shot()],
      [tech('shift', { tile: '2,4' }), { k: 'move', n: n(), unit: 'pc-a', from: '1,3', to: '2,4', path: ['1,3', '2,4'] }],
      [tech('vent'), { k: 'heat', n: n(), unit: 'pc-a', at: '1,3', now: 2, was: 6, why: 'vent' }],
      [tech('head_down'), { k: 'watch_end', n: n(), unit: 'pc-a', at: '1,3', id: 'overwatch', why: 'head down' }],
      [tech('dead_centre', { group: 'take' }), shot({ dmg: 22 })],
      [tech('pin_down', { group: 'take' }), shot(), { k: 'stopped', n: n(), unit: 'f1', how: 'pinned', by: 'pc-a' }],
      [tech('rout', { group: 'take' }), shot({ target: null, hit: false, rout: true }), { k: 'move', n: n(), unit: 'f1', from: '6,3', to: '8,3', path: ['6,3', '7,3', '8,3'] }],
      [tech('stopping_shot', { group: 'take' }), shot(), { k: 'stopped', n: n(), unit: 'f1', how: 'push+prone', by: 'pc-a' }],
      [tech('storm', { group: 'take' }), { k: 'move', n: n(), unit: 'pc-a', from: '1,3', to: '3,3', path: ['1,3', '2,3', '3,3'] }, shot()],
      [tech('last_round', { group: 'take' }), shot({ killed: true })],
      [{ k: 'watch_set', n: n(), unit: 'pc-a', at: '1,3', id: 'overwatch', trigger: 'moves' }], [{ k: 'watch_set', n: n(), unit: 'pc-a', at: '1,3', id: 'deny', tile: '4,3', tiles: ['4,2', '4,3', '4,4'] }],
      [{ k: 'watch_set', n: n(), unit: 'pc-a', at: '1,3', id: 'cover_me', allyId: 'f3' }, { k: 'watch_fire', n: n(), unit: 'pc-a', target: 'f1', from: '1,3', at: '6,3', id: 'cover_me' }, shot({ target: null, hit: false, cover: true })],
      [{ k: 'watch_set', n: n(), unit: 'pc-a', at: '1,3', id: 'dead_to_rights', targetId: 'f1' }, { k: 'watch_fire', n: n(), unit: 'pc-a', target: 'f1', from: '1,3', at: '6,3', id: 'dead_to_rights', why: 'reloads' }, shot()],
      [{ k: 'shot', n: n(), ...W, weapon: 'smoke_grenade', cat: 'thrown', target: null, to: '6,3', hit: true, object: true, technique: 'lob' }, { k: 'explode', n: n(), at: '6,3', radius: 3, what: 'smoke_grenade' }, { k: 'watch_end', n: n(), unit: 'f1', at: '6,3', id: 'overwatch', why: 'Smoke grenade' }],
      [{ k: 'explode', n: n(), at: '6,3', radius: 2, what: 'flashbang' }], [{ k: 'explode', n: n(), at: '6,3', radius: 2, what: 'bot_scrambler' }],
      [{ k: 'save', n: n(), unit: 'f1', at: '6,3', ok: true, tech: 'warning_shot' }, { k: 'lane', n: n(), unit: 'pc-a', at: '6,3', r: 3 }, { k: 'free_reload', n: n(), unit: 'pc-a', at: '1,3' }, { k: 'routed', n: n(), unit: 'f1', from: '6,3', to: '8,3' }, { k: 'carry', n: n(), unit: 'pc-a', from: '6,3', to: '7,4', target: 'f2' }, { k: 'swap_in', n: n(), unit: 'pc-a', at: '1,3' }],
    ];
    for (const b of batches) { queueFx(b as any); vi.advanceTimersByTime(4000); }
    expect(warn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(12000);
    expect(layer.childElementCount).toBe(0);
  });
  it('a warning shot misses on purpose: a tracer over the head, never the word MISS', () => {
    const layer = grid();
    const ft = vi.spyOn(sfxMod, 'sfx');
    playFx(tech('warning_shot')); playFx(shot({ target: null, hit: false, dmg: 0, warning: true }));
    vi.advanceTimersByTime(200);
    expect(rfx(layer, 'over')).toBe(1);
    vi.advanceTimersByTime(400);
    expect(text(layer)).not.toMatch(/MISS/);
    expect(ft.mock.calls.some((c) => c[0] === 'whiz')).toBe(true);
  });
  it('Punch Through bursts the cover on the way through (debris, crack, COVER −12) and carries on (Heavy)', () => {
    const layer = grid();
    queueFx([tech('punch_through'), shot(), { k: 'object', n: n(), at: '4,3', what: 'crate', dmg: 12, broken: false, hp: 18 }, { k: 'hurt', n: n(), target: 'f2', at: '7,4', dmg: 6, why: 'weapon' }] as any);
    vi.advanceTimersByTime(260);
    expect(rfx(layer, 'debris')).toBe(4); expect(rfx(layer, 'chips')).toBe(2); expect(rfx(layer, 'crack')).toBe(1);
    vi.advanceTimersByTime(600);
    expect(text(layer)).toMatch(/COVER −12/);
    expect(rfx(layer, 'debris')).toBe(0); // the object event doesn't throw it twice
  });
  it('the Rake sweeps across its targets; the Mag Dump streams and ends with the dry click and its Heat', () => {
    const layer = grid();
    const s = vi.spyOn(sfxMod, 'sfx');
    queueFx([tech('rake'), shot(), shot({ target: 'f2', to: '7,4' }), shot({ target: 'f3', to: '6,5' })] as any);
    vi.advanceTimersByTime(200);
    expect(rfx(layer, 'sweep')).toBe(1);
    expect(s.mock.calls.some((c) => c[0] === 'auto_rifle')).toBe(true); // one recording for the run
    vi.advanceTimersByTime(3000); s.mockClear();
    queueFx([tech('mag_dump'), shot(), shot(), shot(), shot(), { k: 'heat', n: n(), unit: 'pc-a', at: '1,3', now: 7, was: 3, why: 'dump', limit: 8 }] as any);
    vi.advanceTimersByTime(1400);
    expect(s.mock.calls.filter((c) => c[0] === 'brass').length).toBeGreaterThan(0);
    expect(s.mock.calls.some((c) => c[0] === 'dry_click')).toBe(true);
    expect(s.mock.calls.filter((c) => c[0] === 'gun_rifle').length).toBe(0); // the rolls are silent under the recording
    expect(text(layer)).toMatch(/HEAT 7\/8/);
  });
  it('Sets and Watches: the bead held and lost, the spot, the lane, the watch broken by smoke; quiet ends say nothing', () => {
    const layer = grid();
    playFx({ k: 'bead', n: n(), unit: 'pc-a', at: '1,3', target: 'f1', to: '6,3' } as any);
    expect(text(layer)).toMatch(/SIGHTS HELD/);
    vi.advanceTimersByTime(3000);
    playFx({ k: 'bead_end', n: n(), unit: 'pc-a', at: '1,3', target: 'f1', why: 'replaced' } as any); expect(layer.childElementCount).toBe(0);
    playFx({ k: 'bead_end', n: n(), unit: 'pc-a', at: '1,3', target: 'f1', why: 'Flashbang' } as any); vi.advanceTimersByTime(50); expect(text(layer)).toMatch(/BEAD LOST · FLASHBANG/);
    vi.advanceTimersByTime(3000);
    playFx({ k: 'spot', n: n(), unit: 'pc-a', at: '1,3', target: 'f1', to: '6,3' } as any); expect(rfx(layer, 'pin')).toBe(1); expect(text(layer)).toMatch(/SPOTTED/);
    playFx({ k: 'lane', n: n(), unit: 'pc-a', at: '6,3', r: 3 } as any); expect(rfx(layer, 'lane')).toBe(1); expect(text(layer)).toMatch(/LANE HELD/);
    vi.advanceTimersByTime(3000);
    playFx({ k: 'watch_end', n: n(), unit: 'pc-a', at: '1,3', id: 'deny', why: 'fired' } as any); expect(layer.childElementCount).toBe(0);
    playFx({ k: 'watch_end', n: n(), unit: 'pc-a', at: '1,3', id: 'deny', why: 'Smoke grenade' } as any); vi.advanceTimersByTime(50);
    expect(rfx(layer, 'break')).toBe(2); expect(text(layer)).toMatch(/WATCH LOST · SMOKE GRENADE/);
    vi.advanceTimersByTime(3000);
    playFx({ k: 'watch_set', n: n(), unit: 'pc-a', at: '1,3', id: 'deny', tile: '4,3', tiles: ['4,2', '4,3', '4,4'] } as any); vi.advanceTimersByTime(200);
    expect(rfx(layer, 'hatch')).toBe(3);
  });
  it('a grenade lands as what it is: smoke clouds the radius, not a fireball', () => {
    const layer = grid();
    playFx({ k: 'explode', n: n(), at: '6,3', radius: 1, what: 'smoke_grenade' } as any);
    vi.advanceTimersByTime(400);
    const masks = [...layer.querySelectorAll('img, div')].map((x) => (x as HTMLImageElement).src || (x as HTMLElement).style?.cssText || '').join(' ');
    expect(masks).toMatch(/puff/); expect(masks).not.toMatch(/boom_/);
  });
  it('nothing throws on a missing field', () => {
    grid();
    const warn = vi.spyOn(console, 'warn');
    for (const k of ['technique', 'shot', 'volley', 'object', 'explode', 'stance', 'load', 'heat', 'bead', 'bead_end', 'spot', 'watch_set', 'watch_fire', 'watch_end', 'stopped', 'pressure', 'hurt', 'cond', 'move', 'save', 'lane', 'lane_end', 'free_reload', 'routed', 'carry', 'swap_in']) {
      playFx({ k } as any); playFx({ k, n: n(), unit: 'pc-a' } as any); playFx({ k, n: n(), unit: 'nobody', system: 'ranged', id: 'mag_dump', why: 'x', ok: true } as any);
    }
    tagOf(tech('punch_through')); playFx({ k: 'hurt', n: n(), why: 'weapon' } as any); playFx({ k: 'shot', n: n(), unit: 'pc-a' } as any);
    vi.advanceTimersByTime(5000);
    expect(warn).not.toHaveBeenCalled();
    expect(rangedBeat(null as any)).toBeUndefined();
  });
});

// ---------- the review fixes (Physical 2.0 B fx review, 10 Nov 2026) ----------
const boxesWith = (layer: HTMLElement, needle: string) => [...layer.children].filter((b) => (b as HTMLElement).innerHTML.includes(needle)) as HTMLElement[];
const boxOfText = (layer: HTMLElement, t: string) => ([...layer.children] as HTMLElement[]).find((b) => b.textContent === t) || null;
/** Advance ms in 25 ms steps: did the layer's text ever match (a word that came and went counts)? */
const ever = (layer: HTMLElement, re: RegExp, ms: number) => { let hit = false; for (let t = 0; t < ms; t += 25) { vi.advanceTimersByTime(25); if (re.test(text(layer))) hit = true; } return hit; };
const cx = (b: HTMLElement) => parseFloat(b.style.left) + parseFloat(b.style.width) / 2;
const cy = (b: HTMLElement) => parseFloat(b.style.top) + parseFloat(b.style.height) / 2;

describe('review: a technique\'s record ends with its action', () => {
  it('R1: a Burst of 2 chained rolls, then a plain shot: the shot is not the Burst\'s (no −2, no lift)', () => {
    tagOf(tech('burst')); tagOf(shot({ chain: true })); tagOf(shot({ chain: true }));
    expect(tagOf(shot())).toBeNull();
    const layer = grid();
    queueFx([tech('burst'), shot({ chain: true }), shot({ chain: true })] as any); vi.advanceTimersByTime(3000);
    const plain = shot(); queueFx([plain] as any);
    expect(ever(layer, /−2/, 1200)).toBe(false);
  });
  it('R1: fewer rolls than the most, then a plain shot in the same batch (an enemy\'s turn): Walking Fire, Mag Dump, Rake', () => {
    tagOf(tech('walking_fire', { tile: '2,3' })); tagOf(shot()); expect(tagOf(shot())).toBeNull(); // 1 roll without Auto
    tagOf(tech('mag_dump', { group: 'press' })); tagOf(shot()); tagOf(shot()); expect(tagOf(shot({ target: 'f2', to: '7,4' }))).toBeNull();
    tagOf(tech('rake', { group: 'press' })); tagOf(shot()); tagOf(shot({ target: 'f2', to: '7,4' })); expect(tagOf(shot())).toBeNull(); // f1 again
    tagOf(tech('mag_dump', { group: 'press' })); tagOf(shot()); tagOf({ k: 'reload', n: n(), unit: 'pc-a', at: '1,3', how: 'mag' }); expect(tagOf(shot())).toBeNull();
    tagOf(tech('rake', { group: 'press' })); tagOf(shot()); tagOf({ k: 'volley', n: n(), ...W, mode: 'burst' }); expect(tagOf(shot({ chain: true }))).toBeNull();
  });
  it('R1: a 2-target Rake, then a plain shot next batch: it keeps its own gunshot (not chained into the Rake\'s stream)', () => {
    const layer = grid();
    queueFx([tech('rake', { group: 'press' }), shot(), shot({ target: 'f2', to: '7,4' })] as any); vi.advanceTimersByTime(3000);
    const s = vi.spyOn(sfxMod, 'sfx');
    const plain = shot(); queueFx([plain] as any); vi.advanceTimersByTime(50);
    expect(tagOf(plain)).toBeNull(); expect(rangedBeat(plain as any)).toBeUndefined();
    expect(s.mock.calls.some((c) => /^gun_|rifle/.test(String(c[0])))).toBe(true);
    expect(layer).toBeTruthy();
  });
  it('R2: a Called Shot, then a condition on someone else or from a later action: no part word', () => {
    const layer = grid();
    queueFx([tech('called_shot', { opt: 'head' }), shot({ hit: false }), { k: 'cond', n: n(), target: 'f2', at: '7,4', id: 'dazed' }] as any);
    expect(ever(layer, /HEAD/, 1500)).toBe(false);
    vi.advanceTimersByTime(3000);
    queueFx([{ k: 'cond', n: n(), target: 'f1', at: '6,3', id: 'slowed' }] as any);
    expect(ever(layer, /LEG|HEAD/, 1200)).toBe(false);
    const c = tech('called_shot'); tagOf(c); tagOf(shot()); tagOf({ k: 'cond', n: n(), target: 'f2', at: '7,4', id: 'slowed' });
    expect(partOf(tagOf(c))).toBeNull();
  });
  it('R2/R8: object damage from a later action, a melee blow or a blast is not ranged cover debris', () => {
    const layer = grid();
    queueFx([tech('flush'), shot({ target: null, to: '4,3', hit: false, object: true, flush: true }), { k: 'object', n: n(), at: '4,3', what: 'crate', dmg: 10, hp: 8 }] as any);
    vi.advanceTimersByTime(3000);
    queueFx([{ k: 'melee', n: n(), unit: 'pc-a', from: '1,3', to: '2,3', target: null, hit: true }, { k: 'object', n: n(), at: '2,3', what: 'crate', dmg: 6, hp: 4 }] as any);
    let deb = 0; for (let t = 0; t < 900; t += 25) { vi.advanceTimersByTime(25); deb += rfx(layer, 'debris'); }
    expect(deb).toBe(0); vi.advanceTimersByTime(100); expect(text(layer)).not.toMatch(/COVER −6/);
    vi.advanceTimersByTime(3000);
    queueFx([tech('lob', { tile: '6,3', target: null }), { k: 'shot', n: n(), ...W, weapon: 'frag_grenade', cat: 'thrown', target: null, to: '6,3', hit: true, object: true, technique: 'lob' }, { k: 'explode', n: n(), at: '6,3', radius: 2, what: 'frag_grenade' }, { k: 'object', n: n(), at: '5,3', what: 'crate', dmg: 9, hp: 9 }, { k: 'object', n: n(), at: '7,3', what: 'crate', dmg: 9, hp: 9 }] as any);
    expect(ever(layer, /COVER −9/, 2500)).toBe(false);
  });
  it('R3: a loaded round stays chambered through a Press; the next Fire\'s first shot fires it', () => {
    const layer = grid();
    queueFx([tech('load_special', { group: 'set' }), { k: 'load', n: n(), unit: 'pc-a', at: '1,3', rounds: 1, special: 'incendiary', dur: 400 }] as any); vi.advanceTimersByTime(3000);
    queueFx([tech('suppress', { group: 'press' }), shot({ dmg: 4 })] as any);
    expect(ever(layer, /INCENDIARY/, 1500)).toBe(false);
    vi.advanceTimersByTime(3000);
    queueFx([shot()] as any); expect(ever(layer, /INCENDIARY/, 1500)).toBe(false); // a plain shot
    vi.advanceTimersByTime(3000);
    queueFx([tech('snap_shot', { hand: 'off' }), shot()] as any); expect(ever(layer, /INCENDIARY/, 1500)).toBe(false); // the other hand
    vi.advanceTimersByTime(3000);
    queueFx([tech('snap_shot'), shot()] as any); vi.advanceTimersByTime(700); expect(text(layer)).toMatch(/INCENDIARY/);
  });
  it('R4: a melee opener\'s push gets nothing from the ranged lane; Stopping Shot shows the AP the engine sends', () => {
    const layer = grid();
    queueFx([{ k: 'technique', n: n(), unit: 'pc-a', id: 'heavy_opener', group: 'opener', system: 'melee', target: 'f1', at: '1,3' }, { k: 'stopped', n: n(), unit: 'f1', how: 'push', by: 'pc-a' }] as any);
    let ch = 0, ap = false; for (let t = 0; t < 1000; t += 25) { vi.advanceTimersByTime(25); ch += rfx(layer, 'chevrons'); ap = ap || /AP/.test(text(layer)); }
    expect(ap).toBe(false); expect(ch).toBe(0);
    vi.advanceTimersByTime(3000);
    queueFx([tech('stopping_shot', { group: 'take' }), shot(), { k: 'stopped', n: n(), unit: 'f1', how: 'push', by: 'pc-a', apLoss: 2 }] as any);
    vi.advanceTimersByTime(800); expect(text(layer)).toMatch(/−2 AP/);
  });
  it('R5: a loose round that jams the gun says JAMMED with the dry click', () => {
    const layer = grid(); const s = vi.spyOn(sfxMod, 'sfx');
    playFx(tech('warning_shot')); playFx(shot({ target: null, hit: false, dmg: 0, warning: true, jam: true }));
    vi.advanceTimersByTime(600);
    expect(text(layer)).toMatch(/JAMMED/); expect(s.mock.calls.some((c) => c[0] === 'dry_click')).toBe(true);
    expect(text(layer)).not.toMatch(/MISS/);
  });
  it('R7/RFX-1: a later fight (or the same one started over) never resolves to an earlier fight\'s events', () => {
    grid();
    const a = [{ k: 'technique', n: 5, unit: 'pc-a', id: 'mag_dump', group: 'press', system: 'ranged', target: 'f1', at: '1,3' }, { ...shot(), n: 6 }];
    queueFx(a as any, 'cb|one'); vi.advanceTimersByTime(4000);
    const b = [{ k: 'technique', n: 5, unit: 'pc-a', id: 'shot', group: 'fire', system: 'ranged', target: 'f1', at: '1,3' }, { ...shot(), n: 6 }];
    queueFx(b as any, 'cb|two');
    expect(tagOf(b[0])?.id).toBe('shot'); expect(tagOf(b[1])?.id).toBe('shot');
    expect(rangedBeat({ ...b[1] } as any)).toBeUndefined(); // not Mag Dump's 300
    vi.advanceTimersByTime(4000);
    // the same stream started over: its numbering went back
    const c = [{ k: 'technique', n: 5, unit: 'pc-a', id: 'mag_dump', group: 'press', system: 'ranged', target: 'f1', at: '1,3' }, { ...shot(), n: 6 }];
    queueFx(c as any, 'cb|two'); expect(tagOf(c[1])?.id).toBe('mag_dump');
    vi.advanceTimersByTime(4000);
    // a Storm left open at the fight's end: the next walk on the area map draws no streaks
    queueFx([tech('storm', { group: 'take' })] as any, 'cb|two'); vi.advanceTimersByTime(2000);
    const walk = { k: 'move', n: 3, unit: 'pc-a', from: '1,3', to: '3,3', path: ['1,3', '2,3', '3,3'] };
    queueFx([walk] as any, 'st|X'); expect(tagOf(walk)).toBeNull();
    // clearFx forgets too
    tagOf(tech('mag_dump')); clearFx(); expect(tagOf(shot())).toBeNull();
  });
  it('R6: a Hidden foe on a tile in sight gives nothing away: no lost Watch, no Bead, no Heat at its tile', () => {
    const layer = grid();
    const ar = ARCHETYPES[0];
    const c = newCharacter('a', 'p1', { name: 'Vel', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...ar.preset }, attrs: { ...ar.attributes }, cores: { ...ar.cores }, identity: {} } as any);
    const cb = startCombat('t', 'yard', [{ c, pos: '1,3' }], [{ name: 'Raider', tier: 'minion', weapon: 'service_pistol', at: refOf('6,3') }] as any, 'easy', { state: 4 } as any, []);
    const foe = cb.units.find((u: any) => u.side === 'foe')!; foe.id = 'f1'; foe.pos = '6,3'; (foe as any).hidden = true;
    const evs = [{ k: 'watch_end', n: n(), unit: 'f1', at: '6,3', id: 'overwatch', why: 'Smoke grenade' }, { k: 'bead', n: n(), unit: 'f1', at: '6,3', target: 'pc-a', to: '1,3' }, { k: 'heat', n: n(), unit: 'f1', at: '6,3', now: 2, was: 6, why: 'vent' }];
    // what the player is sent (viewFor's fog, fog.ts): the Hidden foe is not in the view, and its events don't name it
    const seen = fogFight(null, { ...cb, fx: evs } as any, { ...cb, fx: evs } as any, 'pc');
    expect(seen.units.some((u: any) => u.id === 'f1')).toBe(false); expect(JSON.stringify(seen.fx)).not.toContain('f1');
    setContext({ code: 'X', characters: { a: c }, story: { positions: {}, npcs: [] }, combat: seen } as any, 'combat');
    for (const e of seen.fx!) { playFx(e as any); expect(rangedBeat(e as any)).toBe(0); }
    vi.advanceTimersByTime(300);
    expect(rfx(layer, 'break')).toBe(0); expect(rfx(layer, 'heat')).toBe(0); expect(text(layer)).not.toMatch(/WATCH LOST|SIGHTS HELD|HEAT/);
    (foe as any).hidden = false; setContext({ code: 'X', characters: { a: c }, story: { positions: {}, npcs: [] }, combat: cb } as any, 'combat');
    vi.advanceTimersByTime(3000);
    playFx(evs[0] as any); vi.advanceTimersByTime(50); expect(rfx(layer, 'break')).toBe(2); // seen: it shows
  });
  it('R9: Punch Through Heavy: the round carries on into the next in line, and its hurt waits for it', () => {
    const layer = grid();
    const t = tech('punch_through'); tagOf(t); tagOf(shot());
    // (a bullet is not drawn in flight since 13 Nov 2026: the round arrives as its hole in the next one, with the hurt)
    const holes = () => layer.querySelectorAll('[data-tech-fx="hole"]').length;
    const before = holes();
    playFx({ k: 'hurt', n: n(), target: 'f2', at: '7,4', dmg: 6, why: 'weapon' } as any);
    vi.advanceTimersByTime(40); expect(text(layer)).not.toMatch(/6/); expect(holes()).toBe(before);
    vi.advanceTimersByTime(200); expect(text(layer)).toMatch(/6/); expect(holes()).toBe(before + 1);
  });
  it('RFX-2: a plain Shot\'s miss into cover is today\'s (no ranged debris); a technique\'s throws it', () => {
    const layer = grid();
    queueFx([shot({ hit: false, cover: '4,3' })] as any); vi.advanceTimersByTime(500); expect(rfx(layer, 'debris')).toBe(0);
    vi.advanceTimersByTime(3000);
    queueFx([tech('aimed_shot'), shot({ hit: false, cover: '4,3' })] as any); vi.advanceTimersByTime(700); expect(rfx(layer, 'crack')).toBe(1);
  });
});

describe('review: what reads on screen', () => {
  it('F1: the Heat strip\'s segments have height (10px strip, 2px padding and 1px border each side), under the token', () => {
    const layer = grid();
    expect(HEAT_BAR_PX - 2 * 2 - 2 * 1).toBeGreaterThanOrEqual(4);
    playFx({ k: 'heat', n: n(), unit: 'pc-a', at: '1,3', now: 7, was: 3, why: 'dump', limit: 8 } as any);
    const box = layer.querySelector('[data-rfx="heat"]') as HTMLElement; expect(box).toBeTruthy();
    const bar = box.querySelector('[data-phc-heat] > div') as HTMLElement;
    expect(bar.style.height).toBe(HEAT_BAR_PX + 'px'); expect(bar.style.flex).toMatch(/none|0 0 auto/);
    expect((bar.firstElementChild as HTMLElement).style.minHeight).toBe('4px');
    expect(cy(box)).toBeGreaterThan(140 + 20); // below the token (1,3 is centred at y 140; the tile is 40)
    vi.advanceTimersByTime(800);
    expect([...bar.children].filter((x) => /242, 165, 74\)$|#F2A54A|rgb\(242, 165, 74\)/i.test((x as HTMLElement).style.background)).length).toBe(7);
  });
  it('F2: Snap Shot\'s arc is drawn outside the token\'s rim, on an ink under-stroke', () => {
    const layer = grid(); playFx(tech('snap_shot'));
    const box = layer.querySelector('[data-rfx="snap"]') as HTMLElement;
    expect(parseFloat(box.style.width)).toBeCloseTo(40 * SNAP_ARC, 0);
    expect((16 / 40) * SNAP_ARC).toBeGreaterThan(0.6); // the arc's radius in tiles, past the rim at 0.5
    expect(box.querySelectorAll('path')).toHaveLength(2);
  });
  it('F3: an incendiary round\'s trail is flame big enough to read (≥ 0.7 of a tile) along the shot', () => {
    const layer = grid();
    playFx({ k: 'load', n: n(), unit: 'pc-a', at: '1,3', rounds: 1, special: 'incendiary', dur: 400 } as any);
    tagOf(tech('snap_shot')); playFx(shot());
    vi.advanceTimersByTime(260);
    const fl = boxesWith(layer, '/fx/flame.png'); expect(fl.length).toBeGreaterThan(0);
    for (const b of fl) expect(parseFloat(b.style.width)).toBeGreaterThanOrEqual(28);
  });
  it('F4: a warning shot\'s near miss reads: a 2.4px over-head stroke on an ink stroke, and a light dust kick', () => {
    const layer = grid();
    playFx(tech('warning_shot')); playFx(shot({ target: null, hit: false, dmg: 0, warning: true }));
    vi.advanceTimersByTime(200);
    const over = layer.querySelector('[data-rfx="over"]') as HTMLElement; const lines = over.querySelectorAll('line');
    expect(lines).toHaveLength(2); expect(lines[1].getAttribute('stroke-width')).toBe('2.4');
    vi.advanceTimersByTime(150);
    const kicks = boxesWith(layer, '/fx/dust.png'); expect(kicks.length).toBeGreaterThan(0);
    expect(parseFloat(kicks[0].style.width)).toBeGreaterThanOrEqual(28);
  });
  it('F5: the Called Shot\'s part word sits beside the token, out of the damage number\'s lane', () => {
    const layer = grid();
    tagOf(tech('called_shot', { opt: 'head' })); playFx(shot());
    playFx({ k: 'cond', n: n(), target: 'f1', at: '6,3', id: 'dazed' } as any); vi.advanceTimersByTime(120);
    const w = boxOfText(layer, 'HEAD')!; expect(w).toBeTruthy();
    expect(cx(w) - 260).toBeGreaterThanOrEqual(36); // the token's centre is x 260
  });
  it('F6/F9/F8: the loaded round and the Bead say their own word on the chip lane; Last Round leaves C\'s name alone', () => {
    const layer = grid();
    playFx({ k: 'load', n: n(), unit: 'pc-a', at: '1,3', rounds: 1, special: 'incendiary', dur: 400 } as any);
    const chip = layer.querySelector('[data-phc-tag="INCENDIARY"]'); expect(chip).toBeTruthy();
    expect(cy(chip!.parentElement as HTMLElement)).toBeGreaterThan(140 + 20); // under the token, clear of C's name and the LOAD ring above
    vi.advanceTimersByTime(3000);
    playFx({ k: 'bead', n: n(), unit: 'pc-a', at: '1,3', target: 'f1', to: '6,3' } as any);
    expect(layer.querySelector('[data-phc-tag="SIGHTS HELD"]')).toBeTruthy(); expect(layer.querySelector('[data-phc-tag="BEAD"]')).toBeNull();
    vi.advanceTimersByTime(3000);
    tagOf(tech('last_round', { group: 'take' })); playFx(shot({ killed: true })); vi.advanceTimersByTime(700);
    expect(text(layer)).not.toMatch(/LAST ROUND/); expect(text(layer)).toMatch(/FREE RELOAD/);
  });
  it('F7: Head Down drops its Watch quietly (C already names it)', () => {
    const layer = grid();
    playFx({ k: 'watch_end', n: n(), unit: 'pc-a', at: '1,3', id: 'overwatch', why: 'head down' } as any); vi.advanceTimersByTime(50);
    expect(rfx(layer, 'break')).toBe(0); expect(text(layer)).not.toMatch(/WATCH LOST/);
    expect(quietEnd('head down')).toBe(true);
  });
  it('F10/F11: the vent puffs rise above the token; Brace\'s feet are planted below its HP bar', () => {
    const layer = grid();
    playFx({ k: 'heat', n: n(), unit: 'pc-a', at: '1,3', now: 2, was: 6, why: 'vent' } as any); vi.advanceTimersByTime(250);
    const puffs = boxesWith(layer, '/fx/puff.webp'); expect(puffs.length).toBe(3);
    for (const b of puffs) expect(cy(b)).toBeLessThan(140 - 20);
    vi.advanceTimersByTime(3000);
    playFx({ k: 'stance', n: n(), unit: 'pc-a', at: '1,3', what: 'brace' } as any);
    const feet = [...layer.querySelectorAll('[data-rfx="line"]')] as HTMLElement[]; expect(feet).toHaveLength(2);
    for (const b of feet) expect(cy(b)).toBeGreaterThan(140 + 20);
  });
  it('F12: a Burst\'s step-down reads in white, not the muted failure grey', () => {
    const layer = grid();
    tagOf(tech('burst')); playFx(shot({ chain: true })); playFx(shot({ chain: true }));
    const w = boxOfText(layer, '−2')!; expect(w).toBeTruthy();
    expect((w.firstElementChild as HTMLElement).style.color).toMatch(/255, 255, 255|#FFFFFF/i);
  });
  it('F13: a Flush round bursts the cover as it lands, not a beat later; the target flinches', () => {
    const layer = grid();
    const t = tech('flush'), s = shot({ target: null, to: '4,3', hit: false, object: true, flush: true }), o = { k: 'object', n: n(), at: '4,3', what: 'crate', dmg: 10, hp: 8 };
    rangedBatch([t, s, o] as any);
    playFx(t); playFx(s); vi.advanceTimersByTime(260);
    expect(rfx(layer, 'debris')).toBe(8); // the burst and the heavier second one, before the object event plays
    playFx(o); vi.advanceTimersByTime(20); expect(rfx(layer, 'debris')).toBe(8); // which only says the damage
  });
  it('F14: a smoke cloud covers its whole radius box (corners and edges), with fewer, larger puffs', () => {
    const r2 = smokeTiles('5,5', 2); for (const k of ['3,3', '7,7', '3,7', '7,3', '5,3', '3,5']) expect(r2).toContain(k);
    expect(r2.length).toBeLessThanOrEqual(9); expect(r2[0]).toBe('5,5');
    const r3 = smokeTiles('5,5', 3); for (const k of ['2,2', '8,8', '2,8', '8,2']) expect(r3).toContain(k);
    expect(r3.length).toBeLessThanOrEqual(16);
    expect(smokeTiles('5,5', 1)).toHaveLength(9);
  });
});

describe('the new assets are on disk and credited', () => {
  it('the cover debris frames (Cethiel, CC0) and the brass tinkle (Kenney, CC0)', () => {
    for (const f of ['debris_1', 'debris_2', 'debris_3', 'debris_4', 'debris_chips_1', 'debris_chips_2']) expect(existsSync(resolve(PUBLIC, 'fx', f + '.png')), f).toBe(true);
    const deb = FX_CREDITS.find((c) => /Earth Impact/.test(c.what));
    expect(deb?.who).toBe('Cethiel'); expect(deb?.licence).toBe('CC0'); expect(deb?.url).toMatch(/^https:\/\/opengameart\.org\//);
    const files = SFX_FILES.brass as string[]; expect(files).toHaveLength(2);
    for (const f of files) expect(existsSync(resolve(PUBLIC, f.slice(1))), f).toBe(true);
    const br = SFX_CREDITS.find((c) => /impactMetal_light/.test(c.what));
    expect(br?.licence).toBe('CC0'); expect(br?.url).toMatch(/kenney\.nl/);
  });
});

// ---------- keyed on the engine's events (claude/physical-2.0-B-ranged, E1–E17) ----------
/** A technique event as the ranged engine sends it (E1: weapon, line, opt, ammo). */
const etech = (id: string, extra: Record<string, unknown> = {}) => tech(id, { weapon: W.weapon, line: null, opt: null, ammo: null, ...extra });
describe('the engine\'s events', () => {
  it('E1/E1a: a technique from the ranged engine owns only the shots that carry its `tech`; a plain shot after it is another action', () => {
    tagOf(etech('mag_dump', { group: 'press' }));
    expect(tagOf(shot({ tech: 'mag_dump', vi: 0, chain: true }))?.id).toBe('mag_dump');
    expect(tagOf(shot())).toBeNull(); // no `tech`: not the dump's, even within its rolls
    tagOf(etech('burst')); const s1 = shot({ tech: 'burst', vi: 0 }), s2 = shot({ tech: 'burst', vi: 1, chain: true });
    tagOf(s1); tagOf(s2);
    expect(rangedBeat(s2 as any)).toBeUndefined(); // the burst's beat is C's/the base's
    tagOf(tech('burst')); expect(tagOf(shot())?.id).toBe('burst'); // an older replay (no `weapon`): the guess stays
  });
  it('E2: Snap Shot\'s draw comes before its technique and is drawn toward its target', () => {
    const layer = grid();
    const sw = { k: 'swap_in', n: n(), unit: 'pc-a', at: '1,3', weapon: W.weapon, from: 'pack', tech: 'snap_shot' };
    queueFx([sw, etech('snap_shot'), shot({ tech: 'snap_shot', vi: 0 })] as any);
    expect(tagOf(sw)?.id).toBe('snap_shot'); expect(tagOf(sw)?.target).toBe('f1');
    vi.advanceTimersByTime(12000);
    expect(layer.childElementCount).toBe(0);
  });
  it('E4: the Mag Dump\'s volley sets the stream\'s rounds; the Rake\'s targets give the sweep; one recording', () => {
    const layer = grid();
    const s = vi.spyOn(sfxMod, 'sfx');
    const vol = { k: 'volley', n: n(), ...W, target: 'f1', to: '6,3', mode: 'dump', shots: 12, rolls: 4, tech: 'mag_dump' };
    queueFx([etech('mag_dump', { group: 'press' }), vol, shot({ tech: 'mag_dump', vi: 0, chain: true }), shot({ tech: 'mag_dump', vi: 1, chain: true, hit: false }),
      { k: 'heat', n: n(), unit: 'pc-a', at: '1,3', now: 7, was: 3, why: 'dump', limit: 8 }] as any);
    expect(tagOf(vol)?.volleys).toHaveLength(1);
    vi.advanceTimersByTime(1400);
    expect(s.mock.calls.filter((c) => c[0] === 'auto_rifle').length).toBe(1); // the volley's recording, not a made-up one too
    expect(s.mock.calls.some((c) => c[0] === 'dry_click')).toBe(true);
    expect(text(layer)).toMatch(/HEAT 7\/8/);
    vi.advanceTimersByTime(3000);
    const rv = { k: 'volley', n: n(), ...W, target: 'f1', to: '6,3', mode: 'rake', shots: 6, targets: ['f1', 'f2', 'f3'], tech: 'rake' };
    queueFx([etech('rake', { group: 'press' }), rv, shot({ tech: 'rake', vi: 0, chain: true })] as any); // one roll so far: the sweep still crosses all three
    vi.advanceTimersByTime(450);
    expect(rfx(layer, 'sweep')).toBe(1);
  });
  it('E9/E16: a Load Special from the engine keeps nothing pending; the shot\'s `round` shows it once, and the next Fire is standard', () => {
    const layer = grid();
    queueFx([etech('load_special', { group: 'set' }), { k: 'load', n: n(), unit: 'pc-a', at: '1,3', rounds: 1, special: 'incendiary', dur: 400, weapon: W.weapon, hand: 'main' }] as any);
    vi.advanceTimersByTime(3000);
    queueFx([etech('aimed_shot'), shot({ tech: 'aimed_shot', vi: 0, round: 'incendiary' })] as any);
    expect(ever(layer, /INCENDIARY/, 1500)).toBe(true);
    vi.advanceTimersByTime(3000);
    queueFx([etech('aimed_shot'), shot({ tech: 'aimed_shot', vi: 0 })] as any);
    expect(ever(layer, /INCENDIARY/, 1500)).toBe(false);
  });
  it('E11: Last Round\'s free reload chip comes from the event, once', () => {
    const layer = grid();
    queueFx([etech('last_round', { group: 'take' }), shot({ tech: 'last_round', vi: 0, killed: true }), { k: 'free_reload', n: n(), unit: 'pc-a', at: '1,3', tech: 'last_round' }] as any);
    let most = 0; for (let t = 0; t < 2000; t += 25) { vi.advanceTimersByTime(25); most = Math.max(most, (text(layer).match(/FREE RELOAD/g) || []).length); }
    expect(most).toBe(1);
  });
});
