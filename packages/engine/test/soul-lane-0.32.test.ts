// @ts-nocheck (test fixtures: plain objects)
// Rules 1.75 (0.32, the Soul lane): Determination, Insight and Virtue reshaped to the ladder of rules 1.70. Every pick
// goes through the reducer (levelup/perk, door/pick: the helpers' `perks` and `picks`), every rule through a real action
// (combat/outburst, combat/pump, combat/release, combat/steady, combat/attack, combat/crystallise, combat/syphon,
// combat/call, combat/perk) or a real blow (resolveAttack, as a turn makes it); every number is read from data.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PERK, SKILL, applyCond, condOn, previewAttack, saveAgainst, resolveAttack, migrateLoaded, strainLimit, swellFree, readyDesigns, pendingRepicks, stepsTaken, saveBonus, type Unit } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';
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
