// Classes 3.0 step 8 (rules 1.34; docs/design/figments-spec.md): Figments and the Visualizer, Expression's door, one test
// per rule of the spec's section 2, the forms' verbs, designs and the ladder. Every number is read from the data.
import { describe, it, expect } from 'vitest';
import { figFight } from './helpers/figfight';
import { withGame, storyWith } from './helpers/perkfight';
import FIGJ from '../../../data/figments.json';
import RULESJ from '../../../data/rules.json';
import ENEMIESJ from '../../../data/enemies.json';
import ACTIONSJ from '../../../data/actions.json';
import ITEMSJ from '../../../data/items.json';
import { ladderAt, projectionRange, heldMax, figmentCharge, setFigmentDesign, designsMax, pictureOptions, FORM, FIG_TRAIT, isFigment, figmentMeter, levelFactor, enemyLevelRow, mod, applyCond, condOn, perceivedFoes, isGhost, actionsFor, applyDamage, emit } from '../src';

const F: any = FIGJ, R: any = RULESJ, ACT: any = ACTIONSJ;
const cost = (site: string) => ACT.costs[site].ap;
const lvl = (n: number) => enemyLevelRow(n) as any;
const SPOT = '3,4', FAR = '12,4';

describe('figments: the data', () => {
  it('the Visualizer is the third focus: off hand, its own door; vcharge is a resource; the verbs are cost sites', () => {
    const v = (ITEMSJ as any).items.find((x: any) => x.id === 'visualizer');
    expect(v).toMatchObject({ category: 'focus', slot: 'off_hand', door: 'visualizer' });
    expect(ACT.resources.vcharge.path).toBe('mg.vcharge');
    for (const s of ['picture', 'let_go', 'figment_strike', 'figment_pounce', 'figment_cut', 'figment_stare']) expect(typeof cost(s)).toBe('number');
    expect(R.output.profiles.figment.level).toBe('deal'); expect(R.output.factors.figment).toBeGreaterThan(0);
    expect(R.balance.ceilings.figments.allin).toBeGreaterThan(R.balance.ceilings.figments.door_allin);
    for (const t of (ENEMIESJ as any).items) expect('owned_weight' in t && 'double_save' in t).toBe(true);
  });
  it('the ladder: the door at Visualization 1 (the Double, one held), Eye and Wall at 3, Beast and Blade and two held at 5, three at 7', () => {
    expect(ladderAt(0)).toMatchObject({ held: 0, forms: [] });
    expect(ladderAt(1)).toMatchObject({ held: 1, forms: ['double'], designs: 0, traits: 0 });
    expect(ladderAt(3).forms).toEqual(['double', 'eye', 'wall']); expect(ladderAt(3)).toMatchObject({ designs: 2, traits: 1 });
    expect(ladderAt(5)).toMatchObject({ held: 2, designs: 3 }); expect(ladderAt(5).forms).toContain('beast');
    expect(ladderAt(7)).toMatchObject({ held: 3, traits: 2 }); expect(ladderAt(9).noSnap).toBe(true); expect(ladderAt(10).designs).toBe(5);
    for (const f of F.forms) expect(ladderAt(f.opens.min).forms).toContain(f.id);
  });
});

describe('figments: rules 1.34 section 2', () => {
  const beastFight = (o: any = {}) => figFight([{ skills: { visualization: 5, ...(o.skills || {}) }, level: o.level ?? 5, weapon: 'service_pistol', classId: o.classId, visualizer: o.visualizer }], o.foes || [{ tier: 'soldier', at: '9,4', classic: true }]);
  it('rule 1: Picture needs the Visualizer in hand; a carried one keeps what is held; the core swap refills it (swap_core AP, a spare core)', () => {
    const f = beastFight({ visualizer: 'pack' }); let u = f.turn(f.pc);
    expect(() => f.picture(u, 'beast', SPOT)).toThrow(/Visualizer in hand/);
    const g = beastFight(); u = g.turn(g.pc); g.picture(u, 'beast', SPOT); u = g.unit(u.id);
    const left = u.mg!.vcharge!; expect(left).toBe(F.visualizer.charge - FORM.beast.charge);
    const ap = u.ap, cores = u.mg!.cores; g.act({ type: 'combat/perk', unitId: u.id, id: 'verb:visualizer_core' } as any); u = g.unit(u.id);
    expect(u.mg!.vcharge).toBe(F.visualizer.charge); expect(u.mg!.cores).toBe(cores - 1); expect(ap - u.ap).toBe(cost('swap_core'));
  });
  it('rule 2: Picture costs its AP and the design\'s charge, on a free tile your side sees within 4 + Visualization', () => {
    const f = beastFight(); let u = f.turn(f.pc); const ap = u.ap;
    expect(projectionRange(u)).toBe(F.visualizer.range.base + F.visualizer.range.per_point * 5);
    expect(() => f.picture(u, 'beast', FAR)).toThrow(/projection range/);
    expect(() => f.picture(u, 'beast', u.pos)).toThrow(/free/);
    f.picture(u, 'beast', SPOT); u = f.unit(u.id);
    expect(ap - u.ap).toBe(cost('picture')); expect(f.figments(u).length).toBe(1);
    expect(figmentCharge('beast', ['swift'])).toBe(FORM.beast.charge + F.trait_charge);
    expect(figmentCharge('double', ['hollow'])).toBe(Math.max(1, FORM.double.charge + F.trait_charge + FIG_TRAIT.hollow.charge));
  });
  it('rule 3: held: 1 at Visualization 1, 2 at 5; a Picture over it is refused; the Rigger holds one more', () => {
    const f = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol' }]); let u = f.turn(f.pc);
    expect(heldMax(u)).toBe(1); f.picture(u, 'double', SPOT); u = f.unit(u.id);
    expect(() => f.picture(u, 'double', '3,5')).toThrow(/Hold is full/);
    const r = beastFight({ classId: 'trickster' }); u = r.turn(r.pc); expect(heldMax(u)).toBe(ladderAt(5).held + 1);
  });
  it('rule 4: upkeep: 1 charge a Figment at your turn start; the third held costs 1 AP; short of charge, one unravels', () => {
    const f = figFight([{ skills: { visualization: 7 }, level: 5, weapon: 'service_pistol' }]); let u = f.turn(f.pc);
    f.picture(u, 'double', SPOT); f.picture(u, 'double', '3,5'); u = f.unit(u.id); u.ap = 6; f.picture(u, 'wall', '3,3'); u = f.unit(u.id);
    expect(f.figments(u).length).toBe(3);
    const before = u.mg!.vcharge!; u = f.turn(u);
    expect(u.mg!.vcharge).toBe(before - 3 * F.upkeep.n); expect(u.ap).toBe(6 - F.upkeep.ap);
    u.mg!.vcharge = 1; u = f.turn(u); expect(f.figments(u).length).toBeLessThan(3);
  });
  it('rule 5: acting through: your AP, d20 + your Visualization modifier, its weapon on the figment profile at your level x the Figment factor', () => {
    const f = beastFight(); let u = f.turn(f.pc); f.picture(u, 'beast', SPOT); u = f.unit(u.id); f.foe.pos = '4,4';
    const b = f.figments(u)[0], prof = R.output.profiles.figment;
    expect(b.attack).toBe(mod(5)); expect(b.lvlDmg).toBeCloseTo(prof.k * levelFactor(prof.level, 5) * R.output.factors.figment, 3);
    expect(b.maxHp).toBe(Math.round(FORM.beast.hp * lvl(5).damage_mult * lvl(5).hp_mult));
    const ap = u.ap; f.order(u, b, 'figment_strike', { targetId: f.foe.id }); u = f.unit(u.id);
    expect(ap - u.ap).toBe(cost('figment_strike'));
    const last = f.cb.log.map((l: any) => l.text || l).filter((s: string) => /Beast/.test(s)).pop(); expect(last).toMatch(/d20/);
  });
  it('rule 6: Let go gives half its charge back (rounded down); a destroyed Figment gives nothing and Snaps (−1 AP); not from Visualization 9', () => {
    const f = beastFight(); let u = f.turn(f.pc); f.picture(u, 'beast', SPOT); u = f.unit(u.id);
    const was = u.mg!.vcharge!; f.order(u, f.figments(u)[0], 'let_go'); u = f.unit(u.id);
    expect(u.mg!.vcharge).toBe(was + Math.floor(FORM.beast.charge * (F.verbs.find((v: any) => v.id === 'let_go').refund_share)));
    expect(f.figments(u).length).toBe(0);
    u.ap = 6; f.picture(u, 'beast', SPOT); u = f.unit(u.id); const b = f.figments(u)[0], c0 = u.mg!.vcharge;
    withGame(f.g, () => { b.hp = 1; applyCond(f.cb, f.g.rng, null, b, 'bleeding'); }); // immune: still standing
    expect(f.figments(u).length).toBe(1);
    withGame(f.g, () => { applyDamage(f.cb, b, 999, { by: f.foe, type: 'weapon' } as any); });
    u = f.turn(u); expect(f.figments(u).length).toBe(0); expect(u.mg!.vcharge).toBe(c0); expect(u.ap).toBe(6 - F.let_go.snap_ap);
  });
  it('rule 7: your Downed or Stunned unravels them all; Silenced stops Picture but they stay; out of range at your turn end unravels', () => {
    const f = beastFight(); let u = f.turn(f.pc); f.picture(u, 'beast', SPOT); u = f.unit(u.id);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, null, u, 'silenced', 1, undefined, { skipSave: true }));
    expect(f.figments(u).length).toBe(1); expect(() => f.picture(u, 'beast', '3,5')).toThrow(/Silenced/);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, null, u, 'stunned', 1, undefined, { skipSave: true }));
    expect(f.figments(u).length).toBe(0);
    const g = beastFight(); u = g.turn(g.pc); g.picture(u, 'beast', SPOT); u = g.unit(u.id); const b = g.figments(u)[0];
    b.pos = '15,9'; g.act({ type: 'combat/end-turn', unitId: u.id } as any); expect(g.figments(u).length).toBe(0);
  });
  it('rule 8: a Figment has no turn of its own, never saves (immune to every condition), the Wall is unpushable', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }]); let u = f.turn(f.pc); f.picture(u, 'wall', SPOT); u = f.unit(u.id);
    const w = f.figments(u)[0]; expect(f.cb.order).not.toContain(w.id);
    for (const c of ['prone', 'fear', 'shaken', 'bleeding', 'stunned']) { withGame(f.g, () => applyCond(f.cb, f.g.rng, u, w, c, 1)); expect(condOn(w, c)).toBe(false); }
    expect(f.cb.units.find((x) => x.id === w.id)).toBeTruthy();
  });
  it('rule 9: only the Eye sees for your side; every other form has no eyes', () => {
    for (const fm of F.forms) expect(!!fm.eyes).toBe(fm.id === 'eye');
    const f = figFight([{ skills: { visualization: 3 }, weapon: 'service_pistol' }]); let u = f.turn(f.pc); f.picture(u, 'eye', SPOT); u = f.unit(u.id);
    const e = f.figments(u)[0]; expect(e.eyes).not.toBe(false); expect(e.vision).toBe(FORM.eye.vision);
  });
  it('the meter: held / most, charge / core', () => {
    const f = beastFight(); let u = f.turn(f.pc); f.picture(u, 'beast', SPOT); u = f.unit(u.id);
    expect(figmentMeter(f.cb, u)).toEqual({ held: 1, max: ladderAt(5).held, charge: F.visualizer.charge - FORM.beast.charge, chargeMax: F.visualizer.charge });
  });
  it('rule 16: the fight\'s end unravels every Figment', () => {
    const f = beastFight(); let u = f.turn(f.pc); f.picture(u, 'beast', SPOT); u = f.unit(u.id);
    withGame(f.g, () => emit(f.cb, 'combat_end', { cb: f.cb, won: true, g: f.g }));
    expect(f.cb.units.filter((x: any) => isFigment(x)).length).toBe(0);
  });
});

describe('figments: the Double and the enemies (the tier table)', () => {
  it('a Minion (no double_save) is always fooled: it sees you where the Double stands; its attack lands on the Double and finds it out', () => {
    const f = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol' }], [{ tier: 'minion', at: '6,4', classic: true }]); let u = f.turn(f.pc);
    f.picture(u, 'double', SPOT); u = f.unit(u.id); const d = f.figments(u)[0], m = f.foe;
    const seen = withGame(f.g, () => perceivedFoes(f.cb, m)); const ghost = seen.find((x) => isGhost(x))!;
    expect(ghost.pos).toBe(d.pos); expect(seen.some((x) => x.id === d.id)).toBe(false); expect(seen.some((x) => x.id === u.id)).toBe(false);
    expect((ENEMIESJ as any).items.find((t: any) => t.id === 'minion').double_save).toBeNull();
  });
  it('the tiers that save: Soldier 0, Elite +2, Boss +3 (enemies.json double_save); owned_weight puts a character before a Figment for a Soldier', () => {
    const T = Object.fromEntries((ENEMIESJ as any).items.map((t: any) => [t.id, t]));
    expect([T.soldier.double_save, T.elite.double_save, T.boss.double_save]).toEqual([0, 2, 3]);
    expect([T.vermin.owned_weight, T.minion.owned_weight]).toEqual([0, 0]); expect(T.soldier.owned_weight).toBeGreaterThan(0);
  });
});

describe('figments: the forms\' verbs', () => {
  it('Pounce: a straight line then a strike (its own AP); Stare: the target is Watched (seen by your side)', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }], [{ tier: 'soldier', at: '7,4', classic: true }]); let u = f.turn(f.pc);
    f.picture(u, 'beast', '3,7'); u = f.unit(u.id); const b = f.figments(u)[0]; u.ap = 6; f.foe.pos = '7,7';
    f.order(u, b, 'figment_pounce', { targetId: f.foe.id }); u = f.unit(u.id);
    expect(6 - u.ap).toBe(cost('figment_pounce')); expect(f.unit(b.id).pos).toBe('6,7');
    const g = figFight([{ skills: { visualization: 3 }, weapon: 'service_pistol' }], [{ tier: 'soldier', at: '7,4', classic: true }]); u = g.turn(g.pc);
    g.picture(u, 'eye', SPOT); u = g.unit(u.id); g.foe.pos = '7,4'; g.order(u, g.figments(u)[0], 'figment_stare', { targetId: g.foe.id }); expect(condOn(g.foe, 'watched')).toBe(true);
  });
  it('the descriptors: a Figment\'s verbs are rows of its owner\'s panel, priced at their sites', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }]); let u = f.turn(f.pc); f.picture(u, 'beast', SPOT); u = f.unit(u.id);
    const rows = actionsFor(f.g, u.id).filter((d) => d.id.startsWith('ow:'));
    expect(rows.map((d) => d.name.replace(/^.*: /, ''))).toEqual(['Move', 'Strike', 'Pounce', 'Let go']);
    expect(rows.find((d) => /Pounce/.test(d.name))!.cost.ap).toBe(cost('figment_pounce'));
  });
});

describe('figments: designs', () => {
  it('a design is a form and its traits; the ready count, the traits a design and the forms opened are the ladder\'s', () => {
    const f = figFight([{ skills: { visualization: 5 }, weapon: 'service_pistol' }]); const c = f.g.characters[f.pc.charId!];
    expect(designsMax(c)).toBe(ladderAt(5).designs);
    expect(setFigmentDesign(c, { id: 'h', name: 'Hound', form: 'beast', traits: ['swift'] })).toBeNull();
    expect(setFigmentDesign(c, { id: 'x', name: 'X', form: 'beast', traits: ['swift', 'keen'] })).toMatch(/trait/);
    c.skills.visualization = 1; expect(setFigmentDesign(c, { id: 'y', name: 'Y', form: 'wall', traits: [] })).toMatch(/Visualization/);
    c.skills.visualization = 5; expect(pictureOptions(c)[0]).toMatchObject({ id: 'd:h' });
  });
  it('figments/design: kept out of a fight through the reducer; refused in one', () => {
    const s = storyWith([{ skills: { visualization: 5 } }]); const id = s.chars[0].id;
    s.act({ type: 'figments/design', charId: id, design: { id: 'h', name: 'Hound', form: 'beast', traits: ['swift'] } } as any);
    expect(s.g.characters[id].figments).toEqual([{ id: 'h', name: 'Hound', form: 'beast', traits: ['swift'] }]);
    s.act({ type: 'figments/design', charId: id, drop: 'h' } as any); expect(s.g.characters[id].figments).toEqual([]);
  });
  it('a pictured design carries its traits (Swift +2 tiles an AP, Armoured HP x1.5)', () => {
    const f = figFight([{ skills: { visualization: 7 }, level: 1, weapon: 'service_pistol' }]); const c = f.g.characters[f.pc.charId!];
    setFigmentDesign(c, { id: 'h', name: 'Hound', form: 'beast', traits: ['swift', 'armoured'] });
    let u = f.turn(f.pc); f.picture(u, 'd:h', SPOT); u = f.unit(u.id); const b = f.figments(u)[0];
    expect(b.name).toBe('Hound'); expect(b.movement).toBe(FORM.beast.movement + FIG_TRAIT.swift.tiles);
    expect(b.maxHp).toBe(Math.round(FORM.beast.hp * FIG_TRAIT.armoured.hp_mult * lvl(1).damage_mult * lvl(1).hp_mult));
    expect(u.mg!.vcharge).toBe(F.visualizer.charge - figmentCharge('beast', ['swift', 'armoured']));
  });
});

