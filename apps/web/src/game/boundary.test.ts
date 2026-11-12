// The client's boundary with the engine, as a lint (engine review 4, findings 1, 2 and 9). The engine owns every rule
// and number; the client renders. This fails when someone goes round the engine's own answers again:
//   - binding the game by hand (bindGame) instead of asking through the engine's preview (withGame, dryRun, preview);
//   - copying a fight by hand for a dry run, or setting an action's switches on the fight a screen holds;
//   - hiding units from a preview by their names;
//   - typing a basic action's AP cost into a row or into the cost of the picked action.
// What to do instead is in docs/design/handoffs/client-boundary-1.md ("How to add an action").
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const FILES = walk(SRC).filter((p) => /\.(ts|tsx|js)$/.test(p) && !/\.test\.(ts|tsx)$/.test(p) && !/[\\/]templates[\\/]/.test(p));
const read = (p: string) => readFileSync(p, 'utf8');
const rel = (p: string) => p.slice(SRC.length);
const hits = (re: RegExp, only?: RegExp) => FILES.filter((p) => !only || only.test(p)).flatMap((p) => read(p).split('\n').map((l, i) => (re.test(l) ? rel(p) + ':' + (i + 1) : '')).filter(Boolean));

describe('the client asks the engine; it does not go round it', () => {
  it('nobody binds the game by hand', () => {
    expect(hits(/\bbindGame\s*\(/)).toEqual([]);
  });
  it('nobody copies a fight by hand for a dry run', () => {
    // the shape of the three old copies: units mapped to shallow copies with their conds or saves spread
    expect(hits(/units\.map\(\(\w+(: any)?\) => \(\{ \.\.\.\w+, (saves|conds): /)).toEqual([]);
  });
  it('nobody sets an action\'s switches on a fight (cb.mods is the reducer\'s and the engine preview\'s)', () => {
    expect(hits(/\b(cb|c|pcb|cbx)\.mods\s*=[^=]/)).toEqual([]);
  });
  it('nobody hides units from a preview by matching their names in its sentences', () => {
    expect(hits(/unseenNames|\.includes\(nm\)/)).toEqual([]);
  });
  it('the action list and the fight screen type in no basic action\'s cost', () => {
    const cmds = read(join(SRC, 'game', 'commands.ts')), combat = read(join(SRC, 'screens', 'combat.js'));
    // a row of the basic actions: ['shove', 'Shove', '2 AP', …]
    expect(cmds.match(/\['(move|sprint|disengage|prone|shove|cover|pickup|door|stim|song|extinguish|escape|recover|hide|analyze)', '[^']+', '[^']*AP/g) || []).toEqual([]);
    // the picked action's cost: S.action === 'shove' ? 2
    expect(combat.match(/S\.action === '(shove|hide|escape|song|stim|door|prone|extinguish|pickup|sprint|disengage)'[^?:]{0,80}\? \d\b/g) || []).toEqual([]);
    expect(combat).not.toMatch(/SHOVE · \d AP/);
  });
  it('the Perks tab reads no registry and no card prose', () => {
    const src = read(join(SRC, 'game', 'perkShelves.ts'));
    for (const banned of ['handlerOf', 'genericOf', 'actionDefs', 'holdersOf', 'RegExp(', '.exec(']) expect(src.includes(banned), banned).toBe(false);
  });
});
