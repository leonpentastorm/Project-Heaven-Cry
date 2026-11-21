// @ts-nocheck (a measuring tool)
// EACH SYSTEM ON THE RANGE, MEASURED (once "the balance contract", rules 1.26; withdrawn as limits by rules 1.94, Leon
// 21 Nov 2026: "delete all the ceiling in the data and balance like a game designer would"). A seeded, deterministic
// measure of each system on the simulator's range (refit-measure.ts, a few fights a cell) at the levels of
// data/rules.json `measure.levels`, all in, in the units of `measure` (percent of a plain rifle's turn; a heal in percent
// of the reference HP). It PRINTS what it reads; nothing is fitted to it and no test fails on a number.
//   BALANCE_MEASURE=1 npx vitest run --root packages/engine test/balance/systems-measure.test.ts --silent=false
//   (or `npm run balance -w @phc/engine`, which runs the whole folder with BALANCE_MEASURE set)
// The one test in the default run: a heal profile's floor (an engine rule, output.ts statTerm).
// More fights, both shares, every level: REFIT_MEASURE=1 (refit-measure.test.ts).
import { describe, it, expect } from 'vitest';
import { RULES, SIGIL, MODULE, WEAPON, ENEMY, profileOf, statTerm } from '../../src';
import { atYardPin } from './sim';
import { measure, yardOf, refHpAt } from './refit-measure';
import { inventory } from './heal-measure';
import { healTurn, shotTurn } from './tending-measure';
import { STEPS } from './builds';
import { FEEDS } from '../../src/effects/feed';

const MEASURE = !!process.env.BALANCE_MEASURE;
const M: any = (RULES as any).measure, LEVELS: number[] = M.levels;
const N = 6; // fights a cell (seeded)
const GUNS = ['adamantile_battle_rifle', 'long_rifle', 'hellraiser_service_rifle'];
const SYSTEMS = ['plain', 'gun', 'blade', 'sigil4', 'ob', 'obPeak', 'whisper', 'hymn', 'heal', 'chaplain'];
const PINNED = ['gun', 'chaplain', 'whisper']; // also read with every gun at the unit's pin (rules.json measure.rifle.pin)
const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
const FEED_STEP = FEEDS.map((f) => f.per);
const feeds = (on: boolean) => FEEDS.forEach((f, i) => { f.per = on ? FEED_STEP[i] : 0; });
const say = (s: string) => console.info('[systems] ' + s);
// As the contract read them (rules 1.56, 1.60): the systems' own rows, with no perk steps and every beta feed at x1,
// unless a reading turns them on.
STEPS.perks = false; feeds(false);

/** Each system all in at every level, printed, with perk steps and the beta feeds on or off for the reading. */
function readAll(what: string, perks: boolean, feedsOn: boolean) {
  const rows: Record<string, number[]> = {}, pinned: Record<string, number[]> = {};
  STEPS.perks = perks; feeds(feedsOn);
  try {
    for (const lv of LEVELS) {
      const yard = yardOf(lv, N), r = measure(lv, 'allin', N, SYSTEMS, yard, GUNS);
      expect(r.errors, 'level ' + lv + ': the simulator met errors').toBe(0);
      for (const s of SYSTEMS) (rows[s] ||= []).push(r[s]);
      const p = atYardPin(() => measure(lv, 'allin', N, PINNED, yard, GUNS));
      for (const s of PINNED) (pinned[s] ||= []).push(p[s]);
    }
  } finally { STEPS.perks = false; feeds(false); }
  say(what + ', all in, levels ' + LEVELS.join(' / ') + ':');
  for (const s of SYSTEMS) say('  ' + s + ' ' + rows[s].join(' / ') + ' (mean ' + mean(rows[s]) + ')' + (pinned[s] ? '; at the pin ' + pinned[s].join(' / ') : ''));
}

describe('each system on the range, measured (rules.json measure; reported, never held to a line)', () => {
  (MEASURE ? it : it.skip)('each system all in, no perk steps, the beta feeds at x1', () => readAll('no perk steps, feeds at x1', false, false), 600000);
  (MEASURE ? it : it.skip)('each system all in with its two alpha perks taken (Tier II where Mastery has earned it)', () => readAll('both alpha perks', true, false), 600000);
  (MEASURE ? it : it.skip)('each system all in with its beta feeding its door', () => readAll('the beta feeds on', false, true), 600000);

  (MEASURE ? it : it.skip)('a normal share at level 1', () => {
    const lv = LEVELS[0], r = measure(lv, 'normal', N, ['gun', 'blade', 'ob', 'hymn', 'heal'], yardOf(lv, N), GUNS);
    expect(r.errors).toBe(0);
    say('a normal share, level ' + lv + ': ' + ['gun', 'blade', 'ob', 'hymn', 'heal'].map((s) => s + ' ' + r[s]).join(' · '));
  }, 300000);

  (MEASURE ? it : it.skip)('heals: the Sigil healer\'s turn (MEND · CONDENSE · SEEK) all in, and a Hymn turn\'s healing (Warm Hands and Health), in percent of the reference HP', () => {
    const at = (rows: any[], re: RegExp) => rows.find((q) => re.test(q.what))?.pctNow ?? 0;
    say('the Sigil healer all in: ' + LEVELS.map((lv) => at(inventory('sigil_s', 'allin', lv, refHpAt(lv)), /MEND · CONDENSE · SEEK \(3/)).join(' / '));
    for (const v of ['normal', 'allin']) say('a Hymn turn\'s healing, ' + v + ': ' + LEVELS.map((lv) => { const rows = inventory('faith_s', v, lv, refHpAt(lv)); return at(rows, /Warm Hands/) + at(rows, /Whisper: Health/); }).join(' / '));
  });

  it('a heal by a caster with no points in its skill is at least its profile\'s floor of a normal share\'s (rules 1.27: output.profiles floor, an engine rule)', () => {
    for (const id of ['healing', 'mend', 'sigil_mend', 'soul_mend', 'blessing_mend']) {
      const p = profileOf(id), none = statTerm(p, [1], [0]), normal = statTerm(p, [4], [4]);
      expect(p.floor, id + ': its floor in data').toBeGreaterThan(0);
      expect(none / normal, id).toBeGreaterThanOrEqual(p.floor! - 1e-9);
    }
    for (const id of ['weapon', 'sigil', 'soul', 'elemental', 'blessing', 'flat']) expect(profileOf(id).floor, id + ': a damage profile has no floor').toBeUndefined();
  });

  (MEASURE ? it : it.skip)('the Mender all in: its healing turn, a door user\'s, and its steady offence (solo and squad), with its gun at the pin and as played', () => {
    const heal = LEVELS.map((lv) => Math.round(healTurn(lv, true, true))), door = LEVELS.map((lv) => Math.round(healTurn(lv, true, false)));
    const offAt = () => LEVELS.map((lv) => { const y = yardOf(lv, N); return Math.round((shotTurn(lv, true, true, 'solo') / y * 100 + shotTurn(lv, true, true, 'squad') / y * 100) / 2); });
    say('the Mender\'s healing turn (% of the reference HP) ' + heal.join(' / ') + '; a door user\'s ' + door.join(' / '));
    say('the Mender\'s offence (% of a rifle-turn) at the pin ' + atYardPin(offAt).join(' / ') + '; as played ' + offAt().join(' / '));
  }, 600000);

  (MEASURE ? it : it.skip)('areas: each shape\'s multiplier a target times the targets it is expected to catch (rules.json measure.area)', () => {
    const A = M.area;
    const shapes: [string, number, number][] = [
      ['Sigil SPREAD (radius 2)', (SIGIL.spread as any).mult, A.cluster.r2],
      ['Sigil PUSH (a 3-tile cone: as radius 1)', (SIGIL.push as any).mult, A.cluster.r1],
      ['Outburst Wave (radius 1)', (MODULE.wave as any).damage_mult, A.cluster.r1],
      ['Outburst Burst (radius 1)', (MODULE.burst as any).damage_mult, A.cluster.r1],
      ['Outburst Aura (radius 1)', (MODULE.aura as any).damage_mult, A.cluster.r1],
    ];
    for (const [what, mult, n] of shapes) say(what + ': ' + mult + ' a target on ' + n + ' targets = ' + (mult * n).toFixed(2) + ' single hits (read as worth ' + (1 + A.extra_target_share * (n - 1)).toFixed(2) + ')');
    say('CHAIN: 1 + ' + (SIGIL.chain as any).jump_mult + ' on ' + A.cluster.chain + ' targets');
    const frag = Math.max(1, Math.floor((WEAPON.frag_grenade as any).damage * (RULES as any).output.factors.thrown) - (ENEMY.soldier as any).armour);
    say('a thrown frag on a Soldier at level 1: ' + frag + ' a target, ' + (frag * A.cluster.r2).toFixed(1) + ' on ' + A.cluster.r2 + ' targets');
  });
});
