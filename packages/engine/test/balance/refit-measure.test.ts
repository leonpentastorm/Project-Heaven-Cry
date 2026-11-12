// @ts-nocheck (a measuring tool)
// THE RE-FIT MEASUREMENTS (balance pass stage b, rules 1.26; docs/design/handoffs/balance-refit.md). Skipped unless asked for:
//
//   REFIT_MEASURE=1 npx vitest run --root packages/engine test/balance/refit-measure.test.ts --silent=false
//     REFIT_N=12                  fights a cell (default 12)
//     REFIT_LEVELS=1,5,10,20      levels (default 1,5,10,20)
//     REFIT_VARIANTS=normal,allin
//     REFIT_SYSTEMS=gun,blade     only these rows (refit-measure.ts SYSTEMS)
//     REFIT_OUT=<file.json>       also writes the numbers there
//   REFIT_CLUSTER=1 ...             the many-targets yardstick instead: how many enemies a shape catches (refit-measure.ts cluster)
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { measure, yardOf, cluster, R_LEVELS, SYSTEMS } from './refit-measure';

const ON = !!process.env.REFIT_MEASURE, N = Math.max(1, Number(process.env.REFIT_N) || 12);
const LEVELS = (process.env.REFIT_LEVELS || R_LEVELS.join(',')).split(',').map(Number), VARIANTS = (process.env.REFIT_VARIANTS || 'normal,allin').split(',');
const WHICH = process.env.REFIT_SYSTEMS ? process.env.REFIT_SYSTEMS.split(',') : SYSTEMS;

describe('the re-fit measurements', () => {
  (ON ? it : it.skip)('every system with a ceiling, as a percent of the normal-share plain rifle', () => {
    const res: any = {}; let errors = 0;
    for (const lv of LEVELS) { const yard = yardOf(lv, N); for (const v of VARIANTS) { const t = Date.now(); const r = measure(lv, v, N, WHICH, yard); res[lv + ':' + v] = r; errors += r.errors; console.log('[refit] L' + lv + ' ' + v + ' (' + (Date.now() - t) + ' ms) ' + JSON.stringify(r)); } }
    const cols = LEVELS.flatMap((l) => VARIANTS.map((v) => l + ':' + v));
    let md = '| System | ' + cols.map((c) => 'L' + c.replace(':', ' ')).join(' | ') + ' |\n|---|' + cols.map(() => '---').join('|') + '|\n';
    for (const s of WHICH) md += '| ' + s + ' | ' + cols.map((c) => res[c][s] ?? '–').join(' | ') + ' |\n';
    console.log(md);
    if (process.env.REFIT_OUT) writeFileSync(process.env.REFIT_OUT, JSON.stringify(res, null, 1) + '\n');
    expect(errors).toBe(0);
  }, 7200000);
  (process.env.REFIT_CLUSTER ? it : it.skip)('the cluster: enemies within 1, 2 and 3 tiles of an enemy, a chain\'s second', () => {
    for (const lv of (process.env.REFIT_LEVELS || '1,6,12').split(',').map(Number)) for (const map of ['open', 'cover']) console.log('[cluster] L' + lv + ' ' + map + ' ' + JSON.stringify(cluster(lv, N, 'standard', map as any)));
  }, 3600000);
});
