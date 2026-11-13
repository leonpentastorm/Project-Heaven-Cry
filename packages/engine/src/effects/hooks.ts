// The registry and hook dispatch (plan 2.3, 2.4). Lanes call register() from their own files under src/perks/ and
// src/classes/; the generic core-op handlers (core.ts) register through registerGeneric(). emit() walks units in
// cb.units order, then items in a fixed order (traits, perks, class moves), then handler priority: dispatch is
// deterministic.
import { addConditionRows, clearAddedConditions } from '../condtable';
import type { Character } from '../character';
import type { Combat, Unit } from '../combat';
import type { ActiveEffect, CheckMod, Holder, HookName, ItemHandler, ItemInfo, StatAnswer, ItemKind } from './types';
import type { StatId } from './stats';
import { type Held, itemsOf, heldKey, keyOf, heldAny, skillItemsOf, verbsOf, classMoveKeys, rawItem, _addRawItems, _clearRawItems } from './collect';

// ---------- the bound game (set by apply() for the length of one action) ----------
let G: any = null;
/** Bind a game state while one action runs, so handlers see h.g and h.c (the live character). Returns the previous one. */
export function bindGame(g: any): any { const was = G; G = g; return was; }
/** The game bound for this action (bindGame), or null: how items reach the characters. */
export const boundGame = (): any => G;

// ---------- registry ----------
const REG = new Map<string, ItemHandler>();
/** Register a lane's handler for one item. A second registration for the same item merges into the first (hooks and
 * actions add up; the later stat/checkMod/brief wins), so a lane can split an item across files. */
export function register(def: ItemHandler): void {
  const kind: ItemKind | undefined = def.kind || (def.id.includes('.') ? 'class' : undefined);
  const key = keyOf(def.id, kind), had = REG.get(key);
  if (!had) { REG.set(key, { ...def }); dirty(); return; }
  const on = { ...(had.on || {}) };
  for (const [k, fn] of Object.entries(def.on || {})) { const a = (on as any)[k]; (on as any)[k] = a ? (ctx: any, h: Holder) => { a(ctx, h); (fn as any)(ctx, h); } : fn; }
  REG.set(key, { ...had, ...def, on, actions: [...(had.actions || []), ...(def.actions || [])], toggles: [...(had.toggles || []), ...(def.toggles || [])],
    claims: mergeSel(had.claims, def.claims), narrator: mergeSel(had.narrator, def.narrator) });
  dirty();
}
const mergeSel = (a: any, b: any) => (a == null ? b : b == null ? a : (e: any, i: number, t: string) => sel(a, e, i, t) || sel(b, e, i, t));
/** The lane handler registered for this item key, if any. */
export const handlerOf = (key: string): ItemHandler | undefined => REG.get(key);
/** Every item key that has a lane handler. */
export const registered = () => [...REG.keys()];
/** For tests: take a copy of the lane registrations, and put a copy back (test helpers isolate runtime tests from lanes). */
export const _snapshotRegistry = () => new Map(REG);
/** Put back a registry saved by _snapshotRegistry (tests only). */
export function _restoreRegistry(snap: Map<string, ItemHandler>) { REG.clear(); for (const [k, v] of snap) REG.set(k, v); dirty(); }
/** Add items at run time (engine foundations 3): a mode's relics or new perks, a test's fixtures; plain data in the
 * shape of perks.json / traits.json items. They run on the generic runners only (no handler). */
export function addItems(kind: 'perk' | 'trait' | 'relic' | 'verb', items: any[]) { _addRawItems(kind, items); dirty(); }
/** For tests: forget the items added with addItems. */
export function clearAddedItems() { _clearRawItems(); dirty(); }
/** For tests: forget every lane registration (generic handlers stay). */
export function _unregisterAll(keep: (key: string) => boolean = () => false) { for (const k of [...REG.keys()]) if (!keep(k)) REG.delete(k); dirty(); }

/** A generic core-op handler: which effects it claims, and what it does for them. */
export interface GenericOp {
  op: string;
  claim(e: any, info: ItemInfo): boolean;
  stat?(h: Holder, e: any, stat: StatId, ctx: any): StatAnswer;
  on?: Partial<Record<HookName, (ctx: any, h: Holder, e: any) => void>>;
  checkMod?(h: Holder, e: any, ck: any, ctx: any): CheckMod[] | void;
  /** Run as part of an action's own effects (cleanse, shield, heal, condition…). Returns a log suffix, or null. */
  run?(h: Holder, e: any, args: any, rng: { state: number }): string | null;
  /** Can run() do this one inside an action? (Coverage counts an action whose effects all run as engine-run.) */
  runs?(e: any, info: ItemInfo): boolean;
}
const GEN = new Map<string, GenericOp>();

// ---------- item ops: triggered effects (engine foundations 3, effects/triggers.ts sets this at load) ----------
interface TriggerRunner { isTriggered(e: any): boolean; problem(e: any): string | null; hookOf(e: any): HookName | null; run(ctx: any, h: Holder, e: any): void;
  /** Classes 3.0 P4: the triggered effects of the conditions a unit bears on this hook, each with its row as an item and its giver. */
  conds?(u: Unit, name: HookName, cb: Combat): { info: ItemInfo; e: any; source: Unit | null }[] | null;
  /** The hooks the conditions' rows listen on. */ condHooks?(): string[];
  /** What the conditions a unit bears answer to a stat (a row's stat_mod of a declared stat no other path reads). */ condStat?(u: Unit, stat: string): number;
  /** The condition ids whose rows answer this stat (none: no condition can). */ condStatRows?(stat: string): string[];
  /** P5's standing aura: the units of a holder's set (effects/triggers.ts selectUnits, centred on the holder). */ auraSet?(cb: Combat, holder: Unit, targets: any): Unit[];
  /** Why a standing aura is malformed (null: fine). */ auraProblem?(e: any): string | null;
  /** P6: the first predicate of an `if` block that fails for this holder (and target), or null. */ ifFails?(h: Holder, cond: any, target?: Unit | null): string | null;
  /** P6: run item ops as an action's own effects, on a ctx shaped as `acted`'s. */ runOwn?(h: Holder, effects: any[], ctx: any): void;
  /** Is this op an item op (OPS)? */ isOp?(op: string): boolean }
let TR: TriggerRunner | null = null;
/** effects/triggers.ts registers the item-ops runner here as it loads (no import cycle). */
export function setTriggerRunner(r: TriggerRunner) { TR = r; dirty(); }
/** Does this effect run as a triggered item op (its `when` names a trigger and it is well formed)? */
const triggered = (e: any): boolean => !!TR && TR.isTriggered(e) && !TR.problem(e);
/** Add condition rows at run time (condtable.ts addConditionRows: a relic's own condition, a test's fixture); they are
 * items their bearer holds (Classes 3.0 P4). */
export function addConditions(rows: any[]): void { addConditionRows(rows); dirty(); }
/** Take the added condition rows away again. */
export function clearAddedConditionRows(): void { clearAddedConditions(); dirty(); }
/** Register the engine's generic handler of a core data op (effects/core.ts). */
export function registerGeneric(op: GenericOp) { GEN.set(op.op, op); dirty(); }
/** The generic handler of a core data op, if the engine has one. */
export const genericOf = (op: string) => GEN.get(op);

const sel = (s: any, e: any, i: number, t: string): boolean =>
  s == null ? false : s === 'all' ? true : typeof s === 'function' ? !!s(e, i, t) : Array.isArray(s) ? s.some((x: any) => (typeof x === 'number' ? x === i : x === e?.op)) : false;

/** Who runs one effect of an item: a lane handler, a generic op, the Narrator, the item's action, or nobody (a gap). */
export type Owner = 'handler' | 'generic' | 'narrator' | 'action' | 'gap';
/** Who runs one effect of one item: its lane's handler, a generic op, the Narrator (op narrator or listed), the item's
 * action (an active item's own effects, run when the action runs), or nobody yet (a gap: the Narrator gets the text). */
export function ownerOf(info: ItemInfo, i: number): Owner {
  const e = info.effects[i], h = REG.get(info.key), t = info.effTier[i] || info.tier;
  if (h && sel(h.claims, e, i, t)) return 'handler';
  if (h && sel(h.narrator, e, i, t)) return 'narrator';
  if (!e || e.op === 'narrator') return 'narrator';
  if (TR && TR.isTriggered(e)) return TR.problem(e) ? 'gap' : 'generic'; // an item op: the runner runs it, standing, even on an action item
  if (isAura(e)) return TR?.auraProblem?.(e) ? 'gap' : 'generic'; // a standing aura (P5): statQuery answers it for the units of its set
  if (e.op === 'grant_action') return h?.actions?.length ? 'handler' : 'action';
  const g = GEN.get(e.op);
  if (info.bound) {
    // An action's own effects run with it: engine-run when a generic runner can do them (or a lane registered the action).
    if (h?.actions?.length) return 'handler';
    return g?.runs && g.runs(e, info) ? 'generic' : 'action';
  }
  if (g && g.claim(e, info)) return 'generic';
  return 'gap';
}

// ---------- holders and the per-holder dispatch index ----------
interface Slot { info: ItemInfo; fn: (ctx: any, h: Holder) => void; prio: number }
const indexCache = new Map<string, Record<string, Slot[]>>();
let version = 0;
function dirty() { version++; indexCache.clear(); listened.clear(); TH = null; AURA_ANY = null; AURAS.clear(); STAT_ANY?.clear(); }
const listened = new Map<string, boolean>();
/** Does anything at all listen on this hook (an item's handler, a generic op, an engine system)? A hook that every
 * action passes through (the `cost` hook) asks this first, so it costs nothing until somebody uses it. */
export function hookUsed(name: HookName): boolean {
  let v = listened.get(name);
  if (v == null) {
    v = !!GLOBAL_HOOKS[name]?.length;
    if (!v) for (const h of REG.values()) if (h.on && (h.on as any)[name]) { v = true; break; }
    if (!v) for (const g of GEN.values()) if (g.on && (g.on as any)[name]) { v = true; break; }
    if (!v && TR) v = triggerHooks().has(name);
    listened.set(name, v);
  }
  return v;
}
/** A number that changes whenever handlers or items change (caches key on it). */
export const registryVersion = () => version;
/** The hooks the data's item ops listen on (every item, and any added by addItems). */
let TH: Set<string> | null = null;
function triggerHooks(): Set<string> {
  if (TH) return TH;
  TH = new Set();
  for (const info of allItemsHook ? allItemsHook() : []) for (const e of info.effects) { const k = TR?.isTriggered(e) ? TR.hookOf(e) : null; if (k) TH.add(k); }
  for (const k of TR?.condHooks?.() || []) TH.add(k); // P4: a condition's row is an item too
  return TH;
}
let allItemsHook: (() => ItemInfo[]) | null = null;
/** collect.ts gives the registry its list of every item (kept there to avoid an import cycle). */
export const setAllItems = (f: () => ItemInfo[]) => { allItemsHook = f; TH = null; listened.clear(); AURA_ANY = null; STAT_ANY?.clear(); };

function buildIndex(held: Held): Record<string, Slot[]> {
  const k = heldKey(held), hit = indexCache.get(k); if (hit) return hit;
  const idx: Record<string, Slot[]> = {};
  const add = (name: string, s: Slot) => (idx[name] ||= []).push(s);
  for (const info of itemsOf(held)) {
    const h = REG.get(info.key);
    if (h?.on) for (const [name, fn] of Object.entries(h.on)) if (fn) add(name, { info, fn: fn as any, prio: h.priority ?? 100 });
    // item ops (effects/triggers.ts): on their trigger's hook, at the effect's priority (default 100, a handler's)
    info.effects.forEach((e, i) => { if (triggered(e) && ownerOf(info, i) === 'generic') add(TR!.hookOf(e)!, { info, fn: (ctx, hh) => TR!.run(ctx, hh, e), prio: typeof e.priority === 'number' ? e.priority : 100 }); });
    if (info.bound) continue; // an action's own effects run with the action, not as standing passives
    info.effects.forEach((e, i) => {
      if (ownerOf(info, i) !== 'generic' || triggered(e) || isAura(e)) return;
      const g = GEN.get(e.op); if (!g?.on) return;
      for (const [name, fn] of Object.entries(g.on)) if (fn) add(name, { info, fn: (ctx, hh) => (fn as any)(ctx, hh, e), prio: 200 });
    });
  }
  for (const list of Object.values(idx)) list.sort((a, b) => a.prio - b.prio); // stable: item order kept within a priority
  if (indexCache.size > 400) indexCache.clear();
  indexCache.set(k, idx);
  return idx;
}

/** What a character holds (the compact form). Rank comes from the class rules; see character.ts classRank. */
export function heldOfChar(c: Character | null | undefined): Held {
  if (!c) return { perks: [], traits: [] };
  const sk = skillItemsOf(c.skills), rank = rankHook ? rankHook(c) : 1, vb = verbsOf({ skills: c.skills, cls: c.classId || null, rank }); // P6: the door verbs its sheet reaches
  return { perks: (c.perks || []).map((p) => ({ id: p.id, tier: p.tier })), traits: [...(c.traits || [])], cls: c.classId || null, rank, adv: c.advancedClass || null, ...(sk.length ? { skills: sk } : {}), ...(c.relics?.length ? { relics: [...c.relics] } : {}), ...(vb.length ? { verbs: vb } : {}) };
}
let rankHook: ((c: Character) => number) | null = null;
/** character.ts gives the runtime its class-rank rule (kept there to avoid an import cycle). */
export const setRankRule = (f: (c: Character) => number) => { rankHook = f; };

/** The effect op that lays a Grand form (a Sigil word's `grand`; rules 1.4; effect_ops.json). Which move carries it is
 *  the data's (classes.json: today the Grand Sigilist's Enlarge), never a name typed here. */
export const GRAND_FORM_OP = 'grand_form';
/** Can this character lay Grand forms? Only while it holds a move whose effects lay one, through a class that is
 *  active: while the advanced classes are shelved, nobody can, so a screen shows no Grand form (Leon, live 0.24.0). */
export const canLayGrandForms = (c: Character | null | undefined): boolean => !!c && classMoveKeys(heldOfChar(c)).some((m) => ((rawItem(m.key)?.effects || []) as any[]).some((e) => e && e.op === GRAND_FORM_OP));
/** What a unit holds (perks, traits, class moves): its own list, else its character's. */
export const heldOfUnit = (u: Unit | null | undefined): Held => (u?.held ? u.held : u?.charId && G?.characters?.[u.charId] ? heldOfChar(G.characters[u.charId]) : { perks: [], traits: [] });
/** The character behind a unit in the bound game, or null (an enemy, a thing). */
export const charOfUnit = (u: Unit | null | undefined): Character | null => (u?.charId && G?.characters?.[u.charId]) || null;

function holder(info: ItemInfo, c: Character | null, u: Unit | null, cb: Combat | null): Holder {
  return { key: info.key, itemId: info.id, kind: info.kind, tier: info.tier, info, c, u, cb, g: G };
}
/** Holders of every item a unit or character has (traits, perks, class moves), in order. */
export function holdersOf(x: { u?: Unit | null; c?: Character | null; cb?: Combat | null }): Holder[] {
  const c = x.c ?? charOfUnit(x.u), held = x.u ? heldOfUnit(x.u) : heldOfChar(c);
  return itemsOf(held).map((i) => holder(i, c, x.u || null, x.cb || null));
}
/** One item's holder, if this unit or character holds it. */
export function holderOf(x: { u?: Unit | null; c?: Character | null; cb?: Combat | null }, idOrKey: string): Holder | null {
  const key = keyOf(idOrKey); return holdersOf(x).find((h) => h.key === key) || null;
}

// ---------- emit ----------
/** Step a7 (leak 4): a blast, a splash, a trap and a thrown item fire 'damage_out' too when someone made them
 * (ctx.blast, ctx.kind: 'explosion' | 'trap' | 'thrown'), but an item speaks about them only when its data says so
 * (`damage_kinds`): every item written before then keeps meaning weapon attacks and spells, so nothing moved by itself. */
const speaksOfBlast = (info: ItemInfo, kind: string): boolean => { const k = info.damageKinds; return !!k && (k.includes('blast') || k.includes('all') || k.includes(kind)); };
/** Fire a combat hook: every unit's handlers in cb.units order (an ally's or an enemy's items may react). */
export function emit(cb: Combat | null | undefined, name: HookName, ctx: any): any {
  if (!cb) return ctx;
  const blast = name === 'damage_out' && !!ctx?.blast;
  for (const u of cb.units) {
    // P4: the conditions it bears run their rows' item ops after its items (nothing to do for most units: TR.conds is null)
    const cl = TR?.conds?.(u, name, cb) || null;
    const held = heldOfUnit(u); if (!heldAny(held) && !cl) continue;
    const list = heldAny(held) ? buildIndex(held)[name] : null; if (!list && !cl) continue;
    const c = charOfUnit(u);
    if (list) for (const s of list) { if (blast && !speaksOfBlast(s.info, ctx.kind)) continue; s.fn(ctx, holder(s.info, c, u, cb)); if (ctx && ctx.stop) return ctx; }
    if (cl) for (const x of cl) { if (blast && !speaksOfBlast(x.info, ctx.kind)) continue; TR!.run(ctx, { ...holder(x.info, c, u, cb), source: x.source }, x.e); if (ctx && ctx.stop) return ctx; }
  }
  const gl = GLOBAL_HOOKS[name]; if (gl) for (const f of gl) { f(ctx, cb); if (ctx && ctx.stop) return ctx; }
  return ctx;
}
/** Fire a hook for ONE unit's own items, with no fight in reach (a price asked for a row before a fight is known). */
export function emitOwn(u: Unit, name: HookName, ctx: any): any {
  const held = heldOfUnit(u); if (!heldAny(held)) return ctx;
  const list = buildIndex(held)[name]; if (!list) return ctx;
  const c = charOfUnit(u);
  for (const s of list) { s.fn(ctx, holder(s.info, c, u, null)); if (ctx && ctx.stop) return ctx; }
  return ctx;
}
// ---------- engine systems that aren't items (rules 1.6: faith.ts) ----------
// Faith isn't something a character holds, so it can't sit in the items' index: these listeners run on every fight's
// hooks after the items, and add to stat and check queries. Registered once at load; deterministic like the items.
type GlobalHook = (ctx: any, cb: Combat) => void;
const GLOBAL_HOOKS: Partial<Record<HookName, GlobalHook[]>> = {};
const GLOBAL_STATS: Record<string, ((x: { u?: Unit | null; c?: Character | null; cb?: Combat | null }, ctx: any) => number)[]> = {};
const GLOBAL_CHECKS: ((x: { u?: Unit | null; c?: Character | null; cb?: Combat | null }, ck: any, ctx: any) => CheckMod[])[] = [];
/** An engine system (not an item) listens on a combat hook; it runs after every unit's items. */
export function onHook(name: HookName, fn: GlobalHook) { (GLOBAL_HOOKS[name] ||= []).push(fn); listened.delete(name); }
/** An engine system (not an item) answers a stat query. */
export function onStat(stat: StatId, fn: (x: { u?: Unit | null; c?: Character | null; cb?: Combat | null }, ctx: any) => number) { (GLOBAL_STATS[stat] ||= []).push(fn); }
/** An engine system (not an item) adds modifiers to d20 checks. */
export function onCheck(fn: (x: { u?: Unit | null; c?: Character | null; cb?: Combat | null }, ck: any, ctx: any) => CheckMod[]) { GLOBAL_CHECKS.push(fn); }
const GLOBAL_STORY: Partial<Record<HookName, ((ctx: any, g: any) => void)[]>> = {};
/** A story hook for an engine system (no item): runs after the characters' items, with the game. */
export function onStoryHook(name: HookName, fn: (ctx: any, g: any) => void) { (GLOBAL_STORY[name] ||= []).push(fn); }
/** Fire a story hook for characters (all of them in g.characters order, or the ones given). */
export function emitStory(g: any, name: HookName, ctx: any, only?: Character[]): any {
  const chars: Character[] = only || Object.values(g?.characters || {});
  const was = G; if (g) G = g;
  try {
    for (const c of chars) {
      const list = buildIndex(heldOfChar(c))[name]; if (!list) continue;
      for (const s of list) { s.fn(ctx, holder(s.info, c, null, null)); if (ctx && ctx.stop) return ctx; }
    }
    for (const f of GLOBAL_STORY[name] || []) { f(ctx, g); if (ctx && ctx.stop) return ctx; } // engine systems (faith.ts)
  } finally { G = was; }
  return ctx;
}
/** Does anyone in this fight have a handler on this hook? (Lets costly payloads be skipped: sight diffs.) */
export function anyOn(cb: Combat | null | undefined, name: HookName): boolean {
  return !!cb && cb.units.some((u) => { const h = heldOfUnit(u); return heldAny(h) && !!buildIndex(h)[name]; });
}

/** Is anything in this fight able to answer this data stat (a condition a unit bears whose row has its stat_mod, an item
 * a unit holds with a stat_mod of it, an engine system's answer)? The gate before a costly per-unit stat query in a hot
 * path (Classes 3.0 P7: `always_seen` in the fog and the AI's sight): a fight with none pays nothing. Lane handlers'
 * own `stat` answers are not counted: a gated stat is a data stat. */
export function statHeard(cb: Combat | null | undefined, stat: StatId): boolean {
  if (!cb) return false;
  if (GLOBAL_STATS[stat]?.length) return true;
  // the fast way out (it is asked on every sight test): nothing in the data, nor added at run time, answers it at all
  let any = STAT_ANY.get(stat);
  if (any == null) { any = !!(TR?.condStatRows?.(stat) || []).length || (allItemsHook ? allItemsHook() : []).some((i) => i.effects.some((e) => e?.op === 'stat_mod' && e.stat === stat)); STAT_ANY.set(stat, any); }
  if (!any) return false;
  const rows = TR?.condStatRows?.(stat) || [];
  for (const u of cb.units) {
    if (rows.length && TR!.condStat!(u, stat)) return true;
    const held = heldOfUnit(u); if (!heldAny(held)) continue;
    const k = heldKey(held) + '#' + stat; let v = STAT_HELD.get(k);
    if (v == null) { v = itemsOf(held).some((i) => i.effects.some((e) => e?.op === 'stat_mod' && e.stat === stat)); if (STAT_HELD.size > 400) STAT_HELD.clear(); STAT_HELD.set(k, v); }
    if (v) return true;
  }
  return false;
}
const STAT_HELD = new Map<string, boolean>();
/** Per stat: does anything in the data (an item's stat_mod, a condition row) answer it at all? Cleared when items change. */
const STAT_ANY = new Map<string, boolean>();

/** P6: the first predicate of an `if` block that fails for this holder (and its action's target), or null (it holds;
 * outside a fight, or before the runner is loaded, nothing is tested). */
export const ifFails = (h: Holder, cond: any, target?: Unit | null): string | null => (cond && TR?.ifFails && h.u && h.cb ? TR.ifFails(h, cond, target) : null);
/** P6: run a door verb's nested item ops as its action's own effects (a ctx shaped as `acted`'s). */
export const runOwnEffects = (h: Holder, effects: any[], ctx: any): void => { TR?.runOwn?.(h, effects, ctx); };
/** Is this effect's op one of the item ops' closed list (effects/triggers.ts OPS)? */
export const isItemOp = (e: any): boolean => !!e && !!TR?.isOp?.(e.op);

// ---------- standing auras (Classes 3.0 P5, the step 1a review's form; the lead's ruling, 13 Nov 2026) ----------
/** A standing aura: `{ "op": "stat_mod", "stat": <any declared stat>, "value": n, "targets": {…} }` with no `when`. While
 * its holder stands (not Downed, dead or surrendered), statQuery answers `value` to every unit of the set (centred on
 * the holder: `targets.of` is self), and not to the holder unless the set holds it. Gated: a fight pays nothing until an
 * item in the data or added at run time carries one. */
export const isAura = (e: any): boolean => !!e && e.op === 'stat_mod' && !e.when && e.targets != null && typeof e.value === 'number';
let AURA_ANY: boolean | null = null;
const AURAS = new Map<string, { e: any }[]>();
/** The standing auras a holder's items carry (cached on what it holds). */
function aurasOf(u: Unit): { e: any }[] {
  const held = heldOfUnit(u); if (!heldAny(held)) return [];
  const k = heldKey(held); let v = AURAS.get(k);
  if (!v) { v = []; for (const info of itemsOf(held)) info.effects.forEach((e, i) => { if (isAura(e) && ownerOf(info, i) === 'generic') v!.push({ e }); }); if (AURAS.size > 400) AURAS.clear(); AURAS.set(k, v); }
  return v;
}
let IN_AURA = false;
/** What the standing auras of every unit in this fight give this unit for this stat. */
function auraStat(u: Unit, stat: string, cb: Combat): number {
  if (AURA_ANY == null) AURA_ANY = (allItemsHook ? allItemsHook() : []).some((i) => i.effects.some(isAura));
  if (!AURA_ANY || IN_AURA || !TR?.auraSet) return 0;
  IN_AURA = true; // an aura's set never asks an aura (a `seen` filter asks sight, which asks always_seen)
  try {
    let n = 0;
    for (const h of cb.units) {
      if (h.dead || h.downed || h.surrendered) continue;
      for (const a of aurasOf(h)) if (a.e.stat === stat && TR.auraSet(cb, h, a.e.targets).includes(u)) n += a.e.value;
    }
    return n;
  } finally { IN_AURA = false; }
}

// ---------- stat and check queries ----------
/** Sum of every item's answer to a stat query (stat handlers, then generic stat effects). mult multiplies. */
export function statQuery(x: { u?: Unit | null; c?: Character | null; cb?: Combat | null }, stat: StatId, ctx: any = {}): { add: number; mult: number } {
  let add = 0, mult = 1;
  for (const f of GLOBAL_STATS[stat] || []) add += f(x, ctx) || 0; // engine systems (faith.ts)
  if (x.u && TR?.condStat) add += TR.condStat(x.u, stat); // P4: the conditions the unit bears (their rows' stat_mod)
  { const cb = x.cb ?? G?.combat; if (x.u && cb && x.u.pos) add += auraStat(x.u, stat, cb); } // P5: the standing auras it stands in (the fight asked, else the bound game's)
  const c = x.c ?? charOfUnit(x.u), held = x.u && !x.c ? heldOfUnit(x.u) : heldOfChar(c);
  if (!heldAny(held)) return { add, mult };
  for (const info of itemsOf(held)) {
    const h = REG.get(info.key), hh = holder(info, c, x.u || null, x.cb || null);
    if (h?.stat) take(h.stat(hh, stat, ctx));
    if (info.bound) continue;
    info.effects.forEach((e, i) => { const g = GEN.get(e?.op); if (g?.stat && ownerOf(info, i) === 'generic' && !triggered(e) && !isAura(e)) take(g.stat(hh, e, stat, ctx)); });
  }
  return { add, mult };
  function take(r: StatAnswer) { if (r == null) return; if (typeof r === 'number') add += r; else { add += r.add || 0; mult *= r.mult ?? 1; } }
}
/** Modifiers to one d20 check from every item (handler checkMod, then generic skill and roll mods). */
export function checkQuery(x: { u?: Unit | null; c?: Character | null; cb?: Combat | null }, ck: any, ctx: any = {}): CheckMod[] {
  const out: CheckMod[] = [], c = x.c ?? charOfUnit(x.u), held = x.u && !x.c ? heldOfUnit(x.u) : heldOfChar(c);
  for (const f of GLOBAL_CHECKS) out.push(...(f(x, ck, ctx) || [])); // engine systems (faith.ts)
  for (const info of itemsOf(held)) {
    const h = REG.get(info.key), hh = holder(info, c, x.u || null, x.cb || null);
    if (h?.checkMod) out.push(...(h.checkMod(hh, ck, ctx) || []));
    if (info.bound) continue;
    info.effects.forEach((e, i) => { const g = GEN.get(e?.op); if (g?.checkMod && ownerOf(info, i) === 'generic' && !triggered(e)) out.push(...(g.checkMod(hh, e, ck, ctx) || [])); });
  }
  return out.filter((m) => m && m.add);
}
/** Every effect of every item a holder has whose owner is a generic op (for the generic handlers' own queries). */
export function genericEffects(x: { u?: Unit | null; c?: Character | null }, op: string): { e: any; info: ItemInfo }[] {
  const c = x.c ?? charOfUnit(x.u), held = x.u && !x.c ? heldOfUnit(x.u) : heldOfChar(c), out: { e: any; info: ItemInfo }[] = [];
  for (const info of itemsOf(held)) { if (info.bound) continue; info.effects.forEach((e, i) => { if (e?.op === op && ownerOf(info, i) === 'generic' && !triggered(e)) out.push({ e, info }); }); }
  return out;
}
export type { ActiveEffect };
