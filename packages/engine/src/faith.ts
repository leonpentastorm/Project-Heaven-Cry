// Blessing 2.0 (rules 1.6): faith is a relationship. Belief (Faithful or Atheist), Devotion as standing with gates,
// the three sizes of prayer (Whisper, Hymn, Miracle), overreach, Atheist dice and knowledge pieces, conversion and the
// patron's Open or Jealous rule, Witnessed, tags (what the patron sees), vows, interventions, rites and the patrons'
// voice lines. Design: docs/design/blessing-2.0-spec.md; spec: "Patrons and prayer" (rules 1.6). Every number is
// provisional (spec section 14). Deterministic: every die and every voice line comes from the game's rng.
//
// Like missions.ts, this file imports only types from game.ts; game.ts binds the few helpers it needs (bindFaith).
import patronsJ from '../../../data/patrons.json';
import type { GameState, Entry } from './game';
import { type Character, type Belief, type Vow, mod, prayerCooldown, blessingPower, maxHp } from './character';
import type { Combat, Unit } from './combat';
import { emitFx, FX_CAP, alive, dist, unitSees, refOf, isMelee, reload } from './combat';
import { condOn, applyCond, endCond, harm, shiftMana, unitSave, unitDebuff, condSource, condIsBoon, MANA_START } from './magic';
import { actionAp, pushAway } from './effects/core';
import { sessionN } from './effects/uses';
import { applyDamage, healUnit, grantShield } from './effects/damage';
import { onHook, onStat, onCheck, onStoryHook, charOfUnit, boundGame, emit, emitStory } from './effects/hooks';
import { apDebt, bankAp, AP_MAX } from './effects/ap';
import { pendRuling } from './effects/narrator';
import { surrender, canSurrender, reveal, PATRON as LEGACY_PATRON, blessing as legacyBlessing } from './tactics';
import { d20, die, type Rng } from './rng';
import { WEAPON, SKILL, ITEM } from './data';

export type { Belief, Vow } from './character';

// ---------- data ----------
const PJ: any = patronsJ;
export const FAITH_RULES: any = { devotion: PJ.devotion, prayer: PJ.prayer };
export interface FaithTag { id: string; name: string; text: string }
export const FAITH_TAGS: FaithTag[] = PJ.tags || [];
export const FAITH_TAG: Record<string, FaithTag> = Object.fromEntries(FAITH_TAGS.map((t) => [t.id, t]));
export const WHISPERS: any[] = PJ.whispers || [];
export const WHISPER: Record<string, any> = Object.fromEntries(WHISPERS.map((w) => [w.id, w]));
export const VOWS: any[] = PJ.vows || [];
export const VOW: Record<string, any> = Object.fromEntries(VOWS.map((v) => [v.id, v]));
export const LINE_BANKS: string[] = PJ.line_banks || ['answered', 'refused', 'taboo', 'vow_kept', 'vow_broken', 'witnessed', 'intervention', 'miracle', 'conversion'];
/** The patrons (rules 1.6 shape; tactics.ts PATRON is the same list with the old `blessings` alias = hymns). */
export const FAITH_PATRONS: any[] = PJ.items || [];
export const FAITH_PATRON: Record<string, any> = Object.fromEntries(FAITH_PATRONS.map((p) => [p.id, p]));
/** A patron by id: patrons.json, or one added to tactics.ts PATRON at run time (old-shape patrons: blessings = Hymns). */
export const patronById = (id: string | null | undefined): any | null => (id ? FAITH_PATRON[id] || LEGACY_PATRON[id] || null : null);
const hymnsOf = (p: any): any[] => p?.hymns || p?.blessings || [];

/** The gates (Devotion needed): Whisper 0, Hymn I 3, Hymn II 5, Hymn III 7, Miracle 7. */
export const GATE = { whisper: 0, 1: PJ.devotion?.gates?.hymn_1 ?? 3, 2: PJ.devotion?.gates?.hymn_2 ?? 5, 3: PJ.devotion?.gates?.hymn_3 ?? 7, miracle: PJ.devotion?.gates?.miracle ?? 7 } as const;
const PR = PJ.prayer || {};
export const FAITH_MIN = PR.faith_min ?? 3, WITNESS_FAITH = PR.witnessed?.faith_min ?? 5, MIRACLE_FAITH = PR.miracle?.faith_min ?? 7;
export const AP_COST = { whisper: PR.whisper?.ap ?? 1, hymn: PR.hymn?.ap ?? 3, miracle: PR.miracle?.ap ?? 3 };
export const OVERREACH = { base: PR.overreach?.tn_base ?? 12, step: PR.overreach?.tn_per_step ?? 2, miss: PR.overreach?.miss_devotion ?? -1 };
export const ATHEIST_TN = { whisper: PR.atheist_tn?.whisper ?? 12, 1: PR.atheist_tn?.hymn_1 ?? 14, 2: PR.atheist_tn?.hymn_2 ?? 16, 3: PR.atheist_tn?.hymn_3 ?? 18 } as Record<string | number, number>;
export const LIKE_CAP = PJ.devotion?.gain?.liked_tag_fight_cap ?? 2;
export const PRAYER_MANA = PR.mana_delta ?? -5;

/** FX events (emitFx kinds) the faith rules put on a fight's or the story's fx list, with their payloads. */
export const FAITH_FX = {
  prayer: 'prayer', // {unit, kind, id, patron, at, target, ok}
  prayer_fail: 'prayer_fail', // {unit, kind, id, patron, at, why: 'overreach' | 'dice'}
  witnessed: 'witnessed', // {unit, patron, at}
  intervention: 'intervention', // {patron, trigger, at, target, unit}
  devotion: 'devotion', // {char, delta, reason, tag?, now}
  vow: 'vow', // {unit, char, id, state: 'sworn' | 'kept' | 'broken', allyId?}
  patron_line: 'patron_line', // {patron, event, text, char}
  miracle: 'miracle', // {patron, id, at, area, unit}
} as const;

// ---------- actions (the reducer's faith/* actions) ----------
export type PrayerKind = 'whisper' | 'hymn' | 'miracle';
export type FaithAction =
  | { type: 'faith/pray'; charId?: string; unitId?: string; kind: PrayerKind; id: string; targetId?: string; targetId2?: string; tile?: string; text?: string }
  | { type: 'faith/vow'; unitId: string; id: string; allyId?: string }
  | { type: 'faith/rite'; charId: string; id: string }
  // Narrator-only (the host's client: the AI Narrator's tools, or the human Narrator's screen)
  | { type: 'faith/pact'; charId: string; patron: string }
  | { type: 'faith/piece'; charId: string; patron: string; from?: string }
  | { type: 'faith/devotion'; charId: string; delta: number; reason: string }
  | { type: 'faith/rite_kept'; charId: string; patron?: string; rite: string }
  | { type: 'faith/apostasy'; charId: string };

/** What game.ts lends the faith rules (bound once at load: no value import from game.ts). */
export interface FaithBindings {
  push: (g: GameState, e: Omit<Entry, 'id'>) => void;
  rollMod: (g: GameState, c: Character, skill: string, roll?: string) => number;
  isHost: (g: GameState, by: string) => boolean;
  /** Story AP (overworld rounds): what is left, and spend it. */
  apLeft: (g: GameState, c: Character) => number;
  spendAp: (g: GameState, c: Character, n: number) => void;
  /** After a story action: the round closes if everyone is done. */
  afterStory: (g: GameState) => void;
}
let B: FaithBindings | null = null;
export function bindFaith(b: FaithBindings) { B = b; }

// ---------- belief, Devotion, the kit ----------
/** A character's belief. Old saves (no belief): a pact makes them Faithful to that patron, else Atheist (spec 1.6 §1). */
export function beliefOf(c: Character): Belief {
  if (c.belief?.kind === 'faithful' && patronById(c.belief.patron)) return c.belief;
  if (c.belief?.kind === 'atheist') return c.belief;
  return c.patron && patronById(c.patron) ? { kind: 'faithful', patron: c.patron } : { kind: 'atheist' };
}
export const patronOf = (c: Character): any | null => { const b = beliefOf(c); return b.kind === 'faithful' ? patronById(b.patron) : null; };
export const faithOf = (c: Character) => c.skills?.faith || 0;
/** Devotion (Faithful only; 0-10). */
export const devotionNow = (c: Character) => (beliefOf(c).kind === 'faithful' ? Math.max(0, Math.min(10, c.devotion ?? 3)) : 0);
/** Hymns a character prays by dice ("<patron>.<hymn>"): an Atheist's, or kept from another patron under an Open rule. */
export function diceHymns(c: Character): string[] {
  const own = patronOf(c)?.id, out = new Set<string>();
  for (const k of c.hymns || []) { const [p] = k.split('.'); if (p !== own) out.add(k); }
  for (const [pid, n] of Object.entries(c.faithPieces || {})) {
    const p = patronById(pid); if (!p || pid === own) continue;
    for (const h of hymnsOf(p).slice(0, Math.max(0, Math.min(3, n)))) out.add(pid + '.' + h.id);
  }
  return [...out];
}
/** A hymn by key: "<patron>.<hymn>", or a bare id of the character's own patron's Hymn. */
export function hymnByKey(c: Character, key: string): { patron: any; hymn: any; key: string } | null {
  const [a, b] = key.includes('.') ? key.split('.') : [patronOf(c)?.id || '', key];
  const p = patronById(a); const h = p && hymnsOf(p).find((x: any) => x.id === b);
  return p && h ? { patron: p, hymn: h, key: p.id + '.' + h.id } : null;
}

// ---------- preview (the UI shows odds and disables buttons with reasons) ----------
export interface PrayerPreview {
  ok: boolean; why?: string; ap: number;
  /** The die to beat, when there is one (Atheist dice, a kept Hymn, an overreach). */
  roll?: { tn: number; mod: number };
  /** The Devotion the ask needs (null: no gate, for prayers by dice). */
  gate: number | null;
  /** Asking above your standing: the roll's TN (a miss costs 1 Devotion). */
  overreach?: { tn: number };
  /** How it is prayed: by standing (no roll), as an overreach, or by dice. */
  mode: 'standing' | 'overreach' | 'dice';
  effectText: string; name: string; patron: string | null;
  /** Who it may go at: unit ids in a fight, character ids in the story (empty for a tile or no target). */
  targets: string[];
  /** What the target is: self_or_ally, self, ally, enemy, tile, none, two_units, two_allies, downed_ally, dead_ally. */
  target: string;
}
export interface PrayerArgs { targetId?: string; targetId2?: string; tile?: string }

/** Who prays: a character id (the story) or a unit id (a fight). */
function whoOf(g: GameState, who: string): { c: Character | null; u: Unit | null; cb: Combat | null } {
  const cb = g.phase === 'combat' && g.combat && !g.combat.over ? g.combat : null;
  const u = cb?.units.find((x) => x.id === who || x.charId === who) || null;
  const c = g.characters[who] || (u?.charId ? g.characters[u.charId] : null) || null;
  return { c, u, cb };
}
/** The entry asked for: a Whisper, a Hymn (own or kept) or the patron's Miracle. */
export function prayerEntry(c: Character, kind: PrayerKind, id: string): { entry: any; patron: any | null; tier: number; key: string } | null {
  if (kind === 'whisper') { const w = WHISPER[id]; return w ? { entry: w, patron: patronOf(c), tier: 0, key: 'whisper.' + id } : null; }
  if (kind === 'miracle') { const p = patronOf(c); return p?.miracle && (!id || id === p.miracle.id) ? { entry: p.miracle, patron: p, tier: 4, key: p.id + '.' + p.miracle.id } : null; }
  const h = hymnByKey(c, id); return h ? { entry: h.hymn, patron: h.patron, tier: h.hymn.tier || 1, key: h.key } : null;
}
/** The roll modifier for a prayer: the Faith modifier and items (in a fight, the unit's item mods). */
export function prayerMod(g: GameState, c: Character, u?: Unit | null): number {
  if (u) return mod(faithOf(c)) + (u.sk?.faith || 0);
  return B ? B.rollMod(g, c, 'faith', 'prayer') : mod(faithOf(c));
}
/** Can this character pray this, now, and how (spec 1.6 §2–4)? */
export function previewPrayer(g: GameState, who: string, kind: PrayerKind, id: string, args: PrayerArgs = {}): PrayerPreview {
  const { c, u, cb } = whoOf(g, who);
  const base = { ap: AP_COST[kind], gate: null as number | null, mode: 'standing' as PrayerPreview['mode'], effectText: '', name: id, patron: null as string | null, targets: [] as string[], target: 'none' };
  const no = (why: string, extra: Partial<PrayerPreview> = {}): PrayerPreview => ({ ...base, ...extra, ok: false, why });
  if (!c) return no('Only a character can pray.');
  const pe = prayerEntry(c, kind, id); if (!pe) return no(kind === 'miracle' ? (beliefOf(c).kind === 'atheist' ? 'An Atheist never gets a Miracle.' : 'Your patron has no Miracle.') : 'No such prayer.');
  const belief = beliefOf(c), faith = faithOf(c), own = patronOf(c);
  const ap = u ? actionAp({ u, c }, kind === 'whisper' ? 'whisper' : 'pray', AP_COST[kind]).ap : AP_COST[kind];
  const target = pe.entry.target || (kind === 'hymn' ? 'self_or_ally' : 'none'); // an old-shape Blessing goes at you or an ally
  const info = { ...base, ap, effectText: pe.entry.text || '', name: pe.entry.name || id, patron: pe.patron?.id || null, target, targets: targetsOf(g, c, u, cb, target) };
  const m = prayerMod(g, c, u);
  // The mode and the gate.
  let gate: number | null = null, mode: PrayerPreview['mode'] = 'standing', roll: PrayerPreview['roll'], overreach: PrayerPreview['overreach'];
  if (kind === 'whisper') { gate = belief.kind === 'faithful' ? GATE.whisper : null; if (belief.kind === 'atheist') { mode = 'dice'; roll = { tn: ATHEIST_TN.whisper, mod: m }; } }
  else if (kind === 'miracle') gate = GATE.miracle;
  else if (belief.kind === 'faithful' && own && pe.patron.id === own.id) {
    gate = (GATE as any)[pe.tier]; const dv = devotionNow(c);
    if (dv < gate!) { mode = 'overreach'; overreach = { tn: OVERREACH.base + OVERREACH.step * (gate! - dv) }; roll = { tn: overreach.tn, mod: m }; }
  } else { mode = 'dice'; roll = { tn: ATHEIST_TN[pe.tier], mod: m }; }
  const out = { ...info, gate, mode, roll, overreach };
  // Who may pray this.
  if (faith < FAITH_MIN) return no('Praying needs Faith ' + FAITH_MIN + '.', out);
  if (kind === 'miracle') {
    if (belief.kind !== 'faithful') return no('An Atheist never gets a Miracle.', out);
    if (faith < MIRACLE_FAITH) return no('A Miracle needs Faith ' + MIRACLE_FAITH + '.', out);
    if (devotionNow(c) < GATE.miracle) return no('A Miracle needs Devotion ' + GATE.miracle + ' (you have ' + devotionNow(c) + ').', out);
    if (c.miracleSession === sessionN(g)) return no('One Miracle a session.', out);
  }
  if (kind === 'hymn' && mode === 'dice' && !diceHymns(c).includes(pe.key)) return no(belief.kind === 'atheist' ? 'You haven\'t learned that Hymn (a knowledge piece unlocks it).' : 'That Hymn isn\'t yours to pray.', out);
  // Silenced, AP, the limits.
  if (u && condOn(u, 'silenced')) return no('Silenced: no prayers.', out);
  if (!u && (c.persistentConds || []).some((x) => x.id === 'silenced')) return no('Silenced: no prayers.', out);
  if (cb && u) {
    if (cb.order[cb.turn] !== u.id) return no('Pray on your turn.', out);
    if (u.ap < ap) return no('Needs ' + ap + ' AP.', out);
    if (kind === 'whisper' && u.faith?.whisperTurn === turnKey(cb)) return no('One Whisper a turn.', out);
    if (kind === 'hymn') { const cd = prayerCooldown(c); if (u.prayedRound != null && cb.round - u.prayedRound < cd) return no('Your last Hymn was ' + (cb.round - u.prayedRound) + ' round(s) ago: wait ' + cd + '.', out); }
  } else {
    const st = storyFaith(g, c);
    if (kind === 'whisper' && st.whisperRound === g.story.round) return no('One Whisper a round.', out);
    if (kind === 'hymn' && st.hymnRound != null && g.story.round - st.hymnRound < prayerCooldown(c)) return no('Your last Hymn was ' + (g.story.round - st.hymnRound) + ' round(s) ago: wait ' + prayerCooldown(c) + '.', out);
  }
  return { ...out, ok: true };
}
/** A fight's turn, as a key (a Whisper is once per turn). */
export const turnKey = (cb: Combat) => cb.round + ':' + cb.turn;
/** Story-side faith counters (Whisper and Hymn rounds), on the character. */
export function storyFaith(g: GameState, c: Character): { whisperRound?: number; hymnRound?: number } {
  const st: any = (c.state ||= {}); return (st.faith ||= {});
}
/** Who a prayer may go at (spec: "in sight"). */
function targetsOf(g: GameState, c: Character, u: Unit | null, cb: Combat | null, target: string): string[] {
  if (target === 'tile' || target === 'none' || target === 'self') return [];
  if (cb && u) {
    const sees = (t: Unit) => t === u || cbSees(cb, u, t);
    const allies = cb.units.filter((t) => t.side === u.side && !t.dead && sees(t));
    const enemies = cb.units.filter((t) => t.side !== u.side && !t.dead && !t.surrendered && !t.hidden && sees(t));
    if (target === 'enemy') return enemies.map((t) => t.id);
    if (target === 'downed_ally') return allies.filter((t) => t.downed).map((t) => t.id);
    if (target === 'dead_ally') return cb.units.filter((t) => t.side === u.side && t.dead && !t.companion).map((t) => t.id);
    if (target === 'two_units') return [...allies, ...enemies].map((t) => t.id);
    return allies.filter((t) => !t.surrendered).map((t) => t.id);
  }
  // The story: the squad (enemies are the Narrator's to rule).
  if (target === 'enemy') return [];
  return Object.values(g.characters).filter((x) => !x.dead).map((x) => x.id);
}
let cbSees: (cb: Combat, u: Unit, t: Unit) => boolean = () => true;
/** combat.ts's unitSees, lent at load (combat.ts imports the faith rules for nothing; this keeps the graph simple). */
export function bindFaithSight(f: (cb: Combat, u: Unit, t: Unit) => boolean) { cbSees = f; }

// ---------- the Faith panel ----------
export interface FaithView {
  belief: Belief; patron: { id: string; name: string; costume: string; archetype: string; accent: string; rule: 'open' | 'jealous'; likes: FaithTag[]; taboos: FaithTag[] } | null;
  faith: number; devotion: number;
  gates: { whisper: boolean; hymn1: boolean; hymn2: boolean; hymn3: boolean; miracle: boolean };
  witnessed: boolean; canBeWitnessed: boolean;
  whispers: { id: string; name: string; text: string; preview: PrayerPreview }[];
  hymns: { key: string; patron: string; patronName: string; id: string; name: string; tier: number; text: string; source: 'patron' | 'kept' | 'learned'; preview: PrayerPreview }[];
  miracle: { id: string; name: string; text: string; usedThisSession: boolean; preview: PrayerPreview } | null;
  pieces: Record<string, number>;
  /** The vow sworn this fight (null out of a fight). */
  vow: Vow | null; vows: { id: string; name: string; words: string; brokenWhen: string; needsAlly: boolean }[];
  rites: { id: string; name: string; text: string; engine: boolean; keptThisSession: boolean; available: boolean; why?: string }[];
  rule: 'open' | 'jealous' | null;
  cooldowns: { hymnRoundsLeft: number; whisperUsed: boolean; miracleUsed: boolean };
  /** Liked-tag Devotion gained this fight (of the cap of 2), in a fight. */
  likedThisFight: number;
}
export function faithView(g: GameState, charId: string): FaithView | null {
  const c = g.characters[charId]; if (!c) return null;
  const { u, cb } = whoOf(g, charId);
  const belief = beliefOf(c), p = patronOf(c), dv = devotionNow(c), faith = faithOf(c), who = u?.id || c.id;
  const tag = (id: string) => FAITH_TAG[id] || { id, name: id, text: '' };
  const hymns: FaithView['hymns'] = [];
  if (p) for (const h of hymnsOf(p)) hymns.push({ key: p.id + '.' + h.id, patron: p.id, patronName: p.name, id: h.id, name: h.name, tier: h.tier, text: h.text, source: 'patron', preview: previewPrayer(g, who, 'hymn', p.id + '.' + h.id) });
  for (const k of diceHymns(c)) { const x = hymnByKey(c, k); if (x) hymns.push({ key: x.key, patron: x.patron.id, patronName: x.patron.name, id: x.hymn.id, name: x.hymn.name, tier: x.hymn.tier, text: x.hymn.text, source: belief.kind === 'atheist' ? 'learned' : 'kept', preview: previewPrayer(g, who, 'hymn', x.key) }); }
  const cd = prayerCooldown(c), sf = storyFaith(g, c);
  const hymnLeft = cb && u ? (u.prayedRound != null ? Math.max(0, cd - (cb.round - u.prayedRound)) : 0) : (sf.hymnRound != null ? Math.max(0, cd - (g.story.round - sf.hymnRound)) : 0);
  return {
    belief, patron: p ? { id: p.id, name: p.name, costume: p.costume, archetype: p.archetype, accent: p.accent, rule: p.rule, likes: (p.likes || []).map(tag), taboos: (p.taboos || []).map(tag) } : null,
    faith, devotion: dv,
    gates: { whisper: faith >= FAITH_MIN, hymn1: !!p && dv >= GATE[1], hymn2: !!p && dv >= GATE[2], hymn3: !!p && dv >= GATE[3], miracle: !!p && faith >= MIRACLE_FAITH && dv >= GATE.miracle },
    witnessed: !!u && condOn(u, 'witnessed'), canBeWitnessed: belief.kind === 'faithful' && faith >= WITNESS_FAITH,
    whispers: WHISPERS.map((w) => ({ id: w.id, name: w.name, text: w.text, preview: previewPrayer(g, who, 'whisper', w.id) })),
    hymns,
    miracle: p?.miracle ? { id: p.miracle.id, name: p.miracle.name, text: p.miracle.text, usedThisSession: c.miracleSession === sessionN(g), preview: previewPrayer(g, who, 'miracle', p.miracle.id) } : null,
    pieces: { ...(c.faithPieces || {}) },
    vow: u?.vow || null, vows: VOWS.map((v) => ({ id: v.id, name: v.name, words: v.words, brokenWhen: v.broken_when, needsAlly: !!v.needs_ally })),
    rites: (p?.rites || []).map((r: any) => ({ id: r.id, name: r.name, text: r.text, engine: !!r.engine, keptThisSession: c.ritesKept?.[p.id + '.' + r.id] === sessionN(g), ...riteState(g, c, r) })),
    rule: p?.rule || null,
    cooldowns: { hymnRoundsLeft: hymnLeft, whisperUsed: cb && u ? u.faith?.whisperTurn === turnKey(cb) : sf.whisperRound === g.story.round, miracleUsed: c.miracleSession === sessionN(g) },
    likedThisFight: u?.faith?.liked || 0,
  };
}
/** Can this rite's button be pressed now (engine rites only)? */
export function riteState(g: GameState, c: Character, r: any): { available: boolean; why?: string } {
  const p = patronOf(c); if (!p) return { available: false, why: 'You have no patron.' };
  if (!r.engine) return { available: false, why: 'The Narrator marks this rite kept.' };
  if (c.ritesKept?.[p.id + '.' + r.id] === sessionN(g)) return { available: false, why: 'Kept this session.' };
  if (g.phase !== 'story') return { available: false, why: 'Out of a fight.' };
  const k = r.check?.kind;
  if (k === 'after_rest' && !((g as any).restN > 0)) return { available: false, why: 'After a rest.' };
  if (k === 'tithe_item' && !(c.pack || []).some((x: any) => tithable(x, r.check))) return { available: false, why: 'You have nothing to give (' + (r.check.category || 'an item') + ').' };
  return { available: true };
}
/** Can this pack item be given up for a tithe rite? */
export function tithable(x: any, check: any): boolean { return !!x && x.qty > 0 && (!check?.category || x.kind === check.category || (x.item || x.id || '').includes(check.category)); }


// ======================================================================================================================
// The rules (rules 1.6). Readings where the design was silent are spec section 14, items 592-629.
// ======================================================================================================================

/** One Devotion move: clamped 0-10, logged, an fx event. Only the Faithful have Devotion. */
export function shiftDevotion(g: GameState | null, cb: Combat | null, c: Character, delta: number, reason: string, tag?: string): number {
  if (beliefOf(c).kind !== 'faithful' || !delta) return 0;
  const was = devotionNow(c), now = Math.max(0, Math.min(10, was + delta)); c.devotion = now;
  const d = now - was; if (!d && delta > 0) return 0;
  const ev = { char: c.id, delta: d || delta, reason, ...(tag ? { tag } : {}), now };
  if (cb) { emitFx(cb, FAITH_FX.devotion, ev); cb.log.push(c.name + ': Devotion ' + (delta > 0 ? '+' : '−') + Math.abs(delta) + ' (' + reason + '), now ' + now + '.'); }
  else if (g) { storyFx(g, FAITH_FX.devotion, ev); B?.push(g, { kind: 'system', text: c.name + ': Devotion ' + (delta > 0 ? '+' : '−') + Math.abs(delta) + ' (' + reason + '), now ' + now + '.' }); }
  return d;
}
/** An fx event on the story's list (out of a fight). */
function storyFx(g: GameState, k: string, data: Record<string, any>) {
  const st: any = g.story; const n = (st.fxSeq = (st.fxSeq || 0) + 1), list = (st.fx ||= []); list.push({ n, k, ...data });
  if (list.length > FX_CAP) list.splice(0, list.length - FX_CAP);
}
/** A patron speaks: a line from its bank, picked with the game's dice (deterministic). */
export function patronLine(rng: Rng, patron: any, bank: string): string | null {
  const lines: string[] = patron?.lines?.[bank] || []; if (!lines.length) return null;
  return lines[die(rng, lines.length) - 1];
}
function speak(g: GameState | null, cb: Combat | null, rng: Rng, c: Character, patron: any, bank: string) {
  const text = patronLine(rng, patron, bank); if (!text) return;
  const ev = { patron: patron.id, event: bank, text, char: c.id };
  if (cb) { emitFx(cb, FAITH_FX.patron_line, ev); cb.log.push(patron.name + ': "' + text + '"'); }
  else if (g) { storyFx(g, FAITH_FX.patron_line, ev); B?.push(g, { kind: 'system', head: patron.name.toUpperCase(), text: '"' + text + '"' }); }
}
const fs = (u: Unit): Record<string, any> => (u.faith ||= {});
const unitChar = (u: Unit | null | undefined): Character | null => charOfUnit(u);
/** The game and its rng while a fight runs (bound by apply()). */
const G = (): GameState | null => boundGame() as GameState | null;
const rngOf = (): Rng => (G()?.rng as Rng) || { state: 1 };

// ---------- tags: what your patron sees (spec 1.6 §6; items 595-601) ----------
/** The current action's key: a tag counts once per action (item 596). */
const actionKey = (cb: Combat) => String((G() as any)?.v ?? '') + ':' + cb.round + ':' + cb.turn;
/** A Faithful fighter's action carried a tag: liked +1 (at most +2 a fight), taboo −1 (−2 while Witnessed). */
export function faithTag(cb: Combat, u: Unit | null | undefined, tag: string, ctx: { victimHelpless?: boolean } = {}) {
  if (!u || !u.charId) return;
  const c = unitChar(u); if (!c) return; const p = patronOf(c); if (!p) return;
  if ((p.taboos || []).includes(tag) && p.taboo_notes?.[tag] && !ctx.victimHelpless) return; // the Toll-Keeper's and Matchmaker's "kill" is of the helpless (item 597)
  const st = fs(u), k = actionKey(cb), seen = (st.tags ||= {});
  if (seen[tag] === k) return; seen[tag] = k;
  const g = G(), rng = rngOf();
  if ((p.likes || []).includes(tag)) {
    if ((st.liked || 0) >= LIKE_CAP) return;
    st.liked = (st.liked || 0) + 1; shiftDevotion(g, cb, c, 1, FAITH_TAG[tag]?.name || tag, tag);
  } else if ((p.taboos || []).includes(tag)) {
    const w = condOn(u, 'witnessed'); shiftDevotion(g, cb, c, w ? -2 : -1, (FAITH_TAG[tag]?.name || tag) + (w ? ', while Witnessed' : ''), tag);
    speak(g, cb, rng, c, p, 'taboo');
  }
}
const helpless = (t: Unit) => !!(t.downed || t.surrendered);
/** Someone harmed a surrendered or Downed creature: judge marks them; the Mercy vow breaks; Nerukhan answers. */
function harmedHelpless(cb: Combat, by: Unit, t: Unit) {
  fs(by).harmedHelpless = true;
  if (vowOn(by, 'mercy')) breakVow(cb, by, 'harmed ' + t.name + ', who ' + (t.surrendered ? 'had yielded' : 'was down'));
  for (const f of intervening(cb, 'nerukhan')) { if (f.side === by.side || by.dead) continue; intervene(cb, f, 'enemy_harms_helpless', by, () => harmLine(cb, f, by, 20 * (f.blessPower || 1), 'soul')); break; }
}
const nearestEnemy = (cb: Combat, u: Unit) => cb.units.filter((v) => v.side !== u.side && alive(v)).reduce((m, v) => Math.min(m, dist(v.pos, u.pos)), 99);

// ---------- vows (spec 1.6 §5; item 602) ----------
function breakVow(cb: Combat, u: Unit, why: string) {
  const v = u.vow; if (!v || v.state !== 'sworn') return;
  const c = unitChar(u); if (!c) return; v.state = 'broken'; if (c.vow) c.vow = { ...v };
  emitFx(cb, FAITH_FX.vow, { unit: u.id, char: c.id, id: v.id, state: 'broken', ...(v.allyId ? { allyId: v.allyId } : {}) });
  cb.log.push(u.name + ' breaks the vow "' + (VOW[v.id]?.words || v.id) + '" (' + why + ').');
  shiftDevotion(G(), cb, c, -(FAITH_RULES.devotion?.loss?.vow_broken ?? 2), 'vow broken');
  const p = patronOf(c); if (p) speak(G(), cb, rngOf(), c, p, 'vow_broken');
}
const vowOn = (u: Unit | null | undefined, id: string) => !!u?.vow && u.vow.state === 'sworn' && u.vow.id === id;

// ---------- interventions (spec 1.6 §8; item 603) ----------
/** Faithful fighters on this fight whose patron may still intervene (Witnessed, not yet this fight). */
function intervening(cb: Combat, patronId: string): Unit[] {
  return cb.units.filter((f) => f.charId && !f.dead && condOn(f, 'witnessed') && !fs(f).intervened && patronOf(unitChar(f) || ({} as Character))?.id === patronId);
}
function intervene(cb: Combat, f: Unit, trigger: string, target: Unit | null, run: () => string) {
  const c = unitChar(f)!, p = patronOf(c)!; fs(f).intervened = true;
  emitFx(cb, FAITH_FX.intervention, { patron: p.id, trigger, at: (target || f).pos, target: target?.id || null, unit: f.id });
  cb.log.push(p.name + ' intervenes for ' + f.name + run() + '.');
  speak(G(), cb, rngOf(), c, p, 'intervention');
}

// ---------- shared hooks (registered once; run on every fight after the items) ----------
let registered = false;
export function registerFaithHooks() {
  if (registered) return; registered = true;
  // Damage: who harmed the helpless (judge, Nerukhan), betrayal, burn, storm, the Mercy vow; Red Thread and the
  // Matchmaker's share; the Toll-Keeper and Hold the Gate keep allies standing.
  onHook('damage_in', (ctx, cb) => {
    const t: Unit = ctx.t, src = ctx.src || {}, by: Unit | null = src.by || null;
    if (ctx.phase === 'reduce') {
      ctx.faithHelpless = helpless(t);
      // A Downed creature takes the hit as a failed death save (no 'after' phase): it is harmed here.
      if (t.downed && ctx.dmg > 0 && by && by.side !== t.side) { ctx.faithHelplessDone = true; harmedHelpless(cb, by, t); }
      if (ctx.dmg > 0 && !src.faithShare && ctx.hostile) {
        // Red Thread: half of a hit on one of a linked pair moves to the other (item 615).
        const link = (cb as any).faithLinks?.find((l: any) => l.until >= cb.round && (l.a === t.id || l.b === t.id));
        const other = link ? cb.units.find((x) => x.id === (link.a === t.id ? link.b : link.a)) : null;
        if (other && alive(other)) { const half = Math.floor(ctx.dmg / 2); if (half > 0) { ctx.dmg -= half; applyDamage(cb, other, half, { ...src, faithShare: true, shield: true } as any); cb.log.push('Red Thread: ' + other.name + ' takes ' + half + ' of the hit on ' + t.name + '.'); } }
        // The Matchmaker's intervention: an ally next to you is hit, half moves to you.
        else for (const f of intervening(cb, 'the_matchmaker')) {
          if (f === t || f.side !== t.side || dist(f.pos, t.pos) > 1 || !alive(f)) continue;
          const half = Math.floor(ctx.dmg / 2); if (half <= 0) break;
          ctx.dmg -= half;
          intervene(cb, f, 'ally_hit_adjacent', t, () => { applyDamage(cb, f, half, { ...src, faithShare: true } as any); return ': ' + f.name + ' takes ' + half + ' of the hit on ' + t.name; });
          faithTag(cb, f, 'protect'); break;
        }
      }
    }
    if (ctx.phase === 'would_drop_to_0' && ctx.floor == null && !ctx.self) {
      if ((cb as any).faithGates?.some((gt: any) => gt.side === t.side && gt.ids.includes(t.id))) { ctx.floor = 1; cb.log.push('Hold the Gate: ' + t.name + ' stays at 1 HP.'); return; }
      for (const f of intervening(cb, 'toll_keeper')) { if (f.side !== t.side || t.companion) continue; ctx.floor = 1; intervene(cb, f, 'ally_would_die', t, () => ': ' + t.name + ' stays at 1 HP'); break; }
    }
    if (ctx.phase === 'after' && ctx.dealt > 0 && by) {
      if (ctx.faithHelpless && !ctx.faithHelplessDone && by.side !== t.side) harmedHelpless(cb, by, t);
      if (by !== t && by.side === t.side && !src.faithShare && !['hazard', 'trap', 'bleed', 'burn', 'short'].includes(src.type)) faithTag(cb, by, 'betray');
      if (src.dmgType === 'fire') faithTag(cb, by, 'burn');
      if (src.dmgType === 'lightning' || src.dmgType === 'storm') faithTag(cb, by, 'storm');
    }
  });
  onHook('on_damaged', (ctx, cb) => { // Mother Ember: an ally drops below a quarter HP
    const t: Unit = ctx.t; if (t.dead || t.hp <= 0 || ctx.prevHp < t.maxHp / 4 || t.hp >= t.maxHp / 4) return;
    for (const f of intervening(cb, 'mother_ember')) { if (f.side !== t.side) continue; intervene(cb, f, 'ally_below_quarter', t, () => ': ' + t.name + healLine(cb, f, t, 15 * (f.blessPower || 1))); break; }
  });
  onHook('on_downed', (ctx, cb) => {
    const v: Unit = ctx.victim, by: Unit | null = ctx.by;
    if (by && v.side !== by.side && fs(v).harmedHelpless) faithTag(cb, by, 'judge');
    if (by && v.side !== by.side && (v.surrendered || (v.dead && v.downed))) faithTag(cb, by, 'kill', { victimHelpless: true });
    for (const u of cb.units) if (u.vow?.state === 'sworn' && u.vow.id === 'shield' && (u.vow.allyId === v.id || u.vow.allyId === v.charId) && !v.dead === !!v.downed) breakVow(cb, u, v.name + ' is down');
  });
  onHook('on_kill', (ctx, cb) => {
    const v: Unit = ctx.victim, by: Unit = ctx.by;
    faithTag(cb, by, 'kill', { victimHelpless: !!(v.surrendered || v.downed) });
    for (const f of intervening(cb, 'old_overcast')) {
      if (f !== by) continue;
      const n = cb.units.filter((x) => x.side !== f.side && alive(x) && x !== v).sort((a, b) => dist(a.pos, v.pos) - dist(b.pos, v.pos))[0]; if (!n) break;
      intervene(cb, f, 'you_kill', n, () => harmLine(cb, f, n, 20 * (f.blessPower || 1), 'elemental', 'lightning')); break;
    }
  });
  onHook('heal_given', (ctx, cb) => { const by: Unit | null = ctx.by, t: Unit = ctx.t; if (by && t !== by && t.side === by.side && (ctx.n > 0 || ctx.revived)) { faithTag(cb, by, 'heal'); if (ctx.kind === 'stim') faithTag(cb, by, 'supply'); } });
  onHook('shield_grant', (ctx, cb) => { const by: Unit | null = ctx.by, t: Unit = ctx.t; if (by && t !== by && t.side === by.side && ctx.n > 0) faithTag(cb, by, 'protect'); });
  onHook('braced', (ctx, cb) => faithTag(cb, ctx.u, 'protect'));
  onHook('on_surrender', (ctx, cb) => { if (ctx.by) faithTag(cb, ctx.by, 'mercy'); });
  onHook('hide', (ctx, cb) => faithTag(cb, ctx.u, 'trick'));
  onHook('gift', (ctx, cb) => { const by: Unit | null = ctx.by || ctx.from || ctx.u; if (by) faithTag(cb, by, 'supply'); });
  onHook('cond_landed', (ctx, cb) => { if (ctx.id === 'burning' && ctx.by) faithTag(cb, ctx.by, 'burn'); });
  onHook('object_destroyed', (ctx, cb) => { const o: any = ctx.obj; if (ctx.by && (o?.holy || (o?.tags || []).includes('holy'))) faithTag(cb, ctx.by, 'desecrate'); });
  onHook('moved', (ctx, cb) => {
    const u: Unit = ctx.u; const st = u.faith;
    if (st?.dugIn && st.dugIn !== u.pos) delete st.dugIn; // Dig In ends when they move
    if (ctx.how === 'disengage' && nearestEnemy(cb, u) > nearestOf(cb, u, ctx.from)) faithTag(cb, u, 'flee');
    if (st?.safePassage) delete st.safePassage;
  });
  onHook('move_cost', (ctx, cb) => { if (ctx.u?.faith?.safePassage === turnKey(cb)) ctx.skipOA = true; });
  onHook('turn_start', (ctx, cb) => {
    const u: Unit = ctx.u;
    if (u.vow?.state === 'sworn' && u.vow.id === 'stand') fs(u).standFrom = nearestEnemy(cb, u);
    fs(u).apMark = u.ap; // Encore: the AP of the last action
    // Expiring "until your next turn" effects cast by this unit.
    const x: any = cb; if (x.faithGates) x.faithGates = x.faithGates.filter((gt: any) => gt.by !== u.id);
    if (x.faithClouds) x.faithClouds = x.faithClouds.filter((cl: any) => cl.by !== u.id);
    // Hearthlight: allies starting a turn in it heal 10 × power.
    for (const z of x.faithZones || []) if (z.until >= cb.round && z.side === u.side && z.tiles.includes(u.pos) && !u.dead) cb.log.push('Hearthlight: ' + u.name + healLine(cb, cb.units.find((v) => v.id === z.by) || null, u, z.heal));
  });
  onHook('turn_end', (ctx, cb) => {
    const u: Unit = ctx.u; if (!u.charId) return;
    if (u.braced || u.overwatch || condOn(u, 'anchored')) faithTag(cb, u, 'hold');
    if (u.hidden && cb.units.some((v) => v.side === u.side && v !== u && v.downed && !v.dead)) faithTag(cb, u, 'cower');
    if (u.vow?.state === 'sworn' && u.vow.id === 'stand' && fs(u).standFrom != null && nearestEnemy(cb, u) > fs(u).standFrom) breakVow(cb, u, 'ended the turn farther from the enemy');
  });
  onHook('round_start', (_ctx, cb) => {
    const x: any = cb;
    if (x.faithOrderRestore) { const keep = x.faithOrderRestore as string[]; x.faithOrderRestore = null; const extra = [...new Set(cb.order)].filter((id) => !keep.includes(id)); cb.order = [...keep, ...extra]; } // Rewoven ends
    if (x.faithZones) x.faithZones = x.faithZones.filter((z: any) => z.until >= cb.round);
  });
  onHook('action_done', (ctx, cb) => { // Encore: the AP the last action took
    const u: Unit = ctx.u; if (!u) return; const st = fs(u);
    if (st.apMark != null) { st.lastSpent = Math.max(0, st.apMark - u.ap); st.lastRound = cb.round; } st.apMark = u.ap;
    st.acted = true;
    if (u.charId && /^combat\/(perk|move)$/.test(ctx.a?.type || '') && /trick|illusion|false_image|feint|swap|sleight/.test(String(ctx.a?.id || ctx.a?.key || ''))) faithTag(cb, u, 'trick');
  });
  // Attacks: Witnessed's +2 (item 595), Dig In's half cover, Luck, Smitten, the Bare Hands vow.
  onHook('attack_preview', (hk, cb) => {
    const att: Unit = hk.att, tgt: Unit = hk.tgt; if (!att || !tgt) return;
    if (condOn(att, 'smitten')) { const src = condSource(att, 'smitten'); const linked = (cb as any).faithLinks?.some((l: any) => l.until >= cb.round && [l.a, l.b].includes(tgt.id) && [l.a, l.b].includes(src)); if (src && (tgt.id === src || linked)) hk.fail = 'Smitten: you can\'t attack them.'; }
    if (tgt.faith?.dugIn === tgt.pos && !hk.melee) hk.terms.push({ v: -5, label: 'Dug in (half cover)' });
    if (att.faith?.luck) hk.terms.push({ v: att.faith.luck, label: 'Luck (Whisper)' });
    if (att.charId && condOn(att, 'witnessed') && tgt.side !== att.side && likedAttack(cb, att, tgt)) hk.terms.push({ v: 2, label: 'Witnessed' });
  });
  onHook('attack_roll', (rc, cb) => {
    const att: Unit = rc.att, tgt: Unit = rc.tgt;
    if (att.faith?.luck) delete att.faith.luck;
    if (tgt?.faith?.foreknown && att.side !== tgt.side) { delete tgt.faith.foreknown; rc.hit = false; cb.log.push('Foreknowing: the attack on ' + tgt.name + ' misses.'); return; }
    if (vowOn(att, 'bare') && !isMelee(WEAPON[att.weapon]) && rc.mode !== 'melee') breakVow(cb, att, 'attacked with a gun');
    // Lucky Break: the next failed attack roll is rerolled at +5.
    if (att.faith?.luckyBreak && rc.hit !== true) {
      const fails = rc.die === 1 || (rc.die < rc.critMin && rc.die + rc.toHit < rc.need);
      if (fails) { delete att.faith.luckyBreak; const r = d20(rc.rng || rngOf()); rc.die = r; rc.hit = r !== 1 && (r >= rc.critMin || r + rc.toHit + 5 >= rc.need); cb.log.push('Lucky Break: ' + att.name + ' rerolls (d20 ' + r + ' +5).'); }
    }
    if (!tgt || att.side === tgt.side) return;
    for (const f of intervening(cb, 'the_laughing_mask')) { if (f !== tgt || rc.die !== 1) continue; intervene(cb, f, 'enemy_nat1', att, () => applyCond(cb, rc.rng || rngOf(), f, att, 'prone', undefined, undefined, { skipSave: true })); break; }
    for (const f of intervening(cb, 'counting_weaver')) { if (f !== tgt || !(rc.die === 20 || rc.die >= rc.critMin)) continue; intervene(cb, f, 'enemy_crits_you', att, () => ': the critical becomes a normal hit'); rc.die = 19; rc.critMin = 21; rc.hit = true; break; }
  });
  const dry = (ctx: any, cb: Combat) => { // the Quartermaster: your gun runs dry, it reloads free
    const u: Unit = ctx.att; const w = WEAPON[u?.weapon]; if (!u || !w || w.magazine == null || u.ammo > 0) return;
    for (const f of intervening(cb, 'the_quartermaster')) { if (f !== u) continue; intervene(cb, f, 'ammo_dry', f, () => freeReload(cb, f)); break; }
  };
  onHook('on_hit', dry); onHook('on_miss', dry);
  onHook('glyph_drawn', (ctx, cb) => { if (vowOn(ctx.u, 'unarmed_faith')) breakVow(cb, ctx.u, 'drew a glyph'); });
  onHook('evoked', (ctx, cb) => { if (vowOn(ctx.u, 'unarmed_faith')) breakVow(cb, ctx.u, 'Evoked a spell'); if (vowOn(ctx.u, 'bare')) breakVow(cb, ctx.u, 'attacked with a spell'); });
  onHook('outburst_begin', (ctx, cb) => { if (vowOn(ctx.u, 'unarmed_faith')) breakVow(cb, ctx.u, 'Began an Outburst'); });
  onHook('outburst_release', (ctx, cb) => {
    if (vowOn(ctx.u, 'bare')) breakVow(cb, ctx.u, 'attacked with a spell');
    const clouds = (cb as any).faithClouds?.some((cl: any) => cl.side === ctx.u.side);
    if (clouds && (ctx.tone?.id || ctx.tone) === 'storm') fs(ctx.u).cloudsNow = true; // Gather the Clouds (read by the rider_stage query below)
  });
  onStat('rider_stage', (x) => { const u = x.u; if (u?.faith?.cloudsNow) { delete u.faith.cloudsNow; return 1; } return 0; });
  onHook('spot', (ctx) => { if (ctx.by?.faith?.guidance) { ctx.mod += 2; delete ctx.by.faith.guidance; } });
  // The story: Luck, Lucky Break and Guidance on the next check (item 608).
  onCheck((x, ck) => {
    const c = x.c; const st: any = c && !x.u ? (c as any).state?.faith : null; if (!st) return [];
    const out: { add: number; label: string }[] = [];
    if (st.luck) out.push({ add: st.luck, label: 'Luck (Whisper)' });
    if (st.luckyBreak) out.push({ add: 5, label: 'Lucky Break' });
    if (st.guidance && (ck?.skills || []).some((k: string) => SKILL[k]?.attribute === 'perception')) out.push({ add: 2, label: 'Guidance' });
    return out;
  });
}
const nearestOf = (cb: Combat, u: Unit, at: string) => cb.units.filter((v) => v.side !== u.side && alive(v)).reduce((m, v) => Math.min(m, dist(v.pos, at)), 99);
/** Would this attack carry a tag the attacker's patron likes (Witnessed's +2, item 595)? */
function likedAttack(cb: Combat, att: Unit, tgt: Unit): boolean {
  const p = patronOf(unitChar(att) || ({} as Character)); if (!p) return false; const likes: string[] = p.likes || [];
  const dt = (WEAPON[att.weapon] as any)?.damage_type || 'physical';
  return likes.includes('kill') || (likes.includes('judge') && !!tgt.faith?.harmedHelpless) || (likes.includes('burn') && dt === 'fire') || (likes.includes('storm') && dt === 'lightning');
}
function harmLine(cb: Combat, by: Unit, t: Unit, n: number, type: 'soul' | 'elemental', dmgType?: string): string {
  return harm(cb, rngOf(), by, t, Math.round(n), type, dmgType);
}
function healLine(cb: Combat, by: Unit | null, t: Unit, n: number): string {
  const r = healUnit(cb, t, Math.round(n), by, 'blessing'); return r.revived ? ' stands again at ' + t.hp + ' HP' : ' heals ' + r.restored;
}
/** Reload a fighter's weapon at no AP (the Quartermaster: its intervention, Resupply). */
function freeReload(cb: Combat, u: Unit): string {
  const w = WEAPON[u.weapon]; if (!w || w.magazine == null) return ': nothing to reload';
  const was = u.ap; u.ap = 99; const err = reload(cb, u); u.ap = was;
  return err ? ': ' + err : ': ' + u.name + ' reloads, free';
}

// ---------- prayer in a fight (combat/pray, faith/pray with a unit) ----------
export interface CombatPrayArgs { kind?: PrayerKind; id?: string; targetId?: string; targetId2?: string; tile?: string; choice?: string; miracle?: boolean }
/** Pray in a fight. Returns an error, or null. Legacy combat/pray ({choice, miracle}) is a Hymn (or the Miracle). */
export function combatPray(cb: Combat, rng: Rng, u: Unit, a: CombatPrayArgs, g: GameState): string | null {
  const c = unitChar(u); if (!c) return 'Only a character can pray.';
  const kind: PrayerKind = a.kind || (a.miracle ? 'miracle' : 'hymn');
  const id = a.id || a.choice || (kind === 'miracle' ? patronOf(c)?.miracle?.id || '' : hymnsOf(patronOf(c))[0]?.id || '');
  const pv = previewPrayer(g, u.id, kind, id, a); if (!pv.ok) return pv.why || 'You can\'t pray that now.';
  const pe = prayerEntry(c, kind, id)!; const patron = pe.patron;
  // The target.
  const t = pickTarget(cb, u, pv, a); if (typeof t === 'string') return t;
  u.ap -= pv.ap;
  if (kind === 'whisper') fs(u).whisperTurn = turnKey(cb); else if (kind === 'hymn') u.prayedRound = cb.round;
  if (kind === 'miracle') { c.miracleSession = sessionN(g); }
  shiftMana(cb, PRAYER_MANA, 'a prayer');
  const name = (pe.entry.name || id) + (patron && kind !== 'whisper' ? ' (' + patron.name + ')' : '');
  const to = patron ? ' to ' + patron.name : '', what = pe.entry.name || id;
  let line = u.name + (kind === 'miracle' ? ' calls for a MIRACLE from ' + (patron?.name || '?') + ': ' + what : kind === 'whisper' ? ' whispers a prayer' + to + ': ' + what : ' prays to ' + (patron?.name || '?') + ': ' + what + ' (Hymn ' + (['', 'I', 'II', 'III'][pe.tier] || pe.tier) + ')');
  if (pv.roll) {
    const r = d20(rng), tot = r + pv.roll.mod, ok = r === 20 || (r !== 1 && tot >= pv.roll.tn);
    line += ' · d20 ' + r + ' ' + (pv.roll.mod >= 0 ? '+' : '−') + Math.abs(pv.roll.mod) + ' = ' + tot + ' vs ' + pv.roll.tn + (pv.mode === 'overreach' ? ' (overreach)' : '');
    if (!ok) {
      emitFx(cb, FAITH_FX.prayer_fail, { unit: u.id, kind, id, patron: patron?.id || null, at: u.pos, why: pv.mode === 'overreach' ? 'overreach' : 'dice' });
      cb.log.push(line + ' · no answer.');
      if (pv.mode === 'overreach') { shiftDevotion(g, cb, c, OVERREACH.miss, 'a failed overreach'); speak(g, cb, rng, c, patron, 'refused'); }
      return null;
    }
  }
  const power = u.blessPower || blessingPower(c);
  emitFx(cb, FAITH_FX.prayer, { unit: u.id, kind, id, patron: patron?.id || null, at: u.pos, target: typeof t === 'object' && t && 'id' in t ? (t as any).id : a.tile || null, ok: true });
  if (kind === 'miracle') emitFx(cb, FAITH_FX.miracle, { patron: patron.id, id: pe.entry.id, at: a.tile || u.pos, area: a.tile ? area3(a.tile) : null, unit: u.id });
  line += runEntry(cb, rng, u, kind, pe, t, a, power);
  if (kind === 'miracle') shiftDevotion(g, cb, c, -devotionNow(c), 'the Miracle spends it all'); // after the effect: its own tags give nothing back
  cb.log.push(line + '.');
  if (patron && kind !== 'whisper') speak(g, cb, rng, c, patron, kind === 'miracle' ? 'miracle' : 'answered');
  // Witnessed (Faith 5): after your own patron's Hymn or a Miracle (item 604).
  if (kind !== 'whisper' && beliefOf(c).kind === 'faithful' && patron?.id === patronOf(c)?.id && faithOf(c) >= WITNESS_FAITH) {
    applyCond(cb, rng, u, u, 'witnessed', 1, undefined, { skipSave: true });
    emitFx(cb, FAITH_FX.witnessed, { unit: u.id, patron: patron.id, at: u.pos });
    speak(g, cb, rng, c, patron, 'witnessed');
  }
  return null;
}
type Target = Unit | null | { units: Unit[] };
function pickTarget(cb: Combat, u: Unit, pv: PrayerPreview, a: CombatPrayArgs): Target | string {
  const byId = (id?: string) => (id ? cb.units.find((x) => x.id === id) || null : null);
  switch (pv.target) {
    case 'self': case 'none': return u;
    case 'tile': {
      if (!a.tile) return 'Pick a tile in sight.';
      if (!unitSees(cb, u, a.tile)) return 'You can\'t see that tile.';
      return null;
    }
    case 'two_units': case 'two_allies': {
      const x = byId(a.targetId), y = byId(a.targetId2);
      if (!x || !y || x === y || !pv.targets.includes(x.id) || !pv.targets.includes(y.id)) return 'Pick two ' + (pv.target === 'two_allies' ? 'allies' : 'units') + ' in sight.';
      if (pv.target === 'two_units' && (dist(x.pos, u.pos) > 6 || dist(y.pos, u.pos) > 6)) return 'Both must be within 6 tiles of you.';
      if (pv.target === 'two_allies' && pv.name === 'Together' && dist(x.pos, y.pos) > 1) return 'Together: pick two allies next to each other.';
      return { units: [x, y] };
    }
    default: {
      const t = a.targetId ? byId(a.targetId) : pv.target === 'self_or_ally' || pv.target === 'ally' ? u : null;
      if (!t) return pv.target === 'enemy' ? 'Pick an enemy in sight.' : 'Pick someone in sight.';
      if (!pv.targets.includes(t.id) && !(t === u && pv.target !== 'enemy' && pv.target !== 'downed_ally' && pv.target !== 'dead_ally')) return 'Not a valid target: ' + t.name + '.';
      return t;
    }
  }
}
const area3 = (tile: string) => { const [x, y] = tile.split(',').map(Number), out: string[] = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push((x + i) + ',' + (y + j)); return out; };
/** A Blessing lands on a unit: 'blessing_in' first (Blessed Shells may load it; Factory Made and The Old Blood change the
 * power), then the effect. */
function land(cb: Combat, rng: Rng, u: Unit, t: Unit, entry: any, power: number, run: (power: number) => string): string {
  const ctx: any = emit(cb, 'blessing_in', { u, t, blessing: entry, power, handled: false, out: '', cb, rng });
  if (ctx.handled) return ctx.out || '';
  return run(Math.max(0, ctx.power ?? power));
}
const enemiesIn = (cb: Combat, u: Unit, tiles: string[]) => cb.units.filter((v) => v.side !== u.side && !v.dead && !v.surrendered && tiles.includes(v.pos));
function rollSaveVs(rng: Rng, by: Unit, t: Unit, fam: 'body' | 'brain' | 'heart'): { ok: boolean; text: string } {
  const r = d20(rng), m = unitSave(t, fam), tn = 12 + unitDebuff(by, fam), ok = r === 20 || (r !== 1 && r + m >= tn);
  return { ok, text: fam + ' save ' + (r + m) + ' vs ' + tn };
}
/** Run a Whisper, Hymn or Miracle's effect (spec 1.6 §3 and §8; items 607-617). */
function runEntry(cb: Combat, rng: Rng, u: Unit, kind: PrayerKind, pe: { entry: any; patron: any }, t: Target, a: CombatPrayArgs, power: number): string {
  const e = pe.entry, id = e.id, one = t && !('units' in (t as any)) ? (t as Unit) : null, two = t && 'units' in (t as any) ? (t as any).units as Unit[] : [];
  const allies = cb.units.filter((v) => v.side === u.side && !v.dead && !v.companion);
  const P = (n: number) => Math.round(n * power);
  if (kind === 'whisper') {
    const x = one || u;
    switch (id) {
      case 'luck': fs(x).luck = 2; return ' · ' + x.name + ': +2 on the next roll';
      case 'health': return land(cb, rng, u, x, e, power, (pw) => ' · ' + x.name + healLine(cb, u, x, 15 * pw));
      case 'protection': return land(cb, rng, u, x, e, power, (pw) => ' · ' + x.name + ' gains a ' + grantShield(cb, x, 15 * pw, u) + ' shield');
      case 'courage': { const had = ['fear', 'shaken'].filter((k) => condOn(x, k)); for (const k of had) endCond(x, k, cb); return ' · ' + x.name + (had.length ? ' steadies (' + had.join(', ') + ' ended)' : ' was already steady'); }
      case 'guidance': {
        let out = '';
        for (const v of cb.units) if (v.side !== u.side && v.hidden && dist(v.pos, u.pos) <= 6) out += reveal(cb, v, 'Guidance');
        for (const o of (cb.objects || []) as any[]) if (o.hidden && /trap|mine/.test(o.kind || '') && dist(o.pos, u.pos) <= 6) { const kb = (o.knownBy ||= []); if (!kb.includes(u.side)) kb.push(u.side); out += ' · a trap at ' + refOf(o.pos); }
        fs(u).guidance = true; return out + ' · +2 on your next spotting roll';
      }
      case 'safe_passage': fs(u).safePassage = turnKey(cb); return ' · your next move this turn draws no opportunity attacks';
    }
    return '';
  }
  switch (id) {
    // Holy Father Nerukhan
    case 'saints_shield': return land(cb, rng, u, one!, e, power, (pw) => ' · ' + one!.name + ' gains a ' + grantShield(cb, one!, 40 * pw, u) + ' shield');
    case 'judgement': return land(cb, rng, u, one!, e, power, (pw) => harmLine(cb, u, one!, 40 * pw * (one!.faith?.harmedHelpless ? 2 : 1), 'soul') + (one!.faith?.harmedHelpless ? ' (×2: it harmed the helpless)' : ''));
    case 'absolution': return land(cb, rng, u, one!, e, power, (pw) => { const ids = Object.keys(one!.conds || {}).filter((k) => !condIsBoon(k) && condOn(one!, k)); for (const k of ids) endCond(one!, k, cb); return ' · ' + one!.name + ' is absolved' + (ids.length ? ' (' + ids.join(', ') + ')' : '') + ' and' + healLine(cb, u, one!, 30 * pw); });
    case 'saints_verdict': { let out = ''; for (const v of cb.units.filter((x) => x.side !== u.side && !x.dead && x.faith?.harmedHelpless)) out += land(cb, rng, u, v, e, power, (pw) => harmLine(cb, u, v, 60 * pw, 'soul') + applyCond(cb, rng, u, v, 'stunned', 1, undefined, { skipSave: true })); return out || ' · nobody here harmed the helpless'; }
    // The Quartermaster
    case 'resupply': return land(cb, rng, u, one!, e, power, () => { const r = freeReload(cb, one!); const res = (one!.res ||= {}); if (res.supplies != null) res.supplies += 1; return r + (res.supplies != null ? ' · +1 Supply' : ''); });
    case 'dig_in': return land(cb, rng, u, one!, e, power, () => { fs(one!).dugIn = one!.pos; one!.braced = true; return ' · ' + one!.name + ' digs in (half cover until they move) and is Braced'; });
    case 'covering_fire': { let out = ''; for (const v of enemiesIn(cb, u, area3(a.tile!))) out += applyCond(cb, rng, u, v, 'pinned', 1, 'body'); return out || ' · nobody in the area'; }
    case 'requisition_approved': { let out = ''; for (const v of allies.filter((x) => x.charId)) { out += freeReload(cb, v); const res = (v.res ||= {}); if (res.supplies != null) res.supplies = Math.max(res.supplies, 3); const ch = unitChar(v); if (ch) ch.pack = [...(ch.pack || []), { id: 'standard_core', item: 'standard_core', name: ITEM.standard_core?.name || 'Standard mana core', qty: 1, kind: 'ammo' } as any]; bankAp(v, 2, 'Requisition Approved', cb, u); } return out + ' · every ally +2 AP next turn'; }
    // The Laughing Mask
    case 'lucky_break': fs(one!).luckyBreak = true; return ' · ' + one!.name + '\'s next failed attack roll is rerolled at +5';
    case 'switcheroo': {
      const [x, y] = two; for (const v of [x, y]) if (v.side !== u.side) { const s = rollSaveVs(rng, u, v, 'brain'); if (s.ok) return ' · ' + v.name + ' resists (' + s.text + ')'; }
      const px = x.pos; x.pos = y.pos; y.pos = px; faithTag(cb, u, 'trick'); return ' · ' + x.name + ' and ' + y.name + ' swap places';
    }
    case 'pratfall': { const s = rollSaveVs(rng, u, one!, 'body'); if (s.ok) return ' · ' + one!.name + ' keeps its feet (' + s.text + ')'; return applyCond(cb, rng, u, one!, 'prone', undefined, undefined, { skipSave: true }) + applyCond(cb, rng, u, one!, 'disarmed', undefined, undefined, { skipSave: true }); }
    case 'encore': { let out = ''; for (const v of allies) { const st = v.faith; if (st?.lastRound === cb.round && st.lastSpent > 0) { bankAp(v, st.lastSpent, 'Encore', cb, u); out += ' · ' + v.name + ' +' + st.lastSpent + ' AP'; } } return out || ' · nobody has acted yet this round'; }
    // The Toll-Keeper
    case 'coin_for_the_ferry': return land(cb, rng, u, one!, e, power, (pw) => ' · ' + one!.name + healLine(cb, u, one!, 10 * pw));
    case 'hold_the_gate': { const ids = allies.filter((v) => v === u || unitSees(cb, u, v.pos)).map((v) => v.id); ((cb as any).faithGates ||= []).push({ by: u.id, side: u.side, ids }); return ' · ' + ids.length + ' allies can\'t drop below 1 HP until your next turn'; }
    case 'last_crossing': {
      const v = one!; if (v.hp > v.maxHp / 4) return ' · ' + v.name + ' is not near enough to the shore (above a quarter HP)';
      if (v.tier === 'boss') return harmLine(cb, u, v, P(40), 'soul') + ' (a boss: 40 Soul)';
      const s = rollSaveVs(rng, u, v, 'heart'); if (s.ok) return ' · ' + v.name + ' holds on (' + s.text + ')';
      applyDamage(cb, v, v.hp + (v.shield || 0), { by: u, type: 'true', shield: false, credit: 'hp' }); return ' · ' + v.name + ' crosses over (' + s.text + ')';
    }
    case 'turned_back': { const v = one!; if (!v.dead) return ' · ' + v.name + ' has not crossed'; v.dead = false; v.downed = false; v.hp = 1; v.saves = { ok: 0, fail: 0 }; const ch = unitChar(v); if (ch) ch.dead = false; return ' · ' + v.name + ' is turned back at the shore (1 HP)'; }
    // Mother Ember
    case 'warm_hands': return land(cb, rng, u, one!, e, power, (pw) => ' · ' + one!.name + healLine(cb, u, one!, 40 * pw));
    case 'hearthlight': ((cb as any).faithZones ||= []).push({ by: u.id, side: u.side, tiles: area3(a.tile!), until: cb.round + 2, heal: P(10) }); return ' · a hearth glows at ' + refOf(a.tile!) + ' for 3 rounds';
    case 'feed_the_fire': return land(cb, rng, u, one!, e, power, () => { one!.ap = Math.min(AP_MAX, one!.ap + 1); const had = ['weakened', 'slowed'].filter((k) => condOn(one!, k)); for (const k of had) endCond(one!, k, cb); return ' · ' + one!.name + ' +1 AP' + (had.length ? ', ' + had.join(' and ') + ' ended' : ''); });
    case 'everyone_home': { let out = ''; for (const v of cb.units.filter((x) => x.side === u.side && !x.dead)) out += ' · ' + v.name + healLine(cb, u, v, v.maxHp); return out; }
    // Old Overcast
    case 'thunderclap': { let out = ''; const from = { pos: a.tile } as any as Unit; for (const v of cb.units.filter((x) => x.side !== u.side && !x.dead && dist(x.pos, a.tile!) <= 2)) out += pushAway(cb, from, v, 1) + applyCond(cb, rng, u, v, 'shaken', undefined, 'heart'); return out || ' · nobody there'; }
    case 'lightning_rod': return land(cb, rng, u, one!, e, power, (pw) => { let out = harmLine(cb, u, one!, 50 * pw, 'elemental', 'lightning'); const n = cb.units.filter((x) => x.side !== u.side && alive(x) && x !== one && dist(x.pos, one!.pos) <= 2).sort((p, q) => dist(p.pos, one!.pos) - dist(q.pos, one!.pos))[0]; if (n) out += ' · it chains to ' + n.name + harmLine(cb, u, n, 25 * pw, 'elemental', 'lightning'); return out; });
    case 'gather_the_clouds': ((cb as any).faithClouds ||= []).push({ by: u.id, side: u.side }); return ' · until your next turn, your side\'s Storm riders count a stage higher';
    case 'the_sky_answers': { let out = ''; for (const v of cb.units.filter((x) => !x.dead && area3(a.tile!).includes(x.pos))) out += harmLine(cb, u, v, P(80), 'elemental', 'lightning') + applyCond(cb, rng, u, v, 'shaken', undefined, undefined, { skipSave: true }); return out || ' · the sky strikes empty ground'; }
    // The Matchmaker
    case 'red_thread': { const [x, y] = two; ((cb as any).faithLinks ||= []).push({ a: x.id, b: y.id, until: cb.round + 1, by: u.id }); return ' · ' + x.name + ' and ' + y.name + ' are bound by a red thread for 2 rounds'; }
    case 'sweet_nothings': return applyCond(cb, rng, u, one!, 'smitten', 1, 'heart');
    case 'together': { const [x, y] = two; return applyCond(cb, rng, u, x, 'inspired', 1, undefined, { skipSave: true }) + applyCond(cb, rng, u, x, 'guarded', 1, undefined, { skipSave: true }) + applyCond(cb, rng, u, y, 'inspired', 1, undefined, { skipSave: true }) + applyCond(cb, rng, u, y, 'guarded', 1, undefined, { skipSave: true }); }
    case 'love_conquers': { let out = ''; for (const v of cb.units.filter((x) => x.side !== u.side && canSurrender(x) && unitSees(cb, u, x.pos))) { const s = rollSaveVs(rng, u, v, 'heart'); out += s.ok ? ' · ' + v.name + ' resists (' + s.text + ')' : surrender(cb, v, u, 'Love Conquers'); } return out || ' · nobody here can be won over'; }
    // The Counting Weaver
    case 'foreknowing': fs(one!).foreknown = true; return ' · the next attack on ' + one!.name + ' will miss';
    case 'unravel': { const v = one!; const ids = Object.keys(v.conds || {}).filter((k) => condIsBoon(k) && condOn(v, k)); for (const k of ids) endCond(v, k, cb); const had = !!v.shield; v.shield = 0; v.braced = false; v.overwatch = null; if (v.hidden) v.hidden = false; return ' · ' + v.name + ' is unravelled' + (ids.length || had ? ' (' + [...ids, ...(had ? ['shield'] : [])].join(', ') + ')' : ''); }
    case 'cut_short': { const v = one!; if (v.tier === 'boss') { apDebt(v, 2); return ' · ' + v.name + ' loses 2 AP on its next turn (a boss)'; } return applyCond(cb, rng, u, v, 'stunned', 1, 'heart'); }
    case 'rewoven': {
      const x: any = cb; if (!x.faithOrderRestore) x.faithOrderRestore = [...cb.order];
      const ids = cb.order.filter((id) => allies.some((v) => v.id === id && alive(v)));
      cb.order.splice(cb.turn + 1, 0, ...ids); return ' · ' + ids.length + ' allies act once more, right after this turn';
    }
  }
  // Not one of the launch Hymns: its data effects run (tactics.ts blessing: heal, Soul damage, shield, a condition,
  // cleanse); what they can't do goes to the Narrator (CLAUDE.md: never silently ignore).
  if (one) return legacyBlessing(cb, rng, u, one, e, power);
  (cb.notes ||= []).push('PRAYER ' + (e.name || id) + ' (' + u.name + ', r' + cb.round + '): ' + (e.text || '') + ' — yours to rule');
  return ' · (the Narrator rules it)';
}

// ---------- the end of a fight: vows kept or broken, mercy and flight (items 599, 601, 602) ----------
/** Settle a fight's faith (finishCombat and the Proving Ground's sandboxOver call it, before the fighters go home). */
export function faithFightEnd(g: GameState, cb: Combat) {
  const extracted = (cb.over as string) === 'extracted';
  for (const u of cb.units) {
    if (!u.charId) continue; const c = g.characters[u.charId]; if (!c) continue;
    if (patronOf(c) && !u.dead) {
      // Mercy: a surrendered enemy is still alive and this fighter never harmed the helpless.
      if (cb.units.some((v) => v.side !== u.side && v.surrendered && !v.dead) && !fs(u).harmedHelpless) faithTag(cb, u, 'mercy');
      if (extracted) faithTag(cb, u, 'flee');
    }
    const v = u.vow;
    if (v?.state === 'sworn') {
      if (v.id === 'no_one_behind' && cb.units.some((x) => x !== u && x.side === u.side && !x.companion && x.downed && !x.dead)) breakVow(cb, u, 'an ally is still down');
      else if (!u.dead) {
        v.state = 'kept'; const p = patronOf(c);
        emitFx(cb, FAITH_FX.vow, { unit: u.id, char: c.id, id: v.id, state: 'kept', ...(v.allyId ? { allyId: v.allyId } : {}) });
        cb.log.push(u.name + ' kept the vow "' + (VOW[v.id]?.words || v.id) + '".');
        shiftDevotion(g, cb, c, FAITH_RULES.devotion?.gain?.vow_kept ?? 1, 'vow kept');
        if (p) speak(g, cb, g.rng as Rng, c, p, 'vow_kept');
      }
    }
    c.vow = null;
  }
}

// ---------- the reducer: faith/* (game.ts routes a prayer in a fight through combat/pray) ----------
/** Apply a faith action. Returns an error to refuse it, or null. */
export function faithReduce(g: GameState, a: FaithAction, by: string): string | null {
  if (!B) return 'The faith rules are not ready.';
  const host = B.isHost(g, by);
  const mine = (id: string | undefined): Character | string => { const c = id ? g.characters[id] : null; if (!c) return 'No such character.'; if (c.owner !== by) return 'Not your character.'; if (c.dead) return 'The dead do nothing.'; return c; };
  const narr = (id: string): Character | string => { if (!host) return 'Only the Narrator does that.'; return g.characters[id] || 'No such character.'; };
  switch (a.type) {
    case 'faith/pray': { const c = mine(a.charId); return typeof c === 'string' ? c : storyPray(g, c, a); }
    case 'faith/vow': return swearVow(g, a, by);
    case 'faith/rite': { const c = mine(a.charId); return typeof c === 'string' ? c : keepRite(g, c, a.id); }
    case 'faith/pact': { const c = narr(a.charId); return typeof c === 'string' ? c : makePact(g, c, a.patron); }
    case 'faith/piece': { const c = narr(a.charId); return typeof c === 'string' ? c : grantPiece(g, c, a.patron, a.from); }
    case 'faith/devotion': { const c = narr(a.charId); return typeof c === 'string' ? c : narratorDevotion(g, c, a.delta, a.reason); }
    case 'faith/rite_kept': { const c = narr(a.charId); return typeof c === 'string' ? c : narratorRite(g, c, a.rite, a.patron); }
    case 'faith/apostasy': { const c = narr(a.charId); return typeof c === 'string' ? c : apostasy(g, c); }
  }
  return 'Unknown faith action.';
}

/** Swear a vow (round 1 of a fight, before the character first acts; one a fight; free). */
function swearVow(g: GameState, a: Extract<FaithAction, { type: 'faith/vow' }>, by: string): string | null {
  const cb = g.phase === 'combat' && g.combat && !g.combat.over ? g.combat : null; if (!cb) return 'Swear a vow at the start of a fight.';
  const u = cb.units.find((x) => x.id === a.unitId || x.charId === a.unitId); if (!u?.charId) return 'Only a character swears a vow.';
  const c = g.characters[u.charId]; if (!c || c.owner !== by) return 'Not your character.';
  if (beliefOf(c).kind !== 'faithful') return 'Only the Faithful swear vows.';
  const v = VOW[a.id]; if (!v) return 'No such vow.';
  if (u.vow) return 'One vow a fight.';
  if (cb.round !== 1 || fs(u).acted) return 'Swear a vow at the start of the fight, before you act.';
  if (u.dead || u.downed) return 'You can\'t swear anything right now.';
  let allyId: string | undefined;
  if (v.needs_ally) {
    const al = cb.units.find((x) => (x.id === a.allyId || (x.charId && x.charId === a.allyId)) && x !== u && x.side === u.side && !x.dead);
    if (!al) return 'Name the ally you shield.'; allyId = al.id;
  }
  u.vow = { id: v.id, ...(allyId ? { allyId } : {}), state: 'sworn' }; c.vow = { ...u.vow };
  if (v.id === 'stand') fs(u).standFrom = nearestEnemy(cb, u);
  emitFx(cb, FAITH_FX.vow, { unit: u.id, char: c.id, id: v.id, state: 'sworn', ...(allyId ? { allyId } : {}) });
  cb.log.push(u.name + ' swears a vow: "' + v.words + '"' + (allyId ? ' (' + cb.units.find((x) => x.id === allyId)!.name + ')' : '') + '.');
  return null;
}

/** An engine rite, kept from its button (once a session, +1 Devotion; a tithe gives up the item). */
function keepRite(g: GameState, c: Character, id: string): string | null {
  const p = patronOf(c); if (!p) return 'You have no patron.';
  const r = (p.rites || []).find((x: any) => x.id === id); if (!r) return 'No such rite.';
  const st = riteState(g, c, r); if (!st.available) return st.why || 'Not now.';
  let gave = '';
  if (r.check?.kind === 'tithe_item') {
    const pack = (c.pack || []).map((x: any) => ({ ...x })), it = pack.find((x: any) => tithable(x, r.check))!;
    it.qty -= 1; gave = ' (gives up ' + (it.name || ITEM[it.item || it.id]?.name || it.item || it.id) + ')'; c.pack = pack.filter((x: any) => x.qty > 0 || x.mags);
  }
  (c.ritesKept ||= {})[p.id + '.' + r.id] = sessionN(g);
  B!.push(g, { kind: 'system', charId: c.id, head: 'RITE · ' + String(r.name).toUpperCase(), text: c.name + ' keeps the rite of ' + p.name + ': ' + r.name + gave + '.' } as any);
  shiftDevotion(g, null, c, FAITH_RULES.devotion?.gain?.rite_kept ?? 1, 'rite: ' + r.name);
  B!.afterStory(g);
  return null;
}

// ---------- the Narrator's faith events (faith/pact, piece, devotion, rite_kept, apostasy; the turn's patrons field) ----------
const START_DEVOTION = (): number => PJ.devotion?.start ?? 3;
/** Make a pact (an Atheist converts; a Faithful changing patrons leaves the old pact first: item 607). */
export function makePact(g: GameState, c: Character, patronId: string): string | null {
  const p = FAITH_PATRON[patronId]; if (!p) return 'No such patron.';
  const b = beliefOf(c);
  if (b.kind === 'faithful' && b.patron === p.id) return c.name + ' is already sworn to ' + p.name + '.';
  if (b.kind === 'faithful') apostasy(g, c);
  let pieces: Record<string, number> = { ...(c.faithPieces || {}) }; const own = Math.max(0, Math.min(3, pieces[p.id] || 0)); delete pieces[p.id];
  let hymns = (c.hymns || []).filter((k) => !k.startsWith(p.id + '.'));
  if (p.rule === 'jealous') { pieces = {}; hymns = []; }
  const gain = (FAITH_RULES.devotion?.gain?.piece_on_conversion ?? 1) * own;
  c.belief = { kind: 'faithful', patron: p.id }; c.patron = p.id; c.devotion = Math.min(10, START_DEVOTION() + gain);
  c.faithPieces = pieces; c.hymns = hymns; c.faithRev = 16;
  B!.push(g, { kind: 'system', charId: c.id, head: 'PACT · ' + String(p.name).toUpperCase(), text: c.name + ' makes a pact with ' + p.name + ' (Devotion ' + c.devotion + (gain ? ': ' + START_DEVOTION() + ' + ' + gain + ' for what they already knew' : '') + ').' + (p.rule === 'jealous' ? ' ' + p.name + ' is Jealous: every other patron\'s Hymn is gone.' : '') } as any);
  storyFx(g, FAITH_FX.devotion, { char: c.id, delta: c.devotion, reason: 'a pact', now: c.devotion });
  speak(g, null, g.rng as Rng, c, p, 'conversion');
  return null;
}
/** A knowledge piece of a patron (an NPC of Faith above 5 taught it): unlocks that patron's next Hymn, by dice. */
export function grantPiece(g: GameState, c: Character, patronId: string, from?: string): string | null {
  const p = FAITH_PATRON[patronId]; if (!p) return 'No such patron.';
  const own = patronOf(c);
  if (own?.id === p.id) return c.name + ' is sworn to ' + p.name + ': their standing (Devotion) is what counts.';
  if (own?.rule === 'jealous') return own.name + ' is Jealous: ' + c.name + ' can\'t learn from other patrons.';
  const was = Math.max(0, Math.min(3, c.faithPieces?.[p.id] || 0)); if (was >= 3) return c.name + ' already knows all three of ' + p.name + '\'s Hymns.';
  const n = was + 1, h = (p.hymns || [])[n - 1];
  c.faithPieces = { ...(c.faithPieces || {}), [p.id]: n };
  if (h) c.hymns = [...new Set([...(c.hymns || []), p.id + '.' + h.id])];
  B!.push(g, { kind: 'system', charId: c.id, head: 'KNOWLEDGE · ' + String(p.name).toUpperCase(), text: c.name + ' learns of ' + p.name + (from ? ' from ' + String(from).slice(0, 60) : '') + ' (piece ' + n + ' of 3)' + (h ? ': the Hymn ' + h.name + ' can be prayed by dice (d20 + Faith vs ' + ATHEIST_TN[h.tier || n] + ')' : '') + '.' } as any);
  return null;
}
/** The Narrator moves Devotion (±2 at most a call, with a reason: breaking character, bringing in a believer). */
export function narratorDevotion(g: GameState, c: Character, delta: number, reason: string): string | null {
  const max = FAITH_RULES.devotion?.narrator_delta_max ?? 2, d = Math.round(Number(delta));
  if (beliefOf(c).kind !== 'faithful') return c.name + ' is an Atheist: no Devotion.';
  if (!Number.isFinite(d) || !d) return 'Move Devotion by 1 or 2.';
  if (Math.abs(d) > max) return 'The Narrator moves Devotion ' + max + ' at most a call.';
  const why = String(reason || '').trim().slice(0, 80); if (!why) return 'Give a reason.';
  shiftDevotion(g, g.phase === 'combat' && g.combat && !g.combat.over ? g.combat : null, c, d, why);
  return null;
}
/** A Narrator rite kept (once a session, +1). */
export function narratorRite(g: GameState, c: Character, rite: string, patronId?: string): string | null {
  const p = patronOf(c); if (!p) return c.name + ' has no patron.';
  if (patronId && patronId !== p.id) return c.name + ' is sworn to ' + p.name + '.';
  const r = (p.rites || []).find((x: any) => x.id === rite); if (!r) return 'No such rite.';
  if (r.engine) return r.name + ' is kept from the player\'s rite button.';
  if (c.ritesKept?.[p.id + '.' + r.id] === sessionN(g)) return 'Already kept this session.';
  (c.ritesKept ||= {})[p.id + '.' + r.id] = sessionN(g);
  B!.push(g, { kind: 'system', charId: c.id, head: 'RITE · ' + String(r.name).toUpperCase(), text: c.name + ' keeps the rite of ' + p.name + ': ' + r.name + '.' } as any);
  shiftDevotion(g, null, c, FAITH_RULES.devotion?.gain?.rite_kept ?? 1, 'rite: ' + r.name);
  return null;
}
/** Leave a pact (item 606): Devotion 0, an Atheist; the old patron's Hymns stay as pieces (one per gate reached, at least 1). */
export function apostasy(g: GameState, c: Character): string | null {
  const b = beliefOf(c); if (b.kind !== 'faithful') return c.name + ' has no pact to leave.';
  const p = patronById(b.patron), dv = devotionNow(c);
  const reached = [GATE[1], GATE[2], GATE[3]].filter((x) => dv >= x).length;
  const n = Math.min(3, Math.max(1, reached, c.faithPieces?.[p.id] || 0));
  c.belief = { kind: 'atheist' }; c.patron = null; c.devotion = 0; c.vow = null; c.faithRev = 16;
  c.faithPieces = { ...(c.faithPieces || {}), [p.id]: n };
  c.hymns = [...new Set([...(c.hymns || []), ...hymnsOf(p).slice(0, n).map((h: any) => p.id + '.' + h.id)])];
  B!.push(g, { kind: 'system', charId: c.id, head: 'APOSTASY', text: c.name + ' leaves the pact with ' + p.name + ': Devotion 0, an Atheist now; ' + n + ' of its Hymns stay with them, prayed by dice.' } as any);
  storyFx(g, FAITH_FX.devotion, { char: c.id, delta: -dv, reason: 'apostasy', now: 0 });
  return null;
}

// ---------- prayer in the story (faith/pray without a fight; item 604) ----------
/** What the engine applies of a prayer out of a fight (the squad's HP, story conditions, the next check); the rest is
 * the Narrator's (a pending ruling with the text and the power). */
function storyPray(g: GameState, c: Character, a: Extract<FaithAction, { type: 'faith/pray' }>): string | null {
  if (g.phase === 'combat') return 'In a fight, pray on your turn.';
  if (g.phase !== 'story') return 'The session hasn\'t started.';
  const kind = a.kind, id = a.id || (kind === 'miracle' ? patronOf(c)?.miracle?.id || '' : '');
  const pv = previewPrayer(g, c.id, kind, id, a); if (!pv.ok) return pv.why || 'You can\'t pray that now.';
  const rounds = g.story.await === 'players';
  if (rounds && B!.apLeft(g, c) < pv.ap) return 'Needs ' + pv.ap + ' AP.';
  const pe = prayerEntry(c, kind, id)!, patron = pe.patron;
  let t: Character = c;
  if (a.targetId && pv.target !== 'enemy' && pv.target !== 'tile' && pv.target !== 'none' && pv.target !== 'self') {
    const x = g.characters[a.targetId]; if (!x || !pv.targets.includes(x.id)) return 'Pick someone in the squad.'; t = x;
  }
  if (rounds) B!.spendAp(g, c, pv.ap);
  const sf = storyFaith(g, c);
  if (kind === 'whisper') sf.whisperRound = g.story.round; else if (kind === 'hymn') sf.hymnRound = g.story.round; else c.miracleSession = sessionN(g);
  g.story.mana = Math.max(0, (g.story.mana ?? MANA_START) + PRAYER_MANA);
  const text = String(a.text || '').trim().slice(0, 300), rng = g.rng as Rng;
  const name = (pe.entry.name || id) + (patron && kind !== 'whisper' ? ' (' + patron.name + ')' : '');
  const head = 'FAITH · ' + kind.toUpperCase() + ' · ' + name.toUpperCase();
  const said = c.name + (kind === 'whisper' ? ' whispers a prayer' : kind === 'miracle' ? ' calls for a Miracle' : ' sings a Hymn') + (text ? ': "' + text + '"' : '.');
  if (pv.roll) {
    const r = d20(rng), tot = r + pv.roll.mod, ok = r === 20 || (r !== 1 && tot >= pv.roll.tn);
    const dice = ' · d20 ' + r + ' ' + (pv.roll.mod >= 0 ? '+' : '−') + Math.abs(pv.roll.mod) + ' = ' + tot + ' vs ' + pv.roll.tn + (pv.mode === 'overreach' ? ' (overreach)' : '');
    if (!ok) {
      B!.push(g, { kind: 'check', charId: c.id, ok: false, head: head + dice + ' · ✕ SILENCE', text: said } as any);
      storyFx(g, FAITH_FX.prayer_fail, { unit: c.id, kind, id, patron: patron?.id || null, at: null, why: pv.mode === 'overreach' ? 'overreach' : 'dice' });
      if (pv.mode === 'overreach') { shiftDevotion(g, null, c, OVERREACH.miss, 'a failed overreach'); speak(g, null, rng, c, patron, 'refused'); }
      g.story.needs = true; B!.afterStory(g); return null;
    }
    B!.push(g, { kind: 'check', charId: c.id, ok: true, head: head + dice + ' · ✓ ANSWERED', text: said } as any);
  } else B!.push(g, { kind: 'check', charId: c.id, ok: true, head: head + ' · BY STANDING · ✓ ANSWERED', text: said } as any);
  storyFx(g, FAITH_FX.prayer, { unit: c.id, kind, id, patron: patron?.id || null, at: null, target: t.id, ok: true });
  if (kind === 'miracle') { storyFx(g, FAITH_FX.miracle, { patron: patron.id, id: pe.entry.id, at: null, area: null, unit: c.id }); shiftDevotion(g, null, c, -devotionNow(c), 'the Miracle spends it all'); }
  const power = blessingPower(c), done = storyEffect(g, c, t, kind, pe.entry.id, power);
  if (done) B!.push(g, { kind: 'system', charId: c.id, text: done.replace(/^ · /, '') + '.' } as any);
  // 'story_blessing' {g, c, lines}: items roll what a story Blessing on the character does besides (Upper-Touched's d6).
  const sb: any = kind !== 'whisper' ? emitStory(g, 'story_blessing', { g, c, lines: [] as string[] }, [c]) : { lines: [] };
  const rest = done === null || sb.lines.length;
  if (rest) pendRuling(g, c, 'faith:' + (patron?.id || 'whisper') + '.' + pe.entry.id, c.name + ' prayed and was answered: ' + name + ' — ' + (pe.entry.text || '') + ' (× ' + (Math.round(power * 100) / 100) + ')' + (text ? '. They asked: "' + text + '"' : '') + (sb.lines.length ? '. ' + sb.lines.join(' ') : '') + (done ? ' The engine applied: ' + done.replace(/^ · /, '') + '.' : ''));
  if (patron && kind !== 'whisper') speak(g, null, rng, c, patron, kind === 'miracle' ? 'miracle' : 'answered');
  g.story.needs = true; B!.afterStory(g);
  return null;
}
/** A prayer's effect on the squad out of a fight: the text of what was applied, or null when it is all the Narrator's. */
function storyEffect(g: GameState, c: Character, t: Character, kind: PrayerKind, id: string, power: number): string | null {
  const heal = (x: Character, n: number) => { const was = x.hp, max = maxHpOf(x); x.hp = Math.min(max, Math.max(0, x.hp) + Math.round(n)); return ' · ' + x.name + ' heals ' + (x.hp - was); };
  const endConds = (x: Character, ids: string[] | null) => { const had = (x.persistentConds || []).filter((p) => (ids ? ids.includes(p.id) : !condIsBoon(p.id))); x.persistentConds = (x.persistentConds || []).filter((p) => !had.includes(p)); return had.map((p) => p.id); };
  const st = (x: Character): any => storyFaith(g, x);
  if (kind === 'whisper') switch (id) {
    case 'luck': st(t).luck = 2; return ' · ' + t.name + ': +2 on the next check';
    case 'health': return heal(t, 15 * power);
    case 'courage': { const e = endConds(t, ['fear', 'shaken']); return ' · ' + t.name + (e.length ? ' steadies (' + e.join(', ') + ' ended)' : ' was already steady'); }
    case 'guidance': st(c).guidance = true; return null; // +2 on the next notice check; what it reveals is the Narrator's
    default: return null; // Protection and Safe Passage only mean something in a fight
  }
  switch (id) {
    case 'absolution': { const e = endConds(t, null); return ' · ' + t.name + ' is absolved' + (e.length ? ' (' + e.join(', ') + ')' : '') + ' and' + heal(t, 30 * power).replace(' · ' + t.name, ''); }
    case 'warm_hands': return heal(t, 40 * power);
    case 'coin_for_the_ferry': return t.hp > 0 ? ' · ' + t.name + ' is not down' : heal(t, 10 * power);
    case 'feed_the_fire': { const e = endConds(t, ['weakened', 'slowed']); if (g.story.await === 'players') (g.story.ap ||= {})[t.id] = B!.apLeft(g, t) + 1; return ' · ' + t.name + ' +1 AP' + (e.length ? ', ' + e.join(' and ') + ' ended' : ''); }
    case 'lucky_break': st(t).luckyBreak = true; return ' · ' + t.name + ': +5 on the next check';
    case 'everyone_home': { let out = ''; for (const x of Object.values(g.characters)) if (!x.dead) out += heal(x, maxHpOf(x)); return out; }
  }
  return null;
}
const maxHpOf = (c: Character): number => maxHp(c);

// The story's one-shot bonuses end with the check they helped (Luck, Lucky Break; Guidance on a notice check).
onStoryHook('check_result', (ctx) => {
  const st: any = ctx.c?.state?.faith; if (!st) return;
  delete st.luck; delete st.luckyBreak;
  if (st.guidance && (ctx.ck?.skills || []).some((k: string) => SKILL[k]?.attribute === 'perception')) delete st.guidance;
});
registerFaithHooks();
