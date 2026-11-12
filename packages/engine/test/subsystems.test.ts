// The shared subsystems (plan 2.8, lane 0B; spec: rules 1.3): conditions with sources and end-of-turn ticks, PC saves,
// the damage chain (types, special ammo, the target bucket, pierce), Recoil, combat Hidden and ambush, surrender and
// parley, the tile-by-tile walk with reactions, throwing, weapon swaps, companions, prayer, and the story side
// (conditions, Karma, rest, tutors and advanced classes, voices per character, start items).
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  applyCond, condOn, condSource, condTurnEnd, unitSave, previewAttack, resolveAttack, attackDamage, stackDamage, moveUnit, endTurn, beginTurn, active, checkOver,
  hideAction, hide, spotHidden, canReact, maxReactions, useReaction, trySurrender, parley, throwItem, applyDamage, register, holderOf, statQuery,
  WEAPON, d20, validateSheet, newCharacter, enemyTurn, weaponActions, COMPANION_KINDS, type Unit, type Combat, type Character,
} from '../src';
import { fightWith, storyWith, withGame, onlyHandlers, rng, sheetOf } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

const at = (cb: Combat, u: Unit, ref: string) => { const [x, y] = [ref.charCodeAt(0) - 65, +ref.slice(1) - 1]; u.pos = x + ',' + y; return u; };
/** A rng whose next d20 is n (d20 = floor(next * 20) + 1, see rng.ts): searched, so it stays deterministic. */
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }

describe('conditions (spec: Conditions and saves; rules 1.3)', () => {
  it('tick at turn end, Stunned loses the turn, Nausea costs 1 AP', () => {
    const f = fightWith([{}], [{ at: 'F6' }]);
    const pc = f.turn(f.pc), foe = f.foe;
    withGame(f.g, () => {
      applyCond(f.cb, rng(), foe, pc, 'fear', 2, undefined, { skipSave: true });
      expect(condSource(pc, 'fear')).toBe(foe.id);
      // put on during pc's own turn: this turn's end doesn't count
      condTurnEnd(f.cb, pc); expect(pc.conds!.fear).toBe(2);
      condTurnEnd(f.cb, pc); expect(pc.conds!.fear).toBe(1);
      condTurnEnd(f.cb, pc); expect(condOn(pc, 'fear')).toBe(false);
      applyCond(f.cb, rng(), foe, pc, 'nausea', 2, undefined, { skipSave: true });
    });
    const u = f.turn(pc);
    expect(u.ap).toBe(5); // 6 − 1 (Nausea)
    withGame(f.g, () => { applyCond(f.cb, rng(), foe, u, 'stunned', 1, undefined, { skipSave: true }); });
    const u2 = f.turn(u);
    expect(u2.skipTurn).toBe(true); expect(u2.ap).toBe(0);
  });
  it('Fear: no attacking the source, no moving toward it, −2 against anyone else; Taunted must attack the taunter', () => {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle' }], [{ at: 'F5' }, { at: 'F7' }]);
    const pc = f.turn(f.pc), [a, b] = f.foes;
    withGame(f.g, () => {
      applyCond(f.cb, rng(), a, pc, 'fear', 2, undefined, { skipSave: true });
      expect(previewAttack(f.cb, pc, a, 'shot').why).toMatch(/Afraid/);
      const pv = previewAttack(f.cb, pc, b, 'shot');
      expect(pv.terms!.find((t) => t.label === 'conditions')!.v).toBe(-2);
      expect(moveUnit(f.cb, pc, a.pos.split(',').map(Number).map((v, i) => (i === 0 ? v - 1 : v)).join(','))).toMatch(/Afraid/);
      pc.conds = {}; pc.condBy = {};
      applyCond(f.cb, rng(), b, pc, 'taunted', 1, undefined, { skipSave: true });
      expect(previewAttack(f.cb, pc, a, 'shot').why).toMatch(/Taunted/);
      expect(previewAttack(f.cb, pc, b, 'shot').ok).toBe(true);
    });
  });
  it('Shaken is −2 on Heart saves, not to hit; the Right Brain Debuff is a Brain condition; every PC has saves', () => {
    const f = fightWith([{ skills: { guts: 4 } }], [{ at: 'F6' }]);
    const pc = f.turn(f.pc);
    expect(pc.sv?.body).toBe(3); // mod(Guts 4), with no Evoker or Emanator
    withGame(f.g, () => {
      const before = unitSave(pc, 'heart');
      applyCond(f.cb, rng(), f.foe, pc, 'shaken', 3, undefined, { skipSave: true });
      expect(unitSave(pc, 'heart')).toBe(before - 2);
      expect(previewAttack(f.cb, pc, f.foe, 'shot').terms!.some((t) => t.label === 'conditions')).toBe(false);
      applyCond(f.cb, rng(), f.foe, f.foe, 'right_brain_debuff', 2, undefined, { skipSave: true });
      expect(condOn(f.foe, 'rdebuff')).toBe(true);
    });
  });
});

describe('the damage chain (spec: Attacks, damage and armour; rules 1.3)', () => {
  it('target-specific bonuses add and stop at ×2; self multipliers multiply', () => {
    expect(stackDamage([{ v: 1.5, label: 'a' }], [{ v: 0.5, label: 'x' }, { v: 0.75, label: 'y' }]).total).toBe(1.5 * 2);
    expect(stackDamage([], [{ v: 0.15, label: 'Weak Point' }]).vsMult).toBeCloseTo(1.15);
  });
  it('the .700 ignores 10 armour; armour-piercing ignores it all at −20%; hollow-point doubles armour at +30%', () => {
    const f = fightWith([{ weapon: 'blackpoint_700' }], [{ tier: 'elite', at: 'H6' }]);
    const pc = f.turn(f.pc), t = f.foe; // elite armour 10
    withGame(f.g, () => {
      expect(attackDamage(f.cb, pc, t, 'shot', null).armour).toBe(0);
      pc.weapon = 'hellraiser_service_rifle'; pc.dmgMult = 1;
      pc.ammoType = 'armor_piercing'; let d = attackDamage(f.cb, pc, t, 'shot', null);
      expect(d.armour).toBe(0); expect(d.mults.some((m) => /armor-piercing/.test(m.label) && m.v === 0.8)).toBe(true);
      pc.ammoType = 'hollow_point'; d = attackDamage(f.cb, pc, t, 'shot', null);
      expect(d.armour).toBe(20); expect(d.mults.some((m) => m.v === 1.3)).toBe(true);
    });
  });
  it('Elemental damage taken: −10% per Pain Threshold point; a non-lethal blow subdues a foe', () => {
    const f = fightWith([{ skills: { pain_threshold: 4 } }], [{ at: 'F6' }]);
    const pc = f.pc, foe = f.foe;
    expect(pc.elemTaken).toBeCloseTo(0.4);
    withGame(f.g, () => {
      const hp = pc.hp; applyDamage(f.cb, pc, 50, { type: 'elemental', dmgType: 'elemental', by: foe });
      expect(hp - pc.hp).toBe(30);
      applyDamage(f.cb, foe, 999, { type: 'weapon', by: pc, nonlethal: true });
      expect(foe.dead).toBe(false); expect(foe.surrendered).toBe(true);
    });
  });
  it('Recoil: each earlier shot this turn is −1, less floor(Dexterity ÷ 2); bows have none', () => {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle', skills: { dexterity: 1 } }], [{ at: 'F6' }]);
    const pc = f.turn(f.pc);
    withGame(f.g, () => {
      expect(previewAttack(f.cb, pc, f.foe, 'shot').terms!.some((t) => t.label === 'recoil')).toBe(false);
      pc.shotsThisTurn = 2;
      expect(previewAttack(f.cb, pc, f.foe, 'shot').terms!.find((t) => t.label === 'recoil')!.v).toBe(-2);
      pc.weapon = 'recurve_bow'; pc.ammo = 10;
      expect(previewAttack(f.cb, pc, f.foe, 'shot').terms!.some((t) => t.label === 'recoil')).toBe(false);
    });
  });
});

describe('combat Hidden, ambush and spotting (rules 1.3)', () => {
  it('Hide only out of sight; a Hidden unit can\'t be targeted; its first attack is an ambush; ending next to it reveals it', () => {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle' }], [{ at: 'F6' }], { classic: true });
    const pc = f.turn(f.pc), foe = f.foe;
    withGame(f.g, () => {
      expect(hideAction(f.cb, pc)).toMatch(/can see you/);
      hide(f.cb, pc);
      expect(previewAttack(f.cb, foe, pc, 'shot').ok).toBe(false);
      const r = resolveAttack(f.cb, rngFor(19), pc, foe, 'shot', null);
      expect(r.crit).toBe(true); // 19 crits from Hidden
      expect(f.cb.log.at(-1)).toMatch(/AMBUSH/);
      expect(pc.hidden).toBe(false); // a rifle isn't silent
      foe.dead = false; foe.hp = foe.maxHp; hide(f.cb, pc); at(f.cb, foe, 'B5'); pc.pos = '1,3';
      spotHidden(f.cb, rng(), foe);
      expect(pc.hidden).toBe(false);
    });
  });
});

describe('reactions, surrender and parley (rules 1.3)', () => {
  it('one reaction a round, more from items; none while Suppressed', () => onlyHandlers([{ id: 'heavyworlder', stat: (h, s) => (s === 'reactions' ? 1 : 0) }], () => {
    const f = fightWith([{ traits: ['heavyworlder'] }, {}], [{ at: 'F6' }]);
    const [a, b] = f.pcs;
    withGame(f.g, () => {
      expect(maxReactions(a)).toBe(2); expect(maxReactions(b)).toBe(1);
      expect(useReaction(f.cb, b)).toBe(true); expect(canReact(f.cb, b)).toBe(false);
      applyCond(f.cb, rng(), f.foe, a, 'suppressed', 1, undefined, { skipSave: true });
      expect(maxReactions(a)).toBe(0);
    });
  }));
  it('a beaten enemy may surrender to terms (once); a Boss never does; surrendered foes end the fight as prisoners', () => {
    const f = fightWith([{ skills: { implication: 6 } }], [{ at: 'F6' }, { tier: 'boss', at: 'H6' }]);
    const pc = f.turn(f.pc), [foe, boss] = f.foes;
    withGame(f.g, () => {
      expect(trySurrender(f.cb, rng(), pc, foe)).toMatch(/isn't beaten/);
      foe.hp = 10;
      const out = trySurrender(f.cb, rngFor(2), pc, foe);
      expect(out).toMatch(/SURRENDERS/); expect(foe.surrendered).toBe(true);
      expect(previewAttack(f.cb, pc, foe, 'shot').why).toMatch(/surrendered/);
      expect(trySurrender(f.cb, rng(), pc, boss)).toMatch(/won't surrender/);
      expect(parley(f.cb, rng(), pc, boss, 'threaten', 'Drop it.')).toBe(null);
      boss.dead = true; checkOver(f.cb);
    });
    expect(f.cb.over).toBe('win');
  });
  it('a surrendered foe stays on the map as a neutral prisoner after the fight', () => {
    const f = fightWith([{}], [{ name: 'Raider', at: 'F6' }]);
    const pc = f.turn(f.pc);
    f.foe.hp = 1; f.foe.surrendered = true;
    f.act({ type: 'combat/end-turn', unitId: pc.id });
    const n = (f.g.story.npcs || []).find((x) => x.name === 'Raider')!;
    expect(f.g.phase).toBe('story'); expect(n.side).toBe('neutral'); expect(n.prisoner).toBe(true);
  });
});

describe('the walk, tile by tile (rules 1.3)', () => {
  it('Overwatch fires on the step that comes into sight, not only at the end; Sprint is once a turn', () => {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle' }], [{ weapon: 'hellraiser_service_rifle', at: 'P6' }]);
    const pc = f.turn(f.pc), foe = f.foe;
    pc.pos = '1,5'; foe.pos = '6,5'; foe.overwatch = 'shot';
    withGame(f.g, () => {
      const err = moveUnit(f.cb, pc, '4,5', { state: 11 });
      expect(err).toBe(null);
      expect(f.cb.log.some((l) => /fires from overwatch/.test(l))).toBe(true);
      pc.ap = 6; pc.downed = false; pc.dead = false; pc.hp = pc.maxHp; pc.conds = {};
      expect(moveUnit(f.cb, pc, '2,5', undefined, 'sprint')).toBe(null);
      expect(moveUnit(f.cb, pc, '1,5', undefined, 'sprint')).toMatch(/One Sprint/);
    });
  });
  it('move_step can stop the walk, and the unwalked tiles stay in the bank', () => onlyHandlers([{ id: 'heavyworlder', on: { move_step: (ctx, h) => { if (ctx.u === h.u && ctx.i === 1) ctx.stop = true; } } }], () => {
    const f = fightWith([{ traits: ['heavyworlder'] }], [{ at: 'P10' }]);
    const pc = f.turn(f.pc); pc.pos = '1,1'; pc.movement = 1;
    withGame(f.g, () => { expect(moveUnit(f.cb, pc, '5,1')).toBe(null); });
    expect(pc.pos).toBe('3,1'); expect(pc.bank).toBe(2); expect(pc.ap).toBe(2);
  }));
});

describe('throwing, swapping, companions and prayer (rules 1.3)', () => {
  it('a frag grenade hits everyone within 2 of the tile and is used up; out of range is refused', () => {
    const f = fightWith([{}], [{ at: 'F6' }, { at: 'G6' }]);
    const pc = f.turn(f.pc); pc.pos = '1,5'; pc.throwables = { frag_grenade: 1 }; pc.throwRange = 6;
    const [a, b] = f.foes; a.pos = '5,5'; b.pos = '6,5';
    withGame(f.g, () => {
      expect(throwItem(f.cb, rng(), pc, 'frag_grenade', '9,5')).toMatch(/range/);
      expect(throwItem(f.cb, rng(), pc, 'frag_grenade', '5,5')).toBe(null);
    });
    expect(a.hp).toBeLessThan(a.maxHp); expect(b.hp).toBeLessThan(b.maxHp); expect(pc.throwables!.frag_grenade).toBe(0); expect(pc.ap).toBe(4);
  });
  it('a drone companion acts after its owner, takes its owner\'s orders, and is destroyed at 0 HP', () => {
    const s = storyWith([{}]); s.g.characters[s.chars[0].id].companions = [{ id: 'd1', kind: 'drone', name: 'Pip' }];
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'minion', weapon: 'service_pistol', at: 'P6' }] } } } as any);
    const cb = s.g.combat!, pc = cb.units.find((u) => u.charId)!, drone = cb.units.find((u) => u.companion)!;
    expect(drone.name).toBe('Pip'); expect(drone.side).toBe('pc'); expect(drone.ctrl).toBe(pc.charId);
    withGame(s.g, () => { applyDamage(cb, drone, 999, { type: 'weapon', by: cb.units.find((u) => u.side === 'foe') }); });
    expect(drone.dead).toBe(true);
  });
  it('the drone (item 370): 30 HP; move and a plain shot only; its service pistol never runs dry, never heats or jams', () => {
    const f = fightWith([{ traits: ['drone_handler'] }], [{ at: 'H6', tier: 'boss' }]);
    const d0 = f.cb.units.find((u) => u.companion === 'drone')!;
    expect(COMPANION_KINDS.drone.hp).toBe(30); expect(d0.hp).toBe(30); expect(d0.maxHp).toBe(30); expect(d0.weapon).toBe('service_pistol');
    expect(d0.allowedActions).toEqual(['move', 'shot']); expect(d0.infiniteAmmo).toBe(true);
    const offered = weaponActions(d0).map((x) => x.id);
    for (const x of ['reload', 'load', 'clear', 'overwatch', 'burst', 'auto', 'skill', 'brace']) expect(offered, x).not.toContain(x);
    const foe = f.foe; foe.hp = foe.maxHp = 1e6; foe.def = 0;
    // Put the foe two tiles from the drone, on its row (the yard's open ground).
    const [x, y] = d0.pos.split(',').map(Number); foe.pos = (x + 2) + ',' + y;
    const d = f.turn(d0), mag = d.ammo;
    expect(() => f.act({ type: 'combat/attack', unitId: d.id, targetId: foe.id, mode: 'aimed' } as any)).toThrow(/can only move, shoot/);
    expect(() => f.act({ type: 'combat/reload', unitId: d.id } as any)).toThrow(/can only/);
    expect(() => f.act({ type: 'combat/overwatch', unitId: d.id } as any)).toThrow(/can only/);
    expect(() => f.act({ type: 'combat/attack', unitId: d.id, targetId: foe.id, mode: 'melee' } as any)).toThrow(/can only/);
    let fired = 0;
    for (let i = 0; i < 25; i++) {
      const u = f.unit(d.id); u.ap = 6; u.stunnedNext = 0;
      f.act({ type: 'combat/attack', unitId: d.id, targetId: foe.id, mode: 'shot' } as any); fired++;
      const after = f.unit(d.id); expect(after.ammo).toBe(mag); expect(after.heat).toBe(0); expect(after.jammed).toBe(false);
    }
    expect(fired).toBe(25);
    expect(f.cb.log.filter((l) => /^Pip|fires at/.test(l)).length).toBeGreaterThanOrEqual(20);
  });
  it('the beast (item 370): 60 HP, as the trait says', () => {
    const f = fightWith([{ traits: ['beast_handler'] }], [{ at: 'H6' }]);
    const b = f.cb.units.find((u) => u.companion === 'beast')!;
    expect(COMPANION_KINDS.beast.hp).toBe(60); expect(b.hp).toBe(60); expect(b.maxHp).toBe(60);
    expect(b.allowedActions).toBeUndefined(); expect(b.infiniteAmmo).toBeUndefined();
  });
  it('prayer: Faith 3 and a patron, 3 AP, a Blessing × Blessing power, then the cooldown', () => {
    const f = fightWith([{ skills: { faith: 3 } }], [{ at: 'F6' }]);
    f.g.characters[f.pcs[0].charId!].patron = 'nerukhan';
    const pc = f.turn(f.pc);
    f.act({ type: 'combat/pray', unitId: pc.id, choice: 'saints_shield' } as any);
    const u = f.unit(pc.id);
    expect(u.ap).toBe(3);
    expect(f.cb.log.some((l) => /prays to Holy Father Nerukhan/.test(l))).toBe(true);
    expect(() => f.act({ type: 'combat/pray', unitId: pc.id } as any)).toThrow(/wait/);
  });
  it('swapping hands: the off-hand pistol comes to the main hand for 1 AP', () => {
    const s = storyWith([{ weapon: 'service_pistol' }]); const c = s.g.characters[s.chars[0].id]; c.offHand = { id: 'decrkm_autopistol' } as any;
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'minion', weapon: 'fists', at: 'P6' }] } } } as any);
    const cb = s.g.combat!; cb.turn = cb.order.indexOf(cb.units.find((u) => u.charId)!.id);
    withGame(s.g, () => beginTurn(cb, s.g.rng));
    const pc = cb.units.find((u) => u.charId)!;
    s.act({ type: 'combat/swap', unitId: pc.id, from: 'off' } as any);
    const u = s.g.combat!.units.find((x) => x.charId)!;
    expect(u.weapon).toBe('decrkm_autopistol'); expect(u.offWeapon).toBe('service_pistol'); expect(u.ap).toBe(5);
  });
});

describe('the story side (rules 1.3)', () => {
  it('a Shaken character is −2 on social checks for the scene; Karma; rests; tutors unlock an advanced class', () => {
    const s = storyWith([{ skills: { charisma: 3 } }]); const id = s.chars[0].id;
    s.act({ type: 'narrator/turn', turn: { narration: 'You flinch.', conditions: [{ target: id, id: 'shaken' }], karma: [{ charId: id, amount: 10, why: 'kept the law' }], checks: [{ charId: id, skills: ['charisma'], tn: 12, stakes: 'Talk.', tags: ['dialogue'] }] } } as any);
    const ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
    expect(s.g.story.entries.filter((e) => e.kind === 'check').at(-1)!.head).toMatch(/−2 Shaken/);
    expect(s.g.characters[id].karma).toBe(10);
    const c = s.g.characters[id]; c.hp = 1;
    s.act({ type: 'rest', kind: 'long' } as any);
    expect(s.g.characters[id].hp).toBeGreaterThan(1); expect(s.g.restN).toBe(1);
    // An advanced class (on here by the test switch; Class Roster Rev 3 shelves them): the attribute pair gate, from level 7.
    expect(() => s.act({ type: 'levelup/advanced', charId: id, classId: 'gunslinger' } as any)).toThrow(/level 7/);
    s.g.characters[id].level = 7;
    expect(() => s.act({ type: 'levelup/advanced', charId: id, classId: 'gunslinger' } as any)).toThrow(/Agility 9/);
    s.g.characters[id].attrs.agility = 9;
    s.act({ type: 'narrator/turn', turn: { narration: 'An old drifter offers to teach.', tutors: [{ charId: id, classId: 'gunslinger' }] } } as any);
    expect(s.g.characters[id].tutors).toContain('gunslinger');
    s.act({ type: 'levelup/advanced', charId: id, classId: 'gunslinger' } as any);
    expect(s.g.characters[id].advancedClass).toBe('gunslinger');
  });
  it('private perk lines reach only their holder; traitState is kept; trait excludes and start items', () => {
    const s = storyWith([{}]); const id = s.chars[0].id;
    s.g.characters[id].perks = [...(s.g.characters[id].perks || []), { id: 'detectives_eye', tier: 'I' } as any];
    s.act({ type: 'narrator/turn', turn: { narration: '…', perkLines: [{ charId: id, key: 'perk:detectives_eye', text: 'The cuff is wet.' }, { charId: id, key: 'perk:foreseen', text: 'Not theirs.' }], traitState: [{ charId: id, key: 'grudge', value: 'Keel' }] } } as any);
    expect(s.g.story.entries.some((x) => x.text === 'Not theirs.')).toBe(false); // a line for an item the character doesn't hold is dropped
    const e = s.g.story.entries.find((x) => x.text === 'The cuff is wet.')!;
    expect(e.to).toBe(s.g.characters[id].owner); expect(s.g.characters[id].state!.grudge).toBe('Keel');
    const sh = { ...sheetOf(), traits: ['symbol_of_order', 'rogue_element'] };
    expect(validateSheet(sh)).toMatch(/can't be taken together/);
    const c: Character = newCharacter('x', 'p', { ...sheetOf(), traits: ['bottle_butts_for_eyes'] });
    expect(c.worn?.head_accessory).toBe('prescription_glasses');
  });
});

describe('more of the shared subsystems through the reducer (rules 1.3)', () => {
  it('a Puppeted enemy\'s turn is played by the puppeteer\'s player, never against itself', () => {
    const f = fightWith([{}], [{ at: 'F6' }, { at: 'H6' }]);
    const pc = f.pc, [a] = f.foes;
    withGame(f.g, () => applyCond(f.cb, rng(), pc, a, 'puppeted', 1, undefined, { skipSave: true }));
    f.turn(a);
    expect(() => f.act({ type: 'combat/attack', unitId: a.id, targetId: a.id, mode: 'shot' })).toThrow();
    f.act({ type: 'combat/move', unitId: a.id, to: '4,5' });
    expect(f.unit(a.id).pos).toBe('4,5');
    expect(() => f.act({ type: 'combat/stim', unitId: a.id, targetId: pc.id } as any)).toThrow(/puppet/);
  });
  it('Commanded to halt: the enemy doesn\'t move; a grappled PC can\'t move until it breaks free', () => {
    const f = fightWith([{}], [{ at: 'P6', weapon: 'fists' }]);
    const pc = f.pc, foe = f.foe;
    withGame(f.g, () => applyCond(f.cb, rng(), pc, foe, 'commanded', 1, undefined, { skipSave: true, arg: 'halt' }));
    const was = foe.pos;
    f.turn(foe);
    withGame(f.g, () => enemyTurn(f.cb, f.g.rng));
    expect(f.unit(foe.id).pos).toBe(was);
    const u = f.turn(pc); f.unit(foe.id).pos = '1,5'; u.pos = '1,4';
    withGame(f.g, () => applyCond(f.cb, rng(), f.unit(foe.id), u, 'grappled', undefined, undefined, { skipSave: true }));
    expect(() => f.act({ type: 'combat/move', unitId: u.id, to: '3,3' })).toThrow(/Grappled/);
    f.act({ type: 'combat/escape', unitId: u.id });
    expect(f.unit(u.id).ap).toBe(4);
  });
  it('an Afraid enemy never closes on the PC it fears', () => {
    const f = fightWith([{ weapon: 'fists' }], [{ at: 'P6', weapon: 'fists' }]);
    const pc = f.pc, foe = f.foe;
    withGame(f.g, () => applyCond(f.cb, rng(), pc, foe, 'fear', 2, undefined, { skipSave: true }));
    const d0 = Math.abs(+foe.pos.split(',')[0] - +pc.pos.split(',')[0]);
    f.turn(foe);
    withGame(f.g, () => enemyTurn(f.cb, f.g.rng));
    const u = f.unit(foe.id); expect(Math.abs(+u.pos.split(',')[0] - +pc.pos.split(',')[0])).toBeGreaterThanOrEqual(d0);
  });
  it('special rounds load out of combat and change the shot; a parley from the reducer costs 2 AP', () => {
    const s = storyWith([{ weapon: 'hellraiser_service_rifle' }]); const id = s.chars[0].id, c = s.g.characters[id];
    c.pack = [...(c.pack || []), { id: 'ammo_armor_piercing', item: 'ammo_armor_piercing', name: 'AP', qty: 30, kind: 'ammo' } as any];
    s.act({ type: 'gear/ammo', charId: id, ammo: 'armour_piercing' } as any);
    expect(s.g.characters[id].loadedType).toBe('armor_piercing');
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'fists', at: 'F6', kind: 'robot', tags: ['military'] }] } } } as any);
    const cb = s.g.combat!, pc = cb.units.find((u) => u.charId)!, foe = cb.units.find((u) => u.side === 'foe')!;
    expect(pc.ammoType).toBe('armor_piercing'); expect(foe.kind).toBe('robot'); expect(foe.tags).toContain('military');
    cb.turn = cb.order.indexOf(pc.id); withGame(s.g, () => beginTurn(cb, s.g.rng));
    s.act({ type: 'combat/parley', unitId: pc.id, targetId: foe.id, kind: 'threaten', text: 'Stand down.' } as any);
    expect(s.g.combat!.units.find((u) => u.charId)!.ap).toBe(4);
    expect(s.g.combat!.notes!.some((n) => /Stand down/.test(n))).toBe(true);
  });
  it('conditions on the area map tick each overworld round', () => {
    const s = storyWith([{}]); const id = s.chars[0].id;
    (s.g.story.magic ||= {})[id] = { flux: 0, strain: 0, held: null, conds: { slowed: 1 } };
    s.act({ type: 'story/pass' }); s.act({ type: 'world/act', charId: id, act: 'end' } as any);
    expect(s.g.story.magic![id].conds?.slowed).toBeUndefined();
  });
});
