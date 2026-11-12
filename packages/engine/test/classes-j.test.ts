// Lane J: advanced classes (src/classes/j.ts). Every move is shown working in play: through the reducer (apply) where it
// is an action or rides on one, else with the game bound and the engine's own functions (moveUnit, resolveAttack,
// applyDamage, emit), the same calls the reducer and the enemy AI make.
import { describe, expect, it } from 'vitest';
import './helpers/grammar-only'; // rules 1.17: the Line multiplier is off here (these tests pin the grammar's own numbers)
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import { apply, defense, moveUnit, resolveAttack, previewAttack, applyDamage, applyCond, condOn, d20, emit, emitStory, refOf, objectsOf, endTurn, healingMult, type Unit, type Combat, type Character } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

/** A seed whose next d20 is n. */
function rngFor(n: number): number { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return s; } throw new Error('no seed'); }
const seed = (f: { g: any }, n: number) => { f.g.rng.state = rngFor(n); };
const at = (u: Unit, k: string) => { u.pos = k; return u; };
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const charOf = (g: any, u: Unit): Character => g.characters[u.charId!];
const tough = (u: Unit, def = 0) => { u.hp = u.maxHp = 999; u.def = def; u.armour = 0; u.injResist = 0; return u; };
const cls = (adv: string, extra: any = {}) => ({ advancedClass: adv, ...extra });
const mk = (id: string, t: string) => 'class:' + id + '#' + t;
const evoker = (u: Unit, words: string[], extra: any = {}) => { u.mg = { words, designs: [], evoker: true, emanator: false, charge: 10, cores: 0, coresMade: 0, flux: 0, mp: 0, mpMax: 0, strain: 0, held: null, cast: false, brain: 2, will: 0, sigilMult: 1, soulMult: 1, elemMult: 1, healMult: 1, maxWords: 3, glyphAp: 1, coreSave: 0, rangeBonus: 0, durBonus: 0, soulAp: 2, costSave: 0, soulRange: 0, syphon: 1, strainLimit: 3, saves: { body: 0, brain: 0, heart: 0 }, debuff: { body: 0, brain: 0, heart: 0 }, ...extra } as any; return u; };

// ============================================================ Gunslinger
describe('Gunslinger', () => {
  it('The Draw: a loaded pistol fires one 0-AP shot before the first turn; once a fight', () => {
    const f = fightWith([cls('gunslinger', { weapon: 'service_pistol' })], [{ at: 'F6' }]);
    expect(logHas(f.cb, /draws first \(The Draw\)/)).toBe(true);
    expect(f.cb.log.filter((l) => /fires at Foe 1/.test(l)).length).toBeGreaterThanOrEqual(1);
    expect(f.pc.ammo).toBe(11);
    // without the class: no Draw
    const g = fightWith([{ weapon: 'service_pistol' }], [{ at: 'F6' }]);
    expect(logHas(g.cb, /The Draw/)).toBe(false);
  });
  it('The Draw: a rifle (not a pistol or revolver) gets none', () => {
    const f = fightWith([cls('gunslinger', { weapon: 'long_rifle' })], [{ at: 'F6' }]);
    expect(logHas(f.cb, /The Draw/)).toBe(false);
  });
  it('Six for Six: 4 AP, six shots at a target within 4 tiles, Heat on each; once a scene', () => {
    const f = fightWith([cls('gunslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); tough(at(f.foe, '5,5')); pc.heat = 0; pc.ammo = 12; pc.ap = 6;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'gunslinger.six_for_six', targetId: f.foe.id } as any);
    expect(f.pc.ap).toBe(2); expect(f.pc.ammo).toBe(6); expect(f.pc.heat).toBe(6);
    expect(f.cb.log.filter((l) => /fires at Foe 1/.test(l)).length).toBe(6);
    f.pc.ap = 6; f.pc.jammed = false; f.pc.heat = 0;
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'gunslinger.six_for_six', targetId: f.foe.id } as any)).toThrow(/Used/);
  });
  it('Six for Six: refuses a target more than 4 tiles away', () => {
    const f = fightWith([cls('gunslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); at(f.foe, '8,5');
    expect(() => f.act({ type: 'combat/perk', unitId: pc.id, id: 'gunslinger.six_for_six', targetId: f.foe.id } as any)).toThrow(/4 tiles/);
  });
  it('Called Shot: 3 AP, −2 to hit (named in the breakdown), and the leg injury without a critical', () => {
    const f = fightWith([cls('gunslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); const foe = tough(at(f.foe, '5,5')); const mv = foe.movement; pc.ap = 6;
    seed(f, 10);
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'gunslinger.called_shot', targetId: foe.id, choice: 'leg' } as any);
    expect(f.pc.ap).toBe(3);
    expect(f.foe.movement).toBe(mv / 2); expect((f.foe.injuries || []).some((i) => i.loc === 'leg')).toBe(true);
    expect(logHas(f.cb, /CALLED SHOT: \w+ leg/)).toBe(true);
    // the head: Dazed
    f.pc.ap = 6; seed(f, 10);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'gunslinger.called_shot', targetId: f.foe.id, choice: 'head' } as any);
    expect(f.foe.dazedNext).toBe(1);
  });
  it('Called Shot: Injury resistance still rolls (a Boss-tough body shrugs it off)', () => {
    const f = fightWith([cls('gunslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); const foe = tough(at(f.foe, '5,5')); foe.injResist = 100; pc.ap = 6;
    seed(f, 10);
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'gunslinger.called_shot', targetId: foe.id, choice: 'arm' } as any);
    expect((f.foe.injuries || []).length).toBe(0); expect(logHas(f.cb, /called arm resisted/)).toBe(true);
  });
  it('Called Shot in a story standoff: a pending ruling for the Narrator', () => {
    const s = storyWith([cls('gunslinger')]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'gunslinger.called_shot', actionId: 'called_shot_story', text: 'I shoot the gun out of his hand.' } as any);
    expect((s.g.story.rulings || []).some((r: any) => /Called Shot in a standoff/.test(r.text))).toBe(true);
  });
});

// ============================================================ Hellraiser Heavy
describe('Hellraiser Heavy', () => {
  it('Emplace: 2 AP, Emplaced + braced, +5 armour, no recoil; moving ends it and takes the armour back', () => {
    const f = fightWith([cls('hellraiser_heavy', { weapon: 'hellraiser_lmg' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); const arm = pc.armour; pc.ap = 6;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'hellraiser_heavy.emplace' } as any);
    expect(f.pc.ap).toBe(4); expect(condOn(f.pc, 'emplaced')).toBe(true); expect(f.pc.braced).toBe(true); expect(f.pc.armour).toBe(arm + 5);
    const foe = at(f.foe, '6,5'); f.pc.shotsThisTurn = 3; f.pc.dexterity = 0;
    const pv = withGame(f.g, () => previewAttack(f.cb, f.pc, foe, 'shot'));
    expect(pv.terms!.some((t) => t.label === 'recoil')).toBe(false); // attack_preview's noRecoil: no recoil term at all
    expect(pv.terms!.some((t) => t.label === 'not braced')).toBe(false);
    f.act({ type: 'combat/move', unitId: f.pc.id, to: '3,5' } as any);
    expect(condOn(f.pc, 'emplaced')).toBe(false); expect(f.pc.armour).toBe(arm);
  });
  it('Emplace: needs a heavy weapon or a rifle', () => {
    const f = fightWith([cls('hellraiser_heavy', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    const pc = f.turn(f.pc);
    expect(() => f.act({ type: 'combat/perk', unitId: pc.id, id: 'hellraiser_heavy.emplace' } as any)).toThrow(/heavy weapon or a rifle/);
  });
  it('Suppression: refused unless Emplaced; works once Emplaced', () => {
    const f = fightWith([cls('hellraiser_heavy', { weapon: 'hellraiser_lmg' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); pc.ap = 9; pc.heat = 0;
    expect(() => f.act({ type: 'combat/perk', unitId: pc.id, id: 'hellraiser_heavy.suppression', tile: '8,5' } as any)).toThrow(/Emplace first/);
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'hellraiser_heavy.emplace' } as any);
    const ammo = f.pc.ammo;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'hellraiser_heavy.suppression', tile: '8,5' } as any);
    expect(f.pc.ammo).toBe(ammo - 10); expect(f.pc.heat).toBe(4);
    const foe = tough(at(f.foe, '9,5')); foe.ap = 6;
    seed(f, 15);
    withGame(f.g, () => moveUnit(f.cb, foe, '11,5', f.g.rng));
    expect(logHas(f.cb, /suppressing fire catches Foe 1 on the move/)).toBe(true);
    expect(f.pc.ammo).toBe(ammo - 10); // the triggered shot costs nothing
    expect(f.pc.ps!['class:hellraiser_heavy.suppression'].zone.struck).toContain(foe.id);
    f.turn(f.pc); expect(f.pc.ps!['class:hellraiser_heavy.suppression'].zone).toBeNull();
  });
  it('Suppression: an enemy attacking from the zone is shot first', () => {
    const f = fightWith([cls('hellraiser_heavy', { weapon: 'hellraiser_lmg' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); pc.ap = 9; pc.heat = 0;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'hellraiser_heavy.emplace' } as any);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'hellraiser_heavy.suppression', tile: '8,5' } as any);
    const foe = tough(at(f.foe, '8,5')); foe.ap = 6;
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, foe, f.pc, 'shot', null));
    expect(logHas(f.cb, /catches Foe 1 as it opens fire/)).toBe(true);
  });
  it('Belt Discipline: Emplaced, a Heat-limit jam doesn\'t happen below limit + 6; 4 Heat shed at turn start', () => {
    const f = fightWith([cls('hellraiser_heavy', { weapon: 'hellraiser_lmg' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); pc.ap = 9;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'hellraiser_heavy.emplace' } as any);
    const foe = tough(at(f.foe, '6,5')); f.pc.heat = 13; seed(f, 10);
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.pc, foe, 'shot', null));
    expect(f.pc.heat).toBe(14); expect(f.pc.jammed).toBe(false);
    f.pc.heat = 10; const u = f.turn(f.pc); expect(u.heat).toBe(6);
    // not Emplaced: jams at 14 and cools by 2
    const g = fightWith([cls('hellraiser_heavy', { weapon: 'hellraiser_lmg' })], [{ at: 'O10' }]);
    const p2 = g.turn(at(g.pc, '2,5')); p2.heat = 13; seed(g, 10);
    withGame(g.g, () => resolveAttack(g.cb, g.g.rng, p2, tough(at(g.foe, '6,5')), 'shot', null));
    expect(g.pc.jammed).toBe(true);
  });
});

// ============================================================ CCEC Ballistician
describe('CCEC Ballistician', () => {
  it('Case File: Analyze costs 1 AP (even at Analysis 3) and Marks the target', () => {
    const f = fightWith([cls('ccec_ballistician', { weapon: 'long_rifle', skills: { analysis: 3 } })], [{ at: 'F6' }]);
    const pc = f.turn(at(f.pc, '2,5')); pc.ap = 6; pc.analysis = 3;
    f.act({ type: 'combat/analyze', unitId: pc.id, targetId: f.foe.id } as any);
    expect(f.pc.ap).toBe(5); expect(condOn(f.foe, 'marked')).toBe(true); expect(f.foe.condBy?.marked).toBe(f.pc.id);
  });
  it('Case File: the class action re-Marks an analyzed target; at most 3 Marks (the oldest drops)', () => {
    const f = fightWith([cls('ccec_ballistician', { weapon: 'long_rifle' })], [{ at: 'F6' }, { at: 'F4' }, { at: 'F8' }, { at: 'G5' }]);
    const pc = f.turn(at(f.pc, '2,5')); pc.ap = 9; ['5,5', '5,3', '5,7', '6,4'].forEach((k, i) => at(f.foes[i], k));
    for (const t of f.foes) { f.pc.ap = 9; f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'ccec_ballistician.case_file', targetId: t.id } as any); }
    expect(f.foes.filter((t) => condOn(t, 'marked')).length).toBe(3);
    expect(condOn(f.foes[0], 'marked')).toBe(false);
    f.pc.ap = 9; f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'ccec_ballistician.case_file', targetId: f.foes[0].id } as any);
    expect(condOn(f.foes[0], 'marked')).toBe(true); expect(f.pc.ap).toBe(8);
  });
  it('Case File in the story: a passed Analysis check files the NPC, who starts the next fight Marked', () => {
    const s = storyWith([cls('ccec_ballistician')]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'ccec_ballistician.case_file', actionId: 'case_file_story', npc: 'Vex' } as any);
    expect((s.g.story.rulings || []).some((r: any) => /Case File on Vex/.test(r.text))).toBe(true);
    emitStory(s.g, 'check_result', { c: s.g.characters[c.id], ck: { skills: ['analysis'], roll: { ok: true } }, g: s.g });
    expect(s.g.characters[c.id].state!['class:ccec_ballistician.case_file'].files).toContain('Vex');
    s.act({ type: 'narrator/turn', turn: { narration: 'Vex draws.', combat: { name: 'Vex', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Vex', tier: 'soldier', weapon: 'service_pistol', at: 'O6' }] } } } as any);
    const vex = s.g.combat!.units.find((u) => u.name === 'Vex')!;
    expect(condOn(vex, 'marked')).toBe(true);
  });
  it('Weak Point: an Aimed shot at a Marked target ignores armour and crits on 18; armour is back after', () => {
    const f = fightWith([cls('ccec_ballistician', { weapon: 'long_rifle' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); const foe = tough(at(f.foe, '6,5')); foe.armour = 500; pc.ap = 9;
    withGame(f.g, () => applyCond(f.cb, f.g.rng, pc, foe, 'marked', undefined, undefined, { skipSave: true }));
    seed(f, 18);
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: foe.id, mode: 'aimed' } as any);
    expect(logHas(f.cb, /CRITICAL/)).toBe(true); expect(f.foe.hp).toBeLessThan(999 - 50); expect(f.foe.armour).toBe(500);
    // not Marked: armour holds and 18 isn't a crit
    const g = fightWith([cls('ccec_ballistician', { weapon: 'long_rifle' })], [{ at: 'O10' }]);
    const p2 = g.turn(at(g.pc, '2,5')); const f2 = tough(at(g.foe, '6,5')); f2.armour = 500; seed(g, 18);
    g.act({ type: 'combat/attack', unitId: p2.id, targetId: f2.id, mode: 'aimed' } as any);
    expect(g.foe.hp).toBe(998); expect(logHas(g.cb, /CRITICAL/)).toBe(false);
  });
  it('One Shot: triple damage on a Marked target if you haven\'t moved; double on a Boss; refused after moving', () => {
    const shot = (tier: string, moved = false) => {
      const f = fightWith([cls('ccec_ballistician', { weapon: 'long_rifle' })], [{ at: 'O10', tier }]);
      const pc = f.turn(at(f.pc, '2,5')); const foe = tough(at(f.foe, '6,5')); pc.ap = 9; pc.moved = moved;
      withGame(f.g, () => applyCond(f.cb, f.g.rng, pc, foe, 'marked', undefined, undefined, { skipSave: true }));
      seed(f, 10);
      f.act({ type: 'combat/perk', unitId: pc.id, id: 'ccec_ballistician.one_shot', targetId: foe.id } as any);
      return 999 - f.foe.hp;
    };
    const plain = (() => { const f = fightWith([cls('ccec_ballistician', { weapon: 'long_rifle' })], [{ at: 'O10' }]); const pc = f.turn(at(f.pc, '2,5')); const foe = tough(at(f.foe, '6,5')); seed(f, 10); f.act({ type: 'combat/attack', unitId: pc.id, targetId: foe.id, mode: 'aimed' } as any); return 999 - f.foe.hp; })();
    const triple = shot('soldier'), boss = shot('boss');
    expect(triple).toBeGreaterThanOrEqual(3 * plain - 2); expect(triple).toBeLessThanOrEqual(3 * plain + 2);
    expect(boss).toBeGreaterThanOrEqual(2 * plain - 2); expect(boss).toBeLessThan(triple);
    expect(() => shot('soldier', true)).toThrow(/moved/);
  });
});

// ============================================================ Banner Dancer
describe('Banner Dancer', () => {
  it('Banner Thread: no torso armour gives +2 Defense and +1 Movement; an inner torso plate takes it away', () => {
    const base = fightWith([{}], [{ at: 'O10' }]).pc, bare = fightWith([cls('banner_dancer')], [{ at: 'O10' }]);
    const c = charOf(bare.g, bare.pc);
    expect(c.armourClass || 0).toBeGreaterThan(0); // the fixture wears armour: the bare case is pinned below with it stripped (truth pass 3: the two expects here never ran)
    const s = storyWith([cls('banner_dancer')]), ch = s.g.characters[s.chars[0].id];
    ch.armourClass = 0; ch.worn = {}; const def0 = withGame(s.g, () => defense(ch));
    ch.worn = { inner_torso: 'trauma_plate' }; const def1 = withGame(s.g, () => defense(ch));
    expect(def0 - def1).toBe(2);
  });
  it('Rally Banner: plant it; an ally starting a turn within 2 gets a 10 × Healing given shield, not stacked', () => {
    const f = fightWith([cls('banner_dancer'), {}], [{ at: 'O10' }]);
    const [d, a] = f.pcs; at(d, '2,5'); at(a, '3,6'); f.turn(d); f.pcs[0].ap = 6;
    f.act({ type: 'combat/perk', unitId: d.id, id: 'banner_dancer.rally_banner', tile: '3,5' } as any);
    expect(objectsOf(f.cb).some((o) => o.name === 'Rally banner' && o.pos === '3,5')).toBe(true);
    const want = Math.floor(Math.round(10 * healingMult(charOf(f.g, f.pcs[0]))) * (f.pcs[1].healRecv || 1));
    const ally = f.turn(f.pcs[1]); expect(ally.shield).toBe(want);
    f.turn(f.pcs[1]); expect(f.pcs[1].shield).toBe(want);
    // the dancer more than 3 tiles from the banner: nothing
    f.pcs[1].shield = 0; at(f.pcs[0], '8,8'); f.turn(f.pcs[1]); expect(f.pcs[1].shield || 0).toBe(0);
  });
  it('Sweep: 3 AP and 3 Momentum, walks 3 tiles, strikes each enemy passed, heals each ally passed; no Momentum from its own hits', () => {
    const f = fightWith([cls('banner_dancer'), {}], [{ at: 'O10' }, { at: 'O2' }]);
    const [d, a] = f.pcs; at(d, '2,5'); at(a, '4,6'); a.hp = Math.max(1, a.maxHp - 30); tough(at(f.foes[0], '5,4'), 0); at(f.foes[1], '14,1');
    f.turn(d); f.pcs[0].res = { ...(f.pcs[0].res || {}), momentum: 3 }; f.pcs[0].ap = 6;
    const hpA = f.pcs[1].hp;
    seed(f, 12);
    f.act({ type: 'combat/perk', unitId: d.id, id: 'banner_dancer.sweep', tile: '5,5' } as any);
    expect(f.pcs[0].pos).toBe('5,5'); expect(f.pcs[0].ap).toBe(3);
    expect(f.pcs[0].res!.momentum).toBe(0);
    expect(logHas(f.cb, /strikes Foe 1/)).toBe(true);
    expect(f.pcs[1].hp).toBeGreaterThan(hpA); expect(logHas(f.cb, /\(Sweep\)/)).toBe(true);
  });
  it('Sweep: refused without 3 Momentum', () => {
    const f = fightWith([cls('banner_dancer')], [{ at: 'O10' }]);
    const d = f.turn(at(f.pc, '2,5'));
    expect(() => f.act({ type: 'combat/perk', unitId: d.id, id: 'banner_dancer.sweep', tile: '4,5' } as any)).toThrow(/Momentum/);
  });
});

// ============================================================ RTC Contractor
describe('RTC Contractor', () => {
  it('Supply Drop: 100 credits; the crate lands at the next turn; take a magazine from it (1 AP)', () => {
    const f = fightWith([cls('rtc_contractor', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); pc.ap = 6;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'rtc_contractor.supply_drop', tile: '3,5' } as any);
    expect(charOf(f.g, f.pc).state!.credits).toBe(900); expect(f.pc.ap).toBe(4);
    f.turn(f.pc);
    expect(objectsOf(f.cb).some((o) => o.name === 'Company supply crate' && o.pos === '3,5')).toBe(true);
    const mags = (f.pc.mags || []).length; f.pc.ap = 6;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'rtc_contractor.supply_drop', actionId: 'take_from_crate', choice: 'magazine' } as any);
    expect((f.pc.mags || []).length).toBe(mags + 1); expect(f.pc.ap).toBe(5);
    const stims = charOf(f.g, f.pc).stims;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'rtc_contractor.supply_drop', actionId: 'take_from_crate', choice: 'supply' } as any);
    expect(charOf(f.g, f.pc).stims).toBe(stims + 1);
    expect(f.cb.notes!.some((n) => /signal/.test(n))).toBe(true);
  });
  it('Supply Drop in the story: 100 credits, a stim now, a ruling for the signal', () => {
    const s = storyWith([cls('rtc_contractor')]); const c = s.chars[0], st0 = s.g.characters[c.id].stims;
    s.act({ type: 'story/perk', charId: c.id, id: 'rtc_contractor.supply_drop', actionId: 'supply_drop_story' } as any);
    expect(s.g.characters[c.id].stims).toBe(st0 + 1); expect(s.g.characters[c.id].state!.credits).toBe(900);
    expect((s.g.story.rulings || []).some((r: any) => /Supply Drop/.test(r.text))).toBe(true);
  });
  it('Strike Call: 300 credits; 50 Physical at your next turn to a 3x3; an edge unit with a reaction dives clear', () => {
    const f = fightWith([cls('rtc_contractor', { weapon: 'service_pistol' })], [{ at: 'O10' }, { at: 'O2' }]);
    const pc = f.turn(at(f.pc, '2,5')); pc.ap = 6;
    const [mid, edge] = f.foes; tough(at(mid, '8,5')); tough(at(edge, '9,5'));
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'rtc_contractor.strike_call', tile: '8,5' } as any);
    expect(charOf(f.g, f.pc).state!.credits).toBe(700);
    f.turn(f.pc);
    expect(f.foes[0].hp).toBe(999 - 50); expect(f.foes[1].hp).toBe(999); expect(Math.abs(+f.foes[1].pos.split(',')[0] - 8) > 1 || Math.abs(+f.foes[1].pos.split(',')[1] - 5) > 1).toBe(true);
  });
  it('Extraction: 500 credits; after 2 rounds the flyer lifts out everyone near it and the fight ends as an extraction', () => {
    const f = fightWith([cls('rtc_contractor', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); pc.ap = 6;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'rtc_contractor.extraction', tile: '2,6' } as any);
    expect(charOf(f.g, f.pc).state!.credits).toBe(500);
    f.pc.ps!['class:rtc_contractor.extraction'].lz.round = f.cb.round + 1;
    for (let i = 0; i < 4 && f.g.phase === 'combat'; i++) f.act({ type: 'combat/end-turn', unitId: f.cb.order[f.cb.turn] } as any);
    expect(f.g.phase).toBe('story');
    expect((f.g.combat!.notes || []).some((n) => /EXTRACTED: Tester 1/.test(n))).toBe(true);
  });
});

// ============================================================ Blade Scribe
describe('Blade Scribe', () => {
  // Sigil 1.4: the glyph goes on your own tile (more in sigil14-classes-j.test.ts).
  it('Sword Form: a melee attack draws a glyph on your own tile for no AP (charge and Flux paid), even on a miss', () => {
    const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'condense']); const foe = tough(at(f.foe, '3,5'), 99); pc.ap = 6;
    seed(f, 5);
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: foe.id, mode: 'melee', mods: [mk('blade_scribe.sword_form', 'word_fire')] } as any);
    expect(f.pc.ap).toBe(4); expect(f.pc.mg!.charge).toBe(8); expect(f.pc.mg!.flux).toBe(1);
    expect((f.cb.glyphs || []).some((g) => g.pos === '2,5' && g.word === 'fire')).toBe(true);
  });
  it('Edge Sigil: a damage word drawn through Sword Form adds its damage to the hit as Elemental', () => {
    const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['shock']); const foe = tough(at(f.foe, '3,5')); pc.ap = 6;
    seed(f, 10);
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: foe.id, mode: 'melee', mods: [mk('blade_scribe.sword_form', 'word_shock')] } as any);
    expect(logHas(f.cb, /Edge Sigil: SHOCK runs down the blade · 30 damage/)).toBe(true);
  });
  // Sigil 1.4: the words resolve as Touch on the last target (more in sigil14-classes-j.test.ts).
  it('Three-Cut Script: 6 AP, three cuts, the words resolve as one spell on the last target', () => {
    const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'condense', 'push']); const foe = tough(at(f.foe, '3,5')); pc.ap = 9;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'blade_scribe.three_cut_script', targetId: foe.id, choice: 'fire,condense,push' } as any);
    expect(f.pc.ap).toBe(3);
    expect(f.cb.log.filter((l) => /strikes Foe 1/.test(l)).length).toBe(3);
    expect(logHas(f.cb, /The script resolves on Foe 1 \(3 charge\)/)).toBe(true);
    expect(f.pc.mg!.charge).toBe(10 - 4 - 3); expect(f.pc.mg!.flux).toBe(3);
    expect((f.cb.glyphs || []).length).toBe(0);
  });
});

// ============================================================ Siege Engineer
describe('Siege Engineer', () => {
  it('Deploy Cover: a 40 HP half-cover barricade; a STAY glyph makes it full; three at most', () => {
    const f = fightWith([cls('siege_engineer')], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); pc.ap = 9;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'siege_engineer.deploy_cover', tile: '3,5' } as any);
    const b = objectsOf(f.cb).find((o) => o.name === 'Portable barricade')!;
    expect(b.kind).toBe('crate'); expect(b.hp).toBe(40);
    f.cb.glyphs = [{ id: 'g1', word: 'stay', pos: '3,5', by: f.pc.id, side: 'pc', left: 2, who: 'x' }];
    withGame(f.g, () => emit(f.cb, 'turn_end', { u: f.pc, cb: f.cb, rng: f.g.rng }));
    expect(objectsOf(f.cb).find((o) => o.name === 'Portable barricade')!.kind).toBe('barricade');
    for (const t of ['3,4', '3,6', '1,5']) { f.pc.ap = 9; f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'siege_engineer.deploy_cover', tile: t } as any); }
    expect(objectsOf(f.cb).filter((o) => o.name === 'Portable barricade').length).toBe(3);
  });
  it('Sentry Turret: 2 charge; at the end of your turn it fires at the nearest enemy; one at a time', () => {
    const f = fightWith([cls('siege_engineer')], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, []); pc.ap = 9; tough(at(f.foe, '6,5'));
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'siege_engineer.sentry_turret', tile: '3,5' } as any);
    expect(f.pc.mg!.charge).toBe(8); expect(f.cb.units.some((u) => u.name === 'Sentry turret' && u.pos === '3,5')).toBe(true);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'siege_engineer.sentry_turret', tile: '3,4' } as any)).toThrow(/still up/);
    withGame(f.g, () => emit(f.cb, 'turn_end', { u: f.pc, cb: f.cb, rng: f.g.rng }));
    expect(logHas(f.cb, /The sentry turret fires at Foe 1/)).toBe(true);
  });
  it('Bulwark Line: cover within 3 with an ally beside it is full cover +20 HP until your next turn', () => {
    const f = fightWith([cls('siege_engineer')], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '4,4')); pc.ap = 9;
    const crate = objectsOf(f.cb).find((o) => o.pos === '5,4')!; const hp0 = crate.hp!;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'siege_engineer.bulwark_line' } as any);
    let c = objectsOf(f.cb).find((o) => o.pos === '5,4')!;
    expect(c.kind).toBe('barricade'); expect(c.hp).toBe(hp0 + 20);
    expect(objectsOf(f.cb).find((o) => o.pos === '8,9')!.kind).toBe('crate'); // no ally beside it
    f.turn(f.pc); c = objectsOf(f.cb).find((o) => o.pos === '5,4')!;
    expect(c.kind).toBe('crate'); expect(c.hp).toBe(hp0);
  });
});

// ============================================================ Spellslinger
describe('Spellslinger', () => {
  it('Inscribed Rounds (story): 1 charge a round; in a fight the next hit carries the word', () => {
    const s = storyWith([cls('spellslinger', { weapon: 'spellslinger_pistol' })]); const c = s.g.characters[s.chars[0].id];
    c.sigils = ['fire']; c.evoCharge = 10;
    s.act({ type: 'story/perk', charId: c.id, id: 'spellslinger.inscribed_rounds', choice: 'fire', text: '3' } as any);
    expect(s.g.characters[c.id].state!['class:spellslinger.inscribed_rounds']).toEqual({ word: 'fire', n: 3 });
    expect(s.g.characters[c.id].evoCharge).toBe(7);
    const f = fightWith([cls('spellslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    (charOf(f.g, f.pc).state ||= {})['class:spellslinger.inscribed_rounds'] = { word: 'fire', n: 2 };
    const pc = f.turn(at(f.pc, '2,5')); tough(at(f.foe, '5,5')); seed(f, 10);
    const mana = f.cb.mana ?? 15;
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'shot' } as any);
    expect(logHas(f.cb, /inscribed FIRE round bites · 15 damage/)).toBe(true);
    expect(charOf(f.g, f.pc).state!['class:spellslinger.inscribed_rounds'].n).toBe(1);
    expect(f.cb.mana).toBeGreaterThan(mana);
  });
  it('Spell Magazine: stored out of combat; loaded in a fight, its first hit fires the spell (auto-hit)', () => {
    const s = storyWith([cls('spellslinger', { weapon: 'spellslinger_pistol' })]); const c = s.g.characters[s.chars[0].id];
    c.sigils = ['fire', 'condense']; c.evoCharge = 10;
    s.act({ type: 'story/perk', charId: c.id, id: 'spellslinger.spell_magazine', actionId: 'spell_magazine', choice: 'fire,condense' } as any);
    const sm = s.g.characters[c.id].state!['class:spellslinger.spell_magazine'];
    expect(sm.words).toEqual(['fire', 'condense']); expect(s.g.characters[c.id].evoCharge).toBe(10 - 3 - 2);
    const f = fightWith([cls('spellslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    (charOf(f.g, f.pc).state ||= {})['class:spellslinger.spell_magazine'] = { words: ['fire', 'condense'], rest: (f.g.sessionN ?? 1) + '.' + (f.g.restN ?? 0) };
    const pc = f.turn(at(f.pc, '2,5')); tough(at(f.foe, '5,5')); pc.ap = 6; pc.ammo = 3;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'spellslinger.spell_magazine', actionId: 'load_spell_magazine' } as any);
    expect(f.pc.ammo).toBe(12); expect(f.pc.ap).toBe(4);
    // Rules 1.9 (item 679): the old magazine drops into the pile on the tile, as a speed reload's does.
    expect(f.cb.objects!.find((o) => o.kind === 'pile' && o.pos === '2,5')!.items!.map((e) => e.name)).toEqual(['Service pistol magazine 3/12']);
    seed(f, 10);
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any);
    // Sigil 1.4: as Touch on the target, no roll; CONDENSE's core ×1.5 (30 → 45)
    expect(logHas(f.cb, /spell magazine fires FIRE · CONDENSE into Foe 1 · FIRE catches Foe 1 · 45 damage/)).toBe(true);
  });
  it('Ricochet Glyph: a miss glances to another enemy within 4 tiles at −2, once a turn, no extra ammo', () => {
    const f = fightWith([cls('spellslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }, { at: 'O2' }]);
    const pc = f.turn(at(f.pc, '2,5')); tough(at(f.foes[0], '6,5'), 99); tough(at(f.foes[1], '7,6'), 0); pc.ammo = 12;
    seed(f, 5);
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foes[0].id, mode: 'shot' } as any);
    expect(logHas(f.cb, /glances off toward Foe 2/)).toBe(true);
    expect(f.foes[1].hp).toBeLessThan(999); expect(f.pc.ammo).toBe(11);
    const n = f.cb.log.length; seed(f, 5);
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foes[0].id, mode: 'shot' } as any);
    expect(f.cb.log.slice(n).some((l) => /glances/.test(l))).toBe(false);
  });
});

// ============================================================ Storm Hand
describe('Storm Hand', () => {
  it('Gauntlet Infusion: pick the element at rest; melee hits add +10 of it for 5 MP', () => {
    const s = storyWith([cls('storm_hand')]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'storm_hand.gauntlet_infusion', choice: 'shock' } as any);
    expect(s.g.characters[c.id].state!['class:storm_hand.gauntlet_infusion'].element).toBe('shock');
    const f = fightWith([cls('storm_hand', { weapon: 'sabre' })], [{ at: 'O10' }]);
    (charOf(f.g, f.pc).state ||= {})['class:storm_hand.gauntlet_infusion'] = { element: 'shock' };
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, [], { evoker: false, emanator: true, mp: 20, mpMax: 40 }); tough(at(f.foe, '3,5')); seed(f, 10);
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'melee' } as any);
    expect(logHas(f.cb, /Infusion: SHOCK \(5 MP\) · 10 damage/)).toBe(true); expect(f.pc.mg!.mp).toBe(15);
  });
  it('Charged by Battle (rules 1.5): each melee hit gives 1 Charge (max 3), not a kill', () => {
    const f = fightWith([cls('storm_hand', { weapon: 'sabre' })], [{ at: 'O10' }, { at: 'O2' }]);
    const pc = f.turn(at(f.pc, '2,5')); const foe = tough(at(f.foes[0], '3,5')); seed(f, 10);
    for (let i = 0; i < 4; i++) { f.unit(pc.id).ap = 9; f.act({ type: 'combat/attack', unitId: pc.id, targetId: foe.id, mode: 'melee' } as any); }
    expect(f.pc.res!.charges).toBe(3);
  });
  it('Discharge: on a melee hit, spend every Charge: 20 per Charge to each enemy next to the target', () => {
    const f = fightWith([cls('storm_hand', { weapon: 'sabre' })], [{ at: 'O10' }, { at: 'O2' }]);
    const pc = f.turn(at(f.pc, '2,5')); const [a, b] = f.foes; tough(at(a, '3,5')); tough(at(b, '4,5')); pc.res = { ...(pc.res || {}), charges: 2 };
    seed(f, 10);
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: a.id, mode: 'melee', mods: [mk('storm_hand.discharge', 'discharge')] } as any);
    expect(f.pc.res!.charges).toBe(0); expect(f.foes[1].hp).toBe(999 - 40);
    expect(logHas(f.cb, /discharges 2 Charge/)).toBe(true);
  });
});

// ============================================================ Adamantile Knight
describe('Adamantile Knight', () => {
  it('Brace (granted) and Bulwark of Will: 2 AP, Guard 1 + Durability mod, +2 Defense, a 20 × Healing given shield; moving ends Braced', () => {
    const f = fightWith([cls('adamantile_knight', { skills: { durability: 3 } })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); const def = pc.def; pc.ap = 6;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'adamantile_knight.bulwark_of_will', actionId: 'brace' } as any);
    expect(f.pc.ap).toBe(4); expect(f.pc.res!.guard).toBe(3); expect(f.pc.def).toBe(def + 2);
    const c = charOf(f.g, f.pc), want = Math.floor(Math.floor(20 * healingMult(c)) * (f.pc.healRecv || 1));
    expect(f.pc.shield).toBe(want);
    f.act({ type: 'combat/move', unitId: f.pc.id, to: '3,5' } as any);
    expect(f.pc.def).toBe(def);
  });
  it('Reactive Plate (granted) and Adamantile Plate: Guard cuts 10 each, and the shed plate shields an adjacent ally', () => {
    const f = fightWith([cls('adamantile_knight'), {}], [{ at: 'O10' }]);
    const [k, a] = f.pcs; at(k, '2,5'); at(a, '2,6'); k.res = { ...(k.res || {}), guard: 2 }; const hp = k.hp, foe = f.foe;
    withGame(f.g, () => applyDamage(f.cb, k, 25, { by: foe, type: 'weapon', shield: true, credit: 'all' }));
    expect(f.pcs[0].hp).toBe(hp - 5); expect(f.pcs[0].res!.guard).toBe(0);
    expect(f.pcs[1].shield).toBe(Math.floor(20 * (f.pcs[1].healRecv || 1)));
  });
  it('Interpose (granted): an adjacent ally\'s hit is taken by the Knight for 1 Guard and the reaction', () => {
    const f = fightWith([cls('adamantile_knight'), {}], [{ at: 'O10' }]);
    const [k, a] = f.pcs; at(k, '2,5'); at(a, '2,6'); k.res = { ...(k.res || {}), guard: 3 }; const hpA = a.hp, hpK = k.hp, foe = f.foe;
    withGame(f.g, () => applyDamage(f.cb, a, 30, { by: foe, type: 'weapon', shield: true, credit: 'all' }));
    expect(f.pcs[1].hp).toBe(hpA); expect(f.pcs[0].res!.guard).toBe(0);
    expect(f.pcs[0].hp).toBe(hpK - 10); // 30 on the Knight, 2 Guard cut 20
    expect(logHas(f.cb, /interposes for/)).toBe(true);
  });
  it('Unbroken: the first drop to 0 leaves 1 HP and +3 Guard; the second drops', () => {
    const f = fightWith([cls('adamantile_knight')], [{ at: 'O10' }]);
    const k = at(f.pc, '2,5'), foe = f.foe;
    withGame(f.g, () => applyDamage(f.cb, k, 9999, { by: foe, type: 'trap', shield: false, credit: 'all' }));
    expect(f.pc.hp).toBe(1); expect(f.pc.res!.guard).toBe(3); expect(f.pc.downed).toBe(false);
    f.pc.res!.guard = 0;
    withGame(f.g, () => applyDamage(f.cb, f.pc, 9999, { by: foe, type: 'trap', shield: false, credit: 'all' }));
    expect(f.pc.downed).toBe(true);
  });
});

void apply; void refOf; void endTurn;
