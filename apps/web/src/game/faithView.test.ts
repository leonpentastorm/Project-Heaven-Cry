// Blessing 2.0 view models (game/faithView.ts): the Faith panel, the prayer buttons (AP, gate, odds, why disabled), the
// pickers, the payload, the Belief step's patron cards; read from a real game through the engine's faithView.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, apply, newGame, faithView, FAITH_PATRONS, type Sheet } from '@engine';
import { oddsOf, oddsText, prayerButtons, prayAction, pickerFor, faithPanel, patronCards, BELIEF_TEXT } from './faithView';

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
    const b = prayerButtons(v);
    expect(b.whispers.map((x) => x.id)).toEqual(['luck', 'health', 'protection', 'courage', 'guidance', 'safe_passage']);
    expect(b.whispers[0]).toMatchObject({ ap: '1 AP', gate: 'ANYONE' });
    expect(b.hymns.map((x) => x.gate)).toEqual(['HYMN I · DEVOTION 3', 'HYMN II · DEVOTION 5', 'HYMN III · DEVOTION 7']);
    expect(b.hymns[1].odds).toMatch(/^OVERREACH · TN \d+/); expect(b.hymns[1].warn).toMatch(/a miss costs 1 Devotion/);
    expect(b.miracle!.ok).toBe(false); expect(b.miracle!.why).toMatch(/Faith 7|Devotion 7/);
    for (const x of [...b.whispers, ...b.hymns, b.miracle!]) { expect(x.icon).toMatch(/^data:image\/svg|^\/assets\//); if (!x.ok) expect(x.why).toBeTruthy(); }
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
