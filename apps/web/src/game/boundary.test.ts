// The client's boundary with the engine, as a lint (engine review 4, findings 1, 2 and 9). The engine owns every rule
// and number; the client renders. This fails when someone goes round the engine's own answers again:
//   - binding the game by hand (bindGame) instead of asking through the engine's preview (withGame, dryRun, preview);
//   - copying a fight by hand for a dry run, or setting an action's switches on the fight a screen holds;
//   - hiding units from a preview by their names;
//   - typing a basic action's AP cost into a row or into the cost of the picked action;
//   - working out sight itself to hide units, glyphs or effects (finding 4: the view is fogged by the engine, fog.ts;
//     docs/design/handoffs/client-boundary-2-fog.md).
//   - building an action, its cost, its legality or its target list on the client (finding 3: every action is the
//     engine's descriptor, game/actionFlow.ts walks it; docs/design/handoffs/client-boundary-3-actions.md).
// What to do instead is in docs/design/handoffs/client-boundary-1.md and client-boundary-3-actions.md ("How to add an action").
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
  it('nobody works out sight to hide what the view holds (the engine fogs the view; fightSight is its sight)', () => {
    // visibility() is the engine's own sight for every side: a screen that asks it is filtering by sight again
    expect(hits(/\bvisibility\s*\(/)).toEqual([]);
    // the old shapes: a unit kept or dropped by whether the side sees it
    expect(hits(/\bseenFoe\b|\.seen\.has\(\w+\.id\)|\.sensed\.has\(\w+\.id\)/)).toEqual([]);
    // glyphs, strokes, placed magic and class marks are not passed a sight filter (the view holds only what is seen)
    expect(hits(/strokeLayer\([^)]*\bseen:|placedView\([^)]*,\s*\w*\.?tiles\s*\)|classMarks\([^)]*\bseen:/)).toEqual([]);
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

  it('the fight screen sends no unit action it built itself: Confirm and a click send the descriptor\'s (finding 3)', () => {
    const combat = read(join(SRC, 'screens', 'combat.js'));
    // what may still be typed: the turn's end, Say and Attempt (words, not actions on the list), a cache's Search (the
    // world layer), and reading a glyph with Analyze (its own path); everything else is sendDescriptor's or the flow's
    const OWN = ['end-turn', 'say', 'attempt', 'search', 'read'];
    const built = [...combat.matchAll(/act\(\{ type: 'combat\/([a-z-]+)'/g)].map((m) => m[1]).filter((t) => !OWN.includes(t));
    expect(built).toEqual([]);
    // and no action literal waits in a variable to be sent either (the old this._tech, _call, _pr, _pk payloads)
    expect(combat).not.toMatch(/payload: \{ type: 'combat\//);
  });
  it('no screen works out an action\'s cost, legality or targets: the descriptor and the engine\'s preview do (finding 3)', () => {
    const SCREENS = /[\\/](screens[\\/](combat|faithCombat)\.js|game[\\/](actionFlow|callView|techView)\.ts)$/; // (commands.ts: the turn card's smartCommands still prints its own costs; client-boundary-3-actions.md, what is left)
    // the old per-system pickers, prompts and previews the flow replaced
    expect(hits(/\b(prayerView|callTakes|callPrompt|callPreviewOf|callReach|techPrompt|techPreview|previewLines|needsEnemy|needsTile|basicCost|attackApCost|previewPerkAction|previewPrayer|previewCall|previewTechnique)\s*\(/, SCREENS)).toEqual([]);
    // the fight screen asks no weapon row, no magic price and no dry run of a spell for a cost
    expect(hits(/\b(weaponActions|glyphCost|ventAp|coreAp|designAp)\s*\(|SPELL_AP\[S\.action\]/, /[\\/]screens[\\/]combat\.js$/)).toEqual([]);
    // the flow itself only asks the engine: it imports the descriptors, their preview and the step rule, nothing else
    const flow = read(join(SRC, 'game', 'actionFlow.ts')), imp = /import \{([^}]*)\} from '@engine'/.exec(flow)![1].split(',').map((x) => x.trim().replace(/^type /, '')).filter(Boolean);
    expect(imp.sort()).toEqual(['ActionDescriptor', 'DescriptorPreview', 'PickStep', 'Picks', 'actionsFor', 'previewDescriptor', 'stepOn']);
  });
});
