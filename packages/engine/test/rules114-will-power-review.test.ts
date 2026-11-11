// Rules 1.14, the Will Power changes: the review's own cases (the ways a fight can go wrong around Overdraw, Heart
// Overload and Resonance). Every move through apply(), as a player's click sends it.
import { describe, expect, it } from 'vitest';
import { designCost, manaOf, previewOutburst, previewOutburstPlan, togglesFor, stageMult, apply, type Combat, type Unit, type OutburstDesign } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fxOf = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];
const OD = 'skill:will_power.3#overdraw', AGAIN = 'perk:heart_overload#again', BLOOD = 'perk:heart_overload#pay_hp';
function clean(f: F) {
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  for (const x of cb.units) { x.hp = x.maxHp = 999; x.armour = 0; x.def = -40; x.sv = { body: -40, brain: -40, heart: -40 } as any; x.hidden = false; }
  for (const x of cb.units) if (x.mg) Object.assign(x.mg, { emanator: true, mp: 500, mpMax: 500, soulMult: 1, soulBase: 20, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, firstUsed: true });
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
    expect(f.g).toBe(g0); expect(f.pc.mg!.held!.stage).toBe(0); expect(f.pc.uses?.['skill:will_power.3|per_turn']).toBeUndefined();
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
    const f = soul([{ skills: { will_power: 2 } }]); const d = give(f.pc); A(f, f.pc, { type: 'combat/outburst', design: d, hold: true });
    A(f, f.pc, { type: 'combat/pump', mods: [OD, 'overdraw'] }); expect(f.pc.mg!.held!.stage).toBe(1);
  });
});

describe('Heart Overload: the review', () => {
  const start = (tier: 'I' | 'II' = 'I', more: CharSpec[] = []) => { const f = soul([{ perks: { heart_overload: tier } }, ...more]); const d = give(f.pc); return { f, d }; };
  it('plain speech does not end the offer', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2);
    f.act({ type: 'combat/say', charId: f.pc.charId!, text: 'Again!' } as any);
    expect(offered(f, f.pc)).toBe(true); f.unit(f.pc.id).ap = 0;
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(f.pc.mg!.held).toMatchObject({ design: d, stage: 0 });
  });
  it('a refused Begin (blood switched off, no mana) leaves the offer standing and nothing spent', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2); f.unit(f.pc.id).mg!.mp = 0; f.unit(f.pc.id).ap = 0;
    expect(() => A(f, f.pc, { type: 'combat/outburst', design: d, hold: true, mods: ['!' + BLOOD] })).toThrow(/Needs \d+ MP/);
    expect(offered(f, f.pc)).toBe(true); expect(f.pc.uses?.['perk:heart_overload|per_turn']).toBeUndefined();
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(f.pc.mg!.held).toMatchObject({ design: d }); expect(f.pc.hp).toBeLessThan(999);
  });
  it('blood never drops you: with HP at or under the price the free Begin is refused, and no HP is lost', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2);
    const m = f.unit(f.pc.id).mg!, cost = designCost(m, m.designs.find((x) => x.id === d)!, manaOf(f.cb)); m.mp = 0; f.unit(f.pc.id).hp = cost;
    expect(withGame(f.g, () => previewOutburst(f.cb, f.pc, d, undefined, false))).toMatchObject({ ok: false, hp: cost });
    expect(() => A(f, f.pc, { type: 'combat/outburst', design: d, hold: true })).toThrow(/would drop you/);
    expect(f.pc.hp).toBe(cost); expect(f.pc.mg!.held).toBeFalsy();
  });
  it('the price a screen asks for leaves the fight untouched (the same state, the same switches)', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2); f.unit(f.pc.id).mg!.mp = 0;
    const before = JSON.stringify(f.g.combat);
    toggles(f, f.pc, 'combat/outburst'); withGame(f.g, () => previewOutburst(f.cb, f.pc, d, undefined, false)); withGame(f.g, () => previewOutburstPlan(f.cb, f.pc, d, f.foe.pos));
    expect(JSON.stringify(f.g.combat)).toBe(before); expect('mods' in (f.cb as any)).toBe(false);
  });
  it('a blood-paid Outburst heals nothing even when Resonance speaks at its Release', () => {
    const run = (blood: boolean) => {
      const f = soul([{ perks: { heart_overload: 'I', resonance: 'I' } }, {}]); const d = give(f.pc, { modules: ['burst'] });
      const [a, b] = f.pcs; f.unit(b.id).pos = '5,6';
      releaseAt(f, a, d, 2); f.unit(b.id).hp = 500;
      if (blood) f.unit(a.id).mg!.mp = 0;
      A(f, a, { type: 'combat/outburst', design: d, hold: true });
      const h = f.unit(a.id).mg!.held!; h.stage = 2; h.felt = ['love']; h.feltAt = [1]; f.unit(a.id).ap = 9;
      A(f, a, { type: 'combat/release', aim: f.foe.pos });
      expect(logHas(f.cb, /keeps the beat: \+10% to this Release/)).toBe(true);
      return f.unit(b.id).hp - 500;
    };
    expect(run(false)).toBeGreaterThan(0); expect(run(true)).toBe(0);
  });
  it('a blood-paid Outburst heals nothing even when its Release kills first (the fight\'s log moves on before the healing)', () => {
    const run = (blood: boolean) => {
      const f = fightWith([{ ...SOUL, name: 'Caster 1', perks: { heart_overload: 'I' } }, { ...SOUL, name: 'Caster 2' }], [{ at: 'F6' }, { at: 'F7' }, { at: 'H8' }]);
      clean(f); f.pcs.forEach((p, i) => { f.unit(p.id).pos = '2,' + (5 + i); }); f.foes[0].pos = '5,5'; f.foes[1].pos = '5,4'; f.foes[2].pos = '9,9';
      f.turn(f.pc).ap = 9; const d = give(f.pc, { modules: ['burst'] });
      const [a, b] = f.pcs; f.unit(b.id).pos = '5,6';
      releaseAt(f, a, d, 2); f.unit(b.id).hp = 500; f.foes[0].hp = 1; f.foes[1].hp = 1;
      if (blood) f.unit(a.id).mg!.mp = 0;
      A(f, a, { type: 'combat/outburst', design: d, hold: true });
      const h = f.unit(a.id).mg!.held!; h.stage = 2; h.felt = ['love']; h.feltAt = [1]; f.unit(a.id).ap = 9;
      A(f, a, { type: 'combat/release', aim: f.foes[0].pos });
      return f.unit(b.id).hp - 500;
    };
    expect(run(false)).toBeGreaterThan(0); expect(run(true)).toBe(0);
  });
  it('blood is spent with the Release: the next Outburst, paid in mana, heals again', () => {
    const f = soul([{ perks: { heart_overload: 'I' } }, {}]); const d = give(f.pc, { modules: ['burst'] });
    const [a, b] = f.pcs; f.unit(b.id).pos = '5,6';
    releaseAt(f, a, d, 2); f.unit(a.id).mg!.mp = 0;
    A(f, a, { type: 'combat/outburst', design: d, hold: true }); f.unit(a.id).ap = 9;
    A(f, a, { type: 'combat/release', aim: f.foe.pos }); // the blood-paid one, at stage 0
    nextTurn(f, a).mg!.mp = 500; f.unit(b.id).hp = 500;
    A(f, a, { type: 'combat/outburst', design: d, hold: true });
    const h = f.unit(a.id).mg!.held!; h.stage = 2; h.felt = ['love']; h.feltAt = [1]; f.unit(a.id).ap = 9;
    A(f, a, { type: 'combat/release', aim: f.foe.pos });
    expect(f.unit(b.id).hp).toBeGreaterThan(500);
  });
  it('only your own Release earns it: an ally\'s Release at stage 2 offers you nothing', () => {
    const { f } = start('I', [{}]); const [a, b] = f.pcs; const d2 = give(f.unit(b.id));
    f.turn(b.id).ap = 9; releaseAt(f, b, d2, 2);
    expect(offered(f, a)).toBe(false); expect(offered(f, b)).toBe(false);
    expect(logHas(f.cb, /Heart Overload/)).toBe(false);
  });
  it('the offer is the holder\'s own: nobody else may send the free Begin', () => {
    const f = soul([{ perks: { heart_overload: 'I' } }, {}, { owner: 'p2' }]); const d = give(f.pc); releaseAt(f, f.pc, d, 2);
    expect(() => A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }, 'p2')).toThrow(/Not your unit/);
    expect(offered(f, f.pc)).toBe(true);
  });
  it('the turn\'s end ends the offer, and a fight that ends with it pending ends cleanly', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2);
    A(f, f.pc, { type: 'combat/end-turn' });
    expect(f.pc.ps?.['perk:heart_overload']?.again ?? null).toBeNull();
    const g = start(); releaseAt(g.f, g.f.pc, g.d, 2); g.f.foe.hp = 1; g.f.unit(g.f.pc.id).ap = 9;
    A(g.f, g.f.pc, { type: 'combat/outburst', design: g.d, aim: g.f.foe.pos }); // a snap cast kills the last foe
    expect(g.f.g.combat?.over || g.f.g.phase !== 'combat').toBeTruthy();
  });
  it('II: the free Begin at stage 1 can be Pumped and Released as usual, and a second free Begin is not offered that turn', () => {
    const { f, d } = start('II'); releaseAt(f, f.pc, d, 2); f.unit(f.pc.id).ap = 2;
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(f.pc.ap).toBe(2);
    A(f, f.pc, { type: 'combat/pump' }); expect(f.pc.mg!.held!.stage).toBe(2);
    A(f, f.pc, { type: 'combat/release', aim: f.foe.pos }); expect(lastMult(f)).toBe(stageMult(2));
    expect(offered(f, f.pc)).toBe(false);
  });
  it('a character without the perk gets nothing from the switches', () => {
    const f = soul([{}]); const d = give(f.pc); releaseAt(f, f.pc, d, 3); f.unit(f.pc.id).ap = 9; f.unit(f.pc.id).mg!.mp = 0;
    expect(() => A(f, f.pc, { type: 'combat/outburst', design: d, hold: true, mods: [AGAIN, BLOOD, 'again', 'pay_hp'] })).toThrow(/Needs \d+ MP/);
    f.unit(f.pc.id).mg!.mp = 500; A(f, f.pc, { type: 'combat/outburst', design: d, hold: true, mods: [AGAIN, 'again'] }); expect(f.pc.ap).toBe(7);
  });
});

describe('Resonance: the review', () => {
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
    expect(pv.multNotes).toEqual(['Resonance +20%']);
    A(f, f.pc, { type: 'combat/release', aim: f.foe.pos }); expect(lastMult(f)).toBe(pv.mult); expect(pv.mult).toBe(r2(stageMult(3) * 1.2));
  });
  it('a design planned with Pumps ("Begin, Pump twice, Release") shows the bonus too', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); const d = f.pc.mg!.designs[0].id; snap(f, f.pc); f.unit(f.pc.id).ap = 9;
    const pv = withGame(f.g, () => previewOutburstPlan(f.cb, f.pc, d, f.foe.pos, { stage: 2 }));
    expect(pv.mult).toBe(r2(stageMult(2) * 1.1)); expect(pv.multNotes).toEqual(['Resonance +10%']);
  });
  it('a held Outburst that swells over a turn keeps what was built, and its Release uses it', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); const d = f.pc.mg!.designs[0].id; snap(f, f.pc); f.unit(f.pc.id).ap = 9;
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); A(f, f.pc, { type: 'combat/end-turn' });
    const u = nextTurn(f, f.pc), st = u.mg!.held!.stage;
    A(f, f.pc, { type: 'combat/release', aim: f.foe.pos }); expect(lastMult(f)).toBe(r2(stageMult(st) * 1.1));
  });
  it('junk in a save\'s counter never goes over the ceiling or under nothing', () => {
    for (const [junk, want] of [[99, r2(SNAP * 1.2)], [-3, SNAP], ['x', SNAP], [1.9, r2(SNAP * 1.1)]] as const) {
      const f = soul([{ perks: { resonance: 'I' } }]); (f.pc.ps ||= {} as any)['perk:resonance'] = { steps: junk };
      expect(snap(f, f.pc)).toBe(want);
    }
  });
});
