// The right panel by mode (rules 1.54 item 11; ui-screens.md "The three columns (every mode)"): the ONE panel registry.
// What a mode's right panel holds is data (data/modes.json: each mode's `panels`, the Proving Ground's `proving_ground`,
// the names in `panel_names`); this file maps each id to what draws it. Every mode has a right panel; a mode chooses
// which modules it holds, never whether. The modules keep their grips and their drag order (storyPanels.ts, a
// per-browser preference for each list).
import { MODES, playOf, type GameState } from '@engine';
import modesJ from '../../../../data/modes.json';

export type PanelId = 'mana' | 'map' | 'quests' | 'squad' | 'run' | 'run_board';
/** Each panel id to what draws it: `template`, the play screen's own markup (main.template.html, its values from
 * screens/main.js); `slot`, a React view (runPanels.tsx) portalled into the template's [data-phc-panel-slot="<id>"]. */
export const PANEL_DRAW: Record<PanelId, 'template' | 'slot'> = { mana: 'template', map: 'template', quests: 'template', squad: 'template', run: 'slot', run_board: 'slot' };
export const PANEL_IDS = Object.keys(PANEL_DRAW) as PanelId[];
export const isPanelId = (x: unknown): x is PanelId => typeof x === 'string' && x in PANEL_DRAW;
const M = modesJ as unknown as { panel_names: Record<string, string>; proving_ground: { panels: string[] }; items: { id: string; panels: string[]; hides?: string[] }[] };
/** Each panel's name (the grip's words), from data. */
export const PANEL_NAME: Record<string, string> = M.panel_names;
/** The Proving Ground's list (a tool, not a mode card: its own entry in data/modes.json). */
export const PROVING_GROUND_PANELS = M.proving_ground.panels.filter(isPanelId);

/** What the play screen's right panel holds now, and what the sheet hides: the Proving Ground's list, the mode's own in
 * a run, else the story's (the campaign's: a story without a run). `key`: the list's name, for its stored order. */
export interface PanelList { key: string; list: PanelId[]; hides: string[] }
export function panelsOf(g: Pick<GameState, 'settings' | 'sandbox' | 'run'> | null | undefined): PanelList {
  if (g?.sandbox) return { key: 'proving_ground', list: PROVING_GROUND_PANELS, hides: [] };
  const id = g && g.run ? playOf(g) : 'campaign', mode = MODES.find((m) => m.id === id) || MODES.find((m) => m.id === 'campaign')!;
  const row = M.items.find((m) => m.id === mode.id);
  return { key: mode.id, list: (mode.panels || []).filter(isPanelId), hides: row?.hides || [] };
}
/** The story's area map (the header's AREA MAP button and the M key) is offered where the mode's list holds the map
 * module: the story and the Proving Ground, never a run (ui-screens.md "The three columns": no area map in Survival). */
export const offersAreaMap = (g: Pick<GameState, 'settings' | 'sandbox' | 'run'> | null | undefined): boolean => panelsOf(g).list.includes('map');
