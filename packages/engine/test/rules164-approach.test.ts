// Rules 1.64 item 5008 (Leon, 16 Nov 2026: "you run into an enemy in the fog, combat start and you stood there like an
// idiot with zero AP, giving them a full turn"): a Survival fight that opens with no foe seeing a character is not yet
// joined (Combat.approach). Walking is free, no round passes, no foe but a Hidden one acts; contact joins the fight at
// round 1 with every unit's first turn on full AP. Through the reducer: run/start, run/move into a fight, combat/move.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, reachable, paths, sideSees, active, APPROACH, turnAp } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';

const SOLO = [{ build: 'plain_gun', level: 1 }] as any;
/** The first seed (of PHC-0001 to 0040) whose first fight opens unseen, entered through run/move. */
function unseenFight(): GameState | null {
  for (let s = 1; s <= 40; s++) {
    const seed = 'PHC-' + String(s).padStart(4, '0');
    let g = startRun(survivalRoom(seed, SOLO, { test: true }), seed);
    const n = reachable(g.run!).find((x) => x.kind === 'fight'); if (!n) continue;
    g = apply(g, { type: 'run/move', node: n.id } as any, ownerOf(0));
    if (g.combat?.approach) return g;
  }
  return null;
}
const pcOf = (g: GameState) => g.combat!.units.find((u) => u.side === 'pc')!;

describe('rules 1.64: a fight not yet joined', () => {
  const g0 = unseenFight();
  it('a run fight opened unseen is not yet joined; its words are data', () => {
    expect(g0).toBeTruthy(); const cb = g0!.combat!;
    expect(cb.approach).toEqual({ passes: 0 }); expect(cb.round).toBe(1);
    expect(cb.units.filter((u) => u.side === 'pc').some((p) => sideSees(cb, 'foe', p))).toBe(false);
    expect(active(cb)!.side).toBe('pc'); // no foe acts before contact
    expect(APPROACH.line).toBeTruthy(); expect(APPROACH.free).toContain('move');
  });
  it('walking is free before contact: tiles walked, AP untouched, no round', () => {
    let g = g0!; const u0 = pcOf(g), ap0 = u0.ap; let walked = 0;
    for (let k = 0; k < 4 && g.combat!.approach && walked < 8; k++) {
      const u = pcOf(g), P = paths(g.combat!, u.pos, u.id), foes = g.combat!.units.filter((x) => x.side === 'foe');
      // a tile 1 to 2 away that no foe sees from, farther from the foes than now (a walk that stays unseen)
      const far = (k2: string) => Math.min(...foes.map((f) => Math.abs(+k2.split(',')[0] - +f.pos.split(',')[0]) + Math.abs(+k2.split(',')[1] - +f.pos.split(',')[1])));
      const to = Object.entries(P.dist).filter(([k2, d]) => d >= 1 && d <= 2 && k2 !== u.pos).sort((a, b) => far(b[0]) - far(a[0]))[0]; if (!to) break;
      const n = apply(g, { type: 'combat/move', unitId: u.id, to: to[0] } as any, ownerOf(0));
      if (!n.combat!.approach) break; g = n; walked += to[1];
    }
    expect(walked).toBeGreaterThanOrEqual(2);
    expect(pcOf(g).ap).toBe(ap0); expect(g.combat!.round).toBe(1);
  });
  it('end turn before contact: no foe acts, no round passes; after passes_max passes the fight is joined anyway', () => {
    let g = g0!; const hp = g.combat!.units.map((u) => u.hp);
    for (let i = 0; i < APPROACH.passes_max - 1; i++) { g = apply(g, { type: 'combat/end-turn', unitId: pcOf(g).id } as any, ownerOf(0)); expect(g.combat!.approach?.passes).toBe(i + 1); expect(g.combat!.round).toBe(1); }
    expect(g.combat!.units.map((u) => u.hp)).toEqual(hp);
    g = apply(g, { type: 'combat/end-turn', unitId: pcOf(g).id } as any, ownerOf(0));
    expect(g.combat!.approach).toBeUndefined(); expect(g.combat!.log.some((l) => l.startsWith(APPROACH.joined_log))).toBe(true);
  });
  it('contact (walking into sight) joins the fight: round 1, every first turn on full AP', () => {
    let g = g0!;
    for (let k = 0; k < 30 && g.combat!.approach; k++) {
      const u = pcOf(g), cb = g.combat!, P = paths(cb, u.pos, u.id), foe = cb.units.find((x) => x.side === 'foe' && !x.dead)!;
      const d = (k2: string) => Math.max(Math.abs(+k2.split(',')[0] - +foe.pos.split(',')[0]), Math.abs(+k2.split(',')[1] - +foe.pos.split(',')[1]));
      const to = Object.entries(P.dist).filter(([k2, n]) => n >= 1 && n <= 3).sort((a, b) => d(a[0]) - d(b[0]))[0]; if (!to) break;
      g = apply(g, { type: 'combat/move', unitId: u.id, to: to[0] } as any, ownerOf(0));
    }
    const cb = g.combat!; expect(cb.approach).toBeUndefined(); expect(cb.round).toBe(1);
    expect(cb.log.some((l) => l.startsWith(APPROACH.joined_log))).toBe(true);
    const u = active(cb)!; if (u.side === 'pc') expect(u.ap).toBe(turnAp(u, [], []).ap); // the first turn after contact, on full AP
    else expect(pcOf(g).ap).toBe(turnAp(pcOf(g), [], []).ap);
  });
});
