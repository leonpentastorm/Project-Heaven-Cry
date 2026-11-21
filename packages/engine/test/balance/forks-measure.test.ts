// @ts-nocheck (a measuring tool)
// Rules 1.60 (Doors 3.0) slice C: what each built fork does to its door's reading (measured, never tuned here).
// The systems measure (refit-measure.ts, all in, rules.json measure.levels, no perk steps, the feeds at x1), once with
// no fork and once with each option the build may pick (test/balance/builds.ts STEPS.forks): the line moves by the
// difference. An option that needs an ally, a foe's turn or a tank's blow the one-unit measure does not make shows ~0:
// reported as not expressible. FORKS_MEASURE=1 npm test -w @phc/engine -- forks-measure
import { describe, it, expect } from 'vitest';
import { RULES } from '../../src';
import { measure, yardOf } from './refit-measure';
import { STEPS } from './builds';
import { FEEDS } from '../../src/effects/feed';

const ON = process.env.FORKS_MEASURE === '1';
const LEVELS: number[] = (RULES as any).measure.levels, N = 6, GUNS = ['adamantile_battle_rifle', 'long_rifle', 'hellraiser_service_rifle'];
// the contract rows a door's forks can move, and the options of that door the builds can take
const ROWS: Record<string, string[]> = {
  gun: ['fork.pressure.converging_fire', 'fork.pressure.walk_it_in', 'fork.pressure.through_the_gap', 'fork.pressure.lockdown'],
  blade: ['fork.momentum.rolling_start', 'fork.momentum.grindstone'],
  heal: ['fork.tend.keep_the_thread', 'fork.tend.short_thread'],
};
const line = (sys: string, forks: string[]) => {
  STEPS.forks = forks; const xs: number[] = [];
  try { for (const lv of LEVELS) { const r = measure(lv, 'allin', N, [sys], yardOf(lv, N), GUNS); expect(r.errors).toBe(0); xs.push(r[sys]); } } finally { STEPS.forks = []; }
  return xs;
};
describe.skipIf(!ON)('the forks against their doors\' readings with no fork (measured, not tuned)', () => {
  it('each option, all in, against the reading with no fork', () => {
    const was = STEPS.perks, per = FEEDS.map((f) => f.per); STEPS.perks = false; FEEDS.forEach((f) => { f.per = 0; });
    const out: string[] = [];
    try {
      for (const [sys, opts] of Object.entries(ROWS)) {
        const base = line(sys, []), mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
        out.push(sys + ' with no fork: ' + mean(base) + '% (levels ' + LEVELS.join(' / ') + ': ' + base.join(' / ') + ')');
        for (const o of opts) { const xs = line(sys, [o]), d = mean(xs) - mean(base); out.push('  ' + o + ': ' + mean(xs) + '% (' + (d >= 0 ? '+' : '') + d + ' points; ' + xs.join(' / ') + ')' + (Math.abs(d) > 10 ? '  <-- moves the reading by more than 10 points' : '')); }
      }
    } finally { STEPS.perks = was; FEEDS.forEach((f, i) => { f.per = per[i]; }); }
    console.info(out.join('\n'));
  }, 1800000);
});
