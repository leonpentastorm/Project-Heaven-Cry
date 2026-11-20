// Rules 1.60 (Doors 3.0, the forks): the screens' fork card reads the engine's one view (doorForkView). A step still to
// pick is white and offers its two options side by side with their rules; the first press arms a pick and the second
// sends door/pick (confirmed once); a picked option shows as a chip; a step not offered yet says what is missing.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ladderSchedule, forkRow } from '@engine';
const sent: any[] = [];
vi.mock('./store', () => ({ act: (a: any) => sent.push(a), toast: () => {}, getState: () => ({}), subscribe: () => () => {} }));
import { forkCard, forkCards, forkChipsLine, forkLevelUp, forkIconOf } from './forkView';

const F = ladderSchedule('durability').forks;
const ch = (skills: Record<string, number>, doorPicks: Record<string, string[]> = {}) => ({ id: 'c1', skills, doorPicks });

describe('the fork card (game/forkView.ts)', () => {
  it('Durability 4, nothing picked: one step still to do, both options with their rules and a Choose button; picking is confirmed once', () => {
    const c = ch({ durability: 4 }); let renders = 0;
    const card = forkCard(c, 'durability', { rerender: () => { renders++; } })!;
    expect(card.pending).toBe(true); expect(card.head).toMatch(/FORKS/);
    const st = card.steps[0]; expect(st.head).toBe('Fork at 4: choose one');
    expect(st.opts.map((o) => o.key)).toEqual(['fork.guard.provoke', 'fork.guard.cover_them']);
    for (const o of st.opts) { expect(o.canPick).toBe(true); expect(o.text.length).toBeGreaterThan(20); expect(o.icon).toBeTruthy(); }
    sent.length = 0; st.opts[1].pick(); expect(sent).toEqual([]); expect(renders).toBe(1);
    expect(forkCard(c, 'durability')!.steps[0].opts[1].label).toMatch(/Confirm: keep Cover Them for good/);
    forkCard(c, 'durability')!.steps[0].opts[1].pick();
    expect(sent).toEqual([{ type: 'door/pick', charId: 'c1', door: 'durability', option: 'fork.guard.cover_them' }]);
  });
  it('a pick made is a chip ("kept for good"), the next step opens at its second fork (8 since rules 1.70); in a fight a pick waits', () => {
    expect(F).toEqual([4, 8]);
    const c = ch({ durability: F[1] - 1 }, { durability: ['fork.guard.provoke'] });
    expect(forkChipsLine(c, 'durability')).toBe('Forks: Provoke');
    const card = forkCard(c, 'durability', { inFight: true })!;
    expect(card.steps[0].head).toBe('Fork at ' + F[0] + ': chosen'); expect(card.steps[1].head).toBe('Fork at ' + F[1]);
    expect(forkChipsLine(ch({ durability: F[1] }, { durability: ['fork.guard.provoke'] }), 'durability')).toBe('Forks: Provoke · 1 fork still to do (out of a fight)');
    const lu = forkLevelUp(ch({ durability: F[1] }), 'durability', F[1], true)!;
    expect(lu.steps.map((s) => s.head)).toEqual(['Fork at ' + F[0] + ': choose one', 'Fork at ' + F[1] + ': choose one']);
    expect(lu.steps[0].opts[0].label).toBe('After the fight');
  });
  // A sealed door for the two tests below: Ingenuity's options are built since rules 1.74 (item 6003), so its rows are
  // marked shelved while they run (the engine's own rows, put back after): the view is what is tested, not which door.
  const SEAL = ['fork.shadow.light_fingers', 'fork.shadow.lend_the_dark', 'fork.shadow.lightkiller', 'fork.shadow.spotter'];
  let was: [any, any][] = [];
  beforeEach(() => { was = SEAL.map((id) => [forkRow(id), (forkRow(id) as any)?.shelved]); for (const [r] of was) if (r) r.shelved = true; });
  afterEach(() => { for (const [r, s] of was) if (r) { if (s === undefined) delete r.shelved; else r.shelved = s; } });
  it('a step not offered yet says it is sealed (a player line, rules 1.66 item 5212), and offers no button', () => {
    const card = forkCard(ch({ ingenuity: 10 }), 'ingenuity')!;
    expect(card.steps.every((s) => /not offered yet/.test(s.head) && s.opts.every((o) => !o.canPick))).toBe(true);
    expect(card.steps[0].why).toBe('Sealed: not yet issued.');
  });
  it('row 16 (outside playtest 0.31.10): a sealed door level-up still shows its fork section, the steps reached sealed', () => {
    for (const p of [4, 6, 7, 10]) {
      const lu = forkLevelUp(ch({ ingenuity: p }), 'ingenuity', p, false);
      expect(lu, 'Ingenuity ' + p).not.toBeNull();
      expect(lu!.steps.filter((s) => /not offered yet/i.test(s.head)).length).toBeGreaterThan(0);
      expect(lu!.steps.every((s) => s.opts.every((o) => !o.canPick))).toBe(true);
    }
  });
  it('an option not built yet shows its rule in words, never the data\'s designer note (no id, no rules number, no N-item)', () => {
    const offs = ['ingenuity', 'raw_power', 'hand_eye_coordination', 'volition', 'lore_master', 'empathy', 'faith'].flatMap((d) => forkCard(ch({ [d]: 10 }), d)?.steps.flatMap((s) => s.opts) || []);
    const unbuilt = offs.filter((o) => o.style.includes('opacity: 0.6'));
    expect(unbuilt.length).toBeGreaterThan(0);
    for (const o of unbuilt) { expect(o.text.length).toBeGreaterThan(20); expect(o.text).not.toMatch(/[a-z]_[a-z]|rules \d|\bN\d+\b|\{=|`/); }
  });
  it('the sheet lists the doors reached, the ones with a pick to make first; an option\'s icon falls back to its door\'s skill', () => {
    const cards = forkCards(ch({ durability: F[1], dexterity: F[0], empathy: F[0], visualization: F[0] }, { durability: ['fork.guard.provoke', 'fork.guard.drive'] }));
    // rules 1.74 item 6041: Visualization's forks (Hard Light or Sharp Light at 4) have a card again; its forms are a door of their own
    expect(cards.map((x) => x.door)).toEqual(['dexterity', 'visualization', 'empathy', 'durability']);
    expect(forkIconOf('fork.none.such', 'durability')).toBeTruthy();
  });
});

describe('a hover box never repeats what its card shows (ATTACK-PLAN 19 Nov: the level-up fork cards printed their own text again)', () => {
  it('no fork option carries a hover text, and neither fork card template puts a tip on an option or its parts', async () => {
    const { readFileSync } = await import('node:fs');
    const c = ch({ durability: 10, raw_power: 10, dexterity: 10, ingenuity: 10, brain_power: 10, visualization: 10, empathy: 10, will_power: 10, faith: 10 });
    for (const card of forkCards(c)) for (const st of card.steps) for (const o of st.opts) expect(Object.keys(o), card.door + ' ' + o.key).not.toContain('title');
    for (const t of ['../templates/main.template.html', '../templates/levelup.template.html']) {
      const tpl = readFileSync(new URL(t, import.meta.url), 'utf-8'), i = tpl.indexOf('data-fork-opt'), opt = tpl.slice(i, tpl.indexOf('</sc-for>', i));
      expect(i, t).toBeGreaterThan(0); expect(opt, t).not.toMatch(/\btip="/);
    }
  });
});

// 0.32 final pass B8: a new Rigger's FIGMENTS tab said "Nothing to pick." with no hint. The door's own choices (Figment
// forms known, door figment_forms, opened by Visualization) are named on the tab and in the empty pick list, with where
// they are chosen; none once they are chosen. The counts are the engine's (allPendingDoorPicks).
import { doorChoiceLine, doorChoiceEmpty } from './forkLine';
import { allPendingDoorPicks } from '@engine';
describe('a door\'s own choices on its tab (game/forkLine.ts)', () => {
  it('Visualization 1, no form learned: the forms to choose and where; chosen: nothing said', () => {
    const c: any = ch({ visualization: 1 });
    const n = allPendingDoorPicks(c).find((p) => p.skill === 'visualization' && !p.grant.startsWith('fork:'))!.left;
    expect(n).toBeGreaterThan(0);
    expect(doorChoiceLine(c, 'visualization')).toBe('Figment form: ' + n + ' to choose (out of a fight, on Level up)');
    expect(doorChoiceEmpty(c, 'visualization')).toBe('Nothing learned yet: ' + n + ' Figment form' + (n > 1 ? 's' : '') + ' to choose, out of a fight, on Level up.');
    expect(doorChoiceLine(c, 'durability')).toBe('');
    const done: any = ch({ visualization: 1 }, { figment_forms: allPendingDoorPicks(c)[0].options.slice(0, n).map((o) => o.id) });
    expect(doorChoiceLine(done, 'visualization')).toBe(''); expect(doorChoiceEmpty(done, 'visualization')).toBe('');
  });
});
