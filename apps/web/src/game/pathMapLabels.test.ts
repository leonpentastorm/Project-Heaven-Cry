// The path map's words (0.28.0 playtest: the vault guard's word ran into the next column's marker and word, "…ULT GUARD").
// The vault's spur puts its words on the side away from the lanes when they fit inside the map's frame there, else on the
// other side (0.28.1 gate: at the map's edge the outward word left the frame, survival suite rules 1.49); the fork it
// leaves puts its own word on the side away from the spur.
import { describe, expect, it } from 'vitest';
import { apply, type GameState } from '@engine';
import { survivalRoom } from '../../../../packages/engine/test/helpers/survival';
import { runView } from './runView';
import { layoutPathMap, labelSide, labelFits, labelBoxes } from './PathMap';
import { ICON } from './runIconSizes';

const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const mapOf = (seed: string) => {
  const g: GameState = apply(survivalRoom(seed, DUO as any, { test: true }), { type: 'run/start', seed }, 'host');
  const v = runView(g, 'host')!; const L = layoutPathMap(v); return { v, pos: L.pos, camp: L.camp };
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

// B1 (0.32): the map is drawn to fit its column (scale under 1 at 1280, its words kept at ICON's size); the words that
// would touch another word or another marker, or leave the frame, are left out, the Boss's never on these seeds
describe('the path map words, placed', () => {
  it('never touch each other, never leave the frame; the Boss, the lit stops and where the squad stands always named', () => {
    const fw = ICON.pathMap, fh = ICON.pathMap * 9 / 16;
    for (const seed of SEEDS) for (const scale of [0.6, 0.66, 0.96, 1.4]) {
      const { v, pos, camp } = mapOf(seed) as any, box = labelBoxes(v.nodes, pos, camp, scale), placed = Object.entries(box).filter(([, b]) => b.r);
      for (const [id, b] of placed) expect(b.r!.l >= 0 && b.r!.r <= fw && b.r!.t >= 0 && b.r!.b <= fh, seed + ' ' + scale + ' ' + id + ' inside').toBe(true);
      for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i][1].r!, c = placed[j][1].r!;
        expect(a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b, seed + ' ' + scale + ' ' + placed[i][0] + ' / ' + placed[j][0]).toBe(false);
      }
      for (const n of v.nodes.filter((n: any) => n.kind === 'boss' || n.state === 'reachable' || n.state === 'here')) expect(box[n.id].at, seed + ' ' + scale + ' ' + n.word).not.toBe(null);
    }
  });
});
