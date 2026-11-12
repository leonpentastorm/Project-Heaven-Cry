// PAYING A COST (engine review 1, finding F3; docs/design/handoffs/engine-foundations-2-costs.md). One path for what an
// action takes: its AP and any other resource.
//
//   (the pipelines with a price of their own, an attack, a move, a glyph, an Evoke, an Outburst, a technique, a Call,
//    end in priced(x, '<action>', ap): the same hook; they pay with the number, or bill() when a resource goes with it)
//   price(x, action, base?, ctx?)   what the action costs THIS unit now: the base (data/actions.json when none is given),
//                                   then the items (the `action_cost` op and the 'ap_cost:<site>' stat for a cost site,
//                                   then the ONE `cost` hook, which every action passes through), the floor, "free".
//   whyNot(cb, u, priced, o?)       the ONE refusal sentence when it can't be paid ("Needs 2 AP.", "Needs 3 charge."),
//                                   or null. canPay() is its yes / no.
//   pay(cb, u, priced)              take it: AP first from a credit on this action (Encore, a Brief), then the unit's
//                                   own; then each resource. NOTHING ELSE SUBTRACTS AP.
//   refund(cb, u, priced)           give it back (a ruling that went the player's way, a refused inner action).
//   grantAp(cb, u, n, o?)           AP given outside the perk economy (a Quicken, the area map); perk AP is
//                                   grantPerkAp / bankAp (effects/ap.ts), which hold the +3 cap and the turn's 9.
//   setAp(u, n)                     a turn's refill, a lost turn (0), a window's pool: the AP is SET, not paid.
//   freely(u, fn)                   an action made inside another at no AP (a class move's inner attack).
//   withAp(u, n, fn)                a dry run at a given AP (an enemy's intent, the planner): put back after.
//   credit: lend(cb, u, a) before a reducer action, settleCredit(cb, loan) after it: Encore's repeat and a Brief's
//                                   discount are a CREDIT that pay() draws on first. The AP is never inflated.
//
// A resource is a row of RESOURCES (data/actions.json `resources`): where it lives on the unit or the character,
// and its name in a refusal. An action declares `cost: { ap, res: { charge: 2, mp: 10 } }`; nobody subtracts by hand.
// The lint (test/lint-costs.test.ts) fails on a hand-written `u.ap <` check, a direct write to a unit's `.ap`, a
// 'Needs N AP.' built outside this file, and an actionAp() call outside it.
import actionsJ from '../../../../data/actions.json';
import type { Character } from '../character';
import type { Combat, Unit } from '../combat';
import { emit, emitOwn, hookUsed, charOfUnit } from './hooks';
import { actionAp } from './core';
import { COST_SITES, type CostSite } from './stats';
import { briefCredit, AP_MAX } from './ap';

// ---------------------------------------------------------------------------------------------- the data
/** What an action costs before anyone changes it. */
export interface Cost { ap?: number; res?: Record<string, number> }
/** An action priced for one unit: what pay() takes. */
export interface Priced { action: string; ap: number; res: Record<string, number>; labels: string[]; free: boolean }

interface VerbCost { ap?: number | null; min?: number; site?: string; res?: Record<string, number>; [k: string]: any }
/** The base cost of every engine verb: the rows of data/actions.json (`items`, by id) and its `costs` map (the verbs
 * that have no row: a weapon's own, magic's, the area map's). */
const VERBS: Record<string, VerbCost> = { ...Object.fromEntries(((actionsJ as any).items as any[]).map((a) => [a.id, a])), ...((actionsJ as any).costs || {}) };
/** The data's number for an action (`ap`, or another field: 'ap_downed', 'ap_lowered', 'extra_ap'…). A missing one is
 * a typo or a missing line of data: it throws. */
export function costOf(action: string, field = 'ap'): number {
  const n = VERBS[action]?.[field];
  if (typeof n !== 'number') throw new Error('No ' + field + ' for the action "' + action + '" in data/actions.json.');
  return n;
}
export const hasCost = (action: string, field = 'ap'): boolean => typeof VERBS[action]?.[field] === 'number';

interface ResDef { name: string; on: 'unit' | 'character'; path: string; whole?: boolean }
/** Every resource an action can cost (data/actions.json `resources`). */
export const RESOURCES: Record<string, ResDef> = (actionsJ as any).resources;
const holderOfRes = (d: ResDef, u: Unit | null | undefined, c: Character | null | undefined): any => (d.on === 'character' ? c ?? charOfUnit(u) : u);
function cell(d: ResDef, root: any): { o: any; k: string } | null {
  if (!root) return null; const parts = d.path.split('.'); let o = root;
  for (let i = 0; i < parts.length - 1; i++) { o = o?.[parts[i]]; if (o == null) return null; }
  return { o, k: parts[parts.length - 1] };
}
/** How much of a resource the unit has now (0 when it has no such thing: no Evoker, no class meter). */
export function resLeft(u: Unit | null | undefined, id: string, c?: Character | null): number {
  if (id === 'ap') return u?.ap ?? 0;
  const d = RESOURCES[id]; if (!d) throw new Error('Unknown resource "' + id + '" (data/rules.json costs.resources).');
  const x = cell(d, holderOfRes(d, u, c)); return x ? Number(x.o[x.k]) || 0 : 0;
}
function resAdd(u: Unit | null | undefined, id: string, n: number, c?: Character | null): void {
  const d = RESOURCES[id]; if (!d) throw new Error('Unknown resource "' + id + '" (data/rules.json costs.resources).');
  const x = cell(d, holderOfRes(d, u, c)); if (x) x.o[x.k] = (Number(x.o[x.k]) || 0) + n;
}

// ---------------------------------------------------------------------------------------------- the price
const r10 = (n: number) => Math.round(n * 10) / 10;
type Who = { cb?: Combat | null; u?: Unit | null; c?: Character | null };
/** What `action` costs this unit now. base: its AP (or `{ ap, res }`) before items; left out, the data's
 * (data/actions.json). ctx: what the action knows that an item may ask about (the hand, the target, the word). It goes
 * to the stat query and onto the `cost` hook's context.
 *
 * The `cost` hook: { u, c, cb, action, base, ap, res, min, free, labels, ...ctx }. A handler changes `ap` or `res`,
 * raises `min` ("never below 1"), or sets `free`. It fires for EVERY priced action, whatever runtime it belongs to. */
export function price(x: Who, action: string, base?: number | Cost | null, ctx: Record<string, unknown> = {}): Priced {
  const b: Cost = base == null ? { ap: costOf(action) } : typeof base === 'number' ? { ap: base } : base;
  let ap = b.ap ?? 0; const labels: string[] = [], site = VERBS[action]?.site || action;
  // the fast way out (an attack's preview runs thousands of times a turn): no site to ask, and nobody on the `cost` hook
  if (!hookUsed('cost') && !(x.u && COST_SITES.has(site))) return { action, ap: r10(Math.max(VERBS[action]?.min ?? 0, ap)), res: b.res ? { ...b.res } : {}, labels, free: false };
  if (x.u && COST_SITES.has(site) && site !== 'heal') { const r = actionAp(x, site as CostSite, ap, ctx); ap = r.ap; labels.push(...r.labels); }
  const c: any = { ...ctx, u: x.u || null, c: x.c || null, cb: x.cb || null, action, base: b.ap ?? 0, ap, res: { ...(b.res || {}) }, min: VERBS[action]?.min ?? 0, free: false, labels };
  if (!hookUsed('cost')) { /* nobody listens: nothing to ask */ } else if (x.cb) emit(x.cb, 'cost', c); else if (x.u) emitOwn(x.u, 'cost', c); // with no fight in reach, the unit's own items only
  return { action, ap: c.free ? 0 : r10(Math.max(c.min, c.ap)), res: c.res, labels, free: !!c.free };
}
/** An action whose AP its own pipeline has already worked out (an attack's preview, a glyph's, an Outburst's): the
 * number as a Priced, through the `cost` hook like every other. */
export const priced = (x: Who, action: string, ap: number, res?: Record<string, number>, ctx?: Record<string, unknown>): Priced => price(x, action, { ap, res }, ctx);
/** A cost that is already final (its pipeline priced it, hook and all): what pay() takes. No hook is asked again. */
export const bill = (action: string, ap: number, res: Record<string, number> = {}): Priced => ({ action, ap, res, labels: [], free: false });

// ---------------------------------------------------------------------------------------------- credit (Encore, a Brief)
const ENCORE_PLAIN: Record<string, string> = { shot: 'combat/attack:shot', aimed_shot: 'combat/attack:aimed', cut: 'combat/attack:melee', overwatch: 'combat/overwatch' };
/** Encore's key for an action: its type and what it is (a perk's id, an attack's mode, a move's kind…), never its
 * target. Prayers, ending the turn and declining a window can't be repeated (null). */
export function encoreKey(a: any): string | null {
  const t = String(a?.type || ''); if (!t.startsWith('combat/') || ['combat/pray', 'combat/end-turn', 'combat/decline'].includes(t)) return null;
  // Rules 1.12: a free technique is the plain action it stands for (Shot is the shot, Aimed Shot the aimed shot, Cut the
  // melee attack, Overwatch the overwatch), so either one repeats the other. Any other technique is itself, by its id.
  if (t === 'combat/technique') { const plain = ENCORE_PLAIN[String(a.id)]; return plain || 'combat/technique:' + String(a.id || ''); }
  const what = t === 'combat/attack' ? a.mode || 'shot' : t === 'combat/move' ? a.how || 'move' : a.id ?? a.word ?? a.design ?? a.item ?? a.kind ?? a.hand ?? '';
  return t + (what ? ':' + what : '');
}
/** The credit a reducer action carries while it runs (cb.credit): AP that pay() takes before the unit's own. A Brief's
 * part is drawn first, then Encore's. */
export interface Credit { unit: string; brief: number; encore: number; briefUsed: number; encoreUsed: number; paid: number }
const creditOf = (cb: Combat | null | undefined, u: Unit): Credit | null => { const c: Credit | undefined = (cb as any)?.credit; return c && c.unit === u.id ? c : null; };
/** The AP an action NOT YET TAKEN may count on top of the unit's own (item 729; item 737; rules 1.13): Encore's, when
 * `a` repeats the unit's Encore action, and a Brief's. Inside a reducer action it is what is left of that action's
 * credit, whatever `a` is. The previews add it, so a repeat with too little AP isn't shown as "Needs N AP". */
export function creditFor(u: Unit | null | undefined, a: any, cb?: Combat | null): number {
  if (!u) return 0;
  if ((cb as any)?.acting) { const c = creditOf(cb, u); return c ? c.brief - c.briefUsed + c.encore - c.encoreUsed : 0; }
  if (!a) return 0; // no action named: only the unit's own AP counts (a reducer action is what opens a credit; an enemy's turn has none)
  const brief = a.type === 'combat/end-turn' ? 0 : briefCredit(u, cb); // rules 1.13: a Brief's discount
  const en = u.faith?.encore; if (!en || encoreKey(a) !== en.key) return brief; return (en.ap || 0) + brief;
}
/** Before a reducer action: open its credit (Encore's repeat, unless in a window; a Brief's cut). Returns it, or null. */
export function lend(cb: Combat, u: Unit, a: any): Credit | null {
  const inWindow = !!cb.window, en = u.faith?.encore;
  const encore = !inWindow && en && encoreKey(a) === en.key ? en.ap || 0 : 0, hasEncore = !inWindow && !!en && encoreKey(a) === en.key;
  const brief = inWindow || a?.type === 'combat/end-turn' || a?.type === 'combat/decline' ? 0 : briefCredit(u, cb);
  if (!hasEncore && !brief) return null;
  const c: Credit = { unit: u.id, brief, encore, briefUsed: 0, encoreUsed: 0, paid: 0 }; (c as any).hasEncore = hasEncore;
  (cb as any).credit = c; return c;
}
/** After it: close the credit. Returns what was used of each, and what the action cost in all (credit and own AP). */
export function settleCredit(cb: Combat, loan: Credit | null): { brief: number; encore: number; spent: number; hadEncore: boolean } | null {
  if ((cb as any).credit === loan) delete (cb as any).credit;
  if (!loan) return null;
  return { brief: loan.briefUsed, encore: loan.encoreUsed, spent: r10(loan.paid), hadEncore: !!(loan as any).hasEncore };
}
/** Drop an open credit without settling it (the action was refused). */
export const unlend = (cb: Combat | null | undefined) => { if (cb) delete (cb as any).credit; };

// ---------------------------------------------------------------------------------------------- can it be paid
/** THE refusal sentence for a resource the unit is short of. */
export const needs = (n: number, what = 'AP', left?: number) => 'Needs ' + n + ' ' + what + (left != null ? ' (' + left + ' left)' : '') + '.';
/** The same question for a pool that is not a unit's (the area map's round AP, g.story.ap): the sentence, or null.
 * o.left: say what is left ("Needs 2 AP (1 left)."). */
export const poolWhyNot = (have: number, n: number, o: { left?: boolean } = {}): string | null => (have < n ? needs(n, 'AP', o.left ? have : undefined) : null);
const FREE = new Set<Unit>();
const apOf = (p: Priced | number) => (typeof p === 'number' ? p : p.ap);
/** The AP the unit can put toward an action now: its own, and the credit that action carries. */
export const apFor = (cb: Combat | null | undefined, u: Unit, as?: any): number => (u.ap ?? 0) + creditFor(u, as, cb);
/** Why the unit can't pay this (the one sentence), or null: it can. o.as: the reducer action this is (Encore's key), for
 * a preview made outside the action; o.c: the character, for a resource kept there (stims, Echo). */
export function whyNot(cb: Combat | null | undefined, u: Unit, p: Priced | number, o: { as?: any; c?: Character | null } = {}): string | null {
  const ap = apOf(p);
  if (typeof p !== 'number') for (const [id, n] of Object.entries(p.res)) if (n > 0 && resLeft(u, id, o.c) < n) return needs(n, RESOURCES[id].name);
  if (ap > 0 && apFor(cb, u, o.as) < ap) return needs(ap);
  return null;
}
export const canPay = (cb: Combat | null | undefined, u: Unit, p: Priced | number, o: { as?: any; c?: Character | null } = {}): boolean => !whyNot(cb, u, p, o);

// ---------------------------------------------------------------------------------------------- pay, refund
/** Take the cost. AP comes first from the credit this action carries (a Brief's, then Encore's), then from the unit.
 * Returns the AP taken from the unit itself. */
export function pay(cb: Combat | null | undefined, u: Unit, p: Priced | number, o: { c?: Character | null } = {}): number {
  let due = apOf(p);
  const cr = FREE.has(u) ? null : creditOf(cb, u);
  if (cr && due > 0) {
    cr.paid += due;
    const b = Math.min(cr.brief - cr.briefUsed, due); cr.briefUsed += b; due -= b;
    const e = Math.min(cr.encore - cr.encoreUsed, due); cr.encoreUsed += e; due -= e;
  }
  if (due) (u as any).ap = r10(u.ap - due);
  if (typeof p !== 'number') for (const [id, n] of Object.entries(p.res)) if (n) resAdd(u, id, -n, o.c);
  return due;
}
/** Give a cost back: the AP to the unit (never to a credit), each resource to where it came from. */
export function refund(cb: Combat | null | undefined, u: Unit, p: Priced | number, o: { c?: Character | null } = {}): void {
  void cb; const ap = apOf(p);
  if (ap) (u as any).ap = r10(u.ap + ap);
  if (typeof p !== 'number') for (const [id, n] of Object.entries(p.res)) if (n) resAdd(u, id, n, o.c);
}

/** Take n of a resource NOW, outside an action's declared cost (a reaction's Guard, a rider's MP in a hook). false, and
 * nothing taken, when the unit has less. An action's own cost is declared instead (`res`), never spent in its run(). */
export function spend(u: Unit | null | undefined, id: string, n: number, c?: Character | null): boolean {
  if (n <= 0) return true; if (!u || resLeft(u, id, c) < n) return false;
  resAdd(u, id, -n, c); return true;
}

// ---------------------------------------------------------------------------------------------- AP given and set
/** AP given that is NOT perk AP (it does not count in the turn's +3): a Quicken, a Spark, the area map's round. Never
 * past o.max (default: the turn's ceiling, AP_MAX). Returns what was given. */
export function grantAp(cb: Combat | null | undefined, u: Unit, n: number, o: { max?: number } = {}): number {
  void cb; const was = u.ap, max = o.max ?? AP_MAX;
  (u as any).ap = n >= 0 ? Math.max(was, Math.min(max, r10(was + n))) : r10(was + n);
  return r10(u.ap - was);
}
/** AP taken that is not a payment (a penalty: Soft Hands, a fooled enemy): never below 0. Returns what was lost. */
export function loseAp(u: Unit, n: number): number { const was = u.ap; (u as any).ap = Math.max(0, r10(was - Math.max(0, n))); return r10(was - u.ap); }
/** SET the unit's AP: a turn's refill (turnAp's number), a lost turn (0), a window's pool, a unit just built. */
export function setAp(u: Unit, n: number): void { (u as any).ap = n; }
/** Run fn as an action made inside another at no AP: every check passes and nothing is taken. The unit's AP (and
 * banked tiles) are as they were afterwards; a credit is not drawn on. */
export function freely<T>(u: Unit, fn: () => T, o: { bank?: boolean } = {}): T {
  const keep = u.ap, bank = u.bank, was = FREE.has(u); (u as any).ap = 99; if (o.bank) u.bank = 999; FREE.add(u);
  try { return fn(); } finally { (u as any).ap = keep; if (o.bank) u.bank = bank; if (!was) FREE.delete(u); }
}
/** Run fn with the unit's AP set to n (a dry run: the planner, an enemy's intent), and put it back. */
export function withAp<T>(u: Unit, n: number, fn: () => T): T { const keep = u.ap; (u as any).ap = n; try { return fn(); } finally { (u as any).ap = keep; } }
