// Blessing 2.0 view models (game/faithView.ts): the Faith panel, the prayer buttons (AP, gate, odds, why disabled), the
// pickers, the payload, the Belief step's patron cards; read from a real game through the engine's faithView.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, apply, newGame, faithView, FAITH_PATRONS, type Sheet } from '@engine';
import { oddsOf, oddsText, prayerButtons, prayAction, pickerFor, faithPanel, patronCards, BELIEF_TEXT, devotionLabel, cooldownText, grudgeText, tagCapsText } from './faithView';

const sheet = (name: string, belief: any): Sheet => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {}, belief } as any; };
function game(belief: any, faith = 5) {
  let g = newGame('FV1', { id: 'h', name: 'Host' }, 'fv');
  g = apply(g, { type: 'char/add', sheet: sheet('Wren', belief) }, 'h');
  const c = Object.values(g.characters)[0]; c.skills = { ...c.skills, faith }; // the test's Faith (creation budgets aside)
  return { g, c };
}
describe('faith views', () => {
  it('odds: a d20 plus a modifier against a TN; a 1 always misses, a 20 always hits', () => {
    expect(oddsOf(12, 2)).toBe(55); expect(oddsOf(30, 0)).toBe(5); expect(oddsOf(2, 9)).toBe(95);
    expect(oddsText({ mode: 'standing' } as any)).toBe('SURE');
    expect(oddsText({ mode: 'dice', roll: { tn: 14, mod: 2 } } as any)).toBe('TN 14 · 45%');
    expect(oddsText({ mode: 'overreach', roll: { tn: 16, mod: 2 } } as any)).toBe('OVERREACH · TN 16 · 35%');
  });
  it('a Faithful of Mother Ember: her panel, the meter with the gates, three Hymns and the Miracle as buttons with reasons', () => {
    const { g, c } = game({ kind: 'faithful', patron: 'mother_ember' });
    const v = faithView(g, c.id)!, p = faithPanel(v)!;
    expect(p.faithful).toBe(true); expect(p.title).toBe(FAITH_PATRONS.find((x: any) => x.id === 'mother_ember').name);
    expect(p.meter.length).toBe(11); expect(p.meter.filter((m) => m.on).length).toBe(v.devotion);
    expect(p.meter.filter((m) => m.gate).map((m) => m.n + ' ' + m.gate)).toEqual(['3 HYMN I', '5 HYMN II', '7 HYMN III · MIRACLE']);
    expect(p.likes.length).toBe(3); expect(p.taboos.length).toBe(2); expect(p.rule).toMatch(/^OPEN/);
    // Rules 1.6.1: the level and the XP toward the next; a new character starts at the level-3 threshold.
    expect(p.devotionText).toBe('DEVOTION 3 · 0/25 XP'); expect(p.xpFill).toBe(0); expect(p.xpNextText).toBe('TO DEVOTION 4'); expect(p.dayText).toBe('DAY 1'); expect(p.cooldown).toBeNull(); expect(p.grudge).toBeNull();
    const b = prayerButtons(v);
    expect(b.whispers.map((x) => x.id)).toEqual(['luck', 'health', 'protection', 'courage', 'guidance', 'safe_passage']);
    expect(b.whispers[0]).toMatchObject({ ap: '1 AP', gate: 'ANYONE' });
    expect(b.hymns.map((x) => x.gate)).toEqual(['HYMN I · DEVOTION 3', 'HYMN II · DEVOTION 5', 'HYMN III · DEVOTION 7']);
    expect(b.hymns[1].odds).toMatch(/^OVERREACH · TN \d+/); expect(b.hymns[1].warn).toMatch(/a miss costs 3 Devotion XP/);
    expect(b.miracle!.ok).toBe(false); expect(b.miracle!.why).toMatch(/Faith 7|Devotion 7/);
    for (const x of [...b.whispers, ...b.hymns, b.miracle!]) { expect(x.icon).toMatch(/^data:image\/svg|^\/assets\//); if (!x.ok) expect(x.why).toBeTruthy(); }
  });
  it('the meter\'s words: "DEVOTION 4 · 12/32 XP"; at the top, FULL; no XP for an Atheist', () => {
    expect(devotionLabel({ total: 82, level: 4, into: 12, step: 32, next: 102 })).toBe('DEVOTION 4 · 12/32 XP');
    expect(devotionLabel({ total: 450, level: 10, into: 0, step: null, next: null })).toBe('DEVOTION 10 · 450 XP · FULL');
    expect(devotionLabel(null, 0)).toBe('DEVOTION 0');
    const { g, c } = game({ kind: 'faithful', patron: 'old_overcast' });
    g.characters[c.id].devotionXp = 82; g.characters[c.id].devotion = 4;
    const p = faithPanel(faithView(g, c.id))!;
    expect(p.devotionText).toBe('DEVOTION 4 · 12/32 XP'); expect(p.xpFill).toBeCloseTo(12 / 32); expect(p.meter.filter((m) => m.on).length).toBe(4);
  });
  it('the liked-tag caps in words: the fight or the scene, the session (none in the Proving Ground), CAPPED once one is reached', () => {
    const caps = { fight: 2, scene: 2, session: 6 };
    expect(tagCapsText({ fight: 1, scene: 0, session: 4, caps, where: 'fight' })).toEqual({ text: 'LIKED TAGS · 1/2 THIS FIGHT · 4/6 THIS SESSION', capped: false });
    expect(tagCapsText({ fight: 0, scene: 2, session: 2, caps, where: 'scene' })).toEqual({ text: 'LIKED TAGS · 2/2 THIS SCENE · 2/6 THIS SESSION · CAPPED', capped: true });
    expect(tagCapsText({ fight: 1, scene: 0, session: 6, caps, where: 'fight' }).capped).toBe(true);
    expect(tagCapsText({ fight: 1, scene: 0, session: 9, caps: { ...caps, session: null }, where: 'fight' })).toEqual({ text: 'LIKED TAGS · 1/2 THIS FIGHT', capped: false });
    const { g, c } = game({ kind: 'faithful', patron: 'mother_ember' });
    expect(faithPanel(faithView(g, c.id))!.tagCaps!.text).toBe('LIKED TAGS · 0/2 THIS SCENE · 0/6 THIS SESSION');
    const at = game({ kind: 'atheist' }); expect(faithPanel(faithView(at.g, at.c.id))!.tagCaps).toBeNull(); // no patron, no caps to show
  });
  it('leaving: the pact cooldown on the day counter ("Nobody answers yet: N days"), then a grudge on a switch (who, what, how long)', () => {
    let { g, c } = game({ kind: 'faithful', patron: 'mother_ember' });
    g = apply(g, { type: 'session/start' }, 'h');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'She walks away.', faith: [{ charId: c.id, op: 'apostasy' }] } } as any, 'h');
    let p = faithPanel(faithView(g, c.id))!;
    expect(p.faithful).toBe(false); expect(p.cooldown).toBe('Nobody answers yet: 90 days'); expect(cooldownText(1)).toBe('Nobody answers yet: 1 day');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Three months on the road.', days: 89 } } as any, 'h');
    p = faithPanel(faithView(g, c.id))!; expect(p.dayText).toBe('DAY 90'); expect(p.cooldown).toBe('Nobody answers yet: 1 day');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'A day more.', days: 1 } } as any, 'h');
    expect(faithPanel(faithView(g, c.id))!.cooldown).toBeNull();
    // Nerukhan is Jealous: leaving him for another always leaves his grudge.
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'She kneels.', faith: [{ charId: c.id, op: 'pact', patron: 'nerukhan' }] } } as any, 'h');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'She turns to the storm.', faith: [{ charId: c.id, op: 'pact', patron: 'old_overcast' }] } } as any, 'h');
    const gr = faithPanel(faithView(g, c.id))!.grudge!;
    expect(gr.head).toBe('GRUDGE · ' + FAITH_PATRONS.find((x: any) => x.id === 'nerukhan').name.toUpperCase());
    expect(gr.what).toMatch(/^Marked for 2 rounds at the start of every fight; your Devotion XP gains are cut by 50%\.$/);
    expect(gr.left).toBe('Ends after 3 more sessions.'); expect(gr.text).toMatch(/Nerukhan/);
    expect(grudgeText({ patron: 'x', patronName: 'X', condition: 'prone', conditionName: 'Prone', rounds: 0, xpMult: 0.5, sessionsLeft: 0, text: '' }).left).toBe('Ends with this session.');
  });
  it('an Atheist: ATHEIST · PILGRIM, Whispers by dice, no Miracle, no meter', () => {
    const { g, c } = game({ kind: 'atheist' });
    const v = faithView(g, c.id)!, p = faithPanel(v)!, b = prayerButtons(v);
    expect(p.title).toBe('ATHEIST · PILGRIM'); expect(p.meter.some((m) => m.on)).toBe(false);
    expect(b.whispers[0].gate).toBe('BY DICE · TN 12'); expect(b.whispers[0].odds).toMatch(/^TN 12 · \d+%$/);
    expect(b.hymns).toEqual([]); expect(b.miracle).toBeNull();
  });
  it('Faith under 3: praying is closed, in words', () => {
    const { g, c } = game({ kind: 'faithful', patron: 'nerukhan' }, 1);
    const v = faithView(g, c.id)!;
    expect(faithPanel(v)!.closed).toMatch(/Faith 3/); expect(prayerButtons(v).whispers[0].why).toMatch(/Faith 3/);
  });
  it('pickers and the payload follow the contract', () => {
    expect(pickerFor('self_or_ally')).toEqual({ kind: 'unit', side: 'ally', self: true }); expect(pickerFor('tile').kind).toBe('tile');
    expect(pickerFor('two_allies')).toEqual({ kind: 'two', side: 'ally' }); expect(pickerFor('none').kind).toBe('none');
    expect(prayAction({ unitId: 'u1' }, { kind: 'hymn', id: 'mother_ember.warm_hands' }, { targetId: 'u2' })).toEqual({ type: 'faith/pray', unitId: 'u1', kind: 'hymn', id: 'mother_ember.warm_hands', targetId: 'u2' });
    expect(prayAction({ charId: 'c1' }, { kind: 'whisper', id: 'luck' })).toEqual({ type: 'faith/pray', charId: 'c1', kind: 'whisper', id: 'luck' });
  });
  it('the Belief step: eight patron cards, each with likes, taboos, Open or Jealous and three Hymns', () => {
    const cards = patronCards(); expect(cards.length).toBe(8);
    for (const k of cards) { expect(k.likes.length).toBe(3); expect(k.taboos.length).toBe(2); expect(k.hymns.length).toBe(3); expect(k.ruleText).toMatch(/^(OPEN|JEALOUS)/); expect(k.accent).toMatch(/^#/); }
    expect(BELIEF_TEXT.faith3).toMatch(/Faith 3/);
  });
});

import { faithRows } from './resources';
describe('faith resource rows', () => {
  it('a Faithful: Devotion with the next gate; a vow; Witnessed when watched', () => {
    const { c } = game({ kind: 'faithful', patron: 'old_overcast' });
    const rows = faithRows({ conds: { witnessed: 1 }, vow: { id: 'stand', state: 'sworn' } }, c);
    expect(rows.map((r) => r.key)).toEqual(['devotion', 'witnessed', 'vow']);
    expect(rows[0]).toMatchObject({ value: '3 · 0/25 XP', now: 3, max: 10, kind: 'pips' }); expect(rows[0].sub).toMatch(/Hymn II at 5/); expect(rows[0].hint).toMatch(/Devotion XP/);
    expect(rows[2].hint).toMatch(/\+3 Devotion XP\. Broken: −5\./);
    (c as any).devotionXp = 450; (c as any).devotion = 10; expect(faithRows(null, c)[0].value).toBe('10 · 450 XP');
    expect(rows[2].value).toBe('SWORN');
    expect(faithRows({ vow: { id: 'stand', state: 'broken' } }, c)[1]).toMatchObject({ warn: 'BROKEN', level: 'alert' });
  });
  it('an Atheist: the pieces per patron', () => {
    const { c } = game({ kind: 'atheist' }); (c as any).faithPieces = { mother_ember: 2 };
    const rows = faithRows(null, c);
    expect(rows.map((r) => r.label + ' ' + r.value)).toEqual([FAITH_PATRONS.find((x: any) => x.id === 'mother_ember').name + ' 2 / 3']);
  });
});
