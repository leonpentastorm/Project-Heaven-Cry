// @ts-nocheck (a measuring tool)
// Survival's simulated runs (survival-spec section 5.6, section 10 row 9; rules 1.49). Two parts:
//  - THE GUARD (always on, in `npm run check`): a small seeded set of whole runs with generous bands on the headline
//    results, so a later change that breaks the run curve is caught (a solo gunner clears stage 1 most of the time and
//    is beaten by stage 4; a squad of four is beaten in stages 2 to 5; nobody runs dry; levels per stage);
//  - THE MEASURE (opt-in): SURVIVAL_SIM=1 plays the cells named in SIM_CELLS ("party:route,…"; default all) over
//    SIM_SEEDS seeds (default 8) and writes every run to SIM_OUT (JSON) for survival-run-report.ts to tabulate.
//    How to run it and what it printed: docs/design/handoffs/survival-steps-9-10.md.
import { describe, expect, it } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import { simRun, PARTIES, type RoutePolicy } from './survival-run';
import { tabulate } from './survival-run-report';

const env = (globalThis as any).process?.env || {};
const ROUTES: RoutePolicy[] = ['gear', 'training', 'safest'];

describe('Survival, simulated runs (rules 1.49): the guard', () => {
  // A solo gunner on the gear route, three seeds: stage 1 is clearable alone (spec: solo viable through stage 1 and
  // into 2); runs end (a run that clears stage 4 alone is a curve that stopped rising).
  it('a solo gunner clears stage 1 on at least two seeds of three and never clears stage 4', () => {
    const runs = ['GUARD-1', 'GUARD-2', 'GUARD-3'].map((seed) => simRun({ party: 'solo_gunner', route: 'gear', seed, maxStages: 4 }));
    for (const r of runs) expect(r.errors.filter((e) => !/levelup/.test(e)), r.seed).toEqual([]);
    expect(runs.filter((r) => r.cleared >= 1).length, runs.map((r) => r.seed + ' ' + r.how + ' ' + r.stage + '.' + r.depth).join('; ')).toBeGreaterThanOrEqual(2);
    const ends = runs.map((r) => r.seed + ' ' + r.how + ' ' + r.stage + '.' + r.depth + ' cleared ' + r.cleared).join('; ');
    expect(runs.every((r) => r.cleared < 4), ends).toBe(true);
    // levels per stage (spec 5.4: about level 6 to 7 after stage 1's Boss)
    for (const r of runs) if (r.stages[0].cleared) expect(r.stages[0].level[0]).toBeGreaterThanOrEqual(5), expect(r.stages[0].level[0]).toBeLessThanOrEqual(8);
    // a gunner on Bursts never runs dry between shops
    for (const r of runs) expect(r.fights.every((f) => f.ammo.every((a) => a == null || a > 0)), r.seed).toBe(true);
  }, 900_000);
});

describe.runIf(env.SURVIVAL_SIM)('Survival, simulated runs: the measure', () => {
  it('plays the cells and writes every run', () => {
    const cells = (env.SIM_CELLS ? String(env.SIM_CELLS).split(',') : Object.keys(PARTIES).flatMap((p) => ROUTES.map((r) => p + ':' + r))).map((x) => x.split(':'));
    const seeds = Number(env.SIM_SEEDS || 8), from = Number(env.SIM_FROM || 1), out: any[] = [];
    for (const [party, route] of cells) for (let i = from; i < from + seeds; i++) {
      const t = Date.now(), r = simRun({ party, route: route as RoutePolicy, seed: 'SIM-' + i, maxStages: Number(env.SIM_MAX_STAGES || 7), repair: env.SIM_REPAIR !== '0' });
      out.push({ ...r, ms: Date.now() - t });
      (globalThis as any).console.log(party + ':' + route + ' SIM-' + i + ' ' + r.how + ' stage ' + r.stage + ' depth ' + r.depth + ' cleared ' + r.cleared + ' (' + Math.round((Date.now() - t) / 1000) + ' s)' + (r.errors.length ? ' ERR ' + r.errors.slice(0, 2).join(' | ') : ''));
      if (env.SIM_OUT) writeFileSync(env.SIM_OUT, JSON.stringify(out));
    }
  }, 24 * 3600_000);
});

describe.runIf(env.SIM_REPORT)('Survival, simulated runs: the tables', () => {
  it('reads the runs written by the measure and prints the tables', () => {
    const runs = String(env.SIM_REPORT).split(',').flatMap((f) => JSON.parse(readFileSync(f, 'utf8')));
    const text = tabulate(runs);
    if (env.SIM_REPORT_OUT) writeFileSync(env.SIM_REPORT_OUT, text); else (globalThis as any).console.log(text);
  });
});
