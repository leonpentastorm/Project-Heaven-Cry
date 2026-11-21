// @ts-nocheck (a measuring tool)
// Classes 3.0 step 8 (rules 1.34): the Figments line measured (figments-measure.ts), the door and the Rigger, normal
// share and all in, at levels 1, 5, 10, 20, in percent of the plain rifle-turn (rules.json measure). A REPORT, not a fit
// (the step's hand-off holds the table). FIG_MEASURE_N fights a cell (default 4: the smallest sample).
import { describe, it, expect } from 'vitest';
import { figmentCell } from './figments-measure';
import { BUILD, BUILDS } from './builds';

const N = Number((globalThis as any).process?.env?.FIG_MEASURE_N) || 1; // the report: FIG_MEASURE_N=4 (the step 8 hand-off)
const LV = [1, 5, 10, 20];
describe('Figments: measured (a report)', () => {
  it('the door and the Rigger, normal share and all in, at levels 1, 5, 10, 20', () => {
    const rows: string[] = [];
    const lines: Record<string, number[]> = {};
    for (const [name, variant, door] of [['door normal', 'normal', true], ['door all in', 'allin', true], ['Rigger normal', 'normal', false], ['Rigger all in', 'allin', false]] as const) {
      const cells = LV.map((l) => figmentCell('rigger', variant, l, N, door));
      lines[name] = cells.map((c) => c.all);
      rows.push(name.padEnd(14) + cells.map((c, i) => 'L' + LV[i] + ' ' + c.all + ' (D ' + c.d + ' + S ' + c.s + ')').join(' | ') + ' | mean ' + Math.round(cells.reduce((t, c) => t + c.all, 0) / cells.length));
    }
    (globalThis as any).console?.log?.('\nFigments (rules 1.34), % of the plain rifle-turn\n' + rows.join('\n'));
    for (const v of Object.values(lines)) for (const x of v) expect(x).toBeGreaterThan(0);
  }, 600_000);
});

// 0.32 (the simulator lane): FIG_032=1 adds the rows the earlier report did not have. The Beast at level 1 (the Rigger
// whose first form is the Beast: the reference build's first is the Wall, so at a normal share it has no Beast at level
// 1), and the four Visualization forks picked (Sharp Light then Many Hands; Hard Light then Masterwork).
const reg = (def: any) => { if (!BUILD[def.id]) { BUILDS.push(def); BUILD[def.id] = def; } return def.id; };
reg({ ...BUILD.rigger, id: 'rigger_beast', label: 'Rigger (the Beast first)', forms: ['beast', 'wall', 'blade', 'eye', 'ward', 'husk', 'sentinel'] });
reg({ ...BUILD.rigger, id: 'rigger_sharp', label: 'Rigger (Sharp Light, Many Hands)', forks: ['fork.figment.sharp_light', 'fork.figment.many_hands'] });
reg({ ...BUILD.rigger, id: 'rigger_hard', label: 'Rigger (Hard Light, Masterwork)', forks: ['fork.figment.hard_light', 'fork.figment.masterwork'] });
describe.runIf((globalThis as any).process?.env?.FIG_032)('Figments: the 0.32 rows (a report)', () => {
  it('the Beast at level 1, and the forks picked', () => {
    const rows: string[] = [];
    for (const [name, build, variant] of [['Rigger normal, Beast first', 'rigger_beast', 'normal'], ['Rigger all in, Beast first', 'rigger_beast', 'allin'], ['Rigger normal, Sharp Light + Many Hands', 'rigger_sharp', 'normal'], ['Rigger all in, Sharp Light + Many Hands', 'rigger_sharp', 'allin'], ['Rigger normal, Hard Light + Masterwork', 'rigger_hard', 'normal'], ['Rigger all in, Hard Light + Masterwork', 'rigger_hard', 'allin']] as const) {
      const cells = LV.map((l) => figmentCell(build, variant, l, N, false));
      rows.push('| ' + name + ' | ' + cells.map((c) => c.all + ' (D ' + c.d + ' + S ' + c.s + ')').join(' | ') + ' | ' + Math.round(cells.reduce((t, c) => t + c.all, 0) / cells.length) + ' |');
    }
    (globalThis as any).console?.log?.('\n| Row | L1 | L5 | L10 | L20 | mean |\n|---|---|---|---|---|---|\n' + rows.join('\n'));
    expect(rows.length).toBe(6);
  }, 3_600_000);
});
