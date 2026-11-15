// @vitest-environment jsdom
// Guard 2.0, slice 1 (fx/guard.ts; rules 1.56 Guard 2.0, item 4300): the engine's 'guard' events, taken from a real
// fight through the reducer (Brace, then the foe's own turn shooting into the Guard), map to the plates' moments and
// play through play.ts's real handler; the standing layer draws the plates from the saved state (one copy, with the
// stance's arc).
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { refOf } from '@engine';
import { physFight, rig } from '../../../../../packages/engine/test/helpers/physfight';
import { setLayer, slow } from './dom';
import { playFx, setContext, clearFx } from './play';
import { guardFxOf, guardBeat, guardWord, platesMarkup, guardMarkup, GUARD_MS, guardMoveWord, GUARD_MOVE_MS } from './guard';
import { rowKey } from './techniqueFx';
import { resolveAttack } from '@engine';
import { meleeMarksOf } from './melee-techniques';

function grid(w = 8, h = 6) {
  const root = document.createElement('div'); document.body.appendChild(root);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = document.createElement('button'); b.className = 'phc-tok'; b.setAttribute('aria-label', refOf(x + ',' + y) + ' · open');
    (b as any).getBoundingClientRect = () => ({ left: x * 40, top: y * 40, width: 40, height: 40, right: x * 40 + 40, bottom: y * 40 + 40 });
    root.appendChild(b);
  }
  const layer = document.createElement('div'); document.body.appendChild(layer); setLayer(layer);
  return { root, layer };
}
const PC = { id: 'pc-c1', charId: 'c1', side: 'pc', name: 'Tank', pos: '1,1', hp: 100, maxHp: 100, res: { guard: 3 }, resMax: { guard: 5 } };
const game = (units: any[]) => ({ code: 'X', characters: {}, story: { positions: {}, npcs: [] }, combat: { name: 'F', round: 1, units, order: units.map((u) => u.id), turn: 0, log: [], fx: [], map: { w: 8, h: 6 } } } as any);
const traces = () => ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'guard').map((t) => t.what);
const words = () => ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'float').map((t) => t.text);

describe('Guard on the fight map', () => {
  let g: { root: HTMLElement; layer: HTMLElement };
  beforeEach(() => { vi.useFakeTimers(); g = grid(); (window as any).__phcFxTrace = []; });
  afterEach(() => { clearFx(); vi.useRealTimers(); g.root.remove(); g.layer.remove(); delete (window as any).__phcFxTrace; });

  it('each moment from the event alone: gain, soak, pressure, spend, broken; anything else is none', () => {
    expect(guardFxOf({ k: 'guard', was: 0, now: 2, why: 'gain' })).toBe('gain');
    expect(guardFxOf({ k: 'guard', was: 4, now: 2, why: 'soak', soaked: 20 })).toBe('soak');
    expect(guardFxOf({ k: 'guard', was: 2, now: 0, why: 'soak', soaked: 20 })).toBe('broken');
    expect(guardFxOf({ k: 'guard', was: 2, now: 0, why: 'pressure' })).toBe('broken');
    expect(guardFxOf({ k: 'guard', was: 2, now: 1, why: 'pressure' })).toBe('pressure');
    expect(guardFxOf({ k: 'guard', was: 2, now: 0, why: 'spend' })).toBe('spend');
    expect(guardFxOf({ k: 'melee', was: 2, now: 0 })).toBeNull();
    expect(guardWord({ k: 'guard', was: 0, now: 2, why: 'gain' })).toBe('+2 GUARD');
    expect(guardWord({ k: 'guard', was: 4, now: 2, why: 'soak', soaked: 17 })).toBe('BLOCKED 17');
    expect(guardWord({ k: 'guard', was: 1, now: 0, why: 'soak', soaked: 10 })).toBe('BLOCKED 10 · GUARD BROKEN');
    expect(guardWord({ k: 'guard', was: 2, now: 0, why: 'spend' })).toBeNull(); // the order that spent it draws its own
    expect(guardBeat({ k: 'guard', was: 0, now: 2, why: 'gain' })).toBe(GUARD_MS.gain);
    expect(guardBeat({ k: 'shot' })).toBeUndefined();
  });

  it('a real fight\'s events (the reducer: Brace, then the foe\'s own turn shoots into the Guard): +N GUARD, then BLOCKED N on the token', () => {
    const f = physFight([{ weapon: 'sabre', skills: { athletics: 4, raw_power: 6, dexterity: 6, durability: 5 } }], [{ tier: 'elite', weapon: 'service_pistol' }]);
    f.cb.objects = []; f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'H5'); foe.hp = foe.maxHp = 900;
    f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1; f.turn(f.pc);
    const me = f.unit(f.pc.id); me.hp = me.maxHp; me.armour = 0;
    f.act({ type: 'combat/brace', unitId: f.pc.id } as any);
    f.unit(f.pc.id).res!.guard = 5; // a full pool (the soak keeps 1 back)
    rig({ hit: true, die: 12 });
    f.act({ type: 'combat/end-turn', unitId: f.pc.id } as any);
    rig(null);
    const evs = ((f.cb as any).fx as any[]).filter((e) => e.k === 'guard' && e.unit === f.pc.id);
    const moments = evs.map((e) => guardFxOf(e));
    expect(moments.slice(0, 2)).toEqual(['gain', 'soak']); // the elite's burst: more blows, Pressure, the last plate breaks
    setContext(f.g as any, 'combat');
    for (const e of evs) { playFx({ ...e, seen: { pc: 1, foe: 1 } } as any); vi.advanceTimersByTime(slow(GUARD_MS.soak) + 900); }
    expect(traces()).toEqual(moments);
    expect(words()).toContain('+2 GUARD'); expect(words()).toContain('BLOCKED ' + evs[1].soaked);
    vi.advanceTimersByTime(3000); expect(g.layer.querySelector('[data-guard-fx]')).toBeNull(); // nothing left behind
  });

  it('the last plate to a blow: the ring breaks, BLOCKED N · GUARD BROKEN', () => {
    setContext(game([PC]), 'combat');
    playFx({ k: 'guard', unit: PC.id, at: PC.pos, max: 5, was: 1, now: 0, why: 'soak', soaked: 9, seen: { pc: 1, foe: 1 }, n: 3 } as any);
    expect(g.layer.querySelector('[data-guard-fx]')).toBeTruthy();
    vi.advanceTimersByTime(3000);
    expect(traces()).toEqual(['broken']); expect(words()).toContain('BLOCKED 9 · GUARD BROKEN');
    vi.advanceTimersByTime(3000); expect(g.layer.querySelector('[data-guard-fx]')).toBeNull();
  });

  it('an unseen unit\'s Guard shows nothing', () => {
    setContext(game([{ ...PC, side: 'foe', id: 'foe-1', pos: '6,4' }]), 'combat');
    // the viewer's side sees nothing there (no seen stamp, a fogged tile): visible() decides
    playFx({ k: 'guard', unit: 'foe-1', at: '6,4', was: 0, now: 2, max: 5, why: 'gain', seen: { pc: 0, foe: 1 }, n: 1 } as any);
    vi.advanceTimersByTime(2000);
    expect(traces()).toEqual([]);
  });

  it('the standing plates: one per Guard point held, the empty slots faint, with the count; the stance arc beside them', () => {
    const m = platesMarkup({ x: 50, y: 50 }, 40, 3, 5);
    expect((m.match(/data-plate=/g) || []).length).toBe(3); expect((m.match(/data-slot=/g) || []).length).toBe(2); expect(m).toContain('⛨3');
    const both = guardMarkup({ x: 50, y: 50 }, 40, [1, 0], { plates: 2, max: 3, heavy: true });
    expect((both.match(/data-plate=/g) || []).length).toBe(2); expect((both.match(/<path /g) || []).length).toBe(2 + 1 + 1 + 1); // 2 plates, 1 slot, the arc, Heavy's arc
    const marks = meleeMarksOf(game([PC, { id: 'x', side: 'pc', pos: '2,2', tech: { guard: { on: true, front: [1, 0] } } }, { id: 'y', side: 'pc', pos: '3,3', res: { guard: 0 }, resMax: { guard: 4 } }]));
    expect(marks.filter((k) => k.kind === 'guard').map((k) => [k.unit, k.plates, k.max, !!k.front])).toEqual([['pc-c1', 3, 5, false], ['x', 0, 0, true]]);
  });
});

describe("Guard 2.0 slice 1: the door's moves on the map (rules 1.56; skills.json durability.1, each op's fx)", () => {
  let g: { root: HTMLElement; layer: HTMLElement };
  beforeEach(() => { vi.useFakeTimers(); g = grid(); (window as any).__phcFxTrace = []; });
  afterEach(() => { clearFx(); vi.useRealTimers(); g.root.remove(); g.layer.remove(); delete (window as any).__phcFxTrace; });
  const moveTraces = () => ((window as any).__phcFxTrace as any[]).filter((t) => t.w === 'guard_move').map((t) => t.move);

  it("each move has its word and its beat; Interpose (a shove marked interpose) plays the tank's own row", () => {
    expect(guardMoveWord({ k: 'guard_move', move: 'crit_turned' })).toBe('CRIT TURNED');
    expect(guardMoveWord({ k: 'guard_move', move: 'retort' })).toBe('RETORT');
    expect(guardBeat({ k: 'guard_move', move: 'slam' })).toBe(GUARD_MOVE_MS.slam);
    expect(rowKey({ k: 'shove', unit: 'a', target: 'b', interpose: true })).toBe('interpose');
    expect(rowKey({ k: 'shove', unit: 'a', target: 'b' })).toBe('move:fighter.shove');
  });

  it("a real fight (the reducer): Slam, Challenge, then a foe's blow turned, answered by Retort: each event plays with its word", () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: [], skills: { durability: 5, dexterity: 0 } }], [{ tier: 'soldier', weapon: 'maul' }, { tier: 'soldier', weapon: 'maul' }]);
    f.cb.objects = []; f.put(f.pc, 'C3'); const [a, b] = f.cb.units.filter((u) => u.side === 'foe');
    f.put(a, 'D3'); f.put(b, 'B3'); for (const u of [a, b]) { const x = f.unit(u.id); x.hp = x.maxHp = 900; }
    f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1; f.turn(f.pc);
    const me = f.unit(f.pc.id); me.hp = me.maxHp; me.armour = 0; me.res!.guard = 5;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'skill:durability.1', actionId: 'guard_slam' } as any);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'skill:durability.1', actionId: 'guard_challenge' } as any);
    const foe = f.unit(a.id); f.put(foe, 'D3'); f.turn(foe); rig({ die: 20 });
    f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(a.id), f.unit(f.pc.id), 'melee', null, { noAp: true })); rig(null);
    const evs = ((f.cb as any).fx as any[]).filter((e) => e.k === 'guard_move');
    expect(evs.map((e) => e.move)).toEqual(['slam', 'challenge', 'crit_turned', 'retort']);
    setContext(f.g as any, 'combat');
    for (const e of evs) { playFx({ ...e, seen: { pc: 1, foe: 1 } } as any); vi.advanceTimersByTime(slow(700) + 900); }
    expect(moveTraces()).toEqual(['slam', 'challenge', 'crit_turned', 'retort']);
    for (const w of ['SLAM', 'CHALLENGE', 'CRIT TURNED', 'RETORT']) expect(words()).toContain(w);
    vi.advanceTimersByTime(3000); expect(g.layer.querySelector('[data-guard-fx]')).toBeNull();
  });
});
