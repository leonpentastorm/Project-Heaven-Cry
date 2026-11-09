// Faith 2.1 (rules 1.6.1; design docs/design/faith-2.1-spec.md; spec section 14 items 701-730): Devotion XP and its
// curve, every source, the caps on tags (fight, scene, session; on the character, so the area map can't farm them),
// the Narrator's XP and its session cap, the Miracle's reset, Judgement, conversion pieces, the day counter and the
// 90-day cooldown after apostasy, the direct switch (no cooldown) with the patron's leave roll or grudge, the grudge's
// fight-start condition and XP multiplier, old saves, Stolen Fire, the Proving Ground's stepper, and determinism.
import { describe, expect, it } from 'vitest';
import {
  apply, faithView, beliefOf, applyDamage, condOn, newGame, d20, positionsOf, standable, zoneMap, npcsOf, storyObjects,
  DEVOTION_CURVE, devotionThreshold, devotionLevelOf, devotionXpOf, setDevotionXp, DEVOTION_XP, TAG_CAPS, NARRATOR_XP,
  PACT_COOLDOWN_DAYS, FAITH_PATRON, FAITH_PATRONS, FAITH_FX, FAITH_REV, shiftDevotion, tagDevotion, dayOf, grudgeOf,
  type Combat, type GameState, type Character, type Action,
} from '../src';
import { fightWith, storyWith, withGame, sheetOf } from './helpers/perkfight';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const said = (g: GameState, re: RegExp) => g.story.entries.some((e) => re.test(String(e.head || '') + ' ' + String(e.text || '')));
const storyFx = (g: GameState, k: string) => (((g.story as any).fx || []) as any[]).filter((e) => e.k === k);
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
function freeNear(g: GameState, near: string): string {
  const [x, y] = near.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const k = (x + i) + ',' + (y + j); if ((i || j) && standable(map, k) && !taken.has(k)) return k; }
  throw new Error('no free tile');
}
/** A story room: a Faithful character (patron, level, Faith) and an ally; the host is the Narrator. */
function faithful(patron = 'mother_ember', level = 3, faith = 5) {
  const s = storyWith([{ name: 'Saint', skills: { faith } }, { name: 'Friend' }]);
  const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron }; c.patron = patron; setDevotionXp(c, devotionThreshold(level));
  return { s, c: (): Character => s.g.characters[c.id], ally: (): Character => s.g.characters[s.chars[1].id], act: (a: any, by = 'host') => s.act(a as Action, by) };
}
/** End the session and start the next (the web goes back to the lobby between sessions). */
function nextSession(s: { g: GameState; act: (a: Action, by?: string) => GameState }) {
  s.g.phase = 'lobby'; s.act({ type: 'session/start' } as Action);
  s.act({ type: 'narrator/turn', turn: { narration: 'Later.', sceneTitle: 'Another day ' + s.g.sessionN } } as any);
}

// ---------------------------------------------------------------------------------------------------------------------
describe('the curve (item 701)', () => {
  it('the thresholds, the level each total reaches, and the data', () => {
    expect(DEVOTION_CURVE).toEqual([0, 10, 25, 45, 70, 102, 147, 200, 270, 350, 450]);
    expect([0, 9, 10, 44, 45, 101, 102, 199, 200, 449, 450, 999].map(devotionLevelOf)).toEqual([0, 0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 10]);
    for (let lv = 0; lv <= 10; lv++) expect(devotionLevelOf(devotionThreshold(lv))).toBe(lv);
    expect(devotionThreshold(12)).toBe(450); expect(devotionThreshold(-1)).toBe(0);
  });
  it('a Faithful sheet starts at Devotion 3 = 45 XP; the level is kept in step; a level written on its own reads as its threshold', () => {
    let g = newGame('XP1', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'char/add', sheet: { ...sheetOf({ name: 'Nun' }), belief: { kind: 'faithful', patron: 'mother_ember' } } as any } as any, 'host');
    const c = Object.values(g.characters)[0]; expect(c.devotionXp).toBe(45); expect(c.devotion).toBe(3); expect(c.faithRev).toBe(FAITH_REV);
    const x = { devotion: 3, devotionXp: 60 } as Character; expect(devotionXpOf(x)).toBe(60);
    x.devotion = 7; expect(devotionXpOf(x)).toBe(200); // an old writer set the level: its threshold
    expect(setDevotionXp(x, 5000)).toBe(10); expect(x.devotionXp).toBe(450); expect(setDevotionXp(x, -4)).toBe(0); expect(x.devotionXp).toBe(0);
  });
});

describe('gains and losses move XP, crossing levels both ways (items 701-702)', () => {
  it('a gain crosses up, a loss drops a level, never below 0 or above the top; the fx and the log', () => {
    const { s, c } = faithful('mother_ember', 4);
    withGame(s.g, () => shiftDevotion(s.g, null, c(), 31, 'a test'));
    expect(c().devotionXp).toBe(101); expect(c().devotion).toBe(4);
    withGame(s.g, () => shiftDevotion(s.g, null, c(), 1, 'a test'));
    expect(c().devotion).toBe(5); expect(storyFx(s.g, FAITH_FX.devotion).pop()).toMatchObject({ delta: 1, xp: 102, now: 5, was: 4, level: 5 });
    expect(said(s.g, /\+1 Devotion XP \(a test\): DEVOTION 5 · 102\/147 XP/)).toBe(true);
    withGame(s.g, () => shiftDevotion(s.g, null, c(), -3, 'a taboo'));
    expect(c().devotion).toBe(4); expect(c().devotionXp).toBe(99);
    withGame(s.g, () => shiftDevotion(s.g, null, c(), -500, 'everything'));
    expect(c().devotionXp).toBe(0); expect(c().devotion).toBe(0);
    withGame(s.g, () => shiftDevotion(s.g, null, c(), 1000, 'everything'));
    expect(c().devotionXp).toBe(450); expect(c().devotion).toBe(10);
    expect(withGame(s.g, () => shiftDevotion(s.g, null, c(), 1, 'more'))).toBe(0); // the top: nothing to add, nothing logged
  });
  it('the sources in the data: liked +1, vow kept +3, rite +4, convert +4, deed 2-5, taboo −3 (−6 Witnessed), vow broken −5, overreach −3, breaking character −6, Judgement −10', () => {
    expect(DEVOTION_XP).toMatchObject({ liked: 1, vowKept: 3, rite: 4, convert: 4, deedMin: 2, deedMax: 5, taboo: 3, tabooWitnessed: 6, vowBroken: 5, overreachMiss: 3, breakCharacter: 6, judgement: 10, piece: 1 });
    expect(TAG_CAPS).toEqual({ fight: 2, scene: 2, session: 6 }); expect(NARRATOR_XP).toEqual({ min: -6, max: 5, sessionCap: 10 }); expect(PACT_COOLDOWN_DAYS).toBe(90);
  });
  it('an Atheist has no Devotion XP to move', () => {
    const { s, c } = faithful(); c().belief = { kind: 'atheist' }; c().patron = null;
    expect(withGame(s.g, () => shiftDevotion(s.g, null, c(), 5, 'x'))).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the caps on tags (items 703-704)', () => {
  it('a fight: each liked tag once, at most 2 XP; taboos aren\'t capped', () => {
    const { s, c } = faithful('mother_ember');
    const t = (tag: string, fight = 'F1', act?: string) => withGame(s.g, () => tagDevotion(s.g, null, c(), tag, { fight, act }));
    expect(t('heal')).toBe(1); expect(t('heal')).toBeNull(); expect(t('protect')).toBe(1); expect(t('supply')).toBeNull();
    expect(c().devotionXp).toBe(47);
    expect(t('betray')).toBe(-3); expect(t('betray')).toBe(-3); expect(c().devotionXp).toBe(41); // taboos: every action
    expect(t('heal', 'F2')).toBe(1); // a new fight: a new fight cap
  });
  it('a scene out of fights: each liked tag once, at most 2; a new scene starts again; the session stops at 6 in all', () => {
    const { s, c, act } = faithful('mother_ember');
    const t = (tag: string, fight: string | null = null) => withGame(s.g, () => tagDevotion(s.g, null, c(), tag, { fight }));
    expect([t('heal'), t('heal'), t('supply'), t('protect')]).toEqual([1, null, 1, null]);
    act({ type: 'narrator/turn', turn: { narration: 'On.', sceneTitle: 'Scene two' } });
    expect([t('heal'), t('protect')]).toEqual([1, 1]);
    expect([t('heal', 'FX'), t('supply', 'FX')]).toEqual([1, 1]); // a fight's own cap; the session's 6 now reached
    act({ type: 'narrator/turn', turn: { narration: 'On.', sceneTitle: 'Scene three' } });
    expect(t('heal')).toBeNull(); expect(t('protect', 'FY')).toBeNull();
    expect(c().devotionXp).toBe(45 + 6);
    expect(faithView(s.g, c().id)!.tagXp).toEqual({ fight: 0, scene: 0, session: 6, caps: { fight: 2, scene: 2, session: 6 } });
    nextSession(s); expect(t('heal')).toBe(1); // a new session
  });
  it('vows, rites and the Narrator don\'t count toward the tag caps', () => {
    const { s, c, act } = faithful('nerukhan');
    for (const tag of ['judge', 'mercy']) withGame(s.g, () => tagDevotion(s.g, null, c(), tag, {}));
    act({ type: 'faith/rite', charId: c().id, id: 'confession' });
    act({ type: 'faith/devotion', charId: c().id, delta: 5, reason: 'a deed' });
    expect(c().devotionXp).toBe(45 + 2 + 4 + 5);
    expect(faithView(s.g, c().id)!.tagXp.scene).toBe(2);
  });
  it('the playtest farm: 20 area-map stims on an ally (heal + supply each) give no more than the scene cap, then the session cap', () => {
    const { s, c, ally, act } = faithful('mother_ember');
    s.g.story.positions![ally().id] = freeNear(s.g, positionsOf(s.g)[c().id]);
    const stim = () => { c().stims = 99; ally().hp = 20; s.g.story.ap = {}; act({ type: 'world/act', charId: c().id, act: 'stim', targetId: ally().id }); };
    for (let i = 0; i < 20; i++) stim();
    expect(ally().hp).toBeGreaterThan(20);
    expect(c().devotionXp).toBe(45 + TAG_CAPS.scene);
    for (let n = 2; n <= 6; n++) { act({ type: 'narrator/turn', turn: { narration: 'On.', sceneTitle: 'Scene ' + n } }); for (let i = 0; i < 20; i++) stim(); }
    expect(c().devotionXp).toBe(45 + TAG_CAPS.session); expect(c().devotion).toBe(3);
  });
  it('a real fight: the cap holds across turns and rounds (the unit persists, the tally is on the character)', () => {
    const f = fightWith([{ name: 'Priest', skills: { faith: 5 } }, { name: 'Ally' }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'mother_ember' }; c.patron = 'mother_ember'; setDevotionXp(c, 45);
    const [pr, al] = f.pcs; pr.pos = '2,5'; al.pos = '2,6';
    for (let i = 0; i < 6; i++) { f.cb.round = 1 + i; f.turn(pr); f.unit(al.id).hp = 50; f.act({ type: 'faith/pray', unitId: pr.id, kind: 'whisper', id: i % 2 ? 'protection' : 'health', targetId: al.id } as any); }
    expect(f.g.characters[c.id].devotionXp).toBe(47); expect(faithView(f.g, c.id)!.likedThisFight).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the Narrator\'s Devotion XP (item 705)', () => {
  it('gains capped at +10 a session per character (cut to what is left, then refused); losses uncapped; a new session resets it', () => {
    const { s, c, act } = faithful('nerukhan');
    act({ type: 'faith/devotion', charId: c().id, delta: 4, reason: 'brought a believer in' });
    act({ type: 'faith/devotion', charId: c().id, delta: 5, reason: 'a deed' });
    act({ type: 'faith/devotion', charId: c().id, delta: 5, reason: 'another deed' }); // only 1 left
    expect(c().devotionXp).toBe(45 + 10);
    expect(() => act({ type: 'faith/devotion', charId: c().id, delta: 1, reason: 'more' })).toThrow(/10 Devotion XP this session/);
    act({ type: 'faith/devotion', charId: c().id, delta: -6, reason: 'broke character before the altar' });
    act({ type: 'faith/devotion', charId: c().id, delta: -6, reason: 'again' }); expect(c().devotionXp).toBe(43);
    expect(faithView(s.g, c().id)!.narratorXp).toEqual({ session: 10, cap: 10 });
    nextSession(s); act({ type: 'faith/devotion', charId: c().id, delta: 5, reason: 'a deed' }); expect(c().devotionXp).toBe(48);
  });
  it('the turn clamps to −6..+5 and shares the cap; the legacy patrons[] path too; refusals are logged out of character', () => {
    const { s, c, act } = faithful('nerukhan');
    act({ type: 'narrator/turn', turn: { narration: 'Yes.', faith: [{ charId: c().id, op: 'devotion', delta: 40, reason: 'a deed' }, { charId: c().id, op: 'devotion', delta: 3, reason: 'more' }] } });
    expect(c().devotionXp).toBe(45 + 8);
    act({ type: 'narrator/turn', turn: { narration: 'Yes.', patrons: [{ charId: c().id, devotion: 9, reason: 'a deed' }] } });
    expect(c().devotionXp).toBe(45 + 10);
    act({ type: 'narrator/turn', turn: { narration: 'No.', patrons: [{ charId: c().id, devotion: -20, reason: 'a lie' }, { charId: c().id, devotion: 2, reason: 'x' }] } });
    expect(c().devotionXp).toBe(45 + 10 - 6); expect(said(s.g, /Faith \(Saint\):.*10 Devotion XP this session/)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the Miracle, Judgement and conversion (items 706-708)', () => {
  it('a story Miracle spends it all: XP 0, Devotion 0', () => {
    const { s, c, ally, act } = faithful('mother_ember', 8, 7); ally().hp = 10;
    act({ type: 'faith/pray', charId: c().id, kind: 'miracle', id: 'everyone_home' });
    expect(c().devotionXp).toBe(0); expect(c().devotion).toBe(0); expect(ally().hp).toBeGreaterThan(10);
  });
  it('Judgement spends 10 Devotion XP through the choke point; it needs 10', () => {
    const f = fightWith([{ name: 'Templar' }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!]; c.patron = 'nerukhan'; setDevotionXp(c, 72);
    withGame(f.g, () => shiftDevotion(f.g, f.cb, c, -DEVOTION_XP.judgement, 'Judgement'));
    expect(c.devotionXp).toBe(62); expect(c.devotion).toBe(3); expect(logHas(f.cb, /−10 Devotion XP \(Judgement\)/)).toBe(true);
  });
  it('conversion: each piece of the new patron is +1 level, the XP at its threshold (pieces 3: Devotion 6 = 147)', () => {
    const { s, c, act } = faithful(); c().belief = { kind: 'atheist' }; c().patron = null; c().faithPieces = { the_matchmaker: 3 };
    act({ type: 'faith/pact', charId: c().id, patron: 'the_matchmaker' });
    expect(c().devotion).toBe(6); expect(c().devotionXp).toBe(147);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the day counter and the 90-day cooldown after apostasy (items 709-710)', () => {
  it('day 1 to start (old saves too); a long rest is a day; the Narrator\'s days field adds 1-3650', () => {
    const { s, act } = faithful(); delete (s.g as any).day; expect(dayOf(s.g)).toBe(1);
    act({ type: 'narrator/turn', turn: { narration: 'Rest.', rest: { kind: 'short' } } }); expect(dayOf(s.g)).toBe(1);
    act({ type: 'narrator/turn', turn: { narration: 'Sleep.', rest: { kind: 'long' } } }); expect(dayOf(s.g)).toBe(2);
    act({ type: 'narrator/turn', turn: { narration: 'The road.', days: 12 } }); expect(dayOf(s.g)).toBe(14); expect(said(s.g, /12 days pass: Day 14/)).toBe(true);
    act({ type: 'narrator/turn', turn: { narration: 'Nothing.', days: 0 } }); act({ type: 'narrator/turn', turn: { narration: 'Nothing.', days: -5 } as any }); expect(dayOf(s.g)).toBe(14);
    act({ type: 'narrator/turn', turn: { narration: 'Ages.', days: 99999 } }); expect(dayOf(s.g)).toBe(14 + 3650);
    expect(faithView(s.g, s.chars[0].id)!.day).toBe(14 + 3650);
  });
  it('after apostasy no pact is answered until day leftOn + 90 (rests and days count); the legacy path is refused too', () => {
    const { s, c, act } = faithful('the_quartermaster', 4);
    act({ type: 'narrator/turn', turn: { narration: 'Go.', days: 9 } }); // day 10
    act({ type: 'faith/apostasy', charId: c().id });
    expect(c().faithLeft).toEqual({ patron: 'the_quartermaster', day: 10 });
    expect(() => act({ type: 'faith/pact', charId: c().id, patron: 'mother_ember' })).toThrow(/Nobody answers yet: 90 days/);
    expect(faithView(s.g, c().id)!.pactCooldown).toMatchObject({ daysLeft: 90, until: 100, patron: 'the_quartermaster' });
    act({ type: 'narrator/turn', turn: { narration: 'Sleep.', rest: { kind: 'long' } } });
    expect(() => act({ type: 'faith/pact', charId: c().id, patron: 'the_quartermaster' })).toThrow(/Nobody answers yet: 89 days/);
    act({ type: 'narrator/turn', turn: { narration: 'Months.', days: 88, patrons: [{ charId: c().id, patron: 'mother_ember' }] } });
    expect(beliefOf(c()).kind).toBe('atheist'); expect(said(s.g, /Faith \(Saint\): Nobody answers yet: 89 days/)).toBe(true); // a turn's days pass after its faith ops
    act({ type: 'narrator/turn', turn: { narration: 'A day.', days: 1 } }); // day 100
    act({ type: 'faith/pact', charId: c().id, patron: 'mother_ember' });
    expect(c().patron).toBe('mother_ember'); expect(c().faithLeft ?? null).toBeNull(); expect(c().devotion).toBe(3);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('leaving one patron for another (items 711-714)', () => {
  it('Open, let go: d20 + Faith vs the patron\'s TN; the farewell; no grudge, no cooldown', () => {
    const { s, c, act } = faithful('mother_ember', 5, 5); // Faith 5: +4; Mother Ember TN 10
    s.g.rng.state = rngFor(20);
    act({ type: 'faith/pact', charId: c().id, patron: 'counting_weaver' });
    expect(c().patron).toBe('counting_weaver'); expect(c().grudge ?? null).toBeNull(); expect(c().faithLeft ?? null).toBeNull();
    expect(said(s.g, /LEAVING · MOTHER EMBER · d20 20 \+4 = 24 vs 10 · LET GO/)).toBe(true);
    expect(storyFx(s.g, FAITH_FX.leave).pop()).toMatchObject({ patron: 'mother_ember', to: 'counting_weaver', letGo: true, roll: { die: 20, mod: 4, total: 24, tn: 10 } });
    const lines = storyFx(s.g, FAITH_FX.patron_line);
    expect(lines.some((e) => e.event === 'farewell' && e.patron === 'mother_ember' && FAITH_PATRON.mother_ember.lines.farewell.includes(e.text))).toBe(true);
    expect(lines.some((e) => e.event === 'conversion' && e.patron === 'counting_weaver')).toBe(true);
    expect(c().faithPieces).toEqual({ mother_ember: 2 }); // an Open new patron: the old Hymns stay as pieces
  });
  it('Open, a miss (a natural 1): a light grudge (1 session); a Jealous new patron wipes the old pieces', () => {
    const { s, c, act } = faithful('the_laughing_mask', 5, 9);
    s.g.rng.state = rngFor(1);
    act({ type: 'faith/pact', charId: c().id, patron: 'old_overcast' });
    expect(c().patron).toBe('old_overcast'); expect(c().faithPieces).toEqual({});
    expect(c().grudge).toMatchObject({ patron: 'the_laughing_mask', until: s.g.sessionN! + 1, condition: 'prone', rounds: 1, xp_mult: 0.5 });
    expect(said(s.g, /GRUDGE · THE LAUGHING MASK/)).toBe(true);
    expect(faithView(s.g, c().id)!.grudge).toMatchObject({ patronName: 'The Laughing Mask', conditionName: 'Prone', xpMult: 0.5, sessionsLeft: 1 });
  });
  it('Jealous patrons never let go: always the harder grudge (2-3 sessions), no roll', () => {
    for (const p of FAITH_PATRONS.filter((x) => x.rule === 'jealous')) {
      const { s, c, act } = faithful(p.id, 4, 9); s.g.rng.state = rngFor(20);
      act({ type: 'faith/pact', charId: c().id, patron: 'mother_ember' });
      expect(c().grudge).toMatchObject({ patron: p.id, until: s.g.sessionN! + p.leave.grudge.sessions });
      expect(p.leave.grudge.sessions).toBeGreaterThanOrEqual(2); expect(said(s.g, new RegExp('LEAVING · ' + p.name.toUpperCase() + ' · A GRUDGE'))).toBe(true);
    }
  });
  it('the grudge: its condition at each fight\'s start (no save), the new patron\'s XP ×0.5 with the fraction carried, over after its sessions', () => {
    const { s, c, act } = faithful('nerukhan', 6, 6);
    act({ type: 'faith/pact', charId: c().id, patron: 'mother_ember' }); // Nerukhan: Marked 2 rounds, 3 sessions
    act({ type: 'faith/devotion', charId: c().id, delta: 5, reason: 'a deed' }); expect(c().devotionXp).toBe(45 + 2);
    act({ type: 'faith/devotion', charId: c().id, delta: 5, reason: 'another' }); expect(c().devotionXp).toBe(45 + 5); // 2.5 + 2.5
    expect(said(s.g, /×0.5: Holy Father Nerukhan's grudge/)).toBe(true);
    act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Ambush', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'soldier', weapon: 'service_pistol', at: '' }] } } });
    const u = s.g.combat!.units.find((x) => x.charId === c().id)!;
    expect(condOn(u, 'marked')).toBe(true); expect(logHas(s.g.combat!, /Grudge \(Holy Father Nerukhan\): Saint starts the fight Marked/)).toBe(true);
    expect((s.g.combat!.fx || []).some((e: any) => e.k === FAITH_FX.grudge && e.unit === u.id)).toBe(true);
    expect(s.g.combat!.units.filter((x) => x.charId === s.chars[1].id).every((x) => !condOn(x, 'marked'))).toBe(true);
    s.g.combat = null; s.g.phase = 'story';
    const until = c().grudge.until;
    while ((s.g.sessionN || 1) < until) nextSession(s);
    expect(grudgeOf(s.g, c())).not.toBeNull();
    nextSession(s); expect(c().grudge).toBeUndefined(); expect(said(s.g, /lets the grudge against Saint go/)).toBe(true);
  });
  it('returning to the patron that holds the grudge ends it', () => {
    const { s, c, act } = faithful('toll_keeper', 4);
    act({ type: 'faith/pact', charId: c().id, patron: 'mother_ember' }); expect(grudgeOf(s.g, c())).not.toBeNull();
    s.g.rng.state = rngFor(20); act({ type: 'faith/pact', charId: c().id, patron: 'toll_keeper' });
    expect(c().grudge).toBeUndefined(); expect(said(s.g, /The Toll-Keeper takes Saint back/)).toBe(true);
  });
  it('the leave data: Open patrons roll (TN 10-12) with a light grudge, Jealous ones never; every grudge condition is one the engine runs', () => {
    for (const p of FAITH_PATRONS) {
      expect(p.leave.lets_go).toBe(p.rule === 'open' ? 'roll' : 'never');
      if (p.rule === 'open') { expect(p.leave.tn).toBeGreaterThanOrEqual(10); expect(p.leave.tn).toBeLessThanOrEqual(12); expect(p.leave.grudge.sessions).toBe(1); }
      expect(['marked', 'nausea', 'prone', 'slowed', 'shaken', 'dazed', 'weakened', 'pinned']).toContain(p.leave.grudge.condition);
    }
  });
  it('the same seed and actions: the same roll, lines and grudge', () => {
    const run = () => { const { s, c, act } = faithful('the_quartermaster', 5, 4); act({ type: 'faith/pact', charId: c().id, patron: 'nerukhan' }); return JSON.stringify([s.g.story.entries.slice(-5).map((e) => e.head + e.text), c().grudge ?? null, s.g.rng.state]); };
    expect(run()).toBe(run());
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('old saves, Stolen Fire and the Proving Ground (items 715, 718; the stepper)', () => {
  it('an old save (Devotion as a level, faith rules 16): Devotion XP at that level\'s threshold, stamped 17', () => {
    const { s, c, act } = faithful('old_overcast'); delete c().devotionXp; c().devotion = 6; c().faithRev = 16;
    act({ type: 'player/online', id: 'host', online: true });
    expect(c().devotionXp).toBe(147); expect(c().devotion).toBe(6); expect(c().faithRev).toBe(17);
    const a = faithful(); const d = a.c(); d.belief = { kind: 'atheist' }; d.patron = null; d.devotion = 0; delete d.devotionXp; d.faithRev = 16;
    a.act({ type: 'player/online', id: 'host', online: true }); expect(a.c().faithRev).toBe(17); expect(a.c().devotionXp).toBeUndefined();
  });
  it('Heretic\'s Stolen Fire puts back the XP, the tally, the cooldown and the grudge', () => {
    const f = fightWith([{ traits: ['heretic'], skills: { will_power: 7, faith: 0 } }], [{ at: 'F6' }]);
    const me = f.turn(f.pc), foe = f.foe; foe.pos = '6,5'; me.pos = '2,5';
    const c = f.g.characters[me.charId!]; c.faithLeft = { patron: 'nerukhan', day: 3 }; c.grudge = { patron: 'nerukhan', until: 4, condition: 'marked', rounds: 2, xp_mult: 0.5, text: 'x' }; c.faithTally = { session: 1, scene: 1, sessionXp: 2, sceneXp: 2, sceneTags: ['heal'], narrXp: 0, fight: null, act: null };
    f.g.rng.state = rngFor(20, 1);
    f.act({ type: 'combat/perk', unitId: me.id, id: 'heretic', actionId: 'stolen_fire', choice: 'old_overcast:thunderclap', tile: '5,5' } as any);
    const x = f.g.characters[me.charId!];
    expect(x.faithLeft).toEqual({ patron: 'nerukhan', day: 3 }); expect(x.grudge.until).toBe(4); expect(x.faithTally.sessionXp).toBe(2); expect(x.devotionXp).toBeUndefined();
  });
  it('the Proving Ground stepper sets the level: the XP at its threshold; reset clears the tag tally', () => {
    let g = newGame('PGX', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'sandbox/start', archetype: 'sharpshooter' } as any, 'host');
    const id = Object.keys(g.characters)[0];
    g = apply(g, { type: 'sandbox/faith', charId: id, patron: 'old_overcast', devotion: 7, faith: 7 } as any, 'host');
    expect(g.characters[id].devotionXp).toBe(200); expect(g.characters[id].devotion).toBe(7);
    g.characters[id].faithTally = { session: 1, scene: 0, sessionXp: 6 } as any;
    g = apply(g, { type: 'sandbox/faith', charId: id, reset: true } as any, 'host'); expect(g.characters[id].faithTally).toBeUndefined();
    g = apply(g, { type: 'sandbox/faith', charId: id, belief: 'atheist' } as any, 'host'); expect(g.characters[id].devotionXp).toBe(0);
  });
});

// keep the imports honest (the taboo with Witnessed through the real damage path)
describe('a taboo while Witnessed through the damage chokepoint costs 6 XP', () => {
  it('betray while Witnessed: −6', () => {
    const f = fightWith([{ name: 'Priest', skills: { faith: 7 } }, { name: 'Ally' }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; setDevotionXp(c, 120);
    const [pr, al] = f.pcs; f.turn(pr); f.unit(pr.id).conds = { witnessed: 2 } as any;
    withGame(f.g, () => applyDamage(f.cb, f.unit(al.id), 5, { by: f.unit(pr.id), type: 'physical' } as any));
    expect(f.g.characters[c.id].devotionXp).toBe(114);
  });
});
