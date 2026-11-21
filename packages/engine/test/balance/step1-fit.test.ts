// @ts-nocheck (a measuring tool)
// The enemy table (rules 1.15) on the measuring range: see fit.ts for how to run it. Nothing here runs in `npm run check`.
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitLevel, fitLine, fitCards, useTable, tableNow } from './fit';
import { LEVELS } from './builds';

const OUT = process.env.BALANCE_FIT_OUT, TABLE = process.env.BALANCE_FIT_TABLE;
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'), fromRepo = (p: string) => (p.startsWith('/') ? p : resolve(REPO, p));

// The "quick run" smoke fights play whole simulated fights and assert only that they build: `npm run balance` runs them
// (vitest.balance.config.ts sets BALANCE_QUICK); the engine's default run leaves them out. test/suite-shape.test.ts.
const QUICK_RUN = !!process.env.BALANCE_QUICK;
const MEASURE = !!process.env.BALANCE_MEASURE;
describe('the fit of the enemy table', () => {
  // Rules 1.94 (Leon, 21 Nov 2026): the hit counts the table was once fitted to are not limits; they are printed
  // (BALANCE_MEASURE=1, or `npm run balance`). The 5-levels-below rule is asserted where it is played (combat).
  (MEASURE && !TABLE ? it : it.skip)('the plain rifleman against an enemy of its own level at every reference level: hits to kill and the chances to hit, printed', () => {
    const rows: string[] = [];
    for (const lv of LEVELS) { const c = fitCards(lv);
      rows.push('L' + lv + ': hits to kill Vermin ' + c.vermin.hitsToKill + ', Minion ' + c.minion.hitsToKill + ', Soldier ' + c.soldier.hitsToKill + ' (' + c.soldier.hitsToKillExact + '), Elite ' + c.elite.hitsToKill + ' (' + c.elite.hitsToKillExact + '), Boss ' + c.boss.hitsToKill
        + ' · the rifleman hits a Soldier ' + c.soldier.yardPct + '%, a Soldier hits him ' + c.soldier.foePct + '%'); }
    console.info('[fit] ' + rows.join('\n[fit] '));
  });
  (QUICK_RUN && !OUT ? it : it.skip)('quick run: every measurement of the fit builds (one fight each, level 6)', () => {
    const o = fitLevel(6, 1), line = fitLine(o);
    expect(line).not.toMatch(/undefined|NaN/);
    expect(line).toMatch(/errors 0$/);
    expect(o.squads.length).toBe(6); expect(o.fire.length).toBe(4);
    expect(o.gap.below5.maxHitsToKill).toBeGreaterThan(1); // 5 levels below: Soldiers go in one hit, the fight's Elite does not (never an Elite or a Boss)
  }, 120000);
  (OUT ? it : it.skip)('full run: the levels asked for, written as JSON', () => {
    if (TABLE) useTable(JSON.parse(readFileSync(fromRepo(TABLE), 'utf8')));
    const levels = (process.env.BALANCE_FIT_LEVELS || '1,3,6,9,12,20').split(',').map(Number), n = Math.max(1, Number(process.env.BALANCE_FIT_N) || 10), tag = process.env.BALANCE_FIT_TAG || 'fit';
    const dir = fromRepo(OUT!); mkdirSync(dir, { recursive: true });
    const res = levels.map((lv) => fitLevel(lv, n, (s) => console.log('[fit] ' + s)));
    const file = resolve(dir, 'fit-' + tag + '-L' + levels.join('_') + '.json');
    writeFileSync(file, JSON.stringify({ tag, n, table: tableNow(), levels: res }, null, 1) + '\n');
    writeFileSync(file.replace(/\.json$/, '.txt'), res.map(fitLine).join('\n') + '\n');
    console.log(res.map(fitLine).join('\n'));
  }, 7200000);
});
