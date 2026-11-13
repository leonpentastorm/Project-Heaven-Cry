// Collecting a holder's active effects (plan 2.2): traits, perks at their tier (Mastered, Achieved and Ultimate
// included), and class moves by rank (base classes) or all at once (an advanced class). Built like gearEffects in
// character.ts; memoised per holder on what it holds.
import '../datatext'; // fills the texts' {=placeholders} before any data is read
import { PERK, PERKS, TRAITS, CLASSES, SKILL, CLASS_MOVE_POOL } from '../data';
import classesJ from '../../../../data/classes.json';
import type { ItemInfo, ItemKind, Tier, ActiveEffect } from './types';

const TRAIT: Record<string, any> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));
// ---------- items added at run time (engine foundations 3) ----------
// A mode's own items (a roguelike's relics and its new perks) and a test's fixtures: plain data in the same shape as
// perks.json / traits.json items (a relic is shaped like a trait: id, name, text, effects). They are written in data
// only: their effects run through the generic runners (effects/triggers.ts for `when`). hooks.ts addItems() is the door
// (it also tells the dispatch that the list changed).
const EXTRA: Record<'perk' | 'trait' | 'relic', Record<string, any>> = { perk: {}, trait: {}, relic: {} };
/** Add (or replace) items of a kind. Use effects/hooks.ts addItems, which also refreshes the dispatch. */
export function _addRawItems(kind: 'perk' | 'trait' | 'relic', items: any[]) { for (const x of items) EXTRA[kind][x.id] = x; infoCache.clear(); itemsCache.clear(); }
/** Forget every item added at run time (tests). */
export function _clearRawItems() { for (const k of Object.keys(EXTRA) as (keyof typeof EXTRA)[]) EXTRA[k] = {}; infoCache.clear(); itemsCache.clear(); }
const perkData = (id: string): any => (PERK as any)[id] || EXTRA.perk[id];
const traitData = (id: string): any => TRAIT[id] || EXTRA.trait[id];
const ADV: any[] = (classesJ as any).advanced || [];
export const ADVANCED: Record<string, any> = Object.fromEntries(ADV.map((a) => [a.id, a]));
export const BASE_CLASS: Record<string, any> = Object.fromEntries(CLASSES.map((k) => [k.id, k]));
const RANKS = ['I', 'II', 'III'] as const;

// ---------- advanced classes are shelved (Class Roster Revision 3) ----------
// While classes.json assignment.advanced.live is false, an advanced class a character holds gives nothing: no moves,
// resources or effects (the field stays in the save so it can come back). A class whose entry has `shelved: false`
// would come back on its own once live is on. Tests that exercise the advanced moves' handlers turn them on with
// _setAdvancedLive(true) (a test-only switch).
const ADV_LIVE_DATA = !!(classesJ as any).assignment?.advanced?.live;
let advOverride: boolean | null = null;
/** Is this advanced class active right now (its moves, resources and effects count)? */
export function advancedActive(id: string | null | undefined): boolean {
  if (!id || !ADVANCED[id]) return false;
  if (advOverride != null) return advOverride;
  return ADV_LIVE_DATA && !ADVANCED[id].shelved;
}
/** Test-only: turn every advanced class on (true), off (false), or back to the data (null). */
export function _setAdvancedLive(on: boolean | null) { advOverride = on; itemsCache.clear(); }

// ---------- the Revision 2 classes, for tests only ----------
// The engine tests written for Class Roster Revision 2 (a Warden's Ward, an Assassin's Mark at rank I) keep running the
// pool moves' handlers through the 13 old class shells (classes.json move_pool.revision_2_classes): with the switch on,
// a class id resolves to its Revision 2 moves by origin and old rank, and the rank reads the old signature totals
// (13 / 18). Never on in play.
export const REV2_CLASSES: Record<string, { id: string; name: string; core: string; signature: string[]; resources: string[] }> =
  Object.fromEntries((((classesJ as any).move_pool?.revision_2_classes || []) as any[]).map((k) => [k.id, k]));
let rev2 = false;
export const revision2Classes = () => rev2;
/** Test-only: hold the Revision 2 classes (true) or the Revision 3 ones (false, the default). */
export function _setRevision2Classes(on: boolean) { rev2 = on; itemsCache.clear(); }

const isAction = (effects: any[], ap: any, perkType?: string | null) =>
  effects.some((e) => e && e.op === 'grant_action') || (typeof ap === 'number' && ap > 0) || (typeof ap === 'string' && !!ap) || perkType === 'active_skill';

/** What a held perk's tier gives: Tier I, or Tier II alone when it replaces Tier I, else I then II. */
export function perkEffects(id: string, tier: string): { effects: any[]; effTier: string[] } {
  const p: any = perkData(id); if (!p) return { effects: [], effTier: [] };
  if (!p.tiers) return { effects: [...(p.effects || [])], effTier: (p.effects || []).map(() => tier) };
  const I = p.tiers.I?.effects || [], II = p.tiers.II?.effects || [];
  if (tier === 'II') return p.tiers.II?.replaces_tier_I ? { effects: [...II], effTier: II.map(() => 'II') } : { effects: [...I, ...II], effTier: [...I.map(() => 'I'), ...II.map(() => 'II')] };
  return { effects: [...I], effTier: I.map(() => 'I') };
}

const infoCache = new Map<string, ItemInfo | null>();
/** One item at one tier, from the data. key: "perk:<id>", "trait:<id>", "class:<classId>.<moveId>". */
export function itemInfo(key: string, tier?: Tier | string): ItemInfo | null {
  const ck = key + '@' + (tier || ''); if (infoCache.has(ck)) return infoCache.get(ck)!;
  const out = buildInfo(key, tier);
  if (out) { const dk = rawItem(key)?.damage_kinds; if (Array.isArray(dk)) out.damageKinds = dk.map(String); liftActed(out); }
  infoCache.set(ck, out); return out;
}
/** Classes 3.0 P2: a grant_action's nested effects written `when: "acted"` are the item's own triggered effects, each
 * with `if.action` = that action's id unless it names one (sugar: Ward's mend needs no `if: {action: ["ward"]}`). They
 * are appended after the item's own effects (the indexes of those stay), and the default action does not run them. */
function liftActed(info: ItemInfo): void {
  const add: any[] = [];
  info.effects.forEach((g, i) => {
    if (g?.op !== 'grant_action' || !Array.isArray(g.effects)) return;
    for (const e of g.effects) if (e && e.when === 'acted') add.push({ ...e, if: { action: [g.action || 'use' + i], ...(e.if || {}) } });
  });
  if (!add.length) return;
  const tier = info.effTier[info.effTier.length - 1] ?? info.tier;
  info.effects = [...info.effects, ...add]; info.effTier = [...info.effTier, ...add.map(() => tier)];
}
function buildInfo(key: string, tier?: string): ItemInfo | null {
  const [kind, id] = splitKey(key);
  if (kind === 'perk') {
    const p: any = perkData(id); if (!p) return null;
    const t = (tier || (p.tier === 'acquired' ? 'I' : p.tier)) as Tier, { effects, effTier } = perkEffects(id, t);
    const ap = (t === 'II' ? p.tiers?.II?.ap_cost : p.tiers?.I?.ap_cost) ?? p.ap_cost ?? null;
    return { key, kind, id, name: p.name, tier: t, effects, effTier, text: p.text || '', adjudication: p.adjudication || 'engine', active: isAction(effects, ap, p.perk_type), bound: isAction(effects, ap, p.perk_type), ap, uses: p.uses || 'at_will', provisional: !!p.provisional };
  }
  if (kind === 'relic') {
    const x = EXTRA.relic[id]; if (!x) return null;
    const effects = [...(x.effects || [])];
    return { key, kind, id, name: x.name, tier: 'trait', effects, effTier: effects.map(() => 'relic'), text: x.text || '', adjudication: x.adjudication || 'engine', active: false, bound: false, ap: null, uses: 'at_will', provisional: !!x.provisional };
  }
  if (kind === 'trait') {
    const x = traitData(id); if (!x) return null;
    const effects = [...(x.effects || [])];
    const text = [...(x.upsides || []).map((s: string) => '+ ' + s), ...(x.downsides || []).map((s: string) => '− ' + s)].join(' ') || x.text || '';
    return { key, kind, id, name: x.name, tier: 'trait', effects, effTier: effects.map(() => 'trait'), text, adjudication: x.adjudication || 'engine', active: isAction(effects, null), bound: false, ap: null, uses: 'at_will', provisional: !!x.provisional };
  }
  if (kind === 'skill') {
    // A skill's Mastery unlock (skills.json unlocks; key "skill:<skillId>.<points>"). Its perk_choice (the perk step) is
    // the character's own pick, not an effect of the item, so it is left out.
    const [sid, lvl] = id.split('.'), x: any = (SKILL[sid] as any)?.unlocks?.[lvl]; if (!x) return null;
    const effects = (x.effects || []).filter((e: any) => e?.op !== 'perk_choice');
    const ap = effects.find((e: any) => e?.op === 'grant_action')?.ap ?? null;
    return { key, kind, id, name: x.name, tier: 'I', effects, effTier: effects.map(() => 'I'), text: x.text || '', adjudication: x.adjudication || 'engine', active: isAction(effects, ap), bound: isAction(effects, ap), ap, uses: effects.find((e: any) => e?.op === 'grant_action')?.uses || 'at_will', provisional: !!x.provisional };
  }
  if (kind === 'class') {
    const [cls, mv] = id.split('.'); const found = classMove(cls, mv); if (!found) return null;
    const { move } = found, rank = (tier as string) || found.rank, effects = [...(move.effects || [])];
    return { key, kind, id, name: move.name, tier: rank as Tier, effects, effTier: effects.map(() => rank), text: move.text || '', adjudication: move.adjudication || 'engine', active: isAction(effects, move.ap_cost), bound: isAction(effects, move.ap_cost),
      ap: move.ap_cost ?? null, uses: move.uses || 'at_will', classId: cls, rank, provisional: !!move.provisional };
  }
  return null;
}
/** A class move by its key's parts ("class:<cls>.<mv>"): a new Revision 3 move under its class, or a pool or advanced
 * move under its origin (its old key, whichever class names it now). rank: the rank a base class lists it at, else the
 * pool move's old rank, else 'adv'. */
export function classMove(cls: string, mv: string): { move: any; rank: string } | null {
  const key = 'class:' + cls + '.' + mv;
  for (const b of CLASSES as any[]) for (const r of RANKS) { const m = (b.ranks?.[r]?.moves || []).find((x: any) => x.key === key); if (m) return { move: m, rank: r }; }
  for (const b of CLASSES as any[]) { const m = (b.gain || []).find((x: any) => x.key === key); if (m) return { move: m, rank: 'I' }; } // held from class gain (Reflex, rules 1.30)
  const p = CLASS_MOVE_POOL[cls + '.' + mv]; if (p) return { move: p, rank: ADVANCED[cls] ? 'adv' : p.origin_rank || 'I' };
  return null;
}
/** The data object behind an item's key (perks.json, traits.json, a skill's unlock, a class move), or null. */
export function rawItem(key: string): any | null {
  const [kind, id] = splitKey(key);
  if (kind === 'perk') return perkData(id) || null;
  if (kind === 'trait') return traitData(id) || null;
  if (kind === 'relic') return EXTRA.relic[id] || null;
  if (kind === 'skill') { const [sid, lvl] = id.split('.'); return (SKILL[sid] as any)?.unlocks?.[lvl] || null; }
  if (kind === 'class') { const [cls, mv] = id.split('.'); return classMove(cls, mv)?.move || null; }
  return null;
}
export function splitKey(key: string): [ItemKind, string] {
  const i = key.indexOf(':'); if (i < 0) return [guessKind(key), key];
  return [key.slice(0, i) as ItemKind, key.slice(i + 1)];
}
const guessKind = (id: string): ItemKind => (perkData(id) ? 'perk' : traitData(id) ? 'trait' : EXTRA.relic[id] ? 'relic' : SKILL_ITEMS.includes(id) ? 'skill' : id.includes('.') ? 'class' : 'perk');
/** "bulwark" → "perk:bulwark"; "gambler" → "trait:gambler"; "marksman.killzone" → "class:marksman.killzone"; keys pass through. */
export const keyOf = (idOrKey: string, kind?: ItemKind) => (idOrKey.includes(':') ? idOrKey : (kind || guessKind(idOrKey)) + ':' + idOrKey);

/** What a holder holds, the compact form a Unit carries (u.fx) and the collector reads. skills: the skill unlocks it has
 * reached ("brain_power.3"), only those in SKILL_ITEMS. */
export interface Held { perks: { id: string; tier: string }[]; traits: string[]; cls?: string | null; rank?: number; adv?: string | null; skills?: string[]; relics?: string[] }
/** Skill Mastery unlocks the runtime runs as items (perk-runtime H4): key "skill:<skillId>.<points>". The rest of the
 * skills' unlocks are perk steps (perk_choice) or the Narrator's (their text reaches it through the skill's card). */
export const SKILL_ITEMS = ['brain_power.3', 'brain_power.5', 'rumination.5', 'visualization.5', 'will_power.3', 'will_power.5',
  // rules 1.13 (perks/skeleton.ts): Heavy Hands, Follow Through, Quick Draw, Tuned, Hand-Off, Stand Still
  'raw_power.3', 'raw_power.5', 'dexterity.5', 'proficiency.5', 'camaraderie.3', 'composure.5'];
/** The skill items a character's points reach. */
export const skillItemsOf = (skills: Record<string, number> | null | undefined): string[] =>
  SKILL_ITEMS.filter((k) => { const [sid, lvl] = k.split('.'); return (skills?.[sid] || 0) >= +lvl; });
/** Does a holder hold anything at all (a quick skip for dispatch)? */
export const heldAny = (h: Held) => !!(h.perks.length || h.traits.length || h.cls || advancedActive(h.adv) || h.skills?.length || h.relics?.length);

/** Class moves a holder has: base class moves up to its rank, and every move of its advanced class. */
export function classMoveKeys(h: Held): { key: string; rank: string }[] {
  const out: { key: string; rank: string }[] = [];
  if (rev2 && h.cls && REV2_CLASSES[h.cls]) {
    const n = Math.max(1, Math.min(3, h.rank || 1));
    for (const m of Object.values(CLASS_MOVE_POOL)) if (m.origin === h.cls && !ADVANCED[m.origin] && RANKS.indexOf(m.origin_rank) < n) out.push({ key: 'class:' + m.origin + '.' + m.id, rank: m.origin_rank });
  }
  const b = h.cls && !rev2 ? BASE_CLASS[h.cls] : null;
  // A rank's moves keep their own keys: Bard's Triage is "class:medic.triage", so the Medic's handler runs it.
  if (b) RANKS.slice(0, Math.max(1, Math.min(3, h.rank || 1))).forEach((r) => (b.ranks?.[r]?.moves || []).forEach((m: any) => out.push({ key: m.key, rank: r })));
  // A class's `gain` (rules 1.30: the Skirmisher's Reflex) is held (after them) from class gain, beside the six moves, at rank I.
  if (b) (b.gain || []).forEach((m: any) => out.push({ key: m.key, rank: 'I' }));
  const a = h.adv && advancedActive(h.adv) ? ADVANCED[h.adv] : null;
  if (a) (a.moves || []).forEach((m: any) => out.push({ key: 'class:' + a.id + '.' + m.id, rank: 'adv' }));
  return out;
}

/** Every item a holder has, in a fixed order (traits, perks, class moves), at its tier. */
export function itemsOf(h: Held): ItemInfo[] {
  const k = heldKey(h), hit = itemsCache.get(k); if (hit) return hit;
  const out: ItemInfo[] = [];
  // Synergy blocks (Oil Masterpiece) are keyed by the synergy name in the data, so a pair grants them once (lane H).
  for (const t of h.traits || []) { const i = itemInfo('trait:' + t); if (i) out.push(i); }
  for (const p of h.perks || []) { const i = itemInfo('perk:' + p.id, p.tier as Tier); if (i) out.push(i); }
  for (const m of classMoveKeys(h)) { const i = itemInfo(m.key, m.rank as Tier); if (i) out.push(i); }
  for (const k of h.skills || []) { const i = itemInfo('skill:' + k); if (i) out.push(i); }
  for (const k of h.relics || []) { const i = itemInfo('relic:' + k); if (i) out.push(i); }
  if (itemsCache.size > 400) itemsCache.clear();
  itemsCache.set(k, out);
  return out;
}
const itemsCache = new Map<string, ItemInfo[]>();
/** A cache key for what a unit holds: everything itemsOf() reads (each perk's id and tier, the traits, the class, its
 * rank, the advanced class, the skill items), in order. Built by hand: it is asked for every unit on every hook. */
export const heldKey = (h: Held) => {
  let s = (rev2 ? '1|' : '0|') + (h.cls || '') + '|' + (h.rank || 0) + '|' + (advancedActive(h.adv) ? h.adv : '') + '|';
  for (const p of h.perks || []) s += p.id + '\t' + p.tier + '\n'; s += '|';
  for (const t of h.traits || []) s += t + '\n'; s += '|';
  for (const k of h.skills || []) s += k + '\n';
  if (h.relics?.length) { s += '|'; for (const k of h.relics) s += k + '\n'; }
  return s;
};

/** Every effect of every item, flat (plan 2.2: effectsOf). */
export function effectsOfHeld(h: Held): ActiveEffect[] {
  return itemsOf(h).flatMap((i) => i.effects.map((e, index) => ({ key: i.key, kind: i.kind, itemId: i.id, tier: i.tier, op: e?.op, e, index })));
}

/** Every item in the data, for the coverage report: each perk at each tier, each trait, each class move. */
export function allItems(): ItemInfo[] {
  const out: ItemInfo[] = [];
  for (const p of PERKS as any[]) {
    if (p.tier === 'acquired' && p.tiers) { out.push(itemInfo('perk:' + p.id, 'I')!); if (p.tiers.II) out.push(itemInfo('perk:' + p.id, 'II')!); }
    else out.push(itemInfo('perk:' + p.id, p.tier)!);
  }
  for (const t of TRAITS) out.push(itemInfo('trait:' + t.id)!);
  // Every class move once: the 9 classes' moves (new ones under their class, reused ones under their old key), then the
  // rest of the pool and the advanced moves (shelved: their handlers and tests stay, so coverage still counts them).
  const seen = new Set<string>();
  for (const b of CLASSES as any[]) for (const m of b.gain || []) if (!seen.has(m.key)) { seen.add(m.key); out.push(itemInfo(m.key)!); }
  for (const b of CLASSES as any[]) for (const r of RANKS) for (const m of b.ranks?.[r]?.moves || []) if (!seen.has(m.key)) { seen.add(m.key); out.push(itemInfo(m.key)!); }
  for (const k of Object.keys(CLASS_MOVE_POOL)) if (!seen.has('class:' + k)) { seen.add('class:' + k); out.push(itemInfo('class:' + k)!); }
  for (const k of SKILL_ITEMS) out.push(itemInfo('skill:' + k)!);
  // items added at run time (a mode's relics, a test's fixtures)
  for (const id of Object.keys(EXTRA.perk)) { const p = EXTRA.perk[id]; for (const t of p.tiers ? Object.keys(p.tiers) : [p.tier === 'acquired' ? 'I' : p.tier || 'I']) out.push(itemInfo('perk:' + id, t)!); }
  for (const id of Object.keys(EXTRA.trait)) out.push(itemInfo('trait:' + id)!);
  for (const id of Object.keys(EXTRA.relic)) out.push(itemInfo('relic:' + id)!);
  return out.filter(Boolean);
}
