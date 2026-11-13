// Rules 1.5 (Outburst 2.0): the Soul classes, advanced classes, perks, traits and skill unlocks re-derived for the heart
// cycle (spec section 14, items 522 on). Every move through apply() (combat/outburst, combat/pump, combat/release,
// combat/perk, combat/attack, combat/end-turn); enemy-side harm through the engine calls their turns use.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import { d20, grantShield, designCost, manaOf, applyDamage, condOn, beginTurn, CLASS, stageMult, type Combat, type Unit, type OutburstDesign } from '../src';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

type F = ReturnType<typeof fightWith>;
function rngFor(...ns: number[]): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const seed = (f: { g: any }, ...ns: number[]) => { f.g.rng.state = rngFor(...ns); };
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fxOf = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];
const A = (f: F, u: Unit, a: Record<string, any>) => f.act({ unitId: u.id, ...a } as any);
const perk = (f: F, u: Unit, id: string, a: Record<string, any> = {}) => f.act({ type: 'combat/perk', unitId: u.id, id, ...a } as any);
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
function cls(id: string, rank: 1 | 2 | 3, extra: CharSpec = {}): CharSpec {
  const sig = SIG(id), pts = rank === 3 ? [6, 6, 6] : rank === 2 ? [5, 4, 4] : [1, 1, 1];
  return { ...SOUL, ...extra, classId: id, level: 5, skills: { ...Object.fromEntries(sig.map((s, i) => [s, pts[i]])), ...(extra.skills || {}) } };
}
const adv = (id: string, extra: CharSpec = {}): CharSpec => ({ ...SOUL, advancedClass: id, level: 5, ...extra });
/** Clear the yard; every unit 999 HP, no armour, Defense −40, saves −40; the Soul casters' numbers fixed: Soul
 * multiplier 1, Will Power +0, reach 4, Strain limit 20, no free Pumps, 999 MP. */
function clean(f: F) {
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  for (const x of cb.units) { x.hp = x.maxHp = 999; x.armour = 0; x.def = -40; x.sv = { body: -40, brain: -40, heart: -40 } as any; x.hidden = false; (x as any).healRecv = 1; }
  for (const x of cb.units) if (x.mg) Object.assign(x.mg, { emanator: true, mp: 999, mpMax: 999, soulMult: 1, soulBoon: 1, deal: 1, soulBase: 20, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0 });
}
const give = (u: Unit, d: Partial<OutburstDesign>): string => { const id = 'x' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'damage', modules: [], ...d } as OutburstDesign); return id; };
const place = (f: F, u: Unit, k: string) => { f.unit(u.id).pos = k; return f.unit(u.id); };
const lost = (u: Unit) => 999 - u.hp;

// =================================================================================================== Channeler
describe('Channeler: Storm Front under 1.5 (item 523)', () => {
  it('a Bolt arcs on to 2 more enemies within 2 tiles of the first, at the stage reached, one roll each', () => {
    const f = fightWith([cls('channeler', 2)], [{}, {}, {}]); clean(f);
    const u = f.turn(f.pc); u.ap = 9; place(f, u, '2,2'); const [a, b, c] = f.foes; place(f, a, '6,2'); place(f, b, '7,2'); place(f, c, '6,3');
    const d = give(f.unit(u.id), {}); seed(f, 10, 10, 10);
    A(f, f.unit(u.id), { type: 'combat/outburst', design: d, mods: ['class:channeler.storm_front#storm'] });
    expect(f.unit(u.id).mg!.mp).toBe(999 - designCost(f.unit(u.id).mg!, f.unit(u.id).mg!.designs.find((x) => x.id === d)!, manaOf(f.cb)) - 10);
    A(f, f.unit(u.id), { type: 'combat/pump' }); A(f, f.unit(u.id), { type: 'combat/release', aim: '6,2' });
    expect(lost(f.unit(a.id))).toBe(22); // stage 1, ×1.0, and Shape's +0.1 on the turn's free Pump (rules 1.19)
    expect(lost(f.unit(b.id))).toBe(22); expect(lost(f.unit(c.id))).toBe(22);
    expect(fxOf(f.cb, 'chain').filter((e) => e.storm).length).toBe(2);
  });
  it('an area shape can\'t take it: a Burst neither pays the +10 MP nor arcs', () => {
    const f = fightWith([cls('channeler', 2)], [{}, {}]); clean(f);
    const u = f.turn(f.pc); u.ap = 9; place(f, u, '2,2'); const [a, b] = f.foes; place(f, a, '6,2'); place(f, b, '8,2');
    const d = give(f.unit(u.id), { modules: ['burst'] }), cost = designCost(f.unit(u.id).mg!, f.unit(u.id).mg!.designs.find((x) => x.id === d)!, manaOf(f.cb));
    A(f, f.unit(u.id), { type: 'combat/outburst', design: d, aim: '6,2', mods: ['class:channeler.storm_front#storm'] });
    expect(f.unit(u.id).mg!.mp).toBe(999 - cost); expect(lost(f.unit(b.id))).toBe(0); expect(logHas(f.cb, /Storm Front arcs/)).toBe(false);
  });
});

describe('Channeler: Heart Surge on a stage-4 heart and a snap (item 524)', () => {
  it('past stage 4 the multiplier reads ×1.8 (one more step of the table, rules 1.19); a snap reads stage 1 (×1.0)', () => {
    const f = fightWith([cls('channeler', 3)], [{}]); clean(f);
    const u = f.turn(f.pc); u.ap = 12; place(f, u, '2,2'); place(f, f.foe, '5,2'); const d = give(f.unit(u.id), { at_once: true } as any);
    f.unit(u.id).mg!.designs.find((x) => x.id === d)!.modules = ['at_once']; // no roll: the numbers are exact (At Once: ×0.8, rules 1.17)
    A(f, f.unit(u.id), { type: 'combat/outburst', design: d }); for (let i = 0; i < 4; i++) A(f, f.unit(u.id), { type: 'combat/pump' });
    A(f, f.unit(u.id), { type: 'combat/release', aim: '5,2', mods: ['class:channeler.heart_surge#surge'] });
    expect(Math.abs(lost(f.unit(f.foe.id)) - 20 * (1.6 + 0.1) * (1.8 / 1.6) * 0.8)).toBeLessThanOrEqual(1);
    const g = fightWith([cls('channeler', 3)], [{}]); clean(g);
    const v = g.turn(g.pc); v.ap = 9; place(g, v, '2,2'); place(g, g.foe, '5,2'); const e = give(g.unit(v.id), { modules: ['at_once'] });
    A(g, g.unit(v.id), { type: 'combat/outburst', design: e, aim: '5,2', mods: ['class:channeler.heart_surge#surge'] });
    expect(lost(g.unit(g.foe.id))).toBe(Math.floor(20 * 1 * 0.8));
    expect(() => A(g, g.unit(v.id), { type: 'combat/outburst', design: e, aim: '5,2', mods: ['class:channeler.heart_surge#surge'] })).not.toThrow();
    expect(lost(g.unit(g.foe.id))).toBe(Math.floor(20 * 1 * 0.8) + Math.floor(20 * 0.8 * 0.8)); // once a turn: the second snap is ×0.8 (rules 1.8)
  });
});

// =================================================================================================== Guardian, Bard
describe('Guardian and Bard under 1.5', () => {
  // (Sanctuary is the Chaplain's Hymn since rules 1.31: its halving and the burn's exception are pinned in test/prim-zones-shields.test.ts and test/chaplain.test.ts)
  it('Drink It In: an elemental Outburst on your shield feeds its real MP price (not 10 a Sigil word)', () => {
    const f = fightWith([cls('guardian', 2), {}, SOUL], [{ at: 'P15' }]); clean(f);
    const [gd, ally, rogue] = f.pcs; place(f, gd, '3,3'); place(f, ally, '5,3'); place(f, rogue, '8,3');
    const u = f.turn(gd); withGame(f.g, () => grantShield(f.cb, f.unit(ally.id), 30, f.unit(u.id))); // a shield the Guardian made (Will Shield left in rules 1.31)
    f.unit(ally.id).shield = 500; f.unit(gd.id).mg!.mp = 10; f.unit(rogue.id).side = 'foe';
    const r = f.turn(rogue); r.ap = 9; const d = give(f.unit(r.id), { tone: 'fire', modules: ['at_once'] }), cost = designCost(f.unit(r.id).mg!, f.unit(r.id).mg!.designs.find((x) => x.id === d)!, manaOf(f.cb));
    f.act({ type: 'combat/outburst', unitId: r.id, design: d, aim: '5,3' } as any, f.g.characters[rogue.charId!].owner);
    expect(f.unit(gd.id).mg!.mp).toBe(10 + cost);
  });
  it('Gift (item 526): the ally spends 3 AP, it goes off at stage 1 (×1) on the Bard\'s MP (the full price) and a Begin\'s Strain', () => {
    const s = storyWith([cls('bard', 3), {}]); const [b, ally] = s.chars;
    s.act({ type: 'story/perk', charId: b.id, id: 'class:bard.gift', text: 'For you, ' + s.g.characters[ally.id].name });
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol', at: 'O3' }] } } } as any);
    const f: any = { get g() { return s.g; }, get cb() { return s.g.combat!; }, unit: (id: string) => s.g.combat!.units.find((x) => x.id === id)! };
    clean(f);
    const bu = f.cb.units.find((x: Unit) => x.charId === b.id)!, au = f.cb.units.find((x: Unit) => x.charId === ally.id)!, foe = f.cb.units.find((x: Unit) => x.side === 'foe')!;
    bu.pos = '1,1'; au.pos = '3,2'; foe.pos = '5,2';
    const gift = (s.g.characters[b.id] as any).state; void gift;
    const dsg = bu.mg!.designs[0]; dsg.modules = ['at_once']; dsg.school = 'damage'; delete (dsg as any).tone; delete (dsg as any).school2;
    f.cb.turn = f.cb.order.indexOf(au.id); au.ap = 6; s.g.rng.state = rngFor(10);
    const cost = designCost(bu.mg!, dsg, manaOf(f.cb));
    s.act({ type: 'combat/gift', unitId: au.id, aim: '5,2' } as any);
    expect(f.unit(au.id).ap).toBe(3); expect(f.unit(bu.id).mg!.mp).toBe(999 - cost);
    expect(lost(f.unit(foe.id))).toBe(Math.floor(20 * 1 * 0.8)); expect(f.unit(bu.id).mg!.strain).toBe(1);
  });
});

// =================================================================================================== Heartbinder
describe('Heartbinder: the links share the heart\'s load (item 530)', () => {
  it('Strain that would take a linked ally over their limit comes to you; Take their Strain moves 2', () => {
    const f = fightWith([adv('heartbinder'), SOUL], [{}]); clean(f);
    const [hb, ally] = f.pcs; place(f, hb, '3,2'); place(f, ally, '5,2'); const u = f.turn(hb);
    perk(f, f.unit(u.id), 'heartbinder.link', { targetId: ally.id });
    const a = f.turn(ally); a.ap = 9; const am = f.unit(ally.id).mg!; am.strainLimit = 4; am.strain = 4; const d = give(f.unit(a.id), { modules: ['at_once'] });
    A(f, f.unit(a.id), { type: 'combat/outburst', design: d, aim: f.foe.pos });
    expect(f.unit(ally.id).mg!.strain).toBeLessThanOrEqual(4); expect(f.unit(hb.id).mg!.strain).toBeGreaterThanOrEqual(1);
    expect(logHas(f.cb, /Strain through the link \(Share\)/)).toBe(true);
    f.unit(ally.id).mg!.strain = 3; f.unit(hb.id).mg!.strain = 0; const v = f.turn(hb); v.ap = 9;
    perk(f, f.unit(v.id), 'heartbinder.share', { actionId: 'take_strain', targetId: ally.id });
    expect(f.unit(ally.id).mg!.strain).toBe(1); expect(f.unit(hb.id).mg!.strain).toBe(2);
  });
  it('Through: a held Wave released from a linked ally\'s place spreads from their tile', () => {
    const f = fightWith([adv('heartbinder'), SOUL], [{}]); clean(f);
    const [hb, ally] = f.pcs; place(f, hb, '0,8'); place(f, ally, '6,2'); place(f, f.foe, '8,2'); const u = f.turn(hb); u.ap = 9;
    perk(f, f.unit(u.id), 'heartbinder.link', { targetId: ally.id });
    const d = give(f.unit(u.id), { modules: ['wave'] });
    A(f, f.unit(u.id), { type: 'combat/outburst', design: d }); A(f, f.unit(u.id), { type: 'combat/pump' });
    perk(f, f.unit(u.id), 'heartbinder.through', { actionId: 'release_through', tile: '8,2' });
    expect(lost(f.unit(f.foe.id))).toBe(Math.floor(20 * 1 * 0.7)); expect(lost(f.unit(ally.id))).toBe(0); expect(f.unit(hb.id).pos).toBe('0,8');
  });
});

// =================================================================================================== Vessel
describe('Vessel: body forms on the 1.5 stage table (items 531, 532)', () => {
  it('Pump a form: an Empathy free Pump first, then 1 AP; Iron reads ×1.0, ×1.2, ×1.4 (the stage table, rules 1.19); no slipping when hurt', () => {
    const f = fightWith([adv('vessel')], [{}]); clean(f); const u = f.turn(f.pc); u.ap = 9; const arm = u.armour;
    f.unit(u.id).mg!.freePumps = 1;
    perk(f, f.unit(u.id), 'vessel.inner_charge', { choice: 'iron' }); expect(f.pc.armour).toBe(arm + 10); expect(f.pc.ap).toBe(7);
    perk(f, f.pc, 'vessel.inner_charge', { actionId: 'pump_form', choice: 'iron' }); expect(f.pc.ap).toBe(7); expect(f.pc.armour).toBe(arm + 12);
    perk(f, f.pc, 'vessel.inner_charge', { actionId: 'pump_form', choice: 'iron' }); expect(f.pc.ap).toBe(6); expect(f.pc.armour).toBe(arm + 14);
    expect(fxOf(f.cb, 'pump').length).toBe(2);
    for (let i = 0; i < 5; i++) withGame(f.g, () => applyDamage(f.cb, f.pc, 60, { by: f.foe, type: 'weapon', credit: 'all' }));
    expect((f.g.characters[f.pc.charId!] as any).state.vessel.forms.length).toBe(1);
  });
  it('A Vessel holds at most 2 body forms, whatever its Will Power: at Will Power 9 a third form is refused, and says why', () => {
    const f = fightWith([adv('vessel', { skills: { will_power: 9 } })], [{}]); clean(f); const u = f.turn(f.pc); u.ap = 12;
    expect(f.g.characters[f.pc.charId!].skills.will_power).toBe(9);
    perk(f, f.unit(u.id), 'vessel.inner_charge', { choice: 'iron' }); perk(f, f.pc, 'vessel.inner_charge', { choice: 'steady' });
    expect(() => perk(f, f.pc, 'vessel.inner_charge', { choice: 'swift' })).toThrow(/You already hold 2 body forms\. That is the most a Vessel can hold/);
    expect((f.g.characters[f.pc.charId!] as any).state.vessel.forms.map((x: any) => x.form)).toEqual(['iron', 'steady']);
  });
  it('Inner Charge in the story is capped at 2 forms too, with the same reason; a save holding a retired third form keeps only 2', () => {
    const s = storyWith([adv('vessel', { skills: { will_power: 9 } })]); const v = s.chars[0];
    const take = (choice: string) => s.act({ type: 'story/perk', charId: v.id, id: 'vessel.inner_charge', actionId: 'inner_charge_story', choice } as any);
    take('iron'); take('steady');
    expect(() => take('swift')).toThrow(/^.*You already hold 2 body forms\. That is the most a Vessel can hold\.$/);
    const st = (s.g.characters[v.id] as any).state.vessel; expect(st.forms.map((x: any) => x.form)).toEqual(['iron', 'steady']);
    // An old save (Will Power 5+, before item 550) with three forms: the third is dropped when the forms are next read,
    // here as the fight starts, so it adds nothing (no Swift Movement).
    st.forms.push({ form: 'swift', stage: 4 });
    expect(() => take('surge')).toThrow(/already hold 2 body forms/);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol', at: 'O3' }] } } } as any);
    expect((s.g.characters[v.id] as any).state.vessel.forms.map((x: any) => x.form)).toEqual(['iron', 'steady']);
    expect((s.g.combat!.units.find((x) => x.charId === v.id) as any).vsl.move).toBe(0);
  });
  it('Release sums 15 × each form\'s stage multiplier', () => {
    const f = fightWith([adv('vessel', { weapon: 'fists' })], [{}]); clean(f); const u = f.turn(f.pc); u.ap = 12; place(f, u, '3,2'); place(f, f.foe, '4,2');
    perk(f, f.unit(u.id), 'vessel.inner_charge', { choice: 'iron' }); perk(f, f.pc, 'vessel.inner_charge', { choice: 'steady' });
    perk(f, f.pc, 'vessel.inner_charge', { actionId: 'pump_form', choice: 'iron' }); perk(f, f.pc, 'vessel.inner_charge', { actionId: 'pump_form', choice: 'iron' });
    seed(f, 10); perk(f, f.pc, 'vessel.release_strike', { targetId: f.foe.id });
    expect(logHas(f.cb, /RELEASE \(2 forms, 36\)/)).toBe(true); // 15 × 1.4 + 15 × 1.0 (rules 1.19)
  });
});

// =================================================================================================== Twinbound
describe('Twinbound: the twin\'s own heart (item 533)', () => {
  function called() {
    const s = storyWith([adv('twinbound')]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: 'damage; damage; damage' } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol', at: 'I3' }] } } } as any);
    const f: any = { get g() { return s.g; }, get cb() { return s.g.combat!; }, unit: (id: string) => s.g.combat!.units.find((x: Unit) => x.id === id)!, act: s.act };
    clean(f);
    const pc = f.cb.units.find((x: Unit) => x.side === 'pc')!; f.cb.turn = f.cb.order.indexOf(pc.id); pc.ap = 6;
    s.act({ type: 'combat/perk', unitId: pc.id, id: 'twinbound.call', tile: '2,4' } as any);
    const tw = f.cb.units.find((x: Unit) => (x as any).twinOf === pc.id)!;
    s.act({ type: 'combat/end-turn', unitId: pc.id } as any);
    return { s, f, pc: pc.id as string, tw: tw.id as string };
  }
  it('the twin Begins, Pumps and holds with its own stage; its Strain and MP are yours; it swells on its own turn', () => {
    const { s, f, pc, tw } = called();
    expect(f.cb.order[f.cb.turn]).toBe(tw); expect(f.unit(tw).ap).toBe(4); expect(f.unit(tw).mg.designs.map((d: any) => d.id)).toEqual(['tw1', 'tw2', 'tw3']);
    const mp = f.unit(pc).mg.mp, st = f.unit(pc).mg.strain;
    s.act({ type: 'combat/outburst', unitId: tw, design: 'tw1' } as any); s.act({ type: 'combat/pump', unitId: tw } as any);
    expect(f.unit(tw).mg.held.stage).toBe(1); expect(f.unit(tw).ap).toBe(1);
    expect(f.unit(pc).mg.mp).toBeLessThan(mp); expect(f.unit(pc).mg.strain).toBe(st + 1); expect(f.unit(tw).mg.strain).toBe(0);
    expect(f.unit(pc).mg.held).toBeNull(); // the caller's heart is free: you may hold one too
    const st2 = f.unit(pc).mg.strain; f.cb.turn = f.cb.order.indexOf(tw); withGame(s.g, () => beginTurn(f.cb, s.g.rng));
    expect(f.unit(tw).mg.held.stage).toBe(2); expect(f.unit(pc).mg.strain).toBe(st2 + 1);
  });
  it('you and the twin don\'t resonate with each other', () => {
    const { s, f, pc, tw } = called();
    const foe = f.cb.units.find((x: Unit) => x.side === 'foe')!; foe.pos = '4,4'; f.unit(tw).pos = '2,4';
    f.cb.turn = f.cb.order.indexOf(pc); f.unit(pc).ap = 9; f.unit(pc).pos = '1,4';
    const d0 = f.unit(pc).mg.designs[0]; d0.modules = ['at_once'];
    s.act({ type: 'combat/outburst', unitId: pc, design: d0.id, aim: '4,4' } as any);
    f.cb.turn = f.cb.order.indexOf(tw); f.unit(tw).ap = 4;
    s.act({ type: 'combat/perk', unitId: tw, id: 'twinbound.call', actionId: 'twin_cast', choice: 'tw1', tile: '4,4' } as any);
    const rel = fxOf(f.cb, 'release').at(-1); expect(rel.unit).toBe(tw); expect(rel.mult).toBe(0.8);
  });
});

// =================================================================================================== Devoted
describe('Devoted: Heart\'s Own after the Beloved spell is gone', () => {
  it('the +2 limit lasts while it is held; released, the plain limit is back before the turn\'s burn', () => {
    const f = fightWith([adv('devoted')], [{}]); clean(f); (f.g.characters[f.pc.charId!] as any).state = { beloved: ['o1'] };
    const u = f.turn(f.pc); u.ap = 9; f.unit(u.id).mg!.strainLimit = 4; place(f, u, '2,2'); place(f, f.foe, '4,2');
    A(f, f.unit(u.id), { type: 'combat/outburst', design: 'o1' }); expect(f.pc.mg!.strainLimit).toBe(6);
    A(f, f.unit(u.id), { type: 'combat/release', aim: '4,2' });
    f.unit(u.id).mg!.strain = 5;
    A(f, f.unit(u.id), { type: 'combat/end-turn' });
    expect(fxOf(f.cb, 'burn').at(-1)).toMatchObject({ unit: u.id, over: 1, dmg: 8 }); // 1 over the plain 4: the burn
  });
});

// =================================================================================================== Storm Hand
describe('Storm Hand: Infusion riders and Discharge (rules 1.5 section 8)', () => {
  const sh = (el: string) => {
    const f = fightWith([{ ...SOUL, advancedClass: 'storm_hand', level: 5, weapon: 'sabre' }], [{}, {}]); clean(f);
    (f.g.characters[f.pc.charId!].state ||= {} as any)['class:storm_hand.gauntlet_infusion'] = { element: el };
    const u = f.turn(f.pc); u.ap = 9; place(f, u, '2,5'); const [a, b] = f.foes; place(f, a, '3,5'); place(f, b, '4,5'); f.unit(u.id).mg!.elemMult = 1;
    return { f, u, a, b };
  };
  it('Freeze Slows on the hit (Body save); Fire adds +5 off a critical; Shock arcs to the enemy beside for half, with its fx', () => {
    const z = sh('freeze'); seed(z.f, 10, 2); A(z.f, z.u, { type: 'combat/attack', targetId: z.a.id, mode: 'melee' });
    expect(condOn(z.f.unit(z.a.id), 'slowed')).toBe(true); expect(fxOf(z.f.cb, 'infusion').at(-1).element).toBe('freeze');
    const fi = sh('fire'); seed(fi.f, 10); A(fi.f, fi.u, { type: 'combat/attack', targetId: fi.a.id, mode: 'melee' });
    expect(logHas(fi.f.cb, /Infusion: FIRE \(5 MP\) · 15 damage/)).toBe(true);
    const sk = sh('shock'); seed(sk.f, 10); A(sk.f, sk.u, { type: 'combat/attack', targetId: sk.a.id, mode: 'melee' });
    expect(lost(sk.f.unit(sk.b.id))).toBe(5); expect(fxOf(sk.f.cb, 'chain').at(-1).element).toBe('shock');
  });
  it('Discharge at 2 Charges with Freeze: 40 to each enemy beside the target and Frost\'s stage-2 rider (Slowed, no save); shake', () => {
    const z = sh('freeze'); z.f.unit(z.u.id).res = { ...(z.f.unit(z.u.id).res || {}), charges: 2 }; place(z.f, z.b, '3,6');
    seed(z.f, 10, 20, 20);
    A(z.f, z.f.unit(z.u.id), { type: 'combat/attack', targetId: z.a.id, mode: 'melee', mods: ['class:storm_hand.discharge#discharge'] });
    expect(lost(z.f.unit(z.b.id))).toBe(40); expect(condOn(z.f.unit(z.b.id), 'slowed')).toBe(true);
    expect(fxOf(z.f.cb, 'explode').at(-1)).toMatchObject({ element: 'freeze', charges: 2, shake: true });
    expect(z.f.unit(z.u.id).res!.charges).toBe(0);
  });
  it('Fire on a critical: Burning 1 round and no +5 (the plain +10 only)', () => {
    const fi = sh('fire'); seed(fi.f, 20); A(fi.f, fi.u, { type: 'combat/attack', targetId: fi.a.id, mode: 'melee' });
    expect(logHas(fi.f.cb, /Infusion: FIRE \(5 MP\) · 10 damage/)).toBe(true);
    expect(condOn(fi.f.unit(fi.a.id), 'burning')).toBe(true); expect(fi.f.unit(fi.a.id).conds!.burning).toBe(1);
    const no = sh('fire'); seed(no.f, 10); A(no.f, no.u, { type: 'combat/attack', targetId: no.a.id, mode: 'melee' });
    expect(condOn(no.f.unit(no.a.id), 'burning')).toBe(false);
  });
  it('Spark: +1 AP on a kill (the weapon\'s or the spark\'s), 5 MP; no AP on a hit that doesn\'t kill; never past 9', () => {
    const run = (hp: number, ap = 6) => {
      const z = sh('spark'); z.f.unit(z.u.id).ap = ap; z.f.unit(z.a.id).hp = hp; seed(z.f, 10);
      const before = z.f.unit(z.u.id).ap, mp = z.f.unit(z.u.id).mg!.mp;
      A(z.f, z.f.unit(z.u.id), { type: 'combat/attack', targetId: z.a.id, mode: 'melee' });
      return { z, spent: before - z.f.unit(z.u.id).ap, mp: mp - z.f.unit(z.u.id).mg!.mp, dead: !!z.f.unit(z.a.id).dead };
    };
    const live = run(999), kill = run(1);
    expect(live.dead).toBe(false); expect(kill.dead).toBe(true);
    expect(kill.spent).toBe(live.spent - 1); expect(kill.mp).toBe(5); expect(logHas(kill.z.f.cb, /\+1 AP \(Spark\)/)).toBe(true);
    expect(logHas(live.z.f.cb, /\+1 AP \(Spark\)/)).toBe(false); expect(live.mp).toBe(5);
    const capped = run(1, 9); expect(capped.z.f.unit(capped.z.u.id).ap).toBeLessThanOrEqual(9);
  });
  it('Discharge with Spark: 20 per Charge to each enemy beside the target, no rider', () => {
    const z = sh('spark'); z.f.unit(z.u.id).res = { ...(z.f.unit(z.u.id).res || {}), charges: 2 }; place(z.f, z.b, '3,6');
    seed(z.f, 10, 20, 20);
    A(z.f, z.f.unit(z.u.id), { type: 'combat/attack', targetId: z.a.id, mode: 'melee', mods: ['class:storm_hand.discharge#discharge'] });
    expect(lost(z.f.unit(z.b.id))).toBe(40); expect(Object.keys(z.f.unit(z.b.id).conds || {}).length).toBe(0);
    expect(fxOf(z.f.cb, 'explode').at(-1)).toMatchObject({ element: 'spark', charges: 2, shake: true }); expect(z.f.unit(z.u.id).res!.charges).toBe(0);
  });
  it('Discharge with Fire at 2 Charges: 40 and Fire\'s stage-2 rider (Burning 2 rounds) on each enemy beside the target', () => {
    const z = sh('fire'); z.f.unit(z.u.id).res = { ...(z.f.unit(z.u.id).res || {}), charges: 2 }; place(z.f, z.b, '3,6');
    seed(z.f, 10, 20, 20);
    A(z.f, z.f.unit(z.u.id), { type: 'combat/attack', targetId: z.a.id, mode: 'melee', mods: ['class:storm_hand.discharge#discharge'] });
    expect(lost(z.f.unit(z.b.id))).toBe(40); expect(condOn(z.f.unit(z.b.id), 'burning')).toBe(true); expect(z.f.unit(z.b.id).conds!.burning).toBe(2);
    expect(fxOf(z.f.cb, 'explode').at(-1)).toMatchObject({ element: 'fire', charges: 2 });
  });
});

// =================================================================================================== Will Power unlocks
describe('Will Power: Overdraw (item 539) and Pure Heart (item 540)', () => {
  it('Overdraw: a Pump adds 2 stages for its own AP (rules 1.14: once a turn, the first of a fight free of Strain; test/rules114-will-power.test.ts)', () => {
    const f = fightWith([{ ...SOUL, skills: { will_power: 3 } }], [{}]); clean(f); const u = f.turn(f.pc); u.ap = 9;
    const d = give(f.unit(u.id), {}); A(f, f.unit(u.id), { type: 'combat/outburst', design: d }); const s0 = f.pc.mg!.strain;
    A(f, f.unit(u.id), { type: 'combat/pump', mods: ['skill:will_power.3#overdraw'] });
    expect(f.pc.mg!.held!.stage).toBe(2); expect(f.pc.ap).toBe(7); expect(f.pc.mg!.strain).toBe(s0); // rules 1.8: the fight's first Pump is free
    A(f, f.unit(u.id), { type: 'combat/pump', mods: ['skill:will_power.3#overdraw'] }); expect(f.pc.mg!.held!.stage).toBe(3); // once a turn
  });
  it('Pure Heart: the first Strain that would short you this fight is refused; the Strain falls to the limit, no Stun', () => {
    const f = fightWith([{ ...SOUL, skills: { will_power: 5 } }], [{}]); clean(f); const u = f.turn(f.pc); u.ap = 9;
    f.unit(u.id).mg!.strainLimit = 3; f.unit(u.id).mg!.strain = 5;
    const d = give(f.unit(u.id), {}); A(f, f.unit(u.id), { type: 'combat/outburst', design: d });
    expect(f.pc.mg!.strain).toBe(3); expect(condOn(f.pc, 'stunned')).toBe(false); expect(logHas(f.cb, /Pure Heart/)).toBe(true);
    A(f, f.unit(u.id), { type: 'combat/letgo' }); f.unit(u.id).mg!.strain = 5; f.unit(u.id).ap = 9;
    A(f, f.unit(u.id), { type: 'combat/outburst', design: d }); expect(condOn(f.pc, 'stunned')).toBe(true); // once a fight
  });
});

// =================================================================================================== perks and traits
describe('Soul perks and traits under 1.5', () => {
  it('Hollow Heart (item 538): a Mana Short doesn\'t Stun you; the burn that Downs you leaves you stable', () => {
    const f = fightWith([{ ...SOUL, traits: ['hollow_heart'] }], [{}]); clean(f); const u = f.turn(f.pc); u.ap = 9;
    f.unit(u.id).mg!.strainLimit = 3; f.unit(u.id).mg!.strain = 5;
    const d = give(f.unit(u.id), {}); A(f, f.unit(u.id), { type: 'combat/outburst', design: d });
    expect(logHas(f.cb, /MANA SHORT/)).toBe(true); expect(condOn(f.pc, 'stunned')).toBe(false);
    f.unit(u.id).hp = 5; f.unit(u.id).mg!.strain = 5; f.unit(u.id).mg!.strainLimit = 3;
    A(f, f.unit(u.id), { type: 'combat/end-turn' });
    expect(f.unit(u.id).downed).toBe(true); expect(logHas(f.cb, /hollow and stable/)).toBe(true);
  });
  it('Hollow Heart\'s +10% reaches an elemental Outburst too', () => {
    const run = (traits: string[]) => { const f = fightWith([{ ...SOUL, traits }], [{}]); clean(f); const u = f.turn(f.pc); u.ap = 9; place(f, u, '2,2'); place(f, f.foe, '4,2');
      const d = give(f.unit(u.id), { tone: 'fire', modules: ['at_once'] }); A(f, f.unit(u.id), { type: 'combat/outburst', design: d, aim: '4,2' }); return lost(f.unit(f.foe.id)); };
    expect(run(['hollow_heart'])).toBe(Math.floor(run([]) * 1.1));
  });
  it('Verse of War: "In verse" rides a Release too (+1 tile of reach)', () => {
    const f = fightWith([{ ...SOUL, perks: { verse_of_war: 'achieved' } }], [{}]); clean(f); const u = f.turn(f.pc); u.ap = 9; place(f, u, '2,2'); place(f, f.foe, '7,2');
    const d = give(f.unit(u.id), { modules: ['at_once'] }); A(f, f.unit(u.id), { type: 'combat/outburst', design: d });
    expect(() => A(f, f.unit(u.id), { type: 'combat/release', aim: '7,2' })).toThrow(/Out of reach/);
    (f.cb.notes ||= []).push(f.g.characters[f.pc.charId!].name + ' (round ' + f.cb.round + '): "Hear me sing the storm"');
    A(f, f.unit(u.id), { type: 'combat/release', aim: '7,2', mods: ['verse'] });
    expect(lost(f.unit(f.foe.id))).toBe(Math.floor(Math.floor(20 * 0.8 * 0.8) * 1.1)); expect(f.cb.notes!.some((n) => /in verse/.test(n))).toBe(true);
  });
  it('Twin Souls (item 537): the third school lands at half strength with no roll, on the 1.5 stage table', () => {
    const f = fightWith([{ ...SOUL, perks: { twin_souls: 'achieved' } }], [{}]); clean(f); const u = f.turn(f.pc); u.ap = 9; place(f, u, '2,2'); place(f, f.foe, '4,2');
    const d = give(f.unit(u.id), { school: 'status', option: 'shaken' }); (f.unit(u.id).mg!.designs.find((x) => x.id === d) as any).school3 = 'damage';
    A(f, f.unit(u.id), { type: 'combat/outburst', design: d }); A(f, f.unit(u.id), { type: 'combat/pump' }); A(f, f.unit(u.id), { type: 'combat/pump' });
    A(f, f.unit(u.id), { type: 'combat/release', aim: '4,2' });
    expect(lost(f.unit(f.foe.id))).toBe(Math.floor(20 * stageMult(2) * 0.5));
    // 'outburst_after': the third school's line comes after the release's own line (it lands after the primary hit)
    const rel = f.cb.log.findIndex((l) => / releases /.test(l)), third = f.cb.log.findIndex((l) => /third school/.test(l));
    expect(rel).toBeGreaterThanOrEqual(0); expect(third).toBeGreaterThan(rel);
  });
});

describe('outburst_after: the post-release hook (Storm Front, Twin Souls land after the primary hit)', () => {
  it('Storm Front arcs after the bolt has landed: the release line first, then the arcs; hits name the creature hit', () => {
    const f = fightWith([cls('channeler', 2)], [{}, {}]); clean(f);
    const u = f.turn(f.pc); u.ap = 9; place(f, u, '2,2'); const [a, b] = f.foes; place(f, a, '6,2'); place(f, b, '7,2');
    const d = give(f.unit(u.id), {}); seed(f, 10, 10, 10);
    A(f, f.unit(u.id), { type: 'combat/outburst', design: d, mods: ['class:channeler.storm_front#storm'] });
    A(f, f.unit(u.id), { type: 'combat/release', aim: '6,2' });
    const rel = f.cb.log.findIndex((l) => / releases /.test(l)), arc = f.cb.log.findIndex((l) => /Storm Front arcs on/.test(l));
    expect(rel).toBeGreaterThanOrEqual(0); expect(arc).toBeGreaterThan(rel);
    const fx = f.cb.fx || [], ri = fx.findIndex((e: any) => e.k === 'release'), ci = fx.findIndex((e: any) => e.k === 'chain' && e.storm);
    expect(ci).toBeGreaterThan(ri); expect(lost(f.unit(b.id))).toBeGreaterThan(0);
  });
});
