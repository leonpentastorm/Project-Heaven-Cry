// Rules 1.86 items 7400, 7401 (0.33, the engine lane): what a unit with no character holds (combat.ts unitGrip: its
// weapons, its rows' doors.hands, its magic block's foci), so `self_holds` passes for an enemy with an Attuner in its
// hand; then the Heart adept's Bond, Tug and Snap, done by the enemy door step through the player's own path. Every
// test plays through the reducer: a character ends its turn and the enemies act.
import { describe, expect, it, afterEach } from 'vitest';
import './helpers/yard16';
import { storyWith, withGame } from './helpers/perkfight';
import { ENEMY_AI, beginTurn, tiedTo, dist, type Unit, type GameState, type Combat } from '../src';

const log = (f: any, from: number) => f.cb.log.slice(from).map((l: any) => (typeof l === 'string' ? l : l.text)).join('\n');
function fight(pcs: any[], foes: { tier: string; weapon: string; at: string; caster?: string; tags?: string[]; name?: string }[], seed = 'BONDS186') {
  const s = storyWith(pcs, seed);
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Test fight', map: 'yard16', difficulty: 'standard',
    enemies: foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), ...f })) } } } as any);
  const box: any = s;
  const api = {
    get g(): GameState { return box.g; }, get cb(): Combat { return box.g.combat!; },
    get pcs(): Unit[] { return box.g.combat!.units.filter((u: Unit) => u.side === 'pc'); },
    get foes(): Unit[] { return box.g.combat!.units.filter((u: Unit) => u.side === 'foe'); },
    unit: (id: string): Unit => box.g.combat!.units.find((u: Unit) => u.id === id)!,
    act: (a: any, by = 'host') => s.act(a, by),
    turn(id: string) { const cb = box.g.combat!; cb.turn = cb.order.indexOf(id); delete cb.window; withGame(box.g, () => beginTurn(cb, box.g.rng)); return api.unit(id); },
  };
  return api;
}
const savedDoors = JSON.parse(JSON.stringify((ENEMY_AI as any).doors));
afterEach(() => { (ENEMY_AI as any).doors = JSON.parse(JSON.stringify(savedDoors)); });
function orderAs(f: any, ids: string[]) { const cb = f.cb; cb.order = [...ids, ...cb.order.filter((x: string) => !ids.includes(x))]; return f.turn(ids[0]); }

/** One Heart adept and one character; the adept's heart has no design to work (the soul step comes before the door step). */
function adept(pcAt: string, foeAt: string, seed?: string) {
  const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6', caster: 'heart_adept' }], seed);
  const a = f.pcs[0], e = f.foes[0];
  if ((e as any).mg) (e as any).mg.designs = [];
  Object.assign(a, { pos: pcAt, hp: 9999, maxHp: 9999 }); Object.assign(e, { pos: foeAt });
  return { f, a, e };
}
/** The character ends its turn and the adept acts; then the character's turn comes back. */
function round(f: any, a: Unit, e: Unit): string {
  orderAs(f, [a.id, e.id]);
  const n = f.cb.log.length;
  f.act({ type: 'combat/end-turn', unitId: a.id });
  return log(f, n);
}

describe('rules 1.86 item 7400: what a unit with no character holds (combat.ts unitGrip)', () => {
  it("the Heart adept holds an Attuner (its row's doors.hands) and Bonds a foe it sees, through Bond's own effects", () => {
    const { f, a, e } = adept('6,4', '9,4');
    expect(e.holding).toContain('attuner');
    const said = round(f, a, e);
    expect(said).toMatch(/Foe 1 reaches for Tester 1 through a Bond/);
    if (/Tester 1 is Bonded/.test(said)) expect(tiedTo(f.cb, f.unit(e.id), f.unit(a.id), 'bond', 'to')).toBeTruthy();
  });
  it('off (ai.doors.on false): it holds nothing in its hands and never Bonds', () => {
    (ENEMY_AI as any).doors.on = false;
    const { f, a, e } = adept('6,4', '9,4');
    expect(e.holding).toBeUndefined();
    expect(round(f, a, e)).not.toMatch(/through a Bond/);
  });
});

describe("rules 1.86 item 7401: the Heart adept's Tug and Snap (the door step, the player's path)", () => {
  /** Rounds until the Bond takes (the character's Heart save may resist it). */
  function bonded(seed: string, pcAt: string, foeAt: string) {
    const { f, a, e } = adept(pcAt, foeAt, seed);
    for (let i = 0; i < 6 && !tiedTo(f.cb, f.unit(e.id), f.unit(a.id), 'bond', 'to'); i++) { round(f, a, e); Object.assign(f.unit(a.id), { pos: pcAt }); Object.assign(f.unit(e.id), { pos: foeAt }); }
    expect(tiedTo(f.cb, f.unit(e.id), f.unit(a.id), 'bond', 'to')).toBeTruthy();
    return { f, a: f.unit(a.id), e: f.unit(e.id) };
  }
  it('a Bonded foe farther than 4 tiles is Tugged along the Bond (target_beyond 4)', () => {
    const { f, a, e } = bonded('TUG186', '3,4', '9,4');
    const before = dist(a.pos, e.pos), mp = (e as any).mg.mp;
    const said = round(f, a, e);
    expect(said).toMatch(/Foe 1 tugs at the Bond with Tester 1/);
    expect((f.unit(e.id) as any).mg.mp).toBeLessThan(mp); // its MP pays (Tug's own price)
    if (/reels Tester 1 in/.test(said)) expect(dist(f.unit(a.id).pos, f.unit(e.id).pos)).toBeLessThan(before);
  });
  it('within 4 tiles it does not Tug', () => {
    const { f, a, e } = bonded('TUGNEAR186', '6,4', '9,4');
    expect(round(f, a, e)).not.toMatch(/tugs at the Bond/);
  });
  it("a Bonded foe under 35% of its HP is Snapped: Soul damage through Snap's own amount, and the Bond ends", () => {
    const { f, a, e } = bonded('SNAP186', '6,4', '9,4');
    Object.assign(a, { hp: Math.floor(a.maxHp * 0.3) });
    const hp = a.hp, said = round(f, a, e);
    expect(said).toMatch(/Foe 1 snaps the Bond with Tester 1/);
    expect(f.unit(a.id).hp).toBeLessThan(hp);
    // the Bond ends with the Snap (its own tie op); Bond is a want of its own, so the adept may reach for it again after
    const snapAt = said.indexOf('snaps the Bond'), again = said.indexOf('reaches for Tester 1 through a Bond');
    expect(snapAt).toBeGreaterThanOrEqual(0);
    if (again < 0) expect(tiedTo(f.cb, f.unit(e.id), f.unit(a.id), 'bond', 'to')).toBeFalsy(); else expect(again).toBeGreaterThan(snapAt);
  });
});

describe('rules 1.86 item 7402: the Heartfire elite Slams (Durability 5 on its row)', () => {
  it('two foes next to it: it Slams through Slam\'s own effects (Off Balance saves, the push)', () => {
    const f = fight([{ weapon: 'hellraiser_service_rifle' }, { weapon: 'hellraiser_service_rifle' }], [{ tier: 'elite', weapon: 'sabre', at: 'H6', caster: 'heartfire_elite' }], 'SLAM186');
    const [a, b] = f.pcs, e = f.foes[0];
    delete (e as any).mg; // no heart to work (the soul step comes before the door step)
    Object.assign(a, { pos: '6,5', hp: 9999, maxHp: 9999 }); Object.assign(b, { pos: '8,5', hp: 9999, maxHp: 9999 }); Object.assign(e, { pos: '7,5' });
    const said = round(f, a, e);
    expect(said).toMatch(/Foe 1 slams the plates outward/);
  });
  it('one foe next to it (min 2): no Slam', () => {
    const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'elite', weapon: 'sabre', at: 'H6', caster: 'heartfire_elite' }], 'SLAM186');
    const a = f.pcs[0], e = f.foes[0];
    delete (e as any).mg;
    Object.assign(a, { pos: '6,5', hp: 9999, maxHp: 9999 }); Object.assign(e, { pos: '7,5' });
    expect(round(f, a, e)).not.toMatch(/slams the plates/);
  });
});
