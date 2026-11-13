// THE MODE AND THE RUN (rules 1.39; docs/design/survival-spec.md rules 1 to 4 and 36, section 8.1; Survival build step 1).
//
// A room plays one MODE, chosen in its lobby (`settings.play`, the `settings` action, host only): `survival`,
// `roguelike` or `campaign` (data/modes.json; only Survival is open). A Survival room starts a RUN (`run/start`) instead
// of a story (`session/start`): the run's state is `g.run`, beside `g.campaign`, changed only by `run/*` actions through
// the one reducer (game.ts `reduce`), so the event log is the save and a room left and loaded resumes in its mode.
// What is here is the state and the refusals; the path map (step 2), the encounters (step 3), the shop (step 4) and the
// stages (step 5) fill the fields this file declares empty.
import '../datatext'; // fills the texts' {=placeholders} before any data is read
import modesJ from '../../../../data/modes.json';
import { seedFrom } from '../rng';

/** A mode a room can play (data/modes.json ids). */
export type PlayMode = 'survival' | 'roguelike' | 'campaign';
/** One row of data/modes.json: a card of the lobby's mode picker. `available: false` locks it, and `coming` says why. */
export interface ModeDef { id: PlayMode; name: string; line: string; art: string | null; art_pending?: boolean; available: boolean; narrator: 'optional' | 'required'; start: 'run' | 'session'; coming: string | null }
/** The three modes in the picker's order (data/modes.json items). */
export const MODES: ModeDef[] = (modesJ as any).items;
/** The mode a new room selects (data/modes.json default: Survival). */
export const DEFAULT_PLAY: PlayMode = (modesJ as any).default;
/** The mode a save written before modes existed reads (data/modes.json old_save: Campaign, the only thing it could be). */
export const OLD_SAVE_PLAY: PlayMode = (modesJ as any).old_save;
/** A mode's row by id, or undefined. */
export const modeOf = (id: string | null | undefined): ModeDef | undefined => MODES.find((m) => m.id === id);
/** The mode a room plays: its `settings.play`, or the old-save mode when the room was saved before there were modes. */
export const playOf = (g: { settings: { play?: PlayMode } }): PlayMode => g.settings.play || OLD_SAVE_PLAY;

/** Where a run stands. `map`: choosing the next node; `boon` and `tile`: after a Boss (the boon pick, then the next
 * tile); `over`: lost or retired, the summary. Steps 2 to 5 add the node states (a fight, rewards, a shop…). */
export type RunPhase = 'map' | 'boon' | 'tile' | 'over';
/** A node of a stage's path map (spec section 9's shape, so a node can later hold a designed room). Written by the
 * path map generator (step 2); empty until then. */
export interface RunNode { id: string; depth: number; col: number; kind: string; setting: string; links: string[]; room: null }
/** A tile of the world the party walks (rule 32): a stage's setting and its boon pool. */
export interface RunTile { id: string; setting: string; stage: number; links: string[]; boons: string[] }
/** How a run ended (rule 4): lost (the whole party down) or retired after a Boss; the score it keeps. */
export interface RunEnd { how: 'lost' | 'retired'; stage: number; cleared: number; nodes: number; levels: Record<string, number> }
/** A Survival run (rule 36): `g.run`. Every field is changed only by a `run/*` action. */
export interface RunState {
  /** The run's seed: every stage's map and every node's content come from it through named streams (rule 12). */
  seed: string;
  /** The stage, from 1; a stage is `stage.length` nodes, the last its Boss (rule 3). */
  stage: number;
  /** The world's tiles walked so far, this stage's last (rule 32). */
  world: RunTile[];
  /** This stage's path map (rules 7 to 9; step 2). */
  nodes: RunNode[];
  /** The node the party stands on (null before the first). */
  at: string | null;
  /** Node ids walked, in order, every stage (the summary's path). */
  path: string[];
  /** Where the run stands. */
  state: RunPhase;
  /** Each player's mark on a reachable node (rule 11), by player id. */
  leans: Record<string, string>;
  /** Each player's "ready" (leaving a shop or a Forge together), by player id. */
  ready: Record<string, boolean>;
  /** The picks on offer at this node (rewards, boons, tiles), by character id; null when none. */
  offers: Record<string, unknown> | null;
  /** The shop or Forge open at this node; null when none (step 4). */
  shop: unknown | null;
  /** The fights' tally for Report a run (rule 35; step 6). */
  stats: { fights: unknown[] };
  /** Characters out of the fight under way (dead in it: rule 5), by id. */
  out: string[];
  /** XP past level 20, counted to the score (rule 6). */
  renown: number;
  /** How the run ended, once it has. */
  end?: RunEnd;
}

/** A fresh run at stage 1 with nothing walked (rule 36's fields; the map comes with step 2). */
export function newRun(seed: string): RunState {
  return { seed, stage: 1, world: [], nodes: [], at: null, path: [], state: 'map', leans: {}, ready: {}, offers: null, shop: null, stats: { fights: [] }, out: [], renown: 0 };
}
/** A run's seed when the host gives none: from the room's code and its action count, so it is the same on a replay and
 * different for each run a room starts. "PHC-" and six letters and digits. */
export function runSeed(code: string, seq: number): string {
  return 'PHC-' + (seedFrom(code + '#' + seq) >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6);
}
/** The words for a mode that can't be picked (its data's `coming`), or null when it can. */
export function modeLocked(id: string): string | null {
  const m = modeOf(id); if (!m) return 'No such mode: ' + id + '.';
  return m.available ? null : m.name + ' is not open yet. ' + (m.coming || 'Coming later.');
}

/** What a character in a run needs, said in words (rule 2): one a player, every one level 1. */
interface Seat { id: string; name: string; level: number; owner: string }
interface Who { id: string; name: string; online: boolean }
/** Why `run/start` can't start the run now, or null (rule 2, section 8.1 item 9). `by` is the player asking. */
export function runStartProblem(g: { hostId: string; phase: string; settings: { play?: PlayMode }; players: Who[]; characters: Record<string, Seat>; run?: RunState | null }, by: string): string | null {
  if (by !== g.hostId) return 'Only the host starts the run.';
  if (g.run && g.run.state !== 'over') return 'The run is under way.';
  if (g.phase !== 'lobby') return 'The room has already started.';
  const play = playOf(g); if (play !== 'survival') return 'This room plays ' + (modeOf(play)?.name || play) + ': pick Survival to start a run.';
  const seats = Object.values(g.characters); if (!seats.length) return 'Lock in a character to start.';
  for (const p of g.players) {
    const mine = seats.filter((c) => c.owner === p.id);
    if (mine.length > 1) return 'Survival is one character a player: ' + p.name + ' has ' + mine.length + '. Take one back.';
    if (!mine.length && p.online) return 'Everyone plays: ' + p.name + ' has no character locked in yet.';
  }
  const high = seats.find((c) => c.level !== 1); if (high) return 'Survival starts at level 1: ' + high.name + ' is level ' + high.level + '.';
  return null;
}
/** Why `run/retire` can't end the run now, or null (rule 4: the host, after a Boss). */
export function runRetireProblem(g: { hostId: string; run?: RunState | null }, by: string): string | null {
  const r = g.run; if (!r) return 'No run is under way.';
  if (by !== g.hostId) return 'Only the host retires the run.';
  if (r.state === 'over') return 'The run is over.';
  if (r.state !== 'boon' && r.state !== 'tile') return 'You retire after a Boss: beat this stage\'s Boss first.';
  return null;
}
/** The run's end and its score (rule 4): stages cleared (a retire comes after a Boss, so the stage under way counts),
 * nodes walked, each character's level. */
export function endRun(r: RunState, how: RunEnd['how'], levels: Record<string, number>): RunState {
  const cleared = how === 'retired' ? r.stage : r.stage - 1;
  return { ...r, state: 'over', leans: {}, ready: {}, offers: null, shop: null, end: { how, stage: r.stage, cleared, nodes: r.path.length, levels } };
}
