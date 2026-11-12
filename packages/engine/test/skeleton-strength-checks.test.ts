// Skeleton 2.0 (rules 1.13), Stage 1 c and d.
// (c) Debuff strength by source: how hard a condition is to save against is the modifier of the skill that delivered
//     it (points − 1, floor 0), never a save family's gamma. An enemy keeps its tier whatever the source.
// (d) Gamma skills add their full points to a CHECK (the Narrator's checks, Ask, passives, world approaches); attacks,
//     saves, Initiative and the TNs a gamma sets keep points − 1. A story save rolls its family's save skill.
import { describe, expect, it } from 'vitest';
import {
  SKILL, SKILLS, mod, checkMod, checkModOf, strengthOf, strengthTable, passive, passiveVigilance, saveBonus, initiativeBonus, SAVE_SKILL_OF,
  applyCond, endCond, condOn, condTurnEnd, unitStrength, strengthFor, withVia, STRICT_VIA, previewOdds, d20, type Unit, type Combat,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';
import { physFight } from './helpers/physfight';

type F = ReturnType<typeof fightWith>;
type S = ReturnType<typeof storyWith>;
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const SK = { raw_power: 5, dexterity: 3, brain_power: 2, will_power: 7, faith: 4, ingenuity: 6, empathy: 0, intimidation: 6, eloquence: 2, charisma: 4, implication: 0, authority: 3 };
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
function fight(skills: Record<string, number> = SK, foes: any[] = [{}]) {
  const f = fightWith([{ skills }], foes.map((x, i) => ({ at: 'E6', ...x, name: 'Foe ' + (i + 1) })));
  open(f.cb); f.pc.pos = '2,5'; f.foes.forEach((u, i) => { u.pos = (4 + i) + ',5'; });
  f.turn(f.pc); f.pc.ap = 9;
  return f;
}
/** The TN a save was rolled against, from applyCond's line ("... save 14 vs 16"). */
const tnOf = (line: string) => +(line.match(/vs (\d+)/)?.[1] ?? NaN);
const cond = (f: F, id: string, fam: any, opts: any, by: Unit | null = f.pc, t: Unit = f.foe) => withGame(f.g, () => applyCond(f.cb, rngFor(10), by, t, id, undefined, fam, opts));

describe('debuff strength by source (rules 1.13)', () => {
  it('strengthOf: the delivering skill\'s points − 1, floor 0; a gamma that sets a TN never counts full points', () => {
    const f = fight(); const c = f.g.characters[f.pc.charId!];
    expect(strengthOf(c, 'raw_power')).toBe(4);
    expect(strengthOf(c, 'empathy')).toBe(0); // 0 points is −2: floored
    expect(strengthOf(c, 'intimidation')).toBe(5); // a gamma: still points − 1 (ruling 1)
    expect(checkMod(c, 'intimidation')).toBe(6); // …while its check counts all 6
    const t = strengthTable(c);
    expect(t.raw_power).toBe(4); expect(t.will_power).toBe(6); expect('empathy' in t).toBe(false);
  });
  it('a unit carries its strengths by skill; a skill it has nothing in reads 0', () => {
    const f = fight();
    expect(f.pc.dbf).toMatchObject({ raw_power: 4, dexterity: 2, brain_power: 1, will_power: 6, faith: 3, ingenuity: 5, intimidation: 5, eloquence: 1, charisma: 3, authority: 2 });
    expect(unitStrength(f.pc, 'raw_power')).toBe(4);
    expect(unitStrength(f.pc, 'empathy')).toBe(0);
    expect(unitStrength(null, 'raw_power')).toBe(0);
  });
  it('an enemy has no sheet: its tier sets the number whatever the source', () => {
    const f = fight(SK, [{ tier: 'minion' }, { tier: 'soldier' }, { tier: 'elite' }, { tier: 'boss' }]);
    for (const via of ['raw_power', 'brain_power', 'intimidation', undefined]) expect(f.foes.map((u) => unitStrength(u, via))).toEqual([0, 1, 2, 2]);
  });
  it('the save\'s TN is 12 + the strength of the skill named, whatever the save family', () => {
    const f = fight();
    expect(tnOf(cond(f, 'pinned', 'body', { via: 'raw_power' }))).toBe(16);
    expect(tnOf(cond(f, 'pinned', 'body', { via: 'dexterity' }))).toBe(14);
    expect(tnOf(cond(f, 'shaken', 'heart', { via: 'will_power' }))).toBe(18);
    expect(tnOf(cond(f, 'shaken', 'heart', { via: 'faith' }))).toBe(15);
    expect(tnOf(cond(f, 'shaken', 'heart', { via: 'empathy' }))).toBe(12);
    expect(tnOf(cond(f, 'shaken', 'heart', { via: 'will_power', tnAdd: 2 }))).toBe(20); // tnAdd still stacks
    expect(tnOf(cond(f, 'prone', undefined, { via: 'raw_power' }))).toBe(NaN); // Prone has no save
    expect(tnOf(cond(f, 'dazed', undefined, { via: 'raw_power' }))).toBe(16); // a flag condition reads it too
  });
  it('with no source named a PC\'s condition has no strength (and STRICT_VIA makes that loud)', () => {
    const f = fight();
    expect(tnOf(cond(f, 'pinned', 'body', {}))).toBe(12);
    STRICT_VIA.on = true;
    try { expect(() => cond(f, 'pinned', 'body', {})).toThrow(/names no source skill/); } finally { STRICT_VIA.on = false; }
  });
  it('withVia: one call\'s source for everything that unit applies inside it, and not for anyone else', () => {
    const f = fight();
    withVia(f.pc, 'will_power', () => {
      expect(tnOf(cond(f, 'pinned', 'body', {}))).toBe(18);
      expect(tnOf(cond(f, 'pinned', 'body', { via: 'dexterity' }))).toBe(14); // a named source wins
      expect(tnOf(cond(f, 'pinned', 'body', {}, f.foe, f.pc))).toBe(13); // the foe's own (a soldier), not the PC's
      withVia(f.pc, 'raw_power', () => expect(tnOf(cond(f, 'pinned', 'body', {}))).toBe(16)); // nested: the inner source
      expect(tnOf(cond(f, 'pinned', 'body', {}))).toBe(18);
    });
    expect(strengthFor(f.pc, null)).toBe(0); // nothing leaks out
  });
  it('a strength fixed earlier (a zone, residue, a stored spell) is used as it is, whatever the caster is now', () => {
    const f = fight();
    expect(tnOf(cond(f, 'pinned', 'body', { via: 'brain_power', str: 7 }))).toBe(19);
    withVia(f.pc, 'brain_power', () => {
      expect(tnOf(cond(f, 'pinned', 'body', {}))).toBe(15);
      withVia(f.pc, 'brain_power', () => expect(tnOf(cond(f, 'pinned', 'body', {}))).toBe(15)); // the same source inside keeps it
    }, 3);
    withVia(null, 'brain_power', () => expect(tnOf(cond(f, 'pinned', 'body', {}, null))).toBe(17), 5); // the caster is gone
  });
  it('the source is stored beside condBy and goes when the condition ends', () => {
    const f = fight(); f.foe.sv = { body: -40, brain: -40, heart: -40 };
    cond(f, 'shaken', 'heart', { via: 'intimidation' });
    expect(f.foe.condBy?.shaken).toBe(f.pc.id); expect(f.foe.condVia?.shaken).toBe('intimidation');
    endCond(f.foe, 'shaken', f.cb);
    expect(f.foe.condVia?.shaken).toBeUndefined();
  });
  it('Corroded\'s end-of-turn save reads the stored source, with the caster down too', () => {
    const f = fight(); f.foe.sv = { body: -40, brain: -40, heart: -40 };
    cond(f, 'corroded', 'body', { via: 'ingenuity' });
    expect(condOn(f.foe, 'corroded')).toBe(true); expect(f.foe.condVia?.corroded).toBe('ingenuity');
    f.foe.sv = { body: 0, brain: 0, heart: 0 }; f.foe.condFresh = [];
    f.pc.downed = true; f.pc.dead = true; // the caster is dead: the number is still its Ingenuity strength (5)
    // d20 16 + 0 = 16 against 12 + 5 = 17: it stays
    withGame(f.g, () => condTurnEnd(f.cb, f.foe, rngFor(16)));
    expect(condOn(f.foe, 'corroded')).toBe(true);
    f.foe.condFresh = [];
    withGame(f.g, () => condTurnEnd(f.cb, f.foe, rngFor(17)));
    expect(condOn(f.foe, 'corroded')).toBe(false);
    expect(f.cb.log.some((l) => /scrubs off the acid \(body save d20 \d+ [+−]\d+ = 17 vs 17/.test(l))).toBe(true);
  });
  describe('talking in a fight: the gamma that spoke', () => {
    const say = (f: F, kind: string) => { f.g.rng = rngFor(2); f.act({ type: 'combat/parley', unitId: f.pc.id, targetId: f.foe.id, kind, text: '' } as any); return f.cb.log.at(-1)!; };
    it('Threaten: Shaken on a HEART save against 12 + Intimidation strength', () => {
      const f = fight(); f.foe.sv = { body: 40, brain: 40, heart: 0 }; // a Body save would shrug it off
      const line = say(f, 'threaten');
      expect(line).toMatch(/heart save d20 [^)]* vs 17/); expect(condOn(f.foe, 'shaken')).toBe(true);
      expect(f.foe.condVia?.shaken).toBe('intimidation');
    });
    it('Persuade: a Brain save against 12 + Eloquence strength', () => {
      const f = fight(); f.foe.sv = { body: 40, brain: 0, heart: 40 };
      expect(say(f, 'persuade')).toMatch(/brain save d20 [^)]* vs 13/); expect(condOn(f.foe, 'ldebuff')).toBe(true);
    });
    it('the offer of terms: a Heart save against 12 + Charisma strength', () => {
      const f = fight(); f.foe.hp = 1; f.foe.sv = { body: 40, brain: 40, heart: 0 };
      expect(say(f, 'parley')).toMatch(/heart save d20 2 \+0 = 2 vs 15/);
    });
  });
  it('a foe\'s spoken or thrown condition is its tier, as before', () => {
    const f = fight(SK, [{ tier: 'elite' }]); f.pc.sv = { body: 0, brain: 0, heart: 0 };
    expect(tnOf(cond(f, 'shaken', 'heart', { via: 'intimidation' }, f.foe, f.pc))).toBe(14);
    expect(tnOf(cond(f, 'pinned', 'body', {}, f.foe, f.pc))).toBe(14);
  });
});

describe('gamma skills add their full points to checks (rules 1.13)', () => {
  it('checkMod: full points for a gamma, points − 1 for the rest, −2 at 0 either way; the slot comes from the data', () => {
    for (const s of SKILLS) {
      expect(checkModOf(s.id, 0)).toBe(-2);
      for (const p of [1, 3, 10]) expect(checkModOf(s.id, p)).toBe(SKILL[s.id].slot === 'gamma' ? p : p - 1);
    }
    expect(SKILLS.filter((s) => s.slot === 'gamma').length).toBe(9);
    // Composure is the beta and Lore Master the gamma since the slot swap: read, never listed
    expect(checkModOf('composure', 4)).toBe(SKILL.composure.slot === 'gamma' ? 4 : 3);
    expect(checkModOf('lore_master', 4)).toBe(SKILL.lore_master.slot === 'gamma' ? 4 : 3);
    expect(mod(4)).toBe(3); // mod() itself is untouched
  });
  it('passive is 10 + the check modifier; passive Vigilance follows the same rule', () => {
    const s = storyWith([{ skills: { vigilant: 4, analysis: 4, charisma: 0 } }]); const c = s.chars[0];
    expect(passive(c, 'vigilant')).toBe(14); expect(passive(c, 'analysis')).toBe(13); expect(passive(c, 'charisma')).toBe(8);
    expect(passiveVigilance(4)).toBe(14); expect(passiveVigilance(0)).toBe(8); expect(passiveVigilance(1)).toBe(11);
  });
  it('saves, Initiative and debuff strength never take the gamma point', () => {
    const s = storyWith([{ skills: { reaction_speed: 3, guts: 3, rumination: 3, composure: 3, intimidation: 3 }, attrs: { agility: 3 } }]); const c = s.chars[0];
    expect(initiativeBonus(c)).toBe(2 + 2); // (Agility − 1) + (Reaction Speed − 1)
    for (const fam of ['body', 'brain', 'heart'] as const) { expect(SKILL[SAVE_SKILL_OF[fam]].slot).not.toBe('gamma'); expect(saveBonus(c, fam)).toBe(2); }
    expect(strengthOf(c, 'intimidation')).toBe(2);
  });
  const check = (s: S, charId: string, skills: string[], extra: any = {}) => {
    s.act({ type: 'narrator/turn', turn: { narration: 'Try it.', checks: [{ charId, skills, tn: 12, stakes: 'It works.', ...extra }] } } as any);
    const id = s.g.checks.at(-1)!.id; s.g.rng = rngFor(10); s.act({ type: 'check/roll', checkId: id });
    return s.g.checks.find((k) => k.id === id)!;
  };
  it('a Narrator check: a gamma rolls its points, another skill points − 1', () => {
    const s = storyWith([{ skills: { charisma: 4, brain_power: 4, eloquence: 0 } }]); const c = s.chars[0];
    expect(check(s, c.id, ['charisma']).roll!.mod).toBe(4);
    expect(check(s, c.id, ['brain_power']).roll!.mod).toBe(3);
    expect(check(s, c.id, ['eloquence']).roll!.mod).toBe(-2);
  });
  it('a combined check: full points go on each gamma first, then the lowest is taken (+2 a trained partner)', () => {
    const s = storyWith([{ skills: { charisma: 3, intimidation: 5, brain_power: 3, guts: 4 } }]); const c = s.chars[0];
    expect(check(s, c.id, ['charisma', 'intimidation']).roll!.mod).toBe(3 + 2); // two gammas: 3 and 5
    expect(check(s, c.id, ['charisma', 'brain_power']).roll!.mod).toBe(2 + 2); // gamma 3 against alpha 3 − 1: the alpha is lowest
    expect(check(s, c.id, ['charisma', 'guts']).roll!.mod).toBe(3 + 2); // gamma 3 against beta 4 − 1: a tie at 3
  });
  it('Ask rolls the check modifier', () => {
    const s = storyWith([{ skills: { charisma: 4, brain_power: 4 } }]); const c = s.chars[0];
    const ask = (skill: string) => { s.g.rng = rngFor(10); s.act({ type: 'voice/ask', charId: c.id, skill } as any); return s.g.story.entries.filter((e) => e.kind === 'voice').at(-1)!.head!; };
    expect(ask('charisma')).toMatch(/d20 10 \+4 = 14/);
    expect(ask('brain_power')).toMatch(/d20 10 \+3 = 13/);
  });
  it('a world approach previews what the roll will use', () => {
    const s = storyWith([{ skills: { charisma: 4, brain_power: 4, vigilant: 2, sensory: 5 } }]); const c = s.chars[0];
    expect(withGame(s.g, () => previewOdds(s.g, c, ['charisma'], 12)).mod).toBe(4);
    expect(withGame(s.g, () => previewOdds(s.g, c, ['brain_power'], 12)).mod).toBe(3);
    expect(withGame(s.g, () => previewOdds(s.g, c, ['vigilant', 'sensory'], 12, 'best'))).toMatchObject({ skills: ['sensory'], mod: 5 });
  });
  it('a story save rolls its family\'s save skill on the plain modifier, whatever the Narrator listed', () => {
    const s = storyWith([{ skills: { lore_master: 6, composure: 3, rumination: 5, charisma: 8, guts: 2, intimidation: 7 } }]); const c = s.chars[0];
    const heart = check(s, c.id, ['lore_master'], { kind: 'save', family: 'heart' });
    expect(heart.skills).toEqual(['composure']); expect(heart.roll!.mod).toBe(2);
    const brain = check(s, c.id, ['charisma', 'eloquence'], { kind: 'save', family: 'brain' });
    expect(brain.skills).toEqual(['rumination']); expect(brain.roll!.mod).toBe(4);
    const body = check(s, c.id, ['intimidation'], { kind: 'save', family: 'body' });
    expect(body.skills).toEqual(['guts']); expect(body.roll!.mod).toBe(1);
    // a save with no family keeps the listed skill, but it is still a save: no gamma point
    expect(check(s, c.id, ['intimidation'], { kind: 'save' }).roll!.mod).toBe(6);
    // and a save with no usable skill listed still happens when the family is named
    expect(check(s, c.id, [], { kind: 'save', family: 'body' }).skills).toEqual(['guts']);
  });
});

// Rules 1.13 (owner's ruling): every save a weapon technique forces is 12 + the user's strength with the skill that
// weapon hits with (+ the technique's own step). The preview's `saves` entry is the TN the roll uses.
describe('a technique\'s save reads the user\'s strength with the weapon\'s skill (rules 1.13)', () => {
  const duel = (weapon: string, known: string[], skills: Record<string, number>, foe: Record<string, any> = {}) => {
    const f = physFight([{ weapon, known, skills }], [{ at: 'D5', tier: 'soldier', ...foe }]);
    f.put(f.pc, 'C5'); f.put(f.foe, 'D5'); f.foe.sv = { body: 0, brain: 0, heart: 0 }; f.turn(f.pc);
    return f;
  };
  const tn = (f: ReturnType<typeof duel>, id: string, args: any = {}, by?: Unit) => f.pv(id, { targetId: (by ? f.pc : f.foe).id, ...args }, by).saves![0].tn;
  it('Bash with a maul (Raw Power): half the strength, rounded up (Raw Power 8: +4, Raw Power 2: +1, Raw Power 10: +5), and the roll uses the previewed TN', () => {
    const strong = duel('maul', ['bash'], { raw_power: 8 }), weak = duel('maul', ['bash'], { raw_power: 2 });
    expect(tn(weak, 'bash')).toBe(12 + 1); expect(tn(strong, 'bash')).toBe(12 + 4);
    expect(tn(strong, 'bash') - tn(weak, 'bash')).toBe(Math.ceil(unitStrength(strong.pc, 'raw_power') / 2) - Math.ceil(unitStrength(weak.pc, 'raw_power') / 2));
    expect(tn(duel('maul', ['bash'], { raw_power: 10 }), 'bash')).toBe(17); expect(tn(duel('maul', ['bash'], { raw_power: 6 }), 'bash')).toBe(15);
    Object.assign(strong.unit(strong.foe.id), { hp: 999, maxHp: 999, injResist: 100 });
    for (let i = 0; i < 12 && !strong.cb.log.some((l) => /the save against Bash/.test(l)); i++) { strong.pc.ap = 9; strong.momentum(strong.pc, 3); strong.tech('bash', { targetId: strong.foe.id }); } // a Strike spends 1 Momentum
    expect(tnOf(strong.cb.log.find((l) => /the save against Bash/.test(l))!)).toBe(16);
  });
  it('Stopping Shot with a pistol reads Dexterity, not Raw Power', () => {
    const f = duel('service_pistol', ['stopping_shot'], { dexterity: 4, raw_power: 8 }); f.put(f.foe, 'H5'); f.press(f.foe, 2, f.pc);
    expect(tn(f, 'stopping_shot')).toBe(12 + 2);
    const g = duel('service_pistol', ['stopping_shot'], { dexterity: 1, raw_power: 8 }); g.put(g.foe, 'H5'); g.press(g.foe, 2, g.pc);
    expect(tn(g, 'stopping_shot')).toBe(12);
  });
  it('an enemy has no sheet: its technique\'s save is 12 + half its tier\'s number (rounded up), whatever the weapon', () => {
    for (const [tier, n] of [['minion', 0], ['soldier', 1], ['elite', 2]] as const) for (const weapon of ['sabre', 'maul']) {
      const f = duel('sabre', [], {}, { tier, weapon }); f.unit(f.foe.id).techs = ['bash']; f.turn(f.foe);
      expect(tn(f, 'bash', {}, f.foe), tier + ' ' + weapon).toBe(12 + Math.ceil(n / 2));
    }
  });
  it('Feint halves the strength as every technique save does; Bind\'s grapple (a condition\'s own save) keeps it whole', () => {
    const f = duel('kemizuchi_duelling_blade', ['feint'], { dexterity: 6, raw_power: 3 });
    expect(tn(f, 'feint')).toBe(12 + 3 + 2); // a light blade: half of Dexterity strength 5, rounded up, and Light's +2
    const h = duel('maul', ['feint'], { dexterity: 6, raw_power: 3 });
    expect(tn(h, 'feint')).toBe(12 + 1); // half of Raw Power strength 2; no Light step
    const b = duel('fists', ['bind'], { raw_power: 6, dexterity: 2 }); b.g.rng = rngFor(10);
    expect(b.tech('bind', { targetId: b.foe.id })).toBeNull(); // Bare: the grapple's Body save
    expect(tnOf(b.cb.log.find((l) => /body save d20 [^)]* vs/.test(l))!)).toBe(12 + 5);
  });
  it('a save rolled after the technique\'s own use (walking away from a Bind) reads the binder\'s strength with the weapon it was set with', () => {
    const f = duel('sabre', ['bind'], { dexterity: 5, raw_power: 8 });
    expect(f.tech('bind', { targetId: f.foe.id })).toBeNull(); f.pass();
    try { f.walk(f.foe, 'G5'); } catch { /* a refused walk */ }
    expect(tnOf(f.cb.log.find((l) => /the save against the bind/.test(l))!)).toBe(12 + 2); // a sabre hits with Dexterity: half of strength 4
  });
});

import { attrCapAt, attrCapLevel, canRaise as canRaise113, newCharacter as newChar113, ARCHETYPES as ARCH113 } from '../src';
describe('rules 1.13: the attribute ceiling rises with level', () => {
  it('7 at creation, 8 from level 3, 9 from 6, 10 from 9', () => {
    expect([1, 2, 3, 5, 6, 8, 9, 20].map(attrCapAt)).toEqual([7, 7, 8, 8, 9, 9, 10, 10]);
    expect([7, 8, 9, 10].map(attrCapLevel)).toEqual([1, 3, 6, 9]);
  });
  it('a raise past the ceiling is refused with the level it opens at', () => {
    const a = ARCH113.find((x: any) => x.family === 'all_in')!;
    const c: any = newChar113('c', 'p', { name: 'T', portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any);
    const top = Object.keys(c.attrs).find((k) => c.attrs[k] === 7)!; c.unspent.attr = 3;
    c.level = 2; expect(canRaise113(c, 'attr', top)).toMatch(/opens at level 3/);
    c.level = 3; expect(canRaise113(c, 'attr', top)).toBeNull(); c.attrs[top] = 8; expect(canRaise113(c, 'attr', top)).toMatch(/opens at level 6/);
    c.level = 9; c.attrs[top] = 9; expect(canRaise113(c, 'attr', top)).toBeNull();
  });
});
