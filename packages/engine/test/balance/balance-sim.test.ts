// @ts-nocheck (a measuring tool: its own tests are below)
// THE BALANCE SIMULATOR (instrument 1 of docs/design/proposals/2026-11-balance-pass.md). Whole fights, played through
// the real reducer by reference builds, measured from the outside.
//
//   npm run check -- engine                      the tests below, with the QUICK run (a few seconds; no file written)
//   BALANCE_SIM_OUT=docs/design/handoffs npx vitest run --root packages/engine test/balance/balance-sim.test.ts
//                                                the FULL baseline (minutes): writes balance-sim-baseline.md and .json there
//   BALANCE_SIM_N=40 …                           fights a row in the full run (default 20; long fights use half)
//   BALANCE_SIM_FROM=docs/design/handoffs/balance-sim-baseline.json npx vitest run --root packages/engine test/balance/balance-sim.test.ts -t "rewrite"
//                                                the report's text again from the saved numbers (seconds; after editing report.ts)
//   BALANCE_SIM_FIGHT='{"pcs":[{"build":"sigil","variant":"normal","level":9}],"foes":[{"tier":"elite"}],"map":"open","seed":"X"}' \
//     npx vitest run --root packages/engine test/balance/balance-sim.test.ts --silent=false -t "one fight"
//                                                ONE fight, with its log and its numbers printed (to see what a policy did)
//
// The parts:   builds.ts    the nine reference builds, made by the game's own rules (and the assumptions for what play earns)
//              policies.ts  how each build plays a turn, from the engine's previews only; NOT_PLAYED lists what it can't
//              sim.ts       runFight / runCell: the fight loop and what is measured; figures(): the numbers of a table row
//              report.ts    the run plan (what fights the baseline is) and the report's text
// To measure a rules change: run the full baseline before and after, and compare the two JSON files.
// Three kinds of fight (all test-only fixtures; no game data is touched):
//   the shooting range   tier 'sim_range_soldier': soldier numbers, 5,000 HP, never acts. Damage a turn with nothing in the way.
//   the sandbag          tiers 'sim_bag_soldier' / 'sim_bag_boss': the same, shooting back. Damage under fire, resources, AP.
//   real fights          minion / soldier / elite / boss: duels, focus (every enemy on one character), squads of 1 to 4.
// Traps this file's tests guard against (each was a real bug once): a card number read after the enemy had already
// acted; a turn counted for the round after the last one; a build that is overburdened; a path written outside the repo.
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILDS, LEVELS, VARIANTS, buildCharacter, legalityProblems, creationSheet } from './builds';
import { runFight, runCell, figures, plainPreview, freshFight, TIERS } from './sim';
import { runAll, writeReport, FULL, QUICK } from './report';
import { validateSheet, CLASS, WEAPON, movement, overweightKg, bindGame, newGame, isPressed } from '../../src';
import { MIN_MOVE } from './builds';

const OUT = process.env.BALANCE_SIM_OUT, ONE = process.env.BALANCE_SIM_FIGHT, FROM = process.env.BALANCE_SIM_FROM;
// A path given in BALANCE_SIM_OUT or BALANCE_SIM_FROM is read from the repository's root, wherever the command is run from.
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'), fromRepo = (p: string) => (p.startsWith('/') ? p : resolve(REPO, p));

describe('the reference builds', () => {
  it('every build at every level is legal by the engine\'s own rules', () => {
    const bad: string[] = [];
    for (const b of BUILDS) for (const v of VARIANTS) {
      expect(validateSheet(creationSheet(b, v) as any), b.id + ' ' + v + ' creation sheet').toBeNull();
      for (const lv of LEVELS) { const x = buildCharacter(b.id, v, lv); expect(x.c.level).toBe(lv); for (const p of legalityProblems(x)) bad.push(b.id + ' ' + v + ' level ' + lv + ': ' + p); }
    }
    expect(bad).toEqual([]);
  });
  it('each build earns the class its way to fight needs, and holds no point it could place', () => {
    for (const b of BUILDS) for (const v of VARIANTS) for (const lv of LEVELS) {
      const x = buildCharacter(b.id, v, lv);
      if (lv >= 3) expect(x.c.classId, b.id + ' ' + v + ' ' + lv).toBe(b.classId);
      expect(x.c.unspent.skill, b.id + ' ' + v + ' ' + lv + ' Skill points').toBe(0);
      // an all-in build may hold Attribute points for the class attribute's next ceiling; nobody else holds any
      if (v === 'normal') expect(x.c.unspent.attr, b.id + ' ' + lv + ' Attribute points').toBe(0);
      else expect(x.c.unspent.attr).toBeLessThanOrEqual(Math.max(0, 10 - x.c.attrs[CLASS[b.classId].attribute]));
      if (b.perks !== 'none') expect(x.perkStepsLeft, b.id + ' ' + v + ' ' + lv + ' perk steps').toBe(0);
    }
  });
  it('no build is overburdened or slower than 1 tile an AP (a player would not build that)', () => {
    const g = newGame('CARRY', { id: 'host', name: 'Host' }), was = bindGame(g);
    try { for (const b of BUILDS) for (const v of VARIANTS) for (const lv of LEVELS) { const c = buildCharacter(b.id, v, lv).c;
      expect(overweightKg(c), b.id + ' ' + v + ' ' + lv + ' kg over its carry limit').toBe(0);
      expect(movement(c), b.id + ' ' + v + ' ' + lv + ' tiles an AP').toBeGreaterThanOrEqual(MIN_MOVE); } } finally { bindGame(was); }
  });
  it('"normal share" and "all in" are what the report says they are', () => {
    for (const b of BUILDS.filter((q) => q.id !== 'calls' && q.id !== 'tank')) {
      expect(buildCharacter(b.id, 'allin', 1).c.skills[b.main]).toBe(7);
      expect(buildCharacter(b.id, 'allin', 9).c.skills[b.main]).toBe(10);
      const n1 = buildCharacter(b.id, 'normal', 1).c.skills[b.main]; expect(n1).toBeGreaterThanOrEqual(3); expect(n1).toBeLessThanOrEqual(4);
    }
  });
});

describe('the fight simulator', () => {
  const spec = (seed: string) => ({ pcs: [{ build: 'opt_blade', variant: 'normal' as const, level: 6 }], foes: [{ tier: 'elite' }], map: 'cover' as const, seed });
  it('is deterministic: the same seed gives the same fight', () => {
    const a = runFight(spec('DET-1')), b = runFight(spec('DET-1')), c = runFight(spec('DET-2'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.errors).toEqual([]);
    expect(JSON.stringify(a.pcs[0].turnDmg) + a.rounds + a.pcs[0].taken).not.toBe(JSON.stringify(c.pcs[0].turnDmg) + c.rounds + c.pcs[0].taken);
  });
  it('its plain attacks are previewAttack\'s: every hit deals the previewed damage (or the previewed critical), and the hit rate matches', () => {
    // a target that does not die, in the open, in range from the first tile: every shot is the same shot
    for (const lv of [1, 12]) {
      const pc = { build: 'plain_gun', variant: 'normal' as const, level: lv }, pv = plainPreview(pc, 'soldier');
      expect(pv.ok).toBe(true);
      let attacks = 0, hits = 0, crits = 0, n = 0;
      for (let i = 0; i < 12; i++) {
        const r = runFight({ pcs: [pc], foes: [{ tier: 'sim_range_soldier' }], map: 'open', seed: 'SANITY-' + lv + '-' + i, maxRounds: 4 }), p = r.pcs[0];
        expect(p.taken).toBe(0); // the range target never acts
        expect(r.errors).toEqual([]);
        attacks += p.attacks; hits += p.hits; crits += p.crits; n++;
        // what a hit dealt: the engine's preview for a plain hit, or for a critical (Used to the Pain and the like are the target's, not here)
        const plainHits = p.hits - p.crits;
        expect(p.attackDmg - p.critDmg).toBe(plainHits * pv.hit);
        if (p.crits) expect(p.critDmg).toBe(p.crits * pv.crit);
      }
      expect(attacks).toBeGreaterThan(60);
      // the hit rate over these attacks, against the preview's chance for the first shot of a turn (Recoil and Heat lower
      // the later shots of a turn, so the rate sits a little under it: a band, not a point)
      const rate = (hits / attacks) * 100;
      expect(rate).toBeLessThanOrEqual(pv.pct + 10);
      expect(rate).toBeGreaterThanOrEqual(pv.pct - 20);
    }
  });
  it('takes the card\'s numbers from a fight in which nothing has happened yet', () => {
    for (const b of ['plain_gun', 'tank', 'opt_blade']) for (const t of ['soldier', 'boss']) {
      const { g } = freshFight({ build: b, variant: 'normal', level: 1 }, t), cb = g.combat, u = cb.units.find((q: any) => q.side === 'pc'), f = cb.units.find((q: any) => q.side === 'foe');
      expect(cb.order[cb.turn]).toBe(u.id); expect(u.hp).toBe(u.maxHp); expect(f.hp).toBe(f.maxHp); expect(isPressed(u)).toBe(false);
      expect(cb.log.some((l: string) => typeof l === 'string' && / fires at | strikes | uses /.test(l))).toBe(false);
    }
  });
  it('the shooting range target never acts, and the Sigil caster keeps its Line when a core swap has to wait', () => {
    const r = runFight({ pcs: [{ build: 'sigil', variant: 'normal', level: 9 }], foes: [{ tier: 'sim_range_soldier' }], map: 'open', seed: 'RANGE-1', maxRounds: 6 }), p = r.pcs[0];
    expect(r.errors).toEqual([]); expect(p.taken).toBe(0); expect(r.foeLostTurns).toBe(0);
    expect(p.turns).toBe(6); expect(r.rounds).toBe(6); expect(p.turnDmg.length).toBe(6); // a fight stopped after 6 rounds is 6 turns, whoever acts first
    expect(Object.entries(p.actions).filter(([k]) => k.startsWith('Evoke')).reduce((n, [, v]) => n + (v as number), 0)).toBeGreaterThanOrEqual(3); // a Line most turns, not one a fight
    expect(p.apSpent.move).toBeLessThan(p.apStart * 0.5);
  });
  it('measures both sides: damage taken, turns, AP and resources add up', () => {
    const c = runCell({ build: 'tank', variant: 'normal', level: 9 }, 'elite', 'open', 2), f = figures(c);
    expect(c.errors).toBe(0);
    expect(c.turns).toBeGreaterThan(0);
    expect(f.res.guard.earnedPerFight).toBeGreaterThan(0); // the tank's policy keeps Guard up
    const ap = Object.values(c.apSpent).reduce((a: number, b: number) => a + b, 0) + c.apUnspent;
    expect(ap).toBeLessThanOrEqual(c.apStart + c.turns * 3 + 0.001); // AP spent and left never exceeds AP had (a little is lent mid-turn)
    expect(ap).toBeGreaterThan(c.apStart * 0.6);
  });
  it('plays every way to fight without a refusal it can\'t handle', () => {
    for (const b of BUILDS) {
      const r = runFight({ pcs: [{ build: b.id, variant: 'allin', level: 20, peak: true }], foes: [{ tier: 'boss' }, { tier: 'soldier' }], map: 'cover', seed: 'WAYS-' + b.id });
      expect(r.errors, b.id).toEqual([]);
      expect(r.pcs[0].turns, b.id).toBeGreaterThan(0);
    }
  });
});

describe('the baseline', () => {
  (OUT || FROM || ONE ? it.skip : it)('quick run: every table builds (a smoke test, a few seconds)', () => {
    const D = runAll(QUICK), md = writeReport(D);
    expect(D.meta.errors).toBe(0);
    expect(D.builds.every((b: any) => !b.problems.length)).toBe(true);
    expect(D.duel.length).toBe(BUILDS.length * 2 * 2);
    expect(D.range.length).toBe(BUILDS.length * 2);
    for (const h of ['## 1. Summary', '## 3. Angle A', '## 4. Angle C', '## 5. Angle B', '## 6. Angle D', '## 7. Angle E', '## 8. Angle F', '## 9. Angle G', '## 10. Angle H', '## 11. Angle K', '## 12. How the player side plays']) expect(md).toContain(h);
    expect(md).not.toMatch(/undefined|NaN/);
  }, 60000);
  (OUT ? it : it.skip)('full run: writes the baseline report and its JSON', () => {
    const n = Math.max(1, Number(process.env.BALANCE_SIM_N) || 20), dir = fromRepo(OUT!);
    const D = runAll(FULL(n), (s) => console.log('[balance sim] ' + s));
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'balance-sim-baseline.md'), writeReport(D));
    writeFileSync(resolve(dir, 'balance-sim-baseline.json'), JSON.stringify(D, null, 1) + '\n');
    console.log('[balance sim] written to ' + dir + ' · ' + D.meta.seconds + ' s · problems: ' + D.meta.errors);
    expect(D.builds.every((b: any) => !b.problems.length)).toBe(true);
  }, 3600000);
  (FROM ? it : it.skip)('rewrite the report from a saved JSON (no fights are played)', () => {
    const file = fromRepo(FROM!), D = JSON.parse(readFileSync(file, 'utf8'));
    writeFileSync(file.replace(/\.json$/, '.md'), writeReport(D));
    console.log('[balance sim] rewrote ' + file.replace(/\.json$/, '.md'));
  });
  (ONE ? it : it.skip)('one fight', () => {
    const r = runFight(JSON.parse(ONE!), { log: true });
    console.log('\n' + (r.log || []).join('\n') + '\n\n' + JSON.stringify({ ...r, log: undefined, spec: undefined }, null, 1));
  });
});
