// @ts-nocheck (a measuring tool)
// THE DEFENCE STEP, MEASURED (rules 1.23; docs/design/handoffs/defence-step.md): the medic's kit against one
// Soldier's turn, whole fights against the targets of rules 1.15 (the Boss refit), and the pairs under fire with the
// enemy AI's healer weight on and off. Rules 1.25 (the fire doctrine) is fitted and measured with the same instruments.
//
//   npm run check -- engine          the cheap tests below (arithmetic on the engine's numbers; one fight of each kind)
//   DEFENCE_MEASURE=1 npx vitest run --root packages/engine test/balance/defence-measure.test.ts --silent=false
//       DEFENCE_PARTS=medic,yard,fights,fire   which parts (default all four)
//       DEFENCE_N=10                           fights a cell (default 10)
//       DEFENCE_LEVELS=1,3,6,9,12,20           (the pairs under fire default to 1,6,12,20)
//       DEFENCE_SQUADS=sigil,guns,outburst,healer   DEFENCE_FIGHTS=standard,elite,boss   DEFENCE_MAPS=open,cover
//       DEFENCE_ROWS=<regexp>                  only the pairs whose key matches (defence-measure.ts PAIRS)
//       DEFENCE_TABLE=<file.json>              a trial enemy table laid over the loaded one (fit.ts useTable)
//       DEFENCE_PARTS=burst DEFENCE_BURST=old,0.9/1.08/1.3   the enemy's Burst as the characters', with trial damage
//                                              factors for Soldier/Elite/Boss (not in the default parts)
//       DEFENCE_FOCUS=off                      whole fights with the enemy AI's healer weight off (the control)
//       DEFENCE_DOCTRINE=soldier=spread:0.5:0.1,elite=focus   a trial fire doctrine (rules 1.25) for the named tiers
//                                              (tier=doctrine:fire_spread:fire_near);
//                                              soldier=focus,elite=focus,boss=focus,minion=focus,vermin=focus is the
//                                              build before rules 1.25 (every enemy on the most hurt)
//       DEFENCE_OUT=<file>                     every line is also appended here as it is measured (vitest prints
//                                              nothing until the run ends)
import { describe, it, expect } from 'vitest';
import { appendFileSync, readFileSync } from 'node:fs';
import { useTable } from './fit';
import { fightRow, fightLine, pairFire, pairLine, yardFire, medicRow, medicLine, healerWeight, PAIRS, SQUADS, FIGHTS, TARGET, D_LEVELS, SOLDIER_TURN } from './defence-measure';
import { ENEMY, TECHNIQUE, enemyStats, TRIAGE_HEAL, STIM_HEAL, RALLY_HEAL } from '../../src';

const FULL = !!process.env.DEFENCE_MEASURE, N = Math.max(1, Number(process.env.DEFENCE_N) || 10);
const list = (k: string, d: string) => (process.env[k] || d).split(',').filter(Boolean);
const LV = list('DEFENCE_LEVELS', '').map(Number), PARTS = list('DEFENCE_PARTS', 'medic,yard,fights,fire');
const say = (s: string) => { console.log(s); if (process.env.DEFENCE_OUT) appendFileSync(process.env.DEFENCE_OUT, s + '\n'); };

describe('the defence step: the medic\'s kit against the yardstick (rules 1.23)', () => {
  it('Triage in the medic\'s hands is 40 to 55% of a Soldier-turn for 2 AP: a bit under the same character\'s magic, per AP', () => {
    for (const lv of D_LEVELS) { const r = medicRow('medic', 'mender', 'normal', lv);
      expect(r.triagePct, 'Triage, level ' + lv).toBeGreaterThanOrEqual(40); expect(r.triagePct).toBeLessThanOrEqual(55);
      expect(r.magicPerAp, 'the steady Outburst heal an AP, level ' + lv).not.toBe(null); expect(r.triagePerAp).toBeLessThan(r.magicPerAp!); expect(r.triagePerAp).toBeGreaterThanOrEqual(r.magicPerAp! * 0.7); }
  });
  it('a dose (a stim, a thrown stim) in the medic\'s hands is 45 to 65% for 1 AP; in anyone\'s hands 17 to 35%', () => {
    for (const lv of D_LEVELS) { const m = medicRow('medic', 'mender', 'normal', lv), a = medicRow('anyone', 'plain_gun', 'normal', lv);
      expect(m.stimPct, 'the medic, level ' + lv).toBeGreaterThanOrEqual(45); expect(m.stimPct).toBeLessThanOrEqual(65);
      expect(a.healGiven).toBe(1); expect(a.stimPct, 'anyone, level ' + lv).toBeGreaterThanOrEqual(17); expect(a.stimPct).toBeLessThanOrEqual(35); }
  });
  it('before rules 1.23 the same kit was 150 to 180% and 225 to 265% at level 1 to 12 in the medic\'s hands: no level factor', () => {
    const b1 = medicRow('medic', 'mender', 'normal', 1).before, b20 = medicRow('anyone', 'plain_gun', 'normal', 20).before;
    expect(b1.triagePct).toBeGreaterThan(150); expect(b1.stimPct).toBeGreaterThan(225); expect(b20.triagePct).toBeLessThan(40);
    expect([TRIAGE_HEAL, STIM_HEAL, RALLY_HEAL]).toEqual([5, 6, 6]);
  });
});

// The "quick run" smoke fights play whole simulated fights and assert only that they build: `npm run balance` runs them
// (vitest.balance.config.ts sets BALANCE_QUICK); the engine's default run leaves them out. test/suite-shape.test.ts.
const QUICK_RUN = !!process.env.BALANCE_QUICK;
describe('the defence step: the enemy table (rules 1.23)', () => {
  it('the Boss: HP at level 1, and still at least 20 of the yardstick\'s hits at every level', () => {
    expect(ENEMY.boss.hp).toBe(BOSS_HP);
    for (const lv of D_LEVELS) expect(enemyStats('boss', lv).hp).toBeGreaterThanOrEqual(BOSS_HP);
  });
  (QUICK_RUN ? it : it.skip)('quick run: one fight of each kind for each squad builds (level 6, ground with cover), and a pair under fire', () => {
    for (const sq of Object.keys(SQUADS)) { const r = fightRow(sq, sq === 'healer' ? 'standard' : 'boss', 6, 'cover', 1); expect(r.errors, fightLine(r)).toBe(0); expect(fightLine(r)).not.toMatch(/undefined|NaN/); }
    const on = pairFire('medic', PAIRS.medic.seconds, 6, 2, 2), off = pairFire('medic', PAIRS.medic.seconds, 6, 2, 2, { focus: false });
    expect(on.errors + off.errors).toBe(0); expect(pairLine(on)).not.toMatch(/undefined|NaN/);
    // (Rules 1.25: the Soldiers spread, one each, so one of them is on the medic from round 1; alone in the open under a
    // Soldier she is Down in about two rounds and gives one dose. The supporter who gets to work is the one behind a
    // tank: the Soldiers share out the front first, and nobody goes Down in ten rounds.)
    const tank = pairFire('tank', PAIRS.tank.seconds, 6, 2, 2, { first: PAIRS.tank.first });
    expect(tank.errors).toBe(0); expect(tank.casts, 'the healer behind a tank heals: ' + pairLine(tank)).toBeGreaterThan(4);
    expect(tank.firstDown, 'a tank kept up by a dedicated healer holds two Soldiers: ' + pairLine(tank)).toBeGreaterThanOrEqual(9);
    expect(ENEMY.soldier.healer_focus).toBe(0.5); // (pairFire puts the weight back)
  }, 240000);
  // Rules 1.25 (the fire doctrine; spec items 1400 to 1412). Before the bug sweep of 12 Nov 2026 this read "with the
  // healer weight the healer takes the fire the rifleman took"; after it (every enemy on the most hurt) both Soldiers
  // shot the healer from round 1, weight on or off, and the pair lasted 3.1 rounds. Soldiers now spread: one each.
  it('under fire (level 6, 4 fights): two Soldiers spread, so a healer in the open gets to heal, and still draws the most fire', () => {
    const on = pairFire('mender', PAIRS.mender.seconds, 6, 2, 4), off = pairFire('mender', PAIRS.mender.seconds, 6, 2, 4, { focus: false });
    expect(on.errors + off.errors).toBe(0);
    // 6.5 rounds at 10 fights a cell (rules 1.23 measured 6.1; 3.1 with every enemy on the most hurt)
    expect(on.firstDown, 'on: ' + pairLine(on)).toBeGreaterThanOrEqual(4.5); expect(on.casts, pairLine(on)).toBeGreaterThanOrEqual(4);
    expect(on.healerTaken).toBeGreaterThan(on.firstTaken); expect(off.healerTaken).toBeGreaterThan(off.firstTaken);
    expect(on.healerFirst, 'she is still the first Down more often than the rifleman: ' + pairLine(on)).toBeGreaterThanOrEqual(on.firstFirst);
  }, 240000);
  // NOT MET by rules 1.25, and pinned as it is: the table was fitted with this pair at 4.8 rounds, which was both
  // Soldiers' Bursts landing on the armoured rifleman (he was first in the fight's list). One each puts a whole Soldier
  // on the unarmoured caster, and alone under one Soldier she lasts 2.5 rounds at this level.
  it('under fire (level 6, 4 fights): the idle pair is not back at 4.8 rounds; one Soldier is enough for an idle caster', () => {
    const idle = pairFire('idle', PAIRS.idle.seconds, 6, 2, 4);
    expect(idle.errors).toBe(0);
    expect(idle.firstDown, pairLine(idle)).toBeGreaterThanOrEqual(1.5); expect(idle.firstDown).toBeLessThanOrEqual(3.2); // 2.1 at 10 fights a cell
    expect(idle.healerFirst).toBeGreaterThanOrEqual(75);
  }, 240000);
});

// ---------- the full run ----------
describe('the defence step, measured', () => {
  (FULL ? it : it.skip)('the medic\'s kit, the yardstick on both grounds, whole fights, the pairs under fire', () => {
    if (process.env.DEFENCE_TABLE) { const t = process.env.DEFENCE_TABLE; useTable(JSON.parse(t.trim().startsWith('{') ? t : readFileSync(t, 'utf8'))); say('[table] ' + JSON.stringify({ boss: ENEMY.boss.hp, elite: ENEMY.elite.hp, soldier: ENEMY.soldier.hp, dmg: [ENEMY.soldier.damage, ENEMY.elite.damage, ENEMY.boss.damage] })); }
    const levels = LV.length ? LV : D_LEVELS;
    // A trial fire doctrine (rules 1.25) laid over the loaded one: DEFENCE_DOCTRINE=soldier=spread:0.5,elite=focus
    for (const q of list('DEFENCE_DOCTRINE', '')) { const [t, v] = q.split('='), [d, w, nr] = v.split(':'); for (const id of [t, 'sim_bag_' + t]) if (ENEMY[id]) { ENEMY[id].doctrine = d; ENEMY[id].fire_spread = Number(w) || 0; ENEMY[id].fire_near = Number(nr) || 0; } say('[doctrine] ' + t + ': ' + d + ' spread ' + (Number(w) || 0) + ' near ' + (Number(nr) || 0)); }
    if (PARTS.includes('medic')) for (const [who, b, v] of [['anyone (Healing given ×1)', 'plain_gun', 'normal'], ['the medic (Bard, Empathy first)', 'mender', 'normal'], ['the medic all in', 'mender', 'allin']]) for (const lv of D_LEVELS) say('[medic] ' + medicLine(medicRow(who, b, v, lv)));
    if (PARTS.includes('yard')) for (const lv of levels) for (const [map, build] of [['old', 'plain_gun'], ['open', 'plain_gun'], ['open', 'plain_gun_f']]) { const y = yardFire(lv, Math.max(N, 20), { map, build });
      say('[yard] L' + lv + ' ' + (map === 'old' ? '16 × 11' : '26 × 26') + ' ' + build + ': lasts ' + y.lasted + ' rounds under two Soldiers (Down by round 3 in ' + y.by3 + '%) · ' + y.perFoeTurn + ' HP a Soldier-turn · ' + y.rolls + ' rolls a turn · hit ' + y.hit + '%'); }
    if (process.env.DEFENCE_FOCUS === 'off') { healerWeight(false); say('[focus] the healer weight is OFF for the whole fights of this run'); }
    if (PARTS.includes('fights')) for (const sq of list('DEFENCE_SQUADS', 'sigil,guns,outburst,healer')) for (const f of list('DEFENCE_FIGHTS', 'standard,elite,boss')) for (const lv of levels) for (const map of list('DEFENCE_MAPS', 'open,cover')) say('[fight] ' + fightLine(fightRow(sq, f, lv, map as any, N)) + ' · target ' + TARGET[f].join(' to '));
    if (PARTS.includes('fire')) {
      const only = process.env.DEFENCE_ROWS ? new RegExp(process.env.DEFENCE_ROWS, 'i') : null;
      for (const lv of LV.length ? LV : [1, 6, 12, 20]) for (const [k, p] of Object.entries(PAIRS)) { if (only && !only.test(k)) continue;
        for (const n of p.seconds.length > 1 ? [2, 3, 4] : [2, 3]) for (const focus of [true, false]) { if (!focus && !OFF_TOO.includes(k)) continue; say('[fire] ' + pairLine(pairFire(p.label, p.seconds, lv, n, N, { focus, first: p.first }))); } }
    }
    // The open question of rules 1.18: an enemy's Burst as the characters' (two rolls, the second at −4), with the
    // Soldier's, Elite's and Boss's damage factors tried at DEFENCE_BURST=<soldier>/<elite>/<boss>[,…] ("old": as built).
    if (PARTS.includes('burst')) for (const trial of list('DEFENCE_BURST', 'old')) {
      const num = TECHNIQUE.burst.numbers as any, was = { same: num.enemy_same, s: ENEMY.soldier.damage, e: ENEMY.elite.damage, b: ENEMY.boss.damage };
      if (trial !== 'old') { const [fs, fe, fb] = trial.split('/').map(Number); num.enemy_same = 1; for (const [t, f] of [['soldier', fs], ['elite', fe], ['boss', fb]] as any) if (f) { ENEMY[t].damage = f; if (ENEMY['sim_bag_' + t]) ENEMY['sim_bag_' + t].damage = f; } }
      try {
        for (const lv of levels) for (const [what, o] of [['the rifleman under two Soldiers', {}], ['the rifleman under an Elite and a Soldier', { foes: ['sim_bag_elite', 'sim_bag_soldier'] }], ['the tank under two Soldiers', { build: 'tank' }], ['an idle caster (Class 1 armour) under two Soldiers', { build: 'mender', policy: 'idle' }]] as any) {
          const y = yardFire(lv, Math.max(N, 20), { map: 'old', ...o });
          say('[burst ' + trial + '] L' + lv + ' ' + what + ': lasts ' + y.lasted + ' rounds (Down by round 3 in ' + y.by3 + '%) · ' + y.perFoeTurn + ' HP an enemy turn · ' + y.rolls + ' rolls a turn · hit ' + y.hit + '%'); }
        if (process.env.DEFENCE_BURST_FIGHTS) for (const f of list('DEFENCE_FIGHTS', 'standard,elite,boss')) for (const lv of levels) for (const map of list('DEFENCE_MAPS', 'open,cover')) say('[burst ' + trial + '] ' + fightLine(fightRow('sigil', f, lv, map as any, N)));
      } finally { num.enemy_same = was.same; ENEMY.soldier.damage = was.s; ENEMY.elite.damage = was.e; ENEMY.boss.damage = was.b; for (const t of ['soldier', 'elite']) if (ENEMY['sim_bag_' + t]) ENEMY['sim_bag_' + t].damage = ENEMY[t].damage; }
    }
    healerWeight(true);
    expect(true).toBe(true);
  }, 14400000);
});
/** The pairs also measured with the healer weight off (the control: what rules 1.20 measured). */
const OFF_TOO = (process.env.DEFENCE_OFF_ROWS || 'mender,medic,pair,mender2,tank').split(',');
/** The Boss's HP at level 1 (data/enemies.json; rules 1.23: refitted from 960). */
const BOSS_HP = 820;
void SOLDIER_TURN; void FIGHTS;
