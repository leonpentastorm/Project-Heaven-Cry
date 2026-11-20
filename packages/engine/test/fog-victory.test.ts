// 0.31.12 lane 2 (ATTACK-PLAN-2026-11-19 "no walking the fog before VICTORY"; Leon: "whatever makes you have to walk all
// the fog before victory shows up even if you kill all foes too"). Reproduced first: through the reducer the fight ends
// (a run's won fight opens its field) in the very action the last foe falls, wherever the squad stands and however much
// of the map is still in the fog. The wait Leon saw is foes still alive in the fog that no PC has seen: the alarm
// (rules item 5521) sent them at the squad when a fight was joined from the approach (retired by rules 1.90). This file
// pins the first half.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, reachable, active, visibility, standable } from '../src';
import { survivalRoom, startRun, ownerOf, upTurn } from './helpers/survival';

const SOLO = [{ build: 'plain_gun', level: 1 }] as any;
/** The first seed whose first fight has two or more foes, walked into (rules 1.90: every fight starts joined). */
function unseenGroupFight(): GameState | null {
  for (let s = 1; s <= 40; s++) {
    const seed = 'PHC-' + String(s).padStart(4, '0');
    let g = startRun(survivalRoom(seed, SOLO, { test: true }), seed);
    const n = reachable(g.run!).find((x) => x.kind === 'fight'); if (!n) continue;
    g = apply(apply(g, { type: 'run/move', node: n.id } as any, ownerOf(0)), { type: 'run/engage', how: 'walk' } as any, ownerOf(0));
    if (g.combat && g.combat.units.filter((u) => u.side === 'foe').length >= 2) return g;
  }
  return null;
}

describe('the last foe falls: the fight is over in that action, fog or no fog', () => {
  it('a run fight with unexplored fog ends (its field opens) in the action that drops the last foe', () => {
    let g = unseenGroupFight(); expect(g).toBeTruthy();
    const pcId = g!.combat!.units.find((u) => u.side === 'pc')!.id;
    g = upTurn(g!, pcId);
    // set-up (hand-built, not the rule under test): every foe but one already fallen; the last on 1 HP next to the squad
    const cb = g!.combat!, pc = cb.units.find((u) => u.id === pcId)!, foes = cb.units.filter((u) => u.side === 'foe');
    for (const f of foes.slice(1)) { f.hp = 0; f.dead = true; }
    const last = foes[0], [px, py] = pc.pos.split(',').map(Number);
    last.hp = 1; last.hidden = false;
    last.pos = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => (px + dx) + ',' + (py + dy)).find((k) => standable(cb.map, k) && !cb.units.some((u) => u !== last && !u.dead && u.pos === k))!;
    expect(last.pos).toBeTruthy();
    // the fog: part of the map is out of the squad's sight
    expect(visibility(cb, 'pc').tiles.size).toBeLessThan(cb.map.w * cb.map.h);
    let killed = false;
    for (let k = 0; k < 6 && !killed; k++) {
      const before = g!;
      g = apply(before, { type: 'combat/attack', unitId: pcId, targetId: last.id, mode: 'melee' } as any, ownerOf(0));
      const t = g.combat!.units.find((u) => u.id === last.id)!;
      if (t.dead || t.downed || t.surrendered) {
        killed = true;
        // the same action: the fight is won and its field is open; no turn of walking the fog comes first
        expect(g.combat!.field).toBeTruthy(); expect(g.run!.state).toBe('field');
      } else expect(g.combat!.field).toBeFalsy();
      if (!killed && g.combat!.units.find((u) => u.id === pcId)!.ap < 1) break;
    }
    expect(killed).toBe(true);
  });
});
