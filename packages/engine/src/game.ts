// The game: one state, one reducer. Every change is an action the engine checks against the rules (CLAUDE.md:
// "the engine owns numbers"). Players' clicks, the Narrator's tool calls and the host's buttons all come here.
import { ARCHETYPES, ATTRS, CLASS, CLASSES, PERK, TRAITS, SKILL, TN_LADDER, WEAPON, XP_SOURCES, ITEM, SIGIL, SCHOOL, MODULE, TONE, ENEMY, MANA_BANDS, levelGiven, fightLevelOf } from './data';
import provingJ from '../../../data/campaigns/proving.json';
import classesJ from '../../../data/classes.json';
import {
  type Character, type Sheet, restockResources, advancedClassError, applyLevels, RANK_LEVEL, canRaise, comboEligible, grantAutomaticPerks, maxHp, mod, checkMod, SAVE_SKILL_OF, newCharacter,
  packOf, magsOf, roundsOf, loadAll, equip, unequip, fitMod, handEntry, emptyHand, type Rarity, type PackItem, magazineSize, maxDurOf, hasEvoker, carriesEvoker, carriesEmanator, focusHand, inHands, twoHands, FOCUS_IDS, xpForLevel, classRank, passive, pendingPerkSteps, validateSheet, plotItem, plotId, type OutburstDesign, maxMp, wordsKnownCap, moduleSlots, readyDesigns, hasEmanator, traitGainError, armourCap, collectGuns, partError, startCollection,
} from './character';
import { drawGlyph, evoke as evokeSpell, scuff as scuffGlyph, vent as ventFlux, swapCore, beginOutburst, releaseOutburst, pumpOutburst, letGo, steadyHeart, feedOutburst, setHeartWatch, magicTurnEnd, migrateHeld, type HeldOutburst, syphon as syphonMana, crystallise as crystalliseCore, magicToCharacter, manaOf, MANA_START, CORE_CHARGE, noteDeaths, magicRoundTick, magicTurnStart, condTurnEnd, spellTargets, type Glyph, type Zone, type Trace, strikeTurret, evokeTargets, migrateStorySigil, secretFrom, SIGIL_REV } from './magic';
import { setDevotionXp, devotionThreshold, migrateCharacterSigils, migrateCharacterSoul, migrateCharacterClass, migrateCharacterFocus, migrateCharacterMp, migrateCharacterItems, classPickError, isMedicChar, ADVANCED_SHELVED, migrateDesign, sameSchoolError, checkOutburstDesign, designShapeError, pairingError } from './character';
import { setGearService, isPressed, useTechnique, TECHNIQUE, TECHNIQUES, PHYS_RULES, ensurePhys, physOf, readyError, takePick, addDrill, startingTechniquesError, weaponSystem, loadQuiverWith, addPressureTo, lowerPressureOf, pressureOf, ensureMomentum, type TechArgs, type TechSystem } from './physical';
import { levelFoeMagic, stampFxHp, trimFx, unitSees, sideSees, pullFree, dropNailed, dropStuck, effectiveArmour, setEffectiveArmour, reloadHands, resourcesFor, type Combat, noteSighted, type MapDef, type AttackMode, type FxEvent, FX_CAP, emitFx, sightFx, sightQuietly, useWeaponSkill, fieldRepair, pairedAttack, fireBurst, fireAuto, shove, toggleProne, brace, setOverwatch, MAPS, keyOf, refOf, standable, walkable, defaultObjects, spotTraps, dist, toggleDoor, active, analyze, pickUp, loadMagazine, shootCover, movePaths, routeTo, checkOver, clearJam, combatXp, endTurn, enemyTurn, moveUnit, previewAttack, reload, resolveAttack, startCombat, useStim, paths, apForTiles, unitFromCharacter, unitFromEnemy, beginTurn, dropToPile, objectsOf, lineOfSight, litAt, isMelee, attackApCost, effectiveRange } from './combat';
import { type Rng, seedFrom } from './rng';
import { rollD20, rollVs, judge } from './rolls';
import { CALL, useCall, callView, briefBefore, briefAfter, type CallArgs } from './calls';
import { type Campaign, builtInCampaign, validateCampaign, zoneToMap, expandCampaign } from './campaign';
import { nearestFree } from './maplayout';
import { spotlight, markAction, clearAction, critMoment } from './spotlight';
import { type MusicState, musicOf, startSong, songEnded, pinSong, unpinSong, musicAfterFight, musicOnTravel, musicTraitOf, songMod, noteFightSong, SONG_AP } from './music';
import { type Memory, type MemOp, type MemEdit, editMemory, memoryOf, applyMemOp, canon, noteScene, rollChapter, chapterDue, findPerson, SCENES_PER_CHAPTER } from './memory';
import { type MapObject, type Approach, type CacheItem, OBJ, makeObject, kindOf, blocksMove, isTrap, mergeApproaches, ensureMark, MARK } from './objects';
import type { Hazard } from './hazards';
import { type Where, setWhere } from './missions';
import { type Trigger, type WorldEvent, worldAfter, tryApproach, approachResult, talkAsk, carry as carryNpc, putDown, search as searchCache, examineTriggers, enterTriggers, cleanApproaches, cleanItems, npcTalkFields, avatarOf,
  applyHazardOp, applyTriggerOp, eventsSeen, walkStory, zoneHazards, setZoneHazards, landDropped, worldView, hazardEvents, applyGroundOp, pickupWorld, pileFog, worldEvent } from './world';
import { isCache, isPile, packAdd, lootToPack, itemLabel, magItem, dropOnTile, PILE } from './containers';
import { type Drops, type LootTable, cleanDrops, cleanTables } from './loot';
import { type GearOp, gearPlan, packRef } from './gear';
import { applyDamage } from './effects/damage';
import { itemAmount } from './effects/amounts';
import { actionAp } from './effects/core';
import { ATTEMPT_AP, FIGHT_CONDS, FIGHT_COND_NAME, FIGHT_COND_ROUNDS, attemptWhy, fightRulingOf, narratorOff, openRuling, talkOf, type FightAnswer, type FightCond, type FightEffect, type FightOutcome, type FightRuling } from './fighttalk';
export * from './fighttalk';
import { advancedActive, bindGame, boundGame, heldOfChar, emit as emitHook, emitStory, holdersOf, checkQuery, perkActionsFor, previewPerkAction, runPerkAction, windowStep, pendRuling, setStoryPoster, gainEcho, skillRollMod, xpAfter, uses as usesOf, scopeOf, dayOf, actionDefs, itemKey, type PendingRuling, type ActionArgs } from './effects';
import { surrender as yieldUnit } from './tactics';
import { deedGrant } from './deeds';
import { condSkillMod, STORY_CARRY } from './magic';
import { throwItem, parley, hideAction, extinguish, escapeGrapple, recoverWeapon, hide as hideUnit, AMMO_TYPES, ammoId, KINDS, FOE_TAGS, companionUnits, type FoeTraits } from './tactics';
import { condSource, applyCond as applyCondition, isCondition, condOn, endCond, revertPump } from './magic';
import { FEELING, feelChar, feelOverreach, feelNewZone, setFeelStoryNote } from './feelings';
import { soulPickError, moduleGateError, moduleShelved, secondWeaponWhy, armourGateWhy } from './character';
import { type MissionState, oocOf, askOoc, startMissions, missionTurn, placeBoardNpc } from './missions';
import { type FaithAction, faithReloaded, faithReduce, bindFaith, bindFaithSight, combatPray, faithFightEnd, makePact, grantPiece, narratorDevotion, narratorRite, apostasy, patronOf, devotionNow, beliefOf, migrateCharacterFaith, encoreBefore, encoreAfter, FAITH_PATRON, VOW } from './faith';
import './perks';
import './classes';
import { runGift } from './classes/i';
import { readGlyph, readDrawnBy } from './sigil';
import { masterySync, learnStudied, noteToStudy, learnedElsewhere, growthOf, WORD_MASTERY } from './sigilgrowth';
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
  poi?: { objId: string; idx: number; /** Rules 1.7: what it is on (an object by default, a hazard, a person). */ kind?: 'obj' | 'hazard' | 'npc' };
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
    glyphs?: Glyph[]; zones?: Zone[]; glyphMap?: string; mana?: number; /** Rules 1.10: scuffed glyphs' traces. */ traces?: Trace[];
    /** The last id number given to placed Sigil magic on the area map (glyphs 'gl', zones 'z', RAISE walls 'sw'): kept
     * so ids never repeat between area-map actions (an Evoke uses its glyphs up, a wall outlives them). */
    glyphSeq?: number;
    magic?: Record<string, { flux: number; strain: number; held: HeldOutburst | null; conds?: Record<string, number>; shield?: number; cast?: boolean; condBy?: Record<string, string>; condVia?: Record<string, string>;
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
    /** Rules 1.7 (world.ts): hazards on every zone's map (each names its zone), the Narrator's triggers (never in a
     * player's view), and what the engine ran since the Narrator's last turn (host only). */
    hazards?: Hazard[]; triggers?: Trigger[]; events?: WorldEvent[];
  };
  checks: Check[]; overreach: Overreach[]; combat: Combat | null;
  awards: { charId: string; perkId: string }[];
  narrator: { /** Rules 1.14: the host's browser has no AI Narrator set up (no key): attempts in a fight are refused. */ offline?: boolean; busy: boolean; error: string | null; /** g.seq when the in-flight call began: later rulings weren't in its prompt. */ beganSeq?: number; usage: { input: number; output: number; cacheRead: number; costUsd: number; calls: number; last?: number; max?: number; recent?: number[]; rewrites?: number } };
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
  /** Rules 1.6.1 (item 709): the day counter, from 1 (old saves: 1; dayOf). A long rest is a day; the Narrator's turn
   * field days adds more (travel, time skips). The pact cooldown after leaving a patron counts it. */
  day?: number;
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
  /** Rules 1.6.1 (item 709): days that pass (travel, a time skip), a whole number from 1 to 3650; a long rest is a day already. */
  days?: number;
  /** Things a character now understands (Lab Coat's identified rules, an item's nature): by name. */
  identify?: { charId: string; what: string }[];
  /** A tutor met (spec: Classes, advanced classes): the advanced class id it can teach. */
  tutors?: { charId: string; classId: string }[];
  /** Patron pacts and Devotion (spec: Patrons and prayer): make a pact (patron id), or move Devotion XP by devotion (the
   * legacy path: the same −6..+5 and session cap as faith devotion). */
  patrons?: { charId: string; patron?: string; devotion?: number; reason?: string }[];
  /** Rules 1.6.1: the Narrator's faith events (faith.ts): a pact, a knowledge piece, Devotion XP −6..+5 with a reason
   * (gains capped at +10 a session per character), a Narrator rite kept, apostasy. */
  faith?: { charId: string; op: 'pact' | 'piece' | 'devotion' | 'rite_kept' | 'apostasy'; patron?: string; from?: string; delta?: number; reason?: string; rite?: string }[];
  /** The patron's mood: the TN of prayers to it (12 by default). */
  patronMood?: { patron: string; tn: number }[];
  overreach?: { charId: string; skill: string; push: string }[];
  xp?: { charId: string; source: string; amount: number; reason?: string }[];
  deeds?: { charId: string; perkId: string; deed: string }[];
  /** A Legendary Deed (item 1006): +1 Attribute point, and one Attribute point may stand 1 above the level's ceiling. */
  legends?: { charId: string; deed: string }[];
  /** A story moment to show (an illustration), by id; only those open in this zone count. */
  moment?: string;
  /** Mechanical actions a player declared in words ("I move to A15 and shoot the guard"), run by the engine as that
   * player's own actions when the next round opens, from their fresh AP, with every normal rule (spec: Overworld rounds). */
  actions?: { charId: string; act: WorldAct; to?: string; how?: 'move' | 'sprint' | 'sneak'; targetId?: string; mode?: AttackMode; objId?: string; word?: string; stroke?: string; feeling?: string; tile?: string; aim?: string; design?: string; hold?: boolean; watch?: boolean; on?: boolean; aims?: string[]; dest?: string; order?: string; orderTo?: string; paint?: string; tactical?: boolean; hand?: 'main' | 'off' | 'both';
    /** Rules 1.7: attempt: the approach's number as listed (1 = the first); ask: wants or objective. */ index?: number; what?: 'wants' | 'objective' }[];
  /** Place, move, update or remove people and enemies on the overworld map; rules 1.7: carry (id, charId) and drop
   * (id, charId, at) a creature in the story, and every person's face (kind, avatar) and talk (wants, knows, talk). */
  npcs?: { action: 'place' | 'move' | 'update' | 'remove' | 'carry' | 'drop'; id?: string; name?: string; side?: 'hostile' | 'neutral'; tier?: string; weapon?: string; at?: string; kind?: string; tags?: string[]; hidden?: boolean;
    avatar?: string; charId?: string; wants?: string; knows?: { objective: string; hint: string; at?: string }; talk?: NarratorApproach[];
    /** Rules 1.9: what this person drops if they die in a fight (loot.ts; at most 4 items; null clears it on update). */ drops?: Drops | null }[];
  /** Rules 1.7: hazards on the map (place, update, remove): a kind, a severity, tiles or a rectangle, hidden. */
  hazards?: { action: 'place' | 'update' | 'remove'; id?: string; kind?: string; severity?: 'light' | 'heavy'; tiles?: string[]; rect?: { from: string; to: string } | null; hidden?: boolean; name?: string; text?: string }[];
  /** Rules 1.7: triggers that fire without a call: when enter (tiles or rect), examine (objId) or objective; then spawn
   * (npcs[] place shapes), fight (spawn, then a fight of that difficulty) or reveal (ids, or what is near). */
  triggers?: { action?: 'place' | 'remove'; id?: string; when?: 'enter' | 'examine' | 'objective'; tiles?: string[]; rect?: { from: string; to: string } | null; objId?: string; objective?: string;
    then?: 'spawn' | 'fight' | 'reveal'; spawn?: NonNullable<NarratorTurn['npcs']>; difficulty?: string; name?: string; reveal?: string[]; text?: string }[];
  /** fromTalk: the fight broke out of the talk just had (Talks Broke Down); absent = the engine's guess from the last check. */
  combat?: { name: string; map?: string; difficulty?: string; fear?: boolean; fromTalk?: boolean; /** Rules 1.15: the fight's level outright (a campaign file, a human Narrator; 1 to 20), or a shift on the squad's level (the AI Narrator: −3 to +2). */ level?: number; level_shift?: number; enemies: ({ name: string; tier: string; weapon: string; at?: string; /** Rules 1.15: this enemy's own level. */ level?: number; /** Rules 1.9: this fight's drops for this enemy (loot.ts; at most 4 items). */ drops?: Drops } & FoeTraits)[] } | null;
  /** The Narrator moves characters on the zone map, by grid reference ("C7"). */
  moves?: { charId: string; to: string }[];
  /** Move the whole party to another zone of the campaign (its id), or "". */
  travel?: string;
  /** Things found or given: a weapon or item id, how many, and for weapons a rarity and an optional name. */
  /** An unknown or empty item id gives a plot item (name, and text as its one-line description); a negative qty takes a plot item back. */
  loot?: { charId: string; item: string; qty: number; rarity?: Rarity; name?: string; text?: string; /** A plate's lesson (a Sigil word; a tone, school or module for a Heart plate). */ note?: string }[];
  /** The Narrator places, updates or removes map objects and points of interest, and writes their approaches. */
  objects?: { action: 'place' | 'update' | 'remove'; id: string; kind: string; at: string; name: string; text: string; hidden?: boolean; locked?: boolean;
    approaches: NarratorApproach[];
    /** Rules 1.7: a cache's contents, in the loot shape. */ items?: CacheItem[];
    /** Rules 1.10: a sigil mark's word (a Sigil word id), age (fresh, old, ancient) and damage (intact, worn, broken). */
    word?: string; age?: string; damage?: string }[];
  /** Rules 1.9 (World Play 1.1): things on the ground. Each entry merges into the pile on its tile: items in the loot
   * shape, plus mag:<weapon id> (one magazine, qty its rounds) and rounds:<calibre>; hidden until spotted. At most 6 a
   * turn, 12 items each (world.ts applyGroundOp). */
  ground?: { at: string; items: { item: string; qty?: number; rarity?: string; name?: string; text?: string; note?: string }[]; hidden?: boolean }[];
  endScene?: { summary: string } | null;
  /** Memory upkeep (spec: The Narrator's memory): people, threads, facts, factions and pins to add or update. */
  memory?: MemOp[];
  /** Magic the story teaches (spec: The Magic panel): a tutor's Sigil word, or an Outburst school or module learned
   * from a moment that shook the character. */
  magic?: { charId: string; word?: string; school?: string; module?: string; tone?: string; feeling?: string; reason?: string }[];
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
  missions?: { mission: string; objective?: string; status?: 'done' | 'failed' | 'revealed'; note?: string; /** Rules 1.7: where it happens. */ where?: Where }[];
  /** The branch to follow when a closed mission leads to several. */
  missionNext?: string;
  /** Side jobs the Narrator adds or settles (never main missions). */
  side?: { id: string; title?: string; text?: string; status?: 'open' | 'done' | 'failed' }[];
};
/** An approach as the Narrator writes it (rules 1.7: fail, objective, failCondition, failItem). */
export type NarratorApproach = { label: string; skills: string[]; tn: number; stakes: string; success: Approach['success']; fail?: Approach['fail']; objective?: string; failCondition?: string; failItem?: string };
export type Action =
  | { type: 'player/join'; id: string; name: string } | { type: 'player/online'; id: string; online: boolean } | { type: 'player/kick'; id: string }
  | { type: 'settings'; patch: Partial<GameState['settings']> }
  | { type: 'char/add'; sheet: Sheet } | { type: 'char/remove'; charId: string }
  | { type: 'session/start' }
  /** The host ends a session and starts the next one in the same room (rules 1.6.1, item 721). */
  | { type: 'session/next' }
  | { type: 'story/speak'; text: string; roll?: boolean; ooc?: boolean } | { type: 'story/skip'; playerId: string }
  | { type: 'narrator/begin' } | { type: 'narrator/turn'; turn: NarratorTurn } | { type: 'narrator/error'; message: string }
  | { type: 'narrator/usage'; input: number; output: number; cacheRead: number; costUsd: number; kind?: 'turn' | 'rewrite' | 'fight' } | { type: 'narrator/retry' }
  // Rules 1.14: an attempt in a fight (1 AP, once a turn) opens one pending fight ruling; the Narrator answers it
  // (the host's client for an AI, the host for a human Narrator) or the host skips it (everything spent comes back).
  // narrator/ready: the host's browser says whether an AI Narrator is set up.
  | { type: 'combat/attempt'; unitId: string; text: string }
  | { type: 'narrator/fight-ruling'; id: string; lines: string[]; effect?: FightEffect }
  | { type: 'narrator/fight-skip'; id?: string; note?: string } | { type: 'narrator/ready'; ready: boolean }
  | { type: 'check/roll'; checkId: string } | { type: 'check/reroll'; checkId: string } | { type: 'check/accept'; checkId: string }
  | { type: 'voice/ask'; charId: string; skill: string } | { type: 'overreach/choose'; id: string; choice: 'indulge' | 'resist' }
  | { type: 'levelup/raise'; charId: string; kind: 'skill' | 'attr' | 'core'; id: string } | { type: 'levelup/class'; charId: string; classId: string }
  | { type: 'levelup/perk'; charId: string; perkId: string }
  | { type: 'combat/move'; unitId: string; to: string; how?: 'move' | 'sprint' | 'disengage'; mods?: string[] } | { type: 'combat/attack'; unitId: string; targetId: string; mode: AttackMode; mods?: string[] }
  | { type: 'combat/shove'; unitId: string; targetId: string } | { type: 'combat/prone'; unitId: string } | { type: 'combat/brace'; unitId: string } | { type: 'combat/overwatch'; unitId: string; mode: 'shot' | 'aimed' | 'melee' }
  | { type: 'combat/gift'; unitId: string; aim: string }
  | { type: 'combat/skill'; unitId: string; targetId?: string } | { type: 'combat/repair'; unitId: string; targetId?: string } | { type: 'combat/paired'; unitId: string; targetId: string; targetId2?: string }
  | { type: 'gear/equip'; charId: string; idx: number | string; to: 'main' | 'off' | 'worn' } | { type: 'gear/unequip'; charId: string; slot: string } | { type: 'gear/mod'; charId: string; idx: number | string }
  | { type: 'combat/reload'; unitId: string; hand?: 'main' | 'off' | 'both'; /** Rules 1.9: the old magazine back in the pack (+1 AP). */ tactical?: boolean } | { type: 'combat/clear'; unitId: string } | { type: 'combat/stim'; unitId: string; targetId: string }
  // Shared subsystems (rules 1.3): throw, swap a hand, pray, talk mid-fight, hide, put out a fire, break a hold, recover a weapon.
  | { type: 'combat/throw'; unitId: string; item: string; tile: string } | { type: 'combat/swap'; unitId: string; from?: 'off' | number | string; mod?: number | string; to?: 'main' | 'off' }
  /** Rules 1.9 gear in a fight (items 684–690): draw from the pack into a hand, or put on a light armour piece ('worn');
   * put away what a hand holds or take a light piece off; drop what a hand holds into the pile on your tile. `item` names
   * a pack entry by its index or its id. */
  | { type: 'combat/equip'; unitId: string; item: number | string; to: 'main' | 'off' | 'worn' } | { type: 'combat/stow'; unitId: string; slot: string } | { type: 'combat/drop'; unitId: string; slot: 'main' | 'off' }
  // Rules 1.6: kind and id name a Whisper, a Hymn or the Miracle (faith/pray in a fight comes here); choice/miracle is the old shape.
  | { type: 'combat/pray'; unitId: string; kind?: 'whisper' | 'hymn' | 'miracle'; id?: string; choice?: string; targetId?: string; targetId2?: string; tile?: string; miracle?: boolean; mods?: string[] }
  | { type: 'combat/parley'; unitId: string; targetId: string; kind: 'persuade' | 'threaten' | 'parley'; text?: string }
  | { type: 'combat/hide'; unitId: string } | { type: 'combat/extinguish'; unitId: string; targetId?: string } | { type: 'combat/escape'; unitId: string } | { type: 'combat/recover'; unitId: string }
  | { type: 'levelup/advanced'; charId: string; classId: string } | { type: 'rest'; kind: 'short' | 'long' } | { type: 'story/ask-rest'; charId: string; kind: 'short' | 'long' } | { type: 'story/pray'; charId: string; text?: string; choice?: string }
  | { type: 'gear/ammo'; charId: string; ammo: string }
  // Plot items (spec: Plot items): hand one to another character, or drop it (gone from the story).
  | { type: 'gear/give'; charId: string; idx: number; to: string; qty?: number } | { type: 'gear/drop'; charId: string; idx: number; qty?: number }
  | { type: 'combat/end-turn'; unitId: string } | { type: 'combat/analyze'; unitId: string; targetId: string }
  | { type: 'combat/pickup'; unitId: string; tile: string; /** Rules 1.9: the pile entries to take (keys or indices); none: everything. */ take?: (string | number)[] } | { type: 'combat/load'; unitId: string } | { type: 'combat/shoot-cover'; unitId: string; tile: string }
  | { type: 'gear/load'; charId: string } | { type: 'story/move'; charId: string; to: string } | { type: 'poi/examine'; charId: string; objId: string } | { type: 'poi/travel'; charId: string; objId: string } | { type: 'poi/try'; charId: string; objId: string; idx: number } | { type: 'story/door'; charId: string; objId: string } | { type: 'combat/say'; charId: string; text: string } | { type: 'combat/door'; unitId: string; tile: string } | { type: 'campaign/load'; campaign: Campaign }
  | { type: 'award/ack'; charId: string; perkId: string }
  // Rules 1.7: the Talk panel's asks (1 AP) and approaches (2 AP; poi/try works too), and Search in a fight.
  | { type: 'talk/ask'; charId: string; npcId: string; what: 'wants' | 'objective' } | { type: 'talk/try'; charId: string; npcId: string; idx: number }
  | { type: 'combat/search'; unitId: string; objId: string }
  | { type: 'world/act'; charId: string; act: WorldAct; feeling?: string; to?: string; how?: 'move' | 'sprint' | 'sneak'; targetId?: string; mode?: AttackMode; objId?: string; word?: string; stroke?: string; tile?: string; aim?: string; design?: string; hold?: boolean; aims?: string[]; dest?: string; order?: string; orderTo?: string; paint?: string; id?: string; actionId?: string; choice?: string; text?: string; npc?: string; mods?: string[]; unit?: string;
    /** Rules 1.7: attempt's approach number (1 = the first, as the Narrator lists them) or idx (0-based, the web's); ask's what. */ index?: number; idx?: number; what?: 'wants' | 'objective';
    /** Rules 1.9: reload's tactical choice and hand (off, both); pickup's entries (keys or indices; none: everything). */ tactical?: boolean; hand?: 'main' | 'off' | 'both'; take?: (string | number)[] }
  // Magic (spec: Mana, rules 1.2)
  | { type: 'combat/draw'; unitId: string; word: string; tile: string; /** Rules 1.10: the stroke it extends (an id from previewDraw's strokes) or 'new'; none takes the default. */ stroke?: string } | { type: 'combat/evoke'; unitId: string; tile: string; aim?: string; aims?: string[]; dest?: string; order?: string; orderTo?: string; paint?: 'spread' | 'push'; /** Rules 1.10 Junctions: on a junction's tile, which stroke to Evoke. */ stroke?: string } | { type: 'combat/strike-turret'; unitId: string; tile: string } | { type: 'combat/scuff'; unitId: string }
  | { type: 'combat/vent'; unitId: string } | { type: 'combat/core'; unitId: string } | { type: 'combat/outburst'; unitId: string; design: string; aim?: string; hold?: boolean; watch?: boolean }
  | { type: 'combat/release'; unitId: string; aim?: string } | { type: 'combat/syphon'; unitId: string } | { type: 'combat/crystallise'; unitId: string }
  // Outburst 2.0 (rules 1.5): combat/outburst Begins and holds at stage 0; with an aim (and no hold: true) it is a snap
  // cast, Begin + Release at once at stage 0 (3 AP, ×0.6); then Pump, Release, Let go, Steady the heart, Feed (a glyph on your tile), Heart Overwatch.
  | { type: 'combat/pump'; unitId: string; feeling?: string } | { type: 'combat/revert'; unitId: string } | { type: 'combat/letgo'; unitId: string } | { type: 'combat/steady'; unitId: string } | { type: 'combat/feed'; unitId: string }
  | { type: 'combat/heartwatch'; unitId: string; on?: boolean }
  | { type: 'magic/learn'; charId: string; word?: string; module?: string; school?: string; tone?: string; from: 'ally' | 'plate' } | { type: 'magic/design'; charId: string; design: OutburstDesign } | { type: 'magic/pick'; charId: string; module: string; via?: string } | { type: 'magic/forget'; charId: string; designId: string }
  // Rules 1.10 (Sigil 1.5): learn a word with a study pick (or the Mastered free word, over the cap); read a glyph or a trace (copying).
  | { type: 'sigil/learn'; charId: string; word: string; free?: boolean } | { type: 'combat/read'; unitId: string; tile: string }
  | { type: 'story/pass' } | { type: 'story/focus'; charId: string; objId?: string; hover?: number } | { type: 'story/unfocus' }
  | { type: 'vote/suggest'; kind: 'reroll' | 'edit'; entryId: string; note?: string } | { type: 'vote/dismiss'; id: string }
  | { type: 'vote/start'; kind: 'reroll' | 'edit'; entryId: string; note?: string; suggestionId?: string; undo?: string } | { type: 'vote/cast'; yes: boolean } | { type: 'vote/close' }
  | { type: 'narrator/rewrite'; entryId: string; text: string; refused?: string }
  | { type: 'campaign/refresh' } | { type: 'memory/edit'; edit: MemEdit }
  | { type: 'music/end'; seq: number } | { type: 'music/play'; charId: string } | { type: 'music/pin'; charId: string } | { type: 'music/unpin'; charId: string } | { type: 'combat/song'; unitId: string }
  // Perks, traits and class moves (effects/actions.ts): id is the item key ("perk:earthbreaker") or a bare id.
  | ({ type: 'combat/perk'; unitId: string; id: string; actionId?: string } & ActionArgs) | { type: 'combat/decline'; unitId: string }
  | ({ type: 'story/perk'; charId: string; id: string; actionId?: string } & ActionArgs)
  // Physical 2.0 (rules 1.12; src/physical): a technique in a fight (its arguments are TechArgs: hand, targetId, tile,
  // allyId, line, ammo, opt…); out of a fight, the ready list of a system, a drill pick for a weapon, a bow's quiver
  // (arrows per type), and the Answers this character will use, in order (null: every ready Answer).
  | { type: 'levelup/revert'; charId: string }
  | ({ type: 'combat/technique'; unitId: string; id: string } & TechArgs) | { type: 'combat/pull-free'; unitId: string; targetId?: string }
  // rules 1.13: a Call (calls/). opt: Order's things ('reload+move'); tile: Order's move, Cue's step, Warn's named tile; react: made off your turn, on your reaction (from 9 points)
  | { type: 'combat/call'; unitId: string; id: string; targetId?: string; tile?: string; opt?: string; text?: string; react?: boolean }
  | { type: 'phys/ready'; charId: string; system: TechSystem; ids: string[] } | { type: 'phys/pick'; charId: string; weaponId: string; id: string }
  | { type: 'phys/quiver'; charId: string; weaponId: string; load: Record<string, number> } | { type: 'phys/answers'; charId: string; ids: string[] | null }
  | SandboxAction
  // Blessing 2.0 (rules 1.6): prayers, vows, rites, and the Narrator's pacts, pieces, Devotion and apostasy (faith.ts).
  | FaithAction;

/** A person or enemy on the overworld map. Neutral ones turn hostile when attacked. */
export interface Npc { id: string; name: string; side: 'hostile' | 'neutral'; tier: string; weapon: string; pos: string; /** Rules 1.15: its own level, if it has one (else the fight's). */ level?: number; portrait?: string; facing?: [number, number]; analyzed?: boolean;
  /** A Sigil caster archetype (enemies.json `casters`; rules 1.4, ai-sigil.ts): it fights with an Evoker. */ caster?: string;
  /** What it is and its tags (rules 1.3: human, robot, crawler…; military, hunter, no_surrender…); a prisoner who gave up. */
  kind?: string; tags?: string[]; prisoner?: boolean;
  /** Its scene conditions out of combat (Shaken for the rest of the scene…): id → the scene number it lasts through. */
  conds?: Record<string, number>;
  /** HP carried from a fight it walked away from (the Proving Ground's stopped fight); absent = full. */
  hp?: number;
  /** Lurking: placed by the Narrator as unseen (a sneaking hostile, an ambush in wait). Its token is hidden from the
   * players until an item or a spot reveals it (Wind on the Skin, Skin Map, Sixth Sense), and it starts a fight Hidden. */
  hidden?: boolean;
  // ---------- rules 1.7 (world.ts) ----------
  /** Its face: an art id (avatarOf picks one by kind when unset). */ avatar?: string;
  /** What they want (one plain line; shown once asked), what they know (an objective and a one-line hint, with an
   * optional tile it points to; shown once asked or told), and their talk approaches. */
  wants?: string; knows?: { objective: string; hint: string; at?: string }; talk?: Approach[];
  /** On the party's side (a talk success on someone neutral); asked what they want; told their hint; alerted by an alarm. */
  ally?: boolean; wantsShown?: boolean; informed?: boolean; alerted?: boolean;
  /** In a player's view only: they want something, not yet asked (the words are stripped; world.ts worldView). */ wantsHidden?: boolean;
  /** Rules 1.9 drop tables (loot.ts): what they drop if they die in a fight, from the campaign or the Narrator (never in a player's view). */ drops?: Drops }

export type WorldAct = 'move' | 'end' | 'reload' | 'pickup' | 'load' | 'clear' | 'repair' | 'prone' | 'stim' | 'analyze' | 'read' | 'attack' | 'door' | 'perk' | 'carry' | 'put_down' | 'search' | 'attempt' | 'ask'
  | 'draw' | 'evoke' | 'scuff' | 'vent' | 'core' | 'outburst' | 'release' | 'syphon' | 'crystallise' | 'pump' | 'letgo' | 'steady' | 'feed' | 'heartwatch' | 'revert';
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
// The faith rules (faith.ts) take these from here rather than importing game.ts (rules 1.6).
bindFaith({ push: (g, e) => push(g, e), rollMod: (g, c, skill, roll) => sideRollMod(g, c, skill, roll), isHost, apLeft: (g, c) => apLeft(g, c), spendAp: (g, c, n) => spendAp(g, c, n), afterStory: (g) => closeRoundIfDone(g) });
bindFaithSight((cb, u, t) => unitSees(cb, u, t.pos));
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
  const err = validateSheet(sheet) || startingTechniquesError(sheet as any); if (err) return err;
  // Rooms carry only the small copy of an uploaded portrait (spec: Character files); the full one stays in the file.
  if (typeof sheet.portrait === 'string' && sheet.portrait.length > PORTRAIT_MAX) return 'That portrait is too big for a room. Re-upload it on the creation screen.';
  if (JSON.stringify({ ...sheet, portrait: '' }).length > SHEET_MAX) return 'That character carries too much text for a room.';
  if (!g.players.some((p) => p.id === by)) return 'Join the room first.';
  if (charsOf(g, by).length >= 2) return 'Two characters per player at most.';
  return null;
}

/** Rules 1.9 (item 678): an old save's fight floor (dropped magazines) becomes piles on the fight's map, once; a finished
 * fight on the current zone's map leaves them on the area map too (the fight's objects were already copied there). */
function migrateFloor(g: GameState) {
  const cb = g.combat; if (!cb || !cb.floor) return;
  const list = cb.floor.filter((f) => f.weapon && WEAPON[f.weapon]); delete cb.floor;
  for (const f of list) dropOnTile(objectsOf(cb), f.pos, [magItem(f.weapon!, f.rounds || 0)]);
  if (cb.over && g.phase !== 'combat' && zoneMap(g).id === cb.map.id) for (const f of list) dropOnTile(storyObjects(g), f.pos, [magItem(f.weapon!, f.rounds || 0)]);
}
/** A save as it comes off the disk or the wire, before any screen draws it: renamed and removed perks and traits are
 * settled on every sheet (the other migrations wait for the first action, as before). */
export function migrateLoaded<T extends GameState | null | undefined>(g: T): T {
  try { for (const c of Object.values((g as any)?.characters || {})) migrateCharacterItems(c as any); } catch { /* a save this old is handled by apply */ }
  return g;
}
export function apply(state: GameState, action: Action, by: string): GameState {
  const g: GameState = JSON.parse(JSON.stringify(state));
  // Items' handlers see this game (h.g, h.c) for the length of the action: one synchronous step, so deterministic.
  const was = bindGame(g);
  for (const c of Object.values(g.characters || {})) {
    const cls0 = c.classId, mpRev0 = c.mpRev, notes = [...migrateCharacterSigils(c), ...migrateCharacterSoul(c), ...migrateCharacterClass(c), ...migrateCharacterFocus(c), ...migrateCharacterFaith(c), ...migrateCharacterItems(c), ...migrateCharacterMp(c)]; // rules 1.4 words (item 441), rules 1.5 designs, Revision 3 classes, a focus in hand (item 630), Devotion XP (item 715)
    // rules 1.24 (item 1348): Max MP left Virtue; a fight saved before it holds the old pool in its units: the same share of the new one
    if (c.mpRev !== mpRev0) for (const u of g.combat?.units || []) if (u.charId === c.id && !u.companion && u.mg && u.mg.mpMax > 0) { const mx = maxMp(c); if (mx !== u.mg.mpMax) { u.mg.mp = Math.max(0, Math.min(mx, Math.round(u.mg.mp * mx / u.mg.mpMax))); u.mg.mpMax = mx; } }
    if (c.classId !== cls0) refreshClassUnits(g, c); // migrated mid-fight: its units' held class and resources follow
    // rules 1.11 (item 930): a fight saved before the rank needed a level holds the old rank in its units; they follow the sheet
    else if (c.classId && (g.combat?.units || []).some((u) => u.charId === c.id && !u.companion && u.held && u.held.rank !== classRank(c))) refreshClassUnits(g, c);
    if (g.story?.entries) for (const n of notes) push(g, { kind: 'system', text: n });
  }
  migrateFloor(g); // rules 1.9: an old save's floor becomes piles, once
  if (g.combat) trimFx(g.combat); // older effects go now; this action's own are never cut (a long hostile phase is one action)
  try { reduce(g, action, by); worldAfter(g); } finally { bindGame(was); } // rules 1.7: Downed carriers drop, objective triggers
  if (g.combat) stampFxHp(g.combat); // HP changed by the last effect of this action is stamped on it
  if (state.phase !== 'combat' && g.phase === 'combat' && !g.sandbox) for (const c of Object.values(g.characters || {})) delete (c as any).lvlUndo; // a fight settles a level-up: no taking points back after using them
  // Rules 1.10 (Sigil 1.5): Mastery in Brain Power, Rumination or Eloquence pays its study (and the Mastered free word) once.
  for (const c of Object.values(g.characters || {})) { const notes = masterySync(c); if (g.story?.entries) for (const n of notes) push(g, { kind: 'system', text: n }); }
  if (g.sandbox && action.type.startsWith('levelup/')) sandboxResync(g, (action as { charId: string }).charId);
  if (g.sandbox?.fx) fxRoomAfter(g);
  if (g.sandbox) { const was2 = bindGame(g); try { sandboxAfter(g, action, by); } finally { bindGame(was2); } } // the Proving Ground's roster (multiplayer)
  if (g.combat && g.phase === 'combat') noteSighted(g.combat); // what the party has seen so far (the fight music reads it)
  // The fight's song (spec: Music): picked once when the fight begins. A fight that was already under way without one
  // (a save from before the song pool) keeps Gunline. "The same fight": no fight began in this action (every path
  // that starts one bumps music.fight or the Proving Ground's fights), so a retry or a new wave on an old save picks.
  if (g.combat && g.phase === 'combat') noteFightSong(g, !!state.combat && state.phase === 'combat' && !state.combat.song
    && (state.music?.fight || 0) === (g.music?.fight || 0) && (state.sandbox?.fights || 0) === (g.sandbox?.fights || 0));
  if (g.combat && g.phase === 'combat') sightFx(g.combat); // presentation: a hostile that came into a side's sight (a reveal, a death that left a side blind…)
  g.v++;
  return g;
}

/** A character's class changed under a fight (a Revision 2 save migrated mid-fight): each of its units in the fight
 * takes the new class and rank (u.held) and the new class's resources (a resource both classes have keeps its count,
 * up to the new maximum; one the new class doesn't have is gone). */
/** A class rank reached, by the attribute (5, 8) or by the level (6, 12; rules 1.11): say which moves it brings, and
 * let the character's units in a running fight hold the new rank (their held class is a snapshot). */
export function rankReached(g: GameState, c: Character, rankBefore: number) {
  if (!c.classId || !rankBefore || classRank(c) <= rankBefore) return;
  const r = ['', 'I', 'II', 'III'][classRank(c)], mv = ((CLASS[c.classId] as any).ranks?.[r]?.moves || []).map((m: any) => m.name).join(', ');
  push(g, { kind: 'system', text: c.name + ' reaches ' + CLASS[c.classId].name + ' ' + r + (mv ? ': ' + mv : '') + '.' });
  refreshClassUnits(g, c);
}
function refreshClassUnits(g: GameState, c: Character) {
  for (const u of g.combat?.units || []) {
    if (u.charId !== c.id || u.companion) continue;
    if (u.held) u.held = heldOfChar(c);
    const r = resourcesFor(c), old = u.res || {};
    if (!r) { delete u.res; delete u.resMax; }
    else { for (const id of Object.keys(r.res)) if (old[id] != null) r.res[id] = Math.min(r.resMax[id], old[id]); u.res = r.res; u.resMax = r.resMax; }
    // rules 1.12: Momentum is everyone's who holds a melee weapon, whatever the class gives; what was built is kept
    ensureMomentum(u); if (old.momentum != null && u.resMax?.momentum != null) u.res!.momentum = Math.min(u.resMax.momentum, old.momentum);
  }
}

/** The faith actions (rules 1.6, faith.ts). A prayer in a fight is a combat action (the turn, AP, the windows, the
 * enemies' turns after): it goes through combat/pray. In the Proving Ground the story stays open (no Narrator). */
function faithAction(g: GameState, a: FaithAction, by: string) {
  if (a.type === 'faith/pray' && g.phase === 'combat' && g.combat && !g.combat.over) {
    const u = g.combat.units.find((x) => (a.unitId && x.id === a.unitId) || (!!a.charId && x.charId === a.charId)); if (!u) fail('Pray on your turn.');
    combatAction(g, { ...a, type: 'combat/pray', unitId: u!.id } as Action, by); return;
  }
  const err = faithReduce(g, a, by); if (err) fail(err);
  if (g.sandbox && g.phase === 'story') { g.story.ap = {}; g.story.ended = {}; g.story.needs = false; g.story.work = null; g.story.await = 'players'; }
}

function reduce(g: GameState, a: Action, by: string) {
  if (a.type.startsWith('sandbox/')) { sandboxAction(g, a as SandboxAction, by); return; }
  if (a.type.startsWith('faith/')) { faithAction(g, a as FaithAction, by); return; } // rules 1.6 (faith.ts)
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
    case 'session/next': {
      // Rules 1.6.1 (item 721): a room plays many sessions. The host ends this one and the next begins: recovery as at a
      // session's start, Echo 1, and every once-a-session thing starts over (rites, the Miracle, the faith caps, grudges).
      if (!isHost(g, by)) fail('Only the host starts the next session.');
      if (g.sandbox) fail('The Proving Ground has no sessions: reset the limits from the tools instead.');
      if (g.phase === 'lobby') fail('The session hasn\'t started.');
      if (g.phase !== 'story') fail('A session ends in the story: win the fight, or get out of it, first.');
      beginSession(g);
      push(g, { kind: 'system', head: 'SESSION ' + g.sessionN, text: 'Session ' + g.sessionN + ' begins (Day ' + dayOf(g) + '): everyone recovers as after a long rest, Echo is back to 1, and once-a-session things start over.' });
      return;
    }
    case 'char/remove': { const c = g.characters[a.charId]; if (!c) return; if (c.owner !== by && !isHost(g, by)) fail('Not your character.'); if (g.phase !== 'lobby') fail('Characters stay once the session starts.'); delete g.characters[a.charId]; return; }
    case 'session/start': {
      if (!isHost(g, by)) fail('Only the host starts the session.');
      if (g.phase !== 'lobby') fail('Already started.');
      if (!Object.keys(g.characters).length) fail('Lock in at least one character.');
      g.phase = 'story'; beginSession(g);
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
    case 'narrator/ready': { if (!isHost(g, by)) fail('Host only.'); if (a.ready) delete g.narrator.offline; else g.narrator.offline = true; return; }
    case 'narrator/fight-ruling': { if (!isHost(g, by)) fail('Only the Narrator can answer that.'); fightRuling(g, a); return; }
    case 'narrator/fight-skip': { if (!isHost(g, by)) fail('Only the host can skip the wait.'); fightSkip(g, a.id, a.note); return; }
    case 'narrator/usage': {
      if (!isHost(g, by)) fail('Host only.');
      const u = g.narrator.usage; u.input += a.input; u.output += a.output; u.cacheRead += a.cacheRead; u.costUsd += a.costUsd;
      // Rewordings count in the total but are not Narrator turns.
      if (a.kind === 'rewrite') { u.rewrites = (u.rewrites || 0) + 1; return; }
      if (a.kind === 'fight') { (u as any).fights = ((u as any).fights || 0) + 1; return; } // rules 1.14: a fight answer is no Narrator turn
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
      if (ck!.roll!.crit && ck!.roll!.ok && ck!.tn >= 16) {
        const why = 'a critical success on a ' + (ck!.tn >= 20 ? 'Heroic' : 'Hard') + ' check';
        const song = startSong(g, c, why, 'spotlight', (t) => push(g, { kind: 'system', text: t }));
        spotlight(g, { kind: 'crit', char: c.id, reason: why, tn: ck!.tn, skill: ck!.skills[0], song, ...(a.type === 'check/reroll' ? { echo: true } : {}) }); // decision 113: the cut-in
      }
      if (ck!.poi) approachResult(g, ck!);
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
      const m = checkMod(c!, a.skill) + songMod(g, c!, a.skill) + skillRollMod({ c: c! }, a.skill, { roll: 'ask', tags: zoneTags(g) }).add, rd0 = rollD20(g.rng), die = rd0.die, total = die + m, ok = !!hook && judge('roll', rd0, m, hook.tn, { nat: false }).ok; // asking a voice: the total against the hook's TN (no natural 1 or 20: spec 14, item 1473)
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
      feelOverreach(g, c, choice); // rules 1.8: Defiance, Abandon
      o!.choice = choice;
      push(g, { kind: 'overreach', charId: c.id, skill: o!.skill, to: by, head: SKILL[o!.skill].name.toUpperCase() + ' · OVERREACH · ' + (choice === 'resist' ? 'RESISTED (−' + cost + ' ECHO)' : 'INDULGED (+1 ECHO)'), text: choice === 'resist' ? 'You hold it back. Nothing happens.' : 'You let it happen.' });
      push(g, { kind: 'system', text: c.name + (choice === 'resist' ? ' resists an urge.' : ' gives in to ' + SKILL[o!.skill].name + '.') });
      afterPending(g);
      return;
    }
    case 'levelup/raise': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const why = canRaise(c!, a.kind, a.id); if (why) fail(why);
      lvlBefore(c!);
      const rankBefore = c!.classId ? classRank(c!) : 0;
      if (a.kind === 'skill') { c!.skills[a.id] = (c!.skills[a.id] || 0) + 1; c!.unspent.skill--; }
      if (a.kind === 'attr') { c!.attrs[a.id] = (c!.attrs[a.id] || 1) + 1; c!.unspent.attr--; if (a.id === 'endurance') c!.hp += 15;  const fam = ATTRS.find((x) => x.id === a.id)!.core as keyof Character['cores']; if ((c!.cores[fam] || 1) < c!.attrs[a.id]) c!.cores = { ...c!.cores, [fam]: c!.attrs[a.id] }; }
      if (a.kind === 'core') { (c!.cores as any)[a.id]++; c!.unspent.core--; }
      awardAutomatic(g, c!);
      rankReached(g, c!, rankBefore);
      for (const n of masterySync(c!)) push(g, { kind: 'system', text: n }); // paid here so a revert sees it
      lvlAfter(c!);
      return;
    }
    case 'levelup/revert': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      const why = canRevertLevelUp(g, c); if (why) fail(why);
      const u = (c as any).lvlUndo, was = JSON.parse(u.was);
      c!.skills = was.skills; c!.attrs = was.attrs; c!.cores = was.cores; c!.unspent = was.unspent; c!.perks = was.perks;
      if (was.sigilGrowth) (c as any).sigilGrowth = was.sigilGrowth; else delete (c as any).sigilGrowth;
      c!.hp = Math.max(c!.hp > 0 ? 1 : 0, Math.min(c!.hp, u.hp, maxHp(c!)));
      g.awards = (g.awards || []).filter((x) => x.charId !== c!.id || c!.perks.some((p) => p.id === x.perkId));
      delete (c as any).lvlUndo;
      push(g, { kind: 'system', text: c!.name + ' takes back the points spent on this level-up.' });
      return;
    }
    case 'levelup/class': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      // Class Roster Revision 3: the class of the highest attribute (a tie: the player chooses), set for good.
      const why = classPickError(c!, a.classId); if (why) fail(why);
      c!.classId = a.classId; delete (c as any).lvlUndo; // a class is for good: what was spent before it stays spent
      push(g, { kind: 'system', text: c!.name + ' earns a class: ' + CLASS[a.classId].name + '.' });
      return;
    }
    case 'levelup/advanced': {
      // Learning an advanced class (spec: Classes): shelved in Class Roster Revision 3 (the refusal says so); once a batch
      // is back, its attribute pair decides (advancedPairError).
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
      // Rules 1.6: the old story prayer is a Hymn of your patron (Hymn I unless a choice names one), as faith/pray.
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase !== 'story') fail('In a fight, pray on your turn (3 AP).');
      const p = patronOf(c!); if (!p) fail('You have no patron.');
      const h = (p.hymns || []).find((x: any) => x.id === a.choice) || (p.hymns || [])[0]; if (!h) fail('Your patron has no Hymns.');
      const err = faithReduce(g, { type: 'faith/pray', charId: c!.id, kind: 'hymn', id: p.id + '.' + h.id, text: a.text }, by); if (err) fail(err);
      return;
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
      lvlBefore(c!);
      const held = c!.perks.find((x) => x.id === a.perkId);
      if (held) held.tier = 'II'; else c!.perks.push({ id: a.perkId, tier: 'I' });
      push(g, { kind: 'system', text: c!.name + ' takes ' + PERK[a.perkId].name + ' (Tier ' + step!.tier + ').' });
      lvlAfter(c!);
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
      m.used['play:' + c.id] = k; spotlight(g, { kind: 'song', char: c.id, reason: 'plays their song', song: true }); return;
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
      g.campaign = { ...expandCampaign(JSON.parse(JSON.stringify(a.campaign))), custom: true }; // (a layout picture becomes the plain lists: rules 1.16)
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
        if (a.module) { const why = moduleGateError(c!, a.module); if (why) fail(why); } // rules 1.8: gates (item 811)
      } else {
        // A Sigil plate teaches a word; a Heart plate a tone, a school or a module (rules 1.5 section 5, spec 4.4 item 546).
        const lesson = a.word || a.tone || a.school || a.module;
        if (!lesson) fail('A plate teaches a Sigil word (a Sigil plate) or a tone, school or module (a Heart plate).');
        const kind = a.word ? 'sigil_plate' : 'heart_plate', pack = packOf(c!), i = pack.findIndex((x) => (x.item || x.id) === kind && plateLesson(x.note) === String(lesson).toLowerCase());
        if (i < 0) fail(a.word ? 'You carry no plate with that word.' : 'You carry no Heart plate with that lesson.');
        // The lesson must be new, or the plate isn't used up.
        { const k = c!.soulKnown; if (!a.word && ((a.tone && (k?.tones || []).includes(a.tone)) || (a.school && (k?.schools || []).includes(a.school)) || (a.module && (k?.modules || []).includes(a.module)))) fail(c!.name + ' knows that already.'); }
        { const why = teachCheck(c!, a) || (a.module ? moduleGateError(c!, a.module) : null); if (why) fail(why); }
        pack[i] = { ...pack[i], qty: pack[i].qty - 1 }; c!.pack = pack.filter((x) => x.qty > 0 || x.mags);
      }
      const e = teach(g, c!, a, a.from === 'ally' ? 'taught by the squad' : a.word ? 'from a Sigil plate' : 'from a Heart plate'); if (e) fail(e);
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
      if (at < 0 && list.length >= readyDesigns(c!)) fail('You keep ' + readyDesigns(c!) + ' designs ready (Will Power): forget one first.');
      if (at < 0) g.seq++;
      if (learnTone) { const k = (c!.soulKnown ||= { schools: [], modules: [] }); (k.tones ||= []).push(learnTone); }
      if (at >= 0) list[at] = clean; else list.push(clean);
      return;
    }
    case 'sigil/learn': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat') fail('Learn after the fight.');
      const e = learnStudied(c!, a.word, a.free); if (e) fail(e);
      push(g, { kind: 'system', text: c!.name + ' learns the Sigil word ' + SIGIL[String(a.word).trim().toLowerCase()].word + ' (from study' + (a.free === true ? ', the Mastered free word' : '') + ').' });
      return;
    }
    case 'magic/pick': {
      // Rules 1.8 (Outburst 4.0, section 5): a module pick from practice, or a Mastered gate skill's free pick.
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat') fail('Pick after the fight.');
      const via = a.via || 'practice', why = soulPickError(c!, a.module, via); if (why) fail(why);
      const k = (c!.soulKnown ||= { schools: [], modules: [] }); k.modules.push(a.module);
      (c!.soulPicks ||= []).push({ module: a.module, via });
      push(g, { kind: 'system', text: c!.name + ' remembers a new way to shape the heart: ' + MODULE[a.module].name + ' (' + (via === 'practice' ? 'practice' : 'Mastered ' + (SKILL[via]?.name || via)) + ').' });
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
    case 'talk/ask': { tryInSandbox(g, () => talkAsk(g, g.characters[a.charId], by, a.npcId, a.what === 'objective' ? 'objective' : 'wants')); return; }
    case 'talk/try': { tryInSandbox(g, () => tryApproach(g, g.characters[a.charId], by, a.npcId, Math.round(Number(a.idx) || 0))); return; }
    case 'poi/examine': case 'poi/try': case 'poi/travel': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      // Rules 1.7: an approach on an object, a hazard or a person (world.ts tryApproach: the checks, the AP, the roll).
      if (a.type === 'poi/try') { tryInSandbox(g, () => tryApproach(g, c!, by, a.objId, Math.round(Number(a.idx) || 0))); return; }
      if (g.phase !== 'story') fail('Deal with it after the fight.');
      if (g.story.await !== 'players') fail('Wait for the round to open.');
      if (g.story.ended?.[c!.id]) fail(c!.name + ' has ended the turn.');
      if (c!.hp <= 0) fail(c!.name + ' is Downed: an ally\'s stim, or the Narrator, gets them up.');
      if (g.checks.some((k) => !k.done && k.poi && g.characters[k.charId]?.owner === by)) fail('Roll your attempt first.');
      const cost = 1; if (apLeft(g, c!) < cost) fail('Needs ' + cost + ' AP (' + apLeft(g, c!) + ' left).');
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
        examineTriggers(g, c!, o!.id);
        closeRoundIfDone(g); return;
      }
      fail('Unknown action.'); return;
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
      // rules 1.14: speech is free and goes to the Narrator (its next answer in this fight reads the last few lines)
      { const t = talkOf(cb!); t.said = [...(t.said || []), { who: c!.name, text, round: cb!.round }].slice(-6); }
      return;
    }
    case 'gear/equip': case 'gear/unequip': case 'gear/mod': {
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat') { gearForward(g, a, by); return; } // rules 1.9: a combat action at its cost (items 684–690)
      const ref = a.type === 'gear/unequip' ? 0 : a.idx, i = typeof ref === 'number' ? ref : packRef(c!, ref);
      const err = a.type === 'gear/equip' ? equip(c!, i, a.to) : a.type === 'gear/unequip' ? unequip(c!, a.slot) : fitMod(c!, i);
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
    case 'phys/ready': case 'phys/pick': case 'phys/quiver': case 'phys/answers': {
      // Physical 2.0 (rules 1.12): what a character has ready, picks from a drill mark, loads in a quiver. Out of a fight.
      const c = g.characters[a.charId]; if (!c || c.owner !== by) fail('Not your character.');
      if (g.phase === 'combat' && g.combat && !g.combat.over) fail(a.type === 'phys/quiver' ? 'A quiver is filled before the fight.' : 'Change your techniques out of a fight.');
      const e = physAction(c!, a); if (e) fail(e);
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
  // Rules 1.9 (item 682): ammo by id: mag:<weapon> (one magazine; qty its rounds, 1 for a full one) and rounds:<calibre>.
  if (/^(mag|rounds):/i.test(id)) { const its = lootToPack({ item: id, qty: Number(l.qty), name: label }); if (its.length && its.every((x) => x.kind === 'ammo')) {
    for (const it of its) packAdd(pack, it); c.pack = pack; push(g, { kind: 'system', text: c.name + ' gets ' + its.map(itemLabel).join(', ') + '.' }); return; } }
  const rarity = (['standard', 'fine', 'masterwork', 'relic', 'celestial'].includes(l.rarity || '') ? l.rarity : 'standard') as Rarity;
  let given = '';
  let guns: string[] = [];
  if (WEAPON[id]) { given = (label || WEAPON[id].name).slice(0, 60); for (let i = 0; i < Math.min(n, 3); i++) { pack.push({ id, name: given, qty: 1, kind: 'weapon', weapon: id, rarity }); guns.push(id); } if (rarity !== 'standard') given += ' (' + rarity + ')'; }
  else if (id === 'stim_injector' || id === 'essence_of_experience') { if (id === 'stim_injector') c.stims += n; else c.essence += n; given = ITEM[id].name; }
  else if (ITEM[id]) { const note = String(l.note || '').trim().slice(0, 40); given = (label || ITEM[id].name).slice(0, 60) + (note ? ' (' + note.toUpperCase() + ')' : ''); const ex = pack.find((x) => (x.item || x.id) === id && !x.rarity && x.name === given && (x.note || '') === note); if (ex) ex.qty += n; else pack.push({ id, item: id, name: given, qty: n, kind: (ITEM[id] as any).category === 'consumable' ? 'med' : 'tool', ...(note ? { note } : {}) }); }
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
  // Rules 1.13: on a check a gamma skill counts its full points (each gamma first, then the lowest is taken). A story
  // save is not a check: it rolls the family's save skill (Guts, Rumination, Composure) whatever skills were listed,
  // on the plain modifier.
  const isSave = ck.kind === 'save'; if (isSave && ck.family && SAVE_SKILL_OF[ck.family]) ck.skills = [SAVE_SKILL_OF[ck.family]];
  const tags = [...(ck.tags || []), ...zoneTags(g)], cctx = { tags, check: ck, target: ck.target, applies: ck.applies || [], roll: 'check' };
  const sk = ck.skills.map((s) => ({ s, m: (isSave ? mod(c.skills[s] || 0) : checkMod(c, s)) + songMod(g, c, s), it: skillRollMod({ c }, s, cctx) }));
  const mods = sk.map((x) => x.m + x.it.add), low = Math.min(...mods), lowIx = mods.indexOf(low);
  const whole = [...checkQuery({ c }, ck, cctx), ...storyCondMods(g, c, ck)];
  // 'check_mod' {c, ck, tags, add: CheckMod[], tn}: handlers push { add, label } or change tn (tn_mod, in the ladder).
  const cm: any = emitStory(g, 'check_mod', { c, ck, tags, add: [] as { add: number; label: string }[], tn: ck.tn, g });
  const itemMods = [...sk[lowIx].it.labels, ...whole, ...cm.add];
  const m = low + 2 * ck.skills.filter((s, i) => i !== lowIx && (c.skills[s] || 0) > 0).length + whole.reduce((t, x) => t + x.add, 0) + cm.add.reduce((t: number, x: any) => t + x.add, 0);
  const tn = Math.max(TN_LADDER[0], Math.min(TN_LADDER[TN_LADDER.length - 1] + 4, cm.tn ?? ck.tn));
  // 'check_post' {c, ck, die, total, tn, ok, crit, fumble, auto, double}: auto 'success'/'fail', a floor, a reroll.
  // noFumble: a natural 1 is just a low roll (War Footing: hooks gap B11).
  const d0 = rollD20(g.rng).die, cp: any = emitStory(g, 'check_post', { c, ck, die: d0, mod: m, tn, auto: (ck.auto || null) as null | 'success' | 'fail', labels: [] as string[], noFumble: false, g });
  const die = cp.die, total = die + m, crit = die === 20 && cp.auto !== 'fail', fumble = die === 1 && cp.auto !== 'success' && !cp.noFumble;
  const ok = cp.auto === 'success' ? true : cp.auto === 'fail' ? false : judge('roll', { die }, m, tn).ok; // a natural 20 passes, a natural 1 always fails (noFumble only drops the complication)
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
  return checkMod(c, skill) + songMod(g, c, skill) + skillRollMod({ c }, skill, { roll, tags: zoneTags(g) }).add + debuff;
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
  const consc = (c.skills.authority || 0) * Math.sign(amount); // rules 1.13: the Karma award reads Authority (it was Conscience)
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
  if (kind === 'long') g.day = dayOf(g) + 1; // rules 1.6.1 (item 709): a long rest is a day
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
    if (kind === 'long') { if (carriesEmanator(c) && band !== 'thin') { const mx = maxMp(c), mw = c.mp ?? mx; c.mp = Math.min(mx, mw + Math.ceil((mx - mw) * mm)); } restockResources(c); }
  }
  push(g, { kind: 'system', text: (kind === 'long' ? 'A long rest' : 'A short rest') + ': ' + (kind === 'long' ? 'everyone is back to full. Day ' + dayOf(g) + '.' : 'a quarter of everyone\'s HP back; Heat, Flux and Strain reset.') });
}
/** A session begins (session/start, session/next): the counter moves on and it counts as a long rest for recovery, not a
 * day (item 709). 'session_heal' {g, mult}: an item may give a character only part of it (Insomniac's Wired: half of
 * what it would restore; perk-runtime H gap 2). 'session_start' {g, n}: start items, Echo, faction starts (lanes), an
 * expired grudge. */
function beginSession(g: GameState) {
  g.sessionN = (g.sessionN || 0) + 1; g.restN = 0;
  const sh: any = emitStory(g, 'session_heal', { g, mult: {} as Record<string, { hp?: number; mp?: number }> });
  for (const c of Object.values(g.characters)) { const m = sh.mult[c.id] || {}; c.echo = 1; c.hp = Math.max(c.hp, Math.round(c.hp + (maxHp(c) - c.hp) * (m.hp ?? 1))); if (carriesEmanator(c)) c.mp = Math.round((c.mp ?? 0) + (maxMp(c) - (c.mp ?? 0)) * (m.mp ?? 1)); restockResources(c); }
  emitStory(g, 'session_start', { g, n: g.sessionN });
}
/** Days pass (rules 1.6.1, item 709): the Narrator's turn field days, a whole number from 1 to 3650 (clamped; rounded;
 * anything under 1 is ignored). */
export const DAYS_MAX = 3650;
export function advanceDays(g: GameState, n: number): number {
  const d = Math.min(DAYS_MAX, Math.round(Number(n))); if (!Number.isFinite(d) || d < 1) return 0;
  g.day = dayOf(g) + d; push(g, { kind: 'system', text: (d === 1 ? 'A day passes' : d + ' days pass') + ': Day ' + g.day + '.' });
  return d;
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
  // Tutors (rules 1.3) only for advanced classes that are active again (Class Roster Revision 3 shelves them all).
  for (const x of (t.tutors || []).slice(0, 4)) { const c = g.characters[x.charId], adv = ADVANCED_CLASSES.find((a) => a.id === x.classId); if (!c || !adv || !advancedActive(adv.id)) continue; const l = (c.tutors ||= []); if (!l.includes(adv.id)) { l.push(adv.id); push(g, { kind: 'system', text: c.name + ' has found a tutor for the ' + adv.name + '.' }); } }
  // Time first (item 709): the turn's rest and days pass before its faith events, so "months later she swears to Mother
  // Ember" is one turn (the 90-day cooldown counts the days this turn moved on).
  if (t.rest && (t.rest.kind === 'short' || t.rest.kind === 'long')) applyRest(g, t.rest.kind, { settlement: !!t.rest.settlement });
  if (t.days != null) advanceDays(g, t.days);
  // Rules 1.6: a pact (conversion), Devotion moves of at most ±2 with a reason; the patron's mood (a TN) is retired.
  // Rules 1.6.1: Devotion XP from −6 to +5 a move (clamped here, item 627), gains at most +10 a session per character.
  for (const x of (t.patrons || []).slice(0, 4)) {
    const c = g.characters[x.charId]; if (!c) continue;
    const errs: string[] = [];
    if (x.patron && FAITH_PATRON[x.patron] && patronOf(c)?.id !== x.patron) { const e = makePact(g, c, x.patron); if (e) errs.push(e); }
    if (Number.isFinite(x.devotion) && x.devotion && beliefOf(c).kind === 'faithful') { const e = narratorDevotion(g, c, Number(x.devotion), x.reason || 'the Narrator', { clamp: true }); if (e) errs.push(e); }
    for (const e of errs) push(g, { kind: 'system', text: 'Faith (' + c.name + '): ' + e, ooc: true });
  }
  for (const x of (t.faith || []).slice(0, 8)) {
    const c = g.characters[x.charId]; if (!c) continue;
    const err = x.op === 'pact' ? makePact(g, c, x.patron || '') : x.op === 'piece' ? grantPiece(g, c, x.patron || '', x.from) : x.op === 'devotion' ? narratorDevotion(g, c, Number(x.delta) || 0, x.reason || 'the Narrator', { clamp: true })
      : x.op === 'rite_kept' ? narratorRite(g, c, x.rite || '', x.patron) : x.op === 'apostasy' ? apostasy(g, c) : 'Unknown faith op.';
    if (err) push(g, { kind: 'system', text: 'Faith (' + c.name + '): ' + err, ooc: true });
  }
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
// ---------- taking a level-up back (Leon, 11 Nov 2026) ----------
// The points and perk steps spent since the level-up screen's first click can be taken back, until something else
// settles them: a fight starts, a class is earned, or anything but the level-up screen changes the sheet's build.
// What is kept: the build (skills, attributes, points to spend, perks, Sigil study). Revert puts that back as it was.
const lvlBuild = (c: Character) => JSON.stringify({ skills: c.skills, attrs: c.attrs, cores: c.cores, unspent: c.unspent, perks: c.perks, sigilGrowth: (c as any).sigilGrowth ?? null });
/** Before a level-up spend: remember the build as it was (once), unless something else changed it since the last spend. */
function lvlBefore(c: Character) { const u = (c as any).lvlUndo; if (u && u.now !== lvlBuild(c)) delete (c as any).lvlUndo; if (!(c as any).lvlUndo) (c as any).lvlUndo = { was: lvlBuild(c), hp: c.hp }; }
function lvlAfter(c: Character) { const u = (c as any).lvlUndo; if (u) u.now = lvlBuild(c); }
/** Why this character's level-up can't be taken back now, or null. */
export function canRevertLevelUp(g: GameState, c: Character | null | undefined): string | null {
  const u = (c as any)?.lvlUndo; if (!c || !u || u.was === u.now) return 'Nothing to take back.';
  if (u.now !== lvlBuild(c)) return 'Nothing to take back.';
  if (g.phase === 'combat' && !g.sandbox) return 'Not during a fight.';
  return null;
}
function awardAutomatic(g: GameState, c: Character) {
  for (const pid of grantAutomaticPerks(c)) {
    const p = PERK[pid];
    if (p.tier === 'ultimate') { g.awards.push({ charId: c.id, perkId: pid }); const song = startSong(g, c, 'an Ultimate', 'spotlight', (x) => push(g, { kind: 'system', text: x })); spotlight(g, { kind: 'ultimate', char: c.id, unit: unitOfChar(g, c.id), reason: 'an Ultimate', perk: pid, song }); }
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
  const before = c.level, rankBefore = c.classId ? classRank(c) : 0, gained = applyLevels(c);
  if (gained) push(g, { kind: 'system', text: c.name + ' reaches level ' + c.level + (c.level >= 3 && before < 3 ? ' and can earn a class.' : '.') });
  if (gained) rankReached(g, c, rankBefore); // rules 1.11: a rank can come with the level (6, 12)
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
    // a story save rolls its family's save skill, whatever the Narrator listed (rules 1.13)
    const fam = ck.kind === 'save' && ['body', 'brain', 'heart'].includes(ck.family || '') ? ck.family! : null;
    const c = g.characters[ck.charId], skills = fam ? [SAVE_SKILL_OF[fam]] : (ck.skills || []).filter((s) => SKILL[s]).slice(0, 3);
    if (!c || c.dead || !skills.length || !TN_LADDER.includes(ck.tn)) continue;
    const tags = Array.isArray(ck.tags) ? ck.tags.filter((x) => typeof x === 'string').slice(0, 8).map((x) => x.slice(0, 40)) : undefined;
    const applies = Array.isArray(ck.applies) ? ck.applies.filter((x) => typeof x === 'string').slice(0, 6) : undefined;
    const nc: Check = { id: id(g, 'k'), charId: c.id, skills, tn: ck.tn, stakes: ck.stakes || 'The Narrator calls for a check.', done: false, ...(tags?.length ? { tags } : {}), ...(ck.target ? { target: String(ck.target).slice(0, 40) } : {}), ...(applies?.length ? { applies } : {}),
      ...(ck.kind === 'save' ? { kind: 'save' as const, ...(fam ? { family: fam } : {}) } : {}), ...(ck.footnote && g.characters[ck.footnote] ? { footnote: ck.footnote } : {}),
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
  for (const d of t.deeds || []) grantCombo(g, d);
  for (const d of t.legends || []) {
    const c = g.characters[d.charId]; if (!c || c.dead || !String(d.deed || '').trim()) continue;
    c.legends = (c.legends || 0) + 1; c.unspent.attr++; c.deeds.push(d.deed);
    push(g, { kind: 'system', text: c.name + ' has done a Legendary Deed: ' + d.deed + ' +1 Attribute point, and it may go 1 above the ceiling.' });
    canon(g, c.name + ' did a Legendary Deed: ' + d.deed, [c.name], 5);
    const song = startSong(g, c, 'a legendary deed', 'spotlight', (x) => push(g, { kind: 'system', text: x }));
    spotlight(g, { kind: 'legend', char: c.id, unit: unitOfChar(g, c.id), reason: 'a legendary deed', line: String(d.deed).slice(0, 200), song });
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
    // Rules 1.7: the story's moves walk the path, so hazards, traps and triggers on it fire (world.ts walkStory).
    if (g.phase === 'story') walkStory(g, c, k);
  }
  if (t.travel && t.travel !== zoneMap(g).id && campaignOf(g)?.zones.some((z) => z.id === t.travel)) {
    const zo = (g.story.zoneObjects ||= {}); zo[zoneMap(g).id] = storyObjects(g);
    const zn = (g.story.zoneNpcs ||= {}); zn[zoneMap(g).id] = npcsOf(g);
    const fresh = !zo[t.travel];
    g.story.zone = t.travel; g.story.positions = {}; g.story.objects = zo[t.travel] || defaultObjects(zoneMap(g)); positionsOf(g);
    g.story.npcs = zn[t.travel] || initialNpcs(g); g.story.hidden = {}; g.story.sneak = {};
    push(g, { kind: 'system', text: 'The party travels to ' + zoneMap(g).name + '.' });
    if (fresh) for (const c of Object.values(g.characters)) if (!c.dead) feelNewZone(g, c); // rules 1.8: Wonder
    (g.story as any).entered = t.travel; // 'zone_enter' fires once the turn's NPC ops are in (below)
    canon(g, 'The party travelled to ' + zoneMap(g).name + ' (scene ' + g.story.scene.n + ').', [], 2);
    musicOnTravel(g);
  }
  // Rules 1.9 (item 681): a pile entry in objects[] counts with ground[] against the entries a turn (review fix).
  let pileBudget = PILE.narrator_entries_per_turn;
  for (const op of t.objects || []) { if (pileObjectOp(g, op)) { if (pileBudget <= 0) continue; pileBudget--; } applyObjectOp(g, op); }
  for (const op of (Array.isArray(t.ground) ? t.ground : []).slice(0, Math.max(0, pileBudget))) applyGroundOp(g, op); // rules 1.9
  for (const op of t.npcs || []) applyNpcOp(g, op);
  // Rules 1.7: hazards and triggers (world.ts); the events this call saw are consumed.
  for (const op of (t.hazards || []).slice(0, 12)) applyHazardOp(g, op);
  for (const op of (t.triggers || []).slice(0, 12)) applyTriggerOp(g, op);
  eventsSeen(g, began);
  // 'zone_enter' {g, zone}: the party arrived in a zone this turn (Wind on the Skin feels who waits there).
  if ((g.story as any).entered) { const z = (g.story as any).entered; delete (g.story as any).entered; emitStory(g, 'zone_enter', { g, zone: z }); senseLurkers(g, 'zone'); }
  if (typeof t.mana === 'number') g.story.mana = Math.max(0, Math.min(40, Math.round(t.mana)));
  for (const m of t.magic || []) { const c = g.characters[m.charId]; if (!c) continue; if (m.feeling) { if (FEELING[m.feeling]) feelChar(g, c, m.feeling, m.reason || 'the story'); continue; } narratorTeach(g, c, m); }
  if ((t.npcs || []).length) noticeAll(g);
  for (const l of t.loot || []) giveLoot(g, l);
  if (t.endScene?.summary) { g.story.journal.push(t.endScene.summary); noteScene(g, g.story.scene.title, t.endScene.summary); }
  for (const op of (t.memory || []).slice(0, 16)) applyMemOp(g, op);
  // Chapters (recursive summaries): when due, the Narrator writes one; if it keeps not doing so, the engine folds the
  // scene summaries in itself so memory never grows without bound.
  if (memoryOf(g).scenes.length >= SCENES_PER_CHAPTER && (t.chapter?.summary || memoryOf(g).scenes.length >= SCENES_PER_CHAPTER * 2)) rollChapter(g, t.chapter || undefined);
  g.story.queued = t.combat && t.combat.enemies?.length ? [] : (t.actions || []).filter((x) => x && g.characters[x.charId]).slice(0, 6);
  if (t.combat && t.combat.enemies?.length) { startStoryFight(g, t.combat); return; }
  if (g.checks.some((x) => !x.done)) { g.story.await = 'rolls'; return; }
  if (g.overreach.some((x) => !x.choice)) { g.story.await = 'choices'; return; }
  // Results consumed: the next round opens.
  g.checks = []; g.overreach = [];
  newRound(g);
}

/** Rules 1.9 drop tables: the campaign's own tables (loot_tables), cleaned. */
const campTables = (g: GameState): LootTable[] => cleanTables((campaignOf(g) as any)?.loot_tables);
/** Rules 1.9 (item 691): a fight with a prepared encounter's name gives its enemies the campaign's drops, matched by
 * name (first unused match), where no more specific layer (the Narrator's, a person's own) gave them any. */
function encounterDrops<T extends { name: string; drops?: Drops }>(g: GameState, name: string, foes: T[]): T[] {
  const enc = campaignOf(g)?.encounters?.find((e) => e.name.toLowerCase() === String(name || '').toLowerCase()); if (!enc) return foes;
  const used = new Set<number>(), tables = campTables(g);
  for (const f of foes) { const i = enc.enemies.findIndex((e, j) => !used.has(j) && e.name.toLowerCase() === String(f.name || '').toLowerCase()); if (i < 0) continue; used.add(i);
    if (!f.drops && (enc.enemies[i] as any).drops) { const d = cleanDrops((enc.enemies[i] as any).drops, { max: Infinity, tables }); if (d) f.drops = d; } }
  return foes;
}
/** Rules 1.15: a fight with a prepared encounter's name takes the levels its campaign file gives: `level` on an enemy
 * (matched by name, where the fight's own list gave that enemy none) and `level` on the encounter (returned: the fight's
 * level outright, unless the fight was started with one). */
function encounterLevels(g: GameState, name: string, foes: { name: string; level?: number }[]): number | null {
  const enc: any = campaignOf(g)?.encounters?.find((e) => e.name.toLowerCase() === String(name || '').toLowerCase()); if (!enc) return null;
  const used = new Set<number>();
  for (const f of foes) { const i = (enc.enemies || []).findIndex((e: any, j: number) => !used.has(j) && String(e?.name || '').toLowerCase() === String(f.name || '').toLowerCase()); if (i < 0) continue; used.add(i);
    const l = levelGiven(enc.enemies[i].level); if (f.level == null && l != null) f.level = l; }
  return levelGiven(enc.level);
}
/** Tools for tests only: `pinned` lets a fight's enemy carry `fixed` numbers (a target that holds still). The game never
 * turns it on, so a Narrator can name a tier and a level and never a number (rules 1.15). */
export const FIGHT_TOOLS = { pinned: false };
/** Rules 1.15: the level a fight would have now: the average level of the living characters, rounded down. */
export const squadLevel = (g: GameState): number => fightLevelOf(Object.values(g.characters).filter((c) => !c.dead).map((c) => c.level));
/** Start a fight from the story (the Narrator's combat, a trigger's fight): on the current map everyone starts where they
 * stand and every hostile token joins where it stands (a lurker starts it Hidden); then the enemies act if they're first. */
function startStoryFight(g: GameState, combat: NonNullable<NarratorTurn['combat']>) {
  const t = { combat };
  const want = t.combat.map ? mapFor(g, t.combat.map) : null, map = want || zoneMap(g), same = map.id === zoneMap(g).id, pos = positionsOf(g);
  const pcs = Object.values(g.characters).filter((c) => !c.dead).map((c) => ({ c, pos: same ? pos[c.id] : undefined }));
  let foes: any[] = t.combat.enemies.slice(0, 7).map((e) => ({ name: e.name || 'Hostile', tier: e.tier, caster: CASTER[(e as any).caster] || HEART_CASTER[(e as any).caster] ? (e as any).caster : undefined, weapon: WEAPON[e.weapon] ? e.weapon : 'service_pistol', at: e.at || '', kind: e.kind, tags: e.tags, unaware: !!e.unaware, no_surrender: !!e.no_surrender, hidden: !!e.hidden, drops: cleanDrops((e as any).drops, { tables: campTables(g) }), ...(levelGiven(e.level) != null ? { level: levelGiven(e.level)! } : {}), ...(FIGHT_TOOLS.pinned && (e as any).fixed ? { fixed: (e as any).fixed } : {}) }));
  // Hostile people already on this map join the fight where they stand (a listed enemy with the same name is them).
  if (same) { const host = npcsOf(g).filter((n) => n.side === 'hostile' || foes.some((f) => f.name.toLowerCase() === n.name.toLowerCase()));
    const used = new Set<number>();
    for (const n of host) { const i = foes.findIndex((f, j) => !used.has(j) && f.name.toLowerCase() === n.name.toLowerCase()); const f: any = { ...(i >= 0 ? foes[i] : {}), name: n.name, tier: n.tier, weapon: n.weapon, at: refOf(n.pos), id: n.id, portrait: n.portrait || n.avatar, ...(n.hidden ? { hidden: true } : {}), caster: n.caster ?? (i >= 0 ? foes[i].caster : undefined), kind: n.kind || (i >= 0 ? foes[i].kind : undefined), tags: [...(n.tags || []), ...(i >= 0 ? foes[i].tags || [] : [])], drops: (i >= 0 && foes[i].drops) || n.drops, ...((i >= 0 ? foes[i].level : undefined) ?? n.level) != null ? { level: (i >= 0 ? foes[i].level : undefined) ?? n.level } : {} }; if (i >= 0) { foes[i] = f; used.add(i); } else { used.add(foes.length); foes.push(f); } }
    g.story.npcs = npcsOf(g).filter((n) => !host.includes(n)); foes = foes.slice(0, 8); }
  if (!foes.length) return; // nobody to fight (a trigger whose people couldn't be placed)
  encounterDrops(g, t.combat.name || '', foes); // rules 1.9: a prepared fight's enemies bring the campaign's drops
  const encLevel = encounterLevels(g, t.combat.name || '', foes); // rules 1.15: a campaign file may give the fight, or one enemy, a level
  // Another zone's map starts from that zone's stashed objects (rules 1.9 fix: its piles and caches were ignored).
  g.combat = startCombat(t.combat.name || 'Fight', map, pcs, foes, t.combat.difficulty || 'standard', g.rng, same ? storyObjects(g) : g.story.zoneObjects?.[map.id], { fear: !!t.combat.fear, ...(typeof t.combat.fromTalk === 'boolean' ? { fromTalk: t.combat.fromTalk } : {}), level: levelGiven(t.combat.level) ?? encLevel, levelShift: t.combat.level_shift }); magicIn(g, g.combat);
  g.phase = 'combat'; g.story.await = 'none'; musicOf(g).fight++; syncSong(g);
  // Every enemy gets a stable NPC id (its face and its survival after the fight follow it); a story NPC keeps its own.
  g.combat.units.filter((u) => u.side === 'foe').forEach((u, i) => { const f: any = foes[i]; u.npcId = (f && f.id) || 'n' + (++g.seq); if (f && f.portrait) u.img = f.portrait; });
  { const seen: Record<string, number> = {}; for (const u of g.combat.units) if (u.side === 'foe' && !u.img) { const p = portraitFor(g, u.name, seen); if (p) u.img = p; } }
  push(g, { kind: 'combat', text: 'Combat: ' + g.combat.name });
  runEnemies(g);
}

// ---------- combat actions ----------
function combatAction(g: GameState, a: Action, by: string) {
  const cb = g.combat; if (!cb || g.phase !== 'combat') fail('No fight is on.');
  if (cb!.over) fail('The fight is over.');
  const u = active(cb!)!;
  // rules 1.14: the fight waits for the Narrator's answer to an attempt (nobody acts, the turn can't end)
  if (fightRulingOf(cb)) fail('The Narrator is deciding. The fight waits for the answer.');
  // rules 1.13: a Call made as a reaction comes from a unit whose turn it isn't (from 9 points, once a round)
  if (a.type === 'combat/call' && a.react && a.unitId !== u.id) { callReaction(g, cb!, a, by); return; }
  if (!('unitId' in a) || a.unitId !== u.id) fail('It\'s ' + u.name + '\'s turn.');
  // Who gives this unit its orders: its character's player; a companion's owner; a Puppeted enemy's puppeteer (rules 1.3).
  const pup = u.side === 'foe' ? puppeteerOf(g, cb!, u) : null;
  const c = u.charId ? g.characters[u.charId] : u.ctrl ? g.characters[u.ctrl] : pup;
  // The host may end the turn of a unit whose player is offline (they left or dropped), so the fight never stalls on
  // an empty chair (UI pass review: a guest who pressed Leave mid-fight froze everyone at their turn).
  const hostSkip = !!c && c.owner !== by && a.type === 'combat/end-turn' && isHost(g, by) && !g.players.find((p) => p.id === c.owner)?.online;
  if (!c || (c.owner !== by && !hostSkip)) fail('Not your unit.');
  if (hostSkip) cb!.log.push((g.players.find((p) => p.id === by)?.name || 'The host') + ' passes ' + u.name + '\'s turn: ' + (g.players.find((p) => p.id === c!.owner)?.name || 'their player') + ' is away.');
  if ((u.companion || pup) && !COMPANION_ACTS.has(a.type)) fail((u.companion ? 'A companion' : 'A puppet') + ' can move, attack, hold Overwatch and end its turn.');
  if ((u.companion || pup) && a.type === 'combat/technique' && !TECHNIQUE[(a as any).id]?.free) fail((u.companion ? 'A companion' : 'A puppet') + ' makes plain attacks only.'); // rules 1.12: the free techniques
  // A unit with a fixed action list (the drone: move and a plain shot; spec §14 item 370) refuses everything else.
  if (u.allowedActions && a.type !== 'combat/end-turn' && a.type !== 'combat/decline') {
    // a free technique is the plain action it stands for (rules 1.12): Shot is 'shot', Aimed Shot 'aimed', Cut 'melee'
    const id = a.type === 'combat/attack' ? a.mode || 'shot' : a.type === 'combat/move' ? a.how || 'move' : a.type === 'combat/technique' ? ({ shot: 'shot', aimed_shot: 'aimed', cut: 'melee', overwatch: 'overwatch' } as Record<string, string>)[(a as any).id] || 'technique' : a.type.slice('combat/'.length);
    if (!u.allowedActions.includes(id)) fail(u.name + ' can only ' + u.allowedActions.map((x) => ACT_NAME[x] || x).join(', ') + ' and end its turn.');
  }
  const who = u.charId ? c : null; // a companion or puppet fights with its own numbers
  let err: string | null = null;
  const before = cb!.units.map((x) => ({ id: x.id, dead: x.dead, downed: x.downed, hp: x.hp }));
  // Toggles the player set on this action (Ricochet, Nonlethal…), read by items' hooks through modOn(); cleared after.
  const mods = (a as any).mods; cb!.mods = Array.isArray(mods) ? mods.filter((x: any) => typeof x === 'string').slice(0, 8) : [];
  const inWindow = !!cb!.window;
  // Encore (rules 1.6.2, item 729): repeating the action the Laughing Mask's Miracle named lends its AP; settled below.
  const encore = inWindow ? null : encoreBefore(cb!, u, a);
  const brief = briefBefore(cb!, u, a); // rules 1.13: a Brief's discount on this action, lent the same way
  markAction(cb!); // spotlight.ts: this action's fx start here (a spotlight in it slows its playback on the client)
  (cb as any).acting = true; // encoreCredit: previews inside the action don't lend Encore's AP again
  try {
  switch (a.type) {
    case 'combat/perk': { const ap0 = u.ap; err = runPerkAction({ u, c, cb: cb!, g }, a.id, a, g.rng, 'combat');
      // rules 1.14: a perk that asks for words opened the turn's attempt: it carries what the action cost (a no gives it back)
      const fr = fightRulingOf(cb); if (!err && fr && fr.perk && fr.unit === u.id) fr.ap = Math.max(0, Math.round((ap0 - u.ap) * 10) / 10); break; }
    case 'combat/attempt': err = attempt(g, cb!, u, a.text); break;
    case 'combat/decline': if (!cb!.window) fail('There is nothing to decline.'); windowStep(cb!, true); break;
    case 'combat/move': err = moveUnit(cb!, u, a.to, g.rng, a.how || 'move'); break;
    case 'combat/shove': { const t = cb!.units.find((x) => x.id === a.targetId); if (!anyTarget(t, u)) fail('Pick someone else.'); refuseHook(cb!, u, a); err = shove(cb!, g.rng, u, t!); break; }
    case 'combat/prone': err = toggleProne(cb!, u); break;
    case 'combat/pull-free': { // rules 1.12: free yourself, or an ally next to you, from what nails them in place
      const t = a.targetId ? cb!.units.find((x) => x.id === a.targetId) : u; if (!t) fail('Pick who to free.');
      err = pullFree(cb!, u, t!, (it) => takeIntoHand(g, cb!, u, it)); break;
    }
    case 'combat/technique': {
      // Physical 2.0: the technique checks its own targets and tiles (an ally, a tile, several enemies); a tile may come as a map reference.
      const { type: _t, unitId: _u, id, _w: _internal, _pair: _internal2, ...rest } = a as any; const args: TechArgs = { ...rest }; // _w is the core's own mark: never taken from a client
      if (typeof args.tile === 'string') args.tile = tileKey(g, args.tile);
      if (args.targetId && !anyTarget(cb!.units.find((x) => x.id === args.targetId), u)) fail('Pick someone else.');
      if (!TECHNIQUE[id]) fail('No such technique.');
      refuseHook(cb!, u, a); err = useTechnique(cb!, u, id, args, g.rng); break;
    }
    case 'combat/call': { err = runCall(g, cb!, u, a); break; }
    case 'combat/brace': err = brace(cb!, u); break;
    case 'combat/skill': { const t = a.targetId ? cb!.units.find((x) => x.id === a.targetId) || null : null; if (a.targetId && !anyTarget(t || undefined, u)) fail('Pick someone else.'); err = useWeaponSkill(cb!, g.rng, u, t, who); break; }
    case 'combat/gift': err = runGift(g, cb!, g.rng, u, tileKey(g, a.aim)); break;
    case 'combat/repair': err = a.targetId && a.targetId !== u.id ? repairAlly(cb!, u, cb!.units.find((x) => x.id === a.targetId)) : fieldRepair(cb!, u); break;
    case 'combat/paired': { const t = cb!.units.find((x) => x.id === a.targetId), t2 = a.targetId2 ? cb!.units.find((x) => x.id === a.targetId2) || null : null; if (!anyTarget(t, u) || (t2 && !anyTarget(t2, u))) fail('Pick someone else.'); err = pairedAttack(cb!, g.rng, u, t!, t2, c); break; }
    case 'combat/overwatch': { const mode = playerMode(a.mode, ['shot', 'aimed', 'melee'] as const); if (mode !== 'melee' && isPressed(u)) fail('You are Pressed: you can\'t hold a shot.'); refuseHook(cb!, u, a); err = setOverwatch(cb!, u, mode); break; } // rules 1.12: refused before the AP is paid
    case 'combat/attack': {
      const t = cb!.units.find((x) => x.id === a.targetId); if (!anyTarget(t, u)) fail('Pick someone else.');
      if (pup && t!.id === u.id) fail('A puppet can\'t be made to harm itself.');
      const mode = playerMode(a.mode, ['shot', 'aimed', 'melee', 'burst', 'auto'] as const); // 'thrown' is a technique's, never a player's plain attack
      if (mode === 'burst') { err = fireBurst(cb!, g.rng, u, t!, who); break; }
      if (mode === 'auto') { err = fireAuto(cb!, g.rng, u, t!, who); break; }
      const pv = previewAttack(cb!, u, t!, mode); if (!pv.ok) fail(pv.why!);
      resolveAttack(cb!, g.rng, u, t!, mode, who); break;
    }
    case 'combat/reload': {
      refuseHook(cb!, u, a); // an item or rule may refuse it (Physical 2.0: a Drawn weapon's quiver is filled before the fight)
      const ap0 = u.ap; err = a.hand === 'both' || a.hand === 'off' ? reloadHands(cb!, u, a.hand, !!a.tactical) : reload(cb!, u, { tactical: !!a.tactical });
      if (!err) faithReloaded(cb!, u, ap0 - u.ap); // the Quartermaster's intervention (rules 1.6.3, item 742)
      break;
    }
    case 'combat/throw': err = throwItem(cb!, g.rng, u, a.item, tileKey(g, a.tile)); break;
    case 'combat/swap': err = swapWeapon(g, cb!, u, c!, a); break;
    case 'combat/equip': err = gearInFight(g, cb!, u, c!, a.to === 'worn' ? { op: 'wear', item: a.item } : { op: 'draw', item: a.item, to: a.to === 'off' ? 'off' : 'main' }); break;
    case 'combat/stow': err = gearInFight(g, cb!, u, c!, { op: 'stow', slot: String(a.slot || '') }); break;
    case 'combat/drop': err = gearInFight(g, cb!, u, c!, { op: 'drop', slot: String(a.slot || '') }); break;
    case 'combat/pray': err = combatPray(cb!, g.rng, u, { kind: a.kind, id: a.id, choice: a.choice, targetId: a.targetId, targetId2: a.targetId2, tile: a.tile ? tileKey(g, a.tile) : undefined, miracle: a.miracle }, g); break;
    case 'combat/parley': { const t = cb!.units.find((x) => x.id === a.targetId); if (!t) fail('Pick an enemy.'); err = parley(cb!, g.rng, u, t!, a.kind, a.text || ''); break; }
    case 'combat/hide': err = hideAction(cb!, u); break;
    case 'combat/extinguish': { const t = a.targetId ? cb!.units.find((x) => x.id === a.targetId) : u; if (!t) fail('Pick someone burning.'); err = extinguish(cb!, u, t!); break; }
    case 'combat/escape': err = escapeGrapple(cb!, g.rng, u); break;
    case 'combat/recover': err = recoverWeapon(cb!, u); break;
    case 'combat/pickup': err = pickUp(cb!, u, tileKey(g, a.tile), a.take, u.charId ? g.characters[u.charId] : null); break; // rules 1.9: a selection from the pile
    case 'combat/search': { if (!u.charId) fail('Only a character searches.'); searchCache(g, g.characters[u.charId!], a.objId, cb!, u); break; } // rules 1.7
    case 'combat/door': err = toggleDoor(cb!, u, a.tile); break;
    case 'combat/load': err = loadMagazine(cb!, u); break;
    case 'combat/shoot-cover': err = shootCover(cb!, u, a.tile, c); break;
    case 'combat/analyze': { const t = cb!.units.find((x) => x.id === a.targetId); if (!t) fail('Pick an enemy.'); err = analyze(cb!, u, t!); if (!err) readDrawnBy(cb!, u, t!); break; } // rules 1.10: its glyphs are read too
    case 'combat/read': err = readGlyph(cb!, u, tileKey(g, a.tile)); break;
    case 'combat/clear': err = clearJam(cb!, u); break;
    case 'combat/stim': { const t = cb!.units.find((x) => x.id === a.targetId); if (!t || t.side !== u.side) fail('Pick an ally.'); err = useStim(cb!, u, t!, c!, isMedicChar(c!)); break; }
    case 'combat/end-turn': endTurn(cb!, g.rng); break;
    case 'combat/draw': err = drawGlyph(cb!, g.rng, u, a.word, tileKey(g, a.tile), a.stroke); break;
    case 'combat/evoke': err = evokeSpell(cb!, g.rng, u, tileKey(g, a.tile), a.aim ? tileKey(g, a.aim) : undefined, evokeOptsOf(g, a)); break;
    case 'combat/strike-turret': err = strikeTurret(cb!, g.rng, u, tileKey(g, a.tile)); break;
    case 'combat/scuff': err = scuffGlyph(cb!, u); break;
    case 'combat/vent': err = ventFlux(cb!, u); break;
    case 'combat/core': err = swapCore(cb!, u); break;
    case 'combat/outburst': err = beginOutburst(cb!, g.rng, u, a.design, a.aim ? tileKey(g, a.aim) : undefined, a.hold ?? !a.aim, { watch: !!a.watch }); break;
    case 'combat/pump': err = pumpOutburst(cb!, g.rng, u, a.feeling || null); break;
    case 'combat/revert': err = revertPump(cb!, u); break;
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
      u.ap -= SONG_AP; emitFx(cb!, 'song', { unit: u.id, at: u.pos }); spotlight(g, { kind: 'song', char: c!.id, unit: u.id, reason: 'plays their song', song: true }); break;
    }
    default: fail('Unknown action.');
  }
  } finally { delete cb!.mods; delete (cb as any).acting; }
  if (err) fail(err);
  briefAfter(cb!, u, brief);
  encoreAfter(cb!, u, encore);
  // An off-turn window counts the action (its unit is done after its limit; then the next, then the turn resumes).
  if (inWindow && cb!.window && a.type !== 'combat/decline' && a.type !== 'combat/end-turn') windowStep(cb!);
  // 'action_done' {u, a, cb}: after every combat action and its window step (On My Mark settles its debt: hooks gap E-H2).
  emitHook(cb!, 'action_done', { u, a, cb: cb! });
  for (const x of cb!.units) x.ap = Math.round(x.ap * 10) / 10; // Glyph AP comes in tenths: no 3.4000000000000004
  songTriggers(g, u, c!, before);
  critMoment(g); // decision 113: a party crit in this action cuts in (unless a bigger moment already did)
  noteDeaths(cb!, g.rng);
  checkOver(cb!);
  runEnemies(g);
}

// ---------- speaking and attempting in a fight (rules 1.14; items 1008 and 1009, provisional) ----------
/** An attempt: words that want something to happen. 1 AP, once a turn, on your own turn, with a Narrator connected.
 *  It opens the one pending fight ruling; the fight waits for the answer. */
function attempt(g: GameState, cb: Combat, u: Combat['units'][number], text0: string): string | null {
  const text = String(text0 || '').trim().slice(0, 300); if (!text) return 'Write what you attempt.';
  const why = attemptWhy(g, cb, u, ATTEMPT_AP); if (why) return why;
  u.ap = Math.round((u.ap - ATTEMPT_AP) * 10) / 10;
  openRuling(g, cb, u, text, ATTEMPT_AP);
  cb.log.push(u.name + ' attempts (' + ATTEMPT_AP + ' AP): "' + text + '"');
  return null;
}
/** Give back what a fight ruling cost: its AP and, for a perk, the use. Returns what came back, in words. */
function refundFight(g: GameState, cb: Combat, r: FightRuling): string {
  const u = cb.units.find((x) => x.id === r.unit), c = g.characters[r.charId], back: string[] = [];
  if (u && r.ap > 0) { u.ap = Math.round((u.ap + r.ap) * 10) / 10; back.push(r.ap + ' AP'); }
  if (r.perk?.use && c) { usesOf({ key: r.perk.key, c, u, cb, g }).refund(r.perk.use.per as any, r.perk.use.key); if (!['at_will', 'out_of_combat'].includes(r.perk.use.per)) back.push('the use of ' + r.perk.name); }
  return back.join(' and ');
}
/** The host ends the wait with no answer (a dead key, a Narrator who left): everything the attempt cost comes back,
 *  and the turn's attempt with it. */
function fightSkip(g: GameState, id?: string, note?: string) {
  const cb = g.combat, r = fightRulingOf(cb); if (!cb || !r || (id && id !== r.id)) fail('Nothing is waiting for the Narrator.');
  const u = cb!.units.find((x) => x.id === r!.unit), back = refundFight(g, cb!, r!), t = talkOf(cb!);
  delete t.ruling; if (t.attempted) delete t.attempted[r!.unit];
  cb!.log.push((String(note || '').trim().slice(0, 160) || 'The Narrator didn\'t answer.') + (back ? ' ' + (u?.name || 'The speaker') + ' gets ' + back + ' back.' : ''));
}
const UNYIELDING = ['machine', 'robot', 'turret', 'drone'];
/** A unit the speaker may name in a fight ruling: an enemy of theirs still in the fight (by its id, or its name when
 *  only one enemy carries it). */
function fightTarget(cb: Combat, u: Combat['units'][number] | undefined, ref: unknown) {
  if (!u || typeof ref !== 'string' || !ref) return null;
  const foes = cb.units.filter((x) => x.side !== u.side && !x.dead && !x.surrendered);
  const byName = foes.filter((x) => x.name.toLowerCase() === ref.trim().toLowerCase());
  return foes.find((x) => x.id === ref) || (byName.length === 1 ? byName[0] : null);
}
/** A condition or a surrender the Narrator asked for, checked: null when it isn't allowed. afterCheck: it is what a
 *  successful check earned (a surrender then needs no beaten enemy). */
function fightOutcome(cb: Combat, u: Combat['units'][number] | undefined, e: any, afterCheck: boolean): FightOutcome | null {
  if (!e || typeof e !== 'object') return null;
  const hasC = e.condition != null, hasS = e.surrender != null; if (hasC === hasS) return null; // exactly one
  if (hasC) {
    const t = fightTarget(cb, u, e.condition?.target), id = e.condition?.id;
    return t && (FIGHT_CONDS as readonly string[]).includes(id) ? { condition: { target: t.id, id: id as FightCond } } : null;
  }
  const t = fightTarget(cb, u, e.surrender?.target); if (!t) return null;
  if (t.tier === 'boss' || UNYIELDING.includes(t.kind || '') || (t.tags || []).includes('no_surrender')) return null; // it never surrenders
  if (!afterCheck && t.hp > t.maxHp / 2) return null; // only a beaten enemy gives up without a check
  return { surrender: { target: t.id } };
}
/** The one thing the Narrator may ask for, validated (rules 1.14, point 3): a check, one condition, one surrender, or a
 *  yes / no on a perk. Anything else (damage, healing, movement, AP, a second effect) is not on the list: null. */
export function cleanFightEffect(cb: Combat, r: FightRuling, e: any): FightEffect | null {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  const u = cb.units.find((x) => x.id === r.unit);
  const keys = (['check', 'condition', 'surrender', 'perk'] as const).filter((k) => e[k] != null); if (keys.length !== 1) return null;
  if (keys[0] === 'perk') return r.perk && typeof e.perk?.accepted === 'boolean' ? { perk: { accepted: e.perk.accepted } } : null;
  if (keys[0] === 'check') {
    const skill = e.check?.skill, tn = e.check?.tn; if (!u || typeof skill !== 'string' || !Object.prototype.hasOwnProperty.call(SKILL, skill) || typeof tn !== 'number' || !TN_LADDER.includes(tn)) return null; // a real skill id, never an inherited name
    const on = fightOutcome(cb, u, e.check.onSuccess, true);
    return { check: { skill, tn, ...(on ? { onSuccess: on } : {}) } };
  }
  return fightOutcome(cb, u, e, false);
}
/** Apply a checked condition or surrender; returns the log's words for it (' · …'). */
function applyFightOutcome(g: GameState, cb: Combat, u: Combat['units'][number], o: FightOutcome): string {
  if ('surrender' in o) { const t = cb.units.find((x) => x.id === o.surrender.target)!; return yieldUnit(cb, t, u, 'talked down'); }
  const t = cb.units.find((x) => x.id === o.condition.target)!, id = o.condition.id;
  // Hesitates is the engine's own "−1 AP on its next turn" (stunnedNext), the only AP the Narrator may touch.
  if (id === 'hesitates') { t.stunnedNext = Math.max(t.stunnedNext || 0, 1); return ' · ' + t.name + ' hesitates (−1 AP on its next turn)'; }
  return applyCondition(cb, g.rng, u, t, id, FIGHT_COND_ROUNDS, undefined, { skipSave: true });
}
/** The Narrator's answer to the pending fight ruling: one or two lines in the log, and at most one effect, validated
 *  here. An effect that isn't allowed is dropped and the lines still show. The engine rolls a check and keeps every number. */
function fightRuling(g: GameState, a: FightAnswer) {
  const cb = g.combat, r = fightRulingOf(cb); if (!cb || g.phase !== 'combat' || !r) fail('Nothing is waiting for the Narrator.');
  if (a.id !== r!.id) fail('That attempt isn\'t waiting for an answer.');
  if (cb!.over) fail('The fight is over.'); // nothing lands on a finished fight: the host's skip clears the wait
  const lines = (Array.isArray(a.lines) ? a.lines : []).filter((x) => typeof x === 'string').map((x) => x.replace(/\s+/g, ' ').trim().slice(0, 240)).filter(Boolean).slice(0, 2);
  const eff = cleanFightEffect(cb!, r!, a.effect);
  if (!lines.length && !eff) fail('The Narrator\'s answer is empty.');
  const u = cb!.units.find((x) => x.id === r!.unit), c = g.characters[r!.charId], t = talkOf(cb!);
  delete t.ruling;
  for (const l of lines) cb!.log.push('Narrator: ' + l);
  let did = '';
  // A speaker who is dead or Downed when the answer comes rolls nothing and earns nothing; a perk's yes or no still stands.
  const up = !!u && !u.dead && !u.downed;
  if (eff && u && (up || 'perk' in eff)) {
    if ('perk' in eff) {
      if (!eff.perk.accepted) { const back = refundFight(g, cb!, r!); did = r!.perk!.name + ' refused'; cb!.log.push(u.name + '\'s ' + r!.perk!.name + ' is refused' + (back ? ': ' + back + ' come' + (/ and /.test(back) ? '' : 's') + ' back.' : '.')); }
      else did = r!.perk!.name + ' accepted';
    } else if ('check' in eff && c) {
      // The same dice as a story check: d20 + the speaker's modifier against the Narrator's TN; a natural 20 succeeds, a natural 1 fails.
      const sk = eff.check.skill, m = sideRollMod(g, c, sk) + condSkillMod(u, sk), tn = eff.check.tn, rv = rollVs(cb!, g.rng, { by: u, mod: m, tn, why: 'check' }), die = rv.die, total = rv.total;
      const crit = rv.nat === 20, fumble = rv.nat === 1, ok = rv.ok;
      const won = ok && eff.check.onSuccess ? applyFightOutcome(g, cb!, u, eff.check.onSuccess) : '';
      cb!.log.push(u.name + ' · ' + SKILL[sk].name.toUpperCase() + ' CHECK · d20 ' + die + ' ' + (m >= 0 ? '+' : '−') + ' ' + Math.abs(m) + ' = ' + total + ' vs ' + tn + ' · ' + (crit ? '✓ CRITICAL' : fumble ? '✕ CRITICAL FAIL' : ok ? '✓ SUCCESS' : '✕ FAILURE') + won + '.');
      did = SKILL[sk].name + ' check ' + total + ' vs ' + tn + (ok ? ', a success' : ', a failure') + won;
    } else if (!('check' in eff)) { const out = applyFightOutcome(g, cb!, u, eff); cb!.log.push(out.replace(/^ · /, '') + '.'); did = out.replace(/^ · /, ''); }
  }
  // The after-fight report: already answered, with what the engine did (the Narrator follows through, it doesn't rule twice).
  (cb!.notes ||= []).push((u?.name || 'Someone') + ' (round ' + r!.round + (r!.perk ? ', ' + r!.perk.name : ', an attempt') + '): "' + r!.text.slice(0, 160) + '" — answered in the fight' + (lines.length ? ': ' + lines.join(' ') : '') + (did ? ' [' + did + ']' : '') + (r!.perk?.ask && !(eff && 'perk' in eff && !eff.perk.accepted) ? ' Follow through: ' + r!.perk.ask : ''));
  for (const x of cb!.units) x.ap = Math.round(x.ap * 10) / 10;
  checkOver(cb!);
  runEnemies(g);
}

/** A combo perk earned by a deed: the Narrator's record (deeds[]), or the engine seeing it happen (deeds.ts). True when given. */
function grantCombo(g: GameState, d: { charId: string; perkId: string; deed: string }): boolean {
  const c = g.characters[d.charId]; if (!c || comboEligible(c, d.perkId)) return false;
  c.perks.push({ id: d.perkId, tier: 'achieved' }); c.deeds.push(d.deed);
  push(g, { kind: 'system', text: c.name + ' earns the combo perk ' + PERK[d.perkId].name + ': ' + d.deed });
  canon(g, c.name + ' earned ' + PERK[d.perkId].name + ' by a deed: ' + d.deed, [c.name], 4);
  const song = startSong(g, c, 'a legendary deed', 'spotlight', (x) => push(g, { kind: 'system', text: x }));
  spotlight(g, { kind: 'legend', char: c.id, unit: unitOfChar(g, c.id), reason: 'a legendary deed', perk: d.perkId, line: String(d.deed || '').slice(0, 200), song });
  awardAutomatic(g, c);
  return true;
}
deedGrant.f = grantCombo;
/** A character's own unit in the fight on now (not a companion), for a spotlight event. */
const unitOfChar = (g: GameState, charId: string) => (g.phase === 'combat' ? g.combat?.units.find((x) => x.charId === charId && !x.companion)?.id ?? null : null);
/** Spotlight moments in a fight (spec: Music): an elite or boss taken down, an ally revived; for the music traits also any kill and any big heal. */
function songTriggers(g: GameState, u: Combat['units'][number], c: Character, before: { id: string; dead: boolean; downed: boolean; hp: number }[]) {
  const cb = g.combat!, log = (t: string) => cb.log.push(t), was = Object.fromEntries(before.map((b) => [b.id, b]));
  const killed = cb.units.filter((x) => x.side === 'foe' && x.dead && was[x.id] && !was[x.id].dead);
  const big = killed.find((x) => x.tier === 'elite' || x.tier === 'boss');
  const revived = cb.units.find((x) => x.side === 'pc' && was[x.id]?.downed && !x.downed && !x.dead);
  const healed = cb.units.find((x) => x.side === 'pc' && was[x.id] && !was[x.id].downed && x.hp - was[x.id].hp >= 30);
  const song1 = big ? startSong(g, c, 'took down ' + big.name, 'spotlight', log) : false;
  const song2 = !big && revived ? startSong(g, c, 'brought ' + revived.name + ' back', 'spotlight', log) : false;
  if (big) spotlight(g, { kind: 'takedown', char: c.id, unit: u.id, reason: 'took down ' + big.name, target: big.id, targetName: (cb.sighted || []).includes(big.id) ? big.name : 'an unseen hostile', song: song1 });
  if (revived) spotlight(g, { kind: 'revive', char: c.id, unit: u.id, reason: 'brought ' + revived.name + ' back', target: revived.id, targetName: revived.name, targetChar: revived.charId || null, song: song2 });
  // The music traits' own triggers only when no spotlight moment happened (the chain the music always had: a boss's kill
  // never falls through to "a kill").
  if (!big && !revived) { if (killed.length) startSong(g, c, 'a kill', 'trait', log); else if (healed) startSong(g, c, 'a big heal', 'trait', log); }
  if (revived && musicOf(g).now?.charId !== c.id) startSong(g, c, 'brought ' + revived.name + ' back', 'trait', log);
  syncSong(g);
}
/** Fighters carry their music trait's modifier to their weapon skill (spec: Music). */
function syncSong(g: GameState) {
  for (const x of g.combat?.units || []) if (x.charId && g.characters[x.charId]) { const ch = g.characters[x.charId]; x.song = songMod(g, ch, WEAPON[x.weapon]?.skill || ''); }
}

/** Anyone and anything is a target (spec: Anyone is a target): any unit but yourself, alive. */
/** An attack mode as a player may send it (none: a shot). Anything else is refused: the engine's own modes ('thrown') are
 * made by techniques only. */
function playerMode<T extends string>(m: any, ok: readonly T[]): T { const x = (m || 'shot') as T; if (!ok.includes(x)) fail('Unknown attack.'); return x; }
/** The phys/* actions on a character (the Proving Ground runs them in a fight too). A refusal in plain words, or null. */
function physAction(c: Character, a: Extract<Action, { type: 'phys/ready' | 'phys/pick' | 'phys/quiver' | 'phys/answers' }>): string | null {
  switch (a.type) {
    case 'phys/ready': {
      if (a.system !== 'melee' && a.system !== 'ranged') return 'Melee or ranged.';
      const ids = (Array.isArray(a.ids) ? a.ids : []).filter((x) => typeof x === 'string'), e = readyError(c, a.system, ids); if (e) return e;
      if (ids.some((id) => TECHNIQUE[id]?.free)) return 'That one is always ready.';
      ensurePhys(c).ready[a.system] = ids; return null;
    }
    case 'phys/pick': return takePick(c, a.weaponId, a.id);
    case 'phys/quiver': return loadQuiverWith(c, a.weaponId, a.load || {});
    case 'phys/answers': {
      if (a.ids == null) { delete ensurePhys(c).answers; return null; }
      const ids = (Array.isArray(a.ids) ? a.ids : []).filter((x) => TECHNIQUE[x]?.group === 'answer'); if (new Set(ids).size !== ids.length) return 'Each Answer once.';
      ensurePhys(c).answers = ids; return null;
    }
  }
}
const anyTarget = (t: Combat['units'][number] | undefined, u: Combat['units'][number]) => !!t && t.id !== u.id && !t.dead && !t.surrendered;
/** What a companion or a puppet may do (rules 1.3). */
const ACT_NAME: Record<string, string> = { move: 'move', sprint: 'sprint', disengage: 'disengage', shot: 'shoot', aimed: 'take an aimed shot', melee: 'strike' };
/** rules 1.13: make a Call. Only the fields a Call reads are taken from a client's action (nothing internal). */
function runCall(g: GameState, cb: Combat, u: Combat['units'][number], a: Extract<Action, { type: 'combat/call' }>): string | null {
  if (!CALL[a.id]) fail('No such Call.');
  const args: CallArgs = { ...(typeof a.targetId === 'string' ? { targetId: a.targetId } : {}), ...(typeof a.tile === 'string' ? { tile: tileKey(g, a.tile) } : {}), ...(typeof a.opt === 'string' ? { opt: a.opt.slice(0, 40) } : {}), ...(typeof a.text === 'string' ? { text: a.text } : {}), ...(a.react ? { react: true } : {}) };
  refuseHook(cb, u, a);
  return useCall(cb, u, a.id, args, g.rng);
}
/** A Call as a reaction: the speaker isn't the unit whose turn it is. Its own player sends it; it spends the unit's
 * reaction (once a round) and no AP. A companion, a puppet and a unit with a fixed action list never Call. */
function callReaction(g: GameState, cb: Combat, a: Extract<Action, { type: 'combat/call' }>, by: string) {
  const u = cb.units.find((x) => x.id === a.unitId); if (!u) fail('No such unit.');
  const c = u!.charId ? g.characters[u!.charId] : null;
  if (!c || c.owner !== by) fail('Not your unit.');
  if (u!.companion || u!.allowedActions || condOn(u!, 'puppeted')) fail(u!.name + ' can\'t Call.');
  const err = runCall(g, cb, u!, { ...a, react: true }); if (err) fail(err);
  emitHook(cb, 'action_done', { u: u!, a, cb });
  for (const x of cb.units) x.ap = Math.round(x.ap * 10) / 10;
}
const COMPANION_ACTS = new Set(['combat/move', 'combat/attack', 'combat/technique', 'combat/overwatch', 'combat/end-turn', 'combat/decline', 'combat/reload', 'combat/prone', 'combat/extinguish', 'combat/escape']);
/** The PC character who Puppeted this enemy (its player runs the enemy's turn), if the puppeteer is up. */
function puppeteerOf(g: GameState, cb: Combat, u: Combat['units'][number]): Character | null {
  const by = condSource(u, 'puppeted'); if (!by) return null;
  const p = cb.units.find((x) => x.id === by); return p && p.charId && !p.dead && g.characters[p.charId] ? g.characters[p.charId] : null;
}
/** combat/swap (spec: Swapping weapons): the off hand into the main hand, a weapon or focus from the pack into a hand, or
 * a mod onto the main-hand weapon. Rules 1.9: one of the gear changes, at 1 AP a hand (items 684–690). */
function swapWeapon(g: GameState, cb: Combat, u: Combat['units'][number], c: Character, a: { from?: string | number; mod?: number | string; to?: 'main' | 'off' }): string | null {
  if (a.mod != null) return gearInFight(g, cb, u, c, { op: 'mod', item: a.mod });
  if (a.from === 'off') return gearInFight(g, cb, u, c, { op: 'swap' });
  if (a.from != null && a.from !== '') return gearInFight(g, cb, u, c, { op: 'draw', item: a.from, to: a.to === 'off' ? 'off' : 'main' }); // a focus goes in the off hand
  return 'Swap from your off hand, or a weapon in your pack.';
}
/** A gear change from the character sheet in a fight (gear/equip, gear/unequip, gear/mod): the same combat action, on
 * the character's own unit and turn, at its cost (rules 1.9). */
function gearForward(g: GameState, a: Extract<Action, { type: 'gear/equip' | 'gear/unequip' | 'gear/mod' }>, by: string) {
  const c = g.characters[a.charId], u = g.combat?.units.find((x) => x.charId === a.charId && !x.companion);
  if (!u || !c) fail('Change gear after the fight: ' + (c?.name || 'this character') + ' isn\'t in it.');
  const ca: Action = a.type === 'gear/equip' ? { type: 'combat/equip', unitId: u!.id, item: a.idx, to: a.to }
    : a.type === 'gear/unequip' ? { type: 'combat/stow', unitId: u!.id, slot: a.slot } : { type: 'combat/swap', unitId: u!.id, mod: a.idx };
  combatAction(g, ca, by);
}
/** What a fight's gear change rebuilds from the character (item 689): the weapon's numbers, the off-hand gun's spares,
 * what gear gives (light, dark sight, hazard immunity, weight, throwables, spare parts) and the d20 item modifiers. */
const GEAR_FRESH = ['weapon', 'ammo', 'attack', 'dmgMult', 'dur', 'maxDur', 'mods', 'offWeapon', 'offItem', 'offAmmo', 'mags', 'loose', 'ammoType', 'magTypes', 'offMags', 'offMagTypes', 'offAmmoType', 'offLoose', 'unarmedBonus',
  'light', 'darkSight', 'hazardImmune', 'ignoreDifficult', 'overweight', 'noSprint', 'throwables', 'parts', 'sv', 'dbf', 'sk', 'critTaken', 'elemTaken', 'ambushTaken', 'healRecv', 'shieldRecv', 'stealth', 'injResist'] as const;
/** Rebuild a fighter after its character's gear changed (item 689): the GEAR_FRESH fields from a fresh unit; Defense,
 * armour, Movement and Vision by the difference the change made (`base` is the unit built just before it), so a break,
 * a slow, a blind or a guard on them stays; HP, AP, conditions, Flux, Strain and a held Outburst are kept. */
function refitUnit(g: GameState, u: Combat['units'][number], c: Character, base: Combat['units'][number]) {
  const fresh = unitFromCharacter(c, u.pos, { state: g.rng.state }), x = u as any, f = fresh as any;
  for (const k of GEAR_FRESH) { if (f[k] === undefined) delete x[k]; else x[k] = JSON.parse(JSON.stringify(f[k])); }
  const dDef = fresh.def - base.def, dArm = fresh.armour - base.armour, dMove = fresh.movement - base.movement, dVis = (fresh.vision || 12) - (base.vision || 12);
  if (dDef) u.def += dDef;
  if (dArm) { setEffectiveArmour(u, effectiveArmour(u) + dArm); if (u.baseArmour != null) u.baseArmour += dArm; } // under a Break (rules 1.12) the change goes to what the Break gives back
  if (dMove) { if (u.conds?.slowed && u.baseMove != null) { u.baseMove += dMove; u.movement = u.baseMove / 2; } else { u.movement = Math.max(0.5, u.movement + dMove); if (u.baseMove != null) u.baseMove += dMove; } }
  if (dVis) { if (u.baseVision != null) u.baseVision += dVis; else u.vision = Math.max(1, (u.vision || 12) + dVis); }
  // A focus counts only in a hand (item 630): what the hands hold now decides what this fighter can cast. Its store
  // (core charge, MP) stays with it either way; an Outburst already held stays held (item 632).
  if (fresh.mg) { if (!u.mg) u.mg = fresh.mg; else { u.mg.evoker = fresh.mg.evoker; u.mg.emanator = fresh.mg.emanator; } }
  else if (u.mg) { u.mg.evoker = false; u.mg.emanator = false; }
  ensureMomentum(u); // rules 1.12: a blade just drawn has its meter at once
}
/** A gear change in a fight (rules 1.9, World Play: Gear in a fight; items 684–690): 1 AP a hand, Hot-Swap on the hand
 * rows, light armour 1 AP a piece, heavy armour refused, a drop 0 AP into the pile on the unit's tile. The fighter's
 * state is written back to the character first, the change is made there, and the fighter is rebuilt from it. The pack
 * entry is marked before the write-back (which may drop used-up entries) and found again after it (item 684). */
function gearInFight(g: GameState, cb: Combat, u: Combat['units'][number], c: Character, op: GearOp, o: { /** part of a technique (rules 1.12): no AP */ free?: boolean; /** where a dropped weapon lands (null: no pile; default: your tile) */ at?: string | null; /** what left the hands is pushed here (the entries as they were) */ out?: PackItem[] } = {}): string | null {
  if (u.companion) return 'A companion has no pack.';
  if (!u.charId || u.charId !== c.id) return 'Only a character changes gear.';
  const disarmed = condOn(u, 'disarmed'), plan = gearPlan(c, op, { disarmed }); if (plan.why) return plan.why;
  let ap = o.free ? 0 : plan.ap;
  if (plan.hand && ap > 0) { const ctx: any = emitHook(cb, 'swap', { u, c, from: op.op === 'swap' ? 'off' : (op as any).item, mod: op.op === 'mod' ? op.item : undefined, ap, cb }); ap = Math.max(0, ctx.ap); }
  if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  if (plan.idx != null) { c.pack = packOf(c).map((x) => ({ ...x })); (c.pack[plan.idx] as any)._pick = 1; }
  unitToCharacter(g, u, false);
  let idx = -1;
  if (plan.idx != null) { idx = packOf(c).findIndex((x: any) => x._pick); for (const x of packOf(c) as any[]) delete x._pick; if (idx < 0) return 'That is used up.'; }
  const base = unitFromCharacter(c, u.pos, { state: g.rng.state }), wasMain = c.weapon, toPile: PackItem[] = [];
  let err: string | null = null, rearm = false;
  /** Disarmed (item 687): the weapon on the ground stays there, in the pile; drawing another ends the condition. */
  const leaveDowned = () => { const e = handEntry(c, 'main'); if (e) toPile.push(e); emptyHand(c, 'main'); rearm = true; };
  switch (op.op) {
    case 'draw': if (op.to === 'main' && disarmed) leaveDowned(); err = equip(c, idx, op.to); break;
    case 'wear': err = equip(c, idx, 'worn'); break; // a light piece already there comes off into the pack (item 685)
    case 'mod': err = fitMod(c, idx); break;
    case 'swap': {
      { const sw = secondWeaponWhy(c, c.weapon, c.offHand?.id); if (sw) return sw; } // the main-hand weapon becomes the second one
      if (disarmed) leaveDowned();
      const off = c.offHand!, main = c.weapon !== 'fists' && WEAPON[c.weapon] ? { id: c.weapon, ...(c.weaponState || {}), loaded: c.loaded ?? undefined, ammoType: c.loadedType || null } : null;
      c.weapon = off.id; c.weaponState = { rarity: off.rarity, dur: off.dur, mods: off.mods, ...(off.name ? { name: off.name } : {}) };
      c.loaded = off.loaded ?? (WEAPON[off.id].magazine ?? 0); c.loadedType = c.loaded && off.ammoType ? off.ammoType : null; // each gun keeps its rounds' type
      c.offHand = main ? { id: main.id, rarity: main.rarity, dur: main.dur, mods: main.mods, ...(main.name ? { name: main.name } : {}), ...(WEAPON[main.id].magazine != null ? { loaded: main.loaded ?? 0, ...(main.loaded && main.ammoType ? { ammoType: main.ammoType } : {}) } : {}) } : null;
      break;
    }
    case 'stow': err = unequip(c, op.slot); break;
    case 'drop': { const e = handEntry(c, op.slot as 'main' | 'off'); if (e) toPile.push(e); emptyHand(c, op.slot as 'main' | 'off'); break; }
  }
  if (err) return err;
  const pileAt = o.at === undefined ? u.pos : o.at;
  if (toPile.length && pileAt) dropToPile(cb, pileAt, toPile, 'drop');
  o.out?.push(...toPile);
  refitUnit(g, u, c, base);
  if (rearm) endCond(u, 'disarmed', cb);
  // Heat stays with the fighter (design section 3: the rebuild keeps heat; review fix: two swaps no longer cool a gun);
  // a jam and a brace belong to the gun that left the hand.
  if (c.weapon !== wasMain) { u.jammed = false; u.braced = false; }
  u.ap -= ap;
  const where = toPile.length && pileAt ? (op.op === 'drop' ? ': it lands in the pile at ' : ', leaving the weapon on the ground in the pile at ') + refOf(pileAt) : '';
  if (!(o.free && op.op === 'drop')) cb.log.push(c.name + ' ' + plan.label + (o.free ? '' : ' (' + ap + ' AP)') + where + (op.op !== 'mod' && u.mg ? focusLine(c) : '') + '.');
  syncSong(g);
  return null;
}

/** A character takes a weapon straight into a free hand (rules 1.12: one pulled out of a nailed target), through the
 * same gear change a draw makes, free of AP. False: no free hand, or the draw refuses it (a skill it needs, a ban). */
function takeIntoHand(g: GameState, cb: Combat, u: Combat['units'][number], it: PackItem): boolean {
  const c = u.charId && !u.companion ? g.characters[u.charId] : null; if (!c) return false;
  const mainFree = u.weapon === 'fists' || !WEAPON[u.weapon], to = mainFree ? 'main' : !u.offWeapon && !c.offHand && !twoHands(c, c.weapon) ? 'off' : null; if (!to) return false;
  c.pack = [...packOf(c).map((x) => ({ ...x })), { ...it, qty: 1, _nail: 1 } as any];
  const e = gearInFight(g, cb, u, c, { op: 'draw', item: c.pack.length - 1, to }, { free: true });
  c.pack = packOf(c).filter((x: any) => !(e && x._nail)).map((x: any) => { const { _nail, ...rest } = x; void _nail; return rest; });
  return !e;
}
// Physical 2.0 (rules 1.12): the technique core changes gear through the same path a player's gear change takes, for
// the character behind the unit in the game bound for this action: a draw that is part of a technique (Draw Cut, Snap
// Shot), and a weapon that leaves the hand (thrown, or left in a target).
setGearService({
  draw(cb, u, item) { const g: GameState | null = boundGame(), c = g && u.charId ? g.characters[u.charId] : null; return g && c ? gearInFight(g, cb, u, c, { op: 'draw', item, to: 'main' }, { free: true }) : 'Nothing stowed to draw.'; },
  lose(cb, u, hand, at) {
    const g: GameState | null = boundGame(), c = g && u.charId ? g.characters[u.charId] : null; if (!g || !c) return null;
    const id = hand === 'off' ? c.offHand?.id : c.weapon, out: PackItem[] = [];
    if (!gearInFight(g, cb, u, c, { op: 'drop', slot: hand }, { free: true, at, out }) && id && WEAPON[id]) cb.log.push(c.name + '\'s ' + WEAPON[id].name.toLowerCase() + (at ? ' lands at ' + refOf(at) + '.' : ' stays where it struck.'));
    return out[0] || null;
  },
  take(cb, u, it) { const g: GameState | null = boundGame(); return !!g && takeIntoHand(g, cb, u, it); },
  // The unit as the draw would leave it (the same plan, equip and rebuild the real draw runs, on a copy of the
  // character): the weapon fields for the card, or the draw's own refusal. Nothing is changed.
  asDrawn(cb, u, item) {
    const g: GameState | null = boundGame(), c0 = g && u.charId ? g.characters[u.charId] : null; if (!g || !c0) return 'Nothing stowed to draw.';
    const c: Character = JSON.parse(JSON.stringify(c0)), disarmed = condOn(u, 'disarmed');
    const plan = gearPlan(c, { op: 'draw', item, to: 'main' }, { disarmed }); if (plan.why) return plan.why;
    if (disarmed) emptyHand(c, 'main');
    const e = equip(c, plan.idx!, 'main'); if (e) return e;
    const f: any = unitFromCharacter(c, u.pos, { state: g.rng.state });
    return { weapon: f.weapon, ammo: f.ammo, attack: f.attack, dmgMult: f.dmgMult, dur: f.dur, maxDur: f.maxDur, mods: f.mods, ammoType: f.ammoType };
  },
});
/** After a swap: which focuses the hands hold now (item 630). */
function focusLine(c: Character): string {
  const e = focusHand(c, 'evoker'), m = focusHand(c, 'emanator'), held = (h: string | null) => h === 'main' || h === 'off';
  const bits = [e ? (held(e) ? 'an Evoker in hand' : 'the Evoker stowed: no Sigils') : '', m ? (held(m) ? 'an Emanator in hand' : 'the Emanator stowed: Outbursts draw on the air') : ''].filter(Boolean);
  return bits.length ? ' · ' + bits.join(', ') : '';
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
    markAction(cb); // spotlight.ts: an enemy's turn is its own action (an intervention in it slows its playback)
    if (!g.sandbox || (g.sandbox.ai && !g.sandbox.fx)) enemyTurn(cb, g.rng); // the Proving Ground can switch the enemies off
    critMoment(g); // a party reaction's crit in the enemy's turn (decision 113)
    noteSighted(cb); // a hostile that walks into sight on its own turn counts as seen, even if it steps back out
    sightFx(cb); // presentation: what came into sight in its turn (its walks carry their own)
    if (!checkOver(cb)) endTurn(cb, g.rng);
  }
  clearAction(cb);
  if (cb.over) { if (g.sandbox) sandboxOver(g); else finishCombat(g); }
}

function finishCombat(g: GameState) {
  const cb = g.combat!;
  faithFightEnd(g, cb); // rules 1.6: vows kept or broken, mercy, flight
  for (const u of cb.units) if (u.charId) unitToCharacter(g, u, !cb.noXp);
  // Companions keep their HP (destroyed ones stay at 0 until repaired or healed in the story).
  for (const u of cb.units) { if (u.nailed) dropNailed(cb, u); if (u.stuck) dropStuck(cb, u); } // rules 1.12: a weapon left in someone falls where they stand when the fight ends
  for (const u of cb.units) if (u.companion && u.ctrl) { const owner = g.characters[u.ctrl], comp = owner?.companions?.find((x) => 'cp-' + owner.id + '-' + x.id === u.id); if (comp) comp.hp = u.dead ? 0 : u.hp; }
  noteDeaths(cb, g.rng); magicOut(g, cb, true);
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
  // A fight on another zone's map: the zone the party was in keeps its objects (piles, caches) in its stash, and the
  // fight's own objects become the story's (rules 1.9 fix: they were overwritten).
  if (zoneMap(g).id !== cb.map.id) { const zo = (g.story.zoneObjects ||= {}); zo[zoneMap(g).id] = storyObjects(g); delete zo[cb.map.id]; }
  g.story.zone = cb.map.id; g.story.positions = {}; g.story.objects = JSON.parse(JSON.stringify((cb.objects || []).filter((o: any) => !o.grandWall)));
  for (const u of cb.units) if (u.side === 'foe' && u.dead && u.npcId) for (const o of g.story.objects!) if (o.npcId === u.npcId) { o.dead = true; o.resolved = true; }
  for (const u of cb.units) if (u.charId && !u.dead) g.story.positions[u.charId] = u.pos;
  for (const u of cb.units) if (u.companion && COMPANION_ROUND_AP[u.companion] != null && u.ctrl && !u.dead && !u.downed && u.hp > 0) g.story.positions[u.id] = u.pos; // a drone or beast stays where it ended
  // Enemies still standing go back on the map as hostile tokens where they ended.
  { const map = zoneMap(g), taken = new Set([...Object.values(g.story.positions), ...npcsOf(g).map((n) => n.pos)]);
    const freeNear = (k: string) => { if (!taken.has(k)) return k; const [x0, y0] = k.split(',').map(Number); for (let r = 1; r < 6; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const n = (x0 + dx) + ',' + (y0 + dy); if (standable(map, n) && !taken.has(n) && !storyObjects(g).some((o) => o.pos === n && blocksMove(o))) return n; } return k; };
    for (const u of cb.units) if (u.side === 'foe' && !u.dead && !u.downed && !u.surrendered) { const at = freeNear(u.pos); taken.add(at); npcsOf(g).push({ id: u.npcId || 'n' + (++g.seq), name: u.name, side: 'hostile', tier: u.tier || 'minion', weapon: u.weapon, pos: at, portrait: u.img || undefined, ...(u.kind && u.kind !== 'human' ? { kind: u.kind } : {}), ...(u.tags?.length ? { tags: u.tags.filter((t) => t !== 'humanoid') } : {}), ...(u.drops ? { drops: u.drops } : {}), ...(u.level != null && u.level !== cb.level ? { level: u.level } : {}) }); }
    // Surrendered and subdued foes stay as neutral prisoners where they gave up (rules 1.3), for the Narrator to deal with.
    for (const u of cb.units) if (u.side === 'foe' && u.surrendered && !u.dead) { const at = freeNear(u.pos); taken.add(at); npcsOf(g).push({ id: u.npcId || 'n' + (++g.seq), name: u.name, side: 'neutral', tier: u.tier || 'minion', weapon: u.weapon, pos: at, portrait: u.img || undefined, hp: Math.max(1, u.hp), prisoner: true, tags: ['prisoner', ...(u.tags || []).filter((t) => t !== 'prisoner' && t !== 'humanoid')], ...(u.kind && u.kind !== 'human' ? { kind: u.kind } : {}) }); } }
  landDropped(g, cb); // rules 1.7: what Downed carriers dropped is a token again
  g.phase = 'story'; g.story.await = 'narrator'; g.story.work = { kind: 'combat_end', note: combatReport(cb) };
  musicAfterFight(g);
  g.combat = { ...cb };
}

/** The one Narrator call a fight costs gets this: the result, the moments that mattered, who's left where, and anything said mid-fight. */
export function combatReport(cb: Combat): string {
  const key = /CRITICAL|INJURY|Downed|down for good|dies|stabilises|breaks? into rubble|stims|analyzes|picks up|Fan|Overcharge|evokes|releases|MANA SHORT|OVERLOAD|stands as|The air turns| drops: /;
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
/** An objects[] entry that is a pile op (rules 1.9): kind 'pile', or the id of a pile. */
function pileObjectOp(g: GameState, op: NonNullable<NarratorTurn['objects']>[number]): boolean {
  if (!op || typeof op !== 'object') return false;
  if (op.kind === 'pile') return true;
  const o = op.id ? storyObjects(g).find((x) => x.id === op.id) : undefined; return !!o && isPile(o);
}
function applyObjectOp(g: GameState, op: NonNullable<NarratorTurn['objects']>[number]) {
  const map = zoneMap(g), objs = storyObjects(g);
  const approaches0 = cleanApproaches(op.approaches); // rules 1.7: success and failure effects (world.ts)
  // Rules 1.10: a sigil mark's Investigate is the engine's own; a Narrator approach by that label is dropped (item 922).
  const approaches = op.kind === 'sigil_mark' || objs.find((o) => o.id === op.id)?.kind === 'sigil_mark' ? approaches0.filter((a) => a.label.toLowerCase() !== MARK.label.toLowerCase()) : approaches0;
  // A pile is matched only by its id or by kind 'pile' (review fix: an op with no kind on a pile's tile became a pile op).
  const existing = objs.find((o) => o.id === op.id) || (op.at ? objs.find((o) => o.pos === keyOf(op.at, map) && (!op.kind ? !isPile(o) : o.kind === op.kind)) : undefined);
  if (op.action === 'remove') { if (existing) g.story.objects = objs.filter((o) => o !== existing); return; }
  // Rules 1.9: a pile is placed (or added to) as a ground[] entry; an update may reveal it or add to it.
  if (pileObjectOp(g, op)) {
    if (op.action === 'update' && existing) { if (op.hidden === false) existing.hidden = false; if (Array.isArray(op.items) && op.items.length) applyGroundOp(g, { at: refOf(existing.pos), items: op.items as any, hidden: op.hidden }); return; }
    if (op.action !== 'update') applyGroundOp(g, { at: op.at, items: (op.items || []) as any, hidden: op.hidden });
    return;
  }
  if (op.action === 'update' && existing) {
    if (op.name) existing.name = op.name.slice(0, 60); if (op.text) existing.text = op.text.slice(0, 400);
    if (approaches.length) {
      // A sigil mark keeps its Investigate and its tries through the Narrator's new list (item 922: once per character).
      const study = existing.kind === 'sigil_mark' ? existing.approaches.find((x) => x.success === 'study') : undefined;
      existing.approaches = mergeApproaches(existing.approaches, existing.kind === 'sigil_mark' ? approaches.filter((x) => x.label.toLowerCase() !== MARK.label.toLowerCase()) : approaches);
      if (study) existing.approaches.unshift(study);
    }
    if (op.hidden === false) existing.hidden = false; if (op.locked != null && (kindOf(existing).door || isCache(existing))) existing.locked = op.locked;
    if (Array.isArray(op.items) && op.items.length) { existing.items = cleanItems(op.items); delete existing.searched; }
    if (existing.kind === 'sigil_mark') { if (op.age) existing.age = String(op.age); if (op.damage) existing.damage = String(op.damage); ensureMark(existing); } // its Investigate stays first
    return;
  }
  const k = keyOf(op.at, map); if (!k || !OBJ[op.kind] || map.solid.includes(k)) return;
  // Rules 1.10: a sigil mark needs a real word (the engine writes its Investigate approach; makeObject).
  const markW = op.kind === 'sigil_mark' ? String(op.word || '').trim().toLowerCase() : ''; if (op.kind === 'sigil_mark' && !SIGIL[markW]) return;
  if (OBJ[op.kind].blocks_move && (objs.some((o) => o.pos === k && blocksMove(o)) || Object.values(positionsOf(g)).includes(k))) return;
  const o = makeObject('o' + (++g.seq), op.kind, k, { name: op.name?.slice(0, 60), text: op.text?.slice(0, 400), approaches: approaches.map((a) => ({ ...a, tries: [] })),
    ...(markW ? { word: markW, ...(op.age ? { age: String(op.age) } : {}), ...(op.damage ? { damage: String(op.damage) } : {}) } : {}) });
  if (op.hidden != null && OBJ[op.kind].trap) o.hidden = op.hidden; if (op.locked && (kindOf(o).door || op.kind === 'cache')) o.locked = true;
  if (op.kind === 'cache' || (Array.isArray(op.items) && op.items.length)) o.items = cleanItems(op.items); // rules 1.7: a cache's contents
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
/** One unit as a side may see its Physical 2.0 state (viewFor). The unit is copied only when something is taken out. */
function physFog(cb: Combat, u: Combat['units'][number], me: 'pc' | 'foe'): Combat['units'][number] {
  const hid = u.side === me ? Math.min(u.pressure || 0, u.pressHidden || 0) : 0, blind = u.side !== me && !!u.watch && !sideSees(cb, me, u);
  if (!hid && !blind) return u;
  const x = { ...u };
  if (hid) { const left = (u.pressure || 0) - hid; if (left > 0) x.pressure = left; else { delete x.pressure; delete x.pressBy; } delete x.pressHidden; }
  if (blind) delete x.watch;
  return x;
}
export function viewFor(g: GameState, playerId: string): GameState {
  // The skill panel shows Ask only where a voice has something (Silent elsewhere): which skills, never the hooks themselves.
  const sc = g.story.scene, voiced: Record<string, string[]> = {};
  for (const c of Object.values(g.characters)) if (c.owner === playerId) voiced[c.id] = [...new Set(sc.hooks.filter((h) => !sc.revealed.includes(c.id + ':' + h.id)).map((h) => h.skill))];
  const v: GameState = { ...g, story: { ...g.story, entries: g.story.entries.filter((e) => !e.to || e.to === playerId), scene: { ...sc, hooks: [], voiced } } };
  v.overreach = g.overreach.filter((o) => g.characters[o.charId]?.owner === playerId);
  if (playerId !== g.hostId) delete v.memory; delete v.archive;
  // The viewer's side: 'pc', except team B of a Proving Ground team fight ('foe' in the engine; sandboxView flips it
  // to 'pc' for that player's screen once everything secret from that side is filtered out here).
  const me: 'pc' | 'foe' = g.sandbox?.mode === 'teams' && sandboxTeam(g.sandbox, playerId) === 'B' ? 'foe' : 'pc';
  // Hidden objects (unspotted traps) stay hidden from every player, the host included.
  if (g.story.objects) v.story.objects = g.story.objects.filter((o) => !o.hidden);
  if (g.combat?.objects) v.combat = { ...g.combat, objects: g.combat.objects.filter((o) => !o.hidden && !((o as any).rig && (o as any).side && (o as any).side !== me)) }; // another side's rigged tile (Sabotage) too
  // Sigil traps and hidden turrets (rules 1.4) show to their own side only, until spotted; so do their fx.
  if (v.combat) v.combat = { ...v.combat, zones: (v.combat.zones || []).filter((z) => !secretFrom(z, me)), fx: (v.combat.fx || []).filter((e) => !e.only || e.only === me).map((e) => sightOwn(e, me)) };
  // Each side's sight records are presentation the engine keeps for itself: never sent (they say where the other side
  // has eyes). A move's per-tile sight and a turn's or stance's seen keep the viewer's own side only.
  if (v.combat) { v.combat = { ...v.combat }; delete v.combat.sightSeen; delete v.combat.sightPos; delete v.combat.sightWhy; }
  if (g.story.zones) v.story.zones = g.story.zones.filter((z: any) => !secretFrom(z, me));
  // Physical 2.0 (rules 1.12): a Silent weapon's pips are hidden from the side they are on; a held shot shows to its
  // own side, and to the other side only while it sees the holder.
  if (v.combat && g.combat) { const cb0 = g.combat; v.combat = { ...v.combat, units: v.combat.units.map((u) => callView(physFog(cb0, u, me), me)) }; } // rules 1.13: a Call's mark shows to the side that made it (calls/core.ts)
  pileFog(g, v, me); // rules 1.9: a pile shows only on a tile the viewer's party sees now (item 676)
  // rules 1.14: the pending fight ruling shows to everyone (the fight waits on it), without the Narrator's side of a
  // perk; words a perk keeps private (Their Own Idea) show to the speaker's player and the host only.
  if (v.combat && playerId !== g.hostId) { const fr = fightRulingOf(g.combat); if (fr) { const mine = g.characters[fr.charId]?.owner === playerId, perk = fr.perk ? { ...fr.perk } : undefined; if (perk) delete perk.ask;
    v.combat = { ...v.combat, ruling: { ...fr, ...(perk ? { perk } : {}), ...(fr.perk?.private && !mine ? { text: '' } : {}) } } as any; } }
  // The fight's notes are the Narrator's (what was said, what a perk asks of them, hidden words): never sent to a guest.
  if (v.combat && playerId !== g.hostId) { v.combat = { ...v.combat }; delete v.combat.notes; }
  if (v.combat && playerId !== g.hostId) { v.combat = { ...v.combat }; delete v.combat.lootLog; } // rules 1.9: the loot cap's log is the host's (item 695)
  worldView(v); // rules 1.7: no unseen hazard, no trigger, no unasked want or hint, no cache's contents
  if (g.sandbox) sandboxView(g, v, playerId); // no saved room; a team fight seen from the player's side
  return v;
}

/** An fx event with only the viewer's side of its sight (a move's per-tile sight, a turn's or a stance's seen). */
function sightOwn(e: FxEvent, me: 'pc' | 'foe'): FxEvent {
  const x = e as FxEvent & { sight?: Record<string, unknown>; seen?: Record<string, unknown> };
  if (!x.sight && !x.seen) return e;
  return { ...e, ...(x.sight ? { sight: { [me]: x.sight[me] } } : {}), ...(x.seen ? { seen: { [me]: x.seen[me] } } : {}) } as FxEvent;
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
    // Ammo carried out of the fight (spec: Reloading); the off-hand gun's rounds too (rules 1.9, item 688).
    c.loaded = u.ammo;
    if (c.offHand && u.offWeapon && u.offWeapon === c.offHand.id && WEAPON[c.offHand.id]?.magazine != null) { const { ammoType: _t, ...oh } = c.offHand; void _t; c.offHand = { ...oh, loaded: Math.max(0, u.offAmmo ?? 0), ...(u.offAmmo && u.offAmmoType ? { ammoType: u.offAmmoType } : {}) }; }
    magicToCharacter(c, u);
    if (u.maxDur) c.weaponState = { ...(c.weaponState || {}), dur: u.dur };
    { const had = packOf(c).filter((x) => (x.item || x.id) === 'spare_parts').reduce((t, x) => t + x.qty, 0), used = had - (u.parts ?? had);
      if (used > 0) { let left = used; c.pack = packOf(c).map((x) => { if ((x.item || x.id) !== 'spare_parts' || !left) return x; const n = Math.min(left, x.qty); left -= n; return { ...x, qty: x.qty - n }; }).filter((x) => x.qty > 0 || x.mags); } }
    const pack = packOf(c).map((it) => ({ ...it }));
    let mi = pack.findIndex((it) => it.weapon === c.weapon && it.mags);
    // A magazine picked up for a gun that had no spares entry gets one (rules 1.9: it was lost before).
    if (mi < 0 && u.mags?.length && WEAPON[c.weapon]?.reload === 'magazine') { pack.push({ ...magsOf(c.weapon, 0), mags: [] }); mi = pack.length - 1; }
    if (mi >= 0 && u.mags) { pack[mi].mags = [...u.mags]; pack[mi].qty = u.mags.length; }
    const w = WEAPON[c.weapon];
    if (u.loose != null) {
      // Loose rounds for the gun's calibre: used ones come off the stacks; rounds picked up mid-fight (rules 1.9) are added.
      const have = pack.filter((it) => it.calibre && it.calibre === w?.ammo && !it.mags).reduce((t, it) => t + it.qty, 0);
      if (u.loose > have && w?.ammo) packAdd(pack, roundsOf(w.ammo, u.loose - have));
      else { let left = u.loose; for (const it of pack) if (it.calibre && it.calibre === w?.ammo) { it.qty = Math.min(it.qty, left); left -= it.qty; } }
    }
    // Rules 1.3: the off-hand gun's spares, thrown items used, special ammo, persisting class resources. The off hand's
    // spares are written before u.extra (rules 1.9 fix: they used to overwrite magazines u.extra had just added).
    if (u.offMags && c.offHand && c.offHand.id !== c.weapon) { let oi = pack.findIndex((it) => it.weapon === c.offHand!.id && it.mags); if (oi < 0 && u.offMags.length) { pack.push({ ...magsOf(c.offHand.id, 0), mags: [] }); oi = pack.length - 1; } if (oi >= 0) { pack[oi].mags = [...u.offMags]; pack[oi].qty = u.offMags.length;
      // Each off-hand magazine keeps its type, in line with the magazines (review fix: picked-up types were lost).
      if (u.offMagTypes || pack[oi].magTypes) { const t = Array.from({ length: u.offMags.length }, (_, i) => (u.offMagTypes ? u.offMagTypes[i] ?? null : pack[oi].magTypes?.[i] ?? null)); if (t.some(Boolean)) pack[oi].magTypes = t; else delete pack[oi].magTypes; } } }
    // An off-hand gun loaded round by round, of another calibre: the rounds it used come off that calibre's stacks.
    if (u.offLoose != null && c.offHand && WEAPON[c.offHand.id]?.ammo) { const cal = WEAPON[c.offHand.id].ammo; let left = u.offLoose; for (const it of pack) if (it.calibre === cal && !it.mags) { it.qty = Math.min(it.qty, left); left -= it.qty; } }
    for (const x of u.extra || []) packAdd(pack, magItem(x.weapon, x.rounds, x.type || null));
    delete u.extra; // written back once (rules 1.9 fix: a mid-fight swap wrote them twice)
    if (u.throwables) for (const [item, left] of Object.entries(u.throwables)) { let have = pack.filter((it) => (it.weapon || it.id) === item && !it.mags).reduce((t, it) => t + it.qty, 0), drop = have - left;
      for (const it of pack) { if (drop <= 0) break; if ((it.weapon || it.id) !== item || it.mags) continue; const n = Math.min(drop, it.qty); it.qty -= n; drop -= n; } void have; }
    c.loadedType = u.ammoType || null;
    if (mi >= 0 && u.magTypes) pack[mi].magTypes = Array.from({ length: (pack[mi].mags || []).length }, (_, i) => u.magTypes![i] ?? null);
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
  return (z?.npcs || []).map((n, i) => ({ id: 'n' + (i + 1) + '-' + map.id, name: n.name, side: n.side, tier: n.tier, weapon: n.weapon, ...((n as any).caster ? { caster: (n as any).caster } : {}), ...(levelGiven((n as any).level) != null ? { level: levelGiven((n as any).level)! } : {}), pos: keyOf(n.at, map) || map.foeStart[0], portrait: n.portrait || portraitFor(g, n.name, seen) || undefined, facing: n.facing ? FACE[n.facing] : undefined,
    ...(n.kind ? { kind: n.kind } : {}), ...(n.tags?.length ? { tags: [...n.tags] } : {}), ...((n as any).drops ? { drops: cleanDrops((n as any).drops, { max: Infinity, tables: campTables(g) }) } : {}) }));
}
export function npcsOf(g: GameState): Npc[] { return (g.story.npcs ||= initialNpcs(g)); }
function facingToward(from: string, to: string): [number, number] { const [a, b] = from.split(',').map(Number), [c, d] = to.split(',').map(Number); return [Math.sign(c - a), Math.sign(d - b)]; }
function partyCentre(g: GameState): string { const ps = Object.values(positionsOf(g)); if (!ps.length) return '0,0'; const xs = ps.map((k) => +k.split(',')[0]), ys = ps.map((k) => +k.split(',')[1]); return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) + ',' + Math.round(ys.reduce((a, b) => a + b, 0) / ys.length); }
function applyNpcOp(g: GameState, op: NonNullable<NarratorTurn['npcs']>[number]) {
  const list = npcsOf(g), map = zoneMap(g);
  const free = (k: string) => standable(map, k) && !storyObjects(g).some((o) => o.pos === k && blocksMove(o)) && !Object.values(positionsOf(g)).includes(k) && !list.some((n) => n.pos === k);
  // Rules 1.7: carry and drop in the story (world.ts; no AP, no adjacency).
  if (op.action === 'carry' || op.action === 'drop') {
    const c = g.characters[op.charId || '']; if (!c || c.dead) return;
    try { if (op.action === 'carry') carryNpc(g, c, String(op.id || op.name || ''), true); else putDown(g, c, String(op.id || op.name || ''), op.at, true); } catch (e) { if (!(e instanceof RuleError)) throw e; }
    return;
  }
  if (op.action === 'place') {
    const k = op.at ? keyOf(op.at, map) : null; if (!k || !free(k) || !op.name) return;
    const tier = ENEMY_TIERS.includes(op.tier || '') ? op.tier! : 'minion', weapon = WEAPON[op.weapon || ''] ? op.weapon! : 'service_pistol';
    list.push({ id: 'n' + (++g.seq), name: op.name.slice(0, 40), side: op.side === 'hostile' ? 'hostile' : 'neutral', tier, weapon, pos: k, portrait: portraitFor(g, op.name) || undefined, facing: facingToward(k, partyCentre(g)),
      ...(op.kind && KINDS.includes(op.kind) ? { kind: op.kind } : {}), ...(Array.isArray(op.tags) ? { tags: op.tags.filter((x) => FOE_TAGS.includes(x)).slice(0, 6) } : {}), ...(op.hidden ? { hidden: true } : {}) });
    { const n = list[list.length - 1], d = cleanDrops(op.drops, { tables: campTables(g) }); if (d) n.drops = d; npcTalkFields(g, n, op); if (!n.avatar) { const av = avatarOf(g, n); if (av) n.avatar = av; } } // rules 1.7: a face, wants, knows, talk
    if (op.hidden) { npcSensed(g, list[list.length - 1], 'placed'); return; } // lurking: no line for the players
    push(g, { kind: 'system', text: op.name + ' at ' + refOf(k) + '.' });
    if (!GENERIC.test(op.name)) applyMemOp(g, { op: 'person', name: op.name, where: zoneMap(g).id, ...(op.side === 'hostile' ? { attitude: -2 } : {}) });
    return;
  }
  const n = list.find((x) => x.id === op.id); if (!n) return;
  if (op.action === 'remove') { npcMoved(g, n, n.pos, null); g.story.npcs = list.filter((x) => x !== n); return; }
  if (op.action === 'update') { if (op.hidden !== undefined && !!op.hidden !== !!n.hidden) { if (op.hidden) { n.hidden = true; npcMoved(g, n, n.pos, n.pos, true); npcSensed(g, n, 'hid'); } else { delete n.hidden; push(g, { kind: 'system', text: n.name + ' shows themself at ' + refOf(n.pos) + '.' }); } }
    if (op.side) n.side = op.side === 'hostile' ? 'hostile' : 'neutral'; if (op.name) n.name = op.name.slice(0, 40); if (op.kind && KINDS.includes(op.kind)) n.kind = op.kind; if (Array.isArray(op.tags)) n.tags = op.tags.filter((x) => FOE_TAGS.includes(x)).slice(0, 6);
    if (op.drops === null) delete n.drops; else if (op.drops !== undefined) { const d = cleanDrops(op.drops, { tables: campTables(g) }); if (d) n.drops = d; }
    npcTalkFields(g, n, op); return; }
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
const ENEMY_TIERS = ['vermin', 'minion', 'soldier', 'elite', 'boss'];
/** Names too generic to be a person in memory. */
const GENERIC = /^(scavenger drone|drone|engineer|security guard|guard|guard captain|hostile|soldier|trooper|enemy rearguard trooper)$/i;

// ---------- magic on the story map and between the story and fights (spec: Mana, rules 1.2) ----------
const MAGIC_ACTS: WorldAct[] = ['draw', 'evoke', 'scuff', 'vent', 'core', 'outburst', 'release', 'syphon', 'crystallise', 'pump', 'letgo', 'steady', 'feed', 'heartwatch', 'revert'];
/** A tile from a grid reference ("C7") or a tile key ("2,6"). */
function tileKey(g: GameState, t: string): string { if (typeof t !== 'string') return ''; if (/^\d+,\d+$/.test(t)) return t; const map = g.phase === 'combat' && g.combat ? g.combat.map : zoneMap(g); return keyOf(t, map) || t; }
/** The Evoke choices beyond the aim (rules 1.4): TWICE's other aims, STEP's landing tile, COMMAND's order. */
function evokeOptsOf(g: GameState, a: { aims?: string[]; dest?: string; order?: string; orderTo?: string; paint?: string; stroke?: string }) {
  return { ...(a.aims?.length ? { aims: a.aims.map((t) => tileKey(g, t)) } : {}), ...(a.stroke && a.stroke !== 'new' && !a.stroke.startsWith('junction:') ? { stroke: String(a.stroke) } : {}), ...(a.dest ? { dest: tileKey(g, a.dest) } : {}), ...(a.order ? { order: a.order } : {}), ...(a.orderTo ? { orderTo: tileKey(g, a.orderTo) } : {}),
    ...(a.paint === 'spread' || a.paint === 'push' ? { paint: a.paint as 'spread' | 'push' } : {}) };
}
function performMagic(cb: Combat, rng: Rng, u: Combat['units'][number], a: { act: WorldAct; feeling?: string; word?: string; stroke?: string; design?: string; hold?: boolean; watch?: boolean; on?: boolean; aims?: string[]; dest?: string; order?: string; orderTo?: string; paint?: string }, tile?: string, aim?: string, g?: GameState): string | null {
  switch (a.act) {
    case 'draw': return a.word ? drawGlyph(cb, rng, u, a.word, tile || u.pos, a.stroke) : 'Pick a word.';
    case 'evoke': return tile ? evokeSpell(cb, rng, u, tile, aim, g ? evokeOptsOf(g, a) : {}) : 'Pick a glyph of the pattern.';
    case 'scuff': return scuffGlyph(cb, u);
    case 'vent': return ventFlux(cb, u);
    case 'core': return swapCore(cb, u);
    case 'outburst': return a.design ? beginOutburst(cb, rng, u, a.design, aim, a.hold ?? !aim, { watch: !!a.watch }) : 'Pick a design.';
    case 'pump': return pumpOutburst(cb, rng, u, a.feeling || null);
    case 'revert': return revertPump(cb, u);
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
  // Rules 1.7: a fight takes its own copy of the map's hazards (magicOut writes it back when the fight ends).
  if (!cb.overworld) { const hz = zoneHazards(g, cb.map.id); if (hz.length) cb.hazards = JSON.parse(JSON.stringify(hz)); }
  if (!cb.overworld) { const lt = campTables(g); if (lt.length) cb.lootTables = lt; } // rules 1.9: the campaign's own drop tables
  migrateStorySigil(g.story as any); cb.sigilV = SIGIL_REV; // 1.2 glyphs go, 1.2 walls become fields (item 441)
  if (!g.story.glyphMap || g.story.glyphMap === cb.map.id) { cb.glyphs = JSON.parse(JSON.stringify(g.story.glyphs || [])); cb.zones = JSON.parse(JSON.stringify(g.story.zones || [])); if (g.story.traces?.length) cb.traces = JSON.parse(JSON.stringify(g.story.traces)); }
  // Ids never repeat: the story's counter, the live glyphs and zones, and the RAISE walls standing (they outlive the
  // glyphs that made them, so a counter rebuilt from glyphs alone would hand out a wall's id again).
  const walls = (cb.objects || []).filter((o) => o.kind === 'sigil_wall' || /^sw\d+$/.test(String(o.id)));
  cb.glyphSeq = Math.max(0, g.story.glyphSeq || 0, ...[...(cb.glyphs || []), ...(cb.zones || []), ...walls].map((x) => +String(x.id).replace(/\D/g, '') || 0));
  for (const u of cb.units) {
    const s = u.charId ? g.story.magic?.[u.charId] : null; if (!s) continue;
    if (u.mg) { u.mg.flux = s.flux || 0; u.mg.strain = s.strain || 0; u.mg.held = s.held ? migrateHeld(s.held, u.mg.designs.find((d) => d.id === s.held!.design)) : null; u.mg.cast = !!s.cast;
      if (s.freePumps != null) u.mg.freePumps = s.freePumps; u.mg.calmFight = !!s.calmFight; u.mg.calmTend = !!s.calmTend; if ((s as any).pumps) u.mg.pumps = JSON.parse(JSON.stringify((s as any).pumps)); }
    if (s.condBy) u.condBy = { ...s.condBy };
    if (s.condVia) u.condVia = { ...s.condVia };
    // Merged with what the fight's start put on (a grudge's condition, item 723): the longer of the two stays.
    if (s.conds && Object.keys(s.conds).length) { const at0 = u.conds || {}; u.conds = { ...s.conds }; for (const [k, n] of Object.entries(at0)) u.conds[k] = Math.max(u.conds[k] || 0, n as number); if (u.conds.slowed && !at0.slowed) { u.baseMove = u.movement; u.movement /= 2; } if (u.conds.blinded && !at0.blinded) { u.baseVision = u.vision || 12; u.vision = 1; } if (u.conds.guarded && !at0.guarded) u.def += 2; }
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
  if (cb.hazards) setZoneHazards(g, cb.map.id, cb.hazards); // rules 1.7: spent mines, safe paths, exposure
  if (!cb.overworld) hazardEvents(g, cb);
  // A Grand form (and the smoke, light and ramparts its staff raised) ends with the fight: never carried to the story
  // map after one (on the area map itself, where it can be planted too, it stays).
  // A Fuse (rules 1.8) waits for its caster's next turn in the fight: the fight over, it fizzles (never going off later
  // on the area map). Linger fields and residue run down their rounds as zones do.
  const fuses = afterFight ? (cb.zones || []).filter((z: any) => z.kind === 'fuse').length : 0;
  g.story.mana = manaOf(cb); g.story.glyphs = cb.glyphs || []; g.story.zones = afterFight ? (cb.zones || []).filter((z: any) => z.kind !== 'grand' && !z.grandOf && z.kind !== 'fuse') : cb.zones || []; g.story.glyphMap = cb.map.id;
  if (cb.traces?.length || g.story.traces) g.story.traces = cb.traces || []; // rules 1.10: scuffed glyphs' traces
  if (fuses) push(g, { kind: 'system', text: fuses === 1 ? 'A fuse fizzles out.' : fuses + ' fuses fizzle out.' });
  g.story.glyphSeq = Math.max(g.story.glyphSeq || 0, cb.glyphSeq || 0);
  const m = (g.story.magic ||= {});
  for (const u of cb.units) if (u.charId) {
    const conds = afterFight ? {} : { ...(u.conds || {}) };
    m[u.charId] = { flux: u.mg?.flux || 0, strain: afterFight ? 0 : u.mg?.strain || 0, held: afterFight ? null : u.mg?.held || null, conds, shield: afterFight ? 0 : u.shield || 0, cast: afterFight ? false : !!u.mg?.cast,
      ...(!afterFight && u.mg && u.mg.freePumps != null ? { freePumps: u.mg.freePumps } : {}), ...(!afterFight && u.mg?.pumps?.length ? { pumps: u.mg.pumps } : {}), ...(!afterFight && u.mg?.calmFight ? { calmFight: true } : {}), ...(!afterFight && u.mg?.calmTend ? { calmTend: true } : {}),
      ...(!afterFight && u.condBy && Object.keys(u.condBy).length ? { condBy: { ...u.condBy } } : {}),
      ...(!afterFight && u.condVia && Object.keys(u.condVia).length ? { condVia: { ...u.condVia } } : {}) };
    // Shaken out of combat lasts the rest of the scene (spec: Conditions): a fight that ends with a PC Shaken carries it on.
    // A grudge's Shaken (item 723) is the fight's only: it isn't carried.
    if (afterFight && (u.conds?.shaken ?? 0) > 0 && u.faith?.grudgeCond !== 'shaken') { const c = g.characters[u.charId]; if (c && !storyConds(g, c).includes('shaken')) setStoryCond(g, c, 'shaken', 'scene'); } // a longer Shaken stays as it was
  }
}
/** A new overworld round is a turn for magic: glyphs and zones run down, held Outbursts grow, Strain eases, Burning
 * burns. Nothing happens (and nothing is logged) when there's no magic about. */
function storyMagicRound(g: GameState) {
  const live = (g.story.glyphs || []).length || (g.story.traces || []).length || (g.story.zones || []).length || (g.story.objects || []).some((o) => o.kind === 'sigil_wall') || Object.values(g.story.magic || {}).some((x) => x.strain || x.held || Object.keys(x.conds || {}).length || x.shield);
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
  // The throwaway fight's sight is not the map's (the area map shows the tokens it has; a lurker stays the Narrator's):
  // its sight events and each side's per-tile sight stay behind.
  for (const e of cb.fx) { if (e.k === 'sight') continue; const { sight: _s, seen: _w, ...rest } = e as FxEvent & { sight?: unknown; seen?: unknown }; void _s; void _w; list.push({ ...rest, n: (g.story.fxSeq = (g.story.fxSeq || 0) + 1) } as FxEvent); }
  if (list.length > FX_CAP) list.splice(0, list.length - FX_CAP);
}
/** Learn a word, a school, a module or a tone (spec: The Magic panel). */
/** A plate's pack note as its lesson id: "FIRE", "tone:fire" or "Fire tone" all read "fire". */
export function plateLesson(note?: string): string { return String(note || '').toLowerCase().replace(/^(word|tone|school|module)\s*:\s*/, '').replace(/\s+(tone|school|module)$/, '').trim().replace(/\s+/g, '_'); }
/** Whether a lesson names something real (so a plate is not used up on nothing). */
function teachCheck(c: Character, m: { word?: string; school?: string; module?: string; tone?: string }): string {
  if (m.word) { const w = m.word.trim().toLowerCase(); if (!SIGIL[w]) return 'No such word.'; if ((c.sigils || []).includes(w)) return c.name + ' already knows ' + SIGIL[w].word + '.'; if ((c.sigils || []).length >= wordsKnownCap(c)) return c.name + ' knows ' + (c.sigils || []).length + ' words, the most Brain Power allows (' + wordsKnownCap(c) + ').'; return ''; }
  if (m.school) return SCHOOL[m.school] ? '' : 'No such school.';
  if (m.module) return MODULE[m.module] ? moduleShelved(m.module) || '' : 'No such module.';
  if (m.tone) return TONE[m.tone] && m.tone !== 'raw' ? '' : 'No such tone.';
  return 'Nothing to learn.';
}
function teach(g: GameState, c: Character, m: { word?: string; school?: string; module?: string; tone?: string }, why: string): string {
  if (m.word) {
    const word = m.word.trim().toLowerCase(); // the Narrator may write the word as it is drawn (FIRE)
    if (!SIGIL[word]) return 'No such word.';
    const known = (c.sigils ||= []); if (known.includes(word)) return c.name + ' already knows ' + SIGIL[word].word + '.';
    if (known.length >= wordsKnownCap(c)) return c.name + ' knows ' + known.length + ' words, the most Brain Power allows (' + wordsKnownCap(c) + ').';
    known.push(word); learnedElsewhere(c, word); push(g, { kind: 'system', text: c.name + ' learns the Sigil word ' + SIGIL[word].word + ' (' + why + ').' }); return '';
  }
  const k = (c.soulKnown ||= { schools: [], modules: [] });
  if (m.school) { if (!SCHOOL[m.school]) return 'No such school.'; if (!k.schools.includes(m.school)) { k.schools.push(m.school); push(g, { kind: 'system', text: c.name + ' learns the ' + SCHOOL[m.school].name + ' school of Outbursts (' + why + ').' }); } return ''; }
  if (m.module) { if (!MODULE[m.module]) return 'No such module.'; { const sh = moduleShelved(m.module); if (sh) return sh; } if (!k.modules.includes(m.module)) { k.modules.push(m.module); push(g, { kind: 'system', text: c.name + ' learns the Outburst module ' + MODULE[m.module].name + ' (' + why + ').' }); } return ''; }
  if (m.tone) { if (!TONE[m.tone] || m.tone === 'raw') return 'No such tone.'; const kt = (k.tones ||= []); if (!kt.includes(m.tone)) { kt.push(m.tone); push(g, { kind: 'system', text: c.name + ' learns the ' + TONE[m.tone].name + ' tone of Outbursts (' + why + ').' }); } return ''; }
  return 'Nothing to learn.';
}

/** The Narrator's grant (narrator/turn magic[]). Rules 1.10 (item 914): a word grant is a bonus source, so it takes the
 * scene's one new thing and stays within the cap; one that can't land goes on the known-to-study list instead (a study
 * pick can take it later), and the log says why. Schools, modules and tones are granted as before. */
function narratorTeach(g: GameState, c: Character, m: { word?: string; school?: string; module?: string; tone?: string; reason?: string }) {
  const why = m.reason || 'the story';
  if (!m.word) { teach(g, c, m, why); return; }
  const w = m.word.trim().toLowerCase(); if (!SIGIL[w] || (c.sigils || []).includes(w)) { teach(g, c, m, why); return; }
  const spent = g.phase === 'story' && c.learnedScene === g.story.scene.n, full = (c.sigils || []).length >= wordsKnownCap(c);
  if (spent || full) { noteToStudy(c, w); push(g, { kind: 'system', text: c.name + ' glimpses the Sigil word ' + SIGIL[w].word + ' (' + why + '), but ' + (spent ? 'has learned something new this scene already' : 'knows as many words as Brain Power allows') + ': it goes on the known-to-study list.' }); return; }
  if (!teach(g, c, m, why) && g.story?.scene) c.learnedScene = g.story.scene.n;
}

/** The overworld as a throwaway fight state, so every combat rule (paths, sight, actions) runs unchanged. Units carry
 * each character's AP left this round; NPCs are 'foe' units (they block and can be targeted). Objects are the live list. */
export function storyCb(g: GameState): Combat {
  const map = zoneMap(g), scratch = { state: g.rng.state }, pos = positionsOf(g);
  const units = Object.values(g.characters).filter((c) => !c.dead && pos[c.id]).map((c) => { const u = unitFromCharacter(c, pos[c.id], scratch); u.ap = apLeft(g, c); u.heat = g.story.heat?.[c.id] || 0; u.jammed = !!g.story.jammed?.[c.id]; if (u.downed) u.saves = { ok: 0, fail: c.downedFails || 0 }; return u; });
  // Companions on the area map (a drone, a beast): tokens with their own AP this round.
  for (const c of Object.values(g.characters)) { const owner = units.find((x) => x.charId === c.id); if (!owner || !c.companions?.some((k) => COMPANION_ROUND_AP[k.kind] != null)) continue;
    const taken = new Set(units.map((x) => x.pos)); for (const d of companionUnits(null, c, owner, taken, scratch, map, pos)) { if (!pos[d.id] || COMPANION_ROUND_AP[d.companion!] == null) continue; d.pos = pos[d.id]; d.ap = g.story.ap?.[d.id] ?? COMPANION_ROUND_AP[d.companion!]; units.push(d); } }
  for (const n of npcsOf(g)) { const u = unitFromEnemy(n.id, n.name, n.tier, n.weapon, n.pos, scratch, n.level ?? squadLevel(g)); if (n.portrait) u.img = n.portrait; if (n.hidden) u.hidden = true; units.push(u); }
  const cb = { name: 'overworld', overworld: true, map, units, order: units.map((u) => u.id), turn: 0, round: g.story.round, difficulty: 'standard', log: [], over: null, objects: storyObjects(g) } as Combat;
  // Rules 1.7: the zone's hazards (the story's own, so what a step spends stays spent), rolled on the game's dice.
  { const hz = zoneHazards(g, map.id); if (hz.length) { cb.hazards = hz; cb.worldRng = g.rng; } }
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
  const die = auto ? 0 : rollD20(g.rng).die, m = sh.mod, tn = sh.tn, ok0 = auto ? auto === 'success' : judge('roll', { die }, m, tn).ok;
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
  // Rules 1.7 (world.ts): carry, put down, search, attempt (a typed attempt the Narrator mapped: index is 1-based as it
  // lists approaches; idx 0-based), ask.
  if (a.act === 'carry') { carryNpc(g, c!, String(a.targetId || '')); closeRoundIfDone(g); return; }
  if (a.act === 'put_down') { putDown(g, c!, String(a.targetId || ''), a.to); closeRoundIfDone(g); return; }
  if (a.act === 'search') { searchCache(g, c!, String(a.objId || a.targetId || '')); closeRoundIfDone(g); return; }
  // Rules 1.9: pick up from a pile (1 AP, your tile or an adjacent one; a selection, everything by default).
  if (a.act === 'pickup') { const o = a.objId ? storyObjects(g).find((x) => x.id === a.objId && isPile(x)) : null; pickupWorld(g, c!, o ? o.pos : a.tile ? tileKey(g, a.tile) : positionsOf(g)[c!.id], a.take); closeRoundIfDone(g); return; }
  if (a.act === 'attempt') { const idx = a.idx != null ? Math.round(Number(a.idx)) : Math.round(Number(a.index) || 1) - 1; tryApproach(g, c!, by, String(a.objId || a.targetId || ''), idx); return; }
  if (a.act === 'ask') { talkAsk(g, c!, by, String(a.targetId || ''), a.what === 'objective' ? 'objective' : 'wants'); return; }
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
  const before = u.ap; let err: string | null = null, walked: string[] = [];
  if (a.act === 'move') {
    const map = zoneMap(g), k = a.to ? (/,/.test(a.to) ? a.to : keyOf(a.to, map)) : null;
    if (!k || !standable(map, k)) fail('Nobody can stand there.');
    const P = movePaths(cb, u, k!, a.how === 'sprint' ? 'sprint' : a.how === 'sneak' ? 'sneak' : 'move'), tiles = P.dist[k!]; // rules 1.9: the click-path goes around revealed hazards (item 683)
    if (tiles === undefined) fail('There\'s no way through to there: a wall, a closed door or someone is in the way.');
    // 'world_move_cost' {c, u, tiles, how, extra}: sneaking costs 1 AP a tile on top (an item may change that).
    const wm: any = emitStory(g, 'world_move_cost', { c, u, tiles, how: a.how || 'move', extra: a.how === 'sneak' ? tiles : 0, g });
    // The move is priced by moveUnit through 'move_cost' (Charge!, Into the Dark, Shadow Step discount it: hooks gap B9);
    // the sneak's extra comes after. A failure throws, and apply() keeps the state from before the action.
    const extra = Math.max(0, wm.extra), ap0 = u.ap;
    const from = u.pos; err = moveUnit(cb, u, k!, undefined, a.how === 'sprint' ? 'sprint' : 'move', { via: P }); if (err) fail(err.replace(/^Needs (\d+(?:\.\d+)?) AP\.$/, (_m, n) => 'Needs ' + (+n + extra) + ' AP (' + ap0 + ' left).'));
    if (u.ap < extra && a.how !== 'sprint') fail('Needs ' + (Math.round((ap0 - u.ap + extra) * 10) / 10) + ' AP (' + ap0 + ' left).');
    u.ap -= extra;
    const route = routeTo(P, from, k!);
    walked = route.slice(0, route.indexOf(u.pos) + 1); // a hazard or a trap may have stopped the walk short
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
  } else if (a.act === 'reload') err = a.hand === 'both' || a.hand === 'off' ? reloadHands(cb, u, a.hand, !!a.tactical) : reload(cb, u, { tactical: !!a.tactical }); // rules 1.9: speed or tactical
  else if (a.act === 'load') err = loadMagazine(cb, u);
  else if (a.act === 'clear') err = clearJam(cb, u);
  else if (a.act === 'repair') err = fieldRepair(cb, u);
  else if (a.act === 'prone') err = toggleProne(cb, u);
  else if (a.act === 'stim') { if (!target || target.side !== 'pc') fail('Pick an ally.'); err = useStim(cb, u, target!, c!, isMedicChar(c!)); }
  else if (a.act === 'analyze') { if (!target || target.side !== 'foe') fail('Pick someone to read.'); err = analyze(cb, u, target!); if (!err) { readDrawnBy(cb, u, target!); const n = npcsOf(g).find((x) => x.id === target!.id); if (n) n.analyzed = true; } }
  else if (a.act === 'read') { if (!a.tile) fail('Pick a glyph or a trace to read.'); err = readGlyph(cb, u, tileKey(g, a.tile!)); }
  else if (a.act === 'attack') {
    if (a.mode != null) playerMode(a.mode, ['shot', 'aimed', 'melee', 'burst', 'auto'] as const);
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
      // The copy is marked dry: what a release keeps on the character itself (practice, feelings felt) waits for the real one.
      const dry: Combat = JSON.parse(JSON.stringify(cb)); (dry as any).dry = true; const e0 = run(dry, dry.units.find((x) => x.id === u.id)!, { state: g.rng.state }); if (e0) fail(e0);
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
  hazardEvents(g, cb);
  if (walked.length && c!.hp > 0) enterTriggers(g, c!, walked); // rules 1.7: an ambush on the tiles walked
  if (g.phase !== 'story') return;
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
  const was = t.hp; u.ap -= cost; u.parts = (u.parts || 0) - 1; t.hp = Math.min(t.maxHp, t.hp + itemAmount('trait:factory_made', 'repair', [], { improvisation: u.proficiency || 0 })); if (t.downed && t.hp > 0) { t.downed = false; t.saves = { ok: 0, fail: 0 }; }
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
  g.combat = startCombat(fightName, zoneMap(g), pcs, encounterDrops(g, fightName, foes.map((n) => ({ name: n.name, tier: n.tier, weapon: n.weapon, at: refOf(n.pos), hp: n.hp, kind: n.kind, tags: n.tags, caster: n.caster, drops: n.drops, ...(n.level != null ? { level: n.level } : {}) }))), tier, g.rng, storyObjects(g)); magicIn(g, g.combat);
  const cbx = g.combat, seated = cbx.units.filter((x) => x.side === 'foe').length; g.story.npcs = [...stay, ...foes.slice(seated)];
  // Who starts Hidden is set up quietly (no 'sight' event: a lurker the party could have seen must not fade out where it
  // lurks, which would give the ambush away); each side's sight is recorded afresh after it.
  sightQuietly(cbx, () => cbx.units.filter((x) => x.side === 'foe').forEach((x, i) => { const n = foes[i]; if (!n) return; x.npcId = n.id; x.img = n.portrait || n.avatar || x.img; if (n.analyzed) x.analyzedBy = u.id; if (n.hidden) { const l = hideUnit(cbx, x, 'lurking'); if (l) cbx.log.push(l.replace(/^ · /, '') + '.'); delete n.hidden; } }));
  if (!wasHostile) cbx.noXp = true;
  const att = cbx.units.find((x) => x.charId === c.id)!, tgt = cbx.units.find((x) => x.npcId === npc.id)!;
  g.phase = 'combat'; g.story.await = 'none'; musicOf(g).fight++; syncSong(g);
  push(g, { kind: 'combat', text: 'Combat: ' + fightName + (hidden ? ' (' + c.name + ' strikes unseen)' : '') });
  // What each player said this overworld round carries into the fight it opens, as their round-1 line (Verse of War).
  for (const x of cbx.units) { const pc = x.charId ? g.characters[x.charId] : null, t = pc ? g.story.spoken?.[pc.owner] : null; if (pc && t) (cbx.notes ||= []).push(pc.name + ' (round 1): "' + String(t).slice(0, 400) + '"'); }
  sightQuietly(cbx, () => {
    if (hidden) { cbx.order = [att.id, ...cbx.order.filter((id) => id !== att.id)]; cbx.turn = 0; cbx.log.push(c.name + ' strikes from hiding: the fight opens on their turn.'); hideUnit(cbx, att, 'struck from hiding'); }
    // Everyone else still sneaking unseen starts the fight Hidden too (rules 1.3).
    for (const x of cbx.units) if (x.charId && x !== att && g.story.sneak?.[x.charId] && g.story.hidden?.[x.charId]) hideUnit(cbx, x, 'sneaking');
  });
  if (!hidden) { att.waitRound = 2; cbx.log.push(c.name + ' attacks in the open and acts from round 2.'); }
  // The opening strike is an action of the fight like any other (spotlight.ts): its fx start here, so a crit, a takedown,
  // a revive or an intervention in it cuts in and slows its playback (decision 113).
  const before = cbx.units.map((x) => ({ id: x.id, dead: x.dead, downed: x.downed, hp: x.hp }));
  att.ap = apNow; markAction(cbx);
  if (perform) { const e = perform(cbx, att); if (e) cbx.log.push(c.name + ' can\'t: ' + e); } else resolveAttack(cbx, g.rng, att, tgt, mode, c);
  if (hidden && silentTakedown(g, cbx, c, att, tgt)) return; // no fight opens: its moments are thrown away with it
  songTriggers(g, att, c, before);
  critMoment(g);
  if (!hidden) { const cur = active(cbx); if (cur && cur.id === att.id) endTurn(cbx, g.rng); }
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
  // Rules 1.9 (item 699): the death sweep still runs, so the body's drops lie in the pile on its tile on the area map
  // (searching the body is picking up that pile).
  noteDeaths(cbx, g.rng);
  { const p = objectsOf(cbx).find((o) => isPile(o) && o.pos === tgt.pos);
    if (p) { const objs = storyObjects(g), i = objs.findIndex((o) => isPile(o) && o.pos === tgt.pos), copy = JSON.parse(JSON.stringify(p)); if (i >= 0) objs[i] = copy; else objs.push(copy); } }
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
  const unit = unitFromEnemy(n.id, n.name, n.tier, n.weapon, n.pos, { state: g.rng.state }, n.level ?? squadLevel(g)); if (n.portrait) unit.img = n.portrait;
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
  const geom = (z: any) => JSON.stringify([z.w, z.h, z.solid, z.difficult, z.start, z.enemyStart, (z.exits || []).map((e: any) => [e.to, e.at])]);
  // Objects only added (every old one still there by kind and tile, e.g. the rules 1.10 sigil marks) are no layout change.
  const objsKept = (oz: any, fz: any) => (oz.objects || []).every((o: any) => (fz.objects || []).some((x: any) => x.kind === o.kind && x.at === o.at));
  const hadNpcs = new Set(old.zones.filter((z) => z.npcs).map((z) => z.id));
  const zones = fresh.zones.map((fz) => { const oz = old.zones.find((z) => z.id === fz.id); return !oz || (geom(oz) === geom(fz) && objsKept(oz, fz)) ? fz : { ...oz, art: fz.art, music: fz.music, npcs: oz.npcs ?? fz.npcs }; });
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
  /** The Effect testing room is on: one dummy that can't die and never acts, the squad can't fall, and its AP comes
   *  back after every action (sandbox/fxtest; Stop the fight leaves it). */
  fx?: boolean;
  /** Rules 1.10: Junctions on for every character here (testing; normally Brain Power Mastered). */
  junctions?: boolean;
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
  | { type: 'sandbox/fxtest' }
  | { type: 'sandbox/fight' } | { type: 'sandbox/stage'; wave?: number } | { type: 'sandbox/stop' }
  | { type: 'sandbox/wave'; wave?: number } | { type: 'sandbox/retry'; restart?: boolean }
  | { type: 'sandbox/give'; charId: string; item: string; qty?: number; rarity?: Rarity; equip?: boolean }
  | { type: 'sandbox/equip'; charId: string; idx: number; to: 'main' | 'off' | 'worn' | 'mod' } | { type: 'sandbox/unequip'; charId: string; slot: string }
  | { type: 'sandbox/drop'; charId: string; idx: number } | { type: 'sandbox/armour'; charId: string; armourClass: number }
  | { type: 'sandbox/kit'; charId: string; kind?: MagicKit }
  | { type: 'sandbox/class'; charId: string; classId: string | null; rank?: number }
  | { type: 'sandbox/level'; charId: string; level: number } | { type: 'sandbox/skill'; charId: string; skill: string; points: number }
  /** Every skill to the same points at once (the Proving Ground's Max every skill: 10). */
  | { type: 'sandbox/skills'; charId: string; points: number }
  | { type: 'sandbox/perk'; charId: string; perk: string; tier?: 'I' | 'II' | null } | { type: 'sandbox/trait'; charId: string; trait: string; on?: boolean }
  | { type: 'sandbox/refill'; charId?: string }
  | { type: 'sandbox/learn'; charId: string; word?: string; school?: string; module?: string; tone?: string; feeling?: string; forget?: boolean }
  /** Rules 1.8: add practice (n may be negative) to a character. */
  | { type: 'sandbox/practice'; charId: string; n: number }
  // Rules 1.10: grant study; set a known word's use count (30 makes it a Mastered word, its inflection on).
  | { type: 'sandbox/study'; charId: string; study: number } | { type: 'sandbox/word-uses'; charId: string; word: string; uses: number }
  | { type: 'sandbox/mark'; at: string; word: string; age?: string; damage?: string; name?: string; text?: string } | { type: 'sandbox/junctions'; on: boolean }
  | { type: 'sandbox/design'; charId: string; design: OutburstDesign } | { type: 'sandbox/forget'; charId: string; word?: string; designId?: string }
  | { type: 'sandbox/spawn'; tier: string; weapon: string; at: string; name?: string; caster?: string; /** rules 1.15: its level (1 to 20); empty: the squad's */ level?: number } | { type: 'sandbox/clear' }
  | { type: 'sandbox/ai'; on: boolean } | { type: 'sandbox/auto'; on: boolean } | { type: 'sandbox/mana'; value: number }
  // Rules 1.6: set a character's belief, patron, Devotion, Faith, knowledge pieces and vow; reset clears the Miracle and the prayer cooldowns.
  | { type: 'sandbox/faith'; charId: string; belief?: 'faithful' | 'atheist'; patron?: string; devotion?: number; faith?: number; pieces?: Record<string, number>; vow?: string | null; allyId?: string; reset?: boolean }
  // Rules 1.7 (World Play): place a cache, a hazard, a trigger, a person (face and talk), and an objective with where.
  | { type: 'sandbox/cache'; at: string; name?: string; text?: string; items: CacheItem[]; locked?: boolean; approaches?: NarratorApproach[] }
  /** Rules 1.9: a pile on the ground (open: anyone who sees the tile sees it), the Narrator's ground[] entry. */
  | { type: 'sandbox/pile'; at: string; items: CacheItem[]; hidden?: boolean }
  | { type: 'sandbox/hazard'; kind?: string; severity?: 'light' | 'heavy'; tiles?: string[]; rect?: { from: string; to: string }; hidden?: boolean; name?: string; remove?: string }
  | { type: 'sandbox/trigger'; when: 'enter' | 'examine' | 'objective'; tiles?: string[]; rect?: { from: string; to: string }; objId?: string; objective?: string; then: 'spawn' | 'fight' | 'reveal'; spawn?: NonNullable<NarratorTurn['npcs']>; difficulty?: string; name?: string; reveal?: string[]; text?: string; remove?: string }
  | { type: 'sandbox/npc'; name: string; at: string; side?: 'hostile' | 'neutral'; kind?: string; avatar?: string; tier?: string; weapon?: string; hidden?: boolean; wants?: string; knows?: { objective: string; hint: string; at?: string }; talk?: NarratorApproach[]; prisoner?: boolean }
  // Physical 2.0: learn or forget a technique ('all': every one), and ready it; drill on a weapon's bar; a unit's meters.
  | { type: 'sandbox/technique'; charId: string; id: string; forget?: boolean; ready?: boolean } | { type: 'sandbox/drill'; charId: string; weaponId: string; amount: number }
  | { type: 'sandbox/meter'; unitId: string; momentum?: number; pressure?: number }
  | { type: 'sandbox/objective'; id: string; text?: string; where?: Where; status?: 'done' | 'failed' | 'open' };

/** Actions with no place in the Proving Ground: the Narrator's, the story's, the room's start. */
const SANDBOX_REFUSED = /^(narrator\/|session\/start|story\/|poi\/|world\/|voice\/|check\/|overreach\/|vote\/|campaign\/)/;
/** The area map's own actions, which work while gearing up (moving, doors, attacking or casting on a drill unit). */
const SANDBOX_STORY = /^(world\/act|story\/(move|door|focus|unfocus)|poi\/try)$/;
export const PROVING_GROUND = expandCampaign(provingJ as any) as unknown as Campaign;
/** Drill units by tier: their names and the weapons each wave cycles through. */
export const SANDBOX_TIERS: Record<string, { name: string; weapons: string[] }> = {
  vermin: { name: 'Drill mite', weapons: ['beast_bite', 'combat_knife'] }, // rules 1.15: spawned by hand; the waves don't use it yet
  minion: { name: 'Drill drone', weapons: ['service_pistol', 'combat_knife', 'decrkm_smg', 'lever_carbine'] },
  soldier: { name: 'Sparring trooper', weapons: ['hellraiser_service_rifle', 'lumeri_scattergun', 'legion_pdw', 'sabre'] },
  elite: { name: 'Range warden', weapons: ['legion_bullpup', 'brigade_auto_shotgun', 'ccec_marksman_rifle', 'war_axe'] },
  boss: { name: 'Proving champion', weapons: ['hellraiser_lmg', 'adamantile_greatsword'] },
};
/** Advanced classes (rules 1.2): the engine knows them by id for the tools; base classes are in CLASS. */
/** A Medic, or an advanced class with Medic as a parent (the 1 AP stim: hooks gap I14). */
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
  'prone', 'braced', 'guardBrace', 'overwatch', 'reactedRound', 'conds', 'shield', 'moved', 'firstShotDone', 'waitRound', 'analyzedBy', 'weakPoint', 'song', 'init',
  'condBy', 'condVia', 'condArg', 'condFresh', 'hidden', 'hideEntry', 'ambushUsed', 'reactUsed', 'owShots', 'firstShotTurn', 'sprinted', 'attackedTurn', 'res', 'prayedRound', 'vow', 'faith', 'uses', 'ps', 'armed', 'apNext', 'apDebt', 'apGained', 'apTurnTotal', 'lastHitBy', 'damagedBy', 'throwables', 'ammoType', 'magTypes',
  // Physical 2.0 (rules 1.12): the meters and what a technique left on the unit
  'pressure', 'pressHidden', 'pressBy', 'hitRound', 'hitWith', 'stopped', 'watch', 'chain', 'tech', 'setUp', 'pressedThis', 'nearFoe0', 'noWatch', 'freeReload', 'nailed', 'openerUsed',
  // Calls (rules 1.13): the marks Calls left and the unit's own Call counters
  'call'] as const;

/** Rebuild a character's fighter after the tools changed the character. mode 'keep' carries the fight's state (HP,
 * AP, stance, conditions, Flux, Strain, a held Outburst); 'refill' starts it fresh where it stands (AP full on its turn). */
function sbRebuild(g: GameState, c: Character, mode: 'keep' | 'refill') {
  const cb = liveFight(g); if (!cb) return;
  const i = cb.units.findIndex((u) => u.charId === c.id); if (i < 0) return;
  const old = cb.units[i], u = unitFromCharacter(c, old.pos, { state: g.rng.state });
  u.init = old.init;
  u.side = old.side; // a Team B fighter stays on Team B (a team fight's foe side) when it changes mid-fight
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
  ensureMomentum(u); // rules 1.12: the rebuilt fighter keeps its meter (resMax comes fresh from the character)
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
  if (c.offHand && WEAPON[c.offHand.id]?.magazine != null) c.offHand = { ...c.offHand, loaded: magazineSize(c.offHand.id, c.offHand.mods) ?? 0 }; // the off-hand gun keeps its own rounds now (item 688)
  const pack = packOf(c).map((it) => (it.mags && it.weapon ? { ...it, mags: it.mags.map(() => magazineSize(it.weapon!) ?? 0) } : { ...it }));
  const w = WEAPON[c.weapon];
  if (w?.magazine != null && w.reload !== 'loose' && !pack.some((it) => it.weapon === c.weapon && it.mags)) pack.push(magsOf(c.weapon, 3));
  if (w?.ammo) { const r = pack.find((it) => it.calibre === w.ammo); const want = 3 * (w.magazine || 6); if (r) r.qty = Math.max(r.qty, want); else pack.push(roundsOf(w.ammo, want)); }
  if (carriesEvoker(c)) { c.evoCharge = CORE_CHARGE; const core = pack.find((it) => (it.item || it.id) === 'standard_core'); if (core) core.qty = Math.max(core.qty, 4); else pack.push({ id: 'standard_core', item: 'standard_core', name: ITEM.standard_core?.name || 'Standard mana core', qty: 4, kind: 'ammo' }); }
  c.pack = pack;
  if (carriesEmanator(c)) c.mp = maxMp(c);
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
/** Raise a class's attribute (and its Core) to at least `v`: the Proving Ground's rank II (5) and III (8). */
function sbRaiseAttr(c: Character, classId: string, v: number) {
  const at = CLASS[classId]?.attribute; if (!at) return;
  const core = (ATTRS.find((x) => x.id === at)?.core || 'body') as keyof Character['cores'];
  if ((c.cores[core] || 1) < v) c.cores = { ...c.cores, [core]: v };
  if ((c.attrs[at] || 1) < v) c.attrs = { ...c.attrs, [at]: v };
  grantAutomaticPerks(c);
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
  if (to === 'main') { c.loaded = magazineSize(c.weapon, c.weaponState?.mods) ?? 0; c.loadedType = null; }
  // The off hand's gun comes loaded too, as the tools say (review fix: item 688 left it empty here).
  if (to === 'off' && c.offHand && WEAPON[c.offHand.id]?.magazine != null) { const { ammoType: _t, ...oh } = c.offHand; void _t; c.offHand = { ...oh, loaded: magazineSize(c.offHand.id, c.offHand.mods) ?? 0 }; }
  return null;
}
/** Take something off: the main hand too (the weapon goes to the pack with its rounds and the hands are empty: fists). */
const sbUnequip = (c: Character, slot: string): string | null => unequip(c, slot);
/** The magic kit: the focus in the off hand where it fits (spec: Hands 2; a focus counts only in a hand, item 630), with
 * cores and a few words for Sigils, full MP and two ready designs for Outbursts. A focus that doesn't fit (a two-handed
 * weapon, a full off hand, the second focus of the both kit) goes to the pack, and the line says so (item 635). */
function sbKit(g: GameState, c: Character, kind: MagicKit): string[] {
  const got: string[] = [];
  const learn = (m: { word?: string; school?: string }) => {
    if (m.word && SIGIL[m.word] && !(c.sigils ||= []).includes(m.word)) { c.sigils.push(m.word); got.push(SIGIL[m.word].word); }
    const k = (c.soulKnown ||= { schools: [], modules: [] });
    if (m.school && SCHOOL[m.school] && !k.schools.includes(m.school)) { k.schools.push(m.school); got.push(SCHOOL[m.school].name + ' (school)'); }
  };
  /** Give a focus, into the off hand if it can go there; say where it went. */
  const focus = (kindF: 'evoker' | 'emanator', name: string) => {
    const where = focusHand(c, kindF);
    if (where === 'main' || where === 'off') { got.push(name + ' (already in your ' + (where === 'main' ? 'main' : 'off') + ' hand)'); return; }
    const at = where === 'pack' ? packOf(c).findIndex((x) => x.qty > 0 && FOCUS_IDS[kindF].includes(x.weapon || x.item || x.id)) : sbGive(c, kindF, 1, 'standard');
    const why = twoHands(c, c.weapon) ? 'your two-handed ' + (WEAPON[c.weapon]?.name || 'weapon') + ' fills both hands' : c.offHand ? 'your off hand holds ' + (WEAPON[c.offHand.id]?.name || ITEM[c.offHand.id]?.name || c.offHand.id) : '';
    const err = why || at < 0 ? why || 'not found' : equip(c, at, 'off');
    if (!err) { got.push(name + ' (off hand)'); return; }
    got.push(name + ' (in the pack: ' + err.replace(/\.$/, '').replace(/^./, (x) => x.toLowerCase()) + '; swap it into a hand to cast)');
  };
  if (kind !== 'soul') {
    focus('evoker', 'an Evoker');
    sbGive(c, 'standard_core', 4, 'standard'); c.evoCharge = CORE_CHARGE; got.push('4 mana cores');
    for (const w of MAGIC_KIT.words) learn({ word: w });
  }
  if (kind !== 'sigil') {
    focus('emanator', 'an Emanator');
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
  const anyFree = () => nearestFree(map.w, map.h, map.foeStart[0] || '0,0', free); // more drill units than start tiles: beside the start, never across the map
  sb.placed = { wave: n, party: sbParty(g) };
  g.story.npcs = sandboxWave(n, sb.placed.party).map((f) => {
    const at = map.foeStart.find(free) || anyFree() || map.foeStart[0]; taken.add(at);
    return { id: 'foe-s' + (++sb.spawned), name: f.name, side: 'hostile', tier: f.tier, weapon: f.weapon, pos: at, portrait: portraitFor(g, f.name, seen) || undefined, facing: facingToward(at, centre), ...(f.caster ? { caster: f.caster } : {}) } as Npc;
  });
}
/** The Effect testing room (Leon, 11 Nov 2026): a place to look at every weapon's and spell's effects. One dummy that
 * can't die and never acts stands 4 tiles from the squad; nobody can be brought to 0; AP comes back after every action. */
export const FX_DUMMY_HP = 9999, FX_ROOM_AP = 9;
function sbEffectRoom(g: GameState) {
  const sb = sbOf(g), map = zoneMap(g), pos = positionsOf(g), [cx, cy] = partyCentre(g).split(',').map(Number);
  const taken = new Set<string>([...Object.values(pos), ...storyObjects(g).filter(blocksMove).map((o) => o.pos)]);
  const free = (k: string) => standable(map, k) && !taken.has(k);
  const want = Math.max(0, Math.min(map.w - 1, cx + (cx + 4 < map.w ? 4 : -4))) + ',' + cy, at = nearestFree(map.w, map.h, want, free) || want;
  g.story.npcs = [];
  sbBegin(g, sb.wave || 1, [{ name: 'Target dummy', tier: 'elite', weapon: 'fists', at: refOf(at) }], { ...pos }, storyObjects(g), 'Effect testing');
}
/** After every action in the Effect testing room: the squad's AP is full again. */
function fxRoomAfter(g: GameState) {
  const cb = g.combat; if (!cb || cb.over || !g.sandbox?.fx) return;
  for (const u of cb.units) if (u.side !== 'foe' && !u.dead && !u.downed) u.ap = Math.max(u.ap, FX_ROOM_AP);
}
/** Begin a fight on the Proving Ground map: the squad where it stands (pos), these foes, everyone on the fight's clock. */
function sbBegin(g: GameState, n: number, foes: { name: string; tier: string; weapon: string; at?: string; hp?: number; npc?: Npc; caster?: string; hidden?: boolean; level?: number }[], pos: Record<string, string>, objects?: MapObject[], room?: string) {
  const sb = sbOf(g), wasLive = !!liveFight(g), map = zoneMap(g);
  const pcs = Object.values(g.characters).filter((c) => !c.dead).map((c) => ({ c, pos: pos[c.id] }));
  if (!pcs.length) fail('Lock in a character first.');
  const cb = startCombat('Proving Ground · ' + (room || 'Wave ' + n), map, pcs, foes, n % 5 === 0 ? 'boss' : n >= 4 ? 'hard' : 'standard', g.rng, objects);
  magicIn(g, cb);
  cb.noXp = true;
  const seated = cb.units.filter((u) => u.side === 'foe');
  if (room) { sb.fx = true; for (const u of cb.units) u.undying = true; for (const u of seated) { u.maxHp = u.hp = FX_DUMMY_HP; } }
  cb.log.unshift(room ? room.toUpperCase() + ' · the dummy can\'t die and never acts · your AP comes back after every action'
    : 'WAVE ' + n + (sb.attempt > 1 ? ' · attempt ' + sb.attempt : '') + ' · ' + seated.length + ' drill unit' + (seated.length === 1 ? '' : 's'));
  { const seen: Record<string, number> = {}; seated.forEach((u, i) => { const f = foes[i]; u.npcId = f?.npc?.id || u.id; const p = f?.npc?.portrait || portraitFor(g, u.name, seen); if (p) u.img = p; }); }
  g.story.npcs = [...(g.story.npcs || []).filter((x) => !foes.some((f) => f.npc === x)), ...(foes.slice(seated.length).map((f) => f.npc).filter(Boolean) as Npc[])];
  g.combat = cb; g.phase = 'combat'; g.story.await = 'none'; g.story.work = null;
  if (!room) sb.wave = n;
  sb.state = 'fighting'; sb.waveMana = cb.mana ?? MANA_START; sb.fights = (sb.fights || 0) + 1;
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
  if (sb.fx) { sb.fx = false; cb.units = cb.units.filter((u) => u.side !== 'foe'); how = 'stop'; } // the Effect testing room: the dummy goes, nothing is won or lost
  const pos: Record<string, string> = {}; for (const u of cb.units) if (u.charId && !u.dead) pos[u.charId] = u.pos;
  sbCollect(g);
  if (how !== 'fell') {
    g.story.positions = pos; g.story.objects = JSON.parse(JSON.stringify((cb.objects || []).filter((o: any) => !o.grandWall)));
    // The seated foes still standing go back as tokens with the HP they have left; everyone the fight did not seat
    // (overflow units, people who were not hostile) stays on the map as they were, moved aside if a fighter ended on their tile.
    const back = cb.units.filter((u) => u.side === 'foe' && !u.dead && !u.downed).map((u) => ({ id: u.npcId || u.id, name: u.name, side: 'hostile', tier: u.tier || 'minion', weapon: u.weapon, pos: u.pos,
      portrait: u.img || undefined, ...(u.analyzedBy ? { analyzed: true } : {}), ...(u.hp < u.maxHp ? { hp: u.hp } : {}), ...(u.drops ? { drops: u.drops } : {}), ...(u.level != null && u.level !== cb.level ? { level: u.level } : {}) }) as Npc);
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
  noteDeaths(cb, g.rng); // a death on the enemies' own turn is swept (and drops) before the field becomes the map again
  faithFightEnd(g, cb); // rules 1.6: vows kept or broken, mercy, flight
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
      sbBegin(g, n, foes.map((x) => ({ name: x.name, tier: x.tier, weapon: x.weapon, at: refOf(x.pos), hp: x.hp, npc: x, caster: x.caster, ...(x.hidden ? { hidden: true } : {}), ...(x.level != null ? { level: x.level } : {}) })), { ...positionsOf(g) }, storyObjects(g)); // a hostile placed Hidden starts the fight Hidden (as in a Narrator's fight)
      return;
    }
    case 'sandbox/fxtest': {
      hostOnly(); if (!gearing) fail('Stop the fight first.');
      if (sb.mode === 'teams') fail('Team fight: no Effect testing (switch the mode to Co-op waves).');
      sbEffectRoom(g);
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
    // Rules 1.10 (Sigil 1.5) tools: place a sigil mark (while gearing up); Junctions on for everyone here.
    case 'sandbox/mark': {
      fieldOnly(); if (!gearing) fail('Place things while gearing up (stop the fight first).');
      const w = String(a.word || '').trim().toLowerCase(); if (!SIGIL[w]) fail('No such word.');
      const before = storyObjects(g).length;
      applyObjectOp(g, { action: 'place', id: '', kind: 'sigil_mark', at: a.at, name: a.name || 'Sigil mark: ' + SIGIL[w].word, text: a.text || 'A Sigil word cut into the wall.', approaches: [], word: w, ...(a.age ? { age: a.age } : {}), ...(a.damage ? { damage: a.damage } : {}) });
      if (storyObjects(g).length === before) fail('Nothing can go there.');
      const o = storyObjects(g).at(-1)!; sbLog(g, o.name + ' (' + (o.age || MARK.age) + ', ' + (o.damage || MARK.damage) + ', TN ' + o.approaches[0].tn + ') at ' + refOf(o.pos) + ' [' + o.id + '].'); return;
    }
    case 'sandbox/junctions': { hostOnly(); sb.junctions = !!a.on; sbLog(g, 'Junctions ' + (sb.junctions ? 'on for everyone here: a glyph may join two strokes.' : 'off: Brain Power Mastered only.')); return; }
    case 'sandbox/ai': { hostOnly(); sb.ai = !!a.on; sbLog(g, 'Enemy AI ' + (sb.ai ? 'on.' : 'off: enemies pass their turns.')); return; }
    case 'sandbox/faith': {
      const c = mine(a.charId), lines: string[] = [];
      if (a.patron && !FAITH_PATRON[a.patron]) fail('No such patron.');
      if (a.vow && !VOW[a.vow]) fail('No such vow.');
      sbChange(g, c, () => {
        if (a.faith != null) sbSetSkill(c, 'faith', a.faith);
        // Rules 1.6.1: the stepper sets the level (the XP at its threshold, item 701); the tools ignore the pact cooldown.
        if (a.belief === 'atheist') { c.belief = { kind: 'atheist' }; c.patron = null; setDevotionXp(c, 0); }
        else if (a.belief === 'faithful' || a.patron) { const pid = a.patron || patronOf(c)?.id || Object.keys(FAITH_PATRON)[0]; if (patronOf(c)?.id !== pid) setDevotionXp(c, devotionThreshold(3)); c.belief = { kind: 'faithful', patron: pid }; c.patron = pid; c.faithLeft = null; }
        if (a.devotion != null && beliefOf(c).kind === 'faithful') setDevotionXp(c, devotionThreshold(a.devotion));
        if (a.pieces) {
          const own = patronOf(c)?.id, pc: Record<string, number> = {};
          for (const [pid, n] of Object.entries(a.pieces)) if (FAITH_PATRON[pid] && pid !== own && n > 0) pc[pid] = Math.min(3, Math.round(n));
          c.faithPieces = pc; c.hymns = Object.entries(pc).flatMap(([pid, n]) => (FAITH_PATRON[pid].hymns || []).slice(0, n).map((h: any) => pid + '.' + h.id));
        }
        if (a.reset) { c.miracleSession = undefined; c.ritesKept = {}; delete c.faithTally; const st: any = c.state; if (st?.faith) st.faith = {}; }
      });
      const u = cb?.units.find((x) => x.charId === c.id);
      if (u && a.reset) { u.prayedRound = undefined; if (u.faith) { delete u.faith.whisperTurn; delete u.faith.hymnCut; delete u.faith.vowBank; delete u.faith.ownHymn; delete u.faith.intervened; delete u.faith.interventions; u.faith.liked = 0; } }
      if (a.vow !== undefined) {
        const v = a.vow ? VOW[a.vow] : null, al = v?.needs_ally ? cb?.units.find((x) => (x.id === a.allyId || x.charId === a.allyId) && x.side === u?.side && x !== u) : null;
        if (v?.needs_ally && u && !al) fail('Name the ally to shield.');
        c.vow = v ? { id: v.id, ...(al ? { allyId: al.id } : {}), state: 'sworn' } : null; if (u) u.vow = c.vow ? { ...c.vow } : null;
        if (v) lines.push('vow "' + v.words + '"');
      }
      const b = beliefOf(c);
      sbLog(g, c.name + ': ' + (b.kind === 'faithful' ? 'Faithful to ' + FAITH_PATRON[b.patron].name + ', Devotion ' + devotionNow(c) : 'an Atheist') + ', Faith ' + (c.skills.faith || 0) + (Object.keys(c.faithPieces || {}).length ? ', pieces ' + Object.entries(c.faithPieces!).map(([k, n]) => FAITH_PATRON[k].name + ' ' + n).join(', ') : '') + (lines.length ? ', ' + lines.join(', ') : '') + (a.reset ? ' (Miracle and cooldowns reset)' : '') + '.');
      return;
    }
    case 'sandbox/mana': {
      fieldOnly(); const v = Math.max(0, Math.min(40, Math.round(Number(a.value) || 0)));
      g.story.mana = v; if (cb) { cb.mana = v; emitFx(cb, 'mana', { band: MANA_BANDS.find((b) => v >= b.min && v <= b.max)?.id || '', mana: v }); }
      sbLog(g, 'The mana meter is set to ' + v + '.'); return;
    }
    case 'sandbox/cache': case 'sandbox/pile': case 'sandbox/hazard': case 'sandbox/trigger': case 'sandbox/npc': case 'sandbox/objective': {
      fieldOnly(); if (!gearing) fail('Place things while gearing up (stop the fight first).');
      sbWorldPlay(g, a); return;
    }
    case 'sandbox/spawn': {
      fieldOnly();
      if (sb.mode === 'teams') fail('Team fight: no drill units (switch the mode to Co-op waves).');
      if (!ENEMY[a.tier]) fail('Pick a tier: vermin, minion, soldier, elite or boss.');
      const lvl = levelGiven(a.level) ?? undefined; // rules 1.15: empty is the squad's level
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
        npcsOf(g).push({ id: 'foe-s' + (++sb.spawned), name: nm, side: 'hostile', tier: a.tier, weapon, pos: k, portrait: portraitFor(g, nm) || undefined, facing: facingToward(k, partyCentre(g)), ...(caster ? { caster: caster.id } : {}), ...(lvl != null ? { level: lvl } : {}) });
        sbLog(g, nm + ' (' + a.tier + (lvl != null ? ' level ' + lvl : '') + ', ' + WEAPON[weapon].name + (caster ? (HEART_CASTER[caster.id] ? ', Outbursts' : ', Sigils') : '') + ') stands at ' + refOf(k) + '.');
        return;
      }
      if (!cb) fail('No fight is on.');
      const k = tileKey(g, a.at);
      if (!standable(cb!.map, k) || cb!.units.some((u) => u.pos === k && !u.dead) || objectsOf(cb!).some((o) => o.pos === k && blocksMove(o))) fail('Nobody can stand there.');
      const nm = name || (SANDBOX_TIERS[a.tier]?.name || 'Drill unit') + ' ' + (cb!.units.filter((u) => u.tier === a.tier).length + 1);
      const u = unitFromEnemy('foe-s' + (++sb.spawned), nm, a.tier, weapon, k, g.rng, lvl ?? squadLevel(g)); u.npcId = u.id; // empty: the squad's level as it is now (a level-up in the middle of a fight counts)
      if (caster) { armFoe(u, { caster: caster.id }); armHeart(u, { caster: caster.id }); levelFoeMagic(u); }
      const p = portraitFor(g, nm); if (p) u.img = p;
      cb!.units.push(u); cb!.order.push(u.id);
      sbLog(g, nm + ' (' + a.tier + ' level ' + u.level + ', ' + WEAPON[weapon].name + (caster ? (HEART_CASTER[caster.id] ? ', Outbursts' : ', Sigils') : '') + ') enters at ' + refOf(k) + '.');
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
      // A focus counts only in a hand (item 630): say so when one lands in the pack.
      const fk = FOCUS_IDS.evoker.includes(a.item) ? 'evoker' : FOCUS_IDS.emanator.includes(a.item) ? 'emanator' : null, fh = fk ? focusHand(c, fk) : null;
      sbLog(g, c.name + ' gets ' + (WEAPON[a.item]?.name || ITEM[a.item]?.name) + (WEAPON[a.item] && rarity !== 'standard' ? ' (' + rarity + ')' : '') + (a.equip && !err ? ', equipped' : '') + (fk && fh === 'pack' ? ' (in the pack: a focus counts only in a hand; equip it to cast)' : '') + '.');
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
        else { const want = Math.max(0, Math.min(5, Math.round(a.armourClass))), cap = armourCap(c); if (cap != null && want > cap) fail(c.name + ' can wear Class ' + cap + ' at most (' + (TRAITS.find((x) => (c.traits || []).includes(x.id) && (x as any).effects?.some((e: any) => e.op === 'armor_class_max'))?.name || 'a trait') + ').'); { const ag = armourGateWhy(c, want); if (ag) fail(ag); } c.armourClass = want; } // heavy armour asks Pain Threshold (rules 1.13)
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
          // Advanced classes are shelved (Class Roster Revision 3); once one is active again, the Proving Ground raises
          // its attribute pair to the gate (hybrid 6 / 5, squared 9) and seats it with its first pair attribute's class.
          if (!advancedActive(adv.id)) fail(ADVANCED_SHELVED);
          const full: any = ((classesJ as any).advanced || []).find((x: any) => x.id === adv.id), [pa, pb] = full.pair || [], base = CLASSES.find((k) => k.attribute === pa);
          if (base) { sbRaiseAttr(c, base.id, full.kind === 'squared' ? 9 : 6); const pbc = CLASSES.find((k) => k.attribute === pb); if (pbc && full.kind !== 'squared') sbRaiseAttr(c, pbc.id, 5); }
          c.classId = base?.id || null; sb.advanced[c.id] = adv.id; c.advancedClass = adv.id; return;
        }
        if (!CLASS[a.classId]) fail('No such class.');
        c.classId = a.classId;
        const rank = Math.max(1, Math.min(3, Math.round(a.rank || 1)));
        if (rank >= 2) {
          sbRaiseAttr(c, a.classId, rank === 3 ? 8 : 5);
          // rules 1.11: a rank needs its level too; the Proving Ground raises the level to it (points and all)
          const need = rank === 3 ? RANK_LEVEL.III : RANK_LEVEL.II;
          if (c.level < need) { c.xp = Math.max(c.xp, xpForLevel(need)); applyLevels(c); c.hp = maxHp(c); }
        }
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
    case 'sandbox/skills': {
      const c = mine(a.charId), n = Math.max(0, Math.min(10, Math.round(Number(a.points) || 0)));
      sbChange(g, c, () => { for (const id of Object.keys(SKILL)) sbSetSkill(c, id, n); });
      sbLog(g, c.name + ': every skill ' + n + (n === 10 ? ' (Mastered)' : '') + '.'); return;
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
      if (a.word && !SIGIL[a.word]) fail('No such word.'); if (a.school && !SCHOOL[a.school]) fail('No such school.'); if (a.module && !MODULE[a.module]) fail('No such module.'); if (a.module && !a.forget) { const sh = moduleShelved(a.module); if (sh) fail(sh); } if (a.tone && (!TONE[a.tone] || a.tone === 'raw')) fail('No such tone.');
      if (a.feeling && !FEELING[a.feeling]) fail('No such feeling.');
      if (!a.word && !a.school && !a.module && !a.tone && !a.feeling) fail('Pick a word, a school, a module, a tone or a feeling.');
      // Rules 1.8: grant (or take back) a feeling; the Proving Ground ignores gates and the "who feels" rule.
      if (a.feeling) {
        const on = !a.forget, f = FEELING[a.feeling];
        sbChange(g, c, () => { const k = (c.feelings ||= []); if (on && !k.includes(a.feeling!)) k.push(a.feeling!); if (!on) c.feelings = k.filter((x) => x !== a.feeling); });
        sbLog(g, c.name + (on ? ' has felt ' : ' forgets ') + f.name + '.');
        if (!a.word && !a.school && !a.module && !a.tone) return;
      }
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
    case 'sandbox/technique': {
      const c = mine(a.charId), ids = a.id === 'all' ? TECHNIQUES.filter((t) => !t.free && !t.needs?.shield && !t.innate).map((t) => t.id) : [a.id]; // what a shield or a skill gives is never learned
      if (ids.some((id) => !TECHNIQUE[id] || TECHNIQUE[id].free)) fail('No such technique to learn.');
      sbChange(g, c, () => {
        const p = ensurePhys(c);
        for (const id of ids) {
          const sys = TECHNIQUE[id].system;
          if (a.forget) { p.known = p.known.filter((x) => x !== id); p.ready[sys] = p.ready[sys].filter((x) => x !== id); continue; }
          if (!p.known.includes(id)) p.known.push(id);
          // the Proving Ground readies past the cap when asked to (ready: true), so every technique can be tried
          if (a.ready !== false && !p.ready[sys].includes(id) && (a.ready || a.id !== 'all')) p.ready[sys].push(id);
        }
        if (a.id === 'all' && a.ready) (p as any).uncapped = true; else if (a.forget && a.id === 'all') delete (p as any).uncapped;
      });
      sbLog(g, c.name + (a.forget ? ' forgets ' : ' learns ') + (a.id === 'all' ? 'every technique' : TECHNIQUE[a.id].name) + '.'); return;
    }
    case 'sandbox/drill': {
      const c = mine(a.charId), n = Math.round(Number(a.amount) || 0); if (!WEAPON[a.weaponId]) fail('No such weapon.'); if (!n) fail('How much drill?');
      let r: ReturnType<typeof addDrill> | null = null; sbChange(g, c, () => { r = addDrill(c, a.weaponId, n); });
      sbLog(g, c.name + ': drill with the ' + WEAPON[a.weaponId].name + ' ' + r!.total + (r!.learned ? ' (' + TECHNIQUE[r!.learned]?.name + ' learned)' : '') + '.'); return;
    }
    case 'sandbox/meter': {
      hostOnly(); const cb = liveFight(g), u = cb?.units.find((x) => x.id === a.unitId); if (!cb || !u) fail('No such fighter.');
      if (a.momentum != null) { ensureMomentum(u!); if (u!.resMax?.momentum != null) u!.res!.momentum = Math.max(0, Math.min(u!.resMax.momentum, Math.round(a.momentum))); }
      if ((a as any).guard != null) { const n = Math.max(0, Math.min(5, Math.round((a as any).guard))); (u!.res ||= {}).guard = n; (u!.resMax ||= {}).guard = Math.max(u!.resMax.guard || 0, n); } // for looking at the token's Guard pips
      if ((a as any).shield != null) u!.shield = Math.max(0, Math.round((a as any).shield));
      if (a.pressure != null) { const to = Math.max(0, Math.round(a.pressure)), now = pressureOf(u!); if (to > now) addPressureTo(cb!, u!, to - now, null, 'the Proving Ground'); else lowerPressureOf(cb!, u!, now - to, 'the Proving Ground'); }
      return;
    }
    case 'sandbox/practice': {
      const c = mine(a.charId), n = Math.round(Number(a.n) || 0); if (!n) fail('How much practice?');
      sbChange(g, c, () => { c.soulPractice = Math.max(0, (c.soulPractice || 0) + n); });
      sbLog(g, c.name + "'s practice " + (n > 0 ? '+' : '−') + Math.abs(n) + ' (' + (c.soulPractice || 0) + ').'); return;
    }
    case 'sandbox/design': {
      const c = mine(a.charId), d = a.design;
      if (!d || !SCHOOL[d.school] || (d.school2 && !SCHOOL[d.school2])) fail('Pick a school.');
      const mods = migrateDesign({ id: '', name: '', school: d.school, modules: [...new Set(d.modules || [])] }).modules.filter((x) => MODULE[x]).slice(0, 4);
      { const why = mods.map(moduleShelved).find(Boolean) || designShapeError(mods) || (d.school2 && d.school2 === d.school ? sameSchoolError(c) : null) || (d.school2 ? pairingError(d.school, d.school2, mods) : null); if (why) fail(why); }
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
    // Rules 1.10 (Sigil 1.5) tools: grant study; set a known word's use count (30: a Mastered word, its inflection on).
    case 'sandbox/study': {
      const c = mine(a.charId), n = Math.round(Number(a.study)); if (!Number.isFinite(n) || n === 0 || Math.abs(n) > 500) fail('Study: a whole number, at most 500.');
      const s0 = growthOf(c); s0.study = Math.max(0, s0.study + n);
      sbLog(g, c.name + (n > 0 ? ' gains ' + n : ' loses ' + -n) + ' study (' + s0.study + ').'); return;
    }
    case 'sandbox/word-uses': {
      const c = mine(a.charId), w = String(a.word || '').toLowerCase(), n = Math.round(Number(a.uses));
      if (!SIGIL[w]) fail('No such word.'); if (!(c.sigils || []).includes(w)) fail(c.name + ' doesn\'t know ' + SIGIL[w].word + '.');
      if (!Number.isFinite(n) || n < 0 || n > 999) fail('Uses: 0 to 999.');
      sbChange(g, c, () => { growthOf(c).uses[w] = n; });
      sbLog(g, c.name + '\'s ' + SIGIL[w].word + ' has ' + n + ' use' + (n === 1 ? '' : 's') + (n >= WORD_MASTERY.mastered ? ': a Mastered word, its inflection on' : n >= WORD_MASTERY.practised ? ': Practised' : '') + '.'); return;
    }
  }
  fail('Unknown action.');
}
/** The ordinary gear and magic-book actions in the Proving Ground: the magic book changes mid-fight for free (the fighter
 * is rebuilt); gear in a live fight is a combat action at its cost (rules 1.9). */
function sandboxGear(g: GameState, a: Action, by: string) {
  const charId = (a as any).charId as string, c = g.characters[charId]; if (!c || c.owner !== by) fail('Not your character.');
  // The player's own gear in a live fight costs what it costs in any fight (rules 1.9, item 690); the tools stay free.
  if (/^gear\/(equip|unequip|mod)$/.test(a.type) && liveFight(g)?.units.some((u) => u.charId === charId && !u.companion)) { gearForward(g, a as any, by); return; }
  const m: Record<string, () => SandboxAction> = {
    'gear/equip': () => ({ type: 'sandbox/equip', charId, idx: (a as any).idx, to: (a as any).to }),
    'gear/unequip': () => ({ type: 'sandbox/unequip', charId, slot: (a as any).slot }),
    'gear/mod': () => ({ type: 'sandbox/equip', charId, idx: (a as any).idx, to: 'mod' }),
    'magic/design': () => ({ type: 'sandbox/design', charId, design: (a as any).design }),
    'magic/forget': () => ({ type: 'sandbox/forget', charId, designId: (a as any).designId }),
    'magic/learn': () => ({ type: 'sandbox/learn', charId, word: (a as any).word, school: (a as any).school, module: (a as any).module, tone: (a as any).tone }),
    'magic/pick': () => ({ type: 'sandbox/learn', charId, module: (a as any).module }),
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
      const err = validateSheet(a.sheet) || startingTechniquesError(a.sheet as any) || (typeof a.sheet.portrait === 'string' && a.sheet.portrait.length > PORTRAIT_MAX ? 'That portrait is too big for a room.' : null)
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
  delete cb.sightSeen; sightFx(cb); // the sides changed: record each team's opening sight again
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
  const other = (s: any) => (s === 'pc' ? 'foe' : s === 'foe' ? 'pc' : s);
  const flip = <T extends { side?: any }>(x: T): T => (x.side === 'pc' || x.side === 'foe' ? { ...x, side: other(x.side) } : x);
  const cb = v.combat;
  // Every side-tagged thing turns round: units, glyphs, zones, objects (a rigged tile), False Images, and fx (their
  // side and their `only` audience; viewFor already dropped what this player's side may not see).
  v.combat = { ...cb, units: cb.units.map(flip), glyphs: cb.glyphs?.map(flip), zones: cb.zones?.map((z) => { const f = flip(z) as any; return f.spotted ? { ...f, spotted: f.spotted.map(other) } : f; }),
    ...(cb.objects ? { objects: cb.objects.map((o) => flip(o as { side?: any }) as typeof o) } : {}),
    ...(cb.images ? { images: cb.images.map(flip) } : {}),
    fx: cb.fx?.map((e) => { const f = flip(e as { side?: any; only?: any; sight?: any; seen?: any }); const o = (f.only ? { ...f, only: other(f.only) } : f) as any; return { ...o, ...(o.sight ? { sight: { pc: o.sight.foe, foe: o.sight.pc } } : {}), ...(o.seen ? { seen: { pc: o.seen.foe, foe: o.seen.pc } } : {}) } as typeof e; }),
    over: cb.over === 'win' ? 'loss' : cb.over === 'loss' ? 'win' : cb.over,
    ...(cb.lastSeen ? { lastSeen: { pc: cb.lastSeen.foe, foe: cb.lastSeen.pc } as any } : {}),
    ...(cb.sightWas ? { sightWas: { pc: cb.sightWas.foe, foe: cb.sightWas.pc } as any } : {}) };
}

/** In the Proving Ground an attempt or an ask rolls at once and AP is always full (there are no rounds, no Narrator). */
function tryInSandbox(g: GameState, f: () => void) {
  f();
  if (g.sandbox && g.phase === 'story') { g.story.ap = {}; g.story.ended = {}; g.story.spoken = {}; g.story.needs = false; g.story.work = null; g.story.await = 'players'; }
}

/** The reducer's own helpers for the World Play rules (world.ts), at call time (one module cycle, no top-level use). */
export const _world = {
  push: (g: GameState, e: Omit<Entry, 'id'>) => push(g, e), id: (g: GameState, p: string) => id(g, p), spendAp: (g: GameState, c: Character, n: number) => spendAp(g, c, n),
  closeRoundIfDone: (g: GameState) => closeRoundIfDone(g), rollCheck: (g: GameState, ck: Check, c: Character, reroll: boolean) => rollCheck(g, ck, c, reroll),
  giveLoot: (g: GameState, l: NonNullable<NarratorTurn['loot']>[number]) => giveLoot(g, l), unitToCharacter: (g: GameState, u: Combat['units'][number], afterFight: boolean, keepDowned = false) => unitToCharacter(g, u, afterFight, keepDowned),
  magicOut: (g: GameState, cb: Combat, afterFight: boolean) => magicOut(g, cb, afterFight), storyFx: (g: GameState, cb: Combat) => storyFx(g, cb),
  applyNpcOp: (g: GameState, op: NonNullable<NarratorTurn['npcs']>[number]) => applyNpcOp(g, op), startStoryFight: (g: GameState, combat: NonNullable<NarratorTurn['combat']>) => startStoryFight(g, combat),
};

/** The Proving Ground's World Play tools (rules 1.7): the Narrator's own appliers, so part B and the e2e tests can drive
 * caches, hazards, triggers, people with faces and talk, and objectives with where, with no Narrator. */
function sbWorldPlay(g: GameState, a: Extract<SandboxAction, { type: 'sandbox/cache' | 'sandbox/pile' | 'sandbox/hazard' | 'sandbox/trigger' | 'sandbox/npc' | 'sandbox/objective' }>) {
  if (a.type === 'sandbox/cache') {
    const before = storyObjects(g).length;
    applyObjectOp(g, { action: 'place', id: '', kind: 'cache', at: a.at, name: a.name || 'Supply crate', text: a.text || '', locked: !!a.locked, approaches: a.approaches || [], items: a.items || [] });
    if (storyObjects(g).length === before) fail('Nothing can go there.');
    const o = storyObjects(g).at(-1)!; sbLog(g, o.name + ' (' + (o.items || []).length + ' things' + (o.locked ? ', locked' : '') + ') at ' + refOf(o.pos) + ' [' + o.id + '].'); return;
  }
  if (a.type === 'sandbox/pile') { // rules 1.9: the same path as the Narrator's ground[] (merging, the cap, hidden)
    const p = applyGroundOp(g, { at: a.at, items: Array.isArray(a.items) ? a.items : [], hidden: !!a.hidden });
    if (!p) fail('Nothing can go there: an open tile, and at least one thing.');
    sbLog(g, 'A pile at ' + refOf(p!.pos) + ' (' + (p!.items || []).length + (p!.items?.length === 1 ? ' thing' : ' things') + (p!.hidden ? ', hidden' : '') + ').'); return;
  }
  if (a.type === 'sandbox/hazard') {
    if (a.remove) { applyHazardOp(g, { action: 'remove', id: a.remove }); sbLog(g, 'Hazard ' + a.remove + ' removed.'); return; }
    const h = applyHazardOp(g, { action: 'place', kind: a.kind, severity: a.severity, tiles: a.tiles, rect: a.rect || null, hidden: a.hidden, name: a.name }); if (!h) fail('No hazard placed: pick a kind (minefield, fire, radiation, gas, collapse) and open tiles.');
    sbLog(g, (h!.name || h!.kind) + ' (' + h!.severity + (h!.hidden ? ', hidden' : '') + ', ' + h!.tiles.length + ' tiles) [' + h!.id + '].'); return;
  }
  if (a.type === 'sandbox/trigger') {
    if (a.remove) { applyTriggerOp(g, { action: 'remove', id: a.remove }); sbLog(g, 'Trigger ' + a.remove + ' removed.'); return; }
    const t = applyTriggerOp(g, { action: 'place', when: a.when, tiles: a.tiles, rect: a.rect || null, objId: a.objId, objective: a.objective, then: a.then, spawn: a.spawn, difficulty: a.difficulty, name: a.name, reveal: a.reveal, text: a.text });
    if (!t) fail('No trigger set: check when (enter tiles, examine an object id, an objective) and then (spawn people, fight, reveal).');
    sbLog(g, 'Trigger ' + t!.id + ': on ' + t!.when + ', ' + t!.then + '.'); return;
  }
  if (a.type === 'sandbox/npc') {
    const before = npcsOf(g).length;
    applyNpcOp(g, { action: 'place', name: a.name, at: a.at, side: a.side || 'neutral', kind: a.kind, avatar: a.avatar, tier: a.tier, weapon: a.weapon, hidden: a.hidden, wants: a.wants, knows: a.knows, talk: a.talk });
    if (npcsOf(g).length === before) fail('Nobody can stand there.');
    const n = npcsOf(g).at(-1)!; if (a.prisoner) { n.prisoner = true; n.tags = [...(n.tags || []), 'prisoner']; }
    sbLog(g, n.name + ' (' + (n.kind || 'human') + ', ' + n.side + ') at ' + refOf(n.pos) + ' [' + n.id + '].'); return;
  }
  // An objective of the Proving Ground's drill mission (made on first use), with its where and status.
  const camp: any = g.campaign || (g.campaign = JSON.parse(JSON.stringify(PROVING_GROUND)));
  const id = String(a.id || '').trim().replace(/[^a-z0-9_]/gi, '_').slice(0, 40); if (!id) fail('Name the objective.');
  let m = (camp.missions ||= []).find((x: any) => x.id === 'drill');
  if (!m) { m = { id: 'drill', title: 'Drill', act: 1, summary: 'The Proving Ground\'s practice objectives.', goal: 'Practise.', objectives: [] }; camp.missions.push(m); }
  let o = m.objectives.find((x: any) => x.id === id);
  if (!o) { o = { id, text: (a.text || id).slice(0, 120), done_when: 'The tools mark it.' }; m.objectives.push(o); } else if (a.text) o.text = a.text.slice(0, 120);
  const ms = g.story.missions || (g.story.missions = { active: [], done: [], failed: [], objectives: {}, revealed: [], side: [], choose: null, ending: null, opening: null, act: { scene: g.story.scene.n, xp: {} } });
  if (!ms.active.includes('drill')) { ms.active.push('drill'); ms.done = ms.done.filter((x) => x !== 'drill'); }
  const st = (ms.objectives.drill ||= {}); st[id] = a.status === 'done' || a.status === 'failed' ? a.status : 'open';
  if (a.where) setWhere(ms, 'drill/' + id, a.where);
  sbLog(g, 'Objective ' + id + ' (' + st[id] + ')' + (a.where ? ' where ' + [a.where.zone, ...(a.where.refs || [])].filter(Boolean).join(' ') : '') + '.');
}
// Rules 1.8: feelings felt out of a fight write their line in the story.
setFeelStoryNote((g: GameState, c: Character, text: string) => push(g, { kind: 'system', charId: c.id, text }));
