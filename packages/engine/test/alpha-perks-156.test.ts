// @ts-nocheck (test fixtures: plain objects)
// Rules 1.56 (Balance 2.0), the alpha-perk lane: P1 (spell damage names its door) and the 18 alpha perks
// (docs/design/proposals/2026-11-alpha-perks-revamp.md). Every perk is shown through the reducer (apply: a real attack,
// technique, draw, Evoke, Release, prayer, Figment order or door verb): it changes the action's result by its data's
// number under its condition and does nothing outside it. Every number is read from data/perks.json.
import { describe, it, expect } from 'vitest';
import { onHook } from '../src/effects/hooks';
import { PERK, d20, applyCond, previewAttack, previewDraw, hymnWait, setDevotionXp, devotionThreshold, beginTurn, clearPrayerLimits, condOn, type Unit } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';
import { physFight, rig } from './helpers/physfight';
import { figFight } from './helpers/figfight';
import PERKS from '../../../data/perks.json';

const P = (id: string): any => (PERKS as any).items.find((x: any) => x.id === id);
const E = (id: string, tier: 'I' | 'II', i = 0): any => P(id).tiers[tier].effects[i];
const NAME = (id: string) => P(id).name;

// ---------------------------------------------------------------------------------------------------------------- taps
/** Every damage_out of the fight while on: its door, stage and its multiplier list (the list itself: items add to it later). */
const TAP: { on: boolean; rows: any[]; kills: any[] } = { on: false, rows: [], kills: [] };
onHook('damage_out', (ctx: any) => { if (TAP.on && !ctx.preview) TAP.rows.push({ door: ctx.src?.door, stage: ctx.src?.stage, type: ctx.src?.type, mults: ctx.mults, att: ctx.att?.id, tgt: ctx.tgt?.id }); });
onHook('on_kill', (ctx: any) => { if (TAP.on) TAP.kills.push({ tech: ctx.src?.tech, mode: ctx.src?.mode, by: ctx.by?.id }); });
/** The most Guard the unit named holds right after a blow hurts it (Answer in Kind II's gift: a later blow may spend it). */
const GUARD: { id: string | null; at: number | null } = { id: null, at: null };
onHook('on_damaged', (ctx: any) => { if (GUARD.id && ctx.t?.id === GUARD.id) GUARD.at = Math.max(GUARD.at ?? 0, ctx.t.res?.guard ?? 0); });
/** The doors of the damage that lands while on (a delayed deal fires no damage_out: its source still names the door). */
const LANDED: { on: boolean; doors: any[] } = { on: false, doors: [] };
onHook('on_damaged', (ctx: any) => { if (LANDED.on) LANDED.doors.push(ctx.src?.door); });
function tap(fn: () => void) { TAP.rows = []; TAP.kills = []; TAP.on = true; try { fn(); } finally { TAP.on = false; } return { rows: TAP.rows, kills: TAP.kills }; }
/** The term a perk put on the damage (its label is the perk's name), on every row that has it. */
const termOf = (rows: any[], id: string) => rows.flatMap((r) => r.mults.filter((m: any) => m.label === NAME(id) && m.v !== 1).map((m: any) => m.v));
function seedFor(pred: (r: { state: number }) => boolean): number { for (let s = 1; s < 3_000_000; s++) { if (pred({ state: s })) return s; } throw new Error('no seed'); }
/** A seed whose next n d20s are 2 to 19. */
const calm = (n = 30) => seedFor((r) => { for (let i = 0; i < n; i++) { const v = d20(r); if (v < 2 || v > 19) return false; } return true; });
const open = (cb: any) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] }; cb.objects = []; };

/** A shooter (service rifle) at 2,5 against a big, easy soldier at 6,5, on the shooter's turn. */
function gun(perks: Record<string, string> = {}, o: { skills?: Record<string, number> } = {}) {
  // rules 1.97 item 8341: a shooter lays pips up to its Dexterity Reach: a full one, so the cap never hides a pip
  const f = fightWith([{ perks, weapon: 'hellraiser_service_rifle', skills: o.skills || { dexterity: 10, athletics: 7, reaction_speed: 4 } }], [{ at: 'G6' }]); open(f.cb);
  f.pc.pos = '2,5'; f.foe.pos = '6,5'; f.foe.hp = f.foe.maxHp = 5000; f.foe.def = -40; f.foe.marginsTaken = -99; /* rules 1.96: an unmissable fixture takes no Margins */ f.foe.armour = 0;
  const u = f.turn(f.pc); u.ap = 9; f.g.rng.state = calm();
  const shoot = () => f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any);
  return { f, shoot };
}

// ====================================================================================================================== P1
describe('P1: spell damage names its door (src.door; an Outburst its src.stage)', () => {
  it('a weapon shot has no door; the damage word outburst no longer matches it', () => {
    const { shoot } = gun(); const { rows } = tap(shoot);
    expect(rows.length).toBeGreaterThan(0); expect(rows.every((r) => r.door == null)).toBe(true);
  });
  it('a Sigil spell (a Line, Evoked) is the sigil door', () => {
    const f = sigil({});
    const { rows } = tap(() => evokeAt(f));
    expect(rows.length).toBeGreaterThan(0); expect(rows.every((r) => r.door === 'sigil')).toBe(true);
  });
  it('an Outburst Released at stage 2 is the outburst door, stage 2', () => {
    const f = soul({});
    const { rows } = tap(() => releaseAt(f, 2));
    expect(rows.length).toBeGreaterThan(0); expect(rows[0]).toMatchObject({ door: 'outburst', stage: 2 });
  });
  it('a prayer (Rebuke, a Whisper) is the prayer door', () => {
    const h = priest({});
    const { rows } = tap(() => h.pray('whisper', 'rebuke', { targetId: h.foe.id }));
    expect(rows.length).toBeGreaterThan(0); expect(rows.every((r) => r.door === 'prayer')).toBe(true);
  });
  it('a Bond\'s echo (tend.threads, an amount block\'s door) is the bond door, not the outburst door', () => {
    const t = tend({}); t.bond(); t.u().hp = 20; t.mendSelf();
    LANDED.doors = []; LANDED.on = true; try { t.foeTurn(); } finally { LANDED.on = false; }
    expect(LANDED.doors.length).toBeGreaterThan(0); expect(LANDED.doors.every((d) => d === 'bond')).toBe(true);
  });
});

// ============================================================================================================ Durability
describe('Weight of the Wall (bulwark): weapon damage per Guard held', () => {
  for (const tier of ['I', 'II'] as const) it(tier + ': +step per Guard, capped; no Guard, nothing', () => {
    const blk = E('bulwark', tier).value;
    const run = (guard: number) => { const { f, shoot } = gun({ bulwark: tier }); const u = f.pc; u.resMax = { ...(u.resMax || {}), guard: 9 }; u.res = { ...(u.res || {}), guard }; return termOf(tap(shoot).rows, 'bulwark'); };
    expect(run(0)).toEqual([]);
    expect(run(2)[0]).toBeCloseTo(1 + 2 * blk.per[0].value, 6);
    expect(run(9)[0]).toBeCloseTo(blk.max, 6);
  });
});
describe('Answer in Kind (shrug_it_off): an enemy\'s blow that hurts you', () => {
  for (const tier of ['I', 'II'] as const) it(tier + ': the next turn\'s weapon attacks deal more; unhurt, nothing; it ends with that turn', () => {
    const { f, shoot } = gun({ shrug_it_off: tier });
    expect(termOf(tap(shoot).rows, 'shrug_it_off')).toEqual([]);
    const u = f.pc; u.def = -99; u.marginsTaken = -99; /* rules 1.96: an unmissable fixture takes no Margins */ u.hp = u.maxHp = 5000; u.resMax = { ...(u.resMax || {}), guard: 9 }; u.res = { ...(u.res || {}), guard: 0 };
    f.foe.pos = '3,5'; GUARD.id = u.id; GUARD.at = null;
    f.act({ type: 'combat/end-turn', unitId: u.id } as any); GUARD.id = null; // the foe's turn: it shoots
    expect(f.pc.hp).toBeLessThan(5000);
    expect(GUARD.at).toBe(tier === 'II' ? E('shrug_it_off', 'II', 3).value : 0);
    const v = f.turn(f.pc); v.ap = 9; f.foe.pos = '6,5';
    expect(termOf(tap(shoot).rows, 'shrug_it_off')[0]).toBe(E('shrug_it_off', tier, 1).value);
  });
});

// ============================================================================================================ Raw Power
describe('Iron Grip: the Grapple stays; melee hits on a Grappled or Prone (II: Shaken, Afraid) enemy deal more', () => {
  for (const tier of ['I', 'II'] as const) it(tier, () => {
    const run = (cond: string | null) => {
      const f = physFight([{ weapon: 'sabre', perks: { iron_grip: tier }, skills: { raw_power: 3 } }], [{ at: 'D5' }]); f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.foe.hp = f.foe.maxHp = 5000;
      f.turn(f.pc); if (cond) withGame(f.g, () => applyCond(f.cb, f.g.rng, f.pc, f.foe, cond, 3, undefined, { skipSave: true })); rig({ hit: true });
      const r = termOf(tap(() => f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'melee' } as any)).rows, 'iron_grip'); rig(null); return r;
    };
    const v = 1 + E('iron_grip', tier, 1).value_pct / 100;
    expect(run(null)).toEqual([]); expect(run('prone')[0]).toBeCloseTo(v, 6);
    expect(run('shaken')).toEqual(tier === 'II' ? [expect.closeTo(v, 6)] : []);
  });
});
// Rules 1.60 item 4625 (R7): a Finisher's kill no longer leaves Momentum (Follow Through is the one source); it makes the
// next Strike or Opener, before the end of the holder's next turn, cost no Momentum (the condition `swinging`).
describe('Keep Swinging (breaching_strike): a Finisher\'s kill makes the next Strike or Opener free of Momentum', () => {
  for (const tier of ['I', 'II'] as const) it(tier + ': the kill event carries its technique; a plain blow\'s kill gives nothing; the next turn\'s Bash costs no Momentum', () => {
    const run = (perk: boolean, how: 'coup' | 'melee') => {
      const f = physFight([{ weapon: 'sabre', known: ['coup', 'bash'], perks: perk ? { breaching_strike: tier } : {}, skills: { raw_power: 3 } }], [{ at: 'D5', tier: 'minion' }, { at: 'D6' }]);
      const [first, second] = f.cb.units.filter((u: any) => u.side === 'foe');
      f.put(f.pc, 'C5'); f.put(first, 'D5'); f.put(second, 'C6'); f.unit(first.id).hp = 1; f.unit(second.id).hp = f.unit(second.id).maxHp = 900;
      f.turn(f.pc); f.pc.ap = 9; f.momentum(f.pc, 2); rig({ hit: true });
      const t = tap(() => (how === 'coup' ? f.tech('coup', { targetId: first.id }) : f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: first.id, mode: 'melee' } as any))); rig(null);
      const m = f.momentum(f.pc), swinging = condOn(f.unit(f.pc.id), 'swinging');
      return { f, second, m, swinging, kills: t.kills, dead: f.unit(first.id).dead || f.unit(first.id).hp <= 0 };
    };
    const a = run(true, 'coup'), b = run(false, 'coup');
    expect(a.dead).toBe(true); expect(a.kills[0]?.tech).toBe('coup');
    expect(a.m).toBe(b.m); // no Momentum left by the kill (rules 1.60: Follow Through is the one source)
    expect(a.swinging).toBe(true); expect(b.swinging).toBe(false);
    const c = run(true, 'melee'); expect(c.swinging).toBe(false);
    // the holder's next turn: at 0 Momentum a Bash (a Strike, 1 Momentum) is refused without the perk, and free with it
    for (const [r, free] of [[a, true], [b, false]] as const) {
      r.f.cb.round++; r.f.turn(r.f.pc); r.f.pc.ap = 9; r.f.momentum(r.f.pc, 0); rig({ hit: true }); // a new round: a new chain
      const no = r.f.tech('bash', { targetId: r.second.id }); rig(null);
      if (free) { expect(no).toBe(null); expect(r.f.momentum(r.f.pc)).toBe(0); expect(condOn(r.f.unit(r.f.pc.id), 'swinging')).toBe(false); } else expect(no).toMatch(/Momentum/);
    }
  });
  it('II: a Finisher that hits an Elite or a Boss gives the perk\'s Momentum once it is done', () => {
    const run = (perk: boolean) => {
      const f = physFight([{ weapon: 'sabre', known: ['coup'], perks: perk ? { breaching_strike: 'II' } : {}, skills: { raw_power: 5 } }], [{ at: 'D5', tier: 'elite' }]);
      f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.unit(f.foe.id).hp = f.unit(f.foe.id).maxHp = 900; f.turn(f.pc); f.pc.ap = 9; f.momentum(f.pc, 2); rig({ hit: true });
      f.tech('coup', { targetId: f.foe.id }); rig(null); return f.momentum(f.pc);
    };
    expect(run(true) - run(false)).toBe(E('breaching_strike', 'II', 3).value);
  });
});

// ============================================================================================================ Dexterity
// Rules 1.60 items 4614, 4615 (Doors 3.0 slice A, A3): the two gun alpha perks moved from damage to the Pressure door's control.
describe('Pressure Point (both_hands): a pip on a foe already Pressed (II: and one more on one Suppressed), a small damage step', () => {
  for (const tier of ['I', 'II'] as const) it(tier + ': the damage term', () => {
    const steps = E('both_hands', tier, 1).value.steps;
    const run = (p: number) => { const { f, shoot } = gun({ both_hands: tier }); f.foe.pressure = p; return termOf(tap(shoot).rows, 'both_hands'); };
    expect(run(steps[0].at - 1)).toEqual([]);
    expect(run(steps[0].at)[0]).toBeCloseTo(1 + steps[0].value, 6);
    if (tier === 'II') expect(run(steps[1].at)[0]).toBeCloseTo(1 + steps[0].value + steps[1].value, 6);
  });
  for (const tier of ['I', 'II'] as const) it(tier + ': the pips: none on a foe not yet Pressed, one more on a Pressed one, once a turn for each enemy', () => {
    const pip = E('both_hands', tier, 0).value.steps;
    const run = (perk: boolean, p: number) => { const { f, shoot } = gun(perk ? { both_hands: tier } : {}); f.foe.pressure = p; rig({ hit: true }); shoot(); rig(null); return f.foe.pressure || 0; };
    expect(run(true, pip[0].at - 1) - run(false, pip[0].at - 1)).toBe(0);
    expect(run(true, pip[0].at) - run(false, pip[0].at)).toBe(pip[0].value);
  });
});
describe('Keep Their Heads Down (running_reload): Off Balance on a foe already Pressed', () => {
  for (const tier of ['I', 'II'] as const) it(tier + ': a ranged hit on a Pressed foe; never on one that is not', () => {
    const at = E('running_reload', tier).if.target_res.pressure.at_least;
    const run = (p: number) => { const { f, shoot } = gun({ running_reload: tier }); f.foe.pressure = p; rig({ hit: true }); shoot(); rig(null); return f; };
    expect(condOn(run(at - 1).foe, 'off_balance')).toBeFalsy();
    if (tier === 'II') expect(condOn(run(at).foe, 'off_balance')).toBeTruthy(); // Tier II: no save
    expect(E('running_reload', tier).condition).toBe('off_balance');
  });
});

// ============================================================================================================ Ingenuity
describe('Long Dark (sleight_of_hand): attacks made while Hidden', () => {
  for (const tier of ['I', 'II'] as const) it(tier, () => {
    const run = (hidden: boolean) => { const { f, shoot } = gun({ sleight_of_hand: tier }); if (hidden) withGame(f.g, () => applyCond(f.cb, f.g.rng, f.pc, f.pc, 'hidden', undefined, undefined, { skipSave: true })); return termOf(tap(shoot).rows, 'sleight_of_hand'); };
    expect(run(false)).toEqual([]); expect(run(true)[0]).toBe(E('sleight_of_hand', tier).value);
  });
});
describe('Shadow Step: an attack while Hidden and holding Shadow costs less, once (II: twice) a turn', () => {
  it('I: the cut is taken by the attack, not by its previews', () => {
    const run = (perk: boolean) => {
      const { f, shoot } = gun(perk ? { shadow_step: 'I' } : {}, { skills: { ingenuity: 3 } });
      const u = f.pc; withGame(f.g, () => applyCond(f.cb, f.g.rng, u, u, 'hidden', undefined, undefined, { skipSave: true }));
      u.resMax = { ...(u.resMax || {}), shadow: 3 }; u.res = { ...(u.res || {}), shadow: 2 };
      for (let i = 0; i < 3; i++) withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot'));
      const ap = f.pc.ap; shoot(); return ap - f.pc.ap;
    };
    expect(run(false) - run(true)).toBe(-E('shadow_step', 'I').value);
  });
});

// ============================================================================================================ Brain Power
/** A Sigil caster at 2,5 with SPARK and SEEK, a foe at 8,5 (Defense 1, 5000 HP, no armour), on its turn. */
function sigil(perks: Record<string, string>) {
  const f = fightWith([{ archetype: 'sigilist', kit: 'sigil', perks }], [{}]); open(f.cb);
  f.pc.pos = '2,5'; f.foe.pos = '8,5'; f.foe.def = 1; f.foe.hp = f.foe.maxHp = 5000; f.foe.armour = 0;
  const u = f.turn(f.pc); u.ap = 9; const m = u.mg!; m.evoker = true; m.words = ['spark', 'seek']; m.charge = 30; m.glyphAp = 1; m.maxWords = 4; m.flux = 0; m.rangeBonus = 0;
  return f;
}
function evokeAt(f: any) {
  f.pc.pos = '3,5'; f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'spark', tile: '3,5' });
  f.pc.pos = '2,5'; f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'seek', tile: '2,5' });
  f.g.rng.state = calm(); f.act({ type: 'combat/evoke', unitId: f.pc.id, tile: '2,5', aim: '8,5' } as any);
}
describe('Second Clause (hold_the_stroke): Sigil spells on a Burning (Slowed…) enemy', () => {
  for (const tier of ['I', 'II'] as const) it(tier + ': a Sigil spell yes, a weapon shot no', () => {
    const run = (burning: boolean) => { const f = sigil({ hold_the_stroke: tier }); if (burning) withGame(f.g, () => applyCond(f.cb, f.g.rng, f.pc, f.foe, 'slowed', 3, undefined, { skipSave: true })); return termOf(tap(() => evokeAt(f)).rows, 'hold_the_stroke'); };
    expect(run(false)).toEqual([]); expect(run(true)[0]).toBe(E('hold_the_stroke', tier).value);
    const { f, shoot } = gun({ hold_the_stroke: tier }); withGame(f.g, () => applyCond(f.cb, f.g.rng, f.pc, f.foe, 'slowed', 3, undefined, { skipSave: true }));
    expect(termOf(tap(shoot).rows, 'hold_the_stroke')).toEqual([]);
  });
});
describe('Running Hand (parallel_thought): the first glyph each turn', () => {
  for (const tier of ['I', 'II'] as const) it(tier + ': cheaper (II: no Flux); the second full price; previews spend nothing', () => {
    const run = (perk: boolean) => {
      const f = sigil(perk ? { parallel_thought: tier } : {});
      for (let i = 0; i < 3; i++) withGame(f.g, () => previewDraw(f.g, f.pc.id, 'spark', '3,5'));
      f.pc.pos = '3,5'; const a0 = f.pc.ap, x0 = f.pc.mg!.flux; f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'spark', tile: '3,5' });
      const a1 = f.pc.ap, x1 = f.pc.mg!.flux; f.pc.pos = '2,5'; f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'seek', tile: '2,5' });
      return { first: a0 - a1, second: a1 - f.pc.ap, flux: x1 - x0 };
    };
    const a = run(true), b = run(false);
    expect(a.first).toBeCloseTo(b.first + E('parallel_thought', tier).value, 6); expect(a.second).toBe(b.second);
    expect(a.flux).toBe(tier === 'II' ? 0 : b.flux);
  });
});

// ============================================================================================================ Visualization
function beast(perks: Record<string, string>, foeHp = 5000) {
  const f = figFight([{ skills: { visualization: 7 }, level: 5, weapon: 'service_pistol', perks }], [{ tier: 'soldier', at: '4,4', classic: true }]);
  let u = f.turn(f.pc); f.picture(u, 'beast', '3,4'); u = f.unit(u.id); u.ap = 9; f.foe.pos = '4,4'; f.foe.hp = f.foe.maxHp = foeHp; f.foe.def = -40; f.foe.marginsTaken = -99; /* rules 1.96: an unmissable fixture takes no Margins */
  const b = f.figments(u)[0]; f.g.rng.state = calm();
  return { f, u, b, strike: () => f.order(f.unit(u.id), b, 'figment_strike', { targetId: f.foe.id }) };
}
describe('Many-Eyed Dream (mirage): your Figments\' blows, per Figment you keep (actor_tied, through a real figment_strike)', () => {
  for (const tier of ['I', 'II'] as const) it(tier, () => {
    const blk = E('mirage', tier).value;
    const yes = beast({ mirage: tier }), no = beast({});
    const v = termOf(tap(yes.strike).rows, 'mirage'); expect(v[0]).toBeCloseTo(1 + blk.per[0].value * yes.f.figments(yes.u).length, 6);
    expect(termOf(tap(no.strike).rows, 'mirage')).toEqual([]);
    const { shoot } = gun({ mirage: tier }); expect(termOf(tap(shoot).rows, 'mirage')).toEqual([]); // the holder's own shot: not a Figment's
  });
});
describe('Wake of the Kill (blueprint): your Figment\'s kill gives AP (actor_tied)', () => {
  it('I: on your turn, once a turn', () => {
    const yes = beast({ blueprint: 'I' }, 1), no = beast({}, 1);
    const ap = (x: any) => { const a0 = x.f.unit(x.u.id).ap; x.strike(); return x.f.unit(x.u.id).ap - a0; };
    const a = ap(yes), b = ap(no);
    expect(yes.f.foe.dead || yes.f.foe.hp <= 0).toBe(true); expect(a - b).toBe(E('blueprint', 'I').value);
  });
  it('II: and 1 Visualizer charge', () => {
    const yes = beast({ blueprint: 'II' }, 1), no = beast({}, 1);
    const c = (x: any) => { const c0 = x.f.unit(x.u.id).mg.vcharge; x.strike(); return x.f.unit(x.u.id).mg.vcharge - c0; };
    expect(c(yes) - c(no)).toBe(E('blueprint', 'II').and[0].value);
  });
});

// ============================================================================================================ Empathy
/** A Bonder (Empathy 5, Attuner in the off hand, a pistol) at 3,5 against one soldier at 6,5. */
function tend(perks: Record<string, string>) {
  const s = storyWith([{ perks, skills: { empathy: 5, camaraderie: 0 }, level: 5, weapon: 'service_pistol' }]);
  s.g.characters[s.chars[0].id].offHand = { id: 'attuner' } as any;
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Tend', map: 'yard16', difficulty: 'standard', level: 5, enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '', no_surrender: true }] } } } as any);
  const cb = () => s.g.combat!, u = () => cb().units.find((x) => x.side === 'pc')!, foe = () => cb().units.find((x) => x.side === 'foe')!;
  open(cb()); u().pos = '3,5'; foe().pos = '6,5'; foe().hp = foe().maxHp = 5000; foe().def = -40; foe().armour = 0;
  const turn = (x: Unit) => { const c = cb(); c.turn = c.order.indexOf(x.id); delete c.window; withGame(s.g, () => beginTurn(c, s.g.rng)); };
  turn(u()); u().ap = 9;
  return {
    s, u, foe,
    bond: () => { foe().sv = { ...(foe().sv || {}), heart: -99 }; s.act({ type: 'combat/perk', unitId: u().id, id: 'verb:tend.bond', targetId: foe().id } as any); u().ap = 9; },
    mendSelf: () => { s.act({ type: 'combat/perk', unitId: u().id, id: 'verb:tend.mend_self' } as any); u().ap = 9; },
    shoot: () => s.act({ type: 'combat/attack', unitId: u().id, targetId: foe().id, mode: 'shot' } as any),
    foeTurn: () => turn(foe()),
  };
}
describe('Taut Thread (shared_breath): with an Attuner in hand, hits on an enemy Bonded to you', () => {
  for (const tier of ['I', 'II'] as const) it(tier, () => {
    const t = tend({ shared_breath: tier }); t.s.g.rng.state = calm();
    expect(termOf(tap(t.shoot).rows, 'shared_breath')).toEqual([]);
    t.bond(); t.s.g.rng.state = calm();
    expect(termOf(tap(t.shoot).rows, 'shared_breath')[0]).toBe(E('shared_breath', tier).value);
  });
});
describe('Bitter Balm (lay_down_arms): a heal on yourself wounds each enemy Bonded to you at its next turn', () => {
  for (const tier of ['I', 'II'] as const) it(tier + ': its share of the HP restored, on top of the Bond\'s echo', () => {
    const run = (perk: boolean) => { const t = tend(perk ? { lay_down_arms: tier } : {}); t.bond(); t.u().hp = 20; t.mendSelf(); const healed = t.u().hp - 20; const hp = t.foe().hp; t.foeTurn(); return { healed, lost: hp - t.foe().hp }; };
    const a = run(true), b = run(false), share = P('lay_down_arms').amounts[tier === 'I' ? 'balm' : 'balm_ii'].per[0].value;
    expect(a.healed).toBe(b.healed); expect(a.lost - b.lost).toBe(Math.floor(a.healed * share));
  });
});

// ============================================================================================================ Will Power
/** A Soul caster at 3,5 (Emanator, plenty of MP and AP) against one foe at 6,5 that is always hit. */
function soul(perks: Record<string, string>) {
  const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', perks }], [{ tier: 'minion' }]); open(f.cb); f.cb.mana = 15;
  f.pc.pos = '3,5'; f.foe.pos = '6,5'; f.foe.hp = f.foe.maxHp = 5000; f.foe.armour = 0; f.foe.def = -99; f.foe.marginsTaken = -99; /* rules 1.96: an unmissable fixture takes no Margins */
  const u = f.turn(f.pc); u.ap = 60; Object.assign(u.mg!, { emanator: true, mp: 9999, mpMax: 9999, strain: 0, strainLimit: 99 });
  u.mg!.designs.push({ id: 'dz', name: 'Test bolt', school: 'damage', modules: [] } as any); f.g.rng.state = calm();
  return f;
}
function releaseAt(f: any, stage: number) {
  f.act({ type: 'combat/outburst', unitId: f.pc.id, design: 'dz', hold: true } as any);
  for (let i = 0; i < stage; i++) f.act({ type: 'combat/pump', unitId: f.pc.id } as any);
  f.act({ type: 'combat/release', unitId: f.pc.id, aim: f.foe.pos } as any);
}
describe('Clenched Heart (heart_overload): Outbursts Released high (P1: the stage on the source)', () => {
  for (const tier of ['I', 'II'] as const) it(tier, () => {
    const steps = E('heart_overload', tier).value.steps, at = (st: number) => { const f = soul({ heart_overload: tier }); return termOf(tap(() => releaseAt(f, st)).rows, 'heart_overload'); };
    expect(at(steps[0].at - 1)).toEqual([]);
    expect(at(steps[0].at)[0]).toBeCloseTo(1 + steps[0].value, 6);
    if (steps[1]) expect(at(steps[1].at)[0]).toBeCloseTo(1 + steps[0].value + steps[1].value, 6);
    const h = priest({ heart_overload: tier }); expect(termOf(tap(() => h.pray('whisper', 'rebuke', { targetId: h.foe.id })).rows, 'heart_overload')).toEqual([]); // a prayer is not an Outburst
  });
});
describe('Resonance: each Release adds its step to the next, to its most', () => {
  it('I: the second Release carries one step (the data\'s value)', () => {
    const f = soul({ resonance: 'I' }); releaseAt(f, 0); f.pc.ap = 60; releaseAt(f, 0);
    const fx = (f.cb.fx || []).filter((e: any) => e.k === 'resonance' && e.perk); expect(fx.at(-1).bonus).toBeCloseTo(E('resonance', 'I').value / 100, 6);
  });
});

// ============================================================================================================ Faith
/** A Faithful (Faith 6) at 2,5 against a soldier at 6,5 with 2000 HP, on its turn. */
function priest(perks: Record<string, string>) {
  const f = fightWith([{ name: 'Priest', perks, skills: { faith: 6 }, level: 6 }], [{ at: 'G6' }], { level: 6 });
  const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; setDevotionXp(c, devotionThreshold(6)); c.devotion = 6;
  f.pc.pos = '2,5'; f.foe.pos = '6,5'; for (const u of f.cb.units) { u.conds = {}; u.shield = 0; } f.foe.hp = f.foe.maxHp = 2000; f.foe.armour = 0; f.foe.def = -40; f.foe.marginsTaken = -99; /* rules 1.96: an unmissable fixture takes no Margins */
  f.turn(f.pc); f.pc.ap = 9;
  return { f, get me() { return f.unit(f.pc.id); }, get foe() { return f.unit(f.foe.id); }, c,
    pray: (kind: string, id: string, x: any = {}) => f.act({ type: 'faith/pray', unitId: f.pc.id, kind, id, ...x } as any, 'host') };
}
describe('Sinner\'s Due (holy_ordnance): prayers on the broken (II: and the Marked or Judged)', () => {
  for (const tier of ['I', 'II'] as const) it(tier, () => {
    const run = (hpShare: number, cond: string | null) => { const h = priest({ holy_ordnance: tier }); h.foe.hp = Math.floor(h.foe.maxHp * hpShare); if (cond) withGame(h.f.g, () => applyCond(h.f.cb, h.f.g.rng, h.me, h.foe, cond, 3, undefined, { skipSave: true })); return termOf(tap(() => h.pray('whisper', 'rebuke', { targetId: h.foe.id })).rows, 'holy_ordnance'); };
    expect(run(0.9, null)).toEqual([]); expect(run(0.4, null)[0]).toBe(E('holy_ordnance', tier).value);
    expect(run(0.9, 'marked')).toEqual(tier === 'II' ? [E('holy_ordnance', 'II', 1).value] : []);
    const { f, shoot } = gun({ holy_ordnance: tier }); f.foe.hp = 100; expect(termOf(tap(shoot).rows, 'holy_ordnance')).toEqual([]); // a shot is not a prayer
  });
});
describe('Unbroken Litany (litany): the first Hymn or Miracle each fight costs less', () => {
  it('I: a Whisper first does not spend it; the first Hymn is cheaper, the second is not', () => {
    const run = (perk: boolean) => {
      const h = priest(perk ? { litany: 'I' } : {});
      let a0 = h.me.ap; h.pray('whisper', 'rebuke', { targetId: h.foe.id }); const w = a0 - h.me.ap;
      h.me.ap = 9; a0 = h.me.ap; h.pray('hymn', 'saints_shield', { targetId: h.me.id }); const h1 = a0 - h.me.ap;
      clearPrayerLimits(h.me); h.me.ap = 9; a0 = h.me.ap; h.pray('hymn', 'saints_shield', { targetId: h.me.id }); const h2 = a0 - h.me.ap;
      return { w, h1, h2 };
    };
    const a = run(true), b = run(false);
    expect(a.w).toBe(b.w); expect(b.h1 - a.h1).toBe(-E('litany', 'I').value); expect(a.h2).toBe(b.h2);
  });
  it('II no longer shortens the wait between Hymns (rules 1.75 item 6221: Swift Psalm has it, one copy of the lever)', () => {
    const a = priest({ litany: 'II' }), b = priest({});
    const wa = withGame(a.f.g, () => hymnWait(a.c, a.me)), wb = withGame(b.f.g, () => hymnWait(b.c, b.me));
    expect(wa).toBe(wb); expect((PERK as any).litany.tiers.II.effects.some((e: any) => e.stat === 'hymn_wait')).toBe(false);
  });
});
