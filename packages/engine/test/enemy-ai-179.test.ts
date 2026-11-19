// Rules 1.79 (0.32, enemies; items 6700 to 6719): enemies react to what the players' doors do to them. Every test plays
// through the reducer: a character ends its turn (combat/end-turn) and the enemies act in the turn order, or a
// character attacks (combat/attack). The behaviours read enemies.json `ai` (pressure, focus, angle, bait) and a tier's
// `guard`; each has `on`, switched off here to show the old behaviour beside the new.
import { describe, expect, it, afterEach } from 'vitest';
import './helpers/yard16';
import { fightWith, storyWith, withGame } from './helpers/perkfight';
import { ENEMY_AI, MAPS, sideSees, beginTurn, type Unit, type MapDef } from '../src';
import { atCover } from '../src/physical/pressure';

const log = (f: any, from: number) => f.cb.log.slice(from).map((l: any) => (typeof l === 'string' ? l : l.text)).join('\n');
const saved = JSON.parse(JSON.stringify({ pressure: ENEMY_AI.pressure, focus: ENEMY_AI.focus, angle: ENEMY_AI.angle, bait: ENEMY_AI.bait }));
afterEach(() => { for (const k of ['pressure', 'focus', 'angle', 'bait'] as const) (ENEMY_AI as any)[k] = JSON.parse(JSON.stringify(saved[k])); });
/** Put the fight's turn order as given (ids) and make it the first one's turn. */
function orderAs(f: any, ids: string[]) { const cb = f.cb; cb.order = [...ids, ...cb.order.filter((x: string) => !ids.includes(x))]; return f.turn(ids[0]); }
const endTurn = (f: any, u: Unit) => f.act({ type: 'combat/end-turn', unitId: u.id });

describe('rules 1.79 item 6700: a Broken enemy reaches cover or drops Prone first', () => {
  it('a Broken soldier in the open runs for the covered tile fewest of its foes can see, and says so', () => {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6' }], { seed: 'AI179-1' });
    const pc = f.pc, foe = f.foe;
    Object.assign(pc, { pos: '1,5' }); Object.assign(foe, { pos: '7,3', pressure: 4 }); // 7,3: open ground, the half cover at 5,3 / 5,4 and 7,1 two tiles off
    expect(withGame(f.g, () => atCover(f.cb, f.foe))).toBe(false);
    orderAs(f, [pc.id, foe.id]); const n = f.cb.log.length;
    endTurn(f, f.pc);
    const said = log(f, n), e = f.foe;
    expect(said).toMatch(/breaks and runs for cover/);
    expect(withGame(f.g, () => atCover(f.cb, e))).toBe(true);
  });
  it('with no cover in reach it throws itself flat and stays down that turn (it does not stand back up)', () => {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6' }], { seed: 'AI179-2' });
    const pc = f.pc, foe = f.foe;
    f.cb.objects = []; f.cb.map = { ...f.cb.map, cover: [], full: [] } as MapDef;
    Object.assign(pc, { pos: '1,5' }); Object.assign(foe, { pos: '12,5', pressure: 4 });
    orderAs(f, [pc.id, foe.id]); const n = f.cb.log.length;
    endTurn(f, f.pc);
    const said = log(f, n);
    expect(said).toMatch(/throws itself flat and stays down/);
    expect(said).not.toMatch(/stands up/);
    expect(f.foe.prone).toBe(true);
  });
  it('off (ai.pressure.on false): the same Broken soldier does neither', () => {
    (ENEMY_AI as any).pressure.on = false;
    const f = fightWith([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6' }], { seed: 'AI179-1' });
    const pc = f.pc, foe = f.foe;
    Object.assign(pc, { pos: '1,5' }); Object.assign(foe, { pos: '7,3', pressure: 4 });
    orderAs(f, [pc.id, foe.id]); const n = f.cb.log.length;
    endTurn(f, f.pc);
    expect(log(f, n)).not.toMatch(/runs for cover|throws itself flat/);
  });
});

describe('rules 1.79 items 6705 and 6706: an enemy keeps its target across rounds', () => {
  function setup(seed: string) {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle' }, { weapon: 'hellraiser_service_rifle' }], [{ tier: 'elite', weapon: 'hellraiser_service_rifle', at: 'H6' }], { seed });
    const [a, b] = f.pcs, e = f.foe;
    Object.assign(a, { pos: '2,4', hp: 9999, maxHp: 9999 }); Object.assign(b, { pos: '2,6', hp: 9999, maxHp: 9999 }); Object.assign(e, { pos: '12,5', hp: 9999, maxHp: 9999 });
    return { f, a, b, e };
  }
  /** Round 1: the elite fires at somebody; then the OTHER character is made a little more hurt (less than `keep`), and
   * round 2's first shot is read. */
  function play(seed: string) {
    const { f, a, b, e } = setup(seed);
    orderAs(f, [a.id, b.id, e.id]);
    endTurn(f, f.unit(a.id)); endTurn(f, f.unit(b.id)); // the elite's turn runs after b's
    const first = f.unit(e.id) as any, t1 = first.aimMem as string;
    expect(t1 === a.id || t1 === b.id).toBe(true);
    const other = t1 === a.id ? b.id : a.id;
    // a share of max HP: the other one 0.2 more hurt than the first target (the keep is 0.3)
    f.unit(other).hp = Math.round(f.unit(other).maxHp * 0.8);
    f.unit(t1).hp = f.unit(t1).maxHp;
    const n = f.cb.log.length; orderAs(f, [a.id, b.id, e.id]); f.cb.round += 0; // the next round comes by the end-turns
    endTurn(f, f.unit(a.id)); endTurn(f, f.unit(b.id));
    return { t1, other, t2: (f.unit(e.id) as any).aimMem as string, said: log(f, n) };
  }
  it('round 2: it stays on the one it fought in round 1, though the other is a little more hurt; the log says it once', () => {
    const r = play('AI179-F');
    expect(r.t2).toBe(r.t1);
    expect(r.said).toMatch(/stays on .*: it finishes what it started/);
  });
  it('off (ai.focus.on false): the same fight turns to the more hurt one', () => {
    (ENEMY_AI as any).focus.on = false;
    const r = play('AI179-F');
    expect(r.t2).toBe(r.other);
  });
});

describe('rules 1.79 item 6708: the squad baits a held shot with a cheap mover', () => {
  function setup() {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'combat_knife', at: 'O4' }, { tier: 'minion', weapon: 'combat_knife', at: 'O6' }], { seed: 'AI179-B' });
    const pc = f.pc, [s, m] = f.foes;
    f.cb.objects = []; f.cb.map = { ...f.cb.map, cover: [], full: [], difficult: [] } as MapDef;
    Object.assign(pc, { pos: '2,5', hp: 9999, maxHp: 9999 }); Object.assign(s, { pos: '14,4' }); Object.assign(m, { pos: '14,6' });
    // the soldier acts before the minion this round
    orderAs(f, [pc.id, s.id, m.id]);
    f.act({ type: 'combat/overwatch', unitId: pc.id, mode: 'shot' });
    return { f, pc, s, m };
  }
  it('the Soldier holds out of the lane while the Minion still has to act; the Minion walks in and draws the shot', () => {
    const { f, pc, s, m } = setup();
    const s0 = f.unit(s.id).pos, n = f.cb.log.length;
    endTurn(f, f.unit(pc.id));
    const said = log(f, n);
    expect(f.unit(s.id).pos, 'the Soldier keeps out of the held lane').toBe(s0);
    expect(said).toMatch(/breaks into the held lane to draw the shot/);
    expect(said).toMatch(new RegExp(f.unit(m.id).name.split(' ')[0] + '[^\n]*(hit|miss|takes|fires)|(fires|shot)[^\n]*' + f.unit(m.id).name.split(' ')[0], 'i'));
  });
  it('off (ai.bait.on false): the Soldier walks into the lane first', () => {
    (ENEMY_AI as any).bait.on = false;
    const { f, pc, s } = setup();
    const s0 = f.unit(s.id).pos; endTurn(f, f.unit(pc.id));
    expect(f.unit(s.id).pos).not.toBe(s0);
  });
});

describe('rules 1.79 item 6707 (spec 4969 b): an enemy walks for an angle on a character nobody is attacking', () => {
  // a wall down column 8 from row 0 to row 6: B behind it is out of the shooters' line until one walks round its foot
  // a wall down column 8 from row 0 to row 6. A (bottom left) is stabbed by a knifeman beside it; B (top left) is seen by
  // that knifeman but is behind the wall from the rifleman, whose only target in reach is A, already under fire
  const WALL = Array.from({ length: 7 }, (_, y) => '8,' + y);
  MAPS.ai179 = { ...MAPS.yard16, id: 'ai179', solid: WALL, cover: [], full: [], difficult: [], pcStart: ['2,9', '4,1'], foeStart: ['3,9', '11,8'] };
  function play() {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle' }, { weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'combat_knife', at: 'D10' }, { tier: 'soldier', weapon: 'hellraiser_service_rifle', at: 'L9' }], { seed: 'AI179-A', map: 'ai179' });
    const [a, b] = f.pcs, [x, y] = f.foes;
    Object.assign(a, { pos: '2,9', hp: 9999, maxHp: 9999 }); Object.assign(b, { pos: '4,1', hp: 9999, maxHp: 9999 });
    Object.assign(x, { pos: '3,9', hp: 9999, maxHp: 9999 }); Object.assign(y, { pos: '11,8', hp: 9999, maxHp: 9999 });
    orderAs(f, [a.id, b.id, x.id, y.id]);
    endTurn(f, f.unit(a.id)); const n = f.cb.log.length; endTurn(f, f.unit(b.id));
    return { f, said: log(f, n), y: f.unit(y.id), b: f.unit(b.id), y0: '11,8' };
  }
  it('the second Soldier, whose only target is already under fire, walks round the wall for a shot at B, and says so', () => {
    const r = play();
    expect(r.said).toMatch(/moves for an angle on .*, whom nobody is shooting/);
    expect(r.y.pos).not.toBe(r.y0);
  });
  it('off (ai.angle.on false): it stays on the one target in reach', () => {
    (ENEMY_AI as any).angle.on = false;
    const r = play();
    expect(r.said).not.toMatch(/moves for an angle/);
  });
});

describe('rules 1.79 item 6710: an enemy row with Guard plates soaks hits through the Guard door', () => {
  /** A fight with one Heartfire elite (enemies.json soul_casters heartfire_elite carries `guard`), as the Narrator starts one. */
  function fight() {
    const s: any = storyWith([{ weapon: 'hellraiser_service_rifle' }], 'AI179-G');
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Test fight', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Heartfire', tier: 'elite', caster: 'heartfire_elite', weapon: 'sabre', at: 'D6' }] } } });
    return { s, cb: () => s.g.combat, pc: () => s.g.combat.units.find((u: Unit) => u.side === 'pc'), e: () => s.g.combat.units.find((u: Unit) => u.side === 'foe') };
  }
  it("the Heartfire elite starts with its row's plates full and the Guard technique; a hit on it spends plates before HP (the door's soak)", () => {
    const f = fight();
    expect(f.e().resMax?.guard).toBe(3); expect(f.e().res?.guard).toBe(3); expect(f.e().techs).toContain('guard');
    Object.assign(f.pc(), { pos: '1,5' }); Object.assign(f.e(), { pos: '3,5' });
    let soaked = false;
    for (let i = 0; i < 12 && !soaked; i++) {
      const cb = f.cb(); cb.turn = cb.order.indexOf(f.pc().id); delete cb.window; withGame(f.s.g, () => beginTurn(cb, f.s.g.rng));
      const g0 = f.e().res.guard, n = f.cb().log.length;
      f.s.act({ type: 'combat/attack', unitId: f.pc().id, targetId: f.e().id, mode: 'shot' });
      const said = f.cb().log.slice(n).map((l: any) => (typeof l === 'string' ? l : l.text)).join(' | ');
      if (/Guard takes \d+ of it/.test(said)) { soaked = true; expect(f.e().res.guard).toBeLessThan(g0); }
      f.e().hp = f.e().maxHp;
    }
    expect(soaked).toBe(true);
  });
  it('a row without `guard` (every tier today) has no Guard pool', () => {
    const f = fightWith([{}], [{ tier: 'elite', at: 'F6' }]);
    expect(f.foe.resMax?.guard).toBeUndefined();
  });
});
