// Class Roster Revision 3, phase B: the 20 new class moves (src/classes/rev3.ts). Each one through the reducer (apply:
// combat/perk, combat/end-turn for the enemy's side of a reaction, combat/reload, combat/core, combat/vent,
// combat/analyze, combat/release, story/perk), with its main refusal. What only an enemy does (walk off, step on a
// rigged tile) goes through the engine functions its turn uses, with the game bound, as the lane tests do.
import { describe, expect, it } from 'vitest';
import {
  CLASS, d20, healingMult, applyCond, condOn, moveUnit, beginTurn, objectsOf, manaOf, strainLimit, readyDesigns, enemyIntent, coverageOf, itemInfo, handlerOf, paths,
  type Unit, type Combat, type Character,
} from '../src';
import { makeObject } from '../src/objects';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
/** A character of a Revision 3 class with its attribute at n (rank I 1-4, II at 5, III at 8). */
const cls = (id: string, n: number, extra: CharSpec = {}): CharSpec => ({ ...extra, classId: id, level: 12, attrs: { [CLASS[id].attribute]: n, ...(extra.attrs || {}) } });
function rngFor(...ns: number[]): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const seed = (f: { g: any }, ...ns: number[]) => { f.g.rng.state = rngFor(...ns); };
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const logCount = (cb: Combat, re: RegExp) => cb.log.filter((l) => re.test(l)).length;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; return f.unit(u.id); };
const perk = (f: F, u: Unit, id: string, a: any = {}) => f.act({ type: 'combat/perk', unitId: u.id, id, ...a } as any);
const act = (f: F, u: Unit, a: any) => f.act({ unitId: u.id, ...a });
const tough = (u: Unit) => { u.hp = u.maxHp = 999; return u; };
const saves = (u: Unit, n: number) => { u.sv = { body: n, brain: n, heart: n }; return u; };
const charOf = (f: { g: any }, u: Unit): Character => f.g.characters[u.charId!];
const fx = (f: F, k: string) => (f.cb.fx || []).filter((e) => e.k === k);
/** The fight's turn order, set (the next end-turn hands the turn on in this order). */
const order = (f: F, ...us: Unit[]) => { f.cb.order = us.map((u) => u.id); };

describe('the 20 new moves are handled', () => {
  it('every new move has a handler and every effect is engine-run (no gap, nothing left to the Narrator)', () => {
    const NEW = Object.values(CLASS).flatMap((k: any) => Object.values(k.ranks).flatMap((r: any) => r.moves)).filter((m: any) => m.new);
    expect(NEW.length).toBe(20);
    for (const m of NEW as any[]) {
      const info = itemInfo(m.key)!; expect(handlerOf(info.key), m.key).toBeTruthy();
      expect(coverageOf(info).filter((r) => r.owner === 'gap' || r.owner === 'narrator'), m.key).toEqual([]);
    }
  });
});

// ======================================================================================================== DEFENDER
describe('Defender', () => {
  it('Shrug It Off: a maul\'s knockdown on the enemy\'s turn is shrugged off for 1 Guard and the reaction; with no Guard it stays', () => {
    for (const guard of [2, 0]) {
      const f = fightWith([cls('defender', 5)], [{ weapon: 'maul' }]);
      const d = at(f, f.pc, '4,2'); tough(d); d.res = { ...(d.res || {}), guard }; d.def = -40; d.armour = 999; // the blow gets 1 damage through: 1 Guard soaks it (rules 1.13), 1 is left to shrug with
      const foe = at(f, f.foe, '5,2'); foe.attack = 60; foe.techs = []; // plain attacks: the maul's knockdown is its plain attack's grant, not a technique's (rules 1.12) order(f, d, foe);
      f.turn(d); act(f, d, { type: 'combat/end-turn' });
      expect(logHas(f.cb, /knocks? .*prone|Knockdown|prone/i)).toBe(true);
      if (guard) { expect(logCount(f.cb, /shrugs it off: no longer prone/)).toBeGreaterThanOrEqual(1); expect(f.unit(d.id).res!.guard).toBeLessThan(2); expect(fx(f, 'shrug').length).toBeGreaterThanOrEqual(1); }
      else expect(logHas(f.cb, /shrugs it off/)).toBe(false);
    }
  });
  it('Shrug It Off: Slowed landing through the rules (cond_landed) ends at once; the policy turns it off', () => {
    const f = fightWith([cls('defender', 5)], [{}]);
    let d = f.turn(f.pc); d.res = { ...(d.res || {}), guard: 3 };
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.unit(d.id), 'slowed', 2, undefined, { skipSave: true }));
    expect(condOn(f.unit(d.id), 'slowed')).toBe(false); expect(f.unit(d.id).res!.guard).toBe(2);
    perk(f, d, 'class:defender.shrug_it_off', { actionId: 'shrug_off' });
    f.cb.round++; // a new round: the reaction is back
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.unit(d.id), 'weakened', 2, undefined, { skipSave: true }));
    expect(condOn(f.unit(d.id), 'weakened')).toBe(true);
  });
  it('Anchor: Braced, a squadmate\'s shove doesn\'t budge you; unbraced it can', () => {
    const f = fightWith([cls('defender', 8), {}], [{ at: 'P11' }]);
    const [d, p] = f.pcs; at(f, d, '4,2'); at(f, p, '3,2');
    f.turn(d); perk(f, f.unit(d.id), 'class:defender.brace', { actionId: 'brace' });
    expect(f.unit(d.id).braced).toBe(true);
    f.turn(p); act(f, f.unit(p.id), { type: 'combat/shove', targetId: d.id });
    expect(f.unit(d.id).pos).toBe('4,2'); expect(logHas(f.cb, /doesn't budge/)).toBe(true);
    // A Fighter's knockdown shove (Prone) is cancelled too.
    const g = fightWith([cls('defender', 8), cls('fighter', 3)], [{ at: 'P11' }]);
    const [d2, fi] = g.pcs; at(g, d2, '4,2'); at(g, fi, '3,2'); saves(g.unit(d2.id), -50);
    g.turn(d2); perk(g, g.unit(d2.id), 'class:defender.brace', { actionId: 'brace' });
    g.turn(fi); g.unit(fi.id).side = 'foe' as any; // the Fighter's Shove needs an enemy: stand it on the other side for the test
    perk(g, g.unit(fi.id), 'class:fighter.shove', { targetId: d2.id, choice: 'prone' });
    expect(g.unit(d2.id).prone).toBeFalsy(); expect(g.unit(d2.id).braced).toBe(true);
  });
  it('Anchor: an enemy that started its turn next to you can\'t Disengage away without your opportunity attack', () => {
    for (const rank of [8, 5]) {
      const f = fightWith([cls('defender', rank)], [{}]);
      const d = at(f, f.pc, '4,2'); d.attack = 60; const foe = tough(at(f, f.foe, '5,2'));
      f.turn(foe);
      withGame(f.g, () => moveUnit(f.cb, f.unit(foe.id), '6,2', f.g.rng, 'disengage'));
      expect(logHas(f.cb, /is Anchored: .* can't slip away/), 'rank ' + rank).toBe(rank === 8);
    }
  });
  it('Anchor in the enemy AI: a foe that started next to the Defender weighs the blow (+10 a tile) before walking off', () => {
    // The Defender is Hidden here so the foe's walk is decided by the far squadmate alone (the AI otherwise closes on the
    // nearest player, the Defender itself): without Anchor it walks off toward them; with Anchor it keeps beside the Defender.
    const tiles: Record<number, string> = {};
    for (const rank of [8, 5]) {
      const f = fightWith([cls('defender', rank), {}], [{ weapon: 'combat_knife' }]);
      const [d, p] = f.pcs; at(f, d, '5,2').hidden = true; at(f, p, '15,2'); tough(at(f, f.foe, '6,2'));
      order(f, d, f.foe, p); f.turn(d); act(f, f.unit(d.id), { type: 'combat/end-turn' });
      tiles[rank] = f.unit(f.foe.id).pos;
    }
    const cheb = (a: string, b: string) => Math.max(...a.split(',').map((v, i) => Math.abs(+v - +b.split(',')[i])));
    expect(cheb(tiles[8], '5,2')).toBe(1); // kept next to the Anchor
    expect(cheb(tiles[5], '5,2')).toBeGreaterThan(1); // no Anchor: it walks off
  });
});

// ======================================================================================================== FIGHTER
describe('Fighter', () => {
  it('Shove: 1 AP, push 1 tile on a failed Body save, or knock Prone; a save holds', () => {
    const f = fightWith([cls('fighter', 3)], [{}]);
    const u = at(f, f.pc, '4,2'); saves(at(f, f.foe, '5,2'), -50); f.turn(u);
    perk(f, u, 'class:fighter.shove', { targetId: f.foe.id, choice: 'push' });
    expect(f.foe.pos).toBe('6,2'); expect(f.unit(u.id).ap).toBe(5); expect(fx(f, 'shove').at(-1)).toMatchObject({ ok: true, to: '6,2' });
    at(f, f.foe, '5,2'); seed(f, 5); perk(f, u, 'class:fighter.shove', { targetId: f.foe.id, choice: 'prone' });
    expect(f.foe.prone).toBe(true);
    saves(f.unit(f.foe.id), 50); f.unit(f.foe.id).prone = false; seed(f, 10);
    perk(f, u, 'class:fighter.shove', { targetId: f.foe.id, choice: 'push' });
    expect(f.foe.pos).toBe('5,2'); expect(logHas(f.cb, /holds firm/)).toBe(true);
  });
  it('Shove: refused (nothing spent) when the push is blocked, or the target isn\'t adjacent', () => {
    const f = fightWith([cls('fighter', 3)], [{}, {}]);
    const u = at(f, f.pc, '4,2'); at(f, f.foes[0], '5,2'); at(f, f.foes[1], '6,2'); f.turn(u);
    expect(() => perk(f, u, 'class:fighter.shove', { targetId: f.foes[0].id, choice: 'push' })).toThrow(/knock them Prone instead/);
    at(f, f.foes[0], '8,2');
    expect(() => perk(f, u, 'class:fighter.shove', { targetId: f.foes[0].id })).toThrow(/Out of range/);
    expect(f.unit(u.id).ap).toBe(6);
  });
  it('Unstoppable: Pinned and Slowed set aside (they come back next turn), Fear refused, no opportunity attack, +2 Momentum; once a scene', () => {
    const f = fightWith([cls('fighter', 8)], [{}]);
    let u = at(f, f.pc, '4,2'); at(f, f.foe, '5,2'); f.foe.attack = 60; u = f.turn(u);
    withGame(f.g, () => { applyCond(f.cb, f.g.rng, f.foe, f.unit(u.id), 'pinned', 3, undefined, { skipSave: true }); applyCond(f.cb, f.g.rng, f.foe, f.unit(u.id), 'slowed', 3, undefined, { skipSave: true }); });
    expect(() => act(f, u, { type: 'combat/move', to: '2,2' })).toThrow(/Pinned/);
    perk(f, u, 'class:fighter.unstoppable');
    expect(condOn(f.unit(u.id), 'pinned')).toBe(false); expect(f.unit(u.id).res!.momentum).toBe(3); // the 1 a fight starts with, +2 expect(fx(f, 'unstoppable').length).toBe(1);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.unit(u.id), 'fear', 2, undefined, { skipSave: true }));
    expect(condOn(f.unit(u.id), 'fear')).toBe(false);
    const n = f.cb.log.length; act(f, u, { type: 'combat/move', to: '2,2' });
    expect(f.cb.log.slice(n).some((l) => /opportunity attack/.test(l))).toBe(false);
    expect(() => perk(f, u, 'class:fighter.unstoppable')).toThrow(/next scene/);
    f.turn(u); // the next turn: what was set aside is back, one round down
    expect(condOn(f.unit(u.id), 'pinned')).toBe(true); expect(f.unit(u.id).conds!.pinned).toBe(2);
  });
});

// ======================================================================================================== MARKSMAN
describe('Marksman', () => {
  it('Speed Loader: the first reload of a turn costs 1 AP less, the second the full 2', () => {
    const f = fightWith([cls('marksman', 3, { weapon: 'hellraiser_service_rifle' })], [{}]);
    let u = f.turn(f.pc); u.ammo = 3; u.mags = [30, 30];
    act(f, u, { type: 'combat/reload' }); expect(f.unit(u.id).ap).toBe(5);
    f.unit(u.id).ammo = 3; act(f, u, { type: 'combat/reload' }); expect(f.unit(u.id).ap).toBe(3);
    f.cb.round++; u = f.turn(u); f.unit(u.id).ammo = 3; f.unit(u.id).mags = [30]; act(f, u, { type: 'combat/reload' }); expect(f.unit(u.id).ap).toBe(5);
  });
  it('Speed Loader: a character without it pays 2', () => {
    const f = fightWith([cls('fighter', 3, { weapon: 'hellraiser_service_rifle' })], [{}]);
    const u = f.turn(f.pc); u.ammo = 3; u.mags = [30];
    act(f, u, { type: 'combat/reload' }); expect(f.unit(u.id).ap).toBe(4);
  });
  it('Duck and Roll: on the enemy\'s shot, a step behind the pillar takes you out of sight (the shot isn\'t taken)', () => {
    const f = fightWith([cls('marksman', 5)], [{}]);
    const m = tough(at(f, f.pc, '11,7')), foe = at(f, f.foe, '12,4'); order(f, m, foe);
    f.turn(m); act(f, m, { type: 'combat/end-turn' });
    expect(logHas(f.cb, /ducks and rolls to .*out of .*sight/)).toBe(true);
    expect(fx(f, 'duck')[0]).toMatchObject({ unit: m.id, out: true });
    const i = f.cb.log.findIndex((l) => /ducks and rolls/.test(l));
    expect(f.cb.log[i + 1]).toMatch(/can't attack .*can't see it/); // the shot had no target: not taken, no AP spent on it
  });
  it('Duck and Roll: into cover counts −2 to hit; off, no step', () => {
    const mods: Record<string, number> = {};
    for (const on of [true, false]) {
      const f = fightWith([cls('marksman', 5)], [{}]);
      const m = tough(at(f, f.pc, '4,1')), foe = at(f, f.foe, '9,3'); order(f, m, foe);
      f.turn(m); if (!on) perk(f, m, 'class:marksman.duck_and_roll', { actionId: 'duck_off' });
      act(f, m, { type: 'combat/end-turn' });
      expect(logHas(f.cb, /ducks and rolls .*into cover \(−2/), 'on ' + on).toBe(on);
      expect(f.unit(m.id).pos).toBe(on ? '4,2' : '4,1');
      const shot = f.cb.log.find((l) => /^Foe 1 fires at/.test(l))!, mm = /d20 \d+ ([+−])(\d+)/.exec(shot)!;
      mods[String(on)] = (mm[1] === '−' ? -1 : 1) * +mm[2];
      expect(shot).not.toMatch(/cover/); // the −2 replaces the half cover's −5
    }
    expect(mods.true).toBe(mods.false - 2);
  });
});

// ======================================================================================================== INFILTRATOR
describe('Infiltrator', () => {
  it('Vanish: 1 AP, Hidden when no enemy sees you; refused in sight', () => {
    const f = fightWith([cls('infiltrator', 3)], [{}]);
    let u = at(f, f.pc, '9,6'); at(f, f.foe, '12,6'); u = f.turn(u);
    perk(f, u, 'class:infiltrator.vanish');
    expect(f.unit(u.id).hidden).toBe(true); expect(f.unit(u.id).ap).toBe(5);
    const g = fightWith([cls('infiltrator', 3)], [{}]);
    const v = g.turn(at(g, g.pc, '4,2')); at(g, g.foe, '8,2');
    expect(() => perk(g, v, 'class:infiltrator.vanish')).toThrow(/can see you/);
  });
  it('Field Fix: clear a squadmate\'s jam, restore their weapon, repair a machine for 20; nothing to fix is refused', () => {
    const f = fightWith([cls('infiltrator', 5), { traits: ['factory_made'] }], [{ at: 'P11' }]);
    const [i, a] = f.pcs; at(f, i, '4,2'); at(f, a, '5,2');
    let u = f.turn(i); f.unit(a.id).jammed = true;
    perk(f, u, 'class:infiltrator.field_fix', { targetId: a.id, choice: 'clear_jam' });
    expect(f.unit(a.id).jammed).toBe(false); expect(f.unit(u.id).ap).toBe(4);
    const al = f.unit(a.id); al.maxDur = al.maxDur || 100; al.dur = 10;
    perk(f, u, 'class:infiltrator.field_fix', { targetId: a.id, choice: 'restore_durability' });
    expect(f.unit(a.id).dur).toBeGreaterThan(10);
    f.cb.round++; u = f.turn(u); f.unit(a.id).hp = 30;
    perk(f, u, 'class:infiltrator.field_fix', { targetId: a.id, choice: 'repair_machine' });
    expect(f.unit(a.id).hp).toBe(50);
    f.unit(a.id).hp = f.unit(a.id).maxHp; f.unit(a.id).dur = f.unit(a.id).maxDur;
    expect(() => perk(f, u, 'class:infiltrator.field_fix', { targetId: a.id })).toThrow(/Nothing to fix/);
  });
  it('Sabotage: a drone is disabled for 2 rounds (no turns); a human is refused', () => {
    const f = fightWith([cls('infiltrator', 8)], [{ name: 'Drill drone' }, { name: 'Trooper' }]);
    const u = at(f, f.pc, '4,2'), drone = at(f, f.foes[0], '5,2'); at(f, f.foes[1], '5,3'); f.turn(u);
    perk(f, u, 'class:infiltrator.sabotage', { actionId: 'sabotage', targetId: drone.id });
    expect(condOn(f.unit(drone.id), 'stunned')).toBe(true); expect(f.unit(drone.id).conds!.stunned).toBe(2);
    expect(() => perk(f, u, 'class:infiltrator.sabotage', { actionId: 'sabotage', targetId: f.foes[1].id })).toThrow(/isn't a machine/);
  });
  it('Sabotage: a rigged tile springs on the next enemy (30, Pinned on a failed Body save), never on your side', () => {
    const f = fightWith([cls('infiltrator', 8), {}], [{}]);
    const [i, p] = f.pcs; at(f, i, '4,2'); at(f, p, '3,3'); f.turn(i);
    perk(f, f.unit(i.id), 'class:infiltrator.sabotage', { actionId: 'rig' });
    expect(objectsOf(f.cb).some((o: any) => o.rig && o.pos === '4,2')).toBe(true);
    act(f, f.unit(i.id), { type: 'combat/move', to: '4,4' });
    f.turn(p); expect(() => act(f, f.unit(p.id), { type: 'combat/move', to: '4,2' })).toThrow(/Can't reach/); // your side knows it and walks round it
    const foe = tough(saves(at(f, f.foe, '6,2'), -50)); foe.armour = 0;
    f.turn(foe); seed(f, 5); withGame(f.g, () => moveUnit(f.cb, f.unit(foe.id), '4,2', f.g.rng));
    expect(f.unit(foe.id).hp).toBe(999 - 30); expect(condOn(f.unit(foe.id), 'pinned')).toBe(true);
    expect(objectsOf(f.cb).some((o: any) => o.rig)).toBe(false);
  });
  it('Sabotage: a barricade stops blocking the way for 2 rounds (a way through, not a place to stop: item 568)', () => {
    const f = fightWith([cls('infiltrator', 8)], [{ at: 'P11' }]);
    const u = at(f, f.pc, '4,2'); f.cb.objects = [...objectsOf(f.cb), makeObject('bx', 'barricade', '5,2')]; f.turn(u);
    perk(f, u, 'class:infiltrator.sabotage', { actionId: 'sabotage_object', tile: '5,2' });
    expect(paths(f.cb, '4,2', u.id).dist['6,2']).toBe(2); // straight through it
    expect(() => act(f, f.unit(u.id), { type: 'combat/move', to: '5,2' })).toThrow();
    act(f, f.unit(u.id), { type: 'combat/move', to: '6,2' });
    expect(f.unit(u.id).pos).toBe('6,2');
  });
});

// ======================================================================================================== MAGE
describe('Mage', () => {
  it('Core Change: a core swap costs 1 AP, not 2; with no spare core it is refused', () => {
    const f = fightWith([cls('mage', 3, MIND)], [{}]);
    const u = f.turn(f.pc); u.mg!.charge = 1;
    act(f, u, { type: 'combat/core' }); expect(f.unit(u.id).ap).toBe(5); expect(f.unit(u.id).mg!.charge).toBe(10);
    f.unit(u.id).mg!.cores = 0; expect(() => act(f, u, { type: 'combat/core' })).toThrow(/No spare cores/);
    const g = fightWith([cls('trickster', 3, MIND)], [{}]); const v = g.turn(g.pc); v.mg!.charge = 1;
    act(g, v, { type: 'combat/core' }); expect(g.unit(v.id).ap).toBe(4);
  });
  it('Bleed the Flux: a Vent costs 0 AP, and the next glyph adds 1 Flux less (that point into the air); with no Flux it is refused', () => {
    const f = fightWith([cls('mage', 5, MIND)], [{}]);
    const u = f.turn(at(f, f.pc, '4,2')); u.mg!.flux = 3; const m0 = manaOf(f.cb);
    act(f, u, { type: 'combat/vent' });
    expect(f.unit(u.id).ap).toBe(6); expect(f.unit(u.id).mg!.flux).toBe(0); expect(manaOf(f.cb)).toBe(m0 + 3);
    const w = f.unit(u.id).mg!.words[0];
    act(f, u, { type: 'combat/draw', word: w, tile: '4,2' });
    expect(f.unit(u.id).mg!.flux).toBe(0); expect(manaOf(f.cb)).toBe(m0 + 4);
    expect(() => act(f, u, { type: 'combat/vent' })).toThrow(/No Flux to vent/);
  });
});

// ======================================================================================================== TRICKSTER
describe('Trickster', () => {
  it('Read: Analyze costs 1 AP and names the enemy\'s next action, which its turn then does', () => {
    const f = fightWith([cls('trickster', 3, MIND)], [{}]);
    const u = tough(at(f, f.pc, '4,2')), foe = at(f, f.foe, '7,2'); order(f, u, foe); f.turn(u);
    act(f, u, { type: 'combat/analyze', targetId: foe.id });
    expect(f.unit(u.id).ap).toBe(5);
    const it0 = f.unit(foe.id).readIntent!; expect(it0).toMatchObject({ kind: 'attack', targetId: u.id, by: u.id });
    expect(fx(f, 'intent')[0]).toMatchObject({ target: foe.id, kind: 'attack' });
    expect(logHas(f.cb, /Read: .* means to (shoot|use Suppress on)/)).toBe(true); // rules 1.12: a soldier opens with Suppress
    const n = f.cb.log.length; act(f, f.unit(u.id), { type: 'combat/end-turn' });
    expect(f.cb.log.slice(n).some((l) => l.startsWith(foe.name + ' fires at ' + u.name))).toBe(true);
    expect(f.unit(foe.id).readIntent).toBeUndefined(); // cleared when its turn ended
    expect(() => act(f, f.unit(u.id), { type: 'combat/analyze', targetId: foe.id })).toThrow(/already analyzed/);
  });
  it('Read is pure: reading an intent rolls nothing and changes nothing', () => {
    const f = fightWith([{}], [{}]);
    const s0 = f.g.rng.state, before = JSON.stringify(f.cb);
    const it0 = withGame(f.g, () => enemyIntent(f.cb, f.foe));
    expect(it0.kind).toMatch(/attack|move/); expect(f.g.rng.state).toBe(s0); expect(JSON.stringify(f.cb)).toBe(before);
  });
  it('False Image: 1 charge, a decoy the fooled enemy shoots instead of you; it scatters when struck', () => {
    const f = fightWith([cls('trickster', 3, MIND)], [{}]);
    const u = tough(at(f, f.pc, '4,2')), foe = saves(at(f, f.foe, '10,2'), -50); order(f, u, foe); f.turn(u);
    const ch = f.unit(u.id).mg!.charge;
    perk(f, u, 'class:trickster.false_image', { tile: '6,4' });
    expect(f.unit(u.id).mg!.charge).toBe(ch - 1); expect(f.cb.images![0]).toMatchObject({ owner: u.id, pos: '6,4', fooled: [foe.id] });
    expect(withGame(f.g, () => enemyIntent(f.cb, f.unit(foe.id)))).toMatchObject({ kind: 'attack', image: f.cb.images![0].id });
    act(f, f.unit(u.id), { type: 'combat/end-turn' });
    expect(logHas(f.cb, /passes through a False Image/)).toBe(true);
    expect(fx(f, 'image_gone').at(-1)).toMatchObject({ why: 'struck' }); expect(f.cb.images || []).toEqual([]);
  });
  it('False Image: refused out of range or with no charge', () => {
    const f = fightWith([cls('trickster', 3, MIND)], [{}]);
    const u = f.turn(at(f, f.pc, '1,2'));
    expect(() => perk(f, u, 'class:trickster.false_image', { tile: '12,2' })).toThrow(/Out of range/);
    f.unit(u.id).mg!.charge = 0;
    expect(() => perk(f, u, 'class:trickster.false_image', { tile: '3,2' })).toThrow(/charge/);
  });
  it('Silver Tongue: a failed Brain save costs 2 AP on its next turn (a Boss 1); a machine or a far target is refused', () => {
    for (const tier of ['soldier', 'boss']) {
      const f = fightWith([cls('trickster', 5, MIND)], [{ tier }]);
      const u = tough(at(f, f.pc, '4,2')), foe = saves(at(f, f.foe, '8,2'), -50); order(f, u, foe); f.turn(u);
      seed(f, 5); perk(f, u, 'class:trickster.silver_tongue', { targetId: foe.id });
      f.turn(foe);
      expect(f.unit(foe.id).ap, tier).toBe(tier === 'boss' ? 5 : 4); expect(logHas(f.cb, /AP \(Silver Tongue\)/)).toBe(true);
    }
    const g = fightWith([cls('trickster', 5, MIND)], [{ name: 'Sentry turret' }, {}]);
    const v = g.turn(at(g, g.pc, '4,2')); at(g, g.foes[0], '6,2'); at(g, g.foes[1], '12,2');
    expect(() => perk(g, v, 'class:trickster.silver_tongue', { targetId: g.foes[0].id })).toThrow(/doesn't listen/);
    expect(() => perk(g, v, 'class:trickster.silver_tongue', { targetId: g.foes[1].id })).toThrow(/Too far to be heard|Out of range/);
  });
  it('Silver Tongue: the enemy AI walks on what it has left', () => {
    const f = fightWith([cls('trickster', 5, MIND)], [{ weapon: 'combat_knife' }]);
    const u = tough(at(f, f.pc, '1,2')), foe = saves(at(f, f.foe, '7,2'), -50); order(f, u, foe); f.turn(u);
    seed(f, 5); perk(f, u, 'class:trickster.silver_tongue', { targetId: foe.id });
    at(f, f.unit(foe.id), '14,2'); // it walks from afar on its 4 AP
    act(f, f.unit(u.id), { type: 'combat/end-turn' });
    expect(logHas(f.cb, new RegExp(foe.name + ' [-−]2 AP \\(Silver Tongue\\)'))).toBe(true);
    const g = fightWith([cls('trickster', 5, MIND)], [{ weapon: 'combat_knife' }]);
    const v = tough(at(g, g.pc, '1,2')), gf = at(g, g.foe, '14,2'); order(g, v, gf); g.turn(v); act(g, g.unit(v.id), { type: 'combat/end-turn' });
    expect(+f.unit(foe.id).pos.split(',')[0]).toBeGreaterThan(+g.unit(gf.id).pos.split(',')[0]); // it got less far
  });
  it('Sleight: swap places with a squadmate or your image, once a scene', () => {
    const f = fightWith([cls('trickster', 8, MIND), {}], [{ at: 'P11' }]);
    const [t, a] = f.pcs; at(f, t, '2,2'); at(f, a, '6,2'); f.turn(t);
    perk(f, f.unit(t.id), 'class:trickster.sleight', { actionId: 'sleight', targetId: a.id });
    expect(f.unit(t.id).pos).toBe('6,2'); expect(f.unit(a.id).pos).toBe('2,2'); expect(fx(f, 'swap').length).toBe(1);
    expect(() => perk(f, f.unit(t.id), 'class:trickster.sleight', { actionId: 'sleight', targetId: a.id })).toThrow(/next scene/);
    const g = fightWith([cls('trickster', 8, MIND)], [{ at: 'P11' }]);
    const v = g.turn(at(g, g.pc, '2,2'));
    perk(g, v, 'class:trickster.false_image', { tile: '4,4' });
    perk(g, g.unit(v.id), 'class:trickster.sleight', { actionId: 'sleight_image' });
    expect(g.unit(v.id).pos).toBe('4,4'); expect(g.cb.images![0].pos).toBe('2,2');
    expect(() => perk(g, g.unit(v.id), 'class:trickster.sleight', { actionId: 'sleight_image' })).toThrow(/next scene/); // one use a scene between the two
  });
});

// ======================================================================================================== BARD
describe('Bard', () => {
  it('Rally: allies within 4 heal 20 × Healing given and lose Fear and Shaken; the far one doesn\'t; once a scene', () => {
    const f = fightWith([cls('bard', 8), {}, {}], [{ at: 'P11' }]);
    const [b, a, far] = f.pcs; at(f, b, '2,2'); at(f, a, '4,2'); at(f, far, '9,2');
    f.unit(a.id).hp = 20; f.unit(far.id).hp = 20;
    withGame(f.g, () => { applyCond(f.cb, f.g.rng, f.foe, f.unit(a.id), 'fear', 3, undefined, { skipSave: true }); applyCond(f.cb, f.g.rng, f.foe, f.unit(a.id), 'shaken', 3, undefined, { skipSave: true }); });
    f.turn(b); perk(f, f.unit(b.id), 'class:bard.rally');
    const n = Math.floor(Math.floor(20 * healingMult(charOf(f, b))) * (f.unit(a.id).healRecv || 1));
    expect(f.unit(a.id).hp).toBe(20 + n);
    expect(condOn(f.unit(a.id), 'fear')).toBe(false); expect(condOn(f.unit(a.id), 'shaken')).toBe(false);
    expect(f.unit(far.id).hp).toBe(20); expect(f.unit(b.id).ap).toBe(4);
    expect(() => perk(f, f.unit(b.id), 'class:bard.rally')).toThrow(/next scene/);
  });
  it('Rally: refused with nobody in reach', () => {
    const f = fightWith([cls('bard', 8)], [{ at: 'P11' }]);
    const b = f.turn(f.pc);
    expect(() => perk(f, b, 'class:bard.rally')).toThrow(/No squadmate within 4/);
  });
});

// ======================================================================================================== CHANNELER
describe('Channeler', () => {
  it('Iron Heart: Strain limit +1 (the sheet and the fight\'s unit)', () => {
    const f = fightWith([cls('channeler', 3, SOUL), cls('guardian', 3, SOUL)], [{}]);
    const [c, g] = f.pcs;
    expect(strainLimit(charOf(f, c))).toBe(strainLimit(charOf(f, g)) + 1);
    expect(f.unit(c.id).mg!.strainLimit).toBe(strainLimit(charOf(f, c)));
  });
  it('Occult Library: one more ready design; learn one more tone out of a fight, once', () => {
    const s = storyWith([cls('channeler', 5, SOUL), cls('channeler', 3, SOUL)]);
    const [c, d] = s.chars.map((x) => s.g.characters[x.id]);
    expect(readyDesigns(c)).toBe(readyDesigns(d) + 1);
    const known = c.soulKnown?.tones || [], tone = ['fire', 'frost', 'storm', 'stone', 'acid', 'poison', 'light', 'shadow'].find((t) => !known.includes(t)) || 'fire';
    s.act({ type: 'story/perk', charId: c.id, id: 'class:channeler.occult_library', actionId: 'occult_tone', choice: tone } as any);
    expect(s.g.characters[c.id].soulKnown!.tones).toContain(tone);
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'class:channeler.occult_library', actionId: 'occult_tone', choice: tone } as any)).toThrow();
  });
  it('Eye of the Storm: the next Release adds no Strain (Heart Surge\'s included) and its riders count a stage higher; once a scene', () => {
    const run = (eye: boolean) => {
      const f = fightWith([cls('channeler', 8, SOUL)], [{}]);
      const u = tough(at(f, f.pc, '4,2')); const foe = tough(at(f, f.foe, '7,2')); f.turn(u);
      const d = f.unit(u.id).mg!.designs[0].id;
      act(f, f.unit(u.id), { type: 'combat/outburst', design: d, hold: true });
      if (eye) perk(f, f.unit(u.id), 'class:channeler.eye_of_the_storm');
      const s0 = f.unit(u.id).mg!.strain;
      act(f, f.unit(u.id), { type: 'combat/release', aim: foe.pos, mods: ['class:channeler.heart_surge#surge'] });
      return { f, u, strain: f.unit(u.id).mg!.strain - s0, rs: fx(f, 'release').at(-1)!.riderStage };
    };
    const a = run(true), b = run(false);
    expect(a.strain).toBe(0); expect(b.strain).toBeGreaterThan(0);
    expect(a.rs).toBe(Math.min(4, b.rs + 1));
    expect(fx(a.f, 'eye_storm').length).toBe(1);
    expect(() => perk(a.f, a.f.unit(a.u.id), 'class:channeler.eye_of_the_storm')).toThrow(/next scene/);
  });
});

// ======================================================================================================== GUARDIAN
describe('Guardian', () => {
  it('Command: a squadmate within 6 walks up to 2 tiles for no AP of theirs; Authority 0 or 3 tiles is refused', () => {
    const f = fightWith([cls('guardian', 3, { skills: { authority: 1 } }), {}], [{ at: 'P11' }]);
    const [g, a] = f.pcs; at(f, g, '2,2'); at(f, a, '4,2');
    const ap0 = f.unit(a.id).ap; f.turn(g);
    perk(f, f.unit(g.id), 'class:guardian.command', { targetId: a.id, tile: '6,2' });
    expect(f.unit(a.id).pos).toBe('6,2'); expect(f.unit(a.id).ap).toBe(ap0); expect(f.unit(g.id).ap).toBe(5);
    expect(fx(f, 'command_move').length).toBe(1);
    f.turn(g);
    expect(() => perk(f, f.unit(g.id), 'class:guardian.command', { targetId: a.id, tile: '9,2' })).toThrow(/Up to 2 tiles/);
    const h = fightWith([cls('guardian', 3, { skills: { authority: 0 } }), {}], [{ at: 'P11' }]);
    const [g2, a2] = h.pcs; at(h, a2, '4,2'); h.turn(g2);
    expect(() => perk(h, h.unit(g2.id), 'class:guardian.command', { targetId: a2.id, tile: '5,2' })).toThrow(/Leadership Squad/);
  });
});

void beginTurn;
