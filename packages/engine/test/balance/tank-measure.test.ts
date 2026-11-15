// @ts-nocheck (a measuring tool)
// THE DURABILITY TANK (0.28.3, docs/design/proposals/2026-11-tank-fit.md): opt-in. TANK_MEASURE=1 plays Survival's
// stage 1 for the tank parties over TANK_SEEDS seeds (default 12) and prints a line per character.
//   TANK_MEASURE=1 npx vitest run --config vitest.balance.config.ts test/balance/tank-measure.test.ts --silent=false
import { describe, expect, it } from 'vitest';
import { stage1, tankLine } from './tank-measure';
import { PHYS_RULES, TECHNIQUE, SKILL } from '../../src';

const env = (globalThis as any).process?.env || {};
describe.skipIf(!env.TANK_MEASURE)('the Durability tank, measured in Survival stage 1', () => {
  it('prints the table', () => {
    // TANK_GUARD='{"soak":5}': a trial of Guard's numbers laid over techniques.json rules.guard for this run
    // TANK_BEFORE=1: as on live 0.28.2 (soak 10, the Guard technique a melee Link, no to-hit door)
    if (env.TANK_BEFORE) { PHYS_RULES.guard.soak = 10; delete (TECHNIQUE as any).guard.innate; (SKILL as any).durability.unlocks['1'].effects[0].skill = []; }
    // TANK_NOHIT=1: the Guard fit without the to-hit door (T.3)
    if (env.TANK_NOHIT) (SKILL as any).durability.unlocks['1'].effects[0].skill = []; // roll_with offers no skill: the weapon's stands
    if (env.TANK_GUARD) Object.assign(PHYS_RULES.guard, JSON.parse(env.TANK_GUARD));
    const n = Number(env.TANK_SEEDS || 12), parties = String(env.TANK_PARTIES || 'solo_wall,solo_wall_noguard,wall_gunner,wall_noguard_gunner,solo_holdfast,holdfast_gunner').split(',');
    for (const p of parties) for (const r of stage1(p, n)) console.log(tankLine(r));
    expect(true).toBe(true);
  }, 3_600_000);
});
