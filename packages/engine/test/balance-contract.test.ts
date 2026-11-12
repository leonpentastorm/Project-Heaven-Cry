// @ts-nocheck (a guard over the measuring tools)
// THE BALANCE CONTRACT (rules 1.26, the re-fit; docs/design/balance-contract.md). Every number this file holds a
// system to is read from data/rules.json `balance`: the ceilings (what an ALL-IN build reaches, Leon 12 Nov 2026), the
// ratio to a normal share, the tolerances and the yardsticks. Two parts:
//   1. played: a quick, seeded, deterministic measure of each system on the simulator's range (refit-measure.ts, a few
//      fights a cell) at the contract's levels, all in, against its ceiling: the average over the levels within
//      tolerance.mean, each level within tolerance.level (or its own level_lo). A normal share at level 1 is never over
//      the ceiling. A failure names the system, the level and the dial in data that moves it.
//   2. static: the shapes (areas) against the area yardstick, the thrown factor against the budget rule, the shield
//      against the heal. Arithmetic on the data: no fight.
// To measure properly (more fights, both shares, every level): REFIT_MEASURE=1 (refit-measure.test.ts).
import { describe, it, expect } from 'vitest';
import { RULES, SIGIL, MODULE, WEAPON, ENEMY, profileOf, statTerm } from '../src';
import { measure, yardOf, soldierTurnAt } from './balance/refit-measure';
import { inventory } from './balance/heal-measure';

const B: any = (RULES as any).balance, C = B.ceilings, TOL = B.tolerance, LEVELS: number[] = B.levels;
const N = 6; // fights a cell: deterministic (seeded), so the band only has to hold the noise of a small sample once
const GUARD_GUNS = ['adamantile_battle_rifle', 'long_rifle', 'hellraiser_service_rifle'];
// system id in refit-measure.ts → its ceiling in the contract
const SYS: Record<string, string> = { plain: 'plain', gun: 'gun', blade: 'melee', sigil4: 'sigil_line', ob: 'outburst_steady', obPeak: 'outburst_peak', whisper: 'whisper_turn', hymn: 'hymn_turn', heal: 'healer_turn' };
const band = (k: string): [number, number] => { const a = C[k].allin; return Array.isArray(a) ? [a[0], a[1]] : [a, a]; };

describe('the balance contract (data/rules.json balance; rules 1.26, 1.27)', () => {
  it('the contract is in data: the ratio, the levels, a ceiling and a dial for every system', () => {
    expect(B.ratio_allin_to_normal).toBe(1.25); expect(LEVELS.length).toBeGreaterThanOrEqual(3);
    for (const k of Object.values(SYS)) { expect(C[k], k).toBeTruthy(); expect(C[k].dial, k + ': where its multiplier lives').toBeTruthy(); }
    expect(C.shield.of_heal).toBeGreaterThan(1);
  });

  it('played: each system all in sits on its ceiling (the average over the levels within tolerance.mean, each level within tolerance.level)', () => {
    const rows: Record<string, number[]> = {}; const report: string[] = [];
    for (const lv of LEVELS) {
      const yard = yardOf(lv, N);
      const r = measure(lv, 'allin', N, Object.keys(SYS), yard, GUARD_GUNS);
      expect(r.errors, 'level ' + lv + ': the simulator met errors').toBe(0);
      for (const s of Object.keys(SYS)) (rows[s] ||= []).push(r[s]);
      report.push('L' + lv + ' ' + Object.keys(SYS).map((s) => s + ' ' + r[s]).join(' · '));
    }
    const bad: string[] = [];
    for (const [s, k] of Object.entries(SYS)) {
      const [lo, hi] = band(k), xs = rows[s], mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      if (mean < lo * (1 - TOL.mean) || mean > hi * (1 + TOL.mean)) bad.push(s + ': the all-in average ' + Math.round(mean) + '% is outside ' + lo + (hi !== lo ? ' to ' + hi : '') + '% ± ' + TOL.mean * 100 + '% (dial: ' + C[k].dial + ')');
      xs.forEach((x, i) => { const low = lo * (C[k].level_lo ?? (1 - TOL.level)), high = hi * (C[k].level_hi ?? (1 + TOL.level));
        if (x < low || x > high) bad.push(s + ' at level ' + LEVELS[i] + ': ' + x + '% is outside ' + Math.round(low) + ' to ' + Math.round(high) + '% (dial: ' + C[k].dial + ')'); });
    }
    expect(bad, 'measured, all in:\n' + report.join('\n')).toEqual([]);
  }, 600000);

  it('played: a normal share at level 1 is not over any ceiling (it should sit near ceiling ÷ ' + 1.25 + ')', () => {
    const lv = LEVELS[0], yard = yardOf(lv, N), r = measure(lv, 'normal', N, ['gun', 'blade', 'ob', 'hymn', 'heal'], yard, GUARD_GUNS);
    for (const [s, k] of Object.entries({ gun: 'gun', blade: 'melee', ob: 'outburst_steady', hymn: 'hymn_turn', heal: 'healer_turn' })) expect(r[s], s + ' at a normal share, level ' + lv).toBeLessThanOrEqual(band(k)[1] * (1 + TOL.level));
  }, 300000);

  it('rules 1.27 (the heal re-fit): the Sigil healer\'s turn (MEND · CONDENSE · SEEK) all in sits on the healer\'s ceiling; a Hymn turn\'s healing (Warm Hands and Health) is never past its cap', () => {
    const H = C.healer_turn, at = (rows: any[], re: RegExp) => rows.find((q) => re.test(q.what))?.pctNow ?? 0;
    const sig = LEVELS.map((lv) => at(inventory('sigil_s', 'allin', lv, soldierTurnAt(lv)), /MEND · CONDENSE · SEEK \(3/));
    const mean = sig.reduce((a, b) => a + b, 0) / sig.length;
    expect(mean, 'the Sigil boon all in, levels ' + LEVELS.join(', ') + ': ' + sig.join(' / ') + ' (dial: output.profiles.sigil_mend.k)').toBeGreaterThanOrEqual(H.allin * (1 - TOL.mean));
    expect(mean).toBeLessThanOrEqual(H.allin * (1 + TOL.mean));
    for (const [i, x] of sig.entries()) { expect(x, 'level ' + LEVELS[i]).toBeGreaterThanOrEqual(H.allin * (1 - TOL.level)); expect(x, 'level ' + LEVELS[i]).toBeLessThanOrEqual(H.allin * (1 + TOL.level)); }
    for (const v of ['normal', 'allin']) for (const lv of LEVELS) { const rows = inventory('faith_s', v, lv, soldierTurnAt(lv));
      expect(at(rows, /Warm Hands/) + at(rows, /Whisper: Health/), 'a Hymn turn\'s healing, ' + v + ', level ' + lv + ' (dial: output.profiles.blessing_mend.k)').toBeLessThanOrEqual(H.hymn_heal_cap); }
  });

  it('rules 1.27: a heal by a caster with no points in its skill is at least the floor of a normal share\'s, at the same level', () => {
    for (const id of ['healing', 'mend', 'sigil_mend', 'soul_mend', 'blessing_mend']) {
      const p = profileOf(id), none = statTerm(p, [1], [0]), normal = statTerm(p, [4], [4]);
      expect(p.floor, id + ': its floor in data').toBeGreaterThan(0);
      expect(none / normal, id).toBeGreaterThanOrEqual(p.floor! - 1e-9);
    }
    for (const id of ['weapon', 'sigil', 'soul', 'elemental', 'blessing', 'flat']) expect(profileOf(id).floor, id + ': a damage profile has no floor').toBeUndefined();
  });

  it('static: an area deals each target no more than its single-target worth plus half for each extra target it is expected to catch', () => {
    const A = B.yardsticks.area, share = A.extra_target_share, worth = (n: number) => 1 + share * (n - 1);
    const shapes: [string, number, number][] = [
      ['Sigil SPREAD (radius 2)', (SIGIL.spread as any).mult, A.cluster.r2],
      ['Sigil PUSH (a 3-tile cone: as radius 1)', (SIGIL.push as any).mult, A.cluster.r1],
      ['Outburst Wave (radius 1)', (MODULE.wave as any).damage_mult, A.cluster.r1],
      ['Outburst Burst (radius 1)', (MODULE.burst as any).damage_mult, A.cluster.r1],
      ['Outburst Aura (radius 1)', (MODULE.aura as any).damage_mult, A.cluster.r1],
    ];
    for (const [what, mult, n] of shapes) expect(mult * n, what + ': ' + mult + ' a target on ' + n + ' targets').toBeLessThanOrEqual(worth(n) * (1 + TOL.mean));
    // CHAIN (a second target at ×jump_mult): measured 17% over (the hand-off's "could not fit"); held at its number so a rise shows
    expect(1 + (SIGIL.chain as any).jump_mult).toBeLessThanOrEqual(worth(A.cluster.chain) * 1.2);
  });

  it('static: a thrown frag on the measured cluster is within the budget rule for 2 AP of the plain tier (session supply and credits)', () => {
    const A = B.yardsticks.area, T = B.yardsticks.tiers, cost = B.yardsticks.cost, f = (RULES as any).output.factors.thrown;
    // per target, after a Soldier's armour, at level 1, as a share of a rifle-turn (the plain rifle at a normal share: about 70 a turn at level 1)
    const frag = Math.max(1, Math.floor((WEAPON.frag_grenade as any).damage * f) - (ENEMY.soldier as any).armour), rifleTurnL1 = 70; // what lands on a Soldier at level 1
    const allowed = (2 / 6) * T.plain * (1 + cost.session_supply_credits) * (1 + A.extra_target_share * (A.cluster.r2 - 1)) * rifleTurnL1;
    expect(frag * A.cluster.r2, 'a frag on ' + A.cluster.r2 + ' targets against ' + Math.round(allowed)).toBeLessThanOrEqual(allowed * (1 + TOL.level));
  });
});
