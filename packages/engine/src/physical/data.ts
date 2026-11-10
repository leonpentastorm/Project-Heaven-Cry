// Physical 2.0 (rules 1.12): the technique data, weapon properties, and what a character knows, readies and drills.
import techniquesJ from '../../../../data/techniques.json';
import { WEAPON, type WeaponDef } from '../data';
import type { Character } from '../character';
import { mod } from '../character';
import type { TechDef, TechSystem, TechGroup } from './types';

export const PHYS_RULES: any = (techniquesJ as any).rules;
export const TECHNIQUES: TechDef[] = (techniquesJ as any).items;
export const TECHNIQUE: Record<string, TechDef> = Object.fromEntries(TECHNIQUES.map((t) => [t.id, t]));
/** The revision a character's techniques were set up under (the migration runs once). */
export const PHYS_REV = 1;

// ---------- weapons ----------
export interface WeaponPhys { system: TechSystem; props: string[]; hits_with: string; scales_with: string[]; also_scales?: string[]; teaches?: string }
const NO_PHYS: WeaponPhys = { system: 'melee', props: [], hits_with: 'raw_power', scales_with: ['strength'] };
export const weaponPhys = (weaponId: string | null | undefined): WeaponPhys => ((WEAPON[weaponId || ''] as any)?.phys as WeaponPhys) || NO_PHYS;
export const weaponProps = (weaponId: string | null | undefined): string[] => weaponPhys(weaponId).props;
export const weaponSystem = (weaponId: string | null | undefined): TechSystem => weaponPhys(weaponId).system;
export const hitsWith = (weaponId: string | null | undefined): string => weaponPhys(weaponId).hits_with;
export const scalesWith = (weaponId: string | null | undefined): string[] => weaponPhys(weaponId).scales_with;
/** The technique a weapon lends while held and teaches at drill mark I (null: none). */
export const weaponTeaches = (weaponId: string | null | undefined): string | null => weaponPhys(weaponId).teaches || null;
/** A property's name and one-line meaning, for a "?" (rules.props). */
export const propText = (prop: string): string => PHYS_RULES.props?.[prop] || '';
export const groupsOf = (system: TechSystem): TechGroup[] => PHYS_RULES.groups[system];
export const groupName = (g: TechGroup): string => PHYS_RULES.group_names[g] || g;

// ---------- the character ----------
export interface CharPhys {
  known: string[]; ready: { melee: string[]; ranged: string[] };
  /** drill XP per weapon type */ drill: Record<string, number>;
  /** picks already taken per weapon (marks II and III, and mark I for a weapon with no signature) */ picked: Record<string, number>;
  /** a bow's quiver: arrows loaded per type */ quiver: Record<string, Record<string, number>>;
  /** the Answers this character will use, in priority order (absent: every ready Answer) */ answers?: string[];
  rev: number;
}
const skillOf = (c: Pick<Character, 'skills'> | null | undefined, id: string) => (c?.skills as any)?.[id] || 0;
/** What a build starts with (PLAN reading 6): Lunge and Sidestep with a melee attack skill (Raw Power, or Dexterity for
 * light blades); Suppress and Shift with Dexterity. */
export function defaultTechniques(c: Pick<Character, 'skills'>): { melee: string[]; ranged: string[] } {
  const st = PHYS_RULES.starting;
  return { melee: skillOf(c, 'raw_power') || skillOf(c, 'dexterity') ? [...st.default_melee] : [], ranged: skillOf(c, 'dexterity') ? [...st.default_ranged] : [] };
}
/** How many starting picks a sheet gets in each system (0 without the skill). */
export function startingTechniqueSlots(c: Pick<Character, 'skills'>): { melee: number; ranged: number } {
  const st = PHYS_RULES.starting;
  return { melee: skillOf(c, 'raw_power') || skillOf(c, 'dexterity') ? st.melee : 0, ranged: skillOf(c, 'dexterity') ? st.ranged : 0 };
}
/** What the Kit step may offer: every technique of that system that isn't free and isn't a reaction-only rarity. */
export const startingTechniqueChoices = (system: TechSystem): string[] => TECHNIQUES.filter((t) => t.system === system && !t.free).map((t) => t.id);
/** Creation's check on a sheet's picks (Sheet.techniques): the right number, known ids, one melee Opener. */
export function startingTechniquesError(s: { skills: Record<string, number>; techniques?: { melee?: string[]; ranged?: string[] } }): string | null {
  const pick = s.techniques; if (!pick) return null; // none sent: the defaults
  const slots = startingTechniqueSlots(s as any);
  for (const sys of ['melee', 'ranged'] as TechSystem[]) {
    const ids = pick[sys] || [];
    if (new Set(ids).size !== ids.length) return 'Pick two different techniques.';
    if (ids.some((id) => TECHNIQUE[id]?.system !== sys || TECHNIQUE[id]?.free)) return 'That technique can\'t be picked here.';
    if (ids.length !== slots[sys]) return slots[sys] ? 'Pick ' + slots[sys] + ' ' + sys + ' techniques.' : 'This build has no ' + sys + ' skill to pick ' + sys + ' techniques with.';
  }
  if (slots.melee && !(pick.melee || []).some((id) => TECHNIQUE[id].group === 'opener')) return 'One of the melee techniques must be an Opener.';
  return null;
}
/** A character's technique state. A character from before rules 1.12 (no c.phys) reads as its defaults; nothing is
 * written here (the migration in game.ts writes it once). */
export function physOf(c: Character | null | undefined): CharPhys {
  const p = (c as any)?.phys as CharPhys | undefined;
  if (p && Array.isArray(p.known)) return { known: p.known, ready: { melee: p.ready?.melee || [], ranged: p.ready?.ranged || [] }, drill: p.drill || {}, picked: p.picked || {}, quiver: p.quiver || {}, answers: p.answers, rev: p.rev || 0 };
  const d = c ? ((c as any).techniques as { melee?: string[]; ranged?: string[] } | undefined) || defaultTechniques(c) : { melee: [], ranged: [] };
  const known = [...(d.melee || []), ...(d.ranged || [])];
  return { known, ready: { melee: [...(d.melee || [])], ranged: [...(d.ranged || [])] }, drill: {}, picked: {}, quiver: {}, rev: 0 };
}
/** Write the state onto the character if it isn't there yet (once), and return it. */
export function ensurePhys(c: Character): CharPhys {
  const cur = (c as any).phys as CharPhys | undefined;
  if (cur && Array.isArray(cur.known) && cur.rev >= PHYS_REV) return cur;
  const p = physOf(c); p.rev = PHYS_REV; (c as any).phys = p; delete (c as any).techniques; return p;
}
export const knownTechniques = (c: Character | null | undefined): string[] => [...TECHNIQUES.filter((t) => t.free).map((t) => t.id), ...physOf(c).known.filter((id) => TECHNIQUE[id] && !TECHNIQUE[id].free)];
/** Ready slots in a system: 3 + half the attack skill (melee: the better of Raw Power and Dexterity; ranged: Dexterity). */
export function readyCap(c: Character | null | undefined, system: TechSystem): number {
  if ((c as any)?.phys?.uncapped) return 99; // the Proving Ground's "ready everything"
  const sk = system === 'melee' ? Math.max(skillOf(c, 'raw_power'), skillOf(c, 'dexterity')) : skillOf(c, 'dexterity'); // the alphas that hit with melee weapons (item 953)
  return PHYS_RULES.ready.base + Math.floor(sk * PHYS_RULES.ready.per_skill);
}
/** The techniques a character has ready in a system: its ready list cut to the cap, or (none chosen) the first known. */
export function readyTechniques(c: Character | null | undefined, system: TechSystem): string[] {
  const p = physOf(c), cap = readyCap(c, system), known = new Set(p.known);
  const list = (p.ready[system] || []).filter((id) => known.has(id) && TECHNIQUE[id]?.system === system && !TECHNIQUE[id].free);
  return (list.length ? list : p.known.filter((id) => TECHNIQUE[id]?.system === system && !TECHNIQUE[id].free)).slice(0, cap);
}
export function readyError(c: Character, system: TechSystem, ids: string[]): string | null {
  const p = physOf(c);
  if (new Set(ids).size !== ids.length) return 'A technique can only be readied once.';
  if (ids.some((id) => !p.known.includes(id) || TECHNIQUE[id]?.system !== system)) return 'You don\'t know that technique.';
  if (ids.length > readyCap(c, system)) return 'You can ready ' + readyCap(c, system) + ' ' + system + ' techniques.';
  return null;
}

// ---------- drill ----------
export const drillOf = (c: Character | null | undefined, weaponId: string): number => physOf(c).drill[weaponId] || 0;
/** Marks reached on a weapon's bar: 0 to 3. */
export const drillMark = (c: Character | null | undefined, weaponId: string): number => (PHYS_RULES.drill.marks as number[]).filter((m) => drillOf(c, weaponId) >= m).length;
/** The bar's three marks and what each gives: the weapon's signature at mark I (a pick if it has none), a pick at II and III. */
export function drillMarks(c: Character | null | undefined, weaponId: string): { at: number; reached: boolean; gives: 'signature' | 'pick'; id?: string }[] {
  const sig = weaponTeaches(weaponId), d = drillOf(c, weaponId);
  return (PHYS_RULES.drill.marks as number[]).map((at, i) => ({ at, reached: d >= at, ...(i === 0 && sig ? { gives: 'signature' as const, id: sig } : { gives: 'pick' as const }) }));
}
/** Picks a weapon's marks have given and the player hasn't taken yet. */
export function picksOwed(c: Character | null | undefined, weaponId: string): number {
  const earned = drillMarks(c, weaponId).filter((m) => m.reached && m.gives === 'pick').length;
  return Math.max(0, earned - (physOf(c).picked[weaponId] || 0));
}
/** What a pick from this weapon's bar may be: any technique of the weapon's system the character doesn't know. */
export function pickable(c: Character | null | undefined, weaponId: string): string[] {
  const sys = weaponSystem(weaponId), known = new Set(physOf(c).known);
  return TECHNIQUES.filter((t) => t.system === sys && !t.free && !known.has(t.id)).map((t) => t.id);
}
/** Drill multiplier by class (the Body classes learn weapons faster). */
export const drillMult = (c: Character | null | undefined): number => ((PHYS_RULES.drill.martial_classes as string[]).includes((c as any)?.classId || '') ? PHYS_RULES.drill.martial_mult : 1);
/** Add drill to a weapon's bar; a mark reached teaches the signature. Returns what happened, for the log and fx. */
export function addDrill(c: Character, weaponId: string, amount: number): { add: number; total: number; mark: number; learned: string | null } {
  const p = ensurePhys(c), before = drillMark(c, weaponId);
  p.drill[weaponId] = Math.max(0, (p.drill[weaponId] || 0) + Math.round(amount));
  const after = drillMark(c, weaponId), sig = weaponTeaches(weaponId);
  let learned: string | null = null;
  if (after >= 1 && sig && !p.known.includes(sig)) { p.known.push(sig); learned = sig; if (TECHNIQUE[sig] && (p.ready[TECHNIQUE[sig].system] || []).length < readyCap(c, TECHNIQUE[sig].system)) p.ready[TECHNIQUE[sig].system].push(sig); }
  return { add: Math.round(amount), total: p.drill[weaponId], mark: after > before ? after : 0, learned };
}
export function takePick(c: Character, weaponId: string, id: string): string | null {
  if (picksOwed(c, weaponId) < 1) return 'No pick is waiting on that weapon.';
  if (!pickable(c, weaponId).includes(id)) return 'That technique can\'t be picked for this weapon.';
  const p = ensurePhys(c); p.known.push(id); p.picked[weaponId] = (p.picked[weaponId] || 0) + 1; return null;
}
/** A unit skill's modifier for a save or a contest: the character's, else the stat block's attack bonus. */
export const charSkillMod = (c: Character | null | undefined, skill: string): number => mod(skillOf(c, skill));
export type { WeaponDef };
