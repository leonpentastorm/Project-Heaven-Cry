// Rules 1.14, "Speaking and attempting in a fight" (items 1008 and 1009): one test for each sentence of the section,
// through the real reducer (combat/say, combat/attempt, combat/perk, narrator/fight-ruling, narrator/fight-skip).
import { describe, expect, it } from 'vitest';
import { d20, viewFor, condOn, condSource, sideRollMod, ATTEMPT_AP, FIGHT_CONDS, type Unit, type Combat, type FightRuling } from '../src';
import { fightWith, storyWith } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
function fight(specs: any[] = [{}], foes: any[] = [{}]) {
  const f = fightWith(specs, foes.map((x, i) => ({ at: 'E6', ...x, name: x.name || 'Foe ' + (i + 1) })));
  open(f.cb); f.pcs.forEach((u, i) => { if (!u.companion) u.pos = '2,' + (5 + i); });
  f.foes.forEach((u, i) => { u.pos = (4 + i) + ',5'; });
  f.turn(f.pc); f.pc.ap = 6;
  return f;
}
const pending = (f: F): FightRuling | undefined => (f.cb as any).ruling;
const attempt = (f: F, text = 'Drop it. Your friends are already running.', u?: Unit) => { f.act({ type: 'combat/attempt', unitId: (u || f.pc).id, text } as any); return pending(f)!; };
const answer = (f: F, lines: string[], effect?: any, by = 'host') => f.act({ type: 'narrator/fight-ruling', id: pending(f)!.id, lines, ...(effect ? { effect } : {}) } as any, by);
const log = (f: F) => f.cb.log.join('\n');
const snap = (f: F) => JSON.stringify(f.cb.units.map((u) => [u.id, u.hp, u.pos, u.ap, u.shield || 0, Object.keys(u.conds || {}).filter((c) => condOn(u, c)), !!u.surrendered, u.stunnedNext]));

describe('rules 1.14, point 1: speech is free', () => {
  it('anything a player says in a fight goes in the log and to the Narrator', () => {
    const f = fight(); const ap = f.pc.ap, name = f.pc.name;
    f.act({ type: 'combat/say', charId: f.pc.charId!, text: 'Keel! Put the gun down!' });
    expect(log(f)).toContain(name + ': "Keel! Put the gun down!"');
    expect((f.cb as any).said.at(-1)).toMatchObject({ who: name, text: 'Keel! Put the gun down!' });
    expect(f.pc.ap).toBe(ap);
  });
  it('plain speech has no effect on the fight: nothing waits, no number moves', () => {
    const f = fight(); const before = snap(f);
    f.act({ type: 'combat/say', charId: f.pc.charId!, text: 'Surrender or die.' });
    expect(pending(f)).toBeUndefined(); expect(snap(f)).toBe(before);
    f.act({ type: 'combat/end-turn', unitId: f.pc.id }); // the turn ends as usual
  });
  it('speech is not bound to your turn', () => {
    const f = fight([{}, { name: 'Second' }]); const other = f.pcs[1];
    f.act({ type: 'combat/say', charId: other.charId!, text: 'On your left!' });
    expect(log(f)).toContain('On your left!');
  });
});

describe('rules 1.14, point 2: an attempt costs 1 AP, once a turn, on your own turn', () => {
  it('an attempt costs 1 AP and opens the one pending ruling with the words', () => {
    const f = fight(); const r = attempt(f, 'Call their bluff: nobody is coming for them.');
    expect(ATTEMPT_AP).toBe(1); expect(f.pc.ap).toBe(5);
    expect(r).toMatchObject({ unit: f.pc.id, charId: f.pc.charId, text: 'Call their bluff: nobody is coming for them.', round: f.cb.round, ap: 1 });
    expect(log(f)).toMatch(/attempts \(1 AP\): "Call their bluff/);
  });
  it('once a turn for each character: a second attempt in the same turn is refused', () => {
    const f = fight(); attempt(f); answer(f, ['Nothing.']);
    expect(() => attempt(f, 'Again.')).toThrow(/already made an attempt this turn/); expect(f.pc.ap).toBe(5);
  });
  it('each character has their own: another character may attempt on their turn in the same round', () => {
    const f = fight([{}, { name: 'Second' }]); attempt(f); answer(f, ['Nothing.']);
    const two = f.turn(f.pcs[1]); attempt(f, 'My turn to talk.', two); expect(pending(f)!.unit).toBe(two.id);
  });
  it('the next turn it is back', () => {
    const f = fight(); attempt(f); answer(f, ['Nothing.']);
    f.cb.round++; f.turn(f.pc); attempt(f, 'Once more.'); expect(pending(f)!.text).toBe('Once more.');
  });
  it('on that character\'s own turn only', () => {
    const f = fight([{}, { name: 'Second' }]);
    expect(() => attempt(f, 'Out of turn.', f.pcs[1])).toThrow(/turn/); expect(pending(f)).toBeUndefined();
  });
  it('needs the 1 AP', () => {
    const f = fight(); f.pc.ap = 0.5;
    expect(() => attempt(f)).toThrow(/Needs 1 AP/); expect(f.pc.ap).toBe(0.5);
  });
  it('needs words', () => { const f = fight(); expect(() => attempt(f, '   ')).toThrow(/Write what you attempt/); });
});

describe('rules 1.14, point 2: a perk that asks for words costs what its card says and counts as that turn\'s attempt', () => {
  it('Established Fact in a fight raises the attempt with its perk, its AP (free) and its use', () => {
    const f = fight([{ perks: { established_fact: 'mastered' } }]);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'These drones share one relay.' } as any);
    const r = pending(f)!; expect(r.perk).toMatchObject({ key: 'perk:established_fact', name: 'Established Fact', use: { per: 'per_session', key: 'perk:established_fact#fact' } });
    expect(r.ap).toBe(0); expect(f.pc.ap).toBe(6); expect(r.perk!.card).toMatch(/state a fact/i);
  });
  it('it is that turn\'s attempt: a plain attempt after it is refused, and so is the perk after a plain attempt', () => {
    const f = fight([{ perks: { established_fact: 'mastered' } }]);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'A fact.' } as any); answer(f, ['So it is.']);
    expect(() => attempt(f)).toThrow(/already made an attempt/);
    const g = fight([{ perks: { closing_argument: 'mastered' } }]); attempt(g); answer(g, ['No.']);
    expect(() => g.act({ type: 'combat/perk', unitId: g.pc.id, id: 'closing_argument', text: 'Hear me.' } as any)).toThrow(/already made an attempt/);
  });
  it('Closing Argument, Their Own Idea and the Occultist\'s Look it up raise it too', () => {
    const a = fight([{ perks: { closing_argument: 'mastered' } }]);
    a.act({ type: 'combat/perk', unitId: a.pc.id, id: 'closing_argument', text: 'You die for a man who left.' } as any);
    expect(pending(a)!.perk!.use).toEqual({ per: 'per_scene', key: 'perk:closing_argument#close' });
    const b = fight([{ perks: { their_own_idea: 'mastered' } }]);
    b.act({ type: 'combat/perk', unitId: b.pc.id, id: 'their_own_idea', targetId: b.foe.id, text: 'The ship leaves without you.' } as any);
    expect(pending(b)!.perk).toMatchObject({ key: 'perk:their_own_idea', target: b.foe.id, private: true });
    expect(log(b)).not.toContain('The ship leaves without you.'); // the suggestion stays hidden
    const c = fight([{ traits: ['occultist'] }]);
    c.act({ type: 'combat/perk', unitId: c.pc.id, id: 'occultist', actionId: 'weakness', targetId: c.foe.id } as any);
    expect(pending(c)!.perk).toMatchObject({ key: 'trait:occultist', target: c.foe.id });
  });
  it('outside a fight the perk works as before: a pending ruling for the Narrator\'s next turn', () => {
    const s = storyWith([{ perks: { established_fact: 'mastered' } }]);
    s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'established_fact', text: 'The relay is old.' } as any);
    expect(s.g.story.rulings!.some((r) => r.key === 'perk:established_fact')).toBe(true);
  });
});

describe('rules 1.14, point 3: the Narrator answers at once, and the fight waits', () => {
  it('while it waits the speaker can\'t act further and the turn can\'t end; speech still goes through', () => {
    const f = fight(); attempt(f);
    expect(() => f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' })).toThrow(/Narrator is deciding/);
    expect(() => f.act({ type: 'combat/move', unitId: f.pc.id, to: '2,6' })).toThrow(/Narrator is deciding/);
    expect(() => f.act({ type: 'combat/end-turn', unitId: f.pc.id })).toThrow(/Narrator is deciding/);
    expect(() => attempt(f, 'And another thing.')).toThrow(/Narrator is deciding/);
    f.act({ type: 'combat/say', charId: f.pc.charId!, text: 'Well?' }); expect(log(f)).toContain('Well?');
  });
  it('one or two lines, in the log as the Narrator; the wait is over', () => {
    const f = fight(); attempt(f);
    answer(f, ['Keel\'s eyes go to the ramp.', 'He doesn\'t lower the gun.']);
    expect(f.cb.log.slice(-2)).toEqual(['Narrator: Keel\'s eyes go to the ramp.', 'Narrator: He doesn\'t lower the gun.']);
    expect(pending(f)).toBeUndefined();
    f.act({ type: 'combat/end-turn', unitId: f.pc.id });
  });
  it('never more than two lines, and each stays short', () => {
    const f = fight(); attempt(f);
    answer(f, ['One.', 'Two.', 'Three.', 'x'.repeat(900)]);
    const said = f.cb.log.filter((l) => l.startsWith('Narrator: '));
    expect(said).toEqual(['Narrator: One.', 'Narrator: Two.']);
    const g = fight(); attempt(g); answer(g, ['y'.repeat(900)]);
    expect(g.cb.log.at(-1)!.length).toBeLessThanOrEqual(250);
  });
  it('an answer with no line and nothing allowed in it is refused, and the fight still waits', () => {
    const f = fight(); attempt(f);
    expect(() => answer(f, [], { damage: 50 })).toThrow(/empty/); expect(pending(f)).toBeTruthy();
  });
});

describe('rules 1.14, point 3: a check by the speaker', () => {
  it('the engine rolls it with the skill and the TN the Narrator sets, and the log shows the dice', () => {
    const f = fight(); attempt(f); const c = f.g.characters[f.pc.charId!], m = sideRollMod(f.g, c, 'intimidation');
    f.g.rng = rngFor(11);
    answer(f, ['He looks at your hands.'], { check: { skill: 'intimidation', tn: 12 } });
    const line = f.cb.log.find((l) => /INTIMIDATION CHECK/.test(l))!;
    const total = 11 + m, ok = total >= 12;
    expect(line).toContain('d20 11 ' + (m >= 0 ? '+' : '−') + ' ' + Math.abs(m) + ' = ' + total + ' vs 12 · ' + (ok ? '✓ SUCCESS' : '✕ FAILURE'));
    expect(line.startsWith(f.pc.name)).toBe(true);
  });
  it('on a success it earns the effect below it', () => {
    const f = fight(); attempt(f); f.g.rng = rngFor(20);
    answer(f, ['His grip loosens.'], { check: { skill: 'intimidation', tn: 16, onSuccess: { condition: { target: f.foe.id, id: 'shaken' } } } });
    expect(log(f)).toMatch(/INTIMIDATION CHECK · d20 20 .* vs 16 · ✓ CRITICAL · Foe 1 is Shaken \(1 round\)/);
    expect(condOn(f.foe, 'shaken')).toBe(true);
  });
  it('on a failure it earns nothing', () => {
    const f = fight(); attempt(f); f.g.rng = rngFor(1); const before = snap(f);
    answer(f, ['He laughs.'], { check: { skill: 'intimidation', tn: 8, onSuccess: { surrender: { target: f.foe.id } } } });
    expect(log(f)).toMatch(/d20 1 .* vs 8 · ✕ CRITICAL FAIL\./); expect(snap(f)).toBe(before);
  });
  it('a skill that doesn\'t exist or a TN off the ladder is no check: dropped, the lines still show', () => {
    for (const check of [{ skill: 'swagger', tn: 12 }, { skill: 'intimidation', tn: 3 }, { skill: 'intimidation', tn: 13 }, { skill: 'intimidation' }]) {
      const f = fight(); attempt(f); const before = snap(f);
      answer(f, ['Nothing comes of it.'], { check });
      expect(log(f)).not.toMatch(/CHECK ·/); expect(f.cb.log.at(-1)).toBe('Narrator: Nothing comes of it.'); expect(snap(f)).toBe(before);
    }
  });
});

describe('rules 1.14, point 3: one condition on one unit for one round, from the list only', () => {
  it('the list is Shaken, Taunted, weapon lowered, Hesitates', () => { expect([...FIGHT_CONDS]).toEqual(['shaken', 'taunted', 'lowered', 'hesitates']); });
  it('Shaken, for one round', () => {
    const f = fight(); attempt(f); answer(f, ['It lands.'], { condition: { target: f.foe.id, id: 'shaken' } });
    expect(f.foe.conds!.shaken).toBe(1); expect(log(f)).toMatch(/Foe 1 is Shaken \(1 round\)\./);
  });
  it('Taunted, by the speaker', () => {
    const f = fight(); attempt(f); answer(f, ['It turns on you.'], { condition: { target: f.foe.id, id: 'taunted' } });
    expect(f.foe.conds!.taunted).toBe(1); expect(condSource(f.foe, 'taunted')).toBe(f.pc.id);
  });
  it('weapon lowered, for one round', () => {
    const f = fight(); attempt(f); answer(f, ['The barrel dips.'], { condition: { target: f.foe.id, id: 'lowered' } });
    expect(f.foe.conds!.lowered).toBe(1); expect(log(f)).toMatch(/Weapon lowered \(1 round\)/);
  });
  it('Hesitates: −1 AP on its next turn, and only that', () => {
    const f = fight(); const base = f.turn(f.foe).ap; f.turn(f.pc); f.pc.ap = 6;
    attempt(f); const apNow = f.foe.ap;
    answer(f, ['It wavers.'], { condition: { target: f.foe.id, id: 'hesitates' } });
    expect(f.foe.ap).toBe(apNow); expect(log(f)).toMatch(/Foe 1 hesitates \(−1 AP on its next turn\)\./);
    expect(f.turn(f.foe).ap).toBe(base - 1);
    expect(f.turn(f.foe).ap).toBe(base); // one turn only
  });
  it('a length the Narrator names is ignored: always one round', () => {
    const f = fight(); attempt(f); answer(f, ['It lands.'], { condition: { target: f.foe.id, id: 'shaken', rounds: 9 } });
    expect(f.foe.conds!.shaken).toBe(1);
  });
  it('a target may be named by its name when only one enemy carries it', () => {
    const f = fight(); attempt(f); answer(f, ['It lands.'], { condition: { target: 'foe 1', id: 'shaken' } });
    expect(condOn(f.foe, 'shaken')).toBe(true);
  });
});

describe('rules 1.14, point 3: a surrender', () => {
  it('one enemy at half its HP or less stops fighting', () => {
    const f = fight([{}], [{}, {}]); const t = f.foes[0]; t.hp = Math.floor(t.maxHp / 2);
    attempt(f); answer(f, ['The pistol clatters on the deck.'], { surrender: { target: t.id } });
    expect(f.unit(t.id).surrendered).toBe(true); expect(log(f)).toMatch(/Foe 1 SURRENDERS/); expect(f.foes[1].surrendered).toBeFalsy();
  });
  it('a healthy enemy doesn\'t, without a check: dropped, the lines still show', () => {
    const f = fight(); attempt(f); answer(f, ['He almost does.'], { surrender: { target: f.foe.id } });
    expect(f.foe.surrendered).toBeFalsy(); expect(f.cb.log.at(-1)).toBe('Narrator: He almost does.');
  });
  it('a healthy enemy does after a successful check', () => {
    const f = fight([{}], [{}, {}]); attempt(f); f.g.rng = rngFor(20);
    answer(f, ['He believes you.'], { check: { skill: 'charisma', tn: 20, onSuccess: { surrender: { target: f.foes[0].id } } } });
    expect(f.foes[0].surrendered).toBe(true);
  });
  it('the last enemy giving up ends the fight', () => {
    const f = fight(); f.foe.hp = 1; attempt(f); answer(f, ['It is over.'], { surrender: { target: f.foe.id } });
    expect(f.cb.over).toBe('win');
  });
  it('an enemy that never surrenders (a boss, a machine, one sworn not to) doesn\'t', () => {
    const f = fight(); f.foe.hp = 1; f.foe.tier = 'boss'; attempt(f); answer(f, ['Never.'], { surrender: { target: f.foe.id } });
    expect(f.foe.surrendered).toBeFalsy();
    const g = fight(); g.foe.hp = 1; g.foe.tags = ['no_surrender']; attempt(g); answer(g, ['Never.'], { surrender: { target: g.foe.id } });
    expect(g.foe.surrendered).toBeFalsy();
  });
});

describe('rules 1.14, point 3: a ruling on a perk, yes or no', () => {
  const fact = () => { const f = fight([{ perks: { established_fact: 'mastered' } }]); f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'These drones share one relay.' } as any); return f; };
  it('a yes keeps the use spent', () => {
    const f = fact(); answer(f, ['They do. Kill the relay and they all drop.'], { perk: { accepted: true } });
    f.cb.round++; f.turn(f.pc);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'Another.' } as any)).toThrow();
    expect((f.cb.notes || []).join('\n')).toMatch(/Established Fact accepted/);
  });
  it('a no gives the use back', () => {
    const f = fact(); answer(f, ['Nothing here says so.'], { perk: { accepted: false } });
    expect(log(f)).toMatch(/Established Fact is refused: the use of Established Fact comes back\./);
    f.cb.round++; f.turn(f.pc);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'A better fact.' } as any); expect(pending(f)!.text).toBe('A better fact.');
  });
  it('a no gives the AP back too', () => {
    const f = fact(); (pending(f) as any).ap = 2; f.pc.ap = 4; // a perk whose card costs 2 AP
    answer(f, ['No.'], { perk: { accepted: false } });
    expect(f.pc.ap).toBe(6); expect(log(f)).toMatch(/2 AP and the use of Established Fact come back/);
  });
  it('a plain attempt has no perk to rule on: dropped', () => {
    const f = fight(); attempt(f); answer(f, ['Fine.'], { perk: { accepted: false } });
    expect(f.pc.ap).toBe(5); expect(f.cb.log.at(-1)).toBe('Narrator: Fine.');
  });
});

describe('rules 1.14, point 4: the Narrator never deals damage, heals, moves a unit, or changes AP beyond that −1', () => {
  const refused: [string, (f: F) => any][] = [
    ['damage', (f) => ({ damage: { target: f.foe.id, amount: 50 } })],
    ['healing', (f) => ({ heal: { target: f.pc.id, amount: 50 } })],
    ['a move', (f) => ({ move: { target: f.foe.id, to: '1,1' } })],
    ['AP', (f) => ({ ap: { target: f.pc.id, amount: 3 } })],
    ['AP inside a condition', (f) => ({ condition: { target: f.foe.id, id: 'hesitates', ap: -4 } })],
    ['a condition off the list', (f) => ({ condition: { target: f.foe.id, id: 'stunned' } })],
    ['a condition on an ally', (f) => ({ condition: { target: f.pc.id, id: 'shaken' } })],
    ['a condition on nobody in the fight', () => ({ condition: { target: 'u999', id: 'shaken' } })],
    ['a surrender on a healthy enemy without a check', (f) => ({ surrender: { target: f.foe.id } })],
    ['two effects at once', (f) => ({ condition: { target: f.foe.id, id: 'shaken' }, surrender: { target: f.foe.id } })],
    ['a check and a condition at once', (f) => ({ check: { skill: 'charisma', tn: 8 }, condition: { target: f.foe.id, id: 'shaken' } })],
    ['a list of effects', (f) => [{ condition: { target: f.foe.id, id: 'shaken' } }]],
    ['a word', () => 'kill it'],
  ];
  for (const [name, eff] of refused) it(name + ' is dropped; the lines still show and no number moves', () => {
    const f = fight(); attempt(f); const before = snap(f), n = f.cb.log.length;
    answer(f, ['The Narrator speaks.'], eff(f));
    const after = name === 'AP inside a condition' ? null : snap(f);
    if (after) { expect(after).toBe(before); expect(f.cb.log.slice(n)).toEqual(['Narrator: The Narrator speaks.']); }
    else { expect(f.foe.stunnedNext).toBe(1); expect(f.foe.ap).toBe(JSON.parse(before).find((x: any) => x[0] === f.foe.id)[3]); } // the −1, and nothing more
    expect(pending(f)).toBeUndefined();
  });
  it('fields the engine doesn\'t know are ignored next to an allowed effect', () => {
    const f = fight(); attempt(f); const hp = f.foe.hp;
    answer(f, ['It lands.'], { condition: { target: f.foe.id, id: 'shaken' }, damage: 40, heal: 10 });
    expect(condOn(f.foe, 'shaken')).toBe(true); expect(f.foe.hp).toBe(hp);
  });
  it('a check\'s success can\'t earn anything off the list either', () => {
    const f = fight(); attempt(f); f.g.rng = rngFor(20); const hp = f.foe.hp;
    answer(f, ['It works.'], { check: { skill: 'charisma', tn: 8, onSuccess: { damage: { target: f.foe.id, amount: 99 } } } });
    expect(f.foe.hp).toBe(hp); expect(log(f)).toMatch(/CHARISMA CHECK .* ✓ CRITICAL\.$/m);
  });
  it('a ruling id that doesn\'t exist is refused', () => {
    const f = fight(); attempt(f);
    expect(() => f.act({ type: 'narrator/fight-ruling', id: 'f0', lines: ['Hm.'] } as any)).toThrow(/isn't waiting/); expect(pending(f)).toBeTruthy();
    const g = fight();
    expect(() => g.act({ type: 'narrator/fight-ruling', id: 'f1', lines: ['Hm.'], effect: { condition: { target: g.foe.id, id: 'shaken' } } } as any)).toThrow(/Nothing is waiting/);
  });
  it('a ruling from someone who isn\'t the host is refused', () => {
    const f = fight([{}, { owner: 'guest', name: 'Guest' }]); attempt(f);
    expect(() => answer(f, ['I win.'], { surrender: { target: f.foe.id } }, 'guest')).toThrow(/Only the Narrator/); expect(pending(f)).toBeTruthy();
  });
});

describe('rules 1.14, point 6: no Narrator connected', () => {
  it('no key: the attempt is refused and costs nothing', () => {
    const f = fight(); f.act({ type: 'narrator/ready', ready: false } as any);
    expect(() => attempt(f)).toThrow(/No Narrator is connected/); expect(f.pc.ap).toBe(6); expect(pending(f)).toBeUndefined();
  });
  it('plain speech still goes in the log', () => {
    const f = fight(); f.act({ type: 'narrator/ready', ready: false } as any);
    f.act({ type: 'combat/say', charId: f.pc.charId!, text: 'Anyone?' }); expect(log(f)).toContain('Anyone?');
  });
  it('a perk that asks for words is refused the same way, and keeps its use', () => {
    const f = fight([{ perks: { established_fact: 'mastered' } }]); f.act({ type: 'narrator/ready', ready: false } as any);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'A fact.' } as any)).toThrow(/No Narrator is connected/);
    f.act({ type: 'narrator/ready', ready: true } as any);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'A fact.' } as any); expect(pending(f)).toBeTruthy();
  });
  it('once the key is back, attempts work again; only the host says so', () => {
    const f = fight([{}, { owner: 'guest', name: 'Guest' }]);
    expect(() => f.act({ type: 'narrator/ready', ready: false } as any, 'guest')).toThrow(/Host only/);
    f.act({ type: 'narrator/ready', ready: false } as any); f.act({ type: 'narrator/ready', ready: true } as any);
    attempt(f); expect(pending(f)).toBeTruthy();
  });
  it('the Narrator is offline (a human Narrator who left): refused', () => {
    const f = fight(); f.g.settings.mode = 'human'; f.g.players.find((p) => p.id === f.g.hostId)!.online = false;
    expect(() => attempt(f)).toThrow(/Narrator is away/);
  });
  it('the host can end a wait nobody answers: the AP, the turn\'s attempt and a perk\'s use come back', () => {
    const f = fight([{ perks: { established_fact: 'mastered' } }]); attempt(f); expect(f.pc.ap).toBe(5);
    f.act({ type: 'narrator/fight-skip', id: pending(f)!.id } as any);
    expect(f.pc.ap).toBe(6); expect(pending(f)).toBeUndefined(); expect(log(f)).toMatch(/The Narrator didn't answer\. .* gets 1 AP back\./);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'A fact.' } as any); // the attempt is free again
    f.act({ type: 'narrator/fight-skip', note: 'The Narrator could not be reached.' } as any);
    expect(log(f)).toMatch(/The Narrator could not be reached\. .* gets the use of Established Fact back\./);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'A fact.' } as any); expect(pending(f)).toBeTruthy(); // the use came back
  });
  it('only the host can end the wait, and only while something waits', () => {
    const f = fight([{}, { owner: 'guest', name: 'Guest' }]);
    expect(() => f.act({ type: 'narrator/fight-skip' } as any)).toThrow(/Nothing is waiting/);
    attempt(f); expect(() => f.act({ type: 'narrator/fight-skip' } as any, 'guest')).toThrow(/Only the host/);
  });
});

describe('rules 1.14, point 7: a human Narrator', () => {
  it('counts as connected, and the fight waits for them', () => {
    const f = fight(); f.g.settings.mode = 'human';
    attempt(f, 'I shout that the reactor is going.');
    expect(pending(f)!.text).toBe('I shout that the reactor is going.');
    expect(() => f.act({ type: 'combat/end-turn', unitId: f.pc.id })).toThrow(/Narrator is deciding/);
  });
  it('answers with the same four answers', () => {
    const f = fight([{ perks: { closing_argument: 'mastered' } }]); f.g.settings.mode = 'human';
    attempt(f); f.g.rng = rngFor(20); answer(f, [], { check: { skill: 'authority', tn: 12 } }); expect(log(f)).toMatch(/AUTHORITY CHECK/);
    f.cb.round++; f.turn(f.pc); attempt(f); answer(f, [], { condition: { target: f.foe.id, id: 'lowered' } }); expect(condOn(f.foe, 'lowered')).toBe(true);
    f.cb.round++; f.turn(f.pc); f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'closing_argument', text: 'Enough.' } as any); answer(f, ['They hear it.'], { perk: { accepted: true } });
    f.cb.round++; f.turn(f.pc); f.foe.hp = 1; attempt(f); answer(f, [], { surrender: { target: f.foe.id } }); expect(f.foe.surrendered).toBe(true);
  });
});

describe('rules 1.14: what each player sees of the wait', () => {
  it('everyone sees that the fight waits and the words; the Narrator\'s side of a perk stays with the host', () => {
    const f = fight([{ perks: { established_fact: 'mastered' } }, { owner: 'guest', name: 'Guest' }]);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'One relay.' } as any);
    const mine = (viewFor(f.g, 'host').combat as any).ruling, theirs = (viewFor(f.g, 'guest').combat as any).ruling;
    expect(mine.perk.ask).toMatch(/Established Fact/); expect(theirs.text).toBe('One relay.'); expect(theirs.perk.ask).toBeUndefined(); expect(theirs.perk.name).toBe('Established Fact');
  });
  it('words a perk keeps hidden show to the speaker and the host only', () => {
    const f = fight([{ owner: 'guest', name: 'Guest', perks: { their_own_idea: 'mastered' } }, { owner: 'other', name: 'Other' }]);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'their_own_idea', targetId: f.foe.id, text: 'Run for the ship.' } as any, 'guest');
    expect((viewFor(f.g, 'guest').combat as any).ruling.text).toBe('Run for the ship.');
    expect((viewFor(f.g, 'host').combat as any).ruling.text).toBe('Run for the ship.');
    expect((viewFor(f.g, 'other').combat as any).ruling.text).toBe('');
  });
});

describe('rules 1.14: the after-fight report and the spend meter', () => {
  it('an answered attempt is in the fight notes as already answered, with what the engine did', () => {
    const f = fight(); attempt(f, 'Drop it.'); answer(f, ['He does not.'], { condition: { target: f.foe.id, id: 'shaken' } });
    expect((f.cb.notes || []).at(-1)).toMatch(/an attempt\): "Drop it\." — answered in the fight: He does not\. \[Foe 1 is Shaken/);
  });
  it('a fight answer counts its tokens and cost, but is no Narrator turn', () => {
    const f = fight(); const calls = f.g.narrator.usage.calls;
    f.act({ type: 'narrator/usage', input: 400, output: 60, cacheRead: 0, costUsd: 0.002, kind: 'fight' } as any);
    expect(f.g.narrator.usage.calls).toBe(calls); expect(f.g.narrator.usage.input).toBeGreaterThanOrEqual(400); expect((f.g.narrator.usage as any).fights).toBe(1);
  });
});
