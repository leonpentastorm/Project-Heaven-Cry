// The camp, the starting boons, the caster boons and the supply pack (rules 1.51; survival-spec section 13, rules 48 to
// 54). The offer by line (a Sigilist is offered Sigil boons, a level 1 gunner gun boons, three real cards for every
// reference build); the camp through the reducer (the pick, the host's go and the first card, refusals in words, the
// camp's issue: free armour to class 3 and three spare magazines); each starting boon and caster boon through the
// item-op runner's own doors, its number read from data, its worth on the run's cap; the supply pack per resource
// (magazines, the cores burnt back between 1 and 2 x n, the MP share, Bandolier on all of it, Flux 0 after a run's
// fight, the loaded charge full at a Rest).
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, boonWorks, boonServes, FOCUS_IDS, START_BOONS, START_BOON, CAMP, BOONS, BOON_CAP, runWorth, capRoom, worthOf, relicRow, lineOf, lineBoons, startOffer, isStartBoon,
  ammoPack, supplyMp, chargeHeld, coresBurnt, maxMp, mpNow, previewAttack, toHitTerms, applyDamage, price, emit, bindGame, glyphCost, packOf, magazineWorth, KITS, newCharacter, CORE_CHARGE, VIS_CHARGE, healUnit, FAITH_PATRON } from '../src';
import { fightWith } from './helpers/perkfight';
import { Rec, type Pc } from './helpers/replay';
import { BUILDS } from './balance/builds';
import { survivalRoom, ownerOf } from './helpers/survival';
import svJ from '../../../data/survival.json';

const SV: any = svJ;
const W = <T,>(g: GameState, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const row = (id: string): any => START_BOONS.find((b) => b.id === id) || BOONS.find((b) => b.id === id);
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const camp = (pcs: Pc[], seed = 'PHC-0001') => apply(survivalRoom(seed, pcs, { test: true }), { type: 'run/start', seed }, 'host');
const linesOf = (ids: string[]) => ids.map((id) => row(id).lines);

describe('rules 1.51: the offer by line (spec rule 49)', () => {
  it('a Sigilist (Evoker in hand, Brain Power) is offered two Sigil boons and one gun boon (its pistol)', () => {
    const g = camp([{ build: 'sigil', level: 1 }]), c = g.characters.c1;
    expect(lineOf(c)).toEqual({ main: 'sigil', second: 'guns' });
    const l = linesOf(g.run!.boons!.c1);
    expect(l.filter((x) => x.includes('sigil'))).toHaveLength(START_BOON.main); expect(l.filter((x) => x.includes('guns'))).toHaveLength(START_BOON.second);
  });
  it('a level 1 gunner is offered two gun boons; its second line is its next alpha skill\'s, else blades', () => {
    const g = camp([{ build: 'plain_gun', level: 1 }]), c = g.characters.c1, l = lineOf(c);
    expect(l.main).toBe('guns'); expect(l.second).not.toBe('guns');
    const lines = linesOf(g.run!.boons!.c1);
    expect(lines.filter((x) => x.includes('guns'))).toHaveLength(START_BOON.main);
    expect(lines.filter((x) => x.includes(l.second))).toHaveLength(START_BOON.second);
  });
  it('a focus in hand names the line: Emanator Outburst, Attuner Bonds and Tending, Visualizer Figments (with its door skill)', () => {
    for (const [kit, skill, line] of [['soul', 'will_power', 'outburst'], ['mender', 'empathy', 'bonds'], ['rigger', 'visualization', 'figments']]) {
      const c: any = newCharacter('x', 'host', { name: 'X', portrait: '', origin: '', kit, traits: [], skills: { [skill]: 2, dexterity: 1 }, attrs: {}, cores: { body: 1, mind: 1, soul: 1 }, identity: {} } as any);
      expect(lineOf(c).main, kit).toBe(line); expect(lineOf(c).second, kit).toBe('guns');
      expect(startOffer(c, 'S').filter((id) => row(id).lines.includes(line)).length, kit).toBeGreaterThanOrEqual(START_BOON.main);
    }
    const nofocus: any = newCharacter('y', 'host', { name: 'Y', portrait: '', origin: '', kit: 'sigil', traits: [], skills: { durability: 3 }, attrs: {}, cores: { body: 1, mind: 1, soul: 1 }, identity: {} } as any);
    expect(lineOf(nofocus).main).toBe('guard'); // an Evoker without Brain Power opens nothing: the highest attribute's alpha skill
  });
  it('every reference build is offered three distinct real starting boons, the same on the same seed, each worth at most max_worth', () => {
    for (const b of BUILDS) {
      const g = camp([{ build: b.id, level: 1 }]), o = g.run!.boons!.c1;
      expect(new Set(o).size, b.id).toBe(START_BOON.offer);
      for (const id of o) { expect(isStartBoon(id), id).toBe(true); expect(worthOf(id)).toBeLessThanOrEqual(START_BOON.max_worth); }
      expect(camp([{ build: b.id, level: 1 }]).run!.boons!.c1).toEqual(o);
    }
  });
  it('every line has at least two rows; every damage line the same shapes (+1 to hit worth 6, +5% damage 5, a tempo row 4); no starting boon is a Boss boon', () => {
    for (const l of Object.values(START_BOON.lines)) expect(lineBoons(l).length, l).toBeGreaterThanOrEqual(2);
    for (const l of ['guns', 'blades', 'sigil', 'outburst']) expect(lineBoons(l).map((b) => b.worth).sort(), l).toEqual([4, 5, 6]);
    for (const b of START_BOONS) expect(BOONS.some((x) => x.id === b.id)).toBe(false);
    expect(START_BOONS).toHaveLength(SV.start_boons.length); expect(START_BOONS.length).toBeGreaterThanOrEqual(24);
  });
});

describe('rules 1.51: the camp through the reducer (spec rules 48, 53)', () => {
  const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
  it('run/start opens the camp: the map waits; each player takes one card for its character; the map opens when all have', () => {
    const g = camp(DUO), first = g.run!.nodes.find((n) => n.depth === 1)!;
    expect(g.run!.state).toBe('camp');
    expect(refused(g, { type: 'run/move', node: first.id })).toBe('Choose your starting boon first. The map opens when everyone has.');
    const a = apply(g, { type: 'run/boon', charId: 'c1', choice: 1 }, 'host');
    expect(a.characters.c1.relics).toEqual([g.run!.boons!.c1[1]]); expect(a.run!.state).toBe('camp');
    const b = apply(a, { type: 'run/boon', charId: 'c2', choice: 0 }, 'p2');
    expect(b.run!.state).toBe('map'); expect(b.run!.boons).toBeNull(); expect(b.characters.c2.relics).toEqual([g.run!.boons!.c2[0]]);
    expect(apply(b, { type: 'run/move', node: first.id }, 'host').run!.leans.host).toBe(first.id);
  });
  it('refusals in words; the host picks for an away player; the host\'s go gives every character who has not picked its first card', () => {
    const g = camp(DUO);
    expect(refused(g, { type: 'run/boon', charId: 'c1', choice: 0 }, 'p2')).toBe('Only Plain gun 1\'s player picks for Plain gun 1, or the host while they are away.');
    expect(refused(g, { type: 'run/boon', charId: 'c1', choice: 7 })).toBe('That boon is not on Plain gun 1\'s offer.');
    expect(refused(g, { type: 'run/go' }, 'p2')).toBe('Only the host can send the squad on before everyone has marked a stop.');
    const a = apply(g, { type: 'run/boon', charId: 'c1', choice: 2 }, 'host');
    expect(refused(a, { type: 'run/boon', charId: 'c1', choice: 0 })).toBe('There is no boon to pick for that character now.');
    const b = apply(a, { type: 'run/go' }, 'host');
    expect(b.run!.state).toBe('map'); expect(b.run!.boons).toBeNull();
    expect(b.characters.c2.relics).toEqual([g.run!.boons!.c2[0]]); expect(b.characters.c1.relics).toEqual([g.run!.boons!.c1[2]]);
    expect(b.story.entries.some((e) => /was away and takes the first card/.test(e.text))).toBe(true);
    expect(runWorth(b.characters.c2)).toBe(worthOf(g.run!.boons!.c2[0])); expect(capRoom(b.characters.c2)).toBe(BOON_CAP - worthOf(g.run!.boons!.c2[0]));
  });
  it('the camp\'s issue: armour fitted to class 3 free at the camp (once), refused after it; the gun in hand topped up to three spare magazines', () => {
    const g = camp(DUO), c2 = g.characters.c2;
    expect(KITS.sigil.armourClass).toBeLessThan(CAMP.issue_armour);
    const credits = c2.credits, a = apply(g, { type: 'run/fit', charId: 'c2' }, 'p2');
    expect(a.characters.c2.armourClass).toBe(CAMP.issue_armour); expect(a.characters.c2.credits).toBe(credits);
    expect(refused(a, { type: 'run/fit', charId: 'c2' }, 'p2')).toBe('Sigil caster 2 already wears class 3: the camp issues up to class 3.');
    const spare = (c: any) => packOf(c).filter((x) => x.id === 'mag:' + c.weapon).reduce((t, x) => t + (x.qty || 0), 0);
    expect(spare(g.characters.c2)).toBe(CAMP.spare_mags); expect(spare(g.characters.c1)).toBeGreaterThanOrEqual(CAMP.spare_mags);
    const map = apply(a, { type: 'run/go' }, 'host');
    expect(refused(map, { type: 'run/fit', charId: 'c1' })).toBe('You are not at a Forge.');
  });
  it('the rigger and mender kits hold their focus in the off hand', () => {
    expect(KITS.rigger.offHand).toBe('visualizer'); expect(KITS.mender.offHand).toBe('attuner');
    expect(KITS.rigger.pack.some((x) => x.id === 'standard_core' && x.qty === 4)).toBe(true);
  });
});

describe('rules 1.51: each starting boon through its door (survival-spec 13.3), its number from data', () => {
  const terms = (spec: any, kind: 'weapon' | 'sigil' | 'soul', prep: (f: any) => void = () => {}) => { const f = fightWith([spec], [{ tier: 'soldier' }]); prep(f); return W(f.g, () => toHitTerms(f.cb, f.pc, f.foe, kind)); };
  const atk = (spec: any, mode = 'shot') => { const f = fightWith([spec], [{ tier: 'soldier' }]); if (mode === 'melee') { const [x, y] = f.pc.pos.split(',').map(Number); f.foe.pos = (x + 1) + ',' + y; } const p = W(f.g, () => previewAttack(f.cb, f.pc, f.foe, mode as any)); return { ...p, terms: p.terms || [] }; };
  it('to hit: Zeroed with guns, Balanced Grip in melee (the attack), Steady Line on Sigils, Clear Pulse on Outbursts, Patient Eye while Hidden; never on the other door', () => {
    const z = atk({ kit: 'soldier', relics: ['start.zeroed'] });
    expect(z.terms.find((t: any) => t.label === 'Zeroed')!.v).toBe(row('start.zeroed').effects[0].value);
    expect(atk({ kit: 'soldier', relics: ['start.balanced'] }).terms.some((t: any) => t.label === 'Balanced Grip')).toBe(false); // a rifle shot is not melee
    expect(atk({ kit: 'soldier', weapon: 'sabre', relics: ['start.balanced'] }, 'melee').terms.find((t: any) => t.label === 'Balanced Grip')!.v).toBe(row('start.balanced').effects[0].value);
    expect(terms({ kit: 'sigil', relics: ['start.steady_line'] }, 'sigil').find((t) => t.label === 'Steady Line')!.v).toBe(row('start.steady_line').effects[0].value);
    expect(terms({ kit: 'sigil', relics: ['start.steady_line'] }, 'soul').some((t) => t.label === 'Steady Line')).toBe(false);
    expect(terms({ kit: 'soul', relics: ['start.clear_pulse'] }, 'soul').find((t) => t.label === 'Clear Pulse')!.v).toBe(row('start.clear_pulse').effects[0].value);
    expect(terms({ kit: 'soldier', relics: ['start.patient_eye'] }, 'weapon').some((t) => t.label === 'Patient Eye')).toBe(false);
    expect(terms({ kit: 'soldier', relics: ['start.patient_eye'] }, 'weapon', (f) => { f.pc.hidden = true; }).find((t) => t.label === 'Patient Eye')!.v).toBe(row('start.patient_eye').effects[0].value);
  });
  it('damage dealt: Hot Loads on guns, Whetted in melee, Bright Script on Sigils, Hot Blood on Outbursts, Cheap Shot while Hidden (a term named for each)', () => {
    const out = (spec: any, src: any, prep: (f: any) => void = () => {}) => { const f = fightWith([spec], [{ tier: 'soldier' }]); prep(f); const h: any = { att: f.pc, tgt: f.foe, melee: !!src.melee, src: { by: f.pc, ...src }, base: 10, add: 0, mults: [], vs: [], cb: f.cb, mods: [] }; W(f.g, () => emit(f.cb, 'damage_out', h)); return h.mults as any[]; };
    const v = (l: any[], name: string) => l.find((m) => m.label === name)?.v;
    expect(v(out({ relics: ['start.hot_loads'] }, { type: 'weapon', ranged: true }), 'Hot Loads')).toBe(row('start.hot_loads').effects[0].value);
    expect(v(out({ relics: ['start.hot_loads'] }, { type: 'weapon', melee: true }), 'Hot Loads')).toBeUndefined();
    expect(v(out({ relics: ['start.whetted'] }, { type: 'weapon', melee: true }), 'Whetted')).toBe(row('start.whetted').effects[0].value);
    expect(v(out({ kit: 'sigil', relics: ['start.bright_script'] }, { type: 'sigil' }), 'Bright Script')).toBe(row('start.bright_script').effects[0].value);
    expect(v(out({ kit: 'sigil', relics: ['start.bright_script'] }, { type: 'soul' }), 'Bright Script')).toBeUndefined();
    expect(v(out({ kit: 'soul', relics: ['start.hot_blood'] }, { type: 'soul' }), 'Hot Blood')).toBe(row('start.hot_blood').effects[0].value);
    expect(v(out({ relics: ['start.cheap_shot'] }, { type: 'weapon', ranged: true }), 'Cheap Shot')).toBeUndefined();
    expect(v(out({ relics: ['start.cheap_shot'] }, { type: 'weapon', ranged: true }, (f) => { f.pc.hidden = true; }), 'Cheap Shot')).toBe(row('start.cheap_shot').effects[0].value);
  });
  it('damage taken: Thick Hide on every blow, In Close only from a foe standing next to you', () => {
    const lost = (relics: string[], near: boolean) => { const f = fightWith([{ kit: 'soldier', relics }], [{ tier: 'soldier' }]), u = f.pc, was = u.hp;
      const [x, y] = u.pos.split(',').map(Number); f.foe.pos = near ? (x + 1) + ',' + y : (x + 6) + ',' + y;
      W(f.g, () => applyDamage(f.cb, u, 50, { by: f.foe, type: 'weapon', ranged: true })); return was - u.hp; };
    expect(lost(['start.thick_hide'], false)).toBeLessThan(lost([], false));
    expect(lost(['start.in_close'], false)).toBe(lost([], false));
    expect(lost(['start.in_close'], true)).toBeLessThan(lost([], true));
  });
  it('Guard: Set Feet +1 at the fight\'s start, Hold Fast +1 on the first HP lost (once a fight), each for a Durability user', () => {
    const guard = (u: any) => u.res?.guard ?? 0;
    const sk = { durability: 3 };
    const a = fightWith([{ kit: 'soldier', skills: sk, relics: ['start.set_feet'] }], [{ tier: 'soldier' }]), b = fightWith([{ kit: 'soldier', skills: sk }], [{ tier: 'soldier' }]);
    expect(guard(a.pc) - guard(b.pc)).toBe(row('start.set_feet').effects[0].value);
    const h = fightWith([{ kit: 'soldier', skills: sk, relics: ['start.hold_fast'] }], [{ tier: 'soldier' }]), g0 = guard(h.pc);
    W(h.g, () => applyDamage(h.cb, h.pc, 5, { by: h.foe, type: 'weapon', ranged: true })); const g1 = guard(h.pc);
    W(h.g, () => applyDamage(h.cb, h.pc, 5, { by: h.foe, type: 'weapon', ranged: true }));
    expect(g1 - g0).toBe(row('start.hold_fast').effects[0].value); expect(guard(h.pc)).toBeLessThanOrEqual(g1);
  });
  it('tempo: Quick Magazine (the first reload each fight 0 AP), Quick Chalk (the first glyph 1 AP less), Quick Sketch (the first Picture 1 AP less), Vigil (the first Whisper 0 AP); each spent once', () => {
    const f = fightWith([{ kit: 'soldier', relics: ['start.quick_mag'] }], [{ tier: 'soldier' }]), p = fightWith([{ kit: 'soldier' }], [{ tier: 'soldier' }]);
    const rl = (x: any) => W(x.g, () => price({ cb: x.cb, u: x.pc }, 'reload').ap);
    expect(rl(f)).toBe(row('start.quick_mag').effects[0].set); expect(rl(p)).toBeGreaterThan(0);
    W(f.g, () => emit(f.cb, 'reload', { u: f.pc, cb: f.cb })); expect(rl(f)).toBe(rl(p)); // spent by the reload
    const s = fightWith([{ kit: 'sigil', relics: ['start.quick_chalk'] }], [{ tier: 'soldier' }]), s0 = fightWith([{ kit: 'sigil' }], [{ tier: 'soldier' }]);
    const gc = (x: any) => W(x.g, () => glyphCost(x.cb, x.pc, 'fire', true).ap);
    expect(gc(s)).toBe(Math.max(0, gc(s0) + row('start.quick_chalk').effects[0].value));
    W(s.g, () => emit(s.cb, 'acted', { u: s.pc, action: 'draw', cb: s.cb })); expect(gc(s)).toBe(gc(s0));
    const r = fightWith([{ kit: 'rigger', skills: { visualization: 3 }, relics: ['start.quick_sketch'] }], [{ tier: 'soldier' }]), r0 = fightWith([{ kit: 'rigger', skills: { visualization: 3 } }], [{ tier: 'soldier' }]);
    const pic = (x: any) => W(x.g, () => price({ cb: x.cb, u: x.pc }, 'picture').ap);
    expect(pic(r)).toBe(Math.max(0, pic(r0) + row('start.quick_sketch').effects[0].value));
    W(r.g, () => emit(r.cb, 'acted', { u: r.pc, action: 'picture', cb: r.cb })); expect(pic(r)).toBe(pic(r0));
    const v = fightWith([{ kit: 'soldier', relics: ['start.vigil'] }], [{ tier: 'soldier' }]), v0 = fightWith([{ kit: 'soldier' }], [{ tier: 'soldier' }]);
    const wh = (x: any) => W(x.g, () => price({ cb: x.cb, u: x.pc }, 'whisper', 1).ap);
    expect(wh(v)).toBe(row('start.vigil').effects[0].set); expect(wh(v0)).toBe(1);
    W(v.g, () => emit(v.cb, 'acted', { u: v.pc, action: 'pray', cb: v.cb })); expect(wh(v)).toBe(1);
  });
  it('sustain: Second Breath (MP on a kill, a share of Will Power), Kindled (a quarter of a heal as MP, once a turn), Spare Charge (+3 Visualizer charge at the first round), Extra Doses (+1 toxin dose)', () => {
    const o = fightWith([{ kit: 'soul', skills: { will_power: 4 }, relics: ['start.second_breath'] }], [{ tier: 'soldier' }]);
    o.pc.mg!.mp = 10; W(o.g, () => emit(o.cb, 'on_kill', { by: o.pc, victim: o.foe, cb: o.cb }));
    expect(o.pc.mg!.mp).toBe(10 + row('start.second_breath').effects[0].value.per[0].value * 4);
    const m = fightWith([{ kit: 'mender', skills: { empathy: 4 }, relics: ['start.kindled'] }, { kit: 'soldier' }], [{ tier: 'soldier' }]), ally = m.pcs[1];
    m.pc.mg!.mp = 10; W(m.g, () => emit(m.cb, 'heal_given', { t: ally, by: m.pc, n: 40, kind: 'tending', cb: m.cb }));
    expect(m.pc.mg!.mp).toBe(10 + 40 * row('start.kindled').effects[0].value.per[0].value);
    W(m.g, () => emit(m.cb, 'heal_given', { t: ally, by: m.pc, n: 40, kind: 'tending', cb: m.cb })); expect(m.pc.mg!.mp).toBe(20); // once a turn
    const r = fightWith([{ kit: 'rigger', skills: { visualization: 3 }, relics: ['start.spare_charge'] }], [{ tier: 'soldier' }]);
    r.pc.mg!.vcharge = 2; W(r.g, () => emit(r.cb, 'round_start', { cb: r.cb, round: 1 }));
    expect(r.pc.mg!.vcharge).toBe(2 + row('start.spare_charge').effects[0].value);
    W(r.g, () => emit(r.cb, 'round_start', { cb: r.cb, round: 2 })); expect(r.pc.mg!.vcharge).toBe(5); // once a fight
    expect(row('start.extra_doses').effects[0]).toMatchObject({ op: 'resource', when: 'combat_start', resource: 'toxins' });
  });
  it('heals given: Gentle Hands on heals and shields; Shelter on the heals a real prayer gives, not on tending', () => {
    const healed = (relics: string[], kind: string) => { const f = fightWith([{ kit: 'mender', relics }, { kit: 'soldier' }], [{ tier: 'soldier' }]), t = f.pcs[1]; t.hp = 10; return W(f.g, () => healUnit(f.cb, t, 50, f.pc, kind).restored); };
    expect(healed(['start.gentle_hands'], 'tending')).toBe(Math.floor(50 * row('start.gentle_hands').effects[0].value));
    expect(healed(['start.shelter'], 'tending')).toBe(50);
    // the reviewer's defect: Shelter named a heal kind no prayer gives. A real Whisper of Health and a real Hymn, with and without it
    const prayed = (relics: string[], kind: 'whisper' | 'hymn', id: string) => {
      const f = fightWith([{ name: 'Priest', skills: { faith: 5 }, relics }, { name: 'Ally' }], [{ at: 'F6' }]);
      const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'mother_ember' }; c.patron = 'mother_ember'; c.devotion = 6;
      const [pr, al] = f.pcs; pr.pos = '2,5'; al.pos = '2,6'; f.turn(pr); f.unit(al.id).hp = 20; f.unit(pr.id).hp = 20;
      f.act({ type: 'faith/pray', unitId: pr.id, kind, id, targetId: al.id } as any);
      return f.unit(al.id).hp - 20;
    };
    const k = row('start.shelter').effects[0].value;
    const w0 = prayed([], 'whisper', 'health'), w1 = prayed(['start.shelter'], 'whisper', 'health');
    expect(w0).toBeGreaterThan(0); expect(w1).toBe(Math.floor(w0 * k));
    const hymn = (FAITH_PATRON as any).mother_ember.hymns.find((h: any) => h.effects.some((e: any) => e.op === 'heal')).id;
    const h0 = prayed([], 'hymn', hymn), h1 = prayed(['start.shelter'], 'hymn', hymn);
    expect(h0).toBeGreaterThan(0); expect(h1).toBeGreaterThan(h0);
    // Covering Prayer (the Faith line's third row): a real Whisper of Protection's shield, with and without it
    const shielded = (relics: string[]) => {
      const f = fightWith([{ name: 'Priest', skills: { faith: 5 }, relics }, { name: 'Ally' }], [{ at: 'F6' }]);
      const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'mother_ember' }; c.patron = 'mother_ember'; c.devotion = 6;
      const [pr, al] = f.pcs; pr.pos = '2,5'; al.pos = '2,6'; f.turn(pr); const a = f.unit(al.id); a.shield = 0; delete (a as any).shields;
      f.act({ type: 'faith/pray', unitId: pr.id, kind: 'whisper', id: 'protection', targetId: al.id } as any);
      return f.unit(al.id).shield || 0;
    };
    const s0 = shielded([]), s1 = shielded(['start.covering_prayer']);
    expect(s0).toBeGreaterThan(0); expect(s1).toBe(Math.floor(s0 * row('start.covering_prayer').effects[0].value));
    expect(shielded(['start.shelter'])).toBe(s0); // Shelter is the heals', not the shields'
  });
  it('every starting boon\'s worth lands on the cap when it is taken', () => {
    for (const b of START_BOONS) { const c: any = { relics: [b.id], weapon: 'service_pistol', pack: [] }; expect(runWorth(c)).toBe(b.worth); expect(capRoom(c)).toBe(BOON_CAP - b.worth); expect(relicRow(b.id)!.text).not.toMatch(/\{=/); }
  });
});

describe('rules 1.51 (the review): the offer serves only cards a character can use', () => {
  const mk = (kit: string, skills: Record<string, number>, attrs: Record<string, number> = {}): any => newCharacter('x', 'host', { name: 'X', portrait: '', origin: '', kit, traits: [], skills, attrs, cores: { body: 1, mind: 1, soul: 1 }, identity: {} } as any);
  const seeds = Array.from({ length: 40 }, (_, i) => 'S' + i);
  const usable = (c: any) => { for (const s of seeds) { const o = startOffer(c, s); expect(new Set(o).size).toBe(START_BOON.offer); for (const id of o) expect(boonWorks(c, row(id)), id + ' on seed ' + s).toBe(true); } };
  it('a Mender (Attuner, no Emanator) is never offered an Outburst card; its Bonds line has three rows that work with the Attuner', () => {
    const c = mk('mender', { empathy: 2, dexterity: 1 });
    usable(c);
    for (const s of seeds) expect(startOffer(c, s)).not.toContain('start.clear_pulse');
    expect(lineBoons('bonds').filter((b) => boonWorks(c, b))).toHaveLength(3);
  });
  it('Brain Power with no Evoker in hand opens no Sigil card (a soldier with Brain Power 3)', () => {
    const c = mk('soldier', { brain_power: 3, dexterity: 1 }, { intelligence: 4 });
    expect(lineOf(c).main).not.toBe('sigil');
    usable(c);
    for (const s of seeds) expect(startOffer(c, s).some((id) => row(id).lines.includes('sigil'))).toBe(false);
  });
  it('a character with two doors (an Evoker and an Emanator, both door skills) is offered from both', () => {
    const c = mk('sigil', { brain_power: 2, will_power: 2 });
    c.weapon = FOCUS_IDS.emanator.find((id: string) => !/katana|gauntlet/.test(id)) || FOCUS_IDS.emanator[0];
    const l = lineOf(c); expect([l.main, l.second].sort()).toEqual(['outburst', 'sigil']);
    usable(c);
    for (const s of seeds.slice(0, 10)) { const lines = startOffer(c, s).flatMap((id) => row(id).lines); expect(lines).toContain('sigil'); expect(lines).toContain('outburst'); }
  });
  it('the Faith line has three rows that work for a praying character; a Faith 3 soldier sees three real cards', () => {
    const c = mk('soldier', { faith: 3 }, { virtue: 4 });
    expect(lineOf(c).main).toBe('faith');
    expect(lineBoons('faith').filter((b) => boonWorks(c, b))).toHaveLength(3);
    usable(c);
  });
  it('every kit and reference build is offered three distinct cards that all work for it', () => {
    for (const kit of Object.keys(KITS)) usable(mk(kit, { dexterity: 1 }));
    for (const b of BUILDS) { const g = camp([{ build: b.id, level: 1 }]), c = g.characters.c1; for (const id of g.run!.boons!.c1) expect(boonWorks(c, row(id)), b.id + ' ' + id).toBe(true); }
  });
  it('after a Boss: Steady Heart is not served to an Attuner with Empathy alone; Sure Script needs the Evoker in hand', () => {
    expect(boonServes(mk('mender', { empathy: 3 }), row('boon.steady_heart'))).toBe(false);
    expect(boonServes(mk('soul', { will_power: 3 }), row('boon.steady_heart'))).toBe(true);
    expect(boonServes(mk('soldier', { brain_power: 3 }), row('boon.sure_script'))).toBe(false);
    expect(boonServes(mk('sigil', { brain_power: 3 }), row('boon.sure_script'))).toBe(true);
  });
});

describe('rules 1.51: the caster boons after a Boss (survival-spec 13.4)', () => {
  const CASTER = ['boon.script_ward', 'boon.long_hand', 'boon.sure_script', 'boon.steady_heart', 'boon.deep_reserve', 'boon.mercy_return'];
  it('six, each served only to its doors, each worth on the cap', () => {
    for (const id of CASTER) { const b: any = row(id); expect(b.doors?.length, id).toBeGreaterThan(0); expect(runWorth({ relics: [id], weapon: 'service_pistol', pack: [] } as any)).toBe(b.worth); }
  });
  it('Sure Script +2 on Sigils, Steady Heart +2 on Outbursts', () => {
    const t = (kit: string, id: string, k: 'sigil' | 'soul') => { const f = fightWith([{ kit, relics: [id] }], [{ tier: 'soldier' }]); return W(f.g, () => toHitTerms(f.cb, f.pc, f.foe, k)).find((x) => x.label === row(id).name)?.v; };
    expect(t('sigil', 'boon.sure_script', 'sigil')).toBe(row('boon.sure_script').effects[0].value);
    expect(t('soul', 'boon.steady_heart', 'soul')).toBe(row('boon.steady_heart').effects[0].value);
  });
  it('Ward of Script: a shield of 10% of max HP at the first round (once); Long Hand: a glyph drawn gives back 1 AP once a turn', () => {
    const f = fightWith([{ kit: 'sigil', relics: ['boon.script_ward'] }], [{ tier: 'soldier' }]);
    const before = f.pc.shield || 0; W(f.g, () => emit(f.cb, 'round_start', { cb: f.cb, round: 1 }));
    expect((f.pc.shield || 0) - before).toBe(Math.floor(f.pc.maxHp * row('boon.script_ward').effects[0].amount.per[0].value));
    const s1 = f.pc.shield; W(f.g, () => emit(f.cb, 'round_start', { cb: f.cb, round: 2 })); expect(f.pc.shield).toBe(s1);
    const l = fightWith([{ kit: 'sigil', relics: ['boon.long_hand'] }], [{ tier: 'soldier' }]), u = l.turn(l.pc), ap = u.ap;
    u.ap = ap - 1; W(l.g, () => emit(l.cb, 'acted', { u: l.pc, action: 'draw', cb: l.cb })); expect(l.pc.ap).toBe(ap - 1 + row('boon.long_hand').effects[0].value);
    W(l.g, () => emit(l.cb, 'acted', { u: l.pc, action: 'draw', cb: l.cb })); expect(l.pc.ap).toBe(ap); // once a turn
  });
  it('Deep Reserve: 2 MP a point of Will Power each round; Mercy\'s Return: half of each heal as MP', () => {
    const d = fightWith([{ kit: 'soul', skills: { will_power: 5 }, relics: ['boon.deep_reserve'] }], [{ tier: 'soldier' }]);
    d.pc.mg!.mp = 0; W(d.g, () => emit(d.cb, 'round_start', { cb: d.cb, round: 2 }));
    expect(d.pc.mg!.mp).toBe(5 * row('boon.deep_reserve').effects[0].value.per[0].value);
    const m = fightWith([{ kit: 'mender', relics: ['boon.mercy_return'] }, { kit: 'soldier' }], [{ tier: 'soldier' }]);
    m.pc.mg!.mp = 0; W(m.g, () => emit(m.cb, 'heal_given', { t: m.pcs[1], by: m.pc, n: 30, kind: 'tending', cb: m.cb }));
    expect(m.pc.mg!.mp).toBe(30 * row('boon.mercy_return').effects[0].value.per[0].value);
  });
});

describe('rules 1.51: the supply pack (spec rule 52)', () => {
  const cores = (l: any[]) => l.filter((x) => (x.item || x.id) === 'standard_core').reduce((t, x) => t + (x.qty || 1), 0);
  const sigil = () => clone(camp([{ build: 'sigil', level: 1 }])).characters.c1 as any;
  it('cores: what was burnt, at least cores x n and at most cores_max x n; none without an Evoker or Visualizer', () => {
    const c = sigil(), ap = SV.ammo_pack;
    expect(cores(ammoPack(c, 1, [], 0))).toBe(ap.cores); expect(cores(ammoPack(c, 1, [], 1))).toBe(ap.cores);
    expect(cores(ammoPack(c, 1, [], 2))).toBe(Math.min(2, ap.cores_max)); expect(cores(ammoPack(c, 1, [], 9))).toBe(ap.cores_max);
    expect(cores(ammoPack(c, 3, [], 9))).toBe(ap.cores_max * 3); expect(cores(ammoPack(c, 3, [], 0))).toBe(ap.cores * 3); // a Boss: 3 to 6
    const gun = clone(camp([{ build: 'plain_gun', level: 1 }])).characters.c1 as any;
    expect(cores(ammoPack(gun, 1, undefined, 5))).toBe(0);
  });
  it('the charge held and the cores burnt (charge before minus after, a core a core, rounded up)', () => {
    const c = sigil(), held = chargeHeld(c);
    expect(held).toBe(packOf(c).filter((x) => x.id === 'standard_core').reduce((t, x) => t + x.qty, 0) * CORE_CHARGE + (c.evoCharge ?? CORE_CHARGE));
    expect(coresBurnt(40, 40)).toBe(0); expect(coresBurnt(40, 39)).toBe(1); expect(coresBurnt(40, 25)).toBe(2); expect(coresBurnt(10, 30)).toBe(0);
  });
  it('MP: mp_share x n of max MP for a character carrying an Emanator or Attuner; none otherwise; Bandolier doubles it with the magazines and cores', () => {
    const o: any = clone(camp([{ build: 'outburst', level: 1 }])).characters.c1;
    expect(supplyMp(o, 1)).toBe(Math.round(SV.ammo_pack.mp_share * maxMp(o))); expect(supplyMp(o, 3)).toBe(Math.round(SV.ammo_pack.mp_share * 3 * maxMp(o)));
    expect(supplyMp(sigil(), 1)).toBe(0);
    o.relics = ['boon.bandolier']; expect(supplyMp(o, 1)).toBe(Math.round(SV.ammo_pack.mp_share * 2 * maxMp(o)));
    const s = sigil(); s.relics = ['boon.bandolier']; expect(cores(ammoPack(s, 1, [], 9))).toBe(SV.ammo_pack.cores_max * 2);
  });
  it('through the reducer: after a won fight the cores burnt come back, the MP share lands (never past the max), Flux is 0', () => {
    const pcs: Pc[] = [{ build: 'sigil', level: 1 }, { build: 'outburst', level: 1 }];
    const g0 = clone(apply(camp(pcs), { type: 'run/go' }, 'host')), r = g0.run!, n = r.nodes.find((x) => x.depth === 3)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
    n.kind = 'fight'; r.at = prev.id; r.state = 'map';
    let g = g0; for (let i = 0; i < 2 && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
    const sig = g.combat!.units.find((u) => u.charId === 'c1')!, out = g.combat!.units.find((u) => u.charId === 'c2')!;
    sig.mg!.charge = 1; sig.mg!.flux = 3; out.mg!.mp = 5; // two of its loaded core's charge... burnt: 10 - 1 = 9 charge, a core
    const before = cores(packOf(g.characters.c1));
    const done = apply(g, { type: 'run/skip' }, 'host');
    expect(cores(packOf(done.characters.c1)) - before).toBe(Math.max(SV.ammo_pack.cores, Math.min(SV.ammo_pack.cores_max, 1)));
    expect(done.story.magic!.c1.flux).toBe(0);
    expect(mpNow(done.characters.c2)).toBe(Math.min(maxMp(done.characters.c2), 5 + supplyMp(done.characters.c2, 1)));
    expect(done.run!.note!.ammo!.c2.some((x) => / MP$/.test(x))).toBe(true);
  });
  it('a Rest fills the loaded charge of every carried Evoker and Visualizer', () => {
    const g0 = clone(apply(camp([{ build: 'sigil', level: 1 }]), { type: 'run/go' }, 'host')), r = g0.run!, n = r.nodes.find((x) => x.depth === 2)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
    n.kind = 'rest'; r.at = prev.id; r.state = 'map'; g0.characters.c1.evoCharge = 2;
    const g = apply(g0, { type: 'run/move', node: n.id }, 'host');
    expect(g.characters.c1.evoCharge).toBe(CORE_CHARGE); expect(VIS_CHARGE).toBeGreaterThan(0);
  });
  it('magazines as before: n magazines\' worth for every gun carried', () => {
    const c: any = clone(camp([{ build: 'plain_gun', level: 1 }])).characters.c1;
    expect(ammoPack(c, 2, [c.weapon]).length).toBe(2 * magazineWorth(c.weapon).length);
  });
});

describe('rules 1.51: a seeded run through the camp replays to the same hash', () => {
  it('twice the same', () => {
    const pcs: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
    const play = () => { const r = new Rec(survivalRoom('PHC-C001', pcs, { test: true }), pcs); r.must({ type: 'run/start', seed: 'PHC-C001' }); for (let i = 0; i < 2; i++) r.must({ type: 'run/boon', charId: 'c' + (i + 1), choice: 0 }, ownerOf(i)); return r; };
    const a = play(), b = play();
    expect(a.g.run!.state).toBe('map'); expect(JSON.stringify(a.g.characters)).toBe(JSON.stringify(b.g.characters));
  });
});
