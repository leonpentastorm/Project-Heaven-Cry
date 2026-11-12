// @ts-nocheck (a measuring tool)
// THE FAITH MEASUREMENTS (rules 1.21; docs/design/handoffs/faith-fit.md). What a character who leads with prayer is
// worth, patron by patron, against the plain rifle on the simulator's shooting range.
//
//   npm run check -- engine     the cheap tests below (a few seeded fights at level 6: seconds)
//   FAITH_MEASURE=1 npx vitest run --root packages/engine test/balance/faith-measure.test.ts --silent=false
//     FAITH_MEASURE_PARTS=sheets,yard,inventory,rows,support,dabbler,miracle,limits   which parts (default: all)
//     FAITH_MEASURE_N=8                 fights a row (default 8)
//     FAITH_MEASURE_LEVELS=6,12         levels (default 1,3,6,9,12,20)
//     FAITH_MEASURE_VARIANTS=normal     (default normal,allin)
//     FAITH_MEASURE_PATRONS=old_overcast,nerukhan
import { describe, it, expect } from 'vitest';
import { F_LEVELS, PATRON_IDS, DEVOTION_BY_LEVEL, SESSION_AT, SOLDIER_TURN, faithBuild, dabblerBuild, faithSheet, rifleTurn, prayerRow, fline, soldierTurn, inventory, supportWorth } from './faith-measure';
import { prayerHarms } from './policies';
import { FAITH_PATRON, WHISPER, DEVOTION_XP, TAG_CAPS } from '../../src';

const ON = !!process.env.FAITH_MEASURE, PARTS = (process.env.FAITH_MEASURE_PARTS || 'sheets,yard,inventory,rows,support,dabbler,miracle,limits').split(',');
const N = Math.max(1, Number(process.env.FAITH_MEASURE_N) || 8), LEVELS = (process.env.FAITH_MEASURE_LEVELS || F_LEVELS.join(',')).split(',').map(Number);
const VARIANTS = (process.env.FAITH_MEASURE_VARIANTS || 'normal,allin').split(','), PATRONS = (process.env.FAITH_MEASURE_PATRONS || PATRON_IDS.join(',')).split(',');
const out = (s: string) => console.log('[faith] ' + s);
const part = (p: string) => (ON && PARTS.includes(p) ? it : it.skip);
const HAS_REBUKE = !!WHISPER.rebuke;
const YARD: Record<number, number> = {}, yard = (lv: number) => (YARD[lv] ??= rifleTurn(lv, Math.max(N, 30)));
const FIRE: Record<number, any> = {}, fire = (lv: number) => (FIRE[lv] ??= soldierTurn(lv, Math.max(N, 20)));
/** The Hymns a patron's devoted has within standing at this Devotion. */
const hymnsAt = (patron: string, dv: number) => (FAITH_PATRON[patron].hymns || []).filter((h) => dv >= [0, 3, 5, 7][h.tier]);

describe('the Faith targets hold (rules 1.21)', () => {
  const n = 6, lv = 6, y = rifleTurn(lv, 30);
  // Leon, 12 Nov 2026 (balance pass, section 16): the Outburst is steady about 135% and its peak about 165%, and a prayer-led
  // build is about level with it.
  it('a prayer-led character sworn to a damage patron is about level with the Outburst\'s steady play (135%), and the Hymn\'s peak is about 165%', () => {
    for (const p of ['old_overcast', 'nerukhan']) {
      const r = prayerRow('prayer-led', faithBuild(p), 'normal', lv, n, y);
      console.log('[targets] ' + fline(r));
      expect(r.errors).toBe(0);
      if (!HAS_REBUKE) continue; // the tree before rules 1.21: measured, not held to the target
      expect(r.pctRifle, p + ', percent of the rifle').toBeGreaterThanOrEqual(110); expect(r.pctRifle).toBeLessThanOrEqual(160);
      expect(r.hymns).toBeGreaterThan(0.3); expect(r.whispers).toBeGreaterThan(0.8);
    }
    // the Hymn's peak: Lightning Rod with a second enemy inside its chain
    const two = prayerRow('two targets', faithBuild('old_overcast'), 'normal', lv, n, y, { foes: 2 });
    console.log('[targets] ' + fline(two)); expect(two.errors).toBe(0);
    if (HAS_REBUKE) { expect(two.pctRifle, 'two targets, percent of the rifle').toBeGreaterThanOrEqual(140); expect(two.pctRifle).toBeLessThanOrEqual(185); }
  }, 120000);
  it('a patron with no Hymn that deals damage still has the Whisper and the rifle: not under half a rifle, not over one', () => {
    const r = prayerRow('prayer-led', faithBuild('mother_ember'), 'normal', lv, n, y, { opts: { hymn: 'any' } });
    console.log('[targets] ' + fline(r));
    expect(r.errors).toBe(0);
    if (HAS_REBUKE) { expect(r.pctRifle).toBeGreaterThanOrEqual(40); expect(r.pctRifle).toBeLessThanOrEqual(100); }
  }, 120000);
  it('the gunner who dabbles (Faith 3 given free, Devotion 3) gains little', () => {
    const nd = 16, base = prayerRow('rifle only', dabblerBuild(), 'normal', lv, nd, y, { opts: { hymn: 'none', whisper: 'none' } });
    const best = Math.max(...[{ hymn: 'none', order: 'weapon' }, { hymn: 'none' }, { hymn: 'damage' }].map((o) => prayerRow('dabbler', dabblerBuild(), 'normal', lv, nd, y, { opts: o }).perTurn));
    console.log('[targets] the dabbler: rifle only ' + base.perTurn + ' a turn, the best with prayer ' + best);
    expect(best).toBeLessThanOrEqual(base.perTurn * 1.15);
  }, 120000);
});

describe('the Faith measurements', () => {
  part('sheets')('who is measured', () => {
    for (const v of VARIANTS) for (const lv of LEVELS) { const s = faithSheet('old_overcast', v, lv); out('sheet ' + v + ' L' + lv + ' (session ' + SESSION_AT[lv] + '): Faith ' + s.faith + ', Virtue ' + s.virtue + ', Dexterity ' + s.dexterity + ', Blessing power ×' + s.power + ', Hymn cooldown ' + s.cooldown + ', Devotion ' + s.devotion + ', HP ' + s.hp + ' · perks ' + s.perks.join(', ')); }
    out('Devotion XP curve ' + JSON.stringify(DEVOTION_XP) + ' · tag caps ' + JSON.stringify(TAG_CAPS));
  }, 600000);
  part('yard')('the two yardsticks: the plain rifle\'s turn, and a Soldier\'s turn on a character', () => {
    let md = '\n| Level | Plain rifle, damage a turn (the range) | One Soldier\'s turn on the plain rifleman (old 16 × 11 ground) | its rolls a turn · hit |\n|---|---|---|---|\n';
    for (const lv of LEVELS) { const f = fire(lv); md += '| ' + lv + ' | ' + Math.round(yard(lv) * 10) / 10 + ' | ' + f.taken + ' | ' + f.rolls + ' · ' + f.hitPct + '% |\n'; }
    console.log(md);
  }, 3600000);
  part('inventory')('every prayer', () => {
    let md = '\n| Patron | Size | Prayer | AP | Gate | Limit | What it is | Numbers (× Blessing power) | Grows with |\n|---|---|---|---|---|---|---|---|---|\n';
    for (const r of inventory()) md += '| ' + [r.patron, r.size, r.name, r.ap, r.gate, r.limit, r.kind, r.amounts.map((a) => a.what + ' ' + a.base).join(', ') || '–', r.growsWith].join(' | ') + ' |\n';
    console.log(md);
  });
  part('rows')('prayer-led play against the plain rifle, patron by patron', () => {
    let md = '';
    for (const v of VARIANTS) {
      md += '\n**' + (v === 'normal' ? 'Normal share' : 'All in') + '.** Each cell: damage a turn · **percent of the plain rifle** (the prayers alone) · Hymns a turn\n\n| Patron | ' + LEVELS.map((l) => 'Level ' + l).join(' | ') + ' |\n|---|' + LEVELS.map(() => '---').join('|') + '|\n';
      for (const p of PATRONS) {
        const cells = LEVELS.map((lv) => { const dmgHymn = hymnsAt(p, DEVOTION_BY_LEVEL(lv)).some(prayerHarms) && p !== 'toll_keeper'; const r = prayerRow('prayer-led', faithBuild(p), v, lv, N, yard(lv), { opts: { hymn: dmgHymn ? 'damage' : 'any' } }); out(p + ' ' + fline(r)); expect(r.errors).toBe(0); return r; });
        md += '| ' + FAITH_PATRON[p].name + ' | ' + cells.map((r) => r.perTurn + ' · **' + r.pctRifle + '%** (' + r.pctPrayer + '%) · ' + r.hymns).join(' | ') + ' |\n';
      }
      // two enemies standing together (Lightning Rod's chain, Thunderclap's area)
      const two = LEVELS.map((lv) => prayerRow('two targets', faithBuild('old_overcast'), v, lv, N, yard(lv), { foes: 2 }));
      md += '| Old Overcast, two targets | ' + two.map((r) => r.perTurn + ' · **' + r.pctRifle + '%** (' + r.pctPrayer + '%) · ' + r.hymns).join(' | ') + ' |\n';
      const rifleOnly = LEVELS.map((lv) => prayerRow('the rifle only', faithBuild('old_overcast'), v, lv, N, yard(lv), { opts: { hymn: 'none', whisper: 'none' } }));
      md += '| the same character, rifle only | ' + rifleOnly.map((r) => r.perTurn + ' · **' + r.pctRifle + '%**').join(' | ') + ' |\n';
    }
    console.log(md);
  }, 7200000);
  part('support')('what the prayers that are not damage are worth (estimates), against the two yardsticks', () => {
    let md = '';
    for (const v of VARIANTS) {
      md += '\n**' + (v === 'normal' ? 'Normal share' : 'All in') + '.** Each cell: the best Hymn within standing, its worth when it is needed, as a percent of a plain rifle\'s turn (ESTIMATE; the rule is in faith-measure.ts `supportWorth`)\n\n| Patron | ' + LEVELS.map((l) => 'Level ' + l).join(' | ') + ' |\n|---|' + LEVELS.map(() => '---').join('|') + '|\n';
      const ctl = LEVELS.map((lv) => prayerRow('control', faithBuild('counting_weaver'), v, lv, N, yard(lv), { opts: { hymn: lv >= 9 ? 'cut_short' : 'none', whisper: 'none' } }));
      for (const p of PATRONS) {
        md += '| ' + FAITH_PATRON[p].name + ' | ' + LEVELS.map((lv, i) => { const s = faithSheet(p, v, lv), x = { S: SOLDIER_TURN[lv] ?? fire(lv).taken, R: yard(lv), P: s.power, fail: (ctl[i].saveFailPct ?? 60) / 100, level: lv };
          const ws = hymnsAt(p, s.devotion).map((h) => ({ h, w: supportWorth(h.id, x) })).filter((q) => q.w); if (!ws.length) return '–';
          const b = ws.reduce((a, c) => (c.w.pct > a.w.pct ? c : a)); return b.h.name + ' **' + b.w.pct + '%**'; }).join(' | ') + ' |\n';
      }
      md += '| Whisper: Health · Protection | ' + LEVELS.map((lv) => { const s = faithSheet('mother_ember', v, lv); return supportWorth('health', { S: SOLDIER_TURN[lv] ?? fire(lv).taken, R: yard(lv), P: s.power, fail: 0.6, level: lv }).pct + '% · ' + supportWorth('protection', { S: SOLDIER_TURN[lv] ?? fire(lv).taken, R: yard(lv), P: s.power, fail: 0.6, level: lv }).pct + '%'; }).join(' | ') + ' |\n';
      md += '| a Soldier fails a save against these prayers | ' + ctl.map((r) => (r.saveFailPct == null ? '–' : r.saveFailPct + '%')).join(' | ') + ' |\n';
    }
    console.log(md);
  }, 7200000);
  part('dabbler')('what a gunner gains from Faith 3 and Devotion 3', () => {
    let md = '\n| Level | Rifle only | Whisper with the AP the rifle left | Whisper first, then the rifle | Hymn I when it is back, Whisper, rifle |\n|---|---|---|---|---|\n';
    for (const lv of LEVELS) { const b = dabblerBuild(), y = yard(lv);
      const rows = [{ hymn: 'none', whisper: 'none' }, { hymn: 'none', order: 'weapon' }, { hymn: 'none' }, { hymn: 'damage' }].map((o) => prayerRow('dabbler', b, 'normal', lv, N, y, { opts: o }));
      rows.forEach((r) => out('dabbler ' + fline(r)));
      md += '| ' + lv + ' | ' + rows.map((r) => r.perTurn + ' · **' + r.pctRifle + '%**').join(' | ') + ' |\n'; }
    console.log(md);
  }, 7200000);
  part('miracle')('the Miracles that deal damage, one turn', () => {
    let md = '\n| Miracle | Targets | Damage, the Miracle turn | As turns of the plain rifle |\n|---|---|---|---|\n';
    for (const [p, foes] of [['nerukhan', 1], ['nerukhan', 4], ['old_overcast', 1], ['old_overcast', 4]] as any) for (const v of VARIANTS) {
      const lv = 20, b = faithBuild(p), r = prayerRow('Miracle', b, v, lv, N, yard(lv), { rounds: 1, peak: true, foes });
      out('miracle ' + p + ' ×' + foes + ' ' + fline(r));
      md += '| ' + FAITH_PATRON[p].miracle.name + ' (' + v + ', level 20) | ' + foes + ' | ' + r.perTurn + ' (Miracles a fight ' + r.miracles + ') | ' + Math.round((r.perTurn / yard(lv)) * 10) / 10 + ' |\n';
    }
    console.log(md);
  }, 7200000);
  part('limits')('how often the limits let it happen, over a session of three fights of 5 rounds', () => {
    let md = '\n| Level | Devotion | Hymn cooldown | Hymns in 3 fights of 5 rounds | Whispers | Interventions at most | Miracles |\n|---|---|---|---|---|---|---|\n';
    for (const lv of LEVELS) { const s = faithSheet('old_overcast', 'normal', lv); md += '| ' + lv + ' | ' + s.devotion + ' | ' + s.cooldown + ' | ' + 3 * Math.ceil(5 / s.cooldown) + ' | 15 | ' + (s.faith >= 5 ? 3 * (s.devotion >= 7 ? 2 : 1) : 0) + ' | ' + (s.devotion >= 10 && s.faith >= 7 ? '1 (then Devotion 5: about 19 sessions to the next)' : '0') + ' |\n'; }
    console.log(md);
  });
});
