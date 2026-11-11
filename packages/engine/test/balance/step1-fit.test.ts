// @ts-nocheck (a measuring tool)
// The fit of the enemy table (rules 1.15) against the targets: see fit.ts for how to run it. In `npm run check` only
// the quick test below runs (one fight of each kind at one level).
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitLevel, fitLine, fitCards, useTable, tableNow } from './fit';
import { LEVELS } from './builds';

const OUT = process.env.BALANCE_FIT_OUT, TABLE = process.env.BALANCE_FIT_TABLE;
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'), fromRepo = (p: string) => (p.startsWith('/') ? p : resolve(REPO, p));

describe('the fit of the enemy table', () => {
  (TABLE ? it.skip : it)('the table holds the yardstick targets at every reference level (rules 1.15, the fitted table)', () => {
    // the plain rifleman with a normal share against an enemy of its own level: hits that land to kill, and the chance to hit
    for (const lv of LEVELS) { const c = fitCards(lv);
      expect(c.vermin.hitsToKill, 'Vermin, level ' + lv).toBe(1);
      expect(c.minion.hitsToKill, 'Minion, level ' + lv).toBe(2);
      expect(c.soldier.hitsToKill, 'Soldier, level ' + lv).toBe(4); expect(c.soldier.hitsToKillExact).toBeGreaterThanOrEqual(3.5);
      expect(c.elite.hitsToKillExact, 'Elite, level ' + lv).toBeGreaterThan(6); expect(c.elite.hitsToKill).toBeLessThanOrEqual(8);
      expect(c.boss.hitsToKill, 'Boss, level ' + lv).toBeGreaterThanOrEqual(20);
      expect(c.soldier.yardPct, 'the chance to hit a Soldier, level ' + lv).toBe(65);
      expect(c.soldier.foePct, 'a Soldier\'s chance to hit the yardstick, level ' + lv).toBe(65);
    }
  });
  (OUT ? it.skip : it)('quick run: every measurement of the fit builds (one fight each, level 6)', () => {
    const o = fitLevel(6, 1), line = fitLine(o);
    expect(line).not.toMatch(/undefined|NaN/);
    expect(line).toMatch(/errors 0$/);
    expect(o.squads.length).toBe(6); expect(o.fire.length).toBe(4);
    expect(o.gap.below5.maxHitsToKill).toBe(1); // Outclassed: 5 levels below, one hit
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
