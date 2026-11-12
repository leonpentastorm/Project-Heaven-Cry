// Rules 1.14, "The engine takes everything it can, first step" (spec items 1101 to 1111): the 19 relabels, the six
// small fixes, and the AP perks' cooldown (once every 3 of the holder's turns). Each rule is played through the real
// reducer or the engine's own functions with the game bound, the way the lanes' tests do it.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import perksJ from '../../../data/perks.json';
import traitsJ from '../../../data/traits.json';
import { applyCond, applyDamage, resolveAttack, moveUnit, enemyTurn, hide, emit, condOn, d20, beginTurn, holderOf, briefOf, type Unit, type Combat } from '../src';
import { AP_COOLDOWN_TURNS } from '../src/perks/cooldown';
import { fightWith, storyWith, withGame, rng } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
type S = ReturnType<typeof storyWith>;
const PERKS: any[] = (perksJ as any).items, TRAITS: any[] = (traitsJ as any).items;
const perkOf = (id: string) => PERKS.find((p) => p.id === id), traitOf = (id: string) => TRAITS.find((t) => t.id === id);
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
/** The holder's turn in round r (round 1 starts with every cooldown ready, as a fight does). */
function turnIn(f: { cb: Combat; g: any; unit: (id: string) => Unit }, u: Unit, r: number, key?: string): Unit {
  if (r === 1 && key && f.unit(u.id).ps?.[key]) delete f.unit(u.id).ps![key].cd;
  f.cb.round = r; f.cb.turn = f.cb.order.indexOf(u.id); delete f.cb.window;
  withGame(f.g, () => beginTurn(f.cb, f.g.rng));
  return f.unit(u.id);
}
/** A Narrator check on a character, rolled with the die given; returns the check's head line. */
function storyCheck(s: S, charId: string, skills: string[], extra: any = {}, die = 10): string {
  s.act({ type: 'narrator/turn', turn: { narration: 'Try it.', checks: [{ charId, skills, tn: 12, stakes: 'It works.', ...extra }] } } as any);
  const ck = s.g.checks.filter((k: any) => !k.roll).at(-1)!; s.g.rng = rngFor(die) as any;
  s.act({ type: 'check/roll', checkId: ck.id });
  return s.g.story.entries.filter((e: any) => e.kind === 'check').at(-1)!.head as string;
}
/** A story first, then a fight on the yard (before() runs in the story; extra goes into the Narrator's turn). */
function fightAfter(specs: any[], foes: any[], before: (s: S) => void, extra: any = {}) {
  const s = storyWith(specs); before(s);
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', ...extra, combat: { name: 'Test fight', map: 'yard16', difficulty: 'standard', enemies: foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), tier: f.tier || 'soldier', weapon: 'service_pistol', at: f.at || 'F6', ...(f.more || {}) })) } } } as any);
  const box: any = s;
  return {
    get g() { return box.g; }, get cb(): Combat { return box.g.combat; },
    get pc(): Unit { return box.g.combat.units.find((u: Unit) => u.side === 'pc'); },
    get foes(): Unit[] { return box.g.combat.units.filter((u: Unit) => u.side === 'foe'); },
    unit: (id: string): Unit => box.g.combat.units.find((u: Unit) => u.id === id),
    act: (a: any, by = 'host') => s.act(a, by),
  };
}

// ============================================================================================ 1. the relabels
describe('the 19 relabels (item 1101)', () => {
  const A_PERKS = ['into_the_dark', 'blueprint', 'talks_broke_down', 'just_the_repairman', 'verse_of_war', 'war_footing', 'foreseen', 'make_way'];
  const A_TRAITS = ['mind_without_fog', 'sigil_savant', 'grenadiers_arm', 'blade_recluse', 'bottle_butts_for_eyes', 'the_mask', 'factory_made', 'upper_touched', 'gambler', 'crowded_head', 'drone_handler'];
  it('every item of group A is labelled engine', () => {
    for (const id of A_PERKS) expect(perkOf(id).adjudication, id).toBe('engine');
    for (const id of A_TRAITS) expect(traitOf(id).adjudication, id).toBe('engine');
  });
  it('the labels of the 180: 126 engine, 47 hybrid, 7 narrator (rules 1.14 left 119, 46, 15; the truth pass of 12 Nov 2026, spec item 1514, moved fifteen)', () => {
    const all = [...PERKS, ...TRAITS], n = (l: string) => all.filter((x) => x.adjudication === l).length;
    expect(all.length).toBe(180);
    expect([n('engine'), n('hybrid'), n('narrator')]).toEqual([126, 47, 7]);
  });
  it('no relabelled card still hands a rule to the Narrator: Talks Broke Down gives its timing rule, Verse of War has no audit', () => {
    for (const t of ['I', 'II']) { expect(perkOf('talks_broke_down').tiers[t].text).not.toMatch(/Narrator/); expect(perkOf('talks_broke_down').tiers[t].text).toMatch(/same story round .* or the round after/); }
    expect(perkOf('verse_of_war').text).not.toMatch(/Narrator|checks/);
  });
  it('Into the Dark, Just the Repairman and Verse of War send the Narrator no standing line any more', () => {
    const s = storyWith([{ perks: { into_the_dark: 'II', just_the_repairman: 'achieved', verse_of_war: 'achieved' } }]), c = s.chars[0];
    for (const id of ['into_the_dark', 'just_the_repairman', 'verse_of_war']) expect(withGame(s.g, () => briefOf(holderOf({ c: s.g.characters[c.id] }, 'perk:' + id)!)), id).toBeFalsy();
  });
});

// ============================================================================================ 2. the small fixes
describe('The Name They Whisper: strangers, not the unaware (item 1106)', () => {
  const spec = [{ perks: { the_name_they_whisper: 'mastered' }, skills: { intimidation: 10 } }];
  const nameLine = (cb: Combat) => cb.log.find((l) => /They know the name/.test(l)) || '';
  it('an enemy caught unaware still knows the name (it saves against Fear), and still sits out round 1', () => {
    const f = fightAfter(spec, [{ name: 'Sleeper', more: { unaware: true } }, { name: 'Vel', at: 'F8' }], () => {});
    expect(nameLine(f.cb)).toMatch(/Sleeper/); expect(nameLine(f.cb)).toMatch(/Vel/);
    expect(f.foes.find((x) => x.name === 'Sleeper')!.waitRound).toBe(2);
  });
  it('a name on the holder\'s strangers list is spared, and loses no turn for it', () => {
    const s0 = storyWith(spec), id = s0.chars[0].id; void s0;
    const f = fightAfter(spec, [{ name: 'Sleeper' }, { name: 'Vel', at: 'F8' }], () => {}, { traitState: [{ charId: id, key: 'strangers', value: ['Vel'] }] });
    expect(Object.keys(f.g.characters)[0]).toBe(id); // the same room recipe gives the same character id
    expect(nameLine(f.cb)).toMatch(/Sleeper/); expect(nameLine(f.cb)).not.toMatch(/Vel/);
    const vel = f.foes.find((x) => x.name === 'Vel')!; expect(condOn(vel, 'fear')).toBe(false); expect(vel.waitRound || 0).toBe(0);
  });
  it('the stranger label on an enemy spares it too', () => {
    const f = fightWith(spec, [{ name: 'Sleeper' }, { name: 'Vel', at: 'F8' }]);
    for (const v of f.foes) { v.conds = {}; } const vel = f.foes.find((x) => x.name === 'Vel')!; vel.tags = [...(vel.tags || []), 'stranger'];
    delete f.pc.ps!['perk:the_name_they_whisper'].started; const at = f.cb.log.length;
    withGame(f.g, () => emit(f.cb, 'combat_start', { cb: f.cb, rng: f.g.rng }));
    const line = f.cb.log.slice(at).find((l) => /They know the name/.test(l)) || '';
    expect(line).toMatch(/Sleeper/); expect(line).not.toMatch(/Vel/);
  });
  it('the card says so: only who is a stranger is left to the Narrator (the perk is hybrid, and its card names that judgement)', () => { expect(perkOf('the_name_they_whisper').text).toMatch(/Only a stranger is spared: the Narrator says who has never heard of you\./); expect(perkOf('the_name_they_whisper').text).not.toMatch(/unaware|knows who you are/); });
});

describe('True Name: studied means Analyzed (item 1107)', () => {
  it('in a fight the engine refuses an upper-realm being nobody has Analyzed, and the use is kept', () => {
    const f = fightWith([{ perks: { true_name: 'mastered' } }, {}], [{ at: 'E6' }]); open(f.cb); f.turn(f.pc);
    f.foe.kind = 'upper_realm';
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'true_name', targetId: f.foe.id } as any)).toThrow(/Analyze it first/);
    f.foe.analyzedBy = 'someone';
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'true_name', targetId: f.foe.id } as any);
    expect(logHas(f.cb, /speaks the true name/)).toBe(true);
    expect((f.cb.notes || []).join(' ')).not.toMatch(/studied/);
  });
  it('in the story: a being on the area map must be Analyzed; one that is only in the story is still the Narrator\'s to confirm', () => {
    const s = storyWith([{ perks: { true_name: 'mastered' } }]), c = s.chars[0];
    const use = (who: string) => s.act({ type: 'story/perk', charId: c.id, id: 'true_name', actionId: 'true_name_story', text: who } as any);
    (s.g.story as any).npcs = [{ id: 'n1', name: 'The Hollow Saint', side: 'neutral', tier: 'elite', weapon: 'fists', pos: '6,5', kind: 'upper_realm' }];
    expect(() => use('The Hollow Saint')).toThrow(/Analyze it first/);
    (s.g.story as any).npcs[0].analyzed = true; use('The Hollow Saint');
    expect(s.g.story.rulings!.at(-1)!.text).not.toMatch(/has studied/);
    const t = storyWith([{ perks: { true_name: 'mastered' } }]); (t.g.story as any).npcs = [];
    t.act({ type: 'story/perk', charId: t.chars[0].id, id: 'true_name', actionId: 'true_name_story', text: 'The Drowned Bell' } as any);
    expect(t.g.story.rulings!.at(-1)!.text).toMatch(/has studied/);
  });
  it('the card says Analyzed', () => { expect(perkOf('true_name').text).toMatch(/It must have been Analyzed first\./); expect(perkOf('true_name').text).not.toMatch(/decides whether you have studied/); });
});

describe('Crowd Pleaser: a crowd is 3 or more listeners within 8 tiles, out of a fight too (item 1108)', () => {
  const npc = (i: number, pos: string, more: any = {}) => ({ id: 'n' + i, name: 'Local ' + i, side: 'neutral', tier: 'minion', weapon: 'fists', pos, ...more });
  const room = (npcs: any[]) => { const s = storyWith([{ perks: { crowd_pleaser: 'I' } }]), c = s.chars[0]; (s.g.story as any).positions = { ...(s.g.story as any).positions, [c.id]: '5,5' }; (s.g.story as any).npcs = npcs; return { s, c }; };
  it('3 people on the area map within 8 tiles: +2 with no mark from the Narrator', () => {
    const { s, c } = room([npc(1, '6,5'), npc(2, '5,9'), npc(3, '13,5')]);
    expect(storyCheck(s, c.id, ['charisma'])).toMatch(/\+2 Crowd Pleaser/);
    expect(storyCheck(s, c.id, ['athletics'])).not.toMatch(/Crowd Pleaser/); // only when you talk
  });
  it('2 listeners, a third out of earshot, or a third in hiding: no crowd', () => {
    for (const third of [null, npc(3, '14,5'), npc(3, '6,6', { hidden: true })]) {
      const { s, c } = room([npc(1, '6,5'), npc(2, '5,9'), ...(third ? [third] : [])]);
      expect(storyCheck(s, c.id, ['charisma'])).not.toMatch(/Crowd Pleaser/);
    }
  });
  it('the Narrator\'s crowd mark still works where there is no map', () => {
    const { s, c } = room([]);
    expect(storyCheck(s, c.id, ['charisma'], { tags: ['crowd'] })).toMatch(/\+2 Crowd Pleaser/);
  });
  it('both tiers of the card give the numbers', () => { for (const t of ['I', 'II']) expect(perkOf('crowd_pleaser').tiers[t].text).toMatch(/3 or more listeners within 8 tiles/); });
});

describe('Old Tongue II: the being holds its attacks, not its whole turn (item 1109)', () => {
  function parley(speak: boolean) {
    const f = fightWith([{ perks: { old_tongue: 'II' } }], [{ at: 'E6' }]); open(f.cb);
    f.pc.pos = '2,5'; f.foe.pos = '7,5'; f.foe.kind = 'upper_realm'; f.foe.weapon = 'combat_knife'; f.foe.attack = 60; f.turn(f.pc);
    if (speak) f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'old_tongue', actionId: 'speak_fight', targetId: f.foe.id, text: 'We come by cause.' } as any);
    const hp = f.pc.hp, from = f.foe.pos;
    f.cb.turn = f.cb.order.indexOf(f.foe.id); withGame(f.g, () => { beginTurn(f.cb, f.g.rng); enemyTurn(f.cb, f.g.rng); });
    return { f, hurt: hp - f.pc.hp, moved: f.foe.pos !== from };
  }
  it('it walks up but does not strike on the turn it listens; without the parley it walks up and strikes', () => {
    const quiet = parley(true); expect(quiet.moved).toBe(true); expect(quiet.hurt).toBe(0);
    expect(logHas(quiet.f.cb, /holds its attacks/)).toBe(true);
    const loud = parley(false); expect(loud.moved).toBe(true); expect(loud.hurt).toBeGreaterThan(0);
  });
  it('the turn after, it fights again', () => {
    const { f } = parley(true), hp = f.pc.hp;
    withGame(f.g, () => { f.cb.round += 1; f.cb.turn = f.cb.order.indexOf(f.pc.id); beginTurn(f.cb, f.g.rng); f.cb.turn = f.cb.order.indexOf(f.foe.id); f.foe.conds = {}; beginTurn(f.cb, f.g.rng); enemyTurn(f.cb, f.g.rng); });
    expect(f.pc.hp).toBeLessThan(hp);
  });
});

describe('Verse of War: no audit (item 1111)', () => {
  it('the card ends at the bonus', () => { expect(perkOf('verse_of_war').text).toMatch(/\+10% damage\.$/); });
});

// ============================================================================================ 3. the AP perks' cooldown
describe('the AP perks\' cooldown: once every 3 of the holder\'s turns (items 1102 to 1105)', () => {
  it('the number is 3, in the data, flagged provisional', () => { expect(AP_COOLDOWN_TURNS).toBe(3); expect((perksJ as any).rules.ap_cooldown).toMatchObject({ turns: 3, provisional: true }); });
  it('every card it covers says so in plain words', () => {
    for (const id of ['grim_reaper', 'got_you_in_my_sight', 'overruled', 'talks_broke_down', 'sweet_talker']) for (const t of ['I', 'II']) expect(perkOf(id).tiers[t].text, id + ' ' + t).toMatch(/Once every 3 turns\./);
    expect(perkOf('war_footing').text).toMatch(/Once every 3 turns\./);
    expect(traitOf('forlorn_hope').text).toMatch(/Once every 3 turns\./); expect(traitOf('rabbits_foot').text).toMatch(/Vengeful: .*Once every 3 turns\./);
    for (const x of [...['grim_reaper', 'got_you_in_my_sight', 'overruled', 'talks_broke_down', 'sweet_talker', 'war_footing'].map(perkOf), traitOf('forlorn_hope'), traitOf('rabbits_foot')]) expect(x.text).not.toMatch(/provisional|engine|revision|cooldown/i);
  });

  it('Grim Reaper: a kill on turns 1 and 4 gives +2 AP; kills on turns 2 and 3 give nothing; the log says when it is ready', () => {
    const f = fightWith([{ perks: { grim_reaper: 'II' } }], [{ at: 'F4' }, { at: 'F5' }, { at: 'F6' }, { at: 'F7' }]); open(f.cb);
    f.unit(f.pc.id).ps = {}; const gains: number[] = [];
    f.foes.forEach((v) => { v.sv = { body: 50, brain: 50, heart: 50 } as any; });
    for (let r = 1; r <= 4; r++) {
      const u = turnIn(f, f.pc, r); u.attack = 60; u.ammo = 9; const foe = f.foes.find((x) => !x.dead)!; foe.hp = 1; const before = u.ap;
      f.act({ type: 'combat/attack', unitId: u.id, targetId: foe.id, mode: 'shot' } as any);
      expect(f.unit(foe.id).dead).toBe(true); gains.push(f.unit(u.id).ap - before);
    }
    expect(gains[0] - gains[1]).toBe(2); expect(gains[2]).toBe(gains[1]); expect(gains[3]).toBe(gains[0]);
    expect(logHas(f.cb, /Grim Reaper is cooling down\. Ready again in 2 turns\./)).toBe(true);
    expect(logHas(f.cb, /Grim Reaper is cooling down\. Ready again next turn\./)).toBe(true);
  });

  it('Got You in My Sight: +2 AP for an enemy that hides on turns 1 and 4 only; the sneak-attack penalty has its own 3 turns', () => {
    const f = fightWith([{ perks: { got_you_in_my_sight: 'I' } }], [{ at: 'F4' }, { at: 'F5' }, { at: 'F6' }, { at: 'F7' }, { at: 'F8' }]);
    const gains: number[] = [], foes = f.foes;
    for (let r = 1; r <= 4; r++) { const u = turnIn(f, f.pc, r, 'perk:got_you_in_my_sight'), before = u.ap; withGame(f.g, () => hide(f.cb, foes[r - 1])); gains.push(f.unit(u.id).ap - before); }
    expect(gains).toEqual([2, 0, 0, 2]);
    // The penalty: an Ambush that hits in round 5 costs 2 AP on turn 6; another in round 6 costs nothing on turn 7.
    const b = foes[4], sneak = (r: number) => { f.cb.round = r; b.hidden = true; b.hideEntry = 1; b.attack = 60; b.ambushUsed = 0; withGame(f.g, () => { f.cb.turn = f.cb.order.indexOf(f.pc.id); resolveAttack(f.cb, rngFor(10), b, f.pc, 'shot', null, { noAp: true }); }); };
    f.pc.hp = f.pc.maxHp = 5000;
    sneak(5); expect(turnIn(f, f.pc, 6).ap).toBe(4);
    sneak(6); expect(turnIn(f, f.pc, 7).ap).toBe(6);
    expect(f.cb.log.filter((l) => /caught by a sneak attack/.test(l)).length).toBe(1);
  });

  it('Overruled!: +2 AP on turns 1 and 4 while your debuff holds; the penalty for carrying one is counted by itself', () => {
    const f = fightWith([{ perks: { overruled: 'I' } }], [{ at: 'F6' }]); open(f.cb); const foe = f.foe;
    withGame(f.g, () => applyCond(f.cb, rng(), f.pc, foe, 'ldebuff', 99, undefined, { skipSave: true }));
    expect([1, 2, 3, 4].map((r) => turnIn(f, f.pc, r, 'perk:overruled').ap)).toEqual([8, 6, 6, 8]);
    withGame(f.g, () => applyCond(f.cb, rng(), null, f.pc, 'ldebuff', 99, undefined, { skipSave: true }));
    // turn 5: the bonus is cooling (it came on turn 4), the penalty is fresh: −2. Turn 7: the bonus is back, the penalty is cooling: +2.
    expect([5, 6, 7, 8].map((r) => turnIn(f, f.pc, r).ap)).toEqual([4, 6, 8, 4]);
  });

  for (const [tier, n] of [['I', 2], ['II', 3]] as const) it('Sweet Talker ' + tier + ': +' + n + ' AP for a debuff on someone you charmed, on turns 1 and 4 only', () => {
    const f = fightAfter([{ perks: { sweet_talker: tier } }], [{ name: 'Vel', at: 'F6' }], (s) => storyCheck(s, s.chars[0].id, ['implication'], { auto: 'success', target: 'Vel' }));
    open(f.cb); const foe = f.foes[0], gains: number[] = [];
    for (let r = 1; r <= 4; r++) { const u = turnIn(f, f.pc, r, 'perk:sweet_talker'), before = u.ap; foe.conds = {}; withGame(f.g, () => applyCond(f.cb, rng(), f.unit(u.id), foe, 'shaken', 2, undefined, { skipSave: true })); gains.push(f.unit(u.id).ap - before); }
    expect(gains).toEqual([n, 0, 0, n]);
  });
  it('Sweet Talker I: the betrayal stings once every 3 turns', () => {
    const f = fightAfter([{ perks: { sweet_talker: 'I' } }], [{ name: 'Vel', at: 'F6' }], (s) => storyCheck(s, s.chars[0].id, ['implication'], { auto: 'success', target: 'Vel' }));
    const foe = f.foes[0], sting = () => { f.pc.conds = {}; withGame(f.g, () => applyCond(f.cb, rng(), foe, f.pc, 'shaken', 1, undefined, { skipSave: true })); };
    turnIn(f, f.pc, 1, 'perk:sweet_talker'); sting(); expect(turnIn(f, f.pc, 2).ap).toBe(4);
    sting(); expect(turnIn(f, f.pc, 3).ap).toBe(6); sting(); expect(turnIn(f, f.pc, 4).ap).toBe(6);
    sting(); expect(turnIn(f, f.pc, 5).ap).toBe(4);
  });

  it('War Footing: one enemy loses 2 AP, then no enemy does for the holder\'s next 2 turns', () => {
    const f = fightWith([{ perks: { war_footing: 'ultimate' } }], [{ at: 'F6' }, { at: 'F8' }]); open(f.cb);
    f.pc.pos = '1,5'; const [a, b] = f.foes; a.pos = '5,5'; b.pos = '5,7';
    const step = (v: Unit, to: string, r: number) => { f.cb.round = r; f.cb.turn = f.cb.order.indexOf(v.id); v.ap = 6; v.movement = 4; const before = v.ap; withGame(f.g, () => moveUnit(f.cb, v, to)); return before - v.ap; };
    const walk = step(a, '2,5', 1) - 2; expect(walk).toBeGreaterThanOrEqual(0); // the first: the walk plus 2
    expect(step(b, '2,6', 1)).toBeLessThan(2 + walk + 1); // the second enemy, same round: only its walk
    const lines = () => f.cb.log.filter((l) => /War Footing/.test(l)).length; expect(lines()).toBe(1);
    a.pos = '5,5'; step(a, '2,4', 2); a.pos = '5,5'; step(a, '2,4', 3); expect(lines()).toBe(1);
    a.pos = '5,5'; step(a, '2,4', 4); expect(lines()).toBe(2);
  });

  it('Forlorn Hope: closing in every turn pays +2 AP on turns 2 and 5, not 3 and 4', () => {
    const f = fightWith([{ traits: ['forlorn_hope'], kit: 'soldier' }], [{ at: 'O6' }]); open(f.cb); f.pc.pos = '1,5';
    const aps: number[] = [];
    for (let r = 1; r <= 5; r++) {
      const u = turnIn(f, f.pc, r, 'trait:forlorn_hope'); aps.push(u.ap);
      f.act({ type: 'combat/move', unitId: u.id, to: (1 + r) + ',5' } as any);
      withGame(f.g, () => emit(f.cb, 'turn_end', { u: f.unit(u.id), cb: f.cb, rng: f.g.rng }));
    }
    expect(aps).toEqual([6, 8, 6, 6, 8]);
  });

  it('Rabbit\'s Foot, Vengeful: an ally Downed pays +2 AP on your next turn, once every 3 turns', () => {
    const f = fightWith([{ traits: ['rabbits_foot'] }, {}, {}, {}], [{ at: 'P6' }]); const [me, a, b, c] = f.pcs, foe = f.foe;
    const down = (v: Unit, r: number) => { f.cb.round = r; f.cb.turn = f.cb.order.indexOf(me.id); withGame(f.g, () => applyDamage(f.cb, f.unit(v.id), 99999, { type: 'weapon', by: f.unit(foe.id) })); expect(f.unit(v.id).downed || f.unit(v.id).dead).toBeTruthy(); };
    turnIn(f, me, 1, 'trait:rabbits_foot');
    down(a, 1); expect(turnIn(f, me, 2).ap).toBe(8);
    down(b, 2); expect(turnIn(f, me, 3).ap).toBe(6); expect(turnIn(f, me, 4).ap).toBe(6);
    down(c, 4); expect(turnIn(f, me, 5).ap).toBe(8);
  });

  it('what it leaves alone: Southern Fist still gives its +1 AP every turn, and Outclassed its +3 once a fight', () => {
    const f = fightWith([{ traits: ['southern_fist'], weapon: 'fists' }], [{ at: 'P6' }]);
    f.pc.weapon = 'fists'; delete (f.pc as any).offWeapon;
    expect([1, 2, 3].map((r) => turnIn(f, f.pc, r).ap)).toEqual([7, 7, 7]);
  });
});
