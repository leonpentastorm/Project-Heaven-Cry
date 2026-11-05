// Characters: the stat tree, creation legality, derived stats, XP and levels, classes and perk steps.
// Every formula cites the spec section it comes from (docs/rules/PHC-Core-Rules-v1.0.md).
import { ATTRS, CLASSES, CORES, type CoreId, PERKS, PERK, SKILL, SKILLS, XP_TOTAL } from './data';

export interface Sheet {
  name: string; portrait: string; origin: string; kit: string; traits: string[];
  skills: Record<string, number>; attrs: Record<string, number>; cores: Record<CoreId, number>;
  identity: Record<string, string>; archetype?: string | null;
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
}
export type InjuryLoc = 'head' | 'torso' | 'arm' | 'leg';
export interface Injury { loc: InjuryLoc; side?: 'left' | 'right' }
export interface PackItem { id: string; name: string; qty: number; kind: 'weapon' | 'ammo' | 'tool' | 'focus' | 'food' | 'med' | 'loot'; weapon?: string; note?: string }


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

/** A sheet is legal to lock in: every budget spent, tree caps hold, 0–2 traits, a name, an origin, a kit. */
export function validateSheet(s: Sheet): string | null {
  if (!s.name?.trim()) return 'A character needs a name.';
  if (!s.origin) return 'Pick an origin.';
  if (!s.kit) return 'Pick a starting kit.';
  if ((s.traits || []).length > 2) return 'At most 2 traits.';
  for (const [id, p] of Object.entries(s.skills)) { if (!SKILL[id]) return 'Unknown skill ' + id; if (p < 0 || p > 10) return 'Skills run 0–10.'; }
  const corePts = BUDGET.core + (s.traits.includes('mind_without_fog') ? 2 : 0);
  const d = deriveCreation(s.skills, s.attrs, s.cores, corePts);
  if (!d.ok) return 'Those points break the tree or the budgets.';
  if (d.spent !== BUDGET.skill) return 'Spend all 10 Skill points.';
  if (d.attrLeft !== 0 || d.coreLeft !== 0) return 'Place every Attribute and Core point.';
  return null;
}

/** Turn a locked-in sheet into a level-1 character (spec: Creation; kits from the creation screen). */
export function newCharacter(id: string, owner: string, s: Sheet): Character {
  const corePts = BUDGET.core + (s.traits.includes('mind_without_fog') ? 2 : 0);
  const d = deriveCreation(s.skills, s.attrs, s.cores, corePts);
  const kit = KITS[s.kit] || KITS.medic;
  const c: Character = {
    ...s, attrs: d.attr, cores: d.core, id, owner, level: 1, xp: 0, xpBySource: {}, hp: 0, echo: 1, classId: null, perks: [],
    unspent: { skill: 0, attr: 0, core: 0 }, deeds: [], weapon: kit.weapon, armourClass: kit.armourClass, stims: kit.stims, essence: 1, weaponKills: {}, dead: false,
    injuries: [], pack: kit.pack.map((x) => ({ ...x })),
  };
  c.hp = maxHp(c);
  return c;
}

/** The four starting kits from the creation screen: what's held, worn and packed. */
export const KITS: Record<string, { weapon: string; weaponName?: string; armourClass: number; armourName: string; stims: number; pack: PackItem[] }> = {
  medic: { weapon: 'service_pistol', weaponName: 'Service pistol (.32 Decrkm)', armourClass: 2, armourName: 'Medic plate', stims: 3,
    pack: [{ id: 'field_kit', name: 'Field kit', qty: 1, kind: 'tool', note: 'Bandages, splints, a suture set' }] },
  soldier: { weapon: 'hellraiser_service_rifle', armourClass: 3, armourName: 'Flak vest', stims: 0,
    pack: [{ id: 'rifle_magazine', name: 'Rifle magazine', qty: 3, kind: 'ammo', note: 'Spares for the service rifle' }, { id: 'combat_knife', name: 'Combat knife', qty: 1, kind: 'weapon', weapon: 'combat_knife' },
      { id: 'ration_pack', name: 'Ration pack', qty: 1, kind: 'food' }] },
  sigil: { weapon: 'service_pistol', armourClass: 1, armourName: 'Padded coat', stims: 0,
    pack: [{ id: 'evoker', name: 'Evoker', qty: 1, kind: 'focus', note: 'Holds one core; Sigil magic' }, { id: 'standard_core', name: 'Standard mana core', qty: 4, kind: 'ammo' },
      { id: 'chalk_and_wax', name: 'Chalk and wax', qty: 1, kind: 'tool' }] },
  soul: { weapon: 'drifter_revolver', armourClass: 1, armourName: 'Padded coat', stims: 0,
    pack: [{ id: 'emanator', name: 'Emanator', qty: 1, kind: 'focus', note: 'The heart link; Soul magic' }, { id: 'prayer_beads', name: 'Prayer beads and incense', qty: 1, kind: 'tool' }] },
};
export const packOf = (c: Character): PackItem[] => c.pack ?? (KITS[c.kit] || KITS.medic).pack;

// ---------- injuries (spec: Injuries) ----------
/** Injury resistance: 10% per Endurance above 1 (rules.json injury_resist_pct). */
export const injuryResistPct = (c: Character) => 10 * (A(c, 'endurance') - 1);
/** One-handed weapons; everything else needs both arms, so any arm injury hurts it (spec: Injuries). */
export const ONE_HANDED = ['pistol', 'revolver', 'light_melee', 'thrown', 'unarmed'];
export const mainHandSide = (c: Pick<Sheet, 'identity'>): 'left' | 'right' => (/^l/i.test(c.identity?.hand || '') ? 'left' : 'right');
export const injuryText: Record<InjuryLoc, string> = { head: 'Dazed: −2 AP next turn', torso: 'Bleeding: 5 damage a turn for 3 rounds; a stim stops it', arm: '−2 to attacks with that arm, until treated', leg: 'Half Movement, until treated' };

// ---------- derived stats (spec: Derived stats) ----------
const P = (c: Character, id: string) => c.skills[id] || 0;
const A = (c: Character, id: string) => c.attrs[id] || 1;
export const ARMOUR = [{ value: 0, move: 0, dodge: 0 }, { value: 5, move: 0, dodge: 0 }, { value: 10, move: 0, dodge: 0 }, { value: 15, move: -0.5, dodge: 0 }, { value: 20, move: -0.5, dodge: -1 }, { value: 25, move: -1, dodge: 0 }];
export const hpPerLevel = (c: Character) => 5 + 2 * P(c, 'durability');
export const maxHp = (c: Character) => 100 + 15 * (A(c, 'endurance') - 1) + (c.level - 1) * hpPerLevel(c);
export const initiativeBonus = (c: Character) => (A(c, 'agility') - 1) + mod(P(c, 'reaction_speed'));
export const movement = (c: Character) => Math.max(0.5, (1 + 0.5 * (A(c, 'agility') - 1) + (ARMOUR[c.armourClass]?.move || 0)) * (c.injuries?.some((i) => i.loc === 'leg') ? 0.5 : 1));
export const defense = (c: Character) => 10 + Math.max(0, mod(P(c, 'athletics')) + (ARMOUR[c.armourClass]?.dodge || 0));
export const physicalMult = (c: Character) => 1 + 0.1 * (A(c, 'strength') - 1) + 0.05 * P(c, 'raw_power');
export const critMult = (c: Character) => 2 + 0.1 * (A(c, 'perception') - 1) + 0.05 * P(c, 'athletics');
export const healingMult = (c: Character) => 1 + 0.1 * (A(c, 'insight') - 1) + 0.1 * P(c, 'camaraderie');
export const maxMp = (c: Character) => 100 + 100 * (A(c, 'virtue') - 1);
export const passive = (c: Character, skill: string) => 10 + mod(P(c, skill));
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

// ---------- classes (spec: Classes) ----------
export function classTotals(skills: Record<string, number>) {
  return CLASSES.map((k) => ({ id: k.id, name: k.name, core: k.core, total: k.signature.reduce((t, s) => t + (skills[s] || 0), 0) }));
}
/** Closest-class rule: any class whose signature total is among the two highest totals (ties included). */
export function eligibleClasses(skills: Record<string, number>) {
  const t = classTotals(skills);
  const top = [...new Set(t.map((x) => x.total))].sort((a, b) => b - a).slice(0, 2);
  return t.filter((x) => top.includes(x.total)).sort((a, b) => b.total - a.total);
}
export function classRank(c: Character): number {
  if (!c.classId) return 0;
  const t = classTotals(c.skills).find((x) => x.id === c.classId)!.total;
  return t >= 18 ? 3 : t >= 13 ? 2 : 1;
}

// ---------- perk steps (spec: Perks) ----------
/** Perk steps earned in a skill: one per Mastery level 1–4 (3/5/7/9 points). */
export const stepsEarned = (p: number) => [3, 5, 7, 9].filter((t) => p >= t).length;
export function stepsTaken(c: Character, skill: string) {
  return c.perks.filter((x) => PERK[x.id]?.tier === 'acquired' && PERK[x.id].skills.includes(skill)).reduce((n, x) => n + (x.tier === 'II' ? 2 : 1), 0);
}
/** Skills with a perk step waiting, and the choices for each (a new Tier I, or an upgrade of a held Tier I). */
export function pendingPerkSteps(c: Character) {
  const out: { skill: string; choices: { id: string; tier: 'I' | 'II' }[] }[] = [];
  for (const s of SKILLS) {
    const free = stepsEarned(P(c, s.id)) - stepsTaken(c, s.id);
    if (free <= 0) continue;
    const own = PERKS.filter((p) => p.tier === 'acquired' && p.skills.includes(s.id));
    const choices = own.flatMap((p): { id: string; tier: 'I' | 'II' }[] => {
      const held = c.perks.find((x) => x.id === p.id);
      return !held ? [{ id: p.id, tier: 'I' as const }] : held.tier === 'I' ? [{ id: p.id, tier: 'II' as const }] : [];
    });
    if (choices.length) out.push({ skill: s.id, choices });
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
