// The data pack, loaded as-is (data/*.json is the source of truth after the spec).
import './datatext'; // fills the texts' {=placeholders} before any data is read
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
import sigilsJ from '../../../data/sigils.json';
import soulJ from '../../../data/soul_modules.json';

export type CoreId = 'body' | 'mind' | 'soul';
export const CORES: CoreId[] = ['body', 'mind', 'soul'];

export interface SkillDef { id: string; name: string; attribute: string; core: CoreId; slot: string; summary: string; overreach?: any; voice: any }
export interface AttrDef { id: string; name: string; core: CoreId }
export interface WeaponDef { id: string; name: string; category: string; damage: any; range_tiles: any; magazine: number | null; heat_limit: number | null; modes: string[]; ap_cost: Record<string, number>; skill: string; accuracy: number; mastery_family: string; properties: string[]; ammo?: string | null; weight_kg?: number; reload?: 'magazine' | 'loose'; magazine_kg?: number; reload_unit?: string; reload_ap?: number | null; damage_type?: string; explosive?: boolean; tags?: string[] }
/** A base class (Class Roster Revision 3: one per attribute). ranks[r].moves are resolved: every move carries `key`, the
 * item key its handler runs under ("class:<origin>.<moveId>"), so a move reused from the pool keeps its old key. */
export interface ClassDef { id: string; name: string; attribute: string; core: CoreId; role: string; skills: string[]; ranks: any; resource: any; resources: string[]; tagline?: string }
export interface PerkDef { id: string; name: string; tier: 'acquired' | 'mastered' | 'achieved' | 'ultimate'; skills: string[]; requires: any[]; text: string; tiers?: any; deed?: string; flavour?: string }
export interface TraitDef { id: string; name: string; effects: any[]; excludes: string[] }
/** A tier's row holds its LEVEL 1 numbers (rules 1.15); enemyStats() raises them by the level table. `damage` is the
 * factor on what its weapon or spell deals. A tier missing from a table that ranks tiers (saves, notice) reads as a Minion. */
export interface EnemyTier { id: string; name: string; hp: number; defense: number; attack_bonus: number; armour: number; damage?: number; movement: number; ap: number; kills: number; endurance?: number; spare_mags?: number; /** Physical 2.0 (rules 1.12): the techniques this tier has ready, beside what its weapon lends. */ techniques?: { melee?: string[]; ranged?: string[] }; /** Calls (rules 1.13): the Calls this tier makes, and the level that stands in for skill points. */ calls?: string[]; call_level?: number }

export const SKILLS: SkillDef[] = (skillsJ as any).items;
export const ATTRS: AttrDef[] = (attributesJ as any).items.map((a: any) => ({ id: a.id, name: a.name, core: a.core }));
export const RULES: any = rulesJ;
export const WEAPONS: WeaponDef[] = (weaponsJ as any).items;
/** The move pool (Revision 2 base moves under their old class ids) and the advanced classes' moves, by "<origin>.<moveId>". */
export const CLASS_MOVE_POOL: Record<string, any> = Object.fromEntries([
  ...(((classesJ as any).move_pool?.moves || []) as any[]).map((m) => [m.origin + '.' + m.id, m]),
  ...(((classesJ as any).advanced || []) as any[]).flatMap((a) => (a.moves || []).map((m: any) => [a.id + '.' + m.id, { origin: a.id, ...m }])),
]);
/** One rank entry resolved: a {ref} to its pool or advanced move (keeping the old key), or a new move under its class. */
export function resolveClassMove(clsId: string, m: any): any {
  if (m && m.ref) { const x = CLASS_MOVE_POOL[m.ref]; if (!x) throw new Error('classes.json: ' + clsId + ' names an unknown move ' + m.ref); return { ...x, key: 'class:' + m.ref, ref: m.ref }; }
  return { ...m, origin: m.origin || clsId, key: 'class:' + (m.origin || clsId) + '.' + m.id };
}
export const CLASSES: ClassDef[] = ((classesJ as any).base as any[]).map((b) => ({
  ...b, ranks: Object.fromEntries(Object.entries(b.ranks || {}).map(([r, v]: [string, any]) => [r, { ...v, moves: (v.moves || []).map((m: any) => resolveClassMove(b.id, m)) }])),
  ...(b.gain ? { gain: (b.gain as any[]).map((m: any) => resolveClassMove(b.id, m)) } : {}), // held from class gain (rules 1.30)
}));
/** Revision 2 class ids and the Revision 3 class an old save's class becomes (medic → bard …). */
export const CLASS_MIGRATION: Record<string, string> = (classesJ as any).migration?.class_ids || {};
export const CLASS_RULES: any = (classesJ as any).assignment;
export const PERKS: PerkDef[] = (perksJ as any).items;
export const TRAITS: TraitDef[] = (traitsJ as any).items;
export const ENEMIES: EnemyTier[] = (enemiesJ as any).items;
/** Rules 1.37: how the enemy AI reads the new systems (enemies.json `ai`): behaviour only. */
export const ENEMY_AI: { figments_last: string[]; shelter: Record<string, number>; held_risk: number; skulk_open: number; healer_tie: string | null; boss_hidden_rounds: number } = { figments_last: [], shelter: {}, held_risk: 0, skulk_open: 0, healer_tie: null, boss_hidden_rounds: Infinity, ...((enemiesJ as any).ai || {}) };
export const ARCHETYPES: any[] = (archetypesJ as any).items;

export const SKILL: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const ATTR: Record<string, AttrDef> = Object.fromEntries(ATTRS.map((a) => [a.id, a]));
export const WEAPON: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export const CLASS: Record<string, ClassDef> = Object.fromEntries(CLASSES.map((c) => [c.id, c]));
export const PERK: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]));
export const ENEMY: Record<string, EnemyTier> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
// ---------- enemy levels (rules 1.15, the balance pass step 1; enemies.json `levels`; every number provisional) ----------
export interface EnemyLevelRow { level: number; hp_mult: number; armour_mult: number; defense_plus: number; attack_plus: number; damage_mult: number }
export const ENEMY_LEVELS: { min: number; max: number; narrator_shift: { min: number; max: number }; gap: { one_hit_levels_below: number; to_hit_per_level: number; max_levels: number }; table: EnemyLevelRow[] } = (enemiesJ as any).levels;
/** A level held to the table's range (1 to 20), whole. Anything that is not a number is level 1. */
export const clampEnemyLevel = (n: unknown): number => { const v = Math.floor(Number(n)); return Number.isFinite(v) ? Math.max(ENEMY_LEVELS.min, Math.min(ENEMY_LEVELS.max, v)) : ENEMY_LEVELS.min; };
/** A level someone gave (the Narrator's fight, a campaign file, the spawn tool): a number, or a string that is one, held
 * to 1 to 20. Anything else (nothing, an empty string, a word, true, a list) is null: no level was given. */
export const levelGiven = (n: unknown): number | null => (typeof n === 'number' ? Number.isFinite(n) : typeof n === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(n)) ? clampEnemyLevel(n) : null;
export const enemyLevelRow = (level: unknown): EnemyLevelRow => { const l = clampEnemyLevel(level); return ENEMY_LEVELS.table.find((r) => r.level === l) || ENEMY_LEVELS.table[0]; };
/** A level's row applied to a level 1 stat block (a tier, or a companion's own block). */
export function levelled(base: { hp: number; defense: number; attack_bonus: number; armour: number; damage?: number }, level: unknown) {
  const r = enemyLevelRow(level);
  return { level: r.level, hp: Math.max(1, Math.round(base.hp * r.hp_mult)), armour: Math.round(base.armour * r.armour_mult), defense: base.defense + r.defense_plus, attack_bonus: base.attack_bonus + r.attack_plus, damage: Math.round((base.damage ?? 1) * r.damage_mult * 1000) / 1000 };
}
/** An enemy's numbers: its tier at this level. An unknown tier reads as a Minion. */
export const enemyStats = (tierId: string, level: unknown) => levelled(ENEMY[tierId] || ENEMY.minion, level);
/** The fight's level from the characters in it: their average level, rounded down (rules 1.15). */
export const fightLevelOf = (levels: number[]): number => clampEnemyLevel(levels.length ? Math.floor(levels.reduce((t, n) => t + (Number(n) || 1), 0) / levels.length) : 1);
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
export const CALIBRE_NAME: Record<string, string> = Object.fromEntries((findKey(RULES, 'calibres')?.calibres || []).map((c: any) => [c.id, c.name]));
export const ROUND_KG: Record<string, number> = Object.fromEntries((findKey(RULES, 'calibres')?.calibres || []).map((c: any) => [c.id, c.round_kg]));
export const ARMOUR_KG: number[] = (findKey(RULES, 'armor')?.armor?.classes || []).map((c: any) => c.weight_kg || 0);
/** The body armour classes (rules.json combat armor.classes): class, name, value, penalty, weight, price. */
export const ARMOUR_CLASSES: { class: number; name: string; value: number; weight_kg: number; price_credits: number }[] = findKey(RULES, 'armor')?.armor?.classes || [];

// ---------- magic (spec: Mana, rules 1.2) ----------
export interface SigilDef { id: string; word: string; class: 'subject_element' | 'subject_effect' | 'form' | 'motion' | 'modifier'; charge: number; text: string; damage?: number; damage_type?: string; grand?: string; [k: string]: any }
export interface SchoolDef { id: string; name: string; base_cost: number; text: string; damage?: number; options?: string[]; save?: string }
export interface ModuleDef { id: string; name: string; family?: string; cost: number; text: string; range_tiles?: number; form?: boolean; area?: { shape: 'cone' | 'radius' | 'line' | 'single'; length?: number; radius?: number; at?: string; from?: string }; damage_mult?: number }
/** A tone rider (soul_modules.json tones[].stages[n].riders): what an element does to a creature it hits, by stage. */
export interface ToneRider { rider: 'cond' | 'spread' | 'ground' | 'ground_around' | 'ignore_cover' | 'chain' | 'armour_full' | 'bonus_damage' | 'push' | 'push_around'; condition?: string; rounds?: number; save?: boolean; deep?: boolean; radius?: number; object?: string; n?: number; range?: number; mult?: number; value?: number; tiles?: number }
export interface ToneDef { id: string; name: string; element: string | null; cost: number; damage_type: string; armour: 'none' | 'half'; text: string; stages: Record<string, { text: string; riders: ToneRider[] }>; aura_look?: string }
export const SIGILS: SigilDef[] = (sigilsJ as any).items;
export const SIGIL: Record<string, SigilDef> = Object.fromEntries(SIGILS.map((w) => [w.id, w]));
export const SCHOOLS: SchoolDef[] = (soulJ as any).schools;
export const SCHOOL: Record<string, SchoolDef> = Object.fromEntries(SCHOOLS.map((x) => [x.id, x]));
export const MODULES: ModuleDef[] = (soulJ as any).items;
export const MODULE: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((x) => [x.id, x]));
/** Rules 1.5 (Outburst 2.0): tones (raw + six elements), the retired 1.2 modules and what they became, the cycle's numbers. */
export const TONES: ToneDef[] = (soulJ as any).tones || [];
export const TONE: Record<string, ToneDef> = Object.fromEntries(TONES.map((x) => [x.id, x]));
export const RETIRED_MODULE: Record<string, { id: string; becomes: string | null; why: string }> = Object.fromEntries(((soulJ as any).retired || []).map((x: any) => [x.id, x]));
export const SOUL_RULES: any = soulJ;
export const SOUL_REV = 18;
export const MANA_BANDS: { id: string; min: number; max: number; soul_cost_mult: number; syphon_mp: number; healing_given_mult: number; strain_per_cast_extra: number }[] = RULES.mana.meter.bands;

