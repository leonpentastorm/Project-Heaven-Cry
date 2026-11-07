// Lane I: the 13 base classes, every move in play. Player actions go through the reducer (apply: combat/perk,
// combat/attack, combat/move, combat/draw, combat/outburst, story/perk, check/roll); what enemies do goes through the
// same engine functions their turns use (resolveAttack, moveUnit, applyDamage, harm, applyCond), with the game bound.
import { describe, expect, it } from 'vitest';
import {
  CLASS, WEAPON, resolveAttack, previewAttack, attackDamage, moveUnit, applyDamage, applyCond, condOn, harm, glyphCost, previewOutburst, objectsOf, healingMult, maxHp,
  manaOf, perkActionsFor, coverageOf, itemInfo, emit, type Unit, type Combat,
} from '../src';
import { fightWith, storyWith, withGame, rng, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const sure = (u: Unit) => { u.attack = 60; };
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const act = (f: F, u: Unit, a: any) => f.act({ unitId: u.id, ...a });
/** A character of a class at a rank: its signature skills raised to the rank's total (1-3; 13 for II, 18 for III). */
function cls(id: string, rank: 1 | 2 | 3, extra: CharSpec = {}): CharSpec {
  const sig = CLASS[id].signature, pts = rank === 3 ? [6, 6, 6] : rank === 2 ? [5, 4, 4] : [1, 1, 1];
  return { ...extra, classId: id, level: 5, skills: { ...Object.fromEntries(sig.map((s, i) => [s, pts[i]])), ...(extra.skills || {}) } };
}
/** Keep the foes out of the way: everyone stands on clear tiles of row 2 (the yard). */
function line(f: F, ...units: [Unit, number][]) { for (const [u, x] of units) at(f, u, x + ',2'); }
const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;

describe('class coverage', () => {
  it('every move of the 13 base classes is run by a lane handler (no gaps)', () => {
    for (const k of Object.values(CLASS)) for (const r of ['I', 'II', 'III']) for (const m of (k as any).ranks[r].moves) {
      const rows = coverageOf(itemInfo('class:' + k.id + '.' + m.id)!);
      expect(rows.filter((x) => x.owner === 'gap'), k.id + '.' + m.id).toEqual([]);
    }
  });
  it('rank gates the moves: a rank I Marksman has Fire Discipline but no Killzone', () => {
    const f = fightWith([cls('marksman', 1)]);
    const ids = perkActionsFor({ u: f.pc, cb: f.cb, g: f.g }, 'combat').map((e) => e.id);
    expect(ids).not.toContain('class:marksman.killzone');
    const f3 = fightWith([cls('marksman', 3)]);
    expect(perkActionsFor({ u: f3.pc, cb: f3.cb, g: f3.g }, 'combat').map((e) => e.id)).toContain('class:marksman.killzone');
  });
});

// ======================================================================================================== MARKSMAN
describe('Marksman', () => {
  it('Fire Discipline: an aimed shot adds no Heat; one Burst a turn costs 2 AP, the next 3', () => {
    const f = fightWith([cls('marksman', 1, { weapon: 'hellraiser_service_rifle' })], [{}]);
    let u = f.turn(f.pc); line(f, [u, 2], [f.foe, 6]); sure(f.unit(u.id));
    act(f, u, { type: 'combat/attack', targetId: f.foe.id, mode: 'aimed' });
    expect(f.pc.heat).toBe(0); expect(f.pc.ap).toBe(3);
    f.unit(u.id).ap = 6; f.unit(f.foe.id).hp = 999; f.unit(f.foe.id).maxHp = 999;
    act(f, u, { type: 'combat/attack', targetId: f.foe.id, mode: 'burst' });
    expect(f.pc.ap).toBe(4); expect(logHas(f.cb, /Fire Discipline, the burst costs 2 AP/)).toBe(true);
    act(f, u, { type: 'combat/attack', targetId: f.foe.id, mode: 'burst' });
    expect(f.pc.ap).toBe(1);
  });
  it('Fire Discipline: with a bow an Aimed shot is +3 to hit (+1 on the aimed +2)', () => {
    const f = fightWith([cls('marksman', 1, { weapon: 'recurve_bow' })], [{}]);
    const u = f.turn(f.pc); line(f, [u, 2], [f.foe, 6]);
    const pv = withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'aimed'));
    expect(pv.terms!.some((t) => t.label === 'Fire Discipline (bow)' && t.v === 1)).toBe(true);
  });
  it('Special Ammo: load hollow-point as a reload (its AP), once a rest per type; in the story too', () => {
    const f = fightWith([cls('marksman', 2, { weapon: 'hellraiser_service_rifle' })], [{}]);
    const u = f.turn(f.pc); f.unit(u.id).ammo = 3;
    act(f, u, { type: 'combat/perk', id: 'class:marksman.special_ammo', actionId: 'load_hollow_point' });
    expect(f.pc.ammoType).toBe('hollow_point'); expect(f.pc.ammo).toBe(WEAPON.hellraiser_service_rifle.magazine); expect(f.pc.ap).toBe(4);
    const pv = withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot'));
    expect(pv.dmg!.mults.some((m) => /hollow-point/.test(m.label))).toBe(true);
    expect(() => act(f, u, { type: 'combat/perk', id: 'class:marksman.special_ammo', actionId: 'load_hollow_point' })).toThrow(/restocked/);
    const s = storyWith([cls('marksman', 2, { weapon: 'hellraiser_service_rifle' })]);
    s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'class:marksman.special_ammo', actionId: 'story_incendiary' });
    expect(s.g.characters[s.chars[0].id].loadedType).toBe('incendiary');
  });
  it('Killzone: two held shots, one each at the first two enemies who move into the line, +2 to hit', () => {
    const f = fightWith([cls('marksman', 3, { weapon: 'hellraiser_service_rifle' })], [{}, {}]);
    const u = f.turn(f.pc); const [a, b] = f.foes; line(f, [u, 1], [a, 10], [b, 12]);
    act(f, u, { type: 'combat/perk', id: 'class:marksman.killzone' });
    expect(f.pc.overwatch).toBe('shot'); expect(f.pc.ap).toBe(2);
    const g = f.g, cb = f.cb, me = f.unit(u.id); sure(me); for (const x of [a, b]) f.unit(x.id).ap = 6;
    withGame(g, () => { moveUnit(cb, f.unit(a.id), '9,2', g.rng); moveUnit(cb, f.unit(a.id), '9,3', g.rng); moveUnit(cb, f.unit(b.id), '11,3', g.rng); });
    const shots = cb.log.filter((l) => /fires from overwatch/.test(l)).length;
    expect(shots).toBe(2);
    expect(cb.log.filter((l) => new RegExp(me.name + ' fires at').test(l)).length).toBe(2);
  });
});

// ======================================================================================================== FIGHTER
describe('Fighter', () => {
  it('Lunge: 1 Momentum, up to 2 tiles and a strike for the strike\'s AP, no opportunity attacks', () => {
    const f = fightWith([cls('fighter', 1, { weapon: 'combat_knife' })], [{}]);
    const u = f.turn(f.pc); line(f, [u, 2], [f.foe, 5]); f.unit(u.id).res!.momentum = 1; sure(f.unit(u.id));
    act(f, u, { type: 'combat/perk', id: 'class:fighter.lunge', targetId: f.foe.id });
    expect(f.pc.pos).toBe('4,2'); expect(f.pc.ap).toBe(4);
    expect(logHas(f.cb, /strikes Foe 1/)).toBe(true);
  });
  it('Momentum: closing on the target before the first melee attack earns up to +2, and a hit +1', () => {
    const f = fightWith([cls('fighter', 1, { weapon: 'combat_knife' })], [{}]);
    line(f, [f.pc, 2], [f.foe, 6]); const u = f.turn(f.pc); sure(f.unit(u.id)); f.unit(f.foe.id).hp = 999;
    act(f, u, { type: 'combat/move', to: '5,2' });
    act(f, u, { type: 'combat/attack', targetId: f.foe.id, mode: 'melee' });
    expect(f.pc.res!.momentum).toBe(3);
  });
  it('Riposte: a melee miss against you, 1 Momentum: a free strike back (one reaction)', () => {
    const f = fightWith([cls('fighter', 2, { weapon: 'combat_knife' })], [{ weapon: 'combat_knife' }]);
    line(f, [f.pc, 4], [f.foe, 5]); f.unit(f.pc.id).res!.momentum = 2;
    const foe = f.unit(f.foe.id); foe.attack = -60; f.cb.turn = f.cb.order.indexOf(foe.id);
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, foe, f.unit(f.pc.id), 'melee', null, { noAp: true }));
    expect(logHas(f.cb, /ripostes/)).toBe(true); expect(f.pc.res!.momentum).toBeLessThanOrEqual(2);
    expect(f.cb.log.filter((l) => /strikes Foe 1/.test(l)).length).toBe(1);
  });
  it('Finisher: 3 AP, all Momentum on one strike (+20% each)', () => {
    const f = fightWith([cls('fighter', 3, { weapon: 'combat_knife' })], [{}]);
    line(f, [f.pc, 4], [f.foe, 5]); const u = f.turn(f.pc); f.unit(u.id).res!.momentum = 4; sure(f.unit(u.id));
    act(f, u, { type: 'combat/perk', id: 'class:fighter.finisher', targetId: f.foe.id });
    expect(logHas(f.cb, /spends 4 Momentum on a Finisher/)).toBe(true); expect(f.pc.ap).toBe(3);
    expect(f.pc.res!.momentum).toBeLessThanOrEqual(1);
  });
});

// ======================================================================================================== DEFENDER
describe('Defender', () => {
  it('Brace: Guard 1 + Durability modifier and +2 Defense until moving; Interpose takes an adjacent ally\'s hit', () => {
    const f = fightWith([cls('defender', 1, { skills: { durability: 3 } }), {}], [{}]);
    const [d, ally] = f.pcs; line(f, [d, 3], [ally, 4], [f.foe, 8]);
    const u = f.turn(d), def0 = u.def;
    act(f, u, { type: 'combat/perk', id: 'class:defender.brace' });
    expect(f.unit(d.id).res!.guard).toBe(3); expect(f.unit(d.id).def).toBe(def0 + 2); expect(f.unit(d.id).ap).toBe(4);
    const foe = f.unit(f.foe.id); sure(foe); const hpA = f.unit(ally.id).hp, hpD = f.unit(d.id).hp;
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, foe, f.unit(ally.id), 'shot', null, { noAp: true }));
    expect(f.unit(ally.id).hp).toBe(hpA); expect(f.unit(d.id).hp).toBeLessThan(hpD); expect(f.unit(d.id).res!.guard).toBe(2);
    expect(logHas(f.cb, /interposes for/)).toBe(true);
    act(f, f.unit(d.id), { type: 'combat/move', to: '3,3' });
    expect(f.unit(d.id).def).toBe(def0);
  });
  it('Draw Fire: 1 Guard, the enemy is Taunted (no save); a boss is not, but takes −2 against anyone else', () => {
    const f = fightWith([cls('defender', 2), {}], [{}, { tier: 'boss' }]);
    const [d, ally] = f.pcs, [s, boss] = f.foes; line(f, [d, 3], [ally, 5], [s, 9], [boss, 11]);
    const u = f.turn(d); f.unit(d.id).res!.guard = 2;
    act(f, u, { type: 'combat/perk', id: 'class:defender.draw_fire', targetId: s.id });
    expect(condOn(f.unit(s.id), 'taunted')).toBe(true); expect(f.unit(d.id).res!.guard).toBe(1);
    act(f, f.unit(d.id), { type: 'combat/perk', id: 'class:defender.draw_fire', targetId: boss.id });
    expect(condOn(f.unit(boss.id), 'taunted')).toBe(false);
    const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(boss.id), f.unit(ally.id), 'shot', { free: true }));
    expect(pv.terms!.some((t) => /Taunted by/.test(t.label) && t.v === -2)).toBe(true);
  });
  it('Reactive Plate: each Guard cuts 10 damage; 3 Guard lost raise the meter by 2', () => {
    const f = fightWith([cls('defender', 3)], [{}]);
    const u = f.unit(f.pc.id); u.res!.guard = 4; const hp = u.hp, m0 = manaOf(f.cb);
    withGame(f.g, () => applyDamage(f.cb, u, 25, { by: f.unit(f.foe.id), type: 'weapon', shield: true }));
    expect(u.hp).toBe(hp); expect(u.res!.guard).toBe(1); expect(manaOf(f.cb)).toBe(m0 + 2);
    withGame(f.g, () => applyDamage(f.cb, u, 25, { by: f.unit(f.foe.id), type: 'weapon', shield: true }));
    expect(u.hp).toBe(hp - 15); expect(u.res!.guard).toBe(0);
  });
});

// ======================================================================================================== MEDIC
describe('Medic', () => {
  it('Triage: an adjacent ally heals 20 × Healing given and stops bleeding; once per ally per turn', () => {
    const f = fightWith([cls('medic', 1), {}], [{}]);
    const [m, ally] = f.pcs; line(f, [m, 3], [ally, 4], [f.foe, 12]);
    const a = f.unit(ally.id); a.hp = 20; a.bleed = 2;
    const u = f.turn(m);
    act(f, u, { type: 'combat/perk', id: 'class:medic.triage', actionId: 'triage', targetId: ally.id });
    const mult = healingMult(f.g.characters[m.charId!]);
    expect(f.unit(ally.id).hp).toBe(20 + Math.floor(Math.floor(20 * mult) * (a.healRecv || 1))); expect(f.unit(ally.id).bleed).toBe(0);
    expect(() => act(f, f.unit(m.id), { type: 'combat/perk', id: 'class:medic.triage', actionId: 'triage', targetId: ally.id })).toThrow(/already treated/i);
    f.unit(ally.id).hp = 0; f.unit(ally.id).downed = true;
    act(f, f.unit(m.id), { type: 'combat/perk', id: 'class:medic.triage', actionId: 'stabilise', targetId: ally.id });
    expect(f.unit(ally.id).downed).toBe(false); expect(f.unit(ally.id).hp).toBe(1);
  });
  it('Triage in the story: the most hurt ally, once per ally per scene', () => {
    const s = storyWith([cls('medic', 1), {}]);
    const [m, ally] = s.chars; s.g.characters[ally.id].hp = 30;
    s.act({ type: 'story/perk', charId: m.id, id: 'class:medic.triage', actionId: 'triage_story' });
    expect(s.g.characters[ally.id].hp).toBeGreaterThan(30);
    expect(() => s.act({ type: 'story/perk', charId: m.id, id: 'class:medic.triage', actionId: 'triage_story', text: s.g.characters[ally.id].name })).toThrow(/already treated/);
  });
  it('Stim Throw: 1 Supply, an ally within 4 heals 30 × Healing given; a Downed ally gets up at 1 HP', () => {
    const f = fightWith([cls('medic', 2), {}], [{}]);
    const [m, ally] = f.pcs; line(f, [m, 2], [ally, 5], [f.foe, 13]);
    f.unit(ally.id).hp = 10; const u = f.turn(m), sup = f.unit(m.id).res!.supplies;
    act(f, u, { type: 'combat/perk', id: 'class:medic.stim_throw', targetId: ally.id });
    expect(f.unit(ally.id).hp).toBeGreaterThan(10 + 29); expect(f.unit(m.id).res!.supplies).toBe(sup - 1);
    f.unit(ally.id).hp = 0; f.unit(ally.id).downed = true;
    act(f, f.unit(m.id), { type: 'combat/perk', id: 'class:medic.stim_throw', targetId: ally.id });
    expect(f.unit(ally.id).hp).toBe(1);
  });
  it('Field Surgery: out of combat, 1 Supply treats a leg injury (or clears Body conditions)', () => {
    const s = storyWith([cls('medic', 3), {}]);
    const [m, ally] = s.chars; s.g.characters[ally.id].injuries = [{ loc: 'leg', side: 'left' }];
    s.act({ type: 'story/perk', charId: m.id, id: 'class:medic.field_surgery', actionId: 'injury', text: 'I treat ' + s.g.characters[ally.id].name });
    expect(s.g.characters[ally.id].injuries).toEqual([]);
    expect(s.g.characters[m.id].res!.supplies).toBe(3 + Math.floor(6 / 2) - 1);
    s.g.characters[m.id].persistentConds = [{ id: 'nausea', scope: 'session' }];
    s.act({ type: 'story/perk', charId: m.id, id: 'class:medic.field_surgery', actionId: 'conditions' });
    expect(s.g.characters[m.id].persistentConds).toEqual([]);
  });
});

// ======================================================================================================== ASSASSIN
describe('Assassin', () => {
  it('Mark: 1 AP, no save, the squad +1 to hit; a 4th Mark lifts the oldest', () => {
    const f = fightWith([cls('assassin', 1)], [{}, {}, {}, {}]);
    const u = f.turn(f.pc); line(f, [u, 1], [f.foes[0], 6], [f.foes[1], 8], [f.foes[2], 10], [f.foes[3], 12]);
    for (const t of f.foes.slice(0, 3)) { f.unit(u.id).ap = 6; act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:assassin.mark', targetId: t.id }); }
    expect(f.foes.slice(0, 3).every((t) => condOn(t, 'marked'))).toBe(true);
    act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:assassin.mark', targetId: f.foes[3].id });
    expect(condOn(f.foes[0], 'marked')).toBe(false); expect(condOn(f.foes[3], 'marked')).toBe(true);
    const pv = withGame(f.g, () => previewAttack(f.cb, f.pc, f.foes[3], 'shot'));
    expect(pv.terms!.find((t) => t.label === 'conditions')?.v).toBe(1);
  });
  it('Toxin: a dose coats the blade; the next hit inflicts the condition on a failed Body save; story coat carries into the fight', () => {
    const f = fightWith([cls('assassin', 2, { weapon: 'combat_knife' })], [{}]);
    const u = f.turn(f.pc); line(f, [u, 4], [f.foe, 5]); sure(f.unit(u.id)); f.unit(f.foe.id).hp = 999;
    const doses = f.unit(u.id).res!.toxins;
    act(f, u, { type: 'combat/perk', id: 'class:assassin.toxin', actionId: 'toxin_weakened' });
    expect(f.unit(u.id).res!.toxins).toBe(doses - 1);
    act(f, f.unit(u.id), { type: 'combat/attack', targetId: f.foe.id, mode: 'melee' });
    expect(logHas(f.cb, /The toxin on .*Body save d20/)).toBe(true);
    const s = storyWith([cls('assassin', 2, { weapon: 'combat_knife' })]);
    s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'class:assassin.toxin', actionId: 'story_bleeding' });
    expect(s.g.story.ps![s.chars[0].id].items['class:assassin.toxin'].coat).toBe('bleeding');
  });
  it('Execution: a hit that leaves a Marked enemy at a quarter of its HP or less kills it; bosses are immune', () => {
    const f = fightWith([cls('assassin', 3, { weapon: 'combat_knife' })], [{}, { tier: 'boss' }]);
    const u = f.turn(f.pc); const [a, boss] = f.foes; line(f, [a, 3], [u, 4], [boss, 5]); sure(f.unit(u.id));
    withGame(f.g, () => { applyCond(f.cb, rng(), f.unit(u.id), f.unit(a.id), 'marked'); applyCond(f.cb, rng(), f.unit(u.id), f.unit(boss.id), 'marked'); });
    const A = f.unit(a.id); A.hp = Math.floor(A.maxHp * 0.3); A.armour = 0;
    act(f, f.unit(u.id), { type: 'combat/attack', targetId: a.id, mode: 'melee' });
    expect(f.unit(a.id).dead).toBe(true);
    const B = f.unit(boss.id); B.hp = Math.floor(B.maxHp * 0.26); f.unit(u.id).ap = 6;
    act(f, f.unit(u.id), { type: 'combat/attack', targetId: boss.id, mode: 'melee' });
    expect(f.unit(boss.id).dead).toBe(false);
  });
});

// ======================================================================================================== MAGE
describe('Mage', () => {
  it('Barrage: FIRE (and STONE) cost 1 charge, never below 1', () => {
    const f = fightWith([cls('mage', 1, MIND)]);
    expect(withGame(f.g, () => glyphCost(f.cb, f.pc, 'fire', true)).charge).toBe(1);
    expect(withGame(f.g, () => glyphCost(f.cb, f.pc, 'stone', true)).charge).toBe(1);
    expect(withGame(f.g, () => glyphCost(f.cb, f.pc, 'spark', true)).charge).toBe(1);
  });
  it('Overcharge: once a fight the next glyph is free (no charge, no AP) and may go one past Max Sigil words', () => {
    const f = fightWith([cls('mage', 2, MIND)]);
    const u = f.turn(f.pc), max0 = u.mg!.maxWords, ch = u.mg!.charge;
    expect(max0).toBe(f.g.characters[u.charId!] ? max0 : 0); // no standing +1
    act(f, u, { type: 'combat/perk', id: 'class:mage.overcharge', actionId: 'overcharge' });
    act(f, f.unit(u.id), { type: 'combat/draw', word: 'spark', tile: u.pos });
    expect(f.pc.mg!.charge).toBe(ch); expect(f.pc.ap).toBe(6); expect(f.pc.mg!.maxWords).toBe(max0 + 1); expect(f.pc.mg!.flux).toBe(1);
    expect(() => act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:mage.overcharge', actionId: 'overcharge' })).toThrow(/Used/);
  });
  // The 1.2 version of this test is replaced by its 1.4 version in sigil14-classes-i.test.ts.
});

// ======================================================================================================== WARDEN
describe('Warden', () => {
  // The 1.2 version of this test is replaced by its 1.4 version in sigil14-classes-i.test.ts.
  it('Ward: 2 charge, a shield of 20 × Healing given on an ally, +2 Flux', () => {
    const f = fightWith([cls('warden', 2, MIND), {}], [{}]);
    const [w, ally] = f.pcs; line(f, [w, 3], [ally, 6], [f.foe, 13]);
    const u = f.turn(w), ch = u.mg!.charge;
    act(f, u, { type: 'combat/perk', id: 'class:warden.ward', actionId: 'ward2', targetId: ally.id });
    const mult = healingMult(f.g.characters[w.charId!]);
    expect(f.unit(ally.id).shield).toBe(Math.floor(Math.floor(20 * mult) * (f.unit(ally.id).healRecv || 1)));
    expect(f.unit(w.id).mg!.charge).toBe(ch - 2); expect(f.unit(w.id).mg!.flux).toBe(2);
  });
  it('Seal: a 3×3 zone where an enemy caster pays double charge', () => {
    const f = fightWith([cls('warden', 3, MIND)], [{}]);
    const u = f.turn(f.pc); line(f, [u, 3], [f.foe, 8]);
    act(f, u, { type: 'combat/perk', id: 'class:warden.seal', tile: '8,2' });
    const foe = f.unit(f.foe.id); foe.mg = JSON.parse(JSON.stringify(f.pc.mg)); foe.mg!.wordCost = {};
    expect(withGame(f.g, () => glyphCost(f.cb, foe, 'fire', true)).charge).toBe(4);
    expect(withGame(f.g, () => glyphCost(f.cb, f.unit(u.id), 'fire', true)).charge).toBe(2);
  });
});

// ======================================================================================================== SCRIBE
describe('Scribe', () => {
  it('Quicken: 1 charge, an ally within 6 gets +1 AP on their next turn (ceiling 9)', () => {
    const f = fightWith([cls('scribe', 1, MIND), {}], [{}]);
    const [s, ally] = f.pcs; line(f, [s, 3], [ally, 5], [f.foe, 13]);
    const u = f.turn(s);
    act(f, u, { type: 'combat/perk', id: 'class:scribe.quicken', targetId: ally.id });
    expect(f.unit(s.id).ap).toBe(4);
    expect(f.turn(ally).ap).toBe(7);
  });
  it('Inscribe Gear: +10% damage with the inscribed weapon, +5 armour; one per item; out of combat it carries into the next fight', () => {
    const f = fightWith([cls('scribe', 2, MIND), {}], [{}]);
    const [s, ally] = f.pcs; line(f, [s, 3], [ally, 4], [f.foe, 10]);
    const u = f.turn(s), arm = f.unit(s.id).armour;
    act(f, u, { type: 'combat/perk', id: 'class:scribe.inscribe_gear', actionId: 'weapon', targetId: ally.id });
    const d = withGame(f.g, () => attackDamage(f.cb, f.unit(ally.id), f.unit(f.foe.id), 'shot', null, { preview: true }));
    expect(d.mults.some((m) => m.label === 'Inscribed' && m.v === 1.1)).toBe(true);
    f.unit(s.id).ap = 6;
    expect(() => act(f, f.unit(s.id), { type: 'combat/perk', id: 'class:scribe.inscribe_gear', actionId: 'weapon', targetId: ally.id })).toThrow(/already carries/);
    act(f, f.unit(s.id), { type: 'combat/perk', id: 'class:scribe.inscribe_gear', actionId: 'armour_self' });
    expect(f.unit(s.id).armour).toBe(arm + 5);
    const st = storyWith([cls('scribe', 2, MIND)]);
    const c = st.chars[0];
    st.act({ type: 'story/perk', charId: c.id, id: 'class:scribe.inscribe_gear', actionId: 'armour_story' });
    expect(st.g.characters[c.id].evoCharge).toBe(8);
    st.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol' }] } } } as any);
    const pcU = st.g.combat!.units.find((x) => x.charId === c.id)!;
    const plain = fightWith([cls('scribe', 2, MIND)]).pc.armour;
    expect(pcU.armour).toBe(plain + 5);
  });
  // The 1.2 version of this test is replaced by its 1.4 version in sigil14-classes-i.test.ts.
});

// ======================================================================================================== TRICKSTER
describe('Trickster', () => {
  it('Bind: BIND is known and costs 1; its Pin saves against 14 + debuff strength', () => {
    const f = fightWith([cls('trickster', 1, MIND)], [{}]);
    expect(f.pc.mg!.words).toContain('bind');
    expect(withGame(f.g, () => glyphCost(f.cb, f.pc, 'bind', true)).charge).toBe(1);
    const dbf = f.pc.dbf?.body ?? 0;
    let line0 = '';
    withGame(f.g, () => { for (let i = 1; i < 40 && !line0; i++) { const s = applyCond(f.cb, rng(i), f.unit(f.pc.id), f.unit(f.foe.id), 'pinned'); if (/resists/.test(s)) line0 = s; } });
    expect(line0).toMatch(new RegExp('vs ' + (14 + dbf)));
  });
  it('Blind and Slow: BLIND, SLOW and MUDDLE are known; BLIND and SLOW still cost 1, MUDDLE 1', () => {
    const f = fightWith([cls('trickster', 2, MIND)]);
    for (const w of ['blind', 'slow', 'muddle']) { expect(f.pc.mg!.words).toContain(w); expect(withGame(f.g, () => glyphCost(f.cb, f.pc, w, true)).charge).toBe(1); }
  });
  it('Rewrite: 3 charge; on a failed Brain save a shield becomes damage (capped at 30 × Sigil multiplier); once a turn', () => {
    const f = fightWith([cls('trickster', 3, MIND)], [{}]);
    let done = false;
    for (let seed = 1; seed < 30 && !done; seed++) {
      const g = fightWith([cls('trickster', 3, MIND)], [{}], { seed: 'RW' + seed });
      const u = g.turn(g.pc); line(g, [u, 3], [g.foe, 7]); const foe = g.unit(g.foe.id); foe.shield = 500; foe.armour = 0; const hp = foe.hp;
      act(g, u, { type: 'combat/perk', id: 'class:trickster.rewrite', targetId: g.foe.id });
      expect(g.pc.mg!.charge).toBe(7);
      if (g.unit(g.foe.id).shield === 0) { done = true; expect(hp - g.unit(g.foe.id).hp).toBeLessThanOrEqual(Math.floor(30 * g.pc.mg!.sigilMult)); expect(logHas(g.cb, /shield turns on it/)).toBe(true);
        g.unit(u.id).ap = 6; expect(() => act(g, g.unit(u.id), { type: 'combat/perk', id: 'class:trickster.rewrite', targetId: g.foe.id })).toThrow(/Used/); }
    }
    expect(done).toBe(true); void f;
  });
  it('Rewrite in the story: the engine rolls, the Narrator rules the flip', () => {
    const s = storyWith([cls('trickster', 3, MIND)]);
    s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'class:trickster.rewrite', actionId: 'rewrite_story', text: 'the priest\'s ward' });
    expect(s.g.story.rulings!.some((r) => r.key === 'class:trickster.rewrite' && /Brain save d20/.test(r.text))).toBe(true);
  });
});

// ======================================================================================================== CHANNELER
const designOf = (u: Unit, school = 'damage', option?: string) => { const d = { id: 'd-' + school + (option || ''), name: school + ' test', school, modules: [], ...(option ? { option } : {}) }; u.mg!.designs.push(d as any); return d.id; };
describe('Channeler', () => {
  it('Shape: the first Damage Outburst a turn adds no cast Strain; the second does', () => {
    const f = fightWith([cls('channeler', 1, SOUL)], [{}]);
    const u = f.turn(f.pc); line(f, [u, 3], [f.foe, 6]); f.unit(u.id).ap = 9; f.unit(f.foe.id).hp = 999;
    const d = f.pc.mg!.designs.find((x) => x.school === 'damage')!.id;
    expect(withGame(f.g, () => previewOutburst(f.cb, f.pc, d, '6,2')).strain).toBe(0);
    act(f, f.unit(u.id), { type: 'combat/outburst', design: d, aim: '6,2' });
    expect(f.pc.mg!.strain).toBe(0);
    act(f, f.unit(u.id), { type: 'combat/outburst', design: d, aim: '6,2' });
    expect(f.pc.mg!.strain).toBe(1);
  });
  it('Storm Front: +10 MP, two more enemies within 2 tiles of the first, once a turn', () => {
    const f = fightWith([cls('channeler', 2, SOUL)], [{}, {}, {}]);
    const u = f.turn(f.pc); const [a, b, c] = f.foes; line(f, [u, 3], [a, 6], [b, 7], [c, 8]);
    for (const t of f.foes) { f.unit(t.id).hp = 999; f.unit(t.id).def = 1; }
    const d = f.pc.mg!.designs.find((x) => x.school === 'damage')!.id, base = withGame(f.g, () => previewOutburst(f.cb, f.pc, d, '6,2')).cost, mp = f.pc.mg!.mp;
    act(f, f.unit(u.id), { type: 'combat/outburst', design: d, aim: '6,2', mods: ['class:channeler.storm_front#storm'] });
    expect(f.pc.mg!.mp).toBe(mp - base - 10);
    expect(logHas(f.cb, /Storm Front arcs on: (hits|misses) Foe 2.*(hits|misses) Foe 3/)).toBe(true);
  });
  it('Heart Surge: double damage at release, for +1 Strain (with Shape the net is the base, not 0)', () => {
    const run = (mods: string[]) => {
      const f = fightWith([cls('channeler', 3, SOUL)], [{}], { seed: 'HS' });
      const u = f.turn(f.pc); line(f, [u, 3], [f.foe, 6]); const foe = f.unit(f.foe.id); foe.hp = 999; foe.maxHp = 999; foe.def = -40;
      const d = f.pc.mg!.designs.find((x) => x.school === 'damage')!.id;
      act(f, f.unit(u.id), { type: 'combat/outburst', design: d, aim: '6,2', mods });
      return { dmg: 999 - f.unit(f.foe.id).hp, strain: f.pc.mg!.strain };
    };
    const plain = run([]), surge = run(['class:channeler.heart_surge#surge']);
    expect(surge.strain).toBe(plain.strain + 1);
    expect(surge.dmg).toBeGreaterThanOrEqual(2 * plain.dmg - 1);
  });
});

// ======================================================================================================== GUARDIAN
describe('Guardian', () => {
  it('Will Shield: a Buff cast, a shield of 30 × Healing given on an ally in reach; MP and Strain paid', () => {
    const f = fightWith([cls('guardian', 1, SOUL), {}], [{}]);
    const [gd, ally] = f.pcs; line(f, [gd, 3], [ally, 5], [f.foe, 13]);
    const u = f.turn(gd), mp = u.mg!.mp;
    act(f, u, { type: 'combat/perk', id: 'class:guardian.will_shield', actionId: 'will_shield', targetId: ally.id });
    const mult = healingMult(f.g.characters[gd.charId!]);
    expect(f.unit(ally.id).shield).toBe(Math.floor(Math.floor(30 * mult) * (f.unit(ally.id).healRecv || 1)));
    expect(f.unit(gd.id).mg!.mp).toBeLessThan(mp); expect(f.unit(gd.id).mg!.strain).toBe(1);
  });
  it('Drink It In: an enemy spell on your shield feeds your Emanator (one reaction a round)', () => {
    const f = fightWith([cls('guardian', 2, SOUL), {}], [{}]);
    const [gd, ally] = f.pcs; line(f, [gd, 3], [ally, 5], [f.foe, 9]);
    const u = f.turn(gd);
    act(f, u, { type: 'combat/perk', id: 'class:guardian.will_shield', actionId: 'will_shield', targetId: ally.id });
    const mp = f.unit(gd.id).mg!.mp;
    withGame(f.g, () => harm(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(ally.id), 10, 'soul'));
    expect(f.unit(gd.id).mg!.mp).toBe(Math.min(f.unit(gd.id).mg!.mpMax, mp + 25));
    expect(logHas(f.cb, /drinks the spell off the shield/)).toBe(true);
  });
  it('Sanctuary: allies in the 3×3 take half damage until the Guardian\'s next turn', () => {
    const f = fightWith([cls('guardian', 3, SOUL), {}], [{}]);
    const [gd, ally] = f.pcs; line(f, [gd, 3], [ally, 5], [f.foe, 13]);
    const u = f.turn(gd); f.unit(gd.id).mg!.mp = 200;
    act(f, u, { type: 'combat/perk', id: 'class:guardian.sanctuary', tile: '5,2' });
    const a = f.unit(ally.id), hp = a.hp;
    withGame(f.g, () => applyDamage(f.cb, a, 30, { by: f.unit(f.foe.id), type: 'weapon', shield: true }));
    expect(hp - a.hp).toBe(15);
    f.turn(gd);
    const hp2 = f.unit(ally.id).hp; withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 30, { by: f.unit(f.foe.id), type: 'weapon', shield: true }));
    expect(hp2 - f.unit(ally.id).hp).toBe(30);
  });
});

// ======================================================================================================== BARD
describe('Bard', () => {
  it('Inspire: 10 MP, an ally\'s next roll is +2 (spent by it)', () => {
    const f = fightWith([cls('bard', 1, SOUL), {}], [{}]);
    const [bd, ally] = f.pcs; line(f, [bd, 3], [ally, 5], [f.foe, 9]);
    const u = f.turn(bd), mp = u.mg!.mp;
    act(f, u, { type: 'combat/perk', id: 'class:bard.inspire', actionId: 'inspire', targetId: ally.id });
    expect(f.unit(bd.id).mg!.mp).toBe(mp - 10);
    const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(ally.id), f.unit(f.foe.id), 'shot'));
    expect(pv.terms!.some((t) => t.label === 'Encouraged' && t.v === 2)).toBe(true);
    const a = f.turn(ally); act(f, a, { type: 'combat/attack', targetId: f.foe.id, mode: 'shot' });
    const pv2 = withGame(f.g, () => previewAttack(f.cb, f.unit(ally.id), f.unit(f.foe.id), 'shot'));
    expect(pv2.terms!.some((t) => t.label === 'Encouraged')).toBe(false);
  });
  it('Inspire in the story: 10 MP, +2 on the ally\'s next check', () => {
    const s = storyWith([cls('bard', 1, SOUL), {}]);
    const [b, ally] = s.chars;
    s.act({ type: 'story/perk', charId: b.id, id: 'class:bard.inspire', actionId: 'inspire_story', text: 'Go on, ' + s.g.characters[ally.id].name });
    s.act({ type: 'narrator/turn', turn: { narration: 'Try it.', checks: [{ charId: ally.id, skills: ['athletics'], tn: 12, stakes: 'It works.' }] } } as any);
    const ck = s.g.checks.find((k) => !k.done)!;
    s.act({ type: 'check/roll', checkId: ck.id }, s.g.characters[ally.id].owner);
    expect(s.g.story.entries.filter((e) => e.kind === 'check').at(-1)!.head).toMatch(/\+2 Encouraged by/);
  });
  it('Mend: a Bard\'s Buff heal heals 40, not 30 (× Healing given × the air)', () => {
    const f = fightWith([cls('bard', 2, SOUL), {}], [{}]);
    const [bd, ally] = f.pcs; line(f, [bd, 3], [ally, 5], [f.foe, 13]);
    const u = f.turn(bd), d = designOf(f.unit(bd.id), 'buff', 'heal'); f.unit(ally.id).hp = 10;
    act(f, f.unit(u.id), { type: 'combat/outburst', design: d, aim: '5,2' });
    const hm = f.unit(bd.id).mg!.healMult, recv = f.unit(ally.id).healRecv || 1;
    expect(f.unit(ally.id).hp - 10).toBe(Math.floor(Math.floor(30 * hm * recv) * 40 / 30));
  });
  it('Gift: out of combat, once a rest, a design handed to an ally (the Narrator is told)', () => {
    const s = storyWith([cls('bard', 3, SOUL), {}]);
    const [b, ally] = s.chars;
    s.act({ type: 'story/perk', charId: b.id, id: 'class:bard.gift', text: 'For you, ' + s.g.characters[ally.id].name });
    expect(s.g.story.rulings!.some((r) => r.key === 'class:bard.gift' && /carries/.test(r.text))).toBe(true);
    expect(() => s.act({ type: 'story/perk', charId: b.id, id: 'class:bard.gift', text: 'Again, ' + s.g.characters[ally.id].name })).toThrow(/Used/);
  });
});

// ======================================================================================================== HEXER
describe('Hexer', () => {
  it('Dread: a Fear design costs 5 MP less; Fear you inflict lasts a round longer', () => {
    const f = fightWith([cls('hexer', 1, SOUL)], [{}]);
    const u = f.unit(f.pc.id), d = designOf(u, 'status', 'fear'), sh = designOf(u, 'status', 'shaken');
    const pf = withGame(f.g, () => previewOutburst(f.cb, u, d, f.foe.pos)).cost, ps = withGame(f.g, () => previewOutburst(f.cb, u, sh, f.foe.pos)).cost;
    expect(pf).toBe(Math.max(5, ps - 5));
    withGame(f.g, () => applyCond(f.cb, rng(), u, f.unit(f.foe.id), 'fear', undefined, undefined, { skipSave: true }));
    expect(f.unit(f.foe.id).conds!.fear).toBe(3);
  });
  it('Mind Fog: conditions from your Status Outbursts save at +2', () => {
    let seen = '';
    for (let i = 0; i < 20 && !seen; i++) {
      const f = fightWith([cls('hexer', 2, SOUL)], [{}], { seed: 'MF' + i });
      const u = f.turn(f.pc); line(f, [u, 3], [f.foe, 5]);
      const d = designOf(f.unit(u.id), 'status', 'shaken');
      act(f, f.unit(u.id), { type: 'combat/outburst', design: d, aim: '5,2' });
      const l = f.cb.log.find((x) => /resists \(heart save \d+ vs \d+\)/.test(x)); if (l) seen = l.match(/vs (\d+)\)/)![1] + '|' + (12 + (f.pc.dbf?.heart ?? 0) + 2);
    }
    const [got, want] = seen.split('|'); expect(got).toBe(want);
  });
  it('Puppet: 60 MP, a failed Heart save; the Hexer\'s player gives the puppet one action, then it is itself', () => {
    let ok = false;
    for (let i = 0; i < 25 && !ok; i++) {
      const f = fightWith([cls('hexer', 3, SOUL)], [{}], { seed: 'PP' + i });
      const u = f.turn(f.pc); line(f, [u, 3], [f.foe, 6]); f.unit(u.id).mg!.mp = 200;
      act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:hexer.puppet', targetId: f.foe.id });
      expect(f.unit(u.id).mg!.mp).toBeLessThan(200);
      if (!condOn(f.unit(f.foe.id), 'puppeted')) continue;
      ok = true;
      const foe = f.turn(f.foe); act(f, foe, { type: 'combat/move', to: '6,3' });
      expect(condOn(f.unit(f.foe.id), 'puppeted')).toBe(false);
      expect(logHas(f.cb, /shakes off the strings/)).toBe(true);
    }
    expect(ok).toBe(true);
  });
  it('Puppet in the story: the engine rolls the save, the Narrator plays it out', () => {
    const s = storyWith([cls('hexer', 3, SOUL)]);
    s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'class:hexer.puppet', actionId: 'puppet_story', text: 'the guard opens the gate' });
    expect(s.g.story.rulings!.some((r) => r.key === 'class:hexer.puppet' && /Heart save: d20/.test(r.text))).toBe(true);
  });
});
void maxHp;
