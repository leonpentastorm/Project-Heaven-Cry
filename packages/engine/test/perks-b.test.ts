// Lane B: movement, stealth and vision perks and traits (src/perks/b.ts). Each item is shown working in play: through
// the reducer (apply) where an action exists, else with the game bound and the engine's own functions (moveUnit,
// resolveAttack, spotHidden…), the same calls the reducer makes.
import { describe, expect, it } from 'vitest';
import {
  MAPS, apply, moveUnit, resolveAttack, previewAttack, attackDamage, endTurn, hide, spotHidden, maxReactions, makeObject, applyRest, applyCond, emit,
  d20, die, packOf, movement, drawGlyph, pathOpts, storyCb, positionsOf, stateOf, holderOf, type Unit, type Combat, type GameState,
} from '../src';
import { builtInCampaign, statQuery } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

/** A seed whose next d20 is n. */
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const at = (u: Unit, k: string) => { u.pos = k; return u; };
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
/** A wall down column x (every row), so the only way across is over it. */
const wallAt = (cb: Combat, x: number) => { cb.map = { ...cb.map, solid: Array.from({ length: cb.map.h }, (_, y) => x + ',' + y) }; };
MAPS.laneb_dark = { ...MAPS.yard, id: 'laneb_dark', dark: true };

describe('Into the Dark', () => {
  it('I: the first move into ground the squad has not seen costs 1 AP less; once a fight', () => {
    const f = fightWith([{ perks: { into_the_dark: 'I' } }], [{ at: 'O10' }]);
    const cb = f.cb, pc = f.pc; pc.movement = 1; pc.vision = 2; cb.map = { ...cb.map, dark: true };
    delete pc.ps!['perk:into_the_dark']; at(pc, '1,5'); f.turn(pc);
    f.act({ type: 'combat/move', unitId: pc.id, to: '4,5' });
    expect(f.pc.ap).toBe(6 - 2); // 3 tiles at Movement 1: 3 AP, one free
    expect(logHas(f.cb, /Into the Dark/)).toBe(true);
    f.act({ type: 'combat/move', unitId: f.pc.id, to: '4,8' });
    expect(f.pc.ap).toBe(4 - 3); // only once a fight
  });
  it('II: +1 AP on the first turn in a place that causes Fear', () => {
    const f = fightWith([{ perks: { into_the_dark: 'II' } }], [{ at: 'O10' }]);
    f.cb.fear = true;
    expect(f.turn(f.pc).ap).toBe(7);
    expect(f.turn(f.pc).ap).toBe(6);
  });
});

describe('Wall Run', () => {
  it('I: a move may cross a wall 1 tile thick; without the perk there is no way across; you never stop on the wall', () => {
    const f = fightWith([{ perks: { wall_run: 'I' } }], [{ at: 'O10' }]);
    wallAt(f.cb, 3); at(f.pc, '2,5'); f.turn(f.pc);
    f.act({ type: 'combat/move', unitId: f.pc.id, to: '4,5' });
    expect(f.pc.pos).toBe('4,5');
    expect(() => f.act({ type: 'combat/move', unitId: f.pc.id, to: '3,5' })).toThrow(/stop on a wall|reach/); // paths() no longer offers a wall tile as a move's end
    const g = fightWith([{}], [{ at: 'O10' }]); wallAt(g.cb, 3); at(g.pc, '2,5'); g.turn(g.pc);
    expect(() => g.act({ type: 'combat/move', unitId: g.pc.id, to: '4,5' })).toThrow(/reach/);
  });
  it('II: a strike from the wall mid-run, then the run finishes on floor', () => {
    const f = fightWith([{ perks: { wall_run: 'II' }, weapon: 'hellraiser_service_rifle' }], [{ at: 'H6' }]);
    wallAt(f.cb, 3); at(f.pc, '2,5'); const foe = f.foe; foe.def = 1; f.turn(f.pc);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'wall_run', actionId: 'wall_strike', targetId: foe.id, tile: '3,5', choice: '4,5' } as any);
    expect(f.pc.pos).toBe('4,5');
    expect(logHas(f.cb, /strikes mid-run/)).toBe(true);
    expect(logHas(f.cb, /fires at|takes an aimed/)).toBe(true);
    // Tier I has no strike.
    const g = fightWith([{ perks: { wall_run: 'I' } }], [{ at: 'H6' }]);
    expect(() => g.act({ type: 'combat/perk', unitId: g.turn(g.pc).id, id: 'wall_run', actionId: 'wall_strike', targetId: g.foe.id, tile: '3,5' } as any)).toThrow();
  });
});

describe('Wall Run (story)', () => {
  it('a parkour Athletics check succeeds without a roll; an untagged one still rolls', () => {
    const s = storyWith([{ perks: { wall_run: 'I' } }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'A gap between roofs.', checks: [{ charId: c.id, skills: ['athletics'], tn: 20, stakes: 'Leap the gap', tags: ['parkour'] }] } } as any);
    s.g.rng.state = rngFor(1).state;
    let ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
    expect(s.g.checks.find((k) => k.id === ck.id)!.roll!.ok).toBe(true);
    expect(s.g.story.entries.some((e: any) => /Wall Run I: no check needed/.test(e.head || ''))).toBe(true);
    s.act({ type: 'check/accept', checkId: ck.id } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'A heavy crate.', checks: [{ charId: c.id, skills: ['athletics'], tn: 20, stakes: 'Lift it' }] } } as any);
    s.g.rng.state = rngFor(1).state;
    ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
    expect(s.g.checks.find((k) => k.id === ck.id)!.roll!.ok).toBe(false);
  });
});

describe('Roll With It', () => {
  it('I: a miss against you on an enemy turn gives 1 free tile next turn, with no opportunity attacks; once a round', () => {
    const f = fightWith([{ perks: { roll_with_it: 'I' } }], [{ at: 'C6', weapon: 'fists' }]);
    const pc = at(f.pc, '1,5'), foe = f.foe; foe.attack = -40;
    withGame(f.g, () => { f.cb.turn = f.cb.order.indexOf(foe.id); resolveAttack(f.cb, rngFor(5), foe, pc, 'melee', null, { noAp: true }); resolveAttack(f.cb, rngFor(5), foe, pc, 'melee', null, { noAp: true }); });
    expect(logHas(f.cb, /rolls with it: 1 free tile next turn/)).toBe(true);
    expect(f.cb.log.filter((l) => /rolls with it/.test(l)).length).toBe(1);
    const u = f.turn(pc); expect(u.bank).toBe(1);
    f.act({ type: 'combat/move', unitId: u.id, to: '0,5' }); // leaves the foe's reach: free and no opportunity attack
    expect(f.pc.ap).toBe(6); expect(logHas(f.cb, /opportunity attack/)).toBe(false);
  });
  it('II: 2 tiles, and the next attack gets +0.1 on the critical multiplier', () => {
    const f = fightWith([{ perks: { roll_with_it: 'II' } }], [{ at: 'F6' }]);
    const pc = f.pc, foe = f.foe; foe.attack = -40;
    withGame(f.g, () => { f.cb.turn = f.cb.order.indexOf(foe.id); resolveAttack(f.cb, rngFor(5), foe, pc, 'shot', null, { noAp: true }); });
    const u = f.turn(pc); expect(u.bank).toBe(2);
    withGame(f.g, () => {
      const d = attackDamage(f.cb, u, f.foe, 'shot', null, { crit: true });
      expect(d.mults.some((m) => /Roll With It/.test(m.label))).toBe(true);
    });
  });
});

describe('Shadow Step', () => {
  it('I: Hidden, cover to cover counts half the tiles', () => {
    const f = fightWith([{ perks: { shadow_step: 'I' } }], [{ at: 'P11' }]);
    const pc = at(f.pc, '4,5'); f.foe.vision = 1; pc.hidden = true; pc.hideEntry = 1; const u = f.turn(pc); u.movement = 1;
    f.act({ type: 'combat/move', unitId: u.id, to: '8,2' }); // next to the crates at F4-F5, then next to H2: 4 tiles
    expect(f.pc.ap).toBe(4); expect(f.pc.bank).toBe(0);
    expect(logHas(f.cb, /Shadow Step/)).toBe(true);
  });
  it('II: an attack that reveals you rolls to stay Hidden (no witness: stays), with no second ambush', () => {
    const f = fightWith([{ perks: { shadow_step: 'II' }, weapon: 'hellraiser_service_rifle' }], [{ at: 'F6' }]);
    const pc = f.pc; f.foe.vision = 1; pc.hidden = true; pc.hideEntry = 1; f.turn(pc);
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'shot' });
    expect(f.pc.hidden).toBe(true); expect(f.pc.ambushUsed).toBe(1); expect(f.pc.hideEntry).toBe(1);
    expect(logHas(f.cb, /stays Hidden/)).toBe(true);
  });
});

describe('Got You in My Sight', () => {
  it('I: an enemy hides in your sight on your turn: +2 AP now, once a round; a sneak attack hit costs 2 AP next turn', () => {
    const f = fightWith([{ perks: { got_you_in_my_sight: 'I' } }], [{ at: 'F6' }, { at: 'F8' }]);
    const pc = f.turn(f.pc), [a, b] = f.foes;
    withGame(f.g, () => { hide(f.cb, a); hide(f.cb, b); });
    expect(pc.ap).toBe(8);
    b.hidden = true; b.hideEntry = 1; b.attack = 60; b.ambushUsed = 0;
    withGame(f.g, () => { f.cb.turn = f.cb.order.indexOf(b.id); resolveAttack(f.cb, rngFor(10), b, pc, 'shot', null, { noAp: true }); });
    expect(f.turn(pc).ap).toBe(4);
  });
  it('II: no penalty, and an enemy that leaves your sight leaves its last position with the squad', () => {
    const f = fightWith([{ perks: { got_you_in_my_sight: 'II' } }], [{ at: 'E6' }]);
    const pc = f.turn(f.pc), foe = f.foe; pc.vision = 4; at(pc, '1,5');
    withGame(f.g, () => { emit(f.cb, 'turn_start', { u: pc, cb: f.cb }); f.cb.turn = f.cb.order.indexOf(foe.id); foe.ap = 6; moveUnit(f.cb, foe, '9,5'); });
    expect(f.cb.lastSeen?.pc?.[foe.id]).toBe('4,5');
    foe.hidden = true; foe.hideEntry = 2; foe.ambushUsed = 0; foe.attack = 60; at(foe, '4,5');
    withGame(f.g, () => resolveAttack(f.cb, rngFor(10), foe, pc, 'shot', null, { noAp: true }));
    expect(f.turn(pc).ap).toBeGreaterThanOrEqual(6);
  });
});

describe('Eyes in the Back', () => {
  it('I: half cover next to you counts from any side; II: allies next to you too', () => {
    const f = fightWith([{ perks: { eyes_in_the_back: 'I' } }, { name: 'Ally' }], [{ at: 'B5' }]);
    const [pc, ally] = f.pcs; at(pc, '4,4'); at(ally, '4,3'); const foe = at(f.foe, '1,4'); // the crates at F4-F5 are behind pc
    withGame(f.g, () => {
      expect(previewAttack(f.cb, foe, pc, 'shot', { free: true }).terms!.some((t) => /Eyes in the Back/.test(t.label))).toBe(true);
      expect(previewAttack(f.cb, foe, ally, 'shot', { free: true }).terms!.some((t) => /Eyes in the Back/.test(t.label))).toBe(false);
    });
    const g = fightWith([{ perks: { eyes_in_the_back: 'II' } }, { name: 'Ally' }], [{ at: 'B5' }]);
    const [p2, a2] = g.pcs; at(p2, '4,6'); at(a2, '4,5'); const f2 = at(g.foe, '1,5');
    withGame(g.g, () => expect(previewAttack(g.cb, f2, a2, 'shot', { free: true }).terms!.some((t) => /Eyes in the Back/.test(t.label))).toBe(true));
  });
});

describe('Wind on the Skin', () => {
  it('I: the nearest unseen enemy within Vision is known when the fight starts; II: every one', () => {
    const f = fightWith([{ perks: { wind_on_the_skin: 'I' }, attrs: { perception: 1 }, skills: { vigilant: 0 } }], [{ at: 'K5' }, { at: 'L7' }], { map: 'laneb_dark' });
    const known = Object.keys(f.cb.lastSeen?.pc || {});
    expect(known).toEqual([f.foes[0].id]);
    expect(logHas(f.cb, /feels the air move/)).toBe(true);
    const g = fightWith([{ perks: { wind_on_the_skin: 'II' }, attrs: { perception: 1 }, skills: { vigilant: 0 } }], [{ at: 'K5' }, { at: 'L7' }], { map: 'laneb_dark' });
    expect(Object.keys(g.cb.lastSeen?.pc || {}).sort()).toEqual(g.foes.map((x) => x.id).sort());
  });
});

describe('Skin Map and Sixth Sense', () => {
  it('Skin Map: a Hidden enemy within 6 tiles is revealed at your turn, but not through a wall', () => {
    const f = fightWith([{ perks: { skin_map: 'mastered' } }], [{ at: 'F6' }]);
    const foe = f.foe; at(f.pc, '1,5'); foe.hidden = true; foe.hideEntry = 1;
    f.turn(f.pc); expect(f.foe.hidden).toBe(false);
    f.foe.hidden = true; wallAt(f.cb, 3); f.turn(f.pc); expect(f.foe.hidden).toBe(true);
  });
  it('Sixth Sense: within 3 tiles, through a wall too', () => {
    const f = fightWith([{ perks: { sixth_sense: 'achieved' } }], [{ at: 'E6' }]);
    at(f.pc, '1,5'); wallAt(f.cb, 2); f.foe.hidden = true; f.foe.hideEntry = 1;
    f.turn(f.pc); expect(f.foe.hidden).toBe(false);
    at(f.foe, '9,5'); f.foe.hidden = true; f.turn(f.pc); expect(f.foe.hidden).toBe(true);
  });
});

describe('Never There', () => {
  it('the first move each turn draws no opportunity attack; later moves do, and ranged reactions take −4', () => {
    const f = fightWith([{ perks: { never_there: 'mastered' } }], [{ at: 'C6', weapon: 'fists' }]);
    at(f.pc, '1,5'); f.foe.attack = 60; f.turn(f.pc);
    f.act({ type: 'combat/move', unitId: f.pc.id, to: '0,5' });
    expect(logHas(f.cb, /opportunity attack/)).toBe(false);
    at(f.foe, '1,6');
    f.act({ type: 'combat/move', unitId: f.pc.id, to: '0,8' });
    expect(logHas(f.cb, /opportunity attack/)).toBe(true);
    const pc = f.pc, foe = f.foe; foe.weapon = 'service_pistol'; foe.ammo = 10;
    withGame(f.g, () => { stateOf(holderOf({ u: pc, cb: f.cb }, 'never_there')!).moving = true; expect(previewAttack(f.cb, foe, pc, 'shot', { free: true }).terms!.some((t) => t.label === 'Never There' && t.v === -4)).toBe(true); });
  });
});

describe('Before the Blink', () => {
  it('first in round 1 whatever the roll, the normal order from round 2, and two reactions a round', () => {
    const f = fightWith([{ name: 'Slow' }, { name: 'Blink', perks: { before_the_blink: 'mastered' } }], [{ at: 'O10' }, { at: 'O2' }]);
    const blink = f.pcs.find((u) => u.name === 'Blink')!;
    expect(f.cb.order[0]).toBe(blink.id);
    expect(maxReactions(blink)).toBe(2);
    const init = [...f.cb.units].sort((a, b) => b.init - a.init || b.agility - a.agility).map((u) => u.id);
    withGame(f.g, () => { for (let i = 0; i < 12 && f.cb.round < 2; i++) { const cb = f.cb; cb.units.forEach((u) => (u.ap = 0)); endTurn(cb, f.g.rng); } });
    expect(f.cb.round).toBe(2); expect(f.cb.order).toEqual(init);
  });
});

describe('Vanishing Act', () => {
  it('2 AP once a fight: Hidden in plain view; an enemy ending its move next to you finds you', () => {
    const f = fightWith([{ perks: { vanishing_act: 'mastered' } }], [{ at: 'F6' }]);
    const pc = f.turn(f.pc);
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'vanishing_act' } as any);
    expect(f.pc.hidden).toBe(true); expect(f.pc.ap).toBe(4);
    f.pc.hidden = false;
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'vanishing_act' } as any)).toThrow(/Used/);
    f.pc.hidden = true;
    withGame(f.g, () => { const foe = f.foe; foe.ap = 6; f.cb.turn = f.cb.order.indexOf(foe.id); const [x, y] = f.pc.pos.split(',').map(Number); moveUnit(f.cb, foe, (x + 1) + ',' + y); });
    expect(f.pc.hidden).toBe(false); expect(logHas(f.cb, /walks into them/)).toBe(true);
  });
  it('any attack reveals you, even a silent one; on the area map it hides you once a scene', () => {
    const f = fightWith([{ perks: { vanishing_act: 'mastered' }, weapon: 'recurve_bow' }], [{ at: 'F6' }]);
    const pc = f.turn(f.pc);
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'vanishing_act' } as any);
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' });
    expect(f.pc.hidden).toBe(false);
    const s = storyWith([{ perks: { vanishing_act: 'mastered' } }]);
    const c = s.chars[0];
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'vanishing_act', actionId: 'vanish' } as any);
    expect(s.g.story.hidden?.[c.id]).toBe(true); expect(s.g.story.sneak?.[c.id]).toBe(true);
    expect(() => s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'vanishing_act', actionId: 'vanish' } as any)).toThrow(/Used/);
  });
});

describe('Charge!', () => {
  it('a straight move of 3+ tiles ending next to an enemy it closed on: up to 3 AP free, once a turn', () => {
    const f = fightWith([{ perks: { charge: 'achieved' } }], [{ at: 'G8' }]);
    const pc = at(f.pc, '1,7'); const u = f.turn(pc); u.movement = 1;
    f.act({ type: 'combat/move', unitId: u.id, to: '5,7' }); // 4 tiles: 4 AP, 3 free
    expect(f.pc.ap).toBe(5); expect(f.pc.bank).toBe(0); expect(logHas(f.cb, /charges/)).toBe(true);
    const g = fightWith([{ perks: { charge: 'achieved' } }], [{ at: 'G8' }]);
    const v = g.turn(at(g.pc, '1,5')); v.movement = 1;
    g.act({ type: 'combat/move', unitId: v.id, to: '5,7' }); // not a straight line
    expect(g.pc.ap).toBe(2);
  });
});

describe('Make Way', () => {
  it('no opportunity attacks; on the area map neutral people are a way through', () => {
    const f = fightWith([{ perks: { make_way: 'achieved' } }], [{ at: 'C6', weapon: 'fists' }]);
    at(f.pc, '1,5'); f.turn(f.pc);
    f.act({ type: 'combat/move', unitId: f.pc.id, to: '0,7' });
    expect(logHas(f.cb, /opportunity attack/)).toBe(false);
    const s = storyWith([{ perks: { make_way: 'achieved' } }]);
    const g: GameState = s.g; const c = s.chars[0];
    const me = positionsOf(g)[c.id], [x, y] = me.split(',').map(Number);
    g.story.npcs = [{ id: 'n1', name: 'Bystander', side: 'neutral', tier: 'minion', weapon: 'fists', pos: (x + 1) + ',' + y } as any];
    withGame(g, () => { const cb = storyCb(g), u = cb.units.find((v) => v.charId === c.id)!; expect(pathOpts(cb, u).pass.has('n1')).toBe(true); });
  });
});

describe('War Footing', () => {
  it('an enemy that ends a move next to you loses 2 AP, once a turn', () => {
    const f = fightWith([{ perks: { war_footing: 'ultimate' } }], [{ at: 'F6' }]);
    const pc = at(f.pc, '1,5'), foe = f.foe;
    withGame(f.g, () => { f.cb.turn = f.cb.order.indexOf(foe.id); foe.ap = 6; foe.movement = 4; moveUnit(f.cb, foe, '2,5'); });
    expect(foe.ap).toBe(6 - 1 - 2); expect(logHas(f.cb, /War Footing/)).toBe(true);
    withGame(f.g, () => { moveUnit(f.cb, foe, '2,6'); });
    expect(foe.ap).toBe(3);
    void pc;
  });
  it('a failed Intimidation costs nothing: no complication, the Narrator is told, no second try this scene', () => {
    const s = storyWith([{ perks: { war_footing: 'ultimate' } }]);
    const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'The guard sneers.', checks: [{ charId: c.id, skills: ['intimidation'], tn: 20, stakes: 'He backs down', target: 'Guard' }] } } as any);
    s.g.rng.state = rngFor(1).state;
    const ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
    const done = s.g.checks.find((k) => k.id === ck.id)!;
    expect(done.roll!.ok).toBe(false); expect(done.roll!.fumble).toBe(false); expect((done.roll as any).noCost).toBe(true);
    expect((s.g.story.rulings || []).some((r: any) => /costs nothing/.test(r.text))).toBe(true);
  });
});

describe('Last Charge', () => {
  it('a straight charge of 5+ tiles: a shield of 15 × Armour Class (once a fight), and ×1.5 melee that turn', () => {
    const f = fightWith([{ perks: { last_charge: 'ultimate' }, weapon: 'combat_knife' }], [{ at: 'H8' }]);
    const pc = at(f.pc, '0,7'); const u = f.turn(pc); u.movement = 3;
    f.act({ type: 'combat/move', unitId: u.id, to: '6,7' });
    const ac = f.g.characters[f.pc.charId!].armourClass;
    expect(f.pc.shield).toBe(Math.round(Math.max(15, 15 * ac) * (f.pc.healRecv || 1)) || f.pc.shield);
    expect(f.pc.shield).toBeGreaterThanOrEqual(15);
    withGame(f.g, () => expect(attackDamage(f.cb, f.pc, f.foe, 'melee', null).mults.some((m) => m.label === 'Last Charge')).toBe(true));
    expect(f.turn(f.pc).shield || 0).toBe(0);
  });
});

describe('Just the Repairman', () => {
  it('spotted while carrying a toolbox: about half the time the observer takes you for staff, and never checks again', () => {
    let saved = 0, n = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const f = fightWith([{ perks: { just_the_repairman: 'achieved' } }], [{ at: 'F6', tier: 'boss' }]);
      const c = f.g.characters[f.pc.charId!]; c.pack = [...packOf(c), { id: 'toolbox', name: 'Toolbox', qty: 1, kind: 'tool' } as any];
      f.pc.hidden = true; f.pc.hideEntry = 1; f.pc.ingMod = -5;
      withGame(f.g, () => spotHidden(f.cb, { state: seed * 7919 }, f.foe));
      n++; if (logHas(f.cb, /maintenance staff/)) { saved++; expect(f.pc.hidden).toBe(true); withGame(f.g, () => spotHidden(f.cb, { state: seed }, f.foe)); expect(f.pc.hidden).toBe(true); }
    }
    expect(saved).toBeGreaterThan(3); expect(saved).toBeLessThan(n);
    // No toolbox, no cover story.
    const g = fightWith([{ perks: { just_the_repairman: 'achieved' } }], [{ at: 'F6', tier: 'boss' }]);
    g.pc.hidden = true; g.pc.hideEntry = 1; g.pc.ingMod = -5;
    withGame(g.g, () => spotHidden(g.cb, rngFor(15), g.foe)); expect(logHas(g.cb, /maintenance staff/)).toBe(false);
  });
});

describe('Silent Partner', () => {
  it('the ally next to you hides with you, and loses it on walking away', () => {
    const f = fightWith([{ perks: { silent_partner: 'achieved' } }, { name: 'Partner' }], [{ at: 'O10' }]);
    const [pc, ally] = f.pcs; at(pc, '1,5'); at(ally, '1,6'); f.foe.vision = 1; f.turn(pc);
    f.act({ type: 'combat/hide', unitId: pc.id } as any);
    expect(f.pcs[0].hidden).toBe(true); expect(f.pcs[1].hidden).toBe(true);
    withGame(f.g, () => { const a = f.pcs[1]; a.ap = 6; f.cb.turn = f.cb.order.indexOf(a.id); moveUnit(f.cb, a, '1,9'); });
    expect(f.pcs[1].hidden).toBe(false);
  });
});

describe('Dead Signal', () => {
  it('in stealth, 1 AP: a lamp within 3 tiles goes dark; seen, it is refused', () => {
    const f = fightWith([{ perks: { dead_signal: 'achieved' } }], [{ at: 'O10' }]);
    const pc = at(f.pc, '1,5'); f.foe.vision = 1; f.cb.objects = [...(f.cb.objects || []), makeObject('lamp9', 'lamp', '3,5')]; f.turn(pc);
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'dead_signal', tile: '3,5' } as any);
    const lamp = f.cb.objects!.find((o) => o.id === 'lamp9')! as any;
    expect(lamp.disabled).toBe(true); expect(f.pc.ap).toBe(5); expect((f.cb.notes || []).some((n) => /Dead Signal/.test(n))).toBe(true);
    const g = fightWith([{ perks: { dead_signal: 'achieved' } }], [{ at: 'F6' }]);
    g.cb.objects = [...(g.cb.objects || []), makeObject('lamp9', 'lamp', '2,5')]; g.turn(g.pc);
    expect(() => g.act({ type: 'combat/perk', unitId: g.pc.id, id: 'dead_signal', tile: '2,5' } as any)).toThrow(/stealth/);
  });
});

describe('Forlorn Hope', () => {
  it('ending a turn closer to the enemy banks +2 AP; no Disengage; armour past Class I gives nothing', () => {
    const f = fightWith([{ traits: ['forlorn_hope'], kit: 'soldier' }], [{ at: 'O6' }]);
    expect(f.pc.armour).toBeLessThanOrEqual(5);
    const u = f.turn(at(f.pc, '1,5'));
    f.act({ type: 'combat/move', unitId: u.id, to: '3,5' });
    withGame(f.g, () => { f.pc.ap = 0; endTurn(f.cb, f.g.rng); });
    expect(f.turn(f.pc).ap).toBe(8);
    expect(() => f.act({ type: 'combat/move', unitId: f.pc.id, to: '3,6', how: 'disengage' })).toThrow(/Disengage/);
  });
});

describe('Live to Fight Another Day', () => {
  it('Disengage free once a turn, then 1 AP; Withdrawing after; Retreat once a fight', () => {
    const f = fightWith([{ traits: ['live_to_fight_another_day'] }], [{ at: 'C6' }]);
    at(f.pc, '1,5'); const u = f.turn(f.pc); const def0 = u.def;
    f.act({ type: 'combat/move', unitId: u.id, to: '0,5', how: 'disengage' });
    expect(f.pc.ap).toBe(6); expect(f.pc.def).toBe(def0 + 2);
    f.act({ type: 'combat/move', unitId: f.pc.id, to: '0,4', how: 'disengage' });
    expect(f.pc.ap).toBe(5);
    const g = fightWith([{ traits: ['live_to_fight_another_day'] }], [{ at: 'F6' }]);
    const v = g.turn(at(g.pc, '3,5'));
    expect(() => g.act({ type: 'combat/perk', unitId: v.id, id: 'live_to_fight_another_day', actionId: 'retreat', tile: '5,7' } as any)).toThrow(/farther/);
    g.act({ type: 'combat/perk', unitId: v.id, id: 'live_to_fight_another_day', actionId: 'retreat', tile: '1,5' } as any);
    expect(g.pc.pos).toBe('1,5'); expect(g.pc.ap).toBe(6);
  });
  it('Yellow: allies within 3 tiles take −1 on Fear saves', () => {
    const f = fightWith([{ traits: ['live_to_fight_another_day'] }, { name: 'Ally' }], [{ at: 'O6' }]);
    const [pc, ally] = f.pcs; at(pc, '1,5'); at(ally, '2,5');
    withGame(f.g, () => {
      const c1: any = emit(f.cb, 'cond_apply', { by: f.foe, t: ally, id: 'fear', fam: 'heart', rounds: 1, saveAdd: 0, cancel: false, why: '', cb: f.cb });
      const c2: any = emit(f.cb, 'cond_apply', { by: f.foe, t: pc, id: 'fear', fam: 'heart', rounds: 1, saveAdd: 0, cancel: false, why: '', cb: f.cb });
      expect(c1.saveAdd).toBe(-1); expect(c2.saveAdd).toBe(0);
      applyCond(f.cb, { state: 3 }, f.foe, ally, 'fear', 1);
    });
  });
});

describe('Drill Echo', () => {
  it('Best Time: Athletics checks never roll below 10; The Count: a 1 on the d6 loses a Brain Power check', () => {
    const s = storyWith([{ traits: ['drill_echo'] }]);
    const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'A wall.', checks: [{ charId: c.id, skills: ['athletics'], tn: 12, stakes: 'Over the wall' }] } } as any);
    s.g.rng.state = rngFor(2).state;
    let ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
    expect(s.g.checks.find((k) => k.id === ck.id)!.roll!.die).toBe(10);
    s.act({ type: 'check/accept', checkId: ck.id } as any);
    let lost = 0;
    for (let i = 0; i < 12; i++) {
      s.act({ type: 'narrator/turn', turn: { narration: 'Think.', checks: [{ charId: c.id, skills: ['brain_power'], tn: 8, stakes: 'Work it out' }] } } as any);
      ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
      if (s.g.story.entries.some((e: any) => /THE COUNT/.test(e.head || ''))) lost++;
      s.act({ type: 'check/accept', checkId: ck.id } as any);
    }
    expect(lost).toBeGreaterThan(0);
  });
  it('The Count on a glyph: on a 1 the AP is spent, no glyph, no charge', () => {
    const f = fightWith([{ traits: ['drill_echo'], archetype: 'sigilist', kit: 'sigil' }], [{ at: 'O10' }]);
    const u = f.turn(f.pc), [x, y] = u.pos.split(',').map(Number), tile = (x + 1) + ',' + y;
    for (let s = 1; s < 500; s++) { if (die({ state: s }, 6) === 1) { f.g.rng.state = s; break; } }
    const ap0 = u.ap, ch0 = u.mg!.charge;
    withGame(f.g, () => expect(drawGlyph(f.cb, { state: 5 }, u, u.mg!.words[0], tile)).toBeNull());
    expect((f.cb.glyphs || []).length).toBe(0); expect(u.mg!.charge).toBe(ch0); expect(u.ap).toBeLessThan(ap0);
    expect(logHas(f.cb, /THE COUNT/)).toBe(true);
  });
});

describe('Ghost Soldier', () => {
  it('the first attack from stealth each fight ×1.5; stealth broken: −2 AP next turn', () => {
    const f = fightWith([{ traits: ['ghost_soldier'], weapon: 'hellraiser_service_rifle' }], [{ at: 'F6' }]);
    const pc = f.pc; pc.hidden = true; pc.hideEntry = 1; f.foe.hp = f.foe.maxHp = 999; f.turn(pc);
    withGame(f.g, () => expect(previewAttack(f.cb, f.pc, f.foe, 'shot').dmg?.mults.some((m) => /Ghost Soldier/.test(m.label))).toBe(true));
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'shot' });
    withGame(f.g, () => { const u = f.pc; u.hidden = true; u.hideEntry = 2; expect(attackDamage(f.cb, u, f.foe, 'shot', null, { preview: true }).mults.some((m) => /Ghost Soldier/.test(m.label))).toBe(false); });
    withGame(f.g, () => { f.pc.ingMod = -9; spotHidden(f.cb, rngFor(20), f.foe); });
    expect(f.pc.hidden).toBe(false);
    expect(f.turn(f.pc).ap).toBe(4);
  });
  it('a rest in a settlement takes a Vigilant check (TN 12); the −1 social skills are generic', () => {
    const s = storyWith([{ traits: ['ghost_soldier'], skills: { vigilant: 0 } }]);
    const c = s.chars[0]; c.hp = 10;
    s.g.rng.state = rngFor(2).state;
    withGame(s.g, () => applyRest(s.g, 'short', { settlement: true }));
    expect(s.g.characters[c.id].hp).toBe(10);
    expect(s.g.story.entries.some((e: any) => /watching the doors/.test(e.text || ''))).toBe(true);
  });
});

describe('Lowland Born', () => {
  it('+1 Movement in an urban zone; in open terrain, −2 Vigilant in a fight and half spotting range', () => {
    const s = storyWith([{ traits: ['lowland_born'] }]);
    const g: any = s.g, c = s.chars[0];
    const base = withGame(g, () => movement(c));
    const camp = JSON.parse(JSON.stringify(g.campaign || builtInCampaign(g.settings.start)));
    camp.zones.forEach((z: any) => { if (z.id === g.story.zone || !g.story.zone) z.urban = true; }); g.campaign = camp;
    if (!g.story.zone) g.story.zone = camp.zones[0].id;
    expect(withGame(g, () => movement(c))).toBe(base + 1);
    camp.zones.forEach((z: any) => { z.urban = false; z.terrain = 'open'; });
    const f = fightWith([{ traits: ['lowland_born'] }], [{ at: 'O6' }]);
    const g2: any = f.g; g2.campaign = camp; g2.story.zone = g.story.zone;
    const h = holderOf({ u: f.pc, cb: f.cb }, 'lowland_born')!;
    expect(withGame(g2, () => (h.info && statQuery({ u: f.pc }, 'skill:vigilant', { combat: true }).add))).toBe(-2);
    f.foe.hidden = true; f.foe.hideEntry = 1; f.pc.vision = 10; at(f.foe, '10,5'); at(f.pc, '1,5');
    withGame(g2, () => spotHidden(f.cb, rngFor(20), f.pc)); expect(f.foe.hidden).toBe(true);
  });
});

describe('Narrator fallback and coverage', () => {
  it('every lane-B effect is engine-run or Narrator-ruled (no gaps)', async () => {
    const { coverageReport } = await import('../src');
    const ids = ['into_the_dark', 'wall_run', 'roll_with_it', 'shadow_step', 'got_you_in_my_sight', 'eyes_in_the_back', 'skin_map', 'never_there', 'before_the_blink', 'vanishing_act', 'charge', 'make_way', 'war_footing', 'last_charge', 'sixth_sense', 'just_the_repairman', 'silent_partner', 'dead_signal', 'wind_on_the_skin', 'ghost_soldier', 'lowland_born', 'forlorn_hope', 'live_to_fight_another_day', 'drill_echo'];
    const gaps = (coverageReport() as any[]).filter((r) => ids.includes(r.key.split(':')[1]) && r.owner === 'gap');
    expect(gaps.map((r) => r.key + '#' + r.index)).toEqual([]);
  });
});
