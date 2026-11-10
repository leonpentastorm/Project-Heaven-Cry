// World Play 1.1 on screen (rules revision 1.9; docs/design/world-play-1.1-spec.md), part A4: what the maps draw for
// piles (the stack with a count, the legend, the hover's lines), the Pick up checklist and what it sends, Near you, fog,
// the two reloads in the action lists at the engine's real costs, the path's hazard words, and the pick-up's float. Built
// on real games through the engine's actions, read through a player's view.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, type Sheet, type GameState, type Action, type NarratorTurn, type MapObject, newGame, apply, viewFor, positionsOf, keyOf, zoneMap, packOf, active,
  magsOf, roundsOf, storyCb, routeHazards, refOf, WEAPON } from '@engine';
import { worldLayer, pileLook, pileRows, pileTake, pickupLabel, pickupWhy, toggleUntick, pilesIn, nearItems, crossesText, isCacheV, PILE_ICON } from './worldView';
import { actionGroups, catalogue, reloadItems, reloadBothItems, RELOAD_TAC, RELOAD2_TAC } from './commands';
import { pickupWords, worldWord } from './fx/world';

const H = 'host', P2 = 'p2';
const sheet = (name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === 'sharpshooter') || ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const WALL = Array.from({ length: 12 }, (_, i) => 'H' + (i + 1));
const CAMP: any = {
  id: 'ground', title: 'Ground test', short: 'GR', kicker: 'TEST', pitch: ['A field.'], meta: 'Test.', arc: { beginning: 'a', middle: 'b', end: 'c' }, opening: 'Open.', startZone: 'field',
  zones: [{ id: 'field', name: 'The field', summary: 'Open ground, a wall down the middle.', w: 16, h: 12, solid: WALL, start: ['B2', 'B3', 'B4', 'B5'], enemyStart: ['O2', 'O3', 'O4', 'O5'] }],
  missions: [{ id: 'm1', title: 'The core', act: 1, summary: 'Find it.', goal: 'Get out.', objectives: [{ id: 'find', text: 'Find the core', done_when: 'Someone holds it.' }] }],
};
const ap = (g: GameState, a: Action, by = H) => apply(g, a, by);
const set = (g: GameState, f: (x: GameState) => void) => { const x: GameState = JSON.parse(JSON.stringify(g)); f(x); return x; };
const turn = (g: GameState, t: Partial<NarratorTurn>) => { const x: GameState = JSON.parse(JSON.stringify(g)); x.story.await = 'narrator'; x.story.work = { kind: 'round' }; return apply(x, { type: 'narrator/turn', turn: { narration: 'On.', ...t } as NarratorTurn }, H); };
function start() {
  let g = newGame('GR', { id: H, name: 'Host' }, 'ground-1');
  g = ap(g, { type: 'player/join', id: P2, name: 'Kim' });
  g = ap(g, { type: 'campaign/load', campaign: CAMP });
  g = ap(g, { type: 'char/add', sheet: sheet('Rook') });
  g = ap(g, { type: 'char/add', sheet: sheet('Ash') }, P2);
  g = ap(g, { type: 'session/start' });
  g = apply(g, { type: 'narrator/turn', turn: { narration: 'The field.', sceneTitle: 'The field' } }, H);
  // Rook: a service pistol with 7 rounds in it and two spare magazines.
  return set(g, (x) => { const c = rook(x); c.weapon = 'service_pistol'; c.weaponState = {}; c.loaded = 7; c.offHand = null as any; c.pack = [magsOf('service_pistol', 2), roundsOf('.32 decrkm', 10)]; });
}
const rook = (g: GameState) => Object.values(g.characters).find((c) => c.owner === H)!;
const K = (g: GameState, r: string) => keyOf(r, zoneMap(g))!;
const at = (g: GameState) => positionsOf(g)[rook(g).id];
const pileOf = (objs: MapObject[] | undefined, k: string) => (objs || []).find((o) => o.kind === 'pile' && o.pos === k);

describe('piles on the area map and the minimap', () => {
  it('a speed reload drops a pile the map draws as a stack with a count, a legend entry and a hover that lists it', () => {
    let g = start();
    const here = at(g);
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'reload' } as Action);
    const v = viewFor(g, H), o = pileOf(v.story.objects, here)!;
    expect(o).toBeTruthy(); expect(isCacheV(o)).toBe(false);
    const big = worldLayer(v, true), small = worldLayer(v, false), cell = big.cells.get(here)!;
    expect(cell.cache).toBeUndefined();
    expect(cell.pile).toMatchObject({ n: 1, count: '1', lines: ['Service pistol magazine 7/12'] });
    expect(cell.pile!.title).toBe('Pile at ' + refOf(here) + ' · 1 thing:\nService pistol magazine 7/12');
    expect(cell.pile!.tip.split('\n')).toEqual(['PILE AT ' + refOf(here) + ' · 1 THING', 'Service pistol magazine 7/12']);
    // A drawn stack (never the cache's ▣), smaller on the minimap; the legend says what it is.
    expect(cell.pile!.iconStyle).toContain(PILE_ICON); expect(decodeURIComponent(PILE_ICON)).toContain('<rect');
    expect(small.cells.get(here)!.pile!.iconStyle).toContain('width: 5px');
    expect(big.legend.find((l) => l.key === 'pile')).toMatchObject({ text: 'Pile: things on the ground' });
    // Nothing on the ground: no legend entry.
    expect(worldLayer(viewFor(start(), H), true).legend.some((l) => l.key === 'pile')).toBe(false);
  });
  it('the hover lists 8 lines, then "+N more"', () => {
    const o: any = { id: 'pile-1-1', kind: 'pile', pos: '1,1', approaches: [], items: Array.from({ length: 11 }, (_, i) => ({ item: 'x', qty: 1, name: 'Thing ' + (i + 1), key: 'e' + i })) };
    const L = pileLook(o);
    expect(L.n).toBe(11); expect(L.tip.split('\n').length).toBe(1 + 8 + 1); expect(L.tip.split('\n').at(-1)).toBe('+3 more');
  });
  it('the pick-up checklist: all ticked, untick sends the rest by key, and the area map takes only those', () => {
    let g = start();
    const here = at(g), [x, y] = here.split(',').map(Number), next = (x + 1) + ',' + y;
    g = turn(g, { ground: [{ at: refOf(next), items: [{ item: 'mag:service_pistol', qty: 7 }, { item: 'rounds:.32 decrkm', qty: 38 }] }] } as any);
    const v = viewFor(g, H), o = pileOf(v.story.objects, next)!;
    const rows = pileRows(o); expect(rows.map((r) => [r.label, r.checked])).toEqual([['Service pistol magazine 7/12', true], ['38 × .32 Decrkm', true]]);
    expect(pileTake(o)).toBeUndefined(); expect(pickupLabel(o)).toBe('Pick up everything · 1 AP');
    const untick = toggleUntick([], rows[0].key);
    expect(pileRows(o, untick).map((r) => r.checked)).toEqual([false, true]);
    expect(pileTake(o, untick)).toEqual([rows[1].key]); expect(pickupLabel(o, untick)).toBe('Pick up 1 of 2 · 1 AP');
    expect(toggleUntick(untick, rows[0].key)).toEqual([]);
    // Why not: too far, nothing ticked, no AP; fine next to it.
    expect(pickupWhy(here, o, 6)).toBeNull();
    expect(pickupWhy((x + 3) + ',' + y, o, 6)).toBe('Stand on it or next to it.');
    expect(pickupWhy(here, o, 6, rows.map((r) => r.key))).toBe('Tick something to take.');
    expect(pickupWhy(here, o, 0)).toBe('Needs 1 AP.');
    // Near you offers it; the pick-up takes the rounds and leaves the magazine.
    const near = nearItems(v, rook(g).id).find((n) => n.kind === 'pile')!;
    expect(near).toMatchObject({ id: o.id, label: 'Pick up from the pile at ' + refOf(next) + ' · 1 AP', sub: 'Service pistol magazine 7/12, 38 × .32 Decrkm', off: false });
    const loose0 = packOf(rook(g)).find((it) => it.calibre === '.32 decrkm' && !it.mags)?.qty || 0;
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'pickup', tile: next, take: pileTake(o, untick) } as Action);
    expect(packOf(rook(g)).find((it) => it.calibre === '.32 decrkm' && !it.mags)?.qty).toBe(loose0 + 38);
    expect(pileRows(pileOf(viewFor(g, H).story.objects, next)).map((r) => r.label)).toEqual(['Service pistol magazine 7/12']);
  });
  it('fog: a pile out of the party\'s sight is not drawn, and Near you never offers it', () => {
    let g = start();
    g = turn(g, { ground: [{ at: 'K3', items: [{ item: 'mag:service_pistol' }] }] } as any);
    expect(pileOf(g.story.objects, K(g, 'K3'))).toBeTruthy(); // the host's state keeps it
    const v = viewFor(g, H);
    expect(pilesIn(v.story.objects).size).toBe(0);
    expect(worldLayer(v, true).cells.get(K(g, 'K3'))?.pile).toBeUndefined();
    expect(nearItems(v, rook(g).id).some((n) => n.kind === 'pile')).toBe(false);
  });
});

describe('reloads and pick-up in the action lists (combat and the area map)', () => {
  it('a magazine gun offers the speed and the tactical reload at the engine\'s costs; a round-by-round gun its one reload', () => {
    const g = start(), cb = storyCb(g), u = cb.units.find((x) => x.charId === rook(g).id)!;
    const rows = reloadItems(u);
    expect(rows.map((r) => [r[0], r[1], r[2]])).toEqual([['reload', 'Reload (speed)', '2 AP · the magazine drops'], [RELOAD_TAC, 'Reload (tactical)', '3 AP · the magazine goes in your pack']]);
    u.ap = 2; expect(reloadItems(u)[1][4]).toBe('Needs 3 AP.'); expect(reloadItems(u)[0][4]).toBeNull();
    const bow = { ...u, weapon: Object.values(WEAPON).find((w: any) => w.reload === 'loose' && w.magazine != null)!.id, ammo: 0, loose: 5 };
    expect(reloadItems(bow).length).toBe(1); expect(reloadItems(bow)[0][0]).toBe('reload');
    // Two guns: speed 3 AP (the magazines drop), tactical 4 AP.
    const two = { ...u, offWeapon: 'service_pistol', offAmmo: 3, ap: 6 };
    expect(reloadBothItems(two).map((r) => [r[0], r[2]])).toEqual([['reload2', '3 AP · the magazines drop'], [RELOAD2_TAC, '4 AP · the magazines go in your pack']]);
    expect(reloadBothItems(u)).toEqual([]);
    // Review fix: a full gun is refused as the engine refuses it (and the confirm stays grey).
    const cap = (WEAPON as any)[u.weapon].magazine;
    expect(reloadBothItems({ ...two, ammo: cap, offAmmo: 12 })[0][4]).toBe('Already full.');
    expect(reloadBothItems({ ...two, ammo: 1, offAmmo: 12 })[0][4]).toMatch(/off-hand gun is full/);
    expect(reloadItems({ ...u, ammo: cap, ap: 6 }).map((r) => r[4])).toEqual(['Already full.', 'Already full.']);
  });
  it('the area map\'s tactical reload keeps the magazine: back in the pack, nothing on the ground', () => {
    let g = start();
    const here = at(g);
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'reload', tactical: true } as Action);
    expect(pileOf(g.story.objects, here)).toBeUndefined();
    expect(packOf(rook(g)).find((it) => it.weapon === 'service_pistol' && it.mags)!.mags).toContain(7);
  });
  it('in a fight: the Utility tab\'s reloads and Pick up, which says why until a pile lies in reach', () => {
    let g = turn(start(), { combat: { name: 'Fight', difficulty: 'easy', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists', at: 'P11' }] } } as any);
    for (let i = 0; i < 8 && active(g.combat!)!.charId !== rook(g).id; i++) { const x = active(g.combat!)!; g = ap(g, { type: 'combat/end-turn', unitId: x.id }, x.charId === rook(g).id ? H : P2); }
    const view = () => viewFor(g, H), me = () => view().combat!.units.find((x) => x.charId === rook(g).id)!;
    const util = () => actionGroups(view().combat, me(), rook(g), { g: view() }).find((gr) => gr[3] === 'utility')![1];
    // a gun's reloads are listed with its shots (the Attack tab) since 0.18.1
    const atk = () => actionGroups(view().combat, me(), rook(g), { g: view() }).find((gr) => gr[3] === 'attack')![1];
    expect(atk().map((it) => it[0]).filter((id) => id === 'reload' || id === RELOAD_TAC)).toEqual(['reload', RELOAD_TAC]);
    expect(util().find((it) => it[0] === 'pickup')![4]).toBe('Nothing on the ground next to you.');
    g = ap(g, { type: 'combat/reload', unitId: me().id });
    const pile = pileOf(view().combat!.objects, me().pos)!;
    expect(pileRows(pile).map((r) => r.label)).toEqual(['Service pistol magazine 7/12']);
    expect(worldLayer(view(), true).cells.get(me().pos)!.pile!.count).toBe('1');
    expect(catalogue(view().combat, me(), rook(g), { g: view() }).find((e) => e.action === 'pickup')!.why).toBeNull();
    // The path's hazard: a minefield across the whole row in front of Rook's way (no way round): the preview names it.
    g = set(g, (x) => { const cb = x.combat!, [ux, uy] = me().pos.split(',').map(Number); cb.hazards = [{ id: 'hz1', kind: 'minefield', severity: 'light', zone: 'field', name: 'Minefield', tiles: Array.from({ length: 12 }, (_, i) => (ux + 1) + ',' + i), approaches: [] } as any]; void uy; });
    const cbv = view().combat!, u = me(), [ux, uy] = u.pos.split(',').map(Number), rh = routeHazards(cbv as any, u as any, (ux + 2) + ',' + uy)!;
    expect(rh.crosses.map((c) => c.tile)).toEqual([(ux + 1) + ',' + uy]);
    expect(crossesText(rh.crosses)).toBe('Path crosses: minefield at ' + refOf((ux + 1) + ',' + uy) + '.');
  });
});

describe('words', () => {
  it('Path crosses: grouped by hazard, in route order', () => {
    expect(crossesText([])).toBe('');
    expect(crossesText([{ ref: 'C4', id: 'a', name: 'Minefield' }, { ref: 'D4', id: 'a', name: 'Minefield' }, { ref: 'E4', id: 'b', name: 'Gas' }])).toBe('Path crosses: minefield at C4, D4; gas at E4.');
  });
  it('the pick-up float names what was taken', () => {
    expect(pickupWords(['Rifle magazine 7/24'])).toBe('+ Rifle magazine 7/24');
    expect(pickupWords(['Rifle magazine 7/24', '38 × .32 Decrkm', 'A letter home'])).toBe('+ Rifle magazine 7/24 · +2 more');
    expect(pickupWords(undefined)).toBe('+ AMMO');
    expect(worldWord({ k: 'pickup', items: ['Service pistol'] } as any)).toBe('+ Service pistol');
    expect(worldWord({ k: 'pile', why: 'death' } as any)).toBe('DROPS');
  });
});
