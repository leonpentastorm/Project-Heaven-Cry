// Characters: the stat tree, creation legality, derived stats, XP and levels, classes and perk steps.
// Every formula cites the spec section it comes from (docs/rules/PHC-Core-Rules-v1.0.md).
import { ATTRS, CLASSES, CORES, type CoreId, PERKS, PERK, SKILL, SKILLS, TRAITS, XP_TOTAL, WEAPON, ITEM, ROUND_KG, ARMOUR_KG, CALIBRE_NAME, SIGIL, SCHOOL, MODULE, TONE, RETIRED_MODULE, SOUL_REV, CLASS, CLASS_MIGRATION, CLASS_RULES } from './data';
import { advancedActive, ADVANCED, REV2_CLASSES, revision2Classes } from './effects/collect';
import { statQuery, setRankRule } from './effects/hooks';
import { skillRollMod } from './effects/core';
import { startingWordsError, STARTING_DEFAULT, migrateWords, SIGIL_REV } from './sigilwords';

export interface Sheet {
  name: string; portrait: string; origin: string; kit: string; traits: string[];
  /** Death-save failures while Downed outside a fight (spec: Anyone is a target). */
  downedFails?: number;
  skills: Record<string, number>; attrs: Record<string, number>; cores: Record<CoreId, number>;
  identity: Record<string, string>; archetype?: string | null;
  /** Race, as free text (rules 1.3; The Old Blood reads it): human unless the player says otherwise. */
  race?: string;
  /** Starting magic chosen at creation (spec: The Magic panel): 2 Sigil words that make a Stack, and 1 Outburst design. */
  sigils?: string[];
  /** Sigil rules revision the words were checked under (14 = rules 1.4); free words owed from retired ones (RETURN). */
  sigilRev?: number; sigilFree?: number; outburst?: { name?: string; school: string; modules: string[]; option?: string; tone?: string } | null;
  /** Soul rules revision the designs were converted to (15 = rules 1.5, Outburst 2.0). */
  soulRev?: number;
}

export interface Character extends Sheet {
  id: string; owner: string;
  level: number; xp: number; xpBySource: Record<string, number>;
  hp: number; echo: number; classId: string | null;
  perks: { id: string; tier: 'I' | 'II' | 'mastered' | 'achieved' | 'ultimate' }[];
  unspent: { skill: number; attr: number; core: number };
  deeds: string[]; weapon: string; armourClass: number; stims: number; essence: number;
  weaponKills: Record<string, number>; dead: boolean;
  /** Lasting arm and leg injuries (spec: Injuries); cleared when the story treats them. */
  injuries?: Injury[];
  /** What's in the backpack besides stims and the Essence (spec: Equipment slots). Old saves fall back to the kit's list. */
  pack?: PackItem[];
  /** Rounds in the weapon's magazine now; missing means full (old saves). */
  loaded?: number;
  /** The main-hand weapon's condition (spec: Weapons v2): rarity, durability left, mods fitted, a custom name. */
  weaponState?: GearState;
  /** What the off hand holds: a one-handed weapon, a shield, a light or a focus (spec: Hands). */
  offHand?: ({ id: string } & GearState) | null;
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
  /** Item use counters that outlive a fight (per scene, session, rest, campaign), lazily stamped (effects/uses.ts). */
  uses?: Record<string, { s: string; n: number }>;
  // ---------- shared subsystems (rules 1.3; all optional, old saves load) ----------
  /** Tutors met (Narrator-granted, by advanced class id or tutor name): an advanced class needs one (spec: Classes). */
  tutors?: string[];
  /** A patron pact (spec: Patrons and prayer): the patron's id, Devotion 0-10, the Miracle's session stamp. */
  patron?: string | null; devotion?: number; miracleSession?: number;
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
}
export interface Companion { id: string; kind: 'drone' | 'beast' | 'twin' | string; name: string; hp?: number; /** The twin's: half its owner's maximum when called. */ maxHp?: number; img?: string }
/** An Outburst design (rules 1.5, Outburst 2.0). modules holds at most one form module (wave, burst, aura, lance; none:
 * a Bolt). tone: 'raw' (or unset) or an element tone (soul_modules.json tones). school2 (Will Power 5) is a rider at
 * half strength with its own option2. */
export interface OutburstDesign { id: string; name: string; school: string; school2?: string; modules: string[]; option?: string; option2?: string; tone?: string }
export type Rarity = 'standard' | 'fine' | 'masterwork' | 'relic' | 'celestial';
export interface GearState { rarity?: Rarity; dur?: number; mods?: string[]; name?: string }
/** Rarity (spec: Weapons v2, Rarity): accuracy, damage and durability bonuses; price multiplier. */
export const RARITY: Record<Rarity, { acc: number; dmg: number; dur: number; price: number; marks: number }> = {
  standard: { acc: 0, dmg: 1, dur: 1, price: 1, marks: 0 }, fine: { acc: 1, dmg: 1, dur: 1.25, price: 3, marks: 1 },
  masterwork: { acc: 2, dmg: 1.1, dur: 1.5, price: 8, marks: 2 }, relic: { acc: 2, dmg: 1.1, dur: 1.5, price: 25, marks: 3 }, celestial: { acc: 2, dmg: 1.1, dur: 1.5, price: 50, marks: 4 },
};
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
export const fmt = (m: number) => (m > 0 ? '+' + m : m < 0 ? '−' + Math.abs(m) : '0');

// ---------- creation (spec: Creation budget) ----------
export const BUDGET = { skill: 10, attr: 10, core: 6, trade: 2, cap: 10 };

/** Port of the prototype's derive(): what a set of skill points and hand-placed stats spend. */
export function deriveCreation(skills: Record<string, number>, aSet: Record<string, number> = {}, cSet: Record<string, number> = {}, corePts = BUDGET.core) {
  const attr: Record<string, number> = {}, core: Record<CoreId, number> = { body: 1, mind: 1, soul: 1 };
  ATTRS.forEach((a) => { attr[a.id] = Math.max(1, aSet[a.id] || 1); });
  SKILLS.forEach((s) => { const p = skills[s.id] || 0; if (p > attr[s.attribute]) attr[s.attribute] = p; });
  CORES.forEach((c) => { core[c] = Math.max(1, cSet[c] || 1); });
  ATTRS.forEach((a) => { if (attr[a.id] > core[a.core]) core[a.core] = attr[a.id]; });
  const spent = Object.values(skills).reduce((x, y) => x + y, 0);
  const attrSpent = ATTRS.reduce((t, a) => t + attr[a.id] - 1, 0), coreSpent = CORES.reduce((t, c) => t + core[c] - 1, 0);
  const attrOver = Math.max(0, attrSpent - BUDGET.attr), traded = Math.ceil(attrOver / BUDGET.trade);
  const coreLeft = corePts - coreSpent - traded, attrLeft = BUDGET.attr + traded * BUDGET.trade - attrSpent;
  const ok = coreLeft >= 0 && Object.values(attr).every((v) => v <= BUDGET.cap) && Object.values(core).every((v) => v <= BUDGET.cap) && spent <= BUDGET.skill;
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
export function validateSheet(s: Sheet): string | null {
  if (!s.name?.trim()) return 'A character needs a name.';
  if (!s.origin) return 'Pick an origin.';
  if (!s.kit) return 'Pick a starting kit.';
  if ((s.traits || []).length > 2) return 'At most 2 traits.';
  if (musicTraitCount(s.traits) > 1) return 'Only one music trait.';
  // Traits marked as excluding each other can't be taken together (spec: Traits).
  for (const t of s.traits || []) { const ex = (TRAITS.find((x) => x.id === t)?.excludes || []).find((x) => (s.traits || []).includes(x)); if (ex) return (TRAITS.find((x) => x.id === t) as any)?.name + ' and ' + ((TRAITS.find((x) => x.id === ex) as any)?.name || ex) + ' can\'t be taken together.'; }
  const whole = (o: Record<string, unknown> = {}) => Object.values(o).every((v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10);
  if (!whole(s.skills) || !whole(s.attrs) || !whole(s.cores)) return 'Points must be whole numbers from 0 to 10.';
  for (const [id, p] of Object.entries(s.skills)) { if (!SKILL[id]) return 'Unknown skill ' + id; if (p < 0 || p > 10) return 'Skills run 0–10.'; }
  const corePts = BUDGET.core + (s.traits.includes('mind_without_fog') ? 2 : 0);
  const d = deriveCreation(s.skills, s.attrs, s.cores, corePts);
  if (!d.ok) return 'Those points break the tree or the budgets.';
  if (d.spent !== BUDGET.skill) return 'Spend all 10 Skill points.';
  if (d.attrLeft !== 0 || d.coreLeft !== 0) return 'Place every Attribute and Core point.';
  return startingMagicError(s, d);
}
/** Starting magic (spec: The Magic panel, rules 1.4): 2 Sigil words making a spell, one of them a Reach word (default
 * SPARK · SEEK); 1 Outburst design from one school and one module. Both optional: a caster without a choice gets the
 * defaults. */
export function startingMagicError(s: Pick<Sheet, 'sigils' | 'outburst' | 'skills'>, d?: unknown): string | null {
  if (s.sigils && s.sigils.length) {
    const e = startingWordsError(s.sigils); if (e) return e;
  }
  if (s.outburst) {
    if (!SCHOOL[s.outburst.school]) return 'Pick an Outburst school.';
    if ((s.outburst.modules || []).some((m) => !MODULE[m])) return 'Unknown Outburst module.';
    if (s.outburst.tone && s.outburst.tone !== 'raw') { if (!TONE[s.outburst.tone]) return 'Unknown Outburst tone.'; if (((s.skills || {}) as any).visualization < 1 || !((s.skills || {}) as any).visualization) return 'A tone needs Visualization 1.'; }
    // One school and exactly one module; the Will Power module slots are for designs made in play.
    if ((s.outburst.modules || []).length !== 1) return 'Your starting Outburst takes one school and exactly one module (more module slots are for designs made in play).';
  }
  return null;
}
/** The magic a new character starts with: their picks, or a default cantrip for anyone with the skill or the kit. */
function startingMagic(c: Character) {
  const bp = c.skills.brain_power || 0, wp = c.skills.will_power || 0;
  c.sigils = c.sigils && c.sigils.length ? [...c.sigils] : bp >= 1 || c.kit === 'sigil' ? [...STARTING_DEFAULT] : [];
  c.sigilRev = SIGIL_REV;
  const o: Sheet['outburst'] = c.outburst || (wp >= 1 || c.kit === 'soul' ? { school: 'damage', modules: ['move'] } : null);
  // A tone (rules 1.5): one at Visualization 1, picked with the starting design.
  const tone = o?.tone && o.tone !== 'raw' && TONE[o.tone] && (c.skills.visualization || 0) >= 1 ? o.tone : undefined;
  c.outbursts = o ? [{ id: 'o1', name: o.name || (SCHOOL[o.school]?.name || 'Outburst') + ' Outburst', school: o.school, modules: [...(o.modules || [])], ...(o.option ? { option: o.option } : {}), ...(tone ? { tone } : {}) }] : [];
  c.soulKnown = o ? { schools: [o.school], modules: [...(o.modules || [])].filter((m) => MODULE[m] && !(MODULE[m] as any).form), tones: tone ? [tone] : [] } : { schools: [], modules: [], tones: [] };
  // A form module picked at creation is known too (it is a module).
  if (o) for (const m of o.modules || []) if ((MODULE[m] as any)?.form && !c.soulKnown.modules.includes(m)) c.soulKnown.modules.push(m);
  c.soulRev = SOUL_REV;
  delete c.outburst;
}

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
/** Every design rule of rules 1.5 (magic/design, Beloved Spells, the Twinbound twin): schools known, a second school at
 * Will Power 5 on the same side, modules known and within `slots`, one shape (Size needs one), a known tone (the first
 * is free at Visualization 1: `learnTone` names it), options checked. Pure: returns the clean design or an error. */
export function checkOutburstDesign(c: Character, d: Partial<OutburstDesign> | null | undefined, slots: number, id: string): { design: OutburstDesign; learnTone?: string } | string {
  if (!d || !d.school || !SCHOOL[d.school]) return 'Pick a school.';
  const k = c.soulKnown || { schools: [], modules: [] };
  if (!k.schools.includes(d.school)) return 'You haven\'t learned the ' + SCHOOL[d.school].name + ' school.';
  const mods = [...new Set(d.modules || [])];
  if (d.school2) {
    if ((c.skills.will_power || 0) < 5) return 'Two schools need Will Power 5.';
    if (!SCHOOL[d.school2] || !k.schools.includes(d.school2) || d.school2 === d.school) return 'Pick a second school you know.';
    const pe = pairingError(d.school, d.school2, mods); if (pe) return pe;
  }
  if (mods.some((x) => !MODULE[x] || !k.modules.includes(x))) return 'Use only modules you know.';
  if (mods.length > slots) return 'At most ' + slots + ' module' + (slots === 1 ? '' : 's') + ' (Will Power).';
  { const why = designShapeError(mods); if (why) return why; }
  const tone = d.tone && d.tone !== 'raw' ? d.tone : undefined; let learnTone: string | undefined;
  if (tone) {
    if (!TONE[tone]) return 'No such tone.';
    const kt = k.tones || [];
    if (!kt.includes(tone)) { if ((c.skills.visualization || 0) >= 1 && !kt.length) learnTone = tone; else return 'You haven\'t learned the ' + TONE[tone].name + ' tone.'; }
  }
  const option = optionOf(d.school, d.option), option2 = d.school2 ? optionOf(d.school2, d.option2) : undefined;
  const design: OutburstDesign = { id, name: String(d.name || SCHOOL[d.school].name + ' Outburst').slice(0, 40), school: d.school, ...(d.school2 ? { school2: d.school2 } : {}), modules: mods, ...(option ? { option } : {}), ...(option2 ? { option2 } : {}), ...(tone ? { tone } : {}) };
  return learnTone ? { design, learnTone } : { design };
}
/** An old character's Outburst designs and learned modules under rules 1.5 (runs once: c.soulRev). Returns log notes. */
export function migrateCharacterSoul(c: Character): string[] {
  if (c.soulRev === SOUL_REV) return [];
  c.soulRev = SOUL_REV;
  const notes: string[] = [];
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
  const corePts = BUDGET.core + (s.traits.includes('mind_without_fog') ? 2 : 0);
  const d = deriveCreation(s.skills, s.attrs, s.cores, corePts);
  const kit = KITS[s.kit] || KITS.medic;
  const c: Character = {
    ...s, attrs: d.attr, cores: d.core, id, owner, level: 1, xp: 0, xpBySource: {}, hp: 0, echo: 1, classId: null, classRev: CLASS_REV, perks: [],
    unspent: { skill: 0, attr: 0, core: 0 }, deeds: [], weapon: kit.weapon, armourClass: kit.armourClass, stims: kit.stims, essence: 1, weaponKills: {}, dead: false,
    injuries: [], pack: kit.pack.map((x) => ({ ...x })),
  };
  // A trait that caps armour (Forlorn Hope: Class I at most) drops the kit's armour to the cap at lock-in (the kit's
  // heavier plate isn't carried; PROVISIONAL, spec 14).
  { const cap = armourCap(c); if (cap != null && c.armourClass > cap) { (c.state ||= {}).armourDropped = c.armourClass; c.armourClass = cap; } }
  c.hp = maxHp(c);
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
export const KITS: Record<string, { weapon: string; weaponName?: string; armourClass: number; armourName: string; stims: number; pack: PackItem[] }> = {
  medic: { weapon: 'service_pistol', weaponName: 'Service pistol (.32 Decrkm)', armourClass: 2, armourName: 'Medic plate', stims: 3,
    pack: [magsOf('service_pistol', 2), roundsOf('.32 decrkm', 24), gear('field_kit', 1, 'Bandages, splints, a suture set'), gear('spare_parts', 3)] },
  soldier: { weapon: 'hellraiser_service_rifle', armourClass: 3, armourName: 'Flak vest', stims: 0,
    pack: [magsOf('hellraiser_service_rifle', 3), roundsOf('rifle', 48), { id: 'combat_knife', name: 'Combat knife', qty: 1, kind: 'weapon', weapon: 'combat_knife' }, gear('ration_pack')] },
  sigil: { weapon: 'service_pistol', armourClass: 1, armourName: 'Padded coat', stims: 0,
    pack: [magsOf('service_pistol', 2), roundsOf('.32 decrkm', 24), gear('evoker', 1, 'Holds one core; Sigil magic'), gear('standard_core', 4), gear('chalk_and_wax')] },
  soul: { weapon: 'drifter_revolver', armourClass: 1, armourName: 'Padded coat', stims: 0,
    pack: [magsOf('drifter_revolver', 2), roundsOf('revolver', 12), gear('emanator', 1, 'The heart link; Soul magic'), gear('prayer_beads')] },
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
    pack: packOf(c).reduce((t, it) => t + itemKg(it), 0) + c.stims * (ITEM.stim_injector?.weight_kg || 0) + c.essence * (ITEM.essence_of_experience?.weight_kg || 0) };
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
const fx = (c: Character, stat: string, base: number, ctx: any = {}) => { if (!c.perks?.length && !c.traits?.length && !c.classId && !c.advancedClass) return base; const q = statQuery({ c }, stat, ctx); return (base + q.add) * q.mult; };
export const ARMOUR = [{ value: 0, move: 0, dodge: 0 }, { value: 5, move: 0, dodge: 0 }, { value: 10, move: 0, dodge: 0 }, { value: 15, move: -0.5, dodge: 0 }, { value: 20, move: -0.5, dodge: -1 }, { value: 25, move: -1, dodge: 0 }];
export const hpPerLevel = (c: Character) => fx(c, 'hp_per_level', 5 + 2 * P(c, 'durability'));
export const maxHp = (c: Character) => Math.max(1, Math.round(fx(c, 'hp', 100 + 15 * (A(c, 'endurance') - 1) + (c.level - 1) * hpPerLevel(c))));
export const initiativeBonus = (c: Character) => fx(c, 'init', (A(c, 'agility') - 1) + mod(P(c, 'reaction_speed')) + skillRollMod({ c }, 'reaction_speed', { roll: 'initiative' }).add);
/** Overburdened (spec: Carry weight): kg over the limit; −1 Movement per started 5 kg over. */
export const overweightKg = (c: Character) => Math.max(0, Math.round((carriedKg(c).total - carryLimit(c)) * 100) / 100);
export const overburdenPenalty = (c: Character) => Math.ceil(overweightKg(c) / 5);
export const movement = (c: Character) => Math.max(0.5, fx(c, 'move', (1 + 0.5 * (A(c, 'agility') - 1) + (ARMOUR[c.armourClass]?.move || 0)) * (c.injuries?.some((i) => i.loc === 'leg') ? 0.5 : 1) - overburdenPenalty(c) + gearBonus(c, 'movement_bonus')));
export const defense = (c: Character) => fx(c, 'defense', 10 + Math.max(0, mod(P(c, 'athletics')) + (ARMOUR[c.armourClass]?.dodge || 0)) + gearBonus(c, 'defense_bonus')
  + (c.offHand && (ITEM[c.offHand.id] as any)?.category === 'shield' && (WEAPON[c.weapon] as any)?.grants?.effect?.op === 'defense_with_shield' ? (WEAPON[c.weapon] as any).grants.effect.value : 0));
export const physicalMult = (c: Character) => fx(c, 'mult_physical', 1 + 0.1 * (A(c, 'strength') - 1) + 0.05 * P(c, 'raw_power'));
export const critMult = (c: Character) => fx(c, 'crit_damage', 2 + 0.1 * (A(c, 'perception') - 1) + 0.05 * P(c, 'athletics'));
export const healingMult = (c: Character) => fx(c, 'mult_heal_given', 1 + 0.1 * (A(c, 'insight') - 1) + 0.1 * P(c, 'camaraderie'));
export const maxMp = (c: Character) => fx(c, 'mp_max', 100 + 100 * (A(c, 'virtue') - 1));
// ---------- magic stats (spec: Derived stats, Magic; rules 1.2) ----------
export const sigilMult = (c: Character) => 1 + 0.1 * (A(c, 'intelligence') - 1) + 0.1 * P(c, 'brain_power');
/** The Soul multiplier (rules 1.5): 1 + 0.05 × (Determination − 1) + 0.1 × Will Power (2.45 maxed). PROVISIONAL. */
export const soulMult = (c: Character) => 1 + 0.05 * (A(c, 'determination') - 1) + 0.1 * P(c, 'will_power');
export const elementalMult = (c: Character) => 1 + 0.2 * (A(c, 'expression') - 1) + 0.1 * P(c, 'visualization');
export const maxSigilWords = (c: Character) => fx(c, 'max_sigil_words', 2 + Math.floor((A(c, 'intelligence') - 1) / 2));
export const glyphAp = (c: Character) => Math.max(0.5, Math.round(fx(c, 'glyph_ap', 1 - 0.1 * (A(c, 'expression') - 1)) * 10) / 10);
export const sigilCoreSaving = (c: Character) => Math.floor(P(c, 'proficiency') / 3);
export const sigilRangeBonus = (c: Character) => Math.floor(0.5 * P(c, 'rumination'));
export const sigilDurationBonus = (c: Character) => Math.floor(0.5 * P(c, 'brain_power'));
export const wordsKnownCap = (c: Character) => 4 + P(c, 'brain_power');
/** Begin's AP (rules 1.5): 2 for everyone (Swift: 1). Empathy no longer lowers it (it gives free Pumps instead). Kept
 * under its 1.2 name for the class moves priced "Soul cast AP". */
export const soulCastAp = (c: Character) => { void c; return 2; };
/** Free Pumps per round (rules 1.5, Leon's caveat 1): 1 from Empathy 3, 2 from Empathy 7. PROVISIONAL. */
export const freePumps = (c: Character) => Math.max(0, Math.floor(fx(c, 'free_pumps', P(c, 'empathy') >= 7 ? 2 : P(c, 'empathy') >= 3 ? 1 : 0)));
export const soulCostSaving = (c: Character) => 0.05 * (A(c, 'insight') - 1);
export const soulRangeBonus = (c: Character) => fx(c, 'soul_range', Math.floor(0.5 * P(c, 'lore_master')));
export const syphonMult = (c: Character) => 1 + 0.1 * (A(c, 'determination') - 1) + 0.1 * P(c, 'will_power');
export const strainLimit = (c: Character) => fx(c, 'strain_limit', 3 + Math.floor(P(c, 'will_power') / 2));
export const moduleSlots = (c: Character) => fx(c, 'module_slots', 1 + Math.floor(P(c, 'will_power') / 3));
export const readyDesigns = (c: Character) => fx(c, 'ready_designs', 2 + Math.floor(P(c, 'empathy') / 2));
/** Save bonuses and debuff strength (spec: Conditions and saves). */
export const saveBonus = (c: Character, fam: 'body' | 'brain' | 'heart') => { const sk = fam === 'body' ? 'guts' : fam === 'brain' ? 'charisma' : 'composure'; return fx(c, 'save_' + fam, mod(P(c, sk)) + skillRollMod({ c }, sk, { roll: 'save', family: fam }).add); };
export const debuffStrength = (c: Character, fam: 'body' | 'brain' | 'heart') => Math.max(0, fx(c, 'debuff_' + fam, mod(P(c, fam === 'body' ? 'intimidation' : fam === 'brain' ? 'eloquence' : 'implication'))));
const carries = (c: Character, ids: string[]) => ids.includes(c.weapon) || (!!c.offHand && ids.includes(c.offHand.id)) || packOf(c).some((x) => ids.includes(x.item || x.id) && x.qty > 0);
export const hasEvoker = (c: Character) => carries(c, ['evoker', 'evoker_blade', 'spellslinger_pistol']);
export const hasEmanator = (c: Character) => carries(c, ['emanator', 'emanator_gauntlet']);
export const coresCarried = (c: Character) => packOf(c).filter((x) => (x.item || x.id) === 'standard_core').reduce((t, x) => t + x.qty, 0);
/** MP now: the Emanator's charge (full when first carried); no Emanator, no MP. */
export const mpNow = (c: Character) => (hasEmanator(c) ? Math.min(maxMp(c), c.mp ?? maxMp(c)) : 0);
/** Charge left in the core loaded in the Evoker (a fresh core holds 10). */
export const evoChargeNow = (c: Character) => (hasEvoker(c) ? c.evoCharge ?? 10 : 0);
export const passive = (c: Character, skill: string, ctx: any = {}) => fx(c, 'passive:' + skill, 10 + mod(P(c, skill)) + skillRollMod({ c }, skill, { roll: 'passive', ...ctx }).add, ctx);
// ---------- derived stats the damage chain and the shared subsystems read (spec: Derived stats; rules 1.3) ----------
/** Percentage reductions are capped at 60% (spec: Derived stats). Each returns the fraction NOT taken off (0..0.6). */
const cap60 = (x: number) => Math.max(0, Math.min(0.6, x));
/** Critical damage taken: −10% × (Perception − 1) − 5% × Durability. */
export const critTakenPct = (c: Character) => cap60(fx(c, 'crit_taken', 0.1 * (A(c, 'perception') - 1) + 0.05 * P(c, 'durability')));
/** Elemental damage taken: −10% × Pain Threshold. Below 0 it is damage taken extra (Paper, Oil in My Mind: +10% at
 * Pain Threshold 0), so only the 60% cap applies, not the floor. */
export const elementalTakenPct = (c: Character) => Math.max(-1, Math.min(0.6, fx(c, 'elemental_taken', 0.1 * P(c, 'pain_threshold'))));
/** Ambush damage taken: −10% × Reaction Speed. */
export const ambushTakenPct = (c: Character) => cap60(fx(c, 'ambush_taken', 0.1 * P(c, 'reaction_speed')));
/** Healing and shields received: +10% × Sensory. */
export const healReceivedMult = (c: Character) => fx(c, 'heal_received', 1 + 0.1 * P(c, 'sensory'));
/** Counter bonus: mod(Raw Power), minimum 0. */
export const counterBonus = (c: Character) => Math.max(0, fx(c, 'counter', mod(P(c, 'raw_power'))));
/** Throwing range: 6 + 0.5 × Dexterity tiles (the Derived stats formula; spec item 17). */
export const throwRange = (c: Character) => Math.floor(fx(c, 'throw_range', 6 + 0.5 * P(c, 'dexterity')));
/** Ambush multiplier: 1.5 + 0.05 × Ingenuity. */
export const ambushMult = (c: Character) => fx(c, 'ambush_mult', 1.5 + 0.05 * P(c, 'ingenuity'));
/** Blessing power: 1 + 0.1 × Faith. */
export const blessingPower = (c: Character) => fx(c, 'blessing_power', 1 + 0.1 * P(c, 'faith'));
/** Prayer cooldown in turns: 4 − 0.5 × (Virtue − 1) − 0.5 × Faith, minimum 1 (rounded up). */
export const prayerCooldown = (c: Character) => Math.max(1, Math.ceil(4 - 0.5 * (A(c, 'virtue') - 1) - 0.5 * P(c, 'faith')));
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

/** Apply levels gained: points per level, HP per level (spec table "On reaching a level"). Returns levels gained. */
export function applyLevels(c: Character): number {
  const target = levelForXp(c.xp);
  let gained = 0;
  while (c.level < target) {
    c.level++; gained++;
    c.unspent.skill += 1;
    if (c.level % 2 === 0) c.unspent.attr += 1;
    if (c.level % 5 === 0) c.unspent.core += 1;
    c.hp = Math.min(maxHp(c), c.hp + hpPerLevel(c));
  }
  return gained;
}

/** After creation the caps work normally: a skill can't pass its Attribute, an Attribute can't pass its Core. */
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
    if (A(c, id) + 1 > c.cores[a.core]) return 'Needs a Core point first.';
    if (A(c, id) >= 10) return 'Already at 10.';
    return null;
  }
  if (c.unspent.core < 1) return 'No Core points to spend.';
  if ((c.cores as any)[id] >= 10) return 'Already at 10.';
  return null;
}

// ---------- classes (spec: Classes; Class Roster Revision 3) ----------
/** The class roster revision (3: one base class per attribute). */
export const CLASS_REV = 3;
const RANK_AT: { II: number; III: number } = { II: Number(CLASS_RULES?.rank_thresholds?.II) || 5, III: Number(CLASS_RULES?.rank_thresholds?.III) || 8 };
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
/** Rank reads the class's own attribute: I on gaining it, II at 5, III at 8 (provisional), even if another attribute
 * later grows higher. */
export function classRank(c: Pick<Character, 'classId' | 'attrs'> & { skills?: Record<string, number> }): number {
  if (!c.classId) return 0;
  if (revision2Classes() && REV2_CLASSES[c.classId]) { // the test-only Revision 2 shells: signature totals 13 / 18
    const t = REV2_CLASSES[c.classId].signature.reduce((n, s) => n + (c.skills?.[s] || 0), 0); return t >= 18 ? 3 : t >= 13 ? 2 : 1;
  }
  const k = CLASS[c.classId]; if (!k) return 1;
  const v = attrOf(c, k.attribute);
  return v >= RANK_AT.III ? 3 : v >= RANK_AT.II ? 2 : 1;
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
export function equip(c: Character, idx: number, to: 'main' | 'off' | 'worn'): string | null {
  const pack = packOf(c).map((x) => ({ ...x })), it = pack[idx]; if (!it) return 'Nothing there.';
  if (isPlotItem(it)) return 'A plot item can\'t be equipped.';
  const wid = it.weapon && WEAPON[it.weapon] ? it.weapon : null, item = ITEM[it.item || it.id] as any;
  const take = () => { if (it.qty > 1) it.qty--; else pack.splice(idx, 1); };
  const putBack = (id: string, st: GearState | undefined, loaded?: number) => { if (WEAPON[id]) pack.push({ id, name: st?.name || WEAPON[id].name, qty: 1, kind: 'weapon', weapon: id, ...(st || {}), ...(loaded ? { loaded } : {}) }); else if (ITEM[id]) pack.push({ id, item: id, name: ITEM[id].name, qty: 1, kind: 'tool', ...(st || {}) }); };
  // Items may refuse what is equipped or fitted (stat 'equip_ban' {weapon, mod}: Old School won't carry an electronic or
  // Evoker-linked gun or a red dot; Forlorn Hope's armour cap is armourCap) — perk-runtime still-open item 6.
  const ban = (ctx: any) => statQuery({ c }, 'equip_ban', ctx).add > 0 ? equipBanWhy(c, ctx) : null;
  if (to === 'main') {
    if (!wid) return 'Only weapons go in the main hand.';
    const need = (WEAPON[wid] as any).requires || {}; for (const [sk, n] of Object.entries(need)) if ((c.skills[sk] || 0) < (n as number)) return 'Needs ' + sk.replace('_', ' ') + ' ' + n + '.';
    { const b = ban({ weapon: wid, mods: it.mods || [] }); if (b) return b; }
    take(); putBack(c.weapon, c.weaponState, c.loaded ?? undefined); // a stowed gun keeps the rounds in it (rules 1.3)
    if (twoHands(c, wid) && c.offHand) { putBack(c.offHand.id, c.offHand); c.offHand = null; }
    c.weapon = wid; c.weaponState = { rarity: it.rarity, dur: it.dur, mods: it.mods, name: it.name !== WEAPON[wid].name ? it.name : undefined }; c.loaded = it.loaded ?? 0;
  } else if (to === 'off') {
    if (twoHands(c, c.weapon)) return 'Your main-hand weapon needs both hands.';
    if (wid) { const b = ban({ weapon: wid, mods: it.mods || [] }); if (b) return b; }
    if (wid ? (WEAPON[wid] as any).hands !== '1H' : item?.slot !== 'off_hand') return 'That doesn\'t go in the off hand.';
    take(); if (c.offHand) putBack(c.offHand.id, c.offHand);
    c.offHand = { id: wid || it.item || it.id, rarity: it.rarity, dur: it.dur, mods: it.mods };
  } else {
    const slot = item?.slot; if (!slot || slot === 'off_hand' || item.category !== 'armour') return 'That isn\'t slot armour.';
    take(); const worn = { ...(c.worn || {}) }; if (worn[slot]) putBack(worn[slot], undefined); worn[slot] = it.item || it.id; c.worn = worn;
  }
  c.pack = pack; return null;
}
export function unequip(c: Character, slot: string): string | null {
  const pack = packOf(c).map((x) => ({ ...x }));
  if (slot === 'off') { if (!c.offHand) return 'Nothing there.'; const o = c.offHand; pack.push(WEAPON[o.id] ? { id: o.id, name: WEAPON[o.id].name, qty: 1, kind: 'weapon', weapon: o.id, rarity: o.rarity, dur: o.dur, mods: o.mods } : { id: o.id, item: o.id, name: ITEM[o.id]?.name || o.id, qty: 1, kind: 'tool' }); c.offHand = null; }
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
  guard: () => ({ id: 'guard', max: 5, persist: false }),
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
  return ids.map((id) => RES_RULES[id](c));
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
