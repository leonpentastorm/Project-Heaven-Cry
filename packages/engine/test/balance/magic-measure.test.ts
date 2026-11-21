// @ts-nocheck (a measuring tool)
// THE MAGIC MEASUREMENTS (rules 1.17; docs/design/handoffs/damage-step-magic.md). What a Sigil Line of 2, 3 and 4
// glyphs and an Outburst at each stage are worth against the plain rifle, on the simulator's shooting range.
//
//   npm run check -- engine                the Elite and Boss guard (3 seeded fights, level 6)
//   BALANCE_MEASURE=1 (or npm run balance)  also prints the level-6 patterns (3 seeded fights a pattern)
//   MAGIC_MEASURE=1 npx vitest run --root packages/engine test/balance/magic-measure.test.ts --silent=false
//                                          the full tables, printed (levels 1, 3, 6, 9, 12, 20; normal share and all in)
//   MAGIC_MEASURE_N=20                     fights a row (default 10)
//   MAGIC_MEASURE_LEVELS=6,12              only these levels
//   MAGIC_MEASURE_OUT=<folder>             also writes magic-measure-<tag>.json and .md there (MAGIC_MEASURE_TAG, default "now")
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureLevel, sigilVsTiers, table, line, M_LEVELS, rifle, pattern } from './magic-measure';

const FULL = !!process.env.MAGIC_MEASURE, OUT = process.env.MAGIC_MEASURE_OUT, TAG = process.env.MAGIC_MEASURE_TAG || 'now';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'), fromRepo = (p: string) => (p.startsWith('/') ? p : resolve(REPO, p));

// A few seeded fights at level 6 with a normal share, printed (BALANCE_MEASURE=1, or `npm run balance`): rules 1.94
// withdrew the lines these were once held to (Leon, 21 Nov 2026). The Elite and Boss guard is a rule a player sees
// (rules 1.15 item 4, 1.17) and stays asserted in the default run.
const MEASURE = !!process.env.BALANCE_MEASURE;
describe('magic on the range (rules 1.17), reported', () => {
  const N = 3, y = MEASURE ? rifle(6, N) : 0;
  const sig = (g: number) => pattern(g + ' glyphs', 'sigil', 'normal', 6, N, { glyphs: g }, /^Evoke /, y);
  (MEASURE ? it : it.skip)('Sigil: a 2-glyph and a full Line against the plain rifle over the same turns, printed', () => {
    const two = sig(2), four = sig(4);
    expect(four.errors + two.errors).toBe(0);
    console.info('[magic] L6 normal: a 4-glyph Line ' + four.pctRifle + '% of the rifle (' + four.perCast + ' a cast), a 2-glyph Line ' + two.pctRifle + '% (' + two.perCast + ' a cast)');
  }, 120000);
  it('Sigil: an Elite and a Boss of the caster\'s level are never taken out by one Evoke (the Elite and Boss guard)', () => {
    const t = sigilVsTiers(6, 'normal', 3);
    expect(t.elite.biggest).toBeLessThan(t.elite.hp); expect(t.boss.biggest).toBeLessThan(t.boss.hp);
    if (MEASURE) console.info('[magic] Evokes to kill at the average: Elite ' + t.elite.castsToKillAvg + ', Boss ' + t.boss.castsToKillAvg);
  }, 120000);
  (MEASURE ? it : it.skip)('Outburst at a normal share: steady play, a new caster and the biggest Release against the plain rifle, printed', () => {
    const steady = pattern('steady', 'outburst', 'normal', 6, N, { feelings: 'early' }, /^Release /, y);
    const fresh = pattern('steady, a new caster', 'outburst', 'normal', 6, N, null, /^Release /, y);
    // Rules 1.19: one free Pump a turn, so the biggest Release takes the whole turn (Begin 2, four Pumps with one free, Release 1): a
    // caster that has to step into reach first lets it go on turn 2, and the percent is then over both turns (as the full run does).
    const peak1 = pattern('peak', 'outburst', 'normal', 6, N * 10, { feel: true, feelings: 'all' }, /^Release /, y, 'sim_range_soldier', 1);
    const peak = peak1.casts ? peak1 : pattern('peak', 'outburst', 'normal', 6, N * 10, { feel: true, feelings: 'all' }, /^Release /, y, 'sim_range_soldier', 2);
    expect(steady.errors + fresh.errors + peak.errors).toBe(0);
    console.info('[magic] L6 normal: steady ' + steady.pctRifle + '% fresh ' + fresh.pctRifle + '% peak ' + peak.pctRifle + '% (' + peak.perCast + ' a cast vs ' + steady.perCast + ')');
  }, 120000);
});

describe('the magic measurements', () => {
  (FULL ? it : it.skip)('full run: Sigil by Line length and Outburst by stage, against the plain rifle', () => {
    const levels = (process.env.MAGIC_MEASURE_LEVELS || M_LEVELS.join(',')).split(',').map(Number), n = Math.max(1, Number(process.env.MAGIC_MEASURE_N) || 10);
    const variants = (process.env.MAGIC_MEASURE_VARIANTS || 'normal,allin').split(',');
    const all: any = { n, levels, runs: [], tiers: [] }; let md = '';
    for (const v of variants) {
      const runs = levels.map((lv) => measureLevel(lv, v, n, (s) => console.log('[magic] ' + s)));
      all.runs.push(...runs);
      const head = levels.map((l) => 'Level ' + l);
      md += '\n**' + (v === 'normal' ? 'Normal share' : 'All in') + '.** Plain rifle (normal share), damage a turn: ' + runs.map((r) => 'L' + r.level + ' ' + Math.round(r.rifle.normal * 10) / 10).join(' · ')
        + (v === 'allin' ? '; all-in rifle: ' + runs.map((r) => 'L' + r.level + ' ' + Math.round(r.rifle.allin * 10) / 10).join(' · ') : '') + '\n\n';
      md += 'Sigil. Each cell: damage of one Evoke (misses counted) · turns it took · AP · **percent of the rifle over the same turns**\n\n' + table(runs[0].sigil.map((_: any, i: number) => runs.map((r) => r.sigil[i])), head);
      md += '\nOutburst. Each cell: damage of one Release (misses counted) · turns · AP · Strain added · **percent of the rifle over the same turns**\n\n' + table(runs[0].outburst.map((_: any, i: number) => runs.map((r) => r.outburst[i])), head);
      if (v === 'allin') md += '\nAll in, against the all-in rifle: Sigil ' + runs.map((r) => 'L' + r.level + ' ' + r.sigil.map((x: any) => x.pctOwnRifle + '%').join('/')).join(' · ') + '; Outburst steady (new caster) ' + runs.map((r) => 'L' + r.level + ' ' + r.outburst[6].pctOwnRifle + '%').join(' · ') + '; the peak ' + runs.map((r) => 'L' + r.level + ' ' + r.outburst[9].pctOwnRifle + '%').join(' · ') + '\n';
    }
    md += '\n**The biggest 4-glyph Evoke against each tier at the caster\'s level** (normal share; the best seen, a critical included when one fell). Each cell: the tier\'s HP · the biggest Evoke · the average Evoke · Evokes to kill at the average\n\n| Level | Minion | Soldier | Elite | Boss |\n|---|---|---|---|---|\n';
    for (const lv of levels) { const t = sigilVsTiers(lv, 'normal', Math.max(4, Math.floor(n / 2))); all.tiers.push(t); console.log('[magic] tiers L' + lv + ' ' + JSON.stringify(t));
      md += '| ' + lv + ' | ' + ['minion', 'soldier', 'elite', 'boss'].map((k) => t[k].hp + ' · ' + t[k].biggest + ' · ' + t[k].avgCast + ' · ' + (t[k].castsToKillAvg ?? '–')).join(' | ') + ' |\n'; }
    console.log(md);
    if (OUT) { const dir = fromRepo(OUT); mkdirSync(dir, { recursive: true }); writeFileSync(resolve(dir, 'magic-measure-' + TAG + '.json'), JSON.stringify(all, null, 1) + '\n'); writeFileSync(resolve(dir, 'magic-measure-' + TAG + '.md'), md); }
    expect(all.runs.flatMap((r: any) => [...r.sigil, ...r.outburst]).reduce((e: number, r: any) => e + r.errors, 0)).toBe(0);
  }, 7200000);
});
void line; void rifle; void pattern;
