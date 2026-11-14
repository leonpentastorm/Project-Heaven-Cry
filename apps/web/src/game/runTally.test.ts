// The run's tally on screen and Report a run (rules 1.47; Survival build step 6): the tables read the engine's tally
// and add it up with the engine's sums; the report's shape holds the seed, the mode, the stage log, every fight's tally,
// each character's build, gear and boons, and the game version.
import { describe, expect, it } from 'vitest';
import { sumTallies } from '@engine';
import { Rec } from '../../../../packages/engine/test/helpers/replay';
import { survivalRoom, chooseNode, ownerOf } from '../../../../packages/engine/test/helpers/survival';
import { lastFightTally, summaryTallies, TALLY_COLS } from './tallyView';
import { runReport, runReportText, runReportName } from './runReport';

const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
/** A run after its first fight, won: the reward screen's state. */
function afterOneFight() {
  const r = new Rec(survivalRoom('PHC-T001', DUO, { test: true }), DUO); r.must({ type: 'run/start', seed: 'PHC-T001' });
  for (let i = 0; i < DUO.length; i++) r.must({ type: 'run/boon', charId: 'c' + (i + 1), choice: 0 }, ownerOf(i)); // rules 1.51: the camp
  const node = chooseNode(r.g)!; for (let i = 0; i < DUO.length; i++) r.must({ type: 'run/move', node: node.id }, ownerOf(i));
  r.fight(40); expect(r.g.run.state).toBe('reward');
  return r.g;
}

describe('the tally tables', () => {
  it('the reward screen shows the fight\'s tally, a row a character, the numbers the engine kept', () => {
    const g = afterOneFight(), t = lastFightTally(g)!, kept = g.run.stats.fights[0].tally;
    expect(t.scope).toBe('fight'); expect(t.rounds).toBe(g.run.stats.fights[0].rounds); expect(t.rows.map((r) => r.id)).toEqual(Object.keys(kept.chars));
    for (const row of t.rows) for (const c of TALLY_COLS) if (c.key !== 'downs') expect(row[c.key]).toBe(kept.chars[row.id][c.key]);
    expect(t.rows.reduce((n, r) => n + r.dealt, 0)).toBeGreaterThan(0);
    expect(t.rows.find((r) => r.shots)!.aim).toMatch(/^\d+ of \d+$/);
    g.run.state = 'map'; expect(lastFightTally(g)).toBeNull(); // only on the reward screen
  });
  it('the summary: the run first, then each stage, each the engine\'s sum', () => {
    const g = afterOneFight(), all = summaryTallies(g);
    expect(all.map((t) => t.scope)).toEqual(['run', 'stage']);
    const sum = sumTallies(g.run.stats.fights.map((f: any) => f.tally));
    expect(all[0].rows.map((r) => r.dealt)).toEqual(Object.values(sum.chars).map((c) => c.dealt)); expect(all[1].caption).toMatch(/^STAGE 1 · 1 FIGHT$/);
  });
});

describe('Report a run', () => {
  it('holds the seed, the mode, the stage log, each fight\'s tally, each character\'s build, gear and boons, and the version', () => {
    const g = afterOneFight(), rep = runReport(g, { gameVersion: '9.9.9', at: '2026-11-13T00:00:00.000Z' })!;
    expect(rep.format).toBe('phc-run-report'); expect(rep.version).toBe(1); expect(rep.gameVersion).toBe('9.9.9'); expect(rep.seed).toBe('PHC-T001'); expect(rep.mode).toBe('Survival');
    expect(rep.outcome).toBeNull(); expect(rep.stages).toHaveLength(1); expect(rep.stages[0]).toMatchObject({ stage: 1, fights: 1 });
    expect(rep.fights).toHaveLength(1); expect(rep.fights[0]).toMatchObject({ stage: 1, outcome: 'win', template: expect.any(String), foes: expect.any(Array), tally: g.run.stats.fights[0].tally });
    expect(rep.tally.rounds).toBe(g.run.stats.fights[0].rounds);
    expect(rep.characters).toHaveLength(2);
    for (const c of rep.characters as any[]) { expect(c).toMatchObject({ name: expect.any(String), level: expect.any(Number), attrs: expect.any(Object), skills: expect.any(Object), boons: expect.any(Array) }); expect(c.gear.weapon).toBeTruthy(); }
    const text = runReportText(g, { gameVersion: '9.9.9', at: '2026-11-13T00:00:00.000Z' })!;
    expect(JSON.parse(text).seed).toBe('PHC-T001'); expect(text).not.toMatch(/sk-ant-/);
    expect(runReportName('PHC-T001', new Date('2026-11-13T01:02:03Z'))).toBe('phc-run-PHC-T001-2026-11-13T01-02-03.json');
  });
  it('is nothing without a run', () => { const g: any = afterOneFight(); g.run = null; expect(runReport(g)).toBeNull(); expect(runReportText(g)).toBeNull(); });
});
