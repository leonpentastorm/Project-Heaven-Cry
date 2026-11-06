// The game: one state, one reducer. Every change is an action the engine checks against the rules (CLAUDE.md:
// "the engine owns numbers"). Players' clicks, the Narrator's tool calls and the host's buttons all come here.
import { ARCHETYPES, CLASS, PERK, SKILL, TN_LADDER, WEAPON, XP_SOURCES } from './data';
import {
  type Character, type Sheet, applyLevels, canRaise, comboEligible, eligibleClasses, grantAutomaticPerks, maxHp, mod, newCharacter,
  packOf, magsOf, loadAll, passive, pendingPerkSteps, validateSheet,
} from './character';
import { type Combat, type MapDef, type AttackMode, fireBurst, fireAuto, shove, toggleProne, brace, setOverwatch, MAPS, keyOf, refOf, standable, walkable, defaultObjects, spotTraps, dist, toggleDoor, active, analyze, pickUp, loadMagazine, shootCover, checkOver, clearJam, combatXp, endTurn, enemyTurn, moveUnit, previewAttack, reload, resolveAttack, startCombat, useStim } from './combat';
import { type Rng, d20, seedFrom } from './rng';
import { type Campaign, builtInCampaign, validateCampaign, zoneToMap } from './campaign';
import { type MapObject, type Approach, OBJ, makeObject, kindOf, blocksMove, isTrap, mergeApproaches, triedThisScene } from './objects';

export interface Player { id: string; name: string; initials: string; color: string; online: boolean }
export interface Entry {
  id: string; kind: 'narration' | 'player' | 'voice' | 'check' | 'system' | 'xp' | 'overreach' | 'combat' | 'scene';
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
  };
  checks: Check[]; overreach: Overreach[]; combat: Combat | null;
  awards: { charId: string; perkId: string }[];
  narrator: { busy: boolean; error: string | null; usage: { input: number; output: number; cacheRead: number; costUsd: number; calls: number } };
  /** The campaign being played (spec: Campaigns): copied in at session start, or loaded from a file by the host. */
  campaign?: Campaign | null;
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
  combat?: { name: string; map?: string; difficulty?: string; enemies: { name: string; tier: string; weapon: string; at?: string }[] } | null;
  /** The Narrator moves characters on the zone map, by grid reference ("C7"). */
  moves?: { charId: string; to: string }[];
  /** Move the whole party to another zone of the campaign (its id), or "". */
  travel?: string;
  /** The Narrator places, updates or removes map objects and points of interest, and writes their approaches. */
  objects?: { action: 'place' | 'update' | 'remove'; id: string; kind: string; at: string; name: string; text: string; hidden?: boolean; locked?: boolean;
    approaches: { label: string; skills: string[]; tn: number; stakes: string; success: Approach['success'] }[] }[];
  endScene?: { summary: string } | null;
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
  | { type: 'combat/reload'; unitId: string } | { type: 'combat/clear'; unitId: string } | { type: 'combat/stim'; unitId: string; targetId: string }
  | { type: 'combat/end-turn'; unitId: string } | { type: 'combat/analyze'; unitId: string; targetId: string }
  | { type: 'combat/pickup'; unitId: string; tile: string } | { type: 'combat/load'; unitId: string } | { type: 'combat/shoot-cover'; unitId: string; tile: string }
  | { type: 'gear/load'; charId: string } | { type: 'story/move'; charId: string; to: string } | { type: 'poi/examine'; charId: string; objId: string } | { type: 'poi/travel'; charId: string; objId: string } | { type: 'poi/try'; charId: string; objId: string; idx: number } | { type: 'story/door'; charId: string; objId: string } | { type: 'combat/say'; charId: string; text: string } | { type: 'combat/door'; unitId: string; tile: string } | { type: 'campaign/load'; campaign: Campaign }
  | { type: 'award/ack'; charId: string; perkId: string };

export class RuleError extends Error {}
const fail = (m: string): never => { throw new RuleError(m); };
const id = (g: GameState, p: string) => p + (++g.seq);
const push = (g: GameState, e: Omit<Entry, 'id'>) => { g.story.entries.push({ id: id(g, 'e'), ...e }); if (g.story.entries.length > 400) g.story.entries.splice(0, g.story.entries.length - 400); };
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
      g.story.spoken[by] = text;
      push(g, { kind: 'player', who: by, text, head: mine.map((c) => c.name).join(' & '), roll: !!a.roll });
      closeRoundIfDone(g);
      return;
    }
    case 'story/skip': {
      if (!isHost(g, by)) fail('Only the host can skip a player.');
      if (g.story.await !== 'players') return;
      g.story.spoken[a.playerId] = '';
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
    case 'award/ack': { g.awards = g.awards.filter((x) => !(x.charId === a.charId && x.perkId === a.perkId)); return; }
    case 'campaign/load': {
      if (!isHost(g, by)) fail('Only the host loads a campaign.');
      if (g.phase !== 'lobby') fail('Load a campaign before the session starts.');
      const errs = validateCampaign(a.campaign); if (errs.length) fail('That campaign file has problems: ' + errs.slice(0, 4).join(' '));
      g.campaign = JSON.parse(JSON.stringify(a.campaign)); g.settings.start = g.campaign!.id;
      if (g.campaign!.tone) g.settings.tone = g.campaign!.tone;
      return;
    }
    case 'story/move': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase !== 'story') fail(g.phase === 'combat' ? 'A fight is on: move on the combat grid.' : 'The session hasn\'t started.');
      if (c!.dead) fail('The dead stay where they fell.');
      const map = zoneMap(g), k = /,/.test(a.to) ? a.to : keyOf(a.to, map);
      if (!k || !standable(map, k)) fail('Nobody can stand there.');
      if (storyObjects(g).some((o) => o.pos === k && blocksMove(o))) fail('Something is in the way there.');
      const pos = positionsOf(g); if (Object.entries(pos).some(([id, p]) => id !== c!.id && p === k)) fail('Someone is already standing there.');
      if (!walkable(map, storyObjects(g), pos[c!.id], k!)) fail('There\'s no way through to there: a wall or a closed door is in the way.');
      pos[c!.id] = k!;
      arrive(g, c!, k!);
      return;
    }
    case 'story/door': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase !== 'story') fail('In a fight, doors cost 1 AP on the combat screen.');
      const o = storyObjects(g).find((x) => x.id === a.objId && kindOf(x).door); if (!o) fail('No such door.');
      if (dist(positionsOf(g)[c!.id], o!.pos) > 1) fail('Walk up to it first.');
      if (o!.locked) fail('Locked. Examine it for a way in.');
      o!.open = !o!.open; push(g, { kind: 'system', text: c!.name + (o!.open ? ' opens ' : ' closes ') + 'the ' + o!.name.toLowerCase() + ' at ' + refOf(o!.pos) + '.' });
      return;
    }
    case 'poi/examine': case 'poi/try': case 'poi/travel': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase !== 'story') fail('Deal with it after the fight.');
      if (g.story.await !== 'players') fail('Wait for your turn to speak.');
      if (g.story.spoken[by] != null) fail('You already acted this round.');
      if (g.checks.some((k) => !k.done && k.poi && g.characters[k.charId]?.owner === by)) fail('Roll your attempt first.');
      const o = storyObjects(g).find((x) => x.id === a.objId); if (!o || o.hidden) fail('Nothing like that here.');
      if (dist(positionsOf(g)[c!.id], o!.pos) > 1) fail('Walk up to it first (stand on it or next to it).');
      if (a.type === 'poi/travel') {
        if (!o!.to) fail('That doesn\'t lead anywhere.');
        const dest = campaignOf(g)?.zones.find((z) => z.id === o!.to)?.name || o!.to;
        const text = 'asks to travel to ' + dest + ' (the way out at ' + refOf(o!.pos) + ') [travel:' + o!.to + ']';
        g.story.spoken[by] = text; push(g, { kind: 'player', who: by, text: c!.name + ' ' + text + '.', head: c!.name });
        closeRoundIfDone(g); return;
      }
      if (a.type === 'poi/examine') {
        const text = 'examines the ' + o!.name.toLowerCase() + ' at ' + refOf(o!.pos) + ' [' + o!.id + ']';
        g.story.spoken[by] = text; push(g, { kind: 'player', who: by, text: c!.name + ' ' + text + '.', head: c!.name });
        closeRoundIfDone(g); return;
      }
      const ap = o!.approaches[a.idx]; if (!ap) fail('No such approach.');
      if (o!.resolved) fail('That\'s already dealt with.');
      if (triedThisScene(ap!, c!.id, g.story.scene.n)) fail(c!.name + ' already tried that this scene.');
      push(g, { kind: 'player', who: by, text: c!.name + ' tries: ' + ap!.label + ' (' + o!.name + ', ' + refOf(o!.pos) + ').', head: c!.name });
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
  if (speakers(g).every((p) => g.story.spoken[p.id] != null)) { g.story.await = 'narrator'; g.story.work = { kind: 'round' }; }
}

function rollCheck(g: GameState, ck: Check, c: Character, reroll: boolean) {
  // Combined checks (spec): the lowest modifier among the skills, +2 for each other skill with at least 1 point.
  const mods = ck.skills.map((s) => mod(c.skills[s] || 0)), low = Math.min(...mods), lowIx = mods.indexOf(low);
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
    if (p.tier === 'ultimate') g.awards.push({ charId: c.id, perkId: pid });
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
    awardAutomatic(g, c);
  }
  for (const x of t.treat || []) {
    const c = g.characters[x.charId]; if (!c || !c.injuries?.length) continue;
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
    g.story.zone = t.travel; g.story.positions = {}; g.story.objects = zo[t.travel] || defaultObjects(zoneMap(g)); positionsOf(g);
    push(g, { kind: 'system', text: 'The party travels to ' + zoneMap(g).name + '.' });
  }
  for (const op of t.objects || []) applyObjectOp(g, op);
  if (t.endScene?.summary) g.story.journal.push(t.endScene.summary);
  if (t.combat && t.combat.enemies?.length) {
    const want = t.combat.map ? mapFor(g, t.combat.map) : null, map = want || zoneMap(g), same = map.id === zoneMap(g).id, pos = positionsOf(g);
    const pcs = Object.values(g.characters).filter((c) => !c.dead).map((c) => ({ c, pos: same ? pos[c.id] : undefined }));
    const foes = t.combat.enemies.slice(0, 7).map((e) => ({ name: e.name || 'Hostile', tier: e.tier, weapon: WEAPON[e.weapon] ? e.weapon : 'service_pistol', at: e.at || '' }));
    g.combat = startCombat(t.combat.name || 'Fight', map, pcs, foes, t.combat.difficulty || 'standard', g.rng, same ? storyObjects(g) : undefined);
    g.phase = 'combat'; g.story.await = 'none';
    push(g, { kind: 'combat', text: 'Combat: ' + g.combat.name });
    runEnemies(g);
    return;
  }
  if (g.checks.some((x) => !x.done)) { g.story.await = 'rolls'; return; }
  if (g.overreach.some((x) => !x.choice)) { g.story.await = 'choices'; return; }
  // Results consumed: the next round opens.
  g.checks = []; g.overreach = [];
  g.story.round++; g.story.spoken = {}; g.story.await = 'players';
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
  switch (a.type) {
    case 'combat/move': err = moveUnit(cb!, u, a.to, g.rng, a.how || 'move'); break;
    case 'combat/shove': { const t = cb!.units.find((x) => x.id === a.targetId); if (!t || t.side === u.side) fail('Pick a hostile.'); err = shove(cb!, g.rng, u, t!); break; }
    case 'combat/prone': err = toggleProne(cb!, u); break;
    case 'combat/brace': err = brace(cb!, u); break;
    case 'combat/overwatch': err = setOverwatch(cb!, u, a.mode); break;
    case 'combat/attack': {
      const t = cb!.units.find((x) => x.id === a.targetId); if (!t || t.side === u.side) fail('Pick a hostile.');
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
    default: fail('Unknown action.');
  }
  if (err) fail(err);
  checkOver(cb!);
  runEnemies(g);
}

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
  for (const u of cb.units) if (u.charId) {
    const c = g.characters[u.charId];
    c.hp = u.dead ? 0 : Math.max(u.downed ? 1 : u.hp, 1); c.dead = u.dead;
    c.injuries = (u.injuries || []).filter((i) => i.loc === 'arm' || i.loc === 'leg');
    // Ammo carried out of the fight (spec: Reloading).
    c.loaded = u.ammo;
    const pack = packOf(c).map((it) => ({ ...it }));
    const mi = pack.findIndex((it) => it.weapon === c.weapon && it.mags);
    if (mi >= 0 && u.mags) { pack[mi].mags = [...u.mags]; pack[mi].qty = u.mags.length; }
    const w = WEAPON[c.weapon];
    if (u.loose != null) { let left = u.loose; for (const it of pack) if (it.calibre && it.calibre === w?.ammo) { it.qty = Math.min(it.qty, left); left -= it.qty; } }
    for (const x of u.extra || []) { let it = pack.find((p) => p.weapon === x.weapon && p.mags); if (!it) { it = { ...magsOf(x.weapon, 0), mags: [] }; pack.push(it); } it.mags!.push(x.rounds); it.qty = it.mags!.length; }
    c.pack = pack.filter((it) => it.qty > 0 || it.mags);
    const fam = WEAPON[u.weapon]?.mastery_family; if (fam && u.kills) c.weaponKills[fam] = (c.weaponKills[fam] || 0) + u.kills;
  }
  const won = cb.over === 'win';
  cb.summary = (won ? 'Won' : 'Lost') + ' "' + cb.name + '" in ' + cb.round + ' rounds. ' + cb.units.map((u) => u.name + (u.dead ? ' (dead)' : u.downed ? ' (down)' : ' ' + u.hp + '/' + u.maxHp + ' HP')).join(', ') + '.';
  push(g, { kind: 'combat', text: cb.summary });
  if (won) for (const c of Object.values(g.characters)) if (!c.dead) giveXp(g, c, 'combat', combatXp(cb), cb.difficulty + ' fight');
  // Where everyone ends up becomes the story's positions.
  g.story.zone = cb.map.id; g.story.positions = {}; g.story.objects = JSON.parse(JSON.stringify(cb.objects || []));
  for (const u of cb.units) if (u.charId && !u.dead) g.story.positions[u.charId] = u.pos;
  g.phase = 'story'; g.story.await = 'narrator'; g.story.work = { kind: 'combat_end', note: combatReport(cb) };
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
  g.story.spoken[by] = 'tried an approach'; // the attempt is this player's turn this round
  if (o && ap) {
    ap.tries.push({ charId: c.id, name: c.name, ok: !!ck.roll?.ok, total: ck.roll?.total || 0, scene: g.story.scene.n });
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
  // Hidden objects (unspotted traps) stay hidden from every player, the host included.
  if (g.story.objects) v.story.objects = g.story.objects.filter((o) => !o.hidden);
  if (g.combat?.objects) v.combat = { ...g.combat, objects: g.combat.objects.filter((o) => !o.hidden) };
  return v;
}

export const archetypes = ARCHETYPES;
