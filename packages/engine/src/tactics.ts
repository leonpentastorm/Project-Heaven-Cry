// Shared combat subsystems (rules 1.3, lane 0B): the pieces several perks, traits and class moves stand on.
// Reactions counted per round; combat Hidden, ambush and spotting; surrender and subdue; persuade, threaten and parley
// mid-fight; throwing and blasts; special ammo and damage types; the target-specific damage bucket; prayer and
// Blessings; companions; class resources; Burning put out, grapples broken, weapons recovered.
// Every number here is provisional (spec 14, items 82 onward). Deterministic: dice come from the rng passed in.
import './datatext'; // fills the texts' {=placeholders} before any data is read
import { WEAPON, RULES, ENEMY, type WeaponDef } from './data';
import { factorOf } from './effects/output';
import patronsJ from '../../../data/patrons.json';
import enemiesJ from '../../../data/enemies.json';
import { type Character, mod, prayerCooldown } from './character';
import { say, type Combat, type Unit, type Term, alwaysSeen, dist, key, xy, refOf, lineOfSight, unitSees, sideSeesUnit, emitFx, fxFell, hurtUnit, sightFx, damageObject, objectsOf, alive, sightBlockers, standable, unitFromEnemy, levelCompanion } from './combat';
import { type Rng } from './rng';
import { rollD20, judge, rollFx, contest, CONTEST_BASE } from './rolls';
import { applyCond, condOn, condSource, endCond, harm, heal, shiftMana, manaOf, isCondition, unitSave, unitStrength, saveAgainst, condName } from './magic';
import { condMods } from './condtable';
import { emit, statQuery, charOfUnit, boundGame, heldOfUnit, hookUsed } from './effects/hooks';
import { grantShield, tendHook } from './effects/damage';
import { actionAp, immune } from './effects/core';
import { note } from './effects/narrator';
import { sessionN, uses } from './effects/uses';
import { makeObject } from './objects';
import { residueFlag } from './feelings';
import { tilesAround, unitsIn } from './kit';
import { rawHidden, setDowned, startHidden } from './unitstate';
import { setCondRounds } from './magic';
import { price, costOf, whyNot, pay, setAp, spend } from './effects/cost';
import { ownedRecord } from './owned';

// ---------- damage types, special ammo, the damage bucket ----------
export interface AmmoType { id: string; damage_mult?: number; ignores_armor?: boolean; armor_mult?: number; applies?: string; damage_type?: string; meter_per_hit?: number }
export const AMMO_TYPES: Record<string, AmmoType> = Object.fromEntries(((RULES.weapons_rules?.ammo_types || []) as AmmoType[]).map((a) => [a.id, a]));
/** Ammo-type ids as players say them (armour_piercing ≡ armor_piercing). */
export const ammoId = (t: string | null | undefined) => (!t ? null : t === 'armour_piercing' || t === 'ap' ? 'armor_piercing' : t === 'hp' ? 'hollow_point' : t);
/** A weapon's damage type (weapons.json damage_type; physical by default) after its ammo (Enhanced rounds: elemental). */
export function damageTypeOf(w: WeaponDef | undefined, ammo?: string | null): string {
  const a = AMMO_TYPES[ammoId(ammo) || ''];
  return a?.damage_type || (w as any)?.damage_type || 'physical';
}
/** Is the weapon explosive (grenades, launchers, satchels: weapons.json explosive, or an area radius)? */
export const isExplosive = (w: WeaponDef | undefined) => !!w && (!!(w as any).explosive || (w.properties || []).some((p) => /^area_radius_\d+$/.test(p)));
/** A weapon's blast radius (area_radius_N), or 0. */
export const radiusOf = (w: WeaponDef | undefined) => { const p = (w?.properties || []).find((x) => /^area_radius_\d+$/.test(x)); return p ? +p.split('_').pop()! : 0; };
/** Silent weapons don't reveal a Hidden attacker (spec: bows; the suppressor). */
/** Take away whatever shot a unit is holding: the old Overwatch (u.overwatch) and a held Watch technique (u.watch,
 * rules 1.12). Everything that knocks a held shot out goes through here (a grapple, a stun, surrender, Dread, Unravel,
 * Rewrite, a knockback, Extraction). */
export function dropHeldShot(cb: Combat | null | undefined, u: Unit, why = 'lost'): boolean {
  const had = !!u.overwatch || !!u.watch, w = u.watch;
  u.overwatch = null; u.owShots = 0; delete u.owSpend;
  if (w) { delete u.watch; if (cb) emitFx(cb, 'watch_end', { unit: u.id, at: u.pos, id: w.id, why }); }
  return had;
}
export const isSilent = (u: Unit) => { const w = WEAPON[u.weapon]; return (w?.properties || []).includes('silent') || !!(w as any)?.phys?.props?.includes('silent') || (u.mods || []).includes('mod_suppressor'); }; // rules 1.12: the Silent property counts
// The stacking rule (target bonuses add and are capped at +100%; own multipliers multiply) lives with the one formula:
// effects/output.ts. Re-exported here for the callers that always took it from tactics.
export { VS_CAP, stackDamage } from './effects/output';

// ---------- reactions (rules 1.28, Classes 3.0 P1: ONE door, react()) ----------
// Every answer a unit makes outside its own turn goes through react(cb, u, {kind, event, spend, payer, window}, fn):
//   - it asks canReact (alive, a reaction left in the round's `uses` cell, the kind not forbidden: Suppressed and
//     Pressure's Suppressed state forbid `attack` and `move`, never `protect`; no reaction while another resolves),
//   - opens the reaction window when the site has one (`window`: the 'reaction_window' hook; an item may cancel),
//   - takes `spend` from the cell (scope `reaction`) of `payer ?? u` (a Cue's extra one, a Many Hands donor's),
//   - fires the trigger `reaction` (actor, kind), and runs fn with cb.reacting set (A REACTION NEVER TRIGGERS A
//     REACTION: Leon, 13 Nov 2026), one reaction per unit per `event` (rule 3).
// The count is a counters cell (effects/uses.ts: fresh each round; on the area map it lives in the story, so a rebuilt
// unit gets no fresh reaction). Old saves' u.reactUsed / u.reactedRound are read once into it.
/** What a reaction is (rules 1.28): it attacks, it moves the reactor, or it protects. */
export type ReactKind = 'attack' | 'move' | 'protect';
/** The reaction kinds, in order. */
export const REACT_KINDS: ReactKind[] = ['attack', 'move', 'protect'];
/** How a reaction is made: its kind, the event it answers (one reaction per unit per event), the reactions it spends,
 * who pays (default the reactor), and the window the site opens ('reaction_window' {reactor, mover, kind, id, at, rng}). */
export interface ReactOpts { kind: ReactKind; event?: string | null; spend?: number; payer?: Unit | null; window?: { kind: string; mover?: Unit | null; id?: string; at?: string; rng?: any } }
const REACT_KEY = 'reaction';
const reactCell = (cb: Combat, u: Unit) => uses({ key: REACT_KEY, u, c: null, cb, g: boundGame() });
/** Old saves: a round's count kept on the unit (reactUsed, reactedRound) is read once into the cell, and dropped. */
function oldReactions(cb: Combat, u: Unit): void {
  if (u.reactUsed == null && u.reactedRound == null) return;
  const n = u.reactUsed && u.reactUsed.r === cb.round ? u.reactUsed.n : u.reactedRound === cb.round ? 1 : 0;
  delete u.reactUsed; delete u.reactedRound;
  if (n > 0 && !reactCell(cb, u).used('reaction')) reactCell(cb, u).take('reaction', Infinity, undefined, n);
}
/** Reactions a unit gets each round: 1, + items (stat 'reactions'); none while Stunned, Dread underfoot or out of the
 * fight. (Suppressed no longer zeroes it: it forbids kinds, rules 1.28; see reactBlocked.) */
export function maxReactions(u: Unit, cb?: Combat | null): number {
  if (!alive(u) || condOn(u, 'stunned') || u.skipTurn) return 0;
  if (cb && residueFlag(cb, u, 'no_reaction')) return 0; // rules 1.8: Dread underfoot
  return Math.max(0, PER_ROUND + statQuery({ u }, 'reactions').add);
}
/** Reactions a round for everyone, and how many a unit holding a shot keeps for it (rules 1.30: rules.json combat.reactions). */
const PER_ROUND: number = RULES.combat?.reactions?.per_round ?? 1, KEEP_FOR_HELD: number = RULES.combat?.reactions?.keep_for_held ?? 0;
/** Reactions that do not fire by themselves: the held fire (it spends what the hold kept: Overwatch and Killzone, a held
 * Watch, Heart Overwatch) and a Call the player chose to make as a reaction. */
const NOT_AUTOMATIC = new Set(['overwatch', 'watch', 'heart_overwatch', 'call']);
/** Keep one for a held shot (rules 1.30, reactions-spec.md rule 10; on unless u.keepForHeld is false): a unit with more
 * reactions than rules.json keep_for_held that holds a shot never spends the last of them on a reaction that fires by
 * itself (anything but the held fire). */
function keptForHeld(cb: Combat, u: Unit, o: ReactOpts, spend: number): boolean {
  if (!KEEP_FOR_HELD || spend <= 0 || (o.payer && o.payer !== u) || (o.window && NOT_AUTOMATIC.has(o.window.kind)) || u.keepForHeld === false) return false;
  if (!u.overwatch && !u.watch && !u.mg?.held?.watch) return false;
  return maxReactions(u, cb) > KEEP_FOR_HELD && baseLeft(cb, u) - spend < KEEP_FOR_HELD;
}
/** Reactions this unit has spent this round (its cell). */
export function reactionsUsed(cb: Combat, u: Unit): number { oldReactions(cb, u); return reactCell(cb, u).used('reaction'); }
/** Systems that forbid a kind of reaction besides the conditions (physical/pressure.ts: Pressure's Suppressed state). */
const REACT_BLOCKS: ((u: Unit, kind: ReactKind) => string | null)[] = [];
/** Register a system's own reaction rule (it names why a kind is forbidden, or null). */
export function addReactBlock(f: (u: Unit, kind: ReactKind) => string | null): void { REACT_BLOCKS.push(f); }
/** Why this unit can't make a reaction of this kind (or null): a condition row's `forbid` reaction with its `kinds`
 * (Suppressed: attack and move, never protect), or a system's rule (Pressure). */
export function reactBlocked(u: Unit, kind: ReactKind): string | null {
  for (const k of Object.keys(u.conds || {})) { const no = condMods(k).noReact; if (no && (no === 'all' || no.includes(kind)) && condOn(u, k)) return condName(k); }
  for (const f of REACT_BLOCKS) { const why = f(u, kind); if (why) return why; }
  return null;
}
/** Cue (a Call, rules 1.13): one more reaction, good until the start of the speaker's next turn (calls/rules.ts ends
 * it there; the round bound is for a speaker who never gets that turn). Never for a unit with no reaction at all. */
export const cueLive = (cb: Combat, u: Unit): boolean => !!u.call?.cue && cb.round <= u.call.cue.r + 1;
const baseLeft = (cb: Combat, u: Unit) => maxReactions(u, cb) - reactionsUsed(cb, u);
const ownReact = (cb: Combat, u: Unit, n = 1) => baseLeft(cb, u) >= n || (n === 1 && cueLive(cb, u) && maxReactions(u, cb) > 0);
/** Many Hands (Camaraderie Mastered, perk-runtime E-H1): an ally whose reactions are spent may spend a holder's who can
 * see them (alive, same side, not the same unit). The first such holder in unit order. */
export function reactionDonor(cb: Combat, u: Unit): Unit | null {
  if (!alive(u) || maxReactions(u, cb) <= 0) return null; // Stunned, Dread: no reaction to take anyone's
  return cb.units.find((v) => v !== u && v.side === u.side && alive(v) && !v.companion && heldOfUnit(v).perks.some((p) => p.id === 'many_hands') && ownReact(cb, v) && unitSees(cb, v, u.pos)) || null;
}
/** Can this unit react now (a reaction of this kind, spending n)? Never while a reaction resolves (rules 1.28). */
export function canReact(cb: Combat, u: Unit, kind?: ReactKind, n = 1): boolean {
  if (cb.reacting) return false; // a reaction never triggers a reaction (rules 1.28)
  if (kind && reactBlocked(u, kind)) return false;
  if (n <= 0) return maxReactions(u, cb) > 0; // already paid for (Killzone's second shot) or paid by another (payer): the reactor must still be able to react (not Stunned, Downed)
  return ownReact(cb, u, n) || (n === 1 && !!reactionDonor(cb, u));
}
/** The events each unit has already answered (rule 3): transient, within one action; never saved. */
const ANSWERED = new WeakMap<Combat, Set<string>>();
/** THE door of every reaction (see the head of this section). Returns false, and nothing is spent, when the unit can't
 * (or an item cancels the window); else spends, runs fn as a reaction, and returns true. */
export function react(cb: Combat, u: Unit, o: ReactOpts, fn?: () => void): boolean {
  const spend = o.spend ?? 1, seen = ANSWERED.get(cb), ek = o.event ? o.event + '|' + u.id : null;
  if (ek && seen?.has(ek)) return false;
  if (!canReact(cb, u, o.kind, o.payer && o.payer !== u ? 0 : spend)) return false;
  if (o.payer && o.payer !== u && (spend > 0 && !ownReact(cb, o.payer, spend))) return false;
  if (keptForHeld(cb, u, o, spend)) return false; // rules 1.30: the last reaction is the held shot's
  if (o.window) { const rw: any = emit(cb, 'reaction_window', { reactor: u, mover: o.window.mover ?? null, kind: o.window.kind, ...(o.window.id ? { id: o.window.id } : {}), spend, cancel: false, at: o.window.at ?? u.pos, cb, rng: o.window.rng }); if (rw.cancel) return false; }
  if (spend > 0) payReaction(cb, o.payer || u, spend);
  if (ek) { const s = seen || new Set<string>(); if (s.size > 512) s.clear(); s.add(ek); ANSWERED.set(cb, s); }
  const was = cb.reacting; cb.reacting = { unit: u.id, kind: o.kind };
  try { emit(cb, 'reaction', { u, kind: o.kind, event: o.event || null, payer: o.payer || u, cb }); fn?.(); } finally { if (was) cb.reacting = was; else delete cb.reacting; }
  return true;
}
/** Spend n reactions of a unit: its own first, then a Cue's, then (one) a Many Hands donor's. */
function payReaction(cb: Combat, u: Unit, n: number): void {
  for (let i = 0; i < n; i++) {
    if (baseLeft(cb, u) > 0) { reactCell(cb, u).take('reaction', Infinity); continue; }
    if (cueLive(cb, u) && maxReactions(u, cb) > 0) { delete u.call!.cue; say(cb, u.name + ' reacts again (Cue).'); continue; } // the cued reaction, after its own
    const d = reactionDonor(cb, u); if (!d) return;
    reactCell(cb, d).take('reaction', Infinity); say(cb, u.name + ' reacts on ' + d.name + '\'s reaction (Many Hands).');
  }
}
/** Lose reactions that are not spent on a reaction (Dread burns them all, Rewrite one, Order spends an ally's): n, or
 * 'all' (what is left this round). */
export function loseReactions(cb: Combat, u: Unit, n: number | 'all' = 1): void {
  for (let i = 0; n === 'all' || i < n; i++) { if (!ownReact(cb, u) && !reactionDonor(cb, u)) break; payReaction(cb, u, 1); }
}
/** Give a spent reaction back (a refused Call made as a reaction). */
export function refundReaction(cb: Combat, u: Unit) { reactCell(cb, u).refund('reaction'); }

/** A held shot already paid for this round: Killzone's second shot (classes.json: "The two shots use one reaction
 * between them"). The first shot spends the round's reaction; the second fires on it, and nothing else does. One cell
 * in the counters primitive (effects/uses.ts, scope 'reaction': fresh again next round, where the second shot spends
 * that round's reaction as any held shot does). It used to give the reaction back after the first shot, which left the
 * holder a whole reaction for anything else in between (a Parry, a Dance of Iron, a Call): two in one round. */
const PAID_SHOT = 'held_shot_paid';
const paidCell = (cb: Combat, u: Unit) => uses({ key: PAID_SHOT, u, c: null, cb, g: boundGame() });
export const heldShotPaid = (cb: Combat, u: Unit): boolean => maxReactions(u, cb) > 0 && paidCell(cb, u).used('reaction') > 0;
/** The next held shot this round is already paid for (Killzone's second). */
export function payHeldShot(cb: Combat, u: Unit): void { paidCell(cb, u).take('reaction'); }
/** The paid held shot fires: the mark is used up. */
export function spendPaidShot(cb: Combat, u: Unit): void { paidCell(cb, u).refund('reaction'); }

// ---------- sight words (Classes 3.0 P7; shadow-spec.md 2.1) ----------
/** The words data uses for a unit's sight (predicates self_sight, actor_sight, target_sight): `seen` (not Hidden and
 * in view, after the 'sees' hook: sideSeesUnit), `unseen`, `in_view` (some living, standing enemy's eyes reach its tile,
 * Hidden or not: seenByFoes over unitSees), `out_of_view`. */
export type SightWord = 'seen' | 'unseen' | 'in_view' | 'out_of_view';
/** The sight words, in order. */
export const SIGHT_WORDS: SightWord[] = ['seen', 'unseen', 'in_view', 'out_of_view'];
/** THE one sight test for data: the two words that hold for a unit, to the other side (or to one unit `by`). A unit whose
 * stat `always_seen` is over 0 is seen and in view wherever it is. */
export function sightOf(cb: Combat, u: Unit, by?: Unit | null): [SightWord, SightWord] {
  const always = statQuery({ u, cb }, 'always_seen').add > 0;
  let inView: boolean, seen: boolean;
  if (by) { inView = always || unitSees(cb, by, u.pos); seen = always || (inView && !u.hidden); }
  else { inView = always || seenByFoes(cb, u); seen = always || sideSeesUnit(cb, u.side === 'pc' ? 'foe' : 'pc', u); }
  return [seen ? 'seen' : 'unseen', inView ? 'in_view' : 'out_of_view'];
}

// ---------- combat Hidden (spec: Helpful states; rules 1.3) ----------
export const TIER_NOTICE: Record<string, number> = { minion: 0, soldier: 2, elite: 4, boss: 6 };
/** Does any unit of the other side see this tile (range, light, line of sight)? */
export const seenByFoes = (cb: Combat, u: Unit) => cb.units.some((v) => v.side !== u.side && alive(v) && !v.hidden && unitSees(cb, v, u.pos));
/** Become Hidden (not while Marked). Each entry gives one ambush. Returns a log suffix. */
export function hide(cb: Combat, u: Unit, why = ''): string {
  if (condOn(u, 'marked')) return ' · ' + u.name + ' is Marked and can\'t hide';
  if (alwaysSeen(cb, u)) return ' · ' + u.name + ' can\'t hide: the enemy knows where they are'; // always seen (Traced, rules 1.33)
  if (immune({ u }, 'hidden')) return ' · ' + u.name + ' can\'t hide'; // immune to Hidden (a Figment: figments.json unit_effects, rules 1.34)
  if (u.hidden) return '';
  rawHidden(cb, u, true);
  emit(cb, 'hide', { u, why, cb });
  sightFx(cb, null, { [u.id]: 'hide' }); // presentation: it fades from the eyes of a side that saw it
  return ' · ' + u.name + ' is Hidden' + (why ? ' (' + why + ')' : '');
}
/** Stop being Hidden (spotted, an attack that isn't silent, damage taken, an enemy ending its turn next to you). */
export function reveal(cb: Combat, u: Unit, why: string): string {
  if (!u.hidden) return '';
  rawHidden(cb, u, false);
  say(cb, u.name + ' is revealed (' + why + ').');
  emit(cb, 'spotted', { u, why, cb });
  sightFx(cb, null, { [u.id]: 'reveal' }); // presentation: it shimmers into the sight of a side that can see its tile
  return ' · revealed';
}
/** The Hide action (2 AP, provisional): only out of every enemy's sight, never while Marked. */
/** Why this unit can't Hide now, whatever its AP (or null): the Hide action and its row in the action list both ask. */
export function hideBlock(cb: Combat, u: Unit): string | null {
  if (u.hidden) return 'Already Hidden.';
  if (condOn(u, 'marked')) return 'Marked: you can\'t hide.';
  if (seenByFoes(cb, u)) return 'An enemy can see you: get out of sight first.';
  return null;
}
export function hideAction(cb: Combat, u: Unit): string | null {
  { const no = hideBlock(cb, u); if (no) return no; }
  const ap = price({ cb, u }, 'hide').ap; { const no = whyNot(cb, u, ap); if (no) return no; }
  pay(cb, u, ap); say(cb, u.name + ' goes to ground' + hide(cb, u) + '.'); emitFx(cb, 'stance', { unit: u.id, at: u.pos, what: 'hide' });
  return null;
}
/** An ambush: the first attack from each Hidden entry (spec item 41; plan 6a-8): crit on 19-20, × the Ambush multiplier. */
export const ambushReady = (u: Unit) => !!u.hidden && (u.ambushUsed || 0) < (u.hideEntry || 1);
/** Spotting, at the end of a unit's turn (rules 1.3): it rolls d20 + its notice (enemies by tier, PCs Vigilant) against
 * 10 + each Hidden enemy's Ingenuity modifier + Stealth, for every one whose tile it can see; ending next to one finds
 * it outright. 'spot' {by, u, die, mod, tn, cancel} lets items change it. only: look for that one unit alone (rules 1.32:
 * the target of a silent attack from Hidden rolls at once). */
export function spotHidden(cb: Combat, rng: Rng, by: Unit, only?: Unit | null) {
  if (!alive(by)) return;
  for (const u of cb.units) {
    if (u.side === by.side || !u.hidden || u.dead || (only && u !== only)) continue;
    const m = by.side === 'foe' ? TIER_NOTICE[by.tier || 'minion'] ?? 0 : mod(by.vigilant || 0) + (by.sk?.vigilant || 0), tn0 = CONTEST_BASE + (u.ingMod ?? -2) + (u.stealth || 0) + (u.sk?.ingenuity || 0);
    // next to it: found outright, unless an item makes it a roll (op close_roll: Shadow's Close Quarters, rules 1.32);
    // the hook is asked only when someone listens, and the die is rolled only for a roll (an outright find rolls nothing)
    const close = dist(u.pos, by.pos) <= 1;
    if (!close && !unitSees(cb, by, u.pos)) continue;
    const pre: any = !close ? null : hookUsed('spot') ? emit(cb, 'spot', { by, u, die: 0, mod: m, tn: tn0, cancel: false, close: true, outright: true, cb, rng }) : { outright: true };
    if (pre?.outright) { reveal(cb, u, by.name + ' is right next to them'); continue; }
    const die = pre?.cancel ? 0 : pre?.die || rollD20(rng).die; // (an item may have set the close roll's die)
    const ctx: any = pre ? { ...pre, die } : emit(cb, 'spot', { by, u, die, mod: m, tn: tn0, cancel: false, cb, rng });
    if (ctx.cancel) continue;
    const sr = judge('roll', { die: ctx.die }, ctx.mod, ctx.tn), ok = sr.ok; rollFx(cb, sr, by, { why: 'spot' }); // the hook may have changed the die, the modifier or the TN
    say(cb, by.name + ' looks for ' + u.name + ': ' + sr.text + (ok ? ' · spotted' : ' · nothing'));
    if (ok) reveal(cb, u, 'spotted by ' + by.name);
  }
}

// ---------- surrender and subdue (rules 1.3) ----------
/** May this unit surrender at all? Not a Boss, not a machine, robot or turret, not tagged no_surrender, once per fight. */
export function canSurrender(t: Unit): boolean {
  return t.side === 'foe' && alive(t) && t.tier !== 'boss' && !['machine', 'robot', 'turret', 'drone'].includes(t.kind || '') && !(t.tags || []).includes('no_surrender') && !t.surrenderTried;
}
/** It gives up: out of the fight, not a target, counted as defeated; no kill credit and no mana rise. 'on_surrender'. */
export function surrender(cb: Combat, t: Unit, by: Unit | null, why: string): string {
  t.surrendered = true; dropHeldShot(cb, t, 'surrendered'); rawHidden(cb, t, false); setAp(t, 0); (t.tags ||= []).includes('prisoner') || t.tags!.push('prisoner');
  emitFx(cb, 'down', { unit: t.id, at: t.pos, dead: false, surrendered: true });
  emit(cb, 'on_surrender', { t, by, why, cb });
  return ' · ' + t.name + ' SURRENDERS (' + why + ')';
}
/** The surrender save (plan 6a-3: one per enemy a fight): a Heart save against 12 + the strength of the gamma that
 * spoke (rules 1.13: the offer of terms reads Charisma; a perk names its own), only for an enemy at half HP or less,
 * or with every ally down. A failed save surrenders. */
export function trySurrender(cb: Combat, rng: Rng, by: Unit, t: Unit, tnAdd = 0, via = 'charisma'): string {
  if (!canSurrender(t)) return ' · ' + t.name + (t.surrenderTried ? ' has already refused' : ' won\'t surrender');
  const alone = !cb.units.some((v) => v !== t && v.side === t.side && alive(v));
  if (t.hp > t.maxHp / 2 && !alone) return ' · ' + t.name + ' isn\'t beaten enough to listen';
  t.surrenderTried = true;
  const sv = saveAgainst(cb, rng, by, t, 'heart', 'surrender', { via, tnAdd }), held = sv.ok;
  const roll = ' (' + sv.text + ')';
  return held ? ' · ' + t.name + ' refuses' + roll : surrender(cb, t, by, 'talked down' + roll);
}
/** A non-lethal blow that takes the last HP subdues a foe instead of killing it (damage src.nonlethal). */
export function subdue(cb: Combat | null, t: Unit) { t.subdued = true; t.surrendered = true; t.dead = false; setDowned(t, false); t.hp = 0; if (cb) emit(cb, 'on_surrender', { t, by: null, why: 'subdued', cb }); }

// ---------- persuade, threaten, parley mid-fight (spec action table: 2 AP) ----------
export const HEARING = 8;
/** Talk in a fight: Persuade (Eloquence: a Left Brain Debuff against a Brain save), Threaten (Intimidation: Shaken
 * against a Heart save, rules 1.13), Parley (offer terms, Charisma: the surrender save, and the words go to the
 * Narrator). The strength is the gamma that spoke. 'parley' {u, t, kind, text, tnAdd, via, cancel, result} lets items
 * change it (Overruled, Crowd-Pleaser, Lay Down Arms…; a perk that speaks with another gamma sets `via`). */
export const PARLEY_VIA: Record<string, string> = { persuade: 'eloquence', threaten: 'intimidation', parley: 'charisma' };
/** Rules 1.13: Threaten is a Call (calls/handlers.ts). combat/parley kind 'threaten' stays as an alias of its effect:
 * the Call's handler file binds it here (this file can't import calls/: it loads first). */
export interface ThreatenAlias { refuse(cb: Combat, u: Unit, t: Unit): string | null; run(cb: Combat, rng: Rng, u: Unit, t: Unit, tnAdd: number, via?: string): string }
let THREATEN: ThreatenAlias | null = null;
export const setThreaten = (f: ThreatenAlias) => { THREATEN = f; };
export function parley(cb: Combat, rng: Rng, u: Unit, t: Unit, kind: 'persuade' | 'threaten' | 'parley', text = ''): string | null {
  if (!t || t.dead || t.surrendered || t.side === u.side) return 'Pick an enemy who can hear you.';
  if (dist(u.pos, t.pos) > HEARING) return 'Too far to be heard (' + HEARING + ' tiles).';
  const ap = price({ cb, u }, 'parley').ap; { const no = whyNot(cb, u, ap); if (no) return no; }
  if (kind === 'threaten' && THREATEN) { const no = THREATEN.refuse(cb, u, t); if (no) return no; } // one hindering Call on a unit a round
  const ctx: any = emit(cb, 'parley', { u, t, kind, text, tnAdd: 0, via: PARLEY_VIA[kind], cancel: null as string | null, result: '', cb, rng });
  if (ctx.cancel) return ctx.cancel;
  pay(cb, u, ap);
  const said = text ? ' "' + text.slice(0, 200) + '"' : '';
  let out = '';
  if (kind === 'persuade') out = applyCond(cb, rng, u, t, 'ldebuff', undefined, 'brain', { tnAdd: ctx.tnAdd, via: ctx.via });
  else if (kind === 'threaten') out = THREATEN ? THREATEN.run(cb, rng, u, t, ctx.tnAdd, ctx.via) : applyCond(cb, rng, u, t, 'shaken', undefined, 'heart', { tnAdd: ctx.tnAdd, via: ctx.via });
  else out = trySurrender(cb, rng, u, t, ctx.tnAdd, ctx.via);
  say(cb, u.name + (kind === 'persuade' ? ' works on ' : kind === 'threaten' ? ' threatens ' : ' offers terms to ') + t.name + said + out + (ctx.result || '') + '.');
  if (text) (cb.notes ||= []).push(u.name + ' (round ' + cb.round + ', ' + kind + ' at ' + t.name + '):' + said);
  return null;
}

// ---------- throwing and blasts (spec: Throw 2 AP; Thrown weapons) ----------
export const throwRangeOf = (u: Unit) => u.throwRange ?? 6;
/** Throw a grenade (or place a satchel) at a tile: in range and line of sight; 2 AP (items change it: 'throw'). */
export function throwItem(cb: Combat, rng: Rng, u: Unit, item: string, tile: string): string | null {
  const w = WEAPON[item]; if (!w || w.category !== 'thrown') return 'That isn\'t something to throw.';
  if (!((u.throwables?.[item] ?? 0) > 0)) return 'You carry no ' + w.name.toLowerCase() + '.';
  const placed = (w.properties || []).includes('placed'), range = placed ? 1 : throwRangeOf(u);
  const [x, y] = xy(tile); if (x < 0 || y < 0 || x >= cb.map.w || y >= cb.map.h) return 'Off the map.';
  if (dist(u.pos, tile) > range) return placed ? 'Place it on your tile or next to you.' : 'Out of throwing range (' + range + ' tiles).';
  if (tile !== u.pos && !lineOfSight(cb, u.pos, tile)) return 'No line of sight to throw there.';
  // 'throw' {u, item, tile, ap, radius, cancel, caughtBy, preview} (mutable): cancel stops the blast (and any fire it
  // leaves); caughtBy names who caught it, for the log (hooks gap C1).
  const ctx: any = emit(cb, 'throw', { u, item, tile, ap: price({ cb, u }, 'throw').ap, radius: radiusOf(w), cancel: false, caughtBy: null, preview: false, cb, rng });
  { const no = whyNot(cb, u, ctx.ap); if (no) return no; }
  pay(cb, u, ctx.ap); u.throwables![item]--;
  emitFx(cb, 'shot', { unit: u.id, target: null, from: u.pos, to: tile, weapon: item, cat: 'thrown', mode: 'shot', hit: true, crit: false, fumble: false, dmg: 0, killed: false, object: true });
  say(cb, u.name + (placed ? ' places a ' : ' throws a ') + w.name.toLowerCase() + ' at ' + refOf(tile) + (ctx.cancel ? (ctx.caughtBy ? ' · ' + ctx.caughtBy.name + ' catches it' : ' · it never goes off') : blast(cb, rng, u, tile, item, ctx.radius)) + '.');
  if (u.hidden && !isSilent(u)) reveal(cb, u, 'threw ' + w.name.toLowerCase());
  return null;
}
/** A thrown item goes off on a tile (credited to the thrower: kills, bleed, the barrels it sets off). */
export function blast(cb: Combat, rng: Rng, by: Unit | null, tile: string, item: string, radius = radiusOf(WEAPON[item])): string {
  const w = WEAPON[item], who = unitsIn(cb, { shape: 'burst', at: tile, r: radius }, { downed: true });
  emitFx(cb, 'explode', { at: tile, radius, what: item });
  // 'blast_landed' {by, tile, item, radius, who}: a thrown item goes off (rules 1.12: smoke, a flashbang or the scrambler
  // ends the held Watch and the Bead of everyone it lands on: physical/ranged/thrown.ts)
  emit(cb, 'blast_landed', { by, tile, item, radius, who, cb, rng });
  let out = '';
  switch (item) {
    case 'smoke_grenade': {
      cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'veil', tiles: tilesAround(tile, radius, cb), words: ['smoke'], by: by?.id || '', side: by?.side || 'pc', left: 2, mult: 1, who: by?.name || '' }];
      return ' · smoke fills ' + radius + ' tiles around ' + refOf(tile) + ' for 2 rounds';
    }
    case 'flashbang': for (const v of who) out += applyCond(cb, rng, by, v, 'blinded', 1, 'body', { via: 'dexterity' }); return out || ' · nobody caught in it';
    case 'bot_scrambler': {
      for (const v of who) {
        if (['robot', 'machine', 'turret', 'drone'].includes(v.kind || '') || v.companion === 'drone') out += applyCond(cb, rng, by, v, 'stunned', 1, 'body', { skipSave: true, via: 'dexterity' });
        if (WEAPON[v.weapon]?.category === 'mana') { v.jammed = true; out += ' · ' + v.name + '\'s mana arm jams'; }
      }
      cb.zones = [...(cb.zones || []), { id: 'z' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), kind: 'scramble' as any, tiles: tilesAround(tile, radius, cb), words: ['scramble'], by: by?.id || '', side: by?.side || 'pc', left: 2, mult: 1, who: by?.name || '' }];
      return (out || ' · nothing electronic caught in it') + ' · Sigils cost +1 AP there for 2 rounds';
    }
    default: {
      const dmg = typeof w?.damage === 'number' ? w.damage : 0;
      for (const v of who) { out += hurtUnit(v, dmg * (by?.charId && (w?.properties || []).includes('consumable') ? factorOf('thrown') : 1), false, cb, 'explosion', by); if (!v.dead && (w?.properties || []).includes('applies_burning')) out += applyCond(cb, rng, by, v, 'burning', undefined, 'body', { skipSave: true, via: 'dexterity' }); }
      for (const o of [...objectsOf(cb)]) if (o.hp != null && o.hp > 0 && dist(o.pos, tile) <= radius) out += damageObject(cb, o.pos, dmg, 0, by);
      if ((w?.properties || []).includes('applies_burning') && standable(cb.map, tile)) cb.objects = [...objectsOf(cb), makeObject('fire_' + tile.replace(',', '_') + '_' + cb.round, 'fire', tile)];
      return out || ' · it goes off and finds no one';
    }
  }
}

// ---------- prayer (spec: Patrons and prayer) ----------
// Rules 1.6 (faith.ts): a patron's Hymns are what the older code calls its Blessings (Blessed Shells, Stolen Fire).
export const PATRONS: any[] = ((patronsJ as any).items || []).map((p: any) => ({ ...p, blessings: p.hymns || p.blessings || [] }));
export const PATRON: Record<string, any> = Object.fromEntries(PATRONS.map((p) => [p.id, p]));
/** Devotion, the level (0-10, starts at 3 when the pact is made). Rules 1.6.1: it moves as Devotion XP, only through
 * faith.ts shiftDevotion (the old changeDevotion is gone). */
export const devotionOf = (c: Character) => Math.max(0, Math.min(10, c.devotion ?? 3));
/* Prayer itself is rules 1.6 (faith.ts: combatPray in a fight, faith/pray in the story); the patron's mood is retired. */
/** A Blessing lands: 'blessing_in' {u, t, blessing, power, handled} first (a lane may run it), then the effects the
 * engine knows (heal, Soul damage, shield, a condition, cleanse); the rest goes to the Narrator with its text. */
export function blessing(cb: Combat, rng: Rng, u: Unit, t: Unit, bl: any, power: number): string {
  const ctx: any = emit(cb, 'blessing_in', { u, t, blessing: bl, power, handled: false, out: '', cb, rng });
  if (ctx.handled) return ctx.out || '';
  power = Math.max(0, ctx.power ?? power); // items may change the power (Factory Made, The Old Blood: hooks gap A5/F5)
  let out = '', left = false;
  for (const e of bl.effects || []) {
    if (e.op === 'stat_mod' && e.stat === 'hp' && typeof e.value === 'number') out += e.value > 0 ? heal(t, e.value * power, cb, u, 'blessing') : harm(cb, rng, u, t, -e.value * power, 'soul');
    else if (e.op === 'heal' && typeof e.value === 'number') out += heal(t, e.value * power, cb, u, 'blessing'); // rules 1.6 data
    else if (e.op === 'shield' && typeof e.value === 'number') out += ' · ' + t.name + ' gains a ' + grantShield(cb, t, e.value * power, u) + ' shield';
    else if (e.op === 'stat_mod' && e.stat === 'shield' && typeof e.value === 'number') out += ' · ' + t.name + ' gains a ' + grantShield(cb, t, e.value * power, u) + ' shield';
    else if (e.op === 'condition' && isCondition(e.condition || e.id)) out += applyCond(cb, rng, u, t, e.condition || e.id, e.rounds, undefined, { skipSave: t.side === u.side, via: 'faith' });
    else if (e.op === 'cleanse') { const ids = Object.keys(t.conds || {}); for (const id of ids) endCond(t, id, cb); out += ' · ' + t.name + ' is cleansed'; if (ids.length) tendHook.f?.(cb, u, t); } // tending others (rules 1.5, 3.3)
    else left = true;
  }
  if (left || bl.adjudication !== 'engine') (cb.notes ||= []).push('BLESSING ' + bl.name + ' (' + u.name + ' → ' + t.name + ', r' + cb.round + ', ×' + Math.round(power * 100) / 100 + '): ' + bl.text + ' — yours to rule');
  return out;
}

// ---------- small actions: put out a fire, break a grapple, recover a weapon ----------
/** Put out Burning (1 AP): yourself or an adjacent ally (spec: Burning). */
export function extinguish(cb: Combat, u: Unit, t: Unit): string | null {
  if (!condOn(t, 'burning')) return t === u ? 'You aren\'t burning.' : t.name + ' isn\'t burning.';
  if (dist(u.pos, t.pos) > 1) return 'Stand next to them.';
  const ap = price({ cb, u }, 'extinguish').ap; { const no = whyNot(cb, u, ap); if (no) return no; }
  pay(cb, u, ap);
  // FIRE's inflection (rules 1.10, Sigil 1.5): a Mastered FIRE's Burning lasts +1 round past being put out.
  const linger = /^linger:(\d+)/.exec(String(t.condArg?.burning || ''));
  if (linger) { setCondRounds(t, 'burning', +linger[1], { fresh: cb.order?.[cb.turn] === t.id, arg: null }); say(cb, u.name + ' beats down the fire' + (t === u ? '' : ' on ' + t.name) + ', but it smoulders ' + linger[1] + ' more round' + (linger[1] === '1' ? '' : 's') + ' (a Mastered FIRE).'); return null; }
  endCond(t, 'burning', cb); say(cb, u.name + ' puts out the fire' + (t === u ? '' : ' on ' + t.name) + '.'); return null;
}
/** Break a grapple (2 AP): d20 + the better of your Raw Power and Athletics modifiers against d20 + the grappler's. */
export function escapeGrapple(cb: Combat, rng: Rng, u: Unit): string | null {
  if (!condOn(u, 'grappled')) return 'Nothing is holding you.';
  const ap = price({ cb, u }, 'escape').ap; { const no = whyNot(cb, u, ap); if (no) return no; }
  pay(cb, u, ap);
  const by = cb.units.find((x) => x.id === condSource(u, 'grappled'));
  const mine = Math.max(u.strength ?? 0, mod(u.athleticsPts || 0)), theirs = by ? Math.max(by.strength ?? 0, mod(by.athleticsPts || 0)) : 0;
  const ct = contest(cb, rng, { by: u, mod: mine }, { by: by || null, mod: theirs }, 'escape'), ok = ct.won || !by; // the higher total; the holder keeps a tie
  if (ok) endCond(u, 'grappled', cb);
  say(cb, u.name + ' strains against the hold: ' + ct.text + (ok ? ' · breaks free' : ' · still held') + '.');
  return null;
}
/** Recover a dropped or lowered weapon: 2 AP (1 for a lowered one). */
export function recoverWeapon(cb: Combat, u: Unit): string | null {
  const id = condOn(u, 'disarmed') ? 'disarmed' : condOn(u, 'lowered') ? 'lowered' : null; if (!id) return 'Your weapon is in your hand.';
  const ap = price({ cb, u }, 'recover', costOf('recover', id === 'disarmed' ? 'ap' : 'ap_lowered')).ap; { const no = whyNot(cb, u, ap); if (no) return no; }
  pay(cb, u, ap); endCond(u, id, cb); say(cb, u.name + (id === 'disarmed' ? ' recovers the weapon.' : ' raises the weapon.')); return null;
}

// ---------- companions (rules 1.3; stat blocks provisional) ----------
export const COMPANION_KINDS: Record<string, any> = Object.fromEntries((((enemiesJ as any).companions || []) as any[]).map((k) => [k.id, k]));
/** A character's companions as PC-side units placed next to it (destroyed at 0 HP, not Downed; HP written back). */
export function companionUnits(cb: Combat | null, c: Character, owner: Unit, taken: Set<string>, rng: Rng, map: { w: number; h: number; solid: string[] }, fixed?: Record<string, string>, only?: string): Unit[] {
  const out: Unit[] = [];
  for (const comp of c.companions || []) {
    const k = COMPANION_KINDS[comp.kind]; if (!k || (only && comp.kind !== only)) continue;
    if (comp.hp != null && comp.hp <= 0) continue; // destroyed: repaired or healed in the story first
    // Where it stood on the area map (fixed: the story's positions, by unit id), else next to the owner.
    const want = fixed?.['cp-' + c.id + '-' + comp.id];
    const [x0, y0] = xy(owner.pos); let at = want && !taken.has(want) && !map.solid.includes(want) ? want : '';
    for (let r = 1; r < 4 && !at; r++) for (let dx = -r; dx <= r && !at; dx++) for (let dy = -r; dy <= r && !at; dy++) { const kk = key(x0 + dx, y0 + dy); if (x0 + dx >= 0 && y0 + dy >= 0 && x0 + dx < map.w && y0 + dy < map.h && !map.solid.includes(kk) && !taken.has(kk)) at = kk; }
    if (!at) continue; taken.add(at);
    const u = unitFromEnemy('cp-' + c.id + '-' + comp.id, comp.name || k.name, 'minion', k.weapon || 'fists', at, rng);
    Object.assign(u, { side: 'pc', tier: undefined, hp: Math.min(k.hp, comp.hp ?? k.hp), maxHp: k.hp, def: k.defense, armour: k.armour, attack: k.attack_bonus, movement: k.movement, strength: k.attack_bonus,
      init: owner.init - 0.5, agility: 1, ctrl: c.id, companion: comp.kind, dbf: { '*': unitStrength(owner, 'empathy') }, // rules 1.13: a companion's conditions read its handler's Empathy
       kind: k.kind || comp.kind, tags: [...(k.tags || [])], short: (comp.name || k.name).slice(0, 2).toUpperCase(), img: comp.img || k.portrait || undefined }); // its own portrait first (the cut-in and the HUD show it)
    u.mags = undefined; // unlimited spares, as enemies carry
    // A fixed action list and a gun that never runs dry (the drone: move and shoot, no reload, no Heat or jams; spec §14
    // item 370), from the stat block.
    levelCompanion(u, k, c.level, comp.hp); // rules 1.15: a companion is its owner's level (its block is the level 1 block)
    if (Array.isArray(k.actions) && k.actions.length) u.allowedActions = [...k.actions];
    if (k.infinite_ammo) u.infiniteAmmo = true;
    u.owned = ownedRecord(k); // Classes 3.0 P9: its record (turn own: it acts right after its owner); the tie is made with the fight (owned.ts tieCompanions)
    // The twin (Twinbound's Call on the area map): half its owner's maximum HP, the owner's Defense, tied to the owner.
    if (comp.kind === 'twin') Object.assign(u, { hp: comp.hp ?? Math.floor(0.5 * owner.maxHp), maxHp: comp.maxHp ?? Math.floor(0.5 * owner.maxHp), def: owner.def, attack: owner.mg?.will ?? 0, init: owner.init - 0.4, short: 'TW', img: comp.img || owner.img, twinOf: owner.id });
    out.push(u);
  }
  void cb;
  return out;
}

// ---------- class resources ----------
/** A class resource's value, and changes within its maximum. Returns what actually changed. */
export const resOf = (u: Unit, id: string) => u.res?.[id] ?? 0;
export function resGain(u: Unit, id: string, n: number): number {
  if (!u.resMax || u.resMax[id] == null) return 0;
  const was = resOf(u, id); (u.res ||= {})[id] = Math.max(0, Math.min(u.resMax[id], was + n)); return u.res[id] - was;
}
export function resSpend(u: Unit, id: string, n: number): boolean { return spend(u, id, n); } // the one door (effects/cost.ts)

// ---------- what an enemy carries into a fight (Narrator start_fight, campaign data) ----------
export interface FoeTraits { kind?: string; tags?: string[]; unaware?: boolean; no_surrender?: boolean; hidden?: boolean }
export const KINDS = ['human', 'robot', 'crawler', 'ork', 'upper_realm', 'cursed', 'beast', 'machine', 'turret', 'celestial', 'drone'];
export const FOE_TAGS = ['military', 'hunter', 'humanoid', 'unaware', 'no_surrender', 'lawful', 'prisoner', 'civilian', 'underworld', 'official', 'heretic', 'faithful', 'skulk']; // skulk: rules 1.32, it Hides and ambushes (combat.ts skulks)
/** Apply a foe's kind and tags (unknown values dropped; default human and humanoid). Unaware foes sit out round 1. */
export function applyFoeTraits(u: Unit, f: FoeTraits | undefined) {
  const kind = f?.kind && KINDS.includes(f.kind) ? f.kind : u.kind || 'human';
  const tags = [...new Set([...(['human', 'crawler', 'ork', 'upper_realm', 'cursed', 'celestial'].includes(kind) ? ['humanoid'] : []), ...(f?.tags || []).filter((t) => typeof t === 'string' && FOE_TAGS.includes(t)), ...(f?.no_surrender ? ['no_surrender'] : []), ...(f?.unaware ? ['unaware'] : [])])];
  u.kind = kind; u.tags = tags;
  if (f?.unaware) u.waitRound = Math.max(u.waitRound || 0, 2);
  if (f?.hidden) startHidden(u);
}
/** The bots one death releases (spec: the meter; rules.json mana.meter.events): a robot or machine +2, a beast or monster
 * +3, a person +5. */
export const deathMana = (u: Unit): number => {
  const ev = (id: string, d: number) => Number((RULES as any)?.mana?.meter?.events?.find((e: any) => e.event === id)?.delta) || d;
  if (u.kind === 'figment') return 0; // rules 1.34: a Figment's bots were its maker's core charge, spent; its fall releases nothing more
  if (['robot', 'machine', 'turret', 'drone'].includes(u.kind || '') || /drone|robot|automaton|\bbot\b|turret/i.test(u.name)) return ev('robot_destroyed', 2);
  if (u.kind === 'beast' || u.kind === 'monster') return ev('beast_dies', 3);
  return ev('person_dies', 5);
};

void ENEMY; void manaOf; void sightBlockers; void fxFell; void note;
