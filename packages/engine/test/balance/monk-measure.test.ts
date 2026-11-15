// @ts-nocheck (a measuring tool, like the rest of test/balance)
// Rules 1.56, the unarmed fighter, slice 2: hits to die. A level-1 fighter stands next to a stage-1 Soldier (level 1, the
// service rifle) and does nothing; the Soldier's own turns (the enemy AI, through combat/end-turn) shoot it until it
// drops. Measured: the Soldier's attack rolls, its hits and its turns until the fighter is down, over many seeds, for
// the all-in unarmed fighter (the `monk` preset, Hand wraps, Light armour or none) and the comparator (the same sheet,
// Light armour, a Legion gladius and a buckler). Opt-in: MONK_MEASURE=1 npx vitest run --root packages/engine
// test/balance/monk-measure.test.ts --silent=false
import { describe, it } from 'vitest';
import '../helpers/yard16';
import { fightWith } from '../helpers/perkfight';

const env = (globalThis as any).process?.env || {};
const N = Number(env.MONK_N || 60);
function trial(spec: any, seed: string) {
  const f = fightWith([{ archetype: 'monk', ...spec }], [{ at: 'F6', tier: 'soldier', weapon: 'hellraiser_service_rifle', level: 1 }], { seed, level: 1 });
  const [x, y] = f.foe.pos.split(',').map(Number); f.pc.pos = (x - 1) + ',' + y;
  let rolls = 0, hits = 0, turns = 0;
  for (let t = 0; t < 40 && !f.pc.downed && !f.pc.dead && f.pc.hp > 0 && !f.cb.over; t++) {
    const u = f.turn(f.pc), n = (f.cb.log || []).length;
    f.act({ type: 'combat/end-turn', unitId: u.id } as any);
    const lines = (f.g.combat?.log || []).slice(n).filter((l: string) => /^Foe 1 (fires|strikes|takes)/.test(l) || /Foe 1 .*d20/.test(l));
    rolls += lines.length; hits += lines.filter((l: string) => /· hit/.test(l)).length; turns++;
    if (!f.g.combat) break;
  }
  return { rolls, hits, turns };
}
describe.runIf(env.MONK_MEASURE)('the unarmed fighter: hits to die against a stage-1 Soldier', () => {
  it('measures', () => {
    const rows: [string, any][] = [
      ['monk, wraps, no armour', { weapon: 'hand_wraps', offHand: null, armourClass: 0 }],
      ['monk, wraps, Light', { weapon: 'hand_wraps', offHand: null, armourClass: 1 }],
      ['monk, wraps, Medium (guard off)', { weapon: 'hand_wraps', offHand: null, armourClass: 2 }],
      ['gladius, buckler, Light', { weapon: 'legion_gladius', offHand: 'buckler', armourClass: 1 }],
    ];
    for (const [name, spec] of rows) {
      const r = Array.from({ length: N }, (_, i) => trial(spec, 'MONK-' + i)), m = (k: string) => (r.reduce((t, x) => t + x[k], 0) / N).toFixed(2);
      (globalThis as any).console.log(name.padEnd(34) + ' rolls ' + m('rolls') + '  hits ' + m('hits') + '  Soldier turns ' + m('turns'));
    }
  }, 3600_000);
});
