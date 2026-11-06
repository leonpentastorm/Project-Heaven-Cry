// The data pack, loaded as-is (data/*.json is the source of truth after the spec).
import skillsJ from '../../../data/skills.json';
import attributesJ from '../../../data/attributes.json';
import rulesJ from '../../../data/rules.json';
import weaponsJ from '../../../data/weapons.json';
import classesJ from '../../../data/classes.json';
import perksJ from '../../../data/perks.json';
import traitsJ from '../../../data/traits.json';
import enemiesJ from '../../../data/enemies.json';
import archetypesJ from '../../../data/archetypes.json';
import itemsJ from '../../../data/items.json';

export type CoreId = 'body' | 'mind' | 'soul';
export const CORES: CoreId[] = ['body', 'mind', 'soul'];

export interface SkillDef { id: string; name: string; attribute: string; core: CoreId; slot: string; summary: string; overreach?: any; voice: any }
export interface AttrDef { id: string; name: string; core: CoreId }
export interface WeaponDef { id: string; name: string; category: string; damage: any; range_tiles: any; magazine: number | null; heat_limit: number | null; modes: string[]; ap_cost: Record<string, number>; skill: string; accuracy: number; mastery_family: string; properties: string[]; ammo?: string | null; weight_kg?: number; reload?: 'magazine' | 'loose'; magazine_kg?: number; reload_unit?: string }
export interface ClassDef { id: string; name: string; core: CoreId; role: string; signature: string[]; ranks: any; resource: any }
export interface PerkDef { id: string; name: string; tier: 'acquired' | 'mastered' | 'achieved' | 'ultimate'; skills: string[]; requires: any[]; text: string; tiers?: any; deed?: string; flavour?: string }
export interface TraitDef { id: string; name: string; effects: any[]; excludes: string[] }
export interface EnemyTier { id: string; name: string; hp: number; defense: number; attack_bonus: number; armour: number; movement: number; ap: number; kills: number }

export const SKILLS: SkillDef[] = (skillsJ as any).items;
export const ATTRS: AttrDef[] = (attributesJ as any).items.map((a: any) => ({ id: a.id, name: a.name, core: a.core }));
export const RULES: any = rulesJ;
export const WEAPONS: WeaponDef[] = (weaponsJ as any).items;
export const CLASSES: ClassDef[] = (classesJ as any).base;
export const PERKS: PerkDef[] = (perksJ as any).items;
export const TRAITS: TraitDef[] = (traitsJ as any).items;
export const ENEMIES: EnemyTier[] = (enemiesJ as any).items;
export const ARCHETYPES: any[] = (archetypesJ as any).items;

export const SKILL: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const ATTR: Record<string, AttrDef> = Object.fromEntries(ATTRS.map((a) => [a.id, a]));
export const WEAPON: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export const CLASS: Record<string, ClassDef> = Object.fromEntries(CLASSES.map((c) => [c.id, c]));
export const PERK: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]));
export const ENEMY: Record<string, EnemyTier> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
export const XP_TOTAL: Record<string, number> = RULES.character.levels.xp_total;
export const TN_LADDER = [8, 12, 16, 20];

/** XP ranges per source (spec: XP sources). Combat is fixed per difficulty. */
export const XP_SOURCES: Record<string, [number, number]> = {
  combat: [25, 200], dialogue: [25, 100], discovery: [25, 75], quest: [50, 300], essence: [100, 100], bond: [50, 50],
};
export const COMBAT_XP: Record<string, number> = { easy: 25, standard: 50, hard: 100, boss: 200 };

// ---------- weights (spec: Item weights; provisional) ----------
export const ITEM: Record<string, { id: string; name: string; weight_kg: number; text?: string }> = Object.fromEntries((itemsJ as any).items.map((x: any) => [x.id, x]));
const findKey = (o: any, k: string): any => { if (!o || typeof o !== 'object') return null; if (k in o) return o; for (const v of Object.values(o)) { const r = findKey(v, k); if (r) return r; } return null; };
export const ROUND_KG: Record<string, number> = Object.fromEntries((findKey(RULES, 'calibres')?.calibres || []).map((c: any) => [c.id, c.round_kg]));
export const ARMOUR_KG: number[] = (findKey(RULES, 'armor')?.armor?.classes || []).map((c: any) => c.weight_kg || 0);
