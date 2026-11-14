// The camp on screen (rules 1.51, 1.52; survival-spec 13.8): after the loadout, three starting boon cards, each the
// engine's row (name, sentence with its number, worth on the cap, the line's word in its attribute's ink), offered by
// what the loadout holds; the weapon rack by archetype; the held boons on the path map's squad panel ("Camp" on the
// starting one, the cap as "N of 50").
import { describe, expect, it } from 'vitest';
import { apply, relicRow, worthOf, BOON_CAP, START_BOON, loadoutView, RACK, type GameState } from '@engine';
import { survivalRoom, ownerOf } from '../../../../packages/engine/test/helpers/survival';
import { boonCards, lineWord } from './campView';
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
      expect(a.free.price).toBe(0); expect(a.again!.price).toBeGreaterThan(0); expect(a.again!.id).toBe(a.free.id);
      if (a.better) { expect(a.better.price).toBeGreaterThanOrEqual(a.again!.price); expect(a.better.compare.length).toBeGreaterThan(0); }
    }
    expect(v.rack.some((a) => a.better && a.better.price > v.budget && /Over the budget/.test(a.better.why || ''))).toBe(true);
  });
  it('the squad panel shows the held boons, the starting one marked, and the cap', () => {
    let g = apply(camp(), { type: 'run/boon', charId: 'c1', choice: 1 }, 'host'); g = apply(g, { type: 'run/go' }, 'host');
    expect(loadoutView(g as any, 'host')).toBeNull();
    const p = runView(g, 'host')!.party.find((x) => x.id === 'c1')!;
    expect(p.boons).toEqual([{ id: g.characters.c1.relics![0], name: relicRow(g.characters.c1.relics![0])!.name, text: relicRow(g.characters.c1.relics![0])!.text, worth: worthOf(g.characters.c1.relics![0]), camp: true }]);
    expect(p.worth).toBe(worthOf(g.characters.c1.relics![0]) + ' of ' + BOON_CAP);
  });
});
