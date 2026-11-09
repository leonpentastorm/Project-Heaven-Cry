// Faith 2.1 review fixes (rules 1.6.1; spec section 14 items 719-723, and 709 and 713 clarified): a switch never raises
// Devotion, apostasy ends a grudge, the host's Next session, the Proving Ground's tag caps, a grudge's condition in the
// fight (its rounds of the bearer's own turns; never carried into the story), a turn's days before its faith ops, the
// pact's fx, the one Devotion XP format, the rite texts in XP.
import { describe, expect, it } from 'vitest';
import {
  apply, newGame, faithView, beliefOf, condOn, d20, setDevotionXp, devotionThreshold, devotionXpOf, devotionWords, tagDevotion, grudgeOf,
  FAITH_FX, FAITH_PATRONS, DEVOTION_XP, TAG_CAPS,
  type GameState, type Character, type Action,
} from '../src';
import { applyCond } from '../src/magic';
import { storyWith, withGame } from './helpers/perkfight';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const said = (g: GameState, re: RegExp) => g.story.entries.some((e) => re.test(String(e.head || '') + ' ' + String(e.text || '')));
const storyFx = (g: GameState, k: string) => (((g.story as any).fx || []) as any[]).filter((e) => e.k === k);
function faithful(patron = 'mother_ember', level = 3, faith = 5) {
  const s = storyWith([{ name: 'Saint', skills: { faith } }, { name: 'Friend' }]);
  const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron }; c.patron = patron; setDevotionXp(c, devotionThreshold(level));
  return { s, c: (): Character => s.g.characters[c.id], ally: (): Character => s.g.characters[s.chars[1].id], act: (a: any, by = 'host') => s.act(a as Action, by) };
}
const FIGHT = { narration: 'Fight!', combat: { name: 'Ambush', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'soldier', weapon: 'service_pistol', at: '' }] } };
/** Win the fight at once (every foe down), through the reducer's own end-of-fight path. */
function winFight(s: { g: GameState }, act: (a: any, by?: string) => GameState) {
  const cb = s.g.combat!; for (const u of cb.units) if (u.side === 'foe') { u.hp = 0; u.dead = true; }
  act({ type: 'combat/end-turn', unitId: cb.order[cb.turn] });
}

describe('a switch never raises Devotion (item 719)', () => {
  it('a Miracle\'s reset to 0 can\'t be undone by two pacts in a turn', () => {
    const { s, c, ally, act } = faithful('mother_ember', 8, 7); ally().hp = 10;
    act({ type: 'faith/pray', charId: c().id, kind: 'miracle', id: 'everyone_home' });
    expect(c().devotionXp).toBe(0);
    s.g.rng.state = rngFor(20); act({ type: 'faith/pact', charId: c().id, patron: 'the_quartermaster' });
    expect(c().patron).toBe('the_quartermaster'); expect(c().devotionXp).toBe(0); expect(c().devotion).toBe(0);
    s.g.rng.state = rngFor(20); act({ type: 'faith/pact', charId: c().id, patron: 'mother_ember' });
    expect(c().devotionXp).toBe(0); expect(said(s.g, /a new pact never raises Devotion/)).toBe(true);
  });
  it('Devotion 1 stays 1 (its XP kept); Devotion 8 falls to the conversion\'s 3; an Atheist converts at 3 as before', () => {
    const a = faithful('mother_ember', 1, 7); setDevotionXp(a.c(), 17);
    a.s.g.rng.state = rngFor(20); a.act({ type: 'faith/pact', charId: a.c().id, patron: 'counting_weaver' });
    expect(a.c().devotionXp).toBe(17); expect(a.c().devotion).toBe(1);
    const b = faithful('mother_ember', 8, 7);
    b.s.g.rng.state = rngFor(20); b.act({ type: 'faith/pact', charId: b.c().id, patron: 'counting_weaver' });
    expect(b.c().devotionXp).toBe(45);
    const at = faithful('mother_ember', 3, 7); at.act({ type: 'faith/apostasy', charId: at.c().id }); at.c().faithLeft = null;
    at.act({ type: 'faith/pact', charId: at.c().id, patron: 'the_matchmaker' }); expect(at.c().devotionXp).toBe(45);
  });
  it('the pact\'s fx gives the real change: from the old XP and level, the level only when it changed, the patron named', () => {
    const b = faithful('mother_ember', 8, 7);
    b.s.g.rng.state = rngFor(20); b.act({ type: 'faith/pact', charId: b.c().id, patron: 'counting_weaver' });
    expect(storyFx(b.s.g, FAITH_FX.devotion).pop()).toMatchObject({ delta: 45 - 270, xp: 45, now: 3, was: 8, level: 3, pact: 'counting_weaver' });
    const k = faithful('mother_ember', 3, 7);
    k.s.g.rng.state = rngFor(20); k.act({ type: 'faith/pact', charId: k.c().id, patron: 'counting_weaver' });
    const e = storyFx(k.s.g, FAITH_FX.devotion).pop(); expect(e).toMatchObject({ delta: 0, xp: 45, now: 3, was: 3, pact: 'counting_weaver' }); expect(e.level).toBeUndefined();
    const at = faithful('mother_ember', 3, 7); at.act({ type: 'faith/apostasy', charId: at.c().id }); at.c().faithLeft = null;
    at.act({ type: 'faith/pact', charId: at.c().id, patron: 'the_matchmaker' });
    expect(storyFx(at.s.g, FAITH_FX.devotion).pop()).toMatchObject({ delta: 45, xp: 45, now: 3, was: 0, level: 3, pact: 'the_matchmaker' });
  });
});

describe('apostasy ends a grudge (item 720)', () => {
  it('an Atheist carries no grudge into a fight', () => {
    const { s, c, act } = faithful('nerukhan', 6, 6);
    act({ type: 'faith/pact', charId: c().id, patron: 'mother_ember' }); expect(grudgeOf(s.g, c())).not.toBeNull();
    act({ type: 'faith/apostasy', charId: c().id });
    expect(beliefOf(c()).kind).toBe('atheist'); expect(c().grudge).toBeUndefined(); expect(faithView(s.g, c().id)!.grudge).toBeNull();
    expect(said(s.g, /Holy Father Nerukhan's grudge ends: Saint has no patron left/)).toBe(true);
    act({ type: 'narrator/turn', turn: FIGHT });
    const u = s.g.combat!.units.find((x) => x.charId === c().id)!;
    expect(condOn(u, 'marked')).toBe(false); expect(s.g.combat!.log.some((l) => /Grudge/.test(l))).toBe(false);
  });
});

describe('Next session (item 721)', () => {
  it('the host moves the session on in the room: Echo 1, rites again, the caps reset, a grudge counts down and ends', () => {
    const { s, c, act } = faithful('nerukhan', 6, 6);
    act({ type: 'faith/pact', charId: c().id, patron: 'mother_ember' }); // a 3-session grudge
    const n0 = s.g.sessionN!; expect(faithView(s.g, c().id)!.grudge!.sessionsLeft).toBe(3);
    c().echo = 0; (c().ritesKept ||= {})['mother_ember.x'] = n0;
    withGame(s.g, () => { tagDevotion(s.g, null, c(), 'heal'); tagDevotion(s.g, null, c(), 'supply'); });
    expect(faithView(s.g, c().id)!.tagXp.scene).toBe(2);
    expect(() => act({ type: 'session/next' }, 'guest')).toThrow(/Only the host/);
    act({ type: 'session/next' });
    expect(s.g.sessionN).toBe(n0 + 1); expect(c().echo).toBe(1); expect(said(s.g, new RegExp('SESSION ' + (n0 + 1)))).toBe(true);
    expect(faithView(s.g, c().id)!.tagXp).toMatchObject({ scene: 0, session: 0 });
    expect(faithView(s.g, c().id)!.grudge!.sessionsLeft).toBe(2);
    act({ type: 'session/next' }); act({ type: 'session/next' }); expect(grudgeOf(s.g, c())).not.toBeNull(); // the rest of session 1, then 3 more
    act({ type: 'session/next' }); expect(c().grudge).toBeUndefined(); expect(said(s.g, /lets the grudge against Saint go/)).toBe(true);
  });
  it('it is not a day, and it is refused in a fight, in the lobby and in the Proving Ground', () => {
    const { s, act } = faithful();
    const day = s.g.day ?? 1; act({ type: 'session/next' }); expect(s.g.day ?? 1).toBe(day);
    act({ type: 'narrator/turn', turn: FIGHT }); expect(() => act({ type: 'session/next' })).toThrow(/A session ends in the story/);
    let g = newGame('LB', { id: 'host', name: 'Host' }); expect(() => apply(g, { type: 'session/next' } as Action, 'host')).toThrow(/hasn't started/);
    g = apply(g, { type: 'sandbox/start', archetype: 'sharpshooter' } as any, 'host');
    expect(() => apply(g, { type: 'session/next' } as Action, 'host')).toThrow(/Proving Ground has no sessions/);
  });
});

describe('the Proving Ground\'s tag caps (item 722)', () => {
  it('no session cap: each fight still gives its 2; the view has no session part', () => {
    let g: any = newGame('PGY', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'sandbox/start', archetype: 'sharpshooter' } as any, 'host');
    const id = Object.keys(g.characters)[0];
    g = apply(g, { type: 'sandbox/faith', charId: id, patron: 'mother_ember', devotion: 3, faith: 7 } as any, 'host');
    const c = g.characters[id], got: any[] = [];
    for (let k = 0; k < 10; k++) withGame(g, () => got.push(tagDevotion(g, null, c, 'heal', { fight: 'PG' + k })));
    expect(got).toEqual(Array(10).fill(1)); expect(c.devotionXp).toBe(55);
    expect(withGame(g, () => tagDevotion(g, null, c, 'supply', { fight: 'PG9' }))).toBe(1);
    expect(withGame(g, () => tagDevotion(g, null, c, 'protect', { fight: 'PG9' }))).toBeNull(); // the fight's 2 still holds
    expect(faithView(g, id)!.tagXp.caps).toEqual({ fight: TAG_CAPS.fight, scene: TAG_CAPS.scene, session: null });
  });
});

describe('a grudge\'s condition in the fight (item 723)', () => {
  it('it lasts its rounds of the bearer\'s own turns, first in initiative or not', () => {
    for (const fast of [true, false]) {
      const { s, c, ally, act } = faithful('nerukhan', 6, 6);
      act({ type: 'faith/pact', charId: c().id, patron: 'mother_ember' }); // Marked, 2 rounds
      (c() as any).attrs.agility = fast ? 10 : 1; (ally() as any).attrs.agility = fast ? 1 : 10; s.g.rng.state = fast ? 12345 : 31337;
      act({ type: 'narrator/turn', turn: FIGHT });
      const cid = s.g.combat!.units.find((x) => x.charId === c().id)!.id, seen: number[] = [];
      expect((s.g.combat!.units.find((x) => x.id === cid) as any).condFresh ?? []).not.toContain('marked');
      for (let k = 0; k < 14 && seen.length < 3; k++) {
        const cb = s.g.combat!; if (cb.over) break; const a = cb.order[cb.turn];
        if (a === cid) seen.push(cb.units.find((x) => x.id === cid)!.conds?.marked ?? 0);
        act({ type: 'combat/end-turn', unitId: a });
      }
      expect(seen).toEqual([2, 1, 0]);
    }
  });
  it('Mother Ember\'s Shaken ends with the fight: not a scene\'s Shaken, not in the next fight', () => {
    const { s, c, act } = faithful('mother_ember', 4, 1);
    s.g.rng.state = rngFor(1); act({ type: 'faith/pact', charId: c().id, patron: 'the_quartermaster' });
    expect(c().grudge).toMatchObject({ patron: 'mother_ember', condition: 'shaken' });
    act({ type: 'narrator/turn', turn: FIGHT });
    expect(s.g.combat!.units.find((x) => x.charId === c().id)!.conds?.shaken).toBe(2);
    winFight(s, act);
    expect(s.g.phase).toBe('story'); expect((c().persistentConds || []).some((p: any) => p.id === 'shaken')).toBe(false);
    s.g.rng.state = rngFor(20); act({ type: 'faith/pact', charId: c().id, patron: 'mother_ember' }); expect(c().grudge).toBeUndefined(); // back to her (the Quartermaster lets go)
    act({ type: 'narrator/turn', turn: FIGHT });
    expect(s.g.combat!.units.find((x) => x.charId === c().id)!.conds?.shaken ?? 0).toBe(0);
  });
  it('a Shaken from something else in the fight is real and carries as usual', () => {
    const { s, c, act } = faithful('mother_ember', 4, 1);
    s.g.rng.state = rngFor(1); act({ type: 'faith/pact', charId: c().id, patron: 'the_quartermaster' });
    act({ type: 'narrator/turn', turn: FIGHT });
    const u = s.g.combat!.units.find((x) => x.charId === c().id)!;
    withGame(s.g, () => { const cb = s.g.combat!; const foe = cb.units.find((x) => x.side === 'foe')!; applyCond(cb, s.g.rng, foe, u, 'shaken', 3, undefined, { skipSave: true }); });
    expect((u as any).faith?.grudgeCond).toBeUndefined();
    winFight(s, act);
    expect((c().persistentConds || []).some((p: any) => p.id === 'shaken')).toBe(true);
  });
});

describe('the words: one Devotion XP format, the rites in XP', () => {
  it('devotionWords: the level, then the XP into it out of its step; full at the top', () => {
    expect(devotionWords(49)).toBe('Devotion 3 · 4/25 XP'); expect(devotionWords(35)).toBe('Devotion 2 · 10/20 XP');
    expect(devotionWords(450)).toBe('Devotion 10 · 450 XP · full'); expect(devotionWords(-5)).toBe('Devotion 0 · 0/10 XP');
  });
  it('a rite kept logs the meter\'s words; every engine rite\'s text says its XP', () => {
    const { s, c, act } = faithful('nerukhan', 3, 5);
    const r = FAITH_PATRONS.find((p) => p.id === 'nerukhan')!.rites.find((x: any) => x.engine); // Confession: any time out of a fight
    act({ type: 'faith/rite', charId: c().id, id: r.id });
    expect(devotionXpOf(c())).toBe(49); expect(said(s.g, /\+4 Devotion XP \(rite: .*\), Devotion 3 · 4\/25 XP\./)).toBe(true);
    for (const p of FAITH_PATRONS) for (const x of p.rites || []) if (x.engine) { expect(x.text).toContain('+' + DEVOTION_XP.rite + ' Devotion XP'); expect(x.text).not.toMatch(/[+−-]\d+ Devotion(?! XP)/); }
  });
});
