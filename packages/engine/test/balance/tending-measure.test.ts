// @ts-nocheck (a measuring tool)
// RULES 1.33: Tending, Bonds and the Mender (docs/design/bonds-spec.md section 7). Skipped unless asked for:
//
//   TEND_MEASURE=1 npx vitest run --root packages/engine test/balance/tending-measure.test.ts --silent=false
//     TEND_N=8   fights a cell for the rifle-turn yardstick (refit-measure.ts yardOf)
//
// What it measures, with the engine itself (no formula copied):
//   heal      the healing turn (6 AP), in Soldier-turns x 100 (refit-measure.ts soldierTurnAt): the Mender (Triage, then
//             two Mends, every ally Bonded: through x1.2) and the door user (three Mends on Bonded allies), all in and
//             at a normal share (Insight / Empathy 4 / 4)
//   offence   a whole turn of pistol shots at a Bonded Soldier of the same level (the engine's preview: chance x damage
//             after armour, x the Bonds held), in percent of the normal-share rifle-turn (yardOf): the Mender solo
//             (Bonds on three Soldiers), the Mender in a squad of four (three allies and one enemy), the door user
//   strike    the offence turn with the Ledger full (0.7 x its cap on the first hit)
// The sheet (bonds-spec.md section 7): Insight and Empathy 7/7, 8/8, 10/10, 10/10 at levels 1 / 5 / 10 / 20, Dexterity
// 0 / 1 / 2 / 4, a service pistol, the Attuner in the off hand.
import { describe, it, expect } from 'vitest';
import { yardOf } from './refit-measure';
import { healTurn, shotTurn } from './tending-measure';

const ON = !!process.env.TEND_MEASURE, N = Math.max(1, Number(process.env.TEND_N) || 8);
const LEVELS = [1, 5, 10, 20];
describe('rules 1.33: the Tending and Mender lines', () => {
  (ON ? it : it.skip)('the healing turn, the offence, the strike', () => {
    const rows: Record<string, Record<number, number>> = {};
    const put = (k: string, l: number, v: number) => ((rows[k] ||= {})[l] = v);
    for (const l of LEVELS) {
      const yard = yardOf(l, N);
      put('heal: Mender all in', l, healTurn(l, true, true)); put('heal: door all in', l, healTurn(l, true, false)); put('heal: door normal', l, healTurn(l, false, false));
      put('offence: Mender solo (3 Bonds)', l, Math.round((shotTurn(l, true, true, 'solo') / yard) * 100));
      put('offence: Mender squad (4 Bonds)', l, Math.round((shotTurn(l, true, true, 'squad') / yard) * 100));
      put('offence: door all in (solo)', l, Math.round((shotTurn(l, true, false, 'solo') / yard) * 100));
      put('strike: Mender solo, Ledger full', l, Math.round((shotTurn(l, true, true, 'solo', true) / yard) * 100));
      put('rifle-turn (yard)', l, Math.round(yard * 10) / 10);
    }
    let md = '| Line | L1 | L5 | L10 | L20 | Mean |\n|---|---|---|---|---|---|\n';
    for (const [k, v] of Object.entries(rows)) { const xs = LEVELS.map((l) => v[l]); md += '| ' + k + ' | ' + xs.join(' | ') + ' | ' + Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) + ' |\n'; }
    console.log(md);
    expect(Object.keys(rows).length).toBeGreaterThan(0);
  }, 3600000);
});
