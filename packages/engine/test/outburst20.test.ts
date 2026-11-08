// Soul magic, rules revision 1.5 (Outburst 2.0, accepted 8 Nov 2026): every rule through apply() actions where a player
// takes them (combat/outburst, combat/pump, combat/release, combat/letgo, combat/steady, combat/feed,
// combat/heartwatch, combat/end-turn, combat/attack, world/act), the area maths and the preview called directly.
import { describe, expect, it } from 'vitest';
import {
  d20, stageMult, outburstArea, previewOutburstPlan, migrateDesign, migrateHeld, freePumps, condOn, objectsOf, moveUnit, healUnit,
  apply, STAGE_MULT, soulMult, type Combat, type Unit, type OutburstDesign,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

/** A seed whose next n d20 rolls are all 2-19 (no criticals, no natural 1s). */
function calmSeed(n = 60): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calmSeed();
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fx = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];

/** A Soul caster at 3,5 on its turn: Soul multiplier 1, Healing 1, Will Power +0, reach 4, Strain limit 20, no free
 * Pumps, 9999 MP, 60 AP. Foes and allies at the tiles given; everyone 500 HP, no armour, Defense −99, saves −99 (every
 * roll hits, every save fails on the seed). The yard, cleared (16 × 11), Normal air unless mana is given. */
function rig(foes: string[] = ['6,5'], allies: string[] = [], mana = 15) {
  const f = fightWith([{ archetype: 'stormcaller', kit: 'soul' }, ...allies.map(() => ({ archetype: 'stormcaller', kit: 'soul' }))], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = mana;
  f.pcs.forEach((p, i) => { p.pos = i ? allies[i - 1] : '3,5'; });
  f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; (x as any).elemTaken = 0; (x as any).healRecv = 1; }
  for (const p of f.pcs) arm(p);
  const u = f.turn(f.pc); u.ap = 60;
  f.g.rng.state = SEED;
  return f;
}
function arm(u: Unit) {
  if (!u.mg) throw new Error('no magic');
  Object.assign(u.mg, { emanator: true, mp: 9999, mpMax: 9999, soulMult: 1, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, debuff: { body: 0, brain: 0, heart: 0 } });
  u.sk = {}; u.dbf = { body: 0, brain: 0, heart: 0 };
}
type F = ReturnType<typeof rig>;
/** Add a design to the unit's ready list; returns its id. */
function give(u: Unit, d: Partial<OutburstDesign>): string { const id = 'd' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'damage', modules: [], ...d } as OutburstDesign); return id; }
const A = (f: F, a: Record<string, any>, u: Unit = f.pc) => f.act({ unitId: u.id, ...a } as any);
const begin = (f: F, design: string, u: Unit = f.pc, o: Record<string, any> = {}) => A(f, { type: 'combat/outburst', design, ...o }, u);
const pump = (f: F, n = 1, u: Unit = f.pc) => { for (let i = 0; i < n; i++) A(f, { type: 'combat/pump' }, u); };
const release = (f: F, aim?: string, u: Unit = f.pc) => A(f, { type: 'combat/release', ...(aim ? { aim } : {}) }, u);
const lost = (u: Unit) => 500 - u.hp;
const me = (f: F) => f.unit(f.pc.id);

// ---------------------------------------------------------------------------------------------------------------------
describe('the heart cycle: Begin, Pump, Release (rules 1.5, section 1)', () => {
  it('Begin is 2 AP at stage 0 and +1 Strain; Pump 1 AP +1 stage to 4; Release 1 AP; the stage table ×0.6 … ×2.2', () => {
    expect(STAGE_MULT).toEqual([0.6, 1, 1.4, 1.8, 2.2]); expect([0, 1, 2, 3, 4].map(stageMult)).toEqual([0.6, 1, 1.4, 1.8, 2.2]);
    const f = rig(); const d = give(f.pc, {});
    begin(f, d); expect(me(f).ap).toBe(58); expect(me(f).mg!.held!.stage).toBe(0); expect(me(f).mg!.strain).toBe(1);
    expect(fx(f.cb, 'outburst').at(-1)).toMatchObject({ stage: 0, hold: true, form: 'bolt', tone: 'raw' });
    pump(f, 4); expect(me(f).ap).toBe(54); expect(me(f).mg!.held!.stage).toBe(4);
    expect(fx(f.cb, 'pump').map((e) => e.stage)).toEqual([1, 2, 3, 4]); expect(fx(f.cb, 'pump').at(-1).max).toBe(true);
    expect(() => pump(f)).toThrow(/full/);
    release(f, '6,5'); expect(me(f).ap).toBe(53); expect(me(f).mg!.held).toBeNull();
    expect(lost(f.foe)).toBe(Math.floor(20 * 2.2));
    expect(fx(f.cb, 'release').at(-1)).toMatchObject({ form: 'bolt', tone: 'raw', stage: 4, mult: 2.2, targets: [f.foe.id] });
  });
  it('a snap cast (combat/outburst with an aim) is Begin + Release at once: 3 AP at ×0.6', () => {
    const f = rig(); const d = give(f.pc, {});
    begin(f, d, f.pc, { aim: '6,5' }); expect(me(f).ap).toBe(57); expect(lost(f.foe)).toBe(12); expect(me(f).mg!.held).toBeNull();
  });
  it('each stage, released through the reducer, deals 20 × the stage multiplier (Raw ignores armour)', () => {
    for (let s = 0; s <= 4; s++) {
      const f = rig(); f.foe.armour = 15; const d = give(f.pc, {});
      begin(f, d); pump(f, s); release(f, '6,5');
      expect(lost(f.foe), 'stage ' + s).toBe(Math.floor(20 * stageMult(s)));
    }
  });
  it('Swift: Begin costs 1 AP; holding blocks another Begin; Silenced blocks the cycle', () => {
    const f = rig(); const d = give(f.pc, { modules: ['swift'] }), d2 = give(f.pc, {});
    begin(f, d); expect(me(f).ap).toBe(59);
    expect(() => begin(f, d2)).toThrow(/holding/);
    me(f).conds = { ...(me(f).conds || {}), silenced: 1 }; expect(() => pump(f)).toThrow(/Silenced/);
  });
  it('the Soul multiplier is 1 + 0.05 × (Determination − 1) + 0.1 × Will Power (2.45 maxed)', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const c = s.g.characters[s.chars[0].id];
    c.attrs.determination = 10; c.skills.will_power = 10;
    expect(soulMult(c)).toBeCloseTo(2.45);
    expect(Math.round(20 * 2.45 * 0.6)).toBe(29); expect(Math.round(20 * 2.45 * 1.8)).toBe(88); expect(Math.round(20 * 2.45 * 2.2)).toBe(108);
  });
});

describe('the swell, the Empathy Pumps, Steady (sections 1 and 3)', () => {
  it('held past the turn: at the next turn start Strain −1 (always), then the swell +1 stage and +1 Strain', () => {
    const f = rig(); const d = give(f.pc, {});
    begin(f, d); me(f).mg!.strain = 4;
    f.foe.pos = '15,10'; f.unit(f.foe.id).hp = 0; // keep the foe out of it
    f.turn(f.pc); expect(me(f).mg!.held!.stage).toBe(1); expect(me(f).mg!.strain).toBe(4);
    expect(fx(f.cb, 'swell').at(-1)).toMatchObject({ stage: 1, mult: 1 });
    expect(fx(f.cb, 'hold').at(-1)).toMatchObject({ stage: 1 });
  });
  it('in Flooded air the swell strains 2', () => {
    const f = rig(['6,5'], [], 35); const d = give(f.pc, {});
    begin(f, d); expect(me(f).mg!.strain).toBe(2); me(f).mg!.strain = 5; me(f).mg!.cast = true;
    f.turn(f.pc); expect(me(f).mg!.strain).toBe(5 - 1 + 2);
  });
  it('Steady the heart (combat/steady: 1 AP, only while holding): −1 Strain and no swell at the next turn start', () => {
    const f = rig(); const d = give(f.pc, {});
    expect(() => A(f, { type: 'combat/steady' })).toThrow(/only while holding/);
    begin(f, d); pump(f, 2); me(f).mg!.strain = 5; const ap = me(f).ap;
    A(f, { type: 'combat/steady' }); expect(me(f).ap).toBe(ap - 1); expect(me(f).mg!.strain).toBe(4);
    expect(fx(f.cb, 'steady').at(-1)).toMatchObject({ by: 1, strain: 4, stage: 2 });
    me(f).mg!.cast = true; // no stillness for this check
    f.turn(f.pc); expect(me(f).mg!.held!.stage).toBe(2); expect(me(f).mg!.strain).toBe(3); expect(fx(f.cb, 'swell').length).toBe(0);
  });
  it('Empathy: 1 free Pump a round from Empathy 3, 2 from 7; free Pumps cost 0 AP and come back each round', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const c = s.g.characters[s.chars[0].id];
    for (const [e, n] of [[0, 0], [2, 0], [3, 1], [6, 1], [7, 2], [10, 2]]) { c.skills.empathy = e; expect(freePumps(c), 'empathy ' + e).toBe(n); }
    const f = rig(); const d = give(f.pc, {}); me(f).mg!.freePumpsMax = 2; me(f).mg!.freePumps = 2;
    begin(f, d); const ap = me(f).ap;
    pump(f, 2); expect(me(f).ap).toBe(ap); expect(fx(f.cb, 'pump').every((e) => e.free)).toBe(true);
    pump(f); expect(me(f).ap).toBe(ap - 1);
    f.turn(f.pc); expect(me(f).mg!.freePumps).toBe(2);
  });
});

describe('Strain: the burn, the automatic Mana Short (section 3)', () => {
  it('over the limit, each point burns 8 true damage at the end of your turn (no roll)', () => {
    const f = rig(); me(f).mg!.strainLimit = 4; me(f).mg!.strain = 6;
    A(f, { type: 'combat/end-turn' });
    expect(fx(f.cb, 'burn')[0]).toMatchObject({ unit: f.pc.id, over: 2, dmg: 16 }); expect(logHas(f.cb, /heart burns: 16 damage \(2 over/)).toBe(true);
  });
  it('3 over the limit: an automatic Mana Short: Stunned, the held one goes wild with the stage-1 rider on you; Strain falls to the limit', () => {
    const f = rig(); me(f).mg!.strainLimit = 4; me(f).mg!.strain = 6; const d = give(f.pc, { tone: 'frost' });
    begin(f, d);
    expect(logHas(f.cb, /MANA SHORT/)).toBe(true); expect(condOn(me(f), 'stunned')).toBe(true);
    expect(me(f).mg!.held).toBeNull(); expect(me(f).mg!.strain).toBe(4);
    expect(logHas(f.cb, /releases wild/)).toBe(true); expect(condOn(f.foe, 'slowed')).toBe(false); // stage 0: no rider on the foe
    expect(condOn(me(f), 'slowed')).toBe(true); // Frost's stage-1 rider on your own tile
    expect(fx(f.cb, 'short').at(-1)).toMatchObject({ held: true, tone: 'frost', element: 'freeze' });
  });
});

describe('calming the heart: the five ways, on top of the turn-start −1 (section 3)', () => {
  it('stillness: a turn with no Begin or Pump ends −1 more', () => {
    const f = rig(); me(f).mg!.strain = 3; me(f).mg!.cast = false;
    A(f, { type: 'combat/end-turn' }); expect(fx(f.cb, 'calm').find((e) => e.way === 'still')).toMatchObject({ unit: f.pc.id, by: 1, strain: 2 });
    const g = rig(); const d = give(g.pc, {}); begin(g, d); me(g).mg!.strain = 3;
    A(g, { type: 'combat/end-turn' }); expect(fx(g.cb, 'calm').some((e) => e.way === 'still')).toBe(false); // Begun this turn: no stillness
  });
  it('holding is not stillness (Leon 8 Nov 2026): an idle held turn nets 0 (+1 swell, −1 turn start); Steady nets −2 and no growth', () => {
    const f = rig(['12,5']); const d = give(f.pc, {}); begin(f, d); me(f).mg!.strain = 3;
    f.turn(f.pc); expect(me(f).mg!.held!.stage).toBe(1); expect(me(f).mg!.strain).toBe(3); // −1 turn start, +1 swell
    A(f, { type: 'combat/end-turn' }); expect(fx(f.cb, 'calm').some((e) => e.way === 'still')).toBe(false); expect(me(f).mg!.strain).toBe(3);
    const g = rig(['12,5']); const e = give(g.pc, {}); begin(g, e); me(g).mg!.strain = 3;
    g.turn(g.pc); A(g, { type: 'combat/steady' }); expect(me(g).mg!.strain).toBe(2);
    A(g, { type: 'combat/end-turn' }); expect(fx(g.cb, 'calm').some((x) => x.way === 'still')).toBe(false);
    expect(g.cb.order[g.cb.turn]).toBe(g.pc.id); // the foe has gone; the next turn has begun
    expect(me(g).mg!.strain).toBe(1); expect(me(g).mg!.held!.stage).toBe(1); // −2 over the turn, no swell
  });
  it('fighting it out: the first weapon attack of the turn −1, once', () => {
    const f = rig(['4,5']); me(f).mg!.strain = 3; me(f).weapon = 'fists';
    A(f, { type: 'combat/attack', targetId: f.foe.id, mode: 'melee' }); expect(me(f).mg!.strain).toBe(2);
    A(f, { type: 'combat/attack', targetId: f.foe.id, mode: 'melee' }); expect(me(f).mg!.strain).toBe(2);
    expect(fx(f.cb, 'calm').filter((e) => e.way === 'fight').length).toBe(1);
  });
  it('tending others: the first heal, stim, shield or cleanse given to an ally on your turn −1, once', () => {
    const f = rig(['12,5'], ['4,5']); const ally = f.pcs[1]; me(f).mg!.strain = 3; ally.hp = 100;
    const d = give(f.pc, { school: 'buff', option: 'heal' });
    begin(f, d, f.pc, { aim: '4,5' }); expect(f.unit(ally.id).hp).toBeGreaterThan(100);
    expect(me(f).mg!.strain).toBe(3); // +1 Begin, −1 tending
    withGame(f.g, () => healUnit(f.cb, f.unit(ally.id), 5, me(f), 'test')); expect(me(f).mg!.strain).toBe(3);
    expect(fx(f.cb, 'calm').filter((e) => e.way === 'tend').length).toBe(1);
  });
  it('let it go (combat/letgo, free, your turn): the held one is dropped; Strain falls by its stage; the meter +1', () => {
    const f = rig(); const d = give(f.pc, {}); begin(f, d); pump(f, 3); me(f).mg!.strain = 5; const ap = me(f).ap, mana = f.cb.mana!;
    A(f, { type: 'combat/letgo' }); expect(me(f).mg!.held).toBeNull(); expect(me(f).mg!.strain).toBe(2); expect(me(f).ap).toBe(ap); expect(f.cb.mana).toBe(mana + 1);
    expect(fx(f.cb, 'letgo').at(-1)).toMatchObject({ stage: 3, by: 3 }); expect(lost(f.foe)).toBe(0);
  });
  it('the turn start: −1 always, whatever you did', () => {
    const f = rig(); me(f).mg!.strain = 3; me(f).mg!.cast = true; f.turn(f.pc); expect(me(f).mg!.strain).toBe(2);
  });
});

describe('the second school: a rider at half strength with its own option (section 4)', () => {
  it('Damage + Control (push): full damage, then a 1-tile push', () => {
    const f = rig(); const d = give(f.pc, { school2: 'control', option2: 'push' });
    begin(f, d); pump(f); release(f, '6,5'); expect(lost(f.foe)).toBe(20); expect(f.foe.pos).toBe('7,5');
  });
  it('Buff (heal) + Status (Inspired) on an ally: the heal, then Inspired for 1 round', () => {
    const f = rig(['12,5'], ['4,5']); const ally = f.pcs[1]; ally.hp = 100;
    const d = give(f.pc, { school: 'buff', option: 'heal', school2: 'status', option2: 'inspired' });
    begin(f, d); pump(f); release(f, '4,5');
    expect(f.unit(ally.id).hp).toBe(130); expect(condOn(f.unit(ally.id), 'inspired')).toBe(true); expect(f.unit(ally.id).conds!.inspired).toBe(1);
  });
  it('Control (Pinned) + Damage: Pinned, and half damage with no roll', () => {
    const f = rig(); const d = give(f.pc, { school: 'control', option: 'pinned', school2: 'damage' });
    begin(f, d); pump(f); release(f, '6,5'); expect(condOn(f.foe, 'pinned')).toBe(true); expect(lost(f.foe)).toBe(10);
  });
});

describe('tones: Raw and the six elements, riders by stage (section 5)', () => {
  /** Release a toned Bolt at the foe (6,5) at a stage; returns the fight. */
  function hit(tone: string, stage: number, o: { mana?: number; foes?: string[]; armour?: number } = {}) {
    const f = rig(o.foes || ['6,5'], [], o.mana ?? 15); if (o.armour) f.foe.armour = o.armour;
    const d = give(f.pc, { tone }); begin(f, d); pump(f, stage); release(f, '6,5'); return f;
  }
  it('an element deals Elemental damage (armour half); Raw ignores armour', () => {
    expect(lost(hit('raw', 1, { armour: 10 }).foe)).toBe(20);
    expect(lost(hit('fire', 1, { armour: 10 }).foe)).toBe(15);
    const f = hit('fire', 1); expect(fx(f.cb, 'release').at(-1)).toMatchObject({ tone: 'fire', element: 'fire' });
  });
  it('Fire: none at 1; Burning 2 rounds at 2–3; at 4 it spreads to foes next to the target and the ground burns', () => {
    expect(condOn(hit('fire', 1).foe, 'burning')).toBe(false);
    for (const s of [2, 3]) { const f = hit('fire', s); expect(condOn(f.foe, 'burning')).toBe(true); expect(f.foe.conds!.burning).toBe(2); }
    const f = hit('fire', 4, { foes: ['6,5', '7,5'] }); expect(condOn(f.foes[1], 'burning')).toBe(true);
    expect(objectsOf(f.cb).some((o) => o.kind === 'fire' && o.pos === '6,5')).toBe(true);
  });
  it('Storm: ignores half cover at 1; chains to 1 more within 2 at half at 2–3; 2 chains and Shaken at 4', () => {
    const c1 = rig(); c1.cb.map = { ...c1.cb.map, cover: ['5,5'] } as any; c1.foe.def = 9; // cover −5 would make it miss on a low roll
    const plan = withGame(c1.g, () => previewOutburstPlan(c1.cb, c1.pc, give(c1.pc, { tone: 'storm' }), '6,5', { stage: 1 }));
    expect(plan.affected[0].roll!.cover).toBe(false);
    const f2 = hit('storm', 2, { foes: ['6,5', '8,5', '10,5'] }); expect(lost(f2.foes[1])).toBe(Math.floor(20 * 1.4 * 0.5)); expect(lost(f2.foes[2])).toBe(0);
    const f4 = hit('storm', 4, { foes: ['6,5', '8,5', '10,5'] }); expect(lost(f4.foes[2])).toBe(Math.floor(20 * 2.2 * 0.5));
    expect(condOn(f4.foes[0], 'shaken')).toBe(true); expect(fx(f4.cb, 'chain').length).toBe(2);
  });
  it('Frost: Slowed (save) at 1; Slowed (no save) at 2–3; Slowed and Pinned 1 round at 4', () => {
    expect(condOn(hit('frost', 1).foe, 'slowed')).toBe(true);
    const f = rig(); f.foe.sv = { body: 99, brain: 0, heart: 0 } as any; const d = give(f.pc, { tone: 'frost' }); begin(f, d); pump(f, 1); release(f, '6,5');
    expect(condOn(f.foe, 'slowed')).toBe(false); // saved
    const g = rig(); g.foe.sv = { body: 99, brain: 0, heart: 0 } as any; const d2 = give(g.pc, { tone: 'frost' }); begin(g, d2); pump(g, 2); release(g, '6,5');
    expect(condOn(g.foe, 'slowed')).toBe(true); // no save
    const f4 = hit('frost', 4); expect(condOn(f4.foe, 'pinned')).toBe(true); expect(condOn(f4.foe, 'slowed')).toBe(true);
  });
  it('Stone: armour counts in full and +10 from stage 1; Prone at 2–3; rubble around the target at 4', () => {
    expect(lost(hit('stone', 0, { armour: 10 }).foe)).toBe(Math.floor(20 * 0.6) - 5);
    expect(lost(hit('stone', 1, { armour: 10 }).foe)).toBe(20 + 10 - 10);
    expect(hit('stone', 2).foe.prone).toBe(true);
    const f = hit('stone', 4); expect(objectsOf(f.cb).filter((o) => o.kind === 'rubble').length).toBeGreaterThanOrEqual(6);
  });
  it('Gale: push 2 at 1, 3 at 2–3; at 4 the target 3 and everyone else within 1 of it 2', () => {
    expect(hit('gale', 1).foe.pos).toBe('8,5'); expect(hit('gale', 2).foe.pos).toBe('9,5');
    const f = hit('gale', 4, { foes: ['6,5', '6,6'] }); expect(f.foes[0].pos).toBe('9,5'); expect(f.foes[1].pos).not.toBe('6,6');
  });
  it('Acid: Corroded (save) at 1; no save at 2–3; at 4 Defense −2 more while it lasts', () => {
    expect(condOn(hit('acid', 1).foe, 'corroded')).toBe(true);
    const f = hit('acid', 4); expect(condOn(f.foe, 'corroded')).toBe(true); expect(f.foe.def).toBe(-99 - 4);
  });
  it('Flooded air: riders count one stage higher; Thin air: one lower', () => {
    expect(condOn(hit('fire', 1, { mana: 35 }).foe, 'burning')).toBe(true);
    expect(condOn(hit('fire', 2, { mana: 5 }).foe, 'burning')).toBe(false);
    const f = hit('fire', 3, { mana: 35, foes: ['6,5', '7,5'] }); expect(condOn(f.foes[1], 'burning')).toBe(true); // reads as stage 4
  });
});

describe('shapes: Bolt, Wave, Burst, Aura, Lance, with their areas (section 7)', () => {
  const area = (f: F, d: string, aim: string) => withGame(f.g, () => outburstArea(f.cb, f.pc, f.pc.mg!.designs.find((x) => x.id === d)!, aim)).sort();
  it('Bolt: the aim only; Burst radius 1 at the aim (Size: 2); Aura radius 1 around you, not your tile (Size: 2)', () => {
    const f = rig();
    expect(area(f, give(f.pc, {}), '6,5')).toEqual(['6,5']);
    expect(area(f, give(f.pc, { modules: ['burst'] }), '6,5').length).toBe(9);
    expect(area(f, give(f.pc, { modules: ['burst', 'size'] }), '6,5').length).toBe(25);
    const au = area(f, give(f.pc, { modules: ['aura'] }), '3,5'); expect(au.length).toBe(8); expect(au).not.toContain('3,5');
    expect(area(f, give(f.pc, { modules: ['aura', 'size'] }), '3,5').length).toBe(24);
  });
  it('Wave: a 3-tile cone from you toward the aim; Lance: a straight 4-tile line that pierces (Size: 6)', () => {
    const f = rig();
    const w = area(f, give(f.pc, { modules: ['wave'] }), '9,5'); expect(w).toContain('4,5'); expect(w).toContain('6,5'); expect(w).toContain('5,6'); expect(w).not.toContain('7,5'); expect(w).not.toContain('2,5');
    expect(area(f, give(f.pc, { modules: ['lance'] }), '9,5')).toEqual(['4,5', '5,5', '6,5', '7,5']);
    expect(area(f, give(f.pc, { modules: ['lance', 'size'] }), '12,5').length).toBe(6);
    expect(area(f, give(f.pc, { modules: ['lance'] }), '9,8')).toEqual(['4,6', '5,7', '6,8', '7,9']);
  });
  it('through the reducer: a Lance pierces two foes in a row (each rolls); a Burst hits all in it with no roll at ×0.7; an Aura needs no aim', () => {
    const f = rig(['5,5', '7,5']); const l = give(f.pc, { modules: ['lance'] });
    begin(f, l); pump(f); release(f, '9,5'); expect(lost(f.foes[0])).toBe(16); expect(lost(f.foes[1])).toBe(16);
    const g = rig(['6,5', '7,6']); const b = give(g.pc, { modules: ['burst'] }); g.foes[0].def = 99; g.foes[1].def = 99;
    begin(g, b); pump(g); release(g, '6,5'); expect(lost(g.foes[0])).toBe(14); expect(lost(g.foes[1])).toBe(14);
    const h = rig(['4,5', '2,4']); const a = give(h.pc, { modules: ['aura'] });
    begin(h, a); pump(h); release(h); expect(lost(h.foes[0])).toBe(12); expect(lost(h.foes[1])).toBe(12); expect(lost(h.pc)).toBe(0);
  });
  it('a hostile area reaches allies too (friendly fire); a Buff area reaches allies only', () => {
    const f = rig(['6,5'], ['6,6']); const b = give(f.pc, { modules: ['burst'] });
    begin(f, b); pump(f); release(f, '6,5'); expect(lost(f.unit(f.pcs[1].id))).toBe(14);
    const g = rig(['6,5'], ['6,6']); g.foe.hp = 100; g.unit(g.pcs[1].id).hp = 100; const h = give(g.pc, { school: 'buff', option: 'heal', modules: ['burst'] });
    begin(g, h); pump(g); release(g, '6,5'); expect(g.foe.hp).toBe(100); expect(g.unit(g.pcs[1].id).hp).toBe(130);
  });
});

describe('holding is gameplay: the aura, Heart Overwatch, Resonance, Feeding (section 6)', () => {
  it('the aura: holding an elemental Outburst, adjacent enemies take 5 Elemental and the stage-1 rider at your turn start', () => {
    const f = rig(['4,5', '9,5']); const d = give(f.pc, { tone: 'frost' }); begin(f, d);
    f.turn(f.pc); expect(lost(f.foes[0])).toBe(5); expect(condOn(f.foes[0], 'slowed')).toBe(true); expect(lost(f.foes[1])).toBe(0);
    expect(fx(f.cb, 'aura_tick').at(-1)).toMatchObject({ tone: 'frost', targets: [f.foes[0].id] });
    const g = rig(['4,5']); const r = give(g.pc, {}); begin(g, r); g.turn(g.pc); expect(lost(g.foe)).toBe(0); // Raw: no aura
  });
  it('Heart Overwatch (combat/heartwatch): an enemy entering your reach draws the release as your reaction', () => {
    const f = rig(['12,5']); const d = give(f.pc, {}); begin(f, d); pump(f, 2); A(f, { type: 'combat/heartwatch', on: true });
    expect(me(f).mg!.held!.watch).toBe(true);
    const foe = f.unit(f.foe.id); f.cb.turn = f.cb.order.indexOf(foe.id); foe.ap = 9;
    withGame(f.g, () => moveUnit(f.cb, foe, '6,5', f.g.rng));
    expect(lost(foe)).toBe(Math.floor(20 * 1.4)); expect(me(f).mg!.held).toBeNull();
    expect(fx(f.cb, 'heart_overwatch').at(-1)).toMatchObject({ target: foe.id, stage: 2 }); expect(fx(f.cb, 'release').at(-1).reaction).toBe(true);
    expect(f.pc.reactedRound ?? (f.pc as any).reactUsed?.r).toBe(f.cb.round);
  });
  it('Resonance: an ally who releases after another in the same round gets +0.2 on the stage multiplier', () => {
    const f = rig(['6,5', '6,7'], ['3,7']); const d = give(f.pc, {}); const a = f.pcs[1]; const d2 = give(f.unit(a.id), {});
    begin(f, d); pump(f); release(f, '6,5'); expect(lost(f.foes[0])).toBe(20);
    const u2 = f.turn(a); u2.ap = 60; f.g.rng.state = SEED;
    const plan = withGame(f.g, () => previewOutburstPlan(f.cb, f.unit(a.id), d2, '6,7', { stage: 1 })); expect(plan.resonance).toBe(true); expect(plan.mult).toBeCloseTo(1.2);
    begin(f, d2, u2); pump(f, 1, u2); release(f, '6,7', u2); expect(lost(f.foes[1])).toBe(24);
    expect(fx(f.cb, 'resonance').at(-1)).toMatchObject({ unit: a.id, with: [f.pc.id] });
  });
  it('Resonance is capped at +0.4 in total per release (Leon 8 Nov 2026): the fourth releaser of a round gets +0.4, not +0.6', () => {
    const f = rig(['6,5', '6,7', '6,9', '6,11'], ['3,7', '3,9', '3,11']);
    const by = (i: number) => (i < 2 ? 'host' : 'p' + i); // the helper seats the third and fourth with other players
    const B = (i: number, a: Record<string, any>) => f.act({ unitId: f.pcs[i].id, ...a } as any, by(i));
    for (let i = 0; i < 3; i++) { const d = give(f.unit(f.pcs[i].id), {}); f.turn(f.pcs[i]).ap = 60; B(i, { type: 'combat/outburst', design: d }); B(i, { type: 'combat/release', aim: f.foes[i].pos }); }
    const last = f.pcs[3], d4 = give(f.unit(last.id), {}); f.turn(last).ap = 60; f.g.rng.state = SEED;
    const plan = withGame(f.g, () => previewOutburstPlan(f.cb, f.unit(last.id), d4, '6,11', { stage: 1 }));
    expect(plan.resonanceBonus).toBeCloseTo(0.4); expect(plan.mult).toBeCloseTo(1.4);
    B(3, { type: 'combat/outburst', design: d4 }); B(3, { type: 'combat/pump' }); B(3, { type: 'combat/release', aim: '6,11' }); expect(lost(f.foes[3])).toBe(28);
    expect(fx(f.cb, 'resonance').at(-1)).toMatchObject({ unit: last.id, bonus: 0.4 }); expect(fx(f.cb, 'resonance').at(-1).with.length).toBe(3);
  });
  it('Feeding (combat/feed, 1 AP): a glyph on your own tile goes into the held Outburst: +1 stage; the glyph is gone', () => {
    const f = rig(); const d = give(f.pc, {}); begin(f, d);
    expect(() => A(f, { type: 'combat/feed' })).toThrow(/No glyph/);
    f.cb.glyphs = [{ id: 'g1', word: 'fire', pos: '3,5', by: f.foe.id, side: 'foe', left: 3, who: 'Foe', v: 14 }]; const ap = me(f).ap;
    A(f, { type: 'combat/feed' }); expect(me(f).mg!.held!.stage).toBe(1); expect(f.cb.glyphs!.length).toBe(0); expect(me(f).ap).toBe(ap - 1);
    expect(fx(f.cb, 'feed').at(-1)).toMatchObject({ word: 'fire', stage: 1 });
  });
});

describe('the preview standard (section 7)', () => {
  it('previewOutburstPlan: AP, MP, Strain after and warnings, stage, mult, shape, tone, reach and area tiles, who and their numbers, rider', () => {
    const f = rig(['6,5', '7,6'], ['6,4']); me(f).mg!.strainLimit = 2; f.foes[0].armour = 10;
    const d = give(f.pc, { modules: ['burst'], tone: 'fire' });
    const p = withGame(f.g, () => previewOutburstPlan(f.cb, me(f), d, '6,5', { stage: 3 }));
    expect(p.ok).toBe(true); expect(p.ap).toBe(2 + 3 + 1); expect(p.mp).toBeGreaterThan(0); expect(p.strain).toBe(1); expect(p.strainAfter).toBe(1);
    expect(p).toMatchObject({ stage: 3, mult: 1.8, form: 'burst', tone: 'fire', element: 'fire', riderStage: 3, reach: 4, needsAim: true, resonance: false });
    expect(p.area.length).toBe(9); expect(p.reachTiles.length).toBeGreaterThan(9);
    const foe = p.affected.find((a) => a.unit === f.foes[0].id)!, ally = p.affected.find((a) => a.unit === f.pcs[1].id)!;
    expect(foe).toMatchObject({ enemy: true, dmg: Math.round(20 * 1.8 * 0.7), dmgAfterArmour: Math.round(20 * 1.8 * 0.7) - 5, rider: 'Burning 2 rounds.' });
    expect(foe.roll).toBeNull(); expect(ally.ally).toBe(true); expect(ally.rider).toBe('');
    me(f).mg!.strain = 4; const w = withGame(f.g, () => previewOutburstPlan(f.cb, me(f), d, '6,5'));
    expect(w.burnWarning).toBe(3 * 8); expect(w.shortWarning).toBe(true);
    me(f).mg!.strain = 0; begin(f, d); const h = withGame(f.g, () => previewOutburstPlan(f.cb, me(f), 'held', '6,5'));
    expect(h.ok).toBe(true); expect(h.ap).toBe(1); expect(h.mp).toBe(0); expect(h.stage).toBe(0);
    const bad = withGame(f.g, () => previewOutburstPlan(f.cb, me(f), 'held', '15,5')); expect(bad.ok).toBe(false); expect(bad.why).toMatch(/reach/);
  });
});

describe('old saves (1.2 designs and holds) convert', () => {
  it('migrateDesign: Rain → Burst, Size alone → Burst, Rain + Size → Burst + Size, Teleport → Ether; Duplicate, Bounce, Periodic go', () => {
    const m = (mods: string[]) => migrateDesign({ id: 'x', name: 'x', school: 'damage', modules: mods }).modules;
    expect(m(['rain'])).toEqual(['burst']); expect(m(['size'])).toEqual(['burst']); expect(m(['rain', 'size'])).toEqual(['burst', 'size']);
    expect(m(['teleport', 'homing'])).toEqual(['ether', 'homing']); expect(m(['duplicate', 'bounce', 'periodic', 'proximity', 'expire', 'mastery'])).toEqual([]);
    expect(m(['move', 'swift'])).toEqual(['move', 'swift']);
    expect(migrateDesign({ id: 'x', name: 'x', school: 'damage', modules: [], tone: 'plasma' }).tone).toBeUndefined();
  });
  it('a 1.2 hold keeps its stage; a character’s old designs and modules convert once on the next action', () => {
    expect(migrateHeld({ design: 'o1', stage: 3, cost: 20 })).toMatchObject({ design: 'o1', stage: 3, tone: 'raw', form: 'bolt', v: 15 });
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const id = s.chars[0].id;
    const g0 = JSON.parse(JSON.stringify(s.g)); const c = g0.characters[id];
    c.outbursts = [{ id: 'o1', name: 'Red Rain', school: 'damage', modules: ['rain', 'bounce'] }]; c.soulKnown = { schools: ['damage'], modules: ['rain', 'bounce', 'homing'] }; delete c.soulRev;
    g0.story.magic = { [id]: { flux: 0, strain: 2, held: { design: 'o1', stage: 2, cost: 25 }, conds: {} } };
    const g1 = apply(g0, { type: 'magic/forget', charId: id, designId: 'none' } as any, c.owner);
    expect(g1.characters[id].outbursts![0].modules).toEqual(['burst']); expect(g1.characters[id].soulKnown!.modules).toEqual(['burst', 'homing']);
    expect(g1.characters[id].soulRev).toBe(15);
  });
});

describe('designing under 1.5 (magic/design)', () => {
  it('one shape a design; Size needs a shape; a tone you know (the first free at Visualization 1); option2 for the second school', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const c = s.g.characters[s.chars[0].id];
    c.soulKnown = { schools: ['damage', 'control'], modules: ['wave', 'burst', 'size'], tones: [] }; c.skills.will_power = 6; c.skills.visualization = 1; c.outbursts = [];
    expect(() => s.act({ type: 'magic/design', charId: c.id, design: { id: '', name: 'Two', school: 'damage', modules: ['wave', 'burst'] } } as any, c.owner)).toThrow(/One shape/);
    expect(() => s.act({ type: 'magic/design', charId: c.id, design: { id: '', name: 'S', school: 'damage', modules: ['size'] } } as any, c.owner)).toThrow(/Size needs a shape/);
    s.act({ type: 'magic/design', charId: c.id, design: { id: '', name: 'Hot', school: 'damage', school2: 'control', option2: 'push', modules: ['burst'], tone: 'fire' } } as any, c.owner);
    const d = s.g.characters[c.id].outbursts!.at(-1)!; expect(d).toMatchObject({ tone: 'fire', option2: 'push', modules: ['burst'] });
    expect(s.g.characters[c.id].soulKnown!.tones).toEqual(['fire']);
    expect(() => s.act({ type: 'magic/design', charId: c.id, design: { id: '', name: 'Cold', school: 'damage', modules: [], tone: 'frost' } } as any, c.owner)).toThrow(/haven't learned the Frost/);
  });
});

describe('the area map (world/act)', () => {
  it('Begin, Pump, Steady and Let go work on the area map, and the held heart carries between actions', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const c = s.g.characters[s.chars[0].id];
    expect(s.g.story.await).toBe('players');
    const d = c.outbursts![0].id;
    s.act({ type: 'world/act', charId: c.id, act: 'outburst', design: d } as any, c.owner);
    expect(s.g.story.magic![c.id].held).toMatchObject({ design: d, stage: 0 });
    s.act({ type: 'world/act', charId: c.id, act: 'pump' } as any, c.owner); expect(s.g.story.magic![c.id].held!.stage).toBe(1);
    s.act({ type: 'world/act', charId: c.id, act: 'steady' } as any, c.owner); expect(s.g.story.magic![c.id].held!.steady).toBe(true);
    s.act({ type: 'world/act', charId: c.id, act: 'letgo' } as any, c.owner); expect(s.g.story.magic![c.id].held).toBeNull();
  });
});
