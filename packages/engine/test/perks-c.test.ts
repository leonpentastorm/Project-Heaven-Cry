// Lane C: weapons, ammo, reactions, explosives (src/perks/c.ts). Each item is shown working in play: through the reducer
// (apply) where an action exists, else with the game bound and the engine's own functions (moveUnit, throwItem,
// resolveAttack, applyDamage…), the same calls the reducer and the enemy AI make.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  apply, moveUnit, resolveAttack, previewAttack, attackDamage, throwItem, applyDamage, applyCond, makeObject, d20, packOf, emitStory, condOn, refOf, positionsOf, endTurn, critMult,
  type Unit, type Combat, type Character, TRAITS, perkActionsFor,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

/** A seed whose next d20 is n. */
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const at = (u: Unit, k: string) => { u.pos = k; return u; };
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const charOf = (g: any, u: Unit): Character => g.characters[u.charId!];
const pk = (id: string, t: string) => 'perk:' + id + '#' + t;

describe('Running Reload', () => {
  it('I: the Move toggle reloads for no extra AP, once a turn; without it a move is just a move', () => {
    const f = fightWith([{ perks: { running_reload: 'I' } }], [{ at: 'O10' }]);
    const pc = at(f.pc, '2,5'); pc.movement = 1; pc.ammo = 3; pc.mags = [24, 24]; f.turn(pc);
    f.act({ type: 'combat/move', unitId: pc.id, to: '4,5', mods: [pk('running_reload', 'reload')] } as any);
    expect(f.pc.ap).toBe(6 - 2); expect(f.pc.ammo).toBe(24); expect(f.pc.mags!.length).toBe(1);
    expect(logHas(f.cb, /reloads on the move \(Running Reload/)).toBe(true);
    f.pc.ammo = 2;
    f.act({ type: 'combat/move', unitId: f.pc.id, to: '5,5', mods: [pk('running_reload', 'reload')] } as any);
    expect(f.pc.ammo).toBe(2); // once a turn
  });
  it('II: clears a jam on the move too; Tier I can\'t', () => {
    const f = fightWith([{ perks: { running_reload: 'II' } }], [{ at: 'O10' }]);
    const pc = at(f.pc, '2,5'); pc.movement = 1; pc.jammed = true; pc.heat = 3; f.turn(pc);
    f.act({ type: 'combat/move', unitId: pc.id, to: '3,5', mods: [pk('running_reload', 'clear')] } as any);
    expect(f.pc.jammed).toBe(false); expect(f.pc.ap).toBe(5);
    const g = fightWith([{ perks: { running_reload: 'I' } }], [{ at: 'O10' }]);
    const u = at(g.pc, '2,5'); u.movement = 1; u.jammed = true; g.turn(u);
    g.act({ type: 'combat/move', unitId: u.id, to: '3,5', mods: [pk('running_reload', 'clear')] } as any);
    expect(g.pc.jammed).toBe(true);
  });
  it('area map: Move and reload walks and reloads for the walk\'s AP', () => {
    const s = storyWith([{ perks: { running_reload: 'I' } }]); const c = s.chars[0];
    c.loaded = 2;
    const pos = positionsOf(s.g)[c.id];
    const [x, y] = pos.split(',').map(Number), to = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy)).find((k) => { try { apply(s.g, { type: 'world/act', charId: c.id, act: 'move', to: k } as any, 'host'); return true; } catch { return false; } })!;
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'running_reload', actionId: 'move_reload', tile: to } as any);
    expect(s.g.characters[c.id].loaded).toBe(24);
    expect(positionsOf(s.g)[c.id]).toBe(to);
  });
});

describe('Rounding Up', () => {
  const evoker = (f: ReturnType<typeof fightWith>) => {
    const pc = f.pc; pc.mg = { ...(pc.mg as any), evoker: true, words: ['fire'], charge: 10, glyphAp: 0.8, maxWords: 4, flux: 0, durBonus: 0 } as any; return pc;
  };
  it('I: once a turn, a glyph\'s fractional remainder rounds up (6 → 6 after a 0.8 AP glyph, then 5.2)', () => {
    const f = fightWith([{ perks: { rounding_up: 'I' }, kit: 'sigil' }], [{ at: 'O10' }]);
    const pc = evoker(f); f.turn(pc); evoker(f);
    f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'fire', tile: refOf(f.pc.pos) } as any);
    expect(f.pc.ap).toBe(6); expect(logHas(f.cb, /Rounding Up/)).toBe(true);
    f.pc.pos = f.pc.pos.split(',').map((v, i) => (i ? +v + 1 : +v)).join(','); // rules 1.4: one glyph a tile, so step first
    f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'fire', tile: refOf(f.pc.pos) } as any);
    expect(f.pc.ap).toBe(5.2);
    const g = fightWith([{ kit: 'sigil' }], [{ at: 'O10' }]); evoker(g); g.turn(g.pc); evoker(g);
    g.act({ type: 'combat/draw', unitId: g.pc.id, word: 'fire', tile: refOf(g.pc.pos) } as any);
    expect(g.pc.ap).toBe(5.2);
  });
  it('II: once a fight, 1 unspent AP carries into the next turn', () => {
    const f = fightWith([{ perks: { rounding_up: 'II' } }], [{ at: 'O10' }]);
    const pc = f.turn(f.pc); pc.ap = 1;
    withGame(f.g, () => endTurn(f.cb, f.g.rng));
    expect(f.pc.apNext).toBe(1);
    expect(f.turn(f.pc).ap).toBe(7);
    const p2 = f.pc; p2.ap = 2; withGame(f.g, () => endTurn(f.cb, f.g.rng));
    expect(f.pc.apNext || 0).toBe(0); // once a fight
  });
});

describe('Catch', () => {
  it('I: a grenade thrown at you is caught (no blast); throw it back for 1 AP; it uses your reaction', () => {
    const f = fightWith([{ perks: { catch: 'I' } }], [{ at: 'H6' }]);
    const pc = at(f.pc, '3,5'), foe = at(f.foe, '7,5'); foe.throwables = { frag_grenade: 1 }; foe.ap = 6; const hp = pc.hp;
    withGame(f.g, () => throwItem(f.cb, f.g.rng, foe, 'frag_grenade', pc.pos));
    expect(pc.hp).toBe(hp); expect(logHas(f.cb, /catches the frag grenade/)).toBe(true);
    expect(pc.reactUsed?.n).toBe(1);
    const u = f.turn(f.pc), fhp = f.foe.hp;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'catch', actionId: 'throw_back', tile: f.foe.pos } as any);
    expect(f.pc.ap).toBe(6 - 1); expect(f.foe.hp).toBeLessThan(fhp);
  });
  it('II: the throw back is free; held past your turn, it goes off in your hands', () => {
    const f = fightWith([{ perks: { catch: 'II' } }], [{ at: 'H6' }]);
    const pc = at(f.pc, '3,5'), foe = at(f.foe, '7,5'); foe.throwables = { frag_grenade: 2 }; foe.ap = 6;
    withGame(f.g, () => throwItem(f.cb, f.g.rng, foe, 'frag_grenade', pc.pos));
    let u = f.turn(f.pc);
    f.act({ type: 'combat/perk', unitId: u.id, id: 'catch', actionId: 'throw_back', tile: f.foe.pos } as any);
    expect(f.pc.ap).toBe(6);
    // A new round: catch again, then end the turn holding it.
    f.cb.round++; const hp = f.pc.hp;
    withGame(f.g, () => throwItem(f.cb, f.g.rng, f.foe, 'frag_grenade', f.pc.pos));
    u = f.turn(f.pc); f.foe.hp = 999;
    withGame(f.g, () => endTurn(f.cb, f.g.rng));
    expect(logHas(f.cb, /goes off in their hands/)).toBe(true); expect(f.pc.hp).toBeLessThan(hp);
  });
});

describe('Sleight of Hand', () => {
  it('I: 2 AP, a grenade planted on an adjacent foe goes off at the start of its turn', () => {
    const f = fightWith([{ perks: { sleight_of_hand: 'I' } }], [{ at: 'E6' }]);
    const pc = at(f.pc, '3,5'), foe = at(f.foe, '4,5'); pc.throwables = { frag_grenade: 1 }; const u = f.turn(pc), hp = foe.hp;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'sleight_of_hand', actionId: 'plant', targetId: foe.id, choice: 'frag_grenade' } as any);
    expect(f.pc.ap).toBe(4); expect(f.pc.throwables!.frag_grenade).toBe(0);
    f.turn(f.foe);
    expect(logHas(f.cb, /planted on Foe 1 goes off/)).toBe(true); expect(f.foe.hp).toBeLessThan(hp);
  });
  it('II: 1 AP; a tracker Marks the target; story plants are Narrator facts, and Tier I can\'t plant mid-conversation', () => {
    const f = fightWith([{ perks: { sleight_of_hand: 'II' } }], [{ at: 'E6' }]);
    const pc = at(f.pc, '3,5'), foe = at(f.foe, '4,5'), c = charOf(f.g, pc);
    c.pack = [...packOf(c), { id: 'plot_tracker', name: 'Tracker', qty: 1, kind: 'plot' } as any];
    const u = f.turn(pc);
    f.act({ type: 'combat/perk', unitId: u.id, id: 'sleight_of_hand', actionId: 'plant', targetId: foe.id, choice: 'Tracker' } as any);
    expect(f.pc.ap).toBe(5); expect(condOn(f.foe, 'marked')).toBe(true);
    expect(packOf(charOf(f.g, f.pc)).some((p) => p.name === 'Tracker')).toBe(false);
    const s = storyWith([{ perks: { sleight_of_hand: 'I' } }]); const ch = s.chars[0];
    s.act({ type: 'story/perk', charId: ch.id, id: 'sleight_of_hand', actionId: 'plant_story', text: 'a forged ration card on the quartermaster', npc: 'Quartermaster' } as any);
    expect(s.g.story.rulings!.some((r) => /forged ration card/.test(r.text))).toBe(true);
    (s.g.story as any).focus = { charId: ch.id, seq: 1 };
    expect(() => s.act({ type: 'story/perk', charId: ch.id, id: 'sleight_of_hand', actionId: 'plant_story', text: 'a coin' } as any)).toThrow(/Sleight of Hand II/);
  });
});

describe('Jury-Rig', () => {
  it('I: a broken gun fires once more (the shot\'s AP); then it is broken again and the use is spent until repaired', () => {
    const f = fightWith([{ perks: { jury_rig: 'I' } }], [{ at: 'H6' }]);
    const pc = at(f.pc, '3,5'); pc.dur = 0; const u = f.turn(pc);
    expect(previewAttack(f.cb, u, f.foe, 'shot').why).toMatch(/Broken/);
    f.act({ type: 'combat/perk', unitId: u.id, id: 'jury_rig', actionId: 'one_more', targetId: f.foe.id } as any);
    expect(logHas(f.cb, /one more go \(Jury-Rig\)/)).toBe(true); expect(logHas(f.cb, /fires at Foe 1/)).toBe(true);
    expect(f.pc.ap).toBe(4); expect(f.pc.dur).toBe(0);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'jury_rig', actionId: 'one_more', targetId: f.foe.id } as any)).toThrow(/Already used on this broken weapon/);
  });
  it('II: patches a drone at double Field Repair strength', () => {
    const f = fightWith([{ perks: { jury_rig: 'II' }, kit: 'medic', skills: { proficiency: 5 } }], [{ at: 'O10' }]);
    const pc = at(f.pc, '3,5'); pc.proficiency = 5; pc.parts = 2;
    const drone: Unit = { ...JSON.parse(JSON.stringify(pc)), id: 'drone-1', name: 'Drone', charId: undefined, companion: 'drone', ctrl: pc.charId, pos: '4,5', hp: 10, maxHp: 60 };
    f.cb.units.push(drone); const u = f.turn(f.pc);
    f.act({ type: 'combat/perk', unitId: u.id, id: 'jury_rig', actionId: 'repair_drone', targetId: 'drone-1' } as any);
    expect(f.unit('drone-1').hp).toBe(10 + Math.ceil(60 * 0.2 * 2)); expect(f.pc.parts).toBe(1); expect(f.pc.ap).toBe(4);
  });
});

describe('Hot-Swap', () => {
  const spec = (tier: string) => ({ perks: { hot_swap: tier }, kit: 'medic', weapon: 'service_pistol' });
  it('I: the first swap of the turn is free, the second costs 1 AP', () => {
    const f = fightWith([spec('I')], [{ at: 'O10' }]); const c = charOf(f.g, f.pc); c.offHand = { id: 'drifter_revolver' } as any;
    const u = f.turn(f.pc);
    f.act({ type: 'combat/swap', unitId: u.id, from: 'off' } as any); expect(f.pc.weapon).toBe('drifter_revolver'); expect(f.pc.ap).toBe(6);
    f.act({ type: 'combat/swap', unitId: u.id, from: 'off' } as any); expect(f.pc.ap).toBe(5);
  });
  it('II: twice a turn', () => {
    const f = fightWith([spec('II')], [{ at: 'O10' }]); charOf(f.g, f.pc).offHand = { id: 'drifter_revolver' } as any;
    const u = f.turn(f.pc);
    for (let i = 0; i < 2; i++) f.act({ type: 'combat/swap', unitId: u.id, from: 'off' } as any);
    expect(f.pc.ap).toBe(6);
    f.act({ type: 'combat/swap', unitId: u.id, from: 'off' } as any); expect(f.pc.ap).toBe(5);
  });
});


describe('Trick Shot', () => {
  it('Ricochet: ignores half cover, and a hit bounces half its damage into a second enemy within 2 tiles; once a turn', () => {
    const f = fightWith([{ perks: { trick_shot: 'mastered' } }], [{ at: 'J6' }, { at: 'J8' }]);
    const pc = at(f.pc, '3,5'); f.foes.forEach((x) => (x.def = 1)); f.cb.objects = [...(f.cb.objects || []), makeObject('cr1', 'crate', '8,5')];
    const u = f.turn(pc);
    f.cb.mods = [pk('trick_shot', 'ricochet')];
    expect(previewAttack(f.cb, u, f.foes[0], 'shot').cover).toBe(0);
    delete f.cb.mods;
    expect(previewAttack(f.cb, u, f.foes[0], 'shot').cover).toBe(5);
    f.g.rng.state = rngFor(10).state;
    const hp2 = f.foes[1].hp;
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foes[0].id, mode: 'shot', mods: [pk('trick_shot', 'ricochet')] } as any);
    expect(logHas(f.cb, /ricochets into Foe 2/)).toBe(true); expect(f.foes[1].hp).toBeLessThan(hp2);
    const n = f.cb.log.length;
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foes[0].id, mode: 'shot', mods: [pk('trick_shot', 'ricochet')] } as any);
    expect(f.cb.log.slice(n).some((l) => /ricochets/.test(l))).toBe(false);
  });
});

describe('Overhaul', () => {
  it('Field Repair costs 1 AP and restores twice as much', () => {
    const f = fightWith([{ perks: { overhaul: 'mastered' }, kit: 'medic', skills: { proficiency: 10 } }], [{ at: 'O10' }]);
    const pc = f.pc; pc.proficiency = 10; pc.parts = 2; pc.dur = 1; const u = f.turn(pc); // Tuned (5 points): the weapon is never at 0
    f.act({ type: 'combat/repair', unitId: u.id } as any);
    expect(f.pc.ap).toBe(5); expect(f.pc.dur).toBe(1 + Math.ceil(f.pc.maxDur! * (0.1 + 0.05 * 7) * 2));
  });
  it('story: bench repair to full on one part; after a long rest, a permanent extra slot of a type the weapon has', () => {
    const s = storyWith([{ perks: { overhaul: 'mastered' }, kit: 'medic' }]); const c = s.chars[0];
    c.weaponState = { ...(c.weaponState || {}), dur: 10, mods: ['mod_red_dot'] };
    c.pack = [...packOf(c), { id: 'mod_scope', item: 'mod_scope', name: 'Scope', qty: 1, kind: 'tool' } as any];
    s.act({ type: 'story/perk', charId: c.id, id: 'overhaul', actionId: 'bench_repair' } as any);
    expect(s.g.characters[c.id].weaponState!.dur).toBe(300);
    const idx = () => String(packOf(s.g.characters[c.id]).findIndex((p) => p.id === 'mod_scope'));
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'overhaul', actionId: 'extra_slot', choice: idx() } as any)).toThrow(/long rest/);
    s.act({ type: 'rest', kind: 'long' } as any);
    s.act({ type: 'story/perk', charId: c.id, id: 'overhaul', actionId: 'extra_slot', choice: idx() } as any);
    expect(s.g.characters[c.id].weaponState!.mods).toEqual(['mod_red_dot', 'mod_scope']);
  });
});

describe('Nothing Gets Past', () => {
  // rules 1.13: no shots. Every enemy that moves in your sight is Spotted for free (the Spot Call's mark at your level).
  it('every enemy that moves in sight is Spotted, free: no AP, no reaction, once a round each; allies use the mark', () => {
    const f = fightWith([{ perks: { nothing_gets_past: 'mastered' }, skills: { vigilant: 10 } }, {}], [{ at: 'J4' }, { at: 'J8' }]);
    const pc = at(f.pc, '3,5'); const u = f.turn(pc), ap = u.ap;
    const [a, b] = f.foes; a.hp = b.hp = 999; a.ap = b.ap = 6;
    withGame(f.g, () => { moveUnit(f.cb, a, '8,3', f.g.rng); moveUnit(f.cb, b, '8,7', f.g.rng); });
    expect(f.cb.log.filter((l) => /Nothing Gets Past\): Spotted/.test(l)).length).toBe(2);
    expect(f.pc.ap).toBe(ap); expect(f.pc.reactUsed?.n || 0).toBe(0);
    const mark = f.foes[0].call!.spot!;
    expect(mark.by).toBe(f.pc.id); expect(mark.left).toBe(2); expect(mark.hit).toBe(1); expect(mark.unhide).toBe(true); // step 3 at 10 points
    expect(f.foes[0].call!.hindered).toBeUndefined(); // it takes no Call slot
    withGame(f.g, () => moveUnit(f.cb, f.foes[0], '8,4', f.g.rng));
    expect(f.cb.log.filter((l) => /Nothing Gets Past\): Spotted/.test(l)).length).toBe(2); // once a round for each enemy
    // no shot is fired, and it holds no Overwatch
    expect(f.cb.log.some((l) => /fires from overwatch/.test(l))).toBe(false);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'nothing_gets_past', actionId: 'hold_line' } as any)).toThrow();
  });
  it('an enemy that moves where you can\'t see is not Spotted; without the perk nobody is', () => {
    const f = fightWith([{ perks: { nothing_gets_past: 'mastered' }, skills: { vigilant: 10 } }], [{ at: 'J4' }]);
    at(f.pc, '3,5'); f.pc.vision = 2; f.turn(f.pc); const a = f.foe; a.ap = 6;
    withGame(f.g, () => moveUnit(f.cb, a, '10,3', f.g.rng));
    expect(f.foe.call?.spot).toBeUndefined();
    const g = fightWith([{ skills: { vigilant: 10 } }], [{ at: 'J4' }]); at(g.pc, '3,5'); g.turn(g.pc); g.foe.ap = 6;
    withGame(g.g, () => moveUnit(g.cb, g.foe, '8,3', g.g.rng));
    expect(g.foe.call?.spot).toBeUndefined();
  });
});

describe('Dance of Iron', () => {
  it('a miss against you draws a free shot back at the attacker, as your reaction', () => {
    const f = fightWith([{ perks: { dance_of_iron: 'achieved' } }], [{ at: 'H6' }]);
    const pc = at(f.pc, '3,5'), foe = at(f.foe, '7,5'); pc.def = 99; foe.hp = 999;
    f.turn(foe);
    withGame(f.g, () => { resolveAttack(f.cb, rngFor(5), foe, pc, 'shot', null); endTurn(f.cb, f.g.rng); });
    expect(logHas(f.cb, /dances out of it and fires back/)).toBe(true);
    expect(f.pc.reactUsed?.n).toBe(1);
    const g = fightWith([{}], [{ at: 'H6' }]); const p = at(g.pc, '3,5'), fo = at(g.foe, '7,5'); p.def = 99; g.turn(fo);
    withGame(g.g, () => { resolveAttack(g.cb, rngFor(5), fo, p, 'shot', null); endTurn(g.cb, g.g.rng); });
    expect(logHas(g.cb, /dances/)).toBe(false);
  });
});

describe('Holy Ordnance', () => {
  it('I: 3 AP, a blessed magazine does +20% to cursed beings until it is swapped out', () => {
    const f = fightWith([{ perks: { holy_ordnance: 'I' } }], [{ at: 'H6' }]);
    const pc = at(f.pc, '3,5'), foe = f.foe; foe.kind = 'cursed'; const u = f.turn(pc);
    const before = withGame(f.g, () => attackDamage(f.cb, u, foe, 'shot', null, { preview: true }).total);
    f.act({ type: 'combat/perk', unitId: u.id, id: 'holy_ordnance', actionId: 'bless', targetId: u.id } as any);
    expect(f.pc.ap).toBe(3);
    const after = withGame(f.g, () => attackDamage(f.cb, f.pc, f.foe, 'shot', null, { preview: true }));
    expect(after.total).toBeCloseTo(before * 1.2, 5); expect(after.mults.some((m) => /Holy Ordnance/.test(m.label))).toBe(true);
    f.foe.kind = 'human';
    expect(withGame(f.g, () => attackDamage(f.cb, f.pc, f.foe, 'shot', null, { preview: true }).total)).toBeCloseTo(before, 5);
    f.pc.ammo = 3; f.act({ type: 'combat/reload', unitId: f.pc.id } as any);
    expect(f.pc.ps?.['holy:bless']).toBeUndefined();
  });
  it('II: +40% and two magazines', () => {
    const f = fightWith([{ perks: { holy_ordnance: 'II' } }], [{ at: 'H6' }]);
    const u = f.turn(at(f.pc, '3,5')); f.foe.kind = 'crawler';
    f.act({ type: 'combat/perk', unitId: u.id, id: 'holy_ordnance', actionId: 'bless', targetId: u.id } as any);
    f.pc.ammo = 3; f.pc.ap = 6; f.act({ type: 'combat/reload', unitId: f.pc.id } as any);
    expect(f.pc.ps!['holy:bless'].loaded).toBe(true);
    const d = withGame(f.g, () => attackDamage(f.cb, f.pc, f.foe, 'shot', null, { preview: true }));
    expect(d.mults.find((m) => /Holy Ordnance/.test(m.label))!.v).toBeCloseTo(1.4, 5);
    f.pc.ammo = 3; f.pc.ap = 6; f.act({ type: 'combat/reload', unitId: f.pc.id } as any);
    expect(f.pc.ps?.['holy:bless']).toBeUndefined();
  });
});

describe('Gun Nut', () => {
  it('a jam clears for 0 AP and keeps the Heat; the enemy\'s iron is named at the start', () => {
    const f = fightWith([{ traits: ['gun_nut'] }], [{ at: 'H6' }, { at: 'P11' }]);
    expect(logHas(f.cb, /knows the iron \(Gun Nut\): Foe 1, Service pistol/)).toBe(true);
    const u = f.turn(f.pc); u.jammed = true; u.heat = 5;
    f.act({ type: 'combat/clear', unitId: u.id } as any);
    expect(f.pc.jammed).toBe(false); expect(f.pc.ap).toBe(6); expect(f.pc.heat).toBe(5);
  });
  it('story: a second mod in a slot type the gun has; no Collector note at session start (item 369: the collection is the first guns gained)', () => {
    const s = storyWith([{ traits: ['gun_nut'] }]); const c = s.chars[0];
    emitStory(s.g, 'session_start', { g: s.g, n: 2 });
    expect((s.g.story.rulings || []).some((r) => /Collector/.test(r.text))).toBe(false);
    c.weaponState = { ...(c.weaponState || {}), mods: ['mod_red_dot'] };
    c.pack = [...packOf(c), { id: 'mod_scope', item: 'mod_scope', name: 'Scope', qty: 1, kind: 'tool' } as any];
    s.act({ type: 'story/perk', charId: c.id, id: 'gun_nut', actionId: 'extra_mod', choice: 'mod_scope' } as any);
    expect(s.g.characters[c.id].weaponState!.mods).toEqual(['mod_red_dot', 'mod_scope']);
  });
});

describe('Old School', () => {
  it('Fan the Hammer: 3 AP, every loaded round at −2, once a turn; Analog refuses an Evoker-linked gun', () => {
    const f = fightWith([{ traits: ['old_school'], weapon: 'drifter_revolver' }], [{ at: 'H6' }]);
    const u = f.turn(at(f.pc, '3,5')); u.ammo = 6; f.foe.hp = 9999; f.foe.maxHp = 9999;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'old_school', actionId: 'fan', targetId: f.foe.id } as any);
    expect(f.pc.ap).toBe(3); expect(f.cb.log.filter((l) => /fires at Foe 1/.test(l)).length).toBeGreaterThanOrEqual(5);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'old_school', actionId: 'fan', targetId: f.foe.id } as any)).toThrow();
    const g = fightWith([{ traits: ['old_school'], weapon: 'spellslinger_pistol' }], [{ at: 'H6' }]);
    const v = g.turn(at(g.pc, '3,5'));
    expect(previewAttack(g.cb, v, g.foe, 'shot').why).toMatch(/Old School/);
  });
});

describe('Spray and Pray', () => {
  it('full auto: −1 not −2, every target makes a Body save against Suppressed, and it burns 20 rounds', () => {
    const f = fightWith([{ traits: ['spray_and_pray'] }], [{ at: 'H6' }]);
    const u = f.turn(at(f.pc, '3,5'));
    const terms = previewAttack(f.cb, u, f.foe, 'auto').terms!;
    expect(terms.some((t) => /Spray and Pray/.test(t.label) && t.v === 1)).toBe(true);
    expect(previewAttack(f.cb, u, f.foe, 'aimed').terms!.some((t) => /Ammo Hog/.test(t.label) && t.v === -2)).toBe(true);
    f.foe.hp = 9999; f.foe.maxHp = 9999;
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'auto' } as any);
    expect(logHas(f.cb, /Suppression on Foe 1/)).toBe(true);
    expect(f.pc.ammo).toBe(14);
    withGame(f.g, () => endTurn(f.cb, f.g.rng));
    expect(f.pc.ammo).toBe(4);
  });
  it('Ammo Hog: a single shot costs two rounds', () => {
    const f = fightWith([{ traits: ['spray_and_pray'] }], [{ at: 'H6' }]);
    const u = f.turn(at(f.pc, '3,5')); f.foe.hp = 9999;
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'shot' } as any);
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'shot' } as any);
    expect(f.pc.ammo).toBe(24 - 3);
    withGame(f.g, () => endTurn(f.cb, f.g.rng));
    expect(f.pc.ammo).toBe(24 - 4);
  });
});

describe('One Shot', () => {
  it('Breath Held: unmoved, the first shot ignores half cover and a critical does +25% (rules 1.15: never past ×2); then Tunnel Vision until you move', () => {
    const mk = (traits: string[]) => { const f = fightWith([{ traits }], [{ at: 'J6' }]); const u = f.turn(at(f.pc, '3,5')); f.foe.hp = 9999; f.foe.maxHp = 9999; f.foe.armour = 0; return { f, u }; };
    const { f, u } = mk(['one_shot']); f.cb.objects = [...(f.cb.objects || []), makeObject('cr1', 'crate', '8,5')];
    expect(previewAttack(f.cb, u, f.foe, 'shot').cover).toBe(0);
    f.g.rng.state = rngFor(20).state;
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'shot' } as any);
    const lost = 9999 - f.foe.hp;
    const b = mk([]); b.f.g.rng.state = rngFor(20).state;
    b.f.act({ type: 'combat/attack', unitId: b.u.id, targetId: b.f.foe.id, mode: 'shot' } as any);
    const base = 9999 - b.f.foe.hp;
    const cm = withGame(f.g, () => critMult(charOf(f.g, f.pc)!)), want = base * Math.min(2, cm + 0.25) / cm; // base is a plain critical (× cm)
    expect(cm).toBeLessThan(1.75); expect(lost).toBeGreaterThan(base); expect(Math.abs(lost - want)).toBeLessThanOrEqual(2);
    expect((charOf(f.g, f.pc) as any).state.tunnel).toBe(true);
    // The second shot of the turn is not Breath Held.
    expect(previewAttack(f.cb, f.pc, f.foe, 'shot').cover).toBe(5);
    // Ambush on a Tunnel-Vision holder: +50%.
    const hp = f.pc.hp; withGame(f.g, () => applyDamage(f.cb, f.pc, 20, { type: 'weapon', by: f.foe, ambush: true } as any));
    expect(hp - f.pc.hp).toBe(Math.floor(20 * (1 - Math.min(0.6, f.pc.ambushTaken || 0)) * 1.5));
    f.act({ type: 'combat/move', unitId: f.pc.id, to: '3,6' } as any);
    expect((charOf(f.g, f.pc) as any).state.tunnel).toBeUndefined();
  });
  it('story: under Tunnel Vision a Vigilant check fails', () => {
    const s = storyWith([{ traits: ['one_shot'] }]); const c = s.chars[0];
    (c as any).state = { ...((c as any).state || {}), tunnel: true };
    s.act({ type: 'narrator/turn', turn: { narration: 'A sound behind you.', checks: [{ charId: c.id, skills: ['vigilant'], tn: 8, stakes: 'Hear it' }] } } as any);
    s.g.rng.state = rngFor(19).state;
    const ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id } as any);
    expect(s.g.checks.find((k) => k.id === ck.id)!.roll!.ok).toBe(false);
  });
});

describe('Grenadier\'s Arm', () => {
  it('Long Throw +2 range and Strained Arm +1 AP on throws; Throw someone moves them and hurts both', () => {
    const f = fightWith([{ traits: ['grenadiers_arm'], attrs: { strength: 13 } }], [{ at: 'H6' }, { at: 'H8' }]);
    const u = f.turn(at(f.pc, '3,5'));
    const g0 = fightWith([{}], [{ at: 'H6' }]);
    expect(f.pc.throwRange).toBe(g0.pc.throwRange! + 2);
    u.throwables = { frag_grenade: 1 };
    f.act({ type: 'combat/throw', unitId: u.id, item: 'frag_grenade', tile: refOf(f.foes[0].pos) } as any);
    expect(f.pc.ap).toBe(3);
    const [a, b] = f.foes; at(a, '4,5'); at(b, '6,5'); a.hp = a.maxHp = b.hp = b.maxHp = 999; f.pc.ap = 6;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'grenadiers_arm', actionId: 'hurl', targetId: a.id, tile: '6,5' } as any);
    expect(f.pc.ap).toBe(3); expect(f.foes[0].pos).not.toBe('4,5'); expect(f.foes[0].hp).toBeLessThan(999); expect(f.foes[1].hp).toBeLessThan(999);
    expect(logHas(f.cb, /throws Foe 1/)).toBe(true);
  });
});

describe('Demolitionist', () => {
  it('+30% to explosions you set off; Set explosive shapes a line; hearing checks fail', () => {
    const run = (traits: string[]) => { const f = fightWith([{ traits }], [{ at: 'H6' }]); const u = f.turn(at(f.pc, '3,5')); f.foe.hp = f.foe.maxHp = 999; u.throwables = { frag_grenade: 1 }; f.act({ type: 'combat/throw', unitId: u.id, item: 'frag_grenade', tile: refOf(f.foe.pos) } as any); return 999 - f.foe.hp; };
    const d = run(['demolitionist']), base = run([]);
    expect(d).toBe(Math.floor(base * 1.3));
    const f = fightWith([{ traits: ['demolitionist'] }], [{ at: 'G6' }]);
    const u = f.turn(at(f.pc, '3,5')); u.throwables = { satchel_charge: 1 }; at(f.foe, '7,5'); f.foe.hp = f.foe.maxHp = 999;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'demolitionist', actionId: 'set_explosive', tile: '4,5', choice: 'line' } as any);
    expect(f.pc.ap).toBe(4); expect(f.foe.hp).toBeLessThan(999); expect(logHas(f.cb, /shaped satchel charge \(line\)/)).toBe(true);
    const s = storyWith([{ traits: ['demolitionist'] }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'Whispers.', checks: [{ charId: c.id, skills: ['sensory'], tn: 8, stakes: 'Hear them', tags: ['hearing'] }] } } as any);
    s.g.rng.state = rngFor(19).state;
    const ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id } as any);
    expect(s.g.checks.find((k) => k.id === ck.id)!.roll!.ok).toBe(false);
  });
  it('on a trigger: set now, Detonate later', () => {
    const f = fightWith([{ traits: ['demolitionist'] }], [{ at: 'G6' }]);
    const u = f.turn(at(f.pc, '3,5')); u.throwables = { frag_grenade: 1 }; at(f.foe, '5,5'); f.foe.hp = f.foe.maxHp = 999;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'demolitionist', actionId: 'set_explosive', tile: '4,5', choice: 'circle remote' } as any);
    expect(f.foe.hp).toBe(999);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'demolitionist', actionId: 'detonate' } as any);
    expect(f.foe.hp).toBeLessThan(999); expect(f.pc.ap).toBe(3);
  });
});

describe('Blade Recluse', () => {
  it('the named weapon can\'t be Disarmed and its family\'s kills count 1.25; story naming; an extra mod slot', () => {
    const s = storyWith([{ traits: ['blade_recluse'] }]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'blade_recluse', actionId: 'name_blade' } as any);
    expect((s.g.characters[c.id] as any).state.oneBlade.weapon).toBe('hellraiser_service_rifle');
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'minion', weapon: 'service_pistol', at: 'E6' }] } } } as any);
    const cb = s.g.combat!, pc = cb.units.find((x) => x.side === 'pc')!, foe = cb.units.find((x) => x.side === 'foe')!;
    const r = withGame(s.g, () => applyCond(cb, s.g.rng, foe, pc, 'disarmed', undefined, undefined, { skipSave: true }));
    expect(r).toMatch(/untouched/); expect(condOn(pc, 'disarmed')).toBe(false);
    cb.turn = cb.order.indexOf(pc.id); pc.ap = 6; foe.hp = 1; foe.def = 1; foe.armour = 0;
    s.g.rng.state = rngFor(15).state;
    s.act({ type: 'combat/attack', unitId: pc.id, targetId: foe.id, mode: 'shot' } as any);
    expect(s.g.characters[c.id].weaponKills.rifles).toBe(1.25);
  });
  it('promises no weapon mastery: it is retired by rules 1.12 (item 947) and nothing applies it (13 Nov 2026)', () => {
    const t: any = TRAITS.find((x) => x.id === 'blade_recluse');
    expect([t.text, ...t.upsides].join(' ')).not.toMatch(/mastery/i);
    const s = storyWith([{ traits: ['blade_recluse'] }]);
    const name = withGame(s.g, () => perkActionsFor({ c: s.chars[0], g: s.g }, 'story')).find((e) => e.actionId === 'name_blade')!;
    expect(name.text).not.toMatch(/mastery|kills/i);
  });
});

describe('Slicer', () => {
  it('Backdoor: 2 AP, a locked door within 5 tiles opens on Acuity; it locks again at your next turn', () => {
    const f = fightWith([{ traits: ['slicer'] }], [{ at: 'O10' }]);
    const u = f.turn(at(f.pc, '3,5')); u.analysis = 30;
    f.cb.objects = [...(f.cb.objects || []), makeObject('d1', 'door', '7,5', { locked: true })];
    f.g.rng.state = rngFor(10).state;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'slicer', actionId: 'backdoor', tile: '7,5', choice: 'open' } as any);
    const door = () => f.cb.objects!.find((o) => o.id === 'd1')!;
    expect(f.pc.ap).toBe(4); expect(door().open).toBe(true); expect(door().locked).toBe(false);
    f.turn(f.pc); expect(door().locked).toBe(true);
  });
  it('a turret unit is Puppeted; mobile robots are refused; lightning Stuns the slicer; machines spot them +2', () => {
    const f = fightWith([{ traits: ['slicer'] }], [{ at: 'H6' }, { at: 'H8' }]);
    const u = f.turn(at(f.pc, '3,5')); u.analysis = 30; const [t, r] = f.foes; t.kind = 'turret'; r.kind = 'robot';
    f.g.rng.state = rngFor(10).state;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'slicer', actionId: 'backdoor', tile: refOf(t.pos) } as any);
    expect(condOn(f.foes[0], 'puppeted')).toBe(true);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'slicer', actionId: 'backdoor', tile: refOf(f.foes[1].pos) } as any)).toThrow(/static devices/);
    withGame(f.g, () => applyDamage(f.cb, f.pc, 5, { type: 'elemental', dmgType: 'lightning', by: f.foes[1] } as any));
    expect(condOn(f.pc, 'stunned')).toBe(true);
    const s = storyWith([{ traits: ['slicer'] }]); const c = s.chars[0];
    const sh = emitStory(s.g, 'stay_hidden', { c, npc: { kind: 'robot', name: 'Sentry' }, mod: 0, tn: 12, g: s.g });
    expect(sh.tn).toBe(14);
  });
});
