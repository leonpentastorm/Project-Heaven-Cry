// @vitest-environment jsdom
// The fight screen holds no cost, reach or legality of its own (engine review 4, finding 1). Each of the six places
// where the client's typed-in number disagreed with the engine is pinned here on the screen itself: the row's cost
// text, the AP pips that dim for the picked action, the tiles a move lights up, the red reach. Every one of these
// failed before the client asked the engine (12 Nov 2026); the engine's side is packages/engine/test/actions.test.ts.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, type GameState, type Sheet } from '@engine';

let G: GameState; const ME = 'host';
let snap: any = null;
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const doAct = (a: any) => { G = apply(G, a, ME); snap = view(); };
const sent: any[] = [];
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {},
  act: (a: any) => { sent.push(a); try { doAct(a); } catch (e: any) { if (e?.name !== 'RuleError' && e?.constructor?.name !== 'RuleError') throw e; } }, go: () => {}, toast: () => {}, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');
const { actionGroups, catalogue } = await import('../game/commands');

const sheet = (name: string, kit = 'medic'): Sheet => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit, traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
/** A fight on our turn: the first character (edited by `edit`) at 3,3 with 6 AP, an ally next to it, one foe well away. */
function fight(seed: string, edit: (c: any) => void = () => {}, o: { two?: boolean } = {}) {
  snap = null; sent.length = 0; G = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
  doAct({ type: 'char/add', sheet: sheet('MPAT') }); if (o.two) doAct({ type: 'char/add', sheet: sheet('Rook') });
  doAct({ type: 'session/start' }); doAct({ type: 'narrator/begin' });
  const c: any = Object.values(G.characters)[0]; edit(c);
  doAct({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } });
  const cb = G.combat!, u: any = cb.units.find((x) => x.charId === c.id)!, foe: any = cb.units.find((x) => x.side === 'foe')!, ally: any = cb.units.find((x) => x.side === 'pc' && x.id !== u.id) || null;
  cb.order = [u.id, ...cb.order.filter((x) => x !== u.id)]; cb.turn = 0; u.ap = 6; u.pos = '3,3'; foe.pos = (cb.map.w - 2) + ',' + (cb.map.h - 2); foe.hidden = false; if (ally) ally.pos = '3,4';
  (cb.map as any).solid = (cb.map as any).solid.filter((k: string) => { const [x, y] = k.split(',').map(Number); return Math.abs(x - 3) > 3 || Math.abs(y - 3) > 3; }); // open ground round the unit
  snap = view();
  return { c, u, foe, ally, cb };
}
const screen = (state: any = {}) => { const L = new CombatLogic({}) as any; L.setState = (p: any) => { Object.assign(L.state, p); }; Object.assign(L.state, state); return L; };
const pipsCost = (r: any) => r.apPips.filter((p: any) => p.cls === 'phc-pip-cost').length;
const rowOf = (r: any, id: string) => r.groups.flatMap((g: any) => g.items).find((i: any) => i.key === id);
/** The tiles the screen lights up for the picked move (the dashed plan square), as rendered. */
const lit = (L: any): string[] => L.renderVals().tiles.filter((t: any) => t.isTile && t.hasPlan).map((t: any) => t.key);
const far = (k: string) => Math.max(Math.abs(+k.split(',')[0] - 3), Math.abs(+k.split(',')[1] - 3));

describe('1. Shove (Siege Engine: 1 AP)', () => {
  it('the row, the pips and the chip over the target all say 1 AP', () => {
    const { u, foe } = fight('b-shove', (c) => { c.perks = [...(c.perks || []), { id: 'siege_engine', tier: 'achieved' }]; });
    foe.pos = '4,3'; snap = view();
    const L = screen({ action: 'shove', target: foe.id, hover: foe.pos }), r = L.renderVals();
    expect(rowOf(r, 'shove').cost).toBe('1 AP');
    expect(pipsCost(r)).toBe(1);
    expect(r.tiles.find((t: any) => t.key === foe.pos).cost).toBe('SHOVE · 1 AP');
    doAct({ type: 'combat/shove', unitId: u.id, targetId: foe.id }); expect(G.combat!.units.find((x) => x.id === u.id)!.ap).toBe(5); // and the engine takes 1
  });
  it('a plain unit: 2 AP everywhere', () => {
    const { foe } = fight('b-shove2'); foe.pos = '4,3'; snap = view();
    const r = screen({ action: 'shove', target: foe.id }).renderVals();
    expect(rowOf(r, 'shove').cost).toBe('2 AP'); expect(pipsCost(r)).toBe(2);
  });
});

describe('2. Sprint (Drill Echo: 1 AP)', () => {
  it('the row says 1 AP, and with 1 AP left the sprint tiles light up and the click is taken', () => {
    const { u } = fight('b-sprint', (c) => { c.traits = [...(c.traits || []), 'drill_echo']; });
    u.ap = 1; snap = view();
    const L = screen({ action: 'sprint' }), r = L.renderVals();
    expect(rowOf(r, 'sprint').cost).toBe('1 AP'); expect(rowOf(r, 'sprint').why).toBe('');
    const tiles = lit(L); expect(tiles.length).toBeGreaterThan(8);
    const to = tiles.sort((a, b) => far(b) - far(a))[0]; expect(far(to)).toBeGreaterThan(1);
    L.setState({ hover: to }); expect(pipsCost(L.renderVals())).toBe(1);
    L.tileClick(to);
    expect(sent.at(-1)).toMatchObject({ type: 'combat/move', how: 'sprint', to });
    expect(G.combat!.units.find((x) => x.id === u.id)).toMatchObject({ pos: to, ap: 0 });
  });
});

describe('3. Disengage (Live to Fight Another Day: the first one is free)', () => {
  it('at 0 AP the free Disengage is offered: the row is not greyed and its tiles light up', () => {
    const { u } = fight('b-dis', (c) => { c.traits = [...(c.traits || []), 'live_to_fight_another_day']; });
    u.ap = 0; snap = view();
    const L = screen({ action: 'disengage' }), r = L.renderVals();
    expect(rowOf(r, 'disengage')).toMatchObject({ cost: '0 AP', why: '' });
    const tiles = lit(L); expect(tiles.length).toBeGreaterThan(2);
    L.tileClick(tiles[0]);
    expect(G.combat!.units.find((x) => x.id === u.id)!.pos).toBe(tiles[0]);
    // the second one this turn costs 1 AP again: nothing lights up at 0 AP
    const L2 = screen({ action: 'disengage' }), r2 = L2.renderVals();
    expect(rowOf(r2, 'disengage')).toMatchObject({ cost: '1 AP', why: 'Needs 1 AP.' }); expect(lit(L2)).toEqual([]);
  });
});

describe('4. Move legality: no tile lights up for a move the engine refuses', () => {
  it('one Sprint a turn', () => {
    const { u } = fight('b-legal');
    const L = screen({ action: 'sprint' }); L.renderVals(); const first = lit(L)[0]; expect(first).toBeTruthy();
    L.tileClick(first); expect(G.combat!.units.find((x) => x.id === u.id)!.sprinted).toBe(true);
    const L2 = screen({ action: 'sprint' }), r = L2.renderVals();
    expect(lit(L2)).toEqual([]); expect(rowOf(r, 'sprint').why).toBe('One Sprint a turn.'); expect(r.sel.text).toBe('One Sprint a turn.');
  });
  it('Threatened: no tile nearer the one who threatened you; an item\'s ban (Forlorn Hope never Disengages)', () => {
    const { u, foe } = fight('b-cowed'); foe.pos = '8,3'; u.call = { cowed: { by: foe.id } }; snap = view();
    const L = screen({ action: 'move' }); L.renderVals();
    const tiles = lit(L), d = (k: string) => Math.max(Math.abs(+k.split(',')[0] - 8), Math.abs(+k.split(',')[1] - 3));
    expect(tiles.length).toBeGreaterThan(4); expect(Math.min(...tiles.map(d))).toBeGreaterThanOrEqual(5); expect(tiles).not.toContain('4,3');
    fight('b-forlorn', (c) => { c.traits = [...(c.traits || []), 'forlorn_hope']; });
    const L2 = screen({ action: 'disengage' }), r2 = L2.renderVals();
    expect(lit(L2)).toEqual([]); expect(rowOf(r2, 'disengage').why).toMatch(/you never Disengage/);
  });
});

describe('5. Stim (2 AP to stabilise a Downed ally)', () => {
  it('the pips dim 2 for a Downed ally and 1 for one who is up; the row says 1–2 AP', () => {
    const { c, ally } = fight('b-stim', () => {}, { two: true });
    G.characters[c.id].stims = 2; snap = view();
    let r = screen({ action: 'stim', target: ally.id }).renderVals();
    expect(rowOf(r, 'stim').cost).toBe('1–2 AP'); expect(pipsCost(r)).toBe(1);
    ally.downed = true; ally.hp = 0; snap = view();
    r = screen({ action: 'stim', target: ally.id }).renderVals();
    expect(pipsCost(r)).toBe(2);
  });
});

describe('6. Melee reach (the grand staff reaches 2 tiles)', () => {
  it('the red area covers the second tile, where the engine lets the strike land', () => {
    const { u } = fight('b-staff', (c) => { c.weapon = 'grand_staff'; });
    expect(u.weapon).toBe('grand_staff');
    const L = screen(); let r = L.renderVals();
    const cut = r.groups.flatMap((g: any) => g.items).find((i: any) => /^tq:main:cut/.test(i.key)) || r.groups.flatMap((g: any) => g.items).find((i: any) => /^tq:main:/.test(i.key));
    expect(cut).toBeTruthy();
    L.setState({ action: cut.key }); r = L.renderVals();
    expect(L._red.set.has('5,3')).toBe(true); expect(L._red.set.has('6,3')).toBe(false);
  });
});

describe('every action on the bar shows a cost', () => {
  it('no row of the Move, Attack and Utility tabs is without one, and the turn card\'s catalogue has them too', () => {
    const { c, u, cb } = fight('b-bar', (ch) => { ch.offWeapon = 'service_pistol'; }, { two: true });
    const groups = actionGroups(snap.game.combat, snap.game.combat.units.find((x: any) => x.id === u.id), snap.game.characters[c.id], { g: snap.game });
    for (const [, items, , tab] of groups) if (['move', 'attack', 'utility'].includes(tab)) for (const it of items) if (!String(it[0]).startsWith('tpad:')) expect(String(it[2]), it[0]).toMatch(/AP|free|Narrator|designs|rds/); // (a Techniques row opens a pad: it shows how many are ready, and each technique its own cost)
    expect(catalogue(cb, u, c, { g: G }).filter((e: any) => !e.cost).map((e: any) => e.action)).toEqual([]);
  });
});
