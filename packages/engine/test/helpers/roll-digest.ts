// @ts-nocheck (a tool: it writes files)
// THE ROLL DIGEST (engine foundations 1): proof that a refactor rolls the same dice, in the same order, in every test
// of the suite. It is a migration tool, not part of `npm run check`: a digest is only comparable between two runs of
// the SAME tests, so it is recorded just before a refactor and compared just after.
//
//   cd packages/engine
//   ROLL_DIGEST=record  npx vitest run --config vitest.digest.config.ts     # before: writes .check/roll-digest/*.json
//   … refactor …
//   ROLL_DIGEST=compare npx vitest run --config vitest.digest.config.ts     # after: a test whose dice moved FAILS and is named
//
// For every test it keeps how many dice were rolled and a hash of each (sides, value) in order (src/rng.ts ROLL_TAP).
// A test that rolls the same dice and still passes its own assertions has not changed what it pins.
import { afterAll, afterEach, beforeEach, expect } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROLL_TAP } from '../../src/rng';

const MODE = process.env.ROLL_DIGEST;
if (MODE === 'record' || MODE === 'compare') {
  const dir = fileURLToPath(new URL('../../../../.check/roll-digest/', import.meta.url));
  let n = 0, h = 2166136261; const got: Record<string, string> = {}; let file = '';
  ROLL_TAP.f = (sides, v) => { n++; h = Math.imul(h ^ (sides * 131 + v), 16777619); };
  beforeEach((ctx) => { n = 0; h = 2166136261; file = ctx.task.file?.name || file; });
  afterEach((ctx) => { let name = ctx.task.name, p = ctx.task.suite; while (p && p.name) { name = p.name + ' > ' + name; p = p.suite; } let k = name, i = 2; while (k in got) k = name + ' #' + i++; got[k] = n + ':' + (h >>> 0).toString(36); });
  afterAll(() => {
    if (!file) return;
    const path = dir + file.replace(/[^a-zA-Z0-9.-]+/g, '_') + '.json';
    if (MODE === 'record') { mkdirSync(dir, { recursive: true }); writeFileSync(path, JSON.stringify(got, null, 1)); return; }
    if (!existsSync(path)) return; // a test file added since the record
    const want = JSON.parse(readFileSync(path, 'utf8'));
    const moved = Object.keys(want).filter((k) => k in got && got[k] !== want[k]).map((k) => k + '   dice ' + want[k] + ' -> ' + got[k]);
    if (moved.length) expect.fail('ROLL DIGEST: ' + moved.length + ' test(s) of ' + file + ' roll different dice than before the change:\n  ' + moved.slice(0, 40).join('\n  '));
  });
}
