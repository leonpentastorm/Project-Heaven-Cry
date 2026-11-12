// Characters: the stat tree, creation legality, derived stats, XP and levels, classes and perk steps.
// Every formula cites the spec section it comes from (docs/rules/PHC-Core-Rules-v1.0.md).
import './datatext'; // fills the texts' {=placeholders} before any data is read
import patronsJ from '../../../data/patrons.json';
import { ATTRS, CLASSES, CORES, type CoreId, PERKS, PERK, SKILL, SKILLS, TRAITS, XP_TOTAL, WEAPON, ITEM, ROUND_KG, ARMOUR_KG, CALIBRE_NAME, SIGIL, SCHOOL, MODULE, TONE, RETIRED_MODULE, SOUL_REV, SOUL_RULES, CLASS, CLASS_MIGRATION, CLASS_RULES, RULES } from './data';
import { advancedActive, ADVANCED, REV2_CLASSES, revision2Classes, rawItem } from './effects/collect';
import { statQuery, setRankRule } from './effects/hooks';
import type { StatId } from './effects/stats';
import feelJ from '../../../data/feelings.json';
import worldPlayJ from '../../../data/world_play.json';
import techniquesJ from '../../../data/techniques.json';
const wpGear = (worldPlayJ as any).gear;
import { skillRollMod } from './effects/core';
import { statOf } from './effects/output';
import { startingWordsError, STARTING_DEFAULT, migrateWords, SIGIL_REV } from './sigilwords';

export interface Sheet {
  name: string; portrait: string; origin: string; kit: string; traits: string[];
  /** Relics carried (engine foundations 3: items added at run time with addItems('relic', …); data only). */
  relics?: string[];
  /** The creation rules this sheet was locked in under (SHEET_REV; rules 1.11, item 931). A sheet without it was made
   * before 1.11; it is read by today's budgets all the same (no older budget is tried: item 1504). */
  rulesRev?: number;
  /** An uploaded portrait's eye line for the spotlight cut-in's torn strip (y from the top, 0.05–0.70; decision 113).
   * Presentation only; the art library's portraits carry their own (art/catalog.json eye_line). */
  portraitEye?: number;
  /** Death-save failures while Downed outside a fight (spec: Anyone is a target). */
  downedFails?: number;
  skills: Record<string, number>; attrs: Record<string, number>; cores: Record<CoreId, number>;
  identity: Record<string, string>; archetype?: string | null;
  /** Physical 2.0 (rules 1.12): the techniques picked at creation, by system (none: the defaults). Moved into the
   * character's technique state (phys) the first time that is written. */
  techniques?: { melee?: string[]; ranged?: string[] };
  /** Race, as free text (rules 1.3; The Old Blood reads it): human unless the player says otherwise. */
  race?: string;
  /** Starting magic chosen at creation (spec: The Magic panel): 2 Sigil words that make a Stack, and 1 Outburst design. */
  sigils?: string[];
  /** Sigil rules revision the words were checked under (14 = rules 1.4); free words owed from retired ones (RETURN). */
  sigilRev?: number; sigilFree?: number; outburst?: { name?: string; school: string; modules: string[]; option?: string; tone?: string } | null;
  /** Soul rules revision the designs were converted to (15 = rules 1.5, Outburst 2.0; 18 = rules 1.8, Outburst 4.0). */
  soulRev?: number;
  /** Rules 1.8 (Outburst 4.0): the feelings known (picked at creation: 2; then felt in play); practice from releases;
   * the module picks taken (practice or a Mastered skill's free pick). */
  feelings?: string[]; soulPractice?: number; soulPicks?: { module: string; via: string }[];
  /** Belief (rules 1.6, Blessing 2.0): Faithful to one patron, or Atheist. Chosen at creation; old saves derive it from
   * their pact (faith.ts beliefOf). */
  belief?: Belief;
}

/** Belief (rules 1.6): sworn to one patron (Devotion is the standing), or an Atheist who prays by dice. */
export type Belief = { kind: 'faithful'; patron: string } | { kind: 'atheist' };
/** A vow sworn at the start of a fight (rules 1.6): its id (patrons.json vows), the ally it names, and how it stands. */
export interface Vow { id: string; allyId?: string; state: 'sworn' | 'kept' | 'broken' }

export interface Character extends Sheet {
  id: string; owner: string;
  level: number; xp: number; xpBySource: Record<string, number>;
  /** Physical 2.0 (rules 1.12): techniques known and ready, drill per weapon, picks taken, quivers (physical/data.ts). */
  phys?: import('./physical/data').CharPhys;
  hp: number; echo: number; classId: string | null;
  perks: { id: string; tier: 'I' | 'II' | 'mastered' | 'achieved' | 'ultimate' }[];
  unspent: { skill: number; attr: number; core: number };
  deeds: string[]; /** Legendary Deeds done (item 1006): each lets one Attribute point stand 1 above the level's ceiling. */ legends?: number; weapon: string; armourClass: number; stims: number; essence: number;
  weaponKills: Record<string, number>; dead: boolean;
  /** Lasting arm and leg injuries (spec: Injuries); cleared when the story treats them. */
  injuries?: Injury[];
  /** What's in the backpack besides stims and the Essence (spec: Equipment slots). Old saves fall back to the kit's list. */
  pack?: PackItem[];
  /** Rounds in the weapon's magazine now; missing means full (old saves). */
  loaded?: number;
  /** The main-hand weapon's condition (spec: Weapons v2): rarity, durability left, mods fitted, a custom name. */
  weaponState?: GearState;
  /** What the off hand holds: a one-handed weapon, a shield, a light or a focus (spec: Hands). `loaded`: the rounds in
   * an off-hand gun (rules 1.9, item 688; missing means full, old saves). */
  offHand?: ({ id: string; loaded?: number; ammoType?: string | null } & GearState) | null;
  /** Slot armour worn, by slot (head, head_accessory, inner_torso, lower_torso, legs, hands, footwear). */
  worn?: Record<string, string>;
  /** Magic (spec: Mana, rules 1.2): Sigil words known; Outburst designs ready and the schools and modules learned;
   * MP in the Emanator; charge left in the core loaded in the Evoker; the scene a word was last learned in. */
  outbursts?: OutburstDesign[]; soulKnown?: { schools: string[]; modules: string[]; tones?: string[] };
  mp?: number; evoCharge?: number; learnedScene?: number;
  /** An advanced class (rules 1.2), held alongside the base class: all its moves at once (provisional; spec 14). Class
   * Roster Revision 3 shelves every advanced class: the field is kept, but gives nothing until they come back. */
  advancedClass?: string | null;
  /** Class roster revision the class was converted to (3 = Revision 3: medic → bard and so on). */
  classRev?: number;
  /** The focus rule's revision (item 630; migrateCharacterFocus). */
  focusRev?: number;
  /** The MP rule's revision (rules 1.24; migrateCharacterMp). */
  mpRev?: number;
  /** Item use counters that outlive a fight (per scene, session, rest, campaign), lazily stamped (effects/uses.ts). */
  uses?: Record<string, { s: string; n: number }>;
  // ---------- shared subsystems (rules 1.3; all optional, old saves load) ----------
  /** Tutors met (Narrator-granted, by advanced class id or tutor name): an advanced class needs one (spec: Classes). */
  tutors?: string[];
  /** A patron pact (spec: Patrons and prayer): the patron's id, Devotion 0-10, the Miracle's session stamp. Rules 1.6
   * keeps patron in step with belief (the Faithful's patron; null for an Atheist). */
  patron?: string | null; devotion?: number; miracleSession?: number;
  /** Rules 1.6 (faith.ts): knowledge pieces by patron (each unlocks that patron's next Hymn in order); the Hymns prayed
   * by dice, "<patronId>.<hymnId>" (an Atheist's, or kept from another patron under an Open rule); the vow of the
   * current fight (also on the unit); the session each rite was last kept in; the faith rules revision (16). */
  faithPieces?: Record<string, number>; hymns?: string[]; vow?: Vow | null; ritesKept?: Record<string, number>; faithRev?: number;
  /** Rules 1.6.1 (Faith 2.1): Devotion XP, the total (devotion is the level it reaches, kept in step; devotionXpOf);
   * the tag and Narrator caps this session, scene and fight (faith.ts FaithTally); the pact left, for the 90-day
   * cooldown (day = g.day when they left); a patron's grudge after a switch (faith.ts Grudge). */
  devotionXp?: number; faithTally?: any; faithLeft?: { patron: string; day: number } | null; grudge?: any;
  /** Karma −100 (Chaotic) to +100 (Lawful) (spec: Karma); 0 for old saves. */
  karma?: number;
  /** Companions who fight beside the character (a drone, a beast): their kind, name and HP between fights. */
  companions?: Companion[];
  /** Conditions that outlive a scene (scope 'session' or 'arc'), set by the Narrator or an item. */
  persistentConds?: { id: string; scope: 'scene' | 'session' | 'arc'; scene?: number; session?: number; by?: string; note?: string }[];
  /** Class resources that persist between fights (Supplies, toxins), refilled at a long rest. */
  res?: Record<string, number>;
  /** The ammo type in the loaded magazine (null: standard). Spare magazines' types ride on their pack entry. */
  loadedType?: string | null;
  /** Item and trait state the Narrator sets (traitState: a grudge, a cover identity, a rival…), by key. */
  state?: Record<string, any>;
  /** Gun Nut's collection (spec §14 item 369): weapon ids of the first guns the character got (the kit's gun counts),
   * at most the trait's count (3), in the order they came; an id twice for two of the same gun. Set at creation and
   * when a gun is gained; old saves without it fill it from what they carry (collectionOf). */
  collection?: string[];
  /** Rules 1.7: creatures this character carries (a token off the map: its whole token, and its weight by kind). */
  carried?: { npc: any; kg: number }[];
}
export interface Companion { id: string; kind: 'drone' | 'beast' | 'twin' | string; name: string; hp?: number; /** The twin's: half its owner's maximum when called. */ maxHp?: number; img?: string }
/** An Outburst design (rules 1.5, Outburst 2.0). modules holds at most one form module (wave, burst, aura, lance; none:
 * a Bolt). tone: 'raw' (or unset) or an element tone (soul_modules.json tones). school2 (Will Power 5) is a rider at
 * half strength with its own option2. */
export interface OutburstDesign { id: string; name: string; school: string; school2?: string; modules: string[]; option?: string; option2?: string; tone?: string }
export type Rarity = 'standard' | 'fine' | 'masterwork' | 'relic' | 'celestial';
export interface GearState { rarity?: Rarity; dur?: number; mods?: string[]; name?: string }
/** Rarity (spec: Weapons v2, Rarity; data/rules.json `rarity` since rules 1.26): accuracy, damage and durability bonuses; price multiplier. */
export const RARITY: Record<Rarity, { acc: number; dmg: number; dur: number; price: number; marks: number }> = Object.fromEntries((['standard', 'fine', 'masterwork', 'relic', 'celestial'] as Rarity[]).map((r) => {
  const d: any = (RULES as any).rarity?.[r]; if (!d) throw new Error('data/rules.json rarity.' + r + ' is missing');
  return [r, { acc: Number(d.acc), dmg: Number(d.dmg), dur: Number(d.dur), price: Number(d.price), marks: Number(d.marks) }];
})) as any;
export const maxDurOf = (weaponId: string, rarity: Rarity = 'standard') => Math.round(((WEAPON[weaponId] as any)?.durability || ITEM[weaponId] && (ITEM[weaponId] as any).durability || 0) * RARITY[rarity].dur);
export const weaponDurOf = (c: Character) => c.weaponState?.dur ?? maxDurOf(c.weapon, c.weaponState?.rarity);
/** Effects of everything worn and held in the off hand (slot armour, shields, lights). */
export function gearEffects(c: Character): { op: string; value?: number; hazard?: string }[] {
  const ids = [...Object.values(c.worn || {}), ...(c.offHand && !WEAPON[c.offHand.id] ? [c.offHand.id] : [])];
  return ids.flatMap((id) => ((ITEM[id] as any)?.effects || []) as { op: string; value?: number; hazard?: string }[]);
}
export const gearBonus = (c: Character, op: string) => gearEffects(c).filter((e) => e.op === op).reduce((t, e) => t + (e.value || 0), 0);
export const gearHas = (c: Character, op: string) => gearEffects(c).some((e) => e.op === op);
export type InjuryLoc = 'head' | 'torso' | 'arm' | 'leg';
export interface Injury { loc: InjuryLoc; side?: 'left' | 'right' }
export interface PackItem {
  id: string; name: string; qty: number; kind: 'weapon' | 'ammo' | 'tool' | 'focus' | 'food' | 'med' | 'loot' | 'plot'; weapon?: string; note?: string;
  /** A plot item's description (kind 'plot': the Narrator's own thing; no weight, no stats, never equipped). */
  text?: string;
  /** Special ammo (rules 1.3): the type of each spare magazine (null standard), and of loose rounds; a stowed weapon's loaded rounds. */
  magTypes?: (string | null)[]; ammoType?: string | null; loaded?: number;
  /** Spare magazines for `weapon`: rounds in each. Loose rounds use `calibre` and qty = rounds. `item` names the items.json entry for weight. */
  mags?: number[]; calibre?: string; item?: string;
  rarity?: Rarity; dur?: number; mods?: string[];
}


/** Skill modifier (spec: Core resolution): −2 at 0 points, otherwise points − 1. */
export const mod = (p: number) => (p <= 0 ? -2 : p - 1);

// ---------- Devotion XP (rules 1.6.1, Faith 2.1; spec items 701-702) ----------
/** The faith rules revision a character was written under (17: Devotion XP). */
export const FAITH_REV = 17;
/** Total Devotion XP to reach each level 0-10 (patrons.json devotion.xp.curve; PROVISIONAL). */
export const DEVOTION_CURVE: number[] = (patronsJ as any).devotion?.xp?.curve || [0, 10, 25, 45, 70, 102, 147, 200, 270, 350, 450];
export const DEVOTION_MAX_LEVEL = DEVOTION_CURVE.length - 1;
export const DEVOTION_MAX_XP = DEVOTION_CURVE[DEVOTION_MAX_LEVEL];
const lvClamp = (n: number) => Math.max(0, Math.min(DEVOTION_MAX_LEVEL, Math.round(Number(n) || 0)));
/** The XP a level starts at. */
export const devotionThreshold = (level: number) => DEVOTION_CURVE[lvClamp(level)];
/** The level a total of XP reaches. */
export function devotionLevelOf(xp: number): number { let lv = 0; for (let i = 0; i < DEVOTION_CURVE.length; i++) if (xp >= DEVOTION_CURVE[i]) lv = i; return lv; }
/** A character's Devotion XP. The level (c.devotion) is kept in step; a level written on its own (an old save, an old
 * writer) reads as that level's threshold (item 701). */
export function devotionXpOf(c: Character): number {
  const lv = lvClamp(c.devotion ?? (patronsJ as any).devotion?.start ?? 3), xp = c.devotionXp;
  if (typeof xp === 'number' && Number.isFinite(xp) && devotionLevelOf(xp) === lv) return Math.max(0, Math.min(DEVOTION_MAX_XP, Math.round(xp)));
  return devotionThreshold(lv);
}
/** Set the XP (0 to the curve's top) and the level with it. Returns the level. */
export function setDevotionXp(c: Character, xp: number): number {
  c.devotionXp = Math.max(0, Math.min(DEVOTION_MAX_XP, Math.round(Number(xp) || 0))); c.devotion = devotionLevelOf(c.devotionXp); return c.devotion;
}
/** Devotion XP in words, the one format every meter and log line uses (rules 1.6.1): the level, then the XP into it out
 * of the step to the next ("Devotion 3 · 4/25 XP"); at full standing the total ("Devotion 10 · 450 XP · full"). */
export function devotionWords(xp: number): string {
  const total = Math.max(0, Math.min(DEVOTION_MAX_XP, Math.round(Number(xp) || 0))), lv = devotionLevelOf(total), at = devotionThreshold(lv);
  return 'Devotion ' + lv + (lv < DEVOTION_MAX_LEVEL ? ' · ' + (total - at) + '/' + (devotionThreshold(lv + 1) - at) + ' XP' : ' · ' + total + ' XP · full');
}
export const fmt = (m: number) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0');

// ---------- creation (spec: Creation budget) ----------
/** Rules 1.11 (item 928): the Core-for-Attribute trade is gone (trade 0): every Core point is placed in a Core. */
/** Creation budgets (rules 1.13, Skeleton 2.0): 10 Skill and 10 Attribute points, no attribute above 7. Cores are group
 * names now: nobody spends Core points (`core` is 0 and kept so old callers read a number). */
export const BUDGET = { skill: 10, attr: 10, core: 0, trade: 0, cap: 10, attrCap: (RULES.character.creation?.attributes as any)?.cap_at_creation ?? 7 };
/** Mind Without Fog's extra points at creation: 2 Attribute points (rules 1.13; Leon, 10 Nov 2026: its price, no gear
 * bonuses, is steep now that weapons give so much. It was 1 Core point. That price bites on nothing today: no item carries a
 * bonus to Attributes or Skills, item 249). */
export const FOG_CORE = 2;
/** The creation rules' revision a new sheet is stamped with (rules 1.13). */
export const SHEET_REV = 113;
/** The budgets before rules 1.11. Nothing reads this: sheetDerive tries today's budgets only (item 1504). */
export const LEGACY_BUDGET = { trade: 2, fog: 2 };

/** Port of the prototype's derive(): what a set of skill points and hand-placed stats spend. */
export function deriveCreation(skills: Record<string, number>, aSet: Record<string, number> = {}, _cSet: Record<string, number> = {}, extraAttr = 0, _trade = 0) {
  // rules 1.13: one gate (Skill ≤ Attribute). A Core is read off its family: the highest attribute in it.
  const attr: Record<string, number> = {}, core: Record<CoreId, number> = { body: 1, mind: 1, soul: 1 };
  ATTRS.forEach((a) => { attr[a.id] = Math.max(1, aSet[a.id] || 1); });
  SKILLS.forEach((s) => { const p = skills[s.id] || 0; if (p > attr[s.attribute]) attr[s.attribute] = p; });
  ATTRS.forEach((a) => { if (attr[a.id] > core[a.core]) core[a.core] = attr[a.id]; });
  const spent = Object.values(skills).reduce((x, y) => x + y, 0);
  const attrSpent = ATTRS.reduce((t, a) => t + attr[a.id] - 1, 0), coreSpent = 0, traded = 0;
  const coreLeft = 0, attrLeft = BUDGET.attr + extraAttr - attrSpent;
  const ok = attrLeft >= 0 && Object.values(attr).every((v) => v <= BUDGET.attrCap) && spent <= BUDGET.skill;
  return { attr, core, spent, attrSpent, coreSpent, traded, coreLeft, attrLeft, ok };
}

/** A music trait: one whose effects set the character's song (op song_state). A character holds at most one. */
export const isMusicTrait = (id: string) => !!TRAITS.find((t) => t.id === id)?.effects?.some((e: any) => e?.op === 'song_state');
export const musicTraitCount = (traits: string[] | null | undefined) => (traits || []).filter(isMusicTrait).length;
/** Why a character can't gain this trait now (null: it can): any path that adds a trait after creation asks this. */
export function traitGainError(have: string[] | null | undefined, id: string): string | null {
  const held = have || [];
  if (held.includes(id)) return 'Already held.';
  if (isMusicTrait(id) && musicTraitCount(held) > 0) return 'Only one music trait.';
  const t = TRAITS.find((x) => x.id === id), ex = held.find((h) => (t?.excludes || []).includes(h) || (TRAITS.find((x) => x.id === h)?.excludes || []).includes(id));
  return ex ? (t as any)?.name + ' and ' + ((TRAITS.find((x) => x.id === ex) as any)?.name || ex) + ' can\'t be taken together.' : null;
}

/** A sheet is legal to lock in: every budget spent, tree caps hold, 0–2 traits, a name, an origin, a kit. */
/** A sheet's creation spend by the rules it was made under. A sheet stamped with rules 1.11 (rulesRev) is read by
 * today's budgets only, and so is one with no stamp (no older budget is tried: item 1504). */
export function sheetDerive(s: Pick<Sheet, 'skills' | 'attrs' | 'cores' | 'traits' | 'rulesRev'>) {
  const fog = (s.traits || []).includes('mind_without_fog');
  return deriveCreation(s.skills, s.attrs, s.cores, fog ? FOG_CORE : 0);
}
export function validateSheet(s: Sheet): string | null {
  if (!s.name?.trim()) return 'A character needs a name.';
  if (!s.origin) return 'Pick an origin.';
  if (!s.kit) return 'Pick a starting kit.';
  if ((s.traits || []).length > 2) return 'At most 2 traits.';
  // Belief (rules 1.6): Faithful to a patron of the patron list, or Atheist. Optional (old drafts have none: Atheist).
  if (s.belief && !(s.belief.kind === 'atheist' || (s.belief.kind === 'faithful' && ((patronsJ as any).items || []).some((p: any) => p.id === (s.belief as any).patron)))) return 'Pick a patron, or be an Atheist.';
  if (musicTraitCount(s.traits) > 1) return 'Only one music trait.';
  // Traits marked as excluding each other can't be taken together (spec: Traits).
  for (const t of s.traits || []) { const ex = (TRAITS.find((x) => x.id === t)?.excludes || []).find((x) => (s.traits || []).includes(x)); if (ex) return (TRAITS.find((x) => x.id === t) as any)?.name + ' and ' + ((TRAITS.find((x) => x.id === ex) as any)?.name || ex) + ' can\'t be taken together.'; }
  const whole = (o: Record<string, unknown> = {}) => Object.values(o).every((v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10);
  if (!whole(s.skills) || !whole(s.attrs) || !whole(s.cores)) return 'Points must be whole numbers from 0 to 10.';
  for (const [id, p] of Object.entries(s.skills)) { if (!SKILL[id]) return 'Unknown skill ' + id; if (p < 0 || p > 10) return 'Skills run 0–10.'; }
  const d = sheetDerive(s);
  if (Object.values(d.attr).some((v) => v > BUDGET.attrCap)) return 'No attribute above ' + BUDGET.attrCap + ' at creation.';
  if (!d.ok) return 'Those points break the tree or the budgets.';
  if (d.spent !== BUDGET.skill) return 'Spend all 10 Skill points.';
  if (d.attrLeft !== 0) return 'Place every Attribute point.';
  return startingMagicError(s, d);
}
/** Starting magic (spec: The Magic panel, rules 1.4): 2 Sigil words making a spell, one of them a Reach word (default
 * SPARK · SEEK); 1 Outburst design from one school and one module. Both optional: a caster without a choice gets the
 * defaults. */
export function startingMagicError(s: Pick<Sheet, 'sigils' | 'outburst' | 'skills'> & { feelings?: string[] }, d?: unknown): string | null {
  // Rules 1.8: 2 different starting feelings (optional: none picked means the defaults).
  if (s.feelings && s.feelings.length) {
    const fj: any = feelJ, ids = new Set((fj.items || []).map((x: any) => x.id)), n = fj.start_count ?? 2;
    if (s.feelings.length !== n || new Set(s.feelings).size !== s.feelings.length) return 'Pick ' + n + ' different feelings.';
    if (s.feelings.some((x) => !ids.has(x))) return 'Unknown feeling.';
  }
  if (s.sigils && s.sigils.length) {
    const e = startingWordsError(s.sigils); if (e) return e;
  }
  if (s.outburst) {
    if (!SCHOOL[s.outburst.school]) return 'Pick an Outburst school.';
    if ((s.outburst.modules || []).some((m) => !MODULE[m])) return 'Unknown Outburst module.';
    { const sh = (s.outburst.modules || []).map(moduleShelved).find(Boolean); if (sh) return sh; }
    if (s.outburst.tone && s.outburst.tone !== 'raw') { if (!TONE[s.outburst.tone]) return 'Unknown Outburst tone.'; if (!((s.skills || {}) as any).lore_master) return 'A tone needs Lore Master 1.'; }
    // One school and exactly one module; the Will Power module slots are for designs made in play.
    if ((s.outburst.modules || []).length !== 1) return 'Your starting Outburst takes one school and exactly one module (more module slots are for designs made in play).';
  }
  return null;
}
/** The magic a new character starts with: their picks, or a default cantrip for anyone with the skill or the kit.
 * Rules 1.8 (Outburst 4.0, item 813): a Soul caster starts with the 3 starting designs (a picked design takes Heart
 * Bolt's place), the Damage, Buff and Control schools, the shape Wave, 2 feelings, and a tone at Lore Master 1. */
function startingMagic(c: Character) {
  const bp = c.skills.brain_power || 0, wp = c.skills.will_power || 0;
  c.sigils = c.sigils && c.sigils.length ? [...c.sigils] : bp >= 1 || c.kit === 'sigil' ? [...STARTING_DEFAULT] : [];
  c.sigilRev = SIGIL_REV;
  const caster = !!c.outburst || wp >= 1 || c.kit === 'soul', o = c.outburst || null;
  const tone = o?.tone && o.tone !== 'raw' && TONE[o.tone] && (c.skills.lore_master || 0) >= 1 ? o.tone : undefined;
  if (!caster) { c.outbursts = []; c.soulKnown = { schools: [], modules: [], tones: [] }; c.feelings = []; c.soulRev = SOUL_REV; delete c.outburst; return; }
  const st = SOUL_START();
  const designs: OutburstDesign[] = st.designs.map((t: any, i: number) => ({ id: 'o' + (i + 1), name: t.name, school: t.school, modules: [...(t.modules || [])], ...(t.option ? { option: t.option } : {}) }));
  if (o) designs[0] = { id: 'o1', name: o.name || (SCHOOL[o.school]?.name || 'Outburst') + ' Outburst', school: o.school, modules: [...(o.modules || [])], ...(o.option ? { option: o.option } : {}), ...(tone ? { tone } : {}) };
  c.outbursts = designs;
  const schools = [...new Set([...st.schools, ...designs.map((d) => d.school)])].filter((x) => SCHOOL[x]);
  const modules = [...new Set([...st.modules, ...designs.flatMap((d) => d.modules)])].filter((m) => MODULE[m]);
  c.soulKnown = { schools, modules, tones: tone ? [tone] : [] };
  c.feelings = c.feelings && c.feelings.length ? [...c.feelings] : [...st.feelings];
  c.soulRev = SOUL_REV;
  delete c.outburst;
}
/** The starting designs, schools, modules and feelings (soul_modules.json start; feelings.json start_default). */
const SOUL_START = (): { designs: any[]; schools: string[]; modules: string[]; feelings: string[] } => {
  const st: any = (SOUL_RULES as any).start || {};
  return { designs: st.designs || [{ name: 'Heart Bolt', school: 'damage', modules: [] }], schools: st.schools || ['damage'], modules: st.modules || [], feelings: (feelJ as any).start_default || ['rage', 'love'] };
};
/** The starting templates (rules 1.8): one-click designs in the workshop. */
export const DESIGN_TEMPLATES = (): { id: string; name: string; school: string; modules: string[]; option?: string; text?: string }[] => ((SOUL_RULES as any).templates || []).map((t: any) => ({ ...t, modules: [...(t.modules || [])] }));

/** An old character's Sigil words under rules 1.4 (item 441, 438): RETURN and unknown words go (one free word each at
 * the next rest: c.sigilFree), and two starting words with no Reach word swap the non-Subject one for SEEK. Runs once
 * (c.sigilRev). Returns the notes for the log, or [] when nothing changed. */
export function migrateCharacterSigils(c: Character): string[] {
  if (c.sigilRev === SIGIL_REV) return [];
  c.sigilRev = SIGIL_REV;
  if (!c.sigils || !c.sigils.length) return [];
  const m = migrateWords(c.sigils); if (!m.notes.length) return [];
  c.sigils = m.words; if (m.free) c.sigilFree = (c.sigilFree || 0) + m.free;
  return m.notes.map((n) => c.name + ': ' + n);
}
/** An Outburst design under rules 1.5 (Outburst 2.0; spec: the modules table): retired modules become a form or a
 * survivor (rain → Burst; Size alone on a single target → Burst; Rain + Size → Burst + Size; Teleport → Ether) or go
 * (Duplicate, Bounce, Periodic, Proximity, Expire, Mastery); one form at most; an unknown tone becomes Raw. Pure. */
export function migrateDesign(d: OutburstDesign): OutburstDesign {
  const was = d.modules || [], out: string[] = [];
  const add = (m: string) => { if (MODULE[m] && !out.includes(m)) out.push(m); };
  const hadRain = was.includes('rain'), hasForm = was.some((m) => (MODULE[m] as any)?.form);
  for (const m of was) {
    if (MODULE[m]) { if (m === 'size' && !hadRain && !hasForm) { add('burst'); continue; } add(m); continue; }
    const r = RETIRED_MODULE[m]; if (r?.becomes) add(r.becomes);
  }
  // One form: the first one kept.
  const forms = out.filter((m) => (MODULE[m] as any)?.form); const keep = out.filter((m) => !(MODULE[m] as any)?.form || m === forms[0]);
  const tone = d.tone && d.tone !== 'raw' && TONE[d.tone] ? d.tone : undefined;
  const n: OutburstDesign = { ...d, modules: keep }; if (tone) n.tone = tone; else delete n.tone;
  return n;
}
/** Rules 1.5: one form module (Wave, Burst, Aura, Lance) at most; Size needs a shape. */
export function designShapeError(mods: string[]): string | null {
  const forms = mods.filter((m) => (MODULE[m] as any)?.form);
  if (forms.length > 1) return 'One shape a design (' + forms.map((m) => MODULE[m].name).join(' or ') + ').';
  if (mods.includes('size') && !forms.length) return 'Size needs a shape (Wave, Burst, Aura or Lance).';
  return null;
}
/** A school's option as the design stores it ('heal', 'hit', 'defense', 'push', 'pinned', 'fear'…), or undefined. */
export function optionOf(school: string, o?: string): string | undefined {
  const opts = (SCHOOL[school] as any)?.options as string[] | undefined;
  return o && opts && opts.some((x) => x.replace(/^to_/, '').startsWith(o)) ? o : undefined;
}
/** The side a school works on (rules 1.5, section 4.2): Buff, and Damage with Inverse (a shield), on allies; Damage,
 * Control and Status on foes. */
export const schoolSide = (school: string, mods: string[]): 'ally' | 'foe' => (school === 'buff' || (school === 'damage' && mods.includes('inverse')) ? 'ally' : 'foe');
/** A second school must work on the same side as the first (rules 1.5, section 4.2): a Buff design's heal and a hostile
 * rider (or the reverse) would land harm on allies or help on foes. */
export function pairingError(school: string, school2: string | undefined, mods: string[]): string | null {
  if (!school2 || school2 === school || schoolSide(school, mods) === schoolSide(school2, mods)) return null;
  return 'The second school must work on the same side as the first (' + (SCHOOL[school]?.name || school) + ' works on ' + (schoolSide(school, mods) === 'ally' ? 'allies' : 'foes') + ', ' + (SCHOOL[school2]?.name || school2) + ' on ' + (schoolSide(school2, mods) === 'ally' ? 'allies' : 'foes') + ').';
}
/** Rules 1.19: may this character take a design's own school a second time? Shelved for everyone (soul_modules.json
 * second_school.same_school.shelved); when an advanced class opens it, the class sets `soulKnown.sameSchool`. */
export function sameSchoolError(c: Character): string | null {
  const ss = (SOUL_RULES as any).second_school?.same_school;
  if (!ss || ss.shelved) return 'The same school twice in one design is not open yet.';
  return (c.soulKnown as any)?.sameSchool ? null : 'The same school twice in one design needs an advanced class.';
}
/** Every design rule of rules 1.5 (magic/design, Beloved Spells, the Twinbound twin): schools known, a second school at
 * Will Power 5 on the same side, modules known and within `slots`, one shape (Size needs one), a known tone (the first
 * is free at Lore Master 1 (rules 1.8): `learnTone` names it), options checked. Pure: returns the clean design or an error. */
export function checkOutburstDesign(c: Character, d: Partial<OutburstDesign> | null | undefined, slots: number, id: string): { design: OutburstDesign; learnTone?: string } | string {
  if (!d || !d.school || !SCHOOL[d.school]) return 'Pick a school.';
  const k = c.soulKnown || { schools: [], modules: [] };
  if (!k.schools.includes(d.school)) return 'You haven\'t learned the ' + SCHOOL[d.school].name + ' school.';
  const mods = [...new Set(d.modules || [])];
  if (d.school2) {
    if ((c.skills.will_power || 0) < 5) return 'Two schools need Will Power 5.';
    // Rules 1.19: a design's own school a second time is carried by the engine and defined in the spec, but shelved (it
    // comes back as an advanced-class feature): nobody can build one.
    if (d.school2 === d.school) { const why = sameSchoolError(c); if (why) return why; }
    if (!SCHOOL[d.school2] || !k.schools.includes(d.school2)) return 'Pick a second school you know.';
    const pe = pairingError(d.school, d.school2, mods); if (pe) return pe;
  }
  if (mods.some((x) => !MODULE[x] || !k.modules.includes(x))) return 'Use only modules you know.';
  { const sh = mods.map(moduleShelved).find(Boolean); if (sh) return sh; }
  if (mods.length > slots) return 'At most ' + slots + ' module' + (slots === 1 ? '' : 's') + ' (Will Power).';
  { const why = designShapeError(mods); if (why) return why; }
  const tone = d.tone && d.tone !== 'raw' ? d.tone : undefined; let learnTone: string | undefined;
  if (tone) {
    if (!TONE[tone]) return 'No such tone.';
    const kt = k.tones || [];
    if (!kt.includes(tone)) { if ((c.skills.lore_master || 0) >= 1 && !kt.length) learnTone = tone; else return 'You haven\'t learned the ' + TONE[tone].name + ' tone.'; }
  }
  const option = optionOf(d.school, d.option), option2 = d.school2 ? optionOf(d.school2, d.option2) : undefined;
  const design: OutburstDesign = { id, name: String(d.name || SCHOOL[d.school].name + ' Outburst').slice(0, 40), school: d.school, ...(d.school2 ? { school2: d.school2 } : {}), modules: mods, ...(option ? { option } : {}), ...(option2 ? { option2 } : {}), ...(tone ? { tone } : {}) };
  return learnTone ? { design, learnTone } : { design };
}
/** An old character's Outburst designs and learned modules under rules 1.5 (runs once: c.soulRev). Returns log notes. */
export function migrateCharacterSoul(c: Character): string[] {
  if (c.soulRev === SOUL_REV) return [];
  const was = c.soulRev || 0;
  c.soulRev = SOUL_REV;
  const notes: string[] = [];
  // Rules 1.8 (items 809, 813): a caster made before Outburst 4.0 gets the default feelings and, while it has room, the
  // starting designs it lacks (and their schools and the shape Wave).
  if (was < 18 && ((c.outbursts || []).length || (c.soulKnown?.schools || []).length)) {
    const st = SOUL_START();
    if (!(c.feelings || []).length) { c.feelings = [...st.feelings]; notes.push(c.name + ' can pour in ' + st.feelings.join(' and ') + ' (rules 1.8).'); }
    const k = (c.soulKnown ||= { schools: [], modules: [] }); k.tones ||= [];
    for (const x of st.schools) if (!k.schools.includes(x)) k.schools.push(x);
    for (const x of st.modules) if (MODULE[x] && !k.modules.includes(x)) k.modules.push(x);
    const list = (c.outbursts ||= []), room = readyDesigns(c);
    for (const t of st.designs) {
      if (list.length >= room) break;
      if (list.some((d) => d.school === t.school && (d.option || '') === (t.option || '') && (d.modules || []).join() === (t.modules || []).join())) continue;
      let n = list.length + 1; while (list.some((d) => d.id === 'o' + n)) n++;
      list.push({ id: 'o' + n, name: t.name, school: t.school, modules: [...(t.modules || [])], ...(t.option ? { option: t.option } : {}) });
      notes.push(c.name + ' remembers ' + t.name + ' (rules 1.8).');
    }
  }
  if (c.outbursts?.length) c.outbursts = c.outbursts.map((d) => { const n = migrateDesign(d); if (n.modules.join() !== (d.modules || []).join()) notes.push(c.name + ': the Outburst ' + d.name + ' now reads ' + (n.modules.map((m) => MODULE[m]?.name || m).join(', ') || 'a plain Bolt') + ' (rules 1.5).'); return n; });
  if (c.soulKnown) {
    const k = c.soulKnown, mods: string[] = [];
    for (const m of k.modules || []) { const to = MODULE[m] ? m : RETIRED_MODULE[m]?.becomes; if (to && MODULE[to] && !mods.includes(to)) mods.push(to); }
    // Size alone used to make a single target an area: a design converted to Burst teaches Burst.
    for (const d of c.outbursts || []) for (const m of d.modules) if (!mods.includes(m)) mods.push(m);
    k.modules = mods; k.tones ||= [];
  }
  return notes;
}
/** The highest armour Class a character's traits allow (armor_class_max), or null for none. */
export function armourCap(c: { traits?: string[] }): number | null {
  let cap: number | null = null;
  for (const t of c.traits || []) for (const e of ((TRAITS.find((x) => x.id === t) as any)?.effects || [])) if (e?.op === 'armor_class_max' && Number.isFinite(e.value)) cap = cap == null ? e.value : Math.min(cap, e.value);
  return cap;
}
/** Turn a locked-in sheet into a level-1 character (spec: Creation; kits from the creation screen). */
export function newCharacter(id: string, owner: string, s: Sheet): Character {
  const d = sheetDerive(s);
  const kit = KITS[s.kit] || KITS.medic;
  const c: Character = {
    ...s, attrs: d.attr, cores: d.core, id, owner, level: 1, xp: 0, xpBySource: {}, hp: 0, echo: 1, classId: null, classRev: CLASS_REV, perks: [],
    unspent: { skill: 0, attr: 0, core: 0 }, deeds: [], weapon: kit.weapon, armourClass: kit.armourClass, stims: kit.stims, essence: 1, weaponKills: {}, dead: false,
    injuries: [], pack: kit.pack.map((x) => ({ ...x })), offHand: kit.offHand ? { id: kit.offHand } : null, focusRev: FOCUS_REV, mpRev: 124,
  };
  // A trait that caps armour (Forlorn Hope: Class I at most) drops the kit's armour to the cap at lock-in (the kit's
  // heavier plate isn't carried; PROVISIONAL, spec 14).
  { const cap = armourCap(c); if (cap != null && c.armourClass > cap) { (c.state ||= {}).armourDropped = c.armourClass; c.armourClass = cap; } }
  c.hp = maxHp(c);
  if (c.portraitEye != null) { const y = Number(c.portraitEye); if (Number.isFinite(y)) c.portraitEye = Math.round(Math.min(0.7, Math.max(0.05, y)) * 100) / 100; else delete c.portraitEye; }
  // Belief (rules 1.6): a Faithful character is sworn at creation, Devotion 3; an Atheist has no patron.
  if (s.belief?.kind === 'faithful') { c.patron = s.belief.patron; setDevotionXp(c, devotionThreshold((patronsJ as any).devotion?.start ?? 3)); } else if (s.belief) c.patron = null;
  if (s.belief) c.faithRev = FAITH_REV;
  startingMagic(c);
  grantStartItems(c);
  startCollection(c);
  if (!c.race) c.race = 'human';
  return c;
}
/** Items traits start you with (op start_item; rules 1.3): into the pack, and worn at once when the item has an armour
 * slot (prescription glasses, the smiling mask). An item already carried isn't doubled. Gun Nut grants no guns: its
 * collection is the first guns the character gets (spec §14 item 369; startCollection). */
export function grantStartItems(c: Character) {
  const want: string[] = [];
  for (const t of c.traits || []) for (const e of (TRAITS.find((x) => x.id === t)?.effects || []) as any[]) if (e.op === 'start_item' && e.item) want.push(e.item);
  if (!want.length) return;
  const pack = packOf(c).map((x) => ({ ...x })), worn = { ...(c.worn || {}) };
  for (const id of want) {
    const it: any = ITEM[id]; if (!it) continue;
    if (Object.values(worn).includes(id) || pack.some((x) => (x.item || x.id) === id)) continue;
    if (it.category === 'armour' && it.slot && !worn[it.slot]) { worn[it.slot] = id; continue; }
    pack.push({ id, item: id, name: it.name, qty: 1, kind: 'tool' });
  }
  c.pack = pack; c.worn = worn;
}

// ---------- Gun Nut's collection (spec §14 item 369; Leon, 7 Nov 2026) ----------
/** A gun as Gun Nut counts one: a firearm with a magazine (no melee, thrown weapon or bow). */
export const isGunId = (id: string | null | undefined): boolean => { const w: any = id ? WEAPON[id] : null; return !!w && w.magazine != null && !/melee|unarmed/.test(w.category || '') && w.category !== 'thrown' && w.category !== 'bow'; };
/** How many guns a character's collection holds (the trait's min_carry count for guns), 0 without such a trait. */
export function collectionSize(c: Pick<Character, 'traits'>): number {
  let n = 0;
  for (const t of c.traits || []) for (const e of ((TRAITS.find((x) => x.id === t) as any)?.effects || [])) if (e?.op === 'min_carry' && e.item_tag === 'gun') n = Math.max(n, e.count || 0);
  return n;
}
/** Every gun the character carries, one entry per gun: the main hand, the off hand, then the pack in order. */
export function gunsCarried(c: Character): string[] {
  const out: string[] = [];
  if (isGunId(c.weapon)) out.push(c.weapon);
  if (c.offHand && isGunId(c.offHand.id)) out.push(c.offHand.id);
  for (const p of packOf(c)) { const id = p.weapon || p.id; if (p.kind === 'weapon' && isGunId(id)) for (let i = 0; i < Math.max(1, p.qty || 1); i++) out.push(id); }
  return out;
}
/** The collection, read only: the stored list, or for an old save (or a trait gained later) the first guns it carries. */
export function collectionOf(c: Character): string[] {
  const n = collectionSize(c); if (!n) return [];
  return c.collection ? c.collection.slice(0, n) : gunsCarried(c).slice(0, n);
}
/** Start the collection at creation: the kit's gun (and anything else carried) counts. */
export function startCollection(c: Character) { if (collectionSize(c)) c.collection = collectionOf(c); }
/** Guns just came into the character's hands or pack (loot, a gift, a purchase, the Proving Ground's give): each joins
 * the collection while it has room. Call after the guns are in the pack. */
export function collectGuns(c: Character, ids: string[]) {
  const n = collectionSize(c); if (!n) return;
  if (!c.collection) { c.collection = collectionOf(c); return; } // an old save: what it carries now, the new guns included
  const col = c.collection.slice(0, n);
  for (const id of ids) if (col.length < n && isGunId(id)) col.push(id);
  c.collection = col;
}
/** Why this pack entry can't leave the character (null: it can). Collector: a collection gun goes only on the
 * Narrator's Dexterity check (TN 12), unless the character carries more of that gun than the collection holds. */
export function partError(c: Character, idx: number, qty = 1): string | null {
  const it = packOf(c)[idx]; if (!it || it.kind !== 'weapon') return null;
  const id = it.weapon || it.id, col = collectionOf(c).filter((x) => x === id).length; if (!col) return null;
  const have = gunsCarried(c).filter((x) => x === id).length;
  if (have - Math.min(qty, it.qty || 1) >= col) return null;
  return 'Collector (Gun Nut): the ' + (it.name || WEAPON[id]?.name || id) + ' is in ' + c.name + '\'s collection. Parting with it takes a Dexterity check (TN 12), the Narrator\'s call; on a fail it stays until the next rest.';
}

/** The four starting kits from the creation screen: what's held, worn and packed (spec: Reloading, Item weights). */
export const magsOf = (weapon: string, n: number, unit = WEAPON[weapon]?.reload_unit || 'magazine'): PackItem => ({ id: 'mag:' + weapon, name: (WEAPON[weapon]?.name.replace(/ \(.*\)$/, '') || weapon) + ' ' + unit, qty: n, kind: 'ammo', weapon, mags: Array(n).fill(WEAPON[weapon]?.magazine || 0) });
export const roundsOf = (calibre: string, n: number): PackItem => ({ id: 'rounds:' + calibre, name: (CALIBRE_NAME[calibre] || calibre) + ' rounds', qty: n, kind: 'ammo', calibre });
const gear = (id: string, qty = 1, note?: string): PackItem => ({ id, item: id, name: ITEM[id]?.name || id, qty, kind: id === 'evoker' || id === 'emanator' ? 'focus' : id === 'standard_core' ? 'ammo' : id === 'ration_pack' ? 'food' : 'tool', ...(note ? { note } : {}) });
/** The starting kits. A focus starts in the off hand (spec: Hands 2; item 630: it counts only in a hand). */
export const KITS: Record<string, { weapon: string; weaponName?: string; armourClass: number; armourName: string; stims: number; offHand?: string; pack: PackItem[] }> = {
  medic: { weapon: 'service_pistol', weaponName: 'Service pistol (.32 Decrkm)', armourClass: 2, armourName: 'Medic plate', stims: 3,
    pack: [magsOf('service_pistol', 2), roundsOf('.32 decrkm', 24), gear('field_kit', 1, 'Bandages, splints, a suture set'), gear('spare_parts', 3)] },
  soldier: { weapon: 'hellraiser_service_rifle', armourClass: 3, armourName: 'Flak vest', stims: 0,
    pack: [magsOf('hellraiser_service_rifle', 3), roundsOf('rifle', 48), { id: 'combat_knife', name: 'Combat knife', qty: 1, kind: 'weapon', weapon: 'combat_knife' }, gear('ration_pack')] },
  sigil: { weapon: 'service_pistol', armourClass: 1, armourName: 'Padded coat', stims: 0, offHand: 'evoker',
    pack: [magsOf('service_pistol', 2), roundsOf('.32 decrkm', 24), gear('standard_core', 4), gear('chalk_and_wax')] },
  soul: { weapon: 'drifter_revolver', armourClass: 1, armourName: 'Padded coat', stims: 0, offHand: 'emanator',
    pack: [magsOf('drifter_revolver', 2), roundsOf('revolver', 12), gear('prayer_beads')] },
};
/** The pack, with saves from before magazines were tracked brought up to date. */
export const packOf = (c: Character): PackItem[] => (c.pack ?? (KITS[c.kit] || KITS.medic).pack).map((it) => {
  if (it.id === 'rifle_magazine' && !it.mags) return magsOf(c.weapon, it.qty);
  if (!it.item && ITEM[it.id]) return { ...it, item: it.id };
  return it;
});
/** Out of combat, loading is free (spec: Loading): fill every part-empty magazine from matching loose rounds. Returns rounds loaded. */
export function loadAll(c: Character): number {
  const pack = packOf(c).map((it) => ({ ...it, ...(it.mags ? { mags: [...it.mags] } : {}) }));
  let moved = 0;
  for (const m of pack) if (m.mags && m.weapon) {
    const cap = WEAPON[m.weapon]?.magazine || 0, cal = WEAPON[m.weapon]?.ammo;
    for (const r of pack) if (r.calibre && r.calibre === cal) for (let i = 0; i < m.mags.length && r.qty > 0; i++) { const take = Math.min(cap - m.mags[i], r.qty); m.mags[i] += take; r.qty -= take; moved += take; }
  }
  c.pack = pack.filter((it) => it.qty > 0 || it.mags);
  return moved;
}
export const loadedOf = (c: Character) => c.loaded ?? (WEAPON[c.weapon]?.magazine || 0);
export const spareMags = (c: Character) => packOf(c).find((x) => x.weapon === c.weapon && x.mags)?.mags || [];

// ---------- weight (spec: Item weights) ----------
const roundKg = (weapon: string) => ROUND_KG[WEAPON[weapon]?.ammo || ''] || 0;
export function itemKg(it: PackItem): number {
  if (it.mags) return it.mags.length * (WEAPON[it.weapon!]?.magazine_kg || 0) + it.mags.reduce((t, n) => t + n, 0) * roundKg(it.weapon!);
  if (it.calibre) return it.qty * (ROUND_KG[it.calibre] || 0);
  if (it.kind === 'weapon' && it.weapon) return it.qty * (WEAPON[it.weapon]?.weight_kg || 0);
  return it.qty * (ITEM[it.item || it.id]?.weight_kg || 0);
}
/** Everything carried: the weapon and its loaded magazine, armour, stims, the Essence and the pack. */
export function carriedKg(c: Character) {
  const w = WEAPON[c.weapon];
  const off = c.offHand ? (WEAPON[c.offHand.id]?.weight_kg ?? (ITEM[c.offHand.id]?.weight_kg || 0)) : 0;
  const parts = { weapon: (w?.weight_kg || 0) + (w?.magazine_kg || 0) + loadedOf(c) * roundKg(c.weapon) + off,
    armour: (ARMOUR_KG[c.armourClass] || 0) + Object.values(c.worn || {}).reduce((t, id) => t + (ITEM[id]?.weight_kg || 0), 0),
    pack: packOf(c).reduce((t, it) => t + itemKg(it), 0) + c.stims * (ITEM.stim_injector?.weight_kg || 0) + c.essence * (ITEM.essence_of_experience?.weight_kg || 0) + (c.carried || []).reduce((t, x) => t + (Number(x.kg) || 0), 0) };
  return { ...parts, total: Math.round((parts.weapon + parts.armour + parts.pack) * 100) / 100 };
}
export const carryLimit = (c: Character) => fx(c, 'carry', 20 + 5 * (A(c, 'strength') - 1) + gearBonus(c, 'carry_bonus'));

// ---------- injuries (spec: Injuries) ----------
/** Injury resistance: 10% per Endurance above 1 (rules.json injury_resist_pct). */
export const injuryResistPct = (c: Character) => fx(c, 'injury_resist', 10 * (A(c, 'endurance') - 1) + gearBonus(c, 'injury_resist_bonus'));
/** One-handed weapons; everything else needs both arms, so any arm injury hurts it (spec: Injuries). */
export const ONE_HANDED = ['pistol', 'revolver', 'light_melee', 'thrown', 'unarmed'];
export const mainHandSide = (c: Pick<Sheet, 'identity'>): 'left' | 'right' => (/^l/i.test(c.identity?.hand || '') ? 'left' : 'right');
export const injuryText: Record<InjuryLoc, string> = { head: 'Dazed: −2 AP next turn', torso: 'Bleeding: 5 damage a turn for 3 rounds; a stim stops it', arm: '−2 to attacks with that arm, until treated', leg: 'Half Movement, until treated' };

// ---------- derived stats (spec: Derived stats) ----------
const P = (c: Character, id: string) => c.skills[id] || 0;
const A = (c: Character, id: string) => c.attrs[id] || 1;
/** A derived stat after items (plan 2.4): + the items' adds, × their multipliers (effects/hooks.ts statQuery). */
const fx = (c: Character, stat: StatId, base: number, ctx: any = {}) => { if (!c.perks?.length && !c.traits?.length && !c.classId && !c.advancedClass) return base; const q = statQuery({ c }, stat, ctx); return (base + q.add) * q.mult; };
export const ARMOUR = [{ value: 0, move: 0, dodge: 0 }, { value: 5, move: 0, dodge: 0 }, { value: 10, move: 0, dodge: 0 }, { value: 15, move: -0.5, dodge: 0 }, { value: 20, move: -0.5, dodge: -1 }, { value: 25, move: -1, dodge: 0 }];
// Skeleton 2.0 (rules 1.13): defence numbers sit on the betas. HP a level reads Pain Threshold (it was Durability).
export const hpPerLevel = (c: Character) => fx(c, 'hp_per_level', 5 + 2 * P(c, 'pain_threshold'));
export const maxHp = (c: Character) => Math.max(1, Math.round(fx(c, 'hp', 100 + 15 * (A(c, 'endurance') - 1) + (c.level - 1) * hpPerLevel(c))));
export const initiativeBonus = (c: Character) => fx(c, 'init', (A(c, 'agility') - 1) + mod(P(c, 'reaction_speed')) + skillRollMod({ c }, 'reaction_speed', { roll: 'initiative' }).add);
/** Overburdened (spec: Carry weight): kg over the limit; −1 Movement per started 5 kg over. */
export const overweightKg = (c: Character) => Math.max(0, Math.round((carriedKg(c).total - carryLimit(c)) * 100) / 100);
export const overburdenPenalty = (c: Character) => Math.ceil(overweightKg(c) / 5);
export const movement = (c: Character) => Math.max(0.5, fx(c, 'move', (1 + 0.5 * (A(c, 'agility') - 1) + (ARMOUR[c.armourClass]?.move || 0)) * (c.injuries?.some((i) => i.loc === 'leg') ? 0.5 : 1) - overburdenPenalty(c) + gearBonus(c, 'movement_bonus')));
export const defense = (c: Character) => fx(c, 'defense', 10 + Math.max(0, mod(P(c, 'athletics')) + (ARMOUR[c.armourClass]?.dodge || 0)) + gearBonus(c, 'defense_bonus')
  + (c.offHand && (ITEM[c.offHand.id] as any)?.category === 'shield' && (WEAPON[c.weapon] as any)?.grants?.effect?.op === 'defense_with_shield' ? (WEAPON[c.weapon] as any).grants.effect.value : 0));
// The derived multipliers below are the Stat term of the one formula (effects/output.ts; data/rules.json output.profiles
// and output.pairs hold the slopes and what each reads): 1 + attr × (Attribute − 1) + skill × Skill.
export const physicalMult = (c: Character) => fx(c, 'mult_physical', statOf('physical', c));
/** Rules 1.12: a weapon's damage multiplier follows what it is aimed with: 1 + 0.1 × (each `scales_with` Attribute − 1)
 * + 0.05 × the skill it hits with (a Bare weapon: both Raw Power and Athletics; weapons.json `phys`). Perks and traits
 * that raise physical damage apply as before. A weapon with no `phys` block reads as Strength and Raw Power. */
export function weaponMult(c: Character, weaponId: string | null | undefined): number {
  const ph: any = (WEAPON[weaponId || ''] as any)?.phys; if (!ph) return physicalMult(c);
  const skills: string[] = ph.also_scales?.length ? ph.also_scales : [ph.hits_with];
  return fx(c, 'mult_physical', statOf('weapon', c, { attrs: ph.scales_with as string[], skills }));
}
/** What that multiplier is made of, in words ("Agility and Dexterity"): the label on the damage line. */
export function weaponMultLabel(weaponId: string | null | undefined): string {
  const ph: any = (WEAPON[weaponId || ''] as any)?.phys; if (!ph) return 'Strength and Raw Power';
  const nm = (id: string) => (ATTRS.find((a) => a.id === id)?.name || SKILL[id]?.name || id);
  return [...(ph.scales_with as string[]), ...((ph.also_scales?.length ? ph.also_scales : [ph.hits_with]) as string[])].map(nm).join(', ').replace(/, ([^,]*)$/, ' and $1');
}
/** Rules 1.15 (provisional, item 1022): a critical is ×1.5, and nothing takes it past ×2.0, everything together. */
export const CRIT_BASE = 1.5, CRIT_MAX = 2.0, CRIT_PER_PERCEPTION = 0.03, CRIT_PER_DEXTERITY = 0.02;
/** The Critical multiplier: 1.5 + 3% × (Perception − 1) + 2% × Dexterity, then perks, traits and gear, to 2.0 at most. */
export const critMult = (c: Character) => Math.max(CRIT_BASE, Math.min(CRIT_MAX, Math.round(fx(c, 'crit_damage', CRIT_BASE + CRIT_PER_PERCEPTION * (A(c, 'perception') - 1) + CRIT_PER_DEXTERITY * P(c, 'dexterity')) * 1000) / 1000)); // rules 1.12 (item 953): offence reads the alpha (it was Athletics)
export const healingMult = (c: Character) => fx(c, 'mult_heal_given', statOf('healing', c)); // rules 1.13: healing given is Empathy's (it was Camaraderie's)
/** Rules 1.24 (items 1340, 1341; PROVISIONAL): Max MP is 100 + 75 × (Determination − 1) + 25 × (Insight − 1): the
 * Outburst's own two attributes (Will Power's and Empathy's); 100 with neither raised, 1,000 with both at 10. Virtue
 * gives none. It was 100 + 100 × (Virtue − 1) (`maxMpOld`, kept for the one-time move of a save). */
export const MP_BASE = 100, MP_PER_DETERMINATION = 75, MP_PER_INSIGHT = 25;
export const maxMp = (c: Character) => fx(c, 'mp_max', MP_BASE + MP_PER_DETERMINATION * (A(c, 'determination') - 1) + MP_PER_INSIGHT * (A(c, 'insight') - 1));
export const maxMpOld = (c: Character) => fx(c, 'mp_max', 100 + 100 * (A(c, 'virtue') - 1));
/** The MP rule's revision (rules 1.24): a save from before it is moved once (migrateCharacterMp). */
export const MP_REV = 124;
/** Rules 1.24 (item 1348): Max MP left Virtue. An old save's Emanator keeps the same share of the new pool as it held
 * of the old one (full stays full, half stays half), once (c.mpRev). Returns a note for a character who carries one. */
export function migrateCharacterMp(c: Character): string[] {
  if (c.mpRev === MP_REV) return [];
  c.mpRev = MP_REV;
  if (c.mp == null) return [];
  const was = Math.max(1, maxMpOld(c)), now = maxMp(c); if (was === now) { c.mp = Math.max(0, Math.min(now, c.mp)); return []; }
  c.mp = Math.max(0, Math.min(now, Math.round(Math.min(was, c.mp) * now / was)));
  return carriesEmanator(c) ? [c.name + '\'s Emanator now holds up to ' + now + ' MP (it was ' + was + '): Max MP comes from Determination and Insight now, not Virtue (rules 1.24).'] : [];
}
// ---------- magic stats (spec: Derived stats, Magic; rules 1.2) ----------
export const sigilMult = (c: Character) => statOf('sigil', c); // 1 + 0.1 × (Intelligence − 1) + 0.1 × Brain Power
/** The Soul multiplier (rules 1.5): 1 + 0.05 × (Determination − 1) + 0.1 × Will Power (2.45 maxed). PROVISIONAL. */
export const soulMult = (c: Character) => statOf('soul', c);
// Balance pass (item 587, provisional): the same slope as the Physical multiplier (was 0.2 and 0.1; max ×2.4, was ×3.8).
export const elementalMult = (c: Character) => statOf('elemental', c); // 1 + 0.1 × (Expression − 1) + 0.05 × Visualization
export const maxSigilWords = (c: Character) => fx(c, 'max_sigil_words', 2 + Math.floor((A(c, 'intelligence') - 1) / 2));
export const glyphAp = (c: Character) => Math.max(0.5, Math.round(fx(c, 'glyph_ap', 1 - 0.1 * (A(c, 'expression') - 1)) * 10) / 10);
// rules 1.13: a Sigil's reach and its saving on cores are Brain Power's (they were Rumination's and Proficiency's)
export const sigilCoreSaving = (c: Character) => Math.floor(P(c, 'brain_power') / 3);
export const sigilRangeBonus = (c: Character) => Math.floor(0.5 * P(c, 'brain_power'));
export const sigilDurationBonus = (c: Character) => Math.floor(0.5 * P(c, 'brain_power'));
/** Words known at most: 4 + Brain Power, plus each Mastered free word taken (rules 1.10, item 913: a free word ignores the
 * cap, so it never fills an ordinary slot, now or after Brain Power rises). */
export const wordsKnownCap = (c: Character) => 4 + P(c, 'brain_power') + ((c as any).sigilGrowth?.freeTaken || 0);
/** Begin's AP (rules 1.5): 2 for everyone (Swift: 1). Empathy no longer lowers it (it gives free Pumps instead). Kept
 * under its 1.2 name for the class moves priced "Soul cast AP". */
export const soulCastAp = (c: Character) => { void c; return 2; };
/** Free Pumps per round (rules 1.5, Leon's caveat 1): 1 from Empathy 3 (rules 1.19: no second from Empathy 7; a held Outburst swells without Strain instead). PROVISIONAL. */
/** Empathy's free Pump each round (rules 1.19: one from Empathy 3; Empathy 7 no longer gives a second: see swellFree).
 * The table is soul_modules.json cycle.free_pumps; whatever items add, a character takes one free Pump a turn at most
 * (magic.ts FREE_PER_TURN). */
export const freePumps = (c: Character) => Math.max(0, Math.floor(fx(c, 'free_pumps', ((SOUL_RULES as any).cycle?.free_pumps as { empathy: number; pumps: number }[] || [{ empathy: 3, pumps: 1 }]).reduce((n, r) => (P(c, 'empathy') >= r.empathy ? Math.max(n, r.pumps) : n), 0))));
/** Rules 1.19: from Empathy 7 a held Outburst swells without Strain. */
export const swellFree = (c: Character) => P(c, 'empathy') >= ((SOUL_RULES as any).cycle?.swell_no_strain?.empathy ?? 99);
export const soulCostSaving = (c: Character) => 0.05 * (A(c, 'insight') - 1);
export const soulRangeBonus = (c: Character) => fx(c, 'soul_range', Math.floor(0.5 * P(c, 'will_power'))); // rules 1.13: Will Power's (it was Lore Master's)
export const syphonMult = (c: Character) => 1 + 0.1 * (A(c, 'determination') - 1) + 0.1 * P(c, 'will_power');
export const strainLimit = (c: Character) => fx(c, 'strain_limit', 3 + Math.floor(P(c, 'will_power') / 2));
export const moduleSlots = (c: Character) => fx(c, 'module_slots', 1 + Math.floor(P(c, 'will_power') / 3));
export const readyDesigns = (c: Character) => fx(c, 'ready_designs', Math.max(((SOUL_RULES as any).start?.min_ready_designs ?? 3), 2 + Math.floor(P(c, 'will_power') / 2))); // rules 1.13: ready designs are Will Power's (they were Empathy's)
// ---------- rules 1.8: practice, module gates and picks (spec: Soul magic 12, sections 4 and 5) ----------
const PR = (): any => (SOUL_RULES as any).practice || {};
const GATES = (): any => (SOUL_RULES as any).gates || {};
/** A module's gate (soul_modules.json items[].gate): the Soul skill and the points it needs, or null (no gate). */
export const moduleGate = (id: string): { skill: string; points: number } | null => (MODULE[id] as any)?.gate || null;
/** A module only an advanced class teaches (rules 1.8), and that class. */
export const moduleClass = (id: string): string | null => ((MODULE[id] as any)?.locked ? (MODULE[id] as any).class || null : null);
/** Why a module can't be learned or used at all yet: an advanced class's own module while that class is shelved (rules
 * 1.8 section 4: they unlock when the class's batch goes live), or null. Every way of learning (the Proving Ground too)
 * and every design checks it. */
export function moduleShelved(id: string): string | null {
  const m: any = MODULE[id]; if (!m || !m.locked || advancedActive(m.class)) return null;
  const cls = (ADVANCED as any)[m.class]?.name || String(m.class || '').split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return m.name + ' comes with the ' + cls + ' class (not learnable yet).';
}
/** Why this character can't learn a module through a gated way (practice, a Mastered pick, a plate, a tutor), or null. */
export function moduleGateError(c: Character, id: string): string | null {
  const m: any = MODULE[id]; if (!m) return 'No such module.';
  { const sh = moduleShelved(id); if (sh) return sh; }
  const g = moduleGate(id); if (!g) return null;
  if ((c.skills[g.skill] || 0) < g.points) return m.name + ' needs ' + (SKILL[g.skill]?.name || g.skill) + ' ' + g.points + '.';
  return null;
}
/** Practice from Mastery (item 812): +5 a Mastery level (3/5/7/9) in each gate skill. Derived, never stored. */
export function masteryPractice(c: Character): number {
  const pr = PR(), lv: number[] = pr.mastery_levels || [3, 5, 7, 9], per = pr.mastery_bonus ?? 5;
  return (pr.gate_skills || []).reduce((t: number, sk: string) => t + per * lv.filter((x) => (c.skills[sk] || 0) >= x).length, 0);
}
/** All practice: from releases (kept) plus from Mastery (derived). */
export const practiceOf = (c: Character) => Math.max(0, Math.floor(c.soulPractice || 0)) + masteryPractice(c);
/** Module picks earned by practice p: at 5, 15, then every +15 (30, 45…). */
export function picksAt(p: number): number {
  const pr = PR(), th: number[] = pr.thresholds || [5, 15], every = pr.then_every ?? 15;
  let n = th.filter((x) => p >= x).length; const last = th[th.length - 1];
  if (p >= last) n += Math.floor((p - last) / every);
  return n;
}
/** The practice the next pick needs. */
export function nextPickAt(p: number): number {
  const pr = PR(), th: number[] = pr.thresholds || [5, 15], every = pr.then_every ?? 15;
  for (const x of th) if (p < x) return x;
  const last = th[th.length - 1]; return last + (Math.floor((p - last) / every) + 1) * every;
}
/** Picks left: practice picks not yet taken, and each Mastered gate skill's free pick not yet taken. */
export function soulPicksLeft(c: Character): { practice: number; mastered: string[] } {
  const used = c.soulPicks || [], pr = PR();
  const practice = Math.max(0, picksAt(practiceOf(c)) - used.filter((x) => x.via === 'practice').length);
  const mastered = (pr.gate_skills || []).filter((sk: string) => (c.skills[sk] || 0) >= 10 && !used.some((x) => x.via === sk));
  return { practice, mastered };
}
/** The modules a gate skill gates (soul_modules.json gates.skills). */
export const gatedBy = (skill: string): string[] => (GATES().skills || {})[skill] || [];
/** Why a pick can't be taken (via 'practice' or a Mastered skill id), or null. */
export function soulPickError(c: Character, id: string, via: string): string | null {
  if (!MODULE[id]) return 'No such module.';
  if ((c.soulKnown?.modules || []).includes(id)) return 'You know ' + MODULE[id].name + ' already.';
  const left = soulPicksLeft(c);
  if (via === 'practice') { if (left.practice <= 0) return 'No practice pick yet (next at ' + nextPickAt(practiceOf(c)) + ' practice).'; }
  else { if (!left.mastered.includes(via)) return 'No free pick from ' + (SKILL[via]?.name || via) + '.'; if (!gatedBy(via).includes(id)) return MODULE[id].name + ' is not a ' + (SKILL[via]?.name || via) + ' module.'; }
  return moduleGateError(c, id);
}
/** Save bonuses and debuff strength (spec: Conditions and saves). */
/** The skill behind each save (rules 1.13): the betas. Body Guts, Brain Rumination (it was Charisma), Heart Composure. */
export const SAVE_SKILL_OF: Record<'body' | 'brain' | 'heart', string> = { body: 'guts', brain: 'rumination', heart: 'composure' };
export const saveBonus = (c: Character, fam: 'body' | 'brain' | 'heart') => { const sk = SAVE_SKILL_OF[fam]; return fx(c, `save_${fam}`, mod(P(c, sk)) + skillRollMod({ c }, sk, { roll: 'save', family: fam }).add); };
/** Debuff strength (rules 1.13, Skeleton 2.0): how hard a condition is to save against is the modifier of the skill
 * that delivered it (`via`), floor 0. Always points − 1: a gamma that sets a TN never counts its full points. */
export const strengthOf = (c: Character, via: string) => Math.max(0, mod(P(c, via)));
/** Every strength above 0, by skill id: what a unit carries into a fight (Unit.dbf; a missing skill reads 0). */
export const strengthTable = (c: Character): Record<string, number> => Object.fromEntries(SKILLS.map((s) => [s.id, strengthOf(c, s.id)] as [string, number]).filter(([, n]) => n > 0));
// ---------- focuses (spec: Hands 2; item 630: a focus counts only in a hand) ----------
/** What counts as each focus: the focus items, and the mana arms that count as one. */
export const FOCUS_IDS: Record<'evoker' | 'emanator', string[]> = { evoker: ['evoker', 'evoker_blade', 'spellslinger_pistol', 'grand_staff'], emanator: ['emanator', 'emanator_gauntlet'] };
/** What the hands hold: the main-hand weapon, and the off hand unless a two-handed weapon fills both. */
export const inHands = (c: Character): string[] => [c.weapon, ...(c.offHand && !twoHands(c, c.weapon) ? [c.offHand.id] : [])];
/** Which hand holds this kind of focus ('main' or 'off'), 'pack' if it is only carried, else null. */
export function focusHand(c: Character, kind: 'evoker' | 'emanator'): 'main' | 'off' | 'pack' | null {
  const ids = FOCUS_IDS[kind], held = inHands(c);
  if (ids.includes(held[0])) return 'main';
  if (held[1] && ids.includes(held[1])) return 'off';
  return carries(c, ids) ? 'pack' : null;
}
const carries = (c: Character, ids: string[]) => ids.includes(c.weapon) || (!!c.offHand && ids.includes(c.offHand.id)) || packOf(c).some((x) => ids.includes(x.item || x.id) && x.qty > 0);
/** An Evoker in a hand: Sigils can be drawn and Evoked (spec: Hands 2). */
export const hasEvoker = (c: Character) => { const h = focusHand(c, 'evoker'); return h === 'main' || h === 'off'; };
/** An Emanator in a hand: MP can be spent and filled (spec: Hands 2; without one an Outburst draws on the air). */
export const hasEmanator = (c: Character) => { const h = focusHand(c, 'emanator'); return h === 'main' || h === 'off'; };
/** An Evoker anywhere (a hand or the pack): it keeps its core's charge. */
export const carriesEvoker = (c: Character) => carries(c, FOCUS_IDS.evoker);
/** An Emanator anywhere (a hand or the pack): it keeps its MP. */
export const carriesEmanator = (c: Character) => carries(c, FOCUS_IDS.emanator);
/** Why a character can't cast now, by focus (null: it can). */
export const focusWhy = (c: Character, kind: 'evoker' | 'emanator'): string | null => ((kind === 'evoker' ? hasEvoker(c) : hasEmanator(c)) ? null : kind === 'evoker' ? NEEDS_EVOKER : NEEDS_EMANATOR);
export const NEEDS_EVOKER = 'Needs an Evoker in hand.', NEEDS_EMANATOR = 'Needs an Emanator in hand.';
export const coresCarried = (c: Character) => packOf(c).filter((x) => (x.item || x.id) === 'standard_core').reduce((t, x) => t + x.qty, 0);
/** MP now: the Emanator's charge (full when first carried); no Emanator, no MP. */
export const mpNow = (c: Character) => (carriesEmanator(c) ? Math.min(maxMp(c), c.mp ?? maxMp(c)) : 0);
/** Charge left in the core loaded in the Evoker (a fresh core holds 10). */
export const evoChargeNow = (c: Character) => (carriesEvoker(c) ? c.evoCharge ?? 10 : 0);
/** The modifier on a skill CHECK (rules 1.13): a gamma-slot skill adds its full points, every other skill points − 1;
 * 0 points is −2 either way. Only for checks, Ask and passives: attacks, saves, Initiative and debuff TNs keep mod(). */
export const checkModOf = (skill: string, p: number) => (p <= 0 ? -2 : SKILL[skill]?.slot === 'gamma' ? p : p - 1);
export const checkMod = (c: Character, skill: string) => checkModOf(skill, P(c, skill));
/** Passive Vigilance from a unit's points (traps, hidden piles, hazards, Sigil traps): 10 + the check modifier, the same
 * rule as a voice hook's passive (rules 1.13, ruling 5). The opposed roll to spot the Hidden in a fight is not this. */
export const passiveVigilance = (points: number) => 10 + checkModOf('vigilant', points || 0);
export const passive = (c: Character, skill: string, ctx: any = {}) => fx(c, `passive:${skill}`, 10 + checkMod(c, skill) + skillRollMod({ c }, skill, { roll: 'passive', ...ctx }).add, ctx);
// ---------- derived stats the damage chain and the shared subsystems read (spec: Derived stats; rules 1.3) ----------
/** Percentage reductions are capped at 60% (spec: Derived stats). Each returns the fraction NOT taken off (0..0.6). */
const cap60 = (x: number) => Math.max(0, Math.min(0.6, x));
/** Critical damage taken: −10% × (Perception − 1) − 5% × Acuity (the skill with the id 'analysis'). */
export const critTakenPct = (c: Character) => cap60(fx(c, 'crit_taken', 0.1 * (A(c, 'perception') - 1) + 0.05 * P(c, 'analysis'))); // rules 1.13: Acuity's (the skill with the id 'analysis'); it was Durability's
/** Elemental damage taken: −10% × Pain Threshold. Below 0 it is damage taken extra (Paper, Oil in My Mind: +10% at
 * Pain Threshold 0), so only the 60% cap applies, not the floor. */
export const elementalTakenPct = (c: Character) => Math.max(-1, Math.min(0.6, fx(c, 'elemental_taken', 0.1 * P(c, 'pain_threshold'))));
/** Ambush damage taken: −10% × Improvisation (rules 1.13; the skill with the id 'proficiency'; it was Reaction Speed). */
export const ambushTakenPct = (c: Character) => cap60(fx(c, 'ambush_taken', 0.1 * P(c, 'proficiency')));
/** Healing received: +10% × Camaraderie (rules 1.13; it was Sensory, and covered shields too). */
export const healReceivedMult = (c: Character) => fx(c, 'heal_received', 1 + 0.1 * P(c, 'camaraderie'));
/** Shields received, whatever made them: +10% × Conscience (rules 1.13). */
export const shieldReceivedMult = (c: Character) => fx(c, 'shield_received', 1 + 0.1 * P(c, 'conscience'));
/** Counter bonus: mod(Raw Power), minimum 0. */
export const counterBonus = (c: Character) => Math.max(0, fx(c, 'counter', mod(P(c, 'raw_power'))));
/** Throwing range: 6 + 0.5 × Dexterity tiles (the Derived stats formula; spec item 17). */
export const throwRange = (c: Character) => Math.floor(fx(c, 'throw_range', 6 + 0.5 * P(c, 'dexterity')));
/** Ambush multiplier: 1.5 + 0.05 × Ingenuity. */
export const ambushMult = (c: Character) => fx(c, 'ambush_mult', 1.5 + ((SKILL.ingenuity as any).per_point?.ambush_per_point ?? 0.05) * P(c, 'ingenuity')); // the card's number (skills.json Ingenuity per_point)
/** Blessing power: 1 + 0.1 × Faith. */
export const blessingPower = (c: Character) => fx(c, 'blessing_power', statOf('blessing', c));
/** The Hymn cooldown's numbers (rules 1.22; patrons.json prayer.hymn.cooldown_rule; PROVISIONAL). */
const HCR: any = (patronsJ as any).prayer?.hymn?.cooldown_rule || {};
export const HYMN_COOLDOWN = { base: HCR.base ?? 9, perFaith: HCR.per_faith ?? 0.75, perVirtue: HCR.per_virtue ?? 0.25, floor: HCR.floor ?? 3, minWait: HCR.min_wait ?? 2, vowCut: HCR.vow_cut ?? 1 };
/** The Hymn cooldown in rounds (rules 1.22): 9 − 0.75 × Faith − 0.25 × Virtue, rounded up, never under 3. Faith counts
 * three times what Virtue does. The floor of 3 is where a character without items stops; a vow fulfilled (or True
 * Believer) takes 1 round off a wait, never under 2 rounds (faith.ts hymnWait). */
export const prayerCooldown = (c: Character) => Math.max(HYMN_COOLDOWN.floor, Math.ceil(HYMN_COOLDOWN.base - HYMN_COOLDOWN.perFaith * P(c, 'faith') - HYMN_COOLDOWN.perVirtue * A(c, 'virtue') - 1e-9));
/** Detection range 2 + Vigilant; Stealth 0.5 × Ingenuity (subtracted from enemies' Detection range against you). */
export const detectionRange = (c: Character) => 2 + P(c, 'vigilant');
export const stealthOf = (c: Character) => Math.floor(0.5 * P(c, 'ingenuity'));
export const masteryOf = (p: number) => (p >= 10 ? 5 : p >= 9 ? 4 : p >= 7 ? 3 : p >= 5 ? 2 : p >= 3 ? 1 : 0);

// ---------- levels (spec: Levels and XP) ----------
export function levelForXp(xp: number): number {
  let lv = 1;
  for (let l = 2; l <= 20; l++) if (xp >= XP_TOTAL[String(l)]) lv = l;
  return lv;
}
export const xpForLevel = (l: number) => XP_TOTAL[String(Math.min(20, Math.max(1, l)))];

/** What reaching `level` gives (spec table "On reaching a level"; rules 1.11, item 924): odd levels 2 Skill points,
 * even levels 1 Skill point and 1 Attribute point, a Core point every 3rd level up to 18. Read from rules.json
 * `character.levels.gains`, so the numbers live in the data. */
export function levelGains(level: number): { skill: number; attr: number; core: number } {
  const G = RULES.character.levels.gains || {};
  if (level < 2) return { skill: 0, attr: 0, core: 0 };
  const sp = G.skill_points || {}, ap = G.attribute_points || {}, cp = G.core_points || {};
  const every = (o: any) => Math.max(1, Number(o.every) || 1);
  return {
    skill: Number(level % 2 ? sp.odd_levels : sp.even_levels) || 0,
    attr: level % every(ap) === 0 ? Number(ap.amount) || 0 : 0,
    core: level % every(cp) === 0 && level <= (Number(cp.last_level) || 20) ? Number(cp.amount) || 0 : 0,
  };
}
/** The whole table for a screen: the points levels 2 to `max` give in all. */
export function careerGains(max = 20) {
  const t = { skill: 0, attr: 0, core: 0 };
  for (let l = 2; l <= max; l++) { const g = levelGains(l); t.skill += g.skill; t.attr += g.attr; t.core += g.core; }
  return t;
}

/** Apply levels gained: points per level, HP per level (spec table "On reaching a level"). Returns levels gained. */
export function applyLevels(c: Character): number {
  const target = levelForXp(c.xp);
  let gained = 0;
  while (c.level < target) {
    c.level++; gained++;
    const gain = levelGains(c.level);
    c.unspent.skill += gain.skill; c.unspent.attr += gain.attr; c.unspent.core += gain.core;
    c.hp = Math.min(maxHp(c), c.hp + hpPerLevel(c));
  }
  return gained;
}

/** The highest an attribute may be at a level (rules 1.13; Leon, 10 Nov 2026): 7 at creation, 8 from level 3, 9 from 6,
 * 10 from 9. A skill can't pass its attribute, so the first Mastered perk comes at level 9 at the earliest. */
const CAP_BY_LEVEL: [number, number][] = Object.entries(((RULES.character.creation?.attributes as any)?.cap_by_level || { 1: 7, 3: 8, 6: 9, 9: 10 }) as Record<string, number>).map(([l, v]) => [Number(l), Number(v)] as [number, number]).sort((x, y) => x[0] - y[0]);
export const attrCapAt = (level: number): number => CAP_BY_LEVEL.reduce((cap, [l, v]) => (level >= l ? v : cap), CAP_BY_LEVEL[0][1]);
/** The level at which an attribute may first reach this value. */
export const attrCapLevel = (value: number): number => (CAP_BY_LEVEL.find(([, v]) => v >= value) || CAP_BY_LEVEL[CAP_BY_LEVEL.length - 1])[0];
/** A Legendary Deed (rules 1.13, item 1006): each one lets one Attribute point stand 1 above the level's ceiling (never above
 * 10). Room left = deeds held minus the points standing above the ceiling now (a ceiling that rises frees the room again). */
export function legendRoom(c: Character): number {
  const cap = attrCapAt(c.level);
  return (c.legends || 0) - ATTRS.reduce((n, a) => n + Math.max(0, A(c, a.id) - cap), 0);
}
export function canRaise(c: Character, kind: 'skill' | 'attr' | 'core', id: string): string | null {
  if (kind === 'skill') {
    if (c.unspent.skill < 1) return 'No Skill points to spend.';
    const sk = SKILL[id]; if (!sk) return 'Unknown skill.';
    const p = P(c, id); if (p >= 10) return 'Already at 10.';
    if (p + 1 > A(c, sk.attribute)) return 'Needs ' + sk.attribute + ' ' + (p + 1) + ': an Attribute point first.';
    return null;
  }
  if (kind === 'attr') {
    if (c.unspent.attr < 1) return 'No Attribute points to spend.';
    const a = ATTRS.find((x) => x.id === id); if (!a) return 'Unknown attribute.';
    if (A(c, id) >= 10) return 'Already at 10.';
    { const cap = attrCapAt(c.level); if (A(c, id) + 1 > cap && !(A(c, id) === cap && legendRoom(c) > 0)) return a.name + ' ' + (A(c, id) + 1) + ' opens at level ' + attrCapLevel(A(c, id) + 1) + ' (the ceiling is ' + cap + ' at level ' + c.level + ').'; }
    return null;
  }
  return 'Cores are not raised: a Core shows the highest attribute of its family.'; // rules 1.13
}

// ---------- classes (spec: Classes; Class Roster Revision 3) ----------
/** The class roster revision (3: one base class per attribute). */
export const CLASS_REV = 3;
const RANK_AT: { II: number; III: number } = { II: Number(CLASS_RULES?.rank_thresholds?.II) || 5, III: Number(CLASS_RULES?.rank_thresholds?.III) || 8 };
/** Rules 1.11 (item 930): a rank needs a level as well as the attribute (rank II level 6, rank III level 12). */
export const RANK_LEVEL: { II: number; III: number } = { II: Number(CLASS_RULES?.rank_levels?.II) || 1, III: Number(CLASS_RULES?.rank_levels?.III) || 1 };
export const RANK_ATTR = RANK_AT;
const attrOf = (c: { attrs?: Record<string, number> }, a: string) => c.attrs?.[a] || 1;
/** Every base class with its attribute's value now (the class score; trait bonuses never count). */
export function classTotals(c: Pick<Character, 'attrs'>) {
  return CLASSES.map((k) => ({ id: k.id, name: k.name, core: k.core, attribute: k.attribute, total: attrOf(c, k.attribute) }));
}
/** The level-3 rule: the class of your highest attribute; on a tie, any of the tied (the player chooses). */
export function eligibleClasses(c: Pick<Character, 'attrs'>) {
  const t = classTotals(c), top = Math.max(...t.map((x) => x.total));
  return t.filter((x) => x.total === top);
}
/** Rank reads the class's own attribute and the character's level: I on gaining it, II at attribute 5 and level 6,
 * III at attribute 8 and level 12 (rules 1.11, provisional), even if another attribute later grows higher. A caller
 * that passes no level (a bare sheet) is read by the attribute alone. */
export function classRank(c: Pick<Character, 'classId' | 'attrs'> & { skills?: Record<string, number>; level?: number }): number {
  if (!c.classId) return 0;
  if (revision2Classes() && REV2_CLASSES[c.classId]) { // the test-only Revision 2 shells: signature totals 13 / 18
    const t = REV2_CLASSES[c.classId].signature.reduce((n, s) => n + (c.skills?.[s] || 0), 0); return t >= 18 ? 3 : t >= 13 ? 2 : 1;
  }
  const k = CLASS[c.classId]; if (!k) return 1;
  const v = attrOf(c, k.attribute), lv = typeof c.level === 'number' ? c.level : 20;
  return v >= RANK_AT.III && lv >= RANK_LEVEL.III ? 3 : v >= RANK_AT.II && lv >= RANK_LEVEL.II ? 2 : 1;
}
/** Why this character can't take this class at level 3, or null. The class is set for good once picked (changing class
 * is a separate system for later). */
export function classPickError(c: Character, classId: string): string | null {
  if (c.level < 3) return 'Classes come at level 3.';
  if (c.classId) return 'Your class is set; changing class is a separate system for later.';
  if (!CLASS[classId]) return 'No such class.';
  if (!eligibleClasses(c).some((x) => x.id === classId)) {
    const top = eligibleClasses(c);
    return 'Your class comes from your highest attribute: ' + top.map((x) => CLASS[x.id].name + ' (' + x.attribute + ' ' + x.total + ')').join(' or ') + '.';
  }
  return null;
}
/** A Revision 2 save's class under Revision 3 (medic → bard, scribe → mage, warden → trickster, hexer → channeler,
 * assassin → infiltrator; the rest keep their id). Moves the new class doesn't list stop working; an advanced class is
 * kept in the save but gives nothing while advanced classes are shelved. Runs once (c.classRev). Returns notes. */
/** The focus rule's revision (item 630): a save from before it is moved once (migrateCharacterFocus). */
export const FOCUS_REV = 1;
/** A save from when a carried focus counted (item 77): a focus only in the pack goes to a free off hand (the Evoker
 * first, for a character with Sigil words; else the Emanator), so nobody loses their magic to the new rule. A two-handed
 * weapon or a full off hand leaves it in the pack, with a note. Runs once (c.focusRev). Returns notes. */
/** Perks that changed id (rules 1.13: Grapple became Iron Grip, Origami Hands became Both Hands). */
export const PERK_RENAMED: Record<string, string> = { grapple: 'iron_grip', origami_hands: 'both_hands' };
/** A save from before a perk or trait was renamed or removed: the renamed ones follow their new id (tier kept), and an
 * id the data no longer has is taken off the sheet, so no screen meets an item it can't look up. */
export function migrateCharacterItems(c: Character): string[] {
  const notes: string[] = [];
  // a perk or trait added at run time (effects/hooks.ts addItems: a mode's own items) is as known as the data's
  const known = (id: string) => !!PERK[id] || !!rawItem('perk:' + id), knownTrait = (t: string) => TRAITS.some((d) => d.id === t) || !!rawItem('trait:' + t);
  if ((c.perks || []).some((x) => !known(x.id))) {
    const out: Character['perks'] = [];
    for (const x of c.perks) {
      const to = known(x.id) ? x.id : PERK_RENAMED[x.id];
      if (!to || !known(to)) { notes.push(c.name + ': the perk "' + x.id + '" is no longer in the game and was taken off the sheet.'); continue; }
      if (to !== x.id) notes.push(c.name + ': ' + (PERK[to] || rawItem('perk:' + to)).name + ' replaces an older perk.');
      if (!out.some((y) => y.id === to)) out.push({ ...x, id: to });
    }
    c.perks = out;
  }
  if ((c.traits || []).some((t) => !knownTrait(t))) c.traits = c.traits.filter(knownTrait);
  return notes;
}
export function migrateCharacterFocus(c: Character): string[] {
  if (c.focusRev === FOCUS_REV) return [];
  c.focusRev = FOCUS_REV;
  const kinds = (['evoker', 'emanator'] as const).filter((k) => focusHand(c, k) === 'pack');
  if (!kinds.length || kinds.length < (['evoker', 'emanator'] as const).filter((k) => focusHand(c, k)).length) return []; // one is held already
  const want = kinds.includes('evoker') && ((c.sigils || []).length || !kinds.includes('emanator') || !(c.outbursts || []).length) ? 'evoker' : 'emanator';
  const name = want === 'evoker' ? 'Evoker' : 'Emanator';
  if (twoHands(c, c.weapon) || c.offHand) return [c.name + ': a focus counts only in a hand now; the ' + name + ' stays in the pack (' + (c.offHand ? 'the off hand is full' : 'a two-handed weapon') + '): swap it into a hand to cast.'];
  const at = packOf(c).findIndex((x) => x.qty > 0 && FOCUS_IDS[want].includes(x.weapon || x.item || x.id));
  const err = at < 0 ? 'not found' : equip(c, at, 'off');
  return err ? [] : [c.name + ': a focus counts only in a hand now; the ' + name + ' goes to the off hand.'];
}
export function migrateCharacterClass(c: Character): string[] {
  if (c.classRev === CLASS_REV) return [];
  c.classRev = CLASS_REV;
  const notes: string[] = [];
  const to = c.classId ? CLASS_MIGRATION[c.classId] : undefined;
  if (c.classId && to) { notes.push(c.name + ': the ' + c.classId.replace(/^./, (x) => x.toUpperCase()) + ' is now the ' + CLASS[to].name + ' (Class Roster Revision 3).'); c.classId = to; }
  else if (c.classId && !CLASS[c.classId]) { notes.push(c.name + ': the class ' + c.classId + ' no longer exists; pick one again at the level-up screen.'); c.classId = null; }
  if (c.advancedClass) notes.push(c.name + ': advanced classes are being rebuilt; the ' + c.advancedClass.replace(/_/g, ' ') + ' rests until they return.');
  return notes;
}
setRankRule((c) => classRank(c));

// ---------- perk steps (spec: Perks) ----------
/** Perk steps earned in a skill: one per Mastery level 1–4 (3/5/7/9 points). */
export const stepsEarned = (p: number) => [3, 5, 7, 9].filter((t) => p >= t).length;
export function stepsTaken(c: Character, skill: string) {
  return c.perks.filter((x) => PERK[x.id]?.tier === 'acquired' && PERK[x.id].skills.includes(skill)).reduce((n, x) => n + (x.tier === 'II' ? 2 : 1), 0);
}
/** Skills with a perk step waiting, and the choices for each (a new Tier I, or an upgrade of a held Tier I). */
export function pendingPerkSteps(c: Character) {
  const out: { skill: string; choices: { id: string; tier: 'I' | 'II' }[]; /** Steps owed in this skill (2+ after a jump). */ free: number }[] = [];
  for (const s of SKILLS) {
    const free = stepsEarned(P(c, s.id)) - stepsTaken(c, s.id);
    if (free <= 0) continue;
    const own = PERKS.filter((p) => p.tier === 'acquired' && p.skills.includes(s.id));
    const choices = own.flatMap((p): { id: string; tier: 'I' | 'II' }[] => {
      const held = c.perks.find((x) => x.id === p.id);
      return !held ? [{ id: p.id, tier: 'I' as const }] : held.tier === 'I' ? [{ id: p.id, tier: 'II' as const }] : [];
    });
    const room = own.reduce((n, p) => { const held = c.perks.find((x) => x.id === p.id); return n + (!held ? 2 : held.tier === 'I' ? 1 : 0); }, 0);
    if (choices.length) out.push({ skill: s.id, choices, free: Math.min(free, room) });
  }
  return out;
}
/** Mastered perks: automatic at 10 points. Combo (achieved) perks need Mastery 2 in each skill plus a recorded deed. */
export function grantAutomaticPerks(c: Character): string[] {
  const granted: string[] = [];
  for (const p of PERKS) {
    if (c.perks.some((x) => x.id === p.id)) continue;
    if (p.tier === 'mastered' && P(c, p.skills[0]) >= 10) { c.perks.push({ id: p.id, tier: 'mastered' }); granted.push(p.id); }
    if (p.tier === 'ultimate') {
      const need = p.requires.filter((r: any) => r.perk).map((r: any) => r.perk);
      if (need.length && need.every((id: string) => c.perks.some((x) => x.id === id))) { c.perks.push({ id: p.id, tier: 'ultimate' }); granted.push(p.id); }
    }
  }
  return granted;
}
export function comboEligible(c: Character, perkId: string): string | null {
  const p = PERK[perkId];
  if (!p || p.tier !== 'achieved') return 'Not a combo perk.';
  if (c.perks.some((x) => x.id === perkId)) return 'Already held.';
  const short = p.requires.filter((r: any) => r.skill && P(c, r.skill) < r.min).map((r: any) => SKILL[r.skill].name + ' ' + r.min);
  return short.length ? 'Needs ' + short.join(' and ') + '.' : null;
}

// ---------- equipping (spec: Hands; Slot armour) ----------
/** Move a pack item into the main hand, the off hand, or its armour slot; what was there goes back to the pack. Returns an error or null. */
// ---------- plot items (spec: Plot items): story things the engine has no entry for ----------
/** A plot item's id: "plot:" and its name as a slug, so the same thing given twice stacks. */
export const plotId = (name: string) => 'plot:' + (String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'thing');
/** A plot item for the pack: the Narrator's name and one-line description; weighs nothing, does nothing in the engine. */
export function plotItem(name: string, text = '', qty = 1): PackItem {
  const n = String(name || '').trim().slice(0, 60) || 'Something';
  return { id: plotId(n), name: n, qty: Math.max(1, Math.round(qty)), kind: 'plot', ...(String(text || '').trim() ? { text: String(text).trim().slice(0, 200) } : {}) };
}
export const isPlotItem = (it: PackItem | null | undefined) => !!it && it.kind === 'plot';

/** Does this weapon take both hands for this character? A heavy weapon is one-handed for an item with stat
 * 'one_hand_heavy' (Heavyworlder). */
export function twoHands(c: Character, wid: string | null | undefined): boolean {
  const w: any = wid ? WEAPON[wid] : null; if (!w || w.hands !== '2H') return false;
  if (/^heavy/.test(w.category || '') && statQuery({ c }, 'one_hand_heavy').add > 0) return false;
  return true;
}
const equipBanWhy = (c: Character, ctx: any): string => {
  const w: any = ctx.weapon ? WEAPON[ctx.weapon] : null, t: string[] = w?.tags || [];
  if ((c.traits || []).includes('old_school')) return ctx.mod === 'mod_red_dot' || (ctx.mods || []).includes('mod_red_dot') ? 'Old School: no red dot on your guns.' : t.includes('evoker_linked') ? 'Old School: you won\'t carry an Evoker-linked gun.' : 'Old School: you won\'t carry an electronic gun.';
  return 'A trait won\'t let you.';
};
/** A pack entry that is ammunition (a magazine stack, loose rounds), never a thing for a hand (review fix). */
export const isAmmoEntry = (it: PackItem) => !!(it.mags || it.calibre || it.kind === 'ammo' && !ITEM[it.item || it.id]);
export const AMMO_WHY = 'That is ammunition, not a weapon.';
/** A weapon in each hand (Leon, 10 Nov 2026): the second weapon asks 2 more of its skill than it does in the main hand
 * (a weapon with no requirement asks 2 of the skill it hits with). Shields, torches and focuses are not weapons. Returns
 * the refusal, or null. */
export function secondWeaponWhy(c: Character, offId: string | null | undefined, mainId: string | null | undefined): string | null {
  const ow: any = offId ? WEAPON[offId] : null, mw: any = mainId ? WEAPON[mainId] : null;
  if (!ow || ow.id === 'fists' || !mw || mw.id === 'fists') return null;
  const extra = (wpGear as any)?.second_weapon_skill_extra ?? 2, req = ow.requires && Object.keys(ow.requires).length ? ow.requires : { [ow.skill || 'dexterity']: 0 };
  for (const [sk, n] of Object.entries(req)) { const need = (n as number) + extra; if ((c.skills[sk] || 0) < need) return 'A second weapon asks more: the ' + ow.name.toLowerCase() + ' in the off hand needs ' + (SKILL[sk]?.name || sk.replace('_', ' ')) + ' ' + need + '.'; }
  return null;
}
export function equip(c: Character, idx: number, to: 'main' | 'off' | 'worn'): string | null {
  const pack = packOf(c).map((x) => ({ ...x })), it = pack[idx]; if (!it) return 'Nothing there.';
  if (isPlotItem(it)) return 'A plot item can\'t be equipped.';
  if (isAmmoEntry(it)) return AMMO_WHY;
  const wid = it.weapon && WEAPON[it.weapon] ? it.weapon : null, item = ITEM[it.item || it.id] as any;
  const take = () => { if (it.qty > 1) it.qty--; else pack.splice(idx, 1); };
  const putBack = (id: string, st: (GearState & { loaded?: number; id?: string; ammoType?: string | null }) | undefined, loaded?: number, ammoType?: string | null) => { const e = gearEntry(id, st, loaded ?? st?.loaded, ammoType); if (e) pack.push(e); };
  // Items may refuse what is equipped or fitted (stat 'equip_ban' {weapon, mod}: Old School won't carry an electronic or
  // Evoker-linked gun or a red dot; Forlorn Hope's armour cap is armourCap) — perk-runtime still-open item 6.
  const ban = (ctx: any) => statQuery({ c }, 'equip_ban', ctx).add > 0 ? equipBanWhy(c, ctx) : null;
  if (to === 'main') {
    if (!wid) return 'Only weapons go in the main hand.';
    { const rq = requiresWhy(c, (WEAPON[wid] as any).requires); if (rq) return rq; }
    { const b = ban({ weapon: wid, mods: it.mods || [] }); if (b) return b; }
    if (c.offHand && !twoHands(c, wid)) { const sw = secondWeaponWhy(c, c.offHand.id, wid); if (sw) return sw; }
    take(); putBack(c.weapon, c.weaponState, c.loaded ?? undefined, c.loadedType); // a stowed gun keeps the rounds in it (rules 1.3), and their type
    if (twoHands(c, wid) && c.offHand) { putBack(c.offHand.id, c.offHand); c.offHand = null; }
    c.weapon = wid; c.weaponState = { rarity: it.rarity, dur: it.dur, mods: it.mods, name: it.name !== WEAPON[wid].name ? it.name : undefined }; c.loaded = it.loaded ?? 0;
    c.loadedType = it.loaded && it.ammoType ? it.ammoType : null; // the drawn gun holds the rounds its entry kept, of their type (review fix)
  } else if (to === 'off') {
    if (twoHands(c, c.weapon)) return 'Your main-hand weapon needs both hands.';
    if (wid) { const b = ban({ weapon: wid, mods: it.mods || [] }); if (b) return b; }
    if (wid ? (WEAPON[wid] as any).hands !== '1H' : item?.slot !== 'off_hand') return 'That doesn\'t go in the off hand.';
    // Rules 1.13 (proposal 13.3): what the weapon or item asks is asked in the off hand too; a second weapon asks 2 more.
    { const rq = requiresWhy(c, wid ? (WEAPON[wid] as any).requires : item?.requires); if (rq) return rq; }
    if (wid) { const sw = secondWeaponWhy(c, wid, c.weapon); if (sw) return sw; }
    take(); if (c.offHand) putBack(c.offHand.id, c.offHand);
    // An off-hand gun holds what its pack entry held, as the main hand does (rules 1.9, item 688).
    c.offHand = { id: wid || it.item || it.id, rarity: it.rarity, dur: it.dur, mods: it.mods, ...(wid && WEAPON[wid].magazine != null ? { loaded: it.loaded ?? 0, ...(it.loaded && it.ammoType ? { ammoType: it.ammoType } : {}) } : {}) };
  } else {
    const slot = item?.slot; if (!slot || slot === 'off_hand' || item.category !== 'armour') return 'That isn\'t slot armour.';
    { const rq = requiresWhy(c, item.requires); if (rq) return rq; } // a worn piece that asks a skill
    // Heavy armour (rules 1.13): a piece that carries an armour class (outer torso, Class 4 and 5) asks Pain Threshold.
    if (typeof item.armour_class === 'number') { const ag = armourGateWhy(c, item.armour_class); if (ag) return ag; }
    take(); const worn = { ...(c.worn || {}) }; if (worn[slot]) putBack(worn[slot], undefined); worn[slot] = it.item || it.id; c.worn = worn;
  }
  c.pack = pack; return null;
}
/** The pack entry for a weapon or item taken out of a hand: a weapon keeps its rarity, wear, mods, name and the rounds
 * in it (a stowed gun keeps its rounds, rules 1.3); anything else is a tool (a focus a focus). Fists are nothing. */
export function gearEntry(id: string, st?: (GearState & { loaded?: number; id?: string; ammoType?: string | null }) | null, loaded?: number, ammoType?: string | null): PackItem | null {
  if (!id || id === 'fists') return null;
  const { loaded: _l, id: _i, ammoType: _t, ...g } = (st || {}) as any; void _l; void _i;
  const keep = Object.fromEntries(Object.entries(g).filter(([, v]) => v != null)), type = ammoType === undefined ? _t : ammoType;
  // The rounds in a stowed gun keep their type (review fix: incendiary rounds stayed incendiary only in the hand).
  if (WEAPON[id]) return { id, name: g.name || WEAPON[id].name, qty: 1, kind: 'weapon', weapon: id, ...keep, ...(loaded ? { loaded } : {}), ...(loaded && type ? { ammoType: type } : {}) } as PackItem;
  if (ITEM[id]) return { id, item: id, name: ITEM[id].name, qty: 1, kind: (ITEM[id] as any).category === 'focus' ? 'focus' : 'tool', ...keep } as PackItem;
  return { id, item: id, name: id, qty: 1, kind: 'tool' };
}
/** What a hand holds, as the pack entry it would become (rules 1.9: put away or dropped), or null for an empty hand. */
export function handEntry(c: Character, hand: 'main' | 'off'): PackItem | null {
  if (hand === 'main') return gearEntry(c.weapon, c.weaponState, c.loaded ?? undefined, c.loadedType ?? null);
  return c.offHand && !twoHands(c, c.weapon) ? gearEntry(c.offHand.id, c.offHand, c.offHand.loaded) : null;
}
/** Empty a hand without putting anything in the pack (the item is dropped or handed on). The main hand becomes fists. */
export function emptyHand(c: Character, hand: 'main' | 'off') {
  if (hand === 'main') { c.weapon = 'fists'; c.weaponState = {}; c.loaded = 0; c.loadedType = null; } else c.offHand = null;
}
/** Take something off into the pack: the off hand, a worn piece, or the main hand (it then holds fists). */
export function unequip(c: Character, slot: string): string | null {
  const pack = packOf(c).map((x) => ({ ...x }));
  if (slot === 'main') { const e = handEntry(c, 'main'); if (!e) return 'Your hands are already empty.'; pack.push(e); emptyHand(c, 'main'); }
  else if (slot === 'off') { if (!c.offHand) return 'Nothing there.'; const e = gearEntry(c.offHand.id, c.offHand, c.offHand.loaded); if (e) pack.push(e); c.offHand = null; }
  else { const id = c.worn?.[slot]; if (!id) return 'Nothing there.'; pack.push({ id, item: id, name: ITEM[id]?.name || id, qty: 1, kind: 'tool' }); const w = { ...c.worn }; delete w[slot]; c.worn = w; }
  c.pack = pack; return null;
}
/** Fit a mod from the pack onto the main-hand weapon, if it has that slot free. */
export function fitMod(c: Character, idx: number): string | null {
  const pack = packOf(c).map((x) => ({ ...x })), it = pack[idx], m = it && (ITEM[it.item || it.id] as any);
  if (!m || m.category !== 'mod') return 'That isn\'t a mod.';
  const slots: string[] = (WEAPON[c.weapon] as any)?.mod_slots || [], mods = [...(c.weaponState?.mods || [])];
  if (!slots.includes(m.mod_slot)) return 'Your weapon has no ' + m.mod_slot + ' slot.';
  if (statQuery({ c }, 'equip_ban', { mod: m.id }).add > 0) return equipBanWhy(c, { mod: m.id });
  const old = mods.find((x) => (ITEM[x] as any)?.mod_slot === m.mod_slot);
  if (old) { mods.splice(mods.indexOf(old), 1); pack.push({ id: old, item: old, name: ITEM[old].name, qty: 1, kind: 'tool' }); }
  mods.push(m.id); if (it.qty > 1) it.qty--; else pack.splice(idx, 1);
  c.weaponState = { ...(c.weaponState || {}), mods }; c.pack = pack; return null;
}
export const hasMod = (mods: string[] | undefined, id: string) => !!mods && mods.includes(id);
export const magazineSize = (weaponId: string, mods?: string[]) => { const m = WEAPON[weaponId]?.magazine; return m == null ? null : hasMod(mods, 'mod_extended_mag') ? Math.floor(m * 1.5) : m; };

// ---------- class resources and advanced classes (spec: Classes; rules 1.3 shared subsystems) ----------
/** A class resource: id, maximum now, and whether it persists between fights (Supplies, toxins; refilled at a long
 * rest) or starts each fight at 0 (Momentum, Guard, Marks, Charges). Heat, Flux and Strain are shared rules that
 * every gun, Evoker or Emanator user already runs; they aren't listed here. */
export interface ClassResource { id: string; max: number; persist: boolean }
const RES_RULES: Record<string, (c: Character) => ClassResource> = {
  momentum: () => ({ id: 'momentum', max: 5, persist: false }),
  guard: () => ({ id: 'guard', max: GUARD_RULES.max ?? 5, persist: false }),
  marks: () => ({ id: 'marks', max: 3, persist: false }),
  supplies: (c) => ({ id: 'supplies', max: 3 + Math.floor(P(c, 'proficiency') / 2), persist: true }),
  toxins: (c) => ({ id: 'toxins', max: 2 + Math.floor(P(c, 'ingenuity') / 3), persist: true }),
  charges: () => ({ id: 'charges', max: 3, persist: false }),
};
/** Which resources a class brings. Base classes: their classes.json `resources` (Revision 3: the resources follow the
 * moves; Heat, MP, Strain and Devotion are shared rules, so only the ones in RES_RULES count here). Advanced classes
 * (shelved: they count only while active) carry over a parent's (Adamantile Knight: Guard; Shade: Marks; Storm Hand:
 * Charges), provisional (spec 14). */
const ADV_RES: Record<string, string[]> = {
  adamantile_knight: ['guard'], shade: ['marks'], storm_hand: ['charges'], gunslinger: ['momentum'], banner_dancer: ['momentum', 'supplies'], rtc_contractor: ['supplies'], ccec_ballistician: ['marks'] };
export const classResIds = (classId: string | null | undefined): string[] =>
  (classId && revision2Classes() && REV2_CLASSES[classId] ? REV2_CLASSES[classId].resources : classId && CLASS[classId] ? (CLASS[classId].resources || []).filter((r) => RES_RULES[r]) : []);
export function classResources(c: Character): ClassResource[] {
  const ids = [...new Set([...classResIds(c.classId), ...(advancedActive(c.advancedClass) ? ADV_RES[c.advancedClass!] || [] : [])])];
  const out = ids.map((id) => RES_RULES[id](c));
  // Rules 1.13, Durability's Guard: anyone with Durability has a Guard pool. A class that brings Guard keeps its own
  // (the larger of the two is the pool).
  const pool = guardPool(c);
  if (pool > 0) { const own = out.find((r) => r.id === 'guard'); if (own) own.max = Math.max(own.max, pool); else out.push({ id: 'guard', max: pool, persist: false }); }
  return out;
}
/** Durability's Guard (rules 1.13; numbers in techniques.json rules.guard, provisional): the pool is the Durability
 * points, 5 at most; 0 without Durability. */
const GUARD_RULES: any = (techniquesJ as any).rules?.guard || {};
export const guardPool = (c: Pick<Character, 'skills'>): number => Math.min(GUARD_RULES.max ?? 5, Math.floor((c.skills?.durability || 0) * (GUARD_RULES.per_durability ?? 1)));
/** Heavy armour's gate (rules 1.13, proposal 13.3; techniques.json rules.gear_gates.heavy_armour, provisional): outer
 * torso armour of Class 4 asks Pain Threshold 3, Class 5 asks 5. Returns the refusal, or null. */
export function armourGateWhy(c: Pick<Character, 'skills'>, armourClass: number): string | null {
  const g: any = (techniquesJ as any).rules?.gear_gates?.heavy_armour; if (!g) return null;
  const need = Number(g.classes?.[String(armourClass)] || 0), sk = g.skill || 'pain_threshold';
  return need && (c.skills?.[sk] || 0) < need ? 'Class ' + armourClass + ' armour needs ' + (SKILL[sk]?.name || sk.replace('_', ' ')) + ' ' + need + '.' : null;
}
/** What a weapon or an item asks of its wearer (`requires`: skill → points): the refusal, or null. */
export function requiresWhy(c: Pick<Character, 'skills'>, need: Record<string, number> | null | undefined, what?: string): string | null {
  void what; // the words are the main hand's own (kept: screens and tests read them)
  for (const [sk, n] of Object.entries(need || {})) if ((c.skills?.[sk] || 0) < (n as number)) return 'Needs ' + sk.replace(/_/g, ' ') + ' ' + n + '.';
  return null;
}
/** Refill the persisting resources (a long rest). */
export function restockResources(c: Character) { for (const r of classResources(c)) if (r.persist) (c.res ||= {})[r.id] = r.max; }

/** The advanced-class gate by attribute pair (Class Roster Revision 3, section 7; provisional): a hybrid needs its base
 * attribute at 6 and its partner (another core's) at 5, a squared class its attribute at 9, both from level 7. Keyed by
 * `pair` and `kind` in the data, so a batch comes back by data alone. Returns why not, or null. */
export function advancedPairError(c: Pick<Character, 'attrs' | 'level'>, adv: { kind?: string; pair?: string[] }): string | null {
  const g = CLASS_RULES?.advanced || {}, hy = g.hybrid_gate || { base_attribute_min: 6, partner_attribute_min: 5, level_min: 7 }, sq = g.squared_gate || { base_attribute_min: 9, level_min: 7 };
  const [a, b] = adv.pair || [];
  if (!a || !b) return 'That advanced class has no attribute pair.';
  const name = (x: string) => ATTRS.find((t) => t.id === x)?.name || x;
  if (adv.kind === 'squared') {
    if (c.level < sq.level_min) return 'Advanced classes come at level ' + sq.level_min + '.';
    return attrOf(c, a) >= sq.base_attribute_min ? null : 'Needs ' + name(a) + ' ' + sq.base_attribute_min + ' (you have ' + attrOf(c, a) + ').';
  }
  if (c.level < hy.level_min) return 'Advanced classes come at level ' + hy.level_min + '.';
  const miss = [...(attrOf(c, a) < hy.base_attribute_min ? [name(a) + ' ' + hy.base_attribute_min + ' (you have ' + attrOf(c, a) + ')'] : []), ...(attrOf(c, b) < hy.partner_attribute_min ? [name(b) + ' ' + hy.partner_attribute_min + ' (you have ' + attrOf(c, b) + ')'] : [])];
  return miss.length ? 'Needs ' + miss.join(' and ') + '.' : null;
}
/** A medic: holds the Medic's moves (Revision 3: the Bard has Triage, Stim Throw and Field Surgery; an old Medic save
 * before migration; an active advanced class with Medic as a parent). The 1 AP stim (hooks gap I14) reads it. */
export const isMedicChar = (c: Pick<Character, 'classId' | 'advancedClass'> | null | undefined) => !!c && (c.classId === 'bard' || c.classId === 'medic' || (advancedActive(c.advancedClass) && !!ADVANCED[c.advancedClass!]?.parents?.includes('medic')));
/** The shelved refusal (Class Roster Revision 3). */
export const ADVANCED_SHELVED = String(CLASS_RULES?.advanced?.shelved_text || 'Advanced classes are being rebuilt; not learnable yet.');
/** Can this character learn this advanced class (spec: Classes)? While advanced classes are shelved: never (the shelved
 * refusal). Once a class is active again: its attribute pair (advancedPairError) and a patron where it needs one.
 * Returns why not, or null. */
export function advancedClassError(c: Character, advId: string, adv: any): string | null {
  if (!adv) return 'No such advanced class.';
  if (!advancedActive(advId)) return ADVANCED_SHELVED;
  if (c.advancedClass === advId) return 'Already learned.';
  if (c.advancedClass) return 'One advanced class at a time (provisional).';
  const why = advancedPairError(c, adv); if (why) return why;
  if ((adv.requires || []).some((r: any) => r.patron) && !c.patron) return 'Needs a patron.';
  return null;
}
