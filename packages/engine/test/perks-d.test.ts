// Lane D: Sigil, Soul, prayer and music perks and traits (src/perks/d.ts). Each item is shown working in play: through
// the reducer (apply) where an action exists, else with the game bound and the engine's own functions (drawGlyph,
// applyCond, healUnit, resolveAttack…), the same calls the reducer makes.
import { describe, expect, it } from 'vitest';
import {
  apply, emit, emitStory, applyCond, applyDamage, healUnit, grantShield, resolveAttack, previewOutburst, designCost, manaOf, passive, statQuery, skillRollMod,
  d20, die, PATRONS, memoryOf, musicOf, unitSave, condOn, togglesFor, PERK, perkActionsFor, perkInfoFor, type Unit, type Combat, type GameState,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

import { hymnWait, prayerCooldown, calls } from '../src';

/** A seed whose next d20 is n. */
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
function rngD6(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (die(r, 6) === n) return { state: s }; } throw new Error('no seed'); }
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
/** A fight with a Sigil student (Evoker, SPARK + SEEK, and CONDENSE) at C6 and one foe at G6, on its turn with 9 AP and a
 * fresh core. Rules 1.4: glyphs go on your own tile (draw() steps there first, for free). */
function sigilFight(perks: Record<string, string>, extra: any = {}) {
  const f = fightWith([{ archetype: 'sigilist', kit: 'sigil', perks, ...extra }], [{ at: 'G6' }]);
  open(f.cb); f.pc.pos = '2,5'; f.foe.pos = '6,5'; f.turn(f.pc); f.pc.ap = 9; f.pc.mg!.charge = 30;
  if (!f.pc.mg!.words.includes('condense')) f.pc.mg!.words.push('condense');
  return f;
}
/** A fight with a Soul initiate (Emanator, one Damage Outburst) at C6 and one foe at E6 (2 tiles away). */
function soulFight(perks: Record<string, string>, extra: any = {}, foes = [{ at: 'E6' }]) {
  const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', perks, ...extra }], foes as any);
  open(f.cb); f.pc.pos = '2,5'; f.foe.pos = '4,5'; f.foe.def = 1; f.turn(f.pc); f.pc.ap = 9; f.pc.mg!.mp = 500;
  return f;
}
const draw = (f: any, word: string, tile: string) => { f.pc.pos = tile; return f.act({ type: 'combat/draw', unitId: f.pc.id, word, tile }); };
const mine = (cb: Combat, u: Unit) => (cb.glyphs || []).filter((g) => g.by.split('#')[0] === u.id).length;
/** A STAY field of this caster's (rules 1.4: a placed spell is what "still active" means for Parallel Thought). */
const stay = (u: Unit) => ({ id: 'zt', kind: 'field' as const, tiles: ['9,9'], words: ['fire', 'stay'], by: u.id, side: 'pc' as const, left: 4, mult: 0.5, who: u.name });
const charOf = (g: GameState, u: Unit) => g.characters[u.charId!];

// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Hold the Stroke'

// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Parallel Thought'

// Heart Overload and Resonance were rewritten in rules 1.14 (a free Begin after a Release; your own Releases build on
// each other): their tests are in test/rules114-will-power.test.ts. What stays here is what 1.14 kept from before.
// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Heart Overload (rules 1.14)

describe('Resonance, the perk (rules 1.14): what the rewrite kept', () => {
  /** Two Soul PCs side by side; a releases on round r, b on round r + 1; returns b's release multiplier. */
  function twoRounds(perksA: Record<string, string>, perksB: Record<string, string>) {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', perks: perksA, name: 'A' }, { archetype: 'stormcaller', kit: 'soul', perks: perksB, name: 'B' }], [{ at: 'H6' }]);
    open(f.cb); const [a, b] = f.pcs; a.pos = '2,5'; b.pos = '2,6'; f.foe.pos = '5,5'; f.foe.hp = f.foe.maxHp = 9999; f.foe.def = -40; f.foe.marginsTaken = -99; /* rules 1.96: an unmissable fixture takes no Margins */
    for (const p of [a, b]) { const m = f.unit(p.id).mg!; m.mp = 999; m.strainLimit = 30; }
    const ua = f.turn(a); ua.ap = 9; f.act({ type: 'combat/outburst', unitId: ua.id, design: ua.mg!.designs[0].id, aim: '5,5' });
    f.cb.round += 1; // the next round
    const ub = f.turn(b); ub.ap = 9; f.act({ type: 'combat/outburst', unitId: ub.id, design: ub.mg!.designs[0].id, aim: '5,5' });
    return (f.cb.fx || []).filter((e: any) => e.k === 'release').at(-1)!.mult as number;
  }
  it('without the perk, a release last round gives nothing (the rule is one round)', () => { expect(twoRounds({}, {})).toBe(0.8); }); // rules 1.8: a snap is ×0.8
  it('the perk no longer widens the shared rule\'s window: an ally\'s release last round gives the rule\'s +0.2 to no one', () => {
    expect(twoRounds({}, { resonance: 'I' })).toBe(0.8); expect(twoRounds({ resonance: 'II' }, {})).toBe(0.8);
  });
  it('the 1.2 MP discount is gone', () => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', perks: { resonance: 'II' } }, { archetype: 'stormcaller', kit: 'soul', name: 'Ally' }], [{ at: 'H6' }]);
    open(f.cb); const [a, b] = f.pcs; a.pos = '2,5'; b.pos = '3,5';
    f.turn(b); f.act({ type: 'combat/outburst', unitId: b.id, design: f.unit(b.id).mg!.designs[0].id, hold: true });
    const u = f.turn(a); u.ap = 9; const d = u.mg!.designs[0], base = designCost(u.mg!, d, manaOf(f.cb)), mp = u.mg!.mp;
    f.act({ type: 'combat/outburst', unitId: u.id, design: d.id, hold: true });
    expect(mp - f.unit(a.id).mg!.mp).toBe(base);
  });
});

describe('Rite in the Field (rules 1.75 item 6206, as Leon worded it; its kill count and the free Crystallise: soul-lane-0.32.test.ts)', () => {
  it('with no kills it cuts nothing: Crystallise, a prayer, a WARD glyph and Steady cost what they cost without it; the old Perks-tab copy of Crystallise is gone', () => {
    const cost = (perks: Record<string, string>) => { const g = soulFight(perks); const a = g.pc.ap;
      g.act({ type: 'combat/crystallise', unitId: g.pc.id } as any); expect(logHas(g.cb, /crystallises/)).toBe(true); return a - g.pc.ap; };
    expect(cost({ rite_in_the_field: 'II' })).toBe(cost({}));
    const g = soulFight({ rite_in_the_field: 'II' }); expect(() => g.act({ type: 'combat/perk', unitId: g.pc.id, id: 'rite_in_the_field', actionId: 'crystallise' } as any)).toThrow();
    const other = (perks: Record<string, string>) => { const f = sigilFight(perks, { skills: { faith: 5 } });
      charOf(f.g, f.pc).patron = PATRONS[0].id; f.pc.mg!.words.push('ward');
      const ap = f.pc.ap; f.g.rng.state = rngFor(15).state; f.act({ type: 'combat/pray', unitId: f.pc.id, choice: PATRONS[0].blessings[0].id });
      const a2 = f.pc.ap; draw(f, 'ward', '3,5'); return [ap - a2, Math.round((a2 - f.pc.ap) * 10) / 10]; };
    expect(other({ rite_in_the_field: 'II' })).toEqual(other({}));
    const steady = (perks: Record<string, string>) => { const f = soulFight(perks); const d = f.pc.mg!.designs[0];
      f.act({ type: 'combat/outburst', unitId: f.pc.id, design: d.id, hold: true } as any); const a = f.pc.ap;
      f.act({ type: 'combat/steady', unitId: f.pc.id } as any); return a - f.pc.ap; };
    expect(steady({ rite_in_the_field: 'II' })).toBe(steady({}));
  });
  it('no Call is its any more (the Call ladder prices Name It: rules 1.70 item 5535)', () => {
    const callAp = (perks: Record<string, string>, id: string) => { const g = soulFight(perks, { skills: { lore_master: 3, vigilant: 3 } }); const a = g.pc.ap;
      g.act({ type: 'combat/call', unitId: g.pc.id, id, targetId: g.pc.id } as any); return a - g.pc.ap; };
    expect(callAp({ rite_in_the_field: 'II' }, 'call.name_it')).toBe(callAp({}, 'call.name_it'));
    for (const t of ['I', 'II']) for (const e of (PERK as any).rite_in_the_field.tiers[t].effects) expect(e.if?.action || [], t).not.toContain('call');
  });
});

describe('Clean Draw', () => {
  it('armed once a fight: the glyphs cost no charge or Flux and the Evoke of them none; then it is spent', () => {
    const f = sigilFight({ clean_draw: 'mastered' }), ch = f.pc.mg!.charge;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'clean_draw', actionId: 'arm' } as any);
    draw(f, 'spark', '4,5'); draw(f, 'condense', '3,5'); f.foe.pos = '5,5'; f.foe.hp = f.foe.maxHp = 999;
    expect(f.pc.mg!.charge).toBe(ch); expect(f.pc.mg!.flux).toBe(0);
    f.act({ type: 'combat/evoke', unitId: f.pc.id, tile: '3,5', aim: '5,5' });
    expect(f.pc.mg!.charge).toBe(ch);
    draw(f, 'spark', '3,5'); expect(f.pc.mg!.charge).toBeLessThan(ch);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'clean_draw', actionId: 'arm' } as any)).toThrow(/Used/);
  });
});

describe('The Twin Pays', () => {
  it('once a fight: no MP, no meter drop, no Strain; held, no Strain while it grows', () => {
    const f = soulFight({ the_twin_pays: 'mastered' }); f.foe.maxHp = f.foe.hp = 5000; const mp = f.pc.mg!.mp, mana = manaOf(f.cb);
    f.act({ type: 'combat/outburst', unitId: f.pc.id, design: f.pc.mg!.designs[0].id, hold: true, mods: ['twin'] } as any);
    expect(f.pc.mg!.mp).toBe(mp); expect(manaOf(f.cb)).toBe(mana); expect(f.pc.mg!.strain).toBe(0);
    withGame(f.g, () => emit(f.cb, 'turn_end', { u: f.pc, cb: f.cb, rng: f.g.rng }));
    const u = f.turn(f.pc); expect(u.mg!.held!.stage).toBe(1); expect(u.mg!.strain).toBe(0); // rules 1.5: Begin at stage 0, the swell to 1
    // A second cast this fight pays as usual.
    u.ap = 9; f.act({ type: 'combat/release', unitId: u.id, aim: f.foe.pos });
    const mp2 = f.pc.mg!.mp; f.pc.ap = 9; f.act({ type: 'combat/outburst', unitId: f.pc.id, design: f.pc.mg!.designs[0].id, hold: true, mods: ['twin'] } as any);
    expect(f.pc.mg!.mp).toBeLessThan(mp2);
  });
});

describe('Twin Souls', () => {
  it('story: once a session, ask the twin soul one question (a private pending ruling)', () => {
    const s = storyWith([{ perks: { twin_souls: 'achieved' } }]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'twin_souls', actionId: 'ask', text: 'Who wrote me?' } as any);
    expect(s.g.story.rulings!.some((r: any) => /twin soul/.test(r.text) && /Who wrote me/.test(r.text))).toBe(true);
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'twin_souls', actionId: 'ask', text: 'Again?' } as any)).toThrow(/Used/);
  });
  it('a third school: +20 MP, and it runs at release', () => {
    const f = soulFight({ twin_souls: 'achieved' }), d: any = f.pc.mg!.designs[0];
    const before = previewOutburst(f.cb, f.pc, d.id, f.foe.pos).cost;
    d.school3 = 'status'; d.option3 = 'shaken';
    const after = withGame(f.g, () => previewOutburst(f.cb, f.pc, d.id, f.foe.pos).cost);
    expect(after - before).toBeGreaterThanOrEqual(10);
    f.act({ type: 'combat/outburst', unitId: f.pc.id, design: d.id, aim: f.foe.pos });
    expect(logHas(f.cb, /third school \(status at half, Twin Souls\)/)).toBe(true);
  });
});

describe('Twin Discipline', () => {
  // Rules 1.4 (more in sigil14-perks.test.ts): a Line's Reach and Burst set who is covered, the Outburst what happens.
  it('a Fused Evoke: the Line sets who is hit, the held Outburst what happens; the glyphs fade and the hold is spent', () => {
    const f = soulFight({ twin_discipline: 'ultimate' }), m = f.pc.mg!;
    m.evoker = true; m.charge = 10; m.words = ['spark', 'seek']; m.maxWords = 3;
    f.act({ type: 'combat/outburst', unitId: f.pc.id, design: m.designs[0].id, hold: true });
    draw(f, 'spark', '3,4'); draw(f, 'seek', '2,4'); // walked west: the Line fires east, past SPARK
    const hp = f.foe.hp; f.foe.pos = '7,4'; f.g.rng.state = rngFor(15).state;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'twin_discipline', actionId: 'fused', tile: '2,4', choice: '7,4' } as any);
    expect(logHas(f.cb, /fuses/)).toBe(true); expect(logHas(f.cb, /SPARK hits/)).toBe(false);
    expect(f.foe.hp).toBeLessThan(hp); expect(f.pc.mg!.held).toBeNull(); expect(f.cb.glyphs!.length).toBe(0);
  });
});

describe('Verse of War', () => {
  it('Say a line, Begin "In verse": +1 tile of range and ×1.1 damage; the line goes to the Narrator to audit', () => {
    const f = soulFight({ verse_of_war: 'achieved' }), d = f.pc.mg!.designs[0], r = withGame(f.g, () => previewOutburst(f.cb, f.pc, d.id, f.pc.pos).range);
    f.foe.pos = (2 + r + 1) + ',5';
    expect(() => f.act({ type: 'combat/outburst', unitId: f.pc.id, design: d.id, aim: f.foe.pos, mods: ['verse'] } as any)).toThrow(/reach/);
    f.act({ type: 'combat/say', charId: f.pc.charId!, text: 'Burn, and remember the burning' } as any);
    f.g.rng.state = rngFor(15).state;
    f.act({ type: 'combat/outburst', unitId: f.pc.id, design: d.id, aim: f.foe.pos, mods: ['verse'] } as any);
    expect(f.cb.notes!.some((n) => /in verse: "Burn, and remember/.test(n))).toBe(true);
  });
  it('×1.1 on the Soul damage of a verse cast', () => {
    const f = soulFight({ verse_of_war: 'achieved' }); const u = f.pc;
    withGame(f.g, () => { const s: any = (u.ps ||= {})['perk:verse_of_war'] ||= {}; s.verseAt = f.cb.log.length; const hp = f.foe.hp; f.foe.maxHp = f.foe.hp = 500; applyDamage(f.cb, f.foe, 100, { by: u, type: 'soul' }); expect(500 - f.foe.hp).toBe(110); void hp; });
  });
});

describe('Fire Sermon', () => {
  it('Preach (2 AP), then a Blessing you are granted tries to leave enemies within 4 tiles Shaken', () => {
    const f = soulFight({ fire_sermon: 'achieved' }, { skills: { faith: 9, eloquence: 5 } });
    charOf(f.g, f.pc).patron = PATRONS[0].id; const ap = f.pc.ap;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'fire_sermon', actionId: 'preach' } as any);
    expect(ap - f.pc.ap).toBe(2);
    f.g.rng.state = rngFor(15).state;
    f.act({ type: 'combat/pray', unitId: f.pc.id, choice: PATRONS[0].blessings[0].id });
    expect(logHas(f.cb, /The sermon burns/)).toBe(true);
  });
  it('story: preaching is a pending ruling for the Narrator', () => {
    const s = storyWith([{ perks: { fire_sermon: 'achieved' } }]);
    s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'fire_sermon', actionId: 'preach_story', text: 'Repent!' } as any);
    expect(s.g.story.rulings!.some((r: any) => /Fire Sermon/.test(r.text))).toBe(true);
  });
});

// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Litany'

describe('Upper-Touched', () => {
  it('Outbursts cost 20% less; Seen From Above: no hiding while an upper-realm foe stands; Blessings on you roll a d6', () => {
    const f = soulFight({}, { traits: ['upper_touched'] }), d = f.pc.mg!.designs[0];
    const base = designCost(f.pc.mg!, d, manaOf(f.cb)), mp = f.pc.mg!.mp;
    f.act({ type: 'combat/outburst', unitId: f.pc.id, design: d.id, hold: true });
    expect(mp - f.pc.mg!.mp).toBe(Math.round(Math.max(5, base * 0.8)));
    f.foe.kind = 'upper_realm'; f.foe.vision = 1; f.foe.pos = '12,9'; f.pc.ap = 9;
    f.act({ type: 'combat/hide', unitId: f.pc.id } as any);
    expect(f.pc.hidden).toBe(false); expect(logHas(f.cb, /Seen From Above/)).toBe(true);
    const ctx = withGame(f.g, () => emit(f.cb, 'blessing_in', { u: f.pc, t: f.pc, blessing: PATRONS[0].blessings[0], power: 1, handled: false, out: '', cb: f.cb, rng: rngD6(1) }));
    expect(ctx.handled).toBe(true); expect(ctx.out).toMatch(/fails/);
  });
  it('story: an upper-realm NPC always notices your sneak', () => {
    const s = storyWith([{ traits: ['upper_touched'] }]);
    const out = emitStory(s.g, 'stay_hidden', { c: s.chars[0], npc: { kind: 'upper_realm' }, mod: 3, tn: 10, g: s.g });
    expect(out.auto).toBe('fail');
  });
});

describe('Sigil Savant', () => {
  it('story: choose the Muscle Memory word once', () => {
    const s = storyWith([{ archetype: 'sigilist', kit: 'sigil', traits: ['sigil_savant'] }]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'sigil_savant', actionId: 'muscle', choice: 'spark' } as any);
    expect(s.g.characters[c.id].state!.sigil_savant.word).toBe('spark');
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'sigil_savant', actionId: 'muscle', choice: 'condense' } as any)).toThrow();
  });
  it('the word draws for 0 charge and 1 AP less (floor 0.5); Rigid refuses an unpractised word', () => {
    const f = sigilFight({}, { traits: ['sigil_savant'] }); const c = charOf(f.g, f.pc);
    c.state = { sigil_savant: { word: 'spark', practised: ['condense'] } }; f.pc.mg!.words.push('fire');
    const ch = f.pc.mg!.charge, ap = f.pc.ap; draw(f, 'spark', '3,5');
    expect(f.pc.mg!.charge).toBe(ch); expect(Math.round((ap - f.pc.ap) * 10) / 10).toBe(Math.max(0.5, Math.round((f.pc.mg!.glyphAp - 1) * 10) / 10));
    draw(f, 'condense', '4,5');
    expect(() => draw(f, 'fire', '2,4')).toThrow(/practised/);
  });
});

describe('Hollow Heart', () => {
  it('a Mana Short leaves you Downed but stable: death saves never fail, hits add no failures', () => {
    // Rules 1.5: no roll; the heart's burn at the turn's end (8 a point over the limit) is what Downs you.
    const f = soulFight({}, { traits: ['hollow_heart'] }); f.pc.mg!.strain = f.pc.mg!.strainLimit + 2; f.pc.hp = 10;
    f.g.rng.state = rngFor(1).state;
    f.act({ type: 'combat/end-turn', unitId: f.pc.id });
    expect(f.pc.downed).toBe(true); expect(logHas(f.cb, /hollow and stable/)).toBe(true);
    withGame(f.g, () => applyDamage(f.cb, f.pc, 30, { by: f.foe, type: 'weapon' }));
    expect(f.pc.saves.fail).toBe(0);
    const u = f.turn(f.pc); expect(u.saves.fail).toBe(0); expect(u.downed).toBe(true);
  });
  it('+10% Soul damage you deal; Echo Chamber: you can\'t hide on a turn you cast', () => {
    const f = soulFight({}, { traits: ['hollow_heart'] }); f.foe.maxHp = f.foe.hp = 500;
    withGame(f.g, () => applyDamage(f.cb, f.foe, 100, { by: f.pc, type: 'soul' })); expect(f.foe.hp).toBe(390);
    f.foe.vision = 1; f.foe.pos = '12,9';
    f.act({ type: 'combat/outburst', unitId: f.pc.id, design: f.pc.mg!.designs[0].id, hold: true });
    f.act({ type: 'combat/hide', unitId: f.pc.id } as any);
    expect(f.pc.hidden).toBe(false); expect(logHas(f.cb, /Echo Chamber/)).toBe(true);
  });
});

describe('Heretic', () => {
  it('Stolen Fire: pray to any patron on Will Power, without Faith or a pact; Blessing Power runs on Will Power', () => {
    const f = soulFight({}, { traits: ['heretic'], skills: { will_power: 7, faith: 0 } }); const c = charOf(f.g, f.pc);
    expect(withGame(f.g, () => statQuery({ c }, 'blessing_power').add)).toBeCloseTo(0.7);
    f.g.rng.state = rngFor(15).state;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'heretic', actionId: 'stolen_fire', choice: PATRONS[0].id + ':' + PATRONS[0].blessings[0].id } as any);
    expect(logHas(f.cb, /prays to/)).toBe(true);
    const c2 = charOf(f.g, f.pc); expect(c2.patron ?? null).toBeNull(); expect(c2.skills.faith || 0).toBe(0);
  });
  it('Excommunicated: an ally\'s Blessing fails on 1-2; the Lumeri Church starts Hostile', () => {
    const f = fightWith([{ traits: ['heretic'] }, { name: 'Priest' }], [{ at: 'P11' }]); const [a, b] = f.pcs;
    const ctx = withGame(f.g, () => emit(f.cb, 'blessing_in', { u: b, t: a, blessing: PATRONS[0].blessings[0], power: 1, handled: false, out: '', cb: f.cb, rng: rngD6(2) }));
    expect(ctx.handled).toBe(true); expect(ctx.out).toMatch(/Excommunicated/);
    expect(memoryOf(f.g).factions.some((x: any) => x.name === 'Lumeri Church' && x.standing === -40)).toBe(true);
  });
});

describe('True Believer', () => {
  it('the prayer cooldown is a turn shorter; a story miracle once a session; missed rites cost Faith rolls', () => {
    const f = soulFight({}, { traits: ['true_believer'], skills: { faith: 3 } }); const c = charOf(f.g, f.pc);
    c.attrs.virtue = 3; // rules 1.24: the Stormcaller preset no longer holds Virtue 3 (its spare points left Virtue with Max MP)
    c.patron = PATRONS[0].id; f.g.rng.state = rngFor(15).state;
    f.act({ type: 'combat/pray', unitId: f.pc.id, choice: PATRONS[0].blessings[0].id });
    // rules 1.22: the wait itself is a round shorter (it was a round taken off the last Hymn's mark); never under 2
    expect(withGame(f.g, () => hymnWait(c, f.pc))).toBe(prayerCooldown(c) - 1); expect(prayerCooldown(c)).toBe(6);
    c.state = { rites_missed: 5 }; expect(skillRollMod({ c }, 'faith').add).toBe(-3);
    const s = storyWith([{ traits: ['true_believer'] }]);
    s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'true_believer', actionId: 'miracle', text: 'Let the door open' } as any);
    expect(s.g.story.rulings!.some((x: any) => /small miracle/.test(x.text))).toBe(true);
    expect(() => s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'true_believer', actionId: 'miracle', text: 'Again' } as any)).toThrow(/Used/);
  });
});

describe('Heaven\'s Faithful', () => {
  it('Treason: against upper-realm foes a failed Faith check costs 2 AP on the first turn; Communion once a scene', () => {
    const f = fightWith([{ traits: ['heavens_faithful'] }], [{ at: 'P11' }]); f.foe.kind = 'upper_realm';
    withGame(f.g, () => emit(f.cb, 'combat_start', { cb: f.cb, order: [...f.cb.order], rng: rngFor(1) }));
    expect(logHas(f.cb, /hesitates/)).toBe(true);
    expect(f.turn(f.pc).ap).toBe(4); expect(f.turn(f.pc).ap).toBe(6);
    const s = storyWith([{ traits: ['heavens_faithful'] }]);
    s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'heavens_faithful', actionId: 'communion', text: 'Is it watching?' } as any);
    expect(s.g.story.rulings!.some((x: any) => /riddles/.test(x.text))).toBe(true);
  });
});

describe('Music traits', () => {
  it('the song reaches voice passives and initiative (story), and in a fight Soul strikes and saves', () => {
    const s = storyWith([{ traits: ['the_soundscape_of_the_soul'] }]); const c = s.chars[0];
    musicOf(s.g).silent[c.id] = 0; const on = withGame(s.g, () => passive(c, 'empathy'));
    musicOf(s.g).silent[c.id] = 3; const off = withGame(s.g, () => passive(c, 'empathy'));
    expect(on - off).toBe(1);
    const f = soulFight({}, { traits: ['the_soundscape_of_the_soul'] }); const ch = charOf(f.g, f.pc);
    musicOf(f.g).silent[ch.id] = 0; const heart0 = unitSave(f.pc, 'heart'), will0 = f.pc.sk?.will_power || 0;
    f.turn(f.pc);
    expect(unitSave(f.pc, 'heart') - heart0).toBe(1); expect((f.pc.sk?.will_power || 0) - will0).toBe(1);
  });
  it('Underground Sound: Brain saves and Sigil strikes +1 while it plays; Headbanger: Body saves', () => {
    const f = sigilFight({}, { traits: ['underground_sound'] }); musicOf(f.g).silent[f.pc.charId!] = 0;
    const b0 = unitSave(f.pc, 'brain'); f.turn(f.pc); expect(unitSave(f.pc, 'brain') - b0).toBe(1); expect(f.pc.sk?.brain_power).toBe(1);
    const g = sigilFight({}, { traits: ['headbanger'] }); musicOf(g.g).silent[g.pc.charId!] = 5;
    const br = unitSave(g.pc, 'brain'); g.turn(g.pc); expect(unitSave(g.pc, 'brain') - br).toBe(-1);
  });
  it('a shield of 30 or more you give starts your song', () => {
    const f = soulFight({}, { traits: ['headbanger'] }); const c = charOf(f.g, f.pc);
    c.identity = { ...c.identity, song: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
    withGame(f.g, () => grantShield(f.cb, f.pc, 40, f.pc));
    expect(musicOf(f.g).now?.charId).toBe(c.id);
  });
});

// You Get Used to It is removed (rules 1.75 item 6203: mapped to Poker Face; its tests: soul-lane-0.32.test.ts).

// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Shared Breath'

// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Mirage', ()

describe('Mirage (sound) and Verse of War (release)', () => {
  it('Release in verse: in a fight the In verse chip on Release is its one button (no Perks-tab Confirm); +1 tile of range, the line to the Narrator', () => {
    const f = soulFight({ verse_of_war: 'achieved' }); f.foe.maxHp = f.foe.hp = 5000; const d = f.pc.mg!.designs[0];
    const r = withGame(f.g, () => previewOutburst(f.cb, f.pc, d.id, f.pc.pos).range);
    f.act({ type: 'combat/outburst', unitId: f.pc.id, design: d.id, hold: true });
    f.foe.pos = (2 + r + 1) + ',5';
    expect(() => f.act({ type: 'combat/release', unitId: f.pc.id, aim: f.foe.pos })).toThrow(/reach/);
    f.act({ type: 'combat/say', charId: f.pc.charId!, text: 'Here ends the line' } as any);
    const who = { u: f.pc, c: f.g.characters[f.pc.charId!], cb: f.cb, g: f.g };
    expect(withGame(f.g, () => perkActionsFor(who, 'combat')).map((e) => e.id)).not.toContain('perk:verse_of_war');
    expect(withGame(f.g, () => perkInfoFor(who, 'combat')).find((e) => e.id === 'perk:verse_of_war')).toMatchObject({ via: 'Used from Begin or Release' });
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'verse_of_war', actionId: 'release', tile: f.foe.pos } as any)).toThrow();
    f.act({ type: 'combat/release', unitId: f.pc.id, aim: f.foe.pos, mods: ['verse'] } as any);
    expect(f.pc.mg!.held).toBeNull(); expect(f.cb.notes!.some((n) => /Here ends the line/.test(n) && /verse/.test(n))).toBe(true);
  });
});

// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Solid Image'
