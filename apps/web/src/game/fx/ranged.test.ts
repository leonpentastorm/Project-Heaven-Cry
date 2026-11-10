// @vitest-environment jsdom
// Physical 2.0 B: the ranged techniques' effects (fx/ranged.ts), driven by feeding the events the ranged engine sends
// (claude/physical-2.0-B-ranged: physical/ranged/*.ts, the core's technique / pressure / watch_* / stopped, combat.ts's
// shot / volley / object / explode / hurt). Each effect plays from its events, the beats follow the combat speed, a
// missing field never throws, and every new asset file is credited.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { refOf } from '@engine';
import { setLayer } from './dom';
import { playFx, queueFx, setContext, clearFx, combatTempoInfo } from './play';
import { tagOf, looseKind, stepDown, partOf, tilesWithin, quietEnd, rangedBeat, resetRanged, EVENTS_FOR_THE_LEAD, ROUND_WORD } from './ranged';
import { coverMaterial, partPoint } from './rangedParts';
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
    expect(EVENTS_FOR_THE_LEAD.length).toBeGreaterThan(10);
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
    expect(text(layer)).toMatch(/BEAD/);
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
