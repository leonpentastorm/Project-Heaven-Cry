// @ts-nocheck (a measuring tool; see refit-measure.test.ts)
// THE RE-FIT (balance pass stage b, rules 1.26; docs/design/handoffs/balance-refit.md). One row for each system that
// has a ceiling (docs/design/balance-contract.md), measured with the instruments the earlier steps built, at any level,
// for a normal share and all in, as a percent of the normal-share plain rifle's turn at the same level (heals: of one
// Soldier-turn). Nothing new is measured here: each row calls the step's own tool.
//
//   plain       the plain rifle (builds.ts plain_gun): normal share is 100% by definition
//   gun         the best gun, the best way (guns-measure.ts): the max over GUN_SET × the rotations
//   blade       the optimised blade (builds.ts opt_blade: greatsword, Fighter), the simulator's optimised policy
//   tank        the Tank (Defender, sabre and riot shield)
//   sigil2..4   a Line of 2, 3, 4 glyphs over the turns it takes (magic-measure.ts pattern)
//   ob          the Outburst, steady play with the early feelings; obPeak: the biggest Release (all 25 felt) in one turn
//   whisper     Faith (Old Overcast): a turn with only a Whisper; hymn: a turn with a Hymn (faith-measure.ts prayerRow)
//   heal        the Soul healer's steady Buff heal (6 AP: one turn) in Soldier-turns (heal-measure.ts inventory), ×100
import { runCell } from './sim';
import { gunBuild, gunRow, ROTATIONS } from './guns-measure';
import { pattern } from './magic-measure';
import { faithBuild, prayerRow } from './faith-measure';
import { inventory, SOLDIER_TURN } from './heal-measure';

export const R_LEVELS = [1, 5, 10, 20];
export const GUN_SET = ['long_rifle', 'hellraiser_service_rifle', 'adamantile_battle_rifle', 'ccec_marksman_rifle'];
export const SYSTEMS = ['plain', 'gun', 'blade', 'tank', 'sigil2', 'sigil3', 'sigil4', 'ob', 'obPeak', 'whisper', 'hymn', 'heal'];
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

/** A Soldier-turn at any level: the measured table, straight lines between its rows. */
export function soldierTurnAt(level: number): number {
  const ks = Object.keys(SOLDIER_TURN).map(Number).sort((a, b) => a - b);
  if (SOLDIER_TURN[level] != null) return SOLDIER_TURN[level];
  const hi = ks.find((k) => k > level) ?? ks[ks.length - 1], lo = [...ks].reverse().find((k) => k < level) ?? ks[0];
  return hi === lo ? SOLDIER_TURN[hi] : SOLDIER_TURN[lo] + ((SOLDIER_TURN[hi] - SOLDIER_TURN[lo]) * (level - lo)) / (hi - lo);
}
const perTurn = (build: string, variant: string, level: number, n: number, policy?: string) => {
  const c = runCell({ build, variant: variant as any, level, ...(policy ? { policy } : {}) }, 'sim_range_soldier', 'open', n, { maxRounds: 8, tag: 'rf' });
  return { v: c.dmg / Math.max(1, c.turns), errors: c.errors };
};
export const yardOf = (level: number, n: number) => perTurn('plain_gun', 'normal', level, Math.max(n, 24)).v;

/** One level, one share: every system asked for, in percent. */
export function measure(level: number, variant: string, n: number, which: string[] = SYSTEMS, yard = yardOf(level, n), guns = GUN_SET): Record<string, number> {
  const out: Record<string, number> = { yard: Math.round(yard * 10) / 10 }; let errors = 0;
  const y = { level, normal: yard, allin: yard };
  for (const s of which) {
    if (s === 'plain') { const r = perTurn('plain_gun', variant, level, n); out.plain = pct(r.v, yard); errors += r.errors; }
    if (s === 'gun') { let best = 0, what = ''; for (const w of guns) for (const rot of ROTATIONS.filter((q) => q.id !== 'dump')) { const r = gunRow(w, gunBuild(w, 'masterwork'), variant, level, n, yard, { policy: rot.policy, opts: rot.opts }); errors += r.errors; if (r.pctRifle > best) { best = r.pctRifle; what = w + ' ' + rot.id; } } out.gun = best; (out as any).gunWhat = what; }
    if (s === 'blade') { const r = perTurn('opt_blade', variant, level, n); out.blade = pct(r.v, yard); errors += r.errors; }
    if (s === 'tank') { const r = perTurn('tank', variant, level, n); out.tank = pct(r.v, yard); errors += r.errors; }
    if (/^sigil[234]$/.test(s)) { const g = Number(s.slice(5)), r = pattern(g + ' glyphs', 'sigil', variant, level, n, { glyphs: g }, /^Evoke /, y); out[s] = r.casts ? r.pctRifle : 0; errors += r.errors; }
    if (s === 'ob') { const r = pattern('steady', 'outburst', variant, level, n, { feelings: 'early' }, /^Release /, y); out.ob = r.pctRifle; errors += r.errors; }
    if (s === 'obPeak') { let r = pattern('peak', 'outburst', variant, level, n * 2, { feel: true, feelings: 'all' }, /^Release /, y, 'sim_range_soldier', 1); if (!r.casts) r = pattern('peak', 'outburst', variant, level, n * 2, { feel: true, feelings: 'all' }, /^Release /, y, 'sim_range_soldier', 2); out.obPeak = r.pctRifle; errors += r.errors; }
    if (s === 'whisper' || s === 'hymn') { if (out.whisper == null) { const r = prayerRow('faith', faithBuild('old_overcast'), variant, level, n, yard); out.whisper = r.pctQuietTurn; out.hymn = r.pctHymnTurn; errors += r.errors; } }
    if (s === 'heal') { const r = inventory('mender', variant, level, soldierTurnAt(level)).find((q) => /steady \(Rage and Love/.test(q.what)); out.heal = r ? r.pctNow : 0; }
  }
  out.errors = errors;
  return out;
}
