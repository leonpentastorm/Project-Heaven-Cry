// THE ONE FORMULA (docs/design/proposals/2026-11-unified-damage.md, part 2; stage (a): a re-expression; steps a0 to a6
// moved no number, step a7 closed the leaks listed in docs/design/handoffs/unified-damage-stage-a.md).
//
//   amount = (base + flat) × Stat × Level × own multipliers × (1 + target bonuses, capped at +100%)      amountOf
//   dealt  = max(1, floor(amount) − armour(target, how this source meets armour))                        armourAgainst, landed
//            then the one sink (effects/damage.ts applyDamage)                                           deal
//   healed = amount, then healUnit; shield = amount, then grantShield                                    mend
//
//   base    declared by the source (a weapon's damage, a word's, a school's, a prayer's), with per-point parts where
//           they are honestly additive (a bow's 20 + 5 × Raw Power, an intervention's 20 + 4 × Devotion)
//   flat    what items add (the 'damage_out' hook's ctx.add)
//   Stat    1 + Σ over the profile's pair (attr × (Attribute − 1) + skill × Skill): data/rules.json output.profiles and
//           output.pairs. An enemy has no sheet: its Stat and Level together are its tier's damage × its level's
//           damage_mult (Unit.lvlDmg, rules 1.15), given by the caller
//   Level   the profile's column of output.level at the dealer's level: `deal` (×1 at every level today: the slot is
//           there, nothing moves) or `mend` (the level factor of rules 1.20: the enemy table's damage column)
//   own     the source's own multipliers, in the order the source lists them (technique, rarity, ammunition, critical,
//           conditions, perks): they multiply
//   target  "against this target" bonuses: fractions that ADD together, capped at +100% (VS_CAP)
//
// ONE ORDER FOR EVERYTHING (step a7, spec item 1421): the base (with what items add) times each multiplier in turn, in
// the order the source lists them, then the bonus against this target: ((base + flat) × m1) × m2 … × target. A weapon
// attack used to multiply its multipliers and the target bonus together first; in floating point that lands a point
// lower here and there (30 × (1.5 × 1.2) is 53.99…, (30 × 1.5) × 1.2 is 54). The sum (base + flat) is never under 0.
// ARMOUR IS NEVER UNDER 0 (step a7, spec item 1422), for every source.
//
// WHO GOES THROUGH IT (stage (a)):
//   character.ts     the derived multipliers (Physical, a weapon's, Sigil, Elemental, Soul, Healing given, Blessing
//                    power) are the Stat term of their profile: statTerm
//   effects/mending  mendFactor is levelFactor('mend')
//   combat.ts        attackDamage (every weapon attack and, through physical/core.ts strike(), every technique) builds
//                    its number with openAmount → the 'damage_out' hook → closeAmount; hurtUnit is deal()
//   magic.ts         harm is deal()
//   and every site that takes armour off a number calls armourAgainst / landed (the carried round, Flush, Interpose,
//   Breaching Strike, the Sigil preview).
//   sigil.ts         a Line's damage parts, MEND and WARD (sigilDamage, sigilBoon: the preview and the resolve)      a4
//   magic.ts         the Outburst's damage, heal and shields (outburstDamage and its kin); heal() is mend()          a4, a5
//   faith.ts         prayers and interventions (prayerAmount)                                                        a5
//   effects/mending  the medic's kit (kitHeal)                                                                       a5
//   effects/amounts  the numbers items deal, heal and shield with, from their data (itemAmount)                      a6
import type { Character } from '../character';
import type { Combat, Unit } from '../combat';
import { RULES, enemyLevelRow, clampEnemyLevel } from '../data';
import { emit } from './hooks';
import { applyDamage, healUnit, grantShield, type DamageSrc, type DamageResult } from './damage';

// ---------------------------------------------------------------------------------------------- the data
export interface Term { v: number; label: string }
export interface Profile {
  /** A constant of the profile (×1 today; stage (b) re-pins a system here without touching its bases). */ k: number;
  /** What a point of Attribute over 1 adds to the Stat term. */ attr: number;
  /** What a point of Skill adds to the Stat term. */ skill: number;
  /** The column of output.level this profile reads: 'deal', 'mend', or null (no level term). */ level: 'deal' | 'mend' | null;
  /** The pair it reads by default (output.pairs). */ pair?: string;
}
export interface Pair { attrs: string[]; skills: string[] }
const OUT: any = (RULES as any).output || {};
/** The profiles (data/rules.json output.profiles). Today's slopes, one per system; `level` null everywhere but `mend`. */
export const PROFILES: Record<string, Profile> = Object.fromEntries(Object.entries(OUT.profiles || {}).filter(([, p]) => p && typeof p === 'object').map(([id, p]: [string, any]) =>
  [id, { k: Number.isFinite(p.k) ? p.k : 1, attr: Number(p.attr) || 0, skill: Number(p.skill) || 0, level: p.level === 'deal' || p.level === 'mend' ? p.level : null, ...(p.pair ? { pair: String(p.pair) } : {}) }]));
/** The pairs (data/rules.json output.pairs): which Attributes and Skills a Stat term reads. A weapon's own pair comes
 * from weapons.json `phys` (each `scales_with` Attribute; the skill it hits with): character.ts weaponMult. */
export const PAIRS: Record<string, Pair> = Object.fromEntries(Object.entries(OUT.pairs || {}).filter(([, p]: [string, any]) => p && Array.isArray(p.attrs) && Array.isArray(p.skills)).map(([id, p]: [string, any]) => [id, { attrs: [...p.attrs], skills: [...p.skills] }]));
export const profileOf = (id: string | null | undefined): Profile => PROFILES[id || ''] || FLAT;
const FLAT: Profile = { k: 1, attr: 0, skill: 0, level: null };
export const pairOf = (id: string | null | undefined): Pair => PAIRS[id || ''] || PAIRS[profileOf(id).pair || ''] || { attrs: [], skills: [] };

/** The Stat term of a profile for these Attribute and Skill values: 1 + Σ attr × (Attribute − 1) + Σ skill × Skill.
 * (Summed in this order, as every derived multiplier always was: the result is the same number to the last place.) */
export function statTerm(profile: string | Profile, attrs: number[], skills: number[]): number {
  const p = typeof profile === 'string' ? profileOf(profile) : profile;
  const s = 1 + attrs.reduce((t, a) => t + p.attr * (a - 1), 0) + skills.reduce((t, k) => t + p.skill * k, 0);
  return p.k === 1 ? s : s * p.k;
}
/** The Stat term of a profile for a character, read from its sheet with the profile's pair (or the pair given). No
 * perks, traits or gear: a caller that lets items speak wraps it (character.ts fx). */
export function statOf(profile: string, c: Pick<Character, 'attrs' | 'skills'>, pair: Pair = pairOf(profile)): number {
  return statTerm(profile, pair.attrs.map((a) => (c.attrs as any)[a] || 1), pair.skills.map((k) => (c.skills as any)[k] || 0));
}

const LEVEL_DEAL: number[] = Array.isArray(OUT.level?.deal) ? OUT.level.deal.map((x: any) => (Number.isFinite(x) ? Number(x) : 1)) : [];
/** The Level term (data/rules.json output.level). `mend`: the enemy table's damage column at that level (rules 1.20:
 * the number that raises what an enemy deals; ×1.00 at level 1 … ×1.82 at 20). `deal`: ×1 at every level today.
 * No column, or no level: ×1. */
export function levelFactor(column: 'deal' | 'mend' | null | undefined, level: number | null | undefined): number {
  if (!column || level == null) return 1;
  if (column === 'mend') return enemyLevelRow(level).damage_mult ?? 1;
  return LEVEL_DEAL[clampEnemyLevel(level) - 1] ?? 1;
}
/** The Level term of a profile for a level. */
export const levelOf = (profile: string | null | undefined, level: number | null | undefined): number => levelFactor(profileOf(profile).level, level);

// ---------------------------------------------------------------------------------------------- the stacking rule
/** Target-specific damage bonuses stack additively and are capped at ×2.0 in all (plan 6a-1, provisional): True Name,
 * Judgement Day, Case Closed, Weak Point, Deliver the Sinner, Holy Ordnance, Moon Hunter, Humanity First, Ork Steel
 * each push {v: 0.15, label} (the bonus as a fraction) into ctx.vs on 'damage_out'. Situational self-multipliers
 * (Pain Eater, Brightest Light, the Ambush multiplier, Weakened) stay multiplicative in ctx.mults. */
export const VS_CAP = 1.0;
/** The one stacking rule: own multipliers multiply; target bonuses add, are held between −90% and +100%, and multiply once. */
export function stackDamage(mults: Term[], vs: Term[]): { mult: number; vsMult: number; total: number } {
  const mult = mults.reduce((t, m) => t * m.v, 1), vsMult = 1 + Math.min(VS_CAP, Math.max(-0.9, vs.reduce((t, x) => t + x.v, 0)));
  return { mult, vsMult, total: mult * vsMult };
}

// ---------------------------------------------------------------------------------------------- the amount
export type AmountKind = 'damage' | 'heal' | 'shield';
/** How a source meets armour: in full, at half (rounded down), or not at all. */
export type ArmourKind = 'full' | 'half' | 'none';
export interface AmountSpec {
  kind: AmountKind;
  /** The source's own number, before anything. */ base: number;
  /** Per-point parts that add to the base: { of: 'devotion', value: 4 } with ctx.counts.devotion. */ per?: { of: string; value: number }[];
  /** data/rules.json output.profiles (absent: no Stat and no Level term: the caller's number is already whole). */ profile?: string;
  /** The pair the Stat term reads, when it is not the profile's own (a weapon's `phys`). */ pair?: Pair;
  /** How the amount is made whole: 'floor' (default), 'round' (a Sigil Line rounds each of its parts), 'none'
   * (the caller goes on with the raw number: an Outburst adds its critical and its tone's riders before harm floors it). */
  round?: 'floor' | 'round' | 'none';
  /** Marked for spec section 14. */ provisional?: boolean;
}
export interface AmountCtx {
  /** The dealer's sheet (a character); null for an enemy or a thing. */ who?: Pick<Character, 'attrs' | 'skills'> | null;
  /** The Stat term outright, when the caller owns it (a weapon's multiplier with perks and gear in it; an enemy's tier and level). */ stat?: Term | null;
  /** The dealer's level for the Level term (default: the unit's). */ level?: number | null;
  /** What the per-point parts count. */ counts?: Record<string, number>;
  flat?: number; mults?: Term[]; vs?: Term[];
}
/** An amount being built: the Stat and Level terms are already in `mults` (first), a hook may add to add, mults and vs. */
export interface Amount { spec: AmountSpec; base: number; add: number; mults: Term[]; vs: Term[] }
const push = (list: Term[], v: number, label: string) => { if (v !== 1) list.push({ v, label }); };
/** A named multiplier for an amount's `mults` (a term of exactly ×1 is dropped when the amount is opened). */
export const term = (v: number, label: string): Term => ({ v, label });
/** Open an amount: the base with its per-point parts, then the Stat term and the Level term as the first multipliers
 * (a term of exactly ×1 is not listed, as everywhere). The caller adds its own multipliers and closes it. */
export function openAmount(spec: AmountSpec, by: Unit | null, ctx: AmountCtx = {}): Amount {
  const base = (spec.per || []).reduce((t, p) => t + p.value * (ctx.counts?.[p.of] || 0), spec.base);
  const mults: Term[] = [];
  if (ctx.stat) push(mults, ctx.stat.v, ctx.stat.label);
  else if (spec.profile && ctx.who) push(mults, statOf(spec.profile, ctx.who, spec.pair), spec.profile);
  if (spec.profile) push(mults, levelOf(spec.profile, ctx.level !== undefined ? ctx.level : by?.level), 'level');
  for (const m of ctx.mults || []) push(mults, m.v, m.label);
  return { spec, base, add: ctx.flat || 0, mults, vs: [...(ctx.vs || [])] };
}
/** Close an amount: the base (with what items added; never under 0) times each multiplier in turn, then the bonus
 * against this target (the stacking rule). One order for every source (step a7). `raw` is the number before it is made whole. */
export function closeAmount(a: Amount): { raw: number; amount: number; mult: number; vsMult: number; total: number } {
  const st = stackDamage(a.mults, a.vs);
  const raw = a.mults.reduce((t, m) => t * m.v, Math.max(0, a.base + a.add)) * st.vsMult;
  return { raw, amount: a.spec.round === 'round' ? Math.round(raw) : a.spec.round === 'none' ? raw : Math.floor(raw), ...st };
}
/** The amount of a source in one call (no hook in between): what it produces before armour or the receiver's
 * multipliers, with every term named. */
export function amountOf(spec: AmountSpec, by: Unit | null, ctx: AmountCtx = {}): { amount: number; raw: number; terms: Term[]; vs: Term[] } {
  const a = openAmount(spec, by, ctx), c = closeAmount(a);
  return { amount: c.amount, raw: c.raw, terms: a.mults, vs: a.vs };
}

// ---------------------------------------------------------------------------------------------- armour
/** The armour a hit meets on this target: THE ONLY PLACE ARMOUR IS READ FOR DAMAGE.
 *   kind     'full' (a weapon, Sigil and physical damage, a blast, a trap, a hazard that says so), 'half' (Elemental:
 *            half, rounded down), 'none' (Soul, true damage, a hazard that ignores it)
 *   mult     the ammunition's armour multiplier (hollow-point: ×2), before the pierce
 *   pierce   armour this hit ignores (a weapon's property, a technique)
 *   ignore   it ignores all of it
 * Never under 0, for every source (step a7, spec item 1422: armour taken below 0, or pierced past it, adds no damage). */
export function armourAgainst(target: Unit, kind: ArmourKind = 'full', o: { mult?: number; pierce?: number; ignore?: boolean } = {}): number {
  if (o.ignore || kind === 'none') return 0;
  if (kind === 'half') return Math.max(0, Math.floor(target.armour / 2));
  return Math.max(0, o.mult != null || o.pierce != null ? target.armour * (o.mult ?? 1) - (o.pierce ?? 0) : target.armour);
}
/** What lands of an amount after armour: never under 1 (armour does not stop a hit outright). */
export const landed = (amount: number, armour: number): number => Math.max(1, Math.floor(amount) - armour);

// ---------------------------------------------------------------------------------------------- the one way in
export interface DealSpec extends AmountSpec {
  kind: 'damage';
  /** How it meets armour (default: by the source's type: 'sigil' and 'physical' full, 'elemental' half, the rest none). */ armour?: ArmourKind;
  /** The 'damage_out' hook fires (items add flat damage, own multipliers and target bonuses) when there is a dealer.
   * Off for what is not anybody's action: a blast's splash, a trap, a hazard, a tick. */ hook?: boolean;
}
export interface DealCtx extends AmountCtx {
  /** What the sink is told: the source (type, damage type, shield, credit and the rest of DamageSrc). `by` is filled in. */ src: DamageSrc & Record<string, any>;
  /** What the 'damage_out' hook is told besides the amount (mode: 'spell', spell: true…). */ hookCtx?: Record<string, any>;
  /** Armour this hit ignores, or all of it. */ pierce?: number; ignoreArmour?: boolean; armourMult?: number;
}
export interface DealResult extends DamageResult { /** before armour, after the hook */ produced: number; /** the armour it met */ armour: number; /** after armour: what went to the sink */ sent: number }
const ARMOUR_OF_TYPE: Record<string, ArmourKind> = { sigil: 'full', physical: 'full', elemental: 'half' };
/** Deal damage: the amount (amountOf, with the 'damage_out' hook between its two halves when spec.hook), the armour
 * (armourAgainst), the sink (applyDamage). Every HP loss that is not a weapon attack's own roll goes through here;
 * attackDamage shares its three steps. */
export function deal(cb: Combat | null, by: Unit | null, target: Unit, spec: DealSpec, ctx: DealCtx): DealResult {
  const a = openAmount(spec, by, ctx);
  let pierce = ctx.pierce, ignore = !!ctx.ignoreArmour;
  if (spec.hook && by && cb) {
    const h: any = { att: by, tgt: target, melee: false, src: ctx.src, base: a.base, add: a.add, mults: a.mults, vs: a.vs, crit: false, preview: false, cb, mods: cb.mods || [], spec, ...(ctx.hookCtx || {}) };
    emit(cb, 'damage_out', h);
    a.add = h.add; a.mults = h.mults; a.vs = h.vs;
  }
  const c = closeAmount(a), armour = armourAgainst(target, spec.armour || ARMOUR_OF_TYPE[ctx.src.type] || 'none', { ...(ctx.armourMult != null ? { mult: ctx.armourMult } : {}), ...(pierce != null ? { pierce } : {}), ignore });
  const sent = landed(c.amount, armour);
  const r = applyDamage(cb, target, sent, { ...ctx.src, by: by || null });
  return { ...r, produced: c.amount, armour, sent };
}
/** Give healing or a shield: the amount (amountOf), then the heal sink or the shield sink (which apply the receiver's
 * multiplier and their hooks). Returns what the sink returned. */
export function mend(cb: Combat | null, by: Unit | null, target: Unit, spec: AmountSpec & { kind: 'heal' | 'shield' }, ctx: AmountCtx & { /** the heal's kind for 'heal_in' (stim, sigil, soul, prayer…) */ healKind?: string; /** a shield that adds to the one standing */ stack?: boolean } = {}): { amount: number; restored: number; revived: boolean; shield: number } {
  const { raw } = amountOf(spec, by, ctx);
  if (spec.kind === 'shield') { const v = grantShield(cb, target, raw, by, !!ctx.stack); return { amount: raw, restored: 0, revived: false, shield: v }; }
  const r = healUnit(cb, target, raw, by, ctx.healKind || 'heal');
  return { amount: raw, restored: r.restored, revived: r.revived, shield: 0 };
}
