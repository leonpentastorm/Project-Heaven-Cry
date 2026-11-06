// The game: one state, one reducer. Every change is an action the engine checks against the rules (CLAUDE.md:
// "the engine owns numbers"). Players' clicks, the Narrator's tool calls and the host's buttons all come here.
import { ARCHETYPES, CLASS, PERK, SKILL, TN_LADDER, WEAPON, XP_SOURCES, ITEM } from './data';
import {
  type Character, type Sheet, applyLevels, canRaise, comboEligible, eligibleClasses, grantAutomaticPerks, maxHp, mod, newCharacter,
  packOf, magsOf, loadAll, equip, unequip, fitMod, type Rarity, passive, pendingPerkSteps, validateSheet,
} from './character';
import { type Combat, type MapDef, type AttackMode, useWeaponSkill, fieldRepair, pairedAttack, fireBurst, fireAuto, shove, toggleProne, brace, setOverwatch, MAPS, keyOf, refOf, standable, walkable, defaultObjects, spotTraps, dist, toggleDoor, active, analyze, pickUp, loadMagazine, shootCover, checkOver, clearJam, combatXp, endTurn, enemyTurn, moveUnit, previewAttack, reload, resolveAttack, startCombat, useStim, paths, apForTiles, unitFromCharacter, unitFromEnemy, lineOfSight, litAt } from './combat';
import { type Rng, d20, seedFrom } from './rng';
import { type Campaign, builtInCampaign, validateCampaign, zoneToMap } from './campaign';
import { type MusicState, musicOf, startSong, songEnded, pinSong, unpinSong, musicAfterFight, musicOnTravel, musicTraitOf, songMod, SONG_AP } from './music';
import { type Memory, type MemOp, memoryOf, applyMemOp, canon, noteScene, rollChapter, chapterDue, findPerson, SCENES_PER_CHAPTER } from './memory';
import { type MapObject, type Approach, OBJ, makeObject, kindOf, blocksMove, isTrap, mergeApproaches, triedThisScene } from './objects';

export interface Player { id: string; name: string; initials: string; color: string; online: boolean }
export interface Entry {
  id: string; kind: 'narration' | 'player' | 'voice' | 'check' | 'system' | 'xp' | 'overreach' | 'combat' | 'scene' | 'art';
  /** For kind art: the asset id of a story moment (spec: Campaigns, moments). */
  art?: string;
  text: string; head?: string; who?: string; skill?: string; charId?: string; to?: string; ok?: boolean; roll?: boolean;
  /** Out of character (names players, not characters): shown to players, never sent to the Narrator. */
  ooc?: boolean;
}
export interface Hook { id: string; skill: string; tn: number; truth: 'true' | 'partial' | 'misleading'; line: string }
export interface Check {
  id: string; charId: string; skills: string[]; tn: number; stakes: string; done: boolean;
  /** A try at an object's approach (spec: Points of interest): the result is recorded on the object. */
  poi?: { objId: string; idx: number };
  roll?: { die: number; mod: number; total: number; ok: boolean; crit: boolean; fumble: boolean; rerolled: boolean; first?: number };
}
export interface Overreach { id: string; charId: string; skill: string; push: string; choice?: 'indulge' | 'resist' }
export type NarratorWork = null | { kind: 'opening' | 'round' | 'results' | 'combat_end'; note?: string };

export interface GameState {
  v: number; seq: number; rng: Rng; code: string; hostId: string;
  settings: { mode: 'ai' | 'human'; tone: string; start: string; model: string };
  phase: 'lobby' | 'story' | 'combat';
  players: Player[]; characters: Record<string, Character>;
  story: {
    entries: Entry[]; round: number; spoken: Record<string, string>;
    await: 'none' | 'players' | 'narrator' | 'rolls' | 'choices';
    scene: { title: string; n: number; hooks: Hook[]; revealed: string[]; asked: Record<string, string[]>; fired: Record<string, string[]> };
    journal: string[]; work: NarratorWork;
    /** Where the story happens (a map id) and where each character stands on it, by tile key (spec: Grid references). */
    zone?: string; positions?: Record<string, string>;
    /** Objects on the story's map: cover, barricades, doors, traps, POIs (spec: Map objects). */
    objects?: MapObject[];
    /** Objects of zones the party has left, so a zone is as they left it when they return. */
    zoneObjects?: Record<string, MapObject[]>;
    /** Story moments already shown (each once). */
    moments?: string[];
    /** Overworld rounds (spec: Overworld rounds): AP left and turn ended per character, this round's paths, Sneak. */
    ap?: Record<string, number>; ended?: Record<string, boolean>; trail?: Record<string, string[]>;
    sneak?: Record<string, boolean>; hidden?: Record<string, boolean>;
    /** Something this round needs the Narrator (a line said, an examine, an approach, a travel request, a spotting). */
    needs?: boolean;
    /** Actions the Narrator mapped from players' words, waiting for the next round to open. */
    queued?: NonNullable<NarratorTurn['actions']>;
    /** Notice checks made this round, by "npc|char", so each pair rolls once a round. */
    noticed?: Record<string, number>;
    /** People and enemies on the overworld map (spec: Overworld rounds), and those of zones the party has left. */
    npcs?: Npc[]; zoneNpcs?: Record<string, Npc[]>;
    /** The party's shared spotlight: who is dealing with what (a point of interest), and what they're hovering. */
    focus?: { charId: string; objId?: string; hover?: number; seq: number } | null;
  };
  checks: Check[]; overreach: Overreach[]; combat: Combat | null;
  awards: { charId: string; perkId: string }[];
  narrator: { busy: boolean; error: string | null; usage: { input: number; output: number; cacheRead: number; costUsd: number; calls: number } };
  /** The campaign being played (spec: Campaigns): copied in at session start, or loaded from a file by the host. */
  campaign?: Campaign | null;
  /** What the room hears (spec: Music). */
  music?: MusicState;
  /** The Narrator's long-term memory (spec: The Narrator's memory). Host only: views never carry it. */
  memory?: Memory;
  /** Every story line that scrolled out of the live log, kept forever on the host's computer for recall. */
  archive?: Entry[];
}

export const PLAYER_COLOURS = ['#7FD4FF', '#FF9EC7', '#B8E986', '#FFB86B'];
const initialsOf = (n: string) => (n.trim().split(/\s+/).map((x) => x[0]).join('').slice(0, 2) || n.slice(0, 2)).toUpperCase();

export function newGame(code: string, host: { id: string; name: string }, seed?: string): GameState {
  return {
    v: 0, seq: 0, rng: { state: seedFrom(seed ?? code + host.id) }, code, hostId: host.id,
    settings: { mode: 'ai', tone: 'Grim', start: 'm813', model: 'claude-opus-5-5' }, phase: 'lobby',
    players: [{ id: host.id, name: host.name, initials: initialsOf(host.name), color: PLAYER_COLOURS[0], online: true }], characters: {},
    story: { entries: [], round: 0, spoken: {}, await: 'none', scene: { title: '', n: 0, hooks: [], revealed: [], asked: {}, fired: {} }, journal: [], work: null },
    checks: [], overreach: [], combat: null, awards: [],
    narrator: { busy: false, error: null, usage: { input: 0, output: 0, cacheRead: 0, costUsd: 0, calls: 0 } },
  };
}

// ---------- actions ----------
export type NarratorTurn = {
  narration: string; sceneTitle?: string;
  hooks?: { skill: string; tn: number; truth: string; line: string }[];
  checks?: { charId: string; skills: string[]; tn: number; stakes: string }[];
  overreach?: { charId: string; skill: string; push: string }[];
  xp?: { charId: string; source: string; amount: number; reason?: string }[];
  deeds?: { charId: string; perkId: string; deed: string }[];
  /** A story moment to show (an illustration), by id; only those open in this zone count. */
  moment?: string;
  /** Mechanical actions a player declared in words ("I move to A15 and shoot the guard"), run by the engine as that
   * player's own actions when the next round opens, from their fresh AP, with every normal rule (spec: Overworld rounds). */
  actions?: { charId: string; act: WorldAct; to?: string; how?: 'move' | 'sprint' | 'sneak'; targetId?: string; mode?: AttackMode; objId?: string }[];
  /** Place, move, update or remove people and enemies on the overworld map. */
  npcs?: { action: 'place' | 'move' | 'update' | 'remove'; id?: string; name?: string; side?: 'hostile' | 'neutral'; tier?: string; weapon?: string; at?: string }[];
  combat?: { name: string; map?: string; difficulty?: string; enemies: { name: string; tier: string; weapon: string; at?: string }[] } | null;
  /** The Narrator moves characters on the zone map, by grid reference ("C7"). */
  moves?: { charId: string; to: string }[];
  /** Move the whole party to another zone of the campaign (its id), or "". */
  travel?: string;
  /** Things found or given: a weapon or item id, how many, and for weapons a rarity and an optional name. */
  loot?: { charId: string; item: string; qty: number; rarity?: Rarity; name?: string }[];
  /** The Narrator places, updates or removes map objects and points of interest, and writes their approaches. */
  objects?: { action: 'place' | 'update' | 'remove'; id: string; kind: string; at: string; name: string; text: string; hidden?: boolean; locked?: boolean;
    approaches: { label: string; skills: string[]; tn: number; stakes: string; success: Approach['success'] }[] }[];
  endScene?: { summary: string } | null;
  /** Memory upkeep (spec: The Narrator's memory): people, threads, facts, factions and pins to add or update. */
  memory?: MemOp[];
  /** When asked: the oldest scenes rolled into a chapter, and the saga (the story so far) rewritten. */
  chapter?: { title: string; summary: string; saga: string } | null;
  /** Arm and leg injuries the story treated (a long rest with a Medic, surgery, a field hospital). */
  treat?: { charId: string; loc: 'arm' | 'leg' | 'all' }[];
};
export type Action =
  | { type: 'player/join'; id: string; name: string } | { type: 'player/online'; id: string; online: boolean } | { type: 'player/kick'; id: string }
  | { type: 'settings'; patch: Partial<GameState['settings']> }
  | { type: 'char/add'; sheet: Sheet } | { type: 'char/remove'; charId: string }
  | { type: 'session/start' }
  | { type: 'story/speak'; text: string; roll?: boolean } | { type: 'story/skip'; playerId: string }
  | { type: 'narrator/begin' } | { type: 'narrator/turn'; turn: NarratorTurn } | { type: 'narrator/error'; message: string }
  | { type: 'narrator/usage'; input: number; output: number; cacheRead: number; costUsd: number } | { type: 'narrator/retry' }
  | { type: 'check/roll'; checkId: string } | { type: 'check/reroll'; checkId: string } | { type: 'check/accept'; checkId: string }
  | { type: 'voice/ask'; charId: string; skill: string } | { type: 'overreach/choose'; id: string; choice: 'indulge' | 'resist' }
  | { type: 'levelup/raise'; charId: string; kind: 'skill' | 'attr' | 'core'; id: string } | { type: 'levelup/class'; charId: string; classId: string }
  | { type: 'levelup/perk'; charId: string; perkId: string }
  | { type: 'combat/move'; unitId: string; to: string; how?: 'move' | 'sprint' | 'disengage' } | { type: 'combat/attack'; unitId: string; targetId: string; mode: AttackMode }
  | { type: 'combat/shove'; unitId: string; targetId: string } | { type: 'combat/prone'; unitId: string } | { type: 'combat/brace'; unitId: string } | { type: 'combat/overwatch'; unitId: string; mode: 'shot' | 'aimed' | 'melee' }
  | { type: 'combat/skill'; unitId: string; targetId?: string } | { type: 'combat/repair'; unitId: string } | { type: 'combat/paired'; unitId: string; targetId: string; targetId2?: string }
  | { type: 'gear/equip'; charId: string; idx: number; to: 'main' | 'off' | 'worn' } | { type: 'gear/unequip'; charId: string; slot: string } | { type: 'gear/mod'; charId: string; idx: number }
  | { type: 'combat/reload'; unitId: string } | { type: 'combat/clear'; unitId: string } | { type: 'combat/stim'; unitId: string; targetId: string }
  | { type: 'combat/end-turn'; unitId: string } | { type: 'combat/analyze'; unitId: string; targetId: string }
  | { type: 'combat/pickup'; unitId: string; tile: string } | { type: 'combat/load'; unitId: string } | { type: 'combat/shoot-cover'; unitId: string; tile: string }
  | { type: 'gear/load'; charId: string } | { type: 'story/move'; charId: string; to: string } | { type: 'poi/examine'; charId: string; objId: string } | { type: 'poi/travel'; charId: string; objId: string } | { type: 'poi/try'; charId: string; objId: string; idx: number } | { type: 'story/door'; charId: string; objId: string } | { type: 'combat/say'; charId: string; text: string } | { type: 'combat/door'; unitId: string; tile: string } | { type: 'campaign/load'; campaign: Campaign }
  | { type: 'award/ack'; charId: string; perkId: string }
  | { type: 'world/act'; charId: string; act: WorldAct; to?: string; how?: 'move' | 'sprint' | 'sneak'; targetId?: string; mode?: AttackMode; objId?: string }
  | { type: 'story/pass' } | { type: 'story/focus'; charId: string; objId?: string; hover?: number } | { type: 'story/unfocus' }
  | { type: 'campaign/refresh' }
  | { type: 'music/end'; seq: number } | { type: 'music/play'; charId: string } | { type: 'music/pin'; charId: string } | { type: 'music/unpin'; charId: string } | { type: 'combat/song'; unitId: string };

/** A person or enemy on the overworld map. Neutral ones turn hostile when attacked. */
export interface Npc { id: string; name: string; side: 'hostile' | 'neutral'; tier: string; weapon: string; pos: string; portrait?: string; facing?: [number, number]; analyzed?: boolean }

export type WorldAct = 'move' | 'end' | 'reload' | 'load' | 'clear' | 'repair' | 'prone' | 'stim' | 'analyze' | 'attack' | 'door';
export class RuleError extends Error {}
const fail = (m: string): never => { throw new RuleError(m); };
const id = (g: GameState, p: string) => p + (++g.seq);
const push = (g: GameState, e: Omit<Entry, 'id'>) => { g.story.entries.push({ id: id(g, 'e'), ...e }); if (g.story.entries.length > 400) (g.archive ||= []).push(...g.story.entries.splice(0, g.story.entries.length - 400)); };
const charsOf = (g: GameState, pid: string) => Object.values(g.characters).filter((c) => c.owner === pid && !c.dead);
const isHost = (g: GameState, by: string) => by === g.hostId;
/** Players taking part in the round: everyone with a living character. */
export const speakers = (g: GameState) => g.players.filter((p) => charsOf(g, p.id).length > 0);

/** Apply one action by one player. Returns a new state, or throws RuleError with a plain sentence. */
export function apply(state: GameState, action: Action, by: string): GameState {
  const g: GameState = JSON.parse(JSON.stringify(state));
  reduce(g, action, by);
  g.v++;
  return g;
}

function reduce(g: GameState, a: Action, by: string) {
  switch (a.type) {
    case 'player/join': {
      if (!isHost(g, by)) fail('Only the host admits players.');
      const p = g.players.find((x) => x.id === a.id);
      if (p) { p.online = true; if (a.name) { p.name = a.name; p.initials = initialsOf(a.name); } return; }
      if (g.players.length >= 4) fail('The room is full (4 players).');
      const used = new Set(g.players.map((x) => x.color));
      g.players.push({ id: a.id, name: a.name || 'Player', initials: initialsOf(a.name || 'P'), color: PLAYER_COLOURS.find((c) => !used.has(c)) || '#A3AEC2', online: true });
      push(g, { kind: 'system', text: (a.name || 'A player') + ' joined the room.', ooc: true });
      return;
    }
    case 'player/online': { if (!isHost(g, by)) fail('Host only.'); const p = g.players.find((x) => x.id === a.id); if (p) p.online = a.online; return; }
    case 'player/kick': { if (!isHost(g, by) || a.id === g.hostId) fail('Host only.'); g.players = g.players.filter((p) => p.id !== a.id); for (const c of Object.values(g.characters)) if (c.owner === a.id) delete g.characters[c.id]; return; }
    case 'settings': { if (!isHost(g, by)) fail('Only the host changes room settings.'); if (g.phase !== 'lobby' && a.patch.start) fail('The campaign has started.'); Object.assign(g.settings, a.patch); return; }
    case 'char/add': {
      const err = validateSheet(a.sheet); if (err) fail(err);
      if (!g.players.some((p) => p.id === by)) fail('Join the room first.');
      if (charsOf(g, by).length >= 2) fail('Two characters per player at most.');
      const c = newCharacter(id(g, 'c'), by, a.sheet);
      if (musicTraitOf(c) && !packOf(c).some((x) => (x.item || x.id) === 'musek_blestor')) c.pack = [...packOf(c), { id: 'musek_blestor', item: 'musek_blestor', name: 'Musek Blestor', qty: 1, kind: 'tool' }];
      g.characters[c.id] = c;
      push(g, { kind: 'system', text: c.name + ' is locked in.' });
      if (g.phase !== 'lobby') c.echo = 1;
      return;
    }
    case 'char/remove': { const c = g.characters[a.charId]; if (!c) return; if (c.owner !== by && !isHost(g, by)) fail('Not your character.'); if (g.phase !== 'lobby') fail('Characters stay once the session starts.'); delete g.characters[a.charId]; return; }
    case 'session/start': {
      if (!isHost(g, by)) fail('Only the host starts the session.');
      if (g.phase !== 'lobby') fail('Already started.');
      if (!Object.keys(g.characters).length) fail('Lock in at least one character.');
      g.phase = 'story';
      for (const c of Object.values(g.characters)) { c.echo = 1; c.hp = maxHp(c); }
      g.story.round = 1; g.story.await = 'narrator'; g.story.work = { kind: 'opening' };
      if (!g.campaign || g.campaign.id !== g.settings.start) g.campaign = builtInCampaign(g.settings.start) || builtInCampaign('own');
      g.story.zone = g.campaign!.startZone; g.story.positions = {}; g.story.objects = defaultObjects(zoneMap(g)); positionsOf(g);
      for (const pin of g.campaign!.pins || []) applyMemOp(g, { op: 'pin', text: pin });
      push(g, { kind: 'system', text: 'Session 1 begins.' });
      return;
    }
    case 'story/speak': {
      if (g.phase !== 'story') fail('Not in story mode.');
      if (g.story.await !== 'players') fail('The Narrator is still answering.');
      const mine = charsOf(g, by); if (!mine.length) fail('You have no character in this story.');
      if (g.story.spoken[by] != null) fail('You already spoke this round.');
      if (g.checks.some((k) => !k.done && k.poi && g.characters[k.charId]?.owner === by)) fail('Roll your attempt first.');
      const text = a.text.trim().slice(0, 1200); if (!text) fail('Say something.');
      g.story.spoken[by] = text; g.story.needs = true;
      push(g, { kind: 'player', who: by, text, head: mine.map((c) => c.name).join(' & '), roll: !!a.roll });
      closeRoundIfDone(g);
      return;
    }
    case 'story/pass': {
      if (g.phase !== 'story' || g.story.await !== 'players') fail('Not your turn to speak.');
      if (!charsOf(g, by).length) fail('You have no character in this story.');
      if (g.story.spoken[by] != null) fail('You already spoke this round.');
      g.story.spoken[by] = ''; closeRoundIfDone(g); return;
    }
    case 'story/focus': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const f = g.story.focus; g.story.focus = { charId: c.id, objId: a.objId, hover: a.hover, seq: f && f.charId === c.id && f.objId === a.objId ? f.seq : g.seq + 1 };
      return;
    }
    case 'story/unfocus': { const f = g.story.focus; if (f && (g.characters[f.charId]?.owner === by || isHost(g, by))) g.story.focus = null; return; }
    case 'world/act': { worldAct(g, a, by); return; }
    case 'story/skip': {
      if (!isHost(g, by)) fail('Only the host can skip a player.');
      if (g.story.await !== 'players') return;
      g.story.spoken[a.playerId] = '';
      for (const c of charsOf(g, a.playerId)) (g.story.ended ||= {})[c.id] = true;
      const p = g.players.find((x) => x.id === a.playerId);
      push(g, { kind: 'system', text: (p?.name || 'A player') + ' is skipped this round.', ooc: true });
      closeRoundIfDone(g);
      return;
    }
    case 'narrator/begin': { if (!isHost(g, by)) fail('Host only.'); g.narrator.busy = true; g.narrator.error = null; return; }
    case 'narrator/error': { if (!isHost(g, by)) fail('Host only.'); g.narrator.busy = false; g.narrator.error = a.message; return; }
    case 'narrator/retry': { if (!isHost(g, by)) fail('Host only.'); g.narrator.error = null; if (!g.story.work) g.story.work = { kind: g.combat ? 'combat_end' : 'round' }; return; }
    case 'narrator/usage': {
      if (!isHost(g, by)) fail('Host only.');
      const u = g.narrator.usage; u.input += a.input; u.output += a.output; u.cacheRead += a.cacheRead; u.costUsd += a.costUsd; u.calls++;
      return;
    }
    case 'narrator/turn': { if (!isHost(g, by)) fail('Only the Narrator (the host\'s client) can do that.'); narratorTurn(g, a.turn); return; }
    case 'check/roll':
    case 'check/reroll':
    case 'check/accept': {
      const ck = g.checks.find((x) => x.id === a.checkId); if (!ck) fail('No such check.');
      const c = g.characters[ck!.charId]; if (c.owner !== by) fail('Only ' + c.name + '\'s player rolls this.');
      if (ck!.done) fail('That check is settled.');
      if (a.type === 'check/roll') { if (ck!.roll) fail('Already rolled.'); rollCheck(g, ck!, c, false); return; }
      if (!ck!.roll) fail('Roll first.');
      // Echo (spec: Echo): spend 1 to reroll a d20, at most 1 per roll. The reroll stands.
      if (a.type === 'check/reroll') { if (ck!.roll!.rerolled) fail('One Echo per roll.'); if (c.echo < 1) fail('No Echo left.'); c.echo--; rollCheck(g, ck!, c, true); }
      ck!.done = true;
      if (ck!.roll!.crit && ck!.roll!.ok && ck!.tn >= 16) startSong(g, c, 'a critical success on a ' + (ck!.tn >= 20 ? 'Heroic' : 'Hard') + ' check', 'spotlight', (t) => push(g, { kind: 'system', text: t }));
      if (ck!.poi) poiResult(g, ck!, by);
      afterPending(g);
      return;
    }
    case 'voice/ask': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase !== 'story') fail('Ask a skill out of combat.');
      const sk = SKILL[a.skill]; if (!sk) fail('Unknown skill.');
      if ((c!.skills[a.skill] || 0) < 1) fail('Only skills with a point have a voice.');
      const asked = (g.story.scene.asked[c!.id] ||= []); if (asked.includes(a.skill)) fail('Once per scene per skill.');
      asked.push(a.skill);
      const hook = g.story.scene.hooks.filter((h) => h.skill === a.skill && !g.story.scene.revealed.includes(c!.id + ':' + h.id)).sort((x, y) => x.tn - y.tn)[0];
      const m = mod(c!.skills[a.skill] || 0), die = d20(g.rng), total = die + m, ok = !!hook && total >= hook.tn;
      const head = sk.name.toUpperCase() + ' · YOU ASKED · d20 ' + die + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' = ' + total + (hook ? ' vs ' + hook.tn : '') + ' · ' + (ok ? '✓ SPEAKS' : '✕ NOTHING TO SAY');
      if (ok) g.story.scene.revealed.push(c!.id + ':' + hook!.id);
      push(g, { kind: 'voice', skill: a.skill, charId: c!.id, to: by, head, text: ok ? hook!.line : sk.name + ' has nothing to say about this.', ok });
      return;
    }
    case 'overreach/choose': {
      const o = g.overreach.find((x) => x.id === a.id); if (!o || o.choice) fail('Nothing to choose.');
      const c = g.characters[o!.charId]; if (c.owner !== by) fail('Not your character.');
      const cost = (c.skills[o!.skill] || 0) >= 10 ? 2 : 1;
      const choice = a.choice === 'resist' && c.echo >= cost ? 'resist' : 'indulge';
      if (choice === 'resist') c.echo -= cost; else c.echo = Math.min(3, c.echo + 1);
      o!.choice = choice;
      push(g, { kind: 'overreach', charId: c.id, skill: o!.skill, to: by, head: SKILL[o!.skill].name.toUpperCase() + ' · OVERREACH · ' + (choice === 'resist' ? 'RESISTED (−' + cost + ' ECHO)' : 'INDULGED (+1 ECHO)'), text: choice === 'resist' ? 'You hold it back. Nothing happens.' : 'You let it happen.' });
      push(g, { kind: 'system', text: c.name + (choice === 'resist' ? ' resists an urge.' : ' gives in to ' + SKILL[o!.skill].name + '.') });
      afterPending(g);
      return;
    }
    case 'levelup/raise': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const why = canRaise(c!, a.kind, a.id); if (why) fail(why);
      if (a.kind === 'skill') { c!.skills[a.id] = (c!.skills[a.id] || 0) + 1; c!.unspent.skill--; }
      if (a.kind === 'attr') { c!.attrs[a.id] = (c!.attrs[a.id] || 1) + 1; c!.unspent.attr--; if (a.id === 'endurance') c!.hp += 15; }
      if (a.kind === 'core') { (c!.cores as any)[a.id]++; c!.unspent.core--; }
      awardAutomatic(g, c!);
      return;
    }
    case 'levelup/class': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (c!.level < 3) fail('Classes come at level 3.'); if (c!.classId) fail('Class already earned.');
      if (!eligibleClasses(c!.skills).some((x) => x.id === a.classId)) fail('That class isn\'t one of your two closest.');
      c!.classId = a.classId;
      push(g, { kind: 'system', text: c!.name + ' earns a class: ' + CLASS[a.classId].name + '.' });
      return;
    }
    case 'levelup/perk': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const step = pendingPerkSteps(c!).flatMap((s) => s.choices).find((x) => x.id === a.perkId); if (!step) fail('No perk step for that perk.');
      const held = c!.perks.find((x) => x.id === a.perkId);
      if (held) held.tier = 'II'; else c!.perks.push({ id: a.perkId, tier: 'I' });
      push(g, { kind: 'system', text: c!.name + ' takes ' + PERK[a.perkId].name + ' (Tier ' + step!.tier + ').' });
      return;
    }
    case 'campaign/refresh': { if (!isHost(g, by)) fail('Host only.'); refreshCampaign(g); return; }
    case 'music/end': { if (!isHost(g, by)) fail('Host only.'); songEnded(g, a.seq); return; }
    case 'music/play': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (!musicTraitOf(c)) fail('Only a music trait plays its song on demand.');
      if (g.phase === 'combat') fail('In a fight, playing your song costs ' + SONG_AP + ' AP on your turn.');
      const m = musicOf(g), k = 'play' + g.story.scene.n;
      if (m.used['play:' + c.id] === k) fail('Once per scene outside a fight.');
      if (!startSong(g, c, 'on the Musek Blestor', 'manual', (t) => push(g, { kind: 'system', text: t }))) fail(m.now?.charId === c.id ? 'Your song is already playing.' : 'Another song is playing; wait for it to end.');
      m.used['play:' + c.id] = k; return;
    }
    case 'music/pin': case 'music/unpin': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const err = a.type === 'music/pin' ? pinSong(g, c) : unpinSong(g, c); if (err) fail(err);
      push(g, { kind: 'system', text: a.type === 'music/pin' ? '♪ ' + c.name + ' keeps the song playing.' : '♪ ' + c.name + '\'s song stops.' }); return;
    }
    case 'award/ack': { g.awards = g.awards.filter((x) => !(x.charId === a.charId && x.perkId === a.perkId)); return; }
    case 'campaign/load': {
      if (!isHost(g, by)) fail('Only the host loads a campaign.');
      if (g.phase !== 'lobby') fail('Load a campaign before the session starts.');
      const errs = validateCampaign(a.campaign); if (errs.length) fail('That campaign file has problems: ' + errs.slice(0, 4).join(' '));
      g.campaign = { ...JSON.parse(JSON.stringify(a.campaign)), custom: true };
      // A file may not pass itself off as a built-in (it would be refreshed over, and session start would swap it out).
      if (builtInCampaign(g.campaign!.id)) g.campaign!.id = g.campaign!.id + '-custom';
      g.settings.start = g.campaign!.id;
      if (g.campaign!.tone) g.settings.tone = g.campaign!.tone;
      return;
    }
    case 'story/move': { worldAct(g, { type: 'world/act', charId: a.charId, act: 'move', to: a.to, how: 'move' }, by); return; }
    case 'story/door': { worldAct(g, { type: 'world/act', charId: a.charId, act: 'door', objId: a.objId }, by); return; }
    case 'poi/examine': case 'poi/try': case 'poi/travel': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase !== 'story') fail('Deal with it after the fight.');
      if (g.story.await !== 'players') fail('Wait for the round to open.');
      if (g.story.ended?.[c!.id]) fail(c!.name + ' has ended the turn.');
      if (g.checks.some((k) => !k.done && k.poi && g.characters[k.charId]?.owner === by)) fail('Roll your attempt first.');
      const cost = a.type === 'poi/try' ? 2 : 1; if (apLeft(g, c!) < cost) fail('Needs ' + cost + ' AP (' + apLeft(g, c!) + ' left).');
      const o = storyObjects(g).find((x) => x.id === a.objId); if (!o || o.hidden) fail('Nothing like that here.');
      if (dist(positionsOf(g)[c!.id], o!.pos) > 1) fail('Walk up to it first (stand on it or next to it).');
      if (a.type === 'poi/travel') {
        if (!o!.to) fail('That doesn\'t lead anywhere.');
        const dest = campaignOf(g)?.zones.find((z) => z.id === o!.to)?.name || o!.to;
        const text = 'asks to travel to ' + dest + ' (the way out at ' + refOf(o!.pos) + ') [travel:' + o!.to + ']';
        spendAp(g, c!, 1); g.story.needs = true; push(g, { kind: 'player', who: by, text: c!.name + ' ' + text + '.', head: c!.name });
        closeRoundIfDone(g); return;
      }
      if (a.type === 'poi/examine') {
        const text = 'examines the ' + o!.name.toLowerCase() + ' at ' + refOf(o!.pos) + ' [' + o!.id + ']';
        spendAp(g, c!, 1); g.story.needs = true; push(g, { kind: 'player', who: by, text: c!.name + ' ' + text + '.', head: c!.name });
        closeRoundIfDone(g); return;
      }
      const ap = o!.approaches[a.idx]; if (!ap) fail('No such approach.');
      if (o!.resolved) fail('That\'s already dealt with.');
      if (triedThisScene(ap!, c!.id, g.story.scene.n)) fail(c!.name + ' already tried that this scene.');
      push(g, { kind: 'player', who: by, text: c!.name + ' tries: ' + ap!.label + ' (' + o!.name + ', ' + refOf(o!.pos) + ').', head: c!.name });
      spendAp(g, c!, 2);
      g.checks.push({ id: id(g, 'k'), charId: c!.id, skills: ap!.skills.filter((s) => SKILL[s]), tn: ap!.tn, stakes: ap!.stakes || ap!.label, done: false, poi: { objId: o!.id, idx: a.idx } });
      return;
    }
    case 'combat/say': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const cb = g.combat; if (!cb || g.phase !== 'combat' || cb.over) fail('No fight is on.');
      const text = String(a.text || '').trim().slice(0, 300); if (!text) fail('Say something.');
      (cb!.notes ||= []).push(c!.name + ' (round ' + cb!.round + '): "' + text + '"');
      cb!.log.push(c!.name + ': "' + text + '"');
      return;
    }
    case 'gear/equip': case 'gear/unequip': case 'gear/mod': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat') fail('Change gear after the fight.');
      const err = a.type === 'gear/equip' ? equip(c!, a.idx, a.to) : a.type === 'gear/unequip' ? unequip(c!, a.slot) : fitMod(c!, a.idx);
      if (err) fail(err); return;
    }
    case 'gear/load': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat') fail('In a fight, load magazines from the combat screen (1 AP per 5 rounds).');
      const n = loadAll(c!); if (!n) fail('Nothing to load: no part-empty magazines with matching loose rounds.');
      return;
    }
    default: combatAction(g, a, by);
  }
}

function closeRoundIfDone(g: GameState) {
  if (g.phase !== 'story' || g.story.await !== 'players') return;
  const done = (p: Player) => g.story.spoken[p.id] != null && charsOf(g, p.id).every((c) => g.story.ended?.[c.id] || apLeft(g, c) <= 0 || c.hp <= 0);
  if (!speakers(g).every(done) || g.checks.some((k) => !k.done && k.poi)) return;
  // Only call the Narrator when something needs judgement (spec: Overworld rounds); otherwise the next round just opens.
  if (g.story.needs) { g.story.await = 'narrator'; g.story.work = { kind: 'round' }; }
  else { newRound(g); push(g, { kind: 'system', text: 'Round ' + g.story.round + '.' }); }
}

function rollCheck(g: GameState, ck: Check, c: Character, reroll: boolean) {
  // Combined checks (spec): the lowest modifier among the skills, +2 for each other skill with at least 1 point.
  const mods = ck.skills.map((s) => mod(c.skills[s] || 0) + songMod(g, c, s)), low = Math.min(...mods), lowIx = mods.indexOf(low);
  const m = low + 2 * ck.skills.filter((s, i) => i !== lowIx && (c.skills[s] || 0) > 0).length;
  const die = d20(g.rng), total = die + m, crit = die === 20, fumble = die === 1, ok = crit || (!fumble && total >= ck.tn);
  const first = reroll ? ck.roll!.die : undefined;
  ck.roll = { die, mod: m, total, ok, crit, fumble, rerolled: reroll, first };
  const names = ck.skills.map((s) => SKILL[s].name).join(' + ');
  push(g, { kind: 'check', charId: c.id, ok, head: names.toUpperCase() + (reroll ? ' · ECHO REROLL' : '') + ' · d20 ' + die + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' = ' + total + ' vs ' + ck.tn + ' · ' + (crit ? '✓ CRITICAL' : fumble ? '✕ CRITICAL FAIL' : ok ? '✓ SUCCESS' : '✕ FAILURE'), text: c.name + ': ' + ck.stakes });
}

function afterPending(g: GameState) {
  const open = g.checks.some((x) => !x.done) || g.overreach.some((x) => !x.choice);
  if (open) return;
  if (g.story.await === 'rolls' || g.story.await === 'choices') { g.story.await = 'narrator'; g.story.work = { kind: 'results' }; }
}

function awardAutomatic(g: GameState, c: Character) {
  for (const pid of grantAutomaticPerks(c)) {
    const p = PERK[pid];
    if (p.tier === 'ultimate') { g.awards.push({ charId: c.id, perkId: pid }); startSong(g, c, 'an Ultimate', 'spotlight', (x) => push(g, { kind: 'system', text: x })); }
    else push(g, { kind: 'system', text: c.name + ' gains the Mastered perk ' + p.name + '.' });
  }
}

function giveXp(g: GameState, c: Character, source: string, amount: number, reason?: string) {
  if (amount <= 0) return;
  c.xp += amount; c.xpBySource[source] = (c.xpBySource[source] || 0) + amount;
  push(g, { kind: 'xp', charId: c.id, text: c.name + ' +' + amount + ' XP (' + source + (reason ? ': ' + reason : '') + ')' });
  const before = c.level, gained = applyLevels(c);
  if (gained) push(g, { kind: 'system', text: c.name + ' reaches level ' + c.level + (c.level >= 3 && before < 3 ? ' and can earn a class.' : '.') });
}

/** Apply the Narrator's validated turn. Anything that breaks a rule is dropped with a note (the adapter retries first). */
export function narratorTurn(g: GameState, t: NarratorTurn) {
  g.narrator.busy = false; g.narrator.error = null; g.story.work = null;
  if (t.sceneTitle && t.sceneTitle !== g.story.scene.title) {
    g.story.scene = { title: t.sceneTitle, n: g.story.scene.n + 1, hooks: [], revealed: [], asked: {}, fired: {} };
    push(g, { kind: 'scene', text: t.sceneTitle });
  }
  if (t.narration?.trim()) push(g, { kind: 'narration', text: t.narration.trim() });
  { const m = momentsOpen(g).find((x) => x.id === t.moment); if (m) { (g.story.moments ||= []).push(m.id); push(g, { kind: 'art', art: m.art, text: m.caption }); } }
  // Voice hooks: passive 10 + mod against each hook; each player sees at most 2, biggest margins first (spec: Voices).
  const hooks: Hook[] = (t.hooks || []).filter((h) => SKILL[h.skill] && TN_LADDER.includes(h.tn) && h.line).map((h) => ({ id: id(g, 'h'), skill: h.skill, tn: h.tn, truth: (['true', 'partial', 'misleading'].includes(h.truth) ? h.truth : 'true') as Hook['truth'], line: h.line }));
  g.story.scene.hooks.push(...hooks);
  for (const p of g.players) {
    const cands: { c: Character; h: Hook; margin: number }[] = [];
    for (const c of charsOf(g, p.id)) for (const h of hooks) {
      if ((c.skills[h.skill] || 0) < 1) continue;
      const margin = passive(c, h.skill) - h.tn;
      if (margin >= 0) cands.push({ c, h, margin });
    }
    cands.sort((x, y) => y.margin - x.margin).slice(0, 2).forEach(({ c, h }) => {
      g.story.scene.revealed.push(c.id + ':' + h.id);
      push(g, { kind: 'voice', skill: h.skill, charId: c.id, to: p.id, head: SKILL[h.skill].name.toUpperCase() + ' · PASSIVE ' + passive(c, h.skill) + ' vs ' + h.tn + ' · ONLY YOU', text: h.line, ok: true });
    });
  }
  // Checks the Narrator asks for: the engine rolls them when the player clicks.
  for (const ck of t.checks || []) {
    const c = g.characters[ck.charId], skills = (ck.skills || []).filter((s) => SKILL[s]).slice(0, 3);
    if (!c || c.dead || !skills.length || !TN_LADDER.includes(ck.tn)) continue;
    g.checks.push({ id: id(g, 'k'), charId: c.id, skills, tn: ck.tn, stakes: ck.stakes || 'The Narrator calls for a check.', done: false });
  }
  for (const o of t.overreach || []) {
    const c = g.characters[o.charId];
    if (!c || (c.skills[o.skill] || 0) < 5) continue; // Overreach needs Mastery 2
    const fired = (g.story.scene.fired[c.id] ||= []); if (fired.includes(o.skill)) continue;
    fired.push(o.skill);
    g.overreach.push({ id: id(g, 'o'), charId: c.id, skill: o.skill, push: o.push });
    push(g, { kind: 'overreach', charId: c.id, skill: o.skill, to: c.owner, head: SKILL[o.skill].name.toUpperCase() + ' PUSHES · OVERREACH · ONLY YOU SEE THIS', text: o.push });
  }
  for (const x of t.xp || []) {
    const range = XP_SOURCES[x.source]; if (!range) continue;
    const amt = Math.max(range[0], Math.min(range[1], Math.round(x.amount)));
    const targets = x.charId === 'all' ? Object.values(g.characters).filter((c) => !c.dead) : [g.characters[x.charId]].filter(Boolean);
    for (const c of targets) giveXp(g, c, x.source, amt, x.reason);
  }
  for (const d of t.deeds || []) {
    const c = g.characters[d.charId]; if (!c || comboEligible(c, d.perkId)) continue;
    c.perks.push({ id: d.perkId, tier: 'achieved' }); c.deeds.push(d.deed);
    push(g, { kind: 'system', text: c.name + ' earns the combo perk ' + PERK[d.perkId].name + ': ' + d.deed });
    canon(g, c.name + ' earned ' + PERK[d.perkId].name + ' by a deed: ' + d.deed, [c.name], 4);
    startSong(g, c, 'a legendary deed', 'spotlight', (x) => push(g, { kind: 'system', text: x }));
    awardAutomatic(g, c);
  }
  for (const x of t.treat || []) {
    const c = g.characters[x.charId]; if (c && !c.dead && c.hp <= 0 && x.loc === 'all') { c.hp = 1; push(g, { kind: 'system', text: c.name + ' is stabilised at 1 HP.' }); }
    if (!c || !c.injuries?.length) continue;
    const before = c.injuries.length;
    c.injuries = x.loc === 'all' ? [] : c.injuries.filter((i) => i.loc !== x.loc);
    if (c.injuries.length < before) push(g, { kind: 'system', text: c.name + '’s ' + (x.loc === 'all' ? 'injuries are' : x.loc + ' injury is') + ' treated.' });
  }
  for (const mv of t.moves || []) {
    const c = g.characters[mv.charId], map = zoneMap(g), k = keyOf(mv.to, map), pos = positionsOf(g);
    if (!c || c.dead || !k || !standable(map, k) || Object.entries(pos).some(([id, p]) => id !== c.id && p === k)) continue;
    pos[c.id] = k; push(g, { kind: 'system', text: c.name + ' moves to ' + refOf(k) + '.' });
  }
  if (t.travel && t.travel !== zoneMap(g).id && campaignOf(g)?.zones.some((z) => z.id === t.travel)) {
    const zo = (g.story.zoneObjects ||= {}); zo[zoneMap(g).id] = storyObjects(g);
    const zn = (g.story.zoneNpcs ||= {}); zn[zoneMap(g).id] = npcsOf(g);
    g.story.zone = t.travel; g.story.positions = {}; g.story.objects = zo[t.travel] || defaultObjects(zoneMap(g)); positionsOf(g);
    g.story.npcs = zn[t.travel] || initialNpcs(g); g.story.hidden = {}; g.story.sneak = {};
    push(g, { kind: 'system', text: 'The party travels to ' + zoneMap(g).name + '.' });
    canon(g, 'The party travelled to ' + zoneMap(g).name + ' (scene ' + g.story.scene.n + ').', [], 2);
    musicOnTravel(g);
  }
  for (const op of t.objects || []) applyObjectOp(g, op);
  for (const op of t.npcs || []) applyNpcOp(g, op);
  if ((t.npcs || []).length) noticeAll(g);
  for (const l of t.loot || []) {
    const c = g.characters[l.charId]; if (!c || c.dead) continue;
    const n = Math.max(1, Math.min(20, Math.round(l.qty || 1))), pack = packOf(c).map((x) => ({ ...x }));
    const rarity = (['standard', 'fine', 'masterwork', 'relic', 'celestial'].includes(l.rarity || '') ? l.rarity : 'standard') as Rarity;
    if (WEAPON[l.item]) { for (let i = 0; i < Math.min(n, 3); i++) pack.push({ id: l.item, name: (l.name || WEAPON[l.item].name).slice(0, 60), qty: 1, kind: 'weapon', weapon: l.item, rarity }); }
    else if (ITEM[l.item]) { const ex = pack.find((x) => (x.item || x.id) === l.item && !x.rarity); if (ex) ex.qty += n; else pack.push({ id: l.item, item: l.item, name: ITEM[l.item].name, qty: n, kind: (ITEM[l.item] as any).category === 'consumable' ? 'med' : 'tool' }); }
    else if (l.item === 'stim_injector') { c.stims += n; continue; }
    else continue;
    c.pack = pack; push(g, { kind: 'system', text: c.name + ' gets ' + (n > 1 ? n + ' × ' : '') + (l.name || WEAPON[l.item]?.name || ITEM[l.item]?.name) + (rarity !== 'standard' && WEAPON[l.item] ? ' (' + rarity + ')' : '') + '.' });
  }
  if (t.endScene?.summary) { g.story.journal.push(t.endScene.summary); noteScene(g, g.story.scene.title, t.endScene.summary); }
  for (const op of (t.memory || []).slice(0, 16)) applyMemOp(g, op);
  // Chapters (recursive summaries): when due, the Narrator writes one; if it keeps not doing so, the engine folds the
  // scene summaries in itself so memory never grows without bound.
  if (memoryOf(g).scenes.length >= SCENES_PER_CHAPTER && (t.chapter?.summary || memoryOf(g).scenes.length >= SCENES_PER_CHAPTER * 2)) rollChapter(g, t.chapter || undefined);
  g.story.queued = t.combat && t.combat.enemies?.length ? [] : (t.actions || []).filter((x) => x && g.characters[x.charId]).slice(0, 6);
  if (t.combat && t.combat.enemies?.length) {
    const want = t.combat.map ? mapFor(g, t.combat.map) : null, map = want || zoneMap(g), same = map.id === zoneMap(g).id, pos = positionsOf(g);
    const pcs = Object.values(g.characters).filter((c) => !c.dead).map((c) => ({ c, pos: same ? pos[c.id] : undefined }));
    let foes = t.combat.enemies.slice(0, 7).map((e) => ({ name: e.name || 'Hostile', tier: e.tier, weapon: WEAPON[e.weapon] ? e.weapon : 'service_pistol', at: e.at || '' }));
    // Hostile people already on this map join the fight where they stand (a listed enemy with the same name is them).
    if (same) { const host = npcsOf(g).filter((n) => n.side === 'hostile' || foes.some((f) => f.name.toLowerCase() === n.name.toLowerCase()));
      const used = new Set<number>();
      for (const n of host) { const i = foes.findIndex((f, j) => !used.has(j) && f.name.toLowerCase() === n.name.toLowerCase()); const f = { name: n.name, tier: n.tier, weapon: n.weapon, at: refOf(n.pos) }; if (i >= 0) { foes[i] = f; used.add(i); } else { used.add(foes.length); foes.push(f); } }
      g.story.npcs = npcsOf(g).filter((n) => !host.includes(n)); foes = foes.slice(0, 8); }
    g.combat = startCombat(t.combat.name || 'Fight', map, pcs, foes, t.combat.difficulty || 'standard', g.rng, same ? storyObjects(g) : undefined);
    g.phase = 'combat'; g.story.await = 'none'; musicOf(g).fight++; syncSong(g);
    { const seen: Record<string, number> = {}; for (const u of g.combat.units) if (u.side === 'foe') { const p = portraitFor(g, u.name, seen); if (p) u.img = p; } }
    push(g, { kind: 'combat', text: 'Combat: ' + g.combat.name });
    runEnemies(g);
    return;
  }
  if (g.checks.some((x) => !x.done)) { g.story.await = 'rolls'; return; }
  if (g.overreach.some((x) => !x.choice)) { g.story.await = 'choices'; return; }
  // Results consumed: the next round opens.
  g.checks = []; g.overreach = [];
  newRound(g);
}

// ---------- combat actions ----------
function combatAction(g: GameState, a: Action, by: string) {
  const cb = g.combat; if (!cb || g.phase !== 'combat') fail('No fight is on.');
  if (cb!.over) fail('The fight is over.');
  const u = active(cb!)!;
  if (!('unitId' in a) || a.unitId !== u.id) fail('It\'s ' + u.name + '\'s turn.');
  const c = u.charId ? g.characters[u.charId] : null;
  if (!c || c.owner !== by) fail('Not your unit.');
  let err: string | null = null;
  const before = cb!.units.map((x) => ({ id: x.id, dead: x.dead, downed: x.downed, hp: x.hp }));
  switch (a.type) {
    case 'combat/move': err = moveUnit(cb!, u, a.to, g.rng, a.how || 'move'); break;
    case 'combat/shove': { const t = cb!.units.find((x) => x.id === a.targetId); if (!anyTarget(t, u)) fail('Pick someone else.'); err = shove(cb!, g.rng, u, t!); break; }
    case 'combat/prone': err = toggleProne(cb!, u); break;
    case 'combat/brace': err = brace(cb!, u); break;
    case 'combat/skill': { const t = a.targetId ? cb!.units.find((x) => x.id === a.targetId) || null : null; err = useWeaponSkill(cb!, g.rng, u, t, c); break; }
    case 'combat/repair': err = fieldRepair(cb!, u); break;
    case 'combat/paired': { const t = cb!.units.find((x) => x.id === a.targetId), t2 = a.targetId2 ? cb!.units.find((x) => x.id === a.targetId2) || null : null; if (!anyTarget(t, u) || (t2 && !anyTarget(t2, u))) fail('Pick someone else.'); err = pairedAttack(cb!, g.rng, u, t!, t2, c); break; }
    case 'combat/overwatch': err = setOverwatch(cb!, u, a.mode); break;
    case 'combat/attack': {
      const t = cb!.units.find((x) => x.id === a.targetId); if (!anyTarget(t, u)) fail('Pick someone else.');
      if (a.mode === 'burst') { err = fireBurst(cb!, g.rng, u, t!, c); break; }
      if (a.mode === 'auto') { err = fireAuto(cb!, g.rng, u, t!, c); break; }
      const pv = previewAttack(cb!, u, t!, a.mode); if (!pv.ok) fail(pv.why!);
      resolveAttack(cb!, g.rng, u, t!, a.mode, c); break;
    }
    case 'combat/reload': err = reload(cb!, u); break;
    case 'combat/pickup': err = pickUp(cb!, u, a.tile); break;
    case 'combat/door': err = toggleDoor(cb!, u, a.tile); break;
    case 'combat/load': err = loadMagazine(cb!, u); break;
    case 'combat/shoot-cover': err = shootCover(cb!, u, a.tile, c); break;
    case 'combat/analyze': { const t = cb!.units.find((x) => x.id === a.targetId); if (!t) fail('Pick an enemy.'); err = analyze(cb!, u, t!); break; }
    case 'combat/clear': err = clearJam(cb!, u); break;
    case 'combat/stim': { const t = cb!.units.find((x) => x.id === a.targetId); if (!t || t.side !== 'pc') fail('Pick an ally.'); err = useStim(cb!, u, t!, c!, c!.classId === 'medic'); break; }
    case 'combat/end-turn': endTurn(cb!, g.rng); break;
    case 'combat/song': {
      if (!musicTraitOf(c)) fail('Only a music trait plays its song on demand.');
      if (u.ap < SONG_AP) fail('Needs ' + SONG_AP + ' AP.');
      if (!startSong(g, c!, 'on the Musek Blestor', 'manual', (t) => cb!.log.push(t))) fail(musicOf(g).now?.charId === c!.id ? 'Your song is already playing.' : 'Another song is playing; wait for it to end.');
      u.ap -= SONG_AP; break;
    }
    default: fail('Unknown action.');
  }
  if (err) fail(err);
  songTriggers(g, u, c!, before);
  checkOver(cb!);
  runEnemies(g);
}

/** Spotlight moments in a fight (spec: Music): an elite or boss taken down, an ally revived; for the music traits also any kill and any big heal. */
function songTriggers(g: GameState, u: Combat['units'][number], c: Character, before: { id: string; dead: boolean; downed: boolean; hp: number }[]) {
  const cb = g.combat!, log = (t: string) => cb.log.push(t), was = Object.fromEntries(before.map((b) => [b.id, b]));
  const killed = cb.units.filter((x) => x.side === 'foe' && x.dead && was[x.id] && !was[x.id].dead);
  const big = killed.find((x) => x.tier === 'elite' || x.tier === 'boss');
  const revived = cb.units.find((x) => x.side === 'pc' && was[x.id]?.downed && !x.downed && !x.dead);
  const healed = cb.units.find((x) => x.side === 'pc' && was[x.id] && !was[x.id].downed && x.hp - was[x.id].hp >= 30);
  if (big) startSong(g, c, 'took down ' + big.name, 'spotlight', log);
  else if (revived) startSong(g, c, 'brought ' + revived.name + ' back', 'spotlight', log);
  else if (killed.length) startSong(g, c, 'a kill', 'trait', log);
  else if (healed) startSong(g, c, 'a big heal', 'trait', log);
  if (revived && musicOf(g).now?.charId !== c.id) startSong(g, c, 'brought ' + revived.name + ' back', 'trait', log);
  syncSong(g);
}
/** Fighters carry their music trait's modifier to their weapon skill (spec: Music). */
function syncSong(g: GameState) {
  for (const x of g.combat?.units || []) if (x.charId && g.characters[x.charId]) { const ch = g.characters[x.charId]; x.song = songMod(g, ch, WEAPON[x.weapon]?.skill || ''); }
}

/** Anyone and anything is a target (spec: Anyone is a target): any unit but yourself, alive. */
const anyTarget = (t: Combat['units'][number] | undefined, u: Combat['units'][number]) => !!t && t.id !== u.id && !t.dead;

/** Enemies act on their own turns until a PC is up or the fight ends. */
function runEnemies(g: GameState) {
  const cb = g.combat!;
  for (let guard = 0; guard < 40 && !checkOver(cb); guard++) {
    const u = active(cb)!;
    if (u.side !== 'foe') break;
    enemyTurn(cb, g.rng);
    if (!checkOver(cb)) endTurn(cb, g.rng);
  }
  if (cb.over) finishCombat(g);
}

function finishCombat(g: GameState) {
  const cb = g.combat!;
  for (const u of cb.units) if (u.charId) unitToCharacter(g, u, !cb.noXp);
  const won = cb.over === 'win';
  { const fallen = cb.units.filter((u) => u.side === 'foe' && u.dead).map((u) => u.name), lost = cb.units.filter((u) => u.side === 'pc' && u.dead).map((u) => u.name);
    canon(g, (won ? 'The party won' : 'The party lost') + ' the fight "' + cb.name + '" in ' + cb.round + ' rounds' + (fallen.length ? '; killed: ' + fallen.join(', ') : '') + (lost.length ? '; fallen: ' + lost.join(', ') : '') + '.', [...new Set([...fallen, ...lost])], lost.length ? 5 : 3);
    for (const n of [...fallen, ...lost]) { const p = findPerson(memoryOf(g), n); if (p) applyMemOp(g, { op: 'person', id: p.id, status: 'dead' }); else if (!GENERIC.test(n)) applyMemOp(g, { op: 'person', name: n, status: 'dead' }); } }
  cb.summary = (won ? 'Won' : 'Lost') + ' "' + cb.name + '" in ' + cb.round + ' rounds. ' + cb.units.map((u) => u.name + (u.dead ? ' (dead)' : u.downed ? ' (down)' : ' ' + u.hp + '/' + u.maxHp + ' HP')).join(', ') + '.';
  push(g, { kind: 'combat', text: cb.summary });
  // No XP for a fight on people who weren't hostile (spec: Anyone is a target).
  if (won && !cb.noXp) for (const c of Object.values(g.characters)) if (!c.dead) giveXp(g, c, 'combat', combatXp(cb), cb.difficulty + ' fight');
  // Where everyone ends up becomes the story's positions.
  g.story.zone = cb.map.id; g.story.positions = {}; g.story.objects = JSON.parse(JSON.stringify(cb.objects || []));
  for (const u of cb.units) if (u.charId && !u.dead) g.story.positions[u.charId] = u.pos;
  // Enemies still standing go back on the map as hostile tokens where they ended.
  for (const u of cb.units) if (u.side === 'foe' && !u.dead && !u.downed) npcsOf(g).push({ id: u.npcId || 'n' + (++g.seq), name: u.name, side: 'hostile', tier: u.tier || 'minion', weapon: u.weapon, pos: u.pos, portrait: u.img || undefined });
  g.phase = 'story'; g.story.await = 'narrator'; g.story.work = { kind: 'combat_end', note: combatReport(cb) };
  musicAfterFight(g);
  g.combat = { ...cb };
}

/** The one Narrator call a fight costs gets this: the result, the moments that mattered, who's left where, and anything said mid-fight. */
export function combatReport(cb: Combat): string {
  const key = /CRITICAL|INJURY|Downed|down for good|dies|stabilises|breaks into rubble|stims|analyzes|picks up|Fan|Overcharge/;
  const moments = cb.log.filter((l) => key.test(l)).slice(-14);
  const where = cb.units.map((u) => u.name + (u.side === 'foe' ? ' (enemy)' : '') + ': ' + (u.dead ? 'dead' : (u.downed ? 'Downed, ' : '') + u.hp + '/' + u.maxHp + ' HP at ' + refOf(u.pos))
    + ((u.injuries || []).length ? ', injured ' + u.injuries!.map((i) => (i.side ? i.side + ' ' : '') + i.loc).join(' and ') : ''));
  return [cb.summary || '', 'Key moments:\n' + (moments.map((m) => '- ' + m).join('\n') || '- none'), 'At the end:\n' + where.map((w) => '- ' + w).join('\n'),
    ...(cb.notes?.length ? ['Said or attempted mid-fight (yours to judge):\n' + cb.notes.map((n) => '- ' + n).join('\n')] : [])].join('\n');
}

// ---------- objects on the story map (spec: Map objects; Points of interest) ----------
export function storyObjects(g: GameState): MapObject[] { return (g.story.objects ||= defaultObjects(zoneMap(g))); }
/** Arriving on a tile: hidden traps there spring; traps nearby may be spotted (passive Vigilant). */
function arrive(g: GameState, c: Character, k: string) {
  const objs = storyObjects(g), trap = objs.find((o) => o.pos === k && isTrap(o));
  if (trap) {
    const dmg = kindOf(trap).trap!.damage; c.hp = Math.max(1, c.hp - dmg);
    g.story.objects = objs.filter((o) => o !== trap);
    push(g, { kind: 'system', text: c.name + ' steps on a trap at ' + refOf(k) + ': ' + dmg + ' damage.' });
  }
  spotTraps(storyObjects(g), k, c.skills.vigilant || 0, c.name, (l) => push(g, { kind: 'system', text: l }));
}
function poiResult(g: GameState, ck: Check, by: string) {
  const c = g.characters[ck.charId], o = storyObjects(g).find((x) => x.id === ck.poi!.objId), ap = o?.approaches[ck.poi!.idx];
  g.story.needs = true; // the Narrator narrates the attempt
  if (o && ap) {
    ap.tries.push({ charId: c.id, name: c.name, ok: !!ck.roll?.ok, total: ck.roll?.total || 0, scene: g.story.scene.n });
    canon(g, c.name + (ck.roll?.ok ? ' succeeded at' : ' failed at') + ' "' + ap.label + '" on ' + o.name + ' (scene ' + g.story.scene.n + ').', [c.name, o.name], 2);
    if (ck.roll?.ok && ap.success) {
      if (ap.success === 'remove' || ap.success === 'disarm') {
        g.story.objects = storyObjects(g).filter((x) => x !== o);
        if (ap.success === 'remove' && (kindOf(o).cover || o.kind === 'barricade')) g.story.objects.push(makeObject('r_' + o.id, 'rubble', o.pos));
      } else if (ap.success === 'open') { o.open = true; o.locked = false; }
      else if (ap.success === 'reveal') o.hidden = false;
      o.resolved = ap.success !== 'reveal';
      push(g, { kind: 'system', text: o.name + ' at ' + refOf(o.pos) + ': ' + (ap.success === 'remove' ? 'cleared' : ap.success === 'disarm' ? 'disarmed' : ap.success === 'open' ? 'opened' : 'revealed') + '.' });
    }
  }
  closeRoundIfDone(g);
}
function applyObjectOp(g: GameState, op: NonNullable<NarratorTurn['objects']>[number]) {
  const map = zoneMap(g), objs = storyObjects(g);
  const approaches = (op.approaches || []).filter((a) => a && a.label && TN_LADDER.includes(a.tn)).slice(0, 5)
    .map((a) => ({ label: String(a.label).slice(0, 80), skills: (a.skills || []).filter((s) => SKILL[s]).slice(0, 3), tn: a.tn, stakes: String(a.stakes || '').slice(0, 200), success: (['remove', 'open', 'reveal', 'disarm'].includes(a.success) ? a.success : '') as Approach['success'] }))
    .filter((a) => a.skills.length);
  const existing = objs.find((o) => o.id === op.id) || (op.at ? objs.find((o) => o.pos === keyOf(op.at, map) && (!op.kind || o.kind === op.kind)) : undefined);
  if (op.action === 'remove') { if (existing) g.story.objects = objs.filter((o) => o !== existing); return; }
  if (op.action === 'update' && existing) {
    if (op.name) existing.name = op.name.slice(0, 60); if (op.text) existing.text = op.text.slice(0, 400);
    if (approaches.length) existing.approaches = mergeApproaches(existing.approaches, approaches);
    if (op.hidden === false) existing.hidden = false; if (op.locked != null && kindOf(existing).door) existing.locked = op.locked;
    return;
  }
  const k = keyOf(op.at, map); if (!k || !OBJ[op.kind] || map.solid.includes(k)) return;
  if (OBJ[op.kind].blocks_move && (objs.some((o) => o.pos === k && blocksMove(o)) || Object.values(positionsOf(g)).includes(k))) return;
  const o = makeObject('o' + (++g.seq), op.kind, k, { name: op.name?.slice(0, 60), text: op.text?.slice(0, 400), approaches: approaches.map((a) => ({ ...a, tries: [] })) });
  if (op.hidden != null && OBJ[op.kind].trap) o.hidden = op.hidden; if (op.locked && kindOf(o).door) o.locked = true;
  objs.push(o);
}

/** The story's map, and where everyone stands on it (filled in from the map's start tiles). */
/** The campaign in play (old saves without one fall back to the built-in campaign for their start). */
export const campaignOf = (g: GameState): Campaign | null => g.campaign || builtInCampaign(g.settings.start);
const mapCache = new WeakMap<object, Record<string, MapDef>>();
/** A zone of the campaign as a map, or a built-in map by id. */
export function mapFor(g: GameState, id: string): MapDef | null {
  const c = campaignOf(g), z = c?.zones.find((x) => x.id === id);
  if (z) { let cache = mapCache.get(c!); if (!cache) { cache = {}; if (g.campaign) mapCache.set(c!, cache); } return (cache[id] ||= zoneToMap(z, Object.fromEntries(c!.zones.map((x) => [x.id, x.name])))); }
  return MAPS[id] || null;
}
export const zoneMap = (g: GameState): MapDef => mapFor(g, g.story.zone || campaignOf(g)?.startZone || 'yard') || MAPS.yard;
export function positionsOf(g: GameState): Record<string, string> {
  const map = zoneMap(g), pos = (g.story.positions ||= {}), taken = new Set(Object.values(pos));
  for (const c of Object.values(g.characters)) if (!pos[c.id] && !c.dead) { const k = map.pcStart.find((t) => !taken.has(t)) || map.pcStart[0]; pos[c.id] = k; taken.add(k); }
  return pos;
}

// ---------- views ----------
/** What one player may see: no hooks, no one else's voices or Overreach. */
export function viewFor(g: GameState, playerId: string): GameState {
  const v: GameState = { ...g, story: { ...g.story, entries: g.story.entries.filter((e) => !e.to || e.to === playerId), scene: { ...g.story.scene, hooks: [] } } };
  v.overreach = g.overreach.filter((o) => g.characters[o.charId]?.owner === playerId);
  delete v.memory; delete v.archive;
  // Hidden objects (unspotted traps) stay hidden from every player, the host included.
  if (g.story.objects) v.story.objects = g.story.objects.filter((o) => !o.hidden);
  if (g.combat?.objects) v.combat = { ...g.combat, objects: g.combat.objects.filter((o) => !o.hidden) };
  return v;
}

export const archetypes = ARCHETYPES;

/** Story moments the Narrator may show now: not shown yet, and in their zone if they have one (spoilers stay gated). */
export function momentsOpen(g: GameState) {
  const shown = g.story.moments || [];
  return (g.campaign?.moments || []).filter((m) => !shown.includes(m.id) && (!m.zone || m.zone === g.story.zone));
}
/** A campaign portrait for an NPC or enemy by name: exact, then the longest name it contains; lists alternate. */
export function portraitFor(g: GameState, name: string, seen: Record<string, number> = {}): string | null {
  const P = g.campaign?.portraits || {}, n = name.toLowerCase().trim();
  const key = Object.keys(P).find((k) => k.toLowerCase() === n) || Object.keys(P).filter((k) => n.includes(k.toLowerCase())).sort((a, b) => b.length - a.length)[0];
  if (!key) return null;
  const v = P[key]; if (!Array.isArray(v)) return v;
  const i = seen[key] = (seen[key] ?? -1) + 1; return v[i % v.length];
}

/** Write a fighter back onto its character: HP, injuries, ammo, magazines, durability, parts (and kills after a fight). */
function unitToCharacter(g: GameState, u: Combat['units'][number], afterFight: boolean, keepDowned = false) {
  const c = g.characters[u.charId!]; if (!c) return;
    // After a fight the Downed get up at 1 HP; on the overworld (friendly fire) they stay Downed at 0 until stimmed or treated.
    c.hp = u.dead ? 0 : u.downed && keepDowned ? 0 : Math.max(u.downed ? 1 : u.hp, 1); c.dead = u.dead;
    c.injuries = (u.injuries || []).filter((i) => i.loc === 'arm' || i.loc === 'leg');
    // Ammo carried out of the fight (spec: Reloading).
    c.loaded = u.ammo;
    if (u.maxDur) c.weaponState = { ...(c.weaponState || {}), dur: u.dur };
    { const had = packOf(c).filter((x) => (x.item || x.id) === 'spare_parts').reduce((t, x) => t + x.qty, 0), used = had - (u.parts ?? had);
      if (used > 0) { let left = used; c.pack = packOf(c).map((x) => { if ((x.item || x.id) !== 'spare_parts' || !left) return x; const n = Math.min(left, x.qty); left -= n; return { ...x, qty: x.qty - n }; }).filter((x) => x.qty > 0 || x.mags); } }
    const pack = packOf(c).map((it) => ({ ...it }));
    const mi = pack.findIndex((it) => it.weapon === c.weapon && it.mags);
    if (mi >= 0 && u.mags) { pack[mi].mags = [...u.mags]; pack[mi].qty = u.mags.length; }
    const w = WEAPON[c.weapon];
    if (u.loose != null) { let left = u.loose; for (const it of pack) if (it.calibre && it.calibre === w?.ammo) { it.qty = Math.min(it.qty, left); left -= it.qty; } }
    for (const x of u.extra || []) { let it = pack.find((p) => p.weapon === x.weapon && p.mags); if (!it) { it = { ...magsOf(x.weapon, 0), mags: [] }; pack.push(it); } it.mags!.push(x.rounds); it.qty = it.mags!.length; }
    c.pack = pack.filter((it) => it.qty > 0 || it.mags);
    const fam = WEAPON[u.weapon]?.mastery_family; if (afterFight && fam && u.kills) c.weaponKills[fam] = (c.weaponKills[fam] || 0) + u.kills;
}

// ---------- overworld rounds (spec: Overworld rounds) ----------
/** How hard an enemy is to slip past: its notice bonus (Vigilant) and the TN of the Ingenuity check to stay hidden. */
export const NOTICE: Record<string, number> = { minion: 0, soldier: 2, elite: 4, boss: 6 };
export const ROUND_AP = 6;
export const apLeft = (g: GameState, c: Character) => g.story.ap?.[c.id] ?? ROUND_AP;
function spendAp(g: GameState, c: Character, n: number) { (g.story.ap ||= {})[c.id] = Math.max(0, apLeft(g, c) - n); }
/** A new overworld round: full AP, a fresh Say, no trails. */
export function newRound(g: GameState) {
  g.story.round++; g.story.spoken = {}; g.story.await = 'players';
  g.story.ap = {}; g.story.ended = {}; g.story.trail = {}; g.story.needs = false; g.story.noticed = {}; g.story.focus = null;
  // What the Narrator mapped from players' words runs now, as those players' own actions, from their fresh AP.
  const q = g.story.queued || []; g.story.queued = [];
  for (const x of q) {
    if (g.phase !== 'story' || g.story.await !== 'players') break;
    const c = g.characters[x.charId]; if (!c || c.dead) continue;
    try { worldAct(g, { type: 'world/act', ...x }, c.owner); }
    catch (e) { if (!(e instanceof RuleError)) throw e; push(g, { kind: 'system', text: c.name + ' can\'t ' + (x.act === 'move' ? 'move there' : x.act === 'attack' ? 'make that attack' : x.act) + ': ' + e.message }); }
  }
}
const FACE: Record<string, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
/** The zone's people and enemies as it starts (from the campaign). */
export function initialNpcs(g: GameState): Npc[] {
  const z = campaignOf(g)?.zones.find((x) => x.id === zoneMap(g).id), map = zoneMap(g);
  const seen: Record<string, number> = {};
  return (z?.npcs || []).map((n, i) => ({ id: 'n' + (i + 1) + '-' + map.id, name: n.name, side: n.side, tier: n.tier, weapon: n.weapon, pos: keyOf(n.at, map) || map.foeStart[0], portrait: n.portrait || portraitFor(g, n.name, seen) || undefined, facing: n.facing ? FACE[n.facing] : undefined }));
}
export function npcsOf(g: GameState): Npc[] { return (g.story.npcs ||= initialNpcs(g)); }
function facingToward(from: string, to: string): [number, number] { const [a, b] = from.split(',').map(Number), [c, d] = to.split(',').map(Number); return [Math.sign(c - a), Math.sign(d - b)]; }
function partyCentre(g: GameState): string { const ps = Object.values(positionsOf(g)); if (!ps.length) return '0,0'; const xs = ps.map((k) => +k.split(',')[0]), ys = ps.map((k) => +k.split(',')[1]); return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) + ',' + Math.round(ys.reduce((a, b) => a + b, 0) / ys.length); }
function applyNpcOp(g: GameState, op: NonNullable<NarratorTurn['npcs']>[number]) {
  const list = npcsOf(g), map = zoneMap(g);
  const free = (k: string) => standable(map, k) && !storyObjects(g).some((o) => o.pos === k && blocksMove(o)) && !Object.values(positionsOf(g)).includes(k) && !list.some((n) => n.pos === k);
  if (op.action === 'place') {
    const k = op.at ? keyOf(op.at, map) : null; if (!k || !free(k) || !op.name) return;
    const tier = ENEMY_TIERS.includes(op.tier || '') ? op.tier! : 'minion', weapon = WEAPON[op.weapon || ''] ? op.weapon! : 'service_pistol';
    list.push({ id: 'n' + (++g.seq), name: op.name.slice(0, 40), side: op.side === 'hostile' ? 'hostile' : 'neutral', tier, weapon, pos: k, portrait: portraitFor(g, op.name) || undefined, facing: facingToward(k, partyCentre(g)) });
    push(g, { kind: 'system', text: op.name + ' at ' + refOf(k) + '.' });
    if (!GENERIC.test(op.name)) applyMemOp(g, { op: 'person', name: op.name, where: zoneMap(g).id, ...(op.side === 'hostile' ? { attitude: -2 } : {}) });
    return;
  }
  const n = list.find((x) => x.id === op.id); if (!n) return;
  if (op.action === 'remove') { g.story.npcs = list.filter((x) => x !== n); return; }
  if (op.action === 'update') { if (op.side) n.side = op.side === 'hostile' ? 'hostile' : 'neutral'; if (op.name) n.name = op.name.slice(0, 40); return; }
  if (op.action === 'move') { const k = op.at ? keyOf(op.at, map) : null; if (!k || !free(k)) return; n.facing = facingToward(n.pos, k); n.pos = k; }
}
const ENEMY_TIERS = ['minion', 'soldier', 'elite', 'boss'];
/** Names too generic to be a person in memory. */
const GENERIC = /^(scavenger drone|drone|engineer|security guard|guard|guard captain|hostile|soldier|trooper|enemy rearguard trooper)$/i;

/** The overworld as a throwaway fight state, so every combat rule (paths, sight, actions) runs unchanged. Units carry
 * each character's AP left this round; NPCs are 'foe' units (they block and can be targeted). Objects are the live list. */
function storyCb(g: GameState): Combat {
  const map = zoneMap(g), scratch = { state: g.rng.state }, pos = positionsOf(g);
  const units = Object.values(g.characters).filter((c) => !c.dead && pos[c.id]).map((c) => { const u = unitFromCharacter(c, pos[c.id], scratch); u.ap = apLeft(g, c); return u; });
  for (const n of npcsOf(g)) { const u = unitFromEnemy(n.id, n.name, n.tier, n.weapon, n.pos, scratch); if (n.portrait) u.img = n.portrait; units.push(u); }
  return { name: 'overworld', map, units, order: units.map((u) => u.id), turn: 0, round: g.story.round, difficulty: 'standard', log: [], over: null, objects: storyObjects(g) } as Combat;
}

/** Sneaking characters: each hostile with sight of them inside its notice range (4 + its notice − your Dexterity,
 * halved in the dark), or standing next to them, makes them roll Ingenuity to stay hidden, once per pair per round. */
function noticeFor(g: GameState, c: Character, cb?: Combat) {
  if (!g.story.sneak?.[c.id] || !g.story.hidden?.[c.id]) return;
  const at = positionsOf(g)[c.id]; cb ||= storyCb(g);
  for (const n of npcsOf(g)) {
    if (n.side !== 'hostile') continue;
    const d = dist(n.pos, at), dark = !!cb.map.dark && !litAt(cb, at);
    let range = Math.max(1, 4 + (NOTICE[n.tier] ?? 0) - mod(c.skills.dexterity || 0)); if (dark) range = Math.max(1, Math.floor(range / 2));
    const sees = d <= 1 || (d <= range && lineOfSight(cb, n.pos, at));
    if (!sees) continue;
    const key = n.id + '|' + c.id; if ((g.story.noticed ||= {})[key] === g.story.round) continue;
    g.story.noticed[key] = g.story.round;
    if (!stayHidden(g, c, n, d <= 1 ? 'steps right up to' : 'looks toward')) return;
  }
}
/** The Ingenuity check to stay hidden (spec: Overworld rounds): d20 + Ingenuity vs 10 + the enemy's notice. */
function stayHidden(g: GameState, c: Character, n: Npc, why: string): boolean {
  const die = d20(g.rng), m = mod(c.skills.ingenuity || 0) + songMod(g, c, 'ingenuity'), tn = 10 + (NOTICE[n.tier] ?? 0), ok = die === 20 || (die !== 1 && die + m >= tn);
  push(g, { kind: 'check', charId: c.id, ok, head: 'INGENUITY · STAY HIDDEN · d20 ' + die + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' = ' + (die + m) + ' vs ' + tn + ' · ' + (ok ? '✓ SUCCESS' : '✗ FAILURE'),
    text: n.name + ' ' + why + ' ' + c.name + (ok ? '; ' + c.name + ' stays hidden.' : ' and spots them.') });
  if (!ok) { g.story.hidden![c.id] = false; g.story.needs = true; }
  return ok;
}
function noticeAll(g: GameState) { const cb = storyCb(g); for (const c of Object.values(g.characters)) if (!c.dead) noticeFor(g, c, cb); }

/** One overworld action: the same actions and AP costs as a fight, on the story's map (spec: Overworld rounds). */
function worldAct(g: GameState, a: Extract<Action, { type: 'world/act' }>, by: string) {
  const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
  if (g.phase !== 'story') fail(g.phase === 'combat' ? 'A fight is on: act on the combat grid.' : 'The session hasn\'t started.');
  if (c!.dead) fail('The dead stay where they fell.');
  if (g.story.await !== 'players') fail('Wait for the round to open.');
  if (g.story.ended?.[c!.id] && a.act !== 'end') fail(c!.name + ' has ended the turn.');
  if (c!.hp <= 0 && a.act !== 'end') fail(c!.name + ' is Downed: an ally\'s stim, or the Narrator, gets them up.');
  if (a.act === 'end') { (g.story.ended ||= {})[c!.id] = true; if (g.story.spoken[by] == null && charsOf(g, by).every((x) => g.story.ended![x.id])) g.story.spoken[by] = ''; closeRoundIfDone(g); return; }
  const cb = storyCb(g), u = cb.units.find((x) => x.charId === c!.id)!;
  // Targets by id, or by name (the Narrator may name someone it placed this same turn).
  const tid = String(a.targetId || ''), tname = tid.toLowerCase();
  const target = tid ? cb.units.find((x) => x.id === tid || x.id === 'pc-' + tid) || cb.units.find((x) => x.name.toLowerCase() === tname && x.id !== u.id) || null : null;
  const before = u.ap; let err: string | null = null;
  if (a.act === 'move') {
    const map = zoneMap(g), k = a.to ? (/,/.test(a.to) ? a.to : keyOf(a.to, map)) : null;
    if (!k || !standable(map, k)) fail('Nobody can stand there.');
    const P = paths(cb, u.pos, u.id), tiles = P.dist[k!];
    if (tiles === undefined) fail('There\'s no way through to there: a wall, a closed door or someone is in the way.');
    const extra = a.how === 'sneak' ? tiles : 0; if (apForTiles(tiles, 0, u.movement) + extra > u.ap && a.how !== 'sprint') fail('Needs ' + (apForTiles(tiles, 0, u.movement) + extra) + ' AP (' + u.ap + ' left).');
    const from = u.pos; err = moveUnit(cb, u, k!, undefined, a.how === 'sprint' ? 'sprint' : 'move'); if (err) fail(err);
    u.ap -= extra;
    const route: string[] = []; for (let x = k!; x && x !== from; x = P.prev[x]) route.unshift(x);
    ((g.story.trail ||= {})[c!.id] ||= []).push(...(route.length ? [from, ...route] : [from, k!]));
    positionsOf(g)[c!.id] = u.pos;
    // Sneak: starting to sneak hides you; once spotted you stay seen until you move normally and start sneaking again.
    if (a.how === 'sneak') { const was = !!g.story.sneak?.[c!.id]; (g.story.sneak ||= {})[c!.id] = true; if (!was) (g.story.hidden ||= {})[c!.id] = true; }
    else { (g.story.sneak ||= {})[c!.id] = false; (g.story.hidden ||= {})[c!.id] = false; }
  } else if (a.act === 'door') {
    const o = storyObjects(g).find((x) => x.id === a.objId && kindOf(x).door); if (!o) fail('No such door.');
    if (dist(u.pos, o!.pos) > 1) fail('Walk up to it first.'); if (o!.locked) fail('Locked. Examine it for a way in.');
    if (u.ap < 1) fail('Needs 1 AP.'); u.ap -= 1; o!.open = !o!.open; cb.log.push(c!.name + (o!.open ? ' opens ' : ' closes ') + 'the ' + o!.name.toLowerCase() + ' at ' + refOf(o!.pos) + '.');
  } else if (a.act === 'reload') err = reload(cb, u);
  else if (a.act === 'load') err = loadMagazine(cb, u);
  else if (a.act === 'clear') err = clearJam(cb, u);
  else if (a.act === 'repair') err = fieldRepair(cb, u);
  else if (a.act === 'prone') err = toggleProne(cb, u);
  else if (a.act === 'stim') { if (!target || target.side !== 'pc') fail('Pick an ally.'); err = useStim(cb, u, target!, c!, c!.classId === 'medic'); }
  else if (a.act === 'analyze') { if (!target || target.side !== 'foe') fail('Pick someone to read.'); err = analyze(cb, u, target!); if (!err) { const n = npcsOf(g).find((x) => x.id === target!.id); if (n) n.analyzed = true; } }
  else if (a.act === 'attack') {
    // Anyone and anything is a target (spec: Anyone is a target).
    let t = target;
    const o = !t ? storyObjects(g).find((x) => !x.hidden && (x.id === (a.objId || tid) || (!!tname && x.name.toLowerCase() === tname))) || null : null;
    if (!t && o && (o.portrait || portraitFor(g, o.name))) t = poiToNpc(g, cb, o);
    if (!t && o) {
      if (o.hp == null || o.hp <= 0) { if (u.ap < 2) fail('Needs 2 AP.'); u.ap -= 2; cb.log.push(c!.name + ' attacks the ' + o.name.toLowerCase() + ' at ' + refOf(o.pos) + '.'); g.story.needs = true; }
      else err = shootCover(cb, u, o.pos, c!);
    } else {
      if (!t || t.id === u.id || t.dead) fail('Pick someone else to attack.');
      if (t!.side === 'pc') err = allyShot(g, cb, c!, u, t!, a.mode || 'shot');
      else { overworldAttack(g, cb, c!, u, t!, a.mode || 'shot'); return; }
    }
  }
  else fail('Unknown action.');
  if (err) fail(err);
  // Write back: AP, the character's state, objects (doors, traps), and the log as story lines.
  spendAp(g, c!, before - u.ap);
  for (const x of cb.units) if (x.charId) unitToCharacter(g, x, false, true);
  g.story.objects = cb.objects;
  for (const l of cb.log) push(g, { kind: 'system', text: l });
  noticeFor(g, c!);
  closeRoundIfDone(g);
}

/** Attacking from the overworld starts the fight on this map, everyone where they stand (spec: Overworld rounds).
 * Hidden (sneaking, unseen): an ambush; from the target's front the attacker must pass Ingenuity first. The fight opens
 * on the attacker's turn with the AP they have left. Seen: the attack still lands, but the attacker sits out round 1. */
function overworldAttack(g: GameState, cb: Combat, c: Character, u: Combat['units'][number], t: Combat['units'][number], mode: AttackMode) {
  const pv = previewAttack(cb, u, t, mode); if (!pv.ok) fail(pv.why!);
  const npc = npcsOf(g).find((n) => n.id === t.id)!;
  let hidden = !!(g.story.sneak?.[c.id] && g.story.hidden?.[c.id]);
  if (hidden) {
    const f = npc.facing || facingToward(npc.pos, u.pos), [nx, ny] = npc.pos.split(',').map(Number), [ux, uy] = u.pos.split(',').map(Number);
    if ((ux - nx) * f[0] + (uy - ny) * f[1] >= 0) hidden = stayHidden(g, c, npc, 'is facing');
  }
  // Who fights: the target (first, so it is never left out) and every hostile on this map; the rest stay where they are.
  // No XP when nobody here was hostile before the shot (spec: Anyone is a target).
  const wasHostile = npcsOf(g).some((n) => n.side === 'hostile');
  if (npc.side !== 'hostile') { push(g, { kind: 'system', text: c.name + ' attacks ' + npc.name + ', who was not hostile.' }); if (!GENERIC.test(npc.name)) applyMemOp(g, { op: 'person', name: npc.name, attitude: -3, update: c.name + ' attacked them unprovoked.' }); }
  npc.side = 'hostile';
  const foes = [npc, ...npcsOf(g).filter((n) => n.side === 'hostile' && n !== npc)], stay = npcsOf(g).filter((n) => n.side !== 'hostile');
  const pos = positionsOf(g), apNow = apLeft(g, c);
  const pcs = Object.values(g.characters).filter((x) => !x.dead).map((x) => ({ c: x, pos: pos[x.id] }));
  const tier = foes.some((n) => n.tier === 'boss') ? 'boss' : foes.some((n) => n.tier === 'elite') ? 'hard' : foes.length > 2 ? 'standard' : 'easy';
  const fightName = (hidden ? 'Ambush at ' : 'Fight at ') + refOf(npc.pos);
  g.combat = startCombat(fightName, zoneMap(g), pcs, foes.map((n) => ({ name: n.name, tier: n.tier, weapon: n.weapon, at: refOf(n.pos) })), tier, g.rng, storyObjects(g));
  const cbx = g.combat; g.story.npcs = stay;
  cbx.units.filter((x) => x.side === 'foe').forEach((x, i) => { const n = foes[i]; if (!n) return; x.npcId = n.id; x.img = n.portrait || x.img; if (n.analyzed) x.analyzedBy = u.id; });
  if (!wasHostile) cbx.noXp = true;
  const att = cbx.units.find((x) => x.charId === c.id)!, tgt = cbx.units.find((x) => x.npcId === npc.id)!;
  g.phase = 'combat'; g.story.await = 'none'; musicOf(g).fight++; syncSong(g);
  push(g, { kind: 'combat', text: 'Combat: ' + fightName + (hidden ? ' (' + c.name + ' strikes unseen)' : '') });
  if (hidden) { cbx.order = [att.id, ...cbx.order.filter((id) => id !== att.id)]; cbx.turn = 0; cbx.log.push(c.name + ' strikes from hiding: the fight opens on their turn.'); }
  else { att.waitRound = 2; cbx.log.push(c.name + ' attacks in the open and acts from round 2.'); }
  att.ap = apNow; resolveAttack(cbx, g.rng, att, tgt, mode, c);
  if (!hidden) { const cur = active(cbx); if (cur && cur.id === att.id) endTurn(cbx, g.rng); }
  checkOver(cbx); runEnemies(g);
}

/** A point of interest who is a person (a portrait) becomes a token when attacked: neutral, a minion with fists unless
 * the campaign says more (spec: Anyone is a target; provisional). The point of interest stays where it is. */
function poiToNpc(g: GameState, cb: Combat, o: MapObject): Combat['units'][number] {
  const n: Npc = { id: 'n' + (++g.seq), name: o.name, side: 'neutral', tier: 'minion', weapon: 'fists', pos: o.pos, portrait: o.portrait || portraitFor(g, o.name) || undefined, facing: facingToward(o.pos, partyCentre(g)) };
  npcsOf(g).push(n);
  const unit = unitFromEnemy(n.id, n.name, n.tier, n.weapon, n.pos, { state: g.rng.state }); if (n.portrait) unit.img = n.portrait;
  cb.units.push(unit);
  return unit;
}
/** Friendly fire on the overworld (spec: Anyone is a target): the shot resolves on the map, no fight starts; a Downed
 * ally stays down until stimmed or treated, and the Narrator rules on what follows. */
function allyShot(g: GameState, cb: Combat, c: Character, u: Combat['units'][number], t: Combat['units'][number], mode: AttackMode): string | null {
  const pv = previewAttack(cb, u, t, mode); if (!pv.ok) return pv.why!;
  resolveAttack(cb, g.rng, u, t, mode, c);
  g.story.needs = true;
  canon(g, c.name + ' attacked ' + t.name + ' (an ally), scene ' + g.story.scene.n + '.', [c.name, t.name], 4);
  return null;
}

/**
 * A resumed save keeps the campaign as it was copied in at session start. When a built-in campaign gains content later
 * (art, music, people on the map, moments, pins), this brings it in without touching what play has changed: object
 * state (approach tries, HP, open, locked, hidden), positions, people already met, moments shown, memory. Zones whose
 * layout changed keep their old definition and only take the art and music. Custom campaigns are never touched.
 */
export function refreshCampaign(g: GameState): boolean {
  const old = g.campaign;
  if (g.phase === 'lobby' || !old || old.custom) return false;
  const fresh = builtInCampaign(old.id); if (!fresh || fresh.title !== old.title) return false;
  const geom = (z: any) => JSON.stringify([z.w, z.h, z.solid, z.difficult, z.start, z.enemyStart, (z.objects || []).map((o: any) => [o.kind, o.at]), (z.exits || []).map((e: any) => [e.to, e.at])]);
  const hadNpcs = new Set(old.zones.filter((z) => z.npcs).map((z) => z.id));
  const zones = fresh.zones.map((fz) => { const oz = old.zones.find((z) => z.id === fz.id); return !oz || geom(oz) === geom(fz) ? fz : { ...oz, art: fz.art, music: fz.music, npcs: oz.npcs ?? fz.npcs }; });
  for (const oz of old.zones) if (!zones.some((z) => z.id === oz.id)) zones.push(oz);
  g.campaign = { ...fresh, zones };
  // Art onto objects already on the maps: matched to their definition by kind and tile; only missing fields are filled.
  const fill = (list: MapObject[] | undefined, zid: string | undefined) => {
    const z = zones.find((x) => x.id === zid); if (!z || !list) return;
    for (const o of list) {
      const d = (z.objects || []).find((x) => x.kind === o.kind && keyOf(x.at, { w: z.w, h: z.h } as MapDef) === o.pos); if (!d) continue;
      if (!o.sprite && d.sprite) o.sprite = d.sprite; if (!o.spriteBox && d.spriteBox) o.spriteBox = d.spriteBox; if (!o.portrait && d.portrait) o.portrait = d.portrait;
    }
  };
  fill(g.story.objects, g.story.zone);
  for (const [zid, list] of Object.entries(g.story.zoneObjects || {})) fill(list, zid);
  if (g.combat?.objects) fill(g.combat.objects, g.combat.map.id);
  // People on the map, for zones that had none when the save began (never twice, never over anyone standing there).
  if (g.story.zone && !hadNpcs.has(g.story.zone) && g.story.npcs && !g.story.npcs.some((n) => /^n\d+-/.test(n.id))) {
    const taken = new Set([...Object.values(g.story.positions || {}), ...g.story.npcs.map((n) => n.pos)]);
    g.story.npcs = [...initialNpcs(g).filter((n) => !taken.has(n.pos)), ...g.story.npcs];
  }
  for (const [zid, list] of Object.entries(g.story.zoneNpcs || {})) if (!hadNpcs.has(zid) && !list.length) delete g.story.zoneNpcs![zid];
  for (const n of g.story.npcs || []) if (!n.portrait) n.portrait = portraitFor(g, n.name) || undefined;
  { const seen: Record<string, number> = {}; for (const u of g.combat?.units || []) if (u.side === 'foe' && !u.img) { const p = portraitFor(g, u.name, seen); if (p) u.img = p; } }
  for (const pin of fresh.pins || []) applyMemOp(g, { op: 'pin', text: pin });
  return true;
}
