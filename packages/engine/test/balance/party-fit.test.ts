// @ts-nocheck (a measuring tool)
// The party fit's measure (party-fit.ts; docs/design/proposals/2026-11-party-fit.md). Opt-in: PARTY_FIT=1 plays the
// cells named in PF_CELLS (a comma list; default every cell) on PF_SEEDS seeds (default 24, from PF_FROM, named
// PF-<n>) under the lever PF_LEVER (none, perhead, focus, smallmap) and writes every run to PF_OUT (JSON).
//   PARTY_FIT=1 PF_CELLS=solo_bulwark PF_SEEDS=24 PF_OUT=x.json npx vitest run --root packages/engine test/balance/party-fit.test.ts
import { describe, it } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import { partyRun, CELLS, report } from './party-fit';

const env = (globalThis as any).process?.env || {};
describe.runIf(env.PARTY_FIT)('the party fit: stage 1, every cell', () => {
  it('plays and writes', () => {
    const cells = env.PF_CELLS ? String(env.PF_CELLS).split(',') : Object.keys(CELLS), seeds = Number(env.PF_SEEDS || 24), from = Number(env.PF_FROM || 1), lever = env.PF_LEVER || 'none', out: any[] = [];
    for (const cell of cells) for (let i = from; i < from + seeds; i++) {
      const t = Date.now(), r = partyRun(cell, 'PF-' + i, lever); out.push({ ...r, ms: Date.now() - t });
      (globalThis as any).console.log(cell + ' ' + lever + ' PF-' + i + ' ' + (r.cleared ? 'CLEAR' : r.how + ' @' + r.depth) + ' fights ' + r.fights.length + ' err ' + r.errors + ' ' + (Date.now() - t) + 'ms ' + (r.err || []).join(' || '));
      if (env.PF_OUT) writeFileSync(env.PF_OUT, JSON.stringify(out));
    }
  }, 48 * 3600_000);
});

describe.runIf(env.PF_REPORT)('the party fit: the tables', () => {
  it('reads the runs and prints the tables', () => {
    const runs = String(env.PF_REPORT).split(',').flatMap((f) => JSON.parse(readFileSync(f, 'utf8')));
    const text = report(runs); if (env.PF_REPORT_OUT) writeFileSync(env.PF_REPORT_OUT, text); else (globalThis as any).console.log(text);
  });
});
