// Rules 1.70 (0.32 step 1): the six approved primitives, each through the reducer (a real turn start, a real action, a
// real enemy blow through resolveAttack). The listeners are fixture relics (data rows with a `say`), held by the unit.
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { fluxMaxOf, resolveAttack, type Unit } from '../src';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { RESOURCES, resLimitOf } from '../src/effects/cost';
import { fightWith, withGame } from './helpers/perkfight';

const RELICS = [
  { id: 'test_flux_up', name: 'Flux up (test)', text: 'At your turn start: +1 Flux; then a line if your Flux is at its limit.',
    effects: [{ op: 'resource', when: 'turn_start', resource: 'flux', value: 1 }, { op: 'use', when: 'turn_start', if: { self_res: { flux: { at: 'limit' } } }, say: 'TEST FLUX AT LIMIT: {self}' }] },
  { id: 'test_strain_limit', name: 'Strain at its limit (test)', text: 'At your turn start: a line if your Strain is at its limit.',
    effects: [{ op: 'use', when: 'turn_start', if: { self_res: { strain: { at: 'limit' } } }, say: 'TEST STRAIN AT LIMIT: {self}' }] },
];
beforeAll(() => addItems('relic', RELICS));
afterAll(() => clearAddedItems());

const lines = (f: any, tag: string) => f.cb.log.filter((l: string) => l.startsWith(tag));
function caster(relics: string[]) {
  const f = fightWith([{ name: 'Caster', archetype: 'stormcaller', kit: 'soul', relics }], [{ tier: 'minion' }]);
  for (const e of f.foes) e.hp = e.maxHp = 99999;
  return f;
}

describe('P1: Flux is a resource row (rules 1.70 item 5542)', () => {
  it('is a row of data/actions.json resources with its setter', () => {
    expect(RESOURCES.flux).toMatchObject({ path: 'mg.flux', setter: 'flux' });
  });
  it('an item\'s resource op raises Flux through the one Flux function: past the limit the Evoker overloads', () => {
    const f = caster(['test_flux_up']);
    const max = withGame(f.g, () => fluxMaxOf(f.pc, f.cb));
    f.unit(f.pc.id).mg!.flux = max - 3;
    f.turn(f.pc);
    expect(f.unit(f.pc.id).mg!.flux).toBe(max - 2);
    f.unit(f.pc.id).mg!.flux = max;
    f.turn(f.pc);
    expect(f.unit(f.pc.id).mg!.flux).toBe(0); // the overload empties it
    expect(f.cb.log.some((l: string) => /OVERLOAD/.test(l))).toBe(true);
  });
});

describe('P2: the resource predicate\'s at: "limit" (rules 1.70 item 5543)', () => {
  it('Flux: true at its limit, false under it', () => {
    const f = caster(['test_flux_up']);
    const max = withGame(f.g, () => fluxMaxOf(f.pc, f.cb));
    expect(withGame(f.g, () => resLimitOf(f.pc, 'flux'))).toBe(max);
    f.unit(f.pc.id).mg!.flux = max - 2; f.turn(f.pc);
    expect(lines(f, 'TEST FLUX AT LIMIT')).toEqual([]);
    f.unit(f.pc.id).mg!.flux = max - 1; f.turn(f.pc);
    expect(lines(f, 'TEST FLUX AT LIMIT')).toEqual(['TEST FLUX AT LIMIT: Caster']);
  });
  it('Strain: true at or over the heart\'s limit, false under it', () => {
    const f = caster(['test_strain_limit']);
    const u = (): Unit => f.unit(f.pc.id), lim = u().mg!.strainLimit;
    expect(resLimitOf(u(), 'strain')).toBe(lim);
    // (a turn's start calms the heart by 1 before turn_start: the Strain read is the one after it)
    u().mg!.strain = lim; f.turn(f.pc);
    expect(u().mg!.strain).toBe(lim - 1);
    expect(lines(f, 'TEST STRAIN AT LIMIT')).toEqual([]);
    u().mg!.strain = lim + 1; f.turn(f.pc);
    expect(u().mg!.strain).toBe(lim);
    expect(lines(f, 'TEST STRAIN AT LIMIT')).toHaveLength(1);
    u().mg!.strain = lim + 2; f.turn(f.pc);
    expect(lines(f, 'TEST STRAIN AT LIMIT')).toHaveLength(2); // over it holds too
  });
});

// ---------------------------------------------------------------------------------------------- P4, P5
import { physFight, rig } from './helpers/physfight';
import { loseReactions } from '../src/tactics';

const MORE: any[] = [
  { id: 'test_seen_close', name: 'Seen only close (test)', text: 'Others\' eyes see you 8 tiles less far.', effects: [{ op: 'stat_mod', stat: 'seen_range', value: -8 }] },
  { id: 'test_two_reactions', name: 'Two reactions (test)', text: 'One more reaction a round.', effects: [{ op: 'stat_mod', stat: 'reactions', value: 1 }] },
];
beforeAll(() => addItems('relic', MORE));

describe('P4: the stat seen_range (rules 1.70 item 5545)', () => {
  /** A PC 8 tiles from a foe on open ground; Hide through the reducer. */
  function hideFrom(relics: string[]) {
    const f = fightWith([{ name: 'Sneak', relics }], [{ tier: 'soldier', at: '10,5' }]);
    f.cb.objects = []; f.unit(f.pc.id).pos = '2,5'; f.unit(f.foe.id).pos = '10,5';
    f.turn(f.pc);
    let err: string | null = null;
    try { f.act({ type: 'combat/hide', unitId: f.pc.id } as any); } catch (e: any) { err = String(e?.message || e); }
    return { err, hidden: !!f.unit(f.pc.id).hidden };
  }
  it('plain: the foe 8 tiles off sees the PC, so it cannot Hide in the open', () => {
    const r = hideFrom([]);
    expect(r.hidden).toBe(false); expect(r.err).toBeTruthy();
  });
  it('seen_range -8: the foe\'s eyes reach it 8 tiles less far, so it Hides', () => {
    const r = hideFrom(['test_seen_close']);
    expect(r.err).toBeNull(); expect(r.hidden).toBe(true);
  });
});

describe('P5: react()\'s refusals read before Parry rolls (rules 1.70 item 5546)', () => {
  /** A Parry tank with two reactions a round, one already spent; holding a shot (held) or not; the foe's blow through resolveAttack. */
  function blowOn(held: boolean) {
    const f = physFight([{ weapon: 'hand_wraps', known: ['parry'], relics: ['test_two_reactions'], skills: { durability: 7, dexterity: 1, athletics: 0, raw_power: 0 } }], [{ tier: 'soldier', weapon: 'maul' }]);
    f.cb.objects = []; f.put(f.pcs[0], 'C5'); const a = f.cb.units.find((u) => u.side === 'foe')!; f.put(a, 'D5'); a.hp = a.maxHp = 900; a.attack = 60;
    const t = f.unit(f.pcs[0].id); t.hp = t.maxHp; t.armour = 0;
    (f.char(f.pcs[0]) as any).phys.answers = ['parry'];
    // the blow is the foe's own, in its turn: the reducer's combat/end-turn hands the turn to the enemy AI (m8, the real path)
    f.cb.order = [t.id, a.id]; f.cb.round = 1; f.turn(t);
    withGame(f.g, () => loseReactions(f.cb, f.unit(t.id), 1)); // one of its two spent: the last is the held shot's when it holds one
    if (held) f.unit(t.id).overwatch = 'melee' as any;
    rig({ hit: true, die: 12 }); f.act({ type: 'combat/end-turn', unitId: t.id } as any); rig(null);
    expect(f.cb.log.some((l: string) => l.startsWith(a.name + ' ') && /: d20 /.test(l)), 'the foe swung in its own turn').toBe(true);
    return f.cb.log.filter((l: string) => / parries/.test(l)).length;
  }
  it('with its last reaction free, the Parry is rolled', () => { expect(blowOn(false)).toBe(1); });
  it('with its last reaction kept for a held shot, no Parry is rolled (and none said)', () => { expect(blowOn(true)).toBe(0); });
});

// ---------------------------------------------------------------------------------------------- P3
import { figFight } from './helpers/figfight';
import ACTIONSJ from '../../../data/actions.json';
const P3_RELIC = { id: 'test_free_figment_order', name: 'Free order to a Figment (test)', text: 'An order to one of your Figments costs no AP.',
  effects: [{ op: 'cost_mod', when: 'cost', if: { action: ['figment_order'], target_kind: ['figment'] }, set: 0 }] };
beforeAll(() => addItems('relic', [P3_RELIC]));

describe('P3: the target-aware price (rules 1.70 item 5544)', () => {
  /** A Visualization 1 caster pictures a Double and orders it to Draw fire (combat/owned): the AP the order took. */
  function orderAp(relics: string[]) {
    const f = figFight([{ skills: { visualization: 1 }, weapon: 'service_pistol', relics, forms: ['double', 'snare'] }], [{ at: '12,4', classic: true }]);
    let u = f.turn(f.pc); f.picture(u, 'double', '3,4'); u = f.unit(u.id); const d = f.figments(u)[0]; u.ap = 6;
    f.order(u, d, 'figment_draw_fire');
    return 6 - f.unit(u.id).ap;
  }
  it('the cost trigger names the ordered Figment as its target: a data row aimed at a figment makes the order free', () => {
    const plain = orderAp([]);
    expect(plain).toBe((ACTIONSJ as any).costs.figment_order.ap);
    expect(orderAp(['test_free_figment_order'])).toBe(0);
  });
});
