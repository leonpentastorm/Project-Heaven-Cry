// @ts-nocheck (a test through the real reducer: the Rec helper's game is loosely typed)
// The reward panel's view (rules 1.64) through the real path: a two-player run, a fight won through the reducer, the
// field left; the panel reads what the engine paid (the fight record's `paid`), the viewer's own picks only, and who is
// still choosing; the map's refusal names who the squad waits for once the viewer has picked.
import { describe, expect, it } from 'vitest';
import { creditsOf, runMoveProblem, survivalRun } from '@engine';
import { Rec } from '../../../../packages/engine/test/helpers/replay';
import { survivalRoom, chooseNode, ownerOf } from '../../../../packages/engine/test/helpers/survival';
import { runView } from './runView';
import { rewardPanelView, payPieces } from './rewardPanelView';

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

describe('the map never eats a click (rules 1.64 R2)', () => {
  it('every stop the viewer cannot take carries the engine refusal, in every state the map is drawn in', () => {
    const r = new Rec(survivalRoom('PHC-T001', DUO, { test: true }), DUO); r.must({ type: 'run/start', seed: 'PHC-T001', camp: 'recommended' });
    const me = ownerOf(0), whyAll = () => { const v = runView(r.g, me)!; return v.nodes.filter((n) => n.state !== 'reachable').map((n) => n.why); };
    // on the map: an unlit stop says it can't be reached (the engine's words)
    expect(whyAll().every((w) => typeof w === 'string' && w.length > 0)).toBe(true);
    const node = chooseNode(r.g)!; for (let i = 0; i < DUO.length; i++) r.must({ type: 'run/move', node: node.id }, ownerOf(i));
    r.fight(40); expect(r.g.run.state).toBe('field');
    // the field: every stop says to leave the field first, and the view's blocked line is the same refusal
    const field = runMoveProblem(r.g, me, r.g.run.nodes[0].id);
    expect(whyAll().every((w) => w === field)).toBe(true); expect(runView(r.g, me)!.blocked).toBe(field);
    for (let i = 0; i < DUO.length && r.g.run.state === 'field'; i++) r.must({ type: 'run/leave' }, ownerOf(i));
    // the rewards: the viewer still owes a pick, so the refusal says so (the panel reopens on the client)
    expect(whyAll().every((w) => w === 'Take your pick first. The squad moves on when everyone has.')).toBe(true);
    // ... and no stop is lit while the run waits on the rewards: the next stop (a link of here) says the refusal too, so a click on it never sends a move
    const v = runView(r.g, me)!, next = r.g.run.nodes.find((n: any) => n.id === r.g.run.at).links;
    expect(v.nodes.filter((n) => n.state === 'reachable')).toEqual([]);
    expect(v.nodes.filter((n) => next.includes(n.id)).every((n) => n.why === 'Take your pick first. The squad moves on when everyone has.')).toBe(true);
    expect(v.links.filter((l) => l.lit)).toEqual([]);
  });
});

describe('the reward panel heading and pay line (0.32 B9)', () => {
  const W = survivalRun.reward_panel;
  it('a pay line says only what was paid: the vault\'s credits alone, never "– · +702 credits"', () => {
    expect(payPieces({ xp: null, credits: 702 }).map((x) => x.text)).toEqual(['+702 ' + W.credits.toLowerCase()]);
    expect(payPieces({ xp: 35, credits: 100 }).map((x) => x.text)).toEqual(['+35 ' + W.xp, '+100 ' + W.credits.toLowerCase()]);
    expect(payPieces({ xp: null, credits: null }).map((x) => x.text)).toEqual(['–']);
  });
  it('a cache or vault title that is only its kind is not repeated after the kicker', () => {
    const r = afterOneFight(), me = ownerOf(0), v = runView(r.g, me)!;
    const p = rewardPanelView(r.g, me, { ...v, note: { ...v.note!, kicker: 'VAULT · STOP 9 OF 15', title: 'Vault' } } as any)!;
    // a won fight's panel is headed by the fight's name; with no fight here the note's kicker heads it
    const g2 = { ...r.g, run: { ...r.g.run, stats: { ...r.g.run.stats, fights: [] } } };
    const q = rewardPanelView(g2, me, { ...v, note: { ...v.note!, kicker: 'VAULT · STOP 9 OF 15', title: 'Vault' } } as any)!;
    expect(q.kicker).toBe('VAULT · STOP 9 OF 15'); expect(q.title).toBe('');
    expect(p.title).toBe('Vault'); // under a fight's own name the kind still says something
  });
});
