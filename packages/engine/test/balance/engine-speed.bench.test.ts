// @ts-nocheck (a measuring tool)
// ENGINE SPEED (0.33 lane: the outside code review's "engine clone and migration gate"). Opt-in, never in the gate:
//   ENGINE_BENCH=1 npx vitest run test/balance/engine-speed.bench.test.ts      (from packages/engine)
// It measures, on a recorded 4 v 10 Proving Ground fight (the replay scenario 'proving-4v10-boss', the enemy AI on):
//   - apply() per action (the reducer, end to end), on every action the replay sent;
//   - the cost of the working copy apply() makes of the whole game (the same JSON round trip, timed alone);
//   - the per-action migration pass apply() runs over every sheet;
//   - migrateLoaded per call (a guest calls it on every view it is sent), on the same states;
//   - previewAction (the client's whole-action dry run) and preview() (the fight copy) on the same states;
//   - one simulated Survival run's wall time (survival-run.ts simRun, a squad of four, two stages).
// Nothing here is asserted: it prints a table. The numbers before and after the lane are in
// docs/design/handoffs/0.33-LANE-ENGSPEED.md.
import { describe, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { appendFileSync, writeFileSync } from 'node:fs';
import { apply, migrateLoaded, previewAction, preview, migrateCharacterSigils, migrateCharacterSoul, migrateCharacterClass, migrateCharacterFocus, migrateCharacterFaith, migrateCharacterItems, migrateCharacterMp, migrateCharacterFigments, migrateCharacterPerks, migrateCharacterHp } from '../../src';
import { SCENARIOS, Rec } from '../helpers/replay';
import { simRun } from './survival-run';

const env = (globalThis as any).process?.env || {};
const ms = (n: number) => n.toFixed(3) + ' ms';
/** The fastest of `reps` runs (the machine is shared: the minimum is the steadiest measure). */
function time(fn: () => void, reps = 1): number { let best = Infinity; for (let i = 0; i < reps; i++) { const t0 = performance.now(); fn(); best = Math.min(best, performance.now() - t0); } return best; }

describe.runIf(env.ENGINE_BENCH)('engine speed (measure only)', () => {
  it('prints the table', async () => {
    // record every (state, action, by) the replay sends (the state handed to apply(); apply never writes it)
    const calls: [any, any, string][] = []; const act0 = Rec.prototype.act;
    Rec.prototype.act = function (a: any, by = 'host') { calls.push([this.g, a, by]); return act0.call(this, a, by); };
    const sc = SCENARIOS.find((s) => s.name === 'proving-4v10-boss')!; let rec: any;
    const tRec = time(() => { rec = sc.run(); });
    Rec.prototype.act = act0;
    const fight = calls.filter(([g, a]) => g.phase === 'combat' && String(a.type).startsWith('combat/'));
    const out: string[] = [];
    out.push('scenario proving-4v10-boss: ' + calls.length + ' actions (' + fight.length + ' in the fight), whole replay ' + ms(tRec) + ' (policies included)');
    out.push('state size (JSON chars, mid-fight): ' + JSON.stringify(fight[Math.floor(fight.length / 2)][0]).length);
    // 1. apply per action
    const sample = fight.filter((_, i) => i % 3 === 0);
    for (const [g, a, by] of sample) { try { apply(g, a, by); } catch { /* refusals count */ } } // warm
    let tA = 0; for (const [g, a, by] of sample) tA += time(() => { try { apply(g, a, by); } catch { /* */ } }, 5);
    out.push('apply() per fight action: ' + ms(tA / sample.length) + ' (sum over ' + sample.length + ' actions of the fastest of 5, divided by their number)');
    { const byType: Record<string, [number, number]> = {}; for (const [g, a, by] of sample) { const t = time(() => { try { apply(g, a, by); } catch { /* */ } }, 3); const e = (byType[a.type] ||= [0, 0]); e[0] += t; e[1]++; }
      out.push('  by type: ' + Object.entries(byType).map(([k, [t, n]]) => k + ' ' + ms(t / n) + ' ×' + n).join('; ')); }
    // a CPU profile of the sampled applies (BENCH_PROFILE=<file.cpuprofile>): where the time goes
    if (env.BENCH_PROFILE) {
      const { Session } = await import('node:inspector'); const s = new Session(); s.connect();
      const post = (m: string, p: any = {}) => new Promise<any>((res, rej) => s.post(m, p, (e: any, r: any) => (e ? rej(e) : res(r))));
      await post('Profiler.enable'); await post('Profiler.setSamplingInterval', { interval: 200 }); await post('Profiler.start');
      for (let i = 0; i < 3; i++) for (const [g, a, by] of sample) { try { apply(g, a, by); } catch { /* */ } }
      const { profile } = await post('Profiler.stop'); writeFileSync(env.BENCH_PROFILE, JSON.stringify(profile)); s.disconnect();
    }
    // 2. the working copy alone (what apply copies: the state less campaign and archive)
    const slim = (g: any) => { const s: any = {}; for (const k of Object.keys(g)) if (k !== 'campaign' && k !== 'archive') s[k] = g[k]; return s; };
    let tC = 0; for (const [g] of sample) tC += time(() => JSON.parse(JSON.stringify(slim(g))), 5);
    out.push('JSON clone of the state (the old working copy): ' + ms(tC / sample.length));
    let tS = 0; for (const [g] of sample) tS += time(() => structuredClone(slim(g)), 5);
    out.push('structuredClone of the state (comparison): ' + ms(tS / sample.length));
    // 3. the per-action migration pass (on a copy, so the stamps are as apply finds them)
    let tM = 0; for (const [g] of sample) { const cs = Object.values(JSON.parse(JSON.stringify(g.characters))) as any[]; tM += time(() => { for (const c of cs) { migrateCharacterSigils(c); migrateCharacterSoul(c); migrateCharacterClass(c); migrateCharacterFocus(c); migrateCharacterFaith(c); migrateCharacterItems(c); migrateCharacterMp(c); migrateCharacterFigments(c); migrateCharacterPerks(c); migrateCharacterHp(c); } }, 5); }
    out.push('the per-action migration pass (every sheet): ' + ms(tM / sample.length));
    // 4. migrateLoaded per call (a guest's every view)
    let tL = 0; for (const [g] of sample) { const x = JSON.parse(JSON.stringify(g)); tL += time(() => migrateLoaded(x), 5); }
    out.push('migrateLoaded per call: ' + ms(tL / sample.length));
    // 5. previews
    let tP = 0; for (const [g, a, by] of sample) tP += time(() => previewAction(g, a, by), 3);
    out.push('previewAction per call: ' + ms(tP / sample.length));
    let tF = 0; for (const [g, a] of sample) { const cb = g.combat; tF += time(() => preview(g, cb, () => 0), 5); }
    out.push('preview() (fight copy + shadow game) per call: ' + ms(tF / sample.length));
    // 6. a Survival run
    if (!env.BENCH_NO_RUN) { let r: any; const tR = time(() => { r = simRun({ party: 'four', route: 'gear', seed: 'BENCH-1', maxStages: 2 }); }); out.push('simRun four gear BENCH-1 2 stages: ' + (tR / 1000).toFixed(2) + ' s (' + r.fights.length + ' fights, ended ' + r.how + ' ' + r.stage + '.' + r.depth + ')'); }
    console.log('\n' + out.join('\n') + '\n');
    if (env.BENCH_OUT) appendFileSync(env.BENCH_OUT, (env.BENCH_LABEL || 'run') + '\n' + out.join('\n') + '\n\n');
    void rec;
  }, 3_600_000);
});
