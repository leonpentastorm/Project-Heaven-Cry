// Rules 1.14 (11 Nov 2026), the Will Power changes: Overdraw (Will Power 3), Heart Overload and Resonance (the perks).
// One test per sentence of the spec's three sections (items 1010 to 1012), every move through apply() as a player's
// click sends it (combat/outburst, combat/pump, combat/release, combat/move, combat/end-turn).
import { describe, expect, it } from 'vitest';
import { designCost, manaOf, previewOutburst, previewOutburstPlan, previewPump, togglesFor, stageMult, type Combat, type Unit, type OutburstDesign } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import PERKS_J from '../../../data/perks.json';

type F = ReturnType<typeof fightWith>;
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fxOf = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];
const OD = 'skill:will_power.2#overdraw', AGAIN = 'perk:heart_overload#again', BLOOD = 'perk:heart_overload#pay_hp';
/** Clear the yard; every unit 999 HP, no armour, easy to hit; the casters' numbers fixed: Soul multiplier 1, Strain
 * limit 20, 500 MP, an Emanator in hand, and the fight's free first Pump already spent (so a Pump costs its 1 AP). */
function clean(f: F) {
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  for (const x of cb.units) { x.hp = x.maxHp = 999; x.armour = 0; x.def = -40; x.sv = { body: -40, brain: -40, heart: -40 } as any; x.hidden = false; }
  for (const x of cb.units) if (x.mg) Object.assign(x.mg, { emanator: true, mp: 500, mpMax: 500, soulMult: 1, soulBoon: 1, deal: 1, soulBase: 20, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, firstUsed: true });
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
    expect(f.pc.mg!.held!.stage).toBe(4); expect(f.pc.uses?.['skill:will_power.2|per_turn']).toBeUndefined();
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
    const f = start(); f.pc.uses = { ...(f.pc.uses || {}), 'skill:will_power.2|per_combat': { s: 'c', n: 1 } } as any;
    expect(toggles(f, f.pc, 'combat/pump').find((t) => t.id === OD)).toMatchObject({ why: null });
    A(f, f.pc, { type: 'combat/pump', mods: [OD] }); expect(f.pc.mg!.held!.stage).toBe(2);
  });
});

// ====================================================================================================== Heart Overload
// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Heart Overload (rules 1.14, item 1011)'

// =========================================================================================================== Resonance
describe('Resonance, the perk (rules 1.14, item 1012)', () => {
  // rules 1.56 (Balance 2.0): a step is the perk's data (perks.json resonance, its stat_mod's value in percent)
  const RPCT: number = (PERKS_J as any).items.find((x: any) => x.id === 'resonance').tiers.I.effects[0].value, RST = RPCT / 100;
  const SNAP = stageMult(0);
  const snap = (f: F, u: Unit) => { f.unit(u.id).ap = 9; A(f, u, { type: 'combat/outburst', design: f.unit(u.id).mg!.designs[0].id, aim: f.foe.pos }); return lastMult(f); };
  const r2 = (n: number) => Math.round(n * 100) / 100;

  it('I: each Outburst you Release gives your next Release in this fight +its step to its effect, building up to two steps (rules 1.56: 4% a step)', () => {
    const f = soul([{ perks: { resonance: 'I' } }]);
    expect(snap(f, f.pc)).toBe(SNAP);                // the first Release has nothing behind it
    expect(snap(f, f.pc)).toBe(r2(SNAP * (1 + RST)));
    expect(snap(f, f.pc)).toBe(r2(SNAP * (1 + 2 * RST)));
    expect(snap(f, f.pc)).toBe(r2(SNAP * (1 + 2 * RST)));      // the ceiling
    expect(logHas(f.cb, new RegExp('keeps the beat: \\+' + 2 * RPCT + '% to this Release'))).toBe(true);
  });
  it('the bonus is in the effect: the damage of the next Release is a step higher', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); const d = give(f.pc);
    const hit = () => { const hp = f.foe.hp; releaseAt(f, f.pc, d, 2); return hp - f.foe.hp; };
    f.g.rng.state = 1; const first = hit(); f.g.rng.state = 1; const second = hit();
    expect(first).toBeGreaterThan(0); expect(second).toBe(Math.floor(first * (1 + RST))); // damage rounds down (a step of 4% may round to nothing on a small hit)
  });
  it('without the perk nothing builds', () => {
    const f = soul([{}]); snap(f, f.pc); expect(snap(f, f.pc)).toBe(SNAP);
  });
  it('you lose what you have built when you end a turn in which you neither held nor Released an Outburst', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); snap(f, f.pc); snap(f, f.pc);
    A(f, f.pc, { type: 'combat/end-turn' });         // this turn Released: kept
    nextTurn(f, f.pc); expect(snap(f, f.pc)).toBe(r2(SNAP * (1 + 2 * RST)));
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
    nextTurn(f, f.pc); expect(snap(f, f.pc)).toBe(r2(SNAP * (1 + RST)));
  });
  it('II: it builds up to three steps', () => {
    const f = soul([{ perks: { resonance: 'II' } }]);
    expect([snap(f, f.pc), snap(f, f.pc), snap(f, f.pc), snap(f, f.pc), snap(f, f.pc)]).toEqual([SNAP, r2(SNAP * (1 + RST)), r2(SNAP * (1 + 2 * RST)), r2(SNAP * (1 + 3 * RST)), r2(SNAP * (1 + 3 * RST))]);
  });
  it('II: an ally\'s Release that you can see adds a step too (I: it does not)', () => {
    for (const [tier, want] of [['II', r2(SNAP * (1 + RST))], ['I', SNAP]] as const) {
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
    f.turn(a.id); expect(snap(f, a)).toBe(r2((SNAP + 0.2) * (1 + RST)));
    expect(fxOf(f.cb, 'release').at(-1)).toMatchObject({ resonance: 0.2 });
  });
  it('the preview shows it before the Release: a snap cast and the held Outburst', () => {
    const f = soul([{ perks: { resonance: 'I' } }]); const d = f.pc.mg!.designs[0].id; snap(f, f.pc); f.unit(f.pc.id).ap = 9;
    const sn = withGame(f.g, () => previewOutburstPlan(f.cb, f.pc, d, f.foe.pos));
    expect(sn.mult).toBe(r2(SNAP * (1 + RST))); expect(sn.multNotes).toEqual(['Resonance +' + RPCT + '%']);
    A(f, f.pc, { type: 'combat/outburst', design: d, hold: true }); f.unit(f.pc.id).mg!.held!.stage = 2;
    const held = withGame(f.g, () => previewOutburstPlan(f.cb, f.pc, 'held', f.foe.pos));
    expect(held.mult).toBe(r2(stageMult(2) * (1 + RST))); expect(held.multNotes).toEqual(['Resonance +' + RPCT + '%']);
    const dmg = held.affected.find((x) => x.unit === f.foe.id)!.dmg;
    f.unit(f.pc.id).ps!['perk:resonance'].steps = 0;
    const plain = withGame(f.g, () => previewOutburstPlan(f.cb, f.pc, 'held', f.foe.pos));
    expect(plain.multNotes).toBeUndefined(); const base = plain.affected.find((x) => x.unit === f.foe.id)!.dmg; expect(dmg).toBe(Math.floor(base * (1 + RST)));
  });
  it('a save from before 1.14 loads and plays: the old perk\'s notes are ignored', () => {
    const f = soul([{ perks: { resonance: 'II' } }]); (f.pc.ps ||= {} as any)['perk:resonance'] = { seen: [{ id: 'zz', side: 'pc', round: 0 }] };
    expect(snap(f, f.pc)).toBe(SNAP); expect(snap(f, f.pc)).toBe(r2(SNAP * (1 + RST)));
  });
});
