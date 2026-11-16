// GIVES BETWEEN CHARACTERS (rules 1.46; docs/design/survival-spec.md rule 47, section 4.2 primitive 13).
//
// One door, `gear/give`, for every hand-over between two characters of the room: a pack entry (a weapon or focus with
// its grade, durability, mods and named property; armour; a mod not fitted; ammunition and cores; items; a plot item)
// or credits. A plain give: the receiver is not asked; the log says who gave what to whom. `giveProblem` is the one
// predicate (the spec's `canGive`): the mode says where (a Survival run: the node kinds of `survival.json give.where`
// and the start; a campaign: out of a fight), and the refusals are in words: in a fight; a boon, a token or the graft
// (`c.relics`); a training; the fitted armour class; a Relic whose property would take the receiver past the run's cap.
// The entry arrives as it was: an instance is never merged into another (packAdd merges only what a pickup merges:
// loose rounds by calibre and type, magazines by gun, plain stacks).
import './datatext';
import svJ from '../../../data/survival.json';
import { WEAPON, ITEM } from './data';
import { type Character, type PackItem, type HoldSpec, packOf, packKindOf, holds, servesIndex } from './character';
import { packAdd, itemLabel, COUNTED, intoCounts } from './containers';
import { creditsOf, payCredits, earnCredits } from './credits';
import { relicRow, worthOf, runWorth, BOON_CAP } from './run/power';
import type { GameState } from './game';
import { uses, scopeOf, SCOPES } from './effects/uses';

/** Where a run's gives are made (`survival.json give`): the node kinds with no fight, and before the first node. */
export const GIVE: { where: string[]; at_start: boolean } = (svJ as any).give;
/** A give (rules 1.46): from `charId` to `to`, one of: `idx` (a pack entry, `qty` of a stack or of its magazines),
 * `credits` (an amount), or a thing that is never given, named so the refusal is in words (`relic`, `train`, `armour`). */
export interface GiveAction { type: 'gear/give'; charId: string; to: string; idx?: number; qty?: number; credits?: number; relic?: string; train?: string; armour?: boolean;
  /** Rules 1.55 item 31: a counted item (containers COUNTED: a stim, an Essence), `qty` of it. */ count?: string }

/** Why no give can be made in this room now (the mode's where), in words, or null. `credits`: a give of credits, which
 * keeps rules 1.46's where (the node kinds of `give.where`, the start); an item is given anywhere in a run that no fight
 * is on (rules 1.55 item 30). */
export function giveWhereProblem(g: GameState, credits = true): string | null {
  if (g.phase === 'combat' && g.combat && !g.combat.over && !g.combat.field) return 'Hand things over after the fight.'; // rules 1.55 item 61: the field is no fight to hand things over in
  const r = g.run;
  if (r && r.state !== 'over') {
    if (r.state === 'fight') return 'Hand things over after the fight.';
    if (!credits) return null;
    if (!r.at) return GIVE.at_start ? null : 'Hand things over at a stop with no fight.';
    const n = r.nodes.find((x) => x.id === r.at), k = n?.kind || '';
    if (!GIVE.where.includes(k)) return 'Hand things over at a stop with no fight: a shop, a Forge, a drill yard, a shrine, a rest, a cache or a crossroads.';
  }
  return null;
}
const qtyOf = (it: PackItem, q?: number) => { const most = it.mags ? it.mags.length : it.qty; return Math.max(1, Math.min(most, Math.round(q ?? most))); };
/** The part of a pack entry a give of `qty` hands over (a stack's count, or that many of its magazines). */
function partOf(it: PackItem, k: number): PackItem {
  if (it.mags) return { ...it, mags: it.mags.slice(0, k), qty: k, ...(it.magTypes ? { magTypes: it.magTypes.slice(0, k) } : {}) };
  return { ...it, qty: k };
}
/** Why `by` can't make this give, in words, or null (rules 1.46; spec rule 47 and primitive 13). */
export function giveProblem(g: GameState, by: string, a: GiveAction): string | null {
  const c = g.characters[a.charId]; if (!c) return 'No such character.';
  if (c.owner !== by) return 'Only ' + c.name + '\'s player gives what ' + c.name + ' carries.';
  const others = Object.values(g.characters).filter((x) => x.id !== c.id);
  if (!others.length) return 'No one to hand anything to.';
  const where = giveWhereProblem(g, a.credits != null); if (where) return where;
  const to = g.characters[a.to]; if (!to || to.id === c.id) return 'Give it to whom?';
  if (to.dead) return to.name + ' is dead.';
  if (c.dead) return 'The dead give nothing.';
  if (a.relic != null) { const row = relicRow(a.relic); return (row ? row.name : 'A boon') + ' is ' + c.name + '\'s own: boons, tokens and grafts can\'t be handed over.'; }
  if (a.train != null) return 'What ' + c.name + ' has learned can\'t be handed over.';
  if (a.armour) return c.name + '\'s armour fitting is made for ' + c.name + ' alone.';
  if (a.credits != null) {
    const n = Math.round(Number(a.credits));
    if (!(n >= 1)) return 'Give 1 credit or more.';
    if (n > creditsOf(c)) return c.name + ' has ' + creditsOf(c) + ' credits.';
    return null;
  }
  if (a.count != null) { // rules 1.55 item 31: a counted item
    const f = COUNTED[a.count], have = f ? c[f] || 0 : 0; if (!f) return 'That isn\'t something ' + c.name + ' carries.';
    if (have < 1) return c.name + ' has no ' + nameOfId(a.count) + '.';
    if (a.qty != null && !(Math.round(a.qty) >= 1 && Math.round(a.qty) <= have)) return 'Give 1 to ' + have + ' of those.';
    return null;
  }
  const it = a.idx == null ? undefined : packOf(c)[a.idx]; if (!it) return 'Nothing there in ' + c.name + '\'s pack.';
  const most = it.mags ? it.mags.length : it.qty;
  if (a.qty != null && !(Math.round(a.qty) >= 1 && Math.round(a.qty) <= most)) return 'Give 1 to ' + most + ' of those.';
  if (it.prop && g.run) { const w = worthOf(it.prop), now = runWorth(to);
    if (now + w > BOON_CAP) return to.name + ' has ' + (BOON_CAP - now) + ' boon room left; the ' + itemLabel(it) + '\'s ' + (relicRow(it.prop)?.name || 'property') + ' needs ' + w + '.'; }
  return null;
}
/** Make a give (rules 1.46): the credits from one purse to the other, or the pack entry (its part) out of the giver's
 * pack and into the receiver's whole. Returns the log line, or the refusal in words (nothing changes). */
export function giveNow(g: GameState, by: string, a: GiveAction): { ok: string; to: Character; from: Character } | { no: string } {
  const no = giveProblem(g, by, a); if (no) return { no };
  const c = g.characters[a.charId], to = g.characters[a.to];
  if (a.credits != null) {
    const n = Math.round(Number(a.credits)), err = payCredits(c, n); if (err) return { no: err };
    earnCredits(to, n);
    return { ok: c.name + ' gives ' + to.name + ' ' + n + ' credits.', to, from: c };
  }
  if (a.count != null) { // rules 1.55 item 31: out of the giver's count, into the receiver's by intoCounts (the one door)
    const f = COUNTED[a.count], n = Math.max(1, Math.min(c[f] || 0, Math.round(a.qty ?? 1)));
    c[f] = (c[f] || 0) - n; intoCounts(to, { id: a.count, item: a.count, name: nameOfId(a.count), qty: n, kind: packKindOf(a.count) } as PackItem);
    return { ok: c.name + ' gives ' + to.name + ' ' + (n > 1 ? n + ' × ' : '') + nameOfId(a.count) + '.', to, from: c };
  }
  const pack = packOf(c).map((x) => ({ ...x })), it = pack[a.idx!], k = qtyOf(it, a.qty), part = partOf(it, k);
  if (it.mags) { const left = it.mags.slice(k); if (left.length) pack[a.idx!] = { ...it, mags: left, qty: left.length, ...(it.magTypes ? { magTypes: it.magTypes.slice(k) } : {}) }; else pack.splice(a.idx!, 1); }
  else if (it.qty > k) pack[a.idx!] = { ...it, qty: it.qty - k }; else pack.splice(a.idx!, 1);
  c.pack = pack;
  const tp = packOf(to).map((x) => ({ ...x }));
  if (part.kind === 'plot') { const ex = tp.find((x) => x.kind === 'plot' && x.id === part.id); if (ex) ex.qty += part.qty; else tp.push(part); }
  else packAdd(tp, part);
  to.pack = tp;
  const label = itemLabel(part) + (part.prop ? ' (' + (relicRow(part.prop)?.name || part.prop) + ')' : '') + ((part.mods || []).length ? ' with ' + part.mods!.length + ' mod' + (part.mods!.length === 1 ? '' : 's') : '');
  return { ok: c.name + ' gives ' + to.name + ' ' + (k > 1 && !part.calibre && !part.mags ? k + ' × ' + itemLabel(part) : label) + '.', to, from: c };
}

// ---------------------------------------------------------------------------------------- using a counted item
/** rules 1.55 item 58: use one of a counted item (containers COUNTED) on yourself or a party member, out of a fight.
 * The item's row says how (`use`: `label`, `via`: `stim` or `effects`) and what its user needs (`requires_to_use`). */
export interface UseAction { type: 'gear/use'; charId: string; item: string; targetId?: string }
/** An item row's `use` (items.json), or null when it has none. */
export const useOf = (id: string): { label: string; via: 'stim' | 'effects'; spend?: number } | null => ((ITEM[id] as any)?.use || null);
/** Rules 1.61 addendum item 4748: the item a pack line is used as: its own id when its row has a `use`, else the first
 * id of its `serves_as` that has one (the toolbox is used as a field kit); null when neither. */
export const usedAs = (id: string): string | null => (useOf(id) ? id : (((ITEM[id] as any)?.serves_as || []) as string[]).find((x) => useOf(x)) || null);
/** How many of `id` the character has to use: a counted item's count (containers COUNTED), else whether a pack line
 * stands for it (character.ts servesIndex: 1 or 0). */
const haveOf = (c: Character, id: string): number => { const f = COUNTED[id]; return f ? c[f] || 0 : servesIndex(c, id) >= 0 ? 1 : 0; };
/** Spend one use of `id`: one off a counted item's count, else `use.spend` (PROVISIONAL, 1) off the pack line that
 * stands for it (servesIndex), the line gone at 0. */
function spendOne(c: Character, id: string) {
  const f = COUNTED[id]; if (f) { c[f] = (c[f] || 0) - 1; return; }
  const i = servesIndex(c, id), pack = packOf(c).map((x) => ({ ...x })); if (i < 0) return;
  pack[i].qty -= Math.max(1, Math.round(Number(useOf(id)?.spend) || 1)); c.pack = pack.filter((x) => x.qty > 0 || x.mags);
}
/** One entry of `requires_to_use` (items.json; data/CONVENTIONS.md): a hold, a skill minimum, or any of several. */
interface UseNeed { holds?: HoldSpec; skill?: string; min?: number; any_of?: UseNeed[]; why?: string }
const needMet = (c: Character, r: UseNeed): boolean => (r.any_of ? r.any_of.some((x) => needMet(c, x)) : r.holds ? holds(c, r.holds) : !!r.skill && (c.skills[r.skill] || 0) >= Number(r.min || 0));
/** Why `c` can't use the item (its row's `requires_to_use`, each entry's own `why`), or null. */
export function needsProblem(c: Character, id: string): string | null {
  for (const r of ((ITEM[id] as any)?.requires_to_use || []) as UseNeed[]) if (!needMet(c, r)) return r.why || "You can't use that yet.";
  return null;
}
/** What an effect of a used item does (game.ts registers them: xp_grant through giveXp). `user` uses it, `on` receives. */
export type UseOp = (g: GameState, user: Character, on: Character, e: Record<string, any>, item: string) => void;
const USE_OPS: Record<string, UseOp> = {};
/** Why a use op can't run on `on` now, in words, or null (rules 1.61 addendum: the kit's `treat` needs a limb injury). */
export type UseWhy = (g: GameState, user: Character, on: Character, e: Record<string, any>) => string | null;
const USE_WHY: Record<string, UseWhy> = {};
/** game.ts's door for an op a used item runs (this file can't import game.ts), with its refusal if it has one. */
export const registerUseOp = (op: string, run: UseOp, why?: UseWhy) => { USE_OPS[op] = run; if (why) USE_WHY[op] = why; };
/** A used item's effect's limit as a counter on the receiver (effects/uses.ts: `limit` {per, n}), or null. */
const limitOf = (e: any): { per: ReturnType<typeof scopeOf>; n: number } | null => (e?.limit && typeof e.limit === 'object' ? { per: scopeOf(e.limit.per), n: Math.max(1, Math.round(Number(e.limit.n) || 1)) } : null);
const useKey = (id: string, k: number) => 'use:' + id + '#' + k;
/** Why this use of an item `via: effects` can't be made, in words, or null. A stim (`via: stim`) is judged by the stim's
 * own rule (game.ts). */
export function useProblem(g: GameState, by: string, a: UseAction): string | null {
  if ((g.phase === 'combat' && g.combat && !g.combat.over && !g.combat.field) || g.run?.state === 'fight') return 'Not in a fight: use it after the fight.'; // rules 1.55 item 45: the field is no fight
  const u = useOf(a.item); if (!u) return "That can't be used here.";
  const c = g.characters[a.charId]; if (!c || c.owner !== by) return 'Not your character.';
  if (c.dead) return 'The dead give nothing.';
  if (haveOf(c, a.item) < 1) return c.name + ' has no ' + nameOfId(a.item) + '.';
  const t = g.characters[String(a.targetId || '')]; if (!t) return 'Use it on whom?';
  if (t.dead) return t.name + ' is dead.';
  const need = needsProblem(c, a.item); if (need) return need;
  const fx: any[] = (ITEM[a.item] as any)?.effects || [];
  for (const [k, e] of fx.entries()) {
    if (!USE_OPS[e?.op]) return nameOfId(a.item) + ' needs the Narrator: ' + ((ITEM[a.item] as any)?.text || '');
    const w = USE_WHY[e.op]?.(g, c, t, e); if (w) return w;
    const l = limitOf(e); if (l && uses({ key: useKey(a.item, k), c: t, g }).left(l.per, l.n) < 1) return t.name + ' has had ' + (l.n === 1 ? 'one' : l.n) + ' this ' + (SCOPES[l.per]?.label || 'window') + '.';
  }
  return null;
}
/** Use it (rules 1.55 item 58): one out of the user's count, each effect's limit taken on the receiver, the line said
 * (`say`), then each effect run by its use op. Returns null, or the refusal in words (nothing changes). */
export function useNow(g: GameState, by: string, a: UseAction, say: (line: string, c: Character) => void): string | null {
  const no = useProblem(g, by, a); if (no) return no;
  const c = g.characters[a.charId], t = g.characters[a.targetId!], fx: any[] = (ITEM[a.item] as any)?.effects || [];
  spendOne(c, a.item);
  for (const [k, e] of fx.entries()) { const l = limitOf(e); if (l) uses({ key: useKey(a.item, k), c: t, g }).take(l.per, l.n); }
  say(c.name + ' uses ' + nameOfId(a.item) + (t === c ? '.' : ' on ' + t.name + '.'), t);
  for (const e of fx) USE_OPS[e.op](g, c, t, e, a.item);
  return null;
}

// ---------------------------------------------------------------------------------------------- the Give tab's view
/** One line of the Give tab (rules 1.46): the purse, a pack entry (`idx`), something in a hand or worn (`unequip`: put
 * it in the pack first), or a thing never given; for each possible receiver the engine's reason it can't go (null: it
 * can). The client only draws these and sends `action` with `to` (and an amount or a quantity). */
export interface GiveRowV { key: string; kind: 'credits' | 'pack' | 'count' | 'held' | 'never'; label: string; id: string; rarity: string; qty: number;
  idx?: number; unequip?: string; why: Record<string, string | null>; action: Omit<GiveAction, 'to'>;
  /** Rules 1.55 item 32: the line can be used on a friend or on yourself: `action` with `targetId` set to that
   * character's id; `why` per character of the party (yourself included), the engine's reason it can't now, or null. */
  use?: UseRowV }
/** A Give line's "Use on…" (rules 1.55 item 32). */
export interface UseRowV { label: string; action: Record<string, unknown>; why: Record<string, string | null> }
/** The reducer's door for using a counted item on a character out of a fight (game.ts registers it as it loads: this
 * file can't import game.ts): the action for it, or null when the item has no use on a friend. */
let USE_DOOR: ((g: GameState, me: string, from: string, item: string) => UseRowV | null) | null = null;
/** game.ts's door for a Give line's "Use on…" (rules 1.55 item 32). */
export const setUseDoor = (f: typeof USE_DOOR) => { USE_DOOR = f; };
/** The Give tab for one player's character: who can receive, and every line with its reasons (rules 1.46). */
export interface GiveViewV { from: { id: string; name: string; credits: number } | null; to: { id: string; name: string; owner: string; portrait: string }[]; rows: GiveRowV[]; none: string | null }
const RARE = (r?: string) => (r && r !== 'standard' ? r.charAt(0).toUpperCase() + r.slice(1) + ' ' : '');
const nameOfId = (id: string): string => (WEAPON[id] as any)?.name || (ITEM[id] as any)?.name || id;
/** The Give tab's view (rules 1.46) for player `me`'s character (or `charId`). */
export function giveView(g: GameState, me: string, charId?: string | null): GiveViewV {
  const c = (charId && g.characters[charId]) || Object.values(g.characters).find((x) => x.owner === me) || null;
  if (!c) return { from: null, to: [], rows: [], none: 'Bring a character to give.' };
  const to = Object.values(g.characters).filter((x) => x.id !== c.id).map((x) => ({ id: x.id, name: x.name, owner: x.owner, portrait: x.portrait || '' }));
  const none = to.length ? null : 'No one to hand anything to.';
  const whys = (a: Omit<GiveAction, 'to'>) => Object.fromEntries(to.map((t) => [t.id, giveProblem(g, me, { ...a, to: t.id } as GiveAction)]));
  const rows: GiveRowV[] = [];
  const cr = { type: 'gear/give' as const, charId: c.id, credits: 1 };
  rows.push({ key: 'credits', kind: 'credits', label: 'Credits', id: 'credits', rarity: 'standard', qty: creditsOf(c), why: whys(cr), action: cr });
  packOf(c).forEach((it, idx) => { const a = { type: 'gear/give' as const, charId: c.id, idx };
    // rules 1.61 addendum item 4748: a pack line with a use (the field kit; the toolbox used as one) has its "Use on..." too
    const as = !it.mags && !it.weapon ? usedAs(it.item || it.id) : null, use = as && USE_DOOR ? USE_DOOR(g, me, c.id, as) : null;
    rows.push({ key: 'pack:' + idx, kind: 'pack', label: itemLabel(it) + (it.prop ? ' · ' + (relicRow(it.prop)?.name || it.prop) : ''), id: it.weapon || it.item || it.id, rarity: it.rarity || 'standard', qty: it.mags ? it.mags.length : it.qty, idx, why: whys(a), action: a, ...(use ? { use } : {}) }); });
  // rules 1.55 item 31: the counted items (a stim, an Essence) as lines of their own, with their use on a friend (item 32)
  for (const [id, f] of Object.entries(COUNTED)) { const n = c[f] || 0; if (n < 1) continue; const a = { type: 'gear/give' as const, charId: c.id, count: id }, use = USE_DOOR ? USE_DOOR(g, me, c.id, id) : null;
    rows.push({ key: 'count:' + id, kind: 'count', label: nameOfId(id), id, rarity: 'standard', qty: n, why: whys(a), action: a, ...(use ? { use } : {}) }); }
  const held: [string, string | undefined, string | undefined][] = [['main', c.weapon && c.weapon !== 'fists' ? c.weapon : undefined, c.weaponState?.rarity], ['off', c.offHand?.id, c.offHand?.rarity],
    ...Object.entries(c.worn || {}).map(([slot, id]) => [slot, id, 'standard'] as [string, string, string])];
  for (const [slot, id, rarity] of held) if (id) rows.push({ key: 'held:' + slot, kind: 'held', label: RARE(rarity) + nameOfId(id), id, rarity: rarity || 'standard', qty: 1, unequip: slot,
    why: Object.fromEntries(to.map((t) => [t.id, giveWhereProblem(g, false) || none])), action: { type: 'gear/give', charId: c.id } });
  for (const id of c.relics || []) { const a = { type: 'gear/give' as const, charId: c.id, relic: id }; rows.push({ key: 'relic:' + id, kind: 'never', label: relicRow(id)?.name || id, id, rarity: 'relic', qty: 1, why: whys(a), action: a }); }
  const tr = { type: 'gear/give' as const, charId: c.id, train: 'drill' };
  rows.push({ key: 'train', kind: 'never', label: 'What you have learned (drill, study, practice, Devotion)', id: 'train', rarity: 'standard', qty: 1, why: whys(tr), action: tr });
  if (c.armourClass) { const a = { type: 'gear/give' as const, charId: c.id, armour: true }; rows.push({ key: 'armour', kind: 'never', label: 'Your armour fitting (class ' + c.armourClass + ')', id: 'armour', rarity: 'standard', qty: 1, why: whys(a), action: a }); }
  return { from: { id: c.id, name: c.name, credits: creditsOf(c) }, to, rows, none };
}
