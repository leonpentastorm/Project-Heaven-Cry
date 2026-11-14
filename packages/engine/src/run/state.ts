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
import survivalJ from '../../../../data/survival.json';
import { seedFrom } from '../rng';
import type { FightTally } from './tally';
import { type PathNode, pathMap, mapNodes, MAP_DATA } from './map';
import type { ShopState } from './shop';

/** The run's start numbers (data/survival.json `run`: start_credits, dead_return_hp, first_setting; rules 1.41). */
export const survivalRun: { start_credits: number; dead_return_hp: number; first_setting: string } = (survivalJ as any).run;

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

/** Where a run stands. `map`: choosing the next node; `fight`: a fight at the node under way; `reward`: picks waiting
 * after a won fight (offers); `shop`: a shop open full screen at the node (rules 1.42, `shop`); `boon` and `tile`:
 * after a Boss (the stage is cleared; rules 1.44: each character picks a boon, then the squad picks the next tile);
 * `camp`: before node 1 (rules 1.51: each character picks a starting boon, and the camp's issue); `over`: lost or
 * retired. */
export type RunPhase = 'camp' | 'map' | 'fight' | 'reward' | 'shop' | 'boon' | 'tile' | 'over';
/** A node of a stage's path map (spec section 9's shape, so a node can later hold a designed room): run/map.ts. */
export type RunNode = PathNode;
/** A tile of the world the party walks (rule 32): a stage's setting and its boon pool. */
export interface RunTile { id: string; setting: string; stage: number; links: string[]; boons: string[] }
/** How a run ended (rule 4): lost (the whole party down) or retired after a Boss; the score it keeps (rules 1.44: the
 * renown past level 20, each character's boons, the stages' log). */
export interface RunEnd { how: 'lost' | 'retired'; stage: number; cleared: number; nodes: number; levels: Record<string, number>; renown?: number; boons?: Record<string, string[]>; stages?: RunStageLog[] }
/** Rules 1.44: one stage of the run, for the summary (spec rule 35): its tile's setting, the nodes walked, the fights
 * (and won), the foes dropped, the credits the squad earned, the grade steps bought, the boon each character took. */
export interface RunStageLog { stage: number; setting: string; nodes: number; fights: number; won: number; kills: number; credits: number; steps: number; boons: Record<string, string> }
/** One weapon of a pick (rule 26): the weapon or focus, its rarity, its price at that rarity. */
export interface RunWeapon { id: string; rarity: 'standard' | 'fine' | 'masterwork' | 'relic' | 'celestial'; price: number; /** a Relic's named property (rules 1.43) */ prop?: string }
/** A character's pick after a won fight (rule 26): three weapons, or credits instead; `ammo`: the node's ammunition
 * pack count (a picked gun takes its share, rule 23). */
export interface RunOffer { node: string; weapons: RunWeapon[]; instead: number; ammo: number }
/** What the node the party stands on gave (its panel): XP and credits each, the ammunition by character, the text of
 * a node without a fight (data), who came back from the dead (rule 5), the fight's result. */
export interface RunNote { node: string; kind: string; text?: string; xp?: number; credits?: number; ammo?: Record<string, string[]>; back?: string[]; won?: boolean; rounds?: number }
/** One fight of the run (rule 35's beginning: the budget asked and spent, the foes, the result). */
export interface RunFight { node: string; stage: number; depth: number; kind: string; template: string; setting: string; level: number;
  target: { bulk: number; pressure: number; rounds: number }; spent: { bulk: number; pressure: number }; scaleHp: number;
  foes: { name: string; tier: string; level: number; weapon: string; kind?: string; caster?: string; scale?: { hp?: number; damage?: number } }[];
  /** rules 1.51: each character's Sigil and Figment charge as the fight began (run/rewards.ts chargeHeld), for the supply pack's cores */ charge?: Record<string, number>;
  outcome?: 'win' | 'loss'; rounds?: number; /** rules 1.44: the foes dropped (dead, Downed or given up) */ kills?: number; /** rules 1.47: what each character did (run/tally.ts) */ tally?: FightTally }
/** One line of a node's rolled stock (rules 1.43: the Forge's mods and worn pieces): the item, its price, who took it. */
export interface RunStock { id: string; price: number; sold?: string }
/** The safe node the party stands on (rules 1.43, build step 4a): what each character did there this visit and what the
 * node rolled on entry. `steps`: grade steps taken (rule 37's one a visit); `did`: the node's one choice taken (a rest's
 * or a training ground's trainings, the shrine's offer, the Crossroads' trade), by character; `stock`: the Forge's
 * rolled stock; `trades`: the Crossroads' offered trades; `patron`: the shrine's patron. */
export interface RunVisit { node: string; kind: string; steps: Record<string, number>; did: Record<string, number>; stock?: RunStock[]; trades?: string[]; patron?: string;
  /** Rules 1.46: what was done here, newest first (the full-screen place's log strip). */ log?: string[] }
/** An armour-or-item pick (rules 1.43, spec rule 41): three things, at least two lasting; or nothing. */
export interface RunLasting { node: string; items: { id: string; lasting: boolean }[] }
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
  /** The picks on offer after a won fight, by character id; null when none (step 5 adds the boons and tiles). */
  offers: Record<string, RunOffer> | null;
  /** The shop or Forge open at this node; null when none (rules 1.42, run/shop.ts). */
  shop: ShopState | null;
  /** The fights' tally for Report a run (rule 35; step 6 adds the damage by system). */
  stats: { fights: RunFight[] };
  /** Characters dead in the fight under way (rule 5: out for that fight), by id. */
  out: string[];
  /** XP past level 20, counted to the score (rule 6). */
  renown: number;
  /** The last fight's template (a fight never repeats the one before it: rule 21 a). */
  last?: string | null;
  /** What the node the party stands on gave, for its panel. */
  note?: RunNote | null;
  /** How the run ended, once it has. */
  end?: RunEnd;
  /** Rules 1.43: the safe node the party stands on, and what was done there (null elsewhere). */
  visit?: RunVisit | null;
  /** Rules 1.43: the armour-or-item picks waiting (an Elite's, a cache's), by character id; null when none. */
  lasting?: Record<string, RunLasting> | null;
  /** Rules 1.43: what a character has had once a stage (a shrine's token, the wayside shrine), as "what@stage", by id. */
  marks?: Record<string, string[]>;
  /** Rules 1.44: the boons on offer after a Boss (spec rule 30), and rules 1.51's starting boons at the camp, by
   * character id; null when none. */
  boons?: Record<string, string[]> | null;
  /** Rules 1.44: the tiles on offer for the next stage (spec rule 32); null when none. */
  tiles?: RunTile[] | null;
  /** Rules 1.44: each stage's log (the summary), the stage under way last. */
  stages?: RunStageLog[];
}

/** A fresh run at stage 1 with nothing walked: stage 1's tile and its path map from the run's seed (rules 10, 12). */
export function newRun(seed: string): RunState {
  const setting = survivalRun.first_setting, map = pathMap(seed, 1, MAP_DATA, setting);
  return { seed, stage: 1, world: [{ id: 't1', setting, stage: 1, links: [], boons: [] }], nodes: mapNodes(map), at: null, path: [], state: 'map', leans: {}, ready: {}, offers: null, shop: null, stats: { fights: [] }, out: [], renown: 0, last: null, note: null,
    stages: [{ stage: 1, setting, nodes: 0, fights: 0, won: 0, kills: 0, credits: 0, steps: 0, boons: {} }] };
}
/** The setting of the run's current tile (rule 10). */
export const runSetting = (r: RunState): string => r.world[r.world.length - 1]?.setting || survivalRun.first_setting;
/** A node of the current stage by id. */
export const runNode = (r: RunState, id: string | null | undefined): RunNode | undefined => (id ? r.nodes.find((n) => n.id === id) : undefined);
/** The nodes the party can enter next (rule 8): the first row before any, else the links of the node it stands on;
 * none unless the run is on its map. */
export function reachable(r: RunState): RunNode[] {
  if (r.state !== 'map') return [];
  const here = runNode(r, r.at);
  return here ? here.links.map((l) => runNode(r, l)).filter((n): n is RunNode => !!n) : r.nodes.filter((n) => n.depth === 1);
}
/** Why a player can't mark or take this node now, in words, or null (rules 8 and 11). */
export function runMoveProblem(g: { run?: RunState | null; players: Who[] }, by: string, nodeId: string): string | null {
  const r = g.run; if (!r) return 'No run is under way.';
  if (!g.players.some((p) => p.id === by)) return 'Only a player in the room picks the way.';
  if (r.state === 'fight') return 'The fight is on.';
  if (r.state === 'reward') return 'Take your pick first. The squad moves on when everyone has.';
  if (r.state === 'shop') return 'Leave the shop first: everyone marks ready, or the host closes it.';
  if (r.state === 'boon') return 'Pick your boon first. The next tile comes after.';
  if (r.state === 'camp') return 'Choose your starting boon first. The map opens when everyone has.';
  if (r.state === 'tile') return 'Pick the next tile first.';
  if (r.state !== 'map') return 'The stage is over.';
  const n = runNode(r, nodeId); if (!n) return 'There is no such stop on this map.';
  if (!reachable(r).some((x) => x.id === nodeId)) return 'You can\'t reach that ' + String((MAP_DATA.words as any)[n.kind] || 'stop').toLowerCase() + ' from here. Pick a lit stop.';
  return null;
}
/** The node the squad goes to (rule 11), or null while it waits: every connected player has leaned, the node with most
 * leans wins and a tie goes to the host's lean (else the first in map order). `now`: the host goes at once. */
export function leanWinner(g: { hostId: string; run?: RunState | null; players: Who[] }, now = false, order?: string[]): string | null {
  const r = g.run; if (!r) return null;
  const on = g.players.filter((p) => p.online), leans = on.map((p) => r.leans[p.id]).filter(Boolean);
  if (!leans.length) return now ? null : null;
  if (!now && leans.length < on.length) return null;
  const count: Record<string, number> = {}; for (const l of leans) count[l] = (count[l] || 0) + 1;
  const top = Math.max(...Object.values(count)), tied = Object.keys(count).filter((k) => count[k] === top);
  const host = r.leans[g.hostId];
  if (host && tied.includes(host)) return host;
  return (order || r.nodes.map((n) => n.id)).find((id) => tied.includes(id)) || tied[0]; // rules 1.44: `order`, the tiles' (a tile is leaned like a node)
}
/** A run's seed when the host gives none: from the room's code and its action count, so it is the same on a replay and
 * different for each run a room starts. "PHC-" and six letters and digits. */
export function runSeed(code: string, seq: number): string {
  return 'PHC-' + (seedFrom(code + '#' + seq) >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6);
}
/** The words for a mode that can't be picked (its data's `coming`), or null when it can. */
export function modeLocked(id: string): string | null {
  const m = modeOf(id); if (!m) return 'No such mode: ' + id + '.';
  return m.available ? null : m.name + ' is not open yet.';
}

/** What a character in a run needs, said in words (rule 2): one a player, every one level 1. */
interface Seat { id: string; name: string; level: number; owner: string; dead?: boolean }
interface Who { id: string; name: string; online: boolean }
/** Why `run/start` can't start the run now, or null (rule 2, section 8.1 item 9). `by` is the player asking. */
export function runStartProblem(g: { hostId: string; phase: string; settings: { play?: PlayMode }; players: Who[]; characters: Record<string, Seat>; run?: RunState | null }, by: string): string | null {
  if (by !== g.hostId) return 'Only the host starts the run.';
  if (g.run && g.run.state !== 'over') return 'The run is under way.';
  if (g.phase !== 'lobby') return 'The room has already started.';
  const play = playOf(g); if (play !== 'survival') return 'This room plays ' + (modeOf(play)?.name || play) + '. Pick Survival to start a run.';
  const seats = Object.values(g.characters); if (!seats.length) return 'Lock in a character to start.';
  for (const p of g.players) {
    const mine = seats.filter((c) => c.owner === p.id);
    if (mine.length > 1) return 'In Survival each player brings one character. ' + p.name + ' has ' + mine.length + ': take one back.';
    if (!mine.length && p.online) return p.name + ' has no character locked in yet.';
  }
  const high = seats.find((c) => c.level !== 1); if (high) return 'Survival starts at level 1. ' + high.name + ' is level ' + high.level + ': bring a new character.';
  // rules 1.41: a character who fell in a lost run stays fallen (its run is its score): a new run takes a fresh one
  const fell = seats.find((c) => c.dead); if (fell) return fell.name + ' fell in the last run: take ' + fell.name + ' back and bring a fresh level 1 character.';
  return null;
}
/** Why `run/retire` can't end the run now, or null (rule 4: the host, after a Boss). */
export function runRetireProblem(g: { hostId: string; run?: RunState | null }, by: string): string | null {
  const r = g.run; if (!r) return 'No run is under way.';
  if (by !== g.hostId) return 'Only the host retires the run.';
  if (r.state === 'over') return 'The run is over.';
  if (r.state !== 'boon' && r.state !== 'tile') return 'You can retire only after beating a stage\'s Boss.';
  return null;
}
/** The run's end and its score (rule 4): stages cleared (a retire comes after a Boss, so the stage under way counts),
 * nodes walked, each character's level; rules 1.44: `more` adds the renown, the boons and the stages' log. */
export function endRun(r: RunState, how: RunEnd['how'], levels: Record<string, number>, more: Partial<Pick<RunEnd, 'renown' | 'boons' | 'stages'>> = {}): RunState {
  const cleared = how === 'retired' ? r.stage : r.stage - 1;
  return { ...r, state: 'over', leans: {}, ready: {}, offers: null, shop: null, visit: null, lasting: null, boons: null, tiles: null, end: { how, stage: r.stage, cleared, nodes: r.path.length, levels, ...more } };
}
