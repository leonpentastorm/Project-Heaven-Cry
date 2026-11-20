// Physical 2.0 (rules 1.12): the technique core. A technique is a handler registered with technique(); the core checks
// who may use it, charges its AP, builds the Tech a handler is given, and runs it. Attacks go through strike(), which
// wraps previewAttack/resolveAttack and shapes them through the engine's hooks (so combat.ts is not forked).
// Momentum is the melee meter (on the user); Pressure is the ranged one (on the target): pressure.ts.
import { say, unsay, type Combat, type Unit, noteLoose, dropNailed, previewAttack, resolveAttack, asChain, attackApCost, cycleAp, isMelee, emitFx, alive, dist, checkOver, xy, key, moveBlockers, refOf, triggerOverwatch, paths, routeTo, sideSees, active, moveUnit, moveBlock, dropToPile, asVolley, canJam, neverJams, setOffJam, heatLimit, weaponBraced, displace, type DisplaceHow } from '../combat';
import { WEAPON } from '../data';
import { onHook, charOfUnit, emit, boundGame, bindGame, holdersOf, statQuery, statHeard, unitSkill } from '../effects/hooks';
import { scaleOf } from '../effects/output';
import { apDebt } from '../effects/ap';
import { price, priced, whyNot, pay, refund } from '../effects/cost';
import type { CostSite, StatId } from '../effects/stats';
import type { HookName } from '../effects/types';
import { applyCond, condOn, unitSave, unitStrength, withVia } from '../magic';
import { resOf, resGain, resSpend, canReact, react, reactBlocked as reactBlockedOf, type ReactKind } from '../tactics';
import { attackEvent, stepEvent, setStrikeTech, setStrikeTechAp, setStrikeRider, strikeRider, pairs, withOffHand, offWear, weaponVia } from '../combat';
import { type Rng } from '../rng';
import { rollSave } from '../rolls';
import { mod, holds as holdsGear, isShieldId, followsId } from '../character';
import type { Character } from '../character';
import { packOf } from '../character';
import { packRef } from '../gear';
import type { Tech, TechArgs, TechDef, TechHandler, TechPreview, StrikeOpts, StrikeResult, PadGroup, PadEntry, TechLine, WatchSpec, HeldWatch } from './types';
import { TECHNIQUE, TECHNIQUES, PHYS_RULES, hitsWith, weaponPhys, weaponProps, weaponSystem, weaponTeaches, readyTechniques, groupsOf, groupName, given, techGroupOf, techSystemOf, actionTechOf } from './data';
import { pressureOf, pressureState, pressureCap, addPressureTo, lowerPressureOf, isPressed, wasSuppressedAt, showPressure, hitPressure } from './pressure';
import { setBraced, setNailed, bracedAs } from '../unitstate';
import { condsAside } from '../magic';
import { feedOf, feedCarry, showFeedNumber, feedRow, doorFeedView } from '../effects/feed';

// ---------- the registry ----------
const HANDLERS: Record<string, TechHandler> = {};
/** Register a technique's handler (one per id; a second registration replaces the first: tests). */
export function technique(h: TechHandler): void {
  HANDLERS[h.id] = h; for (const k of Object.keys(ANSWERS)) delete ANSWERS[k];
  for (const name of Object.keys(h.react || {})) if (!DISPATCHED.has(name)) { DISPATCHED.add(name); onHook(name as HookName, (ctx, cb) => dispatch(name as HookName, ctx, cb)); }
}
const DISPATCHED = new Set<string>();
/** The Answers that listen on a hook, in the registry's order: listed once per hook and again after a registration
 * (dispatch runs on every hook of every action, so it must not walk every technique for every unit each time). */
const ANSWERS: Record<string, { id: string; def: TechDef; fn: (ctx: any, t: Tech) => void }[]> = {};
function answersOn(name: string) {
  return (ANSWERS[name] ||= Object.values(HANDLERS).flatMap((h) => { const def = TECHNIQUE[h.id], fn = h.react?.[name as HookName]; return fn && def?.group === 'answer' ? [{ id: h.id, def, fn: fn as any }] : []; }));
}
/** Held Watches and ready Answers hear the fight's hooks through their handler's `react`. A Watch's handler is called
 * for the unit holding it; an Answer's for every unit that has it usable. Never in a preview. */
function dispatch(name: HookName, ctx: any, cb: Combat): void {
  if (!ctx || ctx.preview || cb.over) return;
  const rng: Rng | undefined = ctx.rng || boundGame()?.rng; if (!rng) return;
  for (const u of [...cb.units]) {
    if (!alive(u)) continue;
    const w = (u as any).watch as HeldWatch | undefined;
    // unheld: a unit in the middle of a technique used with a grenade reacts with the weapon really in its hand. The line
    // chosen when it was held, every named ally (Cover Me's Auto names two) and the arrow it names go with it; a step no
    // held Watch hears (ctx.noWatch: Shift) wakes none.
    if (w && TECHNIQUE[w.id] && !ctx.noWatch) { const fn = HANDLERS[w.id]?.react?.[name]; if (fn) unheld(u, () => fn(ctx, buildTech(cb, u, TECHNIQUE[w.id], { hand: w.hand, tile: w.tile, allyId: w.allyId, targetId: w.targetId, ...(w.allyIds ? { allyIds: w.allyIds } : {}), ...(w.line ? { line: w.line } : {}), ...(w.ammo ? { ammo: w.ammo } : {}) }, rng, false))); }
    // What the unit has usable in each hand is worked out once, and again only after one of its reactions ran (the
    // reaction may have changed what it holds or can use): the same answer as asking for every Answer in turn.
    let sets: { main: Set<string>; off: Set<string> } | null = null;
    // rules 1.58 (N4): a follow strike's miss draws no Answer (Riposte); a landed one meets armour, soak and Parry
    for (const a of name === 'on_miss' && strikeRider(ctx.att) ? [] : answersOn(name)) {
      if (!alive(u)) break;
      if (!sets) sets = { main: new Set(usable(null, u, 'main').map((x) => x.id)), off: new Set(usable(null, u, 'off').map((x) => x.id)) };
      const hand = sets.main.has(a.id) ? 'main' : sets.off.has(a.id) ? 'off' : null; if (!hand) continue;
      unheld(u, () => a.fn(ctx, buildTech(cb, u, a.def, { hand }, rng, false))); sets = null;
    }
  }
}
export const handlerOf = (id: string): TechHandler | null => HANDLERS[id] || null;
export const NOT_BUILT = 'This technique isn\'t in the game yet.';

// ---------- this turn ----------
// turnStamp and chainOf live in physical/data.ts (a leaf the item actions read without a cycle: item K, 0.31.11)
import { turnStamp, chainOf } from './data';
export { turnStamp, chainOf };
/** The chain to write to (kept on the unit). */
function chainFor(cb: Combat, u: Unit) { const c = chainOf(cb, u); u.chain = c; return c; }
/** A melee technique (or an action counted in a melee group: the Breaker's Launch) joins the chain; a Finisher ends it
 *  (techGroupOf, the one reading). */
function noteChain(cb: Combat, u: Unit, id: string) {
  if (techSystemOf(id) !== 'melee') return;
  const ch = chainFor(cb, u); ch.n++; ch.last = id; if (techGroupOf(id) === 'finisher') ch.ended = true;
}
// Item 5531: a Finisher's lock holds until the unit's next turn begins; the chain is cleared then (what the action
// list's gate reads, effects/actions.ts entryOf: u.chain.ended)
onHook('turn_start', (ctx: any) => { if (ctx.u?.chain) delete ctx.u.chain; });
// An action that is no technique row but counts in a group (techniques.json rules.group_actions) joins the chain when done.
onHook('action_done', (ctx: any, cb) => { if (ctx.world || !ctx.u || ctx.a?.type === 'combat/technique') return; const id = actionTechOf(ctx.a); if (id && techGroupOf(id)) noteChain(cb, ctx.u, id); });
/** Per-technique state on a unit (plain JSON, saved with the fight). */
export const techState = (u: Unit, id: string): Record<string, any> => ((u.tech ||= {})[id] ||= {});
/** The same, for reading: nothing is created. */
export const techStateOf = (u: Unit, id: string): Record<string, any> => u.tech?.[id] || {};

// ---------- a shield in the off hand, and Guard (rules 1.13: Durability's door) ----------
/** The shields a unit holds, the off hand's first (rules 1.57, A1: a shield is a weapon row with the Shield property,
 * the one test isShieldId). The main hand's is the unit's weapon (`swapMain` while the off hand is swapped in for a
 * strike); the off hand's is `u.offItem` (combat.ts unitFromCharacter: an off-hand shield is never a second weapon). */
const shieldsOf = (u: Unit): string[] => [u.offItem, u.swapMain || u.weapon].filter((id): id is string => isShieldId(id));
/** The shield a unit holds (the off hand's first), or null. Its techniques come once, however many are held. */
export const shieldOf = (u: Unit): string | null => shieldsOf(u)[0] || null;
/** Rules 1.58 (hands 5e, N1): the off hand's follows item (its weapon, else its carried shield), or null. The one reader
 * of where the word counts: only in the off hand (character.ts followsId is what makes a follows item). */
export const followOf = (u: Unit): string | null => (u.offWeapon ? (followsId(u.offWeapon) ? u.offWeapon : null) : u.offItem && followsId(u.offItem) ? u.offItem : null);
/** What the off hand holds for a technique: its weapon, else (a shield's techniques, worked from the off hand while it
 * holds no weapon) the shield, its own strike line, else nothing. */
const offHeld = (u: Unit): string | null => u.offWeapon || (shieldOf(u) || null);
/** Does this hand's pad carry the shield's techniques (rules 1.57, A1: from whichever hand holds a shield, once)? The
 * off hand while it holds no weapon and a shield is held (in it, or in the main hand); the main hand when it holds a
 * shield and the off hand a weapon (item 4313's asymmetry closed). */
const shieldHand = (u: Unit, hand: 'main' | 'off') => (hand === 'off' ? !u.offWeapon && !!shieldOf(u) : !!u.offWeapon && isShieldId(u.swapMain || u.weapon));
/** A unit's points in a skill (effects/hooks.ts unitSkill, the one reading). */
export { unitSkill } from '../effects/hooks';
/** Guard's numbers (techniques.json rules.guard): every one the engine reads must be there, checked once at load, so no
 *  fallback in code can disagree with the data (the 0.29 consolidation, SF5). */
const GUARD_NUMBERS = ['max', 'soak', 'gain_base', 'gain_per_point', 'shield_gain', 'two_shield_mult', 'brace_gain', 'brace_shield_gain', 'keep_back', 'interpose_cost'] as const;
for (const k of GUARD_NUMBERS) if (typeof PHYS_RULES.guard?.[k] !== 'number') throw new Error('techniques.json rules.guard.' + k + ' is missing: Guard reads it.');
const GR = (): Record<(typeof GUARD_NUMBERS)[number], number> => PHYS_RULES.guard;
export const guardOf = (u: Unit) => resOf(u, 'guard');
export const guardMax = (u: Unit) => u.resMax?.guard ?? 0;
/** What one Guard point takes off a hit for this unit (rules.guard.soak, in HP: × the level scale, rules 1.36; × the
 * plate soak's beta feed, rules 1.60 item 4604: Pain Threshold). The one place it is worked out: the soak (guard.ts),
 * the panel's words (physView) and the door tab's line (effects/feed.ts) read it. A unit, or a sheet ({level, skills}). */
export const guardSoak = (u: Pick<Unit, 'level'> & { skills?: any }): number => Math.max(1, Math.round(GR().soak * scaleOf(u.level) * feedOf(u, 'plate_soak')));
// What one plate soaks now, as the Guard meter and its hint say it: the door tab's plate_soak number (physical/guard.ts
// registers it: a Reactive Plate holder's plate soaks the plate's own stat, fed; anyone else guardSoak), so the meter,
// the tab and the damage path read one copy (rules 1.60 item 4604).
const plateSoakNow = (u: any): number => doorFeedView(u, feedRow('plate_soak').door)?.now ?? guardSoak(u);
/** Rules 1.59 (T4, Leon, 16 Nov 2026: "let them have double guard when doing a guard action, we already have max guard
 * to balance it"): what every Guard gain of this unit is multiplied by: rules.guard.two_shield_mult with a shield in
 * each hand, else 1. The one reader: guardGain (Brace, the Guard technique) and the follow strike's plate (follow). */
const guardMult = (u: Unit): number => (shieldsOf(u).length >= 2 ? GR().two_shield_mult : 1);
/** What gives this unit Guard, and how much (0 for a unit with no Guard pool; the pool's size cuts it). The Guard
 * technique scales: 1, +1 for each Durability point above 1, +1 with a shield in hand. The Brace action is flat: 2, 3
 * with a shield (the lead's tuning, 10 Nov 2026; provisional, rules.guard brace_gain / brace_shield_gain). Rules 1.59
 * (T4): with a shield in each hand the shield's +1 gives way to guardMult (the plain gain ×two_shield_mult). */
export function guardGain(u: Unit, by: 'guard' | 'brace' = 'guard'): number {
  if (u.resMax?.guard == null) return 0;
  const g = GR(), n = shieldsOf(u).length, m = guardMult(u), plain = by === 'brace' ? g.brace_gain : g.gain_base + Math.max(0, unitSkill(u, 'durability') - 1) * g.gain_per_point;
  if (m !== 1) return plain * m; // the pool's cap (guardMax) still holds
  return plain + n * (by === 'brace' ? g.brace_shield_gain : g.shield_gain);
}
/** Why a unit's Guard changed, for the screen (Guard 2.0, rules 1.56 item 4300: the plates): gained, eaten by a hit
 * (soaked: the damage it took off), spent on an order or an Answer, or taken by Pressure. */
export type GuardWhy = 'gain' | 'soak' | 'spend' | 'pressure';
function guardFx(cb: Combat, u: Unit, was: number, why: GuardWhy, soaked?: number) {
  const now = guardOf(u); if (now === was) return;
  emitFx(cb, 'guard', { unit: u.id, at: u.pos, now, was, max: guardMax(u), why, ...(soaked ? { soaked } : {}) });
}
/** Add Guard to a unit, up to its pool. Returns what it gained. */
export function addGuard(cb: Combat, u: Unit, n: number): number { const was = guardOf(u), got = resGain(u, 'guard', Math.max(0, n)); guardFx(cb, u, was, 'gain'); return got; }
/** Spend Guard. False (nothing spent) when the unit holds less. why: what spent it (the screen's word); soaked: the
 * damage a soak took off the hit. */
export function spendGuard(cb: Combat, u: Unit, n: number, why: GuardWhy = 'spend', soaked?: number): boolean { const was = guardOf(u); if (n <= 0) return true; if (!resSpend(u, 'guard', n)) return false; guardFx(cb, u, was, why, soaked); return true; }
/** The Guard a technique costs to use (its own `numbers.guard_cost`: Shield Bash). An Answer spends its own as it fires. */
export const guardCost = (def: TechDef): number => (def.group === 'answer' ? 0 : Number((def.numbers as any)?.guard_cost) || 0);
/** Does the unit hold this item (a class move, a perk, a trait), by its key ('class:defender.brace')? */
export const holds = (u: Unit, key: string): boolean => holdersOf({ u }).some((h) => h.key === key);

// ---------- Momentum (the melee meter) ----------
const holdsMelee = (u: Unit) => weaponSystem(u.weapon) === 'melee' || (!!u.offWeapon && weaponSystem(u.offWeapon) === 'melee') || !!shieldOf(u);
/** Every unit with a melee weapon in a hand has Momentum (cap 3; a class that lists Momentum keeps its own cap). A
 * shield in the off hand counts: its techniques run on Momentum and Guard, whatever the main hand holds. */
export function ensureMomentum(u: Unit): void {
  if (!holdsMelee(u)) return;
  const rm = (u.resMax ||= {}), r = (u.res ||= {});
  if (rm.momentum == null) { rm.momentum = PHYS_RULES.momentum.max; r.momentum ??= 0; }
}
export const momentumOf = (u: Unit) => resOf(u, 'momentum');
function momentumFx(cb: Combat, u: Unit, was: number) { const now = momentumOf(u); if (now !== was) emitFx(cb, 'momentum', { unit: u.id, now, was }); }
/** Finishers: spend all Momentum; returns what was spent. In a preview it only reports. */
export function spendMomentum(t: Tech): number {
  const n = momentumOf(t.u); if (t.preview) { t.pv.momentum = { now: n, after: 0 }; return n; }
  if (t.u.res) t.u.res.momentum = 0; momentumFx(t.cb, t.u, n); return n;
}
/** Momentum a technique gives by its own text: +n. Since the Momentum rework (Leon, 10 Nov 2026) only the plain attack
 * gives Momentum (the engine's +1 for its hit); of the techniques, Parry's Light line and Shield Bash's hit (it pays
 * Guard for it: proposal section 20, item 9) alone still call this. */
export function landed(t: Tech, n = 1): number {
  if (t.def.system !== 'melee') return 0;
  const was = momentumOf(t.u);
  if (t.preview) { const max = t.u.resMax?.momentum ?? PHYS_RULES.momentum.max; t.pv.momentum = { now: t.pv.momentum?.now ?? was, after: Math.min(max, (t.pv.momentum?.after ?? was) + n) }; return n; }
  ensureMomentum(t.u); const got = resGain(t.u, 'momentum', n); momentumFx(t.cb, t.u, was); return got;
}
/** The plain melee attack: the one technique whose hit gives Momentum (Cut, with any melee weapon, fists included). */
export const isPlainMelee = (def: TechDef) => def.system === 'melee' && def.id === 'cut';
/** What using this technique costs in Momentum (the rework, Leon, 10 Nov 2026): a Strike and an Opener 1 each. The
 * free techniques (Cut, Pull Out) cost none; a technique's own `numbers.momentum_cost` says otherwise (Ambush: 0); the
 * first Opener a unit uses in a fight is free; the off-hand half of a both-hands technique was paid for by the main
 * hand. Links and Answers cost none; a Finisher has its own rule (it needs 2 and spends all). */
export function momentumCost(u: Unit, def: TechDef, args?: TechArgs): number {
  const R = PHYS_RULES.momentum;
  if (def.system !== 'melee' || def.free || (def.group !== 'strike' && def.group !== 'opener')) return 0;
  if ((args as any)?._pair?.second) return 0;
  const own = (def.numbers as any)?.momentum_cost;
  const base = typeof own === 'number' ? own : def.group === 'opener' ? (R.first_opener_free && !u.openerUsed ? 0 : R.opener_cost ?? 1) : R.strike_cost ?? 1;
  return base ? Math.max(0, base + momentumCostMod(u, def)) : 0;
}
/** Rules 1.60 (N23, approved 16 Nov 2026): what a unit's items and conditions add to a Strike's or an Opener's Momentum
 * price, the stat family `momentum_cost:<technique id, or its group>` (a negative answer cuts it, never below 0; a
 * price of 0 stays 0): Keep Swinging's "your next Strike or Opener costs no Momentum" is a condition row answering
 * `momentum_cost:strike` and `momentum_cost:opener`. Asked only while something in the fight answers it (statHeard). */
function momentumCostMod(u: Unit, def: TechDef): number {
  const cb = boundGame()?.combat; let n = 0;
  for (const id of ['momentum_cost:' + def.id, 'momentum_cost:' + def.group] as StatId[]) if (statHeard(cb, id)) n += statQuery({ u, cb }, id).add;
  return n;
}
/** Rules 1.60 (N23, approved 16 Nov 2026; Rolling Start's shorter run): what a unit's items add to one of a technique's
 * own numbers (techniques.json `numbers`), the stat family `tech_num:<technique id>.<field>`, read in the one place a
 * technique reads its numbers (Tech.num). Asked only while something in the fight answers it (statHeard). */
function techNumMod(cb: Combat, u: Unit, def: TechDef, k: string): number {
  const id = ('tech_num:' + def.id + '.' + k) as StatId;
  return statHeard(cb, id) ? statQuery({ u, cb }, id).add : 0;
}
/** Rules 1.60 (N23; the Breaker's Wind-up, R3): the Momentum a unit starts a fight with: the door's own start
 * (techniques.json rules.momentum.start) and what its items add (stat `momentum_start`). The one reader is the fight's
 * start (physical/rules.ts), within the unit's pool. */
export const momentumStart = (cb: Combat, u: Unit): number => (PHYS_RULES.momentum.start ?? 1) + (statHeard(cb, 'momentum_start') ? statQuery({ u, cb }, 'momentum_start').add : 0);
/** Momentum lost to something that happened to the unit (a tile walked, a hit taken): −n, never below 0. The meter's
 * own effects event shows it; the log says nothing (a walk's line stays one line). */
export function loseMomentum(cb: Combat, u: Unit, n: number): number {
  const was = momentumOf(u), take = Math.min(was, Math.max(0, n)); if (!take || !u.res) return 0;
  u.res.momentum = was - take; momentumFx(cb, u, was);
  return take;
}
/** Rules 1.60 item 4605 (the beta feeds: Guts): Momentum worn off by a tile walked or a hit taken (physical/rules.ts),
 * divided by the Momentum loss's feed; the part kept is carried (effects/feed.ts feedCarry), so a whole point is kept
 * when it has been earned. A spend (Raise Shield's turn of Momentum into Guard) is not worn off: loseMomentum. */
export function wearMomentum(cb: Combat, u: Unit, n: number): number {
  const kept = feedCarry(u, 'momentum_loss', n - n / feedOf(u, 'momentum_loss'));
  return loseMomentum(cb, u, n - kept);
}
showFeedNumber('momentum_loss', (x) => Math.round(100 / feedOf(x, 'momentum_loss')) / 100);
/** Is the Guard technique up on this unit (melee/links.ts keeps its state)? A guard keeps Momentum when you are hit. */
export const guardUp = (u: Unit): boolean => !!u.tech?.guard?.on;

/** Scratch notes for one use of a technique (never saved). */
const scratch = (t: Tech): Record<string, any> => (t as any)._s || ((t as any)._s = {});
/** For an effects event about a unit the other side can't see now (a Hidden holder, one in the fog): `only` keeps the
 * event to the unit's own side (viewFor drops it for the other side), as watch_set has it. Presentation only. */
export const ownSideOnly = (cb: Combat, u: Unit): { only?: string } => (sideSees(cb, u.side === 'pc' ? 'foe' : 'pc', u) ? {} : { only: u.side });
/** The property line that applies with this weapon, as the pad shows it (the player's choice when it is held). */
function lineProp(def: TechDef, weaponId: string, choice: string | undefined, u: Unit): string | null {
  const m = linesFor(def, weaponId, choice, u).main; if (!m) return null;
  const props = weaponProps(weaponId);
  return (choice && m.props.includes(choice) && props.includes(choice) ? choice : m.props.find((p) => props.includes(p))) || m.props[0] || null;
}

// ---------- the Tech a handler gets ----------
const lineMatches = (props: string[], l: TechLine) => (l.match === 'all' ? l.props.every((p) => props.includes(p)) : l.props.some((p) => props.includes(p)));
/** Off its home: a particular technique with a weapon that has none of its home properties. */
export const offHome = (def: TechDef, weaponId: string) => def.particular && !def.home.some((p) => weaponProps(weaponId).includes(p));
/** The lines that apply with this weapon: the chosen (or first) bonus line, and every stacking line. */
export function linesFor(def: TechDef, weaponId: string, choice?: string, u?: Unit | null): { main: TechLine | null; stack: TechLine[]; choices: TechLine[] } {
  if (offHome(def, weaponId)) return { main: null, stack: [], choices: [] };
  // a line marked when: 'braced' applies only to a user who is Braced, Prone or Emplaced (asked with a unit)
  const met = (l: TechLine) => !u || l.when !== 'braced' || weaponBraced(u) || !!u.prone || condOn(u, 'emplaced');
  const props = weaponProps(weaponId), all = def.lines.filter((l) => lineMatches(props, l) && met(l));
  const bonus = all.filter((l) => !l.stack), stack = all.filter((l) => l.stack);
  const main = bonus.find((l) => choice && l.props.includes(choice)) || bonus[0] || null;
  return { main, stack, choices: bonus };
}
function newPreview(def: TechDef): TechPreview { return { ok: true, why: null, id: def.id, ap: 0, rounds: 0, attacks: [], notes: [] }; }
function buildTech(cb: Combat, u: Unit, def: TechDef, args: TechArgs, rng: Rng, preview: boolean): Tech {
  const hand: 'main' | 'off' = args.hand === 'off' && offHeld(u) ? 'off' : 'main';
  const weaponId = hand === 'off' ? offHeld(u)! : u.weapon, w = WEAPON[weaponId] || WEAPON.fists, props = shieldHand(u, hand) ? ['shield'] : weaponProps(weaponId), off = offHome(def, weaponId);
  const lf = linesFor(def, weaponId, args.line, u), applying = [lf.main, ...lf.stack].filter(Boolean) as TechLine[];
  const tgt = args.targetId ? cb.units.find((x) => x.id === args.targetId) || null : null;
  const pv = newPreview(def);
  const t: Tech = {
    cb, u, c: u.companion ? null : charOfUnit(u), def, w, weaponId, hand, args, tgt, rng, preview, pv,
    wield: (args as any)._w === 'throwable' ? 'throwable' : (args as any)._w === 'stowed' ? 'drawn' : hand,
    has: (p) => !off && props.includes(p) && applying.some((l) => l.props.includes(p)),
    holds: (p) => props.includes(p),
    line: (...ps) => (off ? null : ps.find((p) => applying.some((l) => l.props.includes(p)) && props.includes(p)) || null),
    num: (k, fb = 0) => (typeof def.numbers?.[k] === 'number' ? def.numbers[k] : fb) + techNumMod(cb, u, def, k),
    note: (text) => { pv.notes.push(text); },
    state: () => (preview ? { ...techStateOf(u, def.id) } : techState(u, def.id)), // a preview gets a copy: nothing it writes is kept
  };
  return t;
}

// ---------- cost and who may use what ----------
/** Does this technique fire a round of the weapon (a ranged technique that lists rounds)? A Set fires none. */
const firesRound = (def: TechDef) => def.system === 'ranged' && (def.rounds === 'up_to' || Number(def.rounds) > 0);
/** The rounds a technique spends at most, for its card: a number, or an 'up_to' technique's cap (Mag Dump: its
 * numbers' rounds_per_roll × max_rolls, rules 1.38). */
export const roundsCap = (def: TechDef): number => (def.rounds === 'up_to' ? Number(def.numbers?.rounds_per_roll) * Number(def.numbers?.max_rolls) || 0 : def.rounds);
const roundsOut = (def: TechDef) => ({ rounds: roundsCap(def), ...(def.rounds === 'up_to' ? { upTo: true } : {}) });
/** A technique's AP with this weapon and line. */
export function techniqueAp(def: TechDef, weaponId: string, choice?: string, u?: Unit | null): number {
  const w = WEAPON[weaponId] || WEAPON.fists;
  const fx: any = (w as any).grants?.effect || {};
  const base = def.ap.base === 'reaction' ? 0 : def.id === 'aimed_shot' && fx.op === 'aimed_ap' ? fx.value // the crossbow's Bolt Rest
    : def.id === 'shot' ? Math.max(def.ap.value || 0, attackApCost(w, 'shot')) // a weapon whose shot costs more than 2 (the crossbow: 3, the next bolt loaded with it)
    : def.ap.base === 'flat' ? (def.ap.value || 0) + (firesRound(def) ? cycleAp(w) : 0) // rules 1.18: a hand-worked action (the long rifle's bolt) adds its AP to every technique that fires a round
    : attackApCost(w, isMelee(w) ? 'melee' : 'shot') + (def.ap.add || 0);
  const lf = linesFor(def, weaponId, choice, u);
  return Math.max(0, base + [lf.main, ...lf.stack].reduce((n, l) => n + (l?.ap || 0), 0));
}
const AP_BY_NAME: ReadonlySet<string> = new Set<CostSite>(['shove', 'break']);
/** A technique's AP for this unit now: its own cost, then what the unit's items do to an attack's AP (Southern Fist's
 * +1 with a weapon, Fire Discipline's first burst), asked the way the engine's own attacks ask ('attack_preview' with
 * the cost and a mode). Weapon-priced techniques ask as a melee strike or a shot; a flat one asks only when the data
 * names a mode (`ap.mode`: aimed, burst, auto). The main hand only: the items read the weapon in it. */
export function apFor(cb: Combat, u: Unit, def: TechDef, hand: 'main' | 'off', choice?: string, tgt?: Unit | null): number {
  const weaponId = hand === 'off' && offHeld(u) ? offHeld(u)! : u.weapon, own0 = techniqueAp(def, weaponId, choice, u);
  // the techniques a perk prices by name (Siege Engine: Shove and Break 1 AP less, never below 1): the old actions' path
  const own = AP_BY_NAME.has(def.id) ? price({ cb, u }, def.id, own0).ap : own0;
  const mode = (def.ap as any).mode || (def.ap.base === 'weapon' ? (def.system === 'melee' ? 'melee' : 'shot') : null);
  if (!mode || hand === 'off' || def.ap.base === 'reaction') return priced({ cb, u }, 'technique:' + def.id, own, undefined, { tech: def.id }).ap;
  const hk: any = { att: u, tgt: tgt || u, mode, melee: mode === 'melee', tech: def.id, ap: own, techAp: own0, reach: 1, ignoreCover: false, terms: [], fail: null, free: false, preview: true, volleyCost: true, cb, mods: cb.mods || [] };
  emit(cb, 'attack_preview', hk); return priced({ cb, u }, 'technique:' + def.id, Math.max(0, hk.ap), undefined, { tech: def.id, mode }).ap;
}
/** The techniques a unit may use with the weapon in this hand, and how it has each: free, lent by the weapon, coming
 * with a property, or ready. A unit with no character (an enemy, a companion) has the free ones, what its weapon lends
 * and gives, and its stat block's list (u.techs). */
export function usable(cb: Combat | null, u: Unit, hand: 'main' | 'off', wield?: 'stowed' | 'throwable'): { id: string; how: 'free' | 'lent' | 'comes' | 'ready' }[] {
  const weaponId = hand === 'off' ? offHeld(u) : u.weapon; if (!weaponId) return [];
  const shield = shieldHand(u, hand);
  const sys = weaponSystem(weaponId), props = shield ? ['shield'] : weaponProps(weaponId), c = u.companion ? null : charOfUnit(u);
  // rules 1.58 (item 4529, F-e): a follows item in the off hand has no attack of its own; it offers only what another of
  // its properties brings (a shield's techniques: the shield branch below)
  const followsOff = hand === 'off' && !shield && followOf(u) === weaponId;
  // A companion, a puppet or a unit with a fixed action list (the drone) has the free techniques its list allows, and
  // nothing else: the reducer refuses the rest (game.ts).
  const plainOnly = !!u.companion || !!u.allowedActions || condOn(u, 'puppeted');
  const ready = new Set(plainOnly ? [] : c ? readyTechniques(c, sys) : ((u as any).techs as string[]) || []), lent = plainOnly ? null : weaponTeaches(weaponId);
  const OLD: Record<string, string> = { shot: 'shot', aimed_shot: 'aimed', cut: 'melee', overwatch: 'overwatch' };
  const out: { id: string; how: 'free' | 'lent' | 'comes' | 'ready' }[] = [];
  const comes = (d: TechDef) => d.comes_with.some((p) => props.includes(p)) && (!d.comes_while || (!!c && holdsGear(c, d.comes_while)));
  for (const d of TECHNIQUES) {
    if (d.group === 'follow') continue; // rules 1.58: the follow strike is never offered: the engine makes it
    if (followsOff) { if (!d.perk && !d.innate && !d.free && !wield && !plainOnly && d.system === sys && comes(d)) out.push({ id: d.id, how: 'comes' }); continue; }
    // Rules 1.13. A technique a skill gives (Interpose at Durability 3) is everyone's who has the points, whatever is in
    // the hands: it is listed with the main hand. A shield's techniques are the off hand's while it holds the shield,
    // and that hand offers nothing else. Neither is ever learned, readied or lent.
    // (rules 1.56, the unarmed fighter: a perk's technique also comes with a property its row names, `comes_with`, in
    // the hand that has it: Grapple with bare hands and gloves)
    // the hand that has it, and only while the holder holds what its row's `comes_while` names (P15, character.ts holds:
    // only the family's gloves in the hands; a unit with no character holds nothing, so an enemy has it only on its list)
    if (d.perk) { if (!wield && !plainOnly && (hand === 'main' && statQuery({ u, cb: cb || undefined } as any, `technique:${d.id}`).add > 0 || comes(d))) out.push({ id: d.id, how: 'comes' }); continue; }
    if (d.innate) { if (hand === 'main' && !wield && !plainOnly && unitSkill(u, d.innate.skill) >= d.innate.min) { out.push({ id: d.id, how: 'comes' }); continue; } if (given(d)) continue; } // a skill's pressed technique: learned as before without the points (rules 1.55 item 71)
    if (d.needs.shield) { if (shield && !wield && !plainOnly) out.push({ id: d.id, how: 'comes' }); continue; }
    if (shield && hand === 'off') continue; // the off hand that holds only the shield's techniques offers nothing else
    // Rules 1.56 (Leon's ruling B): a technique that needs something stuck (Pull Out) is offered only while there is one
    // to pull, and then with any weapon in the main hand (what is in the hand does not wrench a blade out of a body).
    if (d.needs.stuck) { if (hand !== 'main' || wield || !cb || !stuckToPull(cb, u)) continue; }
    else if (d.system !== sys) continue;
    // A technique that draws its weapon is used with a stowed one, never with the one in the hand; with a carried
    // throwable as the weapon, only what the throwable lends and what has a line for one of its properties, and never
    // a Watch (a held shot is held with the weapon in the hand).
    if (!!d.needs.stowed !== (wield === 'stowed')) continue;
    if (wield === 'throwable' && (d.free || d.group === 'watch' || !(lent === d.id || d.home.some((p) => props.includes(p)) || d.lines.some((l) => l.props.some((p) => props.includes(p)))))) continue;
    if (d.free) { if (!u.allowedActions || u.allowedActions.includes(OLD[d.id])) out.push({ id: d.id, how: 'free' }); }
    else if (ready.has(d.id)) out.push({ id: d.id, how: 'ready' });
    else if (lent === d.id) out.push({ id: d.id, how: 'lent' });
    else if (!plainOnly && comes(d)) out.push({ id: d.id, how: 'comes' });
    // an item gives the technique with any weapon of its system (stat 'technique:<id>': the Breaker's Riposte, rules 1.30;
    // its Cleave, Break and Coup, rules 1.56 the Momentum chain 2.0: any group, as the stat's own meaning says)
    else if (!plainOnly && hand === 'main' && !wield && statQuery({ u, cb: cb || undefined } as any, `technique:${d.id}`).add > 0) out.push({ id: d.id, how: 'comes' });
  }
  return out;
}
const hasUsable = (u: Unit, hand: 'main' | 'off', id: string, wield?: 'stowed' | 'throwable', cb: Combat | null = null) => usable(cb, u, hand, wield).some((x) => x.id === id);
/** Rules 1.56: is something stuck for this unit to pull (Unit.stuck): one of its own weapons in any living unit, or any
 * weapon in a living unit next to it (the Pull Out handler takes its own first, else the first one there). */
const stuckToPull = (cb: Combat, u: Unit): boolean => cb.units.some((v) => v !== u && alive(v) && ((v.stuck || []) as any[]).some((x) => x.by === u.id || dist(v.pos, u.pos) <= 1));
/** The Momentum a Finisher needs to start (2 unless its data says otherwise), less what the unit's items take off it
 * ('momentum_needed:<id>': Iron Grip II's Throw Down on a held target needs none). It still spends all there is. */
export const finisherNeed = (cb: Combat, u: Unit, def: TechDef): number => Math.max(0, (def.needs.momentum || 2) + statQuery({ u, cb }, `momentum_needed:${def.id}`).add);
/** Why this unit can't start this technique now, before any target is looked at (null: it can). */
function gate(cb: Combat, u: Unit, def: TechDef, args: TechArgs): string | null {
  const hand: 'main' | 'off' = args.hand === 'off' && offHeld(u) ? 'off' : 'main', weaponId = hand === 'off' ? offHeld(u)! : u.weapon;
  const props = shieldHand(u, hand) ? ['shield'] : weaponProps(weaponId);
  const wield = (args as any)._w as 'stowed' | 'throwable' | undefined;
  if (def.needs.shield && !shieldHand(u, hand)) return 'Needs a shield in a hand.';
  if (weaponSystem(weaponId) !== def.system && !def.innate && !def.perk && !def.needs.stuck) return wield === 'stowed' ? 'That isn\'t a ' + def.system + ' weapon.' : def.system === 'melee' ? 'Needs a melee weapon in that hand.' : 'Needs a ranged weapon in that hand.'; // a weapon from the pack isn't in a hand yet
  if (def.needs.stowed && wield !== 'stowed') return 'Pick the weapon to draw.';
  if (!hasUsable(u, hand, def.id, wield, cb)) return wield === 'throwable' ? def.name + ' can\'t be used with that.' : 'You don\'t have ' + def.name + ' ready.';
  const bad = (def.not_with || []).find((p) => props.includes(p)); if (bad) return 'Not available with ' + (/^[aeiou]/.test(bad) ? 'an ' : 'a ') + bad + ' weapon.';
  if (def.group === 'answer') return def.name + ' is a reaction: it fires on its trigger.';
  // Disarmed, or the weapon lowered: only the plain attacks (they fall back to fists) and a weapon drawn or thrown fresh
  if (!def.free && !wield && weaponId !== 'fists' && (condOn(u, 'disarmed') || condOn(u, 'lowered'))) return condOn(u, 'disarmed') ? 'Disarmed: recover your weapon first (2 AP).' : 'Your weapon is lowered: raise it first (1 AP).';
  if (def.system === 'melee') {
    const ch = chainOf(cb, u);
    if (ch.ended) return PHYS_RULES.chain_ended; // (item 5531: the same words refuse an item's action in a melee group: effects/actions.ts)
    if (def.group === 'opener' && ch.n > 0) return 'An Opener is only the first melee technique of your turn.';
    if (def.group === 'finisher') { const need = finisherNeed(cb, u, def); if (momentumOf(u) < need) return 'Needs Momentum ' + need + '.'; }
    const cost = momentumCost(u, def, args); if (cost && momentumOf(u) < cost) return 'Needs ' + cost + ' Momentum: land a plain attack first.';
    const gc = guardCost(def); if (gc && guardOf(u) < gc) return 'Needs ' + gc + ' Guard: Brace or take Guard first.';
  }
  if (def.group === 'watch' && isPressed(u)) return 'You are Pressed: you can\'t hold a shot.';
  if (def.group === 'watch' && (u as any).noWatch === cb.round) return 'Head down: no held shot this round.';
  if (def.group === 'take' && techStateOf(u, '_take').t === turnStamp(cb)) return 'One Take a turn.';
  if (def.needs.hidden && !u.hidden) return 'Only while you are Hidden.';
  const pair = (args as any)._pair as PairMark | undefined;
  const ap = pair ? pair.ap : apFor(cb, u, def, hand, args.line, args.targetId ? cb.units.find((x) => x.id === args.targetId) : null);
  { const no = whyNot(cb, u, ap, { as: { type: 'combat/technique', id: def.id } }); if (no) return no; } // a repeat's credit counts (Encore, items 729, 737)
  const w = WEAPON[weaponId];
  if (wield === 'throwable') { const need = def.rounds === 'up_to' ? 1 : Math.max(1, def.rounds); if (u.ammo < need) return 'Needs ' + need + ', you carry ' + u.ammo + '.'; }
  if (def.system === 'ranged' && w?.magazine != null && !u.infiniteAmmo) {
    const have = hand === 'off' ? u.offAmmo ?? 0 : u.ammo, need = def.rounds === 'up_to' ? 1 : def.rounds;
    if (need > 0 && have < need) return have ? 'Needs ' + need + ' rounds, ' + have + ' loaded.' : props.includes('drawn') ? emptyQuiverWhy(u) : 'Empty: reload first.'; // a quiver can't be refilled in a fight
    if (def.needs.last_round && have !== 1) return props.includes('drawn') ? 'Only with the last arrow in the quiver.' : 'Only with the last round in the weapon.'; // a Drawn weapon's u.ammo is its quiver's total (ranged/quiver.ts)
    if (need > 0 && (hand === 'off' ? u.offJammed : u.jammed)) return 'Jammed: clear it first.'; // each gun its own jam
  }
  return null;
}
/** Target rules the core owns: a Take needs a Pressed target. */
function targetGate(t: Tech): string | null {
  if (t.def.group === 'take') { if (!t.tgt) return 'Pick a target.'; if (!isPressed(t.tgt)) return t.tgt.name + ' isn\'t Pressed.'; }
  if ((t.def.aim === 'enemy' || t.def.aim.startsWith('enemy')) && t.args.targetId && !t.tgt) return 'Pick a target.';
  return null;
}

// ---------- strike: one attack through the engine's attack pipeline ----------
interface Active { t: Tech; o: StrikeOpts; tgt: Unit; real: Unit | null }
const ACTIVE: Active[] = [];
const cur = (att?: Unit) => { const a = ACTIVE[ACTIVE.length - 1]; return a && (!att || a.t.u === att) ? a : null; };
/** Run fn with the technique's hand as the unit's weapon (the off hand is swapped in, as a paired attack does). */
function inHand<T>(t: Tech, fn: () => T): T {
  const u = t.u; if (t.hand !== 'off' || !offHeld(u)) return fn();
  // the one swap (combat.ts withOffHand, rules 1.58 F-b): the off hand's weapon with its own rounds, jam and mods; a
  // shield (rules 1.57, A1) with its own row; each with the skill it hits with. Only a follow wears the off hand.
  const id = offHeld(u)!, pts = (t.c?.skills as any)?.[weaponPhys(id).hits_with];
  return withOffHand(u, fn, { id, preview: t.preview, ...(typeof pts === 'number' ? { attack: mod(pts) } : {}), ...(t.def.group === 'follow' ? { wear: true } : {}) });
}
/** The rounds a technique uses (the ranged lane: Load Special's chambered round, sets.ts; the quiver's arrows, quiver.ts).
 * pick: the ammo type this strike fires (null type: standard), or null to leave it alone. It runs in previews too,
 * where it changes no game state. The first registration that picks a round wins. fromMag false: the round doesn't come out of
 * the magazine (the strike's round is given back; a preview doesn't count it). fired: a real attack used the round.
 * done: after every strike it picked for, preview or refusal included, once u.ammoType is put back. spent: after
 * spendRounds takes n rounds out of the weapon (never in a preview), for every registration. */
export interface StrikeRound {
  pick?(t: Tech, tgt: Unit): { type: string | null; fromMag?: boolean } | null;
  fired?(t: Tech, tgt: Unit, type: string | null): void;
  done?(t: Tech, tgt: Unit): void;
  spent?(t: Tech, n: number): void;
}
const ROUNDS: StrikeRound[] = [];
export const strikeRound = (r: StrikeRound) => { ROUNDS.push(r); };
function roundFor(t: Tech, tgt: Unit): { type: string | null; fromMag?: boolean; by: StrikeRound } | null {
  for (const r of ROUNDS) { const p = r.pick?.(t, tgt); if (p) return { ...p, by: r }; }
  return null;
}
/** One attack. A hit with the plain melee attack (Cut) adds 1 Momentum and ranged hits add Pressure by the rules:
 * handlers don't. No other technique's hit gives Momentum. In a preview it records the roll's chance and damage and returns hit: false. */
export function strike(t: Tech, o: StrikeOpts = {}): StrikeResult {
  const tgt = o.target || t.tgt; if (!tgt) return { ok: false, why: 'Pick a target.', hit: false, crit: false, dmg: 0, killed: false, pct: 0, target: null };
  const mode: 'melee' | 'shot' | 'aimed' | 'thrown' = o.thrown ? 'thrown' : o.mode || (t.def.system === 'melee' ? 'melee' : 'shot'), u = t.u, st = scratch(t);
  if (t.def.group === 'take') o = { ...o, noPressure: true }; // a Take spends Pressure; its hit adds none
  if (o.noMomentum) st.noMomentum = true; if (o.noPressure) st.noPressure = true;
  if (!alive(u)) return { ok: false, why: 'Out of the fight.', hit: false, crit: false, dmg: 0, killed: false, pct: 0, target: tgt };
  const act: Active = { t, o, tgt, real: null };
  ACTIVE.push(act);
  try {
    return inHand(t, () => {
      const offTurn = active(t.cb) !== u; // a reaction: no Recoil from the shots of the user's own turn
      const noRecoil = offTurn || !!o.volley || !!o.noRecoil, fires = mode !== 'melee' && mode !== 'thrown';
      // the round this strike fires (Load Special, the quiver): on the gun for the roll, put back after
      const rd = fires ? roundFor(t, tgt) : null, type0 = u.ammoType; if (rd) u.ammoType = rd.type;
      try {
        // A thrown weapon is aimed with the throw's skill (combat.ts weaponVia: Dexterity), whatever the weapon hits with
        // (a unit with no sheet uses its own bonus).
        const atk0 = u.attack; if (o.thrown && t.c) u.attack = mod((t.c.skills as any)[weaponVia(u, 'thrown')] || 0);
        // In a preview nothing has been spent yet: the rolls this technique has already shown count as fired (rounds,
        // Heat, and Recoil unless the technique is one volley), so each later roll's card is the roll it will be.
        const n = t.preview && fires ? st.rolls || 0 : 0, keep = { ammo: u.ammo, heat: u.heat, shots: u.shotsThisTurn, jammed: u.jammed };
        if (n) {
          if (t.w.magazine != null && !u.infiniteAmmo) u.ammo = Math.max(0, u.ammo - n); if (t.w.heat_limit && !u.infiniteAmmo) u.heat += n; u.shotsThisTurn += n;
          // the earlier rolls reach the Heat limit: the gun jams and the later ones are never fired (in the off hand u.jammed is that gun's jam)
          if (t.w.heat_limit && !u.infiniteAmmo && canJam(t.w) && !neverJams(t.cb, u) && u.heat >= heatLimit(u, t.w)) u.jammed = true;
        }
        let pv: ReturnType<typeof previewAttack>;
        try { pv = previewAttack(t.cb, u, tgt, mode, { free: true, noRecoil, ambush: !!o.ambush }); } finally { if (n) { u.ammo = keep.ammo; u.heat = keep.heat; u.shotsThisTurn = keep.shots; u.jammed = keep.jammed; } if (t.preview) u.attack = atk0; }
        if (pv.ok && fires) st.rolls = (st.rolls || 0) + 1;
        if (t.preview && pv.ok && mode !== 'melee') (st.far ||= []).push(tgt.id); // a ranged or thrown roll: its hit gives Pressure (the card shows it)
        if (t.preview && pv.ok && mode === 'melee' && t.hand === 'main' && !st.real) st.real = tgt; // the first roll's unit (rules 1.58: a follow goes at it)
        if (t.preview || !pv.ok) { u.attack = atk0; if (t.preview) { t.pv.attacks.push({ target: tgt.id, pv }); if (pv.ok && fires && t.w.magazine != null && !u.infiniteAmmo && rd?.fromMag !== false) t.pv.rounds += 1; } return { ok: pv.ok, why: pv.why, hit: false, crit: false, dmg: 0, killed: false, pct: pv.ok ? pv.pct : 0, target: tgt }; }
        const m0 = momentumOf(u), su = (u as any).setUp;
        if (su && !o.rider && su.t === turnStamp(t.cb) && su.target === tgt.id && (!su.only || su.only.includes(t.def.id))) st.willUseSetUp = true; // a mark for other techniques only is not spent by this one
        st.struck = (st.struck || 0) + 1;
        let r: ReturnType<typeof resolveAttack>;
        // a volley's rounds are numbered and named, as the engine's own burst and full auto are (Fire Discipline, Spray and Pray)
        // (o.vi: a handler that runs its own volley numbers it; quiet: a Hidden user stays Hidden; noWear: a later roll of one attack action)
        const vi = o.volley ? (st.vol = (st.vol ?? -1) + 1) : o.vi ?? 0, ro: any = { ...(noRecoil ? { noAp: true } : { free: true }), vi, ...(o.quiet ? { quiet: true } : {}), ...(o.noWear ? { noWear: true } : {}),
          // tech: the weapon's old on-hit grant stays with the plain attacks (the free techniques); ambush: the engine's own
          ...(o.ambush ? { ambush: true } : {}), ...(t.def.free ? {} : { tech: t.def.id }),
          // only the plain melee attack's hit gives Momentum (the engine's +1 in resolveAttack)
          ...(isPlainMelee(t.def) && !o.noMomentum && !o.thrown ? {} : { noMomentum: true }) };
        // the shot's effects event says which technique fired it and its place among this use's rolls (presentation only)
        ro.fx = { tech: t.def.id, vi: st.struck - 1, ...(o.rider ? { follow: true } : {}) }; // rules 1.58 (F-c): a follow strike's swing
        const roll0 = () => resolveAttack(t.cb, t.rng, u, tgt, mode, t.c, ro), roll = o.chain ? () => asChain(roll0) : roll0;
        try { r = o.volley ? asVolley(typeof o.volley === 'string' ? o.volley : 'technique', roll) : roll(); } finally { u.attack = atk0; }
        if (r.refused) return { ok: false, why: r.refused, hit: false, crit: false, dmg: 0, killed: false, pct: 0, target: tgt };
        if (st.willUseSetUp && !r.refused && !r.cancelled) st.usedSetUp = true; // an attack that never came keeps the mark
        if (r.cancelled) { st.cancelled = true; return { ok: true, hit: false, crit: false, dmg: 0, killed: false, pct: pv.pct, target: tgt, cancelled: true }; } // a reaction ended it before the roll: not a miss, no riders
        if (rd) { if (rd.fromMag === false && t.w.magazine != null && !u.infiniteAmmo) u.ammo += 1; rd.by.fired?.(t, tgt, rd.type); } // a round not from the magazine: the magazine stays as it was
        if (t.def.system === 'melee') momentumFx(t.cb, u, m0); // the engine added the plain attack's +1 (a reaction's hit on the user shows itself)
        if (mode === 'melee' && t.hand === 'main' && !st.real) { st.real = act.real || tgt; st.realRoll = { hit: r.hit, fumble: r.fumble }; } // the first roll really made, at the unit really struck (rules 1.58: a follow goes at it; rules 1.89: a fumble makes none)
        // the unit the attack was really made against (Confused, a captive held as a shield, Duck and Roll): riders follow it
        return { ok: true, hit: r.hit, crit: r.crit, dmg: r.damage, killed: r.killed, pct: pv.pct, target: act.real || tgt };
      } finally { if (rd) { u.ammoType = type0; rd.by.done?.(t, tgt); } }
    });
  } finally { ACTIVE.pop(); }
}
// The hooks strike shapes the attack through. They read ACTIVE and never run for anyone else's attack.
onHook('attack_preview', (ctx: any) => {
  const a = cur(ctx.att);
  if (a) {
    if (a.o.extra) ctx.terms.push({ v: a.o.extra, label: a.o.label || a.t.def.name });
    if (a.o.ignoreCover) ctx.ignoreCover = true;
    if (a.o.reach) ctx.reach = Math.max(ctx.reach || 0, a.o.reach);
    if (offHome(a.t.def, a.t.weaponId)) ctx.terms.push({ v: -PHYS_RULES.off_home_penalty, label: a.t.def.name + ' off its home weapon' });
  }
  // Both hands (a technique made with each weapon in turn): the paired attack's penalty for this hand.
  { const pr = a ? ((a.t.args as any)._pair as PairMark | undefined) : undefined; if (pr && pr.hit) ctx.terms.push({ v: pr.hit, label: 'both hands' }); }
  // A set-up mark (Feint, Sidestep): the user's next technique against that target this turn.
  const su = (ctx.att as any).setUp; if (su && !a?.o.rider && su.t === turnStamp(ctx.cb) && su.target === ctx.tgt.id && su.hit && (!su.only || (!!a && su.only.includes(a.t.def.id)))) ctx.terms.push({ v: su.hit, label: su.label || 'set up' });
  // Pressed (rules 1.12): −1 to hit with ranged attacks. Melee swings are not affected.
  if (!ctx.melee && isPressed(ctx.att)) ctx.terms.push({ v: PHYS_RULES.pressure.pressed_ranged_hit, label: 'Pressed' });
});
onHook('attack_roll', (ctx: any) => {
  const a = cur(ctx.att); if (!a) return;
  if (!a.real) a.real = ctx.tgt; // after any redirect; the first roll of this strike (a cone's other rolls come later)
  if (a.o.critMin) ctx.critMin = Math.min(ctx.critMin, a.o.critMin);
  // "a hit is a critical": only a roll that would hit anyway is raised
  if (a.o.critOnHit && ctx.die !== 1 && ctx.die + ctx.toHit >= ctx.need) ctx.critMin = Math.min(ctx.critMin, ctx.die);
});
onHook('damage_out', (ctx: any) => {
  if (ctx.blast) return; // a blast's splash is not the strike (step a7: it fires the hook now; a technique's multiplier never reached it)
  const a = cur(ctx.att); if (!a) return;
  if (a.o.mult != null && a.o.mult !== 1) ctx.mults.push({ v: a.o.mult, label: a.o.label || a.t.def.name });
  // armour this strike ignores, against the unit really struck (nobody's armour is changed)
  if (a.o.ignoreArmour === true) ctx.ignoreArmour = true; else if (a.o.ignoreArmour) ctx.pierce = (ctx.pierce || 0) + Math.round(a.o.ignoreArmour * scaleOf(ctx.att?.level)); // rules 1.36: armour in HP, × scale at the striker's level
});
/** Could the user make this attack now (range, sight, ammunition)? Nothing is rolled or recorded. */
export function canStrike(t: Tech, target: Unit, mode?: 'melee' | 'shot' | 'aimed'): boolean {
  ACTIVE.push({ t, o: {}, tgt: target, real: null });
  try { return inHand(t, () => previewAttack(t.cb, t.u, target, mode || (t.def.system === 'melee' ? 'melee' : 'shot'), { free: true }).ok); } finally { ACTIVE.pop(); }
}
setStrikeRider((att) => !!cur(att)?.o.rider); // rules 1.58 (N4): combat.ts strikeRider, the one reading of a rider
/** True while a strike of this unit asked for no Pressure (pressure.ts reads it in its on_hit). */
export const strikeNoPressure = (att: Unit) => !!cur(att)?.o.noPressure;
/** The technique a unit is striking with right now, if any (pressure.ts, drill.ts). */
export const strikingWith = (att: Unit): Tech | null => cur(att)?.t || null;
setStrikeTech((att) => cur(att)?.t.def.id || null); // an attack's events carry the technique (rules 1.30: the predicate `mode`)
// ... and its own price with the weapon, before items (rules 1.30: the predicate `tech_ap_at_least`, Fire Discipline)
setStrikeTechAp((att) => { const a = cur(att); return a ? techniqueAp(a.t.def, a.t.weaponId, (a.t.args as any).line, a.t.u) : null; });

// ---------- helpers a handler calls ----------
/** A set-up mark on the user's next technique against a target this turn (strike applies it; spent on use). */
export function setUp(t: Tech, target: Unit, mark: { hit?: number; noAnswer?: boolean; label?: string; only?: string[] }): void {
  if (t.preview) { t.note('Sets up your next technique against ' + target.name + (mark.hit ? ': +' + mark.hit + ' to hit' : '') + (mark.noAnswer ? ', and it can\'t Answer' : '') + '.'); return; }
  (t.u as any).setUp = { t: turnStamp(t.cb), target: target.id, ...mark }; scratch(t).madeSetUp = true;
}
/** An Answer's reaction kind (techniques.json `reaction`: attack or protect; rules 1.28). */
export const answerKind = (id: string): ReactKind => ((TECHNIQUE[id] as any)?.reaction || 'attack') as ReactKind;
/** May this unit use this Answer now? Its kind decides what Suppressed (the condition or Pressure's state) forbids:
 * protective Answers (Parry, Shield Wall, Interpose) always work (rules 1.28: tactics.ts reactBlocked). */
export function canAnswer(cb: Combat, u: Unit, id: string, against?: Unit): boolean {
  if (!alive(u) || condOn(u, 'stunned')) return false;
  if (against && (against as any).setUp?.noAnswer && (against as any).setUp.target === u.id && (against as any).setUp.t === turnStamp(cb)) return false;
  if (reactBlockedOf(u, answerKind(id))) return false;
  if (!hasUsable(u, 'main', id) && !hasUsable(u, 'off', id)) return false;
  const order = (charOfUnit(u) as any)?.phys?.answers as string[] | undefined; if (order && !order.includes(id)) return false;
  return true;
}
/** The TN of a save a technique forces (rules 1.13; halved by Leon's ruling, 10 Nov 2026): the stop TN + half the
 * user's strength with the skill the weapon hits with, rounded up (a unit with no sheet: half its tier's number, rounded
 * up) + tnAdd. 10 points (strength 9): +5, TN 17; 6 points: +3; 2 points: +1. Conditions applied with their own save
 * (cond(..., { save: true }): Bind's grapple) keep the full strength, as Sigils, Outbursts, prayers and speech do. `via` is for a save rolled after the technique's own use
 * (Guard with Reach, a Bind walked away from), which kept the skill it was set with. */
export const techSaveTn = (u: Unit, via: string, tnAdd = 0): number => (PHYS_RULES.stop_tn || 12) + Math.ceil(unitStrength(u, via) / 2) + tnAdd;
/** A save by the target with the better of some skills (or a family: 'body' | 'brain' | 'heart'). True: it saved. In a
 * preview nothing is rolled: the save is listed and the target is taken to fail. The TN is techSaveTn: 12 + half the
 * user's strength (rounded up) + tnAdd (positive is harder). */
export function save(t: Tech, target: Unit, skillsOrFam: string[] | 'body' | 'brain' | 'heart', tnAdd = 0): boolean {
  const tn = techSaveTn(t.u, techVia(t), tnAdd), skills = Array.isArray(skillsOrFam) ? skillsOrFam : [skillsOrFam];
  if (t.preview) { (t.pv.saves ||= []).push({ unit: target.id, skills, tn }); return false; }
  const c = target.companion ? null : charOfUnit(target);
  const FAM: Record<string, 'body' | 'brain' | 'heart'> = { guts: 'body', rumination: 'brain', composure: 'heart', body: 'body', brain: 'brain', heart: 'heart' };
  const bonus = Math.max(...skills.map((s) => (FAM[s] && (s === FAM[s] || !c) ? unitSave(target, FAM[s]) : c ? mod((c.skills as any)[s] || 0) : target.attack ?? 0)));
  // the one save (rolls.ts): items that change saves are asked; the family is the first one named (a skill save: Body)
  const sv = rollSave(t.cb, t.rng, { by: t.u, target, fam: skills.map((x) => FAM[x]).find(Boolean) || 'body', id: 'stop', via: techVia(t), tn, mod: bonus, lead: skills.join(' or ') + ' save' }), ok = sv.ok;
  say(t.cb, target.name + (ok ? ' saves' : ' fails the save') + ' against ' + t.def.name + ' (' + sv.text + ').');
  // the save for the screen (HOLDS / STEADY); kept to the target's side when the user's side can't see it
  emitFx(t.cb, 'save', { unit: target.id, at: target.pos, ok, tech: t.def.id, ...(sv.skipped ? {} : { die: sv.die, mod: sv.mod, total: sv.total, tn: sv.tn }), ...(sideSees(t.cb, t.u.side as 'pc' | 'foe', target) ? {} : { only: target.side }) });
  return ok;
}
/** A Body save forced by a technique AFTER its own use (Guard with Reach on a mover's step, a Bound unit walking away):
 * `by` set it, `who` saves against `tn` (techSaveTn of `by` with the skill it was set with). True: it saved. */
export function saveOutside(cb: Combat, rng: Rng, by: Unit | null, who: Unit, against: string, tn: number, via?: string): boolean {
  const sv = rollSave(cb, rng, { by, target: who, fam: 'body', id: 'stop', via, tn, mod: unitSave(who, 'body') });
  say(cb, who.name + (sv.ok ? ' saves' : ' fails the save') + ' against ' + against + ' (' + sv.text + ').');
  return sv.ok;
}
/** The skill a technique's conditions and saves are delivered by (rules 1.13): the one its weapon hits with. */
export const techVia = (t: Tech): string => hitsWith(t.weaponId) || 'raw_power';
/** Put a condition on a target with the technique as its source. No save unless opts.save. True: it took. */
export function cond(t: Tech, target: Unit, id: string, rounds?: number, opts: { save?: boolean; tnAdd?: number; arg?: any } = {}): boolean {
  if (t.preview) { t.note(target.name + ': ' + id.replace(/_/g, ' ') + (rounds ? ' ' + rounds + (rounds === 1 ? ' round' : ' rounds') : '') + (opts.save ? ' (save)' : '') + '.'); return true; }
  const s = applyCond(t.cb, t.rng, t.u, target, id, rounds, undefined, { skipSave: !opts.save, tnAdd: opts.tnAdd, arg: opts.arg, via: techVia(t) });
  if (s) say(t.cb, target.name + s.replace(/^ · /, ': ') + '.');
  return !/resists|untouched|shrugs/.test(s);
}
const stoppedNow = (u: Unit) => ((u as any).stopped || 0) > 0;
/** Pinned, pushed, knocked Prone or halted. One call is one save and one Stopped once, whatever the list holds.
 * Stopped once (Leon): set and checked only by ranged techniques. opts.save: false (none; the caller rolled, or the
 * text says no save), 'default' (Guts or Athletics, the better), or a skill list. Returns true if it took. */
export function stop(t: Tech, target: Unit, how: StopHow | StopHow[], opts: { tiles?: number; rounds?: number; save?: false | 'default' | string[]; tnAdd?: number; apLoss?: number; from?: string;
  /** 'pinned' holds until AP is spent to pull free (pullFree: the unit, or an ally next to it), not for rounds */ untilAp?: number; /** a weapon left in the target, dropped when it is freed */ weapon?: string } = {}): boolean {
  const list = Array.isArray(how) ? how : [how], ranged = t.def.system === 'ranged';
  if (ranged && stoppedNow(target)) { t.note(target.name + ' can\'t be stopped again this round.'); return false; }
  const sv = opts.save === undefined ? 'default' : opts.save;
  if (sv !== false && save(t, target, sv === 'default' ? PHYS_RULES.stop_save : sv, opts.tnAdd || 0)) return false;
  if (t.preview) {
    t.note(target.name + ': ' + list.map((h) => (h === 'push' ? 'pushed ' + (opts.tiles || 1) : h === 'halt' ? 'stopped' : h)).join(', ') + (opts.apLoss ? ', −' + opts.apLoss + ' AP next turn' : '') + '.');
    if (list.includes('push')) forceMove(t, target, 'away', opts.tiles || 1, { from: opts.from }); // where the push would leave it (pv.moves)
    return true;
  }
  const took: StopHow[] = [];
  for (const h of list) {
    // a push that moved nobody (blocked, or an item held it firm) didn't happen: it isn't logged or counted
    if (h === 'push') { if (forceMove(t, target, 'away', opts.tiles || 1, { from: opts.from }) > 0) took.push(h); continue; }
    took.push(h);
    if (h === 'pinned' && opts.untilAp) {
      // a weapon an earlier nail left in the target: a second weapon knocks it to the ground, a nail without one keeps it in
      const old = target.nailed; if (old?.weapon && opts.weapon) dropNailed(t.cb, target);
      setNailed(target, { by: t.u.id, id: t.def.id, ap: opts.untilAp, ...(opts.weapon ? { weapon: opts.weapon } : old?.weapon ? { weapon: old.weapon, ...(old.item ? { item: old.item } : {}), by: old.by } : {}) });
    }
    else if (h === 'pinned') applyCond(t.cb, t.rng, t.u, target, 'pinned', opts.rounds || 1, 'body', { skipSave: true, via: techVia(t) });
    else if (h === 'prone') { if (!target.prone) { applyCond(t.cb, t.rng, t.u, target, 'prone', undefined, undefined, { skipSave: true, via: techVia(t) }); if (target.prone) emitFx(t.cb, 'stance', { unit: target.id, at: target.pos, what: 'prone' }); else took.pop(); } }
  }
  if (opts.apLoss) apDebt(target, opts.apLoss);
  if (!took.length && !opts.apLoss) return false;
  // Stopped once: until the end of the target's next turn (rules.ts ticks it down at each of its turn ends; stopped on
  // its own turn by a Watch, this turn's end is the first tick).
  if (ranged) (target as any).stopped = active(t.cb) === target ? 2 : 1;
  if (!took.length) return true; // only the AP loss landed
  emitFx(t.cb, 'stopped', { unit: target.id, how: took.join('+'), by: t.u.id, ...(opts.apLoss ? { apLoss: opts.apLoss } : {}), ...(opts.untilAp && took.includes('pinned') ? { untilAp: opts.untilAp } : {}) });
  say(t.cb, target.name + ' is ' + took.map((h) => (h === 'push' ? 'pushed' : h === 'halt' ? 'stopped' : h)).join(' and ') + ' (' + t.def.name + ').');
  return true;
}
export type StopHow = 'pinned' | 'push' | 'prone' | 'halt';
/** Move a unit against its will: the one forced move (combat.ts displace). dir: 'away' from or 'toward' the user (or
 * opts.from), or a tile to move toward. Nobody reacts to it (no held Watch, no Overwatch: the unit did not choose to
 * move); the tiles it enters act on it. Returns the tiles moved (0: blocked or it held firm). */
export function forceMove(t: Tech, target: Unit, dir: 'away' | 'toward' | string, tiles: number, opts: { from?: string; how?: string } = {}): number {
  const cb = t.cb, origin = opts.from || t.u.pos;
  // Heavy Hands (Raw Power 3): a melee technique's push away goes 1 tile further (the card, the preview and the push agree)
  if (dir === 'away') tiles += statQuery({ u: t.u, cb }, 'push_tiles', { tech: t.def.id, system: t.def.system }).add;
  const to = dir === 'away' ? { away: origin, tiles } : { toward: dir === 'toward' ? origin : dir, tiles };
  const o = { by: t.u, how: (dir === 'away' ? 'push' : 'pull') as DisplaceHow, source: opts.how || t.def.id };
  if (t.preview) {
    const pv = displace(cb, null, target, to, { ...o, preview: true });
    if (pv.stoppedBy === 'nailed') t.note(target.name + ' is nailed in place and can\'t be moved.');
    if (pv.moved) (t.pv.moves ||= []).push({ unit: target.id, to: pv.to });
    return pv.moved;
  }
  const mv = displace(cb, t.rng, target, to, o);
  if (mv.moved) say(cb, target.name + ' is moved to ' + refOf(target.pos) + ' (' + t.def.name + ')' + mv.text + '.');
  return mv.moved;
}
/** Rounds a technique burns beyond its rolls. False (with a note) if the weapon can't pay. */
export function spendRounds(t: Tech, n: number): boolean {
  if (t.wield === 'throwable' && n > 0) { // a grenade is the ammunition: one from what the user carries
    const have = t.u.throwables?.[t.weaponId] ?? 0; if (have < n) { t.note('Needs ' + n + ', you carry ' + have + '.'); return false; }
    if (t.preview) { t.pv.rounds += n; return true; }
    t.u.throwables![t.weaponId] = have - n; t.u.ammo = have - n; return true;
  }
  if (t.u.infiniteAmmo || t.w.magazine == null || n <= 0) { if (!t.preview && t.w.magazine != null) noteLoose(t.cb, t.u, n); return true; }
  const have = t.hand === 'off' ? t.u.offAmmo ?? 0 : t.u.ammo; if (have < n) { t.note('Needs ' + n + ' rounds, ' + have + ' loaded.'); return false; }
  if (t.preview) { t.pv.rounds += n; return true; }
  if (t.hand === 'off') t.u.offAmmo = have - n; else t.u.ammo = have - n;
  noteLoose(t.cb, t.u, n); // the screen draws a round for each (combat.ts noteLoose)
  for (const r of ROUNDS) r.spent?.(t, n);
  return true;
}
/** Extra Pressure from a technique (the ordinary +1 for a ranged hit is automatic). Returns what landed. */
export function addPressure(t: Tech, target: Unit, n: number, why: string, opts: { hidden?: boolean } = {}): number {
  const hidden = opts.hidden ?? (t.holds('silent') && !!t.u.hidden);
  if (t.preview) { const prior = (t.pv.pressure || []).filter((x) => x.unit === target.id).reduce((m, x) => Math.max(m, x.after), pressureOf(target)), now = prior, cap = pressureCap(target), after = target.side === t.u.side ? now : Math.min(cap, now + n); (t.pv.pressure ||= []).push({ unit: target.id, add: after - now, after, state: pressureState({ ...target, pressure: after } as any) }); return after - now; }
  return addPressureTo(t.cb, target, n, t.u, why, { hidden });
}
export function lowerPressure(t: Tech, target: Unit, n: number): void { if (!t.preview) lowerPressureOf(t.cb, target, n, t.def.name); }
/** Takes: was the target Suppressed when the Take began. */
export const wasSuppressed = (t: Tech): boolean => !!t.tgt && wasSuppressedAt(t.tgt, (t as any)._p0);
/** Has an ally of the user hit this target this round (Crossfire). */
export const hitByAlly = (t: Tech, target: Unit): boolean => Object.entries(((target as any).hitRound || {}) as Record<string, number>).some(([id, r]) => r === t.cb.round && id !== t.u.id && t.cb.units.find((x) => x.id === id)?.side === t.u.side);

// ---------- a weapon that isn't in the hand ----------
// Two kinds of technique are used with something the unit doesn't hold: one that draws its weapon (needs.stowed: Draw
// Cut, Snap Shot; args.item names the pack entry) and one used with a carried throwable as the weapon (a grenade through
// Lob or Rout; args.item is the throwable's id). For both, the unit is shown holding that weapon while the technique
// is checked, previewed and run, so every helper reads the right properties, AP and numbers. A real draw goes through
// the gear service the reducer registers (the same change a player's draw makes, free of AP).
export interface Wield { kind: 'stowed' | 'throwable'; item: string | number; weaponId: string; ammo: number; entry?: any; /** a stowed weapon: the unit's weapon fields as the draw would leave them */ as?: Record<string, any> }
export interface GearService {
  draw(cb: Combat, u: Unit, item: string | number): string | null;
  /** returns the entry that left the hand (its rarity, wear, mods and name), or null */ lose(cb: Combat, u: Unit, hand: 'main' | 'off', at: string | null): any;
  /** put this entry straight into a free hand (main first); false when no hand is free or the weapon is refused */ take?(cb: Combat, u: Unit, item: any): boolean;
  /** the unit's weapon fields as a draw of this pack entry would leave them, or the draw's refusal; changes nothing */ asDrawn(cb: Combat, u: Unit, item: string | number): Record<string, any> | string;
}
let GEAR: GearService | null = null;
/** game.ts gives the core its gear changes (drawing from the pack, a weapon leaving the hand for a pile). */
export const setGearService = (s: GearService) => { GEAR = s; };
/** The weapons a unit has stowed (pack entries; not throwables), for techniques that draw. */
export function stowedOf(u: Unit): { item: number; weaponId: string; name: string }[] {
  const c = u.companion ? null : charOfUnit(u); if (!c) return [];
  return packOf(c).map((x, i) => ({ x, i })).filter(({ x }) => x.qty > 0 && !x.mags && !!x.weapon && !!WEAPON[x.weapon] && WEAPON[x.weapon].category !== 'thrown').map(({ x, i }) => ({ item: i, weaponId: x.weapon!, name: x.name || WEAPON[x.weapon!].name }));
}
/** A stowed weapon as the thing a technique is used with: the draw's own refusal (a skill it needs, an item that bans
 * it, a hand that can't take it), or the fields the draw would leave. */
function stowedWield(cb: Combat, u: Unit, idx: number, it: any): Wield | string {
  const as = GEAR ? GEAR.asDrawn(cb, u, idx) : 'Nothing to draw it with here.'; if (typeof as === 'string') return as;
  return { kind: 'stowed', item: idx, weaponId: it.weapon, ammo: as.ammo ?? it.loaded ?? 0, entry: it, as };
}
function wieldOf(cb: Combat, u: Unit, def: TechDef, args: TechArgs): Wield | null | string {
  if ((args as any)._w) return null; // already holding it (inside the swap, or after the draw)
  const c = u.companion ? null : charOfUnit(u);
  if (def.needs.stowed) {
    if (args.item == null) return 'Pick the weapon to draw.';
    if (!c) return 'Nothing stowed to draw.';
    const idx = packRef(c, args.item), it = packOf(c)[idx];
    if (!it || !it.weapon || !WEAPON[it.weapon] || WEAPON[it.weapon].category === 'thrown' || it.mags) return 'That isn\'t a stowed weapon.';
    return stowedWield(cb, u, idx, it);
  }
  if (args.item == null) return null;
  const id = String(args.item), w = WEAPON[id];
  if (!w || w.category !== 'thrown') return 'That can\'t be used with a technique.';
  const n = u.throwables?.[id] ?? 0; if (n < 1) return 'You carry no ' + w.name.toLowerCase() + '.';
  return { kind: 'throwable', item: id, weaponId: id, ammo: n };
}
/** Rules 1.53: an empty worn quiver's refusal, naming the ready quiver when it holds arrows (Switch quiver is the reload). */
export const emptyQuiverWhy = (u: Unit) => { const n = Object.values(u.quiverReady?.arrows || {}).reduce((t, k) => t + Math.max(0, k || 0), 0); return n ? 'The quiver is empty: Switch quiver (' + n + ' in the other).' : 'The quiver is empty.'; };
const HELD_FIELDS = ['weapon', 'ammo', 'attack', 'dur', 'maxDur', 'mods', 'ammoType', 'jammed', 'dmgMult'] as const;
const putFields = (u: Unit, v: Record<string, any>) => { for (const k of Object.keys(v)) { if (v[k] === undefined) delete (u as any)[k]; else (u as any)[k] = v[k]; } };
const HOLDS: { u: Unit; keep: Record<string, any>; out: boolean }[] = [];
/** Run fn with the unit holding the wielded weapon in its main hand; everything is put back after. A stowed weapon is
 * shown as the real draw would leave it (wi.as, from the gear service): its own to-hit, rarity and wear, no brace on a
 * different weapon, and not Disarmed (a draw ends that). */
function holding<T>(u: Unit, wi: Wield, fn: () => T): T {
  const c = u.companion ? null : charOfUnit(u), w = WEAPON[wi.weaponId];
  const keep: Record<string, any> = {}; for (const k of HELD_FIELDS) keep[k] = (u as any)[k];
  let braced: boolean | undefined, putBack: (() => void) | null = null, drew = false;
  if (wi.kind === 'stowed' && wi.as) {
    drew = true; braced = u.braced;
    putFields(u, wi.as); if (wi.as.weapon !== keep.weapon) bracedAs(u, false);
    putBack = condsAside(u, ['disarmed', 'lowered']);
  } else {
    const pts = (c?.skills as any)?.[w.skill];
    putFields(u, { weapon: w.id, ammo: wi.ammo, maxDur: 0, dur: undefined, mods: wi.entry?.mods || [], ammoType: wi.entry?.ammoType ?? null, jammed: false, dmgMult: 1 });
    if (typeof pts === 'number') u.attack = mod(pts);
  }
  const hold = { u, keep, out: false }; HOLDS.push(hold);
  try { return fn(); } finally {
    HOLDS.splice(HOLDS.indexOf(hold), 1); putFields(u, keep);
    if (drew) { bracedAs(u, braced); putBack?.(); }
  }
}
/** Run fn with a unit's real weapon back in its hand, if it is in the middle of a technique used with something else
 * (its own held shot fires, an opportunity attack is taken). What fn does to the real weapon (a round fired, a jam) is
 * kept. Any other unit: just fn. */
export function unheld<T>(u: Unit, fn: () => T): T {
  const h = [...HOLDS].reverse().find((x) => x.u === u); if (!h || h.out) return fn();
  const held: Record<string, any> = {}; for (const k of Object.keys(h.keep)) held[k] = (u as any)[k];
  putFields(u, h.keep); h.out = true;
  try { return fn(); } finally { for (const k of Object.keys(h.keep)) h.keep[k] = (u as any)[k]; putFields(u, held); h.out = false; }
}
/** The weapon leaves the user's hand as part of the technique (thrown, or left in a target): into the pile on a tile, or
 * nowhere (at: null; whoever holds it now keeps track of it). The user is then unarmed in that hand. */
export function loseWeapon(t: Tech, at: string | null): void {
  if (t.wield === 'throwable') return; // a throwable is spent with spendRounds
  if (t.preview) { t.note(at ? 'The weapon lands at ' + refOf(at) + ': you are unarmed until you pick it up.' : 'The weapon stays there: you are unarmed.'); return; }
  const u = t.u, id = t.hand === 'off' ? u.offWeapon : u.weapon; if (!id || id === 'fists') return;
  if (t.c && GEAR) {
    const e = GEAR.lose(t.cb, u, t.hand, at);
    // left in a target this technique nailed: the weapon's own entry stays with it, and comes back as it was
    if (at === null && e) { const held = t.cb.units.find((v) => v.nailed && v.nailed.by === u.id && v.nailed.weapon === id && !v.nailed.item); if (held) held.nailed!.item = e; }
    return;
  }
  if (at) dropToPile(t.cb, at, [{ id, name: WEAPON[id]?.name || id, qty: 1, kind: 'weapon', weapon: id } as any], 'drop');
  if (t.hand === 'off') { delete u.offWeapon; delete u.offJammed; } else { u.weapon = 'fists'; u.ammo = 0; u.jammed = false; }
}

/** The weapon leaves the hand and stays in a unit it hit (Throw): it is carried there until that unit falls (it drops
 * on its tile) or someone next to it pulls it out (Pull Out). */
export function loseWeaponInto(t: Tech, target: Unit): void {
  if (t.wield === 'throwable' || t.preview) return;
  const u = t.u, id = t.hand === 'off' ? u.offWeapon : u.weapon; if (!id || id === 'fists') return;
  let item: any = null;
  if (t.c && GEAR) item = GEAR.lose(t.cb, u, t.hand, null);
  else { if (t.hand === 'off') { delete u.offWeapon; delete u.offJammed; } else { u.weapon = 'fists'; u.ammo = 0; u.jammed = false; } }
  (target.stuck ||= []).push({ by: u.id, weapon: id, ...(item ? { item } : {}) });
  say(t.cb, '  The ' + (WEAPON[id]?.name || id).toLowerCase() + ' is stuck in ' + target.name + '.');
}
/** Take a weapon entry straight into a free hand of the unit (a character: the reducer's gear change; a unit with no
 * sheet: its empty main hand). False when it has no free hand. */
export function takeWeapon(cb: Combat, u: Unit, weaponId: string, item?: any): boolean {
  if (u.charId && !u.companion && GEAR?.take) return GEAR.take(cb, u, item || { id: weaponId, name: WEAPON[weaponId]?.name || weaponId, qty: 1, kind: 'weapon', weapon: weaponId });
  if (u.weapon === 'fists' || !WEAPON[u.weapon]) { u.weapon = weaponId; u.ammo = 0; u.jammed = false; return true; }
  return false;
}

// ---------- moving the user ----------
/** Tiles the user could step to within n tiles of movement, nearest first, each with its route. */
export function stepsWithin(t: Tech, n: number): { to: string; route: string[]; d: number }[] {
  const P = paths(t.cb, t.u.pos, t.u.id);
  return Object.keys(P.dist).filter((k) => k !== t.u.pos && P.dist[k] <= n && !t.cb.units.some((v) => v !== t.u && !v.dead && v.pos === k))
    .map((k) => ({ to: k, route: routeTo(P, t.u.pos, k), d: P.dist[k] })).filter((x) => x.route.length).sort((a, b) => a.d - b.d || (a.to < b.to ? -1 : 1));
}
/** Run fn as if the user stood on a tile (a preview of "step, then strike"). Nothing is left changed. */
export function standingAt<T>(t: Tech, tile: string, fn: () => T): T { const was = t.u.pos; t.u.pos = tile; try { return fn(); } finally { t.u.pos = was; } }
/** The step that brings a target into this weapon's reach: args.tile if the player named one (and it works), else the
 * nearest tile within `max` tiles from which the attack can be made. null: no step is needed; false: none works. */
export function approach(t: Tech, target: Unit, max: number, mode: 'melee' | 'shot' = 'melee'): { to: string; route: string[]; d: number } | null | false {
  const can = (tile: string) => standingAt(t, tile, () => inHand(t, () => previewAttack(t.cb, t.u, target, mode, { free: true }).ok));
  const steps = moveBlock(t.u) ? [] : stepsWithin(t, max); // a user who can't move may still strike what is in reach
  if (t.args.tile && t.args.tile !== t.u.pos) { const s = steps.find((x) => x.to === t.args.tile); return s && can(s.to) ? s : false; }
  if (can(t.u.pos)) return null;
  // the fewest tiles; among those, the tile nearest the target in a straight line (a lunge goes straight in)
  const [tx, ty] = xy(target.pos), far = (k: string) => { const [x, y] = xy(k); return Math.hypot(x - tx, y - ty); };
  return [...steps].sort((a, b) => a.d - b.d || far(a.to) - far(b.to) || (a.to < b.to ? -1 : 1)).find((x) => can(x.to)) || false;
}
/** Why the user can't take a step now (Pinned, Grappled, Prone…), or null. */
export const stepBlock = (t: Tech): string | null => moveBlock(t.u);
/** Move the user along a route as part of a technique: no AP and no opportunity attacks (the technique's text says when
 * a step is free of them), but otherwise the engine's own move: a Pinned, Grappled or Prone user doesn't step, traps,
 * hazards and Sigil fields on the way go off, and held shots see each tile. Returns the tiles walked. In a preview it
 * only records where the user would end. */
export function stepUser(t: Tech, route: string[], opts: { /** move this unit, not the user: it runs as its own movement (Rout) */ unit?: Unit; /** the walk draws opportunity attacks */ oa?: boolean } = {}): number {
  const u = opts.unit || t.u, cb = t.cb; if (!route.length) return 0;
  if (t.preview) { if (moveBlock(u)) return 0; (t.pv.moves ||= []).push({ unit: u.id, to: route[route.length - 1] }); return route.length; }
  let n = 0;
  for (const k of route) {
    if (!alive(u) || moveBlock(u)) break;
    const was = u.pos;
    if (unheld(t.u, () => moveUnit(cb, u, k, t.rng, 'move', { shortest: true, free: true, oa: !!opts.oa }))) break; // free: the items are told before they price it; unheld: reactions on the way see the user's real weapon
    if (u.pos === was) break; n++;
    if (u.pos !== k) break; // stopped short (a trap, a held shot)
  }
  return n;
}

// ---------- held shots and Answers ----------
/** Hold a Watch: paid for now, kept until it fires or the user's next turn. One at a time (a new one replaces it). */
export function holdWatch(t: Tech, spec: WatchSpec): void {
  if (t.preview) { t.note('Held until your next turn. Fires as your reaction when ' + (t.def.trigger || 'its trigger happens') + '.'); if (spec.tiles || spec.tile) t.pv.area = spec.tiles || [spec.tile!]; return; }
  endWatch(t.cb, t.u, 'replaced'); t.u.overwatch = null;
  const w: HeldWatch = { id: t.def.id, hand: t.hand, ap: t.pv.ap, r: t.cb.round, ...(t.args.line ? { line: t.args.line } : {}), ...(t.args.ammo ? { ammo: t.args.ammo } : {}), ...spec };
  (t.u as any).watch = w;
  // a held shot the other side can't see being set is its holder's side's to know (viewFor drops an event marked `only`)
  emitFx(t.cb, 'watch_set', { unit: t.u.id, at: t.u.pos, id: w.id, trigger: w.trigger, tile: w.tile || null, tiles: w.tiles || (w.tile ? [w.tile] : []), allyId: w.allyId || null, targetId: w.targetId || null,
    ...ownSideOnly(t.cb, t.u) });
}
/** Drop a held Watch (the user's next turn, Pressed, smoke, a flashbang). */
export function endWatch(cb: Combat, u: Unit, why: string): void {
  const w = (u as any).watch as HeldWatch | undefined; if (!w) return;
  delete (u as any).watch; emitFx(cb, 'watch_end', { unit: u.id, at: u.pos, id: w.id, why, ...ownSideOnly(cb, u) });
  if (why !== 'replaced' && why !== 'fired' && why !== 'turn') say(cb, u.name + ' loses the held shot (' + why + ').');
}
/** A held Watch's trigger has happened: spend the reaction and run fn (the strikes). False when the user can't react
 * now (Pressed, no reaction left, an item cancels it): the Watch stays held. kind 'overwatch' keeps the old Overwatch's
 * reaction window and event, so every perk written for it still applies. */
export function fireWatch(t: Tech, ctx: any, target: Unit, fn: () => void, kind: 'watch' | 'overwatch' = 'watch', fx: Record<string, any> = {}): boolean {
  const u = t.u, cb = t.cb, w = (u as any).watch as HeldWatch | undefined;
  if (t.preview || !w || w.id !== t.def.id || !alive(u) || isPressed(u) || !canReact(cb, u, 'attack')) return false;
  return react(cb, u, { kind: 'attack', event: stepEvent(target), window: { kind, mover: target, id: w.id, at: target.pos, rng: t.rng } }, () => {
    ctx?.flush?.(); // the mover's walk so far plays before the shot
    delete (u as any).watch;
    emitFx(cb, kind === 'overwatch' ? 'overwatch' : 'watch_fire', { unit: u.id, target: target.id, from: u.pos, at: target.pos, id: w.id, mode: 'shot', ...fx });
    say(cb, u.name + (kind === 'overwatch' ? ' fires from overwatch.' : ' fires the held shot (' + t.def.name + ').'));
    fn(); checkOver(cb);
  });
}
/** An Answer's trigger has happened: spend the reaction and run fn. False when this unit can't answer now. */
/** The reaction an Answer makes (react()'s options): its kind, the attack it answers, its window. answer() spends it; a
 * reaction that rolls before it spends (Parry) reads its refusals first with these (tactics.ts reactRefusal; rules 1.70
 * item 5546, P5). */
export const answerOpts = (t: Tech, against: Unit | null) => ({ kind: answerKind(t.def.id), event: attackEvent(), window: { kind: 'answer' as const, mover: against, id: t.def.id, at: t.u.pos, rng: t.rng } });
export function answer(t: Tech, against: Unit | null, fn: () => void): boolean {
  const u = t.u, cb = t.cb;
  const kind = answerKind(t.def.id);
  if (t.preview || !canAnswer(cb, u, t.def.id, against || undefined) || !canReact(cb, u, kind)) return false;
  return react(cb, u, { ...answerOpts(t, against) }, () => {
    emitFx(cb, 'technique', { unit: u.id, id: t.def.id, group: 'answer', system: t.def.system, target: against?.id || null, hand: t.hand, at: u.pos, reaction: true });
    say(cb, u.name + ' answers with ' + t.def.name + '.');
    fn(); checkOver(cb);
  });
}

// ---------- the reducer's and the screen's entry points ----------
function prepare(cb: Combat, u: Unit, id: string, args: TechArgs, rng: Rng, preview: boolean): { t: Tech | null; why: string | null; h: TechHandler | null } {
  const def = TECHNIQUE[id]; if (!def) return { t: null, why: 'No such technique.', h: null };
  const g = gate(cb, u, def, args); if (g) return { t: null, why: g, h: null };
  const h = handlerOf(id); if (!h) return { t: null, why: NOT_BUILT, h: null };
  const t = buildTech(cb, u, def, args, rng, preview); (t as any)._p0 = t.tgt ? pressureOf(t.tgt) : 0;
  t.pv.ap = (args as any)._pair ? (args as any)._pair.ap : apFor(cb, u, def, t.hand, args.line, t.tgt);
  return { t, why: targetGate(t) || h.check?.(t) || null, h };
}
/** A handler's own score for the enemy AI: how much this unit wants the technique now (a plain attack is 5; 0: never),
 * and the arguments it would use if it chose them itself. Pure: the Tech is a preview. */
export function aiScore(cb: Combat, u: Unit, id: string, args: TechArgs): { score: number; args: TechArgs } {
  const def = TECHNIQUE[id], h = handlerOf(id); if (!def || !h?.ai) return { score: 0, args };
  const r = h.ai(buildTech(cb, u, def, args, { state: 1 }, true));
  return typeof r === 'number' ? { score: r, args } : { score: r.score, args: { ...args, ...r.args } };
}
/** Run fn with a game bound, when one is given (the client calls the screen's functions with its view of the room: the
 * character behind a unit is found through the bound game). */
function withG<T>(g: any, fn: () => T): T { if (!g) return fn(); const was = bindGame(g); try { return fn(); } finally { bindGame(was); } }
/** What the technique would do, changing nothing (the card, the AI). Pass the game (`g`) when none is bound: the screen does. */
export function previewTechnique(cb: Combat, u: Unit, id: string, args: TechArgs = {}, g?: any): TechPreview {
  if (g) return withG(g, () => previewTechnique(cb, u, id, args));
  args = inShieldHand(u, id, args);
  if (args.hand === 'both') return previewPaired(cb, u, id, args);
  { // a weapon that isn't in the hand: the card is worked out as if it were
    const def0 = TECHNIQUE[id], wi = def0 ? wieldOf(cb, u, def0, args) : null;
    if (typeof wi === 'string') return { ok: false, why: wi, id, ap: 0, rounds: 0, attacks: [], notes: [] };
    if (wi) return holding(u, wi, () => previewTechnique(cb, u, id, { ...args, hand: 'main', _w: wi.kind } as TechArgs));
  }
  const def = TECHNIQUE[id], blank = (why: string): TechPreview => ({ ok: false, why, id, ap: def ? apFor(cb, u, def, args.hand === 'off' && offHeld(u) ? 'off' : 'main', args.line) : 0, rounds: 0, attacks: [], notes: [] });
  const p = prepare(cb, u, id, args, { state: 1 }, true); if (!p.t) return blank(p.why || 'Not now.');
  const t = p.t; if (p.why) { t.pv.ok = false; t.pv.why = p.why; return t.pv; }
  const m0 = momentumOf(u);
  const err = withVia(u, techVia(t), () => p.h!.run(t));
  if (err) { t.pv.ok = false; t.pv.why = err; return t.pv; }
  // Guard as the card shows it: what using it costs (Shield Bash), on top of what the handler itself says (Raise Shield)
  { const gc = guardCost(def); if (gc) { const g0 = t.pv.guard || { now: guardOf(u), after: guardOf(u) }; t.pv.guard = { now: g0.now, after: Math.max(0, g0.after - gc) }; } }
  // one attack and it can't be made: the technique can't be used (a volley with some refused targets still can)
  if (t.pv.attacks.length === 1 && !t.pv.attacks[0].pv.ok) { t.pv.ok = false; t.pv.why = t.pv.attacks[0].pv.why || 'Can\'t attack that.'; }
  if (def.system === 'melee') {
    // Momentum as the card shows it: what using it leaves (a Finisher shows what it spends)
    // (a Strike or an Opener: what it spends; the plain attack: the +1 its hit gives)
    if (!t.pv.momentum) t.pv.momentum = { now: m0, after: m0 };
    if (def.group !== 'finisher') {
      const max = u.resMax?.momentum ?? PHYS_RULES.momentum.max, cost = momentumCost(u, def, args);
      if (cost) t.pv.momentum.after = Math.max(0, t.pv.momentum.after - cost);
      else if (isPlainMelee(def) && t.pv.attacks.some((a) => a.pv.ok) && !scratch(t).noMomentum) t.pv.momentum.after = Math.min(max, t.pv.momentum.after + 1);
    }
    if (def.group === 'finisher') t.pv.ends = true;
  }
  // a ranged or thrown hit's ordinary Pressure, as the card shows it: the first hit on each target this turn, with what
  // the rules add (past cover the target is using; unseen with a Silent weapon)
  if (def.group !== 'take') for (const a of t.pv.attacks) {
    const v = cb.units.find((x) => x.id === a.target); if (!v || !a.pv.ok || v.side === u.side || !(scratch(t).far || []).includes(v.id) || (t.pv.pressure || []).some((x) => x.unit === v.id) || scratch(t).noPressure) continue;
    if (u.pressedThis?.t === turnStamp(cb) && u.pressedThis.ids.includes(v.id)) continue;
    const now = pressureOf(v), after = Math.min(pressureCap(v), now + inHand(t, () => hitPressure(cb, u, v)).n); (t.pv.pressure ||= []).push({ unit: v.id, add: after - now, after, state: pressureState({ pressure: after } as any), onHit: true });
  }
  if (def.group === 'take' && t.tgt) { const now = pressureOf(t.tgt), after = Math.max(0, now - PHYS_RULES.pressure.take_cost); (t.pv.pressure ||= []).push({ unit: t.tgt.id, add: after - now, after, state: pressureState({ pressure: after } as any) }); }
  if (t.pv.ok) follow(t);
  return t.pv;
}
/** The engine's follow technique: the one row of the `follow` group (techniques.json; nobody learns it). */
const FOLLOW_DEF = (): TechDef | undefined => TECHNIQUES.find((d) => d.group === 'follow');
/** Rules 1.58 (hands 5e, N3): the follow strike, at the tail of a main-hand melee technique made as the unit's own
 * action (useTechnique; previewTechnique shows it as a second attack entry, `follow: true`). Once per technique, after
 * it resolved, at the unit its first roll really struck (a foe still up, within the follows item's reach), with the off
 * hand's follows item: its own roll and line, the follow row's numbers (extra, mult), no AP; a rider (N4: no Momentum,
 * no Pressure, no set-up mark, not "a melee hit"). Never: a paired half, an off-hand or shield technique, an Answer, a
 * throw, outside the unit's own turn, with a main weapon that is not a one-handed melee row, or a follows item worn to 0. */
function follow(t: Tech): void {
  const u = t.u, cb = t.cb, def = t.def, st = scratch(t), fdef = FOLLOW_DEF();
  if (!fdef || (t.args as any)._pair || t.hand !== 'main' || def.system !== 'melee' || def.group === 'answer' || def.group === 'follow' || def.needs.shield || t.wield === 'throwable') return;
  const mw: any = WEAPON[u.weapon]; if (!mw || weaponSystem(u.weapon) !== 'melee' || mw.hands !== '1H') return;
  if (cb.reacting || cb.window || active(cb) !== u) return;
  const id = followOf(u), real: Unit | undefined = st.real; if (!id || !real || real.side === u.side || !alive(real)) return;
  { const w = offWear(u, id); if (w.max && w.dur <= 0) return; }
  const ft = buildTech(cb, u, fdef, { hand: 'off', targetId: real.id }, t.rng, t.preview);
  const o: StrikeOpts = { target: real, extra: ft.num('extra'), mult: ft.num('mult', 1), label: WEAPON[id]?.name || fdef.name, rider: true, noPressure: true, noMomentum: true, chain: true };
  if (t.preview) { strike(ft, o); for (const a of ft.pv.attacks) t.pv.attacks.push({ ...a, follow: true, item: id }); return; }
  if (!canStrike(ft, real)) return; // out of its reach: no follow, and nothing is said
  // rules 1.89 (outside playtest 0.32.0): a follow comes after a hit or a miss, never after a natural 1 (a fumble), and
  // the log says which it followed
  const first = st.realRoll as { hit: boolean; fumble: boolean } | undefined, nm = WEAPON[id]?.name || fdef.name;
  if (first?.fumble) { say(cb, '  ' + nm + ' does not follow: the swing fumbled.'); return; }
  say(cb, '  ' + nm + ' follows' + (first ? (first.hit ? ' the hit' : ' the miss') : '') + ':');
  const g0 = guardOf(u); strike(ft, o);
  { const got = guardOf(u) - g0, m = guardMult(u); if (got > 0 && m > 1) resGain(u, 'guard', got * (m - 1)); } // rules 1.59 (T4): two shields double the plate its own line gave
  if (guardOf(u) > g0) guardFx(cb, u, g0, 'gain'); // a plate its own line gave (a shield's, once a turn) plays as any gain
}
/** A shield's technique is the hand's whose pad carries it (shieldHand: the off hand, or a main-hand shield beside an
 * off-hand weapon; rules 1.57 A1), whichever hand the caller named. */
const inShieldHand = (u: Unit, id: string, args: TechArgs): TechArgs => { if (!TECHNIQUE[id]?.needs.shield) return args; const hand = shieldHand(u, 'main') ? 'main' : 'off'; return args.hand === hand ? args : { ...args, hand }; };
/** Use a technique. Returns a refusal in plain words, or null. Nothing is spent on a refusal. */
export function useTechnique(cb: Combat, u: Unit, id: string, args: TechArgs, rng: Rng): string | null {
  const def = TECHNIQUE[id]; if (!def) return 'No such technique.';
  args = inShieldHand(u, id, args);
  if (args.hand === 'both') return usePaired(cb, u, id, args, rng);
  const wi = wieldOf(cb, u, def, args); if (typeof wi === 'string') return wi;
  if (wi?.kind === 'stowed') { // check it as if drawn, then draw it for real (free: the technique's AP pays), then use it
    const pv0 = previewTechnique(cb, u, id, args); if (!pv0.ok) return pv0.why || 'Not now.';
    const e = GEAR ? GEAR.draw(cb, u, wi.item) : 'Nothing to draw it with here.'; if (e) return e;
    emitFx(cb, 'swap_in', { unit: u.id, at: u.pos, weapon: wi.weaponId, from: 'pack', tech: id, ...ownSideOnly(cb, u) });
    return useTechnique(cb, u, id, { ...args, item: undefined, hand: 'main', _w: 'stowed' } as TechArgs, rng);
  }
  if (wi?.kind === 'throwable') return holding(u, wi, () => useTechnique(cb, u, id, { ...args, hand: 'main', _w: 'throwable' } as TechArgs, rng));
  const pv = previewTechnique(cb, u, id, args); if (!pv.ok) return pv.why || 'Not now.';
  const p = prepare(cb, u, id, args, rng, false); if (!p.t || p.why) return p.why || 'Not now.';
  const t = p.t, ap = t.pv.ap, heat0 = u.heat;
  ensureMomentum(u);
  pay(cb, u, ap);
  // a Strike or an Opener spends its Momentum as it is used (given back with the AP if the handler refuses)
  const mCost = momentumCost(u, def, args), mWas = momentumOf(u), opener0 = u.openerUsed;
  if (mCost && u.res) { u.res.momentum = Math.max(0, mWas - mCost); momentumFx(cb, u, mWas); }
  // a technique that costs Guard (Shield Bash: 1 in place of the Strike's Momentum) spends it the same way
  const gCost = guardCost(def); if (gCost) spendGuard(cb, u, gCost);
  if (def.system === 'melee' && def.group === 'opener' && !(args as any)._pair?.second) u.openerUsed = true; // the first Opener of the fight is the free one
  if (def.group === 'take' && t.tgt) showPressure(cb, t.tgt);
  // line, opt, ammo (and a handler's own fields: Crossfire's ally) tell the screen which version of the technique this is
  const more = p.h!.fx?.(t) || {};
  const ev = emitFx(cb, 'technique', { unit: u.id, id, group: def.group, system: def.system, target: t.tgt?.id || null, tile: args.tile || null, hand: t.hand, at: u.pos,
    line: lineProp(def, t.weaponId, args.line, u), opt: args.opt ?? null, ammo: args.ammo ?? (t.wield === 'throwable' && args.item != null ? String(args.item) : null), weapon: t.weaponId, ...more });
  const logAt = cb.log.length; say(cb, u.name + ' uses ' + def.name + (t.tgt ? ' on ' + t.tgt.name : '') + '.');
  const err = withVia(u, techVia(t), () => p.h!.run(t));
  if (err) { // a handler must refuse before it changes anything: the cost comes back
    refund(cb, u, ap); u.heat = heat0; unsay(cb, logAt); (ev as any).refused = true;
    if (mCost && u.res) { const now = momentumOf(u); u.res.momentum = Math.min(u.resMax?.momentum ?? now + mCost, now + mCost); momentumFx(cb, u, now); }
    if (opener0) u.openerUsed = opener0; else delete u.openerUsed;
    if (gCost) addGuard(cb, u, gCost);
    return err;
  }
  if (def.group === 'press' && t.w.heat_limit && !u.infiniteAmmo && !scratch(t).cancelled) {
    u.heat += 1;
    // the Press's own Heat can jam the gun (Leon's ruling, 10 Nov 2026), as a shot's does: the gun that fired (Leon's ruling, 13 Nov 2026)
    const off = t.hand === 'off' && !!u.offWeapon;
    if (t.wield !== 'throwable' && canJam(t.w) && !neverJams(cb, u) && !(off ? u.offJammed : u.jammed) && u.heat >= heatLimit(u, t.w)) { if (off) setOffJam(u, true); else u.jammed = true; say(cb, u.name + '\'s ' + t.w.name.toLowerCase() + ' overheats and jams (' + def.name + ').'); }
  } // a Press costs +1 Heat on top of what it fires (after the roll: the card's to-hit is the roll's)
  for (const n of t.pv.notes) say(cb, '  ' + n);
  const st = scratch(t);
  if (st.usedSetUp && !st.madeSetUp) delete (u as any).setUp; // a set-up is for one technique
  noteChain(cb, u, id);
  follow(t); // rules 1.58 (hands 5e): the off hand's follows item strikes once after a main-hand melee technique
  if (def.group === 'take' && t.tgt) { techState(u, '_take').t = turnStamp(cb); lowerPressureOf(cb, t.tgt, PHYS_RULES.pressure.take_cost, def.name, u); }
  u.attackedTurn = u.attackedTurn || def.system === 'melee';
  checkOver(cb);
  return null;
}
/** What the Attack tab's pad draws for the weapon in a hand: every usable technique by group, with its cost and the
 * line that applies. The screen never works a number out itself. */
export function techniquePad(cb: Combat, u: Unit, hand: 'main' | 'off', g?: any): PadGroup[] {
  if (g) return withG(g, () => techniquePad(cb, u, hand));
  const weaponId = hand === 'off' ? offHeld(u) : u.weapon; if (!weaponId) return [];
  // A shield in the off hand has its own block (rules 1.13): its techniques, and (when the main hand's pad has no
  // Answers row: a gun) the Answers a skill gives, so Interpose is always on a pad.
  const more = shieldHand(u, hand) && weaponSystem(u.weapon) !== 'melee' ? usable(cb, u, 'main').filter((x) => TECHNIQUE[x.id].innate) : [];
  const sys = weaponSystem(weaponId), have = [...usable(cb, u, hand), ...more], c = u.companion ? null : charOfUnit(u), knownSig = new Set(((c as any)?.phys?.known as string[]) || []);
  const taught = new Set(Object.values(WEAPON).map((w) => weaponTeaches(w.id)).filter(Boolean) as string[]);
  // the hand's system's groups, then the group of a technique offered with any weapon (needs.stuck, rules 1.56: Pull Out
  // with a gun), then a door's own pressed technique (not an Answer: Durability's Guard, techniques.json innate; the 0.28.3
  // tank fit) drawn with any weapon under its own group
  const doorGroups = have.map((x) => TECHNIQUE[x.id]).filter((d) => d.needs.stuck || (d.innate && d.group !== 'answer')).map((d) => d.group);
  return [...new Set([...groupsOf(sys), ...doorGroups])].map((group) => ({
    group, label: groupName(group),
    entries: have.filter((x) => TECHNIQUE[x.id].group === group).map((x): PadEntry => {
      const def = TECHNIQUE[x.id], lf = linesFor(def, weaponId);
      // an Answer has no button; one that costs Guard says so when there is none to spend
      const why = def.group === 'answer' ? ((def.numbers as any)?.guard_cost && guardOf(u) < (def.numbers as any).guard_cost ? 'Needs ' + (def.numbers as any).guard_cost + ' Guard: Brace or take Guard first.' : null) : gate(cb, u, def, { hand }) || (handlerOf(def.id) ? null : NOT_BUILT);
      return { id: def.id, name: nameWith(def, weaponId), group, ap: apFor(cb, u, def, hand), ...roundsOut(def), ok: !why, why, text: def.text, aim: def.aim,
        line: lf.main ? lf.main.text : null, ...(lf.choices.length > 1 ? { choices: lf.choices.map((l) => ({ prop: l.props.find((p) => weaponProps(weaponId).includes(p)) || l.props[0], text: l.text })) } : {}),
        lent: x.how === 'lent', signature: x.how === 'ready' && taught.has(def.id) && knownSig.has(def.id), plain: def.id === 'cut' || def.id === 'shot', built: !!handlerOf(def.id) };
    }),
  })).filter((g) => g.entries.length);
}
/** A technique's name with this weapon: its row's `names` by a property of the weapon (techniques.json: a glove's or a bare
 *  hand's Cut is a Strike, the 0.29.0 playtest), else its own name. */
const nameWith = (def: TechDef, weaponId: string | null | undefined): string => { const n = (def as any).names as Record<string, string> | undefined, p = n ? weaponProps(weaponId).find((x) => n[x]) : undefined; return p ? n![p] : def.name; };
/** The pad for what the unit doesn't hold: one block per stowed weapon that a ready technique can draw, and one per kind
 * of throwable carried that a technique can be used with. The screen sends the entry's technique with the block's
 * `item` (combat/technique { id, item }). */
export interface PackPad { item: string | number; kind: 'stowed' | 'throwable'; weapon: string; name: string; count?: number; entries: PadEntry[] }
export function packPad(cb: Combat, u: Unit, g?: any): PackPad[] {
  if (g) return withG(g, () => packPad(cb, u));
  const out: PackPad[] = [];
  const block = (wi: Wield, name: string, count?: number, refused?: string) => holding(u, wi, () => {
    const entries = usable(cb, u, 'main', wi.kind).map((x): PadEntry => {
      const def = TECHNIQUE[x.id], lf = linesFor(def, wi.weaponId, undefined, u), why = refused || gate(cb, u, def, { hand: 'main', _w: wi.kind } as TechArgs) || (handlerOf(def.id) ? null : NOT_BUILT);
      return { id: def.id, name: nameWith(def, wi.weaponId), group: def.group, ap: apFor(cb, u, def, 'main'), ...roundsOut(def), ok: !why, why, text: def.text, aim: def.aim, line: lf.main ? lf.main.text : null,
        ...(lf.choices.length > 1 ? { choices: lf.choices.map((l) => ({ prop: l.props.find((p) => weaponProps(wi.weaponId).includes(p)) || l.props[0], text: l.text })) } : {}),
        lent: x.how === 'lent', signature: false, plain: false, built: !!handlerOf(def.id) };
    });
    if (entries.length) out.push({ item: wi.item, kind: wi.kind, weapon: wi.weaponId, name, ...(count != null ? { count } : {}), entries });
  });
  const c = u.companion ? null : charOfUnit(u);
  if (c) for (const s of stowedOf(u)) {
    const it = packOf(c)[s.item], wi = stowedWield(cb, u, s.item, it);
    // a weapon the draw itself refuses (a skill it needs, a ban) is listed, greyed, with the draw's own words
    if (typeof wi === 'string') block({ kind: 'stowed', item: s.item, weaponId: s.weaponId, ammo: it.loaded ?? 0, entry: it }, s.name, undefined, wi); else block(wi, s.name);
  }
  for (const [id, n] of Object.entries(u.throwables || {})) if (n > 0 && WEAPON[id]?.category === 'thrown') block({ kind: 'throwable', item: id, weaponId: id, ammo: n }, WEAPON[id].name, n);
  return out;
}
/** A unit's meters as one side may see them (the screen draws this; it compares nothing itself). Pips a Silent weapon
 * put on a unit are hidden from that unit's own side. */
export function physView(cb: Combat, u: Unit, viewerSide: 'pc' | 'foe', g?: any): ReturnType<typeof physViewOf> { return g ? withG(g, () => physViewOf(cb, u, viewerSide)) : physViewOf(cb, u, viewerSide); }
/** The Momentum rule in plain sentences (the meter's hint on the screen): data, techniques.json rules.momentum.texts.how. */
export const MOMENTUM_HINT: string = String(PHYS_RULES.momentum?.texts?.how || '');
/** The Guard rule in plain sentences (the pool's hint on the screen). */
/** Guard's rule in words, every number from rules.guard (its soak at this unit's level, rules 1.36). */
export function guardHint(u: Pick<Unit, 'level'>): string {
  const g = GR(), brace = g.brace_gain, keep = g.keep_back;
  return 'Brace gives ' + brace + ' Guard (' + (brace + g.brace_shield_gain) + ' with a shield); the Guard technique gives ' + g.gain_base + ', +' + g.gain_per_point + ' for each Durability point above 1, +' + g.shield_gain + ' with a shield; a shield in each hand multiplies every gain by ' + g.two_shield_mult + ' instead. Each point takes ' + plateSoakNow(u) + ' damage off a hit; ' + (keep === 1 ? 'the last point is' : 'the last ' + keep + ' points are') + ' kept for a reaction unless the hit would take you down. Pressure comes off Guard first. While you hold any, a hit costs you no Momentum.';
}
/** A Pressure state's data row (rules.pressure.states: word, says, text, text_pc). */
const PS = (state: string): any => PHYS_RULES.pressure?.states?.[state] || {};
function physViewOf(cb: Combat, u: Unit, viewerSide: 'pc' | 'foe') {
  const max = u.resMax?.momentum;
  const hid = viewerSide === u.side ? Math.min(pressureOf(u), (u as any).pressHidden || 0) : 0, now = pressureOf(u) - hid;
  const state = pressureState({ pressure: now } as any);
  const by = viewerSide === u.side && hid >= pressureOf(u) ? [] : Object.keys(((u as any).pressBy || {}) as Record<string, string>).map((id) => cb.units.find((x) => x.id === id)).filter((x): x is Unit => !!x && alive(x)).map((x) => ({ unit: x.id, name: x.name }));
  const w = (u as any).watch as HeldWatch | undefined;
  return {
    momentum: max != null && holdsMelee(u) ? { now: momentumOf(u), max, hint: MOMENTUM_HINT } : null,
    // Durability's Guard (rules 1.13): the pool, what a Brace or the Guard technique would add now, and the rule
    guard: u.resMax?.guard != null ? { now: guardOf(u), max: guardMax(u), gain: guardGain(u), braceGain: guardGain(u, 'brace'), keep: GR().keep_back, soak: plateSoakNow(u), shield: !!shieldOf(u), hint: guardHint(u) } : null,
    // Pressure 2.0 (rules 1.56): the state's word, its short line and its cost are data (techniques.json rules.pressure.states)
    pressure: { now, max: pressureCap(u), state, word: state ? PS(state).word || '' : now ? 'Under fire' : '', says: state ? PS(state).says || '' : '',
      cost: state ? (u.side === 'pc' && PS(state).text_pc) || PS(state).text || '' : '', by },
    stopped: stoppedNow(u) ? { on: true, text: 'Can\'t be stopped again until the end of its next turn' } : null,
    // rules 1.55: the thrown weapons stuck in this unit, and the ones this unit has stuck in others (the sheet's line)
    stuck: ((u.stuck || []) as any[]).map((x) => ({ weapon: x.weapon as string, name: WEAPON[x.weapon]?.name || 'weapon', by: x.by as string, byName: cb.units.find((y) => y.id === x.by)?.name || '' })),
    thrown: viewerSide !== u.side ? [] : cb.units.filter((v) => alive(v) && v.id !== u.id).flatMap((v) => ((v.stuck || []) as any[]).filter((x) => x.by === u.id).map((x) => ({ weapon: x.weapon as string, name: WEAPON[x.weapon]?.name || 'weapon', in: v.id, inName: v.name,
      text: 'Your ' + (WEAPON[x.weapon]?.name || 'weapon').toLowerCase() + ' is stuck in ' + v.name + ': Pull Out from next to it brings it back, or it falls when ' + v.name + ' does.' }))),
    nailed: u.nailed ? { ap: u.nailed.ap, by: cb.units.find((x) => x.id === u.nailed!.by)?.name || '', text: 'Nailed in place until ' + u.nailed.ap + ' AP is spent to pull free' } : null,
    watch: w && (viewerSide === u.side || sideSees(cb, viewerSide, u)) ? { id: w.id, name: TECHNIQUE[w.id]?.name || w.id, trigger: w.trigger, tile: w.tile || null, tiles: w.tiles || (w.tile ? [w.tile] : []), mine: viewerSide === u.side } : null,
  };
}
export type { Tech, TechArgs, TechDef, TechHandler, TechPreview, StrikeOpts, StrikeResult, Character };

// ---------- both hands (Leon, 10 Nov 2026) ----------
// Two weapons of one kind (two guns, two melee weapons): some techniques can be made with each in turn, by the paired
// attack's rule (spec: Hands): the main hand at −1, the off hand at −3 (better by 1 per 3 Dexterity, to −1), for the
// dearer hand's cost + 1 AP. Only techniques that are one use of one weapon at a target are offered.
interface PairMark { hit: number; ap: number; /** the off-hand half: the main hand's use paid the Momentum */ second?: boolean }
export const PAIRED_TECHNIQUES = ['bash', 'sunder', 'hamstring', 'half_sword', 'aimed_shot', 'called_shot', 'punch_through', 'burst', 'suppress'];
const offHandPenalty = (u: Unit) => Math.min(-1, -3 + Math.floor(((u as any).dexterity || 0) / 3));
/** Why this unit can't use this technique with both hands (null: it can). */
function pairedWhy(u: Unit, def: TechDef): string | null {
  if (!u.offWeapon || !WEAPON[u.offWeapon]) return 'Needs a weapon in each hand.';
  if (followOf(u)) return 'The ' + WEAPON[u.offWeapon].name.toLowerCase() + ' follows: it is not a second weapon.'; // rules 1.58 (5b amended)
  if (!pairs(u) || weaponSystem(u.weapon) !== def.system) return 'Needs two ' + (def.system === 'melee' ? 'melee weapons' : 'guns') + '.';
  if (!PAIRED_TECHNIQUES.includes(def.id)) return def.name + ' is made with one weapon.';
  if (!hasUsable(u, 'main', def.id) || !hasUsable(u, 'off', def.id)) return 'Both weapons must be able to use ' + def.name + '.';
  return null;
}
const pairedAp = (cb: Combat, u: Unit, def: TechDef, args: TechArgs) => Math.max(apFor(cb, u, def, 'main', args.line), techniqueAp(def, u.offWeapon!, args.line, u)) + 1;
/** The techniques a unit could make with both hands now, as pad entries (the screen's third block). */
export function pairedPad(cb: Combat, u: Unit, g?: any): PadEntry[] {
  if (g) return withG(g, () => pairedPad(cb, u));
  if (!pairs(u)) return []; // rules 1.58 (F-d): the one Both test
  return PAIRED_TECHNIQUES.map((id) => TECHNIQUE[id]).filter((def) => def && !pairedWhy(u, def)).map((def): PadEntry => {
    const ap = pairedAp(cb, u, def, {}), why = whyNot(cb, u, ap) || gate(cb, u, def, { hand: 'main', _pair: { hit: -1, ap } } as any) || gate(cb, u, def, { hand: 'off', _pair: { hit: offHandPenalty(u), ap: 0, second: true } } as any);
    const lf = linesFor(def, u.weapon, undefined, u);
    return { id: def.id, name: def.name, group: def.group, ap, ...roundsOut(def), ok: !why, why: why || null, text: def.text, aim: def.aim, line: lf.main ? lf.main.text : null, lent: false, signature: false, plain: false, built: true };
  });
}
function previewPaired(cb: Combat, u: Unit, id: string, args: TechArgs): TechPreview {
  const def = TECHNIQUE[id], blank = (why: string, ap = 0): TechPreview => ({ ok: false, why, id, ap, rounds: 0, attacks: [], notes: [] });
  if (!def) return blank('No such technique.');
  const no = pairedWhy(u, def); if (no) return blank(no);
  const ap = pairedAp(cb, u, def, args); { const no = whyNot(cb, u, ap); if (no) return blank(no, ap); }
  const m = previewTechnique(cb, u, id, { ...args, hand: 'main', _pair: { hit: -1, ap } } as any); if (!m.ok) return { ...m, ap };
  const o = previewTechnique(cb, u, id, { ...args, hand: 'off', _pair: { hit: offHandPenalty(u), ap: 0, second: true } } as any);
  const notes = [...m.notes, ...(o.ok ? o.notes.filter((n) => !m.notes.includes(n)) : ['Off hand: ' + (o.why || 'can\'t.')]), 'Both hands: main hand −1, off hand ' + offHandPenalty(u) + ', +1 AP.'];
  return { ...m, ap, rounds: m.rounds + (o.ok ? o.rounds : 0), attacks: [...m.attacks, ...(o.ok ? o.attacks : [])], notes, ...(o.ok && o.saves ? { saves: [...(m.saves || []), ...o.saves] } : {}) };
}
function usePaired(cb: Combat, u: Unit, id: string, args: TechArgs, rng: Rng): string | null {
  const pv = previewPaired(cb, u, id, args); if (!pv.ok) return pv.why || 'Not now.';
  say(cb, u.name + ' uses both hands.');
  const e = useTechnique(cb, u, id, { ...args, hand: 'main', _pair: { hit: -1, ap: pv.ap } } as any, rng); if (e) { cb.log.pop(); return e; }
  if (u.dead || u.downed || cb.over) return null;
  const tgt = args.targetId ? cb.units.find((x) => x.id === args.targetId) : null;
  if (tgt && (tgt.dead || tgt.downed)) return null; // the first weapon ended it
  const e2 = useTechnique(cb, u, id, { ...args, hand: 'off', _pair: { hit: offHandPenalty(u), ap: 0, second: true } } as any, rng);
  if (e2) say(cb, '  (off hand: ' + e2 + ')');
  return null;
}
