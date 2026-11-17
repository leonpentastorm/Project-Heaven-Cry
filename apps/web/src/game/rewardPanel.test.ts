// @ts-nocheck (a test through the real reducer: the Rec helper's game is loosely typed)
// The reward panel's view (rules 1.64) through the real path: a two-player run, a fight won through the reducer, the
// field left; the panel reads what the engine paid (the fight record's `paid`), the viewer's own picks only, and who is
// still choosing; the map's refusal names who the squad waits for once the viewer has picked.
import { describe, expect, it } from 'vitest';
import { creditsOf, runMoveProblem, survivalRun } from '@engine';
import { Rec } from '../../../../packages/engine/test/helpers/replay';
import { survivalRoom, chooseNode, ownerOf } from '../../../../packages/engine/test/helpers/survival';
import { runView } from './runView';
import { rewardPanelView } from './rewardPanelView';

const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
function afterOneFight() {
  const r = new Rec(survivalRoom('PHC-T001', DUO, { test: true }), DUO); r.must({ type: 'run/start', seed: 'PHC-T001', camp: 'recommended' });
  const node = chooseNode(r.g)!; for (let i = 0; i < DUO.length; i++) r.must({ type: 'run/move', node: node.id }, ownerOf(i));
  r.fight(40); expect(r.g.run.state).toBe('field');
  for (let i = 0; i < DUO.length && r.g.run.state === 'field'; i++) r.must({ type: 'run/leave' }, ownerOf(i));
  expect(r.g.run.state).toBe('reward');
  return r;
}

describe('the reward panel', () => {
  it('shows the pay the engine recorded on the fight, the viewer\'s own pick, and who is still choosing', () => {
    const r = afterOneFight(), g = r.g, me = ownerOf(0), mine = Object.values(g.characters).find((c: any) => c.owner === me)!;
    const f = g.run.stats.fights[g.run.stats.fights.length - 1];
    expect(f.paid[mine.id].xp).toBeGreaterThan(0); expect(f.paid[mine.id].credits).toBeGreaterThan(0);
    const p = rewardPanelView(g, me, runView(g, me)!)!;
    expect(p.owe).toBe(true);
    expect(p.pay).toHaveLength(1);
    expect(p.pay[0]).toMatchObject({ charId: mine.id, xp: f.paid[mine.id].xp, credits: f.paid[mine.id].credits, xpTotal: mine.xp, creditsTotal: creditsOf(mine) });
    expect(p.offers.map((o) => o.charId)).toEqual([mine.id]);
    const other = Object.values(g.characters).find((c: any) => c.owner !== me)!;
    expect(p.still).toBe(survivalRun.reward_panel.still.replace('{names}', other.name));
  });
  it('once the viewer has picked: no panel owed, and a map click is refused with who the squad waits for', () => {
    const r = afterOneFight(), me = ownerOf(0), mine = Object.values(r.g.characters).find((c: any) => c.owner === me)!;
    const o = r.g.run.offers[mine.id];
    r.must({ type: 'run/pick', charId: mine.id, choice: o.materials?.length ? 'materials' : 0 }, me);
    const g = r.g, p = rewardPanelView(g, me, runView(g, me)!)!, other = Object.values(g.characters).find((c: any) => c.owner !== me)!;
    if (g.run.state === 'reward' && g.run.offers?.[other.id]) {
      expect(p.owe).toBe(false);
      expect(runMoveProblem(g, me, g.run.nodes[0].id)).toBe(survivalRun.reward_panel.waiting_for.replace('{names}', other.name));
      expect(runView(g, me)!.blocked).toBe(survivalRun.reward_panel.waiting_for.replace('{names}', other.name));
      // the other player, still owing, is told to pick first
      expect(runMoveProblem(g, ownerOf(1), g.run.nodes[0].id)).toBe('Take your pick first. The squad moves on when everyone has.');
    } else throw new Error('the other character had no pick waiting');
  });
});
