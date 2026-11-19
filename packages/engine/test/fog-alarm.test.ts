// Rules item 5521, the alarm (0.31.12 lane 2; ATTACK-PLAN-2026-11-19 "no walking the fog before VICTORY"): when a fight
// opened in the approach is joined, every foe group on the map learns where each character not Hidden stands now and
// comes for it; the log says it once (rules.json combat.approach.alarm_log). Through the reducer: run/move into an
// unseen fight, a free walk away from the start, end turn until contact.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, reachable, active, paths, knownTile, sideSees, APPROACH } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';

const SOLO = [{ build: 'plain_gun', level: 1 }] as any;
const far = (a: string, b: string) => Math.max(Math.abs(+a.split(',')[0] - +b.split(',')[0]), Math.abs(+a.split(',')[1] - +b.split(',')[1]));
/** An unseen run fight (two or more foes) whose squad has walked, free and unseen, off its start tile. */
function walkedUnseen(): { g: GameState; start: string } | null {
  for (let s = 1; s <= 40; s++) {
    const seed = 'PHC-' + String(s).padStart(4, '0');
    let g = startRun(survivalRoom(seed, SOLO, { test: true }), seed);
    const n = reachable(g.run!).find((x) => x.kind === 'fight'); if (!n) continue;
    g = apply(g, { type: 'run/move', node: n.id } as any, ownerOf(0));
    const cb = g.combat; if (!cb?.approach || cb.units.filter((u) => u.side === 'foe').length < 2) continue;
    const u = cb.units.find((x) => x.side === 'pc')!, start = u.pos, P = paths(cb, u.pos, u.id);
    // a tile 2 to 3 away (a free walk), still unseen
    for (const [k, d] of Object.entries(P.dist)) {
      if (d < 2 || d > 3) continue;
      const n2 = apply(g, { type: 'combat/move', unitId: u.id, to: k } as any, ownerOf(0));
      const p2 = n2.combat!.units.find((x) => x.id === u.id)!;
      if (n2.combat!.approach && p2.pos !== start && !sideSees(n2.combat!, 'foe', p2)) return { g: n2, start };
    }
  }
  return null;
}

describe('rules item 5521: the alarm', () => {
  const w = walkedUnseen();
  it('at contact every foe knows where the squad stands now, not where it started; the log says it once', () => {
    expect(w).toBeTruthy(); let g = w!.g;
    expect(APPROACH.alarm_log).toBeTruthy();
    const pcId = g.combat!.units.find((u) => u.side === 'pc')!.id;
    for (let k = 0; k < 6 && g.combat!.approach; k++) g = apply(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id } as any, ownerOf(0));
    const cb = g.combat!; expect(cb.approach).toBeUndefined();
    expect(cb.log.filter((l) => l === APPROACH.alarm_log).length).toBe(1);
    const at = cb.units.find((u) => u.id === pcId)!.pos; expect(at).not.toBe(w!.start);
    const pc = cb.units.find((u) => u.id === pcId)!;
    expect(knownTile(cb, 'foe', pc)).toBe(pc.pos);
  });
  it('a foe that never saw the squad comes for it on its turns', () => {
    let g = w!.g; const pcId = g.combat!.units.find((u) => u.side === 'pc')!.id;
    for (let k = 0; k < 6 && g.combat!.approach; k++) g = apply(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id } as any, ownerOf(0));
    const near = () => { const cb = g.combat!, p = cb.units.find((u) => u.id === pcId)!; return cb.units.filter((u) => u.side === 'foe' && !u.dead).map((f) => far(f.pos, p.pos)); };
    const d0 = near();
    // the squad holds still: end its turns; the foes have theirs
    for (let k = 0; k < 2 && g.combat && !g.combat.over && !g.combat.field; k++) g = apply(g, { type: 'combat/end-turn', unitId: pcId } as any, ownerOf(0));
    if (!g.combat || g.combat.field || g.combat.over) return; // (they came and it was settled)
    const d1 = near();
    expect(Math.max(...d1)).toBeLessThan(Math.max(...d0)); // the farthest group closes in
  });
});
