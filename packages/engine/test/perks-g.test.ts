// Lane G: story perks and dialogue traits (src/perks/g.ts) and the Narrator briefs (src/perks/briefs.ts). Each item is
// shown working in play through the reducer (story/perk, narrator/turn, check/roll, voice/ask, overreach/choose,
// combat/perk, combat/attack, combat/parley, combat/analyze), with the game bound only where an engine hook is read
// directly (notice, the enemy AI).
import { describe, expect, it } from 'vitest';
import { votesOf, rerollFrom, d20, emitStory, enemyTurn, holderOf, briefOf, perkActionsFor, previewAttack, coverageReport, condOn, type Unit, type Combat, type GameState, type Character } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
type S = ReturnType<typeof storyWith>;
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
const pcAct = (f: F, a: any, u?: Unit) => f.act({ unitId: (u || f.pc).id, ...a });
const weak = (u: Unit) => { u.sv = { body: -40, brain: -40, heart: -40 } as any; };
function fight(specs: any[], foes: any[] = [{}]) {
  const f = fightWith(specs, foes.map((x, i) => ({ at: 'E6', ...x, name: x.name || 'Foe ' + (i + 1) })));
  open(f.cb); f.pcs.forEach((u, i) => { if (!u.companion) u.pos = '2,' + (5 + i); });
  f.foes.forEach((u, i) => { u.pos = (4 + i) + ',5'; });
  f.turn(f.pc); f.pc.ap = 9;
  return f;
}
function storyCheck(s: S, charId: string, skills: string[], extra: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Try it.', checks: [{ charId, skills, tn: 12, stakes: 'It works.', ...extra }] } } as any);
  const ck = s.g.checks.at(-1)!;
  return { ck, roll: (n?: number) => { if (n) s.g.rng = rngFor(n); s.act({ type: 'check/roll', checkId: ck.id }); return s.g.story.entries.filter((e) => e.kind === 'check').at(-1)!.head!; }, now: () => s.g.checks.find((k) => k.id === ck.id)! };
}
const perk = (s: S, c: Character, id: string, a: any = {}) => s.act({ type: 'story/perk', charId: c.id, id, ...a } as any);
const rulings = (g: GameState, key: string) => (g.story.rulings || []).filter((r) => r.key === key);
const turn = (s: S, t: any) => s.act({ type: 'narrator/turn', turn: { narration: 'On.', ...t } } as any);
const brief = (g: GameState, c: Character, key: string) => withGame(g, () => briefOf(holderOf({ c: g.characters[c.id] }, key)!));
const live = (s: S, c: Character) => s.g.characters[c.id];
const notes = (f: F) => (f.cb.notes || []).join('\n');

describe('lane G coverage', () => {
  it('no effect of a lane G item is a gap', () => {
    const ids = 'bedside_manner footnote burden_of_proof detectives_eye crowd_pleaser double_meaning old_tongue real_power established_fact closing_argument everyones_friend their_own_idea foreseen cultured cold_read what_could_be every_lie_is_a_door gambler crowded_head cover_story cold_case interrogator holo_drama_addict born_performer'.split(' ');
    const gaps = coverageReport().filter((r) => ids.includes(r.key.split(':')[1]) && r.owner === 'gap');
    expect(gaps).toEqual([]);
  });
});

describe('Bedside Manner', () => {
  it('I: a touch owes a private, truthful lie-or-not line; the Narrator answers in perkLines', () => {
    const s = storyWith([{ perks: { bedside_manner: 'I' } }]); const c = s.chars[0];
    perk(s, c, 'bedside_manner', { npc: 'The foreman', text: 'shakes his hand' });
    const r = rulings(s.g, 'perk:bedside_manner')[0];
    expect(r.text).toMatch(/next statement is a lie/); expect(r.text).not.toMatch(/afraid/);
    turn(s, { perkLines: [{ charId: c.id, key: 'perk:bedside_manner', text: 'He is lying.' }] });
    const e = s.g.story.entries.at(-1)!; expect(e.head).toMatch(/BEDSIDE MANNER · ONLY YOU/); expect(e.to).toBe(c.owner);
  });
  it('II: also whether they are afraid, and of whom', () => {
    const s = storyWith([{ perks: { bedside_manner: 'II' } }]); const c = s.chars[0];
    perk(s, c, 'bedside_manner', { text: 'The foreman' });
    expect(rulings(s.g, 'perk:bedside_manner')[0].text).toMatch(/afraid, and of whom/);
  });
});

describe('Footnote', () => {
  it('I: once a scene; an ally check the Narrator ties to the fact gets +1, the citer\'s own does not', () => {
    const s = storyWith([{ perks: { footnote: 'I' } }, {}]); const [a, b] = s.chars;
    perk(s, a, 'footnote', { text: 'The seals on this door are pre-Collapse.' });
    expect(() => perk(s, a, 'footnote', { text: 'Again.' })).toThrow();
    expect(storyCheck(s, b.id, ['analysis'], { footnote: a.id }).roll(10)).toMatch(/\+1 Footnote/);
    expect(storyCheck(s, a.id, ['analysis'], { footnote: a.id }).roll(10)).not.toMatch(/Footnote/);
    turn(s, { sceneTitle: 'Next scene' });
    expect(storyCheck(s, b.id, ['analysis'], { footnote: a.id }).roll(10)).not.toMatch(/Footnote/);
  });
  it('II: +2', () => {
    const s = storyWith([{ perks: { footnote: 'II' } }, {}]); const [a, b] = s.chars;
    perk(s, a, 'footnote', { text: 'Fact.' });
    expect(storyCheck(s, b.id, ['analysis'], { applies: ['footnote'] }).roll(10)).toMatch(/\+2 Footnote/);
  });
  it('combat: once a fight, allies (not the citer) get +1 to hit the cited enemy this round', () => {
    const f = fight([{ perks: { footnote: 'I' } }, {}]); const ally = f.pcs[1]; ally.ap = 9;
    const before = withGame(f.g, () => previewAttack(f.cb, ally, f.foe, 'shot')).toHit;
    pcAct(f, { type: 'combat/perk', id: 'footnote', actionId: 'cite_fight', targetId: f.foe.id, text: 'Its armour plates are glued, not welded.' });
    f.unit(ally.id).ap = 9;
    const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(ally.id), f.foe, 'shot'));
    expect(pv.toHit).toBe(before + 1); expect(pv.terms!.some((t) => t.label === 'Footnote')).toBe(true);
    expect(withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot')).terms!.some((t) => t.label === 'Footnote')).toBe(false);
    expect(notes(f)).toMatch(/glued/);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'footnote', actionId: 'cite_fight', targetId: f.foe.id })).toThrow();
  });
});

describe('Burden of Proof', () => {
  it('I: a demand for evidence: no evidence, no check; II: onlookers shift', () => {
    const s = storyWith([{ perks: { burden_of_proof: 'I' } }, { perks: { burden_of_proof: 'II' } }]);
    perk(s, s.chars[0], 'burden_of_proof', { text: 'Show me the ledger, then.' });
    expect(rulings(s.g, 'perk:burden_of_proof')[0].text).toMatch(/call no check/);
    perk(s, s.chars[1], 'burden_of_proof', { text: 'Proof?' });
    expect(rulings(s.g, 'perk:burden_of_proof')[1].text).toMatch(/onlooker shifts/);
  });
});

describe('Detective\'s Eye', () => {
  it('I: one detail is owed every scene until the Narrator delivers it in perkLines', () => {
    const s = storyWith([{ perks: { detectives_eye: 'I' } }]); const c = s.chars[0];
    expect(brief(s.g, c, 'perk:detectives_eye')).toMatch(/owed this scene: one out-of-place detail/);
    turn(s, { perkLines: [{ charId: c.id, key: 'perk:detectives_eye', text: 'The ash tray is warm.' }] });
    expect(brief(s.g, c, 'perk:detectives_eye')).toMatch(/served/);
    turn(s, { sceneTitle: 'Another room' });
    expect(brief(s.g, c, 'perk:detectives_eye')).toMatch(/owed/);
  });
  it('II: two details and whether connected; combat: two weak points read at the start, connected or not', () => {
    const s = storyWith([{ perks: { detectives_eye: 'II' } }]);
    expect(brief(s.g, s.chars[0], 'perk:detectives_eye')).toMatch(/two out-of-place details/);
    const f = fightWith([{ perks: { detectives_eye: 'II' } }], [{ at: 'H6' }, { at: 'H8' }]);
    expect(f.foes.filter((u) => u.weakPoint && u.analyzedBy).length).toBe(2);
    expect(logHas(f.cb, /Detective's Eye.*(not connected|connected)/)).toBe(true);
  });
  it('I in combat: one enemy\'s weak point', () => {
    const f = fightWith([{ perks: { detectives_eye: 'I' } }], [{ at: 'H6' }, { at: 'H8' }]);
    expect(f.foes.filter((u) => u.weakPoint).length).toBe(1);
  });
});

describe('Crowd Pleaser', () => {
  it('I: +2 Charisma on a crowd check, not on other checks', () => {
    const s = storyWith([{ perks: { crowd_pleaser: 'I' } }]); const c = s.chars[0];
    expect(storyCheck(s, c.id, ['charisma'], { tags: ['crowd'] }).roll(10)).toMatch(/\+2 Crowd Pleaser/);
    expect(storyCheck(s, c.id, ['charisma']).roll(10)).not.toMatch(/Crowd Pleaser/);
  });
  it('II: a won crowd can be turned against one named person', () => {
    const s = storyWith([{ perks: { crowd_pleaser: 'II' } }]); const c = s.chars[0];
    storyCheck(s, c.id, ['charisma'], { tags: ['crowd'] }).roll(20);
    expect(rulings(s.g, 'perk:crowd_pleaser')[0].text).toMatch(/turn it against one named person/);
  });
  it('combat: a threat heard by 3+ enemies is one roll for all of them', () => {
    const f = fight([{ perks: { crowd_pleaser: 'I' } }], [{}, {}, {}]); f.foes.forEach(weak); f.g.rng = rngFor(5);
    pcAct(f, { type: 'combat/parley', targetId: f.foes[0].id, kind: 'threaten', text: 'All of you. Down.' });
    expect(f.foes.every((u) => condOn(u, 'shaken'))).toBe(true);
    expect(logHas(f.cb, /Crowd Pleaser: one roll for all 3/)).toBe(true);
  });
});

describe('Double Meaning', () => {
  it('I story: after the sentence, a squad check tagged hinted gets +2 (any squad member); none without it', () => {
    const s = storyWith([{ perks: { double_meaning: 'I' } }, {}]); const [a, b] = s.chars;
    expect(storyCheck(s, b.id, ['dexterity'], { tags: ['hinted'] }).roll(10)).not.toMatch(/Double Meaning/);
    perk(s, a, 'double_meaning', { text: 'Lovely weather for a picnic by the generator.' });
    expect(rulings(s.g, 'perk:double_meaning')[0].text).toMatch(/hidden instruction/);
    expect(storyCheck(s, b.id, ['dexterity'], { tags: ['hinted'] }).roll(10)).toMatch(/\+2 Double Meaning/);
  });
  it('I combat: once a round, each squad member\'s next attack on the named enemy gets +2', () => {
    const f = fight([{ perks: { double_meaning: 'I' } }]); f.pc.attack = 60;
    pcAct(f, { type: 'combat/perk', id: 'double_meaning', actionId: 'hint_fight', targetId: f.foe.id });
    expect(withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot')).terms!.some((t) => t.label === 'Double Meaning' && t.v === 2)).toBe(true);
    pcAct(f, { type: 'combat/attack', targetId: f.foe.id, mode: 'shot' });
    expect(withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot')).terms!.some((t) => t.label === 'Double Meaning')).toBe(false);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'double_meaning', actionId: 'hint_fight', targetId: f.foe.id })).toThrow();
  });
  it('II combat: another enemy who heard it acts on the false meaning and loses its first action', () => {
    const f = fight([{ perks: { double_meaning: 'II' } }], [{}, {}]);
    pcAct(f, { type: 'combat/perk', id: 'double_meaning', actionId: 'hint_fight', targetId: f.foes[0].id });
    const other = f.foes[1]; f.cb.turn = f.cb.order.indexOf(other.id); other.ap = 6;
    withGame(f.g, () => enemyTurn(f.cb, f.g.rng));
    expect(logHas(f.cb, new RegExp(other.name + ' acts on the false meaning'))).toBe(true);
  });
});

describe('Old Tongue', () => {
  it('I: an ancient-script check is an automatic success; no speaking yet', () => {
    const s = storyWith([{ perks: { old_tongue: 'I' } }]); const c = s.chars[0];
    const k = storyCheck(s, c.id, ['lore_master'], { tags: ['ancient_script'] }); const head = k.roll(1);
    expect(head).toMatch(/OLD TONGUE/); expect(k.now().roll!.ok).toBe(true);
    expect(perkActionsFor({ c: live(s, c), g: s.g }, 'story').some((x) => x.actionId === 'speak')).toBe(false);
  });
  it('II story: speak it, once per being', () => {
    const s = storyWith([{ perks: { old_tongue: 'II' } }]); const c = s.chars[0];
    perk(s, c, 'old_tongue', { actionId: 'speak', npc: 'The Pale Arbiter' });
    expect(rulings(s.g, 'perk:old_tongue')[0].text).toMatch(/parleys/);
    expect(() => perk(s, c, 'old_tongue', { actionId: 'speak', npc: 'The Pale Arbiter' })).toThrow(/once already/);
  });
  it('II combat: an upper-realm being holds its attacks on its next turn while it listens', () => {
    const f = fight([{ perks: { old_tongue: 'II' } }]); const t = f.foe;
    expect(() => pcAct(f, { type: 'combat/perk', id: 'old_tongue', actionId: 'speak_fight', targetId: t.id })).toThrow(/no upper-realm/);
    f.foe.kind = 'upper_realm';
    pcAct(f, { type: 'combat/perk', id: 'old_tongue', actionId: 'speak_fight', targetId: t.id, text: 'We come by cause.' });
    const foe = f.foe; f.cb.turn = f.cb.order.indexOf(foe.id); foe.ap = 6; const hp = f.pc.hp;
    withGame(f.g, () => enemyTurn(f.cb, f.g.rng));
    expect(logHas(f.cb, /listens \(Old Tongue\)/)).toBe(true); expect(f.pc.hp).toBe(hp);
    expect(notes(f)).toMatch(/parleys/);
  });
});

describe('Real Power', () => {
  it('I: who really runs it, once per organisation; II: and they agree to see you', () => {
    const s = storyWith([{ perks: { real_power: 'I' } }, { perks: { real_power: 'II' } }]);
    perk(s, s.chars[0], 'real_power', { text: 'The Dock Guild' });
    expect(rulings(s.g, 'perk:real_power')[0].text).not.toMatch(/agrees to see/);
    expect(() => perk(s, s.chars[0], 'real_power', { text: 'the dock guild' })).toThrow(/already know/);
    perk(s, s.chars[1], 'real_power', { text: 'The Dock Guild' });
    expect(rulings(s.g, 'perk:real_power')[1].text).toMatch(/agrees to see them/);
  });
});

describe('Established Fact', () => {
  it('once a session; the guardrails go with it; a refusal gives the use back', () => {
    const s = storyWith([{ perks: { established_fact: 'mastered' } }]); const c = s.chars[0];
    perk(s, c, 'established_fact', { text: 'Rimworld reactors vent every six hours.' });
    const r = rulings(s.g, 'perk:established_fact')[0]; expect(r.text).toMatch(/Veil/);
    expect(() => perk(s, c, 'established_fact', { text: 'Another.' })).toThrow();
    turn(s, { perkRulings: [{ id: r.id, accepted: false }] });
    perk(s, c, 'established_fact', { text: 'A better fact.' });
    expect(rulings(s.g, 'perk:established_fact').length).toBe(1);
  });
  it('in a fight it goes to the fight notes and spends the session\'s use', () => {
    const f = fight([{ perks: { established_fact: 'mastered' } }]);
    pcAct(f, { type: 'combat/perk', id: 'established_fact', text: 'These drones share one relay.' });
    expect(notes(f)).toMatch(/one relay/);
  });
});

describe('Closing Argument', () => {
  it('once a scene: a pending Eloquence check on the point succeeds without the die', () => {
    const s = storyWith([{ perks: { closing_argument: 'mastered' } }]); const c = s.chars[0];
    const k = storyCheck(s, c.id, ['eloquence']);
    perk(s, c, 'closing_argument', { text: 'If the gate opens, the whole ward drowns. You know it.' });
    expect(k.roll(1)).toMatch(/SUCCESS \(AUTO\)/);
    expect(rulings(s.g, 'perk:closing_argument')[0].text).toMatch(/fear or faith/);
    expect(() => perk(s, c, 'closing_argument', { text: 'Again.' })).toThrow();
  });
});

describe('Everyone\'s Friend', () => {
  it('once a scene: the friend\'s first lie lands (button), once', () => {
    const s = storyWith([{ perks: { everyones_friend: 'mastered' } }]); const c = s.chars[0];
    expect(perkActionsFor({ c: live(s, c), g: s.g }, 'story').some((x) => x.actionId === 'first_lie')).toBe(false);
    perk(s, c, 'everyones_friend', { actionId: 'befriend', npc: 'Old Maro' });
    const k = storyCheck(s, c.id, ['charisma']);
    perk(s, c, 'everyones_friend', { actionId: 'first_lie', checkId: k.ck.id });
    expect(k.roll(1)).toMatch(/SUCCESS \(AUTO\)/);
    const k2 = storyCheck(s, c.id, ['charisma']);
    expect(() => perk(s, c, 'everyones_friend', { actionId: 'first_lie', checkId: k2.ck.id })).toThrow(/spent/);
    expect(brief(s.g, c, 'perk:everyones_friend')).toMatch(/Old Maro is a trusted friend/);
  });
  it('the Narrator\'s lie tag on a check at the friend lands the same way', () => {
    const s = storyWith([{ perks: { everyones_friend: 'mastered' } }]); const c = s.chars[0];
    perk(s, c, 'everyones_friend', { actionId: 'befriend', npc: 'Old Maro' });
    expect(storyCheck(s, c.id, ['charisma'], { tags: ['lie'], target: 'Old Maro' }).roll(2)).toMatch(/EVERYONE'S FRIEND.*SUCCESS \(AUTO\)/);
  });
});

describe('Their Own Idea', () => {
  it('once a scene; the suggestion is private to the player; an ordinary listener takes it', () => {
    const s = storyWith([{ perks: { their_own_idea: 'mastered' } }, {}]); const c = s.chars[0];
    perk(s, c, 'their_own_idea', { npc: 'The clerk', text: 'the back door is the safer way out' });
    const e = s.g.story.entries.filter((x) => /Their Own Idea/.test(x.head || '')).at(-1)!; expect(e.to).toBe(c.owner);
    expect(rulings(s.g, 'perk:their_own_idea')[0].text).toMatch(/harm them directly/);
    expect(() => perk(s, c, 'their_own_idea', { npc: 'The clerk', text: 'again' })).toThrow();
  });
  it('PROVISIONAL: an important listener on the map makes a Heart save the engine rolls; Celestials are beyond it', () => {
    const s = storyWith([{ perks: { their_own_idea: 'mastered' } }]); const c = s.chars[0];
    turn(s, { npcs: [{ action: 'place', id: 'boss1', name: 'Warden Kost', side: 'neutral', tier: 'boss', weapon: 'service_pistol', at: 'H6' }, { action: 'place', id: 'cel', name: 'The Lantern', side: 'neutral', tier: 'boss', weapon: 'service_pistol', at: 'H8', kind: 'celestial' }] });
    expect(() => perk(s, c, 'their_own_idea', { npc: 'The Lantern', text: 'leave' })).toThrow(/Accords/);
    s.g.rng = rngFor(20); perk(s, c, 'their_own_idea', { npc: 'Warden Kost', text: 'open the cells' });
    expect(s.g.story.entries.some((x) => /THEIR OWN IDEA · WARDEN KOST HEART SAVE D20 20.*RESISTS/.test(x.head || ''))).toBe(true);
    expect(rulings(s.g, 'perk:their_own_idea').length).toBe(0);
  });
});

describe('Foreseen', () => {
  it('once a session: the room votes (solo: at once) to go back to before the Narrator\'s turn; the rewind undoes HP and dice; the use stays spent', () => {
    const s = storyWith([{ perks: { foreseen: 'mastered' } }]); const c = s.chars[0];
    const before = JSON.parse(JSON.stringify(s.g)), hp = s.g.characters[c.id].hp;
    s.act({ type: 'narrator/turn', turn: { narration: 'The broker sells you out.', harm: [{ charId: c.id, amount: 30, why: 'an ambush' }] } } as any);
    expect(s.g.characters[c.id].hp).toBe(hp - 30);
    const turn = votesOf(s.g).turns.at(-1)!;
    perk(s, c, 'foreseen', { text: 'We trusted the broker.' });
    const v = votesOf(s.g).open!;
    expect(v.status).toBe('passed'); expect(v.foresee?.charId).toBe(c.id); expect(v.entryId).toBe(turn); expect(v.note).toMatch(/would have happened/);
    // The host's client keeps the copy from before the turn; the reroll machinery restores it.
    const back = rerollFrom(s.g, { ...before, votes: { ...votesOf(before), turns: [] } }, v.note);
    expect(back.characters[c.id].hp).toBe(hp);
    s.g = back;
    expect(() => perk(s, c, 'foreseen', { text: 'Again.' })).toThrow(/Used|no Narrator turn/);
  });
  it('co-op: another player can veto the rewind', () => {
    const s = storyWith([{ perks: { foreseen: 'mastered' } }, { owner: 'p2' }, { owner: 'p2' }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'It goes wrong.' } } as any);
    perk(s, c, 'foreseen', { text: 'The vote.' });
    expect(votesOf(s.g).open!.status).toBe('open');
    s.act({ type: 'vote/cast', yes: false } as any, 'p2');
    expect(votesOf(s.g).open!.status).toBe('failed');
  });
});

describe('Cultured', () => {
  it('+1 Ingenuity or Charisma when the talk turns to culture, once on a combined check', () => {
    const s = storyWith([{ perks: { cultured: 'achieved' } }]); const c = s.chars[0];
    expect(storyCheck(s, c.id, ['charisma'], { tags: ['culture'] }).roll(10)).toMatch(/\+1 Cultured/);
    const head = storyCheck(s, c.id, ['charisma', 'ingenuity'], { tags: ['history'] }).roll(10);
    expect(head.match(/Cultured/g)!.length).toBe(1);
    expect(storyCheck(s, c.id, ['charisma']).roll(10)).not.toMatch(/Cultured/);
  });
});

describe('Cold Read', () => {
  it('combat: analyzing a person owes what they want most in the fight report', () => {
    const f = fight([{ perks: { cold_read: 'achieved' } }]);
    pcAct(f, { type: 'combat/analyze', targetId: f.foe.id });
    expect(notes(f)).toMatch(/Cold Read.*wants most/);
  });
  it('story: a successful Analysis check owes it too', () => {
    const s = storyWith([{ perks: { cold_read: 'achieved' } }]); const c = s.chars[0];
    storyCheck(s, c.id, ['analysis'], { target: 'The broker' }).roll(20);
    expect(rulings(s.g, 'perk:cold_read')[0].text).toMatch(/what The broker wants most/);
  });
});

describe('What Could Be', () => {
  it('once a session, a private vision of the best reachable outcome', () => {
    const s = storyWith([{ perks: { what_could_be: 'achieved' } }]); const c = s.chars[0];
    perk(s, c, 'what_could_be', { text: 'Do we sell the core?' });
    expect(rulings(s.g, 'perk:what_could_be')[0].text).toMatch(/best outcome within reach/);
    expect(() => perk(s, c, 'what_could_be', { text: 'Again' })).toThrow();
  });
});

describe('Every Lie Is a Door', () => {
  it('once a session: believed (no notice while sneaking) until a fight starts', () => {
    const s = storyWith([{ perks: { every_lie_is_a_door: 'ultimate' } }]); const c = s.chars[0];
    perk(s, c, 'every_lie_is_a_door', { text: 'Inspector from the water board.' });
    expect(live(s, c).state!.lie_door).toMatch(/water board/);
    const ctx: any = withGame(s.g, () => emitStory(s.g, 'notice', { c: live(s, c), npc: {}, range: 5, dark: false, g: s.g }));
    expect(ctx.range).toBe(0);
    expect(() => perk(s, c, 'every_lie_is_a_door', { text: 'Again.' })).toThrow();
    turn(s, { combat: { name: 'Caught', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Guard', tier: 'soldier', weapon: 'service_pistol', at: '' }] } });
    expect(live(s, c).state?.lie_door).toBeUndefined();
  });
});

describe('Gambler', () => {
  it('story: Double or Nothing turns a success into a critical success, once a scene; an Echo reroll keeps it', () => {
    const s = storyWith([{ traits: ['gambler'] }]); const c = s.chars[0];
    const k = storyCheck(s, c.id, ['charisma']); perk(s, c, 'gambler', { checkId: k.ck.id });
    expect(k.roll(19)).toMatch(/DOUBLE OR NOTHING: CRITICAL SUCCESS/); expect(k.now().roll!.crit).toBe(true);
    const k2 = storyCheck(s, c.id, ['charisma']);
    expect(() => perk(s, c, 'gambler', { checkId: k2.ck.id })).toThrow();
  });
  it('story: a failure becomes a critical failure (a complication); the Narrator\'s double spends the scene\'s use', () => {
    const s = storyWith([{ traits: ['gambler'] }]); const c = s.chars[0];
    const k = storyCheck(s, c.id, ['charisma'], { double: true });
    expect(k.roll(2)).toMatch(/CRITICAL FAILURE/); expect(k.now().roll!.fumble).toBe(true);
    const k2 = storyCheck(s, c.id, ['charisma'], { double: true }); expect(k2.ck.double).toBeUndefined();
  });
  it('combat: the toggle makes a hit a critical, and a miss jams the gun', () => {
    const f = fight([{ traits: ['gambler'] }]); f.pc.attack = 60; f.g.rng = rngFor(10);
    pcAct(f, { type: 'combat/attack', targetId: f.foe.id, mode: 'shot', mods: ['trait:gambler#double'] });
    expect(logHas(f.cb, /CRITICAL/)).toBe(true);
    const g = fight([{ traits: ['gambler'] }]); g.pc.attack = -60; g.g.rng = rngFor(10);
    pcAct(g, { type: 'combat/attack', targetId: g.foe.id, mode: 'shot', mods: ['trait:gambler#double'] });
    expect(g.pc.jammed || (g.pc as any).stunnedNext === 1).toBe(true);
    expect(logHas(g.cb, /double or nothing and loses/)).toBe(true);
  });
});

describe('Crowded Head', () => {
  it('Chorus: four voice lines a beat, each skill asked twice a scene', () => {
    const skills = { charisma: 4, eloquence: 4, empathy: 4, analysis: 4, composure: 4 };
    const s = storyWith([{ traits: ['crowded_head'], skills }, { skills }]); const [a, b] = s.chars;
    turn(s, { hooks: ['charisma', 'eloquence', 'empathy', 'analysis', 'composure'].map((sk) => ({ skill: sk, tn: 8, truth: 'true', line: sk + ' speaks.' })) });
    const heard = (c: Character) => s.g.story.entries.filter((e) => e.kind === 'voice' && e.charId === c.id && /PASSIVE/.test(e.head || '')).length;
    expect(heard(a)).toBe(4); expect(heard(b)).toBe(2);
    s.act({ type: 'voice/ask', charId: a.id, skill: 'analysis' }); s.act({ type: 'voice/ask', charId: a.id, skill: 'analysis' });
    expect(() => s.act({ type: 'voice/ask', charId: a.id, skill: 'analysis' })).toThrow();
    s.act({ type: 'voice/ask', charId: b.id, skill: 'analysis' });
    expect(() => s.act({ type: 'voice/ask', charId: b.id, skill: 'analysis' })).toThrow();
  });
  it('Cacophony: resisting an Overreach costs 1 more Echo; the twisted line is the Narrator\'s, once a session', () => {
    const s = storyWith([{ traits: ['crowded_head'], skills: { charisma: 5 } }]); const c = s.chars[0];
    live(s, c).echo = 3;
    turn(s, { overreach: [{ charId: c.id, skill: 'charisma', push: 'Say it. Say the cruel thing.' }] });
    s.act({ type: 'overreach/choose', id: s.g.overreach.at(-1)!.id, choice: 'resist' });
    expect(live(s, c).echo).toBe(1);
    expect(brief(s.g, c, 'trait:crowded_head')).toMatch(/twist one true voice line/);
    turn(s, { traitState: [{ charId: c.id, key: 'mislead_used', value: true }] });
    expect(brief(s.g, c, 'trait:crowded_head')).toMatch(/used this session/);
  });
});

describe('Cover Story', () => {
  it('New Name: an identity held until a failed roll; three burned identities owe an old con', () => {
    const s = storyWith([{ traits: ['cover_story'] }]); const c = s.chars[0];
    for (let i = 0; i < 3; i++) {
      perk(s, c, 'cover_story', { text: 'Name ' + i + ', a grain buyer from the rim.' });
      expect(live(s, c).state!.identity).toMatch(/Name/);
      storyCheck(s, c.id, ['charisma']).roll(2);
      expect(rulings(s.g, 'trait:cover_story').some((r) => /the cover is burned/.test(r.text))).toBe(true);
      turn(s, { traitState: [{ charId: c.id, key: 'identity', value: null }] });
      s.g.sessionN = (s.g.sessionN || 1) + 1; // next session: a new New Name
    }
    expect(brief(s.g, c, 'trait:cover_story')).toMatch(/burned 3\/3; owed: someone from an old con/);
    turn(s, { traitState: [{ charId: c.id, key: 'old_con', value: true }] });
    expect(brief(s.g, c, 'trait:cover_story')).not.toMatch(/owed/);
  });
  it('once a session', () => {
    const s = storyWith([{ traits: ['cover_story'] }]); const c = s.chars[0];
    perk(s, c, 'cover_story', { text: 'A buyer.' });
    expect(() => perk(s, c, 'cover_story', { text: 'Another.' })).toThrow();
  });
});

describe('Cold Case', () => {
  it('Case File: one true yes/no a session, privately', () => {
    const s = storyWith([{ traits: ['cold_case'] }]); const c = s.chars[0];
    perk(s, c, 'cold_case', { text: 'Was the broker in the room?' });
    expect(rulings(s.g, 'trait:cold_case')[0].text).toMatch(/truthfully/);
    expect(() => perk(s, c, 'cold_case', { text: 'Again?' })).toThrow();
  });
  it('Obsession: −1 on rolls in scenes unrelated to an open case; none in related ones; reset by a new scene', () => {
    const s = storyWith([{ traits: ['cold_case'] }]); const c = s.chars[0];
    expect(storyCheck(s, c.id, ['charisma']).roll(10)).not.toMatch(/Obsession/);
    turn(s, { traitState: [{ charId: c.id, key: 'case_open', value: true }] });
    expect(storyCheck(s, c.id, ['charisma']).roll(10)).toMatch(/−1 Obsession/);
    expect(storyCheck(s, c.id, ['charisma'], { tags: ['case_related'] }).roll(10)).not.toMatch(/Obsession/);
    turn(s, { traitState: [{ charId: c.id, key: 'case_related', value: true }] });
    expect(storyCheck(s, c.id, ['charisma']).roll(10)).not.toMatch(/Obsession/);
    turn(s, { sceneTitle: 'Elsewhere' });
    expect(storyCheck(s, c.id, ['charisma']).roll(10)).toMatch(/Obsession/);
  });
  it('combat: Analyze costs 1 AP less; an unrelated fight is −1 to hit', () => {
    const s = storyWith([{ traits: ['cold_case'] }, {}]);
    turn(s, { traitState: [{ charId: s.chars[0].id, key: 'case_open', value: true }], combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '' }] } });
    const [u, v] = s.g.combat!.units.filter((x) => x.side === 'pc');
    expect(u.attack - v.attack).toBe(-1);
    const f = fight([{ traits: ['cold_case'] }]); const ap = f.pc.ap;
    pcAct(f, { type: 'combat/analyze', targetId: f.foe.id });
    expect(ap - f.pc.ap).toBe(1);
  });
});

describe('Interrogator', () => {
  it('The Quiet Room +2 alone with a captive; Known Trade −2; a broken captive owes one true answer', () => {
    const s = storyWith([{ traits: ['interrogator'] }]); const c = s.chars[0];
    expect(storyCheck(s, c.id, ['intimidation'], { tags: ['alone_with_captive'] }).roll(20)).toMatch(/\+2 Interrogator/);
    expect(rulings(s.g, 'trait:interrogator')[0].text).toMatch(/one true answer/);
    expect(storyCheck(s, c.id, ['empathy'], { tags: ['vs_civilians_who_know'] }).roll(10)).toMatch(/−2 Interrogator/);
  });
});

describe('Holo-Drama Addict', () => {
  it('Dramatic Timing: a sold drama (tag drama) rolls +3, once a scene; a refusal gives it back', () => {
    const s = storyWith([{ traits: ['holo_drama_addict'] }]); const c = s.chars[0];
    perk(s, c, 'holo_drama_addict', { text: 'Slow-motion, coat flaring, I kick the door.' });
    expect(storyCheck(s, c.id, ['athletics'], { tags: ['drama'] }).roll(10)).toMatch(/\+3 Dramatic Timing/);
    expect(storyCheck(s, c.id, ['athletics'], { tags: ['drama'] }).roll(10)).not.toMatch(/Dramatic Timing/);
    expect(() => perk(s, c, 'holo_drama_addict', { text: 'Again.' })).toThrow();
  });
  it('Leading Role: an unglamorous check takes a Visualization roll first; a fail puts it at −3', () => {
    const s = storyWith([{ traits: ['holo_drama_addict'], skills: { visualization: 0 } }]); const c = s.chars[0];
    s.g.rng = rngFor(2);
    const k = storyCheck(s, c.id, ['dexterity'], { tags: ['unglamorous'] });
    expect(s.g.story.entries.some((e) => /VISUALIZATION · LEADING ROLE/.test(e.head || ''))).toBe(true);
    expect(k.roll(10)).toMatch(/−3 Leading Role/);
  });
  it('combat: once a scene, 0 AP, +3 to the next attack this turn', () => {
    const f = fight([{ traits: ['holo_drama_addict'] }]);
    pcAct(f, { type: 'combat/perk', id: 'holo_drama_addict' });
    expect(withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot')).terms!.some((t) => t.label === 'Dramatic Timing' && t.v === 3)).toBe(true);
    pcAct(f, { type: 'combat/attack', targetId: f.foe.id, mode: 'shot' });
    expect(withGame(f.g, () => previewAttack(f.cb, f.pc, f.foe, 'shot')).terms!.some((t) => t.label === 'Dramatic Timing')).toBe(false);
  });
});

describe('Born Performer', () => {
  it('Adaptable: a γ skill at +2 each scene (the highest by default; the player may change it once)', () => {
    const s = storyWith([{ traits: ['born_performer'], skills: { charisma: 4, eloquence: 1 } }]); const c = s.chars[0];
    expect(storyCheck(s, c.id, ['charisma']).roll(10)).toMatch(/\+2 Born Performer: Charisma/);
    perk(s, c, 'born_performer', { choice: 'eloquence' });
    const k = storyCheck(s, c.id, ['eloquence']); k.roll(10);
    expect(k.now().roll!.mod).toBe(0 + 2); // 1 point = +0, and +2
    expect(storyCheck(s, c.id, ['charisma']).roll(10)).not.toMatch(/Born Performer/);
    expect(() => perk(s, c, 'born_performer', { choice: 'charisma' })).toThrow();
    turn(s, { sceneTitle: 'A new stage' });
    expect(() => perk(s, c, 'born_performer', { choice: 'analysis' })).toThrow(/γ skill/);
    perk(s, c, 'born_performer', { choice: 'authority' });
  });
  it('Hollow: no dialogue XP; an ally reading them with Empathy gets +2; combat XP +20%', () => {
    const s = storyWith([{ traits: ['born_performer'] }, {}]); const [a, b] = s.chars;
    const xp = live(s, a).xp; turn(s, { xp: [{ charId: a.id, source: 'dialogue', amount: 50, reason: 'talked' }] });
    expect(live(s, a).xp).toBe(xp);
    expect(storyCheck(s, b.id, ['empathy'], { target: a.name }).roll(10)).toMatch(/\+2 Born Performer: nobody home/);
  });
});

describe('briefs', () => {
  it('every lane G item with a Narrator part has a short brief; other lanes\' items without one get the fallback', () => {
    const s = storyWith([{ perks: { bedside_manner: 'I', real_power: 'II' }, traits: ['gambler', 'wanted'] }]); const c = s.chars[0];
    for (const k of ['perk:bedside_manner', 'perk:real_power', 'trait:gambler', 'trait:wanted']) {
      const b = brief(s.g, c, k)!; expect(b.length).toBeGreaterThan(5); expect(b.split(/\s+/).length).toBeLessThanOrEqual(18);
    }
  });
});
