// Feelings (rules 1.8, Outburst 4.0; spec: Soul magic section 12; data/feelings.json). A feeling is poured into a held
// Outburst with a Pump: +1 stage with its own step on the multiplier instead of the plain +0.4, and its behaviour joins
// the release. A feeling unlocks the first time its trigger happens to the character (the engine watches the hooks and
// the effects stream below); the Narrator may grant one too. This file holds the data, the steps, the unlocking and the
// triggers, and residue lookups; what a feeling does at a release (and residue's effects) runs in magic.ts beside the
// conditions, harm and heals. Everything is deterministic. Every number is provisional (spec 14, items 801 on).
// Rules 1.19 (the Outburst rework, round 2): a plain Pump is +0.2; each feeling goes into an Outburst once; a feeling
// that buys the multiplier pays for it (1 Strain or 8 HP for +0.3 above a plain Pump), one that changes the Release
// steps +0.3, and a strong one steps +0.2, 0 or below 0 (Calm, Relief: the multiplier going down is the price).
import './datatext'; // fills the texts' {=placeholders} before any data is read
import feelJ from '../../../data/feelings.json';
import { SOUL_RULES } from './data';
import type { Character } from './character';
import { type Combat, type Unit, dist, lineOfSight } from './combat';
import { fxTaps } from './fxtap';
import { onHook, onStoryHook, boundGame, charOfUnit } from './effects/hooks';
import { emitFx } from './combat';

export interface FeelingDef {
  id: string; name: string; n: number; family: string;
  /** Rules 1.17: `base` is the step (+0.4 is a plain Pump's); the rest are what a few feelings add to it; `text` says it in words. */
  step: { base?: number; text?: string; vs_last_hurt?: number; fallen?: number; per_stage_past?: number; from_stage?: number; per_20pct_missing?: number; alone_extra?: number; alone_range?: number; per_ally?: number; range?: number; max?: number };
  trigger: { event: string; text: string };
  pour: Record<string, any> & { text: string };
  residue: Record<string, any> & { kind: 'helps' | 'harms' | 'none'; text: string };
}
const FJ: any = feelJ;
export const FEELINGS: FeelingDef[] = FJ.items;
export const FEELING: Record<string, FeelingDef> = Object.fromEntries(FEELINGS.map((f) => [f.id, f]));
/** A plain Pump's step on the multiplier (rules 1.19: the stage table climbs 0.2 a stage from stage 0; 0.4 in rules 1.17). */
export const PLAIN_STEP: number = FJ.plain_step ?? 0.2;
/** Rules 1.19: each feeling goes into an Outburst once (data `once_each`; a single feeling's own `pour.once` still works). */
export const ONCE_EACH: boolean = !!FJ.once_each;
/** A feeling's own price at the Pump or after the Release, for previews and the simulator: Strain now, Strain after a
 * Release that takes nobody down (Pride), HP at the Release. */
export const feelingCost = (id: string): { strain: number; strainAfter: number; hp: number } => { const p: any = FEELING[id]?.pour || {}; return { strain: Number(p.strain || 0), strainAfter: Number(p.strain_unless_down || 0), hp: Number(p.self_damage || 0) }; };
export const START_FEELINGS: string[] = FJ.start_default || ['rage', 'love'];
export const START_FEELING_COUNT: number = FJ.start_count ?? 2;
export const RESIDUE_ROUNDS: number = FJ.residue_rounds ?? 2;
export const FEELING_FAMILIES: Record<string, string> = FJ.families || {};

/** Who feels (item 809): a player character who can cast Outbursts (a design, or a known school). */
export const canFeel = (c: Character | null | undefined): boolean => !!c && ((c.outbursts || []).length > 0 || (c.soulKnown?.schools || []).length > 0);
export const feelingsOf = (c: Character | null | undefined): string[] => (c?.feelings || []).filter((f) => FEELING[f]);
/** The starting feelings check (creation): exactly 2 known, different feelings. */
export function startingFeelingsError(f: string[] | undefined): string | null {
  if (!f || !f.length) return null;
  if (f.length !== START_FEELING_COUNT || new Set(f).size !== f.length) return 'Pick ' + START_FEELING_COUNT + ' different feelings.';
  if (f.some((x) => !FEELING[x])) return 'Unknown feeling.';
  return null;
}

// ---------- unlocking ----------
let storyNote: ((g: any, c: Character, text: string) => void) | null = null;
/** game.ts gives this file its way to write a line in the story (kept there to avoid an import cycle). */
export const setFeelStoryNote = (f: (g: any, c: Character, text: string) => void) => { storyNote = f; };
/** Unlock a feeling for a character (permanent). In a fight it reaches the character's units too, with a log line and
 * fx 'felt' {unit, char, feeling, name, why}; out of one, a line in the story. Returns true when it was new. */
export function feelChar(g: any, c: Character | null | undefined, id: string, why: string, cb?: Combat | null): boolean {
  const f = FEELING[id]; if (!c || !f || !canFeel(c)) return false;
  const k = (c.feelings ||= []); if (k.includes(id)) return false;
  k.push(id);
  const text = c.name + ' has felt ' + f.name + ' (' + why + '): it can be poured in now.';
  if (cb) {
    let unit: string | null = null;
    for (const v of cb.units) if (v.charId === c.id && v.mg) { const fl = (v.mg.feelings ||= []); if (!fl.includes(id)) fl.push(id); unit ||= v.id; }
    cb.log.push(text);
    emitFx(cb, 'felt', { unit, char: c.id, feeling: id, name: f.name, family: f.family, why });
    if (cb.overworld && g && storyNote) storyNote(g, c, text);
  } else if (g && storyNote) storyNote(g, c, text);
  return true;
}
/** Unlock for the character behind a unit (enemies and companions don't feel). */
export function feelUnit(cb: Combat, u: Unit | null | undefined, id: string, why: string): boolean {
  if (!u || u.companion || !u.charId || (cb as any)?.dry) return false; // not in the area map's dry run (game.ts)
  return feelChar(boundGame(), charOfUnit(u), id, why, cb);
}

// ---------- steps (item 804) ----------
const alliesNear = (cb: Combat, u: Unit, r: number) => cb.units.filter((v) => v !== u && v.side === u.side && !v.dead && !v.downed && !v.surrendered && dist(v.pos, u.pos) <= r).length;
/** Whoever last hurt this unit (an enemy), for Spite. */
export const lastHurtBy = (u: Unit): string | null => (u as any).feelHurtBy || null;
/** Has an ally of this unit gone Down or died in this fight (Grief, rules 1.19)? Companions count; the unit itself doesn't. */
export const allyFallen = (cb: Combat, u: Unit) => cb.units.some((v) => v !== u && v.side === u.side && (v.dead || v.downed));
/** One feeling pump's step on the multiplier, read at the release (rules 1.19: every feeling has its `base`; Grief
 * steps more once an ally has fallen, Despair by HP missing, Loneliness with no ally near, Belonging by allies near,
 * Spite against whoever last hurt you). */
export function feelingStep(cb: Combat | null, u: Unit, id: string, stage: number, t?: Unit | null): number {
  const f = FEELING[id]; if (!f) return PLAIN_STEP;
  const s: any = f.step || {}, base: number = s.base ?? PLAIN_STEP, r2 = (n: number) => Math.round(n * 100) / 100;
  switch (id) {
    case 'pride': return r2(base + (s.per_stage_past ?? 0) * Math.max(0, stage - (s.from_stage ?? 2)));
    case 'grief': return cb && s.fallen != null && allyFallen(cb, u) ? s.fallen : base;
    case 'despair': { const miss = u.maxHp > 0 ? Math.max(0, (u.maxHp - u.hp) / u.maxHp) : 0; return r2(Math.min(s.max ?? 0.6, base + (s.per_20pct_missing ?? 0.1) * Math.floor(miss * 5 + 1e-9))); }
    case 'loneliness': return r2(base + (cb && !alliesNear(cb, u, s.alone_range ?? 3) ? s.alone_extra ?? 0.3 : 0));
    case 'belonging': return cb ? r2(Math.min(s.max ?? 0.5, base + (s.per_ally ?? 0.1) * alliesNear(cb, u, s.range ?? 3))) : base;
    case 'spite': return t && lastHurtBy(u) === t.id ? s.vs_last_hurt ?? 0.5 : base;
    default: return base;
  }
}
/** What the feeling pumps add to the stage table's multiplier: the sum of (step − a plain Pump's step) (item 804). */
export function feelDelta(cb: Combat | null, u: Unit, felt: string[] | undefined, stage: number, t?: Unit | null): number {
  let n = 0; for (const f of felt || []) n += feelingStep(cb, u, f, stage, t) - PLAIN_STEP;
  return Math.round(n * 100) / 100;
}
/** The strongest feeling poured in (residue): the most pumps, ties to the latest. */
export function strongestFeeling(felt: string[] | undefined): string | null {
  if (!felt || !felt.length) return null;
  const count: Record<string, number> = {}; let best: string | null = null, n = 0;
  felt.forEach((f) => { count[f] = (count[f] || 0) + 1; if (count[f] >= n) { n = count[f]; best = f; } });
  return best;
}

// ---------- residue lookups ----------
/** The residue on a tile (cb.zones kind 'residue'), if any. */
export function residueAt(cb: Combat | null | undefined, k: string): any | null {
  if (!cb) return null;
  for (const z of cb.zones || []) if ((z.kind as string) === 'residue' && z.tiles.includes(k) && z.left > 0) return z;
  return null;
}
/** Does this residue work on this unit? Helping residue for the caster's side only, harming residue for anyone (item 807). */
export function residueReaches(z: any, u: Unit): boolean {
  const f = FEELING[z?.feeling]; if (!f || u.dead) return false;
  return f.residue.kind === 'harms' ? true : f.residue.kind === 'helps' ? u.side === z.side : false;
}
/** A residue's standing number for a unit on its tile: 'roll', 'save', 'defense', 'attack' (0 when none). */
export function residueStand(cb: Combat | null | undefined, u: Unit, what: 'roll' | 'save' | 'defense' | 'attack'): number {
  const z = residueAt(cb, u.pos); if (!z || !residueReaches(z, u)) return 0;
  const r = FEELING[z.feeling].residue; if (r.when !== 'stand') return 0;
  return Number(r[what] || 0);
}
export function residueFlag(cb: Combat | null | undefined, u: Unit, what: 'no_reaction' | 'stabilise' | 'immune'): any {
  const z = residueAt(cb, u.pos); if (!z || !residueReaches(z, u)) return null;
  const r = FEELING[z.feeling].residue; return r.when === 'stand' ? r[what] ?? null : null;
}

// ---------- triggers (item 815) ----------
const helpless = (t: Unit) => t.downed || ['stunned', 'pinned', 'grappled'].some((c) => (t.conds?.[c] || 0) > 0);
const elite = (t: Unit) => t.tier === 'elite' || t.tier === 'boss';
const standing = (v: Unit) => !v.dead && !v.downed && !v.surrendered;
const feelSide = (cb: Combat, side: string, id: string, why: string, pred: (v: Unit) => boolean = () => true) => { for (const v of cb.units) if (v.side === side && v.charId && !v.companion && pred(v)) feelUnit(cb, v, id, why); };
function registerFeelingTriggers() {
  onHook('combat_start', (_ctx, cb) => {
    for (const u of cb.units) if (u.charId && cb.units.some((v) => v.side !== u.side && elite(v) && !v.dead)) feelUnit(cb, u, 'fear', 'a fight with an Elite or Boss');
  });
  onHook('cond_landed', (ctx, cb) => { if ((ctx.id === 'fear' || ctx.id === 'afraid') && ctx.t) feelUnit(cb, ctx.t, 'fear', 'made Afraid'); });
  onHook('on_damaged', (ctx, cb) => {
    const t: Unit = ctx.t, by: Unit | null = ctx.src?.by || null, n = ctx.dmg || 0;
    if (!t || n <= 0) return;
    if (t.maxHp > 0 && n >= t.maxHp * 0.25) feelUnit(cb, t, 'rage', 'a heavy hit');
    if (by && by !== t && by.side !== t.side) { (t as any).feelHurtBy = by.id; feelUnit(cb, t, 'spite', 'hurt by ' + by.name); }
    if (by && by !== t && by.side === t.side) { (by as any).feelHurtAlly = t.id; feelUnit(cb, by, 'guilt', 'hurt ' + t.name); }
    if (by && by !== t) { const m: any = (t as any).feelDmg ||= {}; m[by.id] = cb.round; }
    const prev = ctx.prevHp ?? t.hp + n;
    if (t.maxHp > 0 && prev >= t.maxHp / 4 && t.hp < t.maxHp / 4) feelUnit(cb, t, 'despair', 'below a quarter of your HP');
    if (by && by.hidden && by.side !== t.side) feelUnit(cb, t, 'dread', 'hit from hiding');
  });
  onHook('on_hit', (ctx, cb) => { const a: Unit = ctx.att, t: Unit = ctx.tgt; if (a && t && helpless(t) && a.side !== t.side) feelUnit(cb, a, 'cruelty', 'hit someone helpless'); });
  onHook('on_downed', (ctx, cb) => {
    const v: Unit = ctx.victim; if (!v) return;
    feelSide(cb, v.side, 'grief', v.name + (v.dead ? ' died' : ' went Down'), (x) => x !== v && standing(x));
    const left = cb.units.filter((x) => x.side === v.side && standing(x) && !x.companion);
    if (left.length === 1 && cb.units.some((x) => x.side === v.side && x !== left[0] && !x.companion)) feelUnit(cb, left[0], 'loneliness', 'the last of your side standing');
  });
  onHook('on_kill', (ctx, cb) => {
    const v: Unit = ctx.victim, by: Unit = ctx.by; if (!v || !by) return;
    if (elite(v)) feelUnit(cb, by, 'pride', 'took down ' + v.name);
    const dm: Record<string, number> = (v as any).feelDmg || {};
    for (const [id, r] of Object.entries(dm)) { if (r !== cb.round || id === by.id) continue; const x = cb.units.find((y) => y.id === id); if (x && x.side === by.side) feelUnit(cb, x, 'jealousy', by.name + ' took ' + v.name); }
  });
  onHook('heal_given', (ctx, cb) => {
    const t: Unit = ctx.t, by: Unit | null = ctx.by;
    if (by && t && by !== t && by.side === t.side && (ctx.n > 0 || ctx.revived)) feelUnit(cb, by, 'love', 'tended ' + t.name);
    if (t && ctx.revived) feelUnit(cb, t, 'hope', 'back up from Downed');
  });
  onHook('shield_grant', (ctx, cb) => { const t: Unit = ctx.t, by: Unit | null = ctx.by; if (by && t && by !== t && by.side === t.side && ctx.n > 0) feelUnit(cb, by, 'love', 'shielded ' + t.name); });
  onHook('attack_roll', (rc, cb) => { if (rc.die === 20) feelUnit(cb, rc.att, 'joy', 'a natural 20'); else if (rc.die === 1) feelUnit(cb, rc.att, 'shame', 'a natural 1'); });
  onHook('spell_roll', (ctx, cb) => { if (ctx.die === 20) feelUnit(cb, ctx.u, 'joy', 'a natural 20'); else if (ctx.die === 1) feelUnit(cb, ctx.u, 'shame', 'a natural 1'); });
  onHook('on_surrender', (ctx, cb) => {
    // Mercy: you talked it down or spared it with a non-lethal blow (the engine has no separate "accept": the surrender
    // you brought about is the one you accepted). Contempt: it gave up some other way while you were its last attacker.
    const t: Unit = ctx.t, by: Unit | null = ctx.by;
    if (!t) return;
    if (by && by.side !== t.side) { feelUnit(cb, by, 'mercy', 'spared ' + t.name); return; }
    const last = t.lastHitBy ? cb.units.find((x) => x.id === t.lastHitBy) || null : null;
    if (last && last.side !== t.side) feelUnit(cb, last, 'contempt', t.name + ' yielded');
  });
  onHook('cond_resisted', (ctx, cb) => { if ((ctx.id === 'fear' || ctx.id === 'afraid') && ctx.t) feelUnit(cb, ctx.t, 'defiance', 'stood against fear'); });
  onHook('turn_start', (ctx, cb) => { const u: Unit = ctx.u; if (u && alliesNear(cb, u, 2) >= 3) feelUnit(cb, u, 'belonging', 'among friends'); });
  onHook('turn_end', (ctx, cb) => {
    const u: Unit = ctx.u; if (!u?.mg) return;
    if (alliesNear(cb, u, 2) >= 3) feelUnit(cb, u, 'belonging', 'among friends');
    if (u.mg.strain === 0 || (u.mg as any).steadied) feelUnit(cb, u, 'calm', (u.mg as any).steadied ? 'a steadied heart' : 'a quiet heart');
    delete (u.mg as any).steadied;
  });
  onHook('combat_end', (ctx, cb) => {
    if (!ctx.won) return;
    const side = 'pc', mine = cb.units.filter((v) => v.side === side && v.charId && !v.companion);
    if (mine.every((v) => !v.dead && !v.downed)) for (const v of mine) feelUnit(cb, v, 'relief', 'a clean win');
  });
  // The effects stream (fx 'miracle', a Grand form's 'evoke', traps and hazards): Awe, Dread, Wonder.
  fxTaps.push((cb: Combat, ev: any) => {
    if (ev.k === 'felt') return;
    const sees = (u: Unit, at?: string) => !!at && standing(u) && (u.pos === at || lineOfSight(cb, u.pos, at));
    if (ev.k === 'miracle' || (ev.k === 'evoke' && ev.shape === 'grand')) {
      const at = ev.at || ev.src; for (const u of cb.units) if (u.charId && sees(u, at)) feelUnit(cb, u, 'awe', ev.k === 'miracle' ? 'a Miracle' : 'a Grand form');
    } else if (ev.k === 'trap' || ev.k === 'trap_sprung' || (ev.k === 'hazard' && (ev.dmg || 0) > 0)) {
      const u = cb.units.find((x) => x.id === (ev.unit || ev.target)); if (u) feelUnit(cb, u, 'dread', ev.k === 'hazard' ? 'a hazard went off' : 'a trap went off');
    } else if (ev.k === 'hazard_spotted' || ev.k === 'trap_spotted') {
      const u = cb.units.find((x) => x.id === ev.by); if (u) feelUnit(cb, u, 'wonder', 'something hidden revealed');
    }
  });
  // Story: natural 20s and 1s on checks; a new zone; a scene apart from the linked ally.
  onStoryHook('check_result', (ctx, g) => {
    const c: Character = ctx.c, r = ctx.roll; if (!c || !r) return;
    if (r.die === 20) feelChar(g, c, 'joy', 'a natural 20'); else if (r.die === 1) feelChar(g, c, 'shame', 'a natural 1');
  });
  onStoryHook('scene_change', (ctx, g) => {
    for (const c of Object.values(g?.characters || {}) as Character[]) {
      const link: string | undefined = (c as any).state?.heartLink?.with || (c as any).heartLink;
      if (link && (!g.characters[link] || g.characters[link].dead)) feelChar(g, c, 'longing', 'a scene apart');
    }
  });
}
registerFeelingTriggers();
/** Story triggers game.ts calls: resisting or indulging an Overreach, a new zone reached, a vow broken (faith.ts). */
export function feelOverreach(g: any, c: Character, choice: 'indulge' | 'resist') { feelChar(g, c, choice === 'resist' ? 'defiance' : 'abandon', choice === 'resist' ? 'resisted an Overreach' : 'indulged an Overreach'); }
export function feelNewZone(g: any, c: Character) { feelChar(g, c, 'wonder', 'a new place'); }
export const SOUL_PRACTICE: any = (SOUL_RULES as any).practice || {};
