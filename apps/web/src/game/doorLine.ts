// The door line (nine doors audit, 0.29; data/CONVENTIONS.md "The door line"): a door's alpha skill in data/skills.json
// may carry `door_line` (one sentence: how the door is used) and `door_tab` (the fight tab it lives on). The tab's
// header, the first-fight tip (tips.tsx) and the first turn's tab (screens/combat.js) read it from here. Nothing here is
// a rule: the line is data, its numbers are the engine's constants, and the tab is chosen from the engine's own rows
// (a row with a reason is not usable).
import { SKILLS, SIGIL_GRAMMAR } from '@engine';

/** The numbers a door line may name, as {token}s: the engine's own constants, never typed into the data text. */
export const DOOR_TOKENS: Record<string, number> = { line_min: Number(SIGIL_GRAMMAR.min_glyphs), line_max: Number(SIGIL_GRAMMAR.max_glyphs) };
const fill = (t: string) => t.replace(/\{(\w+)\}/g, (m, k) => (k in DOOR_TOKENS && Number.isFinite(DOOR_TOKENS[k]) ? String(DOOR_TOKENS[k]) : m));

export interface Door { skill: string; name: string; tab: string; line: string }
/** Every door that has a line, in skills.json order. */
export const DOORS: Door[] = SKILLS.filter((s) => s.door_line && s.door_tab).map((s) => ({ skill: s.id, name: s.name, tab: s.door_tab as string, line: fill(s.door_line as string) }));
/** The door a fight tab belongs to (its header line), or null. */
export const doorOfTab = (tab: string | null | undefined): Door | null => DOORS.find((d) => d.tab === tab) || null;
/** The character's top door: the door skill it has the most points in (1 or more); a tie goes to skills.json order. */
export function topDoor(ch: any): Door | null {
  let best: Door | null = null, n = 0;
  for (const d of DOORS) { const p = Number(ch?.skills?.[d.skill] || 0); if (p > n) { best = d; n = p; } }
  return best;
}
/** The character has this door (1 or more points in its skill). */
export const hasDoor = (ch: any, skill: string) => Number(ch?.skills?.[skill] || 0) > 0;

/** The tab a character's FIRST turn of a fight opens on (round 1): its top door's tab, when the tab is there and its
 *  first action is usable now (the engine gave it no reason: a Sigilist with an Evoker in hand and no Line yet can
 *  Draw). Null otherwise: the screen's usual rule decides (the last tab used, Attack with a hostile in sight, Move). */
export function firstTurnTab(cb: any, ch: any, groups: { id: string; items: { key: string; why?: string | null }[] }[], isInfo: (k: string) => boolean = () => false): string | null {
  if (!cb || cb.round !== 1 || !ch) return null;
  const d = topDoor(ch); if (!d) return null;
  const gr = groups.find((x) => x.id === d.tab); if (!gr) return null;
  const first = gr.items.find((it) => !isInfo(it.key));
  return first && !first.why ? d.tab : null;
}
