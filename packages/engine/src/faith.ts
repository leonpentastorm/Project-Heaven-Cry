// Blessing 2.0 (rules 1.6): faith is a relationship. Belief (Faithful or Atheist), Devotion as standing with gates,
// the three sizes of prayer (Whisper, Hymn, Miracle), overreach, Atheist dice and knowledge pieces, conversion and the
// patron's Open or Jealous rule, Witnessed, tags (what the patron sees), vows, interventions, rites and the patrons'
// voice lines. Design: docs/design/blessing-2.0-spec.md; spec: "Patrons and prayer" (rules 1.6). Every number is
// provisional (spec section 14). Deterministic: every die and every voice line comes from the game's rng.
// Rules 1.6.1 (Faith 2.1, docs/design/faith-2.1-spec.md, items 701-723): Devotion is earned as XP through one choke
// point (shiftDevotion); the tag caps live on the character (tallyOf); the Narrator's XP has a session cap; leaving a
// pact has a 90-day cooldown on the day counter; a direct switch rolls the old patron's leave and may leave a grudge.
// Rules 1.6.2 (Miracle 2.1, items 724-736): a Miracle needs Devotion 10 and lowers it by 5 levels after its effect
// (miracleCost); the eight Miracles are the stronger ones Leon approved (runEntry; Encore's repeat: encoreBefore/After).
// Rules 1.6.3 (Faith 2.2, docs/design/faith-presence-spec.md, items 738-746): Witnessed lasts until the fight ends or
// the intervention fires (which ends it); interventions are once a fight (twice from Devotion 7), scale with Devotion
// (interventionAmount), and the Quartermaster's and the Laughing Mask's triggers are wider; the grant bank names the
// devoted when a Miracle is answered, and the Miracle's and intervention's fx carry what the web shows.
//
// Like missions.ts, this file imports only types from game.ts; game.ts binds the few helpers it needs (bindFaith).
import './datatext'; // fills the texts' {=placeholders} before any data is read
import patronsJ from '../../../data/patrons.json';
import type { GameState, Entry } from './game';
import { type Character, type Belief, type Vow, mod, prayerCooldown, HYMN_COOLDOWN, blessingPower, maxHp, magazineSize, maxDurOf, packOf, devotionXpOf, setDevotionXp, devotionThreshold, devotionLevelOf, devotionWords, DEVOTION_MAX_LEVEL, DEVOTION_MAX_XP, FAITH_REV } from './character';
import type { Combat, Unit } from './combat';
import { say, unguarded, emitFx, FX_CAP, alive, dist, unitSees, refOf, isMelee, reload, reloadHands, resourcesFor, encoreKey, swapUnits } from './combat';
import { condOn, applyCond, endCond, harm, type SpellAmount, shiftMana, unitSave, unitStrength, withVia, saveAgainst, viaOf, condSource, condIsBoon, condName as condNameOf, MANA_START, CORE_CHARGE } from './magic';
import { pushAway } from './effects/core';
import { setPrayerDoor } from './effects/actions';
import { price, whyNot, pay, refund, grantAp, freely, poolWhyNot, setResSetter } from './effects/cost';
import { sessionN, dayOf, uses as usesOf } from './effects/uses';
import { applyDamage, healUnit, grantShield } from './effects/damage';
import { mendFactor, mendFactorOf } from './effects/mending';
import { amountOf, term, levelOf, profileOf, mendSized, type Term } from './effects/output';
import { onHook, onStat, onCheck, onStoryHook, charOfUnit, boundGame, emit, emitStory, statQuery, holdersOf, runOwnEffects } from './effects/hooks';
import { apDebt, bankAp, AP_MAX } from './effects/ap';
import { pendRuling } from './effects/narrator';
import { surrender, reveal, blessing as legacyBlessing , dropHeldShot } from './tactics';
import { FAITH_PATRONS, FAITH_PATRON, patronById, beliefOf } from './belief';
import { die, type Rng } from './rng';
import { rollVs, rerollAttack, attackHits } from './rolls';
import { spotlight } from './spotlight';
import { feelChar } from './feelings';
import { WEAPON, SKILL, ITEM } from './data';
import { rngOf, overworld, tilesAround, foesOf } from './kit';
import { setBraced, setDowned, clearStagger } from './unitstate';
import { condNotFresh } from './magic';
import { setAnsweredDoor } from './effects/triggers';

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
export const LINE_BANKS: string[] = PJ.line_banks || ['answered', 'refused', 'taboo', 'vow_kept', 'vow_broken', 'witnessed', 'intervention', 'miracle', 'conversion', 'farewell', 'grant'];
// The patrons, patronById and beliefOf live in belief.ts (no global hooks: the predicate `patron` reads the same copy).
export { FAITH_PATRONS, FAITH_PATRON, patronById, beliefOf } from './belief';
const hymnsOf = (p: any): any[] => p?.hymns || p?.blessings || [];

const PR = PJ.prayer || {};
/** The gates (Devotion needed): Whisper 0, Hymn I 3, Hymn II 5, Hymn III 7, Miracle 10 (rules 1.6.2, item 724). */
export const GATE = { whisper: 0, 1: PJ.devotion?.gates?.hymn_1 ?? 3, 2: PJ.devotion?.gates?.hymn_2 ?? 5, 3: PJ.devotion?.gates?.hymn_3 ?? 7, miracle: PJ.devotion?.gates?.miracle ?? PR.miracle?.devotion_min ?? 10 } as const;
/** What a Miracle costs: whole Devotion levels, after its effect (rules 1.6.2, item 725: 10 → 5). */
export const MIRACLE_COST_LEVELS: number = PR.miracle?.devotion_cost_levels ?? 5;
/** Witnessed's bonus on an attack roll (item 595; rules 1.22 item 1288). */
/** Together's conditions are held until the caster's next turn starts (ended there), never by the bearer's own clock. */
const TOGETHER_HOLD = 99;
export const WITNESS_BONUS: number = PR.witnessed?.like_bonus ?? 2;
export const FAITH_MIN = PR.faith_min ?? 1, WITNESS_FAITH = PR.witnessed?.faith_min ?? 5, MIRACLE_FAITH = PR.miracle?.faith_min ?? 7;
/** Rules 1.31 (Leon, 13 Nov 2026: prayer opens at Faith 1): Whispers from Faith 1, Hymns from Faith 3 (patrons.json
 * prayer.whisper.faith_min, prayer.hymn.faith_min); FAITH_MIN is the least of them (praying at all). */
export const WHISPER_FAITH: number = PR.whisper?.faith_min ?? FAITH_MIN, HYMN_FAITH: number = PR.hymn?.faith_min ?? 3;
/** The Faith a prayer of this kind needs (a Miracle's own Faith 7 is asked after it). */
export const prayerFaith = (kind: PrayerKind): number => (kind === 'whisper' ? WHISPER_FAITH : Math.max(WHISPER_FAITH, HYMN_FAITH));
/** The refusal when the Faith is short: Whispers' own words, else the Hymn's. */
export const prayerFaithWhy = (kind: PrayerKind): string => (kind === 'whisper' ? 'Praying needs Faith ' + WHISPER_FAITH + '.' : 'A Hymn needs Faith ' + HYMN_FAITH + '.');
export const AP_COST = { whisper: PR.whisper?.ap ?? 1, hymn: PR.hymn?.ap ?? 3, miracle: PR.miracle?.ap ?? 3 };
export const OVERREACH = { base: PR.overreach?.tn_base ?? 12, step: PR.overreach?.tn_per_step ?? 2, miss: -(PJ.devotion?.loss?.overreach_miss ?? 3) };
export const ATHEIST_TN = { whisper: PR.atheist_tn?.whisper ?? 12, 1: PR.atheist_tn?.hymn_1 ?? 14, 2: PR.atheist_tn?.hymn_2 ?? 16, 3: PR.atheist_tn?.hymn_3 ?? 18 } as Record<string | number, number>;
// Rules 1.6.1 (Faith 2.1, items 701-730): events give Devotion XP, not levels (patrons.json devotion; PROVISIONAL).
const DV = PJ.devotion || {};
/** Devotion XP per event (gains positive, losses as the XP taken). */
export const DEVOTION_XP = {
  liked: DV.gain?.liked_tag ?? 1, vowKept: DV.gain?.vow_kept ?? 3, rite: DV.gain?.rite_kept ?? 4, convert: DV.gain?.convert_someone ?? 4,
  deedMin: DV.gain?.deed_min ?? 2, deedMax: DV.gain?.deed_max ?? 5, piece: DV.gain?.piece_on_conversion ?? 1,
  taboo: DV.loss?.taboo_tag ?? 3, tabooWitnessed: DV.loss?.taboo_tag_witnessed ?? 6, vowBroken: DV.loss?.vow_broken ?? 5,
  overreachMiss: DV.loss?.overreach_miss ?? 3, breakCharacter: DV.loss?.break_character_seen ?? 6, judgement: DV.loss?.judgement ?? 10,
};
/** Tag XP caps (item 703): a fight, a scene out of fights, a session in all. */
export const TAG_CAPS = { fight: DV.tag_caps?.fight ?? 2, scene: DV.tag_caps?.scene ?? 2, session: DV.tag_caps?.session ?? 6 };
/** The Narrator's devotion op (item 705): XP from min to max a call; gains at most sessionCap a session per character. */
export const NARRATOR_XP = { min: DV.narrator?.min ?? -6, max: DV.narrator?.max ?? 5, sessionCap: DV.narrator?.session_gain_cap ?? 10 };
/** Days after leaving a pact before any patron answers a new one (item 710). */
export const PACT_COOLDOWN_DAYS: number = DV.apostasy?.cooldown_days ?? 90;
/** The old name of the fight's tag cap (now TAG_CAPS.fight, in XP). */
export const LIKE_CAP = TAG_CAPS.fight;
export const PRAYER_MANA = PR.mana_delta ?? -5;
/** Rules 1.27 (the heal re-fit): Blessing power is the damage profile's Stat term (blessing); a prayer's heal or shield,
 * and Mother Ember's intervention, read the heal dial in its place: the blessing_mend profile's k over the blessing
 * profile's (data/rules.json output.profiles). One number moves Faith's healing and nothing else. */
export const prayerMendDial = (): number => profileOf('blessing_mend').k / profileOf('blessing').k;
const mendDial = (): Term => term(prayerMendDial(), 'heal dial');
/** Interventions (rules 1.6.3, items 740-741): per fight (twice from Devotion 7), and the Devotion-scaled number. */
export const INTERVENTION = {
  perFight: PR.intervention?.per_fight ?? 1, perFightHigh: PR.intervention?.per_fight_high ?? 2, highFrom: PR.intervention?.high_from_devotion ?? 7,
  base: PR.intervention?.amount?.base ?? 20, perDevotion: PR.intervention?.amount?.per_devotion ?? 4,
};
/** How many interventions this character's patron may make in a fight now (item 740). */
export const interventionLimit = (c: Character) => (devotionNow(c) >= INTERVENTION.highFrom ? INTERVENTION.perFightHigh : INTERVENTION.perFight);
/** A Devotion-scaled intervention's number: (20 + 4 × Devotion) × Blessing power, rounded (item 741). */
export const interventionAmount = (c: Character, power = 1) => amountOf({ kind: 'damage', base: INTERVENTION.base, per: [{ of: 'devotion', value: INTERVENTION.perDevotion }], profile: 'blessing', round: 'round' }, null, { level: null, counts: { devotion: devotionNow(c) }, mults: [term(power, 'stat: blessing power'), term(levelOf('blessing', c.level), 'level')] }).amount;
// ---------- rules 1.20 (the heal and shield pass): prayer heals and shields ----------
// On the one formula (effects/output.ts; step a5): a prayer's amount is its base (patrons.json) × the Stat term
// (Blessing power: the unit's own, as the prayer landed it) × its own named multipliers; a heal or a shield also takes
// the Level term (the level factor of rules 1.20). The number is left raw: the heal line and harm round it as before.
const prayerAmount = (kind: 'damage' | 'heal' | 'shield', base: number, power: number, ...own: Term[]): number =>
  amountOf({ kind, base, profile: kind === 'damage' ? 'blessing' : 'blessing_mend', round: 'none' }, null, { level: null, mults: [term(power, 'stat: blessing power'), ...(kind === 'damage' ? [] : [mendDial()]), ...own] }).raw;
const levelTerm = (u: Unit | null | undefined): Term => term(mendFactorOf(u), 'level');
/** Rules 1.26 (the re-fit): a prayer's damage takes the Level term of the blessing profile (data: none today, the landed shape: points carry its growth). */
const dealTerm = (u: Unit | null | undefined): Term => term(u && u.side === 'pc' ? levelOf('blessing', u.level) : 1, 'level');
/** A prayer's damage with its terms open, as harm takes it (step a7: what an item adds goes in beside the base and is
 * multiplied by Blessing power too). Rounded, as a prayer's damage always was. */
const prayerStrike = (base: number, power: number, ...own: Term[]): SpellAmount => ({ base, round: 'round', mults: [term(power, 'stat: blessing power'), ...own] });
/** A prayer's heal or shield base, read from its data entry (patrons.json; `fallback` only for data without one). */
const effVal = (entry: any, op: 'heal' | 'shield', fallback = 0): number => {
  const find = (list: any[]): number | null => { for (const e of list || []) { if (e.op === op && typeof e.value === 'number') return e.value; const n = find(e.effects); if (n != null) return n; } return null; };
  return find(entry?.effects) ?? fallback;
};
const hymnEntry = (id: string): any => { for (const p of FAITH_PATRONS) for (const h of p.hymns || []) if (h.id === id) return h; return null; };
/** Mother Ember's healing intervention: (base + per × Devotion) × Blessing power × the heal Level term (heal-shield-percent
 * spec: it gains the `mend` column; it never passes the cap). Its own numbers, not the damage interventions'. */
export const interventionHeal = (c: Character, power = 1) => { const e = (FAITH_PATRON.mother_ember?.intervention?.effects || [])[0] || {}; return amountOf({ kind: 'heal', base: e.value ?? 10, per: [{ of: 'devotion', value: e.per_devotion ?? 3 }], profile: 'blessing', round: 'round' }, null, { level: null, counts: { devotion: devotionNow(c) }, mults: [term(power, 'stat: blessing power'), mendDial(), term(mendFactor(c.level), 'level')] }).amount; };

// ---------- rules 1.22 (Faith, round 2): the Hymn's wait ----------
/** Rounds a character waits between Hymns: the cooldown (character.ts prayerCooldown), less 1 for True Believer (the
 * 'hymn_wait' stat) and less 1 when the vow was fulfilled for this Hymn (`cut`), never under HYMN_COOLDOWN.minWait (2):
 * nothing but an item takes it lower, and there are none yet (item 1282). */
export function hymnWait(c: Character, u?: Unit | null): number {
  const base = prayerCooldown(c), q = c.perks?.length || c.traits?.length ? statQuery({ c }, 'hymn_wait').add : 0;
  return Math.max(Math.min(base, HYMN_COOLDOWN.minWait), base + q - (u?.faith?.hymnCut || 0));
}
/** Rounds left before this fighter may pray a Hymn again (0: now). */
export const hymnLeft = (cb: Combat, c: Character, u: Unit): number => prayed({ c, u, cb }).coolLeft(hymnWait(c, u), HYMN_KEY);
// The prayer limits are cells of effects/uses.ts (engine review 1, F8): a Whisper once a turn (in the story: once a
// round), a Hymn's cooldown in rounds, a Hymn's own cooldown. In a fight they sit on the unit, in the story in
// g.story.ps[charId].uses; nothing resets them by hand.
const WHISPER_KEY = 'faith#whisper', HYMN_KEY = 'faith#hymn', ownKey = (id: string) => 'faith#own:' + id;
const prayed = (x: { c?: Character | null; u?: Unit | null; cb?: Combat | null; g?: any }) => usesOf({ key: 'faith', c: x.c, u: x.u, cb: x.cb, g: x.g });
/** End every prayer limit of a fighter (the Proving Ground's "reset the limits"; a test that is not about the cooldown). */
export function clearPrayerLimits(u: Unit | null | undefined, g?: any, c?: Character | null) {
  if (u?.uses) for (const k of Object.keys(u.uses)) if (k.startsWith('faith#')) delete u.uses[k];
  const cells = c && g?.story?.ps?.[c.id]?.uses; if (cells) for (const k of Object.keys(cells)) if (k.startsWith('faith#')) delete cells[k];
}
/** A Hymn with a wait of its own (Hold the Gate, item 1287): its `own_cooldown` rounds, or 0. */
export const ownCooldown = (entry: any): number => Math.max(0, Number(entry?.own_cooldown) || 0);

/** FX events (emitFx kinds) the faith rules put on a fight's or the story's fx list, with their payloads. */
export const FAITH_FX = {
  prayer: 'prayer', // {unit, kind, id, patron, at, target, ok}
  prayer_fail: 'prayer_fail', // {unit, kind, id, patron, at, why: 'overreach' | 'dice'}
  witnessed: 'witnessed', // {unit, patron, at}
  intervention: 'intervention', // {unit, patron, trigger, target, amount, at} (rules 1.6.3, item 744)
  devotion: 'devotion', // {char, delta (XP), xp (the total), reason, tag?, now (the level), was (the level before), level? (when it changed)}
  leave: 'leave', // {char, patron, to, letGo, roll?: {die, mod, total, tn}}
  grudge: 'grudge', // {char, patron, sessions, condition, at?, unit?} (set on a switch; at a fight's start, on the unit)
  vow: 'vow', // {unit, char, id, state: 'sworn' | 'kept' | 'broken' | 'fulfilled', allyId?}; fulfilled (rules 1.22) also carries {why, cut (rounds off the Hymn's wait), left (rounds until the next Hymn), banked?, at}
  patron_line: 'patron_line', // {patron, event, text, char}
  miracle: 'miracle', // {patron, id, at, area, unit, char, name, text, line, summary} (rules 1.6.3, item 746)
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
  /** Asking above your standing: the roll's TN (a miss costs 3 Devotion XP: OVERREACH.miss). */
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
  const ap = u ? price({ cb, u, c }, kind === 'whisper' ? 'whisper' : 'pray', AP_COST[kind]).ap : AP_COST[kind];
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
  if (faith < prayerFaith(kind)) return no(kind === 'miracle' ? 'A Miracle needs Faith ' + MIRACLE_FAITH + '.' : prayerFaithWhy(kind), out);
  if (kind === 'miracle') {
    if (belief.kind !== 'faithful') return no('An Atheist never gets a Miracle.', out);
    if (faith < MIRACLE_FAITH) return no('A Miracle needs Faith ' + MIRACLE_FAITH + '.', out);
    if (devotionNow(c) < GATE.miracle) return no('A Miracle needs Devotion ' + GATE.miracle + ' (you have ' + devotionNow(c) + ').', out);
    if (c.miracleSession === sessionN(g)) return no('One Miracle a session.', out);
    if (cb && u) { const none = miracleFindsNobody(cb, u, pe.entry.id); if (none) return no(none, out); }
  }
  if (kind === 'hymn' && mode === 'dice' && !diceHymns(c).includes(pe.key)) return no(belief.kind === 'atheist' ? 'You haven\'t learned that Hymn (a knowledge piece unlocks it).' : 'That Hymn isn\'t yours to pray.', out);
  // Silenced, AP, the limits.
  if (u && condOn(u, 'silenced')) return no('Silenced: no prayers.', out);
  if (!u && (c.persistentConds || []).some((x) => x.id === 'silenced')) return no('Silenced: no prayers.', out);
  if (cb && u) {
    if (cb.order[cb.turn] !== u.id) return no('Pray on your turn.', out);
    { const n0 = whyNot(cb, u, ap); if (n0) return no(n0, out); }
    const lim = prayed({ c, u, cb, g });
    if (kind === 'whisper' && lim.left('per_turn', 1, WHISPER_KEY) <= 0) return no('One Whisper a turn.', out);
    if (kind === 'hymn') { const cd = hymnWait(c, u), last = lim.cooledAt(HYMN_KEY); if (last != null && lim.coolLeft(cd, HYMN_KEY) > 0) return no('Your last Hymn was ' + (cb.round - last) + ' round(s) ago: wait ' + cd + '.', out); }
    if (kind === 'hymn' && ownCooldown(pe.entry)) { const last = lim.cooledAt(ownKey(pe.entry.id)), n = ownCooldown(pe.entry); if (last != null && lim.coolLeft(n, ownKey(pe.entry.id)) > 0) return no((pe.entry.name || id) + ' was prayed in round ' + last + ': not again until round ' + (last + n) + '.', out); }
    if (kind === 'hymn' && pe.entry.id === 'cut_short' && args.targetId) { const why = cutShortWhy(cb, cb.units.find((x) => x.id === args.targetId), pe.entry); if (why) return no(why, out); }
  } else {
    const lim = prayed({ c, g });
    if (kind === 'whisper' && lim.left('per_round', 1, WHISPER_KEY) <= 0) return no('One Whisper a round.', out);
    { const last = lim.cooledAt(HYMN_KEY); if (kind === 'hymn' && last != null && lim.coolLeft(hymnWait(c), HYMN_KEY) > 0) return no('Your last Hymn was ' + (g.story.round - last) + ' round(s) ago: wait ' + hymnWait(c) + '.', out); }
    if (kind === 'hymn' && ownCooldown(pe.entry)) { const last = lim.cooledAt(ownKey(pe.entry.id)), n = ownCooldown(pe.entry); if (last != null && lim.coolLeft(n, ownKey(pe.entry.id)) > 0) return no((pe.entry.name || id) + ' was prayed ' + (g.story.round - last) + ' round(s) ago: wait ' + n + '.', out); }
  }
  return { ...out, ok: true };
}
/** A fight's turn, as a key (a Whisper is once per turn). */
export const turnKey = (cb: Combat) => cb.round + ':' + cb.turn;
/** Story-side faith state, on the character (the prayer limits are not here: effects/uses.ts). */
export function storyFaith(g: GameState, c: Character): Record<string, any> {
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
  vow: Vow | null; vows: { id: string; name: string; words: string; brokenWhen: string; /** Rules 1.22: the moment in a fight that fulfils it (1 round off the Hymn's wait). */ fulfilledWhen: string; needsAlly: boolean }[];
  rites: { id: string; name: string; text: string; engine: boolean; keptThisSession: boolean; available: boolean; why?: string }[];
  rule: 'open' | 'jealous' | null;
  cooldowns: { hymnRoundsLeft: number; whisperUsed: boolean; miracleUsed: boolean;
    /** Rules 1.22: the rounds between Hymns for this character now (the vow's cut counted), the cooldown before any cut, whether the vow has shortened this wait, and whether a fulfilment is banked for the next Hymn. */
    hymnWait: number; hymnCooldown: number; vowCut: boolean; vowBanked: boolean };
  /** Liked-tag Devotion XP gained this fight (of the fight's cap), in a fight. */
  likedThisFight: number;
  /** Rules 1.6.1: Devotion XP (Faithful only): the total, the level, the XP into this level and the step to the next
   * (null at 10): "DEVOTION 4 · 12/32 XP". */
  devotionXp: { total: number; level: number; into: number; step: number | null; next: number | null } | null;
  /** Tag XP so far against its caps (item 703), and the Narrator's gains this session against its cap (item 705). */
  tagXp: { fight: number; scene: number; session: number; caps: { fight: number; scene: number; session: number | null }; /** Where tags count now: the fight, or the scene out of fights. */ where: 'fight' | 'scene' };
  narratorXp: { session: number; cap: number };
  /** The day counter (item 709) and the cooldown after leaving a pact (item 710): days left, the day it ends. */
  day: number;
  pactCooldown: { daysLeft: number; until: number; patron: string; patronName: string } | null;
  /** The grudge of a patron left (item 713): the condition at each fight's start, the XP multiplier, sessions left after this one. */
  grudge: { patron: string; patronName: string; condition: string; conditionName: string; rounds: number; xpMult: number; sessionsLeft: number; text: string } | null;
}
export function faithView(g: GameState, charId: string): FaithView | null {
  const c = g.characters[charId]; if (!c) return null;
  const { u, cb } = whoOf(g, charId);
  const belief = beliefOf(c), p = patronOf(c), dv = devotionNow(c), faith = faithOf(c), who = u?.id || c.id;
  const tag = (id: string) => FAITH_TAG[id] || { id, name: id, text: '' };
  const hymns: FaithView['hymns'] = [];
  if (p) for (const h of hymnsOf(p)) hymns.push({ key: p.id + '.' + h.id, patron: p.id, patronName: p.name, id: h.id, name: h.name, tier: h.tier, text: h.text, source: 'patron', preview: previewPrayer(g, who, 'hymn', p.id + '.' + h.id) });
  for (const k of diceHymns(c)) { const x = hymnByKey(c, k); if (x) hymns.push({ key: x.key, patron: x.patron.id, patronName: x.patron.name, id: x.hymn.id, name: x.hymn.name, tier: x.hymn.tier, text: x.hymn.text, source: belief.kind === 'atheist' ? 'learned' : 'kept', preview: previewPrayer(g, who, 'hymn', x.key) }); }
  const cd = hymnWait(c, cb && u ? u : null), sf = storyFaith(g, c), tv = tallyView(g, c, cb), cdl = pactCooldownLeft(g, c), gr = grudgeOf(g, c);
  const lim = cb && u ? prayed({ c, u, cb, g }) : prayed({ c, g }), hymnLeft = lim.coolLeft(cd, HYMN_KEY);
  return {
    belief, patron: p ? { id: p.id, name: p.name, costume: p.costume, archetype: p.archetype, accent: p.accent, rule: p.rule, likes: (p.likes || []).map(tag), taboos: (p.taboos || []).map((t: string) => ({ ...tag(t), ...(p.taboo_notes?.[t] ? { note: p.taboo_notes[t] as string } : {}) })) } : null,
    faith, devotion: dv,
    gates: { whisper: faith >= WHISPER_FAITH, hymn1: !!p && dv >= GATE[1], hymn2: !!p && dv >= GATE[2], hymn3: !!p && dv >= GATE[3], miracle: !!p && faith >= MIRACLE_FAITH && dv >= GATE.miracle },
    witnessed: !!u && condOn(u, 'witnessed'), canBeWitnessed: belief.kind === 'faithful' && faith >= WITNESS_FAITH,
    whispers: WHISPERS.map((w) => ({ id: w.id, name: w.name, text: w.text, preview: previewPrayer(g, who, 'whisper', w.id) })),
    hymns,
    miracle: p?.miracle ? { id: p.miracle.id, name: p.miracle.name, text: p.miracle.text, usedThisSession: c.miracleSession === sessionN(g), preview: previewPrayer(g, who, 'miracle', p.miracle.id) } : null,
    pieces: { ...(c.faithPieces || {}) },
    vow: u?.vow || null, vows: VOWS.map((v) => ({ id: v.id, name: v.name, words: v.words, brokenWhen: v.broken_when, fulfilledWhen: v.fulfilled_when || '', needsAlly: !!v.needs_ally })),
    rites: (p?.rites || []).map((r: any) => ({ id: r.id, name: r.name, text: r.text, engine: !!r.engine, keptThisSession: c.ritesKept?.[p.id + '.' + r.id] === sessionN(g), ...riteState(g, c, r) })),
    rule: p?.rule || null,
    cooldowns: { hymnRoundsLeft: hymnLeft, whisperUsed: lim.left(cb && u ? 'per_turn' : 'per_round', 1, WHISPER_KEY) <= 0, miracleUsed: c.miracleSession === sessionN(g), hymnWait: cd, hymnCooldown: prayerCooldown(c), vowCut: !!(cb && u && u.faith?.hymnCut), vowBanked: !!(cb && u && u.faith?.vowBank) },
    likedThisFight: tv.fight,
    devotionXp: belief.kind === 'faithful' ? (() => { const total = devotionXpOf(c), lv = devotionLevelOf(total), at = devotionThreshold(lv), next = lv < DEVOTION_MAX_LEVEL ? devotionThreshold(lv + 1) : null; return { total, level: lv, into: total - at, step: next != null ? next - at : null, next }; })() : null,
    tagXp: { fight: tv.fight, scene: tv.scene, session: tv.session, caps: { ...TAG_CAPS, session: (g as any).sandbox ? null : TAG_CAPS.session }, where: cb && !overworld(cb) ? 'fight' : 'scene' }, narratorXp: { session: tv.narr, cap: NARRATOR_XP.sessionCap },
    day: dayOf(g),
    pactCooldown: cdl > 0 && c.faithLeft ? { daysLeft: cdl, until: c.faithLeft.day + PACT_COOLDOWN_DAYS, patron: c.faithLeft.patron, patronName: patronById(c.faithLeft.patron)?.name || c.faithLeft.patron } : null,
    grudge: gr ? { patron: gr.patron, patronName: patronById(gr.patron)?.name || gr.patron, condition: gr.condition, conditionName: condNameOf(gr.condition), rounds: gr.rounds, xpMult: gr.xp_mult, sessionsLeft: Math.max(0, gr.until - sessionN(g)), text: gr.text } : null,
  };
}
/** The tally as the view shows it (read only: a new session or scene reads as 0). */
function tallyView(g: GameState, c: Character, cb: Combat | null) {
  const t = c.faithTally as FaithTally | undefined, same = !!t && t.session === sessionN(g);
  const fid = cb && !overworld(cb) ? (cb as any).faithFight : null;
  return { fight: same && fid && t!.fight?.id === fid ? t!.fight!.xp : 0, scene: same && t!.scene === sceneOf(g) ? t!.sceneXp : 0, session: same ? t!.sessionXp : 0, narr: same ? t!.narrXp : 0 };
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

/** One Devotion move, in XP (rules 1.6.1): the one choke point every gain and loss goes through. Clamped to the curve
 * (0 to the level-10 total), the level kept in step, logged, an fx event. Only the Faithful have Devotion. A grudge
 * (item 713) multiplies gains, with the fraction carried. Returns the XP moved. */
export function shiftDevotion(g: GameState | null, cb: Combat | null, c: Character, delta: number, reason: string, tag?: string): number {
  if (beliefOf(c).kind !== 'faithful' || !delta) return 0;
  const was = devotionXpOf(c), lvWas = devotionLevelOf(was);
  let n = Math.round(delta), note = '';
  if (n > 0) {
    const gr = grudgeOf(g, c);
    if (gr && gr.xp_mult < 1) {
      const t = n * gr.xp_mult + (gr.carry || 0), got = Math.floor(t + 1e-9);
      gr.carry = Math.round((t - got) * 1000) / 1000; note = ' (×' + gr.xp_mult + ': ' + (patronById(gr.patron)?.name || 'the old patron') + '\'s grudge)'; n = got;
    }
  }
  const now = Math.max(0, Math.min(DEVOTION_MAX_XP, was + n)), lv = setDevotionXp(c, now), d = now - was;
  if (!d && delta > 0) { if (note) logFaith(g, cb, c.name + ': +0 Devotion XP (' + reason + ')' + note + '.'); return 0; }
  const ev = { char: c.id, delta: d || n, xp: now, reason, ...(tag ? { tag } : {}), now: lv, was: lvWas, ...(lv !== lvWas ? { level: lv } : {}) };
  // The same words as the meter (level, then the XP into it out of its step), upper case when the level changed.
  const text = c.name + ': ' + ((d || n) > 0 ? '+' : '−') + Math.abs(d || n) + ' Devotion XP (' + reason + ')' + note + (lv !== lvWas ? ': ' + devotionWords(now).toUpperCase() : ', ' + devotionWords(now)) + '.';
  if (cb) emitFx(cb, FAITH_FX.devotion, ev); else if (g) storyFx(g, FAITH_FX.devotion, ev);
  logFaith(g, cb, text);
  return d;
}
/** A Miracle's price (rules 1.6.2, item 725): Devotion falls by MIRACLE_COST_LEVELS whole levels, run after its effect:
 * the XP is set to the threshold of the level that many below the level held now (10 → 5: 102 XP), so the XP into the
 * level goes too. Through shiftDevotion (a loss: no grudge, logged, an fx event). Returns the XP moved (negative). */
export function miracleCost(g: GameState | null, cb: Combat | null, c: Character): number {
  const lv = devotionLevelOf(devotionXpOf(c)), to = devotionThreshold(Math.max(0, lv - MIRACLE_COST_LEVELS));
  return shiftDevotion(g, cb, c, to - devotionXpOf(c), 'the Miracle: Devotion −' + MIRACLE_COST_LEVELS + ' levels');
}
function logFaith(g: GameState | null, cb: Combat | null, text: string) { if (cb) say(cb, text); else if (g) B?.push(g, { kind: 'system', text }); }

// ---------- the caps on tags, on the character (rules 1.6.1, items 703-704) ----------
/** What a character's tags (and the Narrator) have given this session, scene and fight. On the character, not the fight
 * unit, so the area map's units (rebuilt every action) can't reset it. */
export interface FaithTally {
  session: number; scene: number;
  /** Tag XP this session (all of it), this scene (out of fights) and the liked tags already counted this scene. */
  sessionXp: number; sceneXp: number; sceneTags: string[];
  /** The Narrator's devotion gains this session (item 705). */
  narrXp: number;
  /** The fight the tags are counted in: its id, the tag XP and the liked tags counted. */
  fight: { id: string; xp: number; tags: string[] } | null;
  /** The last action seen and the tags it carried (a tag counts once per action). */
  act: { k: string; tags: string[] } | null;
}
const sceneOf = (g: GameState | null): number => (g as any)?.story?.scene?.n ?? 0;
/** The character's tally, reset at a new session and (its scene part) a new scene. */
export function tallyOf(g: GameState | null, c: Character): FaithTally {
  const s = sessionN(g), sc = sceneOf(g); let t = c.faithTally as FaithTally | undefined;
  if (!t || t.session !== s) t = c.faithTally = { session: s, scene: sc, sessionXp: 0, sceneXp: 0, sceneTags: [], narrXp: 0, fight: null, act: null };
  if (t.scene !== sc) { t.scene = sc; t.sceneXp = 0; t.sceneTags = []; }
  return t;
}
/** A fight's id for the tally (set at its start; an old fight gets one the first time a tag is counted in it). */
function fightId(cb: Combat): string { const x: any = cb; return (x.faithFight ||= 'v' + String((G() as any)?.v ?? 0) + '.' + cb.round); }
/** A liked or taboo tag on a Faithful character (rules 1.6.1): a liked tag gives its XP once per fight (where.fight:
 * the fight's id) or once per scene (out of fights), within the fight's, scene's and session's caps; a taboo always
 * costs (−3, −6 while Witnessed). where.act: the action's key (a tag counts once per action). Returns the XP moved, or
 * null when the tag didn't count (not the patron's, already counted, a cap reached). */
export function tagDevotion(g: GameState | null, cb: Combat | null, c: Character, tag: string, where: { fight?: string | null; act?: string; witnessed?: boolean } = {}): number | null {
  const p = patronOf(c); if (!p) return null;
  const liked = (p.likes || []).includes(tag), taboo = (p.taboos || []).includes(tag); if (!liked && !taboo) return null;
  const t = tallyOf(g, c);
  if (where.act != null) { if (t.act?.k !== where.act) t.act = { k: where.act, tags: [] }; if (t.act.tags.includes(tag)) return null; t.act.tags.push(tag); }
  const name = FAITH_TAG[tag]?.name || tag;
  // A liked tag at the curve's top gives nothing, so it uses none of the caps either (item 737: a Miracle's own tags,
  // landing while Devotion is at 450, used to eat the fight's cap and part of the session's).
  if (liked && !taboo && devotionXpOf(c) >= DEVOTION_MAX_XP) return null;
  if (taboo) return shiftDevotion(g, cb, c, -(where.witnessed ? DEVOTION_XP.tabooWitnessed : DEVOTION_XP.taboo), name + (where.witnessed ? ', while Witnessed' : ''), tag);
  const f = where.fight ? (t.fight?.id === where.fight ? t.fight : (t.fight = { id: where.fight, xp: 0, tags: [] })) : null;
  const tags = f ? f.tags : t.sceneTags, have = f ? f.xp : t.sceneXp, cap = f ? TAG_CAPS.fight : TAG_CAPS.scene;
  if (tags.includes(tag)) return null;
  // The Proving Ground has no sessions (item 722): its fights and scenes keep their caps, the session's doesn't apply.
  const sessionLeft = (g as any)?.sandbox ? Infinity : TAG_CAPS.session - t.sessionXp;
  const n = Math.min(DEVOTION_XP.liked, cap - have, sessionLeft); if (n <= 0) return null;
  tags.push(tag); if (f) f.xp += n; else t.sceneXp += n; t.sessionXp += n;
  return shiftDevotion(g, cb, c, n, name, tag);
}

/** Devotion XP given by an item (rules 1.44: the resource row `devotion_xp`, the op `resource`; Survival's Devout):
 * a gain counts inside the session's tag cap (TAG_CAPS.session, as a liked tag does; the Proving Ground has none), a
 * loss is taken whole. Through shiftDevotion. Returns the XP moved. */
export function itemDevotion(g: GameState | null, cb: Combat | null, c: Character, n: number, why: string): number {
  if (!n || beliefOf(c).kind !== 'faithful') return 0;
  if (n < 0) return shiftDevotion(g, cb, c, n, why);
  const t = tallyOf(g, c), left = (g as any)?.sandbox ? Infinity : TAG_CAPS.session - t.sessionXp, k = Math.min(n, left);
  if (k <= 0) return 0;
  t.sessionXp += k;
  return shiftDevotion(g, cb, c, k, why);
}
setResSetter('devotion', (cb, u, n, _by, why) => { const g = G(), c = g && u.charId ? g.characters[u.charId] : null; return c ? itemDevotion(g, cb ?? null, c, n, why || 'an item') : 0; });

// ---------- a grudge: the patron you left lobbies against you (rules 1.6.1, item 713) ----------
export interface Grudge { patron: string; /** The last session it lasts through. */ until: number; condition: string; rounds: number; xp_mult: number; text: string; carry?: number }
/** The character's grudge while it lasts (it lasts through session `until`; returning to that patron ends it). */
export function grudgeOf(g: GameState | null, c: Character): Grudge | null {
  const gr = c.grudge as Grudge | undefined; if (!gr) return null;
  if (sessionN(g) > gr.until || patronOf(c)?.id === gr.patron) return null;
  return gr;
}
/** Days before a pact can be made again after leaving one (0: none). */
export function pactCooldownLeft(g: GameState | null, c: Character): number { const l = c.faithLeft; return l ? Math.max(0, l.day + PACT_COOLDOWN_DAYS - dayOf(g)) : 0; }
/** An fx event on the story's list (out of a fight). */
function storyFx(g: GameState, k: string, data: Record<string, any>): Record<string, any> {
  const st: any = g.story; const n = (st.fxSeq = (st.fxSeq || 0) + 1), list = (st.fx ||= []), ev = { n, k, ...data }; list.push(ev);
  if (list.length > FX_CAP) list.splice(0, list.length - FX_CAP);
  return ev;
}
/** An effect line (" · a · b") as a sentence for the Miracle's box (item 746). */
const summaryOf = (did: string): string => { const t = String(did || '').replace(/^\s*·\s*/, '').replace(/\s+·\s+/g, '; ').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) + '.' : ''; };
/** A patron speaks: a line from its bank, picked with the game's dice (deterministic). */
export function patronLine(rng: Rng, patron: any, bank: string): string | null {
  const lines: string[] = patron?.lines?.[bank] || []; if (!lines.length) return null;
  return lines[die(rng, lines.length) - 1];
}
/** The god grants a Miracle (rules 1.6.3, item 745): a grant line with {name} as the character's name in capitals. */
export function grantLine(rng: Rng, patron: any, name: string): string | null {
  const t = patronLine(rng, patron, 'grant'); return t ? t.split('{name}').join(String(name || '').toUpperCase()) : null;
}
/** The patron speaks: the line goes on the stream and the log; returns the line it said (the spotlight's caption). */
function speak(g: GameState | null, cb: Combat | null, rng: Rng, c: Character, patron: any, bank: string, said?: string | null): string | null {
  const text = said ?? patronLine(rng, patron, bank); if (!text) return null;
  const ev = { patron: patron.id, event: bank, text, char: c.id };
  if (cb) { emitFx(cb, FAITH_FX.patron_line, ev); say(cb, patron.name + ': "' + text + '"'); }
  else if (g) { storyFx(g, FAITH_FX.patron_line, ev); B?.push(g, { kind: 'system', head: patron.name.toUpperCase(), text: '"' + text + '"' }); }
  return text;
}
const fs = (u: Unit): Record<string, any> => (u.faith ||= {});
const unitChar = (u: Unit | null | undefined): Character | null => charOfUnit(u);
/** The game and its rng while a fight runs (bound by apply()). */
const G = (): GameState | null => boundGame() as GameState | null;

// ---------- tags: what your patron sees (spec 1.6 §6; items 595-601; rules 1.6.1 items 703-704) ----------
/** The current action's key: a tag counts once per action (item 596). Kept on the character's tally, so it holds on the
 * area map too, where the units are rebuilt every action. */
const actionKey = (cb: Combat) => (overworld(cb) ? 'w' : 'f') + String((G() as any)?.v ?? '') + ':' + cb.round + ':' + cb.turn;
/** A Faithful fighter's action carried a tag: liked +1 XP (once per fight or scene, within the caps), taboo −3 (−6 while
 * Witnessed). On the area map (an overworld fight state) the tag counts toward the scene. */
export function faithTag(cb: Combat, u: Unit | null | undefined, tag: string, ctx: { victimHelpless?: boolean } = {}) {
  if (!u || !u.charId || ACTING.includes(u)) return; // the patron's own act pays nothing (item 747)
  const c = unitChar(u); if (!c) return; const p = patronOf(c); if (!p) return;
  if ((p.taboos || []).includes(tag) && p.taboo_notes?.[tag] && !ctx.victimHelpless) return; // the Toll-Keeper's and Matchmaker's "kill" is of the helpless (item 597)
  const g = G(), taboo = (p.taboos || []).includes(tag);
  const moved = tagDevotion(g, cb, c, tag, { fight: overworld(cb) ? null : fightId(cb), act: actionKey(cb), witnessed: condOn(u, 'witnessed') });
  if (taboo && moved !== null) speak(g, cb, rngOf(), c, p, 'taboo');
}
const helpless = (t: Unit) => !!(t.downed || t.surrendered);
/** Someone harmed a surrendered or Downed creature: judge marks them; the Mercy vow breaks; Nerukhan answers. */
function harmedHelpless(cb: Combat, by: Unit, t: Unit) {
  if (ACTING.includes(by)) return; // the patron's Storm, not the devoted's hand (item 747)
  fs(by).harmedHelpless = true;
  if (vowOn(by, 'mercy')) breakVow(cb, by, 'harmed ' + t.name + ', who ' + (t.surrendered ? 'had yielded' : 'was down'));
  for (const f of intervening(cb, 'nerukhan')) { if (f.side === by.side || by.dead) continue; const n = scaled(f); intervene(cb, f, 'enemy_harms_helpless', by, n, () => harmLine(cb, f, by, n, 'soul')); break; }
}
const nearestEnemy = (cb: Combat, u: Unit) => cb.units.filter((v) => v.side !== u.side && alive(v)).reduce((m, v) => Math.min(m, dist(v.pos, u.pos)), 99);

// ---------- vows (spec 1.6 §5; item 602) ----------
function breakVow(cb: Combat, u: Unit, why: string) {
  const v = u.vow; if (!v || v.state !== 'sworn') return;
  const c = unitChar(u); if (!c) return; v.state = 'broken'; if (c.vow) c.vow = { ...v };
  emitFx(cb, FAITH_FX.vow, { unit: u.id, char: c.id, id: v.id, state: 'broken', ...(v.allyId ? { allyId: v.allyId } : {}) });
  say(cb, u.name + ' breaks the vow "' + (VOW[v.id]?.words || v.id) + '" (' + why + ').');
  shiftDevotion(G(), cb, c, -DEVOTION_XP.vowBroken, 'vow broken'); feelChar(G(), c, 'shame', 'a vow broken', cb);
  const p = patronOf(c); if (p) speak(G(), cb, rngOf(), c, p, 'vow_broken');
}
const vowOn = (u: Unit | null | undefined, id: string) => !!u?.vow && u.vow.state === 'sworn' && u.vow.id === id;
/** Rules 1.22 (items 1283-1284): a vow's moment came in the fight. The Hymn this fighter is waiting for comes 1 round
 * sooner (each wait is shortened once, never under 2 rounds); with no Hymn waiting, the fulfilment is kept for the next
 * one (one kept at most). At most one a round; a moment that could change nothing is not spent and says nothing. The
 * vow stays sworn: it is still kept or broken at the fight's end. Returns whether it counted. */
export function fulfilVow(cb: Combat, u: Unit, why: string): boolean {
  const v = u.vow; if (!v || v.state !== 'sworn' || u.dead || u.downed) return false;
  const c = unitChar(u); if (!c || overworld(cb)) return false; const st = fs(u);
  if (st.vowRound === cb.round) return false;
  const waiting = hymnLeft(cb, c, u) > 0; let banked = false;
  if (waiting) { if (st.hymnCut) return false; const was = hymnWait(c, u); st.hymnCut = HYMN_COOLDOWN.vowCut; if (hymnWait(c, u) >= was) { delete st.hymnCut; return false; } }
  else { if (st.vowBank) return false; st.vowBank = HYMN_COOLDOWN.vowCut; banked = true; }
  st.vowRound = cb.round; st.vowFulfilled = (st.vowFulfilled || 0) + 1;
  const left = hymnLeft(cb, c, u), n = HYMN_COOLDOWN.vowCut;
  emitFx(cb, FAITH_FX.vow, { unit: u.id, char: c.id, id: v.id, state: 'fulfilled', why, cut: n, left, at: u.pos, ...(banked ? { banked: true } : {}), ...(v.allyId ? { allyId: v.allyId } : {}) });
  say(cb, u.name + ' fulfils the vow "' + (VOW[v.id]?.words || v.id) + '" (' + why + '): ' + (banked ? 'the wait after the next Hymn will be ' + n + ' round shorter' : 'the next Hymn comes ' + n + ' round sooner (' + (left > 0 ? 'in ' + left + (left === 1 ? ' round' : ' rounds') : 'ready now') + ')') + '.');
  // The patron speaks the first time in a fight (its vow_kept bank; the fight's end speaks it again when the vow is kept).
  if (st.vowFulfilled === 1) { const p = patronOf(c); if (p) speak(G(), cb, rngOf(), c, p, 'vow_kept'); }
  return true;
}

// ---------- interventions (spec 1.6 §8; item 603; rules 1.6.3, items 739-744) ----------
/** Interventions this fighter's patron made this fight (an old save's flag counts as one; item 740). */
const interventionsUsed = (f: Unit): number => fs(f).interventions ?? (fs(f).intervened ? 1 : 0);
/** Faithful fighters on this fight whose patron may still intervene: Witnessed, and under the fight's limit (once, or
 * twice from Devotion 7). */
function intervening(cb: Combat, patronId: string): Unit[] {
  return cb.units.filter((f) => {
    if (!f.charId || f.dead || !condOn(f, 'witnessed') || ACTING.includes(f)) return false;
    const c = unitChar(f); return !!c && patronOf(c)?.id === patronId && interventionsUsed(f) < interventionLimit(c);
  });
}
/** The Devotion-scaled number for this fighter's patron (item 741). */
const scaled = (f: Unit): number => { const c = unitChar(f); return c ? interventionAmount(c, f.blessPower || blessingPower(c)) : 0; };
/** Fighters whose patron is acting right now (item 747): while its effect runs, the same Witnessed can't set off another
 * intervention (Old Overcast's Storm downing the next foe), and what the patron does is not the devoted's deed: no tag
 * (no Devotion XP, no taboo) and no mark for harming the helpless. */
const ACTING: Unit[] = [];
/** The patron acts: the effect (run), the fx event, the log, its line; then Witnessed ends (item 739). */
function intervene(cb: Combat, f: Unit, trigger: string, target: Unit | null, amount: number | null, run: () => string) {
  const c = unitChar(f)!, p = patronOf(c)!; const st = fs(f); st.interventions = interventionsUsed(f) + 1; delete st.intervened;
  emitFx(cb, FAITH_FX.intervention, { unit: f.id, patron: p.id, trigger, target: target?.id || null, amount, at: (target || f).pos });
  ACTING.push(f); let said: string;
  try { said = run(); } finally { ACTING.splice(ACTING.lastIndexOf(f), 1); }
  say(cb, p.name + ' intervenes for ' + f.name + said + '.');
  const line = speak(G(), cb, rngOf(), c, p, 'intervention');
  // Decision 113: a god breaking in is a spotlight moment (the patron's torn strip, then the fighter's; the action it
  // happened in plays back slower). Presentation only. Never from the area map's dry run (game.ts: a throwaway copy of
  // the map, marked dry): only the real run's intervention happened.
  const g = G(), why = String(said || '').replace(/^[\s:·]+/, '').trim();
  if (g && !(cb as any).dry) spotlight(g, { kind: 'god', patron: p.id, char: c.id, unit: f.id, reason: why || 'intervenes for ' + f.name, ...(line ? { line } : {}),
    ...(target ? { target: target.id, targetName: target.name } : {}), ...(target?.charId && target.charId !== c.id && target.side === f.side ? { targetChar: target.charId } : {}) });
  // Classes 3.0 (rev4 batch row; chaplain-spec.md rule 11, rules 1.31): stat intervention_keeps_witnessed keeps it on
  // for that many of the fight's first interventions (the Chaplain: the first; the second ends it)
  if (condOn(f, 'witnessed') && !(st.interventions <= statQuery({ cb, u: f, c }, 'intervention_keeps_witnessed').add)) { endCond(f, 'witnessed', cb); say(cb, f.name + ' is no longer Witnessed.'); }
}
// ---------- the patron at its side (Classes 3.0 step 5, the Chaplain; rules 1.31; chaplain-spec.md rules 10 to 12) ----------
/** While a Faithful fighter whose items answer stat patron_presence is Witnessed, its patron stands at its side as a
 * presence (not a unit: never targeted, blocks nothing, sees nothing): the patron's intervention reaches further as its
 * data says (patrons.json intervention.presence), and a damage intervention that picks a target picks a Judged enemy
 * of the fighter's first. Null: no presence. */
export function presenceOf(cb: Combat, f: Unit): any | null {
  if (!condOn(f, 'witnessed') || f.dead) return null;
  const c = unitChar(f), p = c ? patronOf(c) : null; if (!c || !p) return null;
  return statQuery({ cb, u: f, c }, 'patron_presence').add > 0 ? (p.intervention?.presence || {}) : null;
}
/** How far the presence carries an intervention that is the fighter's own (an ally within this many tiles counts as
 * the fighter): 0 without a presence. */
const presenceReach = (cb: Combat, f: Unit): number => Number(presenceOf(cb, f)?.ally_within) || 0;
/** Does this intervention, which fires when something happens to the fighter, also fire when it happens to `t`? */
const presenceCovers = (cb: Combat, f: Unit, t: Unit | null | undefined): boolean => !!t && (t === f || (t.side === f.side && !t.dead && dist(t.pos, f.pos) <= presenceReach(cb, f)));
/** A Judged enemy of this fighter's (its weapon struck it on its turn: the condition's source), nearest first. */
const judgedOf = (cb: Combat, f: Unit, near: string): Unit | null => cb.units.filter((v) => v.side !== f.side && alive(v) && condOn(v, 'judged') && condSource(v, 'judged') === f.id).sort((a, b) => dist(a.pos, near) - dist(b.pos, near))[0] || null;
/** The presence's Ward (the Toll-Keeper's): the item its data names, held by the fighter: that item's own `mend` op on
 * a layer, run by the generic runner with the kept-up ally as its target (its amount, layer and holders: the Ward's). */
function presenceWard(cb: Combat, f: Unit, t: Unit, key: string): string {
  const h = holdersOf({ u: f, c: unitChar(f), cb }).find((x) => x.key === key); if (!h) return '';
  const ops = (h.info.effects || []).flatMap((e: any) => [e, ...(e.effects || [])]).filter((e: any) => e.op === 'mend' && e.layer); if (!ops.length) return '';
  const lay = () => (t.shields || []).find((l) => l.layer === ops[0].layer && l.by === f.id)?.n || 0, was = lay();
  runOwnEffects(h, ops, { u: f, t, action: 'presence', tile: null, toggles: [], mode: null });
  return lay() > was ? ' and ' + h.info.name + ' (' + lay() + ')' : '';
}
/** The predicate `answered` (Smite: a prayer that rides a hit): the prayer door open (Faith for a Whisper, not
 * Silenced); the Faithful are answered, an Atheist rolls the Whisper's TN. A preview rolls nothing. */
export function prayerAnswered(cb: Combat, rng: Rng | null, u: Unit, preview: boolean): boolean {
  const c = unitChar(u); if (!c || faithOf(c) < WHISPER_FAITH || condOn(u, 'silenced')) return false;
  if (beliefOf(c).kind === 'faithful') return true;
  if (preview || !rng) return true;
  const rv = rollVs(cb, rng, { by: u, mod: prayerMod(boundGame() as any, c, u), tn: ATHEIST_TN.whisper, why: 'pray' });
  if (!rv.ok) say(cb, u.name + ' prays as the blow lands · ' + rv.text + ' · no answer.');
  return rv.ok;
}
setAnsweredDoor((cb, rng, u, preview) => prayerAnswered(cb, rng as Rng | null, u, preview));
/** The Quartermaster (item 742): a reload of yours that cost AP gives it all back. game.ts calls this after a
 * combat/reload action that succeeded, with the AP it took. */
export function faithReloaded(cb: Combat, u: Unit, spent: number) {
  if (!(spent > 0)) return;
  for (const f of intervening(cb, 'the_quartermaster')) { if (!presenceCovers(cb, f, u)) continue; intervene(cb, f, u === f ? 'you_reload' : 'ally_reload', u, spent, () => { refund(cb, u, spent); return ': the reload is free (' + spent + ' AP back)'; }); break; }
}
/** The Quartermaster's MP share when your MP runs out (item 742; patrons.json, the mp_out effect): 25% of max. */
/** Mother Ember's door: an ally below this share of max HP (rules 1.6.3: a quarter). */
const EMBER_BELOW: number = FAITH_PATRON.mother_ember?.intervention?.below ?? 0.25;
const QM_MP_SHARE: number = (FAITH_PATRON.the_quartermaster?.intervention?.effects || []).find((e: any) => e.when === 'mp_out')?.value ?? 0.25;
/** The Quartermaster (item 742, Leon 9 Nov 2026): your Evoker's charge or your MP hits 0. Each fighter's charge and MP
 * are remembered after every action and at every turn's start; one that was above 0 and is now 0 is a hit, while
 * Witnessed: a fresh core slots into the Evoker (free; the spare cores untouched), or 25% of max MP comes back. */
function quartermasterDry(cb: Combat) {
  if (overworld(cb)) return;
  for (const u of cb.units) {
    const m = u.mg; if (!u.charId || !m) continue; const st = fs(u);
    const charge = m.evoker ? Math.round(m.charge) : null, mp = m.emanator && m.mpMax > 0 ? Math.round(m.mp) : null;
    const coreHit = charge != null && st.seenCharge > 0 && charge <= 0, mpHit = mp != null && st.seenMp > 0 && mp <= 0;
    for (const hit of [coreHit && 'core_dry', mpHit && 'mp_out'] as const) {
      if (!hit || u.dead) continue;
      const f = intervening(cb, 'the_quartermaster').find((x) => x === u); if (!f) break;
      if (hit === 'core_dry') intervene(cb, f, 'core_dry', f, CORE_CHARGE, () => { m.charge = CORE_CHARGE; emitFx(cb, 'core', { unit: f.id, at: f.pos, dur: 1000 }); return ': a fresh core slots into the Evoker (' + CORE_CHARGE + ' charge; the spare cores untouched)'; });
      else { const gain = Math.floor(m.mpMax * QM_MP_SHARE); intervene(cb, f, 'mp_out', f, gain, () => { m.mp = Math.max(0, m.mp) + gain; return ': ' + gain + ' MP back (' + Math.round(m.mp) + '/' + m.mpMax + ')'; }); }
    }
    st.seenCharge = m.evoker ? Math.round(m.charge) : undefined; st.seenMp = m.emanator ? Math.round(m.mp) : undefined;
  }
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
        if (other && alive(other)) { const half = Math.floor(ctx.dmg / 2); if (half > 0) { ctx.dmg -= half; applyDamage(cb, other, half, { ...src, faithShare: true, shield: true } as any); say(cb, 'Red Thread: ' + other.name + ' takes ' + half + ' of the hit on ' + t.name + '.'); } }
        // The Matchmaker's intervention: an ally next to you is hit, half moves to you.
        else for (const f of intervening(cb, 'the_matchmaker')) {
          if (f === t || f.side !== t.side || dist(f.pos, t.pos) > Math.max(1, presenceReach(cb, f)) || !alive(f)) continue; // the presence: further (rules 1.31)
          const half = Math.floor(ctx.dmg / 2); if (half <= 0) break;
          ctx.dmg -= half;
          intervene(cb, f, 'ally_hit_adjacent', t, half, () => { applyDamage(cb, f, half, { ...src, faithShare: true } as any); return ': ' + f.name + ' takes ' + half + ' of the hit on ' + t.name; });
          faithTag(cb, f, 'protect'); break;
        }
      }
    }
    if (ctx.phase === 'would_drop_to_0' && ctx.floor == null && !ctx.self) {
      if ((cb as any).faithGates?.some((gt: any) => gt.side === t.side && gt.ids.includes(t.id))) { ctx.floor = 1; say(cb, 'Hold the Gate: ' + t.name + ' stays at 1 HP.'); return; }
      for (const f of intervening(cb, 'toll_keeper')) { if (f.side !== t.side || t.companion) continue; ctx.floor = 1; const ward = presenceOf(cb, f)?.ward; intervene(cb, f, 'ally_would_die', t, 1, () => ': ' + t.name + ' stays at 1 HP' + (ward ? presenceWard(cb, f, t, ward) : '')); break; }
    }
    if (ctx.phase === 'after' && ctx.dealt > 0 && by) {
      if (ctx.faithHelpless && !ctx.faithHelplessDone && by.side !== t.side) harmedHelpless(cb, by, t);
      if (by !== t && by.side === t.side && !src.faithShare && !['hazard', 'trap', 'bleed', 'burn', 'short'].includes(src.type)) faithTag(cb, by, 'betray');
      if (src.dmgType === 'fire') faithTag(cb, by, 'burn');
      if (src.dmgType === 'lightning' || src.dmgType === 'storm') faithTag(cb, by, 'storm');
      // The presence (rules 1.31): Nerukhan also answers a Judged enemy of the Chaplain's that hurts an ally brought low
      if (by.side !== t.side && !by.dead && !t.dead) for (const f of intervening(cb, 'nerukhan')) {
        const below = Number(presenceOf(cb, f)?.judged_harms_below) || 0; if (!below || f.side !== t.side || condSource(by, 'judged') !== f.id || t.hp > t.maxHp * below) continue;
        const n = scaled(f); intervene(cb, f, 'judged_harms_ally', by, n, () => harmLine(cb, f, by, n, 'soul')); break;
      }
    }
  });
  onHook('on_damaged', (ctx, cb) => { // Mother Ember: an ally drops below a quarter HP (below half with the presence: rules 1.31)
    const t: Unit = ctx.t; if (t.dead || t.hp <= 0) return;
    for (const f of intervening(cb, 'mother_ember')) { const at = t.maxHp * (Number(presenceOf(cb, f)?.below) || EMBER_BELOW); if (f.side !== t.side || ctx.prevHp < at || t.hp >= at) continue; const fc = unitChar(f), n = fc ? interventionHeal(fc, f.blessPower || blessingPower(fc)) : 0; intervene(cb, f, 'ally_below_quarter', t, n, () => ': ' + t.name + healLine(cb, f, t, n, 'intervention')); break; }
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
    // Rules 1.22 (item 1288): Witnessed's +2 for a patron that likes kills is earned by a kill (read here, before the
    // kill's own intervention ends Witnessed): the next attack roll at an enemy. Not for the patron's own act, nor for
    // finishing the helpless.
    if (by?.charId && !ACTING.includes(by) && condOn(by, 'witnessed') && !(v.surrendered || v.downed) && (patronOf(unitChar(by) || ({} as Character))?.likes || []).includes('kill')) fs(by).killEdge = true;
    // Rules 1.22: the vows' moments. Bare Hands: an enemy falls to your melee attack. No Magic but Theirs: to your prayer.
    if (by && vowOn(by, 'bare') && ctx.src?.type === 'weapon' && ctx.src?.melee) fulfilVow(cb, by, v.name + ' falls to their hands');
    if (by && vowOn(by, 'unarmed_faith') && (ACTING.includes(by) || viaOf(by) === 'faith')) fulfilVow(cb, by, v.name + ' falls to a prayer');
    for (const f of intervening(cb, 'old_overcast')) {
      if (f !== by) continue;
      const n = (presenceOf(cb, f)?.judged_first ? judgedOf(cb, f, v.pos) : null) || cb.units.filter((x) => x.side !== f.side && alive(x) && x !== v).sort((a, b) => dist(a.pos, v.pos) - dist(b.pos, v.pos))[0]; if (!n) break; // where the weapon struck first (rules 1.31)
      const amt = scaled(f); intervene(cb, f, 'you_kill', n, amt, () => harmLine(cb, f, n, amt, 'elemental', 'lightning')); break;
    }
  });
  onHook('heal_given', (ctx, cb) => { const by: Unit | null = ctx.by, t: Unit = ctx.t; if (by && t !== by && t.side === by.side && (ctx.n > 0 || ctx.revived)) { faithTag(cb, by, 'heal'); if (ctx.kind === 'stim') faithTag(cb, by, 'supply'); if (ctx.revived && vowOn(by, 'no_one_behind')) fulfilVow(cb, by, t.name + ' is back on their feet'); } });
  onHook('shield_grant', (ctx, cb) => { const by: Unit | null = ctx.by, t: Unit = ctx.t; if (by && t !== by && t.side === by.side && ctx.n > 0) faithTag(cb, by, 'protect'); });
  onHook('braced', (ctx, cb) => faithTag(cb, ctx.u, 'protect'));
  onHook('protect_act', (ctx, cb) => faithTag(cb, ctx.u, 'protect')); // the general Brace and an Interpose (item 600; truth pass 3)
  onHook('on_surrender', (ctx, cb) => { if (ctx.by) { faithTag(cb, ctx.by, 'mercy'); if (vowOn(ctx.by, 'mercy') && ctx.t && ctx.t.side !== ctx.by.side) fulfilVow(cb, ctx.by, ctx.t.name + (ctx.why === 'subdued' ? ' is spared' : ' yields to them')); } });
  onHook('hide', (ctx, cb) => faithTag(cb, ctx.u, 'trick'));
  onHook('gift', (ctx, cb) => { const by: Unit | null = ctx.by || ctx.from || ctx.u; if (by) faithTag(cb, by, 'supply'); });
  onHook('cond_landed', (ctx, cb) => {
    if (ctx.id === 'burning' && ctx.by) faithTag(cb, ctx.by, 'burn');
    if (ctx.t?.faith?.grudgeCond === ctx.id) delete ctx.t.faith.grudgeCond; // the same condition again, from something else: that one is real
  });
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
    quartermasterDry(cb); // anything that drained a core or MP off its own actions (item 742)
    if (u.faith?.encore) u.faith.encore.started = true; // Encore (item 729): it lasts to the end of this turn
    // Expiring "until your next turn" effects cast by this unit.
    const x: any = cb; if (x.faithGates) x.faithGates = x.faithGates.filter((gt: any) => gt.by !== u.id);
    if (x.faithClouds) x.faithClouds = x.faithClouds.filter((cl: any) => cl.by !== u.id);
    if (x.faithTogether) { // Together ends now: the pair's Inspired and Guarded from this caster
      for (const tg of x.faithTogether.filter((t: any) => t.by === u.id)) for (const id of tg.ids) { const v = cb.units.find((w) => w.id === id); if (!v) continue; for (const k of ['inspired', 'guarded']) if (condSource(v, k) === u.id) endCond(v, k, cb); }
      x.faithTogether = x.faithTogether.filter((t: any) => t.by !== u.id);
    }
    // Hearthlight: allies starting a turn in it heal the zone's amount (patrons.json; × power × the level factor).
    for (const z of x.faithZones || []) if (z.until >= cb.round && z.side === u.side && z.tiles.includes(u.pos) && !u.dead) say(cb, 'Hearthlight: ' + u.name + healLine(cb, cb.units.find((v) => v.id === z.by) || null, u, z.heal));
  });
  onHook('turn_end', (ctx, cb) => {
    const u: Unit = ctx.u;
    if (u.faith?.encore?.started) { delete u.faith.encore; say(cb, 'Encore: ' + u.name + '\'s repeat is gone.'); }
    // Rules 1.22, the Shield vow's moment: this unit attacked the ally someone named, its turn is over and the ally stands.
    for (const w of cb.units) { if (w.faith?.shieldAtk !== u.id) continue; delete w.faith.shieldAtk; if (!vowOn(w, 'shield')) continue; const al = cb.units.find((x) => x.id === w.vow!.allyId || (!!x.charId && x.charId === w.vow!.allyId)); if (al && alive(al) && !al.downed) fulfilVow(cb, w, al.name + ' was attacked and still stands'); }
    if (!u.charId) return;
    if (u.braced || u.overwatch || u.watch) faithTag(cb, u, 'hold'); // a held Watch technique is holding too (rules 1.12)
    if (u.hidden && cb.units.some((v) => v.side === u.side && v !== u && v.downed && !v.dead)) faithTag(cb, u, 'cower');
    if (u.vow?.state === 'sworn' && u.vow.id === 'stand' && fs(u).standFrom != null && nearestEnemy(cb, u) > fs(u).standFrom) breakVow(cb, u, 'ended the turn farther from the enemy');
    // Rules 1.22, the Stand vow's moment: attacked since your last turn, and the turn ends with no ground given.
    if (vowOn(u, 'stand') && fs(u).standHit) fulfilVow(cb, u, 'held their ground under attack');
    if (u.faith?.standHit) delete u.faith.standHit;
  });
  // A fight starts: its id for the tag tally (item 704); a grudge's condition on each grudged fighter, no save (item 713).
  onHook('combat_start', (ctx, cb) => {
    const g = G(), rng: Rng = ctx.rng || rngOf(); (cb as any).faithFight = 'r' + String(rng.state) + '.' + String((g as any)?.v ?? 0);
    snapRoundHp(cb); // Rewoven (item 734): round 1's HP (round_start fires from round 2)
    // Requisition Approved (item 728): what each character brought into the fight (its restock tops up to at least this).
    for (const u of cb.units) if (u.charId && !u.companion) fs(u).stock = { weapon: u.weapon, mags: u.mags?.length || 0, loose: u.loose || 0, throwables: { ...(u.throwables || {}) } };
    quartermasterDry(cb); // the charge and MP each fighter brings in (item 742): a fight begun at 0 is no "runs dry"
    for (const u of cb.units) {
      if (!u.charId || u.companion || u.dead) continue; const c = unitChar(u); if (!c) continue;
      const gr = grudgeOf(g, c); if (!gr) continue; const p = patronById(gr.patron);
      const r = applyCond(cb, rng, null, u, gr.condition, gr.rounds, undefined, { skipSave: true });
      // Item 723: it lasts its rounds of the bearer's own turns whatever the initiative (landing before the first turn
      // isn't "on your own turn"), and it ends with the fight (marked: never carried into the story).
      condNotFresh(u, gr.condition);
      if (r && !/resists|untouched/.test(r)) fs(u).grudgeCond = gr.condition;
      emitFx(cb, FAITH_FX.grudge, { char: c.id, patron: gr.patron, sessions: Math.max(0, gr.until - sessionN(g)), condition: gr.condition, at: u.pos, unit: u.id });
      say(cb, 'Grudge (' + (p?.name || gr.patron) + '): ' + u.name + ' starts the fight ' + condNameOf(gr.condition) + (r ? ' (' + r.replace(/^ · /, '') + ')' : '') + '.');
    }
  });
  onHook('round_start', (_ctx, cb) => {
    const x: any = cb; snapRoundHp(cb); // Rewoven (item 734)
    if (x.faithOrderRestore) { const keep = x.faithOrderRestore as string[]; x.faithOrderRestore = null; const extra = [...new Set(cb.order)].filter((id) => !keep.includes(id)); cb.order = [...keep, ...extra]; } // Rewoven ends
    if (x.faithZones) x.faithZones = x.faithZones.filter((z: any) => z.until >= cb.round);
  });
  onHook('action_done', (_ctx, cb) => quartermasterDry(cb)); // the Quartermaster: a core or the MP hit 0 (item 742)
  onHook('action_done', (ctx, cb) => { // Encore: the AP the last action took
    const u: Unit = ctx.u; if (!u) return; const st = fs(u);
    // Only an action that can be repeated and cost AP counts (item 729): ending the turn, declining a window, a prayer or
    // a free action never overwrites it (review fix, item 737: an ally's end-turn used to wipe its Encore).
    const key = encoreKey(ctx.a), spent = st.apMark != null ? Math.max(0, st.apMark - u.ap) : 0;
    if (key && spent > 0) { st.lastSpent = spent; st.lastRound = cb.round; st.lastKey = key; } st.apMark = u.ap;
    st.acted = true;
    if (u.charId && /^combat\/(perk|move|technique)$/.test(ctx.a?.type || '') && /trick|illusion|false_image|feint|swap|sleight/.test(String(ctx.a?.id || ctx.a?.key || ''))) faithTag(cb, u, 'trick');
  });
  // Attacks: Witnessed's +2 (item 595), Dig In's half cover, Luck, Smitten, the Bare Hands vow.
  onHook('attack_preview', (hk, cb) => {
    const att: Unit = hk.att, tgt: Unit = hk.tgt; if (!att || !tgt) return;
    if (condOn(att, 'smitten')) { const src = condSource(att, 'smitten'); const linked = (cb as any).faithLinks?.some((l: any) => l.until >= cb.round && [l.a, l.b].includes(tgt.id) && [l.a, l.b].includes(src)); if (src && (tgt.id === src || linked)) hk.fail = 'Smitten: you can\'t attack them.'; }
    if (tgt.faith?.dugIn === tgt.pos && !hk.melee) hk.terms.push({ v: -5, label: 'Dug in (half cover)' });
    if (att.faith?.luck) hk.terms.push({ v: att.faith.luck, label: 'Luck (Whisper)' });
    if (att.charId && tgt.side !== att.side && ((condOn(att, 'witnessed') && likedAttack(cb, att, tgt)) || att.faith?.killEdge)) hk.terms.push({ v: WITNESS_BONUS, label: att.faith?.killEdge ? 'Witnessed (your kill)' : 'Witnessed' });
  });
  onHook('attack_roll', (rc, cb) => {
    const att: Unit = rc.att, tgt: Unit = rc.tgt;
    if (att.faith?.luck) delete att.faith.luck;
    if (att.faith?.killEdge && tgt && tgt.side !== att.side) delete att.faith.killEdge; // spent by the roll, hit or miss (item 1288)
    // Rules 1.22: an enemy's attack on a Stand vow's swearer, or on the ally a Shield vow names, is remembered.
    if (tgt && att.side !== tgt.side) { if (vowOn(tgt, 'stand')) fs(tgt).standHit = true; for (const w of cb.units) if (w !== tgt && w.side === tgt.side && vowOn(w, 'shield') && (w.vow!.allyId === tgt.id || (!!tgt.charId && w.vow!.allyId === tgt.charId))) fs(w).shieldAtk = att.id; }
    if (tgt?.faith?.foreknown && att.side !== tgt.side) { const left = (tgt.faith.foreknown === true ? 1 : Number(tgt.faith.foreknown) || 1) - 1; if (left > 0) tgt.faith.foreknown = left; else delete tgt.faith.foreknown; rc.hit = false; say(cb, 'Foreknowing: the attack on ' + tgt.name + ' misses.'); return; }
    if (vowOn(att, 'bare') && !isMelee(WEAPON[att.weapon]) && rc.mode !== 'melee') breakVow(cb, att, 'attacked with a gun');
    // Lucky Break: the next failed attack rolls (its `uses`, 2 since rules 1.21) are each rerolled at +5.
    if (att.faith?.luckyBreak && rc.hit !== true) {
      const fails = !attackHits({ ...rc, hit: undefined });
      if (fails) { const left = (att.faith.luckyBreak === true ? 1 : Number(att.faith.luckyBreak) || 1) - 1; if (left > 0) att.faith.luckyBreak = left; else delete att.faith.luckyBreak; const r = rerollAttack(rc, rc.rng || rngOf(), 5); say(cb, 'Lucky Break: ' + att.name + ' rerolls (d20 ' + r + ' +5).'); }
    }
    if (!tgt || att.side === tgt.side) return;
    for (const f of intervening(cb, 'counting_weaver')) { if (!presenceCovers(cb, f, tgt) || !(rc.die === 20 || rc.die >= rc.critMin)) continue; intervene(cb, f, f === tgt ? 'enemy_crits_you' : 'enemy_crits_ally', att, null, () => ': the critical becomes a normal hit'); rc.die = 19; rc.critMin = 21; rc.hit = true; break; }
  });
  // The Laughing Mask (item 743): an enemy's attack at you misses (a fumble too; a shot cover stops is no miss): it
  // falls Prone, no save. In a volley the first missed shot fires it.
  onHook('on_miss', (ctx, cb) => {
    const att: Unit = ctx.att, tgt: Unit = ctx.tgt; if (!att || !tgt || att.side === tgt.side || ctx.stopped) return;
    for (const f of intervening(cb, 'the_laughing_mask')) { if (!presenceCovers(cb, f, tgt)) continue; intervene(cb, f, f === tgt ? 'enemy_misses_you' : 'enemy_misses_ally', att, null, () => applyCond(cb, ctx.rng || rngOf(), f, att, 'prone', undefined, undefined, { skipSave: true, via: 'faith' })); break; }
  });
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
/** Turned Back's allies (item 730): dead or Downed this fight, not surrendered, not a companion (a destroyed companion
 * is repaired or healed in the story first; item 737). */
function fallenAllies(cb: Combat, u: Unit): Unit[] { return cb.units.filter((x) => x.side === u.side && (x.dead || x.downed) && !x.surrendered && !x.companion); }
/** Would this Miracle find nobody in this fight (item 737)? The reason, or null. A Miracle that would land on no one
 * isn't spent: the once a session and the 5 levels stay. */
function miracleFindsNobody(cb: Combat, u: Unit, id: string): string | null {
  if (id === 'turned_back') return fallenAllies(cb, u).length ? null : 'Nobody has fallen this fight.';
  if (id === 'saints_verdict' || id === 'love_conquers') return enemiesInSight(cb, u).length ? null : 'No enemy in sight.';
  if (id === 'encore') {
    const any = cb.units.some((v) => v.side === u.side && !v.dead && !v.companion && v.faith?.lastRound === cb.round && v.faith.lastKey && v.faith.lastSpent > 0);
    return any || enemiesInSight(cb, u).length ? null : 'Nobody has acted this round and no enemy is in sight.';
  }
  return null;
}
/** Each unit's HP as a round starts (Rewoven, item 734), on the fight. */
function snapRoundHp(cb: Combat) { (cb as any).faithRoundHp = Object.fromEntries(cb.units.filter((v) => !v.dead).map((v) => [v.id, v.hp])); }
const nearestOf = (cb: Combat, u: Unit, at: string) => cb.units.filter((v) => v.side !== u.side && alive(v)).reduce((m, v) => Math.min(m, dist(v.pos, at)), 99);
/** Would this attack carry a tag the attacker's patron likes (Witnessed's +2, item 595)? */
function likedAttack(cb: Combat, att: Unit, tgt: Unit): boolean {
  const p = patronOf(unitChar(att) || ({} as Character)); if (!p) return false; const likes: string[] = p.likes || [];
  const dt = (WEAPON[att.weapon] as any)?.damage_type || 'physical';
  // 'kill' is not here (rules 1.22, item 1288): that +2 is earned by a kill (killEdge), not carried by every attack.
  return (likes.includes('judge') && !!tgt.faith?.harmedHelpless) || (likes.includes('burn') && dt === 'fire') || (likes.includes('storm') && dt === 'lightning');
}
function harmLine(cb: Combat, by: Unit, t: Unit, n: number | SpellAmount, type: 'soul' | 'elemental', dmgType?: string): string {
  return harm(cb, rngOf(), by, t, typeof n === 'number' ? Math.round(n) : n, type, dmgType);
}
function healLine(cb: Combat, by: Unit | null, t: Unit, n: number, gate: 'whisper' | 'hymn' | 'intervention' | null = null): string {
  // the percent gate and the cap (heal-shield-percent-spec.md section 4): a Whisper's and a Hymn's own share (rules.json mending.gate)
  const r = mendSized(cb, by, t, 'heal', Math.round(n), gate ? { of: gate } : null, { healKind: 'blessing' }); return r.revived ? ' stands again at ' + t.hp + ' HP' : ' heals ' + r.restored;
}
/** Reload a fighter's weapon at no AP (Resupply). */
function freeReload(cb: Combat, u: Unit): string {
  const w = WEAPON[u.weapon], ow: any = u.offWeapon ? WEAPON[u.offWeapon] : null, main = !!w && w.magazine != null, off = !!ow && ow.magazine != null && !!ow.reload; // every weapon: the off-hand gun too
  if (!main && !off) return ': nothing to reload';
  let err: string | null = null, done = false;
  if (main) { err = freely(u, () => reload(cb, u, { free: true })); done = !err; }
  if (off) { const e2 = freely(u, () => reloadHands(cb, u, 'off')); done = done || !e2; if (!main) err = e2; }
  return done ? ': ' + u.name + ' reloads, free' : ': ' + err;
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
  pay(cb, u, pv.ap);
  const lim = prayed({ c, u, cb, g });
  if (kind === 'whisper') lim.take('per_turn', 1, WHISPER_KEY); else if (kind === 'hymn') { lim.uncool(HYMN_KEY); lim.cool(0, HYMN_KEY); const st = fs(u); if (st.vowBank) { st.hymnCut = st.vowBank; delete st.vowBank; } else delete st.hymnCut; if (ownCooldown(pe.entry)) { lim.uncool(ownKey(pe.entry.id)); lim.cool(0, ownKey(pe.entry.id)); } }
  if (kind === 'miracle') { c.miracleSession = sessionN(g); }
  shiftMana(cb, PRAYER_MANA, 'a prayer');
  const name = (pe.entry.name || id) + (patron && kind !== 'whisper' ? ' (' + patron.name + ')' : '');
  const to = patron ? ' to ' + patron.name : '', what = pe.entry.name || id;
  let line = u.name + (kind === 'miracle' ? ' calls for a MIRACLE from ' + (patron?.name || '?') + ': ' + what : kind === 'whisper' ? ' whispers a prayer' + to + ': ' + what : ' prays to ' + (patron?.name || '?') + ': ' + what + ' (Hymn ' + (['', 'I', 'II', 'III'][pe.tier] || pe.tier) + ')');
  if (pv.roll) {
    const rv = rollVs(cb, rng, { by: u, mod: pv.roll.mod, tn: pv.roll.tn, why: 'pray' }), r = rv.die, tot = rv.total, ok = rv.ok;
    line += ' · ' + rv.text + (pv.mode === 'overreach' ? ' (overreach)' : '');
    if (!ok) {
      emitFx(cb, FAITH_FX.prayer_fail, { unit: u.id, kind, id, patron: patron?.id || null, at: u.pos, why: pv.mode === 'overreach' ? 'overreach' : 'dice' });
      say(cb, line + ' · no answer.');
      if (pv.mode === 'overreach') { shiftDevotion(g, cb, c, OVERREACH.miss, 'a failed overreach'); speak(g, cb, rng, c, patron, 'refused'); }
      return null;
    }
  }
  const power = u.blessPower || blessingPower(c);
  emitFx(cb, FAITH_FX.prayer, { unit: u.id, kind, id, patron: patron?.id || null, at: u.pos, target: typeof t === 'object' && t && 'id' in t ? (t as any).id : a.tile || null, ok: true });
  // The Miracle's fx (item 746) goes on the list before its effects (the cut-in plays first); once they have run it is
  // given the grant line (item 745: picked after them, so the line never moves the Miracle's own dice) and the summary
  // of what they did: the web needs no engine call.
  const mfx = kind === 'miracle' ? emitFx(cb, FAITH_FX.miracle, { patron: patron.id, id: pe.entry.id, at: a.tile || u.pos, area: a.tile ? tilesAround(a.tile, pe.entry.id === 'the_sky_answers' ? 2 : 1) : null, unit: u.id, char: c.id, name: pe.entry.name || id, text: pe.entry.text || '', line: null as string | null, summary: '' }) : null;
  // A Miracle is past the Elite and Boss guard (bug sweep, 12 Nov 2026: it may exceed the ceilings, once a session, for five levels of Devotion).
  const did = kind === 'miracle' ? unguarded(() => runEntry(cb, rng, u, kind, pe, t, a, power)) : runEntry(cb, rng, u, kind, pe, t, a, power);
  line += did;
  say(cb, line + '.');
  if (mfx) { const grant = grantLine(rng, patron, c.name); mfx.line = grant; mfx.summary = summaryOf(did); if (grant) speak(g, cb, rng, c, patron, 'grant', grant); }
  // The price after the effect, and after its line in the log (item 621's order; items 725, 737): its own tags give
  // nothing back; Devotion −5 levels.
  if (kind === 'miracle') miracleCost(g, cb, c);
  if (patron && kind !== 'whisper') speak(g, cb, rng, c, patron, kind === 'miracle' ? 'miracle' : 'answered');
  // Witnessed (Faith 5): after your own patron's Hymn or a Miracle (item 604), until the fight ends or the patron
  // intervenes (rules 1.6.3, item 738: the condition doesn't tick).
  if (kind !== 'whisper' && beliefOf(c).kind === 'faithful' && patron?.id === patronOf(c)?.id && faithOf(c) >= WITNESS_FAITH) {
    applyCond(cb, rng, u, u, 'witnessed', undefined, undefined, { skipSave: true, via: 'faith' });
    emitFx(cb, FAITH_FX.witnessed, { unit: u.id, patron: patron.id, at: u.pos });
    speak(g, cb, rng, c, patron, 'witnessed');
  }
  return null;
}
// ---------- a door verb that is a prayer (Classes 3.0 P6: grant_action `prayer: "whisper" | "hymn"`) ----------
// The verb is prayed as one of the patron's own prayers would be: the same gate (Faith, Silenced, your turn), the same
// slot (one Whisper a turn; a Hymn's wait), the same dice (an Atheist rolls; a Faithful's Hymn above its standing is an
// overreach: grant_action `tier`, default 1), the mana, Witnessed after a Hymn. Its effects are the verb's own.
/** Why this unit can't pray a verb of this kind now (null: it can). */
export function verbPrayerWhy(cb: Combat, u: Unit, kind: 'whisper' | 'hymn'): string | null {
  const c = unitChar(u), g = boundGame(); if (!c) return 'Only a character can pray.';
  if (faithOf(c) < prayerFaith(kind)) return prayerFaithWhy(kind);
  if (condOn(u, 'silenced')) return 'Silenced: no prayers.';
  if (cb.order[cb.turn] !== u.id) return 'Pray on your turn.';
  const lim = prayed({ c, u, cb, g });
  if (kind === 'whisper' && lim.left('per_turn', 1, WHISPER_KEY) <= 0) return 'One Whisper a turn.';
  if (kind === 'hymn') { const cd = hymnWait(c, u), last = lim.cooledAt(HYMN_KEY); if (last != null && lim.coolLeft(cd, HYMN_KEY) > 0) return 'Your last Hymn was ' + (cb.round - last) + ' round(s) ago: wait ' + cd + '.'; }
  return null;
}
/** Pray a verb (its gate already asked): takes the slot, moves the meter, rolls when the rules say so. True: the patron
 * answers (the verb's effects run); false: no answer (the AP and the slot are spent, as a prayer's). */
export function verbPray(cb: Combat, rng: Rng, u: Unit, kind: 'whisper' | 'hymn', name: string, tier = 1): boolean {
  const c = unitChar(u)!, g = boundGame(), lim = prayed({ c, u, cb, g }), belief = beliefOf(c), patron = patronOf(c);
  if (kind === 'whisper') lim.take('per_turn', 1, WHISPER_KEY); else { lim.uncool(HYMN_KEY); lim.cool(0, HYMN_KEY); }
  shiftMana(cb, PRAYER_MANA, 'a prayer');
  let roll: { tn: number; mod: number } | null = null, over = false;
  if (belief.kind !== 'faithful') roll = { tn: kind === 'whisper' ? ATHEIST_TN.whisper : ATHEIST_TN[tier] ?? ATHEIST_TN[1], mod: prayerMod(g, c, u) };
  else if (kind === 'hymn') { const gate = (GATE as any)[tier] ?? GATE[1], dv = devotionNow(c); if (dv < gate) { over = true; roll = { tn: OVERREACH.base + OVERREACH.step * (gate - dv), mod: prayerMod(g, c, u) }; } }
  let line = u.name + (kind === 'whisper' ? ' whispers a prayer' : ' prays') + (patron ? ' to ' + patron.name : '') + ': ' + name;
  if (roll) {
    const rv = rollVs(cb, rng, { by: u, mod: roll.mod, tn: roll.tn, why: 'pray' });
    line += ' · ' + rv.text + (over ? ' (overreach)' : '');
    if (!rv.ok) {
      emitFx(cb, FAITH_FX.prayer_fail, { unit: u.id, kind, id: name, patron: patron?.id || null, at: u.pos, why: over ? 'overreach' : 'dice' });
      say(cb, line + ' · no answer.');
      if (over) { shiftDevotion(g, cb, c, OVERREACH.miss, 'a failed overreach'); speak(g, cb, rng, c, patron, 'refused'); }
      return false;
    }
  }
  emitFx(cb, FAITH_FX.prayer, { unit: u.id, kind, id: name, patron: patron?.id || null, at: u.pos, target: null, ok: true });
  say(cb, line + '.');
  if (patron && kind === 'hymn') speak(g, cb, rng, c, patron, 'answered');
  if (kind === 'hymn' && belief.kind === 'faithful' && patron && faithOf(c) >= WITNESS_FAITH) {
    applyCond(cb, rng, u, u, 'witnessed', undefined, undefined, { skipSave: true, via: 'faith' });
    emitFx(cb, FAITH_FX.witnessed, { unit: u.id, patron: patron.id, at: u.pos });
    speak(g, cb, rng, c, patron, 'witnessed');
  }
  return true;
}
setPrayerDoor({ why: verbPrayerWhy, pray: verbPray });

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
/** The square of tiles within r of a tile (r 1: 3×3; r 2: 5×5). */
/** A Blessing lands on a unit: 'blessing_in' first (Blessed Shells may load it; Factory Made and The Old Blood change the
 * power), then the effect. */
function land(cb: Combat, rng: Rng, u: Unit, t: Unit, entry: any, power: number, run: (power: number) => string): string {
  const ctx: any = emit(cb, 'blessing_in', { u, t, blessing: entry, power, handled: false, out: '', cb, rng });
  if (ctx.handled) return ctx.out || '';
  return run(Math.max(0, ctx.power ?? power));
}
const enemiesIn = (cb: Combat, u: Unit, tiles: string[]) => foesOf(cb, u, { downed: true }).filter((v) => tiles.includes(v.pos)); // a Downed enemy in the area counts
/** A Hymn's save: the one save (rolls.ts), delivered by Faith. */
const hymnSave = (cb: Combat, rng: Rng, by: Unit, t: Unit, fam: 'body' | 'brain' | 'heart') => saveAgainst(cb, rng, by, t, fam, 'hymn', { via: 'faith' });
/** Enemies the praying unit sees (not Hidden, not out of the fight): a Miracle's "every enemy in sight". */
const enemiesInSight = (cb: Combat, u: Unit) => foesOf(cb, u, { hidden: false, seenBy: u });
/** Would this enemy yield to Love Conquers: not a boss, not a machine, not no_surrender (a refused parley doesn't matter). */
const canYield = (v: Unit) => v.side === 'foe' && v.tier !== 'boss' && !['machine', 'robot', 'turret', 'drone'].includes(v.kind || '') && !(v.tags || []).includes('no_surrender');
/** End every harmful condition on a unit (Everyone Home): the non-boon conditions, and Prone, Bleeding, Dazed and a
 * fumble's stagger. Returns their ids. */
function cleanseHarmful(cb: Combat, v: Unit): string[] {
  const ids = Object.keys(v.conds || {}).filter((k) => !condIsBoon(k) && condOn(v, k));
  if (v.prone) ids.push('prone'); if ((v.bleed || 0) > 0) ids.push('bleeding'); if (v.dazedNext) ids.push('dazed');
  for (const k of ids) endCond(v, k, cb);
  clearStagger(v); if (v.faith?.grudgeCond) delete v.faith.grudgeCond;
  return ids;
}
/** Requisition Approved's restock of one fighter (item 728): every magazine full (the loaded one, the spares, at least
 * as many spares as the fight began with), loose rounds and throwables back to at least what the fight began with,
 * Supplies to their maximum, 2 standard cores, every weapon carried at full durability, no jam, no heat. */
function restock(cb: Combat, v: Unit): string {
  const st = fs(v).stock || {}, c = unitChar(v), bits: string[] = [];
  const w = WEAPON[v.weapon], size = magazineSize(v.weapon, v.mods) ?? w?.magazine ?? null;
  if (w && size != null && !v.infiniteAmmo) {
    v.ammo = Math.max(v.ammo, size);
    if (v.mags && w.reload !== 'loose') {
      const n = Math.max(v.mags.length, st.weapon === v.weapon ? st.mags || 0 : 0);
      while (v.mags.length < n) { v.mags.push(size); if (v.magTypes) v.magTypes.push(null); }
      v.mags = v.mags.map(() => size);
    }
    if (st.weapon === v.weapon && (st.loose || 0) > (v.loose || 0)) v.loose = st.loose;
    bits.push('magazines full');
  }
  if (v.offWeapon) { const ow = WEAPON[v.offWeapon]; if (ow?.magazine != null) { v.offAmmo = ow.magazine; if (v.offMags) v.offMags = v.offMags.map(() => ow.magazine!); } }
  const thr = st.throwables || {}; let got = 0;
  for (const [k, n] of Object.entries(thr) as [string, number][]) { const have = v.throwables?.[k] || 0; if (n > have) { (v.throwables ||= {})[k] = n; got += n - have; } }
  if (got) bits.push(got + ' throwable' + (got === 1 ? '' : 's') + ' back');
  if (v.res && v.resMax?.supplies != null) { v.res.supplies = v.resMax.supplies; bits.push(v.resMax.supplies + ' Supplies'); }
  if (v.mg) v.mg.cores += 2; else if (c) c.pack = [...packOf(c).map((x) => ({ ...x })), { id: 'standard_core', item: 'standard_core', name: ITEM.standard_core?.name || 'Standard mana core', qty: 2, kind: 'ammo' } as any];
  bits.push('+2 cores');
  if (v.maxDur) v.dur = v.maxDur;
  if (c) {
    if (c.offHand && c.offHand.dur != null) c.offHand = { ...c.offHand, dur: maxDurOf(c.offHand.id, c.offHand.rarity) };
    c.pack = packOf(c).map((x) => (x.weapon && x.dur != null ? { ...x, dur: maxDurOf(x.weapon, x.rarity) } : x));
  }
  bits.push('repaired'); v.jammed = false; v.heat = 0;
  return ': ' + bits.join(', ') + ', no jam, no heat';
}
/** An action's words for the log (Encore): "Shot", "Move", "Perk: x"… */
function actionWords(key: string): string { const [t, what] = key.split(':'); const n = t.replace('combat/', ''); return (n.charAt(0).toUpperCase() + n.slice(1)).replace('-', ' ') + (what ? ' (' + what + ')' : ''); }
/** Encore (item 729), after the action that repeated the unit's Encore action: the repeat was free up to the AP it
 * cost before (`credit`; the credit pay() drew on, effects/cost.ts), any more it costs now was paid; the Encore is used. */
export function encoreUsed(cb: Combat, u: Unit, spent: number, credit: number) {
  const x = { credit };
  const key = u.faith?.encore?.key || ''; if (u.faith) delete u.faith.encore;
  say(cb, 'Encore: ' + u.name + ' repeats ' + actionWords(key) + (spent > x.credit ? ' (' + (spent - x.credit) + ' AP more than before)' : ', free') + '.');
}
// ---------- rules 1.21 (the Faith fit, item 1269): a prayer's damage and counts are read from its data entry ----------
/** The first effect of an entry with this op (and passing this test), or null. */
const fxOf = (entry: any, op: string, ok: (f: any) => boolean = () => true): any => (entry?.effects || []).find((f: any) => f.op === op && ok(f)) || null;
/** A prayer's damage base before Blessing power (patrons.json: a stat_mod on hp below 0); `fallback` only for data without one. */
export const prayerDamage = (entry: any, fallback = 0): number => { const f = fxOf(entry, 'stat_mod', (q) => q.stat === 'hp' && Number(q.value) < 0); return f ? -Number(f.value) : fallback; };
/** Cut Short (item 1268): an enemy it has just cost a turn can't be Cut Short again until `again_after_rounds` rounds have gone by. */
export function cutShortWhy(cb: Combat, v: Unit | null | undefined, entry: any): string | null {
  const n = Number(fxOf(entry, 'condition')?.again_after_rounds ?? 2), last = v?.faith?.cutShortRound;
  return v && last != null && cb.round - last < n ? v.name + ' has just been Cut Short: not again until round ' + (last + n) + '.' : null;
}
/** Run a Whisper, Hymn or Miracle's effect (spec 1.6 §3 and §8; items 607-617; rules 1.6.2's Miracles, items 727-734). */
/** What a prayer puts on someone is delivered by Faith (rules 1.13). */
function runEntry(cb: Combat, rng: Rng, u: Unit, kind: PrayerKind, pe: { entry: any; patron: any }, t: Target, a: CombatPrayArgs, power: number): string {
  return withVia(u, 'faith', () => runEntryInner(cb, rng, u, kind, pe, t, a, power));
}
function runEntryInner(cb: Combat, rng: Rng, u: Unit, kind: PrayerKind, pe: { entry: any; patron: any }, t: Target, a: CombatPrayArgs, power: number): string {
  const e = pe.entry, id = e.id, one = t && !('units' in (t as any)) ? (t as Unit) : null, two = t && 'units' in (t as any) ? (t as any).units as Unit[] : [];
  const allies = cb.units.filter((v) => v.side === u.side && !v.dead && !v.companion);
  if (kind === 'whisper') {
    const x = one || u;
    switch (id) {
      case 'luck': fs(x).luck = 2; return ' · ' + x.name + ': +2 on the next roll';
      case 'health': return land(cb, rng, u, x, e, power, (pw) => ' · ' + x.name + healLine(cb, u, x, prayerAmount('heal', effVal(e, 'heal'), pw, levelTerm(u)), 'whisper'));
      case 'protection': return land(cb, rng, u, x, e, power, (pw) => ' · ' + x.name + ' gains a ' + mendSized(cb, u, x, 'shield', prayerAmount('shield', effVal(e, 'shield'), pw, levelTerm(u)), { of: 'whisper' }, { healKind: 'blessing' }).shield + ' shield');
      case 'courage': { const had = ['fear', 'shaken'].filter((k) => condOn(x, k)); for (const k of had) endCond(x, k, cb); return ' · ' + x.name + (had.length ? ' steadies (' + had.join(', ') + ' ended)' : ' was already steady'); }
      case 'guidance': {
        let out = '';
        for (const v of cb.units) if (v.side !== u.side && v.hidden && dist(v.pos, u.pos) <= 6) out += reveal(cb, v, 'Guidance');
        for (const o of (cb.objects || []) as any[]) if (o.hidden && /trap|mine/.test(o.kind || '') && dist(o.pos, u.pos) <= 6) { const kb = (o.knownBy ||= []); if (!kb.includes(u.side)) kb.push(u.side); out += ' · a trap at ' + refOf(o.pos); }
        fs(u).guidance = true; return out + ' · +2 on your next spotting roll';
      }
      case 'safe_passage': fs(u).safePassage = turnKey(cb); return ' · your next move this turn draws no opportunity attacks';
      case 'rebuke': return one && one.side !== u.side ? land(cb, rng, u, one, e, power, (pw) => harmLine(cb, u, one, prayerStrike(prayerDamage(e), pw, dealTerm(u)), 'soul')) : ''; // rules 1.21, item 1260
    }
    return '';
  }
  switch (id) {
    // Holy Father Nerukhan
    case 'saints_shield': return land(cb, rng, u, one!, e, power, (pw) => ' · ' + one!.name + ' gains a ' + mendSized(cb, u, one!, 'shield', prayerAmount('shield', effVal(e, 'shield'), pw, levelTerm(u)), { of: 'hymn' }, { healKind: 'blessing' }).shield + ' shield');
    case 'judgement': return land(cb, rng, u, one!, e, power, (pw) => { const hm = one!.faith?.harmedHelpless ? Number(fxOf(e, 'vs_status_damage')?.mult ?? 1.3) : 1; return harmLine(cb, u, one!, prayerStrike(prayerDamage(e), pw, term(hm, 'it harmed the helpless'), dealTerm(u)), 'soul') + (hm !== 1 ? ' (×' + hm + ': it harmed the helpless)' : ''); });
    case 'absolution': return land(cb, rng, u, one!, e, power, (pw) => { const ids = cleanseHarmful(cb, one!); return ' · ' + one!.name + ' is absolved' + (ids.length ? ' (' + ids.join(', ') + ')' : '') + ' and' + healLine(cb, u, one!, prayerAmount('heal', effVal(e, 'heal'), pw, levelTerm(u))); });
    case 'saints_verdict': { // rules 1.6.2 (item 727): every enemy in sight; double and 2 rounds for those that harmed the helpless
      let out = '';
      for (const v of enemiesInSight(cb, u)) { const hh = !!v.faith?.harmedHelpless; out += land(cb, rng, u, v, e, power, (pw) => harmLine(cb, u, v, prayerStrike(prayerDamage(e), pw, term(hh ? Number(fxOf(e, 'damage_mult')?.value ?? 2) : 1, 'it harmed the helpless'), dealTerm(u)), 'soul') + (hh ? ' (×' + Number(fxOf(e, 'damage_mult')?.value ?? 2) + ': it harmed the helpless)' : '') + applyCond(cb, rng, u, v, 'stunned', hh ? 2 : 1, undefined, { skipSave: true })); }
      return out || ' · no enemy in sight';
    }
    // The Quartermaster
    case 'resupply': return land(cb, rng, u, one!, e, power, () => { const r = freeReload(cb, one!); if (one !== u) faithTag(cb, u, 'supply'); const res = (one!.res ||= {}); if (res.supplies != null) res.supplies = Math.min(res.supplies + 1, one!.resMax?.supplies ?? res.supplies + 1); return r + (res.supplies != null ? ' · +1 Supply' : ''); });
    case 'dig_in': return land(cb, rng, u, one!, e, power, () => { fs(one!).dugIn = one!.pos; setBraced(one!, true); return ' · ' + one!.name + ' digs in (half cover until they move) and is Braced'; });
    case 'covering_fire': { let out = ''; for (const v of enemiesIn(cb, u, tilesAround(a.tile!, 1))) out += applyCond(cb, rng, u, v, 'pinned', 1, 'body'); return out || ' · nobody in the area'; }
    case 'requisition_approved': { // rules 1.6.2 (item 728): the whole squad (characters), restocked, repaired, cleared, +3 AP banked
      let out = ''; const squad = cb.units.filter((x) => x.side === u.side && x.charId && !x.companion && !x.dead);
      for (const v of squad) { out += ' · ' + v.name + restock(cb, v); bankAp(v, 3, 'Requisition Approved', cb, u); }
      return out + ' · every ally +3 AP next turn (banked: within the +3 a turn and the ceiling of 9)';
    }
    // The Laughing Mask
    case 'lucky_break': { const n = Math.max(1, Number(fxOf(e, 'reroll')?.uses ?? 2)); fs(one!).luckyBreak = n; return ' · ' + one!.name + '\'s next ' + (n > 1 ? n + ' failed attack rolls are each' : 'failed attack roll is') + ' rerolled at +5'; } // item 1265
    case 'switcheroo': {
      const [x, y] = two; for (const v of [x, y]) if (v.side !== u.side) { const s = hymnSave(cb, rng, u, v, 'brain'); if (s.ok) return ' · ' + v.name + ' resists (' + s.text + ')'; }
      const px = x.pos, py = y.pos; // the caster's own side is swapped willingly; an enemy that failed its save is moved by force
      const sw = swapUnits(cb, rng, x, y, { by: u, source: 'switcheroo', willing: [x, y].filter((v) => v.side === u.side), drawn: () => { emitFx(cb, 'shove', { unit: u.id, target: x.id, from: px, to: py, ok: true, magic: true, swap: true }); emitFx(cb, 'shove', { unit: u.id, target: y.id, from: py, to: px, ok: true, magic: true, swap: true }); } });
      if (!sw.ok) return ' · ' + (sw.who?.name || 'it') + ' can\'t be moved' + (sw.why ? ' (' + sw.why + ')' : '');
      faithTag(cb, u, 'trick'); return ' · ' + x.name + ' and ' + y.name + ' swap places' + sw.text;
    }
    case 'pratfall': { const s = hymnSave(cb, rng, u, one!, 'body'); if (s.ok) return ' · ' + one!.name + ' keeps its feet (' + s.text + ')'; return applyCond(cb, rng, u, one!, 'prone', undefined, undefined, { skipSave: true }) + applyCond(cb, rng, u, one!, 'disarmed', undefined, undefined, { skipSave: true }); }
    case 'encore': { // rules 1.6.2 (item 729): each ally may repeat its last action this round for free; enemies in sight Confused
      let out = '';
      for (const v of allies) {
        const st = v.faith; if (!(st?.lastRound === cb.round && st.lastKey && st.lastSpent > 0)) continue;
        st.encore = { key: st.lastKey, ap: st.lastSpent, started: v === u, round: cb.round };
        out += ' · ' + v.name + ' may repeat ' + actionWords(st.lastKey) + ' for free (' + st.lastSpent + ' AP' + (v === u ? ', this turn' : ', until the end of their next turn') + ')';
      }
      if (!out) out = ' · nobody has acted yet this round';
      for (const v of enemiesInSight(cb, u)) out += applyCond(cb, rng, u, v, 'confused', 1, undefined, { skipSave: true });
      return out;
    }
    // The Toll-Keeper
    case 'coin_for_the_ferry': return land(cb, rng, u, one!, e, power, (pw) => ' · ' + one!.name + healLine(cb, u, one!, prayerAmount('heal', effVal(e, 'heal'), pw, levelTerm(u))));
    case 'hold_the_gate': { const ids = allies.filter((v) => v === u || unitSees(cb, u, v.pos)).map((v) => v.id); ((cb as any).faithGates ||= []).push({ by: u.id, side: u.side, ids }); return ' · ' + ids.length + ' allies can\'t drop below 1 HP until your next turn'; }
    case 'last_crossing': {
      const v = one!; if (v.hp > v.maxHp / 4) return ' · ' + v.name + ' is not near enough to the shore (above a quarter HP)';
      if (v.tier === 'boss') return harmLine(cb, u, v, prayerStrike(Number(fxOf(e, 'execute')?.boss_damage ?? 0), power, dealTerm(u)), 'soul') + ' (a boss: ' + Number(fxOf(e, 'execute')?.boss_damage ?? 0) + ' Soul)';
      const s = hymnSave(cb, rng, u, v, 'heart'); if (s.ok) return ' · ' + v.name + ' holds on (' + s.text + ')';
      applyDamage(cb, v, v.hp + (v.shield || 0), { by: u, type: 'true', shield: false, credit: 'hp' }); return ' · ' + v.name + ' crosses over (' + s.text + ')';
    }
    case 'turned_back': { // rules 1.6.2 (item 730): every ally who died or fell this fight stands at half HP
      let out = '';
      for (const v of fallenAllies(cb, u)) {
        const was = v.dead ? 'crossed' : 'fell', half = Math.ceil(v.maxHp / 2);
        v.dead = false; setDowned(v, false); v.hp = half; clearStagger(v);
        const ch = unitChar(v); if (ch) ch.dead = false;
        emitFx(cb, 'heal', { target: v.id, at: v.pos, amount: half });
        out += ' · ' + v.name + ' (' + was + ') is turned back at the shore: ' + half + ' HP';
      }
      return out || ' · nobody has crossed or fallen';
    }
    // Mother Ember
    case 'warm_hands': return land(cb, rng, u, one!, e, power, (pw) => ' · ' + one!.name + healLine(cb, u, one!, prayerAmount('heal', effVal(e, 'heal'), pw, levelTerm(u)), 'hymn'));
    case 'hearthlight': ((cb as any).faithZones ||= []).push({ by: u.id, side: u.side, tiles: tilesAround(a.tile!, 1), until: cb.round + 2, heal: Math.round(prayerAmount('heal', effVal(e, 'heal'), power, levelTerm(u))) }); return ' · a hearth glows at ' + refOf(a.tile!) + ' for 3 rounds';
    case 'feed_the_fire': return land(cb, rng, u, one!, e, power, () => { const n = Number(fxOf(e, 'stat_mod', (q) => q.stat === 'ap')?.value ?? 2), was = one!.ap; grantAp(cb, one!, n); const had = ['weakened', 'slowed'].filter((k) => condOn(one!, k)); for (const k of had) endCond(one!, k, cb); return ' · ' + one!.name + ' +' + (one!.ap - was) + ' AP' + (had.length ? ', ' + had.join(' and ') + ' ended' : ''); });
    case 'everyone_home': { // rules 1.6.2 (item 731): full HP, the Downed stand, every harmful condition ends, a 40 shield each
      let out = '';
      for (const v of cb.units.filter((x) => x.side === u.side && !x.dead)) out += land(cb, rng, u, v, e, power, (pw) => {
        const up = v.downed; healUnit(cb, v, v.maxHp, u, 'blessing', { noLimit: true }); v.hp = v.maxHp; // to full whatever trims a heal
        const ended = cleanseHarmful(cb, v);
        return ' · ' + v.name + (up ? ' stands at full HP' : ' heals to full') + (ended.length ? ', cleansed (' + ended.join(', ') + ')' : '') + ', a ' + grantShield(cb, v, prayerAmount('shield', effVal(e, 'shield'), pw, levelTerm(u)), u, { kind: 'blessing' }) + ' shield';
      });
      return out;
    }
    // Old Overcast
    case 'thunderclap': { let out = ''; const from = { pos: a.tile } as any as Unit; const dmg = prayerDamage(e); for (const v of cb.units.filter((x) => x.side !== u.side && !x.dead && !x.surrendered && dist(x.pos, a.tile!) <= 2)) { if (dmg > 0) out += harmLine(cb, u, v, prayerStrike(dmg, power, dealTerm(u)), 'elemental', 'lightning'); if (v.dead || v.downed) continue; out += pushAway(cb, from, v, 1) + applyCond(cb, rng, u, v, 'shaken', undefined, 'heart'); } return out || ' · nobody there'; } // item 1261: the thunder hurts
    case 'lightning_rod': return land(cb, rng, u, one!, e, power, (pw) => { let out = harmLine(cb, u, one!, prayerStrike(prayerDamage(e), pw, dealTerm(u)), 'elemental', 'lightning'); const n = cb.units.filter((x) => x.side !== u.side && alive(x) && x !== one && dist(x.pos, one!.pos) <= 2).sort((p, q) => dist(p.pos, one!.pos) - dist(q.pos, one!.pos))[0]; if (n) out += ' · it chains to ' + n.name + harmLine(cb, u, n, prayerStrike(Number(fxOf(e, 'chain_damage')?.value ?? 0), pw, dealTerm(u)), 'elemental', 'lightning'); return out; });
    case 'gather_the_clouds': ((cb as any).faithClouds ||= []).push({ by: u.id, side: u.side }); return ' · until your next turn, your side\'s Storm riders count a stage higher';
    case 'the_sky_answers': { // rules 1.6.2 (item 732): a 5×5 in sight; the sky picks: enemies only; 150 Storm, Stunned 1, Shaken
      let out = ''; const tiles = tilesAround(a.tile!, 2);
      for (const v of cb.units.filter((x) => x.side !== u.side && alive(x) && tiles.includes(x.pos))) out += harmLine(cb, u, v, prayerStrike(prayerDamage(e), power, dealTerm(u)), 'elemental', 'lightning') + applyCond(cb, rng, u, v, 'stunned', 1, undefined, { skipSave: true }) + applyCond(cb, rng, u, v, 'shaken', undefined, undefined, { skipSave: true });
      return out || ' · the sky strikes empty ground';
    }
    // The Matchmaker
    case 'red_thread': { const [x, y] = two; ((cb as any).faithLinks ||= []).push({ a: x.id, b: y.id, until: cb.round + 1, by: u.id }); return ' · ' + x.name + ' and ' + y.name + ' are bound by a red thread for 2 rounds'; }
    case 'sweet_nothings': return applyCond(cb, rng, u, one!, 'smitten', 1, 'heart');
    case 'together': {
      // Until the caster's next turn (the card; item 615): held on the fight and ended at the caster's turn_start, as Hold
      // the Gate is. A 1-round condition ended at each bearer's own turn end instead (truth pass 3).
      const [x, y] = two; ((cb as any).faithTogether ||= []).push({ by: u.id, ids: [x.id, y.id] });
      return applyCond(cb, rng, u, x, 'inspired', TOGETHER_HOLD, undefined, { skipSave: true }) + applyCond(cb, rng, u, x, 'guarded', TOGETHER_HOLD, undefined, { skipSave: true }) + applyCond(cb, rng, u, y, 'inspired', TOGETHER_HOLD, undefined, { skipSave: true }) + applyCond(cb, rng, u, y, 'guarded', TOGETHER_HOLD, undefined, { skipSave: true });
    }
    case 'love_conquers': { // rules 1.6.2 (item 733): non-boss enemies in sight surrender, no save; who can't yield: Heart save or Commanded (hold)
      let out = '';
      for (const v of enemiesInSight(cb, u)) {
        if (canYield(v)) { out += surrender(cb, v, u, 'Love Conquers'); continue; }
        out += applyCond(cb, rng, u, v, 'commanded', 1, 'heart', { arg: 'hold' }).replace(/ is Commanded/, ' lowers its weapon: Commanded to hold');
      }
      return out || ' · nobody here to win over';
    }
    // The Counting Weaver
    case 'foreknowing': { const n = Math.max(1, Number(fxOf(e, 'state', (q) => q.state === 'foreknown')?.uses ?? 2)); fs(one!).foreknown = n; return ' · the next ' + (n > 1 ? n + ' attacks' : 'attack') + ' on ' + one!.name + ' will miss'; } // item 1266
    case 'unravel': { const v = one!; const ids = Object.keys(v.conds || {}).filter((k) => condIsBoon(k) && condOn(v, k)); for (const k of ids) endCond(v, k, cb); const had = !!v.shield; v.shield = 0; setBraced(v, false); dropHeldShot(cb, v, 'Unravel'); if (v.hidden) endCond(v, 'hidden', cb); return ' · ' + v.name + ' is unravelled' + (ids.length || had ? ' (' + [...ids, ...(had ? ['shield'] : [])].join(', ') + ')' : ''); }
    case 'cut_short': { const v = one!; if (v.tier === 'boss') { apDebt(v, 2); return ' · ' + v.name + ' loses 2 AP on its next turn (a boss)'; } const out = applyCond(cb, rng, u, v, 'stunned', 1, 'heart'); if (condOn(v, 'stunned') || (v as any).stunnedNext) fs(v).cutShortRound = cb.round; return out; } // item 1268: not the same enemy two rounds running
    case 'rewoven': { // rules 1.6.2 (item 734): HP back to the round's start where that was higher (the Downed stand), then a full turn each
      const x: any = cb, snap: Record<string, number> = x.faithRoundHp || {}; let out = '';
      for (const v of allies) { const was = snap[v.id]; if (was == null || was <= v.hp) continue;
        const up = v.downed; if (up) setDowned(v, false); v.hp = Math.min(v.maxHp, was);
        emitFx(cb, 'heal', { target: v.id, at: v.pos, amount: v.hp }); out += ' · ' + v.name + ' is rewoven to ' + v.hp + ' HP' + (up ? ' (stands)' : ''); }
      if (!x.faithOrderRestore) x.faithOrderRestore = [...cb.order];
      // From the round's own initiative, once each (item 737: a second Rewoven in the round used to copy the first one's
      // extra turns too).
      const ids = [...new Set(x.faithOrderRestore as string[])].filter((id) => allies.some((v) => v.id === id && alive(v)));
      cb.order.splice(cb.turn + 1, 0, ...ids); return out + ' · ' + ids.length + ' allies take another full turn, right after this one';
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
        say(cb, u.name + ' kept the vow "' + (VOW[v.id]?.words || v.id) + '".');
        shiftDevotion(g, cb, c, DEVOTION_XP.vowKept, 'vow kept');
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
  say(cb, u.name + ' swears a vow: "' + v.words + '"' + (allyId ? ' (' + cb.units.find((x) => x.id === allyId)!.name + ')' : '') + '.');
  return null;
}

/** An engine rite, kept from its button (once a session, +4 Devotion XP; a tithe gives up the item). */
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
  shiftDevotion(g, null, c, DEVOTION_XP.rite, 'rite: ' + r.name);
  B!.afterStory(g);
  return null;
}

// ---------- the Narrator's faith events (faith/pact, piece, devotion, rite_kept, apostasy; the turn's patrons field) ----------
const START_DEVOTION = (): number => PJ.devotion?.start ?? 3;
/** The Hymns an old patron leaves you as pieces (item 606): one per Hymn gate the Devotion had reached, at least 1, never
 * fewer than the pieces already held. */
function keptPieces(c: Character, p: any, dv: number): number {
  const reached = [GATE[1], GATE[2], GATE[3]].filter((x) => dv >= x).length;
  return Math.min(3, Math.max(1, reached, c.faithPieces?.[p.id] || 0));
}
/** Make a pact (rules 1.6.1). An Atheist converts (refused while the 90-day cooldown after leaving runs: item 710). A
 * Faithful changing patrons is not apostasy (item 711): no cooldown; the old patron's Hymns stay as pieces unless the
 * new patron is Jealous; the patron left rolls to let them go or holds a grudge (items 712-713) and says farewell. */
export function makePact(g: GameState, c: Character, patronId: string): string | null {
  const p = FAITH_PATRON[patronId]; if (!p) return 'No such patron.';
  const b = beliefOf(c);
  if (b.kind === 'faithful' && b.patron === p.id) return c.name + ' is already sworn to ' + p.name + '.';
  if (b.kind !== 'faithful') {
    const left = pactCooldownLeft(g, c);
    if (left > 0) return 'Nobody answers yet: ' + left + (left === 1 ? ' day' : ' days') + ' (' + c.name + ' left ' + (patronById(c.faithLeft!.patron)?.name || 'a patron') + ' on day ' + c.faithLeft!.day + '; a pact again from day ' + (c.faithLeft!.day + PACT_COOLDOWN_DAYS) + ').';
  }
  let pieces: Record<string, number> = { ...(c.faithPieces || {}) }, hymns = [...(c.hymns || [])];
  const old = b.kind === 'faithful' ? patronById(b.patron) : null;
  const wasXp = old ? devotionXpOf(c) : 0, wasLv = old ? devotionNow(c) : 0;
  if (old) { const n = keptPieces(c, old, devotionNow(c)); pieces[old.id] = n; hymns = [...new Set([...hymns, ...hymnsOf(old).slice(0, n).map((h: any) => old.id + '.' + h.id)])]; }
  const own = Math.max(0, Math.min(3, pieces[p.id] || 0)); delete pieces[p.id];
  hymns = hymns.filter((k) => !k.startsWith(p.id + '.'));
  if (p.rule === 'jealous') { pieces = {}; hymns = []; }
  if (old) leavePatron(g, c, old, p);
  const gain = DEVOTION_XP.piece * own, lv = Math.min(DEVOTION_MAX_LEVEL, START_DEVOTION() + gain);
  // Item 719: a switch never raises Devotion. The new pact starts at the lower of the XP you had and what a conversion
  // gives, so a pact can't wipe a loss (the Miracle's reset, a taboo, Judgement); an Atheist converts as before.
  const conv = devotionThreshold(lv), xp = old ? Math.min(wasXp, conv) : conv;
  c.belief = { kind: 'faithful', patron: p.id }; c.patron = p.id; setDevotionXp(c, xp); c.vow = null; c.faithLeft = null;
  if ((c.grudge as Grudge | undefined)?.patron === p.id) { delete c.grudge; B!.push(g, { kind: 'system', charId: c.id, text: p.name + ' takes ' + c.name + ' back: the grudge is over.' } as any); }
  c.faithPieces = pieces; c.hymns = hymns; c.faithRev = FAITH_REV;
  const kept = old && xp < conv;
  B!.push(g, { kind: 'system', charId: c.id, head: 'PACT · ' + String(p.name).toUpperCase(), text: c.name + ' makes a pact with ' + p.name + ' (' + devotionWords(c.devotionXp!) + (kept ? ': a new pact never raises Devotion' : gain ? ': ' + START_DEVOTION() + ' + ' + gain + ' for what they already knew' : '') + ').' + (p.rule === 'jealous' ? ' ' + p.name + ' is Jealous: every other patron\'s Hymn is gone.' : '') } as any);
  // The fx says what changed: from the old pact's XP and level on a switch, from nothing for an Atheist's conversion.
  const dXp = c.devotionXp! - wasXp;
  storyFx(g, FAITH_FX.devotion, { char: c.id, delta: dXp, xp: c.devotionXp, reason: 'a pact', now: c.devotion, was: wasLv, ...(c.devotion !== wasLv || !old ? { level: c.devotion } : {}), pact: p.id });
  speak(g, null, g.rng as Rng, c, p, 'conversion');
  return null;
}
/** Leaving one patron for another (item 712): an Open patron rolls d20 + Faith modifier against its leave TN (a natural
 * 20 always lets go, a natural 1 never); a Jealous one never lets go. Either way it says farewell; held, it is a grudge. */
function leavePatron(g: GameState, c: Character, old: any, to: any) {
  const lv = old.leave || {}, rng = g.rng as Rng;
  let letGo = true, roll: { die: number; mod: number; total: number; tn: number } | undefined;
  if (lv.lets_go === 'roll') { const rv = rollVs(null, rng, { mod: mod(faithOf(c)), tn: lv.tn ?? 11 }); roll = { die: rv.die, mod: rv.mod, total: rv.total, tn: rv.tn }; letGo = rv.ok; }
  else if (lv.lets_go === 'never') letGo = false;
  const head = 'LEAVING · ' + String(old.name).toUpperCase() + (roll ? ' · d20 ' + roll.die + ' ' + (roll.mod >= 0 ? '+' : '−') + Math.abs(roll.mod) + ' = ' + roll.total + ' vs ' + roll.tn : '') + (letGo ? ' · LET GO' : ' · A GRUDGE');
  B!.push(g, { kind: roll ? 'check' : 'system', charId: c.id, ...(roll ? { ok: letGo } : {}), head, text: c.name + ' leaves ' + old.name + ' for ' + to.name + (letGo ? ': ' + old.name + ' lets them go.' : lv.lets_go === 'never' ? ': ' + old.name + ' is Jealous and never lets anyone go.' : ': ' + old.name + ' won\'t let go.') } as any);
  storyFx(g, FAITH_FX.leave, { char: c.id, patron: old.id, to: to.id, letGo, ...(roll ? { roll } : {}) });
  speak(g, null, rng, c, old, 'farewell');
  const gr = lv.grudge;
  if (letGo || !gr) return;
  c.grudge = { patron: old.id, until: sessionN(g) + Math.max(1, gr.sessions || 1), condition: gr.condition, rounds: Math.max(1, gr.rounds || 1), xp_mult: gr.xp_mult ?? 0.5, text: gr.text || '', carry: 0 } as Grudge;
  const n = Math.max(1, gr.sessions || 1);
  B!.push(g, { kind: 'system', charId: c.id, head: 'GRUDGE · ' + String(old.name).toUpperCase(), text: (gr.text || old.name + ' holds a grudge.') + ' For the rest of this session and ' + n + (n === 1 ? ' more' : ' more sessions') + ', ' + to.name + '\'s Devotion XP comes at ×' + (gr.xp_mult ?? 0.5) + '.' } as any);
  storyFx(g, FAITH_FX.grudge, { char: c.id, patron: old.id, sessions: n, condition: gr.condition });
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
/** The Narrator moves Devotion XP (item 705): −6 to +5 a call with a reason (a deed the tags miss, bringing someone into
 * the faith, breaking character where the patron can see). Gains are capped at +10 a session per character (a gain over
 * it is cut to what is left; none left: refused); losses aren't capped. clamp: the turn's fields clamp the range instead
 * of refusing it (item 627). */
export function narratorDevotion(g: GameState, c: Character, delta: number, reason: string, opts: { clamp?: boolean } = {}): string | null {
  const { min, max, sessionCap } = NARRATOR_XP; let d = Math.round(Number(delta));
  if (beliefOf(c).kind !== 'faithful') return c.name + ' is an Atheist: no Devotion.';
  if (!Number.isFinite(d) || !d) return 'Move Devotion XP by ' + min + ' to +' + max + ' (not 0).';
  if (opts.clamp) d = Math.max(min, Math.min(max, d));
  else if (d < min || d > max) return 'The Narrator moves Devotion XP from ' + min + ' to +' + max + ' a call.';
  const why = String(reason || '').trim().slice(0, 80); if (!why) return 'Give a reason.';
  if (d > 0) {
    const t = tallyOf(g, c), left = sessionCap - t.narrXp;
    if (left <= 0) return c.name + ' has had the Narrator\'s ' + sessionCap + ' Devotion XP this session.';
    d = Math.min(d, left); t.narrXp += d;
  }
  shiftDevotion(g, g.phase === 'combat' && g.combat && !g.combat.over ? g.combat : null, c, d, why);
  return null;
}
/** A Narrator rite kept (once a session, +4 Devotion XP). */
export function narratorRite(g: GameState, c: Character, rite: string, patronId?: string): string | null {
  const p = patronOf(c); if (!p) return c.name + ' has no patron.';
  if (patronId && patronId !== p.id) return c.name + ' is sworn to ' + p.name + '.';
  const r = (p.rites || []).find((x: any) => x.id === rite); if (!r) return 'No such rite.';
  if (r.engine) return r.name + ' is kept from the player\'s rite button.';
  if (c.ritesKept?.[p.id + '.' + r.id] === sessionN(g)) return 'Already kept this session.';
  (c.ritesKept ||= {})[p.id + '.' + r.id] = sessionN(g);
  B!.push(g, { kind: 'system', charId: c.id, head: 'RITE · ' + String(r.name).toUpperCase(), text: c.name + ' keeps the rite of ' + p.name + ': ' + r.name + '.' } as any);
  shiftDevotion(g, null, c, DEVOTION_XP.rite, 'rite: ' + r.name);
  return null;
}
/** Leave a pact without joining anyone (apostasy, item 606): Devotion XP 0, an Atheist; the old patron's Hymns stay as
 * pieces (one per gate reached, at least 1); the patron says farewell; no pact for 90 days (item 710). */
export function apostasy(g: GameState, c: Character): string | null {
  const b = beliefOf(c); if (b.kind !== 'faithful') return c.name + ' has no pact to leave.';
  const p = patronById(b.patron), dv = devotionNow(c), xp = devotionXpOf(c);
  const n = keptPieces(c, p, dv), day = dayOf(g);
  c.belief = { kind: 'atheist' }; c.patron = null; setDevotionXp(c, 0); c.vow = null; c.faithRev = FAITH_REV;
  c.faithLeft = { patron: p.id, day };
  // Item 720: a grudge lobbies against the new patron; with no patron at all there is nothing to lobby against.
  const gr = c.grudge as Grudge | undefined; if (gr) delete c.grudge;
  c.faithPieces = { ...(c.faithPieces || {}), [p.id]: n };
  c.hymns = [...new Set([...(c.hymns || []), ...hymnsOf(p).slice(0, n).map((h: any) => p.id + '.' + h.id)])];
  B!.push(g, { kind: 'system', charId: c.id, head: 'APOSTASY', text: c.name + ' leaves the pact with ' + p.name + ': Devotion 0, an Atheist now; ' + n + ' of its Hymns stay with them, prayed by dice. No patron answers a new pact for ' + PACT_COOLDOWN_DAYS + ' days (until day ' + (day + PACT_COOLDOWN_DAYS) + ').' } as any);
  storyFx(g, FAITH_FX.devotion, { char: c.id, delta: -xp, xp: 0, reason: 'apostasy', now: 0, was: dv, ...(dv ? { level: 0 } : {}) });
  speak(g, null, g.rng as Rng, c, p, 'farewell');
  if (gr) B!.push(g, { kind: 'system', charId: c.id, text: (patronById(gr.patron)?.name || 'The old patron') + '\'s grudge ends: ' + c.name + ' has no patron left to lobby against.' } as any);
  return null;
}

/** Old saves (rules 1.6.1, item 715): Devotion as a level becomes Devotion XP at that level's threshold; stamped
 * faithRev 17. Characters with no faith at all are left alone. */
export function migrateCharacterFaith(c: Character): string[] {
  if (c.faithRev === FAITH_REV) return [];
  if (!c.belief && !c.patron && c.devotion == null && c.devotionXp == null) return [];
  if (beliefOf(c).kind === 'faithful') c.devotionXp = devotionXpOf(c);
  c.faithRev = FAITH_REV;
  return [];
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
  if (rounds) { const no = poolWhyNot(B!.apLeft(g, c), pv.ap); if (no) return no; }
  const pe = prayerEntry(c, kind, id)!, patron = pe.patron;
  let t: Character = c;
  if (a.targetId && pv.target !== 'enemy' && pv.target !== 'tile' && pv.target !== 'none' && pv.target !== 'self') {
    const x = g.characters[a.targetId]; if (!x || !pv.targets.includes(x.id)) return 'Pick someone in the squad.'; t = x;
  }
  if (rounds) B!.spendAp(g, c, pv.ap);
  const lim = prayed({ c, g });
  if (kind === 'whisper') lim.take('per_round', 1, WHISPER_KEY); else if (kind === 'hymn') { lim.uncool(HYMN_KEY); lim.cool(0, HYMN_KEY); if (ownCooldown(pe.entry)) { lim.uncool(ownKey(pe.entry.id)); lim.cool(0, ownKey(pe.entry.id)); } } else c.miracleSession = sessionN(g);
  g.story.mana = Math.max(0, (g.story.mana ?? MANA_START) + PRAYER_MANA);
  const text = String(a.text || '').trim().slice(0, 300), rng = g.rng as Rng;
  const name = (pe.entry.name || id) + (patron && kind !== 'whisper' ? ' (' + patron.name + ')' : '');
  const head = 'FAITH · ' + kind.toUpperCase() + ' · ' + name.toUpperCase();
  const said = c.name + (kind === 'whisper' ? ' whispers a prayer' : kind === 'miracle' ? ' calls for a Miracle' : ' sings a Hymn') + (text ? ': "' + text + '"' : '.');
  if (pv.roll) {
    const rv = rollVs(null, rng, { mod: pv.roll.mod, tn: pv.roll.tn }), r = rv.die, tot = rv.total, ok = rv.ok;
    const dice = ' · ' + rv.text + (pv.mode === 'overreach' ? ' (overreach)' : '');
    if (!ok) {
      B!.push(g, { kind: 'check', charId: c.id, ok: false, head: head + dice + ' · ✕ SILENCE', text: said } as any);
      storyFx(g, FAITH_FX.prayer_fail, { unit: c.id, kind, id, patron: patron?.id || null, at: null, why: pv.mode === 'overreach' ? 'overreach' : 'dice' });
      if (pv.mode === 'overreach') { shiftDevotion(g, null, c, OVERREACH.miss, 'a failed overreach'); speak(g, null, rng, c, patron, 'refused'); }
      g.story.needs = true; B!.afterStory(g); return null;
    }
    B!.push(g, { kind: 'check', charId: c.id, ok: true, head: head + dice + ' · ✓ ANSWERED', text: said } as any);
  } else B!.push(g, { kind: 'check', charId: c.id, ok: true, head: head + ' · BY STANDING · ✓ ANSWERED', text: said } as any);
  storyFx(g, FAITH_FX.prayer, { unit: c.id, kind, id, patron: patron?.id || null, at: null, target: t.id, ok: true });
  const mfx = kind === 'miracle' ? storyFx(g, FAITH_FX.miracle, { patron: patron.id, id: pe.entry.id, at: null, area: null, unit: c.id, char: c.id, name: pe.entry.name || id, text: pe.entry.text || '', line: null as string | null, summary: '' }) : null;
  const power = blessingPower(c), eff = storyEffect(g, c, t, kind, pe.entry.id, power), done = typeof eff === 'object' && eff ? eff.done : eff;
  if (done) B!.push(g, { kind: 'system', charId: c.id, text: done.replace(/^ · /, '') + '.' } as any);
  // Item 746: what the engine applied, and what is left to the Narrator; item 745: the god names the devoted.
  if (mfx) {
    const grant = grantLine(rng, patron, c.name); mfx.line = grant;
    mfx.summary = [summaryOf(done || ''), done === null || (typeof eff === 'object' && eff?.partial) ? 'The Narrator rules the rest.' : ''].filter(Boolean).join(' ');
    if (grant) speak(g, null, rng, c, patron, 'grant', grant);
  }
  if (kind === 'miracle') miracleCost(g, null, c); // after its effect, as in a fight (items 621, 725)
  // 'story_blessing' {g, c, lines}: items roll what a story Blessing on the character does besides (Upper-Touched's d6).
  const sb: any = kind !== 'whisper' ? emitStory(g, 'story_blessing', { g, c, lines: [] as string[] }, [c]) : { lines: [] };
  // What the engine can't apply out of a fight goes to the Narrator with the text (item 624; a Miracle's rest, item 735).
  const rest = done === null || (typeof eff === 'object' && eff?.partial) || sb.lines.length;
  if (rest) pendRuling(g, c, 'faith:' + (patron?.id || 'whisper') + '.' + pe.entry.id, c.name + ' prayed and was answered: ' + name + ' — ' + (pe.entry.text || '') + ' (× ' + (Math.round(power * 100) / 100) + ')' + (text ? '. They asked: "' + text + '"' : '') + (sb.lines.length ? '. ' + sb.lines.join(' ') : '') + (done ? ' The engine applied: ' + done.replace(/^ · /, '') + '.' : ''));
  if (patron && kind !== 'whisper') speak(g, null, rng, c, patron, kind === 'miracle' ? 'miracle' : 'answered');
  g.story.needs = true; B!.afterStory(g);
  return null;
}
/** A prayer's effect on the squad out of a fight: the text of what was applied, or null when it is all the Narrator's;
 * { done, partial } when the engine applied part of it and the rest is the Narrator's (a Miracle, item 735). */
function storyEffect(g: GameState, c: Character, t: Character, kind: PrayerKind, id: string, power: number): string | null | { done: string; partial: true } {
  const heal = (x: Character, n: number) => { const was = x.hp, max = maxHpOf(x); x.hp = Math.min(max, Math.max(0, x.hp) + Math.round(n)); return ' · ' + x.name + ' heals ' + (x.hp - was); };
  const endConds = (x: Character, ids: string[] | null) => { const had = (x.persistentConds || []).filter((p) => (ids ? ids.includes(p.id) : !condIsBoon(p.id))); x.persistentConds = (x.persistentConds || []).filter((p) => !had.includes(p)); return had.map((p) => p.id); };
  const st = (x: Character): any => storyFaith(g, x);
  if (kind === 'whisper') switch (id) {
    case 'luck': st(t).luck = 2; return ' · ' + t.name + ': +2 on the next check';
    case 'health': return heal(t, prayerAmount('heal', effVal(WHISPER.health, 'heal'), power, term(mendFactor(c.level), 'level')));
    case 'courage': { const e = endConds(t, ['fear', 'shaken']); return ' · ' + t.name + (e.length ? ' steadies (' + e.join(', ') + ' ended)' : ' was already steady'); }
    case 'guidance': st(c).guidance = true; return null; // +2 on the next notice check; what it reveals is the Narrator's
    default: return null; // Protection and Safe Passage only mean something in a fight
  }
  switch (id) {
    case 'absolution': { const e = endConds(t, null); return ' · ' + t.name + ' is absolved' + (e.length ? ' (' + e.join(', ') + ')' : '') + ' and' + heal(t, prayerAmount('heal', effVal(hymnEntry('absolution'), 'heal'), power, term(mendFactor(c.level), 'level'))).replace(' · ' + t.name, ''); }
    case 'warm_hands': return heal(t, prayerAmount('heal', effVal(hymnEntry('warm_hands'), 'heal'), power, term(mendFactor(c.level), 'level')));
    case 'coin_for_the_ferry': return t.hp > 0 ? ' · ' + t.name + ' is not down' : heal(t, prayerAmount('heal', effVal(hymnEntry('coin_for_the_ferry'), 'heal'), power, term(mendFactor(c.level), 'level')));
    case 'feed_the_fire': { const e = endConds(t, ['weakened', 'slowed']); if (g.story.await === 'players') (g.story.ap ||= {})[t.id] = B!.apLeft(g, t) + Number(fxOf(hymnEntry('feed_the_fire'), 'stat_mod', (q) => q.stat === 'ap')?.value ?? 2); return ' · ' + t.name + ' +' + Number(fxOf(hymnEntry('feed_the_fire'), 'stat_mod', (q) => q.stat === 'ap')?.value ?? 2) + ' AP' + (e.length ? ', ' + e.join(' and ') + ' ended' : ''); }
    case 'lucky_break': st(t).luckyBreak = true; return ' · ' + t.name + ': +5 on the next check';
    // Rules 1.6.2 (item 735): the squad's HP and story conditions are the engine's; a fight's shield is nothing out of one.
    case 'everyone_home': { let out = ''; for (const x of Object.values(g.characters)) if (!x.dead) { const e = endConds(x, null); out += heal(x, maxHpOf(x)) + (e.length ? ' (' + e.join(', ') + ' ended)' : ''); } return out; }
    // The restock, the cores and the repair are the engine's; throwables (a fight's count) and the AP go to the Narrator.
    case 'requisition_approved': { let out = ''; for (const x of Object.values(g.characters)) if (!x.dead) out += ' · ' + x.name + storyRestock(x); return { done: out, partial: true }; }
  }
  return null;
}
const maxHpOf = (c: Character): number => maxHp(c);
/** Requisition Approved out of a fight (item 735): the loaded magazine and every spare full, Supplies to their maximum,
 * 2 standard cores, every weapon carried at full durability. */
function storyRestock(c: Character): string {
  const size = magazineSize(c.weapon, c.weaponState?.mods);
  if (size != null) c.loaded = Math.max(c.loaded ?? 0, size);
  let pack = packOf(c).map((it) => (it.mags && it.weapon ? { ...it, mags: it.mags.map(() => magazineSize(it.weapon!) ?? 0) } : it.weapon && it.dur != null ? { ...it, dur: maxDurOf(it.weapon, it.rarity) } : { ...it }));
  const core = pack.find((it) => (it.item || it.id) === 'standard_core');
  if (core) core.qty += 2; else pack = [...pack, { id: 'standard_core', item: 'standard_core', name: ITEM.standard_core?.name || 'Standard mana core', qty: 2, kind: 'ammo' } as any];
  c.pack = pack;
  const sup = resourcesFor(c)?.resMax?.supplies; if (sup != null) (c.res ||= {}).supplies = sup;
  if (c.weaponState?.dur != null) c.weaponState = { ...c.weaponState, dur: maxDurOf(c.weapon, c.weaponState.rarity) };
  if (c.offHand?.dur != null) c.offHand = { ...c.offHand, dur: maxDurOf(c.offHand.id, c.offHand.rarity) };
  return ': magazines full' + (sup != null ? ', ' + sup + ' Supplies' : '') + ', +2 cores, repaired';
}

// The story's one-shot bonuses end with the check they helped (Luck, Lucky Break; Guidance on a notice check).
onStoryHook('check_result', (ctx) => {
  const st: any = ctx.c?.state?.faith; if (!st) return;
  delete st.luck; delete st.luckyBreak;
  if (st.guidance && (ctx.ck?.skills || []).some((k: string) => SKILL[k]?.attribute === 'perception')) delete st.guidance;
});
// A new session: a grudge that has run its course is over (item 713).
onStoryHook('session_start', (ctx, g) => {
  for (const c of Object.values((g as GameState)?.characters || {})) {
    const gr = c.grudge as Grudge | undefined; if (!gr || sessionN(g) <= gr.until) continue;
    delete c.grudge; B?.push(g, { kind: 'system', charId: c.id, text: (patronById(gr.patron)?.name || 'The old patron') + ' lets the grudge against ' + c.name + ' go.' } as any);
  }
});
registerFaithHooks();
