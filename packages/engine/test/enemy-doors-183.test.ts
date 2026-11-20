// Rules 1.83 (0.33, enemy doors; items 7100 to 7110): an enemy row's `doors` block gives it items it holds and the
// wants the enemy step (ai-doors.ts) weighs against a plain attack. Every test plays through the reducer: a character
// ends its turn (combat/end-turn) and the enemies act in the turn order, through the player's own action path
// (runPerkAction for an item action, combatPray for a Whisper).
import { describe, expect, it, afterEach } from 'vitest';
import './helpers/yard16';
import { storyWith, withGame } from './helpers/perkfight';
import { figFight } from './helpers/figfight';
import { armFoe } from '../src/ai-sigil';
import { ENEMY_AI, enemyIntent, beginTurn, condOn, type Unit, type GameState, type Combat } from '../src';

const log = (f: any, from: number) => f.cb.log.slice(from).map((l: any) => (typeof l === 'string' ? l : l.text)).join('\n');
const savedDoors = JSON.parse(JSON.stringify((ENEMY_AI as any).doors));
afterEach(() => { (ENEMY_AI as any).doors = JSON.parse(JSON.stringify(savedDoors)); });

/** A fight through the narrator's own door, with foes as a fight file gives them (a caster archetype, tags). */
function fight(pcs: any[], foes: { tier: string; weapon: string; at: string; caster?: string; tags?: string[]; hidden?: boolean; name?: string }[], seed = 'DOORS183') {
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
function orderAs(f: any, ids: string[]) { const cb = f.cb; cb.order = [...ids, ...cb.order.filter((x: string) => !ids.includes(x))]; return f.turn(ids[0]); }

describe('rules 1.83 item 7100: the enemy door step runs a held item action through the player\'s path', () => {
  it('the Heartfire elite holds Durability\'s door and Challenges when two foes stand within its reach', () => {
    const f = fight([{ weapon: 'hellraiser_service_rifle' }, { weapon: 'hellraiser_service_rifle' }], [{ tier: 'elite', weapon: 'sabre', at: 'H6', caster: 'heartfire_elite' }]);
    const [a, b] = f.pcs, e = f.foes[0];
    expect((e.held as any)?.items).toContain('skill:durability.1');
    delete (e as any).mg; // no heart to work (the soul step comes before the door step: rules 1.83 item 7100)
    Object.assign(a, { pos: '6,4', hp: 9999, maxHp: 9999 }); Object.assign(b, { pos: '6,6', hp: 9999, maxHp: 9999 }); Object.assign(e, { pos: '7,5' });
    orderAs(f, [a.id, e.id]);
    const intent = withGame(f.g, () => enemyIntent(f.cb, f.unit(e.id)));
    expect(intent.text).toMatch(/Challenge/);
    const n = f.cb.log.length;
    f.act({ type: 'combat/end-turn', unitId: a.id });
    const said = log(f, n);
    expect(said).toMatch(/issues a challenge/);
    expect(said).toMatch(/issues a challenge · Tester 1 (is Taunted|resists)/); // the Heart saves of Challenge's own effect (its data), rolled as for a character's
  });
  it('with one foe in reach it does not (min 2): it fights as before', () => {
    const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'elite', weapon: 'sabre', at: 'H6', caster: 'heartfire_elite' }]);
    const a = f.pcs[0], e = f.foes[0];
    delete (e as any).mg; // no heart to work (the soul step comes before the door step: rules 1.83 item 7100)
    Object.assign(a, { pos: '6,4', hp: 9999, maxHp: 9999 }); Object.assign(e, { pos: '7,5' });
    orderAs(f, [a.id, e.id]);
    const n = f.cb.log.length;
    f.act({ type: 'combat/end-turn', unitId: a.id });
    expect(log(f, n)).not.toMatch(/issues a challenge/);
  });
  it('off (ai.doors.on false): the same elite holds nothing and never Challenges', () => {
    (ENEMY_AI as any).doors.on = false;
    const f = fight([{ weapon: 'hellraiser_service_rifle' }, { weapon: 'hellraiser_service_rifle' }], [{ tier: 'elite', weapon: 'sabre', at: 'H6', caster: 'heartfire_elite' }]);
    const [a, b] = f.pcs, e = f.foes[0];
    expect(e.held).toBeUndefined();
    delete (e as any).mg; // no heart to work (the soul step comes before the door step: rules 1.83 item 7100)
    Object.assign(a, { pos: '6,4', hp: 9999, maxHp: 9999 }); Object.assign(b, { pos: '6,6', hp: 9999, maxHp: 9999 }); Object.assign(e, { pos: '7,5' });
    orderAs(f, [a.id, e.id]);
    const n = f.cb.log.length;
    f.act({ type: 'combat/end-turn', unitId: a.id });
    expect(log(f, n)).not.toMatch(/issues a challenge/);
  });
});

describe('rules 1.83 item 7104: an enemy with a prayer sheet whispers', () => {
  it('a faithful soldier whispers Health over a squadmate under half its HP (Holy Father Nerukhan)', () => {
    const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6', tags: ['faithful'] }, { tier: 'soldier', weapon: 'service_pistol', at: 'H8', name: 'Guard 1' }]);
    const a = f.pcs[0], [e, m] = f.foes;
    expect(e.sheet?.belief?.patron).toBe('nerukhan');
    Object.assign(a, { pos: '1,1', hp: 9999, maxHp: 9999 }); Object.assign(e, { pos: '12,5' }); Object.assign(m, { pos: '12,7', hp: Math.floor(m.maxHp * 0.3) });
    orderAs(f, [a.id, e.id]);
    const n = f.cb.log.length, hp0 = f.unit(m.id).hp;
    f.act({ type: 'combat/end-turn', unitId: a.id });
    expect(log(f, n)).toMatch(/whispers a prayer to Holy Father Nerukhan: Health/);
    expect(f.unit(m.id).hp).toBeGreaterThan(hp0);
  });
  it('nobody under half: it does not pray', () => {
    const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6', tags: ['faithful'] }, { tier: 'soldier', weapon: 'service_pistol', at: 'H8', name: 'Guard 1' }]);
    const a = f.pcs[0], [e, m] = f.foes;
    Object.assign(a, { pos: '1,1', hp: 9999, maxHp: 9999 }); Object.assign(e, { pos: '12,5' }); Object.assign(m, { pos: '12,7' });
    orderAs(f, [a.id, e.id]);
    const n = f.cb.log.length;
    f.act({ type: 'combat/end-turn', unitId: a.id });
    expect(log(f, n)).not.toMatch(/whispers a prayer/);
  });
  it("the Heart adept keeps Mother Ember: its sheet is its row's, never a character's", () => {
    const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6', caster: 'heart_adept' }]);
    expect(f.foes[0].sheet?.belief?.patron).toBe('mother_ember');
    expect(f.foes[0].sheet?.npc).toBe(true);
    expect(Object.keys(f.g.characters)).not.toContain(f.foes[0].id);
  });
});

const SKULK_SEED = 'DOORS183-T2'; // (a seed whose end-of-turn look does not spot the skulker first)
describe('rules 1.83 item 7102: a skulker Tags from the dark', () => {
  it('a Hidden Soldier skulker Tags a foe that cannot see it (Marked), then fights on', () => {
    const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6', tags: ['skulk'], hidden: true }], SKULK_SEED);
    const a = f.pcs[0], e = f.foes[0];
    expect(e.hidden).toBeTruthy();
    f.cb.map = { ...f.cb.map, dark: true } as any; // a dark map: the character's eyes reach half as far off the lit tiles, so it cannot see the skulker's tile
    Object.assign(a, { pos: '1,5', light: 1 }); Object.assign(e, { pos: '8,5' }); // (it carries a light: the skulker sees it, it does not see the skulker)
    f.cb.order = [a.id, e.id]; f.cb.turn = 0; // (its first turn as the fight opened: the character's, then the skulker's)
    const n = f.cb.log.length;
    f.act({ type: 'combat/end-turn', unitId: a.id });
    expect(log(f, n), log(f, 0)).toMatch(/tags Tester 1 from the dark/);
    expect(condOn(f.unit(a.id), 'marked')).toBeTruthy();
  });
});

describe('rules 1.83 item 7106: the Read foresees what Pressure makes an enemy do first', () => {
  it('a Broken soldier in the open: the intent names its run for cover, and it runs there', () => {
    const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6' }], 'AI179-1');
    const pc = f.pcs[0], foe = f.foes[0];
    Object.assign(pc, { pos: '1,5' }); Object.assign(foe, { pos: '7,3', pressure: 4 });
    orderAs(f, [pc.id, foe.id]);
    const it0 = withGame(f.g, () => enemyIntent(f.cb, f.unit(foe.id)));
    expect(it0.kind).toBe('move');
    expect(it0.text).toMatch(/break and run for cover at/);
    f.act({ type: 'combat/end-turn', unitId: pc.id });
    expect(f.unit(foe.id).pos).toBe(it0.to); // what the Read said is where it went
  });
  it('no cover in reach: the intent says it throws itself flat', () => {
    const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6' }], 'AI179-2');
    const pc = f.pcs[0], foe = f.foes[0];
    f.cb.objects = []; f.cb.map = { ...f.cb.map, cover: [], full: [] } as any;
    Object.assign(pc, { pos: '1,5' }); Object.assign(foe, { pos: '12,5', pressure: 4 });
    orderAs(f, [pc.id, foe.id]);
    expect(withGame(f.g, () => enemyIntent(f.cb, f.unit(foe.id))).text).toMatch(/throw itself flat/);
  });
  it('off (ai.pressure.on false): the intent is the attack it would make', () => {
    const was = (ENEMY_AI as any).pressure.on; (ENEMY_AI as any).pressure.on = false;
    try {
      const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6' }], 'AI179-1');
      const pc = f.pcs[0], foe = f.foes[0];
      Object.assign(pc, { pos: '1,5' }); Object.assign(foe, { pos: '7,3', pressure: 4 });
      orderAs(f, [pc.id, foe.id]);
      expect(withGame(f.g, () => enemyIntent(f.cb, f.unit(foe.id))).text).not.toMatch(/cover|flat/);
    } finally { (ENEMY_AI as any).pressure.on = was; }
  });
});

describe('rules 1.83 item 7107: the bait reads Answers', () => {
  /** Tester 1 (a sabre, Riposte known and ready: an Answer against a melee blow) and Tester 2 (a rifle, no Answer); a
   * Minion (a bait tier) and a Soldier (a tier it draws for), both with sabres, both next to both testers. */
  function setup(order: 'minion first' | 'soldier first') {
    const f = fight([{ weapon: 'sabre' }, { weapon: 'hellraiser_service_rifle' }], [{ tier: 'minion', weapon: 'sabre', at: 'H6', name: 'Bait' }, { tier: 'soldier', weapon: 'sabre', at: 'H8', name: 'Brute' }], 'BAIT183');
    const [a, b] = f.pcs, [m, s] = f.foes;
    (f.g.characters[a.charId!] as any).phys = { ...(f.g.characters[a.charId!] as any).phys, known: ['riposte'], ready: { melee: ['riposte'] } };
    Object.assign(a, { pos: '5,5', hp: 9999, maxHp: 9999 }); Object.assign(b, { pos: '5,7', hp: 9999, maxHp: 9999 });
    Object.assign(m, { pos: '6,6', hp: 9999, maxHp: 9999 }); Object.assign(s, { pos: '4,6', hp: 9999, maxHp: 9999 });
    const ids = order === 'minion first' ? [a.id, m.id, s.id] : [a.id, s.id, m.id];
    f.cb.order = [...ids, ...f.cb.order.filter((x: string) => !ids.includes(x))];
    return { f, a, b, m, s };
  }
  it('the Minion goes at the one with a ready Answer first (Tester 2 a little more hurt), and the log says why', () => {
    const { f, a, b, m } = setup('minion first');
    f.unit(b.id).hp = Math.round(9999 * 0.8);
    f.turn(m.id);
    const it0 = withGame(f.g, () => enemyIntent(f.cb, f.unit(m.id)));
    expect(it0.targetId).toBe(a.id);
    expect(it0.text).toMatch(/draws the answer/);
  });
  it('the Soldier holds off the Answer while the Minion has still to act (Tester 1 a little more hurt): it goes at Tester 2', () => {
    const { f, a, b, s } = setup('soldier first');
    f.unit(a.id).hp = Math.round(9999 * 0.9); // a tenth more hurt: less than answer_hold (0.15)
    f.turn(s.id);
    expect(withGame(f.g, () => enemyIntent(f.cb, f.unit(s.id))).targetId).toBe(b.id);
  });
  it('off (answer_lure and answer_hold 0): the Minion takes the more hurt, Tester 2', () => {
    const B: any = ENEMY_AI.bait, was = { l: B.answer_lure, h: B.answer_hold }; B.answer_lure = 0; B.answer_hold = 0;
    try {
      const { f, b, m } = setup('minion first');
      f.unit(b.id).hp = Math.round(9999 * 0.8);
      f.turn(m.id);
      expect(withGame(f.g, () => enemyIntent(f.cb, f.unit(m.id))).targetId).toBe(b.id);
    } finally { B.answer_lure = was.l; B.answer_hold = was.h; }
  });
});

describe('rules 1.83 item 7108: an enemy Sigil caster weighs NULL on a Figment (charge x ai.null_figment)', () => {
  /** A Rigger at D3 pictures a Beast (charge 4) at I3; an Evoker foe that knows only NULL and ARC stands at L3, all in the open. */
  function setup() {
    const f = figFight([{ skills: { visualization: 3 }, weapon: 'service_pistol', forms: ['beast'], level: 5 }], [{ at: '14,10' }], { seed: 'NULLFIG183' });
    const o = f.pc; o.pos = '4,2'; const u = f.turn(o); u.ap = 9; f.picture(u, 'beast', '8,2');
    const fig = f.figments(f.unit(o.id))[0]; expect(fig).toBeTruthy();
    const e = f.foe; withGame(f.g, () => armFoe(e, { sigils: ['null', 'arc'] })); e.mg!.flux = 0; e.pos = '11,2'; e.weapon = 'combat_knife'; // (a knife and nobody in reach: the spell is weighed against no shot)
    f.cb.order = [o.id, e.id, ...f.cb.order.filter((x: string) => x !== o.id && x !== e.id)];
    return { f, o, e, fig };
  }
  it('it draws NULL at the Figment, and the Figment is unmade', () => {
    const { f, o, fig } = setup();
    const n = f.cb.log.length;
    f.act({ type: 'combat/end-turn', unitId: o.id });
    expect(log(f, n)).toMatch(/draws NULL/);
    expect(f.cb.units.find((x) => x.id === fig.id && !x.dead)).toBeFalsy();
  });
  it('off (ai.null_figment 0): it has nothing to NULL', () => {
    const was = (ENEMY_AI as any).null_figment; (ENEMY_AI as any).null_figment = 0;
    try {
      const { f, o } = setup();
      const n = f.cb.log.length;
      f.act({ type: 'combat/end-turn', unitId: o.id });
      expect(log(f, n)).not.toMatch(/draws NULL/);
    } finally { (ENEMY_AI as any).null_figment = was; }
  });
});

describe('rules 1.83 item 7109: Interpose for an enemy with Durability 3 (the Heartfire elite)', () => {
  it('a character shoots the soldier beside the Heartfire elite: the elite interposes, 1 Guard, and takes the hit', () => {
    let seen = false;
    for (let i = 1; i <= 12 && !seen; i++) {
      const f = fight([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', weapon: 'service_pistol', at: 'H6', name: 'Guard 1' }, { tier: 'elite', weapon: 'sabre', at: 'H8', caster: 'heartfire_elite', name: 'Heartfire' }], 'INTERPOSE183-' + i);
      const a = f.pcs[0], [s, e] = f.foes;
      Object.assign(a, { pos: '3,2' }); Object.assign(s, { pos: '8,2', hp: 9999, maxHp: 9999, def: 0 }); Object.assign(e, { pos: '9,2', hp: 9999, maxHp: 9999 });
      f.turn(a.id);
      const n = f.cb.log.length, guard0 = f.unit(e.id).res?.guard ?? 0, hpS = f.unit(s.id).hp;
      f.act({ type: 'combat/attack', unitId: a.id, targetId: s.id, mode: 'shot' } as any);
      const said = log(f, n);
      if (!/hit/.test(said)) continue;
      expect(said).toMatch(/Heartfire interposes for Guard 1 \(1 Guard\)/);
      expect(f.unit(e.id).res?.guard ?? 0).toBeLessThan(guard0); // the 1 Guard it pays, then its plates soak the blow (Guard's own rule)
      expect(f.unit(s.id).hp).toBe(hpS);
      seen = true;
    }
    expect(seen).toBe(true);
  });
});
