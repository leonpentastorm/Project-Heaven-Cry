// The path map's words (0.28.0 playtest: the vault guard's word ran into the next column's marker and word, "…ULT GUARD").
// The vault's spur puts its words on the side away from the lanes; the fork it leaves puts its own on the other side.
import { describe, expect, it } from 'vitest';
import { apply, type GameState } from '@engine';
import { survivalRoom } from '../../../../packages/engine/test/helpers/survival';
import { runView } from './runView';
import { layoutPathMap, labelSide } from './PathMap';

const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];

describe('the vault spur\'s words', () => {
  it('sit outward from the lanes, and the fork\'s word on the other side, on every seed tried', () => {
    for (const seed of ['PHC-0001', 'PHC-IOAZC9', 'PHC-LGHTWI', 'PHC-BZ5P69']) {
      const g: GameState = apply(survivalRoom(seed, DUO as any, { test: true }), { type: 'run/start', seed }, 'host');
      const v = runView(g, 'host')!, { pos } = layoutPathMap(v);
      const spur = v.nodes.filter((n) => n.spur);
      expect(spur.length).toBe(2);
      for (const n of spur) {
        const from = pos[n.from!], out = pos[n.id].y >= from.y;
        expect(labelSide(n, v.nodes, pos)).toBe(out);
      }
      const guard = spur.find((n) => n.spur === 'guard')!, fork = v.nodes.find((n) => n.id === guard.from)!;
      expect(labelSide(fork, v.nodes, pos)).toBe(!labelSide(guard, v.nodes, pos));
    }
  });
});
