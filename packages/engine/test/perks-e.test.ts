// Lane E (command, AP economy, team, medic): every item at every tier, in play. Player actions go through the reducer
// (apply: combat/perk, combat/attack, combat/move, combat/end-turn, story/perk, narrator/turn, check/roll); what enemies
// and the world do goes through the engine functions their turns use (resolveAttack, applyDamage, applyCond), with the
// game bound.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import { applyDamage, applyCond, resolveAttack, previewAttack as pv0, healUnit, condOn, condArg, d20, beginTurn, type Unit, type Combat } from '../src';
import { fightWith, storyWith, withGame, rng } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const sure = (u: Unit) => { u.attack = 60; };
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
const pcAct = (f: F, a: any, u?: Unit) => f.act({ unitId: (u || f.pc).id, ...a });
/** A seed whose next d20 is n. */
function rngFor(n: number): number { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return s; } throw new Error('no seed'); }
/** A preview with the attacker's AP out of the way (the attacker isn't on its turn). */
const previewAttack = (cb: Combat, att: Unit, tgt: Unit, mode: any) => { const k = att.ap; att.ap = 9; try { return pv0(cb, att, tgt, mode); } finally { att.ap = k; } };
/** A seed whose next two d20s pass these tests. */
function seq(p1: (n: number) => boolean, p2: (n: number) => boolean): number { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (p1(d20(r)) && p2(d20(r))) return s; } throw new Error('no seed'); }
const weakSaves = (u: Unit) => { u.sv = { body: -50, brain: -50, heart: -50 }; };
/** A Narrator check on a character, then roll it. */
function storyCheck(s: { act: any; g: any }, charId: string, skills: string[], extra: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Try it.', checks: [{ charId, skills, tn: 12, stakes: 'It works.', ...extra }] } } as any);
  const ck = s.g.checks.filter((k: any) => !k.roll).at(-1)!;
  s.act({ type: 'check/roll', checkId: ck.id });
  return s.g.story.entries.filter((e: any) => e.kind === 'check').at(-1)!.head as string;
}
/** A story first, then a fight on the yard (before() runs in the story). */
function fightAfter(specs: any[], foes: any[], before: (s: ReturnType<typeof storyWith>) => void) {
  const s = storyWith(specs); before(s);
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Test fight', map: 'yard16', difficulty: 'standard', enemies: foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), tier: f.tier || 'soldier', weapon: 'service_pistol', at: f.at || '' })) } } } as any);
  const box: any = s;
  const api = {
    get g() { return box.g; }, get cb(): Combat { return box.g.combat; },
    get pc(): Unit { return box.g.combat.units.find((u: Unit) => u.side === 'pc'); },
    get pcs(): Unit[] { return box.g.combat.units.filter((u: Unit) => u.side === 'pc'); },
    get foes(): Unit[] { return box.g.combat.units.filter((u: Unit) => u.side === 'foe'); },
    unit: (id: string): Unit => box.g.combat.units.find((u: Unit) => u.id === id),
    act: (a: any, by = 'host') => s.act(a, by),
    turn(u: Unit) { const cb = box.g.combat; cb.turn = cb.order.indexOf(u.id); delete cb.window; withGame(box.g, () => beginTurn(cb, box.g.rng)); return api.unit(u.id); },
  };
  return api;
}
const charIds = (g: any) => Object.keys(g.characters);

// ======================================================================================================== Grim Reaper
describe('Grim Reaper', () => {
  it('I: −1 AP on the first turn; a kill on your turn gives +2 AP at once, once a turn', () => {
    const f = fightWith([{ perks: { grim_reaper: 'I' } }], [{ at: 'F6' }, { at: 'G6' }]); open(f.cb);
    f.unit(f.pc.id).ps = {}; let u = f.turn(f.pc); expect(u.ap).toBe(5); // a fresh first turn (the fight may have opened on it)
    const [a, b] = f.foes; sure(f.unit(u.id)); f.unit(a.id).hp = 1; f.unit(b.id).hp = 1;
    pcAct(f, { type: 'combat/attack', targetId: a.id, mode: 'shot' });
    u = f.unit(u.id); expect(f.unit(a.id).dead).toBe(true); expect(u.ap).toBe(5 - 2 + 2);
    pcAct(f, { type: 'combat/attack', targetId: b.id, mode: 'shot' });
    expect(f.unit(u.id).ap).toBe(3); // the second kill this turn gives nothing
    expect(logHas(f.cb, /Grim Reaper/)).toBe(true);
  });
  it('a kill off your turn gives nothing; the second turn has no penalty', () => {
    const f = fightWith([{ perks: { grim_reaper: 'I' } }], [{ at: 'F6' }]); open(f.cb);
    f.turn(f.pc); const u = f.turn(f.pc); expect(u.ap).toBe(6); expect(logHas(f.cb, /Grim Reaper: first turn/)).toBe(true);
    const foe = f.foes[0]; f.unit(foe.id).hp = 1; sure(f.unit(u.id));
    f.cb.turn = f.cb.order.indexOf(foe.id); // the enemy's turn: an Overwatch-style kill
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(u.id), f.unit(foe.id), 'shot', null, { noAp: true }));
    expect(f.unit(foe.id).dead).toBe(true); expect(f.unit(u.id).apNext || 0).toBe(0); expect(f.unit(u.id).ap).toBe(6);
  });
  it('II: no first-turn penalty; enemies who see the kill save against Fear (you are its source)', () => {
    const f = fightWith([{ perks: { grim_reaper: 'II' } }], [{ at: 'F6' }, { at: 'G7' }]); open(f.cb);
    const u = f.turn(f.pc); expect(u.ap).toBe(6);
    const [a, b] = f.foes; sure(f.unit(u.id)); f.unit(a.id).hp = 1; weakSaves(f.unit(b.id));
    f.g.rng.state = seq((r) => r > 1, (r) => r < 20); // the shot lands; the save isn't a natural 20
    pcAct(f, { type: 'combat/attack', targetId: a.id, mode: 'shot' });
    expect(condOn(f.unit(b.id), 'fear')).toBe(true); expect(f.unit(b.id).condBy?.fear).toBe(u.id);
    expect(previewAttack(f.cb, f.unit(b.id), f.unit(u.id), 'shot').why).toMatch(/Afraid/);
  });
});

// ======================================================================================================== Overruled!
describe('Overruled!', () => {
  const setup = (tier: string) => { const f = fightWith([{ perks: { overruled: tier } }], [{ at: 'F6' }]); open(f.cb); f.turn(f.pc); return f; };
  // Rules 1.14 (the AP perks' cooldown): the bonus and the penalty each come at most once every 3 of your turns, so
  // these turns are three rounds apart. The cooldown itself is tested in rules114-engine-first-step.test.ts.
  const turnLater = (f: F, n = 3) => { f.cb.round += n; return f.turn(f.pc); };
  it('I: +2 AP while your Left Brain Debuff holds on an enemy; −2 while you carry one', () => {
    const f = setup('I'), foe = f.foes[0];
    withGame(f.g, () => applyCond(f.cb, rng(), f.unit(f.pc.id), f.unit(foe.id), 'ldebuff', 30, undefined, { skipSave: true }));
    expect(turnLater(f).ap).toBe(8);
    withGame(f.g, () => applyCond(f.cb, rng(), null, f.unit(f.pc.id), 'ldebuff', 30, undefined, { skipSave: true }));
    expect(turnLater(f).ap).toBe(6);
    withGame(f.g, () => applyCond(f.cb, rng(), f.unit(f.pc.id), f.unit(foe.id), 'rdebuff', 30, undefined, { skipSave: true }));
    f.unit(foe.id).conds!.ldebuff = 0; expect(turnLater(f).ap).toBe(4); // a Right Brain Debuff doesn't count at Tier I
  });
  it('II: Right Brain Debuffs count too, and your own penalty is −1', () => {
    const f = setup('II'), foe = f.foes[0];
    withGame(f.g, () => applyCond(f.cb, rng(), f.unit(f.pc.id), f.unit(foe.id), 'rdebuff', 30, undefined, { skipSave: true }));
    expect(turnLater(f).ap).toBe(8);
    withGame(f.g, () => applyCond(f.cb, rng(), null, f.unit(f.pc.id), 'rdebuff', 30, undefined, { skipSave: true }));
    expect(turnLater(f).ap).toBe(7);
  });
  it('the fight\'s Persuade (a non-caster) feeds it', () => {
    const f = setup('I'), foe = f.foes[0]; weakSaves(f.unit(foe.id));
    pcAct(f, { type: 'combat/parley', targetId: foe.id, kind: 'persuade' });
    expect(condOn(f.unit(foe.id), 'ldebuff')).toBe(true);
    expect(f.turn(f.pc).ap).toBe(8);
  });
});

// ======================================================================================================== Blueprint
describe('Blueprint', () => {
  for (const tier of ['I', 'II'] as const) it(tier + ': the sketch gives the squad +' + (tier === 'II' ? 2 : 1) + ' Movement in round 1, and no AP', () => {
    const f = fightAfter([{ perks: { blueprint: tier } }, {}], [{ at: 'P6' }], (s) => s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'blueprint' }));
    open(f.cb);
    const [a, b] = f.pcs, mv = f.unit(b.id).movement;
    const ub = f.turn(f.unit(b.id)); expect(ub.movement).toBe(mv + (tier === 'II' ? 2 : 1)); expect(ub.ap).toBe(6);
    pcAct(f as any, { type: 'combat/end-turn' }, ub);
    expect(f.unit(b.id).movement).toBe(mv);
    f.cb.round = 2; const ua = f.turn(f.unit(a.id)); expect(ua.ap).toBe(6);
    expect(logHas(f.cb, /Blueprint/)).toBe(true);
  });
  it('once a scene; a fight with no sketch gets nothing', () => {
    const s = storyWith([{ perks: { blueprint: 'I' } }]);
    s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'blueprint' });
    expect(() => s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'blueprint' })).toThrow(/Used/);
    const f = fightWith([{ perks: { blueprint: 'II' } }]); const u = f.turn(f.pc); expect(u.ap).toBe(6);
  });
});

// ======================================================================================================== Talks Broke Down
describe('Talks Broke Down', () => {
  const talk = (tier: string, ok: boolean) => fightAfter([{ perks: { talks_broke_down: tier } }], [{ at: 'P6' }, { at: 'P8' }], (s) => storyCheck(s, s.chars[0].id, ['charisma'], { auto: ok ? 'success' : 'fail' }));
  // Rules 1.14 (the AP perks' cooldown): +2 on the first turn and then once every 3 turns (it was every turn).
  /** The holder's turn in round r (the fight may have opened on their turn already: the cooldown starts fresh). */
  const turnIn = (f: ReturnType<typeof talk>, r: number) => { if (r === 1) delete f.unit(f.pc.id).ps!['perk:talks_broke_down'].cd; f.cb.round = r; return f.turn(f.pc).ap; };
  it('I: a won argument before the fight, +2 AP on turns 1, 4 and 7; a lost one, −2 on the same turns', () => {
    const w = talk('I', true); expect([1, 2, 3, 4, 5, 6, 7].map((r) => turnIn(w, r))).toEqual([8, 6, 6, 8, 6, 6, 8]);
    const l = talk('I', false); expect([1, 2, 3, 4].map((r) => turnIn(l, r))).toEqual([4, 6, 6, 4]);
  });
  it('II: no penalty, and the first enemy in initiative hesitates (−1 AP in round 1)', () => {
    const l = talk('II', false); expect(l.turn(l.pc).ap).toBe(6);
    const w = talk('II', true); const first = w.cb.order.map((id) => w.unit(id)).find((x) => x.side === 'foe')!;
    expect(logHas(w.cb, new RegExp(first.name + ' hesitates'))).toBe(true);
    const fs = w.unit(first.id).ps!['perk:talks_broke_down']; fs.hesitated = false; w.cb.round = 1; expect(w.turn(w.unit(first.id)).ap).toBe(5);
    w.cb.round = 2; fs.hesitated = false; expect(w.turn(w.unit(first.id)).ap).toBe(6);
  });
  it('no dialogue check before the fight: nothing', () => {
    const f = fightAfter([{ perks: { talks_broke_down: 'I' } }], [{ at: 'P6' }], (s) => storyCheck(s, s.chars[0].id, ['athletics'], { auto: 'success' }));
    expect(f.turn(f.pc).ap).toBe(6);
  });
});

// ======================================================================================================== Rally Cry
describe('Rally Cry', () => {
  // rules 1.13: no AP. The others take less damage until their own next turn.
  for (const [tier, n] of [['I', 15], ['II', 25]] as const) it(tier + ': an ally Downed by an enemy makes every other ally take ' + n + '% less damage until their next turn', () => {
    const f = fightWith([{ perks: { rally_cry: tier } }, {}, {}], [{ at: 'P6' }]);
    const [a, b, c] = f.pcs, foe = f.foes[0];
    const hit = (u: Unit) => withGame(f.g, () => { const was = f.unit(u.id).hp; applyDamage(f.cb, f.unit(u.id), 100, { type: 'weapon', by: f.unit(foe.id) }); const d = was - f.unit(u.id).hp; f.unit(u.id).hp = was; return d; });
    f.unit(a.id).hp = f.unit(a.id).maxHp = 500; f.unit(b.id).hp = f.unit(b.id).maxHp = 500;
    expect(hit(a)).toBe(100);
    withGame(f.g, () => applyDamage(f.cb, f.unit(c.id), 9999, { type: 'weapon', by: f.unit(foe.id) }));
    expect(f.unit(c.id).downed).toBe(true); expect(logHas(f.cb, /Rally Cry/)).toBe(true);
    expect(hit(a)).toBe(100 - n); expect(hit(b)).toBe(100 - n);
    expect(f.unit(a.id).apNext || 0).toBe(0); expect(f.turn(f.unit(a.id)).ap).toBe(6); // no AP
    expect(hit(a)).toBe(100); expect(hit(b)).toBe(100 - n); // it ends at each one's own next turn
  });
  it('friendly fire doesn\'t rally anyone', () => {
    const f = fightWith([{ perks: { rally_cry: 'II' } }, {}, {}]);
    const [a, b, c] = f.pcs;
    withGame(f.g, () => applyDamage(f.cb, f.unit(c.id), 9999, { type: 'weapon', by: f.unit(b.id) }));
    expect(logHas(f.cb, /Rally Cry/)).toBe(false); expect((f.unit(a.id).ps?.['perk:rally_cry'] as any)?.less || 0).toBe(0);
  });
});

// ======================================================================================================== Soulmate
describe('Soulmate', () => {
  const bonded = (tier: string, cam: number, n = 2) => {
    const specs: any[] = [{ perks: { soulmate: tier }, skills: { camaraderie: cam } }, ...Array.from({ length: n - 1 }, () => ({}))];
    return fightAfter(specs, [{ at: 'P6' }], (s) => { for (const c of s.chars.slice(1)) s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'soulmate', choice: c.name }); });
  };
  for (const [cam, pct] of [[3, 5], [5, 10], [7, 15], [9, 20], [10, 20]] as const) it('I at Camaraderie ' + cam + ': takes ' + pct + '% of the bondmate\'s damage, after their shield', () => {
    const f = bonded('I', cam), [me, mate] = f.pcs, foe = f.foes[0];
    f.unit(me.id).hp = f.unit(me.id).maxHp = 500; f.unit(mate.id).hp = f.unit(mate.id).maxHp = 500; f.unit(mate.id).shield = 20;
    withGame(f.g, () => applyDamage(f.cb, f.unit(mate.id), 120, { type: 'weapon', by: f.unit(foe.id) }));
    const share = Math.floor(100 * pct / 100);
    expect(500 - f.unit(me.id).hp).toBe(share); expect(500 - f.unit(mate.id).hp).toBe(100 - share);
  });
  it('the share never Downs the holder; mutual Soulmates don\'t ping-pong', () => {
    const s0 = storyWith([{ perks: { soulmate: 'I' }, skills: { camaraderie: 9 } }, { perks: { soulmate: 'I' }, skills: { camaraderie: 9 } }]);
    const [c1, c2] = s0.chars; s0.act({ type: 'story/perk', charId: c1.id, id: 'soulmate', choice: c2.name }); s0.act({ type: 'story/perk', charId: c2.id, id: 'soulmate', choice: c1.name });
    s0.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'P6' }] } } } as any);
    const cb = s0.g.combat!, [a, b] = cb.units.filter((u) => u.side === 'pc'); a.hp = a.maxHp = 200; b.hp = b.maxHp = 200;
    withGame(s0.g, () => applyDamage(cb, b, 100, { type: 'weapon', by: cb.units.find((u) => u.side === 'foe') }));
    expect(a.hp).toBe(180); expect(b.hp).toBe(120);
    a.hp = 3; withGame(s0.g, () => applyDamage(cb, b, 100, { type: 'weapon', by: null }));
    expect(a.hp).toBe(1); expect(a.downed).toBeFalsy();
  });
  it('II: two bonds; I keeps only the latest', () => {
    const f = bonded('II', 9, 3), [me, m1, m2] = f.pcs; f.unit(me.id).hp = f.unit(me.id).maxHp;
    for (const m of [m1, m2]) { f.unit(m.id).hp = f.unit(m.id).maxHp = 300; withGame(f.g, () => applyDamage(f.cb, f.unit(m.id), 100, { type: 'hazard', by: null, shield: false })); expect(f.unit(m.id).hp).toBe(220); }
    expect(f.unit(me.id).hp).toBe(f.unit(me.id).maxHp - 40);
    const g = bonded('I', 9, 3), [me2, n1, n2] = g.pcs; g.unit(me2.id).hp = g.unit(me2.id).maxHp; g.unit(n1.id).hp = g.unit(n2.id).hp = g.unit(n1.id).maxHp = g.unit(n2.id).maxHp = 300;
    withGame(g.g, () => applyDamage(g.cb, g.unit(n1.id), 100, { type: 'hazard', by: null, shield: false }));
    withGame(g.g, () => applyDamage(g.cb, g.unit(n2.id), 100, { type: 'hazard', by: null, shield: false }));
    expect(g.unit(me2.id).hp).toBe(g.unit(me2.id).maxHp - 20);
  });
});

// ======================================================================================================== Sweet Talker
describe('Sweet Talker', () => {
  const charmed = (tier: string) => fightAfter([{ perks: { sweet_talker: tier } }], [{ name: 'Vel', at: 'F6' }], (s) => storyCheck(s, s.chars[0].id, ['implication'], { auto: 'success', target: 'Vel' }));
  for (const [tier, n] of [['I', 2], ['II', 3]] as const) it(tier + ': debuffing someone you charmed this scene gives +' + n + ' AP, once a turn', () => {
    const f = charmed(tier); open(f.cb); const u = f.turn(f.pc), foe = f.foes[0];
    withGame(f.g, () => applyCond(f.cb, rng(), f.unit(u.id), f.unit(foe.id), 'shaken', 2, undefined, { skipSave: true }));
    expect(f.unit(u.id).ap).toBe(6 + n);
    withGame(f.g, () => applyCond(f.cb, rng(), f.unit(u.id), f.unit(foe.id), 'ldebuff', 2, undefined, { skipSave: true }));
    expect(f.unit(u.id).ap).toBe(6 + n);
  });
  it('I: a charmed NPC who debuffs you stings (−2 AP next turn); II: no sting', () => {
    for (const [tier, want] of [['I', 4], ['II', 6]] as const) {
      const f = charmed(tier); f.turn(f.pc); const foe = f.foes[0];
      withGame(f.g, () => applyCond(f.cb, rng(), f.unit(foe.id), f.unit(f.pc.id), 'shaken', 2, undefined, { skipSave: true }));
      expect(f.turn(f.pc).ap).toBe(want);
    }
  });
  it('no charm (a failed check, or another NPC): nothing', () => {
    const f = fightAfter([{ perks: { sweet_talker: 'I' } }], [{ name: 'Vel', at: 'F6' }], (s) => storyCheck(s, s.chars[0].id, ['implication'], { auto: 'fail', target: 'Vel' }));
    const u = f.turn(f.pc);
    withGame(f.g, () => applyCond(f.cb, rng(), f.unit(u.id), f.foes[0], 'shaken', 2, undefined, { skipSave: true }));
    expect(f.unit(u.id).ap).toBe(6);
  });
});

// ======================================================================================================== Outclassed
describe('Outclassed', () => {
  it('I: first kill by the squad on a target you hurt, +3 AP next turn; first casualty, −2', () => {
    const f = fightWith([{ perks: { outclassed: 'I' } }, {}], [{ at: 'P6' }, { at: 'P8' }]);
    const [me, ally] = f.pcs, [a, b] = f.foes;
    withGame(f.g, () => { applyDamage(f.cb, f.unit(a.id), 5, { type: 'weapon', by: f.unit(me.id) }); applyDamage(f.cb, f.unit(a.id), 9999, { type: 'weapon', by: f.unit(ally.id), credit: 'all' }); });
    expect(f.unit(me.id).apNext).toBe(3);
    withGame(f.g, () => applyDamage(f.cb, f.unit(b.id), 9999, { type: 'weapon', by: f.unit(me.id), credit: 'all' }));
    expect(f.unit(me.id).apNext).toBe(3); // only the first kill
    expect(f.turn(f.unit(me.id)).ap).toBe(9);
    withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 9999, { type: 'weapon', by: f.foes[0] }));
    expect(f.turn(f.unit(me.id)).ap).toBe(4);
  });
  it('II: no penalty; the killer gets +1 too', () => {
    const f = fightWith([{ perks: { outclassed: 'II' } }, {}], [{ at: 'P6' }]);
    const [me, ally] = f.pcs, a = f.foes[0];
    withGame(f.g, () => { applyDamage(f.cb, f.unit(ally.id), 9999, { type: 'weapon', by: f.unit(a.id) }); });
    expect(f.turn(f.unit(me.id)).ap).toBe(6);
    f.unit(ally.id).downed = false; f.unit(ally.id).hp = 50;
    withGame(f.g, () => applyDamage(f.cb, f.unit(a.id), 9999, { type: 'weapon', by: f.unit(ally.id), credit: 'all' }));
    expect(f.unit(ally.id).apNext).toBe(1); expect(f.unit(me.id).apNext || 0).toBe(0); // I never hurt it
  });
});

// ======================================================================================================== Many Hands
describe('Many Hands', () => {
  it('rules 1.13: no Hand-Off action any more (the AP gift went to the Calls); the perk only widens the Defense loan', () => {
    const f = fightWith([{ perks: { many_hands: 'mastered' } }, {}]); open(f.cb);
    const [me, ally] = f.pcs; at(f, me, '2,5'); at(f, ally, '5,5'); f.turn(f.unit(me.id));
    expect(() => pcAct(f, { type: 'combat/perk', id: 'many_hands', targetId: ally.id, choice: '2' }, me)).toThrow(/isn't an action/);
  });
});

// ======================================================================================================== On My Mark
describe('On My Mark', () => {
  it('1 AP: an ally acts now (one action, up to 4 AP); what they spend comes off their next turn', () => {
    const f = fightWith([{ perks: { on_my_mark: 'mastered' } }, {}], [{ at: 'F6' }]); open(f.cb);
    const [me, ally] = f.pcs; at(f, me, '2,5'); at(f, ally, '2,7');
    f.turn(f.unit(me.id));
    pcAct(f, { type: 'combat/perk', id: 'on_my_mark', targetId: ally.id }, me);
    expect(f.cb.window?.kind).toBe('On My Mark'); expect(f.unit(me.id).ap).toBe(5); expect(f.unit(ally.id).ap).toBe(4);
    expect(() => pcAct(f, { type: 'combat/move', to: '3,5' }, me)).toThrow(/turn/);
    pcAct(f, { type: 'combat/move', to: '4,7' }, ally); // 2 tiles: 2 AP at Movement 1
    expect(f.cb.window).toBeUndefined();
    const spent = f.unit(ally.id).apDebt || 0; // the debt settles at once ('action_done'), after the ally's move
    expect(spent).toBeGreaterThan(0); expect(logHas(f.cb, /owes \d AP next turn/)).toBe(true);
    pcAct(f, { type: 'combat/move', to: '2,4' }, me);
    expect(f.unit(ally.id).apDebt).toBe(Math.ceil(spent));
    expect(f.turn(f.unit(ally.id)).ap).toBe(6 - Math.ceil(spent));
  });
  it('once a round; the ally may decline (no debt)', () => {
    const f = fightWith([{ perks: { on_my_mark: 'mastered' } }, {}]); open(f.cb);
    const [me, ally] = f.pcs; f.turn(f.unit(me.id));
    pcAct(f, { type: 'combat/perk', id: 'on_my_mark', targetId: ally.id }, me);
    pcAct(f, { type: 'combat/decline' }, ally);
    pcAct(f, { type: 'combat/end-turn' }, me);
    expect(f.unit(ally.id).apDebt || 0).toBe(0);
    f.turn(f.unit(me.id));
    expect(() => pcAct(f, { type: 'combat/perk', id: 'on_my_mark', targetId: ally.id }, me)).toThrow(/Used|already/);
  });
});

// ======================================================================================================== Supreme Command
describe('Supreme Command', () => {
  it('once a fight, 0 AP: every ally takes a 2 AP action now, in initiative order; their own AP is kept', () => {
    const f = fightWith([{ perks: { supreme_command: 'ultimate' } }, {}, {}], [{ at: 'P6' }]); open(f.cb);
    const [me, a, b] = f.pcs; f.turn(f.unit(me.id)); f.unit(a.id).ap = 1; f.unit(b.id).ap = 0;
    pcAct(f, { type: 'combat/perk', id: 'supreme_command' }, me);
    expect(f.unit(me.id).ap).toBe(6);
    const q = f.cb.window!.queue.map((e) => e.unitId); expect([...q].sort()).toEqual([a.id, b.id].sort());
    const by = (u: Unit) => f.g.characters[u.charId!].owner;
    const first = f.unit(q[0]); expect(first.ap).toBe(2);
    f.act({ type: 'combat/prone', unitId: first.id }, by(first));
    const second = f.unit(f.cb.window!.queue[0].unitId); f.act({ type: 'combat/prone', unitId: second.id }, by(second));
    expect(f.cb.window).toBeUndefined();
    expect(f.unit(a.id).ap).toBe(1); expect(f.unit(b.id).ap).toBe(0);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'supreme_command' }, me)).toThrow(/Used/);
  });
});

// ======================================================================================================== The Voice
describe('The Voice', () => {
  it('once a session: rank-and-file within 8 tiles save or obey the menu order; elites ignore it', () => {
    const f = fightWith([{ perks: { the_voice: 'achieved' } }], [{ at: 'E6', tier: 'soldier' }, { at: 'F7', tier: 'elite' }, { at: 'T6', tier: 'minion' }]); open(f.cb);
    const [s, e, far] = f.foes; at(f, f.pc, '2,5'); for (const x of f.foes) weakSaves(f.unit(x.id)); at(f, far, '15,5');
    f.turn(f.pc);
    pcAct(f, { type: 'combat/perk', id: 'the_voice', choice: 'drop it' });
    expect(f.unit(f.pc.id).ap).toBe(6);
    expect(condOn(f.unit(s.id), 'commanded')).toBe(true); expect(condArg(f.unit(s.id), 'commanded')).toBe('drop');
    expect(condOn(f.unit(e.id), 'commanded')).toBe(false); expect(condOn(f.unit(far.id), 'commanded')).toBe(false);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'the_voice', choice: 'halt' })).toThrow(/Used/);
  });
  it('a typed order the menu doesn\'t have goes to the Narrator (the fight report)', () => {
    const f = fightWith([{ perks: { the_voice: 'achieved' } }], [{ at: 'E6' }]); open(f.cb); weakSaves(f.foes[0]); f.turn(f.pc);
    pcAct(f, { type: 'combat/perk', id: 'the_voice', text: 'Turn on your captain!' });
    expect((f.cb.notes || []).some((n) => /The Voice/.test(n) && /captain/.test(n))).toBe(true);
  });
});

// ======================================================================================================== Between Heartbeats
describe('Between Heartbeats', () => {
  it('armed (prone): fires before the first enemy action in sight, for 2 AP that aren\'t yours; once a fight', () => {
    const f = fightWith([{ perks: { between_heartbeats: 'achieved' } }], [{ at: 'F6' }]); open(f.cb);
    const u = f.turn(f.pc);
    pcAct(f, { type: 'combat/perk', id: 'between_heartbeats', choice: 'prone' });
    expect(f.unit(u.id).armed?.['perk:between_heartbeats']).toBeTruthy();
    f.unit(u.id).ap = 0;
    pcAct(f, { type: 'combat/end-turn' });
    expect(logHas(f.cb, /between heartbeats/i)).toBe(true); expect(f.unit(u.id).prone).toBe(true);
    expect(f.unit(u.id).armed?.['perk:between_heartbeats']).toBeFalsy();
  });
  it('a shot at the enemy that starts to act', () => {
    const f = fightWith([{ perks: { between_heartbeats: 'achieved' } }], [{ at: 'F6' }]); open(f.cb);
    const u = f.turn(f.pc); sure(f.unit(u.id)); const foe = f.foes[0]; f.unit(foe.id).hp = 1;
    pcAct(f, { type: 'combat/perk', id: 'between_heartbeats', choice: 'shot' });
    const ammo = f.unit(u.id).ammo;
    pcAct(f, { type: 'combat/end-turn' });
    expect(f.unit(u.id).ammo).toBe(ammo - 1);
    expect(f.unit(foe.id).dead).toBe(true);
  });
});

// ======================================================================================================== Spoon-Feed
describe('Spoon-Feed', () => {
  it('2 AP: allies within 6 tiles get +2 to hit that enemy until your next turn', () => {
    const f = fightWith([{ perks: { spoon_feed: 'achieved' } }, {}, {}], [{ at: 'F6' }]); open(f.cb);
    const [me, near, farA] = f.pcs, foe = f.foes[0]; at(f, me, '2,5'); at(f, near, '2,7'); at(f, farA, '15,15');
    const before = previewAttack(f.cb, f.unit(near.id), f.unit(foe.id), 'shot').toHit;
    f.turn(f.unit(me.id));
    pcAct(f, { type: 'combat/perk', id: 'spoon_feed', targetId: foe.id }, me);
    expect(f.unit(me.id).ap).toBe(4);
    expect(previewAttack(f.cb, f.unit(near.id), f.unit(foe.id), 'shot').toHit).toBe(before + 2);
    expect(previewAttack(f.cb, f.unit(me.id), f.unit(foe.id), 'shot').terms!.some((t) => t.label === 'Spoon-Feed')).toBe(false);
    at(f, f.unit(farA.id), '2,8');
    expect(previewAttack(f.cb, f.unit(farA.id), f.unit(foe.id), 'shot').terms!.some((t) => t.label === 'Spoon-Feed')).toBe(false); // didn't hear it
    f.turn(f.unit(me.id));
    expect(previewAttack(f.cb, f.unit(near.id), f.unit(foe.id), 'shot').toHit).toBe(before);
  });
});

// ======================================================================================================== Flat Line
describe('Flat Line', () => {
  for (const [tier, n] of [['I', -1], ['II', -2]] as const) it(tier + ': the picked enemy is at ' + n + ' to hit while it sees you', () => {
    const f = fightWith([{ perks: { flat_line: tier } }], [{ at: 'F6', tier: 'soldier' }, { at: 'G7', tier: 'elite' }]); open(f.cb);
    const [s, e] = f.foes;
    const term = (x: Unit) => previewAttack(f.cb, f.unit(x.id), f.pc, 'shot').terms?.find((t) => /Flat Line/.test(t.label))?.v || 0;
    expect(term(e)).toBe(n); expect(term(s)).toBe(0); // the engine picks the elite at the start
    f.turn(f.pc); pcAct(f, { type: 'combat/perk', id: 'flat_line', targetId: s.id });
    expect(term(s)).toBe(n); expect(term(e)).toBe(0);
    pcAct(f, { type: 'combat/end-turn' });
    expect(f.g.combat).toBeTruthy();
  });
  it('the pick locks after your first turn', () => {
    const f = fightWith([{ perks: { flat_line: 'I' } }], [{ at: 'F6' }]); f.turn(f.pc); pcAct(f, { type: 'combat/end-turn' });
    if (f.g.combat && !f.cb.over) { f.turn(f.pc); expect(() => pcAct(f, { type: 'combat/perk', id: 'flat_line', targetId: f.foes[0].id })).toThrow(); }
  });
});

// ======================================================================================================== Pattern Lock
describe('Pattern Lock', () => {
  it('I: +2 Dodge against an attack type you have seen; II: +4, allies +2', () => {
    for (const [tier, mine, ally] of [['I', -2, 0], ['II', -4, -2]] as const) {
      const f = fightWith([{ perks: { pattern_lock: tier } }, {}], [{ at: 'F6' }]); open(f.cb);
      const [me, mate] = f.pcs, foe = f.foes[0];
      const term = (t: Unit, mode: any = 'shot') => previewAttack(f.cb, f.unit(foe.id), f.unit(t.id), mode).terms?.filter((x) => /Pattern Lock/.test(x.label)).reduce((s, x) => s + x.v, 0) || 0;
      expect(term(me)).toBe(0);
      withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(foe.id), f.unit(me.id), 'shot', null, { noAp: true }));
      expect(term(me)).toBe(mine); expect(term(mate)).toBe(ally); expect(term(me, 'aimed')).toBe(0);
    }
  });
});

// ======================================================================================================== Lay Down Arms
describe('Lay Down Arms', () => {
  it('I: 2 AP, a humanoid that hears you fails its Heart save: no attacks on its next turn', () => {
    const f = fightWith([{ perks: { lay_down_arms: 'I' } }], [{ at: 'E6' }]); open(f.cb);
    const foe = f.foes[0]; weakSaves(f.unit(foe.id)); at(f, f.pc, '2,5'); f.turn(f.pc);
    pcAct(f, { type: 'combat/perk', id: 'lay_down_arms', targetId: foe.id });
    expect(f.unit(f.pc.id).ap).toBe(4); expect(condArg(f.unit(foe.id), 'commanded')).toBe('hold');
    const hp = f.unit(f.pc.id).hp; f.unit(f.pc.id).ap = 0; pcAct(f, { type: 'combat/end-turn' });
    expect(f.unit(f.pc.id).hp).toBe(hp); // it held fire
  });
  it('II: up to three at once; robots and the deaf (out of hearing) are refused', () => {
    const f = fightWith([{ perks: { lay_down_arms: 'II' } }], [{ at: 'E6' }, { at: 'E7' }, { at: 'E8' }, { name: 'Sentry drone', at: 'E4' }]); open(f.cb);
    const [a, b, c, d] = f.foes; for (const x of f.foes) weakSaves(f.unit(x.id)); at(f, f.pc, '2,5'); f.turn(f.pc);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'lay_down_arms', targetId: d.id })).toThrow(/doesn't listen/);
    pcAct(f, { type: 'combat/perk', id: 'lay_down_arms', targetId: a.id, targetIds: [b.id, c.id] });
    for (const x of [a, b, c]) expect(condOn(f.unit(x.id), 'commanded')).toBe(true);
    at(f, f.unit(a.id), '15,15'); f.unit(f.pc.id).ap = 6;
    expect(() => pcAct(f, { type: 'combat/perk', id: 'lay_down_arms', targetId: a.id })).toThrow(/range|hear/);
  });
  it('story: the engine rolls the save and the Narrator plays the result', () => {
    const s = storyWith([{ perks: { lay_down_arms: 'I' } }]);
    s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'lay_down_arms', actionId: 'plea', npc: 'the guard', text: 'Nobody has to die here.' });
    const r = s.g.story.rulings!.at(-1)!; expect(r.key).toBe('perk:lay_down_arms'); expect(r.text).toMatch(/Heart save d20 \d+/);
  });
});

// ======================================================================================================== Field Surgeon
describe('Field Surgeon', () => {
  it('Field Repair heals an adjacent living ally: 3 × Proficiency × Healing given × the level factor (rules 1.23; it was 10 a point), one spare-parts charge', () => {
    const f = fightWith([{ perks: { field_surgeon: 'achieved' }, skills: { proficiency: 5 }, kit: 'engineer' }, {}]); open(f.cb);
    const [me, ally] = f.pcs; at(f, me, '2,5'); at(f, ally, '3,5'); f.unit(me.id).parts = 2; f.unit(me.id).proficiency = 5; f.unit(ally.id).hp = 10;
    f.turn(f.unit(me.id));
    pcAct(f, { type: 'combat/perk', id: 'field_surgeon', actionId: 'repair_ally', targetId: ally.id }, me);
    expect(f.unit(me.id).ap).toBe(4); expect(f.unit(me.id).parts).toBe(1);
    expect(f.unit(ally.id).hp).toBeGreaterThanOrEqual(10 + 15); expect(f.unit(ally.id).hp).toBeLessThan(60);
  });
  it('a Factory Made ally is healed at full power (the Plug halving undone)', () => {
    const run = (perk: boolean) => {
      const f = fightWith([{ perks: perk ? { field_surgeon: 'achieved' } : {}, skills: { proficiency: 5 } }, { traits: ['factory_made'] }]);
      const [me, bot] = f.pcs; f.unit(bot.id).hp = 10;
      withGame(f.g, () => healUnit(f.cb, f.unit(bot.id), 40, f.unit(me.id), 'stim'));
      return f.unit(bot.id).hp - 10;
    };
    expect(run(false)).toBe(20); expect(run(true)).toBe(40);
  });
  it('out of a fight: patch a squadmate for half their max HP', () => {
    const s = storyWith([{ perks: { field_surgeon: 'achieved' }, skills: { proficiency: 5 }, kit: 'engineer' }, {}]);
    const [me, mate] = s.chars; s.g.characters[mate.id].hp = 10;
    (s.g.characters[me.id] as any).pack = [...(s.g.characters[me.id].pack || []), { id: 'spare_parts', name: 'Spare parts', qty: 2 }];
    s.act({ type: 'story/perk', charId: me.id, id: 'field_surgeon', actionId: 'patch', choice: mate.name });
    expect(s.g.characters[mate.id].hp).toBeGreaterThan(10);
  });
});

// ======================================================================================================== Angel of the Trenches
describe('Angel of the Trenches', () => {
  it('once a fight: an ally within your 1-AP walk would drop to 0: you move in and they stay at 1 HP', () => {
    const f = fightWith([{ perks: { angel_of_the_trenches: 'ultimate' } }, {}], [{ at: 'P6' }]); open(f.cb);
    const [me, ally] = f.pcs; at(f, me, '2,5'); at(f, ally, '3,7'); f.unit(ally.id).bleed = 2;
    withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 9999, { type: 'weapon', by: f.foes[0] }));
    expect(f.unit(ally.id).hp).toBe(1); expect(f.unit(ally.id).downed).toBe(false); expect(f.unit(ally.id).bleed).toBe(0);
    expect(Math.max(...f.unit(me.id).pos.split(',').map((v, i) => Math.abs(+v - +f.unit(ally.id).pos.split(',')[i])))).toBeLessThanOrEqual(1);
    withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 9999, { type: 'weapon', by: f.foes[0] }));
    expect(f.unit(ally.id).downed).toBe(true);
  });
  it('too far, or holding position: nothing', () => {
    const f = fightWith([{ perks: { angel_of_the_trenches: 'ultimate' } }, {}], [{ at: 'P6' }]); open(f.cb);
    const [me, ally] = f.pcs; at(f, me, '2,5'); at(f, ally, '9,9');
    withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 9999, { type: 'weapon', by: f.foes[0] }));
    expect(f.unit(ally.id).downed).toBe(true);
    const g = fightWith([{ perks: { angel_of_the_trenches: 'ultimate' } }, {}], [{ at: 'P6' }]); open(g.cb);
    at(g as any, g.pcs[0], '2,5'); at(g as any, g.pcs[1], '3,5'); g.turn(g.pcs[0]);
    g.act({ type: 'combat/perk', unitId: g.pcs[0].id, id: 'angel_of_the_trenches' });
    withGame(g.g, () => applyDamage(g.cb, g.pcs[1], 9999, { type: 'weapon', by: g.foes[0] }));
    expect(g.pcs[1].downed).toBe(true);
  });
});

// ======================================================================================================== Sworn Sibling
describe('Sworn Sibling', () => {
  const sib = () => fightAfter([{ traits: ['sworn_sibling'] }, { owner: 'host' }], [{ at: 'P6' }], (s) => s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'sworn_sibling', choice: s.chars[1].name }));
  it('Bound (up): adjacent, one shared AP a round goes to the first of you to start a turn', () => {
    const f = sib(); open(f.cb); const [me, s] = f.pcs; at(f as any, me, '2,5'); at(f as any, s, '3,5');
    expect(f.turn(f.unit(s.id)).ap).toBe(7); expect(f.turn(f.unit(me.id)).ap).toBe(6);
    f.cb.round = 2; at(f as any, f.unit(s.id), '8,8'); expect(f.turn(f.unit(me.id)).ap).toBe(6);
  });
  it('Bound (down): −2 to attacks not defending them; moving away costs double', () => {
    const f = sib(); open(f.cb); const [me, s] = f.pcs, foe = f.foes[0];
    at(f as any, me, '2,5'); at(f as any, s, '8,5'); at(f as any, foe, '2,9');
    f.unit(s.id).downed = true; f.unit(s.id).hp = 0; f.unit(s.id).damagedBy = [];
    const term = () => previewAttack(f.cb, f.unit(me.id), f.unit(foe.id), 'shot').terms?.find((t) => /Sworn Sibling/.test(t.label))?.v || 0;
    expect(term()).toBe(-2);
    at(f as any, f.unit(foe.id), '8,7'); expect(term()).toBe(0); // within 2 tiles of them: defending
    f.turn(f.unit(me.id)); f.unit(me.id).movement = 1; const ap = f.unit(me.id).ap;
    f.act({ type: 'combat/move', unitId: me.id, to: '1,5' }); expect(ap - f.unit(me.id).ap).toBe(2);
    const ap2 = f.unit(me.id).ap; f.act({ type: 'combat/move', unitId: me.id, to: '2,5' }); expect(ap2 - f.unit(me.id).ap).toBe(1);
  });
  it('story: while they\'re down, checks are at −2 unless tagged for_bond; consent goes to the Narrator', () => {
    const s = storyWith([{ traits: ['sworn_sibling'] }, { owner: 'p2' }]);
    const [me, mate] = s.chars; s.act({ type: 'story/perk', charId: me.id, id: 'sworn_sibling', choice: mate.name });
    expect(s.g.story.rulings!.some((r) => /agrees/.test(r.text))).toBe(true);
    s.g.characters[mate.id].hp = 0;
    expect(storyCheck(s, me.id, ['athletics'])).toMatch(/−2 Sworn Sibling/);
    expect(storyCheck(s, me.id, ['athletics'], { tags: ['for_bond'] })).not.toMatch(/Sworn Sibling/);
  });
  it('a refused consent undoes the bond', () => {
    const s = storyWith([{ traits: ['sworn_sibling'] }, { owner: 'p2' }]);
    const [me, mate] = s.chars; s.act({ type: 'story/perk', charId: me.id, id: 'sworn_sibling', choice: mate.name });
    const r = s.g.story.rulings!.at(-1)!;
    s.act({ type: 'narrator/turn', turn: { narration: 'No.', perkRulings: [{ id: r.id, accepted: false }] } } as any);
    s.g.characters[mate.id].hp = 0;
    expect(storyCheck(s, me.id, ['athletics'])).not.toMatch(/Sworn Sibling/);
  });
});

// ======================================================================================================== Rival
describe('Rival', () => {
  const rivals = (both = false) => { const s = storyWith([{ traits: ['rival'] }, { traits: both ? ['rival'] : [] }]); s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'rival', choice: s.chars[1].name }); return s; };
  it('Show-Off: your rival passes with a skill, your next roll with it gets +2 (once); both ways', () => {
    const s = rivals(), [me, r] = s.chars;
    storyCheck(s, r.id, ['athletics'], { auto: 'success' });
    expect(storyCheck(s, me.id, ['athletics'])).toMatch(/\+2 Show-Off/);
    expect(storyCheck(s, me.id, ['athletics'])).not.toMatch(/Show-Off/);
    storyCheck(s, me.id, ['charisma'], { auto: 'success' });
    expect(storyCheck(s, r.id, ['charisma'])).toMatch(/\+2 Show-Off/);
  });
  it('Show-Off in a fight: a hit by your rival gives your next attack with that skill +2', () => {
    const s = rivals(); s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'F6' }] } } } as any);
    const cb = s.g.combat!, [me, r] = cb.units.filter((u) => u.side === 'pc'), foe = cb.units.find((u) => u.side === 'foe')!;
    open(cb); r.attack = 60; foe.hp = foe.maxHp = 999;
    withGame(s.g, () => resolveAttack(cb, s.g.rng, r, foe, 'shot', null, { noAp: true }));
    const show = () => withGame(s.g, () => previewAttack(cb, me, foe, 'shot').terms!.some((t) => t.label === 'Show-Off'));
    expect(show()).toBe(true);
    withGame(s.g, () => resolveAttack(cb, s.g.rng, me, foe, 'shot', null, { noAp: true }));
    expect(show()).toBe(false);
  });
  it('Neck and Neck: your rival levels up, you get 50 XP; +10% XP while they\'re higher', () => {
    const s = rivals(), [me, r] = s.chars;
    s.act({ type: 'narrator/turn', turn: { narration: 'XP.', xp: [{ charId: r.id, source: 'quest', amount: 300, reason: 'test' }] } } as any);
    const cme = s.g.characters[me.id], cr = s.g.characters[r.id];
    expect(cr.level).toBeGreaterThan(1); expect(cme.xp).toBe(50 * (cr.level - 1));
    const x0 = cme.xp; s.act({ type: 'narrator/turn', turn: { narration: 'XP.', xp: [{ charId: me.id, source: 'quest', amount: 100, reason: 'test' }] } } as any);
    expect(s.g.characters[me.id].xp - x0).toBe(cme.level < cr.level ? 110 : 100);
  });
});

// ======================================================================================================== Born Officer
describe('Born Officer', () => {
  it('Command, 1 AP once a round: an ally takes a free 1-AP move or a free basic attack', () => {
    const f = fightWith([{ traits: ['born_officer'] }, {}], [{ at: 'F6' }]); open(f.cb);
    const [me, ally] = f.pcs, foe = f.foes[0]; at(f, me, '2,5'); at(f, ally, '2,7');
    f.turn(f.unit(me.id)); const allyAp = f.unit(ally.id).ap;
    pcAct(f, { type: 'combat/perk', id: 'born_officer', targetId: ally.id, choice: 'move', tile: '3,7' }, me);
    expect(f.unit(ally.id).pos).toBe('3,7'); expect(f.unit(ally.id).ap).toBe(allyAp); expect(f.unit(me.id).ap).toBe(5);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'born_officer', targetId: ally.id, choice: 'attack', targetIds: [foe.id] }, me)).toThrow(/Used|already/);
    f.cb.round++; f.turn(f.unit(me.id)); sure(f.unit(ally.id)); const ammo = f.unit(ally.id).ammo;
    pcAct(f, { type: 'combat/perk', id: 'born_officer', targetId: ally.id, choice: 'attack', targetIds: [foe.id] }, me);
    expect(f.unit(ally.id).ammo).toBe(ammo - 1); expect(f.unit(ally.id).ap).toBe(allyAp);
  });
  it('a move beyond 1 AP is refused; an officer ally must pass Composure first', () => {
    const f = fightWith([{ traits: ['born_officer'] }, { traits: ['born_officer'], skills: { composure: 0 } }], [{ at: 'P6' }]); open(f.cb);
    const [me, ally] = f.pcs; at(f, me, '2,5'); at(f, ally, '2,7'); f.turn(f.unit(me.id));
    expect(() => pcAct(f, { type: 'combat/perk', id: 'born_officer', targetId: ally.id, choice: 'move', tile: '6,7' }, me)).toThrow(/1 AP/);
    f.g.rng.state = rngFor(2);
    pcAct(f, { type: 'combat/perk', id: 'born_officer', targetId: ally.id, choice: 'move', tile: '3,7' }, me);
    expect(f.unit(ally.id).pos).toBe('2,7'); expect(logHas(f.cb, /refuses/)).toBe(true);
  });
  it('The Squad Leans on You: an ally within 5 tiles loses 1 AP while you are Downed or out of their sight', () => {
    const f = fightWith([{ traits: ['born_officer'] }, {}, {}], [{ at: 'P6' }]); open(f.cb);
    const [me, a, far] = f.pcs; at(f, me, '2,5'); at(f, a, '4,5'); at(f, far, '15,15');
    expect(f.turn(f.unit(a.id)).ap).toBe(6);
    f.unit(me.id).downed = true; f.unit(me.id).hp = 0;
    expect(f.turn(f.unit(a.id)).ap).toBe(5); expect(f.turn(f.unit(far.id)).ap).toBe(6);
  });
});

// ======================================================================================================== Field Medic
describe('Field Medic', () => {
  it('Triage: stabilising a Downed ally costs 1 AP less; a conscious stim stays 1 AP', () => {
    const f = fightWith([{ traits: ['field_medic'] }, {}], [{ at: 'P6' }]); open(f.cb);
    const [me, ally] = f.pcs; at(f, me, '2,5'); at(f, ally, '3,5'); f.unit(ally.id).downed = true; f.unit(ally.id).hp = 0;
    f.g.characters[me.charId!].stims = 3; f.turn(f.unit(me.id)); const ap = f.unit(me.id).ap;
    pcAct(f, { type: 'combat/stim', targetId: ally.id }, me);
    expect(ap - f.unit(me.id).ap).toBe(1); expect(f.unit(ally.id).hp).toBe(1);
    const ap2 = f.unit(me.id).ap; pcAct(f, { type: 'combat/stim', targetId: ally.id }, me); expect(ap2 - f.unit(me.id).ap).toBe(1);
  });
  it('Thrown Stim: once a fight, a Downed ally up to 3 tiles away in sight', () => {
    const f = fightWith([{ traits: ['field_medic'] }, {}], [{ at: 'P6' }]); open(f.cb);
    const [me, ally] = f.pcs; at(f, me, '2,5'); at(f, ally, '5,5'); f.unit(ally.id).downed = true; f.unit(ally.id).hp = 0;
    f.g.characters[me.charId!].stims = 3; f.turn(f.unit(me.id)); const stims = f.g.characters[f.unit(me.id).charId!].stims;
    pcAct(f, { type: 'combat/perk', id: 'field_medic', targetId: ally.id }, me);
    expect(f.unit(ally.id).downed).toBe(false); expect(f.unit(ally.id).hp).toBe(1);
    expect(f.g.characters[f.unit(me.id).charId!].stims).toBe(stims - 1); expect(f.unit(me.id).ap).toBe(5);
    f.unit(ally.id).downed = true;
    expect(() => pcAct(f, { type: 'combat/perk', id: 'field_medic', targetId: ally.id }, me)).toThrow(/Used/);
  });
  it('First, Do No Harm: an ally under a quarter HP within 5 tiles: no attacks until you heal someone', () => {
    const f = fightWith([{ traits: ['field_medic'] }, {}], [{ at: 'F6' }]); open(f.cb);
    const [me, ally] = f.pcs, foe = f.foes[0]; at(f, me, '2,5'); at(f, ally, '3,5'); f.unit(ally.id).hp = 5;
    f.g.characters[me.charId!].stims = 3; f.turn(f.unit(me.id));
    expect(() => pcAct(f, { type: 'combat/attack', targetId: foe.id, mode: 'shot' }, me)).toThrow(/First, Do No Harm/);
    pcAct(f, { type: 'combat/stim', targetId: ally.id }, me);
    pcAct(f, { type: 'combat/attack', targetId: foe.id, mode: 'shot' }, me);
  });
  it('with no way to heal, the lock never applies (no softlock)', () => {
    const f = fightWith([{ traits: ['field_medic'] }, {}], [{ at: 'F6' }]); open(f.cb);
    const [me, ally] = f.pcs, foe = f.foes[0]; at(f, me, '2,5'); at(f, ally, '3,5'); f.unit(ally.id).hp = 5;
    f.g.characters[f.unit(me.id).charId!].stims = 0; f.g.characters[f.unit(me.id).charId!].classId = null;
    f.turn(f.unit(me.id));
    pcAct(f, { type: 'combat/attack', targetId: foe.id, mode: 'shot' }, me);
  });
});
void charIds;
