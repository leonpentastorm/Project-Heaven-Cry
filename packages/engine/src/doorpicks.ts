// DOOR PICKS (rules 1.56, Figments 2.0; the lead's approval of the design's P8: "one fork action for every door").
// A door (a skill's system: Visualization's Figments now, Bonds later) may open a choice: a list of options from its
// data, one (or n) to be taken now, the rest perhaps later. This file is the one general piece: each door registers
// what it offers a character (its grants: each a list of option ids and how many of them it gives), the character
// keeps what it took (`Character.doorPicks[door]`, kept for good), and the reducer's one action `door/pick` takes one
// (game.ts). What an option IS (a form, a Bond kind…) is the door's own data; nothing here names a door.
import type { Character } from './character';

/** One option of a grant, as the screens show it (its icon: a catalog id, '' for none). */
export interface DoorOption { id: string; label: string; icon: string }
/** What a door offers: grants in order, each `n` picks from `of` (its option ids), opened by `why` (a sentence). */
export interface DoorGrant { id: string; of: string[]; n: number; why: string }
/** A door's registration: its grants for this character (the ones its points have opened), and its option rows. */
export interface DoorPickSource { grants: (c: Character) => DoorGrant[]; option: (id: string) => DoorOption | null; name: string }
const DOORS: Record<string, DoorPickSource> = {};
/** Register a door's picks (once, by the door's own file). */
export const registerDoorPicks = (door: string, src: DoorPickSource): void => { DOORS[door] = src; };
/** The doors that have picks. */
export const doorsWithPicks = (): string[] => Object.keys(DOORS);
/** What this character took at this door (in the order taken). */
export const doorPicksOf = (c: Character | null | undefined, door: string): string[] => [...((c as any)?.doorPicks?.[door] || [])];
/** What it holds at this door outside every grant (a save migration's: what an older ladder gave it); never counted
 * against a grant, so the grants' picks stay to be had. */
export const doorKeptOf = (c: Character | null | undefined, door: string): string[] => [...((c as any)?.doorKept?.[door] || [])];

/** A grant still open: its options not yet taken, and how many picks are left of it. */
export interface DoorPending { door: string; grant: string; left: number; options: DoorOption[]; why: string }
/** The grants of this door with picks left, in order. Each taken option counts against the first grant (in order)
 * that offers it and still has room; a taken option no grant offers counts against none. */
export function pendingDoorPicks(c: Character, door: string): DoorPending[] {
  const src = DOORS[door]; if (!src) return [];
  const grants = src.grants(c).map((g) => ({ ...g, used: 0 })), picked = doorPicksOf(c, door), taken = [...picked, ...doorKeptOf(c, door)];
  for (const t of picked) { const g = grants.find((x) => x.of.includes(t) && x.used < x.n); if (g) g.used++; }
  return grants.filter((g) => g.used < g.n).map((g) => ({ door, grant: g.id, left: g.n - g.used, why: g.why,
    options: g.of.filter((o) => !taken.includes(o)).map((o) => src.option(o)).filter((o): o is DoorOption => !!o) }))
    .filter((p) => p.options.length > 0);
}
/** Every door's open grants for this character (the level-up card and the door's tab read this). */
export const allPendingDoorPicks = (c: Character): DoorPending[] => doorsWithPicks().flatMap((d) => pendingDoorPicks(c, d));
/** Why this option can't be taken now at this door (null: it can). */
export function doorPickWhy(c: Character | null | undefined, door: string, option: string): string | null {
  if (!c) return 'No such character.';
  const src = DOORS[door]; if (!src) return 'Nothing to choose there.';
  if (!src.option(option)) return 'No such choice.';
  if (doorPicksOf(c, door).includes(option) || doorKeptOf(c, door).includes(option)) return 'Already chosen.';
  const open = pendingDoorPicks(c, door);
  if (!open.length) return 'No ' + src.name + ' choice is open now.';
  if (!open.some((p) => p.options.some((o) => o.id === option))) return 'Not one of the open choices (' + open.flatMap((p) => p.options.map((o) => o.label)).join(', ') + ').';
  return null;
}
/** Take it (the reducer's door/pick): kept for good. Returns the refusal, or null. */
export function takeDoorPick(c: Character, door: string, option: string): string | null {
  const no = doorPickWhy(c, door, option); if (no) return no;
  const all = { ...((c as any).doorPicks || {}) }; all[door] = [...(all[door] || []), option]; (c as any).doorPicks = all;
  return null;
}
/** The option's row (its label for a log line). */
export const doorOption = (door: string, id: string): DoorOption | null => DOORS[door]?.option(id) || null;
