// @ts-nocheck (reads files with node)
// WHAT `npm run check` RUNS OF THE BALANCE SIMULATOR (docs/TESTING.md).
// Rules 1.94 (Leon, 21 Nov 2026): the balance lines are withdrawn. The measuring tools of test/balance/ read and PRINT
// (percent of a plain rifle's turn, and the like); nothing is fitted to them and no test fails on a number they read.
// The engine's default run keeps what is not a line: the simulator is deterministic and legal, matches previewAttack,
// a run plays clean, the Elite and Boss guard. The readings wait for BALANCE_MEASURE (`npm run balance` sets it, with
// BALANCE_QUICK for the "quick run" smoke fights).
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const pkg = JSON.parse(readFileSync(at('../package.json'), 'utf8'));

describe('the engine\'s default test run and the balance simulator', () => {
  it('`npm test` runs the whole of test/ (the balance folder\'s tests that are not readings included)', () => {
    expect(pkg.scripts.test).toBe('vitest run');
  });
  it('`npm run balance` runs the folder with the readings and the smoke fights switched on (its own config sets BALANCE_MEASURE and BALANCE_QUICK)', () => {
    expect(pkg.scripts.balance).toContain('--config vitest.balance.config.ts');
    const cfg = readFileSync(at('../vitest.balance.config.ts'), 'utf8');
    expect(cfg).toMatch(/BALANCE_QUICK: '1'/); expect(cfg).toMatch(/BALANCE_MEASURE: '1'/);
    expect(readFileSync(at('../vitest.config.ts'), 'utf8')).not.toMatch(/BALANCE_MEASURE: |BALANCE_QUICK: /);
  });
  it('the smoke switch is read in one way only, and only the "quick run" smoke fights wait for it', () => {
    const gated: string[] = [];
    for (const f of readdirSync(at('./balance')).filter((x) => x.endsWith('.test.ts'))) {
      const src = readFileSync(at('./balance/' + f), 'utf8');
      for (const m of src.matchAll(/\(([^()\n]*QUICK_RUN[^()\n]*)\)\('([^']*)'/g)) gated.push(f + ': ' + m[2]);
      if (/BALANCE_QUICK/.test(src)) expect(src, f).toMatch(/const QUICK_RUN = !!process\.env\.BALANCE_QUICK;/);
    }
    for (const g of gated) expect(g).toMatch(/: quick run: /);
  });
});
