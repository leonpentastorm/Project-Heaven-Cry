// Grid combat (spec: Combat on the grid; Attacks, damage and armour; Weapons; Downed and dying).
import { fxTaps } from './fxtap';
import { MAP_LAYOUTS, readLayout, nearestFree } from './maplayout';
import { ENEMY, WEAPON, COMBAT_XP, SKILLS, SIGIL, type WeaponDef, ENEMY_LEVELS, enemyStats, levelled, clampEnemyLevel, levelGiven, fightLevelOf } from './data';
import techniquesJ from '../../../data/techniques.json';
import { type Character, type PackItem, gearEntry, type Injury, ARMOUR, ONE_HANDED, loadedOf, spareMags, packOf, overweightKg, RARITY, maxDurOf, weaponDurOf, gearBonus, gearHas, gearEffects, hasMod, magazineSize, critMult, CRIT_BASE, CRIT_MAX, defense, healingMult, initiativeBonus, injuryResistPct, mainHandSide, maxHp, mod, movement, physicalMult, weaponMult, weaponMultLabel,
  twoHands, saveBonus, strengthTable, passiveVigilance, critTakenPct, elementalTakenPct, ambushTakenPct, healReceivedMult, shieldReceivedMult, counterBonus, throwRange, ambushMult, blessingPower, stealthOf, classResources } from './character';
import { type Rng, d20, die } from './rng';
import { type MagicUnit, type Glyph, type Zone, type Trace, magicOf, magicTurnStart, magicRoundTick, zoneEnter, veilTiles, magicLit, SIGIL_REV, enemyMagic, enemyCast, enemyAvoidMagic, sigilSpot, condHit, condOn, condSource, condSkillMod, condTurnEnd, condSourcesCheck, endCond, applyCond, withVia, shiftMana, enemyScuff, noteDeaths, heartOverwatch, magicTurnEnd, calmFight, calmTend } from './magic';
import { type FoeTraits as FoeTraitsT, escapeGrapple as escapeGrappleT, recoverWeapon as recoverWeaponT, AMMO_TYPES, ammoId, damageTypeOf, isExplosive, radiusOf, isSilent, stackDamage, VS_CAP, ambushReady, reveal, canReact, useReaction, spotHidden, companionUnits, applyFoeTraits, resGain, throwRangeOf, type FoeTraits } from './tactics';
import { armFoe, aiSigilStep, aiClearBlock, aiRouteRisk } from './ai-sigil';
import { armHeart, aiSoulStep } from './ai-soul';
import { type MapObject, OBJ, makeObject, kindOf, blocksMove, blocksSight, coverKind, isDifficult, isTrap, hazardOf, lightOf } from './objects';
import { emit, anyOn, heldOfChar, boundGame as boundGameRef, onHook } from './effects/hooks';
import { type FalseImage, perceivedFoes, isGhost, strikeImage } from './illusion';
import { skillItemsOf } from './effects/collect';
import type { Held } from './effects/collect';
import { applyDamage, healUnit } from './effects/damage';
import { turnAp, briefCredit } from './effects/ap';
import { skillRollMod, actionAp, immune, forbids } from './effects/core';
import { statQuery } from './effects/hooks';
import { noteFallbacks } from './effects/narrator';
import { windowStep } from './effects/actions';
import { type Hazard, hazardStep, spotHazards, hazardLiveAt, HAZARD } from './hazards';
import { packAdd, intoCounts, magItem, dropOnTile, pileAt, selectEntries, takeEntries, entryPack, itemLabel, PICKUP_AP, PILE } from './containers';

/** cover = half cover tiles, full = full cover tiles (spec: Cover). */
export interface MapDef { id: string; name: string; w: number; h: number; solid: string[]; cover: string[]; full?: string[]; difficult: string[]; pcStart: string[]; foeStart: string[];
  /** What is where, by grid reference (spec: Grid references): shown on hover and given to the Narrator. */
  notes?: { at: string; text: string }[];
  /** Objects the map starts with, beyond its cover lists (spec: Map objects). */
  dark?: boolean;
  objects?: { kind: string; at: string; name?: string; text?: string; hidden?: boolean; locked?: boolean; to?: string; sprite?: string; spriteBox?: { w: number; h: number; dx: number; dy: number }; portrait?: string; approaches?: { label: string; skills: string[]; tn: number; stakes: string; success?: string }[] }[] }

const keyOfRef = (r: string) => (r.charCodeAt(0) - 65) + ',' + (Number(r.slice(1)) - 1);
/** The M813 rear landing pad from the Combat prototype; a generic yard (open ground) for anything else. */
export const MAPS: Record<string, MapDef> = {
  rear_pad: {
    id: 'rear_pad', name: 'Outpost-813 rear landing pad', w: 16, h: 11,
    solid: (() => { const s: string[] = []; for (let x = 13; x < 16; x++) for (let y = 0; y < 6; y++) s.push(x + ',' + y); return s; })(),
    cover: ['11,2', '11,3', '11,4'], full: ['10,6'], // platinum crates (half); a cargo pylon (full)
    difficult: ['1,9', '2,9', '3,9', '4,9', '6,9', '7,9', '1,10', '3,10', '5,10', '8,10'],
    pcStart: ['3,6', '2,8', '5,8', '2,5', '4,7', '3,4'], foeStart: ['12,3', '12,6', '12,1', '11,7', '12,8', '10,1', '9,4'],
    notes: [
      { at: 'N1–P6', text: 'The last ship off M813: the engineers\' hull, its hold full of platinum crates. Solid; nobody walks through it.' },
      { at: 'M2–M6', text: 'The foot of the loading ramp, where Chief Engineer Keel and his engineers stand.' },
      { at: 'L3–L5', text: 'Stacked platinum crates: half cover.' },
      { at: 'K7', text: 'A cargo pylon: full cover.' },
      { at: 'B10–I11', text: 'The edge of the wreck field: dead infantry robots, twisted plating. Slow going.' },
      { at: 'A1–J9', text: 'Open landing pad, scorched, under the black hole\'s light. The squad comes in from the west.' },
    ],
    objects: [{ kind: 'poi', at: 'M5', name: 'The loading ramp', text: 'The ship\'s ramp, down and guarded. Chief Engineer Keel stands at its foot with a pistol on his hip and a manifest in his hand.' }],
  },
  // Open ground (rules 1.16): the full 26 × 26, laid out in data/maps.json (layouts.open_ground) and shared with the
  // Narrator's Own Start. Its half cover and full cover are the map's cover lists (crates and pillars in a fight).
  yard: (() => { const L = MAP_LAYOUTS.open_ground, p = readLayout(L.rows, L.w, L.h, L.legend), ks = (rs: string[]) => rs.map((r) => keyOfRef(r));
    const at = (kind: string) => ks(p.objects.filter((o) => o.kind === kind).map((o) => o.at));
    return { id: 'yard', name: L.name, w: L.w, h: L.h, solid: ks(p.solid), cover: at('crate'), full: at('pillar'), difficult: ks(p.difficult), pcStart: ks(p.start), foeStart: ks(p.enemyStart), notes: L.notes || [] } as MapDef; })(),
};

export interface Unit {
  id: string; side: 'pc' | 'foe'; name: string; short: string; charId?: string; img?: string; tier?: string;
  pos: string; hp: number; maxHp: number; def: number; armour: number; attack: number; weapon: string; movement: number; init: number; agility: number;
  ap: number; bank: number; ammo: number; heat: number; jammed: boolean; shotsThisTurn: number;
  downed: boolean; dead: boolean; saves: { ok: number; fail: number }; stunnedNext: number; kills: number;
  /** The Proving Ground's Effect testing room: this unit can't be brought to 0 HP (effects/damage.ts). */
  undying?: boolean;
  /** A music trait's modifier to the weapon skill while its song state holds (spec: Music). */
  song?: number;
  /** The overworld token this enemy came from (spec: Overworld rounds): survivors go back on the map. */
  npcId?: string;
  /** Attacked in the open from the overworld: this unit sits out every round before this one (spec: Overworld rounds). */
  waitRound?: number;
  /** Injuries (spec: Injuries): head and torso last this fight; arm and leg go back to the character. */
  injuries?: Injury[]; bleed?: number; dazedNext?: number; injResist?: number; hand?: 'left' | 'right';
  /** PCs: spare magazines (rounds in each) and loose rounds for the weapon. Enemies leave these out: unlimited spares. */
  mags?: number[]; loose?: number;
  /** Magazines picked up for a different weapon: carried back to the pack after the fight. */
  extra?: { weapon: string; rounds: number; type?: string | null }[];
  /** Analyzed (spec: Analyze): the squad sees this enemy's numbers; weakPoint is Read Them's mark (rules 1.13): an
   * enemy carrying it deals 15% less damage to the other side (effects/damage.ts). It adds no damage any more. */
  analyzedBy?: string; weakPoint?: boolean; analysis?: number; vigilant?: number; overweight?: number;
  /** Stances and reactions (spec: Prone; Brace; Overwatch; reactions). */
  prone?: boolean; braced?: boolean; overwatch?: 'shot' | 'aimed' | 'melee' | null; reactedRound?: number; vision?: number; sensory?: number; noSprint?: boolean; strength?: number;
  /** Weapons v2 (spec): the weapon's condition and mods, gear effects, and per-turn flags. */
  /** Braced for Guard only, with a weapon that has no Brace of its own: the stance, not the weapon's benefits. */
  guardBrace?: boolean;
  dmgMult?: number; dur?: number; maxDur?: number; mods?: string[]; offWeapon?: string | null; offAmmo?: number; light?: number; darkSight?: boolean; hazardImmune?: string[];
  ignoreDifficult?: boolean; unarmedBonus?: number; moved?: boolean; firstShotDone?: boolean; proficiency?: number; parts?: number; baseArmour?: number; dexterity?: number; athleticsPts?: number;
  /** Magic (spec: Mana, rules 1.2): what the unit knows and carries; conditions (rounds left); a shield; the base
   * Movement and Vision a condition halved. */
  mg?: MagicUnit; conds?: Record<string, number>; shield?: number; baseMove?: number; baseVision?: number;
  /** The effect runtime (effects/): what the unit holds (perks with tiers, traits, class and rank, advanced class), per-fight
   * item state (ps, by item key), use counters (uses), armed presets (armed), and the AP economy: AP banked for the next
   * turn, debt (after the floor), perk AP gained this turn (the +3 cap) and the turn's total (the 9 ceiling). */
  held?: Held; ps?: Record<string, any>; uses?: Record<string, { s: string; n: number }>; armed?: Record<string, any>;
  apNext?: number; apDebt?: number; apGained?: number; apTurnTotal?: number;
  /** Who hit this unit last, and everyone who has (kill attribution: bleed from your crits, barrels you broke). */
  lastHitBy?: string; damagedBy?: string[];
  // ---------- shared subsystems (rules 1.3, lane 0B; every field optional so old saves load) ----------
  /** PC saves by family, debuff strength by delivering skill (rules 1.13), and item modifiers to d20 rolls by skill (the global ruling: item skill
   * mods reach every d20 that uses the skill), fixed when the unit is built. */
  sv?: Record<'body' | 'brain' | 'heart', number>; /** Debuff strength by delivering skill (rules 1.13; a PC's, a skill not listed reads 0). */ dbf?: Record<string, number>; sk?: Record<string, number>;
  /** Conditions' sources (unit ids), orders (Commanded) and the ones put on during the bearer's own turn. */
  condBy?: Record<string, string>; /** The skill that delivered each condition (rules 1.13: its strength). */ condVia?: Record<string, string>; condArg?: Record<string, string>; condFresh?: string[];
  /** Combat Hidden (spec: Helpful states): hidden now; how many times it has hidden this fight (each entry gives one
   * ambush); the entry whose ambush was used. */
  hidden?: boolean; hideEntry?: number; ambushUsed?: number;
  /** Sigil 1.4: MASK's rounds left (and set on the bearer's own turn), the round it was last Quickened, when each
   * condition landed (CLEANSE ends the newest). */
  maskLeft?: number; maskFresh?: boolean; quickRound?: number; condAt?: Record<string, number>;
  /** What it is (human, robot, crawler, ork, upper_realm, cursed, beast, machine, turret, celestial…) and its tags
   * (military, hunter, humanoid, unaware, no_surrender, lawful, prisoner…). */
  kind?: string; tags?: string[];
  /** Out of the fight by surrender (or subdued by a non-lethal blow): not a target, counts as defeated, no kill. */
  surrendered?: boolean; subdued?: boolean; surrenderTried?: boolean;
  /** Reactions used this round (one by default; items add through stat 'reactions'), and shots held on Overwatch. */
  reactUsed?: { r: number; n: number }; owShots?: number;
  /** The first shot of this turn (per turn) and Sprint this turn (spec: once per turn, rules 1.3). */
  firstShotTurn?: boolean; sprinted?: boolean; attackedTurn?: boolean;
  /** This unit has used an Opener this fight: the first one costs no Momentum (physical/core.ts). */ openerUsed?: boolean;
  /** The Evoker blade's Edge Word (item 487): a hit this turn left a free glyph (0 AP; charge and Flux as usual). */
  edgeWord?: boolean;
  /** This turn is lost (Stunned): the engine passes it. */
  skipTurn?: boolean;
  /** Rules 1.15: its level (a character's own, an enemy's from the fight, a companion's owner's), and for an enemy or a
   * companion the factor on the damage it deals (tier × level). Absent on units from a fight saved before 1.15: they
   * keep the numbers they have, deal plain weapon damage and take no part in the level gap. */
  level?: number; lvlDmg?: number;
  /** Derived stats (spec: Derived stats) the damage chain reads: percent of critical, elemental and ambush damage not
   * taken, healing and shields received multiplier, Counter bonus, Throwing range, Ambush multiplier, Blessing power,
   * the Ingenuity modifier (spotting), and Stealth. */
  critTaken?: number; elemTaken?: number; ambushTaken?: number; healRecv?: number; /** shields received (rules 1.13: Conscience) */ shieldRecv?: number; counter?: number; throwRange?: number; ambushMult?: number; blessPower?: number; ingMod?: number; stealth?: number;
  /** The ammo type loaded now (armour_piercing, hollow_point, incendiary, enhanced; null standard) and in each spare. */
  ammoType?: string | null; magTypes?: (string | null)[];
  /** Throwables carried (grenades, satchels): item id → count. Written back after the fight. */
  throwables?: Record<string, number>;
  /** The off-hand gun's spare magazines (when it isn't the same weapon as the main hand's), their ammo types, the type
   * loaded in it now, and (a gun loaded round by round, of another calibre than the main gun) its loose rounds. A
   * character's magazine off-hand gun always has offMags (empty: no spares; review fix: it reloaded for free). */
  offMags?: number[]; offMagTypes?: (string | null)[]; offAmmoType?: string | null; offLoose?: number;
  /** A companion (drone, beast): the character who controls it (its owner's player gives its orders). */
  ctrl?: string; companion?: string;
  /** The only actions this unit has (action ids as the action list names them: 'move', 'shot'…), besides ending its
   * turn and declining a reaction window. Unset: every action its weapon and kind allow. The drone (enemies.json
   * companions `actions`; spec §14 item 370): move and a plain shot. */
  allowedActions?: string[];
  /** Never runs dry: no round is spent, nothing to reload, no Heat and no jam (a fumble costs 1 AP next turn instead).
   * The drone's service pistol (enemies.json companions `infinite_ammo`; spec §14 item 370). */
  infiniteAmmo?: boolean;
  /** Class resources (Momentum, Guard, Marks, Charges, Supplies…): current values, and maxima. */
  res?: Record<string, number>; resMax?: Record<string, number>;
  /** Rules 1.13, Durability's Guard: what the off hand holds when it isn't a weapon (a shield, a torch, a focus; null:
   * nothing), and the unit's Durability points (a PC's come from its sheet; a stat block may give them). */
  offItem?: string | null; durability?: number;
  /** Physical 2.0 (rules 1.12; src/physical). Pressure 0–4 on this unit, how many of its pips its own side can't see (a
   * Silent weapon's), who put it there, who hit it in which round and with which weapon (Crossfire; drill on the kill),
   * turns left of Stopped once, the Watch it holds, its melee chain this turn, per-technique state, a set-up mark, an
   * enemy's technique list, a Drawn weapon's quiver, and a free speed reload owed (Last Round). */
  pressure?: number; pressHidden?: number; pressBy?: Record<string, string>; hitRound?: Record<string, number>; hitWith?: Record<string, string[]>;
  stopped?: number; watch?: import('./physical/types').HeldWatch; chain?: { t: string; n: number; last: string | null; ended: boolean };
  tech?: Record<string, Record<string, any>>; setUp?: { t: string; target: string; hit?: number; noAnswer?: boolean; label?: string; only?: string[] };
  techs?: string[]; quiver?: Record<string, number>; freeReload?: boolean;
  /** Calls (rules 1.13, calls/): what Calls left on this unit and its own Call counters; an enemy's Call list and the
   * level that stands in for its skill points. */
  call?: import('./calls/types').CallMarks; calls?: string[]; callLevel?: number;
  /** Rules 1.12: held where it stands until someone spends the AP to free it (Run Through, a nailing arrow): who did it, with which technique, the AP, and a weapon left in it. */
  /** weapons thrown into this unit and still in it (rules 1.12, Throw): they fall where it falls; Pull Out takes one back */
  stuck?: { by: string; weapon: string; item?: PackItem }[];
  nailed?: { by: string; id: string; ap: number; weapon?: string; /** the weapon's own entry (rarity, wear, mods, name), kept so it comes back as it was */ item?: PackItem }; pressedThis?: { t: string; ids: string[] }; nearFoe0?: number; noWatch?: number;
  /** Prayer (spec: Patrons and prayer): the round of the last prayer (cooldown). */
  prayedRound?: number;
  /** Rules 1.6 (faith.ts): the vow sworn for this fight, and the faith state of the fight (tags seen per action, the
   * liked-tag gain so far, the Whisper's turn, the intervention used, Lucky Break and the like). */
  vow?: import('./character').Vow | null; faith?: Record<string, any>;
  /** What a Trickster's Read showed this unit means to do on its next turn (enemyIntent; cleared when its turn ends). */
  readIntent?: Intent & { by: string; round: number };
  /** Rules 1.9 drop tables (loot.ts): what this enemy drops beyond its weapon and magazines, from the campaign or the
   * Narrator (absent: the engine's default for its kind and tier). */
  drops?: import('./loot').Drops;
}
export interface Combat { /** No XP or weapon kills: the fight started on people who weren't hostile (spec: Anyone is a target). */ noXp?: boolean; /** Rules 1.15: the fight's level (the squad's average, rounded down, unless set); absent in a fight saved before it. */ level?: number; name: string; map: MapDef; units: Unit[]; order: string[]; turn: number; round: number; difficulty: string; log: string[]; /** 'extracted': the squad was lifted out (RTC Contractor's Extraction): neither won nor lost. */ over: null | 'win' | 'loss' | 'extracted'; summary?: string;
  /** Retired in rules 1.9: what lay on the floor in old saves (apply() turns it into piles once; World Play 1.1). */
  floor?: { pos: string; text: string; weapon?: string; rounds?: number }[];
  /** Things said or done mid-fight that need the Narrator's judgement: they ride along in the end-of-fight call. */
  notes?: string[];
  /** Cover still standing, with its HP; broken cover becomes rubble (spec: Cover). Old saves fall back to the map. */
  cover?: Record<string, { kind: 'half' | 'full'; hp: number; max: number }>; rubble?: string[];
  /** Everything placed on the grid: cover, barricades, doors, traps, hazards, POIs (spec: Map objects). */
  objects?: MapObject[];
  /** Magic on the field (spec: Mana): Sigil glyphs on tiles, standing zones (walls, smoke, light), the ambient mana
   * meter, and the dead already counted toward it. */
  glyphs?: Glyph[]; zones?: Zone[]; mana?: number; deadSeen?: string[]; glyphSeq?: number;
  /** Rules 1.10: scuffed glyphs' traces (readable for a few rounds). */
  traces?: Trace[];
  /** The Sigil rules revision this fight's glyphs follow (14 = rules 1.4; absent: a 1.2 save, migrated on first use); the
   * order conditions landed in. */
  sigilV?: number; condSeq?: number;
  /** Hostiles the party has seen at least once this fight (shared sight: visibility(cb, 'pc')), kept as they come into view.
   * The fight music reads it, so an elite or boss in the fog of war changes nothing until it is seen (spec: Music). */
  sighted?: string[];
  /** The fight's song, picked from the pool when the fight began and kept to its end (spec: Music, The fight's song). */
  song?: import('./music').OstId;
  /** Presentation events (shots, hits, reloads, spells…) for the client's effects layer, newest last, capped at FX_CAP.
   * Numbered by fxSeq; they carry no rules and nothing reads them back (see FxEvent). */
  fx?: FxEvent[]; fxSeq?: number;
  /** The first fx number of the action being resolved (spotlight.ts markAction): a spotlight moment's `from`, so the
   * client can slow that action's playback. Set and cleared by the reducer; never read by a rule. */
  actFrom?: number;
  /** Party crits in the action being resolved (noteCrit; spotlight.ts critMoment turns the first into a 'crit' spotlight at
   * the action's end, unless a bigger moment came in the same action). Presentation only; never read by a rule. */
  critNotes?: { unit: string; target: string; via: 'weapon' | 'sigil' | 'outburst'; n: number }[];
  /** An off-turn window (On My Mark, Supreme Command): active(cb) is the queue's head while it is open (effects/actions.ts). */
  window?: { kind: string; queue: { unitId: string; ap?: number; limit?: number; done?: number }[]; saved: Record<string, number>; by?: string };
  /** The toggles the player set on the action being resolved (combat/attack mods…); set and cleared by the reducer. */
  mods?: string[];
  /** The overworld's throwaway fight state (storyCb): per-turn item counters live in the story instead. */
  overworld?: boolean;
  /** Each side's sight at the last check, for the sight_change hook (only kept while someone listens). */
  sightWas?: Record<string, string[]>;
  /** Presentation only (sightFx): the hostiles each side saw at the last check, so a unit coming into a side's sight
   * (or being revealed, or going Hidden) gets one 'sight' event for that side's eyes. Never read by a rule. */
  sightSeen?: Record<string, string[]>;
  /** Presentation only: where each side last saw each of those hostiles (a unit that drops out of a side's sight fades
   * out there, never where it went unseen). */
  sightPos?: Record<string, Record<string, string>>;
  /** Why a unit's sight is about to change (a Hidden condition from a spell): consumed by the next sightFx. */
  sightWhy?: Record<string, 'hide' | 'reveal'>;
  /** Where each side last saw a Hidden unit (a known position: shown, not targetable), by unit id. */
  lastSeen?: Record<string, Record<string, string>>;
  /** The Narrator's start_fight flag: the place itself is frightening (dark, a nightmare; perks read it). */
  fear?: boolean;
  /** Decoys on the grid (the Trickster's False Image, illusion.ts): not units; the enemies they fooled target them. */
  images?: FalseImage[];
  /** The Narrator's word on whether the fight broke out of the talk just had (Talks Broke Down); absent: not said. */
  fromTalk?: boolean;
  /** Rules 1.7: hazards on this map (fired per tile entered), the dice the area map's throwaway fight rolls them with
   * (the game's own rng; a fight passes its rng to every move), what they hit this action, and creatures a Downed
   * carrier dropped (tokens again when the fight ends). */
  hazards?: Hazard[]; worldRng?: Rng; hazardHits?: { id: string; kind: string; unit: string; charId?: string; name: string; at: string; dmg: number; cond?: string; attempt?: boolean }[];
  dropped?: { npc: any; at: string; by: string }[];
  /** Rules 1.9 drop tables (loot.ts): the campaign's own tables for this fight, the rolled items so far (the cap), and
   * the host-only log of what the cap held back. */
  lootTables?: import('./loot').LootTable[]; lootRolled?: number; lootLog?: string[];
  /** Rules 1.9: each death-drop log line with its tile, so a player's view can drop the contents of an unseen one. */
  dropLines?: { line: string; at: string; name: string }[] }

/** A presentation event: what just happened, precisely enough to animate (the client plays new ones by n). Tiles are
 * "x,y" keys; unit fields are unit ids. Kinds and fields:
 *  turn {unit, side, at, round, seen: {pc, foe}} (seen: 1 where that side saw the unit then; stance too) · move {unit,
 *  from, to, path, how, sight: {pc, foe}} (sight: per path tile, '1' where that side saw the mover as it walked there,
 *  '0' where it didn't: the client walks a hostile in from the fog edge and out into it; each viewer gets its own side's
 *  only: viewFor) · sight {unit, at, how: 'enter'|'reveal'|'hide'|'lost', only, by?, byAt?} (a hostile came into the
 *  `only` side's sight, was revealed, went Hidden from it, or dropped out of it at `at`, where it was last seen; by/byAt:
 *  the walker whose eyes did it and its tile then: sightFx) · overwatch {unit, target, from, at, mode} (a held shot is triggered: the mover stops
 *  at `at` for it) · shot {unit, target, from, to, weapon, cat, mode,
 *  hit, crit, fumble, dmg, killed, cover?, jam?, chain?} · melee {unit, target, from, to, weapon, cat, hit, crit, fumble,
 *  dmg, killed, chain?} · volley {unit, target?, from, to?, weapon, cat, mode: 'burst'|'auto'|'skill'|'paired'|'sweep',
 *  name?, shots?} · reload {unit, at, weapon, cat, how: 'mag'|'loose'|'swap', dur} · load {unit, at, rounds, dur} ·
 *  clear {unit, at, dur} · repair {unit, at, dur} · core {unit, at, dur} · stim {unit, target, from, to, heal, revive} ·
 *  heal {target, at, amount, revive?} · hurt {target, at, dmg, why, killed?} (damage not from a weapon roll: explosion,
 *  trap, hazard, bleed, burn, sigil, elemental, soul, true, short, overload, wall) · shield {target, at, absorbed} ·
 *  down {unit, at, dead} · explode {at, radius, what} · object {at, what, dmg, broken, hp?} · door {unit?, at, open} ·
 *  trap {unit, at} · shove {unit, target, from, to, ok, prone?, magic?, pull?} · stance {unit, at, what: 'prone'|'stand'|'brace'|'overwatch'} ·
 *  analyze {unit, target, from, to} · pickup {unit, at, items} (the labels taken) · pile {at, id, count, why: 'drop'|'take'|'death'} (rules 1.9: a pile changed; 'death': a fallen enemy's drops) · cover {unit, target, at, dmg} (a shot stopped by cover) ·
 *  draw {unit, at, tile, word, side, group, cls, element, effect, words} · glyph_fade {tile, word, side, why} · scuff {unit, at} ·
 *  evoke {unit, at, shape, tiles, words, element, side, facing, dir, area, src, impact, targets, targetAt, missiles: [{origin,
 *  kind: touch|bolt|lob|appear|relay, path, blockedAt, impact, arc, hops, burst, core, chain, placed}], stay, placed, fizzle} ·
 *  chain {from, to, target, jump, mult, element} · fizzle {unit, at, tiles, words, element} · field {id, tiles, words, element,
 *  side, by, rounds} · field_tick {id, target, at, element, side} · field_gone {id, tiles, side, why} · trap_set {id, tile, side,
 *  by, words, element, only} · trap_spotted {id, tile, by, side, only, kind} · trap_sprung {id, tile, target, element, side,
 *  words} · trap_gone {id, tile, side, why, only} · turret_placed {id, tile, side, by, words, element, hidden, only?} ·
 *  turret_shot {id, from, to, target, element, side, path, kind, burst, chain} · turret_destroyed {id, tile, side, why} ·
 *  wall_raised {tiles, by, side, hp, rounds} · wall_crumbled {tiles, why} · null_wave {at, tiles, removed, glyphs, zones, walls} ·
 *  blink {target, from, to, element} · mask {target, at, fade?} · leech {unit, to, from, amount, element} · command {target, at,
 *  order, to, by} · boon {target, at, word: ward|mend|quicken|sharpen|cleanse, amount?, cond?} · veil {at, tiles, side} ·
 *  light {at, tiles, side} (Sigil rules 1.4; hurt, miss and cond carry element when a spell deals them; an event with
 *  `only` is for that side's eyes: views drop it for the other side) ·
 *  miss {unit?, target, at, by} · cond {target, at, id, resisted?} · overload {unit, at} · vent {unit, at, flux} ·
 *  outburst {unit, at, design, school, hold, stage} · grow {unit, at, stage} · release {unit, at, to, school, stage, wild,
 *  area, targets} · short {unit, at, burst} · syphon {unit, at, mp} · crystallise {unit, at, dur} · mana {band, mana} ·
 *  song {unit, at} · call {unit, id, target, at, step, kind: helping|hindering, reaction?, only?} (rules 1.13: one per
 *  Call made; its save, condition and moves are their own events). */
export interface FxEvent { n: number; k: string; [field: string]: any }
/**
 * HP that changed since the last effect was emitted belongs to that effect (a shot goes out, then its damage lands): it
 * is stamped there as hp: {unit: [was, now]}, so a screen can hold a bar until the hit plays (fx/play.ts fxShownHp).
 * Called before every new effect and once more when an action is done.
 */
export function stampFxHp(cb: Combat) {
  const seen: Record<string, number> = ((cb as any).fxHp ||= {}), list = cb.fx || [];
  let last: FxEvent | undefined; for (let i = list.length - 1; i >= 0 && !last; i--) if (!list[i].only) last = list[i];
  for (const u of cb.units) {
    const was = seen[u.id]; seen[u.id] = u.hp;
    if (was == null || was === u.hp || !last) continue;
    const m: Record<string, [number, number]> = (last.hp ||= {}); m[u.id] = [m[u.id] ? m[u.id][0] : was, u.hp];
  }
}
export const FX_CAP = 40;
/** Shots and swings inside a burst, auto, skill or paired attack are marked chain (the client spaces them tighter). */
let fxChain = 0;
/** Keep the last FX_CAP effects of earlier actions (called before a new action runs). */
export function trimFx(cb: Combat) { const list = cb.fx; if (list && list.length > FX_CAP) list.splice(0, list.length - FX_CAP); }
export function emitFx(cb: Combat, k: string, data: Record<string, any> = {}): FxEvent {
  // A turn's ring and a stance's word show only to a side that sees the unit as it happens (not at the batch's end: it
  // may walk into the fog or fall later in the same batch): seen {pc, foe}, 1 or 0, stamped now.
  if ((k === 'turn' || k === 'stance') && data.unit && !data.seen) { const u = cb.units.find((x) => x.id === data.unit); if (u) data = { ...data, seen: { pc: sideSeesUnit(cb, 'pc', u) ? 1 : 0, foe: sideSeesUnit(cb, 'foe', u) ? 1 : 0 } }; }
  stampFxHp(cb);
  // L: how many log lines were written before this effect (a screen reveals the log as the effects play)
  const n = (cb.fxSeq = (cb.fxSeq || 0) + 1), list = (cb.fx ||= []), ev: FxEvent = { k, ...data, n, L: cb.log.length };
  list.push(ev);
  // The list is trimmed between actions (trimFx, called by the reducer before each one), never during one: a long
  // hostile phase is one action and may emit far more than FX_CAP effects, and every one of them must reach the screens.
  for (const f of fxTaps) f(cb, ev);
  return ev;
}

/** A unit went down or died: one event (the client drops and greys the token). */
export function fxFell(cb: Combat, u: Unit) { emitFx(cb, 'down', { unit: u.id, at: u.pos, dead: !!u.dead }); }
export function chained<T>(f: () => T, volley?: string): T { fxChain++; const was = VOLLEY; if (volley) VOLLEY = volley; try { return f(); } finally { fxChain--; VOLLEY = was; } }
/** The volley a shot belongs to ('burst' | 'auto' | 'skill' | 'paired' | 'cone'), or null: attack hooks carry it as
 * ctx.volley (hooks gap C3); 'volley_end' {u, mode, cb, rng} fires when one is over. */
let VOLLEY: string | null = null;
export const currentVolley = () => VOLLEY;
/** Run attacks as one named volley (rules 1.12: a technique's Burst or Rake), so items that read ctx.volley and the
 * round's index (ctx.vi) see them as they see the engine's own burst and full auto. */
export function asVolley<T>(name: string, f: () => T): T { return chained(f, name); }
/** Run attacks as chained swings or shots of one use (rules 1.12: the later strikes of Sweep, Cleave and Flurry): their
 * events carry chain: true, and no volley is named (items see each as an attack of its own). */
export function asChain<T>(f: () => T): T { return chained(f); }
/** A volley's AP through the items ('attack_preview' with the volley's mode and base AP; Southern Fist, Fire
 * Discipline: hooks gap A6/I2). */
function volleyAp(cb: Combat, u: Unit, t: Unit | null, mode: string, base: number): number {
  const hk: any = { att: u, tgt: t || u, mode, melee: false, ap: base, reach: 1, ignoreCover: false, terms: [], fail: null, free: false, preview: true, volleyCost: true, cb, mods: cb.mods || [] };
  emit(cb, 'attack_preview', hk); return Math.max(0, hk.ap);
}

export const key = (x: number, y: number) => x + ',' + y;
export const xy = (k: string) => k.split(',').map(Number) as [number, number];
// ---------- grid references (spec: Grid references): columns A, B, C… left to right, rows 1, 2, 3… top to bottom ----------
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const colName = (x: number) => (x < 26 ? LETTERS[x] : LETTERS[Math.floor(x / 26) - 1] + LETTERS[x % 26]);
export const refOf = (k: string) => { const [x, y] = k.split(',').map(Number); return colName(x) + (y + 1); };
/** "C7" (or "c 7") to a tile key, or null if it doesn't parse or falls off the map. */
export function keyOf(ref: string, map?: MapDef): string | null {
  const m = /^\s*([A-Za-z]{1,2})\s*(\d{1,3})\s*$/.exec(ref || ''); if (!m) return null;
  const L = m[1].toUpperCase(), x = L.length === 1 ? LETTERS.indexOf(L) : (LETTERS.indexOf(L[0]) + 1) * 26 + LETTERS.indexOf(L[1]), y = Number(m[2]) - 1;
  if (x < 0 || y < 0 || (map && (x >= map.w || y >= map.h))) return null;
  return x + ',' + y;
}
/** The map in words, for the Narrator and hover: size, what's where, and where the cover is. */
export function mapBrief(map: MapDef): string {
  const refs = (ks: string[]) => ks.map(refOf).join(', ');
  return [map.name + ': ' + map.w + ' columns (A–' + colName(map.w - 1) + ') × ' + map.h + ' rows (1–' + map.h + '); 1.5 m tiles.',
    ...(map.notes || []).map((n) => n.at + ': ' + n.text),
    ...(map.cover.length || (map.full || []).length ? ['Half cover at ' + (refs(map.cover) || 'none') + '; full cover at ' + (refs(map.full || []) || 'none') + '.'] : [])].join('\n');
}
/** A map's notes as rectangles, read once for each list of notes (a screen asks for every tile on every redraw: 676
 *  tiles on a 26 × 26 map, and reading the references each time took a tenth of a second a turn). */
const NOTE_RECTS = new WeakMap<object, { n: number; rects: { parts: [number, number, number, number][]; text: string }[] }>();
function noteRects(notes: NonNullable<MapDef['notes']>) {
  const had = NOTE_RECTS.get(notes); if (had && had.n === notes.length) return had.rects;
  const rects = notes.map((n) => ({ text: n.text, parts: String(n.at || '').split(',').map((part) => {
    const [a, b] = part.split(/[–-]/).map((r) => keyOf(r.trim()));
    if (!a) return null;
    const [x1, y1] = a.split(',').map(Number), [x2, y2] = (b || a).split(',').map(Number);
    return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)] as [number, number, number, number];
  }).filter((r): r is [number, number, number, number] => !!r) }));
  NOTE_RECTS.set(notes, { n: notes.length, rects });
  return rects;
}
/** The map's notes that cover one tile ("N1–P6" is a rectangle; commas separate parts). Most specific first. */
export function notesAt(map: MapDef, k: string): string[] {
  if (!map.notes || !map.notes.length) return [];
  const [x, y] = k.split(',').map(Number), hits: { area: number; text: string }[] = [];
  for (const n of noteRects(map.notes)) for (const r of n.parts) {
    if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) { hits.push({ area: (r[2] - r[0] + 1) * (r[3] - r[1] + 1), text: n.text }); break; }
  }
  return hits.sort((p, q) => p.area - q.area).map((h) => h.text);
}
/** Outside a fight: can someone walk from one tile to another (walls, closed doors and blocking objects in the way; no wall-corner squeezing)? */
export function walkable(map: MapDef, objs: MapObject[], from: string, to: string): boolean {
  const solid = new Set([...map.solid, ...objs.filter(blocksMove).map((o) => o.pos)]);
  if (solid.has(to)) return false;
  const seen = new Set([from]), q = [from];
  while (q.length) {
    const k = q.shift()!; if (k === to) return true;
    const [x, y] = xy(k);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy, n = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h || seen.has(n) || solid.has(n)) continue;
      if (dx && dy && solid.has(key(x + dx, y)) && solid.has(key(x, y + dy))) continue;
      seen.add(n); q.push(n);
    }
  }
  return false;
}
/** Tiles a character may stand on outside a fight. */
export const standable = (map: MapDef, k: string) => { const [x, y] = k.split(',').map(Number); return x >= 0 && y >= 0 && x < map.w && y < map.h && !map.solid.includes(k) && !map.cover.includes(k) && !(map.full || []).includes(k); };

export const dist = (a: string, b: string) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };

/** A character's Vision in tiles (spec: Vision): 12 + 2 per Perception above 1 + Vigilant + items. */
export const visionOf = (c: Character) => 12 + 2 * ((c.attrs.perception || 1) - 1) + (c.skills.vigilant || 0) + statQuery({ c }, 'vision').add;
export function unitFromCharacter(c: Character, pos: string, rng: Rng): Unit {
  const w = WEAPON[c.weapon] || WEAPON.service_pistol;
  return {
    id: 'pc-' + c.id, side: 'pc', name: c.name, short: c.name.slice(0, 2).toUpperCase(), charId: c.id, img: c.portrait, level: clampEnemyLevel(c.level),
    pos, hp: c.hp, maxHp: maxHp(c), def: defense(c), armour: (ARMOUR[c.armourClass]?.value || 0) + gearBonus(c, 'armour_bonus') + statQuery({ c }, 'armor').add,
    attack: mod(c.skills[w.skill] || 0) + RARITY[c.weaponState?.rarity || 'standard'].acc + skillRollMod({ c }, w.skill, { roll: 'attack', combat: true }).add + statQuery({ c }, 'attack').add, weapon: w.id,
    movement: movement(c), init: d20(rng) + initiativeBonus(c), agility: c.attrs.agility || 1, ap: 0, bank: 0, ammo: Math.min(loadedOf(c), magazineSize(w.id, c.weaponState?.mods) ?? 0), heat: 0, jammed: false, shotsThisTurn: 0,
    downed: c.hp <= 0, dead: false, saves: { ok: 0, fail: 0 }, stunnedNext: 0, kills: 0,
    injuries: (c.injuries || []).map((i) => ({ ...i })), bleed: 0, dazedNext: 0, injResist: injuryResistPct(c), hand: mainHandSide(c),
    vigilant: c.skills.vigilant || 0, overweight: overweightKg(c),
    dmgMult: RARITY[c.weaponState?.rarity || 'standard'].dmg, dur: weaponDurOf(c), maxDur: maxDurOf(w.id, c.weaponState?.rarity), mods: [...(c.weaponState?.mods || [])],
    offWeapon: c.offHand && WEAPON[c.offHand.id] ? c.offHand.id : null, offAmmo: c.offHand && WEAPON[c.offHand.id] ? Math.min(c.offHand.loaded ?? WEAPON[c.offHand.id].magazine ?? 0, WEAPON[c.offHand.id].magazine ?? 0) : 0, // its own rounds (item 688)
    light: gearBonus(c, 'light'), darkSight: gearHas(c, 'dark_sight'), hazardImmune: gearEffects(c).filter((e) => e.op === 'hazard_immune').map((e) => e.hazard || ''),
    ignoreDifficult: gearHas(c, 'ignore_difficult'), unarmedBonus: gearBonus(c, 'unarmed_damage_bonus'), proficiency: c.skills.proficiency || 0,
    parts: packOf(c).filter((x) => (x.item || x.id) === 'spare_parts').reduce((t, x) => t + x.qty, 0), dexterity: c.skills.dexterity || 0, athleticsPts: c.skills.athletics || 0, vision: visionOf(c), sensory: c.skills.sensory || 0, noSprint: overweightKg(c) > 0 || c.armourClass >= 5, strength: mod(c.skills.raw_power || 0), mags: [...spareMags(c)], loose: packOf(c).filter((x) => x.calibre && x.calibre === w.ammo).reduce((t, x) => t + x.qty, 0), analysis: c.skills.analysis || 0,
    mg: magicOf(c), ...(c.perks?.length || c.traits?.length || c.classId || c.advancedClass || skillItemsOf(c.skills).length ? { held: heldOfChar(c) } : {}),
    ...pcExtras(c, w),
  };
}
/** The rules-1.3 fields a PC unit carries (saves for every PC, item d20 mods by skill, derived damage stats, kind,
 * special ammo, throwables, class resources). */
function pcExtras(c: Character, w: WeaponDef): Partial<Unit> {
  const fams = ['body', 'brain', 'heart'] as const, sk: Record<string, number> = {};
  for (const s of SKILLS) { const m = skillRollMod({ c }, s.id, { roll: 'combat', combat: true }).add; if (m) sk[s.id] = m; }
  const thr: Record<string, number> = {};
  for (const it of packOf(c)) { const wid = it.weapon || it.id; if (WEAPON[wid]?.category === 'thrown' && it.qty > 0 && !it.mags) thr[wid] = (thr[wid] || 0) + it.qty; }
  const spare = packOf(c).find((x) => x.weapon === c.weapon && x.mags);
  const offG = c.offHand && WEAPON[c.offHand.id] && c.offHand.id !== c.weapon ? WEAPON[c.offHand.id] : null;
  const offW = offG ? packOf(c).find((x) => x.weapon === offG.id && x.mags) : null;
  const offLoose = offG && offG.reload === 'loose' && offG.ammo && offG.ammo !== w.ammo ? packOf(c).filter((x) => x.calibre === offG.ammo && !x.mags).reduce((t, x) => t + x.qty, 0) : null;
  const kind = (c as any).kind || ((c.traits || []).includes('factory_made') ? 'machine' : 'human');
  const res = resourcesFor(c);
  return {
    sv: Object.fromEntries(fams.map((f) => [f, saveBonus(c, f)])) as any, dbf: strengthTable(c),
    ...(Object.keys(sk).length ? { sk } : {}),
    critTaken: critTakenPct(c), elemTaken: elementalTakenPct(c), ambushTaken: ambushTakenPct(c), healRecv: healReceivedMult(c), shieldRecv: shieldReceivedMult(c), counter: counterBonus(c),
    throwRange: throwRange(c), ambushMult: ambushMult(c), blessPower: blessingPower(c), ingMod: mod(c.skills.ingenuity || 0), stealth: stealthOf(c),
    kind, tags: ['humanoid', ...((c as any).tags || [])],
    ammoType: c.loadedType || null, ...(spare?.magTypes ? { magTypes: [...spare.magTypes] } : {}),
    ...(Object.keys(thr).length ? { throwables: thr } : {}),
    ...(offW?.mags ? { offMags: [...offW.mags] } : offG && offG.reload === 'magazine' ? { offMags: [] } : {}),
    ...(offW?.mags && offW.magTypes ? { offMagTypes: typesFor(offW.magTypes, offW.mags.length) } : {}),
    ...(c.offHand?.ammoType && c.offHand.loaded ? { offAmmoType: c.offHand.ammoType } : {}),
    ...(offLoose != null ? { offLoose } : {}),
    offItem: c.offHand && !WEAPON[c.offHand.id] && !twoHands(c, c.weapon) ? c.offHand.id : null, durability: c.skills.durability || 0,
    ...(res ? res : {}),
  };
  void w;
}
/** Class resources (spec: Classes; rules 1.3 shared subsystems): a fight starts with Guard 0, Marks 0 and (before the
 * fight's opening gives everyone with the meter 1 Momentum: physical/rules.ts) Momentum 0, and
 * Charges 0 (maxima from classes.json resource.max, else 5 / 5 / 3 / 3), and the character's Supplies and toxins. */
export function resourcesFor(c: Character): { res: Record<string, number>; resMax: Record<string, number> } | null {
  const ids = classResources(c); if (!ids.length) return null;
  const res: Record<string, number> = {}, resMax: Record<string, number> = {};
  for (const r of ids) { resMax[r.id] = r.max; res[r.id] = r.persist ? Math.min(r.max, c.res?.[r.id] ?? r.max) : 0; }
  return { res, resMax };
}

/** Rules 1.15: an enemy is a tier and a level. Its HP, armour, Defense, attack bonus and damage factor come from
 * enemies.json (the tier's level 1 row raised by the level's row: data.ts enemyStats). No level given: level 1. */
export function unitFromEnemy(id: string, name: string, tierId: string, weaponId: string, pos: string, rng: Rng, level?: number): Unit {
  const t = ENEMY[tierId] || ENEMY.minion, w = WEAPON[weaponId] || WEAPON.service_pistol, n = enemyStats(t.id, level ?? 1);
  return {
    id, side: 'foe', name, short: name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase() || 'EN', tier: t.id, level: n.level, lvlDmg: n.damage,
    pos, hp: n.hp, maxHp: n.hp, def: n.defense, armour: n.armour, attack: n.attack_bonus, weapon: w.id, movement: t.movement,
    init: d20(rng) + n.attack_bonus, agility: 1, ap: 0, bank: 0, ammo: w.magazine ?? 0, heat: 0, jammed: false, shotsThisTurn: 0,
    downed: false, dead: false, saves: { ok: 0, fail: 0 }, stunnedNext: 0, kills: 0,
    injuries: [], bleed: 0, dazedNext: 0, injResist: 10 * ((t.endurance || 1) - 1), hand: 'right', vision: 12, sensory: 0, strength: n.attack_bonus,
    mags: w.magazine == null ? undefined : w.reload === 'loose' ? [] : Array(t.spare_mags ?? 2).fill(w.magazine), loose: w.reload === 'loose' ? (t.spare_mags ?? 2) * (w.magazine || 0) : 0,
    ...(t.techniques && (t.techniques.melee?.length || t.techniques.ranged?.length) ? { techs: [...(t.techniques.melee || []), ...(t.techniques.ranged || [])] } : {}),
    ...(t.calls?.length ? { calls: [...t.calls], callLevel: t.call_level || 1 } : {}), // rules 1.13: an officer's Calls
  };
}
/** Rules 1.15: a companion is its owner's level. Its own stat block (enemies.json companions) is the level 1 block; the
 * level table raises its HP, armour, Defense, attack bonus and damage. hpNow: the HP it carries from before (null: full).
 * The twin keeps its own rule (half its owner's HP, its owner's Defense, plain damage): it only takes the level. */
export function levelCompanion(u: Unit, block: { hp: number; defense: number; attack_bonus: number; armour: number }, ownerLevel: number | undefined, hpNow?: number | null) {
  const n = levelled({ ...block, damage: 1 }, ownerLevel ?? 1);
  if (u.companion === 'twin' || (u as any).twinOf) { u.level = n.level; delete u.lvlDmg; return u; }
  Object.assign(u, { level: n.level, lvlDmg: n.damage, maxHp: n.hp, hp: Math.min(n.hp, hpNow ?? n.hp), def: n.defense, armour: n.armour, attack: n.attack_bonus, strength: n.attack_bonus });
  return u;
}
/** Rules 1.15: an enemy caster's spells grow by its damage factor, as its weapon's damage does (after armFoe / armHeart). */
export function levelFoeMagic(u: Unit) {
  const f = u.lvlDmg, m: any = u.mg; if (!m || !f || f === 1 || m.lvlScaled) return;
  m.sigilMult = (m.sigilMult || 1) * f; m.soulMult = (m.soulMult || 1) * f; m.lvlScaled = true;
}
/** The level a unit stands at for the level gap: its own; a twin stands at its owner's (called in a fight, it is built
 * without one). Undefined: a unit from a fight saved before rules 1.15, or one with pinned numbers. */
const gapLevel = (u: Unit, cb?: Combat | null): number | undefined => ((u as any).twinOf && cb ? cb.units.find((x) => x.id === (u as any).twinOf)?.level : u.level);
/** Rules 1.15, the level gap between an enemy and a character (or a companion): how many levels `a` stands above `b`,
 * to the gap's limit. 0 between characters, between enemies, and for any unit with no level (an old save's fight).
 * cb: the fight, so that a twin reads its owner's level. */
export function levelGap(a: Unit, b: Unit, cb?: Combat | null): number {
  const la = gapLevel(a, cb), lb = gapLevel(b, cb);
  if (la == null || lb == null || a.side === b.side) return 0;
  const foe = a.side === 'foe' ? a : b.side === 'foe' ? b : null; if (!foe || foe.lvlDmg == null) return 0;
  const m = ENEMY_LEVELS.gap.max_levels; return Math.max(-m, Math.min(m, la - lb));
}
/** Rules 1.15: this enemy (never an Elite or a Boss) is 5 or more levels below the character (or companion) who is hurting it: one hit takes it out. */
export function farBelow(t: Unit, by: Unit | null | undefined, cb?: Combat | null): boolean {
  if (!by || t.side !== 'foe' || t.companion || by.side === 'foe' || t.level == null || t.lvlDmg == null) return false;
  if (t.tier === 'elite' || t.tier === 'boss') return false; // Leon, 11 Nov 2026: an Elite and a Boss are never taken out in one hit by the gap
  const lb = gapLevel(by, cb); return lb != null && lb - t.level >= ENEMY_LEVELS.gap.one_hit_levels_below;
}
// The hit itself (rules 1.15): whatever the enemy's HP and shield, as long as the hit deals at least 1 damage. It is
// read after every reduction has spoken: in the 'shield' phase, or, for damage that goes past shields (which has no
// such phase), in 'reduce' (a listener like this one runs after every item's).
onHook('damage_in', (ctx: any) => {
  const t: Unit = ctx.t;
  if (ctx.phase === 'after') { if (ctx.oneHit && ctx.killed && ctx.cb) ctx.cb.log.push(t.name + ' is far below ' + (ctx.src?.by?.name || 'you') + '\'s level: one hit is enough.'); return; }
  if (!(ctx.phase === 'shield' || (ctx.phase === 'reduce' && (ctx.src?.shield === false || t.downed))) || !(ctx.dmg >= 1)) return;
  if (farBelow(t, ctx.src?.by, ctx.cb)) { ctx.dmg = Math.max(ctx.dmg, t.hp + (t.shield || 0)); ctx.oneHit = true; }
});

/** −2 to attacks when an injured arm holds the weapon: the main-hand arm, or either arm for a two-handed weapon. */
export const armPenalty = (u: Unit, w: WeaponDef) => ((u.injuries || []).some((i) => i.loc === 'arm' && (!ONE_HANDED.includes(w.category) || i.side === (u.hand || 'right'))) ? -2 : 0);

export const alive = (u: Unit) => !u.dead && !u.downed && !u.surrendered;
export const active = (cb: Combat) => cb.units.find((u) => u.id === (cb.window?.queue[0]?.unitId ?? cb.order[cb.turn]));

// ---------- map objects in a fight (spec: Map objects; Cover) ----------
export const COVER_HP = { half: OBJ.crate?.hp || 30, full: OBJ.pillar?.hp || 80 };
/** The objects a map starts with: its half-cover tiles become crates, its full-cover tiles pillars, plus what it declares. */
export function defaultObjects(map: MapDef): MapObject[] {
  let n = 0; const id = () => 'm' + (++n);
  return [...map.cover.map((k) => makeObject(id(), 'crate', k)), ...(map.full || []).map((k) => makeObject(id(), 'pillar', k)),
    ...(map.objects || []).map((o) => { const k = keyOf(o.at, map); if (!k) return null;
      const ob = makeObject(id(), o.kind, k, { name: o.name, text: o.text, approaches: (o.approaches || []).map((a) => ({ label: a.label, skills: a.skills, tn: a.tn, stakes: a.stakes, success: (a.success || '') as any, tries: [] })),
        // A sigil mark (rules 1.10): its word, age and damage (makeObject gives it its Investigate approach).
        ...((o as any).kind === 'sigil_mark' ? { word: String((o as any).word || '').toLowerCase(), ...((o as any).age ? { age: (o as any).age } : {}), ...((o as any).damage ? { damage: (o as any).damage } : {}) } : {}) });
      if (o.hidden != null && OBJ[o.kind]?.trap) ob.hidden = o.hidden; if (o.locked) ob.locked = true; if (o.to) ob.to = o.to;
      if (o.sprite) ob.sprite = o.sprite; if (o.spriteBox) ob.spriteBox = o.spriteBox; if (o.portrait) ob.portrait = o.portrait; return ob; }).filter(Boolean) as MapObject[]];
}
/** The fight's objects; saves from before objects existed are rebuilt from their cover state. */
export function objectsOf(cb: Combat): MapObject[] {
  if (!cb.objects) {
    cb.objects = cb.cover
      ? [...Object.entries(cb.cover).map(([k, c], i) => makeObject('m' + (i + 1), c.kind === 'full' ? 'pillar' : 'crate', k, { hp: c.hp, max: c.max })), ...(cb.rubble || []).map((k, i) => makeObject('r' + (i + 1), 'rubble', k))]
      : defaultObjects(cb.map);
  }
  return cb.objects;
}
export const objectsAt = (cb: Combat, k: string) => objectsOf(cb).filter((o) => o.pos === k);
/** Cover still standing, by tile, with its HP. */
export function coverOf(cb: Combat): Record<string, { kind: 'half' | 'full'; hp: number; max: number; id: string; name: string }> {
  const out: Record<string, any> = {};
  for (const o of objectsOf(cb)) { const c = coverKind(o); if (c) out[o.pos] = { kind: c, hp: o.hp ?? 0, max: o.max ?? 0, id: o.id, name: o.name }; }
  return out;
}
const coverKeys = (cb: Combat, kind?: 'half' | 'full') => Object.entries(coverOf(cb)).filter(([, c]) => !kind || c.kind === kind).map(([k]) => k);
export const difficultOf = (cb: Combat) => new Set([...cb.map.difficult, ...objectsOf(cb).filter(isDifficult).map((o) => o.pos)]);
export const moveBlockers = (cb: Combat) => new Set([...cb.map.solid, ...objectsOf(cb).filter(blocksMove).map((o) => o.pos)]);
export const sightBlockers = (cb: Combat) => new Set([...cb.map.solid, ...objectsOf(cb).filter(blocksSight).map((o) => o.pos), ...veilTiles(cb)]);

/** Damage to a unit from something other than an attack (explosions, traps, hazards). Returns a log suffix. */
export function hurtUnit(u: Unit, dmg: number, ignoreArmour = false, cb?: Combat, why = 'hazard', by?: Unit | null): string {
  if (u.dead) return '';
  const d = Math.max(1, Math.floor(dmg) - (ignoreArmour ? 0 : u.armour));
  const r = applyDamage(cb || null, u, d, { type: why, by: by || null, shield: false, explosive: why === 'explosion', credit: 'hp' });
  if (r.downedHit) { if (cb) { emitFx(cb, 'hurt', { target: u.id, at: u.pos, dmg: 0, why, killed: u.dead }); if (u.dead) fxFell(cb, u); } return ' · ' + u.name + ' takes a hit while Downed' + (u.dead ? ' and dies' : ''); }
  if (r.prevented) return ' · ' + u.name + ' shrugs it off';
  if (cb) { emitFx(cb, 'hurt', { target: u.id, at: u.pos, dmg: r.dealt, why, killed: u.hp === 0 }); if (u.hp === 0) fxFell(cb, u); }
  return ' · ' + u.name + ' takes ' + r.dealt + (u.hp === 0 ? (u.side === 'foe' ? ', down for good' : ', Downed') : '');
}
/** Damage an object on a tile; at 0 HP cover becomes rubble and barrels explode. Returns a log suffix. */
export function damageObject(cb: Combat, k: string, dmg: number, depth = 0, by: Unit | null = null): string {
  const o = objectsAt(cb, k).find((x) => x.hp != null && x.hp > 0); if (!o) return '';
  const name = o.name.toLowerCase(), many = pluralName(name);
  o.hp = Math.max(0, o.hp! - Math.max(1, Math.floor(dmg)));
  emitFx(cb, 'object', { at: k, what: o.kind, dmg: Math.max(1, Math.floor(dmg)), broken: o.hp <= 0, hp: o.hp, ...(o.max != null ? { max: o.max } : {}) });
  if (o.hp > 0) return ' · the ' + name + (many ? ' take ' : ' takes ') + Math.floor(dmg) + ' (' + o.hp + '/' + o.max + ')';
  cb.objects = objectsOf(cb).filter((x) => x !== o);
  emit(cb, 'object_destroyed', { obj: o, by, cb });
  const kd = kindOf(o);
  if (kd.explodes && depth < 4) {
    let out = ' · the ' + name + (many ? ' EXPLODE' : ' EXPLODES');
    emitFx(cb, 'explode', { at: k, radius: kd.explodes.radius, what: o.kind });
    for (const u of cb.units) if (!u.dead && dist(u.pos, k) <= kd.explodes.radius) out += hurtUnit(u, kd.explodes.damage, false, cb, 'explosion', by);
    for (const x of [...objectsOf(cb)]) if (x.pos !== k && dist(x.pos, k) <= kd.explodes.radius) out += damageObject(cb, x.pos, kd.explodes.damage, depth + 1, by);
    cb.objects.push(makeObject('x' + cb.objects.length + '_' + k.replace(',', '_'), 'fire', k));
    return out;
  }
  if (kd.cover || kd.id === 'barricade') { cb.objects.push(makeObject('r_' + k.replace(',', '_') + '_' + cb.round, 'rubble', k)); return ' · the ' + name + (many ? ' break' : ' breaks') + ' into rubble'; }
  return ' · the ' + name + (many ? ' are' : ' is') + ' destroyed';
}
/** Is an object's name plural (sandbags, crates): its verb agrees (live check, 10 Nov 2026: "the sandbags breaks"). */
export const pluralName = (name: string): boolean => /[^s']s$/i.test(name.trim()) && !/(ss|us|is)$/i.test(name.trim());
export const damageCover = damageObject;

/** Spot hidden traps near a PC: passive Vigilant (10 + modifier) against the trap's TN (spec: Map objects). */
export function spotTraps(objs: MapObject[], pos: string, vigilant: number, name: string, log: (s: string) => void) {
  for (const o of objs) if (o.hidden && isTrap(o)) {
    const t = kindOf(o).trap!, passive = passiveVigilance(vigilant);
    if (dist(o.pos, pos) <= t.detect_range && passive >= t.detect_tn) { o.hidden = false; log(name + ' spots a trap at ' + refOf(o.pos) + ' (Vigilant ' + passive + ' vs ' + t.detect_tn + ').'); }
  }
  // Rules 1.9: a hidden pile (the Narrator's) falls to the same passive Vigilant, by its kind's spot TN and range (item 677).
  for (const o of objs) if (o.hidden && !isTrap(o) && kindOf(o).spot) {
    const t = kindOf(o).spot!, passive = passiveVigilance(vigilant);
    if (dist(o.pos, pos) <= t.detect_range && passive >= t.detect_tn) { o.hidden = false; log(name + ' spots something on the ground at ' + refOf(o.pos) + ' (Vigilant ' + passive + ' vs ' + t.detect_tn + ').'); }
  }
}
/** Open or close an adjacent door (1 AP in a fight). */
export function toggleDoor(cb: Combat, u: Unit, tile: string): string | null {
  const o = objectsAt(cb, tile).find((x) => kindOf(x).door); if (!o) return 'No door there.';
  if (dist(u.pos, tile) > 1) return 'Stand next to it.';
  if (o.locked) return 'Locked.';
  if (o.open && cb.units.some((x) => !x.dead && x.pos === tile)) return 'Someone is in the doorway.';
  if (u.ap < 1) return 'Needs 1 AP.';
  u.ap -= 1; o.open = !o.open; emitFx(cb, 'door', { unit: u.id, at: tile, open: !!o.open });
  cb.log.push(u.name + (o.open ? ' opens ' : ' closes ') + 'the ' + o.name.toLowerCase() + ' at ' + refOf(tile) + '.');
  return null;
}

// ---------- movement (spec: Moving; port of the prototype's paths()) ----------
/** Path options items open (rules 1.3): 'path_opts' {u, runnable, pass, jump, ignoreDifficult, knowsTraps} lets a
 * handler add tiles a unit may cross although they block (Wall Run over a hole or a wall face: runnable), units it may
 * pass through (Make Way: pass), a jump over one blocked tile (Augmented legs: jump), or rough ground at no extra
 * cost. A unit avoids the traps its side knows: map traps the enemy set (foes know them; PCs once spotted), and the
 * traps a side placed itself (o.side) or has spotted (o.knownBy). */
/** noStop: tiles a path may cross but never end on (a wall run's wall: hooks gap B2). */
export interface PathOpts { runnable: Set<string>; pass: Set<string>; jump: boolean; ignoreDifficult: boolean; noStop?: Set<string> }
export function trapKnown(o: MapObject, side: 'pc' | 'foe'): boolean {
  const k: any = o; if (k.side) return k.side === side || (k.knownBy || []).includes(side);
  return side === 'foe' || !o.hidden;
}
export function pathOpts(cb: Combat, me: Unit | undefined): PathOpts {
  const o: any = { u: me, runnable: new Set<string>(), pass: new Set<string>(), jump: false, ignoreDifficult: !!me?.ignoreDifficult, cb };
  if (me && cb) emit(cb, 'path_opts', o);
  return o;
}
/** avoid: tiles a route may end on but never pass through (revealed hazards, for a player's click-path: movePaths). */
export function paths(cb: Combat, from: string, self: string, avoid?: Set<string>) {
  const { w, h } = cb.map, me = cb.units.find((u) => u.id === self), diff = difficultOf(cb), opt = pathOpts(cb, me);
  const solid = new Set([...moveBlockers(cb), ...objectsOf(cb).filter((o) => isTrap(o) && trapKnown(o, me?.side || 'pc')).map((o) => o.pos)]);
  for (const k of opt.runnable) solid.delete(k);
  const blocked = new Set(cb.units.filter((u) => u.id !== self && !u.dead && !opt.pass.has(u.id)).map((u) => u.pos));
  const d: Record<string, number> = { [from]: 0 }, prev: Record<string, string> = {}, open = [from];
  const stand = (k: string) => !solid.has(k) && !blocked.has(k);
  while (open.length) {
    // The nearest open tile, the earliest found among equals (what a stable sort of the whole list gave, without
    // sorting it at every step: a 26 × 26 map has 676 tiles to visit).
    let bi = 0; for (let i = 1; i < open.length; i++) if (d[open[i]] < d[open[bi]]) bi = i;
    const k = open.splice(bi, 1)[0], [x, y] = xy(k);
    if (avoid && k !== from && avoid.has(k)) continue; // reachable, but no way through
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy, n = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (!stand(n)) {
        // A jump clears one blocked tile in a straight line (2 tiles of movement), landing on a free one.
        if (opt.jump) { const jx = nx + dx, jy = ny + dy, j = key(jx, jy); if (jx >= 0 && jy >= 0 && jx < w && jy < h && stand(j)) { const nd = d[k] + 2; if (d[j] === undefined || nd < d[j] - 1e-9) { d[j] = nd; prev[j] = k; open.push(j); } } }
        continue;
      }
      if (dx && dy && solid.has(key(x + dx, y)) && solid.has(key(x, y + dy))) continue; // no squeezing diagonally between two walls
      const nd = d[k] + (diff.has(n) && !opt.ignoreDifficult ? 2 : 1) + (dx && dy ? 0.001 : 0);
      if (d[n] === undefined || nd < d[n] - 1e-9) { d[n] = nd; prev[n] = k; open.push(n); }
    }
  }
  for (const k of Object.keys(d)) d[k] = Math.round(d[k]);
  // A tile someone you pass through stands on is a way through, never a place to stop.
  for (const u of cb.units) if (u.id !== self && !u.dead && opt.pass.has(u.id)) delete d[u.pos];
  for (const k of opt.noStop || []) if (k !== from) delete d[k];
  // A sabotaged barricade (the Infiltrator's Sabotage) is a way through for 2 rounds, never a place to stop: it blocks
  // again when the sabotage ends, and nobody may then be standing inside it (spec item 568).
  for (const o of objectsOf(cb)) if ((o as any).sabotaged && kindOf(o).blocks_move && o.pos !== from) delete d[o.pos];
  return { dist: d, prev };
}
/** The revealed hazard tiles that would go off for this side (rules 1.9: not hidden, not spent, not on its safe path). */
export function revealedHazardTiles(cb: Combat, side: 'pc' | 'foe'): Map<string, Hazard> {
  const out = new Map<string, Hazard>();
  for (const h of cb.hazards || []) if (!h.hidden) for (const t of h.tiles) if (hazardLiveAt(h, t, side) && !out.has(t)) out.set(t, h);
  return out;
}
/** The route a paths() result takes to `to` (tiles after `from`, in order). */
export function routeTo(P: { prev: Record<string, string> }, from: string, to: string): string[] {
  const route: string[] = []; for (let k = to; k && k !== from && P.prev[k]; k = P.prev[k]) route.unshift(k);
  return route;
}
/** How a move is made, for the detour check: 'sneak' (the area map) costs 1 AP a tile on top. */
export type MoveHow = 'move' | 'sprint' | 'disengage' | 'sneak';
/** Whether a unit can pay for walking `tiles` this way now (the plain price, before item hooks). */
export function canAffordTiles(u: Unit, tiles: number, how: MoveHow = 'move'): boolean {
  if (how === 'sprint') return tiles <= Math.floor(3 * u.movement);
  if (how === 'disengage') return tiles <= 1;
  return apForTiles(tiles, u.bank || 0, u.movement) + (how === 'sneak' ? tiles : 0) <= u.ap;
}
/** The paths a move to `to` uses (rules 1.9, item 683): a player's unit (a character or a companion) goes around every
 * revealed hazard tile when that route is at most PILE.route_slack_tiles longer than the shortest AND the unit can still
 * pay for it this way (AP, or a sprint's 3 × Movement); otherwise, and for everyone else, the shortest (and the preview
 * warns what it crosses). Hidden hazards don't count (nobody knows them). */
export function movePaths(cb: Combat, u: Unit, to: string, how: MoveHow = 'move') {
  const P = paths(cb, u.pos, u.id);
  if (u.side !== 'pc' || P.dist[to] === undefined || !cb.hazards?.length) return P;
  const hz = revealedHazardTiles(cb, 'pc'); if (!hz.size) return P;
  if (!routeTo(P, u.pos, to).some((k) => k !== to && hz.has(k))) return P;
  const A = paths(cb, u.pos, u.id, new Set(hz.keys()));
  return A.dist[to] !== undefined && A.dist[to] <= P.dist[to] + PILE.route_slack_tiles && canAffordTiles(u, A.dist[to], how) ? A : P;
}
/** For the move preview (rules 1.9): the route a click to `to` takes, its length, and every revealed hazard tile on
 * it ("Path crosses: mines at C4"). Null when the tile can't be reached. */
export function routeHazards(cb: Combat, u: Unit, to: string, how: MoveHow = 'move'): { route: string[]; tiles: number; crosses: { tile: string; ref: string; id: string; kind: string; name: string }[] } | null {
  const P = movePaths(cb, u, to, how); if (P.dist[to] === undefined || to === u.pos) return null;
  const route = routeTo(P, u.pos, to), hz = revealedHazardTiles(cb, u.side);
  const crosses = route.filter((k) => hz.has(k)).map((k) => { const h = hz.get(k)!; return { tile: k, ref: refOf(k), id: h.id, kind: h.kind, name: h.name || HAZARD[h.kind]?.name || h.kind }; });
  return { route, tiles: P.dist[to], crosses };
}
/** Moving N tiles costs N ÷ Movement AP, rounded up, after tiles already paid for this turn. */
export const apForTiles = (tiles: number, bank: number, mov: number) => Math.ceil(Math.max(0, tiles - bank) / mov - 1e-9);

// ---------- line of sight and cover ----------
export function lineOfSight(cb: Combat, a: string, b: string, ignoreVeil = false, blockers?: Set<string>): boolean {
  // half cover doesn't block sight; ignoreVeil: smoke (VEIL zones) doesn't either (Skin Map)
  // blockers: sightBlockers(cb), from a caller that asks about many tiles at once (the enemy's choice of where to stand)
  const solid = blockers ? blockers : ignoreVeil ? new Set([...cb.map.solid, ...objectsOf(cb).filter(blocksSight).map((o) => o.pos)]) : sightBlockers(cb);
  let [x0, y0] = xy(a); const [x1, y1] = xy(b);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (!(x0 === x1 && y0 === y1)) {
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
    const k = key(x0, y0);
    if (k !== b && solid.has(k)) return false;
  }
  return true;
}
/** The half-cover tile protecting a target: next to it and between it and the attacker (spec: Cover). */
export function coverTileFor(cb: Combat, from: string, to: string): string | null {
  const [tx, ty] = xy(to);
  for (const c of coverKeys(cb, 'half')) {
    const [cx, cy] = xy(c);
    if (Math.max(Math.abs(cx - tx), Math.abs(cy - ty)) === 1 && dist(from, c) < dist(from, to)) return c;
  }
  return null;
}
export const coverBonus = (cb: Combat, from: string, to: string) => (coverTileFor(cb, from, to) ? 5 : 0);

// ---------- vision and fog of war (spec: Vision) ----------
export function litAt(cb: Combat, k: string): boolean {
  if (!cb.map.dark || magicLit(cb, k)) return true;
  return objectsOf(cb).some((o) => lightOf(o) > 0 && dist(o.pos, k) <= lightOf(o)) || cb.units.some((u) => !u.dead && (u.light || 0) > 0 && dist(u.pos, k) <= (u.light || 0));
}
/** Can this unit see that tile (range, darkness, line of sight)? */
export function unitSees(cb: Combat, u: Unit, k: string): boolean {
  if (u.dead || u.downed) return false;
  const range = litAt(cb, k) || u.darkSight ? (u.vision || 12) : Math.floor((u.vision || 12) / 2);
  return dist(u.pos, k) <= range && (k === u.pos || lineOfSight(cb, u.pos, k));
}
/** What one side sees, shared by the squad: tiles in sight, units seen, units only sensed (Sensory). */
export function visibility(cb: Combat, side: 'pc' | 'foe' = 'pc') {
  const eyes = cb.units.filter((u) => u.side === side && !u.dead && !u.downed), tiles = new Set<string>();
  for (let x = 0; x < cb.map.w; x++) for (let y = 0; y < cb.map.h; y++) { const k = key(x, y); if (eyes.some((u) => unitSees(cb, u, k))) tiles.add(k); }
  const seen = new Set<string>(), sensed = new Set<string>();
  for (const t of cb.units) if (t.side !== side && !t.dead) {
    // A Hidden unit isn't seen (spec: Helpful states): at most sensed, by Sensory range.
    let isSeen = tiles.has(t.pos) && !t.hidden, isSensed = !isSeen && eyes.some((u) => dist(u.pos, t.pos) <= 1 + Math.floor((u.sensory || 0) / 3));
    if (sightHooked(cb)) { const r = seesHook(cb, side, t, null, isSeen, isSensed); isSeen = r.seen; isSensed = !isSeen && r.sensed; }
    if (isSeen) seen.add(t.id); else if (isSensed) sensed.add(t.id);
  }
  return { tiles, seen, sensed };
}
/** Items that change who is seen (Sixth Sense, Skin Map, Sworn Sibling, Upper-Touched, Chain Smoker): the 'sees' hook
 * {cb, side, t, by, seen, sensed}. side is the side looking; by is the one unit looking (an attack, a reaction) or null
 * for the side's shared sight (the fog of war). Handlers may set seen or sensed. Allies count too (a sibling). */
const sightHooked = (cb: Combat) => anyOn(cb, 'sees') || cb.units.some((u) => u.hidden && !!u.call?.spot?.unhide); // rules 1.13: a Spotted unit isn't Hidden to the allies it was pointed out to (calls/rules.ts)
function seesHook(cb: Combat, side: 'pc' | 'foe', t: Unit, by: Unit | null, seen: boolean, sensed: boolean): { seen: boolean; sensed: boolean } {
  const r: any = emit(cb, 'sees', { cb, side, t, by, seen, sensed });
  return { seen: !!r.seen, sensed: !!r.sensed };
}
/** Does this side see the unit t where it stands now? The same answer as visibility(cb, side).seen.has(t.id) (its own
 * side always sees it), for one unit, without walking the map. */
export function sideSeesUnit(cb: Combat, side: 'pc' | 'foe', t: Unit): boolean {
  if (t.side === side) return true;
  if (t.dead) return false;
  const eyes = cb.units.filter((u) => u.side === side && !u.dead && !u.downed);
  let isSeen = !t.hidden && eyes.some((u) => unitSees(cb, u, t.pos));
  if (sightHooked(cb)) { const isSensed = !isSeen && eyes.some((u) => dist(u.pos, t.pos) <= 1 + Math.floor((u.sensory || 0) / 3)); isSeen = seesHook(cb, side, t, null, isSeen, isSensed).seen; }
  return isSeen;
}
/** A walk's sight, per side: '1' at each path tile where that side sees the mover, '0' where it doesn't (presentation
 * only: the client walks a hostile in from the fog edge and out into it, and never draws it where it was unseen). */
export function pathSight(cb: Combat, u: Unit, path: string[]): { pc: string; foe: string } {
  const at = u.pos, out = { pc: '', foe: '' };
  try {
    for (const k of path) { u.pos = k; for (const side of ['pc', 'foe'] as const) out[side] += sideSeesUnit(cb, side, u) ? '1' : '0'; }
  } finally { u.pos = at; }
  return out;
}
/** One 'move' event for a walk (or the part of it before a reaction), with its sight. walked: each tile's sight as it
 * was walked ('10': the pc side saw the mover there, the foe side didn't; moveUnit records it step by step, so a mover
 * revealed or hidden mid-walk shows only where it really was seen); without it, the sight is worked out now. */
export function moveFx(cb: Combat, u: Unit, path: string[], how: string, walked?: string[]) {
  const sight = walked && walked.length === path.length ? { pc: walked.map((x) => x[0]).join(''), foe: walked.map((x) => x[1]).join('') } : pathSight(cb, u, path);
  emitFx(cb, 'move', { unit: u.id, from: path[0], to: path[path.length - 1], path: [...path], how, sight });
}
/** A mover's sight where it stands now, as moveFx's walked entry ('1' or '0' for the pc side, then the foe side). */
export const sightHere = (cb: Combat, u: Unit) => (sideSeesUnit(cb, 'pc', u) ? '1' : '0') + (sideSeesUnit(cb, 'foe', u) ? '1' : '0');
const seenIds = (cb: Combat, side: 'pc' | 'foe') => cb.units.filter((t) => t.side !== side && !t.dead && sideSeesUnit(cb, side, t)).map((t) => t.id);
/** What a walker's side saw after each of its steps (moveUnit): at, the walker's tile; ids, the hostiles seen then. */
export interface WalkSight { by: string; side: 'pc' | 'foe'; steps: { at: string; ids: Set<string> }[] }
/** The walker's tile from which this unit stayed in (in = true) or out of its side's sight to the walk's end (the step
 * its eyes found it or lost it); null when that held from the start or never held. Pure. */
function walkStep(w: WalkSight, id: string, inSight: boolean): string | null {
  let j = w.steps.length;
  while (j > 0 && w.steps[j - 1].ids.has(id) === inSight) j--;
  return j > 0 && j < w.steps.length ? w.steps[j].at : null;
}
let SIGHT_MUTE = 0;
/** Run f without sight events (a fight being set up: who starts Hidden), then record each side's sight afresh. */
export function sightQuietly<T>(cb: Combat, f: () => T): T {
  SIGHT_MUTE++;
  try { return f(); } finally { SIGHT_MUTE--; delete cb.sightSeen; delete cb.sightPos; delete cb.sightWhy; sightFx(cb); }
}
/**
 * Presentation only: the hostiles each side sees now against the last check (cb.sightSeen). Each one that came into a
 * side's sight gets a 'sight' event for that side's eyes alone ({unit, at, how: 'enter' | 'reveal', only}); one that went
 * Hidden from a side that saw it gets {how: 'hide'}; one that dropped out of its sight any other way (its eyes walked on,
 * a door shut, a watcher fell) gets {how: 'lost', at: where that side last saw it}. skip: the unit whose walk carries
 * its own sight (moveFx). why: the reason for a unit's change (a reveal or a hide; cb.sightWhy for changes made where
 * this can't be called). walk: a walker's side's sight step by step: a change its eyes made carries {by, byAt} (the
 * walker and its tile then), so the client plays it on that step of the walk. The first check of a fight (or an old
 * save) only records. Never reads or changes a rule; no dice.
 */
export function sightFx(cb: Combat, skip?: string | null, why: Record<string, 'hide' | 'reveal'> = {}, walk?: WalkSight) {
  if (SIGHT_MUTE) return;
  const was = cb.sightSeen, wasAt = cb.sightPos || {}, now = { pc: seenIds(cb, 'pc'), foe: seenIds(cb, 'foe') };
  const because = { ...(cb.sightWhy || {}), ...why }; delete cb.sightWhy;
  const unitOf = (id: string) => cb.units.find((x) => x.id === id);
  cb.sightSeen = now;
  cb.sightPos = { pc: Object.fromEntries(now.pc.map((id) => [id, unitOf(id)!.pos])), foe: Object.fromEntries(now.foe.map((id) => [id, unitOf(id)!.pos])) };
  if (!was || cb.over) return;
  for (const side of ['pc', 'foe'] as const) {
    const before = new Set(was[side] || []), after = new Set(now[side]), w = walk && walk.side === side ? walk : null;
    const step = (id: string, inSight: boolean) => { const at = w ? walkStep(w, id, inSight) : null; return at ? { by: w!.by, byAt: at } : {}; };
    for (const id of now[side]) if (!before.has(id) && id !== skip) { const t = unitOf(id)!; emitFx(cb, 'sight', { unit: id, at: t.pos, how: because[id] === 'reveal' ? 'reveal' : 'enter', only: side, ...(because[id] ? {} : step(id, true)) }); }
    for (const id of before) {
      if (after.has(id) || id === skip) continue;
      const t = unitOf(id); if (!t || t.dead) continue;
      if (because[id] === 'hide') emitFx(cb, 'sight', { unit: id, at: t.pos, how: 'hide', only: side });
      else { const at = wasAt[side]?.[id]; if (at) emitFx(cb, 'sight', { unit: id, at, how: 'lost', only: side, ...step(id, false) }); }
    }
  }
}
/** Note every hostile the party sees now in cb.sighted (it only grows; old saves start it here). */
export function noteSighted(cb: Combat) {
  if (cb.over) return;
  const seen = visibility(cb, 'pc').seen, had = cb.sighted || [], add = [...seen].filter((id) => !had.includes(id));
  if (add.length || !cb.sighted) cb.sighted = [...had, ...add];
}
/** Does anyone on the attacker's side see the target? */
export function sideSees(cb: Combat, side: 'pc' | 'foe', tgt: Unit, by?: Unit | null): boolean {
  const base = !(tgt.hidden && tgt.side !== side) && cb.units.some((u) => u.side === side && unitSees(cb, u, tgt.pos));
  return sightHooked(cb) ? seesHook(cb, side, tgt, by || null, base, false).seen : base;
}

// ---------- attacks ----------
export const isMelee = (w: WeaponDef) => /melee|unarmed/.test(w.category);
/** A weapon a melee strike is made with: a melee weapon, or one whose rules 1.12 system is melee though its category isn't
 * (the Evoker blade, the Emanator gauntlet, the banner, the grand staff). Any other weapon strikes in melee as fists. */
export const meleeArm = (w: WeaponDef) => isMelee(w) || (w as any).phys?.system === 'melee';
/** What an attack is made with. A melee-mode attack with a weapon that has no melee side is made with the fists; so is
 * one by a unit that is Disarmed or whose weapon is lowered (the conditions forbid weapon attacks: rules 1.12, whatever
 * put the condition there). Ranged and thrown attacks keep the weapon here: previewAttack refuses those itself. */
export const strikeWeapon = (att: Unit, mode: string): WeaponDef => {
  const w = WEAPON[att.weapon];
  return mode === 'melee' && (!meleeArm(w) || (w !== WEAPON.fists && (condOn(att, 'disarmed') || condOn(att, 'lowered')))) ? WEAPON.fists : w;
};
/** A unit's armour as it is worn: what it shows now plus what a Break (rules 1.12, Blunt) is holding at 0 for a round. */
export const effectiveArmour = (u: Unit): number => u.armour + (u.tech?.break?.cut ?? 0);
/** Set the armour a unit wears. Under a Break the change goes to what the Break gives back (the armour stays 0 now). */
export function setEffectiveArmour(u: Unit, n: number): void {
  const br = u.tech?.break; n = Math.max(0, n);
  if (br && br.cut != null) br.cut = n; else u.armour = n;
}
export const weaponDamage = (w: WeaponDef, range: number, rawPower = 0) =>
  typeof w.damage === 'number' ? w.damage : w.damage?.within_4 ? (range <= 4 ? w.damage.within_4 : w.damage.within_8) : w.id === 'recurve_bow' ? 20 + 5 * rawPower : 20;
export const attackApCost = (w: WeaponDef, mode: string) => (isMelee(w) ? (w.category.startsWith('heavy') ? 3 : 2) : mode === 'aimed' ? 3 : (w.ap_cost.single ?? 2));
export const effectiveRange = (w: WeaponDef) => (typeof w.range_tiles === 'number' ? w.range_tiles : 8);

const ENCORE_PLAIN: Record<string, string> = { shot: 'combat/attack:shot', aimed_shot: 'combat/attack:aimed', cut: 'combat/attack:melee', overwatch: 'combat/overwatch' };
/** Encore's key for an action: its type and what it is (a perk's id, an attack's mode, a move's kind…), never its
 * target. Prayers, ending the turn and declining a window can't be repeated (null). */
export function encoreKey(a: any): string | null {
  const t = String(a?.type || ''); if (!t.startsWith('combat/') || ['combat/pray', 'combat/end-turn', 'combat/decline'].includes(t)) return null;
  // Rules 1.12: a free technique is the plain action it stands for (Shot is the shot, Aimed Shot the aimed shot, Cut the
  // melee attack, Overwatch the overwatch), so either one repeats the other. Any other technique is itself, by its id.
  if (t === 'combat/technique') { const plain = ENCORE_PLAIN[String(a.id)]; return plain || 'combat/technique:' + String(a.id || ''); }
  const what = t === 'combat/attack' ? a.mode || 'shot' : t === 'combat/move' ? a.how || 'move' : a.id ?? a.word ?? a.design ?? a.item ?? a.kind ?? a.hand ?? '';
  return t + (what ? ':' + what : '');
}
/** Encore's lend for an action not yet taken (item 729; item 737): the AP the unit may count on top of its own when
 * this action repeats its Encore (0 otherwise). The previews (attacks here, moves and perks in the client) add it, so a
 * repeat with too little AP isn't shown as "Needs N AP". Never inside the reducer's own action (cb.acting): there
 * encoreBefore has already lent it, and a perk's inner attack mustn't borrow it. */
export function encoreCredit(u: Unit | null | undefined, a: any, cb?: Combat | null): number {
  if ((cb as any)?.acting) return 0;
  const brief = a?.type === 'combat/end-turn' ? 0 : briefCredit(u, cb); // rules 1.13: a Brief's discount is lent the same way (calls/rules.ts)
  const en = u?.faith?.encore; if (!en || encoreKey(a) !== en.key) return brief; return (en.ap || 0) + brief;
}
/** One term of a to-hit sum or a damage chain, for the transparent breakdown (spec: dice are transparent). */
export interface Term { v: number; label: string }
export interface AttackPreview { ok: boolean; why?: string; ap: number; toHit: number; need: number; pct: number; cover: number; coverTile?: string | null; rangePenalty: number;
  /** Every to-hit term by name (skill, weapon, range, Heat, cover, perks…): they sum to toHit. */
  terms?: Term[];
  /** The damage a hit would do before the target's armour: base, then each multiplier and flat add by name. */
  dmg?: { base: number; terms: Term[]; mults: Term[]; total: number; crit: number; pierce: number; armour: number } }
/** 'thrown' (rules 1.12): the held weapon is thrown: a ranged attack at throwing range with line of sight and cover,
 * whatever the weapon is; no rounds, Heat or Recoil. Only a technique makes one (physical/core.ts strike). */
export type AttackMode = 'shot' | 'aimed' | 'melee' | 'burst' | 'auto' | 'thrown';
export function previewAttack(cb: Combat, att: Unit, tgt: Unit, mode: AttackMode, opts: { extra?: number; free?: boolean; noRecoil?: boolean; /** the attack is an ambush whatever the attacker's Hidden state (a technique's: its damage shows the Ambush multiplier) */ ambush?: boolean } = {}): AttackPreview {
  const w = WEAPON[att.weapon], melee = mode !== 'thrown' && (isMelee(w) || mode === 'melee'), useW = strikeWeapon(att, mode);
  const fx: any = (w as any).grants?.effect || {};
  const ap0 = opts.free ? 0 : mode === 'burst' ? 3 : mode === 'auto' ? (fx.op === 'auto_ap' ? fx.value : 4) : mode === 'aimed' && fx.op === 'aimed_ap' ? fx.value : attackApCost(useW, mode === 'aimed' ? 'aimed' : mode === 'melee' ? 'melee' : 'shot');
  const baseReach = melee ? (useW.properties?.includes('reach_2') || useW.id === 'lance' || (mode === 'melee' && (useW as any).phys?.props?.includes('reach')) || (useW === w && fx.op === 'reach') ? (fx.op === 'reach' && useW === w ? fx.value : 2) : 1) : 0; // rules 1.12: the Reach property, for a melee strike
  // Items see the attack before it is checked: AP (ctx.ap), reach (ctx.reach), cover (ctx.ignoreCover), extra to-hit
  // terms (ctx.terms), or a refusal (ctx.fail). ctx.preview is true: handlers must not change state here.
  const hk: any = { att, tgt, mode, melee, ap: ap0, reach: baseReach, ignoreCover: false, terms: [] as Term[], fail: null as string | null, free: !!opts.free, noRecoil: !!opts.noRecoil, volley: VOLLEY, preview: true, cb, mods: cb.mods || [], seeVeil: false, noLos: false, coverTile: null as string | null, coverWhy: '', ignoreTaunt: false, bandsLess: 0 };
  emit(cb, 'attack_preview', hk);
  const ap = opts.free ? 0 : Math.max(0, hk.ap);
  const fail = (why: string): AttackPreview => ({ ok: false, why, ap, toHit: 0, need: 0, pct: 0, cover: 0, rangePenalty: 0 });
  if (!alive(tgt) && !tgt.downed) return fail(tgt.surrendered ? tgt.name + ' has surrendered.' : 'Target is out of the fight.');
  if (hk.fail) return fail(hk.fail);
  // Conditions on the attacker (spec: Conditions): Afraid can't attack its source; Taunted must attack the taunter while
  // it can see them; Disarmed or a lowered weapon attacks with nothing but fists.
  { const fs = condSource(att, 'fear'); if (fs && fs === tgt.id) return fail('Afraid of ' + tgt.name + ': you can\'t attack them.'); }
  { const ts = condSource(att, 'taunted'), tu = ts ? cb.units.find((x) => x.id === ts) : null; if (tu && tu.id !== tgt.id && !hk.ignoreTaunt && alive(tu) && sideSees(cb, att.side, tu)) return fail('Taunted: your attack must go at ' + tu.name + '.'); }
  if ((condOn(att, 'disarmed') || condOn(att, 'lowered')) && useW !== WEAPON.fists && !isMelee(useW)) return fail(condOn(att, 'disarmed') ? 'Disarmed: recover your weapon (2 AP), or strike with your fists.' : 'Your weapon is lowered: raise it (1 AP).');
  if ((condOn(att, 'disarmed') || condOn(att, 'lowered')) && isMelee(useW) && useW !== WEAPON.fists && mode !== 'melee') return fail('Disarmed: recover your weapon first.');
  if (att.ap + encoreCredit(att, { type: 'combat/attack', mode }, cb) < ap) return fail('Needs ' + ap + ' AP.'); // Encore lends it (item 737)
  if ((mode === 'burst' || mode === 'auto') && !(w.modes || []).includes(mode)) return fail('This weapon has no ' + (mode === 'auto' ? 'full auto' : 'burst') + '.');
  // An ally (friendly fire) needs this unit's own sight; the squad's shared sight covers the other side.
  if (tgt.side === att.side ? !(unitSees(cb, att, tgt.pos) || (sightHooked(cb) && seesHook(cb, att.side, tgt, att, false, false).seen)) : !sideSees(cb, att.side, tgt, att)) return fail('You can\'t see it.');
  const thrown = mode === 'thrown';
  if (!melee && !thrown && att.maxDur && (att.dur ?? 1) <= 0) return fail('Broken: Field Repair first.');
  if (!melee && (w.properties || []).includes('requires_braced_or_prone') && !att.braced && !att.prone) return fail('Brace it first (1 AP), or go prone.');
  const r = dist(att.pos, tgt.pos);
  if (melee && r > hk.reach) return fail('Out of melee reach.');
  if (!melee && !thrown && att.jammed) return fail('Weapon jammed: clear it (2 AP).');
  if (!melee && !thrown && w.magazine != null && att.ammo <= 0) return fail('Empty: reload (2 AP).');
  if (thrown && r > throwRangeOf(att)) return fail('Out of throwing range (' + throwRangeOf(att) + ' tiles).');
  // hk.noLos: an indirect shot over full cover (Lob with an Arc weapon, rules 1.12): someone on the side must still see the target
  if (!melee && !hk.noLos && !lineOfSight(cb, att.pos, tgt.pos, !!hk.seeVeil)) return fail('No line of sight.');
  const eff = effectiveRange(useW), optic = hasMod(att.mods, 'mod_red_dot') || (hasMod(att.mods, 'mod_scope') && mode === 'aimed') ? 1 : 0, bands = melee || thrown ? 0 : Math.max(0, Math.ceil(r / eff) - 1 - optic - Math.max(0, hk.bandsLess || 0)); // hk.bandsLess: range bands an item or technique ignores (Bead, Spot)
  if (bands > 2) return fail('Out of range.');
  // hk.coverTile: an item names a half-cover tile that protects the target although it doesn't face the shot (Eyes in
  // the Back): it counts as the cover, so a miss by its margin hits it.
  const facing = melee ? null : coverTileFor(cb, att.pos, tgt.pos), coverTile0 = facing || hk.coverTile || null, coverTile = hk.ignoreCover || (useW.properties || []).includes('ignores_half_cover') ? null : coverTile0, cover = coverTile ? 5 : 0;
  const rangePenalty = -2 * bands;
  const heat = melee || thrown || !w.heat_limit ? 0 : -Math.floor(att.heat / 2);
  const prone = tgt.prone ? (melee ? 2 : -2) : 0, unbraced = !melee && (w.properties || []).includes('minus2_to_hit_unless_emplaced') && !att.braced && !att.prone ? -2 : 0;
  const skillBonus = useW !== w ? 0 : (fx.op === 'hit_bonus' && r <= fx.within ? fx.value : 0) + (fx.op === 'first_shot_bonus' && !att.firstShotDone ? fx.value : 0)
    + (fx.op === 'aimed_still_bonus' && mode === 'aimed' && !att.moved ? fx.value : 0) + (fx.op === 'braced_bonus' && att.braced ? fx.value : 0) + (hasMod(att.mods, 'mod_scope') && mode === 'aimed' ? 1 : 0);
  const T = (v: number, label: string) => (v ? [{ v, label }] : []);
  // Recoil (spec: Modifiers): −1 per earlier shot this turn, less floor(Dexterity ÷ 2); halved braced or Emplaced; bows
  // and guns marked no_recoil have none; the compensator takes 1 off each shot.
  const recoil = melee || thrown || mode === 'auto' || opts.noRecoil || hk.noRecoil || (useW.properties || []).includes('no_recoil') ? 0
    : -Math.max(0, (att.shotsThisTurn || 0) * (hasMod(att.mods, 'mod_compensator') ? 0 : 1) - Math.floor((att.dexterity || 0) / 2));
  const recoilT = weaponBraced(att) || condOn(att, 'emplaced') ? Math.ceil(recoil / 2) : recoil;
  const emplaced = !melee && condOn(att, 'emplaced') ? 2 : 0;
  const skillCond = condSkillMod(att, useW.skill);
  const terms: Term[] = [...T(att.attack, 'skill'), ...T(att.song || 0, 'song'), ...T(skillBonus, (w as any).grants?.name || 'weapon skill'), ...T(useW.accuracy || 0, 'weapon accuracy'),
    ...T(mode === 'aimed' ? 2 : 0, 'aimed'), ...T(mode === 'auto' ? -2 : 0, 'full auto'), ...T(opts.extra || 0, 'volley'), ...T(rangePenalty, 'range'), ...T(heat, 'Heat'), ...T(armPenalty(att, useW), 'injured arm'),
    ...T(tgt.downed ? 2 : 0, 'target Downed'), ...T(prone, 'target prone'), ...T(unbraced, 'not braced'), ...T(-cover, !facing && hk.coverWhy ? 'half cover (' + hk.coverWhy + ')' : 'half cover'), ...T(condHit(att, tgt, cb), 'conditions'),
    ...T(recoilT, 'recoil'), ...T(emplaced, 'emplaced'), ...T(skillCond, 'brain debuff'), ...T(levelGap(att, tgt, cb) * ENEMY_LEVELS.gap.to_hit_per_level, 'level gap'), ...(hk.terms as Term[]).filter((t) => t && t.v)];
  if (hk.ignoreCover && coverTile0) terms.push({ v: 0, label: 'cover ignored' });
  if (farBelow(tgt, att, cb)) terms.push({ v: 0, label: 'far below your level: any hit takes it out' }); // rules 1.15
  const toHit = terms.reduce((t, x) => t + x.v, 0);
  const pct = Math.max(5, Math.min(95, (21 - (tgt.def - toHit)) * 5));
  const who = charFor(att);
  return { ok: true, ap, toHit, need: tgt.def, pct, cover, coverTile, rangePenalty, terms, dmg: attackDamage(cb, att, tgt, mode, who, { preview: true, ambush: !!opts.ambush && tgt.side !== att.side }) };
}
/** The live character behind a PC unit, when a game is bound (multipliers come from it). */
const charFor = (u: Unit): Character | null => { const G = boundGameRef(); return (u.charId && G?.characters?.[u.charId]) || null; };

/** The damage a hit does before armour, with every multiplier named (spec: Attacks, damage and armour). Items add
 * through the 'damage_out' hook {att, tgt, mode, melee, src, base, add, mults: Term[], vs: Term[], crit, preview}:
 * flat adds, situational self-multipliers (mults, multiplicative) and target-specific bonuses (vs: fractions that add
 * together and are capped at +100%, plan 6a-1; stackDamage). Special ammo (rules.json ammo_types), the Ambush
 * multiplier, Weakened and the target's Critical damage taken are applied here. */
export function attackDamage(cb: Combat, att: Unit, tgt: Unit, mode: AttackMode, who: Character | null, o: { crit?: boolean; dmgMult?: number; preview?: boolean; ambush?: boolean } = {}) {
  const w = WEAPON[att.weapon], melee = mode !== 'thrown' && (isMelee(w) || mode === 'melee'), useW = strikeWeapon(att, mode);
  const fx: any = useW === w ? (w as any).grants?.effect || {} : {};
  const worn = att.maxDur ? (att.dur ?? att.maxDur) <= att.maxDur * 0.25 : false;
  const bayonet = melee && useW === WEAPON.fists && hasMod(att.mods, 'mod_bayonet');
  const ammo = !melee && useW === w ? AMMO_TYPES[ammoId(att.ammoType) || ''] || null : null;
  const base = bayonet ? 15 : weaponDamage(useW, dist(att.pos, tgt.pos), who?.skills.raw_power || 0) + (useW.category === 'unarmed' ? att.unarmedBonus || 0 : 0) + (melee && useW === w && hasMod(att.mods, 'mod_weighted') ? 3 : 0) - (!melee && hasMod(att.mods, 'mod_suppressor') ? 2 : 0);
  const mults: Term[] = [], vs: Term[] = [];
  const M = (v: number, label: string) => { if (v !== 1) mults.push({ v, label }); };
  M(who ? weaponMult(who, useW.id) : 1, weaponMultLabel(useW.id)); M(!who && att.lvlDmg ? att.lvlDmg : 1, att.tier ? 'tier and level' : 'level'); M(useW === w ? att.dmgMult || 1 : 1, 'rarity'); M(o.dmgMult || 1, 'weapon skill'); // rules 1.12: the first multiplier follows the weapon's scales_with
  if (melee && useW === w && att.maxDur) M((att.dur ?? 1) <= 0 ? 0.5 : worn ? 0.9 : 1, (att.dur ?? 1) <= 0 ? 'broken' : 'worn');
  if (ammo?.damage_mult) M(ammo.damage_mult, ammo.id.replace(/_/g, '-') + ' rounds');
  // Rules 1.15: a critical is ×1.5 (an enemy's too), to ×2.0 at most with everything together. An item adds to it through
  // ctx.critBonus in 'damage_out' (One Shot's Breath Held); the ceiling is applied after the items have spoken.
  const critOf = (bonus: number) => 1 + (Math.max(CRIT_BASE, Math.min(CRIT_MAX, (who ? critMult(who) : CRIT_BASE) + bonus)) - 1) * (1 - Math.min(1, Math.max(0, tgt.critTaken || 0)));
  let critM = critOf(0); const critTerm: Term = { v: critM, label: 'critical' };
  if (o.crit) mults.push(critTerm);
  if (o.ambush) M(att.ambushMult || 1.5, 'ambush');
  if (condOn(att, 'weakened')) M(0.75, 'Weakened');
  if (condOn(att, 'sharpened')) M(1.25, 'Sharpened'); // SHARPEN (rules 1.4)
  if (fx.op === 'vs_status_damage' && ((tgt.bleed && fx.statuses.includes('bleeding')) || (tgt.dazedNext && fx.statuses.includes('dazed')) || (tgt.downed && fx.statuses.includes('downed')))) M(fx.mult, (w as any).grants?.name || 'weapon skill');
  const src = { by: att, type: 'weapon', melee, ranged: !melee, crit: !!o.crit, mode, weapon: useW.id, dmgType: damageTypeOf(useW, useW === w ? att.ammoType : null), explosive: isExplosive(useW), ambush: !!o.ambush, ammo: ammo?.id || null };
  // pierce / ignoreArmour: armour this attack ignores, set by a listener (a technique's strike, rules 1.12)
  const ctx: any = { att, tgt, mode, melee, src, base, add: 0, mults, vs, crit: !!o.crit, preview: !!o.preview, cb, mods: cb.mods || [], pierce: 0, ignoreArmour: false, critBonus: 0 };
  emit(cb, 'damage_out', ctx);
  if (ctx.critBonus) { critM = critOf(ctx.critBonus); critTerm.v = critM; }
  const st = stackDamage(mults, vs);
  if (vs.length) mults.push({ v: Math.round(st.vsMult * 100) / 100, label: 'against this target (' + vs.map((x) => x.label).join(', ') + (vs.reduce((t, x) => t + x.v, 0) > VS_CAP ? '; capped at ×2' : '') + ')' });
  const total = (base + ctx.add) * st.total;
  const props = useW.properties || [];
  const ignoreAll = !!ctx.ignoreArmour || props.includes('ignores_armour') || !!ammo?.ignores_armor || fx.op === 'ignore_armour' && fx.value >= 99;
  const pierce = (ctx.pierce || 0) + (fx.op === 'ignore_armour' ? fx.value : 0) + (props.includes('armor_ignore_5') ? 5 : 0) + (props.includes('armor_ignore_10') || props.includes('ignores_10_armour') ? 10 : 0);
  const armour0 = Math.max(0, tgt.armour * (ammo?.armor_mult || 1) - pierce), armour = ignoreAll ? 0 : armour0;
  return { base, terms: ctx.add ? [{ v: ctx.add, label: 'perks (flat)' }] : [], mults, vs, total, crit: critM, pierce, armour, src };
}

/** A party crit for the spotlight (decision 113; spotlight.ts critMoment): a player's character or a companion lands a
 *  critical hit (a weapon attack, or a damaging Sigil or Outburst spell) on the other side. The first of an action is
 *  kept, with the fx number it came at. Presentation only: no rule reads it. */
export function noteCrit(cb: Combat, by: Unit | null | undefined, tgt: Unit | null | undefined, via: 'weapon' | 'sigil' | 'outburst') {
  if (!by || !tgt || tgt.side === by.side || !(by.charId || by.companion)) return;
  const notes = (cb.critNotes ||= []); if (notes.length >= 4) return;
  notes.push({ unit: by.id, target: tgt.id, via, n: cb.fxSeq || 0 });
}
export interface AttackResult { roll: number; total: number; vs: number; hit: boolean; crit: boolean; fumble: boolean; damage: number; line: string; killed: boolean; refused?: string;
  /** The attack was called and paid for but never made: a reaction to it took the attacker out, or cancelled it (a held shot that lands first, rules 1.12). */ cancelled?: boolean }
export type AttackOpts = { extra?: number; free?: boolean; noAp?: boolean; dmgMult?: number; noWear?: boolean; noCone?: boolean; quiet?: boolean;
  /** an ambush whatever the attacker's Hidden state (rules 1.12: Draw Cut's Light line, Ambush): criticals on 19-20, the Ambush multiplier, and everything that reads an ambush */ ambush?: boolean;
  /** the technique this attack is a strike of, when it isn't one of the plain attacks (physical/core.ts leaves the free ones out: Cut, Shot, Aimed Shot, Overwatch). A weapon's old on-hit grant fires only on a plain attack */ tech?: string;
  /** this hit gives the attacker no Momentum: a technique's strike that isn't the plain attack (the rework, 10 Nov 2026: only a plain melee attack's hit gives 1) */ noMomentum?: boolean;
  /** fields added to the shot's effects event (a technique's id and roll index: presentation only) */ fx?: Record<string, any> };
/** The skill a weapon's conditions are delivered by (rules 1.13): the skill it hits with. Melee blows Raw Power; shots,
 * light blades and throws Dexterity. */
export const weaponVia = (att: Unit, mode: string): string => strikeWeapon(att, mode)?.skill || 'raw_power';
export function resolveAttack(cb: Combat, rng: Rng, att: Unit, tgt0: Unit, mode: AttackMode, who: Character | null, opts: AttackOpts = {}): AttackResult {
  // Whatever this attack puts on someone (a weapon's rider, a perk's on-hit) is delivered by the weapon's skill.
  return withVia(att, weaponVia(att, mode), () => resolveAttackInner(cb, rng, att, tgt0, mode, who, opts));
}
function resolveAttackInner(cb: Combat, rng: Rng, att: Unit, tgt0: Unit, mode: AttackMode, who: Character | null, opts: AttackOpts): AttackResult {
  // Items may redirect an attack (a grappled shield, a judged foe's blow): 'attack_target' {att, tgt, mode} (tgt mutable).
  // Confused (spec): each attack has a 50% chance to go at someone at random (anyone else it could attack).
  if (condOn(att, 'confused') && die(rng, 2) === 1) {
    const pool = cb.units.filter((v) => v !== att && v !== tgt0 && !v.dead && !v.surrendered && previewAttack(cb, att, v, mode, { free: true }).ok);
    if (pool.length) { const pick = pool[die(rng, pool.length) - 1]; cb.log.push(att.name + ' is Confused: the attack goes at ' + pick.name + ' instead.'); tgt0 = pick; }
  }
  // ctx.locked: an item that keeps the attack on its first target whatever redirects it (Rabbit's Foot's hunters).
  const at: any = emit(cb, 'attack_target', { att, tgt: tgt0, orig: tgt0, mode, volley: VOLLEY, vi: (opts as any).vi ?? 0, free: !!(opts.free || opts.noAp), cb, rng, mods: cb.mods || [], locked: null, cancel: false, why: '' }), tgt: Unit = at.locked || at.tgt || tgt0;
  // A reaction to the attack being called (a held shot that lands first: 'attack_target' may set ctx.cancel, or take the
  // attacker out) ends it here: its AP is spent, nothing is rolled.
  if (at.cancel || att.dead || att.downed || att.surrendered) {
    if (alive(att) && !opts.free && !opts.noAp) { const pv0 = previewAttack(cb, att, tgt, mode, { extra: opts.extra }); if (pv0.ok) att.ap -= pv0.ap; }
    const line = '(' + att.name + '\'s attack on ' + tgt.name + ' never comes' + (at.why ? ': ' + at.why : '') + '.)'; cb.log.push(line);
    return { roll: 0, total: 0, vs: 0, hit: false, crit: false, fumble: false, damage: 0, line, killed: false, cancelled: true };
  }
  if (!who) who = charFor(att);
  if (att.companion) who = null; // a companion fights with its own numbers
  const pv = previewAttack(cb, att, tgt, mode, { extra: opts.extra, free: opts.free || opts.noAp, noRecoil: !!opts.noAp });
  // A shot the preview refuses is never rolled (a refused preview carries need 0, which every roll but a 1 would beat):
  // no AP, ammo, wear or dice are spent, and the log says why. Volleys (burst, full auto, weapon skills) rely on this.
  if (!pv.ok) {
    const line = '(' + att.name + ' can\'t attack ' + tgt.name + ': ' + pv.why + ')';
    cb.log.push(line);
    return { roll: 0, total: 0, vs: 0, hit: false, crit: false, fumble: false, damage: 0, line, killed: false, refused: pv.why };
  }
  const w = WEAPON[att.weapon], melee = mode !== 'thrown' && (isMelee(w) || mode === 'melee'), useW = strikeWeapon(att, mode);
  const attAt = att.pos, tgtAt = tgt.pos;
  att.ap -= pv.ap;
  if (att.mg) calmFight(cb, att); // rules 1.5, calming the heart: the first weapon attack of your turn eases 1 Strain
  const fx: any = useW === w ? (w as any).grants?.effect || {} : {};
  const worn = att.maxDur ? (att.dur ?? att.maxDur) <= att.maxDur * 0.25 : false;
  // The die, then items: 'attack_roll' {att, tgt, mode, die, toHit, need, critMin, noFumble, hit?} (die may be rerolled,
  // critMin lowered; set hit to force the result).
  // An ambush (spec: attacks from Hidden crit on 19-20 and use the Ambush multiplier): the first attack of each Hidden entry.
  const hiddenAmbush = ambushReady(att), ambush = (hiddenAmbush || !!opts.ambush) && tgt.side !== att.side;
  if (ambush && hiddenAmbush) att.ambushUsed = att.hideEntry || 1; // only an ambush from Hidden uses the entry's
  const rc: any = { att, tgt, mode, die: d20(rng), toHit: pv.toHit, need: pv.need, critMin: Math.min(mode === 'aimed' ? (fx.op === 'aimed_crit_min' ? fx.value : 19) : 20, ambush ? 19 : 20), noFumble: false, ambush, hit: undefined as boolean | undefined, volley: VOLLEY, cb, rng, mods: cb.mods || [] };
  emit(cb, 'attack_roll', rc);
  const roll = rc.die, total = roll + pv.toHit;
  const crit = roll === 20 || roll >= rc.critMin, fumble = roll === 1 && !rc.noFumble;
  const hit = rc.hit ?? (!fumble && (crit || total >= pv.need));
  // Tuned (Improvisation 5): the main hand's gun never jams, so its natural 1 is only a miss and its Heat only Heat
  const tuned = !melee && mode !== 'thrown' && canJam(w) && neverJams(cb, att);
  if (mode === 'thrown') { if (fumble) att.stunnedNext = 1; } // a thrown weapon: no round, no Heat, no Recoil for the next shot
  else if (!melee) {
    // A unit with infinite ammo (the drone, item 370) spends no round, takes no Heat and never jams.
    if (w.magazine != null && !att.infiniteAmmo) att.ammo = Math.max(0, att.ammo - 1);
    // A crossbow's shot loads the next bolt as part of it (the "autoload" property; Leon, 10 Nov 2026): from the bolts
    // carried, or freely for a unit whose spares aren't counted. With none left it stays empty.
    if (w.magazine != null && !att.infiniteAmmo && (w.properties || []).includes('autoload') && att.ammo < w.magazine) {
      if (!att.mags) att.ammo = w.magazine;
      else { const take = Math.min(w.magazine - att.ammo, att.loose || 0); if (take > 0) { att.loose = (att.loose || 0) - take; att.ammo += take; } }
    }
    if (w.heat_limit && !att.infiniteAmmo) att.heat += 1; att.shotsThisTurn++;
    // A weapon that can't jam (no Heat limit: bows, the flamer, the breacher tube) fumbles instead: −1 AP next turn (plan 2.9; provisional).
    if (canJam(w) && !att.infiniteAmmo && !tuned) { if (fumble || (worn && roll <= 2) || (w.heat_limit && att.heat >= heatLimit(att, w))) att.jammed = true; }
    else if (fumble && !tuned) att.stunnedNext = 1;
  } else if (fumble) att.stunnedNext = 1;
  // Durability (spec: Weapons v2): every attack wears 1; a jam or fumble 5 more.
  if (att.maxDur && useW === w && !opts.noWear) att.dur = Math.max(0, (att.dur ?? att.maxDur) - 1 - (fumble || att.jammed ? 5 : 0));
  att.firstShotDone = true; att.firstShotTurn = true; att.attackedTurn = true;
  // The event goes out before the hit's consequences (knockback, conditions) so the client plays them in order.
  const ev = emitFx(cb, melee ? 'melee' : 'shot', { unit: att.id, target: tgt.id, from: attAt, to: tgtAt, weapon: useW.id, cat: useW.category, mode, hit, crit, fumble, dmg: 0, killed: false,
    ...(!melee && att.jammed ? { jam: true } : {}), ...(fxChain ? { chain: true } : {}), ...(mode === 'thrown' ? { thrown: true } : {}),
    // the special round or arrow fired (Load Special's, a quiver's): its look on screen
    ...(!melee && mode !== 'thrown' && ammoId(att.ammoType) && ammoId(att.ammoType) !== 'standard' ? { round: ammoId(att.ammoType) } : {}), ...(opts.fx || {}) });
  let damage = 0, killed = false, injury = '';
  if (hit) {
    const d = attackDamage(cb, att, tgt, mode, who, { crit, dmgMult: opts.dmgMult, ambush });
    damage = Math.max(1, Math.floor(d.total) - d.armour);
    const r = applyDamage(cb, tgt, damage, { ...d.src, shield: true, downedFails: crit ? 2 : 1, credit: 'all', nonlethal: (cb.mods || []).includes('nonlethal') } as any);
    damage = r.amount; killed = r.killed;
    if (killed) { ev.dmg = damage; ev.killed = true; fxFell(cb, tgt); }
    if (crit) noteCrit(cb, att, tgt, 'weapon'); // the spotlight's crit (decision 113): presentation only
    if (crit && !tgt.dead && !tgt.downed) injury = rollInjury(rng, tgt, cb, att);
    if (crit && !tgt.dead && melee && hasMod(att.mods, 'mod_serrated') && !immune({ u: tgt }, 'bleed')) { tgt.bleed = 3; injury += ' · Bleeding'; }
    // the weapon's old on-hit grant (armour break, Prone, a push…): on a plain attack only, never next to another technique's own effect (rules 1.12)
    if (!tgt.dead && fx.op === 'on_hit' && !opts.tech) injury += onHit(cb, att, tgt, fx);
    // The Evoker blade's Edge Word (item 487): a hit leaves one glyph free of AP this turn (charge and Flux as usual),
    // drawn on your own tile as any glyph; not on an attack that already drew one (Sword Form: one free glyph an attack).
    if (fx.op === 'edge_word' && att.mg?.evoker && !att.edgeWord && !(att.ps as any)?.['class:blade_scribe.sword_form']?.edge) { att.edgeWord = true; injury += ' · Edge Word: your next glyph this turn costs 0 AP'; }
    if (r.prevented) injury += ' · no damage';
    // Riders (rules 1.3): incendiary rounds and burning weapons set the target Burning (a hit's rider: no save);
    // enhanced rounds and mana arms release bots (+1 on the meter); explosives splash; the flamer's cone.
    if (!tgt.dead && !tgt.surrendered && (AMMO_TYPES[ammoId(att.ammoType) || '']?.applies === 'burning' && !melee || (useW.properties || []).includes('applies_burning'))) injury += applyCond(cb, rng, att, tgt, 'burning', undefined, 'body', { skipSave: true });
    if ((!melee && (AMMO_TYPES[ammoId(att.ammoType) || '']?.meter_per_hit || useW.category === 'mana' || (useW.properties || []).includes('mana_meter_on_hit'))) || (melee && useW === w && useW.category === 'mana')) shiftMana(cb, 1, 'bots released by a hit'); // a mana arm releases bots on a melee technique's hit too
  }
  if (hit && radiusOf(useW) && useW.category !== 'thrown') injury += splash(cb, att, tgt, useW, damage);
  // Momentum (spec: Melee): +1 for a plain melee attack that hits (a swing with any melee weapon, fists included). A
  // technique's strike gives none (opts.noMomentum, from physical/core.ts): Strikes and Openers spend it.
  if (hit && melee && !opts.noMomentum && att.resMax?.momentum != null) resGain(att, 'momentum', 1);
  if (ambush) injury += ' · AMBUSH';
  if (att.hidden && !isSilent(att) && !opts.quiet) injury += reveal(cb, att, 'attacked'); // quiet: a held shot that keeps its shooter Hidden (physical/, Dead to Rights)
  if (condSource(att, 'taunted') === tgt.id) endCond(att, 'taunted', cb);
  if (condOn(att, 'sharpened')) endCond(att, 'sharpened', cb); // spent on this attack
  // A shot that misses only because of half cover's −5 hits the cover (spec: Cover).
  const stopped = !hit && !fumble && !!pv.coverTile && total + pv.cover >= pv.need;
  ev.dmg = damage; ev.killed = killed; if (stopped) ev.cover = pv.coverTile;
  if (hit && tgt.downed && !killed) ev.downedHit = true;
  if (stopped) injury = ' · stopped by cover' + damageCover(cb, pv.coverTile!, weaponDamage(useW, dist(att.pos, tgt.pos), who?.skills.raw_power || 0) * (who ? weaponMult(who, useW.id) : 1) * (fx.op === 'cover_damage_mult' ? fx.value : 1), 0, att);
  const verb = melee ? 'strikes' : mode === 'thrown' ? 'throws the ' + useW.name.toLowerCase() + ' at' : mode === 'aimed' ? 'takes an aimed shot at' : 'fires at';
  const line = att.name + ' ' + verb + ' ' + tgt.name + ': d20 ' + roll + ' ' + (pv.toHit >= 0 ? '+' : '−') + Math.abs(pv.toHit) + (pv.cover ? ' (incl. −5 cover)' : '') + ' = ' + total + ' vs ' + pv.need +
    (fumble ? (tuned ? ' · natural 1, a miss; the weapon doesn\'t jam (Tuned)' : melee || !canJam(w) ? ' · fumble, −1 AP next turn' : ' · natural 1, the gun jams') : hit ? (crit ? ' · CRITICAL, ' : ' · hit, ') + damage + ' damage' + (killed ? (tgt.side === 'foe' ? ' · down for good' : ' · Downed') : '') + injury : ' · miss' + injury);
  cb.log.push(line);
  // After the line: 'on_hit' {att, tgt, mode, dmg, crit, killed} or 'on_miss' {att, tgt, mode, die, fumble} (a shot cover stopped is neither).
  if (hit) emit(cb, 'on_hit', { att, tgt, mode, dmg: damage, crit, killed, melee, volley: VOLLEY, cb, rng, mods: cb.mods || [] });
  else if (!stopped) emit(cb, 'on_miss', { att, tgt, mode, die: roll, fumble, melee, volley: VOLLEY, stopped: false, cb, rng, mods: cb.mods || [] });
  // The flamer's cone (cone_3): everyone else in a 3-tile cone toward the target gets the same attack, each its own roll.
  if ((useW.properties || []).includes('cone_3') && !opts.noCone) for (const v of coneUnits(cb, att.pos, tgtAt, 3)) if (v !== tgt && v !== att && !v.dead && !v.surrendered && previewAttack(cb, att, v, mode, { free: true }).ok) chained(() => resolveAttack(cb, rng, att, v, mode, who, { noAp: true, noWear: true, noCone: true, ...(opts.fx ? { fx: opts.fx } : {}) }), 'cone');
  return { roll, total, vs: pv.need, hit, crit, fumble, damage, line, killed };
}

/** Units in a cone of length n from a tile toward another (the same test as the Sigil cone: within n tiles, within
 * about 45 degrees of the line). */
export function coneUnits(cb: Combat, from: string, toward: string, n: number): Unit[] {
  const [fx, fy] = xy(from), [tx, ty] = xy(toward), dx = tx - fx, dy = ty - fy, dl = Math.hypot(dx, dy) || 1;
  return cb.units.filter((v) => { const [vx, vy] = xy(v.pos), ax = vx - fx, ay = vy - fy, l = Math.hypot(ax, ay); return l > 0 && l <= n + 0.5 && (ax * dx + ay * dy) / (l * dl) >= 0.7; });
}
/** An explosive weapon's hit splashes everyone else within its radius of the target, and the cover there, credited to
 * the shooter (rules 1.3; provisional): the hit's damage before the target's armour, less each one's armour. */
function splash(cb: Combat, att: Unit, tgt: Unit, w: WeaponDef, dealt: number): string {
  const r = radiusOf(w), raw = weaponDamage(w, dist(att.pos, tgt.pos)); let out = '';
  for (const v of cb.units) if (v !== tgt && !v.dead && !v.surrendered && dist(v.pos, tgt.pos) <= r) out += hurtUnit(v, raw, false, cb, 'explosion', att);
  for (const o of [...objectsOf(cb)]) if (o.hp != null && o.hp > 0 && dist(o.pos, tgt.pos) <= r) out += damageObject(cb, o.pos, raw * (((w as any).grants?.effect?.op === 'cover_damage_mult') ? (w as any).grants.effect.value : 1), 0, att);
  void dealt;
  return out;
}
/** A gun's Heat limit for this unit: the weapon's, + items (stat 'heat_limit'; Belt Discipline: hooks gap J1). */
/** Two guns that build Heat share one pool (Leon, 10 Nov 2026): one bar, its limit the two limits added, so there is
 * one number to watch. Either gun's shot adds to it; it cools 2 a turn for each of the two. */
const heatPair = (u: Unit): WeaponDef | null => { const m = WEAPON[u.weapon], o = u.offWeapon ? WEAPON[u.offWeapon] : null; return m && o && m.heat_limit && o.heat_limit ? o : null; };
export const heatLimit = (u: Unit, w: WeaponDef) => { const o = heatPair(u), m = WEAPON[u.weapon]; return (o && (w === m || w === o) ? (m.heat_limit || 0) + (o.heat_limit || 0) : w.heat_limit || 0) + (u.charId || u.held ? statQuery({ u }, 'heat_limit').add : 0); };
/** After a critical: Injury resistance (d100), then a d6 for the location (spec: Injuries). Returns the log suffix.
 * 'injury' {t, d, loc, side, cancel, noDaze, noHalve} fires before it lands (cb given; hooks gap A9): cancel stops
 * it, noDaze/noHalve keep the injury but not its AP or Movement cost. */
export function rollInjury(rng: Rng, t: Unit, cb?: Combat | null, by?: Unit | null): string {
  const resist = t.injResist || 0;
  if (resist > 0) { const r = die(rng, 100); if (r <= resist) return ' · injury resisted (d100 ' + r + ' ≤ ' + resist + '%)'; }
  const d = die(rng, 6), inj = t.injuries || (t.injuries = []);
  const side: 'left' | 'right' = d >= 4 ? (die(rng, 2) === 1 ? 'left' : 'right') : 'left';
  const ij: any = cb ? emit(cb, 'injury', { t, by: by || null, d, loc: d === 1 ? 'head' : d <= 3 ? 'torso' : d === 4 ? 'arm' : 'leg', side, cancel: false, noDaze: false, noHalve: false, why: '', cb, rng }) : { cancel: false };
  if (ij.cancel) return ' · injury turned aside' + (ij.why ? ' (' + ij.why + ')' : '');
  if (d === 1) { if (!ij.noDaze) t.dazedNext = 1; return ' · INJURY (d6 ' + d + '): head' + (ij.noDaze ? '' : ', Dazed'); }
  if (d <= 3) { if (immune({ u: t }, 'bleed')) return ' · INJURY (d6 ' + d + '): torso, no bleeding'; t.bleed = 3; return ' · INJURY (d6 ' + d + '): torso, Bleeding'; }
  if (d === 4) { inj.push({ loc: 'arm', side }); return ' · INJURY (d6 ' + d + '): ' + side + ' arm, −2 to attacks with it'; }
  if (!ij.noHalve && !inj.some((i) => i.loc === 'leg')) t.movement = Math.max(0.5, t.movement / 2);
  inj.push({ loc: 'leg', side });
  return ' · INJURY (d6 ' + d + '): ' + side + ' leg, half Movement';
}

// ---------- turns ----------
/** Start a fight. PCs stand where they stood in the story (pos), enemies where the Narrator put them (at, a grid reference); otherwise the map's start tiles. */
/** sigils: an Evoker and its words (true: the tier's default set; sigils.json enemy_ai), rules 1.4. */
export interface FoeSpec extends FoeTraits { name: string; tier: string; weapon: string; at?: string; hp?: number; sigils?: string[] | true;
  /** A caster archetype from enemies.json `casters` (its words and spell bias; sigils, if given, wins). Rules 1.4, ai-sigil.ts. */ caster?: string;
  /** Rules 1.9: what it drops when it dies (loot.ts; already cleaned by the caller). */ drops?: import('./loot').Drops;
  /** Rules 1.15: this enemy's own level (1 to 20); without it, the fight's. */ level?: number;
  /** Numbers pinned by hand (tests and tools: the engine's own fights never set it): the unit takes these, has no level,
   * deals plain weapon damage and stands outside the level gap, as a unit from a fight saved before rules 1.15 does. */
  fixed?: { hp: number; defense: number; attack_bonus: number; armour: number } }
/** Rules 1.15: the level of a fight for these characters: their average level, rounded down, moved by `shift` (the
 * Narrator's −3 to +2). A `level` given outright (a campaign file, a human Narrator) is the fight's level as it stands:
 * no shift is added to it. Always 1 to 20. */
export function fightLevel(chars: { level: number }[], o: { level?: unknown; shift?: unknown } = {}): number {
  const set = levelGiven(o.level); if (set != null) return set;
  const sh = Number(o.shift), lim = ENEMY_LEVELS.narrator_shift;
  return clampEnemyLevel(fightLevelOf(chars.map((c) => c.level)) + (Number.isNaN(sh) ? 0 : Math.max(lim.min, Math.min(lim.max, Math.trunc(sh)))));
}
export function startCombat(name: string, mapId: string | MapDef, pcs: { c: Character; pos?: string; comp?: Record<string, string> }[], foes: FoeSpec[], difficulty: string, rng: Rng, objects?: MapObject[], extra: { fear?: boolean; fromTalk?: boolean; /** rules 1.15: the fight's level outright, or a shift on the squad's */ level?: number | null; levelShift?: number | null } = {}): Combat {
  const map = typeof mapId === 'string' ? MAPS[mapId] || MAPS.rear_pad : mapId;
  const objs = objects ? JSON.parse(JSON.stringify(objects)) as MapObject[] : defaultObjects(map);
  const units: Unit[] = [], taken = new Set<string>(objs.filter(blocksMove).map((o) => o.pos));
  // Out of start tiles (a big squad, a ninth enemy): the free tile nearest that side's start, never one across the map (rules 1.16).
  const anyFree = (near: string | undefined) => nearestFree(map.w, map.h, near || '0,0', (k) => standable(map, k) && !taken.has(k));
  const place = (want: string | null | undefined, fallback: string[]) => { const k = want && standable(map, want) && !taken.has(want) ? want : fallback.find((f) => !taken.has(f)) || anyFree(fallback[0]) || fallback[0]; taken.add(k); return k; };
  const level = fightLevel(pcs.map((x) => x.c), { level: extra.level, shift: extra.levelShift }); // rules 1.15
  pcs.forEach(({ c, pos }) => units.push(unitFromCharacter(c, place(pos, map.pcStart), rng)));
  // Companions (a drone, a beast) stand next to their owner and act right after it (rules 1.3).
  for (const { c, comp } of pcs) { const owner = units.find((x) => x.charId === c.id); if (owner && c.companions?.length) units.push(...companionUnits(null, c, owner, taken, rng, map, comp)); }
  foes.slice(0, Math.max(map.foeStart.length, 8)).forEach((f, i) => {
    const u = unitFromEnemy('foe-' + i, f.name, f.tier, f.weapon, place(f.at ? keyOf(f.at, map) : null, map.foeStart), rng, levelGiven(f.level) ?? level);
    if (f.fixed && ['hp', 'defense', 'attack_bonus', 'armour'].every((k) => Number.isFinite((f.fixed as any)[k])) && f.fixed.hp > 0) { u.init += f.fixed.attack_bonus - u.attack; Object.assign(u, { hp: f.fixed.hp, maxHp: f.fixed.hp, def: f.fixed.defense, armour: f.fixed.armour, attack: f.fixed.attack_bonus, strength: f.fixed.attack_bonus }); delete u.level; delete u.lvlDmg; }
    if (f.hp != null && f.hp > 0) u.hp = Math.min(u.maxHp, Math.round(f.hp)); // wounded in a fight it walked away from
    armFoe(u, f); // an Evoker: its own words, or its caster archetype's (ai-sigil.ts)
    armHeart(u, f); // a Soul caster archetype (enemies.json soul_casters): an Emanator and its designs (ai-soul.ts)
    levelFoeMagic(u); // rules 1.15: its spells grow as its weapon does
    applyFoeTraits(u, { ...f, kind: f.kind || (/drone|robot|automaton|\bbot\b/i.test(f.name) ? 'robot' : /turret/i.test(f.name) ? 'turret' : undefined) });
    if (f.drops && typeof f.drops === 'object') u.drops = JSON.parse(JSON.stringify(f.drops)); // rules 1.9 drop tables
    units.push(u);
  });
  const order = [...units].sort((a, b) => b.init - a.init || b.agility - a.agility).map((u) => u.id);
  const cb: Combat = { name, map, units, order, turn: 0, round: 1, difficulty: COMBAT_XP[difficulty] ? difficulty : 'standard', log: ['Initiative: ' + order.map((id) => { const u = units.find((x) => x.id === id)!; return u.name + ' ' + u.init; }).join(' · ')], over: null, level, ...(extra.fear ? { fear: true } : {}), ...(typeof extra.fromTalk === 'boolean' ? { fromTalk: extra.fromTalk } : {}) };
  cb.objects = objs; cb.sigilV = SIGIL_REV; // a fresh fight: rules 1.4 glyphs only
  // Items at the start of a fight: 'combat_start' {cb, order, rng} (order mutable: act in the surprise round, swap places).
  const cs: any = emit(cb, 'combat_start', { cb, order: [...cb.order], rng });
  if (Array.isArray(cs.order) && cs.order.length === cb.order.length && cs.order.every((id: string) => cb.order.includes(id))) cb.order = cs.order;
  noteFallbacks(cb);
  sightFx(cb); // presentation: who each side sees as the fight opens (recorded; nothing comes "into" sight yet)
  beginTurn(cb, rng);
  { const u0 = active(cb); if (u0 && (u0.skipTurn || (u0.waitRound && cb.round < u0.waitRound))) endTurn(cb, rng); }
  return cb;
}

/** Start the active unit's turn: AP, heat cooldown, Downed death saves (spec: Downed and dying). */
export function beginTurn(cb: Combat, rng: Rng) {
  const u = active(cb);
  if (!u) return;
  // AP (spec: Skills, traits and perks in play): 'turn_start_pre' {u, grants, penalties} collects perk AP ({n, why});
  // turnAp clamps 6 + perk AP (at most +3 a turn) − Stunned − Dazed to 2..9, then takes any debt.
  condSourcesCheck(cb, u); // a grapple whose grappler is gone ends, and so on
  // Conditions that cost AP (spec): Nausea −1, Suppressed −1 (and no reactions), through the same AP clamp.
  const pens = [...(condOn(u, 'nausea') ? [{ n: 1, why: 'Nausea' }] : []), ...(condOn(u, 'suppressed') ? [{ n: 1, why: 'Suppressed' }] : [])];
  const pre: any = emit(cb, 'turn_start_pre', { u, grants: [], penalties: pens, cb, rng });
  const t = turnAp(u, pre.grants || [], pre.penalties || []);
  u.ap = t.ap; for (const l of t.lines) cb.log.push(l);
  if (u.dazedNext) cb.log.push(u.name + ' is Dazed: −2 AP this turn.');
  u.stunnedNext = 0; u.dazedNext = 0; u.overwatch = null; u.owShots = 0; u.moved = false; u.bank = 0; u.shotsThisTurn = 0; u.heat = Math.max(0, u.heat - (heatPair(u) ? 4 : 2)); u.firstShotTurn = false; u.sprinted = false; u.attackedTurn = false; // off-turn attacks (Riposte, Overwatch) don't count for this turn's Momentum
  // Stunned (spec): the turn is lost; the engine passes it (endTurn).
  if (condOn(u, 'stunned') && !u.downed) { u.ap = 0; u.skipTurn = true; cb.log.push(u.name + ' is Stunned and loses the turn.'); }
  emitFx(cb, 'turn', { unit: u.id, side: u.side, at: u.pos, round: cb.round });
  // Magic upkeep (spec: Mana): conditions, a held Outburst growing, Strain, wall zones.
  magicTurnStart(cb, rng, u); if (u.dead) { u.ap = 0; return; }
  const hzObj = objectsAt(cb, u.pos).find((o) => hazardOf(o) && !(u.hazardImmune || []).includes(o.kind)), hz = hzObj ? hazardOf(hzObj) : null;
  if (hz && !u.dead) { cb.log.push(u.name + ' starts the turn in ' + (objectsAt(cb, u.pos).find((o) => hazardOf(o))!.name.toLowerCase()) + hurtUnit(u, hz.damage, true, cb, 'hazard')); if (u.downed || u.dead) { u.ap = 0; return; } }
  if (u.bleed && !u.dead && !u.downed) {
    u.bleed--;
    const by = u.lastHitBy ? cb.units.find((x) => x.id === u.lastHitBy) || null : null; // kill credit: whoever opened the wound
    const r = applyDamage(cb, u, 5, { type: 'bleed', by, shield: false, credit: 'hp' });
    emitFx(cb, 'hurt', { target: u.id, at: u.pos, dmg: r.dealt, why: 'bleed', killed: u.hp === 0 }); if (u.hp === 0) fxFell(cb, u);
    cb.log.push(u.name + ' bleeds: ' + r.dealt + ' damage' + (u.hp === 0 ? (u.side === 'foe' ? ' · down for good' : ' · Downed') : ''));
    if (u.hp === 0) { u.bleed = 0; u.ap = 0; return; }
  }
  if (u.downed && !u.dead) {
    // Items may add to death saves (stat 'death_save', rules 1.3; Still Standing, Bite the Bullet…).
    const r0 = d20(rng), dm0 = u.charId || u.held ? statQuery({ u }, 'death_save').add : 0;
    // 'death_save' {u, add, die} (mutable): any unit's items may add (an ally's Squad Anchor: hooks gap A2).
    const ds: any = emit(cb, 'death_save', { u, add: dm0, die: r0, cb, rng }), dm = ds.add, r = r0 + dm;
    if (r >= 10) u.saves.ok++; else u.saves.fail++;
    cb.log.push(u.name + ' is Downed: death save d20 ' + r0 + (dm ? (dm > 0 ? ' +' : ' −') + Math.abs(dm) : '') + (r >= 10 ? ' · success (' + u.saves.ok + '/3)' : ' · failure (' + u.saves.fail + '/3)'));
    if (u.saves.ok >= 3) { u.downed = false; u.hp = 1; u.saves = { ok: 0, fail: 0 }; cb.log.push(u.name + ' stabilises at 1 HP.'); }
    else if (u.saves.fail >= 3) { u.dead = true; cb.log.push(u.name + ' dies.'); fxFell(cb, u); }
    u.ap = 0;
  }
  // Commanded (spec; rules 1.3 engine menu): an enemy obeys the order it was given: halt (no moving), hold (no
  // attacks), drop (Disarmed), kneel (prone), flee (it spends the turn getting away). Anything else goes to the Narrator.
  // COMMAND (rules 1.4) gives any side's unit one of four orders: halt, kneel, drop, or move up to 3 tiles ("move:x,y"),
  // which it walks at the start of its turn (its own AP; never into harm the caster knows of: the caster picked it).
  if (!u.dead && condOn(u, 'commanded') && (u.side === 'foe' || u.condBy?.commanded)) {
    const o = u.condArg?.commanded || 'halt';
    if (o === 'drop') applyCond(cb, rng, null, u, 'disarmed', undefined, undefined, { skipSave: true }); if (o === 'kneel') { u.prone = true; u.braced = false; }
    let said = false;
    if (o.startsWith('move:')) {
      // The walk is checked again here (the ground may have changed since the Evoke): too far, blocked or prone, it
      // stays where it is and the log says why (item 481).
      const to = o.slice(5), P = paths(cb, u.pos, u.id), max = (SIGIL.command as any)?.move_tiles ?? 3; endCond(u, 'commanded', cb);
      const why = u.prone ? 'it is prone' : P.dist[to] === undefined ? 'no way through' : P.dist[to] > max ? 'more than ' + max + ' tiles' : '';
      if (why) { cb.log.push(u.name + ' is Commanded to walk to ' + refOf(to) + ' but can\'t (' + why + '): it stays.'); said = true; }
      else moveUnit(cb, u, to, rng);
    }
    if (!said) cb.log.push(u.name + ' obeys: ' + o.split(':')[0] + (o.startsWith('move:') ? ' to ' + refOf(o.slice(5)) : '') + '.');
  }
  // 'turn_start' {u}: after AP, conditions, hazards, bleeding and death saves.
  if (!u.dead) emit(cb, 'turn_start', { u, cb, rng });
}
/** What happens as a unit's turn ends (rules 1.3): its timed conditions tick, it looks for Hidden enemies, and a Fighter
 * (rules 1.12, the Momentum rework) Momentum carries from turn to turn: nothing drops it here. */
export function closeTurn(cb: Combat, rng: Rng | null, u: Unit) {
  if (u.mg) magicTurnEnd(cb, rng, u); // rules 1.5: the Strain burn, then stillness
  condTurnEnd(cb, u, rng);
  if (rng && !u.skipTurn) spotHidden(cb, rng, u);
  if ((cb.zones || []).length) sigilSpot(cb, u); // hidden Sigil traps and turrets nearby (rules 1.4)
  u.attackedTurn = false; delete u.skipTurn; delete u.edgeWord;
}

export function checkOver(cb: Combat) {
  const foes = cb.units.filter((u) => u.side === 'foe'), pcs = cb.units.filter((u) => u.side === 'pc' && !u.companion);
  if (!foes.length) return cb.over; // a fight with no foes never ends as a win
  // Surrendered and subdued foes count as defeated (rules 1.3); companions don't keep a lost fight going.
  if (foes.every((u) => u.dead || u.downed || u.surrendered)) cb.over = 'win';
  // PCs lifted out (Extraction, Company Man) or surrendered are out of the fight: when nobody is left standing it ends,
  // as 'extracted' if anyone got out, else a loss (a partial lift used to keep the fight open for good).
  else if (pcs.every((u) => u.dead || u.downed || (u as any).extracted || u.surrendered)) cb.over = cb.over === 'loss' || !pcs.some((u) => (u as any).extracted) ? 'loss' : 'extracted'; // Company Man's own call stands
  return cb.over;
}

/** Pass the turn to the next unit that can act; Downed PCs still get turns (death saves). */
export function endTurn(cb: Combat, rng: Rng) {
  if (cb.window) { windowStep(cb, true); return; } // ending a window's turn hands it on, not the round
  if (checkOver(cb)) return;
  { const u0 = active(cb); if (u0) { emit(cb, 'turn_end', { u: u0, cb, rng }); closeTurn(cb, rng, u0); } } // 'turn_end' {u}: before the turn passes
  if (checkOver(cb)) return;
  for (let guard = 0; guard < cb.units.length * 3; guard++) {
    cb.turn++;
    if (cb.turn >= cb.order.length) { cb.turn = 0; cb.round++; magicRoundTick(cb); emit(cb, 'round_start', { cb, round: cb.round, rng }); }
    const u = active(cb)!;
    if (u.dead || u.surrendered || (u.side === 'foe' && u.downed)) continue;
    if (u.waitRound && cb.round < u.waitRound) { cb.log.push(u.name + (u.tags?.includes('unaware') ? ' is caught unaware: no turn this round.' : ' is still reeling from striking in the open: no turn this round.')); continue; }
    beginTurn(cb, rng);
    if (u.dead || (u.downed && u.side === 'pc') || u.skipTurn) { closeTurn(cb, rng, u); checkOver(cb); if (cb.over) return; continue; }
    return;
  }
}

/** Why a unit can't move at all right now (Downed, prone, Pinned, Grappled, Commanded to halt), or null. */
/** What nails a unit lets go (pulled free, the unit dead, the fight over): a weapon left in it falls into the pile on its
 * tile as the weapon it was. */
/** Every weapon stuck in a unit (a Throw that hit) falls into the pile on its tile: it died, gave up, or the fight ended. */
export function dropStuck(cb: Combat, target: Unit): void {
  const list = target.stuck; if (!list || !list.length) return; delete target.stuck;
  const items = list.map((x) => x.item || (WEAPON[x.weapon] ? gearEntry(x.weapon) : null)).filter(Boolean) as PackItem[];
  if (items.length) dropToPile(cb, target.pos, items, 'drop');
}
export function dropNailed(cb: Combat, target: Unit): void {
  const n = target.nailed; if (!n) return; delete target.nailed;
  const it = n.item || (n.weapon && WEAPON[n.weapon] ? gearEntry(n.weapon) : null);
  if (it) dropToPile(cb, target.pos, [it], 'drop');
}
/** Pull a nailed unit free (rules 1.12): the unit itself, or someone of its side next to it, pays the AP. A weapon left
 * in it falls into the pile on its tile. A nail that carries a weapon (Run Through, Reach; Leon's ruling, 10 Nov 2026)
 * may be pulled by anyone next to the target: the one who left it, or anyone else not on the target's side, takes the
 * weapon into a free hand (`take`: the reducer's gear change for a character; a unit with no sheet takes it bare-handed),
 * else it falls to the pile on the target's tile. */
export function pullFree(cb: Combat, u: Unit, target: Unit = u, take?: (it: PackItem) => boolean): string | null {
  const n = target.nailed; if (!n) return target === u ? 'Nothing holds you.' : 'Nothing holds ' + target.name + '.';
  const other = target !== u && target.side !== u.side, wid = n.weapon && WEAPON[n.weapon] ? n.weapon : null;
  if (target !== u && dist(u.pos, target.pos) > 1) return other && wid ? 'Stand next to ' + target.name + ' to pull the weapon out.' : 'Stand next to an ally to pull them free.';
  if (other && !wid) return 'Stand next to an ally to pull them free.';
  if (u.ap < n.ap) return 'Needs ' + n.ap + ' AP.';
  if (other) {
    const it = n.item || gearEntry(wid!)!;
    u.ap -= n.ap; delete target.nailed;
    emitFx(cb, 'pull_free', { unit: u.id, target: target.id, at: target.pos, weapon: wid });
    let took = !!take && take(it);
    if (!took && !u.charId && !u.companion && !u.allowedActions && u.weapon === 'fists') { u.weapon = wid!; u.ammo = 0; u.jammed = false; took = true; } // no sheet: straight into the empty hand
    if (!took) dropToPile(cb, target.pos, [it], 'drop');
    cb.log.push(u.name + ' pulls the ' + WEAPON[wid!].name.toLowerCase() + ' out of ' + target.name + ' (' + n.ap + ' AP)' + (took ? ' and keeps it in hand' : ': it drops at ' + refOf(target.pos)) + '. ' + target.name + ' is free.');
    return null;
  }
  u.ap -= n.ap; dropNailed(cb, target);
  emitFx(cb, 'pull_free', { unit: u.id, target: target.id, at: target.pos });
  cb.log.push(u.name + (target === u ? ' pulls free' : ' pulls ' + target.name + ' free') + ' (' + n.ap + ' AP)' + (n.weapon && WEAPON[n.weapon] ? ': the ' + WEAPON[n.weapon].name.toLowerCase() + ' drops at ' + refOf(target.pos) : '') + '.');
  return null;
}
export function moveBlock(u: Unit): string | null {
  if (u.downed || u.dead) return 'Downed units can\'t move.';
  if (u.surrendered) return 'Out of the fight.';
  if (u.prone) return 'Stand up first (1 AP).';
  if (u.nailed) return 'Nailed in place: pull free first (' + u.nailed.ap + ' AP).';
  if (condOn(u, 'pinned')) return 'Pinned: you can\'t move this round.';
  if (condOn(u, 'grappled')) return 'Grappled: break free first (2 AP).';
  if (condOn(u, 'commanded') && ['halt', 'kneel'].includes(u.condArg?.commanded || 'halt') && (u.side === 'foe' || (u.condBy?.commanded && !u.condArg?.commanded?.startsWith('move')))) return 'Commanded to halt.';
  return null;
}
/** Move (spec: Moving; Sprint; Disengage), walked tile by tile (rules 1.3): each step fires 'move_step' {u, from, at,
 * i, route, stop} (set stop to end the walk there), and opportunity attacks and Overwatch are checked on every step,
 * not only at the end. A walk cut short (a trap, a reaction that Downs or Pins you, a handler) keeps the tiles not
 * walked in the turn's bank. Sprint is once per turn. Afraid units can't move closer to what they fear. */
/** o.shortest: the plain shortest path (the Narrator's own moves; rules 1.9 routes only a player's click-path around hazards). */
export function moveUnit(cb: Combat, u: Unit, to: string, rng?: Rng, how: 'move' | 'sprint' | 'disengage' = 'move', o: { shortest?: boolean; via?: { dist: Record<string, number>; prev: Record<string, string> }; /** A step that is part of something already paid for (a technique's step, rules 1.12): 0 AP and no opportunity attacks (unless oa), told to the items before they price the move. */ free?: boolean; oa?: boolean; /** A paid walk that is a technique's own run (Charge's): priced and walked as any move, but it costs no Momentum. */ part?: boolean } = {}): string | null {
  const blk = moveBlock(u); if (blk) return blk;
  // o.via: paths the caller already chose (the area map's sneak prices its detour with the sneak's extra AP).
  const P = o.via || (o.shortest ? paths(cb, u.pos, u.id) : movePaths(cb, u, to, how)); // rules 1.9: a player's click-path goes around revealed hazards (item 683)
  const tiles = P.dist[to];
  if (tiles === undefined || to === u.pos) return 'Can\'t reach that tile.';
  { const fs = condSource(u, 'fear'), f = fs ? cb.units.find((x) => x.id === fs) : null; if (f && !f.dead && dist(to, f.pos) < dist(u.pos, f.pos)) return 'Afraid of ' + f.name + ': you can\'t move toward them.'; }
  // Threatened (a Call, rules 1.13): on its next turn it can't move toward the one who threatened it.
  { const cw = u.call?.cowed, f = cw ? cb.units.find((x) => x.id === cw.by) : null; if (f && alive(f) && dist(to, f.pos) < dist(u.pos, f.pos)) return 'Threatened by ' + f.name + ': you can\'t move toward them this turn.'; }
  let ap: number;
  if (how === 'disengage') { const f = forbids({ u }, 'disengage'); if (f) return f + ': you never Disengage.'; }
  if (how === 'sprint') {
    if (u.noSprint) return 'Overburdened or in Juggernaut armour: no Sprint.';
    if (u.sprinted) return 'One Sprint a turn.';
    { const f = forbids({ u }, 'sprint'); if (f) return f + ': no Sprint.'; }
    if (tiles > Math.floor(3 * u.movement)) return 'Too far to sprint (' + Math.floor(3 * u.movement) + ' tiles).'; ap = actionAp({ u }, 'sprint', 2).ap;
  }
  else if (how === 'disengage') { if (tiles > 1) return 'Disengage moves 1 tile.'; ap = actionAp({ u }, 'disengage', 1).ap; }
  else ap = apForTiles(tiles, u.bank, u.movement);
  const route: string[] = []; for (let k = to; k !== u.pos && P.prev[k]; k = P.prev[k]) route.unshift(k);
  // Items price the move before it is paid: 'move_cost' {u, from, to, route, tiles, how, ap, skipOA, skipOW, free}
  // (ap mutable; free: the tiles are not banked against; skipOA/skipOW: no opportunity attacks / no Overwatch).
  const ap0 = ap; // the move's own price, before a free step or an item changes it
  if (o.free) ap = 0;
  const mc: any = emit(cb, 'move_cost', { u, from: u.pos, to, route, tiles, how, ap, skipOA: !!o.free && !o.oa, skipOW: false, free: !!o.free, cb, mods: cb.mods || [] });
  ap = o.free ? 0 : Math.max(0, mc.ap); // a free step stays free whatever the ground adds (the items were told it is free before they priced it)
  if (ap > u.ap) return 'Needs ' + ap + ' AP.';
  const from = u.pos, bank0 = u.bank;
  u.ap -= ap; if (how === 'sprint') u.sprinted = true; u.braced = false; u.moved = true;
  if (condOn(u, 'emplaced')) endCond(u, 'emplaced', cb);
  // A Hidden mover draws no reactions (nobody sees it go).
  const reacts = !!rng && !u.hidden;
  let seg: string[] = [from], stopped = '', sprung = '';
  // Presentation: each tile's sight as it is walked (before a trap, a field or a hazard on it reveals the mover), and
  // what the walker's side sees after each step (a hostile its eyes find or lose plays on that step).
  let tileSight: string[] = [sightHere(cb, u)];
  const eyes: WalkSight = { by: u.id, side: u.side as 'pc' | 'foe', steps: [{ at: from, ids: new Set(seenIds(cb, u.side as 'pc' | 'foe')) }] };
  const restart = () => { seg = [u.pos]; tileSight = [sightHere(cb, u)]; };
  const flush = () => { if (seg.length > 1) moveFx(cb, u, seg, how, tileSight); restart(); };
  for (let i = 0; i < route.length; i++) {
    const k = route[i], was = u.pos;
    u.pos = k; seg.push(k); tileSight.push(sightHere(cb, u)); eyes.steps.push({ at: k, ids: new Set(seenIds(cb, u.side as 'pc' | 'foe')) });
    const t = objectsAt(cb, k).find((o) => isTrap(o) && !((o as any).side && (o as any).side === u.side)); // a side's own rigged tile (Sabotage) never springs on it
    if (t) { t.resolved = true; t.hidden = false; flush(); emitFx(cb, 'trap', { unit: u.id, at: k }); const td: any = t; sprung = ' · steps on a trap' + hurtUnit(u, td.damage ?? kindOf(t).trap!.damage, false, cb, 'trap', td.owner ? cb.units.find((x) => x.id === td.owner) || null : null); cb.objects = objectsOf(cb).filter((x) => x !== t); emit(cb, 'trap_sprung', { u, obj: t, cb, rng }); stopped = 'trap'; }
    if (!stopped && rng && (cb.zones || []).length && zoneEnter(cb, rng, u, k)) { stopped = 'trap'; flush(); }
    // Rules 1.7: hazards fire on every tile entered, at any speed (the area map's moves roll on cb.worldRng).
    if (!stopped && cb.hazards?.some((h) => hazardLiveAt(h, k, u.side))) { flush(); const hz = hazardStep(cb, rng || cb.worldRng, u, k); if (hz) stopped = hz; }
    const ms: any = emit(cb, 'move_step', { u, from: was, at: k, i, route, how, stop: false, cb, rng, skipOW: !!mc.skipOW || !reacts, ...(mc.noWatch ? { noWatch: true } : {}), flush: () => { flush(); } }); // flush: a held shot (physical/) plays the walk so far first; noWatch (set on move_cost): no held Watch hears the step (Shift)
    if (ms.stop && !stopped) stopped = typeof ms.stop === 'string' ? ms.stop : 'stopped';
    if (reacts && !u.dead && !u.downed) {
      // Opportunity attacks (spec): leaving an enemy's melee reach without Disengaging, checked at each step.
      if (how !== 'disengage' && !mc.skipOA && !immune({ u }, 'opportunity_attack')) for (const h of cb.units) {
        if (u.dead || u.downed) break;
        if (h.side === u.side || !alive(h) || dist(h.pos, was) > 1 || dist(h.pos, k) <= 1 || !canReact(cb, h)) continue;
        // 'reaction_window' {reactor, mover, kind, cancel}: an item may cancel a reaction (or take its own).
        const rw: any = emit(cb, 'reaction_window', { reactor: h, mover: u, kind: 'opportunity', cancel: false, at: k, cb, rng }); if (rw.cancel) continue;
        flush(); useReaction(cb, h); cb.log.push(h.name + ' takes an opportunity attack.'); opportunityStrike(cb, rng!, h, u, was);
      }
      if (!mc.skipOW && !u.dead && !u.downed) { const before = cb.log.length; triggerOverwatch(cb, rng!, u, seg, tileSight); if (cb.log.length !== before) restart(); }
      // Heart Overwatch (rules 1.5): a watching Soul mage releases at an enemy entering its design's reach.
      if (!mc.skipOW && !u.dead && !u.downed && cb.units.some((h) => h.mg?.held?.watch && h.side !== u.side)) { const before = cb.log.length; flush(); heartOverwatch(cb, rng!, u, was); if (cb.log.length !== before) restart(); }
    }
    if (u.dead || u.downed) { stopped ||= 'down'; }
    else if (condOn(u, 'pinned') || condOn(u, 'grappled')) stopped ||= 'pinned';
    if (stopped) break;
  }
  flush();
  const end = u.pos, walked = P.dist[end] ?? tiles;
  // The bank: tiles paid for and not walked carry over (a walk cut short keeps them).
  if (how === 'move' && !mc.free) u.bank = bank0 + ap * u.movement - walked;
  cb.log.push(u.name + (how === 'sprint' ? ' sprints' : how === 'disengage' ? ' disengages' : ' moves') + ' to ' + refOf(end) + ' (' + walked + (walked === 1 ? ' tile' : ' tiles') + (walked < tiles ? ' of ' + tiles : '') + ', ' + ap + ' AP)' + sprung + '.');
  if (u.side === 'pc' && !u.dead) { spotTraps(objectsOf(cb), u.pos, u.vigilant || 0, u.name, (l) => cb.log.push(l)); spotHazards(cb, u); }
  if (!u.dead && (cb.zones || []).length) sigilSpot(cb, u);
  // 'moved' {u, from, to, tiles, how, forced:false, route}
  // part: a step that is part of something else (a technique's own step or run: o.free or o.part; a class move's or a
  // perk's free step: an item's move_cost made it free, or priced a paid move at 0 AP). Such a step costs no Momentum
  // (physical/rules.ts); a walk, a Sprint and a Disengage do.
  emit(cb, 'moved', { u, from, to: end, tiles: walked, how, forced: false, part: !!o.free || !!o.part || !!mc.free || (ap0 > 0 && ap === 0), route: route.slice(0, route.indexOf(end) + 1), stopped: stopped || null, cb, rng });
  sightCheck(cb);
  sightFx(cb, u.id, {}, eyes); // presentation: what came into or out of each side's sight (the walker's own rides on its move events)
  return null;
}
/** 'sight_change' {side, lost[], gained[]}: units each side stopped or started seeing, after a move. Only computed
 * while someone listens (it walks the whole map). */
export function sightCheck(cb: Combat) {
  if (!anyOn(cb, 'sight_change')) return;
  const was = (cb.sightWas ||= {});
  for (const side of ['pc', 'foe'] as const) {
    const now = [...visibility(cb, side).seen], before = was[side] || [];
    const lost = before.filter((id) => !now.includes(id)), gained = now.filter((id) => !before.includes(id));
    was[side] = now;
    if (lost.length || gained.length) emit(cb, 'sight_change', { side, lost, gained, cb });
  }
}

/** An opportunity attack lands as the mover leaves reach: it is struck on the tile it is leaving (the melee reach
 * check would otherwise see it a step away), then its walk goes on from where it got to, unless the blow drops it
 * there. Exported for class moves that grant one (Anchor). */
export function opportunityStrike(cb: Combat, rng: Rng, h: Unit, t: Unit, from: string) {
  const at = t.pos; t.pos = from;
  try { react(cb, rng, h, t, 'melee'); } finally { if (!t.dead && !t.downed) t.pos = at; }
}
function react(cb: Combat, rng: Rng, h: Unit, t: Unit, mode: AttackMode) {
  const pv = previewAttack(cb, h, t, mode, { free: true });
  if (!pv.ok) { cb.log.push('(' + h.name + ' can\'t: ' + pv.why + ')'); return; }
  resolveAttack(cb, rng, h, t, mode, null, { noAp: true }); checkOver(cb);
}
/** Overwatch (spec): a unit holding a shot fires at the first enemy that moves in its sight and range, as its reaction
 * (checked at every step of a walk). A unit may hold more than one shot (u.owShots, class moves), all on one reaction. */
export function triggerOverwatch(cb: Combat, rng: Rng, mover: Unit, seg?: string[], walked?: string[]) {
  for (const h of cb.units) if (h.overwatch && h.side !== mover.side && alive(h) && !mover.dead && !mover.downed && !mover.hidden && unitSees(cb, h, mover.pos)) {
    const pv = previewAttack(cb, h, mover, h.overwatch, { free: true }); if (!pv.ok) continue;
    if (!canReact(cb, h)) continue;
    const rw: any = emit(cb, 'reaction_window', { reactor: h, mover, kind: 'overwatch', cancel: false, at: mover.pos, cb, rng }); if (rw.cancel) continue;
    if (seg && seg.length > 1) { moveFx(cb, mover, seg, 'move', walked); seg.splice(0, seg.length - 1); walked?.splice(0, walked.length - 1); }
    useReaction(cb, h); const mode = h.overwatch, shots = Math.max(1, h.owShots || 1); h.overwatch = null; h.owShots = 0;
    // Presentation: the held shot is sprung here (the client stops the mover's walk on this tile for it).
    emitFx(cb, 'overwatch', { unit: h.id, target: mover.id, from: h.pos, at: mover.pos, mode });
    cb.log.push(h.name + ' fires from overwatch.');
    for (let i = 0; i < shots && !mover.dead && !mover.downed; i++) { if (i && !previewAttack(cb, h, mover, mode, { free: true }).ok) break; resolveAttack(cb, rng, h, mover, mode, null, { noAp: true }); }
    checkOver(cb);
  }
}
export function setOverwatch(cb: Combat, u: Unit, mode: 'shot' | 'aimed' | 'melee'): string | null {
  const w = WEAPON[u.weapon], cost = attackApCost(isMelee(w) ? w : w, mode);
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  u.ap -= cost; u.overwatch = mode; emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: 'overwatch' }); cb.log.push(u.name + ' holds a shot on overwatch.'); return null;
}
/** Burst (spec): 3 AP, 3 rounds at one target, each later round −1 more. Full auto: 4 AP, 10 rounds, one roll at −2 per enemy near the line. */
export function fireBurst(cb: Combat, rng: Rng, u: Unit, t: Unit, who: Character | null): string | null {
  const pv = previewAttack(cb, u, t, 'burst'); if (!pv.ok) return pv.why!;
  u.ap -= pv.ap; cb.log.push(u.name + ' fires a burst' + (pv.ap !== 3 ? ' (' + pv.ap + ' AP)' : '') + '.');
  emitFx(cb, 'volley', { unit: u.id, target: t.id, from: u.pos, to: t.pos, weapon: u.weapon, cat: WEAPON[u.weapon].category, mode: 'burst', shots: 3 });
  // resolveAttack refuses (and ends the burst on) any round the preview won't allow: broken gun, target pushed out of sight.
  chained(() => { for (let i = 0; i < 3 && !t.dead && (WEAPON[u.weapon].magazine == null || u.ammo > 0) && !u.jammed; i++) { const r = resolveAttack(cb, rng, u, t, 'shot', who, { extra: -i, noAp: true, noWear: i > 0, vi: i } as any); if (r.refused || r.cancelled) break; } }, 'burst');
  u.heat = Math.max(0, u.heat - 1); emit(cb, 'volley_end', { u, mode: 'burst', target: t, cb, rng }); checkOver(cb); return null;
}
export function fireAuto(cb: Combat, rng: Rng, u: Unit, t: Unit, who: Character | null): string | null {
  const pv = previewAttack(cb, u, t, 'auto'); if (!pv.ok) return pv.why!;
  const [ax, ay] = xy(u.pos), [tx, ty] = xy(t.pos), len = Math.hypot(tx - ax, ty - ay) || 1;
  const near = (v: Unit) => { const [vx, vy] = xy(v.pos), along = ((vx - ax) * (tx - ax) + (vy - ay) * (ty - ay)) / len; return along > 0 && Math.abs((vx - ax) * (ty - ay) - (vy - ay) * (tx - ax)) / len <= (((WEAPON[u.weapon] as any).grants?.effect?.op === 'auto_width') ? (WEAPON[u.weapon] as any).grants.effect.value + 0.5 : 1.5); };
  const hits = cb.units.filter((v) => v.side !== u.side && !v.dead && near(v) && previewAttack(cb, u, v, 'auto', { free: true }).ok);
  u.ap -= pv.ap; cb.log.push(u.name + ' opens up on full auto' + (pv.ap !== 4 ? ' (' + pv.ap + ' AP)' : '') + '.');
  const w = WEAPON[u.weapon], startAmmo = u.ammo;
  emitFx(cb, 'volley', { unit: u.id, target: t.id, from: u.pos, to: t.pos, weapon: u.weapon, cat: w.category, mode: 'auto', shots: 10 });
  // The line is worked out once; each target is checked again as it comes up (resolveAttack refuses a shot it can't
  // take), and a jam or an empty magazine ends the burst of fire.
  chained(() => { let i = 0; for (const v of hits) { if (u.jammed || (w.magazine != null && u.ammo <= 0)) break; if (resolveAttack(cb, rng, u, v, 'shot', who, { extra: -2, noAp: true, noWear: true, vi: i++ } as any).cancelled) break; } }, 'auto');
  if (u.maxDur) u.dur = Math.max(0, (u.dur ?? u.maxDur) - 2);
  // Ten rounds go out whatever the shots took; what items changed during the volley stays (hooks gap C4).
  if (w.magazine != null && !u.infiniteAmmo) u.ammo = Math.max(0, u.ammo - Math.max(0, 10 - (startAmmo - u.ammo)));
  u.heat += 4 - hits.length; emit(cb, 'volley_end', { u, mode: 'auto', target: t, hits, cb, rng }); checkOver(cb); return null;
}
/** Shove (spec): 2 AP, adjacent; d20 + Raw Power vs 10 + the target's best of Raw Power and Athletics; pushed 1 tile, or prone if blocked. */
export function shove(cb: Combat, rng: Rng, u: Unit, t: Unit): string | null {
  if (dist(u.pos, t.pos) > 1 || t.dead) return 'Shove someone next to you.';
  const cost = actionAp({ u }, 'shove', 2).ap;
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  u.ap -= cost;
  { const im = immune({ u: t }, 'shove'); if (im) { cb.log.push(u.name + ' shoves ' + t.name + ', who doesn\'t budge (' + im + ').'); emitFx(cb, 'shove', { unit: u.id, target: t.id, from: t.pos, to: t.pos, ok: false }); return null; } }
  // Item Raw Power mods reach the shove's d20 (the global ruling); the target defends with its better of Raw Power and Athletics.
  const roll = d20(rng), total = roll + (u.strength ?? 0) + (u.sk?.raw_power || 0), need = 10 + Math.max((t.strength ?? 0) + (t.sk?.raw_power || 0), t.athleticsPts != null ? mod(t.athleticsPts) + (t.sk?.athletics || 0) : 0, 0);
  let line = u.name + ' shoves ' + t.name + ': d20 ' + roll + ' ' + ((u.strength ?? 0) >= 0 ? '+' : '−') + Math.abs(u.strength ?? 0) + ' = ' + total + ' vs ' + need;
  if (total >= need) {
    const [ux, uy] = xy(u.pos), [tx, ty] = xy(t.pos), to = key(tx + Math.sign(tx - ux), ty + Math.sign(ty - uy));
    const [nx, ny] = xy(to), blocked = nx < 0 || ny < 0 || nx >= cb.map.w || ny >= cb.map.h || moveBlockers(cb).has(to) || cb.units.some((v) => !v.dead && v.pos === to);
    const was = t.pos;
    // 'forced_move' {u, by, tiles, to, how, cancel}: an item may stop the push.
    const fm: any = blocked ? { cancel: false } : emit(cb, 'forced_move', { u: t, by: u, tiles: 1, to, how: 'shove', cancel: false, cb, rng });
    if (blocked) { t.prone = true; line += ' · knocked prone'; } else if (fm.cancel) line += ' · holds firm'; else { t.pos = to; t.braced = false; line += ' · pushed to ' + refOf(to); }
    emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: t.pos, ok: true, prone: blocked });
  } else { line += ' · holds firm'; emitFx(cb, 'shove', { unit: u.id, target: t.id, from: t.pos, to: t.pos, ok: false }); }
  cb.log.push(line + '.'); return null;
}
export function toggleProne(cb: Combat, u: Unit): string | null {
  if (u.ap < 1) return 'Needs 1 AP.';
  u.ap -= 1; u.prone = !u.prone; emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: u.prone ? 'prone' : 'stand' }); cb.log.push(u.name + (u.prone ? ' drops prone.' : ' stands up.'));
  if (!u.prone) emit(cb, 'stood_up', { u, cb }); // 'stood_up' {u}: after standing (a held shot waits for it: Dead to Rights)
  return null;
}
const GUARD_RULES = (): any => (techniquesJ as any).rules?.guard || {};
/** Is this unit's main-hand weapon one that has the Brace action of its own (a weapon that must be braced, the LMG's
 * −2, a weapon whose skill is a braced bonus, or one its handling grants Brace to)? What Brace was before rules 1.13. */
export function weaponBraces(u: Unit): boolean {
  const w: any = WEAPON[u.weapon]; if (!w) return false; const p: string[] = w.properties || [], hd = w.handling || {};
  if ((hd.deny || []).includes('brace')) return false;
  return p.includes('requires_braced_or_prone') || p.includes('minus2_to_hit_unless_emplaced') || w.grants?.effect?.op === 'braced_bonus' || (hd.grant || []).includes('brace');
}
/** Braced with the weapon set: what the weapon's own rules read (Recoil halved, a technique's Braced line). A unit that
 * braced only for Guard (u.guardBrace) is in the braced stance and nothing more. */
export const weaponBraced = (u: Unit): boolean => !!u.braced && !u.guardBrace;
/** Durability's Guard (rules 1.13; physical/guard.ts sets f): what a Brace gives a unit that has a Guard pool. */
export const braceHook: { f: ((cb: Combat, u: Unit) => void) | null } = { f: null };
export function brace(cb: Combat, u: Unit): string | null {
  if (!weaponActions(u).some((x) => x.id === 'brace')) return 'This weapon has nothing to brace.';
  if (u.braced) return 'Already braced.';
  if (u.ap < 1) return 'Needs 1 AP.';
  // A weapon that has the Brace action of its own is set (Recoil halved, its penalties gone). Any other weapon is not:
  // its bearer sets only themself, for Guard and for the class moves that ask for the braced stance (rules 1.13).
  u.ap -= 1; u.braced = true; if (weaponBraces(u)) delete u.guardBrace; else u.guardBrace = true; emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: 'brace' }); cb.log.push(u.name + ' braces.');
  braceHook.f?.(cb, u); // a unit with a Guard pool gains Guard as it sets itself
  return null;
}

/** A weapon skill's on-hit effect (spec: Weapons v2): lose AP, pushed, prone, bleeding, armour broken. */
function onHit(cb: Combat, att: Unit, t: Unit, fx: any): string {
  if (fx.apply === 'ap_loss') { t.stunnedNext = Math.max(t.stunnedNext, fx.value || 1); return ' · staggered (−AP next turn)'; }
  if (fx.apply === 'prone') { t.prone = true; return ' · knocked prone'; }
  if (fx.apply === 'bleed') { if (immune({ u: t }, 'bleed')) return ''; t.bleed = 3; return ' · Bleeding'; }
  if (fx.apply === 'armour_break') { // on the armour it wears: a Break's 0 for a round is not what is cut (it is mended to the cut value)
    const worn = effectiveArmour(t); t.baseArmour ??= worn; const now = Math.max(t.baseArmour - 10, worn - (fx.value || 5), 0); setEffectiveArmour(t, now);
    return ' · armour broken (' + now + ')'; }
  if (fx.apply === 'push') {
    if (immune({ u: t }, 'knockback')) return '';
    if ((emit(cb, 'forced_move', { u: t, by: att, tiles: fx.value || 1, how: 'knockback', cancel: false, cb }) as any).cancel) return '';
    const [ax, ay] = xy(att.pos), was = t.pos; let moved = 0;
    for (let i = 0; i < (fx.value || 1); i++) { const [tx, ty] = xy(t.pos), to = key(tx + Math.sign(tx - ax), ty + Math.sign(ty - ay)), [nx, ny] = xy(to);
      if (nx < 0 || ny < 0 || nx >= cb.map.w || ny >= cb.map.h || moveBlockers(cb).has(to) || cb.units.some((v) => !v.dead && v.pos === to)) break; t.pos = to; moved++; }
    if (moved) emitFx(cb, 'shove', { unit: att.id, target: t.id, from: was, to: t.pos, ok: true });
    return moved ? ' · knocked back to ' + refOf(t.pos) : '';
  }
  return '';
}
/** Weapon skills that are actions (spec: Weapons v2): several shots for a fixed AP, or a sweep of every adjacent enemy. */
export function useWeaponSkill(cb: Combat, rng: Rng, u: Unit, t: Unit | null, who: Character | null): string | null {
  const w = WEAPON[u.weapon], fx: any = (w as any).grants?.effect || {};
  if (fx.op === 'multi_shot') {
    if (!t) return 'Pick a target.';
    const sap = volleyAp(cb, u, t, 'skill', fx.ap); if (u.ap < sap) return 'Needs ' + sap + ' AP.';
    const pv = previewAttack(cb, u, t, 'shot', { free: true }); if (!pv.ok) return pv.why!;
    const rounds = fx.rounds || 1;
    if (w.magazine != null && u.ammo < rounds) return 'Not enough rounds loaded.';
    u.ap -= sap; cb.log.push(u.name + ' uses ' + (w as any).grants.name + '.');
    emitFx(cb, 'volley', { unit: u.id, target: t.id, from: u.pos, to: t.pos, weapon: w.id, cat: w.category, mode: 'skill', name: (w as any).grants.name, shots: fx.shots });
    // Each shot after the first is checked again: one that can no longer be taken (the target fell or dropped out of
    // sight, the gun broke) ends the volley; it is never rolled against a refused preview.
    chained(() => { for (let i = 0; i < fx.shots && !t.dead && !u.jammed && (w.magazine == null || u.ammo > 0); i++) {
      if (i > 0) { const p = previewAttack(cb, u, t, 'shot', { free: true }); if (!p.ok) { cb.log.push('(' + (w as any).grants.name + ' stops: ' + p.why + ')'); break; } }
      resolveAttack(cb, rng, u, t, 'shot', who, { extra: fx.extra || 0, noAp: true, dmgMult: fx.dmg_mult || 1, noWear: i > 0, vi: i } as any);
    } }, 'skill');
    if (rounds > 1 && w.magazine != null && !u.infiniteAmmo) u.ammo = Math.max(0, u.ammo - (rounds - 1));
    emit(cb, 'volley_end', { u, mode: 'skill', target: t, cb, rng }); checkOver(cb); return null;
  }
  if (fx.op === 'sweep') {
    const sap = volleyAp(cb, u, null, 'skill', fx.ap); if (u.ap < sap) return 'Needs ' + sap + ' AP.';
    const near = cb.units.filter((v) => v.side !== u.side && !v.dead && dist(v.pos, u.pos) <= 1 && sideSees(cb, u.side, v));
    if (!near.length) return 'Nobody next to you.';
    u.ap -= sap; cb.log.push(u.name + ' uses ' + (w as any).grants.name + '.');
    emitFx(cb, 'volley', { unit: u.id, from: u.pos, weapon: w.id, cat: w.category, mode: 'sweep', name: (w as any).grants.name, shots: near.length });
    chained(() => { for (const v of near) resolveAttack(cb, rng, u, v, 'melee', who, { noAp: true }); }, 'skill');
    emit(cb, 'volley_end', { u, mode: 'skill', cb, rng }); checkOver(cb); return null;
  }
  return (w as any).grants ? (w as any).grants.name + ' isn\'t an action the engine runs yet: say it with Say, and the Narrator rules it after the fight.' : 'No weapon skill.';
}
/** Field Repair (spec): 2 AP, Proficiency 3+, one spare-parts charge; restores 10% + 5% per Proficiency point above 3. */
export function fieldRepair(cb: Combat, u: Unit): string | null {
  if (!u.maxDur) return 'Nothing to repair.';
  if ((u.proficiency || 0) < 3) return 'Needs Proficiency 3.';
  if (!(u.parts || 0)) return 'No spare-parts charges.';
  if ((u.dur ?? u.maxDur) >= u.maxDur) return 'Already in full repair.';
  const cost = actionAp({ u }, 'field_repair', 2).ap;
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  const add = Math.ceil(u.maxDur * (0.1 + 0.05 * ((u.proficiency || 3) - 3)) * statQuery({ u }, 'field_repair_amount').mult);
  u.ap -= cost; u.parts = (u.parts || 0) - 1; u.dur = Math.min(u.maxDur, (u.dur ?? 0) + add); emitFx(cb, 'repair', { unit: u.id, at: u.pos, dur: 1400 });
  cb.log.push(u.name + ' patches the weapon: +' + add + ' durability (' + u.dur + '/' + u.maxDur + ').'); return null;
}
/** Paired attack (spec: Hands): both weapons in one action. AP = the higher cost + 1; main −1, off −3 (better by 1 per 3 skill points, to −1). */
export function pairedAttack(cb: Combat, rng: Rng, u: Unit, t: Unit, t2: Unit | null, who: Character | null): string | null {
  if (!u.offWeapon) return 'Nothing in your off hand to attack with.';
  const mw = WEAPON[u.weapon], ow = WEAPON[u.offWeapon];
  const cost = volleyAp(cb, u, t, 'paired', Math.max(attackApCost(mw, isMelee(mw) ? 'melee' : 'shot'), attackApCost(ow, isMelee(ow) ? 'melee' : 'shot')) + 1);
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  const offTarget = t2 || t, mainMode = isMelee(mw) ? 'melee' : 'shot';
  const pv = previewAttack(cb, u, t, mainMode, { free: true }); if (!pv.ok) return pv.why!;
  u.ap -= cost; cb.log.push(u.name + ' attacks with both hands.');
  emitFx(cb, 'volley', { unit: u.id, target: t.id, from: u.pos, to: t.pos, weapon: mw.id, cat: mw.category, mode: 'paired', shots: 2 });
  fxChain++; const wasV = VOLLEY; VOLLEY = 'paired';
  try {
  resolveAttack(cb, rng, u, t, mainMode, who, { extra: -1, noAp: true });
  // swap the off-hand weapon in for its own swing or shot
  const keep = { weapon: u.weapon, ammo: u.ammo, attack: u.attack, dur: u.dur, maxDur: u.maxDur, mods: u.mods, ammoType: u.ammoType };
  const skillPts = u.dexterity || 0; // rules 1.12 (item 953): an off-hand gun or light blade hits with Dexterity
  u.weapon = ow.id; u.ammo = u.offAmmo ?? (ow.magazine ?? 0); u.maxDur = 0; u.mods = []; u.ammoType = u.offAmmoType ?? null;
  if (!offTarget.dead) { const p2 = previewAttack(cb, u, offTarget, isMelee(ow) ? 'melee' : 'shot', { free: true }); if (p2.ok) resolveAttack(cb, rng, u, offTarget, isMelee(ow) ? 'melee' : 'shot', who, { extra: Math.min(-1, -3 + Math.floor(skillPts / 3)), noAp: true }); else cb.log.push('(off hand: ' + p2.why + ')'); }
  u.offAmmo = u.ammo; Object.assign(u, keep);
  } finally { fxChain--; VOLLEY = wasV; }
  emit(cb, 'volley_end', { u, mode: 'paired', target: t, cb, rng }); checkOver(cb); return null;
}

/** Drop things into the pile on a fight's tile (rules 1.9, World Play 1.1): never hidden; the cap's losses are logged. */
export function dropToPile(cb: Combat, at: string, list: PackItem[], why = 'drop') {
  const { pile, lost } = dropOnTile(objectsOf(cb), at, list);
  emitFx(cb, 'pile', { at, id: pile.id, count: (pile.items || []).length, why });
  if (lost.length) cb.log.push('The pile at ' + refOf(at) + ' is full: ' + lost.join(', ') + ' ' + (lost.length === 1 ? 'is' : 'are') + ' lost.');
}
/** Line up a unit's spare types with its spares (special ammo, item 680): null for a standard one. */
const typesFor = (types: (string | null)[] | undefined, n: number) => Array.from({ length: n }, (_, i) => types?.[i] ?? null);
/** Reload (spec: Reloading; rules 1.9): a magazine weapon swaps in the fullest spare. A speed reload (2 AP) drops the
 * one in the gun into the pile on the unit's tile, rounds and type kept; a tactical reload (+1 AP, item 679) puts it
 * back with the spares. A weapon loaded round by round tops up from loose rounds and has one reload. Enemies carry
 * their tier's spares and always speed-reload. */
/** Rules that refuse the plain reload of a weapon (Physical 2.0: a Drawn weapon's quiver is filled only from its own
 * menu, out of a fight: physical/ranged/quiver.ts). Each returns a refusal or null; reload(), reloadHands() and the
 * reload entry of weaponActions() all ask, so no path (the Reload action, the area map, Running Reload, Between
 * Heartbeats, Resupply) reloads past them. cb is null when the caller has no fight at hand (weaponActions). */
type ReloadRefuser = (u: Unit, weaponId: string, cb: Combat | null) => string | null;
const RELOAD_REFUSERS: ReloadRefuser[] = [];
export const reloadRefuser = (f: ReloadRefuser) => { RELOAD_REFUSERS.push(f); };
export function reloadRefused(u: Unit, weaponId: string | null | undefined, cb: Combat | null): string | null {
  if (!weaponId) return null;
  for (const f of RELOAD_REFUSERS) { const r = f(u, weaponId, cb); if (r) return r; }
  return null;
}
/** Rules 1.12 (Last Round): a unit owed a free reload pays nothing for its next speed reload. o.free: a reload whose AP
 * something else waives (Resupply, Running Reload, Between Heartbeats): it costs 0 and leaves the owed free reload for a
 * reload that would cost AP. */
export function reload(cb: Combat, u: Unit, o: { both?: boolean; tactical?: boolean; free?: boolean } = {}): string | null {
  const owed = !!u.freeReload && !o.tactical && !o.both && !o.free, err = reloadPaid(cb, u, o, owed || !!o.free); // a both-hands reload is its own action: the free one stays owed
  if (!err && owed && !u.dead && !u.downed) { delete u.freeReload; cb.log.push('  (' + u.name + '\'s reload is free.)'); }
  return err;
}
function reloadPaid(cb: Combat, u: Unit, o: { both?: boolean; tactical?: boolean }, free: boolean): string | null {
  const w = WEAPON[u.weapon];
  if (w.magazine == null) return 'Nothing to reload.';
  { const no = reloadRefused(u, u.weapon, cb); if (no) return no; }
  if (!weaponActions(u).some((x) => x.id === 'reload')) return 'This weapon doesn\'t reload.';
  if (forbids({ u }, 'reload')) return forbids({ u }, 'reload') + ': no reloading.';
  if (o.tactical && w.reload === 'loose') return 'Loaded round by round: there is only one reload.';
  const tactical = !!o.tactical && !!u.mags && w.reload !== 'loose';
  const rAp = free ? 0 : reloadAp(u) + (tactical ? PILE.tactical_reload_extra_ap : 0);
  if (u.ap < rAp) return 'Needs ' + rAp + ' AP.';
  // Every refusal comes before the hook: a refused reload is no reload (Speed Loader's use stays; spec item 564).
  // A full magazine isn't swapped (review fix: a speed reload dropped a full one, a tactical one cost 3 AP for nothing).
  if (w.reload === 'magazine' && u.ammo >= (magazineSize(w.id, u.mods) ?? w.magazine) && !u.jammed) return 'Already full.';
  if (u.mags && w.reload === 'loose') { if (w.magazine - u.ammo <= 0) return 'Already full.'; if (!Math.min(w.magazine - u.ammo, u.loose || 0)) return 'No rounds left to load.'; }
  else if (u.mags && !u.mags.some((n) => n > 0)) return 'No loaded spare ' + (w.reload_unit || 'magazine') + 's.' + (u.mags.length && u.loose ? ' Load one first.' : '');
  emit(cb, 'reload', { u, ap: rAp, cb, ...(o.both ? { both: true } : {}), ...(tactical ? { tactical: true } : {}) });
  if (u.dead || u.downed) return null; // a held shot felled it as it reached for the magazine (Dead to Rights): no reload
  const rDur = (how: string) => (rAp === 1 ? 800 : how === 'loose' ? 1400 : 1200);
  // The event's counts are for the picture only (the reload card, fx/reload.ts): what was in the gun, what is in it now, its size.
  // Unlimited spares (a companion's, a twin's: no mags) drop nothing in the pile: noDrop tells the card and the portrait not to show one falling.
  if (!u.mags) { const was = u.ammo; u.ap -= rAp; u.ammo = w.magazine; u.jammed = false; emitFx(cb, 'reload', { unit: u.id, at: u.pos, weapon: w.id, cat: w.category, how: w.reload === 'loose' ? 'loose' : 'mag', dur: rDur(w.reload === 'loose' ? 'loose' : 'mag'), left: was, ammo: u.ammo, cap: w.magazine, noDrop: true }); cb.log.push(u.name + ' reloads.'); return null; }
  if (w.reload === 'loose') {
    const room = w.magazine - u.ammo, take = Math.min(room, u.loose || 0);
    if (room <= 0) return 'Already full.';
    if (!take) return 'No rounds left to load.';
    u.ap -= rAp; u.ammo += take; u.loose = (u.loose || 0) - take; u.jammed = false;
    emitFx(cb, 'reload', { unit: u.id, at: u.pos, weapon: w.id, cat: w.category, how: 'loose', rounds: take, dur: rDur('loose'), ammo: u.ammo, cap: w.magazine });
    cb.log.push(u.name + ' loads ' + take + (take === 1 ? ' round' : ' rounds') + ' (' + u.loose + ' loose left).');
    return null;
  }
  if (!u.mags.some((n) => n > 0)) return 'No loaded spare ' + (w.reload_unit || 'magazine') + 's.' + (u.mags.length && u.loose ? ' Load one first.' : '');
  const typed = !!u.magTypes || !!u.ammoType, types = typed ? typesFor(u.magTypes, u.mags.length) : null;
  const i = u.mags.indexOf(Math.max(...u.mags)), fresh = u.mags.splice(i, 1)[0], freshType = types ? types.splice(i, 1)[0] : null;
  const left = u.ammo, leftType = u.ammoType || null, unit = w.reload_unit || 'magazine';
  const what = left ? 'the ' + unit + ' with ' + left + (left === 1 ? ' round' : ' rounds') + ' still in it' : 'the empty ' + unit;
  if (tactical) { u.mags.push(left); if (types) types.push(leftType); }
  if (types) u.magTypes = types;
  u.ap -= rAp; u.ammo = fresh; u.ammoType = freshType; u.jammed = false;
  emitFx(cb, 'reload', { unit: u.id, at: u.pos, weapon: w.id, cat: w.category, how: 'mag', dur: rDur('mag'), left, ammo: fresh, cap: magazineSize(w.id, u.mods) ?? w.magazine, ...(tactical ? { tactical: true } : {}) });
  if (tactical) cb.log.push(u.name + ' reloads (tactical) and puts ' + what + ' back in the pack (' + u.mags.length + ' spare).');
  else { cb.log.push(u.name + ' reloads and drops ' + what + ' (' + u.mags.length + ' spare left).'); dropToPile(cb, u.pos, [magItem(u.weapon, left, leftType)]); } // no tile in the log: the pile shows it, under fog (review fix)
  return null;
}
/** Reload the off-hand gun (2 AP), or both guns at once (3 AP; spec: Weapons v2, Two guns); tactical +1 (item 679).
 * Each gun takes its own spares (the same pack entry when both hands hold the same model). */
/** Reload both guns' speed price (Two guns: 3 AP, items may change it); the tactical one is this + 1. */
export const reloadBothAp = (u: Unit) => actionAp({ u }, 'reload_both', 3).ap;
export function reloadHands(cb: Combat, u: Unit, hand: 'off' | 'both', tactical = false): string | null {
  { const no = (hand === 'both' ? reloadRefused(u, u.weapon, cb) : null) || reloadRefused(u, u.offWeapon, cb); if (no) return no; }
  const ow = u.offWeapon ? WEAPON[u.offWeapon] : null;
  if (!ow || ow.magazine == null || !ow.reload) return 'Your off hand holds no gun to reload.';
  if (tactical && ow.reload === 'loose') return 'Loaded round by round: there is only one reload.';
  // The off-hand gun is priced as a reload, but it isn't the main hand's: Speed Loader leaves it alone (spec item 564).
  const ap = (hand === 'both' ? reloadBothAp(u) : actionAp({ u }, 'reload', ow.reload_ap ?? 2, { hand: 'off' }).ap) + (tactical ? PILE.tactical_reload_extra_ap : 0);
  if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  const pc = !!u.charId, shared = ow.id === u.weapon, have = u.offAmmo ?? 0, offFull = have >= ow.magazine;
  // A character's off-hand gun reloads only from what it carries (review fix: with no spares entry it reloaded free);
  // an enemy's never runs out (until stat blocks list it).
  if (pc && ow.reload === 'magazine' && !shared && !u.offMags) u.offMags = [];
  const pool = ow.reload === 'loose' ? null : shared ? u.mags : u.offMags;
  if (hand === 'off' && offFull) return 'Already full.';
  let mainFx: FxEvent | null = null;
  if (hand === 'both') {
    const w = WEAPON[u.weapon]; if (w.magazine == null) return 'Your main hand holds no gun.';
    if (offFull && u.ammo >= w.magazine) return 'Already full.';
    if (offFull) return 'The off-hand gun is full: reload the main gun alone.';
    if (u.ammo >= w.magazine && w.reload === 'magazine') return 'The main gun is full: reload the off-hand gun alone.';
    // The main gun first, as before (a refusal throws in the reducer, so nothing it did stays).
    const keep = u.ap, seq = cb.fxSeq || 0; u.ap = 99; const e = reload(cb, u, { both: true, tactical: tactical && w.reload !== 'loose' }); u.ap = keep; if (e && e !== 'Already full.') return e;
    if (u.dead || u.downed) return null; // a held shot felled it as it reached for the magazines (Dead to Rights): no reload, nothing spent
    mainFx = (cb.fx || []).find((f) => f.n > seq && f.k === 'reload' && f.unit === u.id) || null;
  }
  // What goes in: a loose gun takes rounds (a character's from its loose rounds of that calibre); a magazine gun its
  // fullest spare, whose type it takes (item 680; the shared pool's types when both hands hold the same model).
  let fresh: number | null = null, freshType: string | null = null, looseTake = 0;
  if (ow.reload === 'loose') {
    if (!pc) fresh = ow.magazine;
    else { const sameCal = ow.ammo === WEAPON[u.weapon]?.ammo, avail = (sameCal ? u.loose : u.offLoose) || 0; looseTake = Math.min(ow.magazine - have, avail); if (looseTake > 0) fresh = have + looseTake; }
  } else if (!pool) fresh = ow.magazine;
  else if (pool.length && Math.max(...pool) > 0) { const i = pool.indexOf(Math.max(...pool)); fresh = pool[i]; freshType = takeType(u, shared, i, pool.length); pool.splice(i, 1); }
  if (fresh == null) return ow.reload === 'loose' ? 'No rounds left to load.' : 'No loaded spare for the off-hand gun.';
  if (hand === 'off') {
    // The same moment the main reload has ('reload' {u, ap, hand: 'off'}): a held shot waiting for a reload fires first
    // (Dead to Rights); listeners for the main gun's reload skip hand 'off'. Nothing is spent yet: put back what the
    // pool gave if the shot fells it.
    emit(cb, 'reload', { u, ap, cb, hand: 'off', ...(tactical ? { tactical: true } : {}) });
    if (u.dead || u.downed) { if (fresh != null && pool && ow.reload !== 'loose') { pool.push(fresh); pushType(u, shared, freshType, pool.length - 1); } return null; }
  }
  const left = have, leftType = u.offAmmoType ?? null, unit = ow.reload_unit || 'magazine';
  if (ow.reload === 'loose' && pc) { if (ow.ammo === WEAPON[u.weapon]?.ammo) u.loose = (u.loose || 0) - looseTake; else u.offLoose = (u.offLoose || 0) - looseTake; }
  u.offAmmo = fresh; u.offAmmoType = ow.reload === 'loose' ? leftType : freshType; u.ap -= ap;
  const kept = !!pool && ow.reload !== 'loose';
  if (kept && tactical) { pool!.push(left); pushType(u, shared, leftType, pool!.length - 1); }
  // The log names no tile (review fix: the pile shows where it fell, under fog).
  cb.log.push(u.name + (hand === 'both' ? ' reloads both guns' : ' reloads the off-hand gun') + (tactical ? ' (tactical)' : '') + ' (' + ap + ' AP)' + (kept ? (tactical ? '; the off-hand ' + unit + ' goes back in the pack' : '; the off-hand ' + unit + ' drops') : looseTake ? ' (' + looseTake + (looseTake === 1 ? ' round' : ' rounds') + ')' : '') + '.');
  if (kept && !tactical) dropToPile(cb, u.pos, [magItem(ow.id, left, leftType)]);
  // The picture (no rules): the off-hand gun's reload, or, with both guns, the off hand's part of the main reload's event.
  const off = { weapon: ow.id, cat: ow.category, how: ow.reload === 'loose' ? 'loose' : 'mag', left, ammo: fresh, cap: ow.magazine, ...(kept && tactical ? { tactical: true } : {}), ...(!kept ? { noDrop: true } : {}), ...(looseTake ? { rounds: looseTake } : {}) };
  if (mainFx) mainFx.off = off;
  else emitFx(cb, 'reload', { unit: u.id, at: u.pos, ...off, hand: 'off', dur: ap <= 1 ? 800 : off.how === 'loose' ? 1400 : 1200 });
  return null;
}
/** The type of spare i of the off-hand gun's pool (the main hand's spares when both hands hold the same model), taken out. */
function takeType(u: Unit, shared: boolean, i: number, n: number): string | null {
  if (shared) { if (!u.magTypes && !u.ammoType) return null; const t = typesFor(u.magTypes, n); const x = t.splice(i, 1)[0]; u.magTypes = t; return x; }
  if (!u.offMagTypes) return null; const t = typesFor(u.offMagTypes, n); const x = t.splice(i, 1)[0]; u.offMagTypes = t; return x;
}
/** Put a type at index i (the end) of the off-hand gun's pool's types, keeping them in line with the magazines. */
function pushType(u: Unit, shared: boolean, type: string | null, i: number) {
  if (shared) { if (!type && !u.magTypes) return; const t = typesFor(u.magTypes, i); t.push(type); u.magTypes = t; return; }
  if (!type && !u.offMagTypes) return; const t = typesFor(u.offMagTypes, i); t.push(type); u.offMagTypes = t;
}
/** Where a picked-up thing goes in a fight (item 675): a magazine for the main-hand gun joins its spares, one for a
 * different off-hand gun the off hand's, any other magazine the pack after the fight (u.extra); rounds of the main
 * gun's calibre the unit's loose rounds (and the pack); thrown weapons, spare parts and cores the unit's counts (and
 * the pack, so the write-back keeps them); everything else the pack at once. */
export function intoUnit(u: Unit, c: Character, it: PackItem) {
  const addPack = () => { c.pack = packAdd(packOf(c).map((x) => ({ ...x })), it); };
  if (it.mags && it.weapon) {
    if (it.weapon === u.weapon && u.mags) {
      const had = u.mags.length; u.mags.push(...it.mags);
      if (u.magTypes || it.magTypes) u.magTypes = [...typesFor(u.magTypes, had), ...it.mags.map((_, i) => it.magTypes?.[i] ?? null)];
    } else if (it.weapon === u.offWeapon && u.offWeapon !== u.weapon) {
      const had = (u.offMags ||= []).length; u.offMags.push(...it.mags);
      if (u.offMagTypes || it.magTypes) u.offMagTypes = [...typesFor(u.offMagTypes, had), ...it.mags.map((_, i) => it.magTypes?.[i] ?? null)]; // each keeps its type (review fix)
    }
    else (u.extra ||= []).push(...it.mags.map((n, i) => ({ weapon: it.weapon!, rounds: n, ...(it.magTypes?.[i] ? { type: it.magTypes[i] } : {}) })));
    return;
  }
  if (intoCounts(c, it)) return; // a stim joins c.stims, an Essence c.essence (usable at once)
  if (it.calibre && it.calibre === WEAPON[u.weapon]?.ammo) u.loose = (u.loose || 0) + it.qty;
  else if (it.calibre && u.offLoose != null && u.offWeapon && it.calibre === WEAPON[u.offWeapon]?.ammo) u.offLoose += it.qty; // the off-hand gun's own calibre (and the pack)
  else if (WEAPON[it.weapon || it.id]?.category === 'thrown' && !it.mags) { const id = it.weapon || it.id; (u.throwables ||= {})[id] = (u.throwables[id] || 0) + it.qty; }
  else if ((it.item || it.id) === 'spare_parts') u.parts = (u.parts || 0) + it.qty;
  else if ((it.item || it.id) === 'standard_core' && u.mg) u.mg.cores += it.qty;
  addPack();
}
/** Pick up (spec: Magazines and rounds are inventory; rules 1.9): 1 AP, from the pile on your tile or an adjacent one,
 * the entries named (keys or indices; none named: everything). A character's unit only (its pack takes the rest). */
export function pickUp(cb: Combat, u: Unit, tile: string, take?: (string | number)[] | null, c?: Character | null): string | null {
  if (dist(u.pos, tile) > 1) return 'Stand on it or next to it.';
  const objs = objectsOf(cb), p = pileAt(objs, tile);
  if (!p || p.hidden || !p.items?.length) return 'Nothing to pick up there.';
  if (!u.charId || !c) return 'Only a character picks things up.';
  if (u.ap < PICKUP_AP) return 'Needs ' + PICKUP_AP + ' AP.';
  const sel = selectEntries(p, take); if (!sel.length) return 'None of that is there now.';
  u.ap -= PICKUP_AP;
  takeEntries(objs, p, sel);
  const names: string[] = [];
  for (const e of sel) for (const it of entryPack(e)) { names.push(itemLabel(it)); intoUnit(u, c, it); }
  emitFx(cb, 'pickup', { unit: u.id, at: tile, items: names });
  emitFx(cb, 'pile', { at: tile, id: p.id, count: (p.items || []).length, why: 'take' });
  cb.log.push(u.name + ' picks up ' + names.join(', ') + ' at ' + refOf(tile) + '.');
  return null;
}
/** Load a spare magazine from loose rounds (spec: Loading): 1 AP per 5 rounds; part-loads when AP runs short. */
export const ROUNDS_PER_AP = 5;
export function loadMagazine(cb: Combat, u: Unit): string | null {
  const w = WEAPON[u.weapon];
  if (!w || w.reload !== 'magazine' || !u.mags || !weaponActions(u).some((x) => x.id === 'load')) return 'Nothing to load.';
  const cap = w.magazine || 0, open = u.mags.map((n, i) => [n, i]).filter(([n]) => n < cap).sort((a, b) => b[0] - a[0]);
  if (!open.length) return 'Every spare ' + (w.reload_unit || 'magazine') + ' is full.';
  if (!u.loose) return 'No loose rounds to load.';
  if (u.ap < 1) return 'Needs 1 AP.';
  const [n, i] = open[0], rounds = Math.min(cap - n, u.loose, u.ap * ROUNDS_PER_AP), cost = Math.ceil(rounds / ROUNDS_PER_AP);
  u.mags[i] = n + rounds; u.loose -= rounds; u.ap -= cost; emitFx(cb, 'load', { unit: u.id, at: u.pos, rounds, dur: Math.min(2000, 900 + 250 * cost) });
  cb.log.push(u.name + ' loads ' + rounds + (rounds === 1 ? ' round' : ' rounds') + ' into a ' + (w.reload_unit || 'magazine') + ' (' + u.mags[i] + '/' + cap + ') for ' + cost + ' AP.');
  return null;
}
/** Shoot cover on purpose (spec: Cover): the weapon's attack AP and ammo, no roll, the weapon's damage. */
export function shootCover(cb: Combat, u: Unit, tile: string, who: Character | null): string | null {
  const c = objectsAt(cb, tile).find((x) => x.hp != null && x.hp > 0); if (!c) return 'Nothing there to shoot.';
  // Breaking cover is priced through the items ('ap_cost:break'; Siege Engine: hooks gap A1), at least 1 AP.
  const w = WEAPON[u.weapon], melee = isMelee(w), ap = Math.max(1, actionAp({ u }, 'break', attackApCost(w, melee ? 'melee' : 'shot')).ap);
  if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  const r = dist(u.pos, tile);
  if (melee) { if (r > 1) return 'Out of melee reach.'; }
  else {
    if (u.jammed) return 'Weapon jammed: clear it (2 AP).';
    if (w.magazine != null && u.ammo <= 0) return 'Empty: reload (2 AP).';
    if (!lineOfSight(cb, u.pos, tile)) return 'No line of sight.';
    if (Math.ceil(r / effectiveRange(w)) - 1 > 2) return 'Out of range.';
    if (w.magazine != null && !u.infiniteAmmo) u.ammo--; if (!u.infiniteAmmo) u.heat += 1;
  }
  u.ap -= ap;
  if (u.maxDur) u.dur = Math.max(0, (u.dur ?? u.maxDur) - 1); // an attack action wears 1 (spec: Weapons v2)
  const fx: any = (w as any).grants?.effect || {};
  emitFx(cb, melee ? 'melee' : 'shot', { unit: u.id, target: null, from: u.pos, to: tile, weapon: w.id, cat: w.category, mode: 'shot', hit: true, crit: false, fumble: false, dmg: 0, killed: false, object: true });
  cb.log.push(u.name + (melee ? ' smashes' : ' shoots') + ' the ' + c.name.toLowerCase() + ' at ' + refOf(tile) + damageObject(cb, tile, weaponDamage(w, r, who?.skills.raw_power || 0) * (who ? weaponMult(who, w.id) : 1) * (fx.op === 'cover_damage_mult' ? fx.value : 1)) + '.');
  return null;
}
/** Analyze (spec: Analyze): 2 AP, 1 with Quick Read (Analysis 3); range 4 + Analysis; line of sight; no roll. */
export const analyzeCost = (u: Unit) => actionAp({ u }, 'analyze', (u.analysis || 0) >= 3 ? 1 : 2).ap;
export function analyze(cb: Combat, u: Unit, t: Unit): string | null {
  if (t.side !== 'foe' || t.dead) return 'Pick a living enemy.';
  if (t.analyzedBy) return t.name + ' is already analyzed.';
  const cost = analyzeCost(u), range = 4 + (u.analysis || 0);
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  if (dist(u.pos, t.pos) > range) return 'Out of Analyze range (' + range + ' tiles).';
  if (!lineOfSight(cb, u.pos, t.pos)) return 'No line of sight.';
  u.ap -= cost; t.analyzedBy = u.name; emitFx(cb, 'analyze', { unit: u.id, target: t.id, from: u.pos, to: t.pos }); t.weakPoint = (u.analysis || 0) >= 5;
  emit(cb, 'analyze', { u, t, ap: cost, cb });
  cb.log.push(u.name + ' analyzes ' + t.name + ': HP ' + t.hp + '/' + t.maxHp + ', Defense ' + t.def + ', armour ' + t.armour + (t.weakPoint ? ' · Read Them: it deals 15% less damage to the squad' : '') + '.');
  return null;
}
export function clearJam(cb: Combat, u: Unit): string | null {
  if (!u.jammed) return 'Not jammed.';
  const cost = actionAp({ u }, 'clear_jam', 2).ap;
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  // 'jam_clear' {u, ap, keepHeat}: an item may keep the Heat (Gun Nut's free clear doesn't reset it, plan 6a-29).
  const jc: any = emit(cb, 'jam_clear', { u, ap: cost, keepHeat: false, cb });
  u.ap -= cost; u.jammed = false; if (!jc.keepHeat) u.heat = 0; emitFx(cb, 'clear', { unit: u.id, at: u.pos, dur: 1000 });
  cb.log.push(u.name + ' clears the jam.');
  return null;
}
/** Stim (spec: Downed and dying; Medic Triage): an adjacent ally. Downed: stabilise at 1 HP (1 AP Medic, 2 AP others). Else heal 30 × Healing given. */
export function useStim(cb: Combat, u: Unit, t: Unit, who: Character, isMedic: boolean): string | null {
  if (who.stims <= 0) return 'No stims left.';
  if (dist(u.pos, t.pos) > 1) return 'Must be adjacent.';
  if (t.dead) return 'Too late.';
  const cost = stimAp(u, t, isMedic);
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  if (forbids({ u }, 'stim')) return forbids({ u }, 'stim') + ': no stims.';
  // 'stim_start' {u, t, cb, cancel, why}: an item may stop the stim before anything is spent, revive included (Rival's
  // Petty). It is not a refusal (the item's own rolls stand): nothing is used and the line says why.
  { const ss: any = emit(cb, 'stim_start', { u, t, cb, cancel: false, why: '' }); if (ss.cancel) { cb.log.push(u.name + ' doesn\'t stim ' + t.name + (ss.why ? ' (' + ss.why + ')' : '') + '.'); return null; } }
  u.ap -= cost; who.stims--;
  const hpWas = t.hp, wasDown = t.downed;
  if (t.bleed) { t.bleed = 0; cb.log.push('The stim stops ' + t.name + '\'s bleeding.'); }
  if (t.downed) { t.downed = false; t.hp = 1; t.saves = { ok: 0, fail: 0 }; cb.log.push(u.name + ' stims ' + t.name + ': stabilised at 1 HP.'); emit(cb, 'heal_given', { t, by: u, n: 1, kind: 'stim', revived: true, cb }); calmTend(cb, u, t); }
  else { const r = healUnit(cb, t, 30 * healingMult(who), u, 'stim'); cb.log.push(u.name + ' stims ' + t.name + ': +' + r.restored + ' HP.'); calmTend(cb, u, t); } // a stim given is tending, full HP or not (rules 1.5, 3.3)
  emitFx(cb, 'stim', { unit: u.id, target: t.id, from: u.pos, to: t.pos, heal: t.hp - (wasDown ? 0 : hpWas), revive: wasDown });
  return null;
}

/** A stim's AP: stabilising a Downed ally 2 (1 for a Medic), healing 1; then items ('stabilise' / 'stim' costs). */
export const stimAp = (u: Unit, t: Unit, isMedic: boolean) => (t.downed ? actionAp({ u }, 'stabilise', isMedic ? 1 : 2).ap : actionAp({ u }, 'stim', 1).ap);

/** Enemy turn: shoot the most hurt PC in sight and range; otherwise close in. Deterministic given the RNG. The AI
 * also keeps the conditions' rules (rules 1.3): it puts itself out when Burning, breaks a grapple, recovers a dropped
 * weapon, attacks the one who Taunted it, never attacks or closes on what it fears, obeys a Commanded order, and
 * ignores Hidden PCs (it doesn't know where they are). An enemy a False Image fooled sees the image where its owner
 * stands (illusion.ts: it attacks and closes on the image instead). enemyIntent below reads the same choices without
 * acting (the Trickster's Read). */
/** Steps an engine system outside this file gives the enemy AI (physical/ai.ts: a technique), tried where the plain
 * attack would be. plan says what it would do now, changing nothing (the intent line); act does it and returns true. */
export interface EnemyStep { plan(cb: Combat, u: Unit): { text: string; targetId?: string } | null; act(cb: Combat, rng: Rng, u: Unit): boolean }
const ENEMY_STEPS: EnemyStep[] = [];
/** first: tried before the steps already registered (a Call comes before a technique: calls/ai.ts). */
export const enemyStep = (s: EnemyStep, first = false) => { if (first) ENEMY_STEPS.unshift(s); else ENEMY_STEPS.push(s); };
export function enemyTurn(cb: Combat, rng: Rng) {
  const u = active(cb)!;
  const order = condOn(u, 'commanded') ? u.condArg?.commanded || 'halt' : null;
  const stood = new Set<string>([u.pos]); // the tiles it has stood on this turn: it doesn't pace between them
  for (let step = 0; step < 6 && u.ap > 0 && !cb.over; step++) {
    stood.add(u.pos);
    // 'enemy_action_start' {u, step}: before each enemy action; an item may open a window (Between Heartbeats) or set
    // ctx.skip to make the enemy lose the action. A window pauses the enemy until it closes.
    const ea: any = emit(cb, 'enemy_action_start', { u, step, skip: false, cb, rng });
    if (cb.window || u.dead || u.downed || u.surrendered) break;
    if (ea.skip) continue; // the handler took the action away (and its AP)
    if (condOn(u, 'burning') && u.ap >= 1) { extinguishSelf(cb, u); continue; }
    if (condOn(u, 'grappled') && u.ap >= 2) { escapeHold(cb, rng, u); continue; }
    if (u.nailed && u.ap >= u.nailed.ap) { pullFree(cb, u); continue; } // rules 1.12
    if ((condOn(u, 'disarmed') && u.ap >= 2) || (condOn(u, 'lowered') && u.ap >= 1)) { recoverHeld(cb, u); continue; }
    if (u.prone && u.ap >= 1 && order !== 'kneel') { toggleProne(cb, u); continue; }
    if (u.jammed && u.ap >= 2) { clearJam(cb, u); continue; }
    if (enemyScuff(cb, u)) continue;
    // Sigil casters (rules 1.4): step out of a hostile field, scuff a turret underfoot, then weigh a spell against the weapon.
    // Sigil magic (rules 1.4, ai-sigil.ts): any enemy steps out of a field of yours and scuffs a turret underfoot; a caster
    // then weighs a spell against its weapon.
    if (!order && aiSigilStep(cb, rng, u)) { checkOver(cb); continue; }
    // Soul casters (rules 1.5, ai-soul.ts): Begin, Pump, hold for the big release, watch with the heart, calm the Strain.
    if (!order && aiSoulStep(cb, rng, u)) { checkOver(cb); continue; }
    const w = WEAPON[u.weapon];
    if (enemyNeedsReload(u) && u.ap >= 2) { reload(cb, u); continue; }
    if (!order && ENEMY_STEPS.some((s) => s.act(cb, rng, u))) { checkOver(cb); continue; } // Physical 2.0: a technique it wants more than a plain attack
    const mode = enemyMode(u), pcs = perceivedFoes(cb, u);
    const targets = enemyTargets(cb, u, mode, order, pcs);
    if (targets.length) { const t = targets[0].t; if (isGhost(t)) strikeImage(cb, u, t, mode); else resolveAttack(cb, rng, u, t, mode, null); checkOver(cb); continue; }
    if (!order && aiClearBlock(cb, rng, u)) { checkOver(cb); continue; } // a turret of yours that threatens it, a RAISE wall in its way
    if (order === 'halt' || order === 'kneel' || moveBlock(u)) break;
    if (!pcs.length) break;
    const best = enemyCloseTile(cb, u, mode, order, pcs, w, stood);
    if (!best || moveUnit(cb, u, best.tile, rng)) break;
  }
}
const enemyDry = (u: Unit) => { const w = WEAPON[u.weapon]; return w.magazine != null && u.ammo <= 0 && !(u.mags || []).some((n) => n > 0); };
const enemyNeedsReload = (u: Unit) => { const w = WEAPON[u.weapon]; return w.magazine != null && u.ammo <= 0 && !enemyDry(u) && !condOn(u, 'disarmed'); };
const enemyMode = (u: Unit): 'melee' | 'shot' => (isMelee(WEAPON[u.weapon]) || enemyDry(u) || condOn(u, 'disarmed') ? 'melee' : 'shot');
/** The PCs an enemy would attack now, best first: its Taunter, standing before Downed, the most hurt, the likeliest hit. */
function enemyTargets(cb: Combat, u: Unit, mode: 'melee' | 'shot', order: string | null, pcs: Unit[]) {
  const tauntBy = condSource(u, 'taunted');
  const ownerOf = (t: Unit) => (t as any).ghostOf || t.id;
  return order === 'hold' || order === 'flee' ? [] : pcs
    .map((t) => ({ t, pv: previewAttack(cb, u, t, mode) }))
    .filter((x) => x.pv.ok)
    .sort((a, b) => (ownerOf(b.t) === tauntBy ? 1 : 0) - (ownerOf(a.t) === tauntBy ? 1 : 0) || (a.t.downed ? 1 : 0) - (b.t.downed ? 1 : 0) || a.t.hp - b.t.hp || b.pv.pct - a.pv.pct);
}
/** Where an enemy closes in: the reachable tile that is nearest a living PC and has line of sight to one (Afraid: never
 * nearer the source; fleeing: the tile farthest from every PC). 'ai_move_risk' {u, from, to, risk} lets items add to a
 * tile's cost (Anchor: walking away from a Defender who will strike), only while someone listens. Pure. */
function enemyCloseTile(cb: Combat, u: Unit, mode: 'melee' | 'shot', order: string | null, pcs: Unit[], w = WEAPON[u.weapon], stood?: Set<string>): { tile: string; near: Unit | null } | null {
  const P = paths(cb, u.pos, u.id);
  const fearOf = condSource(u, 'fear'), fu0 = fearOf ? cb.units.find((x) => x.id === fearOf) : null;
  // Threatened (a Call, rules 1.13): it doesn't close on the one who threatened it this turn (as with what it fears).
  const cowBy = u.call?.cowed ? cb.units.find((x) => x.id === u.call!.cowed!.by && alive(x)) : null, fu = fu0 && !fu0.dead ? fu0 : cowBy || fu0, fu2 = fu === cowBy ? null : cowBy;
  const risky = anyOn(cb, 'ai_move_risk');
  // A False Image it was fooled by is someone standing there, as far as it knows (spec item 573): never a tile to end on.
  const imaged = new Set(pcs.filter((t) => isGhost(t)).map((t) => t.pos));
  // Where it stands is the tile to beat: a move that gains nothing is not made (it used to take the best OTHER tile
  // every step, so an enemy with nothing to attack walked back and forth between two equal tiles), and it never walks
  // back onto a tile it already stood on this turn.
  const walls = sightBlockers(cb), reach = mode === 'melee' ? 1 : effectiveRange(w); // (once for the whole map, not once a tile)
  const score0 = (k: string, tiles: number) => { const near = Math.min(...pcs.map((t) => dist(k, t.pos)));
    const sees = pcs.some((t) => dist(k, t.pos) <= reach && lineOfSight(cb, k, t.pos, false, walls));
    // (a tile with a line on someone is as good as any other such tile: a shooter doesn't creep closer with its spare AP)
    return order === 'flee' ? -near + tiles * 0.01 : (sees ? 0 : 100 + near) + tiles * 0.1; };
  let best: string | null = null, bestScore = score0(u.pos, 0) - 0.05;
  for (const [k, tiles] of Object.entries(P.dist)) {
    if (k === u.pos || imaged.has(k) || stood?.has(k) || apForTiles(tiles, u.bank, u.movement) > u.ap - (u.ap > 2 ? 2 : 0)) continue;
    if (fu && !fu.dead && dist(k, fu.pos) < dist(u.pos, fu.pos)) continue;
    if (fu2 && dist(k, fu2.pos) < dist(u.pos, fu2.pos)) continue;
    let score = score0(k, tiles) + aiRouteRisk(cb, u, P, k); // around known fields and spotted traps
    if (risky) score += (emit(cb, 'ai_move_risk', { u, from: u.pos, to: k, risk: 0, cb }) as any).risk || 0;
    if (score < bestScore) { bestScore = score; best = k; }
  }
  // Nothing nearer or in sight within this turn's reach, and it sees nobody from here: head for the nearest tile anywhere
  // that has a line on someone (around a wall, not up against it), one turn's walk at a time.
  if (!best && order !== 'flee' && !risky && score0(u.pos, 0) >= 100) { // (not when an item prices the walk: Anchor's blow is weighed tile by tile above)
    let goal: string | null = null, gd = Infinity;
    for (const [k, tiles] of Object.entries(P.dist)) { if (k === u.pos || imaged.has(k) || tiles >= gd || score0(k, 0) >= 100) continue; if (fu && !fu.dead && dist(k, fu.pos) < dist(u.pos, fu.pos)) continue; gd = tiles; goal = k; }
    if (goal) { const G = paths(cb, goal, u.id); let bd = G.dist[u.pos] ?? Infinity;
      for (const [k, tiles] of Object.entries(P.dist)) { if (k === u.pos || imaged.has(k) || stood?.has(k) || apForTiles(tiles, u.bank, u.movement) > u.ap) continue; const d = k === goal ? 0 : G.dist[k]; if (d != null && d < bd) { bd = d; best = k; } } }
  }
  if (!best) return null;
  const b = best;
  return { tile: b, near: [...pcs].sort((a, c) => dist(b, a.pos) - dist(b, c.pos))[0] || null };
}
/** What an enemy means to do on its next turn (the Trickster's Read): the first thing enemyTurn would do, read with a
 * fresh turn's AP and nothing rolled or changed. Sigil and Soul casters are named as weighing a spell (their planners
 * keep per-turn state), with the weapon choice that follows if they don't cast. */
export interface Intent { kind: 'none' | 'lost' | 'order' | 'recover' | 'scuff' | 'spell' | 'outburst' | 'reload' | 'attack' | 'move' | 'wait'; text: string; targetId?: string; to?: string; image?: string }
export function enemyIntent(cb: Combat, u: Unit): Intent {
  if (u.dead || u.downed || u.surrendered) return { kind: 'none', text: 'nothing: it is out of the fight' };
  if (condOn(u, 'stunned')) return { kind: 'lost', text: 'nothing: Stunned, it loses the turn' };
  const save = { ap: u.ap, bank: u.bank, shots: u.shotsThisTurn, moved: u.moved };
  u.ap = AP_BASE; u.bank = 0; u.shotsThisTurn = 0; u.moved = false;
  try { return intentInner(cb, u); } finally { u.ap = save.ap; u.bank = save.bank; u.shotsThisTurn = save.shots; u.moved = save.moved; }
}
const AP_BASE = 6;
function intentInner(cb: Combat, u: Unit): Intent {
  const order = condOn(u, 'commanded') ? u.condArg?.commanded || 'halt' : null;
  if (order) return { kind: 'order', text: 'obey its order (' + order.split(':')[0] + ')' };
  if (condOn(u, 'burning')) return { kind: 'recover', text: 'beat out the flames on it' };
  if (condOn(u, 'grappled')) return { kind: 'recover', text: 'break the grapple' };
  if (u.nailed) return { kind: 'recover', text: 'pull itself free' };
  if (condOn(u, 'disarmed') || condOn(u, 'lowered')) return { kind: 'recover', text: 'recover its weapon' };
  if (u.prone) return { kind: 'recover', text: 'stand up' };
  if (u.jammed) return { kind: 'recover', text: 'clear its jammed weapon' };
  if ((cb.glyphs || []).some((g) => g.pos === u.pos && g.side !== u.side && !(g as any).keystone)) return { kind: 'scuff', text: 'scuff the glyph under its feet' };
  const caster = u.mg?.evoker && (u.mg.words || []).length ? 'spell' : u.mg && !u.mg.evoker && u.mg.emanator && (u.mg.designs || []).length ? 'outburst' : null;
  let then = '';
  if (enemyNeedsReload(u)) return { kind: 'reload', text: 'reload' };
  const mode = enemyMode(u), pcs = perceivedFoes(cb, u), targets = enemyTargets(cb, u, mode, order, pcs);
  let out: Intent;
  const step = ENEMY_STEPS.map((s) => s.plan(cb, u)).find(Boolean);
  if (step) out = { kind: 'attack', text: step.text, ...(step.targetId ? { targetId: step.targetId } : {}) };
  else if (targets.length) {
    const t = targets[0].t, ghost = isGhost(t), owner = ghost ? cb.units.find((x) => x.id === (t as any).ghostOf) : t;
    out = { kind: 'attack', text: (mode === 'melee' ? 'strike ' : 'shoot ') + (ghost ? owner!.name + "'s False Image at " + refOf(t.pos) + ' (it takes the image for ' + owner!.name + ')' : t.name), targetId: owner!.id, ...(ghost ? { image: t.id } : {}) };
  } else if (moveBlock(u) || !pcs.length) out = { kind: 'wait', text: 'hold where it is' };
  else {
    const best = enemyCloseTile(cb, u, mode, order, pcs);
    out = best ? { kind: 'move', text: 'move to ' + refOf(best.tile) + (best.near ? ' toward ' + (isGhost(best.near) ? 'the False Image of ' + (cb.units.find((x) => x.id === (best.near as any).ghostOf)?.name || 'someone') : best.near.name) : ''), to: best.tile, ...(best.near ? { targetId: (best.near as any).ghostOf || best.near.id } : {}) } : { kind: 'wait', text: 'hold where it is' };
  }
  if (caster) { then = out.text; return { ...out, kind: caster, text: (caster === 'spell' ? 'weigh a Sigil spell against its weapon' : u.mg!.held ? 'hold or release its Outburst (stage ' + u.mg!.held.stage + ')' : 'begin an Outburst') + '; otherwise ' + then }; }
  return out;
}
const extinguishSelf = (cb: Combat, u: Unit): boolean => { u.ap -= 1; endCond(u, 'burning', cb); cb.log.push(u.name + ' beats out the flames.'); return true; };
function escapeHold(cb: Combat, rng: Rng, u: Unit) { escapeGrappleT(cb, rng, u); }
function recoverHeld(cb: Combat, u: Unit) { recoverWeaponT(cb, u); }

export const combatXp = (cb: Combat) => COMBAT_XP[cb.difficulty] || 50;
export const die6 = (rng: Rng) => die(rng, 6);

// ---------- weapon-granted actions (plan 2.9) ----------
/** Can this weapon jam? Guns with a Heat limit can; bows, crossbows, the flamer, the breacher tube and the core rifle
 * can't (a natural 1 fumbles instead). A weapons.json `handling.deny: ['clear']` or `grant: ['clear']` overrides. */
/** Does nothing jam this unit's main-hand weapon (Tuned, Improvisation 5: the 'never_jams' query)? */
export const neverJams = (cb: Combat | null, u: Unit): boolean => statQuery({ u, cb }, 'never_jams').add > 0;
export function canJam(w: WeaponDef | undefined): boolean {
  if (!w || isMelee(w) || w.magazine == null) return false;
  const hd: any = (w as any).handling || {};
  if ((hd.deny || []).includes('clear')) return false; if ((hd.grant || []).includes('clear')) return true;
  return w.heat_limit != null;
}
/** Reload AP: the weapon's reload_ap (default 2; the breacher tube 3), 1 with a quick-release magazine, then items. */
export const reloadAp = (u: Unit) => { const w: any = WEAPON[u.weapon] || {}; return actionAp({ u }, 'reload', hasMod(u.mods, 'mod_quick_release') ? 1 : w.reload_ap ?? 2).ap; };
const RELOAD_LABEL: Record<string, string> = { magazine: 'Swap magazine', speedloader: 'Speedloader', drum: 'Swap drum', belt: 'Feed belt' };
const LOOSE_LABEL: Record<string, string> = { arrow: 'Nock an arrow', bolt: 'Load a bolt', 'fuel canister': 'Swap canister', 'core charge': 'Charge', rocket: 'Load a rocket', shell: 'Load shells', '40 mm grenade': 'Load a grenade' };
export interface WeaponAction { id: 'reload' | 'load' | 'clear' | 'brace' | 'repair' | 'overwatch' | 'burst' | 'auto' | 'skill'; label: string; ap: number; why: string | null; text: string;
  /** The reload's tactical variant (rules 1.9): its AP and why it can't be used now. */
  tactical?: { ap: number; why: string | null } }
/** The actions a unit's weapon grants, and why each can't be used now (null when it can). The UI shows exactly these:
 * an action the weapon doesn't grant never shows (a bow has no Clear jam; a revolver's reload is a Speedloader). */
export function weaponActions(u: Unit): WeaponAction[] {
  const w: any = WEAPON[u.weapon]; if (!w) return [];
  const hd = w.handling || {}, deny = new Set<string>(hd.deny || []), grant = new Set<string>(hd.grant || []);
  const out: WeaponAction[] = [], add = (a: WeaponAction) => { if (!deny.has(a.id)) out.push(a); };
  const melee = isMelee(w), ap = u.ap ?? 0, need = (n: number) => (ap < n ? 'Needs ' + n + ' AP.' : null);
  if (w.magazine != null && w.reload) {
    const r = reloadAp(u), unit = w.reload_unit || 'magazine';
    const label = w.reload === 'loose' ? LOOSE_LABEL[w.ammo] || 'Load rounds' : RELOAD_LABEL[w.reload_unit] || 'Reload';
    const why = reloadRefused(u, w.id, null) || (u.jammed ? 'Jammed: clear it first.' : u.ammo >= (magazineSize(w.id, u.mods) ?? w.magazine) ? 'Already full.' : u.mags && w.reload !== 'loose' && !u.mags.some((n) => n > 0) ? 'No loaded spare ' + unit + 's.' : w.reload === 'loose' && u.mags && !(u.loose || 0) ? 'No rounds left to load.' : need(r));
    // Rules 1.9 (item 679): a magazine weapon with tracked spares also offers the tactical reload (+1 AP; the old one goes back in the pack).
    const tac = w.reload !== 'loose' && u.mags ? { ap: r + PILE.tactical_reload_extra_ap, why: why && /^Needs/.test(why) || !why ? need(r + PILE.tactical_reload_extra_ap) : why } : undefined;
    add({ id: 'reload', label, ap: r, why, text: w.reload === 'loose' ? 'Top up from loose rounds (' + (u.loose ?? 0) + ' carried). Nothing drops.' : 'Swap in your fullest spare ' + unit + ' (' + (u.mags ? u.mags.length + ' left' : 'unlimited') + '). Speed: the one in the gun drops into the pile on your tile, rounds still in it. Tactical (+' + PILE.tactical_reload_extra_ap + ' AP): it goes back in your pack.', ...(tac ? { tactical: tac } : {}) });
  }
  if (w.reload === 'magazine' && u.mags && u.mags.length) {
    const cap = w.magazine || 0, open = u.mags.filter((n) => n < cap), unit = w.reload_unit || 'magazine';
    const why = !open.length ? 'Every spare ' + unit + ' is full.' : !u.loose ? 'No loose rounds to load.' : need(1);
    add({ id: 'load', label: unit === 'magazine' ? 'Load a magazine' : 'Fill a ' + unit, ap: 1, why, text: 'Load loose rounds into your fullest part-empty ' + unit + ', 1 AP per ' + ROUNDS_PER_AP + ' rounds.' });
  }
  if (canJam(w) || grant.has('clear')) { const c = actionAp({ u }, 'clear_jam', 2).ap; add({ id: 'clear', label: 'Clear jam', ap: c, why: !u.jammed ? 'Not jammed.' : need(c), text: 'A jammed gun can\'t fire until cleared. Clearing resets Heat.' }); }
  const braces = weaponBraces(u);
  // Rules 1.13: anyone with a Guard pool (Durability 1+) may Brace, whatever the weapon: it is how Guard is gained.
  const pool = u.resMax?.guard != null;
  if (braces || pool) add({ id: 'brace', label: 'Brace', ap: 1, why: u.braced ? 'Already braced.' : need(1), text: (braces ? 'Set the weapon: no −2 for the LMG, the .700 can fire, Recoil halved.' : 'Set yourself.') + (pool ? ' You gain ' + (GUARD_RULES().brace_gain ?? 2) + ' Guard (' + ((GUARD_RULES().brace_gain ?? 2) + (GUARD_RULES().brace_shield_gain ?? 1)) + ' with a shield).' : '') + ' Moving ends it.' });
  if (u.maxDur) { const c = actionAp({ u }, 'field_repair', 2).ap; add({ id: 'repair', label: 'Field Repair', ap: c, why: (u.proficiency || 0) < 3 ? 'Needs Proficiency 3.' : !(u.parts || 0) ? 'No spare parts.' : (u.dur ?? u.maxDur) >= u.maxDur ? 'Already in full repair.' : need(c), text: 'Proficiency 3+, one spare-parts charge: +10% durability, +5% per Proficiency above 3.' }); }
  const owAp = attackApCost(w, melee ? 'melee' : 'shot');
  add({ id: 'overwatch', label: melee ? 'Hold a strike' : 'Overwatch', ap: owAp, why: need(owAp), text: melee ? 'Hold a strike until your next turn: the first enemy that moves into your reach takes it, as your reaction.' : 'Hold a shot until your next turn: the first enemy that moves in your sight and range takes it, as your reaction.' });
  for (const m of ['burst', 'auto'] as const) if ((w.modes || []).includes(m)) add({ id: m, label: m === 'auto' ? 'Full auto' : 'Burst', ap: m === 'auto' ? 4 : 3, why: null, text: '' });
  // An item may replace the weapon's own skill (stat 'hide_weapon_skill' > 0: Old School's Fan the Hammer: hooks gap C6).
  if (w.grants && !((u.charId || u.held) && statQuery({ u }, 'hide_weapon_skill', { weapon: w.id, skill: w.grants.name }).add > 0)) add({ id: 'skill', label: w.grants.name + (w.grants.effect?.op === 'narrator' ? ' (Narrator)' : ''), ap: w.grants.effect?.ap || 0, why: null, text: w.grants.text || '' });
  // A unit with a fixed action list (the drone: move and shoot, item 370) has none of the weapon's other actions.
  return u.allowedActions ? out.filter((a) => u.allowedActions!.includes(a.id)) : out;
}
