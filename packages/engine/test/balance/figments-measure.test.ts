// @ts-nocheck (a measuring tool)
// Classes 3.0 step 8 (rules 1.34): the Figments line measured (figments-measure.ts), the door and the Rigger, normal
// share and all in, at levels 1, 5, 10, 20, against `rules.json balance.ceilings.figments`. A REPORT, not a fit
// (the step's hand-off holds the table). FIG_MEASURE_N fights a cell (default 4: the smallest sample).
import { describe, it, expect } from 'vitest';
import { figmentCell } from './figments-measure';
import RULES from '../../../../data/rules.json';

const N = Number((globalThis as any).process?.env?.FIG_MEASURE_N) || 4;
const LV = [1, 5, 10, 20];
describe('Figments: the measured line (a report)', () => {
  it('the door and the Rigger, normal share and all in, at levels 1, 5, 10, 20', () => {
    const C = (RULES as any).balance.ceilings.figments, rows: string[] = [];
    const lines: Record<string, number[]> = {};
    for (const [name, variant, door] of [['door normal', 'normal', true], ['door all in', 'allin', true], ['Rigger normal', 'normal', false], ['Rigger all in', 'allin', false]] as const) {
      const cells = LV.map((l) => figmentCell('rigger', variant, l, N, door));
      lines[name] = cells.map((c) => c.all);
      rows.push(name.padEnd(14) + cells.map((c, i) => 'L' + LV[i] + ' ' + c.all + ' (D ' + c.d + ' + S ' + c.s + ')').join(' | ') + ' | mean ' + Math.round(cells.reduce((t, c) => t + c.all, 0) / cells.length));
    }
    (globalThis as any).console?.log?.('\nFigments (rules 1.34), % of the plain rifle-turn; lines: door ' + C.door_normal + ' / ' + C.door_allin + ', Rigger ' + C.class_normal + ' / ' + C.allin + '\n' + rows.join('\n'));
    for (const v of Object.values(lines)) for (const x of v) expect(x).toBeGreaterThan(0);
  });
});
