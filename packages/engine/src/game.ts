// The game: one state, one reducer. Every change is an action the engine checks against the rules (CLAUDE.md:
// "the engine owns numbers"). Players' clicks, the Narrator's tool calls and the host's buttons all come here.
import { ARCHETYPES, CLASS, PERK, TRAITS, SKILL, TN_LADDER, WEAPON, XP_SOURCES, ITEM, SIGIL, SCHOOL, MODULE, TONE, ENEMY, MANA_BANDS } from './data';
import provingJ from '../../../data/campaigns/proving.json';
import classesJ from '../../../data/classes.json';
import {
  type Character, type Sheet, restockResources, advancedClassError, applyLevels, canRaise, comboEligible, eligibleClasses, grantAutomaticPerks, maxHp, mod, newCharacter,
  packOf, magsOf, roundsOf, loadAll, equip, unequip, fitMod, type Rarity, type PackItem, magazineSize, maxDurOf, hasEvoker, xpForLevel, classRank, passive, pendingPerkSteps, validateSheet, plotItem, plotId, type OutburstDesign, maxMp, wordsKnownCap, moduleSlots, readyDesigns, hasEmanator, traitGainError, armourCap, collectGuns, partError, startCollection,
} from './character';
import { drawGlyph, evoke as evokeSpell, scuff as scuffGlyph, vent as ventFlux, swapCore, beginOutburst, releaseOutburst, pumpOutburst, letGo, steadyHeart, feedOutburst, setHeartWatch, magicTurnEnd, migrateHeld, type HeldOutburst, syphon as syphonMana, crystallise as crystalliseCore, magicToCharacter, manaOf, MANA_START, CORE_CHARGE, noteDeaths, magicRoundTick, magicTurnStart, condTurnEnd, spellTargets, type Glyph, type Zone, strikeTurret, evokeTargets, migrateStorySigil, secretFrom, SIGIL_REV } from './magic';
import { migrateCharacterSigils, migrateCharacterSoul, migrateDesign, checkOutburstDesign, designShapeError, pairingError } from './character';
import { unitSees, reloadHands, type Combat, noteSighted, type MapDef, type AttackMode, type FxEvent, FX_CAP, emitFx, useWeaponSkill, fieldRepair, pairedAttack, fireBurst, fireAuto, shove, toggleProne, brace, setOverwatch, MAPS, keyOf, refOf, standable, walkable, defaultObjects, spotTraps, dist, toggleDoor, active, analyze, pickUp, loadMagazine, shootCover, checkOver, clearJam, combatXp, endTurn, enemyTurn, moveUnit, previewAttack, reload, resolveAttack, startCombat, useStim, paths, apForTiles, unitFromCharacter, unitFromEnemy, beginTurn, objectsOf, lineOfSight, litAt, isMelee, attackApCost, effectiveRange } from './combat';
import { type Rng, d20, seedFrom } from './rng';
import { type Campaign, builtInCampaign, validateCampaign, zoneToMap } from './campaign';
import { type MusicState, musicOf, startSong, songEnded, pinSong, unpinSong, musicAfterFight, musicOnTravel, musicTraitOf, songMod, SONG_AP } from './music';
import { type Memory, type MemOp, type MemEdit, editMemory, memoryOf, applyMemOp, canon, noteScene, rollChapter, chapterDue, findPerson, SCENES_PER_CHAPTER } from './memory';
import { type MapObject, type Approach, OBJ, makeObject, kindOf, blocksMove, isTrap, mergeApproaches, triedThisScene } from './objects';
import { applyDamage } from './effects/damage';
import { actionAp } from './effects/core';
import { bindGame, emit as emitHook, emitStory, holdersOf, checkQuery, perkActionsFor, previewPerkAction, runPerkAction, windowStep, pendRuling, setStoryPoster, gainEcho, skillRollMod, xpAfter, uses as usesOf, scopeOf, actionDefs, itemKey, type PendingRuling, type ActionArgs } from './effects';
import { throwItem, pray, parley, hideAction, extinguish, escapeGrapple, recoverWeapon, hide as hideUnit, PATRON, changeDevotion, devotionOf, AMMO_TYPES, ammoId, KINDS, FOE_TAGS, companionUnits, type FoeTraits } from './tactics';
import { condSource, applyCond as applyCondition, isCondition } from './magic';
import { type MissionState, oocOf, askOoc, startMissions, missionTurn, placeBoardNpc } from './missions';
import './perks';
import './classes';
import { runGift } from './classes/i';
import { CASTER, armFoe } from './ai-sigil';
import { HEART_CASTER, armHeart } from './ai-soul';

export interface Player { id: string; name: string; initials: string; color: string; online: boolean }
export interface Entry {
  id: string; kind: 'narration' | 'player' | 'voice' | 'check' | 'system' | 'xp' | 'overreach' | 'combat' | 'scene' | 'art' | 'ooc';
  /** A mission log line (missions.ts): start, done, failed, reveal, side, complete, end. Everyone gets a toast. */
  mission?: string;
  /** For kind art: the asset id of a story moment (spec: Campaigns, moments). */
  art?: string;
  text: string; head?: string; who?: string; skill?: string; charId?: string; to?: string; ok?: boolean; roll?: boolean;
  /** The item key of a perk, trait or class use ("class:twinbound.manifest"): for the Narrator and the engine, never shown to players. */
  ref?: string;
  /** An action someone took on the area map (a shot, a reload, a door): shown as an action line and in the map's log. */
  act?: boolean;
  /** Out of character (names players, not characters): shown to players, never sent to the Narrator. */
  ooc?: boolean;
  /** A Narrator turn the room voted to reroll: kept greyed out, never sent to the Narrator. */
  rerolled?: boolean;
  /** The Narrator's original words, when the room voted to have them rewritten. */
  original?: string;
}
export interface Hook { id: string; skill: string; tn: number; truth: 'true' | 'partial' | 'misleading'; line: string }
export interface Check {
  id: string; charId: string; skills: string[]; tn: number; stakes: string; done: boolean;
  /** A try at an object's approach (spec: Points of interest): the result is recorded on the object. */
  poi?: { objId: string; idx: number };
  /** What kind of check this is, for items that apply only to some (dialogue, crowd, military…; effects/core.ts
   * TAG_VOCAB), the NPC it is against, and items the Narrator says apply. Optional; the Narrator sets them. */
  tags?: string[]; target?: string; applies?: string[];
  /** Rules 1.3 check fields: a save (kind 'save', with its family), an ally who helps (footnote: their charId), doubled
   * stakes (Gambler), and a result the Narrator or an item settles without the die (auto). */
  kind?: 'save'; family?: 'body' | 'brain' | 'heart'; footnote?: string; double?: boolean; auto?: 'success' | 'fail';
  /** Item modifiers that went into the roll, by name (shown in the check's head). */
  mods?: { add: number; label: string }[];
  roll?: { die: number; mod: number; total: number; ok: boolean; crit: boolean; fumble: boolean; rerolled: boolean; first?: number };
}
export interface Overreach { id: string; charId: string; skill: string; push: string; choice?: 'indulge' | 'resist' }
export type NarratorWork = null | { kind: 'opening' | 'round' | 'results' | 'combat_end' | 'epilogue'; note?: string;
  /** A reroll the room voted for: what the players asked the Narrator to do differently (spec: Rerolls and edits). */
  redo?: string };

export interface GameState {
  v: number; seq: number; rng: Rng; code: string; hostId: string;
  settings: { mode: 'ai' | 'human'; tone: string; start: string; model: string };
  phase: 'lobby' | 'story' | 'combat';
  players: Player[]; characters: Record<string, Character>;
  story: {
    entries: Entry[]; round: number; spoken: Record<string, string>;
    await: 'none' | 'players' | 'narrator' | 'rolls' | 'choices';
    scene: { title: string; n: number; hooks: Hook[]; revealed: string[]; asked: Record<string, string[]>; fired: Record<string, string[]>;
      /** In a player's view only: for each of their characters, the skills with a voice hook not yet revealed to it (no lines, no TNs). */
      voiced?: Record<string, string[]>;
      /** NPCs' conditions for this scene (rules 1.3: Shaken out of combat lasts the rest of the scene), by NPC id or name. */
      npcConds?: Record<string, string[]> };
    journal: string[]; work: NarratorWork;
    /** Where an NPC token was last seen when it slipped out of sight (Got You in My Sight II): token id → tile. */
    lastSeen?: Record<string, string>;
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
    /** Weapon heat and jams carried between overworld actions (heat cools by 2 each round; a jam stays until cleared). */
    heat?: Record<string, number>; jammed?: Record<string, boolean>;
    /** Magic on the story map (spec: Mana): glyphs and zones (and the zone they're drawn in), the mana meter, and each
     * character's Flux, Strain, held Outburst, conditions and shield between overworld actions. */
    glyphs?: Glyph[]; zones?: Zone[]; glyphMap?: string; mana?: number;
    /** The last id number given to placed Sigil magic on the area map (glyphs 'gl', zones 'z', RAISE walls 'sw'): kept
     * so ids never repeat between area-map actions (an Evoke uses its glyphs up, a wall outlives them). */
    glyphSeq?: number;
    magic?: Record<string, { flux: number; strain: number; held: HeldOutburst | null; conds?: Record<string, number>; shield?: number; cast?: boolean; condBy?: Record<string, string>;
      /** Rules 1.5: free Pumps left this round, the calming ways used this round. */ freePumps?: number; calmFight?: boolean; calmTend?: boolean }>;
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
    /** Presentation events from area-map actions (the same shape as a fight's, see FxEvent), capped at FX_CAP. */
    fx?: FxEvent[]; fxSeq?: number;
    /** What the Narrator owes or must rule for perks and traits (sent only while non-empty; effects/narrator.ts). */
    rulings?: PendingRuling[];
    /** Item state between overworld actions (units are rebuilt every action), by character: uses, per-item state. */
    ps?: Record<string, any>;
    /** Patrons' moods: the TN of a prayer to each (12 by default; the Narrator moves it). */
    patronMood?: Record<string, number>;
    /** Missions and objectives (missions.ts); absent for campaigns without missions and for old saves. */
    missions?: MissionState;
    /** OOC questions waiting for the Narrator's next turn (seq: when asked). */
    oocAsk?: { seq: number; who: string; name: string; text: string }[];
    /** The campaign is over (its last mission ended and the epilogue was told). */
    complete?: boolean;
  };
  checks: Check[]; overreach: Overreach[]; combat: Combat | null;
  awards: { charId: string; perkId: string }[];
  narrator: { busy: boolean; error: string | null; /** g.seq when the in-flight call began: later rulings weren't in its prompt. */ beganSeq?: number; usage: { input: number; output: number; cacheRead: number; costUsd: number; calls: number; last?: number; max?: number; recent?: number[]; rewrites?: number } };
  /** The campaign being played (spec: Campaigns): copied in at session start, or loaded from a file by the host. */
  campaign?: Campaign | null;
  /** What the room hears (spec: Music). */
  music?: MusicState;
  /** Rerolls and edits (spec: Rerolls and edits): suggestions to the host, the vote under way, and the Narrator's
   * latest turns that can still be rerolled (by the id of the line each one opened with). */
  votes?: { suggestions: Suggestion[]; open: Vote | null; turns: string[]; seq: number };
  /** The Narrator's long-term memory (spec: The Narrator's memory). Host only: views never carry it. */
  memory?: Memory;
  /** Every story line that scrolled out of the live log, kept forever on the host's computer for recall. */
  archive?: Entry[];
  /** The Proving Ground (practice mode): endless waves on one map, no Narrator, no XP, no story (see Sandbox). */
  sandbox?: Sandbox | null;
  /** Sessions started in this room, and rests taken this session: the stamps of per-session and per-rest item uses
   * (effects/uses.ts). Old saves: session 1, no rests. */
  sessionN?: number; restN?: number;
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
  checks?: { charId: string; skills: string[]; tn: number; stakes: string; tags?: string[]; target?: string; applies?: string[]; kind?: 'save'; family?: 'body' | 'brain' | 'heart'; footnote?: string; double?: boolean; auto?: 'success' | 'fail' }[];
  /** Answers to Pending rulings (perks and traits): accepted or not; a refused story use is refunded. */
  perkRulings?: { id: string; accepted: boolean; note?: string }[];
  // ---------- rules 1.3: optional fields for perks, traits and classes (all ignored when absent) ----------
  /** Private lines an item owes its holder (Detective's Eye details, a Cold Read tell): shown only to that player,
   * outside the 2-voice cap. key names the item ("perk:detectives_eye"). */
  perkLines?: { charId: string; key?: string; text: string }[];
  /** Conditions in the story: on an NPC (target its id or name) for the scene, or on a character for the scene, the
   * session or the arc (Shaken for the rest of the scene, a curse until the arc ends). end: true removes it. */
  conditions?: { target: string; id: string; scope?: 'scene' | 'session' | 'arc'; end?: boolean; note?: string }[];
  /** State an item keeps that only the Narrator can set (a grudge's target, a cover identity, a rival, a case). */
  traitState?: { charId: string; key: string; value: any }[];
  /** Echo the story gives or takes (within 0..3). */
  echo?: { charId: string; n: number; why?: string }[];
  /** Karma awards (spec: Karma): amount, and whether the act was unlawful (traits that lock Karma read it). */
  karma?: { charId: string; amount: number; unlawful?: boolean; why?: string }[];
  /** The party rests (spec: Rest): short (1 hour) or long (8 hours); settlement: somewhere safe and supplied. */
  rest?: { kind: 'short' | 'long'; settlement?: boolean } | null;
  /** Things a character now understands (Lab Coat's identified rules, an item's nature): by name. */
  identify?: { charId: string; what: string }[];
  /** A tutor met (spec: Classes, advanced classes): the advanced class id it can teach. */
  tutors?: { charId: string; classId: string }[];
  /** Patron pacts and Devotion (spec: Patrons and prayer): make a pact (patron id), or change Devotion by delta. */
  patrons?: { charId: string; patron?: string; devotion?: number }[];
  /** The patron's mood: the TN of prayers to it (12 by default). */
  patronMood?: { patron: string; tn: number }[];
  overreach?: { charId: string; skill: string; push: string }[];
  xp?: { charId: string; source: string; amount: number; reason?: string }[];
  deeds?: { charId: string; perkId: string; deed: string }[];
  /** A story moment to show (an illustration), by id; only those open in this zone count. */
  moment?: string;
  /** Mechanical actions a player declared in words ("I move to A15 and shoot the guard"), run by the engine as that
   * player's own actions when the next round opens, from their fresh AP, with every normal rule (spec: Overworld rounds). */
  actions?: { charId: string; act: WorldAct; to?: string; how?: 'move' | 'sprint' | 'sneak'; targetId?: string; mode?: AttackMode; objId?: string; word?: string; tile?: string; aim?: string; design?: string; hold?: boolean; watch?: boolean; on?: boolean; aims?: string[]; dest?: string; order?: string; orderTo?: string; paint?: string }[];
  /** Place, move, update or remove people and enemies on the overworld map. */
  npcs?: { action: 'place' | 'move' | 'update' | 'remove'; id?: string; name?: string; side?: 'hostile' | 'neutral'; tier?: string; weapon?: string; at?: string; kind?: string; tags?: string[]; hidden?: boolean }[];
  /** fromTalk: the fight broke out of the talk just had (Talks Broke Down); absent = the engine's guess from the last check. */
  combat?: { name: string; map?: string; difficulty?: string; fear?: boolean; fromTalk?: boolean; enemies: ({ name: string; tier: string; weapon: string; at?: string } & FoeTraits)[] } | null;
  /** The Narrator moves characters on the zone map, by grid reference ("C7"). */
  moves?: { charId: string; to: string }[];
  /** Move the whole party to another zone of the campaign (its id), or "". */
  travel?: string;
  /** Things found or given: a weapon or item id, how many, and for weapons a rarity and an optional name. */
  /** An unknown or empty item id gives a plot item (name, and text as its one-line description); a negative qty takes a plot item back. */
  loot?: { charId: string; item: string; qty: number; rarity?: Rarity; name?: string; text?: string }[];
  /** The Narrator places, updates or removes map objects and points of interest, and writes their approaches. */
  objects?: { action: 'place' | 'update' | 'remove'; id: string; kind: string; at: string; name: string; text: string; hidden?: boolean; locked?: boolean;
    approaches: { label: string; skills: string[]; tn: number; stakes: string; success: Approach['success'] }[] }[];
  endScene?: { summary: string } | null;
  /** Memory upkeep (spec: The Narrator's memory): people, threads, facts, factions and pins to add or update. */
  memory?: MemOp[];
  /** Magic the story teaches (spec: The Magic panel): a tutor's Sigil word, or an Outburst school or module learned
   * from a moment that shook the character. */
  magic?: { charId: string; word?: string; school?: string; module?: string; tone?: string; reason?: string }[];
  /** The air here, set by the place (spec: the meter): 0-40, e.g. a chapel Flooded at 32, a vacuum lab Thin at 4. */
  mana?: number | null;
  /** When asked: the oldest scenes rolled into a chapter, and the saga (the story so far) rewritten. */
  chapter?: { title: string; summary: string; saga: string } | null;
  /** Arm and leg injuries the story treated (a long rest with a Medic, surgery, a field hospital). */
  treat?: { charId: string; loc: 'arm' | 'leg' | 'all' }[];
  /** HP the story takes out of a fight (a fall, a beating, fire): the engine applies it through damage taken, so items
   * that change damage (Soulmate, Scar Tissue) count. type: physical, fire, elemental, true. */
  harm?: { charId: string; amount: number; type?: string; why?: string }[];
  // ---------- OOC and missions (missions.ts; all optional) ----------
  /** A plain out-of-character answer to the players' OOC questions ("" when there is none). */
  ooc?: string;
  /** Objectives done, failed or revealed (a mission id alone reveals a hidden mission). Unknown ids are ignored. */
  missions?: { mission: string; objective?: string; status: 'done' | 'failed' | 'revealed'; note?: string }[];
  /** The branch to follow when a closed mission leads to several. */
  missionNext?: string;
  /** Side jobs the Narrator adds or settles (never main missions). */
  side?: { id: string; title?: string; text?: string; status?: 'open' | 'done' | 'failed' }[];
};
export type Action =
  | { type: 'player/join'; id: string; name: string } | { type: 'player/online'; id: string; online: boolean } | { type: 'player/kick'; id: string }
  | { type: 'settings'; patch: Partial<GameState['settings']> }
  | { type: 'char/add'; sheet: Sheet } | { type: 'char/remove'; charId: string }
  | { type: 'session/start' }
  | { type: 'story/speak'; text: string; roll?: boolean; ooc?: boolean } | { type: 'story/skip'; playerId: string }
  | { type: 'narrator/begin' } | { type: 'narrator/turn'; turn: NarratorTurn } | { type: 'narrator/error'; message: string }
  | { type: 'narrator/usage'; input: number; output: number; cacheRead: number; costUsd: number; kind?: 'turn' | 'rewrite' } | { type: 'narrator/retry' }
  | { type: 'check/roll'; checkId: string } | { type: 'check/reroll'; checkId: string } | { type: 'check/accept'; checkId: string }
  | { type: 'voice/ask'; charId: string; skill: string } | { type: 'overreach/choose'; id: string; choice: 'indulge' | 'resist' }
  | { type: 'levelup/raise'; charId: string; kind: 'skill' | 'attr' | 'core'; id: string } | { type: 'levelup/class'; charId: string; classId: string }
  | { type: 'levelup/perk'; charId: string; perkId: string }
  | { type: 'combat/move'; unitId: string; to: string; how?: 'move' | 'sprint' | 'disengage'; mods?: string[] } | { type: 'combat/attack'; unitId: string; targetId: string; mode: AttackMode; mods?: string[] }
  | { type: 'combat/shove'; unitId: string; targetId: string } | { type: 'combat/prone'; unitId: string } | { type: 'combat/brace'; unitId: string } | { type: 'combat/overwatch'; unitId: string; mode: 'shot' | 'aimed' | 'melee' }
  | { type: 'combat/gift'; unitId: string; aim: string }
  | { type: 'combat/skill'; unitId: string; targetId?: string } | { type: 'combat/repair'; unitId: string; targetId?: string } | { type: 'combat/paired'; unitId: string; targetId: string; targetId2?: string }
  | { type: 'gear/equip'; charId: string; idx: number; to: 'main' | 'off' | 'worn' } | { type: 'gear/unequip'; charId: string; slot: string } | { type: 'gear/mod'; charId: string; idx: number }
  | { type: 'combat/reload'; unitId: string; hand?: 'main' | 'off' | 'both' } | { type: 'combat/clear'; unitId: string } | { type: 'combat/stim'; unitId: string; targetId: string }
  // Shared subsystems (rules 1.3): throw, swap a hand, pray, talk mid-fight, hide, put out a fire, break a hold, recover a weapon.
  | { type: 'combat/throw'; unitId: string; item: string; tile: string } | { type: 'combat/swap'; unitId: string; from?: 'off' | number; mod?: number }
  | { type: 'combat/pray'; unitId: string; choice?: string; targetId?: string; miracle?: boolean }
  | { type: 'combat/parley'; unitId: string; targetId: string; kind: 'persuade' | 'threaten' | 'parley'; text?: string }
  | { type: 'combat/hide'; unitId: string } | { type: 'combat/extinguish'; unitId: string; targetId?: string } | { type: 'combat/escape'; unitId: string } | { type: 'combat/recover'; unitId: string }
  | { type: 'levelup/advanced'; charId: string; classId: string } | { type: 'rest'; kind: 'short' | 'long' } | { type: 'story/ask-rest'; charId: string; kind: 'short' | 'long' } | { type: 'story/pray'; charId: string; text?: string }
  | { type: 'gear/ammo'; charId: string; ammo: string }
  // Plot items (spec: Plot items): hand one to another character, or drop it (gone from the story).
  | { type: 'gear/give'; charId: string; idx: number; to: string; qty?: number } | { type: 'gear/drop'; charId: string; idx: number; qty?: number }
  | { type: 'combat/end-turn'; unitId: string } | { type: 'combat/analyze'; unitId: string; targetId: string }
  | { type: 'combat/pickup'; unitId: string; tile: string } | { type: 'combat/load'; unitId: string } | { type: 'combat/shoot-cover'; unitId: string; tile: string }
  | { type: 'gear/load'; charId: string } | { type: 'story/move'; charId: string; to: string } | { type: 'poi/examine'; charId: string; objId: string } | { type: 'poi/travel'; charId: string; objId: string } | { type: 'poi/try'; charId: string; objId: string; idx: number } | { type: 'story/door'; charId: string; objId: string } | { type: 'combat/say'; charId: string; text: string } | { type: 'combat/door'; unitId: string; tile: string } | { type: 'campaign/load'; campaign: Campaign }
  | { type: 'award/ack'; charId: string; perkId: string }
  | { type: 'world/act'; charId: string; act: WorldAct; to?: string; how?: 'move' | 'sprint' | 'sneak'; targetId?: string; mode?: AttackMode; objId?: string; word?: string; tile?: string; aim?: string; design?: string; hold?: boolean; aims?: string[]; dest?: string; order?: string; orderTo?: string; paint?: string; id?: string; actionId?: string; choice?: string; text?: string; npc?: string; mods?: string[]; unit?: string }
  // Magic (spec: Mana, rules 1.2)
  | { type: 'combat/draw'; unitId: string; word: string; tile: string } | { type: 'combat/evoke'; unitId: string; tile: string; aim?: string; aims?: string[]; dest?: string; order?: string; orderTo?: string; paint?: 'spread' | 'push' } | { type: 'combat/strike-turret'; unitId: string; tile: string } | { type: 'combat/scuff'; unitId: string }
  | { type: 'combat/vent'; unitId: string } | { type: 'combat/core'; unitId: string } | { type: 'combat/outburst'; unitId: string; design: string; aim?: string; hold?: boolean; watch?: boolean }
  | { type: 'combat/release'; unitId: string; aim?: string } | { type: 'combat/syphon'; unitId: string } | { type: 'combat/crystallise'; unitId: string }
  // Outburst 2.0 (rules 1.5): combat/outburst Begins and holds at stage 0; with an aim (and no hold: true) it is a snap
  // cast, Begin + Release at once at stage 0 (3 AP, ×0.6); then Pump, Release, Let go, Steady the heart, Feed (a glyph on your tile), Heart Overwatch.
  | { type: 'combat/pump'; unitId: string } | { type: 'combat/letgo'; unitId: string } | { type: 'combat/steady'; unitId: string } | { type: 'combat/feed'; unitId: string }
  | { type: 'combat/heartwatch'; unitId: string; on?: boolean }
  | { type: 'magic/learn'; charId: string; word?: string; module?: string; school?: string; tone?: string; from: 'ally' | 'plate' } | { type: 'magic/design'; charId: string; design: OutburstDesign } | { type: 'magic/forget'; charId: string; designId: string }
  | { type: 'story/pass' } | { type: 'story/focus'; charId: string; objId?: string; hover?: number } | { type: 'story/unfocus' }
  | { type: 'vote/suggest'; kind: 'reroll' | 'edit'; entryId: string; note?: string } | { type: 'vote/dismiss'; id: string }
  | { type: 'vote/start'; kind: 'reroll' | 'edit'; entryId: string; note?: string; suggestionId?: string; undo?: string } | { type: 'vote/cast'; yes: boolean } | { type: 'vote/close' }
  | { type: 'narrator/rewrite'; entryId: string; text: string; refused?: string }
  | { type: 'campaign/refresh' } | { type: 'memory/edit'; edit: MemEdit }
  | { type: 'music/end'; seq: number } | { type: 'music/play'; charId: string } | { type: 'music/pin'; charId: string } | { type: 'music/unpin'; charId: string } | { type: 'combat/song'; unitId: string }
  // Perks, traits and class moves (effects/actions.ts): id is the item key ("perk:earthbreaker") or a bare id.
  | ({ type: 'combat/perk'; unitId: string; id: string; actionId?: string } & ActionArgs) | { type: 'combat/decline'; unitId: string }
  | ({ type: 'story/perk'; charId: string; id: string; actionId?: string } & ActionArgs)
  | SandboxAction;

/** A person or enemy on the overworld map. Neutral ones turn hostile when attacked. */
export interface Npc { id: string; name: string; side: 'hostile' | 'neutral'; tier: string; weapon: string; pos: string; portrait?: string; facing?: [number, number]; analyzed?: boolean;
  /** A Sigil caster archetype (enemies.json `casters`; rules 1.4, ai-sigil.ts): it fights with an Evoker. */ caster?: string;
  /** What it is and its tags (rules 1.3: human, robot, crawler…; military, hunter, no_surrender…); a prisoner who gave up. */
  kind?: string; tags?: string[]; prisoner?: boolean;
  /** Its scene conditions out of combat (Shaken for the rest of the scene…): id → the scene number it lasts through. */
  conds?: Record<string, number>;
  /** HP carried from a fight it walked away from (the Proving Ground's stopped fight); absent = full. */
  hp?: number;
  /** Lurking: placed by the Narrator as unseen (a sneaking hostile, an ambush in wait). Its token is hidden from the
   * players until an item or a spot reveals it (Wind on the Skin, Skin Map, Sixth Sense), and it starts a fight Hidden. */
  hidden?: boolean }

export type WorldAct = 'move' | 'end' | 'reload' | 'load' | 'clear' | 'repair' | 'prone' | 'stim' | 'analyze' | 'attack' | 'door' | 'perk'
  | 'draw' | 'evoke' | 'scuff' | 'vent' | 'core' | 'outburst' | 'release' | 'syphon' | 'crystallise' | 'pump' | 'letgo' | 'steady' | 'feed' | 'heartwatch';
export interface Suggestion { id: string; by: string; kind: 'reroll' | 'edit'; entryId: string; note: string }
export interface Vote { id: string; kind: 'reroll' | 'edit'; entryId: string; note: string; from: string; suggestedBy?: string; undo?: string;
  /** A Foreseen rewind (Conscience Mastered): the character whose once-a-session use it is (kept spent after the rewind). */
  foresee?: { charId: string; key: string };
  /** Everyone who must say yes: the players online when the vote started. */
  voters: string[]; yes: string[]; no: string[]; status: 'open' | 'passed' | 'failed' }
export class RuleError extends Error {}
const fail = (m: string): never => { throw new RuleError(m); };
const id = (g: GameState, p: string) => p + (++g.seq);
const push = (g: GameState, e: Omit<Entry, 'id'>) => { g.story.entries.push({ id: id(g, 'e'), ...e }); if (g.story.entries.length > 400) (g.archive ||= []).push(...g.story.entries.splice(0, g.story.entries.length - 400)); };
// Story-side item uses post their lines through the game's own push (effects/narrator.ts postStory).
setStoryPoster((g: GameState, e: any) => { push(g, e); return g.story.entries.at(-1)!.id; });
const charsOf = (g: GameState, pid: string) => Object.values(g.characters).filter((c) => c.owner === pid && !c.dead);
const isHost = (g: GameState, by: string) => by === g.hostId;
/** Players taking part in the round: everyone with a living character. */
export const speakers = (g: GameState) => g.players.filter((p) => charsOf(g, p.id).length > 0);

/** Apply one action by one player. Returns a new state, or throws RuleError with a plain sentence. */
/** The largest portrait a room takes (a data URL of the 320 × 400 copy is about 30 KB). */
export const PORTRAIT_MAX = 150_000;
/** Everything else on a sheet (identity text included), so one character can't bloat every message. */
export const SHEET_MAX = 30_000;
/** Why this room refuses this sheet from this player (char/add's checks, also run by the creation screen before it
 * stamps a record), or null. */
export function roomSheetError(g: GameState, by: string, sheet: Sheet): string | null {
  const err = validateSheet(sheet); if (err) return err;
  // Rooms carry only the small copy of an uploaded portrait (spec: Character files); the full one stays in the file.
  if (typeof sheet.portrait === 'string' && sheet.portrait.length > PORTRAIT_MAX) return 'That portrait is too big for a room. Re-upload it on the creation screen.';
  if (JSON.stringify({ ...sheet, portrait: '' }).length > SHEET_MAX) return 'That character carries too much text for a room.';
  if (!g.players.some((p) => p.id === by)) return 'Join the room first.';
  if (charsOf(g, by).length >= 2) return 'Two characters per player at most.';
  return null;
}

export function apply(state: GameState, action: Action, by: string): GameState {
  const g: GameState = JSON.parse(JSON.stringify(state));
  // Items' handlers see this game (h.g, h.c) for the length of the action: one synchronous step, so deterministic.
  const was = bindGame(g);
  for (const c of Object.values(g.characters || {})) { const notes = [...migrateCharacterSigils(c), ...migrateCharacterSoul(c)]; if (g.story?.entries) for (const n of notes) push(g, { kind: 'system', text: n }); } // rules 1.4 words (item 441), rules 1.5 designs
  try { reduce(g, action, by); } finally { bindGame(was); }
  if (g.sandbox && action.type.startsWith('levelup/')) sandboxResync(g, (action as { charId: string }).charId);
  if (g.sandbox) { const was2 = bindGame(g); try { sandboxAfter(g, action, by); } finally { bindGame(was2); } } // the Proving Ground's roster (multiplayer)
  if (g.combat && g.phase === 'combat') noteSighted(g.combat); // what the party has seen so far (the fight music reads it)
  g.v++;
  return g;
}

function reduce(g: GameState, a: Action, by: string) {
  if (a.type.startsWith('sandbox/')) { sandboxAction(g, a as SandboxAction, by); return; }
  if (g.sandbox && SANDBOX_REFUSED.test(a.type) && !SANDBOX_STORY.test(a.type)) fail('The Proving Ground has no Narrator and no story: only the engine runs here.');
  if (g.sandbox && /^(world\/act|story\/(move|door))$/.test(a.type)) { sandboxWorld(g, a, by); return; } // the area map while gearing up
  if (g.sandbox && /^(gear|magic)\//.test(a.type)) { sandboxGear(g, a, by); return; } // gear and magic change mid-fight here
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
      const err = roomSheetError(g, by, a.sheet); if (err) fail(err);
      const c = newCharacter(id(g, 'c'), by, a.sheet);
      if (musicTraitOf(c) && !packOf(c).some((x) => (x.item || x.id) === 'musek_blestor')) c.pack = [...packOf(c), { id: 'musek_blestor', item: 'musek_blestor', name: 'Musek Blestor', qty: 1, kind: 'tool' }];
      g.characters[c.id] = c;
      if (g.sandbox) g.sandbox.saved.characters[c.id] = JSON.parse(JSON.stringify(c)); // leaving the Proving Ground restores it as it came
      push(g, { kind: 'system', text: c.name + ' is locked in.' });
      // Locked in mid-session: the session's start counts for them too ('session_start' for this character only: Old
      // Timer's Echo, start items; hooks gap A14).
      if (g.phase !== 'lobby') { c.echo = 1; if (!g.sandbox) emitStory(g, 'session_start', { g, n: g.sessionN, late: true }, [c]); }
      return;
    }
    case 'char/remove': { const c = g.characters[a.charId]; if (!c) return; if (c.owner !== by && !isHost(g, by)) fail('Not your character.'); if (g.phase !== 'lobby') fail('Characters stay once the session starts.'); delete g.characters[a.charId]; return; }
    case 'session/start': {
      if (!isHost(g, by)) fail('Only the host starts the session.');
      if (g.phase !== 'lobby') fail('Already started.');
      if (!Object.keys(g.characters).length) fail('Lock in at least one character.');
      g.phase = 'story'; g.sessionN = (g.sessionN || 0) + 1; g.restN = 0;
      // Session start counts as a long rest. 'session_heal' {g, mult}: an item may give a character only part of it
      // (Insomniac's Wired: half of what it would restore; perk-runtime H gap 2).
      { const sh: any = emitStory(g, 'session_heal', { g, mult: {} as Record<string, { hp?: number; mp?: number }> });
        for (const c of Object.values(g.characters)) { const m = sh.mult[c.id] || {}; c.echo = 1; c.hp = Math.max(c.hp, Math.round(c.hp + (maxHp(c) - c.hp) * (m.hp ?? 1))); if (hasEmanator(c)) c.mp = Math.round((c.mp ?? 0) + (maxMp(c) - (c.mp ?? 0)) * (m.mp ?? 1)); restockResources(c); } }
      emitStory(g, 'session_start', { g, n: g.sessionN }); // 'session_start' {g, n}: start items, Echo, faction starts (lanes)
      g.story.magic = {}; g.story.glyphs = []; g.story.zones = []; g.story.mana = MANA_START;
      g.story.round = 1; g.story.await = 'narrator'; g.story.work = { kind: 'opening' };
      if (!g.campaign || g.campaign.id !== g.settings.start) g.campaign = builtInCampaign(g.settings.start) || builtInCampaign('own');
      placeBoardNpc(g);
      g.story.zone = g.campaign!.startZone; g.story.positions = {}; g.story.objects = defaultObjects(zoneMap(g)); positionsOf(g);
      for (const pin of g.campaign!.pins || []) applyMemOp(g, { op: 'pin', text: pin });
      push(g, { kind: 'system', text: 'Session 1 begins.' });
      startMissions(g, (e) => push(g, e));
      return;
    }
    case 'story/speak': {
      // OOC (missions.ts): a question to the Narrator, not a move. It doesn't use the Say or the turn.
      { const o = oocOf(a.text); if (a.ooc || o.ooc) { if (g.phase === 'lobby') fail('The session hasn\'t started.'); if (!o.text) fail('Say something.'); askOoc(g, by, o.text, (e) => push(g, e)); return; } }
      if (g.story.complete) fail('The campaign is complete.');
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
      if (c!.hp <= 0 || c!.dead) fail(c!.name + ' can\'t do that now.');
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
    case 'narrator/begin': { if (!isHost(g, by)) fail('Host only.'); g.narrator.busy = true; g.narrator.error = null; g.narrator.beganSeq = g.seq; return; }
    case 'narrator/error': { if (!isHost(g, by)) fail('Host only.'); g.narrator.busy = false; g.narrator.error = a.message; return; }
    case 'narrator/retry': { if (!isHost(g, by)) fail('Host only.'); g.narrator.error = null; if (!g.story.work) g.story.work = { kind: g.combat ? 'combat_end' : 'round' }; return; }
    case 'narrator/usage': {
      if (!isHost(g, by)) fail('Host only.');
      const u = g.narrator.usage; u.input += a.input; u.output += a.output; u.cacheRead += a.cacheRead; u.costUsd += a.costUsd;
      // Rewordings count in the total but are not Narrator turns.
      if (a.kind === 'rewrite') { u.rewrites = (u.rewrites || 0) + 1; return; }
      u.calls++;
      // For the host's spend meter: the last call, the dearest, and the last 20.
      u.last = a.costUsd; u.max = Math.max(u.max || 0, a.costUsd); u.recent = [...(u.recent || []), Math.round(a.costUsd * 10000) / 10000].slice(-20);
      return;
    }
    case 'narrator/turn': { if (!isHost(g, by)) fail('Only the Narrator (the host\'s client) can do that.'); const w0 = g.story.work, b0 = g.narrator.busy ? g.narrator.beganSeq : undefined; narratorTurn(g, a.turn); missionTurn(g, a.turn, w0, b0, (e) => push(g, e)); return; }
    case 'check/roll':
    case 'check/reroll':
    case 'check/accept': {
      const ck = g.checks.find((x) => x.id === a.checkId); if (!ck) fail('No such check.');
      const c = g.characters[ck!.charId]; if (c.owner !== by) fail('Only ' + c.name + '\'s player rolls this.');
      if (ck!.done) fail('That check is settled.');
      if (a.type === 'check/roll') { if (ck!.roll) fail('Already rolled.'); rollCheck(g, ck!, c, false); return; }
      if (!ck!.roll) fail('Roll first.');
      // Echo (spec: Echo): spend 1 to reroll a d20, at most 1 per roll. The reroll stands.
      if (a.type === 'check/reroll') { if (ck!.roll!.rerolled) fail('One Echo per roll.'); if (c.echo < 1) fail('No Echo left.'); c.echo--; if (g.story.rulings) g.story.rulings = g.story.rulings.filter((r) => r.fromCheck !== ck!.id); rollCheck(g, ck!, c, true); }
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
      const asked = (g.story.scene.asked[c!.id] ||= []);
      // 'ask_limit' {c, skill, limit}: how many times a scene this skill can be asked (Crowded Head: 2).
      const al: any = emitStory(g, 'ask_limit', { c, skill: a.skill, limit: 1, g });
      if (asked.filter((x) => x === a.skill).length >= al.limit) fail(al.limit === 1 ? 'Once per scene per skill.' : al.limit + ' times per scene per skill.');
      asked.push(a.skill);
      const hook = g.story.scene.hooks.filter((h) => h.skill === a.skill && !g.story.scene.revealed.includes(c!.id + ':' + h.id)).sort((x, y) => x.tn - y.tn)[0];
      const m = mod(c!.skills[a.skill] || 0) + songMod(g, c!, a.skill) + skillRollMod({ c: c! }, a.skill, { roll: 'ask', tags: zoneTags(g) }).add, die = d20(g.rng), total = die + m, ok = !!hook && total >= hook.tn;
      const head = sk.name.toUpperCase() + ' · YOU ASKED · d20 ' + die + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' = ' + total + (hook ? ' vs ' + hook.tn : '') + ' · ' + (ok ? '✓ SPEAKS' : '✕ NOTHING TO SAY');
      if (ok) g.story.scene.revealed.push(c!.id + ':' + hook!.id);
      push(g, { kind: 'voice', skill: a.skill, charId: c!.id, to: by, head, text: ok ? hook!.line : sk.name + ' has nothing to say about this.', ok });
      return;
    }
    case 'overreach/choose': {
      const o = g.overreach.find((x) => x.id === a.id); if (!o || o.choice) fail('Nothing to choose.');
      const c = g.characters[o!.charId]; if (c.owner !== by) fail('Not your character.');
      // 'overreach_cost' {c, skill, cost}: Echo to resist (Crowded Head +1).
      const oc: any = emitStory(g, 'overreach_cost', { c, skill: o!.skill, cost: (c.skills[o!.skill] || 0) >= 10 ? 2 : 1, g }), cost = Math.max(0, oc.cost);
      const choice = a.choice === 'resist' && c.echo >= cost ? 'resist' : 'indulge';
      if (choice === 'resist') gainEcho(c, -cost, 'resisting Overreach', g); else gainEcho(c, 1, 'indulging Overreach', g);
      o!.choice = choice;
      push(g, { kind: 'overreach', charId: c.id, skill: o!.skill, to: by, head: SKILL[o!.skill].name.toUpperCase() + ' · OVERREACH · ' + (choice === 'resist' ? 'RESISTED (−' + cost + ' ECHO)' : 'INDULGED (+1 ECHO)'), text: choice === 'resist' ? 'You hold it back. Nothing happens.' : 'You let it happen.' });
      push(g, { kind: 'system', text: c.name + (choice === 'resist' ? ' resists an urge.' : ' gives in to ' + SKILL[o!.skill].name + '.') });
      afterPending(g);
      return;
    }
    case 'levelup/raise': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const why = canRaise(c!, a.kind, a.id); if (why) fail(why);
      const rankBefore = c!.classId ? classRank(c!) : 0;
      if (a.kind === 'skill') { c!.skills[a.id] = (c!.skills[a.id] || 0) + 1; c!.unspent.skill--; }
      if (a.kind === 'attr') { c!.attrs[a.id] = (c!.attrs[a.id] || 1) + 1; c!.unspent.attr--; if (a.id === 'endurance') c!.hp += 15; }
      if (a.kind === 'core') { (c!.cores as any)[a.id]++; c!.unspent.core--; }
      awardAutomatic(g, c!);
      // A class rank reached (signature total 13 or 18): say which move it brings (spec: Classes).
      if (c!.classId && rankBefore && classRank(c!) > rankBefore) { const r = ['', 'I', 'II', 'III'][classRank(c!)], mv = ((CLASS[c!.classId] as any).ranks?.[r]?.moves || []).map((m: any) => m.name).join(', ');
        push(g, { kind: 'system', text: c!.name + ' reaches ' + CLASS[c!.classId].name + ' ' + r + (mv ? ': ' + mv : '') + '.' }); }
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
    case 'levelup/advanced': {
      // Learning an advanced class (spec: Classes): 15 + 9 in its parents' signatures and a tutor the Narrator placed.
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const adv = (classesJ as any).advanced?.find((x: any) => x.id === a.classId);
      const why = advancedClassError(c!, a.classId, adv); if (why) fail(why);
      c!.advancedClass = a.classId;
      push(g, { kind: 'system', text: c!.name + ' learns the ' + adv.name + ': ' + (adv.moves || []).map((m: any) => m.name).join(', ') + '.' });
      return;
    }
    case 'rest': {
      // The host calls it (the Narrator grants one with a turn's rest field); the Proving Ground allows it while gearing up.
      if (!isHost(g, by)) fail('Only the host calls a rest: ask for one instead.');
      if (g.phase === 'lobby') fail('The session hasn\'t started.');
      if (g.phase !== 'story') fail(g.sandbox ? 'No resting in a fight: stop the fight (or clear the wave) first.' : 'No resting in a fight: win it, or get out of it, first.');
      applyRest(g, a.kind === 'long' ? 'long' : 'short'); return;
    }
    case 'story/ask-rest': {
      // A player asks for a rest (spec: Rest): a line the host and the Narrator see; the Narrator grants it (rest) or not.
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase !== 'story') fail('No resting in a fight: win it, or get out of it, first.');
      if (g.story.await !== 'players') fail('Wait for the round to open.');
      const kind = a.kind === 'long' ? 'long' : 'short';
      const tag = '[rest:' + kind + ']', E = g.story.entries;
      for (let i = E.length - 1; i >= 0 && E[i].kind !== 'narration'; i--) if (E[i].who === by && String(E[i].text).includes(tag)) fail('Already asked: the Narrator answers it this round.');
      g.story.needs = true; push(g, { kind: 'player', who: by, text: c!.name + ' asks for a ' + kind + ' rest (' + REST_INFO[kind] + ') ' + tag + '.', head: c!.name });
      return;
    }
    case 'story/pray': {
      // A prayer in the story (spec: Patrons and prayer): the patron is the Narrator's to play, so it is a ruling.
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase !== 'story') fail('In a fight, pray on your turn (3 AP).');
      if (!c!.patron || !PATRON[c!.patron]) fail('You have no patron.'); if ((c!.skills.faith || 0) < 3) fail('Prayer needs Faith 3.');
      const p = PATRON[c!.patron!], text = String(a.text || '').trim().slice(0, 300);
      // Items' Faith mods and the song reach it, as in a fight (True Believer's missed rites, the music traits: hooks gap D11).
      const die = d20(g.rng), m = sideRollMod(g, c!, 'faith', 'prayer') + Math.floor(devotionOf(c!) / 2), tn = g.story.patronMood?.[p.id] ?? 12, ok = die === 20 || (die !== 1 && die + m >= tn);
      if (die === 1) changeDevotion(c!, -1);
      push(g, { kind: 'check', charId: c!.id, ok, head: 'FAITH · PRAYER TO ' + p.name.toUpperCase() + ' · d20 ' + die + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' = ' + (die + m) + ' vs ' + tn + ' · ' + (ok ? '✓ HEARD' : '✕ SILENCE'), text: c!.name + ' prays' + (text ? ': "' + text + '"' : '.') });
      // 'story_blessing' {g, c, lines}: items roll what a story Blessing on the character does besides (Upper-Touched's d6).
      const sb: any = ok ? emitStory(g, 'story_blessing', { g, c, lines: [] as string[] }, [c!]) : { lines: [] };
      if (ok) pendRuling(g, c!, 'patron:' + p.id, c!.name + ' prayed and was heard: ' + p.name + ' answers with a Blessing (' + (p.blessings || []).map((b: any) => b.name).join(', ') + ') × ' + (1 + 0.1 * (c!.skills.faith || 0)).toFixed(1) + (text ? '. They asked: "' + text + '"' : '') + (sb.lines.length ? '. ' + sb.lines.join(' ') : ''));
      g.story.needs = true; closeRoundIfDone(g); return;
    }
    case 'gear/ammo': {
      // Load special rounds (rules 1.3): fill the loaded magazine with carried rounds of that type (out of combat, free).
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat') fail('Load special rounds out of combat.');
      const type = ammoId(a.ammo) || ''; if (!type || (type !== 'standard' && !AMMO_TYPES[type])) fail('No such ammo type.');
      const w = WEAPON[c!.weapon]; if (!w || w.magazine == null || !w.ammo) fail('Your weapon takes no rounds.');
      if (type === 'standard') { c!.loadedType = null; push(g, { kind: 'system', text: c!.name + ' loads standard rounds.' }); return; }
      const pack = packOf(c!).map((x) => ({ ...x })), it = pack.find((x) => (x.item || x.id) === 'ammo_' + type && x.qty > 0); if (!it) fail('You carry no ' + type.replace(/_/g, '-') + ' rounds.');
      const n = Math.min(it!.qty, magazineSize(c!.weapon, c!.weaponState?.mods) ?? w!.magazine!); it!.qty -= n; c!.loaded = n; c!.loadedType = type; c!.pack = pack.filter((x) => x.qty > 0 || x.mags);
      push(g, { kind: 'system', text: c!.name + ' loads ' + n + ' ' + type.replace(/_/g, '-') + ' rounds.' }); return;
    }
    case 'levelup/perk': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const step = pendingPerkSteps(c!).flatMap((s) => s.choices).find((x) => x.id === a.perkId); if (!step) fail('No perk step for that perk.');
      const held = c!.perks.find((x) => x.id === a.perkId);
      if (held) held.tier = 'II'; else c!.perks.push({ id: a.perkId, tier: 'I' });
      push(g, { kind: 'system', text: c!.name + ' takes ' + PERK[a.perkId].name + ' (Tier ' + step!.tier + ').' });
      return;
    }
    case 'memory/edit': { if (!isHost(g, by)) fail('Only the host edits the Narrator\'s memory.'); const err = editMemory(g, a.edit); if (err) fail(err); return; }
    case 'vote/suggest': case 'vote/dismiss': case 'vote/start': case 'vote/cast': case 'vote/close': case 'narrator/rewrite': { voteAction(g, a, by); return; }
    case 'campaign/refresh': { if (!isHost(g, by)) fail('Host only.'); refreshCampaign(g); if (g.phase !== 'lobby') startMissions(g, (e) => push(g, e)); return; }
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
    case 'magic/learn': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat') fail('Learn after the fight.');
      if (c!.learnedScene === g.story.scene.n && g.phase === 'story') fail('One new thing a scene: it takes a rest to sink in.');
      if (a.from === 'ally') {
        const ok = Object.values(g.characters).some((x) => x.id !== c!.id && !x.dead && (a.word ? (x.sigils || []).includes(a.word) : a.module ? (x.soulKnown?.modules || []).includes(a.module) : a.tone ? (x.soulKnown?.tones || []).includes(a.tone) : (x.soulKnown?.schools || []).includes(a.school || '')));
        if (!ok) fail('Nobody in the squad knows that to teach it.');
      } else {
        if (!a.word) fail('A Sigil plate teaches a word.');
        const pack = packOf(c!), i = pack.findIndex((x) => (x.item || x.id) === 'sigil_plate' && (x.note || '').toLowerCase() === a.word);
        if (i < 0) fail('You carry no plate with that word.');
        pack[i] = { ...pack[i], qty: pack[i].qty - 1 }; c!.pack = pack.filter((x) => x.qty > 0 || x.mags);
      }
      const e = teach(g, c!, a, a.from === 'ally' ? 'taught by the squad' : 'from a Sigil plate'); if (e) fail(e);
      c!.learnedScene = g.story.scene.n; return;
    }
    case 'magic/design': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat') fail('Design Outbursts out of combat.');
      { const why = designBan(c!); if (why) fail(why); }
      const d = a.design, list = (c!.outbursts ||= []), at = d ? list.findIndex((x) => x.id === d.id) : -1;
      // A held design can't change under the hold (its tone, form and price were set at Begin), as magic/forget.
      if (at >= 0 && g.story.magic?.[c!.id]?.held?.design === d.id) fail('You are holding that Outburst: release it or let it go first.');
      const r = checkOutburstDesign(c!, d, moduleSlots(c!), at >= 0 ? d.id : 'o' + (g.seq + 1)); if (typeof r === 'string') fail(r);
      const { design: clean, learnTone } = r as Exclude<typeof r, string>;
      if (at < 0 && list.length >= readyDesigns(c!)) fail('You keep ' + readyDesigns(c!) + ' designs ready (Empathy): forget one first.');
      if (at < 0) g.seq++;
      if (learnTone) { const k = (c!.soulKnown ||= { schools: [], modules: [] }); (k.tones ||= []).push(learnTone); }
      if (at >= 0) list[at] = clean; else list.push(clean);
      return;
    }
    case 'magic/forget': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat') fail('After the fight.');
      if (g.story.magic?.[c!.id]?.held?.design === a.designId) fail('You are holding that Outburst: release it first.'); // or it could never be let go
      c!.outbursts = (c!.outbursts || []).filter((x) => x.id !== a.designId); return;
    }
    case 'story/move': { worldAct(g, { type: 'world/act', charId: a.charId, act: 'move', to: a.to, how: 'move' }, by); return; }
    case 'story/door': { worldAct(g, { type: 'world/act', charId: a.charId, act: 'door', objId: a.objId }, by); return; }
    case 'poi/examine': case 'poi/try': case 'poi/travel': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase !== 'story') fail('Deal with it after the fight.');
      if (g.story.await !== 'players') fail('Wait for the round to open.');
      if (g.story.ended?.[c!.id]) fail(c!.name + ' has ended the turn.');
      if (c!.hp <= 0) fail(c!.name + ' is Downed: an ally\'s stim, or the Narrator, gets them up.');
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
    case 'story/perk': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'lobby') fail('The session hasn\'t started.');
      if (g.phase === 'combat') fail('In a fight, use the Perks tab on your turn.');
      if (c!.dead) fail('The dead do nothing.');
      const err = runPerkAction({ c: c!, g }, a.id, a, g.rng, 'story'); if (err) fail(err);
      closeRoundIfDone(g);
      return;
    }
    case 'combat/say': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const cb = g.combat; if (!cb || g.phase !== 'combat' || cb.over) fail('No fight is on.');
      { const o = oocOf(a.text); if (o.ooc) { if (!o.text) fail('Say something.'); askOoc(g, by, o.text, (e) => push(g, e)); return; } } // answered after the fight
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
    case 'gear/give': case 'gear/drop': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat') fail('Hand things over after the fight.');
      const pack = packOf(c!).map((x) => ({ ...x })), it = pack[a.idx]; if (!it) fail('Nothing there.');
      if (it!.kind !== 'plot') fail('Only plot items can be handed over or dropped for now.');
      const k = Math.max(1, Math.min(it!.qty, Math.round(a.qty || it!.qty)));
      let to: Character | undefined;
      if (a.type === 'gear/give') { to = g.characters[a.to]; if (!to || to.id === c!.id) fail('Give it to whom?'); if (to!.dead) fail(to!.name + ' is dead.'); }
      it!.qty -= k; if (it!.qty <= 0) pack.splice(a.idx, 1); c!.pack = pack;
      if (to) { const tp = packOf(to).map((x) => ({ ...x })), ex = tp.find((x) => x.kind === 'plot' && x.id === it!.id); if (ex) ex.qty += k; else tp.push({ ...it!, qty: k }); to.pack = tp; }
      push(g, { kind: 'system', text: c!.name + (to ? ' gives ' + to.name + ' ' : ' drops ') + (k > 1 ? k + ' × ' : '') + it!.name + '.' });
      if (g.phase === 'story') canon(g, c!.name + (to ? ' gave ' + to.name + ' ' : ' dropped ') + it!.name + ' (scene ' + g.story.scene.n + ').', [], 1);
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

/**
 * One loot entry from the Narrator (spec: Loot; Plot items). A weapon or item id the engine knows gives that real thing
 * (an item with its own in-world name keeps the name); anything else (an unknown or empty id) becomes a plot item named
 * as the Narrator named it, with its one-line text. A negative qty takes that many of a plot item back (the story used
 * it up). The log line says exactly what was given or taken; nothing is dropped silently.
 */
function giveLoot(g: GameState, l: NonNullable<NarratorTurn['loot']>[number]) {
  const c = g.characters[l?.charId]; if (!c || c.dead) return;
  const raw = Math.round(Number(l.qty) || 1), n = Math.max(1, Math.min(20, Math.abs(raw))), pack = packOf(c).map((x) => ({ ...x }));
  const id = String(l.item || '').trim(), label = String(l.name || '').trim();
  if (raw < 0) {
    const want = label ? plotId(label) : id.startsWith('plot:') ? id : plotId(id.replace(/_/g, ' '));
    const i = pack.findIndex((x) => x.kind === 'plot' && (x.id === want || x.id === id || x.name.toLowerCase() === (label || id).toLowerCase()));
    if (i < 0) return;
    const it = pack[i], k = Math.min(n, it.qty); it.qty -= k; if (it.qty <= 0) pack.splice(i, 1);
    c.pack = pack; push(g, { kind: 'system', text: c.name + ' no longer has ' + (k > 1 ? k + ' × ' : '') + it.name + '.' }); return;
  }
  const rarity = (['standard', 'fine', 'masterwork', 'relic', 'celestial'].includes(l.rarity || '') ? l.rarity : 'standard') as Rarity;
  let given = '';
  let guns: string[] = [];
  if (WEAPON[id]) { given = (label || WEAPON[id].name).slice(0, 60); for (let i = 0; i < Math.min(n, 3); i++) { pack.push({ id, name: given, qty: 1, kind: 'weapon', weapon: id, rarity }); guns.push(id); } if (rarity !== 'standard') given += ' (' + rarity + ')'; }
  else if (ITEM[id]) { given = (label || ITEM[id].name).slice(0, 60); const ex = pack.find((x) => (x.item || x.id) === id && !x.rarity && x.name === given); if (ex) ex.qty += n; else pack.push({ id, item: id, name: given, qty: n, kind: (ITEM[id] as any).category === 'consumable' ? 'med' : 'tool' }); }
  else {
    const name = label || pack.find((x) => x.kind === 'plot' && x.id === id)?.name || id.replace(/^plot:/, '').replace(/_/g, ' ').trim(); if (!name) return;
    const it = plotItem(name, l.text || '', n), ex = pack.find((x) => x.kind === 'plot' && x.id === it.id);
    if (ex) { ex.qty += n; if (it.text && !ex.text) ex.text = it.text; } else pack.push(it);
    given = it.name;
  }
  c.pack = pack; collectGuns(c, guns); // Gun Nut: a gun gained joins the collection while it has room (item 369)
  push(g, { kind: 'system', text: c.name + ' gets ' + (n > 1 ? n + ' × ' : '') + given + '.' });
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
  // Combined checks (spec): the lowest modifier among the skills, +2 for each other skill with at least 1 point. Items'
  // skill mods go into each skill's own modifier (plan 6a-15: every d20 that uses the skill); whole-check mods after.
  const tags = [...(ck.tags || []), ...zoneTags(g)], cctx = { tags, check: ck, target: ck.target, applies: ck.applies || [], roll: 'check' };
  const sk = ck.skills.map((s) => ({ s, m: mod(c.skills[s] || 0) + songMod(g, c, s), it: skillRollMod({ c }, s, cctx) }));
  const mods = sk.map((x) => x.m + x.it.add), low = Math.min(...mods), lowIx = mods.indexOf(low);
  const whole = [...checkQuery({ c }, ck, cctx), ...storyCondMods(g, c, ck)];
  // 'check_mod' {c, ck, tags, add: CheckMod[], tn}: handlers push { add, label } or change tn (tn_mod, in the ladder).
  const cm: any = emitStory(g, 'check_mod', { c, ck, tags, add: [] as { add: number; label: string }[], tn: ck.tn, g });
  const itemMods = [...sk[lowIx].it.labels, ...whole, ...cm.add];
  const m = low + 2 * ck.skills.filter((s, i) => i !== lowIx && (c.skills[s] || 0) > 0).length + whole.reduce((t, x) => t + x.add, 0) + cm.add.reduce((t: number, x: any) => t + x.add, 0);
  const tn = Math.max(TN_LADDER[0], Math.min(TN_LADDER[TN_LADDER.length - 1] + 4, cm.tn ?? ck.tn));
  // 'check_post' {c, ck, die, total, tn, ok, crit, fumble, auto, double}: auto 'success'/'fail', a floor, a reroll.
  // noFumble: a natural 1 is just a low roll (War Footing: hooks gap B11).
  const d0 = d20(g.rng), cp: any = emitStory(g, 'check_post', { c, ck, die: d0, mod: m, tn, auto: (ck.auto || null) as null | 'success' | 'fail', labels: [] as string[], noFumble: false, g });
  const die = cp.die, total = die + m, crit = die === 20 && cp.auto !== 'fail', fumble = die === 1 && cp.auto !== 'success' && !cp.noFumble;
  const ok = cp.auto === 'success' ? true : cp.auto === 'fail' ? false : crit || (die !== 1 && total >= tn); // a natural 1 always fails
  const first = reroll ? ck.roll!.die : undefined;
  ck.roll = { die, mod: m, total, ok, crit, fumble, rerolled: reroll, first };
  ck.mods = itemMods.filter((x) => x.add);
  const names = ck.skills.map((s) => SKILL[s].name).join(' + ');
  const named = ck.mods.length ? ' (' + ck.mods.map((x) => (x.add > 0 ? '+' : '−') + Math.abs(x.add) + ' ' + x.label).join(', ') + ')' : '';
  push(g, { kind: 'check', charId: c.id, ok, head: names.toUpperCase() + (reroll ? ' · ECHO REROLL' : '') + ' · d20 ' + die + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + named + ' = ' + total + ' vs ' + tn + (cp.labels.length ? ' · ' + cp.labels.join(', ') : '') + ' · ' + (cp.auto === 'success' ? '✓ SUCCESS (AUTO)' : cp.auto === 'fail' ? '✕ FAILURE (AUTO)' : crit ? '✓ CRITICAL' : fumble ? '✕ CRITICAL FAIL' : ok ? '✓ SUCCESS' : '✕ FAILURE'), text: c.name + ': ' + ck.stakes });
  // 'check_result' {c, ck, roll}. Rulings it raises belong to this roll: an Echo reroll withdraws them first (below).
  const seq0 = g.seq;
  emitStory(g, 'check_result', { c, ck, roll: ck.roll, g });
  for (const r of g.story.rulings || []) if (Number(String(r.id).slice(1)) > seq0 && !r.fromCheck) r.fromCheck = ck.id;
}
/** Tags of the zone the story is in (terrain, in_city, urban…; campaign zones may set them), for items gated on them. */
export function zoneTags(g: GameState): string[] {
  const z: any = campaignOf(g)?.zones.find((x) => x.id === g.story.zone); if (!z) return [];
  return [...(z.tags || []), ...(z.terrain ? ['terrain:' + z.terrain] : []), ...(z.in_city ? ['in_city'] : z.in_city === false ? ['outside_city'] : []), ...(z.urban ? ['urban'] : []), ...(z.fear ? ['fear'] : []), ...(z.upper_realm ? ['upper_realm'] : []), ...(z.faction ? ['faction:' + z.faction] : [])];
}

// ---------- story plumbing (rules 1.3): conditions out of combat, rest, Karma, the Narrator's optional fields ----------
const SOCIAL_TAGS = ['dialogue', 'crowd', 'official', 'merchant', 'military', 'underworld'];
const SOCIAL_SKILLS = new Set(['charisma', 'eloquence', 'implication', 'intimidation', 'empathy', 'authority']);
/** Story conditions that come into a fight as combat conditions (spec: Conditions in the story; the rest stay story-side). */
const STORY_CARRY = new Set(['shaken', 'fear', 'ldebuff', 'rdebuff', 'left_brain_debuff', 'right_brain_debuff', 'weakened', 'nausea', 'injured', 'augment_offline', 'bleeding']);
/** A character's story conditions now (persistent ones whose scope still holds). */
export function storyConds(g: GameState, c: Character): string[] {
  return (c.persistentConds || []).filter((p) => p.scope === 'arc' || (p.scope === 'session' && (p.session ?? 1) === (g.sessionN ?? 1)) || (p.scope === 'scene' && p.scene === g.story.scene.n)).map((p) => p.id);
}
/** An NPC's conditions this scene (by its id or name). */
export const npcConds = (g: GameState, who: string | undefined): string[] => (who ? g.story.scene.npcConds?.[who] || g.story.scene.npcConds?.[String(who).toLowerCase()] || [] : []);
/** What story conditions do to a check (spec: Shaken −2 on Heart saves and social checks; the Brain debuffs −2 on
 * their skills): named mods, like an item's. */
function storyCondMods(g: GameState, c: Character, ck: Check): { add: number; label: string }[] {
  const on = storyConds(g, c), out: { add: number; label: string }[] = [];
  const social = (ck.tags || []).some((t) => SOCIAL_TAGS.includes(t)) || ck.skills.some((s) => SOCIAL_SKILLS.has(s));
  // A Shaken NPC is easier to work on: +2 on social checks against them, for everyone (hooks gap F2; Bone Talk's rule).
  if (social && ck.target && npcConds(g, ck.target).includes('shaken')) out.push({ add: 2, label: ck.target + ' is Shaken' });
  if (!on.length) return out;
  if (on.includes('shaken') && (social || (ck.kind === 'save' && ck.family === 'heart'))) out.push({ add: -2, label: 'Shaken' });
  if (on.includes('ldebuff') && ck.skills.some((s) => SKILL[s]?.core === 'mind')) out.push({ add: -2, label: 'Left Brain Debuff' });
  if (on.includes('rdebuff') && ck.skills.some((s) => SKILL[s]?.core === 'soul' || SKILL[s]?.attribute === 'expression')) out.push({ add: -2, label: 'Right Brain Debuff' });
  return out;
}
/** A side d20 with one skill outside rollCheck (Leading Role, The Slope, a prayer): its points, the song, item skill
 * mods and the story Brain debuffs (spec: Item modifiers on every d20). Whole-check mods (check_mod) aren't included. */
export function sideRollMod(g: GameState, c: Character, skill: string, roll = 'check'): number {
  const debuff = storyCondMods(g, c, { skills: [skill], tags: [] } as any).filter((x) => /Brain Debuff/.test(x.label)).reduce((t, x) => t + x.add, 0);
  return mod(c.skills[skill] || 0) + songMod(g, c, skill) + skillRollMod({ c }, skill, { roll, tags: zoneTags(g) }).add + debuff;
}
/** Put a condition on a character for the scene, session or arc (or take it off). */
export function setStoryCond(g: GameState, c: Character, id: string, scope: 'scene' | 'session' | 'arc' = 'scene', end = false, by?: string) {
  const list = (c.persistentConds ||= []).filter((p) => p.id !== id);
  if (!end) list.push({ id, scope, scene: g.story.scene.n, session: g.sessionN ?? 1, ...(by ? { by } : {}) });
  c.persistentConds = list;
}
/** Karma (spec: Karma): −100 Chaotic to +100 Lawful, −29..29 Neutral. Each point of Conscience adds 1 to every award
 * (in the award's direction). 'karma_award' {c, amount, unlawful, mult} lets Karma-locking traits double the cost of
 * leaving their band. Returns the change made. */
export function applyKarma(g: GameState, c: Character, amount: number, opts: { unlawful?: boolean; why?: string } = {}): number {
  if (!amount) return 0;
  const consc = (c.skills.conscience || 0) * Math.sign(amount);
  const ctx: any = emitStory(g, 'karma_award', { c, amount: amount + consc, unlawful: !!opts.unlawful, mult: 1, why: opts.why || '', g }, [c]);
  const was = c.karma || 0; c.karma = Math.max(-100, Math.min(100, Math.round(was + ctx.amount * (ctx.mult || 1))));
  const d = c.karma - was; if (d) push(g, { kind: 'system', text: c.name + ' ' + (d > 0 ? '+' : '') + d + ' Karma (' + karmaBand(c.karma) + (opts.why ? ': ' + opts.why : '') + ').', ooc: true });
  return d;
}
export const karmaBand = (k: number) => (k <= -30 ? 'Chaotic' : k >= 30 ? 'Lawful' : 'Neutral');
/** What each rest gives back, in a line (spec: Rest), for the Rest buttons and the request line. */
export const REST_INFO: Record<'short' | 'long', string> = {
  short: '1 hour: 25% of max HP back; Heat, Flux and Strain reset; once-per-rest uses come back',
  long: '8 hours: all HP; MP full if the air is Normal or richer; Supplies and toxins restocked; once-per-rest uses come back',
};
/** Rest (spec: Rest): short (1 hour: 25% of max HP back; Heat, Flux and Strain reset) or long (8 hours: all HP, MP
 * full if the air is Normal or richer, Supplies and toxins restocked). Each rest starts a new per-rest window for item
 * uses. 'rest' {g, kind, chars} lets items change it (Insomniac, Old Timer…). */
export function applyRest(g: GameState, kind: 'short' | 'long', o: { settlement?: boolean } = {}) {
  g.restN = (g.restN || 0) + 1;
  const chars = Object.values(g.characters).filter((c) => !c.dead);
  // ctx.mult[charId] = {hp, mp}: a fraction of what this character gets back (Insomniac's half rest: hooks gap H1).
  const ctx: any = emitStory(g, 'rest', { g, kind, chars, settlement: !!o.settlement, hpMult: 1, mult: {} as Record<string, { hp?: number; mp?: number }> });
  const band = MANA_BANDS.find((b) => (g.story.mana ?? MANA_START) >= b.min && (g.story.mana ?? MANA_START) <= b.max)?.id || 'normal';
  for (const c of chars) {
    const pm = ctx.mult?.[c.id] || {}, hm = Math.max(0, pm.hp ?? 1), mm = Math.max(0, pm.mp ?? 1);
    const max = maxHp(c), back = kind === 'long' ? Math.ceil((max - Math.max(c.hp, 0)) * hm) : Math.ceil(max * 0.25 * (ctx.hpMult || 1) * hm);
    if (c.hp > 0 || kind === 'long') { c.hp = Math.min(max, Math.max(c.hp, 0) + back); if (c.hp > 0) c.downedFails = 0; }
    if (g.story.heat) g.story.heat[c.id] = 0;
    const m = g.story.magic?.[c.id]; if (m) { m.flux = 0; m.strain = 0; m.held = null; }
    if (kind === 'long') { if (hasEmanator(c) && band !== 'thin') { const mx = maxMp(c), mw = c.mp ?? mx; c.mp = Math.min(mx, mw + Math.ceil((mx - mw) * mm)); } restockResources(c); }
  }
  push(g, { kind: 'system', text: (kind === 'long' ? 'A long rest' : 'A short rest') + ': ' + (kind === 'long' ? 'everyone is back to full.' : 'a quarter of everyone\'s HP back; Heat, Flux and Strain reset.') });
}
/** The optional rules-1.3 fields of a Narrator turn (each ignored when absent or invalid). */
function storyFields(g: GameState, t: NarratorTurn) {
  for (const l of (t.perkLines || []).slice(0, 8)) { const c = g.characters[l.charId]; if (!c || !l.text) continue;
    if (l.key && !holdersOf({ c }).some((h) => h.key === itemKey(l.key!) || h.itemId === l.key)) continue; // only items the character holds (hooks gap G5)
    push(g, { kind: 'voice', charId: c.id, to: c.owner, head: (l.key ? itemName(l.key).toUpperCase() + ' · ' : '') + 'ONLY YOU', text: String(l.text).slice(0, 600), ok: true }); }
  for (const x of (t.conditions || []).slice(0, 12)) {
    const id = String(x.id || ''); if (!isCondition(id)) continue;
    const c = g.characters[x.target] || Object.values(g.characters).find((y) => y.name.toLowerCase() === String(x.target).toLowerCase());
    if (c) {
      const cid = id === 'left_brain_debuff' ? 'ldebuff' : id === 'right_brain_debuff' ? 'rdebuff' : id;
      // 'story_cond_apply' {g, c, id, scope, cancel, why}: an item may refuse a story condition (an immunity, Lab Coat's
      // neutralised agent, Nothing Left to Fear): it doesn't land and a line says why. Every character's items hear it.
      if (!x.end) { const sc: any = emitStory(g, 'story_cond_apply', { g, c, id: cid, scope: x.scope || 'scene', cancel: false, why: '' }); if (sc.cancel) { push(g, { kind: 'system', text: c.name + ' is not ' + cid.replace(/_/g, ' ') + (sc.why ? ' (' + sc.why + ')' : '') + '.', charId: c.id }); continue; } }
      setStoryCond(g, c, cid, x.scope || 'scene', !!x.end); continue;
    }
    const n = npcsOf(g).find((y) => y.id === x.target || y.name.toLowerCase() === String(x.target).toLowerCase()), k = n ? n.id : String(x.target).toLowerCase().slice(0, 40);
    const list = ((g.story.scene.npcConds ||= {})[k] ||= []);
    if (x.end) g.story.scene.npcConds[k] = list.filter((y) => y !== id); else if (!list.includes(id)) list.push(id);
  }
  for (const x of (t.traitState || []).slice(0, 12)) { const c = g.characters[x.charId]; if (!c || !x.key) continue; const st = (c.state ||= {}); if (x.value == null) delete st[String(x.key).slice(0, 40)]; else st[String(x.key).slice(0, 40)] = JSON.parse(JSON.stringify(x.value)); }
  for (const x of (t.echo || []).slice(0, 8)) { const c = g.characters[x.charId]; if (c && Number.isFinite(x.n)) gainEcho(c, Math.max(-3, Math.min(3, Math.round(x.n))), x.why || 'the story', g); }
  for (const x of (t.karma || []).slice(0, 8)) { const c = g.characters[x.charId]; if (c && Number.isFinite(x.amount)) applyKarma(g, c, Math.max(-30, Math.min(30, Math.round(x.amount))), { unlawful: !!x.unlawful, why: x.why }); }
  for (const x of (t.identify || []).slice(0, 8)) { const c = g.characters[x.charId]; if (c && x.what) { const st = (c.state ||= {}), l: string[] = (st.identified ||= []); if (!l.includes(x.what)) l.push(String(x.what).slice(0, 60)); } }
  for (const x of (t.tutors || []).slice(0, 4)) { const c = g.characters[x.charId], adv = ADVANCED_CLASSES.find((a) => a.id === x.classId); if (!c || !adv) continue; const l = (c.tutors ||= []); if (!l.includes(adv.id)) { l.push(adv.id); push(g, { kind: 'system', text: c.name + ' has found a tutor for the ' + adv.name + '.' }); } }
  for (const x of (t.patrons || []).slice(0, 4)) {
    const c = g.characters[x.charId]; if (!c) continue;
    if (x.patron && PATRON[x.patron] && c.patron !== x.patron) { c.patron = x.patron; c.devotion = 3; push(g, { kind: 'system', text: c.name + ' makes a pact with ' + PATRON[x.patron].name + ' (Devotion 3).' }); }
    if (Number.isFinite(x.devotion) && x.devotion && c.patron) { changeDevotion(c, Math.max(-3, Math.min(3, Math.round(x.devotion!)))); push(g, { kind: 'system', text: c.name + '\'s Devotion is ' + devotionOf(c) + '.', ooc: true }); }
  }
  for (const x of (t.patronMood || []).slice(0, 4)) if (PATRON[x.patron] && TN_LADDER.includes(x.tn)) (g.story.patronMood ||= {})[x.patron] = x.tn;
  if (t.rest && (t.rest.kind === 'short' || t.rest.kind === 'long')) applyRest(g, t.rest.kind, { settlement: !!t.rest.settlement });
}

function afterPending(g: GameState) {
  const open = g.checks.some((x) => !x.done) || g.overreach.some((x) => !x.choice);
  if (open) return;
  if (g.story.await === 'rolls' || g.story.await === 'choices') { g.story.await = 'narrator'; g.story.work = { kind: 'results' }; }
}

/** A refused story use comes back (the Narrator said no: perkRulings {accepted: false}). */
function refundRuling(g: GameState, r: PendingRuling) {
  const c = g.characters[r.charId]; if (!c || !r.use) return;
  usesOf({ key: r.key, c, g }).refund(r.use.per as any, r.use.key);
  push(g, { kind: 'system', text: c.name + '\'s ' + (itemName(r.key)) + ' is refused; the use comes back.', ooc: true });
}
/** A held item's display name from its key ('perk:id', 'trait:id', 'class:cls.move') or a bare id (never throws). */
const itemName = (key: string) => { const full = String(itemKey(String(key || '')) || key || ''), i = full.indexOf(':'), k = i < 0 ? '' : full.slice(0, i), id = i < 0 ? full : full.slice(i + 1); return k === 'perk' ? PERK[id]?.name || id.replace(/_/g, ' ') : id.replace(/_/g, ' '); };
function awardAutomatic(g: GameState, c: Character) {
  for (const pid of grantAutomaticPerks(c)) {
    const p = PERK[pid];
    if (p.tier === 'ultimate') { g.awards.push({ charId: c.id, perkId: pid }); startSong(g, c, 'an Ultimate', 'spotlight', (x) => push(g, { kind: 'system', text: x })); }
    else push(g, { kind: 'system', text: c.name + ' gains the Mastered perk ' + p.name + '.' });
  }
}

function giveXp(g: GameState, c: Character, source: string, amount: number, reason?: string) {
  if (amount <= 0) return;
  // Items change XP (xp_mod), then 'xp_grant' {c, source, amount} (mutable amount).
  const after = xpAfter(c, source, amount); amount = after.amount;
  const xg: any = emitStory(g, 'xp_grant', { c, source, amount, g }); amount = Math.max(0, Math.round(xg.amount));
  if (after.labels.length) reason = (reason ? reason + '; ' : '') + after.labels.join(', ');
  if (amount <= 0) return;
  c.xp += amount; c.xpBySource[source] = (c.xpBySource[source] || 0) + amount;
  push(g, { kind: 'xp', charId: c.id, text: c.name + ' +' + amount + ' XP (' + source + (reason ? ': ' + reason : '') + ')' });
  const before = c.level, gained = applyLevels(c);
  if (gained) push(g, { kind: 'system', text: c.name + ' reaches level ' + c.level + (c.level >= 3 && before < 3 ? ' and can earn a class.' : '.') });
}

/** Apply the Narrator's validated turn. Anything that breaks a rule is dropped with a note (the adapter retries first). */
export function narratorTurn(g: GameState, t: NarratorTurn) {
  const began = g.narrator.busy ? g.narrator.beganSeq : undefined;
  g.narrator.busy = false; g.narrator.error = null; g.story.work = null; delete g.narrator.beganSeq;
  // Pending rulings answered: a refused story use is refunded; every ruling the turn saw is settled, before the scene
  // changes, so rulings items open at the scene change survive to the next turn (hooks gap G4).
  // 'ruling_answered' {r, accepted, c, g} fires for each answer (Established Fact, Cover Story: hooks gap G3).
  { const list = g.story.rulings || [], answered = new Map((t.perkRulings || []).map((r) => [r.id, r]));
    for (const r of list) { const ans = answered.get(r.id); if (ans && ans.accepted === false) refundRuling(g, r);
      if (ans) { const c = g.characters[r.charId]; if (c) emitStory(g, 'ruling_answered', { r, accepted: ans.accepted !== false, c, g }, [c]); } }
    // Rulings made while this call was in flight weren't in its prompt: they wait for the next turn (no lost uses).
    const later = began == null ? [] : list.filter((r) => !answered.has(r.id) && Number(String(r.id).slice(1)) > began);
    g.story.rulings = later; if (later.length) g.story.needs = true; }
  if (t.sceneTitle && t.sceneTitle !== g.story.scene.title) {
    g.story.scene = { title: t.sceneTitle, n: g.story.scene.n + 1, hooks: [], revealed: [], asked: {}, fired: {} };
    push(g, { kind: 'scene', text: t.sceneTitle });
    emitStory(g, 'scene_change', { g, n: g.story.scene.n, title: t.sceneTitle }); // 'scene_change' {g, n, title}
  }
  if (t.narration?.trim()) { push(g, { kind: 'narration', text: t.narration.trim() }); const v = votesOf(g); v.turns = [...v.turns, g.story.entries.at(-1)!.id].slice(-REROLLABLE_TURNS); }
  { const m = momentsOpen(g).find((x) => x.id === t.moment); if (m) { (g.story.moments ||= []).push(m.id); push(g, { kind: 'art', art: m.art, text: m.caption }); } }
  // Voice hooks: passive 10 + mod against each hook; each player sees at most 2, biggest margins first (spec: Voices).
  const hooks: Hook[] = (t.hooks || []).filter((h) => SKILL[h.skill] && TN_LADDER.includes(h.tn) && h.line).map((h) => ({ id: id(g, 'h'), skill: h.skill, tn: h.tn, truth: (['true', 'partial', 'misleading'].includes(h.truth) ? h.truth : 'true') as Hook['truth'], line: h.line }));
  g.story.scene.hooks.push(...hooks);
  // Rules 1.3: the cap is per character (2 lines a beat; Crowded Head raises it for its holder), so a player with two
  // characters hears each one's voices.
  for (const p of g.players) for (const c0 of charsOf(g, p.id)) {
    const cands: { c: Character; h: Hook; margin: number }[] = [];
    for (const c of [c0]) for (const h of hooks) {
      if ((c.skills[h.skill] || 0) < 1) continue;
      const margin = passive(c, h.skill, { tags: zoneTags(g) }) - h.tn;
      if (margin >= 0) cands.push({ c, h, margin });
    }
    // 'voice_cap' {player, c, chars, cap}: lines this character hears per beat (2; Crowded Head raises it).
    const vc: any = emitStory(g, 'voice_cap', { player: p.id, c: c0, chars: [c0], cap: 2, g });
    cands.sort((x, y) => y.margin - x.margin).slice(0, Math.max(0, vc.cap)).forEach(({ c, h }) => {
      g.story.scene.revealed.push(c.id + ':' + h.id);
      push(g, { kind: 'voice', skill: h.skill, charId: c.id, to: p.id, head: SKILL[h.skill].name.toUpperCase() + ' · PASSIVE ' + passive(c, h.skill, { tags: zoneTags(g) }) + ' vs ' + h.tn + ' · ONLY YOU', text: h.line, ok: true });
    });
  }
  // Checks the Narrator asks for: the engine rolls them when the player clicks.
  for (const ck of t.checks || []) {
    const c = g.characters[ck.charId], skills = (ck.skills || []).filter((s) => SKILL[s]).slice(0, 3);
    if (!c || c.dead || !skills.length || !TN_LADDER.includes(ck.tn)) continue;
    const tags = Array.isArray(ck.tags) ? ck.tags.filter((x) => typeof x === 'string').slice(0, 8).map((x) => x.slice(0, 40)) : undefined;
    const applies = Array.isArray(ck.applies) ? ck.applies.filter((x) => typeof x === 'string').slice(0, 6) : undefined;
    const nc: Check = { id: id(g, 'k'), charId: c.id, skills, tn: ck.tn, stakes: ck.stakes || 'The Narrator calls for a check.', done: false, ...(tags?.length ? { tags } : {}), ...(ck.target ? { target: String(ck.target).slice(0, 40) } : {}), ...(applies?.length ? { applies } : {}),
      ...(ck.kind === 'save' ? { kind: 'save' as const, ...(['body', 'brain', 'heart'].includes(ck.family || '') ? { family: ck.family } : {}) } : {}), ...(ck.footnote && g.characters[ck.footnote] ? { footnote: ck.footnote } : {}),
      ...(ck.double ? { double: true } : {}), ...(ck.auto === 'success' || ck.auto === 'fail' ? { auto: ck.auto } : {}) };
    emitStory(g, 'check_build', { c, ck: nc, g }); // 'check_build' {c, ck}: items may add tags or flags to a new check
    g.checks.push(nc);
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
    const c = g.characters[x.charId]; if (c && !c.dead && c.hp <= 0 && x.loc === 'all') { c.hp = 1; c.downedFails = 0; push(g, { kind: 'system', text: c.name + ' is stabilised at 1 HP.' }); }
    if (!c || !c.injuries?.length) continue;
    const before = c.injuries.length;
    c.injuries = x.loc === 'all' ? [] : c.injuries.filter((i) => i.loc !== x.loc);
    if (c.injuries.length < before) push(g, { kind: 'system', text: c.name + '’s ' + (x.loc === 'all' ? 'injuries are' : x.loc + ' injury is') + ' treated.' });
  }
  storyFields(g, t);
  for (const x of t.harm || []) { const c = g.characters[x.charId]; const n = Math.max(0, Math.min(500, Math.floor(+x.amount || 0))); if (c && n) storyHarm(g, c, n, { type: x.type === 'true' ? 'true' : 'story', dmgType: x.type && x.type !== 'true' ? x.type : undefined, why: (x.why || 'the story').slice(0, 80) }); }
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
    (g.story as any).entered = t.travel; // 'zone_enter' fires once the turn's NPC ops are in (below)
    canon(g, 'The party travelled to ' + zoneMap(g).name + ' (scene ' + g.story.scene.n + ').', [], 2);
    musicOnTravel(g);
  }
  for (const op of t.objects || []) applyObjectOp(g, op);
  for (const op of t.npcs || []) applyNpcOp(g, op);
  // 'zone_enter' {g, zone}: the party arrived in a zone this turn (Wind on the Skin feels who waits there).
  if ((g.story as any).entered) { const z = (g.story as any).entered; delete (g.story as any).entered; emitStory(g, 'zone_enter', { g, zone: z }); senseLurkers(g, 'zone'); }
  if (typeof t.mana === 'number') g.story.mana = Math.max(0, Math.min(40, Math.round(t.mana)));
  for (const m of t.magic || []) { const c = g.characters[m.charId]; if (c) teach(g, c, m, m.reason || 'the story'); }
  if ((t.npcs || []).length) noticeAll(g);
  for (const l of t.loot || []) giveLoot(g, l);
  if (t.endScene?.summary) { g.story.journal.push(t.endScene.summary); noteScene(g, g.story.scene.title, t.endScene.summary); }
  for (const op of (t.memory || []).slice(0, 16)) applyMemOp(g, op);
  // Chapters (recursive summaries): when due, the Narrator writes one; if it keeps not doing so, the engine folds the
  // scene summaries in itself so memory never grows without bound.
  if (memoryOf(g).scenes.length >= SCENES_PER_CHAPTER && (t.chapter?.summary || memoryOf(g).scenes.length >= SCENES_PER_CHAPTER * 2)) rollChapter(g, t.chapter || undefined);
  g.story.queued = t.combat && t.combat.enemies?.length ? [] : (t.actions || []).filter((x) => x && g.characters[x.charId]).slice(0, 6);
  if (t.combat && t.combat.enemies?.length) {
    const want = t.combat.map ? mapFor(g, t.combat.map) : null, map = want || zoneMap(g), same = map.id === zoneMap(g).id, pos = positionsOf(g);
    const pcs = Object.values(g.characters).filter((c) => !c.dead).map((c) => ({ c, pos: same ? pos[c.id] : undefined }));
    let foes: any[] = t.combat.enemies.slice(0, 7).map((e) => ({ name: e.name || 'Hostile', tier: e.tier, caster: CASTER[(e as any).caster] || HEART_CASTER[(e as any).caster] ? (e as any).caster : undefined, weapon: WEAPON[e.weapon] ? e.weapon : 'service_pistol', at: e.at || '', kind: e.kind, tags: e.tags, unaware: !!e.unaware, no_surrender: !!e.no_surrender, hidden: !!e.hidden }));
    // Hostile people already on this map join the fight where they stand (a listed enemy with the same name is them).
    if (same) { const host = npcsOf(g).filter((n) => n.side === 'hostile' || foes.some((f) => f.name.toLowerCase() === n.name.toLowerCase()));
      const used = new Set<number>();
      for (const n of host) { const i = foes.findIndex((f, j) => !used.has(j) && f.name.toLowerCase() === n.name.toLowerCase()); const f: any = { ...(i >= 0 ? foes[i] : {}), name: n.name, tier: n.tier, weapon: n.weapon, at: refOf(n.pos), id: n.id, portrait: n.portrait, caster: n.caster ?? (i >= 0 ? foes[i].caster : undefined), kind: n.kind || (i >= 0 ? foes[i].kind : undefined), tags: [...(n.tags || []), ...(i >= 0 ? foes[i].tags || [] : [])] }; if (i >= 0) { foes[i] = f; used.add(i); } else { used.add(foes.length); foes.push(f); } }
      g.story.npcs = npcsOf(g).filter((n) => !host.includes(n)); foes = foes.slice(0, 8); }
    g.combat = startCombat(t.combat.name || 'Fight', map, pcs, foes, t.combat.difficulty || 'standard', g.rng, same ? storyObjects(g) : undefined, { fear: !!t.combat.fear, ...(typeof t.combat.fromTalk === 'boolean' ? { fromTalk: t.combat.fromTalk } : {}) }); magicIn(g, g.combat);
    g.phase = 'combat'; g.story.await = 'none'; musicOf(g).fight++; syncSong(g);
    // Every enemy gets a stable NPC id (its face and its survival after the fight follow it); a story NPC keeps its own.
    g.combat.units.filter((u) => u.side === 'foe').forEach((u, i) => { const f: any = foes[i]; u.npcId = (f && f.id) || 'n' + (++g.seq); if (f && f.portrait) u.img = f.portrait; });
    { const seen: Record<string, number> = {}; for (const u of g.combat.units) if (u.side === 'foe' && !u.img) { const p = portraitFor(g, u.name, seen); if (p) u.img = p; } }
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
  // Who gives this unit its orders: its character's player; a companion's owner; a Puppeted enemy's puppeteer (rules 1.3).
  const pup = u.side === 'foe' ? puppeteerOf(g, cb!, u) : null;
  const c = u.charId ? g.characters[u.charId] : u.ctrl ? g.characters[u.ctrl] : pup;
  if (!c || c.owner !== by) fail('Not your unit.');
  if ((u.companion || pup) && !COMPANION_ACTS.has(a.type)) fail((u.companion ? 'A companion' : 'A puppet') + ' can move, attack, hold Overwatch and end its turn.');
  // A unit with a fixed action list (the drone: move and a plain shot; spec §14 item 370) refuses everything else.
  if (u.allowedActions && a.type !== 'combat/end-turn' && a.type !== 'combat/decline') {
    const id = a.type === 'combat/attack' ? a.mode || 'shot' : a.type === 'combat/move' ? a.how || 'move' : a.type.slice('combat/'.length);
    if (!u.allowedActions.includes(id)) fail(u.name + ' can only ' + u.allowedActions.map((x) => ACT_NAME[x] || x).join(', ') + ' and end its turn.');
  }
  const who = u.charId ? c : null; // a companion or puppet fights with its own numbers
  let err: string | null = null;
  const before = cb!.units.map((x) => ({ id: x.id, dead: x.dead, downed: x.downed, hp: x.hp }));
  // Toggles the player set on this action (Ricochet, Nonlethal…), read by items' hooks through modOn(); cleared after.
  const mods = (a as any).mods; cb!.mods = Array.isArray(mods) ? mods.filter((x: any) => typeof x === 'string').slice(0, 8) : [];
  const inWindow = !!cb!.window;
  try {
  switch (a.type) {
    case 'combat/perk': err = runPerkAction({ u, c, cb: cb!, g }, a.id, a, g.rng, 'combat'); break;
    case 'combat/decline': if (!cb!.window) fail('There is nothing to decline.'); windowStep(cb!, true); break;
    case 'combat/move': err = moveUnit(cb!, u, a.to, g.rng, a.how || 'move'); break;
    case 'combat/shove': { const t = cb!.units.find((x) => x.id === a.targetId); if (!anyTarget(t, u)) fail('Pick someone else.'); refuseHook(cb!, u, a); err = shove(cb!, g.rng, u, t!); break; }
    case 'combat/prone': err = toggleProne(cb!, u); break;
    case 'combat/brace': err = brace(cb!, u); break;
    case 'combat/skill': { const t = a.targetId ? cb!.units.find((x) => x.id === a.targetId) || null : null; if (a.targetId && !anyTarget(t || undefined, u)) fail('Pick someone else.'); err = useWeaponSkill(cb!, g.rng, u, t, who); break; }
    case 'combat/gift': err = runGift(g, cb!, g.rng, u, tileKey(g, a.aim)); break;
    case 'combat/repair': err = a.targetId && a.targetId !== u.id ? repairAlly(cb!, u, cb!.units.find((x) => x.id === a.targetId)) : fieldRepair(cb!, u); break;
    case 'combat/paired': { const t = cb!.units.find((x) => x.id === a.targetId), t2 = a.targetId2 ? cb!.units.find((x) => x.id === a.targetId2) || null : null; if (!anyTarget(t, u) || (t2 && !anyTarget(t2, u))) fail('Pick someone else.'); err = pairedAttack(cb!, g.rng, u, t!, t2, c); break; }
    case 'combat/overwatch': refuseHook(cb!, u, a); err = setOverwatch(cb!, u, a.mode); break;
    case 'combat/attack': {
      const t = cb!.units.find((x) => x.id === a.targetId); if (!anyTarget(t, u)) fail('Pick someone else.');
      if (pup && t!.id === u.id) fail('A puppet can\'t be made to harm itself.');
      if (a.mode === 'burst') { err = fireBurst(cb!, g.rng, u, t!, who); break; }
      if (a.mode === 'auto') { err = fireAuto(cb!, g.rng, u, t!, who); break; }
      const pv = previewAttack(cb!, u, t!, a.mode); if (!pv.ok) fail(pv.why!);
      resolveAttack(cb!, g.rng, u, t!, a.mode, who); break;
    }
    case 'combat/reload': err = a.hand === 'both' || a.hand === 'off' ? reloadHands(cb!, u, a.hand) : reload(cb!, u); break;
    case 'combat/throw': err = throwItem(cb!, g.rng, u, a.item, tileKey(g, a.tile)); break;
    case 'combat/swap': err = swapWeapon(g, cb!, u, c!, a); break;
    case 'combat/pray': err = pray(cb!, g.rng, u, { choice: a.choice, targetId: a.targetId, miracle: a.miracle }); break;
    case 'combat/parley': { const t = cb!.units.find((x) => x.id === a.targetId); if (!t) fail('Pick an enemy.'); err = parley(cb!, g.rng, u, t!, a.kind, a.text || ''); break; }
    case 'combat/hide': err = hideAction(cb!, u); break;
    case 'combat/extinguish': { const t = a.targetId ? cb!.units.find((x) => x.id === a.targetId) : u; if (!t) fail('Pick someone burning.'); err = extinguish(cb!, u, t!); break; }
    case 'combat/escape': err = escapeGrapple(cb!, g.rng, u); break;
    case 'combat/recover': err = recoverWeapon(cb!, u); break;
    case 'combat/pickup': err = pickUp(cb!, u, a.tile); break;
    case 'combat/door': err = toggleDoor(cb!, u, a.tile); break;
    case 'combat/load': err = loadMagazine(cb!, u); break;
    case 'combat/shoot-cover': err = shootCover(cb!, u, a.tile, c); break;
    case 'combat/analyze': { const t = cb!.units.find((x) => x.id === a.targetId); if (!t) fail('Pick an enemy.'); err = analyze(cb!, u, t!); break; }
    case 'combat/clear': err = clearJam(cb!, u); break;
    case 'combat/stim': { const t = cb!.units.find((x) => x.id === a.targetId); if (!t || t.side !== u.side) fail('Pick an ally.'); err = useStim(cb!, u, t!, c!, isMedicChar(c!)); break; }
    case 'combat/end-turn': endTurn(cb!, g.rng); break;
    case 'combat/draw': err = drawGlyph(cb!, g.rng, u, a.word, tileKey(g, a.tile)); break;
    case 'combat/evoke': err = evokeSpell(cb!, g.rng, u, tileKey(g, a.tile), a.aim ? tileKey(g, a.aim) : undefined, evokeOptsOf(g, a)); break;
    case 'combat/strike-turret': err = strikeTurret(cb!, g.rng, u, tileKey(g, a.tile)); break;
    case 'combat/scuff': err = scuffGlyph(cb!, u); break;
    case 'combat/vent': err = ventFlux(cb!, u); break;
    case 'combat/core': err = swapCore(cb!, u); break;
    case 'combat/outburst': err = beginOutburst(cb!, g.rng, u, a.design, a.aim ? tileKey(g, a.aim) : undefined, a.hold ?? !a.aim, { watch: !!a.watch }); break;
    case 'combat/pump': err = pumpOutburst(cb!, g.rng, u); break;
    case 'combat/letgo': err = letGo(cb!, u); break;
    case 'combat/steady': err = steadyHeart(cb!, u); break;
    case 'combat/feed': err = feedOutburst(cb!, u); break;
    case 'combat/heartwatch': err = setHeartWatch(cb!, u, a.on !== false); break;
    case 'combat/release': err = releaseOutburst(cb!, g.rng, u, a.aim ? tileKey(g, a.aim) : undefined); break;
    case 'combat/syphon': err = syphonMana(cb!, u); break;
    case 'combat/crystallise': err = crystalliseCore(cb!, u); break;
    case 'combat/song': {
      if (!musicTraitOf(c)) fail('Only a music trait plays its song on demand.');
      if (u.ap < SONG_AP) fail('Needs ' + SONG_AP + ' AP.');
      if (!startSong(g, c!, 'on the Musek Blestor', 'manual', (t) => cb!.log.push(t))) fail(musicOf(g).now?.charId === c!.id ? 'Your song is already playing.' : 'Another song is playing; wait for it to end.');
      u.ap -= SONG_AP; emitFx(cb!, 'song', { unit: u.id, at: u.pos }); break;
    }
    default: fail('Unknown action.');
  }
  } finally { delete cb!.mods; }
  if (err) fail(err);
  // An off-turn window counts the action (its unit is done after its limit; then the next, then the turn resumes).
  if (inWindow && cb!.window && a.type !== 'combat/decline' && a.type !== 'combat/end-turn') windowStep(cb!);
  // 'action_done' {u, a, cb}: after every combat action and its window step (On My Mark settles its debt: hooks gap E-H2).
  emitHook(cb!, 'action_done', { u, a, cb: cb! });
  for (const x of cb!.units) x.ap = Math.round(x.ap * 10) / 10; // Glyph AP comes in tenths: no 3.4000000000000004
  songTriggers(g, u, c!, before);
  noteDeaths(cb!);
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
const anyTarget = (t: Combat['units'][number] | undefined, u: Combat['units'][number]) => !!t && t.id !== u.id && !t.dead && !t.surrendered;
/** What a companion or a puppet may do (rules 1.3). */
const ACT_NAME: Record<string, string> = { move: 'move', sprint: 'sprint', disengage: 'disengage', shot: 'shoot', aimed: 'take an aimed shot', melee: 'strike' };
const COMPANION_ACTS = new Set(['combat/move', 'combat/attack', 'combat/overwatch', 'combat/end-turn', 'combat/decline', 'combat/reload', 'combat/prone', 'combat/extinguish', 'combat/escape']);
/** The PC character who Puppeted this enemy (its player runs the enemy's turn), if the puppeteer is up. */
function puppeteerOf(g: GameState, cb: Combat, u: Combat['units'][number]): Character | null {
  const by = condSource(u, 'puppeted'); if (!by) return null;
  const p = cb.units.find((x) => x.id === by); return p && p.charId && !p.dead && g.characters[p.charId] ? g.characters[p.charId] : null;
}
/** Swap what a hand holds mid-fight (spec: 1 AP per hand): the off hand into the main hand, or a weapon or mod from
 * the pack. The unit's weapon numbers are rebuilt from the character; the old weapon keeps its rounds and wear. */
function swapWeapon(g: GameState, cb: Combat, u: Combat['units'][number], c: Character, a: { from?: string | number; mod?: number }): string | null {
  if (u.companion) return 'A companion has no pack.';
  const ctx: any = emitHook(cb, 'swap', { u, c, from: a.from, mod: a.mod, ap: 1, cb });
  const ap = Math.max(0, ctx.ap); if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  unitToCharacter(g, u, false);
  let err: string | null = null;
  if (a.mod != null) err = fitMod(c, Number(a.mod));
  else if (a.from === 'off') {
    if (!c.offHand || !WEAPON[c.offHand.id] || (WEAPON[c.offHand.id] as any).hands !== '1H') return 'Your off hand holds no one-handed weapon.';
    if ((WEAPON[c.weapon] as any)?.hands === '2H') return 'Your main-hand weapon needs both hands.';
    const main = { id: c.weapon, ...(c.weaponState || {}) }, off = c.offHand, offRounds = u.offAmmo ?? 0;
    c.weapon = off.id; c.weaponState = { rarity: off.rarity, dur: off.dur, mods: off.mods }; c.offHand = { id: main.id, rarity: main.rarity, dur: main.dur, mods: main.mods };
    const wasLoaded = c.loaded ?? 0; c.loaded = offRounds; u.offAmmo = wasLoaded;
  } else if (typeof a.from === 'number' || /^\d+$/.test(String(a.from))) err = equip(c, Number(a.from), 'main');
  else return 'Swap from your off hand, or a weapon in your pack.';
  if (err) return err;
  const fresh = unitFromCharacter(c, u.pos, { state: g.rng.state });
  for (const k of ['weapon', 'ammo', 'attack', 'dmgMult', 'dur', 'maxDur', 'mods', 'offWeapon', 'mags', 'loose', 'ammoType', 'magTypes', 'unarmedBonus', 'def'] as const) (u as any)[k] = (fresh as any)[k];
  if (a.from !== 'off') u.offAmmo = fresh.offAmmo;
  u.heat = 0; u.jammed = false; u.braced = false; u.ap -= ap;
  cb.log.push(c.name + (a.mod != null ? ' fits a mod' : ' swaps to the ' + (WEAPON[u.weapon]?.name || u.weapon)) + ' (' + ap + ' AP).');
  syncSong(g);
  return null;
}

/** Enemies act on their own turns until a PC is up or the fight ends. */
function runEnemies(g: GameState) {
  const cb = g.combat!;
  for (let guard = 0; guard < 40 && !checkOver(cb); guard++) {
    const u = active(cb)!;
    // A player's unit Downed, killed or out of the fight on its own turn (a reaction, a trap, a barrel, a Mana Short), or
    // already Downed when the fight began, can't act or press End turn: its turn passes on by itself.
    if (u.side !== 'foe' && !cb.window && (u.dead || u.downed || u.surrendered)) { endTurn(cb, g.rng); continue; }
    if (u.side !== 'foe') break;
    if (u.charId) break; // a player's fighter on the foe side (the Proving Ground's team fight): its player acts
    if (puppeteerOf(g, cb, u)) break; // a Puppeted enemy's turn is run by its puppeteer's player (rules 1.3)
    if (!g.sandbox || g.sandbox.ai) enemyTurn(cb, g.rng); // the Proving Ground can switch the enemies off
    noteSighted(cb); // a hostile that walks into sight on its own turn counts as seen, even if it steps back out
    if (!checkOver(cb)) endTurn(cb, g.rng);
  }
  if (cb.over) { if (g.sandbox) sandboxOver(g); else finishCombat(g); }
}

function finishCombat(g: GameState) {
  const cb = g.combat!;
  for (const u of cb.units) if (u.charId) unitToCharacter(g, u, !cb.noXp);
  // Companions keep their HP (destroyed ones stay at 0 until repaired or healed in the story).
  for (const u of cb.units) if (u.companion && u.ctrl) { const owner = g.characters[u.ctrl], comp = owner?.companions?.find((x) => 'cp-' + owner.id + '-' + x.id === u.id); if (comp) comp.hp = u.dead ? 0 : u.hp; }
  noteDeaths(cb); magicOut(g, cb, true);
  const won = cb.over === 'win';
  emitHook(cb, 'combat_end', { cb, won, g }); // 'combat_end' {cb, won}: after the fighters are written back to their characters
  { const fallen = cb.units.filter((u) => u.side === 'foe' && u.dead).map((u) => u.name), lost = cb.units.filter((u) => u.side === 'pc' && u.dead).map((u) => u.name);
    canon(g, (won ? 'The party won' : (cb.over as string) === 'extracted' ? 'The party was extracted from' : 'The party lost') + ' the fight "' + cb.name + '" in ' + cb.round + ' rounds' + (fallen.length ? '; killed: ' + fallen.join(', ') : '') + (lost.length ? '; fallen: ' + lost.join(', ') : '') + '.', [...new Set([...fallen, ...lost])], lost.length ? 5 : 3);
    for (const n of [...fallen, ...lost]) { const p = findPerson(memoryOf(g), n); if (p) applyMemOp(g, { op: 'person', id: p.id, status: 'dead' }); else if (!GENERIC.test(n)) applyMemOp(g, { op: 'person', name: n, status: 'dead' }); } }
  const extracted = (cb.over as string) === 'extracted';
  cb.summary = (won ? 'Won' : extracted ? 'Extracted from' : 'Lost') + ' "' + cb.name + '" in ' + cb.round + ' rounds. ' + cb.units.map((u) => u.name + (u.dead ? ' (dead)' : u.downed ? ' (down)' : ' ' + u.hp + '/' + u.maxHp + ' HP')).join(', ') + '.';
  push(g, { kind: 'combat', text: cb.summary });
  // No XP for a fight on people who weren't hostile (spec: Anyone is a target).
  if (won && !cb.noXp) for (const c of Object.values(g.characters)) if (!c.dead) giveXp(g, c, 'combat', combatXp(cb), cb.difficulty + ' fight');
  // Where everyone ends up becomes the story's positions.
  if (g.story.zone && g.story.zone !== cb.map.id) { const zn = (g.story.zoneNpcs ||= {}); zn[g.story.zone] = npcsOf(g); g.story.npcs = zn[cb.map.id]; delete zn[cb.map.id]; }
  g.story.zone = cb.map.id; g.story.positions = {}; g.story.objects = JSON.parse(JSON.stringify(cb.objects || []));
  for (const u of cb.units) if (u.side === 'foe' && u.dead && u.npcId) for (const o of g.story.objects!) if (o.npcId === u.npcId) { o.dead = true; o.resolved = true; }
  for (const u of cb.units) if (u.charId && !u.dead) g.story.positions[u.charId] = u.pos;
  for (const u of cb.units) if (u.companion && COMPANION_ROUND_AP[u.companion] != null && u.ctrl && !u.dead && !u.downed && u.hp > 0) g.story.positions[u.id] = u.pos; // a drone or beast stays where it ended
  // Enemies still standing go back on the map as hostile tokens where they ended.
  { const map = zoneMap(g), taken = new Set([...Object.values(g.story.positions), ...npcsOf(g).map((n) => n.pos)]);
    const freeNear = (k: string) => { if (!taken.has(k)) return k; const [x0, y0] = k.split(',').map(Number); for (let r = 1; r < 6; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const n = (x0 + dx) + ',' + (y0 + dy); if (standable(map, n) && !taken.has(n) && !storyObjects(g).some((o) => o.pos === n && blocksMove(o))) return n; } return k; };
    for (const u of cb.units) if (u.side === 'foe' && !u.dead && !u.downed && !u.surrendered) { const at = freeNear(u.pos); taken.add(at); npcsOf(g).push({ id: u.npcId || 'n' + (++g.seq), name: u.name, side: 'hostile', tier: u.tier || 'minion', weapon: u.weapon, pos: at, portrait: u.img || undefined, ...(u.kind && u.kind !== 'human' ? { kind: u.kind } : {}), ...(u.tags?.length ? { tags: u.tags.filter((t) => t !== 'humanoid') } : {}) }); }
    // Surrendered and subdued foes stay as neutral prisoners where they gave up (rules 1.3), for the Narrator to deal with.
    for (const u of cb.units) if (u.side === 'foe' && u.surrendered && !u.dead) { const at = freeNear(u.pos); taken.add(at); npcsOf(g).push({ id: u.npcId || 'n' + (++g.seq), name: u.name, side: 'neutral', tier: u.tier || 'minion', weapon: u.weapon, pos: at, portrait: u.img || undefined, hp: Math.max(1, u.hp), prisoner: true, tags: ['prisoner', ...(u.tags || []).filter((t) => t !== 'prisoner' && t !== 'humanoid')], ...(u.kind && u.kind !== 'human' ? { kind: u.kind } : {}) }); } }
  g.phase = 'story'; g.story.await = 'narrator'; g.story.work = { kind: 'combat_end', note: combatReport(cb) };
  musicAfterFight(g);
  g.combat = { ...cb };
}

/** The one Narrator call a fight costs gets this: the result, the moments that mattered, who's left where, and anything said mid-fight. */
export function combatReport(cb: Combat): string {
  const key = /CRITICAL|INJURY|Downed|down for good|dies|stabilises|breaks into rubble|stims|analyzes|picks up|Fan|Overcharge|evokes|releases|MANA SHORT|OVERLOAD|stands as|The air turns/;
  const moments = cb.log.filter((l) => key.test(l)).slice(-14);
  const where = cb.units.map((u) => u.name + (u.side === 'foe' ? ' (enemy)' : '') + ': ' + (u.dead ? 'dead' : u.surrendered ? (u.subdued ? 'subdued' : 'surrendered') + ' (a prisoner) at ' + refOf(u.pos) : (u.downed ? 'Downed, ' : '') + u.hp + '/' + u.maxHp + ' HP at ' + refOf(u.pos))
    + ((u.injuries || []).length ? ', injured ' + u.injuries!.map((i) => (i.side ? i.side + ' ' : '') + i.loc).join(' and ') : ''));
  return [cb.summary || '', 'Key moments:\n' + (moments.map((m) => '- ' + m).join('\n') || '- none'), 'At the end:\n' + where.map((w) => '- ' + w).join('\n'),
    ...(cb.notes?.length ? ['Said or attempted mid-fight (yours to judge):\n' + cb.notes.map((n) => '- ' + n).join('\n')] : [])].join('\n');
}

// ---------- damage out of a fight (perk-runtime H6) ----------
/** HP lost in the story (a trap, the Narrator's harm[]) goes through the engine's damage chokepoint on the area map's
 * throwaway fight, so items that change damage taken (Soulmate's share, Scar Tissue, Last Wall) work out of a fight too.
 * floor: never below 1 HP (a story trap); else a character can be Downed (an ally's stim, or the Narrator, gets them up).
 * Returns the HP the character lost. 'story_harm' {g, c, dmg, type} lets a story-only item change it first. */
export function storyHarm(g: GameState, c: Character, dmg: number, o: { type?: string; dmgType?: string; why?: string; floor?: boolean } = {}): number {
  if (c.dead || dmg <= 0) return 0;
  const sh: any = emitStory(g, 'story_harm', { g, c, dmg: Math.floor(dmg), type: o.type || 'hazard' }, [c]); dmg = Math.max(0, Math.floor(sh.dmg));
  const hp0 = c.hp, pos = positionsOf(g);
  if (g.phase !== 'story' || !pos[c.id]) { c.hp = Math.max(o.floor ? 1 : 0, c.hp - dmg); return hp0 - c.hp; }
  const cb = storyCb(g), u = cb.units.find((x) => x.charId === c.id); if (!u) return 0;
  const was = bindGame(g);
  try {
    const r = applyDamage(cb, u, dmg, { type: o.type || 'hazard', by: null, shield: true, credit: 'none', ...(o.dmgType ? { dmgType: o.dmgType } : {}) });
    if (o.floor && (u.downed || u.hp <= 0) && !u.dead) { u.downed = false; u.hp = Math.max(1, u.hp); }
    if (r.amount && o.why) cb.log.push(c.name + ' takes ' + r.amount + ' damage (' + o.why + ').');
  } finally { bindGame(was); }
  for (const x of cb.units) if (x.charId) unitToCharacter(g, x, false, true);
  for (const l of cb.log) push(g, { kind: 'system', text: l, act: true, charId: c.id });
  if (c.hp <= 0 && !c.dead) push(g, { kind: 'system', text: c.name + ' is Downed: an ally\'s stim, or the Narrator, gets them up.', charId: c.id });
  return hp0 - c.hp;
}

// ---------- objects on the story map (spec: Map objects; Points of interest) ----------
export function storyObjects(g: GameState): MapObject[] { return (g.story.objects ||= defaultObjects(zoneMap(g))); }
/** Arriving on a tile: hidden traps there spring; traps nearby may be spotted (passive Vigilant). */
function arrive(g: GameState, c: Character, k: string) {
  const objs = storyObjects(g), trap = objs.find((o) => o.pos === k && isTrap(o));
  if (trap) {
    const dmg = kindOf(trap).trap!.damage;
    g.story.objects = objs.filter((o) => o !== trap);
    push(g, { kind: 'system', text: c.name + ' steps on a trap at ' + refOf(k) + ': ' + dmg + ' damage.' });
    storyHarm(g, c, dmg, { type: 'trap', floor: true });
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
  // A companion (Drone Handler's drone, Beast Handler's beast) is a token of its own on the area map, keyed by its unit
  // id: next to its owner when it first shows, gone when it is destroyed or its owner is dead (PROVISIONAL, spec 14).
  for (const c of Object.values(g.characters)) for (const comp of c.companions || []) {
    if (COMPANION_ROUND_AP[comp.kind] == null) continue; const id = companionId(c, comp);
    if (c.dead || !pos[c.id] || (comp.hp != null && comp.hp <= 0)) { delete pos[id]; continue; }
    if (pos[id]) continue;
    const [x0, y0] = pos[c.id].split(',').map(Number); let at = '';
    const blocked = new Set([...taken, ...(g.story.npcs || []).map((n) => n.pos), ...(g.story.objects || []).filter(blocksMove).map((o) => o.pos)]);
    for (let r = 1; r < 4 && !at; r++) for (let dy = -r; dy <= r && !at; dy++) for (let dx = -r; dx <= r && !at; dx++) { const k = (x0 + dx) + ',' + (y0 + dy); if (standable(map, k) && !blocked.has(k)) at = k; }
    if (at) { pos[id] = at; taken.add(at); }
  }
  return pos;
}
/** A companion's unit id (fights and the area map alike). */
export const companionId = (c: Character, comp: { id: string }) => 'cp-' + c.id + '-' + comp.id;
/** A companion's AP each overworld round: its own, as in a fight: the drone 3, the beast 4 (PROVISIONAL, spec 14). */
export const COMPANION_ROUND_AP: Record<string, number> = { drone: 3, beast: 4, twin: 4 }; // the twin: Twinbound's Call on the area map
export const DRONE_ROUND_AP = COMPANION_ROUND_AP.drone;

// ---------- views ----------
/** What one player may see: no hooks, no one else's voices or Overreach. */
export function viewFor(g: GameState, playerId: string): GameState {
  // The skill panel shows Ask only where a voice has something (Silent elsewhere): which skills, never the hooks themselves.
  const sc = g.story.scene, voiced: Record<string, string[]> = {};
  for (const c of Object.values(g.characters)) if (c.owner === playerId) voiced[c.id] = [...new Set(sc.hooks.filter((h) => !sc.revealed.includes(c.id + ':' + h.id)).map((h) => h.skill))];
  const v: GameState = { ...g, story: { ...g.story, entries: g.story.entries.filter((e) => !e.to || e.to === playerId), scene: { ...sc, hooks: [], voiced } } };
  v.overreach = g.overreach.filter((o) => g.characters[o.charId]?.owner === playerId);
  if (playerId !== g.hostId) delete v.memory; delete v.archive;
  // Hidden objects (unspotted traps) stay hidden from every player, the host included.
  if (g.story.objects) v.story.objects = g.story.objects.filter((o) => !o.hidden);
  if (g.combat?.objects) v.combat = { ...g.combat, objects: g.combat.objects.filter((o) => !o.hidden) };
  // Sigil traps and hidden turrets (rules 1.4) show to their own side only, until spotted; so do their fx.
  if (v.combat) v.combat = { ...v.combat, zones: (v.combat.zones || []).filter((z) => !secretFrom(z, 'pc')), fx: (v.combat.fx || []).filter((e) => !e.only || e.only === 'pc') };
  if (g.story.zones) v.story.zones = g.story.zones.filter((z: any) => !secretFrom(z, 'pc'));
  if (g.sandbox) sandboxView(g, v, playerId); // no saved room; a team fight seen from the player's side
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
    c.downedFails = u.downed && keepDowned && !u.dead ? u.saves.fail : 0;
    c.injuries = (u.injuries || []).filter((i) => i.loc === 'arm' || i.loc === 'leg');
    // Ammo carried out of the fight (spec: Reloading).
    c.loaded = u.ammo;
    magicToCharacter(c, u);
    if (u.maxDur) c.weaponState = { ...(c.weaponState || {}), dur: u.dur };
    { const had = packOf(c).filter((x) => (x.item || x.id) === 'spare_parts').reduce((t, x) => t + x.qty, 0), used = had - (u.parts ?? had);
      if (used > 0) { let left = used; c.pack = packOf(c).map((x) => { if ((x.item || x.id) !== 'spare_parts' || !left) return x; const n = Math.min(left, x.qty); left -= n; return { ...x, qty: x.qty - n }; }).filter((x) => x.qty > 0 || x.mags); } }
    const pack = packOf(c).map((it) => ({ ...it }));
    const mi = pack.findIndex((it) => it.weapon === c.weapon && it.mags);
    if (mi >= 0 && u.mags) { pack[mi].mags = [...u.mags]; pack[mi].qty = u.mags.length; }
    const w = WEAPON[c.weapon];
    if (u.loose != null) { let left = u.loose; for (const it of pack) if (it.calibre && it.calibre === w?.ammo) { it.qty = Math.min(it.qty, left); left -= it.qty; } }
    for (const x of u.extra || []) { let it = pack.find((p) => p.weapon === x.weapon && p.mags); if (!it) { it = { ...magsOf(x.weapon, 0), mags: [] }; pack.push(it); } it.mags!.push(x.rounds); it.qty = it.mags!.length; }
    // Rules 1.3: the off-hand gun's spares, thrown items used, special ammo, persisting class resources.
    if (u.offMags && c.offHand) { const oi = pack.findIndex((it) => it.weapon === c.offHand!.id && it.mags); if (oi >= 0) { pack[oi].mags = [...u.offMags]; pack[oi].qty = u.offMags.length; } }
    if (u.throwables) for (const [item, left] of Object.entries(u.throwables)) { let have = pack.filter((it) => (it.weapon || it.id) === item && !it.mags).reduce((t, it) => t + it.qty, 0), drop = have - left;
      for (const it of pack) { if (drop <= 0) break; if ((it.weapon || it.id) !== item || it.mags) continue; const n = Math.min(drop, it.qty); it.qty -= n; drop -= n; } void have; }
    c.loadedType = u.ammoType || null;
    if (mi >= 0 && u.magTypes) pack[mi].magTypes = [...u.magTypes];
    if (u.res && u.resMax) for (const r of Object.keys(u.res)) if (r === 'supplies' || r === 'toxins') (c.res ||= {})[r] = u.res[r];
    c.pack = pack.filter((it) => it.qty > 0 || it.mags);
    const fam = WEAPON[u.weapon]?.mastery_family; if (afterFight && fam && u.kills) c.weaponKills[fam] = (c.weaponKills[fam] || 0) + u.kills;
}

// ---------- overworld rounds (spec: Overworld rounds) ----------
/** How hard an enemy is to slip past: its notice bonus (Vigilant) and the TN of the Ingenuity check to stay hidden. */
export const NOTICE: Record<string, number> = { minion: 0, soldier: 2, elite: 4, boss: 6 };
export const ROUND_AP = 6;
export const apLeft = (g: GameState, c: Character) => g.story.ap?.[c.id] ?? ROUND_AP;
function spendAp(g: GameState, c: Character, n: number) { (g.story.ap ||= {})[c.id] = Math.max(0, Math.round((apLeft(g, c) - n) * 10) / 10); } // Glyph AP comes in tenths
/** A new overworld round: full AP, a fresh Say, no trails. */
export function newRound(g: GameState) {
  g.story.round++; g.story.spoken = {}; g.story.await = 'players';
  g.story.ap = {}; g.story.ended = {}; g.story.trail = {}; g.story.needs = !!g.story.rulings?.length; g.story.noticed = {}; // a ruling still owed keeps the Narrator due g.story.focus = null;
  // 'world_round_start' {g, n}, then 'round_ap' {c, ap, lines} per character: items change a round's AP on the area map
  // (Southern Fist, Ghost Soldier, Flashback: hooks gap A7/B7/F8/F9). Clamped to 2–9 like a turn's.
  emitStory(g, 'world_round_start', { g, n: g.story.round });
  for (const c of Object.values(g.characters)) { if (c.dead) continue;
    const ra: any = emitStory(g, 'round_ap', { c, ap: ROUND_AP, lines: [] as string[], g }, [c]);
    if (ra.ap !== ROUND_AP) { g.story.ap[c.id] = Math.max(2, Math.min(9, Math.round(ra.ap * 10) / 10)); if (ra.lines.length) push(g, { kind: 'system', text: c.name + ' ' + (ra.ap > ROUND_AP ? '+' : '') + (g.story.ap[c.id] - ROUND_AP) + ' AP this round (' + ra.lines.join(', ') + ').', charId: c.id }); } }
  for (const k in g.story.heat || {}) g.story.heat![k] = Math.max(0, g.story.heat![k] - 2);
  storyMagicRound(g);
  // What the Narrator mapped from players' words runs now, as those players' own actions, from their fresh AP.
  const q = g.story.queued || []; g.story.queued = [];
  for (const x of q) {
    if (g.phase !== 'story' || g.story.await !== 'players') break;
    const c = g.characters[x.charId]; if (!c || c.dead) continue;
    const snap = JSON.stringify({ npcs: g.story.npcs, objects: g.story.objects, seq: g.seq });
    try { worldAct(g, { type: 'world/act', ...x }, c.owner); }
    catch (e) { if (!(e instanceof RuleError)) throw e; { const r = JSON.parse(snap); g.story.npcs = r.npcs; g.story.objects = r.objects; g.seq = r.seq; } push(g, { kind: 'system', text: c.name + ' can\'t ' + (x.act === 'move' ? 'move there' : x.act === 'attack' ? 'make that attack' : x.act) + ': ' + e.message }); }
  }
}
const FACE: Record<string, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
/** The zone's people and enemies as it starts (from the campaign). */
export function initialNpcs(g: GameState): Npc[] {
  const z = campaignOf(g)?.zones.find((x) => x.id === zoneMap(g).id), map = zoneMap(g);
  const seen: Record<string, number> = {};
  return (z?.npcs || []).map((n, i) => ({ id: 'n' + (i + 1) + '-' + map.id, name: n.name, side: n.side, tier: n.tier, weapon: n.weapon, ...((n as any).caster ? { caster: (n as any).caster } : {}), pos: keyOf(n.at, map) || map.foeStart[0], portrait: n.portrait || portraitFor(g, n.name, seen) || undefined, facing: n.facing ? FACE[n.facing] : undefined,
    ...(n.kind ? { kind: n.kind } : {}), ...(n.tags?.length ? { tags: [...n.tags] } : {}) }));
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
    list.push({ id: 'n' + (++g.seq), name: op.name.slice(0, 40), side: op.side === 'hostile' ? 'hostile' : 'neutral', tier, weapon, pos: k, portrait: portraitFor(g, op.name) || undefined, facing: facingToward(k, partyCentre(g)),
      ...(op.kind && KINDS.includes(op.kind) ? { kind: op.kind } : {}), ...(Array.isArray(op.tags) ? { tags: op.tags.filter((x) => FOE_TAGS.includes(x)).slice(0, 6) } : {}), ...(op.hidden ? { hidden: true } : {}) });
    if (op.hidden) { npcSensed(g, list[list.length - 1], 'placed'); return; } // lurking: no line for the players
    push(g, { kind: 'system', text: op.name + ' at ' + refOf(k) + '.' });
    if (!GENERIC.test(op.name)) applyMemOp(g, { op: 'person', name: op.name, where: zoneMap(g).id, ...(op.side === 'hostile' ? { attitude: -2 } : {}) });
    return;
  }
  const n = list.find((x) => x.id === op.id); if (!n) return;
  if (op.action === 'remove') { npcMoved(g, n, n.pos, null); g.story.npcs = list.filter((x) => x !== n); return; }
  if (op.action === 'update') { if (op.hidden !== undefined && !!op.hidden !== !!n.hidden) { if (op.hidden) { n.hidden = true; npcMoved(g, n, n.pos, n.pos, true); npcSensed(g, n, 'hid'); } else { delete n.hidden; push(g, { kind: 'system', text: n.name + ' shows themself at ' + refOf(n.pos) + '.' }); } }
    if (op.side) n.side = op.side === 'hostile' ? 'hostile' : 'neutral'; if (op.name) n.name = op.name.slice(0, 40); if (op.kind && KINDS.includes(op.kind)) n.kind = op.kind; if (Array.isArray(op.tags)) n.tags = op.tags.filter((x) => FOE_TAGS.includes(x)).slice(0, 6); return; }
  if (op.action === 'move') { const k = op.at ? keyOf(op.at, map) : null; if (!k || !free(k)) return; const from = n.pos; n.facing = facingToward(n.pos, k); n.pos = k; npcMoved(g, n, from, k); if (n.hidden) npcSensed(g, n, 'moved'); }
}
/** 'npc_moved' {g, npc, from, to, hid}: a token moved, left the map (to null) or hid (hid: true), for items that watch
 * NPCs (Got You in My Sight). Runs before the move is shown. */
function npcMoved(g: GameState, n: Npc, from: string, to: string | null, hid = false) {
  if (g.phase !== 'story') return;
  emitStory(g, 'npc_moved', { g, npc: n, from, to, hid, cb: storyCb(g) });
}
/** A lurking NPC: items that sense the unseen get a look ('npc_sense' {g, npc, why, cb, reveal: false}); a revealed one
 * shows to everyone. */
export function npcSensed(g: GameState, n: Npc, why: string, only?: Character[]): boolean {
  if (!n.hidden || g.phase !== 'story') return false;
  const r: any = emitStory(g, 'npc_sense', { g, npc: n, why, cb: storyCb(g), reveal: null as string | null }, only);
  if (!r.reveal) return false;
  delete n.hidden; push(g, { kind: 'system', text: r.reveal + ': ' + n.name + ' at ' + refOf(n.pos) + '.' }); g.story.needs = true;
  return true;
}
/** Every lurking NPC gets a look (a zone entered, a round, a move): see npcSensed. */
export function senseLurkers(g: GameState, why: string, only?: Character[]) { for (const n of [...(g.story.npcs || [])]) if (n.hidden) npcSensed(g, n, why, only); }
const ENEMY_TIERS = ['minion', 'soldier', 'elite', 'boss'];
/** Names too generic to be a person in memory. */
const GENERIC = /^(scavenger drone|drone|engineer|security guard|guard|guard captain|hostile|soldier|trooper|enemy rearguard trooper)$/i;

// ---------- magic on the story map and between the story and fights (spec: Mana, rules 1.2) ----------
const MAGIC_ACTS: WorldAct[] = ['draw', 'evoke', 'scuff', 'vent', 'core', 'outburst', 'release', 'syphon', 'crystallise', 'pump', 'letgo', 'steady', 'feed', 'heartwatch'];
/** A tile from a grid reference ("C7") or a tile key ("2,6"). */
function tileKey(g: GameState, t: string): string { if (/^\d+,\d+$/.test(t)) return t; const map = g.phase === 'combat' && g.combat ? g.combat.map : zoneMap(g); return keyOf(t, map) || t; }
/** The Evoke choices beyond the aim (rules 1.4): TWICE's other aims, STEP's landing tile, COMMAND's order. */
function evokeOptsOf(g: GameState, a: { aims?: string[]; dest?: string; order?: string; orderTo?: string; paint?: string }) {
  return { ...(a.aims?.length ? { aims: a.aims.map((t) => tileKey(g, t)) } : {}), ...(a.dest ? { dest: tileKey(g, a.dest) } : {}), ...(a.order ? { order: a.order } : {}), ...(a.orderTo ? { orderTo: tileKey(g, a.orderTo) } : {}),
    ...(a.paint === 'spread' || a.paint === 'push' ? { paint: a.paint as 'spread' | 'push' } : {}) };
}
function performMagic(cb: Combat, rng: Rng, u: Combat['units'][number], a: { act: WorldAct; word?: string; design?: string; hold?: boolean; watch?: boolean; on?: boolean; aims?: string[]; dest?: string; order?: string; orderTo?: string; paint?: string }, tile?: string, aim?: string, g?: GameState): string | null {
  switch (a.act) {
    case 'draw': return a.word ? drawGlyph(cb, rng, u, a.word, tile || u.pos) : 'Pick a word.';
    case 'evoke': return tile ? evokeSpell(cb, rng, u, tile, aim, g ? evokeOptsOf(g, a) : {}) : 'Pick a glyph of the pattern.';
    case 'scuff': return scuffGlyph(cb, u);
    case 'vent': return ventFlux(cb, u);
    case 'core': return swapCore(cb, u);
    case 'outburst': return a.design ? beginOutburst(cb, rng, u, a.design, aim, a.hold ?? !aim, { watch: !!a.watch }) : 'Pick a design.';
    case 'pump': return pumpOutburst(cb, rng, u);
    case 'letgo': return letGo(cb, u);
    case 'steady': return steadyHeart(cb, u);
    case 'feed': return feedOutburst(cb, u);
    case 'heartwatch': return setHeartWatch(cb, u, a.on !== false);
    case 'release': return releaseOutburst(cb, rng, u, aim);
    case 'syphon': return syphonMana(cb, u);
    case 'crystallise': return crystalliseCore(cb, u);
  }
  return 'Unknown spell.';
}
/** Bring the story's magic into a fight or the overworld's throwaway combat: the meter, glyphs and zones (when it's
 * the same zone), and each character's Flux, Strain, held Outburst, conditions and shield. */
function magicIn(g: GameState, cb: Combat) {
  cb.mana = g.story.mana ?? MANA_START;
  migrateStorySigil(g.story as any); cb.sigilV = SIGIL_REV; // 1.2 glyphs go, 1.2 walls become fields (item 441)
  if (!g.story.glyphMap || g.story.glyphMap === cb.map.id) { cb.glyphs = JSON.parse(JSON.stringify(g.story.glyphs || [])); cb.zones = JSON.parse(JSON.stringify(g.story.zones || [])); }
  // Ids never repeat: the story's counter, the live glyphs and zones, and the RAISE walls standing (they outlive the
  // glyphs that made them, so a counter rebuilt from glyphs alone would hand out a wall's id again).
  const walls = (cb.objects || []).filter((o) => o.kind === 'sigil_wall' || /^sw\d+$/.test(String(o.id)));
  cb.glyphSeq = Math.max(0, g.story.glyphSeq || 0, ...[...(cb.glyphs || []), ...(cb.zones || []), ...walls].map((x) => +String(x.id).replace(/\D/g, '') || 0));
  for (const u of cb.units) {
    const s = u.charId ? g.story.magic?.[u.charId] : null; if (!s) continue;
    if (u.mg) { u.mg.flux = s.flux || 0; u.mg.strain = s.strain || 0; u.mg.held = s.held ? migrateHeld(s.held, u.mg.designs.find((d) => d.id === s.held!.design)) : null; u.mg.cast = !!s.cast;
      if (s.freePumps != null) u.mg.freePumps = s.freePumps; u.mg.calmFight = !!s.calmFight; u.mg.calmTend = !!s.calmTend; }
    if (s.condBy) u.condBy = { ...s.condBy };
    if (s.conds && Object.keys(s.conds).length) { u.conds = { ...s.conds }; if (u.conds.slowed) { u.baseMove = u.movement; u.movement /= 2; } if (u.conds.blinded) { u.baseVision = u.vision || 12; u.vision = 1; } if (u.conds.guarded) u.def += 2; }
    if (s.shield) u.shield = s.shield;
  }
  // Story conditions (the scene's, the session's, the arc's) come into a fight in their combat form, with no save
  // (hooks gap F1), for the condition's own combat duration (PROVISIONAL, spec 14). Only the ones a story beat can
  // carry (the mind and heart debuffs, a wound); a story Stun, Pin, Blind and the like stay in the story (the fight's
  // notes say so). Immunities still cancel them (cond_apply).
  if (!cb.overworld) { const was = bindGame(g), rng = { state: g.rng.state }; try {
    for (const u of cb.units) { const c = u.charId ? g.characters[u.charId] : null; if (!c) continue;
      for (const id of storyConds(g, c)) {
        if (!isCondition(id) || (u.conds && id in u.conds)) continue;
        if (!STORY_CARRY.has(id)) { (cb.notes ||= []).push(c.name + ' entered the fight ' + id.replace(/_/g, ' ') + ' in the story: not carried as a combat condition (yours to rule).'); continue; }
        const r = applyCondition(cb, rng, null, u, id, undefined, undefined, { skipSave: true }); if (r) cb.log.push(u.name + ' carries it into the fight' + r + '.');
      } }
  } finally { bindGame(was); } }
}
/** And back out. After a fight Strain and held Outbursts reset (spec: Strain resets after combat). */
function magicOut(g: GameState, cb: Combat, afterFight: boolean) {
  g.story.mana = manaOf(cb); g.story.glyphs = cb.glyphs || []; g.story.zones = cb.zones || []; g.story.glyphMap = cb.map.id;
  g.story.glyphSeq = Math.max(g.story.glyphSeq || 0, cb.glyphSeq || 0);
  const m = (g.story.magic ||= {});
  for (const u of cb.units) if (u.charId) {
    const conds = afterFight ? {} : { ...(u.conds || {}) };
    m[u.charId] = { flux: u.mg?.flux || 0, strain: afterFight ? 0 : u.mg?.strain || 0, held: afterFight ? null : u.mg?.held || null, conds, shield: afterFight ? 0 : u.shield || 0, cast: afterFight ? false : !!u.mg?.cast,
      ...(!afterFight && u.mg && u.mg.freePumps != null ? { freePumps: u.mg.freePumps } : {}), ...(!afterFight && u.mg?.calmFight ? { calmFight: true } : {}), ...(!afterFight && u.mg?.calmTend ? { calmTend: true } : {}),
      ...(!afterFight && u.condBy && Object.keys(u.condBy).length ? { condBy: { ...u.condBy } } : {}) };
    // Shaken out of combat lasts the rest of the scene (spec: Conditions): a fight that ends with a PC Shaken carries it on.
    if (afterFight && (u.conds?.shaken ?? 0) > 0) { const c = g.characters[u.charId]; if (c && !storyConds(g, c).includes('shaken')) setStoryCond(g, c, 'shaken', 'scene'); } // a longer Shaken stays as it was
  }
}
/** A new overworld round is a turn for magic: glyphs and zones run down, held Outbursts grow, Strain eases, Burning
 * burns. Nothing happens (and nothing is logged) when there's no magic about. */
function storyMagicRound(g: GameState) {
  const live = (g.story.glyphs || []).length || (g.story.zones || []).length || (g.story.objects || []).some((o) => o.kind === 'sigil_wall') || Object.values(g.story.magic || {}).some((x) => x.strain || x.held || Object.keys(x.conds || {}).length || x.shield);
  if (!live || g.phase !== 'story') return;
  const cb = storyCb(g); cb.round = g.story.round;
  magicRoundTick(cb);
  // Rules 1.5: the round that ends is the area map's turn: the burn and stillness first, then the new turn's start.
  for (const u of cb.units) if (u.charId) { if (u.mg) magicTurnEnd(cb, g.rng, u); magicTurnStart(cb, g.rng, u); condTurnEnd(cb, u, g.rng); if (u.mg) u.mg.cast = false; }
  for (const u of cb.units) if (u.charId) unitToCharacter(g, u, false, true);
  magicOut(g, cb, false);
  g.story.objects = cb.objects; // RAISE walls crumble on the area map too
  storyFx(g, cb);
  for (const l of cb.log) push(g, { kind: 'system', text: l, act: true });
}
/** The overworld's throwaway fight keeps its presentation events in the story (renumbered, capped), so area-map
 * actions animate for everyone as fights do. */
function storyFx(g: GameState, cb: Combat) {
  if (!cb.fx?.length) return;
  const list = (g.story.fx ||= []);
  for (const e of cb.fx) list.push({ ...e, n: (g.story.fxSeq = (g.story.fxSeq || 0) + 1) });
  if (list.length > FX_CAP) list.splice(0, list.length - FX_CAP);
}
/** Learn a word, a school, a module or a tone (spec: The Magic panel). */
function teach(g: GameState, c: Character, m: { word?: string; school?: string; module?: string; tone?: string }, why: string): string {
  if (m.word) {
    const word = m.word.trim().toLowerCase(); // the Narrator may write the word as it is drawn (FIRE)
    if (!SIGIL[word]) return 'No such word.';
    const known = (c.sigils ||= []); if (known.includes(word)) return c.name + ' already knows ' + SIGIL[word].word + '.';
    if (known.length >= wordsKnownCap(c)) return c.name + ' knows ' + known.length + ' words, the most Brain Power allows (' + wordsKnownCap(c) + ').';
    known.push(word); push(g, { kind: 'system', text: c.name + ' learns the Sigil word ' + SIGIL[word].word + ' (' + why + ').' }); return '';
  }
  const k = (c.soulKnown ||= { schools: [], modules: [] });
  if (m.school) { if (!SCHOOL[m.school]) return 'No such school.'; if (!k.schools.includes(m.school)) { k.schools.push(m.school); push(g, { kind: 'system', text: c.name + ' learns the ' + SCHOOL[m.school].name + ' school of Outbursts (' + why + ').' }); } return ''; }
  if (m.module) { if (!MODULE[m.module]) return 'No such module.'; if (!k.modules.includes(m.module)) { k.modules.push(m.module); push(g, { kind: 'system', text: c.name + ' learns the Outburst module ' + MODULE[m.module].name + ' (' + why + ').' }); } return ''; }
  if (m.tone) { if (!TONE[m.tone] || m.tone === 'raw') return 'No such tone.'; const kt = (k.tones ||= []); if (!kt.includes(m.tone)) { kt.push(m.tone); push(g, { kind: 'system', text: c.name + ' learns the ' + TONE[m.tone].name + ' tone of Outbursts (' + why + ').' }); } return ''; }
  return 'Nothing to learn.';
}

/** The overworld as a throwaway fight state, so every combat rule (paths, sight, actions) runs unchanged. Units carry
 * each character's AP left this round; NPCs are 'foe' units (they block and can be targeted). Objects are the live list. */
export function storyCb(g: GameState): Combat {
  const map = zoneMap(g), scratch = { state: g.rng.state }, pos = positionsOf(g);
  const units = Object.values(g.characters).filter((c) => !c.dead && pos[c.id]).map((c) => { const u = unitFromCharacter(c, pos[c.id], scratch); u.ap = apLeft(g, c); u.heat = g.story.heat?.[c.id] || 0; u.jammed = !!g.story.jammed?.[c.id]; if (u.downed) u.saves = { ok: 0, fail: c.downedFails || 0 }; return u; });
  // Companions on the area map (a drone, a beast): tokens with their own AP this round.
  for (const c of Object.values(g.characters)) { const owner = units.find((x) => x.charId === c.id); if (!owner || !c.companions?.some((k) => COMPANION_ROUND_AP[k.kind] != null)) continue;
    const taken = new Set(units.map((x) => x.pos)); for (const d of companionUnits(null, c, owner, taken, scratch, map, pos)) { if (!pos[d.id] || COMPANION_ROUND_AP[d.companion!] == null) continue; d.pos = pos[d.id]; d.ap = g.story.ap?.[d.id] ?? COMPANION_ROUND_AP[d.companion!]; units.push(d); } }
  for (const n of npcsOf(g)) { const u = unitFromEnemy(n.id, n.name, n.tier, n.weapon, n.pos, scratch); if (n.portrait) u.img = n.portrait; if (n.hidden) u.hidden = true; units.push(u); }
  const cb = { name: 'overworld', overworld: true, map, units, order: units.map((u) => u.id), turn: 0, round: g.story.round, difficulty: 'standard', log: [], over: null, objects: storyObjects(g) } as Combat;
  magicIn(g, cb);
  // 'unit_built' {u, c, cb, world}: the area map's units are rebuilt every action, so items that change a unit for longer
  // than one action (inscribed armour, known words) put it back here (hooks gap I11). Fights use combat_start.
  { const was = bindGame(g); try { for (const u of units) if (u.charId) emitHook(cb, 'unit_built', { u, c: g.characters[u.charId], cb, world: true }); } finally { bindGame(was); } }
  return cb;
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
    // 'notice' {c, npc, range, dark, ignore}: ignore = this NPC doesn't treat them as an intruder, even next to them (hooks gap G2).
    const nc: any = emitStory(g, 'notice', { c, npc: n, range, dark, ignore: false, g }); range = Math.max(0, nc.range);
    if (nc.ignore) continue;
    const sees = d <= 1 || (d <= range && lineOfSight(cb, n.pos, at));
    if (!sees) continue;
    const key = n.id + '|' + c.id; if ((g.story.noticed ||= {})[key] === g.story.round) continue;
    g.story.noticed[key] = g.story.round;
    if (!stayHidden(g, c, n, d <= 1 ? 'steps right up to' : 'looks toward')) return;
  }
}
/** The Ingenuity check to stay hidden (spec: Overworld rounds): d20 + Ingenuity vs 10 + the enemy's notice. */
function stayHidden(g: GameState, c: Character, n: Npc, why: string): boolean {
  const sh: any = emitStory(g, 'stay_hidden', { c, npc: n, mod: mod(c.skills.ingenuity || 0) + songMod(g, c, 'ingenuity') + skillRollMod({ c }, 'ingenuity', { roll: 'stealth', tags: zoneTags(g) }).add, tn: 10 + (NOTICE[n.tier] ?? 0), g });
  // sh.auto 'success' | 'fail' settles it with no roll; 'stay_hidden_result' {c, npc, ok, die} may then change ok
  // (Every Lie Is a Door, Just the Repairman, Silent Partner: hooks gap B5/B6/G2).
  const auto = sh.auto as 'success' | 'fail' | undefined;
  const die = auto ? 0 : d20(g.rng), m = sh.mod, tn = sh.tn, ok0 = auto ? auto === 'success' : die === 20 || (die !== 1 && die + m >= tn);
  const sr: any = emitStory(g, 'stay_hidden_result', { c, npc: n, ok: ok0, die, auto: auto || null, labels: [] as string[], g }), ok = !!sr.ok;
  push(g, { kind: 'check', charId: c.id, ok, head: 'INGENUITY · STAY HIDDEN · ' + (auto ? 'AUTO' : 'd20 ' + die + ' ' + (m >= 0 ? '+' : '−') + Math.abs(m) + ' = ' + (die + m) + ' vs ' + tn) + (sr.labels.length ? ' · ' + sr.labels.join(', ') : '') + ' · ' + (ok ? '✓ SUCCESS' : '✗ FAILURE'),
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
  // A companion's own move on the area map (the drone, the beast): its AP, its token; nothing else it can do here (the
  // Narrator says what the drone sees; commanding the beast in the story is an Empathy check it calls). PROVISIONAL.
  if (a.unit) {
    const d = cb.units.find((x) => x.id === a.unit && x.companion && x.ctrl === c!.id); if (!d) fail('That isn\'t your companion, or it is gone.');
    const what = d!.companion === 'beast' ? 'beast' : d!.companion === 'twin' ? 'twin' : 'drone';
    if (a.act !== 'move') fail('On the area map the ' + what + ' only moves.');
    const map = zoneMap(g), k = a.to ? (/,/.test(a.to) ? a.to : keyOf(a.to, map)) : null;
    if (!k || !standable(map, k)) fail('Nothing can stand there.');
    const err = moveUnit(cb, d!, k!, undefined, 'move'); if (err) fail(err.replace(/^Needs/, 'The ' + what + ' needs'));
    positionsOf(g)[d!.id] = d!.pos; (g.story.ap ||= {})[d!.id] = Math.max(0, Math.round(d!.ap * 10) / 10);
    for (const l of cb.log) push(g, { kind: 'system', text: l, act: true, charId: c!.id });
    push(g, { kind: 'system', text: (what === 'twin' ? 'The twin (' + c!.name + '\'s) steps to ' : d!.name + ' (' + c!.name + '\'s) ' + (what === 'beast' ? 'pads to ' : 'flies to ')) + refOf(d!.pos) + '.', act: true, charId: c!.id });
    g.story.needs = true; return;
  }
  // Targets by id, or by name (the Narrator may name someone it placed this same turn).
  const tid = String(a.targetId || ''), tname = tid.toLowerCase();
  const target = tid ? cb.units.find((x) => x.id === tid || x.id === 'pc-' + tid) || cb.units.find((x) => x.name.toLowerCase() === tname && x.id !== u.id) || null : null;
  const before = u.ap; let err: string | null = null;
  if (a.act === 'move') {
    const map = zoneMap(g), k = a.to ? (/,/.test(a.to) ? a.to : keyOf(a.to, map)) : null;
    if (!k || !standable(map, k)) fail('Nobody can stand there.');
    const P = paths(cb, u.pos, u.id), tiles = P.dist[k!];
    if (tiles === undefined) fail('There\'s no way through to there: a wall, a closed door or someone is in the way.');
    // 'world_move_cost' {c, u, tiles, how, extra}: sneaking costs 1 AP a tile on top (an item may change that).
    const wm: any = emitStory(g, 'world_move_cost', { c, u, tiles, how: a.how || 'move', extra: a.how === 'sneak' ? tiles : 0, g });
    // The move is priced by moveUnit through 'move_cost' (Charge!, Into the Dark, Shadow Step discount it: hooks gap B9);
    // the sneak's extra comes after. A failure throws, and apply() keeps the state from before the action.
    const extra = Math.max(0, wm.extra), ap0 = u.ap;
    const from = u.pos; err = moveUnit(cb, u, k!, undefined, a.how === 'sprint' ? 'sprint' : 'move'); if (err) fail(err.replace(/^Needs (\d+(?:\.\d+)?) AP\.$/, (_m, n) => 'Needs ' + (+n + extra) + ' AP (' + ap0 + ' left).'));
    if (u.ap < extra && a.how !== 'sprint') fail('Needs ' + (Math.round((ap0 - u.ap + extra) * 10) / 10) + ' AP (' + ap0 + ' left).');
    u.ap -= extra;
    const route: string[] = []; for (let x = k!; x && x !== from; x = P.prev[x]) route.unshift(x);
    ((g.story.trail ||= {})[c!.id] ||= []).push(...(route.length ? [from, ...route] : [from, k!]));
    positionsOf(g)[c!.id] = u.pos;
    // Sneak: starting to sneak hides you; once spotted you stay seen until you move normally and start sneaking again.
    if (a.how === 'sneak') { const was = !!g.story.sneak?.[c!.id]; (g.story.sneak ||= {})[c!.id] = true; if (!was) (g.story.hidden ||= {})[c!.id] = true; }
    else { (g.story.sneak ||= {})[c!.id] = false; (g.story.hidden ||= {})[c!.id] = false; }
    if ((g.story.npcs || []).some((n) => n.hidden)) (g.story as any).sense = true; // lurkers get a look once the move is written back
  } else if (a.act === 'door') {
    const o = storyObjects(g).find((x) => x.id === a.objId && kindOf(x).door); if (!o) fail('No such door.');
    if (dist(u.pos, o!.pos) > 1) fail('Walk up to it first.'); if (o!.locked) fail('Locked. Examine it for a way in.');
    if (u.ap < 1) fail('Needs 1 AP.'); u.ap -= 1; o!.open = !o!.open; emitFx(cb, 'door', { unit: u.id, at: o!.pos, open: !!o!.open }); cb.log.push(c!.name + (o!.open ? ' opens ' : ' closes ') + 'the ' + o!.name.toLowerCase() + ' at ' + refOf(o!.pos) + '.');
  } else if (a.act === 'perk') {
    if (!a.id) fail('Pick a perk, trait or class move.');
    (cb as any).mods = a.mods || []; worldStrikeReq = null;
    // An object target (Dead Signal's device, a door): its id as the choice and its tile, unless the action named others.
    const obj = a.objId ? storyObjects(g).find((o) => o.id === a.objId) : null;
    err = runPerkAction({ u, c: c!, cb, g }, a.id!, { targetId: target ? target.id : a.targetId, tile: a.tile ? tileKey(g, a.tile) : obj ? obj.pos : undefined, choice: a.choice ?? (obj ? obj.id : undefined), text: a.text, npc: a.npc, actionId: a.actionId } as any, g.rng, 'world');
    delete (cb as any).mods;
    // The action struck an NPC token (Breaching Strike, Grapple…): the fight opens here, as an attack from the area map
    // does, and the action lands as its opening move, paid from the AP the character had.
    if (!err && worldStrikeReq) {
      const req: { targetId: string; ap: number; perform: (cbx: Combat, att: Combat['units'][number], tgt: Combat['units'][number]) => string | null } = worldStrikeReq; worldStrikeReq = null;
      const t = cb.units.find((x) => x.id === req.targetId);
      if (t && t.side === 'foe') { overworldAttack(g, cb, c!, u, t, 'melee', (cbx, att) => { const tt = cbx.units.find((x) => x.npcId === t.id); if (!tt) return 'They are gone.'; att.ap = Math.max(0, Math.round((att.ap - req.ap) * 10) / 10); return req.perform(cbx, att, tt); }); return; }
    }
  } else if (a.act === 'reload') err = reload(cb, u);
  else if (a.act === 'load') err = loadMagazine(cb, u);
  else if (a.act === 'clear') err = clearJam(cb, u);
  else if (a.act === 'repair') err = fieldRepair(cb, u);
  else if (a.act === 'prone') err = toggleProne(cb, u);
  else if (a.act === 'stim') { if (!target || target.side !== 'pc') fail('Pick an ally.'); err = useStim(cb, u, target!, c!, isMedicChar(c!)); }
  else if (a.act === 'analyze') { if (!target || target.side !== 'foe') fail('Pick someone to read.'); err = analyze(cb, u, target!); if (!err) { const n = npcsOf(g).find((x) => x.id === target!.id); if (n) n.analyzed = true; } }
  else if (a.act === 'attack') {
    // Anyone and anything is a target (spec: Anyone is a target).
    let t = target;
    const o = !t ? storyObjects(g).find((x) => !x.hidden && (x.id === (a.objId || tid) || (!!tname && x.name.toLowerCase() === tname))) || null : null;
    if (!t && o && o.dead) fail(o.name + ' is dead.');
    if (!t && o && isPersonObj(g, o)) t = (o.npcId && cb.units.find((x) => x.id === o.npcId)) || poiToNpc(g, cb, o);
    if (!t && o) {
      if (o.hp == null || o.hp <= 0) {
        // Something without HP: the shot is real (a round, heat, sight, range) and the Narrator rules what it does.
        // The mode the player chose counts: melee strikes with the weapon (or fists), aimed costs the aimed AP.
        const w = WEAPON[u.weapon], mode = a.mode || 'shot', melee = isMelee(w) || mode === 'melee', useW = melee && !isMelee(w) ? WEAPON.fists : w;
        const fx: any = (w as any).grants?.effect || {}, r = dist(u.pos, o.pos);
        const cost = !melee && mode === 'aimed' && fx.op === 'aimed_ap' ? fx.value : attackApCost(useW, melee ? 'melee' : mode === 'aimed' ? 'aimed' : 'shot');
        if (u.ap < cost) fail('Needs ' + cost + ' AP.');
        if (melee) { if (r > 1) fail('Out of melee reach: walk up to it.'); if (u.maxDur && useW === w) u.dur = Math.max(0, (u.dur ?? u.maxDur) - 1); } // a strike wears the weapon as in a fight
        else {
          if (u.jammed) fail('Weapon jammed: clear it (2 AP).');
          if (u.maxDur && (u.dur ?? 1) <= 0) fail('Broken: Field Repair first.');
          if ((w.properties || []).includes('requires_braced_or_prone') && !u.braced && !u.prone) fail('Brace it first (1 AP), or go prone.');
          if (w.magazine != null && u.ammo <= 0) fail('Empty: reload (2 AP).');
          if (!lineOfSight(cb, u.pos, o.pos)) fail('No line of sight.');
          if (Math.ceil(r / effectiveRange(w)) - 1 > 2) fail('Out of range.');
          if (w.magazine != null && !u.infiniteAmmo) u.ammo--; if (!u.infiniteAmmo) u.heat += 1;
          if ((w as any).heat_limit && !u.infiniteAmmo && u.heat >= (w as any).heat_limit) u.jammed = true;
          if (u.maxDur) u.dur = Math.max(0, (u.dur ?? u.maxDur) - 1 - (u.jammed ? 5 : 0));
        }
        u.ap -= cost; emitFx(cb, melee ? 'melee' : 'shot', { unit: u.id, target: null, from: u.pos, to: o.pos, weapon: useW.id, cat: useW.category, mode, hit: true, crit: false, fumble: false, dmg: 0, killed: false, object: true, ...(u.jammed ? { jam: true } : {}) });
        cb.log.push(c!.name + (melee ? ' strikes ' : mode === 'aimed' ? ' takes an aimed shot at ' : ' fires at ') + 'the ' + o.name.toLowerCase() + ' at ' + refOf(o.pos) + (melee ? '.' : ' (' + (w.magazine != null ? u.ammo + ' left in the ' + (w.name || 'weapon').toLowerCase() : 'loose round') + ')' + (u.jammed ? '; the weapon jams' : '') + '.'));
        g.story.needs = true;
      }
      else err = shootCover(cb, u, o.pos, c!);
    } else {
      if (!t || t.id === u.id || t.dead) fail('Pick someone else to attack.');
      if (t!.side === 'pc') err = allyShot(g, cb, c!, u, t!, a.mode || 'shot');
      else { overworldAttack(g, cb, c!, u, t!, a.mode || 'shot'); return; }
    }
  }
  else if (MAGIC_ACTS.includes(a.act)) {
    const tile = a.tile ? tileKey(g, a.tile) : undefined, aim = a.aim ? tileKey(g, a.aim) : undefined;
    // The action's toggles (Verse of War's "In verse"…) ride on the map the spell runs on, the fight's too.
    const run = (cbx: Combat, uu: Combat['units'][number], rng: Rng) => { (cbx as any).mods = a.mods || []; try { return performMagic(cbx, rng, uu, a, tile, aim, g); } finally { delete (cbx as any).mods; } };
    // A spell that would touch a person on the map starts a fight, as an attack does (spec: Overworld rounds).
    if (a.act === 'evoke' || a.act === 'release' || (a.act === 'outburst' && !(a.hold ?? !a.aim))) {
      // Check it would work at all (on a copy, without touching the dice), then see whether it aims at anyone on the map.
      const dry: Combat = JSON.parse(JSON.stringify(cb)), e0 = run(dry, dry.units.find((x) => x.id === u.id)!, { state: g.rng.state }); if (e0) fail(e0);
      const npc = (a.act === 'evoke' && tile ? evokeTargets(cb, u, tile, aim, evokeOptsOf(g, a)) : spellTargets(cb, u, a.act, tile, aim, a.design)).map((id) => cb.units.find((x) => x.id === id)!).find((x) => x && x.side === 'foe');
      if (npc) { overworldAttack(g, cb, c!, u, npc, 'shot', (cbx, att) => run(cbx, att, g.rng)); return; }
    }
    err = run(cb, u, g.rng);
  }
  else fail('Unknown action.');
  if (err) fail(err);
  // 'action_done' {u, a, cb, world: true}: after an area-map action, before it is written back (The Brightest Light's
  // double wear on the area map).
  { const was = bindGame(g); try { emitHook(cb, 'action_done', { u, a, cb, world: true }); } finally { bindGame(was); } }
  // Write back: AP, the character's state, objects (doors, traps), and the log as story lines.
  spendAp(g, c!, before - u.ap);
  for (const x of cb.units) if (x.charId) { unitToCharacter(g, x, false, true); (g.story.heat ||= {})[x.charId] = x.heat || 0; (g.story.jammed ||= {})[x.charId] = !!x.jammed; }
  for (const x of cb.units) if (x.companion && x.ctrl && g.story.positions?.[x.id] && !x.dead) g.story.positions[x.id] = x.pos; // a token pulled along (the twin follows its owner within 6)
  magicOut(g, cb, false);
  g.story.objects = cb.objects;
  storyFx(g, cb);
  for (const l of cb.log) push(g, { kind: 'system', text: l, act: true, charId: c!.id });
  if ((g.story as any).sense) { delete (g.story as any).sense; senseLurkers(g, 'moved', [c!]); }
  // A silent act (an item sets g.story.quiet: Dead Signal) triggers no notice check (hooks gap B12).
  if (!(g.story as any).quiet) noticeFor(g, c!); delete (g.story as any).quiet;
  closeRoundIfDone(g);
}

/** Field Repair on a squadmate whose body is a machine (Factory Made; perk-runtime A10): adjacent, Proficiency 3+, one of
 * your spare-parts charges, the Field Repair AP: +10 HP per your Proficiency point (as their own self-repair; not halved
 * by Plug: it isn't healing). PROVISIONAL, spec 14. */
function repairAlly(cb: Combat, u: Combat['units'][number], t: Combat['units'][number] | undefined): string | null {
  if (!t || t.side !== u.side || t.dead) return 'Pick a squadmate.';
  if (!holdersOf({ u: t }).some((h) => h.key === 'trait:factory_made')) return t.name + ' isn\'t a machine: stim them instead.';
  if (dist(u.pos, t.pos) > 1) return 'Walk up to them first.';
  if ((u.proficiency || 0) < 3) return 'Needs Proficiency 3.';
  if (!(u.parts || 0)) return 'No spare-parts charges.';
  if (t.hp >= t.maxHp) return t.name + ' is already whole.';
  const cost = actionAp({ u }, 'field_repair', 2).ap; if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  const was = t.hp; u.ap -= cost; u.parts = (u.parts || 0) - 1; t.hp = Math.min(t.maxHp, t.hp + 10 * (u.proficiency || 0)); if (t.downed && t.hp > 0) { t.downed = false; t.saves = { ok: 0, fail: 0 }; }
  emitFx(cb, 'repair', { unit: u.id, at: t.pos, dur: 1400 }); emitFx(cb, 'heal', { target: t.id, at: t.pos, amount: t.hp - was });
  cb.log.push(u.name + ' patches ' + t.name + '\'s chassis: +' + (t.hp - was) + ' HP (' + t.hp + '/' + t.maxHp + ').'); return null;
}
/** Can this character design Outbursts? A Vessel can't (K30: the charge lives in the body). The Magic panel hides the
 * design screen when this gives a reason. */
export function designBan(c: Character): string | null {
  return holdersOf({ c }).some((h) => h.key === 'class:vessel.vessel_hands') ? 'A Vessel designs no Outbursts: the charge lives in the body.' : null;
}
/** 'action_refuse' {u, a, cb, fail}: an item may refuse a shove or an Overwatch before it is done (First, Do No Harm;
 * perk-runtime E-H5). */
function refuseHook(cb: Combat, u: Combat['units'][number], a: Action) { const r: any = emitHook(cb, 'action_refuse', { u, a, cb, fail: null }); if (r.fail) fail(r.fail); }
let worldStrikeReq: { targetId: string; ap: number; perform: (cbx: Combat, att: Combat['units'][number], tgt: Combat['units'][number]) => string | null } | null = null;
/** For an item's area-map action that strikes an NPC token: once the action is done the fight opens on this map (as an
 * attack from the area map does: hidden, an ambush; seen, you act from round 2) and perform runs inside it on the
 * fight's own units as the opening move, after ap is paid. Call it from the action's run with the overworld target. */
export function strikeFromWorld(targetId: string, ap: number, perform: (cbx: Combat, att: Combat['units'][number], tgt: Combat['units'][number]) => string | null) { worldStrikeReq = { targetId, ap, perform }; }

/** Attacking from the overworld starts the fight on this map, everyone where they stand (spec: Overworld rounds).
 * Hidden (sneaking, unseen): an ambush; from the target's front the attacker must pass Ingenuity first. The fight opens
 * on the attacker's turn with the AP they have left. Seen: the attack still lands, but the attacker sits out round 1. */
function overworldAttack(g: GameState, cb: Combat, c: Character, u: Combat['units'][number], t: Combat['units'][number], mode: AttackMode, perform?: (cbx: Combat, att: Combat['units'][number]) => string | null) {
  if (!perform) { const pv = previewAttack(cb, u, t, mode); if (!pv.ok) fail(pv.why!); }
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
  // Lurking hostiles get one last look before the fight opens (Wind on the Skin, Skin Map, Sixth Sense); the rest start Hidden.
  senseLurkers(g, 'fight');
  const foes = [npc, ...npcsOf(g).filter((n) => n.side === 'hostile' && n !== npc)], stay = npcsOf(g).filter((n) => n.side !== 'hostile');
  const pos = positionsOf(g), apNow = apLeft(g, c);
  const pcs = Object.values(g.characters).filter((x) => !x.dead).map((x) => ({ c: x, pos: pos[x.id], comp: pos }));
  const tier = foes.some((n) => n.tier === 'boss') ? 'boss' : foes.some((n) => n.tier === 'elite') ? 'hard' : foes.length > 2 ? 'standard' : 'easy';
  const fightName = (hidden ? 'Ambush at ' : 'Fight at ') + refOf(npc.pos);
  g.combat = startCombat(fightName, zoneMap(g), pcs, foes.map((n) => ({ name: n.name, tier: n.tier, weapon: n.weapon, at: refOf(n.pos), hp: n.hp, kind: n.kind, tags: n.tags, caster: n.caster })), tier, g.rng, storyObjects(g)); magicIn(g, g.combat);
  const cbx = g.combat, seated = cbx.units.filter((x) => x.side === 'foe').length; g.story.npcs = [...stay, ...foes.slice(seated)];
  cbx.units.filter((x) => x.side === 'foe').forEach((x, i) => { const n = foes[i]; if (!n) return; x.npcId = n.id; x.img = n.portrait || x.img; if (n.analyzed) x.analyzedBy = u.id; if (n.hidden) { const l = hideUnit(cbx, x, 'lurking'); if (l) cbx.log.push(l.replace(/^ · /, '') + '.'); delete n.hidden; } });
  if (!wasHostile) cbx.noXp = true;
  const att = cbx.units.find((x) => x.charId === c.id)!, tgt = cbx.units.find((x) => x.npcId === npc.id)!;
  g.phase = 'combat'; g.story.await = 'none'; musicOf(g).fight++; syncSong(g);
  push(g, { kind: 'combat', text: 'Combat: ' + fightName + (hidden ? ' (' + c.name + ' strikes unseen)' : '') });
  // What each player said this overworld round carries into the fight it opens, as their round-1 line (Verse of War).
  for (const x of cbx.units) { const pc = x.charId ? g.characters[x.charId] : null, t = pc ? g.story.spoken?.[pc.owner] : null; if (pc && t) (cbx.notes ||= []).push(pc.name + ' (round 1): "' + String(t).slice(0, 400) + '"'); }
  if (hidden) { cbx.order = [att.id, ...cbx.order.filter((id) => id !== att.id)]; cbx.turn = 0; cbx.log.push(c.name + ' strikes from hiding: the fight opens on their turn.'); hideUnit(cbx, att, 'struck from hiding'); }
  // Everyone else still sneaking unseen starts the fight Hidden too (rules 1.3).
  for (const x of cbx.units) if (x.charId && x !== att && g.story.sneak?.[x.charId] && g.story.hidden?.[x.charId]) hideUnit(cbx, x, 'sneaking');
  if (!hidden) { att.waitRound = 2; cbx.log.push(c.name + ' attacks in the open and acts from round 2.'); }
  att.ap = apNow; if (perform) { const e = perform(cbx, att); if (e) cbx.log.push(c.name + ' can\'t: ' + e); } else resolveAttack(cbx, g.rng, att, tgt, mode, c);
  if (!hidden) { const cur = active(cbx); if (cur && cur.id === att.id) endTurn(cbx, g.rng); }
  if (hidden && silentTakedown(g, cbx, c, att, tgt)) return;
  checkOver(cbx); runEnemies(g);
}
/** Silent Kill on the area map (the Shade, K1): a killing ambush from Sneak that leaves you Hidden, with no other
 * hostile able to see you, doesn't open the fight: a silent takedown. The fight is unwound back to the area map (the
 * others stay tokens where they stood, the body is the Narrator's), the AP the blow cost is spent and you stay hidden.
 * With no hostile left at all the fight simply ends as won (checkOver). PROVISIONAL, spec 14. */
function silentTakedown(g: GameState, cbx: Combat, c: Character, att: Combat['units'][number], tgt: Combat['units'][number] | undefined): boolean {
  if (!tgt?.dead || !att.hidden || att.dead) return false;
  if (!holdersOf({ c }).some((h) => h.key === 'class:shade.silent_kill')) return false;
  const others = cbx.units.filter((v) => v.side === 'foe' && !v.dead && !v.downed && !v.surrendered);
  if (!others.length || others.some((v) => unitSees(cbx, v, att.pos))) return false;
  for (const x of cbx.units) if (x.charId) unitToCharacter(g, x, false, true);
  magicOut(g, cbx, false);
  const back = others.map((u) => { const was = npcsOf(g).find((n) => n.id === u.npcId); return { ...(was || {}), id: u.npcId || u.id, name: u.name, side: 'hostile', tier: u.tier || 'minion', weapon: u.weapon, pos: u.pos, portrait: u.img || undefined, ...(u.hp < u.maxHp ? { hp: u.hp } : {}) } as Npc; });
  const ids = new Set(back.map((n) => n.id)); g.story.npcs = [...(g.story.npcs || []).filter((n) => !ids.has(n.id) && n.id !== tgt.npcId), ...back];
  (g.story.ap ||= {})[c.id] = Math.max(0, att.ap); (g.story.sneak ||= {})[c.id] = true; (g.story.hidden ||= {})[c.id] = true;
  for (const l of cbx.log.slice(1)) push(g, { kind: 'system', text: l, act: true, charId: c.id });
  push(g, { kind: 'system', text: c.name + ' takes ' + tgt.name + ' down without a sound (Silent Kill): nobody else saw it, and no fight opens.', charId: c.id });
  g.combat = null; g.phase = 'story'; g.story.await = 'players'; musicAfterFight(g); g.story.needs = true;
  return true;
}

/** A point of interest who is a person (a portrait) becomes a token when attacked: neutral, a minion with fists unless
 * the campaign says more (spec: Anyone is a target; provisional). The point of interest stays where it is. */
function poiToNpc(g: GameState, cb: Combat, o: MapObject): Combat['units'][number] {
  const n: Npc = { id: 'n' + (++g.seq), name: o.name, side: 'neutral', tier: 'minion', weapon: 'fists', pos: o.pos, portrait: o.portrait || portraitFor(g, o.name) || undefined, facing: facingToward(o.pos, partyCentre(g)) };
  npcsOf(g).push(n); o.npcId = n.id;
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

/** Is this map object a person (spec: Anyone is a target)? A portrait of its own, or a campaign portrait by name. */
export const isPersonObj = (g: GameState, o: MapObject) => !!(o.portrait || portraitFor(g, o.name));

// ---------- rerolls and edits by unanimous vote (spec: Rerolls and edits) ----------
/** How many of the Narrator's latest turns can be rerolled (the host keeps a copy of the state before each). */
export const REROLLABLE_TURNS = 5;
export function votesOf(g: GameState) { return (g.votes ||= { suggestions: [], open: null, turns: [], seq: 0 }); }
const isNarration = (g: GameState, id: string) => g.story.entries.some((e) => e.id === id && e.kind === 'narration' && !e.rerolled);
function voteAction(g: GameState, a: Action, by: string) {
  const v = votesOf(g), clip = (s?: string) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (a.type === 'vote/suggest') {
    if (!g.players.some((p) => p.id === by)) fail('Join the room first.');
    if (!isNarration(g, a.entryId)) fail('That isn\'t one of the Narrator\'s lines.');
    if (a.kind === 'reroll' && !v.turns.includes(a.entryId)) fail('Only the Narrator\'s last ' + REROLLABLE_TURNS + ' turns can be rerolled.');
    if (v.suggestions.filter((x) => x.by === by).length >= 3) fail('You have three suggestions waiting already.');
    v.suggestions.push({ id: 'sg' + (++v.seq), by, kind: a.kind, entryId: a.entryId, note: clip(a.note) });
    return;
  }
  if (a.type === 'vote/dismiss') { if (!isHost(g, by)) fail('Only the host decides on suggestions.'); v.suggestions = v.suggestions.filter((x) => x.id !== a.id); return; }
  if (a.type === 'vote/start') {
    if (!isHost(g, by)) fail('Only the host starts a vote; suggest it to them.');
    if (v.open && v.open.status === 'open') fail('A vote is already under way.');
    if (g.narrator.busy) fail('Wait for the Narrator to finish.');
    if (!isNarration(g, a.entryId)) fail('That isn\'t one of the Narrator\'s lines.');
    if (a.kind === 'reroll' && !v.turns.includes(a.entryId)) fail('Only the Narrator\'s last ' + REROLLABLE_TURNS + ' turns can be rerolled.');
    const sg = a.suggestionId ? v.suggestions.find((x) => x.id === a.suggestionId) : null;
    const voters = g.players.filter((p) => p.online || p.id === g.hostId).map((p) => p.id);
    v.open = { id: 'v' + (++v.seq), kind: a.kind, entryId: a.entryId, note: clip(a.note ?? sg?.note), from: by, suggestedBy: sg?.by, undo: clip(a.undo), voters, yes: [by], no: [], status: 'open' };
    if (sg) v.suggestions = v.suggestions.filter((x) => x !== sg);
    settle(v.open);
    return;
  }
  if (a.type === 'vote/cast') {
    const o = v.open; if (!o || o.status !== 'open') fail('No vote is under way.');
    if (!o!.voters.includes(by)) fail('You weren\'t in the room when this vote started.');
    o!.yes = o!.yes.filter((x) => x !== by); o!.no = o!.no.filter((x) => x !== by);
    (a.yes ? o!.yes : o!.no).push(by);
    settle(o!);
    return;
  }
  if (a.type === 'vote/close') { if (!isHost(g, by)) fail('Host only.'); v.open = null; return; }
  if (a.type === 'narrator/rewrite') {
    if (!isHost(g, by)) fail('Only the Narrator (the host\'s client) rewrites.');
    const o = v.open; if (!o || o.status !== 'passed' || o.kind !== 'edit' || o.entryId !== a.entryId) fail('No edit was voted through for that line.');
    const e = g.story.entries.find((x) => x.id === a.entryId)!;
    if (a.refused) push(g, { kind: 'system', text: 'The Narrator kept its words: ' + clip(a.refused), ooc: true });
    else { if (!e.original) e.original = e.text; e.text = String(a.text || '').slice(0, 6000) || e.text; push(g, { kind: 'system', text: 'The room voted to reword the Narrator\'s line; it was rewritten.', ooc: true }); }
    v.open = null;
  }
}
/** Foreseen (perk-runtime G1): the holder asks to rewind to just before one of the Narrator's last turns. It is a room
 * reroll vote (unanimous: in co-op anyone can veto; solo it passes at once), carried out by the host's copy, so dice,
 * HP, loot and XP go back too; the use stays spent. Returns an error, or null when the vote is open (or passed). */
export function foreseeVote(g: GameState, c: Character, key: string, entryId: string | undefined, why: string): string | null {
  const v = votesOf(g);
  if (v.open && v.open.status === 'open') return 'A vote is already under way.';
  if (g.narrator.busy) return 'Wait for the Narrator to finish.';
  const id = entryId && v.turns.includes(entryId) ? entryId : v.turns[v.turns.length - 1];
  if (!id || !isNarration(g, id)) return 'There is no Narrator turn to go back to.';
  const voters = g.players.filter((p) => p.online || p.id === g.hostId).map((p) => p.id);
  const note = 'Foreseen: ' + c.name + ' has seen how this goes wrong' + (why ? ' ("' + why.slice(0, 160) + '")' : '') + '. Show in a few lines what would have happened, then play the moment again and let ' + c.name + ' choose anew.';
  v.open = { id: 'v' + (++v.seq), kind: 'reroll', entryId: id, note, from: c.owner, voters, yes: [c.owner], no: [], status: 'open', foresee: { charId: c.id, key } };
  settle(v.open);
  push(g, { kind: 'system', text: c.name + ' has foreseen it (Foreseen): the room votes to go back to before the Narrator\'s turn.', ooc: true });
  return null;
}
/** Unanimous: one no fails it at once; every voter's yes passes it. */
function settle(o: Vote) { if (o.no.length) o.status = 'failed'; else if (o.voters.every((p) => o.yes.includes(p))) o.status = 'passed'; }

/**
 * A reroll the room voted for (spec: Rerolls and edits): the game goes back to the copy the host kept from just before
 * that Narrator turn, so everything the turn did, and everything after it, is undone, dice included. The Narrator is
 * asked again (its work restored) with the players' note. The old turn stays in the log, greyed, and is never sent to
 * the Narrator. Costs are kept; the version moves forward so every copy accepts the result.
 */
export function rerollFrom(current: GameState, before: GameState, note: string): GameState {
  const g: GameState = JSON.parse(JSON.stringify(before));
  const v = votesOf(current), o = v.open!;
  const old = current.story.entries.findIndex((e) => e.id === o.entryId);
  const dropped = old >= 0 ? current.story.entries.slice(old).filter((e) => e.kind === 'narration' && !e.ooc).map((e) => ({ ...e, id: e.id + '-r' + v.seq, rerolled: true, ooc: true })) : [];
  g.story.entries.push(...dropped);
  g.v = current.v + 1; g.seq = Math.max(g.seq, current.seq);
  g.narrator = { ...g.narrator, busy: false, error: null, usage: current.narrator.usage };
  g.players = current.players; g.votes = { ...votesOf(current), open: null, turns: votesOf(g).turns.filter((t) => g.story.entries.some((e) => e.id === t && !e.rerolled)) };
  if (g.story.work) g.story.work = { ...g.story.work, redo: note || 'Tell it differently.' };
  // A Foreseen rewind keeps its once-a-session use spent (the copy is from before it was used).
  if (o.foresee) { const was = current.characters[o.foresee.charId], now = g.characters[o.foresee.charId]; if (was && now) { const u = (now.uses ||= {}); for (const [k, cell] of Object.entries(was.uses || {})) if (k.startsWith(o.foresee.key)) u[k] = { ...cell }; } }
  g.story.entries.push({ id: 'e' + (++g.seq), kind: 'system', text: 'The room voted to reroll the Narrator\'s turn' + (note ? ': "' + note + '"' : '') + '. Everything since it is undone.', ooc: true });
  return g;
}

// ---------- the Proving Ground (practice mode) ----------
// Waves of drill units on one arena, with infinite retries, and a tools panel for everything the engine owns:
// gear, class, level, skills, magic, enemies, the enemy AI, the mana meter. No Narrator is ever called (nothing sets
// story.work, and every Narrator and story action is refused), no XP, no lasting injuries or deaths.
// Two states (Leon, 7 Nov 2026: "spawn people in a neutral state with the spawner active so they can gear up"):
//  · gearing up: phase 'story' on the Proving Ground map, no fight. The squad stands on the area map, the wave's drill
//    units stand idle where they were placed, gear and magic change freely, movement costs nothing. The fight starts
//    from here: Start the fight (sandbox/fight), an attack or a spell on one of them (world/act), Next wave or Retry.
//  · fighting: phase 'combat'. When it ends (won, lost, or stopped by the host) the Proving Ground is gearing up again;
//    the finished fight stays in g.combat (over) so the combat screen can show its last blows and the wave card.
// Leaving restores the room's characters, campaign, story and memory as they were.

/** Proving Ground state. `saved` is the room before it began (host only: views carry an empty copy). */
export interface Sandbox {
  /** ready: gearing up (sandboxNext is this wave); fighting; cleared / fallen: the last fight's result, gearing up again. */
  wave: number; best: number; attempt: number; ai: boolean;
  /** Endless waves: after a cleared wave the next one comes by itself after a short pause (the host's client sends sandbox/wave). */
  auto: boolean;
  state: 'ready' | 'fighting' | 'cleared' | 'fallen';
  /** Fights begun so far (the client keys its WAVE banner and the wave card on it). */
  fights?: number;
  /** The wave the last fight was (a fight on the same wave again is a new attempt). */
  last?: number;
  /** An advanced class picked in the tools (by character): the engine plays its first parent (advanced moves are not engine-run yet). */
  advanced: Record<string, string>;
  /** Test characters made for the Proving Ground: removed when it ends. */
  temp: string[];
  /** The mana meter when this wave began (Retry puts it back). */
  waveMana: number;
  spawned: number;
  saved: { characters: Record<string, Character>; campaign: Campaign | null; story: any; music: any; memory?: any; archive?: number;
    /** The room's players before it began (multiplayer: sandbox/end puts the roster back). Old saves: none. */
    players?: Player[] };
  // Multiplayer (see the "Proving Ground multiplayer" block at the end of this file). All optional: old saves load.
  /** Opened from the title (not from a room): leaving closes the room. */
  standalone?: boolean;
  /** Co-op waves, or a team fight (players against players, no drill units). */
  mode?: 'coop' | 'teams';
  /** Everyone can use the field tools (spawn, clear, place and jump waves, the mana meter). Off by default. */
  spawnAll?: boolean;
  /** Guests may Retry a fallen wave (on by default). */
  guestRetry?: boolean;
  /** READY, by player id (cleared when a fight begins). */
  ready?: Record<string, boolean>;
  /** Team fight: each player's team (A by default). */
  team?: Record<string, 'A' | 'B'>;
  /** Best wave cleared, by player id; team-fight wins, by player id. */
  bestBy?: Record<string, number>; wins?: Record<string, number>;
  /** Players the host removed (they don't come back with the room's roster). */
  kicked?: string[];
  /** The wave the tools placed on the map and the party size it was built for (re-placed when the party changes). */
  placed?: { wave: number; party: number } | null;
  /** The last team fight's winner. */
  lastWin?: 'A' | 'B';
}
export type MagicKit = 'both' | 'sigil' | 'soul';
export type SandboxAction =
  | { type: 'sandbox/start'; archetype?: string; kit?: string; standalone?: boolean } | { type: 'sandbox/end' }
  | SandboxMpAction
  | { type: 'sandbox/fight' } | { type: 'sandbox/stage'; wave?: number } | { type: 'sandbox/stop' }
  | { type: 'sandbox/wave'; wave?: number } | { type: 'sandbox/retry'; restart?: boolean }
  | { type: 'sandbox/give'; charId: string; item: string; qty?: number; rarity?: Rarity; equip?: boolean }
  | { type: 'sandbox/equip'; charId: string; idx: number; to: 'main' | 'off' | 'worn' | 'mod' } | { type: 'sandbox/unequip'; charId: string; slot: string }
  | { type: 'sandbox/drop'; charId: string; idx: number } | { type: 'sandbox/armour'; charId: string; armourClass: number }
  | { type: 'sandbox/kit'; charId: string; kind?: MagicKit }
  | { type: 'sandbox/class'; charId: string; classId: string | null; rank?: number }
  | { type: 'sandbox/level'; charId: string; level: number } | { type: 'sandbox/skill'; charId: string; skill: string; points: number }
  | { type: 'sandbox/perk'; charId: string; perk: string; tier?: 'I' | 'II' | null } | { type: 'sandbox/trait'; charId: string; trait: string; on?: boolean }
  | { type: 'sandbox/refill'; charId?: string }
  | { type: 'sandbox/learn'; charId: string; word?: string; school?: string; module?: string; tone?: string }
  | { type: 'sandbox/design'; charId: string; design: OutburstDesign } | { type: 'sandbox/forget'; charId: string; word?: string; designId?: string }
  | { type: 'sandbox/spawn'; tier: string; weapon: string; at: string; name?: string; caster?: string } | { type: 'sandbox/clear' }
  | { type: 'sandbox/ai'; on: boolean } | { type: 'sandbox/auto'; on: boolean } | { type: 'sandbox/mana'; value: number };

/** Actions with no place in the Proving Ground: the Narrator's, the story's, the room's start. */
const SANDBOX_REFUSED = /^(narrator\/|session\/start|story\/|poi\/|world\/|voice\/|check\/|overreach\/|vote\/|campaign\/)/;
/** The area map's own actions, which work while gearing up (moving, doors, attacking or casting on a drill unit). */
const SANDBOX_STORY = /^(world\/act|story\/(move|door|focus|unfocus))$/;
export const PROVING_GROUND = provingJ as unknown as Campaign;
/** Drill units by tier: their names and the weapons each wave cycles through. */
export const SANDBOX_TIERS: Record<string, { name: string; weapons: string[] }> = {
  minion: { name: 'Drill drone', weapons: ['service_pistol', 'combat_knife', 'decrkm_smg', 'lever_carbine'] },
  soldier: { name: 'Sparring trooper', weapons: ['hellraiser_service_rifle', 'lumeri_scattergun', 'legion_pdw', 'sabre'] },
  elite: { name: 'Range warden', weapons: ['legion_bullpup', 'brigade_auto_shotgun', 'ccec_marksman_rifle', 'war_axe'] },
  boss: { name: 'Proving champion', weapons: ['hellraiser_lmg', 'adamantile_greatsword'] },
};
/** Advanced classes (rules 1.2): the engine knows them by id for the tools; base classes are in CLASS. */
/** A Medic, or an advanced class with Medic as a parent (the 1 AP stim: hooks gap I14). */
const isMedicChar = (c: Character) => c.classId === 'medic' || (!!c.advancedClass && !!ADVANCED_CLASSES.find((x) => x.id === c.advancedClass)?.parents.includes('medic'));
export const ADVANCED_CLASSES: { id: string; name: string; parents: string[]; summary?: string }[] = ((classesJ as any).advanced || []).map((x: any) => ({ id: x.id, name: x.name, parents: x.parents || [], summary: x.summary }));
const TIER_COST: Record<string, number> = { minion: 1, soldier: 2, elite: 4, boss: 8 };
/** Wave n's drill units (deterministic, so a wave can be replayed): a point budget of 2 + 1.5n; soldiers from wave 2,
 * elites from wave 4, a champion every 5th wave; at most 8. Provisional: tuned by play.
 * party: the players with a fighter; the budget and the soldier and elite caps take × (0.6 + 0.4 × party) (multiplayer,
 * provisional; 1 player: × 1, the solo waves). */
export function sandboxWave(n: number, party = 1): { name: string; tier: string; weapon: string; caster?: string }[] {
  n = Math.max(1, Math.floor(n));
  const scale = sandboxScale(party);
  let pts = Math.floor((2 + Math.floor(n * 1.5)) * scale); const tiers: string[] = [];
  if (n % 5 === 0) for (let i = 0; i < Math.min(2, n / 5) && pts >= TIER_COST.boss; i++) { tiers.push('boss'); pts -= TIER_COST.boss; }
  const caps: [string, number][] = [['elite', n >= 4 ? Math.floor(n / 4 * scale) : 0], ['soldier', n >= 2 ? Math.ceil(n / 2 * scale) : 0]];
  for (const [t, cap] of caps) for (let i = 0; i < cap && pts > TIER_COST[t] && tiers.length < 7; i++) { tiers.push(t); pts -= TIER_COST[t]; }
  while (pts > 0 && tiers.length < 8) { tiers.push('minion'); pts--; }
  if (!tiers.length) tiers.push('minion');
  const count: Record<string, number> = {};
  const out: { name: string; tier: string; weapon: string; caster?: string }[] = tiers.map((t) => { const i = (count[t] = (count[t] || 0) + 1), T = SANDBOX_TIERS[t]; return { name: T.name + ' ' + i, tier: t, weapon: T.weapons[(i - 1 + n) % T.weapons.length] }; });
  return sandboxCasters(n, out);
}
/** Sigil casters in the wave pool (rules 1.4; provisional): wave 2 and every third wave after it, the first drill drone is a
 * Sigil novice; from wave 3, on odd waves, the first sparring trooper is a Sigil adept; from wave 6, on even waves, the
 * first range warden is a Sigil warden; from wave 10, on every champion wave (every 5th), the first Proving champion is
 * a Sigil magister (item 491). enemies.json `casters`. Same tier and points; deterministic. */
function sandboxCasters(n: number, wave: { name: string; tier: string; weapon: string; caster?: string }[]) {
  const swap = (tier: string, id: string) => { const f = wave.find((x) => x.tier === tier && !x.caster), c = CASTER[id]; if (!f || !c || c.tier !== tier) return; f.caster = id; f.weapon = c.weapon; f.name = c.name + ' ' + (wave.filter((x) => x.caster === id).length); };
  if (n >= 2 && n % 3 === 2) swap('minion', 'sigil_novice');
  if (n >= 3 && n % 2 === 1) swap('soldier', 'sigil_adept');
  if (n >= 6 && n % 2 === 0) swap('elite', 'sigil_warden');
  if (n >= 10 && n % 5 === 0) swap('boss', 'sigil_magister');
  // Soul casters (rules 1.5, ai-soul.ts; provisional): from wave 4, on even waves, the first sparring trooper is a Heart
  // adept; from wave 7, on odd waves that aren't champion waves, the first range warden is a Heartfire elite; from wave 5, on every champion wave,
  // the first Proving champion the Sigil magister didn't take is a Heart sovereign. enemies.json soul_casters.
  const heart = (tier: string, id: string) => { const f = wave.find((x) => x.tier === tier && !x.caster), c = HEART_CASTER[id]; if (!f || !c || c.tier !== tier) return; f.caster = id; f.weapon = c.weapon; f.name = c.name + ' ' + (wave.filter((x) => x.caster === id).length); };
  if (n >= 4 && n % 2 === 0) heart('soldier', 'heart_adept');
  if (n >= 7 && n % 2 === 1 && n % 5 !== 0) heart('elite', 'heartfire_elite');
  if (n >= 5 && n % 5 === 0) heart('boss', 'heart_sovereign');
  return wave;
}
/** The wave the next fight is: the one after a cleared wave, else the current one (a fallen wave is fought again). */
export const sandboxNext = (sb: Sandbox) => (sb.state === 'cleared' ? Math.min(99, sb.wave + 1) : sb.wave);
/** Gearing up: the Proving Ground is open and no fight is running. */
export const sandboxGearingUp = (g: GameState) => !!g.sandbox && g.phase === 'story';
/** What the magic kit gives (sandbox/kit): the foci, cores, and enough to cast at once. */
export const MAGIC_KIT = { words: ['fire', 'seek', 'spread', 'condense', 'ward'], schools: ['damage', 'buff'], designs: [{ name: 'Soul Bolt', school: 'damage' }, { name: 'Soul Mend', school: 'buff' }] };

const sbOf = (g: GameState): Sandbox => g.sandbox || fail('The Proving Ground is not open.');
/** The fight that is running (never the finished one kept for the combat screen while gearing up). */
const liveFight = (g: GameState): Combat | null => (g.phase === 'combat' && g.combat && !g.combat.over ? g.combat : null);
/** What a fighter keeps when the tools rebuild it from its character (everything the fight itself changed). */
const SB_KEEP = ['hp', 'ap', 'bank', 'heat', 'jammed', 'shotsThisTurn', 'downed', 'dead', 'saves', 'stunnedNext', 'kills', 'injuries', 'bleed', 'dazedNext',
  'prone', 'braced', 'overwatch', 'reactedRound', 'conds', 'shield', 'moved', 'firstShotDone', 'waitRound', 'analyzedBy', 'weakPoint', 'song', 'init',
  'condBy', 'condArg', 'condFresh', 'hidden', 'hideEntry', 'ambushUsed', 'reactUsed', 'owShots', 'firstShotTurn', 'sprinted', 'attackedTurn', 'res', 'prayedRound', 'uses', 'ps', 'armed', 'apNext', 'apDebt', 'apGained', 'apTurnTotal', 'lastHitBy', 'damagedBy', 'throwables', 'ammoType', 'magTypes'] as const;

/** Rebuild a character's fighter after the tools changed the character. mode 'keep' carries the fight's state (HP,
 * AP, stance, conditions, Flux, Strain, a held Outburst); 'refill' starts it fresh where it stands (AP full on its turn). */
function sbRebuild(g: GameState, c: Character, mode: 'keep' | 'refill') {
  const cb = liveFight(g); if (!cb) return;
  const i = cb.units.findIndex((u) => u.charId === c.id); if (i < 0) return;
  const old = cb.units[i], u = unitFromCharacter(c, old.pos, { state: g.rng.state });
  u.init = old.init;
  if (mode === 'keep') {
    for (const k of SB_KEEP) if (old[k] !== undefined) (u as any)[k] = JSON.parse(JSON.stringify(old[k]));
    if (old.offWeapon && old.offWeapon === u.offWeapon) u.offAmmo = old.offAmmo;
    if (old.mg && u.mg) { u.mg.flux = old.mg.flux; u.mg.strain = old.mg.strain; u.mg.held = old.mg.held; u.mg.cast = old.mg.cast; u.mg.lockRound = old.mg.lockRound; }
    if (u.conds?.slowed) { u.baseMove = u.movement; u.movement /= 2; }
    if (u.conds?.blinded) { u.baseVision = u.vision || 12; u.vision = 1; }
    if (u.conds?.guarded) u.def += 2;
    u.hp = Math.min(u.hp, u.maxHp);
  } else {
    u.ap = active(cb)?.id === old.id ? Math.max(old.ap, 6) : old.ap;
    u.waitRound = old.waitRound;
  }
  cb.units[i] = u; syncSong(g);
}
/** Change a character in the Proving Ground: in a fight its fighter's state is written onto it first, then rebuilt from it. */
function sbChange(g: GameState, c: Character, fn: () => void, mode: 'keep' | 'refill' = 'keep') {
  const u = liveFight(g)?.units.find((x) => x.charId === c.id);
  if (u) unitToCharacter(g, u, false);
  fn();
  sbRebuild(g, c, mode);
}
/** Levelling up mid-fight in the Proving Ground: the fighter takes the new numbers and keeps everything else. */
export function sandboxResync(g: GameState, charId: string) { const c = g.characters[charId]; if (c && liveFight(g)) sbChange(g, c, () => {}); }

/** Full HP, no injuries, every magazine full, stims, MP, the Evoker's charge and cores, a mended weapon. */
function sbRefill(c: Character) {
  c.dead = false; c.hp = maxHp(c); c.injuries = []; c.downedFails = 0;
  c.loaded = magazineSize(c.weapon, c.weaponState?.mods) ?? 0;
  const pack = packOf(c).map((it) => (it.mags && it.weapon ? { ...it, mags: it.mags.map(() => magazineSize(it.weapon!) ?? 0) } : { ...it }));
  const w = WEAPON[c.weapon];
  if (w?.magazine != null && w.reload !== 'loose' && !pack.some((it) => it.weapon === c.weapon && it.mags)) pack.push(magsOf(c.weapon, 3));
  if (w?.ammo) { const r = pack.find((it) => it.calibre === w.ammo); const want = 3 * (w.magazine || 6); if (r) r.qty = Math.max(r.qty, want); else pack.push(roundsOf(w.ammo, want)); }
  if (hasEvoker(c)) { c.evoCharge = CORE_CHARGE; const core = pack.find((it) => (it.item || it.id) === 'standard_core'); if (core) core.qty = Math.max(core.qty, 4); else pack.push({ id: 'standard_core', item: 'standard_core', name: ITEM.standard_core?.name || 'Standard mana core', qty: 4, kind: 'ammo' }); }
  c.pack = pack;
  if (hasEmanator(c)) c.mp = maxMp(c);
  c.stims = Math.max(c.stims, 3);
  if (c.weaponState?.dur != null) c.weaponState = { ...c.weaponState, dur: maxDurOf(c.weapon, c.weaponState.rarity) };
}
/** Set a skill, raising its Attribute and Core to fit (the Proving Ground ignores budgets, never the tree's caps). */
function sbSetSkill(c: Character, id: string, p: number) {
  const sk = SKILL[id]; if (!sk) fail('Unknown skill.');
  p = Math.max(0, Math.min(10, Math.round(p)));
  c.skills = { ...c.skills, [id]: p };
  if ((c.attrs[sk.attribute] || 1) < p) c.attrs = { ...c.attrs, [sk.attribute]: p };
  const core = sk.core as keyof Character['cores']; if ((c.cores[core] || 1) < (c.attrs[sk.attribute] || 1)) c.cores = { ...c.cores, [core]: c.attrs[sk.attribute] };
  grantAutomaticPerks(c);
}
/** Raise a class's signature skills, evenly, until their total reaches `total`. */
function sbRaiseSignature(c: Character, classId: string, total: number) {
  const sig = CLASS[classId]?.signature || [];
  for (let guard = 0; guard < 40; guard++) {
    const now = sig.reduce((t, s) => t + (c.skills[s] || 0), 0); if (now >= total) return;
    const low = [...sig].sort((a, b) => (c.skills[a] || 0) - (c.skills[b] || 0))[0]; if ((c.skills[low] || 0) >= 10) return;
    sbSetSkill(c, low, (c.skills[low] || 0) + 1);
  }
}
/** Put an item or weapon in the pack (weapons come with three magazines and loose rounds). Returns its pack index. */
function sbGive(c: Character, item: string, qty: number, rarity: Rarity): number {
  const pack = packOf(c).map((x) => ({ ...x })), n = Math.max(1, Math.min(20, Math.round(qty || 1)));
  if (WEAPON[item]) {
    const w = WEAPON[item];
    for (let i = 0; i < Math.min(n, 3); i++) pack.push({ id: item, name: w.name, qty: 1, kind: 'weapon', weapon: item, rarity, ...(rarity !== 'standard' ? { dur: maxDurOf(item, rarity) } : {}) });
    const at = pack.length - 1;
    if (w.magazine != null && w.reload !== 'loose' && !pack.some((it) => it.weapon === item && it.mags)) pack.push(magsOf(item, 3));
    if (w.ammo) { const want = 3 * (w.magazine || 6), r = pack.find((it) => it.calibre === w.ammo); if (r) r.qty = Math.max(r.qty, want); else pack.push(roundsOf(w.ammo, want)); }
    c.pack = pack; collectGuns(c, Array(Math.min(n, 3)).fill(item)); // Gun Nut's collection (item 369)
    return at;
  }
  if (item === 'stim_injector') { c.stims += n; c.pack = pack; return -1; }
  const def = ITEM[item] as any; if (!def) fail('No such item.');
  const kind: PackItem['kind'] = def.category === 'focus' ? 'focus' : item === 'standard_core' ? 'ammo' : def.category === 'consumable' ? 'med' : def.category === 'food' ? 'food' : 'tool';
  const ex = pack.findIndex((x) => (x.item || x.id) === item && !x.rarity);
  if (ex >= 0 && kind !== 'focus') { pack[ex].qty += n; c.pack = pack; return ex; }
  pack.push({ id: item, item, name: def.name, qty: n, kind }); c.pack = pack; return pack.length - 1;
}
/** Equip from the pack, in a fight too: a weapon taken in hand comes loaded. */
function sbEquip(c: Character, idx: number, to: 'main' | 'off' | 'worn' | 'mod'): string | null {
  const it = packOf(c)[idx]; if (!it) return 'Nothing there.';
  const err = to === 'mod' ? fitMod(c, idx) : equip(c, idx, to); if (err) return err;
  if (to === 'main') c.loaded = magazineSize(c.weapon, c.weaponState?.mods) ?? 0;
  return null;
}
/** Take something off: the main hand too here (the weapon goes to the pack and the hands are empty: fists). */
function sbUnequip(c: Character, slot: string): string | null {
  if (slot !== 'main') return unequip(c, slot);
  if (c.weapon === 'fists' || !WEAPON[c.weapon]) return 'Your hands are already empty.';
  const st = c.weaponState || {};
  c.pack = [...packOf(c).map((x) => ({ ...x })), { id: c.weapon, name: st.name || WEAPON[c.weapon].name, qty: 1, kind: 'weapon', weapon: c.weapon, ...(st.rarity ? { rarity: st.rarity } : {}), ...(st.dur != null ? { dur: st.dur } : {}), ...(st.mods ? { mods: st.mods } : {}) }];
  c.weapon = 'fists'; c.weaponState = {}; c.loaded = 0;
  return null;
}
/** The magic kit: an Evoker in the off hand (where it can go) with cores and a few words, an Emanator carried with full MP
 * and two ready designs, so Sigils and Outbursts can be tried at once. */
function sbKit(g: GameState, c: Character, kind: MagicKit): string[] {
  const got: string[] = [];
  const learn = (m: { word?: string; school?: string }) => {
    if (m.word && SIGIL[m.word] && !(c.sigils ||= []).includes(m.word)) { c.sigils.push(m.word); got.push(SIGIL[m.word].word); }
    const k = (c.soulKnown ||= { schools: [], modules: [] });
    if (m.school && SCHOOL[m.school] && !k.schools.includes(m.school)) { k.schools.push(m.school); got.push(SCHOOL[m.school].name + ' (school)'); }
  };
  if (kind !== 'soul') {
    if (!hasEvoker(c)) {
      const at = sbGive(c, 'evoker', 1, 'standard'); got.push('an Evoker');
      // In the off hand where it fits (a two-handed weapon or a shield there keeps it in the pack: carried is enough).
      if (!c.offHand && (WEAPON[c.weapon] as any)?.hands !== '2H' && !equip(c, at, 'off')) got[got.length - 1] += ' (off hand)';
    }
    sbGive(c, 'standard_core', 4, 'standard'); c.evoCharge = CORE_CHARGE; got.push('4 mana cores');
    for (const w of MAGIC_KIT.words) learn({ word: w });
  }
  if (kind !== 'sigil') {
    if (!hasEmanator(c)) { sbGive(c, 'emanator', 1, 'standard'); got.push('an Emanator'); }
    c.mp = maxMp(c);
    for (const s of MAGIC_KIT.schools) learn({ school: s });
    const list = (c.outbursts ||= []);
    for (const d of MAGIC_KIT.designs) if (SCHOOL[d.school] && !list.some((x) => x.school === d.school && !x.modules.length) && list.length < 8) { list.push({ id: 'o' + (++g.seq), name: d.name, school: d.school, modules: [] }); got.push(d.name); }
  }
  return got;
}
/** A line in the fight's log, or (gearing up) in the story stream. */
const sbLog = (g: GameState, t: string) => { const cb = liveFight(g); if (cb) cb.log.push('⚙ ' + t); else push(g, { kind: 'system', text: '⚙ ' + t, ooc: true }); };
/** The fighters' state written back onto their characters (nobody stays dead or down). */
function sbCollect(g: GameState) {
  const cb = g.combat; if (!cb) return;
  for (const u of cb.units) if (u.charId) unitToCharacter(g, u, false);
  magicOut(g, cb, true);
  for (const c of Object.values(g.characters)) { c.dead = false; if (c.hp <= 0) c.hp = 1; c.downedFails = 0; c.injuries = []; }
}
/** A fight on wave n begins: a new attempt when the last fight was the same wave (or it is a retry). */
function sbAttempt(sb: Sandbox, n: number, retry = false) { sb.attempt = retry || sb.last === n ? sb.attempt + 1 : 1; sb.last = n; }
/** Wave n's drill units stand idle on the map, where enemies start (replacing any already there). */
function sbPlace(g: GameState, n: number) {
  const sb = sbOf(g), map = zoneMap(g), pos = positionsOf(g), centre = partyCentre(g), seen: Record<string, number> = {};
  const taken = new Set<string>([...Object.values(pos), ...storyObjects(g).filter(blocksMove).map((o) => o.pos)]);
  const free = (k: string) => standable(map, k) && !taken.has(k);
  const anyFree = () => { for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (free(x + ',' + y)) return x + ',' + y; return null; };
  sb.placed = { wave: n, party: sbParty(g) };
  g.story.npcs = sandboxWave(n, sb.placed.party).map((f) => {
    const at = map.foeStart.find(free) || anyFree() || map.foeStart[0]; taken.add(at);
    return { id: 'foe-s' + (++sb.spawned), name: f.name, side: 'hostile', tier: f.tier, weapon: f.weapon, pos: at, portrait: portraitFor(g, f.name, seen) || undefined, facing: facingToward(at, centre), ...(f.caster ? { caster: f.caster } : {}) } as Npc;
  });
}
/** Begin a fight on the Proving Ground map: the squad where it stands (pos), these foes, everyone on the fight's clock. */
function sbBegin(g: GameState, n: number, foes: { name: string; tier: string; weapon: string; at?: string; hp?: number; npc?: Npc; caster?: string }[], pos: Record<string, string>, objects?: MapObject[]) {
  const sb = sbOf(g), wasLive = !!liveFight(g), map = zoneMap(g);
  const pcs = Object.values(g.characters).filter((c) => !c.dead).map((c) => ({ c, pos: pos[c.id] }));
  if (!pcs.length) fail('Lock in a character first.');
  const cb = startCombat('Proving Ground · Wave ' + n, map, pcs, foes, n % 5 === 0 ? 'boss' : n >= 4 ? 'hard' : 'standard', g.rng, objects);
  magicIn(g, cb);
  cb.noXp = true;
  const seated = cb.units.filter((u) => u.side === 'foe');
  cb.log.unshift('WAVE ' + n + (sb.attempt > 1 ? ' · attempt ' + sb.attempt : '') + ' · ' + seated.length + ' drill unit' + (seated.length === 1 ? '' : 's'));
  { const seen: Record<string, number> = {}; seated.forEach((u, i) => { const f = foes[i]; u.npcId = f?.npc?.id || u.id; const p = f?.npc?.portrait || portraitFor(g, u.name, seen); if (p) u.img = p; }); }
  g.story.npcs = [...(g.story.npcs || []).filter((x) => !foes.some((f) => f.npc === x)), ...(foes.slice(seated.length).map((f) => f.npc).filter(Boolean) as Npc[])];
  g.combat = cb; g.phase = 'combat'; g.story.await = 'none'; g.story.work = null;
  sb.wave = n; sb.state = 'fighting'; sb.waveMana = cb.mana ?? MANA_START; sb.fights = (sb.fights || 0) + 1;
  sbFightBegun(g);
  if (!wasLive) musicOf(g).fight++;
  syncSong(g);
  runEnemies(g);
}
/** Start wave n now. fresh: everyone refilled at the start tiles, the field clean (Retry); otherwise the squad carries its
 * HP, ammo and magic in and stays where it stands (the next wave). Whatever stood on the map gives way to the wave. */
function sbStartWave(g: GameState, n: number, fresh: boolean, mana?: number, retry = false) {
  const sb = sbOf(g), live = liveFight(g);
  const pos: Record<string, string> = {};
  if (!fresh) { if (live) { for (const u of live.units) if (u.charId && !u.dead) pos[u.charId] = u.pos; } else Object.assign(pos, positionsOf(g)); }
  if (live) sbCollect(g);
  if (mana != null) g.story.mana = mana;
  if (fresh) { g.story.glyphs = []; g.story.zones = []; g.story.magic = {}; for (const c of Object.values(g.characters)) sbRefill(c); g.story.positions = {}; }
  g.story.npcs = [];
  sbAttempt(sb, n, retry);
  sbBegin(g, n, sandboxWave(n, sbParty(g)), pos);
}
/** Back to gearing up: after a fight (won or lost) or when the host stops it. Won or stopped: the squad stays where it
 * stood with what it carried, the arena as the fight left it, enemies still standing back on the map. Lost: nothing is
 * lost here: everyone refilled at the start tiles, the arena and the mana as the wave began, the field empty. */
function sbToNeutral(g: GameState, how: 'won' | 'fell' | 'stop') {
  const sb = sbOf(g), cb = g.combat!;
  const pos: Record<string, string> = {}; for (const u of cb.units) if (u.charId && !u.dead) pos[u.charId] = u.pos;
  sbCollect(g);
  if (how !== 'fell') {
    g.story.positions = pos; g.story.objects = JSON.parse(JSON.stringify(cb.objects || []));
    // The seated foes still standing go back as tokens with the HP they have left; everyone the fight did not seat
    // (overflow units, people who were not hostile) stays on the map as they were, moved aside if a fighter ended on their tile.
    const back = cb.units.filter((u) => u.side === 'foe' && !u.dead && !u.downed).map((u) => ({ id: u.npcId || u.id, name: u.name, side: 'hostile', tier: u.tier || 'minion', weapon: u.weapon, pos: u.pos,
      portrait: u.img || undefined, ...(u.analyzedBy ? { analyzed: true } : {}), ...(u.hp < u.maxHp ? { hp: u.hp } : {}) }) as Npc);
    const ids = new Set(back.map((n) => n.id)), map = zoneMap(g), objs = g.story.objects || [];
    const taken = new Set<string>([...Object.values(pos), ...back.map((n) => n.pos)]);
    const free = (k: string) => standable(map, k) && !taken.has(k) && !objs.some((o) => o.pos === k && blocksMove(o));
    const near = (k: string) => { if (free(k)) return k; const [x0, y0] = k.split(',').map(Number); for (let r = 1; r < 8; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const t = (x0 + dx) + ',' + (y0 + dy); if (free(t)) return t; } return k; };
    const rest = (g.story.npcs || []).filter((x) => !ids.has(x.id)).map((x) => { const at = near(x.pos); taken.add(at); return at === x.pos ? x : { ...x, pos: at }; });
    g.story.npcs = [...rest, ...back];
  } else {
    for (const c of Object.values(g.characters)) sbRefill(c);
    g.story.positions = {}; g.story.objects = defaultObjects(zoneMap(g)); g.story.npcs = [];
    g.story.glyphs = []; g.story.zones = []; g.story.magic = {}; g.story.mana = sb.waveMana;
  }
  positionsOf(g);
  g.phase = 'story'; g.story.await = 'players'; g.story.work = null;
  g.story.ap = {}; g.story.ended = {}; g.story.spoken = {}; g.story.needs = false; g.story.trail = {}; g.story.sneak = {}; g.story.hidden = {}; g.story.focus = null;
  musicAfterFight(g);
  // The finished fight stays for the combat screen (its last blows and the wave card); a stopped one is gone.
  g.combat = how === 'stop' ? null : { ...cb };
}
/** A fight ends: cleared or the squad fell. The Proving Ground is gearing up again (the wave card offers the next fight). */
function sandboxOver(g: GameState) {
  const sb = sbOf(g), cb = g.combat!, won = cb.over === 'win';
  if (sb.mode === 'teams') { sbTeamsOver(g); return; }
  if (won) sbNoteBest(g, sb.wave);
  if (won) { sb.state = 'cleared'; sb.best = Math.max(sb.best, sb.wave); cb.log.push('WAVE ' + sb.wave + ' CLEARED in ' + cb.round + ' round' + (cb.round === 1 ? '' : 's') + '.'); }
  else { sb.state = 'fallen'; cb.log.push('The squad falls on wave ' + sb.wave + '. Everyone is back up: retry the wave, or gear up first.'); }
  cb.summary = (won ? 'Cleared' : 'Fell on') + ' wave ' + sb.wave + '.';
  sbToNeutral(g, won ? 'won' : 'fell');
}
/** The area map while gearing up: the ordinary overworld actions with free movement (AP is always full, there are no
 * rounds and no Narrator). An attack or a spell on a drill unit starts the fight, as on any map, and is the next wave's. */
function sandboxWorld(g: GameState, a: Action, by: string) {
  const sb = sbOf(g);
  if (g.phase !== 'story') fail('The fight is on: act on the combat grid.');
  const w = (a.type === 'story/move' ? { type: 'world/act', charId: (a as any).charId, act: 'move', to: (a as any).to, how: 'move' }
    : a.type === 'story/door' ? { type: 'world/act', charId: (a as any).charId, act: 'door', objId: (a as any).objId } : a) as Extract<Action, { type: 'world/act' }>;
  if (w.act === 'end') return; // no rounds to end while gearing up
  // No rounds while gearing up, so each action is the acting character's own fresh round: the last move's trail only,
  // the weapon cooled as a new round cools it, and the drill units get a fresh look at a sneaker.
  if (w.charId) {
    if (g.story.trail) delete g.story.trail[w.charId];
    if (g.story.heat?.[w.charId]) g.story.heat[w.charId] = Math.max(0, g.story.heat[w.charId] - 2);
    for (const k in g.story.noticed || {}) if (k.endsWith('|' + w.charId)) delete g.story.noticed![k];
  }
  const before = { state: sb.state, wave: sb.wave, attempt: sb.attempt, last: sb.last }, n = sandboxNext(sb), had = g.combat;
  // Set up first: a fight this starts (and even wins in the same blow) is wave n.
  sbAttempt(sb, n); sb.wave = n; sb.state = 'fighting';
  worldAct(g, w, by);
  const cb = g.combat;
  if (cb && cb !== had) {
    sb.fights = (sb.fights || 0) + 1;
    if (g.phase === 'combat') {
      cb.noXp = true; sb.waveMana = cb.mana ?? MANA_START; cb.name = 'Proving Ground · Wave ' + n;
      const foes = cb.units.filter((u) => u.side === 'foe').length;
      cb.log.unshift('WAVE ' + n + (sb.attempt > 1 ? ' · attempt ' + sb.attempt : '') + ' · ' + foes + ' drill unit' + (foes === 1 ? '' : 's'));
    }
    sbAttackStarted(g, w.charId, by);
    return;
  }
  Object.assign(sb, before);
  g.story.ap = {}; g.story.ended = {}; g.story.spoken = {}; g.story.needs = false; g.story.work = null; g.story.await = 'players';
}
/** The Narrator's avatar (Wick), the Proving Ground's stand-in face: a test character is nobody in particular. */
export const SANDBOX_PORTRAIT = '/assets/wick-narrator-placeholder.webp';
/** A test character from an archetype (for a quick Proving Ground with nobody locked in): "Recruit", then "Recruit 2", …
 *  if the room already has one, and Wick's face. The archetype sets the build; the name stays generic. */
function sbTestSheet(g: GameState, archetype: string | undefined, kit: string | undefined): Sheet {
  const a = ARCHETYPES.find((x) => x.id === archetype) || ARCHETYPES.find((x) => x.id === 'sharpshooter') || ARCHETYPES[0];
  const names = new Set(Object.values(g.characters).map((c) => c.name));
  let name = 'Recruit'; for (let k = 2; names.has(name); k++) name = 'Recruit ' + k;
  return { name, portrait: SANDBOX_PORTRAIT, origin: 'Proving Ground', kit: ['medic', 'soldier', 'sigil', 'soul'].includes(kit || '') ? kit! : 'soldier', traits: [],
    skills: { ...(a.preset || {}) }, attrs: { ...(a.attributes || {}) }, cores: { ...(a.cores || {}) }, identity: {}, archetype: a.id };
}

function sandboxAction(g: GameState, a: SandboxAction, by: string) {
  const host = isHost(g, by), inRoom = g.players.some((p) => p.id === by);
  const hostOnly = () => { if (!host) fail('Only the host does that in the Proving Ground.'); };
  /** The character a tool acts on: its player's, or anyone's for the host. */
  const mine = (charId: string) => { const c = g.characters[charId]; if (!c) fail('No such character.'); if (c!.owner !== by && !host) fail('Not your character.'); return c!; };
  if (a.type === 'sandbox/start') {
    hostOnly();
    if (g.phase !== 'lobby') fail('Open the Proving Ground from the room, before the session starts.');
    const saved = { characters: JSON.parse(JSON.stringify(g.characters)), campaign: g.campaign ? JSON.parse(JSON.stringify(g.campaign)) : null, story: JSON.parse(JSON.stringify(g.story)), music: g.music ? JSON.parse(JSON.stringify(g.music)) : null,
      memory: g.memory ? JSON.parse(JSON.stringify(g.memory)) : null, archive: (g.archive || []).length, players: JSON.parse(JSON.stringify(g.players)) };
    const sb: Sandbox = { wave: 1, best: 0, attempt: 1, ai: true, auto: false, state: 'ready', fights: 0, advanced: {}, temp: [], waveMana: MANA_START, spawned: 0, saved,
      mode: 'coop', ready: {}, team: {}, bestBy: {}, wins: {}, ...(a.standalone ? { standalone: true } : {}) };
    g.sandbox = sb;
    if (!charsOf(g, by).length && (a.archetype || !Object.keys(g.characters).length)) {
      const c = newCharacter(id(g, 'c'), by, sbTestSheet(g, a.archetype, a.kit)); c.echo = 1; g.characters[c.id] = c; sb.temp.push(c.id);
    }
    if (!Object.keys(g.characters).length) { g.sandbox = null; fail('Lock in a character first.'); }
    g.campaign = JSON.parse(JSON.stringify(PROVING_GROUND));
    // A clean page: no campaign's story, scene or journal shows here (sandbox/end puts the room's story back as it was).
    g.story.entries = []; g.story.journal = []; g.story.scene = { title: PROVING_GROUND.title, n: 0, hooks: [], revealed: [], asked: {}, fired: {} };
    g.story.zone = PROVING_GROUND.startZone; g.story.positions = {}; g.story.npcs = []; g.story.mana = MANA_START;
    g.story.glyphs = []; g.story.zones = []; g.story.magic = {}; g.story.fx = []; g.story.objects = defaultObjects(zoneMap(g));
    for (const c of Object.values(g.characters)) sbRefill(c);
    positionsOf(g);
    // Gearing up: the squad on the map, wave 1 standing idle across it, the tools open. The fight starts from here.
    g.phase = 'story'; g.story.round = 1; g.story.await = 'players'; g.story.work = null;
    g.story.ap = {}; g.story.ended = {}; g.story.spoken = {}; g.story.needs = false; g.story.trail = {}; g.story.focus = null;
    sbPlace(g, 1);
    sbLog(g, 'The Proving Ground. Gear up with the tools, then start the fight: click a drill unit on the map, attack one, or press Start the fight.');
    return;
  }
  const sb = sbOf(g), cb = liveFight(g), gearing = g.phase === 'story';
  if (SB_MP_ACTIONS.has(a.type)) { sandboxMp(g, a as SandboxMpAction, by); return; }
  /** The field tools: the host's, or everyone's with "Everyone can spawn" on. */
  const fieldOnly = () => { if (!host && !(sb.spawnAll && inRoom)) fail('Only the host does that in the Proving Ground (the host can turn on "Everyone can spawn").'); };
  switch (a.type) {
    case 'sandbox/end': {
      hostOnly();
      const s = sb.saved, added = Object.values(g.characters).filter((c) => !s.characters[c.id] && !sb.temp.includes(c.id));
      g.characters = { ...s.characters }; for (const c of added) g.characters[c.id] = c; // added mid-practice: kept (s.characters has their fresh copy too)
      g.campaign = s.campaign; g.story = s.story; if (s.music) g.music = s.music; else delete g.music;
      if (s.memory) g.memory = s.memory; else if (s.memory === null) delete g.memory;
      if (s.archive != null && g.archive && g.archive.length > s.archive) g.archive = g.archive.slice(0, s.archive);
      g.combat = null; g.phase = 'lobby'; g.sandbox = null; g.checks = []; g.overreach = []; g.awards = [];
      sbRestoreRoster(g, sb);
      return;
    }
    case 'sandbox/fight': {
      if (!inRoom) fail('Join the room first.');
      if (!gearing) fail('The fight is already on.');
      if (!host && !sbAllReady(g)) fail('The host starts the fight. Press READY (or attack a drill unit to start it at once).');
      if (sb.mode === 'teams') { sbBeginTeams(g); return; }
      const n = sandboxNext(sb);
      if (!npcsOf(g).some((x) => x.side === 'hostile')) sbPlace(g, n);
      const foes = npcsOf(g).filter((x) => x.side === 'hostile'), stay = npcsOf(g).filter((x) => x.side !== 'hostile');
      sbAttempt(sb, n);
      g.story.npcs = stay;
      sbBegin(g, n, foes.map((x) => ({ name: x.name, tier: x.tier, weapon: x.weapon, at: refOf(x.pos), hp: x.hp, npc: x, caster: x.caster })), { ...positionsOf(g) }, storyObjects(g));
      return;
    }
    case 'sandbox/stage': {
      fieldOnly(); if (!gearing) fail('Stop the fight first.');
      if (sb.mode === 'teams') fail('Team fight: no drill units (switch the mode to Co-op waves).');
      const n = Math.max(1, Math.min(99, Math.round(a.wave ?? sandboxNext(sb))));
      sbPlace(g, n); sb.wave = n; sb.state = 'ready';
      sbLog(g, 'Wave ' + n + ' stands on the map: ' + npcsOf(g).length + ' drill unit' + (npcsOf(g).length === 1 ? '' : 's') + '.');
      return;
    }
    case 'sandbox/stop': {
      hostOnly(); if (!cb) fail('No fight is on.');
      sbToNeutral(g, 'stop'); sb.state = 'ready';
      sbLog(g, 'The fight is stopped: gear up, then start it again.');
      return;
    }
    case 'sandbox/wave': {
      if (a.wave != null) fieldOnly(); else if (!inRoom) fail('Join the room first.');
      if (sb.mode === 'teams') fail('Team fight: no waves (switch the mode to Co-op waves).');
      if (a.wave == null && sb.state !== 'cleared') fail(sb.state === 'fallen' ? 'The squad is down: retry the wave.' : 'Clear this wave first.');
      const n = Math.max(1, Math.min(99, Math.round(a.wave ?? sb.wave + 1)));
      sbStartWave(g, n, sb.state === 'fallen');
      return;
    }
    case 'sandbox/retry': {
      // Anyone may retry once the squad has fallen; otherwise only the host resets the room's run.
      if (sb.state === 'fallen') { if (!inRoom) fail('Join the room first.'); if (!host && sb.guestRetry === false) fail('The host has Retry for guests turned off.'); } else hostOnly();
      if (sb.mode === 'teams') fail('Team fight: no waves (switch the mode to Co-op waves).');
      sbStartWave(g, a.restart ? 1 : sb.wave, true, a.restart ? MANA_START : sb.waveMana, true);
      return;
    }
    case 'sandbox/auto': { hostOnly(); sb.auto = !!a.on; return; }
    case 'sandbox/ai': { hostOnly(); sb.ai = !!a.on; sbLog(g, 'Enemy AI ' + (sb.ai ? 'on.' : 'off: enemies pass their turns.')); return; }
    case 'sandbox/mana': {
      fieldOnly(); const v = Math.max(0, Math.min(40, Math.round(Number(a.value) || 0)));
      g.story.mana = v; if (cb) { cb.mana = v; emitFx(cb, 'mana', { band: MANA_BANDS.find((b) => v >= b.min && v <= b.max)?.id || '', mana: v }); }
      sbLog(g, 'The mana meter is set to ' + v + '.'); return;
    }
    case 'sandbox/spawn': {
      fieldOnly();
      if (sb.mode === 'teams') fail('Team fight: no drill units (switch the mode to Co-op waves).');
      if (!ENEMY[a.tier]) fail('Pick a tier: minion, soldier, elite or boss.');
      // A Sigil caster (enemies.json casters; rules 1.4) of the same tier: it fights with an Evoker and its words.
      const caster: { id: string; name: string; tier: string; weapon: string } | undefined = a.caster ? CASTER[a.caster] || HEART_CASTER[a.caster] : undefined;
      if (a.caster && !caster) fail('No such caster.');
      if (caster && caster.tier !== a.tier) fail(caster.name + ' is a ' + caster.tier + '.');
      const weapon = a.weapon || (caster ? caster.weapon : '');
      if (!WEAPON[weapon]) fail('No such weapon.');
      const name = (a.name || '').trim().slice(0, 40) || (caster ? caster.name + ' ' + (1 + (cb ? cb.units.filter((u) => (u as any).caster === caster.id).length : npcsOf(g).filter((n) => n.caster === caster.id).length)) : '');
      if (gearing) {
        // On the map, idle: it joins the next fight.
        const map = zoneMap(g), k = tileKey(g, a.at);
        if (!standable(map, k) || Object.values(positionsOf(g)).includes(k) || npcsOf(g).some((n) => n.pos === k) || storyObjects(g).some((o) => o.pos === k && blocksMove(o))) fail('Nobody can stand there.');
        const nm = name || (SANDBOX_TIERS[a.tier]?.name || 'Drill unit') + ' ' + (npcsOf(g).filter((n) => n.tier === a.tier).length + 1);
        npcsOf(g).push({ id: 'foe-s' + (++sb.spawned), name: nm, side: 'hostile', tier: a.tier, weapon, pos: k, portrait: portraitFor(g, nm) || undefined, facing: facingToward(k, partyCentre(g)), ...(caster ? { caster: caster.id } : {}) });
        sbLog(g, nm + ' (' + a.tier + ', ' + WEAPON[weapon].name + (caster ? (HEART_CASTER[caster.id] ? ', Outbursts' : ', Sigils') : '') + ') stands at ' + refOf(k) + '.');
        return;
      }
      if (!cb) fail('No fight is on.');
      const k = tileKey(g, a.at);
      if (!standable(cb!.map, k) || cb!.units.some((u) => u.pos === k && !u.dead) || objectsOf(cb!).some((o) => o.pos === k && blocksMove(o))) fail('Nobody can stand there.');
      const nm = name || (SANDBOX_TIERS[a.tier]?.name || 'Drill unit') + ' ' + (cb!.units.filter((u) => u.tier === a.tier).length + 1);
      const u = unitFromEnemy('foe-s' + (++sb.spawned), nm, a.tier, weapon, k, g.rng); u.npcId = u.id;
      if (caster) { armFoe(u, { caster: caster.id }); armHeart(u, { caster: caster.id }); }
      const p = portraitFor(g, nm); if (p) u.img = p;
      cb!.units.push(u); cb!.order.push(u.id);
      sbLog(g, nm + ' (' + a.tier + ', ' + WEAPON[weapon].name + (caster ? (HEART_CASTER[caster.id] ? ', Outbursts' : ', Sigils') : '') + ') enters at ' + refOf(k) + '.');
      return;
    }
    case 'sandbox/clear': {
      fieldOnly();
      if (gearing) { g.story.npcs = npcsOf(g).filter((n) => n.side !== 'hostile'); sbLog(g, 'The map is cleared. Spawn drill units, or start the fight for a wave.'); return; }
      if (!cb) fail('No fight is on.');
      const cur = cb!.order[cb!.turn];
      cb!.units = cb!.units.filter((u) => u.side !== 'foe'); cb!.order = cb!.order.filter((x) => cb!.units.some((u) => u.id === x));
      const t = cb!.order.indexOf(cur);
      if (t >= 0) cb!.turn = t; else { cb!.turn = 0; beginTurn(cb!, g.rng); }
      cb!.over = null; sb.state = 'fighting';
      sbLog(g, 'The field is cleared. Spawn enemies, or stop the fight to gear up.');
      return;
    }
    case 'sandbox/refill': {
      const list = a.charId ? [mine(a.charId)] : (host ? Object.values(g.characters) : fail('Pick a character.'));
      for (const c of list) sbChange(g, c, () => sbRefill(c), 'refill');
      if (cb) for (const c of list) { const u = cb.units.find((x) => x.charId === c.id); if (u) { u.downed = false; u.dead = false; u.saves = { ok: 0, fail: 0 }; u.bleed = 0; u.conds = {}; u.shield = 0; u.jammed = false; u.heat = 0; } }
      if (gearing) for (const c of list) { if (g.story.heat) g.story.heat[c.id] = 0; if (g.story.jammed) g.story.jammed[c.id] = false; }
      sbLog(g, list.map((c) => c.name).join(', ') + ': refilled.'); return;
    }
    case 'sandbox/give': {
      const c = mine(a.charId), rarity = (['standard', 'fine', 'masterwork', 'relic', 'celestial'].includes(a.rarity || '') ? a.rarity : 'standard') as Rarity;
      if (!WEAPON[a.item] && !ITEM[a.item]) fail('No such item.');
      let err: string | null = null;
      sbChange(g, c, () => {
        const at = sbGive(c, a.item, a.qty || 1, rarity);
        if (a.equip && at >= 0) {
          const it = packOf(c)[at], def = ITEM[a.item] as any;
          const to = WEAPON[a.item] ? 'main' : def?.category === 'mod' ? 'mod' : def?.category === 'armour' ? 'worn' : def?.slot === 'off_hand' ? 'off' : null;
          if (to && it) err = sbEquip(c, at, to);
        }
      });
      sbLog(g, c.name + ' gets ' + (WEAPON[a.item]?.name || ITEM[a.item]?.name) + (WEAPON[a.item] && rarity !== 'standard' ? ' (' + rarity + ')' : '') + (a.equip && !err ? ', equipped' : '') + '.');
      if (err) fail(err);
      return;
    }
    case 'sandbox/kit': {
      const c = mine(a.charId), kind: MagicKit = a.kind === 'sigil' || a.kind === 'soul' ? a.kind : 'both';
      let got: string[] = [];
      sbChange(g, c, () => { got = sbKit(g, c, kind); });
      sbLog(g, c.name + ' takes the magic kit' + (got.length ? ': ' + got.join(', ') : ' (already has it all)') + '.');
      return;
    }
    case 'sandbox/equip': case 'sandbox/unequip': case 'sandbox/drop': case 'sandbox/armour': {
      const c = mine(a.charId); let err: string | null = null;
      sbChange(g, c, () => {
        if (a.type === 'sandbox/equip') err = sbEquip(c, a.idx, a.to);
        else if (a.type === 'sandbox/unequip') err = sbUnequip(c, a.slot);
        else if (a.type === 'sandbox/drop') { const pack = packOf(c).map((x) => ({ ...x })); if (!pack[a.idx]) err = 'Nothing there.'; else if ((err = partError(c, a.idx, pack[a.idx].qty))) { /* Gun Nut's Collector: a collection gun stays (item 369) */ } else { pack.splice(a.idx, 1); c.pack = pack; } }
        else { const want = Math.max(0, Math.min(5, Math.round(a.armourClass))), cap = armourCap(c); if (cap != null && want > cap) fail(c.name + ' can wear Class ' + cap + ' at most (' + (TRAITS.find((x) => (c.traits || []).includes(x.id) && (x as any).effects?.some((e: any) => e.op === 'armor_class_max'))?.name || 'a trait') + ').'); c.armourClass = want; }
      });
      if (err) fail(err);
      return;
    }
    case 'sandbox/class': {
      const c = mine(a.charId);
      sbChange(g, c, () => {
        delete sb.advanced[c.id]; c.advancedClass = null;
        if (!a.classId) { c.classId = null; return; }
        const adv = ADVANCED_CLASSES.find((x) => x.id === a.classId);
        if (adv) {
          // An advanced class needs 15 in one parent's signatures and 9 in the other (rules 1.2): brought up to that here.
          sbRaiseSignature(c, adv.parents[0], 15); if (adv.parents[1]) sbRaiseSignature(c, adv.parents[1], 9);
          c.classId = adv.parents[0]; sb.advanced[c.id] = adv.id; c.advancedClass = adv.id; return;
        }
        if (!CLASS[a.classId]) fail('No such class.');
        c.classId = a.classId;
        const rank = Math.max(1, Math.min(3, Math.round(a.rank || 1)));
        if (rank >= 2) sbRaiseSignature(c, a.classId, rank === 3 ? 18 : 13);
      });
      const adv = sb.advanced[c.id];
      sbLog(g, c.name + ' is now ' + (adv ? ADVANCED_CLASSES.find((x) => x.id === adv)!.name + ' (with ' + CLASS[c.classId!]?.name + ' rank ' + ['', 'I', 'II', 'III'][classRank(c)] + ')' : c.classId ? CLASS[c.classId].name + ' rank ' + ['', 'I', 'II', 'III'][classRank(c)] : 'classless') + '.');
      return;
    }
    case 'sandbox/level': {
      const c = mine(a.charId), L = Math.max(1, Math.min(20, Math.round(a.level)));
      sbChange(g, c, () => {
        if (L > c.level) { c.xp = Math.max(c.xp, xpForLevel(L)); applyLevels(c); }
        else { c.level = L; c.xp = xpForLevel(L); }
        c.hp = maxHp(c);
      });
      const u = cb?.units.find((x) => x.charId === c.id); if (u) u.hp = u.maxHp;
      sbLog(g, c.name + ' is level ' + c.level + ' (' + maxHp(c) + ' HP).'); return;
    }
    case 'sandbox/skill': {
      const c = mine(a.charId);
      sbChange(g, c, () => sbSetSkill(c, a.skill, a.points));
      sbLog(g, c.name + ': ' + SKILL[a.skill].name + ' ' + (c.skills[a.skill] || 0) + '.'); return;
    }
    case 'sandbox/perk': {
      // Any perk at any tier, without the skill points it needs (the Proving Ground is for trying things); tier null takes it away.
      const c = mine(a.charId), p = PERK[a.perk]; if (!p) fail('No such perk.');
      const tier = a.tier === null ? null : p!.tier === 'acquired' ? (a.tier === 'II' ? 'II' : 'I') : (p!.tier as any);
      sbChange(g, c, () => { c.perks = c.perks.filter((x) => x.id !== a.perk); if (tier) c.perks.push({ id: a.perk, tier }); });
      sbLog(g, c.name + (tier ? ' holds ' + p!.name + (p!.tier === 'acquired' ? ' ' + tier : '') : ' no longer holds ' + p!.name) + '.'); return;
    }
    case 'sandbox/trait': {
      const c = mine(a.charId), t = TRAITS.find((x) => x.id === a.trait); if (!t) fail('No such trait.');
      const on = a.on !== false;
      if (on) { const why = traitGainError(c.traits, a.trait); if (why) fail(why); }
      sbChange(g, c, () => { c.traits = on ? [...(c.traits || []), a.trait] : (c.traits || []).filter((x) => x !== a.trait); if (on && !c.collection) startCollection(c); });
      sbLog(g, c.name + (on ? ' has the trait ' : ' loses the trait ') + (t as any).name + '.'); return;
    }
    case 'sandbox/learn': {
      const c = mine(a.charId);
      if (a.word && !SIGIL[a.word]) fail('No such word.'); if (a.school && !SCHOOL[a.school]) fail('No such school.'); if (a.module && !MODULE[a.module]) fail('No such module.'); if (a.tone && (!TONE[a.tone] || a.tone === 'raw')) fail('No such tone.');
      if (!a.word && !a.school && !a.module && !a.tone) fail('Pick a word, a school, a module or a tone.');
      sbChange(g, c, () => {
        if (a.word && !(c.sigils ||= []).includes(a.word)) c.sigils.push(a.word); // the Proving Ground ignores the Brain Power cap
        const k = (c.soulKnown ||= { schools: [], modules: [] });
        if (a.school && !k.schools.includes(a.school)) k.schools.push(a.school);
        if (a.module && !k.modules.includes(a.module)) k.modules.push(a.module);
        if (a.tone && !(k.tones ||= []).includes(a.tone)) k.tones.push(a.tone);
      });
      sbLog(g, c.name + ' learns ' + [a.word && SIGIL[a.word].word, a.school && SCHOOL[a.school].name + ' (school)', a.module && MODULE[a.module].name + ' (module)', a.tone && TONE[a.tone].name + ' (tone)'].filter(Boolean).join(', ') + '.');
      return;
    }
    case 'sandbox/design': {
      const c = mine(a.charId), d = a.design;
      if (!d || !SCHOOL[d.school] || (d.school2 && !SCHOOL[d.school2])) fail('Pick a school.');
      const mods = migrateDesign({ id: '', name: '', school: d.school, modules: [...new Set(d.modules || [])] }).modules.filter((x) => MODULE[x]).slice(0, 4);
      { const why = designShapeError(mods) || (d.school2 ? pairingError(d.school, d.school2, mods) : null); if (why) fail(why); }
      if (d.id && cb?.units.find((x) => x.charId === c.id)?.mg?.held?.design === d.id) fail('That Outburst is being held: release it first.');
      const tone = d.tone && d.tone !== 'raw' && TONE[d.tone] ? d.tone : undefined;
      sbChange(g, c, () => {
        const k = (c.soulKnown ||= { schools: [], modules: [] });
        for (const s of [d.school, d.school2].filter(Boolean) as string[]) if (!k.schools.includes(s)) k.schools.push(s);
        for (const m of mods) if (!k.modules.includes(m)) k.modules.push(m);
        if (tone && !(k.tones ||= []).includes(tone)) k.tones.push(tone);
        const list = (c.outbursts ||= []), at = list.findIndex((x) => x.id === d.id);
        const clean: OutburstDesign = { id: at >= 0 ? d.id : 'o' + (++g.seq), name: String(d.name || SCHOOL[d.school].name + ' Outburst').slice(0, 40), school: d.school, ...(d.school2 ? { school2: d.school2 } : {}), modules: mods, ...(d.option ? { option: d.option } : {}), ...(d.school2 && d.option2 ? { option2: d.option2 } : {}), ...(tone ? { tone } : {}) };
        if (at >= 0) list[at] = clean; else { if (list.length >= 8) fail('Eight designs at most here: forget one first.'); list.push(clean); }
      });
      return;
    }
    case 'sandbox/forget': {
      const c = mine(a.charId);
      sbChange(g, c, () => {
        if (a.word) c.sigils = (c.sigils || []).filter((x) => x !== a.word);
        if (a.designId) { const u = cb?.units.find((x) => x.charId === c.id); if (u?.mg?.held?.design === a.designId) fail('That Outburst is being held: release it first.'); c.outbursts = (c.outbursts || []).filter((x) => x.id !== a.designId); }
      });
      return;
    }
  }
  fail('Unknown action.');
}
/** The ordinary gear and magic-book actions, allowed mid-fight in the Proving Ground (the fighter is rebuilt). */
function sandboxGear(g: GameState, a: Action, by: string) {
  const charId = (a as any).charId as string, c = g.characters[charId]; if (!c || c.owner !== by) fail('Not your character.');
  const m: Record<string, () => SandboxAction> = {
    'gear/equip': () => ({ type: 'sandbox/equip', charId, idx: (a as any).idx, to: (a as any).to }),
    'gear/unequip': () => ({ type: 'sandbox/unequip', charId, slot: (a as any).slot }),
    'gear/mod': () => ({ type: 'sandbox/equip', charId, idx: (a as any).idx, to: 'mod' }),
    'magic/design': () => ({ type: 'sandbox/design', charId, design: (a as any).design }),
    'magic/forget': () => ({ type: 'sandbox/forget', charId, designId: (a as any).designId }),
    'magic/learn': () => ({ type: 'sandbox/learn', charId, word: (a as any).word, school: (a as any).school, module: (a as any).module, tone: (a as any).tone }),
  };
  if (a.type === 'gear/load') { sbChange(g, c!, () => { if (!loadAll(c!)) fail('Nothing to load: no part-empty magazines with matching loose rounds.'); }); return; }
  const to = m[a.type]; if (!to) fail('Unknown action.');
  sandboxAction(g, to(), by);
}

// ---------- the Proving Ground multiplayer ----------
// Friends join the room and each gets a fighter: a test Recruit (Wick's face), or a copy of one of their saved
// characters. They gear up together, press READY, and the host starts the fight (anyone can, once everyone is ready;
// attacking a drill unit starts it at once, as solo). Co-op waves scale with the party; or the host sets the mode to a
// team fight: Team A against Team B on the same map, no drill units. Team B's fighters stand on the fight's foe side
// but are players' units (charId set): no enemy AI runs them, and each Team B player's view is turned around
// (sandboxView) so their client sees their own team as the squad and fogs the map from their side.
// Spec: Proving Ground, multiplayer. Nothing here ever sets story.work: the Narrator is never called.

export type SandboxMpAction =
  | { type: 'sandbox/ready'; on?: boolean }
  | { type: 'sandbox/settings'; spawnAll?: boolean; mode?: 'coop' | 'teams'; guestRetry?: boolean }
  | { type: 'sandbox/team'; team: 'A' | 'B'; playerId?: string }
  | { type: 'sandbox/recruit'; archetype?: string }
  | { type: 'sandbox/bring'; sheet: Sheet }
  | { type: 'sandbox/leave' };
const SB_MP_ACTIONS = new Set(['sandbox/ready', 'sandbox/settings', 'sandbox/team', 'sandbox/recruit', 'sandbox/bring', 'sandbox/leave']);

/** The wave budget's party multiplier: × (0.6 + 0.4 × players), provisional (spec 14). One player: × 1. */
export const sandboxScale = (party: number) => 0.6 + 0.4 * Math.max(1, Math.min(4, Math.round(party) || 1));
/** Players with a fighter in the Proving Ground (at least 1). */
export function sbParty(g: GameState): number { return Math.max(1, new Set(Object.values(g.characters).map((c) => c.owner)).size); }
/** The players who have a fighter, and how many of them pressed READY. */
export function sandboxReady(g: GameState): { ready: number; of: number; ids: string[] } {
  const ids = [...new Set(Object.values(g.characters).map((c) => c.owner))].filter((pid) => g.players.some((p) => p.id === pid));
  const r = g.sandbox?.ready || {};
  return { ready: ids.filter((pid) => r[pid]).length, of: ids.length, ids };
}
const sbAllReady = (g: GameState) => { const r = sandboxReady(g); return r.of > 0 && r.ready === r.of; };
/** A player's team in a team fight (A unless they picked B). */
export const sandboxTeam = (sb: Sandbox, pid: string): 'A' | 'B' => (sb.team?.[pid] === 'B' ? 'B' : 'A');

/** A fight began: READY clears, and the wave on the map is no longer the tools' to re-place. */
function sbFightBegun(g: GameState) { const sb = sbOf(g); sb.ready = {}; sb.placed = null; }
/** Gearing up, the squad attacked a drill unit: the fight starts at once whoever was ready (said in the log). */
function sbAttackStarted(g: GameState, charId: string | undefined, by: string) {
  const sb = sbOf(g), cb = g.combat; if (!cb) return;
  const r = sandboxReady(g), who = (charId && g.characters[charId]?.name) || g.players.find((p) => p.id === by)?.name || 'Someone';
  if (r.of > 1) cb.log.splice(1, 0, who + ' attacked a drill unit: the fight starts at once (' + r.ready + ' / ' + r.of + ' were ready).');
  sbFightBegun(g); void sb;
}
/** A cleared wave counts for every player with a fighter in it. */
function sbNoteBest(g: GameState, wave: number) {
  const sb = sbOf(g), by = (sb.bestBy ||= {});
  for (const u of g.combat?.units || []) { const c = u.charId ? g.characters[u.charId] : null; if (c) by[c.owner] = Math.max(by[c.owner] || 0, wave); }
}

/** Remove fighters: their characters, their tokens, and their units in a fight that is on (the turn passes on if it was theirs). */
function sbRemoveChars(g: GameState, ids: string[]) {
  const sb = sbOf(g), cb = liveFight(g);
  if (cb) {
    const gone = new Set(cb.units.filter((u) => (u.charId && ids.includes(u.charId)) || (u.ctrl && ids.includes(u.ctrl))).map((u) => u.id));
    if (gone.size) {
      const cur = cb.order[cb.turn], wasTheirs = gone.has(cur), before = cb.order.slice(0, cb.turn).filter((x) => !gone.has(x)).length;
      cb.units = cb.units.filter((u) => !gone.has(u.id)); cb.order = cb.order.filter((x) => !gone.has(x));
      if (sb.mode === 'teams' && !cb.units.some((u) => u.side === 'foe')) cb.over = 'win'; // Team B has nobody left
      if (cb.order.length && wasTheirs) {
        cb.turn = before % cb.order.length;
        const u = active(cb)!; if (u.dead || u.surrendered || (u.side === 'foe' && u.downed && !u.charId)) endTurn(cb, g.rng); else beginTurn(cb, g.rng);
      } else if (cb.order.length) cb.turn = Math.max(0, cb.order.indexOf(cur));
    }
  }
  for (const id of ids) { delete g.characters[id]; if (g.story.positions) delete g.story.positions[id]; if (g.story.magic) delete g.story.magic[id]; }
  sb.temp = sb.temp.filter((x) => !ids.includes(x));
  if (g.story.focus && ids.includes(g.story.focus.charId)) g.story.focus = null;
  if (cb && g.combat === cb) runEnemies(g); // the fight may be over now (nobody left on a side), or it is a drill unit's turn
}
/** A player is gone from the Proving Ground (left, or removed by the host): their fighters with them. */
function sbPlayerGone(g: GameState, pid: string) {
  const sb = sbOf(g);
  sbRemoveChars(g, Object.values(g.characters).filter((c) => c.owner === pid).map((c) => c.id));
  if (sb.ready) delete sb.ready[pid];
  if (sb.team) delete sb.team[pid];
}
/** A test fighter for a player who has none: "Recruit 2", "Recruit 3"…, Wick's face, refilled, on a free start tile. */
function sbRecruit(g: GameState, pid: string, archetype?: string): Character {
  const sb = sbOf(g), c = newCharacter(id(g, 'c'), pid, sbTestSheet(g, archetype, undefined));
  c.echo = 1; g.characters[c.id] = c; sb.temp.push(c.id); sbRefill(c);
  if (g.phase === 'story') positionsOf(g);
  return c;
}
/** Leaving the Proving Ground puts the room's roster back: who was in the room before (online as they are now, or offline
 * if they left), plus anyone who joined during it; players the host removed stay out. */
function sbRestoreRoster(g: GameState, sb: Sandbox) {
  const was = sb.saved.players; if (!was) return;
  const now = g.players, kicked = new Set(sb.kicked || []);
  g.players = [...was.filter((p) => !kicked.has(p.id)).map((p) => ({ ...p, online: now.find((x) => x.id === p.id)?.online ?? false })),
    ...now.filter((p) => !was.some((x) => x.id === p.id))];
  for (const c of Object.values(g.characters)) if (kicked.has(c.owner)) delete g.characters[c.id];
}
/** Re-place the tools' wave when the party size changed (a friend joined or left while gearing up). */
function sbReplace(g: GameState) {
  const sb = g.sandbox; if (!sb || g.phase !== 'story' || sb.mode === 'teams' || !sb.placed) return;
  if (sb.placed.party !== sbParty(g)) sbPlace(g, sb.placed.wave);
}

function sandboxMp(g: GameState, a: SandboxMpAction, by: string) {
  const sb = sbOf(g), host = isHost(g, by), gearing = g.phase === 'story';
  if (!g.players.some((p) => p.id === by)) fail('Join the room first.');
  switch (a.type) {
    case 'sandbox/ready': {
      if (!charsOf(g, by).length) fail('Get a fighter first: a Recruit, or one of your characters.');
      if (!gearing) fail('The fight is already on.');
      (sb.ready ||= {})[by] = a.on ?? !sb.ready[by];
      return;
    }
    case 'sandbox/settings': {
      if (!host) fail('Only the host changes the Proving Ground\'s settings.');
      if (a.spawnAll != null) { sb.spawnAll = !!a.spawnAll; sbLog(g, 'Everyone can spawn: ' + (sb.spawnAll ? 'on.' : 'off (the host only).')); }
      if (a.guestRetry != null) sb.guestRetry = !!a.guestRetry;
      if (a.mode && a.mode !== (sb.mode || 'coop')) {
        if (!gearing) fail('Stop the fight first.');
        if (a.mode !== 'coop' && a.mode !== 'teams') fail('Pick Co-op waves or Team fight.');
        sb.mode = a.mode; sb.ready = {}; sb.state = 'ready';
        if (a.mode === 'teams') {
          // Two teams from the players with a fighter, alternating (each can switch on the Squad tab).
          g.story.npcs = npcsOf(g).filter((n) => n.side !== 'hostile'); sb.placed = null;
          const ids = sandboxReady(g).ids, t = (sb.team ||= {});
          ids.forEach((pid, i) => { if (!t[pid]) t[pid] = i % 2 ? 'B' : 'A'; });
          if (ids.length > 1 && ids.every((pid) => t[pid] === t[ids[0]])) t[ids[ids.length - 1]] = t[ids[0]] === 'A' ? 'B' : 'A';
          sbLog(g, 'Mode: Team fight. Pick Team A or Team B on the Squad tab; the host starts the fight.');
        } else { sbPlace(g, sandboxNext(sb)); sbLog(g, 'Mode: Co-op waves.'); }
      }
      return;
    }
    case 'sandbox/team': {
      const pid = a.playerId || by;
      if (pid !== by && !host) fail('Pick your own team.');
      if (!gearing) fail('Teams change between fights.');
      if (a.team !== 'A' && a.team !== 'B') fail('Team A or Team B.');
      if (!g.players.some((p) => p.id === pid)) fail('No such player.');
      (sb.team ||= {})[pid] = a.team; if (sb.ready) delete sb.ready[pid];
      return;
    }
    case 'sandbox/recruit': {
      if (!gearing) fail('Between fights.');
      if (charsOf(g, by).length) fail('You already have a fighter.');
      const c = sbRecruit(g, by, a.archetype); sbReplace(g);
      sbLog(g, c.name + ' joins the Proving Ground.');
      return;
    }
    case 'sandbox/bring': {
      // A copy of a saved character: its own id, removed on leaving; the player's library is never touched.
      if (!gearing) fail('Bring a character between fights.');
      const temps = Object.values(g.characters).filter((c) => c.owner === by && sb.temp.includes(c.id));
      const keep = Object.values(g.characters).filter((c) => c.owner === by && !sb.temp.includes(c.id));
      if (keep.length >= 2) fail('Two characters per player at most.');
      const err = validateSheet(a.sheet) || (typeof a.sheet.portrait === 'string' && a.sheet.portrait.length > PORTRAIT_MAX ? 'That portrait is too big for a room.' : null)
        || (JSON.stringify({ ...a.sheet, portrait: '' }).length > SHEET_MAX ? 'That character carries too much text for a room.' : null);
      if (err) fail(err);
      if (temps.length) sbRemoveChars(g, temps.map((c) => c.id));
      const c = newCharacter(id(g, 'c'), by, JSON.parse(JSON.stringify(a.sheet)));
      c.echo = 1; g.characters[c.id] = c; sb.temp.push(c.id); sbRefill(c); positionsOf(g); sbReplace(g);
      sbLog(g, (g.players.find((p) => p.id === by)?.name || 'A player') + ' brings ' + c.name + ' (a copy: the saved character stays as it was).');
      return;
    }
    case 'sandbox/leave': {
      if (host) fail('The host ends the Proving Ground for everyone (Leave the Proving Ground).');
      const p = g.players.find((x) => x.id === by)!;
      sbPlayerGone(g, by);
      g.players = g.players.filter((x) => x.id !== by);
      sbReplace(g);
      push(g, { kind: 'system', text: p.name + ' left the Proving Ground.', ooc: true });
      return;
    }
  }
  fail('Unknown action.');
}

/** A team fight: Team A at the map's squad start, Team B at the far side, everyone refilled; no drill units. */
function sbBeginTeams(g: GameState) {
  const sb = sbOf(g), map = zoneMap(g);
  const live = Object.values(g.characters).filter((c) => !c.dead && g.players.some((p) => p.id === c.owner));
  const A = live.filter((c) => sandboxTeam(sb, c.owner) === 'A'), B = live.filter((c) => sandboxTeam(sb, c.owner) === 'B');
  if (!A.length || !B.length) fail('Each team needs a fighter: pick Team A or Team B on the Squad tab.');
  for (const c of live) sbRefill(c);
  g.story.npcs = []; g.story.glyphs = []; g.story.zones = []; g.story.magic = {}; g.story.positions = {};
  const pcs = [...A.map((c) => ({ c })), ...B.map((c, i) => ({ c, pos: map.foeStart[i % map.foeStart.length] }))];
  const cb = startCombat('Proving Ground · Team fight', map, pcs, [], 'standard', g.rng, defaultObjects(map));
  const bIds = new Set(B.map((c) => c.id));
  for (const u of cb.units) if ((u.charId && bIds.has(u.charId)) || (u.ctrl && bIds.has(u.ctrl))) u.side = 'foe';
  for (const e of cb.fx || []) if (e.unit && e.side) { const u = cb.units.find((x) => x.id === e.unit); if (u) e.side = u.side; }
  magicIn(g, cb);
  cb.noXp = true;
  cb.log.unshift('TEAM FIGHT · Team A (' + A.map((c) => c.name).join(', ') + ') against Team B (' + B.map((c) => c.name).join(', ') + '). Downed is out.');
  g.combat = cb; g.phase = 'combat'; g.story.await = 'none'; g.story.work = null;
  sb.state = 'fighting'; sb.waveMana = cb.mana ?? MANA_START; sb.fights = (sb.fights || 0) + 1; sb.lastWin = undefined;
  sbFightBegun(g);
  musicOf(g).fight++;
  syncSong(g);
  runEnemies(g);
}
/** A team fight ends: the winners counted, everyone back to gearing up with full HP at the start tiles. */
function sbTeamsOver(g: GameState) {
  const sb = sbOf(g), cb = g.combat!, won: 'A' | 'B' = cb.over === 'win' ? 'A' : 'B', w = (sb.wins ||= {});
  const owners = new Set(cb.units.filter((u) => u.charId && (u.side === 'pc') === (won === 'A')).map((u) => g.characters[u.charId!]?.owner).filter(Boolean) as string[]);
  for (const pid of owners) w[pid] = (w[pid] || 0) + 1;
  cb.log.push('TEAM ' + won + ' WINS in ' + cb.round + ' round' + (cb.round === 1 ? '' : 's') + '. Everyone is back up for the next one.');
  cb.summary = 'Team ' + won + ' wins.';
  sb.lastWin = won;
  sbToNeutral(g, 'fell');
  sb.state = 'ready';
}

/** After every action in the Proving Ground: a friend who joined gets a fighter, a removed player's fighters go, the
 * tools' wave follows the party size, and in a team fight Downed is out (no death saves, no stims) on both sides. */
export function sandboxAfter(g: GameState, a: Action, by: string) {
  const sb = g.sandbox; if (!sb) return;
  if (a.type === 'player/join' && isHost(g, by) && g.players.some((p) => p.id === a.id) && !Object.values(g.characters).some((c) => c.owner === a.id)) {
    const c = sbRecruit(g, a.id); sbReplace(g);
    sbLog(g, c.name + ' joins the Proving Ground' + (liveFight(g) ? ': in the next fight.' : '.'));
  }
  if (a.type === 'player/kick' && isHost(g, by)) {
    (sb.kicked ||= []).includes(a.id) || sb.kicked.push(a.id);
    sbPlayerGone(g, a.id); sbReplace(g);
  }
  const cb = liveFight(g);
  if (sb.mode === 'teams' && cb) for (const u of cb.units) if (u.charId && u.downed && !u.dead) { u.downed = false; u.dead = true; u.hp = 0; cb.log.push(u.name + ' is out.'); }
}
/** A player's view of the Proving Ground: no saved room; in a team fight Team B sees the fight from its side. */
function sandboxView(g: GameState, v: GameState, playerId: string) {
  const sb = g.sandbox!;
  v.sandbox = { ...sb, saved: { characters: {}, campaign: null, story: null, music: null } };
  if (sb.mode !== 'teams' || !v.combat || sandboxTeam(sb, playerId) !== 'B') return;
  const flip = <T extends { side?: any }>(x: T): T => (x.side === 'pc' || x.side === 'foe' ? { ...x, side: x.side === 'pc' ? 'foe' : 'pc' } : x);
  const cb = v.combat;
  v.combat = { ...cb, units: cb.units.map(flip), glyphs: cb.glyphs?.map(flip), zones: cb.zones?.map(flip), fx: cb.fx?.map((e) => flip(e as { side?: any }) as typeof e),
    over: cb.over === 'win' ? 'loss' : cb.over === 'loss' ? 'win' : cb.over,
    ...(cb.lastSeen ? { lastSeen: { pc: cb.lastSeen.foe, foe: cb.lastSeen.pc } as any } : {}),
    ...(cb.sightWas ? { sightWas: { pc: cb.sightWas.foe, foe: cb.sightWas.pc } as any } : {}) };
}
