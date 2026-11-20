// @ts-nocheck (a measuring tool)
// THE CALLS MEASURE (calls-measure.ts): opt-in. CALLS_MEASURE=1 plays every Call (or CALLS_IDS, a comma list) at 1, 4
// and 8 points (CALLS_PTS) with CALLS_N fights a cell (default 40) and prints the table; CALLS_OUT also writes it.
//   CALLS_MEASURE=1 CALLS_N=40 npx vitest run --root packages/engine test/balance/calls-measure.test.ts --silent=false
import { describe, it, expect } from 'vitest';
import { appendFileSync } from 'node:fs';
import { callRow, callLine, CALL_HEAD, CALL_IDS } from './calls-measure';
import { CALL } from '../../src';

const env = (globalThis as any).process?.env || {};
const N = Math.max(1, Number(env.CALLS_N) || 40), IDS = env.CALLS_IDS ? String(env.CALLS_IDS).split(',') : CALL_IDS, PTS = String(env.CALLS_PTS || '1,4,8').split(',').map(Number);
const say = (s: string) => { (globalThis as any).console.log(s); if (env.CALLS_OUT) appendFileSync(env.CALLS_OUT, s + '\n'); };

describe.runIf(env.CALLS_MEASURE)('the Calls measure', () => {
  it('plays every Call at its steps and prints the table', () => {
    let errors = 0;
    // CALLS_SET (in memory, put back after): a step's numbers tried, e.g. "call.rally@0=ap:3;call.brief@1=first:2,second:2"
    const back: (() => void)[] = [];
    for (const q of String(env.CALLS_SET || '').split(';').filter(Boolean)) {
      const [lhs, rhs] = q.split('='), [id, st] = lhs.split('@'), nums: any = (CALL as any)[id].steps[Number(st)].numbers;
      for (const kv of rhs.split(',')) { const [k, v] = kv.split(':'), was = nums[k]; nums[k] = Number(v); back.push(() => { nums[k] = was; }); }
    }
    if (env.CALLS_SET) say('\nIn memory: ' + env.CALLS_SET);
    try {
    say('\n### The Calls (the leader at level 3 beside two plain rifles, the standard fight, ground with cover, ' + N + ' fights a cell)\n\n' + CALL_HEAD);
    if (!env.CALLS_IDS) { const r = callRow(null, 1, N); errors += r.errors; say(callLine(r)); }
    for (const id of IDS) for (const p of PTS) { const r = callRow(id, p, N); errors += r.errors; say(callLine(r)); }
    } finally { for (const f of back.reverse()) f(); }
    expect(errors).toBe(0);
  }, 6 * 3600_000);
});
