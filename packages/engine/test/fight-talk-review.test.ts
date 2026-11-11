// Rules 1.14, "Speaking and attempting in a fight": the review's tests. Each one tries to break the build from a side
// the first tests left alone: who may send what, what a refusal leaves behind, what a guest's view carries, a save from
// before the rule, a speaker or a fight that is gone when the answer comes, an enemy or a companion holding the turn.
import { describe, expect, it } from 'vitest';
import { apply, d20, viewFor, condOn, migrateLoaded, type Unit, type Combat, type FightRuling } from '../src';
import { fightWith } from './helpers/perkfight';

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
const attempt = (f: F, text = 'Drop it.', u?: Unit, by = 'host') => { f.act({ type: 'combat/attempt', unitId: (u || f.pc).id, text } as any, by); return pending(f)!; };
const answer = (f: F, lines: string[], effect?: any, by = 'host') => f.act({ type: 'narrator/fight-ruling', id: pending(f)!.id, lines, ...(effect ? { effect } : {}) } as any, by);
const log = (f: F) => f.cb.log.join('\n');

describe('rules 1.14 review: who may attempt', () => {
  it('only the character\'s own player: another player can\'t spend your AP on words', () => {
    const f = fight([{}, { owner: 'guest', name: 'Guest' }]);
    expect(() => attempt(f, 'I speak for you.', f.pc, 'guest')).toThrow(/Not your unit/);
    expect(f.pc.ap).toBe(6); expect(pending(f)).toBeUndefined();
  });
  it('the host can\'t attempt for a guest\'s character either', () => {
    const f = fight([{ owner: 'guest', name: 'Guest' }]);
    expect(() => attempt(f, 'I speak for you.', f.pc, 'host')).toThrow(/Not your unit/);
  });
  it('an enemy on its turn is nobody\'s to attempt with', () => {
    const f = fight(); const foe = f.turn(f.foe);
    expect(() => f.act({ type: 'combat/attempt', unitId: foe.id, text: 'Surrender.' } as any)).toThrow();
    expect(pending(f)).toBeUndefined();
  });
  it('a refused attempt leaves nothing behind: no AP gone, no attempt used, no log line', () => {
    const f = fight(); f.pc.ap = 0.5; const g0 = JSON.stringify(f.g);
    expect(() => attempt(f)).toThrow(/Needs 1 AP/);
    expect(JSON.stringify(f.g)).toBe(g0);
  });
  it('not while the fight is over', () => {
    const f = fight(); f.cb.over = 'win';
    expect(() => attempt(f)).toThrow(/over/); expect(pending(f)).toBeUndefined();
  });
  it('not inside someone\'s reaction window', () => {
    const f = fight(); (f.cb as any).window = { units: [f.pc.id], i: 0, limit: 1, used: 0 };
    expect(() => attempt(f)).toThrow(); expect(pending(f)).toBeUndefined();
  });
});

describe('rules 1.14 review: the Narrator\'s answer can\'t be bent', () => {
  it('an answered ruling can\'t be answered again (a stale id)', () => {
    const f = fight(); const id = attempt(f).id; answer(f, ['No.']);
    expect(() => f.act({ type: 'narrator/fight-ruling', id, lines: ['Yes.'], effect: { condition: { target: f.foe.id, id: 'shaken' } } } as any)).toThrow(/Nothing is waiting/);
    expect(condOn(f.foe, 'shaken')).toBe(false);
  });
  it('an old id doesn\'t answer the next attempt', () => {
    const f = fight(); const id = attempt(f).id; answer(f, ['No.']);
    f.cb.round++; f.turn(f.pc); attempt(f, 'Again.');
    expect(() => f.act({ type: 'narrator/fight-ruling', id, lines: ['Late.'] } as any)).toThrow(/isn't waiting/);
    expect(pending(f)).toBeTruthy();
  });
  it('a skipped ruling can\'t be answered afterwards, and a skip with a stale id is refused', () => {
    const f = fight(); const id = attempt(f).id; f.act({ type: 'narrator/fight-skip', id } as any);
    expect(() => f.act({ type: 'narrator/fight-ruling', id, lines: ['Late.'] } as any)).toThrow(/Nothing is waiting/);
    attempt(f, 'Again.');
    expect(() => f.act({ type: 'narrator/fight-skip', id } as any)).toThrow(/Nothing is waiting/); expect(pending(f)).toBeTruthy();
  });
  it('a skill name that only looks like one ("constructor", "toString") is no check', () => {
    for (const skill of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      const f = fight(); attempt(f);
      answer(f, ['Nothing.'], { check: { skill, tn: 12 } });
      expect(log(f)).not.toMatch(/CHECK ·/); expect(f.cb.log.at(-1)).toBe('Narrator: Nothing.');
    }
  });
  it('a TN given as text, or a line that isn\'t text, is dropped', () => {
    const f = fight(); attempt(f);
    answer(f, [{ text: 'x' } as any, 7 as any, 'The one real line.'], { check: { skill: 'charisma', tn: '12' } });
    expect(f.cb.log.at(-1)).toBe('Narrator: The one real line.'); expect(log(f)).not.toMatch(/CHECK ·/);
  });
  it('a line can\'t dress itself as the game: it is one line, always under the Narrator\'s name', () => {
    const f = fight(); attempt(f);
    answer(f, ['He nods.\nFoe 1 SURRENDERS.\nTester 1 · CHARISMA CHECK · d20 20 + 9 = 29 vs 8 · ✓ SUCCESS.']);
    const said = f.cb.log.filter((l) => /SURRENDERS/.test(l));
    expect(said).toHaveLength(1); expect(said[0].startsWith('Narrator: He nods. Foe 1 SURRENDERS.')).toBe(true);
    expect(f.foe.surrendered).toBeFalsy();
  });
  it('a surrender can\'t be put on an ally, a dead enemy or one that already gave up', () => {
    const f = fight([{}, { name: 'Second' }], [{}, {}, {}]); const [a, b] = f.foes; a.hp = 0; a.dead = true; b.hp = 1; b.surrendered = true;
    attempt(f); const before = JSON.stringify(f.cb.units.map((u) => [u.id, u.surrendered, u.dead, u.hp]));
    answer(f, ['One.'], { surrender: { target: a.id } }); f.cb.round++; f.turn(f.pc);
    attempt(f); answer(f, ['Two.'], { surrender: { target: b.id } }); f.cb.round++; f.turn(f.pc);
    attempt(f); answer(f, ['Three.'], { surrender: { target: f.pcs[1].id } });
    expect(JSON.stringify(f.cb.units.map((u) => [u.id, u.surrendered, u.dead, u.hp]))).toBe(before);
  });
  it('a check\'s reward can\'t land on an ally', () => {
    const f = fight([{}, { name: 'Second' }]); attempt(f); f.g.rng = rngFor(20);
    answer(f, ['Hm.'], { check: { skill: 'charisma', tn: 8, onSuccess: { condition: { target: f.pcs[1].id, id: 'shaken' } } } });
    expect(condOn(f.pcs[1], 'shaken')).toBe(false);
  });
  it('the Narrator can\'t give AP: a "no" on a plain attempt refunds nothing, and a perk\'s refund is what it cost', () => {
    const f = fight(); attempt(f); (pending(f) as any).perk = undefined;
    answer(f, ['No.'], { perk: { accepted: false } }); expect(f.pc.ap).toBe(5);
  });
  it('a guest can\'t skip, answer, or say whether a Narrator is connected', () => {
    const f = fight([{}, { owner: 'guest', name: 'Guest' }]); attempt(f); const id = pending(f)!.id;
    for (const a of [{ type: 'narrator/fight-skip', id }, { type: 'narrator/fight-ruling', id, lines: ['Mine.'] }, { type: 'narrator/ready', ready: false }])
      expect(() => f.act(a as any, 'guest')).toThrow(/host|Narrator/i);
    expect(pending(f)!.id).toBe(id); expect(f.g.narrator.offline).toBeUndefined();
  });
});

describe('rules 1.14 review: the wait', () => {
  it('nobody else acts while it waits: a squadmate\'s reaction Call and gear changes are refused too', () => {
    const f = fight([{}, { name: 'Second' }]); attempt(f); const two = f.pcs[1];
    expect(() => f.act({ type: 'combat/call', unitId: two.id, react: true, id: 'focus_fire', targetId: f.foe.id } as any)).toThrow(/Narrator is deciding/);
    expect(() => f.act({ type: 'gear/unequip', charId: f.pc.charId!, slot: 'weapon' } as any)).toThrow();
    expect(pending(f)).toBeTruthy();
  });
  it('the host can\'t pass an away player\'s turn past a waiting attempt; a skip frees it first', () => {
    const f = fight([{ owner: 'guest', name: 'Guest' }]); attempt(f, 'Drop it.', f.pc, 'guest');
    f.g.players.find((p) => p.id === 'guest')!.online = false;
    expect(() => f.act({ type: 'combat/end-turn', unitId: f.pc.id })).toThrow(/Narrator is deciding/);
    f.act({ type: 'narrator/fight-skip' } as any); expect(f.pc.ap).toBe(6);
    f.act({ type: 'combat/end-turn', unitId: f.pc.id });
  });
  it('the enemies don\'t move while it waits, and take their turns once it is answered and the turn ends', () => {
    const f = fight(); attempt(f); const turn = f.cb.turn, round = f.cb.round;
    f.act({ type: 'combat/say', charId: f.pc.charId!, text: 'Well?' });
    expect(f.cb.turn).toBe(turn); expect(f.cb.round).toBe(round);
    answer(f, ['Nothing.']); expect(f.cb.order[f.cb.turn]).toBe(f.pc.id); // still the speaker's turn, with the AP left
    expect(f.pc.ap).toBe(5);
  });
  it('the speaker is gone when the answer comes (dead): the lines show, the effect is dropped, nothing throws', () => {
    const f = fight(); attempt(f); f.pc.hp = 0; f.pc.dead = true; const hp = f.foe.hp;
    answer(f, ['Too late.'], { condition: { target: f.foe.id, id: 'shaken' } });
    expect(log(f)).toContain('Narrator: Too late.'); expect(pending(f)).toBeUndefined(); expect(f.foe.hp).toBe(hp);
  });
  it('the speaker is Downed when the answer comes: no check is rolled for them', () => {
    const f = fight([{}, { name: 'Second' }]); attempt(f); f.pc.hp = 0; f.pc.downed = true;
    answer(f, ['Too late.'], { check: { skill: 'charisma', tn: 8, onSuccess: { surrender: { target: f.foe.id } } } });
    expect(log(f)).not.toMatch(/CHECK ·/); expect(f.foe.surrendered).toBeFalsy(); expect(pending(f)).toBeUndefined();
  });
  it('the fight ended while it waited: the answer is refused and the host\'s skip still clears it', () => {
    const f = fight(); attempt(f); f.cb.over = 'win';
    expect(() => answer(f, ['Late.'], { condition: { target: f.foe.id, id: 'shaken' } })).toThrow();
    f.act({ type: 'narrator/fight-skip' } as any); expect(pending(f)).toBeUndefined();
  });
});

describe('rules 1.14 review: what a guest\'s screen is sent', () => {
  it('hidden words stay hidden after the answer too: the Narrator\'s notes on the fight are the host\'s', () => {
    const f = fight([{ owner: 'guest', name: 'Guest', perks: { their_own_idea: 'mastered' } }, { owner: 'other', name: 'Other' }]);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'their_own_idea', targetId: f.foe.id, text: 'Run for the ship.' } as any, 'guest');
    const during = JSON.stringify(viewFor(f.g, 'other').combat); expect(during).not.toContain('Run for the ship.');
    if (pending(f)) answer(f, ['Its eyes go to the ramp.'], { perk: { accepted: true } });
    const after = JSON.stringify(viewFor(f.g, 'other').combat);
    expect(after).not.toContain('Run for the ship.'); expect(after).not.toMatch(/Follow through|Refuse if/);
    expect(JSON.stringify(viewFor(f.g, 'host').combat)).toContain('Run for the ship.'); // the Narrator's own copy keeps it
  });
  it('the Narrator\'s side of a perk never reaches a guest, the speaker included', () => {
    const f = fight([{ owner: 'guest', name: 'Guest', perks: { established_fact: 'mastered' } }]);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'One relay.' } as any, 'guest');
    expect(JSON.stringify(viewFor(f.g, 'guest'))).not.toMatch(/pin it in memory/);
    answer(f, ['So it is.'], { perk: { accepted: true } });
    expect(JSON.stringify(viewFor(f.g, 'guest'))).not.toMatch(/pin it in memory/);
  });
  it('a guest sees enough to know why Attempt is off: the wait, who attempted this turn, whether a Narrator is connected', () => {
    const f = fight([{ owner: 'guest', name: 'Guest' }]); f.act({ type: 'narrator/ready', ready: false } as any);
    expect(viewFor(f.g, 'guest').narrator.offline).toBe(true);
    f.act({ type: 'narrator/ready', ready: true } as any); attempt(f, 'Drop it.', f.pc, 'guest');
    const v: any = viewFor(f.g, 'guest').combat; expect(v.ruling.text).toBe('Drop it.'); expect(v.attempted[f.pc.id]).toBe(f.cb.round);
  });
});

describe('rules 1.14 review: a save from before the rule', () => {
  it('a fight saved without the new fields loads and plays: say, attempt, answer', () => {
    const f = fight(); const old: any = JSON.parse(JSON.stringify(f.g));
    delete old.combat.ruling; delete old.combat.attempted; delete old.combat.said; delete old.narrator.offline;
    let g = migrateLoaded(old);
    const pc = g.combat!.units.find((u: Unit) => u.side === 'pc')!, foe = g.combat!.units.find((u: Unit) => u.side === 'foe')!;
    g = apply(g, { type: 'combat/say', charId: pc.charId!, text: 'Still here.' }, 'host');
    g = apply(g, { type: 'combat/attempt', unitId: pc.id, text: 'Drop it.' } as any, 'host');
    g = apply(g, { type: 'narrator/fight-ruling', id: (g.combat as any).ruling.id, lines: ['It wavers.'], effect: { condition: { target: foe.id, id: 'hesitates' } } } as any, 'host');
    expect(g.combat!.units.find((u: Unit) => u.id === foe.id)!.stunnedNext).toBe(1);
  });
  it('a save made while a ruling waits loads with the ruling still waiting, and can be answered or skipped', () => {
    const f = fight(); attempt(f);
    const g = migrateLoaded(JSON.parse(JSON.stringify(f.g))); const id = (g.combat as any).ruling.id;
    const g2 = apply(g, { type: 'narrator/fight-skip', id } as any, 'host');
    expect((g2.combat as any).ruling).toBeUndefined(); expect(g2.combat!.units.find((u) => u.side === 'pc')!.ap).toBe(6);
  });
});

describe('rules 1.14 review: a perk that asks for words', () => {
  it('a refused perk leaves nothing behind: the use is still there and the log is clean', () => {
    const f = fight([{ perks: { established_fact: 'mastered' } }]); attempt(f); answer(f, ['No.']);
    const g0 = JSON.stringify(f.g);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'A fact.' } as any)).toThrow(/already made an attempt/);
    expect(JSON.stringify(f.g)).toBe(g0);
  });
  it('a perk with no words is refused before anything is spent', () => {
    const f = fight([{ perks: { closing_argument: 'mastered' } }]); const g0 = JSON.stringify(f.g);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'closing_argument', text: '  ' } as any)).toThrow();
    expect(JSON.stringify(f.g)).toBe(g0);
  });
  it('a no keeps the turn\'s attempt used (the Narrator did answer); a skip gives it back', () => {
    const f = fight([{ perks: { established_fact: 'mastered' } }]);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'A fact.' } as any);
    answer(f, ['No.'], { perk: { accepted: false } });
    expect(() => attempt(f)).toThrow(/already made an attempt/);
  });
  it('a check may decide a perk: the use stays spent whatever the dice say', () => {
    const f = fight([{ perks: { established_fact: 'mastered' } }]);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'A fact.' } as any); f.g.rng = rngFor(2);
    answer(f, ['Maybe.'], { check: { skill: 'rumination', tn: 20 } });
    f.cb.round++; f.turn(f.pc);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'Another.' } as any)).toThrow();
  });
  it('in the Proving Ground there is no Narrator: the attempt and the perk are refused with that reason', () => {
    const f = fight([{ perks: { established_fact: 'mastered' } }]); (f.g as any).sandbox = { mode: 'solo', saved: {} };
    expect(() => attempt(f)).toThrow(/no Narrator in the Proving Ground/);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'established_fact', text: 'A fact.' } as any)).toThrow(/no Narrator in the Proving Ground/);
    f.act({ type: 'combat/say', charId: f.pc.charId!, text: 'Anyone?' }); expect(log(f)).toContain('Anyone?');
  });
});
