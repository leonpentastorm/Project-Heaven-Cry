// Blessing 2.0 (rules 1.6): faith is a relationship. Belief (Faithful or Atheist), Devotion as standing with gates,
// the three sizes of prayer (Whisper, Hymn, Miracle), overreach, Atheist dice and knowledge pieces, conversion and the
// patron's Open or Jealous rule, Witnessed, tags (what the patron sees), vows, interventions, rites and the patrons'
// voice lines. Design: docs/design/blessing-2.0-spec.md; spec: "Patrons and prayer" (rules 1.6). Every number is
// provisional (spec section 14). Deterministic: every die and every voice line comes from the game's rng.
//
// Like missions.ts, this file imports only types from game.ts; game.ts binds the few helpers it needs (bindFaith).
import patronsJ from '../../../data/patrons.json';
import type { GameState, Entry } from './game';
import { type Character, type Belief, type Vow, mod, prayerCooldown, blessingPower } from './character';
import type { Combat, Unit } from './combat';
import { condOn } from './magic';
import { actionAp } from './effects/core';
import { sessionN } from './effects/uses';

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
}
let B: FaithBindings | null = null;
export function bindFaith(b: FaithBindings) { B = b; }

// ---------- belief, Devotion, the kit ----------
/** A character's belief. Old saves (no belief): a pact makes them Faithful to that patron, else Atheist (spec 1.6 §1). */
export function beliefOf(c: Character): Belief {
  if (c.belief?.kind === 'faithful' && FAITH_PATRON[c.belief.patron]) return c.belief;
  if (c.belief?.kind === 'atheist') return c.belief;
  return c.patron && FAITH_PATRON[c.patron] ? { kind: 'faithful', patron: c.patron } : { kind: 'atheist' };
}
export const patronOf = (c: Character): any | null => { const b = beliefOf(c); return b.kind === 'faithful' ? FAITH_PATRON[b.patron] || null : null; };
export const faithOf = (c: Character) => c.skills?.faith || 0;
/** Devotion (Faithful only; 0-10). */
export const devotionNow = (c: Character) => (beliefOf(c).kind === 'faithful' ? Math.max(0, Math.min(10, c.devotion ?? 3)) : 0);
/** Hymns a character prays by dice ("<patron>.<hymn>"): an Atheist's, or kept from another patron under an Open rule. */
export function diceHymns(c: Character): string[] {
  const own = patronOf(c)?.id, out = new Set<string>();
  for (const k of c.hymns || []) { const [p] = k.split('.'); if (p !== own) out.add(k); }
  for (const [pid, n] of Object.entries(c.faithPieces || {})) {
    const p = FAITH_PATRON[pid]; if (!p || pid === own) continue;
    for (const h of (p.hymns || []).slice(0, Math.max(0, Math.min(3, n)))) out.add(pid + '.' + h.id);
  }
  return [...out];
}
/** A hymn by key: "<patron>.<hymn>", or a bare id of the character's own patron's Hymn. */
export function hymnByKey(c: Character, key: string): { patron: any; hymn: any; key: string } | null {
  const [a, b] = key.includes('.') ? key.split('.') : [patronOf(c)?.id || '', key];
  const p = FAITH_PATRON[a]; const h = p && (p.hymns || []).find((x: any) => x.id === b);
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
  const target = pe.entry.target || 'none';
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
  if (p) for (const h of p.hymns || []) hymns.push({ key: p.id + '.' + h.id, patron: p.id, patronName: p.name, id: h.id, name: h.name, tier: h.tier, text: h.text, source: 'patron', preview: previewPrayer(g, who, 'hymn', p.id + '.' + h.id) });
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
    vow: u?.vow || c.vow || null, vows: VOWS.map((v) => ({ id: v.id, name: v.name, words: v.words, brokenWhen: v.broken_when, needsAlly: !!v.needs_ally })),
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

// ---------- the reducer (rules built in the next push) ----------
/** Run a faith/* action. Returns an error string (game.ts throws it as a RuleError), or null. */
export function faithReduce(g: GameState, a: FaithAction, by: string): string | null {
  void g; void by; void blessingPower;
  switch (a.type) {
    case 'faith/pray': case 'faith/vow': case 'faith/rite':
    case 'faith/pact': case 'faith/piece': case 'faith/devotion': case 'faith/rite_kept': case 'faith/apostasy':
      return 'Not built yet (Blessing 2.0, implementer 1).';
  }
  return 'Unknown action.';
}
