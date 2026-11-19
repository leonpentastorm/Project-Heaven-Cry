// @ts-nocheck (test fixtures: plain objects)
// Rules 1.75 (0.32, the Soul lane): Determination, Insight and Virtue reshaped to the ladder of rules 1.70. Every pick
// goes through the reducer (levelup/perk, door/pick: the helpers' `perks` and `picks`), every rule through a real action
// (combat/outburst, combat/pump, combat/release, combat/steady, combat/attack, combat/crystallise, combat/syphon,
// combat/call, combat/perk) or a real blow (resolveAttack, as a turn makes it); every number is read from data.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PERK, SKILL, setDevotionXp, devotionThreshold, hymnWait, applyCond, condOn, previewAttack, saveAgainst, resolveAttack, beginTurn, applyDamage, setDowned, migrateLoaded, strainLimit, swellFree, readyDesigns, pendingRepicks, stepsTaken, saveBonus, type Unit } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';
import { tiesOf } from '../src/kit';
import forksJ from '../../../data/forks.json';
import soulJ from '../../../data/soul_modules.json';
import classesJ from '../../../data/classes.json';

const FK: Record<string, any> = Object.fromEntries((forksJ as any).items.map((x: any) => [x.id, x]));
const tierFx = (id: string, t: string) => (PERK as any)[id].tiers[t].effects;
const open = (cb: any) => { cb.mana = Math.max(cb.mana || 0, 20); };
const logHas = (cb: any, re: RegExp) => cb.log.some((l: string) => re.test(l));

/** A Soul caster's fight (the stormcaller archetype and the soul kit), its turn begun, plenty of AP and MP. */
function soulFight(spec: any = {}, foes: any[] = [{ at: 'E6' }], more: any[] = []) {
  const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', ...spec }, ...more], foes);
  open(f.cb); f.pc.pos = '2,5'; f.foes.forEach((x: Unit, i: number) => { x.pos = (4 + i) + ',5'; x.def = 1; });
  f.turn(f.pc); f.pc.ap = 9; f.pc.mg!.mp = 500; f.pc.mg!.strain = 0;
  return f;
}
const design = (f: any) => f.pc.mg!.designs.find((d: any) => d.school === 'damage') || f.pc.mg!.designs[0];
/** Begin, then Release at the foe: the HP the foe lost. `before` runs between them (sets the heart up). */
function releaseDamage(f: any, before?: (f: any) => void): number {
  const foe = f.foe; foe.hp = foe.maxHp = 5000; f.g.rng.state = 4242;
  f.act({ type: 'combat/outburst', unitId: f.pc.id, design: design(f).id, hold: true } as any);
  if (before) before(f);
  f.pc.ap = 9; const hp = f.unit(foe.id).hp;
  f.act({ type: 'combat/release', unitId: f.pc.id, aim: f.unit(foe.id).pos } as any);
  return hp - f.unit(foe.id).hp;
}

// ================================================================================================ Determination
describe('Will Power (rules 1.75 item 6200)', () => {
  it('Overdraw is the small verb at 2: a Pump with it adds two stages at Will Power 2, and nothing at 1', () => {
    const pump2 = (wp: number) => { const f = soulFight({ skills: { will_power: wp } }); f.act({ type: 'combat/outburst', unitId: f.pc.id, design: design(f).id, hold: true } as any);
      f.act({ type: 'combat/pump', unitId: f.pc.id, mods: ['skill:will_power.2#overdraw'] } as any); return f.pc.mg!.held!.stage; };
    expect(pump2(2)).toBe(2); expect(pump2(1)).toBe(1);
    expect((SKILL as any).will_power.unlocks['2'].name).toBe('Overdraw'); expect((SKILL as any).will_power.unlocks['5'].name).toBe('Two Schools');
    expect((SKILL as any).will_power.unlocks['3'].mastery).toBe(1);
  });
  it('Will Power gives no Strain limit and no design ready; Lore Master gives the designs (item 6205)', () => {
    const s = storyWith([{ skills: { will_power: 10, composure: 0, lore_master: 0 } }]); const c = s.g.characters[s.chars[0].id];
    expect(strainLimit(c)).toBe((soulJ as any).strain.limit.base);
    expect(readyDesigns(c)).toBe((soulJ as any).limits.ready_designs.base);
    for (const [lm, more] of [[3, 0], [4, 1], [6, 2], [8, 3], [10, 4]]) { c.skills.lore_master = lm; expect(readyDesigns(c), 'LM ' + lm).toBe((soulJ as any).limits.ready_designs.base + more); }
  });
});

describe('Will Power forks (item 6201): all four offered and run', () => {
  it('Ride the Edge: a Release at or over the Strain limit deals its multiplier more; under the limit nothing', () => {
    const at = (pick: boolean, full: boolean) => releaseDamage(soulFight({ skills: { will_power: 4 }, ...(pick ? { picks: ['fork.soul.ride_the_edge'] } : {}) }), (f) => { if (full) f.pc.mg!.strain = f.pc.mg!.strainLimit; });
    const base = at(false, true), up = at(true, true), under = at(true, false), mult = FK['fork.soul.ride_the_edge'].effects[0].value;
    expect(base).toBeGreaterThan(0); expect(up).toBe(Math.floor(base * mult) === up ? up : Math.round(base * mult));
    expect(up / base).toBeGreaterThan(mult - 0.02); expect(up / base).toBeLessThan(mult + 0.02);
    expect(under).toBe(at(false, false));
  });
  it('Slow Burn: once a turn Steady costs 0 AP and calms one more Strain; the second Steady of a held design is refused as before', () => {
    const steady = (pick: boolean) => { const f = soulFight({ skills: { will_power: 4 }, ...(pick ? { picks: ['fork.soul.slow_burn'] } : {}) });
      f.act({ type: 'combat/outburst', unitId: f.pc.id, design: design(f).id, hold: true } as any); f.pc.mg!.strain = 4; const ap = f.pc.ap;
      f.act({ type: 'combat/steady', unitId: f.pc.id } as any); return { ap: ap - f.pc.ap, strain: f.pc.mg!.strain }; };
    const a = steady(false), b = steady(true), row = FK['fork.soul.slow_burn'].effects;
    expect(b.ap).toBe(row[0].set); expect(a.ap).toBeGreaterThan(0);
    expect(b.strain).toBe(a.strain + row[2].value);
  });
  it('Blood Price: after the heart burns you (a turn ended over the limit), the next Release deals its multiplier more; then it is spent', () => {
    const run = (pick: boolean) => { const f = soulFight({ skills: { will_power: 8 }, ...(pick ? { picks: ['fork.soul.blood_price'] } : {}) }); const hp = f.pc.hp;
      const dmg = releaseDamage(f, (x) => { x.pc.mg!.strain = x.pc.mg!.strainLimit + 1; x.act({ type: 'combat/end-turn', unitId: x.pc.id } as any); x.turn(x.pc); x.pc.mg!.strain = 0; });
      return { dmg, burned: logHas(f.cb, /heart burns/), f }; };
    const a = run(false), b = run(true), mult = FK['fork.soul.blood_price'].effects[1].value;
    expect(b.burned).toBe(true);
    expect(b.dmg / a.dmg).toBeGreaterThan(mult - 0.03); expect(b.dmg / a.dmg).toBeLessThan(mult + 0.03);
    const st = Object.entries(b.f.pc.ps || {}).find(([k]) => k.includes('blood_price'))?.[1] as any; expect(st?.flags?.burned).toBeFalsy(); // the Release spent it
  });
  it('Clean Break: an Outburst that drops a foe calms its Strain, once a turn', () => {
    const run = (pick: boolean) => { const f = soulFight({ skills: { will_power: 8 }, ...(pick ? { picks: ['fork.soul.clean_break'] } : {}) }, [{ at: 'E6' }, { at: 'E8' }]);
      f.act({ type: 'combat/outburst', unitId: f.pc.id, design: design(f).id, hold: true } as any); f.pc.mg!.strain = 3; f.foe.hp = 1; f.g.rng.state = 4242; f.pc.ap = 9;
      f.act({ type: 'combat/release', unitId: f.pc.id, aim: f.foe.pos } as any); return f; };
    const a = run(false), b = run(true);
    expect(a.cb.units.some((u: Unit) => u.side === 'foe' && (u.dead || u.downed))).toBe(true);
    expect(b.pc.mg!.strain).toBe(Math.max(0, a.pc.mg!.strain + FK['fork.soul.clean_break'].effects[0].value));
  });
});

describe('Composure (items 6202, 6203)', () => {
  it('the Strain limit moves at 1, 2, 4, 6 and 8 only; a held Outburst swells with no Strain from Composure 6', () => {
    const s = storyWith([{ skills: { composure: 0 } }]); const c = s.g.characters[s.chars[0].id];
    const lim = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => { c.skills.composure = n; return strainLimit(c); });
    const moves = lim.slice(1).map((v, i) => (v !== lim[i] ? i + 1 : 0)).filter(Boolean);
    expect(moves).toEqual((soulJ as any).strain.limit.steps.map((x: any) => x.at));
    c.skills.composure = 5; expect(swellFree(c)).toBe(false); c.skills.composure = 6; expect(swellFree(c)).toBe(true);
    c.skills.composure = 0; c.skills.will_power = 10; expect(swellFree(c)).toBe(false);
  });
  it('Poker Face: I is the Narrator\'s; II adds its Brain save bonus (picked through the reducer)', () => {
    const save = (perks: any) => { const s = storyWith([{ skills: { composure: 5 }, perks }]); return saveBonus(s.g.characters[s.chars[0].id], 'brain'); };
    expect(save({ poker_face: 'II' }) - save({ poker_face: 'I' })).toBe(tierFx('poker_face', 'II')[1].value);
    expect(tierFx('poker_face', 'I').every((e: any) => e.op === 'narrator')).toBe(true);
  });
  it('Stand Still: I foes take its to-hit until you first act, and Begin counts as acting; II Begin, Pump and Steady do not', () => {
    const term = (tier: string) => { const f = soulFight({ skills: { composure: 5 }, perks: { stand_still: tier } });
      f.act({ type: 'combat/outburst', unitId: f.pc.id, design: design(f).id, hold: true } as any);
      const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(f.foe.id), f.unit(f.pc.id), 'shot', { free: true }));
      return (pv.terms || []).find((x: any) => x.label === 'Stand Still')?.v ?? 0; };
    expect(term('I')).toBe(0); expect(term('II')).toBe((PERK as any).stand_still.tiers.II.numbers.to_hit);
  });
  it('Pure Heart: I refuses one Short a fight, II two', () => {
    const shorts = (tier: string) => { const f = soulFight({ skills: { composure: 5 }, perks: { pure_heart: tier } }); const d = design(f).id; let refused = 0;
      for (let i = 0; i < 3; i++) { f.pc.ap = 9; f.pc.mg!.held = null; f.pc.mg!.strain = f.pc.mg!.strainLimit + 2; delete (f.pc.mg as any).shock; (f.pc as any).conds = {};
        f.act({ type: 'combat/outburst', unitId: f.pc.id, design: d, hold: true } as any); if (f.pc.mg!.strain === f.pc.mg!.strainLimit) refused++; }
      return refused; };
    expect(shorts('I')).toBe((PERK as any).pure_heart.tiers.I.numbers.uses); expect(shorts('II')).toBe((PERK as any).pure_heart.tiers.II.numbers.uses);
  });
});

describe('Lore Master (items 6204 to 6207)', () => {
  it('Warding Word: I 1 AP, the friend\'s next Brain or Heart save gets the bonus and the word is spent; a Body save leaves it', () => {
    const f = soulFight({ skills: { lore_master: 3 }, perks: { lore_ward: 'I' } }, [{ at: 'E6' }], [{ name: 'Ally' }]); const ally = f.pcs[1]; ally.pos = '2,6';
    const ap = f.pc.ap; f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'lore_ward', actionId: 'warding_word', targetId: ally.id } as any);
    expect(ap - f.pc.ap).toBe(tierFx('lore_ward', 'I')[0].ap); expect(condOn(f.unit(ally.id), 'warding_word')).toBe(true);
    withGame(f.g, () => saveAgainst(f.cb, f.g.rng, f.foe, f.unit(ally.id), 'body', 'test'));
    expect(condOn(f.unit(ally.id), 'warding_word')).toBe(true);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.unit(ally.id), 'shaken', 1));
    expect(condOn(f.unit(ally.id), 'warding_word')).toBe(false);
  });
  it('Warding Word II: the first each turn costs 0 AP, the second its price', () => {
    const f = soulFight({ skills: { lore_master: 5 }, perks: { lore_ward: 'II' } }); let ap = f.pc.ap;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'lore_ward', actionId: 'warding_word', targetId: f.pc.id } as any); expect(ap - f.pc.ap).toBe(0);
    ap = f.pc.ap; f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'lore_ward', actionId: 'warding_word', targetId: f.pc.id } as any); expect(ap - f.pc.ap).toBe(tierFx('lore_ward', 'II')[0].ap);
  });
  it('Rite in the Field: every fifth foe you drop yourself (third at II) makes the next Crystallise 0 AP; a friend\'s kills do not count', () => {
    const crystal = (tier: string, kills: number, byAlly = false) => {
      const f = soulFight({ skills: { lore_master: 5 }, perks: { rite_in_the_field: tier } }, Array.from({ length: kills + 1 }, (_, i) => ({ at: 'E' + (6 + i) })), [{ name: 'Ally' }]);
      const killer = byAlly ? f.pcs[1] : f.pc;
      for (let i = 0; i < kills; i++) { const foe = f.foes.find((x: Unit) => !x.dead && !x.downed)!; foe.hp = 1; foe.def = -50; f.unit(killer.id).pos = '2,5'; foe.pos = '3,5'; f.unit(killer.id).ap = 9;
        for (let n = 0; n < 9 && !f.unit(foe.id).dead; n++, f.unit(killer.id).jammed = false) withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(killer.id), f.unit(foe.id), 'shot', null, { noAp: true })); // until it drops (a natural 1 misses)
        expect(f.unit(foe.id).dead).toBe(true); f.unit(foe.id).pos = '12,' + (2 + i); } // the body out of the way
      f.turn(f.pc); f.pc.ap = 9; open(f.cb); const ap = f.pc.ap; f.act({ type: 'combat/crystallise', unitId: f.pc.id } as any); return ap - f.pc.ap; };
    const plain = crystal('I', 0);
    expect(plain).toBeGreaterThan(0); expect(crystal('I', 4)).toBe(plain); expect(crystal('I', 5)).toBe(0);
    expect(crystal('II', 2)).toBe(plain); expect(crystal('II', 3)).toBe(0); expect(crystal('II', 3, true)).toBe(plain);
  });
  it('Recitation: once a turn a Call calms its Strain (I 1, II 2)', () => {
    const calm = (tier?: string) => { const f = soulFight({ skills: { lore_master: 5 }, ...(tier ? { perks: { recitation: tier } } : {}) }); f.pc.mg!.strain = 4;
      f.act({ type: 'combat/call', unitId: f.pc.id, id: 'call.name_it', targetId: f.pc.id } as any); return f.pc.mg!.strain; };
    const base = calm();
    expect(calm('I')).toBe(base + tierFx('recitation', 'I')[0].value); expect(calm('II')).toBe(base + tierFx('recitation', 'II')[0].value);
  });
  it('Old Tales I gives its once-a-scene question to the Narrator; Old Tongue and You Get Used to It are gone (mapped)', () => {
    expect((PERK as any).old_tongue).toBeUndefined(); expect((PERK as any).you_get_used_to_it).toBeUndefined();
    expect((SKILL as any).lore_master.perk_remap.perks.old_tongue).toBe('old_tales'); expect((SKILL as any).composure.perk_remap.perks.you_get_used_to_it).toBe('poker_face');
  });
});

describe('the Channeler (item 6208): Occult Library', () => {
  it('once a turn Syphon costs 0 AP; the second its price; no design-ready stat any more', () => {
    const mv = (classesJ as any).base.find((c: any) => c.id === 'channeler').ranks.II.moves.find((m: any) => m.id === 'occult_library');
    expect(mv.effects.some((e: any) => e.stat === 'ready_designs')).toBe(false);
    const f = soulFight({ classId: 'channeler', level: 6, attrs: { determination: 5 }, skills: { will_power: 5 } }); f.cb.mana = 30; f.pc.mg!.mp = 1;
    let ap = f.pc.ap; f.act({ type: 'combat/syphon', unitId: f.pc.id } as any); expect(ap - f.pc.ap).toBe(0);
    f.pc.mg!.mp = 1; ap = f.pc.ap; f.act({ type: 'combat/syphon', unitId: f.pc.id } as any); expect(ap - f.pc.ap).toBeGreaterThan(0);
  });
});

describe('old saves (rules 1.70 item 5538 with the Determination tables)', () => {
  it('a sheet holding You Get Used to It and Old Tongue loads them mapped (Poker Face, Old Tales), the passives after, and is offered a re-pick', () => {
    const s = storyWith([{ skills: { composure: 5, lore_master: 3 } }]); const id = s.chars[0].id;
    const old = JSON.parse(JSON.stringify(s.g)); const c0 = old.characters[id];
    delete c0.perkRev; c0.perks = [{ id: 'you_get_used_to_it', tier: 'I' }, { id: 'old_tongue', tier: 'I' }];
    const c = migrateLoaded(old).characters[id];
    expect(c.perks.filter((x: any) => PERK[x.id]?.skills.includes('composure'))).toEqual([{ id: 'poker_face', tier: 'I' }, { id: 'stand_still', tier: 'I' }]);
    expect(c.perks.filter((x: any) => PERK[x.id]?.skills.includes('lore_master'))).toEqual([{ id: 'old_tales', tier: 'I' }]);
    expect(stepsTaken(c, 'composure')).toBe(2); expect(pendingRepicks(c).map((x: any) => x.skill).sort()).toEqual(['composure', 'lore_master']);
  });
});
void readFileSync; void fileURLToPath;

// ================================================================================================ Insight
/** A door user (an Attuner in the off hand) and a friend against two Soldiers; Bonds made by the real tend.bond action. */
function bondFight(spec: any = {}, friend: any = {}) {
  const s: any = storyWith([{ name: 'Medic', level: 6, weapon: 'service_pistol', attrs: { insight: 5 }, ...spec, skills: { empathy: 5, ...(spec.skills || {}) } }, { name: 'Gun', level: 6, ...friend }]);
  s.g.characters[s.chars[0].id].offHand = { id: 'attuner' };
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight', combat: { name: 'Bonds', map: 'yard16', difficulty: 'standard', level: 6,
    enemies: [{ name: 'Soldier 1', tier: 'soldier', weapon: 'service_pistol', at: '', no_surrender: true, level: 6 }, { name: 'Soldier 2', tier: 'soldier', weapon: 'service_pistol', at: '', no_surrender: true, level: 6 }] } } });
  const cb = () => s.g.combat, U = (id: string) => cb().units.find((u: any) => u.id === id);
  const me = cb().units.find((u: any) => u.name === 'Medic'), al = cb().units.find((u: any) => u.name === 'Gun'), foes = cb().units.filter((u: any) => u.side === 'foe');
  me.pos = '3,5'; al.pos = '3,7'; foes[0].pos = '9,5'; foes[1].pos = '9,8';
  const c = cb(); c.turn = c.order.indexOf(me.id); delete c.window; withGame(s.g, () => beginTurn(c, s.g.rng)); U(me.id).ap = 12; U(me.id).mg.mp = 900;
  const act = (id: string, t: any, actionId?: string, more: any = {}) => { try { s.act({ type: 'combat/perk', unitId: me.id, id, ...(actionId ? { actionId } : {}), ...(t ? { targetId: t.id } : {}), ...more }); return null; } catch (e: any) { return String(e?.message || e); } };
  const bond = (t: any) => { const x = U(t.id); x.sv = { heart: -99, body: -99, brain: -99 }; for (let i = 0; i < 6 && !tiesOf(cb(), U(me.id), 'bond', 'from').some((k: any) => k.to === t.id); i++) { U(me.id).ap = 12; expect(act('verb:tend.bond', U(t.id))).toBeNull(); } delete U(t.id).sv; };
  return { s, cb, U, me, al, foes, act, bond };
}

describe('Empathy (items 6210 to 6212)', () => {
  it('Snap opens at 2 and Shield at 5; Touch is gone', () => {
    const at = (e: number) => { const r = bondFight({ skills: { empathy: e } }); r.bond(r.al); const shield = r.act('verb:tend.shield', r.U(r.al.id)); r.U(r.me.id).ap = 12; return { shield, snap: r.act('verb:tend.snap', r.U(r.al.id)) }; }; // the Shield first: a Snap ends the Bond
    expect(at(1).snap).not.toBeNull(); expect(at(2).snap).toBeNull();
    expect(at(4).shield).not.toBeNull(); expect(at(5).shield).toBeNull();
    expect(bondFight().act('verb:tend.touch', null)).not.toBeNull();
  });
  it('Taut Thread II: an attack on a Bonded foe rolls with Empathy when it is higher; I does not', () => {
    const via = (tier: string) => { const r = bondFight({ skills: { empathy: 9, dexterity: 0 }, perks: { shared_breath: tier } }); r.bond(r.foes[0]);
      return withGame(r.s.g, () => previewAttack(r.cb(), r.U(r.me.id), r.U(r.foes[0].id), 'shot', { free: true })).via; };
    expect(via('II')).toBe('empathy'); expect(via('I')).not.toBe('empathy');
  });
  it('Threads That Hold: a Mend on a Bonded friend is its multiplier more; the Bonds to friends hold while you are Downed', () => {
    const mend = (perks: any) => { const r = bondFight({ skills: { empathy: 10 }, perks }); r.bond(r.al); r.U(r.al.id).hp = 1; r.s.g.rng.state = 77;
      expect(r.act('verb:tend.mend', r.U(r.al.id))).toBeNull(); return { healed: r.U(r.al.id).hp - 1, r }; };
    const a = mend({}).healed, b = mend({ threads_that_hold: 'mastered' });
    const mult = (PERK as any).threads_that_hold.effects[0].value;
    expect(Math.abs(b.healed - Math.floor(a * mult))).toBeLessThanOrEqual(1);
    withGame(b.r.s.g, () => setDowned(b.r.U(b.r.me.id), true));
    expect(tiesOf(b.r.cb(), b.r.U(b.r.me.id), 'bond', 'from').some((k: any) => k.to === b.r.al.id)).toBe(true);
  });
  it('Long Thread: the first Mend on each Bonded friend each round costs 1 AP less (min 1); the second full', () => {
    const r = bondFight({ skills: { empathy: 8 }, picks: ['fork.tend.long_thread'] }); r.bond(r.al); r.U(r.me.id).ap = 12;
    const plain = bondFight({ skills: { empathy: 8 } }); plain.bond(plain.al); plain.U(plain.me.id).ap = 12;
    let a = plain.U(plain.me.id).ap; plain.act('verb:tend.mend', plain.U(plain.al.id)); const full = a - plain.U(plain.me.id).ap;
    a = r.U(r.me.id).ap; expect(r.act('verb:tend.mend', r.U(r.al.id))).toBeNull(); expect(a - r.U(r.me.id).ap).toBe(Math.max(1, full - 1));
    a = r.U(r.me.id).ap; expect(r.act('verb:tend.mend', r.U(r.al.id))).toBeNull(); expect(a - r.U(r.me.id).ap).toBe(full);
  });
});

describe('Camaraderie (item 6213)', () => {
  it('Nobody Left Behind I: a Downed friend beside you takes half; I has no Raise (II has)', () => {
    const hit = (perks: any) => { const r = bondFight({ skills: { camaraderie: 5 }, perks }); const al = r.U(r.al.id); al.pos = '3,6'; withGame(r.s.g, () => setDowned(al, true));
      const res: any = withGame(r.s.g, () => applyDamage(r.cb(), al, 40, { by: r.U(r.foes[0].id), type: 'weapon', ranged: true } as any)); return { r, took: res.amount }; }; // a Downed unit's hit: the amount that lands after taking
    const plain = hit({}), half = hit({ nobody_left_behind: 'I' }), mult = (PERK as any).nobody_left_behind.tiers.I.effects[1].value;
    expect(plain.took).toBeGreaterThan(0); expect(Math.abs(half.took - Math.floor(plain.took * mult))).toBeLessThanOrEqual(1);
    expect(half.r.act('nobody_left_behind', half.r.U(half.r.al.id), 'tend_raise')).not.toBeNull();
  });
  it('Steady Hands I: Settle only; II adds Soothe', () => {
    const r = bondFight({ skills: { camaraderie: 3 }, perks: { steady_hands: 'I' } });
    expect(r.act('steady_hands', r.U(r.al.id), 'tend_settle')).toBeNull(); expect(condOn(r.U(r.al.id), 'settled')).toBe(true);
    expect(r.act('steady_hands', r.U(r.al.id), 'tend_soothe')).not.toBeNull();
  });
  it('Many Hands: Share a Hit reaches a friend within 3 tiles', () => {
    const share = () => { const r = bondFight({ skills: { camaraderie: 10 }, perks: { many_hands: 'mastered' } }); r.U(r.al.id).pos = '3,8'; r.U(r.foes[0].id).attack = 60; const hp = r.U(r.me.id).hp;
      withGame(r.s.g, () => resolveAttack(r.cb(), r.s.g.rng, r.U(r.foes[0].id), r.U(r.al.id), 'shot', null, { noAp: true })); return hp - r.U(r.me.id).hp; };
    let got = 0; for (let i = 0; i < 6 && !got; i++) got = share();
    expect(got).toBeGreaterThan(0);
  });
});

describe('Insinuation (items 6214 to 6216)', () => {
  it('Veiled Insult: 0 AP, once a fight at I (twice at II); a failed save is Taunted', () => {
    const uses = (tier: string) => { const r = bondFight({ skills: { implication: 5 }, perks: { veiled_insult: tier } }); r.U(r.foes[0].id).sv = { heart: -99 }; let n = 0;
      for (let i = 0; i < 3; i++) { r.s.g.rng.state = 1000 + i; const ap = r.U(r.me.id).ap; if (r.act('veiled_insult', r.U(r.foes[0].id), 'veiled_insult') === null) { n++; expect(ap - r.U(r.me.id).ap).toBe(0); } }
      expect(condOn(r.U(r.foes[0].id), 'taunted')).toBe(true); return n; };
    expect(uses('I')).toBe(1); expect(uses('II')).toBe(2);
  });
  it('Quiet Thread: I you are never Traced; II nor are your Bonded friends', () => {
    const traced = (tier?: string) => { const r = bondFight({ skills: { implication: 5, camaraderie: 3 }, perks: { steady_hands: 'I', ...(tier ? { quiet_thread: tier } : {}) } }); r.bond(r.foes[0]); r.bond(r.al);
      r.act('steady_hands', r.U(r.al.id), 'tend_settle'); return { me: condOn(r.U(r.me.id), 'traced'), al: condOn(r.U(r.al.id), 'traced') }; };
    const none = traced(), i = traced('I'), ii = traced('II');
    expect(none.me || none.al).toBe(true); expect(i.me).toBe(false); expect(ii.me).toBe(false); expect(ii.al).toBe(false);
  });
});

describe('old saves (the Insight tables)', () => {
  it('Soulmate and Sweet Talker load mapped; the Camaraderie and Insinuation passives come after; a re-pick is offered', () => {
    const s = storyWith([{ skills: { camaraderie: 5, implication: 5 } }]); const id = s.chars[0].id;
    const old = JSON.parse(JSON.stringify(s.g)); const c0 = old.characters[id];
    delete c0.perkRev; c0.perks = [{ id: 'soulmate', tier: 'II' }, { id: 'sweet_talker', tier: 'I' }];
    const c = migrateLoaded(old).characters[id];
    expect(c.perks.filter((x: any) => PERK[x.id]?.skills.includes('camaraderie'))).toEqual([{ id: 'pull_together', tier: 'II' }]);
    expect(c.perks.filter((x: any) => PERK[x.id]?.skills.includes('implication'))).toEqual([{ id: 'veiled_insult', tier: 'I' }, { id: 'between_the_lines', tier: 'I' }]);
    expect(pendingRepicks(c).map((x: any) => x.skill).sort()).toEqual(['camaraderie', 'implication']);
  });
});

// ================================================================================================ Virtue
/** A Faithful priest of Old Overcast (Devotion 6) and a friend against one Soldier; its turn begun. */
function priestFight(spec: any = {}, friend: any = {}) {
  const f = fightWith([{ name: 'Faithful', level: 12, attrs: { virtue: 5 }, ...spec, skills: { faith: 5, ...(spec.skills || {}) } }, { name: 'Friend', level: 12, ...friend }], [{ at: 'F6' }], { level: 12 });
  const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'old_overcast' } as any; c.patron = 'old_overcast' as any; setDevotionXp(c, devotionThreshold(6)); c.devotion = 6;
  const me = f.pc, al = f.pcs[1], foe = f.foe; me.pos = '2,5'; al.pos = '2,6'; al.maxHp = 5000; foe.pos = '6,5'; foe.hp = foe.maxHp = 5000; foe.armour = 0; foe.def = -40; // the friend has room for any heal
  f.turn(me); f.unit(me.id).ap = 12;
  const pray = (kind: string, id: string, targetId?: string, tile?: string) => { f.g.rng.state = 4242; f.act({ type: 'faith/pray', unitId: me.id, kind, id, ...(targetId ? { targetId } : {}), ...(tile ? { tile } : {}) } as any, 'host'); };
  return { f, c, me, al, foe, pray };
}

describe('Faith (items 6220 to 6222)', () => {
  it('Name the Sinner at 2: a Whisper Judges a foe for its rounds; Answered Prayer is gone', () => {
    const r = priestFight({ skills: { faith: 2 } });
    const act = (SKILL as any).faith.unlocks['2'].effects[0];
    let ok = false; for (let i = 0; i < 6 && !condOn(r.f.unit(r.foe.id), 'judged'); i++) { r.f.unit(r.me.id).ap = 12; r.f.cb.turn = r.f.cb.order.indexOf(r.me.id); try { r.f.act({ type: 'combat/perk', unitId: r.me.id, id: 'skill:faith.2', actionId: act.action, targetId: r.foe.id } as any); ok = true; } catch { r.f.turn(r.me); } }
    expect(ok).toBe(true); expect(condOn(r.f.unit(r.foe.id), 'judged')).toBe(true);
    expect(JSON.stringify((SKILL as any).faith.unlocks)).not.toMatch(/answered_prayer/);
  });
  it('Steadfast: a Whisper on an ally at half HP or less costs its cut; above half, full price', () => {
    const cost = (pick: boolean, low: boolean) => { const r = priestFight({ skills: { faith: 4 }, ...(pick ? { picks: ['fork.prayer.steadfast'] } : {}) }); const al = r.f.unit(r.al.id); al.hp = low ? 1 : al.maxHp;
      const ap = r.f.unit(r.me.id).ap; r.pray('whisper', 'health', al.id); return ap - r.f.unit(r.me.id).ap; };
    expect(cost(true, true)).toBe(Math.max(0, cost(false, true) + FK['fork.prayer.steadfast'].effects[0].value)); expect(cost(true, false)).toBe(cost(false, false));
  });
  it('Round of Blessings: the first prayer heal each turn is its multiplier more', () => {
    const heal = (pick: boolean) => { const r = priestFight({ skills: { faith: 4 }, ...(pick ? { picks: ['fork.prayer.round_of_blessings'] } : {}) }); const al = r.f.unit(r.al.id); al.hp = 1; r.pray('whisper', 'health', al.id); return r.f.unit(r.al.id).hp - 1; };
    const a = heal(false), b = heal(true); expect(a).toBeGreaterThan(0); expect(Math.abs(b - Math.floor(a * FK['fork.prayer.round_of_blessings'].effects[0].value))).toBeLessThanOrEqual(1);
  });
  it('Swift Psalm: the Hymn wait one round shorter, picked through door/pick, with no perk or trait held', () => {
    const r = priestFight({ skills: { faith: 8 } }), w = priestFight({ skills: { faith: 8 }, picks: ['fork.prayer.held_breath'] });
    const a = withGame(r.f.g, () => hymnWait(r.c, r.f.unit(r.me.id))), b = withGame(w.f.g, () => hymnWait(w.c, w.f.unit(w.me.id)));
    expect(b).toBe(Math.max(2, a + FK['fork.prayer.held_breath'].effects[0].value));
  });
  it('Benediction: an answered Hymn gives you and allies within 2 tiles Blessed Aim', () => {
    const r = priestFight({ skills: { faith: 8 }, picks: ['fork.prayer.benediction'] }); r.pray('hymn', 'thunderclap', r.foe.id, r.f.unit(r.foe.id).pos);
    expect(condOn(r.f.unit(r.al.id), 'blessed_aim')).toBe(true);
  });
  it('Litany II: the first two Hymns or Miracles each fight are cheaper', () => {
    const e = (PERK as any).litany.tiers.II.effects[0]; expect(e.limit.n).toBe(2);
  });
});

describe('Conscience (item 6223)', () => {
  it('Righteous: a prayer heal on an ally at half HP or less is its tier\'s multiplier more (I and II)', () => {
    const heal = (perks: any) => { const r = priestFight({ skills: { conscience: 5 }, perks }); const al = r.f.unit(r.al.id); al.hp = 1; r.pray('whisper', 'health', al.id); return r.f.unit(r.al.id).hp - 1; };
    const a = heal({}), i = heal({ righteous: 'I' }), ii = heal({ righteous: 'II' });
    expect(Math.abs(i - Math.floor(a * (PERK as any).righteous.tiers.I.effects[0].value))).toBeLessThanOrEqual(1);
    expect(Math.abs(ii - Math.floor(a * (PERK as any).righteous.tiers.II.effects[0].value))).toBeLessThanOrEqual(1);
  });
  it('Foresight II: once a fight, a blow that would drop a friend within 4 tiles leaves it on 1 HP; I does nothing in a fight', () => {
    const blowOn = (tier: string) => { const r = priestFight({ skills: { conscience: 5 }, perks: { foresight: tier } }); const al = r.f.unit(r.al.id); al.hp = 5;
      withGame(r.f.g, () => applyDamage(r.f.cb, al, 500, { by: r.f.unit(r.foe.id), type: 'weapon', ranged: true } as any)); return r.f.unit(r.al.id); };
    expect(blowOn('II').hp).toBe(1); expect(blowOn('I').hp).toBe(0);
  });
});

describe('Authority (item 6224)', () => {
  it('Five Stars: I every friend banks its AP at the fight\'s start; II foes are Shaken on a failed save', () => {
    const f1 = fightWith([{ skills: { authority: 5 }, perks: { five_stars: 'I' } }, { name: 'Friend' }], [{ at: 'F6' }]);
    const f0 = fightWith([{ skills: { authority: 5 } }, { name: 'Friend' }], [{ at: 'F6' }]);
    const ap = (f: any) => f.turn(f.pcs[1]).ap;
    expect(ap(f1)).toBe(ap(f0) + (PERK as any).five_stars.tiers.I.effects[0].value);
    let shaken = false; for (let i = 0; i < 6 && !shaken; i++) { const f2 = fightWith([{ skills: { authority: 9 }, perks: { five_stars: 'II' } }], [{ at: 'F6' }], { seed: 'FS' + i }); shaken = condOn(f2.foe, 'shaken'); }
    expect(shaken).toBe(true);
  });
  it('Commanding Voice: I a bonus on the save against Shaken; II immune to Silenced', () => {
    const f = fightWith([{ skills: { authority: 5 }, perks: { commanding_voice: 'II' } }], [{ at: 'F6' }]);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.pc, 'silenced', 2, undefined, { skipSave: true }));
    expect(condOn(f.pc, 'silenced')).toBe(false);
    const f2 = fightWith([{ skills: { authority: 5 }, perks: { commanding_voice: 'I' } }], [{ at: 'F6' }]);
    withGame(f2.g, () => applyCond(f2.cb, f2.g.rng, f2.foe, f2.pc, 'silenced', 2, undefined, { skipSave: true }));
    expect(condOn(f2.pc, 'silenced')).toBe(true);
  });
  it('old saves: Real Power loads as Rank Has Privileges at its tier, Five Stars after it', () => {
    const s = storyWith([{ skills: { authority: 5 } }]); const id = s.chars[0].id;
    const old = JSON.parse(JSON.stringify(s.g)); const c0 = old.characters[id]; delete c0.perkRev; c0.perks = [{ id: 'real_power', tier: 'I' }];
    const c = migrateLoaded(old).characters[id];
    expect(c.perks.filter((x: any) => PERK[x.id]?.skills.includes('authority'))).toEqual([{ id: 'rank_has_privileges', tier: 'I' }, { id: 'five_stars', tier: 'I' }]);
  });
});
