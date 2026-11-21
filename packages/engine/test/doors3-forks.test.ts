// @ts-nocheck (test fixtures: plain objects)
// Rules 1.60 (Doors 3.0), slice C: the forks (the spec's section 2; the lead's approved N1, N2, N10, N23). Every pick goes
// through the reducer (door/pick, sent by the test helpers' `picks`); every rule through a real action (combat/attack,
// combat/perk, combat/technique, combat/move) or a real blow (resolveAttack, as a foe's turn makes it); every number is
// read from data (data/forks.json, skills.json, tending.json), never typed here.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import './helpers/yard16';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';
import { physFight, rig } from './helpers/physfight';
import { PERK, SKILLS, SKILL, apply, applyCond, condOn, resolveAttack, migrateLoaded, ladderSchedule, pendingDoorPicks, doorForkView, doorForkViews, forkRow, forkBuilt, formsOf, FIG_REV, beginTurn, viewFor, heldOfChar, type Unit, type Action } from '../src';
import { onHook } from '../src/effects/hooks';
import { tiesOf } from '../src/kit';
import { pressureOf, pressureCap } from '../src/physical/pressure';
import forksJ from '../../../data/forks.json';
import tendingJ from '../../../data/tending.json';
import techniquesJ from '../../../data/techniques.json';
import RULESJ from '../../../data/rules.json';

const FK: Record<string, any> = Object.fromEntries((forksJ as any).items.map((x: any) => [x.id, x]));
const T: any = tendingJ;
// rules 1.75 item 6213: Tug, Guide, Settle, Soothe and Raise are Camaraderie perks' actions now (their grant_action rows)
const MOVED: Record<string, [string, number]> = { 'tend.tug': ['pull_together', 0], 'tend.guide': ['pull_together', 1], 'tend.settle': ['steady_hands', 0], 'tend.soothe': ['steady_hands', 1], 'tend.raise': ['nobody_left_behind', 2] };
const movedGrant = (id: string) => (PERK as any)[MOVED[id][0]].tiers.II.effects[MOVED[id][1]];
const grant = (id: string) => (MOVED[id] ? movedGrant(id) : T.items.find((x: any) => x.id === id).effects.find((e: any) => e.op === 'grant_action'));
const ALPHAS = (SKILLS as any[]).filter((s) => Array.isArray(s.forks));
/** The second fork's point of an alpha skill (rules 1.70 item 5536: skills.json ladder, the forks at 4 and 8). */
const FORK2 = (skill: string): number => ladderSchedule(skill).forks[1];
const SLAM = () => (SKILL as any).durability.unlocks['1'].effects.find((e: any) => e.action === 'guard_slam');

let SAVES: 'pass' | 'fail' | null = null;
onHook('save', (ctx: any) => { if (SAVES === 'pass') ctx.pass = true; if (SAVES === 'fail') ctx.fail = true; });
afterEach(() => { SAVES = null; rig(null); });

type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; return f.unit(u.id); };
const big = (f: F, u: Unit) => { const x = f.unit(u.id); x.hp = x.maxHp = 9999; return x; };
/** A foe's blow on a unit, as its turn makes it (the foe's AP not spent), with the game bound. */
const blow = (f: F, by: Unit, t: Unit, mode = 'shot') => withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(by.id), f.unit(t.id), mode, null, { noAp: true }));

// ============================================================================================ the framework (N1, N2)
describe('the forks as data (N1): two steps a door, at 4 and 8 of its alpha skill (rules 1.70 item 5536: the ladder schedule), picked once through door/pick', () => {
  it('every alpha skill names two steps (Visualization too since rules 1.74 item 6041); each option is a forks.json row of its door at its step', () => {
    expect(ALPHAS.map((s) => s.id).sort()).toEqual(['brain_power', 'dexterity', 'durability', 'empathy', 'faith', 'ingenuity', 'raw_power', 'visualization', 'will_power']);
    for (const s of ALPHAS) {
      const at = ladderSchedule(s.id).forks;
      expect(at, s.id).toEqual([4, 8]);
      expect(s.forks.length, s.id).toBe(at.length);
      for (const st of s.forks) expect(st.at, s.id + ': a fork row names no point of its own; the schedule does').toBeUndefined();
      for (const st of s.forks) for (const o of st.of) { expect(FK[o], o).toMatchObject({ door: s.id }); expect((FK[o] as any).step, o + ': its points are the schedule, no copy (m7)').toBeUndefined(); }
    }
  });
  it('a step opens at its points, and only when both of its options are built; the view says which are missing', () => {
    for (const s of ALPHAS) {
      const st = storyWith([{ skills: { [s.id]: 3 } }]), c = st.g.characters[st.chars[0].id];
      expect(pendingDoorPicks(c, s.id), s.id + ' at 3').toEqual([]);
      c.skills[s.id] = 10;
      const offered = s.forks.filter((f: any) => f.of.every(forkBuilt)).map((f: any) => 'fork:' + f.id);
      expect(pendingDoorPicks(c, s.id).map((p) => p.grant), s.id).toEqual(offered);
      const v = doorForkView(c, s.id)!;
      for (const [i, f] of s.forks.entries()) {
        expect(v.steps[i].offered, s.id + ' ' + ladderSchedule(s.id).forks[i]).toBe(f.of.every(forkBuilt));
        expect(v.steps[i].missing).toEqual(f.of.filter((o: string) => !forkBuilt(o)).map((o: string) => FK[o].name));
        if (!v.steps[i].offered) expect(v.steps[i].why).toMatch(/Sealed: not yet issued/); // rules 1.66 item 5212
      }
    }
  });
  it('picked out of a fight, kept for good: a second pick at the same step, a shelved option, another door\'s option and a pick in a fight are refused', () => {
    const s = storyWith([{ skills: { durability: 4 } }]), id = s.chars[0].id;
    expect(doorForkView(s.g.characters[id], 'durability')!.pending).toBe(1);
    s.act({ type: 'door/pick', charId: id, door: 'durability', option: 'fork.guard.provoke' } as Action);
    const c = s.g.characters[id];
    expect(c.doorPicks.durability).toEqual(['fork.guard.provoke']);
    expect(doorForkView(c, 'durability')!.steps[0]).toMatchObject({ picked: 'fork.guard.provoke', pending: false });
    expect(() => s.act({ type: 'door/pick', charId: id, door: 'durability', option: 'fork.guard.cover_them' } as Action)).toThrow(/No Durability choice is open/);
    c.skills.ingenuity = 10;
    const shelf = (forksJ as any).items.find((x: any) => x.shelved); // rules 1.74: Ingenuity's options are built now; a shelved row, if any is left, is refused
    if (shelf) { (c.skills as any)[shelf.door] = 10; expect(() => s.act({ type: 'door/pick', charId: id, door: shelf.door, option: shelf.id } as Action)).toThrow(/No such choice/); }
    c.skills.durability = FORK2('durability');
    expect(() => s.act({ type: 'door/pick', charId: id, door: 'durability', option: 'fork.pressure.lockdown' } as Action)).toThrow(/No such choice/);
    const f = fightWith([{ skills: { durability: 4 } }], [{}]);
    expect(() => f.act({ type: 'door/pick', charId: f.pc.charId, door: 'durability', option: 'fork.guard.provoke' } as Action)).toThrow(/after the fight/);
  });
  it('a picked option is held (a door verb, requires door_pick) and the other is not; door_pick / no_door_pick read the pick (N2)', () => {
    const f = fightWith([{ skills: { durability: FORK2('durability') }, picks: ['fork.guard.cover_them', 'fork.guard.stand_fast'] }], [{}]);
    const verbs = withGame(f.g, () => heldOfChar(f.g.characters[f.pc.charId]).verbs || []);
    expect(verbs).toContain('fork.guard.cover_them'); expect(verbs).toContain('fork.guard.stand_fast');
    expect(verbs).not.toContain('fork.guard.provoke'); expect(verbs).not.toContain('fork.guard.drive');
  });
  it('a two-door character (Durability and Dexterity at their second fork, 8) holds four picks; they survive a save and a level-up', () => {
    const picks = ['fork.guard.provoke', 'fork.guard.drive', 'fork.pressure.walk_it_in', 'fork.pressure.lockdown'];
    const s = storyWith([{ skills: { durability: FORK2('durability'), dexterity: FORK2('dexterity') }, attrs: { endurance: FORK2('durability'), agility: FORK2('dexterity') }, level: 9, picks }]), id = s.chars[0].id;
    let c = s.g.characters[id];
    expect([...c.doorPicks.durability, ...c.doorPicks.dexterity].sort()).toEqual([...picks].sort());
    expect(doorForkViews(c).filter((v) => v.picked.length).map((v) => [v.door, v.picked.length])).toEqual([['durability', 2], ['dexterity', 2]]);
    // a save: written and loaded as the client does
    const g2 = migrateLoaded(JSON.parse(JSON.stringify(s.g)));
    expect(g2.characters[id].doorPicks).toEqual(c.doorPicks);
    expect(doorForkViews(g2.characters[id]).reduce((n, v) => n + v.pending, 0)).toBe(0);
    // a level-up spend (a skill point through the reducer) keeps them
    c.unspent = { ...(c.unspent || {}), skill: 1 };
    s.act({ type: 'levelup/raise', charId: id, kind: 'skill', id: 'athletics' } as Action);
    c = s.g.characters[id];
    expect([...c.doorPicks.durability, ...c.doorPicks.dexterity].sort()).toEqual([...picks].sort());
  });
});

// ============================================================================================ Figments' forks at 4 and 6
describe('Figments\' forks move to 4 and 6 (spec 2.9): old saves', () => {
  it('a 0.29.0 character that picked at 3 and 5 keeps both forms; at 4 the new fork (rules 1.74 item 6041) is what opens, never a form', () => {
    const s = storyWith([{ skills: { visualization: 5 }, forms: ['wall', 'beast'] }]), id = s.chars[0].id;
    const g = migrateLoaded(JSON.parse(JSON.stringify(s.g))); const c = g.characters[id];
    expect(c.figRev).toBe(FIG_REV);
    expect(formsOf(c)).toEqual(expect.arrayContaining(['wall', 'beast']));
    for (const p of [4, 5, 6]) { c.skills.visualization = p; expect(JSON.stringify(pendingDoorPicks(c, 'visualization')).match(/"(wall|beast|eye|blade|husk|ward|sentinel|hand|double|snare)"/), 'at ' + p).toBeNull(); }
  });
  it('a 0.29.0 character at Visualization 5 that picked at the old fork: its pick is learned at figment_forms (rules 1.70 item 5541); the fork at 4 is Hard Light or Sharp Light (rules 1.74 item 6041)', () => {
    const s = storyWith([{ skills: { visualization: 5 } }]), id = s.chars[0].id;
    const old = JSON.parse(JSON.stringify(s.g)); old.characters[id].figRev = 1; old.characters[id].doorPicks = { visualization: ['eye'] };
    const c = migrateLoaded(old).characters[id];
    expect(formsOf(c)).toContain('eye');
    expect(doorForkView(c, 'visualization')!.steps.map((s: any) => s.at)).toEqual([4, 8]);
  });
  it('the 0.28.2 Rigger save (no fork stamp, Visualization 5) loads, holds the Eye, the Wall, the Beast and the Blade, and plays on', () => {
    const g0 = migrateLoaded(JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/save-0.28.2-rigger-mid-fight.json', import.meta.url)), 'utf8')));
    let g = apply(g0, { type: 'player/online', id: 'host', online: true } as any, 'host');
    const c = g.characters.c1;
    for (const f of ['eye', 'wall', 'beast', 'blade']) expect(formsOf(c)).toContain(f);
    expect(pendingDoorPicks(c, 'figment_forms')).toEqual([]); // rules 1.70 item 5541: the count is full
    const pc = g.combat.units.find((u: any) => u.charId === 'c1'), wall = g.combat.units.find((u: any) => u.owned?.kind === 'figment' && u.name === 'Wall');
    g = apply(g, { type: 'combat/owned', unitId: pc.id, owned: wall.id, verb: 'figment_cash_in' } as any, 'host');
    expect(g.combat.units.some((u: any) => u.id === wall.id)).toBe(false);
    expect(() => viewFor(g, 'host')).not.toThrow();
  }, 60_000);
});

// ============================================================================================ Guard (Durability)
const tank = (picks: string[], pts = 4): CharSpec => ({ name: 'Tank', skills: { durability: pts }, attrs: { endurance: pts }, level: pts + 2, weapon: 'sabre', picks });
describe('Guard, the first fork: Provoke and Cover Them', () => {
  function provoke(picks: string[], guard = 3) {
    const f = fightWith([tank(picks)], [{ at: 'F6' }, { at: 'G6' }]);
    const me = big(f, at(f, f.pc, '4,2')); f.unit(me.id).res.guard = guard;
    const [a, b] = f.foes; at(f, a, '5,2'); at(f, b, '4,3'); for (const x of [a, b]) { big(f, x); f.unit(x.id).attack = 60; f.unit(x.id).conds = {}; }
    SAVES = 'pass'; // Provoke's Taunt takes no save: it lands anyway
    blow(f, a, me); blow(f, b, me);
    return { f, a: f.unit(a.id), b: f.unit(b.id) };
  }
  it('Provoke: the first foe a round whose blow lands on your plates is Taunted by you, no save; the second is not', () => {
    const r = provoke(['fork.guard.provoke']);
    expect(condOn(r.a, 'taunted')).toBe(true); expect(condOn(r.b, 'taunted')).toBe(false);
  });
  it('Provoke runs on plates: with no Guard nobody is Taunted; Cover Them\'s holder Taunts nobody', () => {
    expect(condOn(provoke(['fork.guard.provoke'], 0).a, 'taunted')).toBe(false);
    expect(condOn(provoke(['fork.guard.cover_them']).a, 'taunted')).toBe(false);
  });
  function cover(picks: string[], o: { guard?: number; melee?: boolean } = {}) {
    const f = fightWith([tank(picks), { name: 'Back', weapon: 'service_pistol' }], [{ at: 'P6', weapon: o.melee ? 'combat_knife' : 'service_pistol' }]);
    const me = big(f, at(f, f.pc, '4,2')), ally = big(f, at(f, f.pcs[1], '4,4')); f.unit(me.id).res.guard = o.guard ?? 3;
    const foe = big(f, at(f, f.foe, o.melee ? '4,5' : '9,4')); f.unit(foe.id).attack = 60; f.unit(me.id).marginsTaken = f.unit(ally.id).marginsTaken = -99; // rules 1.96: attack 60 makes every hit land; the fixture's hits count no Margins
    return { f, me, ally, foe };
  }
  it('Cover Them: a ranged hit on an ally within reach lands on the tank (a Guard spent, the reaction used), once a round', () => {
    const r = cover(['fork.guard.cover_them']), within = FK['fork.guard.cover_them'].effects[0].if.target_within;
    expect(within).toBe(2);
    const hp = r.ally.hp, g0 = r.f.unit(r.me.id).res.guard;
    blow(r.f, r.foe, r.ally);
    expect(r.f.unit(r.ally.id).hp).toBe(hp);
    expect(r.f.unit(r.me.id).res.guard).toBeLessThan(g0);
    expect(r.f.cb.log.some((l: any) => /Cover Them/.test(String(l)))).toBe(true);
    blow(r.f, r.foe, r.ally); // the second ranged hit of the round lands on the ally
    expect(r.f.unit(r.ally.id).hp).toBeLessThan(hp);
  });
  it('rules 1.70 item 5547 (P6): Cover Them\'s Guard cost reads techniques.json rules.guard.interpose_cost (one copy)', () => {
    const G: any = (techniquesJ as any).rules.guard, was = G.interpose_cost;
    const spent = () => { const r = cover(['fork.guard.cover_them'], { guard: 6 }), g0 = r.f.unit(r.me.id).res.guard; blow(r.f, r.foe, r.ally); return g0 - r.f.unit(r.me.id).res.guard; };
    try {
      const one = spent(); G.interpose_cost = was + 1; const two = spent();
      expect(two - one).toBe(1);
    } finally { G.interpose_cost = was; }
  });
  it('Cover Them takes no melee hit, nothing with no Guard, and Provoke\'s holder covers nobody', () => {
    for (const [picks, o] of [[['fork.guard.cover_them'], { melee: true }], [['fork.guard.cover_them'], { guard: 0 }], [['fork.guard.provoke'], {}]] as const) {
      const r = cover(picks as any, o as any), hp = r.ally.hp;
      blow(r.f, r.foe, r.ally, (o as any).melee ? 'melee' : 'shot');
      expect(r.f.unit(r.ally.id).hp, JSON.stringify([picks, o])).toBeLessThan(hp);
    }
  });
});

describe('Guard, the second fork: Stand Fast and Drive (Slam\'s paired rows read the pick)', () => {
  function slam(picks: string[], saves: 'pass' | 'fail') {
    const f = fightWith([tank(picks, FORK2('durability'))], [{ at: 'F6' }, { at: 'G6' }, { at: 'H6' }]);
    const me = big(f, at(f, f.pc, '5,5')); f.turn(me); f.unit(me.id).res.guard = 4; f.unit(me.id).ap = 6;
    const [a, b, c] = f.foes; at(f, a, '6,5'); at(f, b, '7,3'); at(f, c, '10,5'); for (const x of f.foes) { big(f, x); f.unit(x.id).conds = {}; }
    SAVES = saves;
    f.act({ type: 'combat/perk', unitId: me.id, id: 'skill:durability.1', actionId: 'guard_slam' } as Action);
    SAVES = null;
    return { f, me: f.unit(me.id), a: f.unit(a.id), b: f.unit(b.id), c: f.unit(c.id) };
  }
  it('Stand Fast: every foe within reach Taunted with no save (they passed every save), nobody pushed; Slam\'s Guard price unchanged; no plate back', () => {
    const r = slam(['fork.guard.stand_fast'], 'pass'), price = SLAM().res.guard;
    expect(FK['fork.guard.stand_fast'].numbers.within).toBe(2);
    expect(condOn(r.a, 'taunted')).toBe(true); expect(condOn(r.b, 'taunted')).toBe(true); expect(condOn(r.c, 'taunted')).toBe(false);
    expect([r.a.pos, r.b.pos]).toEqual(['6,5', '7,3']);
    expect(r.me.res.guard).toBe(4 - price);
  });
  it('Stand Fast: a foe within 2 that fails Slam\'s save is Off Balance too', () => {
    const r = slam(['fork.guard.stand_fast'], 'fail');
    expect(condOn(r.b, 'off_balance')).toBe(true); expect([r.a.pos, r.b.pos]).toEqual(['6,5', '7,3']);
  });
  it('Drive: Slam pushes its foe 2 tiles; each foe knocked Off Balance gives a plate back; no Taunt', () => {
    const r = slam(['fork.guard.drive'], 'fail'), price = SLAM().res.guard;
    expect(r.a.pos).toBe('8,5'); expect(condOn(r.a, 'off_balance')).toBe(true); expect(condOn(r.a, 'taunted')).toBe(false);
    expect(r.me.res.guard).toBe(4 - price + 1);
  });
  it('neither: the plain Slam (1 tile, Off Balance, no Taunt)', () => {
    const r = slam([], 'fail');
    expect(r.a.pos).toBe('7,5'); expect(condOn(r.a, 'taunted')).toBe(false);
  });
});

// ============================================================================================ Momentum (Raw Power)
describe('Momentum, the first fork: Rolling Start and Grindstone', () => {
  const charger = (picks: string[]) => physFight([{ weapon: 'sabre', known: ['charge'], skills: { raw_power: 4, athletics: 4 }, attrs: { strength: 4 }, level: 6, picks }], [{ at: '8,4', tier: 'elite' }]);
  it('Rolling Start: a Charge from a 2-tile straight run (N23 tech_num) costs its Momentum (rules 1.73 item 5805: no free Charge) and builds 1 on a hit', () => {
    const RS = FK['fork.momentum.rolling_start'];
    expect(RS.effects.some((e: any) => String(e.stat).startsWith('momentum_cost:'))).toBe(false);
    const f = charger(['fork.momentum.rolling_start']); f.cb.objects = [];
    const u = f.turn(f.pc); f.put(u, '5,4'); f.put(f.foe, '8,4'); big(f, f.foe); f.unit(u.id).ap = 9; f.unit(u.id).openerUsed = true; f.momentum(u, 1);
    rig({ hit: true, die: 12 });
    expect(f.tech('charge', { targetId: f.foe.id })).toBeNull();
    expect(f.momentum(f.unit(u.id))).toBe(1 - 1 + RS.effects[1].value); // the Opener's 1, then the hit's build
    const g = charger(['fork.momentum.rolling_start']); g.cb.objects = [];
    const w = g.turn(g.pc); g.put(w, '5,4'); g.put(g.foe, '8,4'); big(g, g.foe); g.unit(w.id).ap = 9; g.unit(w.id).openerUsed = true; g.momentum(w, 0);
    expect(g.tech('charge', { targetId: g.foe.id })).toMatch(/Needs 1 Momentum/); // at x0 the loop is closed
  });
  it('without it (Grindstone held), the 2-tile run is refused', () => {
    const f = charger(['fork.momentum.grindstone']); f.cb.objects = [];
    const u = f.turn(f.pc); f.put(u, '5,4'); f.put(f.foe, '8,4'); f.unit(u.id).ap = 9;
    expect(f.tech('charge', { targetId: f.foe.id })).toMatch(/straight run of 3/);
  });
  it('Grindstone: a plain hit on the foe you hit last builds one more; Rolling Start\'s holder builds the plain 1', () => {
    for (const [picks, extra] of [[['fork.momentum.grindstone'], FK['fork.momentum.grindstone'].effects[0].value], [['fork.momentum.rolling_start'], 0]] as const) {
      const f = physFight([{ weapon: 'sabre', skills: { raw_power: 4 }, level: 6, picks: picks as any }], [{ at: '6,4', tier: 'elite' }]); f.cb.objects = [];
      const u = f.turn(f.pc); f.put(u, '5,4'); f.put(f.foe, '6,4'); big(f, f.foe); f.unit(u.id).ap = 9; f.momentum(u, 0); rig({ hit: true, die: 12 });
      expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.unit(u.id))).toBe(1);
      expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.unit(u.id)), picks[0]).toBe(2 + extra);
    }
  });
});

// ============================================================================================ Momentum's second fork (rules 1.73)
describe('Momentum, the second fork at 8: Spill and Headlong (rules 1.73 items 5806, 5807)', () => {
  const at8 = (picks: string[], foes: any[]) => physFight([{ weapon: 'sabre', known: ['coup', 'charge'], skills: { raw_power: 8, athletics: 4, dexterity: 6 }, attrs: { strength: 8 }, level: 12, picks }], foes);
  it('the step is offered at 8 with both options built', () => {
    const s = storyWith([{ skills: { raw_power: 8 }, attrs: { strength: 8 }, level: 12, picks: ['fork.momentum.grindstone'] }]), c = s.g.characters[s.chars[0].id];
    const v = doorForkView(c, 'raw_power')!; expect(v.steps[1].offered).toBe(true); expect(v.steps[1].missing).toEqual([]);
    s.act({ type: 'door/pick', charId: c.id, door: 'raw_power', option: 'fork.momentum.spill' } as Action);
    expect(s.g.characters[c.id].doorPicks.raw_power).toEqual(['fork.momentum.grindstone', 'fork.momentum.spill']);
  });
  it('Spill: a Coup that drops its foe carries the blow into one foe beside it, no roll; without the pick, or with no kill, nothing', () => {
    const run = (picks: string[], hp: number) => {
      const f = at8(picks, [{ at: '6,4', tier: 'soldier' }, { at: '7,4', tier: 'soldier' }]); f.cb.objects = [];
      const u = f.turn(f.pc); f.put(u, '5,4'); f.put(f.foes[0], '6,4'); f.put(f.foes[1], '7,4');
      f.unit(f.foes[0].id).hp = hp; f.unit(f.foes[0].id).maxHp = 5000; big(f, f.foes[1]); f.unit(u.id).ap = 9; f.momentum(u, 3); rig({ hit: true, die: 12 });
      expect(f.tech('coup', { targetId: f.foes[0].id })).toBeNull(); rig(null);
      return { other: 9999 - f.unit(f.foes[1].id).hp, f };
    };
    const yes = run(['fork.momentum.spill'], 1);
    expect(yes.other).toBeGreaterThan(0); expect(yes.f.cb.log.some((l: any) => /\(Spill\)/.test(String(l)))).toBe(true);
    expect(run(['fork.momentum.headlong'], 1).other).toBe(0);
    expect(run(['fork.momentum.spill'], 5000).other).toBe(0);
  });
  it('Headlong: once a turn a Charge’s strike costs no AP (its run is paid as usual) but 2 more Momentum, and builds none', () => {
    const HL = FK['fork.momentum.headlong'];
    const plain = at8(['fork.momentum.spill'], [{ at: '9,4', tier: 'elite' }]); plain.cb.objects = [];
    const p0 = plain.turn(plain.pc); plain.put(p0, '5,4'); plain.put(plain.foe, '9,4'); plain.unit(p0.id).openerUsed = true; plain.momentum(p0, 5);
    const full = plain.pv('charge', { targetId: plain.foe.id }).ap;
    const f = at8(['fork.momentum.headlong'], [{ at: '9,4', tier: 'elite' }, { at: '9,8', tier: 'elite' }]); f.cb.objects = [];
    const u = f.turn(f.pc); f.put(u, '5,4'); f.put(f.foes[0], '9,4'); f.put(f.foes[1], '9,8'); big(f, f.foes[0]); big(f, f.foes[1]);
    f.unit(u.id).ap = 9; f.unit(u.id).openerUsed = true; f.momentum(u, 5); rig({ hit: true, die: 12 });
    const pv = f.pv('charge', { targetId: f.foes[0].id }); expect(pv.ap).toBeLessThan(full);
    expect(f.tech('charge', { targetId: f.foes[0].id })).toBeNull();
    expect(f.unit(u.id).ap).toBe(9 - pv.ap); // the run only
    expect(f.momentum(f.unit(u.id))).toBe(5 - 1 + HL.effects[1].and[0].value); // the Opener's 1 and Headlong's 2, nothing built
    expect(condOn(f.unit(u.id), 'headlong_paid')).toBe(false); // the mark ends with the action
    f.put(f.unit(u.id), '5,8'); f.momentum(f.unit(u.id), 5); f.unit(u.id).ap = 9;
    expect(f.tech('charge', { targetId: f.foes[1].id })).toMatch(/Opener/); // a second Charge in a turn is no Opener: once a turn holds by itself
  });
  it('Headlong needs the Momentum: under it the Charge pays its AP as usual, and a Breaker\u2019s Charge Carries builds as usual', () => {
    const f = at8(['fork.momentum.headlong'], [{ at: '9,4', tier: 'elite' }]); f.cb.objects = [];
    const u = f.turn(f.pc); f.put(u, '5,4'); f.put(f.foe, '9,4'); big(f, f.foe); f.unit(u.id).ap = 9; f.unit(u.id).openerUsed = true; f.momentum(u, 1);
    const plain = at8(['fork.momentum.spill'], [{ at: '9,4', tier: 'elite' }]); plain.cb.objects = [];
    const p0 = plain.turn(plain.pc); plain.put(p0, '5,4'); plain.put(plain.foe, '9,4'); plain.unit(p0.id).openerUsed = true; plain.momentum(p0, 1);
    expect(f.pv('charge', { targetId: f.foe.id }).ap).toBe(plain.pv('charge', { targetId: plain.foe.id }).ap);
  });
});

// ============================================================================================ Pressure (Dexterity)
describe('Pressure\'s forks: Converging Fire, Walk It In, Through the Gap, Lockdown', () => {
  const gun = (picks: string[], name = 'Gun'): CharSpec => ({ name, weapon: 'hellraiser_service_rifle', skills: { dexterity: FORK2('dexterity') }, attrs: { agility: FORK2('dexterity') }, level: 6, picks });
  function setUp(specs: CharSpec[], tier = 'soldier') {
    const f = physFight(specs as any, [{ weapon: 'combat_knife', at: '10,4', tier }]); f.cb.objects = [];
    f.pcs.forEach((u, i) => { at(f, u, '4,' + (2 + 2 * i)); big(f, u); }); at(f, f.foe, '10,4'); big(f, f.foe); f.unit(f.foe.id).conds = {};
    return f;
  }
  const shoot = (f: any, u: Unit, hit = true) => { const x = f.turn(u); f.unit(x.id).attack = hit ? 60 : -100; f.unit(x.id).heat = 0; f.unit(x.id).ap = 9; f.act({ unitId: x.id, type: 'combat/attack', targetId: f.foe.id, mode: 'shot' } as any); };
  it('Converging Fire: an ally\'s ranged hit on a foe you hit this round adds 1 more Pressure; Walk It In\'s holder adds none', () => {
    const laid: number[] = [];
    for (const picks of [['fork.pressure.converging_fire'], ['fork.pressure.walk_it_in']]) {
      const f = setUp([gun(picks), { name: 'Ally', weapon: 'hellraiser_service_rifle', skills: { dexterity: 1 }, level: 6 }]);
      shoot(f, f.pcs[0]); const p0 = f.pressure(f.foe);
      shoot(f, f.pcs[1]); laid.push(f.pressure(f.foe) - p0);
    }
    expect(laid[0] - laid[1]).toBe(FK['fork.pressure.converging_fire'].effects[0].value);
  });
  it('Walk It In: a ranged miss still lays 1 Pressure (once a turn for each foe); Converging Fire\'s holder lays none on a miss', () => {
    const laid: number[] = [];
    for (const picks of [['fork.pressure.walk_it_in'], ['fork.pressure.converging_fire']]) {
      const f = setUp([gun(picks)]); const p0 = f.pressure(f.foe);
      shoot(f, f.pcs[0], false); const u = f.unit(f.pcs[0].id); f.unit(u.id).heat = 0; f.act({ unitId: u.id, type: 'combat/attack', targetId: f.foe.id, mode: 'shot' } as any);
      laid.push(f.pressure(f.foe) - p0);
    }
    expect(laid[0] - laid[1]).toBe(FK['fork.pressure.walk_it_in'].effects[0].value);
  });
  function toCap(picks: string[], tier: string) {
    const f = setUp([gun(picks)], tier); const cap = pressureCap(f.unit(f.foe.id));
    f.press(f.foe, cap - 1);
    shoot(f, f.pcs[0]);
    return { f, u: f.unit(f.pcs[0].id), foe: f.unit(f.foe.id), cap };
  }
  for (const tier of ['soldier', 'elite', 'boss']) it('Through the Gap (' + tier + ': its own cap, N10 at: max): the next move costs 1 AP less and draws no opportunity attack; Lockdown\'s holder pays', () => {
    const spent: number[] = [];
    for (const picks of [['fork.pressure.through_the_gap'], ['fork.pressure.lockdown']]) {
      const r = toCap(picks, tier); expect(r.foe.pressure ?? pressureOf(r.foe)).toBe(r.cap);
      const ap = r.f.unit(r.u.id).ap; r.f.act({ unitId: r.u.id, type: 'combat/move', to: '3,2' } as any);
      spent.push(ap - r.f.unit(r.u.id).ap);
    }
    expect(spent[1] - spent[0]).toBe(-FK['fork.pressure.through_the_gap'].effects[3].value);
  });
  for (const tier of ['soldier', 'boss']) it('Lockdown (' + tier + '): a foe your hit takes to its cap is Slowed, no save; Through the Gap\'s holder Slows nobody', () => {
    SAVES = 'pass';
    expect(condOn(toCap(['fork.pressure.lockdown'], tier).foe, 'slowed')).toBe(true);
    expect(condOn(toCap(['fork.pressure.through_the_gap'], tier).foe, 'slowed')).toBe(false);
  });
});

// ============================================================================================ Bonds (Empathy)
function bondRig(picks: string[], o: { empathy?: number; doorPicks?: Record<string, string[]>; mender?: boolean } = {}) {
  const s: any = storyWith([{ name: 'Medic', level: 6, skills: { empathy: o.empathy ?? 4 }, attrs: { insight: 4 }, weapon: 'service_pistol', picks, ...(o.mender ? { classId: 'bard' } : {}), ...(o.doorPicks ? { doorPicks: o.doorPicks } : {}) }, { name: 'Gun', level: 6 }]);
  s.g.characters[s.chars[0].id].offHand = { id: 'attuner' };
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight', combat: { name: 'Bonds', map: 'yard16', difficulty: 'standard', level: 6,
    enemies: [{ name: 'Soldier 1', tier: 'soldier', weapon: 'service_pistol', at: '', no_surrender: true, level: 6 }] } } });
  const cb = () => s.g.combat, U = (id: string) => cb().units.find((u: any) => u.id === id);
  const me = cb().units.find((u: any) => u.name === 'Medic'), al = cb().units.find((u: any) => u.name === 'Gun'), foe = cb().units.find((u: any) => u.side === 'foe');
  me.pos = '3,5'; al.pos = '3,7'; foe.pos = '9,5'; foe.hp = foe.maxHp = 9999; al.hp = 1;
  const c = cb(); c.turn = c.order.indexOf(me.id); delete c.window; withGame(s.g, () => beginTurn(c, s.g.rng)); U(me.id).ap = 12; U(me.id).mg.mp = 900;
  const act = (id: string, t: any, actionId?: string) => { try { s.act({ type: 'combat/perk', unitId: me.id, id, ...(actionId ? { actionId } : {}), targetId: t.id }); return null; } catch (e: any) { return String(e?.message || e); } };
  const bond = (t: any) => { const x = U(t.id); x.sv = { heart: -99, body: -99, brain: -99 }; for (let i = 0; i < 6 && !tiesOf(cb(), U(me.id), 'bond', 'from').some((k: any) => k.to === t.id); i++) { U(me.id).ap = 12; expect(act('verb:tend.bond', U(t.id))).toBeNull(); } };
  return { s, cb, U, me, al, foe, act, bond };
}
describe('Bonds, the first fork: Keep the Thread and Short Thread', () => {
  it('Keep the Thread: the Snap costs Tug\'s MP, gives no Daze, and the Bond holds; Short Thread\'s holder snaps it as before', () => {
    for (const [picks, kept] of [[['fork.tend.keep_the_thread'], true], [['fork.tend.short_thread'], false]] as const) {
      const r = bondRig(picks as any); r.bond(r.foe);
      const mp = r.U(r.me.id).mg.mp, n = r.cb().log.length; SAVES = 'fail';
      expect(r.act('verb:tend.snap', r.U(r.foe.id))).toBeNull(); SAVES = null;
      expect(mp - r.U(r.me.id).mg.mp, picks[0]).toBe(kept ? grant('tend.tug').res.mp : 0);
      expect(r.cb().log.slice(n).some((l: any) => / is Dazed/.test(String(l))), picks[0]).toBe(!kept); // (a Daze is spent at once: the log says it landed)
      expect(tiesOf(r.cb(), r.U(r.me.id), 'bond', 'from').some((k: any) => k.to === r.foe.id), picks[0]).toBe(kept);
    }
  });
  it('Keep the Thread is for a foe: a Snap on a Bonded ALLY still heals and ends the Bond (it cannot repeat every turn)', () => {
    const r = bondRig(['fork.tend.keep_the_thread']); r.bond(r.al); r.U(r.al.id).hp = 1;
    expect(r.act('verb:tend.snap', r.U(r.al.id))).toBeNull();
    expect(r.U(r.al.id).hp).toBeGreaterThan(1);
    expect(tiesOf(r.cb(), r.U(r.me.id), 'bond', 'from').some((k: any) => k.to === r.al.id)).toBe(false);
  });
  it('Short Thread: the Mender\'s Triage reaches a friend 2 tiles away (rules 1.75 item 6212: Touch is cut); Keep the Thread\'s holder is refused', () => {
    const healed: number[] = [];
    for (const picks of [['fork.tend.short_thread'], ['fork.tend.keep_the_thread']]) {
      const r = bondRig(picks, { mender: true });
      const hp = r.U(r.al.id).hp, err = r.act('class:medic.triage', r.U(r.al.id), 'triage');
      if (picks[0] === 'fork.tend.short_thread') { expect(err).toBeNull(); healed.push(r.U(r.al.id).hp - hp); }
      else expect(err).toMatch(/range|reach|next to/i);
    }
    expect(healed[0]).toBeGreaterThan(0);
  });
  it('Short Thread: a Mend on a Bonded ally within 2 tiles is x near (1.4), beyond 2 the Bond x through (1.2), as data', () => {
    const FS: any = FK['fork.tend.short_thread'], near = FS.numbers.near, through = FS.numbers.through, within = FS.effects[0].if.target_within;
    const mend = (picks: string[], pos: string) => { const r = bondRig(picks); r.bond(r.al); r.U(r.al.id).pos = pos; r.U(r.al.id).hp = 1; r.U(r.me.id).ap = 12;
      expect(r.act('verb:tend.mend', r.U(r.al.id))).toBeNull(); return r.U(r.al.id).hp - 1; };
    const nearPos = '3,' + (5 + within), farPos = '3,' + (5 + within + 3);
    const sNear = mend(['fork.tend.short_thread'], nearPos), sFar = mend(['fork.tend.short_thread'], farPos), kNear = mend(['fork.tend.keep_the_thread'], nearPos);
    expect(sFar).toBe(kNear); // beyond 2 tiles Short Thread adds nothing: the Bond's own x through, as for anyone
    expect(Math.abs(sNear - kNear * near / through)).toBeLessThanOrEqual(1); // within 2: x near in place of x through (whole HP)
    expect(sNear).toBeGreaterThan(kNear);
  });
  it('no fork makes a Mend free: with Short Thread the second Mend on one ally in a round costs its MP again, braked', () => {
    const r = bondRig(['fork.tend.short_thread']); r.bond(r.al); r.U(r.al.id).hp = 1;
    const mp0 = r.U(r.me.id).mg.mp; expect(r.act('verb:tend.mend', r.U(r.al.id))).toBeNull();
    const first = mp0 - r.U(r.me.id).mg.mp; r.U(r.me.id).ap = 12; r.U(r.al.id).hp = 1;
    const mp1 = r.U(r.me.id).mg.mp; expect(r.act('verb:tend.mend', r.U(r.al.id))).toBeNull();
    expect(first).toBeGreaterThan(0); expect(mp1 - r.U(r.me.id).mg.mp).toBe(Math.round(first * (RULESJ as any).mending.brake.mult)); // the healing brake (item 4640, spec 5610: built in the 0.32 merge): the second give x mult
  });
});

// ============================================================================================ built, in a step not offered yet
// Spotter and Shared Pulse are built (their rules need only existing pieces) but their steps are not offered (the other
// option waits on a primitive): no door/pick reaches them yet, so these tests give the pick as a save would carry it.
describe('built options whose step is not offered yet (the pick as a save carries it)', () => {
  it('Spotter: while Hidden, an ally\'s weapon hit on a Marked foe lands as an ambush and costs a Shadow; with no Shadow, nothing', () => {
    for (const shadow of [1, 0]) {
      const f = fightWith([{ name: 'Op', skills: { ingenuity: 6 }, attrs: { perception: 6 }, level: 6, weapon: 'service_pistol', doorPicks: { ingenuity: ['fork.shadow.spotter'] } }, { name: 'Gun', weapon: 'hellraiser_service_rifle', level: 6 }], [{ at: 'P6' }]);
      const op = at(f, f.pcs[0], '2,2'), gun = big(f, at(f, f.pcs[1], '4,6')), foe = big(f, at(f, f.foe, '9,6'));
      withGame(f.g, () => { applyCond(f.cb, f.g.rng, f.unit(op.id), f.unit(foe.id), 'marked', undefined, undefined, { skipSave: true }); applyCond(f.cb, f.g.rng, f.unit(op.id), f.unit(op.id), 'hidden', undefined, undefined, { skipSave: true }); });
      f.unit(op.id).res = { ...(f.unit(op.id).res || {}), shadow };
      const x = f.turn(gun); f.unit(x.id).attack = 60; const n = f.cb.log.length;
      f.act({ unitId: x.id, type: 'combat/attack', targetId: foe.id, mode: 'shot' } as any);
      expect(f.cb.log.slice(n).some((l: any) => /\(Spotter\)/.test(String(l))), 'shadow ' + shadow).toBe(shadow > 0);
      expect(f.unit(op.id).res.shadow).toBe(0);
    }
  });
  it('Shared Pulse: a Mend on a Bonded ally also heals every ally on the Medic\'s Bonds', () => {
    for (const picked of [true, false]) {
      const r = bondRig([], { empathy: 6, ...(picked ? { doorPicks: { empathy: ['fork.tend.shared_pulse'] } } : {}) });
      r.bond(r.al); r.U(r.al.id).hp = 1;
      expect(r.act('verb:tend.mend', r.U(r.al.id))).toBeNull();
      // the Medic is not on its own Bonds; the Mend's own target gets the pulse too ("the target too")
      expect(r.cb().log.some((l: any) => /Shared Pulse/.test(String(l))), 'picked ' + picked).toBe(picked);
    }
  });
});
