// The path map's words (0.28.0 playtest: the vault guard's word ran into the next column's marker and word, "…ULT GUARD").
// The vault's spur puts its words on the side away from the lanes when they fit inside the map's frame there, else on the
// other side (0.28.1 gate: at the map's edge the outward word left the frame, survival suite rules 1.49); the fork it
// leaves puts its own word on the side away from the spur.
import { describe, expect, it } from 'vitest';
import { apply, type GameState } from '@engine';
import { survivalRoom } from '../../../../packages/engine/test/helpers/survival';
import { runView } from './runView';
import { layoutPathMap, labelSide, labelFits } from './PathMap';

const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const mapOf = (seed: string) => {
  const g: GameState = apply(survivalRoom(seed, DUO as any, { test: true }), { type: 'run/start', seed }, 'host');
  const v = runView(g, 'host')!; return { v, pos: layoutPathMap(v).pos };
};
const SEEDS = ['PHC-0001', 'PHC-0046', 'PHC-IOAZC9', 'PHC-LGHTWI', 'PHC-BZ5P69', ...Array.from({ length: 60 }, (_, i) => 'PHC-' + String(i + 100).padStart(4, '0'))];

describe('the vault spur\'s words', () => {
  it('sit outward from the lanes when they fit in the frame, else on the other side; always inside; the fork\'s word away from the spur', () => {
    let edgeTop = 0, edgeBottom = 0;
    for (const seed of SEEDS) {
      const { v, pos } = mapOf(seed), spur = v.nodes.filter((n) => n.spur);
      expect(spur.length).toBe(2);
      for (const n of spur) {
        const from = pos[n.from!], out = pos[n.id].y >= from.y, side = labelSide(n, v.nodes, pos)!;
        expect(labelFits(n, pos[n.id].y, side), seed + ' ' + n.id).toBe(true);
        if (labelFits(n, pos[n.id].y, out)) expect(side, seed + ' ' + n.id).toBe(out);
        else { expect(side).toBe(!out); if (out) edgeBottom++; else edgeTop++; }
      }
      const guard = spur.find((n) => n.spur === 'guard')!, fork = v.nodes.find((n) => n.id === guard.from)!;
      expect(labelSide(fork, v.nodes, pos)).toBe(pos[guard.id].y < pos[fork.id].y);
    }
    // the edge cases are met on real seeds: a spur at the map's bottom edge and one at its top edge
    expect(edgeBottom, 'a spur at the bottom edge').toBeGreaterThan(0);
    expect(edgeTop, 'a spur at the top edge').toBeGreaterThan(0);
  });
});
