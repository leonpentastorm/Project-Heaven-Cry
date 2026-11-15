// The doors on the fight screen (0.29 onboarding; the nine doors audit, 15 Nov 2026): each attribute's alpha skill is a
// door, and skills.json gives it a `door_line` (its one-line "how this works") and a `door_tab` (the fight tab that holds
// its actions). One module reads them for the three places that show a door: the tab's header line, the first-fight
// tip, and the tab a character's first turn opens on. Nothing here is a rule: the line is data, and whether an action
// can be used now is the engine's own refusal on the row (commands.ts actionGroups).
import { SKILLS } from '@engine';
import type { ActionGroup } from './commands';

export interface Door { skill: string; name: string; attribute: string; line: string; tab: string | null }

/** Every door the data describes, in the data's order (an alpha skill with a `door_line`). */
export const DOORS: Door[] = (SKILLS as any[]).filter((s) => s.slot === 'alpha' && typeof s.door_line === 'string' && s.door_line)
  .map((s) => ({ skill: s.id, name: s.name, attribute: s.attribute, line: s.door_line, tab: s.door_tab || null }));

const pointsOf = (ch: any, skill: string): number => Number(ch?.skills?.[skill]) || 0;

/** The doors a character has opened (1 point or more in the skill). */
export const doorsOf = (ch: any): Door[] => DOORS.filter((d) => pointsOf(ch, d.skill) > 0);

/** The character's top door with a tab: the most points; a tie goes to the first in the data's order. */
export function topDoor(ch: any): Door | null {
  let best: Door | null = null, n = 0;
  for (const d of DOORS) { const p = pointsOf(ch, d.skill); if (d.tab && p > n) { best = d; n = p; } }
  return best;
}

/** The header line of a fight tab: the line of the door whose tab it is ('' for any other tab). */
export const tabDoorLine = (tab: string): Door | null => DOORS.find((d) => d.tab === tab) || null;

/** The tab a character's first turn of a fight opens on: its top door's tab, when that tab is offered and has an action
 *  the engine allows now (a row with no refusal). Null otherwise (and after the first round), so the usual rule runs. */
export function firstTurnTab(cb: any, ch: any, groups: ActionGroup[]): string | null {
  if (!cb || !(cb.round <= 1)) return null;
  const d = topDoor(ch); if (!d || !d.tab) return null;
  const gr = groups.find((x) => x[3] === d.tab);
  return gr && gr[1].some((it) => !it[4]) ? d.tab : null;
}
