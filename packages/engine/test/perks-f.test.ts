// Lane F: status, surrender, judgement, kin and companions (src/perks/f.ts). Each item is shown working in play:
// through the reducer (apply: combat/perk, combat/attack, combat/analyze, story/perk, narrator/turn, check/roll) where
// an action exists, else with the game bound and the engine's own functions (applyCond, applyDamage, healUnit,
// enemyTurn, endTurn…), the same calls the reducer makes.
import { describe, expect, it } from 'vitest';
import {
  emit, applyCond, applyDamage, healUnit, previewAttack, statQuery, endTurn, enemyTurn, condOn, d20, storyConds, perkActionsFor,
  type Unit, type Combat, type GameState,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
type S = ReturnType<typeof storyWith>;
/** A seed whose next d20 is n. */
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
const pcAct = (f: F, a: any, u?: Unit) => f.act({ unitId: (u || f.pc).id, ...a });
const sure = (u: Unit) => { u.attack = 60; };
const weak = (u: Unit) => { u.sv = { body: -40, brain: -40, heart: -40 } as any; };
const tough = (u: Unit) => { u.sv = { body: 40, brain: 40, heart: 40 } as any; };
const charOf = (g: GameState, u: Unit) => g.characters[u.charId!];
/** A fight on an open yard: the PC at C6 on its turn with 9 AP, foes from E6 on. */
function fight(specs: any[], foes: any[] = [{}]) {
  const f = fightWith(specs, foes.map((x, i) => ({ at: 'E6', ...x, name: x.name || 'Foe ' + (i + 1) })));
  open(f.cb); f.pcs.forEach((u, i) => { if (!u.companion) u.pos = (2) + ',' + (5 + i); });
  f.foes.forEach((u, i) => { u.pos = (4 + i) + ',5'; });
  f.turn(f.pc); f.pc.ap = 9;
  return f;
}
function storyCheck(s: S, charId: string, skills: string[], extra: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Try it.', checks: [{ charId, skills, tn: 12, stakes: 'It works.', ...extra }] } } as any);
  const ck = s.g.checks.at(-1)!;
  return { ck, roll: () => { s.act({ type: 'check/roll', checkId: ck.id }); return s.g.story.entries.filter((e) => e.kind === 'check').at(-1)!.head!; } };
}
/** Make it a foe's turn and end it (its turn_end hooks run), with the game bound. */
function endFoeTurn(f: F, foe: Unit) { const cb = f.cb; cb.turn = cb.order.indexOf(foe.id); withGame(f.g, () => endTurn(cb, f.g.rng)); }

describe('Bone Talk', () => {
  it('I: 2 AP, an enemy in earshot who sees you: Heart save or Shaken; the answer goes to the Narrator', () => {
    const f = fight([{ perks: { bone_talk: 'I' } }], [{}, {}]); weak(f.foes[0]); weak(f.foes[1]); f.g.rng = rngFor(5);
    const ap = f.pc.ap; pcAct(f, { type: 'combat/perk', id: 'bone_talk', targetId: f.foes[0].id, text: 'Your left knee. I know which tendon.' });
    expect(f.pc.ap).toBe(ap - 2);
    expect(condOn(f.foes[0], 'shaken')).toBe(true); expect(condOn(f.foes[1], 'shaken')).toBe(false);
    expect((f.cb.notes || []).some((n) => /Bone Talk/.test(n))).toBe(true);
  });
  it('II: the whole group in earshot that sees you rolls', () => {
    const f = fight([{ perks: { bone_talk: 'II' } }], [{}, {}]); weak(f.foes[0]); weak(f.foes[1]); f.g.rng = rngFor(5);
    pcAct(f, { type: 'combat/perk', id: 'bone_talk', targetId: f.foes[0].id });
    expect(condOn(f.foes[0], 'shaken') && condOn(f.foes[1], 'shaken')).toBe(true);
  });
  it('story: the threat is a pending ruling; a refusal (conditions) Shakes the NPC: +2 on social checks at them, and they start a fight Shaken', () => {
    const s = storyWith([{ perks: { bone_talk: 'I' } }]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'bone_talk', actionId: 'bone_talk_story', npc: 'The courier', text: 'That scar on your wrist. I gave you the twin.' });
    expect(s.g.story.rulings!.some((r) => r.key === 'perk:bone_talk' && /physical detail/.test(r.text))).toBe(true);
    s.act({ type: 'narrator/turn', turn: { narration: 'He says nothing.', conditions: [{ target: 'The courier', id: 'shaken' }] } } as any);
    const head = storyCheck(s, c.id, ['charisma'], { target: 'The courier' }).roll();
    expect(head).toMatch(/\+2 The courier is Shaken/);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'The courier', tier: 'soldier', weapon: 'service_pistol', at: '' }] } } } as any);
    expect(condOn(s.g.combat!.units.find((u) => u.name === 'The courier')!, 'shaken')).toBe(true);
  });
});

describe('The Name They Whisper', () => {
  it('fights start with every aware enemy saving against Fear (TN from the better of Intimidation and Implication)', () => {
    const f = fightWith([{ perks: { the_name_they_whisper: 'mastered' }, skills: { intimidation: 10 } }], [{}, {}], { seed: 'A1' });
    expect(logHas(f.cb, /They know the name/)).toBe(true);
    expect(f.foes.some((u) => condOn(u, 'fear'))).toBe(true);
  });
  it('an enemy at half HP or less that sees you, at the end of its turn, saves or surrenders; once, never a Boss', () => {
    const f = fight([{ perks: { the_name_they_whisper: 'mastered' }, skills: { intimidation: 10 } }], [{}, {}, { tier: 'boss' }]);
    const [a, , boss] = f.foes; weak(a); a.hp = Math.floor(a.maxHp / 2); boss.hp = 10; f.g.rng = rngFor(5);
    endFoeTurn(f, a);
    expect(f.unit(a.id).surrendered).toBe(true);
    endFoeTurn(f, boss); expect(f.unit(boss.id).surrendered).toBeFalsy();
    const b = f.foes[1]; tough(b); b.hp = 5; endFoeTurn(f, b); expect(f.unit(b.id).surrenderTried).toBe(true);
    const tries = f.cb.log.filter((l) => /remembers whose name/.test(l)).length; endFoeTurn(f, f.unit(b.id)); expect(f.cb.log.filter((l) => /remembers whose name/.test(l)).length).toBe(tries);
  });
});

describe('Open Hand', () => {
  it('an enemy you see crossing a quarter HP is offered mercy at once: it saves or surrenders; one offer each', () => {
    const f = fight([{ perks: { open_hand: 'mastered' } }]); const t = f.foe; weak(t); t.hp = Math.floor(t.maxHp / 2); f.g.rng = rngFor(5);
    withGame(f.g, () => applyDamage(f.cb, t, t.hp - 5, { by: f.pc, type: 'weapon' }));
    expect(t.surrendered).toBe(true); expect(logHas(f.cb, /open hand/)).toBe(true);
  });
  it('set to "ask": no automatic offer; the free Offer mercy action does it on your turn', () => {
    const f = fight([{ perks: { open_hand: 'mastered' } }]);
    pcAct(f, { type: 'combat/perk', id: 'open_hand', actionId: 'mercy_setting', choice: 'ask' });
    const t = f.foe; weak(t); t.hp = Math.floor(t.maxHp / 2); f.g.rng = rngFor(5);
    withGame(f.g, () => applyDamage(f.cb, t, t.hp - 5, { by: f.pc, type: 'weapon' }));
    expect(f.foe.surrendered).toBeFalsy();
    const ap = f.pc.ap; pcAct(f, { type: 'combat/perk', id: 'open_hand', actionId: 'offer_mercy', targetId: f.foe.id });
    expect(f.foe.surrendered).toBe(true); expect(f.pc.ap).toBe(ap);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'open_hand', actionId: 'offer_mercy', targetId: f.foe.id })).toThrow();
  });
});

describe('Clean Hands', () => {
  // rules 1.13: no AP. A shield worth 15% (II: 25%) of max HP.
  for (const [tier, n] of [['I', 15], ['II', 25]] as const) it(tier + ': a Spare blow subdues the foe (no kill) and gives a shield of ' + n + '% of max HP; no AP', () => {
    const f = fight([{ perks: { clean_hands: tier } }]); sure(f.pc); f.foe.hp = 1;
    pcAct(f, { type: 'combat/attack', targetId: f.foe.id, mode: 'shot', mods: ['spare'] });
    expect(f.foe.subdued).toBe(true); expect(f.foe.dead).toBeFalsy(); expect(f.pc.kills).toBe(0);
    expect(f.pc.apNext || 0).toBe(0);
    expect(f.pc.shield).toBe(Math.floor(Math.floor(f.pc.maxHp * n / 100) * (f.pc.shieldRecv || 1)));
  });
  it('protecting an innocent counts: healing a civilian', () => {
    const f = fight([{ perks: { clean_hands: 'I' } }]); f.foe.tags = ['civilian']; f.foe.hp = 5;
    withGame(f.g, () => healUnit(f.cb, f.foe, 10, f.pc, 'stim'));
    expect(f.pc.apNext || 0).toBe(0); expect(f.pc.shield).toBeGreaterThan(0);
  });
});

describe('Judgement Day', () => {
  it('3 AP once a fight: the judged enemy\'s next attack on your side fails; +50% from you until the fight ends', () => {
    const f = fight([{ perks: { judgement_day: 'mastered' } }]);
    const before = previewAttack(f.cb, f.pc, f.foe, 'shot').dmg!.total;
    const ap = f.pc.ap; pcAct(f, { type: 'combat/perk', id: 'judgement_day', targetId: f.foe.id }); expect(f.pc.ap).toBe(ap - 3);
    const after = withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot').dmg!);
    expect(after.mults.some((x) => x.label.startsWith('against this target') && x.label.includes('Judgement Day'))).toBe(true); expect(after.total).toBeGreaterThan(before);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'judgement_day', targetId: f.foe.id })).toThrow(/Used/);
    const foe = f.foe; sure(foe); foe.ap = 6; f.cb.turn = f.cb.order.indexOf(foe.id);
    const hp = f.pc.hp; withGame(f.g, () => enemyTurn(f.cb, f.g.rng));
    expect(logHas(f.cb, /is judged: the attack on .* fails/)).toBe(true);
    expect(f.cb.log.filter((l) => /is judged/.test(l)).length).toBe(1);
    expect(f.pc.hp).toBeLessThanOrEqual(hp); // later attacks land again
  });
});

describe('True Name', () => {
  it('once a session: an upper-realm being takes +50% from the squad; a human has no true name', () => {
    const f = fight([{ perks: { true_name: 'mastered' } }, {}]);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'true_name', targetId: f.foe.id })).toThrow(/no true name/);
    f.foe.kind = 'upper_realm';
    // "Studied" means Analyzed (rules 1.14, item 1107): refused until the being carries an Analyze's mark; the use is kept.
    expect(() => pcAct(f, { type: 'combat/perk', id: 'true_name', targetId: f.foe.id })).toThrow(/not studied .* Analyze it first/);
    f.foe.analyzedBy = f.pcs[1].id; // a squadmate's Analyze counts (an enemy is Analyzed once)
    pcAct(f, { type: 'combat/perk', id: 'true_name', targetId: f.foe.id });
    expect((f.cb.notes || []).some((n) => /studied/.test(n))).toBe(false); // nothing left for the Narrator to confirm
    const ally = f.pcs[1]; ally.pos = '3,6'; ally.ap = 9;
    const d = withGame(f.g, () => previewAttack(f.cb, ally, f.foe, 'shot').dmg!);
    expect(d.mults.some((x) => x.label.startsWith('against this target') && x.label.includes('True Name'))).toBe(true);
    expect((f.cb.notes || []).some((n) => /can't lie/.test(n))).toBe(true);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'true_name', targetId: f.foe.id })).toThrow(/Used/);
  });
  it('story: names a being here (a ruling the Narrator can refuse), and the scene\'s fight against it gets the bonus', () => {
    const s = storyWith([{ perks: { true_name: 'mastered' } }]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'true_name', actionId: 'true_name_story', text: 'The Hollow Saint' });
    expect(s.g.story.rulings!.at(-1)!.key).toBe('perk:true_name');
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'true_name', actionId: 'true_name_story', text: 'again' })).toThrow();
    s.act({ type: 'narrator/turn', turn: { narration: 'It comes.', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'The Hollow Saint', tier: 'elite', weapon: 'service_pistol', at: '', kind: 'upper_realm' }] } } } as any);
    const cb = s.g.combat!, pc = cb.units.find((u) => u.side === 'pc')!, t = cb.units.find((u) => u.side === 'foe')!; open(cb); pc.pos = '2,5'; t.pos = '4,5';
    expect(withGame(s.g, () => previewAttack(cb, pc, t, 'shot').dmg!.mults.some((x) => x.label.startsWith('against this target') && x.label.includes('True Name')))).toBe(true);
  });
});

describe('Case Closed', () => {
  it('Analyze reads everything; you and every ally have +2 Defense against it, and no bonus to hit or damage (rules 1.13)', () => {
    const f = fight([{ perks: { case_closed: 'mastered' }, skills: { analysis: 10 } }, {}]);
    pcAct(f, { type: 'combat/analyze', targetId: f.foe.id });
    expect(logHas(f.cb, /Case Closed on .*saves body.*motive/)).toBe(true);
    const ally = f.pcs[1]; ally.pos = '3,6'; ally.ap = 9;
    const pv = withGame(f.g, () => previewAttack(f.cb, ally, f.foe, 'shot'));
    expect(pv.terms!.some((t) => t.label === 'Case Closed')).toBe(false);
    expect(pv.dmg!.mults.some((x) => x.label.includes('Weak Point'))).toBe(false);
    expect(pv.dmg!.mults.some((x) => x.label === 'Case Closed' && x.v === 1.2)).toBe(true); // a Mastered perk's weight: +20% damage for the squad (Leon, 10 Nov 2026)
    f.foe.ap = 9;
    for (const t of f.pcs) { const back = withGame(f.g, () => previewAttack(f.cb, f.foe, t, 'shot')); expect(back.terms!.some((x) => x.label === 'Case Closed' && x.v === -2)).toBe(true); }
  });
  it('story: a successful Analysis check owes the motive', () => {
    const s = storyWith([{ perks: { case_closed: 'mastered' }, skills: { analysis: 10 } }]);
    const k = storyCheck(s, s.chars[0].id, ['analysis'], { target: 'The broker', auto: 'success' }); k.roll();
    expect(s.g.story.rulings!.some((r) => r.key === 'perk:case_closed' && /wants most/.test(r.text))).toBe(true);
  });
});

describe('Still Water', () => {
  it('immune to Brain debuffs, no save', () => {
    const f = fight([{ perks: { still_water: 'mastered' } }]);
    const r = withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.pc, 'confused'));
    expect(r).toMatch(/untouched/); expect(condOn(f.pc, 'confused')).toBe(false);
  });
  it('enemy AI can\'t read your HP: it picks targets as if you were unhurt', () => {
    const f = fight([{ perks: { still_water: 'mastered' } }, {}]); const [me, other] = f.pcs;
    me.pos = '3,5'; other.pos = '3,6'; me.hp = 10; other.hp = other.maxHp - 1;
    const foe = f.foe; sure(foe); foe.ap = 2; f.cb.turn = f.cb.order.indexOf(foe.id);
    withGame(f.g, () => enemyTurn(f.cb, f.g.rng));
    expect(logHas(f.cb, /can't read .* \(Still Water\) and goes for/)).toBe(true);
    expect(f.unit(me.id).hp).toBe(10);
  });
});

describe('Red Line', () => {
  it('name a line; while it holds +1 on Heart saves (II: +2, and allies +1); crossing it ends the bonus', () => {
    const s = storyWith([{ perks: { red_line: 'II' } }, {}]); const [a, b] = s.chars;
    s.act({ type: 'story/perk', charId: a.id, id: 'red_line', actionId: 'name_line', text: 'I never leave anyone behind.' });
    expect(storyCheck(s, a.id, ['composure'], { kind: 'save', family: 'heart', auto: 'success' }).roll()).toMatch(/\+2 Red Line/);
    expect(storyCheck(s, b.id, ['composure'], { kind: 'save', family: 'heart', auto: 'success' }).roll()).toMatch(/\+1 Red Line \(ally\)/);
    expect(withGame(s.g, () => statQuery({ c: s.g.characters[a.id] }, 'save_heart').add)).toBe(2);
    s.act({ type: 'narrator/turn', turn: { narration: 'You left them.', traitState: [{ charId: a.id, key: 'red_line_crossed', value: true }] } } as any);
    expect(storyCheck(s, a.id, ['composure'], { kind: 'save', family: 'heart', auto: 'success' }).roll()).not.toMatch(/Red Line/);
    expect(() => s.act({ type: 'story/perk', charId: a.id, id: 'red_line', actionId: 'name_line', text: 'another' })).toThrow(/next session/);
  });
  it('I in a fight: +1 on the unit\'s Heart save; II: allies within 3 tiles +1', () => {
    const s = storyWith([{ perks: { red_line: 'I' } }]); s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'red_line', actionId: 'name_line', text: 'No civilians.' });
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'X', tier: 'soldier', weapon: 'service_pistol', at: '' }] } } } as any);
    const u = s.g.combat!.units.find((x) => x.side === 'pc')!, base = s.g.characters[u.charId!].skills.composure || 0;
    expect(u.sv!.heart).toBe((base ? base - 1 : -2) + 1);
    const f = fight([{ perks: { red_line: 'II' } }, {}]); charOf(f.g, f.pc).state = { red_line: 'No civilians.' };
    const ctx: any = withGame(f.g, () => emit(f.cb, 'cond_apply', { by: f.foe, t: f.pcs[1], id: 'shaken', fam: 'heart', saveAdd: 0, cb: f.cb }));
    expect(ctx.saveAdd).toBe(1);
  });
});

describe('Lab Coat', () => {
  it('I: +3 on story saves against an identified chemical', () => {
    const s = storyWith([{ perks: { lab_coat: 'I' } }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'A green haze.', identify: [{ charId: c.id, what: 'chlorine' }] } } as any);
    expect(storyCheck(s, c.id, ['guts'], { kind: 'save', family: 'body', tags: ['chemical'], target: 'chlorine', auto: 'success' }).roll()).toMatch(/\+3 Lab Coat/);
    expect(storyCheck(s, c.id, ['guts'], { kind: 'save', family: 'body', tags: ['chemical'], target: 'mustard', auto: 'success' }).roll()).not.toMatch(/Lab Coat/);
  });
  it('II: 2 AP, Nausea on an ally within 2 tiles ends and can\'t land on them again this fight', () => {
    const f = fight([{ perks: { lab_coat: 'II' } }, {}]); const ally = f.pcs[1]; ally.pos = '3,6';
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, ally, 'nausea', 2, undefined, { skipSave: true }));
    expect(condOn(ally, 'nausea')).toBe(true);
    const ap = f.pc.ap; pcAct(f, { type: 'combat/perk', id: 'lab_coat', actionId: 'neutralise_agent' }); expect(f.pc.ap).toBe(ap - 2);
    expect(condOn(f.unit(ally.id), 'nausea')).toBe(false);
    expect(withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.unit(ally.id), 'nausea', 2, undefined, { skipSave: true }))).toMatch(/neutralised/);
  });
});

describe('Daggerfall Veteran', () => {
  it('immune to Fear; Shake It Off is free once a fight; a flashback on Burning', () => {
    const f = fight([{ traits: ['daggerfall_veteran'] }]);
    expect(withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.pc, 'fear'))).toMatch(/untouched/);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.pc, 'shaken', 2, 'heart', { skipSave: true }));
    const ap = f.pc.ap; pcAct(f, { type: 'combat/perk', id: 'daggerfall_veteran', actionId: 'shake_it_off' });
    expect(condOn(f.pc, 'shaken')).toBe(false); expect(f.pc.ap).toBe(ap);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.pc, 'shaken', 2, 'heart', { skipSave: true }));
    expect(() => pcAct(f, { type: 'combat/perk', id: 'daggerfall_veteran', actionId: 'shake_it_off' })).toThrow(/Used/);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.pc, 'burning', undefined, 'body', { skipSave: true }));
    expect(logHas(f.cb, /back at Daggerfall \(fire\): Composure d20/)).toBe(true);
  });
  it('Seen It Before: once a session the engine forecasts each visible enemy\'s next move (on a copy: nothing changes)', () => {
    const f = fight([{ traits: ['daggerfall_veteran'] }]); const pos = f.foe.pos, hp = f.pc.hp;
    pcAct(f, { type: 'combat/perk', id: 'daggerfall_veteran', actionId: 'seen_it_before' });
    expect(logHas(f.cb, /has seen it before: Foe 1 (moves to|holds)/)).toBe(true);
    expect(f.foe.pos).toBe(pos); expect(f.pc.hp).toBe(hp);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'daggerfall_veteran', actionId: 'seen_it_before' })).toThrow(/Used/);
  });
  it('story: +2 with the military (tagged checks); a failed flashback check costs the round', () => {
    const s = storyWith([{ traits: ['daggerfall_veteran'] }]); const c = s.chars[0];
    expect(storyCheck(s, c.id, ['authority'], { tags: ['vs_military'], auto: 'success' }).roll()).toMatch(/\+2 Daggerfall Veteran/);
    storyCheck(s, c.id, ['composure'], { tags: ['flashback'], auto: 'fail' }).roll();
    expect(s.g.story.ended?.[c.id]).toBe(true);
  });
});

describe('Chain Smoker', () => {
  it('Light Up: 2 AP, a Heart debuff gone, +2 Composure for the scene; enemies spot them more easily', () => {
    const f = fight([{ traits: ['chain_smoker'] }]);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.pc, 'shaken', 2, 'heart', { skipSave: true }));
    const ap = f.pc.ap; pcAct(f, { type: 'combat/perk', id: 'chain_smoker', actionId: 'light_up' });
    expect(f.pc.ap).toBe(ap - 2); expect(condOn(f.pc, 'shaken')).toBe(false);
    const ctx: any = withGame(f.g, () => emit(f.cb, 'cond_apply', { by: f.foe, t: f.pc, id: 'shaken', fam: 'heart', saveAdd: 0, cb: f.cb }));
    expect(ctx.saveAdd).toBe(2);
    const sp: any = withGame(f.g, () => emit(f.cb, 'spot', { by: f.foe, u: f.pc, die: 10, mod: 0, tn: 12, cb: f.cb }));
    expect(sp.mod).toBe(2);
  });
  it('story: free, +2 on Composure checks this scene', () => {
    const s = storyWith([{ traits: ['chain_smoker'] }]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'chain_smoker', actionId: 'light_up' });
    expect(storyCheck(s, c.id, ['composure'], { auto: 'success' }).roll()).toMatch(/\+2 Light Up/);
  });
});

describe('Trench Poet', () => {
  it('Verse in a fight: 1 AP, once a scene; Heart save or Confused; allies in earshot +1 on Heart saves', () => {
    const f = fight([{ traits: ['trench_poet'] }, {}]); weak(f.foe); f.g.rng = rngFor(5);
    const ap = f.pc.ap; pcAct(f, { type: 'combat/perk', id: 'trench_poet', actionId: 'verse', targetId: f.foe.id, text: 'The rain keeps its own count.' });
    expect(f.pc.ap).toBe(ap - 1); expect(condOn(f.foe, 'confused')).toBe(true);
    const ctx: any = withGame(f.g, () => emit(f.cb, 'cond_apply', { by: f.foe, t: f.pcs[1], id: 'shaken', fam: 'heart', saveAdd: 0, cb: f.cb }));
    expect(ctx.saveAdd).toBe(1);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'trench_poet', actionId: 'verse', targetId: f.foe.id })).toThrow(/Used/);
  });
  it('story: rolls the listener\'s save, posts it; allies +1 Composure this scene', () => {
    const s = storyWith([{ traits: ['trench_poet'] }, {}]); const [a, b] = s.chars;
    s.act({ type: 'story/perk', charId: a.id, id: 'trench_poet', actionId: 'verse_story', npc: 'The sergeant', text: 'A door is a wall that changed its mind.' });
    expect(s.g.story.entries.some((e) => /Verse at The sergeant: Heart save d20/.test(e.text || ''))).toBe(true);
    expect(storyCheck(s, b.id, ['composure'], { auto: 'success' }).roll()).toMatch(/\+1 Verse/);
  });
});

describe('Grudge Bearer', () => {
  it('Spite: debuffs you inflict last a round longer, and the first one each fight skips the save', () => {
    const f = fight([{ traits: ['grudge_bearer'] }], [{}, {}]); tough(f.foes[0]); tough(f.foes[1]);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.pc, f.foes[0], 'shaken', 2, 'heart', { via: 'intimidation' }));
    expect(f.foes[0].conds!.shaken).toBe(3);
    expect(withGame(f.g, () => applyCond(f.cb, rngFor(5), f.pc, f.foes[1], 'shaken', 2, 'heart', { via: 'intimidation' }))).toMatch(/resists/);
  });
  it('Never Forgive: with a grudge open, −2 on attacks at anyone else and on story checks not aimed at the mark', () => {
    const s = storyWith([{ traits: ['grudge_bearer'] }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'Kain laughs.', traitState: [{ charId: c.id, key: 'grudge', value: 'Captain Kain' }] } } as any);
    expect(storyCheck(s, c.id, ['eloquence'], { auto: 'success' }).roll()).toMatch(/−2 Never Forgive/);
    expect(storyCheck(s, c.id, ['eloquence'], { target: 'Captain Kain', auto: 'success' }).roll()).not.toMatch(/Never Forgive/);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Captain Kain', tier: 'elite', weapon: 'service_pistol', at: '' }, { name: 'Guard', tier: 'minion', weapon: 'service_pistol', at: '' }] } } } as any);
    const cb = s.g.combat!; open(cb); const pc = cb.units.find((u) => u.side === 'pc')!; pc.pos = '2,5';
    const [kain, guard] = cb.units.filter((u) => u.side === 'foe'); kain.pos = '4,5'; guard.pos = '4,6';
    expect(withGame(s.g, () => previewAttack(cb, pc, guard, 'shot').terms!.some((t) => t.label === 'Never Forgive'))).toBe(true);
    expect(withGame(s.g, () => previewAttack(cb, pc, kain, 'shot').terms!.some((t) => t.label === 'Never Forgive'))).toBe(false);
  });
});

describe('Pacifist', () => {
  it('Sanctuary: −2 to hit you until you attack; Nonlethal is on by default: the foe is subdued, not killed', () => {
    const f = fight([{ traits: ['pacifist'] }]); f.foe.ap = 9;
    expect(withGame(f.g, () => previewAttack(f.cb, f.foe, f.pc, 'shot').terms!.some((t) => t.label === 'Sanctuary'))).toBe(true);
    sure(f.pc); f.foe.hp = 1; pcAct(f, { type: 'combat/attack', targetId: f.foe.id, mode: 'shot' });
    expect(f.foe.subdued).toBe(true); expect(f.foe.dead).toBeFalsy();
    expect(withGame(f.g, () => previewAttack(f.cb, f.foe, f.pc, 'shot').terms!.some((t) => t.label === 'Sanctuary'))).toBe(false);
  });
  it('The Vow: a kill takes all Echo and leaves them Shaken for the session; later talk with the spared at +3; mercy Karma doubles', () => {
    const f = fight([{ traits: ['pacifist'] }], [{}, {}]); sure(f.pc); charOf(f.g, f.pc).echo = 2;
    f.foes[0].hp = 1; pcAct(f, { type: 'combat/attack', targetId: f.foes[0].id, mode: 'shot' });
    f.foes[1].hp = 1; pcAct(f, { type: 'combat/attack', targetId: f.foes[1].id, mode: 'shot', mods: ['!nonlethal'] });
    const c = charOf(f.g, f.pc);
    expect(f.foes[1].dead).toBe(true); expect(c.echo).toBe(0); expect(storyConds(f.g, c)).toContain('shaken'); expect(condOn(f.pc, 'shaken')).toBe(true);
    expect(c.state!.subdued).toContain('Foe 1');
    const s = storyWith([{ traits: ['pacifist'] }]); const p = s.chars[0];
    s.g.characters[p.id].state = { subdued: ['Foe 1'] };
    expect(storyCheck(s, p.id, ['eloquence'], { target: 'Foe 1', auto: 'success' }).roll()).toMatch(/\+3 Pacifist/);
    const k0 = s.g.characters[p.id].karma || 0, consc = s.g.characters[p.id].skills.conscience || 0;
    s.act({ type: 'narrator/turn', turn: { narration: 'You let him go.', karma: [{ charId: p.id, amount: 5, why: 'mercy to the deserter' }] } } as any);
    expect((s.g.characters[p.id].karma || 0) - k0).toBe(2 * (5 + consc));
  });
});

describe('Humanity First', () => {
  it('+15% against non-humans (the target bucket), +2 on saves against their Fear, half heals from them', () => {
    const f = fight([{ traits: ['humanity_first'] }, { traits: ['factory_made'] }]); f.foe.kind = 'robot';
    expect(withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot').dmg!.mults.some((x) => x.label.startsWith('against this target') && x.label.includes('For Humanity')))).toBe(true);
    const ctx: any = withGame(f.g, () => emit(f.cb, 'cond_apply', { by: f.foe, t: f.pc, id: 'fear', fam: 'heart', saveAdd: 0, cb: f.cb }));
    expect(ctx.saveAdd).toBe(2);
    f.pc.hp = 10; const r = withGame(f.g, () => healUnit(f.cb, f.pc, 40, f.pcs[1], 'stim'));
    expect(r.restored).toBeLessThanOrEqual(Math.ceil(40 * (f.pc.healRecv || 1) / 2));
  });
  it('story: no Empathy, Charisma or Camaraderie with non-humans (tagged checks fail)', () => {
    const s = storyWith([{ traits: ['humanity_first'] }]);
    expect(storyCheck(s, s.chars[0].id, ['empathy'], { tags: ['non_human'] }).roll()).toMatch(/Xenophobe.*FAILURE \(AUTO\)/);
  });
});

describe('The Old Blood', () => {
  it('heals from another race work at half power; Bloodline and Prejudice mods reach tagged checks', () => {
    const f = fight([{ traits: ['the_old_blood'] }, {}]); charOf(f.g, f.pcs[1]).race = 'lapin';
    f.pc.hp = 10; const r = withGame(f.g, () => healUnit(f.cb, f.pc, 40, f.pcs[1], 'stim'));
    expect(r.restored).toBeLessThanOrEqual(Math.ceil(40 * (f.pc.healRecv || 1) / 2));
    expect(logHas(f.cb, /The Old Blood/)).toBe(true);
    const s = storyWith([{ traits: ['the_old_blood'] }]);
    expect(storyCheck(s, s.chars[0].id, ['charisma'], { tags: ['vs_other_race'], auto: 'success' }).roll()).toMatch(/−2 The Old Blood/);
  });
});

describe('Moon Hunter', () => {
  it('Track in the story; the first attack on that quarry this scene does +30%, then it\'s spent', () => {
    const s = storyWith([{ traits: ['moon_hunter'] }]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'moon_hunter', actionId: 'track', text: 'The Scavenger' });
    expect(s.g.story.rulings!.at(-1)!.key).toBe('trait:moon_hunter');
    s.act({ type: 'narrator/turn', turn: { narration: 'There.', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'The Scavenger', tier: 'soldier', weapon: 'service_pistol', at: '' }] } } } as any);
    const cb = s.g.combat!; open(cb); const pc = cb.units.find((u) => u.side === 'pc')!, t = cb.units.find((u) => u.side === 'foe')!; pc.pos = '2,5'; t.pos = '4,5';
    expect(withGame(s.g, () => previewAttack(cb, pc, t, 'shot').dmg!.mults.some((x) => x.label.startsWith('against this target') && x.label.includes('Tracker')))).toBe(true);
    cb.turn = cb.order.indexOf(pc.id); pc.ap = 9;
    s.act({ type: 'combat/attack', unitId: pc.id, targetId: t.id, mode: 'shot' });
    const cb2 = s.g.combat!, pc2 = cb2.units.find((u) => u.id === pc.id)!, t2 = cb2.units.find((u) => u.id === t.id)!;
    expect(withGame(s.g, () => previewAttack(cb2, pc2, t2, 'shot').dmg!.mults.some((x) => x.label.startsWith('against this target') && x.label.includes('Tracker')))).toBe(false);
  });
});

describe('Rabbit\'s Foot', () => {
  it('Lucky Foot is armed at the fight\'s start: the first enemy roll that would hit is rerolled, once a session', () => {
    const f = fight([{ traits: ['rabbits_foot'] }]);
    expect(perkActionsFor({ u: f.pc, c: charOf(f.g, f.pc), cb: f.cb, g: f.g }, 'combat').find((a) => a.actionId === 'lucky_foot')!.armed).toBeTruthy();
    const foe = f.foe; sure(foe); foe.ap = 2; f.cb.turn = f.cb.order.indexOf(foe.id); foe.pos = '3,5';
    withGame(f.g, () => enemyTurn(f.cb, f.g.rng));
    expect(logHas(f.cb, /Lucky Foot: .* is rerolled/)).toBe(true);
    foe.ap = 2; withGame(f.g, () => enemyTurn(f.cb, f.g.rng));
    expect(f.cb.log.filter((l) => /Lucky Foot:/.test(l)).length).toBe(1);
  });
  it('Vengeful: an ally Downed gives +2 AP next turn; hunters and Orks hit 25% harder', () => {
    const f = fight([{ traits: ['rabbits_foot'] }, {}]); const ally = f.pcs[1];
    withGame(f.g, () => applyDamage(f.cb, ally, ally.hp + 5, { by: f.foe, type: 'weapon' }));
    expect(ally.downed).toBe(true);
    const u = f.turn(f.pc); expect(u.ap).toBe(8);
    f.foe.kind = 'ork'; const hp = u.hp; withGame(f.g, () => applyDamage(f.cb, u, 20, { by: f.foe, type: 'weapon' }));
    expect(hp - u.hp).toBe(25);
  });
  it('story: once a session, a ruling asks the Narrator to reroll an NPC\'s roll', () => {
    const s = storyWith([{ traits: ['rabbits_foot'] }]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'rabbits_foot', actionId: 'lucky_foot_story', text: 'the pickpocket\'s grab' });
    expect(s.g.story.rulings!.at(-1)!.text).toMatch(/reroll/);
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'rabbits_foot', actionId: 'lucky_foot_story', text: 'x' })).toThrow();
  });
});

describe('Drone Handler', () => {
  it('a drone comes with the session, fights on 3 AP, carries 5 kg; Proficiency repairs it', () => {
    const f = fight([{ traits: ['drone_handler'], skills: { proficiency: 5 } }]);
    const c = charOf(f.g, f.pc); expect(c.companions?.some((x) => x.kind === 'drone')).toBe(true);
    expect(withGame(f.g, () => statQuery({ c }, 'carry').add)).toBe(5);
    const d = f.pcs.find((u) => u.companion === 'drone')!; expect(d).toBeTruthy();
    expect(f.turn(d).ap).toBe(3);
    f.turn(f.pc); f.pc.ap = 9; f.pc.parts = 2; d.hp = 10; d.pos = '2,6';
    pcAct(f, { type: 'combat/perk', id: 'drone_handler', actionId: 'repair_drone', targetId: d.id });
    expect(f.unit(d.id).hp).toBe(30); expect(f.pc.parts).toBe(1);
  });
  it('Tethered: destroyed means Shaken until it\'s rebuilt after a rest with a drone frame', () => {
    const f = fight([{ traits: ['drone_handler'] }]); const d = f.pcs.find((u) => u.companion === 'drone')!;
    withGame(f.g, () => applyDamage(f.cb, d, d.hp + 10, { by: f.foe, type: 'weapon' }));
    const c = charOf(f.g, f.pc); expect(storyConds(f.g, c)).toContain('shaken'); expect(condOn(f.pc, 'shaken')).toBe(true);
    const s = storyWith([{ traits: ['drone_handler'] }]); const p = s.g.characters[s.chars[0].id];
    p.companions![0].hp = 0; p.state = { drone_lost_rest: 0 }; p.persistentConds = [{ id: 'shaken', scope: 'arc' }];
    p.pack = [...(p.pack || []), { id: 'drone_frame', item: 'drone_frame', name: 'Drone frame', qty: 1, kind: 'tool' } as any];
    expect(() => s.act({ type: 'story/perk', charId: p.id, id: 'drone_handler', actionId: 'rebuild_drone' })).toThrow(/Rest first/);
    s.act({ type: 'narrator/turn', turn: { narration: 'Night.', rest: { kind: 'long' } } } as any);
    s.act({ type: 'story/perk', charId: p.id, id: 'drone_handler', actionId: 'rebuild_drone' });
    const p2 = s.g.characters[p.id];
    expect(p2.companions![0].hp).toBeGreaterThan(0); expect(storyConds(s.g, p2)).not.toContain('shaken');
    expect((p2.pack || []).some((x) => (x.item || x.id) === 'drone_frame')).toBe(false);
  });
});

describe('Beast Handler', () => {
  it('a beast on 4 AP that obeys Empathy (TN 8); failing that, it acts on instinct; its bite can grapple', () => {
    const f = fight([{ traits: ['beast_handler'], skills: { empathy: 10 } }]); const b = f.pcs.find((u) => u.companion === 'beast')!;
    expect(b).toBeTruthy();
    f.g.rng = rngFor(5); const u = f.turn(b); expect(u.ap).toBe(4); expect(logHas(f.cb, /calls the beast: Empathy d20 5 .* it obeys/)).toBe(true);
    u.pos = '3,5'; f.foe.pos = '4,5'; weak(f.foe); sure(u); f.g.rng = rngFor(5);
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'melee', mods: ['grapple'] });
    expect(condOn(f.foe, 'grappled')).toBe(true);
    const g = fight([{ traits: ['beast_handler'], skills: { empathy: 0 } }]); const b2 = g.pcs.find((x) => x.companion === 'beast')!;
    g.g.rng = rngFor(1); const u2 = g.turn(b2); expect(u2.ap).toBe(0); expect(logHas(g.cb, /acts on instinct/)).toBe(true);
  });
  it('Bond: if it dies, Shaken for the rest of the arc', () => {
    const f = fight([{ traits: ['beast_handler'] }]); const b = f.pcs.find((u) => u.companion === 'beast')!;
    withGame(f.g, () => applyDamage(f.cb, b, b.hp + 10, { by: f.foe, type: 'weapon' }));
    const c = charOf(f.g, f.pc); expect(c.persistentConds!.find((p) => p.id === 'shaken')!.scope).toBe('arc');
  });
});
