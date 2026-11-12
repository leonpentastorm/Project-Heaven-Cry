// Rules 1.6.3 (Faith 2.2, "the god shows up"; docs/design/faith-presence-spec.md section 4; spec items 738-746):
// Witnessed lasts until the fight ends or the intervention fires; an intervention ends it; a second Hymn re-Witnesses;
// once a fight below Devotion 7, twice from 7; the widened triggers (the Quartermaster's reload, dry core and empty MP; the Laughing Mask's
// miss); 20 + 4 × Devotion × Blessing power; the grant bank's {name}; the Miracle's and the intervention's fx; the
// story Miracle; determinism; old fights in saves. Every rule goes through apply() where a player's click would.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  FAITH_PATRONS, FAITH_PATRON, FAITH_FX, INTERVENTION, interventionAmount, interventionLimit, grantLine, LINE_BANKS,
  d20, applyDamage, resolveAttack, condOn, condTurnEnd, setDevotionXp, devotionThreshold,
  type Combat, type GameState, type Unit, type Character, type Action,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const fx = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];
const storyFx = (g: GameState, k: string) => (((g.story as any).fx || []) as any[]).filter((e) => e.k === k);

type Opt = { patron?: string; devotion?: number; faith?: number };
/** The Priest (Faith 7 unless given) and an Ally (next to each other) against two soldiers, on the Priest's turn. */
function holy(o: Opt = {}) {
  const f = fightWith([{ name: 'Priest', skills: { faith: o.faith ?? 7 } }, { name: 'Ally' }], [{ at: 'F6' }, { at: 'G6' }]);
  const c = f.g.characters[f.pc.charId!], p = o.patron || 'nerukhan';
  c.belief = { kind: 'faithful', patron: p }; c.patron = p; setDevotionXp(c, devotionThreshold(o.devotion ?? 3)); c.devotion = o.devotion ?? 3;
  const [pr, al] = f.pcs, [f0, f1] = f.foes;
  pr.pos = '2,5'; al.pos = '2,6'; f0.pos = '5,5'; f1.pos = '6,5';
  for (const u of f.cb.units) { u.hp = u.maxHp; u.conds = {}; u.shield = 0; }
  f.turn(pr);
  return {
    f, get g() { return f.g; }, get cb() { return f.cb; }, get c(): Character { return f.g.characters[c.id]; },
    get me(): Unit { return f.unit(pr.id); }, get ally(): Unit { return f.unit(al.id); },
    get foe(): Unit { return f.unit(f0.id); }, get foe2(): Unit { return f.unit(f1.id); },
    pray: (kind: 'whisper' | 'hymn' | 'miracle', id: string, x: { targetId?: string; tile?: string } = {}) => f.act({ type: 'faith/pray', unitId: pr.id, kind, id, ...x } as Action, 'host'),
    act: (a: any) => f.act(a as Action, 'host'),
    bound: <T>(fn: () => T) => withGame(f.g, fn),
  };
}
type H = ReturnType<typeof holy>;
/** Pray the patron's Hymn I at the ally again (the cooldown and AP put back: a later round). */
const hymnAgain = (h: H, id = 'saints_shield') => { h.me.prayedRound = undefined; h.me.ap = 6; h.pray('hymn', id, { targetId: h.ally.id }); };
/** The foe hits the Downed ally (Nerukhan's trigger). */
const kickDowned = (h: H) => { Object.assign(h.ally, { hp: 0, downed: true, dead: false, saves: { ok: 0, fail: 0 } }); h.bound(() => applyDamage(h.cb, h.ally, 5, { by: h.foe, type: 'physical' } as any)); };

// ---------------------------------------------------------------------------------------------------------------------
describe('Witnessed lasts until the fight ends or the intervention fires (item 738)', () => {
  it('a successful Hymn: Witnessed with no count of rounds; it survives many of the bearer\'s turn ends', () => {
    const h = holy({ faith: 5 }); h.pray('hymn', 'saints_shield', { targetId: h.ally.id });
    expect(condOn(h.me, 'witnessed')).toBe(true); expect(h.me.conds!.witnessed).toBe(99);
    for (let i = 0; i < 6; i++) h.bound(() => condTurnEnd(h.cb, h.me, h.g.rng));
    expect(condOn(h.me, 'witnessed')).toBe(true);
    // through the reducer: the Priest ends turns while the round goes round
    h.me.maxHp = h.me.hp = 5000;
    for (let i = 0; i < 3; i++) { h.f.turn(h.me); h.act({ type: 'combat/end-turn', unitId: h.me.id }); }
    expect(condOn(h.me, 'witnessed')).toBe(true);
  });
  it('a Miracle makes you Witnessed too; a Whisper and a Hymn by dice never do', () => {
    const m = holy({ patron: 'mother_ember', devotion: 10 }); m.pray('miracle', 'everyone_home'); expect(condOn(m.me, 'witnessed')).toBe(true);
    const w = holy({ faith: 9 }); w.pray('whisper', 'luck'); expect(condOn(w.me, 'witnessed')).toBe(false);
    const k = holy({ patron: 'mother_ember', faith: 9 }); k.c.hymns = ['the_quartermaster.resupply']; k.me.ammo = 1;
    k.g.rng.state = rngFor(20); k.pray('hymn', 'the_quartermaster.resupply', { targetId: k.me.id });
    expect(fx(k.cb, FAITH_FX.prayer).length).toBe(1); expect(condOn(k.me, 'witnessed')).toBe(false);
  });
  it('it ends with the fight: never in the story, not in the next fight', () => {
    const s = storyWith([{ name: 'Saint', skills: { faith: 6 } }, { name: 'Friend' }]);
    const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; setDevotionXp(c, devotionThreshold(3));
    const FIGHT = { narration: 'Fight!', combat: { name: 'Ambush', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'soldier', weapon: 'service_pistol', at: '' }] } };
    s.act({ type: 'narrator/turn', turn: FIGHT } as any, 'host');
    const cb = s.g.combat!, u = cb.units.find((x) => x.charId === c.id)!; cb.turn = cb.order.indexOf(u.id); u.ap = 6;
    s.act({ type: 'faith/pray', unitId: u.id, kind: 'hymn', id: 'saints_shield', targetId: u.id } as any, s.g.characters[c.id].owner);
    expect(condOn(s.g.combat!.units.find((x) => x.charId === c.id)!, 'witnessed')).toBe(true);
    for (const x of s.g.combat!.units) if (x.side === 'foe') { x.hp = 0; x.dead = true; }
    s.act({ type: 'combat/end-turn', unitId: s.g.combat!.order[s.g.combat!.turn] } as any, 'host');
    expect(s.g.phase).toBe('story'); expect((s.g.characters[c.id].persistentConds || []).some((p) => p.id === 'witnessed')).toBe(false);
    s.act({ type: 'narrator/turn', turn: FIGHT } as any, 'host');
    expect(condOn(s.g.combat!.units.find((x) => x.charId === c.id)!, 'witnessed')).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('an intervention ends Witnessed; once a fight, twice from Devotion 7 (items 739-740)', () => {
  it('Devotion 7: the first ends Witnessed; another Hymn re-Witnesses; the second fires; a third never does', () => {
    const h = holy({ patron: 'nerukhan', devotion: 7 }); expect(interventionLimit(h.c)).toBe(2); h.foe.maxHp = h.foe.hp = 2000;
    hymnAgain(h); expect(condOn(h.me, 'witnessed')).toBe(true);
    const hp = h.foe.hp; kickDowned(h);
    expect(h.foe.hp).toBeLessThan(hp); expect(condOn(h.me, 'witnessed')).toBe(false);
    expect(h.cb.log.some((l) => /Priest is no longer Witnessed/.test(l))).toBe(true);
    const hp2 = h.foe.hp; kickDowned(h); expect(h.foe.hp).toBe(hp2); // not Witnessed: nothing
    hymnAgain(h); expect(condOn(h.me, 'witnessed')).toBe(true);
    kickDowned(h); expect(h.foe.hp).toBeLessThan(hp2); expect(fx(h.cb, FAITH_FX.intervention).length).toBe(2);
    expect(condOn(h.me, 'witnessed')).toBe(false);
    hymnAgain(h); const hp3 = h.foe.hp; kickDowned(h);
    expect(h.foe.hp).toBe(hp3); expect(fx(h.cb, FAITH_FX.intervention).length).toBe(2); expect(condOn(h.me, 'witnessed')).toBe(true); // the limit: still watched
  });
  it('below Devotion 7: once a fight, even Witnessed again', () => {
    const h = holy({ patron: 'nerukhan', devotion: 6 }); expect(interventionLimit(h.c)).toBe(INTERVENTION.perFight); h.foe.maxHp = h.foe.hp = 2000;
    hymnAgain(h); kickDowned(h); expect(fx(h.cb, FAITH_FX.intervention).length).toBe(1);
    hymnAgain(h); const hp = h.foe.hp; kickDowned(h);
    expect(h.foe.hp).toBe(hp); expect(fx(h.cb, FAITH_FX.intervention).length).toBe(1);
  });
  it('the data: once, twice from Devotion 7; 20 + 4 × Devotion', () => {
    expect(INTERVENTION).toEqual({ perFight: 1, perFightHigh: 2, highFrom: 7, base: 20, perDevotion: 4 });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the numbers scale with Devotion, × Blessing power (item 741)', () => {
  it('20 + 4 × Devotion: 32 at 3, 48 at 7, 60 at 10; × power, rounded', () => {
    const h = holy({ devotion: 3 });
    for (const [dv, n] of [[0, 20], [3, 32], [7, 48], [10, 60]]) { h.c.devotion = dv; setDevotionXp(h.c, devotionThreshold(dv)); expect(interventionAmount(h.c)).toBe(n); expect(interventionAmount(h.c, 1.7)).toBe(Math.round(n * 1.7)); }
  });
  it('Nerukhan at Devotion 7: the fx carries the amount, (20 + 28) × Blessing power', () => {
    const h = holy({ patron: 'nerukhan', devotion: 7 }); hymnAgain(h); kickDowned(h);
    expect(fx(h.cb, FAITH_FX.intervention)[0]).toMatchObject({ unit: h.me.id, patron: 'nerukhan', trigger: 'enemy_harms_helpless', target: h.foe.id, amount: Math.round(48 * h.me.blessPower!) });
  });
  it('Mother Ember at Devotion 10 heals 40 × power (rules 1.20: 10 + 3 × Devotion); Old Overcast at 10 throws 60 × power Storm', () => {
    const m = holy({ patron: 'mother_ember', devotion: 10 }); m.me.conds = { witnessed: 99 } as any; const mx = m.ally.maxHp;
    m.ally.maxHp = 1000; m.ally.hp = 1000; m.bound(() => applyDamage(m.cb, m.ally, 800, { by: m.foe, type: 'physical' } as any));
    expect(m.ally.hp).toBe(200 + Math.round(40 * m.me.blessPower!)); void mx;
    const o = holy({ patron: 'old_overcast', devotion: 10 }); o.me.conds = { witnessed: 99 } as any; o.foe2.maxHp = o.foe2.hp = 2000;
    o.bound(() => applyDamage(o.cb, o.foe, 9999, { by: o.me, type: 'physical', credit: 'hp' } as any));
    const e = fx(o.cb, FAITH_FX.intervention)[0]; expect(e).toMatchObject({ trigger: 'you_kill', target: o.foe2.id, amount: Math.round(60 * o.me.blessPower!) });
    expect(o.foe2.hp).toBeLessThan(2000);
  });
  it('the other triggers carry their own amount: the Toll-Keeper 1, the Matchmaker the share, the Weaver none', () => {
    const t = holy({ patron: 'toll_keeper' }); t.me.conds = { witnessed: 99 } as any; t.bound(() => applyDamage(t.cb, t.ally, 9999, { by: t.foe, type: 'physical' } as any));
    expect(fx(t.cb, FAITH_FX.intervention)[0]).toMatchObject({ trigger: 'ally_would_die', amount: 1, target: t.ally.id });
    const m = holy({ patron: 'the_matchmaker' }); m.me.conds = { witnessed: 99 } as any; m.bound(() => applyDamage(m.cb, m.ally, 20, { by: m.foe, type: 'physical' } as any));
    expect(fx(m.cb, FAITH_FX.intervention)[0]).toMatchObject({ trigger: 'ally_hit_adjacent', amount: 10 }); expect(condOn(m.me, 'witnessed')).toBe(false);
    const w = holy({ patron: 'counting_weaver' }); w.me.conds = { witnessed: 99 } as any;
    w.g.rng.state = rngFor(20); w.bound(() => resolveAttack(w.cb, w.g.rng, w.foe, w.me, 'shot', null, { free: true, noAp: true }));
    expect(fx(w.cb, FAITH_FX.intervention)[0]).toMatchObject({ trigger: 'enemy_crits_you', amount: null });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the widened triggers (items 742-743)', () => {
  it('the Quartermaster: a tactical reload is free too (all its AP back); then, not Witnessed, a reload costs again', () => {
    const h = holy({ patron: 'the_quartermaster' }); h.me.conds = { witnessed: 99 } as any; h.me.ammo = 1; h.me.mags = [15, 15, 15];
    const ap = h.me.ap; h.act({ type: 'combat/reload', unitId: h.me.id, tactical: true });
    expect(h.me.ap).toBe(ap); expect(fx(h.cb, FAITH_FX.intervention)[0]).toMatchObject({ trigger: 'you_reload', amount: 3 });
    expect(h.cb.log.some((l) => /The Quartermaster intervenes for Priest: the reload is free \(3 AP back\)/.test(l))).toBe(true);
    expect(condOn(h.me, 'witnessed')).toBe(false);
    h.me.ammo = 1; h.act({ type: 'combat/reload', unitId: h.me.id }); expect(h.me.ap).toBe(ap - 2); expect(fx(h.cb, FAITH_FX.intervention).length).toBe(1);
  });
  it('the Quartermaster: a reload that cost nothing (Resupply) never fires it; a refused reload never does', () => {
    const h = holy({ patron: 'the_quartermaster', devotion: 3 }); h.me.conds = { witnessed: 99 } as any; h.me.ammo = 1;
    h.pray('hymn', 'resupply', { targetId: h.me.id });
    expect(fx(h.cb, FAITH_FX.intervention).length).toBe(0); expect(condOn(h.me, 'witnessed')).toBe(true);
    expect(() => h.act({ type: 'combat/reload', unitId: h.me.id })).toThrow(/full/i); expect(fx(h.cb, FAITH_FX.intervention).length).toBe(0);
  });
  // The Quartermaster's two more triggers (Leon, 9 Nov 2026): an Evoker's core runs dry, an Emanator's MP runs out.
  const caster = (kit: 'sigil' | 'soul', set: (u: Unit) => void, act: (f: ReturnType<typeof fightWith>, u: Unit) => void) => {
    const f = fightWith([{ name: 'Clerk', archetype: kit === 'sigil' ? 'sigilist' : 'stormcaller', kit, skills: { faith: 7 } } as any], [{ at: 'H6' }]);
    const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'the_quartermaster' }; c.patron = 'the_quartermaster'; setDevotionXp(c, devotionThreshold(3)); c.devotion = 3;
    f.cb.mana = 15; const u = f.turn(f.pc); u.ap = 9; f.unit(f.foe.id).hp = 999; set(f.unit(u.id));
    act(f, f.unit(u.id)); return { f, u: f.unit(u.id) };
  };
  it('the Quartermaster: your Evoker\'s core runs dry (charge 0): a fresh core slots in, free, the spares untouched', () => {
    // how much one glyph costs, then a core holding exactly that
    const draw = (f: ReturnType<typeof fightWith>, u: Unit) => f.act({ type: 'combat/draw', unitId: u.id, word: u.mg!.words[0], tile: u.pos } as Action, 'host');
    const probe = caster('sigil', (u) => { u.mg!.charge = 10; }, draw), cost = 10 - probe.u.mg!.charge, drawAp = 9 - probe.u.ap; expect(cost).toBeGreaterThan(0);
    const w = caster('sigil', (u) => { u.mg!.charge = cost; u.conds = { witnessed: 99 } as any; }, (f, u) => { f.act({ type: 'combat/prone', unitId: u.id } as Action, 'host'); f.act({ type: 'combat/prone', unitId: u.id } as Action, 'host'); u.ap = 9; });
    const spares = w.u.mg!.cores, ap = w.u.ap; draw(w.f, w.u);
    const e = fx(w.f.cb, FAITH_FX.intervention)[0]; expect(e).toMatchObject({ trigger: 'core_dry', unit: w.u.id, amount: 10 });
    expect(w.f.unit(w.u.id).mg!.charge).toBe(10); expect(w.f.unit(w.u.id).mg!.cores).toBe(spares); expect(w.f.unit(w.u.id).ap).toBeCloseTo(ap - drawAp, 5); // no AP for the core
    expect(condOn(w.f.unit(w.u.id), 'witnessed')).toBe(false);
    // not Witnessed: a dry core stays dry
    const n = caster('sigil', (u) => { u.mg!.charge = cost; }, (f, u) => { f.act({ type: 'combat/prone', unitId: u.id } as Action, 'host'); f.act({ type: 'combat/prone', unitId: u.id } as Action, 'host'); u.ap = 9; });
    draw(n.f, n.u); expect(n.f.unit(n.u.id).mg!.charge).toBe(0); expect(fx(n.f.cb, FAITH_FX.intervention).length).toBe(0);
  });
  it('the Quartermaster: your MP runs out (0): 25% of your max MP back, rounded down; a fight begun at 0 is no trigger', () => {
    const begin = (f: ReturnType<typeof fightWith>, u: Unit) => f.act({ type: 'combat/outburst', unitId: u.id, design: u.mg!.designs[0].id } as Action, 'host');
    const probe = caster('soul', (u) => { u.mg!.mp = 200; u.mg!.mpMax = 200; }, begin), cost = Math.round(200 - probe.u.mg!.mp); expect(cost).toBeGreaterThan(0);
    const w = caster('soul', (u) => { u.mg!.mpMax = 90; u.mg!.mp = cost; u.conds = { witnessed: 99 } as any; }, (f, u) => { f.act({ type: 'combat/prone', unitId: u.id } as Action, 'host'); f.act({ type: 'combat/prone', unitId: u.id } as Action, 'host'); u.ap = 9; });
    begin(w.f, w.u);
    expect(fx(w.f.cb, FAITH_FX.intervention)[0]).toMatchObject({ trigger: 'mp_out', amount: 22 }); expect(Math.round(w.f.unit(w.u.id).mg!.mp)).toBe(22);
    // a character who walks into the fight with no MP left: nothing ran out in this fight
    const s = storyWith([{ name: 'Clerk', archetype: 'stormcaller', kit: 'soul', skills: { faith: 7 } } as any]);
    const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron: 'the_quartermaster' }; c.patron = 'the_quartermaster'; setDevotionXp(c, devotionThreshold(3)); c.mp = 0;
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Ambush', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'soldier', weapon: 'service_pistol', at: '' }] } } } as any, 'host');
    const cb = s.g.combat!, u = cb.units.find((x) => x.charId === c.id)!; expect(u.mg!.mp).toBe(0);
    u.conds = { witnessed: 99 } as any; cb.turn = cb.order.indexOf(u.id); u.ap = 6;
    s.act({ type: 'combat/prone', unitId: u.id } as any, c.owner);
    expect(fx(s.g.combat!, FAITH_FX.intervention).length).toBe(0); expect(s.g.combat!.units.find((x) => x.charId === c.id)!.mg!.mp).toBe(0);
  });
  it('the Laughing Mask: a natural 1 is a miss too; a hit never fires it; nor an ally\'s miss', () => {
    const n1 = holy({ patron: 'the_laughing_mask' }); n1.me.conds = { witnessed: 99 } as any;
    n1.g.rng.state = rngFor(1); n1.bound(() => resolveAttack(n1.cb, n1.g.rng, n1.foe, n1.me, 'shot', null, { free: true, noAp: true }));
    expect(!!n1.foe.prone).toBe(true); expect(fx(n1.cb, FAITH_FX.intervention)[0]).toMatchObject({ trigger: 'enemy_misses_you', target: n1.foe.id, unit: n1.me.id });
    const hit = holy({ patron: 'the_laughing_mask' }); hit.me.conds = { witnessed: 99 } as any; hit.me.def = -50;
    hit.g.rng.state = rngFor(15); hit.bound(() => resolveAttack(hit.cb, hit.g.rng, hit.foe, hit.me, 'shot', null, { free: true, noAp: true }));
    expect(fx(hit.cb, FAITH_FX.intervention).length).toBe(0); expect(!!hit.foe.prone).toBe(false);
    const al = holy({ patron: 'the_laughing_mask' }); al.me.conds = { witnessed: 99 } as any;
    al.g.rng.state = rngFor(1); al.bound(() => resolveAttack(al.cb, al.g.rng, al.foe, al.ally, 'shot', null, { free: true, noAp: true }));
    expect(fx(al.cb, FAITH_FX.intervention).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the grant bank and the Miracle\'s fx (items 745-746)', () => {
  it('11 banks; every patron has 3 grant lines, each calling the devoted by {name}', () => {
    expect(LINE_BANKS.length).toBe(11); expect(LINE_BANKS).toContain('grant');
    for (const p of FAITH_PATRONS) { expect(p.lines.grant.length).toBe(3); for (const l of p.lines.grant) expect(l).toContain('{name}'); }
  });
  it('grantLine puts the name in capitals, with the dice it is given', () => {
    const a = grantLine({ state: 9 }, FAITH_PATRON.the_quartermaster, 'Vess'), b = grantLine({ state: 9 }, FAITH_PATRON.the_quartermaster, 'Vess');
    expect(a).toBe(b); expect(a).toContain('VESS'); expect(a).not.toContain('{name}');
    expect(FAITH_PATRON.the_quartermaster.lines.grant.map((l: string) => l.split('{name}').join('VESS'))).toContain(a);
  });
  it('a Miracle in a fight: the fx carries the name, the text, the grant line and the summary; the line is logged before the price', () => {
    const h = holy({ patron: 'nerukhan', devotion: 10 }); h.foe.maxHp = h.foe.hp = 2000;
    h.pray('miracle', 'saints_verdict');
    const m = fx(h.cb, FAITH_FX.miracle)[0];
    expect(m).toMatchObject({ patron: 'nerukhan', id: 'saints_verdict', unit: h.me.id, char: h.c.id, name: "The Saints' Verdict" });
    expect(m.text).toMatch(/every enemy in sight/i); expect(m.line).toContain('PRIEST'); expect(FAITH_PATRON.nerukhan.lines.grant.map((l: string) => l.split('{name}').join('PRIEST'))).toContain(m.line);
    expect(m.summary).toMatch(/damage/); expect(m.summary).not.toMatch(/^ ·/); expect(m.summary.endsWith('.')).toBe(true);
    // the cut-in plays first: the Miracle's fx comes before its effects' fx, and the patron's grant voice after them
    const all = h.cb.fx || [], iM = all.indexOf(m), iG = all.findIndex((e: any) => e.k === FAITH_FX.patron_line && e.event === 'grant');
    expect(iG).toBeGreaterThan(iM); expect(all.slice(iM + 1, iG).length).toBeGreaterThan(0);
    const log = h.cb.log, iLine = log.findIndex((l) => l.includes(m.line)), iPrice = log.findIndex((l) => /Devotion XP \(the Miracle/.test(l));
    expect(iLine).toBeGreaterThan(-1); expect(iPrice).toBeGreaterThan(iLine);
    expect(fx(h.cb, FAITH_FX.patron_line).some((e) => e.event === 'miracle')).toBe(true);
  });
  it('a Miracle in the story: the fx carries the line and what the engine applied, or that the Narrator rules the rest', () => {
    for (const [patron, id, re] of [['mother_ember', 'everyone_home', /heals/], ['nerukhan', 'saints_verdict', /^The Narrator rules the rest\.$/]] as const) {
      const s = storyWith([{ name: 'Saint', skills: { faith: 7 } }, { name: 'Friend' }]);
      const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron }; c.patron = patron; setDevotionXp(c, devotionThreshold(10));
      s.act({ type: 'faith/pray', charId: c.id, kind: 'miracle', id } as any, c.owner);
      const m = storyFx(s.g, FAITH_FX.miracle)[0];
      expect(m.line).toContain('SAINT'); expect(m.summary).toMatch(re); expect(m.name).toBe(FAITH_PATRON[patron].miracle.name);
      expect(storyFx(s.g, FAITH_FX.patron_line).some((e) => e.event === 'grant' && e.text === m.line)).toBe(true);
    }
  });
  it('determinism: the same seed gives the same Miracle, line, summary and fx', () => {
    const run = () => { const h = holy({ patron: 'old_overcast', devotion: 10 }); h.pray('miracle', 'the_sky_answers', { tile: '5,5' }); return JSON.stringify([fx(h.cb, FAITH_FX.miracle), fx(h.cb, FAITH_FX.patron_line), h.cb.log.slice(-5)]); };
    expect(run()).toBe(run());
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('old fights in saves (items 738, 740)', () => {
  it('an old Witnessed (1 round) still ends at the bearer\'s next turn end', () => {
    const h = holy(); h.me.conds = { witnessed: 1 } as any;
    h.bound(() => condTurnEnd(h.cb, h.me, h.g.rng)); expect(condOn(h.me, 'witnessed')).toBe(false);
  });
  it('the old "intervened" flag counts as one used: none more below Devotion 7, one more from 7', () => {
    const lo = holy({ patron: 'nerukhan', devotion: 3 }); lo.me.conds = { witnessed: 99 } as any; (lo.me as any).faith = { intervened: true };
    const hp = lo.foe.hp; kickDowned(lo); expect(lo.foe.hp).toBe(hp);
    const hi = holy({ patron: 'nerukhan', devotion: 7 }); hi.me.conds = { witnessed: 99 } as any; (hi.me as any).faith = { intervened: true };
    kickDowned(hi); expect(fx(hi.cb, FAITH_FX.intervention).length).toBe(1); expect((hi.me as any).faith.interventions).toBe(2);
    expect((hi.me as any).faith.intervened).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the patron\'s own act (item 747)', () => {
  /** Old Overcast at Devotion 7, Witnessed, three foes: the Priest downs the first; the Storm hits the next nearest. */
  function storm(nextHp: number) {
    const f = fightWith([{ name: 'Priest', skills: { faith: 7 } }], [{ at: 'F6' }, { at: 'G6' }, { at: 'H6' }]);
    const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'old_overcast' }; c.patron = 'old_overcast'; setDevotionXp(c, devotionThreshold(7)); c.devotion = 7;
    const me = f.turn(f.pc), [a, b, d] = f.foes; me.conds = { witnessed: 99 } as any;
    a.pos = '5,5'; b.pos = '6,5'; d.pos = '9,9'; b.maxHp = 100; b.hp = nextHp; d.maxHp = d.hp = 2000;
    const n0 = fx(f.cb, FAITH_FX.devotion).length;
    withGame(f.g, () => applyDamage(f.cb, a, 9999, { by: me, type: 'physical', credit: 'hp' } as any));
    return { f, me, b, d, xp: fx(f.cb, FAITH_FX.devotion).slice(n0) };
  }
  it('Old Overcast\'s Storm that downs the next foe sets off no second intervention: one Witnessed, one intervention', () => {
    const { f, me, b, d } = storm(5);
    expect(b.dead || b.downed).toBe(true); expect(d.hp).toBe(2000); // no chained Storm on the third foe
    const ev = fx(f.cb, FAITH_FX.intervention); expect(ev.length).toBe(1); expect(ev[0]).toMatchObject({ trigger: 'you_kill', target: b.id });
    expect((me as any).faith.interventions).toBe(1); expect(condOn(me, 'witnessed')).toBe(false);
    // the log: the intervention, then "no longer Witnessed", once
    const i = f.cb.log.findIndex((l) => /Old Overcast intervenes for Priest/.test(l)), w = f.cb.log.findIndex((l) => /Priest is no longer Witnessed/.test(l));
    expect(i).toBeGreaterThanOrEqual(0); expect(w).toBeGreaterThan(i);
    expect(f.cb.log.filter((l) => /intervenes for/.test(l)).length).toBe(1); expect(f.cb.log.filter((l) => /no longer Witnessed/.test(l)).length).toBe(1);
  });
  it('the second intervention at Devotion 7 still needs another Hymn', () => {
    const { f, me, d } = storm(5);
    withGame(f.g, () => applyDamage(f.cb, d, 9999, { by: me, type: 'physical', credit: 'hp' } as any)); // a kill, not Witnessed
    expect(fx(f.cb, FAITH_FX.intervention).length).toBe(1);
  });
  it('the Storm\'s damage and kill pay the devoted no Devotion XP; the Priest\'s own kill still does', () => {
    const { xp } = storm(5);
    expect(xp.filter((e) => e.tag === 'storm').length).toBe(0);
    expect(xp.filter((e) => e.tag === 'kill').length).toBe(1); // the Priest's own blow
  });
  it('Mother Ember\'s healing intervention pays no Heal XP', () => {
    const m = holy({ patron: 'mother_ember', devotion: 3 }); m.me.conds = { witnessed: 99 } as any;
    m.ally.maxHp = 1000; m.ally.hp = 1000; const n0 = fx(m.cb, FAITH_FX.devotion).length;
    m.bound(() => applyDamage(m.cb, m.ally, 800, { by: m.foe, type: 'physical' } as any));
    expect(fx(m.cb, FAITH_FX.intervention).length).toBe(1); expect(m.ally.hp).toBeGreaterThan(200);
    expect(fx(m.cb, FAITH_FX.devotion).slice(n0).filter((e) => e.tag === 'heal').length).toBe(0);
  });
  it('the Matchmaker\'s share is still a protect (item 600): the devoted takes the hit in the ally\'s place', () => {
    const m = holy({ patron: 'the_matchmaker' }); m.me.conds = { witnessed: 99 } as any; const n0 = fx(m.cb, FAITH_FX.devotion).length;
    m.bound(() => applyDamage(m.cb, m.ally, 20, { by: m.foe, type: 'physical' } as any));
    expect(fx(m.cb, FAITH_FX.devotion).slice(n0).filter((e) => e.tag === 'protect').length).toBe(1);
  });
});
