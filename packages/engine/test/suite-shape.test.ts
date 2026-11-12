// @ts-nocheck (reads files with node)
// WHAT `npm run check` RUNS OF THE BALANCE SIMULATOR (docs/TESTING.md).
// The balance targets (a Line at 150 to 200% of the rifle, Triage at 40 to 55% of a Soldier-turn, the Boss's HP in
// hits, the fitted enemy table, the price list…) assert the spec's numbers. They are part of the engine's default run,
// so a number changed in data/ fails a plain `npm run check`. The only tests of test/balance/ left out of it are the
// "quick run" smoke fights (whole simulated fights that assert only "it builds": about 40% of the folder's time), which
// `npm run balance` adds, and the report writers behind their own switches (HEAL_MEASURE=1 and the like).
// This file fails if someone takes the folder out of the default run again, or parks a target behind the smoke switch.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const pkg = JSON.parse(readFileSync(at('../package.json'), 'utf8'));

describe('the engine\'s default test run and the balance simulator', () => {
  it('`npm test` runs the whole of test/, the balance folder included', () => {
    expect(pkg.scripts.test).toBe('vitest run');
  });
  it('`npm run balance` runs the folder with the smoke fights switched on (its own config sets BALANCE_QUICK)', () => {
    expect(pkg.scripts.balance).toContain('--config vitest.balance.config.ts');
    expect(readFileSync(at('../vitest.balance.config.ts'), 'utf8')).toMatch(/BALANCE_QUICK: '1'/);
  });
  it('only the "quick run" smoke fights wait for BALANCE_QUICK: three tests, and no target among them', () => {
    const gated: string[] = [];
    for (const f of readdirSync(at('./balance')).filter((x) => x.endsWith('.test.ts'))) {
      const src = readFileSync(at('./balance/' + f), 'utf8');
      // a test is behind the switch when its `it` is chosen by an expression that names QUICK_RUN
      for (const m of src.matchAll(/\(([^()\n]*QUICK_RUN[^()\n]*)\)\('([^']*)'/g)) gated.push(f + ': ' + m[2]);
      // and the switch is read in one way only
      if (/BALANCE_QUICK/.test(src)) expect(src, f).toMatch(/const QUICK_RUN = !!process\.env\.BALANCE_QUICK;/);
    }
    expect(gated.length).toBe(3);
    for (const g of gated) expect(g).toMatch(/: quick run: /);
  });
});
