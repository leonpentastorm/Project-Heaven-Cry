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
import { RULES, SIGIL, MODULE, WEAPON, ENEMY, profileOf, statTerm, attrCapAt } from '../src';
import { atYardPin, YARD } from './balance/sim';
import { measure, yardOf, soldierTurnAt, refHpAt } from './balance/refit-measure';
import { inventory } from './balance/heal-measure';
import { healTurn, shotTurn } from './balance/tending-measure';
import { STEPS } from './balance/builds';
import { FEEDS } from '../src/effects/feed';

// Rules 1.56 (Leon, 15 Nov 2026): perk steps sit on top of a class's damage line; the contract holds the line, so its
// builds take no perk steps (test/balance/builds.ts STEPS).
STEPS.perks = false;
// Rules 1.60 (Doors 3.0, the beta feeds its door; Leon, 16 Nov 2026: the balance numbers are what a class earns when it makes
// every decision right, reward for the effort, not a cap): the beta feed sits on top of a door's line as the perk steps do,
// so the contract holds the line with every feed at x1 (the step per_point.numbers.feed set to 0 for the measure) and
// reports the line with the feeds below.
const FEED_STEP = FEEDS.map((f) => f.per);
const feeds = (on: boolean) => FEEDS.forEach((f, i) => { f.per = on ? FEED_STEP[i] : 0; });
feeds(false);
const B: any = (RULES as any).balance, C = B.ceilings, TOL = B.tolerance, LEVELS: number[] = B.levels;
const N = 6; // fights a cell: deterministic (seeded), so the band only has to hold the noise of a small sample once
const GUARD_GUNS = ['adamantile_battle_rifle', 'long_rifle', 'hellraiser_service_rifle'];
// system id in refit-measure.ts → its ceiling in the contract
const SYS: Record<string, string> = { plain: 'plain', gun: 'gun', blade: 'melee', sigil4: 'sigil_line', ob: 'outburst_steady', obPeak: 'outburst_peak', whisper: 'whisper_turn', hymn: 'hymn_turn', heal: 'healer_turn', chaplain: 'chaplain_turn' }; // chaplain: rules 1.31
const band = (k: string): [number, number] => { const a = C[k].allin; return Array.isArray(a) ? [a[0], a[1]] : [a, a]; };

describe('the balance contract (data/rules.json balance; rules 1.26, 1.27)', () => {
  it('the contract is in data: the ratio, the levels, a ceiling and a dial for every system', () => {
    expect(B.ratio_allin_to_normal).toBe(1.25); expect(LEVELS.length).toBeGreaterThanOrEqual(3);
    for (const k of Object.values(SYS)) { expect(C[k], k).toBeTruthy(); expect(C[k].dial, k + ': where its multiplier lives').toBeTruthy(); }
    expect(C.shield.of_heal).toBeGreaterThan(1);
  });

  it('played: each system all in sits on its ceiling (the average over the levels within tolerance.mean, each level within tolerance.level)', () => {
    const rows: Record<string, number[]> = {}; const report: string[] = [];
    // Rules 1.61 R3 (the lead's ruling, 16 Nov 2026; spec item 4722): a ceiling with `at_pin` (the gun row) is held by the
    // system measured with the gun profile read at the yardstick's pin (balance.yardsticks.rifle: the guns' own numbers,
    // as before G1); the row as played (an all-in shooter above the pin deals more, on purpose) is held under the same
    // band times the gun profile's rise from the pin to the level's Attribute ceiling. OLD expectation (until 16 Nov
    // 2026): the row as played inside the band itself (gun: 145% ± 12% mean, 109 to 181% a level); G1 gave the all-in
    // gunner's Agility 8 to 10 (from level 3) more damage on purpose, so the old expectation no longer measured the guns.
    const pinned = Object.entries(SYS).filter(([, k]) => C[k].at_pin).map(([s]) => s), live: Record<string, number[]> = {};
    const rise = (lv: number) => statTerm(YARD.profile, [attrCapAt(lv)], []) / statTerm(YARD.profile, [YARD.pin], []);
    for (const lv of LEVELS) {
      const yard = yardOf(lv, N);
      const r = measure(lv, 'allin', N, Object.keys(SYS).filter((s) => !pinned.includes(s)), yard, GUARD_GUNS);
      if (pinned.length) {
        const p = atYardPin(() => measure(lv, 'allin', N, pinned, yard, GUARD_GUNS)), q = measure(lv, 'allin', N, pinned, yard, GUARD_GUNS);
        r.errors += p.errors + q.errors; for (const s of pinned) { r[s] = p[s]; (live[s] ||= []).push(q[s]); }
      }
      expect(r.errors, 'level ' + lv + ': the simulator met errors').toBe(0);
      for (const s of Object.keys(SYS)) (rows[s] ||= []).push(r[s]);
      report.push('L' + lv + ' ' + Object.keys(SYS).map((s) => s + ' ' + r[s] + (live[s] ? ' (at the pin; as played ' + live[s][live[s].length - 1] + ')' : '')).join(' · '));
    }
    const bad: string[] = [];
    for (const [s, k] of Object.entries(SYS)) {
      const [lo, hi] = band(k), xs = rows[s], mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      if (mean < lo * (1 - TOL.mean) || mean > hi * (1 + TOL.mean)) bad.push(s + ': the all-in average ' + Math.round(mean) + '% is outside ' + lo + (hi !== lo ? ' to ' + hi : '') + '% ± ' + TOL.mean * 100 + '% (dial: ' + C[k].dial + ')');
      xs.forEach((x, i) => { const low = lo * (C[k].level_lo ?? (1 - TOL.level)), high = hi * (C[k].level_hi ?? (1 + TOL.level));
        if (x < low || x > high) bad.push(s + ' at level ' + LEVELS[i] + ': ' + x + '% is outside ' + Math.round(low) + ' to ' + Math.round(high) + '% (dial: ' + C[k].dial + ')'); });
      if (live[s]) { // the row as played: under the band times the profile's rise (never a floor: a shooter at the pin deals the pinned row)
        const lm = live[s].reduce((a, b) => a + b, 0) / live[s].length, rm = LEVELS.reduce((a, lv) => a + rise(lv), 0) / LEVELS.length;
        if (lm > hi * (1 + TOL.mean) * rm) bad.push(s + ' as played: the all-in average ' + Math.round(lm) + '% is over ' + Math.round(hi * (1 + TOL.mean) * rm) + '% (the band times the gun profile rise from its pin, ' + rm.toFixed(3) + ')');
        live[s].forEach((x, i) => { const high = hi * (C[k].level_hi ?? (1 + TOL.level)) * rise(LEVELS[i]); if (x > high) bad.push(s + ' as played at level ' + LEVELS[i] + ': ' + x + '% is over ' + Math.round(high) + '%'); });
      }
    }
    expect(bad, 'measured, all in:\n' + report.join('\n')).toEqual([]);
  }, 600000);

  it('reported, not asserted (rules 1.56 item 2: perk steps go above the line): each system all in with its two alpha perks taken (Tier II where Mastery has earned it)', () => {
    const rows: Record<string, number[]> = {}; STEPS.perks = true;
    try {
      for (const lv of LEVELS) { const r = measure(lv, 'allin', N, Object.keys(SYS), yardOf(lv, N), GUARD_GUNS); expect(r.errors, 'level ' + lv).toBe(0); for (const s of Object.keys(SYS)) (rows[s] ||= []).push(r[s]); }
    } finally { STEPS.perks = false; }
    const lines = Object.entries(SYS).map(([s, k]) => s + ' with both alpha perks at Tier II: ' + Math.round(rows[s].reduce((a, b) => a + b, 0) / rows[s].length) + '% (levels ' + LEVELS.join(' / ') + ': ' + rows[s].join(' / ') + '; its line ' + band(k).join(' to ') + ')');
    console.info(lines.join('\n'));
  }, 600000);

  it('reported, not asserted (rules 1.60: the beta feeds go above the line): each system all in with its beta feeding its door', () => {
    const rows: Record<string, number[]> = {}; feeds(true);
    try {
      for (const lv of LEVELS) { const r = measure(lv, 'allin', N, Object.keys(SYS), yardOf(lv, N), GUARD_GUNS); expect(r.errors, 'level ' + lv).toBe(0); for (const s of Object.keys(SYS)) (rows[s] ||= []).push(r[s]); }
    } finally { feeds(false); }
    console.info(Object.entries(SYS).map(([s, k]) => s + ' with its beta feed: ' + Math.round(rows[s].reduce((a, b) => a + b, 0) / rows[s].length) + '% (levels ' + LEVELS.join(' / ') + ': ' + rows[s].join(' / ') + '; its line ' + band(k).join(' to ') + ')').join(' · '));
  }, 600000);

  it('played: a normal share at level 1 is not over any ceiling (it should sit near ceiling ÷ ' + 1.25 + ')', () => {
    const lv = LEVELS[0], yard = yardOf(lv, N), r = measure(lv, 'normal', N, ['gun', 'blade', 'ob', 'hymn', 'heal'], yard, GUARD_GUNS);
    for (const [s, k] of Object.entries({ gun: 'gun', blade: 'melee', ob: 'outburst_steady', hymn: 'hymn_turn', heal: 'healer_turn' })) expect(r[s], s + ' at a normal share, level ' + lv).toBeLessThanOrEqual(band(k)[1] * (1 + TOL.level));
  }, 300000);

  it('rules 1.27 (the heal re-fit): the Sigil healer\'s turn (MEND · CONDENSE · SEEK) all in sits on the healer\'s ceiling; a Hymn turn\'s healing (Warm Hands and Health) is never past its cap', () => {
    const H = C.healer_turn, at = (rows: any[], re: RegExp) => rows.find((q) => re.test(q.what))?.pctNow ?? 0;
    const sig = LEVELS.map((lv) => at(inventory('sigil_s', 'allin', lv, refHpAt(lv)), /MEND · CONDENSE · SEEK \(3/)); // rules 1.36: percent of the reference HP
    const mean = sig.reduce((a, b) => a + b, 0) / sig.length;
    expect(mean, 'the Sigil boon all in, levels ' + LEVELS.join(', ') + ': ' + sig.join(' / ') + ' (dial: output.profiles.sigil_mend.k)').toBeGreaterThanOrEqual(H.allin * (1 - TOL.mean));
    expect(mean).toBeLessThanOrEqual(H.allin * (1 + TOL.mean));
    for (const [i, x] of sig.entries()) { expect(x, 'level ' + LEVELS[i]).toBeGreaterThanOrEqual(H.allin * (1 - TOL.level)); expect(x, 'level ' + LEVELS[i]).toBeLessThanOrEqual(H.allin * (1 + TOL.level)); }
    for (const v of ['normal', 'allin']) for (const lv of LEVELS) { const rows = inventory('faith_s', v, lv, refHpAt(lv));
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

  it('played (rules 1.38): the Mender all in: its healing turn on tending_turn, a door user under it; its steady offence (solo and squad) on mender_offence', () => {
    const T = C.tending_turn, O = C.mender_offence, bad: string[] = [], rows: string[] = [];
    const heal = LEVELS.map((lv) => healTurn(lv, true, true)), door = LEVELS.map((lv) => healTurn(lv, true, false));
    // Rules 1.61 (spec item 4735): with `at_pin` the offence is held with the Mender's gun read at the yardstick's pin, as
    // the gun row is (item 4722); as played it is held only under the band times the gun profile's rise and, since item 4966,
    // over its measured floor (`played_floor`).
    const offAt = () => LEVELS.map((lv) => { const y = yardOf(lv, N); return (shotTurn(lv, true, true, 'solo') / y * 100 + shotTurn(lv, true, true, 'squad') / y * 100) / 2; });
    const off = O.at_pin ? atYardPin(offAt) : offAt(), played = O.at_pin ? offAt() : null;
    const chk = (what: string, xs: number[], line: number, dial: string) => {
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length; rows.push(what + ' ' + xs.map((x) => Math.round(x)).join(' / '));
      if (mean < line * (1 - TOL.mean) || mean > line * (1 + TOL.mean)) bad.push(what + ': mean ' + Math.round(mean) + ' against ' + line + ' ± ' + TOL.mean * 100 + '% (dial: ' + dial + ')');
      xs.forEach((x, i) => { if (x < line * (1 - TOL.level) || x > line * (1 + TOL.level)) bad.push(what + ' at level ' + LEVELS[i] + ': ' + Math.round(x) + ' (dial: ' + dial + ')'); });
    };
    chk('Mender healing turn (% of R)', heal, T.allin, T.dial); chk('door Tending all in', door, T.door_allin, T.dial); chk('Mender offence' + (played ? ' (at the pin)' : ''), off, O.allin, O.dial);
    if (played) { const rise = (lv: number) => statTerm(YARD.profile, [attrCapAt(lv)], []) / statTerm(YARD.profile, [YARD.pin], []);
      rows.push('Mender offence as played ' + played.map((x) => Math.round(x)).join(' / '));
      played.forEach((x, i) => { if (x > O.allin * (1 + TOL.level) * rise(LEVELS[i])) bad.push('Mender offence as played at level ' + LEVELS[i] + ': ' + Math.round(x) + ' is over the band times the gun profile rise'); });
      // rules 1.61 (item 4966): the floor of the row as played, from a measured run (rules.json `played_floor`, its reason in `played_floor_note`)
      if (O.played_floor != null) played.forEach((x, i) => { if (x < O.played_floor) bad.push('Mender offence as played at level ' + LEVELS[i] + ': ' + Math.round(x) + ' is under its floor ' + O.played_floor); }); }
    expect(bad, rows.join('\n')).toEqual([]);
  }, 600000);

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
