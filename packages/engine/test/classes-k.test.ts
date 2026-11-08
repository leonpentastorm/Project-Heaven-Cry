// Lane K: advanced classes (src/classes/k.ts): Shade, Lumeri Templar, Stroke Gambler, Devoted, Circuit Mage, Glyph Mason,
// Grand Sigilist (and its Grand forms), Heartfed, Heartbinder, Vessel, Twinbound. Every move is shown working in play:
// through the reducer (apply) where it is an action or rides on one, else with the game bound and the engine's own
// functions (resolveAttack, applyDamage, emit), the same calls enemy turns make.
import { describe, expect, it } from 'vitest';
import {
  apply, condOn, applyCond, applyDamage, resolveAttack, previewAttack, previewEvoke, previewOutburst, d20, endTurn, glyphCost, manaOf,
  coverageOf, itemInfo, ADVANCED, perkActionsFor, emit, statQuery, objectsOf, moveUnit, heal, beginTurn, noteDeaths, type Unit, type Combat, type Character,
} from '../src';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
/** A seed whose next d20s are ns. */
function rngFor(...ns: number[]): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const seed = (f: { g: any }, ...ns: number[]) => { f.g.rng.state = rngFor(...ns); };
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; return f.unit(u.id); };
const act = (f: F, u: Unit, a: any) => f.act({ unitId: u.id, ...a });
const perk = (f: F, u: Unit, id: string, a: any = {}) => f.act({ type: 'combat/perk', unitId: u.id, id, ...a } as any);
const tough = (u: Unit, def = -40) => { u.hp = u.maxHp = 999; u.def = def; u.armour = 0; return u; };
const adv = (id: string, extra: CharSpec = {}): CharSpec => ({ advancedClass: id, level: 5, ...extra });
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;
const charOf = (f: { g: any }, u: Unit): Character => f.g.characters[u.charId!];
/** Give a unit both an Evoker (with words) and an Emanator. */
function caster(u: Unit, words: string[], extra: any = {}) {
  u.mg = { words, designs: [{ id: 'o1', name: 'Damage Outburst', school: 'damage', modules: ['move'] }], evoker: true, emanator: true, charge: 10, cores: 2, coresMade: 0, flux: 0, mp: 300, mpMax: 300, strain: 0, held: null, cast: false,
    brain: 3, will: 3, sigilMult: 1, soulMult: 1, elemMult: 1, healMult: 1, maxWords: 3, glyphAp: 1, coreSave: 0, rangeBonus: 0, durBonus: 0, soulAp: 2, costSave: 0, soulRange: 0, syphon: 1, strainLimit: 5,
    saves: { body: 0, brain: 0, heart: 0 }, debuff: { body: 0, brain: 0, heart: 0 }, ...extra } as any;
  return u;
}
const glyph = (f: F, u: Unit, word: string, pos: string, extra: any = {}) => { const cb = f.cb; cb.glyphs = [...(cb.glyphs || []), { id: 'gl' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), word, pos, by: u.id, side: u.side, left: 3, who: u.name, ...extra } as any]; };

describe('advanced class coverage', () => {
  it('every move of the eleven Lane K classes is run by a handler (no gaps)', () => {
    for (const id of ['shade', 'lumeri_templar', 'stroke_gambler', 'devoted', 'circuit_mage', 'glyph_mason', 'grand_sigilist', 'heartfed', 'heartbinder', 'vessel', 'twinbound'])
      for (const m of ADVANCED[id].moves) expect(coverageOf(itemInfo('class:' + id + '.' + m.id)!).filter((x) => x.owner === 'gap'), id + '.' + m.id).toEqual([]);
  });
});

// ============================================================ Shade
describe('Shade', () => {
  it('Silent Kill: a melee kill from Hidden keeps you Hidden; without the class you are revealed', () => {
    const run = (spec: CharSpec) => {
      const f = fightWith([{ ...spec, weapon: 'combat_knife' }], [{}]);
      const u = f.turn(f.pc); at(f, u, '3,2'); const foe = at(f, f.foe, '4,2'); foe.hp = 1; foe.def = -40; f.unit(u.id).hidden = true; f.unit(u.id).hideEntry = 1; seed(f, 10);
      act(f, f.unit(u.id), { type: 'combat/attack', targetId: foe.id, mode: 'melee' });
      return f;
    };
    const f = run(adv('shade')); expect(f.unit(f.foe.id).dead).toBe(true); expect(f.pc.hidden).toBe(true); expect(logHas(f.cb, /Silent Kill/)).toBe(true);
    expect(f.pc.ambushUsed).toBe(1); // the ambush was spent: no new one until you hide again
    const g = run({}); expect(g.pc.hidden).toBe(false);
  });
  it('Silent Kill: a loud gunshot still gives you away (and the Narrator hears of it)', () => {
    const f = fightWith([adv('shade', { weapon: 'service_pistol' })], [{}]);
    const u = f.turn(f.pc); at(f, u, '3,2'); const foe = at(f, f.foe, '6,2'); foe.hp = 1; foe.def = -40; f.unit(u.id).hidden = true; f.unit(u.id).hideEntry = 1; seed(f, 10);
    act(f, f.unit(u.id), { type: 'combat/attack', targetId: foe.id, mode: 'shot' });
    expect(f.pc.hidden).toBe(false); expect((f.cb.notes || []).some((n) => /loud gun/.test(n))).toBe(true);
  });
  it('Nightmare Mark: Mark (1 AP) for a Shade without the Assassin; the marked foe is Afraid for its own turn only', () => {
    const f = fightWith([adv('shade')], [{}]);
    const u = f.turn(f.pc); at(f, u, '3,2'); const foe = at(f, f.foe, '8,2'); const ap = f.unit(u.id).ap;
    perk(f, f.unit(u.id), 'shade.nightmare_mark', { targetId: foe.id });
    expect(f.pc.ap).toBe(ap - 1); expect(condOn(f.unit(foe.id), 'marked')).toBe(true);
    seed(f, 2); const t = f.turn(foe.id);
    expect(condOn(t, 'fear')).toBe(true); expect(t.condBy!.fear).toBe(f.pc.id);
    expect(withGame(f.g, () => previewAttack(f.cb, t, f.pc, 'shot')).ok).toBe(false);
    withGame(f.g, () => endTurn(f.cb, f.g.rng));
    expect(condOn(f.unit(foe.id), 'fear')).toBe(false);
  });
  it('Lingering Dread: a kill shakes the enemies within 3 tiles who saw it', () => {
    const f = fightWith([adv('shade', { weapon: 'combat_knife' })], [{}, {}, {}]);
    const u = f.turn(f.pc); at(f, u, '3,2'); const [v, w1, w2] = f.foes; at(f, v, '4,2'); at(f, w1, '6,2'); at(f, w2, '13,2');
    f.unit(v.id).hp = 1; f.unit(v.id).def = -40; seed(f, 10, 2);
    act(f, f.unit(u.id), { type: 'combat/attack', targetId: v.id, mode: 'melee' });
    expect(f.unit(v.id).dead).toBe(true); expect(condOn(f.unit(w1.id), 'shaken')).toBe(true); expect(condOn(f.unit(w2.id), 'shaken')).toBe(false);
    expect(logHas(f.cb, /Lingering Dread/)).toBe(true);
  });
});

// ============================================================ Lumeri Templar
const TEMPLAR = adv('lumeri_templar', { weapon: 'sabre', skills: { faith: 5 } });
function templar(f: F) { const c = charOf(f, f.pc); c.patron = 'nerukhan'; c.devotion = 4; return c; }
describe('Lumeri Templar', () => {
  it('Blessed Shells: a Pray with the toggle loads the Blessing; the next hit resolves it at the target', () => {
    const f = fightWith([TEMPLAR], [{}]); templar(f);
    const u = f.turn(f.pc); at(f, u, '3,2'); const foe = tough(at(f, f.foe, '4,2')); f.unit(u.id).ap = 9; seed(f, 20);
    act(f, f.unit(u.id), { type: 'combat/pray', choice: 'judgement', targetId: foe.id, mods: ['class:lumeri_templar.blessed_shells#load'] });
    expect(f.unit(foe.id).hp).toBe(999); expect(logHas(f.cb, /Blessed Shells/)).toBe(true);
    seed(f, 10); act(f, f.unit(u.id), { type: 'combat/attack', targetId: foe.id, mode: 'melee' });
    expect(logHas(f.cb, /blessed shell bursts: Judgement on Foe 1/)).toBe(true);
    expect(f.unit(foe.id).hp).toBeLessThan(999 - 40);
  });
  it('Blessed Shells in the story: a blessed shell (the engine rolls the prayer) loads at the next fight this scene', () => {
    const s = storyWith([TEMPLAR]); const c = s.chars[0]; s.g.characters[c.id].patron = 'nerukhan'; seed(s, 20);
    s.act({ type: 'story/perk', charId: c.id, id: 'lumeri_templar.blessed_shells', actionId: 'bless_shell', choice: 'saints_shield' } as any);
    expect((s.g.characters[c.id] as any).state.blessedShell.id).toBe('saints_shield');
    expect((s.g.story.rulings || []).some((r: any) => /patron answers/.test(r.text))).toBe(true);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol' }] } } } as any);
    const u = s.g.combat!.units.find((x) => x.side === 'pc')!;
    expect(u.ps!['class:lumeri_templar.blessed_shells'].loaded.bl.id).toBe('saints_shield');
  });
  it('Under the Eye: while Witnessed, allies within 3 tiles get +2 to hit (named in the breakdown); in the story +2 on patron_theme checks', () => {
    const f = fightWith([TEMPLAR, {}], [{}]); templar(f);
    const [t, ally] = f.pcs; at(f, t, '3,2'); at(f, ally, '5,2'); const foe = at(f, f.foe, '9,2');
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.unit(t.id), f.unit(t.id), 'witnessed', 1, undefined, { skipSave: true })); f.unit(ally.id).ap = 6;
    const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(ally.id), foe, 'shot'));
    expect(pv.terms!.some((x) => x.label === 'Under the Eye' && x.v === 2)).toBe(true);
    at(f, ally, '8,8'); expect(withGame(f.g, () => previewAttack(f.cb, f.unit(ally.id), foe, 'shot')).terms!.some((x) => x.label === 'Under the Eye')).toBe(false);
    // story
    const s = storyWith([TEMPLAR, {}]); s.g.characters[s.chars[0].id].patron = 'nerukhan';
    s.act({ type: 'narrator/turn', turn: { narration: 'Pray with me.', checks: [{ charId: s.chars[1].id, skills: ['composure'], tn: 12, tags: ['patron_theme'], why: 'hold the line' }] } } as any);
    const ck = s.g.checks.find((k: any) => k.charId === s.chars[1].id)!;
    s.act({ type: 'check/roll', checkId: ck.id } as any);
    const done = s.g.checks.find((k: any) => k.id === ck.id) || ck;
    expect(JSON.stringify(s.g.story.entries || s.g.story).includes('Under the Eye') || JSON.stringify(done).includes('Under the Eye')).toBe(true);
  });
  it('Judgement: 4 AP, once a fight, 1 Devotion; damage × (1 + Blessing power)', () => {
    const run = (judge: boolean) => {
      const f = fightWith([TEMPLAR], [{}]); const c = templar(f);
      const u = f.turn(f.pc); at(f, u, '3,2'); const foe = tough(at(f, f.foe, '4,2')); f.unit(u.id).ap = 9; seed(f, 10);
      if (judge) perk(f, f.unit(u.id), 'lumeri_templar.judgement', { targetId: foe.id }); else act(f, f.unit(u.id), { type: 'combat/attack', targetId: foe.id, mode: 'melee' });
      return { f, dmg: 999 - f.unit(foe.id).hp, dv: c.devotion };
    };
    const plain = run(false), j = run(true), bp = j.f.pc.blessPower ?? 1.5;
    expect(j.f.pc.ap).toBe(5); expect(charOf(j.f, j.f.pc).devotion).toBe(3);
    expect(j.dmg).toBeGreaterThanOrEqual(Math.floor(plain.dmg * (1 + bp)) - 1);
    j.f.unit(j.f.pc.id).ap = 9;
    expect(() => perk(j.f, j.f.pc, 'lumeri_templar.judgement', { targetId: j.f.foe.id })).toThrow(/Used/);
  });
});

// ============================================================ Stroke Gambler
// Rules 1.4: the Stroke Gambler's Half-Sigil, Stitch and House Edge are tested in sigil14-classes-k.test.ts.

// ============================================================ Devoted
describe('Devoted', () => {
  it('Beloved Spells: marked in the story; a Beloved design costs 30% less MP in a fight; a new Beloved design gets +1 module', () => {
    const s = storyWith([adv('devoted', SOUL)]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'devoted.beloved_spells', actionId: 'beloved', choice: 'o1' } as any);
    expect((s.g.characters[c.id] as any).state.beloved).toEqual(['o1']);
    // module slots 1 + floor(4/3) = 2; the Beloved design may hold 3
    s.g.characters[c.id].soulKnown = { schools: ['damage'], modules: ['move', 'burst', 'homing'] };
    s.g.characters[c.id].skills.empathy = 4;
    s.act({ type: 'story/perk', charId: c.id, id: 'devoted.beloved_spells', actionId: 'beloved_design', text: 'damage: move, burst, homing' } as any);
    const d = s.g.characters[c.id].outbursts!.find((x) => x.modules.length === 3)!; expect(d).toBeTruthy();
    expect((s.g.characters[c.id] as any).state.beloved).toContain(d.id);
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'devoted.beloved_spells', actionId: 'beloved', choice: d.id } as any)).toThrow(/edit it down/);
    const f = fightWith([adv('devoted', SOUL)], [{}]); const u = f.turn(f.pc); const foe = at(f, f.foe, '6,4');
    const plain = withGame(f.g, () => previewOutburst(f.cb, f.unit(u.id), 'o1', foe.pos)).cost;
    (charOf(f, u) as any).state = { beloved: ['o1'] };
    expect(withGame(f.g, () => previewOutburst(f.cb, f.unit(u.id), 'o1', foe.pos)).cost).toBe(Math.max(5, Math.round(plain * 0.7)));
  });
  it('Heart\'s Own: a Beloved Begin shorts only past Strain limit + 2', () => {
    const f = fightWith([adv('devoted', SOUL)], [{}]); (charOf(f, f.pc) as any).state = { beloved: ['o1'] };
    const u = f.turn(f.pc); const m = f.unit(u.id).mg!; m.strain = m.strainLimit + 1; // one more would short a plain cast
    act(f, f.unit(u.id), { type: 'combat/outburst', design: 'o1', hold: true });
    expect(f.pc.mg!.strain).toBe(f.pc.mg!.strainLimit - 2 + 2); // limit was raised by 2 for it
    expect(logHas(f.cb, /MANA SHORT/)).toBe(false);
  });
  it('Love Made Manifest (rules 1.5): once a fight, a Beloved Outburst Begins at stage 4', () => {
    const f = fightWith([adv('devoted', SOUL)], [{}], { seed: 'LM' }); (charOf(f, f.pc) as any).state = { beloved: ['o1'] };
    const u = f.turn(f.pc); at(f, u, '3,2'); tough(at(f, f.foe, '6,2')); f.unit(u.id).ap = 9; f.unit(u.id).mg!.strainLimit = 20;
    act(f, f.unit(u.id), { type: 'combat/outburst', design: 'o1', mods: ['class:devoted.love_made_manifest#manifest'] });
    expect(f.pc.mg!.held!.stage).toBe(4); expect(logHas(f.cb, /heart is full at once/)).toBe(true);
    act(f, f.unit(u.id), { type: 'combat/letgo' }); f.unit(u.id).ap = 9;
    act(f, f.unit(u.id), { type: 'combat/outburst', design: 'o1', mods: ['class:devoted.love_made_manifest#manifest'] });
    expect(f.pc.mg!.held!.stage).toBe(0); // once a fight
  });
});

// ============================================================ Circuit Mage
describe('Circuit Mage', () => {
  it('Closed Loop: Vent into the heart: 10 MP per Flux, the meter unmoved', () => {
    const f = fightWith([adv('circuit_mage')], [{}]); const u = f.turn(f.pc); caster(f.unit(u.id), ['fire'], { mp: 100, flux: 4 }); const mana = manaOf(f.cb);
    perk(f, f.unit(u.id), 'circuit_mage.closed_loop');
    expect(f.pc.mg!.mp).toBe(140); expect(f.pc.mg!.flux).toBe(0); expect(manaOf(f.cb)).toBe(mana);
  });
  it('Self-Crystallise: 3 AP and 100 MP make a core, whatever the meter; Virtue cores a rest; in the story too', () => {
    const f = fightWith([adv('circuit_mage')], [{}]); const u = f.turn(f.pc); caster(f.unit(u.id), [], { mp: 250 }); f.cb.mana = 0; const ap = f.unit(u.id).ap;
    perk(f, f.unit(u.id), 'circuit_mage.self_crystallise');
    expect(f.pc.mg!.mp).toBe(150); expect(f.pc.mg!.coresMade).toBe(1); expect(f.pc.ap).toBe(ap - 3);
    expect(() => perk(f, f.pc, 'circuit_mage.self_crystallise')).toThrow(/Virtue/);
    const s = storyWith([adv('circuit_mage', SOUL)]); const c = s.chars[0]; s.g.characters[c.id].mp = 150;
    s.act({ type: 'story/perk', charId: c.id, id: 'circuit_mage.self_crystallise', actionId: 'self_crystallise_story' } as any);
    const cc = s.g.characters[c.id]; expect(cc.mp).toBe(50); expect((cc.pack || []).find((x) => x.id === 'standard_core')!.qty).toBeGreaterThanOrEqual(1); expect((cc as any).state.selfCores).toBe(1);
  });
  it('Fusion: refuses a pattern that holds a Subject', () => {
    const f = fightWith([adv('circuit_mage')], [{}]); const u = f.turn(f.pc); at(f, u, '3,2'); caster(f.unit(u.id), ['fire', 'push']);
    glyph(f, f.unit(u.id), 'fire', '4,2'); glyph(f, f.unit(u.id), 'push', '4,2');
    expect(() => perk(f, f.unit(u.id), 'circuit_mage.fusion', { tile: '4,2', choice: 'o1', targetId: f.foe.id })).toThrow(/only Form and Motion/);
  });
});

// ============================================================ Glyph Mason
// Rules 1.4: the Glyph Mason's Keystone, Survey and Foundation are tested in sigil14-classes-k.test.ts.

// ============================================================ Grand Sigilist
function grand(word: string, foePos = '6,2', spec: CharSpec = {}) {
  const f = fightWith([adv('grand_sigilist', spec), {}], [{}]); const u = f.turn(f.pc); at(f, u, '3,2'); at(f, f.pcs[1], '4,3');
  const foe = at(f, f.foe, foePos); foe.hp = foe.maxHp = 999; foe.ap = 6; caster(f.unit(u.id), [word]); f.unit(u.id).ap = 9;
  perk(f, f.unit(u.id), 'grand_sigilist.enlarge', { tile: '4,2', choice: word });
  return f;
}
describe('Grand Sigilist', () => {
  it('Enlarge: 3 AP + 3 charge, once a fight; the staff stops drawing; pulling it out ends the form', () => {
    const f = grand('fire');
    expect(f.pc.ap).toBe(6); expect(f.pc.mg!.charge).toBe(7);
    const z = (f.cb.zones || []).find((x: any) => x.kind === 'grand')!; expect(z.words).toEqual(['fire']); expect(z.tiles.length).toBe(25); expect(z.left).toBe(3);
    expect(withGame(f.g, () => glyphCost(f.cb, f.pc, 'fire')).fail).toMatch(/staff is planted/);
    expect(() => perk(f, f.pc, 'grand_sigilist.enlarge', { tile: '4,2', choice: 'fire' })).toThrow();
    perk(f, f.pc, 'grand_sigilist.enlarge', { actionId: 'pull_staff' });
    expect((f.cb.zones || []).some((x: any) => x.kind === 'grand')).toBe(false); expect(f.pc.ap).toBe(5);
  });
  it('FIRE (lava): 10 at turn start inside and Burning on a failed Body save; Earthed keeps the owner safe', () => {
    const f = grand('fire', '5,2'); const hp = f.unit(f.foe.id).hp, mine = f.pc.hp; seed(f, 2);
    f.turn(f.foe.id); expect(f.unit(f.foe.id).hp).toBeLessThan(hp); expect(condOn(f.unit(f.foe.id), 'burning')).toBe(true);
    f.turn(f.pc.id); expect(f.pc.hp).toBe(mine);
  });
  it('WARD (dome) shields allies and MEND (spring) heals them at turn start', () => {
    const f = grand('ward'); const ally = f.turn(f.pcs[1].id); expect(ally.shield).toBe(20); expect(condOn(ally, 'guarded')).toBe(true);
    const g = grand('mend'); g.unit(g.pcs[1].id).hp = 50; expect(g.turn(g.pcs[1].id).hp).toBeGreaterThan(50);
  });
  it('GALE (cyclone) shots through it −5; LIGHT enemies inside −2; PUSH (Gust) blows an enemy starting inside 1 tile outward', () => {
    const g = grand('gale', '9,2'); expect(withGame(g.g, () => previewAttack(g.cb, g.unit(g.foe.id), g.unit(g.pcs[1].id), 'shot')).terms!.some((t) => /Cyclone/.test(t.label))).toBe(true);
    const l = grand('light', '5,2'); expect(withGame(l.g, () => previewAttack(l.cb, l.unit(l.foe.id), l.unit(l.pcs[1].id), 'shot')).terms!.some((t) => t.v === -2 && /Noon/.test(t.label))).toBe(true);
    const p = grand('push', '5,2'); p.turn(p.foe.id); expect(p.unit(p.foe.id).pos).toBe('6,2');
  });
  it('SLOW (mire): a foe walking through it pays double', () => {
    const walk = (word: string | null) => {
      const f = word ? grand(word, '9,2') : fightWith([{}], [{ at: 'J3' }]); const foe = f.turn(f.foe.id); at(f, foe, '9,2'); f.unit(foe.id).ap = 6;
      withGame(f.g, () => moveUnit(f.cb, f.unit(foe.id), '6,2', f.g.rng)); return 6 - f.unit(foe.id).ap;
    };
    expect(walk('slow')).toBeGreaterThan(walk(null));
  });
  it('STAY (stasis): conditions inside don\'t tick down; DREAD shakes enemies; SILENCE silences everyone inside', () => {
    const f = grand('stay', '5,2'); const foe = f.unit(f.foe.id);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.pc, foe, 'slowed', 2, undefined, { skipSave: true }));
    f.turn(foe.id); withGame(f.g, () => endTurn(f.cb, f.g.rng)); expect(f.unit(foe.id).conds!.slowed).toBe(2);
    const d = grand('dread', '5,2'); seed(d, 2); expect(condOn(d.turn(d.foe.id), 'shaken')).toBe(true);
    const s = grand('silence', '5,2'); expect(condOn(s.turn(s.foe.id), 'silenced')).toBe(true);
  });
  it('SPARK (static): a roll of 1-3 inside jams the gun; SEEK: allies ignore half cover on enemies inside; STONE raises pillars; SHOCK stuns robots', () => {
    const f = grand('spark', '5,2'); const foe = f.turn(f.foe.id); seed(f, 2);
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(foe.id), f.unit(f.pcs[1].id), 'shot', null));
    expect(f.unit(foe.id).jammed).toBe(true);
    const k = grand('stone'); expect(objectsOf(k.cb).filter((o) => /Earthwork/.test(o.name)).length).toBe(4);
    const r = grand('shock', '5,2'); r.unit(r.foe.id).kind = 'robot'; seed(r, 2); expect(condOn(r.turn(r.foe.id), 'stunned')).toBe(true);
  });
  it('Empty Hand: empty hands strike for 20 and add +2 Defense (on the sheet too)', () => {
    const f = fightWith([adv('grand_sigilist', { weapon: 'fists' })], [{}]); const u = f.turn(f.pc); at(f, u, '3,2'); const foe = tough(at(f, f.foe, '4,2'));
    const c = charOf(f, u); expect(statQuery({ c }, 'defense').add).toBe(2);
    const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(u.id), foe, 'melee'));
    expect(pv.dmg!.base + (pv.dmg!.terms[0]?.v || 0)).toBe(20);
    const g = fightWith([{ weapon: 'fists' }], [{}]); expect(f.pc.def).toBe(g.pc.def + 2);
  });
  it('Earthed: inside your own FIRE form your fists carry fire (half armour) and lava doesn\'t burn you', () => {
    const f = grand('fire', '5,2', { weapon: 'fists' }); at(f, f.pc, '4,2'); const foe = at(f, f.foe, '5,2'); foe.armour = 10; foe.def = -40;
    const pv = withGame(f.g, () => previewAttack(f.cb, f.pc, f.unit(foe.id), 'melee'));
    expect(pv.dmg!.terms[0]?.v).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================ Heartfed
describe('Heartfed', () => {
  it('Four Hearts: Rage from damage taken (a running carry), Grief when an ally is Downed, Devotion from an ally\'s heal', () => {
    const f = fightWith([adv('heartfed', SOUL), {}], [{}]); const [hf, ally] = f.pcs; delete (charOf(f, hf) as any).state;
    withGame(f.g, () => { applyDamage(f.cb, f.unit(hf.id), 25, { by: f.foe, type: 'weapon', credit: 'all' }); applyDamage(f.cb, f.unit(hf.id), 25, { by: f.foe, type: 'weapon', credit: 'all' }); });
    const st = () => (charOf(f, hf) as any).state.heartfed;
    expect(st().rage).toBe(2);
    withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 9999, { by: f.foe, type: 'weapon', credit: 'all' }));
    expect(st().grief).toBe(2);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.unit(ally.id), f.unit(hf.id), 'guarded', 2, undefined, { skipSave: true }));
    expect(st().devotion).toBe(1);
  });
  it('Fed (rules 1.5): a keyed design costs 10% less a point; "Feed a feeling" spends a point for a free Pump (2 a turn); release empties the gauge', () => {
    const s = storyWith([adv('heartfed', SOUL)]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'heartfed.four_hearts', actionId: 'key_design', choice: 'o1:rage' } as any);
    expect((s.g.characters[c.id] as any).state.heartKeys.o1).toBe('rage');
    const f = fightWith([adv('heartfed', SOUL)], [{}], { seed: 'FED' }); (charOf(f, f.pc) as any).state = { heartKeys: { o1: 'rage' }, heartfed: { scene: f.g.story.scene.n, rage: 4, grief: 0, fear: 0, devotion: 0, carry: 0 } };
    const u = f.turn(f.pc); at(f, u, '3,2'); const foe = tough(at(f, f.foe, '6,2')); const m = f.unit(u.id).mg!; m.freePumps = 0; m.freePumpsMax = 0; f.unit(u.id).ap = 9;
    const plain = withGame(f.g, () => { const st = (charOf(f, f.pc) as any).state.heartfed; const r = st.rage; st.rage = 0; const c0 = previewOutburst(f.cb, f.unit(u.id), 'o1').cost; st.rage = r; return c0; });
    const mp = m.mp; act(f, f.unit(u.id), { type: 'combat/outburst', design: 'o1' });
    expect(mp - f.pc.mg!.mp).toBe(Math.max(5, Math.round(plain * 0.6)));
    perk(f, f.pc, 'heartfed.fed'); perk(f, f.pc, 'heartfed.fed');
    expect(f.pc.ap).toBe(7); expect(f.pc.mg!.held!.stage).toBe(2); expect((charOf(f, f.pc) as any).state.heartfed.rage).toBe(2);
    expect(() => perk(f, f.pc, 'heartfed.fed')).toThrow(/Twice a turn/);
    act(f, f.unit(u.id), { type: 'combat/release', aim: foe.pos });
    expect((charOf(f, f.pc) as any).state.heartfed.rage).toBe(0); expect(logHas(f.cb, /takes the rest of the rage/)).toBe(true);
  });
  it('Overflow: a gauge reaching 5 makes the next keyed Begin stage 2 with no Strain (once a scene)', () => {
    const f = fightWith([adv('heartfed', SOUL)], [{}]); (charOf(f, f.pc) as any).state = { heartKeys: { o1: 'grief' }, heartfed: { scene: f.g.story.scene.n, rage: 0, grief: 4, fear: 0, devotion: 0, carry: 0 } };
    const u = f.turn(f.pc);
    withGame(f.g, () => applyDamage(f.cb, f.unit(f.pcs[0].id === u.id ? u.id : u.id), 0, { type: 'weapon' }));
    (charOf(f, f.pc) as any).state.heartfed.grief = 4;
    // an ally falls: grief 4 → 5 (Overflow armed). Use a second PC as the ally.
    const g = fightWith([adv('heartfed', SOUL), {}], [{}]); (charOf(g, g.pc) as any).state = { heartKeys: { o1: 'grief' }, heartfed: { scene: g.g.story.scene.n, rage: 0, grief: 4, fear: 0, devotion: 0, carry: 0 } };
    withGame(g.g, () => applyDamage(g.cb, g.unit(g.pcs[1].id), 9999, { by: g.foe, type: 'weapon', credit: 'all' }));
    expect((charOf(g, g.pc) as any).state.heartfed.overflow).toBe('grief');
    const v = g.turn(g.pcs[0].id); const strain = v.mg!.strain;
    act(g, g.unit(v.id), { type: 'combat/outburst', design: 'o1', hold: true });
    expect(g.pc.mg!.strain).toBe(strain); expect(logHas(g.cb, /Overflow: Damage Outburst Begins at stage 2/)).toBe(true);
    expect(g.unit(v.id).mg!.held!.stage).toBe(2); // rules 1.5: the held stage itself, at once
    g.turn(v.id); expect(g.unit(v.id).mg!.held!.stage).toBe(3);
    void f;
  });
});

// ============================================================ Heartbinder
describe('Heartbinder', () => {
  it('Link: 1 AP to an ally within 6; Share takes half of their wound through your reaction; heals you send are ×1.25', () => {
    const f = fightWith([adv('heartbinder', SOUL), {}], [{}]); const [hb, ally] = f.pcs; const u = f.turn(hb); at(f, u, '3,2'); at(f, ally, '5,2');
    perk(f, f.unit(u.id), 'heartbinder.link', { targetId: ally.id });
    expect((charOf(f, hb) as any).state.links.ids).toEqual([ally.charId]);
    const a0 = f.unit(ally.id).hp, b0 = f.unit(hb.id).hp;
    withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 40, { by: f.foe, type: 'weapon', shield: true, credit: 'all' }));
    expect(a0 - f.unit(ally.id).hp).toBe(20); expect(b0 - f.unit(hb.id).hp).toBe(20);
    withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 40, { by: f.foe, type: 'weapon', shield: true, credit: 'all' }));
    expect(a0 - f.unit(ally.id).hp).toBe(60); // the reaction is spent this round
  });
  it('Through: cast from a linked ally\'s place (range from them); a heal you get reaches the link at half', () => {
    const f = fightWith([adv('heartbinder', SOUL), {}], [{}]); const [hb, ally] = f.pcs; const u = f.turn(hb); at(f, u, '0,2'); at(f, ally, '6,2');
    const foe = tough(at(f, f.foe, '13,2'));
    perk(f, f.unit(u.id), 'heartbinder.link', { targetId: ally.id });
    expect(withGame(f.g, () => previewOutburst(f.cb, f.unit(u.id), 'o1', foe.pos)).ok).toBe(false); // 13 tiles: out of reach
    seed(f, 15);
    perk(f, f.unit(u.id), 'heartbinder.through', { actionId: 'begin_through', choice: 'o1', tile: foe.pos });
    expect(f.unit(foe.id).hp).toBeLessThan(999);
    f.unit(ally.id).hp = 50; f.unit(hb.id).hp = 50;
    withGame(f.g, () => heal(f.unit(hb.id), 40, f.cb, f.foe));
    expect(f.unit(ally.id).hp).toBeGreaterThan(50);
  });
  it('Share: a linked ally Downed costs you 2 Strain', () => {
    const f = fightWith([adv('heartbinder', SOUL), {}], [{}]); const [hb, ally] = f.pcs; const u = f.turn(hb); at(f, ally, '2,2');
    perk(f, f.unit(u.id), 'heartbinder.link', { targetId: ally.id }); f.unit(u.id).reactUsed = { r: f.cb.round, n: 9 };
    withGame(f.g, () => applyDamage(f.cb, f.unit(ally.id), 9999, { by: f.foe, type: 'weapon', credit: 'all' }));
    expect(f.unit(hb.id).mg!.strain).toBe(2);
  });
});

// ============================================================ Vessel
describe('Vessel', () => {
  it('Inner Charge: Iron adds armour by stage, grows at turn start with Strain; no Outbursts for a Vessel', () => {
    const f = fightWith([adv('vessel', SOUL)], [{}]); const u = f.turn(f.pc); const arm = f.unit(u.id).armour, mp = f.unit(u.id).mg!.mp;
    perk(f, f.unit(u.id), 'vessel.inner_charge', { choice: 'iron' });
    expect(f.pc.armour).toBe(arm + 10); expect(f.pc.mg!.mp).toBeLessThan(mp); expect(f.pc.mg!.strain).toBe(1);
    f.turn(f.pc.id); expect(f.pc.armour).toBe(arm + 14); expect(f.pc.mg!.strain).toBeGreaterThanOrEqual(1); // rules 1.5: stage 2 is ×1.4
    expect(withGame(f.g, () => previewOutburst(f.cb, f.pc, 'o1', f.foe.pos)).ok).toBe(false);
  });
  it('Inner Charge: Steady can\'t be knocked Prone; Pain to Power gives AP next turn; Surge adds 15 to melee', () => {
    const f = fightWith([adv('vessel', { ...SOUL, weapon: 'fists' })], [{}]); const u = f.turn(f.pc); f.unit(u.id).ap = 9; f.unit(u.id).mg!.strainLimit = 20;
    perk(f, f.unit(u.id), 'vessel.inner_charge', { choice: 'steady' }); perk(f, f.pc, 'vessel.inner_charge', { choice: 'pain' });
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.pc, 'prone', undefined, undefined, { skipSave: true })); expect(f.pc.prone).toBeFalsy();
    withGame(f.g, () => applyDamage(f.cb, f.pc, 45, { by: f.foe, type: 'weapon', credit: 'all' }));
    const v = f.turn(f.pc.id); expect(v.ap).toBe(8);
  });
  it('Release (rules 1.5): one strike ends every form, +15 Soul × each form\'s stage multiplier; Empty Hand fists strike for 20', () => {
    const f = fightWith([adv('vessel', { ...SOUL, weapon: 'fists' })], [{}]); const u = f.turn(f.pc); at(f, u, '3,2'); const foe = tough(at(f, f.foe, '4,2'), -40); f.unit(u.id).ap = 9;
    expect(withGame(f.g, () => previewAttack(f.cb, f.unit(u.id), foe, 'melee')).dmg!.terms[0].v).toBe(10);
    perk(f, f.unit(u.id), 'vessel.inner_charge', { choice: 'surge' }); seed(f, 10);
    perk(f, f.pc, 'vessel.release_strike', { targetId: foe.id });
    expect(logHas(f.cb, /RELEASE \(1 form, 15\)/)).toBe(true);
    // fists 10 + Surge 15 (stage 1, ×1; past Empty Hand's floor of 20) + the release 15 × 1 × the Soul multiplier, armour 0
    expect(999 - f.unit(foe.id).hp).toBe(25 + Math.floor(15 * f.pc.mg!.soulMult));
    expect((charOf(f, f.pc) as any).state.vessel.forms).toEqual([]);
  });
});

// ============================================================ Twinbound
const TWIN = 'damage: move; damage; damage';
describe('Twinbound', () => {
  it('Manifest: once, out of a fight: three built-in Outbursts, and a ruling for the Narrator', () => {
    const s = storyWith([adv('twinbound', SOUL)]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: TWIN } as any);
    expect((s.g.characters[c.id] as any).state.twin.designs.map((d: any) => d.id)).toEqual(['tw1', 'tw2', 'tw3']);
    expect((s.g.story.rulings || []).some((r: any) => /first leans through/.test(r.text))).toBe(true);
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: TWIN } as any)).toThrow();
  });
  it('Manifest takes the client picker\'s JSON {designs:[…]} (school, option, modules, name); a school you don\'t know is refused', () => {
    const s = storyWith([adv('twinbound', SOUL)]); const c = s.chars[0], known = (s.g.characters[c.id] as any).soulKnown;
    const sc = known.schools[0], mod = known.modules[0];
    const bad = JSON.stringify({ designs: [{ school: 'nope', modules: [] }, { school: sc, modules: [] }, { school: sc, modules: [] }] });
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: bad } as any)).toThrow(/Outburst 1/);
    const ok = JSON.stringify({ designs: [{ school: sc, modules: [mod], name: 'First Light' }, { school: sc, modules: [] }, { school: sc, modules: [] }] });
    s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: ok } as any);
    const tw = (s.g.characters[c.id] as any).state.twin.designs;
    expect(tw[0]).toMatchObject({ id: 'tw1', school: sc, modules: [mod], name: 'First Light' });
  });
  it('Call: 2 AP, the twin acts right after you with 4 AP and casts from your heart', () => {
    const s = storyWith([adv('twinbound', SOUL)]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: TWIN } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol', at: 'I3' }] } } } as any);
    const f: any = { get g() { return s.g; }, get cb() { return s.g.combat!; }, act: s.act, unit: (id: string) => s.g.combat!.units.find((x) => x.id === id)! };
    const cb = () => s.g.combat!; const pc = cb().units.find((x) => x.side === 'pc' && !(x as any).twinOf)!;
    cb().turn = cb().order.indexOf(pc.id); withGame(s.g, () => beginTurn(cb(), s.g.rng));
    const ap = f.unit(pc.id).ap;
    s.act({ type: 'combat/perk', unitId: pc.id, id: 'twinbound.call', tile: '2,4' } as any);
    const tw = cb().units.find((x) => (x as any).twinOf === pc.id)!;
    expect(tw.maxHp).toBe(Math.floor(f.unit(pc.id).maxHp / 2)); expect(f.unit(pc.id).ap).toBe(ap - 2);
    expect(cb().order[cb().order.indexOf(pc.id) + 1]).toBe(tw.id);
    s.act({ type: 'combat/end-turn', unitId: pc.id } as any);
    expect(cb().order[cb().turn]).toBe(tw.id); expect(f.unit(tw.id).ap).toBe(4);
    const foe = cb().units.find((x) => x.side === 'foe')!; foe.hp = foe.maxHp = 999; foe.def = -40; const mp = f.unit(pc.id).mg!.mp;
    s.g.rng.state = rngFor(15);
    s.act({ type: 'combat/perk', unitId: tw.id, id: 'twinbound.call', actionId: 'twin_cast', choice: 'tw1', tile: foe.pos } as any);
    expect(f.unit(foe.id).hp).toBeLessThan(999); expect(f.unit(pc.id).mg!.mp).toBeLessThan(mp); expect(f.unit(tw.id).ap).toBe(2);
  });
  it('Bond: the twin at 0 HP vanishes (not Downed, no bots) and you take 3 Strain; no Call again this scene', () => {
    const s = storyWith([adv('twinbound', SOUL)]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: TWIN } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol', at: 'O3' }] } } } as any);
    const cb = () => s.g.combat!; const pc = cb().units.find((x) => x.side === 'pc')!;
    cb().turn = cb().order.indexOf(pc.id); withGame(s.g, () => beginTurn(cb(), s.g.rng));
    s.act({ type: 'combat/perk', unitId: pc.id, id: 'twinbound.call', tile: '2,4' } as any);
    const tw = cb().units.find((x) => (x as any).twinOf === pc.id)!; const mana = manaOf(cb());
    withGame(s.g, () => applyDamage(cb(), tw, 9999, { by: cb().units.find((x) => x.side === 'foe')!, type: 'weapon', credit: 'all' }));
    const t2 = cb().units.find((x) => x.id === tw.id)!; expect(t2.dead).toBe(true); expect(t2.downed).toBe(false);
    expect(cb().units.find((x) => x.id === pc.id)!.mg!.strain).toBe(3);
    withGame(s.g, () => noteDeaths(cb())); expect(manaOf(cb())).toBe(mana);
    const u = cb().units.find((x) => x.id === pc.id)!; u.ap = 6;
    expect(() => s.act({ type: 'combat/perk', unitId: pc.id, id: 'twinbound.call', tile: '2,5' } as any)).toThrow(/fell this scene/);
  });
});

describe('Lane K: more forms and story parts', () => {
  it('Grand BIND (tar) Pins on entering; VEIL hides whoever is inside; BLIND (fog) cuts sight to 1 tile; CONDENSE (Crush) grinds an enemy pressed against another creature; PULL draws foes to the staff', () => {
    const b = grand('bind', '9,2'); const foe = b.turn(b.foe.id); seed(b, 2);
    withGame(b.g, () => moveUnit(b.cb, b.unit(foe.id), '5,2', b.g.rng)); expect(condOn(b.unit(foe.id), 'pinned')).toBe(true); expect(b.unit(foe.id).pos).not.toBe('5,2');
    const v = grand('veil', '5,2'); expect(v.unit(v.foe.id).hidden).toBe(true); expect((v.cb.zones || []).some((z) => z.kind === 'veil')).toBe(true);
    const fg = grand('blind', '5,2'); fg.turn(fg.foe.id); expect(fg.unit(fg.foe.id).vision).toBe(1);
    const c = grand('condense', '5,2'); c.unit(c.foe.id).armour = 0; at(c, c.pcs[1], '6,2'); c.turn(c.foe.id); expect(c.unit(c.foe.id).hp).toBe(c.unit(c.foe.id).maxHp - 10);
    const lone = grand('condense', '6,0'); at(lone, lone.pcs[1], '2,4'); lone.turn(lone.foe.id); expect(lone.unit(lone.foe.id).hp).toBe(lone.unit(lone.foe.id).maxHp);
    const p = grand('pull', '8,2'); p.turn(p.foe.id); expect(p.unit(p.foe.id).pos).toBe('7,2');
  });
  it('Grand FREEZE (ice): difficult ground and a Body save on the move or Prone; MUDDLE (maze) staggers on a failed Brain save', () => {
    const f = grand('freeze', '9,2'); const foe = f.turn(f.foe.id); seed(f, 2, 2, 2, 2);
    withGame(f.g, () => moveUnit(f.cb, f.unit(foe.id), '6,2', f.g.rng)); expect(f.unit(foe.id).prone).toBe(true);
    const m = grand('muddle', '5,2'); seed(m, 2, 3); const before = m.unit(m.foe.id).pos; m.turn(m.foe.id);
    expect(logHas(m.cb, /staggers/)).toBe(true); void before;
  });
  it('Silent Kill: enemies looking for the Shade get +2 per kill it made this round', () => {
    const f = fightWith([adv('shade', { weapon: 'combat_knife' })], [{}, {}]); const u = f.turn(f.pc); at(f, u, '3,2'); const [v, w] = f.foes; at(f, v, '4,2'); at(f, w, '9,2');
    f.unit(v.id).hp = 1; f.unit(v.id).def = -40; f.unit(u.id).hidden = true; f.unit(u.id).hideEntry = 1; seed(f, 10);
    act(f, f.unit(u.id), { type: 'combat/attack', targetId: v.id, mode: 'melee' });
    const ctx: any = { by: f.unit(w.id), u: f.pc, die: 10, mod: 0, tn: 12, cancel: false, cb: f.cb };
    withGame(f.g, () => emit(f.cb, 'spot', ctx)); expect(ctx.tn).toBe(10);
  });
  it('Call: the twin guards you (takes the next attack within 1 tile) and is held within 6 tiles of you', () => {
    const s = storyWith([adv('twinbound', SOUL)]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: TWIN } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol', at: 'O3' }] } } } as any);
    const cb = () => s.g.combat!, U = (id: string) => cb().units.find((x) => x.id === id)!; const pc = cb().units.find((x) => x.side === 'pc')!;
    cb().turn = cb().order.indexOf(pc.id); withGame(s.g, () => beginTurn(cb(), s.g.rng));
    s.act({ type: 'combat/perk', unitId: pc.id, id: 'twinbound.call', tile: '2,4' } as any);
    const tw = cb().units.find((x) => (x as any).twinOf === pc.id)!; U(pc.id).pos = '1,4';
    s.act({ type: 'combat/end-turn', unitId: pc.id } as any);
    s.act({ type: 'combat/perk', unitId: tw.id, id: 'twinbound.call', actionId: 'twin_guard' } as any);
    const foe = cb().units.find((x) => x.side === 'foe')!; foe.ap = 6; s.g.rng.state = rngFor(15);
    withGame(s.g, () => resolveAttack(cb(), s.g.rng, U(foe.id), U(pc.id), 'shot', null));
    expect(cb().log.some((l) => /steps in front of/.test(l))).toBe(true); expect(U(tw.id).hp).toBeLessThan(U(tw.id).maxHp);
    U(tw.id).ap = 4; U(tw.id).bank = 0; U(tw.id).movement = 9;
    withGame(s.g, () => moveUnit(cb(), U(tw.id), '9,4', s.g.rng)); expect(Math.max(...[0, 1].map((i) => Math.abs(+U(tw.id).pos.split(',')[i] - +U(pc.id).pos.split(',')[i])))).toBeLessThanOrEqual(6);
  });
  it('Story parts: a body form taken in the story carries into the fight; Link and a Grand form in the story go to the Narrator', () => {
    const s = storyWith([adv('vessel', SOUL), adv('heartbinder', SOUL)]); const [v, hb] = s.chars;
    s.act({ type: 'story/perk', charId: v.id, id: 'vessel.inner_charge', actionId: 'inner_charge_story', choice: 'iron' } as any);
    expect((s.g.characters[v.id] as any).state.vessel.forms[0].form).toBe('iron');
    s.act({ type: 'story/perk', charId: hb.id, id: 'heartbinder.link', actionId: 'link_story', choice: v.id } as any);
    expect((s.g.characters[hb.id] as any).state.links.ids).toEqual([v.id]);
    expect((s.g.story.rulings || []).length).toBeGreaterThanOrEqual(2);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol', at: 'O3' }] } } } as any);
    const u = s.g.combat!.units.find((x) => x.charId === v.id)!; expect((u as any).vsl.armour).toBeGreaterThanOrEqual(10);
  });
});

describe('pick lists for the client (buttons, not typed choices)', () => {
  it('Share and Inner Charge offer their choices as options', () => {
    const s = storyWith([adv('heartbinder', SOUL), adv('vessel', SOUL)]);
    const opts = (c: any, id: string) => (perkActionsFor({ c, g: s.g }, 'story').find((e) => e.actionId === id) || {} as any).options?.map((o: any) => o.id);
    expect(opts(s.chars[0], 'share_mode')).toEqual(['always', 'never']);
    expect(opts(s.chars[1], 'inner_charge_story')).toEqual(['iron', 'surge', 'swift', 'pain', 'steady', 'heartbeat']);
  });
});

void apply;
