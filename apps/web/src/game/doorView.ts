// The doors on the fight screen (0.29 onboarding; the nine doors audit, 15 Nov 2026): each attribute's alpha skill is a
// door, and skills.json gives it a `door_line` (its one-line "how this works") and a `door_tab` (the fight tab that holds
// its actions). This is the ONE reader of them, for the three places that show a door: the tab's header line, the
// first-fight tip (tips.tsx), and the tab a character's first turn opens on (screens/combat.js). Nothing here is a rule:
// the line is data, a number in it is a {token} filled from the engine's own constant, and whether an action can be used
// now is the engine's own refusal on the row (commands.ts actionGroups).
import { SKILLS, CLASS, SIGIL_GRAMMAR } from '@engine';
import type { ActionGroup } from './commands';

/** The numbers a door line may name, as {token}s: the engine's own constants, never typed into the data text. */
export const DOOR_TOKENS: Record<string, number> = { line_min: Number(SIGIL_GRAMMAR.min_glyphs), line_max: Number(SIGIL_GRAMMAR.max_glyphs) };
const fill = (t: string) => t.replace(/\{(\w+)\}/g, (m, k) => (k in DOOR_TOKENS && Number.isFinite(DOOR_TOKENS[k]) ? String(DOOR_TOKENS[k]) : m));

export interface Door { skill: string; name: string; attribute: string; line: string; tab: string | null }

/** Every door the data describes, in the data's order (an alpha skill with a `door_line`). */
export const DOORS: Door[] = (SKILLS as any[]).filter((s) => s.slot === 'alpha' && typeof s.door_line === 'string' && s.door_line)
  .map((s) => ({ skill: s.id, name: s.name, attribute: s.attribute, line: fill(s.door_line), tab: s.door_tab || null }));

const pointsOf = (ch: any, skill: string): number => Number(ch?.skills?.[skill]) || 0;

/** A class's own job on a door (prayer 2.0: the Chaplain's Canticle): a base class's gain with a `door_line`. */
export interface ClassDoor { cls: string; id: string; name: string; line: string }
/** Every class gain the data gives a door line, in the data's order. */
export const CLASS_DOORS: ClassDoor[] = Object.values(CLASS as any).flatMap((c: any) => ((c?.gain || []) as any[])
  .filter((g) => typeof g?.door_line === 'string' && g.door_line).map((g) => ({ cls: String(c.id), id: String(g.id), name: String(g.name || g.id), line: fill(String(g.door_line)) })));
/** The class doors a character holds (its class is that class). */
export const classDoorsOf = (ch: any): ClassDoor[] => CLASS_DOORS.filter((d) => !!ch && ch.classId === d.cls);

/** The doors a character has opened (1 point or more in the skill). */
export const doorsOf = (ch: any): Door[] => DOORS.filter((d) => pointsOf(ch, d.skill) > 0);
/** The character has this door (1 or more points in its skill). */
export const hasDoor = (ch: any, skill: string): boolean => pointsOf(ch, skill) > 0;
/** A door's one line by its skill ('' when the skill has none). */
export const doorLineOf = (skill: string): string => DOORS.find((d) => d.skill === skill)?.line || '';

/** The character's top door: the door skill it has the most points in (1 or more); a tie goes to the first in the data's
 *  order. A door with no tab of its own (Momentum, Pressure: their actions are on Attack) is still the top door: its tip
 *  shows, and its first turn keeps the usual rule. */
export function topDoor(ch: any): Door | null {
  let best: Door | null = null, n = 0;
  for (const d of DOORS) { const p = pointsOf(ch, d.skill); if (p > n) { best = d; n = p; } }
  return best;
}

/** The header line of a fight tab: the door whose tab it is (null for any other tab). */
export const tabDoorLine = (tab: string | null | undefined): Door | null => DOORS.find((d) => !!tab && d.tab === tab) || null;

/** The tab a character's first turn of a fight opens on (round 1): its top door's tab, when that tab is offered and its
 *  first action (the door's own verb: Draw, Begin, a prayer; a read-only row, isInfo, is skipped) is one the engine allows
 *  now (a row with no refusal: a Sigilist with the Evoker only in the pack does not open on Sigils for its Scuff). Null
 *  otherwise (and after the first round), so the screen's usual rule runs (the tab used last, Attack with a hostile in
 *  sight, Move). */
export function firstTurnTab(cb: any, ch: any, groups: ActionGroup[], isInfo: (key: string) => boolean = () => false): string | null {
  if (!cb || !(cb.round <= 1) || !ch) return null;
  const d = topDoor(ch); if (!d || !d.tab) return null;
  const gr = groups.find((x) => x[3] === d.tab);
  const first = gr ? gr[1].find((it) => !isInfo(it[0])) : null;
  return first && !first[4] ? d.tab : null;
}
