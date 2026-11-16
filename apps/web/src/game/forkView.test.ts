// Rules 1.60 (Doors 3.0, the forks): the screens' fork card reads the engine's one view (doorForkView). A step still to
// pick is white and offers its two options side by side with their rules; the first press arms a pick and the second
// sends door/pick (confirmed once); a picked option shows as a chip; a step not offered yet says what is missing.
import { describe, expect, it, vi } from 'vitest';
const sent: any[] = [];
vi.mock('./store', () => ({ act: (a: any) => sent.push(a), toast: () => {}, getState: () => ({}), subscribe: () => () => {} }));
import { forkCard, forkCards, forkChipsLine, forkLevelUp, forkIconOf } from './forkView';

const ch = (skills: Record<string, number>, doorPicks: Record<string, string[]> = {}) => ({ id: 'c1', skills, doorPicks });

describe('the fork card (game/forkView.ts)', () => {
  it('Durability 4, nothing picked: one step still to do, both options with their rules and a Choose button; picking is confirmed once', () => {
    const c = ch({ durability: 4 }); let renders = 0;
    const card = forkCard(c, 'durability', { rerender: () => { renders++; } })!;
    expect(card.pending).toBe(true); expect(card.head).toMatch(/STILL TO DO/);
    const st = card.steps[0]; expect(st.head).toMatch(/CHOOSE ONE · STILL TO DO/);
    expect(st.opts.map((o) => o.key)).toEqual(['fork.guard.provoke', 'fork.guard.cover_them']);
    for (const o of st.opts) { expect(o.canPick).toBe(true); expect(o.text.length).toBeGreaterThan(20); expect(o.icon).toBeTruthy(); }
    sent.length = 0; st.opts[1].pick(); expect(sent).toEqual([]); expect(renders).toBe(1);
    expect(forkCard(c, 'durability')!.steps[0].opts[1].label).toMatch(/Confirm: keep Cover Them for good/);
    forkCard(c, 'durability')!.steps[0].opts[1].pick();
    expect(sent).toEqual([{ type: 'door/pick', charId: 'c1', door: 'durability', option: 'fork.guard.cover_them' }]);
  });
  it('a pick made is a chip ("kept for good"), the next step opens at 6; in a fight a pick waits', () => {
    const c = ch({ durability: 5 }, { durability: ['fork.guard.provoke'] });
    expect(forkChipsLine(c, 'durability')).toBe('Forks: Provoke');
    const card = forkCard(c, 'durability', { inFight: true })!;
    expect(card.steps[0].head).toMatch(/CHOSEN · KEPT FOR GOOD/); expect(card.steps[1].head).toMatch(/OPENS AT 6/);
    expect(forkChipsLine(ch({ durability: 6 }, { durability: ['fork.guard.provoke'] }), 'durability')).toBe('Forks: Provoke · 1 fork still to do (out of a fight)');
    const lu = forkLevelUp(ch({ durability: 6 }), 'durability', 6, true)!;
    expect(lu.steps.map((s) => s.head)).toEqual(['DURABILITY 4 · CHOOSE ONE · STILL TO DO', 'DURABILITY 6 · CHOOSE ONE · STILL TO DO']);
    expect(lu.steps[0].opts[0].label).toBe('After the fight');
  });
  it('a step not offered yet says what is still to be built, and offers no button', () => {
    const card = forkCard(ch({ ingenuity: 10 }), 'ingenuity')!;
    expect(card.steps.every((s) => /NOT OFFERED YET/.test(s.head) && s.opts.every((o) => !o.canPick))).toBe(true);
    expect(card.steps[0].why).toMatch(/Light Fingers and Lend the Dark are still to be built/);
  });
  it('the sheet lists the doors reached, the ones with a pick to make first; an option\'s icon falls back to its door\'s skill', () => {
    const cards = forkCards(ch({ durability: 6, dexterity: 4, visualization: 4 }, { durability: ['fork.guard.provoke', 'fork.guard.drive'] }));
    expect(cards.map((x) => x.door)).toEqual(['dexterity', 'visualization', 'durability']);
    expect(forkIconOf('fork.none.such', 'durability')).toBeTruthy();
  });
});
