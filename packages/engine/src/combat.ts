// Grid combat (spec: Combat on the grid; Attacks, damage and armour; Weapons; Downed and dying).
import { ENEMY, WEAPON, COMBAT_XP, SKILLS, type WeaponDef } from './data';
import { type Character, type Injury, ARMOUR, ONE_HANDED, loadedOf, spareMags, packOf, overweightKg, RARITY, maxDurOf, weaponDurOf, gearBonus, gearHas, gearEffects, hasMod, magazineSize, critMult, defense, healingMult, initiativeBonus, injuryResistPct, mainHandSide, maxHp, mod, movement, physicalMult,
  saveBonus, debuffStrength, critTakenPct, elementalTakenPct, ambushTakenPct, healReceivedMult, counterBonus, throwRange, ambushMult, blessingPower, stealthOf, classResources } from './character';
import { type Rng, d20, die } from './rng';
import { type MagicUnit, type Glyph, type Zone, magicOf, magicTurnStart, magicRoundTick, zoneEnter, veilTiles, magicLit, SIGIL_REV, enemyMagic, enemyCast, enemyAvoidMagic, sigilSpot, condHit, condOn, condSource, condSkillMod, condTurnEnd, condSourcesCheck, endCond, applyCond, shiftMana, enemyScuff, noteDeaths } from './magic';
import { type FoeTraits as FoeTraitsT, escapeGrapple as escapeGrappleT, recoverWeapon as recoverWeaponT, AMMO_TYPES, ammoId, damageTypeOf, isExplosive, radiusOf, isSilent, stackDamage, VS_CAP, ambushReady, reveal, canReact, useReaction, spotHidden, companionUnits, applyFoeTraits, resGain, type FoeTraits } from './tactics';
import { armFoe, aiSigilStep, aiClearBlock, aiRouteRisk } from './ai-sigil';
import { type MapObject, OBJ, makeObject, kindOf, blocksMove, blocksSight, coverKind, isDifficult, isTrap, hazardOf, lightOf } from './objects';
import { emit, anyOn, heldOfChar, boundGame as boundGameRef } from './effects/hooks';
import type { Held } from './effects/collect';
import { applyDamage, healUnit } from './effects/damage';
import { turnAp } from './effects/ap';
import { skillRollMod, actionAp, immune, forbids } from './effects/core';
import { statQuery } from './effects/hooks';
import { noteFallbacks } from './effects/narrator';
import { windowStep } from './effects/actions';

/** cover = half cover tiles, full = full cover tiles (spec: Cover). */
export interface MapDef { id: string; name: string; w: number; h: number; solid: string[]; cover: string[]; full?: string[]; difficult: string[]; pcStart: string[]; foeStart: string[];
  /** What is where, by grid reference (spec: Grid references): shown on hover and given to the Narrator. */
  notes?: { at: string; text: string }[];
  /** Objects the map starts with, beyond its cover lists (spec: Map objects). */
  dark?: boolean;
  objects?: { kind: string; at: string; name?: string; text?: string; hidden?: boolean; locked?: boolean; to?: string; sprite?: string; spriteBox?: { w: number; h: number; dx: number; dy: number }; portrait?: string; approaches?: { label: string; skills: string[]; tn: number; stakes: string; success?: string }[] }[] }

/** The M813 rear landing pad from the Combat prototype; a generic yard for anything else. */
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
  yard: {
    id: 'yard', name: 'Open ground', w: 16, h: 11, solid: [],
    cover: ['5,3', '5,4', '7,1', '8,9'], full: ['10,6', '10,7'], difficult: ['7,5', '8,5', '7,6'],
    pcStart: ['1,4', '1,6', '2,5', '1,8', '2,2', '1,2'], foeStart: ['14,5', '14,3', '14,7', '13,4', '13,6', '15,5', '13,9'],
    notes: [
      { at: 'A1–P11', text: 'Open ground. Whatever the Narrator says this place is.' },
      { at: 'F4–F5, H2, I10', text: 'Low walls and debris: half cover.' },
      { at: 'K7–K8', text: 'A thick pillar: full cover.' },
      { at: 'H6–I6, H7', text: 'Rough ground: slow going.' },
    ],
  },
};

export interface Unit {
  id: string; side: 'pc' | 'foe'; name: string; short: string; charId?: string; img?: string; tier?: string;
  pos: string; hp: number; maxHp: number; def: number; armour: number; attack: number; weapon: string; movement: number; init: number; agility: number;
  ap: number; bank: number; ammo: number; heat: number; jammed: boolean; shotsThisTurn: number;
  downed: boolean; dead: boolean; saves: { ok: number; fail: number }; stunnedNext: number; kills: number;
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
  extra?: { weapon: string; rounds: number }[];
  /** Analyzed (spec: Analyze): the squad sees this enemy's numbers; weakPoint adds +15% squad damage. */
  analyzedBy?: string; weakPoint?: boolean; analysis?: number; vigilant?: number; overweight?: number;
  /** Stances and reactions (spec: Prone; Brace; Overwatch; reactions). */
  prone?: boolean; braced?: boolean; overwatch?: 'shot' | 'aimed' | 'melee' | null; reactedRound?: number; vision?: number; sensory?: number; noSprint?: boolean; strength?: number;
  /** Weapons v2 (spec): the weapon's condition and mods, gear effects, and per-turn flags. */
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
  /** PC saves and debuff strength by family, and item modifiers to d20 rolls by skill (the global ruling: item skill
   * mods reach every d20 that uses the skill), fixed when the unit is built. */
  sv?: Record<'body' | 'brain' | 'heart', number>; dbf?: Record<'body' | 'brain' | 'heart', number>; sk?: Record<string, number>;
  /** Conditions' sources (unit ids), orders (Commanded) and the ones put on during the bearer's own turn. */
  condBy?: Record<string, string>; condArg?: Record<string, string>; condFresh?: string[];
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
  /** This turn is lost (Stunned): the engine passes it. */
  skipTurn?: boolean;
  /** Derived stats (spec: Derived stats) the damage chain reads: percent of critical, elemental and ambush damage not
   * taken, healing and shields received multiplier, Counter bonus, Throwing range, Ambush multiplier, Blessing power,
   * the Ingenuity modifier (spotting), and Stealth. */
  critTaken?: number; elemTaken?: number; ambushTaken?: number; healRecv?: number; counter?: number; throwRange?: number; ambushMult?: number; blessPower?: number; ingMod?: number; stealth?: number;
  /** The ammo type loaded now (armour_piercing, hollow_point, incendiary, enhanced; null standard) and in each spare. */
  ammoType?: string | null; magTypes?: (string | null)[];
  /** Throwables carried (grenades, satchels): item id → count. Written back after the fight. */
  throwables?: Record<string, number>;
  /** The off-hand gun's spare magazines (when it isn't the same weapon as the main hand's). */
  offMags?: number[];
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
  /** Prayer (spec: Patrons and prayer): the round of the last prayer (cooldown). */
  prayedRound?: number;
}
export interface Combat { /** No XP or weapon kills: the fight started on people who weren't hostile (spec: Anyone is a target). */ noXp?: boolean; name: string; map: MapDef; units: Unit[]; order: string[]; turn: number; round: number; difficulty: string; log: string[]; /** 'extracted': the squad was lifted out (RTC Contractor's Extraction): neither won nor lost. */ over: null | 'win' | 'loss' | 'extracted'; summary?: string;
  /** What lies on the floor: dropped magazines and the rounds left in them. */
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
  /** The Sigil rules revision this fight's glyphs follow (14 = rules 1.4; absent: a 1.2 save, migrated on first use); the
   * order conditions landed in. */
  sigilV?: number; condSeq?: number;
  /** Hostiles the party has seen at least once this fight (shared sight: visibility(cb, 'pc')), kept as they come into view.
   * The fight music reads it, so an elite or boss in the fog of war changes nothing until it is seen (spec: Music). */
  sighted?: string[];
  /** Presentation events (shots, hits, reloads, spells…) for the client's effects layer, newest last, capped at FX_CAP.
   * Numbered by fxSeq; they carry no rules and nothing reads them back (see FxEvent). */
  fx?: FxEvent[]; fxSeq?: number;
  /** An off-turn window (On My Mark, Supreme Command): active(cb) is the queue's head while it is open (effects/actions.ts). */
  window?: { kind: string; queue: { unitId: string; ap?: number; limit?: number; done?: number }[]; saved: Record<string, number>; by?: string };
  /** The toggles the player set on the action being resolved (combat/attack mods…); set and cleared by the reducer. */
  mods?: string[];
  /** The overworld's throwaway fight state (storyCb): per-turn item counters live in the story instead. */
  overworld?: boolean;
  /** Each side's sight at the last check, for the sight_change hook (only kept while someone listens). */
  sightWas?: Record<string, string[]>;
  /** Where each side last saw a Hidden unit (a known position: shown, not targetable), by unit id. */
  lastSeen?: Record<string, Record<string, string>>;
  /** The Narrator's start_fight flag: the place itself is frightening (dark, a nightmare; perks read it). */
  fear?: boolean;
  /** The Narrator's word on whether the fight broke out of the talk just had (Talks Broke Down); absent: not said. */
  fromTalk?: boolean }

/** A presentation event: what just happened, precisely enough to animate (the client plays new ones by n). Tiles are
 * "x,y" keys; unit fields are unit ids. Kinds and fields:
 *  turn {unit, side, at, round} · move {unit, from, to, path, how} · shot {unit, target, from, to, weapon, cat, mode,
 *  hit, crit, fumble, dmg, killed, cover?, jam?, chain?} · melee {unit, target, from, to, weapon, cat, hit, crit, fumble,
 *  dmg, killed, chain?} · volley {unit, target?, from, to?, weapon, cat, mode: 'burst'|'auto'|'skill'|'paired'|'sweep',
 *  name?, shots?} · reload {unit, at, weapon, cat, how: 'mag'|'loose'|'swap', dur} · load {unit, at, rounds, dur} ·
 *  clear {unit, at, dur} · repair {unit, at, dur} · core {unit, at, dur} · stim {unit, target, from, to, heal, revive} ·
 *  heal {target, at, amount, revive?} · hurt {target, at, dmg, why, killed?} (damage not from a weapon roll: explosion,
 *  trap, hazard, bleed, burn, sigil, elemental, soul, true, short, overload, wall) · shield {target, at, absorbed} ·
 *  down {unit, at, dead} · explode {at, radius, what} · object {at, what, dmg, broken, hp?} · door {unit?, at, open} ·
 *  trap {unit, at} · shove {unit, target, from, to, ok, prone?} · stance {unit, at, what: 'prone'|'stand'|'brace'|'overwatch'} ·
 *  analyze {unit, target, from, to} · pickup {unit, at} · cover {unit, target, at, dmg} (a shot stopped by cover) ·
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
 *  song {unit, at}. */
export interface FxEvent { n: number; k: string; [field: string]: any }
export const FX_CAP = 40;
/** Shots and swings inside a burst, auto, skill or paired attack are marked chain (the client spaces them tighter). */
let fxChain = 0;
export function emitFx(cb: Combat, k: string, data: Record<string, any> = {}): FxEvent {
  const n = (cb.fxSeq = (cb.fxSeq || 0) + 1), list = (cb.fx ||= []), ev: FxEvent = { n, k, ...data };
  list.push(ev);
  if (list.length > FX_CAP) list.splice(0, list.length - FX_CAP);
  return ev;
}
/** A unit went down or died: one event (the client drops and greys the token). */
export function fxFell(cb: Combat, u: Unit) { emitFx(cb, 'down', { unit: u.id, at: u.pos, dead: !!u.dead }); }
function chained<T>(f: () => T, volley?: string): T { fxChain++; const was = VOLLEY; if (volley) VOLLEY = volley; try { return f(); } finally { fxChain--; VOLLEY = was; } }
/** The volley a shot belongs to ('burst' | 'auto' | 'skill' | 'paired' | 'cone'), or null: attack hooks carry it as
 * ctx.volley (hooks gap C3); 'volley_end' {u, mode, cb, rng} fires when one is over. */
let VOLLEY: string | null = null;
export const currentVolley = () => VOLLEY;
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
/** The map's notes that cover one tile ("N1–P6" is a rectangle; commas separate parts). Most specific first. */
export function notesAt(map: MapDef, k: string): string[] {
  const [x, y] = k.split(',').map(Number), hits: { area: number; text: string }[] = [];
  for (const n of map.notes || []) for (const part of n.at.split(',')) {
    const [a, b] = part.split(/[–-]/).map((r) => keyOf(r.trim()));
    if (!a) continue;
    const [x1, y1] = a.split(',').map(Number), [x2, y2] = (b || a).split(',').map(Number);
    if (x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)) { hits.push({ area: (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1), text: n.text }); break; }
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

export function unitFromCharacter(c: Character, pos: string, rng: Rng): Unit {
  const w = WEAPON[c.weapon] || WEAPON.service_pistol;
  return {
    id: 'pc-' + c.id, side: 'pc', name: c.name, short: c.name.slice(0, 2).toUpperCase(), charId: c.id, img: c.portrait,
    pos, hp: c.hp, maxHp: maxHp(c), def: defense(c), armour: (ARMOUR[c.armourClass]?.value || 0) + gearBonus(c, 'armour_bonus') + statQuery({ c }, 'armor').add,
    attack: mod(c.skills[w.skill] || 0) + RARITY[c.weaponState?.rarity || 'standard'].acc + skillRollMod({ c }, w.skill, { roll: 'attack', combat: true }).add + statQuery({ c }, 'attack').add, weapon: w.id,
    movement: movement(c), init: d20(rng) + initiativeBonus(c), agility: c.attrs.agility || 1, ap: 0, bank: 0, ammo: Math.min(loadedOf(c), magazineSize(w.id, c.weaponState?.mods) ?? 0), heat: 0, jammed: false, shotsThisTurn: 0,
    downed: c.hp <= 0, dead: false, saves: { ok: 0, fail: 0 }, stunnedNext: 0, kills: 0,
    injuries: (c.injuries || []).map((i) => ({ ...i })), bleed: 0, dazedNext: 0, injResist: injuryResistPct(c), hand: mainHandSide(c),
    vigilant: c.skills.vigilant || 0, overweight: overweightKg(c),
    dmgMult: RARITY[c.weaponState?.rarity || 'standard'].dmg, dur: weaponDurOf(c), maxDur: maxDurOf(w.id, c.weaponState?.rarity), mods: [...(c.weaponState?.mods || [])],
    offWeapon: c.offHand && WEAPON[c.offHand.id] ? c.offHand.id : null, offAmmo: c.offHand && WEAPON[c.offHand.id] ? WEAPON[c.offHand.id].magazine ?? 0 : 0,
    light: gearBonus(c, 'light'), darkSight: gearHas(c, 'dark_sight'), hazardImmune: gearEffects(c).filter((e) => e.op === 'hazard_immune').map((e) => e.hazard || ''),
    ignoreDifficult: gearHas(c, 'ignore_difficult'), unarmedBonus: gearBonus(c, 'unarmed_damage_bonus'), proficiency: c.skills.proficiency || 0,
    parts: packOf(c).filter((x) => (x.item || x.id) === 'spare_parts').reduce((t, x) => t + x.qty, 0), dexterity: c.skills.dexterity || 0, athleticsPts: c.skills.athletics || 0, vision: 12 + 2 * ((c.attrs.perception || 1) - 1) + (c.skills.vigilant || 0) + statQuery({ c }, 'vision').add, sensory: c.skills.sensory || 0, noSprint: overweightKg(c) > 0 || c.armourClass >= 5, strength: mod(c.skills.raw_power || 0), mags: [...spareMags(c)], loose: packOf(c).filter((x) => x.calibre && x.calibre === w.ammo).reduce((t, x) => t + x.qty, 0), analysis: c.skills.analysis || 0,
    mg: magicOf(c), ...(c.perks?.length || c.traits?.length || c.classId || c.advancedClass ? { held: heldOfChar(c) } : {}),
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
  const offW = c.offHand && WEAPON[c.offHand.id] && c.offHand.id !== c.weapon ? packOf(c).find((x) => x.weapon === c.offHand!.id && x.mags) : null;
  const kind = (c as any).kind || ((c.traits || []).includes('factory_made') ? 'machine' : 'human');
  const res = resourcesFor(c);
  return {
    sv: Object.fromEntries(fams.map((f) => [f, saveBonus(c, f)])) as any, dbf: Object.fromEntries(fams.map((f) => [f, debuffStrength(c, f)])) as any,
    ...(Object.keys(sk).length ? { sk } : {}),
    critTaken: critTakenPct(c), elemTaken: elementalTakenPct(c), ambushTaken: ambushTakenPct(c), healRecv: healReceivedMult(c), counter: counterBonus(c),
    throwRange: throwRange(c), ambushMult: ambushMult(c), blessPower: blessingPower(c), ingMod: mod(c.skills.ingenuity || 0), stealth: stealthOf(c),
    kind, tags: ['humanoid', ...((c as any).tags || [])],
    ammoType: c.loadedType || null, ...(spare?.magTypes ? { magTypes: [...spare.magTypes] } : {}),
    ...(Object.keys(thr).length ? { throwables: thr } : {}),
    ...(offW?.mags ? { offMags: [...offW.mags] } : {}),
    ...(res ? res : {}),
  };
  void w;
}
/** Class resources (spec: Classes; rules 1.3 shared subsystems): a fight starts with Momentum 0, Guard 0, Marks 0 and
 * Charges 0 (maxima from classes.json resource.max, else 5 / 5 / 3 / 3), and the character's Supplies and toxins. */
export function resourcesFor(c: Character): { res: Record<string, number>; resMax: Record<string, number> } | null {
  const ids = classResources(c); if (!ids.length) return null;
  const res: Record<string, number> = {}, resMax: Record<string, number> = {};
  for (const r of ids) { resMax[r.id] = r.max; res[r.id] = r.persist ? Math.min(r.max, c.res?.[r.id] ?? r.max) : 0; }
  return { res, resMax };
}

export function unitFromEnemy(id: string, name: string, tierId: string, weaponId: string, pos: string, rng: Rng): Unit {
  const t = ENEMY[tierId] || ENEMY.minion, w = WEAPON[weaponId] || WEAPON.service_pistol;
  return {
    id, side: 'foe', name, short: name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase() || 'EN', tier: t.id,
    pos, hp: t.hp, maxHp: t.hp, def: t.defense, armour: t.armour, attack: t.attack_bonus, weapon: w.id, movement: t.movement,
    init: d20(rng) + t.attack_bonus, agility: 1, ap: 0, bank: 0, ammo: w.magazine ?? 0, heat: 0, jammed: false, shotsThisTurn: 0,
    downed: false, dead: false, saves: { ok: 0, fail: 0 }, stunnedNext: 0, kills: 0,
    injuries: [], bleed: 0, dazedNext: 0, injResist: 10 * ((t.endurance || 1) - 1), hand: 'right', vision: 12, sensory: 0, strength: t.attack_bonus,
    mags: w.magazine == null ? undefined : w.reload === 'loose' ? [] : Array(t.spare_mags ?? 2).fill(w.magazine), loose: w.reload === 'loose' ? (t.spare_mags ?? 2) * (w.magazine || 0) : 0,
  };
}

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
      const ob = makeObject(id(), o.kind, k, { name: o.name, text: o.text, approaches: (o.approaches || []).map((a) => ({ label: a.label, skills: a.skills, tn: a.tn, stakes: a.stakes, success: (a.success || '') as any, tries: [] })) });
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
  const name = o.name.toLowerCase();
  o.hp = Math.max(0, o.hp! - Math.max(1, Math.floor(dmg)));
  emitFx(cb, 'object', { at: k, what: o.kind, dmg: Math.max(1, Math.floor(dmg)), broken: o.hp <= 0, hp: o.hp });
  if (o.hp > 0) return ' · the ' + name + ' takes ' + Math.floor(dmg) + ' (' + o.hp + '/' + o.max + ')';
  cb.objects = objectsOf(cb).filter((x) => x !== o);
  emit(cb, 'object_destroyed', { obj: o, by, cb });
  const kd = kindOf(o);
  if (kd.explodes && depth < 4) {
    let out = ' · the ' + name + ' EXPLODES';
    emitFx(cb, 'explode', { at: k, radius: kd.explodes.radius, what: o.kind });
    for (const u of cb.units) if (!u.dead && dist(u.pos, k) <= kd.explodes.radius) out += hurtUnit(u, kd.explodes.damage, false, cb, 'explosion', by);
    for (const x of [...objectsOf(cb)]) if (x.pos !== k && dist(x.pos, k) <= kd.explodes.radius) out += damageObject(cb, x.pos, kd.explodes.damage, depth + 1, by);
    cb.objects.push(makeObject('x' + cb.objects.length + '_' + k.replace(',', '_'), 'fire', k));
    return out;
  }
  if (kd.cover || kd.id === 'barricade') { cb.objects.push(makeObject('r_' + k.replace(',', '_') + '_' + cb.round, 'rubble', k)); return ' · the ' + name + ' breaks into rubble'; }
  return ' · the ' + name + ' is destroyed';
}
export const damageCover = damageObject;

/** Spot hidden traps near a PC: passive Vigilant (10 + modifier) against the trap's TN (spec: Map objects). */
export function spotTraps(objs: MapObject[], pos: string, vigilant: number, name: string, log: (s: string) => void) {
  for (const o of objs) if (o.hidden && isTrap(o)) {
    const t = kindOf(o).trap!, passive = 10 + (vigilant <= 0 ? -2 : vigilant - 1);
    if (dist(o.pos, pos) <= t.detect_range && passive >= t.detect_tn) { o.hidden = false; log(name + ' spots a trap at ' + refOf(o.pos) + ' (Vigilant ' + passive + ' vs ' + t.detect_tn + ').'); }
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
export function paths(cb: Combat, from: string, self: string) {
  const { w, h } = cb.map, me = cb.units.find((u) => u.id === self), diff = difficultOf(cb), opt = pathOpts(cb, me);
  const solid = new Set([...moveBlockers(cb), ...objectsOf(cb).filter((o) => isTrap(o) && trapKnown(o, me?.side || 'pc')).map((o) => o.pos)]);
  for (const k of opt.runnable) solid.delete(k);
  const blocked = new Set(cb.units.filter((u) => u.id !== self && !u.dead && !opt.pass.has(u.id)).map((u) => u.pos));
  const d: Record<string, number> = { [from]: 0 }, prev: Record<string, string> = {}, open = [from];
  const stand = (k: string) => !solid.has(k) && !blocked.has(k);
  while (open.length) {
    open.sort((a, b) => d[a] - d[b]);
    const k = open.shift()!, [x, y] = xy(k);
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
  return { dist: d, prev };
}
/** Moving N tiles costs N ÷ Movement AP, rounded up, after tiles already paid for this turn. */
export const apForTiles = (tiles: number, bank: number, mov: number) => Math.ceil(Math.max(0, tiles - bank) / mov - 1e-9);

// ---------- line of sight and cover ----------
export function lineOfSight(cb: Combat, a: string, b: string, ignoreVeil = false): boolean {
  // half cover doesn't block sight; ignoreVeil: smoke (VEIL zones) doesn't either (Skin Map)
  const solid = ignoreVeil ? new Set([...cb.map.solid, ...objectsOf(cb).filter(blocksSight).map((o) => o.pos)]) : sightBlockers(cb);
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
const sightHooked = (cb: Combat) => anyOn(cb, 'sees');
function seesHook(cb: Combat, side: 'pc' | 'foe', t: Unit, by: Unit | null, seen: boolean, sensed: boolean): { seen: boolean; sensed: boolean } {
  const r: any = emit(cb, 'sees', { cb, side, t, by, seen, sensed });
  return { seen: !!r.seen, sensed: !!r.sensed };
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
export const weaponDamage = (w: WeaponDef, range: number, rawPower = 0) =>
  typeof w.damage === 'number' ? w.damage : w.damage?.within_4 ? (range <= 4 ? w.damage.within_4 : w.damage.within_8) : w.id === 'recurve_bow' ? 20 + 5 * rawPower : 20;
export const attackApCost = (w: WeaponDef, mode: string) => (isMelee(w) ? (w.category.startsWith('heavy') ? 3 : 2) : mode === 'aimed' ? 3 : (w.ap_cost.single ?? 2));
export const effectiveRange = (w: WeaponDef) => (typeof w.range_tiles === 'number' ? w.range_tiles : 8);

/** One term of a to-hit sum or a damage chain, for the transparent breakdown (spec: dice are transparent). */
export interface Term { v: number; label: string }
export interface AttackPreview { ok: boolean; why?: string; ap: number; toHit: number; need: number; pct: number; cover: number; coverTile?: string | null; rangePenalty: number;
  /** Every to-hit term by name (skill, weapon, range, Heat, cover, perks…): they sum to toHit. */
  terms?: Term[];
  /** The damage a hit would do before the target's armour: base, then each multiplier and flat add by name. */
  dmg?: { base: number; terms: Term[]; mults: Term[]; total: number; crit: number; pierce: number; armour: number } }
export type AttackMode = 'shot' | 'aimed' | 'melee' | 'burst' | 'auto';
export function previewAttack(cb: Combat, att: Unit, tgt: Unit, mode: AttackMode, opts: { extra?: number; free?: boolean; noRecoil?: boolean } = {}): AttackPreview {
  const w = WEAPON[att.weapon], melee = isMelee(w) || mode === 'melee', useW = mode === 'melee' && !isMelee(w) ? WEAPON.fists : w;
  const fx: any = (w as any).grants?.effect || {};
  const ap0 = opts.free ? 0 : mode === 'burst' ? 3 : mode === 'auto' ? (fx.op === 'auto_ap' ? fx.value : 4) : mode === 'aimed' && fx.op === 'aimed_ap' ? fx.value : attackApCost(useW, mode === 'aimed' ? 'aimed' : mode === 'melee' ? 'melee' : 'shot');
  const baseReach = melee ? (useW.properties?.includes('reach_2') || useW.id === 'lance' || (useW === w && fx.op === 'reach') ? (fx.op === 'reach' && useW === w ? fx.value : 2) : 1) : 0;
  // Items see the attack before it is checked: AP (ctx.ap), reach (ctx.reach), cover (ctx.ignoreCover), extra to-hit
  // terms (ctx.terms), or a refusal (ctx.fail). ctx.preview is true: handlers must not change state here.
  const hk: any = { att, tgt, mode, melee, ap: ap0, reach: baseReach, ignoreCover: false, terms: [] as Term[], fail: null as string | null, free: !!opts.free, noRecoil: !!opts.noRecoil, volley: VOLLEY, preview: true, cb, mods: cb.mods || [], seeVeil: false, coverTile: null as string | null, coverWhy: '', ignoreTaunt: false };
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
  if (att.ap < ap) return fail('Needs ' + ap + ' AP.');
  if ((mode === 'burst' || mode === 'auto') && !(w.modes || []).includes(mode)) return fail('This weapon has no ' + (mode === 'auto' ? 'full auto' : 'burst') + '.');
  // An ally (friendly fire) needs this unit's own sight; the squad's shared sight covers the other side.
  if (tgt.side === att.side ? !(unitSees(cb, att, tgt.pos) || (sightHooked(cb) && seesHook(cb, att.side, tgt, att, false, false).seen)) : !sideSees(cb, att.side, tgt, att)) return fail('You can\'t see it.');
  if (!melee && att.maxDur && (att.dur ?? 1) <= 0) return fail('Broken: Field Repair first.');
  if (!melee && (w.properties || []).includes('requires_braced_or_prone') && !att.braced && !att.prone) return fail('Brace it first (1 AP), or go prone.');
  const r = dist(att.pos, tgt.pos);
  if (melee && r > hk.reach) return fail('Out of melee reach.');
  if (!melee && att.jammed) return fail('Weapon jammed: clear it (2 AP).');
  if (!melee && w.magazine != null && att.ammo <= 0) return fail('Empty: reload (2 AP).');
  if (!melee && !lineOfSight(cb, att.pos, tgt.pos, !!hk.seeVeil)) return fail('No line of sight.');
  const eff = effectiveRange(useW), optic = hasMod(att.mods, 'mod_red_dot') || (hasMod(att.mods, 'mod_scope') && mode === 'aimed') ? 1 : 0, bands = melee ? 0 : Math.max(0, Math.ceil(r / eff) - 1 - optic);
  if (bands > 2) return fail('Out of range.');
  // hk.coverTile: an item names a half-cover tile that protects the target although it doesn't face the shot (Eyes in
  // the Back): it counts as the cover, so a miss by its margin hits it.
  const facing = melee ? null : coverTileFor(cb, att.pos, tgt.pos), coverTile0 = facing || hk.coverTile || null, coverTile = hk.ignoreCover || (useW.properties || []).includes('ignores_half_cover') ? null : coverTile0, cover = coverTile ? 5 : 0;
  const rangePenalty = -2 * bands;
  const heat = melee || !w.heat_limit ? 0 : -Math.floor(att.heat / 2);
  const prone = tgt.prone ? (melee ? 2 : -2) : 0, unbraced = !melee && (w.properties || []).includes('minus2_to_hit_unless_emplaced') && !att.braced && !att.prone ? -2 : 0;
  const skillBonus = useW !== w ? 0 : (fx.op === 'hit_bonus' && r <= fx.within ? fx.value : 0) + (fx.op === 'first_shot_bonus' && !att.firstShotDone ? fx.value : 0)
    + (fx.op === 'aimed_still_bonus' && mode === 'aimed' && !att.moved ? fx.value : 0) + (fx.op === 'braced_bonus' && att.braced ? fx.value : 0) + (hasMod(att.mods, 'mod_scope') && mode === 'aimed' ? 1 : 0);
  const T = (v: number, label: string) => (v ? [{ v, label }] : []);
  // Recoil (spec: Modifiers): −1 per earlier shot this turn, less floor(Dexterity ÷ 2); halved braced or Emplaced; bows
  // and guns marked no_recoil have none; the compensator takes 1 off each shot.
  const recoil = melee || mode === 'auto' || opts.noRecoil || hk.noRecoil || (useW.properties || []).includes('no_recoil') ? 0
    : -Math.max(0, (att.shotsThisTurn || 0) * (hasMod(att.mods, 'mod_compensator') ? 0 : 1) - Math.floor((att.dexterity || 0) / 2));
  const recoilT = att.braced || condOn(att, 'emplaced') ? Math.ceil(recoil / 2) : recoil;
  const emplaced = !melee && condOn(att, 'emplaced') ? 2 : 0;
  const skillCond = condSkillMod(att, useW.skill);
  const terms: Term[] = [...T(att.attack, 'skill'), ...T(att.song || 0, 'song'), ...T(skillBonus, (w as any).grants?.name || 'weapon skill'), ...T(useW.accuracy || 0, 'weapon accuracy'),
    ...T(mode === 'aimed' ? 2 : 0, 'aimed'), ...T(mode === 'auto' ? -2 : 0, 'full auto'), ...T(opts.extra || 0, 'volley'), ...T(rangePenalty, 'range'), ...T(heat, 'Heat'), ...T(armPenalty(att, useW), 'injured arm'),
    ...T(tgt.downed ? 2 : 0, 'target Downed'), ...T(prone, 'target prone'), ...T(unbraced, 'not braced'), ...T(-cover, !facing && hk.coverWhy ? 'half cover (' + hk.coverWhy + ')' : 'half cover'), ...T(condHit(att, tgt, cb), 'conditions'),
    ...T(recoilT, 'recoil'), ...T(emplaced, 'emplaced'), ...T(skillCond, 'brain debuff'), ...(hk.terms as Term[]).filter((t) => t && t.v)];
  if (hk.ignoreCover && coverTile0) terms.push({ v: 0, label: 'cover ignored' });
  const toHit = terms.reduce((t, x) => t + x.v, 0);
  const pct = Math.max(5, Math.min(95, (21 - (tgt.def - toHit)) * 5));
  const who = charFor(att);
  return { ok: true, ap, toHit, need: tgt.def, pct, cover, coverTile, rangePenalty, terms, dmg: attackDamage(cb, att, tgt, mode, who, { preview: true }) };
}
/** The live character behind a PC unit, when a game is bound (multipliers come from it). */
const charFor = (u: Unit): Character | null => { const G = boundGameRef(); return (u.charId && G?.characters?.[u.charId]) || null; };

/** The damage a hit does before armour, with every multiplier named (spec: Attacks, damage and armour). Items add
 * through the 'damage_out' hook {att, tgt, mode, melee, src, base, add, mults: Term[], vs: Term[], crit, preview}:
 * flat adds, situational self-multipliers (mults, multiplicative) and target-specific bonuses (vs: fractions that add
 * together and are capped at +100%, plan 6a-1; stackDamage). Special ammo (rules.json ammo_types), the Ambush
 * multiplier, Weakened and the target's Critical damage taken are applied here. */
export function attackDamage(cb: Combat, att: Unit, tgt: Unit, mode: AttackMode, who: Character | null, o: { crit?: boolean; dmgMult?: number; preview?: boolean; ambush?: boolean } = {}) {
  const w = WEAPON[att.weapon], melee = isMelee(w) || mode === 'melee', useW = mode === 'melee' && !isMelee(w) ? WEAPON.fists : w;
  const fx: any = useW === w ? (w as any).grants?.effect || {} : {};
  const worn = att.maxDur ? (att.dur ?? att.maxDur) <= att.maxDur * 0.25 : false;
  const bayonet = melee && useW === WEAPON.fists && hasMod(att.mods, 'mod_bayonet');
  const ammo = !melee && useW === w ? AMMO_TYPES[ammoId(att.ammoType) || ''] || null : null;
  const base = bayonet ? 15 : weaponDamage(useW, dist(att.pos, tgt.pos), who?.skills.raw_power || 0) + (useW.category === 'unarmed' ? att.unarmedBonus || 0 : 0) + (melee && useW === w && hasMod(att.mods, 'mod_weighted') ? 3 : 0) - (!melee && hasMod(att.mods, 'mod_suppressor') ? 2 : 0);
  const mults: Term[] = [], vs: Term[] = [];
  const M = (v: number, label: string) => { if (v !== 1) mults.push({ v, label }); };
  M(who ? physicalMult(who) : 1, 'Strength and Raw Power'); M(useW === w ? att.dmgMult || 1 : 1, 'rarity'); M(o.dmgMult || 1, 'weapon skill');
  if (melee && useW === w && att.maxDur) M((att.dur ?? 1) <= 0 ? 0.5 : worn ? 0.9 : 1, (att.dur ?? 1) <= 0 ? 'broken' : 'worn');
  if (ammo?.damage_mult) M(ammo.damage_mult, ammo.id.replace(/_/g, '-') + ' rounds');
  const critM0 = who ? critMult(who) : 2, critM = 1 + (critM0 - 1) * (1 - (tgt.critTaken || 0));
  if (o.crit) M(critM, 'critical');
  if (o.ambush) M(att.ambushMult || 1.5, 'ambush');
  if (condOn(att, 'weakened')) M(0.75, 'Weakened');
  if (condOn(att, 'sharpened')) M(1.25, 'Sharpened'); // SHARPEN (rules 1.4)
  if (tgt.weakPoint && att.side === 'pc') vs.push({ v: 0.15, label: 'Weak Point' });
  if (fx.op === 'vs_status_damage' && ((tgt.bleed && fx.statuses.includes('bleeding')) || (tgt.dazedNext && fx.statuses.includes('dazed')) || (tgt.downed && fx.statuses.includes('downed')))) M(fx.mult, (w as any).grants?.name || 'weapon skill');
  const src = { by: att, type: 'weapon', melee, ranged: !melee, crit: !!o.crit, mode, weapon: useW.id, dmgType: damageTypeOf(useW, useW === w ? att.ammoType : null), explosive: isExplosive(useW), ambush: !!o.ambush, ammo: ammo?.id || null };
  const ctx: any = { att, tgt, mode, melee, src, base, add: 0, mults, vs, crit: !!o.crit, preview: !!o.preview, cb, mods: cb.mods || [] };
  emit(cb, 'damage_out', ctx);
  const st = stackDamage(mults, vs);
  if (vs.length) mults.push({ v: Math.round(st.vsMult * 100) / 100, label: 'against this target (' + vs.map((x) => x.label).join(', ') + (vs.reduce((t, x) => t + x.v, 0) > VS_CAP ? '; capped at ×2' : '') + ')' });
  const total = (base + ctx.add) * st.total;
  const props = useW.properties || [];
  const ignoreAll = props.includes('ignores_armour') || !!ammo?.ignores_armor || fx.op === 'ignore_armour' && fx.value >= 99;
  const pierce = (fx.op === 'ignore_armour' ? fx.value : 0) + (props.includes('armor_ignore_5') ? 5 : 0) + (props.includes('armor_ignore_10') || props.includes('ignores_10_armour') ? 10 : 0);
  const armour0 = Math.max(0, tgt.armour * (ammo?.armor_mult || 1) - pierce), armour = ignoreAll ? 0 : armour0;
  return { base, terms: ctx.add ? [{ v: ctx.add, label: 'perks (flat)' }] : [], mults, vs, total, crit: critM, pierce, armour, src };
}

export interface AttackResult { roll: number; total: number; vs: number; hit: boolean; crit: boolean; fumble: boolean; damage: number; line: string; killed: boolean; refused?: string }
export function resolveAttack(cb: Combat, rng: Rng, att: Unit, tgt0: Unit, mode: AttackMode, who: Character | null, opts: { extra?: number; free?: boolean; noAp?: boolean; dmgMult?: number; noWear?: boolean; noCone?: boolean } = {}): AttackResult {
  // Items may redirect an attack (a grappled shield, a judged foe's blow): 'attack_target' {att, tgt, mode} (tgt mutable).
  // Confused (spec): each attack has a 50% chance to go at someone at random (anyone else it could attack).
  if (condOn(att, 'confused') && die(rng, 2) === 1) {
    const pool = cb.units.filter((v) => v !== att && v !== tgt0 && !v.dead && !v.surrendered && previewAttack(cb, att, v, mode, { free: true }).ok);
    if (pool.length) { const pick = pool[die(rng, pool.length) - 1]; cb.log.push(att.name + ' is Confused: the attack goes at ' + pick.name + ' instead.'); tgt0 = pick; }
  }
  // ctx.locked: an item that keeps the attack on its first target whatever redirects it (Rabbit's Foot's hunters).
  const at: any = emit(cb, 'attack_target', { att, tgt: tgt0, orig: tgt0, mode, volley: VOLLEY, vi: (opts as any).vi ?? 0, cb, mods: cb.mods || [], locked: null }), tgt: Unit = at.locked || at.tgt || tgt0;
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
  const w = WEAPON[att.weapon], melee = isMelee(w) || mode === 'melee', useW = mode === 'melee' && !isMelee(w) ? WEAPON.fists : w;
  const attAt = att.pos, tgtAt = tgt.pos;
  att.ap -= pv.ap;
  const fx: any = useW === w ? (w as any).grants?.effect || {} : {};
  const worn = att.maxDur ? (att.dur ?? att.maxDur) <= att.maxDur * 0.25 : false;
  // The die, then items: 'attack_roll' {att, tgt, mode, die, toHit, need, critMin, noFumble, hit?} (die may be rerolled,
  // critMin lowered; set hit to force the result).
  // An ambush (spec: attacks from Hidden crit on 19-20 and use the Ambush multiplier): the first attack of each Hidden entry.
  const ambush = ambushReady(att) && tgt.side !== att.side;
  if (ambush) att.ambushUsed = att.hideEntry || 1;
  const rc: any = { att, tgt, mode, die: d20(rng), toHit: pv.toHit, need: pv.need, critMin: Math.min(mode === 'aimed' ? (fx.op === 'aimed_crit_min' ? fx.value : 19) : 20, ambush ? 19 : 20), noFumble: false, ambush, hit: undefined as boolean | undefined, volley: VOLLEY, cb, rng, mods: cb.mods || [] };
  emit(cb, 'attack_roll', rc);
  const roll = rc.die, total = roll + pv.toHit;
  const crit = roll === 20 || roll >= rc.critMin, fumble = roll === 1 && !rc.noFumble;
  const hit = rc.hit ?? (!fumble && (crit || total >= pv.need));
  if (!melee) {
    // A unit with infinite ammo (the drone, item 370) spends no round, takes no Heat and never jams.
    if (w.magazine != null && !att.infiniteAmmo) att.ammo = Math.max(0, att.ammo - 1);
    if (w.heat_limit && !att.infiniteAmmo) att.heat += 1; att.shotsThisTurn++;
    // A weapon that can't jam (no Heat limit: bows, the flamer, the breacher tube) fumbles instead: −1 AP next turn (plan 2.9; provisional).
    if (canJam(w) && !att.infiniteAmmo) { if (fumble || (worn && roll <= 2) || (w.heat_limit && att.heat >= heatLimit(att, w))) att.jammed = true; }
    else if (fumble) att.stunnedNext = 1;
  } else if (fumble) att.stunnedNext = 1;
  // Durability (spec: Weapons v2): every attack wears 1; a jam or fumble 5 more.
  if (att.maxDur && useW === w && !opts.noWear) att.dur = Math.max(0, (att.dur ?? att.maxDur) - 1 - (fumble || att.jammed ? 5 : 0));
  att.firstShotDone = true; att.firstShotTurn = true; att.attackedTurn = true;
  // The event goes out before the hit's consequences (knockback, conditions) so the client plays them in order.
  const ev = emitFx(cb, melee ? 'melee' : 'shot', { unit: att.id, target: tgt.id, from: attAt, to: tgtAt, weapon: useW.id, cat: useW.category, mode, hit, crit, fumble, dmg: 0, killed: false,
    ...(!melee && att.jammed ? { jam: true } : {}), ...(fxChain ? { chain: true } : {}) });
  let damage = 0, killed = false, injury = '';
  if (hit) {
    const d = attackDamage(cb, att, tgt, mode, who, { crit, dmgMult: opts.dmgMult, ambush });
    damage = Math.max(1, Math.floor(d.total) - d.armour);
    const r = applyDamage(cb, tgt, damage, { ...d.src, shield: true, downedFails: crit ? 2 : 1, credit: 'all', nonlethal: (cb.mods || []).includes('nonlethal') } as any);
    damage = r.amount; killed = r.killed;
    if (killed) { ev.dmg = damage; ev.killed = true; fxFell(cb, tgt); }
    if (crit && !tgt.dead && !tgt.downed) injury = rollInjury(rng, tgt, cb, att);
    if (crit && !tgt.dead && melee && hasMod(att.mods, 'mod_serrated') && !immune({ u: tgt }, 'bleed')) { tgt.bleed = 3; injury += ' · Bleeding'; }
    if (!tgt.dead && fx.op === 'on_hit') injury += onHit(cb, att, tgt, fx);
    if (r.prevented) injury += ' · no damage';
    // Riders (rules 1.3): incendiary rounds and burning weapons set the target Burning (a hit's rider: no save);
    // enhanced rounds and mana arms release bots (+1 on the meter); explosives splash; the flamer's cone.
    if (!tgt.dead && !tgt.surrendered && (AMMO_TYPES[ammoId(att.ammoType) || '']?.applies === 'burning' && !melee || (useW.properties || []).includes('applies_burning'))) injury += applyCond(cb, rng, att, tgt, 'burning', undefined, 'body', { skipSave: true });
    if (!melee && (AMMO_TYPES[ammoId(att.ammoType) || '']?.meter_per_hit || useW.category === 'mana' || (useW.properties || []).includes('mana_meter_on_hit'))) shiftMana(cb, 1, 'bots released by a hit');
  }
  if (hit && radiusOf(useW) && useW.category !== 'thrown') injury += splash(cb, att, tgt, useW, damage);
  // Momentum (the Fighter's resource, spec: Classes): +1 for each melee hit (the class moves spend it).
  if (hit && melee && att.resMax?.momentum != null) resGain(att, 'momentum', 1);
  if (ambush) injury += ' · AMBUSH';
  if (att.hidden && !isSilent(att)) injury += reveal(cb, att, 'attacked');
  if (condSource(att, 'taunted') === tgt.id) endCond(att, 'taunted', cb);
  if (condOn(att, 'sharpened')) endCond(att, 'sharpened', cb); // spent on this attack
  // A shot that misses only because of half cover's −5 hits the cover (spec: Cover).
  const stopped = !hit && !fumble && !!pv.coverTile && total + pv.cover >= pv.need;
  ev.dmg = damage; ev.killed = killed; if (stopped) ev.cover = pv.coverTile;
  if (hit && tgt.downed && !killed) ev.downedHit = true;
  if (stopped) injury = ' · stopped by cover' + damageCover(cb, pv.coverTile!, weaponDamage(useW, dist(att.pos, tgt.pos), who?.skills.raw_power || 0) * (who ? physicalMult(who) : 1) * (fx.op === 'cover_damage_mult' ? fx.value : 1), 0, att);
  const verb = melee ? 'strikes' : mode === 'aimed' ? 'takes an aimed shot at' : 'fires at';
  const line = att.name + ' ' + verb + ' ' + tgt.name + ': d20 ' + roll + ' ' + (pv.toHit >= 0 ? '+' : '−') + Math.abs(pv.toHit) + (pv.cover ? ' (incl. −5 cover)' : '') + ' = ' + total + ' vs ' + pv.need +
    (fumble ? (melee || !canJam(w) ? ' · fumble, −1 AP next turn' : ' · natural 1, the gun jams') : hit ? (crit ? ' · CRITICAL, ' : ' · hit, ') + damage + ' damage' + (killed ? (tgt.side === 'foe' ? ' · down for good' : ' · Downed') : '') + injury : ' · miss' + injury);
  cb.log.push(line);
  // After the line: 'on_hit' {att, tgt, mode, dmg, crit, killed} or 'on_miss' {att, tgt, mode, die, fumble} (a shot cover stopped is neither).
  if (hit) emit(cb, 'on_hit', { att, tgt, mode, dmg: damage, crit, killed, melee, volley: VOLLEY, cb, rng, mods: cb.mods || [] });
  else if (!stopped) emit(cb, 'on_miss', { att, tgt, mode, die: roll, fumble, melee, volley: VOLLEY, stopped: false, cb, rng, mods: cb.mods || [] });
  // The flamer's cone (cone_3): everyone else in a 3-tile cone toward the target gets the same attack, each its own roll.
  if ((useW.properties || []).includes('cone_3') && !opts.noCone) for (const v of coneUnits(cb, att.pos, tgtAt, 3)) if (v !== tgt && v !== att && !v.dead && !v.surrendered && previewAttack(cb, att, v, mode, { free: true }).ok) chained(() => resolveAttack(cb, rng, att, v, mode, who, { noAp: true, noWear: true, noCone: true }), 'cone');
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
export const heatLimit = (u: Unit, w: WeaponDef) => (w.heat_limit || 0) + (u.charId || u.held ? statQuery({ u }, 'heat_limit').add : 0);
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
  /** A caster archetype from enemies.json `casters` (its words and spell bias; sigils, if given, wins). Rules 1.4, ai-sigil.ts. */ caster?: string }
export function startCombat(name: string, mapId: string | MapDef, pcs: { c: Character; pos?: string; comp?: Record<string, string> }[], foes: FoeSpec[], difficulty: string, rng: Rng, objects?: MapObject[], extra: { fear?: boolean; fromTalk?: boolean } = {}): Combat {
  const map = typeof mapId === 'string' ? MAPS[mapId] || MAPS.rear_pad : mapId;
  const objs = objects ? JSON.parse(JSON.stringify(objects)) as MapObject[] : defaultObjects(map);
  const units: Unit[] = [], taken = new Set<string>(objs.filter(blocksMove).map((o) => o.pos));
  const anyFree = () => { for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) { const k = key(x, y); if (standable(map, k) && !taken.has(k)) return k; } return null; };
  const place = (want: string | null | undefined, fallback: string[]) => { const k = want && standable(map, want) && !taken.has(want) ? want : fallback.find((f) => !taken.has(f)) || anyFree() || fallback[0]; taken.add(k); return k; };
  pcs.forEach(({ c, pos }) => units.push(unitFromCharacter(c, place(pos, map.pcStart), rng)));
  // Companions (a drone, a beast) stand next to their owner and act right after it (rules 1.3).
  for (const { c, comp } of pcs) { const owner = units.find((x) => x.charId === c.id); if (owner && c.companions?.length) units.push(...companionUnits(null, c, owner, taken, rng, map, comp)); }
  foes.slice(0, Math.max(map.foeStart.length, 8)).forEach((f, i) => {
    const u = unitFromEnemy('foe-' + i, f.name, f.tier, f.weapon, place(f.at ? keyOf(f.at, map) : null, map.foeStart), rng);
    if (f.hp != null && f.hp > 0) u.hp = Math.min(u.maxHp, Math.round(f.hp)); // wounded in a fight it walked away from
    armFoe(u, f); // an Evoker: its own words, or its caster archetype's (ai-sigil.ts)
    applyFoeTraits(u, { ...f, kind: f.kind || (/drone|robot|automaton|\bbot\b/i.test(f.name) ? 'robot' : /turret/i.test(f.name) ? 'turret' : undefined) });
    units.push(u);
  });
  const order = [...units].sort((a, b) => b.init - a.init || b.agility - a.agility).map((u) => u.id);
  const cb: Combat = { name, map, units, order, turn: 0, round: 1, difficulty: COMBAT_XP[difficulty] ? difficulty : 'standard', log: ['Initiative: ' + order.map((id) => { const u = units.find((x) => x.id === id)!; return u.name + ' ' + u.init; }).join(' · ')], over: null, ...(extra.fear ? { fear: true } : {}), ...(typeof extra.fromTalk === 'boolean' ? { fromTalk: extra.fromTalk } : {}) };
  cb.objects = objs; cb.sigilV = SIGIL_REV; // a fresh fight: rules 1.4 glyphs only
  // Items at the start of a fight: 'combat_start' {cb, order, rng} (order mutable: act in the surprise round, swap places).
  const cs: any = emit(cb, 'combat_start', { cb, order: [...cb.order], rng });
  if (Array.isArray(cs.order) && cs.order.length === cb.order.length && cs.order.every((id: string) => cb.order.includes(id))) cb.order = cs.order;
  noteFallbacks(cb);
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
  u.stunnedNext = 0; u.dazedNext = 0; u.overwatch = null; u.owShots = 0; u.moved = false; u.bank = 0; u.shotsThisTurn = 0; u.heat = Math.max(0, u.heat - 2); u.firstShotTurn = false; u.sprinted = false; u.attackedTurn = false; // off-turn attacks (Riposte, Overwatch) don't count for this turn's Momentum
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
    if (o.startsWith('move:')) { const to = o.slice(5), P = paths(cb, u.pos, u.id); endCond(u, 'commanded', cb); if (P.dist[to] !== undefined && P.dist[to] <= 3 && !u.prone) moveUnit(cb, u, to, rng); }
    cb.log.push(u.name + ' obeys: ' + o.split(':')[0] + (o.startsWith('move:') ? ' to ' + refOf(o.slice(5)) : '') + '.');
  }
  // 'turn_start' {u}: after AP, conditions, hazards, bleeding and death saves.
  if (!u.dead) emit(cb, 'turn_start', { u, cb, rng });
}
/** What happens as a unit's turn ends (rules 1.3): its timed conditions tick, it looks for Hidden enemies, and a Fighter
 * who didn't attack this turn loses its Momentum. */
export function closeTurn(cb: Combat, rng: Rng | null, u: Unit) {
  condTurnEnd(cb, u, rng);
  if (rng && !u.skipTurn) spotHidden(cb, rng, u);
  if ((cb.zones || []).length) sigilSpot(cb, u); // hidden Sigil traps and turrets nearby (rules 1.4)
  if (u.res && u.res.momentum && !u.shotsThisTurn && !u.attackedTurn) u.res.momentum = 0;
  u.attackedTurn = false; delete u.skipTurn;
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
export function moveBlock(u: Unit): string | null {
  if (u.downed || u.dead) return 'Downed units can\'t move.';
  if (u.surrendered) return 'Out of the fight.';
  if (u.prone) return 'Stand up first (1 AP).';
  if (condOn(u, 'pinned')) return 'Pinned: you can\'t move this round.';
  if (condOn(u, 'grappled')) return 'Grappled: break free first (2 AP).';
  if (condOn(u, 'commanded') && ['halt', 'kneel'].includes(u.condArg?.commanded || 'halt') && (u.side === 'foe' || (u.condBy?.commanded && !u.condArg?.commanded?.startsWith('move')))) return 'Commanded to halt.';
  return null;
}
/** Move (spec: Moving; Sprint; Disengage), walked tile by tile (rules 1.3): each step fires 'move_step' {u, from, at,
 * i, route, stop} (set stop to end the walk there), and opportunity attacks and Overwatch are checked on every step,
 * not only at the end. A walk cut short (a trap, a reaction that Downs or Pins you, a handler) keeps the tiles not
 * walked in the turn's bank. Sprint is once per turn. Afraid units can't move closer to what they fear. */
export function moveUnit(cb: Combat, u: Unit, to: string, rng?: Rng, how: 'move' | 'sprint' | 'disengage' = 'move'): string | null {
  const blk = moveBlock(u); if (blk) return blk;
  const P = paths(cb, u.pos, u.id);
  const tiles = P.dist[to];
  if (tiles === undefined || to === u.pos) return 'Can\'t reach that tile.';
  { const fs = condSource(u, 'fear'), f = fs ? cb.units.find((x) => x.id === fs) : null; if (f && !f.dead && dist(to, f.pos) < dist(u.pos, f.pos)) return 'Afraid of ' + f.name + ': you can\'t move toward them.'; }
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
  const mc: any = emit(cb, 'move_cost', { u, from: u.pos, to, route, tiles, how, ap, skipOA: false, skipOW: false, free: false, cb, mods: cb.mods || [] });
  ap = Math.max(0, mc.ap);
  if (ap > u.ap) return 'Needs ' + ap + ' AP.';
  const from = u.pos, bank0 = u.bank;
  u.ap -= ap; if (how === 'sprint') u.sprinted = true; u.braced = false; u.moved = true;
  if (condOn(u, 'emplaced')) endCond(u, 'emplaced', cb);
  // A Hidden mover draws no reactions (nobody sees it go).
  const reacts = !!rng && !u.hidden;
  let seg: string[] = [from], stopped = '', sprung = '';
  const flush = () => { if (seg.length > 1) emitFx(cb, 'move', { unit: u.id, from: seg[0], to: seg[seg.length - 1], path: [...seg], how }); seg = [u.pos]; };
  for (let i = 0; i < route.length; i++) {
    const k = route[i], was = u.pos;
    u.pos = k; seg.push(k);
    const t = objectsAt(cb, k).find(isTrap);
    if (t) { t.resolved = true; t.hidden = false; flush(); emitFx(cb, 'trap', { unit: u.id, at: k }); const td: any = t; sprung = ' · steps on a trap' + hurtUnit(u, td.damage ?? kindOf(t).trap!.damage, false, cb, 'trap', td.owner ? cb.units.find((x) => x.id === td.owner) || null : null); cb.objects = objectsOf(cb).filter((x) => x !== t); emit(cb, 'trap_sprung', { u, obj: t, cb }); stopped = 'trap'; }
    if (!stopped && rng && (cb.zones || []).length && zoneEnter(cb, rng, u, k)) { stopped = 'trap'; flush(); }
    const ms: any = emit(cb, 'move_step', { u, from: was, at: k, i, route, how, stop: false, cb, rng });
    if (ms.stop && !stopped) stopped = typeof ms.stop === 'string' ? ms.stop : 'stopped';
    if (reacts && !u.dead && !u.downed) {
      // Opportunity attacks (spec): leaving an enemy's melee reach without Disengaging, checked at each step.
      if (how !== 'disengage' && !mc.skipOA && !immune({ u }, 'opportunity_attack')) for (const h of cb.units) {
        if (u.dead || u.downed) break;
        if (h.side === u.side || !alive(h) || dist(h.pos, was) > 1 || dist(h.pos, k) <= 1 || !canReact(cb, h)) continue;
        // 'reaction_window' {reactor, mover, kind, cancel}: an item may cancel a reaction (or take its own).
        const rw: any = emit(cb, 'reaction_window', { reactor: h, mover: u, kind: 'opportunity', cancel: false, at: k, cb, rng }); if (rw.cancel) continue;
        flush(); useReaction(cb, h); cb.log.push(h.name + ' takes an opportunity attack.'); react(cb, rng!, h, u, 'melee');
      }
      if (!mc.skipOW && !u.dead && !u.downed) { const before = cb.log.length; triggerOverwatch(cb, rng!, u, seg); if (cb.log.length !== before) seg = [u.pos]; }
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
  if (u.side === 'pc' && !u.dead) spotTraps(objectsOf(cb), u.pos, u.vigilant || 0, u.name, (l) => cb.log.push(l));
  if (!u.dead && (cb.zones || []).length) sigilSpot(cb, u);
  // 'moved' {u, from, to, tiles, how, forced:false, route}
  emit(cb, 'moved', { u, from, to: end, tiles: walked, how, forced: false, route: route.slice(0, route.indexOf(end) + 1), stopped: stopped || null, cb, rng });
  sightCheck(cb);
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

function react(cb: Combat, rng: Rng, h: Unit, t: Unit, mode: AttackMode) {
  const pv = previewAttack(cb, h, t, mode, { free: true });
  if (!pv.ok) { cb.log.push('(' + h.name + ' can\'t: ' + pv.why + ')'); return; }
  resolveAttack(cb, rng, h, t, mode, null, { noAp: true }); checkOver(cb);
}
/** Overwatch (spec): a unit holding a shot fires at the first enemy that moves in its sight and range, as its reaction
 * (checked at every step of a walk). A unit may hold more than one shot (u.owShots, class moves), all on one reaction. */
export function triggerOverwatch(cb: Combat, rng: Rng, mover: Unit, seg?: string[]) {
  for (const h of cb.units) if (h.overwatch && h.side !== mover.side && alive(h) && !mover.dead && !mover.downed && !mover.hidden && unitSees(cb, h, mover.pos)) {
    const pv = previewAttack(cb, h, mover, h.overwatch, { free: true }); if (!pv.ok) continue;
    if (!canReact(cb, h)) continue;
    const rw: any = emit(cb, 'reaction_window', { reactor: h, mover, kind: 'overwatch', cancel: false, at: mover.pos, cb, rng }); if (rw.cancel) continue;
    if (seg && seg.length > 1) { emitFx(cb, 'move', { unit: mover.id, from: seg[0], to: seg[seg.length - 1], path: [...seg], how: 'move' }); seg.splice(0, seg.length - 1); }
    useReaction(cb, h); const mode = h.overwatch, shots = Math.max(1, h.owShots || 1); h.overwatch = null; h.owShots = 0;
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
  chained(() => { for (let i = 0; i < 3 && !t.dead && (WEAPON[u.weapon].magazine == null || u.ammo > 0) && !u.jammed; i++) if (resolveAttack(cb, rng, u, t, 'shot', who, { extra: -i, noAp: true, noWear: i > 0, vi: i } as any).refused) break; }, 'burst');
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
  chained(() => { let i = 0; for (const v of hits) { if (u.jammed || (w.magazine != null && u.ammo <= 0)) break; resolveAttack(cb, rng, u, v, 'shot', who, { extra: -2, noAp: true, noWear: true, vi: i++ } as any); } }, 'auto');
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
  u.ap -= 1; u.prone = !u.prone; emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: u.prone ? 'prone' : 'stand' }); cb.log.push(u.name + (u.prone ? ' drops prone.' : ' stands up.')); return null;
}
export function brace(cb: Combat, u: Unit): string | null {
  if (!weaponActions(u).some((x) => x.id === 'brace')) return 'This weapon has nothing to brace.';
  if (u.braced) return 'Already braced.';
  if (u.ap < 1) return 'Needs 1 AP.';
  u.ap -= 1; u.braced = true; emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: 'brace' }); cb.log.push(u.name + ' braces.'); return null;
}

/** A weapon skill's on-hit effect (spec: Weapons v2): lose AP, pushed, prone, bleeding, armour broken. */
function onHit(cb: Combat, att: Unit, t: Unit, fx: any): string {
  if (fx.apply === 'ap_loss') { t.stunnedNext = Math.max(t.stunnedNext, fx.value || 1); return ' · staggered (−AP next turn)'; }
  if (fx.apply === 'prone') { t.prone = true; return ' · knocked prone'; }
  if (fx.apply === 'bleed') { if (immune({ u: t }, 'bleed')) return ''; t.bleed = 3; return ' · Bleeding'; }
  if (fx.apply === 'armour_break') { t.baseArmour ??= t.armour; t.armour = Math.max(t.baseArmour - 10, t.armour - (fx.value || 5), 0); return ' · armour broken (' + t.armour + ')'; }
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
  const keep = { weapon: u.weapon, ammo: u.ammo, attack: u.attack, dur: u.dur, maxDur: u.maxDur, mods: u.mods };
  const skillPts = isMelee(ow) ? (u.athleticsPts || 0) : (u.dexterity || 0);
  u.weapon = ow.id; u.ammo = u.offAmmo ?? (ow.magazine ?? 0); u.maxDur = 0; u.mods = [];
  if (!offTarget.dead) { const p2 = previewAttack(cb, u, offTarget, isMelee(ow) ? 'melee' : 'shot', { free: true }); if (p2.ok) resolveAttack(cb, rng, u, offTarget, isMelee(ow) ? 'melee' : 'shot', who, { extra: Math.min(-1, -3 + Math.floor(skillPts / 3)), noAp: true }); else cb.log.push('(off hand: ' + p2.why + ')'); }
  u.offAmmo = u.ammo; Object.assign(u, keep);
  } finally { fxChain--; VOLLEY = wasV; }
  emit(cb, 'volley_end', { u, mode: 'paired', target: t, cb, rng }); checkOver(cb); return null;
}

/** Reload (spec: Reloading): 2 AP. A magazine weapon swaps in the fullest spare and drops the one in the gun on the floor;
 *  a weapon loaded round by round tops up from loose rounds. Enemies carry unlimited spares. */
export function reload(cb: Combat, u: Unit): string | null {
  const w = WEAPON[u.weapon];
  if (w.magazine == null) return 'Nothing to reload.';
  if (!weaponActions(u).some((x) => x.id === 'reload')) return 'This weapon doesn\'t reload.';
  if (forbids({ u }, 'reload')) return forbids({ u }, 'reload') + ': no reloading.';
  const rAp = reloadAp(u);
  if (u.ap < rAp) return 'Needs ' + rAp + ' AP.';
  emit(cb, 'reload', { u, ap: rAp, cb });
  const rDur = (how: string) => (rAp === 1 ? 800 : how === 'loose' ? 1400 : 1200);
  if (!u.mags) { u.ap -= rAp; u.ammo = w.magazine; u.jammed = false; emitFx(cb, 'reload', { unit: u.id, at: u.pos, weapon: w.id, cat: w.category, how: w.reload === 'loose' ? 'loose' : 'mag', dur: rDur(w.reload === 'loose' ? 'loose' : 'mag') }); cb.log.push(u.name + ' reloads.'); return null; }
  if (w.reload === 'loose') {
    const room = w.magazine - u.ammo, take = Math.min(room, u.loose || 0);
    if (room <= 0) return 'Already full.';
    if (!take) return 'No rounds left to load.';
    u.ap -= rAp; u.ammo += take; u.loose = (u.loose || 0) - take; u.jammed = false;
    emitFx(cb, 'reload', { unit: u.id, at: u.pos, weapon: w.id, cat: w.category, how: 'loose', rounds: take, dur: rDur('loose') });
    cb.log.push(u.name + ' loads ' + take + (take === 1 ? ' round' : ' rounds') + ' (' + u.loose + ' loose left).');
    return null;
  }
  if (!u.mags.some((n) => n > 0)) return 'No loaded spare ' + (w.reload_unit || 'magazine') + 's.' + (u.mags.length && u.loose ? ' Load one first.' : '');
  const i = u.mags.indexOf(Math.max(...u.mags)), fresh = u.mags.splice(i, 1)[0];
  const left = u.ammo, unit = w.reload_unit || 'magazine';
  (cb.floor ||= []).push({ pos: u.pos, weapon: u.weapon, rounds: left, text: (left ? unit + ' with ' + left + (left === 1 ? ' round' : ' rounds') : 'empty ' + unit) });
  u.ap -= rAp; u.ammo = fresh; u.jammed = false;
  emitFx(cb, 'reload', { unit: u.id, at: u.pos, weapon: w.id, cat: w.category, how: 'mag', dur: rDur('mag') });
  cb.log.push(u.name + ' reloads and drops the ' + (left ? unit + ' on the floor with ' + left + (left === 1 ? ' round' : ' rounds') + ' still in it' : 'empty ' + unit) + ' (' + u.mags.length + ' spare left).');
  return null;
}
/** Reload the off-hand gun (2 AP), or both guns at once (3 AP; spec: Weapons v2, Two guns). Each gun takes its own
 * spares (the same pack entry when both hands hold the same model). */
export function reloadHands(cb: Combat, u: Unit, hand: 'off' | 'both'): string | null {
  const ow = u.offWeapon ? WEAPON[u.offWeapon] : null;
  if (!ow || ow.magazine == null || !ow.reload) return 'Your off hand holds no gun to reload.';
  const ap = hand === 'both' ? actionAp({ u }, 'reload_both', 3).ap : actionAp({ u }, 'reload', ow.reload_ap ?? 2).ap;
  if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  const pool = ow.id === u.weapon ? u.mags : u.offMags;
  const takeOne = (): number | null => { if (!pool) return ow.magazine; if (!pool.length) return null; const i = pool.indexOf(Math.max(...pool)); const n = pool[i]; if (n <= 0) return null; pool.splice(i, 1); return n; };
  if (hand === 'both') {
    const w = WEAPON[u.weapon]; if (w.magazine == null) return 'Your main hand holds no gun.';
    const keep = u.ap; u.ap = 99; const e = reload(cb, u); u.ap = keep; if (e && e !== 'Already full.') return e;
  }
  const fresh = takeOne(); if (fresh == null) return 'No loaded spare for the off-hand gun.';
  const left = u.offAmmo ?? 0; if (left) (cb.floor ||= []).push({ pos: u.pos, weapon: ow.id, rounds: left, text: (ow.reload_unit || 'magazine') + ' with ' + left + ' rounds' });
  u.offAmmo = fresh; u.ap -= ap;
  cb.log.push(u.name + (hand === 'both' ? ' reloads both guns' : ' reloads the off-hand gun') + ' (' + ap + ' AP).');
  return null;
}
/** Pick up (spec: Magazines and rounds are inventory): 1 AP, everything on your tile or one adjacent tile. */
export function pickUp(cb: Combat, u: Unit, tile: string): string | null {
  if (dist(u.pos, tile) > 1) return 'Stand on it or next to it.';
  const here = (cb.floor || []).filter((f) => f.pos === tile && f.weapon);
  if (!here.length) return 'Nothing to pick up there.';
  if (u.ap < 1) return 'Needs 1 AP.';
  u.ap -= 1; emitFx(cb, 'pickup', { unit: u.id, at: tile });
  for (const f of here) { if (f.weapon === u.weapon && u.mags) u.mags.push(f.rounds || 0); else (u.extra ||= []).push({ weapon: f.weapon!, rounds: f.rounds || 0 }); }
  cb.floor = (cb.floor || []).filter((f) => !here.includes(f));
  cb.log.push(u.name + ' picks up ' + here.map((f) => f.text).join(', ') + '.');
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
  cb.log.push(u.name + (melee ? ' smashes' : ' shoots') + ' the ' + c.name.toLowerCase() + ' at ' + refOf(tile) + damageObject(cb, tile, weaponDamage(w, r, who?.skills.raw_power || 0) * (who ? physicalMult(who) : 1) * (fx.op === 'cover_damage_mult' ? fx.value : 1)) + '.');
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
  cb.log.push(u.name + ' analyzes ' + t.name + ': HP ' + t.hp + '/' + t.maxHp + ', Defense ' + t.def + ', armour ' + t.armour + (t.weakPoint ? ' · Weak Point: +15% squad damage' : '') + '.');
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
  if (t.downed) { t.downed = false; t.hp = 1; t.saves = { ok: 0, fail: 0 }; cb.log.push(u.name + ' stims ' + t.name + ': stabilised at 1 HP.'); emit(cb, 'heal_given', { t, by: u, n: 1, kind: 'stim', revived: true, cb }); }
  else { const r = healUnit(cb, t, 30 * healingMult(who), u, 'stim'); cb.log.push(u.name + ' stims ' + t.name + ': +' + r.restored + ' HP.'); }
  emitFx(cb, 'stim', { unit: u.id, target: t.id, from: u.pos, to: t.pos, heal: t.hp - (wasDown ? 0 : hpWas), revive: wasDown });
  return null;
}

/** A stim's AP: stabilising a Downed ally 2 (1 for a Medic), healing 1; then items ('stabilise' / 'stim' costs). */
export const stimAp = (u: Unit, t: Unit, isMedic: boolean) => (t.downed ? actionAp({ u }, 'stabilise', isMedic ? 1 : 2).ap : actionAp({ u }, 'stim', 1).ap);

/** Enemy turn: shoot the most hurt PC in sight and range; otherwise close in. Deterministic given the RNG. The AI
 * also keeps the conditions' rules (rules 1.3): it puts itself out when Burning, breaks a grapple, recovers a dropped
 * weapon, attacks the one who Taunted it, never attacks or closes on what it fears, obeys a Commanded order, and
 * ignores Hidden PCs (it doesn't know where they are). */
export function enemyTurn(cb: Combat, rng: Rng) {
  const u = active(cb)!;
  const order = condOn(u, 'commanded') ? u.condArg?.commanded || 'halt' : null;
  for (let step = 0; step < 6 && u.ap > 0 && !cb.over; step++) {
    // 'enemy_action_start' {u, step}: before each enemy action; an item may open a window (Between Heartbeats) or set
    // ctx.skip to make the enemy lose the action. A window pauses the enemy until it closes.
    const ea: any = emit(cb, 'enemy_action_start', { u, step, skip: false, cb, rng });
    if (cb.window || u.dead || u.downed || u.surrendered) break;
    if (ea.skip) continue; // the handler took the action away (and its AP)
    if (condOn(u, 'burning') && u.ap >= 1) { extinguishSelf(cb, u); continue; }
    if (condOn(u, 'grappled') && u.ap >= 2) { escapeHold(cb, rng, u); continue; }
    if ((condOn(u, 'disarmed') && u.ap >= 2) || (condOn(u, 'lowered') && u.ap >= 1)) { recoverHeld(cb, u); continue; }
    if (u.prone && u.ap >= 1 && order !== 'kneel') { toggleProne(cb, u); continue; }
    if (u.jammed && u.ap >= 2) { clearJam(cb, u); continue; }
    if (enemyScuff(cb, u)) continue;
    // Sigil casters (rules 1.4): step out of a hostile field, scuff a turret underfoot, then weigh a spell against the weapon.
    // Sigil magic (rules 1.4, ai-sigil.ts): any enemy steps out of a field of yours and scuffs a turret underfoot; a caster
    // then weighs a spell against its weapon.
    if (!order && aiSigilStep(cb, rng, u)) { checkOver(cb); continue; }
    const w = WEAPON[u.weapon];
    const dry = w.magazine != null && u.ammo <= 0 && !(u.mags || []).some((n) => n > 0);
    if (w.magazine != null && u.ammo <= 0 && !dry && u.ap >= 2 && !condOn(u, 'disarmed')) { reload(cb, u); continue; }
    const mode: 'melee' | 'shot' = isMelee(w) || dry || condOn(u, 'disarmed') ? 'melee' : 'shot';
    const pcs = cb.units.filter((t) => t.side === 'pc' && !t.dead && !t.hidden && !t.surrendered);
    const tauntBy = condSource(u, 'taunted');
    const targets = order === 'hold' || order === 'flee' ? [] : pcs
      .map((t) => ({ t, pv: previewAttack(cb, u, t, mode) }))
      .filter((x) => x.pv.ok)
      .sort((a, b) => (b.t.id === tauntBy ? 1 : 0) - (a.t.id === tauntBy ? 1 : 0) || (a.t.downed ? 1 : 0) - (b.t.downed ? 1 : 0) || a.t.hp - b.t.hp || b.pv.pct - a.pv.pct);
    if (targets.length) { resolveAttack(cb, rng, u, targets[0].t, mode, null); checkOver(cb); continue; }
    if (!order && aiClearBlock(cb, rng, u)) { checkOver(cb); continue; } // a turret of yours that threatens it, a RAISE wall in its way
    if (order === 'halt' || order === 'kneel' || moveBlock(u)) break;
    // close in: the reachable tile that is nearest a living PC and has line of sight to one (Afraid: never nearer the
    // source; fleeing: the tile farthest from every PC)
    const P = paths(cb, u.pos, u.id);
    if (!pcs.length) break;
    const fearOf = condSource(u, 'fear'), fu = fearOf ? cb.units.find((x) => x.id === fearOf) : null;
    let best: string | null = null, bestScore = Infinity;
    for (const [k, tiles] of Object.entries(P.dist)) {
      if (k === u.pos || apForTiles(tiles, u.bank, u.movement) > u.ap - (u.ap > 2 ? 2 : 0)) continue;
      if (fu && !fu.dead && dist(k, fu.pos) < dist(u.pos, fu.pos)) continue;
      const near = Math.min(...pcs.map((t) => dist(k, t.pos)));
      const sees = pcs.some((t) => lineOfSight(cb, k, t.pos) && dist(k, t.pos) <= (mode === 'melee' ? 1 : effectiveRange(w)));
      const score = (order === 'flee' ? -near + tiles * 0.01 : (sees ? 0 : 100) + near + tiles * 0.1) + aiRouteRisk(cb, u, P, k); // around known fields and spotted traps
      if (score < bestScore) { bestScore = score; best = k; }
    }
    if (!best || moveUnit(cb, u, best, rng)) break;
  }
}
const extinguishSelf = (cb: Combat, u: Unit): boolean => { u.ap -= 1; endCond(u, 'burning', cb); cb.log.push(u.name + ' beats out the flames.'); return true; };
function escapeHold(cb: Combat, rng: Rng, u: Unit) { escapeGrappleT(cb, rng, u); }
function recoverHeld(cb: Combat, u: Unit) { recoverWeaponT(cb, u); }

export const combatXp = (cb: Combat) => COMBAT_XP[cb.difficulty] || 50;
export const die6 = (rng: Rng) => die(rng, 6);

// ---------- weapon-granted actions (plan 2.9) ----------
/** Can this weapon jam? Guns with a Heat limit can; bows, crossbows, the flamer, the breacher tube and the core rifle
 * can't (a natural 1 fumbles instead). A weapons.json `handling.deny: ['clear']` or `grant: ['clear']` overrides. */
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
export interface WeaponAction { id: 'reload' | 'load' | 'clear' | 'brace' | 'repair' | 'overwatch' | 'burst' | 'auto' | 'skill'; label: string; ap: number; why: string | null; text: string }
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
    const why = u.jammed ? 'Jammed: clear it first.' : u.ammo >= (magazineSize(w.id, u.mods) ?? w.magazine) ? 'Already full.' : u.mags && w.reload !== 'loose' && !u.mags.some((n) => n > 0) ? 'No loaded spare ' + unit + 's.' : w.reload === 'loose' && u.mags && !(u.loose || 0) ? 'No rounds left to load.' : need(r);
    add({ id: 'reload', label, ap: r, why, text: w.reload === 'loose' ? 'Top up from loose rounds (' + (u.loose ?? 0) + ' carried). Nothing drops.' : 'Swap in your fullest spare ' + unit + ' (' + (u.mags ? u.mags.length + ' left' : 'unlimited') + '). The one in the gun drops on the floor with any rounds left in it.' });
  }
  if (w.reload === 'magazine' && u.mags && u.mags.length) {
    const cap = w.magazine || 0, open = u.mags.filter((n) => n < cap), unit = w.reload_unit || 'magazine';
    const why = !open.length ? 'Every spare ' + unit + ' is full.' : !u.loose ? 'No loose rounds to load.' : need(1);
    add({ id: 'load', label: unit === 'magazine' ? 'Load a magazine' : 'Fill a ' + unit, ap: 1, why, text: 'Load loose rounds into your fullest part-empty ' + unit + ', 1 AP per ' + ROUNDS_PER_AP + ' rounds.' });
  }
  if (canJam(w) || grant.has('clear')) { const c = actionAp({ u }, 'clear_jam', 2).ap; add({ id: 'clear', label: 'Clear jam', ap: c, why: !u.jammed ? 'Not jammed.' : need(c), text: 'A jammed gun can\'t fire until cleared. Clearing resets Heat.' }); }
  const braces = (w.properties || []).includes('requires_braced_or_prone') || (w.properties || []).includes('minus2_to_hit_unless_emplaced') || w.grants?.effect?.op === 'braced_bonus' || grant.has('brace');
  if (braces) add({ id: 'brace', label: 'Brace', ap: 1, why: u.braced ? 'Already braced.' : need(1), text: 'Set the weapon: no −2 for the LMG, the .700 can fire, Recoil halved. Moving ends it.' });
  if (u.maxDur) { const c = actionAp({ u }, 'field_repair', 2).ap; add({ id: 'repair', label: 'Field Repair', ap: c, why: (u.proficiency || 0) < 3 ? 'Needs Proficiency 3.' : !(u.parts || 0) ? 'No spare parts.' : (u.dur ?? u.maxDur) >= u.maxDur ? 'Already in full repair.' : need(c), text: 'Proficiency 3+, one spare-parts charge: +10% durability, +5% per Proficiency above 3.' }); }
  const owAp = attackApCost(w, melee ? 'melee' : 'shot');
  add({ id: 'overwatch', label: melee ? 'Hold a strike' : 'Overwatch', ap: owAp, why: need(owAp), text: melee ? 'Hold a strike until your next turn: the first enemy that moves into your reach takes it, as your reaction.' : 'Hold a shot until your next turn: the first enemy that moves in your sight and range takes it, as your reaction.' });
  for (const m of ['burst', 'auto'] as const) if ((w.modes || []).includes(m)) add({ id: m, label: m === 'auto' ? 'Full auto' : 'Burst', ap: m === 'auto' ? 4 : 3, why: null, text: '' });
  // An item may replace the weapon's own skill (stat 'hide_weapon_skill' > 0: Old School's Fan the Hammer: hooks gap C6).
  if (w.grants && !((u.charId || u.held) && statQuery({ u }, 'hide_weapon_skill', { weapon: w.id, skill: w.grants.name }).add > 0)) add({ id: 'skill', label: w.grants.name + (w.grants.effect?.op === 'narrator' ? ' (Narrator)' : ''), ap: w.grants.effect?.ap || 0, why: null, text: w.grants.text || '' });
  // A unit with a fixed action list (the drone: move and shoot, item 370) has none of the weapon's other actions.
  return u.allowedActions ? out.filter((a) => u.allowedActions!.includes(a.id)) : out;
}
