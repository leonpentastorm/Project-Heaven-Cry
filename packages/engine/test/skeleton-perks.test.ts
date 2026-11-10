// Skeleton 2.0 (rules 1.13), the perk, unlock and trait pass (proposal sections 15.2-15.8 and 18): the replaced perks
// (Heavy Hands, Follow Through, Iron Grip, Both Hands), the reworded unlocks (Quick Draw, Tuned, Hand-Off, Stand Still)
// and the data rules of the pass. The perks that kept their place are tested with their lanes (perks-a … perks-f).
import { describe, it, expect, beforeEach } from 'vitest';
import { PERKS, PERK, SKILL, TRAITS, emit, statQuery, previewAttack, resolveAttack, previewCall, applyDamage, condOn, coverageGaps, type Unit } from '../src';
import { slam } from '../src/perks/skeleton';
import { d20 } from '../src/rng';
import { physFight, rig } from './helpers/physfight';
import { withGame } from './helpers/perkfight';

beforeEach(() => rig(null));
type F = ReturnType<typeof physFight>;
const logHas = (f: F, re: RegExp) => f.cb.log.some((l) => re.test(l));
/** Set the game's dice so the next d20s are not natural 1s or 20s. */
function quiet(f: F) { for (let s = f.g.rng.state; ; s++) { const r = { state: s }; if ([0, 1, 2, 3].every(() => { const d = d20(r); return d > 1 && d < 20; })) { f.g.rng.state = s; return; } } }
/** A foe that fails every save and loses Shove's opposed roll. */
const weak = (f: F, u: Unit) => { const x = f.unit(u.id); x.sv = { body: -50, brain: -50, heart: -50 }; x.attack = -50; x.strength = -50; f.unit(f.pc.id).strength = 20; quiet(f); };
/** The foe is held by the PC: Grappled by it (what Bind with bare hands leaves). */
const hold = (f: F, t: Unit, by: Unit = f.pc) => { const x = f.unit(t.id); x.conds = { ...(x.conds || {}), grappled: 99 }; x.condBy = { ...(x.condBy || {}), grappled: by.id }; };

describe('the data of the pass', () => {
  const P = PERK as Record<string, any>;
  it('the replaced perks have new ids and the old ones are gone; there are still 106 perks, two acquired a skill', () => {
    expect(P.grapple).toBeUndefined(); expect(P.origami_hands).toBeUndefined();
    expect(P.iron_grip.name).toBe('Iron Grip'); expect(P.iron_grip.skills).toEqual(['raw_power']);
    expect(P.both_hands.name).toBe('Both Hands'); expect(P.both_hands.skills).toEqual(['dexterity']);
    expect(PERKS.length).toBe(106);
    const per: Record<string, number> = {}; for (const p of PERKS as any[]) if (p.tier === 'acquired') per[p.skills[0]] = (per[p.skills[0]] || 0) + 1;
    expect(Object.keys(per).length).toBe(27); expect(Object.values(per).every((n) => n === 2)).toBe(true);
  });
  it('every acquired and Mastered perk carries its skill\'s slot (skill_greek)', () => {
    for (const p of PERKS as any[]) if (p.tier === 'acquired' || p.tier === 'mastered') expect(p.skill_greek, p.id).toBe((SKILL as any)[p.skills[0]].slot);
  });
  it('no alpha or beta perk gives or takes AP in the turn any more (15.7); the own-cost discounts stay', () => {
    const gone = ['used_to_the_pain', 'into_the_dark', 'rally_cry', 'clean_hands', 'many_hands', 'walking_wounded', 'blueprint', 'you_get_used_to_it'];
    for (const id of gone) {
      const p = P[id], fx = [...(p.effects || []), ...(p.tiers?.I?.effects || []), ...(p.tiers?.II?.effects || [])];
      expect(fx.some((e: any) => e.op === 'stat_mod' && e.stat === 'ap'), id).toBe(false);
      expect(p.perk_type, id).not.toBe('ap_mod'); if (id !== 'walking_wounded') expect(/\bAP\b/.test(p.text), id).toBe(false); // Walking Wounded: "injuries never cost you AP"
    }
    for (const id of ['hot_swap', 'overhaul', 'running_reload', 'rite_in_the_field']) expect(P[id].perk_type, id).toBe('ap_mod');
  });
  it('Dead Signal is Acuity\'s (id analysis); the unlocks carry their new names', () => {
    expect(P.dead_signal.skills).toEqual(['analysis', 'ingenuity']); expect(P.dead_signal.requires[0]).toEqual({ skill: 'analysis', min: 5 });
    const name = (s: string, n: string) => (SKILL as any)[s].unlocks[n].name;
    expect([name('raw_power', '3'), name('raw_power', '5'), name('analysis', '5'), name('camaraderie', '3'), name('composure', '5')]).toEqual(['Heavy Hands', 'Follow Through', 'Read Them', 'Hand-Off', 'Stand Still']);
    expect((SKILL as any).analysis.unlocks['5'].text).toMatch(/deal 15% less damage/);
    expect((SKILL as any).proficiency.unlocks['5'].text).toMatch(/never jams and never breaks/);
  });
  it('traits name the skills by what they mean now, and no trait or perk text keeps an old skill name', () => {
    const T: Record<string, any> = Object.fromEntries((TRAITS as any[]).map((t) => [t.id, t]));
    expect(T.bottle_butts_for_eyes.effects.filter((e: any) => e.op === 'skill_mod').map((e: any) => e.skill).sort()).toEqual(['analysis', 'analysis', 'ingenuity', 'ingenuity', 'rumination']);
    expect(T.slicer.upsides.join(' ')).toMatch(/Acuity check/); expect(T.factory_made.upsides.join(' ')).toMatch(/Improvisation's Field Repair/);
    expect(T.lunarshine.downsides.join(' ')).toMatch(/Acuity, Vigilance, Improvisation/);
    const old = /\b(Proficiency|Analysis|Implication|Vigilant|Sensory)\b/;
    for (const t of TRAITS as any[]) expect(old.test(JSON.stringify([t.text, t.upsides, t.downsides])), t.id).toBe(false);
    for (const p of PERKS as any[]) expect(old.test(JSON.stringify([p.text, p.tiers?.I?.text, p.tiers?.II?.text])), p.id).toBe(false);
  });
  it('the EPCCG pages: Acuity speaks with Demitri Kortev, Improvisation with Drava Keel, and every effect line is what a point gives now', () => {
    const S = SKILL as any;
    expect(S.analysis.epccg.speaker).toMatch(/^Demitri Kortev/); expect(S.analysis.epccg.intro).toMatch(/^Acuity is your grasp of complex mechanisms/); expect(S.analysis.voice.tone_from).toMatch(/^Demitri Kortev/);
    expect(S.proficiency.epccg.speaker).toBe('Drava Keel, salvage fitter of the Mandestra lowland yards'); expect(S.proficiency.epccg.portrait_id).toBe('drava-keel');
    expect(S.proficiency.epccg.note).toMatch(/Suggested/); expect(S.proficiency.epccg.provisional && S.analysis.epccg.provisional).toBe(true);
    const all = Object.values(S) as any[]; expect(all.length).toBe(27);
    for (const k of all) expect(k.epccg.effect, k.id).toBe(k.per_point.text);
    expect(new Set(all.map((k) => k.epccg.speaker)).size).toBe(27); // one character to a skill
    expect(JSON.stringify(all.map((k) => [k.epccg.speaker, k.epccg.portrait, k.epccg.quote, k.voice.tone_from]))).not.toMatch(/D12\.9\.6|crime scene/); // it left the book (docs/lore/D12-9-6.md)
  });
  it('every effect of the pass is run by the engine or named for the Narrator (no gap)', () => { expect(coverageGaps()).toEqual([]); });
});

describe('Heavy Hands and Follow Through (Raw Power 3 and 5)', () => {
  it('Heavy Hands answers the push query: a melee technique\'s push is 1 tile longer, from 3 points; a shot\'s push is not', () => {
    const ask = (pts: number, system = 'melee') => { const f = physFight([{ weapon: 'sabre', skills: { raw_power: pts } }]); return withGame(f.g, () => statQuery({ u: f.pc, cb: f.cb }, 'push_tiles', { tech: 'shove', system }).add); };
    expect(ask(3)).toBe(1); expect(ask(2)).toBe(0); expect(ask(5, 'ranged')).toBe(0);
  });
  it('Follow Through: a Finisher that takes its target out leaves 1 Momentum; one that doesn\'t leaves none; below 5 points, none', () => {
    const run = (pts: number, hp: number) => {
      const f = physFight([{ weapon: 'sabre', known: ['coup'], skills: { raw_power: pts, dexterity: 6 } }], [{ at: 'D5' }]);
      f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.unit(f.foe.id).hp = hp; f.unit(f.foe.id).maxHp = 500; f.turn(f.pc); f.momentum(f.pc, 3); rig({ hit: true });
      expect(f.tech('coup', { targetId: f.foe.id })).toBeNull();
      return { m: f.momentum(f.pc), f };
    };
    const kill = run(5, 1); expect(kill.m).toBe(1); expect(logHas(kill.f, /Follow Through/)).toBe(true);
    expect(run(5, 500).m).toBe(0);
    expect(run(4, 1).m).toBe(0);
  });
});

describe('Breaching Strike (a passive now)', () => {
  const fight = (tier: string | null, block: 'enemy' | 'wall' | 'none') => {
    const f = physFight([{ weapon: 'sabre', known: ['shove'], skills: { raw_power: 2, athletics: 4 }, ...(tier ? { perks: { breaching_strike: tier } } : {}) }], [{ at: 'D7' }, { at: 'F7' }]);
    f.put(f.pc, 'C7'); f.put(f.foes[0], 'D7'); f.put(f.foes[1], block === 'enemy' ? 'F7' : 'L3');
    if (block === 'wall') f.cb.map = { ...f.cb.map, solid: [...(f.cb.map.solid || []), f.tile('F7')] };
    for (const x of f.foes) { f.unit(x.id).hp = f.unit(x.id).maxHp = 500; }
    f.turn(f.pc); weak(f, f.foes[0]);
    return f;
  };
  const lost = (f: F, i: number) => 500 - f.unit(f.foes[i].id).hp;
  it('I: a target your melee technique pushes up against another enemy takes half the hit again; the enemy takes nothing', () => {
    const f = fight('I', 'enemy');
    expect(f.tech('shove', { targetId: f.foes[0].id })).toBeNull();
    expect(f.unit(f.foes[0].id).pos).toBe(f.tile('E7'));
    expect(lost(f, 0)).toBeGreaterThan(0); expect(lost(f, 1)).toBe(0); expect(logHas(f, /slammed into .* \(Breaching Strike\)/)).toBe(true);
    expect(f.pc.ap).toBe(5); // Shove's own AP: the perk is no action and costs nothing
  });
  it('II: the enemy it was pushed into takes the same; a wall slams it too; open ground or no perk: nothing', () => {
    const two = fight('II', 'enemy'); two.tech('shove', { targetId: two.foes[0].id });
    expect(lost(two, 0)).toBeGreaterThan(0); expect(lost(two, 1)).toBe(lost(two, 0));
    const wall = fight('I', 'wall'); wall.tech('shove', { targetId: wall.foes[0].id });
    expect(lost(wall, 0)).toBeGreaterThan(0); expect(logHas(wall, /slammed into the wall/)).toBe(true);
    const open = fight('II', 'none'); open.tech('shove', { targetId: open.foes[0].id });
    expect(open.unit(open.foes[0].id).pos).toBe(open.tile('E7')); expect(lost(open, 0)).toBe(0);
    const none = fight(null, 'enemy'); none.tech('shove', { targetId: none.foes[0].id }); expect(lost(none, 0)).toBe(0);
  });
  it('the hit again is half the damage of the hit that pushed it (slam, the call the core makes for a blocked push)', () => {
    const f = fight('I', 'none');
    withGame(f.g, () => slam(f.cb, f.pc, f.unit(f.foes[0].id), 'wall', 41));
    expect(lost(f, 0)).toBe(20);
    withGame(f.g, () => slam(f.cb, f.pc, f.unit(f.foes[0].id), f.unit(f.pcs[0].id), 41)); // an ally of the pusher is no wall
    expect(lost(f, 0)).toBe(20);
  });
  it('the old 3 AP strike is gone', () => {
    const f = fight('II', 'none');
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'breaching_strike', targetId: f.foes[0].id } as any)).toThrow(/isn't an action/);
  });
});

describe('Iron Grip (replaces Grapple)', () => {
  const fight = (tier: string, more: any = {}) => {
    const f = physFight([{ weapon: 'sabre', known: ['bash'], skills: { raw_power: 5, dexterity: 6 }, perks: { iron_grip: tier }, ...more }], [{ at: 'D7', weapon: 'fists' }, { at: 'J3' }]);
    f.put(f.pc, 'C7'); f.put(f.foes[0], 'D7'); f.put(f.foes[1], 'J3'); for (const x of f.foes) f.unit(x.id).hp = f.unit(x.id).maxHp = 500;
    f.turn(f.pc); return f;
  };
  it('I: a held target takes no reactions (Answers and opportunity attacks alike); one that isn\'t held still does', () => {
    const f = fight('I'); hold(f, f.foes[0]);
    const win = (r: Unit) => withGame(f.g, () => emit(f.cb, 'reaction_window', { reactor: f.unit(r.id), mover: f.pc, kind: 'opportunity', cancel: false, at: f.pc.pos, cb: f.cb, rng: f.g.rng })).cancel;
    expect(win(f.foes[0])).toBe(true); expect(win(f.foes[1])).toBe(false);
    expect(logHas(f, /can't react in .* grip \(Iron Grip\)/)).toBe(true);
  });
  it('I: when you walk, the held target comes with you into the tile you leave, and stays held (a Grapple and a Bind alike)', () => {
    const f = fight('I'); hold(f, f.foes[0]);
    f.act({ type: 'combat/move', unitId: f.pc.id, to: f.tile('B7') } as any);
    expect(f.pc.pos).toBe(f.tile('B7')); expect(f.unit(f.foes[0].id).pos).toBe(f.tile('C7'));
    expect(condOn(f.unit(f.foes[0].id), 'grappled')).toBe(true); expect(logHas(f, /drags .* along \(Iron Grip\)/)).toBe(true);
    const g = fight('I'); g.pc.tech = { ...(g.pc.tech || {}), bind: { target: g.foes[0].id, pen: 2, r: g.cb.round, via: 'dexterity' } };
    g.act({ type: 'combat/move', unitId: g.pc.id, to: g.tile('B7') } as any);
    expect(g.unit(g.foes[0].id).pos).toBe(g.tile('C7')); expect(g.pc.tech!.bind.target).toBe(g.foes[0].id); // the Bind didn't break
    // without the perk a walk leaves the target behind
    const n = physFight([{ weapon: 'sabre' }], [{ at: 'D7', weapon: 'fists' }]); n.put(n.pc, 'C7'); n.put(n.foe, 'D7'); n.turn(n.pc); hold(n, n.foe);
    n.act({ type: 'combat/move', unitId: n.pc.id, to: n.tile('B7') } as any); expect(n.unit(n.foe.id).pos).toBe(n.tile('D7'));
  });
  it('II: each melee technique that hits a held target gives 1 Momentum (once a technique); not at tier I, not on a target you don\'t hold', () => {
    const f = fight('II'); hold(f, f.foes[0]); f.momentum(f.pc, 0); rig({ hit: true });
    expect(f.tech('cut', { targetId: f.foes[0].id })).toBeNull();
    expect(f.momentum(f.pc)).toBe(2); // the plain attack's own 1, and Iron Grip's
    expect(f.tech('bash', { targetId: f.foes[0].id })).toBeNull();
    expect(f.momentum(f.pc)).toBe(2); // a Strike spends 1 and gets it back
    const one = fight('I'); hold(one, one.foes[0]); one.momentum(one.pc, 0); rig({ hit: true });
    one.tech('cut', { targetId: one.foes[0].id }); expect(one.momentum(one.pc)).toBe(1);
    const free = fight('II'); free.momentum(free.pc, 0); rig({ hit: true });
    free.tech('cut', { targetId: free.foes[0].id }); expect(free.momentum(free.pc)).toBe(1);
  });
  it('II: Throw Down on a held target needs no Momentum (the answer to the core\'s query)', () => {
    const ask = (f: F) => withGame(f.g, () => statQuery({ u: f.pc, cb: f.cb }, 'momentum_needed:throw_down', {}).add);
    const f = fight('II'); expect(ask(f)).toBe(0); hold(f, f.foes[0]); expect(ask(f)).toBe(-99);
    const one = fight('I'); hold(one, one.foes[0]); expect(ask(one)).toBe(0);
  });
  it('the old 2 AP grab is gone: holding comes from Bind', () => {
    const f = fight('II');
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'iron_grip', targetId: f.foes[0].id } as any)).toThrow(/isn't an action/);
  });
});

describe('Both Hands (replaces Origami Hands)', () => {
  const fight = (tier: string | null) => {
    const f = physFight([{ weapon: 'service_pistol', off: 'combat_knife', skills: { dexterity: 6 }, ...(tier ? { perks: { both_hands: tier } } : {}) }], [{ at: 'D7' }]);
    f.put(f.pc, 'C7'); f.put(f.foe, 'D7'); f.unit(f.foe.id).hp = f.unit(f.foe.id).maxHp = 900; f.turn(f.pc); f.unit(f.pc.id).ap = 30; return f;
  };
  const recoil = (f: F) => withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot', { free: true })).terms!.some((t) => t.label === 'recoil');
  const swing = (f: F, mode: 'melee' | 'shot') => withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.pc, f.foe, mode, f.char(f.pc), { noAp: true }));
  it('I: after a melee technique hits, your next shot that turn has no Recoil; the shot after it has', () => {
    const f = fight('I'); rig({ hit: true }); f.unit(f.pc.id).shotsThisTurn = 6;
    expect(recoil(f)).toBe(true);
    expect(f.tech('cut', { targetId: f.foe.id, hand: 'off' })).toBeNull();
    f.unit(f.pc.id).shotsThisTurn = 6; expect(recoil(f)).toBe(false);
    swing(f, 'shot'); f.unit(f.pc.id).shotsThisTurn = 6; expect(recoil(f)).toBe(true); // it was the next shot
    const none = fight(null); rig({ hit: true }); none.tech('cut', { targetId: none.foe.id, hand: 'off' }); none.unit(none.pc.id).shotsThisTurn = 6; expect(recoil(none)).toBe(true);
  });
  it('a melee miss sets nothing up; the turn ending drops it', () => {
    const f = fight('I'); rig({ hit: false }); f.tech('cut', { targetId: f.foe.id, hand: 'off' }); f.unit(f.pc.id).shotsThisTurn = 6; expect(recoil(f)).toBe(true);
    rig({ hit: true }); f.tech('cut', { targetId: f.foe.id, hand: 'off' }); f.unit(f.pc.id).shotsThisTurn = 6; expect(recoil(f)).toBe(false);
    f.cb.round += 1; expect(recoil(f)).toBe(true);
  });
  it('II: a shot that hits gives 1 Momentum, once a turn; tier I gives none', () => {
    const f = fight('II'); rig({ hit: true }); f.momentum(f.pc, 0);
    swing(f, 'shot'); expect(f.momentum(f.pc)).toBe(1); expect(logHas(f, /\+1 Momentum \(Both Hands\)/)).toBe(true);
    swing(f, 'shot'); expect(f.momentum(f.pc)).toBe(1);
    f.cb.round += 1; swing(f, 'shot'); expect(f.momentum(f.pc)).toBe(2);
    const one = fight('I'); rig({ hit: true }); one.momentum(one.pc, 0); swing(one, 'shot'); expect(one.momentum(one.pc)).toBe(0);
  });
});

describe('Quick Draw, Tuned, Hand-Off, Stand Still (unlocks)', () => {
  it('Quick Draw: the first attack of a fight with a weapon drawn for it costs 0 AP (asked with the technique\'s id); then full price', () => {
    const cost = (f: F, tech: string) => withGame(f.g, () => emit(f.cb, 'attack_preview', { att: f.pc, tgt: f.pc, mode: 'shot', melee: false, ap: 2, reach: 1, terms: [], fail: null, free: false, preview: true, volleyCost: true, tech, cb: f.cb, mods: [] })).ap;
    const f = physFight([{ weapon: 'sabre', skills: { dexterity: 5 } }]); f.turn(f.pc);
    expect(cost(f, 'snap_shot')).toBe(0); expect(cost(f, 'draw_cut')).toBe(0); expect(cost(f, 'shot')).toBe(2);
    withGame(f.g, () => emit(f.cb, 'action_done', { u: f.pc, a: { type: 'combat/technique', id: 'snap_shot', item: 0 }, cb: f.cb }));
    expect(cost(f, 'snap_shot')).toBe(2); expect(logHas(f, /Quick Draw/)).toBe(true);
    const low = physFight([{ weapon: 'sabre', skills: { dexterity: 4 } }]); low.turn(low.pc); expect(cost(low, 'snap_shot')).toBe(2);
  });
  it('Tuned: the weapon in your main hand never stays jammed and never breaks; without it a fumble jams', () => {
    const run = (pts: number) => {
      const f = physFight([{ weapon: 'service_pistol', skills: { proficiency: pts, dexterity: 4 } }], [{ at: 'F7' }]); f.put(f.pc, 'C7'); f.put(f.foe, 'F7'); f.turn(f.pc);
      const u = f.unit(f.pc.id); u.maxDur = 100; u.dur = 1; rig({ die: 1 });
      withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.pc, f.foe, 'shot', f.char(f.pc), { noAp: true }));
      return f;
    };
    const tuned = run(5); expect(tuned.pc.jammed).toBe(false); expect(tuned.pc.dur).toBe(1); expect(logHas(tuned, /doesn't jam \(Tuned\)/)).toBe(true);
    expect(logHas(tuned, /the gun jams/)).toBe(false); expect(tuned.pc.stunnedNext || 0).toBe(0); // the attack's own line never says it jammed
    const plain = run(4); expect(plain.pc.jammed).toBe(true); expect(plain.pc.dur).toBe(0); expect(logHas(plain, /the gun jams/)).toBe(true);
  });
  it('Hand-Off: once a round an ally next to you uses your Defense against one attack; 3 tiles with Many Hands; no AP moves', () => {
    const fight = (pts: number, perks: any = {}) => {
      const f = physFight([{ weapon: 'sabre', skills: { camaraderie: pts }, perks }, { name: 'Ally' }], [{ at: 'H7' }]); const [a, b] = f.pcs;
      f.put(a, 'C7'); f.put(b, 'C8'); f.put(f.foe, 'H8'); f.unit(a.id).def = 18; f.unit(b.id).def = 10; f.unit(f.foe.id).ap = 30; return f;
    };
    const term = (f: F) => withGame(f.g, () => previewAttack(f.cb, f.foe, f.unit(f.pcs[1].id), 'shot', { free: true })).terms!.find((t) => /^Hand-Off/.test(t.label))?.v ?? 0;
    const f = fight(3);
    expect(term(f)).toBe(-8); expect(term(f)).toBe(-8); // a preview spends nothing
    expect(withGame(f.g, () => previewAttack(f.cb, f.foe, f.unit(f.pcs[0].id), 'shot', { free: true })).terms!.some((t) => /^Hand-Off/.test(t.label))).toBe(false); // not for yourself
    const ap = f.pcs.map((u) => u.ap);
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.foe, f.unit(f.pcs[1].id), 'shot', null, { noAp: true }));
    expect(logHas(f, /is covered by .* \(Hand-Off\)/)).toBe(true); expect(f.pcs.map((u) => u.ap)).toEqual(ap);
    expect(term(f)).toBe(0); // once a round
    f.cb.round += 1; expect(term(f)).toBe(-8);
    f.put(f.pcs[1], 'C10'); expect(term(f)).toBe(0); // 3 tiles away: too far
    expect(term(fight(2))).toBe(0);
    const many = fight(10, { many_hands: 'mastered' }); many.put(many.pcs[1], 'C10'); expect(term(many)).toBe(-8);
    many.put(many.pcs[1], 'C11'); expect(term(many)).toBe(0);
    const low = fight(3); low.unit(low.pcs[0].id).def = 9; expect(term(low)).toBe(0); // only if yours is higher
  });
  it('Stand Still (the original, restored): until you first act, enemies are at −2 to hit you; a Call is not acting, a move is', () => {
    const fight = (pts: number) => { const f = physFight([{ weapon: 'sabre', skills: { composure: pts, charisma: 1 } }, { name: 'Ally' }], [{ at: 'F7', weapon: 'service_pistol' }]); f.put(f.pcs[0], 'C7'); f.put(f.pcs[1], 'C8'); f.put(f.foe, 'F7'); f.turn(f.pc); return f; };
    const term = (f: F) => { const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(f.foe.id), f.unit(f.pc.id), 'shot', { free: true })); if (!pv.terms) throw new Error('preview: ' + pv.why); return pv.terms.filter((t: any) => t.label === 'Stand Still').reduce((n: number, t: any) => n + t.v, 0); };
    const f = fight(5); expect(term(f)).toBe(-2); expect(term(fight(4))).toBe(0);
    f.act({ type: 'combat/call', unitId: f.pc.id, id: 'call.rally', targetId: f.pcs[1].id } as any); expect(term(f)).toBe(-2);
    f.act({ type: 'combat/move', unitId: f.pc.id, to: f.tile('B7') } as any); expect(term(f)).toBe(0);
  });
});

describe('Read Them (Acuity 5; was Weak Point)', () => {
  it('Analyze at 5 points marks the enemy; it then deals 15% less to the squad, and the squad deals it no more than before', () => {
    const f = physFight([{ weapon: 'service_pistol', skills: { analysis: 5 } }], [{ at: 'F7' }]); f.put(f.pc, 'C7'); f.put(f.foe, 'F7'); f.turn(f.pc);
    f.act({ type: 'combat/analyze', unitId: f.pc.id, targetId: f.foe.id } as any);
    expect(f.foe.weakPoint).toBe(true);
    expect(logHas(f, /Read Them: it deals 15% less damage to the squad/)).toBe(true); expect(logHas(f, /Weak Point|\+15%/)).toBe(false);
    const pc = f.unit(f.pc.id); pc.hp = pc.maxHp = 1000;
    withGame(f.g, () => applyDamage(f.cb, pc, 200, { by: f.foe, type: 'weapon', ranged: true }));
    expect(1000 - f.pc.hp).toBe(170);
    const pv = withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot', { free: true }));
    expect(pv.dmg!.mults.some((m) => /Weak Point/.test(m.label))).toBe(false);
  });
});

describe('the hooks wired into the core (physical/core.ts)', () => {
  it('Heavy Hands in play: a Shove pushes 2 tiles at Raw Power 3 and 1 tile at 2; the card shows the same tile', () => {
    const run = (pts: number) => {
      const f = physFight([{ weapon: 'sabre', known: ['shove'], skills: { raw_power: pts, athletics: 4 } }], [{ at: 'D7' }]); f.put(f.pc, 'C7'); f.put(f.foe, 'D7'); f.turn(f.pc); weak(f, f.foe);
      const pv = f.pv('shove', { targetId: f.foe.id }); expect(f.tech('shove', { targetId: f.foe.id })).toBeNull();
      expect(pv.moves).toEqual([{ unit: f.foe.id, to: f.unit(f.foe.id).pos }]);
      return f.unit(f.foe.id).pos === f.tile('F7') ? 2 : f.unit(f.foe.id).pos === f.tile('E7') ? 1 : 0;
    };
    expect(run(3)).toBe(2); expect(run(2)).toBe(1);
  });
  it('Quick Draw in play: the first Snap Shot of a fight costs 0 AP on the card and in the charge; the second costs its 2', () => {
    const fight = (pts: number) => {
      const f = physFight([{ weapon: 'sabre', known: ['snap_shot'], skills: { dexterity: pts } }], [{ at: 'F7' }]); f.put(f.pc, 'C7'); f.put(f.foe, 'F7'); f.unit(f.foe.id).hp = f.unit(f.foe.id).maxHp = 900; f.turn(f.pc);
      const c: any = f.char(f.pc); c.pack = [...(c.pack || []), { id: 'service_pistol', name: 'service_pistol', qty: 1, kind: 'weapon', weapon: 'service_pistol', loaded: 12 }];
      return f;
    };
    const stowed = (f: F, w: string) => (f.char(f.pc) as any).pack.findIndex((x: any) => x.weapon === w);
    const f = fight(5); rig({ hit: true, die: 12 });
    expect(f.pv('snap_shot', { targetId: f.foe.id, item: stowed(f, 'service_pistol') }).ap).toBe(0);
    expect(f.tech('snap_shot', { targetId: f.foe.id, item: stowed(f, 'service_pistol') })).toBeNull(); expect(f.pc.ap).toBe(6);
    expect(f.pv('snap_shot', { targetId: f.foe.id, item: stowed(f, 'sabre') }).ap).toBeGreaterThan(0); // used up for the fight
    const low = fight(4); expect(low.pv('snap_shot', { targetId: low.foe.id, item: stowed(low, 'service_pistol') }).ap).toBe(2);
  });
  it('Iron Grip II in play: Throw Down on a held target starts with no Momentum; tier I still needs 2', () => {
    const fight = (tier: string) => {
      const f = physFight([{ weapon: 'fists', known: ['throw_down'], skills: { raw_power: 5, dexterity: 6 }, perks: { iron_grip: tier } }], [{ at: 'D7', weapon: 'fists' }]);
      f.put(f.pc, 'C7'); f.put(f.foe, 'D7'); f.unit(f.foe.id).hp = f.unit(f.foe.id).maxHp = 500; f.turn(f.pc); hold(f, f.foe); f.momentum(f.pc, 0); return f;
    };
    const two = fight('II'); rig({ hit: true });
    expect(two.pv('throw_down', { targetId: two.foe.id }).ok).toBe(true);
    expect(two.tech('throw_down', { targetId: two.foe.id })).toBeNull(); expect(two.momentum(two.pc)).toBe(0); // it spends all there is: none
    const one = fight('I'); expect(one.tech('throw_down', { targetId: one.foe.id })).toMatch(/Needs Momentum 2/);
  });
  it('Breaching Strike in play: a push that is blocked at once slams the target where it stands, and once only', () => {
    const fight = (wall: string, pts = 2, tier: string | null = 'I') => {
      const f = physFight([{ weapon: 'sabre', known: ['shove'], skills: { raw_power: pts, athletics: 4 }, ...(tier ? { perks: { breaching_strike: tier } } : {}) }], [{ at: 'D7' }]);
      f.put(f.pc, 'C7'); f.put(f.foe, 'D7'); f.cb.map = { ...f.cb.map, solid: [...(f.cb.map.solid || []), f.tile(wall)] };
      f.unit(f.foe.id).hp = f.unit(f.foe.id).maxHp = 500; f.turn(f.pc); weak(f, f.foe); return f;
    };
    const slams = (f: F) => f.cb.log.filter((l) => /slammed into the wall \(Breaching Strike\)/.test(l)).length;
    const f = fight('E7'); expect(f.tech('shove', { targetId: f.foe.id })).toBeNull();
    expect(f.unit(f.foe.id).pos).toBe(f.tile('D7')); expect(f.unit(f.foe.id).hp).toBeLessThan(500); expect(slams(f)).toBe(1);
    // Heavy Hands sends it a second tile, the wall stops that one: still one slam (not one from the core and one at the action's end)
    const g = fight('F7', 3); expect(g.tech('shove', { targetId: g.foe.id })).toBeNull();
    expect(g.unit(g.foe.id).pos).toBe(g.tile('E7')); expect(slams(g)).toBe(1);
    const none = fight('E7', 2, null); expect(none.tech('shove', { targetId: none.foe.id })).toBeNull(); expect(none.unit(none.foe.id).hp).toBe(500);
  });
});

describe('Siege Engine reaches the techniques', () => {
  it('the Break Finisher costs 1 AP less; a 1 AP Shove stays 1 AP (never below 1); without the perk, full price', () => {
    const fight = (perks: any) => { const f = physFight([{ weapon: 'sabre', known: ['shove', 'break'], skills: { raw_power: 5, durability: 5, dexterity: 6 }, perks }], [{ at: 'D7' }]); f.put(f.pc, 'C7'); f.put(f.foe, 'D7'); f.turn(f.pc); f.momentum(f.pc, 3); return f; };
    const plain = fight({}), siege = fight({ siege_engine: 'I' });
    const ap = (f: F, id: string) => f.pv(id, { targetId: f.foe.id }).ap;
    expect(ap(plain, 'break')).toBeGreaterThan(1); expect(ap(siege, 'break')).toBe(ap(plain, 'break') - 1);
    expect(ap(plain, 'shove')).toBe(1); expect(ap(siege, 'shove')).toBe(1);
    rig({ hit: true }); const before = siege.pc.ap, cost = ap(siege, 'break');
    expect(siege.tech('break', { targetId: siege.foe.id })).toBeNull(); expect(before - siege.pc.ap).toBe(cost);
  });
});

describe('Grapple is a technique (Leon, 10 Nov 2026): Iron Grip gives it on the pad', () => {
  it('with Iron Grip the pad lists Grapple, a Link at 1 AP; without it, not', () => {
    const mk = (perks: any) => { const f = physFight([{ weapon: 'sabre', skills: { raw_power: 4 }, perks } as any], [{ at: 'D7' }]); f.put(f.pc, 'C7'); f.put(f.foe, 'D7'); f.turn(f.pc); return f; };
    const ids = (f: F) => f.pad().flatMap((g: any) => g.entries.map((e: any) => e.id));
    const yes = mk({ iron_grip: 'I' }), no = mk({});
    expect(ids(yes)).toContain('grapple'); expect(ids(no)).not.toContain('grapple');
    const e = yes.pad().flatMap((g: any) => g.entries).find((x: any) => x.id === 'grapple'); expect(e.ap).toBe(1); expect(e.group).toBe('link');
    const foe = yes.unit(yes.foe.id); foe.sv = { body: -50, brain: 0, heart: 0 } as any;
    expect(yes.tech('grapple', { targetId: yes.foe.id })).toBeNull();
    expect(Object.keys(yes.unit(yes.foe.id).conds || {})).toContain('grappled');
  });
});
