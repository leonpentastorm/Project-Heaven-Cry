// Rules 1.14 (11 Nov 2026), the Will Power changes: Overdraw (Will Power 3), Heart Overload and Resonance (the perks).
// One test per sentence of the spec's three sections (items 1010 to 1012), every move through apply() as a player's
// click sends it (combat/outburst, combat/pump, combat/release, combat/move, combat/end-turn).
import { describe, expect, it } from 'vitest';
import { designCost, manaOf, previewOutburst, previewOutburstPlan, previewPump, togglesFor, stageMult, type Combat, type Unit, type OutburstDesign } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fxOf = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];
const OD = 'skill:will_power.3#overdraw', AGAIN = 'perk:heart_overload#again', BLOOD = 'perk:heart_overload#pay_hp';
/** Clear the yard; every unit 999 HP, no armour, easy to hit; the casters' numbers fixed: Soul multiplier 1, Strain
 * limit 20, 500 MP, an Emanator in hand, and the fight's free first Pump already spent (so a Pump costs its 1 AP). */
function clean(f: F) {
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  for (const x of cb.units) { x.hp = x.maxHp = 999; x.armour = 0; x.def = -40; x.sv = { body: -40, brain: -40, heart: -40 } as any; x.hidden = false; }
  for (const x of cb.units) if (x.mg) Object.assign(x.mg, { emanator: true, mp: 500, mpMax: 500, soulMult: 1, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, firstUsed: true });
}
/** A fight with Soul casters (the first at C6) and one foe at F6, on the first caster's turn with 9 AP. */
function soul(specs: CharSpec[]) {
  const f = fightWith(specs.map((s, i) => ({ ...SOUL, name: 'Caster ' + (i + 1), ...s })), [{ at: 'F6' }]);
  clean(f); f.pcs.forEach((p, i) => { f.unit(p.id).pos = '2,' + (5 + i); }); f.foe.pos = '5,5';
  const u = f.turn(f.pc); u.ap = 9;
  return f;
}
const give = (u: Unit, d: Partial<OutburstDesign> = {}): string => { const id = 'x' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'damage', modules: [], ...d } as OutburstDesign); return id; };
const A = (f: F, u: Unit, a: Record<string, any>) => f.act({ unitId: u.id, ...a } as any);
/** The same unit's next turn (a new round; a held Outburst swells as the rules say). */
const nextTurn = (f: F, u: Unit) => { f.cb.round += 1; const x = f.turn(u.id); x.ap = 9; return x; };
const toggles = (f: F, u: Unit, on: string, mods: string[] = []) => withGame(f.g, () => togglesFor({ u: f.unit(u.id), c: f.g.characters[u.charId!], cb: f.cb, g: f.g } as any, on, {}, mods));
/** Begin d, Pump it to `stage` by hand and Release it at the foe. */
function releaseAt(f: F, u: Unit, d: string, stage: number) {
  A(f, u, { type: 'combat/outburst', design: d, hold: true }); f.unit(u.id).mg!.held!.stage = stage; f.unit(u.id).ap = 9;
  A(f, u, { type: 'combat/release', aim: f.foe.pos });
}
const lastMult = (f: F): number => fxOf(f.cb, 'release').at(-1).mult;

// ============================================================================================================ Overdraw
describe('Overdraw (Will Power 3; rules 1.14, item 1010)', () => {
  const start = () => { const f = soul([{ skills: { will_power: 3 } }]); const d = give(f.pc); A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); f.unit(f.pc.id).ap = 9; return f; };

  it('a Pump may be an Overdraw: it adds 2 stages instead of 1, for the Pump\'s own AP', () => {
    const f = start(), ap = f.pc.ap;
    A(f, f.pc, { type: 'combat/pump', mods: [OD] });
    expect(f.pc.mg!.held!.stage).toBe(2); expect(ap - f.pc.ap).toBe(1);
    expect(logHas(f.cb, /overdraws the heart: stage 2/)).toBe(true);
  });
  it('the first Overdraw of a fight costs no Strain', () => {
    const f = start(), s0 = f.pc.mg!.strain;
    A(f, f.pc, { type: 'combat/pump', mods: [OD] });
    expect(f.pc.mg!.strain).toBe(s0); expect(logHas(f.cb, /the heart pays/)).toBe(false);
  });
  it('once a turn: a second Overdraw in the same turn is refused, and that Pump adds 1 stage', () => {
    const f = start(); f.pc.mg!.held!.stage = 0;
    A(f, f.pc, { type: 'combat/pump', mods: [OD] }); f.unit(f.pc.id).mg!.held!.stage = 1;
    expect(toggles(f, f.pc, 'combat/pump').find((t) => t.id === OD)).toMatchObject({ why: 'Once a turn.' });
    const s = f.pc.mg!.strain; A(f, f.pc, { type: 'combat/pump', mods: [OD] });
    expect(f.pc.mg!.held!.stage).toBe(2); expect(f.pc.mg!.strain).toBe(s);
  });
  it('it is offered again on the next turn, and each Overdraw after the first costs 1 Strain once the Pump is done', () => {
    const f = start(); A(f, f.pc, { type: 'combat/pump', mods: [OD] });
    const u = nextTurn(f, f.pc); u.mg!.held!.stage = 1; // the hold swelled at the turn's start; set the stage for the case
    expect(toggles(f, f.pc, 'combat/pump').find((t) => t.id === OD)).toMatchObject({ why: null });
    expect(toggles(f, f.pc, 'combat/pump').find((t) => t.id === OD)!.preview).toMatch(/1 Strain after it/);
    const s = f.pc.mg!.strain; A(f, f.pc, { type: 'combat/pump', mods: [OD] });
    expect(f.pc.mg!.held!.stage).toBe(3); expect(f.pc.mg!.strain).toBe(s + 1);
    expect(logHas(f.cb, /Overdraw: the heart pays \(\+1 Strain\)/)).toBe(true);
  });
  it('it needs stage 2 or lower: at stage 3 the Pump adds 1 stage, and the turn\'s Overdraw is not spent', () => {
    const f = start(); f.pc.mg!.held!.stage = 3;
    expect(toggles(f, f.pc, 'combat/pump').find((t) => t.id === OD)).toMatchObject({ why: 'Stage 2 or lower.' });
    A(f, f.pc, { type: 'combat/pump', mods: [OD] });
    expect(f.pc.mg!.held!.stage).toBe(4); expect(f.pc.uses?.['skill:will_power.3|per_turn']).toBeUndefined();
  });
  it('the Pump\'s card shows it before the click: the stage it reaches, and its Strain', () => {
    const f = start();
    const pv = (mods: string[]) => withGame(f.g, () => { (f.cb as any).mods = mods; try { return previewPump(f.cb, f.pc); } finally { delete (f.cb as any).mods; } });
    expect(pv([]).stage).toBe(1); expect(pv([]).note).toBeUndefined();
    expect(pv([OD])).toMatchObject({ ok: true, stage: 2, mult: stageMult(2), ap: 1 }); expect(pv([OD]).note).toMatch(/2 stages.*No Strain/);
    A(f, f.pc, { type: 'combat/pump', mods: [OD] }); nextTurn(f, f.pc).mg!.held!.stage = 0;
    expect(pv([OD]).note).toMatch(/1 Strain after it/);
  });
  it('a save from before 1.14 that had spent its once-a-fight Overdraw is not locked out', () => {
    const f = start(); f.pc.uses = { ...(f.pc.uses || {}), 'skill:will_power.3|per_combat': { s: 'c', n: 1 } } as any;
    expect(toggles(f, f.pc, 'combat/pump').find((t) => t.id === OD)).toMatchObject({ why: null });
    A(f, f.pc, { type: 'combat/pump', mods: [OD] }); expect(f.pc.mg!.held!.stage).toBe(2);
  });
});

// ====================================================================================================== Heart Overload
describe('Heart Overload (rules 1.14, item 1011)', () => {
  const start = (tier: 'I' | 'II' = 'I') => { const f = soul([{ perks: { heart_overload: tier } }]); const d = give(f.pc); return { f, d }; };

  it('I: right after you Release at stage 2 or higher you may Begin the same design again for 0 AP', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2);
    expect(logHas(f.cb, /Heart Overload: .* may Begin Test .* again now for 0 AP/)).toBe(true);
    expect(toggles(f, f.pc, 'combat/outburst').find((t) => t.id === AGAIN)).toMatchObject({ on: true, why: null });
    expect(withGame(f.g, () => previewOutburst(f.cb, f.pc, d, undefined, false))).toMatchObject({ ok: true, ap: 0 });
    f.unit(f.pc.id).ap = 0; // nothing left: only a free Begin can go through
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true });
    expect(f.pc.mg!.held).toMatchObject({ design: d }); expect(f.pc.ap).toBe(0);
    expect(logHas(f.cb, /begins again for 0 AP \(Heart Overload\)/)).toBe(true);
  });
  it('you pay its mana and its Strain as usual, and it holds at stage 0', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2);
    const m = f.pc.mg!, mp = m.mp, s = m.strain, cost = designCost(m, m.designs.find((x) => x.id === d)!, manaOf(f.cb));
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true });
    expect(mp - f.pc.mg!.mp).toBe(cost); expect(f.pc.mg!.strain).toBe(s + 1); expect(f.pc.mg!.held!.stage).toBe(0);
  });
  it('a Release below stage 2 earns nothing: the next Begin costs its AP', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 1);
    expect(toggles(f, f.pc, 'combat/outburst').some((t) => t.id === AGAIN)).toBe(false);
    f.unit(f.pc.id).ap = 9; A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(f.pc.ap).toBe(7);
  });
  it('a snap cast releases at stage 0, so it earns nothing; and the free Begin is never a snap cast', () => {
    const { f, d } = start(); A(f, f.pc, { type: 'combat/outburst', design: d, aim: f.foe.pos });
    expect(toggles(f, f.pc, 'combat/outburst').some((t) => t.id === AGAIN)).toBe(false);
    f.unit(f.pc.id).ap = 9; releaseAt(f, f.pc, d, 2); f.unit(f.pc.id).ap = 9;
    A(f, f.pc, { type: 'combat/outburst', design: d, aim: f.foe.pos }); expect(f.pc.ap).toBe(6); // Begin 2 + Release 1
  });
  it('the same design only: another design costs its AP, and the offer is gone after it', () => {
    const { f, d } = start(); const d2 = give(f.pc); releaseAt(f, f.pc, d, 2); f.unit(f.pc.id).ap = 9;
    expect(withGame(f.g, () => previewOutburst(f.cb, f.pc, d2, undefined, false)).ap).toBe(2);
    A(f, f.pc, { type: 'combat/outburst', design: d2, hold: true }); expect(f.pc.ap).toBe(7);
    A(f, f.pc, { type: 'combat/letgo' }); f.unit(f.pc.id).ap = 9;
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(f.pc.ap).toBe(7);
  });
  it('at once: any other action first ends the offer', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2); f.unit(f.pc.id).ap = 9;
    A(f, f.pc, { type: 'combat/move', to: '2,4' });
    expect(toggles(f, f.pc, 'combat/outburst').some((t) => t.id === AGAIN)).toBe(false);
    const ap = f.pc.ap; A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(ap - f.pc.ap).toBe(2);
  });
  it('once a turn: a second Release at stage 2 in the same turn offers nothing', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2);
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); f.unit(f.pc.id).mg!.held!.stage = 2; f.unit(f.pc.id).ap = 9;
    A(f, f.pc, { type: 'combat/release', aim: f.foe.pos });
    expect(toggles(f, f.pc, 'combat/outburst').some((t) => t.id === AGAIN)).toBe(false);
    const ap = f.pc.ap; A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(ap - f.pc.ap).toBe(2);
  });
  it('it does not wait for a later turn', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2);
    nextTurn(f, f.pc);
    expect(toggles(f, f.pc, 'combat/outburst').some((t) => t.id === AGAIN)).toBe(false);
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(f.pc.ap).toBe(7);
  });
  it('it is offered, not forced: with the switch off the Begin costs its AP and the turn\'s use is kept', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2); f.unit(f.pc.id).ap = 9;
    expect(f.pc.mg!.held).toBeFalsy(); // the Release left nothing held: nothing began by itself
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true, mods: ['!' + AGAIN] });
    expect(f.pc.ap).toBe(7); expect(f.pc.mg!.held!.stage).toBe(0); expect(f.pc.uses?.['perk:heart_overload|per_turn']).toBeUndefined();
  });
  it('II: that free Begin holds at stage 1 (a Begin you pay AP for still holds at stage 0)', () => {
    const { f, d } = start('II'); releaseAt(f, f.pc, d, 2); f.unit(f.pc.id).ap = 0;
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true });
    expect(f.pc.mg!.held!.stage).toBe(1); expect(logHas(f.cb, /Heart Overload: it holds at stage 1/)).toBe(true);
    A(f, f.pc, { type: 'combat/letgo' }); f.unit(f.pc.id).ap = 9;
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(f.pc.mg!.held!.stage).toBe(0); expect(f.pc.ap).toBe(7);
  });
  it('blood for mana: without the mana for that free Begin you pay it in HP, 1 HP for each point of mana', () => {
    for (const tier of ['I', 'II'] as const) {
      const { f, d } = start(tier); releaseAt(f, f.pc, d, 2);
      const m = f.unit(f.pc.id).mg!, cost = designCost(m, m.designs.find((x) => x.id === d)!, manaOf(f.cb)); m.mp = cost - 1;
      const hp = f.pc.hp;
      expect(toggles(f, f.pc, 'combat/outburst').find((t) => t.id === BLOOD)).toMatchObject({ on: true, why: null });
      expect(toggles(f, f.pc, 'combat/outburst').find((t) => t.id === BLOOD)!.preview).toContain('Pay ' + cost + ' HP');
      expect(withGame(f.g, () => previewOutburst(f.cb, f.pc, d, undefined, false))).toMatchObject({ ok: true, ap: 0, cost: 0, hp: cost });
      A(f, f.pc, { type: 'combat/outburst', design: d, hold: true });
      expect(hp - f.pc.hp).toBe(cost); expect(f.pc.mg!.mp).toBe(cost - 1); expect(f.pc.mg!.held).toMatchObject({ design: d });
      expect(logHas(f.cb, new RegExp('pays ' + cost + ' HP for the mana \\(Heart Overload\\)'))).toBe(true);
    }
  });
  it('blood is only for when the mana is short, and it may be refused', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2);
    expect(toggles(f, f.pc, 'combat/outburst').some((t) => t.id === BLOOD)).toBe(false); // mana in hand: no blood
    const hp = f.pc.hp; A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(f.pc.hp).toBe(hp);
    const g = start(); releaseAt(g.f, g.f.pc, g.d, 2); g.f.unit(g.f.pc.id).mg!.mp = 0;
    expect(() => A(g.f, g.f.pc, { type: 'combat/outburst', design: g.d, hold: true, mods: ['!' + BLOOD] })).toThrow(/Needs \d+ MP/);
    expect(g.f.pc.hp).toBe(999);
  });
  it('blood is only for that free Begin: an ordinary Begin without the mana is refused', () => {
    const { f, d } = start(); f.unit(f.pc.id).mg!.mp = 0;
    expect(toggles(f, f.pc, 'combat/outburst').some((t) => t.id === BLOOD)).toBe(false);
    expect(() => A(f, f.pc, { type: 'combat/outburst', design: d, hold: true, mods: ['pay_hp', BLOOD] })).toThrow(/Needs \d+ MP/);
    expect(f.pc.hp).toBe(999);
  });
  it('an Outburst paid in blood can\'t heal or shield: a design that mends is never offered blood', () => {
    const { f } = start(); const mend = give(f.pc, { school: 'buff', option: 'heal' });
    releaseAt(f, f.pc, mend, 2); f.unit(f.pc.id).mg!.mp = 0;
    expect(toggles(f, f.pc, 'combat/outburst').some((t) => t.id === AGAIN)).toBe(true);
    expect(toggles(f, f.pc, 'combat/outburst').some((t) => t.id === BLOOD)).toBe(false);
    expect(() => A(f, f.pc, { type: 'combat/outburst', design: mend, hold: true })).toThrow(/Needs \d+ MP/);
    expect(f.pc.hp).toBe(999);
  });
  it('an Outburst paid in blood can\'t heal or shield: what it would mend comes to nothing', () => {
    // Love poured into a hostile design heals the allies inside it: paid in blood, it heals nothing.
    const run = (blood: boolean) => {
      const f = soul([{ perks: { heart_overload: 'I' } }, {}]); const d = give(f.pc, { modules: ['burst'] });
      const [a, b] = f.pcs; f.unit(b.id).pos = '5,6'; f.unit(b.id).hp = 500; // the ally stands in the Burst, hurt
      releaseAt(f, a, d, 2); f.unit(b.id).hp = 500;
      if (blood) f.unit(a.id).mg!.mp = 0;
      A(f, a, { type: 'combat/outburst', design: d, hold: true });
      const h = f.unit(a.id).mg!.held!; h.stage = 2; h.felt = ['love']; h.feltAt = [1]; f.unit(a.id).ap = 9;
      A(f, a, { type: 'combat/release', aim: f.foe.pos });
      return f.unit(b.id).hp - 500;
    };
    expect(run(false)).toBeGreaterThan(0); expect(run(true)).toBe(0);
  });
  it('it needs an Emanator in hand, like any Begin', () => {
    const { f, d } = start(); releaseAt(f, f.pc, d, 2); f.unit(f.pc.id).mg!.emanator = false; f.unit(f.pc.id).ap = 9;
    expect(toggles(f, f.pc, 'combat/outburst').some((t) => t.id === AGAIN)).toBe(false);
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); expect(f.pc.ap).toBe(7);
  });
  it('a save from before 1.14 loads and plays: the old "Pay with HP" on a plain Begin does nothing now', () => {
    const { f, d } = start(); (f.pc.ps ||= {} as any)['perk:heart_overload'] = { paid: null, noMend: 12 };
    const hp = f.pc.hp, mp = f.pc.mg!.mp;
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true, mods: ['pay_hp'] });
    expect(f.pc.hp).toBe(hp); expect(f.pc.mg!.mp).toBeLessThan(mp); expect(f.pc.ap).toBe(7);
  });
});

// =========================================================================================================== Resonance
describe('Resonance, the perk (rules 1.14, item 1012)', () => {
  const SNAP = stageMult(0);
  const snap = (f: F, u: Unit) => { f.unit(u.id).ap = 9; A(f, u, { type: 'combat/outburst', design: f.unit(u.id).mg!.designs[0].id, aim: f.foe.pos }); return lastMult(f); };
  const r2 = (n: number) => Math.round(n * 100) / 100;

  it('I: each Outburst you Release gives your next Release in this fight +10% to its effect, building up to +20%', () => {
    const f = soul([{ perks: { resonance: 'I' } }]);
    expect(snap(f, f.pc)).toBe(SNAP);                // the first Release has nothing behind it
    expect(snap(f, f.pc)).toBe(r2(SNAP * 1.1));
    expect(snap(f, f.pc)).toBe(r2(SNAP * 1.2));
    expect(snap(f, f.pc)).toBe(r2(SNAP * 1.2));      // the ceiling
    expect(logHas(f.cb, /keeps the beat: \+20% to this Release \(Resonance\)/)).toBe(true);
  });
  it('the bonus is in the effect: the damage of the next Release is 10% higher', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); const d = give(f.pc);
    const hit = () => { const hp = f.foe.hp; releaseAt(f, f.pc, d, 2); return hp - f.foe.hp; };
    f.g.rng.state = 1; const first = hit(); f.g.rng.state = 1; const second = hit();
    expect(first).toBeGreaterThan(0); expect(second).toBe(Math.floor(first * 1.1)); expect(second).toBeGreaterThan(first); // damage rounds down
  });
  it('without the perk nothing builds', () => {
    const f = soul([{}]); snap(f, f.pc); expect(snap(f, f.pc)).toBe(SNAP);
  });
  it('you lose what you have built when you end a turn in which you neither held nor Released an Outburst', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); snap(f, f.pc); snap(f, f.pc);
    A(f, f.pc, { type: 'combat/end-turn' });         // this turn Released: kept
    nextTurn(f, f.pc); expect(snap(f, f.pc)).toBe(r2(SNAP * 1.2));
    A(f, f.pc, { type: 'combat/end-turn' });
    nextTurn(f, f.pc); A(f, f.pc, { type: 'combat/end-turn' }); // a turn with nothing held and nothing Released
    expect(logHas(f.cb, /the Resonance built is lost/)).toBe(true);
    nextTurn(f, f.pc); expect(snap(f, f.pc)).toBe(SNAP);
  });
  it('a turn in which you held an Outburst keeps it, Released or not', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); snap(f, f.pc); const d = f.pc.mg!.designs[0].id;
    A(f, f.pc, { type: 'combat/end-turn' });
    nextTurn(f, f.pc); A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); A(f, f.pc, { type: 'combat/end-turn' }); // held, not Released
    nextTurn(f, f.pc); A(f, f.pc, { type: 'combat/letgo' }); A(f, f.pc, { type: 'combat/end-turn' }); // held at the turn's start, then let go
    expect(logHas(f.cb, /the Resonance built is lost/)).toBe(false);
    nextTurn(f, f.pc); expect(snap(f, f.pc)).toBe(r2(SNAP * 1.1));
  });
  it('II: it builds up to +30%', () => {
    const f = soul([{ perks: { resonance: 'II' } }]);
    expect([snap(f, f.pc), snap(f, f.pc), snap(f, f.pc), snap(f, f.pc), snap(f, f.pc)]).toEqual([SNAP, r2(SNAP * 1.1), r2(SNAP * 1.2), r2(SNAP * 1.3), r2(SNAP * 1.3)]);
  });
  it('II: an ally\'s Release that you can see adds a step too (I: it does not)', () => {
    for (const [tier, want] of [['II', r2(SNAP * 1.1)], ['I', SNAP]] as const) {
      const f = soul([{ perks: { resonance: tier } }, {}]); const [a, b] = f.pcs;
      f.turn(b.id); snap(f, b);
      f.cb.round += 1; f.turn(a.id);                 // another round: the shared rule is out of it
      expect(snap(f, a)).toBe(want);
    }
  });
  it('II: an ally\'s Release you can\'t see adds nothing', () => {
    const f = soul([{ perks: { resonance: 'II' } }, {}]); const [a, b] = f.pcs;
    f.unit(a.id).pos = '2,1'; f.unit(a.id).vision = 1; f.unit(b.id).pos = '2,8';
    f.turn(b.id); snap(f, b);
    f.cb.round += 1; f.turn(a.id); f.unit(a.id).vision = 12; f.unit(a.id).pos = '2,5';
    expect(snap(f, a)).toBe(SNAP);
  });
  it('the shared Resonance rule is unchanged and adds to this: +0.2 on the stage multiplier for an ally who Released this round', () => {
    const f = soul([{ perks: { resonance: 'I' } }, {}]); const [a, b] = f.pcs;
    snap(f, a);                                      // one step built
    f.turn(b.id); expect(snap(f, b)).toBe(r2(SNAP + 0.2)); // the ally, no perk: the shared rule alone
    f.turn(a.id); expect(snap(f, a)).toBe(r2((SNAP + 0.2) * 1.1));
    expect(fxOf(f.cb, 'release').at(-1)).toMatchObject({ resonance: 0.2 });
  });
  it('the preview shows it before the Release: a snap cast and the held Outburst', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); const d = f.pc.mg!.designs[0].id; snap(f, f.pc); f.unit(f.pc.id).ap = 9;
    const sn = withGame(f.g, () => previewOutburstPlan(f.cb, f.pc, d, f.foe.pos));
    expect(sn.mult).toBe(r2(SNAP * 1.1)); expect(sn.multNotes).toEqual(['Resonance +10%']);
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); f.unit(f.pc.id).mg!.held!.stage = 2;
    const held = withGame(f.g, () => previewOutburstPlan(f.cb, f.pc, 'held', f.foe.pos));
    expect(held.mult).toBe(r2(stageMult(2) * 1.1)); expect(held.multNotes).toEqual(['Resonance +10%']);
    const dmg = held.affected.find((x) => x.unit === f.foe.id)!.dmg;
    f.unit(f.pc.id).ps!['perk:resonance'].steps = 0;
    const plain = withGame(f.g, () => previewOutburstPlan(f.cb, f.pc, 'held', f.foe.pos));
    expect(plain.multNotes).toBeUndefined(); const base = plain.affected.find((x) => x.unit === f.foe.id)!.dmg; expect(dmg).toBe(Math.floor(base * 1.1)); expect(dmg).toBeGreaterThan(base);
  });
  it('a save from before 1.14 loads and plays: the old perk\'s notes are ignored', () => {
    const f = soul([{ perks: { resonance: 'II' } }]); (f.pc.ps ||= {} as any)['perk:resonance'] = { seen: [{ id: 'zz', side: 'pc', round: 0 }] };
    expect(snap(f, f.pc)).toBe(SNAP); expect(snap(f, f.pc)).toBe(r2(SNAP * 1.1));
  });
});
