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
//   whisper     Faith (Old Overcast): a turn with only a Whisper; hymn: a turn with a Hymn (faith-measure.ts prayerRow).
//               Rules 1.31: the door's rows, so the sheet with no class (doorFaithBuild: the Chaplain's Smite is its own row)
//   chaplain    the Chaplain (rules 1.31): Faith all in + Dexterity, a turn with only a Whisper and the weapon, Smite on it
//   heal        the Soul healer's steady Buff heal (6 AP: one turn) in Soldier-turns (heal-measure.ts inventory), ×100
import { runCell, runFight } from './sim';
import { SQUAD, FIGHTS } from './report';
import { gunBuild, gunRow, ROTATIONS } from './guns-measure';
import { pattern } from './magic-measure';
import { faithBuild, doorFaithBuild, chaplainBuild, prayerRow } from './faith-measure';
import { levelFactor } from '../../src';
import { inventory, SOLDIER_TURN } from './heal-measure';

export const R_LEVELS = [1, 5, 10, 20];
export const GUN_SET = ['long_rifle', 'hellraiser_service_rifle', 'adamantile_battle_rifle', 'ccec_marksman_rifle'];
export const SYSTEMS = ['plain', 'gun', 'blade', 'tank', 'sigil2', 'sigil3', 'sigil4', 'ob', 'obPeak', 'whisper', 'hymn', 'heal', 'chaplain'];
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

/** Rules 1.36: the reference character's max HP at a level (rules.json output.level.reference_hp): the unit of a heal or a shield. */
export const refHpAt = (level: number): number => levelFactor('reference_hp', level);
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
    if (s === 'whisper' || s === 'hymn') { if (out.whisper == null) { const r = prayerRow('faith', doorFaithBuild('old_overcast'), variant, level, n, yard); out.whisper = r.pctQuietTurn; out.hymn = r.pctHymnTurn; errors += r.errors; } }
    if (s === 'chaplain') { const r = prayerRow('chaplain', chaplainBuild('old_overcast'), variant, level, n, yard); out.chaplain = r.pctQuietTurn; (out as any).chaplainHymn = r.pctHymnTurn; errors += r.errors; }
    if (s === 'heal') { const r = inventory('outburst', variant, level, refHpAt(level)) /* rules 1.36: the Outburst heals by its own pair (Will Power): its all-in build */.find((q) => /steady \(Rage and Love/.test(q.what)); out.heal = r ? r.pctNow : 0; }
  }
  out.errors = errors;
  return out;
}

// ---------- (a) many targets: the cluster yardstick ----------
const chebyshev = (a: string, b: string) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };
/** How many enemies an area catches when it is aimed at one of them: fights of the reference squad (report.ts SQUAD,
 * its own policies, the enemy AI on) against a group, sampled after every action from round 2 on, for every living
 * enemy: the living enemies (itself included) within r tiles of it, for r = 1, 2, 3 (a Burst's radius), and 2 when
 * another enemy stands within 3 tiles (a chain's jump), else 1. The mean is the number an area of that size is worth. */
export function cluster(level: number, n: number, fight = 'standard', map: 'open' | 'cover' = 'open') {
  const sum: Record<string, number> = { r1: 0, r2: 0, r3: 0, chain3: 0 }; let k = 0;
  for (let i = 0; i < n; i++) runFight({ pcs: SQUAD.map((b) => ({ build: b, variant: 'normal' as any, level })), foes: FIGHTS[fight].foes.map((t) => ({ tier: t })), map, seed: ['CLUSTER', fight, map, level, i].join('-'), maxRounds: 6 }, {
    watch: (cb: any) => { if ((cb?.round || 0) < 2) return; const live = cb.units.filter((u: any) => u.side === 'foe' && !u.dead && !u.downed); if (live.length < 2) return;
      for (const u of live) { k++; for (const r of [1, 2, 3]) sum['r' + r] += live.filter((v: any) => chebyshev(v.pos, u.pos) <= r).length; sum.chain3 += live.some((v: any) => v !== u && chebyshev(v.pos, u.pos) <= 3) ? 2 : 1; } },
  });
  return Object.fromEntries(Object.entries(sum).map(([q, v]) => [q, k ? Math.round((v / k) * 100) / 100 : 0])) as Record<string, number>;
}
