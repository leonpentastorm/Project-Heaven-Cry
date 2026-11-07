// Grid combat (spec: Combat on the grid; Attacks, damage and armour; Weapons; Downed and dying).
import { ENEMY, WEAPON, COMBAT_XP, type WeaponDef } from './data';
import { type Character, type Injury, ARMOUR, ONE_HANDED, loadedOf, spareMags, packOf, overweightKg, RARITY, maxDurOf, weaponDurOf, gearBonus, gearHas, gearEffects, hasMod, magazineSize, critMult, defense, healingMult, initiativeBonus, injuryResistPct, mainHandSide, maxHp, mod, movement, physicalMult } from './character';
import { type Rng, d20, die } from './rng';
import { type MagicUnit, type Glyph, type Zone, magicOf, magicTurnStart, magicRoundTick, zoneEnter, veilTiles, magicLit, condHit, condOn, enemyScuff, noteDeaths } from './magic';
import { type MapObject, OBJ, makeObject, kindOf, blocksMove, blocksSight, coverKind, isDifficult, isTrap, hazardOf, lightOf } from './objects';

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
}
export interface Combat { /** No XP or weapon kills: the fight started on people who weren't hostile (spec: Anyone is a target). */ noXp?: boolean; name: string; map: MapDef; units: Unit[]; order: string[]; turn: number; round: number; difficulty: string; log: string[]; over: null | 'win' | 'loss'; summary?: string;
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
  /** Hostiles the party has seen at least once this fight (shared sight: visibility(cb, 'pc')), kept as they come into view.
   * The fight music reads it, so an elite or boss in the fog of war changes nothing until it is seen (spec: Music). */
  sighted?: string[];
  /** Presentation events (shots, hits, reloads, spells…) for the client's effects layer, newest last, capped at FX_CAP.
   * Numbered by fxSeq; they carry no rules and nothing reads them back (see FxEvent). */
  fx?: FxEvent[]; fxSeq?: number }

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
 *  draw {unit, at, tile, word} · scuff {unit, at} · evoke {unit, at, shape, tiles, src, impact, targets, words, element, stay?} ·
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
function chained<T>(f: () => T): T { fxChain++; try { return f(); } finally { fxChain--; } }

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
    pos, hp: c.hp, maxHp: maxHp(c), def: defense(c), armour: (ARMOUR[c.armourClass]?.value || 0) + gearBonus(c, 'armour_bonus'), attack: mod(c.skills[w.skill] || 0) + RARITY[c.weaponState?.rarity || 'standard'].acc, weapon: w.id,
    movement: movement(c), init: d20(rng) + initiativeBonus(c), agility: c.attrs.agility || 1, ap: 0, bank: 0, ammo: Math.min(loadedOf(c), magazineSize(w.id, c.weaponState?.mods) ?? 0), heat: 0, jammed: false, shotsThisTurn: 0,
    downed: c.hp <= 0, dead: false, saves: { ok: 0, fail: 0 }, stunnedNext: 0, kills: 0,
    injuries: (c.injuries || []).map((i) => ({ ...i })), bleed: 0, dazedNext: 0, injResist: injuryResistPct(c), hand: mainHandSide(c),
    vigilant: c.skills.vigilant || 0, overweight: overweightKg(c),
    dmgMult: RARITY[c.weaponState?.rarity || 'standard'].dmg, dur: weaponDurOf(c), maxDur: maxDurOf(w.id, c.weaponState?.rarity), mods: [...(c.weaponState?.mods || [])],
    offWeapon: c.offHand && WEAPON[c.offHand.id] ? c.offHand.id : null, offAmmo: c.offHand && WEAPON[c.offHand.id] ? WEAPON[c.offHand.id].magazine ?? 0 : 0,
    light: gearBonus(c, 'light'), darkSight: gearHas(c, 'dark_sight'), hazardImmune: gearEffects(c).filter((e) => e.op === 'hazard_immune').map((e) => e.hazard || ''),
    ignoreDifficult: gearHas(c, 'ignore_difficult'), unarmedBonus: gearBonus(c, 'unarmed_damage_bonus'), proficiency: c.skills.proficiency || 0,
    parts: packOf(c).filter((x) => (x.item || x.id) === 'spare_parts').reduce((t, x) => t + x.qty, 0), dexterity: c.skills.dexterity || 0, athleticsPts: c.skills.athletics || 0, vision: 12 + 2 * ((c.attrs.perception || 1) - 1) + (c.skills.vigilant || 0), sensory: c.skills.sensory || 0, noSprint: overweightKg(c) > 0 || c.armourClass >= 5, strength: mod(c.skills.raw_power || 0), mags: [...spareMags(c)], loose: packOf(c).filter((x) => x.calibre && x.calibre === w.ammo).reduce((t, x) => t + x.qty, 0), analysis: c.skills.analysis || 0,
    mg: magicOf(c),
  };
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

export const alive = (u: Unit) => !u.dead && !u.downed;
export const active = (cb: Combat) => cb.units.find((u) => u.id === cb.order[cb.turn]);

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
export function hurtUnit(u: Unit, dmg: number, ignoreArmour = false, cb?: Combat, why = 'hazard'): string {
  if (u.dead) return '';
  const d = Math.max(1, Math.floor(dmg) - (ignoreArmour ? 0 : u.armour));
  if (u.downed) { u.saves.fail += 1; if (u.saves.fail >= 3) u.dead = true; if (cb) { emitFx(cb, 'hurt', { target: u.id, at: u.pos, dmg: 0, why, killed: u.dead }); if (u.dead) fxFell(cb, u); } return ' · ' + u.name + ' takes a hit while Downed' + (u.dead ? ' and dies' : ''); }
  u.hp = Math.max(0, u.hp - d);
  if (u.hp === 0) { if (u.side === 'foe') u.dead = true; else u.downed = true; }
  if (cb) { emitFx(cb, 'hurt', { target: u.id, at: u.pos, dmg: d, why, killed: u.hp === 0 }); if (u.hp === 0) fxFell(cb, u); }
  return ' · ' + u.name + ' takes ' + d + (u.hp === 0 ? (u.side === 'foe' ? ', down for good' : ', Downed') : '');
}
/** Damage an object on a tile; at 0 HP cover becomes rubble and barrels explode. Returns a log suffix. */
export function damageObject(cb: Combat, k: string, dmg: number, depth = 0): string {
  const o = objectsAt(cb, k).find((x) => x.hp != null && x.hp > 0); if (!o) return '';
  const name = o.name.toLowerCase();
  o.hp = Math.max(0, o.hp! - Math.max(1, Math.floor(dmg)));
  emitFx(cb, 'object', { at: k, what: o.kind, dmg: Math.max(1, Math.floor(dmg)), broken: o.hp <= 0, hp: o.hp });
  if (o.hp > 0) return ' · the ' + name + ' takes ' + Math.floor(dmg) + ' (' + o.hp + '/' + o.max + ')';
  cb.objects = objectsOf(cb).filter((x) => x !== o);
  const kd = kindOf(o);
  if (kd.explodes && depth < 4) {
    let out = ' · the ' + name + ' EXPLODES';
    emitFx(cb, 'explode', { at: k, radius: kd.explodes.radius, what: o.kind });
    for (const u of cb.units) if (!u.dead && dist(u.pos, k) <= kd.explodes.radius) out += hurtUnit(u, kd.explodes.damage, false, cb, 'explosion');
    for (const x of [...objectsOf(cb)]) if (x.pos !== k && dist(x.pos, k) <= kd.explodes.radius) out += damageObject(cb, x.pos, kd.explodes.damage, depth + 1);
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
export function paths(cb: Combat, from: string, self: string) {
  const { w, h } = cb.map, me = cb.units.find((u) => u.id === self), diff = difficultOf(cb);
  const solid = new Set([...moveBlockers(cb), ...objectsOf(cb).filter((o) => isTrap(o) && (me?.side === 'foe' || !o.hidden)).map((o) => o.pos)]);
  const blocked = new Set(cb.units.filter((u) => u.id !== self && !u.dead).map((u) => u.pos));
  const d: Record<string, number> = { [from]: 0 }, prev: Record<string, string> = {}, open = [from];
  while (open.length) {
    open.sort((a, b) => d[a] - d[b]);
    const k = open.shift()!, [x, y] = xy(k);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy, n = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || solid.has(n) || blocked.has(n)) continue;
      if (dx && dy && solid.has(key(x + dx, y)) && solid.has(key(x, y + dy))) continue; // no squeezing diagonally between two walls
      const nd = d[k] + (diff.has(n) && !me?.ignoreDifficult ? 2 : 1) + (dx && dy ? 0.001 : 0);
      if (d[n] === undefined || nd < d[n] - 1e-9) { d[n] = nd; prev[n] = k; open.push(n); }
    }
  }
  for (const k of Object.keys(d)) d[k] = Math.round(d[k]);
  return { dist: d, prev };
}
/** Moving N tiles costs N ÷ Movement AP, rounded up, after tiles already paid for this turn. */
export const apForTiles = (tiles: number, bank: number, mov: number) => Math.ceil(Math.max(0, tiles - bank) / mov - 1e-9);

// ---------- line of sight and cover ----------
export function lineOfSight(cb: Combat, a: string, b: string): boolean {
  const solid = sightBlockers(cb); // half cover doesn't block sight
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
    if (tiles.has(t.pos)) seen.add(t.id);
    else if (eyes.some((u) => dist(u.pos, t.pos) <= 1 + Math.floor((u.sensory || 0) / 3))) sensed.add(t.id);
  }
  return { tiles, seen, sensed };
}
/** Note every hostile the party sees now in cb.sighted (it only grows; old saves start it here). */
export function noteSighted(cb: Combat) {
  if (cb.over) return;
  const seen = visibility(cb, 'pc').seen, had = cb.sighted || [], add = [...seen].filter((id) => !had.includes(id));
  if (add.length || !cb.sighted) cb.sighted = [...had, ...add];
}
/** Does anyone on the attacker's side see the target? */
export const sideSees = (cb: Combat, side: 'pc' | 'foe', tgt: Unit) => cb.units.some((u) => u.side === side && unitSees(cb, u, tgt.pos));

// ---------- attacks ----------
export const isMelee = (w: WeaponDef) => /melee|unarmed/.test(w.category);
export const weaponDamage = (w: WeaponDef, range: number, rawPower = 0) =>
  typeof w.damage === 'number' ? w.damage : w.damage?.within_4 ? (range <= 4 ? w.damage.within_4 : w.damage.within_8) : w.id === 'recurve_bow' ? 20 + 5 * rawPower : 20;
export const attackApCost = (w: WeaponDef, mode: string) => (isMelee(w) ? (w.category.startsWith('heavy') ? 3 : 2) : mode === 'aimed' ? 3 : (w.ap_cost.single ?? 2));
export const effectiveRange = (w: WeaponDef) => (typeof w.range_tiles === 'number' ? w.range_tiles : 8);

export interface AttackPreview { ok: boolean; why?: string; ap: number; toHit: number; need: number; pct: number; cover: number; coverTile?: string | null; rangePenalty: number }
export type AttackMode = 'shot' | 'aimed' | 'melee' | 'burst' | 'auto';
export function previewAttack(cb: Combat, att: Unit, tgt: Unit, mode: AttackMode, opts: { extra?: number; free?: boolean } = {}): AttackPreview {
  const w = WEAPON[att.weapon], melee = isMelee(w) || mode === 'melee', useW = mode === 'melee' && !isMelee(w) ? WEAPON.fists : w;
  const fx: any = (w as any).grants?.effect || {};
  const ap = opts.free ? 0 : mode === 'burst' ? 3 : mode === 'auto' ? (fx.op === 'auto_ap' ? fx.value : 4) : mode === 'aimed' && fx.op === 'aimed_ap' ? fx.value : attackApCost(useW, mode === 'aimed' ? 'aimed' : mode === 'melee' ? 'melee' : 'shot');
  const fail = (why: string): AttackPreview => ({ ok: false, why, ap, toHit: 0, need: 0, pct: 0, cover: 0, rangePenalty: 0 });
  if (!alive(tgt) && !tgt.downed) return fail('Target is out of the fight.');
  if (att.ap < ap) return fail('Needs ' + ap + ' AP.');
  if ((mode === 'burst' || mode === 'auto') && !(w.modes || []).includes(mode)) return fail('This weapon has no ' + (mode === 'auto' ? 'full auto' : 'burst') + '.');
  // An ally (friendly fire) needs this unit's own sight; the squad's shared sight covers the other side.
  if (tgt.side === att.side ? !unitSees(cb, att, tgt.pos) : !sideSees(cb, att.side, tgt)) return fail('You can\'t see it.');
  if (!melee && att.maxDur && (att.dur ?? 1) <= 0) return fail('Broken: Field Repair first.');
  if (!melee && (w.properties || []).includes('requires_braced_or_prone') && !att.braced && !att.prone) return fail('Brace it first (1 AP), or go prone.');
  const r = dist(att.pos, tgt.pos);
  if (melee && r > (useW.properties?.includes('reach_2') || useW.id === 'lance' || (useW === w && fx.op === 'reach') ? (fx.op === 'reach' && useW === w ? fx.value : 2) : 1)) return fail('Out of melee reach.');
  if (!melee && att.jammed) return fail('Weapon jammed: clear it (2 AP).');
  if (!melee && w.magazine != null && att.ammo <= 0) return fail('Empty: reload (2 AP).');
  if (!melee && !lineOfSight(cb, att.pos, tgt.pos)) return fail('No line of sight.');
  const eff = effectiveRange(useW), optic = hasMod(att.mods, 'mod_red_dot') || (hasMod(att.mods, 'mod_scope') && mode === 'aimed') ? 1 : 0, bands = melee ? 0 : Math.max(0, Math.ceil(r / eff) - 1 - optic);
  if (bands > 2) return fail('Out of range.');
  const coverTile = melee ? null : coverTileFor(cb, att.pos, tgt.pos), cover = coverTile ? 5 : 0;
  const rangePenalty = -2 * bands;
  const heat = melee ? 0 : -Math.floor(att.heat / 2);
  const prone = tgt.prone ? (melee ? 2 : -2) : 0, unbraced = !melee && (w.properties || []).includes('minus2_to_hit_unless_emplaced') && !att.braced && !att.prone ? -2 : 0;
  const skillBonus = useW !== w ? 0 : (fx.op === 'hit_bonus' && r <= fx.within ? fx.value : 0) + (fx.op === 'first_shot_bonus' && !att.firstShotDone ? fx.value : 0)
    + (fx.op === 'aimed_still_bonus' && mode === 'aimed' && !att.moved ? fx.value : 0) + (fx.op === 'braced_bonus' && att.braced ? fx.value : 0) + (hasMod(att.mods, 'mod_scope') && mode === 'aimed' ? 1 : 0);
  const toHit = att.attack + (att.song || 0) + skillBonus + (useW.accuracy || 0) + (mode === 'aimed' ? 2 : 0) + (mode === 'auto' ? -2 : 0) + (opts.extra || 0) + rangePenalty + heat + armPenalty(att, useW) + (tgt.downed ? 2 : 0) + prone + unbraced - cover + condHit(att);
  const pct = Math.max(5, Math.min(95, (21 - (tgt.def - toHit)) * 5));
  return { ok: true, ap, toHit, need: tgt.def, pct, cover, coverTile, rangePenalty };
}

export interface AttackResult { roll: number; total: number; vs: number; hit: boolean; crit: boolean; fumble: boolean; damage: number; line: string; killed: boolean; refused?: string }
export function resolveAttack(cb: Combat, rng: Rng, att: Unit, tgt: Unit, mode: AttackMode, who: Character | null, opts: { extra?: number; free?: boolean; noAp?: boolean; dmgMult?: number; noWear?: boolean } = {}): AttackResult {
  const pv = previewAttack(cb, att, tgt, mode, { extra: opts.extra, free: opts.free || opts.noAp });
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
  const roll = d20(rng), total = roll + pv.toHit;
  const fx: any = useW === w ? (w as any).grants?.effect || {} : {};
  const worn = att.maxDur ? (att.dur ?? att.maxDur) <= att.maxDur * 0.25 : false;
  const crit = roll === 20 || (mode === 'aimed' && roll >= (fx.op === 'aimed_crit_min' ? fx.value : 19)), fumble = roll === 1;
  const hit = !fumble && (crit || total >= pv.need);
  if (!melee) {
    if (w.magazine != null) att.ammo = Math.max(0, att.ammo - 1);
    att.heat += 1; att.shotsThisTurn++;
    if (fumble || (worn && roll <= 2) || (w.heat_limit && att.heat >= w.heat_limit)) att.jammed = true;
  } else if (fumble) att.stunnedNext = 1;
  // Durability (spec: Weapons v2): every attack wears 1; a jam or fumble 5 more.
  if (att.maxDur && useW === w && !opts.noWear) att.dur = Math.max(0, (att.dur ?? att.maxDur) - 1 - (fumble || att.jammed ? 5 : 0));
  att.firstShotDone = true;
  // The event goes out before the hit's consequences (knockback, conditions) so the client plays them in order.
  const ev = emitFx(cb, melee ? 'melee' : 'shot', { unit: att.id, target: tgt.id, from: attAt, to: tgtAt, weapon: useW.id, cat: useW.category, mode, hit, crit, fumble, dmg: 0, killed: false,
    ...(!melee && att.jammed ? { jam: true } : {}), ...(fxChain ? { chain: true } : {}) });
  let damage = 0, killed = false, injury = '';
  if (hit) {
    const bayonet = melee && useW === WEAPON.fists && hasMod(att.mods, 'mod_bayonet');
    const base = bayonet ? 15 : weaponDamage(useW, dist(att.pos, tgt.pos), who?.skills.raw_power || 0) + (useW.category === 'unarmed' ? att.unarmedBonus || 0 : 0) + (melee && useW === w && hasMod(att.mods, 'mod_weighted') ? 3 : 0) - (!melee && hasMod(att.mods, 'mod_suppressor') ? 2 : 0);
    let dmg = base * (who ? physicalMult(who) : 1) * (useW === w ? att.dmgMult || 1 : 1) * (opts.dmgMult || 1);
    if (melee && useW === w && att.maxDur) dmg *= (att.dur ?? 1) <= 0 ? 0.5 : worn ? 0.9 : 1;
    if (crit) dmg *= who ? critMult(who) : 2;
    if (tgt.weakPoint && att.side === 'pc') dmg *= 1.15;
    if (fx.op === 'vs_status_damage' && ((tgt.bleed && fx.statuses.includes('bleeding')) || (tgt.dazedNext && fx.statuses.includes('dazed')) || (tgt.downed && fx.statuses.includes('downed')))) dmg *= fx.mult;
    const pierce = (fx.op === 'ignore_armour' ? fx.value : 0) + (useW.properties?.includes('armor_ignore_5') ? 5 : 0);
    damage = Math.max(1, Math.floor(dmg) - Math.max(0, (useW.properties?.includes('ignores_10_armour') ? Math.max(0, tgt.armour - 10) : tgt.armour) - pierce));
    // A WARD shield takes damage first (spec: Sigils).
    if (tgt.shield && tgt.shield > 0 && !tgt.downed) { const s = Math.min(tgt.shield, damage); tgt.shield -= s; damage -= s; }
    if (tgt.downed) { tgt.saves.fail += crit ? 2 : 1; if (tgt.saves.fail >= 3) { tgt.dead = true; killed = true; } }
    else if (damage <= 0) { /* all on the shield */ }
    else {
      tgt.hp = Math.max(0, tgt.hp - damage);
      if (tgt.hp === 0) { if (tgt.side === 'foe') { tgt.dead = true; } else { tgt.downed = true; } killed = true; }
    }
    if (killed && tgt.side !== att.side) att.kills += tgt.tier === 'boss' ? 3 : 1; // friendly fire earns no kills
    if (killed) { ev.dmg = damage; ev.killed = true; fxFell(cb, tgt); }
    if (crit && !tgt.dead && !tgt.downed) injury = rollInjury(rng, tgt);
    if (crit && !tgt.dead && melee && hasMod(att.mods, 'mod_serrated')) { tgt.bleed = 3; injury += ' · Bleeding'; }
    if (!tgt.dead && fx.op === 'on_hit') injury += onHit(cb, att, tgt, fx);
  }
  // A shot that misses only because of half cover's −5 hits the cover (spec: Cover).
  const stopped = !hit && !fumble && !!pv.coverTile && total + pv.cover >= pv.need;
  ev.dmg = damage; ev.killed = killed; if (stopped) ev.cover = pv.coverTile;
  if (hit && tgt.downed && !killed) ev.downedHit = true;
  if (stopped) injury = ' · stopped by cover' + damageCover(cb, pv.coverTile!, weaponDamage(useW, dist(att.pos, tgt.pos), who?.skills.raw_power || 0) * (who ? physicalMult(who) : 1) * (fx.op === 'cover_damage_mult' ? fx.value : 1));
  const verb = melee ? 'strikes' : mode === 'aimed' ? 'takes an aimed shot at' : 'fires at';
  const line = att.name + ' ' + verb + ' ' + tgt.name + ': d20 ' + roll + ' ' + (pv.toHit >= 0 ? '+' : '−') + Math.abs(pv.toHit) + (pv.cover ? ' (incl. −5 cover)' : '') + ' = ' + total + ' vs ' + pv.need +
    (fumble ? (melee ? ' · fumble, −1 AP next turn' : ' · natural 1, the gun jams') : hit ? (crit ? ' · CRITICAL, ' : ' · hit, ') + damage + ' damage' + (killed ? (tgt.side === 'foe' ? ' · down for good' : ' · Downed') : '') + injury : ' · miss' + injury);
  cb.log.push(line);
  return { roll, total, vs: pv.need, hit, crit, fumble, damage, line, killed };
}

/** After a critical: Injury resistance (d100), then a d6 for the location (spec: Injuries). Returns the log suffix. */
export function rollInjury(rng: Rng, t: Unit): string {
  const resist = t.injResist || 0;
  if (resist > 0) { const r = die(rng, 100); if (r <= resist) return ' · injury resisted (d100 ' + r + ' ≤ ' + resist + '%)'; }
  const d = die(rng, 6), inj = t.injuries || (t.injuries = []);
  if (d === 1) { t.dazedNext = 1; return ' · INJURY (d6 ' + d + '): head, Dazed'; }
  if (d <= 3) { t.bleed = 3; return ' · INJURY (d6 ' + d + '): torso, Bleeding'; }
  const side: 'left' | 'right' = die(rng, 2) === 1 ? 'left' : 'right';
  if (d === 4) { inj.push({ loc: 'arm', side }); return ' · INJURY (d6 ' + d + '): ' + side + ' arm, −2 to attacks with it'; }
  if (!inj.some((i) => i.loc === 'leg')) t.movement = Math.max(0.5, t.movement / 2);
  inj.push({ loc: 'leg', side });
  return ' · INJURY (d6 ' + d + '): ' + side + ' leg, half Movement';
}

// ---------- turns ----------
/** Start a fight. PCs stand where they stood in the story (pos), enemies where the Narrator put them (at, a grid reference); otherwise the map's start tiles. */
export function startCombat(name: string, mapId: string | MapDef, pcs: { c: Character; pos?: string }[], foes: { name: string; tier: string; weapon: string; at?: string; hp?: number }[], difficulty: string, rng: Rng, objects?: MapObject[]): Combat {
  const map = typeof mapId === 'string' ? MAPS[mapId] || MAPS.rear_pad : mapId;
  const objs = objects ? JSON.parse(JSON.stringify(objects)) as MapObject[] : defaultObjects(map);
  const units: Unit[] = [], taken = new Set<string>(objs.filter(blocksMove).map((o) => o.pos));
  const anyFree = () => { for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) { const k = key(x, y); if (standable(map, k) && !taken.has(k)) return k; } return null; };
  const place = (want: string | null | undefined, fallback: string[]) => { const k = want && standable(map, want) && !taken.has(want) ? want : fallback.find((f) => !taken.has(f)) || anyFree() || fallback[0]; taken.add(k); return k; };
  pcs.forEach(({ c, pos }) => units.push(unitFromCharacter(c, place(pos, map.pcStart), rng)));
  foes.slice(0, Math.max(map.foeStart.length, 8)).forEach((f, i) => {
    const u = unitFromEnemy('foe-' + i, f.name, f.tier, f.weapon, place(f.at ? keyOf(f.at, map) : null, map.foeStart), rng);
    if (f.hp != null && f.hp > 0) u.hp = Math.min(u.maxHp, Math.round(f.hp)); // wounded in a fight it walked away from
    units.push(u);
  });
  const order = [...units].sort((a, b) => b.init - a.init || b.agility - a.agility).map((u) => u.id);
  const cb: Combat = { name, map, units, order, turn: 0, round: 1, difficulty: COMBAT_XP[difficulty] ? difficulty : 'standard', log: ['Initiative: ' + order.map((id) => { const u = units.find((x) => x.id === id)!; return u.name + ' ' + u.init; }).join(' · ')], over: null };
  cb.objects = objs;
  beginTurn(cb, rng);
  return cb;
}

/** Start the active unit's turn: AP, heat cooldown, Downed death saves (spec: Downed and dying). */
export function beginTurn(cb: Combat, rng: Rng) {
  const u = active(cb);
  if (!u) return;
  u.ap = Math.max(2, Math.min(9, 6 - (u.stunnedNext ? 1 : 0) - (u.dazedNext ? 2 : 0)));
  if (u.dazedNext) cb.log.push(u.name + ' is Dazed: −2 AP this turn.');
  u.stunnedNext = 0; u.dazedNext = 0; u.overwatch = null; u.moved = false; u.bank = 0; u.shotsThisTurn = 0; u.heat = Math.max(0, u.heat - 2);
  emitFx(cb, 'turn', { unit: u.id, side: u.side, at: u.pos, round: cb.round });
  // Magic upkeep (spec: Mana): conditions, a held Outburst growing, Strain, wall zones.
  magicTurnStart(cb, rng, u); if (u.dead) { u.ap = 0; return; }
  const hzObj = objectsAt(cb, u.pos).find((o) => hazardOf(o) && !(u.hazardImmune || []).includes(o.kind)), hz = hzObj ? hazardOf(hzObj) : null;
  if (hz && !u.dead) { cb.log.push(u.name + ' starts the turn in ' + (objectsAt(cb, u.pos).find((o) => hazardOf(o))!.name.toLowerCase()) + hurtUnit(u, hz.damage, true, cb, 'hazard')); if (u.downed || u.dead) { u.ap = 0; return; } }
  if (u.bleed && !u.dead && !u.downed) {
    u.bleed--; u.hp = Math.max(0, u.hp - 5);
    emitFx(cb, 'hurt', { target: u.id, at: u.pos, dmg: 5, why: 'bleed', killed: u.hp === 0 }); if (u.hp === 0) { if (u.side === 'foe') u.dead = true; else u.downed = true; fxFell(cb, u); }
    cb.log.push(u.name + ' bleeds: 5 damage' + (u.hp === 0 ? (u.side === 'foe' ? ' · down for good' : ' · Downed') : ''));
    if (u.hp === 0) { if (u.side === 'foe') u.dead = true; else u.downed = true; u.bleed = 0; u.ap = 0; return; }
  }
  if (u.downed && !u.dead) {
    const r = d20(rng);
    if (r >= 10) u.saves.ok++; else u.saves.fail++;
    cb.log.push(u.name + ' is Downed: death save d20 ' + r + (r >= 10 ? ' · success (' + u.saves.ok + '/3)' : ' · failure (' + u.saves.fail + '/3)'));
    if (u.saves.ok >= 3) { u.downed = false; u.hp = 1; u.saves = { ok: 0, fail: 0 }; cb.log.push(u.name + ' stabilises at 1 HP.'); }
    else if (u.saves.fail >= 3) { u.dead = true; cb.log.push(u.name + ' dies.'); fxFell(cb, u); }
    u.ap = 0;
  }
}

export function checkOver(cb: Combat) {
  const foes = cb.units.filter((u) => u.side === 'foe'), pcs = cb.units.filter((u) => u.side === 'pc');
  if (!foes.length) return cb.over; // a fight with no foes never ends as a win
  if (foes.every((u) => u.dead || u.downed)) cb.over = 'win';
  else if (pcs.every((u) => u.dead || u.downed)) cb.over = 'loss';
  return cb.over;
}

/** Pass the turn to the next unit that can act; Downed PCs still get turns (death saves). */
export function endTurn(cb: Combat, rng: Rng) {
  if (checkOver(cb)) return;
  for (let guard = 0; guard < cb.units.length * 2; guard++) {
    cb.turn++;
    if (cb.turn >= cb.order.length) { cb.turn = 0; cb.round++; magicRoundTick(cb); }
    const u = active(cb)!;
    if (u.dead || (u.side === 'foe' && u.downed)) continue;
    if (u.waitRound && cb.round < u.waitRound) { cb.log.push(u.name + ' is still reeling from striking in the open: no turn this round.'); continue; }
    beginTurn(cb, rng);
    if (u.dead || (u.downed && u.side === 'pc')) { checkOver(cb); if (cb.over) return; continue; }
    return;
  }
}

/** Move (spec: Moving; Sprint; Disengage). Opportunity attacks and Overwatch fire as reactions when rng is given. */
export function moveUnit(cb: Combat, u: Unit, to: string, rng?: Rng, how: 'move' | 'sprint' | 'disengage' = 'move'): string | null {
  if (u.downed || u.dead) return 'Downed units can\'t move.';
  if (u.prone) return 'Stand up first (1 AP).';
  if (condOn(u, 'pinned')) return 'Pinned: you can\'t move this round.';
  const P = paths(cb, u.pos, u.id);
  const tiles = P.dist[to];
  if (tiles === undefined || to === u.pos) return 'Can\'t reach that tile.';
  let ap: number;
  if (how === 'sprint') { if (u.noSprint) return 'Overburdened or in Juggernaut armour: no Sprint.'; if (tiles > Math.floor(3 * u.movement)) return 'Too far to sprint (' + Math.floor(3 * u.movement) + ' tiles).'; ap = 2; }
  else if (how === 'disengage') { if (tiles > 1) return 'Disengage moves 1 tile.'; ap = 1; }
  else ap = apForTiles(tiles, u.bank, u.movement);
  if (ap > u.ap) return 'Needs ' + ap + ' AP.';
  const from = u.pos;
  u.ap -= ap; if (how === 'move') u.bank = u.bank + ap * u.movement - tiles; u.braced = false; u.moved = true;
  // Walk the path: a hidden trap stops you on its tile and springs (spec: Map objects).
  const route: string[] = []; for (let k = to; k !== u.pos && P.prev[k]; k = P.prev[k]) route.unshift(k);
  let end = to, sprung = '';
  const trapAt = route.find((k) => objectsAt(cb, k).some(isTrap)), walked = trapAt ? route.slice(0, route.indexOf(trapAt) + 1) : route;
  emitFx(cb, 'move', { unit: u.id, from, to: trapAt || to, path: [from, ...walked], how });
  for (const k of route) { const t = objectsAt(cb, k).find(isTrap); if (t) { end = k; t.resolved = true; t.hidden = false; emitFx(cb, 'trap', { unit: u.id, at: k }); u.pos = k; sprung = ' · steps on a trap' + hurtUnit(u, kindOf(t).trap!.damage, false, cb, 'trap'); cb.objects = objectsOf(cb).filter((x) => x !== t); break; } }
  u.pos = end;
  if (rng && (cb.zones || []).length) for (const k of route) { if (u.dead) break; zoneEnter(cb, rng, u, k); if (k === end) break; }
  cb.log.push(u.name + (how === 'sprint' ? ' sprints' : how === 'disengage' ? ' disengages' : ' moves') + ' to ' + refOf(end) + ' (' + tiles + (tiles === 1 ? ' tile' : ' tiles') + ', ' + ap + ' AP)' + sprung + '.');
  if (u.side === 'pc' && !u.dead) spotTraps(objectsOf(cb), u.pos, u.vigilant || 0, u.name, (l) => cb.log.push(l));
  if (rng) {
    // Opportunity attacks (spec): leaving an enemy's melee reach without Disengaging.
    if (how !== 'disengage') for (const h of cb.units) if (h.side !== u.side && alive(h) && dist(h.pos, from) <= 1 && dist(h.pos, u.pos) > 1 && h.reactedRound !== cb.round && !u.dead) {
      h.reactedRound = cb.round; cb.log.push(h.name + ' takes an opportunity attack.'); react(cb, rng, h, u, 'melee');
    }
    triggerOverwatch(cb, rng, u);
  }
  return null;
}

function react(cb: Combat, rng: Rng, h: Unit, t: Unit, mode: AttackMode) {
  const pv = previewAttack(cb, h, t, mode, { free: true });
  if (!pv.ok) { cb.log.push('(' + h.name + ' can\'t: ' + pv.why + ')'); return; }
  resolveAttack(cb, rng, h, t, mode, null, { noAp: true }); checkOver(cb);
}
/** Overwatch (spec): a unit holding a shot fires at the first enemy that moves in its sight and range. */
export function triggerOverwatch(cb: Combat, rng: Rng, mover: Unit) {
  for (const h of cb.units) if (h.overwatch && h.side !== mover.side && alive(h) && !mover.dead && h.reactedRound !== cb.round && unitSees(cb, h, mover.pos)) {
    const pv = previewAttack(cb, h, mover, h.overwatch, { free: true }); if (!pv.ok) continue;
    h.reactedRound = cb.round; const mode = h.overwatch; h.overwatch = null;
    cb.log.push(h.name + ' fires from overwatch.'); resolveAttack(cb, rng, h, mover, mode, null, { noAp: true }); checkOver(cb);
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
  u.ap -= 3; cb.log.push(u.name + ' fires a burst.');
  emitFx(cb, 'volley', { unit: u.id, target: t.id, from: u.pos, to: t.pos, weapon: u.weapon, cat: WEAPON[u.weapon].category, mode: 'burst', shots: 3 });
  // resolveAttack refuses (and ends the burst on) any round the preview won't allow: broken gun, target pushed out of sight.
  chained(() => { for (let i = 0; i < 3 && !t.dead && (WEAPON[u.weapon].magazine == null || u.ammo > 0) && !u.jammed; i++) if (resolveAttack(cb, rng, u, t, 'shot', who, { extra: -i, noAp: true, noWear: i > 0 }).refused) break; });
  u.heat = Math.max(0, u.heat - 1); checkOver(cb); return null;
}
export function fireAuto(cb: Combat, rng: Rng, u: Unit, t: Unit, who: Character | null): string | null {
  const pv = previewAttack(cb, u, t, 'auto'); if (!pv.ok) return pv.why!;
  const [ax, ay] = xy(u.pos), [tx, ty] = xy(t.pos), len = Math.hypot(tx - ax, ty - ay) || 1;
  const near = (v: Unit) => { const [vx, vy] = xy(v.pos), along = ((vx - ax) * (tx - ax) + (vy - ay) * (ty - ay)) / len; return along > 0 && Math.abs((vx - ax) * (ty - ay) - (vy - ay) * (tx - ax)) / len <= (((WEAPON[u.weapon] as any).grants?.effect?.op === 'auto_width') ? (WEAPON[u.weapon] as any).grants.effect.value + 0.5 : 1.5); };
  const hits = cb.units.filter((v) => v.side !== u.side && !v.dead && near(v) && previewAttack(cb, u, v, 'auto', { free: true }).ok);
  u.ap -= 4; cb.log.push(u.name + ' opens up on full auto.');
  const w = WEAPON[u.weapon], startAmmo = u.ammo;
  emitFx(cb, 'volley', { unit: u.id, target: t.id, from: u.pos, to: t.pos, weapon: u.weapon, cat: w.category, mode: 'auto', shots: 10 });
  // The line is worked out once; each target is checked again as it comes up (resolveAttack refuses a shot it can't
  // take), and a jam or an empty magazine ends the burst of fire.
  chained(() => { for (const v of hits) { if (u.jammed || (w.magazine != null && u.ammo <= 0)) break; resolveAttack(cb, rng, u, v, 'shot', who, { extra: -2, noAp: true, noWear: true }); } });
  if (u.maxDur) u.dur = Math.max(0, (u.dur ?? u.maxDur) - 2);
  if (w.magazine != null) u.ammo = Math.max(0, startAmmo - 10);
  u.heat += 4 - hits.length; checkOver(cb); return null;
}
/** Shove (spec): 2 AP, adjacent; d20 + Raw Power vs 10 + the target's best of Raw Power and Athletics; pushed 1 tile, or prone if blocked. */
export function shove(cb: Combat, rng: Rng, u: Unit, t: Unit): string | null {
  if (dist(u.pos, t.pos) > 1 || t.dead) return 'Shove someone next to you.';
  if (u.ap < 2) return 'Needs 2 AP.';
  u.ap -= 2;
  const roll = d20(rng), total = roll + (u.strength ?? 0), need = 10 + Math.max(t.strength ?? 0, 0);
  let line = u.name + ' shoves ' + t.name + ': d20 ' + roll + ' ' + ((u.strength ?? 0) >= 0 ? '+' : '−') + Math.abs(u.strength ?? 0) + ' = ' + total + ' vs ' + need;
  if (total >= need) {
    const [ux, uy] = xy(u.pos), [tx, ty] = xy(t.pos), to = key(tx + Math.sign(tx - ux), ty + Math.sign(ty - uy));
    const [nx, ny] = xy(to), blocked = nx < 0 || ny < 0 || nx >= cb.map.w || ny >= cb.map.h || moveBlockers(cb).has(to) || cb.units.some((v) => !v.dead && v.pos === to);
    const was = t.pos;
    if (blocked) { t.prone = true; line += ' · knocked prone'; } else { t.pos = to; t.braced = false; line += ' · pushed to ' + refOf(to); }
    emitFx(cb, 'shove', { unit: u.id, target: t.id, from: was, to: t.pos, ok: true, prone: blocked });
  } else { line += ' · holds firm'; emitFx(cb, 'shove', { unit: u.id, target: t.id, from: t.pos, to: t.pos, ok: false }); }
  cb.log.push(line + '.'); return null;
}
export function toggleProne(cb: Combat, u: Unit): string | null {
  if (u.ap < 1) return 'Needs 1 AP.';
  u.ap -= 1; u.prone = !u.prone; emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: u.prone ? 'prone' : 'stand' }); cb.log.push(u.name + (u.prone ? ' drops prone.' : ' stands up.')); return null;
}
export function brace(cb: Combat, u: Unit): string | null {
  if (u.braced) return 'Already braced.';
  if (u.ap < 1) return 'Needs 1 AP.';
  u.ap -= 1; u.braced = true; emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: 'brace' }); cb.log.push(u.name + ' braces.'); return null;
}

/** A weapon skill's on-hit effect (spec: Weapons v2): lose AP, pushed, prone, bleeding, armour broken. */
function onHit(cb: Combat, att: Unit, t: Unit, fx: any): string {
  if (fx.apply === 'ap_loss') { t.stunnedNext = Math.max(t.stunnedNext, fx.value || 1); return ' · staggered (−AP next turn)'; }
  if (fx.apply === 'prone') { t.prone = true; return ' · knocked prone'; }
  if (fx.apply === 'bleed') { t.bleed = 3; return ' · Bleeding'; }
  if (fx.apply === 'armour_break') { t.baseArmour ??= t.armour; t.armour = Math.max(t.baseArmour - 10, t.armour - (fx.value || 5), 0); return ' · armour broken (' + t.armour + ')'; }
  if (fx.apply === 'push') {
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
    if (u.ap < fx.ap) return 'Needs ' + fx.ap + ' AP.';
    const pv = previewAttack(cb, u, t, 'shot', { free: true }); if (!pv.ok) return pv.why!;
    const rounds = fx.rounds || 1;
    if (w.magazine != null && u.ammo < rounds) return 'Not enough rounds loaded.';
    u.ap -= fx.ap; cb.log.push(u.name + ' uses ' + (w as any).grants.name + '.');
    emitFx(cb, 'volley', { unit: u.id, target: t.id, from: u.pos, to: t.pos, weapon: w.id, cat: w.category, mode: 'skill', name: (w as any).grants.name, shots: fx.shots });
    // Each shot after the first is checked again: one that can no longer be taken (the target fell or dropped out of
    // sight, the gun broke) ends the volley; it is never rolled against a refused preview.
    chained(() => { for (let i = 0; i < fx.shots && !t.dead && !u.jammed && (w.magazine == null || u.ammo > 0); i++) {
      if (i > 0) { const p = previewAttack(cb, u, t, 'shot', { free: true }); if (!p.ok) { cb.log.push('(' + (w as any).grants.name + ' stops: ' + p.why + ')'); break; } }
      resolveAttack(cb, rng, u, t, 'shot', who, { extra: fx.extra || 0, noAp: true, dmgMult: fx.dmg_mult || 1, noWear: i > 0 });
    } });
    if (rounds > 1 && w.magazine != null) u.ammo = Math.max(0, u.ammo - (rounds - 1));
    checkOver(cb); return null;
  }
  if (fx.op === 'sweep') {
    if (u.ap < fx.ap) return 'Needs ' + fx.ap + ' AP.';
    const near = cb.units.filter((v) => v.side !== u.side && !v.dead && dist(v.pos, u.pos) <= 1 && sideSees(cb, u.side, v));
    if (!near.length) return 'Nobody next to you.';
    u.ap -= fx.ap; cb.log.push(u.name + ' uses ' + (w as any).grants.name + '.');
    emitFx(cb, 'volley', { unit: u.id, from: u.pos, weapon: w.id, cat: w.category, mode: 'sweep', name: (w as any).grants.name, shots: near.length });
    chained(() => { for (const v of near) resolveAttack(cb, rng, u, v, 'melee', who, { noAp: true }); });
    checkOver(cb); return null;
  }
  return (w as any).grants ? (w as any).grants.name + ' isn\'t an action the engine runs yet: say it with Say, and the Narrator rules it after the fight.' : 'No weapon skill.';
}
/** Field Repair (spec): 2 AP, Proficiency 3+, one spare-parts charge; restores 10% + 5% per Proficiency point above 3. */
export function fieldRepair(cb: Combat, u: Unit): string | null {
  if (!u.maxDur) return 'Nothing to repair.';
  if ((u.proficiency || 0) < 3) return 'Needs Proficiency 3.';
  if (!(u.parts || 0)) return 'No spare-parts charges.';
  if ((u.dur ?? u.maxDur) >= u.maxDur) return 'Already in full repair.';
  if (u.ap < 2) return 'Needs 2 AP.';
  const add = Math.ceil(u.maxDur * (0.1 + 0.05 * ((u.proficiency || 3) - 3)));
  u.ap -= 2; u.parts = (u.parts || 0) - 1; u.dur = Math.min(u.maxDur, (u.dur ?? 0) + add); emitFx(cb, 'repair', { unit: u.id, at: u.pos, dur: 1400 });
  cb.log.push(u.name + ' patches the weapon: +' + add + ' durability (' + u.dur + '/' + u.maxDur + ').'); return null;
}
/** Paired attack (spec: Hands): both weapons in one action. AP = the higher cost + 1; main −1, off −3 (better by 1 per 3 skill points, to −1). */
export function pairedAttack(cb: Combat, rng: Rng, u: Unit, t: Unit, t2: Unit | null, who: Character | null): string | null {
  if (!u.offWeapon) return 'Nothing in your off hand to attack with.';
  const mw = WEAPON[u.weapon], ow = WEAPON[u.offWeapon];
  const cost = Math.max(attackApCost(mw, isMelee(mw) ? 'melee' : 'shot'), attackApCost(ow, isMelee(ow) ? 'melee' : 'shot')) + 1;
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  const offTarget = t2 || t, mainMode = isMelee(mw) ? 'melee' : 'shot';
  const pv = previewAttack(cb, u, t, mainMode, { free: true }); if (!pv.ok) return pv.why!;
  u.ap -= cost; cb.log.push(u.name + ' attacks with both hands.');
  emitFx(cb, 'volley', { unit: u.id, target: t.id, from: u.pos, to: t.pos, weapon: mw.id, cat: mw.category, mode: 'paired', shots: 2 });
  fxChain++;
  try {
  resolveAttack(cb, rng, u, t, mainMode, who, { extra: -1, noAp: true });
  // swap the off-hand weapon in for its own swing or shot
  const keep = { weapon: u.weapon, ammo: u.ammo, attack: u.attack, dur: u.dur, maxDur: u.maxDur, mods: u.mods };
  const skillPts = isMelee(ow) ? (u.athleticsPts || 0) : (u.dexterity || 0);
  u.weapon = ow.id; u.ammo = u.offAmmo ?? (ow.magazine ?? 0); u.maxDur = 0; u.mods = [];
  if (!offTarget.dead) { const p2 = previewAttack(cb, u, offTarget, isMelee(ow) ? 'melee' : 'shot', { free: true }); if (p2.ok) resolveAttack(cb, rng, u, offTarget, isMelee(ow) ? 'melee' : 'shot', who, { extra: Math.min(-1, -3 + Math.floor(skillPts / 3)), noAp: true }); else cb.log.push('(off hand: ' + p2.why + ')'); }
  u.offAmmo = u.ammo; Object.assign(u, keep);
  } finally { fxChain--; }
  checkOver(cb); return null;
}

/** Reload (spec: Reloading): 2 AP. A magazine weapon swaps in the fullest spare and drops the one in the gun on the floor;
 *  a weapon loaded round by round tops up from loose rounds. Enemies carry unlimited spares. */
export function reload(cb: Combat, u: Unit): string | null {
  const w = WEAPON[u.weapon];
  if (w.magazine == null) return 'Nothing to reload.';
  const rAp = hasMod(u.mods, 'mod_quick_release') ? 1 : 2;
  if (u.ap < rAp) return 'Needs ' + rAp + ' AP.';
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
  if (!w || w.reload !== 'magazine' || !u.mags) return 'Nothing to load.';
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
  const w = WEAPON[u.weapon], melee = isMelee(w), ap = attackApCost(w, melee ? 'melee' : 'shot');
  if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  const r = dist(u.pos, tile);
  if (melee) { if (r > 1) return 'Out of melee reach.'; }
  else {
    if (u.jammed) return 'Weapon jammed: clear it (2 AP).';
    if (w.magazine != null && u.ammo <= 0) return 'Empty: reload (2 AP).';
    if (!lineOfSight(cb, u.pos, tile)) return 'No line of sight.';
    if (Math.ceil(r / effectiveRange(w)) - 1 > 2) return 'Out of range.';
    if (w.magazine != null) u.ammo--; u.heat += 1;
  }
  u.ap -= ap;
  const fx: any = (w as any).grants?.effect || {};
  emitFx(cb, melee ? 'melee' : 'shot', { unit: u.id, target: null, from: u.pos, to: tile, weapon: w.id, cat: w.category, mode: 'shot', hit: true, crit: false, fumble: false, dmg: 0, killed: false, object: true });
  cb.log.push(u.name + (melee ? ' smashes' : ' shoots') + ' the ' + c.name.toLowerCase() + ' at ' + refOf(tile) + damageObject(cb, tile, weaponDamage(w, r, who?.skills.raw_power || 0) * (who ? physicalMult(who) : 1) * (fx.op === 'cover_damage_mult' ? fx.value : 1)) + '.');
  return null;
}
/** Analyze (spec: Analyze): 2 AP, 1 with Quick Read (Analysis 3); range 4 + Analysis; line of sight; no roll. */
export const analyzeCost = (u: Unit) => ((u.analysis || 0) >= 3 ? 1 : 2);
export function analyze(cb: Combat, u: Unit, t: Unit): string | null {
  if (t.side !== 'foe' || t.dead) return 'Pick a living enemy.';
  if (t.analyzedBy) return t.name + ' is already analyzed.';
  const cost = analyzeCost(u), range = 4 + (u.analysis || 0);
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  if (dist(u.pos, t.pos) > range) return 'Out of Analyze range (' + range + ' tiles).';
  if (!lineOfSight(cb, u.pos, t.pos)) return 'No line of sight.';
  u.ap -= cost; t.analyzedBy = u.name; emitFx(cb, 'analyze', { unit: u.id, target: t.id, from: u.pos, to: t.pos }); t.weakPoint = (u.analysis || 0) >= 5;
  cb.log.push(u.name + ' analyzes ' + t.name + ': HP ' + t.hp + '/' + t.maxHp + ', Defense ' + t.def + ', armour ' + t.armour + (t.weakPoint ? ' · Weak Point: +15% squad damage' : '') + '.');
  return null;
}
export function clearJam(cb: Combat, u: Unit): string | null {
  if (!u.jammed) return 'Not jammed.';
  if (u.ap < 2) return 'Needs 2 AP.';
  u.ap -= 2; u.jammed = false; u.heat = 0; emitFx(cb, 'clear', { unit: u.id, at: u.pos, dur: 1000 });
  cb.log.push(u.name + ' clears the jam.');
  return null;
}
/** Stim (spec: Downed and dying; Medic Triage): an adjacent ally. Downed: stabilise at 1 HP (1 AP Medic, 2 AP others). Else heal 30 × Healing given. */
export function useStim(cb: Combat, u: Unit, t: Unit, who: Character, isMedic: boolean): string | null {
  if (who.stims <= 0) return 'No stims left.';
  if (dist(u.pos, t.pos) > 1) return 'Must be adjacent.';
  if (t.dead) return 'Too late.';
  const cost = t.downed ? (isMedic ? 1 : 2) : 1;
  if (u.ap < cost) return 'Needs ' + cost + ' AP.';
  u.ap -= cost; who.stims--;
  const hpWas = t.hp, wasDown = t.downed;
  if (t.bleed) { t.bleed = 0; cb.log.push('The stim stops ' + t.name + '\'s bleeding.'); }
  if (t.downed) { t.downed = false; t.hp = 1; t.saves = { ok: 0, fail: 0 }; cb.log.push(u.name + ' stims ' + t.name + ': stabilised at 1 HP.'); }
  else { const heal = Math.floor(30 * healingMult(who)); t.hp = Math.min(t.maxHp, t.hp + heal); cb.log.push(u.name + ' stims ' + t.name + ': +' + heal + ' HP.'); }
  emitFx(cb, 'stim', { unit: u.id, target: t.id, from: u.pos, to: t.pos, heal: t.hp - (wasDown ? 0 : hpWas), revive: wasDown });
  return null;
}

/** Enemy turn: shoot the most hurt PC in sight and range; otherwise close in. Deterministic given the RNG. */
export function enemyTurn(cb: Combat, rng: Rng) {
  const u = active(cb)!;
  for (let step = 0; step < 6 && u.ap > 0 && !cb.over; step++) {
    if (u.prone && u.ap >= 1) { toggleProne(cb, u); continue; }
    if (u.jammed && u.ap >= 2) { clearJam(cb, u); continue; }
    if (enemyScuff(cb, u)) continue;
    const w = WEAPON[u.weapon];
    const dry = w.magazine != null && u.ammo <= 0 && !(u.mags || []).some((n) => n > 0);
    if (w.magazine != null && u.ammo <= 0 && !dry && u.ap >= 2) { reload(cb, u); continue; }
    const mode: 'melee' | 'shot' = isMelee(w) || dry ? 'melee' : 'shot';
    const targets = cb.units.filter((t) => t.side === 'pc' && !t.dead)
      .map((t) => ({ t, pv: previewAttack(cb, u, t, mode) }))
      .filter((x) => x.pv.ok)
      .sort((a, b) => (a.t.downed ? 1 : 0) - (b.t.downed ? 1 : 0) || a.t.hp - b.t.hp || b.pv.pct - a.pv.pct);
    if (targets.length) { resolveAttack(cb, rng, u, targets[0].t, mode, null); checkOver(cb); continue; }
    // close in: the reachable tile that is nearest a living PC and has line of sight to one
    const P = paths(cb, u.pos, u.id), pcs = cb.units.filter((t) => t.side === 'pc' && !t.dead);
    if (!pcs.length) break;
    let best: string | null = null, bestScore = Infinity;
    for (const [k, tiles] of Object.entries(P.dist)) {
      if (k === u.pos || apForTiles(tiles, u.bank, u.movement) > u.ap - (u.ap > 2 ? 2 : 0)) continue;
      const near = Math.min(...pcs.map((t) => dist(k, t.pos)));
      const sees = pcs.some((t) => lineOfSight(cb, k, t.pos) && dist(k, t.pos) <= (mode === 'melee' ? 1 : effectiveRange(w)));
      const score = (sees ? 0 : 100) + near + tiles * 0.1;
      if (score < bestScore) { bestScore = score; best = k; }
    }
    if (!best || moveUnit(cb, u, best, rng)) break;
  }
}

export const combatXp = (cb: Combat) => COMBAT_XP[cb.difficulty] || 50;
export const die6 = (rng: Rng) => die(rng, 6);
