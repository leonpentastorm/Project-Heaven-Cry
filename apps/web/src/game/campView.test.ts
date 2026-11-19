// The camp on screen (rules 1.51, 1.52; survival-spec 13.8): after the loadout, three starting boon cards, each the
// engine's row (name, sentence with its number, worth on the cap, the line's word in its attribute's ink), offered by
// what the loadout holds; the weapon rack by archetype; the held boons on the path map's squad panel ("Camp" on the
// starting one, the cap as "N of 50").
import { describe, expect, it } from 'vitest';
import { apply, relicRow, worthOf, BOON_CAP, START_BOON, loadoutView, RACK, type GameState } from '@engine';
import { survivalRoom, ownerOf } from '../../../../packages/engine/test/helpers/survival';
import { boonCards, lineWord, campChecklist, campHelp, campConfirm, freeAction, campGuard, levelUpGuard, campLevelUpAsk } from './campView';
import { currentDialog, answerDialog } from './dialog';
import { runView } from './runView';
import { ATTR_INK } from './classView';

const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const camp = (): GameState => { let g = apply(survivalRoom('PHC-0001', DUO as any, { test: true }), { type: 'run/start', seed: 'PHC-0001' }, 'host');
  for (let i = 0; i < 2; i++) g = apply(g, { type: 'run/loadout', charId: 'c' + (i + 1), op: 'recommended' } as any, ownerOf(i)); return g; };

describe('the camp\'s view', () => {
  it('three starting boon cards, each the engine\'s row; the Sigilist\'s Sigil cards in Intelligence\'s ink', () => {
    const g = camp(), v = loadoutView(g as any, 'p2')!;
    expect(v.me.id).toBe('c2');
    const cards = boonCards(v);
    expect(cards).toHaveLength(START_BOON.offer);
    for (const k of cards) { const row: any = relicRow(k.id); expect(k.name).toBe(row.name); expect(k.text).toBe(row.text); expect(k.text).not.toMatch(/\{=/); expect(k.worthLine).toBe(worthOf(k.id) + ' of your ' + BOON_CAP); }
    const sc = cards.find((k) => k.line === 'sigil')!; expect(sc.ink).toBe(ATTR_INK.intelligence); expect(sc.lineWord).toBe(lineWord('sigil').word);
    expect(v.boon.chosen).toBeNull(); expect(v.boon.why).toBeNull();
    const chosen = apply(g, { type: 'run/boon', charId: 'c2', choice: 1 }, 'p2');
    expect(boonCards(loadoutView(chosen as any, 'p2')!).filter((k) => k.chosen).map((k) => k.i)).toEqual([1]);
  });
  it('the rack: one row an archetype, the free weapon, the same again priced, the better one compared with the free one', () => {
    const v = loadoutView(camp() as any, 'host')!;
    expect(v.rack.map((a) => a.id)).toEqual(RACK.map((a) => a.id));
    for (const a of v.rack) {
      // rules 1.55: nothing over the budget is listed; a weapon also on a counter shelf (throwing knives) is listed once
      expect(a.free.price).toBe(0); if (a.again) { expect(a.again.price).toBeGreaterThan(0); expect(a.again.id).toBe(a.free.id); expect(a.again.price).toBeLessThanOrEqual(v.budget); }
      if (a.better) { if (a.again) expect(a.better.price).toBeGreaterThanOrEqual(a.again.price); expect(a.better.price).toBeLessThanOrEqual(v.budget); expect(a.better.compare.length).toBeGreaterThan(0); }
    }
    expect(v.rack.filter((a) => a.again).length).toBeGreaterThan(0);
  });
  it('the squad panel shows the held boons, the starting one marked, and the cap', () => {
    let g = apply(camp(), { type: 'run/boon', charId: 'c1', choice: 1 }, 'host'); g = apply(g, { type: 'run/go' }, 'host');
    expect(loadoutView(g as any, 'host')).toBeNull();
    const p = runView(g, 'host')!.party.find((x) => x.id === 'c1')!;
    expect(p.boons).toEqual([{ id: g.characters.c1.relics![0], name: relicRow(g.characters.c1.relics![0])!.name, text: relicRow(g.characters.c1.relics![0])!.text, worth: worthOf(g.characters.c1.relics![0]), camp: true }]);
    expect(p.worth).toBe(worthOf(g.characters.c1.relics![0]) + ' of ' + BOON_CAP);
  });
});

describe('the camp as a checklist (rules 1.55 item 49)', () => {
  const fresh = (): GameState => apply(survivalRoom('PHC-0001', DUO as any, { test: true }), { type: 'run/start', seed: 'PHC-0001' }, 'host');
  it('a gunner: weapon NOT PICKED, no focus step, the budget whole; a free card says Take (free), then Swap; the confirm in plain words', () => {
    let g = fresh(), v = loadoutView(g as any, 'host')!;
    let ch = campChecklist(v);
    expect(ch.map((k) => k.key)).toEqual(['weapon', 'budget', 'boon']);
    expect(ch[0]).toMatchObject({ n: 1, title: 'FREE WEAPON', state: 'NOT PICKED', done: false, glyph: '○' });
    expect(ch[1]).toMatchObject({ n: 2, state: v.budget + ' of ' + v.budget + ' cr left', meter: { left: v.budget, total: v.budget } });
    expect(campHelp(v)).toBe('Before the run: take one free weapon and spend your budget on anything else.');
    const [a, b] = v.rack;
    expect(freeAction(a.free, v, 'weapon')).toBe('Take (free)');
    expect(campConfirm(v)).toEqual({ open: ['weapon'], text: 'You have not taken your free weapon. It costs nothing.', back: 'Go back and pick', go: 'Start without it' });
    expect(campConfirm(v, true)!.go).toBe('Go on without it');
    g = apply(g, { type: 'run/loadout', charId: 'c1', op: 'pick', slot: 'weapon', id: a.free.id } as any, 'host'); v = loadoutView(g as any, 'host')!;
    ch = campChecklist(v);
    expect(ch[0]).toMatchObject({ state: v.freePicks.weapon.name, done: true, glyph: '✓' });
    expect(freeAction(v.rack[0].free, v, 'weapon')).toBe('✓ YOURS'); expect(freeAction(v.rack.find((x) => x.id === b.id)!.free, v, 'weapon')).toBe('Swap to this (free)');
    expect(campConfirm(v)).toBeNull();
  });
  it('a caster: the focus step, both open asks for both; Recommended ticks every free pick', () => {
    let g = fresh(), v = loadoutView(g as any, 'p2')!;
    expect(campChecklist(v).map((k) => k.key)).toEqual(['weapon', 'focus', 'budget', 'boon']);
    expect(campHelp(v)).toBe('Before the run: take one free weapon, one free focus and spend your budget on anything else.');
    expect(campConfirm(v)!.text).toBe('You have not taken your free weapon or your free focus. They cost nothing.');
    expect(campConfirm(v)!.go).toBe('Start without them');
    expect(v.recommended.lines.some((l) => l.endsWith('(free)'))).toBe(true);
    g = apply(g, { type: 'run/loadout', charId: 'c2', op: 'recommended' } as any, 'p2'); v = loadoutView(g as any, 'p2')!;
    expect(campChecklist(v).filter((k) => k.key === 'weapon' || k.key === 'focus').every((k) => k.done)).toBe(true);
    expect(campConfirm(v)).toBeNull();
  });
  it('the guard: a free pick open asks in the house dialog (Go back and pick is the safe answer); going on runs it and is not asked again', async () => {
    const v = loadoutView(fresh() as any, 'host')!; let ran = 0, back = '';
    campGuard(v, false, () => ran++, (k) => { back = k; });
    expect(currentDialog()?.title).toBe('Before you go on'); answerDialog(false); await Promise.resolve(); await Promise.resolve();
    expect([ran, back]).toEqual([0, 'weapon']);
    campGuard(v, false, () => ran++); answerDialog(true); await Promise.resolve(); await Promise.resolve(); expect(ran).toBe(1);
    campGuard(v, false, () => ran++); expect(currentDialog()).toBeNull(); expect(ran).toBe(2);
    const done = loadoutView(apply(fresh(), { type: 'run/loadout', charId: 'c1', op: 'recommended' } as any, 'host') as any, 'host')!;
    campGuard(done, false, () => ran++); expect(currentDialog()).toBeNull(); expect(ran).toBe(3);
});
});

describe('outside playtest 0.31.10 row 2: Start the run with a level-up due', () => {
  it('asks first; the safe answer opens Level up; going on without runs Ready once', async () => {
    const g = camp(); (g.characters.c1 as any).unspent = { ...(g.characters.c1 as any).unspent, skill: 2 };
    const v = loadoutView(g as any, 'host')!;
    expect(v.levelUp).toBe(true);
    let ran = 0, opened = 0;
    levelUpGuard(v, () => ran++, () => opened++);
    expect(currentDialog()?.title).toBe('Level up first?'); answerDialog(false); await Promise.resolve(); await Promise.resolve();
    expect([ran, opened]).toEqual([0, 1]);
    levelUpGuard(v, () => ran++, () => opened++); answerDialog(true); await Promise.resolve(); await Promise.resolve();
    expect([ran, opened]).toEqual([1, 1]);
    const plain = loadoutView(camp() as any, 'p2')!;
    expect(plain.levelUp).toBe(false); expect(campLevelUpAsk(plain)).toBeNull();
  });
});
