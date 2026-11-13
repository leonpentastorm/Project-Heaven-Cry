// THE ENCOUNTER GENERATOR (rules 1.41; docs/design/survival-spec.md rules 15 to 22, section 5; Survival build step 3).
//
// A fight for THIS party at THIS node: a budget in Soldier-equivalents (SE) on two axes, bulk (how long the fight lasts)
// and pressure (how hard it hits), filled from a template's slots with foes priced by their tier, their lag behind the
// party (ordinary enemies) or their lead (Elites and Bosses from stage 2) and their spawn share (a big unit against a
// small party). Then a map: the open ground cropped to the fight's size (build step 7 brings the layout generator).
// Pure and deterministic: everything comes from the seed through a named stream (`rngFor(seed, node + '#fight')`), so
// the same seed, party and node give the same fight. It deals no damage and rolls no check: the fight itself is
// `startCombat` with these `FoeSpec`s, on the fight's own dice.
import '../datatext';
import svJ from '../../../../data/survival.json';
import { ENEMY, clampEnemyLevel, fightLevelOf, WEAPON } from '../data';
import { type FoeSpec, type MapDef, layoutMap, standable } from '../combat';
import { MAP_LAYOUTS, MAP_LIMITS, deployEnemy, nearestFree, startGap } from '../maplayout';
import { CASTER } from '../ai-sigil';
import { HEART_CASTER } from '../ai-soul';
import { rollTable } from '../loot';
import { type Rng, rngFor, die } from '../rng';

const SV: any = svJ;
/** Where a slot's foes start (spec section 3.2): the far edge, nearer, between, behind the line, the middle of the far
 * line, both flanks, or split top and bottom. */
export type Spawn = 'far' | 'near' | 'between' | 'back' | 'central' | 'flanks' | 'split';
/** One slot of a template: a tier (or a caster archetype, whose tier it takes, or the setting's Boss), how many are
 * required (`req`) or allowed (`max`), from which depth, its weapons' range, a fixed kind, tags, a hidden start. */
export interface EncounterSlot { tier?: string; caster?: string[]; boss?: boolean; range?: 'ranged' | 'melee' | 'close'; kind?: string; tags?: string[]; hidden?: boolean; req?: number; max?: number; from_depth?: number; spawn?: Spawn }
/** A template (spec section 3.2, `survival.json templates`). */
export interface EncounterTemplate { id: string; name: string; nodes: string[]; from_depth: number; weight: number; min_party?: number; kinds?: string[]; slots: EncounterSlot[]; text: string }
/** A setting, one tile of the world (spec section 3.3, `survival.json settings`). */
export interface SettingDef { id: string; name: string; kinds: Record<string, number>; boss: { name: string; kind: string; weapon: string; casters: string[]; portrait: string | null }; pool: string; pools?: Record<string, Record<string, string[]>> }
/** The kind of fight a node holds (the gate is an Elite node every path passes). */
export type FightKind = 'fight' | 'elite' | 'gate' | 'boss';

/** The encounter templates (`survival.json templates`). */
export const TEMPLATES: EncounterTemplate[] = SV.templates;
/** The settings, the world's tiles (`survival.json settings`). */
export const SETTINGS: SettingDef[] = SV.settings;
/** A setting by id. */
export const SETTING: Record<string, SettingDef> = Object.fromEntries(SETTINGS.map((s) => [s.id, s]));
/** The budget's numbers (`survival.json`; every one PROVISIONAL, rules 1.41). */
export const ENC_BUDGET = {
  rounds: SV.rounds as { fight: number; fight_early: number; early_depth: number; elite: number; gate: number; boss: number },
  bulkPerCharRound: SV.bulk_per_char_round as number, pressurePerChar: SV.pressure_per_char as number[],
  bulkBand: SV.bulk_band as number, pressureBand: SV.pressure_band as number, maxFoes: SV.max_foes as number[],
  tiers: SV.tiers as Record<string, { bulk: number; pressure: number }>, lagFactor: SV.lag_factor as number,
  share: SV.share as Record<'boss' | 'elite', { hp: number[]; damage: number[] }>,
  stage: SV.stage as { bulk: number; pressure: number; credits: number; xp: number[]; elite_up: { per: number; max: number } },
};

const at = <T>(list: T[], n: number): T => list[Math.max(0, Math.min(list.length - 1, n))];
/** A tier's lag behind the fight level (enemies.json `items[].lag`: the last row whose `from` the fight level reaches;
 * the level-scale spec's section 6, read first here). */
export function tierLag(tier: string, fightLevel: number): number {
  const rows: { from: number; lag: number }[] = (ENEMY[tier] as any)?.lag || [];
  let lag = 0; for (const r of rows) if (fightLevel >= r.from) lag = r.lag; return lag;
}
/** How many levels Elites and Bosses stand above the fight level in stage s (rule 19; 0 in stage 1). */
export const eliteUp = (stage: number): number => Math.min((Math.max(1, stage) - 1) * ENC_BUDGET.stage.elite_up.per, ENC_BUDGET.stage.elite_up.max);
const big = (tier: string) => tier === 'elite' || tier === 'boss';
/** A foe's level at this fight level and stage (rules 18 and 19): ordinary tiers lag, never under 1; Elites and Bosses
 * at the fight level plus the stage's lead, never over 20. */
export const foeLevel = (tier: string, fightLevel: number, stage: number): number =>
  clampEnemyLevel(big(tier) ? fightLevel + eliteUp(stage) : Math.max(1, fightLevel - tierLag(tier, fightLevel)));
/** The spawn share of a big unit for a party of N (rule 20): its HP and damage multipliers (1 for other tiers). */
export function shareOf(tier: string, n: number): { hp: number; damage: number } {
  const s = big(tier) ? ENC_BUDGET.share[tier as 'elite' | 'boss'] : null;
  return s ? { hp: at(s.hp, n - 1), damage: at(s.damage, n - 1) } : { hp: 1, damage: 1 };
}
/** What one foe costs in SE (rules 16, 18 to 20): its tier's bulk and pressure, x lag_factor for each level it stands
 * under the fight level (its inverse for each level above), x its spawn share (HP on bulk, damage on pressure). */
export function foeCost(tier: string, level: number, fightLevel: number, n: number): { bulk: number; pressure: number } {
  const t = ENC_BUDGET.tiers[tier] || ENC_BUDGET.tiers.minion, gap = fightLevel - level, f = Math.pow(ENC_BUDGET.lagFactor, gap), sh = shareOf(tier, n);
  return { bulk: t.bulk * f * sh.hp, pressure: t.pressure * f * sh.damage };
}
/** A fight's target rounds (rule 17). */
export function targetRounds(kind: FightKind, depth: number): number {
  const R = ENC_BUDGET.rounds; return kind === 'fight' ? (depth <= R.early_depth ? R.fight_early : R.fight) : R[kind];
}
/** The budget for a party of N at a node (rules 17 and 19): the bulk target and the pressure cap, in SE. */
export function budgetFor(n: number, kind: FightKind, depth: number, stage: number): { bulk: number; pressure: number; rounds: number } {
  const s = Math.max(1, stage) - 1, rounds = targetRounds(kind, depth);
  return { rounds, bulk: ENC_BUDGET.bulkPerCharRound * n * rounds * (1 + ENC_BUDGET.stage.bulk * s), pressure: at(ENC_BUDGET.pressurePerChar, n - 1) * n * (1 + ENC_BUDGET.stage.pressure * s) };
}

/** One foe of a composed fight: what `startCombat` takes, and what it cost and where it starts. */
export interface EncounterFoe extends FoeSpec { spawn: Spawn; cost: { bulk: number; pressure: number } }
/** A composed fight (rule 15's output), with its budget asked and spent (rule 35 reports it). */
export interface Encounter {
  template: string; name: string; text: string; kind: string; level: number; fightKind: FightKind;
  target: { bulk: number; pressure: number; rounds: number }; spent: { bulk: number; pressure: number };
  /** The HP scale every foe took to reach the bulk target (rule 19; 1: none). */
  scaleHp: number;
  /** Inside both bands (rule 17): true, or false when no template could be (the closest was taken; the tests say so). */
  ok: boolean; foes: EncounterFoe[]; map: MapDef;
}
/** The fight's inputs (rule 15). */
export interface EncounterIn { levels: number[]; node: { id: string; depth: number; kind: string; gate?: boolean }; stage: number; setting: string; seed: string; last?: string | null }

const kindOfNode = (node: EncounterIn['node']): FightKind => (node.gate ? 'gate' : node.kind === 'elite' || node.kind === 'boss' ? node.kind : 'fight');
/** The templates a node may take (rule 21 a), in the order they are tried: the rolled one first, then the others by
 * weight (ties by data order). Never the last fight's, unless it is the only one. */
export function templatesFor(rng: Rng, kind: FightKind, depth: number, n: number, setting: SettingDef, last?: string | null): EncounterTemplate[] {
  const kinds = Object.keys(setting.kinds);
  let ok = TEMPLATES.filter((t) => t.nodes.includes(kind) && depth >= (t.from_depth || 1) && n >= (t.min_party || 1) && (!t.kinds || t.kinds.some((k) => kinds.includes(k))));
  if (ok.length > 1 && last) ok = ok.filter((t) => t.id !== last);
  const first = rollTable(rng, { id: 'templates', entries: ok.map((t) => ({ item: t.id, weight: t.weight })) });
  const rest = ok.filter((t) => t.id !== first?.item).sort((a, b) => b.weight - a.weight);
  return [...ok.filter((t) => t.id === first?.item), ...rest];
}

interface Pick { slot: EncounterSlot; tier: string; caster?: string; level: number; cost: { bulk: number; pressure: number } }
/** Fill a template (rule 21 b, c): the required slots, then the optional ones in order, one foe at a time, each while
 * it brings the bulk nearer the target, keeps pressure inside the cap's band and the party's `max_foes`. */
function fill(t: EncounterTemplate, rng: Rng, L: number, n: number, depth: number, stage: number, target: { bulk: number; pressure: number }) {
  const picks: Pick[] = [], max = at(ENC_BUDGET.maxFoes, n - 1), capHi = target.pressure * (1 + ENC_BUDGET.pressureBand), bulkHi = target.bulk * (1 + ENC_BUDGET.bulkBand);
  const make = (slot: EncounterSlot): Pick => {
    const caster = slot.caster?.length ? slot.caster[die(rng, slot.caster.length) - 1] : undefined;
    const tier = caster ? ((CASTER[caster] || HEART_CASTER[caster]) as any)?.tier || 'soldier' : slot.tier || 'minion';
    const level = foeLevel(tier, L, stage);
    return { slot, tier, caster, level, cost: foeCost(tier, level, L, n) };
  };
  const sum = () => picks.reduce((s, p) => ({ bulk: s.bulk + p.cost.bulk, pressure: s.pressure + p.cost.pressure }), { bulk: 0, pressure: 0 });
  for (const s of t.slots) for (let i = 0; i < (s.req || 0); i++) picks.push(make(s));
  let stop: 'band' | 'foes' | 'pressure' | 'slots' = 'slots';
  for (const s of t.slots) {
    if (!s.max || (s.from_depth && depth < s.from_depth)) continue;
    for (let i = 0; i < s.max; i++) {
      const now = sum(); if (now.bulk >= target.bulk * (1 - ENC_BUDGET.bulkBand) && Math.abs(now.bulk - target.bulk) <= target.bulk * 0.02) { stop = 'band'; break; }
      if (picks.length >= max) { stop = 'foes'; break; }
      const p = make(s);
      if (now.pressure + p.cost.pressure > capHi) { stop = 'pressure'; break; }
      if (now.bulk + p.cost.bulk > bulkHi || Math.abs(now.bulk + p.cost.bulk - target.bulk) >= Math.abs(now.bulk - target.bulk)) break;
      picks.push(p);
    }
    if (stop === 'foes') break;
  }
  if (picks.length >= max) stop = 'foes';
  return { picks, spent: sum(), stop };
}

/** The damage scale of a fight's Elites and Bosses when they pass the pressure band by themselves (rules 1.44, item
 * 2814): their pressure brought down so the fight's is the cap (`pressure`); 1 when the band holds or nothing big is
 * there to scale. Only required slots can pass the band (an optional foe is never added past it). */
export function anchorDamage(picks: { tier: string; cost: { pressure: number } }[], pressure: number, capHi: number): number {
  const all = picks.reduce((t, p) => t + p.cost.pressure, 0); if (all <= capHi + 1e-9) return 1;
  const bigP = picks.filter((p) => big(p.tier)).reduce((t, p) => t + p.cost.pressure, 0), rest = all - bigP;
  return bigP > 0 && rest < pressure ? (pressure - rest) / bigP : 1;
}
/** Compose the fight at a node (rules 15 to 22). */
export function composeEncounter(inp: EncounterIn): Encounter {
  const rng = rngFor(inp.seed, inp.node.id + '#fight'), setting = SETTING[inp.setting] || SETTINGS[0];
  const n = Math.max(1, Math.min(4, inp.levels.length || 1)), L = fightLevelOf(inp.levels), kind = kindOfNode(inp.node);
  const target = budgetFor(n, kind, inp.node.depth, inp.stage);
  const fightKind = String(rollTable(rng, { id: 'kinds', entries: Object.entries(setting.kinds).map(([k, w]) => ({ item: k, weight: w })) })?.item || 'human');
  const lo = target.bulk * (1 - ENC_BUDGET.bulkBand), hi = target.bulk * (1 + ENC_BUDGET.bulkBand), capHi = target.pressure * (1 + ENC_BUDGET.pressureBand);
  let best: { t: EncounterTemplate; f: ReturnType<typeof fill>; err: number; scale: number; dmg: number } | null = null;
  for (const t of templatesFor(rng, kind, inp.node.depth, n, setting, inp.last)) {
    const f = fill(t, rng, L, n, inp.node.depth, inp.stage, target);
    // Rules 1.44 (item 2814): a required Elite or Boss that passes the pressure band by itself takes the rest as a damage
    // scale down to the cap (the HP rule mirrored: damage is pressure, as HP is bulk)
    const dmg = anchorDamage(f.picks, target.pressure, capHi);
    if (dmg !== 1) f.spent.pressure = target.pressure;
    const over = f.spent.bulk > hi || f.spent.pressure > capHi;
    // Short of the bulk with no room for another foe (max_foes, or the pressure cap): every foe takes the rest as HP
    // (rule 19). Short because the template ran out of slots: the next template is tried first (rule 21 d).
    const short = f.spent.bulk < lo, scale = short && f.stop !== 'slots' && f.spent.bulk > 0 ? target.bulk / f.spent.bulk : 1;
    const err = over ? 1e6 + f.spent.bulk : short && scale === 1 ? (lo - f.spent.bulk) / target.bulk : 0;
    if (!best || err < best.err) best = { t, f, err, scale, dmg };
    if (err === 0) break;
  }
  const b = best!, ok = b.err === 0;
  // A template that stayed short on slots alone (none fitted): scale it all the same, so the fight still lasts.
  const scaleHp = b.scale !== 1 ? b.scale : b.f.spent.bulk > 0 && b.f.spent.bulk < lo && b.err < 1e6 ? target.bulk / b.f.spent.bulk : 1;
  const foes = b.f.picks.map((p) => armed(p, rng, setting, fightKind, n, scaleHp, big(p.tier) ? b.dmg : 1));
  number(foes);
  const spent = { bulk: b.f.spent.bulk * scaleHp, pressure: b.f.spent.pressure };
  return { template: b.t.id, name: b.t.name, text: b.t.text, kind: fightKind, level: L, fightKind: kind, target, spent, scaleHp, ok: ok || scaleHp !== 1, foes, map: encounterMap(inp.node.id, n + foes.length, foes, rng) };
}
/** A slot's foe made whole (rule 21 e): its weapon from the setting's pool by tier and range (a caster's own; the Boss's
 * the setting's), its kind, tags, level, spawn and scale. Never a Celestial. */
function armed(p: Pick, rng: Rng, setting: SettingDef, fightKind: string, n: number, scaleHp: number, scaleDmg = 1): EncounterFoe {
  const s = p.slot, kind = s.boss ? setting.boss.kind : s.kind || fightKind, sh = shareOf(p.tier, n);
  let weapon: string, name: string, caster = p.caster;
  if (s.boss) {
    weapon = setting.boss.weapon; name = setting.boss.name;
    const cs = setting.boss.casters || []; if (cs.length) { const k = die(rng, cs.length + 1) - 1; if (k < cs.length) caster = cs[k]; }
  } else {
    const pool = (setting.pools?.[p.tier] || SV.pools[p.tier] || SV.pools.minion)[s.range || 'ranged'] || SV.pools.minion.ranged;
    weapon = pool[die(rng, pool.length) - 1];
    name = (SV.names[kind] || SV.names.human)[p.tier] || p.tier;
  }
  const cd: any = caster ? CASTER[caster] || HEART_CASTER[caster] : null;
  if (cd) { weapon = cd.weapon; name = cd.name; }
  if (!WEAPON[weapon]) weapon = 'service_pistol';
  const hp = sh.hp * scaleHp, dmg = sh.damage * scaleDmg;
  return { name, tier: p.tier, weapon, level: p.level, kind: kind === 'celestial' ? 'human' : kind, ...(caster ? { caster } : {}), ...(s.tags?.length ? { tags: [...s.tags] } : {}), ...(s.hidden ? { hidden: true } : {}),
    ...(hp !== 1 || dmg !== 1 ? { scale: { ...(hp !== 1 ? { hp } : {}), ...(dmg !== 1 ? { damage: dmg } : {}) } } : {}), spawn: s.spawn || 'far', cost: p.cost };
}
/** Two foes of one name are numbered (Trooper 1, Trooper 2). */
function number(foes: EncounterFoe[]) {
  const count: Record<string, number> = {}, seen: Record<string, number> = {};
  for (const f of foes) count[f.name] = (count[f.name] || 0) + 1;
  for (const f of foes) if (count[f.name] > 1) { seen[f.name] = (seen[f.name] || 0) + 1; f.name = f.name + ' ' + seen[f.name]; }
}

/** The fight's map (rule 22, step 3's form): the open ground's middle cropped to the size its units ask (`map_size`),
 * the squad's start tiles on the west edge (`squad_cols`), each foe's start by its slot's spawn, from the enemy line the
 * map's own deployment rule gives (`deployEnemy`, 10 to 14 tiles off). Build step 7 replaces the crop with stamps. */
export function encounterMap(id: string, units: number, foes: EncounterFoe[], rng: Rng): MapDef {
  const MS = SV.map_size, size: number = (MS.steps as { units: number; size: number }[]).find((s) => units <= s.units)?.size || MAP_LIMITS.max;
  const G = MAP_LAYOUTS.open_ground, x0 = Math.floor((G.w - size) / 2), y0 = Math.floor((G.h - size) / 2);
  const rows = G.rows.slice(y0, y0 + size).map((r) => r.slice(x0, x0 + size).replace(/[SE]/g, '.'));
  const map = layoutMap('survival-' + id, { name: 'Open ground (' + size + ' × ' + size + ')', w: size, h: size, rows, legend: G.legend, notes: [] });
  const mid = (size - 1) / 2, cols: number[] = MS.squad_cols;
  const cand: string[] = []; for (const x of cols) for (let y = 0; y < size; y++) if (standable(map, x + ',' + y)) cand.push(x + ',' + y);
  map.pcStart = cand.sort((a, b) => Math.abs(Number(a.split(',')[1]) - mid) - Math.abs(Number(b.split(',')[1]) - mid) || Number(a.split(',')[0]) - Number(b.split(',')[0])).slice(0, 6);
  const blocked = new Set<string>([...map.solid, ...map.cover, ...(map.full || [])]);
  const line = deployEnemy(size, size, map.pcStart, blocked);
  const farX = Math.round(line.reduce((s, k) => s + Number(k.split(',')[0]), 0) / Math.max(1, line.length));
  const gap = startGap(map.pcStart, line), nearShift = Math.max(0, gap - MAP_LIMITS.deploy_min);
  const taken = new Set<string>(map.pcStart);
  // No foe starts nearer the squad than the map's deployment minimum (or the line's own gap, on a map too small for it).
  const minGap = Math.min(MAP_LIMITS.deploy_min, gap), sqX = Math.max(...cols);
  const free = (k: string) => standable(map, k) && !taken.has(k) && startGap(map.pcStart, [k]) >= minGap;
  let flank = 0, split = 0, far = 0;
  const yOf = (i: number) => Math.round(mid + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 2);
  map.foeStart = foes.map((f) => {
    let x = farX, y = Math.round(mid);
    switch (f.spawn) {
      case 'near': x = farX - nearShift; y = yOf(far++); break;
      case 'between': x = farX - 2; y = yOf(far++); break;
      case 'back': x = Math.min(size - 1, farX + 2); break;
      case 'central': break;
      case 'flanks': x = sqX + minGap; y = flank++ % 2 ? size - 2 - Math.floor(flank / 2) : 1 + Math.floor(flank / 2); break;
      case 'split': y = split++ % 2 ? Math.round(size * 0.75) : Math.round(size * 0.25); y += Math.floor(split / 2) * (split % 2 ? 1 : -1); break;
      default: y = yOf(far++);
    }
    const want = Math.max(0, Math.min(size - 1, x)) + ',' + Math.max(0, Math.min(size - 1, y));
    const k = nearestFree(size, size, want, free) || nearestFree(size, size, want, (t) => standable(map, t) && !taken.has(t)) || want;
    taken.add(k); return k;
  });
  void rng;
  return map;
}
