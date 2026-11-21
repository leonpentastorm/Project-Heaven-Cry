// @ts-nocheck (a measuring tool, like the rest of test/balance)
// RULES 1.63 (0.31, Pressure is Dexterity's): the Dexterity melee builds on the shooting range and in Survival's stage 1.
// The yard (sim.ts runFight: one target with a Soldier's numbers at the character's level and 5,000 HP, 13 tiles off,
// that never acts; 8 turns; the walk in counted): damage a turn as a percent of the plain rifle (guns-measure.ts
// rifleYard, the 100% unit), the Pressure pips laid on the target a character turn (the rises of its meter), and the
// share of fights in which the target reaches Pressed, Suppressed and Broken. Rows: the combat knife and the striking
// gloves (door-builds.ts dex_knife, dex_monk) with no perk steps, with both Dexterity alpha perks, and with both and the
// forks (Walk It In, Lockdown); the sabre in the same hands is the Dexterity blade line. Stage 1: survival-run.ts
// through party-fit.ts partyRun, the door members dex_knife and dex_monk solo, cleared or not over DEX_SEEDS seeds.
//   DEX_MELEE=1 [DEX_BUILDS=dex_knife,dex_monk,dex_sabre,dex_gladius] [DEX_STEPS=none,perks,forks] [DEX_N=12] [DEX_LEVELS=1,6] [DEX_SEEDS=20] [DEX_STAGE=0] [DEX_OUT=file.json] npx vitest run --root packages/engine test/balance/dex-melee-measure.test.ts --silent=false
import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { runFight } from './sim';
import { rifleYard } from './guns-measure';
import { BUILD, BUILDS, STEPS } from './builds';
import './door-builds';
import { partyRun } from './party-fit';
import { pressureOf, pressureState } from '../../src/physical/pressure';

const env = (globalThis as any).process?.env || {};
const r1 = (n: number) => Math.round(n * 10) / 10;
const FORKS = ['fork.pressure.walk_it_in', 'fork.pressure.lockdown'];
/** The Dexterity blade line: the sabre in the Dexterity knife's hands. */
if (!BUILD.dex_sabre) { const d = { ...BUILD.dex_knife, id: 'dex_sabre', label: 'Dexterity sabre', weapon: 'sabre' }; BUILDS.push(d); BUILD.dex_sabre = d; }
// rules 1.64 item 5007 (K2): the gladius in the same hands
if (!BUILD.dex_gladius) { const d = { ...BUILD.dex_knife, id: 'dex_gladius', label: 'Dexterity gladius', weapon: 'legion_gladius' }; BUILDS.push(d); BUILD.dex_gladius = d; }

function yardRow(build: string, level: number, n: number, yard: number, steps: 'none' | 'perks' | 'forks') {
  const was = { perks: STEPS.perks, forks: STEPS.forks };
  STEPS.perks = steps !== 'none'; STEPS.forks = steps === 'forks' ? FORKS : [];
  let dmg = 0, turns = 0, pips = 0, pressed = 0, suppressed = 0, broken = 0, errs = 0;
  try {
    for (let i = 0; i < n; i++) {
      let last = 0, top = 0;
      const r = runFight({ pcs: [{ build, variant: 'allin', level, policy: BUILD[build].policy }], foes: [{ tier: 'sim_range_soldier' }], map: 'open', seed: 'DEXM-' + build + '-' + steps + '-' + level + '-' + i, maxRounds: 8 },
        { watch: (cb: any) => { const t = cb.units.find((q: any) => q.side === 'foe'); if (!t) return; const p = pressureOf(t); if (p > last) pips += p - last; last = p;
          const s = pressureState(t), rank = s === 'broken' ? 3 : s === 'suppressed' ? 2 : s === 'pressed' ? 1 : 0; if (rank > top) top = rank; } });
      const pc = r.pcs[0]; dmg += pc.dmg; turns += pc.turns; errs += r.errors.length;
      if (top >= 1) pressed++; if (top >= 2) suppressed++; if (top >= 3) broken++;
    }
  } finally { STEPS.perks = was.perks; STEPS.forks = was.forks; }
  return { build, level, steps, pct: Math.round((dmg / Math.max(1, turns)) / yard * 100), perTurn: r1(dmg / Math.max(1, turns)), pips: r1(pips / Math.max(1, turns)), pressed: Math.round(pressed / n * 100), suppressed: Math.round(suppressed / n * 100), broken: Math.round(broken / n * 100), errs };
}

describe.runIf(env.DEX_MELEE)('rules 1.63: the Dexterity melee builds', () => {
  it('measures', () => {
    const levels = String(env.DEX_LEVELS || '1,6').split(',').map(Number), n = Number(env.DEX_N || 12), out: any = { yard: [], stage1: [] };
    let md = '| Build | Steps | ' + levels.map((l) => 'L' + l + ' % rifle · pips/turn · Pressed / Suppressed / Broken %').join(' | ') + ' |\n|---|---|' + levels.map(() => '---').join('|') + '|\n';
    const yard = Object.fromEntries(levels.map((l) => [l, rifleYard(l, Math.max(60, n))]));
    for (const b of String(env.DEX_BUILDS || 'dex_knife,dex_monk,dex_sabre').split(',')) for (const steps of String(env.DEX_STEPS || 'none,perks,forks').split(',') as ('none' | 'perks' | 'forks')[]) {
      const cells: string[] = [];
      for (const lv of levels) { const r = yardRow(b, lv, n, yard[lv], steps); out.yard.push(r); cells.push(r.pct + '% · ' + r.pips + ' · ' + r.pressed + ' / ' + r.suppressed + ' / ' + r.broken + (r.errs ? ' · ERR ' + r.errs : '')); console.log('[dex] ' + JSON.stringify(r)); }
      md += '| ' + BUILD[b].label + ' | ' + steps + ' | ' + cells.join(' | ') + ' |\n';
    }
    console.log(md); if (env.DEX_MD) writeFileSync(env.DEX_MD, md);
    const seeds = Number(env.DEX_SEEDS || 20);
    if (env.DEX_STAGE !== '0') for (const cell of ['solo_dex_knife', 'solo_dex_monk']) {
      let cleared = 0, depth = 0;
      for (let i = 1; i <= seeds; i++) { const r = partyRun(cell, 'DEX-' + i, 'none'); if (r.cleared) cleared++; depth += r.depth || 0; console.log('[dex stage1] ' + cell + ' DEX-' + i + ' ' + (r.cleared ? 'CLEAR' : r.how + ' @' + r.depth) + ' err ' + r.errors + ' ' + (r.err || []).join(' || ').slice(0, 300)); }
      out.stage1.push({ cell, seeds, cleared, depth: r1(depth / seeds) }); console.log('[dex stage1] ' + cell + ': ' + cleared + ' / ' + seeds + ' cleared, mean depth ' + r1(depth / seeds));
    }
    if (env.DEX_OUT) writeFileSync(env.DEX_OUT, JSON.stringify(out, null, 1));
  }, 48 * 3600_000);
});
