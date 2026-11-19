// Rules 1.14, the Will Power changes: the review's own cases (the ways a fight can go wrong around Overdraw, Heart
// Overload and Resonance). Every move through apply(), as a player's click sends it.
import { describe, expect, it } from 'vitest';
import { designCost, manaOf, previewOutburst, previewOutburstPlan, togglesFor, stageMult, apply, type Combat, type Unit, type OutburstDesign } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import PERKS_J from '../../../data/perks.json';

type F = ReturnType<typeof fightWith>;
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fxOf = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];
const OD = 'skill:will_power.2#overdraw', AGAIN = 'perk:heart_overload#again', BLOOD = 'perk:heart_overload#pay_hp';
function clean(f: F) {
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  for (const x of cb.units) { x.hp = x.maxHp = 999; x.armour = 0; x.def = -40; x.sv = { body: -40, brain: -40, heart: -40 } as any; x.hidden = false; }
  for (const x of cb.units) if (x.mg) Object.assign(x.mg, { emanator: true, mp: 500, mpMax: 500, soulMult: 1, soulBoon: 1, deal: 1, soulBase: 20, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, firstUsed: true });
}
function soul(specs: CharSpec[]) {
  const f = fightWith(specs.map((s, i) => ({ ...SOUL, name: 'Caster ' + (i + 1), ...s })), [{ at: 'F6' }]);
  clean(f); f.pcs.forEach((p, i) => { f.unit(p.id).pos = '2,' + (5 + i); }); f.foe.pos = '5,5';
  const u = f.turn(f.pc); u.ap = 9;
  return f;
}
const give = (u: Unit, d: Partial<OutburstDesign> = {}): string => { const id = 'x' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'damage', modules: [], ...d } as OutburstDesign); return id; };
const A = (f: F, u: Unit, a: Record<string, any>, by?: string) => f.act({ unitId: u.id, ...a } as any, by);
const nextTurn = (f: F, u: Unit) => { f.cb.round += 1; const x = f.turn(u.id); x.ap = 9; return x; };
const toggles = (f: F, u: Unit, on: string, mods: string[] = []) => withGame(f.g, () => togglesFor({ u: f.unit(u.id), c: f.g.characters[u.charId!], cb: f.cb, g: f.g } as any, on, {}, mods));
function releaseAt(f: F, u: Unit, d: string, stage: number) {
  A(f, u, { type: 'combat/outburst', design: d, hold: true }); f.unit(u.id).mg!.held!.stage = stage; f.unit(u.id).ap = 9;
  A(f, u, { type: 'combat/release', aim: f.foe.pos });
}
const lastMult = (f: F): number => fxOf(f.cb, 'release').at(-1).mult;
const r2 = (n: number) => Math.round(n * 100) / 100;
const offered = (f: F, u: Unit) => toggles(f, u, 'combat/outburst').some((t) => t.id === AGAIN);

describe('Overdraw: the review', () => {
  const start = () => { const f = soul([{ skills: { will_power: 3 } }]); const d = give(f.pc); A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); f.unit(f.pc.id).ap = 9; return f; };
  it('a refused Overdraw Pump (no AP) changes nothing: the turn\'s use and the fight\'s free one are kept', () => {
    const f = start(); f.unit(f.pc.id).ap = 0; const g0 = f.g;
    expect(() => A(f, f.pc, { type: 'combat/pump', mods: [OD] })).toThrow(/Needs 1 AP/);
    expect(f.g).toBe(g0); expect(f.pc.mg!.held!.stage).toBe(0); expect(f.pc.uses?.['skill:will_power.2|per_turn']).toBeUndefined();
    f.unit(f.pc.id).ap = 1; A(f, f.pc, { type: 'combat/pump', mods: [OD] }); expect(f.pc.mg!.held!.stage).toBe(2); expect(f.pc.mg!.strain).toBe(1); // the Begin's 1 only
  });
  it('the Strain-free one is the first of the fight only: the third Overdraw costs 1 Strain like the second', () => {
    const f = start(); A(f, f.pc, { type: 'combat/pump', mods: [OD] });
    for (let i = 0; i < 2; i++) { const u = nextTurn(f, f.pc); u.mg!.held!.stage = 0; const s = u.mg!.strain; A(f, f.pc, { type: 'combat/pump', mods: [OD] }); expect(f.pc.mg!.strain).toBe(s + 1); expect(f.pc.mg!.held!.stage).toBe(2); }
  });
  it('only the unit\'s own player may send it', () => {
    const f = soul([{ skills: { will_power: 3 } }, {}, { owner: 'p2' }]); const d = give(f.pc); A(f, f.pc, { type: 'combat/outburst', design: d, hold: true });
    expect(() => A(f, f.pc, { type: 'combat/pump', mods: [OD] }, 'p2')).toThrow(/Not your unit/);
    expect(f.pc.mg!.held!.stage).toBe(0);
  });
  it('without the skill the switch does nothing', () => {
    const f = soul([{ skills: { will_power: 1 } }]); const d = give(f.pc); A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); // rules 1.75 item 6200: Overdraw at 2
    A(f, f.pc, { type: 'combat/pump', mods: [OD, 'overdraw'] }); expect(f.pc.mg!.held!.stage).toBe(1);
  });
});

// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Heart Overload: the review'

describe('Resonance: the review', () => {
  // rules 1.56 (Balance 2.0): a step is the perk's data (perks.json resonance, its stat_mod's value in percent)
  const RPCT: number = (PERKS_J as any).items.find((x: any) => x.id === 'resonance').tiers.I.effects[0].value, RST = RPCT / 100;
  const SNAP = stageMult(0);
  const snap = (f: F, u: Unit) => { f.unit(u.id).ap = 9; A(f, u, { type: 'combat/outburst', design: f.unit(u.id).mg!.designs[0].id, aim: f.foe.pos }); return lastMult(f); };
  it('a refused Release builds nothing', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); const d = f.pc.mg!.designs[0].id; f.unit(f.pc.id).ap = 0;
    expect(() => A(f, f.pc, { type: 'combat/outburst', design: d, aim: f.foe.pos })).toThrow();
    expect(snap(f, f.pc)).toBe(SNAP);
  });
  it('the steps are your own: an ally without the perk gets nothing from yours', () => {
    const f = soul([{ perks: { resonance: 'II' } }, {}]); const [a, b] = f.pcs; snap(f, a); snap(f, a);
    f.cb.round += 1; f.turn(b.id); expect(snap(f, b)).toBe(SNAP);
  });
  it('II: an enemy\'s Release adds nothing, and your own Release is one step, not two', () => {
    const f = soul([{ perks: { resonance: 'II' } }]); snap(f, f.pc);
    expect(f.pc.ps!['perk:resonance'].steps).toBe(1);
  });
  it('the preview of the next Release names the same bonus the Release then gets', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); const d = f.pc.mg!.designs[0].id; snap(f, f.pc); snap(f, f.pc); f.unit(f.pc.id).ap = 9;
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); f.unit(f.pc.id).mg!.held!.stage = 3;
    const pv = withGame(f.g, () => previewOutburstPlan(f.cb, f.pc, 'held', f.foe.pos));
    expect(pv.multNotes).toEqual(['Resonance +' + 2 * RPCT + '%']);
    A(f, f.pc, { type: 'combat/release', aim: f.foe.pos }); expect(lastMult(f)).toBe(pv.mult); expect(pv.mult).toBe(r2(stageMult(3) * (1 + 2 * RST)));
  });
  it('a design planned with Pumps ("Begin, Pump twice, Release") shows the bonus too', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); const d = f.pc.mg!.designs[0].id; snap(f, f.pc); f.unit(f.pc.id).ap = 9;
    const pv = withGame(f.g, () => previewOutburstPlan(f.cb, f.pc, d, f.foe.pos, { stage: 2 }));
    expect(pv.mult).toBe(r2(stageMult(2) * (1 + RST))); expect(pv.multNotes).toEqual(['Resonance +' + RPCT + '%']);
  });
  it('a held Outburst that swells over a turn keeps what was built, and its Release uses it', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); const d = f.pc.mg!.designs[0].id; snap(f, f.pc); f.unit(f.pc.id).ap = 9;
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); A(f, f.pc, { type: 'combat/end-turn' });
    const u = nextTurn(f, f.pc), st = u.mg!.held!.stage;
    A(f, f.pc, { type: 'combat/release', aim: f.foe.pos }); expect(lastMult(f)).toBe(r2(stageMult(st) * (1 + RST)));
  });
  it('junk in a save\'s counter never goes over the ceiling or under nothing', () => {
    for (const [junk, want] of [[99, r2(SNAP * (1 + 2 * RST))], [-3, SNAP], ['x', SNAP], [1.9, r2(SNAP * (1 + RST))]] as const) {
      const f = soul([{ perks: { resonance: 'I' } }]); (f.pc.ps ||= {} as any)['perk:resonance'] = { steps: junk };
      expect(snap(f, f.pc)).toBe(want);
    }
  });
});
