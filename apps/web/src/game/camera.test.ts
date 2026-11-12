// The camera's arithmetic (roadmap 2c): what is in frame, where to move, when not to move, the small map, the edge
// arrows and which tiles an effect is about.
import { describe, it, expect } from 'vitest';
import { usualScale, overviewScale, fitsWhole, naturalSize, clampScroll, inFrame, pointOf, frameTiles, aim, mayFollow, glideMs, ease, isDrag, panKey, edgeArrow,
  miniGeom, miniFrame, miniToScroll, fxTiles, movesCamera, HANDS_OFF_MS, HANDS_OFF_OTHERS_MS, GLIDE_MS, MINI_PX, type Hands, type GridAt,
  MOVE, moveMs, planMove, sampleMove, moveState, travel, type Move } from './camera';

const G: GridAt = { ox: 51, oy: 51, pitch: 48 }; // tile 0,0's centre and the pitch of the fight grid at 100%
const BIG = { w: 26 * 48 + 36, h: 26 * 48 + 36 }; // a 26 x 26 map's content
const hands = (o: Partial<Hands> = {}): Hands => ({ dragging: false, overview: false, myTurn: false, pointerOnMap: false, handAt: -1e9, now: 100000, ...o });

describe('the size on screen', () => {
  it('the usual size is what a 16 x 11 map fitted to the room came to, whatever the map', () => {
    const room = [956, 640] as const;
    const z16 = usualScale(room[0], room[1], 16, 11);
    expect(z16).toBe(Math.floor(Math.min(956 / 804, 640 / 564) * 100) / 100);
    expect(usualScale(room[0], room[1], 26, 26)).toBe(z16);
    expect(usualScale(room[0], room[1], 40, 12)).toBe(z16);
  });
  it('a map smaller than 16 x 11 fits whole, bigger than a big one would be drawn', () => {
    expect(usualScale(956, 640, 12, 9)).toBeGreaterThan(usualScale(956, 640, 26, 26));
    expect(fitsWhole(956, 640, 12, 9, usualScale(956, 640, 12, 9))).toBe(true);
    expect(fitsWhole(956, 640, 16, 11, usualScale(956, 640, 16, 11))).toBe(true);
    expect(fitsWhole(956, 640, 26, 26, usualScale(956, 640, 26, 26))).toBe(false);
  });
  it('it stays inside 50% (60% on a narrow window) to 250%', () => {
    expect(usualScale(100, 100, 26, 26)).toBe(0.5);
    expect(usualScale(100, 100, 26, 26, true)).toBe(0.6);
    expect(usualScale(9000, 9000, 26, 26)).toBe(2.5);
  });
  it('the overview fits the whole map and is never bigger than the usual size', () => {
    const z = overviewScale(956, 640, 26, 26), n = naturalSize(26, 26);
    expect(n.w * z).toBeLessThanOrEqual(956); expect(n.h * z).toBeLessThanOrEqual(640);
    expect(z).toBeLessThan(usualScale(956, 640, 26, 26));
    expect(overviewScale(956, 640, 16, 11)).toBe(usualScale(956, 640, 16, 11));
    expect(overviewScale(10, 10, 26, 26)).toBe(0.25);
  });
});

describe('what is in frame', () => {
  const f = { x: 100, y: 200, w: 800, h: 500 };
  it('a point inside is in frame, outside is not, and a margin pulls the edge in', () => {
    expect(inFrame(f, { x: 500, y: 400 })).toBe(true);
    expect(inFrame(f, { x: 99, y: 400 })).toBe(false);
    expect(inFrame(f, { x: 120, y: 400 })).toBe(true);
    expect(inFrame(f, { x: 120, y: 400 }, 48)).toBe(false);
    expect(inFrame(f, { x: 500, y: 701 })).toBe(false);
  });
  it('a tile key becomes its centre in the content', () => {
    expect(pointOf('0,0', G)).toEqual({ x: 51, y: 51 });
    expect(pointOf('25,10', G)).toEqual({ x: 51 + 25 * 48, y: 51 + 10 * 48 });
  });
  it('the tiles on screen: the first and last whose centre shows', () => {
    expect(frameTiles({ x: 0, y: 0, w: 804, h: 564 }, G, 26, 26)).toEqual({ x0: 0, y0: 0, x1: 15, y1: 10 });
    expect(frameTiles({ x: 480, y: 240, w: 804, h: 564 }, G, 26, 26)).toEqual({ x0: 9, y0: 4, x1: 25, y1: 15 });
    expect(frameTiles({ x: 0, y: 0, w: 5000, h: 5000 }, G, 16, 11)).toEqual({ x0: 0, y0: 0, x1: 15, y1: 10 });
  });
  it('the scroll offset stays inside the content', () => {
    expect(clampScroll(-50, 99999, BIG, { w: 800, h: 500 })).toEqual({ x: 0, y: BIG.h - 500 });
    expect(clampScroll(10, 10, { w: 300, h: 300 }, { w: 800, h: 500 })).toEqual({ x: 0, y: 0 });
  });
});

describe('where to move', () => {
  const f = { x: 0, y: 0, w: 800, h: 500 };
  it('stays when the target already shows', () => {
    expect(aim(f, BIG, [pointOf('5,5', G)], 72)).toBeNull();
  });
  it('centres on a target that is off screen', () => {
    const p = pointOf('14,20', G), to = aim(f, BIG, [p], 72)!;
    expect(to).toEqual({ x: Math.round(p.x - 400), y: Math.round(p.y - 250) });
    expect(inFrame({ ...f, ...to }, p, 72)).toBe(true);
  });
  it('keeps the attacker and the target both in frame when they fit, centred between them', () => {
    const a = pointOf('12,12', G), t = pointOf('20,14', G), to = aim(f, BIG, [t, a], 72)!;
    const nf = { ...f, ...to };
    expect(inFrame(nf, a, 72)).toBe(true); expect(inFrame(nf, t, 72)).toBe(true);
    expect(to.x).toBe(Math.round((a.x + t.x) / 2 - 400));
  });
  it('shows the target alone when the two are too far apart to fit', () => {
    const a = pointOf('1,1', G), t = pointOf('24,24', G), to = aim(f, BIG, [t, a], 72)!;
    const nf = { ...f, ...to };
    expect(inFrame(nf, t, 72)).toBe(true); expect(inFrame(nf, a)).toBe(false);
  });
  it('does not move for an attacker who cannot fit when the target already shows', () => {
    expect(aim(f, BIG, [pointOf('5,5', G), pointOf('24,24', G)], 72)).toBeNull();
  });
  it('a tile on the map\'s own edge is no reason to move once the view is against that edge', () => {
    expect(aim(f, BIG, [pointOf('0,0', G)], 72)).toBeNull();
    const far = { x: BIG.w - 800, y: BIG.h - 500, w: 800, h: 500 };
    expect(aim(far, BIG, [pointOf('25,25', G)], 72)).toBeNull();
  });
  it('force centres even when the tile shows (the jump-back key, your own turn)', () => {
    const p = pointOf('12,8', G), to = aim(f, BIG, [p], 72, true)!;
    expect(to).toEqual({ x: Math.round(p.x - 400), y: Math.round(p.y - 250) });
    expect(aim({ ...f, ...to }, BIG, [p], 72, true)).toBeNull();
  });
  it('nothing to show: no move', () => { expect(aim(f, BIG, [], 72)).toBeNull(); });
});

describe('when not to move', () => {
  it('follows by default', () => { for (const w of ['turn-mine', 'turn', 'beat', 'ask'] as const) expect(mayFollow(hands(), w)).toBe(true); });
  it('never during a drag or in the overview, except when the player asks', () => {
    for (const w of ['turn-mine', 'turn', 'beat'] as const) { expect(mayFollow(hands({ dragging: true }), w)).toBe(false); expect(mayFollow(hands({ overview: true }), w)).toBe(false); }
    expect(mayFollow(hands({ dragging: true }), 'ask')).toBe(true);
  });
  it('on your own turn: not while your pointer is over the map, nor for 4 seconds after you moved the camera', () => {
    expect(mayFollow(hands({ myTurn: true, pointerOnMap: true }), 'beat')).toBe(false);
    expect(mayFollow(hands({ myTurn: true, handAt: 100000 - HANDS_OFF_MS + 1 }), 'beat')).toBe(false);
    expect(mayFollow(hands({ myTurn: true, handAt: 100000 - HANDS_OFF_MS }), 'beat')).toBe(true);
    expect(mayFollow(hands({ myTurn: true, pointerOnMap: true }), 'turn')).toBe(false);
  });
  it('your own turn starting brings the camera back all the same', () => {
    expect(mayFollow(hands({ myTurn: true, pointerOnMap: true, handAt: 99999 }), 'turn-mine')).toBe(true);
  });
  it('on someone else\'s turn a pointer over the map does not hold it; a hand move holds it for a moment only', () => {
    expect(mayFollow(hands({ pointerOnMap: true }), 'beat')).toBe(true);
    expect(mayFollow(hands({ handAt: 100000 - HANDS_OFF_OTHERS_MS + 1 }), 'beat')).toBe(false);
    expect(mayFollow(hands({ handAt: 100000 - HANDS_OFF_OTHERS_MS }), 'beat')).toBe(true);
  });
  it('the plain glide (the floor of a squeezed move) is a quarter of a second at Fast, follows the combat speed, and is a cut under reduced motion', () => {
    expect(glideMs(1)).toBe(GLIDE_MS); expect(GLIDE_MS).toBe(250);
    expect(glideMs(1 / 0.85)).toBe(Math.round(250 / 0.85));
    expect(glideMs(1, true)).toBe(0);
    expect(ease(0)).toBe(0); expect(ease(1)).toBe(1); expect(ease(0.5)).toBeCloseTo(0.5); expect(ease(0.25)).toBeLessThan(0.25);
  });
});

describe('by hand', () => {
  it('a press that moves 6 px or more is a drag, less is a click', () => { expect(isDrag(3, 3)).toBe(false); expect(isDrag(6, 0)).toBe(true); expect(isDrag(-5, -5)).toBe(true); });
  it('the arrows and WASD give a direction; other keys none', () => {
    expect(panKey('ArrowLeft')).toEqual({ x: -1, y: 0 }); expect(panKey('d')).toEqual({ x: 1, y: 0 }); expect(panKey('W')).toEqual({ x: 0, y: -1 }); expect(panKey('s')).toEqual({ x: 0, y: 1 });
    for (const k of ['m', 'Home', 'b', 'h', '1', ' ', 'Enter']) expect(panKey(k)).toBeNull();
  });
});

describe('nothing happens unseen', () => {
  const v = { w: 800, h: 500 };
  it('no arrow for a point on screen', () => { expect(edgeArrow(v, { x: 10, y: 490 })).toBeNull(); });
  it('an arrow on the edge nearest the point, pointing at it', () => {
    const r = edgeArrow(v, { x: 2000, y: 250 })!; expect(r.x).toBe(780); expect(r.y).toBe(250); expect(r.angle).toBeCloseTo(0);
    const u = edgeArrow(v, { x: 400, y: -900 })!; expect(u.y).toBe(20); expect(u.x).toBe(400); expect(u.angle).toBeCloseTo(-Math.PI / 2);
    const d = edgeArrow(v, { x: -300, y: 900 })!; expect(d.x).toBeGreaterThanOrEqual(20); expect(d.y).toBe(480); expect(d.x).toBeLessThan(400);
  });
});

describe('the small map', () => {
  it('is about 150 px on its longest side: under 6 px a tile at 26 x 26', () => {
    const m = miniGeom(26, 26); expect(m.w).toBe(MINI_PX); expect(m.h).toBe(MINI_PX); expect(m.tile).toBeCloseTo(150 / 26);
    const wide = miniGeom(16, 11); expect(wide.w).toBe(150); expect(wide.h).toBe(Math.round(11 * 150 / 16));
  });
  it('the frame on it is the camera\'s share of the map, kept inside', () => {
    const m = miniGeom(26, 26), f = miniFrame({ x: 27, y: 27, w: 48 * 13, h: 48 * 13 }, G, m);
    expect(f.x).toBeCloseTo(0); expect(f.y).toBeCloseTo(0); expect(f.w).toBeCloseTo(75); expect(f.h).toBeCloseTo(75);
    const all = miniFrame({ x: 0, y: 0, w: 9999, h: 9999 }, G, m); expect(all.w).toBe(150); expect(all.h).toBe(150);
  });
  it('a click on it centres the camera on that spot', () => {
    const m = miniGeom(26, 26), view = { w: 800, h: 500 };
    const to = miniToScroll(75, 75, m, G, view, BIG), mid = { x: 27 + 13 * 48, y: 27 + 13 * 48 };
    expect(to).toEqual({ x: Math.round(mid.x - 400), y: Math.round(mid.y - 250) });
    expect(miniToScroll(0, 0, m, G, view, BIG)).toEqual({ x: 0, y: 0 });
    expect(miniToScroll(150, 150, m, G, view, BIG)).toEqual({ x: BIG.w - 800, y: BIG.h - 500 });
  });
});

describe('which tiles an effect is about', () => {
  const pos = (id: string) => ({ a: '2,2', b: '20,20' } as Record<string, string>)[id];
  const all = () => true;
  it('a shot: the target first, then the shooter', () => {
    expect(fxTiles({ k: 'shot', unit: 'a', target: 'b', from: '2,2', to: '20,20' }, pos, all)).toEqual(['20,20', '2,2']);
  });
  it('a push and a throw: where it ends, then where it starts', () => {
    expect(fxTiles({ k: 'shove', unit: 'a', target: 'b', from: '20,20', to: '22,20' }, pos, all)).toEqual(['22,20', '20,20']);
    expect(fxTiles({ k: 'explode', at: '9,9', radius: 1 }, pos, all)).toEqual(['9,9']);
  });
  it('a walk: its end, then its start', () => { expect(fxTiles({ k: 'move', unit: 'a', from: '2,2', to: '2,8', path: ['2,2', '2,8'] }, pos, all)).toEqual(['2,8', '2,2']); });
  it('a spell: where its first missile lands, then the caster', () => {
    expect(fxTiles({ k: 'evoke', unit: 'a', at: '2,2', tiles: ['2,2', '3,2'], missiles: [{ impact: '15,4' }] }, pos, all)).toEqual(['15,4', '2,2']);
    expect(fxTiles({ k: 'field', tiles: ['10,10', '12,10', '11,12'] }, pos, all)).toEqual(['11,11']);
  });
  it('a heal or a hurt with only a target: the target\'s tile', () => {
    expect(fxTiles({ k: 'heal', target: 'b', at: '20,20' }, pos, all)).toEqual(['20,20']);
    expect(fxTiles({ k: 'hurt', target: 'b' }, pos, all)).toEqual(['20,20']);
  });
  it('fog of war: an unseen tile is left out, and an effect wholly unseen gives none', () => {
    const sees = (k: string) => k === '2,2';
    expect(fxTiles({ k: 'shot', unit: 'b', target: 'a', from: '20,20', to: '2,2' }, pos, sees)).toEqual(['2,2']);
    expect(fxTiles({ k: 'move', unit: 'b', from: '20,20', to: '21,20' }, pos, sees)).toEqual([]);
  });
  it('attacks, spells, pushes and walks bring the camera; their results (wounds, heals, a unit going down) and a Miracle do not', () => {
    for (const k of ['shot', 'melee', 'evoke', 'release', 'shove', 'explode', 'move', 'chain', 'turret_shot']) expect(movesCamera(k)).toBe(true);
    for (const k of ['hurt', 'heal', 'down', 'reload', 'boon', 'miracle', 'turn', 'cond']) expect(movesCamera(k)).toBe(false);
    // a technique's name over the attacker is a label: the attack it names takes the camera to the target, and the
    // name would pull it back to the attacker between two shots (review, 11 Nov 2026)
    expect(movesCamera('technique')).toBe(false);
    // a result off screen still names its tile (for the arrow at the window's edge)
    expect(fxTiles({ k: 'hurt', target: 'b', at: '20,20' }, pos, all)).toEqual(['20,20']);
  });
  it('bookkeeping never moves the camera (a turn\'s banner has its own rule)', () => {
    for (const k of ['turn', 'sight', 'cond', 'mana', 'cover', 'object', 'shield', 'spotlight', 'volley']) expect(fxTiles({ k, unit: 'a', at: '2,2' }, pos, all)).toEqual([]);
  });
});

describe('the camera move (planMove / sampleMove)', () => {
  const P = 48, NORMAL = 1 / 0.85;
  const at = (m: Move, t: number) => sampleMove(m, t);
  /** Every frame of a move at 60 fps (and its last, exact sample). */
  const frames = (m: Move) => { const out = []; for (let t = 0; t < m.ms; t += 1000 / 60) out.push(at(m, t)); out.push(at(m, m.ms)); return out; };
  it('its length grows with the distance and is capped: a hop is quick, a move across the map at most CROSS_MS at Normal', () => {
    const hop = moveMs(1, NORMAL), two = moveMs(2, NORMAL), mid = moveMs(8, NORMAL), far = moveMs(18, NORMAL), farther = moveMs(40, NORMAL);
    expect(hop).toBeGreaterThanOrEqual(250); expect(hop).toBeLessThanOrEqual(350);
    expect(two).toBeGreaterThan(hop); expect(mid).toBeGreaterThan(two); expect(far).toBeGreaterThan(mid);
    expect(far).toBe(MOVE.CROSS_MS); expect(farther).toBe(far); expect(far).toBeGreaterThanOrEqual(800); expect(far).toBeLessThanOrEqual(900);
  });
  it('it follows the combat speed: Fast is 0.85 of Normal, the test pace near instant', () => {
    expect(moveMs(18, 1)).toBe(Math.round(MOVE.CROSS_MS * 0.85));
    expect(moveMs(18, 0.04)).toBeLessThan(40);
  });
  it('no move inside the dead zone: a forced centring that would only nudge the view is not made', () => {
    const f = { x: 300, y: 300, w: 800, h: 500 }, c = { x: 300 + 400, y: 300 + 250 };
    expect(aim(f, BIG, [{ x: c.x + 30, y: c.y }], 72, true)).not.toBeNull(); // no dead zone: it centres
    expect(aim(f, BIG, [{ x: c.x + 30, y: c.y }], 72, true, MOVE.DEAD_ZONE_TILES * P)).toBeNull();
    expect(aim(f, BIG, [{ x: c.x + 200, y: c.y }], 72, true, MOVE.DEAD_ZONE_TILES * P)).not.toBeNull(); // farther than a tile: it goes
  });
  it('the shape: a lean back, then on to the mark, a few px past it, and back onto it with no bounce', () => {
    const m = planMove({ x: 0, y: 0 }, { x: 900, y: 0 }, { pitch: P, pace: 1 });
    const xs = frames(m).map((s) => s.x);
    const min = Math.min(...xs), max = Math.max(...xs);
    expect(min).toBeLessThan(0); expect(min).toBeGreaterThanOrEqual(-MOVE.ANTICIPATE_PX - 0.01); // the lean
    expect(max).toBeGreaterThan(900); expect(max).toBeLessThanOrEqual(900 + MOVE.OVERSHOOT_PX + 0.01); // the overshoot
    // past its peak it only comes back (critically damped: never under the mark again, never out again)
    const peak = xs.indexOf(max); for (let i = peak + 1; i < xs.length; i++) { expect(xs[i]).toBeLessThanOrEqual(xs[i - 1] + 1e-9); expect(xs[i]).toBeGreaterThanOrEqual(900 - 1e-6); }
    expect(xs[xs.length - 1]).toBe(900);
    // the speed is smooth: no frame jumps more than a smooth curve allows (no step, no snap)
    // (the speed changes by under a fifth of its top from one frame to the next: a step or a snap is a jump of all of it)
    const v = xs.slice(1, -1).map((x, i) => x - xs[i]), top = Math.max(...v);
    for (let i = 1; i < v.length; i++) expect(Math.abs(v[i] - v[i - 1])).toBeLessThan(top * 0.2);
    expect(Math.abs(v[0])).toBeLessThan(top * 0.05); expect(Math.abs(v[v.length - 1])).toBeLessThan(top * 0.05); // from rest, to rest
  });
  it('a hop has no overshoot and no zoom arc; a long move pulls back in the middle, by distance, and ends at its own zoom', () => {
    const hop = planMove({ x: 0, y: 0 }, { x: 70, y: 0 }, { pitch: P });
    expect(hop.over).toEqual({ x: 0, y: 0 }); expect(hop.arc).toBe(0);
    const mid = planMove({ x: 0, y: 0 }, { x: 8 * P, y: 0 }, { pitch: P }), far = planMove({ x: 0, y: 0 }, { x: 22 * P, y: 0 }, { pitch: P });
    expect(mid.arc).toBeGreaterThan(0); expect(far.arc).toBeGreaterThan(mid.arc); expect(far.arc).toBeCloseTo(MOVE.ARC_MAX);
    expect(far.arc).toBeGreaterThanOrEqual(0.08); expect(far.arc).toBeLessThanOrEqual(0.12);
    const sc = frames(far).map((s) => s.scale);
    expect(Math.min(...sc)).toBeCloseTo(1 - far.arc, 2); expect(sc[0]).toBeCloseTo(1, 5); expect(sc[sc.length - 1]).toBe(1);
  });
  it('the arc never takes the view under the smallest zoom', () => {
    const m = planMove({ x: 0, y: 0 }, { x: 22 * P, y: 0 }, { pitch: P, zoom: 0.42, zoomMin: 0.4 });
    expect(0.42 * (1 - m.arc)).toBeGreaterThanOrEqual(0.4 - 1e-9);
    expect(planMove({ x: 0, y: 0 }, { x: 22 * P, y: 0 }, { pitch: P, zoom: 0.4, zoomMin: 0.4 }).arc).toBe(0);
  });
  it('the overshoot never runs past the edge of the map', () => {
    const m = planMove({ x: 0, y: 0 }, { x: 900, y: 0 }, { pitch: P, max: { x: 900, y: 500 } });
    expect(m.over.x).toBe(0);
    for (const s of frames(m)) expect(s.x).toBeLessThanOrEqual(900);
  });
  it('an interrupted move starts from where the first one is and how fast it goes (no snap, no restart)', () => {
    const a = planMove({ x: 0, y: 0 }, { x: 1000, y: 0 }, { pitch: P }), t = a.ms * 0.45, st = moveState(a, t);
    expect(st.v.x).toBeGreaterThan(0.5); expect(st.scale).toBeLessThan(1);
    const b = planMove({ x: st.x, y: st.y }, { x: st.x, y: 800 }, { pitch: P, v0: st.v, s0: st.scale });
    const b0 = sampleMove(b, 0), b1 = sampleMove(b, 1000 / 60);
    expect(b0.x).toBeCloseTo(st.x, 6); expect(b0.y).toBeCloseTo(st.y, 6); expect(b0.scale).toBeCloseTo(st.scale, 6);
    // the first frame carries on in the old direction at about the old speed
    expect((b1.x - b0.x) / (1000 / 60)).toBeGreaterThan(st.v.x * 0.7);
    expect(b.lean).toEqual({ x: 0, y: 0 }); // already moving: no lean back
    const end = sampleMove(b, b.ms); expect(end).toEqual({ x: st.x, y: 800, scale: 1, done: true });
  });
  it('reduced motion: a short plain ease, no lean, no overshoot, no arc', () => {
    const m = planMove({ x: 0, y: 0 }, { x: 1000, y: 600 }, { pitch: P, reduced: true, v0: { x: 3, y: 0 } });
    expect(m.ms).toBe(MOVE.REDUCED_MS); expect(m.arc).toBe(0); expect(m.over).toEqual({ x: 0, y: 0 }); expect(m.lean).toEqual({ x: 0, y: 0 });
    const fs = frames(m);
    for (const s of fs) { expect(s.scale).toBe(1); expect(s.x).toBeGreaterThanOrEqual(0); expect(s.x).toBeLessThanOrEqual(1000); }
  });
  it('the travel curve starts and ends at rest and never goes back', () => {
    expect(travel(0)).toBe(0); expect(travel(1)).toBeCloseTo(1, 9);
    let last = 0; for (let u = 0.01; u <= 1; u += 0.01) { const v = travel(u); expect(v).toBeGreaterThanOrEqual(last - 1e-12); last = v; }
    expect(travel(0.01)).toBeLessThan(0.001); expect(1 - travel(0.99)).toBeLessThan(0.001);
  });
});
