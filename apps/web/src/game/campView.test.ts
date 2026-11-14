// The camp on screen (rules 1.51; survival-spec 13.8): three cards a character, each the engine's row (name, sentence
// with its number, worth on the cap, the line's word in its attribute's ink); the camp's issue; the party's marks; the
// held boons on the path map's squad panel ("Camp" on the starting one, the cap as "N of 50").
import { describe, expect, it } from 'vitest';
import { apply, relicRow, worthOf, BOON_CAP, START_BOON, lineOf, CAMP } from '@engine';
import { survivalRoom } from '../../../../packages/engine/test/helpers/survival';
import { campView, lineWord } from './campView';
import { runView } from './runView';
import { ATTR_INK } from './classView';

const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const camp = () => apply(survivalRoom('PHC-0001', DUO as any, { test: true }), { type: 'run/start', seed: 'PHC-0001' }, 'host');

describe('the camp\'s view', () => {
  it('three cards a character, each the engine\'s row; mine first; the Sigilist\'s Sigil cards in Intelligence\'s ink', () => {
    const g = camp(), v = campView(g, 'p2')!;
    expect(v.chars[0].charId).toBe('c2'); expect(v.chars[0].mine).toBe(true);
    for (const c of v.chars) {
      expect(c.cards).toHaveLength(START_BOON.offer);
      for (const k of c.cards) { const row: any = relicRow(k.id); expect(k.name).toBe(row.name); expect(k.text).toBe(row.text); expect(k.text).not.toMatch(/\{=/); expect(k.worthLine).toBe(worthOf(k.id) + ' of your ' + BOON_CAP); }
    }
    const sig = v.chars.find((c) => c.charId === 'c2')!;
    expect(sig.main).toBe(lineOf(g.characters.c2).main);
    const sc = sig.cards.find((k) => k.line === 'sigil')!; expect(sc.ink).toBe(ATTR_INK.intelligence); expect(sc.lineWord).toBe(lineWord('sigil').word);
    expect(sig.fit.to).toBe(CAMP.issue_armour); expect(sig.fit.label).toBe('Fit class ' + CAMP.issue_armour + ': free');
    expect(v.waiting).toBe('Waiting for 2 picks');
  });
  it('a pick shows Chosen for that player; the host may go on when one has picked', () => {
    const g = apply(camp(), { type: 'run/boon', charId: 'c1', choice: 0 }, 'host'), v = campView(g, 'host')!;
    expect(v.chars.find((c) => c.charId === 'c1')!.picked).toBe(g.characters.c1.relics![0]);
    expect(v.party.find((p) => p.id === 'host')!.chosen).toBe(true); expect(v.party.find((p) => p.id === 'p2')!.chosen).toBe(false);
    expect(v.canGo).toBe(true); expect(campView(g, 'p2')!.canGo).toBe(false);
  });
  it('the squad panel shows the held boons, the starting one marked, and the cap', () => {
    let g = apply(camp(), { type: 'run/boon', charId: 'c1', choice: 1 }, 'host'); g = apply(g, { type: 'run/boon', charId: 'c2', choice: 0 }, 'p2');
    expect(campView(g, 'host')).toBeNull();
    const p = runView(g, 'host')!.party.find((x) => x.id === 'c1')!;
    expect(p.boons).toEqual([{ id: g.characters.c1.relics![0], name: relicRow(g.characters.c1.relics![0])!.name, text: relicRow(g.characters.c1.relics![0])!.text, worth: worthOf(g.characters.c1.relics![0]), camp: true }]);
    expect(p.worth).toBe(worthOf(g.characters.c1.relics![0]) + ' of ' + BOON_CAP);
  });
});
