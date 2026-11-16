// DOOR PICKS (rules 1.56, Figments 2.0; the lead's approval of the design's P8: "one fork action for every door").
// A door (a skill's system: Visualization's Figments now, Bonds later) may open a choice: a list of options from its
// data, one (or n) to be taken now, the rest perhaps later. This file is the one general piece: each door registers
// what it offers a character (its grants: each a list of option ids and how many of them it gives), the character
// keeps what it took (`Character.doorPicks[door]`, kept for good), and the reducer's one action `door/pick` takes one
// (game.ts). What an option IS (a form, a Bond kind…) is the door's own data; nothing here names a door.
import './datatext';
import type { Character } from './character';
import forksJ from '../../../data/forks.json';
import { SKILLS } from './data';

/** One option of a grant, as the screens show it (its icon: a catalog id, '' for none). */
export interface DoorOption { id: string; label: string; icon: string; /** its rule, as the picker shows it (rules 1.60) */ text?: string }
/** What a door offers: grants in order, each `n` picks from `of` (its option ids), opened by `why` (a sentence). */
export interface DoorGrant { id: string; of: string[]; n: number; why: string }
/** A door's registration: its grants for this character (the ones its points have opened), and its option rows. */
export interface DoorPickSource { grants: (c: Character) => DoorGrant[]; option: (id: string) => DoorOption | null; name: string;
  /** Rules 1.60 (N1): the door's fork steps for the view (doorForkView): each at its points, its options (shelved ones
   *  too, so the screens can say what is missing) and whether it is offered. A door with none shows no forks. */
  steps?: (c: Character | null) => DoorStep[]; /** what its forks run on (the door's own resource), as words */ runsOn?: string; /** the skill whose points open the steps */ skill?: string }
/** One fork step of a door: at these points of its skill, one of `of`; `offered` false while an option is not built. */
export interface DoorStep { id: string; at: number; of: string[]; offered: boolean }
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


// ---------------------------------------------------------------------------------------------- the data forks (N1)
// Rules 1.60 (Doors 3.0; the lead's approval N1, 16 Nov 2026): every alpha skill's two fork steps are data
// (skills.json `forks`: [{id, at, of: [two option ids]}], `fork_runs_on`), each option a row of data/forks.json: a door
// verb held only by a sheet that picked it (`requires: [{door_pick: <id>}]`, effects/collect.ts meetsRequires), so a
// picked option's rows run like any carried row. A row marked `shelved` is not built (its rule waits on a primitive not
// approved, or on its step's other option): a step is offered only when every option of it is built. No door is named
// in code: each skill with `forks` registers itself here. Figments registers its own (figments.ts: its options are forms).
const FORK_ROWS: Record<string, any> = Object.fromEntries(((forksJ as any).items || []).map((x: any) => [x.id, x]));
/** A fork option's data row (forks.json), or null. */
export const forkRow = (id: string): any | null => FORK_ROWS[id] || null;
/** Every fork option id in the data (the closed list the predicates door_pick / no_door_pick take). */
export const forkIds = (): string[] => Object.keys(FORK_ROWS);
/** Is this fork option built (its row is not shelved)? */
export const forkBuilt = (id: string): boolean => !!FORK_ROWS[id] && !FORK_ROWS[id].shelved;
/** Every option a character picked, at every door (kept for good): what `requires: door_pick` and the predicates read. */
export const allDoorPicks = (c: Character | null | undefined): string[] => Object.values(((c as any)?.doorPicks || {}) as Record<string, string[]>).flat();
/** Did this character pick this option (any door)? */
export const pickedFork = (c: Character | null | undefined, id: string): boolean => allDoorPicks(c).includes(id);
for (const sk of SKILLS as any[]) {
  if (!Array.isArray(sk.forks) || !sk.forks.length) continue;
  const name = String(sk.door_title || sk.name), steps = (sk.forks as any[]).map((f) => ({ id: String(f.id), at: Number(f.at), of: (f.of as string[]).map(String) }));
  const offered = (of: string[]) => of.every(forkBuilt), label = (id: string) => FORK_ROWS[id]?.name || id;
  registerDoorPicks(sk.id, {
    name, skill: sk.id, runsOn: String(sk.fork_runs_on || ''),
    grants: (c) => steps.filter((f) => ((c?.skills as any)?.[sk.id] || 0) >= f.at && offered(f.of))
      .map((f) => ({ id: 'fork:' + f.id, of: [...f.of], n: 1, why: sk.name + ' ' + f.at + ': choose one of ' + f.of.map(label).join(' or ') + ' (kept for good).' })),
    option: (id) => { const r = FORK_ROWS[id]; return r && r.door === sk.id && !r.shelved ? { id, label: r.name, icon: r.icon || '', text: r.text || '' } : null; },
    steps: () => steps.map((f) => ({ ...f, offered: offered(f.of) })),
  });
}

/** One option as the fork view shows it. */
export interface ForkOptionView { id: string; name: string; text: string; icon: string; built: boolean; why: string; picked: boolean }
/** One step of a door's forks as the screens show it. */
export interface ForkStepView { id: string; at: number; open: boolean; offered: boolean; options: ForkOptionView[]; picked: string | null; pending: boolean; missing: string[]; why: string }
/** A door's forks for one character (the fight tab's chips, the sheet's card, the level-up card all read this one view). */
export interface DoorForkView { door: string; name: string; skill: string; points: number; runsOn: string; steps: ForkStepView[]; picked: ForkOptionView[]; pending: number }
/** Rules 1.60 (N1): THE view of a door's forks: each step at its points (open or not yet), offered or not (a step whose
 * option is not built says which), its options with their rules, the one picked; what is still to choose. Null for a
 * door with no forks. Read by the door's fight tab, the sheet and the level-up card (one reader of the data). */
export function doorForkView(c: Character | null | undefined, door: string): DoorForkView | null {
  const src = DOORS[door]; if (!src?.steps) return null;
  const skill = src.skill || door, points = Number(((c as any)?.skills || {})[skill] || 0), picks = c ? doorPicksOf(c, door) : [], kept = c ? doorKeptOf(c, door) : [];
  const open = c ? pendingDoorPicks(c as Character, door) : [];
  const opt = (id: string): ForkOptionView => {
    const o = src.option(id), r = FORK_ROWS[id];
    return { id, name: o?.label || r?.name || id, text: o?.text || r?.text || '', icon: o?.icon || r?.icon || '', built: !!o, why: o ? '' : String(r?.why || ''), picked: picks.includes(id) || kept.includes(id) };
  };
  const steps = src.steps(c || null).map((st) => {
    const options = st.of.map(opt), picked = options.find((o) => o.picked)?.id || null, isOpen = points >= st.at;
    const pending = isOpen && st.offered && open.some((p) => p.grant === 'fork:' + st.id);
    const missing = options.filter((o) => !o.built).map((o) => o.name);
    const why = !st.offered ? 'Not offered yet: ' + missing.join(' and ') + (missing.length > 1 ? ' are' : ' is') + ' still to be built.' : !isOpen ? 'Opens at ' + src.name + ' ' + st.at + '.' : pending ? 'Still to do: choose one, kept for good.' : picked ? 'Chosen, kept for good.' : '';
    return { id: st.id, at: st.at, open: isOpen, offered: st.offered, options, picked, pending, missing, why };
  });
  return { door, name: src.name, skill, points, runsOn: src.runsOn || '', steps, picked: steps.flatMap((s) => s.options.filter((o) => o.picked)), pending: steps.filter((s) => s.pending).length };
}
/** Every door's fork view for a character, in the data's order (doors with forks only). */
export const doorForkViews = (c: Character | null | undefined): DoorForkView[] => doorsWithPicks().map((d) => doorForkView(c, d)).filter((v): v is DoorForkView => !!v);
