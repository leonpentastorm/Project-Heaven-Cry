// @ts-nocheck (a measuring tool)
// THE FAITH MEASUREMENTS (rules 1.21, docs/design/handoffs/faith-fit.md; rules 1.22, faith-round-2.md). What a character who leads with prayer is
// worth, patron by patron, against the plain rifle on the simulator's shooting range.
//
//   npm run check -- engine     the cheap tests below (a few seeded fights at level 6: seconds)
//   FAITH_MEASURE=1 npx vitest run --root packages/engine test/balance/faith-measure.test.ts --silent=false
//     FAITH_MEASURE_PARTS=sheets,yard,inventory,rows,support,dabbler,miracle,limits   which parts (default: all)
//     FAITH_MEASURE_N=8                 fights a row (default 8)
//     FAITH_MEASURE_LEVELS=6,12         levels (default 1,3,6,9,12,20)
//     FAITH_MEASURE_VARIANTS=normal     (default normal,allin)
//     FAITH_MEASURE_PATRONS=old_overcast,nerukhan
//     FAITH_MEASURE_VOW=0.4             the chance a round that the vow is fulfilled (rules 1.22; default 0.4)
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

/** Rules 1.22: the chance a round that the measured character's vow is fulfilled (the report states it; 0: no vow). */
const VOW = process.env.FAITH_MEASURE_VOW != null ? Number(process.env.FAITH_MEASURE_VOW) : 0.4;
describe('the Faith targets hold (rules 1.22)', () => {
  const n = 8, lv = 6, y = rifleTurn(lv, 30);
  // Leon, 12 Nov 2026: "faith range 80% for whisper only turn and about 125% for hymn, goes up with faith items later".
  // Leon, later the same day, on "a Hymn is always better than a spell or an Outburst": "raise". The Hymn turn is about
  // 150% (Judgement and Lightning Rod 56, the chain 23; measured 139 to 160% at levels 6 to 20, item 1389).
  // Rebuke is held at 20 (a quiet turn of about 60 to 80% from level 6; item 1281), so the quiet band here starts under 80.
  it('a prayer-led character sworn to a damage patron: a turn with a Hymn is about 150% of the plain rifle, a turn with only a Whisper about 60 to 80%, and the Hymn is not there every turn', () => {
    for (const p of ['old_overcast', 'nerukhan']) {
      const r = prayerRow('prayer-led', faithBuild(p), 'normal', lv, n, y, { opts: { hymn: 'damage', vow: VOW } });
      console.log('[targets] ' + fline(r));
      expect(r.errors).toBe(0);
      expect(r.pctHymnTurn, p + ', a Hymn turn, percent of the rifle').toBeGreaterThanOrEqual(125); expect(r.pctHymnTurn).toBeLessThanOrEqual(175);
      expect(r.pctQuietTurn, p + ', a quiet turn, percent of the rifle').toBeGreaterThanOrEqual(45); expect(r.pctQuietTurn).toBeLessThanOrEqual(110); // the rifle half rises with the plain rifle's Level term (rules 1.26)
      expect(r.hymns).toBeGreaterThanOrEqual(0.3); expect(r.hymns).toBeLessThanOrEqual(0.55); expect(r.whispers).toBeGreaterThan(0.8);
    }
    // without the vow the wait is 3 rounds at Faith 6: Hymns on turns 1, 4 and 7 of 8
    const bare = prayerRow('no vow', faithBuild('old_overcast'), 'normal', lv, 4, y, { opts: { hymn: 'damage' } });
    expect(bare.hymns).toBe(0.38); // 3 of 8, as the row rounds it
    // Lightning Rod with a second enemy inside its chain
    const two = prayerRow('two targets', faithBuild('old_overcast'), 'normal', lv, n, y, { foes: 2, opts: { hymn: 'damage', vow: VOW } });
    console.log('[targets] ' + fline(two)); expect(two.errors).toBe(0);
    expect(two.pctHymnTurn, 'two targets, a Hymn turn').toBeGreaterThanOrEqual(145); expect(two.pctHymnTurn).toBeLessThanOrEqual(215);
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
      md += '\n**' + (v === 'normal' ? 'Normal share' : 'All in') + '.** Each cell: damage a turn · **percent of the plain rifle** · a turn with a Hymn · a turn without one · Hymns a turn\n\n| Patron | ' + LEVELS.map((l) => 'Level ' + l).join(' | ') + ' |\n|---|' + LEVELS.map(() => '---').join('|') + '|\n';
      const cell = (r) => r.perTurn + ' · **' + r.pctRifle + '%** · Hymn turn ' + r.pctHymnTurn + '% · quiet turn ' + r.pctQuietTurn + '% · ' + r.hymns;
      for (const vow of [0, VOW]) {
        md += '| *' + (vow ? 'the vow fulfilled ' + Math.round(vow * 100) + '% of rounds' : 'no vow') + '* |' + LEVELS.map(() => ' ').join('|') + '|\n';
        for (const p of PATRONS) {
          const cells = LEVELS.map((lv) => { const dmgHymn = hymnsAt(p, DEVOTION_BY_LEVEL(lv)).some(prayerHarms) && p !== 'toll_keeper'; const r = prayerRow('prayer-led' + (vow ? ' +vow' : ''), faithBuild(p), v, lv, N, yard(lv), { opts: { hymn: dmgHymn ? 'damage' : 'any', vow } }); out(p + ' ' + fline(r)); expect(r.errors).toBe(0); return r; });
          md += '| ' + FAITH_PATRON[p].name + ' | ' + cells.map(cell).join(' | ') + ' |\n';
        }
        // two enemies standing together (Lightning Rod's chain, Thunderclap's area)
        const two = LEVELS.map((lv) => prayerRow('two targets', faithBuild('old_overcast'), v, lv, N, yard(lv), { foes: 2, opts: { hymn: 'damage', vow } }));
        md += '| Old Overcast, two targets | ' + two.map(cell).join(' | ') + ' |\n';
      }
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
    let md = '\n| Level | Rifle only | Whisper with the AP the rifle left | Whisper first, then the rifle | Hymn I when it is back, Whisper, rifle | the same at Devotion 5 (Hymn II), the vow fulfilled |\n|---|---|---|---|---|---|\n';
    for (const lv of LEVELS) { const b = dabblerBuild(), y = yard(lv);
      const rows = [{ hymn: 'none', whisper: 'none' }, { hymn: 'none', order: 'weapon' }, { hymn: 'none' }, { hymn: 'damage' }].map((o) => prayerRow('dabbler', b, 'normal', lv, N, y, { opts: o }));
      rows.push(prayerRow('dabbler, Devotion 5', dabblerBuild('old_overcast', 5), 'normal', lv, N, y, { opts: { hymn: 'damage', vow: VOW } }));
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
    let md = '\n| Level | Devotion | Hymn cooldown | Hymns in 3 fights of 5 rounds | with the vow fulfilled every wait | Whispers | Interventions at most | Miracles |\n|---|---|---|---|---|---|---|---|\n';
    for (const lv of LEVELS) { const s = faithSheet('old_overcast', 'normal', lv); md += '| ' + lv + ' | ' + s.devotion + ' | ' + s.cooldown + ' | ' + 3 * Math.ceil(5 / s.cooldown) + ' | ' + 3 * Math.ceil(5 / Math.max(2, s.cooldown - 1)) + ' | 15 | ' + (s.faith >= 5 ? 3 * (s.devotion >= 7 ? 2 : 1) : 0) + ' | ' + (s.devotion >= 10 && s.faith >= 7 ? '1 (then Devotion 5: about 19 sessions to the next)' : '0') + ' |\n'; }
    console.log(md);
  });
});
