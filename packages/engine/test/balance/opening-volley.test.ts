// @ts-nocheck (a measuring tool)
// The opening volley's measure (opening-volley.ts; docs/design/proposals/2026-11-party-fit.md, "The opening volley").
// Opt-in. OV_ROWS=1: one enemy turn of every stage-1 row on each stance (OV_N seeds, default 200), written to OV_OUT.
// OPENING=1: Survival's stage 1 for OV_CELLS (comma list) on OV_SEEDS seeds (default 40, PF-<n>) under OV_LEVER
// (none, cover), written to OV_OUT; OV_REPORT=a.json,b.json prints the tables (OV_REPORT_OUT: to a file).
//   OPENING=1 OV_CELLS=solo_skirmisher OV_SEEDS=4 OV_OUT=x.json npx vitest run --root packages/engine test/balance/opening-volley.test.ts
import { describe, it } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import { rowTurn, stageOneRows, openingRun, runReport, caseLog } from './opening-volley';

const env = (globalThis as any).process?.env || {};
const log = (s: string) => (globalThis as any).console.log(s);
describe.runIf(env.OV_ROWS)('the opening volley: one enemy turn of each stage-1 row', () => {
  it('plays and writes', () => {
    const n = Number(env.OV_N || 200), out: any[] = [], stances = String(env.OV_STANCES || 'open,half,full_beside,full_line').split(','), count = Number(env.OV_COUNT || 1), only = env.OV_ONLY ? String(env.OV_ONLY).split(',') : null;
    for (const r of stageOneRows()) for (const s of stances) { if (only && !only.includes(r.label)) continue; if (r.kind !== 'gun' && s !== 'open') continue; const o = rowTurn(r.row, s, n, { armour: env.OV_ARMOUR != null ? Number(env.OV_ARMOUR) : undefined, pc: env.OV_PC ? JSON.parse(env.OV_PC) : undefined, count }); out.push({ ...r, stance: s, ...o }); log(r.label + ' ' + s + ' ' + JSON.stringify(o)); if (env.OV_OUT) writeFileSync(env.OV_OUT, JSON.stringify(out)); }
  }, 48 * 3600_000);
});
describe.runIf(env.OPENING)('the opening volley: stage 1 runs', () => {
  it('plays and writes', () => {
    const cells = String(env.OV_CELLS || 'solo_skirmisher').split(','), seeds = Number(env.OV_SEEDS || 40), from = Number(env.OV_FROM || 1), lever = env.OV_LEVER || 'none', out: any[] = [];
    for (const cell of cells) for (let i = from; i < from + seeds; i++) {
      const t = Date.now(), r = openingRun(cell, 'PF-' + i, lever); out.push(r);
      log(cell + ' ' + lever + ' PF-' + i + ' ' + (r.cleared ? 'CLEAR' : r.how) + ' fights ' + r.fights.length + ' ' + (Date.now() - t) + 'ms');
      if (env.OV_OUT) writeFileSync(env.OV_OUT, JSON.stringify(out));
    }
  }, 48 * 3600_000);
});
describe.runIf(env.OV_REPORT)('the opening volley: the tables', () => {
  it('prints', () => { const runs = String(env.OV_REPORT).split(',').flatMap((f) => JSON.parse(readFileSync(f, 'utf8'))); const t = runReport(runs); if (env.OV_REPORT_OUT) writeFileSync(env.OV_REPORT_OUT, t); else log(t); });
});
// OV_CASE=<tier>:<weapon>:<stance>[:<seed index>]: the fight log of one staged case (the reproduction quoted in the doc)
describe.runIf(env.OV_CASE)('the opening volley: one case, its log', () => {
  it('prints', () => { const [tier, weapon, stance, i] = String(env.OV_CASE).split(':'); log(caseLog({ tier, weapon }, stance, Number(i || 0)).join('\n')); });
});
