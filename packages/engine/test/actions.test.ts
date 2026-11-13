// The basic actions as the client is given them (engine review 4, finding 1): every row's cost is the AP the reducer
// takes for that action, for a plain unit and for the holders of the items that change it; a move is offered only where
// moveUnit() would accept it; an attack's reach is previewAttack's. The six disagreements the review found between the
// client's typed-in numbers and the engine are each pinned here on the engine's side.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { ACTIONS, ACTION, basicActions, basicCost, moveOptions, moveAp, reachOf, reachTiles, previewAction, previewAttack, weaponActions, WEAPON, type Unit } from '../src';
import { fightWith, withGame } from './helpers/perkfight';
import rulesJ from '../../../data/rules.json';

type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const rows = (f: F, u: Unit = f.pc) => withGame(f.g, () => basicActions(f.cb, u, { g: f.g }));
const rowOf = (f: F, id: string) => rows(f).find((r) => r.id === id)!;
/** What the reducer takes for this action (through apply, on a copy). */
const taken = (f: F, a: any) => previewAction(f.g, { unitId: f.pc.id, ...a }, 'host');
const opts = (f: F, how: any, u: Unit = f.pc) => moveOptions(f.g, f.cb, u.id, how);
/** Put a condition on the first PC (from the foe), with nothing rolled against it. */
const cond = (f: F, id: string) => { const u = f.pc; (u.conds ||= {})[id] = 2; if (id === 'grappled') (u.condBy ||= {})[id] = f.foe.id; };
const stims = (f: F, n = 2) => { for (const c of Object.values(f.g.characters)) c.stims = n; };

describe('data/actions.json', () => {
  it('every action has a name, a text, a tab, an action type and an engine adjudication', () => {
    expect(ACTIONS.length).toBeGreaterThan(15);
    for (const a of ACTIONS) { expect(a.name, a.id).toBeTruthy(); expect(a.text, a.id).toBeTruthy(); expect(['move', 'attack', 'utility']).toContain(a.tab); expect(a.type).toMatch(/^combat\//); expect(a.adjudication).toBe('engine'); }
  });
  it('where rules.json lists the same action, the two costs agree', () => {
    const R: Record<string, any> = Object.fromEntries(((rulesJ as any).combat.actions as any[]).map((a) => [a.id, a]));
    for (const a of ACTIONS) if (a.rule && typeof R[a.rule]?.ap === 'number') expect(a.ap, a.id).toBe(R[a.rule].ap);
    expect(ACTION.stim.ap_downed).toBe(R.stabilise.ap); expect(ACTION.stim.ap_downed_medic).toBe(R.stabilise.ap_bard); // the key the truth pass renamed (ap_combat_medic: the Bard is the class now)
  });
});

describe('basicActions: the rows a plain unit has', () => {
  it('every row prints a cost, and the base costs are the data\'s', () => {
    const f = fightWith([{}], [{ at: 'F6' }]); f.turn(f.pc);
    const R = rows(f);
    expect(R.map((r) => r.id)).toEqual(['move', 'sprint', 'disengage', 'prone', 'shove', 'cover', 'pickup', 'door', 'stim', 'stim_throw', 'hide', 'analyze']); // rules 1.33: Stim Throw is everyone's
    for (const r of R) { expect(r.cost, r.id).toMatch(/AP/); expect(r.text.length, r.id).toBeGreaterThan(10); expect(r.text, r.id).not.toMatch(/\{\w+\}/); }
    for (const id of ['sprint', 'disengage', 'prone', 'shove', 'pickup', 'door', 'stim', 'hide']) expect(rowOf(f, id).ap, id).toBe(ACTION[id].ap);
    expect(rowOf(f, 'stim').cost).toBe('1–2 AP');
    expect(rowOf(f, 'move').cost).toBe('1 AP / ' + f.pc.movement + ' tiles');
  });
  it('the rows that only apply sometimes: Burning, Grappled, Disarmed, a lowered weapon', () => {
    const f = fightWith([{}], [{ at: 'F6' }]); const u = f.turn(f.pc);
    cond(f, 'burning'); cond(f, 'grappled'); cond(f, 'disarmed');
    expect(rowOf(f, 'extinguish').ap).toBe(1); expect(rowOf(f, 'escape').ap).toBe(2);
    expect(rowOf(f, 'recover')).toMatchObject({ ap: 2, label: 'Recover your weapon' });
    expect(rowOf(f, 'move').why).toMatch(/Grappled/); // the engine's own reason, not "Needs AP"
    delete u.conds!.disarmed; cond(f, 'lowered');
    expect(rowOf(f, 'recover')).toMatchObject({ ap: 1, label: 'Raise your weapon' });
  });
});

describe('a row\'s cost is what the reducer takes', () => {
  const setup = (spec: any = {}) => { const f = fightWith([spec, {}], [{ at: 'F6', classic: true }]); const u = f.turn(f.pc); at(f, u, '3,5'); at(f, f.foe, '4,5'); at(f, f.pcs[1], '3,6'); return f; };
  const cases: [string, (f: F) => any, ((f: F) => void)?][] = [
    ['prone', () => ({ type: 'combat/prone' })],
    ['shove', (f) => ({ type: 'combat/shove', targetId: f.foe.id })],
    ['analyze', (f) => ({ type: 'combat/analyze', targetId: f.foe.id })],
    ['extinguish', () => ({ type: 'combat/extinguish' }), (f) => cond(f, 'burning')],
    ['escape', () => ({ type: 'combat/escape' }), (f) => cond(f, 'grappled')],
    ['recover', () => ({ type: 'combat/recover' }), (f) => cond(f, 'disarmed')],
    ['hide', () => ({ type: 'combat/hide' }), (f) => { at(f, f.foe, '15,10'); f.foe.pos = '15,10'; f.cb.map.solid.push('8,5', '8,6', '8,7', '8,8', '8,9', '8,10', '9,5', '10,5', '11,5', '12,5', '13,5', '14,5', '15,5'); }],
    ['cover', () => ({ type: 'combat/shoot-cover', tile: '5,5' }), (f) => { f.cb.objects = [...(f.cb.objects || []), { id: 'bx', kind: 'barricade', name: 'Barricade', pos: '5,5', hp: 30 } as any]; at(f, f.foe, '9,9'); }],
    ['stim', (f) => ({ type: 'combat/stim', targetId: f.pcs[1].id }), (f) => stims(f)],
  ];
  for (const [id, mk, prep] of cases) it(id, () => {
    const f = setup(); prep?.(f);
    const r = rowOf(f, id), v = taken(f, mk(f));
    expect(r, id).toBeTruthy(); expect(v.why, id).toBeNull(); expect(r.why, id).toBeNull();
    expect(v.ap, id).toBe(basicCost(f.cb, f.pc, id, { targetId: mk(f).targetId }, { g: f.g }));
    if (id !== 'stim') expect(v.ap, id).toBe(r.ap);
  });
  it('the weapon\'s own actions agree too (weaponActions)', () => {
    const f = setup(); f.pc.ammo = 1;
    const rl = withGame(f.g, () => weaponActions(f.pc)).find((x) => x.id === 'reload')!;
    expect(taken(f, { type: 'combat/reload' }).ap).toBe(rl.ap);
  });
});

describe('the six disagreements the review found (client typed number vs engine)', () => {
  it('1. Shove: 1 AP for a Siege Engine holder, on the row and from the reducer', () => {
    const f = fightWith([{ perks: { siege_engine: 'achieved' } }], [{ at: 'C6', classic: true }]); const u = f.turn(f.pc); at(f, u, '3,5'); at(f, f.foe, '4,5');
    expect(rowOf(f, 'shove')).toMatchObject({ ap: 1, cost: '1 AP', why: null });
    expect(taken(f, { type: 'combat/shove', targetId: f.foe.id }).ap).toBe(1);
    f.pc.ap = 1; expect(rowOf(f, 'shove').why).toBeNull(); // 1 AP is enough
  });
  it('2. Sprint: 1 AP with Drill Echo, and with 1 AP left the sprint tiles are offered', () => {
    const f = fightWith([{ traits: ['drill_echo'] }], [{ at: 'O10' }]); const u = f.turn(f.pc); at(f, u, '3,5');
    expect(rowOf(f, 'sprint')).toMatchObject({ ap: 1, cost: '1 AP', why: null });
    f.pc.ap = 1;
    const o = opts(f, 'sprint'), ks = Object.keys(o.tiles);
    expect(ks.length).toBeGreaterThan(8); expect(o.why).toBeNull();
    expect(new Set(ks.map((k) => o.tiles[k].ap))).toEqual(new Set([1]));
    const far = ks.sort((a, b) => o.tiles[b].tiles - o.tiles[a].tiles)[0];
    expect(taken(f, { type: 'combat/move', to: far, how: 'sprint' })).toMatchObject({ ok: true, ap: 1 });
    // a plain unit pays the data's 2, and with 1 AP has no sprint
    const p = fightWith([{}], [{ at: 'O10' }]); p.turn(p.pc); p.pc.ap = 1;
    expect(rowOf(p, 'sprint')).toMatchObject({ ap: 2, why: 'Needs 2 AP.' }); expect(Object.keys(opts(p, 'sprint').tiles)).toEqual([]);
  });
  it('3. Disengage: Live to Fight Another Day\'s free one is offered at 0 AP, once a turn', () => {
    const f = fightWith([{ traits: ['live_to_fight_another_day'] }], [{ at: 'O10' }]); const u = f.turn(f.pc); at(f, u, '3,5'); f.pc.ap = 0;
    expect(rowOf(f, 'disengage')).toMatchObject({ ap: 0, cost: '0 AP', why: null });
    const o = opts(f, 'disengage'); expect(Object.keys(o.tiles).length).toBeGreaterThan(2); expect(Object.values(o.tiles).every((t) => t.ap === 0 && t.tiles === 1)).toBe(true);
    f.act({ type: 'combat/move', unitId: f.pc.id, to: Object.keys(o.tiles)[0], how: 'disengage' });
    expect(f.pc.ap).toBe(0);
    expect(rowOf(f, 'disengage')).toMatchObject({ ap: 1, why: 'Needs 1 AP.' }); expect(Object.keys(opts(f, 'disengage').tiles)).toEqual([]);
  });
  it('4. Move legality: one Sprint a turn, Threatened, an item that forbids it: no tile is offered that the engine refuses', () => {
    const f = fightWith([{}], [{ at: 'O10' }]); const u = f.turn(f.pc); at(f, u, '3,5');
    const first = Object.keys(opts(f, 'sprint').tiles)[0];
    f.act({ type: 'combat/move', unitId: f.pc.id, to: first, how: 'sprint' });
    expect(opts(f, 'sprint')).toMatchObject({ tiles: {}, why: 'One Sprint a turn.' }); expect(rowOf(f, 'sprint').why).toBe('One Sprint a turn.');
    // Threatened (a Call): no tile nearer the one who threatened it; every tile offered is one the reducer accepts
    at(f, f.pc, '3,5'); at(f, f.foe, '7,5'); f.pc.ap = 6; f.pc.call = { ...(f.pc.call || {}), cowed: { by: f.foe.id } } as any;
    const o = opts(f, 'move'), d = (a: string, b: string) => Math.max(Math.abs(+a.split(',')[0] - +b.split(',')[0]), Math.abs(+a.split(',')[1] - +b.split(',')[1]));
    expect(Object.keys(o.tiles).length).toBeGreaterThan(5);
    for (const k of Object.keys(o.tiles)) expect(d(k, '7,5'), k).toBeGreaterThanOrEqual(4);
    expect(taken(f, { type: 'combat/move', to: '4,5' }).why).toMatch(/Threatened by/);
    for (const k of Object.keys(o.tiles).slice(0, 12)) expect(taken(f, { type: 'combat/move', to: k }), k).toMatchObject({ ok: true, ap: o.tiles[k].ap });
    // an item's ban (Forlorn Hope never Disengages)
    const h = fightWith([{ traits: ['forlorn_hope'] }], [{ at: 'O10' }]); h.turn(h.pc);
    expect(opts(h, 'disengage').why).toMatch(/you never Disengage/); expect(Object.keys(opts(h, 'disengage').tiles)).toEqual([]); expect(rowOf(h, 'disengage').why).toMatch(/you never Disengage/);
  });
  it('5. Stim: 2 AP to stabilise a Downed ally (1 for a Bard), 1 AP for one who is up', () => {
    const f = fightWith([{}, {}], [{ at: 'O10' }]); const u = f.turn(f.pc); at(f, u, '3,5'); const ally = f.pcs[1]; at(f, ally, '3,6'); stims(f);
    expect(basicCost(f.cb, f.pc, 'stim', { targetId: ally.id }, { g: f.g })).toBe(1);
    f.unit(ally.id).downed = true; f.unit(ally.id).hp = 0;
    expect(basicCost(f.cb, f.pc, 'stim', { targetId: ally.id }, { g: f.g })).toBe(2);
    expect(taken(f, { type: 'combat/stim', targetId: ally.id })).toMatchObject({ ok: true, ap: 2 });
    const b = fightWith([{ classId: 'bard' }, {}], [{ at: 'O10' }]); b.turn(b.pc); stims(b); b.unit(b.pcs[1].id).downed = true;
    expect(basicCost(b.cb, b.pc, 'stim', { targetId: b.pcs[1].id }, { g: b.g })).toBe(1); expect(rowOf(b, 'stim').cost).toBe('1 AP');
  });
  it('6. Reach: the grand staff (the Reach property) strikes 2 tiles away, and the red area says so', () => {
    const f = fightWith([{ weapon: 'grand_staff' }], [{ at: 'O10', classic: true }]); const u = f.turn(f.pc); at(f, u, '3,5'); at(f, f.foe, '5,5');
    expect((WEAPON.grand_staff as any).phys.props).toContain('reach'); expect(WEAPON.grand_staff.properties).not.toContain('reach_2');
    expect(reachOf(f.cb, f.pc, 'melee')).toMatchObject({ max: 2, melee: true });
    expect(reachTiles(f.cb, f.pc, 'melee').has('5,5')).toBe(true);
    expect(withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'melee')).why).not.toBe('Out of melee reach.');
    const k = fightWith([{ weapon: 'combat_knife' }], [{ at: 'O10' }]); k.turn(k.pc);
    expect(reachOf(k.cb, k.pc, 'melee').max).toBe(1); expect(reachOf(k.cb, k.pc, 'shove').max).toBe(1);
  });
});

describe('moveOptions', () => {
  it('a Move: every tile offered costs what the reducer takes; nothing out of AP is offered', () => {
    const f = fightWith([{}], [{ at: 'O10' }]); const u = f.turn(f.pc); at(f, u, '3,5'); f.pc.ap = 2;
    const o = opts(f, 'move'), ks = Object.keys(o.tiles);
    expect(ks.length).toBeGreaterThan(4); expect(Math.max(...ks.map((k) => o.tiles[k].ap))).toBeLessThanOrEqual(2);
    for (const k of [ks[0], ks[ks.length - 1]]) expect(taken(f, { type: 'combat/move', to: k })).toMatchObject({ ok: true, ap: o.tiles[k].ap });
    expect(moveAp(f.pc, 'move')).toBe(1);
  });
  it('a Prone or Downed unit is offered nothing, with the engine\'s reason', () => {
    const f = fightWith([{}], [{ at: 'O10' }]); f.turn(f.pc); f.pc.prone = true;
    expect(opts(f, 'move')).toMatchObject({ tiles: {}, why: 'Stand up first (1 AP).' });
  });
  it('asking leaves the fight and the game exactly as they were', () => {
    const f = fightWith([{ traits: ['drill_echo', 'live_to_fight_another_day', 'glass_runner'] }], [{ at: 'F6' }]); f.turn(f.pc);
    const before = JSON.stringify(f.g);
    for (const how of ['move', 'sprint', 'disengage'] as const) opts(f, how);
    rows(f);
    expect(JSON.stringify(f.g)).toBe(before);
  });
  it('an item that prices the first move of a fight (Glass Runner) prices every tile from the same start', () => {
    const f = fightWith([{ traits: ['glass_runner'] }], [{ at: 'O10' }]); const u = f.turn(f.pc); at(f, u, '3,5');
    const o = opts(f, 'move'), plain = fightWith([{}], [{ at: 'O10' }]); const pu = plain.turn(plain.pc); at(plain, pu, '3,5'); plain.pc.movement = f.pc.movement;
    const p = opts(plain, 'move');
    // each tile is 1 AP cheaper than without it (the discount is not used up by the first tile asked)
    const shared = Object.keys(o.tiles).filter((k) => p.tiles[k] && p.tiles[k].ap >= 1);
    expect(shared.length).toBeGreaterThan(5);
    for (const k of shared) expect(o.tiles[k].ap, k).toBe(p.tiles[k].ap - 1);
  });
});
