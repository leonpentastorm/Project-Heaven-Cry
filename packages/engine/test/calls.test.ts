// Calls (rules 1.13, Skeleton 2.0): the nine gamma skills' speech actions in a fight. The ladder, each Call's three
// steps, the limits, the AP rule, preview purity, the parley alias, the enemy AI and the view.
import { unitSave } from '../src';
import { reactionsUsed } from '../src';
import { describe, it, expect, beforeEach } from 'vitest';
import { CALLS, CALL, CALL_RULES, SKILL, calls, previewCall, callPad, callView, viewFor, previewAttack, resolveAttack, moveUnit, enemyIntent, enemyTurn, endTurn, parley,
  canReact, react, condOn, condSource, unitStrength, WEAPON, dropToPile, type Unit, type CallArgs } from '../src';
import { physFight, rig, type PhysSpec } from './helpers/physfight';
import { withGame, type FoeSpec } from './helpers/perkfight';

const NINE: Record<string, string> = { 'call.order': 'authority', 'call.rally': 'charisma', 'call.brief': 'eloquence', 'call.name_it': 'lore_master', 'call.cue': 'reaction_speed',
  'call.spot': 'vigilant', 'call.warn': 'sensory', 'call.threaten': 'intimidation', 'call.taunt': 'implication' };
const NO_GAMMA = Object.fromEntries(Object.values(NINE).map((s) => [s, 0]));
beforeEach(() => rig(null));

/** A fight on open ground: the PCs in a row from 2,2, the foes from 8,2, acting in that order (PCs first). */
function fight(specs: PhysSpec[], foes: FoeSpec[] = [{}], seed?: string) {
  const f = physFight(specs.map((s) => ({ ...s, skills: { ...NO_GAMMA, ...(s.skills || {}) } })), foes, { seed });
  f.pcs.forEach((u, i) => f.put(u, 2 + i + ',2')); f.foes.forEach((u, i) => f.put(u, 8 + i + ',2'));
  f.cb.order = [...f.pcs.map((u) => u.id), ...f.foes.map((u) => u.id)];
  const api = Object.assign(f, {
    /** Make a Call through the reducer with a unit (default: the active one). Returns the refusal, or null. */
    call(id: string, args: CallArgs = {}, u?: Unit): string | null {
      const who = u || f.cb.units.find((x) => x.id === f.cb.order[f.cb.turn])!;
      try { f.act({ type: 'combat/call', unitId: who.id, id, ...args } as any); return null; } catch (e: any) { return String(e?.message || e); }
    },
    cpv: (id: string, args: CallArgs = {}, u?: Unit) => withGame(f.g, () => previewCall(f.cb, f.unit((u || f.pc).id), id, args)),
    cpad: (u?: Unit) => withGame(f.g, () => callPad(f.cb, f.unit((u || f.pc).id))),
    /** The foe fails every save (but a natural 20) or passes every one (but a natural 1). */
    saves(u: Unit, n: number) { f.unit(u.id).sv = { body: n, brain: n, heart: n }; },
    next() { f.pass(); },
  });
  f.turn(f.pc);
  return api;
}
const speaker = (skill: string, pts: number, more: PhysSpec = {}): PhysSpec => ({ ...more, skills: { ...(more.skills || {}), [skill]: pts } });

describe('the data', () => {
  it('has nine Calls, one for each gamma skill, read from the skill data', () => {
    expect(CALLS.length).toBe(9);
    expect(Object.fromEntries(CALLS.map((c) => [c.id, c.skill]))).toEqual(NINE);
    for (const c of CALLS) { expect(SKILL[c.skill].slot, c.id).toBe('gamma'); expect(c.steps.map((s) => s.at)).toEqual(CALL_RULES.steps_at); expect(calls.callHandler(c.id), c.id).toBeTruthy(); }
    expect(CALLS.filter((c) => c.kind === 'hindering').map((c) => c.id)).toEqual(['call.spot', 'call.threaten', 'call.taunt']);
    expect(CALL['call.threaten'].save).toBe('heart'); expect(CALL['call.taunt'].save).toBe('heart'); expect(CALL['call.spot'].save).toBeUndefined();
    expect(calls.callSkillName(CALL['call.spot'])).toBe(SKILL.vigilant.name);
  });
});

describe('the ladder', () => {
  it('cost, range and step follow the points: 2 AP and 5 tiles at 1; step 2 at 3; 1 AP at 5; step 3 at 7; free first at 10', () => {
    const want: Record<number, [number, number, number]> = { 1: [2, 5, 1], 2: [2, 6, 1], 3: [2, 7, 2], 5: [1, 9, 2], 7: [1, 11, 3], 9: [1, 13, 3], 10: [0, 14, 3] };
    for (const [pts, [ap, range, step]] of Object.entries(want)) {
      const f = fight([speaker('charisma', +pts), {}]), e = f.cpad().find((x) => x.id === 'call.rally')!;
      expect([e.ap, e.range, e.step], 'points ' + pts).toEqual([ap, range, step]);
      expect(e.text).toBe(CALL['call.rally'].steps[step - 1].text); expect(e.ok).toBe(true); expect(e.skillName).toBe('Charisma');
      expect(e.reaction).toBe(+pts >= 9); expect(e.free).toBe(+pts === 10);
    }
  });
  it('the pad lists only the Calls the unit has a point for, and a Call with no point is refused', () => {
    const f = fight([{ skills: { charisma: 2, vigilant: 1 } }, {}]);
    expect(f.cpad().map((x) => x.id)).toEqual(['call.rally', 'call.spot']);
    expect(f.call('call.brief', { targetId: f.pcs[1].id })).toMatch(/Needs a point of Eloquence/);
    expect(f.pc.ap).toBe(6);
  });
  it('a Call is heard only within its range, and it is paid for', () => {
    const f = fight([speaker('charisma', 1), {}]); f.put(f.pcs[1], '8,2'); // 6 tiles away, the voice carries 5
    expect(f.call('call.rally', { targetId: f.pcs[1].id })).toMatch(/Too far to be heard \(5 tiles\)/);
    f.put(f.pcs[1], '7,2');
    expect(f.call('call.rally', { targetId: f.pcs[1].id })).toBeNull(); expect(f.pc.ap).toBe(4);
  });
  it('as many Calls a turn as the AP pays for; at 10 points only the first is free', () => {
    const f = fight([speaker('charisma', 10), {}, {}]);
    expect(f.call('call.rally', { targetId: f.pcs[1].id })).toBeNull(); expect(f.pc.ap).toBe(6);
    expect(f.cpad()[0].ap).toBe(1);
    expect(f.call('call.rally', { targetId: f.pcs[2].id })).toBeNull(); expect(f.pc.ap).toBe(5);
    f.cb.round++; f.turn(f.pc); expect(f.cpad()[0].ap).toBe(0); // a new turn: free again
  });
  it('from 9 points a Call may be made as a reaction, once a round, for the reaction and no AP', () => {
    const f = fight([speaker('charisma', 9), {}, {}]); f.next(); // the second PC's turn
    const ap = f.pc.ap;
    expect(f.cpv('call.rally', { targetId: f.pcs[1].id, react: true }).ap).toBe(0);
    expect(f.call('call.rally', { targetId: f.pcs[1].id, react: true }, f.pc)).toBeNull();
    expect(f.pc.ap).toBe(ap); expect(reactionsUsed(f.cb, f.pc)).toBe(1); expect(f.pcs[1].ap).toBe(8); // step 3's 2 AP, and on its own turn the AP lands now
    expect(f.fx('call').pop()).toMatchObject({ unit: f.pc.id, reaction: true });
    expect(f.call('call.rally', { targetId: f.pcs[2].id, react: true }, f.pc)).toMatch(/One Call as a reaction a round/);
    expect(f.call('call.rally', { targetId: f.pcs[2].id }, f.pc)).toMatch(/turn/); // not its turn: only as a reaction
    const g = fight([speaker('charisma', 8), {}]); g.next();
    expect(g.call('call.rally', { targetId: g.pcs[1].id, react: true }, g.pc)).toMatch(/needs 9 points of Charisma/);
    const h = fight([speaker('charisma', 9), {}]);
    expect(h.call('call.rally', { targetId: h.pcs[1].id, react: true })).toMatch(/your turn/); // on your own turn it is an action
  });
  it('emits one call event, and a refusal spends nothing and emits none', () => {
    const f = fight([speaker('charisma', 3), {}]);
    expect(f.call('call.rally', { targetId: f.foe.id })).toMatch(/Call to an ally/);
    expect(f.call('call.rally', { targetId: f.pc.id })).toMatch(/someone else/);
    expect(f.fx('call').length).toBe(0); expect(f.pc.ap).toBe(6);
    expect(f.call('call.rally', { targetId: f.pcs[1].id, text: 'On your feet.' })).toBeNull();
    expect(f.fx('call')).toEqual([expect.objectContaining({ k: 'call', unit: f.pc.id, id: 'call.rally', target: f.pcs[1].id, at: f.pc.pos, step: 2, kind: 'helping' })]);
    expect(f.cb.log.some((l) => l.includes('calls Rally to ' + f.pcs[1].name + ' "On your feet."'))).toBe(true);
    expect(f.cb.notes!.some((n) => n.includes('On your feet.'))).toBe(true);
  });
});

describe('the limits', () => {
  it('one helping Call and one hindering Call on a unit each round', () => {
    const f = fight([{ skills: { charisma: 5, eloquence: 5, vigilant: 5, intimidation: 5 } }, {}, {}]); f.saves(f.foe, 99);
    expect(f.call('call.rally', { targetId: f.pcs[1].id })).toBeNull();
    expect(f.call('call.brief', { targetId: f.pcs[1].id })).toMatch(/already been helped by a Call this round/);
    expect(f.call('call.brief', { targetId: f.pcs[2].id })).toBeNull(); // another ally is fine
    expect(f.call('call.spot', { targetId: f.foe.id })).toBeNull();
    expect(f.call('call.threaten', { targetId: f.foe.id })).toMatch(/already been hindered by a Call this round/);
    expect(f.pc.ap).toBe(3); // three Calls at 1 AP; the refusals cost nothing
    f.cb.round++; // a new round
    expect(f.cpv('call.brief', { targetId: f.pcs[1].id }).ok).toBe(true); expect(f.cpv('call.threaten', { targetId: f.foe.id }).ok).toBe(true);
  });
  it('a Silenced unit can\'t Call', () => {
    const f = fight([speaker('charisma', 9), {}]); f.pc.conds = { silenced: 1 };
    expect(f.call('call.rally', { targetId: f.pcs[1].id })).toMatch(/Silenced/);
    expect(f.cpad()[0]).toMatchObject({ ok: false, reaction: false }); expect(f.cpad()[0].why).toMatch(/Silenced/);
  });
  it('a Call deals no damage', () => {
    const f = fight([{ skills: { intimidation: 7, implication: 7, vigilant: 7 } }, {}], [{}, {}, {}]); for (const x of f.foes) f.saves(x, -99);
    const hp = f.foes.map((x) => x.hp);
    f.call('call.threaten', { targetId: f.foes[0].id }); f.call('call.taunt', { targetId: f.foes[1].id }); f.call('call.spot', { targetId: f.foes[2].id });
    expect(f.foes.map((x) => x.hp)).toEqual(hp); expect(f.fx('hurt').length).toBe(0);
  });
});

describe('AP a Call gives', () => {
  it('lands this turn for an ally still to act, on the next turn for one who has acted, and at once on their own turn', () => {
    const f = fight([speaker('charisma', 1), {}, {}]); f.next(); // PC 2's turn: PC 1 has acted, PC 3 has not
    const [, b, c] = f.pcs;
    f.cb.order = [f.pcs[1].id, f.pcs[0].id, f.pcs[2].id, f.foe.id]; f.turn(f.pcs[0]); // order: b, a (speaking), c
    expect(f.cpv('call.rally', { targetId: c.id }).gives).toEqual({ unit: c.id, ap: 1, when: 'this turn' });
    expect(f.cpv('call.rally', { targetId: b.id }).gives).toEqual({ unit: b.id, ap: 1, when: 'next turn' });
    expect(f.call('call.rally', { targetId: c.id })).toBeNull(); expect(f.unit(c.id).apNext).toBe(1); expect(f.unit(c.id).ap).not.toBe(7);
    expect(f.call('call.rally', { targetId: b.id })).toBeNull(); expect(f.unit(b.id).apNext).toBe(1);
    f.next(); expect(f.unit(c.id).ap).toBe(7); expect(f.cb.round).toBe(1); // c's turn, this round
    f.next(); f.next(); expect(f.cb.round).toBe(2); expect(f.unit(b.id).ap).toBe(7); // b's next turn
  });
  it('goes through the +3 cap and the turn\'s 9', () => {
    const f = fight([speaker('charisma', 7), {}]); f.unit(f.pcs[1].id).apNext = 2; // banked from a perk
    expect(f.call('call.rally', { targetId: f.pcs[1].id })).toBeNull(); expect(f.pcs[1].apNext).toBe(4); // 2 + Rally's 2
    f.next(); expect(f.pcs[1].ap).toBe(9); expect(f.cb.log.some((l) => /1 lost to the \+3 cap/.test(l))).toBe(true);
  });
});

describe('Order (Authority)', () => {
  it('step 1: the ally reloads, stands up or picks up, on their reaction and for none of their AP; never an attack', () => {
    const f = fight([speaker('authority', 1), { weapon: 'service_pistol' }]), a = f.pcs[1];
    f.unit(a.id).prone = true; const ap = a.ap;
    expect(f.call('call.order', { targetId: a.id })).toMatch(/Pick what to order: reload, stand up, pick up\./);
    expect(f.call('call.order', { targetId: a.id, opt: 'attack' })).toMatch(/Never to attack/);
    expect(f.call('call.order', { targetId: a.id, opt: 'move', tile: '3,3' })).toMatch(/needs 3 points of Authority/);
    expect(f.call('call.order', { targetId: a.id, opt: 'stand' })).toBeNull();
    expect(f.unit(a.id).prone).toBe(false); expect(f.unit(a.id).ap).toBe(ap); expect(reactionsUsed(f.cb, f.unit(a.id))).toBe(1); expect(f.pc.ap).toBe(4);
    f.cb.round++;
    expect(f.call('call.order', { targetId: a.id, opt: 'stand' })).toMatch(/isn't prone/);
    f.unit(a.id).ammo = 0; f.unit(a.id).mags = [];
    expect(f.call('call.order', { targetId: a.id, opt: 'reload' })).toMatch(/spare magazines/); expect(f.pc.ap).toBe(4); expect(reactionsUsed(f.cb, f.unit(a.id))).toBe(0); // the engine's own refusal: nothing spent (a new round: the count is the round's)
    f.unit(a.id).mags = [WEAPON[a.weapon].magazine!];
    expect(f.call('call.order', { targetId: a.id, opt: 'reload' })).toBeNull(); expect(f.unit(a.id).ammo).toBeGreaterThan(0); expect(f.unit(a.id).ap).toBe(ap);
  });
  it('pick up: everything in the pile under or next to the ally, for none of their AP', () => {
    const f = fight([speaker('authority', 1), {}]), a = f.pcs[1];
    expect(f.call('call.order', { targetId: a.id, opt: 'pickup' })).toMatch(/Nothing for .* to pick up/);
    withGame(f.g, () => dropToPile(f.cb, '3,3', [{ id: 'medkit', qty: 1 } as any]));
    const before = JSON.stringify(f.g); expect(f.cpv('call.order', { targetId: a.id, opt: 'pickup' }).ok).toBe(true); expect(JSON.stringify(f.g)).toBe(before);
    const ap = a.ap;
    expect(f.call('call.order', { targetId: a.id, opt: 'pickup' })).toBeNull();
    expect(f.cb.log.some((l) => l.startsWith(a.name + ' picks up '))).toBe(true); expect(f.unit(a.id).ap).toBe(ap);
    expect(f.call('call.order', { targetId: a.id, opt: 'pickup' })).toMatch(/helped by a Call this round/);
  });
  it('an ally with no reaction left, or Stunned, can\'t be Ordered', () => {
    const f = fight([speaker('authority', 3), {}]), a = f.pcs[1]; f.unit(a.id).prone = true;
    withGame(f.g, () => react(f.cb, f.unit(a.id), { kind: 'attack' }));
    expect(f.call('call.order', { targetId: a.id, opt: 'stand' })).toMatch(/no reaction left/);
    f.cb.round++; f.unit(a.id).conds = { stunned: 1 };
    expect(f.call('call.order', { targetId: a.id, opt: 'stand' })).toMatch(/Stunned/);
    expect(f.pc.ap).toBe(6);
  });
  it('step 2: or they move their Movement; step 3: two different things', () => {
    const f = fight([speaker('authority', 3), {}]), a = f.pcs[1], reach = calls.orderMoveTiles(a);
    expect(f.call('call.order', { targetId: a.id, opt: 'move', tile: 3 + reach + 1 + ',2' })).toMatch(/Too far/);
    const pv = f.cpv('call.order', { targetId: a.id, opt: 'move', tile: '3,3' }); expect(pv.ok).toBe(true); expect(pv.moves).toEqual([{ unit: a.id, to: '3,3' }]);
    expect(f.unit(a.id).pos).toBe('3,2'); // a preview moves nobody
    const ap = a.ap;
    expect(f.call('call.order', { targetId: a.id, opt: 'move', tile: '3,3' })).toBeNull(); expect(f.unit(a.id).pos).toBe('3,3'); expect(f.unit(a.id).ap).toBe(ap);
    f.cb.round++; f.unit(a.id).prone = true;
    expect(f.call('call.order', { targetId: a.id, opt: 'stand+move', tile: '3,2' })).toMatch(/two from 7 points/);
    const g = fight([speaker('authority', 7), {}]), b = g.pcs[1]; g.unit(b.id).prone = true;
    expect(g.call('call.order', { targetId: b.id, opt: 'stand+stand' })).toMatch(/two different things/);
    expect(g.call('call.order', { targetId: b.id, opt: 'stand+move', tile: '3,3' })).toBeNull();
    expect(g.unit(b.id).prone).toBe(false); expect(g.unit(b.id).pos).toBe('3,3'); expect(reactionsUsed(g.cb, g.unit(b.id))).toBe(1); expect(g.pc.ap).toBe(5);
  });
});

describe('Rally (Charisma)', () => {
  it('step 1: 1 AP; step 2: and 1 Pressure shed; step 3: 2 AP and 1 Pressure shed', () => {
    for (const [pts, ap, shed] of [[1, 1, 0], [3, 1, 1], [7, 2, 1]] as const) {
      const f = fight([speaker('charisma', pts), {}]); f.press(f.pcs[1], 2);
      expect(f.call('call.rally', { targetId: f.pcs[1].id })).toBeNull();
      expect(f.pcs[1].apNext, 'points ' + pts).toBe(ap); expect(f.pressure(f.pcs[1]), 'points ' + pts).toBe(2 - shed);
    }
  });
});

describe('Brief (Eloquence)', () => {
  const shoot = (f: ReturnType<typeof fight>) => f.act({ type: 'combat/attack', unitId: f.pcs[1].id, targetId: f.foe.id, mode: 'shot' } as any);
  const prone = (f: ReturnType<typeof fight>) => f.act({ type: 'combat/prone', unitId: f.pcs[1].id } as any);
  it('step 1: the next action costs 1 AP less; an action after it costs its own', () => {
    const f = fight([speaker('eloquence', 1), { weapon: 'service_pistol' }]);
    expect(f.call('call.brief', { targetId: f.pcs[1].id })).toBeNull(); expect(f.pcs[1].call?.brief?.cuts).toEqual([1]);
    f.next(); expect(f.pcs[1].ap).toBe(6);
    prone(f); expect(f.pcs[1].ap).toBe(6); expect(f.pcs[1].call?.brief).toBeUndefined();
    prone(f); expect(f.pcs[1].ap).toBe(5);
  });
  it('step 2: the next two actions; step 3: 2 AP off the next and 1 off the one after', () => {
    const f = fight([speaker('eloquence', 3), { weapon: 'service_pistol' }]);
    f.call('call.brief', { targetId: f.pcs[1].id }); f.next();
    prone(f); prone(f); expect(f.pcs[1].ap).toBe(6); prone(f); expect(f.pcs[1].ap).toBe(5);
    const g = fight([speaker('eloquence', 7), { weapon: 'service_pistol' }]); rig({ hit: false, die: 5 });
    g.call('call.brief', { targetId: g.pcs[1].id }); expect(g.pcs[1].call?.brief?.cuts).toEqual([2, 1]); g.next();
    const cost = withGame(g.g, () => previewAttack(g.cb, g.pcs[1], g.foe, 'shot')).ap; expect(cost).toBeGreaterThanOrEqual(2);
    shoot(g); expect(g.pcs[1].ap).toBe(6 - cost + 2);
    prone(g); expect(g.pcs[1].ap).toBe(6 - cost + 2); expect(g.pcs[1].apGained).toBe(3); // counted in the turn's +3
  });
  it('holds until the end of the ally\'s next turn, and the card of an action shows the loan', () => {
    const f = fight([speaker('eloquence', 1), { weapon: 'service_pistol' }]);
    f.call('call.brief', { targetId: f.pcs[1].id }); f.next();
    f.unit(f.pcs[1].id).ap = 1; // 1 AP left, a 2 AP shot: the Brief pays the difference
    expect(withGame(f.g, () => previewAttack(f.cb, f.pcs[1], f.foe, 'shot')).why || '').not.toMatch(/Needs/);
    f.next(); expect(f.pcs[1].call?.brief).toBeUndefined(); // unused, it ends with the turn
  });
});

describe('Name It (Lore Master)', () => {
  it('+2, +3, +4 on every save until the speaker\'s next turn; step 3 ends Shaken and Afraid', () => {
    for (const [pts, n] of [[1, 2], [3, 3], [7, 4]] as const) {
      const f = fight([speaker('lore_master', pts), {}]), a = f.pcs[1], before = unitSave(f.unit(a.id), 'body');
      expect(f.call('call.name_it', { targetId: a.id })).toBeNull();
      expect(unitSave(f.unit(a.id), 'body') - before, 'points ' + pts).toBe(n);
      expect(unitSave(f.unit(a.id), 'heart') - unitSave({ ...f.unit(a.id), call: {} } as any, 'heart')).toBe(n);
    }
    const f = fight([speaker('lore_master', 7), {}]), a = f.pcs[1];
    Object.assign(f.unit(a.id), { conds: { shaken: 2, fear: 2 } });
    expect(f.cpv('call.name_it', { targetId: a.id }).notes.join(' ')).toMatch(/Ends Shaken and Afraid/);
    expect(f.call('call.name_it', { targetId: a.id })).toBeNull();
    expect(condOn(f.unit(a.id), 'shaken')).toBe(false); expect(condOn(f.unit(a.id), 'fear')).toBe(false);
  });
  it('may be called to yourself', () => {
    const f = fight([speaker('lore_master', 1), {}]);
    expect(f.call('call.name_it')).toBeNull(); expect(f.pc.call?.saves?.n).toBe(2); expect(f.pc.call?.helped?.id).toBe('call.name_it');
  });
});

describe('Cue (Reaction Speed)', () => {
  it('step 1: a second reaction, until the start of the speaker\'s next turn', () => {
    const f = fight([speaker('reaction_speed', 1), {}]), a = f.pcs[1];
    expect(f.call('call.cue', { targetId: a.id, tile: '3,3' })).toMatch(/needs 3 points of Reaction Speed/);
    expect(f.call('call.cue', { targetId: a.id })).toBeNull();
    const doReact = () => withGame(f.g, () => react(f.cb, f.unit(a.id), { kind: 'attack' })), can = () => withGame(f.g, () => canReact(f.cb, f.unit(a.id)));
    expect(doReact()).toBe(true); expect(can()).toBe(true); expect(doReact()).toBe(true); expect(can()).toBe(false); expect(doReact()).toBe(false);
    const g = fight([speaker('reaction_speed', 1), {}]); g.call('call.cue', { targetId: g.pcs[1].id });
    g.turn(g.pc); expect(g.pcs[1].call?.cue).toBeUndefined(); // the speaker's next turn: it ends
  });
  it('a Stunned ally can\'t be Cued, and a Suppressed one gets nothing from it', () => {
    const f = fight([speaker('reaction_speed', 3), {}]), a = f.pcs[1];
    f.unit(a.id).conds = { stunned: 1 }; expect(f.call('call.cue', { targetId: a.id })).toMatch(/Stunned/);
    f.unit(a.id).conds = { suppressed: 1 }; expect(f.call('call.cue', { targetId: a.id })).toMatch(/Suppressed/);
    f.unit(a.id).conds = {}; f.press(a, 3); expect(f.call('call.cue', { targetId: a.id })).toMatch(/Suppressed/);
    expect(f.pc.ap).toBe(6);
  });
  it('step 2: the reaction may be a step of 1 tile, now; step 3: the ally acts straight after the speaker', () => {
    const f = fight([speaker('reaction_speed', 3), {}]), a = f.pcs[1];
    expect(f.call('call.cue', { targetId: a.id, tile: '3,4' })).toMatch(/1 tile/);
    expect(f.call('call.cue', { targetId: a.id, tile: '3,3' })).toBeNull(); expect(f.unit(a.id).pos).toBe('3,3'); expect(f.unit(a.id).call?.cue).toBeUndefined();
    const g = fight([speaker('reaction_speed', 7), {}, {}]), [s, b, c] = g.pcs, was = [...g.cb.order];
    expect(g.cpv('call.cue', { targetId: c.id }).notes.join(' ')).toMatch(/acts straight after you/);
    expect(g.call('call.cue', { targetId: c.id })).toBeNull(); expect(g.cb.order.slice(0, 3)).toEqual([s.id, c.id, b.id]);
    g.next(); expect(g.cb.order[g.cb.turn]).toBe(c.id);
    while (g.cb.round === 1) g.next(); expect(g.cb.order).toEqual(was); // the order is put back when the round ends
  });
});

describe('Spot (Vigilance)', () => {
  const behindCover = (pts: number, n = 2) => { const f = fight([speaker('vigilant', pts), ...Array(n).fill({ weapon: 'service_pistol' })]); f.pcs.forEach((u, i) => f.put(u, '2,' + (2 + i))); f.put(f.foe, '6,3'); return f; };
  const shot = (f: ReturnType<typeof fight>, u: Unit) => withGame(f.g, () => previewAttack(f.cb, f.unit(u.id), f.foe, 'shot', { free: true }));
  it('step 1: the next ally to attack it ignores its cover; the speaker doesn\'t; a preview uses nothing up', () => {
    const f = behindCover(1), [s, a, b] = f.pcs;
    expect(shot(f, a).cover).toBeGreaterThan(0);
    expect(f.call('call.spot', { targetId: f.foe.id })).toBeNull(); expect(f.foe.call?.spot).toMatchObject({ left: 1, users: [], unhide: false, hit: 0 });
    expect(shot(f, a).cover).toBe(0); expect(shot(f, b).cover).toBe(0); expect(shot(f, s).cover).toBeGreaterThan(0);
    expect(f.foe.call?.spot?.left).toBe(1); // asking changed nothing
    f.next(); rig({ hit: false, die: 5 });
    f.act({ type: 'combat/attack', unitId: a.id, targetId: f.foe.id, mode: 'shot' } as any);
    expect(f.foe.call?.spot).toBeUndefined(); expect(shot(f, b).cover).toBeGreaterThan(0); // one ally: used up by the real attack
  });
  it('step 2: it isn\'t Hidden to the ally who attacks next, and a Hidden enemy in the speaker\'s sight can be Spotted', () => {
    const f = behindCover(3), [s, a] = f.pcs; f.unit(f.foe.id).hidden = true;
    expect(shot(f, a).why).toMatch(/can't see/);
    expect(f.cpv('call.spot', { targetId: f.foe.id }).ok).toBe(true);
    const low = behindCover(1); low.unit(low.foe.id).hidden = true;
    expect(low.call('call.spot', { targetId: low.foe.id })).toBe('Pick an enemy who can hear you.'); // step 1 can't: the same words as nobody there
    expect(f.call('call.spot', { targetId: f.foe.id })).toBeNull();
    expect(shot(f, a).ok).toBe(true); expect(shot(f, s).why).toMatch(/can't see/); expect(f.foe.hidden).toBe(true);
  });
  it('step 3: the next two allies, at +1 to hit', () => {
    const f = behindCover(7), [, a, b] = f.pcs;
    expect(f.call('call.spot', { targetId: f.foe.id })).toBeNull();
    expect(shot(f, a).terms!.find((t) => t.label === 'Spotted')?.v).toBe(1);
    rig({ hit: false, die: 5 });
    f.next(); f.act({ type: 'combat/attack', unitId: a.id, targetId: f.foe.id, mode: 'shot' } as any); expect(f.foe.call?.spot?.left).toBe(1);
    expect(shot(f, a).cover).toBeGreaterThan(0); // the same ally doesn't use it twice
    f.next(); f.act({ type: 'combat/attack', unitId: b.id, targetId: f.foe.id, mode: 'shot' } as any, 'p2'); expect(f.foe.call?.spot).toBeUndefined();
  });
  it('the mark ends at the start of the speaker\'s next turn', () => {
    const f = behindCover(1); f.call('call.spot', { targetId: f.foe.id }); f.turn(f.pc); expect(f.foe.call?.spot).toBeUndefined();
  });
});

describe('Warn (Senses)', () => {
  const melee = (pts: number, args: (f: ReturnType<typeof fight>) => CallArgs = () => ({})) => {
    const f = fight([speaker('sensory', pts), {}], [{ weapon: 'sabre' }]), a = f.pcs[1]; f.put(a, '6,2'); f.put(f.foe, '7,2');
    expect(f.call('call.warn', { targetId: a.id, ...args(f) })).toBeNull(); f.turn(f.foe); rig({ hit: true, die: 12 });
    return f;
  };
  const swing = (f: ReturnType<typeof fight>) => withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.foe, f.pcs[1], 'melee', null));
  it('step 1: the ally steps 1 tile before the next attack on them; a swing that can\'t reach is wasted', () => {
    const f = melee(1), a = f.pcs[1], hp = a.hp, ap = f.foe.ap;
    const before = JSON.stringify(f.cb); withGame(f.g, () => previewAttack(f.cb, f.foe, f.pcs[1], 'melee')); expect(JSON.stringify(f.cb)).toBe(before); // a card doesn't use the warning
    const r = swing(f);
    expect(r.cancelled).toBe(true); expect(f.unit(a.id).hp).toBe(hp); expect(f.unit(a.id).pos).not.toBe('6,2'); expect(f.foe.ap).toBeLessThan(ap);
    const r2 = swing(f); expect(r2.cancelled).toBeFalsy(); // one attack only (it is out of reach now: refused, not stepped again)
    expect(f.unit(a.id).call?.warn).toBeUndefined();
  });
  it('step 2: up to 2 tiles, to the tile the speaker named', () => {
    const f = melee(3, () => ({ tile: '4,2' })), a = f.pcs[1];
    swing(f); expect(f.unit(a.id).pos).toBe('4,2');
    const g = fight([speaker('sensory', 1), {}]); g.put(g.pcs[1], '6,2');
    expect(g.call('call.warn', { targetId: g.pcs[1].id, tile: '4,2' })).toMatch(/within 1 step/);
  });
  it('step 3: and that attack is at −2 to hit (a shot they can\'t step out of still comes)', () => {
    const f = fight([speaker('sensory', 7), {}], [{ weapon: 'service_pistol' }]), a = f.pcs[1];
    const base = withGame(f.g, () => previewAttack(f.cb, f.foe, f.unit(a.id), 'shot', { free: true }));
    expect(f.call('call.warn', { targetId: a.id })).toBeNull();
    const pv = withGame(f.g, () => previewAttack(f.cb, f.foe, f.unit(a.id), 'shot', { free: true }));
    expect(pv.terms!.find((t) => t.label === 'Warned')?.v).toBe(-2); expect(pv.toHit).toBe(base.toHit - 2);
    f.turn(f.foe); rig({ hit: false, die: 5 });
    const r = withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.foe, f.unit(a.id), 'shot', null));
    expect(r.cancelled).toBeFalsy(); expect(f.unit(a.id).pos).toBe('3,2'); // nowhere within 2 tiles is out of the line: it stays
    withGame(f.g, () => endTurn(f.cb, f.g.rng)); expect(f.unit(a.id).call?.warn).toBeUndefined();
  });
});

describe('Threaten (Intimidation)', () => {
  it('is a Heart save against 12 + the speaker\'s strength (points − 1)', () => {
    const f = fight([speaker('intimidation', 7), {}]);
    expect(withGame(f.g, () => unitStrength(f.pc, 'intimidation'))).toBe(6);
    expect(f.cpv('call.threaten', { targetId: f.foe.id }).save).toEqual({ unit: f.foe.id, family: 'heart', tn: 18 });
    expect(f.cpad()[0].save).toEqual({ family: 'heart', tn: 18 });
    f.saves(f.foe, 99); f.unit(f.foe.id).sv!.heart = -99; // only the Heart save is rolled
    expect(f.call('call.threaten', { targetId: f.foe.id })).toBeNull(); expect(condOn(f.foe, 'shaken')).toBe(true);
    const g = fight([speaker('intimidation', 7), {}]); g.saves(g.foe, -99); g.unit(g.foe.id).sv!.heart = 99;
    expect(g.call('call.threaten', { targetId: g.foe.id })).toBeNull(); expect(condOn(g.foe, 'shaken')).toBe(false); expect(g.foe.call?.apLoss).toBeUndefined();
    expect(g.pc.ap).toBe(5); // a save that holds still costs the Call
  });
  it('step 1: Shaken and −1 AP next turn; step 2: and it can\'t move toward the speaker that turn; step 3: −2 AP', () => {
    for (const [pts, loss, cowed] of [[1, 1, false], [3, 1, true], [7, 2, true]] as const) {
      const f = fight([speaker('intimidation', pts), {}]); f.saves(f.foe, -99); f.put(f.foe, '6,2');
      expect(f.call('call.threaten', { targetId: f.foe.id })).toBeNull();
      expect(condOn(f.foe, 'shaken'), 'points ' + pts).toBe(true); expect(condSource(f.foe, 'shaken')).toBe(f.pc.id);
      expect(f.foe.call?.apLoss?.n).toBe(loss); expect(!!f.foe.call?.cowed).toBe(cowed);
      f.turn(f.foe); expect(f.foe.ap, 'points ' + pts).toBe(6 - loss); expect(f.foe.call?.apLoss).toBeUndefined();
      const toward = withGame(f.g, () => moveUnit(f.cb, f.unit(f.foe.id), '5,2', f.g.rng));
      if (cowed) { expect(toward).toMatch(/Threatened by .*can't move toward/); expect(withGame(f.g, () => moveUnit(f.cb, f.unit(f.foe.id), '7,2', f.g.rng))).toBeNull(); }
      else expect(toward).toBeNull();
      withGame(f.g, () => endTurn(f.cb, f.g.rng)); expect(f.foe.call?.cowed).toBeUndefined(); // that turn only
    }
  });
  it('Name It makes a Threaten harder to land (+2 on the Heart save)', () => {
    const f = fight([speaker('lore_master', 1), {}]), a = f.pcs[1], was = unitSave(f.unit(a.id), 'heart');
    f.call('call.name_it', { targetId: a.id }); expect(unitSave(f.unit(a.id), 'heart')).toBe(was + 2);
  });
});

describe('Taunt (Insinuation)', () => {
  it('step 1: a Heart save or Taunted; steps 2 and 3: its attack on the speaker costs 1 and 2 AP more', () => {
    for (const [pts, more] of [[1, 0], [3, 1], [7, 2]] as const) {
      const f = fight([speaker('implication', pts), {}], [{ weapon: 'service_pistol' }]); f.put(f.foe, '6,2'); f.saves(f.foe, 99); f.unit(f.foe.id).sv!.heart = -99;
      const cost = (t: Unit) => withGame(f.g, () => previewAttack(f.cb, f.unit(f.foe.id), f.unit(t.id), 'shot')), base = cost(f.pc).ap;
      expect(f.cpv('call.taunt', { targetId: f.foe.id }).save).toMatchObject({ family: 'heart', tn: 12 + pts - 1 });
      expect(f.call('call.taunt', { targetId: f.foe.id })).toBeNull();
      expect(condSource(f.foe, 'taunted'), 'points ' + pts).toBe(f.pc.id);
      f.turn(f.foe);
      expect(cost(f.pc).ap, 'points ' + pts).toBe(base + more); expect(cost(f.pcs[1]).why).toMatch(/Taunted/);
      rig({ hit: false, die: 5 }); const ap = f.foe.ap;
      withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(f.pc.id), 'shot', null));
      expect(f.foe.ap).toBe(ap - base - more); expect(condOn(f.foe, 'taunted')).toBe(false);
      expect(cost(f.pc).ap).toBe(base); // the first attack only
    }
  });
});

describe('a preview changes nothing', () => {
  it('previewCall and callPad leave the fight exactly as it was, for all nine, with marks standing', () => {
    const all = Object.fromEntries(Object.values(NINE).map((s) => [s, 7]));
    const f = fight([{ skills: all }, { weapon: 'service_pistol' }, {}], [{ weapon: 'sabre' }, {}]); f.unit(f.pcs[1].id).prone = true;
    const args: Record<string, CallArgs> = { 'call.order': { targetId: f.pcs[1].id, opt: 'stand+reload' }, 'call.rally': { targetId: f.pcs[1].id }, 'call.brief': { targetId: f.pcs[1].id },
      'call.name_it': { targetId: f.pcs[2].id }, 'call.cue': { targetId: f.pcs[2].id, tile: '4,3' }, 'call.spot': { targetId: f.foe.id }, 'call.warn': { targetId: f.pcs[2].id, tile: '4,3' },
      'call.threaten': { targetId: f.foe.id }, 'call.taunt': { targetId: f.foes[1].id } };
    f.unit(f.pcs[1].id).ammo = 0;
    const snap = () => JSON.stringify(f.g);
    let before = snap();
    for (const c of CALLS) { const pv = f.cpv(c.id, args[c.id]); expect(pv.ok, c.id + ': ' + pv.why).toBe(true); expect(pv.notes.length + (pv.save ? 1 : 0), c.id).toBeGreaterThan(0); }
    f.cpad(); expect(snap()).toBe(before);
    // with marks on the field: Spot and Taunt on the foes, Warn on an ally; cards and attack previews use none of them up
    for (const f2 of f.foes) f.saves(f2, -99);
    f.call('call.spot', { targetId: f.foe.id }); f.call('call.warn', { targetId: f.pcs[2].id }); f.call('call.taunt', { targetId: f.foes[1].id });
    before = snap();
    for (const c of CALLS) f.cpv(c.id, args[c.id]);
    withGame(f.g, () => { for (const a of f.cb.units) for (const b of f.cb.units) if (a !== b) { previewAttack(f.cb, a, b, 'shot'); previewAttack(f.cb, a, b, 'melee'); } enemyIntent(f.cb, f.foe); });
    f.cpad(f.pcs[1]); expect(snap()).toBe(before);
  });
});

describe('combat/parley kind threaten', () => {
  it('is the Threaten Call\'s effect, on the old action: 2 AP, 8 tiles, and it is the target\'s hindering Call of the round', () => {
    const f = fight([speaker('intimidation', 3), {}]); f.saves(f.foe, -99); f.put(f.foe, '10,2'); // 8 tiles: past a 3-point voice (7), inside Talk's 8
    expect(f.call('call.threaten', { targetId: f.foe.id })).toMatch(/Too far/);
    f.act({ type: 'combat/parley', unitId: f.pc.id, targetId: f.foe.id, kind: 'threaten', text: 'Walk away.' } as any);
    expect(f.pc.ap).toBe(4); expect(condOn(f.foe, 'shaken')).toBe(true);
    expect(f.foe.call?.apLoss?.n).toBe(1); expect(f.foe.call?.cowed).toBeTruthy(); expect(f.foe.call?.hindered).toMatchObject({ r: 1, id: 'call.threaten' });
    expect(f.cb.log.some((l) => /threatens .*"Walk away\.".*is Shaken.*−1 AP on its next turn/.test(l))).toBe(true);
    expect(() => f.act({ type: 'combat/parley', unitId: f.pc.id, targetId: f.foe.id, kind: 'threaten' } as any)).toThrow(/already been hindered/);
    // Persuade is not a Call: it is neither limited nor changed
    f.act({ type: 'combat/parley', unitId: f.pc.id, targetId: f.foe.id, kind: 'persuade' } as any); expect(f.pc.ap).toBe(2);
    // a speaker with no Intimidation still threatens, at step 1
    const g = fight([{}, {}]); g.saves(g.foe, -99);
    expect(withGame(g.g, () => parley(g.cb, g.g.rng, g.pc, g.foe, 'threaten'))).toBeNull(); expect(g.foe.call?.apLoss?.n).toBe(1); expect(g.foe.call?.cowed).toBeUndefined();
  });
});

describe('enemies', () => {
  it('an elite and a boss have Calls and a level; a minion and a soldier have none', () => {
    const f = fight([{}], [{ tier: 'minion' }, { tier: 'soldier' }, { tier: 'elite' }, { tier: 'boss' }]);
    expect(f.foes.map((x) => [x.calls, x.callLevel])).toEqual([[undefined, undefined], [undefined, undefined], [['call.threaten', 'call.rally'], 3], [['call.threaten', 'call.taunt', 'call.rally'], 5]]);
    expect(calls.callLevel(f.foes[2], CALL['call.threaten'])).toBe(3); expect(calls.callLevel(f.foes[2], CALL['call.taunt'])).toBe(0);
    expect(withGame(f.g, () => calls.callAp(f.cb, f.foes[3], CALL['call.threaten']))).toBe(1);
  });
  it('an officer with someone to lead Threatens once a turn, says so when read, and plans without changing anything', () => {
    const f = fight([{}, {}], [{ tier: 'elite' }, { tier: 'soldier' }]); f.put(f.foe, '8,2'); f.saves(f.pc, -99); f.saves(f.pcs[1], -99);
    f.turn(f.foe);
    const before = JSON.stringify(f.g), it0 = withGame(f.g, () => enemyIntent(f.cb, f.foe));
    expect(it0.text).toMatch(/^call Threaten at /); expect(JSON.stringify(f.g)).toBe(before);
    withGame(f.g, () => enemyTurn(f.cb, f.g.rng));
    expect(f.cb.log.filter((l) => l.startsWith(f.foe.name + ' calls ')).length).toBe(1);
    const ev = f.fx('call'); expect(ev.length).toBe(1); expect(ev[0]).toMatchObject({ unit: f.foe.id, id: 'call.threaten', step: 2, kind: 'hindering', target: it0.targetId });
    const t = f.unit(it0.targetId!); expect(condOn(t, 'shaken')).toBe(true); expect(t.call?.apLoss?.n).toBe(1);
    f.turn(t); expect(t.ap).toBe(5); // the player's turn is 1 AP short
  });
  it('an elite alone doesn\'t Call, and a minion never does', () => {
    const f = fight([{}], [{ tier: 'elite' }]); f.turn(f.foe);
    expect(withGame(f.g, () => calls.aiCall(f.cb, f.foe))).toBeNull();
    const g = fight([{}], [{ tier: 'minion' }, { tier: 'minion' }]); g.turn(g.foe);
    expect(withGame(g.g, () => calls.aiCall(g.cb, g.foe))).toBeNull();
  });
  it('a boss Rallies a Pressed soldier of its own', () => {
    const f = fight([{}], [{ tier: 'boss' }, { tier: 'soldier' }]); f.unit(f.pc.id).conds = { shaken: 3 }; f.press(f.foes[1], 2); f.turn(f.foe);
    const p = withGame(f.g, () => calls.aiCall(f.cb, f.foe)); expect(p).toMatchObject({ id: 'call.rally', args: { targetId: f.foes[1].id } });
    expect(withGame(f.g, () => calls.useCall(f.cb, f.foe, p!.id, p!.args, f.g.rng))).toBeNull();
    expect(f.foes[1].apNext).toBe(1); expect(f.pressure(f.foes[1])).toBe(1); expect(f.foe.ap).toBe(5); // level 5: 1 AP, step 2
  });
});

describe('the view', () => {
  it('a mark shows to the side that made it; what a failed save put on your own unit shows to you', () => {
    const f = fight([{ skills: { vigilant: 7, intimidation: 7, sensory: 7 } }, {}]); f.saves(f.foe, -99);
    f.call('call.spot', { targetId: f.foe.id }); f.call('call.warn', { targetId: f.pcs[1].id });
    const foe = f.unit(f.foe.id), ally = f.unit(f.pcs[1].id);
    expect(callView(foe, 'pc')).toBe(foe); // its makers see all of it
    expect(callView(foe, 'foe').call).toBeUndefined(); // the Spotted side isn't told
    expect(callView(ally, 'foe').call).toBeUndefined(); // nor where a warned unit will step
    expect(callView(f.unit(f.pc.id), 'foe').call).toBeUndefined(); // nor the speaker's own counters
    (foe.call ||= {}).apLoss = { by: f.pc.id, side: 'pc', n: 1 };
    expect(callView(foe, 'foe').call).toEqual({ apLoss: { by: f.pc.id, side: 'pc', n: 1 } });
    // through viewFor: an enemy-made mark on a player's unit is taken out of the player's view
    (ally.call ||= {}).spot = { by: f.foe.id, side: 'foe', r: 1, left: 1, users: [], live: null, hit: 0, unhide: false };
    const v = viewFor(f.g, 'host').combat!.units.find((x) => x.id === ally.id)!;
    expect(v.call?.spot).toBeUndefined(); expect(v.call?.warn).toBeTruthy(); expect(f.unit(ally.id).call?.spot).toBeTruthy(); // the state itself is untouched
  });
});
